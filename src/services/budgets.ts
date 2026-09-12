/** حسابات الميزانيات */

import type { Budget, Category, Transaction } from '@/types';
import { ratioPercent } from './money';
import { filterByType, totalsByCategory } from './analytics';

export type BudgetStatus = 'ok' | 'warning' | 'over';

export interface BudgetProgress {
  budget: Budget;
  category: Category | null;
  /** اسم للعرض */
  name: string;
  spent: number;
  remaining: number;
  /** النسبة المستخدمة (قد تتجاوز 100) */
  percent: number;
  status: BudgetStatus;
  colorIndex: number;
  icon: string;
}

export const WARNING_THRESHOLD = 85;

export function budgetStatus(percent: number): BudgetStatus {
  if (percent > 100) return 'over';
  if (percent >= WARNING_THRESHOLD) return 'warning';
  return 'ok';
}

/** يحسب تقدّم كل الميزانيات النشطة ضمن الفترة المعطاة */
export function computeBudgetProgress(
  txs: Transaction[],
  budgets: Budget[],
  categories: Map<string, Category>,
): BudgetProgress[] {
  const expenses = filterByType(txs, 'expense');
  const totalSpent = expenses.reduce((s, t) => s + t.amountMinor, 0);
  const byCat = new Map(totalsByCategory(expenses, categories).map((c) => [c.categoryId, c.total]));

  return budgets
    .filter((b) => b.active && b.amountMinor > 0)
    .map((b) => {
      const category = b.categoryId ? (categories.get(b.categoryId) ?? null) : null;
      const spent = b.categoryId === null ? totalSpent : (byCat.get(b.categoryId) ?? 0);
      const percent = ratioPercent(spent, b.amountMinor);
      return {
        budget: b,
        category,
        name: category?.name ?? 'الميزانية العامة',
        spent,
        remaining: b.amountMinor - spent,
        percent,
        status: budgetStatus(percent),
        colorIndex: category?.colorIndex ?? 1,
        icon: category?.icon ?? 'wallet',
      };
    })
    .sort((a, b) => {
      // الميزانية العامة أولاً، ثم الأعلى استخدامًا
      if (a.budget.categoryId === null) return -1;
      if (b.budget.categoryId === null) return 1;
      return b.percent - a.percent;
    });
}

/** الميزانية العامة إن وُجدت */
export function findOverallBudget(budgets: Budget[]): Budget | undefined {
  return budgets.find((b) => b.categoryId === null && b.active);
}
