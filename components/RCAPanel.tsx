
import React, { useState, useEffect } from 'react';
import { TradeRequest, UserProfile } from '../types';
import { getRequestsByUser, getRequestByTradeCode } from '../services/tradeService';
import { ExecutionView } from './ExecutionView';
import { StatusBadge } from './shared/StatusBadge';
import { FileText, AlertCircle, Clock, Search, FileSpreadsheet, Eye, Calendar } from 'lucide-react';
import { useToast } from './shared/Toast';

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
      if (query.includes('@')) {
        const data = await getRequestsByUser(query.trim());
        setRequests(data.sort((a, b) => b.createdAt - a.createdAt));
      } else {
        const data = await getRequestByTradeCode(query.trim());
        setRequests(data ? [data] : []);
      }
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
    <div className="p-4 md:p-8 max-w-5xl mx-auto animate-in fade-in duration-500">

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-900 rounded-3xl p-6 md:p-8 text-white shadow-xl mb-10 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <div className="text-center md:text-left relative z-10">
          <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Reembolsos & Histórico</h1>
          <p className="text-purple-100 opacity-90 text-sm md:text-base">Acompanhe suas solicitações e envie os dados do Reembolso Financeiro.</p>
        </div>
      </div>

      {/* History Search Section */}
      <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4 text-gray-700">
          <Search className="text-purple-600" />
          <h2 className="text-lg font-bold">Localizar Solicitação</h2>
        </div>
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="E-mail ou Código da Ação (Ex: TJ-A1B2)"
            className="flex-1 border-2 border-gray-100 bg-gray-50 p-4 rounded-xl focus:ring-2 focus:ring-purple-600 focus:bg-white outline-none font-bold text-gray-700 transition"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button type="submit" disabled={loadingSearch} className="bg-gray-900 text-white px-8 py-4 rounded-xl hover:bg-black transition font-bold flex items-center justify-center gap-2 disabled:opacity-60">
            <Search size={20} /> {loadingSearch ? 'Buscando...' : 'BUSCAR'}
          </button>
        </form>
        {searched && requests.length > 0 && (
          <p className="text-xs text-gray-400 mt-3 font-medium">Mostrando {requests.length} solicitação(ões) encontrada(s).</p>
        )}
      </div>

      <div className="grid gap-4">
        {!searched ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-400">Utilize a busca acima para encontrar solicitações.</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="text-gray-300 mb-4">
              <Search size={48} className="mx-auto" />
            </div>
            <p className="text-gray-500 font-medium">Nenhuma solicitação encontrada para <span className="text-gray-800 font-bold">{searchQuery}</span>.</p>
          </div>
        ) : (
          requests.map(req => (
            <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-200 transition-all duration-200 group relative overflow-hidden">
              {/* Status Color Strip */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                req.status === 'paid'           ? 'bg-emerald-500' :
                req.status === 'approved'       ? 'bg-blue-500'    :
                req.status === 'rejected'       ? 'bg-red-500'     :
                req.status === 'completed'      ? 'bg-purple-500'  :
                req.status === 'blocked_volume' ? 'bg-gray-400'    :
                req.status === 'expired'        ? 'bg-gray-600'    :
                'bg-yellow-400'
              }`}></div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pl-4">
                <div className="flex-1 space-y-2 w-full">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-black text-purple-700 text-xl">{req.tradeCode || 'S/ Código'}</span>
                    <span className="font-bold text-gray-800 text-base border-l-2 pl-3 border-gray-200">Parceiro: {req.partnerCode}</span>
                    <span className="text-gray-500 text-xs font-bold bg-gray-100 px-2 py-1 rounded-md">{req.region}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm text-gray-500 mt-2">
                     <div className="flex items-center gap-1.5" title="Data do Pedido">
                      <FileSpreadsheet size={16} className="text-gray-400"/>
                      <span className="text-gray-700 font-medium">Pedido: {req.orderDate ? new Date(req.orderDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'N/A'}</span>
                    </div>
                    <span className="hidden md:inline text-gray-200">•</span>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={16} className="text-gray-400"/>
                      <span className="text-gray-700 font-medium">Ação: {new Date(req.dateOfAction + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    </div>
                    <span className="hidden md:inline text-gray-200">•</span>
                    <div className="flex items-center gap-1.5 bg-purple-50 px-2 py-0.5 rounded text-purple-700 font-bold border border-purple-100">
                      <span>{req.days} dia(s)</span>
                    </div>
                  </div>

                  {req.rejectionReason && (
                    <div className="mt-2 flex items-start gap-2 bg-gray-50 text-gray-600 text-xs p-3 rounded-lg border border-gray-100 max-w-lg">
                      <AlertCircle size={14} className="mt-0.5 shrink-0"/>
                      <span><strong>Motivo:</strong> {req.rejectionReason}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end gap-3 w-full md:w-auto justify-between md:justify-center">
                  <StatusBadge status={req.status} variant="rca" />

                  {(req.status === 'approved' || req.status === 'completed') && (
                    <button
                      onClick={() => handleOpenExecution(req)}
                      className={`text-sm px-6 py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-sm font-bold w-full md:w-auto mt-2 md:mt-0 ${req.status === 'approved' ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-800 text-white hover:bg-black'}`}
                    >
                      {req.status === 'approved' ? (
                        <><FileText size={16}/> Solicitar Reembolso</>
                      ) : (
                        <><Eye size={16}/> Ver Resumo Financeiro</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
