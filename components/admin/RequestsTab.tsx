import React, { useMemo, useState } from 'react';
import { Search, Eye, Loader2, Check, X, Pencil, RotateCcw, User } from 'lucide-react';
import { TradeRequest, RequestStatus } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { OptionButtons } from '../shared/OptionSelect';
import { Card, TypeBadge, STATUS_FILTERS, REQUEST_TYPE_LABELS, typeOf, isEventLike, isRequestOverdue, matchesSearch, formatBRL, formatDateBR } from './shared';

export interface RequestsFilter {
  status: RequestStatus | 'all';
  type: string;
  search: string;
  overdueOnly: boolean;
}

interface Props {
  requests: TradeRequest[];
  filter: RequestsFilter;
  onFilterChange: (f: RequestsFilter) => void;
  busyId: string | null;
  onOpen: (r: TradeRequest) => void;
  onApprove: (r: TradeRequest) => void;
  onReject: (r: TradeRequest) => void;
  onReopen: (r: TradeRequest) => void;
  onSaveValue: (r: TradeRequest, value: number) => Promise<boolean>;
}

const TYPE_OPTIONS = [{ value: 'all', label: 'Todos os tipos' }, ...Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => ({ value, label }))];

export const RequestsTab: React.FC<Props> = ({ requests, filter, onFilterChange, busyId, onOpen, onApprove, onReject, onReopen, onSaveValue }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const set = (patch: Partial<RequestsFilter>) => onFilterChange({ ...filter, ...patch });

  const searching = filter.search.trim().length > 0;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: requests.length };
    requests.forEach(r => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [requests]);

  const list = useMemo(() => requests.filter(r =>
    // A busca procura em todas as situações, independente do filtro de status.
    (searching || filter.status === 'all' || r.status === filter.status) &&
    (filter.type === 'all' || typeOf(r) === filter.type) &&
    (!filter.overdueOnly || isRequestOverdue(r)) &&
    matchesSearch(r, filter.search.trim())
  ), [requests, filter, searching]);

  const saveValue = async (r: TradeRequest) => {
    if (await onSaveValue(r, Number(editValue))) setEditingId(null);
  };

  return (
    <Card>
      <div className="p-4 md:p-5 border-b border-line space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="search"
            aria-label="Buscar solicitações"
            placeholder="Buscar em todas as solicitações: código, RCA, parceiro, cidade, região, e-mail..."
            className="input pl-8"
            value={filter.search}
            onChange={e => set({ search: e.target.value })}
          />
        </div>

        <div className={`flex flex-wrap gap-2 ${searching ? 'opacity-50' : ''}`} role="group" aria-label="Filtrar por situação">
          {STATUS_FILTERS.map(s => {
            const active = !searching && filter.status === s.key;
            return (
              <button key={s.key} onClick={() => set({ status: s.key, overdueOnly: false })} aria-pressed={active}
                className={`${active ? 'chip chip-active' : 'chip'} flex items-center gap-1.5`}>
                {s.label}
                <span className={`px-1.5 rounded-full text-[10.5px] ${active ? 'bg-yellow-junco text-navy' : 'bg-line text-muted'}`}>{counts[s.key] || 0}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <OptionButtons ariaLabel="Filtrar por tipo" value={filter.type} options={TYPE_OPTIONS} onChange={type => set({ type })} />
          {filter.overdueOnly && (
            <button onClick={() => set({ overdueOnly: false })} className="badge-error cursor-pointer" aria-label="Remover filtro de atrasados">
              Só atrasados <X size={12} />
            </button>
          )}
        </div>
        {searching && <p className="hint">Buscando em todas as situações.</p>}
      </div>

      <div className="overflow-x-auto">
        <table className="table border-x-0 border-b-0">
          <thead>
            <tr>
              <th className="pl-5">Solicitante</th>
              <th>Código</th>
              <th>Tipo / datas</th>
              <th>Parceiro</th>
              <th>Valor</th>
              <th>Situação</th>
              <th className="text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={7} className="empty">Nenhuma solicitação encontrada.</td></tr>
            )}
            {list.map(r => (
              <tr key={r.id}>
                <td className="pl-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-paper border border-line text-navy flex items-center justify-center font-condensed font-bold text-xs shrink-0" aria-hidden="true">
                      {r.rcaName ? r.rcaName.substring(0, 2).toUpperCase() : <User size={14} />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-navy truncate max-w-[180px]">{r.rcaName}</div>
                      <div className="text-[12px] text-muted truncate max-w-[180px]">{r.rcaEmail || r.rcaPhone}</div>
                    </div>
                  </div>
                </td>
                <td className="font-condensed font-bold text-navy whitespace-nowrap">{r.tradeCode || '—'}</td>
                <td className="whitespace-nowrap">
                  <TypeBadge request={r} />
                  <div className="text-[12px] text-muted mt-1">Criado em {new Date(r.createdAt).toLocaleDateString('pt-BR')}</div>
                  {r.dateOfAction && !isEventLike(r) && <div className="text-[12px] text-muted">Ação: {formatDateBR(r.dateOfAction)}</div>}
                  {r.dateOfAction && (r.requestType === 'evento' || r.requestType === 'acao_social') && <div className="text-[12px] text-muted">Evento: {formatDateBR(r.dateOfAction)}</div>}
                </td>
                <td className="whitespace-nowrap">
                  <div className="font-semibold text-navy max-w-[160px] truncate">{r.partnerCode}</div>
                  <div className="text-[12px] text-muted">{r.region}{r.city ? ` · ${r.city}` : ''}</div>
                </td>
                <td className="whitespace-nowrap font-semibold text-navy">
                  {editingId === r.id ? (
                    <div className="flex items-center gap-1 border border-navy rounded p-1 bg-white">
                      <input
                        type="number"
                        aria-label="Novo valor"
                        className="w-20 outline-none text-[13.5px]"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveValue(r); if (e.key === 'Escape') setEditingId(null); }}
                        autoFocus
                      />
                      <button onClick={() => saveValue(r)} aria-label="Salvar valor" className="text-[#5C7A0F] p-1"><Check size={14} /></button>
                      <button onClick={() => setEditingId(null)} aria-label="Cancelar" className="text-pink-junco p-1"><X size={14} /></button>
                    </div>
                  ) : isEventLike(r) ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {formatBRL(r.totalValue)}
                      {r.status === 'pending' && (
                        <button onClick={() => { setEditingId(r.id); setEditValue(String(r.totalValue)); }} aria-label="Editar valor" className="text-muted hover:text-navy">
                          <Pencil size={12} />
                        </button>
                      )}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap"><StatusBadge status={r.status} overdue={isRequestOverdue(r)} requestType={r.requestType} /></td>
                <td className="whitespace-nowrap">
                  <div className="flex justify-center items-center gap-1.5">
                    <button onClick={() => onOpen(r)} aria-label="Ver detalhes" title="Detalhes" className="iconbtn"><Eye size={15} /></button>
                    {r.status === 'pending' && (
                      <>
                        <button onClick={() => onApprove(r)} disabled={busyId === r.id} className="btn-primary px-3 py-1.5">
                          {busyId === r.id ? <Loader2 className="animate-spin" size={13} /> : 'Aprovar'}
                        </button>
                        <button onClick={() => onReject(r)} disabled={busyId === r.id} className="iconbtn-danger px-3 py-1.5 font-condensed font-bold text-[12.5px] uppercase tracking-[.3px]">
                          Recusar
                        </button>
                      </>
                    )}
                    {r.status === 'expired' && (
                      <button onClick={() => onReopen(r)} disabled={busyId === r.id} className="btn px-3 py-1.5">
                        <RotateCcw size={13} /> Reabrir
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length > 0 && (
        <div className="px-5 py-2.5 text-[12px] text-muted text-right border-t border-line">
          {list.length} {list.length === 1 ? 'resultado' : 'resultados'}
        </div>
      )}
    </Card>
  );
};
