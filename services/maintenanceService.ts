import { collection, getDocs, doc, getDoc, writeBatch, deleteField, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

const BACKUP_COLLECTIONS = ['requests', 'budgets', 'products', 'showcase', 'codes'];

// Firestore limita 500 operações por lote; deixamos folga.
const BATCH_LIMIT = 450;

export const downloadBackup = async () => {
  const backup: Record<string, unknown[]> = {};
  for (const name of BACKUP_COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, name));
      backup[name] = await Promise.all(snap.docs.map(async d => {
        const entry: Record<string, unknown> = { _id: d.id, ...d.data() };
        if (name === 'requests') {
          const pay = await getDoc(doc(db, 'requests', d.id, 'private', 'payment')).catch(() => null);
          if (pay?.exists()) entry._payment = pay.data();
        }
        return entry;
      }));
    } catch (e) {
      backup[name] = [{ _error: String(e) }];
    }
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-portal-trade-${new Date().toLocaleDateString('sv-SE')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Prepara os dados para as regras novas:
 * - cria codes/{tradeCode} para cada solicitação que ainda não tem;
 * - move PIX/CPF do documento principal para requests/{id}/private/payment.
 * Idempotente: pode ser rodada mais de uma vez.
 */
export const runSecurityMigration = async () => {
  const [requestsSnap, codesSnap] = await Promise.all([
    getDocs(collection(db, 'requests')),
    getDocs(collection(db, 'codes')),
  ]);
  const existingCodes = new Set(codesSnap.docs.map(d => d.id));

  type Op = (b: ReturnType<typeof writeBatch>) => void;
  const ops: Op[] = [];
  let indexed = 0;
  let paymentsMoved = 0;

  requestsSnap.docs.forEach(d => {
    const data = d.data();
    const code = typeof data.tradeCode === 'string' ? data.tradeCode.trim().toUpperCase() : '';
    if (code && !existingCodes.has(code)) {
      existingCodes.add(code);
      indexed++;
      ops.push(b => b.set(doc(db, 'codes', code), { requestId: d.id }));
    }
    if (data.pixKey || data.pixHolder || data.pixCpf) {
      paymentsMoved++;
      ops.push(b => b.set(doc(db, 'requests', d.id, 'private', 'payment'), {
        pixKey: data.pixKey || '',
        pixHolder: data.pixHolder || '',
        pixCpf: data.pixCpf || '',
        savedAt: serverTimestamp(),
      }));
      ops.push(b => b.update(doc(db, 'requests', d.id), {
        pixKey: deleteField(),
        pixHolder: deleteField(),
        pixCpf: deleteField(),
      }));
    }
  });

  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    ops.slice(i, i + BATCH_LIMIT).forEach(op => op(batch));
    await batch.commit();
  }

  return { indexed, paymentsMoved, total: requestsSnap.size };
};
