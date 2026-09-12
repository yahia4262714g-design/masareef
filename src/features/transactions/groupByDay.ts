import type { Transaction } from '@/types';
import { formatDateRelative } from '@/services/dates';

export interface DayGroup {
  date: string;
  label: string;
  transactions: Transaction[];
  expenseTotal: number;
  incomeTotal: number;
}

/** يجمّع العمليات حسب اليوم، من الأحدث للأقدم، مع ترتيب داخلي بالوقت */
export function groupByDay(txs: Transaction[], now: Date = new Date()): DayGroup[] {
  const map = new Map<string, Transaction[]>();

  for (const t of txs) {
    const list = map.get(t.date);
    if (list) list.push(t);
    else map.set(t.date, [t]);
  }

  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, list]) => {
      const sorted = [...list].sort((a, b) => {
        const byTime = b.time.localeCompare(a.time);
        return byTime !== 0 ? byTime : b.createdAt - a.createdAt;
      });
      let expenseTotal = 0;
      let incomeTotal = 0;
      for (const t of sorted) {
        if (t.type === 'expense') expenseTotal += t.amountMinor;
        else incomeTotal += t.amountMinor;
      }
      return { date, label: formatDateRelative(date, now), transactions: sorted, expenseTotal, incomeTotal };
    });
}
