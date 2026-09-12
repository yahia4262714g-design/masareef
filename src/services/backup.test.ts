import { describe, it, expect } from 'vitest';
import type { Category, Transaction } from '@/types';
import { buildDefaultCategories } from '@/db/categories';
import { buildBackup, validateBackup, buildCSV, BACKUP_FORMAT, backupFileName } from './backup';

const categories = buildDefaultCategories(0);
const catMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

const sampleTx: Transaction = {
  id: 'a1', type: 'expense', amountMinor: 550, currency: 'ILS',
  date: '2026-09-12', time: '14:30', categoryId: 'coffee',
  description: 'قهوة الصباح', source: 'quick', createdAt: 1, updatedAt: 1,
};

function makeBackup(overrides: Record<string, unknown> = {}) {
  const b = buildBackup({
    transactions: [sampleTx], categories, budgets: [], savingsGoals: [], settings: null,
  });
  return { ...b, ...overrides };
}

describe('buildBackup', () => {
  it('يبني ملفًا بصيغة صحيحة مع رقم إصدار', () => {
    const b = makeBackup();
    expect(b.format).toBe(BACKUP_FORMAT);
    expect(b.schemaVersion).toBe(1);
    expect(b.counts.transactions).toBe(1);
    expect(b.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('الملف قابل للتحويل إلى JSON والعودة', () => {
    const b = makeBackup();
    const round = JSON.parse(JSON.stringify(b));
    expect(validateBackup(round).valid).toBe(true);
  });
});

describe('validateBackup — الرفض الآمن', () => {
  it('يرفض القيم غير الكائنية', () => {
    expect(validateBackup(null).valid).toBe(false);
    expect(validateBackup('نص').valid).toBe(false);
    expect(validateBackup(42).valid).toBe(false);
  });

  it('يرفض ملفًا من تطبيق آخر', () => {
    const r = validateBackup({ format: 'other-app', data: {} });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('ليس نسخة احتياطية');
  });

  it('يرفض إصدار مخطط أحدث من التطبيق', () => {
    const r = validateBackup(makeBackup({ schemaVersion: 99 }));
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toContain('أحدث');
  });

  it('يرفض ملفًا بلا بيانات', () => {
    expect(validateBackup({ format: BACKUP_FORMAT, schemaVersion: 1 }).valid).toBe(false);
  });

  it('يرفض ملفًا بلا عمليات ولا فئات', () => {
    const r = validateBackup({
      format: BACKUP_FORMAT, schemaVersion: 1,
      data: { transactions: [], categories: [], budgets: [], savingsGoals: [], settings: null },
    });
    expect(r.valid).toBe(false);
  });
});

describe('validateBackup — التنقية', () => {
  it('يتجاهل العمليات التالفة ويحذّر', () => {
    const r = validateBackup({
      format: BACKUP_FORMAT, schemaVersion: 1,
      data: {
        transactions: [
          sampleTx,
          { id: 'bad1' },                                   // ناقص
          { ...sampleTx, id: 'bad2', amountMinor: 'كثير' }, // نوع خاطئ
          { ...sampleTx, id: 'bad3', date: '12/09/2026' },  // صيغة تاريخ خاطئة
          { ...sampleTx, id: 'bad4', amountMinor: NaN },
          null,
        ],
        categories, budgets: [], savingsGoals: [], settings: null,
      },
    });
    expect(r.valid).toBe(true);
    expect(r.payload!.transactions).toHaveLength(1);
    expect(r.warnings.join(' ')).toContain('5 عملية غير صالحة');
  });

  it('يكمل الحقول الناقصة بقيم آمنة', () => {
    const r = validateBackup({
      format: BACKUP_FORMAT, schemaVersion: 1,
      data: {
        transactions: [{ id: 'x', type: 'expense', amountMinor: 100, date: '2026-09-12', categoryId: 'food' }],
        categories, budgets: [], savingsGoals: [], settings: null,
      },
    });
    const t = r.payload!.transactions[0];
    expect(t.time).toBe('12:00');
    expect(t.currency).toBe('ILS');
    expect(t.source).toBe('import');
    expect(typeof t.createdAt).toBe('number');
  });

  it('يحذّر من العمليات اليتيمة بلا فئة', () => {
    const r = validateBackup({
      format: BACKUP_FORMAT, schemaVersion: 1,
      data: {
        transactions: [{ ...sampleTx, categoryId: 'غير-موجودة' }],
        categories, budgets: [], savingsGoals: [], settings: null,
      },
    });
    expect(r.warnings.join(' ')).toContain('فئة غير موجودة');
  });

  it('يعرض معاينة صحيحة قبل الاستيراد', () => {
    const r = validateBackup({
      format: BACKUP_FORMAT, schemaVersion: 1,
      data: {
        transactions: [
          sampleTx,
          { ...sampleTx, id: 'a2', date: '2026-01-05' },
          { ...sampleTx, id: 'a3', date: '2026-12-20' },
        ],
        categories, budgets: [], savingsGoals: [], settings: null,
      },
    });
    expect(r.preview.transactions).toBe(3);
    expect(r.preview.dateFrom).toBe('2026-01-05');
    expect(r.preview.dateTo).toBe('2026-12-20');
    expect(r.preview.categories).toBe(categories.length);
  });

  it('يقبل إصدار مخطط أقدم', () => {
    expect(validateBackup(makeBackup({ schemaVersion: 1 })).valid).toBe(true);
  });
});

describe('buildCSV', () => {
  it('يضع BOM في البداية ليفتح بشكل صحيح في Excel', () => {
    expect(buildCSV([sampleTx], catMap).charCodeAt(0)).toBe(0xfeff);
  });

  it('يكتب العناوين والقيم بالعربية', () => {
    const csv = buildCSV([sampleTx], catMap);
    expect(csv).toContain('التاريخ');
    expect(csv).toContain('مصروف');
    expect(csv).toContain('قهوة ومشروبات');
    expect(csv).toContain('5.50');
  });

  it('يهرّب الفواصل وعلامات الاقتباس والأسطر الجديدة', () => {
    const csv = buildCSV(
      [{ ...sampleTx, description: 'قهوة, وكعكة', notes: 'قال "ممتاز"', merchant: 'سطر\nثاني' }],
      catMap,
    );
    expect(csv).toContain('"قهوة, وكعكة"');
    expect(csv).toContain('"قال ""ممتاز"""');
    expect(csv).toContain('"سطر\nثاني"');
  });

  it('يرتّب حسب التاريخ ثم الوقت', () => {
    const csv = buildCSV(
      [
        { ...sampleTx, id: '2', date: '2026-09-12', time: '18:00', description: 'ثاني' },
        { ...sampleTx, id: '1', date: '2026-09-12', time: '08:00', description: 'أول' },
        { ...sampleTx, id: '0', date: '2026-09-11', description: 'سابق' },
      ],
      catMap,
    );
    const lines = csv.split('\r\n');
    expect(lines[1]).toContain('سابق');
    expect(lines[2]).toContain('أول');
    expect(lines[3]).toContain('ثاني');
  });

  it('يتعامل مع قائمة فارغة', () => {
    const csv = buildCSV([], catMap);
    expect(csv.split('\r\n')).toHaveLength(1);
  });
});

describe('backupFileName', () => {
  it('يبني اسمًا بالتاريخ', () => {
    expect(backupFileName('json')).toMatch(/^masareef-\d{4}-\d{2}-\d{2}\.json$/);
    expect(backupFileName('csv')).toMatch(/\.csv$/);
  });
});
