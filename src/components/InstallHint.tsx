import { useEffect, useState } from 'react';
import { Icon } from './Icon';

const DISMISS_KEY = 'masareef.installHint.dismissed';

/** هل التطبيق يعمل الآن كتطبيق مستقل من الشاشة الرئيسية؟ */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone === true;
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ يعرّف نفسه كـ Mac، فنتحقق من اللمس أيضًا
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/**
 * تلميح لطيف لتثبيت التطبيق — يظهر مرة واحدة فقط.
 * لا يظهر إطلاقًا إذا كان التطبيق مثبّتًا بالفعل.
 */
export function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // التخزين معطّل — نعرض التلميح مرة واحدة في هذه الجلسة فقط
    }
    // تأخير بسيط حتى لا يظهر فور الفتح
    const t = window.setTimeout(() => setShow(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // لا شيء — الإخفاء يبقى ساريًا داخل الجلسة
    }
  };

  if (!show) return null;

  return (
    <div className="install-hint" role="note">
      <Icon name="share" size={20} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="install-hint__text">
          <strong>لأفضل تجربة، ثبّت التطبيق على الشاشة الرئيسية.</strong>
        </div>
        {isIOS() ? (
          <div className="install-hint__steps">
            <span>١ · اضغط زر المشاركة في شريط Safari السفلي</span>
            <span>٢ · اختر «إضافة إلى الشاشة الرئيسية»</span>
            <span>٣ · اضغط «إضافة»</span>
          </div>
        ) : (
          <div className="install-hint__steps">
            <span>افتح قائمة المتصفح واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</span>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="إخفاء"
        style={{
          color: 'var(--text-tertiary)',
          width: 40,
          height: 40,
          display: 'grid',
          placeItems: 'center',
          marginTop: -8,
          marginInlineEnd: -8,
          flexShrink: 0,
        }}
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}
