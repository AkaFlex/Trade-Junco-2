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
    const v = Number(editValue);
    if (await onSaveValue(r, v)) setEditingId(null);
  };

  return (
    <Card>
      <div className="p-4 md:p-5 border-b border-line space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="search"
            aria-label="Buscar solicitações"
            placeholder="Buscar em todas as solicitações: código, RCA, parceiro, cidade, região, e-mail..."
            className="w-full pl-10 pr-4 py-2.5 border border-line rounded-md text-sm focus:ring-2 focus:ring-navy/30 outline-none bg-paper"
            value={filter.search}
            onChange={e => set({ search: e.target.value })}
          />
        </div>

        <div className={`flex flex-wrap gap-2 ${searching ? 'opacity-50' : ''}`} role="group" aria-label="Filtrar por situação">
          {STATUS_FILTERS.map(s => {
            const active = !searching && filter.status === s.key;
            return (
              <button
                key={s.key}
                onClick={() => set({ status: s.key, overdueOnly: false })}
                aria-pressed={active}
                className={`px-3 py-1.5 rounded-md border text-xs font-condensed font-semibold uppercase tracking-wide flex items-center gap-1.5 ${active ? 'bg-navy text-white border-navy' : 'bg-white text-gray-700 border-line hover:bg-paper'}`}
              >
                {s.label}
                <span className={`px-1.5 rounded text-[10px] ${active ? 'bg-white/20' : 'bg-paper text-muted'}`}>{counts[s.key] || 0}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <OptionButtons ariaLabel="Filtrar por tipo" value={filter.type} options={TYPE_OPTIONS} onChange={type => set({ type })} />
          {filter.overdueOnly && (
            <button onClick={() => set({ overdueOnly: false })} className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 flex items-center gap-1">
              Só atrasados <X size={12} />
            </button>
          )}
        </div>
        {searching && <p className="text-xs text-muted">Buscando em todas as situações.</p>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-paper text-muted uppercase text-[11px] font-condensed font-semibold tracking-wide border-b border-line">
            <tr>
              <th className="p-3 pl-5">Solicitante</th>
              <th className="p-3">Código</th>
              <th className="p-3">Tipo / Datas</th>
              <th className="p-3">Parceiro</th>
              <th className="p-3">Valor</th>
              <th className="p-3">Situação</th>
              <th className="p-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.length === 0 && (
              <tr><td colSpan={7} className="py-14 text-center text-muted">Nenhuma solicitação encontrada.</td></tr>
            )}
            {list.map(r => (
              <tr key={r.id} className="hover:bg-paper">
                <td className="p-3 pl-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-paper border border-line text-navy flex items-center justify-center font-bold text-xs shrink-0" aria-hidden="true">
                      {r.rcaName ? r.rcaName.substring(0, 2).toUpperCase() : <User size={14} />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800 truncate max-w-[180px]">{r.rcaName}</div>
                      <div className="text-xs text-muted truncate max-w-[180px]">{r.rcaEmail || r.rcaPhone}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3 font-condensed font-bold text-purple-junco whitespace-nowrap">{r.tradeCode || '—'}</td>
                <td className="p-3 whitespace-nowrap">
                  <TypeBadge request={r} />
                  <div className="text-xs text-gray-600 mt-1">Criado em {new Date(r.createdAt).toLocaleDateString('pt-BR')}</div>
                  {r.dateOfAction && !isEventLike(r) && <div className="text-xs text-gray-600">Ação: {formatDateBR(r.dateOfAction)}</div>}
                  {r.dateOfAction && (r.requestType === 'evento' || r.requestType === 'acao_social') && <div className="text-xs text-gray-600">Evento: {formatDateBR(r.dateOfAction)}</div>}
                </td>
                <td className="p-3 whitespace-nowrap">
                  <div className="font-semibold text-gray-800 max-w-[160px] truncate">{r.partnerCode}</div>
                  <div className="text-xs text-muted">{r.region}{r.city ? ` · ${r.city}` : ''}</div>
                </td>
                <td className="p-3 whitespace-nowrap font-semibold text-gray-800">
                  {editingId === r.id ? (
                    <div className="flex items-center gap-1 border border-line rounded p-1 bg-white">
                      <input
                        type="number"
                        aria-label="Novo valor"
                        className="w-20 outline-none text-sm"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveValue(r); if (e.key === 'Escape') setEditingId(null); }}
                        autoFocus
                      />
                      <button onClick={() => saveValue(r)} aria-label="Salvar valor" className="text-green-700 p-1"><Check size={14} /></button>
                      <button onClick={() => setEditingId(null)} aria-label="Cancelar" className="text-red-600 p-1"><X size={14} /></button>
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
                <td className="p-3 whitespace-nowrap"><StatusBadge status={r.status} overdue={isRequestOverdue(r)} requestType={r.requestType} /></td>
                <td className="p-3 whitespace-nowrap">
                  <div className="flex justify-center items-center gap-2">
                    <button onClick={() => onOpen(r)} aria-label="Ver detalhes" title="Detalhes" className="text-muted hover:text-navy p-2 rounded hover:bg-paper"><Eye size={18} /></button>
                    {r.status === 'pending' && (
                      <>
                        <button onClick={() => onApprove(r)} disabled={busyId === r.id} className="bg-green-700 text-white px-2.5 py-1 rounded text-xs font-bold hover:bg-green-800 disabled:opacity-50">
                          {busyId === r.id ? <Loader2 className="animate-spin" size={12} /> : 'Aprovar'}
                        </button>
                        <button onClick={() => onReject(r)} disabled={busyId === r.id} className="bg-white text-red-700 border border-red-300 px-2.5 py-1 rounded text-xs font-bold hover:bg-red-50">
                          Recusar
                        </button>
                      </>
                    )}
                    {r.status === 'expired' && (
                      <button onClick={() => onReopen(r)} disabled={busyId === r.id} className="bg-white text-navy border border-line px-2.5 py-1 rounded text-xs font-bold hover:bg-paper flex items-center gap-1 disabled:opacity-50">
                        <RotateCcw size={12} /> Reabrir
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
        <div className="px-5 py-2.5 border-t border-line text-xs text-muted text-right">
          {list.length} {list.length === 1 ? 'resultado' : 'resultados'}
        </div>
      )}
    </Card>
  );
};
