import { describe, it, expect } from 'vitest';
import {
  toMinor, toMajor, formatAmount, formatMoney, formatCompact,
  sumMinor, splitMinor, percentOfMinor, changePercent, averageMinor, normalizeDigits,
} from './money';

describe('toMinor — التحويل إلى الوحدة الصغرى', () => {
  it('أعداد صحيحة', () => {
    expect(toMinor('5')).toBe(500);
    expect(toMinor(5)).toBe(500);
    expect(toMinor('0')).toBe(0);
  });

  it('كسور عشرية', () => {
    expect(toMinor('5.5')).toBe(550);
    expect(toMinor('5.55')).toBe(555);
    expect(toMinor('0.1')).toBe(10);
    expect(toMinor('0.2')).toBe(20);
  });

  it('لا يقع في خطأ الفاصلة العائمة الشهير', () => {
    // 0.1 + 0.2 يجب أن يساوي 0.30 بالضبط
    expect(toMinor('0.1') + toMinor('0.2')).toBe(30);
    expect(toMajor(toMinor('0.1') + toMinor('0.2'))).toBe(0.3);
    expect(toMinor(0.1) + toMinor(0.2)).toBe(30);
  });

  it('التقريب عند تجاوز الخانات', () => {
    expect(toMinor('5.554')).toBe(555);
    expect(toMinor('5.555')).toBe(556);
    expect(toMinor('5.559')).toBe(556);
  });

  it('أرقام عربية-هندية', () => {
    expect(toMinor('٥')).toBe(500);
    expect(toMinor('١٢٫٥')).toBe(1250);
  });

  it('فواصل الآلاف', () => {
    expect(toMinor('1,200')).toBe(120000);
    expect(toMinor('1 200')).toBe(120000);
  });

  it('عملة بثلاث خانات (دينار)', () => {
    expect(toMinor('5', 'JOD')).toBe(5000);
    expect(toMinor('5.25', 'JOD')).toBe(5250);
    expect(toMinor('0.001', 'JOD')).toBe(1);
  });

  it('قيم غير صالحة', () => {
    expect(toMinor('')).toBe(0);
    expect(toMinor('abc')).toBe(0);
    expect(toMinor(NaN)).toBe(0);
    expect(toMinor(Infinity)).toBe(0);
  });

  it('قيم سالبة', () => {
    expect(toMinor('-5.5')).toBe(-550);
    expect(toMinor(-5.5)).toBe(-550);
  });
});

describe('التنسيق', () => {
  it('formatAmount', () => {
    expect(formatAmount(500)).toBe('5');
    expect(formatAmount(550)).toBe('5.50');
    expect(formatAmount(120000)).toBe('1,200');
    expect(formatAmount(500, 'ILS', { showDecimals: 'always' })).toBe('5.00');
    expect(formatAmount(550, 'ILS', { showDecimals: 'never' })).toBe('5');
  });

  it('formatMoney', () => {
    expect(formatMoney(500)).toBe('5 ₪');
    expect(formatMoney(1250, 'USD')).toBe('12.50 $');
  });

  it('formatCompact', () => {
    expect(formatCompact(500)).toBe('5');
    expect(formatCompact(1_500_00)).toBe('1,500');
    expect(formatCompact(15_000_00)).toBe('15.0ألف');
  });

  it('المبالغ السالبة', () => {
    expect(formatAmount(-550)).toBe('-5.50');
  });
});

describe('العمليات الحسابية', () => {
  it('sumMinor دقيق تمامًا', () => {
    const values = Array.from({ length: 1000 }, () => 10); // 1000 × 0.10 ₪
    expect(sumMinor(values)).toBe(10000); // = 100.00 ₪ بالضبط
  });

  it('splitMinor لا يضيّع أي أغورة', () => {
    const parts = splitMinor(1000, 3);
    expect(parts).toEqual([334, 333, 333]);
    expect(sumMinor(parts)).toBe(1000);

    const p2 = splitMinor(100, 7);
    expect(sumMinor(p2)).toBe(100);
  });

  it('percentOfMinor', () => {
    expect(percentOfMinor(10000, 30)).toBe(3000);
    expect(percentOfMinor(3333, 33)).toBe(1100);
  });

  it('changePercent', () => {
    expect(changePercent(120, 100)).toBe(20);
    expect(changePercent(80, 100)).toBe(-20);
    expect(changePercent(50, 0)).toBeNull();
  });

  it('averageMinor', () => {
    expect(averageMinor(1000, 3)).toBe(333);
    expect(averageMinor(0, 0)).toBe(0);
  });
});

describe('normalizeDigits', () => {
  it('يحوّل الأرقام العربية والفارسية', () => {
    expect(normalizeDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
    expect(normalizeDigits('۰۱۲۳')).toBe('0123');
    expect(normalizeDigits('abc123')).toBe('abc123');
  });
});
