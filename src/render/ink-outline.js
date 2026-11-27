/**
 * เส้นขอบตัด (ink outline) รอบตัวละครที่วาดสดด้วยโค้ด — ผู้ใช้ขอให้บอสภูตตอไม้ + ลูกน้องมีเส้นแบบน้องแมว (27 พ.ย. 2026)
 *
 * วิธี: วาดชิ้นลงแผ่นพัก (canvas นอกจอ) ก่อน แล้วแปะลงจอผ่านฟิลเตอร์ SVG:
 *   ขอบเนื้อทึบ (alpha ≥ ~0.4) → ขยายออก R พิกเซล → เอาเฉพาะวงรอบนอก (ไม่ทาทับใต้ของโปร่งแสงอย่างผลึก) → ระบายสีหมึก → วางใต้ภาพเดิม
 *   ออร่า/แสงฟุ้งบาง ๆ ไม่ถึงเกณฑ์ → ไม่มีเส้น · แต่ละชิ้น (ตัว / ผลึก / แขน) ทำแยกกัน → ชิ้นที่ทับกันมีเส้นคั่นเอง
 * เบราว์เซอร์ที่ใช้ฟิลเตอร์ SVG บนแคนวาสไม่ได้ (iPhone/iPad ทุกเบราว์เซอร์ = WebKit · ผู้ใช้เจอ 27 พ.ย.) →
 *   ทางสำรอง "ปั๊ม": ระบายเงาชิ้นเป็นสีหมึก วางเลื่อนรอบวงรัศมี R หลายทิศ → ลบส่วนที่อยู่ใต้ชิ้นออก → วางใต้ภาพเดิม (หน้าตาใกล้กัน)
 */

/** on = เปิดเส้น · stamp = บังคับใช้ทางสำรอง (ไว้ทดสอบหน้าตาแบบ iPhone บนคอม) */
export const INK = { on: true, stamp: false };

const NS = 'http://www.w3.org/2000/svg';
let host = null;
const made = new Set();
let ok = null;

function ensureHost() {
  if (host && !host.isConnected) { host = null; made.clear(); }   // หน้าเว็บล้าง DOM ทิ้ง → สร้างใหม่
  if (!host) {
    host = document.createElementNS(NS, 'svg');
    host.setAttribute('width', '0'); host.setAttribute('height', '0'); host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    document.body.appendChild(host);
  }
}
/** ใช้ ctx.filter = url(#ฟิลเตอร์ SVG) ได้จริงไหม — ลองวาดจริงหนึ่งครั้ง (WebKit มีตัวแปร filter แต่ไม่ทำงาน) */
function supported() {
  if (ok !== null) return ok;
  ok = false;
  try {
    const c = document.createElement('canvas'); c.width = c.height = 4;
    const x = c.getContext('2d', { willReadFrequently: true });
    if (!('filter' in x) || !document.body) return ok;
    ensureHost();
    const f = document.createElementNS(NS, 'filter'); f.id = 'mz-ink-probe';
    f.innerHTML = '<feFlood flood-color="#ff0000"/>';
    host.appendChild(f);
    x.filter = 'url(#mz-ink-probe)'; x.fillStyle = '#000'; x.fillRect(1, 1, 2, 2);
    const d = x.getImageData(2, 2, 1, 1).data;
    ok = d[0] > 200 && d[1] < 60 && d[3] > 200;
    f.remove();
  } catch { ok = false; }
  return ok;
}

/** หมึกหนา r พิกเซลจอ (ปัดเป็นครึ่งพิกเซล) สี col ความทึบ op (ปัดทีละ 0.1)
 *  → 'url(#…)' สำหรับ ctx.filter · หรือ { stamp } ทางสำรอง (WebKit) · op ≈ 0 = null */
export function inkFilter(r, col, op = 1) {
  op = Math.round(Math.max(0, Math.min(1, op)) * 10) / 10;
  if (op <= 0 || typeof document === 'undefined') return null;
  r = Math.max(0.5, Math.round(r * 2) / 2);
  if (INK.stamp || !supported()) return { stamp: true, r, col, op };
  const id = `mz-ink-${col.replace(/[^0-9a-z]/gi, '')}-${String(r).replace('.', '_')}-${op * 10}`;
  ensureHost();
  if (!made.has(id)) {
    const f = document.createElementNS(NS, 'filter');
    f.id = id;
    for (const [k, v] of [['x', '-10%'], ['y', '-10%'], ['width', '120%'], ['height', '120%'], ['color-interpolation-filters', 'sRGB']]) f.setAttribute(k, v);
    f.innerHTML = `
      <feComponentTransfer in="SourceAlpha" result="core"><feFuncA type="linear" slope="3.4" intercept="-1.1"/></feComponentTransfer>
      <feMorphology in="core" operator="dilate" radius="${r}" result="fat"/>
      <feComposite in="fat" in2="core" operator="out" result="ring"/>
      <feFlood flood-color="${col}" flood-opacity="${op}" result="col"/>
      <feComposite in="col" in2="ring" operator="in" result="ink"/>
      <feMerge><feMergeNode in="ink"/><feMergeNode in="SourceGraphic"/></feMerge>`;
    host.appendChild(f);
    made.add(id);
  }
  return `url(#${id})`;
}

/** กรอบพิกเซลจอที่ครอบสี่เหลี่ยม [x0,y0]-[x1,y1] (พิกัดของ transform ตอนนี้) + ขอบเผื่อ pad → [x, y, w, h] ตัดให้อยู่ในแคนวาส */
export function screenBox(ctx, x0, y0, x1, y1, pad = 8) {
  const m = ctx.getTransform();
  let ax = Infinity, ay = Infinity, bx = -Infinity, by = -Infinity;
  for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
    const px = m.a * x + m.c * y + m.e, py = m.b * x + m.d * y + m.f;
    ax = Math.min(ax, px); ay = Math.min(ay, py); bx = Math.max(bx, px); by = Math.max(by, py);
  }
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ax = Math.max(0, Math.floor(ax - pad)); ay = Math.max(0, Math.floor(ay - pad));
  bx = Math.min(W, Math.ceil(bx + pad)); by = Math.min(H, Math.ceil(by + pad));
  return bx > ax && by > ay ? [ax, ay, bx - ax, by - ay] : null;
}

const PAD = [];
function pad(n, w, h) {
  let P = PAD[n];
  if (!P) { P = document.createElement('canvas'); PAD[n] = P; }
  if (P.width < w || P.height < h) { P.width = Math.max(P.width, w); P.height = Math.max(P.height, h); }
  const c = P.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  c.clearRect(0, 0, w, h);
  return [P, c];
}
/** ทางสำรอง: เส้นหมึกจากการปั๊มเงาชิ้นรอบวง (ไม่ใช้ ctx.filter) */
function stampInk(ctx, L, alpha, k, box) {
  const [bx, by, bw, bh] = box || [0, 0, L.width, L.height];
  const [T, t] = pad(0, bw, bh);           // เงาชิ้นสีหมึก
  t.drawImage(L, bx, by, bw, bh, 0, 0, bw, bh);
  t.globalCompositeOperation = 'source-in'; t.fillStyle = k.col; t.fillRect(0, 0, bw, bh);
  const [R, r] = pad(1, bw, bh);           // วงหมึก = เงาเลื่อนรอบวง แล้วลบใต้ชิ้นออก
  const rings = k.r > 1.6 ? [k.r, k.r * 0.55] : [k.r];
  for (const rad of rings) {
    const n = Math.min(16, Math.max(8, Math.ceil((TAU * rad) / 1.1)));
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; r.drawImage(T, 0, 0, bw, bh, Math.cos(a) * rad, Math.sin(a) * rad, bw, bh); }
  }
  r.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 2; i++) r.drawImage(L, bx, by, bw, bh, 0, 0, bw, bh);   // สองรอบ: ใต้ของโปร่งครึ่ง ๆ ก็ลบเกือบหมด
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const a0 = ctx.globalAlpha * alpha;
  ctx.globalAlpha = a0 * k.op; ctx.drawImage(R, 0, 0, bw, bh, bx, by, bw, bh);
  ctx.globalAlpha = a0; ctx.drawImage(L, bx, by, bw, bh, bx, by, bw, bh);
  ctx.restore();
}
const TAU = Math.PI * 2;

/** แปะแผ่นพัก L ลง ctx (พิกัดจอ) พร้อมเส้นหมึก · filter = ค่าจาก inkFilter · box = กรอบที่มีของ (null = ทั้งแผ่น) */
export function blitInk(ctx, L, alpha, filter, box) {
  if (!L.width || !L.height) return;       // แคนวาสขนาด 0 (ซ่อน/ยังไม่จัดขนาด) — drawImage จะ error
  if (filter && filter.stamp) { stampInk(ctx, L, alpha, filter, box); return; }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha *= alpha;
  if (filter) ctx.filter = filter;
  if (box) ctx.drawImage(L, box[0], box[1], box[2], box[3], box[0], box[1], box[2], box[3]);
  else ctx.drawImage(L, 0, 0);
  ctx.restore();
}

/** ความหนาหมึก (พิกเซลจอ) จากความหนาในหน่วยตัวละคร × สเกลของ transform ตอนนี้ */
export function inkPx(ctx, units) {
  const m = ctx.getTransform();
  return units * Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
}
