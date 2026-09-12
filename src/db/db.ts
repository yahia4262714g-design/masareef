import Dexie, { type Table } from 'dexie';
import type {
  AppMeta,
  Budget,
  Category,
  SavingsGoal,
  Settings,
  Transaction,
} from '@/types';
import { buildDefaultCategories } from './categories';

/** إصدار مخطط قاعدة البيانات — يُستخدم أيضًا في ملفات النسخ الاحتياطي */
export const SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: Omit<Settings, 'createdAt' | 'updatedAt'> = {
  id: 'app',
  currency: 'ILS',
  monthStartDay: 1,
  weekStartDay: 6, // السبت
  theme: 'system',
  hideAmounts: false,
  confirmQuickAdd: true,
  trackIncome: true,
  onboarded: false,
  lastBackupAt: null,
};

class MasareefDB extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  budgets!: Table<Budget, string>;
  savingsGoals!: Table<SavingsGoal, string>;
  settings!: Table<Settings, string>;
  appMeta!: Table<AppMeta, string>;

  constructor() {
    super('masareef');

    // ---- الإصدار 1 ----
    this.version(1).stores({
      transactions: 'id, date, type, categoryId, createdAt, [type+date], [categoryId+date]',
      categories: 'id, type, order, archived',
      budgets: 'id, categoryId, active',
      savingsGoals: 'id, archived',
      settings: 'id',
      appMeta: 'key',
    });

    /* عند إضافة إصدار جديد لاحقًا:
       this.version(2).stores({ ... }).upgrade(async (tx) => { ... });
       لا تحذف تعريف الإصدار السابق أبدًا — Dexie يحتاجه للترحيل. */
  }
}

export const db = new MasareefDB();

/** مُعرّف فريد — يستخدم crypto.randomUUID عند توفره */
export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // بديل آمن كفاية للاستخدام المحلي
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** تهيئة أولية: الإعدادات + الفئات الافتراضية. آمنة للتكرار. */
export async function ensureSeeded(): Promise<Settings> {
  const now = Date.now();

  return db.transaction('rw', db.settings, db.categories, db.appMeta, async () => {
    let settings = await db.settings.get('app');
    if (!settings) {
      settings = { ...DEFAULT_SETTINGS, createdAt: now, updatedAt: now };
      await db.settings.put(settings);
    }

    const count = await db.categories.count();
    if (count === 0) {
      await db.categories.bulkPut(buildDefaultCategories(now));
    }

    const meta = await db.appMeta.get('schemaVersion');
    if (!meta) {
      await db.appMeta.put({ key: 'schemaVersion', value: SCHEMA_VERSION });
    }

    return settings;
  });
}

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('app');
  if (s) return s;
  return ensureSeeded();
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch, id: 'app', updatedAt: Date.now() });
}

/** يمسح كل البيانات ويعيد التهيئة من الصفر */
export async function resetAllData(): Promise<void> {
  await db.transaction(
    'rw',
    db.transactions,
    db.categories,
    db.budgets,
    db.savingsGoals,
    db.settings,
    db.appMeta,
    async () => {
      await Promise.all([
        db.transactions.clear(),
        db.categories.clear(),
        db.budgets.clear(),
        db.savingsGoals.clear(),
        db.settings.clear(),
        db.appMeta.clear(),
      ]);
    },
  );
  await ensureSeeded();
}
