import React, { useState, useEffect } from 'react';
import { UserProfile, TradeShowcaseItem } from '../types';
import { getShowcaseItems, createShowcaseItem, uploadShowcaseImage, deleteShowcaseItem } from '../services/showcaseService';
import { PlusCircle, Trash2, X, Image as ImageIcon, MapPin, Building, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  user: UserProfile | null;
}

export const TradeShowcase: React.FC<Props> = ({ user }) => {
  const [items, setItems] = useState<TradeShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [file, setFile] = useState<File | null>(null);
  const [partner, setPartner] = useState('');
  const [city, setCity] = useState('');
  const [uploading, setUploading] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchItems = async () => {
    try {
      const data = await getShowcaseItems();
      setItems(data);
    } catch (error) {
      console.error("Error fetching showcase:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Set interval to auto slide carousel
  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [items.length]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Selecione uma imagem!");
    setUploading(true);
    try {
      // NOTE: Se ele travar e não aparecer mais nenhum erro aqui, o Firebase Storage está bloqueando o acesso.
      // É preciso arrumar a "Rules" do Storage no Console do Firebase.
      const imageUrl = await uploadShowcaseImage(file);
      await createShowcaseItem({
        imageUrl,
        partner,
        city,
        createdAt: Date.now()
      });
      setIsModalOpen(false);
      setFile(null);
      setPartner('');
      setCity('');
      fetchItems();
    } catch (e: any) {
      console.error("DEBUG UPLOAD ERRO:", e);
      alert("Erro ao salvar a foto! Acesso negado ou erro de conexão. Verifique as Regras de Storage no Firebase Console.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, imageUrl: string) => {
    if (confirm("Deletar definitivamente esta foto da vitrine?")) {
      await deleteShowcaseItem(id, imageUrl);
      if (currentIndex >= items.length - 1) {
        setCurrentIndex(Math.max(0, items.length - 2));
      }
      fetchItems();
    }
  };

  if (loading) return null;

  return (
    <div className="w-full relative animate-in fade-in duration-700 bg-black">
      {/* Header Container Constrained inside Full Width */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex justify-between items-end absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 to-transparent">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white drop-shadow-lg">Vitrine de Ações</h2>
          <p className="text-gray-300 text-sm md:text-base mt-1 drop-shadow-md">Inspirações e demonstrações das nossas execuções de destaque.</p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-brand-red text-white px-5 py-2.5 rounded-xl hover:bg-red-700 transition-all shadow-[0_0_15px_rgba(220,38,38,0.5)] font-bold text-sm transform hover:-translate-y-1"
          >
            <PlusCircle size={18} /> <span className="hidden md:inline">Cadastrar Vitrine</span>
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-32 bg-gray-900 border-y border-gray-800 flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
             <ImageIcon className="text-gray-500" size={30} />
          </div>
          <h3 className="font-bold text-white text-lg">Ainda não há fotos na vitrine</h3>
          <p className="text-gray-400 text-sm mt-1 max-w-sm">
            {user?.role === 'admin' 
              ? "Clique em Cadastrar Vitrine acima para adicionar suas melhores fotos."
              : "As novidades aparecerão por aqui longo em breve!"}
          </p>
        </div>
      ) : (
        <div className="relative w-full h-[500px] md:h-[650px] overflow-hidden group bg-black">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`absolute top-0 left-0 w-full h-full transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
            >
              <img src={item.imageUrl} alt="Vitrine" className={`w-full h-full object-cover opacity-80 transition-transform duration-[15000ms] ease-out ${index === currentIndex ? 'scale-110' : 'scale-100'}`} />
              
              {/* Overlay inferior mais dramático */}
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none"></div>
              
              <div className="absolute bottom-0 left-0 w-full z-20">
                <div className="max-w-7xl mx-auto px-4 md:px-8 pb-8 md:pb-12 flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                  <div className="backdrop-blur-md bg-white/10 p-5 md:p-6 rounded-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex-1 transform translate-y-0 transition-all duration-500 group-hover:-translate-y-2">
                     <h3 className="text-white text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3 drop-shadow-md">
                        <Building size={28} className="text-brand-red drop-shadow"/> {item.partner}
                     </h3>
                     <div className="flex flex-wrap items-center gap-4 mt-3 text-gray-200 text-base md:text-lg font-medium">
                        <span className="flex items-center gap-2 drop-shadow"><MapPin size={20} className="text-gray-400"/> {item.city}</span>
                     </div>
                  </div>
                  
                  {user?.role === 'admin' && (
                    <button 
                      onClick={() => handleDelete(item.id, item.imageUrl)}
                      className="bg-red-600/90 hover:bg-red-700 text-white p-3 md:p-4 rounded-full backdrop-blur-sm transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] transform hover:-translate-y-1 hover:scale-110 border border-white/10"
                      title="Deletar da Vitrine"
                    >
                      <Trash2 size={24} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Navigation Arrows */}
          {items.length > 1 && (
             <>
               <button onClick={handlePrev} className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 bg-black/40 hover:bg-white hover:text-black text-white p-4 rounded-full backdrop-blur-md transition-all focus:outline-none hidden md:block opacity-0 group-hover:opacity-100 shadow-xl border border-white/20">
                 <ChevronLeft size={28} />
               </button>
               <button onClick={handleNext} className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 bg-black/40 hover:bg-white hover:text-black text-white p-4 rounded-full backdrop-blur-md transition-all focus:outline-none hidden md:block opacity-0 group-hover:opacity-100 shadow-xl border border-white/20">
                 <ChevronRight size={28} />
               </button>

               {/* Dots Indicator */}
               <div className="absolute bottom-6 right-1/2 translate-x-1/2 z-30 flex gap-3 md:bottom-12 md:right-12 md:translate-x-0">
                 {items.map((_, i) => (
                   <button key={i} onClick={() => setCurrentIndex(i)} className={`h-2.5 md:h-3 rounded-full transition-all duration-300 shadow-lg ${i === currentIndex ? 'w-8 md:w-10 bg-brand-red shadow-[0_0_10px_rgba(220,38,38,0.8)]' : 'w-2.5 md:w-3 bg-white/60 hover:bg-white'}`} aria-label={`Ir para o slide ${i + 1}`} />
                 ))}
               </div>
             </>
          )}
        </div>
      )}

      {/* Modal Form Admin */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="bg-gray-50 border-b border-gray-100 p-6 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-3 text-xl"><ImageIcon size={24} className="text-brand-red"/> Adicionar na Vitrine</h3>
              <button disabled={uploading} onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-800 hover:bg-gray-200 transition-colors bg-white p-2 rounded-full shadow-sm"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-extrabold text-gray-700 mb-2 uppercase tracking-wide">Escolher Foto</label>
                <div className="border-2 border-dashed border-brand-red/30 bg-red-50/50 rounded-2xl p-3 hover:bg-red-50 transition-colors group">
                   <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-red file:text-white hover:file:bg-red-700 file:cursor-pointer cursor-pointer transition-all" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-extrabold text-gray-700 mb-2 uppercase tracking-wide">Parceiro (Rede/Distribuidor)</label>
                <input required type="text" value={partner} onChange={e => setPartner(e.target.value)} className="w-full border-2 border-gray-100 bg-gray-50 rounded-2xl p-4 focus:bg-white focus:ring-4 focus:ring-red-100 focus:border-brand-red transition-all outline-none text-gray-800 font-medium" placeholder="Ex: Atacadão S/A" />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-gray-700 mb-2 uppercase tracking-wide">Cidade - UF</label>
                <input required type="text" value={city} onChange={e => setCity(e.target.value)} className="w-full border-2 border-gray-100 bg-gray-50 rounded-2xl p-4 focus:bg-white focus:ring-4 focus:ring-red-100 focus:border-brand-red transition-all outline-none text-gray-800 font-medium" placeholder="Ex: Goiânia - GO" />
              </div>

              <div className="pt-4">
                <button disabled={uploading || !file} type="submit" className="w-full bg-brand-red text-white font-extrabold pb-3.5 pt-4 rounded-2xl hover:bg-red-700 transition-all shadow-[0_10px_20px_rgba(220,38,38,0.3)] hover:shadow-[0_10px_25px_rgba(220,38,38,0.5)] transform hover:-translate-y-1 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:transform-none flex items-center justify-center gap-3 text-lg">
                  {uploading ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> ENVIANDO FOTO...</> : 'CADASTRAR VITRINE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
