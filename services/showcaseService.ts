import { collection, addDoc, query, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { TradeShowcaseItem } from '../types';

// Envio para ImgBB gratuito usando a chave que você já possuía no projeto
export const uploadShowcaseImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('key', 'c761300e7b06cd74bcb411a077aa2abe'); // Chave ImgBB fixa do projeto

  const response = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Falha ao enviar arquivo para o ImgBB.');
  }

  const data = await response.json();
  return data.data.url; // Retorna URL pública
};

export const createShowcaseItem = async (data: Omit<TradeShowcaseItem, 'id'>) => {
  return await addDoc(collection(db, 'showcase'), data);
};

export const getShowcaseItems = async (): Promise<TradeShowcaseItem[]> => {
  const q = query(collection(db, 'showcase'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TradeShowcaseItem));
};

export const deleteShowcaseItem = async (id: string, imageUrl: string) => {
  // Apaga apenas do Firestore. 
  // No ImgBB via API simples, as imagens ficam hospedadas infinitamente sem bater cota,
  // ou seja, apagando do Firestore já some da vitrine perfeitamente!
  await deleteDoc(doc(db, 'showcase', id));
};
