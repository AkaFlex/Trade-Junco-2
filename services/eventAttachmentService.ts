// Uploads an event/ação-social attachment (PDF or any file type) via Cloudinary's
// unsigned upload API (same "no backend needed" pattern as the ImgBB uploads used
// elsewhere in this app, but Cloudinary also supports non-image files like PDFs).
//
// ============================================================
// COLE SUAS CHAVES DO CLOUDINARY AQUI
// ============================================================
// 1. Crie uma conta gratuita em https://cloudinary.com
// 2. Copie o "Cloud Name" do dashboard.
// 3. Vá em Settings > Upload > Add upload preset, defina "Signing Mode: Unsigned"
//    e copie o nome do preset.
// 4. Vá em Settings > Security e habilite "Allow delivery of PDF and ZIP files".
const CLOUDINARY_CLOUD_NAME = 'COLE_SEU_CLOUD_NAME_AQUI';
const CLOUDINARY_UPLOAD_PRESET = 'COLE_SEU_UPLOAD_PRESET_AQUI';

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
