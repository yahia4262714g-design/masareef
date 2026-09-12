import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Settings, ThemeMode } from '@/types';
import { resetAllData, updateSettings } from '@/db/db';
import { CURRENCIES, currencyInfo } from '@/services/money';
import { AR_DAYS } from '@/services/dates';
import { Icon } from '@/components/Icon';
import {
  Button, Card, InputField, Segmented, SettingsRow, Sheet, Toggle,
} from '@/components/ui';
import { APP_VERSION } from '@/constants';

export function SettingsPage({
  settings,
  transactionCount,
  onThemeChange,
}: {
  settings: Settings;
  transactionCount: number;
  onThemeChange: (mode: ThemeMode) => void;
}) {
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<null | 'currency' | 'monthStart' | 'weekStart' | 'reset' | 'about' | 'privacy'>(null);
  const [resetConfirmText, setResetConfirmText] = useState('');

  const setTheme = async (mode: ThemeMode) => {
    onThemeChange(mode);
    await updateSettings({ theme: mode });
  };

  const doReset = async () => {
    await resetAllData();
    setSheet(null);
    setResetConfirmText('');
    navigate('/');
  };

  return (
    <>
      {/* ---- المظهر ---- */}
      <div>
        <h2 className="section-title">المظهر</h2>
        <Card>
          <Segmented
            label="الوضع"
            value={settings.theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: 'فاتح', icon: 'sun' },
              { value: 'dark', label: 'داكن', icon: 'moon' },
              { value: 'system', label: 'النظام', icon: 'monitor' },
            ]}
          />
        </Card>
      </div>

      {/* ---- المال ---- */}
      <div>
        <h2 className="section-title">المال والفترات</h2>
        <div className="settings-list">
          <SettingsRow
            icon="wallet"
            label="العملة"
            value={`${currencyInfo(settings.currency).name} (${currencyInfo(settings.currency).symbol})`}
            onClick={() => setSheet('currency')}
          />
          <SettingsRow
            icon="calendar"
            label="بداية الشهر المالي"
            value={settings.monthStartDay === 1 ? 'أول الشهر' : `يوم ${settings.monthStartDay}`}
            onClick={() => setSheet('monthStart')}
          />
          <SettingsRow
            icon="calendar"
            label="بداية الأسبوع"
            value={AR_DAYS[settings.weekStartDay]}
            onClick={() => setSheet('weekStart')}
          />
          <SettingsRow
            icon="arrow-up"
            label="تتبّع الدخل"
            right={
              <Toggle
                checked={settings.trackIncome}
                onChange={(v) => updateSettings({ trackIncome: v })}
                label="تتبّع الدخل"
              />
            }
          />
        </div>
      </div>

      {/* ---- التنظيم ---- */}
      <div>
        <h2 className="section-title">التنظيم</h2>
        <div className="settings-list">
          <SettingsRow icon="tag" label="التصنيفات" onClick={() => navigate('/categories')} />
          <SettingsRow icon="target" label="الميزانيات" onClick={() => navigate('/budgets')} />
          <SettingsRow icon="pie" label="أهداف الادخار" onClick={() => navigate('/goals')} />
        </div>
      </div>

      {/* ---- الخصوصية ---- */}
      <div>
        <h2 className="section-title">الخصوصية والبيانات</h2>
        <div className="settings-list">
          <SettingsRow
            icon="eye-off"
            label="إخفاء المبالغ"
            right={
              <Toggle
                checked={settings.hideAmounts}
                onChange={(v) => updateSettings({ hideAmounts: v })}
                label="إخفاء المبالغ"
              />
            }
          />
          <SettingsRow
            icon="check"
            label="تأكيد الإدخال السريع"
            right={
              <Toggle
                checked={settings.confirmQuickAdd}
                onChange={(v) => updateSettings({ confirmQuickAdd: v })}
                label="تأكيد الإدخال السريع"
              />
            }
          />
          <SettingsRow icon="download" label="النسخ الاحتياطي والاستعادة" onClick={() => navigate('/backup')} />
          <SettingsRow icon="shield" label="كيف تُحفظ بياناتي؟" onClick={() => setSheet('privacy')} />
        </div>
      </div>

      {/* ---- عن التطبيق ---- */}
      <div>
        <h2 className="section-title">التطبيق</h2>
        <div className="settings-list">
          <SettingsRow icon="info" label="عن التطبيق" value={`الإصدار ${APP_VERSION}`} onClick={() => setSheet('about')} />
          <SettingsRow icon="trash" label="إعادة ضبط التطبيق" danger onClick={() => setSheet('reset')} />
        </div>
      </div>

      {/* ============ الألواح ============ */}

      <Sheet open={sheet === 'currency'} onClose={() => setSheet(null)} title="العملة الأساسية">
        <div className="settings-list" style={{ marginTop: 'var(--sp-2)' }}>
          {Object.values(CURRENCIES).map((c) => (
            <SettingsRow
              key={c.code}
              label={`${c.name} (${c.symbol})`}
              onClick={async () => {
                await updateSettings({ currency: c.code });
                setSheet(null);
              }}
              right={
                settings.currency === c.code ? (
                  <span className="settings-row__value" style={{ color: 'var(--accent-text)' }}>
                    <Icon name="check" size={18} strokeWidth={2.4} />
                  </span>
                ) : (
                  <span className="settings-row__value" />
                )
              }
            />
          ))}
        </div>
        <p className="backup-note" style={{ marginTop: 'var(--sp-4)' }}>
          تغيير العملة يؤثر على العمليات الجديدة فقط. العمليات القديمة تحتفظ بعملتها الأصلية.
        </p>
      </Sheet>

      <Sheet open={sheet === 'monthStart'} onClose={() => setSheet(null)} title="بداية الشهر المالي">
        <p className="backup-note" style={{ marginTop: 'var(--sp-2)' }}>
          إذا كنت تستلم راتبك يوم معيّن، اختر ذلك اليوم — رح تُحسب كل التقارير والميزانيات من راتب
          لراتب بدل من أول الشهر.
        </p>
        <div className="day-grid">
          {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
            <button
              key={d}
              type="button"
              className={`day-pick ${settings.monthStartDay === d ? 'day-pick--active' : ''}`}
              onClick={async () => {
                await updateSettings({ monthStartDay: d });
                setSheet(null);
              }}
            >
              <span className="num">{d}</span>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === 'weekStart'} onClose={() => setSheet(null)} title="بداية الأسبوع">
        <div className="settings-list" style={{ marginTop: 'var(--sp-2)' }}>
          {AR_DAYS.map((name, i) => (
            <SettingsRow
              key={name}
              label={name}
              onClick={async () => {
                await updateSettings({ weekStartDay: i });
                setSheet(null);
              }}
              right={
                settings.weekStartDay === i ? (
                  <span className="settings-row__value" style={{ color: 'var(--accent-text)' }}>
                    <Icon name="check" size={18} strokeWidth={2.4} />
                  </span>
                ) : (
                  <span className="settings-row__value" />
                )
              }
            />
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === 'privacy'} onClose={() => setSheet(null)} title="كيف تُحفظ بياناتي؟">
        <div className="prose">
          <p>
            <strong>كل بياناتك على جهازك فقط.</strong> هذا التطبيق لا يملك سيرفرًا ولا حسابًا ولا
            تسجيل دخول. عملياتك المالية محفوظة داخل متصفح جهازك في قاعدة بيانات محلية (IndexedDB).
          </p>
          <p>ما يفعله التطبيق:</p>
          <ul>
            <li>لا يرسل أي شيء إلى أي خادم.</li>
            <li>لا يحتوي على أي أداة تتبّع أو تحليلات أو إعلانات.</li>
            <li>لا يستخدم أي خدمة ذكاء اصطناعي خارجية — تحليل النص العربي يتم داخل جهازك.</li>
            <li>يعمل بالكامل بدون إنترنت بعد أول فتح.</li>
          </ul>
          <p>
            <strong>لكن انتبه:</strong> لأن البيانات محلية بالكامل، فهي تُفقد إذا:
          </p>
          <ul>
            <li>مسحت بيانات المواقع من إعدادات Safari.</li>
            <li>حذفت التطبيق من الشاشة الرئيسية.</li>
            <li>غيّرت الجهاز.</li>
          </ul>
          <p>
            لذلك خُذ نسخة احتياطية بشكل دوري واحفظها في تطبيق «الملفات» أو أرسلها لنفسك.
          </p>
          <p className="prose__note">
            ملاحظة عن الأمان: لا يوجد قفل على التطبيق حاليًا (حسب اختيارك)، فأي شخص يفتح جهازك المفتوح
            يقدر يشوف مصاريفك. تقدر تستخدم «إخفاء المبالغ» من الإعدادات كحل سريع.
          </p>
        </div>
      </Sheet>

      <Sheet open={sheet === 'about'} onClose={() => setSheet(null)} title="عن التطبيق">
        <div className="prose">
          <div className="about-logo">
            <img src="./icons/icon-192.png" alt="" width={64} height={64} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--fs-md)' }}>مصاريف</div>
              <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)' }}>
                الإصدار {APP_VERSION}
              </div>
            </div>
          </div>
          <p>
            تطبيق شخصي لإدارة المصاريف، مبني ليكون سريعًا وبسيطًا وعربيًا بالكامل. يعمل بدون إنترنت
            ويحفظ بياناتك على جهازك.
          </p>
          <p>
            <strong>عدد العمليات المسجّلة:</strong> <span className="num">{transactionCount}</span>
          </p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)' }}>
            لتثبيته على الآيفون: افتحه في Safari، اضغط زر المشاركة، ثم «إضافة إلى الشاشة الرئيسية».
          </p>
        </div>
      </Sheet>

      <Sheet
        open={sheet === 'reset'}
        onClose={() => {
          setSheet(null);
          setResetConfirmText('');
        }}
        title="إعادة ضبط التطبيق"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setSheet(null);
                setResetConfirmText('');
              }}
              style={{ flex: 1 }}
            >
              إلغاء
            </Button>
            <Button
              variant="danger"
              onClick={doReset}
              disabled={resetConfirmText.trim() !== 'حذف'}
              style={{ flex: 1 }}
            >
              حذف كل شيء
            </Button>
          </>
        }
      >
        <div className="stack" style={{ gap: 'var(--sp-4)', paddingTop: 'var(--sp-2)' }}>
          <div className="parsed__warning" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            <Icon name="alert" size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              رح يُحذف كل شيء نهائيًا: <span className="num">{transactionCount}</span> عملية، الفئات
              المخصّصة، الميزانيات، والأهداف. لا يمكن التراجع.
            </span>
          </div>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
            لو بدك تحتفظ ببياناتك، خُذ نسخة احتياطية أولاً من «النسخ الاحتياطي والاستعادة».
          </p>
          <InputField
            label="اكتب كلمة «حذف» للتأكيد"
            value={resetConfirmText}
            onChange={(e) => setResetConfirmText(e.target.value)}
            placeholder="حذف"
            autoComplete="off"
          />
        </div>
      </Sheet>
    </>
  );
}
