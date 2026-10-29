import React, { useState } from 'react';
import { UserProfile, REGIONS } from '../types';
import { createRequest } from '../services/tradeService';
import { generateTradeCode } from '../services/tradeCode';
import { uploadFile, validateFile, acceptAttr } from '../services/uploadService';
import { OptionSelect, OptionButtons } from './shared/OptionSelect';
import { WizardShell, FormSection, Field, SuccessScreen, ReviewScreen } from './shared/Wizard';
import { Region } from '../types';
import { PartyPopper, HeartHandshake, User, Building2, Calendar, Clock, MapPin, Users, FileText, Paperclip, Loader2, X, ArrowRight } from 'lucide-react';
import { useToast } from './shared/Toast';

interface Props {
  user: UserProfile | null;
  onCancel: () => void;
  onSuccess: (tradeCode: string) => void;
}

type SubType = 'evento' | 'acao_social';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EventsWizard: React.FC<Props> = ({ user, onCancel, onSuccess }) => {
  const toast = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [subType, setSubType] = useState<SubType | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const [formData, setFormData] = useState({
    solicitante: '',
    email: '',
    contatoTratativas: '',
    region: '' as Region | '',
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
    e.target.value = '';
    if (!file || !subType) return;
    const invalid = validateFile(file, ['image', 'pdf', 'doc']);
    if (invalid) return toast.warning('Arquivo não aceito', invalid);
    setUploading(true);
    try {
      const url = await uploadFile(file, subType);
      setFormData(prev => ({ ...prev, [field]: url }));
      setAttachmentName(file.name);
      toast.success('Anexo enviado!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar anexo.', (err as Error)?.message);
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
    !EMAIL_RE.test(formData.email.trim()) ||
    !formData.contatoTratativas.trim() ||
    !formData.region ||
    !formData.dataEvento.trim() ||
    !formData.eventTime.trim() ||
    !formData.eventLocation.trim() ||
    !formData.eventPurpose.trim() ||
    !attachmentUrl ||
    (isEvento
      ? !formData.institutionName.trim() || !formData.expectedAudience.trim() || !formData.juncoParticipation.trim()
      : !formData.itemQuantity.trim() || !formData.desiredProduct.trim() || (formData.seasonalDate === 'sim' && !formData.seasonalDateDescription.trim()));

  const handleCreate = async (confirmed = false) => {
    if (!subType) return;
    if (!formData.solicitante.trim()) return toast.warning("Solicitante é obrigatório.");
    if (!EMAIL_RE.test(formData.email.trim())) return toast.warning("Informe um e-mail válido para retorno.");
    if (!formData.contatoTratativas.trim()) return toast.warning("Contato para tratativas é obrigatório.");
    if (!formData.region) return toast.warning("Selecione a região.");
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

    if (!confirmed) { setReviewing(true); return; }

    setLoading(true);
    try {
      const tradeCode = generateTradeCode();

      const req: any = {
        uid: user?.uid || 'guest',
        requestType: subType,
        tradeCode,
        rcaName: formData.solicitante,
        rcaEmail: formData.email.trim().toLowerCase(),
        rcaPhone: formData.contatoTratativas,
        partnerCode: isEvento ? (formData.institutionName || '—') : '—',
        region: formData.region,
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

  const set = (patch: Partial<typeof formData>) => setFormData({ ...formData, ...patch });
  const field = isEvento ? 'mediaKitUrl' : 'actionOfficeUrl';

  if (step === 3) {
    return (
      <WizardShell title="Solicitação de eventos" icon={<PartyPopper size={20} />}>
        <SuccessScreen
          title="Solicitação enviada!"
          text="O Trade responde em até 3 dias. Guarde o código para acompanhar em Minhas solicitações."
          code={generatedCode}
          onDone={() => onSuccess(generatedCode)}
        />
      </WizardShell>
    );
  }

  if (reviewing) {
    const fmtD = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');
    return (
      <WizardShell title="Solicitação de eventos" icon={<PartyPopper size={20} />} onClose={onCancel}>
        <ReviewScreen
          confirmLabel="Confirmar e enviar"
          loading={loading}
          onEdit={() => setReviewing(false)}
          onConfirm={() => handleCreate(true)}
          rows={[
            { label: 'Tipo', value: isEvento ? 'Evento' : 'Ação social' },
            { label: 'Solicitante', value: formData.solicitante },
            { label: 'E-mail', value: formData.email },
            { label: 'Contato para tratativas', value: formData.contatoTratativas },
            { label: 'Região', value: formData.region },
            ...(isEvento ? [
              { label: 'Instituição/empresa', value: formData.institutionName },
              { label: 'Categoria', value: formData.eventCategory === 'esportivo' ? 'Esportivo' : 'Comercial' },
              { label: 'Público esperado', value: formData.expectedAudience },
              { label: 'Participação da Junco', value: formData.juncoParticipation },
            ] : [
              { label: 'Quantidade de itens', value: formData.itemQuantity },
              { label: 'Produto desejado', value: formData.desiredProduct },
              { label: 'Data sazonal', value: formData.seasonalDate === 'sim' ? formData.seasonalDateDescription : 'Não' },
            ]),
            { label: 'Dia', value: fmtD(formData.dataEvento) },
            { label: 'Horário', value: formData.eventTime },
            { label: 'Local', value: formData.eventLocation },
            { label: 'Finalidade', value: formData.eventPurpose },
            { label: isEvento ? 'Mídia kit' : 'Ofício da ação', value: attachmentName || 'Anexado' },
          ]}
        />
      </WizardShell>
    );
  }

  return (
    <WizardShell title="Solicitação de eventos" icon={<PartyPopper size={20} />} onClose={onCancel}>
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="section-title">Qual o tipo de solicitação?</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {([
              { t: 'evento', title: 'Eventos', text: 'Evento esportivo ou comercial com participação da Junco.', icon: <PartyPopper size={24} />, color: 'border-l-orange-junco' },
              { t: 'acao_social', title: 'Ação social', text: 'Doação ou ação social, sazonal ou não, com envio de itens.', icon: <HeartHandshake size={24} />, color: 'border-l-green-junco' },
            ] as const).map(o => (
              <button key={o.t} onClick={() => chooseSubType(o.t)} className={`card border-l-4 ${o.color} p-5 text-left flex flex-col gap-2 hover:border-navy transition-colors duration-150 group`}>
                <span className="text-navy">{o.icon}</span>
                <span className="section-title">{o.title}</span>
                <span className="text-[13.5px] text-muted">{o.text}</span>
                <span className="font-condensed font-bold text-[12.5px] uppercase tracking-[.3px] text-navy flex items-center gap-1.5">
                  Escolher <ArrowRight size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && subType && (
        <>
          <div className="flex items-center justify-between gap-3 mb-5">
            <span className={isEvento ? 'badge-highlight' : 'badge-ok'}>{isEvento ? 'Evento' : 'Ação social'}</span>
            <button onClick={() => setStep(1)} className="btn">Trocar tipo</button>
          </div>

          <FormSection title="Dados do solicitante" icon={<User size={16} />}>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Solicitante *" htmlFor="ev-name">
                <input id="ev-name" className="input" value={formData.solicitante} onChange={e => set({ solicitante: e.target.value })} placeholder="Nome de quem está solicitando" autoComplete="name" />
              </Field>
              <Field label="E-mail *" htmlFor="ev-email">
                <input id="ev-email" type="email" className="input" value={formData.email} onChange={e => set({ email: e.target.value })} placeholder="email@empresa.com.br" autoComplete="email" />
              </Field>
              <Field label="Contato para tratativas *" htmlFor="ev-contact">
                <input id="ev-contact" className="input" value={formData.contatoTratativas} onChange={e => set({ contatoTratativas: e.target.value })} placeholder="Telefone ou WhatsApp" inputMode="tel" />
              </Field>
              <Field label="Região *" htmlFor="ev-region">
                <OptionSelect id="ev-region" value={formData.region} options={REGIONS} onChange={region => set({ region })} placeholder="Selecione a região" />
              </Field>
            </div>
          </FormSection>

          <FormSection title={isEvento ? 'O evento' : 'A ação social'} icon={isEvento ? <PartyPopper size={16} /> : <HeartHandshake size={16} />}>
            <div className="grid md:grid-cols-3 gap-4">
              {isEvento ? (
                <>
                  <Field label="Nome da instituição/empresa solicitante *" htmlFor="ev-inst" className="md:col-span-2">
                    <div className="relative">
                      <Building2 size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                      <input id="ev-inst" className="input pl-8" value={formData.institutionName} onChange={e => set({ institutionName: e.target.value })} placeholder="Ex: Prefeitura de..., Empresa X" />
                    </div>
                  </Field>
                  <Field label="Tipo *">
                    <OptionButtons ariaLabel="Tipo de evento" value={formData.eventCategory}
                      options={[{ value: 'esportivo', label: 'Esportivo' }, { value: 'comercial', label: 'Comercial' }]}
                      onChange={v => set({ eventCategory: v as 'esportivo' | 'comercial' })} />
                  </Field>
                </>
              ) : (
                <Field label="Data sazonal? *" className="md:col-span-3">
                  <div className="flex flex-col md:flex-row gap-3 md:items-center">
                    <OptionButtons ariaLabel="Data sazonal" value={formData.seasonalDate}
                      options={[{ value: 'nao', label: 'Não' }, { value: 'sim', label: 'Sim' }]}
                      onChange={v => set({ seasonalDate: v as 'sim' | 'nao' })} />
                    {formData.seasonalDate === 'sim' && (
                      <input aria-label="Qual data sazonal" className="input md:flex-1" value={formData.seasonalDateDescription} onChange={e => set({ seasonalDateDescription: e.target.value })} placeholder="Qual data? Ex: Natal, Páscoa, Dia das Crianças..." />
                    )}
                  </div>
                </Field>
              )}

              <Field label="Dia do evento *" htmlFor="ev-date">
                <div className="relative">
                  <Calendar size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input id="ev-date" type="date" className="input pl-8" value={formData.dataEvento} onChange={e => set({ dataEvento: e.target.value })} />
                </div>
              </Field>
              <Field label="Horário do evento *" htmlFor="ev-time">
                <div className="relative">
                  <Clock size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input id="ev-time" className="input pl-8" value={formData.eventTime} onChange={e => set({ eventTime: e.target.value })} placeholder="Ex: 14h às 18h" />
                </div>
              </Field>
              <Field label="Local do evento *" htmlFor="ev-place">
                <div className="relative">
                  <MapPin size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input id="ev-place" className="input pl-8" value={formData.eventLocation} onChange={e => set({ eventLocation: e.target.value })} placeholder="Endereço ou nome do local" />
                </div>
              </Field>

              {isEvento ? (
                <Field label="Público esperado *" htmlFor="ev-audience">
                  <div className="relative">
                    <Users size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input id="ev-audience" className="input pl-8" value={formData.expectedAudience} onChange={e => set({ expectedAudience: e.target.value })} placeholder="Ex: 500 pessoas" />
                  </div>
                </Field>
              ) : (
                <>
                  <Field label="Quantidade de itens *" htmlFor="ev-qty">
                    <input id="ev-qty" type="number" min="1" className="input" value={formData.itemQuantity} onChange={e => set({ itemQuantity: e.target.value })} placeholder="Ex: 100" />
                  </Field>
                  <Field label="Produto desejado *" htmlFor="ev-product" className="md:col-span-2">
                    <input id="ev-product" className="input" value={formData.desiredProduct} onChange={e => set({ desiredProduct: e.target.value })} placeholder="Ex: doces, balas, granolas..." />
                  </Field>
                </>
              )}

              <Field label="Finalidade do evento *" htmlFor="ev-purpose" className="md:col-span-3">
                <textarea id="ev-purpose" className="input" value={formData.eventPurpose} onChange={e => set({ eventPurpose: e.target.value })} placeholder="Qual o objetivo do evento/ação?" />
              </Field>
              {isEvento && (
                <Field label="Como seria a participação da Junco no evento? *" htmlFor="ev-part" className="md:col-span-3">
                  <textarea id="ev-part" className="input" value={formData.juncoParticipation} onChange={e => set({ juncoParticipation: e.target.value })} placeholder="Descreva a participação esperada" />
                </Field>
              )}
            </div>
          </FormSection>

          <FormSection title={isEvento ? 'Mídia kit do evento *' : 'Ofício da ação *'} icon={<Paperclip size={16} />}>
            <p className="hint mb-3">{isEvento ? 'Anexe o mídia kit do evento' : 'Anexe o ofício da ação'} (PDF, imagem ou Word, até 10 MB).</p>
            {attachmentUrl ? (
              <div className="card-inner flex items-center justify-between gap-3 px-3 py-2.5">
                <a href={attachmentUrl} target="_blank" rel="noreferrer" className="text-[13.5px] truncate flex items-center gap-2"><FileText size={15} /> {attachmentName || 'Anexo enviado'}</a>
                <button onClick={() => removeAttachment(field)} className="iconbtn-danger" aria-label="Remover anexo"><X size={14} /></button>
              </div>
            ) : (
              <label className={`flex items-center justify-center gap-2 border border-dashed border-line rounded bg-paper p-6 text-navy cursor-pointer transition-colors duration-150 hover:border-navy ${uploading ? 'opacity-60 cursor-default' : ''}`}>
                <input type="file" accept={acceptAttr(['image', 'pdf', 'doc'])} onChange={e => handleFileUpload(e, field)} className="sr-only" disabled={uploading} />
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                <span className="font-condensed font-bold text-[12.5px] uppercase tracking-[.3px]">{uploading ? 'Enviando...' : 'Selecionar arquivo'}</span>
              </label>
            )}
          </FormSection>

          <div className="flex justify-end mt-6 pt-5 border-t border-line">
            <button onClick={() => handleCreate()} disabled={loading || uploading || missingRequired} className="btn-primary btn-lg w-full md:w-auto">
              Revisar e enviar
            </button>
          </div>
        </>
      )}
    </WizardShell>
  );
};
