import React from 'react';
import { CheckCircle, Copy, X } from 'lucide-react';
import { useToast } from './Toast';

// Moldura comum dos formulários de solicitação (padrão Junco: card branco, borda 1px, cabeçalho com título condensado).

export const WizardShell: React.FC<{ title: string; icon?: React.ReactNode; onClose?: () => void; children: React.ReactNode }> = ({ title, icon, onClose, children }) => (
  <div className="page-narrow view-in">
    <div className="card">
      <div className="card-head flex items-center justify-between gap-3">
        <h1 className="page-title text-xl flex items-center gap-2">{icon}{title}</h1>
        {onClose && <button onClick={onClose} className="btn"><X size={15} /> Fechar</button>}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </div>
  </div>
);

export const FormSection: React.FC<{ title?: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className = '' }) => (
  <section className={`pt-5 mt-5 border-t border-line first:pt-0 first:mt-0 first:border-t-0 ${className}`}>
    {title && <h2 className="section-title flex items-center gap-2 mb-3">{icon}{title}</h2>}
    {children}
  </section>
);

export const Field: React.FC<{ label: string; htmlFor?: string; hint?: string; children: React.ReactNode; className?: string }> = ({ label, htmlFor, hint, children, className = '' }) => (
  <div className={className}>
    {htmlFor ? <label htmlFor={htmlFor} className="label">{label}</label> : <span className="label">{label}</span>}
    {children}
    {hint && <p className="hint mt-1">{hint}</p>}
  </div>
);

/** Pergunta de pré-requisito com respostas SIM/NÃO. */
export const GateQuestion: React.FC<{ question: React.ReactNode; onYes: () => void; onNo: () => void; noSelected?: boolean; children?: React.ReactNode }> = ({ question, onYes, onNo, noSelected, children }) => (
  <div className="max-w-xl mx-auto text-center space-y-5 py-4">
    <p className="text-[16px] text-navy font-semibold">{question}</p>
    <div className="flex justify-center gap-3">
      <button onClick={onNo} className={noSelected ? 'btn-danger w-32' : 'btn w-32'} aria-pressed={noSelected}>Não</button>
      <button onClick={onYes} className="btn-primary w-32">Sim</button>
    </div>
    {children}
  </div>
);

export const SuccessScreen: React.FC<{ title: string; text: string; code: string; onDone: () => void; extra?: React.ReactNode }> = ({ title, text, code, onDone, extra }) => {
  const toast = useToast();
  return (
    <div className="text-center py-6 max-w-lg mx-auto">
      <CheckCircle size={44} className="mx-auto text-[#5C7A0F] mb-3" />
      <h2 className="page-title mb-1">{title}</h2>
      <p className="text-[13.5px] text-muted mb-6">{text}</p>
      <div className="card-inner p-5 mb-6">
        <p className="label">Código único</p>
        <div className="flex items-center justify-center gap-3">
          <span className="font-condensed font-black text-3xl tracking-widest text-navy select-all">{code}</span>
          <button onClick={() => { navigator.clipboard.writeText(code); toast.success('Código copiado!'); }} className="iconbtn" aria-label="Copiar código"><Copy size={16} /></button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        {extra}
        <button onClick={onDone} className="btn-primary">Voltar ao início</button>
      </div>
    </div>
  );
};
