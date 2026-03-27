import React, { useState, useEffect } from 'react';
import { UserProfile, TradeShowcaseItem } from '../types';
import { getShowcaseItems, createShowcaseItem, uploadShowcaseImage, deleteShowcaseItem } from '../services/showcaseService';
import { PlusCircle, Trash2, X, Image as ImageIcon, MapPin, Building, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [requiredValue, setRequiredValue] = useState('');
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
      const imageUrl = await uploadShowcaseImage(file);
      await createShowcaseItem({
        imageUrl,
        partner,
        city,
        requiredValue: Number(requiredValue) || 0,
        createdAt: Date.now()
      });
      setIsModalOpen(false);
      setFile(null);
      setPartner('');
      setCity('');
      setRequiredValue('');
      fetchItems();
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar a vitrine. Tem certeza que a imagem não é grande demais?");
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
    <div className="w-full mt-12 mb-16 relative animate-in fade-in duration-700">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800">Vitrine de Ações</h2>
          <p className="text-gray-500 text-sm md:text-base mt-1">Inspirações e demonstrações das nossas execuções de destaque.</p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-black transition-all shadow-md font-bold text-sm transform hover:-translate-y-1"
          >
            <PlusCircle size={18} /> <span className="hidden md:inline">Cadastrar Vitrine</span>
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
             <ImageIcon className="text-gray-400" size={30} />
          </div>
          <h3 className="font-bold text-gray-700 text-lg">Ainda não há fotos na vitrine</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-sm">
            {user?.role === 'admin' 
              ? "Clique em Cadastrar Vitrine acima para adicionar suas melhores fotos."
              : "As novidades aparecerão por aqui longo em breve!"}
          </p>
        </div>
      ) : (
        <div className="relative w-full h-[400px] md:h-[500px] rounded-[2rem] overflow-hidden group shadow-2xl bg-black">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`absolute top-0 left-0 w-full h-full transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
            >
              <img src={item.imageUrl} alt="Vitrine" className={`w-full h-full object-cover opacity-90 transition-transform duration-[10000ms] ease-out ${index === currentIndex ? 'scale-110' : 'scale-100'}`} />
              
              {/* Glassmorphism Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
              
              <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 z-20">
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                  <div className="backdrop-blur-md bg-white/10 p-5 md:p-6 rounded-2xl border border-white/20 shadow-2xl flex-1 transform translate-y-0 transition-all duration-500 group-hover:-translate-y-2">
                     <h3 className="text-white text-2xl md:text-3xl font-bold flex items-center gap-2 drop-shadow-md">
                        <Building size={24} className="text-brand-red drop-shadow"/> {item.partner}
                     </h3>
                     <div className="flex flex-wrap items-center gap-4 mt-3 text-gray-100 text-sm md:text-base font-medium">
                        <span className="flex items-center gap-1.5"><MapPin size={18}/> {item.city}</span>
                        <div className="h-4 w-px bg-white/30 hidden md:block"></div>
                        <span className="flex items-center gap-1.5 text-green-400"><DollarSign size={18}/> R$ {item.requiredValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} necessários</span>
                     </div>
                  </div>
                  
                  {user?.role === 'admin' && (
                    <button 
                      onClick={() => handleDelete(item.id, item.imageUrl)}
                      className="bg-red-600/90 hover:bg-red-700 text-white p-3 md:p-4 rounded-full backdrop-blur-sm transition-all shadow-lg transform hover:-translate-y-1 hover:scale-110"
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
               <button onClick={handlePrev} className="absolute left-6 top-1/2 -translate-y-1/2 z-30 bg-black/40 hover:bg-white hover:text-black text-white p-3 rounded-full backdrop-blur-md transition-all focus:outline-none hidden md:block opacity-0 group-hover:opacity-100 shadow-xl">
                 <ChevronLeft size={24} />
               </button>
               <button onClick={handleNext} className="absolute right-6 top-1/2 -translate-y-1/2 z-30 bg-black/40 hover:bg-white hover:text-black text-white p-3 rounded-full backdrop-blur-md transition-all focus:outline-none hidden md:block opacity-0 group-hover:opacity-100 shadow-xl">
                 <ChevronRight size={24} />
               </button>

               {/* Dots Indicator */}
               <div className="absolute bottom-4 right-1/2 translate-x-1/2 z-30 flex gap-2 md:bottom-8 md:right-8 md:translate-x-0">
                 {items.map((_, i) => (
                   <button key={i} onClick={() => setCurrentIndex(i)} className={`h-2 md:h-2.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-6 md:w-8 bg-brand-red' : 'w-2 md:w-2.5 bg-white/60 hover:bg-white'}`} aria-label={`Ir para o slide ${i + 1}`} />
                 ))}
               </div>
             </>
          )}
        </div>
      )}

      {/* Modal Form Admin */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="bg-gray-50 border-b border-gray-100 p-5 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg"><ImageIcon size={20} className="text-brand-red"/> Adicionar na Vitrine</h3>
              <button disabled={uploading} onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-1 rounded-full shadow-sm"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Escolher Foto</label>
                <div className="border border-dashed border-brand-red/30 bg-red-50/50 rounded-xl p-2">
                   <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-red file:text-white hover:file:bg-red-700 file:cursor-pointer cursor-pointer transition-all" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Parceiro (Rede/Distribuidor)</label>
                <input required type="text" value={partner} onChange={e => setPartner(e.target.value)} className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all outline-none" placeholder="Ex: Atacadão S/A" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Cidade - UF</label>
                <input required type="text" value={city} onChange={e => setCity(e.target.value)} className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all outline-none" placeholder="Ex: Goiânia - GO" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Valor Agregado na Ação</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 mt-[1px] text-gray-400 font-bold">R$</span>
                  <input required type="number" min="0" step="0.01" value={requiredValue} onChange={e => setRequiredValue(e.target.value)} className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3 pl-10 focus:bg-white focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all outline-none" placeholder="1500" />
                </div>
              </div>
              
              <div className="pt-2">
                <button disabled={uploading || !file} type="submit" className="w-full bg-brand-red text-white font-bold py-3.5 rounded-xl hover:bg-red-700 transition-all shadow-md disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none flex items-center justify-center gap-2">
                  {uploading ? <span className="animate-pulse">ENVIANDO PARA NUVEM...</span> : 'CADASTRAR VITRINE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
