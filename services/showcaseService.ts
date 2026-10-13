import { collection, addDoc, query, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { TradeShowcaseItem } from '../types';
import { uploadFile } from './uploadService';

export const uploadShowcaseImage = (file: File): Promise<string> => uploadFile(file, 'vitrine');

export const createShowcaseItem = async (data: Omit<TradeShowcaseItem, 'id'>) => {
  return await addDoc(collection(db, 'showcase'), data);
};

export const getShowcaseItems = async (): Promise<TradeShowcaseItem[]> => {
  const q = query(collection(db, 'showcase'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TradeShowcaseItem));
};

// Remove o item da vitrine. A imagem continua no Cloudinary (apagar exige credencial de servidor).
export const deleteShowcaseItem = async (id: string) => {
  await deleteDoc(doc(db, 'showcase', id));
};

export const describeFirestoreError = (e: unknown): string => {
  const code = (e as { code?: string })?.code || '';
  if (code === 'permission-denied') return 'Sem permissão (regras do Firestore ou conta sem acesso de gestor).';
  if (code === 'unavailable' || code === 'deadline-exceeded') return 'Sem conexão com o servidor. Tente novamente.';
  return (e as Error)?.message || 'Erro desconhecido.';
};
