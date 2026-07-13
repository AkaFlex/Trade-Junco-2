import { collection, addDoc, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { SellOutProduct } from '../types';

export const getProducts = async (): Promise<SellOutProduct[]> => {
  const q = query(collection(db, 'products'), orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SellOutProduct));
};

export const addProduct = async (name: string, order: number) => {
  return await addDoc(collection(db, 'products'), {
    name: name.trim(),
    order,
    active: true,
    createdAt: Date.now(),
  });
};

export const updateProduct = async (id: string, data: Partial<Pick<SellOutProduct, 'name' | 'order' | 'active'>>) => {
  await updateDoc(doc(db, 'products', id), data);
};

export const deleteProduct = async (id: string) => {
  await deleteDoc(doc(db, 'products', id));
};
