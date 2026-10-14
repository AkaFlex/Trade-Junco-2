
import React, { useState, useEffect, useMemo } from 'react';
import { getRequestByTradeCode, getRequestById } from '../services/tradeService';
import { getProducts } from '../services/productsService';
import { TradeRequest, SalesReport, ProductCount } from '../types';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Search, Store, Calendar, Save, CheckCircle, ArrowLeft, ListChecks, Loader2 } from 'lucide-react';
import { useToast } from './shared/Toast';

export const PromoterPanel: React.FC<{ initialCode?: string }> = ({ initialCode }) => {
  const toast = useToast();

  const [tradeCode, setTradeCode] = useState('');
  const [requests, setRequests] = useState<TradeRequest[]>([]);
  const [searched, setSearched] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TradeRequest | null>(null);

  // Form State
  const [storeName, setStoreName] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [counts, setCounts] = useState<ProductCount[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const searchCode = async (code: string) => {
    if (!code.trim()) return;
    setLoadingSearch(true);
    localStorage.setItem('junco_promoter_tradecode', code.trim().toUpperCase());
    try {
        const data = await getRequestByTradeCode(code);
        if (data && data.status !== 'approved') {
           toast.warning("Esta solicitação não está em execução.", "O Sell-Out só pode ser enviado enquanto a ação estiver aprovada.");
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

  // Código vindo do link (#/sellout?code=...) tem prioridade sobre o último código usado.
  useEffect(() => {
    if (initialCode) {
      setTradeCode(initialCode.toUpperCase());
      searchCode(initialCode);
      return;
    }
    const saved = localStorage.getItem('junco_promoter_tradecode');
    if (saved) setTradeCode(saved);
  }, [initialCode]);

  // Load the live product checklist from Firestore
  useEffect(() => {
    (async () => {
      try {
        const items = await getProducts();
        const active = items.filter(p => p.active !== false);
        setCounts(active.map(p => ({ name: p.name, qty: 0 })));
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar lista de produtos.", "Tente recarregar a página.");
      } finally {
        setProductsLoading(false);
      }
    })();
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
    await searchCode(tradeCode);
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
    if (counts.length === 0) return toast.warning("Nenhum produto cadastrado.", "Contate o administrador.");

    setSubmitting(true);
    // Confere o estado atual no servidor: outra aba/degustadora pode ter enviado relatórios.
    const latest = await getRequestById(selectedRequest.id).catch(() => null);
    if (latest) {
      setSelectedRequest(latest);
      setRequests(prev => prev.map(r => r.id === latest.id ? latest : r));
      if (latest.status !== 'approved') {
        setSubmitting(false);
        return toast.warning("Esta ação não está mais em execução.");
      }
      if ((latest.salesReports?.length || 0) >= (latest.days || 1)) {
        setSubmitting(false);
        return toast.info("Todos os relatórios desta ação já foram enviados.");
      }
    }
    const base = latest || selectedRequest;
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
        ...base,
        salesReports: [...(base.salesReports || []), newReport]
      };

      setSelectedRequest(updatedReq);
      setRequests(prev => prev.map(r => r.id === updatedReq.id ? updatedReq : r));

      // Reset form
      setStoreName('');
      setSellerName('');
      setCounts(prev => prev.map(c => ({ ...c, qty: 0 })));

      toast.success(
        `Relatório ${updatedReq.salesReports.length}/${updatedReq.days || 1} enviado!`,
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
    const pct = Math.min((reportStatus.current / reportStatus.total) * 100, 100);
    return (
      <div className="page-narrow view-in space-y-4">
        <button onClick={() => setSelectedRequest(null)} className="btn"><ArrowLeft size={15} /> Voltar para a busca</button>

        <div className="card p-5">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="page-title">Relatório de Sell-Out</h1>
              <p className="page-sub">
                Código: <strong className="text-navy">{selectedRequest.tradeCode || '—'}</strong> · Parceiro: <strong className="text-navy">{selectedRequest.partnerCode}</strong>
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="label">Progresso</p>
              <p className="kpi text-2xl">{reportStatus.current}<span className="text-muted text-lg"> / {reportStatus.total}</span></p>
            </div>
          </div>
          <div className="mt-4 w-full bg-paper border border-line rounded h-3 overflow-hidden" role="progressbar" aria-valuenow={reportStatus.current} aria-valuemin={0} aria-valuemax={reportStatus.total}>
            <div className={`h-full transition-all duration-200 ${reportStatus.isComplete ? 'bg-green-junco' : 'bg-orange-junco'}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3 flex gap-4 text-[13px] text-muted flex-wrap">
            <span className="flex items-center gap-1.5"><Calendar size={14} /> Início: {formatDate(selectedRequest.dateOfAction)}</span>
            <span className="flex items-center gap-1.5"><Store size={14} /> Região: {selectedRequest.region}</span>
          </div>
        </div>

        {reportStatus.isComplete ? (
          <div className="notice-ok text-center py-6">
            <CheckCircle size={28} className="mx-auto mb-2" />
            <p className="section-title text-[#3F5509] mb-1">Processo finalizado</p>
            <p>Todos os relatórios ({reportStatus.total} dia(s)) foram enviados.</p>
          </div>
        ) : (
          <div className="card">
            <div className="card-head flex items-center justify-between gap-3">
              <h2 className="section-title flex items-center gap-2"><Save size={16} /> Novo relatório</h2>
              <span className="badge-info">Relatório {reportStatus.current + 1} de {reportStatus.total}</span>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="so-store" className="label">Nome da loja *</label>
                  <input id="so-store" className="input" value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Ex: Supermercado X" />
                </div>
                <div>
                  <label htmlFor="so-seller" className="label">Nome do vendedor *</label>
                  <input id="so-seller" className="input" value={sellerName} onChange={e => setSellerName(e.target.value)} placeholder="Nome completo" />
                </div>
              </div>

              <div>
                <p className="label">Vendas do dia (unidades)</p>
                {productsLoading ? (
                  <div className="loading flex justify-center"><Loader2 className="animate-spin text-navy" size={24} /></div>
                ) : counts.length === 0 ? (
                  <div className="empty">Nenhum produto cadastrado. Fale com o gestor de Trade.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {counts.map((item, idx) => (
                      <div key={item.name} className="card-inner flex justify-between items-center gap-3 px-3 py-2">
                        <span className="text-[13.5px] font-semibold text-navy leading-tight">{item.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => handleQtyChange(idx, -1)} className="iconbtn w-9 h-9" aria-label={`Diminuir ${item.name}`}>−</button>
                          <span className="w-8 text-center kpi text-lg" aria-live="polite">{item.qty}</span>
                          <button onClick={() => handleQtyChange(idx, 1)} className="iconbtn w-9 h-9 bg-navy text-white border-navy" aria-label={`Aumentar ${item.name}`}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={submitReport} disabled={submitting} className="btn-primary btn-lg w-full">
                {submitting ? <><Loader2 className="animate-spin" size={16} /> Enviando...</> : `Salvar relatório ${reportStatus.current + 1}`}
              </button>
            </div>
          </div>
        )}

        {selectedRequest.salesReports && selectedRequest.salesReports.length > 0 && (
          <div className="card">
            <div className="card-head"><h3 className="section-title">Histórico de envios</h3></div>
            <ul className="divide-y divide-line">
              {selectedRequest.salesReports.map((r, i) => (
                <li key={i} className="px-5 py-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-navy">{r.storeName}</div>
                    <div className="text-[12.5px] text-muted">Vendedor: {r.sellerName} · {formatDate(r.date)}</div>
                  </div>
                  <span className="badge-ok"><CheckCircle size={12} /> Enviado ({i + 1}/{reportStatus.total})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // ---- SEARCH VIEW ----
  return (
    <div className="page-narrow view-in space-y-4">
      <div>
        <h1 className="page-title">Sell-Out</h1>
        <p className="page-sub">Busque pelo código da ação para preencher seus relatórios de venda.</p>
      </div>

      <form onSubmit={handleSearch} className="card p-4 flex flex-col md:flex-row gap-3">
        <label htmlFor="so-code" className="sr-only">Código da ação</label>
        <input
          id="so-code"
          className="input md:flex-1 uppercase font-semibold text-[15px]"
          placeholder="Ex: TJ-7KQ4M9X2PA"
          value={tradeCode}
          onChange={e => setTradeCode(e.target.value)}
          autoCapitalize="characters"
        />
        <button type="submit" disabled={loadingSearch} className="btn-primary">
          {loadingSearch ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />} Buscar
        </button>
      </form>

      {searched && (
        <div className="space-y-3 view-in">
          <h2 className="label">Ações encontradas</h2>
          {requests.length === 0 ? (
            <div className="card empty">Nenhuma ação em execução encontrada com este código.</div>
          ) : (
            requests.map(req => {
              const status = getReportStatus(req);
              return (
                <div key={req.id} className="card border-l-4 border-l-pink-junco p-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <div className="font-condensed font-black text-lg text-navy">{req.tradeCode || 'Sem código'}</div>
                    <div className="text-[13.5px] text-navy">{req.region} · Parceiro {req.partnerCode}</div>
                    <div className="flex items-center gap-3 text-[12.5px] text-muted mt-1 flex-wrap">
                      <span className="flex items-center gap-1"><Calendar size={13} /> {formatDate(req.dateOfAction)}</span>
                      <span className="badge">{req.days} dia(s)</span>
                    </div>
                  </div>
                  {status.isComplete ? (
                    <span className="badge-ok text-[12px] px-3 py-1.5"><CheckCircle size={14} /> Concluído</span>
                  ) : (
                    <button onClick={() => setSelectedRequest(req)} className="btn-primary w-full md:w-auto">
                      <ListChecks size={16} /> Preencher ({status.current}/{status.total})
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
