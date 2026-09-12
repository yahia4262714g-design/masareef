import { useState } from 'react';
import { updateSettings } from '@/db/db';
import { setBudget } from '@/db/repository';
import { CURRENCIES, currencyInfo, toMinor } from '@/services/money';
import { Icon } from '@/components/Icon';
import { Button, InputField } from '@/components/ui';
import './onboarding.css';

type Step = 'welcome' | 'currency' | 'monthStart' | 'budget' | 'done';

const STEPS: Step[] = ['welcome', 'currency', 'monthStart', 'budget', 'done'];

export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState<Step>('welcome');
  const [currency, setCurrency] = useState('ILS');
  const [monthStartDay, setMonthStartDay] = useState(1);
  const [budgetText, setBudgetText] = useState('');
  const [saving, setSaving] = useState(false);

  const index = STEPS.indexOf(step);
  const next = () => setStep(STEPS[Math.min(index + 1, STEPS.length - 1)]);
  const back = () => setStep(STEPS[Math.max(index - 1, 0)]);

  const finish = async () => {
    setSaving(true);
    try {
      await updateSettings({ currency, monthStartDay, onboarded: true });
      const amount = toMinor(budgetText, currency);
      if (amount > 0) await setBudget(null, amount, currency);
      onFinish();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onb">
      <div className="onb__progress" aria-hidden="true">
        {STEPS.map((s, i) => (
          <span key={s} className={`onb__dot ${i <= index ? 'onb__dot--active' : ''}`} />
        ))}
      </div>

      <div className="onb__body">
        {step === 'welcome' && (
          <>
            <img src="./icons/icon-192.png" alt="" className="onb__logo" width={84} height={84} />
            <h1 className="onb__title">أهلاً فيك في مصاريف</h1>
            <p className="onb__text">
              تطبيق بسيط لتتبّع مصاريفك اليومية. اكتب جملة عادية بالعربي مثل
              <br />
              <strong>«صرفت 5 شيكل قهوة»</strong>
              <br />
              وأنا أفهمها وأسجّلها لك.
            </p>
            <div className="onb__features">
              <Feature icon="shield" text="بياناتك على جهازك فقط — بلا حساب ولا سيرفر" />
              <Feature icon="wifi" text="يشتغل بدون إنترنت" />
              <Feature icon="chart" text="تقارير ورؤى حقيقية من أرقامك" />
            </div>
          </>
        )}

        {step === 'currency' && (
          <>
            <StepIcon name="wallet" />
            <h1 className="onb__title">شو عملتك الأساسية؟</h1>
            <p className="onb__text">تقدر تغيّرها لاحقًا من الإعدادات.</p>
            <div className="onb__options">
              {Object.values(CURRENCIES).slice(0, 4).map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className={`onb__option ${currency === c.code ? 'onb__option--active' : ''}`}
                  onClick={() => setCurrency(c.code)}
                  aria-pressed={currency === c.code}
                >
                  <span className="onb__option-symbol">{c.symbol}</span>
                  <span>{c.name}</span>
                  {currency === c.code && <Icon name="check" size={18} strokeWidth={2.4} />}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'monthStart' && (
          <>
            <StepIcon name="calendar" />
            <h1 className="onb__title">إمتى يبدأ شهرك المالي؟</h1>
            <p className="onb__text">
              إذا بتستلم راتبك يوم معيّن، اختاره — رح أحسب كل التقارير والميزانيات من راتب لراتب.
            </p>
            <div className="onb__options">
              <button
                type="button"
                className={`onb__option ${monthStartDay === 1 ? 'onb__option--active' : ''}`}
                onClick={() => setMonthStartDay(1)}
                aria-pressed={monthStartDay === 1}
              >
                <span>أول الشهر (1)</span>
                {monthStartDay === 1 && <Icon name="check" size={18} strokeWidth={2.4} />}
              </button>
            </div>
            <p className="onb__hint">أو اختر يوم الراتب:</p>
            <div className="day-grid">
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`day-pick ${monthStartDay === d ? 'day-pick--active' : ''}`}
                  onClick={() => setMonthStartDay(d)}
                >
                  <span className="num">{d}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'budget' && (
          <>
            <StepIcon name="target" />
            <h1 className="onb__title">ميزانية شهرية؟</h1>
            <p className="onb__text">
              اختياري تمامًا. لو حطّيت سقفًا شهريًا رح أنبّهك قبل ما تتجاوزه.
            </p>
            <InputField
              amount
              inputMode="decimal"
              value={budgetText}
              onChange={(e) => setBudgetText(e.target.value)}
              placeholder="0"
              aria-label="الميزانية الشهرية"
              hint={`بـ${currencyInfo(currency).name}`}
            />
            <div className="suggestions" style={{ justifyContent: 'center' }}>
              {[800, 1200, 1500, 2000, 3000].map((v) => (
                <button key={v} type="button" className="chip" onClick={() => setBudgetText(String(v))}>
                  <span className="num">{v}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <StepIcon name="check" tone="success" />
            <h1 className="onb__title">جاهز! 🇵🇸</h1>
            <p className="onb__text">
              كل شي مضبوط. جرّب تكتب أول مصروف — مثلاً:
              <br />
              <strong>«صرفت 5 شيكل قهوة»</strong>
            </p>
            <div className="onb__features">
              <Feature icon="sparkles" text="اكتب بالعربي العادي، لا تحتاج تعبئة نماذج" />
              <Feature icon="download" text="خُذ نسخة احتياطية من وقت لوقت — بياناتك محلية" />
              <Feature icon="share" text="ثبّته على الشاشة الرئيسية من زر المشاركة في Safari" />
            </div>
          </>
        )}
      </div>

      <div className="onb__actions">
        {index > 0 && index < STEPS.length - 1 && (
          <Button variant="ghost" onClick={back} style={{ flex: 1 }}>
            رجوع
          </Button>
        )}
        {step === 'done' ? (
          <Button variant="primary" size="lg" onClick={finish} disabled={saving} style={{ flex: 2 }}>
            {saving ? 'جارٍ…' : 'يلا نبدأ'}
          </Button>
        ) : (
          <Button variant="primary" size="lg" onClick={next} style={{ flex: 2 }}>
            {step === 'budget' && !budgetText ? 'تخطّي' : 'متابعة'}
          </Button>
        )}
      </div>
    </div>
  );
}

function StepIcon({ name, tone }: { name: 'wallet' | 'calendar' | 'target' | 'check'; tone?: 'success' }) {
  return (
    <div
      className="onb__step-icon"
      style={tone === 'success' ? { background: 'var(--success-soft)', color: 'var(--success)' } : undefined}
    >
      <Icon name={name} size={32} />
    </div>
  );
}

function Feature({ icon, text }: { icon: 'shield' | 'wifi' | 'chart' | 'sparkles' | 'download' | 'share'; text: string }) {
  return (
    <div className="onb__feature">
      <Icon name={icon} size={18} />
      <span>{text}</span>
    </div>
  );
}
