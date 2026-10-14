import React from 'react';
import { Clock, PlayCircle, XCircle, FileText, CheckCircle, Ban, ArchiveX, Receipt, AlarmClock } from 'lucide-react';

type Variant = 'admin' | 'rca';

interface Props {
  status: string;
  variant?: Variant;
  overdue?: boolean;
  /** Personalização/Evento/Ação Social não têm pagamento PIX: mudam os rótulos de completed/paid. */
  requestType?: string;
}

const EVENT_LIKE = ['personalizacao', 'evento', 'acao_social'];

// Pílulas do padrão Junco (raio 20px, maiúsculas) com ícone + texto: a cor nunca é o único sinal.
export const StatusBadge: React.FC<Props> = ({ status, variant = 'admin', overdue = false, requestType }) => {
  const eventLike = EVENT_LIKE.includes(requestType || '');
  const big = variant === 'rca' ? ' text-[11.5px] px-3 py-1' : '';

  const map: Record<string, [string, React.ReactNode, string]> = {
    pending:        ['badge-warn', <Clock size={12} />, 'Aguardando aprovação'],
    approved:       ['badge-info', variant === 'admin' ? <PlayCircle size={12} /> : <CheckCircle size={12} />, variant === 'admin' ? 'Em execução' : 'Aprovado'],
    rejected:       ['badge-error', <XCircle size={12} />, 'Recusado'],
    completed:      eventLike
                      ? ['badge-highlight', <Receipt size={12} />, variant === 'admin' ? 'Aprovado · aguardando recibo' : 'Aprovado']
                      : ['badge-highlight', <FileText size={12} />, 'Aguardando pagamento'],
    paid:           ['badge-ok', <CheckCircle size={12} />, eventLike ? 'Concluído' : variant === 'admin' ? 'Pago / finalizado' : 'Pago'],
    blocked_volume: ['badge', <Ban size={12} />, 'Bloqueado (volume)'],
    expired:        ['badge-dark', <ArchiveX size={12} />, variant === 'rca' ? 'Prazo expirado' : 'Vencido'],
  };

  const [cls, icon, label] = map[status] || ['badge', null, status];

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className={cls + big}>{icon}{label}</span>
      {overdue && <span className={'badge-error' + big}><AlarmClock size={12} />Atrasado</span>}
    </span>
  );
};
