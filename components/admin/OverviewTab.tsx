import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { TrendingUp, Clock, AlertTriangle, Receipt, ShoppingBag, ArrowRight } from 'lucide-react';
import { TradeRequest, RequestStatus } from '../../types';
import { Card, SectionTitle, formatBRL, isRequestOverdue } from './shared';
import { computeRegionStats } from './budget';
import { monthLocal } from '../../utils/date';
import { CountUp } from '../shared/CountUp';
import { RESPONSE_SLA_DAYS } from '../../config';

// Uma cor fixa por região (índice em REGIONS), para a fatia não trocar de cor quando outra some.
const REGION_COLORS = ['#1B2A4A', '#5F4F9A', '#1D8BD0', '#EE7C1F', '#AECB28', '#D60052', '#FABF29',
                       '#17699F', '#59647A', '#8B7FC1', '#C6DB6A', '#F4A462', '#6FB6E2'];

const TOOLTIP_STYLE = { borderRadius: 4, border: '1px solid #E4E2DA', boxShadow: 'none', fontFamily: 'Barlow', fontSize: 13 };
const AXIS_TICK = { fill: '#59647A', fontSize: 11, fontFamily: 'Barlow' };

interface Props {
  requests: TradeRequest[];
  monthlyBudgets: Record<string, number>;
  onShowRequests: (status: RequestStatus | 'all', overdueOnly?: boolean) => void;
  onShowFinance: () => void;
}

const Kpi: React.FC<{ title: string; value: number; money?: boolean; icon: React.ReactNode }> = ({ title, value, money, icon }) => (
  <Card className="p-4 flex items-center justify-between gap-3">
    <div className="min-w-0">
      <p className="label mb-1 truncate">{title}</p>
      <p className="kpi text-2xl md:text-[28px] truncate">
        <CountUp value={value} format={n => (money ? formatBRL(Math.round(n)) : String(Math.round(n)))} />
      </p>
    </div>
    <div className="shrink-0 text-muted">{icon}</div>
  </Card>
);

const Alert: React.FC<{ kind: 'notice-error' | 'notice-warn' | 'notice-info'; onClick: () => void; children: React.ReactNode }> = ({ kind, onClick, children }) => (
  <button onClick={onClick} className={`${kind} text-left flex items-center justify-between gap-3 hover:border-navy transition-colors duration-150`}>
    <span>{children}</span>
    <ArrowRight size={16} className="shrink-0" />
  </button>
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
    <div className="space-y-4">
      {(overdue > 0 || pending > 0 || toSettle > 0) && (
        <div className="grid md:grid-cols-3 gap-3">
          {overdue > 0 && (
            <Alert kind="notice-error" onClick={() => onShowRequests('pending', true)}>
              <strong>{overdue}</strong> solicitação(ões) sem resposta há mais de {RESPONSE_SLA_DAYS} dias
            </Alert>
          )}
          {pending > 0 && (
            <Alert kind="notice-warn" onClick={() => onShowRequests('pending')}>
              <strong>{pending}</strong> aguardando aprovação
            </Alert>
          )}
          {toSettle > 0 && (
            <Alert kind="notice-info" onClick={onShowFinance}>
              <strong>{toSettle}</strong> no Financeiro (a pagar ou aguardando recibo)
            </Alert>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi title={`Pago · ${monthLabel}`} value={stats.reduce((a, r) => a + r.realized, 0)} money icon={<TrendingUp size={24} />} />
        <Kpi title={`Previsto · ${monthLabel}`} value={stats.reduce((a, r) => a + r.planned, 0)} money icon={<Clock size={24} />} />
        <Kpi title="Pendentes" value={pending} icon={<AlertTriangle size={24} />} />
        <Kpi title="No financeiro" value={toSettle} icon={<Receipt size={24} />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5 min-w-0">
          <SectionTitle>Investimento x limite por região ({monthLabel})</SectionTitle>
          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E2DA" />
                <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: '#E4E2DA' }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={v => `R$${v / 1000}k`} />
                <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#FBF6E9' }} />
                <Bar dataKey="spent" name="Usado" fill="#1B2A4A" radius={[2, 2, 0, 0]} barSize={16} />
                <Bar dataKey="limit" name="Limite do mês" fill="#E4E2DA" radius={[2, 2, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 min-w-0">
          <SectionTitle>Distribuição do investimento por região</SectionTitle>
          <div className="h-72 w-full min-w-0">
            {pieData.length === 0 ? (
              <p className="empty h-full flex items-center justify-center">Sem investimento registrado neste mês.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="spent" stroke="#FFFFFF">
                    {pieData.map(d => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={TOOLTIP_STYLE} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontFamily: 'Barlow', fontSize: 12, color: '#59647A' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5 min-w-0">
        <SectionTitle icon={<ShoppingBag size={16} />}>Performance de produtos (Sell-Out)</SectionTitle>
        <div className="h-72 w-full min-w-0">
          {productPerformance.length === 0 ? (
            <p className="empty h-full flex items-center justify-center">Nenhum relatório de Sell-Out ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productPerformance} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E4E2DA" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={140} tick={{ ...AXIS_TICK, fill: '#1B2A4A', fontWeight: 600 }} />
                <Tooltip cursor={{ fill: '#FBF6E9' }} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="qty" name="Unidades vendidas" fill="#5F4F9A" radius={[0, 2, 2, 0]} barSize={20}
                  label={{ position: 'right', fill: '#59647A', fontSize: 12, fontWeight: 600 }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
};
