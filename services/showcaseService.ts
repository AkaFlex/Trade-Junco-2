import { collection, addDoc, query, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebaseConfig';
import { TradeShowcaseItem } from '../types';

export const uploadShowcaseImage = async (file: File): Promise<string> => {
  const fileRef = ref(storage, `showcase/${Date.now()}_${file.name}`);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  return url;
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
  // delete document from firestore
  await deleteDoc(doc(db, 'showcase', id));
  
  // optionally, delete from storage
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (err) {
    console.error('Failed to delete image from storage', err);
  }
};
