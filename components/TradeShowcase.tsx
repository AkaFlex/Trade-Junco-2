import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, TradeShowcaseItem } from '../types';
import { getShowcaseItems, createShowcaseItem, uploadShowcaseImage, deleteShowcaseItem, describeFirestoreError } from '../services/showcaseService';
import { validateFile, acceptAttr } from '../services/uploadService';
import { useToast } from './shared/Toast';
import { useConfirm } from './shared/ConfirmModal';
import { PlusCircle, Trash2, X, Image as ImageIcon, MapPin, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface Props {
  user: UserProfile | null;
}

// Vitrine em grade navegável (sem autoplay: o padrão da empresa não adota animação em loop).
const PAGE_SIZE = 6;

export const TradeShowcase: React.FC<Props> = ({ user }) => {
  const toast = useToast();
  const confirm = useConfirm();
  const isAdmin = user?.role === 'admin';
  const [items, setItems] = useState<TradeShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [partner, setPartner] = useState('');
  const [city, setCity] = useState('');
  const [uploading, setUploading] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);

  const fetchItems = async () => {
    try {
      setItems(await getShowcaseItems());
      setLoadError('');
    } catch (error) {
      setLoadError(describeFirestoreError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !uploading) setIsModalOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isModalOpen, uploading]);

  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const visible = items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.warning('Selecione uma imagem.');
    const invalid = validateFile(file, ['image']);
    if (invalid) return toast.warning('Arquivo não aceito', invalid);
    if (!isAdmin) return toast.error('Apenas gestores podem cadastrar na vitrine.');
    setUploading(true);
    try {
      const imageUrl = await uploadShowcaseImage(file);
      await createShowcaseItem({ imageUrl, partner, city, createdAt: Date.now() });
      setIsModalOpen(false);
      setFile(null); setPartner(''); setCity('');
      setPage(0);
      fetchItems();
      toast.success('Foto adicionada à vitrine!');
    } catch (err) {
      toast.error('Erro ao salvar a foto', describeFirestoreError(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item: TradeShowcaseItem) => {
    const ok = await confirm({ title: 'Excluir da vitrine?', message: `A foto de "${item.partner}" deixa de aparecer para todos.`, confirmLabel: 'Excluir foto', danger: true });
    if (!ok) return;
    try {
      await deleteShowcaseItem(item.id);
      toast.success('Foto removida da vitrine.');
      fetchItems();
    } catch (err) {
      toast.error('Não foi possível excluir', describeFirestoreError(err));
    }
  };

  return (
    <section className="page" aria-labelledby="vitrine-title">
      <div className="flex items-end justify-between gap-3 pt-6 border-t border-line mb-4">
        <div>
          <h2 id="vitrine-title" className="section-title">
            Vitrine de ações {items.length > 0 && <span className="badge ml-1 align-middle">{items.length}</span>}
          </h2>
          <p className="hint">Inspirações e execuções de destaque.</p>
        </div>
        {isAdmin && (
          <button onClick={() => setIsModalOpen(true)} className="btn"><PlusCircle size={15} /> Cadastrar foto</button>
        )}
      </div>

      {loading ? (
        <div className="loading flex justify-center" aria-busy="true"><Loader2 className="animate-spin text-navy" size={24} aria-label="Carregando vitrine" /></div>
      ) : items.length === 0 ? (
        <div className="card empty">
          <ImageIcon className="mx-auto mb-2 text-muted" size={24} />
          {loadError
            ? <>Não foi possível carregar a vitrine.{isAdmin && <span className="block mt-1 text-[12.5px]">{loadError}</span>}</>
            : isAdmin ? 'Nenhuma foto ainda. Use "Cadastrar foto" para adicionar.' : 'As novidades aparecerão aqui em breve.'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map(item => (
              <figure key={item.id} className="card overflow-hidden m-0">
                <a href={item.imageUrl} target="_blank" rel="noreferrer" className="block bg-paper">
                  <img src={item.imageUrl} alt={`Ação em ${item.partner}`} loading="lazy" className="w-full aspect-[4/3] object-cover" />
                </a>
                <figcaption className="px-4 py-3 flex items-start justify-between gap-3 border-t border-line">
                  <span className="min-w-0">
                    <span className="block font-semibold text-navy truncate">{item.partner}</span>
                    <span className="flex items-center gap-1 text-[12.5px] text-muted"><MapPin size={12} /> {item.city}</span>
                  </span>
                  {isAdmin && (
                    <button onClick={() => handleDelete(item)} className="iconbtn-danger" aria-label={`Excluir foto de ${item.partner}`}><Trash2 size={14} /></button>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button className="iconbtn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} aria-label="Página anterior"><ChevronLeft size={16} /></button>
              <span className="text-[13px] text-muted">{page + 1} de {pages}</span>
              <button className="iconbtn" onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} aria-label="Próxima página"><ChevronRight size={16} /></button>
            </div>
          )}
        </>
      )}

      {isModalOpen && (
        <div className="overlay" onClick={() => !uploading && setIsModalOpen(false)}>
          <form role="dialog" aria-modal="true" aria-labelledby="vitrine-modal-title" className="modal max-w-md" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
            <div className="modal-head">
              <h2 id="vitrine-modal-title">Adicionar à vitrine</h2>
              <button type="button" disabled={uploading} onClick={() => setIsModalOpen(false)} className="text-muted" aria-label="Fechar"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div>
                <label htmlFor="vitrine-file" className="label">Foto</label>
                <input ref={firstField} id="vitrine-file" type="file" accept={acceptAttr(['image'])} onChange={e => setFile(e.target.files?.[0] || null)} className="input file:mr-3 file:btn file:py-1.5" />
              </div>
              <div>
                <label htmlFor="vitrine-partner" className="label">Parceiro (rede/distribuidor)</label>
                <input id="vitrine-partner" required className="input" value={partner} onChange={e => setPartner(e.target.value)} placeholder="Ex: Atacadão S/A" />
              </div>
              <div>
                <label htmlFor="vitrine-city" className="label">Cidade - UF</label>
                <input id="vitrine-city" required className="input" value={city} onChange={e => setCity(e.target.value)} placeholder="Ex: Goiânia - GO" />
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn" disabled={uploading} onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={uploading || !file}>
                {uploading ? <><Loader2 size={14} className="animate-spin" /> Enviando...</> : 'Cadastrar foto'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
