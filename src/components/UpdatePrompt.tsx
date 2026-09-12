import { useRegisterSW } from 'virtual:pwa-register/react';
import { Icon } from './Icon';
import { Button } from './ui';

/**
 * إشعار توفّر تحديث.
 * التحديث لا يُطبَّق تلقائيًا حتى لا ينقطع عمل المستخدم أو تتضرّر البيانات.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // نفحص التحديثات كل ساعة عند بقاء التطبيق مفتوحًا
      if (registration) {
        setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="update-bar" role="status">
      <Icon name="download" size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
      <span style={{ flex: 1 }}>في نسخة جديدة من التطبيق</span>
      <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
        لاحقًا
      </Button>
      <Button size="sm" variant="primary" onClick={() => updateServiceWorker(true)}>
        تحديث
      </Button>
    </div>
  );
}
