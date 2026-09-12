/**
 * محرّك الرؤى المحلي — يولّد جملًا عربية مفيدة من حسابات حقيقية فقط.
 * لا توجد أي رؤية عشوائية أو وهمية: كل رؤية مبنية على بيانات موجودة،
 * ولها شرط حد أدنى يمنع إظهارها عند قلة البيانات.
 */

import type { Budget, Category, Transaction } from '@/types';
import {
  type DateRange, AR_DAYS, formatDateRelative, rangeDays,
} from './dates';
import { formatMoney, percentOfMinor, ratioPercent } from './money';
import {
  compare, filterByType, findOutliers, periodTotals, projectPeriod,
  totalsByCategory, totalsByWeekday, totalOf,
} from './analytics';

export type InsightTone = 'neutral' | 'positive' | 'warning' | 'danger';

export interface Insight {
  id: string;
  text: string;
  tone: InsightTone;
  icon: string;
  /** أولوية العرض — الأعلى يظهر أولاً */
  priority: number;
}

export interface InsightInput {
  currentTxs: Transaction[];
  previousTxs: Transaction[];
  range: DateRange;
  categories: Map<string, Category>;
  budgets: Budget[];
  currency: string;
  now?: Date;
}

/** يبني قائمة الرؤى مرتّبة حسب الأهمية */
export function buildInsights(input: InsightInput): Insight[] {
  const { currentTxs, previousTxs, range, categories, budgets, currency } = input;
  const now = input.now ?? new Date();
  const out: Insight[] = [];

  const curExpenses = filterByType(currentTxs, 'expense');
  const prevExpenses = filterByType(previousTxs, 'expense');
  const curTotal = totalOf(curExpenses);
  const prevTotal = totalOf(prevExpenses);

  const money = (v: number) => formatMoney(v, currency, { showDecimals: 'never' });

  /* ---- 1) تجاوز الميزانية العامة ---- */
  const overall = budgets.find((b) => b.categoryId === null && b.active);
  if (overall && overall.amountMinor > 0) {
    const used = ratioPercent(curTotal, overall.amountMinor);
    if (curTotal > overall.amountMinor) {
      out.push({
        id: 'budget-over',
        text: `تجاوزت الميزانية الشهرية بمقدار ${money(curTotal - overall.amountMinor)}.`,
        tone: 'danger',
        icon: 'alert',
        priority: 100,
      });
    } else if (used >= 85) {
      out.push({
        id: 'budget-near',
        text: `استخدمت ${Math.round(used)}٪ من ميزانيتك الشهرية، وباقي ${money(overall.amountMinor - curTotal)}.`,
        tone: 'warning',
        icon: 'alert',
        priority: 92,
      });
    }
  }

  /* ---- 2) ميزانيات الفئات ---- */
  const catTotals = totalsByCategory(curExpenses, categories);
  const catTotalMap = new Map(catTotals.map((c) => [c.categoryId, c.total]));

  for (const b of budgets) {
    if (!b.active || b.categoryId === null || b.amountMinor <= 0) continue;
    const spent = catTotalMap.get(b.categoryId) ?? 0;
    const cat = categories.get(b.categoryId);
    if (!cat) continue;
    const used = ratioPercent(spent, b.amountMinor);

    if (spent > b.amountMinor) {
      out.push({
        id: `budget-cat-over-${b.categoryId}`,
        text: `تجاوزت ميزانية ${cat.name} بمقدار ${money(spent - b.amountMinor)}.`,
        tone: 'danger',
        icon: 'alert',
        priority: 95,
      });
    } else if (used >= 85) {
      out.push({
        id: `budget-cat-near-${b.categoryId}`,
        text: `اقتربت من حد ميزانية ${cat.name} — استخدمت ${Math.round(used)}٪.`,
        tone: 'warning',
        icon: 'alert',
        priority: 88,
      });
    }
  }

  /* ---- 3) مقارنة بالفترة السابقة ---- */
  if (prevTotal > 0 && curTotal > 0) {
    const cmp = compare(curTotal, prevTotal);
    if (cmp.percent !== null && Math.abs(cmp.percent) >= 12) {
      const pct = Math.abs(Math.round(cmp.percent));
      if (cmp.direction === 'up') {
        out.push({
          id: 'period-up',
          text: `مصروفك في هذه الفترة أعلى بـ ${pct}٪ من الفترة السابقة.`,
          tone: 'warning',
          icon: 'trend-up',
          priority: 70,
        });
      } else {
        out.push({
          id: 'period-down',
          text: `أحسنت — مصروفك أقل بـ ${pct}٪ من الفترة السابقة، ووفّرت ${money(Math.abs(cmp.diff))}.`,
          tone: 'positive',
          icon: 'trend-down',
          priority: 72,
        });
      }
    }
  }

  /* ---- 4) أكبر فئة صاعدة ---- */
  const prevCatTotals = new Map(
    totalsByCategory(prevExpenses, categories).map((c) => [c.categoryId, c.total]),
  );
  let biggestRise: { name: string; percent: number; diff: number } | null = null;
  for (const c of catTotals) {
    const prev = prevCatTotals.get(c.categoryId) ?? 0;
    if (prev <= 0 || c.total <= prev) continue;
    const pct = ((c.total - prev) / prev) * 100;
    // نتجاهل الفروقات الصغيرة بالقيمة المطلقة حتى لا تكون النسبة مضلّلة
    if (pct < 18 || c.total - prev < 1000) continue;
    if (!biggestRise || pct > biggestRise.percent) {
      biggestRise = { name: c.category?.name ?? 'فئة', percent: pct, diff: c.total - prev };
    }
  }
  if (biggestRise) {
    out.push({
      id: 'cat-rise',
      text: `صرفك على ${biggestRise.name} ارتفع ${Math.round(biggestRise.percent)}٪ مقارنة بالفترة السابقة.`,
      tone: 'warning',
      icon: 'trend-up',
      priority: 80,
    });
  }

  /* ---- 5) التوقّع لنهاية الفترة ---- */
  const proj = projectPeriod(curExpenses, range, now);
  if (proj.elapsedDays >= 3 && proj.elapsedDays < proj.totalDays && proj.spent > 0) {
    out.push({
      id: 'projection',
      text: `إذا استمررت على نفس المعدل، قد يصل إجمالي مصروفك في هذه الفترة إلى ${money(proj.projected)}.`,
      tone: overall && proj.projected > overall.amountMinor ? 'warning' : 'neutral',
      icon: 'chart',
      priority: 65,
    });
  }

  /* ---- 6) المتوسط اليومي ---- */
  if (proj.elapsedDays >= 3 && proj.dailyAverage > 0) {
    out.push({
      id: 'daily-avg',
      text: `متوسط صرفك اليومي في هذه الفترة هو ${money(proj.dailyAverage)}.`,
      tone: 'neutral',
      icon: 'calendar',
      priority: 50,
    });
  }

  /* ---- 7) اليوم الأكثر إنفاقًا ---- */
  if (curExpenses.length >= 12 && rangeDays(range) >= 14) {
    const weekdays = totalsByWeekday(curExpenses).filter((w) => w.count > 0);
    if (weekdays.length >= 3) {
      const top = [...weekdays].sort((a, b) => b.average - a.average)[0];
      const rest = weekdays.filter((w) => w.weekday !== top.weekday);
      const restAvg = rest.reduce((s, w) => s + w.average, 0) / Math.max(rest.length, 1);
      if (restAvg > 0 && top.average >= restAvg * 1.35) {
        out.push({
          id: 'top-weekday',
          text: `يوم ${AR_DAYS[top.weekday]} هو اليوم الذي تصرف فيه أكثر عادة.`,
          tone: 'neutral',
          icon: 'calendar',
          priority: 45,
        });
      }
    }
  }

  /* ---- 8) أكبر فئة إنفاق ---- */
  if (catTotals.length >= 2 && curTotal > 0) {
    const top = catTotals[0];
    if (top.share >= 25 && top.category) {
      out.push({
        id: 'top-category',
        text: `أكثر ما تصرف عليه هو ${top.category.name} — ${Math.round(top.share)}٪ من إجمالي مصاريفك.`,
        tone: 'neutral',
        icon: 'pie',
        priority: 60,
      });
    }
  }

  /* ---- 9) مصروف غير معتاد ---- */
  const outliers = findOutliers(curExpenses);
  if (outliers.length > 0) {
    const o = outliers[0];
    const cat = categories.get(o.transaction.categoryId);
    out.push({
      id: 'outlier',
      text: `عملية غير معتادة: ${money(o.transaction.amountMinor)} على ${cat?.name ?? 'فئة'} ${formatDateRelative(o.transaction.date, now)} — أعلى من معتادك بـ ${o.ratio.toFixed(1)} مرة.`,
      tone: 'neutral',
      icon: 'search',
      priority: 55,
    });
  }

  /* ---- 10) معدل الادخار ---- */
  const totals = periodTotals(currentTxs);
  if (totals.income > 0 && totals.savingsRate !== null) {
    const rate = Math.round(totals.savingsRate);
    if (rate >= 20) {
      out.push({
        id: 'savings-good',
        text: `معدل ادخارك ${rate}٪ من دخلك — نتيجة ممتازة، حافظ عليها.`,
        tone: 'positive',
        icon: 'target',
        priority: 75,
      });
    } else if (rate < 0) {
      out.push({
        id: 'savings-negative',
        text: `مصاريفك في هذه الفترة تجاوزت دخلك بمقدار ${money(Math.abs(totals.net))}.`,
        tone: 'danger',
        icon: 'alert',
        priority: 98,
      });
    }
  }

  /* ---- 11) يوم بلا مصاريف (تشجيع لطيف) ---- */
  if (curExpenses.length === 0 && rangeDays(range) === 1) {
    out.push({
      id: 'no-spend',
      text: 'ما سجّلت أي مصروف اليوم.',
      tone: 'neutral',
      icon: 'check',
      priority: 20,
    });
  }

  return out.sort((a, b) => b.priority - a.priority);
}

/* ============================================================
   توصيات التوفير
   ============================================================ */

export type SavingLevel = 'light' | 'medium' | 'strong';

export const SAVING_LEVELS: Record<SavingLevel, { label: string; percent: number; hint: string }> = {
  light: { label: 'خفيف', percent: 10, hint: 'تقليل بسيط لا يُشعرك بفرق كبير' },
  medium: { label: 'متوسط', percent: 20, hint: 'يحتاج انتباهًا لكنه واقعي' },
  strong: { label: 'قوي', percent: 30, hint: 'يتطلب التزامًا حقيقيًا' },
};

export interface SavingOpportunity {
  categoryId: string;
  categoryName: string;
  colorIndex: number;
  icon: string;
  currentMinor: number;
  /** التوفير المحتمل لكل مستوى */
  savings: Record<SavingLevel, number>;
}

export interface SavingsPlan {
  opportunities: SavingOpportunity[];
  /** إجمالي التوفير المحتمل لكل مستوى */
  totals: Record<SavingLevel, number>;
  /** هل توجد بيانات كافية؟ */
  hasEnoughData: boolean;
}

/**
 * يبني خطة توفير من الفئات المرنة والترفيهية فقط.
 * لا يقترح أبدًا تقليل الفئات الضرورية (صحة، فواتير، تعليم...).
 */
export function buildSavingsPlan(
  expenses: Transaction[],
  categories: Map<string, Category>,
  opts: { topN?: number; minAmountMinor?: number } = {},
): SavingsPlan {
  const { topN = 3, minAmountMinor = 2000 } = opts;

  const totals = totalsByCategory(expenses, categories);
  const eligible = totals.filter((c) => {
    const cat = c.category;
    if (!cat) return false;
    if (cat.kind === 'essential') return false;
    return c.total >= minAmountMinor;
  });

  const opportunities: SavingOpportunity[] = eligible.slice(0, topN).map((c) => ({
    categoryId: c.categoryId,
    categoryName: c.category?.name ?? 'فئة',
    colorIndex: c.category?.colorIndex ?? 1,
    icon: c.category?.icon ?? 'more',
    currentMinor: c.total,
    savings: {
      light: percentOfMinor(c.total, SAVING_LEVELS.light.percent),
      medium: percentOfMinor(c.total, SAVING_LEVELS.medium.percent),
      strong: percentOfMinor(c.total, SAVING_LEVELS.strong.percent),
    },
  }));

  const sumLevel = (lvl: SavingLevel) =>
    opportunities.reduce((s, o) => s + o.savings[lvl], 0);

  return {
    opportunities,
    totals: {
      light: sumLevel('light'),
      medium: sumLevel('medium'),
      strong: sumLevel('strong'),
    },
    hasEnoughData: opportunities.length > 0 && expenses.length >= 5,
  };
}
