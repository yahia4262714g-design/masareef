import { useCallback, useMemo, useRef, useState } from 'react';
import type { Category, ParsedTransaction, Settings, Transaction } from '@/types';
import { parseArabicTransaction } from '@/services/parser';
import { formatAmount, currencyInfo } from '@/services/money';
import { formatDate, formatDateRelative, nowTime, todayKey } from '@/services/dates';
import { addTransaction } from '@/db/repository';
import { Icon } from '@/components/Icon';
import { Button, CategoryIcon, Sheet } from '@/components/ui';
import { TransactionForm } from './TransactionForm';
import './quickadd.css';

/** أمثلة تظهر للمستخدم الجديد ليتعلّم الصيغة بسرعة */
const EXAMPLES = [
  'صرفت 5 شيكل قهوة',
  'دفعت 20 بنزين',
  'مبارح 35 مطعم',
  'قبضت 3000 راتب',
];

export function QuickAdd({
  categories,
  settings,
  onSaved,
  autoFocus,
}: {
  categories: Category[];
  settings: Settings;
  onSaved: (tx: Transaction) => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canSubmit = text.trim().length > 0;

  const handleParse = useCallback(() => {
    if (!canSubmit) return;
    const result = parseArabicTransaction(text, {
      categories,
      defaultCurrency: settings.currency,
    });
    setParsed(result);
  }, [text, canSubmit, categories, settings.currency]);

  const reset = useCallback(() => {
    setText('');
    setParsed(null);
    setEditing(false);
  }, []);

  const save = useCallback(
    async (p: ParsedTransaction) => {
      if (p.amountMinor === null || p.amountMinor <= 0 || !p.categoryId) return;
      const tx = await addTransaction({
        type: p.type,
        amountMinor: p.amountMinor,
        currency: p.currency,
        date: p.date,
        time: nowTime(),
        categoryId: p.categoryId,
        description: p.description || undefined,
        source: 'quick',
      });
      reset();
      onSaved(tx);
    },
    [onSaved, reset],
  );

  return (
    <div className="quickadd">
      <form
        className="quickadd__field"
        onSubmit={(e) => {
          e.preventDefault();
          handleParse();
        }}
      >
        <Icon name="sparkles" size={19} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          className="quickadd__input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اكتب مثلاً: صرفت 5 شيكل قهوة"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          aria-label="إدخال سريع للمصروف بالعربية"
        />
        <button
          type="submit"
          className="quickadd__send"
          disabled={!canSubmit}
          aria-label="تحليل النص"
        >
          <Icon name="check" size={20} strokeWidth={2.2} />
        </button>
      </form>

      {!text && (
        <div className="suggestions" style={{ marginTop: 'var(--sp-3)' }}>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              className="chip"
              onClick={() => {
                setText(ex);
                inputRef.current?.focus();
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      <ParsedSheet
        parsed={parsed}
        categories={categories}
        settings={settings}
        originalText={text}
        onClose={reset}
        onSave={save}
        onEdit={() => setEditing(true)}
      />

      {editing && parsed && (
        <Sheet open onClose={() => setEditing(false)} title="تعديل قبل الحفظ">
          <TransactionForm
            categories={categories}
            settings={settings}
            initial={{
              type: parsed.type,
              amountMinor: parsed.amountMinor ?? 0,
              currency: parsed.currency,
              date: parsed.date,
              time: nowTime(),
              categoryId: parsed.categoryId ?? categories[0]?.id ?? '',
              description: parsed.description,
              source: 'quick',
            }}
            onSubmit={async (draft) => {
              const tx = await addTransaction(draft);
              reset();
              onSaved(tx);
            }}
            onCancel={() => setEditing(false)}
          />
        </Sheet>
      )}
    </div>
  );
}

/* ============================================================
   بطاقة التأكيد
   ============================================================ */

function ParsedSheet({
  parsed,
  categories,
  settings,
  originalText,
  onClose,
  onSave,
  onEdit,
}: {
  parsed: ParsedTransaction | null;
  categories: Category[];
  settings: Settings;
  originalText: string;
  onClose: () => void;
  onSave: (p: ParsedTransaction) => void;
  onEdit: () => void;
}) {
  const category = useMemo(
    () => categories.find((c) => c.id === parsed?.categoryId),
    [categories, parsed?.categoryId],
  );

  if (!parsed) return null;

  const valid = parsed.amountMinor !== null && parsed.amountMinor > 0 && !!parsed.categoryId;
  const symbol = currencyInfo(parsed.currency).symbol;
  const lowConfidence = parsed.confidence < 0.55;

  return (
    <Sheet
      open
      onClose={onClose}
      title={valid ? 'تأكيد العملية' : 'ما قدرت أفهم'}
      footer={
        valid ? (
          <>
            <Button variant="secondary" onClick={onEdit} icon="edit" style={{ flex: 1 }}>
              تعديل
            </Button>
            <Button variant="primary" onClick={() => onSave(parsed)} icon="check" style={{ flex: 2 }}>
              حفظ
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={onEdit} icon="edit" style={{ flex: 2 }}>
              أكمل يدويًا
            </Button>
          </>
        )
      }
    >
      <div className="parsed">
        {!valid && (
          <div className="parsed__warning">
            <Icon name="alert" size={17} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              {parsed.warnings[0] ?? 'ما قدرت أحدد المبلغ.'} جرّب تكتب المبلغ بالأرقام، مثلاً:
              «صرفت 15 شيكل قهوة».
            </span>
          </div>
        )}

        {valid && (
          <>
            <div className="parsed__head">
              {category && (
                <CategoryIcon icon={category.icon} colorIndex={category.colorIndex} size={52} />
              )}
              <div style={{ minWidth: 0 }}>
                <div
                  className="parsed__amount num"
                  style={{ color: parsed.type === 'expense' ? 'var(--expense)' : 'var(--income)' }}
                >
                  {parsed.type === 'expense' ? '−' : '+'}
                  {formatAmount(parsed.amountMinor!, parsed.currency)} {symbol}
                </div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                  {category?.name}
                  {parsed.description ? ` · ${parsed.description}` : ''}
                </div>
              </div>
            </div>

            {lowConfidence && (
              <div className="parsed__warning">
                <Icon name="info" size={17} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>ما كنت متأكد تمامًا من الفئة — راجعها قبل الحفظ.</span>
              </div>
            )}

            <div>
              <div className="parsed__row">
                <span className="parsed__row-label">النوع</span>
                <span className="parsed__row-value">
                  <Icon
                    name={parsed.type === 'expense' ? 'arrow-down' : 'arrow-up'}
                    size={16}
                    style={{ color: parsed.type === 'expense' ? 'var(--expense)' : 'var(--income)' }}
                  />
                  {parsed.type === 'expense' ? 'مصروف' : 'دخل'}
                </span>
              </div>
              <div className="parsed__row">
                <span className="parsed__row-label">الفئة</span>
                <span className="parsed__row-value">{category?.name ?? '—'}</span>
              </div>
              <div className="parsed__row">
                <span className="parsed__row-label">التاريخ</span>
                <span className="parsed__row-value">
                  {formatDateRelative(parsed.date)}
                  {parsed.date !== todayKey() && (
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-xs)' }}>
                      · {formatDate(parsed.date)}
                    </span>
                  )}
                </span>
              </div>
              {parsed.currency !== settings.currency && (
                <div className="parsed__row">
                  <span className="parsed__row-label">العملة</span>
                  <span className="parsed__row-value">{currencyInfo(parsed.currency).name}</span>
                </div>
              )}
            </div>
          </>
        )}

        <div className="parsed__original">
          <Icon name="info" size={13} style={{ display: 'inline', verticalAlign: -2 }} /> النص الأصلي:
          «{originalText}»
        </div>
      </div>
    </Sheet>
  );
}
