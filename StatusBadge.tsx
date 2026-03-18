
import React from 'react';
import { Clock, PlayCircle, XCircle, FileText, CheckCircle, Ban, ArchiveX, Check } from 'lucide-react';

type Variant = 'admin' | 'rca';

interface Props {
  status: string;
  variant?: Variant;
}

/**
 * Shared StatusBadge component.
 * - variant="admin" (default): smaller, table-friendly style
 * - variant="rca": larger, card-friendly style with stronger paid badge
 */
export const StatusBadge: React.FC<Props> = ({ status, variant = 'admin' }) => {
  const adminStyles: Record<string, string> = {
    pending:       'bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-100',
    approved:      'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-100',
    rejected:      'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100',
    completed:     'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-100',
    paid:          'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100',
    blocked_volume:'bg-gray-100 text-gray-600 border-gray-200 ring-1 ring-gray-100',
    expired:       'bg-gray-700 text-white border-gray-600 ring-1 ring-gray-500',
  };

  const rcaStyles: Record<string, string> = {
    pending:       'bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-100',
    approved:      'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-100',
    rejected:      'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100',
    completed:     'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-100',
    paid:          'bg-emerald-600 text-white border-emerald-700 shadow-md ring-1 ring-emerald-600',
    blocked_volume:'bg-gray-100 text-gray-600 border-gray-200 ring-1 ring-gray-100',
    expired:       'bg-gray-700 text-white border-gray-600 ring-1 ring-gray-500',
  };

  const labels: Record<string, React.ReactNode> = {
    pending:       <><Clock size={14} className="mr-1.5"/> Aguardando Aprovação</>,
    approved:      variant === 'admin'
                     ? <><PlayCircle size={14} className="mr-1.5"/> Em Execução</>
                     : <><CheckCircle size={14} className="mr-1.5"/> Aprovado</>,
    rejected:      <><XCircle size={14} className="mr-1.5"/> Recusado</>,
    completed:     <><FileText size={14} className="mr-1.5"/> Aguardando Pagamento</>,
    paid:          variant === 'admin'
                     ? <><CheckCircle size={14} className="mr-1.5"/> Pago / Finalizado</>
                     : <><Check size={16} strokeWidth={3} className="mr-1.5"/> PAGO</>,
    blocked_volume:<><Ban size={14} className="mr-1.5"/> Bloqueado (Volume)</>,
    expired:       <><ArchiveX size={14} className="mr-1.5"/> {variant === 'rca' ? 'Prazo Expirado' : 'Vencido / Expirado'}</>,
  };

  const styles = variant === 'rca' ? rcaStyles : adminStyles;
  const baseClass = variant === 'rca'
    ? 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border'
    : 'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border whitespace-nowrap';

  return (
    <span className={`${baseClass} ${styles[status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
      {labels[status] ?? status}
    </span>
  );
};
