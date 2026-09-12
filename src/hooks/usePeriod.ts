import { useMemo, useState } from 'react';
import type { Settings } from '@/types';
import {
  type DateRange, dayRange, financialMonthRange, weekRange, yearRange,
} from '@/services/dates';

export type PeriodKey = 'day' | 'week' | 'month' | 'year';

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  day: 'اليوم',
  week: 'الأسبوع',
  month: 'الشهر',
  year: 'السنة',
};

export function buildRange(
  key: PeriodKey,
  settings: Pick<Settings, 'monthStartDay' | 'weekStartDay'>,
  offset = 0,
  now: Date = new Date(),
): DateRange {
  switch (key) {
    case 'day':
      return dayRange(now, offset);
    case 'week':
      return weekRange(now, settings.weekStartDay, offset);
    case 'year':
      return yearRange(now, offset);
    case 'month':
    default:
      return financialMonthRange(now, settings.monthStartDay, offset);
  }
}

/** يدير الفترة المختارة مع الإزاحة، ويعطي الفترة السابقة للمقارنة */
export function usePeriod(
  settings: Pick<Settings, 'monthStartDay' | 'weekStartDay'> | undefined,
  initial: PeriodKey = 'month',
) {
  const [key, setKey] = useState<PeriodKey>(initial);
  const [offset, setOffset] = useState(0);

  const safe = settings ?? { monthStartDay: 1, weekStartDay: 6 };

  const range = useMemo(() => buildRange(key, safe, offset), [key, safe.monthStartDay, safe.weekStartDay, offset]);
  const previous = useMemo(
    () => buildRange(key, safe, offset - 1),
    [key, safe.monthStartDay, safe.weekStartDay, offset],
  );

  return {
    key,
    setKey: (k: PeriodKey) => {
      setKey(k);
      setOffset(0);
    },
    offset,
    setOffset,
    range,
    previous,
    goPrev: () => setOffset((o) => o - 1),
    goNext: () => setOffset((o) => Math.min(o + 1, 0)),
    canGoNext: offset < 0,
    reset: () => setOffset(0),
  };
}
