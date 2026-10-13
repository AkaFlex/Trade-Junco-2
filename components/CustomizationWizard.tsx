import React, { useState } from 'react';
import { UserProfile, REGIONS, STORE_LOCATIONS, FOOT_TRAFFIC_OPTIONS, StoreLocation, FootTraffic, Region } from '../types';
import { OptionSelect, OptionButtons } from './shared/OptionSelect';
import { MIN_CUSTOMIZATION_PHOTOS } from '../config';
import { createRequest } from '../services/tradeService';
import { generateTradeCode } from '../services/tradeCode';
import { uploadFiles } from '../services/uploadService';
import { todayLocal } from '../utils/date';
import { User, Store, MapPin, CheckCircle, Copy, FileImage, ShieldAlert, Palette, X, Loader2, PlusCircle } from 'lucide-react';
import { useToast } from './shared/Toast';

interface Props {
  user: UserProfile | null;
  onCancel: () => void;
  onSuccess: (tradeCode: string) => void;
}

const CUSTOMIZATION_SPACES = [
  "Ponta de Gondola",
  "Sessão no corredor",
  "Fachada da Loja",
  "Painel dentro da Loja",
  "Escada",
  "Outros"
];

const BRAND_CATEGORIES = [
  "Marca Junco - Festas",
  "Marca Junco - Doces",
  "Marca Fã",
  "Marca Happy Life"
];

export const CustomizationWizard: React.FC<Props> = ({ user, onCancel, onSuccess }) => {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  
  const [hasJuncoProducts, setHasJuncoProducts] = useState<'pending' | 'yes' | 'no'>('pending');

  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    rcaName: '',
    rcaEmail: '',
    rcaPhone: '',
    partnerCode: '',
    region: '' as Region | '',
    city: '',
    customizationSpace: '',
    brandCategory: '',
    storeLocation: '' as StoreLocation | '',
    footTraffic: '' as FootTraffic | '',
    supplierIndication: '',
    spacePhotoUrls: [] as string[]
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    setFormData({ ...formData, rcaPhone: value });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setUploading(true);
    try {
      const { urls, failures } = await uploadFiles(files, 'personalizacao', ['image']);
      if (urls.length) {
        setFormData(prev => ({ ...prev, spacePhotoUrls: [...prev.spacePhotoUrls, ...urls] }));
        toast.success(`${urls.length} foto(s) anexada(s)!`);
      }
      failures.forEach(f => toast.error('Foto não enviada', f.reason));
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    // Validação
    if (!formData.rcaName.trim()) return toast.warning("Nome do RCA é obrigatório.");
    if (!formData.rcaEmail.trim()) return toast.warning("E-mail do RCA é obrigatório.");
    if (!formData.rcaPhone.trim()) return toast.warning("Telefone do RCA é obrigatório.");
    if (!formData.partnerCode.trim()) return toast.warning("Código do Parceiro é obrigatório.");
    if (!formData.city.trim()) return toast.warning("A Cidade é obrigatória para personalização.");
    if (!formData.region) return toast.warning("Selecione a Regional.");
    if (!formData.customizationSpace) return toast.warning("Selecione o espaço a ser personalizado.");
    if (!formData.brandCategory) return toast.warning("Selecione a categoria de produtos no espaço.");
    if (!formData.storeLocation) return toast.warning("Selecione a localização do espaço dentro da loja.");
    if (!formData.footTraffic) return toast.warning("Selecione o fluxo de pessoas no espaço.");
    if (formData.spacePhotoUrls.length < MIN_CUSTOMIZATION_PHOTOS) return toast.warning(`Envie no mínimo ${MIN_CUSTOMIZATION_PHOTOS} fotos do espaço.`);
    
    setLoading(true);
    try {
      const tradeCode = generateTradeCode();
      
      const req = {
        uid: user?.uid || 'guest',
        requestType: 'personalizacao' as const,
        tradeCode,
        rcaName: formData.rcaName,
        rcaEmail: formData.rcaEmail.trim().toLowerCase(),
        rcaPhone: formData.rcaPhone,
        partnerCode: formData.partnerCode,
        region: formData.region,
        city: formData.city,
        dateOfAction: todayLocal(), // Não tem data programada exigida
        days: 1, // Irrelevante para personalização
        totalValue: 0, // Sem pagamento
        status: 'pending' as const,
        createdAt: Date.now(),
        // Novos Campos
        customizationSpace: formData.customizationSpace,
        brandCategory: formData.brandCategory,
        storeLocation: formData.storeLocation,
        footTraffic: formData.footTraffic,
        supplierIndication: formData.supplierIndication,
        spacePhotoUrls: formData.spacePhotoUrls
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
    <div className="bg-white rounded-md shadow-sm max-w-4xl mx-auto overflow-hidden my-4 z-50">
      <div className="bg-brand-purple p-4 text-white flex justify-between items-center">
        <h2 className="font-bold text-lg flex items-center gap-2"><Palette size={20}/> Solicitação de Personalização</h2>
        {step !== 3 && <button onClick={onCancel} className="text-white/80 hover:text-white font-bold">FECHAR</button>}
      </div>

      <div className="p-6 md:p-8">
        
        {/* STEP 1: ELIMINATÓRIA */}
        {step === 1 && (
          <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Pré-Requisito de Personalização</h2>
            <div className="bg-purple-50 p-6 rounded-md max-w-xl mx-auto border border-purple-100">
                <p className="text-lg md:text-xl font-medium text-purple-900 mb-6">
                    O espaço que você deseja personalizar já está abastecido com mercadorias da Junco?
                </p>
                <div className="flex justify-center gap-4">
                  <button 
                    onClick={() => setHasJuncoProducts('no')}
                    className={`px-8 py-3 rounded-md font-bold transition text-lg w-32 ${hasJuncoProducts === 'no' ? 'bg-red-600 text-white' : 'bg-white border text-gray-500'}`}
                  >
                    NÃO
                  </button>
                  <button 
                    onClick={() => { setHasJuncoProducts('yes'); setStep(2); }}
                    className="bg-purple-600 text-white px-8 py-3 rounded-md font-bold hover:bg-purple-700 shadow-md text-lg w-32 transition"
                  >
                    SIM
                  </button>
                </div>
            </div>

            {hasJuncoProducts === 'no' && (
              <div className="bg-red-50 border-x-4 border-red-500 p-6 text-left rounded-md shadow-sm max-w-xl mx-auto animate-in zoom-in-95 mt-6">
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
            <div className="bg-gray-50 p-5 rounded-md border border-gray-100">
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
            <div className="grid md:grid-cols-3 gap-6">
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cód. do Parceiro *</label>
                  <div className="relative">
                      <Store size={18} className="absolute left-3 top-3.5 text-gray-400"/>
                      <input 
                        className="w-full bg-white border border-gray-200 p-3 pl-10 rounded-md focus:ring-2 focus:ring-brand-purple outline-none text-lg font-bold text-gray-800"
                        value={formData.partnerCode}
                        onChange={e => setFormData({...formData, partnerCode: e.target.value.replace(/\D/g, '')})}
                        placeholder="Ex: 12345"
                      />
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cidade *</label>
                  <div className="relative">
                      <MapPin size={18} className="absolute left-3 top-3.5 text-gray-400"/>
                      <input 
                        className="w-full bg-white border border-gray-200 p-3 pl-10 rounded-md focus:ring-2 focus:ring-brand-purple outline-none font-medium text-gray-800"
                        value={formData.city}
                        onChange={e => setFormData({...formData, city: e.target.value})}
                        placeholder="Nome da Cidade"
                      />
                  </div>
               </div>
               <div>
                  <label htmlFor="cz-region" className="block text-xs font-bold text-gray-500 uppercase mb-2">Regional *</label>
                  <OptionSelect id="cz-region" value={formData.region} options={REGIONS} placeholder="Selecione a regional"
                    onChange={region => setFormData({ ...formData, region })} />
               </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="cz-space" className="block text-xs font-bold text-gray-500 uppercase mb-2">Qual o Espaço a ser Personalizado? *</label>
                  <OptionSelect id="cz-space" value={formData.customizationSpace} options={CUSTOMIZATION_SPACES} placeholder="Selecione o espaço"
                    onChange={customizationSpace => setFormData({ ...formData, customizationSpace })} />
                </div>
                <div>
                  <label htmlFor="cz-category" className="block text-xs font-bold text-gray-500 uppercase mb-2">Qual Categoria de Produtos no Espaço? *</label>
                  <OptionSelect id="cz-category" value={formData.brandCategory} options={BRAND_CATEGORIES} placeholder="Selecione a categoria"
                    onChange={brandCategory => setFormData({ ...formData, brandCategory })} />
                </div>
            </div>

            <div>
                <span id="cz-location" className="block text-xs font-bold text-gray-500 uppercase mb-2">Localização do espaço dentro da loja *</span>
                <OptionButtons ariaLabel="Localização do espaço dentro da loja" value={formData.storeLocation} options={STORE_LOCATIONS}
                  onChange={storeLocation => setFormData({ ...formData, storeLocation })} />
            </div>

            <div>
                <span className="block text-xs font-bold text-gray-500 uppercase mb-2">Fluxo de pessoas no espaço *</span>
                <OptionButtons ariaLabel="Fluxo de pessoas no espaço" value={formData.footTraffic} options={FOOT_TRAFFIC_OPTIONS}
                  onChange={footTraffic => setFormData({ ...formData, footTraffic })} />
            </div>

            <div className="border-t border-gray-100 pt-6">
                <label htmlFor="cz-supplier" className="block text-sm font-bold text-gray-700 mb-2">Indicação de fornecedor de comunicação visual (opcional)</label>
                <p className="text-xs text-gray-500 mb-2">Tem algum fornecedor de comunicação visual de confiança na cidade da loja que possamos contatar?</p>
                <input 
                  id="cz-supplier"
                  className="w-full bg-white border border-gray-200 p-3 rounded-md focus:ring-2 focus:ring-brand-purple outline-none"
                  value={formData.supplierIndication}
                  onChange={e => setFormData({...formData, supplierIndication: e.target.value})}
                  placeholder="Nome, Telefone ou Sem indicação"
                />
            </div>

            <div className="border-t border-purple-100 pt-6 bg-purple-50 p-6 rounded-md mb-8">
                <h3 className="font-black text-purple-900 mb-2 flex items-center gap-2"><FileImage/> Fotos do Espaço * <span className="text-xs font-bold text-purple-700">({formData.spacePhotoUrls.length}/{MIN_CUSTOMIZATION_PHOTOS} mínimo)</span></h3>
                <p className="text-sm text-purple-700 mb-4">Envie no mínimo {MIN_CUSTOMIZATION_PHOTOS} fotos claras do espaço a ser personalizado (como está hoje e a visão geral do local).</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                  {formData.spacePhotoUrls.map((url, idx) => (
                    <div key={idx} className="relative group aspect-square">
                      <img src={url} alt={`Local ${idx + 1}`} className="w-full h-full object-cover rounded-md border-2 border-white shadow-sm" />
                      <button 
                        onClick={() => setFormData({
                          ...formData, 
                          spacePhotoUrls: formData.spacePhotoUrls.filter((_, i) => i !== idx)
                        })} 
                        aria-label={`Remover foto ${idx + 1}`}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition"
                      >
                        <X size={14}/>
                      </button>
                    </div>
                  ))}
                  
                  <label className={`aspect-square flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-md transition cursor-pointer ${uploading ? 'bg-gray-100 border-gray-300' : 'bg-white border-purple-300 hover:bg-purple-100 hover:border-purple-500 text-purple-700'}`}>
                    <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" disabled={uploading} />
                    {uploading ? (
                      <div className="animate-spin text-purple-600"><Loader2 size={24}/></div>
                    ) : (
                      <>
                        <PlusCircle size={24}/>
                        <span className="text-[10px] font-bold uppercase">Adicionar</span>
                      </>
                    )}
                  </label>
                </div>

            </div>

            <button 
              onClick={handleCreate}
              disabled={loading || uploading || formData.spacePhotoUrls.length < MIN_CUSTOMIZATION_PHOTOS}
              className="w-full bg-brand-purple text-white py-4 rounded-md font-bold text-xl shadow-sm hover:bg-purple-900 transition transform hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0 disabled:hover:translate-y-0"
            >
              {loading ? "Processando..." : "ENVIAR SOLICITAÇÃO DE PERSONALIZAÇÃO"}
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
            
            <div className="bg-gray-50 border border-gray-200 p-6 rounded-md max-w-sm mx-auto mb-8">
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
              className="bg-gray-800 text-white px-8 py-4 rounded-md font-bold hover:bg-black transition shadow-lg w-full md:w-auto"
            >
              VOLTAR AO INÍCIO
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
