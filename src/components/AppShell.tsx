import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import './layout.css';

interface TabDef {
  to: string;
  label: string;
  icon: IconName;
}

const TABS: TabDef[] = [
  { to: '/', label: 'الرئيسية', icon: 'home' },
  { to: '/transactions', label: 'السجل', icon: 'list' },
  { to: '/reports', label: 'التقارير', icon: 'chart' },
  { to: '/more', label: 'المزيد', icon: 'menu' },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="التنقّل الرئيسي">
      <div className="tabbar__inner">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) => `tab ${isActive ? 'tab--active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <span className="tab__icon">
                  <Icon name={t.icon} size={22} strokeWidth={isActive ? 2.1 : 1.7} />
                </span>
                <span>{t.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

/** الصفحات التي يكون فيها «إضافة عملية» هو الإجراء الأساسي */
const FAB_ROUTES = ['/', '/transactions', '/reports'];

export function Fab({ onClick }: { onClick: () => void }) {
  const { pathname } = useLocation();
  if (!FAB_ROUTES.includes(pathname)) return null;

  return (
    <button type="button" className="fab" onClick={onClick} aria-label="إضافة عملية جديدة">
      <Icon name="plus" size={26} strokeWidth={2.2} />
    </button>
  );
}

export function AppBar({
  title,
  subtitle,
  start,
  end,
}: {
  title: string;
  subtitle?: string;
  start?: ReactNode;
  end?: ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`appbar ${scrolled ? 'appbar--scrolled' : ''}`}>
      <div className="appbar__inner">
        {start}
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="appbar__title truncate">{title}</h1>
          {subtitle && <span className="appbar__sub truncate">{subtitle}</span>}
        </div>
        {end}
      </div>
    </header>
  );
}

/** زر رجوع يحترم اتجاه RTL (السهم يشير لليمين) */
export function BackButton({ to }: { to?: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="btn btn--ghost btn--icon"
      onClick={() => (to ? navigate(to) : navigate(-1))}
      aria-label="رجوع"
      style={{ marginInlineStart: -8 }}
    >
      <Icon name="chevron-end" size={22} />
    </button>
  );
}

/** يعيد التمرير للأعلى عند تغيير الصفحة */
export function ScrollToTop() {
  const { pathname } = useLocation();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
