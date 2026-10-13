
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

/**
 * Checks for 'approved' requests whose dateOfAction is in a previous month
 * and marks them as 'expired' via a Firestore batch write.
 */
export const checkAndExpireRequests = async () => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const q = query(collection(db, "requests"), where("status", "==", "approved"));
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    let count = 0;

    snapshot.docs.forEach((d) => {
      const data = d.data() as TradeRequest;
      if (data.dateOfAction && data.dateOfAction.slice(0, 7) < currentMonth) {
        batch.update(doc(db, "requests", d.id), {
          status: 'expired',
          rejectionReason: 'Vencimento Automático: Ação não realizada dentro do mês de competência.'
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`[AUTO-EXPIRE] ${count} solicitações vencidas atualizadas.`);
    }
  } catch (e) {
    console.error("[AUTO-EXPIRE] Erro:", e);
  }
};

// ---------------------------------------------------------------------------
// BUDGET AVAILABILITY CHECK
// ---------------------------------------------------------------------------

export const checkBudgetAvailability = async (
  region: Region,
  month: string,
  requestValue: number
): Promise<{ allowed: boolean; message: string }> => {
  try {
    if (!month)  return { allowed: true, message: "Data indefinida, aprovação livre." };
    if (!region) return { allowed: true, message: "Região indefinida, aprovação livre." };

    const safeRegion = region.trim();
    const safeMonth  = month.trim();
    const budgetId   = `${safeRegion}_${safeMonth}`;

    // Run budget fetch and approved-requests fetch in parallel
    const [budgetSnap, approvedSnap] = await Promise.all([
      getDoc(doc(db, "budgets", budgetId)),
      getDocs(query(
        collection(db, "requests"),
        where("region",  "==", safeRegion),
        where("status",  "==", "approved")
      ))
    ]);

    if (!budgetSnap.exists()) {
      return { allowed: true, message: `Sem orçamento configurado para ${safeRegion} em ${safeMonth}.` };
    }

    const limit = Number(budgetSnap.data().limit) || 0;

    let used = 0;
    approvedSnap.docs.forEach(d => {
      try {
        const data = d.data() as TradeRequest;
        if (data.dateOfAction?.startsWith(safeMonth)) {
          used += Number(data.totalValue) || 0;
        }
      } catch {
        // ignore corrupted records
      }
    });

    const safeValue = Number(requestValue) || 0;
    const remaining = limit - used;

    if (safeValue <= remaining) {
      return { allowed: true, message: "Orçamento disponível." };
    }

    return {
      allowed: false,
      message: `Estouro de Orçamento! Teto: R$${limit} | Usado: R$${used} | Solicitado: R$${safeValue}`
    };
  } catch (error: any) {
    console.error("Erro no cálculo de orçamento:", error);
    return { allowed: false, message: `Erro técnico no cálculo: ${error.message}` };
  }
};
