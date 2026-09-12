import { useMemo, useState } from 'react';
import type { Category, PaymentMethod, Settings, Transaction, TxType } from '@/types';
import { formatAmount, toMinor, currencyInfo, CURRENCIES } from '@/services/money';
import { nowTime, todayKey } from '@/services/dates';
import { Icon, type IconName } from '@/components/Icon';
import {
  Button, CategoryIcon, InputField, Segmented, TextareaField,
} from '@/components/ui';
import './form.css';

export type TransactionDraft = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; icon: IconName }> = [
  { value: 'cash', label: 'كاش', icon: 'cash' },
  { value: 'card', label: 'بطاقة', icon: 'card' },
  { value: 'transfer', label: 'تحويل', icon: 'transfer' },
  { value: 'other', label: 'أخرى', icon: 'more' },
];

export function TransactionForm({
  categories,
  settings,
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'حفظ',
}: {
  categories: Category[];
  settings: Settings;
  initial?: Partial<TransactionDraft>;
  onSubmit: (draft: TransactionDraft) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense');
  const [amountText, setAmountText] = useState(
    initial?.amountMinor ? formatAmount(initial.amountMinor, initial.currency ?? settings.currency, { grouping: false }) : '',
  );
  const [currency, setCurrency] = useState(initial?.currency ?? settings.currency);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [date, setDate] = useState(initial?.date ?? todayKey());
  const [time, setTime] = useState(initial?.time ?? nowTime());
  const [description, setDescription] = useState(initial?.description ?? '');
  const [merchant, setMerchant] = useState(initial?.merchant ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join('، '));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>(initial?.paymentMethod);
  const [showMore, setShowMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const visibleCategories = useMemo(
    () => categories.filter((c) => !c.archived && c.type === type),
    [categories, type],
  );

  // إذا غيّر النوع ولم تعد الفئة صالحة، نختار أول فئة متاحة
  const effectiveCategoryId = useMemo(() => {
    if (visibleCategories.some((c) => c.id === categoryId)) return categoryId;
    return visibleCategories[0]?.id ?? '';
  }, [visibleCategories, categoryId]);

  const amountMinor = toMinor(amountText, currency);
  const amountError = touched && amountMinor <= 0 ? 'أدخل مبلغًا أكبر من صفر' : undefined;
  const canSubmit = amountMinor > 0 && !!effectiveCategoryId && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      await onSubmit({
        type,
        amountMinor,
        currency,
        date,
        time,
        categoryId: effectiveCategoryId,
        description: description.trim() || undefined,
        merchant: merchant.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: tagsText
          .split(/[،,]/)
          .map((t) => t.trim())
          .filter(Boolean),
        paymentMethod,
        source: initial?.source ?? 'manual',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const symbol = currencyInfo(currency).symbol;
  const multiCurrency = Object.keys(CURRENCIES).length > 1;

  return (
    <form className="txform" onSubmit={handleSubmit}>
      <Segmented
        label="نوع العملية"
        value={type}
        onChange={setType}
        options={[
          { value: 'expense', label: 'مصروف', icon: 'arrow-down' },
          { value: 'income', label: 'دخل', icon: 'arrow-up' },
        ]}
      />

      <div className="txform__amount">
        <InputField
          amount
          inputMode="decimal"
          value={amountText}
          onChange={(e) => setAmountText(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="0"
          error={amountError}
          aria-label="المبلغ"
          autoFocus={!initial?.amountMinor}
        />
        <span className="txform__currency">{symbol}</span>
      </div>

      <div className="field">
        <span className="field__label">الفئة</span>
        <div className="txform__cats">
          {visibleCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`txform__cat ${effectiveCategoryId === c.id ? 'txform__cat--active' : ''}`}
              onClick={() => setCategoryId(c.id)}
              aria-pressed={effectiveCategoryId === c.id}
            >
              <CategoryIcon icon={c.icon} colorIndex={c.colorIndex} size={38} />
              <span className="txform__cat-name truncate">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="txform__grid">
        <InputField
          label="التاريخ"
          type="date"
          value={date}
          max={todayKey()}
          onChange={(e) => setDate(e.target.value)}
        />
        <InputField label="الوقت" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>

      <InputField
        label="الوصف"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="اختياري — مثلاً: قهوة الصباح"
        autoComplete="off"
      />

      <button
        type="button"
        className="txform__more"
        onClick={() => setShowMore((v) => !v)}
        aria-expanded={showMore}
      >
        <Icon name={showMore ? 'chevron-up' : 'chevron-down'} size={17} />
        خيارات إضافية
      </button>

      {showMore && (
        <div className="txform__extra">
          <div className="field">
            <span className="field__label">طريقة الدفع</span>
            <div className="suggestions">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  className="chip"
                  aria-pressed={paymentMethod === m.value}
                  onClick={() => setPaymentMethod(paymentMethod === m.value ? undefined : m.value)}
                >
                  <Icon name={m.icon} size={15} />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <InputField
            label="المكان / التاجر"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="مثلاً: سوبرماركت الأمانة"
            autoComplete="off"
          />

          <InputField
            label="الوسوم"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="افصل بينها بفاصلة"
            hint="مفيدة للبحث لاحقًا"
            autoComplete="off"
          />

          {multiCurrency && (
            <div className="field">
              <label className="field__label" htmlFor="cur">
                العملة
              </label>
              <select
                id="cur"
                className="input"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {Object.values(CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          )}

          <TextareaField
            label="ملاحظات"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي تفاصيل تريد تذكّرها"
          />
        </div>
      )}

      <div className="txform__actions">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} style={{ flex: 1 }}>
            إلغاء
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={!canSubmit} style={{ flex: 2 }}>
          {submitting ? 'جارٍ الحفظ…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
