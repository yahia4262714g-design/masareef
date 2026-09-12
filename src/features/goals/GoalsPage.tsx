import { useState } from 'react';
import type { SavingsGoal, Settings } from '@/types';
import { addGoal, contributeToGoal, deleteGoal, updateGoal } from '@/db/repository';
import { currencyInfo, formatAmount, ratioPercent, toMinor } from '@/services/money';
import { diffDays, formatDate, todayKey } from '@/services/dates';
import { CATEGORY_ICONS, Icon, safeIcon } from '@/components/Icon';
import {
  Button, Card, CategoryIcon, EmptyState, InputField, Progress, Sheet,
} from '@/components/ui';
import './goals.css';

export function GoalsPage({
  goals,
  settings,
}: {
  goals: SavingsGoal[];
  settings: Settings;
}) {
  const [editing, setEditing] = useState<SavingsGoal | 'new' | null>(null);
  const [contributing, setContributing] = useState<SavingsGoal | null>(null);

  const symbol = currencyInfo(settings.currency).symbol;
  const money = (v: number) =>
    settings.hideAmounts ? '••••' : formatAmount(v, settings.currency, { showDecimals: 'never' });

  return (
    <>
      <Button variant="primary" icon="plus" block onClick={() => setEditing('new')}>
        هدف جديد
      </Button>

      {goals.length === 0 ? (
        <EmptyState
          icon="target"
          title="ما عندك أهداف ادخار"
          text="حدّد شيئًا تريد شراءه أو مبلغًا تريد جمعه، وسأحسب لك كم تحتاج أن توفّر أسبوعيًا."
        />
      ) : (
        <div className="stack" style={{ gap: 'var(--sp-3)' }}>
          {goals.map((g) => {
            const percent = ratioPercent(g.savedMinor, g.targetMinor);
            const remaining = Math.max(0, g.targetMinor - g.savedMinor);
            const done = g.savedMinor >= g.targetMinor;
            const daysLeft = g.targetDate ? diffDays(g.targetDate, todayKey()) : null;
            const weeksLeft = daysLeft !== null && daysLeft > 0 ? Math.ceil(daysLeft / 7) : null;
            const monthsLeft = daysLeft !== null && daysLeft > 0 ? Math.ceil(daysLeft / 30) : null;

            return (
              <Card key={g.id}>
                <div className="goal">
                  <div className="goal__head">
                    <div className="row" style={{ gap: 'var(--sp-3)', minWidth: 0 }}>
                      <CategoryIcon icon={g.icon} colorIndex={g.colorIndex} size={44} />
                      <div style={{ minWidth: 0 }}>
                        <div className="goal__name truncate">{g.name}</div>
                        <div className="goal__sub">
                          <span className="num">{money(g.savedMinor)}</span> من{' '}
                          <span className="num">
                            {money(g.targetMinor)} {symbol}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      iconOnly
                      icon="edit"
                      aria-label={`تعديل ${g.name}`}
                      onClick={() => setEditing(g)}
                    />
                  </div>

                  <Progress percent={percent} tone={done ? 'ok' : 'accent'} label={g.name} />

                  <div className="goal__foot">
                    <span className="num">{Math.round(percent)}٪</span>
                    {done ? (
                      <span
                        className="row"
                        style={{ color: 'var(--success)', fontWeight: 600, gap: 'var(--sp-1)' }}
                      >
                        <Icon name="check" size={14} strokeWidth={2.4} />
                        اكتمل الهدف
                      </span>
                    ) : (
                      <span>
                        باقي <span className="num">{money(remaining)} {symbol}</span>
                      </span>
                    )}
                  </div>

                  {!done && g.targetDate && daysLeft !== null && (
                    <div className="goal__plan">
                      {daysLeft > 0 ? (
                        <>
                          <span>
                            الموعد: {formatDate(g.targetDate, { year: true })} (
                            <span className="num">{daysLeft}</span> يوم)
                          </span>
                          {weeksLeft && weeksLeft > 0 && (
                            <span>
                              وفّر <strong className="num">{money(Math.ceil(remaining / weeksLeft))} {symbol}</strong>{' '}
                              أسبوعيًا
                            </span>
                          )}
                          {monthsLeft && monthsLeft > 0 && (
                            <span>
                              أو <strong className="num">{money(Math.ceil(remaining / monthsLeft))} {symbol}</strong>{' '}
                              شهريًا
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--warning)' }}>انتهى الموعد المحدّد للهدف</span>
                      )}
                    </div>
                  )}

                  {!done && (
                    <Button size="sm" icon="plus" block onClick={() => setContributing(g)}>
                      أضف مبلغًا
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <GoalEditor
          goal={editing === 'new' ? null : editing}
          currency={settings.currency}
          onClose={() => setEditing(null)}
        />
      )}

      {contributing && (
        <ContributeSheet
          goal={contributing}
          currency={settings.currency}
          onClose={() => setContributing(null)}
        />
      )}
    </>
  );
}

function GoalEditor({
  goal,
  currency,
  onClose,
}: {
  goal: SavingsGoal | null;
  currency: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState(
    goal ? formatAmount(goal.targetMinor, currency, { grouping: false }) : '',
  );
  const [saved, setSaved] = useState(
    goal ? formatAmount(goal.savedMinor, currency, { grouping: false }) : '',
  );
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '');
  const [icon, setIcon] = useState(goal?.icon ?? 'target');
  const [colorIndex, setColorIndex] = useState(goal?.colorIndex ?? 6);

  const targetMinor = toMinor(target, currency);
  const savedMinor = toMinor(saved, currency);
  const valid = name.trim().length > 0 && targetMinor > 0;

  const save = async () => {
    if (!valid) return;
    const payload = {
      name: name.trim(),
      targetMinor,
      savedMinor: Math.max(0, savedMinor),
      currency,
      targetDate: targetDate || undefined,
      icon,
      colorIndex,
    };
    if (goal) await updateGoal(goal.id, payload);
    else await addGoal(payload);
    onClose();
  };

  const remove = async () => {
    if (!goal) return;
    await deleteGoal(goal.id);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={goal ? 'تعديل الهدف' : 'هدف ادخار جديد'}
      footer={
        <>
          {goal && <Button variant="danger" iconOnly icon="trash" onClick={remove} aria-label="حذف الهدف" />}
          <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={save} disabled={!valid} style={{ flex: 2 }}>
            حفظ
          </Button>
        </>
      }
    >
      <div className="stack" style={{ gap: 'var(--sp-4)', paddingTop: 'var(--sp-2)' }}>
        <div className="row" style={{ justifyContent: 'center' }}>
          <CategoryIcon icon={icon} colorIndex={colorIndex} size={60} />
        </div>

        <InputField
          label="اسم الهدف"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثلاً: شراء كمبيوتر"
          autoFocus={!goal}
        />

        <div className="txform__grid">
          <InputField
            label="المبلغ المطلوب"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="5000"
          />
          <InputField
            label="ما وفّرته"
            inputMode="decimal"
            value={saved}
            onChange={(e) => setSaved(e.target.value)}
            placeholder="0"
          />
        </div>

        <InputField
          label="الموعد المستهدف"
          type="date"
          value={targetDate}
          min={todayKey()}
          onChange={(e) => setTargetDate(e.target.value)}
          hint="اختياري — يساعدني أحسب كم توفّر أسبوعيًا"
        />

        <div className="field">
          <span className="field__label">الأيقونة</span>
          <div className="icon-grid">
            {CATEGORY_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                className={`icon-pick ${icon === ic ? 'icon-pick--active' : ''}`}
                onClick={() => setIcon(ic)}
                aria-label={ic}
                aria-pressed={icon === ic}
              >
                <Icon name={safeIcon(ic)} size={20} />
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field__label">اللون</span>
          <div className="color-grid">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={`color-pick ${colorIndex === n ? 'color-pick--active' : ''}`}
                style={{ background: `var(--cat-${n})` }}
                onClick={() => setColorIndex(n)}
                aria-label={`اللون ${n}`}
                aria-pressed={colorIndex === n}
              />
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function ContributeSheet({
  goal,
  currency,
  onClose,
}: {
  goal: SavingsGoal;
  currency: string;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const amount = toMinor(text, currency);
  const symbol = currencyInfo(currency).symbol;

  const submit = async (delta: number) => {
    await contributeToGoal(goal.id, delta);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={`إضافة إلى «${goal.name}»`}
      footer={
        <>
          <Button variant="secondary" onClick={() => submit(-amount)} disabled={amount <= 0} style={{ flex: 1 }}>
            سحب
          </Button>
          <Button variant="primary" onClick={() => submit(amount)} disabled={amount <= 0} style={{ flex: 2 }}>
            إضافة
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
          aria-label="المبلغ"
          hint={`المتبقي للهدف: ${formatAmount(Math.max(0, goal.targetMinor - goal.savedMinor), currency)} ${symbol}`}
        />
        <div className="suggestions">
          {[50, 100, 200, 500, 1000].map((v) => (
            <button key={v} type="button" className="chip" onClick={() => setText(String(v))}>
              <span className="num">{v}</span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
