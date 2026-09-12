import { useMemo, useState } from 'react';
import type { Budget, Category, Settings, Transaction } from '@/types';
import {
  compare, dailySeries, filterByRange, filterByType, periodTotals,
  projectPeriod, totalOf, totalsByCategory, totalsByWeekday,
} from '@/services/analytics';
import { buildInsights, buildSavingsPlan, SAVING_LEVELS, type SavingLevel } from '@/services/insights';
import { currencyInfo, formatAmount, averageMinor } from '@/services/money';
import { AR_DAYS_SHORT, formatDate, formatRange, fromKey, type DateRange } from '@/services/dates';
import { usePeriod, buildRange, PERIOD_LABELS, type PeriodKey } from '@/hooks/usePeriod';
import { Icon, type IconName } from '@/components/Icon';
import { Card, CardHeader, CategoryIcon, EmptyState, Segmented } from '@/components/ui';
import { BarChart, DonutChart, Legend, LineChart } from '@/components/charts';
import './reports.css';

const PERIODS: PeriodKey[] = ['week', 'month', 'year'];

export function ReportsPage({
  transactions,
  categoryMap,
  budgets,
  settings,
}: {
  transactions: Transaction[];
  categoryMap: Map<string, Category>;
  budgets: Budget[];
  settings: Settings;
}) {
  const period = usePeriod(settings, 'month');
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);
  const [savingLevel, setSavingLevel] = useState<SavingLevel>('medium');

  const symbol = currencyInfo(settings.currency).symbol;
  const hide = settings.hideAmounts;
  const money = (v: number) => (hide ? '••••' : formatAmount(v, settings.currency, { showDecimals: 'never' }));

  const data = useMemo(() => {
    const current = filterByRange(transactions, period.range);
    const previous = filterByRange(transactions, period.previous);
    const expenses = filterByType(current, 'expense');
    const prevExpenses = filterByType(previous, 'expense');

    return {
      current,
      previous,
      expenses,
      total: totalOf(expenses),
      prevTotal: totalOf(prevExpenses),
      totals: periodTotals(current),
      byCategory: totalsByCategory(expenses, categoryMap),
      series: dailySeries(expenses, period.range),
      // نرتّب أيام الأسبوع بدءًا من اليوم الذي اختاره المستخدم كبداية للأسبوع
      weekdays: (() => {
        const all = totalsByWeekday(expenses);
        const start = settings.weekStartDay;
        return Array.from({ length: 7 }, (_, i) => all[(start + i) % 7]);
      })(),
      projection: projectPeriod(expenses, period.range, new Date()),
      // لا نرسم الأيام التي لم تأتِ بعد — وإلا ظهر خط مسطّح مضلّل
      visibleSeries: (() => {
        const all = dailySeries(expenses, period.range);
        const elapsed = projectPeriod(expenses, period.range, new Date()).elapsedDays;
        return all.slice(0, Math.max(elapsed, 2));
      })(),
    };
  }, [transactions, period.range, period.previous, categoryMap, settings.weekStartDay]);

  const insights = useMemo(
    () =>
      buildInsights({
        currentTxs: data.current,
        previousTxs: data.previous,
        range: period.range,
        categories: categoryMap,
        budgets,
        currency: settings.currency,
      }),
    [data.current, data.previous, period.range, categoryMap, budgets, settings.currency],
  );

  const savingsPlan = useMemo(
    () => buildSavingsPlan(data.expenses, categoryMap),
    [data.expenses, categoryMap],
  );

  // مقارنة آخر 6 فترات من نفس النوع
  const trendBars = useMemo(() => {
    const count = period.key === 'year' ? 4 : 6;
    return Array.from({ length: count }, (_, i) => {
      const offset = period.offset - (count - 1 - i);
      const r = buildRange(period.key, settings, offset);
      const value = totalOf(filterByType(filterByRange(transactions, r), 'expense'));
      return { label: shortLabel(period.key, r, offset), value, muted: offset !== period.offset };
    });
  }, [transactions, period.key, period.offset, settings]);

  const cmp = compare(data.total, data.prevTotal);
  const slices = data.byCategory.slice(0, 8).map((c) => ({
    id: c.categoryId,
    label: c.category?.name ?? 'أخرى',
    value: c.total,
    colorIndex: c.category?.colorIndex ?? 10,
  }));

  const topWeekday = [...data.weekdays].sort((a, b) => b.average - a.average)[0];

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon="chart"
        title="ما في بيانات للتقارير بعد"
        text="سجّل بعض المصاريف وسأبني لك تقارير ورؤى حقيقية من أرقامك."
      />
    );
  }

  return (
    <>
      {/* ---- اختيار الفترة ---- */}
      <Segmented
        label="الفترة"
        value={period.key}
        onChange={period.setKey}
        options={PERIODS.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))}
      />

      <div className="period-nav">
        <button type="button" onClick={period.goPrev} aria-label="الفترة السابقة">
          <Icon name="chevron-end" size={20} />
        </button>
        <div className="period-nav__label">
          <span>{period.range.label}</span>
          <span className="period-nav__range">{formatRange(period.range.start, period.range.end)}</span>
        </div>
        <button
          type="button"
          onClick={period.goNext}
          disabled={!period.canGoNext}
          aria-label="الفترة التالية"
        >
          <Icon name="chevron-start" size={20} />
        </button>
      </div>

      {data.expenses.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="ما في مصاريف في هذه الفترة"
          text="جرّب فترة ثانية باستخدام الأسهم فوق."
        />
      ) : (
        <>
          {/* ---- الملخّص ---- */}
          <Card>
            <div className="report-summary">
              <div>
                <span className="report-summary__label" style={{ display: 'block' }}>
                  إجمالي المصاريف
                </span>
                <div className="report-summary__total">
                  <span className="num">{money(data.total)}</span>{' '}
                  <span className="report-summary__symbol">{symbol}</span>
                </div>
                {data.prevTotal > 0 && cmp.percent !== null && (
                  <div
                    className="hero__compare"
                    style={{ color: cmp.direction === 'up' ? 'var(--danger)' : 'var(--success)' }}
                  >
                    <Icon name={cmp.direction === 'up' ? 'trend-up' : 'trend-down'} size={15} />
                    <span className="num">{Math.abs(Math.round(cmp.percent))}٪</span>
                    <span style={{ color: 'var(--text-tertiary)' }}>عن الفترة السابقة</span>
                  </div>
                )}
              </div>

              <div className="report-grid">
                <MiniStat label="عدد العمليات" value={String(data.expenses.length)} />
                <MiniStat
                  label="المتوسط اليومي"
                  value={`${money(data.projection.dailyAverage)} ${symbol}`}
                />
                <MiniStat
                  label="أكبر عملية"
                  value={`${money(Math.max(...data.expenses.map((t) => t.amountMinor)))} ${symbol}`}
                />
                <MiniStat
                  label="متوسط العملية"
                  value={`${money(averageMinor(data.total, data.expenses.length))} ${symbol}`}
                />
              </div>
            </div>
          </Card>

          {/* ---- توزيع الفئات ---- */}
          <Card>
            <CardHeader title="توزيع المصاريف" />
            <DonutChart
              slices={slices}
              centerValue={money(
                selectedSlice ? (slices.find((s) => s.id === selectedSlice)?.value ?? 0) : data.total,
              )}
              centerCaption={
                selectedSlice ? (slices.find((s) => s.id === selectedSlice)?.label ?? '') : symbol
              }
              selectedId={selectedSlice}
              onSelect={setSelectedSlice}
            />
            <div style={{ marginTop: 'var(--sp-4)' }}>
              <Legend
                slices={slices}
                formatValue={(v) => `${money(v)} ${symbol}`}
                selectedId={selectedSlice}
                onSelect={setSelectedSlice}
              />
            </div>
          </Card>

          {/* ---- الإنفاق عبر الزمن ---- */}
          {data.visibleSeries.length > 2 && (
            <Card>
              <CardHeader title="الإنفاق عبر الفترة" />
              <LineChart
                points={data.visibleSeries.map((p) => p.total)}
                labels={{
                  start: formatDate(data.visibleSeries[0].date, { year: false }),
                  end: formatDate(data.visibleSeries[data.visibleSeries.length - 1].date, { year: false }),
                }}
              />
            </Card>
          )}

          {/* ---- مقارنة الفترات ---- */}
          <Card>
            <CardHeader title="مقارنة الفترات" />
            <BarChart bars={trendBars} formatValue={(v) => `${money(v)} ${symbol}`} />
          </Card>

          {/* ---- أيام الأسبوع ---- */}
          {data.expenses.length >= 7 && (
            <Card>
              <CardHeader title="الإنفاق حسب أيام الأسبوع" />
              <BarChart
                bars={data.weekdays.map((w) => ({
                  label: AR_DAYS_SHORT[w.weekday],
                  value: w.average,
                  muted: topWeekday ? w.weekday !== topWeekday.weekday : false,
                }))}
                formatValue={(v) => `${money(v)} ${symbol}`}
              />
              {topWeekday && topWeekday.average > 0 && (
                <p className="report-note">
                  متوسط إنفاقك أعلى يوم {topWeekday.name}.
                </p>
              )}
            </Card>
          )}

          {/* ---- الدخل والصافي ---- */}
          {settings.trackIncome && data.totals.income > 0 && (
            <Card>
              <CardHeader title="الدخل مقابل المصاريف" />
              <div className="report-grid">
                <MiniStat label="الدخل" value={`${money(data.totals.income)} ${symbol}`} tone="income" />
                <MiniStat label="المصاريف" value={`${money(data.totals.expense)} ${symbol}`} />
                <MiniStat
                  label="الصافي"
                  value={`${money(data.totals.net)} ${symbol}`}
                  tone={data.totals.net >= 0 ? 'income' : 'expense'}
                />
                <MiniStat
                  label="معدل الادخار"
                  value={data.totals.savingsRate !== null ? `${Math.round(data.totals.savingsRate)}٪` : '—'}
                />
              </div>
            </Card>
          )}

          {/* ---- كيف أوفّر أكثر ---- */}
          {savingsPlan.hasEnoughData && (
            <Card>
              <CardHeader title="كيف أوفّر أكثر؟" />
              <p className="report-note" style={{ marginTop: 0, marginBottom: 'var(--sp-4)' }}>
                هذه اقتراحات على فئاتك المرنة فقط — ما رح أقترح عليك تقليل الصحة أو الفواتير.
              </p>

              <Segmented
                label="مستوى التوفير"
                value={savingLevel}
                onChange={setSavingLevel}
                options={(Object.keys(SAVING_LEVELS) as SavingLevel[]).map((k) => ({
                  value: k,
                  label: `${SAVING_LEVELS[k].label} ${SAVING_LEVELS[k].percent}٪`,
                }))}
              />

              <div className="saving-total">
                <span>التوفير المحتمل</span>
                <strong className="num">
                  {money(savingsPlan.totals[savingLevel])} {symbol}
                </strong>
              </div>
              <p className="report-note" style={{ marginTop: 0 }}>
                {SAVING_LEVELS[savingLevel].hint}
              </p>

              <div className="stack" style={{ gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
                {savingsPlan.opportunities.map((o) => (
                  <div key={o.categoryId} className="saving-row">
                    <CategoryIcon icon={o.icon} colorIndex={o.colorIndex} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="saving-row__name truncate">{o.categoryName}</div>
                      <div className="saving-row__current">
                        تصرف{' '}
                        <span className="num">
                          {money(o.currentMinor)} {symbol}
                        </span>
                      </div>
                    </div>
                    <div className="saving-row__save num">
                      −{money(o.savings[savingLevel])} {symbol}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ---- كل الرؤى ---- */}
          {insights.length > 0 && (
            <Card>
              <CardHeader title="رؤى من بياناتك" />
              <div className="stack" style={{ gap: 'var(--sp-4)' }}>
                {insights.map((ins) => (
                  <div key={ins.id} className="row" style={{ gap: 'var(--sp-3)', alignItems: 'flex-start' }}>
                    <Icon
                      name={ins.icon as IconName}
                      size={17}
                      style={{
                        flexShrink: 0,
                        marginTop: 3,
                        color:
                          ins.tone === 'danger'
                            ? 'var(--danger)'
                            : ins.tone === 'warning'
                              ? 'var(--warning)'
                              : ins.tone === 'positive'
                                ? 'var(--success)'
                                : 'var(--text-tertiary)',
                      }}
                    />
                    <span style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.75 }}>{ins.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ---- كل الفئات ---- */}
          <Card flush>
            <div style={{ padding: 'var(--sp-4) var(--sp-4) var(--sp-2)' }}>
              <CardHeader title="كل الفئات" />
            </div>
            <div className="stack" style={{ padding: '0 var(--sp-4) var(--sp-4)' }}>
              <Legend slices={data.byCategory.map((c) => ({
                id: c.categoryId,
                label: c.category?.name ?? 'أخرى',
                value: c.total,
                colorIndex: c.category?.colorIndex ?? 10,
              }))} formatValue={(v) => `${money(v)} ${symbol}`} />
            </div>
          </Card>
        </>
      )}
    </>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'income' | 'expense';
}) {
  return (
    <div className="mini-stat">
      <span className="mini-stat__label">{label}</span>
      <span className="mini-stat__value num" style={tone ? { color: `var(--${tone})` } : undefined}>
        {value}
      </span>
    </div>
  );
}

const SHORT_MONTHS = ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'];

/** تسمية مختصرة لفترة المقارنة — نستخدم شهر منتصف الفترة لأنه الأدق عند شهر مالي مخصّص */
function shortLabel(key: PeriodKey, range: DateRange, offset: number): string {
  if (offset === 0) return 'الحالية';
  if (key === 'year') return String(fromKey(range.start).getFullYear());
  if (key === 'week') return `${-offset} أ`;
  const start = fromKey(range.start).getTime();
  const end = fromKey(range.end).getTime();
  return SHORT_MONTHS[new Date((start + end) / 2).getMonth()];
}
