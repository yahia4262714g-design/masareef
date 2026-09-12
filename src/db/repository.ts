/**
 * طبقة الوصول للبيانات — كل الكتابة تمر من هنا.
 * الفائدة: منطق واحد للتحقّق والطوابع الزمنية، وسهولة الاختبار.
 */

import { db, uid } from './db';
import type { Budget, Category, SavingsGoal, Transaction } from '@/types';
import { clearParserCache } from '@/services/parser';

/* ============================================================
   العمليات
   ============================================================ */

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> &
  Partial<Pick<Transaction, 'id' | 'createdAt' | 'updatedAt'>>;

export async function addTransaction(input: NewTransaction): Promise<Transaction> {
  const now = Date.now();
  const tx: Transaction = {
    ...input,
    id: input.id ?? uid(),
    amountMinor: Math.round(Math.abs(input.amountMinor)),
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };
  await db.transactions.put(tx);
  return tx;
}

export async function updateTransaction(
  id: string,
  patch: Partial<Omit<Transaction, 'id' | 'createdAt'>>,
): Promise<void> {
  const clean = { ...patch, updatedAt: Date.now() };
  if (clean.amountMinor !== undefined) clean.amountMinor = Math.round(Math.abs(clean.amountMinor));
  await db.transactions.update(id, clean);
}

/**
 * يحذف العملية ويعيد نسخة كاملة منها.
 * النسخة تُستخدم في "تراجع" لاستعادة العملية بنفس المُعرّف والبيانات.
 */
export async function deleteTransaction(id: string): Promise<Transaction | undefined> {
  return db.transaction('rw', db.transactions, async () => {
    const existing = await db.transactions.get(id);
    if (!existing) return undefined;
    await db.transactions.delete(id);
    return existing;
  });
}

/** يستعيد عملية محذوفة كما كانت تمامًا */
export async function restoreTransaction(tx: Transaction): Promise<void> {
  await db.transactions.put(tx);
}

/** ينسخ عملية سابقة إلى اليوم — بديل خفيف للمعاملات المتكررة */
export async function duplicateTransaction(
  source: Transaction,
  date: string,
  time: string,
): Promise<Transaction> {
  return addTransaction({
    ...source,
    id: uid(),
    date,
    time,
    source: 'duplicate',
    createdAt: Date.now(),
  });
}

/* ============================================================
   الفئات
   ============================================================ */

export type NewCategory = Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'isDefault' | 'order'> &
  Partial<Pick<Category, 'id' | 'order'>>;

export async function addCategory(input: NewCategory): Promise<Category> {
  const now = Date.now();
  const maxOrder = (await db.categories.orderBy('order').last())?.order ?? 0;
  const cat: Category = {
    ...input,
    id: input.id ?? uid(),
    isDefault: false,
    order: input.order ?? maxOrder + 1,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.categories.put(cat);
  clearParserCache();
  return cat;
}

export async function updateCategory(
  id: string,
  patch: Partial<Omit<Category, 'id' | 'createdAt' | 'isDefault'>>,
): Promise<void> {
  await db.categories.update(id, { ...patch, updatedAt: Date.now() });
  clearParserCache();
}

/**
 * يحذف فئة بأمان:
 * - الفئات الافتراضية تُؤرشَف فقط (لا تُحذف) حتى لا تتعطّل البيانات القديمة.
 * - عمليات الفئة تُنقل إلى فئة بديلة، ولا تُحذف أبدًا.
 */
export async function deleteCategory(id: string, moveToId: string): Promise<number> {
  return db.transaction('rw', db.categories, db.transactions, db.budgets, async () => {
    const cat = await db.categories.get(id);
    if (!cat) return 0;

    const affected = await db.transactions.where('categoryId').equals(id).toArray();
    for (const t of affected) {
      await db.transactions.update(t.id, { categoryId: moveToId, updatedAt: Date.now() });
    }

    // ميزانيات هذه الفئة تُحذف لأنها بلا معنى بعد حذفها
    const budgets = await db.budgets.where('categoryId').equals(id).toArray();
    await db.budgets.bulkDelete(budgets.map((b) => b.id));

    if (cat.isDefault) {
      await db.categories.update(id, { archived: true, updatedAt: Date.now() });
    } else {
      await db.categories.delete(id);
    }

    clearParserCache();
    return affected.length;
  });
}

/** يدمج فئة داخل أخرى: ينقل كل العمليات ثم يزيل المصدر */
export async function mergeCategories(fromId: string, intoId: string): Promise<number> {
  if (fromId === intoId) return 0;
  return deleteCategory(fromId, intoId);
}

/* ============================================================
   الميزانيات
   ============================================================ */

export async function setBudget(
  categoryId: string | null,
  amountMinor: number,
  currency: string,
): Promise<void> {
  const now = Date.now();
  const existing = (await db.budgets.toArray()).find((b) => b.categoryId === categoryId);

  if (amountMinor <= 0) {
    if (existing) await db.budgets.delete(existing.id);
    return;
  }

  if (existing) {
    await db.budgets.update(existing.id, {
      amountMinor: Math.round(amountMinor),
      currency,
      active: true,
      updatedAt: now,
    });
    return;
  }

  const budget: Budget = {
    id: uid(),
    categoryId,
    amountMinor: Math.round(amountMinor),
    currency,
    period: 'monthly',
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  await db.budgets.put(budget);
}

export async function deleteBudget(id: string): Promise<void> {
  await db.budgets.delete(id);
}

/* ============================================================
   أهداف الادخار
   ============================================================ */

export type NewGoal = Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt' | 'archived'>;

export async function addGoal(input: NewGoal): Promise<SavingsGoal> {
  const now = Date.now();
  const goal: SavingsGoal = { ...input, id: uid(), archived: false, createdAt: now, updatedAt: now };
  await db.savingsGoals.put(goal);
  return goal;
}

export async function updateGoal(id: string, patch: Partial<SavingsGoal>): Promise<void> {
  await db.savingsGoals.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteGoal(id: string): Promise<void> {
  await db.savingsGoals.delete(id);
}

/** يضيف مبلغًا لهدف ادخار (أو يخصمه إذا كان سالبًا) */
export async function contributeToGoal(id: string, deltaMinor: number): Promise<void> {
  const goal = await db.savingsGoals.get(id);
  if (!goal) return;
  const next = Math.max(0, goal.savedMinor + Math.round(deltaMinor));
  await db.savingsGoals.update(id, { savedMinor: next, updatedAt: Date.now() });
}
