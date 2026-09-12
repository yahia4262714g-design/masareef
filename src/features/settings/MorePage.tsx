import { useNavigate } from 'react-router-dom';
import { Card, SettingsRow } from '@/components/ui';
import { APP_VERSION } from '@/constants';

export function MorePage({ transactionCount }: { transactionCount: number }) {
  const navigate = useNavigate();

  return (
    <>
      <div>
        <h2 className="section-title">التخطيط</h2>
        <div className="settings-list">
          <SettingsRow icon="target" label="الميزانيات" onClick={() => navigate('/budgets')} />
          <SettingsRow icon="pie" label="أهداف الادخار" onClick={() => navigate('/goals')} />
          <SettingsRow icon="tag" label="التصنيفات" onClick={() => navigate('/categories')} />
        </div>
      </div>

      <div>
        <h2 className="section-title">البيانات</h2>
        <div className="settings-list">
          <SettingsRow
            icon="download"
            label="النسخ الاحتياطي والاستعادة"
            onClick={() => navigate('/backup')}
          />
          <SettingsRow
            icon="list"
            label="كل العمليات"
            value={String(transactionCount)}
            onClick={() => navigate('/transactions')}
          />
        </div>
      </div>

      <div>
        <h2 className="section-title">التطبيق</h2>
        <div className="settings-list">
          <SettingsRow icon="settings" label="الإعدادات" onClick={() => navigate('/settings')} />
        </div>
      </div>

      <Card>
        <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--fs-xs)', lineHeight: 1.9 }}>
          <div>مصاريف · الإصدار {APP_VERSION}</div>
          <div>بياناتك محفوظة على جهازك فقط</div>
        </div>
      </Card>
    </>
  );
}
