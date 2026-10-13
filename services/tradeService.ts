
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  writeBatch,
  serverTimestamp
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { TradeRequest, RegionalBudget, Region, REGIONS, PaymentInfo } from "../types";
import { normalizeTradeCode } from "./tradeCode";
import { todayLocal, parseLocalDate, addDays } from "../utils/date";
import { REIMBURSEMENT_GRACE_DAYS, FIRESTORE_BATCH_LIMIT } from "../config";

// ---------------------------------------------------------------------------
// REQUESTS
// ---------------------------------------------------------------------------
// Acesso público a uma solicitação é só por código: codes/{tradeCode} -> requestId,
// depois get em requests/{id}. Listar a coleção é exclusivo do gestor (firestore.rules).

export const createRequest = async (request: Omit<TradeRequest, 'id'>) => {
  const ref = doc(collection(db, "requests"));
  await setDoc(ref, { ...request, createdAtServer: serverTimestamp() });
  if (request.tradeCode) {
    try {
      await setDoc(doc(db, "codes", request.tradeCode), { requestId: ref.id });
    } catch (e) {
      // A solicitação já foi gravada; o índice pode ser recriado pelo gestor em "Migrar segurança".
      console.error("Falha ao indexar código da solicitação", e);
    }
  }
  return ref;
};

export const getRequestById = async (id: string): Promise<TradeRequest | null> => {
  const snap = await getDoc(doc(db, "requests", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as TradeRequest) : null;
};

export const getRequestByTradeCode = async (tradeCode: string): Promise<TradeRequest | null> => {
  if (!tradeCode) return null;
  const code = normalizeTradeCode(tradeCode);

  const codeSnap = await getDoc(doc(db, "codes", code)).catch(() => null);
  if (codeSnap?.exists()) {
    return getRequestById(codeSnap.data().requestId);
  }

  // Compatibilidade com pedidos ainda não indexados (só funciona para o gestor após as novas regras).
  try {
    const snapshot = await getDocs(query(collection(db, "requests"), where("tradeCode", "==", code)));
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as TradeRequest;
  } catch {
    return null;
  }
};

export const getAllRequests = async () => {
  const snapshot = await getDocs(collection(db, "requests"));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TradeRequest));
};

const auditFields = () => ({
  updatedBy: auth.currentUser?.email || 'desconhecido',
  updatedAt: serverTimestamp(),
});

export const adminUpdateRequest = async (id: string, data: Record<string, unknown>) => {
  if (!id) throw new Error("ID inválido para atualização");
  await updateDoc(doc(db, "requests", id), { ...data, ...auditFields() });
};

export const updateRequestStatus = async (id: string, status: string, reason?: string) => {
  await adminUpdateRequest(id, { status, rejectionReason: reason ?? null });
};

// ---------------------------------------------------------------------------
// PAYMENT (PIX/CPF) — subdocumento legível só pelo gestor
// ---------------------------------------------------------------------------

const paymentRef = (requestId: string) => doc(db, "requests", requestId, "private", "payment");

export const savePaymentInfo = async (requestId: string, info: PaymentInfo) => {
  await setDoc(paymentRef(requestId), { ...info, savedAt: serverTimestamp() });
};

export const getPaymentInfo = async (req: TradeRequest): Promise<PaymentInfo | null> => {
  try {
    const snap = await getDoc(paymentRef(req.id));
    if (snap.exists()) {
      const d = snap.data();
      return { pixKey: d.pixKey, pixHolder: d.pixHolder, pixCpf: d.pixCpf };
    }
  } catch (e) {
    console.error("Erro ao ler dados de pagamento", e);
  }
  if (req.pixKey || req.pixHolder || req.pixCpf) {
    return { pixKey: req.pixKey || '', pixHolder: req.pixHolder || '', pixCpf: req.pixCpf || '' };
  }
  return null;
};

// ---------------------------------------------------------------------------
// BUDGETS
// ---------------------------------------------------------------------------

export const saveBudget = async (region: Region, month: string, limit: number) => {
  const safeRegion = region.trim();
  const safeMonth = month.trim();
  const id = `${safeRegion}_${safeMonth}`;
  await setDoc(doc(db, "budgets", id), {
    region: safeRegion,
    month: safeMonth,
    limit: Number(limit)
  });
};

export const getAllBudgets = async () => {
  const snapshot = await getDocs(collection(db, "budgets"));
  return snapshot.docs.map(d => d.data() as RegionalBudget);
};

/**
 * OPTIMIZED: Fetches budgets for ALL regions of a given month in parallel
 * instead of sequential round-trips (1 per region → N parallel).
 */
export const getBudgetsForMonth = async (month: string): Promise<Record<string, number>> => {
  const safeMonth = month.trim();

  const results = await Promise.all(
    REGIONS.map(async (region) => {
      const safeRegion = region.trim();
      try {
        const snap = await getDoc(doc(db, "budgets", `${safeRegion}_${safeMonth}`));
        return { region, limit: snap.exists() ? Number(snap.data().limit) : 0 };
      } catch {
        return { region, limit: 0 };
      }
    })
  );

  return Object.fromEntries(results.map(r => [r.region, r.limit]));
};

// ---------------------------------------------------------------------------
// AUTO-EXPIRE
// ---------------------------------------------------------------------------

/** Último dia para o RCA enviar o reembolso: fim da ação + tolerância. */
export const reimbursementDeadline = (req: Pick<TradeRequest, 'dateOfAction' | 'days'>): Date =>
  addDays(parseLocalDate(req.dateOfAction), Math.max(1, Number(req.days) || 1) - 1 + REIMBURSEMENT_GRACE_DAYS);

/**
 * Degustações aprovadas cujo prazo de reembolso já passou viram 'expired'.
 * O prazo conta a partir do fim da ação (não da virada do mês), em data local.
 */
export const checkAndExpireRequests = async () => {
  try {
    const snapshot = await getDocs(query(collection(db, "requests"), where("status", "==", "approved")));
    const today = parseLocalDate(todayLocal());

    const expired = snapshot.docs.filter(d => {
      const data = d.data() as TradeRequest;
      return data.dateOfAction && reimbursementDeadline(data) < today;
    });

    for (let i = 0; i < expired.length; i += FIRESTORE_BATCH_LIMIT) {
      const batch = writeBatch(db);
      expired.slice(i, i + FIRESTORE_BATCH_LIMIT).forEach(d => {
        const deadline = reimbursementDeadline(d.data() as TradeRequest).toLocaleDateString('pt-BR');
        batch.update(doc(db, "requests", d.id), {
          status: 'expired',
          rejectionReason: `Vencimento automático: reembolso não enviado até ${deadline}.`,
          updatedBy: `sistema (aberto por ${auth.currentUser?.email || 'desconhecido'})`,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
    return expired.length;
  } catch (e) {
    console.error("[AUTO-EXPIRE] Erro:", e);
    return 0;
  }
};

/** Desfaz um vencimento: volta para 'approved'. */
export const reopenRequest = async (id: string) => {
  await adminUpdateRequest(id, { status: 'approved', rejectionReason: null });
};

// ---------------------------------------------------------------------------
// BUDGET AVAILABILITY CHECK
// ---------------------------------------------------------------------------

// Tudo que já consumiu verba: em execução, aguardando pagamento e pago.
const BUDGET_STATUSES = ['approved', 'completed', 'paid'];

export const checkBudgetAvailability = async (
  region: Region,
  month: string,
  requestValue: number
): Promise<{ allowed: boolean; message: string }> => {
  const safeValue = Number(requestValue) || 0;
  if (safeValue <= 0) return { allowed: true, message: "Sem valor a descontar do orçamento." };

  try {
    if (!month)  return { allowed: true, message: "Data indefinida, aprovação livre." };
    if (!region) return { allowed: true, message: "Região indefinida, aprovação livre." };

    const safeRegion = region.trim();
    const safeMonth  = month.trim();

    const [budgetSnap, usedSnap] = await Promise.all([
      getDoc(doc(db, "budgets", `${safeRegion}_${safeMonth}`)),
      getDocs(query(
        collection(db, "requests"),
        where("region", "==", safeRegion),
        where("status", "in", BUDGET_STATUSES)
      ))
    ]);

    if (!budgetSnap.exists()) {
      return { allowed: true, message: `Sem orçamento configurado para ${safeRegion} em ${safeMonth}.` };
    }

    const limit = Number(budgetSnap.data().limit) || 0;
    const used = usedSnap.docs.reduce((sum, d) => {
      const data = d.data() as TradeRequest;
      return data.dateOfAction?.startsWith(safeMonth) ? sum + (Number(data.totalValue) || 0) : sum;
    }, 0);

    if (safeValue <= limit - used) {
      return { allowed: true, message: "Orçamento disponível." };
    }

    return {
      allowed: false,
      message: `Teto: R$ ${limit.toLocaleString('pt-BR')} · Já usado: R$ ${used.toLocaleString('pt-BR')} · Este pedido: R$ ${safeValue.toLocaleString('pt-BR')}`
    };
  } catch (error: any) {
    console.error("Erro no cálculo de orçamento:", error);
    return { allowed: false, message: `Erro técnico no cálculo: ${error.message}` };
  }
};
