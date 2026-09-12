import { describe, it, expect } from 'vitest';
import {
  toKey, fromKey, addDays, addMonths, diffDays, startOfWeek, weekRange,
  financialMonthRange, yearRange, dayRange, formatDateRelative, formatDate,
  rangeDays, inRange, daysInMonth,
} from './dates';

describe('المفاتيح والتحويل', () => {
  it('toKey/fromKey ذهابًا وإيابًا', () => {
    const d = new Date(2026, 8, 12);
    expect(toKey(d)).toBe('2026-09-12');
    expect(toKey(fromKey('2026-09-12'))).toBe('2026-09-12');
  });

  it('لا ينزاح اليوم بسبب المنطقة الزمنية', () => {
    // منتصف الليل تمامًا
    expect(toKey(new Date(2026, 0, 1, 0, 0, 0))).toBe('2026-01-01');
    // قبل منتصف الليل بدقيقة
    expect(toKey(new Date(2026, 0, 1, 23, 59, 59))).toBe('2026-01-01');
  });

  it('addDays عبر حدود الشهر والسنة', () => {
    expect(toKey(addDays(fromKey('2026-01-31'), 1))).toBe('2026-02-01');
    expect(toKey(addDays(fromKey('2026-12-31'), 1))).toBe('2027-01-01');
    expect(toKey(addDays(fromKey('2026-03-01'), -1))).toBe('2026-02-28');
  });

  it('addMonths يحترم نهاية الشهر', () => {
    expect(toKey(addMonths(fromKey('2026-01-31'), 1))).toBe('2026-02-28');
    expect(toKey(addMonths(fromKey('2024-01-31'), 1))).toBe('2024-02-29'); // سنة كبيسة
  });

  it('daysInMonth', () => {
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2026, 0)).toBe(31);
  });

  it('diffDays', () => {
    expect(diffDays('2026-09-12', '2026-09-10')).toBe(2);
    expect(diffDays('2026-09-10', '2026-09-12')).toBe(-2);
    expect(diffDays('2026-01-01', '2025-12-31')).toBe(1);
  });
});

describe('الأسبوع', () => {
  it('يبدأ السبت (weekStartDay=6)', () => {
    // 2026-09-12 هو السبت
    const sat = new Date(2026, 8, 12);
    expect(toKey(startOfWeek(sat, 6))).toBe('2026-09-12');
    // الأحد بعده ينتمي لنفس الأسبوع
    expect(toKey(startOfWeek(new Date(2026, 8, 13), 6))).toBe('2026-09-12');
    // الجمعة قبله ينتمي للأسبوع السابق
    expect(toKey(startOfWeek(new Date(2026, 8, 11), 6))).toBe('2026-09-05');
  });

  it('يبدأ الإثنين (weekStartDay=1)', () => {
    expect(toKey(startOfWeek(new Date(2026, 8, 12), 1))).toBe('2026-09-07');
  });

  it('weekRange يغطي 7 أيام', () => {
    const r = weekRange(new Date(2026, 8, 12), 6);
    expect(r.start).toBe('2026-09-12');
    expect(r.end).toBe('2026-09-18');
    expect(rangeDays(r)).toBe(7);
  });

  it('الأسبوع الماضي', () => {
    const r = weekRange(new Date(2026, 8, 12), 6, -1);
    expect(r.start).toBe('2026-09-05');
    expect(r.end).toBe('2026-09-11');
    expect(r.label).toBe('الأسبوع الماضي');
  });
});

describe('الشهر المالي', () => {
  it('يوم البداية = 1 يعطي الشهر التقويمي', () => {
    const r = financialMonthRange(new Date(2026, 8, 12), 1);
    expect(r.start).toBe('2026-09-01');
    expect(r.end).toBe('2026-09-30');
  });

  it('يوم البداية = 25 والتاريخ بعده', () => {
    const r = financialMonthRange(new Date(2026, 8, 28), 25);
    expect(r.start).toBe('2026-09-25');
    expect(r.end).toBe('2026-10-24');
  });

  it('يوم البداية = 25 والتاريخ قبله', () => {
    const r = financialMonthRange(new Date(2026, 8, 12), 25);
    expect(r.start).toBe('2026-08-25');
    expect(r.end).toBe('2026-09-24');
  });

  it('الشهر الماضي', () => {
    const r = financialMonthRange(new Date(2026, 8, 12), 25, -1);
    expect(r.start).toBe('2026-07-25');
    expect(r.end).toBe('2026-08-24');
    expect(r.label).toBe('الشهر الماضي');
  });

  it('يعبر حدود السنة بشكل صحيح', () => {
    const r = financialMonthRange(new Date(2026, 0, 10), 25);
    expect(r.start).toBe('2025-12-25');
    expect(r.end).toBe('2026-01-24');
  });

  it('الشهور المتتالية متلاصقة بلا فجوات', () => {
    const cur = financialMonthRange(new Date(2026, 8, 12), 25);
    const prev = financialMonthRange(new Date(2026, 8, 12), 25, -1);
    expect(diffDays(cur.start, prev.end)).toBe(1);
  });

  it('يقصّ يوم البداية إلى 28 كحد أقصى', () => {
    const r = financialMonthRange(new Date(2026, 8, 12), 31);
    expect(r.start).toBe('2026-08-28');
  });
});

describe('السنة واليوم', () => {
  it('yearRange', () => {
    const r = yearRange(new Date(2026, 8, 12));
    expect(r.start).toBe('2026-01-01');
    expect(r.end).toBe('2026-12-31');
    expect(rangeDays(r)).toBe(365);
  });

  it('dayRange', () => {
    expect(dayRange(new Date(2026, 8, 12)).start).toBe('2026-09-12');
    expect(dayRange(new Date(2026, 8, 12), -1).label).toBe('أمس');
  });

  it('inRange', () => {
    const r = { start: '2026-09-01', end: '2026-09-30', label: '' };
    expect(inRange('2026-09-01', r)).toBe(true);
    expect(inRange('2026-09-30', r)).toBe(true);
    expect(inRange('2026-08-31', r)).toBe(false);
    expect(inRange('2026-10-01', r)).toBe(false);
  });
});

describe('التنسيق العربي', () => {
  const now = new Date(2026, 8, 12);

  it('formatDateRelative', () => {
    expect(formatDateRelative('2026-09-12', now)).toBe('اليوم');
    expect(formatDateRelative('2026-09-11', now)).toBe('أمس');
    expect(formatDateRelative('2026-09-10', now)).toBe('قبل يومين');
  });

  it('formatDate', () => {
    expect(formatDate('2026-09-12', { year: false })).toBe('12 سبتمبر');
    expect(formatDate('2025-09-12', { year: true })).toBe('12 سبتمبر 2025');
  });
});
