import { describe, it, expect } from 'vitest';
import { parseArabicTransaction, clearParserCache } from './index';
import { buildDefaultCategories } from '@/db/categories';
import { toKey, addDays } from '../dates';

const categories = buildDefaultCategories(0);
const NOW = new Date(2026, 8, 12, 14, 30); // السبت 12 سبتمبر 2026

function parse(text: string) {
  clearParserCache();
  return parseArabicTransaction(text, { categories, defaultCurrency: 'ILS', now: NOW });
}

const today = toKey(NOW);
const yesterday = toKey(addDays(NOW, -1));
const twoDaysAgo = toKey(addDays(NOW, -2));

describe('الجمل الأساسية من المتطلبات', () => {
  it('صرفت اليوم 5 شيكل على قهوة', () => {
    const r = parse('صرفـت اليوم 5 شيكل على قهوة');
    expect(r.amountMinor).toBe(500);
    expect(r.currency).toBe('ILS');
    expect(r.type).toBe('expense');
    expect(r.categoryId).toBe('coffee');
    expect(r.date).toBe(today);
  });

  it('دفعت 20 شيكل بنزين', () => {
    const r = parse('دفعت 20 شيكل بنزين');
    expect(r.amountMinor).toBe(2000);
    expect(r.categoryId).toBe('fuel');
    expect(r.type).toBe('expense');
    expect(r.date).toBe(today);
  });

  it('مبارح صرفت 35 على أكل', () => {
    const r = parse('مبارح صرفت 35 على أكل');
    expect(r.amountMinor).toBe(3500);
    expect(r.categoryId).toBe('food');
    expect(r.date).toBe(yesterday);
  });

  it('اشتريت قهوة بـ 8 شيكل', () => {
    const r = parse('اشتريت قهوة بـ 8 شيكل');
    expect(r.amountMinor).toBe(800);
    expect(r.categoryId).toBe('coffee');
  });

  it('اليوم دفعت 120 شيكل ملابس', () => {
    const r = parse('اليوم دفعت 120 شيكل ملابس');
    expect(r.amountMinor).toBe(12000);
    expect(r.categoryId).toBe('clothes');
    expect(r.date).toBe(today);
  });

  it('صرفت 10 مواصلات', () => {
    const r = parse('صرفـت 10 مواصلات');
    expect(r.amountMinor).toBe(1000);
    expect(r.categoryId).toBe('transport');
  });

  it('دفعت 15 شيكل على شغلة للبيت', () => {
    const r = parse('دفعت 15 شيكل على شغلة للبيت');
    expect(r.amountMinor).toBe(1500);
    expect(r.categoryId).toBe('home');
  });

  it('قبل يومين صرفت 25 شيكل', () => {
    const r = parse('قبل يومين صرفت 25 شيكل');
    expect(r.amountMinor).toBe(2500);
    expect(r.date).toBe(twoDaysAgo);
  });

  it('قبل يومين دفعت 10 مواصلات', () => {
    const r = parse('قبل يومين دفعت 10 مواصلات');
    expect(r.amountMinor).toBe(1000);
    expect(r.categoryId).toBe('transport');
    expect(r.date).toBe(twoDaysAgo);
  });

  it('مبارح صرفت 35 شيكل على مطعم', () => {
    const r = parse('مبارح صرفت 35 شيكل على مطعم');
    expect(r.amountMinor).toBe(3500);
    expect(r.categoryId).toBe('food');
    expect(r.date).toBe(yesterday);
  });
});

describe('الأرقام والعملات', () => {
  it('يفهم الأرقام العربية-الهندية', () => {
    const r = parse('صرفت ٢٥ شيكل قهوة');
    expect(r.amountMinor).toBe(2500);
  });

  it('يفهم الكسور العشرية', () => {
    const r = parse('دفعت 12.50 شيكل قهوة');
    expect(r.amountMinor).toBe(1250);
  });

  it('يفهم الفاصلة العشرية العربية', () => {
    const r = parse('دفعت 12٫5 شيكل قهوة');
    expect(r.amountMinor).toBe(1250);
  });

  it('يفهم الأرقام مع فاصل الآلاف', () => {
    const r = parse('دفعت 1,200 شيكل ايجار');
    expect(r.amountMinor).toBe(120000);
  });

  it('يكتشف الدولار', () => {
    const r = parse('دفعت 30 دولار اشتراك');
    expect(r.currency).toBe('USD');
    expect(r.amountMinor).toBe(3000);
  });

  it('يكتشف الدينار', () => {
    const r = parse('دفعت 5 دينار بنزين');
    expect(r.currency).toBe('JOD');
    expect(r.amountMinor).toBe(5000); // 3 خانات عشرية
  });

  it('يستخدم العملة الافتراضية عند عدم ذكرها', () => {
    const r = parse('صرفت 40 مطعم');
    expect(r.currency).toBe('ILS');
  });

  it('يفهم الرمز ₪', () => {
    const r = parse('دفعت 9 ₪ قهوة');
    expect(r.amountMinor).toBe(900);
    expect(r.currency).toBe('ILS');
  });
});

describe('الأعداد المكتوبة بالحروف', () => {
  it('خمسه شيكل', () => {
    const r = parse('صرفت خمسه شيكل قهوة');
    expect(r.amountMinor).toBe(500);
  });

  it('عشرين شيكل', () => {
    const r = parse('دفعت عشرين شيكل بنزين');
    expect(r.amountMinor).toBe(2000);
  });

  it('خمسه وعشرين شيكل', () => {
    const r = parse('صرفت خمسه وعشرين شيكل اكل');
    expect(r.amountMinor).toBe(2500);
  });

  it('ميه وخمسين', () => {
    const r = parse('دفعت ميه وخمسين شيكل ملابس');
    expect(r.amountMinor).toBe(15000);
  });
});

describe('التواريخ', () => {
  it('امبارح', () => {
    expect(parse('امبارح صرفت 10 قهوة').date).toBe(yesterday);
  });

  it('أمس', () => {
    expect(parse('أمس دفعت 10 قهوة').date).toBe(yesterday);
  });

  it('اول امبارح = قبل يومين', () => {
    expect(parse('اول امبارح دفعت 10 قهوة').date).toBe(twoDaysAgo);
  });

  it('قبل 3 ايام', () => {
    expect(parse('قبل 3 ايام دفعت 10 قهوة').date).toBe(toKey(addDays(NOW, -3)));
  });

  it('قبل اسبوع', () => {
    expect(parse('قبل اسبوع دفعت 10 قهوة').date).toBe(toKey(addDays(NOW, -7)));
  });

  it('اسم يوم: الخميس', () => {
    // السبت 12 سبتمبر → الخميس الماضي = 10 سبتمبر
    expect(parse('الخميس دفعت 10 قهوة').date).toBe(toKey(addDays(NOW, -2)));
  });

  it('بدون تاريخ = اليوم', () => {
    expect(parse('دفعت 10 قهوة').date).toBe(today);
  });

  it('لا يخلط رقم التاريخ مع المبلغ', () => {
    const r = parse('قبل 3 ايام دفعت 45 شيكل مطعم');
    expect(r.amountMinor).toBe(4500);
    expect(r.date).toBe(toKey(addDays(NOW, -3)));
  });
});

describe('الدخل مقابل المصروف', () => {
  it('قبضت راتب', () => {
    const r = parse('قبضت 3000 شيكل راتب');
    expect(r.type).toBe('income');
    expect(r.categoryId).toBe('salary');
    expect(r.amountMinor).toBe(300000);
  });

  it('استلمت من عميل', () => {
    const r = parse('استلمت 500 شيكل من عميل');
    expect(r.type).toBe('income');
  });

  it('بعت اشي', () => {
    const r = parse('بعت شغلة بـ 200 شيكل');
    expect(r.type).toBe('income');
  });

  it('الافتراضي مصروف', () => {
    const r = parse('40 شيكل مطعم');
    expect(r.type).toBe('expense');
  });
});

describe('تحمّل الأخطاء الإملائية والعامية', () => {
  it('قهوه بدون تاء مربوطة', () => {
    expect(parse('صرفت 6 شيكل قهوه').categoryId).toBe('coffee');
  });

  it('كافيه', () => {
    expect(parse('دفعت 14 شيكل كافيه').categoryId).toBe('coffee');
  });

  it('خطأ إملائي: بنزيين', () => {
    expect(parse('دفعت 50 شيكل بنزيين').categoryId).toBe('fuel');
  });

  it('خطأ إملائي: مطعن', () => {
    expect(parse('دفعت 50 شيكل مطعن').categoryId).toBe('food');
  });

  it('بدون مسافات بين الرقم والعملة', () => {
    const r = parse('دفعت 8شيكل قهوة');
    expect(r.amountMinor).toBe(800);
  });

  it('جملة عامية طويلة', () => {
    const r = parse('يا زلمه مبارح رحت ع المطعم ودفعت 65 شيكل');
    expect(r.amountMinor).toBe(6500);
    expect(r.categoryId).toBe('food');
    expect(r.date).toBe(yesterday);
  });

  it('نص فيه تطويل وتشكيل', () => {
    const r = parse('صَرَفـــتُ ٣٠ شيكل عَلى بنزين');
    expect(r.amountMinor).toBe(3000);
    expect(r.categoryId).toBe('fuel');
  });
});

describe('الحالات الحدّية', () => {
  it('نص فارغ', () => {
    const r = parse('');
    expect(r.amountMinor).toBeNull();
    expect(r.confidence).toBe(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('نص بدون مبلغ', () => {
    const r = parse('رحت على المطعم');
    expect(r.amountMinor).toBeNull();
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('الثقة مرتفعة عند وضوح كل العناصر', () => {
    const r = parse('اليوم صرفت 5 شيكل قهوة');
    expect(r.confidence).toBeGreaterThan(0.8);
  });

  it('الثقة منخفضة عند غموض الفئة', () => {
    const r = parse('دفعت 5 شيكل');
    expect(r.confidence).toBeLessThan(0.8);
  });

  it('يحدد الفئة الافتراضية عند عدم التعرّف', () => {
    const r = parse('دفعت 5 شيكل زقزقة');
    expect(r.categoryId).toBe('other');
    expect(r.categoryConfidence).toBeLessThan(0.5);
  });
});

describe('الوصف', () => {
  it('يستخرج الوصف من الكلمات المتبقية', () => {
    const r = parse('دفعت 45 شيكل مطعم شاورما ابو خالد');
    expect(r.description).toContain('شاورما');
  });

  it('لا يكرر كلمة الفئة وحدها', () => {
    const r = parse('صرفت 5 شيكل قهوة');
    expect(r.description).toBe('');
  });
});
