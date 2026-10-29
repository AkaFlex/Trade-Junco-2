// Firestore falso em memória, só para os testes automáticos (nunca entra no build de produção).
// Persiste em localStorage para sobreviver a recarregamentos da página dentro do mesmo teste.
const KEY = '__fake_fs__';
const load = (): Record<string, any> => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
let store: Record<string, any> = load();
const save = () => localStorage.setItem(KEY, JSON.stringify(store));
const refresh = () => { store = load(); };

const TS = { __ts: true };
const resolveValue = (cur: any, v: any): any => {
  if (v && v.__ts) return Date.now();
  if (v && v.__union) return [...(Array.isArray(cur) ? cur : []), ...v.__union.filter((x: any) => !(cur || []).some((c: any) => JSON.stringify(c) === JSON.stringify(x)))];
  return v;
};
const resolveAll = (cur: any, data: any) => {
  const out: any = {};
  Object.keys(data).forEach(k => { out[k] = resolveValue(cur?.[k], data[k]); });
  return out;
};

export const getFirestore = () => ({ __fake: true });
export const serverTimestamp = () => TS;
export const arrayUnion = (...items: any[]) => ({ __union: items });

export const collection = (_db: any, ...segs: string[]) => ({ kind: 'col', path: segs.join('/') });
export const doc = (base: any, ...segs: string[]) => {
  if (base.kind === 'col') {
    const id = segs[0] || 'auto' + Math.random().toString(36).slice(2, 12);
    return { kind: 'doc', path: `${base.path}/${id}`, id };
  }
  const path = segs.join('/');
  return { kind: 'doc', path, id: path.split('/').pop()! };
};

const snapOf = (path: string) => ({
  id: path.split('/').pop()!,
  exists: () => path in store,
  data: () => (path in store ? JSON.parse(JSON.stringify(store[path])) : undefined),
});

export const getDoc = async (ref: any) => { refresh(); return snapOf(ref.path); };
export const setDoc = async (ref: any, data: any) => { refresh(); store[ref.path] = resolveAll({}, data); save(); };
export const updateDoc = async (ref: any, data: any) => {
  refresh();
  if (!(ref.path in store)) throw new Error('Documento não existe: ' + ref.path);
  store[ref.path] = { ...store[ref.path], ...resolveAll(store[ref.path], data) }; save();
};
export const addDoc = async (col: any, data: any) => { const r = doc(col); await setDoc(r, data); return r; };
export const deleteDoc = async (ref: any) => { refresh(); delete store[ref.path]; save(); };

export const where = (field: string, op: string, value: any) => ({ t: 'where', field, op, value });
export const orderBy = (field: string, dir: string = 'asc') => ({ t: 'order', field, dir });
export const query = (col: any, ...cs: any[]) => ({ ...col, cs });

export const getDocs = async (q: any) => {
  refresh();
  const prefix = q.path + '/';
  let paths = Object.keys(store).filter(p => p.startsWith(prefix) && !p.slice(prefix.length).includes('/'));
  (q.cs || []).forEach((c: any) => {
    if (c.t !== 'where') return;
    paths = paths.filter(p => {
      const v = store[p][c.field];
      return c.op === '==' ? v === c.value : c.op === 'in' ? c.value.includes(v) : true;
    });
  });
  (q.cs || []).filter((c: any) => c.t === 'order').forEach((c: any) => {
    paths.sort((a, b) => (store[a][c.field] > store[b][c.field] ? 1 : -1) * (c.dir === 'desc' ? -1 : 1));
  });
  const docs = paths.map(snapOf);
  return { docs, empty: docs.length === 0, size: docs.length, forEach: (fn: any) => docs.forEach(fn) };
};

export const writeBatch = () => {
  const ops: (() => void)[] = [];
  return {
    update: (ref: any, data: any) => ops.push(() => { store[ref.path] = { ...store[ref.path], ...resolveAll(store[ref.path], data) }; }),
    set: (ref: any, data: any) => ops.push(() => { store[ref.path] = resolveAll({}, data); }),
    delete: (ref: any) => ops.push(() => { delete store[ref.path]; }),
    commit: async () => { refresh(); ops.forEach(o => o()); save(); },
  };
};
export const deleteField = () => ({ __del: true });
