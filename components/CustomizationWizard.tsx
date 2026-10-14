import React, { useState } from 'react';
import { UserProfile, REGIONS, STORE_LOCATIONS, FOOT_TRAFFIC_OPTIONS, StoreLocation, FootTraffic, Region } from '../types';
import { OptionSelect, OptionButtons } from './shared/OptionSelect';
import { MIN_CUSTOMIZATION_PHOTOS } from '../config';
import { createRequest } from '../services/tradeService';
import { generateTradeCode } from '../services/tradeCode';
import { uploadFiles, acceptAttr } from '../services/uploadService';
import { todayLocal } from '../utils/date';
import { User, Store, MapPin, FileImage, ShieldAlert, Palette, X, Loader2, PlusCircle } from 'lucide-react';
import { WizardShell, FormSection, Field, GateQuestion, SuccessScreen } from './shared/Wizard';
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

  const set = (patch: Partial<typeof formData>) => setFormData({ ...formData, ...patch });
  const photosOk = formData.spacePhotoUrls.length >= MIN_CUSTOMIZATION_PHOTOS;

  if (step === 3) {
    return (
      <WizardShell title="Solicitar personalização" icon={<Palette size={20} />}>
        <SuccessScreen
          title="Solicitação enviada!"
          text="A personalização entra na pauta de análise do Trade. Guarde o código para acompanhar em Minhas solicitações."
          code={generatedCode}
          onDone={() => onSuccess(generatedCode)}
        />
      </WizardShell>
    );
  }

  return (
    <WizardShell title="Solicitar personalização" icon={<Palette size={20} />} onClose={onCancel}>
      {step === 1 && (
        <GateQuestion
          question="O espaço que você deseja personalizar já está abastecido com mercadorias da Junco?"
          onNo={() => setHasJuncoProducts('no')}
          onYes={() => { setHasJuncoProducts('yes'); setStep(2); }}
          noSelected={hasJuncoProducts === 'no'}
        >
          {hasJuncoProducts === 'no' && (
            <div className="notice-error text-left" role="alert">
              <p className="font-semibold flex items-center gap-2 mb-1"><ShieldAlert size={16} /> Solicitação bloqueada</p>
              <p>Para pedir personalização (gôndolas, fachadas, painéis), o espaço do parceiro <strong>precisa já ter nossos produtos</strong> posicionados. Abasteça o local antes de solicitar.</p>
            </div>
          )}
        </GateQuestion>
      )}

      {step === 2 && (
        <>
          <FormSection title="Dados do solicitante" icon={<User size={16} />}>
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Nome completo *" htmlFor="cz-name">
                <input id="cz-name" className="input" value={formData.rcaName} onChange={e => set({ rcaName: e.target.value })} placeholder="Seu nome completo" autoComplete="name" />
              </Field>
              <Field label="E-mail *" htmlFor="cz-email">
                <input id="cz-email" type="email" className="input" value={formData.rcaEmail} onChange={e => set({ rcaEmail: e.target.value })} placeholder="seu.email@junco.com.br" autoComplete="email" />
              </Field>
              <Field label="WhatsApp *" htmlFor="cz-phone">
                <input id="cz-phone" className="input" value={formData.rcaPhone} onChange={handlePhoneChange} placeholder="(XX) XXXXX-XXXX" maxLength={15} inputMode="tel" autoComplete="tel" />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Parceiro e local" icon={<Store size={16} />}>
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Código do parceiro *" htmlFor="cz-partner">
                <input id="cz-partner" className="input" inputMode="numeric" value={formData.partnerCode} onChange={e => set({ partnerCode: e.target.value.replace(/\D/g, '') })} placeholder="Ex: 12345" />
              </Field>
              <Field label="Cidade *" htmlFor="cz-city">
                <div className="relative">
                  <MapPin size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input id="cz-city" className="input pl-8" value={formData.city} onChange={e => set({ city: e.target.value })} placeholder="Nome da cidade" />
                </div>
              </Field>
              <Field label="Regional *" htmlFor="cz-region">
                <OptionSelect id="cz-region" value={formData.region} options={REGIONS} placeholder="Selecione a regional" onChange={region => set({ region })} />
              </Field>
            </div>
          </FormSection>

          <FormSection title="O espaço" icon={<Palette size={16} />}>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Qual o espaço a ser personalizado? *" htmlFor="cz-space">
                <OptionSelect id="cz-space" value={formData.customizationSpace} options={CUSTOMIZATION_SPACES} placeholder="Selecione o espaço" onChange={customizationSpace => set({ customizationSpace })} />
              </Field>
              <Field label="Qual categoria de produtos no espaço? *" htmlFor="cz-category">
                <OptionSelect id="cz-category" value={formData.brandCategory} options={BRAND_CATEGORIES} placeholder="Selecione a categoria" onChange={brandCategory => set({ brandCategory })} />
              </Field>
              <Field label="Localização do espaço dentro da loja *" className="md:col-span-2">
                <OptionButtons ariaLabel="Localização do espaço dentro da loja" value={formData.storeLocation} options={STORE_LOCATIONS} onChange={storeLocation => set({ storeLocation })} />
              </Field>
              <Field label="Fluxo de pessoas no espaço *" className="md:col-span-2">
                <OptionButtons ariaLabel="Fluxo de pessoas no espaço" value={formData.footTraffic} options={FOOT_TRAFFIC_OPTIONS} onChange={footTraffic => set({ footTraffic })} />
              </Field>
              <Field label="Indicação de fornecedor de comunicação visual (opcional)" htmlFor="cz-supplier" className="md:col-span-2"
                hint="Tem algum fornecedor de comunicação visual de confiança na cidade da loja que possamos contatar?">
                <input id="cz-supplier" className="input" value={formData.supplierIndication} onChange={e => set({ supplierIndication: e.target.value })} placeholder="Nome, telefone ou 'sem indicação'" />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Fotos do espaço *" icon={<FileImage size={16} />}>
            <p className="hint mb-3">
              Envie no mínimo {MIN_CUSTOMIZATION_PHOTOS} fotos claras do espaço (como está hoje e uma visão geral do local).{' '}
              <span className={photosOk ? 'badge-ok' : 'badge'}>{formData.spacePhotoUrls.length}/{MIN_CUSTOMIZATION_PHOTOS} mínimo</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {formData.spacePhotoUrls.map((url, idx) => (
                <div key={url + idx} className="relative card-inner overflow-hidden aspect-square">
                  <img src={url} alt={`Foto do espaço ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => set({ spacePhotoUrls: formData.spacePhotoUrls.filter((_, i) => i !== idx) })}
                    aria-label={`Remover foto ${idx + 1}`}
                    className="iconbtn-danger absolute top-1.5 right-1.5 bg-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <label className={`aspect-square flex flex-col items-center justify-center gap-2 border border-dashed border-line rounded bg-paper text-navy cursor-pointer transition-colors duration-150 hover:border-navy ${uploading ? 'opacity-60 cursor-default' : ''}`}>
                <input type="file" accept={acceptAttr(['image'])} multiple onChange={handleFileUpload} className="sr-only" disabled={uploading} />
                {uploading ? <Loader2 size={22} className="animate-spin" /> : <PlusCircle size={22} />}
                <span className="font-condensed font-bold text-[11px] uppercase tracking-[.3px]">{uploading ? 'Enviando...' : 'Adicionar fotos'}</span>
              </label>
            </div>
          </FormSection>

          <div className="flex justify-end mt-6 pt-5 border-t border-line">
            <button onClick={handleCreate} disabled={loading || uploading || !photosOk} className="btn-primary btn-lg w-full md:w-auto">
              {loading ? <><Loader2 size={15} className="animate-spin" /> Enviando...</> : 'Enviar solicitação de personalização'}
            </button>
          </div>
        </>
      )}
    </WizardShell>
  );
};
