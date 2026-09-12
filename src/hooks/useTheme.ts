import { useCallback, useEffect } from 'react';
import type { ThemeMode } from '@/types';

const STORAGE_KEY = 'masareef.theme';

/** ألوان شريط الحالة لكل وضع — يجب أن تطابق tokens.css */
const THEME_COLORS = { light: '#F7F6F3', dark: '#0E0E0D' };

function resolve(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

function apply(mode: ThemeMode): void {
  const resolved = resolve(mode);
  document.documentElement.setAttribute('data-theme', resolved);

  // نحدّث لون الثيم يدويًا لأن iOS لا يعيد تقييم استعلامات الوسائط داخل meta
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  metas.forEach((m) => m.setAttribute('content', THEME_COLORS[resolved]));

  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // التخزين المحلي قد يكون معطّلاً — الثيم يبقى يعمل داخل الجلسة
  }
}

/** يطبّق الثيم ويستجيب لتغيّر إعدادات النظام */
export function useTheme(mode: ThemeMode | undefined) {
  useEffect(() => {
    if (!mode) return;
    apply(mode);

    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  return useCallback((next: ThemeMode) => apply(next), []);
}
