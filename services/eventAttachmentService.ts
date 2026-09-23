// Uploads an event/ação-social attachment (PDF or any file type) via Cloudinary's
// unsigned upload API (same "no backend needed" pattern as the ImgBB uploads used
// elsewhere in this app, but Cloudinary also supports non-image files like PDFs).
//
const CLOUDINARY_CLOUD_NAME = 'iblpzi6m';
const CLOUDINARY_UPLOAD_PRESET = 'qfxcgdhb';

export const uploadEventAttachment = async (
  file: File,
  folder: 'evento' | 'acao_social'
): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `event-attachments/${folder}`);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Falha ao enviar anexo para o Cloudinary.');
  }

  const data = await response.json();
  return data.secure_url as string;
};
