// src/paint.js
// ─────────────────────────────────────────────────────────────
// แมวที่ผู้เล่นระบายสีเอง
//
// ── ทำไมไฟล์นี้ไม่มีโค้ดวาดแมวเลยสักบรรทัด ──
// ตัวละครทั้งตัวถูกวาดจาก "อ็อบเจกต์จานสี" ก้อนเดียวที่ getSkin() คืนออกมา
// ทุกที่ที่วาดแมว (ในเกม ไอคอนล็อบบี้ การ์ดกาช่า ช่องคลังน้อง หน้าโบนัส) อ่านสีจากก้อนนั้น
// แมวที่ระบายเองจึงเป็นแค่ "อ็อบเจกต์ที่มีช่องเดียวกัน" ไม่ต้องแตะโค้ดวาดสักที่เดียว
//
// ── ผู้เล่นเลือกเองแค่ 6 ช่อง ที่เหลือคำนวณให้ ──
// เส้นขอบ (line) กับเม็ดที่โปรยตอนใช้ความสามารถ (rain) ไม่เปิดให้เลือก
// เส้นขอบเป็นเรื่องของ "มองเห็นตัวหรือไม่" ไม่ใช่เรื่องความสวย — ฉากในเกมไล่ตั้งแต่
// เกือบดำ (#07060F อวกาศ) ถึงเกือบขาว (#EAF4FA ทุ่งหิมะ) วัดแล้วว่าไม่มีสีเรียบสีไหน
// อ่านออกได้ครบทุกฉาก เส้นขอบคือสิ่งเดียวที่การันตีให้ ถ้าปล่อยให้เลือกเอง คนที่ระบาย
// ขาวล้วนแล้วเลือกเส้นขอบขาวด้วยจะหายไปทั้งตัวบนทุ่งหิมะ เลยคำนวณจากสีขนให้แทน
// ─────────────────────────────────────────────────────────────
import { loadPref, savePref } from './storage.js';

/** ชื่อสกินของแมวที่ระบายเอง — ใช้เป็น id เดียวกับสกินอื่นเพื่อให้ระบบเดิมรองรับได้เลย */
export const CUSTOM_ID = 'mine';

// ── ส่วนที่ระบายได้ ────────────────────────────────────────
// key ตรงกับชื่อช่องในอ็อบเจกต์จานสีเป๊ะ ๆ การระบายจึงเป็นแค่การเขียนค่าลงช่องนั้น
//
// pick คือสีที่ใช้ "ตอนตรวจว่าแตะโดนส่วนไหน" ไม่ใช่สีที่ผู้เล่นเห็น
// วิธีตรวจคือวาดแมวอีกรอบลงผ้าใบที่ซ่อนไว้ โดยส่งจานสีปลอมที่ทุกช่องเป็นสีรหัส
// แล้วอ่านพิกเซลตรงจุดที่นิ้วแตะว่าเป็นรหัสไหน — ได้ขอบเขตที่ตรงกับรูปจริงเป๊ะ
// โดยไม่ต้องเขียนโค้ดคำนวณขอบเขตของแต่ละส่วนขึ้นมาใหม่ให้ผิดจากรูปจริง
export const REGIONS = [
  { key: 'cat', name: 'ขน', hint: 'ขนหลักทั้งตัว หัว หู หาง', pick: '#140000' },
  { key: 'cream', name: 'พุง', hint: 'พุง ปาก ปลายหาง อุ้งเท้า', pick: '#280000' },
  { key: 'dark', name: 'ขา', hint: 'ขา ลาย และแต้มปลายขน', pick: '#3C0000' },
  { key: 'pink', name: 'หูใน', hint: 'หูชั้นในกับแก้ม', pick: '#500000' },
  { key: 'nose', name: 'จมูก', hint: 'จมูกน้อง', pick: '#640000' },
  { key: 'eye', name: 'ตา', hint: 'ดวงตา', pick: '#780000' },
];

/** ช่องที่ผู้เล่นระบายได้ เรียงตามลำดับใน REGIONS */
const KEYS = REGIONS.map((r) => r.key);

// ── แม่สี 12 สี ────────────────────────────────────────────
// เลือกให้ครบวงล้อสีแล้วไล่ความสว่างให้ต่างกันจริง ไม่ใช่สีสดเท่ากันหมด 12 สี
// ซึ่งพอเอามาระบายจริงจะได้แมวที่ทุกส่วนเด่นเท่ากันจนดูไม่ออกว่าอะไรเป็นอะไร
// มีขาวกับเทาเข้มติดมาด้วยเพราะสองสีนี้คือสีที่คนใช้ทำพุงกับขาบ่อยที่สุด
export const SWATCHES = [
  '#FFFFFF', '#FFE7C4', '#FFC46B', '#FF8A3D',
  '#E8553F', '#FF8FB4', '#C77DFF', '#6C5CE7',
  '#4AA8E8', '#38C9A8', '#8CC63F', '#2E2A38',
];

// ── น้องโล้น ──────────────────────────────────────────────
// จุดเริ่มต้นคือแมวที่ยังไม่ได้ระบาย ต้องเป็นสีอ่อนเกือบขาวทั้งตัวเพื่อให้เห็นชัดว่า
// "ยังว่างอยู่ รอให้ระบาย" แต่ต้องไม่ใช่ขาวล้วนเป๊ะ ไม่งั้นแยกพุงกับขนไม่ออกเลย
// ส่วนตากับจมูกยังเป็นสีเข้ม เพราะถ้าโล้นหมดทั้งหน้าจะอ่านไม่ออกว่าเป็นแมว
export const BLANK = {
  cat: '#F2EFEA',
  cream: '#FFFFFF',
  dark: '#D8D2CC',
  pink: '#F6DCDC',
  nose: '#C9BDB4',
  eye: '#4A4550',
};

const STORE_KEY = 'myCat';

/** อ่านจานสีที่บันทึกไว้ — ช่องไหนหายไปเติมจากน้องโล้นให้ */
export function loadPalette() {
  const saved = loadPref(STORE_KEY, null);
  const out = { ...BLANK };
  if (saved && typeof saved === 'object') {
    for (const k of KEYS) {
      if (typeof saved[k] === 'string' && /^#[0-9a-fA-F]{6}$/.test(saved[k])) out[k] = saved[k];
    }
  }
  return out;
}

export function savePalette(p) {
  const out = {};
  for (const k of KEYS) out[k] = p[k] || BLANK[k];
  savePref(STORE_KEY, out);
}

/** เคยระบายอะไรไปแล้วหรือยัง — ใช้ตัดสินว่าจะโชว์ป้าย "ยังไม่ได้ระบาย" ไหม */
export function isBlank(p) {
  return KEYS.every((k) => (p[k] || '').toLowerCase() === BLANK[k].toLowerCase());
}

// ── คณิตศาสตร์สี ───────────────────────────────────────────
const hex2rgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgb2hex = (r, g, b) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

/** ความสว่างที่ตารับรู้จริง (สูตรเดียวกับที่ใช้วัดคอนทราสต์ตอนเลือกจานสีของสกินติดเกม) */
export function luma(hex) {
  const [r, g, b] = hex2rgb(hex).map((v) => v / 255);
  const f = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

const mix = (a, b, t) => {
  const A = hex2rgb(a), B = hex2rgb(b);
  return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
};

/**
 * เส้นขอบที่คำนวณจากสีขน
 *
 * ผสมสีขนกับดำให้เข้มลงมาก ๆ แทนการใช้ดำล้วน เพราะดำล้วนบนแมวสีพาสเทลจะกลายเป็น
 * ลายเส้นการ์ตูนหนา ๆ ที่ไม่เข้ากับสไตล์เกม ส่วนสีขนที่เข้มลงจะอ่านเป็น "เงาขอบขน"
 *
 * ขนยิ่งเข้มยิ่งต้องผสมดำน้อยลง ไม่งั้นแมวสีเข้มจะได้ขอบที่กลืนไปกับตัวจนไม่มีขอบ
 */
export function edgeOf(catHex) {
  const L = luma(catHex);
  return mix(catHex, '#000000', L > 0.5 ? 0.62 : L > 0.2 ? 0.5 : 0.34);
}

/**
 * แปลงจานสีของผู้เล่นเป็นอ็อบเจกต์สกินที่โค้ดวาดใช้ได้ทันที
 * ช่องที่ผู้เล่นไม่ได้เลือกถูกคำนวณจากช่องที่เลือกทั้งหมด
 */
export function toSkin(p) {
  const pal = { ...BLANK, ...p };
  return {
    id: CUSTOM_ID,
    name: 'น้องของเรา',
    note: 'ระบายสีเอง',
    cat: pal.cat,
    dark: pal.dark,
    cream: pal.cream,
    pink: pal.pink,
    nose: pal.nose,
    eye: pal.eye,
    // เส้นปากใช้สีเดียวกับเส้นขอบ ไม่ใช่สีตา — ถ้าใช้สีตา คนที่ระบายตาสีแดง
    // จะได้ปากสีแดงตามไปด้วยโดยไม่ได้ตั้งใจ ซึ่งเป็นบั๊กที่เพิ่งแยกช่องออกมาแก้พอดี
    ink: edgeOf(pal.cat),
    line: edgeOf(pal.cat),
    // หนวดต้องตัดกับขน ขนอ่อนใช้หนวดเข้ม ขนเข้มใช้หนวดสว่าง
    whisker: luma(pal.cat) > 0.45 ? 'rgba(90,78,74,.7)' : 'rgba(255,250,242,.85)',
    // เม็ดที่โปรยตอนใช้ความสามารถ ไล่จากเข้มไปสว่างเพื่อให้เห็นเป็นเม็ดไม่ใช่หมอกสี
    rain: [pal.cat, mix(pal.cat, '#FFFFFF', 0.55), mix(pal.cat, '#000000', 0.45)],
    // ลายกับแก้มปิดไว้ ไม่งั้นมันจะทับสีที่ผู้เล่นตั้งใจระบาย
    stripes: false,
    blush: true,
    points: false,
    // ชั้นรอยแปรง — โค้ดวาดหยิบไปทับบนแต่ละชิ้นเอง (ดู paintOver ใน entities.js)
    paint: layersReady ? layers : undefined,
  };
}

// ══ ชั้นสีที่ระบายด้วยพู่กัน ═══════════════════════════════
//
// ── ทำไมต้องมีชั้นนี้แยกจากจานสี ──
// จานสีเปลี่ยนได้ทีละ "ส่วน" ทั้งส่วน (ขนทั้งตัว พุงทั้งอัน) ซึ่งคือถังสี
// พู่กันต้องลงสีเฉพาะตรงที่นิ้วลากผ่านจริง ๆ ซึ่งจานสีเก็บไม่ได้เลย
// ต้องเป็นภาพจริงที่จำ "รอยแปรง" ไว้
//
// ── ทำไมแยกเป็นสองชั้น หัวกับลำตัว ──
// เกมวาดน้องหลายท่า (วิ่ง หมอบ กระโดด ลอยบนฟ้า) หัวกับลำตัวขยับสัมพัทธ์กันตลอด
// ถ้าเก็บเป็นภาพเดียวทับทั้งตัว รอยแปรงบนหัวจะเลื่อนหลุดออกจากหัวทันทีที่หัวขยับ
// เก็บแยกตามชิ้นที่ "แข็ง" ของมันเอง แล้ววาดทับแต่ละชิ้นที่ตำแหน่งของชิ้นนั้น
// รอยแปรงจึงติดไปกับชิ้นนั้นทุกท่าโดยไม่ต้องรู้ว่าท่าไหนอยู่ตรงไหน
//
// ── ระบบพิกัด ──
// เก็บในพิกัดท้องถิ่นของตัวละคร (หน่วยเดียวกับที่ drawCatStand ใช้)
// ไม่ใช่พิกัดหน้าจอ ภาพเดียวจึงใช้ได้ทุกขนาดที่เกมวาดน้อง ตั้งแต่ไอคอน 34px
// ไปจนถึงตัวใหญ่ในหน้าระบายสี
export const LAYER = {
  ppu: 9,                       // กี่พิกเซลต่อหนึ่งหน่วยพิกัดตัวละคร
  body: { x: -22, y: -16, w: 44, h: 44 },   // กรอบที่ครอบลำตัวได้ทุกท่า
  head: { x: -17, y: -17, w: 34, h: 34 },   // กรอบที่ครอบหัวได้ทุกท่า
};

const LAYER_KEYS = ['body', 'head'];
const LAYER_STORE = 'myCatPaint';

/** ผ้าใบของแต่ละชั้น สร้างครั้งเดียวแล้วใช้ตลอด */
const layers = {};
let layersReady = false;

function makeLayer(k) {
  const box = LAYER[k];
  const c = document.createElement('canvas');
  c.width = Math.round(box.w * LAYER.ppu);
  c.height = Math.round(box.h * LAYER.ppu);
  return c;
}

function ensureLayers() {
  if (layersReady) return;
  layersReady = true;
  for (const k of LAYER_KEYS) layers[k] = makeLayer(k);

  // โหลดของที่บันทึกไว้ — เป็น async เพราะ Image โหลดไม่ทันในเฟรมเดียว
  // ระหว่างรอ น้องจะเป็นสีจานสีล้วนไปก่อน แล้วรอยแปรงค่อยโผล่ตามมา
  let saved = null;
  try { saved = loadPref(LAYER_STORE, null); } catch { /* อ่านไม่ได้ก็เริ่มจากว่าง */ }
  if (!saved) return;
  for (const k of LAYER_KEYS) {
    const url = saved[k];
    if (typeof url !== 'string' || !url.startsWith('data:image')) continue;
    const img = new Image();
    img.onload = () => { layers[k].getContext('2d').drawImage(img, 0, 0); bumpLayers(); };
    img.src = url;
  }
}

/**
 * เลขรุ่นของชั้นสี — ขยับทุกครั้งที่มีการระบาย
 * โค้ดวาดใช้เทียบว่าต้องล้างแคชอะไรไหม และ getSkin() ใช้รู้ว่าต้องประกอบสกินใหม่
 */
let layerRev = 0;
function bumpLayers() {
  layerRev++;
  built = null;
}
export function layerVersion() { return layerRev; }

export function paintLayers() {
  ensureLayers();
  return layers;
}

/** แปลงพิกัดท้องถิ่นของชิ้นนั้น เป็นพิกเซลบนผ้าใบของชั้นนั้น */
export function toLayerPx(k, lx, ly) {
  const box = LAYER[k];
  return { x: (lx - box.x) * LAYER.ppu, y: (ly - box.y) * LAYER.ppu };
}

/** ป้ายสีหนึ่งจุด — ผู้เรียกส่งพิกัดท้องถิ่นมา ที่นี่ไม่รู้จักหน้าจอเลย */
export function dab(k, lx, ly, hex, radius) {
  ensureLayers();
  const c = layers[k];
  if (!c) return;
  const p = toLayerPx(k, lx, ly);
  const g = c.getContext('2d');
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = hex;
  g.beginPath();
  g.arc(p.x, p.y, radius * LAYER.ppu, 0, Math.PI * 2);
  g.fill();
  bumpLayers();
}

/** ลากเส้นระหว่างสองจุด — กันรอยขาดเป็นจุด ๆ เวลานิ้วลากเร็ว */
export function stroke(k, ax, ay, bx, by, hex, radius) {
  ensureLayers();
  const c = layers[k];
  if (!c) return;
  const a = toLayerPx(k, ax, ay), b = toLayerPx(k, bx, by);
  const g = c.getContext('2d');
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = hex;
  g.lineWidth = radius * 2 * LAYER.ppu;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(a.x, a.y);
  g.lineTo(b.x, b.y);
  g.stroke();
  bumpLayers();
}

/** ลบรอยแปรงตรงที่ลาก (ยางลบของพู่กัน) */
export function erase(k, ax, ay, bx, by, radius) {
  ensureLayers();
  const c = layers[k];
  if (!c) return;
  const a = toLayerPx(k, ax, ay), b = toLayerPx(k, bx, by);
  const g = c.getContext('2d');
  g.globalCompositeOperation = 'destination-out';
  g.strokeStyle = '#000';
  g.lineWidth = radius * 2 * LAYER.ppu;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(a.x, a.y);
  g.lineTo(b.x, b.y);
  g.stroke();
  g.globalCompositeOperation = 'source-over';
  bumpLayers();
}

export function clearLayers() {
  ensureLayers();
  for (const k of LAYER_KEYS) {
    const c = layers[k];
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
  }
  bumpLayers();
  saveLayers();
}

export function hasStrokes() {
  ensureLayers();
  for (const k of LAYER_KEYS) {
    const c = layers[k];
    const d = c.getContext('2d', { willReadFrequently: true })
      .getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 8) return true;
  }
  return false;
}

/**
 * บันทึกชั้นสีลงเครื่อง
 *
 * เรียกตอน "ปล่อยนิ้ว" เท่านั้น ไม่ใช่ทุกจุดที่ลาก — toDataURL กับ localStorage
 * ทั้งคู่เป็นงานหนักที่บล็อกเธรดหลัก เรียกทุกเฟรมแล้วการลากจะกระตุกทันที
 */
export function saveLayers() {
  ensureLayers();
  const out = {};
  for (const k of LAYER_KEYS) out[k] = layers[k].toDataURL('image/png');
  try { savePref(LAYER_STORE, out); } catch { /* เต็มก็ปล่อย รอยยังอยู่จนกว่าจะปิดเกม */ }
}

/** สำเนาไว้ย้อนกลับ — คืนอ็อบเจกต์ที่เอาไป restoreLayers() ได้ */
export function snapshotLayers() {
  ensureLayers();
  const out = {};
  for (const k of LAYER_KEYS) {
    const c = makeLayer(k);
    c.getContext('2d').drawImage(layers[k], 0, 0);
    out[k] = c;
  }
  return out;
}

export function restoreLayers(snap) {
  ensureLayers();
  for (const k of LAYER_KEYS) {
    const c = layers[k];
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    if (snap && snap[k]) g.drawImage(snap[k], 0, 0);
  }
  bumpLayers();
  saveLayers();
}

// ── จานสีที่ใช้อยู่ตอนนี้ ────────────────────────────────────
// เก็บไว้ในตัวแปรเดียวแล้วให้ getSkin() มาอ่าน เพื่อให้กดเปลี่ยนสีแล้วเห็นผลทันที
// ทุกที่ในเกมโดยไม่ต้องไล่บอกทีละหน้า
let live = null;
// แคชสกินที่ประกอบแล้ว ล้างเป็น null ทุกครั้งที่ระบายเพื่อให้ประกอบใหม่รอบหน้า
let built = null;

export function palette() {
  if (!live) live = loadPalette();
  return live;
}

/** เปลี่ยนสีหนึ่งช่อง แล้วบันทึกทันที — ผู้เล่นระบายแล้วปิดเกมไปเลยก็ยังอยู่ */
export function paint(key, hex) {
  built = null;   // บังคับให้ประกอบสกินใหม่รอบหน้า
  if (!KEYS.includes(key)) return;
  palette()[key] = hex;
  savePalette(live);
}

export function setPalette(p) {
  built = null;   // บังคับให้ประกอบสกินใหม่รอบหน้า
  live = { ...BLANK, ...p };
  savePalette(live);
}

export function resetPalette() {
  setPalette(BLANK);
}

/**
 * สกินของแมวที่ระบายเอง พร้อมใช้กับโค้ดวาดทุกที่
 *
 * แคชไว้แล้วคืน "อ็อบเจกต์ก้อนเดิม" จนกว่าจะมีการระบายใหม่ จำเป็นสองเหตุผล:
 * ฟังก์ชันนี้ถูกอ่านทุกเฟรมผ่าน getter ใน skins.js ถ้าประกอบใหม่ทุกครั้งจะสร้าง
 * อ็อบเจกต์ทิ้งเป็นร้อยก้อนต่อวินาที และชั้นแคชของ getSkin() จะใช้ไม่ได้ไปด้วย
 * เพราะมันเทียบด้วยการอ้างอิงอ็อบเจกต์ ไม่ได้เทียบทีละช่อง
 */
export function customSkin() {
  ensureLayers();
  if (!built) built = toSkin(palette());
  return built;
}

/**
 * จานสี "รหัสสี" สำหรับตรวจว่านิ้วแตะโดนส่วนไหน
 *
 * ส่งเข้าโค้ดวาดตัวเดียวกับที่วาดแมวจริง แมวที่ออกมาจึงมีขอบเขตตรงกับรูปจริงเป๊ะ
 * ปิดลาย/แก้ม/แต้มทั้งหมด เพราะพวกนั้นวาดทับด้วยสีของช่องอื่น จะทำให้รหัสปนกัน
 */
export function pickSkin() {
  const s = { id: CUSTOM_ID, stripes: false, blush: false, points: false };
  for (const r of REGIONS) s[r.key] = r.pick;
  // เส้นขอบ หนวด และเส้นปาก วาดทับอยู่ข้างบนสุด ถ้าให้เป็นสี "ไม่ใช่ส่วนไหน"
  // คนที่แตะโดนเส้นพวกนี้จะกดแล้วไม่เกิดอะไรขึ้นเลยโดยไม่รู้ว่าทำไม
  // ให้เป็นรหัสเดียวกับขนแทน แตะโดนเส้นก็ถือว่าตั้งใจแตะขน ซึ่งเดาถูกเกือบทุกครั้ง
  const fur = REGIONS[0].pick;
  s.ink = fur;
  s.line = fur;
  s.whisker = fur;
  s.rain = [fur, fur, fur];
  return s;
}

/** อ่านค่าสีแดงจากพิกเซลแล้วบอกว่าเป็นส่วนไหน — null = ไม่โดนส่วนที่ระบายได้ */
export function regionAt(r, g, b, a) {
  // ขอบรูปมีการไล่สีจากการลบรอยหยัก ค่ากลาง ๆ จึงต้องหาโค้ดที่ใกล้ที่สุด
  // แต่ต้องไม่ใกล้เกินไป ไม่งั้นพิกเซลขอบระหว่างสองส่วนจะถูกนับเป็นส่วนที่สาม
  if (a < 128 || g > 60 || b > 60) return null;
  let best = null, bestD = 11;
  for (const reg of REGIONS) {
    const d = Math.abs(r - parseInt(reg.pick.slice(1, 3), 16));
    if (d < bestD) { bestD = d; best = reg; }
  }
  return best;
}
