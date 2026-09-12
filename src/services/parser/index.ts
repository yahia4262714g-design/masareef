/**
 * المحلّل الرئيسي: يحوّل جملة عربية عامية إلى عملية مالية.
 *
 * كل التحليل يتم محليًا على الجهاز — لا يوجد أي اتصال بخدمة خارجية.
 * البنية مقسّمة (تطبيع → استخراج → تصنيف) بحيث يمكن لاحقًا إضافة
 * مزوّد ذكاء اصطناعي كطبقة اختيارية دون تغيير بقية التطبيق.
 */

import type { Category, ParsedTransaction } from '@/types';
import { todayKey } from '../dates';
import { normalizeArabic, tokenize } from './normalize';
import {
  extractAmount,
  extractCurrency,
  extractDate,
  extractType,
} from './extractors';
import { buildKeywordIndex, detectCategory, type KeywordIndex } from './categorize';

export interface ParserContext {
  categories: Category[];
  defaultCurrency: string;
  now?: Date;
}

/** ذاكرة مؤقتة لفهرس الكلمات المفتاحية — يُعاد بناؤها عند تغيّر الفئات */
let cachedIndex: { key: string; expense: KeywordIndex; income: KeywordIndex } | null = null;

function getIndexes(categories: Category[]) {
  const key = categories.map((c) => `${c.id}:${c.updatedAt}:${c.archived ? 1 : 0}`).join('|');
  if (cachedIndex && cachedIndex.key === key) return cachedIndex;
  cachedIndex = {
    key,
    expense: buildKeywordIndex(categories, 'expense'),
    income: buildKeywordIndex(categories, 'income'),
  };
  return cachedIndex;
}

export function clearParserCache(): void {
  cachedIndex = null;
}

/** كلمات حشو تُحذف من الوصف النهائي */
const STOPWORDS = new Set([
  'على', 'عن', 'في', 'من', 'الى', 'ل', 'ب', 'و', 'يا', 'هاد', 'هاي', 'هذا', 'هذه',
  'كمان', 'بس', 'شوي', 'كتير', 'تقريبا', 'حوالي', 'تبع', 'مشان', 'عشان', 'لاجل',
  'اليوم', 'امبارح', 'مبارح', 'امس', 'قبل', 'يوم', 'يومين', 'ايام', 'اسبوع',
  'صرفت', 'دفعت', 'اشتريت', 'شريت', 'قبضت', 'استلمت', 'ربحت', 'بعت', 'كلفني',
  'كان', 'صار', 'رحت', 'جبت', 'اخذت', 'حطيت',
]);

export function parseArabicTransaction(input: string, ctx: ParserContext): ParsedTransaction {
  const now = ctx.now ?? new Date();
  const normalized = normalizeArabic(input);
  const tokens = tokenize(normalized);

  const warnings: string[] = [];
  const matched: ParsedTransaction['matched'] = {};

  if (tokens.length === 0) {
    return {
      amountMinor: null,
      currency: ctx.defaultCurrency,
      type: 'expense',
      categoryId: null,
      categoryConfidence: 0,
      date: todayKey(now),
      description: '',
      confidence: 0,
      matched,
      warnings: ['اكتب جملة مثل: صرفت 5 شيكل قهوة'],
    };
  }

  // 1) النوع
  const typeMatch = extractType(tokens);
  if (typeMatch.matchedWord) matched.type = typeMatch.matchedWord;

  // 2) العملة
  const currencyMatch = extractCurrency(tokens);
  const currency = currencyMatch?.code ?? ctx.defaultCurrency;
  if (currencyMatch) matched.currency = currencyMatch.matchedWord;

  // 3) التاريخ
  const dateMatch = extractDate(tokens, now);
  const date = dateMatch?.date ?? todayKey(now);
  if (dateMatch) matched.date = dateMatch.matchedWord;
  const dateConsumed = new Set(dateMatch?.consumed ?? []);

  // 4) المبلغ
  const amountMatch = extractAmount(tokens, currency, dateConsumed);
  if (amountMatch) matched.amount = amountMatch.matchedWord;
  if (!amountMatch) warnings.push('ما قدرت أحدد المبلغ');
  else if (amountMatch.amountMinor <= 0) warnings.push('المبلغ لازم يكون أكبر من صفر');

  // 5) الفئة — نستثني الرموز المستهلكة في المبلغ/التاريخ/العملة
  const usedIdx = new Set<number>([
    ...(amountMatch?.consumed ?? []),
    ...(dateMatch?.consumed ?? []),
  ]);
  if (currencyMatch) usedIdx.add(currencyMatch.tokenIndex);
  if (typeMatch.tokenIndex !== undefined) usedIdx.add(typeMatch.tokenIndex);

  const catTokens = tokens.filter((_, i) => !usedIdx.has(i));
  const indexes = getIndexes(ctx.categories);
  const index = typeMatch.type === 'income' ? indexes.income : indexes.expense;

  const fallback = pickFallbackCategory(ctx.categories, typeMatch.type);
  const catMatch = detectCategory(catTokens, index, fallback);
  if (catMatch?.matchedWord) matched.category = catMatch.matchedWord;

  // 6) الوصف: ما تبقّى من كلمات مفيدة
  const description = buildDescription(catTokens, catMatch?.matchedWord);

  // 7) الثقة الإجمالية
  const confidence = computeConfidence({
    hasAmount: !!amountMatch && amountMatch.amountMinor > 0,
    amountFromWords: amountMatch?.fromWords ?? false,
    hasCurrency: !!currencyMatch,
    hasDate: !!dateMatch,
    typeConfident: typeMatch.confident,
    categoryConfidence: catMatch?.confidence ?? 0,
  });

  return {
    amountMinor: amountMatch && amountMatch.amountMinor > 0 ? amountMatch.amountMinor : null,
    currency,
    type: typeMatch.type,
    categoryId: catMatch?.categoryId ?? null,
    categoryConfidence: catMatch?.confidence ?? 0,
    date,
    description,
    confidence,
    matched,
    warnings,
  };
}

function pickFallbackCategory(categories: Category[], type: 'expense' | 'income'): string | null {
  const pool = categories.filter((c) => !c.archived && c.type === type);
  const other = pool.find((c) => c.id === (type === 'expense' ? 'other' : 'other-in'));
  return other?.id ?? pool[0]?.id ?? null;
}

function buildDescription(tokens: string[], matchedCategoryWord?: string): string {
  const words = tokens.filter((t) => {
    if (STOPWORDS.has(t)) return false;
    if (/^\d+(\.\d+)?$/.test(t)) return false;
    if (t.length < 2) return false;
    return true;
  });

  // إذا كانت كلمة الفئة هي الوحيدة، لا داعي لتكرارها في الوصف
  if (words.length === 1 && matchedCategoryWord && words[0] === matchedCategoryWord) return '';
  if (words.length === 0) return '';
  return words.join(' ');
}

function computeConfidence(f: {
  hasAmount: boolean;
  amountFromWords: boolean;
  hasCurrency: boolean;
  hasDate: boolean;
  typeConfident: boolean;
  categoryConfidence: number;
}): number {
  if (!f.hasAmount) return 0;

  let score = 0.4; // وجود مبلغ صالح
  if (!f.amountFromWords) score += 0.1;
  if (f.hasCurrency) score += 0.1;
  if (f.hasDate) score += 0.08;
  if (f.typeConfident) score += 0.12;
  score += f.categoryConfidence * 0.25;

  return Math.min(1, Math.round(score * 100) / 100);
}

export { normalizeArabic, tokenize };
