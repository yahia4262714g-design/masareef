import {
  useCallback, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { Icon, safeIcon, type IconName } from './Icon';
import './ui.css';

/* ============================================================
   زر
   ============================================================ */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  icon?: IconName;
  iconOnly?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  block,
  icon,
  iconOnly,
  children,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    'btn',
    `btn--${variant}`,
    size !== 'md' ? `btn--${size}` : '',
    block ? 'btn--block' : '',
    iconOnly ? 'btn--icon' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 17 : 19} />}
      {children}
    </button>
  );
}

/* ============================================================
   بطاقة
   ============================================================ */

export function Card({
  children,
  flush,
  className = '',
  as,
  ...rest
}: {
  children: ReactNode;
  flush?: boolean;
  className?: string;
  as?: 'div' | 'section';
} & React.HTMLAttributes<HTMLDivElement>) {
  const Tag = as ?? 'div';
  return (
    <Tag className={`card ${flush ? 'card--flush' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="card__header">
      <h2 className="card__title">{title}</h2>
      {action && (
        <button type="button" className="card__action" onClick={onAction}>
          {action}
          <Icon name="chevron-start" size={15} />
        </button>
      )}
    </div>
  );
}

/* ============================================================
   أيقونة الفئة الملوّنة
   ============================================================ */

export function CategoryIcon({
  icon,
  colorIndex,
  size = 40,
}: {
  icon: string;
  colorIndex: number;
  size?: number;
}) {
  const idx = ((colorIndex - 1) % 10) + 1;
  return (
    <span
      className="cat-icon"
      style={
        {
          width: size,
          height: size,
          '--cat-fg': `var(--cat-${idx})`,
          '--cat-bg': `color-mix(in srgb, var(--cat-${idx}) 14%, transparent)`,
        } as React.CSSProperties
      }
    >
      <Icon name={safeIcon(icon)} size={Math.round(size * 0.52)} />
    </span>
  );
}

/* ============================================================
   حقل إدخال
   ============================================================ */

export interface InputFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  amount?: boolean;
}

export function InputField({ label, hint, error, amount, className = '', ...rest }: InputFieldProps) {
  const id = useId();
  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        id={id}
        className={`input ${amount ? 'input--amount' : ''} ${error ? 'input--invalid' : ''} ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
      {error ? (
        <span className="field__error" id={`${id}-err`} role="alert">
          <Icon name="alert" size={14} />
          {error}
        </span>
      ) : hint ? (
        <span className="field__hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function TextareaField({
  label,
  hint,
  className = '',
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string }) {
  const id = useId();
  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <textarea id={id} className={`input ${className}`} {...rest} />
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

/* ============================================================
   مجموعة أزرار
   ============================================================ */

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="segmented__item"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.icon && <Icon name={o.icon} size={16} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   شارة
   ============================================================ */

export function Badge({
  children,
  tone = 'neutral',
  icon,
}: {
  children: ReactNode;
  tone?: 'ok' | 'warn' | 'danger' | 'info' | 'neutral';
  icon?: IconName;
}) {
  return (
    <span className={`badge badge--${tone}`}>
      {icon && <Icon name={icon} size={12} strokeWidth={2} />}
      {children}
    </span>
  );
}

/* ============================================================
   شريط التقدّم
   ============================================================ */

export function Progress({
  percent,
  tone = 'accent',
  label,
}: {
  percent: number;
  tone?: 'accent' | 'ok' | 'warn' | 'danger';
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const color =
    tone === 'danger' ? 'var(--danger)' : tone === 'warn' ? 'var(--warning)' : tone === 'ok' ? 'var(--success)' : 'var(--accent)';
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="progress__bar" style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}

/* ============================================================
   اللوح المنزلق (Bottom Sheet)
   ============================================================ */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    // يمنع تمرير الصفحة خلف اللوح
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // ينقل التركيز إلى اللوح لقارئات الشاشة
    sheetRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={sheetRef}
        tabIndex={-1}
      >
        <div className="sheet__grip" aria-hidden="true" />
        <div className="sheet__header">
          <h2 className="sheet__title">{title}</h2>
          <Button variant="ghost" iconOnly icon="close" onClick={onClose} aria-label="إغلاق" />
        </div>
        <div className="sheet__body" ref={bodyRef}>
          {children}
        </div>
        {footer && <div className="sheet__footer">{footer}</div>}
      </div>
    </>
  );
}

/* ============================================================
   الحالة الفارغة
   ============================================================ */

export function EmptyState({
  icon = 'wallet',
  title,
  text,
  action,
}: {
  icon?: IconName;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty__icon">
        <Icon name={icon} size={28} />
      </div>
      <p className="empty__title">{title}</p>
      {text && <p className="empty__text">{text}</p>}
      {action}
    </div>
  );
}

/* ============================================================
   المفتاح
   ============================================================ */

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className="toggle"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    />
  );
}

/* ============================================================
   صف إعدادات
   ============================================================ */

export function SettingsRow({
  icon,
  label,
  value,
  onClick,
  right,
  danger,
}: {
  icon?: IconName;
  label: string;
  value?: string;
  onClick?: () => void;
  right?: ReactNode;
  danger?: boolean;
}) {
  const content = (
    <>
      {icon && (
        <span className="settings-row__icon" style={danger ? { color: 'var(--danger)' } : undefined}>
          <Icon name={icon} size={19} />
        </span>
      )}
      <span className="settings-row__label" style={danger ? { color: 'var(--danger)' } : undefined}>
        {label}
      </span>
      {right ?? (
        <span className="settings-row__value">
          {value}
          {onClick && <Icon name="chevron-start" size={15} />}
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="settings-row" onClick={onClick}>
        {content}
      </button>
    );
  }
  return <div className="settings-row">{content}</div>;
}

/* ============================================================
   شريط الإشعار مع التراجع
   ============================================================ */

export interface SnackMessage {
  id: number;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

export function Snackbar({ message, onDismiss }: { message: SnackMessage | null; onDismiss: () => void }) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => onDismissRef.current(), message.duration ?? 5000);
    return () => window.clearTimeout(t);
  }, [message]);

  if (!message) return null;

  return (
    <div className="snackbar" role="status" aria-live="polite">
      <span>{message.text}</span>
      {message.actionLabel && (
        <button
          type="button"
          className="snackbar__action"
          onClick={() => {
            message.onAction?.();
            onDismiss();
          }}
        >
          {message.actionLabel}
        </button>
      )}
    </div>
  );
}

/** خطّاف بسيط لإدارة شريط الإشعار */
export function useSnackbar() {
  const [message, setMessage] = useState<SnackMessage | null>(null);
  const counter = useRef(0);

  const show = useCallback((text: string, opts: Omit<SnackMessage, 'id' | 'text'> = {}) => {
    counter.current += 1;
    setMessage({ id: counter.current, text, ...opts });
  }, []);

  const dismiss = useCallback(() => setMessage(null), []);

  return { message, show, dismiss };
}

/* ============================================================
   هيكل التحميل
   ============================================================ */

export function Skeleton({ height = 20, width = '100%', radius }: { height?: number; width?: string | number; radius?: number }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius }} />;
}
