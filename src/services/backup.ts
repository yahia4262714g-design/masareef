/**
 * النسخ الاحتياطي والاستعادة.
 * الملف يحمل رقم إصدار للمخطط حتى يمكن ترحيله مستقبلاً.
 * لا يتم حذف أي بيانات إلا بموافقة صريحة من المستخدم.
 */

import type { Budget, Category, SavingsGoal, Settings, Transaction } from '@/types';
import { SCHEMA_VERSION } from '@/db/db';
import { formatAmount } from './money';

export const BACKUP_FORMAT = 'masareef-backup';

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  counts: {
    transactions: number;
    categories: number;
    budgets: number;
    savingsGoals: number;
  };
  data: {
    transactions: Transaction[];
    categories: Category[];
    budgets: Budget[];
    savingsGoals: SavingsGoal[];
    settings: Settings | null;
  };
}

export interface BackupPayload {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  settings: Settings | null;
}

export function buildBackup(payload: BackupPayload, appVersion = '1.0.0'): BackupFile {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    appVersion,
    exportedAt: new Date().toISOString(),
    counts: {
      transactions: payload.transactions.length,
      categories: payload.categories.length,
      budgets: payload.budgets.length,
      savingsGoals: payload.savingsGoals.length,
    },
    data: payload,
  };
}

/* ============================================================
   التحقّق من صحة ملف النسخة الاحتياطية
   ============================================================ */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  preview: {
    transactions: number;
    categories: number;
    budgets: number;
    savingsGoals: number;
    dateFrom: string | null;
    dateTo: string | null;
    schemaVersion: number | null;
    exportedAt: string | null;
  };
  /** البيانات المنقّاة الجاهزة للاستيراد */
  payload: BackupPayload | null;
}

const emptyPreview = {
  transactions: 0,
  categories: 0,
  budgets: 0,
  savingsGoals: 0,
  dateFrom: null,
  dateTo: null,
  schemaVersion: null,
  exportedAt: null,
};

export function validateBackup(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof raw !== 'object' || raw === null) {
    return { valid: false, errors: ['الملف غير صالح — لم أستطع قراءة محتواه.'], warnings, preview: emptyPreview, payload: null };
  }

  const file = raw as Partial<BackupFile>;

  if (file.format !== BACKUP_FORMAT) {
    return {
      valid: false,
      errors: ['هذا الملف ليس نسخة احتياطية من تطبيق مصاريف.'],
      warnings,
      preview: emptyPreview,
      payload: null,
    };
  }

  const schemaVersion = typeof file.schemaVersion === 'number' ? file.schemaVersion : null;
  if (schemaVersion === null) {
    errors.push('الملف لا يحتوي على رقم إصدار المخطط.');
  } else if (schemaVersion > SCHEMA_VERSION) {
    errors.push(
      `هذه النسخة أُخذت من إصدار أحدث من التطبيق (${schemaVersion}). حدّث التطبيق أولاً قبل الاستعادة.`,
    );
  }

  const data = file.data;
  if (typeof data !== 'object' || data === null) {
    errors.push('الملف لا يحتوي على بيانات.');
    return { valid: false, errors, warnings, preview: emptyPreview, payload: null };
  }

  const transactions = sanitizeTransactions(data.transactions, warnings);
  const categories = sanitizeCategories(data.categories, warnings);
  const budgets = Array.isArray(data.budgets) ? (data.budgets as Budget[]).filter(isValidBudget) : [];
  const savingsGoals = Array.isArray(data.savingsGoals)
    ? (data.savingsGoals as SavingsGoal[]).filter(isValidGoal)
    : [];

  if (transactions.length === 0 && categories.length === 0) {
    errors.push('الملف لا يحتوي على أي عمليات أو فئات صالحة.');
  }

  // تحقّق من وجود فئة لكل عملية
  const catIds = new Set(categories.map((c) => c.id));
  const orphans = transactions.filter((t) => !catIds.has(t.categoryId)).length;
  if (orphans > 0) {
    warnings.push(`${orphans} عملية تشير إلى فئة غير موجودة في الملف — سيتم ربطها بفئة "أخرى".`);
  }

  const dates = transactions.map((t) => t.date).sort();

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    preview: {
      transactions: transactions.length,
      categories: categories.length,
      budgets: budgets.length,
      savingsGoals: savingsGoals.length,
      dateFrom: dates[0] ?? null,
      dateTo: dates[dates.length - 1] ?? null,
      schemaVersion,
      exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : null,
    },
    payload: {
      transactions,
      categories,
      budgets,
      savingsGoals,
      settings: isValidSettings(data.settings) ? (data.settings as Settings) : null,
    },
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function sanitizeTransactions(input: unknown, warnings: string[]): Transaction[] {
  if (!Array.isArray(input)) return [];
  const out: Transaction[] = [];
  let skipped = 0;

  for (const item of input) {
    if (typeof item !== 'object' || item === null) {
      skipped++;
      continue;
    }
    const t = item as Partial<Transaction>;
    if (
      typeof t.id !== 'string' ||
      (t.type !== 'expense' && t.type !== 'income') ||
      typeof t.amountMinor !== 'number' ||
      !Number.isFinite(t.amountMinor) ||
      typeof t.date !== 'string' ||
      !DATE_RE.test(t.date) ||
      typeof t.categoryId !== 'string'
    ) {
      skipped++;
      continue;
    }

    out.push({
      id: t.id,
      type: t.type,
      amountMinor: Math.round(t.amountMinor),
      currency: typeof t.currency === 'string' ? t.currency : 'ILS',
      date: t.date,
      time: typeof t.time === 'string' && TIME_RE.test(t.time) ? t.time : '12:00',
      categoryId: t.categoryId,
      merchant: typeof t.merchant === 'string' ? t.merchant : undefined,
      description: typeof t.description === 'string' ? t.description : undefined,
      notes: typeof t.notes === 'string' ? t.notes : undefined,
      tags: Array.isArray(t.tags) ? t.tags.filter((x): x is string => typeof x === 'string') : undefined,
      paymentMethod: t.paymentMethod,
      source: t.source ?? 'import',
      createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
      updatedAt: typeof t.updatedAt === 'number' ? t.updatedAt : Date.now(),
    });
  }

  if (skipped > 0) warnings.push(`${skipped} عملية غير صالحة تم تجاهلها.`);
  return out;
}

function sanitizeCategories(input: unknown, warnings: string[]): Category[] {
  if (!Array.isArray(input)) return [];
  const out: Category[] = [];
  let skipped = 0;

  for (const item of input) {
    if (typeof item !== 'object' || item === null) {
      skipped++;
      continue;
    }
    const c = item as Partial<Category>;
    if (typeof c.id !== 'string' || typeof c.name !== 'string' || !c.name.trim()) {
      skipped++;
      continue;
    }
    out.push({
      id: c.id,
      name: c.name.trim(),
      icon: typeof c.icon === 'string' ? c.icon : 'more',
      colorIndex: typeof c.colorIndex === 'number' ? c.colorIndex : 1,
      kind: c.kind === 'essential' || c.kind === 'discretionary' ? c.kind : 'flexible',
      type: c.type === 'income' ? 'income' : 'expense',
      keywords: Array.isArray(c.keywords) ? c.keywords.filter((x): x is string => typeof x === 'string') : [],
      isDefault: c.isDefault === true,
      archived: c.archived === true,
      order: typeof c.order === 'number' ? c.order : 0,
      createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
      updatedAt: typeof c.updatedAt === 'number' ? c.updatedAt : Date.now(),
    });
  }

  if (skipped > 0) warnings.push(`${skipped} فئة غير صالحة تم تجاهلها.`);
  return out;
}

function isValidBudget(b: unknown): b is Budget {
  if (typeof b !== 'object' || b === null) return false;
  const x = b as Partial<Budget>;
  return typeof x.id === 'string' && typeof x.amountMinor === 'number' && Number.isFinite(x.amountMinor);
}

function isValidGoal(g: unknown): g is SavingsGoal {
  if (typeof g !== 'object' || g === null) return false;
  const x = g as Partial<SavingsGoal>;
  return typeof x.id === 'string' && typeof x.name === 'string' && typeof x.targetMinor === 'number';
}

function isValidSettings(s: unknown): boolean {
  return typeof s === 'object' && s !== null && typeof (s as Settings).currency === 'string';
}

/* ============================================================
   تصدير CSV
   ============================================================ */

function csvCell(value: string | number | undefined | null): string {
  const s = value === undefined || value === null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** ملف CSV بترميز UTF-8 مع BOM حتى يفتح بشكل صحيح في Excel العربي */
export function buildCSV(txs: Transaction[], categories: Map<string, Category>): string {
  const header = [
    'التاريخ', 'الوقت', 'النوع', 'المبلغ', 'العملة', 'الفئة',
    'الوصف', 'التاجر', 'طريقة الدفع', 'الوسوم', 'ملاحظات',
  ];

  const typeLabel = (t: Transaction) => (t.type === 'expense' ? 'مصروف' : 'دخل');
  const payLabel: Record<string, string> = {
    cash: 'كاش', card: 'بطاقة', transfer: 'تحويل', other: 'أخرى',
  };

  const rows = [...txs]
    .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)))
    .map((t) =>
      [
        t.date,
        t.time,
        typeLabel(t),
        formatAmount(t.amountMinor, t.currency, { showDecimals: 'always', grouping: false }),
        t.currency,
        categories.get(t.categoryId)?.name ?? t.categoryId,
        t.description ?? '',
        t.merchant ?? '',
        t.paymentMethod ? (payLabel[t.paymentMethod] ?? t.paymentMethod) : '',
        (t.tags ?? []).join(' | '),
        t.notes ?? '',
      ]
        .map(csvCell)
        .join(','),
    );

  return '﻿' + [header.map(csvCell).join(','), ...rows].join('\r\n');
}

export function backupFileName(ext: 'json' | 'csv'): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `masareef-${stamp}.${ext}`;
}
