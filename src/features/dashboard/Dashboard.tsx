import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Budget, Category, Settings, Transaction } from '@/types';
import {
  compare, dailySeries, filterByRange, filterByType, periodTotals, projectPeriod, totalOf,
} from '@/services/analytics';
import { buildInsights } from '@/services/insights';
import { computeBudgetProgress, findOverallBudget } from '@/services/budgets';
import { currencyInfo, formatAmount } from '@/services/money';
import {
  dayRange, financialMonthRange, weekRange, formatRange,
} from '@/services/dates';
import { Icon, type IconName } from '@/components/Icon';
import { Card, CardHeader, EmptyState, Progress, Button } from '@/components/ui';
import { Sparkline } from '@/components/charts';
import { TransactionRow } from '@/features/transactions/TransactionRow';
import './dashboard.css';

export function Dashboard({
  transactions,
  categoryMap,
  budgets,
  settings,
  onOpenTransaction,
}: {
  transactions: Transaction[];
  categoryMap: Map<string, Category>;
  budgets: Budget[];
  settings: Settings;
  onOpenTransaction: (tx: Transaction) => void;
}) {
  const navigate = useNavigate();
  const now = useMemo(() => new Date(), []);
  const symbol = currencyInfo(settings.currency).symbol;
  const hide = settings.hideAmounts;

  const ranges = useMemo(
    () => ({
      today: dayRange(now),
      week: weekRange(now, settings.weekStartDay),
      month: financialMonthRange(now, settings.monthStartDay),
      prevMonth: financialMonthRange(now, settings.monthStartDay, -1),
    }),
    [now, settings.weekStartDay, settings.monthStartDay],
  );

  const data = useMemo(() => {
    const monthTxs = filterByRange(transactions, ranges.month);
    const prevMonthTxs = filterByRange(transactions, ranges.prevMonth);
    const monthExpenses = filterByType(monthTxs, 'expense');

    return {
      monthTxs,
      prevMonthTxs,
      monthExpenses,
      todayTotal: totalOf(filterByType(filterByRange(transactions, ranges.today), 'expense')),
      weekTotal: totalOf(filterByType(filterByRange(transactions, ranges.week), 'expense')),
      monthTotal: totalOf(monthExpenses),
      prevMonthTotal: totalOf(filterByType(prevMonthTxs, 'expense')),
      totals: periodTotals(monthTxs),
      projection: projectPeriod(monthExpenses, ranges.month, now),
      // نقصّ السلسلة عند اليوم الحالي حتى لا يظهر خط مسطّح لأيام لم تأتِ بعد
      series: (() => {
        const all = dailySeries(monthExpenses, ranges.month);
        const elapsed = projectPeriod(monthExpenses, ranges.month, now).elapsedDays;
        return all.slice(0, Math.max(elapsed, 2)).map((p) => p.total);
      })(),
      recent: [...transactions]
        .sort((a, b) =>
          a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date),
        )
        .slice(0, 5),
    };
  }, [transactions, ranges, now]);

  const insights = useMemo(
    () =>
      buildInsights({
        currentTxs: data.monthTxs,
        previousTxs: data.prevMonthTxs,
        range: ranges.month,
        categories: categoryMap,
        budgets,
        currency: settings.currency,
        now,
      }),
    [data.monthTxs, data.prevMonthTxs, ranges.month, categoryMap, budgets, settings.currency, now],
  );

  const budgetProgress = useMemo(
    () => computeBudgetProgress(data.monthTxs, budgets, categoryMap),
    [data.monthTxs, budgets, categoryMap],
  );

  const overallBudget = findOverallBudget(budgets);
  const overallProgress = budgetProgress.find((b) => b.budget.categoryId === null);
  const cmp = compare(data.monthTotal, data.prevMonthTotal);

  const money = (v: number) => (hide ? '••••' : formatAmount(v, settings.currency, { showDecimals: 'never' }));

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon="wallet"
        title="لسا ما سجّلت أي مصروف"
        text="اكتب جملة بسيطة فوق مثل «صرفت 5 شيكل قهوة» وسأفهمها وأسجّلها لك."
        action={
          <Button variant="primary" icon="plus" onClick={() => navigate('/add')}>
            أضف أول مصروف
          </Button>
        }
      />
    );
  }

  return (
    <>
      {/* ---- البطاقة الرئيسية ---- */}
      <section className="hero">
        <div>
          <div className="hero__label">
            <Icon name="calendar" size={15} />
            مصاريف {ranges.month.label}
            <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-xs)' }}>
              {formatRange(ranges.month.start, ranges.month.end)}
            </span>
          </div>
          <div className="hero__amount" style={{ marginTop: 'var(--sp-2)' }}>
            <span className="num">{money(data.monthTotal)}</span>
            <span className="hero__symbol">{symbol}</span>
          </div>
          {data.prevMonthTotal > 0 && cmp.percent !== null && (
            <div
              className="hero__compare"
              style={{
                color: cmp.direction === 'up' ? 'var(--danger)' : 'var(--success)',
                marginTop: 'var(--sp-2)',
              }}
            >
              <Icon name={cmp.direction === 'up' ? 'trend-up' : 'trend-down'} size={15} />
              <span className="num">{Math.abs(Math.round(cmp.percent))}٪</span>
              <span style={{ color: 'var(--text-tertiary)' }}>عن الشهر الماضي</span>
            </div>
          )}
        </div>

        {data.series.some((v) => v > 0) && <Sparkline points={data.series} />}

        <div className="hero__stats">
          <Stat label="اليوم" value={money(data.todayTotal)} symbol={symbol} />
          <Stat label="هذا الأسبوع" value={money(data.weekTotal)} symbol={symbol} />
          <Stat
            label="المعدل اليومي"
            value={money(data.projection.dailyAverage)}
            symbol={symbol}
          />
        </div>
      </section>

      {/* ---- أهم رؤية ---- */}
      {insights.length > 0 && (
        <div className={`insight insight--${insights[0].tone}`}>
          <span className="insight__icon">
            <Icon name={insights[0].icon as IconName} size={18} />
          </span>
          <span>{insights[0].text}</span>
        </div>
      )}

      {/* ---- الميزانية ---- */}
      {overallBudget && overallProgress ? (
        <Card>
          <CardHeader title="الميزانية الشهرية" action="إدارة" onAction={() => navigate('/budgets')} />
          <div className="budget-mini">
            <div className="budget-mini__row">
              <span className="budget-mini__spent num">
                {money(overallProgress.spent)} {symbol}
              </span>
              <span className="budget-mini__total">
                من{' '}
                <span className="num">
                  {money(overallBudget.amountMinor)} {symbol}
                </span>
              </span>
            </div>
            <Progress
              percent={overallProgress.percent}
              tone={
                overallProgress.status === 'over'
                  ? 'danger'
                  : overallProgress.status === 'warning'
                    ? 'warn'
                    : 'accent'
              }
              label="استهلاك الميزانية الشهرية"
            />
            <div className="budget-mini__foot">
              <span>
                <span className="num">{Math.round(overallProgress.percent)}٪</span> مستخدم
              </span>
              <span>
                {overallProgress.remaining >= 0 ? 'باقي ' : 'تجاوزت بـ '}
                <span className="num">
                  {money(Math.abs(overallProgress.remaining))} {symbol}
                </span>
              </span>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="row" style={{ gap: 'var(--sp-3)' }}>
            <Icon name="target" size={20} style={{ color: 'var(--text-tertiary)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>ما عندك ميزانية بعد</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
                حدّد سقفًا شهريًا لتعرف أين تقف
              </div>
            </div>
            <Button size="sm" onClick={() => navigate('/budgets')}>
              إضافة
            </Button>
          </div>
        </Card>
      )}

      {/* ---- ميزانيات الفئات القريبة من الحد ---- */}
      {budgetProgress.filter((b) => b.budget.categoryId !== null && b.status !== 'ok').length > 0 && (
        <Card>
          <CardHeader title="تنبيهات الميزانيات" action="الكل" onAction={() => navigate('/budgets')} />
          <div className="stack" style={{ gap: 'var(--sp-4)' }}>
            {budgetProgress
              .filter((b) => b.budget.categoryId !== null && b.status !== 'ok')
              .slice(0, 3)
              .map((b) => (
                <div key={b.budget.id} className="budget-mini">
                  <div className="budget-mini__foot">
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.name}</span>
                    <span className="num">
                      {money(b.spent)} / {money(b.budget.amountMinor)} {symbol}
                    </span>
                  </div>
                  <Progress percent={b.percent} tone={b.status === 'over' ? 'danger' : 'warn'} label={b.name} />
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* ---- الدخل والصافي ---- */}
      {settings.trackIncome && data.totals.income > 0 && (
        <Card>
          <CardHeader title="الدخل والصافي" />
          <div className="hero__stats" style={{ paddingTop: 0, borderTop: 'none' }}>
            <Stat label="الدخل" value={money(data.totals.income)} symbol={symbol} tone="income" />
            <Stat label="المصاريف" value={money(data.totals.expense)} symbol={symbol} />
            <Stat
              label="الصافي"
              value={money(data.totals.net)}
              symbol={symbol}
              tone={data.totals.net >= 0 ? 'income' : 'expense'}
            />
          </div>
          {data.totals.savingsRate !== null && !hide && (
            <div style={{ marginTop: 'var(--sp-4)' }}>
              <div className="budget-mini__foot" style={{ marginBottom: 'var(--sp-2)' }}>
                <span>معدل الادخار</span>
                <span className="num">{Math.round(data.totals.savingsRate)}٪</span>
              </div>
              <Progress
                percent={Math.max(0, data.totals.savingsRate)}
                tone={data.totals.savingsRate >= 20 ? 'ok' : data.totals.savingsRate >= 0 ? 'accent' : 'danger'}
                label="معدل الادخار"
              />
            </div>
          )}
        </Card>
      )}

      {/* ---- آخر العمليات ---- */}
      <Card flush>
        <div style={{ padding: 'var(--sp-4) var(--sp-4) 0' }}>
          <CardHeader title="آخر العمليات" action="الكل" onAction={() => navigate('/transactions')} />
        </div>
        <div>
          {data.recent.map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              category={categoryMap.get(tx.categoryId)}
              onClick={() => onOpenTransaction(tx)}
              hideAmounts={hide}
            />
          ))}
        </div>
      </Card>

      {/* ---- رؤى إضافية ---- */}
      {insights.length > 1 && (
        <Card>
          <CardHeader title="نظرة على مصاريفك" action="التقارير" onAction={() => navigate('/reports')} />
          <div className="stack" style={{ gap: 'var(--sp-3)' }}>
            {insights.slice(1, 4).map((ins) => (
              <div
                key={ins.id}
                className="row"
                style={{ gap: 'var(--sp-3)', alignItems: 'flex-start' }}
              >
                <Icon
                  name={ins.icon as IconName}
                  size={17}
                  style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 3 }}
                />
                <span style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.7 }}>{ins.text}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* المساحة السفلية موجودة أصلاً عبر padding الصفحة */}
      <span aria-hidden="true" />
    </>
  );
}

function Stat({
  label,
  value,
  symbol,
  tone,
}: {
  label: string;
  value: string;
  symbol: string;
  tone?: 'income' | 'expense';
}) {
  return (
    <div className="hero__stat">
      <span className="hero__stat-label">{label}</span>
      <span
        className="hero__stat-value num"
        style={tone ? { color: `var(--${tone})` } : undefined}
      >
        {value} <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>{symbol}</span>
      </span>
    </div>
  );
}
