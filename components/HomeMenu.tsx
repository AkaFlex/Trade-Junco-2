import React from 'react';
import { UserProfile } from '../types';
import { PlusCircle, ShoppingBag, ClipboardList, ShieldCheck, ArrowRight, Star, PartyPopper } from 'lucide-react';
import { TradeShowcase } from './TradeShowcase';
import { Flow } from '../utils/route';

interface Props {
  user: UserProfile | null;
  onNavigate: (flow: Flow) => void;
}

// Cada área é identificada por uma cor da faixa da marca (borda esquerda), como os cards do Captação de Tendências.
const OPTIONS: { flow: Flow; title: string; text: string; cta: string; icon: React.ReactNode; color: string }[] = [
  { flow: 'request', title: 'Solicitar degustação', text: 'Crie uma nova solicitação de ação promocional para um parceiro.', cta: 'Iniciar', icon: <PlusCircle size={26} />, color: 'border-l-orange-junco' },
  { flow: 'sellout', title: 'Sell-Out (relatório)', text: 'Preencha as vendas diárias usando o código único da ação.', cta: 'Preencher', icon: <ShoppingBag size={26} />, color: 'border-l-pink-junco' },
  { flow: 'reimbursement', title: 'Minhas solicitações', text: 'Acompanhe suas solicitações e envie os comprovantes de reembolso.', cta: 'Acessar', icon: <ClipboardList size={26} />, color: 'border-l-blue-junco' },
  { flow: 'customization', title: 'Solicitar personalização', text: 'Gôndolas, fachada e outros espaços, com fotos e detalhes para a gráfica.', cta: 'Personalizar', icon: <Star size={26} />, color: 'border-l-purple-junco' },
  { flow: 'events', title: 'Solicitação de eventos', text: 'Eventos esportivos ou comerciais e ações sociais com participação da Junco.', cta: 'Solicitar', icon: <PartyPopper size={26} />, color: 'border-l-green-junco' },
];

export const HomeMenu: React.FC<Props> = ({ user, onNavigate }) => (
  <div className="w-full overflow-x-hidden pb-16">
    <div className="page view-in">
      <div className="mb-6">
        <h1 className="page-title">Bem-vindo(a) ao Junco Trade</h1>
        <p className="page-sub">O que você deseja fazer hoje?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {OPTIONS.map(o => (
          <button
            key={o.flow}
            onClick={() => onNavigate(o.flow)}
            className={`card border-l-4 ${o.color} p-5 text-left flex flex-col gap-3 transition-colors duration-150 hover:border-navy group`}
          >
            <span className="text-navy">{o.icon}</span>
            <span className="section-title">{o.title}</span>
            <span className="text-[13.5px] text-muted flex-1">{o.text}</span>
            <span className="font-condensed font-bold text-[12.5px] uppercase tracking-[.3px] text-navy flex items-center gap-1.5">
              {o.cta} <ArrowRight size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>

      {user?.role === 'admin' && (
        <div className="mt-6 pt-6 border-t border-line flex justify-center">
          <button onClick={() => onNavigate('admin')} className="btn-primary btn-lg">
            <ShieldCheck size={18} /> Acessar painel do gestor
          </button>
        </div>
      )}
    </div>

    <TradeShowcase user={user} />
  </div>
);
