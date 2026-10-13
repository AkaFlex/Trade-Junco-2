import React from 'react';
import { TradeRequest, RequestStatus } from '../../types';
import { RESPONSE_SLA_DAYS } from '../../config';

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  degustacao: 'Degustação',
  personalizacao: 'Personalização',
  evento: 'Evento',
  acao_social: 'Ação Social',
};

export const typeOf = (r: Pick<TradeRequest, 'requestType'>) => r.requestType || 'degustacao';

// Personalização/Evento/Ação Social não têm fase de execução nem valor:
// aprovados vão para 'completed' ("aguardando recibo") e saem do fluxo de pagamento PIX.
export const EVENT_LIKE_TYPES = ['personalizacao', 'evento', 'acao_social'];
export const isEventLike = (r: Pick<TradeRequest, 'requestType'>) => EVENT_LIKE_TYPES.includes(typeOf(r));

// Flag só de tela (não gravada): Evento/Ação Social sem resposta após o prazo.
export const isRequestOverdue = (r: TradeRequest): boolean =>
  (r.requestType === 'evento' || r.requestType === 'acao_social') &&
  r.status === 'pending' &&
  (Date.now() - r.createdAt) > RESPONSE_SLA_DAYS * 24 * 60 * 60 * 1000;

export const STATUS_FILTERS: { key: RequestStatus | 'all'; label: string }[] = [
  { key: 'pending', label: 'Pendentes' },
  { key: 'approved', label: 'Em execução' },
  { key: 'completed', label: 'A pagar / recibo' },
  { key: 'paid', label: 'Concluídas' },
  { key: 'blocked_volume', label: 'Bloqueadas' },
  { key: 'expired', label: 'Vencidas' },
  { key: 'rejected', label: 'Recusadas' },
  { key: 'all', label: 'Todas' },
];

const TYPE_STYLES: Record<string, string> = {
  degustacao: 'bg-purple-50 text-purple-junco border-purple-junco/30',
  personalizacao: 'bg-pink-50 text-pink-junco border-pink-junco/30',
  evento: 'bg-orange-50 text-orange-junco border-orange-junco/30',
  acao_social: 'bg-green-50 text-green-800 border-green-junco/50',
};

export const TypeBadge: React.FC<{ request: Pick<TradeRequest, 'requestType'> }> = ({ request }) => {
  const t = typeOf(request);
  return (
    <span className={`inline-block text-[10px] font-condensed font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${TYPE_STYLES[t]}`}>
      {REQUEST_TYPE_LABELS[t]}
    </span>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white border border-line rounded-md ${className}`}>{children}</div>
);

export const SectionTitle: React.FC<{ icon?: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }> = ({ icon, children, right }) => (
  <div className="flex items-center justify-between gap-3 mb-4">
    <h2 className="font-condensed font-bold uppercase tracking-wide text-navy text-lg flex items-center gap-2">{icon}{children}</h2>
    {right}
  </div>
);

export const Field: React.FC<{ label: string; children: React.ReactNode; full?: boolean }> = ({ label, children, full }) => (
  <div className={full ? 'md:col-span-full' : ''}>
    <span className="block text-[11px] font-condensed font-semibold uppercase tracking-wide text-muted mb-1">{label}</span>
    <div className="text-sm text-gray-800 bg-paper border border-line rounded px-3 py-2 break-words">{children || '—'}</div>
  </div>
);

export const formatBRL = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR')}`;

export const formatDateBR = (dateStr?: string) =>
  dateStr ? new Date(`${dateStr}T12:00:00`).toLocaleDateString('pt-BR') : '';

export const matchesSearch = (r: TradeRequest, q: string): boolean => {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [
    r.tradeCode, r.rcaName, r.rcaEmail, r.rcaPhone, r.partnerCode, r.region, r.city,
    r.institutionName, r.adminAssignedSupplier, r.eventLocation, REQUEST_TYPE_LABELS[typeOf(r)],
  ].some(v => v?.toString().toLowerCase().includes(needle));
};
