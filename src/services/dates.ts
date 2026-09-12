/**
 * التواريخ — كل شيء بالتوقيت المحلي للجهاز.
 * التخزين دائمًا بصيغة YYYY-MM-DD (بدون منطقة زمنية) لتجنّب انزياح اليوم.
 */

export const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export const AR_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const AR_DAYS_SHORT = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

/** مفتاح اليوم المحلي YYYY-MM-DD */
export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** يحوّل مفتاح YYYY-MM-DD إلى Date محلي عند منتصف الليل */
export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayKey(now: Date = new Date()): string {
  return toKey(now);
}

export function nowTime(now: Date = new Date()): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function addMonths(d: Date, n: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth() + n, 1);
  // يحافظ على اليوم إن أمكن دون تجاوز نهاية الشهر
  const maxDay = daysInMonth(out.getFullYear(), out.getMonth());
  out.setDate(Math.min(d.getDate(), maxDay));
  return out;
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function diffDays(aKey: string, bKey: string): number {
  const a = fromKey(aKey).getTime();
  const b = fromKey(bKey).getTime();
  return Math.round((a - b) / 86_400_000);
}

export interface DateRange {
  /** شامل */
  start: string;
  /** شامل */
  end: string;
  label: string;
}

/** عدد الأيام داخل المدى (شامل الطرفين) */
export function rangeDays(r: DateRange): number {
  return diffDays(r.end, r.start) + 1;
}

export function inRange(key: string, r: DateRange): boolean {
  return key >= r.start && key <= r.end;
}

/* ============================================================
   الأسبوع
   ============================================================ */

/** بداية الأسبوع حسب إعداد المستخدم (0=الأحد ... 6=السبت) */
export function startOfWeek(d: Date, weekStartDay: number): Date {
  const day = d.getDay();
  const diff = (day - weekStartDay + 7) % 7;
  return startOfDay(addDays(d, -diff));
}

export function weekRange(d: Date, weekStartDay: number, offset = 0): DateRange {
  const start = addDays(startOfWeek(d, weekStartDay), offset * 7);
  const end = addDays(start, 6);
  return {
    start: toKey(start),
    end: toKey(end),
    label: offset === 0 ? 'هذا الأسبوع' : offset === -1 ? 'الأسبوع الماضي' : formatRange(toKey(start), toKey(end)),
  };
}

/* ============================================================
   الشهر المالي — يبدأ من يوم الراتب وليس من 1 بالضرورة
   ============================================================ */

/**
 * يحسب مدى الشهر المالي الذي يقع فيه التاريخ المعطى.
 * إذا كان monthStartDay = 1 فهو الشهر التقويمي العادي.
 * إذا كان 25 مثلاً: الفترة من 25 من الشهر السابق حتى 24 من الشهر الحالي.
 */
export function financialMonthRange(d: Date, monthStartDay: number, offset = 0): DateRange {
  const startDay = Math.min(Math.max(Math.trunc(monthStartDay) || 1, 1), 28);

  // نحدّد بداية الدورة الحالية
  let anchorYear = d.getFullYear();
  let anchorMonth = d.getMonth();
  if (d.getDate() < startDay) {
    anchorMonth -= 1;
    if (anchorMonth < 0) {
      anchorMonth = 11;
      anchorYear -= 1;
    }
  }

  // نطبّق الإزاحة بالأشهر
  const startDate = new Date(anchorYear, anchorMonth + offset, startDay);
  const endDate = addDays(new Date(startDate.getFullYear(), startDate.getMonth() + 1, startDay), -1);

  return {
    start: toKey(startDate),
    end: toKey(endDate),
    label: monthLabel(startDate, endDate, startDay, offset),
  };
}

function monthLabel(start: Date, end: Date, startDay: number, offset: number): string {
  if (offset === 0) return 'هذا الشهر';
  if (offset === -1) return 'الشهر الماضي';
  if (startDay === 1) return `${AR_MONTHS[start.getMonth()]} ${start.getFullYear()}`;
  return formatRange(toKey(start), toKey(end));
}

export function yearRange(d: Date, offset = 0): DateRange {
  const y = d.getFullYear() + offset;
  return {
    start: `${y}-01-01`,
    end: `${y}-12-31`,
    label: offset === 0 ? 'هذه السنة' : String(y),
  };
}

export function dayRange(d: Date, offset = 0): DateRange {
  const key = toKey(addDays(d, offset));
  return { start: key, end: key, label: offset === 0 ? 'اليوم' : offset === -1 ? 'أمس' : formatDate(key) };
}

/* ============================================================
   التنسيق العربي
   ============================================================ */

/** "اليوم" / "أمس" / "الخميس 12 سبتمبر" */
export function formatDateRelative(key: string, now: Date = new Date()): string {
  const d = diffDays(todayKey(now), key);
  if (d === 0) return 'اليوم';
  if (d === 1) return 'أمس';
  if (d === 2) return 'قبل يومين';
  if (d === -1) return 'غدًا';
  if (d > 2 && d < 7) return `${AR_DAYS[fromKey(key).getDay()]} الماضي`;
  return formatDate(key);
}

/** "12 سبتمبر 2026" */
export function formatDate(key: string, opts: { year?: boolean } = {}): string {
  const d = fromKey(key);
  const showYear = opts.year ?? d.getFullYear() !== new Date().getFullYear();
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()]}${showYear ? ' ' + d.getFullYear() : ''}`;
}

/** "الخميس · 12 سبتمبر" */
export function formatDateWithDay(key: string): string {
  const d = fromKey(key);
  return `${AR_DAYS[d.getDay()]} · ${formatDate(key)}`;
}

export function formatRange(startKey: string, endKey: string): string {
  const a = fromKey(startKey);
  const b = fromKey(endKey);
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} – ${b.getDate()} ${AR_MONTHS[a.getMonth()]}`;
  }
  return `${formatDate(startKey, { year: false })} – ${formatDate(endKey)}`;
}

/** "٣:٤٥ م" بصيغة لاتينية: "3:45 م" */
export function formatTime(time: string): string {
  const [hStr, m] = time.split(':');
  const h = Number(hStr);
  const suffix = h < 12 ? 'ص' : 'م';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${suffix}`;
}
