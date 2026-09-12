import { useMemo, useState } from 'react';
import type { Category, Settings, Transaction } from '@/types';
import { filterByRange, searchTransactions } from '@/services/analytics';
import { currencyInfo, formatAmount } from '@/services/money';
import { buildRange, PERIOD_LABELS, type PeriodKey } from '@/hooks/usePeriod';
import { formatRange } from '@/services/dates';
import { Icon } from '@/components/Icon';
import { Button, Card, EmptyState, Sheet, CategoryIcon } from '@/components/ui';
import { TransactionRow } from './TransactionRow';
import { groupByDay } from './groupByDay';
import './transactions.css';

type SortKey = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

const SORT_LABELS: Record<SortKey, string> = {
  'date-desc': 'الأحدث أولاً',
  'date-asc': 'الأقدم أولاً',
  'amount-desc': 'الأكبر مبلغًا',
  'amount-asc': 'الأصغر مبلغًا',
};

const PERIODS: PeriodKey[] = ['day', 'week', 'month', 'year'];

export function TransactionsPage({
  transactions,
  categories,
  categoryMap,
  settings,
  onOpenTransaction,
}: {
  transactions: Transaction[];
  categories: Category[];
  categoryMap: Map<string, Category>;
  settings: Settings;
  onOpenTransaction: (tx: Transaction) => void;
}) {
  const [period, setPeriod] = useState<PeriodKey | 'all'>('month');
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>('date-desc');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const symbol = currencyInfo(settings.currency).symbol;
  const hide = settings.hideAmounts;

  const range = useMemo(
    () => (period === 'all' ? null : buildRange(period, settings)),
    [period, settings],
  );

  const filtered = useMemo(() => {
    let out = range ? filterByRange(transactions, range) : transactions;

    if (typeFilter !== 'all') out = out.filter((t) => t.type === typeFilter);
    if (categoryFilter.length > 0) out = out.filter((t) => categoryFilter.includes(t.categoryId));

    const min = minAmount ? Number(minAmount) * 100 : null;
    const max = maxAmount ? Number(maxAmount) * 100 : null;
    if (min !== null && Number.isFinite(min)) out = out.filter((t) => t.amountMinor >= min);
    if (max !== null && Number.isFinite(max)) out = out.filter((t) => t.amountMinor <= max);

    out = searchTransactions(out, query, categoryMap);

    switch (sort) {
      case 'date-asc':
        return [...out].sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
      case 'amount-desc':
        return [...out].sort((a, b) => b.amountMinor - a.amountMinor);
      case 'amount-asc':
        return [...out].sort((a, b) => a.amountMinor - b.amountMinor);
      default:
        return out;
    }
  }, [transactions, range, typeFilter, categoryFilter, minAmount, maxAmount, query, categoryMap, sort]);

  const groups = useMemo(
    () => (sort.startsWith('date') ? groupByDay(filtered) : []),
    [filtered, sort],
  );

  const totals = useMemo(() => {
    let expense = 0;
    let income = 0;
    for (const t of filtered) {
      if (t.type === 'expense') expense += t.amountMinor;
      else income += t.amountMinor;
    }
    return { expense, income, count: filtered.length };
  }, [filtered]);

  const activeFilterCount =
    (typeFilter !== 'all' ? 1 : 0) +
    (categoryFilter.length > 0 ? 1 : 0) +
    (minAmount ? 1 : 0) +
    (maxAmount ? 1 : 0) +
    (sort !== 'date-desc' ? 1 : 0);

  const money = (v: number) => (hide ? '••••' : formatAmount(v, settings.currency, { showDecimals: 'never' }));

  const clearFilters = () => {
    setTypeFilter('all');
    setCategoryFilter([]);
    setMinAmount('');
    setMaxAmount('');
    setSort('date-desc');
  };

  return (
    <>
      {/* ---- البحث ---- */}
      <div className="tx-search">
        <Icon name="search" size={18} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        <input
          type="search"
          className="tx-search__input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث في العمليات…"
          aria-label="بحث"
          enterKeyHint="search"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="مسح البحث" className="tx-search__clear">
            <Icon name="close" size={17} />
          </button>
        )}
        <button
          type="button"
          className={`tx-search__filter ${activeFilterCount > 0 ? 'tx-search__filter--active' : ''}`}
          onClick={() => setShowFilters(true)}
          aria-label="فلترة"
        >
          <Icon name="filter" size={18} />
          {activeFilterCount > 0 && <span className="tx-search__badge num">{activeFilterCount}</span>}
        </button>
      </div>

      {/* ---- الفترات ---- */}
      <div className="hscroll">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            className="chip"
            aria-pressed={period === p}
            onClick={() => setPeriod(p)}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          aria-pressed={period === 'all'}
          onClick={() => setPeriod('all')}
        >
          الكل
        </button>
      </div>

      {/* ---- الملخّص ---- */}
      {filtered.length > 0 && (
        <Card>
          <div className="tx-summary">
            <div className="tx-summary__item">
              <span className="tx-summary__label">
                {range ? formatRange(range.start, range.end) : 'كل الفترات'}
              </span>
              <span className="tx-summary__count">
                <span className="num">{totals.count}</span> عملية
              </span>
            </div>
            <div className="tx-summary__figures">
              <div className="tx-summary__figure">
                <span className="tx-summary__label">المصاريف</span>
                <span className="tx-summary__value num">
                  {money(totals.expense)} {symbol}
                </span>
              </div>
              {totals.income > 0 && (
                <div className="tx-summary__figure">
                  <span className="tx-summary__label">الدخل</span>
                  <span className="tx-summary__value num" style={{ color: 'var(--income)' }}>
                    {money(totals.income)} {symbol}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ---- القائمة ---- */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={query ? 'search' : 'list'}
          title={query ? 'ما لقيت نتائج' : 'ما في عمليات في هذه الفترة'}
          text={
            query
              ? `جرّب كلمة أخرى أو وسّع الفترة الزمنية.`
              : 'غيّر الفترة أو أضف عملية جديدة.'
          }
          action={
            (query || activeFilterCount > 0) && (
              <Button
                onClick={() => {
                  setQuery('');
                  clearFilters();
                }}
              >
                مسح البحث والفلاتر
              </Button>
            )
          }
        />
      ) : groups.length > 0 ? (
        groups.map((g) => (
          <div key={g.date} className="day-group">
            <div className="day-group__header">
              <span className="day-group__title">{g.label}</span>
              <span className="day-group__total num">
                {g.expenseTotal > 0 && `${money(g.expenseTotal)} ${symbol}`}
                {g.incomeTotal > 0 && (
                  <span style={{ color: 'var(--income)' }}>
                    {g.expenseTotal > 0 ? ' · ' : ''}+{money(g.incomeTotal)} {symbol}
                  </span>
                )}
              </span>
            </div>
            <Card flush>
              {g.transactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  category={categoryMap.get(tx.categoryId)}
                  onClick={() => onOpenTransaction(tx)}
                  hideAmounts={hide}
                />
              ))}
            </Card>
          </div>
        ))
      ) : (
        <Card flush>
          {filtered.map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              category={categoryMap.get(tx.categoryId)}
              onClick={() => onOpenTransaction(tx)}
              hideAmounts={hide}
              showTime={false}
            />
          ))}
        </Card>
      )}

      {/* ---- لوح الفلاتر ---- */}
      <Sheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        title="فلترة وترتيب"
        footer={
          <>
            <Button variant="secondary" onClick={clearFilters} style={{ flex: 1 }}>
              مسح الكل
            </Button>
            <Button variant="primary" onClick={() => setShowFilters(false)} style={{ flex: 2 }}>
              تطبيق
            </Button>
          </>
        }
      >
        <div className="stack" style={{ gap: 'var(--sp-5)', paddingTop: 'var(--sp-2)' }}>
          <div className="field">
            <span className="field__label">نوع العملية</span>
            <div className="suggestions">
              {(
                [
                  ['all', 'الكل'],
                  ['expense', 'مصاريف'],
                  ['income', 'دخل'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  className="chip"
                  aria-pressed={typeFilter === v}
                  onClick={() => setTypeFilter(v)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field__label">الترتيب</span>
            <div className="suggestions">
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className="chip"
                  aria-pressed={sort === k}
                  onClick={() => setSort(k)}
                >
                  {SORT_LABELS[k]}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field__label">المبلغ ({symbol})</span>
            <div className="txform__grid">
              <input
                className="input"
                inputMode="decimal"
                placeholder="من"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                aria-label="أقل مبلغ"
              />
              <input
                className="input"
                inputMode="decimal"
                placeholder="إلى"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                aria-label="أعلى مبلغ"
              />
            </div>
          </div>

          <div className="field">
            <span className="field__label">
              الفئات {categoryFilter.length > 0 && `(${categoryFilter.length})`}
            </span>
            <div className="filter-cats">
              {categories
                .filter((c) => !c.archived)
                .map((c) => {
                  const active = categoryFilter.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`filter-cat ${active ? 'filter-cat--active' : ''}`}
                      aria-pressed={active}
                      onClick={() =>
                        setCategoryFilter((prev) =>
                          active ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                        )
                      }
                    >
                      <CategoryIcon icon={c.icon} colorIndex={c.colorIndex} size={30} />
                      <span className="truncate">{c.name}</span>
                      {active && <Icon name="check" size={15} strokeWidth={2.4} />}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </Sheet>
    </>
  );
}
