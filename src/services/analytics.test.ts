import { describe, it, expect } from 'vitest';
import type { Budget, Category, Transaction } from '@/types';
import { buildDefaultCategories } from '@/db/categories';
import {
  periodTotals, totalsByCategory, dailySeries, totalsByWeekday,
  projectPeriod, findOutliers, searchTransactions, compare, filterByRange,
} from './analytics';
import { computeBudgetProgress } from './budgets';
import { buildInsights, buildSavingsPlan } from './insights';

const cats = new Map<string, Category>(buildDefaultCategories(0).map((c) => [c.id, c]));

let seq = 0;
function tx(p: Partial<Transaction> & { amountMinor: number; date: string }): Transaction {
  seq++;
  return {
    id: `t${seq}`,
    type: 'expense',
    currency: 'ILS',
    time: '12:00',
    categoryId: 'food',
    source: 'manual',
    createdAt: seq,
    updatedAt: seq,
    ...p,
  } as Transaction;
}

describe('periodTotals', () => {
  it('يحسب المصروف والدخل والصافي', () => {
    const txs = [
      tx({ amountMinor: 1000, date: '2026-09-01' }),
      tx({ amountMinor: 2000, date: '2026-09-02' }),
      tx({ amountMinor: 10000, date: '2026-09-01', type: 'income', categoryId: 'salary' }),
    ];
    const r = periodTotals(txs);
    expect(r.expense).toBe(3000);
    expect(r.income).toBe(10000);
    expect(r.net).toBe(7000);
    expect(r.savingsRate).toBe(70);
    expect(r.count).toBe(3);
  });

  it('معدل الادخار null بدون دخل', () => {
    expect(periodTotals([tx({ amountMinor: 500, date: '2026-09-01' })]).savingsRate).toBeNull();
  });

  it('قائمة فارغة', () => {
    const r = periodTotals([]);
    expect(r.expense).toBe(0);
    expect(r.net).toBe(0);
  });
});

describe('totalsByCategory', () => {
  it('يجمّع ويرتّب تنازليًا ويحسب النسب', () => {
    const txs = [
      tx({ amountMinor: 1000, date: '2026-09-01', categoryId: 'food' }),
      tx({ amountMinor: 3000, date: '2026-09-02', categoryId: 'fuel' }),
      tx({ amountMinor: 1000, date: '2026-09-03', categoryId: 'food' }),
    ];
    const r = totalsByCategory(txs, cats);
    expect(r[0].categoryId).toBe('fuel');
    expect(r[0].total).toBe(3000);
    expect(r[0].share).toBe(60);
    expect(r[1].total).toBe(2000);
    expect(r[1].count).toBe(2);
    // مجموع النسب = 100
    expect(Math.round(r.reduce((s, c) => s + c.share, 0))).toBe(100);
  });
});

describe('dailySeries', () => {
  it('يملأ الأيام الفارغة بصفر', () => {
    const range = { start: '2026-09-01', end: '2026-09-05', label: '' };
    const s = dailySeries([tx({ amountMinor: 500, date: '2026-09-03' })], range);
    expect(s).toHaveLength(5);
    expect(s[0].total).toBe(0);
    expect(s[2].total).toBe(500);
    expect(s[2].date).toBe('2026-09-03');
  });
});

describe('projectPeriod', () => {
  it('يتوقّع بناءً على المعدل الحالي', () => {
    const range = { start: '2026-09-01', end: '2026-09-30', label: '' };
    const txs = Array.from({ length: 10 }, (_, i) =>
      tx({ amountMinor: 3000, date: `2026-09-${String(i + 1).padStart(2, '0')}` }),
    );
    // اليوم = 10 سبتمبر → مرّت 10 أيام من 30
    const p = projectPeriod(txs, range, new Date(2026, 8, 10));
    expect(p.spent).toBe(30000);
    expect(p.elapsedDays).toBe(10);
    expect(p.totalDays).toBe(30);
    expect(p.dailyAverage).toBe(3000);
    expect(p.projected).toBe(90000);
  });

  it('التوقّع = الفعلي بعد انتهاء الفترة', () => {
    const range = { start: '2026-08-01', end: '2026-08-31', label: '' };
    const p = projectPeriod([tx({ amountMinor: 5000, date: '2026-08-05' })], range, new Date(2026, 8, 12));
    expect(p.elapsedDays).toBe(31);
    expect(p.projected).toBe(5000);
  });
});

describe('findOutliers', () => {
  it('يكتشف العملية الشاذة فقط', () => {
    const txs = [
      ...Array.from({ length: 6 }, (_, i) => tx({ amountMinor: 1000, date: `2026-09-0${i + 1}` })),
      tx({ amountMinor: 9000, date: '2026-09-08' }),
    ];
    const o = findOutliers(txs);
    expect(o).toHaveLength(1);
    expect(o[0].transaction.amountMinor).toBe(9000);
  });

  it('لا يبلّغ عند قلة البيانات', () => {
    expect(findOutliers([tx({ amountMinor: 9000, date: '2026-09-01' })])).toHaveLength(0);
  });
});

describe('searchTransactions', () => {
  const txs = [
    tx({ amountMinor: 500, date: '2026-09-01', categoryId: 'coffee', description: 'قهوة الصباح' }),
    tx({ amountMinor: 5000, date: '2026-09-02', categoryId: 'fuel', merchant: 'محطة الوفاء' }),
    tx({ amountMinor: 2000, date: '2026-09-03', categoryId: 'food', notes: 'مع الأصدقاء' }),
  ];

  it('يبحث في الوصف', () => {
    expect(searchTransactions(txs, 'قهوة', cats)).toHaveLength(1);
  });

  it('يبحث في اسم الفئة', () => {
    expect(searchTransactions(txs, 'بنزين', cats)).toHaveLength(1);
  });

  it('يبحث في التاجر', () => {
    expect(searchTransactions(txs, 'الوفاء', cats)).toHaveLength(1);
  });

  it('يبحث في الملاحظات', () => {
    expect(searchTransactions(txs, 'الأصدقاء', cats)).toHaveLength(1);
  });

  it('يبحث بالمبلغ', () => {
    expect(searchTransactions(txs, '50', cats).length).toBeGreaterThan(0);
  });

  it('نص فارغ يعيد الكل', () => {
    expect(searchTransactions(txs, '  ', cats)).toHaveLength(3);
  });
});

describe('الميزانيات', () => {
  const budgets: Budget[] = [
    { id: 'b1', categoryId: null, amountMinor: 150000, currency: 'ILS', period: 'monthly', active: true, createdAt: 0, updatedAt: 0 },
    { id: 'b2', categoryId: 'food', amountMinor: 40000, currency: 'ILS', period: 'monthly', active: true, createdAt: 0, updatedAt: 0 },
  ];

  it('يحسب المصروف والمتبقي والنسبة', () => {
    const txs = [
      tx({ amountMinor: 20000, date: '2026-09-01', categoryId: 'food' }),
      tx({ amountMinor: 10000, date: '2026-09-02', categoryId: 'fuel' }),
    ];
    const p = computeBudgetProgress(txs, budgets, cats);
    const overall = p.find((x) => x.budget.id === 'b1')!;
    expect(overall.spent).toBe(30000);
    expect(overall.remaining).toBe(120000);
    expect(overall.percent).toBe(20);
    expect(overall.status).toBe('ok');

    const food = p.find((x) => x.budget.id === 'b2')!;
    expect(food.spent).toBe(20000);
    expect(food.percent).toBe(50);
  });

  it('يرصد الاقتراب والتجاوز', () => {
    const txs = [tx({ amountMinor: 36000, date: '2026-09-01', categoryId: 'food' })];
    const food = computeBudgetProgress(txs, budgets, cats).find((x) => x.budget.id === 'b2')!;
    expect(food.percent).toBe(90);
    expect(food.status).toBe('warning');

    const over = computeBudgetProgress(
      [tx({ amountMinor: 45000, date: '2026-09-01', categoryId: 'food' })],
      budgets, cats,
    ).find((x) => x.budget.id === 'b2')!;
    expect(over.status).toBe('over');
    expect(over.remaining).toBe(-5000);
  });

  it('يتجاهل الدخل في حساب الميزانية', () => {
    const txs = [
      tx({ amountMinor: 100000, date: '2026-09-01', type: 'income', categoryId: 'salary' }),
      tx({ amountMinor: 5000, date: '2026-09-01', categoryId: 'food' }),
    ];
    const overall = computeBudgetProgress(txs, budgets, cats).find((x) => x.budget.id === 'b1')!;
    expect(overall.spent).toBe(5000);
  });
});

describe('محرّك الرؤى', () => {
  const range = { start: '2026-09-01', end: '2026-09-30', label: 'هذا الشهر' };

  it('ينبّه عند تجاوز الميزانية', () => {
    const budgets: Budget[] = [
      { id: 'b1', categoryId: null, amountMinor: 10000, currency: 'ILS', period: 'monthly', active: true, createdAt: 0, updatedAt: 0 },
    ];
    const ins = buildInsights({
      currentTxs: [tx({ amountMinor: 16000, date: '2026-09-05' })],
      previousTxs: [],
      range, categories: cats, budgets, currency: 'ILS',
      now: new Date(2026, 8, 10),
    });
    const over = ins.find((i) => i.id === 'budget-over');
    expect(over).toBeDefined();
    expect(over!.text).toContain('60 ₪');
    expect(over!.tone).toBe('danger');
  });

  it('يقارن بالفترة السابقة', () => {
    const ins = buildInsights({
      currentTxs: [tx({ amountMinor: 12200, date: '2026-09-05' })],
      previousTxs: [tx({ amountMinor: 10000, date: '2026-08-05' })],
      range, categories: cats, budgets: [], currency: 'ILS',
      now: new Date(2026, 8, 10),
    });
    expect(ins.find((i) => i.id === 'period-up')?.text).toContain('22٪');
  });

  it('لا يولّد رؤى وهمية عند غياب البيانات', () => {
    const ins = buildInsights({
      currentTxs: [], previousTxs: [], range, categories: cats, budgets: [], currency: 'ILS',
      now: new Date(2026, 8, 10),
    });
    // لا يوجد ما يُقال سوى لا شيء
    expect(ins.filter((i) => i.id !== 'no-spend')).toHaveLength(0);
  });

  it('يحسب المتوسط اليومي والتوقّع', () => {
    const txs = Array.from({ length: 10 }, (_, i) =>
      tx({ amountMinor: 2700, date: `2026-09-${String(i + 1).padStart(2, '0')}` }),
    );
    const ins = buildInsights({
      currentTxs: txs, previousTxs: [], range, categories: cats, budgets: [], currency: 'ILS',
      now: new Date(2026, 8, 10),
    });
    expect(ins.find((i) => i.id === 'daily-avg')?.text).toContain('27 ₪');
    expect(ins.find((i) => i.id === 'projection')?.text).toContain('810 ₪');
  });
});

describe('خطة التوفير', () => {
  it('تستثني الفئات الضرورية', () => {
    const txs = [
      tx({ amountMinor: 30000, date: '2026-09-01', categoryId: 'coffee' }),
      tx({ amountMinor: 50000, date: '2026-09-02', categoryId: 'health' }),
      tx({ amountMinor: 40000, date: '2026-09-03', categoryId: 'entertainment' }),
      tx({ amountMinor: 20000, date: '2026-09-04', categoryId: 'bills' }),
      tx({ amountMinor: 25000, date: '2026-09-05', categoryId: 'clothes' }),
    ];
    const plan = buildSavingsPlan(txs, cats);
    const ids = plan.opportunities.map((o) => o.categoryId);
    expect(ids).not.toContain('health');
    expect(ids).not.toContain('bills');
    expect(ids).toContain('entertainment');
    expect(plan.hasEnoughData).toBe(true);
  });

  it('تحسب التوفير لكل مستوى', () => {
    const txs = [
      tx({ amountMinor: 15000, date: '2026-09-01', categoryId: 'coffee' }),
      tx({ amountMinor: 10000, date: '2026-09-02', categoryId: 'entertainment' }),
      tx({ amountMinor: 5000, date: '2026-09-03', categoryId: 'clothes' }),
      tx({ amountMinor: 5000, date: '2026-09-04', categoryId: 'clothes' }),
      tx({ amountMinor: 5000, date: '2026-09-05', categoryId: 'clothes' }),
    ];
    const plan = buildSavingsPlan(txs, cats);
    const coffee = plan.opportunities.find((o) => o.categoryId === 'coffee')!;
    expect(coffee.savings.light).toBe(1500);
    expect(coffee.savings.medium).toBe(3000);
    expect(coffee.savings.strong).toBe(4500);
    expect(plan.totals.strong).toBe(
      plan.opportunities.reduce((s, o) => s + o.savings.strong, 0),
    );
  });

  it('لا تعطي خطة عند قلة البيانات', () => {
    expect(buildSavingsPlan([tx({ amountMinor: 500, date: '2026-09-01' })], cats).hasEnoughData).toBe(false);
  });
});

describe('أدوات مساعدة', () => {
  it('compare', () => {
    expect(compare(120, 100).direction).toBe('up');
    expect(compare(80, 100).direction).toBe('down');
    expect(compare(100, 100).direction).toBe('same');
  });

  it('filterByRange يشمل الطرفين', () => {
    const txs = [
      tx({ amountMinor: 100, date: '2026-08-31' }),
      tx({ amountMinor: 100, date: '2026-09-01' }),
      tx({ amountMinor: 100, date: '2026-09-30' }),
      tx({ amountMinor: 100, date: '2026-10-01' }),
    ];
    expect(filterByRange(txs, { start: '2026-09-01', end: '2026-09-30', label: '' })).toHaveLength(2);
  });

  it('totalsByWeekday يحسب المتوسط لكل يوم', () => {
    // 2026-09-12 سبت، 2026-09-19 سبت
    const txs = [
      tx({ amountMinor: 4000, date: '2026-09-12' }),
      tx({ amountMinor: 6000, date: '2026-09-19' }),
    ];
    const sat = totalsByWeekday(txs).find((w) => w.weekday === 6)!;
    expect(sat.total).toBe(10000);
    expect(sat.average).toBe(5000);
  });
});
