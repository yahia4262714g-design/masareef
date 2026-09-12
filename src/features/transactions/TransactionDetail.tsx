import { useState } from 'react';
import type { Category, Settings, Transaction } from '@/types';
import { currencyInfo, formatAmount } from '@/services/money';
import { formatDateWithDay, formatTime, nowTime, todayKey } from '@/services/dates';
import {
  deleteTransaction, duplicateTransaction, updateTransaction,
} from '@/db/repository';
import { Button, CategoryIcon, Sheet } from '@/components/ui';
import { TransactionForm } from '@/features/add/TransactionForm';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'كاش',
  card: 'بطاقة',
  transfer: 'تحويل',
  other: 'أخرى',
};

export function TransactionDetail({
  tx,
  category,
  categories,
  settings,
  onClose,
  onDeleted,
  onDuplicated,
}: {
  tx: Transaction | null;
  category: Category | undefined;
  categories: Category[];
  settings: Settings;
  onClose: () => void;
  onDeleted: (deleted: Transaction) => void;
  onDuplicated: (tx: Transaction) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!tx) return null;

  const symbol = currencyInfo(tx.currency).symbol;

  const handleDelete = async () => {
    const deleted = await deleteTransaction(tx.id);
    onClose();
    setConfirmDelete(false);
    if (deleted) onDeleted(deleted);
  };

  const handleDuplicate = async () => {
    const copy = await duplicateTransaction(tx, todayKey(), nowTime());
    onClose();
    onDuplicated(copy);
  };

  if (editing) {
    return (
      <Sheet open onClose={() => setEditing(false)} title="تعديل العملية">
        <TransactionForm
          categories={categories}
          settings={settings}
          initial={tx}
          submitLabel="حفظ التعديلات"
          onSubmit={async (draft) => {
            await updateTransaction(tx.id, draft);
            setEditing(false);
            onClose();
          }}
          onCancel={() => setEditing(false)}
        />
      </Sheet>
    );
  }

  if (confirmDelete) {
    return (
      <Sheet
        open
        onClose={() => setConfirmDelete(false)}
        title="حذف العملية"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} style={{ flex: 1 }}>
              تراجع
            </Button>
            <Button variant="danger" onClick={handleDelete} icon="trash" style={{ flex: 1 }}>
              حذف
            </Button>
          </>
        }
      >
        <p style={{ padding: 'var(--sp-4) 0', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
          متأكد بدك تحذف «{tx.description || category?.name || 'هذه العملية'}» بمبلغ{' '}
          <strong className="num" style={{ color: 'var(--text-primary)' }}>
            {formatAmount(tx.amountMinor, tx.currency)} {symbol}
          </strong>
          ؟ رح تقدر تتراجع مباشرة بعد الحذف.
        </p>
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="تفاصيل العملية"
      footer={
        <>
          <Button variant="danger" iconOnly icon="trash" onClick={() => setConfirmDelete(true)} aria-label="حذف" />
          <Button variant="secondary" icon="copy" onClick={handleDuplicate} style={{ flex: 1 }}>
            تكرار اليوم
          </Button>
          <Button variant="primary" icon="edit" onClick={() => setEditing(true)} style={{ flex: 1 }}>
            تعديل
          </Button>
        </>
      }
    >
      <div className="parsed" style={{ paddingTop: 'var(--sp-2)' }}>
        <div className="parsed__head">
          <CategoryIcon
            icon={category?.icon ?? 'more'}
            colorIndex={category?.colorIndex ?? 10}
            size={52}
          />
          <div style={{ minWidth: 0 }}>
            <div
              className="parsed__amount num"
              style={{ color: tx.type === 'expense' ? 'var(--expense)' : 'var(--income)' }}
            >
              {tx.type === 'expense' ? '−' : '+'}
              {formatAmount(tx.amountMinor, tx.currency)} {symbol}
            </div>
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
              {category?.name ?? 'بلا فئة'}
            </div>
          </div>
        </div>

        <div>
          {tx.description && <DetailRow label="الوصف" value={tx.description} />}
          <DetailRow label="التاريخ" value={formatDateWithDay(tx.date)} />
          <DetailRow label="الوقت" value={formatTime(tx.time)} />
          <DetailRow label="النوع" value={tx.type === 'expense' ? 'مصروف' : 'دخل'} />
          {tx.merchant && <DetailRow label="المكان" value={tx.merchant} />}
          {tx.paymentMethod && (
            <DetailRow label="طريقة الدفع" value={PAYMENT_LABELS[tx.paymentMethod] ?? tx.paymentMethod} />
          )}
          {tx.tags && tx.tags.length > 0 && <DetailRow label="الوسوم" value={tx.tags.join('، ')} />}
          {tx.notes && <DetailRow label="ملاحظات" value={tx.notes} />}
          <DetailRow
            label="أُضيفت"
            value={
              tx.source === 'quick'
                ? 'بالإدخال السريع'
                : tx.source === 'import'
                  ? 'من نسخة احتياطية'
                  : tx.source === 'duplicate'
                    ? 'بتكرار عملية'
                    : 'يدويًا'
            }
          />
        </div>
      </div>
    </Sheet>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="parsed__row">
      <span className="parsed__row-label">{label}</span>
      <span className="parsed__row-value" style={{ textAlign: 'end', minWidth: 0 }}>
        {value}
      </span>
    </div>
  );
}
