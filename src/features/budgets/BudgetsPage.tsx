import { useMemo, useState } from 'react';
import type { Budget, Category, Settings, Transaction } from '@/types';
import { filterByRange } from '@/services/analytics';
import { computeBudgetProgress } from '@/services/budgets';
import { currencyInfo, formatAmount, toMinor } from '@/services/money';
import { financialMonthRange, formatRange } from '@/services/dates';
import { setBudget } from '@/db/repository';
import { Icon } from '@/components/Icon';
import {
  Badge, Button, Card, CategoryIcon, EmptyState, InputField, Progress, Sheet,
} from '@/components/ui';
import './budgets.css';

export function BudgetsPage({
  transactions,
  categories,
  categoryMap,
  budgets,
  settings,
}: {
  transactions: Transaction[];
  categories: Category[];
  categoryMap: Map<string, Category>;
  budgets: Budget[];
  settings: Settings;
}) {
  const [editing, setEditing] = useState<{ categoryId: string | null; current: number } | null>(null);
  const [picking, setPicking] = useState(false);

  const symbol = currencyInfo(settings.currency).symbol;
  const range = useMemo(
    () => financialMonthRange(new Date(), settings.monthStartDay),
    [settings.monthStartDay],
  );

  const monthTxs = useMemo(() => filterByRange(transactions, range), [transactions, range]);
  const progress = useMemo(
    () => computeBudgetProgress(monthTxs, budgets, categoryMap),
    [monthTxs, budgets, categoryMap],
  );

  const overall = progress.find((p) => p.budget.categoryId === null);
  const categoryBudgets = progress.filter((p) => p.budget.categoryId !== null);
  const budgetedIds = new Set(budgets.map((b) => b.categoryId).filter(Boolean) as string[]);
  const available = categories.filter(
    (c) => !c.archived && c.type === 'expense' && !budgetedIds.has(c.id),
  );

  const money = (v: number) =>
    settings.hideAmounts ? '••••' : formatAmount(v, settings.currency, { showDecimals: 'never' });

  return (
    <>
      <div className="budget-period">
        <Icon name="calendar" size={15} />
        <span>الفترة الحالية: {formatRange(range.start, range.end)}</span>
      </div>

      {/* ---- الميزانية العامة ---- */}
      {overall ? (
        <Card>
          <div className="budget-card">
            <div className="budget-card__head">
              <div className="row" style={{ gap: 'var(--sp-3)' }}>
                <CategoryIcon icon="wallet" colorIndex={1} size={42} />
                <div>
                  <div className="budget-card__name">الميزانية العامة</div>
                  <div className="budget-card__sub">
                    <span className="num">{money(overall.spent)}</span> من{' '}
                    <span className="num">
                      {money(overall.budget.amountMinor)} {symbol}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                iconOnly
                icon="edit"
                aria-label="تعديل الميزانية العامة"
                onClick={() => setEditing({ categoryId: null, current: overall.budget.amountMinor })}
              />
            </div>
            <Progress
              percent={overall.percent}
              tone={overall.status === 'over' ? 'danger' : overall.status === 'warning' ? 'warn' : 'accent'}
              label="الميزانية العامة"
            />
            <div className="budget-card__foot">
              <span>
                <span className="num">{Math.round(overall.percent)}٪</span> مستخدم
              </span>
              <StatusBadge status={overall.status} remaining={overall.remaining} money={money} symbol={symbol} />
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon="target"
            title="ما عندك ميزانية عامة"
            text="حدّد سقفًا شهريًا لكل مصاريفك لتعرف بسرعة أين تقف."
            action={
              <Button variant="primary" icon="plus" onClick={() => setEditing({ categoryId: null, current: 0 })}>
                حدّد الميزانية العامة
              </Button>
            }
          />
        </Card>
      )}

      {/* ---- ميزانيات الفئات ---- */}
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 'var(--sp-2)' }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          ميزانيات الفئات
        </h2>
        {available.length > 0 && (
          <Button size="sm" icon="plus" onClick={() => setPicking(true)}>
            إضافة
          </Button>
        )}
      </div>

      {categoryBudgets.length === 0 ? (
        <Card>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            ما في ميزانيات لفئات محدّدة بعد. الميزانيات على مستوى الفئة بتساعدك تضبط الأماكن اللي بتصرف
            فيها أكثر من اللازم — مثل المطاعم أو الترفيه.
          </p>
        </Card>
      ) : (
        <div className="stack" style={{ gap: 'var(--sp-3)' }}>
          {categoryBudgets.map((p) => (
            <Card key={p.budget.id}>
              <div className="budget-card">
                <div className="budget-card__head">
                  <div className="row" style={{ gap: 'var(--sp-3)', minWidth: 0 }}>
                    <CategoryIcon icon={p.icon} colorIndex={p.colorIndex} size={40} />
                    <div style={{ minWidth: 0 }}>
                      <div className="budget-card__name truncate">{p.name}</div>
                      <div className="budget-card__sub">
                        <span className="num">{money(p.spent)}</span> من{' '}
                        <span className="num">
                          {money(p.budget.amountMinor)} {symbol}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    iconOnly
                    icon="edit"
                    aria-label={`تعديل ميزانية ${p.name}`}
                    onClick={() =>
                      setEditing({ categoryId: p.budget.categoryId, current: p.budget.amountMinor })
                    }
                  />
                </div>
                <Progress
                  percent={p.percent}
                  tone={p.status === 'over' ? 'danger' : p.status === 'warning' ? 'warn' : 'accent'}
                  label={p.name}
                />
                <div className="budget-card__foot">
                  <span>
                    <span className="num">{Math.round(p.percent)}٪</span> مستخدم
                  </span>
                  <StatusBadge status={p.status} remaining={p.remaining} money={money} symbol={symbol} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ---- اختيار فئة ---- */}
      <Sheet open={picking} onClose={() => setPicking(false)} title="اختر فئة">
        <div className="filter-cats" style={{ paddingTop: 'var(--sp-2)' }}>
          {available.map((c) => (
            <button
              key={c.id}
              type="button"
              className="filter-cat"
              onClick={() => {
                setPicking(false);
                setEditing({ categoryId: c.id, current: 0 });
              }}
            >
              <CategoryIcon icon={c.icon} colorIndex={c.colorIndex} size={30} />
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
      </Sheet>

      {/* ---- تعديل مبلغ ---- */}
      {editing && (
        <BudgetEditor
          categoryId={editing.categoryId}
          currentMinor={editing.current}
          category={editing.categoryId ? categoryMap.get(editing.categoryId) : undefined}
          currency={settings.currency}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function StatusBadge({
  status,
  remaining,
  money,
  symbol,
}: {
  status: 'ok' | 'warning' | 'over';
  remaining: number;
  money: (v: number) => string;
  symbol: string;
}) {
  if (status === 'over') {
    return (
      <Badge tone="danger" icon="alert">
        تجاوزت بـ <span className="num">{money(Math.abs(remaining))} {symbol}</span>
      </Badge>
    );
  }
  if (status === 'warning') {
    return (
      <Badge tone="warn" icon="alert">
        باقي <span className="num">{money(remaining)} {symbol}</span>
      </Badge>
    );
  }
  return (
    <Badge tone="ok">
      باقي <span className="num">{money(remaining)} {symbol}</span>
    </Badge>
  );
}

function BudgetEditor({
  categoryId,
  currentMinor,
  category,
  currency,
  onClose,
}: {
  categoryId: string | null;
  currentMinor: number;
  category: Category | undefined;
  currency: string;
  onClose: () => void;
}) {
  const [text, setText] = useState(
    currentMinor > 0 ? formatAmount(currentMinor, currency, { grouping: false }) : '',
  );
  const amount = toMinor(text, currency);
  const name = category?.name ?? 'الميزانية العامة';

  const save = async () => {
    await setBudget(categoryId, amount, currency);
    onClose();
  };

  const remove = async () => {
    await setBudget(categoryId, 0, currency);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={`ميزانية ${name}`}
      footer={
        <>
          {currentMinor > 0 && (
            <Button variant="danger" iconOnly icon="trash" onClick={remove} aria-label="حذف الميزانية" />
          )}
          <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={save} disabled={amount <= 0} style={{ flex: 2 }}>
            حفظ
          </Button>
        </>
      }
    >
      <div className="stack" style={{ gap: 'var(--sp-4)', paddingTop: 'var(--sp-3)' }}>
        <InputField
          amount
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="0"
          autoFocus
          aria-label="مبلغ الميزانية"
          hint={`المبلغ الشهري بـ${currencyInfo(currency).name}`}
        />
        <div className="suggestions">
          {[200, 400, 600, 1000, 1500, 2000].map((v) => (
            <button key={v} type="button" className="chip" onClick={() => setText(String(v))}>
              <span className="num">{v}</span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
