/**
 * كشف الفئة من النص العربي.
 * يعتمد على قاموس الكلمات المفتاحية داخل كل فئة (بما فيها ما يضيفه المستخدم).
 */

import type { Category, TxType } from '@/types';
import { normalizeArabic, stripAl, stripPrefixParticles, fuzzyEquals } from './normalize';

export interface CategoryMatch {
  categoryId: string;
  confidence: number;
  matchedWord: string;
  consumed: number[];
}

/** فهرس مبني مسبقًا: كلمة مفتاحية مطبَّعة → معرّف الفئة */
export interface KeywordIndex {
  exact: Map<string, string[]>;
  /** كل الكلمات لأغراض المطابقة التقريبية */
  all: Array<{ word: string; categoryId: string }>;
}

export function buildKeywordIndex(categories: Category[], type: TxType): KeywordIndex {
  const exact = new Map<string, string[]>();
  const all: Array<{ word: string; categoryId: string }> = [];

  for (const c of categories) {
    if (c.archived || c.type !== type) continue;

    const words = new Set<string>();
    // اسم الفئة نفسه كلمة مفتاحية
    for (const part of normalizeArabic(c.name).split(' ')) {
      if (part.length >= 3) words.add(part);
    }
    for (const k of c.keywords ?? []) {
      const n = normalizeArabic(k);
      if (n.length >= 2) words.add(n);
    }

    for (const w of words) {
      const list = exact.get(w);
      if (list) list.push(c.id);
      else exact.set(w, [c.id]);
      all.push({ word: w, categoryId: c.id });
    }
  }

  return { exact, all };
}

/**
 * يبحث عن أفضل فئة مطابقة.
 * الأولوية: مطابقة عبارة من كلمتين > مطابقة كلمة تامة > مطابقة تقريبية.
 */
export function detectCategory(
  tokens: string[],
  index: KeywordIndex,
  fallbackId: string | null,
): CategoryMatch | null {
  // 1) عبارات من كلمتين (مثل "سوبر ماركت")
  for (let i = 0; i < tokens.length - 1; i++) {
    const phrase = `${tokens[i]} ${tokens[i + 1]}`;
    const hit = index.exact.get(phrase);
    if (hit && hit.length > 0) {
      return { categoryId: hit[0], confidence: 0.98, matchedWord: phrase, consumed: [i, i + 1] };
    }
  }

  // 2) كلمة تامة
  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i];
    const variants = [raw, stripAl(raw), stripPrefixParticles(raw), stripAl(stripPrefixParticles(raw))];
    for (const v of variants) {
      if (v.length < 2) continue;
      const hit = index.exact.get(v);
      if (hit && hit.length > 0) {
        return { categoryId: hit[0], confidence: 0.92, matchedWord: raw, consumed: [i] };
      }
    }
  }

  // 3) مطابقة تقريبية للأخطاء الإملائية
  let best: { categoryId: string; word: string; index: number; score: number } | null = null;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    // نجرّب الكلمة كما هي وبعد إزالة "ال" وحروف الجر — فقد يكون الخطأ في أيّ منها
    const variants = new Set([
      token,
      stripAl(token),
      stripPrefixParticles(token),
      stripAl(stripPrefixParticles(token)),
    ]);
    for (const variant of variants) {
      if (variant.length < 4) continue;
      for (const entry of index.all) {
        if (entry.word.length < 4) continue;
        if (fuzzyEquals(variant, entry.word)) {
          const score = 1 - Math.abs(variant.length - entry.word.length) * 0.05;
          if (!best || score > best.score) {
            best = { categoryId: entry.categoryId, word: token, index: i, score };
          }
        }
      }
    }
  }
  if (best) {
    return { categoryId: best.categoryId, confidence: 0.7, matchedWord: best.word, consumed: [best.index] };
  }

  if (fallbackId) {
    return { categoryId: fallbackId, confidence: 0.2, matchedWord: '', consumed: [] };
  }
  return null;
}
