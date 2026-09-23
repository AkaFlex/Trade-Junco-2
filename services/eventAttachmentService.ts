import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';

// Uploads an event/ação-social attachment (PDF or any file type) to Firebase Storage
// and returns its public download URL.
export const uploadEventAttachment = async (
  file: File,
  folder: 'evento' | 'acao_social'
): Promise<string> => {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `event-attachments/${folder}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};
