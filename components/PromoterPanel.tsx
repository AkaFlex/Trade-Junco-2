
import React, { useState, useEffect, useMemo } from 'react';
import { getRequestByTradeCode } from '../services/tradeService';
import { TradeRequest, PRODUCTS_LIST, SalesReport, ProductCount } from '../types';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Search, Store, Calendar, Save, CheckCircle, ArrowLeft, Lock, ListChecks, Loader2 } from 'lucide-react';
import { useToast } from './shared/Toast';

export const PromoterPanel: React.FC = () => {
  const toast = useToast();

  const [tradeCode, setTradeCode] = useState('');
  const [requests, setRequests] = useState<TradeRequest[]>([]);
  const [searched, setSearched] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TradeRequest | null>(null);

  // Form State
  const [storeName, setStoreName] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [counts, setCounts] = useState<ProductCount[]>(PRODUCTS_LIST.map(p => ({ name: p, qty: 0 })));
  const [submitting, setSubmitting] = useState(false);

  // Persist trade code in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('junco_promoter_tradecode');
    if (saved) setTradeCode(saved);
  }, []);

  const getReportStatus = (req: TradeRequest) => {
    const current = req.salesReports?.length || 0;
    const total   = req.days || 1;
    return { current, total, isComplete: current >= total, remaining: total - current };
  };

  const reportStatus = useMemo(() => {
    if (!selectedRequest) return { current: 0, total: 1, isComplete: false, remaining: 1 };
    return getReportStatus(selectedRequest);
  }, [selectedRequest]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeCode.trim()) return;
    setLoadingSearch(true);
    localStorage.setItem('junco_promoter_tradecode', tradeCode.trim().toUpperCase());
    
    try {
        const data = await getRequestByTradeCode(tradeCode.trim());
        if (data && data.status !== 'approved') {
           toast.warning("Esta solicitação não está mais no status Aprovado.", `Status atual: ${data.status}`);
           setRequests([]);
        } else {
           setRequests(data ? [data] : []);
        }
    } catch (err) {
        toast.error("Erro ao buscar a solicitação.");
    } finally {
        setSearched(true);
        setSelectedRequest(null);
        setLoadingSearch(false);
    }
  };

  const handleQtyChange = (idx: number, delta: number) => {
    const newCounts = [...counts];
    newCounts[idx].qty = Math.max(0, newCounts[idx].qty + delta);
    setCounts(newCounts);
  };

  const submitReport = async () => {
    if (!selectedRequest) return;
    if (!storeName.trim()) return toast.warning("Informe o nome da loja.");
    if (!sellerName.trim()) return toast.warning("Informe o nome do vendedor.");
    if (reportStatus.isComplete) return toast.info("Todos os relatórios já foram enviados.");

    setSubmitting(true);
    const newReport: SalesReport = {
      date: new Date().toISOString(),
      storeName: storeName.trim(),
      sellerName: sellerName.trim(),
      products: counts.filter(c => c.qty > 0)
    };

    try {
      const refDoc = doc(db, "requests", selectedRequest.id);
      await updateDoc(refDoc, { salesReports: arrayUnion(newReport) });

      const updatedReq = {
        ...selectedRequest,
        salesReports: [...(selectedRequest.salesReports || []), newReport]
      };

      setSelectedRequest(updatedReq);
      setRequests(prev => prev.map(r => r.id === updatedReq.id ? updatedReq : r));

      // Reset form
      setStoreName('');
      setSellerName('');
      setCounts(PRODUCTS_LIST.map(p => ({ name: p, qty: 0 })));

      toast.success(
        `Relatório ${reportStatus.current + 1}/${reportStatus.total} enviado!`,
        `Loja: ${newReport.storeName}`
      );
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar relatório.", "Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
      try {
          // If only YYYY-MM-DD, add T00:00:00 to avoid timezone shift
          const safeDate = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
          return new Date(safeDate).toLocaleDateString('pt-BR');
      } catch {
          return dateStr;
      }
  };

  // ---- SELECTED REQUEST VIEW ----
  if (selectedRequest) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8 animate-in fade-in duration-300">
        <button onClick={() => setSelectedRequest(null)} className="flex items-center gap-2 text-gray-500 hover:text-pink-600 mb-6 font-bold transition">
          <ArrowLeft size={20}/> Voltar para Busca
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Relatório de Sell-Out</h2>
              <p className="text-sm md:text-base text-gray-500">
                Código da Ação: <strong className="text-pink-600">{selectedRequest.tradeCode || 'N/A'}</strong>
                <span className="mx-2">•</span> Parceiro: <strong>{selectedRequest.partnerCode}</strong>
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-gray-400 uppercase mb-1">Progresso</div>
              <div className={`text-2xl font-bold ${reportStatus.isComplete ? 'text-green-600' : 'text-pink-600'}`}>
                {reportStatus.current} <span className="text-gray-400 text-lg">/ {reportStatus.total}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${reportStatus.isComplete ? 'bg-green-500' : 'bg-pink-500'}`}
              style={{ width: `${Math.min((reportStatus.current / reportStatus.total) * 100, 100)}%` }}
            ></div>
          </div>

          <div className="mt-4 flex gap-4 text-sm bg-gray-50 p-3 rounded-lg flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-pink-500"/>
              <span className="font-bold text-gray-700">Início: {formatDate(selectedRequest.dateOfAction)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Store size={16} className="text-pink-500"/>
              <span className="font-bold text-gray-700">Região: {selectedRequest.region}</span>
            </div>
          </div>
        </div>

        {reportStatus.isComplete ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center mb-8 shadow-sm animate-in fade-in">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600"/>
            </div>
            <h3 className="text-xl font-bold text-green-800 mb-2">Processo Finalizado</h3>
            <p className="text-green-700 mb-6">Todos os relatórios ({reportStatus.total} dias) foram enviados com sucesso.</p>
            <button disabled className="bg-white text-gray-400 border border-gray-200 px-6 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto cursor-not-allowed">
              <Lock size={18}/> Ação Concluída
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-pink-100 overflow-hidden animate-in fade-in">
            <div className="bg-pink-600 p-4 text-white font-bold text-lg flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2"><Save size={20}/> Novo Relatório</div>
              <span className="text-xs bg-white/20 px-2 py-1 rounded">Relatório {reportStatus.current + 1} de {reportStatus.total}</span>
            </div>
            <div className="p-4 md:p-6">
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome da Loja *</label>
                  <input
                    className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    placeholder="Ex: Supermercado X"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome Vendedor *</label>
                  <input
                    className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                    value={sellerName}
                    onChange={e => setSellerName(e.target.value)}
                    placeholder="Nome Completo"
                  />
                </div>
              </div>

              <div className="mb-8 overflow-hidden">
                <h4 className="text-sm font-bold text-gray-600 mb-3 uppercase border-b pb-2">Vendas do Dia (Unidades)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-2">
                  {counts.map((item, idx) => (
                    <div key={item.name} className="flex justify-between items-center bg-gray-50 p-2 md:p-3 rounded-lg border border-gray-100 hover:border-pink-200 transition">
                      <span className="text-xs md:text-sm font-bold text-gray-700 leading-tight pr-2">{item.name}</span>
                      <div className="flex items-center gap-2 md:gap-3 shrink-0">
                        <button
                          onClick={() => handleQtyChange(idx, -1)}
                          className="w-8 h-8 bg-white border border-gray-300 rounded-full text-gray-600 hover:bg-gray-100 font-bold shadow-sm"
                        >-</button>
                        <span className="w-6 text-center text-base md:text-lg font-bold text-pink-700">{item.qty}</span>
                        <button
                          onClick={() => handleQtyChange(idx, 1)}
                          className="w-8 h-8 bg-pink-600 text-white rounded-full hover:bg-pink-700 font-bold shadow-md"
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={submitReport}
                disabled={submitting}
                className="w-full bg-pink-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-pink-700 transition transform hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 className="animate-spin" size={20}/> Enviando...</> : `SALVAR RELATÓRIO ${reportStatus.current + 1}`}
              </button>
            </div>
          </div>
        )}

        {/* History */}
        {selectedRequest.salesReports && selectedRequest.salesReports.length > 0 && (
          <div className="mt-8">
            <h3 className="font-bold text-gray-500 uppercase text-sm mb-4">Histórico de Envios</h3>
            <div className="space-y-3">
              {selectedRequest.salesReports.map((r, i) => (
                <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-gray-800">{r.storeName}</div>
                    <div className="text-xs text-gray-500">Vendedor: {r.sellerName} • {formatDate(r.date)}</div>
                  </div>
                  <div className="text-green-600 flex items-center gap-1 font-bold text-sm shrink-0">
                    <CheckCircle size={16}/> Enviado ({i+1}/{reportStatus.total})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- SEARCH VIEW ----
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="bg-pink-600 text-white p-6 md:p-8 rounded-3xl shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <h1 className="text-2xl md:text-3xl font-extrabold mb-2 relative z-10">Sell Out</h1>
        <p className="text-pink-100 relative z-10 text-sm md:text-base">Busque pelo Código da Ação para preencher seus relatórios de venda.</p>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <input
            className="flex-1 border-2 border-gray-100 bg-gray-50 p-4 rounded-xl font-bold text-lg text-gray-700 uppercase placeholder-gray-400 focus:border-pink-500 focus:bg-white outline-none transition"
            placeholder="Ex: TJ-A1B2C3"
            value={tradeCode}
            onChange={e => setTradeCode(e.target.value)}
          />
          <button
            type="submit"
            disabled={loadingSearch}
            className="bg-gray-900 text-white p-4 md:px-8 rounded-xl font-bold hover:bg-black transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loadingSearch ? <Loader2 className="animate-spin" size={20}/> : <Search size={20}/>} BUSCAR
          </button>
        </form>
      </div>

      {searched && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="font-bold text-gray-400 uppercase text-xs tracking-wider">Ações Encontradas</h3>
          {requests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-gray-400">
              Nenhuma solicitação encontrada com este código, ou ela não está mais aprovada.
            </div>
          ) : (
            requests.map(req => {
              const status = getReportStatus(req);
              return (
                <div key={req.id} className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4 group hover:border-pink-200 transition">
                  <div>
                    <div className="font-black text-lg md:text-xl text-brand-red mb-1">{req.tradeCode || 'S/ Código'}</div>
                    <div className="font-bold text-gray-800 mb-2">{req.region} • Parc: {req.partnerCode}</div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1 shrink-0"><Calendar size={14}/> {formatDate(req.dateOfAction)}</span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold text-gray-600 shrink-0">{req.days} dia(s)</span>
                    </div>
                  </div>
                  {status.isComplete ? (
                    <button disabled className="bg-green-100 text-green-700 px-6 py-4 rounded-xl font-bold cursor-not-allowed flex items-center justify-center gap-2 w-full md:w-auto">
                      <CheckCircle size={18}/> CONCLUÍDO
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedRequest(req)}
                      className="bg-pink-50 text-pink-600 px-6 py-4 rounded-xl font-bold hover:bg-pink-600 hover:text-white transition shadow-sm flex items-center justify-center gap-2 w-full md:w-auto"
                    >
                      <ListChecks size={18}/> PREENCHER ({status.current}/{status.total})
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
