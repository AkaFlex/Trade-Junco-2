import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, ListChecks, Wallet, Settings, Loader2, Archive, Shield, FileSpreadsheet, X } from 'lucide-react';
import { TradeRequest, PaymentInfo, RequestStatus } from '../types';
import {
  getAllRequests, updateRequestStatus, adminUpdateRequest, getPaymentInfo,
  checkBudgetAvailability, checkAndExpireRequests, getBudgetsForMonth, reopenRequest,
} from '../services/tradeService';
import { downloadBackup, runSecurityMigration, logAdminEvent } from '../services/maintenanceService';
import { uploadFiles } from '../services/uploadService';
import { auth } from '../firebaseConfig';
import { useToast } from './shared/Toast';
import { useConfirm } from './shared/ConfirmModal';
import { monthLocal } from '../utils/date';
import { REQUEST_TYPE_LABELS, typeOf, isEventLike, isRequestOverdue } from './admin/shared';
import { exportToCSV } from './admin/csv';
import { OverviewTab } from './admin/OverviewTab';
import { RequestsTab, RequestsFilter } from './admin/RequestsTab';
import { FinanceTab } from './admin/FinanceTab';
import { SettingsTab } from './admin/SettingsTab';
import { RequestDetailsModal } from './admin/RequestDetailsModal';

type Tab = 'overview' | 'requests' | 'finance' | 'settings';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Visão Geral', icon: <LayoutDashboard size={18} /> },
  { key: 'requests', label: 'Solicitações', icon: <ListChecks size={18} /> },
  { key: 'finance', label: 'Financeiro', icon: <Wallet size={18} /> },
  { key: 'settings', label: 'Configurações', icon: <Settings size={18} /> },
];

export const AdminPanel: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();

  const [requests, setRequests] = useState<TradeRequest[]>([]);
  const [monthlyBudgets, setMonthlyBudgets] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<Tab>('overview');
  const [filter, setFilter] = useState<RequestsFilter>({ status: 'pending', type: 'all', search: '', overdueOnly: false });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [maintenanceBusy, setMaintenanceBusy] = useState(false);

  const [selected, setSelected] = useState<TradeRequest | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentInfo | null>(null);
  const [rejecting, setRejecting] = useState<TradeRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const patch = (id: string, data: Partial<TradeRequest>) => {
    setRequests(prev => prev.map(r => (r.id === id ? { ...r, ...data } : r)));
    setSelected(prev => (prev?.id === id ? { ...prev, ...data } : prev));
  };

  const loadData = useCallback(async () => {
    try {
      const data = await getAllRequests();
      setRequests(data.sort((a, b) => b.createdAt - a.createdAt));
    } catch (e: any) {
      toast.error('Erro ao carregar solicitações', e?.message);
    }
  }, []);

  const loadBudgets = useCallback(async () => {
    try { setMonthlyBudgets(await getBudgetsForMonth(monthLocal())); } catch { /* painel funciona sem orçamento */ }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const expired = await checkAndExpireRequests();
        if (expired > 0) toast.info(`${expired} solicitação(ões) venceram`, 'Reembolso não enviado no prazo. Veja em Solicitações → Vencidas.');
        await Promise.all([loadData(), loadBudgets()]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setSelectedPayment(null);
    if (!selected) return;
    let active = true;
    getPaymentInfo(selected).then(p => { if (active) setSelectedPayment(p); });
    return () => { active = false; };
  }, [selected?.id]);

  // ------------------------------------------------------------------ ações
  const withBusy = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try { await fn(); } finally { setBusyId(null); }
  };

  const handleApprove = (r: TradeRequest) => withBusy(r.id, async () => {
    try {
      const budget = await checkBudgetAvailability(r.region, r.dateOfAction?.slice(0, 7) || monthLocal(), Number(r.totalValue));
      if (!budget.allowed) {
        const ok = await confirm({
          title: 'Orçamento estourado',
          message: <>A região <strong>{r.region}</strong> não tem verba suficiente no mês.<br />{budget.message}<br /><br />Aprovar mesmo assim?</>,
          confirmLabel: 'Aprovar mesmo assim',
          danger: true,
        });
        if (!ok) return;
      }
      const next: RequestStatus = isEventLike(r) ? 'completed' : 'approved';
      await updateRequestStatus(r.id, next);
      patch(r.id, { status: next, rejectionReason: undefined });
      toast.success(`${REQUEST_TYPE_LABELS[typeOf(r)]} aprovada!`, `${r.rcaName} — ${r.partnerCode}`);
    } catch (e: any) {
      toast.error('Erro ao aprovar', e?.message);
    }
  });

  const confirmReject = async () => {
    if (!rejecting || !rejectionReason.trim()) return;
    const r = rejecting;
    await withBusy(r.id, async () => {
      try {
        await updateRequestStatus(r.id, 'rejected', rejectionReason.trim());
        patch(r.id, { status: 'rejected', rejectionReason: rejectionReason.trim() });
        setRejecting(null);
        toast.success('Solicitação recusada.');
      } catch (e: any) {
        toast.error('Erro ao recusar', e?.message);
      }
    });
  };

  const handleReopen = async (r: TradeRequest) => {
    const ok = await confirm({
      title: 'Reabrir solicitação?',
      message: <>{r.tradeCode} volta para <strong>Em execução</strong>: o RCA poderá enviar o reembolso e a degustadora os relatórios. O prazo de vencimento é recalculado a partir da data da ação.</>,
      confirmLabel: 'Reabrir',
    });
    if (!ok) return;
    await withBusy(r.id, async () => {
      try {
        await reopenRequest(r.id);
        patch(r.id, { status: 'approved', rejectionReason: undefined });
        toast.success('Solicitação reaberta.');
      } catch (e: any) {
        toast.error('Erro ao reabrir', e?.message);
      }
    });
  };

  const handleMarkPaid = async (r: TradeRequest) => {
    const ok = await confirm({ title: 'Confirmar pagamento?', message: <>{r.tradeCode} · {r.rcaName} · <strong>R$ {Number(r.totalValue).toLocaleString('pt-BR')}</strong></>, confirmLabel: 'Marcar como pago' });
    if (!ok) return;
    await withBusy(r.id, async () => {
      try {
        await updateRequestStatus(r.id, 'paid');
        patch(r.id, { status: 'paid' });
        toast.success('Pagamento registrado!');
      } catch (e: any) {
        toast.error('Erro ao registrar pagamento', e?.message);
      }
    });
  };

  const handleAttachReceipt = (r: TradeRequest, files: File[]) => withBusy(r.id, async () => {
    try {
      const { urls, failures } = await uploadFiles(files, 'reembolso-notas', ['image', 'pdf']);
      failures.forEach(f => toast.error('Arquivo não enviado', f.reason));
      if (urls.length === 0) return;
      const receiptUrls = [...(r.receiptUrls || []), ...urls];
      await adminUpdateRequest(r.id, { receiptUrls, status: 'paid' });
      patch(r.id, { receiptUrls, status: 'paid' });
      toast.success('Recibo anexado e solicitação concluída!');
    } catch (e: any) {
      toast.error('Erro ao anexar recibo', e?.message);
    }
  });

  const handleCompleteWithoutReceipt = async (r: TradeRequest) => {
    const ok = await confirm({ title: 'Concluir sem recibo?', message: `${r.tradeCode} sai do Financeiro como concluída, sem arquivo anexado.`, confirmLabel: 'Concluir' });
    if (!ok) return;
    await withBusy(r.id, async () => {
      try {
        await updateRequestStatus(r.id, 'paid');
        patch(r.id, { status: 'paid' });
        toast.success('Solicitação concluída.');
      } catch (e: any) {
        toast.error('Erro ao concluir', e?.message);
      }
    });
  };

  const handleSaveValue = async (r: TradeRequest, value: number) => {
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Valor inválido', 'Digite um número maior ou igual a zero.');
      return false;
    }
    try {
      await adminUpdateRequest(r.id, { totalValue: value });
      patch(r.id, { totalValue: value });
      toast.success('Valor atualizado!');
      return true;
    } catch (e: any) {
      toast.error('Erro ao salvar valor', e?.message);
      return false;
    }
  };

  const handleSaveSupplier = async (r: TradeRequest, supplier: string) => {
    try {
      await adminUpdateRequest(r.id, { adminAssignedSupplier: supplier.trim() });
      patch(r.id, { adminAssignedSupplier: supplier.trim() });
      toast.success('Fornecedor atualizado!');
    } catch (e: any) {
      toast.error('Erro ao salvar o fornecedor', e?.message);
    }
  };

  // ------------------------------------------------------------------ manutenção
  const runMaintenance = async (fn: () => Promise<void>) => {
    setMaintenanceBusy(true);
    try { await fn(); } finally { setMaintenanceBusy(false); }
  };

  const handleExport = () => runMaintenance(async () => {
    if (requests.length === 0) return toast.warning('Nenhum dado para exportar.');
    const ok = await confirm({ title: 'Exportar CSV?', message: 'O arquivo inclui dados pessoais e de PIX (LGPD). A exportação fica registrada com o seu e-mail.', confirmLabel: 'Exportar' });
    if (!ok) return;
    const who = auth.currentUser?.email || 'desconhecido';
    const entries = await Promise.all(requests.map(async r => [r.id, await getPaymentInfo(r)] as const));
    exportToCSV(requests, Object.fromEntries(entries), who);
    await logAdminEvent('export_csv', { rows: requests.length });
    toast.success('CSV exportado!', `${requests.length} solicitações.`);
  });

  const handleBackup = () => runMaintenance(async () => {
    try {
      await downloadBackup();
      await logAdminEvent('backup_json', {});
      toast.success('Backup baixado!', 'Guarde o arquivo JSON em local seguro.');
    } catch (e: any) {
      toast.error('Erro ao gerar backup', e?.message);
    }
  });

  const handleMigration = () => runMaintenance(async () => {
    try {
      const r = await runSecurityMigration();
      toast.success('Migração concluída!', `${r.indexed} códigos indexados · ${r.paymentsMoved} PIX protegidos · ${r.total} solicitações verificadas`);
      await loadData();
    } catch (e: any) {
      toast.error('Erro na migração', e?.message);
    }
  });

  const counts = {
    requests: requests.filter(r => r.status === 'pending').length,
    finance: requests.filter(r => r.status === 'completed').length,
    overdue: requests.filter(isRequestOverdue).length,
  };

  return (
    <div className="min-h-full">
      {/* Cabeçalho do painel no padrão Junco: superfície branca, borda inferior, abas com sublinhado laranja. */}
      <div className="bg-white border-b border-line">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-baseline gap-3 pb-4">
            <div>
              <h1 className="page-title">Painel de gestão</h1>
              <p className="page-sub">Aprovações, financeiro e configurações do Trade</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleBackup} disabled={maintenanceBusy} title="Baixa uma cópia (JSON) de todas as coleções" className="btn"><Archive size={15} /> Backup</button>
              <button onClick={handleMigration} disabled={maintenanceBusy} title="Indexa os códigos TJ e protege os dados de PIX" className="btn"><Shield size={15} /> Migrar segurança</button>
              <button onClick={handleExport} disabled={maintenanceBusy} className="btn-primary"><FileSpreadsheet size={15} /> Exportar CSV</button>
            </div>
          </div>
          <nav className="tabs no-scrollbar" role="tablist" aria-label="Seções do painel">
            {TABS.map(t => {
              const badge = t.key === 'requests' ? counts.requests : t.key === 'finance' ? counts.finance : 0;
              return (
                <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={tab === t.key ? 'tab tab-active' : 'tab'}>
                  {t.icon} {t.label}
                  {badge > 0 && <span className="count">{badge}</span>}
                  {t.key === 'requests' && counts.overdue > 0 && <span className="badge-error" title="Atrasados">{counts.overdue} atrasado(s)</span>}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="page">
        {loading ? (
          <div className="loading flex justify-center"><Loader2 className="animate-spin text-navy" size={32} /></div>
        ) : (
          <div key={tab} className="view-in">
            {tab === 'overview' && (
              <OverviewTab
                requests={requests}
                monthlyBudgets={monthlyBudgets}
                onShowRequests={(status, overdueOnly) => { setFilter({ status, type: 'all', search: '', overdueOnly: !!overdueOnly }); setTab('requests'); }}
                onShowFinance={() => setTab('finance')}
              />
            )}
            {tab === 'requests' && (
              <RequestsTab
                requests={requests}
                filter={filter}
                onFilterChange={setFilter}
                busyId={busyId}
                onOpen={setSelected}
                onApprove={handleApprove}
                onReject={r => { setRejecting(r); setRejectionReason(''); }}
                onReopen={handleReopen}
                onSaveValue={handleSaveValue}
              />
            )}
            {tab === 'finance' && (
              <FinanceTab
                requests={requests}
                busyId={busyId}
                onOpen={setSelected}
                onMarkPaid={handleMarkPaid}
                onAttachReceipt={handleAttachReceipt}
                onCompleteWithoutReceipt={handleCompleteWithoutReceipt}
              />
            )}
            {tab === 'settings' && <SettingsTab requests={requests} onBudgetsChanged={loadBudgets} />}
          </div>
        )}
      </div>

      {rejecting && (
        <div className="overlay" onClick={() => setRejecting(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="reject-title" className="modal max-w-md" onClick={e => e.stopPropagation()}
            onKeyDown={e => { if (e.key === 'Escape') setRejecting(null); }}>
            <div className="modal-head">
              <h2 id="reject-title">Recusar {rejecting.tradeCode}</h2>
              <button onClick={() => setRejecting(null)} aria-label="Fechar" className="text-muted"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div>
                <label htmlFor="reject-reason" className="label">Motivo (visível para o RCA)</label>
                <textarea id="reject-reason" className="input" rows={4} placeholder="Ex: valor incorreto, data indisponível..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} autoFocus />
              </div>
            </div>
            <div className="modal-foot">
              <button onClick={() => setRejecting(null)} className="btn">Cancelar</button>
              <button onClick={confirmReject} disabled={!rejectionReason.trim() || busyId === rejecting.id} className="btn-danger">Recusar solicitação</button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <RequestDetailsModal
          key={selected.id}
          request={selected}
          payment={selectedPayment}
          onClose={() => setSelected(null)}
          onSaveSupplier={handleSaveSupplier}
        />
      )}
    </div>
  );
};
