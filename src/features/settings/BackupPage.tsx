import { useRef, useState } from 'react';
import type { Category } from '@/types';
import { db, updateSettings } from '@/db/db';
import {
  backupFileName, buildBackup, buildCSV, validateBackup, type ValidationResult,
} from '@/services/backup';
import { formatDate } from '@/services/dates';
import { Icon } from '@/components/Icon';
import { Button, Card, CardHeader, Sheet } from '@/components/ui';
import './backup.css';

type ImportMode = 'merge' | 'replace';

export function BackupPage({
  categoryMap,
  lastBackupAt,
  onDone,
}: {
  categoryMap: Map<string, Category>;
  lastBackupAt: number | null;
  onDone: (message: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** يحمّل ملفًا إلى الجهاز — يستخدم Blob URL لأن iOS لا يدعم بعض الطرق الأخرى */
  const download = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // نؤخّر التحرير قليلاً حتى يبدأ التنزيل فعليًا على iOS
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const exportJSON = async () => {
    setBusy(true);
    try {
      const [transactions, categories, budgets, savingsGoals, settings] = await Promise.all([
        db.transactions.toArray(),
        db.categories.toArray(),
        db.budgets.toArray(),
        db.savingsGoals.toArray(),
        db.settings.get('app'),
      ]);
      const backup = buildBackup({
        transactions,
        categories,
        budgets,
        savingsGoals,
        settings: settings ?? null,
      });
      download(JSON.stringify(backup, null, 2), backupFileName('json'), 'application/json');
      await updateSettings({ lastBackupAt: Date.now() });
      onDone('تم تصدير النسخة الاحتياطية');
    } finally {
      setBusy(false);
    }
  };

  const exportCSV = async () => {
    setBusy(true);
    try {
      const transactions = await db.transactions.toArray();
      download(buildCSV(transactions, categoryMap), backupFileName('csv'), 'text/csv;charset=utf-8');
      onDone('تم تصدير ملف CSV');
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      setValidation(validateBackup(raw));
    } catch {
      setError('ما قدرت أقرأ الملف — تأكد أنه ملف JSON صالح من تطبيق مصاريف.');
    }
  };

  const doImport = async () => {
    if (!validation?.payload) return;
    setBusy(true);
    try {
      const { transactions, categories, budgets, savingsGoals } = validation.payload;

      await db.transaction(
        'rw',
        db.transactions, db.categories, db.budgets, db.savingsGoals,
        async () => {
          if (mode === 'replace') {
            await Promise.all([
              db.transactions.clear(),
              db.budgets.clear(),
              db.savingsGoals.clear(),
            ]);
            // الفئات تُستبدل أيضًا لأن العمليات تشير إليها
            await db.categories.clear();
          }

          // الفئات أولاً حتى لا تبقى عمليات يتيمة
          if (categories.length > 0) await db.categories.bulkPut(categories);

          // نتأكد أن كل عملية لها فئة موجودة
          const existing = new Set((await db.categories.toArray()).map((c) => c.id));
          const fallback = existing.has('other') ? 'other' : [...existing][0];
          const safe = transactions.map((t) =>
            existing.has(t.categoryId) ? t : { ...t, categoryId: fallback },
          );

          if (safe.length > 0) await db.transactions.bulkPut(safe);
          if (budgets.length > 0) await db.budgets.bulkPut(budgets);
          if (savingsGoals.length > 0) await db.savingsGoals.bulkPut(savingsGoals);
        },
      );

      setValidation(null);
      onDone(
        mode === 'replace'
          ? `تم استبدال البيانات — ${transactions.length} عملية`
          : `تم دمج ${transactions.length} عملية`,
      );
    } catch {
      setError('صار خطأ أثناء الاستعادة. بياناتك الحالية ما تأثرت.');
    } finally {
      setBusy(false);
    }
  };

  const daysSinceBackup =
    lastBackupAt !== null ? Math.floor((Date.now() - lastBackupAt) / 86_400_000) : null;

  return (
    <>
      {/* ---- تذكير النسخ ---- */}
      <Card>
        <div className="row" style={{ gap: 'var(--sp-3)', alignItems: 'flex-start' }}>
          <Icon
            name={daysSinceBackup === null || daysSinceBackup > 14 ? 'alert' : 'shield'}
            size={20}
            style={{
              flexShrink: 0,
              marginTop: 2,
              color:
                daysSinceBackup === null || daysSinceBackup > 14
                  ? 'var(--warning)'
                  : 'var(--success)',
            }}
          />
          <div style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.75 }}>
            {lastBackupAt === null ? (
              <>
                <strong>ما أخذت نسخة احتياطية بعد.</strong> بياناتك محفوظة على جهازك فقط — إذا مسحت
                بيانات Safari أو غيّرت الجهاز رح تضيع. خُذ نسخة الآن واحفظها في «الملفات» أو أرسلها
                لنفسك.
              </>
            ) : (
              <>
                آخر نسخة احتياطية: <strong>{formatDate(new Date(lastBackupAt).toISOString().slice(0, 10), { year: true })}</strong>
                {daysSinceBackup !== null && daysSinceBackup > 0 && ` (قبل ${daysSinceBackup} يوم)`}
              </>
            )}
          </div>
        </div>
      </Card>

      {/* ---- التصدير ---- */}
      <Card>
        <CardHeader title="تصدير البيانات" />
        <div className="stack" style={{ gap: 'var(--sp-3)' }}>
          <div className="backup-option">
            <div>
              <div className="backup-option__title">نسخة احتياطية كاملة (JSON)</div>
              <div className="backup-option__desc">
                كل شيء: العمليات، الفئات، الميزانيات، الأهداف والإعدادات. هذا الملف يستخدم للاستعادة.
              </div>
            </div>
            <Button variant="primary" icon="download" onClick={exportJSON} disabled={busy}>
              تصدير
            </Button>
          </div>

          <div className="backup-option">
            <div>
              <div className="backup-option__title">جدول العمليات (CSV)</div>
              <div className="backup-option__desc">
                للفتح في Excel أو Numbers. لا يُستخدم للاستعادة.
              </div>
            </div>
            <Button icon="download" onClick={exportCSV} disabled={busy}>
              تصدير
            </Button>
          </div>
        </div>
      </Card>

      {/* ---- الاستيراد ---- */}
      <Card>
        <CardHeader title="استعادة من نسخة" />
        <p className="backup-note">
          اختر ملف JSON سبق أن صدّرته. رح أفحص الملف وأعرض لك ما بداخله قبل أي تغيير — ولن أحذف
          بياناتك الحالية بدون موافقتك.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
        <Button icon="upload" block onClick={() => fileRef.current?.click()} disabled={busy}>
          اختر ملف النسخة
        </Button>
        {error && (
          <p className="backup-error">
            <Icon name="alert" size={15} /> {error}
          </p>
        )}
      </Card>

      {/* ---- معاينة الاستيراد ---- */}
      {validation && (
        <Sheet
          open
          onClose={() => setValidation(null)}
          title="معاينة الاستعادة"
          footer={
            validation.valid ? (
              <>
                <Button variant="secondary" onClick={() => setValidation(null)} style={{ flex: 1 }}>
                  إلغاء
                </Button>
                <Button
                  variant={mode === 'replace' ? 'danger' : 'primary'}
                  onClick={doImport}
                  disabled={busy}
                  style={{ flex: 2 }}
                >
                  {busy ? 'جارٍ…' : mode === 'replace' ? 'استبدال كل البيانات' : 'دمج مع بياناتي'}
                </Button>
              </>
            ) : (
              <Button variant="secondary" block onClick={() => setValidation(null)}>
                إغلاق
              </Button>
            )
          }
        >
          <div className="stack" style={{ gap: 'var(--sp-4)', paddingTop: 'var(--sp-2)' }}>
            {validation.errors.map((e, i) => (
              <div key={i} className="parsed__warning" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                <Icon name="alert" size={17} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{e}</span>
              </div>
            ))}

            {validation.valid && (
              <>
                <div className="backup-preview">
                  <PreviewRow label="العمليات" value={String(validation.preview.transactions)} />
                  <PreviewRow label="الفئات" value={String(validation.preview.categories)} />
                  <PreviewRow label="الميزانيات" value={String(validation.preview.budgets)} />
                  <PreviewRow label="أهداف الادخار" value={String(validation.preview.savingsGoals)} />
                  {validation.preview.dateFrom && (
                    <PreviewRow
                      label="الفترة"
                      value={`${validation.preview.dateFrom} ← ${validation.preview.dateTo}`}
                    />
                  )}
                  {validation.preview.exportedAt && (
                    <PreviewRow
                      label="تاريخ النسخة"
                      value={formatDate(validation.preview.exportedAt.slice(0, 10), { year: true })}
                    />
                  )}
                </div>

                {validation.warnings.map((w, i) => (
                  <div key={i} className="parsed__warning">
                    <Icon name="info" size={17} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{w}</span>
                  </div>
                ))}

                <div className="field">
                  <span className="field__label">كيف تريد الاستعادة؟</span>
                  <div className="stack" style={{ gap: 'var(--sp-2)' }}>
                    <ModeOption
                      active={mode === 'merge'}
                      onClick={() => setMode('merge')}
                      title="دمج مع بياناتي الحالية"
                      desc="يضيف ما في الملف. العمليات المتطابقة بنفس المُعرّف تُحدَّث. لا يُحذف شيء."
                    />
                    <ModeOption
                      active={mode === 'replace'}
                      onClick={() => setMode('replace')}
                      title="استبدال كل شيء"
                      desc="يمسح بياناتك الحالية بالكامل ويضع محتوى الملف مكانها. لا يمكن التراجع."
                      danger
                    />
                  </div>
                </div>

                {mode === 'replace' && (
                  <div className="parsed__warning" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                    <Icon name="alert" size={17} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      انتبه: كل عملياتك الحالية رح تُحذف نهائيًا. لو مش متأكد، خُذ نسخة احتياطية أولاً
                      ثم اختر «دمج».
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="backup-preview__row">
      <span>{label}</span>
      <strong className="num">{value}</strong>
    </div>
  );
}

function ModeOption({
  active,
  onClick,
  title,
  desc,
  danger,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={`mode-option ${active ? 'mode-option--active' : ''} ${danger && active ? 'mode-option--danger' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="mode-option__check">
        {active && <Icon name="check" size={14} strokeWidth={2.6} />}
      </span>
      <span style={{ minWidth: 0 }}>
        <span className="mode-option__title">{title}</span>
        <span className="mode-option__desc">{desc}</span>
      </span>
    </button>
  );
}
