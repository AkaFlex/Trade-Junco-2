
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  setDoc,
  getDoc,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { TradeRequest, RegionalBudget, Region, REGIONS } from "../types";

// ---------------------------------------------------------------------------
// REQUESTS
// ---------------------------------------------------------------------------

export const createRequest = async (request: Omit<TradeRequest, 'id'>) => {
  return await addDoc(collection(db, "requests"), request);
};

export const getRequestsByUser = async (rcaEmail: string) => {
  if (!rcaEmail) return [];
  const emailLower = rcaEmail.toLowerCase().trim();
  const q = query(collection(db, "requests"), where("rcaEmail", "==", emailLower));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TradeRequest));
};

export const getRequestsByPartner = async (partnerCode: string) => {
  if (!partnerCode) return [];
  const q = query(
    collection(db, "requests"), 
    where("partnerCode", "==", partnerCode),
    where("status", "==", "approved")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TradeRequest));
};

export const getRequestByTradeCode = async (tradeCode: string): Promise<TradeRequest | null> => {
  if (!tradeCode) return null;
  const q = query(
    collection(db, "requests"),
    where("tradeCode", "==", tradeCode.trim().toUpperCase())
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as TradeRequest;
};

export const getAllRequests = async () => {
  const snapshot = await getDocs(collection(db, "requests"));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TradeRequest));
};

export const updateRequestStatus = async (id: string, status: string, reason?: string) => {
  if (!id) throw new Error("ID inválido para atualização");
  const ref = doc(db, "requests", id);
  await updateDoc(ref, { status, rejectionReason: reason ?? null });
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
