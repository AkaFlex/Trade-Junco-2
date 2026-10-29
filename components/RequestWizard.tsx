
import React, { useState } from 'react';
import { UserProfile, REGIONS, Region } from '../types';
import { createRequest } from '../services/tradeService';
import { generateTradeCode } from '../services/tradeCode';
import { todayLocal } from '../utils/date';
import { selloutLink } from '../utils/route';
import { OptionSelect } from './shared/OptionSelect';
import { DAILY_RATE, MAX_ACTION_DAYS, MIN_LEAD_DAYS, MIN_DOCERIA_VOLUME } from '../config';
import { AlertTriangle, Ban, AlertCircle, User, Calendar, Clock, Store, FileSpreadsheet, CheckCircle, Link2, PlusCircle } from 'lucide-react';
import { WizardShell, FormSection, Field, GateQuestion, SuccessScreen, ReviewScreen } from './shared/Wizard';
import { useToast } from './shared/Toast';
import { LinkQR } from './shared/LinkQR';

interface Props {
  user: UserProfile | null;
  onCancel: () => void;
  onSuccess: (tradeCode: string) => void;
}

export const RequestWizard: React.FC<Props> = ({ user, onCancel, onSuccess }) => {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [reviewing, setReviewing] = useState(false);
  
  const [materialStatus, setMaterialStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [volumeStatus, setVolumeStatus] = useState<'pending' | 'success' | 'failed'>('pending');

  const [formData, setFormData] = useState({
    rcaName: '',
    rcaEmail: '',
    rcaPhone: '',
    partnerCode: '',
    orderDate: '', // Data do Pedido
    date: '',      // Data da Ação
    region: REGIONS[0] as Region,
    days: 1,
    justification: '',
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    setFormData({ ...formData, rcaPhone: value });
  };

  // SILENT BLOCKING LOGIC
  const triggerSilentBlock = async () => {
    if (!formData.rcaName || !formData.rcaEmail) {
        toast.warning("Por favor, preencha seus dados de contato antes de responder.");
        return;
    }

    const date = todayLocal();
    const partner = "Não Informado"; // Bloqueio na etapa inicial
    const region = formData.region; // Default region
    const tradeCode = generateTradeCode();

    try {
      setLoading(true);
      await createRequest({
       uid: user?.uid || 'guest',
       tradeCode,
       rcaName: formData.rcaName,
       rcaEmail: formData.rcaEmail.trim().toLowerCase(),
       rcaPhone: formData.rcaPhone,
       createdAt: Date.now(),
       partnerCode: partner,
       region: region,
       dateOfAction: date,
       days: 0,
       totalValue: 0,
       status: 'blocked_volume',
       rejectionReason: `Volume de Doceria abaixo de R$ ${MIN_DOCERIA_VOLUME.toLocaleString('pt-BR')} (Auto-bloqueio inicial)`
      });
      setVolumeStatus('failed');
    } catch (err) {
      console.error("Silent block failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (confirmed = false) => {
    // 1. STRICT VALIDATION
    if (!formData.rcaName.trim()) return toast.warning("Nome do RCA é obrigatório.");
    if (!formData.rcaEmail.trim()) return toast.warning("E-mail do RCA é obrigatório.");
    if (!formData.rcaPhone.trim()) return toast.warning("Telefone do RCA é obrigatório.");
    
    if (!formData.partnerCode.trim()) return toast.warning("Código do Parceiro é obrigatório.");
    if (!formData.region) return toast.warning("Região é obrigatória.");
    
    if (!formData.orderDate) return toast.warning("Data do Pedido é obrigatória.");
    if (!formData.date) return toast.warning("Data da Ação é obrigatória.");
    
    if (!Number.isInteger(formData.days) || formData.days < 1 || formData.days > MAX_ACTION_DAYS) {
      return toast.warning(`Dias de ação: informe um número inteiro de 1 a ${MAX_ACTION_DAYS}.`);
    }
    
    // Justification Check
    if (formData.days > 1 && !formData.justification.trim()) {
        return toast.warning("Para ações com mais de 1 dia, a justificativa é obrigatória.");
    }

    // 2. 7-DAY LOCK CHECK (A partir da data atual)
    const [actionYear, actionMonth, actionDay] = formData.date.split('-').map(Number);
    const actionDate = new Date(actionYear, actionMonth - 1, actionDay, 0, 0, 0);

    const today = new Date();
    today.setHours(0,0,0,0); // Zera as horas para comparar apenas os dias

    const minDate = new Date(today.getTime());
    minDate.setDate(minDate.getDate() + MIN_LEAD_DAYS);

    if (actionDate.getTime() < minDate.getTime()) {
        toast.error(`A Data da Ação deve ser agendada com no mínimo ${MIN_LEAD_DAYS} dias de antecedência (a partir de hoje).`);
        return;
    }

    if (!confirmed) { setReviewing(true); return; }

    setLoading(true);
    try {
      const tradeCode = generateTradeCode();

      const req = {
        uid: user?.uid || 'guest',
        tradeCode,
        rcaName: formData.rcaName,
        rcaEmail: formData.rcaEmail.trim().toLowerCase(),
        rcaPhone: formData.rcaPhone,
        createdAt: Date.now(),
        partnerCode: formData.partnerCode,
        region: formData.region,
        orderDate: formData.orderDate, // Data do Pedido
        dateOfAction: formData.date,   // Data da Ação
        days: formData.days,
        justification: formData.justification,
        totalValue: formData.days * DAILY_RATE, // Calculated but hidden from RCA
        status: 'pending' as const,
      };

      await createRequest(req);
      setGeneratedCode(tradeCode);
      setStep(3); // Go to success step
    } catch (e) {
      console.error(e);
      toast.error("Erro ao criar solicitação.");
    } finally {
      setLoading(false);
    }
  };

  const set = (patch: Partial<typeof formData>) => setFormData({ ...formData, ...patch });

  if (step === 3) {
    return (
      <WizardShell title="Solicitar degustação" icon={<PlusCircle size={20} />}>
        <SuccessScreen
          title="Ação solicitada!"
          text="Sua solicitação foi enviada para aprovação do gestor. Guarde o código: ele é usado pela degustadora e no seu reembolso."
          code={generatedCode}
          onDone={() => onSuccess(generatedCode)}
          extra={<>
            <LinkQR link={selloutLink(generatedCode)} />
            <button
              className="btn"
              onClick={() => {
                navigator.clipboard.writeText(selloutLink(generatedCode));
                toast.success('Link copiado!', 'Envie para a degustadora: abre o Sell-Out já com o código (vale após a aprovação).');
              }}
            >
              <Link2 size={15} /> Copiar link do Sell-Out
            </button>
          </>}
        />
      </WizardShell>
    );
  }

  const fmt = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');

  if (reviewing) {
    return (
      <WizardShell title="Solicitar degustação" icon={<PlusCircle size={20} />} onClose={onCancel}>
        <ReviewScreen
          confirmLabel="Confirmar e enviar"
          loading={loading}
          onEdit={() => setReviewing(false)}
          onConfirm={() => handleCreate(true)}
          rows={[
            { label: 'Nome', value: formData.rcaName },
            { label: 'E-mail', value: formData.rcaEmail },
            { label: 'WhatsApp', value: formData.rcaPhone },
            { label: 'Código do parceiro', value: formData.partnerCode },
            { label: 'Região', value: formData.region },
            { label: 'Data do pedido', value: fmt(formData.orderDate) },
            { label: 'Data da ação', value: fmt(formData.date) },
            { label: 'Dias de ação', value: String(formData.days) },
            { label: 'Justificativa', value: formData.justification },
          ]}
        />
      </WizardShell>
    );
  }

  return (
    <WizardShell title="Solicitar degustação" icon={<PlusCircle size={20} />} onClose={onCancel}>
      {step === 1 && (
        <GateQuestion
          question={<>Você possui a <strong>bandeja</strong> e o <strong>avental</strong> oficiais de degustação?</>}
          onNo={() => setMaterialStatus('failed')}
          onYes={() => { setMaterialStatus('success'); setStep(2); }}
          noSelected={materialStatus === 'failed'}
        >
          {materialStatus === 'failed' && (
            <div className="notice-warn text-left" role="alert">
              <p className="font-semibold flex items-center gap-2 mb-1"><AlertTriangle size={16} /> Solicite o material antes</p>
              <p>Peça a bandeja e o avental no sistema <strong>Vidya</strong>, vinculando <strong>CONCESSÃO PROMOÇÃO (TOP. 241)</strong> no pedido:</p>
              <ul className="list-disc ml-5 mt-1 font-semibold">
                <li>Cód. 199307 – Avental degustação</li>
                <li>Cód. 291765 – Bandeja degustação</li>
              </ul>
            </div>
          )}
        </GateQuestion>
      )}

      {step === 2 && volumeStatus === 'failed' && (
        <div className="text-center py-8 max-w-md mx-auto">
          <Ban size={40} className="mx-auto text-pink-junco mb-3" />
          <h2 className="section-title mb-2">Ação indisponível</h2>
          <p className="text-[13.5px] text-muted mb-6">O volume de compras em Doceria do parceiro é insuficiente para ações de Trade Marketing neste momento.</p>
          <button onClick={onCancel} className="btn">Voltar ao início</button>
        </div>
      )}

      {step === 2 && volumeStatus !== 'failed' && (
        <>
          <FormSection title="Dados do solicitante" icon={<User size={16} />}>
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Nome completo *" htmlFor="rw-name">
                <input id="rw-name" className="input" value={formData.rcaName} onChange={e => set({ rcaName: e.target.value })} placeholder="Seu nome" autoComplete="name" />
              </Field>
              <Field label="E-mail *" htmlFor="rw-email">
                <input id="rw-email" type="email" className="input" value={formData.rcaEmail} onChange={e => set({ rcaEmail: e.target.value })} placeholder="seu.email@junco.com.br" autoComplete="email" />
              </Field>
              <Field label="WhatsApp *" htmlFor="rw-phone">
                <input id="rw-phone" className="input" value={formData.rcaPhone} onChange={handlePhoneChange} placeholder="(XX) XXXXX-XXXX" maxLength={15} inputMode="tel" autoComplete="tel" />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Validação de volume" icon={<AlertCircle size={16} />}>
            <div className="notice-warn mb-3">
              Este parceiro comprou <strong>R$ {MIN_DOCERIA_VOLUME.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> ou mais em produtos da categoria <strong>DOCERIA</strong> no mês da ação?
            </div>
            <div className="flex gap-3">
              <button onClick={triggerSilentBlock} disabled={loading} className="btn flex-1">Não</button>
              <button onClick={() => setVolumeStatus('success')} className={volumeStatus === 'success' ? 'btn-primary flex-1' : 'btn flex-1'} aria-pressed={volumeStatus === 'success'}>
                {volumeStatus === 'success' && <CheckCircle size={15} />} Sim
              </button>
            </div>
          </FormSection>

          {volumeStatus === 'success' && (
            <FormSection title="Detalhes da ação" icon={<Calendar size={16} />} className="view-in">
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Código do parceiro *" htmlFor="rw-partner">
                  <div className="relative">
                    <Store size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input id="rw-partner" className="input pl-8" value={formData.partnerCode} onChange={e => set({ partnerCode: e.target.value })} placeholder="000000" />
                  </div>
                </Field>
                <Field label="Região *" htmlFor="rw-region">
                  <OptionSelect id="rw-region" value={formData.region} options={REGIONS} onChange={region => set({ region })} />
                </Field>
                <Field label="Data do pedido de doces *" htmlFor="rw-order">
                  <div className="relative">
                    <FileSpreadsheet size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input id="rw-order" type="date" className="input pl-8" value={formData.orderDate} onChange={e => set({ orderDate: e.target.value })} />
                  </div>
                </Field>
                <Field label="Data prevista da ação *" htmlFor="rw-date" hint={`Mínimo de ${MIN_LEAD_DAYS} dias de antecedência.`}>
                  <div className="relative">
                    <Clock size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input id="rw-date" type="date" className="input pl-8" value={formData.date} onChange={e => set({ date: e.target.value })} />
                  </div>
                </Field>
                <Field label="Dias de ação *" htmlFor="rw-days" hint={`De 1 a ${MAX_ACTION_DAYS} dias.`}>
                  <input
                    id="rw-days" type="number" min="1" max={MAX_ACTION_DAYS} step="1" className="input"
                    value={formData.days}
                    onChange={e => set({ days: Math.min(MAX_ACTION_DAYS, Math.max(1, Math.trunc(Number(e.target.value) || 1))) })}
                  />
                </Field>
                {formData.days > 1 && (
                  <Field label="Justificativa (mais de 1 dia) *" htmlFor="rw-just" className="md:col-span-2">
                    <textarea id="rw-just" className="input" rows={3} placeholder="Descreva o motivo da ação estendida..." value={formData.justification} onChange={e => set({ justification: e.target.value })} />
                  </Field>
                )}
              </div>
              <div className="flex justify-end mt-5">
                <button onClick={() => handleCreate()} disabled={loading} className="btn-primary btn-lg w-full md:w-auto">
                  Revisar e finalizar
                </button>
              </div>
            </FormSection>
          )}
        </>
      )}
    </WizardShell>
  );
};
