/**
 * مجموعة أيقونات مرسومة يدويًا بـ SVG — بلا أي مكتبة خارجية.
 * كلها بنفس الشبكة (24×24) وبنفس سماكة الخط لتبقى متناسقة.
 */

export type IconName =
  | 'home' | 'list' | 'chart' | 'menu' | 'plus' | 'close' | 'check' | 'chevron-start'
  | 'chevron-end' | 'chevron-down' | 'chevron-up' | 'search' | 'filter' | 'edit'
  | 'trash' | 'settings' | 'download' | 'upload' | 'eye' | 'eye-off' | 'sun' | 'moon'
  | 'monitor' | 'wallet' | 'target' | 'alert' | 'info' | 'trend-up' | 'trend-down'
  | 'calendar' | 'pie' | 'repeat' | 'copy' | 'share' | 'tag' | 'sparkles' | 'shield'
  | 'utensils' | 'coffee' | 'bus' | 'fuel' | 'car' | 'shopping-bag' | 'shirt'
  | 'receipt' | 'wifi' | 'heart' | 'gift' | 'briefcase' | 'book' | 'users'
  | 'scissors' | 'more' | 'arrow-up' | 'arrow-down' | 'card' | 'cash' | 'transfer';

const PATHS: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5M9.5 20v-6h5v6',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  menu: 'M4 7h16M4 12h16M4 17h16',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M4 12.5l5 5L20 6.5',
  'chevron-start': 'M15 5l-7 7 7 7',
  'chevron-end': 'M9 5l7 7-7 7',
  'chevron-down': 'M5 9l7 7 7-7',
  'chevron-up': 'M5 15l7-7 7 7',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3',
  filter: 'M3 5h18l-7 8v6l-4 2v-8L3 5Z',
  edit: 'M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4ZM14.5 6.5l3 3',
  trash: 'M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13M10 11v6M14 11v6',
  settings:
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.5l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 14H3.5a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.6V3.5a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.1a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.2.8Z',
  download: 'M12 3v12M7 11l5 5 5-5M4 20h16',
  upload: 'M12 16V4M7 8l5-5 5 5M4 20h16',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z M12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z',
  'eye-off': 'M3 3l18 18M10.6 10.7a2.8 2.8 0 0 0 3.8 3.8M6.5 6.7C4 8.4 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.8 0 3.3-.6 4.6-1.4M9.9 5.7c.7-.1 1.4-.2 2.1-.2 6 0 9.5 6.5 9.5 6.5s-.8 1.5-2.3 3',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1.5v2.5M12 20v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M1.5 12H4M20 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8',
  moon: 'M20.5 14.3A8.6 8.6 0 0 1 9.7 3.5a8.6 8.6 0 1 0 10.8 10.8Z',
  monitor: 'M3.5 4.5h17v11h-17zM8.5 20h7M12 15.5V20',
  wallet: 'M3.5 7.5A2 2 0 0 1 5.5 5.5h12a2 2 0 0 1 2 2v1M3.5 7.5v9a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-2.5M3.5 7.5v.5M20.5 10.5h-3.8a1.8 1.8 0 0 0 0 3.6h3.8v-3.6Z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  alert: 'M12 8.5v5M12 17h.01M10.3 3.9 2.5 17.5a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 8h.01',
  'trend-up': 'M3 17l6-6 4 4 8-8M15 7h6v6',
  'trend-down': 'M3 7l6 6 4-4 8 8M15 17h6v-6',
  calendar: 'M4 6.5h16v14H4zM4 10.5h16M8.5 3.5V7M15.5 3.5V7',
  pie: 'M12 3a9 9 0 1 0 9 9h-9V3Z M15.5 3.8A9 9 0 0 1 20.2 8.5h-4.7V3.8Z',
  repeat: 'M4 8.5A3.5 3.5 0 0 1 7.5 5h12M16 2l3.5 3-3.5 3M20 15.5A3.5 3.5 0 0 1 16.5 19h-12M8 22l-3.5-3 3.5-3',
  copy: 'M8.5 8.5h11v11h-11zM5.5 15.5h-1v-11h11v1',
  share: 'M12 15V3M8 7l4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
  tag: 'M3.5 11.5V4.5h7l10 10-7 7-10-10ZM7.5 8h.01',
  sparkles: 'M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3ZM18.5 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z',
  shield: 'M12 21s7.5-3.5 7.5-9.5V5.5L12 2.5 4.5 5.5v6c0 6 7.5 9.5 7.5 9.5Z',
  utensils: 'M6.5 3v7a2.5 2.5 0 0 0 5 0V3M9 10v11M17 3c-1.5 1.5-2 3.5-2 6 0 1.5.7 2.5 2 3v9',
  coffee: 'M4.5 8.5h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5v-6ZM16.5 10h1.5a2.5 2.5 0 0 1 0 5h-1.5M7 2.5c-.6.8-.6 1.7 0 2.5M11 2.5c-.6.8-.6 1.7 0 2.5',
  bus: 'M4.5 5.5A2 2 0 0 1 6.5 3.5h11a2 2 0 0 1 2 2v11h-15v-11ZM4.5 11h15M7.5 20.5v-4M16.5 20.5v-4M8 19h.01M16 19h.01',
  fuel: 'M4.5 20.5V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v15.5M3 20.5h12.5M6.5 8.5h5M16.5 9l2.5 2.5v6a1.8 1.8 0 0 1-3.5 0V7l-1.5-1.5',
  car: 'M3.5 16.5v-3l2-5a2 2 0 0 1 1.9-1.3h9.2a2 2 0 0 1 1.9 1.3l2 5v3M3.5 16.5h17M3.5 16.5v2.5h3v-2.5M17.5 16.5V19h3v-2.5M7 13h.01M17 13h.01',
  'shopping-bag': 'M5.5 7.5h13l1 13h-15l1-13ZM8.5 10V6a3.5 3.5 0 0 1 7 0v4',
  shirt: 'M8.5 3 4 6l2 3.5 1.5-1V21h9V8.5l1.5 1L20 6l-4.5-3M8.5 3c0 1.9 1.6 3 3.5 3s3.5-1.1 3.5-3',
  receipt: 'M5.5 3.5h13v18l-2.2-1.5-2.2 1.5-2.1-1.5-2.2 1.5L7.7 21l-2.2 1V3.5ZM9 8h6M9 12h6M9 16h3',
  wifi: 'M2.5 9.5a14 14 0 0 1 19 0M5.5 13a10 10 0 0 1 13 0M8.5 16.4a5.5 5.5 0 0 1 7 0M12 20h.01',
  heart: 'M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.5 2.8c0 5.8-8.5 11.3-8.5 11.3Z',
  gift: 'M3.5 11.5h17v9h-17zM2.5 7.5h19v4h-19zM12 7.5v13M12 7.5S10.5 3 8 3a2.3 2.3 0 0 0 0 4.5h4ZM12 7.5S13.5 3 16 3a2.3 2.3 0 0 1 0 4.5h-4Z',
  briefcase: 'M3.5 7.5h17v12h-17zM8.5 7.5V5a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 5v2.5M3.5 12.5h17',
  book: 'M4 4.5A1.5 1.5 0 0 1 5.5 3H19v18H5.5A1.5 1.5 0 0 1 4 19.5v-15ZM4 17.5h15',
  users: 'M15.5 20v-2a3.5 3.5 0 0 0-3.5-3.5H6.5A3.5 3.5 0 0 0 3 18v2M9.2 11a3.7 3.7 0 1 0 0-7.5 3.7 3.7 0 0 0 0 7.5ZM21 20v-2a3.5 3.5 0 0 0-2.6-3.4M15.5 3.7a3.7 3.7 0 0 1 0 7.1',
  scissors: 'M6.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM20 4 8.3 16.3M8.3 7.7 20 20M14 12l-5.6-4.3',
  more: 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  'arrow-up': 'M12 20V4M6 10l6-6 6 6',
  'arrow-down': 'M12 4v16M6 14l6 6 6-6',
  card: 'M2.5 6.5h19v11h-19zM2.5 10.5h19M6 14.5h3',
  cash: 'M2.5 6.5h19v11h-19zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6 9.5h.01M18 14.5h.01',
  transfer: 'M4 8.5h14M14.5 5 18 8.5 14.5 12M20 15.5H6M9.5 12 6 15.5 9.5 19',
};

export interface IconProps {
  name: IconName;
  size?: number;
  /** سماكة الخط — 1.7 هي الافتراضية المتناسقة */
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
  /** أيقونات الاتجاه تُعكس تلقائيًا في RTL */
  flipRTL?: boolean;
}

export function Icon({ name, size = 22, strokeWidth = 1.7, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name] ?? PATHS.more} />
    </svg>
  );
}

/** يتحقّق أن اسم الأيقونة موجود، وإلا يعيد بديلاً آمنًا */
export function safeIcon(name: string): IconName {
  return (name in PATHS ? name : 'more') as IconName;
}

export const ICON_NAMES = Object.keys(PATHS) as IconName[];

/** أيقونات مناسبة للاختيار عند إنشاء فئة */
export const CATEGORY_ICONS: IconName[] = [
  'utensils', 'coffee', 'bus', 'fuel', 'car', 'shopping-bag', 'shirt', 'home',
  'receipt', 'wifi', 'sparkles', 'heart', 'gift', 'briefcase', 'book', 'users',
  'scissors', 'repeat', 'wallet', 'target', 'tag', 'shield', 'calendar', 'more',
];
