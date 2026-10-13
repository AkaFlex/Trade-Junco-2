import React from 'react';
import { Clock, PlayCircle, XCircle, FileText, CheckCircle, Ban, ArchiveX, Check, Receipt } from 'lucide-react';

type Variant = 'admin' | 'rca';

interface Props {
  status: string;
  variant?: Variant;
  overdue?: boolean;
  /** Personalização/Evento/Ação Social não têm pagamento PIX: mudam os rótulos de completed/paid. */
  requestType?: string;
}

const EVENT_LIKE = ['personalizacao', 'evento', 'acao_social'];

export const StatusBadge: React.FC<Props> = ({ status, variant = 'admin', overdue = false, requestType }) => {
  const eventLike = EVENT_LIKE.includes(requestType || '');

  const styles: Record<string, string> = {
    pending:        'bg-yellow-50 text-yellow-800 border-yellow-300',
    approved:       'bg-blue-50 text-blue-text border-blue-junco/40',
    rejected:       'bg-red-50 text-red-700 border-red-300',
    completed:      'bg-purple-50 text-purple-junco border-purple-junco/40',
    paid:           variant === 'rca' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-emerald-50 text-emerald-700 border-emerald-300',
    blocked_volume: 'bg-gray-100 text-gray-600 border-gray-300',
    expired:        'bg-gray-700 text-white border-gray-700',
  };

  const labels: Record<string, React.ReactNode> = {
    pending:  <><Clock size={14} className="mr-1.5" /> Aguardando Aprovação</>,
    approved: variant === 'admin'
                ? <><PlayCircle size={14} className="mr-1.5" /> Em Execução</>
                : <><CheckCircle size={14} className="mr-1.5" /> Aprovado</>,
    rejected: <><XCircle size={14} className="mr-1.5" /> Recusado</>,
    completed: eventLike
                ? (variant === 'admin'
                    ? <><Receipt size={14} className="mr-1.5" /> Aprovado · aguardando recibo</>
                    : <><CheckCircle size={14} className="mr-1.5" /> Aprovado</>)
                : <><FileText size={14} className="mr-1.5" /> Aguardando Pagamento</>,
    paid: eventLike
                ? <><CheckCircle size={14} className="mr-1.5" /> Concluído</>
                : (variant === 'admin'
                    ? <><CheckCircle size={14} className="mr-1.5" /> Pago / Finalizado</>
                    : <><Check size={16} strokeWidth={3} className="mr-1.5" /> PAGO</>),
    blocked_volume: <><Ban size={14} className="mr-1.5" /> Bloqueado (Volume)</>,
    expired: <><ArchiveX size={14} className="mr-1.5" /> {variant === 'rca' ? 'Prazo Expirado' : 'Vencido / Expirado'}</>,
  };

  const baseClass = variant === 'rca'
    ? 'flex items-center px-3 py-1.5 rounded-md text-xs font-bold border'
    : 'inline-flex items-center px-2.5 py-1 rounded text-xs font-bold border whitespace-nowrap';

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`${baseClass} ${styles[status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
        {labels[status] ?? status}
      </span>
      {overdue && (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-600 text-white whitespace-nowrap">
          ⏰ Atrasado
        </span>
      )}
    </span>
  );
};
