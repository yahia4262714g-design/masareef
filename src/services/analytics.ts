/**
 * محرّك التحليلات — كل الحسابات على الوحدة الصغرى (أعداد صحيحة).
 * دوال نقية بالكامل: تأخذ عمليات وتعيد أرقامًا، بلا أي أثر جانبي.
 */

import type { Category, Transaction, TxType } from '@/types';
import {
  type DateRange, diffDays, fromKey, rangeDays, todayKey, toKey, addDays, AR_DAYS,
} from './dates';
import { averageMinor, changePercent, sumMinor } from './money';

export function filterByRange(txs: Transaction[], range: DateRange): Transaction[] {
  return txs.filter((t) => t.date >= range.start && t.date <= range.end);
}

export function filterByType(txs: Transaction[], type: TxType): Transaction[] {
  return txs.filter((t) => t.type === type);
}

export function totalOf(txs: Transaction[]): number {
  return sumMinor(txs.map((t) => t.amountMinor));
}

export interface PeriodTotals {
  expense: number;
  income: number;
  net: number;
  count: number;
  /** معدل الادخار كنسبة مئوية، null إذا لم يوجد دخل */
  savingsRate: number | null;
}

export function periodTotals(txs: Transaction[]): PeriodTotals {
  let expense = 0;
  let income = 0;
  for (const t of txs) {
    if (t.type === 'expense') expense += t.amountMinor;
    else income += t.amountMinor;
  }
  const net = income - expense;
  return {
    expense,
    income,
    net,
    count: txs.length,
    savingsRate: income > 0 ? (net / income) * 100 : null,
  };
}

/* ============================================================
   التجميع حسب الفئة
   ============================================================ */

export interface CategoryTotal {
  categoryId: string;
  category: Category | undefined;
  total: number;
  count: number;
  /** النسبة من الإجمالي (0-100) */
  share: number;
}

export function totalsByCategory(
  txs: Transaction[],
  categories: Map<string, Category>,
): CategoryTotal[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const t of txs) {
    const entry = map.get(t.categoryId) ?? { total: 0, count: 0 };
    entry.total += t.amountMinor;
    entry.count += 1;
    map.set(t.categoryId, entry);
  }

  const grand = sumMinor([...map.values()].map((v) => v.total));

  return [...map.entries()]
    .map(([categoryId, v]) => ({
      categoryId,
      category: categories.get(categoryId),
      total: v.total,
      count: v.count,
      share: grand > 0 ? (v.total / grand) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/* ============================================================
   السلاسل الزمنية
   ============================================================ */

export interface DayPoint {
  date: string;
  total: number;
  count: number;
}

/** إجمالي كل يوم داخل المدى — يشمل الأيام الفارغة بقيمة صفر */
export function dailySeries(txs: Transaction[], range: DateRange): DayPoint[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const t of txs) {
    const e = map.get(t.date) ?? { total: 0, count: 0 };
    e.total += t.amountMinor;
    e.count += 1;
    map.set(t.date, e);
  }

  const out: DayPoint[] = [];
  const days = rangeDays(range);
  const start = fromKey(range.start);
  for (let i = 0; i < days; i++) {
    const key = toKey(addDays(start, i));
    const e = map.get(key);
    out.push({ date: key, total: e?.total ?? 0, count: e?.count ?? 0 });
  }
  return out;
}

/** إجمالي تراكمي — مفيد لرسم اتجاه الإنفاق داخل الشهر */
export function cumulativeSeries(points: DayPoint[]): DayPoint[] {
  let running = 0;
  return points.map((p) => {
    running += p.total;
    return { ...p, total: running };
  });
}

export interface WeekdayTotal {
  weekday: number;
  name: string;
  total: number;
  count: number;
  average: number;
}

/** متوسط الإنفاق حسب يوم الأسبوع — يجيب "أي يوم أصرف فيه أكثر؟" */
export function totalsByWeekday(txs: Transaction[]): WeekdayTotal[] {
  const buckets = Array.from({ length: 7 }, (_, i) => ({
    weekday: i,
    name: AR_DAYS[i],
    total: 0,
    count: 0,
    days: new Set<string>(),
  }));

  for (const t of txs) {
    const wd = fromKey(t.date).getDay();
    buckets[wd].total += t.amountMinor;
    buckets[wd].count += 1;
    buckets[wd].days.add(t.date);
  }

  return buckets.map((b) => ({
    weekday: b.weekday,
    name: b.name,
    total: b.total,
    count: b.count,
    average: b.days.size > 0 ? averageMinor(b.total, b.days.size) : 0,
  }));
}

/* ============================================================
   المقارنة والتوقّع
   ============================================================ */

export interface Comparison {
  current: number;
  previous: number;
  diff: number;
  /** نسبة التغيّر، null إذا كانت الفترة السابقة صفرًا */
  percent: number | null;
  direction: 'up' | 'down' | 'same';
}

export function compare(current: number, previous: number): Comparison {
  const diff = current - previous;
  return {
    current,
    previous,
    diff,
    percent: changePercent(current, previous),
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same',
  };
}

export interface Projection {
  /** ما صُرف حتى الآن */
  spent: number;
  /** الأيام المنقضية من الفترة (شاملة اليوم الحالي) */
  elapsedDays: number;
  /** إجمالي أيام الفترة */
  totalDays: number;
  /** المتوسط اليومي حتى الآن */
  dailyAverage: number;
  /** التوقّع لنهاية الفترة */
  projected: number;
}

/**
 * يتوقّع إجمالي الإنفاق في نهاية الفترة بناءً على المعدل الحالي.
 * إذا انتهت الفترة، التوقّع = الفعلي.
 */
export function projectPeriod(
  txs: Transaction[],
  range: DateRange,
  now: Date = new Date(),
): Projection {
  const spent = totalOf(txs);
  const totalDays = rangeDays(range);
  const today = todayKey(now);

  let elapsedDays: number;
  if (today < range.start) elapsedDays = 0;
  else if (today > range.end) elapsedDays = totalDays;
  else elapsedDays = diffDays(today, range.start) + 1;

  const dailyAverage = elapsedDays > 0 ? averageMinor(spent, elapsedDays) : 0;
  // إذا انتهت الفترة فالتوقّع هو الفعلي بالضبط — لا تقريب يشوّه الرقم
  const projected =
    elapsedDays >= totalDays ? spent : elapsedDays > 0 ? Math.round((spent * totalDays) / elapsedDays) : 0;

  return { spent, elapsedDays, totalDays, dailyAverage, projected };
}

/* ============================================================
   الأنماط غير المعتادة
   ============================================================ */

export interface Outlier {
  transaction: Transaction;
  /** كم ضعفًا يزيد عن المعتاد في فئته */
  ratio: number;
  categoryAverage: number;
}

/**
 * يكشف المصاريف غير المعتادة: عملية تتجاوز ضعف متوسط فئتها
 * بشرط وجود عدد كافٍ من العمليات في تلك الفئة.
 */
export function findOutliers(
  txs: Transaction[],
  opts: { minCount?: number; thresholdRatio?: number } = {},
): Outlier[] {
  const { minCount = 4, thresholdRatio = 2.2 } = opts;

  const byCat = new Map<string, Transaction[]>();
  for (const t of txs) {
    if (t.type !== 'expense') continue;
    const list = byCat.get(t.categoryId) ?? [];
    list.push(t);
    byCat.set(t.categoryId, list);
  }

  const out: Outlier[] = [];
  for (const [, list] of byCat) {
    if (list.length < minCount) continue;
    // نستخدم الوسيط بدل المتوسط لتقليل تأثير القيم الشاذة نفسها
    const sorted = [...list].map((t) => t.amountMinor).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median <= 0) continue;

    for (const t of list) {
      const ratio = t.amountMinor / median;
      if (ratio >= thresholdRatio) {
        out.push({ transaction: t, ratio, categoryAverage: median });
      }
    }
  }

  return out.sort((a, b) => b.transaction.amountMinor - a.transaction.amountMinor);
}

/* ============================================================
   البحث
   ============================================================ */

/** بحث سريع عبر الوصف والتاجر والملاحظات والوسوم والمبلغ */
export function searchTransactions(
  txs: Transaction[],
  query: string,
  categories: Map<string, Category>,
): Transaction[] {
  const q = query.trim().toLowerCase();
  if (!q) return txs;

  // البحث برقم: يطابق المبلغ
  const asNumber = q.replace(/[^\d.]/g, '');
  const numeric = asNumber.length > 0 && /^\d/.test(q);

  return txs.filter((t) => {
    if (numeric) {
      const major = String(t.amountMinor / 100);
      if (major.startsWith(asNumber) || String(t.amountMinor).startsWith(asNumber)) return true;
    }
    const cat = categories.get(t.categoryId);
    const haystack = [
      t.description ?? '',
      t.merchant ?? '',
      t.notes ?? '',
      (t.tags ?? []).join(' '),
      cat?.name ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
