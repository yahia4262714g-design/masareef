/**
 * حسابات المال — كل شيء بالأعداد الصحيحة (أصغر وحدة للعملة).
 * لا يوجد أي عملية حسابية على أعداد عشرية في هذا الملف.
 * مثال: 5.30 ₪ تُخزَّن كـ 530 أغورة.
 */

export const MINOR_UNITS = 100;

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  ILS: { code: 'ILS', symbol: '₪', name: 'شيكل', decimals: 2 },
  JOD: { code: 'JOD', symbol: 'د.أ', name: 'دينار أردني', decimals: 3 },
  USD: { code: 'USD', symbol: '$', name: 'دولار', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'يورو', decimals: 2 },
  EGP: { code: 'EGP', symbol: 'ج.م', name: 'جنيه مصري', decimals: 2 },
  SAR: { code: 'SAR', symbol: 'ر.س', name: 'ريال سعودي', decimals: 2 },
  AED: { code: 'AED', symbol: 'د.إ', name: 'درهم إماراتي', decimals: 2 },
};

export function currencyInfo(code: string): CurrencyInfo {
  return CURRENCIES[code] ?? { code, symbol: code, name: code, decimals: 2 };
}

export function minorFactor(code: string): number {
  return Math.pow(10, currencyInfo(code).decimals);
}

/**
 * يحوّل نصًا أو رقمًا إلى وحدة صغرى صحيحة بأمان.
 * يتفادى أخطاء الفاصلة العائمة عبر العمل على النص مباشرة عند الإمكان.
 */
export function toMinor(value: string | number, currency = 'ILS'): number {
  const decimals = currencyInfo(currency).decimals;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    // التقريب نصف-لأعلى مع معالجة الأخطاء العائمة الطفيفة
    const scaled = value * Math.pow(10, decimals);
    const rounded = Math.round(scaled + (scaled >= 0 ? 1e-9 : -1e-9));
    return rounded;
  }

  let s = String(value).trim();
  if (!s) return 0;
  s = normalizeDigits(s).replace(/[\s,٬_]/g, '').replace(/٫/g, '.');
  const neg = s.startsWith('-');
  if (neg || s.startsWith('+')) s = s.slice(1);

  const m = s.match(/^(\d*)(?:[.](\d*))?$/);
  if (!m) return 0;

  const intPart = m[1] || '0';
  const fracRaw = m[2] || '';
  // قصّ أو حشو الكسر إلى العدد المطلوب من الخانات
  const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals);
  // التقريب حسب الخانة التالية
  const nextDigit = fracRaw.length > decimals ? Number(fracRaw[decimals]) : 0;

  let result = Number(intPart) * Math.pow(10, decimals) + Number(frac || '0');
  if (nextDigit >= 5) result += 1;
  return neg ? -result : result;
}

/** يحوّل الوحدة الصغرى إلى رقم عشري للعرض فقط (لا تستخدمه في الحسابات) */
export function toMajor(amountMinor: number, currency = 'ILS'): number {
  return amountMinor / minorFactor(currency);
}

/** يحوّل الأرقام العربية-الهندية والفارسية إلى أرقام لاتينية */
export function normalizeDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (d) => {
    const code = d.charCodeAt(0);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    return String(code - 0x06f0);
  });
}

/** تنسيق المبلغ للعرض: "5.00" أو "1,250" */
export function formatAmount(
  amountMinor: number,
  currency = 'ILS',
  opts: { showDecimals?: 'auto' | 'always' | 'never'; grouping?: boolean } = {},
): string {
  const { showDecimals = 'auto', grouping = true } = opts;
  const decimals = currencyInfo(currency).decimals;
  const factor = minorFactor(currency);
  const neg = amountMinor < 0;
  const abs = Math.abs(amountMinor);

  const intPart = Math.floor(abs / factor);
  const fracPart = abs % factor;

  let frac = '';
  if (showDecimals === 'always' || (showDecimals === 'auto' && fracPart !== 0)) {
    frac = '.' + String(fracPart).padStart(decimals, '0');
  }

  const intStr = grouping ? String(intPart).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : String(intPart);
  return (neg ? '-' : '') + intStr + frac;
}

/** تنسيق كامل مع رمز العملة — الرمز يأتي بعد الرقم في السياق العربي */
export function formatMoney(
  amountMinor: number,
  currency = 'ILS',
  opts: { showDecimals?: 'auto' | 'always' | 'never'; grouping?: boolean } = {},
): string {
  return `${formatAmount(amountMinor, currency, opts)} ${currencyInfo(currency).symbol}`;
}

/** تنسيق مختصر للأرقام الكبيرة: 12.5 ألف */
export function formatCompact(amountMinor: number, currency = 'ILS'): string {
  const factor = minorFactor(currency);
  const major = Math.abs(amountMinor) / factor;
  const sign = amountMinor < 0 ? '-' : '';
  if (major >= 1_000_000) return `${sign}${(major / 1_000_000).toFixed(1)}م`;
  if (major >= 10_000) return `${sign}${(major / 1000).toFixed(1)}ألف`;
  return sign + formatAmount(Math.abs(amountMinor), currency, { showDecimals: 'never' });
}

/** جمع آمن */
export function sumMinor(values: number[]): number {
  let total = 0;
  for (const v of values) total += Math.trunc(v);
  return total;
}

/**
 * قسمة مع توزيع الباقي — تمنع ضياع الأغورات.
 * مثال: splitMinor(1000, 3) => [334, 333, 333]
 */
export function splitMinor(amountMinor: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.trunc(amountMinor / parts);
  let remainder = amountMinor - base * parts;
  const out: number[] = [];
  for (let i = 0; i < parts; i++) {
    const extra = remainder > 0 ? 1 : remainder < 0 ? -1 : 0;
    if (extra !== 0) remainder -= extra;
    out.push(base + extra);
  }
  return out;
}

/** نسبة مئوية صحيحة من مبلغ (بالوحدة الصغرى) */
export function percentOfMinor(amountMinor: number, percent: number): number {
  return Math.round((amountMinor * percent) / 100);
}

/** نسبة a من b كعدد عشري للعرض (0-100+) */
export function ratioPercent(a: number, b: number): number {
  if (b === 0) return a === 0 ? 0 : 100;
  return (a / b) * 100;
}

/** نسبة التغيّر بين فترتين، null إذا كانت الفترة السابقة صفرًا */
export function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** المتوسط بالوحدة الصغرى (مقرّب) */
export function averageMinor(total: number, count: number): number {
  if (count <= 0) return 0;
  return Math.round(total / count);
}
