import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { Transaction } from '@/types';
import { ensureSeeded, updateSettings } from '@/db/db';
import { addTransaction, deleteTransaction, restoreTransaction } from '@/db/repository';
import {
  useAllTransactions, useBudgets, useCategories, useCategoryMap, useSavingsGoals, useSettings,
} from '@/hooks/useAppData';
import { useTheme } from '@/hooks/useTheme';
import { AppBar, BackButton, Fab, ScrollToTop, TabBar } from '@/components/AppShell';
import { InstallHint, isStandalone } from '@/components/InstallHint';
import { UpdatePrompt } from '@/components/UpdatePrompt';
import { Button, Sheet, Snackbar, useSnackbar } from '@/components/ui';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { QuickAdd } from '@/features/add/QuickAdd';
import { TransactionForm } from '@/features/add/TransactionForm';
import { TransactionsPage } from '@/features/transactions/TransactionsPage';
import { TransactionDetail } from '@/features/transactions/TransactionDetail';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { BudgetsPage } from '@/features/budgets/BudgetsPage';
import { CategoriesPage } from '@/features/settings/CategoriesPage';
import { BackupPage } from '@/features/settings/BackupPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { GoalsPage } from '@/features/goals/GoalsPage';
import { Onboarding } from '@/features/onboarding/Onboarding';
import { MorePage } from '@/features/settings/MorePage';
import { formatMoney } from '@/services/money';
import '@/features/settings/settings.css';

export default function App() {
  const [ready, setReady] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<Transaction | null>(null);

  const settings = useSettings();
  const categories = useCategories();
  const categoryMap = useCategoryMap();
  const transactions = useAllTransactions();
  const budgets = useBudgets();
  const goals = useSavingsGoals();
  const snackbar = useSnackbar();
  const setTheme = useTheme(settings?.theme);

  useEffect(() => {
    ensureSeeded()
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, []);

  /** يعرض إشعار الحفظ مع إمكانية التراجع الحقيقي */
  const onSaved = useCallback(
    (tx: Transaction) => {
      setAddOpen(false);
      snackbar.show(`تم حفظ ${formatMoney(tx.amountMinor, tx.currency, { showDecimals: 'never' })}`, {
        actionLabel: 'تراجع',
        onAction: () => {
          void deleteTransaction(tx.id);
        },
      });
    },
    [snackbar],
  );

  const onDeleted = useCallback(
    (deleted: Transaction) => {
      snackbar.show('تم حذف العملية', {
        actionLabel: 'تراجع',
        onAction: () => restoreTransaction(deleted),
        duration: 7000,
      });
    },
    [snackbar],
  );

  const loading =
    !ready || !settings || !categories || !transactions || !budgets || !goals;

  if (loading) {
    return (
      <>
        <div className="boot">
          <img src="./icons/icon-192.png" alt="" className="boot__logo" width={64} height={64} />
        </div>
        <UpdatePrompt />
      </>
    );
  }

  if (!settings.onboarded) {
    return (
      <>
        <Onboarding onFinish={() => setTheme(settings.theme)} />
        <UpdatePrompt />
      </>
    );
  }

  return (
    <div className="app">
      <ScrollToTop />

      <Routes>
        <Route
          path="/"
          element={
            <>
              <AppBar
                title="مصاريف"
                end={
                  <Button
                    variant="ghost"
                    iconOnly
                    icon={settings.hideAmounts ? 'eye-off' : 'eye'}
                    aria-label={settings.hideAmounts ? 'إظهار المبالغ' : 'إخفاء المبالغ'}
                    onClick={() => {
                      void updateSettings({ hideAmounts: !settings.hideAmounts });
                    }}
                  />
                }
              />
              <main className="page">
                <QuickAdd categories={categories} settings={settings} onSaved={onSaved} />
                {!isStandalone() && <InstallHint />}
                <Dashboard
                  transactions={transactions}
                  categoryMap={categoryMap}
                  budgets={budgets}
                  settings={settings}
                  onOpenTransaction={setDetail}
                />
              </main>
            </>
          }
        />

        <Route
          path="/transactions"
          element={
            <>
              <AppBar title="السجل" />
              <main className="page">
                <TransactionsPage
                  transactions={transactions}
                  categories={categories}
                  categoryMap={categoryMap}
                  settings={settings}
                  onOpenTransaction={setDetail}
                />
              </main>
            </>
          }
        />

        <Route
          path="/reports"
          element={
            <>
              <AppBar title="التقارير" />
              <main className="page">
                <ReportsPage
                  transactions={transactions}
                  categoryMap={categoryMap}
                  budgets={budgets}
                  settings={settings}
                />
              </main>
            </>
          }
        />

        <Route
          path="/more"
          element={
            <>
              <AppBar title="المزيد" />
              <main className="page">
                <MorePage transactionCount={transactions.length} />
              </main>
            </>
          }
        />

        <Route
          path="/budgets"
          element={
            <>
              <AppBar title="الميزانيات" start={<BackButton />} />
              <main className="page">
                <BudgetsPage
                  transactions={transactions}
                  categories={categories}
                  categoryMap={categoryMap}
                  budgets={budgets}
                  settings={settings}
                />
              </main>
            </>
          }
        />

        <Route
          path="/goals"
          element={
            <>
              <AppBar title="أهداف الادخار" start={<BackButton />} />
              <main className="page">
                <GoalsPage goals={goals} settings={settings} />
              </main>
            </>
          }
        />

        <Route
          path="/categories"
          element={
            <>
              <AppBar title="التصنيفات" start={<BackButton />} />
              <main className="page">
                <CategoriesPage categories={categories} />
              </main>
            </>
          }
        />

        <Route
          path="/backup"
          element={
            <>
              <AppBar title="النسخ الاحتياطي" start={<BackButton />} />
              <main className="page">
                <BackupPage
                  categoryMap={categoryMap}
                  lastBackupAt={settings.lastBackupAt}
                  onDone={(m) => snackbar.show(m)}
                />
              </main>
            </>
          }
        />

        <Route
          path="/settings"
          element={
            <>
              <AppBar title="الإعدادات" start={<BackButton />} />
              <main className="page">
                <SettingsPage
                  settings={settings}
                  transactionCount={transactions.length}
                  onThemeChange={setTheme}
                />
              </main>
            </>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Fab onClick={() => setAddOpen(true)} />
      <TabBar />

      {/* ---- إضافة عملية ---- */}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="عملية جديدة">
        <div className="stack" style={{ gap: 'var(--sp-4)' }}>
          <QuickAdd categories={categories} settings={settings} onSaved={onSaved} autoFocus />
          <div className="divider-text">
            <span>أو أدخلها يدويًا</span>
          </div>
          <TransactionForm
            categories={categories}
            settings={settings}
            onSubmit={async (draft) => {
              const tx = await addTransaction(draft);
              onSaved(tx);
            }}
            onCancel={() => setAddOpen(false)}
          />
        </div>
      </Sheet>

      {/* ---- تفاصيل العملية ---- */}
      <TransactionDetail
        tx={detail}
        category={detail ? categoryMap.get(detail.categoryId) : undefined}
        categories={categories}
        settings={settings}
        onClose={() => setDetail(null)}
        onDeleted={onDeleted}
        onDuplicated={onSaved}
      />

      <Snackbar message={snackbar.message} onDismiss={snackbar.dismiss} />
      <UpdatePrompt />
    </div>
  );
}
