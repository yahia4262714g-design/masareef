// توليد أيقونات التطبيق (علم فلسطين) بدون أي مكتبة خارجية.
// يرسم بدقة فائقة (4x supersampling) للحصول على حواف ناعمة للمثلث.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePNG } from './png.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(OUT, { recursive: true });

// ألوان العلم — الأسود مرفوع قليلاً (#111) ليبقى للأيقونة حدّ مرئي فوق الخلفيات السوداء
const BLACK = [17, 17, 17];
const WHITE = [255, 255, 255];
const GREEN = [0, 122, 61];
const RED = [206, 17, 38];
const CANVAS = [14, 14, 13]; // خلفية maskable

const SS = 4; // معامل الدقة الفائقة

/** هل النقطة داخل المثلث الأحمر؟ (0,0)-(0,h)-(t,h/2) */
function inTriangle(x, y, h, t) {
  const half = h / 2;
  const dy = Math.abs(y - half);
  // الحد الأيمن للمثلث عند ارتفاع معيّن
  const edge = t * (1 - dy / half);
  return x <= edge;
}

/** يرسم علمًا بعرض w وارتفاع h داخل دالة ألوان */
function flagColorAt(x, y, w, h) {
  const t = w * 0.42 > h ? h * 0.84 : w * 0.42;
  if (inTriangle(x, y, h, t)) return RED;
  if (y < h / 3) return BLACK;
  if (y < (2 * h) / 3) return WHITE;
  return GREEN;
}

/** نصف قطر زوايا مستديرة — يعيد true إذا كانت النقطة داخل المستطيل المستدير */
function inRoundRect(x, y, w, h, r) {
  if (x < 0 || y < 0 || x > w || y > h) return false;
  const cx = Math.min(Math.max(x, r), w - r);
  const cy = Math.min(Math.max(y, r), h - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

/** أيقونة ممتلئة بالكامل (للـ apple-touch-icon و purpose:any) */
function renderFullBleed(size) {
  const px = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let pxi = 0; pxi < size; pxi++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = pxi + (sx + 0.5) / SS;
          const y = py + (sy + 0.5) / SS;
          const c = flagColorAt(x, y, size, size);
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const n = SS * SS;
      const i = (py * size + pxi) * 4;
      px[i] = Math.round(r / n);
      px[i + 1] = Math.round(g / n);
      px[i + 2] = Math.round(b / n);
      px[i + 3] = 255;
    }
  }
  return px;
}

/** أيقونة maskable: علم بنسبة 2:1 داخل منطقة آمنة على خلفية داكنة */
function renderMaskable(size) {
  const px = new Uint8Array(size * size * 4);
  const fw = size * 0.68;
  const fh = fw / 2;
  const ox = (size - fw) / 2;
  const oy = (size - fh) / 2;
  const radius = fh * 0.1;

  for (let py = 0; py < size; py++) {
    for (let pxi = 0; pxi < size; pxi++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = pxi + (sx + 0.5) / SS;
          const y = py + (sy + 0.5) / SS;
          const lx = x - ox;
          const ly = y - oy;
          let c = CANVAS;
          if (inRoundRect(lx, ly, fw, fh, radius)) c = flagColorAt(lx, ly, fw, fh);
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const n = SS * SS;
      const i = (py * size + pxi) * 4;
      px[i] = Math.round(r / n);
      px[i + 1] = Math.round(g / n);
      px[i + 2] = Math.round(b / n);
      px[i + 3] = 255;
    }
  }
  return px;
}

const targets = [
  ['icon-120.png', 120, 'full'],
  ['icon-152.png', 152, 'full'],
  ['icon-167.png', 167, 'full'],
  ['icon-180.png', 180, 'full'],
  ['icon-192.png', 192, 'full'],
  ['icon-256.png', 256, 'full'],
  ['icon-512.png', 512, 'full'],
  ['maskable-512.png', 512, 'mask'],
];

for (const [name, size, kind] of targets) {
  const px = kind === 'full' ? renderFullBleed(size) : renderMaskable(size);
  fs.writeFileSync(path.join(OUT, name), encodePNG(px, size, size));
  console.log('✓', name, size + 'x' + size);
}

// favicon قابل للتحجيم
const tri = (0.42 * 64).toFixed(2);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="#111111"/>
  <clipPath id="c"><rect width="64" height="64" rx="14"/></clipPath>
  <g clip-path="url(#c)">
    <rect y="0" width="64" height="21.334" fill="#111111"/>
    <rect y="21.334" width="64" height="21.333" fill="#FFFFFF"/>
    <rect y="42.667" width="64" height="21.333" fill="#007A3D"/>
    <path d="M0 0 L${tri} 32 L0 64 Z" fill="#CE1126"/>
  </g>
</svg>
`;
fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'), svg);
console.log('✓ favicon.svg');
