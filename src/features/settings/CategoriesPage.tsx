import { useMemo, useState } from 'react';
import type { Category, CategoryKind, TxType } from '@/types';
import { addCategory, deleteCategory, mergeCategories, updateCategory } from '@/db/repository';
import { CATEGORY_ICONS, Icon, safeIcon } from '@/components/Icon';
import {
  Badge, Button, Card, CategoryIcon, InputField, Segmented, Sheet,
} from '@/components/ui';
import './categories.css';

const KIND_LABELS: Record<CategoryKind, string> = {
  essential: 'ضروري',
  flexible: 'مرن',
  discretionary: 'ترفيهي',
};

const KIND_HELP: Record<CategoryKind, string> = {
  essential: 'لن يُقترح تقليلها في توصيات التوفير',
  flexible: 'يمكن تقليلها جزئيًا عند الحاجة',
  discretionary: 'أول ما يُقترح تقليله للتوفير',
};

export function CategoriesPage({ categories }: { categories: Category[] }) {
  const [type, setType] = useState<TxType>('expense');
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const visible = useMemo(
    () => categories.filter((c) => c.type === type && (showArchived ? c.archived : !c.archived)),
    [categories, type, showArchived],
  );

  const archivedCount = categories.filter((c) => c.type === type && c.archived).length;

  return (
    <>
      <Segmented
        label="نوع الفئات"
        value={type}
        onChange={setType}
        options={[
          { value: 'expense', label: 'فئات المصاريف' },
          { value: 'income', label: 'فئات الدخل' },
        ]}
      />

      <Button variant="primary" icon="plus" block onClick={() => setEditing('new')}>
        فئة جديدة
      </Button>

      <Card flush>
        {visible.map((c) => (
          <button key={c.id} type="button" className="cat-row" onClick={() => setEditing(c)}>
            <CategoryIcon icon={c.icon} colorIndex={c.colorIndex} size={40} />
            <div className="cat-row__body">
              <span className="cat-row__name truncate">{c.name}</span>
              <span className="cat-row__meta">
                {KIND_LABELS[c.kind]}
                {c.keywords && c.keywords.length > 0 && ` · ${c.keywords.length} كلمة مفتاحية`}
              </span>
            </div>
            {c.isDefault && <Badge tone="neutral">افتراضية</Badge>}
            <Icon name="chevron-start" size={16} style={{ color: 'var(--text-tertiary)' }} />
          </button>
        ))}
        {visible.length === 0 && (
          <p style={{ padding: 'var(--sp-5)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)' }}>
            {showArchived ? 'ما في فئات مؤرشفة' : 'ما في فئات'}
          </p>
        )}
      </Card>

      {archivedCount > 0 && (
        <Button variant="ghost" block onClick={() => setShowArchived((v) => !v)}>
          {showArchived ? 'عرض الفئات النشطة' : `عرض المؤرشفة (${archivedCount})`}
        </Button>
      )}

      {editing && (
        <CategoryEditor
          category={editing === 'new' ? null : editing}
          type={type}
          allCategories={categories}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function CategoryEditor({
  category,
  type,
  allCategories,
  onClose,
}: {
  category: Category | null;
  type: TxType;
  allCategories: Category[];
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? 'more');
  const [colorIndex, setColorIndex] = useState(category?.colorIndex ?? 1);
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? 'flexible');
  const [keywords, setKeywords] = useState((category?.keywords ?? []).join('، '));
  const [mode, setMode] = useState<'edit' | 'delete' | 'merge'>('edit');
  const [targetId, setTargetId] = useState('');

  const others = allCategories.filter(
    (c) => c.id !== category?.id && c.type === type && !c.archived,
  );

  const parsedKeywords = keywords
    .split(/[،,]/)
    .map((k) => k.trim())
    .filter(Boolean);

  const save = async () => {
    if (!name.trim()) return;
    if (category) {
      await updateCategory(category.id, {
        name: name.trim(),
        icon,
        colorIndex,
        kind,
        keywords: parsedKeywords,
      });
    } else {
      await addCategory({
        name: name.trim(),
        icon,
        colorIndex,
        kind,
        type,
        keywords: parsedKeywords,
        archived: false,
      });
    }
    onClose();
  };

  const doDelete = async () => {
    if (!category || !targetId) return;
    await deleteCategory(category.id, targetId);
    onClose();
  };

  const doMerge = async () => {
    if (!category || !targetId) return;
    await mergeCategories(category.id, targetId);
    onClose();
  };

  const restore = async () => {
    if (!category) return;
    await updateCategory(category.id, { archived: false });
    onClose();
  };

  if (mode === 'delete' || mode === 'merge') {
    const isMerge = mode === 'merge';
    return (
      <Sheet
        open
        onClose={() => setMode('edit')}
        title={isMerge ? 'دمج الفئة' : 'حذف الفئة'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setMode('edit')} style={{ flex: 1 }}>
              رجوع
            </Button>
            <Button
              variant={isMerge ? 'primary' : 'danger'}
              onClick={isMerge ? doMerge : doDelete}
              disabled={!targetId}
              style={{ flex: 2 }}
            >
              {isMerge ? 'دمج' : 'حذف ونقل العمليات'}
            </Button>
          </>
        }
      >
        <p style={{ padding: 'var(--sp-3) 0', lineHeight: 1.8, color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)' }}>
          {isMerge
            ? 'كل عمليات هذه الفئة رح تنتقل للفئة اللي تختارها، وهذه الفئة رح تختفي. ما رح تنحذف أي عملية.'
            : 'ما رح أحذف أي عملية. اختر الفئة اللي بدك تنتقل لها عمليات هذه الفئة.'}
        </p>
        <div className="filter-cats">
          {others.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`filter-cat ${targetId === c.id ? 'filter-cat--active' : ''}`}
              onClick={() => setTargetId(c.id)}
            >
              <CategoryIcon icon={c.icon} colorIndex={c.colorIndex} size={28} />
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={category ? 'تعديل الفئة' : 'فئة جديدة'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={save} disabled={!name.trim()} style={{ flex: 2 }}>
            حفظ
          </Button>
        </>
      }
    >
      <div className="stack" style={{ gap: 'var(--sp-5)', paddingTop: 'var(--sp-2)' }}>
        <div className="row" style={{ gap: 'var(--sp-3)', justifyContent: 'center' }}>
          <CategoryIcon icon={icon} colorIndex={colorIndex} size={64} />
        </div>

        <InputField
          label="الاسم"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثلاً: رياضة"
          autoFocus={!category}
        />

        <div className="field">
          <span className="field__label">الأيقونة</span>
          <div className="icon-grid">
            {CATEGORY_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                className={`icon-pick ${icon === ic ? 'icon-pick--active' : ''}`}
                onClick={() => setIcon(ic)}
                aria-label={ic}
                aria-pressed={icon === ic}
              >
                <Icon name={safeIcon(ic)} size={20} />
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field__label">اللون</span>
          <div className="color-grid">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={`color-pick ${colorIndex === n ? 'color-pick--active' : ''}`}
                style={{ background: `var(--cat-${n})` }}
                onClick={() => setColorIndex(n)}
                aria-label={`اللون ${n}`}
                aria-pressed={colorIndex === n}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field__label">التصنيف المالي</span>
          <Segmented
            label="التصنيف المالي"
            value={kind}
            onChange={setKind}
            options={(Object.keys(KIND_LABELS) as CategoryKind[]).map((k) => ({
              value: k,
              label: KIND_LABELS[k],
            }))}
          />
          <span className="field__hint">{KIND_HELP[kind]}</span>
        </div>

        <InputField
          label="الكلمات المفتاحية"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="افصل بينها بفاصلة"
          hint="تساعد التطبيق يتعرّف على الفئة تلقائيًا من نصّك"
        />

        {category && (
          <div className="stack" style={{ gap: 'var(--sp-2)', paddingTop: 'var(--sp-2)' }}>
            {category.archived ? (
              <Button variant="secondary" icon="repeat" block onClick={restore}>
                استعادة من الأرشيف
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  icon="copy"
                  block
                  onClick={() => setMode('merge')}
                  disabled={others.length === 0}
                >
                  دمج في فئة أخرى
                </Button>
                <Button
                  variant="danger"
                  icon="trash"
                  block
                  onClick={() => setMode('delete')}
                  disabled={others.length === 0}
                >
                  {category.isDefault ? 'أرشفة الفئة' : 'حذف الفئة'}
                </Button>
                {category.isDefault && (
                  <span className="field__hint" style={{ textAlign: 'center' }}>
                    الفئات الافتراضية تُؤرشَف بدل الحذف حتى لا تتأثر بياناتك القديمة
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
