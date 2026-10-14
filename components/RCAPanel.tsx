
import React, { useState, useEffect } from 'react';
import { TradeRequest, UserProfile } from '../types';
import { getRequestByTradeCode } from '../services/tradeService';
import { ExecutionView } from './ExecutionView';
import { StatusBadge } from './shared/StatusBadge';
import { FileText, AlertCircle, Search, FileSpreadsheet, Eye, Calendar } from 'lucide-react';
import { useToast } from './shared/Toast';
import { TypeBadge, isEventLike, formatDateBR } from './admin/shared';

interface Props {
  user: UserProfile | null;
}

export const RCAPanel: React.FC<Props> = ({ user }) => {
  const toast = useToast();
  const [requests, setRequests] = useState<TradeRequest[]>([]);
  const [mode, setMode] = useState<'list' | 'execution'>('list');
  const [selectedRequest, setSelectedRequest] = useState<TradeRequest | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  useEffect(() => {
    const savedQuery = localStorage.getItem('junco_rca_search');
    if (savedQuery) {
      setSearchQuery(savedQuery);
    }
  }, []);

  const fetchRequests = async (query: string) => {
    if (!query) return;
    setLoadingSearch(true);
    localStorage.setItem('junco_rca_search', query.trim());
    
    try {
      const data = await getRequestByTradeCode(query);
      setRequests(data ? [data] : []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao buscar solicitações");
    } finally {
      setSearched(true);
      setLoadingSearch(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchRequests(searchQuery);
  };

  const handleOpenExecution = (req: TradeRequest) => {
    setSelectedRequest(req);
    setMode('execution');
  };

  if (mode === 'execution' && selectedRequest) {
    return <ExecutionView request={selectedRequest} onBack={() => setMode('list')} />;
  }

  return (
    <div className="page-narrow view-in space-y-4">
      <div>
        <h1 className="page-title">Minhas solicitações</h1>
        <p className="page-sub">Acompanhe suas solicitações e envie os dados do reembolso.</p>
      </div>

      <form onSubmit={handleSearch} className="card p-4">
        <label htmlFor="rca-code" className="label">Código da ação</label>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            id="rca-code"
            type="text"
            placeholder="Ex: TJ-7KQ4M9X2PA"
            className="input md:flex-1 uppercase font-semibold text-[15px]"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoCapitalize="characters"
          />
          <button type="submit" disabled={loadingSearch} className="btn-primary">
            <Search size={16} /> {loadingSearch ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
        <p className="hint mt-2">Por segurança, a busca é feita só pelo código recebido ao criar a solicitação.</p>
      </form>

      {!searched ? (
        <div className="card empty">Use a busca acima para encontrar sua solicitação.</div>
      ) : requests.length === 0 ? (
        <div className="card empty">Nenhuma solicitação encontrada para <strong className="text-navy">{searchQuery}</strong>.</div>
      ) : (
        requests.map(req => (
          <div key={req.id} className="card p-5 view-in">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-condensed font-black text-xl text-navy">{req.tradeCode || 'Sem código'}</span>
                  <TypeBadge request={req} />
                  <span className="badge">{req.region}</span>
                </div>
                <p className="text-[13.5px] text-navy">Parceiro: <strong>{req.partnerCode}</strong></p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
                  {(req.requestType === 'evento' || req.requestType === 'acao_social') ? (
                    <>
                      <span className="flex items-center gap-1.5"><Calendar size={14} /> {formatDateBR(req.dateOfAction)}</span>
                      <span>Local: {req.eventLocation || '—'}</span>
                      <span>Horário: {req.eventTime || '—'}</span>
                    </>
                  ) : req.requestType === 'personalizacao' ? (
                    <>
                      <span>Espaço: {req.customizationSpace}</span>
                      <span>Categoria: {req.brandCategory}</span>
                    </>
                  ) : (
                    <>
                      <span className="flex items-center gap-1.5"><FileSpreadsheet size={14} /> Pedido: {formatDateBR(req.orderDate) || '—'}</span>
                      <span className="flex items-center gap-1.5"><Calendar size={14} /> Ação: {formatDateBR(req.dateOfAction)}</span>
                      <span>{req.days} dia(s)</span>
                    </>
                  )}
                </div>

                {req.rejectionReason && (
                  <div className={req.status === 'rejected' ? 'notice-error' : 'notice'}>
                    <AlertCircle size={14} className="inline mr-1.5 -mt-0.5" /><strong>Motivo:</strong> {req.rejectionReason}
                  </div>
                )}
              </div>

              <div className="flex flex-row md:flex-col items-center md:items-end gap-3 w-full md:w-auto justify-between">
                <StatusBadge status={req.status} variant="rca" requestType={req.requestType} />
                {(req.status === 'approved' || req.status === 'completed') && !isEventLike(req) && (
                  <button onClick={() => handleOpenExecution(req)} className={req.status === 'approved' ? 'btn-primary' : 'btn'}>
                    {req.status === 'approved' ? <><FileText size={15} /> Solicitar reembolso</> : <><Eye size={15} /> Ver resumo</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
