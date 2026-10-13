// Datas sempre no fuso local do navegador (America/Sao_Paulo na prática).
// `toISOString()` usa UTC e vira o dia/mês seguinte depois das 21h — não usar para datas de negócio.

const pad = (n: number) => String(n).padStart(2, '0');

export const toLocalDateStr = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayLocal = (): string => toLocalDateStr(new Date());

export const monthLocal = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export const shiftMonth = (month: string, delta: number): string => {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
};

/** 'AAAA-MM-DD' -> Date local à meia-noite. */
export const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, days: number): Date => {
  const r = new Date(d.getTime());
  r.setDate(r.getDate() + days);
  return r;
};
