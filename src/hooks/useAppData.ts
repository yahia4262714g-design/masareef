import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '@/db/db';
import type { Budget, Category, SavingsGoal, Settings, Transaction } from '@/types';

/**
 * الإعدادات الحيّة — تتحدّث تلقائيًا عند أي تغيير.
 * قراءة فقط: التهيئة الأولية تتم مرة واحدة في App عبر ensureSeeded،
 * لأن liveQuery لا يسمح بمعاملات كتابة داخله.
 */
export function useSettings(): Settings | undefined {
  return useLiveQuery(() => db.settings.get('app'), []);
}

export function useCategories(): Category[] | undefined {
  return useLiveQuery(() => db.categories.orderBy('order').toArray(), []);
}

/** خريطة الفئات للوصول السريع بالمُعرّف */
export function useCategoryMap(): Map<string, Category> {
  const categories = useCategories();
  return useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories]);
}

export function useBudgets(): Budget[] | undefined {
  return useLiveQuery(() => db.budgets.toArray(), []);
}

export function useSavingsGoals(): SavingsGoal[] | undefined {
  return useLiveQuery(() => db.savingsGoals.filter((g) => !g.archived).toArray(), []);
}

/** كل العمليات مرتّبة من الأحدث للأقدم */
export function useAllTransactions(): Transaction[] | undefined {
  return useLiveQuery(
    () => db.transactions.orderBy('date').reverse().toArray(),
    [],
  );
}

/** عمليات ضمن مدى تاريخي محدّد */
export function useTransactionsInRange(start: string, end: string): Transaction[] | undefined {
  return useLiveQuery(
    () => db.transactions.where('date').between(start, end, true, true).toArray(),
    [start, end],
  );
}
