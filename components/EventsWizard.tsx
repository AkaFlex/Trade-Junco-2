import React, { useState } from 'react';
import { UserProfile, REGIONS } from '../types';
import { createRequest } from '../services/tradeService';
import { uploadEventAttachment } from '../services/eventAttachmentService';
import { PartyPopper, HeartHandshake, User, Phone, Building2, Calendar, Clock, MapPin, Users, FileText, Paperclip, CheckCircle, Copy, Loader2, X, ArrowRight } from 'lucide-react';
import { useToast } from './shared/Toast';

interface Props {
  user: UserProfile | null;
  onCancel: () => void;
  onSuccess: (tradeCode: string) => void;
}

type SubType = 'evento' | 'acao_social';

export const EventsWizard: React.FC<Props> = ({ user, onCancel, onSuccess }) => {
  const toast = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [subType, setSubType] = useState<SubType | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  const [formData, setFormData] = useState({
    solicitante: '',
    contatoTratativas: '',
    institutionName: '',
    eventCategory: 'esportivo' as 'esportivo' | 'comercial',
    dataEvento: '',
    eventTime: '',
    eventLocation: '',
    expectedAudience: '',
    eventPurpose: '',
    juncoParticipation: '',
    mediaKitUrl: '',
    seasonalDate: 'nao' as 'sim' | 'nao',
    seasonalDateDescription: '',
    itemQuantity: '',
    desiredProduct: '',
    actionOfficeUrl: '',
  });

  const chooseSubType = (t: SubType) => {
    setSubType(t);
    setStep(2);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'mediaKitUrl' | 'actionOfficeUrl') => {
    const file = e.target.files?.[0];
    if (!file || !subType) return;
    setUploading(true);
    try {
      const url = await uploadEventAttachment(file, subType);
      setFormData(prev => ({ ...prev, [field]: url }));
      setAttachmentName(file.name);
      toast.success('Anexo enviado!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar anexo.');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (field: 'mediaKitUrl' | 'actionOfficeUrl') => {
    setFormData(prev => ({ ...prev, [field]: '' }));
    setAttachmentName('');
  };

  const isEvento = subType === 'evento';

  const attachmentUrl = isEvento ? formData.mediaKitUrl : formData.actionOfficeUrl;

  const missingRequired =
    !formData.solicitante.trim() ||
    !formData.contatoTratativas.trim() ||
    !formData.dataEvento.trim() ||
    !formData.eventTime.trim() ||
    !formData.eventLocation.trim() ||
    !formData.eventPurpose.trim() ||
    !attachmentUrl ||
    (isEvento
      ? !formData.institutionName.trim() || !formData.expectedAudience.trim() || !formData.juncoParticipation.trim()
      : !formData.itemQuantity.trim() || !formData.desiredProduct.trim() || (formData.seasonalDate === 'sim' && !formData.seasonalDateDescription.trim()));

  const handleCreate = async () => {
    if (!subType) return;
    if (!formData.solicitante.trim()) return toast.warning("Solicitante é obrigatório.");
    if (!formData.contatoTratativas.trim()) return toast.warning("Contato para tratativas é obrigatório.");
    if (!formData.dataEvento.trim()) return toast.warning("Dia do Evento é obrigatório.");
    if (!formData.eventTime.trim()) return toast.warning("Horário do evento é obrigatório.");
    if (!formData.eventLocation.trim()) return toast.warning("Local do evento é obrigatório.");
    if (!formData.eventPurpose.trim()) return toast.warning("Finalidade do Evento é obrigatória.");

    if (isEvento) {
      if (!formData.institutionName.trim()) return toast.warning("Nome da Instituição/Empresa solicitante é obrigatório.");
      if (!formData.expectedAudience.trim()) return toast.warning("Público esperado é obrigatório.");
      if (!formData.juncoParticipation.trim()) return toast.warning("Descreva como seria a participação da Junco.");
      if (!formData.mediaKitUrl) return toast.warning("O anexo do Mídia Kit é obrigatório.");
    } else {
      if (!formData.itemQuantity.trim()) return toast.warning("Quantidade de itens é obrigatória.");
      if (!formData.desiredProduct.trim()) return toast.warning("Produto desejado é obrigatório.");
      if (formData.seasonalDate === 'sim' && !formData.seasonalDateDescription.trim()) return toast.warning("Informe qual é a data sazonal.");
      if (!formData.actionOfficeUrl) return toast.warning("O anexo do Ofício da ação é obrigatório.");
    }

    setLoading(true);
    try {
      const tradeCode = 'TJ-' + Math.random().toString(36).substring(2, 8).toUpperCase();

      const req: any = {
        uid: user?.uid || 'guest',
        requestType: subType,
        tradeCode,
        rcaName: formData.solicitante,
        rcaEmail: '',
        rcaPhone: formData.contatoTratativas,
        partnerCode: isEvento ? (formData.institutionName || '—') : '—',
        region: REGIONS[0],
        dateOfAction: formData.dataEvento,
        days: 1,
        totalValue: 0,
        status: 'pending',
        createdAt: Date.now(),
        eventTime: formData.eventTime,
        eventLocation: formData.eventLocation,
        eventPurpose: formData.eventPurpose,
      };

      if (isEvento) {
        req.institutionName = formData.institutionName;
        req.eventCategory = formData.eventCategory;
        req.expectedAudience = formData.expectedAudience;
        req.juncoParticipation = formData.juncoParticipation;
        req.mediaKitUrl = formData.mediaKitUrl;
      } else {
        req.seasonalDate = formData.seasonalDate;
        if (formData.seasonalDate === 'sim') req.seasonalDateDescription = formData.seasonalDateDescription;
        req.itemQuantity = Number(formData.itemQuantity);
        req.desiredProduct = formData.desiredProduct;
        req.actionOfficeUrl = formData.actionOfficeUrl;
      }

      await createRequest(req);
      setGeneratedCode(tradeCode);
      setStep(3);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao enviar solicitação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl max-w-4xl mx-auto overflow-hidden my-4 z-50">
      <div className="bg-amber-600 p-4 text-white flex justify-between items-center">
        <h2 className="font-bold text-lg flex items-center gap-2"><PartyPopper size={20}/> Solicitação de Eventos</h2>
        {step !== 3 && <button onClick={onCancel} className="text-white/80 hover:text-white font-bold">FECHAR</button>}
      </div>

      <div className="p-6 md:p-8">

        {/* STEP 1: ESCOLHA DO SUB-TIPO */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 text-center">Qual o tipo de solicitação?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <button
                onClick={() => chooseSubType('evento')}
                className="bg-white border-2 border-transparent hover:border-amber-500 p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all group flex flex-col items-center text-center"
              >
                <div className="bg-amber-50 text-amber-600 p-5 rounded-2xl mb-4 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <PartyPopper size={36}/>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Eventos</h3>
                <p className="text-gray-500 text-sm mb-4">Evento esportivo ou comercial com participação da Junco.</p>
                <span className="text-amber-600 font-bold text-sm flex items-center gap-2">
                  ESCOLHER <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                </span>
              </button>

              <button
                onClick={() => chooseSubType('acao_social')}
                className="bg-white border-2 border-transparent hover:border-emerald-500 p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all group flex flex-col items-center text-center"
              >
                <div className="bg-emerald-50 text-emerald-600 p-5 rounded-2xl mb-4 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <HeartHandshake size={36}/>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Ação Social</h3>
                <p className="text-gray-500 text-sm mb-4">Doação/ação social, sazonal ou não, com envio de itens.</p>
                <span className="text-emerald-600 font-bold text-sm flex items-center gap-2">
                  ESCOLHER <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                </span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: FORMULÁRIO */}
        {step === 2 && subType && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <button onClick={() => setStep(1)} className="text-xs font-bold text-gray-400 hover:text-gray-600">&larr; Trocar tipo de solicitação</button>

            {/* Solicitante / Contato */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
              <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                <User size={16}/> Dados do Solicitante
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Solicitante *</label>
                  <input
                    className="w-full bg-white border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    value={formData.solicitante}
                    onChange={e => setFormData({ ...formData, solicitante: e.target.value })}
                    placeholder="Nome de quem está solicitando"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Contato para tratativas *</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-3 text-gray-400"/>
                    <input
                      className="w-full bg-white border border-gray-200 p-2.5 pl-9 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                      value={formData.contatoTratativas}
                      onChange={e => setFormData({ ...formData, contatoTratativas: e.target.value })}
                      placeholder="Telefone ou e-mail"
                    />
                  </div>
                </div>
              </div>
            </div>

            {isEvento && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nome da Instituição/Empresa solicitante *</label>
                <div className="relative">
                  <Building2 size={18} className="absolute left-3 top-3.5 text-gray-400"/>
                  <input
                    className="w-full bg-white border border-gray-200 p-3 pl-10 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                    value={formData.institutionName}
                    onChange={e => setFormData({ ...formData, institutionName: e.target.value })}
                    placeholder="Ex: Prefeitura de..., Empresa X"
                  />
                </div>
              </div>
            )}

            {isEvento && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tipo *</label>
                <div className="flex gap-3">
                  {(['esportivo', 'comercial'] as const).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, eventCategory: c })}
                      className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm border transition ${formData.eventCategory === c ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-500 border-gray-200'}`}
                    >
                      {c === 'esportivo' ? 'Evento Esportivo' : 'Evento Comercial'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isEvento && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Data Sazonal? *</label>
                <div className="flex gap-3 mb-3">
                  {(['nao', 'sim'] as const).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setFormData({ ...formData, seasonalDate: v })}
                      className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm border transition ${formData.seasonalDate === v ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-500 border-gray-200'}`}
                    >
                      {v === 'sim' ? 'SIM' : 'NÃO'}
                    </button>
                  ))}
                </div>
                {formData.seasonalDate === 'sim' && (
                  <input
                    className="w-full bg-white border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.seasonalDateDescription}
                    onChange={e => setFormData({ ...formData, seasonalDateDescription: e.target.value })}
                    placeholder="Qual data sazonal? Ex: Natal, Páscoa, Dia das Crianças..."
                  />
                )}
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Dia do Evento *</label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-3 top-3.5 text-gray-400"/>
                  <input
                    type="date"
                    className="w-full bg-white border border-gray-200 p-3 pl-10 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                    value={formData.dataEvento}
                    onChange={e => setFormData({ ...formData, dataEvento: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Horário do evento *</label>
                <div className="relative">
                  <Clock size={18} className="absolute left-3 top-3.5 text-gray-400"/>
                  <input
                    className="w-full bg-white border border-gray-200 p-3 pl-10 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                    value={formData.eventTime}
                    onChange={e => setFormData({ ...formData, eventTime: e.target.value })}
                    placeholder="Ex: 14h às 18h"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Local do evento *</label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-3 top-3.5 text-gray-400"/>
                  <input
                    className="w-full bg-white border border-gray-200 p-3 pl-10 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                    value={formData.eventLocation}
                    onChange={e => setFormData({ ...formData, eventLocation: e.target.value })}
                    placeholder="Endereço ou nome do local"
                  />
                </div>
              </div>
            </div>

            {isEvento && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Público esperado *</label>
                <div className="relative">
                  <Users size={18} className="absolute left-3 top-3.5 text-gray-400"/>
                  <input
                    className="w-full bg-white border border-gray-200 p-3 pl-10 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                    value={formData.expectedAudience}
                    onChange={e => setFormData({ ...formData, expectedAudience: e.target.value })}
                    placeholder="Ex: 500 pessoas"
                  />
                </div>
              </div>
            )}

            {!isEvento && (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Quantidade de itens *</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.itemQuantity}
                    onChange={e => setFormData({ ...formData, itemQuantity: e.target.value })}
                    placeholder="Ex: 100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Produto desejado *</label>
                  <input
                    className="w-full bg-white border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.desiredProduct}
                    onChange={e => setFormData({ ...formData, desiredProduct: e.target.value })}
                    placeholder="Ex: Doces, balas, granolas..."
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Finalidade do Evento *</label>
              <textarea
                className="w-full bg-white border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none min-h-[80px]"
                value={formData.eventPurpose}
                onChange={e => setFormData({ ...formData, eventPurpose: e.target.value })}
                placeholder="Qual o objetivo do evento/ação?"
              />
            </div>

            {isEvento && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Como seria a participação da Junco no evento? *</label>
                <textarea
                  className="w-full bg-white border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none min-h-[80px]"
                  value={formData.juncoParticipation}
                  onChange={e => setFormData({ ...formData, juncoParticipation: e.target.value })}
                  placeholder="Descreva a participação esperada"
                />
              </div>
            )}

            <div className={`border-t pt-6 p-6 rounded-2xl mb-2 ${isEvento ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <h3 className={`font-black mb-2 flex items-center gap-2 ${isEvento ? 'text-amber-900' : 'text-emerald-900'}`}>
                <Paperclip/> {isEvento ? 'Mídia Kit do Evento *' : 'Ofício da Ação *'}
              </h3>
              <p className={`text-sm mb-4 ${isEvento ? 'text-amber-700' : 'text-emerald-700'}`}>
                {isEvento ? 'Anexe o mídia kit do evento (PDF ou imagem).' : 'Anexe o ofício da ação (PDF ou imagem).'}
              </p>

              {attachmentUrl ? (
                <div className="flex items-center justify-between bg-white border border-gray-200 p-3 rounded-xl">
                  <span className="text-sm font-medium text-gray-700 truncate flex items-center gap-2"><FileText size={16}/> {attachmentName || 'Anexo enviado'}</span>
                  <button onClick={() => removeAttachment(isEvento ? 'mediaKitUrl' : 'actionOfficeUrl')} className="text-gray-400 hover:text-red-500 p-1">
                    <X size={16}/>
                  </button>
                </div>
              ) : (
                <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition ${uploading ? 'bg-gray-100 border-gray-300' : 'bg-white hover:bg-gray-50 border-gray-300'}`}>
                  <input
                    type="file"
                    accept="application/pdf,image/*,.doc,.docx"
                    onChange={e => handleFileUpload(e, isEvento ? 'mediaKitUrl' : 'actionOfficeUrl')}
                    className="hidden"
                    disabled={uploading}
                  />
                  {uploading ? <Loader2 className="animate-spin text-gray-500" size={20}/> : <Paperclip size={20} className="text-gray-400"/>}
                  <span className="text-sm font-bold text-gray-500">{uploading ? 'Enviando...' : 'Selecionar arquivo'}</span>
                </label>
              )}
            </div>

            <button
              onClick={handleCreate}
              disabled={loading || uploading || missingRequired}
              className={`w-full text-white py-4 rounded-xl font-bold text-xl shadow-xl transition transform hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0 disabled:hover:translate-y-0 ${isEvento ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {loading ? "Processando..." : "ENVIAR SOLICITAÇÃO"}
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
              A solicitação entrará para a pauta de análises do setor. Guarde o código gerado para acompanhar o progresso (Aprovado/Recusado) no seu painel.
            </p>

            <div className="bg-gray-50 border border-gray-200 p-6 rounded-xl max-w-sm mx-auto mb-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Código Único</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl font-black text-amber-600 tracking-widest">{generatedCode}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedCode);
                    toast.success("Código copiado!");
                  }}
                  className="text-gray-400 hover:text-amber-600 p-2 bg-white rounded-lg shadow-sm"
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
