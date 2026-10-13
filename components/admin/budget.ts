import { TradeRequest, REGIONS } from '../../types';

export interface RegionStat {
  name: string;
  realized: number; // pago
  planned: number;  // aprovado / aguardando pagamento
  spent: number;
  limit: number;
}

/** Consumo de verba por região, só das ações cujo mês (dateOfAction) é o mês informado. */
export const computeRegionStats = (
  requests: TradeRequest[],
  monthlyBudgets: Record<string, number>,
  month: string,
): RegionStat[] => {
  const inMonth = requests.filter(r => r.dateOfAction?.startsWith(month) && Number(r.totalValue) > 0);
  return REGIONS.map(region => {
    const ofRegion = inMonth.filter(r => r.region === region);
    const realized = ofRegion.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.totalValue), 0);
    const planned = ofRegion
      .filter(r => r.status === 'approved' || r.status === 'completed')
      .reduce((s, r) => s + Number(r.totalValue), 0);
    return { name: region, realized, planned, spent: realized + planned, limit: monthlyBudgets[region] || 0 };
  });
};
