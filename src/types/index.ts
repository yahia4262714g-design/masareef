/** أنواع البيانات الأساسية في التطبيق */

export type TxType = 'expense' | 'income';

/** تصنيف الفئة حسب الأولوية المالية — يُستخدم في توصيات التوفير */
export type CategoryKind = 'essential' | 'flexible' | 'discretionary';

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other';

/** مصدر إنشاء العملية — للتشخيص وتحسين المحلّل لاحقًا */
export type TxSource = 'quick' | 'manual' | 'import' | 'duplicate';

export interface Transaction {
  id: string;
  type: TxType;
  /** المبلغ بأصغر وحدة للعملة (أغورة) — عدد صحيح دائمًا */
  amountMinor: number;
  currency: string;
  /** تاريخ محلي بصيغة YYYY-MM-DD */
  date: string;
  /** وقت محلي بصيغة HH:mm */
  time: string;
  categoryId: string;
  merchant?: string;
  description?: string;
  notes?: string;
  tags?: string[];
  paymentMethod?: PaymentMethod;
  source: TxSource;
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  /** مُعرّف الأيقونة من مجموعة الأيقونات الداخلية */
  icon: string;
  /** رقم من 1 إلى 10 يشير إلى متغيّر --cat-N */
  colorIndex: number;
  kind: CategoryKind;
  type: TxType;
  /** كلمات مفتاحية إضافية يضيفها المستخدم لتحسين التعرّف التلقائي */
  keywords?: string[];
  /** الفئات الافتراضية لا يمكن حذفها نهائيًا، فقط أرشفتها */
  isDefault: boolean;
  archived: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Budget {
  id: string;
  /** null = الميزانية العامة لكل المصاريف */
  categoryId: string | null;
  amountMinor: number;
  currency: string;
  period: 'monthly';
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetMinor: number;
  savedMinor: number;
  currency: string;
  /** YYYY-MM-DD */
  targetDate?: string;
  icon: string;
  colorIndex: number;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Settings {
  /** مفتاح ثابت = 'app' */
  id: string;
  currency: string;
  /** اليوم الذي يبدأ فيه الشهر المالي (1-28) — عادة يوم الراتب */
  monthStartDay: number;
  /** 0 = الأحد ... 6 = السبت */
  weekStartDay: number;
  theme: ThemeMode;
  /** إخفاء المبالغ في الواجهة بضغطة واحدة */
  hideAmounts: boolean;
  /** تأكيد العملية قبل الحفظ في الإدخال السريع */
  confirmQuickAdd: boolean;
  trackIncome: boolean;
  onboarded: boolean;
  lastBackupAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface AppMeta {
  key: string;
  value: unknown;
}

/** نتيجة تحليل نص عربي إلى عملية مالية */
export interface ParsedTransaction {
  amountMinor: number | null;
  currency: string;
  type: TxType;
  categoryId: string | null;
  /** ثقة التصنيف من 0 إلى 1 */
  categoryConfidence: number;
  date: string;
  merchant?: string;
  description: string;
  /** ثقة إجمالية من 0 إلى 1 */
  confidence: number;
  /** الأجزاء التي فهمها المحلّل — لعرضها للمستخدم */
  matched: {
    amount?: string;
    currency?: string;
    date?: string;
    category?: string;
    type?: string;
  };
  warnings: string[];
}
