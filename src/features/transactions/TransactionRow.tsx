import type { Category, Transaction } from '@/types';
import { formatAmount, currencyInfo } from '@/services/money';
import { formatTime } from '@/services/dates';
import { CategoryIcon } from '@/components/ui';
import '@/features/dashboard/dashboard.css';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'كاش',
  card: 'بطاقة',
  transfer: 'تحويل',
  other: 'أخرى',
};

export function TransactionRow({
  tx,
  category,
  onClick,
  hideAmounts,
  showTime = true,
}: {
  tx: Transaction;
  category: Category | undefined;
  onClick?: () => void;
  hideAmounts?: boolean;
  showTime?: boolean;
}) {
  const symbol = currencyInfo(tx.currency).symbol;
  const title = tx.description?.trim() || tx.merchant?.trim() || category?.name || 'عملية';
  const subParts: string[] = [];

  if (title !== category?.name && category) subParts.push(category.name);
  if (showTime) subParts.push(formatTime(tx.time));
  if (tx.paymentMethod) subParts.push(PAYMENT_LABELS[tx.paymentMethod] ?? '');

  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className="tx-row"
      onClick={onClick}
      aria-label={`${title}، ${formatAmount(tx.amountMinor, tx.currency)} ${symbol}`}
    >
      <CategoryIcon icon={category?.icon ?? 'more'} colorIndex={category?.colorIndex ?? 10} size={40} />
      <span className="tx-row__body">
        <span className="tx-row__title truncate">{title}</span>
        <span className="tx-row__sub truncate">{subParts.filter(Boolean).join(' · ')}</span>
      </span>
      <span
        className={`tx-row__amount tx-row__amount--${tx.type} num`}
        aria-hidden={hideAmounts ? undefined : undefined}
      >
        {hideAmounts ? (
          '••••'
        ) : (
          <>
            {tx.type === 'expense' ? '−' : '+'}
            {formatAmount(tx.amountMinor, tx.currency)} {symbol}
          </>
        )}
      </span>
    </Tag>
  );
}
