import React, { useState } from 'react';
import { UserProfile, REGIONS } from '../types';
import { createRequest } from '../services/tradeService';
import { AlertCircle, User, Phone, Store, CheckCircle, Copy, FileImage, ShieldAlert, Palette, MapPin } from 'lucide-react';
import { useToast } from './shared/Toast';

interface Props {
  user: UserProfile | null;
  onCancel: () => void;
  onSuccess: (tradeCode: string) => void;
}

const CUSTOMIZATION_SPACES = [
  "Ponta de Gondola",
  "Sessão da Junco no corredor",
  "Fachada da loja",
  "Painel dentro da loja",
  "Outros"
];

const BRAND_CATEGORIES = [
  "Marca Junco (Festas, Doces, Mix Diversos)",
  "Confeitaria",
  "Marca Happy Life",
  "Marca Fã"
];

export const CustomizationWizard: React.FC<Props> = ({ user, onCancel, onSuccess }) => {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  
  const [hasJuncoProducts, setHasJuncoProducts] = useState<'pending' | 'yes' | 'no'>('pending');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    rcaName: '',
    rcaEmail: '',
    rcaPhone: '',
    partnerCode: '',
    region: REGIONS[0],
    customizationSpace: CUSTOMIZATION_SPACES[0],
    brandCategory: BRAND_CATEGORIES[0],
    supplierIndication: '',
    spacePhotoUrl: ''
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    setFormData({ ...formData, rcaPhone: value });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploading(true);
    setUploadProgress(0);

    const file = e.target.files[0];
    const formDataUpload = new FormData();
    formDataUpload.append('image', file);
    formDataUpload.append('key', 'c761300e7b06cd74bcb411a077aa2abe'); 

    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://api.imgbb.com/1/upload');

    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            setUploadProgress((event.loaded / event.total) * 100);
        }
    };

    xhr.onload = () => {
        if (xhr.status === 200) {
            try {
                const response = JSON.parse(xhr.responseText);
                setFormData(prev => ({ ...prev, spacePhotoUrl: response.data.url }));
                toast.success('Imagem anexada com sucesso!');
            } catch {
                toast.error("Erro ao processar imagem.");
            }
        } else {
            toast.error("Falha no upload da imagem (Servidor).");
        }
        setUploading(false);
    };

    xhr.onerror = () => {
        toast.error("Erro de rede ao fazer upload.");
        setUploading(false);
    };

    xhr.send(formDataUpload);
  };

  const handleCreate = async () => {
    // Validação
    if (!formData.rcaName.trim()) return toast.warning("Nome do RCA é obrigatório.");
    if (!formData.rcaEmail.trim()) return toast.warning("E-mail do RCA é obrigatório.");
    if (!formData.rcaPhone.trim()) return toast.warning("Telefone do RCA é obrigatório.");
    if (!formData.partnerCode.trim()) return toast.warning("Código do Parceiro é obrigatório.");
    if (!formData.spacePhotoUrl) return toast.warning("A foto do local é obrigatória para análise.");
    
    setLoading(true);
    try {
      const tradeCode = 'TJ-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const req = {
        uid: user?.uid || 'guest',
        requestType: 'personalizacao' as const,
        tradeCode,
        rcaName: formData.rcaName,
        rcaEmail: formData.rcaEmail,
        rcaPhone: formData.rcaPhone,
        partnerCode: formData.partnerCode,
        region: formData.region,
        dateOfAction: new Date().toISOString().split('T')[0], // Não tem data programada exigida
        days: 1, // Irrelevante para personalização
        totalValue: 0, // Sem pagamento
        status: 'pending' as const,
        createdAt: Date.now(),
        // Novos Campos
        customizationSpace: formData.customizationSpace,
        brandCategory: formData.brandCategory,
        supplierIndication: formData.supplierIndication,
        spacePhotoUrl: formData.spacePhotoUrl
      };

      await createRequest(req as any);
      setGeneratedCode(tradeCode);
      setStep(3);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao solicitar personalização.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl max-w-4xl mx-auto overflow-hidden my-4 z-50">
      <div className="bg-brand-purple p-4 text-white flex justify-between items-center">
        <h2 className="font-bold text-lg flex items-center gap-2"><Palette size={20}/> Solicitação de Personalização</h2>
        {step !== 3 && <button onClick={onCancel} className="text-white/80 hover:text-white font-bold">FECHAR</button>}
      </div>

      <div className="p-6 md:p-8">
        
        {/* STEP 1: ELIMINATÓRIA */}
        {step === 1 && (
          <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Pré-Requisito de Personalização</h2>
            <div className="bg-purple-50 p-6 rounded-2xl max-w-xl mx-auto border border-purple-100">
                <p className="text-lg md:text-xl font-medium text-purple-900 mb-6">
                    O espaço que você deseja personalizar já está abastecido com mercadorias da Junco?
                </p>
                <div className="flex justify-center gap-4">
                  <button 
                    onClick={() => setHasJuncoProducts('no')}
                    className={`px-8 py-3 rounded-xl font-bold transition text-lg w-32 ${hasJuncoProducts === 'no' ? 'bg-red-600 text-white' : 'bg-white border text-gray-500'}`}
                  >
                    NÃO
                  </button>
                  <button 
                    onClick={() => { setHasJuncoProducts('yes'); setStep(2); }}
                    className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-purple-700 shadow-md text-lg w-32 transition"
                  >
                    SIM
                  </button>
                </div>
            </div>

            {hasJuncoProducts === 'no' && (
              <div className="bg-red-50 border-x-4 border-red-500 p-6 text-left rounded-xl shadow-sm max-w-xl mx-auto animate-in zoom-in-95 mt-6">
                <div className="flex items-start gap-4">
                  <ShieldAlert className="text-red-600 shrink-0 w-8 h-8 mt-1" />
                  <div>
                    <h4 className="font-black text-red-800 text-lg mb-2">Ação Bloqueada</h4>
                    <p className="text-red-700 leading-relaxed font-medium">
                      Para prosseguir com qualquer solicitação de personalização (gôndolas, fachadas, painéis), o parceiro e o espaço <strong>precisam já conter os nossos produtos</strong> posicionados no local.
                    </p>
                    <p className="text-red-600/80 text-sm mt-3">
                      Por favor, abasteça o local antes de fazer a solicitação.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: FORMULÁRIO */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            {/* RCA Identity */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                    <User size={16}/> Dados do Solicitante
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome Completo *</label>
                        <input 
                            className="w-full bg-white border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-brand-purple outline-none"
                            value={formData.rcaName}
                            onChange={e => setFormData({...formData, rcaName: e.target.value})}
                            placeholder="Seu nome completo"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">E-mail *</label>
                        <input 
                            type="email"
                            className="w-full bg-white border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-brand-purple outline-none"
                            value={formData.rcaEmail}
                            onChange={e => setFormData({...formData, rcaEmail: e.target.value})}
                            placeholder="seu.email@junco.com.br"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">WhatsApp *</label>
                        <input 
                            className="w-full bg-white border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-brand-purple outline-none"
                            value={formData.rcaPhone}
                            onChange={handlePhoneChange}
                            placeholder="(XX) XXXXX-XXXX"
                            maxLength={15}
                        />
                    </div>
                </div>
            </div>

            {/* SPACE & BRAND */}
            <div className="grid md:grid-cols-2 gap-6">
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Código do Parceiro *</label>
                  <div className="relative">
                      <Store size={18} className="absolute left-3 top-3.5 text-gray-400"/>
                      <input 
                        className="w-full bg-white border border-gray-200 p-3 pl-10 rounded-xl focus:ring-2 focus:ring-brand-purple outline-none text-lg font-bold text-gray-800"
                        value={formData.partnerCode}
                        onChange={e => setFormData({...formData, partnerCode: e.target.value})}
                        placeholder="Ex: 12345"
                      />
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Região *</label>
                  <div className="relative">
                      <MapPin size={18} className="absolute left-3 top-3.5 text-gray-400"/>
                      <select 
                        className="w-full bg-white border border-gray-200 p-3 pl-10 rounded-xl focus:ring-2 focus:ring-brand-purple outline-none font-medium"
                        value={formData.region}
                        onChange={e => setFormData({...formData, region: e.target.value as any})}
                      >
                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                  </div>
               </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Qual o Espaço a ser Personalizado? *</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-brand-purple outline-none font-medium text-gray-800"
                    value={formData.customizationSpace}
                    onChange={e => setFormData({...formData, customizationSpace: e.target.value})}
                  >
                    {CUSTOMIZATION_SPACES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Qual Categoria da Solicitação? *</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-brand-purple outline-none font-medium text-gray-800"
                    value={formData.brandCategory}
                    onChange={e => setFormData({...formData, brandCategory: e.target.value})}
                  >
                    {BRAND_CATEGORIES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">Indicação de Fornecedor / Gráfica Local (Opcional)</label>
                <p className="text-xs text-gray-500 mb-2">Tem algum fornecedor de confiança na cidade da loja que realize o serviço e possamos contatar?</p>
                <input 
                  className="w-full bg-white border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-brand-purple outline-none"
                  value={formData.supplierIndication}
                  onChange={e => setFormData({...formData, supplierIndication: e.target.value})}
                  placeholder="Nome, Telefone ou Sem indicação"
                />
            </div>

            <div className="border-t border-purple-100 pt-6 bg-purple-50 p-6 rounded-2xl mb-8">
                <h3 className="font-black text-purple-900 mb-2 flex items-center gap-2"><FileImage/> Foto do Local a ser Personalizado *</h3>
                <p className="text-sm text-purple-700 mb-4">Envie uma foto clara que demonstre como o espaço da Junco está posicionado hoje ou a fachada da loja.</p>
                
                {formData.spacePhotoUrl ? (
                    <div className="bg-white p-3 rounded-xl border border-green-200 flex items-center gap-4">
                        <img src={formData.spacePhotoUrl} alt="Local" className="w-20 h-20 object-cover rounded-lg shadow-sm" />
                        <div className="flex-1">
                            <h4 className="font-bold text-green-700 flex items-center gap-1"><CheckCircle size={16}/> Foto do Espaço Anexada</h4>
                            <p className="text-xs text-gray-500 truncate max-w-sm">{formData.spacePhotoUrl}</p>
                        </div>
                        <button onClick={() => setFormData({...formData, spacePhotoUrl: ''})} className="text-red-500 hover:bg-red-50 p-2 rounded-lg text-sm font-bold">REMOVER</button>
                    </div>
                ) : (
                    <div>
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="photo-upload" disabled={uploading} />
                        <label htmlFor="photo-upload" className={`w-full flex items-center justify-center gap-2 border-2 border-dashed ${uploading ? 'bg-gray-100 border-gray-300' : 'bg-white border-purple-300 hover:bg-purple-100 hover:border-purple-500 cursor-pointer'} text-purple-700 py-6 rounded-xl font-bold transition`}>
                            {uploading ? 'Enviando imagem...' : 'SELECIONAR FOTO DO LOCAL'}
                        </label>
                        {uploading && (
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-3 overflow-hidden">
                            <div className="bg-purple-500 h-2 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                          </div>
                        )}
                    </div>
                )}
            </div>

            <button 
              onClick={handleCreate}
              disabled={loading || uploading || !formData.spacePhotoUrl}
              className="w-full bg-brand-purple text-white py-4 rounded-xl font-bold text-xl shadow-xl hover:bg-purple-900 transition transform hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0 disabled:hover:translate-y-0"
            >
              {loading ? "Processando..." : "ENVIAR SOLICITAÇÃO D/ PERSONALIZAÇÃO"}
            </button>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 3 && (
          <div className="text-center py-10 animate-in zoom-in-95 duration-500">
            <div className="inline-flex bg-green-100 p-6 rounded-full text-green-600 mb-4">
              <CheckCircle size={64} />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-800 mb-2">Solicitação Enviada!</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-8 text-sm md:text-base">
              A personalização entrará para a pauta de análises do setor. Guarde o ID gerado para acompanhar o progresso (Aprovado/Recusado) no seu painel.
            </p>
            
            <div className="bg-gray-50 border border-gray-200 p-6 rounded-xl max-w-sm mx-auto mb-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Código Único</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl font-black text-brand-purple tracking-widest">{generatedCode}</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(generatedCode);
                    toast.success("Código copiado!");
                  }}
                  className="text-gray-400 hover:text-brand-purple p-2 bg-white rounded-lg shadow-sm"
                  title="Copiar Código"
                >
                  <Copy size={20}/>
                </button>
              </div>
            </div>

            <button 
              onClick={() => onSuccess(generatedCode)} 
              className="bg-gray-800 text-white px-8 py-4 rounded-xl font-bold hover:bg-black transition shadow-lg w-full md:w-auto"
            >
              VOLTAR AO INÍCIO
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
