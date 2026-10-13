import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { TrendingUp, Clock, AlertTriangle, Receipt, ShoppingBag, ArrowRight } from 'lucide-react';
import { TradeRequest, RequestStatus } from '../../types';
import { Card, SectionTitle, formatBRL, isRequestOverdue } from './shared';
import { computeRegionStats } from './budget';
import { monthLocal } from '../../utils/date';

// Uma cor fixa por região (índice em REGIONS), para a fatia não trocar de cor quando outra some.
const REGION_COLORS = ['#1B2A4A', '#5F4F9A', '#1D8BD0', '#EE7C1F', '#AECB28', '#D60052', '#FABF29',
                       '#17699F', '#59647A', '#8B7FC1', '#C6DB6A', '#F4A462', '#6FB6E2'];

interface Props {
  requests: TradeRequest[];
  monthlyBudgets: Record<string, number>;
  onShowRequests: (status: RequestStatus | 'all', overdueOnly?: boolean) => void;
  onShowFinance: () => void;
}

const Kpi: React.FC<{ title: string; value: React.ReactNode; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <Card className="p-5 flex items-center justify-between gap-3">
    <div className="min-w-0">
      <p className="text-[11px] font-condensed font-semibold uppercase tracking-wide text-muted truncate">{title}</p>
      <p className="text-2xl md:text-3xl font-condensed font-bold text-navy truncate">{value}</p>
    </div>
    <div className="shrink-0 text-muted">{icon}</div>
  </Card>
);

export const OverviewTab: React.FC<Props> = ({ requests, monthlyBudgets, onShowRequests, onShowFinance }) => {
  const month = monthLocal();
  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const { stats, pending, overdue, toSettle, productPerformance } = useMemo(() => {
    const productStats: Record<string, number> = {};
    requests.forEach(req => req.salesReports?.forEach(rep => rep.products?.forEach(p => {
      if (p.qty > 0) productStats[p.name] = (productStats[p.name] || 0) + p.qty;
    })));
    return {
      stats: computeRegionStats(requests, monthlyBudgets, month),
      pending: requests.filter(r => r.status === 'pending').length,
      overdue: requests.filter(isRequestOverdue).length,
      toSettle: requests.filter(r => r.status === 'completed').length,
      productPerformance: Object.entries(productStats)
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 8),
    };
  }, [requests, monthlyBudgets, month]);

  const pieData = stats
    .map((s, i) => ({ ...s, color: REGION_COLORS[i % REGION_COLORS.length] }))
    .filter(s => s.spent > 0);

  return (
    <div className="space-y-6">
      {(overdue > 0 || pending > 0 || toSettle > 0) && (
        <div className="grid md:grid-cols-3 gap-3">
          {overdue > 0 && (
            <button onClick={() => onShowRequests('pending', true)} className="text-left bg-red-50 border border-red-200 rounded-md p-4 flex items-center justify-between gap-3 hover:bg-red-100">
              <span className="text-sm text-red-800"><strong>{overdue}</strong> solicitação(ões) sem resposta há mais de 3 dias</span>
              <ArrowRight size={16} className="text-red-700 shrink-0" />
            </button>
          )}
          {pending > 0 && (
            <button onClick={() => onShowRequests('pending')} className="text-left bg-yellow-50 border border-yellow-300 rounded-md p-4 flex items-center justify-between gap-3 hover:bg-yellow-100">
              <span className="text-sm text-yellow-900"><strong>{pending}</strong> aguardando aprovação</span>
              <ArrowRight size={16} className="text-yellow-800 shrink-0" />
            </button>
          )}
          {toSettle > 0 && (
            <button onClick={onShowFinance} className="text-left bg-purple-50 border border-purple-junco/30 rounded-md p-4 flex items-center justify-between gap-3 hover:bg-purple-100">
              <span className="text-sm text-purple-junco"><strong>{toSettle}</strong> no Financeiro (a pagar ou aguardando recibo)</span>
              <ArrowRight size={16} className="text-purple-junco shrink-0" />
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Kpi title={`Pago (${monthLabel})`} value={formatBRL(stats.reduce((a, r) => a + r.realized, 0))} icon={<TrendingUp size={26} />} />
        <Kpi title={`Previsto (${monthLabel})`} value={formatBRL(stats.reduce((a, r) => a + r.planned, 0))} icon={<Clock size={26} />} />
        <Kpi title="Pendentes" value={pending} icon={<AlertTriangle size={26} />} />
        <Kpi title="Financeiro" value={toSettle} icon={<Receipt size={26} />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5 min-w-0">
          <SectionTitle>Investimento x limite por região ({monthLabel})</SectionTitle>
          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E2DA" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `R$${v / 1000}k`} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Bar dataKey="spent" name="Usado" fill="#5F4F9A" radius={[3, 3, 0, 0]} barSize={18} />
                <Bar dataKey="limit" name="Limite do mês" fill="#E4E2DA" radius={[3, 3, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 min-w-0">
          <SectionTitle>Distribuição do investimento por região</SectionTitle>
          <div className="h-72 w-full min-w-0">
            {pieData.length === 0 ? (
              <p className="h-full flex items-center justify-center text-sm text-muted">Sem investimento registrado neste mês.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="spent">
                    {pieData.map(d => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5 min-w-0">
        <SectionTitle icon={<ShoppingBag size={18} />}>Performance de produtos (Sell-Out)</SectionTitle>
        <div className="h-72 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productPerformance} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E4E2DA" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={130} style={{ fontSize: '11px', fontWeight: 600 }} />
              <Tooltip cursor={{ fill: 'transparent' }} />
              <Bar dataKey="qty" name="Unidades vendidas" fill="#D60052" radius={[0, 3, 3, 0]} barSize={22}
                label={{ position: 'right', fill: '#59647A', fontSize: 12, fontWeight: 600 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
