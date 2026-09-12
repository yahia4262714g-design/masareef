/**
 * رسوم بيانية مكتوبة يدويًا بـ SVG.
 * السبب: تحكّم كامل في اتجاه RTL وحجم الحزمة (بلا مكتبة رسوم = ~100KB أقل).
 */

import { useMemo, useState } from 'react';
import './charts.css';

export interface Slice {
  id: string;
  label: string;
  value: number;
  colorIndex: number;
}

/* ============================================================
   الرسم الدائري المفرّغ
   ============================================================ */

export function DonutChart({
  slices,
  centerValue,
  centerCaption,
  onSelect,
  selectedId,
}: {
  slices: Slice[];
  centerValue: string;
  centerCaption: string;
  onSelect?: (id: string | null) => void;
  selectedId?: string | null;
}) {
  const size = 168;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const total = slices.reduce((s, x) => s + x.value, 0);

  const segments = useMemo(() => {
    let offset = 0;
    return slices.map((s) => {
      const fraction = total > 0 ? s.value / total : 0;
      const length = fraction * circumference;
      const seg = { ...s, length, offset };
      offset += length;
      return seg;
    });
  }, [slices, total, circumference]);

  if (total === 0) return null;

  return (
    <div className="donut__wrap">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="chart"
        role="img"
        aria-label={`توزيع المصاريف: ${slices.map((s) => s.label).join('، ')}`}
      >
        {/* يبدأ من الأعلى ويدور مع عقارب الساعة */}
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--surface-3)"
            strokeWidth={stroke}
          />
          {segments.map((s) => {
            const dim = selectedId != null && selectedId !== s.id;
            const idx = ((s.colorIndex - 1) % 10) + 1;
            return (
              <circle
                key={s.id}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={`var(--cat-${idx})`}
                strokeWidth={stroke}
                strokeDasharray={`${Math.max(s.length - 2, 0)} ${circumference}`}
                strokeDashoffset={-s.offset}
                strokeLinecap="butt"
                className={`donut__slice ${dim ? 'donut__slice--dim' : ''}`}
                onClick={() => onSelect?.(selectedId === s.id ? null : s.id)}
              />
            );
          })}
        </g>
      </svg>
      <div className="donut__center">
        <span className="donut__total num">{centerValue}</span>
        <span className="donut__caption">{centerCaption}</span>
      </div>
    </div>
  );
}

/* ============================================================
   المفتاح (Legend)
   ============================================================ */

export function Legend({
  slices,
  formatValue,
  onSelect,
  selectedId,
}: {
  slices: Slice[];
  formatValue: (v: number) => string;
  onSelect?: (id: string | null) => void;
  selectedId?: string | null;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);

  return (
    <div className="legend">
      {slices.map((s) => {
        const idx = ((s.colorIndex - 1) % 10) + 1;
        const share = total > 0 ? (s.value / total) * 100 : 0;
        return (
          <button
            key={s.id}
            type="button"
            className="legend__item"
            onClick={() => onSelect?.(selectedId === s.id ? null : s.id)}
            style={selectedId === s.id ? { background: 'var(--surface-2)' } : undefined}
          >
            <span className="legend__dot" style={{ background: `var(--cat-${idx})` }} />
            <span className="legend__name truncate">{s.label}</span>
            <span className="legend__share num">{Math.round(share)}٪</span>
            <span className="legend__value num">{formatValue(s.value)}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   رسم خطّي (اتجاه RTL: الأقدم يمين، الأحدث يسار)
   ============================================================ */

export function LineChart({
  points,
  height = 130,
  showArea = true,
  labels,
}: {
  points: number[];
  height?: number;
  showArea?: boolean;
  labels?: { start: string; end: string };
}) {
  const width = 320;
  const padY = 10;

  const path = useMemo(() => {
    if (points.length < 2) return { line: '', area: '' };

    const max = Math.max(...points, 1);
    const stepX = width / (points.length - 1);

    // في RTL نعكس محور السينات: أول نقطة على اليمين
    const coords = points.map((v, i) => {
      const x = width - i * stepX;
      const y = padY + (1 - v / max) * (height - padY * 2);
      return [x, y] as const;
    });

    // منحنى ناعم بمنتصف النقاط
    let line = `M ${coords[0][0]} ${coords[0][1]}`;
    for (let i = 1; i < coords.length; i++) {
      const [px, py] = coords[i - 1];
      const [cx, cy] = coords[i];
      const mx = (px + cx) / 2;
      line += ` Q ${px} ${py} ${mx} ${(py + cy) / 2}`;
      line += ` Q ${cx} ${cy} ${cx} ${cy}`;
    }

    const area = `${line} L ${coords[coords.length - 1][0]} ${height} L ${coords[0][0]} ${height} Z`;
    return { line, area };
  }, [points, height]);

  if (points.length < 2) return null;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="chart"
        style={{ height }}
        preserveAspectRatio="none"
        role="img"
        aria-label="تطوّر الإنفاق عبر الفترة"
      >
        {showArea && (
          <>
            <defs>
              <linearGradient id="areaFade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.20" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={path.area} fill="url(#areaFade)" />
          </>
        )}
        <path
          d={path.line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* في RTL يتدفّق الزمن من اليمين لليسار: البداية يمينًا والنهاية يسارًا */}
      {labels && (
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
          <span className="bars__label">{labels.start}</span>
          <span className="bars__label">{labels.end}</span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   رسم أعمدة
   ============================================================ */

export interface Bar {
  label: string;
  value: number;
  muted?: boolean;
}

export function BarChart({
  bars,
  formatValue,
}: {
  bars: Bar[];
  formatValue?: (v: number) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div>
      <div className="bars">
        {bars.map((b, i) => (
          <button
            key={`${b.label}-${i}`}
            type="button"
            className="bars__col"
            onClick={() => setActive(active === i ? null : i)}
            aria-label={`${b.label}: ${formatValue ? formatValue(b.value) : b.value}`}
          >
            {active === i && formatValue && (
              <span className="bars__label num" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {formatValue(b.value)}
              </span>
            )}
            <span
              className={`bars__bar ${b.muted && active !== i ? 'bars__bar--muted' : ''}`}
              style={{ height: `${Math.max((b.value / max) * 100, 2)}%` }}
            />
          </button>
        ))}
      </div>
      <div className="bars" style={{ height: 'auto', marginTop: 6 }}>
        {bars.map((b, i) => (
          <span key={`${b.label}-l-${i}`} className="bars__col bars__label">
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   رسم مصغّر (Sparkline)
   ============================================================ */

export function Sparkline({ points, tone = 'accent' }: { points: number[]; tone?: 'accent' | 'danger' }) {
  const width = 200;
  const height = 40;

  const d = useMemo(() => {
    if (points.length < 2) return '';
    const max = Math.max(...points, 1);
    const step = width / (points.length - 1);
    return points
      .map((v, i) => {
        const x = width - i * step;
        const y = 4 + (1 - v / max) * (height - 8);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [points]);

  if (!d) return null;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="spark" preserveAspectRatio="none" aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke={tone === 'danger' ? 'var(--danger)' : 'var(--accent)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
