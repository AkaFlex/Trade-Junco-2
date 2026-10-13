import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DollarSign, ShoppingBag, ChevronLeft, ChevronRight, Pencil, Check, X, Loader2 } from 'lucide-react';
import { TradeRequest, SellOutProduct, PRODUCTS_LIST, Region } from '../../types';
import { saveBudget, getAllBudgets, getBudgetsForMonth } from '../../services/tradeService';
import { getProducts, addProduct, updateProduct, deleteProduct } from '../../services/productsService';
import { useToast } from '../shared/Toast';
import { useConfirm } from '../shared/ConfirmModal';
import { OptionButtons } from '../shared/OptionSelect';
import { monthLocal, shiftMonth } from '../../utils/date';
import { Card, SectionTitle, formatBRL } from './shared';
import { computeRegionStats } from './budget';

const monthLabel = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

const BudgetsSection: React.FC<{ requests: TradeRequest[]; onBudgetsChanged: () => void }> = ({ requests, onBudgetsChanged }) => {
  const toast = useToast();
  const [month, setMonth] = useState(monthLocal());
  const [monthly, setMonthly] = useState<Record<string, number>>({});
  const [annual, setAnnual] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [limit, setLimit] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const [byMonth, all] = await Promise.all([getBudgetsForMonth(m), getAllBudgets()]);
      setMonthly(byMonth);
      const year = m.split('-')[0];
      const a: Record<string, number> = {};
      all.forEach(b => { if (b.month?.startsWith(year)) a[b.region] = (a[b.region] || 0) + Number(b.limit); });
      setAnnual(a);
    } catch (e: any) {
      toast.error('Erro ao carregar orçamentos', e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(month); }, [month, load]);

  const stats = useMemo(() => computeRegionStats(requests, monthly, month), [requests, monthly, month]);

  const save = async (region: string) => {
    const value = Number(limit);
    if (!Number.isFinite(value) || value < 0) return toast.warning('Informe um valor válido.');
    try {
      await saveBudget(region as Region, month, value);
      setEditing(null);
      await load(month);
      onBudgetsChanged();
      toast.success('Orçamento salvo!', `${region} — ${monthLabel(month)}`);
    } catch (e: any) {
      toast.error('Erro ao salvar orçamento.', e?.message);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-col md:flex-row justify-between items-center gap-3">
        <SectionTitle icon={<DollarSign size={18} />}>Orçamento por região</SectionTitle>
        <div className="flex items-center gap-2 border border-line rounded-md p-1 bg-paper">
          <button aria-label="Mês anterior" className="p-2 hover:bg-white rounded" onClick={() => setMonth(m => shiftMonth(m, -1))}><ChevronLeft size={18} /></button>
          <input
            type="month"
            aria-label="Mês do orçamento"
            className="bg-transparent font-semibold text-navy outline-none"
            value={month}
            onChange={e => e.target.value && setMonth(e.target.value)}
          />
          <button aria-label="Próximo mês" className="p-2 hover:bg-white rounded" onClick={() => setMonth(m => shiftMonth(m, 1))}><ChevronRight size={18} /></button>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-navy" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {stats.map(stat => {
            const pct = stat.limit > 0 ? (stat.spent / stat.limit) * 100 : 0;
            const realizedW = stat.limit > 0 ? (stat.realized / stat.limit) * 100 : 0;
            const plannedW = stat.limit > 0 ? (stat.planned / stat.limit) * 100 : 0;
            return (
              <Card key={stat.name} className={`p-4 border-l-4 ${pct > 100 ? 'border-l-red-600' : 'border-l-purple-junco'}`}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-condensed font-bold uppercase tracking-wide text-navy">{stat.name}</h3>
                  <button aria-label={`Editar orçamento de ${stat.name}`} onClick={() => { setEditing(stat.name); setLimit(String(stat.limit)); }} className="text-muted hover:text-navy">
                    <Pencil size={15} />
                  </button>
                </div>
                <p className="text-[11px] font-condensed font-semibold uppercase tracking-wide text-muted">Limite em {monthLabel(month)}</p>
                {editing === stat.name ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      aria-label="Limite do mês"
                      className="w-full border border-line rounded p-1.5 text-sm"
                      value={limit}
                      onChange={e => setLimit(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') save(stat.name); if (e.key === 'Escape') setEditing(null); }}
                      autoFocus
                    />
                    <button onClick={() => save(stat.name)} aria-label="Salvar" className="text-green-700 p-1"><Check size={16} /></button>
                    <button onClick={() => setEditing(null)} aria-label="Cancelar" className="text-muted p-1"><X size={16} /></button>
                  </div>
                ) : (
                  <p className="text-2xl font-condensed font-bold text-navy">{formatBRL(stat.limit)}</p>
                )}
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Usado: {formatBRL(stat.spent)}</span>
                    <span className={pct > 100 ? 'text-red-700 font-bold' : 'text-muted'}>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-paper border border-line rounded h-3 overflow-hidden flex">
                    <div className="h-full bg-green-junco" style={{ width: `${Math.min(realizedW, 100)}%` }} title={`Pago: ${formatBRL(stat.realized)}`} />
                    <div className="h-full bg-blue-junco" style={{ width: `${Math.min(plannedW, 100 - Math.min(realizedW, 100))}%` }} title={`Previsto: ${formatBRL(stat.planned)}`} />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-muted">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-junco" /> Pago</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-junco" /> Previsto</span>
                  </div>
                </div>
                <p className="text-xs text-muted flex justify-between pt-3 mt-3 border-t border-line">
                  <span>Orçamento anual</span>
                  <span className="font-semibold text-gray-700">{formatBRL(annual[stat.name] || 0)}</span>
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ProductsSection: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [products, setProducts] = useState<SellOutProduct[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setProducts(await getProducts()); } catch (e: any) { toast.error('Erro ao carregar produtos.', e?.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true);
    try { await fn(); await load(); if (ok) toast.success(ok); }
    catch (e: any) { toast.error('Não foi possível concluir.', e?.message); }
    finally { setBusy(false); }
  };

  const add = () => {
    if (!newName.trim()) return toast.warning('Digite o nome do produto.');
    const nextOrder = products.length ? Math.max(...products.map(p => p.order)) + 1 : 0;
    run(async () => { await addProduct(newName, nextOrder); setNewName(''); }, 'Produto adicionado!');
  };

  const remove = async (p: SellOutProduct) => {
    const ok = await confirm({ title: 'Excluir produto?', message: <>"{p.name}" deixa de aparecer no Sell-Out. Para só esconder, use "Ativo/Inativo".</>, confirmLabel: 'Excluir', danger: true });
    if (ok) run(() => deleteProduct(p.id), 'Produto excluído.');
  };

  const importDefault = () => run(async () => {
    if ((await getProducts()).length > 0) throw new Error('A lista já tem produtos.');
    for (let i = 0; i < PRODUCTS_LIST.length; i++) await addProduct(PRODUCTS_LIST[i], i);
  }, 'Lista padrão importada!');

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionTitle icon={<ShoppingBag size={18} />}>Produtos do Sell-Out</SectionTitle>
        <div className="flex gap-2">
          <input
            aria-label="Nome do novo produto"
            className="flex-1 border border-line p-2.5 rounded-md focus:ring-2 focus:ring-navy/30 outline-none"
            placeholder="Nome do novo produto (ex: Bala de Coco - 400g)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <button onClick={add} disabled={busy} className="bg-navy text-white px-5 rounded-md font-condensed font-semibold uppercase tracking-wide text-sm disabled:opacity-50">Adicionar</button>
        </div>
      </Card>

      {products.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted mb-4">Nenhum produto cadastrado ainda.</p>
          <button onClick={importDefault} disabled={busy} className="bg-paper border border-line text-gray-700 px-5 py-2.5 rounded-md font-semibold disabled:opacity-50 inline-flex items-center gap-2">
            {busy && <Loader2 size={14} className="animate-spin" />} Importar lista padrão ({PRODUCTS_LIST.length} produtos)
          </button>
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {products.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3.5 gap-3">
              {editingId === p.id ? (
                <>
                  <input aria-label="Nome do produto" className="flex-1 border border-line rounded p-2 text-sm" value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                    onKeyDown={e => { if (e.key === 'Escape') setEditingId(null); }} />
                  <button aria-label="Salvar" disabled={busy} onClick={() => {
                    if (!editName.trim()) return toast.warning('Nome não pode ser vazio.');
                    run(async () => { await updateProduct(p.id, { name: editName.trim() }); setEditingId(null); }, 'Produto atualizado!');
                  }} className="text-green-700 p-2"><Check size={16} /></button>
                  <button aria-label="Cancelar" onClick={() => setEditingId(null)} className="text-muted p-2"><X size={16} /></button>
                </>
              ) : (
                <>
                  <span className={`flex-1 font-medium ${p.active === false ? 'text-muted line-through' : 'text-gray-800'}`}>{p.name}</span>
                  <OptionButtons
                    ariaLabel={`Situação de ${p.name}`}
                    value={p.active === false ? 'inativo' : 'ativo'}
                    options={[{ value: 'ativo', label: 'Ativo' }, { value: 'inativo', label: 'Inativo' }]}
                    onChange={v => run(() => updateProduct(p.id, { active: v === 'ativo' }))}
                  />
                  <button aria-label={`Editar ${p.name}`} onClick={() => { setEditingId(p.id); setEditName(p.name); }} className="text-muted hover:text-navy p-2"><Pencil size={16} /></button>
                  <button aria-label={`Excluir ${p.name}`} onClick={() => remove(p)} className="text-muted hover:text-red-600 p-2"><X size={16} /></button>
                </>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

export const SettingsTab: React.FC<{ requests: TradeRequest[]; onBudgetsChanged: () => void }> = ({ requests, onBudgetsChanged }) => {
  const [section, setSection] = useState<'budgets' | 'products'>('budgets');
  return (
    <div className="space-y-4">
      <OptionButtons
        ariaLabel="Seção de configurações"
        value={section}
        options={[{ value: 'budgets', label: 'Orçamentos' }, { value: 'products', label: 'Produtos do Sell-Out' }]}
        onChange={v => setSection(v as 'budgets' | 'products')}
      />
      {section === 'budgets' ? <BudgetsSection requests={requests} onBudgetsChanged={onBudgetsChanged} /> : <ProductsSection />}
    </div>
  );
};
