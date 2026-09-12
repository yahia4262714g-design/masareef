/**
 * مستخرجات الأجزاء من النص العربي المطبَّع:
 * المبلغ · العملة · النوع (مصروف/دخل) · التاريخ النسبي
 */

import { toKey, addDays, fromKey, AR_DAYS } from '../dates';
import { toMinor } from '../money';
import { stripAl, stripPrefixParticles, fuzzyEquals } from './normalize';

/* ============================================================
   الأعداد المكتوبة بالحروف
   ============================================================ */

const WORD_NUMBERS: Record<string, number> = {
  صفر: 0,
  واحد: 1, واحده: 1, وحده: 1,
  اثنين: 2, اتنين: 2, ثنين: 2, تنين: 2, اثنان: 2,
  ثلاثه: 3, تلاته: 3, ثلاث: 3, تلات: 3,
  اربعه: 4, اربع: 4, ربعه: 4,
  خمسه: 5, خمس: 5, خمسة: 5,
  سته: 6, ست: 6,
  سبعه: 7, سبع: 7,
  ثمانيه: 8, تمانيه: 8, ثماني: 8, تمان: 8, ثمانه: 8,
  تسعه: 9, تسع: 9,
  عشره: 10, عشر: 10,
  احداعش: 11, حداشر: 11, احدعشر: 11,
  اتناعش: 12, تناشر: 12, اثناعشر: 12,
  عشرين: 20, عشرون: 20,
  ثلاثين: 30, تلاتين: 30, ثلاثون: 30,
  اربعين: 40, اربعون: 40,
  خمسين: 50, خمسون: 50,
  ستين: 60, ستون: 60,
  سبعين: 70, سبعون: 70,
  ثمانين: 80, تمانين: 80,
  تسعين: 90, تسعون: 90,
  مئه: 100, مايه: 100, ميه: 100, مية: 100, مائه: 100,
  مئتين: 200, ميتين: 200, مئتان: 200,
  الف: 1000, ألف: 1000,
  الفين: 2000,
};

const MULTIPLIERS: Record<string, number> = {
  الف: 1000,
  الاف: 1000,
  مليون: 1_000_000,
};

/* ============================================================
   العملات
   ============================================================ */

const CURRENCY_WORDS: Array<{ code: string; words: string[] }> = [
  {
    code: 'ILS',
    words: ['شيكل', 'شواكل', 'شيقل', 'شكل', 'ش', '₪', 'ils', 'nis', 'شيكلين'],
  },
  { code: 'JOD', words: ['دينار', 'دنانير', 'jod', 'د.ا', 'دينارين'] },
  { code: 'USD', words: ['دولار', 'دولارات', 'usd', '$', 'دولارين'] },
  { code: 'EUR', words: ['يورو', 'eur', '€'] },
  { code: 'EGP', words: ['جنيه', 'جنيهات', 'egp'] },
  { code: 'SAR', words: ['ريال', 'ريالات', 'sar'] },
  { code: 'AED', words: ['درهم', 'دراهم', 'aed'] },
];

export interface CurrencyMatch {
  code: string;
  matchedWord: string;
  tokenIndex: number;
}

export function extractCurrency(tokens: string[]): CurrencyMatch | null {
  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i];
    const t = stripAl(stripPrefixParticles(raw));
    for (const { code, words } of CURRENCY_WORDS) {
      for (const w of words) {
        if (t === w || raw === w) return { code, matchedWord: raw, tokenIndex: i };
      }
    }
  }
  return null;
}

/* ============================================================
   النوع: مصروف أم دخل
   ============================================================ */

const EXPENSE_VERBS = [
  'صرفت', 'صرف', 'دفعت', 'دفع', 'اشتريت', 'اشتري', 'شريت', 'طلعت', 'طلع',
  'كلفني', 'كلفت', 'حسبت', 'حسب', 'خسرت', 'انصرف', 'مصروف', 'صرفنا', 'دفعنا',
  'اشترينا', 'سحبت', 'تبرعت', 'سددت', 'سدد',
];

const INCOME_VERBS = [
  'قبضت', 'قبض', 'استلمت', 'استلم', 'ربحت', 'ربح', 'دخلي', 'دخل',
  'اجاني', 'جاني', 'وصلني', 'حولولي', 'حولوا', 'بعت', 'بعته', 'بيعت',
  'كسبت', 'كسب', 'راتب', 'راتبي', 'اخذت', 'وصلتني',
];

export interface TypeMatch {
  type: 'expense' | 'income';
  matchedWord?: string;
  tokenIndex?: number;
  confident: boolean;
}

export function extractType(tokens: string[]): TypeMatch {
  for (let i = 0; i < tokens.length; i++) {
    const t = stripAl(tokens[i]);
    for (const v of INCOME_VERBS) {
      if (t === v || fuzzyEquals(t, v)) {
        return { type: 'income', matchedWord: tokens[i], tokenIndex: i, confident: true };
      }
    }
  }
  for (let i = 0; i < tokens.length; i++) {
    const t = stripAl(tokens[i]);
    for (const v of EXPENSE_VERBS) {
      if (t === v || fuzzyEquals(t, v)) {
        return { type: 'expense', matchedWord: tokens[i], tokenIndex: i, confident: true };
      }
    }
  }
  // الافتراضي: مصروف (الاستخدام الغالب)
  return { type: 'expense', confident: false };
}

/* ============================================================
   التاريخ النسبي
   ============================================================ */

const DAY_NAMES: Record<string, number> = {
  الاحد: 0, احد: 0,
  الاثنين: 1, اثنين: 1, الاتنين: 1, اتنين: 1,
  الثلاثاء: 2, ثلاثاء: 2, التلات: 2, تلات: 2, الثلاثا: 2, ثلاثا: 2,
  الاربعاء: 3, اربعاء: 3, الاربعا: 3, اربعا: 3,
  الخميس: 4, خميس: 4,
  الجمعه: 5, جمعه: 5,
  السبت: 6, سبت: 6,
};

export interface DateMatch {
  date: string;
  matchedWord: string;
  /** الرموز التي استُهلكت في تحديد التاريخ */
  consumed: number[];
}

/**
 * يفهم: اليوم · امبارح/مبارح/أمس · قبل يومين · قبل 3 ايام · اول امبارح ·
 * أسماء الأيام · تواريخ رقمية 12/9 أو 2026-09-12
 */
export function extractDate(tokens: string[], now: Date = new Date()): DateMatch | null {
  const today = toKey(now);

  for (let i = 0; i < tokens.length; i++) {
    const t = stripAl(tokens[i]);
    const next = tokens[i + 1] ? stripAl(tokens[i + 1]) : '';
    const next2 = tokens[i + 2] ? stripAl(tokens[i + 2]) : '';

    // اليوم / هلق / هسا
    if (['اليوم', 'هاليوم', 'هلق', 'هسا', 'هلا', 'الان', 'حاليا'].includes(t) || t === 'يوم' && next === 'اليوم') {
      return { date: today, matchedWord: tokens[i], consumed: [i] };
    }

    // أمس بكل صيغها
    if (['امبارح', 'مبارح', 'امس', 'البارحه', 'بارحه', 'امبارحه'].includes(t)) {
      // "اول امبارح" = قبل يومين
      const prev = i > 0 ? stripAl(tokens[i - 1]) : '';
      if (prev === 'اول' || prev === 'ول') {
        return { date: toKey(addDays(now, -2)), matchedWord: `${tokens[i - 1]} ${tokens[i]}`, consumed: [i - 1, i] };
      }
      return { date: toKey(addDays(now, -1)), matchedWord: tokens[i], consumed: [i] };
    }

    // "قبل يومين" / "قبل يوم" / "قبل 3 ايام" / "قبل اسبوع"
    if (t === 'قبل') {
      if (['يومين', 'يومان'].includes(next)) {
        return { date: toKey(addDays(now, -2)), matchedWord: `قبل ${tokens[i + 1]}`, consumed: [i, i + 1] };
      }
      if (next === 'يوم') {
        return { date: toKey(addDays(now, -1)), matchedWord: `قبل ${tokens[i + 1]}`, consumed: [i, i + 1] };
      }
      if (['اسبوع', 'جمعه'].includes(next)) {
        return { date: toKey(addDays(now, -7)), matchedWord: `قبل ${tokens[i + 1]}`, consumed: [i, i + 1] };
      }
      if (next === 'اسبوعين') {
        return { date: toKey(addDays(now, -14)), matchedWord: `قبل ${tokens[i + 1]}`, consumed: [i, i + 1] };
      }
      // قبل <عدد> ايام
      const n = parseSmallNumber(next);
      if (n !== null && ['ايام', 'يوم', 'أيام'].includes(next2)) {
        return {
          date: toKey(addDays(now, -n)),
          matchedWord: `قبل ${tokens[i + 1]} ${tokens[i + 2]}`,
          consumed: [i, i + 1, i + 2],
        };
      }
    }

    // "من يومين" = قبل يومين
    if (t === 'من' && ['يومين', 'اسبوع'].includes(next)) {
      const back = next === 'يومين' ? 2 : 7;
      return { date: toKey(addDays(now, -back)), matchedWord: `من ${tokens[i + 1]}`, consumed: [i, i + 1] };
    }

    // اسم اليوم: "يوم الخميس" أو "الخميس"
    if (DAY_NAMES[t] !== undefined) {
      const target = DAY_NAMES[t];
      const d = lastWeekday(now, target);
      return { date: toKey(d), matchedWord: tokens[i], consumed: [i] };
    }

    // تاريخ رقمي: 2026-09-12
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(tokens[i])) {
      const parts = tokens[i].split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      if (!Number.isNaN(d.getTime())) return { date: toKey(d), matchedWord: tokens[i], consumed: [i] };
    }
  }

  return null;
}

/** آخر يوم بهذا الاسم قبل اليوم (أو اليوم نفسه إذا كان مطابقًا) */
function lastWeekday(now: Date, weekday: number): Date {
  const diff = (now.getDay() - weekday + 7) % 7;
  return addDays(now, -diff);
}

export function dayNameOf(dateKey: string): string {
  return AR_DAYS[fromKey(dateKey).getDay()];
}

/* ============================================================
   المبلغ
   ============================================================ */

export interface AmountMatch {
  amountMinor: number;
  matchedWord: string;
  consumed: number[];
  /** هل كان المبلغ مكتوبًا بالحروف؟ */
  fromWords: boolean;
}

function parseSmallNumber(word: string): number | null {
  if (/^\d+$/.test(word)) return Number(word);
  const w = stripAl(word);
  if (WORD_NUMBERS[w] !== undefined) return WORD_NUMBERS[w];
  return null;
}

/**
 * يستخرج المبلغ. يعطي الأولوية للأرقام الصريحة، ثم للأعداد المكتوبة بالحروف.
 * يتجاهل الأرقام التي تبدو كتواريخ أو أوقات.
 */
export function extractAmount(
  tokens: string[],
  currency: string,
  dateConsumed: Set<number>,
): AmountMatch | null {
  // 1) أرقام صريحة (تشمل "5.5" و "1,200" و "٥")
  const candidates: Array<{ value: string; index: number }> = [];

  for (let i = 0; i < tokens.length; i++) {
    if (dateConsumed.has(i)) continue;
    const raw = tokens[i];

    // "بـ8" بعد التطبيع تصبح "ب8" — نفصل حرف الجر
    const cleaned = raw.replace(/^[بلوفك](?=\d)/, '');

    // رقم مع رمز عملة ملتصق مثل "5شيكل"
    const m = cleaned.match(/^(\d{1,9}(?:\.\d{1,3})?)([\u0600-\u06FF]*)$/);
    if (m) {
      candidates.push({ value: m[1], index: i });
      continue;
    }
    if (/^\d{1,9}(\.\d{1,3})?$/.test(cleaned)) {
      candidates.push({ value: cleaned, index: i });
    }
  }

  if (candidates.length > 0) {
    // نفضّل الرقم المجاور لكلمة العملة، وإلا الأول
    const best = candidates[0];
    return {
      amountMinor: toMinor(best.value, currency),
      matchedWord: best.value,
      consumed: [best.index],
      fromWords: false,
    };
  }

  // 2) أعداد مكتوبة بالحروف: "خمسه" · "خمسه وعشرين" · "ميه وخمسين" · "خمس الاف"
  for (let i = 0; i < tokens.length; i++) {
    if (dateConsumed.has(i)) continue;
    const base = parseSmallNumber(tokens[i]);
    if (base === null) continue;

    let total = base;
    const consumed = [i];
    let j = i + 1;

    // مضاعِف: "خمس الاف"
    const nextWord = tokens[j] ? stripAl(tokens[j]) : '';
    if (MULTIPLIERS[nextWord]) {
      total = base * MULTIPLIERS[nextWord];
      consumed.push(j);
      j++;
    }

    // عطف: "خمسه وعشرين" — بعد التطبيع "وعشرين"
    while (tokens[j]) {
      const t = tokens[j];
      const withoutWaw = t.startsWith('و') ? t.slice(1) : null;
      const add = withoutWaw !== null ? parseSmallNumber(withoutWaw) : null;
      if (add === null) break;
      total += add;
      consumed.push(j);
      j++;
    }

    if (total > 0) {
      return {
        amountMinor: toMinor(total, currency),
        matchedWord: consumed.map((k) => tokens[k]).join(' '),
        consumed,
        fromWords: true,
      };
    }
  }

  return null;
}

export { parseSmallNumber };
