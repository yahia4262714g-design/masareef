/**
 * تطبيع النص العربي — الخطوة الأولى قبل أي تحليل.
 * الهدف: توحيد الأشكال المختلفة للحروف والأرقام حتى تعمل المطابقة بثبات.
 */

import { normalizeDigits } from '../money';

/** التشكيل والعلامات التي تُحذف */
const DIACRITICS = /[\u064B-\u0652\u0670\u0640\u06D6-\u06ED]/g;

/** رموز تنسيق غير مرئية (مثل الموجودة في "صرفـت") */
const INVISIBLES = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

export function normalizeArabic(input: string): string {
  let s = input ?? '';

  s = s.normalize('NFKC');
  s = s.replace(INVISIBLES, '');
  s = s.replace(DIACRITICS, ''); // يشمل حذف التطويل ـ
  s = normalizeDigits(s);

  // توحيد الألف بأشكالها
  s = s.replace(/[إأآٱٲٳ]/g, 'ا');
  // توحيد الياء والألف المقصورة
  s = s.replace(/[ىۍێ]/g, 'ي');
  s = s.replace(/[ﻯﻰ]/g, 'ي');
  // التاء المربوطة → هاء (شائع في الكتابة العامية)
  s = s.replace(/ة/g, 'ه');
  // الهمزات
  s = s.replace(/[ؤئ]/g, 'ء');
  // الكاف والياء الفارسية
  s = s.replace(/ک/g, 'ك').replace(/ی/g, 'ي').replace(/ۀ/g, 'ه');
  // ---- حماية الأرقام قبل إزالة علامات الترقيم ----
  // 1) إزالة فواصل الآلاف: 1,200 → 1200
  let prev = '';
  while (prev !== s) {
    prev = s;
    s = s.replace(/(\d)[,\u066C](\d{3})(?!\d)/g, '$1$2');
  }
  // 2) توحيد الفاصلة العشرية وحمايتها برمز مؤقت
  s = s.replace(/(\d)[\u066B.](\d)/g, '$1\u0001$2');

  // علامات الترقيم → مسافة (مع الإبقاء على رموز العملات)
  s = s.replace(/[\u060C\u061B\u061F!.,:;()\[\]{}"'\u00AB\u00BB_\-\u2014\u2013/\\|*#@+=%~`^]/g, ' ');

  // 3) استرجاع الفاصلة العشرية
  s = s.replace(/\u0001/g, '.');

  // توحيد المسافات
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

/** يزيل "ال" التعريف من بداية كلمة للمطابقة الأفضل */
export function stripAl(word: string): string {
  if (word.length > 3 && word.startsWith('ال')) return word.slice(2);
  return word;
}

/** يزيل حروف الجر الملتصقة الشائعة: بـ، لـ، وـ، فـ، كـ */
export function stripPrefixParticles(word: string): string {
  let w = word;
  // نحذف حرفًا واحدًا فقط ونتأكد أن الباقي ذو طول معقول
  const particles = ['ب', 'ل', 'و', 'ف', 'ك'];
  if (w.length >= 4 && particles.includes(w[0])) {
    const rest = w.slice(1);
    if (rest.length >= 3) w = rest;
  }
  return w;
}

export function tokenize(normalized: string): string[] {
  return normalized.split(' ').filter(Boolean);
}

/**
 * مسافة ليفنشتاين المحدودة — تتوقف مبكرًا إذا تجاوزت الحد.
 * تُستخدم للمطابقة التقريبية عند الأخطاء الإملائية البسيطة.
 */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  const prev = new Array<number>(b.length + 1);
  const cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

/** مطابقة تقريبية: تسمح بخطأ حرف واحد للكلمات الطويلة */
export function fuzzyEquals(a: string, b: string): boolean {
  if (a === b) return true;
  const len = Math.min(a.length, b.length);
  if (len < 4) return false;
  const allowed = len >= 7 ? 2 : 1;
  return editDistance(a, b, allowed) <= allowed;
}
