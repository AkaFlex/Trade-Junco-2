// Upload único do app (fotos, notas fiscais, mídia kit, ofício, vitrine) via Cloudinary "unsigned".
// O preset é público por natureza: tipo e tamanho também devem ser restringidos no próprio
// preset no console do Cloudinary (AUDIT F-09).
import { UPLOAD_MAX_BYTES } from '../config';

const CLOUDINARY_CLOUD_NAME = 'iblpzi6m';
const CLOUDINARY_UPLOAD_PRESET = 'qfxcgdhb';

export type UploadFolder = 'evento' | 'acao_social' | 'reembolso-fotos' | 'reembolso-notas' | 'personalizacao' | 'vitrine';

export type FileKind = 'image' | 'pdf' | 'doc';

const MIME_BY_KIND: Record<FileKind, (type: string, name: string) => boolean> = {
  image: (t) => t.startsWith('image/'),
  pdf: (t, n) => t === 'application/pdf' || n.toLowerCase().endsWith('.pdf'),
  doc: (t, n) => /msword|officedocument\.wordprocessingml/.test(t) || /\.(docx?)$/i.test(n),
};

export const acceptAttr = (kinds: FileKind[]): string =>
  kinds.map(k => (k === 'image' ? 'image/*' : k === 'pdf' ? 'application/pdf,.pdf' : '.doc,.docx')).join(',');

/** Retorna a mensagem de erro, ou null se o arquivo é aceito. */
export const validateFile = (file: File, kinds: FileKind[]): string | null => {
  if (!kinds.some(k => MIME_BY_KIND[k](file.type, file.name))) {
    const nomes = kinds.map(k => (k === 'image' ? 'imagem' : k === 'pdf' ? 'PDF' : 'Word')).join(', ');
    return `"${file.name}" não é um tipo aceito (${nomes}).`;
  }
  if (file.size > UPLOAD_MAX_BYTES) {
    return `"${file.name}" passa de ${Math.round(UPLOAD_MAX_BYTES / 1024 / 1024)} MB.`;
  }
  return null;
};

export const uploadFile = async (file: File, folder: UploadFolder): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `portal-trade/${folder}`);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json())?.error?.message || ''; } catch { /* resposta sem JSON */ }
    throw new Error(detail || `Falha no envio (HTTP ${response.status}).`);
  }

  const data = await response.json();
  return data.secure_url as string;
};

export interface UploadBatchResult {
  urls: string[];
  failures: { name: string; reason: string }[];
}

/** Envia vários arquivos em paralelo; falhas não travam os demais. */
export const uploadFiles = async (
  files: File[],
  folder: UploadFolder,
  kinds: FileKind[],
  onProgress?: (done: number, total: number) => void,
): Promise<UploadBatchResult> => {
  const result: UploadBatchResult = { urls: [], failures: [] };
  const valid: File[] = [];
  files.forEach(f => {
    const err = validateFile(f, kinds);
    if (err) result.failures.push({ name: f.name, reason: err });
    else valid.push(f);
  });

  let done = 0;
  onProgress?.(0, valid.length);
  const settled = await Promise.allSettled(valid.map(async f => {
    try {
      return await uploadFile(f, folder);
    } finally {
      done++;
      onProgress?.(done, valid.length);
    }
  }));

  settled.forEach((s, i) => {
    if (s.status === 'fulfilled') result.urls.push(s.value);
    else result.failures.push({ name: valid[i].name, reason: s.reason?.message || 'Erro desconhecido.' });
  });
  return result;
};
