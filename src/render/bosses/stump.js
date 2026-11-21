/**
 * บอสตัวแรก: ภูตตอไม้ "ผู้เฝ้าคริสตัลแห่งป่าแมว" (แบบจากผู้ใช้ 17 พ.ย. 2026 · ภาพใน docs/boss-stump/1-main.jpg)
 * วาดสดด้วยโค้ดทั้งตัว ไม่มีเส้นขอบ (กฎ no-outline) — นูนด้วยไล่สี/แสงเงาในเนื้อ
 *
 * ── มุมเฉียงตามภาพแบบ (ผู้ใช้ 22 พ.ย.) ──
 * ภาพแบบหันเฉียงไปทางซ้าย (หาน้องแมว): หน้าเยื้องซ้าย ตาข้างไกลเล็กกว่า ลำตัวขวาบานกว้างอยู่ในเงา
 * แขนซ้ายเป็นก้อนกลมเล็ก · แขนขวาทรงถั่วยาวพาดขอบผลึก · ผลึกใหญ่ต่ำค่อนซ้าย
 * รูปทรงทั้งหมดวัดจากภาพแบบ (1 หน่วย ≈ 6.7px ของภาพ) แล้วเก็บเป็นสองชุด: G1 = เฉียง (ตามแบบ) · G0 = หน้าตรง (สมมาตร)
 * P.turn 0..1 ไล่ระหว่างสองชุด — ทุกท่าเฉียง ยกเว้น "แพ้" ค่อย ๆ หมุนกลับมาหน้าตรง (ผู้ใช้ 22 พ.ย.)
 *
 * หน่วยของบอส: (0,0) = กลางชายล่างสุด · ขึ้นบน = y ติดลบ · ตัว (ชายล่าง → ขอบตอบนสุด) สูง STUMP.H = 100 หน่วย
 * drawStumpBoss(ctx, x, groundY, s, o) — x = กลางตัว · groundY = ระดับพื้น (บอสลอยเหนือพื้นเอง) · s = พิกเซลต่อหน่วย
 *   o.state 'idle' | 'warn' | 'tired' | 'defeat' · o.st วินาทีในท่า · o.t วินาทีรวม
 *   o.crack 0–3 · o.hitT วินาทีนับจากโดนตี · o.gaze -1 มองซ้าย … 0 มองตรง · o.drift · o.bob
 *   o.look สีน้องในผลึก (คีย์ของ CHIBI_LOOKS) · o.explode 0–1 แยกชิ้น
 * ทุกอย่างคิดจากเวลาอย่างเดียว → ลากเวลาย้อนกลับได้ภาพเดิมเป๊ะ
 */
import { drawChibi } from '../chibi.js';

export const STUMP = {
  name: 'ภูตตอไม้',
  title: 'ผู้เฝ้าคริสตัลแห่งป่าแมว',
  H: 100,          // ความสูงตัว (หน่วยบอส)
  hover: 16,       // ลอยเหนือพื้นตอนปกติ
  // สูงกี่เท่าของน้องแมวตัวโต — ตกลงไว้ 2.5 แต่วัดในเกมแล้วเปลวบนหัวสูงเกินกระโดดสองชั้น (ถึงได้ ≤ ~2.1) → 2.0 (22 พ.ย.)
  ratio: 2.0,
  flameY: 113,     // เปลวจุดอ่อน (หน่วยเหนือชายล่าง) — ด่านใช้หาจุดตี
};

/** ท่าทั้งหมด · loop = วนทุกกี่วินาที · dur = เล่นครั้งเดียวยาวเท่านี้แล้วค้างท่าสุดท้าย */
export const STUMP_STATES = {
  idle:   { name: 'ลอยปกติ',       em: '😤', note: 'ลอยขึ้นลงนุ่ม ๆ · กะพริบตา · ใบไม้ไหว · หันเฉียงหาน้อง', loop: 4.8 },
  warn:   { name: 'เตรียมโจมตี',    em: '❗', note: 'ย่อตัว ตาเรืองแสง ง้างแขน · เตือน 1.0 วิ แล้วพุ่ง',     loop: 2.0 },
  tired:  { name: 'เหนื่อย',        em: '😵', note: 'ลอยต่ำ แขนตก ตาหมุน จุดอ่อนสว่าง · หอบ',              loop: 1.6 },
  defeat: { name: 'แพ้',            em: '💥', note: 'หมุนกลับหน้าตรง · ผลึกแตกร้าวปล่อยแสง · ยุบแล้วสลาย',  dur: 3.6 },
};
export const WARN_TIME = 1.0;

// ── สี (ดูดจากภาพแบบ) ──
const COL = {
  bodyL: '#D69283', bodyM: '#B37A8E', bodyR: '#8C62A0',
  hemL: '#F6B897', hemM: '#EDA3AE', hemR: '#D497CF',
  top1: '#FBD3AE', top2: '#EDAE8E', topLip: '#B87C82', ring: 'rgba(205,124,104,.45)',
  groove: 'rgba(104,50,88,.12)', grooveHi: 'rgba(255,224,214,.12)',
  leaf: '#B9BE84', leaf2: '#8D9862',
  eyeW: '#FFF5E3', eyeW2: '#FBD8C2', pupil: '#4A2848', ink: '#55304F',
  armHi: '#DA9890', armMid: '#B57B90', armLo: '#8E6198',
  flameIn: '#FFFBEA', flameMid: '#FFE09A', flameOut: '#F5B86E',
  shadow: '150,110,200',
};

const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const pop = (k) => { k = clamp(k); return 1 + Math.sin(k * Math.PI) * 0.35 * (1 - k); };
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ───────────────────────── ท่าทาง ─────────────────────────
/** arm = ค่าเพิ่มจากตำแหน่งตั้งต้นของมุมนั้น { dx, dy, r (+ = ง้างออกด้านนอก) } */
export function stumpPose(state, st, t, o = {}) {
  const P = {
    y: STUMP.hover, x: 0, sx: 1, sy: 1, rot: 0, shake: 0, turn: 1,
    armL: { dx: 0, dy: 0, r: 0 }, armR: { dx: 0, dy: 0, r: 0 },
    eyes: 'angry', lid: 0, mouth: 'frown', mouthOpen: 0,
    flame: 0.6, bang: 0, fade: 1, rays: 0, crystalUp: 0, puff: -1, dissolve: 0, crackMin: 0,
    flow: 1, hemLift: 0,   // ชายผ้า: แรงพลิ้ว · ลอนห้อยลง(+)/บานขึ้น(-)
  };
  const bob = o.bob === false ? 0 : 1;
  if (state === 'idle') {
    P.y += Math.sin((t / 2.4) * TAU) * 4 * bob;
    P.rot = Math.sin((t / 4.8) * TAU) * 0.02;
    const br = Math.sin((t / 2.4) * TAU + 0.6);
    P.sx = 1 + br * 0.012; P.sy = 1 - br * 0.012;
    P.armL.dy = Math.sin((t / 2.4) * TAU + 0.9) * 1.2;
    P.armR.dy = Math.sin((t / 2.4) * TAU + 1.3) * 1.2;
    const bp = t % 4.2; P.lid = bp < 0.16 ? Math.sin((bp / 0.16) * Math.PI) : 0;
    P.flame = 0.62 + Math.sin(t * 3.1) * 0.06;
    P.hemLift = Math.cos((t / 2.4) * TAU) * 1.3 * bob;   // ลอยขึ้น → ชายผ้าห้อยตามหลัง
  } else if (state === 'warn') {
    const L = STUMP_STATES.warn.loop, ph = st % L, W = WARN_TIME;
    P.y += Math.sin((t / 2.4) * TAU) * 2 * bob;
    P.eyes = 'glow';
    if (ph < W) {                          // ง้าง: ย่อตัว สั่นแรงขึ้นเรื่อย ๆ
      const k = ease(ph / W);
      P.sx = 1 + 0.1 * k; P.sy = 1 - 0.13 * k;
      P.shake = k * 1.6; P.rot = -0.05 * k;
      P.armL = { dx: -8 * k, dy: -9 * k, r: 0.6 * k };
      P.armR = { dx: 8 * k, dy: -9 * k, r: 0.6 * k };
      P.bang = ph > 0.08 ? pop((ph - 0.08) / 0.3) : 0;
      P.lid = 0.25 * k;
      P.flow = 1 - 0.4 * k; P.hemLift = -2.6 * k;          // ย่อตัว → ชายบานออก
    } else if (ph < W + 0.3) {             // ปล่อย: ยืดตัวพุ่งไปทางซ้าย
      const k = ease((ph - W) / 0.3);
      P.sx = lerp(1.1, 0.9, k); P.sy = lerp(0.87, 1.12, k);
      P.x = -9 * k; P.rot = lerp(-0.05, 0.04, k);
      P.armL = { dx: lerp(-8, -3, k), dy: lerp(-9, -4, k), r: lerp(0.6, 0.15, k) };
      P.armR = { dx: lerp(8, 3, k), dy: lerp(-9, -4, k), r: lerp(0.6, 0.15, k) };
      P.bang = 1 - k; P.lid = 0.25;
      P.flow = lerp(0.6, 2, k); P.hemLift = lerp(-2.6, 3.2, k);   // พุ่ง → ชายสะบัดตามหลัง
    } else {                               // คืนท่า
      const k = ease((ph - W - 0.3) / (L - W - 0.3));
      P.sx = lerp(0.9, 1, k); P.sy = lerp(1.12, 1, k);
      P.x = -9 * (1 - k); P.rot = 0.04 * (1 - k);
      P.armL = { dx: -3 * (1 - k), dy: -4 * (1 - k), r: 0.15 * (1 - k) };
      P.armR = { dx: 3 * (1 - k), dy: -4 * (1 - k), r: 0.15 * (1 - k) };
      P.lid = 0.25 * (1 - k);
      if (k > 0.5) P.eyes = 'angry';
      P.flow = lerp(2, 1, k); P.hemLift = 3.2 * (1 - k) * Math.cos(k * 9);
    }
    P.flame = 0.7;
  } else if (state === 'tired') {
    const pant = Math.sin((t / 0.8) * TAU);
    P.y = STUMP.hover * 0.3 + Math.sin((t / 1.6) * TAU) * 1.4 * bob;
    P.sx = 1.03 - pant * 0.022; P.sy = 0.965 + pant * 0.03;
    P.rot = Math.sin((t / 3.2) * TAU) * 0.03;
    P.armL = { dx: -2, dy: 9 + pant * 1.2, r: -0.35 };
    P.armR = { dx: 3, dy: 9 + pant * 1.2, r: -0.3 };
    P.eyes = 'swirl'; P.mouth = 'open'; P.mouthOpen = 0.65 + pant * 0.35;
    P.flame = 1.35 + Math.sin(t * 6) * 0.15;
    P.puff = (t % 1.6) / 1.6;
    P.flow = 0.75; P.hemLift = 1.6 + pant * 0.6;              // ชายผ้าห้อยหมดแรง
  } else if (state === 'defeat') {
    const s = st;
    P.turn = 1 - ease(s / 0.7);            // หมุนกลับมาหน้าตรง
    P.eyes = s < 0.35 ? 'glow' : 'x'; P.crackMin = s < 0.12 ? 2 : 3;
    if (s < 0.35) {
      const k = s / 0.35;
      P.shake = 3 * (1 - k); P.sx = 0.92; P.sy = 1.06; P.x = 5 * (1 - k);
    } else {
      const k = ease((s - 0.35) / 1.15);
      P.sx = lerp(0.95, 1.1, k); P.sy = lerp(1.04, 0.8, k);
      P.y = lerp(STUMP.hover, 3, k);
      P.armL = { dx: -2, dy: 12 * k, r: -0.45 * k }; P.armR = { dx: 2, dy: 12 * k, r: -0.45 * k };
      P.rays = ease((s - 0.35) / 0.9);
    }
    P.flame = Math.max(0, 0.6 - s * 0.4);
    P.flow = 1.3; P.hemLift = s < 0.35 ? 0 : -2.4 * ease((s - 0.35) / 1.15);
    P.dissolve = clamp((s - 1.5) / 1.5);
    P.fade = 1 - ease(P.dissolve);
    P.crystalUp = ease((s - 1.6) / 1.6) * 14;
  }
  if (o.hitT != null && o.hitT < 0.5) {   // โดนตีจุดอ่อน: เด้งถอยไปขวา + ยุบนิด
    const k = o.hitT / 0.5, w = Math.sin(k * Math.PI) * (1 - k);
    P.x += 7 * w; P.sy *= 1 - 0.1 * w; P.sx *= 1 + 0.08 * w; P.shake += 2 * (1 - k);
    P.lid = Math.max(P.lid, 0.6 * (1 - k));
  }
  if (o.drift) P.x += Math.sin((t / 7) * TAU) * 30;
  return P;
}

// ───────────────────────── รูปทรง (G1 เฉียงตามแบบ · G0 หน้าตรง) ─────────────────────────
// ข้างขวา: top → (c1,c2) → m → (c3,c4) → end (ปลายชายขวา ม้วนเป็นลอนบาน)
// ข้างซ้าย: end (ปลายชายซ้าย) → (c1,c2) → m → (c3,c4) → top
// hem   = ขอบชายชั้นหน้า ขวา → ซ้าย (ไม่รวมปลายสองข้าง) สลับ ลอนห้อย (คู่) / ยอดเว้า (คี่)
// under = ขอบผ้าซับชั้นในสีม่วง โผล่ใต้ยอดเว้าของชั้นหน้า (ปลายสองข้างซ่อนในตัว)
// handL/handR = มือ: S โคนแขน · P อุ้งมือ · r0 r1 รัศมีสองปลาย · bul ท้องนูนด้านนอก · dent เว้าด้านใน · thumb/thA นิ้วโป้ง
const G1 = {
  R: { top: [30, -100], c1: [33.5, -86], c2: [37.5, -72], m: [42, -61], c3: [48, -47], c4: [62, -36], end: [61, -20] },
  L: { end: [-47, -14], c1: [-47.5, -26], c2: [-45.5, -44], m: [-42.5, -54], c3: [-38.5, -66], c4: [-32, -82], top: [-30, -100] },
  hem: [[50, -14], [40, -14.6], [26, -0.8], [11, -6.5], [-15, 1.3], [-31, -9.5], [-41.5, -7.5]],
  under: [[38, -15], [34, -12.5], [26, -5], [12, 1.2], [-15, -4], [-33, -7.8], [-42, -11]],
  face: -15, eyeL: [-29, -75], eyeR: [-3, -75], eyeKL: 0.9, eyeKR: 1, mouth: [-16, -65.5],
  cry: [-15, -35],
  handL: { S: [-44.5, -36], P: [-46, -34.5], r0: 9.5, r1: 10.5, bul: 0.4, dent: 0.4, thumb: 0.8, thA: -0.85 },
  handR: { S: [29.5, -50.5], P: [19, -33], r0: 7, r1: 13, bul: 4.5, dent: 2, thumb: 0.35, thA: -2.3 },
  topC: 0, ringC: 5,
};
const G0 = {
  R: { top: [30, -100], c1: [33.5, -86], c2: [37.5, -72], m: [42.5, -59], c3: [47.5, -47], c4: [56, -36], end: [55, -16] },
  L: { end: [-55, -16], c1: [-56, -36], c2: [-47.5, -47], m: [-42.5, -59], c3: [-37.5, -72], c4: [-33.5, -86], top: [-30, -100] },
  hem: [[47, -9.5], [37, -12], [21, 0], [0, -6], [-21, 0], [-37, -12], [-47, -9.5]],
  under: [[45, -13], [37, -8], [21, -4], [0, 1.5], [-21, -4], [-37, -8], [-45, -13]],
  face: 0, eyeL: [-13.5, -75], eyeR: [13.5, -75], eyeKL: 1, eyeKR: 1, mouth: [0, -65.5],
  cry: [-1, -35],
  handL: { S: [-37, -50], P: [-30, -34], r0: 6.5, r1: 11, bul: 3.5, dent: 1.8, thumb: 0.35, thA: -0.84 },
  handR: { S: [37, -50], P: [30, -34], r0: 6.5, r1: 11, bul: 3.5, dent: 1.8, thumb: 0.35, thA: -2.3 },
  topC: 0, ringC: 2,
};
function geo(k) {
  const mix = (a, b) => (typeof a === 'number' ? lerp(b, a, k)
    : Array.isArray(a) ? a.map((v, i) => mix(v, b[i]))
    : Object.fromEntries(Object.keys(a).map((key) => [key, mix(a[key], b[key])])));
  return mix(G1, G0);   // k = 1 → G1 (เฉียง) · k = 0 → G0 (หน้าตรง)
}

const TOP_Y = -100, TOP_RX = 30, TOP_RY = 8.6;

// ───────────────────────── ชายล่าง: ผ้าพลิ้วสองชั้นตามแบบ ─────────────────────────
// ชั้นหน้า = ชายตัวไม้ม้วนเป็นแถบพีช → ชมพู · ชั้นใน = ผ้าซับม่วงโผล่ใต้ยอดเว้า (ผู้ใช้ 22 พ.ย.: "ให้พริ้วเหมือนแบบ ไม่แข็ง")
// ทุกปมเป็นคลื่นวิ่งจากซ้ายไปขวา ชั้นในช้ากว่าครึ่งจังหวะ → ลอนห้อยสลับกันขยับเหมือนผ้า
const HEM_W = TAU / 2.3;
const bz = (q, u) => { const v = 1 - u; return [0, 1].map((k) => v * v * v * q[0][k] + 3 * v * v * u * q[1][k] + 3 * v * u * u * q[2][k] + u * u * u * q[3][k]); };
/** เส้นผ่านปมแบบหัวลอนนอนราบ · ปลายสองข้างรับต่อจากเส้นข้างตัว (ลงแนวดิ่ง) */
function waveSegs(F, sideEnds) {
  const out = [], n = F.length - 1;
  for (let j = 0; j < n; j++) {
    const a = F[j], b = F[j + 1], dx = b[0] - a[0], dy = b[1] - a[1];
    let c1 = [a[0] + dx * 0.42, a[1]], c2 = [b[0] - dx * 0.42, b[1]];
    if (sideEnds && j === 0) { c1 = [a[0], a[1] + dy * 0.62]; c2 = [b[0] - dx * 0.5, b[1]]; }
    if (sideEnds && j === n - 1) { c1 = [a[0] + dx * 0.5, a[1]]; c2 = [b[0], b[1] - dy * 0.62]; }
    out.push([a, c1, c2, b]);
  }
  return out;
}
function hemGeo(g, t, P) {
  const f = P.flow, lift = P.hemLift, w = t * HEM_W;
  const wob = (i, ax, ay, ph = 0) => [Math.cos(w - i * 0.95 + ph) * ax * f, Math.sin(w - i * 0.95 + ph) * ay * f];
  const dR = wob(0, 0.7, 0.9), dL = wob(8, 0.6, 0.8);
  const tipR = [g.R.end[0] + dR[0], g.R.end[1] + dR[1] + lift * 0.3], tipL = [g.L.end[0] + dL[0], g.L.end[1] + dL[1] + lift * 0.3];
  const nodes = g.hem.map(([x, y], i) => {
    const lobe = i % 2 === 0, [dx, dy] = wob(i + 1, lobe ? 0.9 : 0.5, lobe ? 1.9 : 1.1);
    return [x + dx, y + dy + lift * (lobe ? 1 : 0.4)];
  });
  const under = g.under.map(([x, y], i) => {
    const end = i === 0 || i === g.under.length - 1, lobe = i % 2 === 1;
    const [dx, dy] = wob(i + 0.5, end ? 0.2 : 0.9, end ? 0.3 : lobe ? 2.3 : 1.2, 1.7);
    return [x + dx, y + dy + lift * (end ? 0.3 : lobe ? 1.15 : 0.5)];
  });
  // ความหนาแถบม้วน: ลอนห้อยหนา ยอดเว้าบาง ปลายข้างบางสุด · หายใจเบา ๆ ตามคลื่น
  const th = [1.5, ...nodes.map((_, i) => (i % 2 === 0 ? 8.8 : 5.4) * (1 + Math.sin(w - (i + 1) * 0.95 + 0.8) * 0.1 * f)), 1.5];
  const segs = waveSegs([tipR, ...nodes, tipL], true);
  // จุดถี่ตามขอบ + ความหนา + ทิศตั้งฉากชี้เข้าตัว (ไว้วาดแถบม้วน)
  const pts = [];
  segs.forEach((q, j) => { for (let i = j ? 1 : 0; i <= 10; i++) { const u = i / 10, [x, y] = bz(q, u); pts.push([x, y, lerp(th[j], th[j + 1], ease(u))]); } });
  // ช่วงปลายสองข้าง (เส้นข้างตัวม้วนลง) ให้แถบบางลงจนหาย — กันแถบวิ่งขึ้นไปตามข้างตัว
  const nP = pts.length;
  pts.forEach((q, i) => { const k = (Math.min(i, nP - 1 - i) - 2) / 12; q.push(ease(k)); });
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], L = Math.hypot(tx, ty) || 1;
    pts[i].splice(3, 0, -ty / L, tx / L);   // [x, y, หนา, nx, ny, ค่อย ๆ หายที่ปลาย]
  }
  return { tipR, tipL, dR, dL, segs, pts, under: waveSegs(under, false), U: under };
}
function bodyPath(g, H) {
  const p = new Path2D(), R = g.R, L = g.L;
  const c4 = [R.c4[0] + H.dR[0] * 0.5, R.c4[1] + H.dR[1] * 0.5], c1 = [L.c1[0] + H.dL[0] * 0.5, L.c1[1] + H.dL[1] * 0.5];
  p.moveTo(...L.top);
  p.ellipse(0, TOP_Y, TOP_RX, TOP_RY, 0, Math.PI, 0, false);
  p.bezierCurveTo(...R.c1, ...R.c2, ...R.m);
  p.bezierCurveTo(...R.c3, ...c4, ...H.tipR);
  for (const q of H.segs) p.bezierCurveTo(...q[1], ...q[2], ...q[3]);
  p.bezierCurveTo(...c1, ...L.c2, ...L.m);
  p.bezierCurveTo(...L.c3, ...L.c4, ...L.top);
  p.closePath();
  return p;
}
const along = (c, pts, off) => { c.beginPath(); pts.forEach(([x, y, th, nx, ny, e], i) => { const d = (typeof off === 'function' ? off(th, x) : off) * e; (i ? c.lineTo : c.moveTo).call(c, x + nx * d, y + ny * d); }); };

/** ผ้าซับชั้นใน (วาดก่อนตัว — ส่วนบนซ่อนอยู่หลังตัว เห็นแค่ลอนที่ห้อยต่ำกว่าชั้นหน้า) */
function drawUnder(c, H) {
  const U = H.U, p = new Path2D();
  p.moveTo(U[0][0], -34); p.lineTo(...U[0]);
  for (const q of H.under) p.bezierCurveTo(...q[1], ...q[2], ...q[3]);
  p.lineTo(U[U.length - 1][0], -34); p.closePath();
  let gr = c.createLinearGradient(-45, 0, 42, 0);
  gr.addColorStop(0, '#B27F9F'); gr.addColorStop(0.5, '#A478AE'); gr.addColorStop(1, '#9470B2');
  c.fillStyle = gr; c.fill(p);
  c.save(); c.clip(p);
  gr = c.createLinearGradient(0, -14, 0, 3);
  gr.addColorStop(0, 'rgba(96,52,128,.2)'); gr.addColorStop(1, 'rgba(96,52,128,0)');
  c.fillStyle = gr; c.fillRect(-50, -34, 100, 38);
  c.strokeStyle = 'rgba(238,204,246,.4)'; c.lineWidth = 2.2; c.stroke(p);   // ขอบล่างรับแสงนิด ๆ
  // เงาใต้ชายชั้นหน้า (ครึ่งบนของเส้นถูกตัวบัง เหลือเงานุ่มใต้ขอบ)
  c.lineJoin = 'round';
  c.strokeStyle = 'rgba(70,30,100,.14)'; c.lineWidth = 7; along(c, H.pts, 0); c.stroke();
  c.strokeStyle = 'rgba(70,30,100,.18)'; c.lineWidth = 3.4; along(c, H.pts, 0); c.stroke();
  c.restore();
}

function drawBody(c, g, H, body, k) {
  let gr = c.createLinearGradient(-50, 0, 62, 0);
  gr.addColorStop(0, COL.bodyL); gr.addColorStop(0.45, COL.bodyM); gr.addColorStop(1, COL.bodyR);
  c.fillStyle = gr; c.fill(body);
  c.save(); c.clip(body);
  // บนอมน้ำตาลไม้ · ล่างอมชมพูม่วง
  gr = c.createLinearGradient(0, -100, 0, 0);
  gr.addColorStop(0, 'rgba(184,116,96,.34)'); gr.addColorStop(0.42, 'rgba(184,116,96,0)');
  gr.addColorStop(0.62, 'rgba(230,150,212,0)'); gr.addColorStop(1, 'rgba(230,150,212,.5)');
  c.fillStyle = gr; c.fillRect(-70, -110, 140, 115);
  // ร่องเปลือกแนวตั้ง (ตามความโค้งตัว · เลื่อนตามมุมหัน)
  c.lineCap = 'round';
  for (const [x, top, bot, bow, w] of [[-26, -93, -30, -3, 4.5], [-14, -95, -40, -1, 4], [-1, -94, -24, 1, 4.5], [13, -92, -34, 3, 4], [26, -88, -42, 5, 4.5], [38, -66, -30, 7, 3.5], [-36, -74, -34, -4, 3.5]]) {
    const xx = x + g.face * 0.25 * (x < 20 ? 1 : 0.3);
    c.strokeStyle = COL.groove; c.lineWidth = w;
    c.beginPath(); c.moveTo(xx, top); c.quadraticCurveTo(xx + bow, (top + bot) / 2, xx + bow * 1.8, bot); c.stroke();
    c.strokeStyle = COL.grooveHi; c.lineWidth = w * 0.5;
    c.beginPath(); c.moveTo(xx - 2.6, top + 2); c.quadraticCurveTo(xx + bow - 2.6, (top + bot) / 2, xx + bow * 1.8 - 2.6, bot - 2); c.stroke();
  }
  // ── ชายล่าง ──
  const S = H.pts;
  const strip = (lo, hi) => {   // แถบระหว่างระยะ lo → hi จากขอบล่าง (วัดเข้าตัว)
    const z = new Path2D();
    S.forEach(([x, y, th, nx, ny, e], i) => { const d = lo(th, x) * e; (i ? z.lineTo : z.moveTo).call(z, x + nx * d, y + ny * d); });
    for (let i = S.length - 1; i >= 0; i--) { const [x, y, th, nx, ny, e] = S[i], d = hi(th, x) * e; z.lineTo(x + nx * d, y + ny * d); }
    z.closePath(); return z;
  };
  // โซนสว่างเหนือแถบม้วน (เนื้อไม้ไล่อ่อนลงหาชาย) ขอบบนเป็นหยดสีไม้ห้อยลงมาแบบในภาพแบบ
  const drip = (th, x) => th + 12 - 7.5 * Math.max(0, Math.sin(x * 0.21 + 0.6)) ** 1.5 - 4 * Math.max(0, Math.sin(x * 0.37 + 2.1)) ** 2;
  for (const [kk, a] of [[1, 0.26]]) {
    gr = c.createLinearGradient(-50, 0, 62, 0);
    gr.addColorStop(0, `rgba(236,170,156,${a * 1.2})`); gr.addColorStop(0.5, `rgba(222,160,178,${a})`); gr.addColorStop(1, `rgba(200,150,206,${a * 0.9})`);
    c.fillStyle = gr; c.fill(strip((th) => th - 0.5, (th, x) => th + (drip(th, x) - th) * kk));
  }
  // แถบม้วนชายผ้า: พีชซ้าย → ชมพู → ม่วงชมพูขวา · ขอบบนคม ขอบล่างคือขอบตัว
  gr = c.createLinearGradient(-50, 0, 62, 0);
  gr.addColorStop(0, '#EAAA9E'); gr.addColorStop(0.4, '#DB9EAA'); gr.addColorStop(0.68, '#CA96B8'); gr.addColorStop(1, '#B68CC4');
  c.globalAlpha = 0.45; c.fillStyle = gr; c.fill(strip((th) => th - 0.5, (th) => th + 2.6)); c.globalAlpha = 1;   // ขอบบนไล่นุ่มเข้าเนื้อไม้
  c.fillStyle = gr; c.fill(strip(() => -2, (th) => th));
  // ม้วนผ้าสว่างขึ้นหาขอบล่าง (ครึ่งล่างของแถบ)
  c.fillStyle = 'rgba(255,226,214,.14)'; c.fill(strip(() => -2, (th) => th * 0.45));
  // แสงนวลซ้ายบน · เงาฝั่งขวา (ฝั่งที่หันออก)
  gr = c.createRadialGradient(-26 + g.face * 0.3, -78, 4, -26 + g.face * 0.3, -78, 62);
  gr.addColorStop(0, 'rgba(255,228,214,.34)'); gr.addColorStop(1, 'rgba(255,228,214,0)');
  c.fillStyle = gr; c.fillRect(-70, -110, 140, 115);
  gr = c.createLinearGradient(22, 0, 64, 0);
  gr.addColorStop(0, 'rgba(84,44,118,0)'); gr.addColorStop(1, `rgba(84,44,118,${0.16 + 0.12 * k})`);
  c.fillStyle = gr; c.fillRect(-70, -110, 140, 115);
  c.restore();
  // หน้าตัดตอไม้ด้านบน: ปากเปลือก → เนื้อไม้ไล่สี → วงปีเป็นก้นหอย → หน้าตัดเฉียงสว่าง
  c.fillStyle = COL.topLip; c.beginPath(); c.ellipse(0, TOP_Y + 0.6, TOP_RX, TOP_RY + 0.8, 0, 0, TAU); c.fill();
  gr = c.createLinearGradient(-30, TOP_Y, 30, TOP_Y);
  gr.addColorStop(0, COL.top1); gr.addColorStop(1, COL.top2);
  c.fillStyle = gr; c.beginPath(); c.ellipse(0, TOP_Y, TOP_RX - 1.4, TOP_RY - 0.6, 0, 0, TAU); c.fill();
  c.strokeStyle = COL.ring; c.lineWidth = 1.3;
  const rc = g.ringC;
  for (const [rx, ry] of [[20, 5.4], [13, 3.6], [6.5, 1.8]]) { c.beginPath(); c.ellipse(rc, TOP_Y + 0.3, rx, ry, 0, 0, TAU); c.stroke(); }
  c.fillStyle = 'rgba(255,240,222,.5)';   // หน้าตัดเฉียง (รอยตัดไม่เรียบ) ด้านหน้าซ้าย
  c.beginPath(); c.moveTo(-24, TOP_Y + 4.5); c.lineTo(-7, TOP_Y - 2.5); c.lineTo(5, TOP_Y + 5.8); c.lineTo(-15, TOP_Y + 7); c.closePath(); c.fill();
}

function drawBranch(c) {
  const p = new Path2D();
  p.moveTo(30, -84); p.quadraticCurveTo(42, -88, 54, -96); p.lineTo(58, -88); p.quadraticCurveTo(47, -80, 36, -71); p.closePath();
  p.moveTo(43, -84); p.quadraticCurveTo(46, -92, 47, -99); p.lineTo(51, -98); p.quadraticCurveTo(50, -90, 47, -83); p.closePath();
  const g = c.createLinearGradient(32, -76, 54, -94);
  g.addColorStop(0, COL.bodyM); g.addColorStop(1, '#CC8C8E');
  c.fillStyle = g; c.fill(p);
  for (const [x, y, rx, ry, a] of [[56.4, -92, 3.2, 4.4, -0.5], [49, -98.6, 2.2, 1.4, -0.1]]) {
    c.save(); c.translate(x, y); c.rotate(a);
    c.fillStyle = COL.top1; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.fill();
    c.strokeStyle = COL.ring; c.lineWidth = 0.7; c.beginPath(); c.ellipse(0, 0, rx * 0.5, ry * 0.5, 0, 0, TAU); c.stroke();
    c.restore();
  }
}
function leaf(c, x, y, ang, len = 12, w = 6) {
  c.save(); c.translate(x, y); c.rotate(ang);
  const g = c.createLinearGradient(0, -w, len, w);
  g.addColorStop(0, COL.leaf); g.addColorStop(1, COL.leaf2);
  c.fillStyle = g;
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.45, -w, len, 0); c.quadraticCurveTo(len * 0.45, w, 0, 0); c.fill();
  c.strokeStyle = 'rgba(255,255,236,.4)'; c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(1.5, 0); c.lineTo(len * 0.8, 0); c.stroke();
  c.restore();
}
function drawLeaves(c, t) {
  const sw = (i) => Math.sin(t * 2.2 + i * 1.9) * 0.09;
  leaf(c, -24, -103, -2.55 + sw(0), 16, 8);
  leaf(c, 27, -103, -0.5 + sw(1), 16, 8);
  leaf(c, 29, -84, 0.2 + sw(2), 12, 6);
  leaf(c, 54, -80, 0.6 + sw(3), 13, 6.5);
  leaf(c, 49, -102, -1.2 + sw(4), 9, 4.5);
}

// ── หน้า ──
function eye(c, side, P, gaze, t, g) {
  const [ex, ey] = side < 0 ? g.eyeL : g.eyeR;
  const k = side < 0 ? g.eyeKL : g.eyeKR;
  c.save(); c.translate(ex, ey); c.scale(k, 1);
  if (P.eyes === 'swirl') {
    c.rotate(t * 4 * side);
    c.strokeStyle = COL.ink; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath();
    for (let a = 0; a <= TAU * 2.2; a += 0.2) { const r = 0.5 + (a / (TAU * 2.2)) * 8; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.stroke(); c.restore(); return;
  }
  if (P.eyes === 'x') {
    c.strokeStyle = COL.ink; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-5, -5); c.lineTo(5, 5); c.moveTo(5, -5); c.lineTo(-5, 5); c.stroke();
    c.restore(); return;
  }
  const glow = P.eyes === 'glow';
  // ตาตามแบบ (ผู้ใช้ 22 พ.ย.: "ยังเหล่ วาดใหม่"): ตาขาวรีตั้ง ถูกคิ้วตัดเฉียง (หัวตาต่ำ หางตาสูง)
  // ตาดำโตห้อยจากคิ้ว (ขอบบนจมใต้คิ้ว ไม่ลอยกลางตา) อยู่ค่อนหัวตาทั้งสองข้างแบบสมมาตร → ดูขึงขัง ไม่เหล่
  const inn = side < 0 ? 1 : -1;   // ทิศหัวตา (เข้าหาจมูก)
  const RX = 7.6, RY = 9, CY = 0.5;
  const drop = (glow ? 2 : 0) + P.lid * 16;
  const A = [8 * inn, -2.2 + drop], B = [-8 * inn, -8.2 + drop];   // เส้นคิ้วตัดตา: A = หัวตา · B = หางตา
  const cutY = (x) => A[1] + ((B[1] - A[1]) * (x - A[0])) / (B[0] - A[0]);
  c.save();
  c.beginPath();
  c.moveTo(14 * inn, cutY(14 * inn)); c.lineTo(-14 * inn, cutY(-14 * inn)); c.lineTo(-14 * inn, 14); c.lineTo(14 * inn, 14); c.closePath();
  c.clip();
  const white = new Path2D(); white.ellipse(0, CY, RX, RY, 0, 0, TAU);
  if (glow) { c.shadowColor = 'rgba(255,170,205,.9)'; c.shadowBlur = 10; }
  let gr = c.createLinearGradient(0, -8, 0, CY + RY);
  gr.addColorStop(0, glow ? '#FFFFFF' : '#FFF4E4'); gr.addColorStop(1, glow ? '#FFE3EE' : '#FBE2C4');
  c.fillStyle = gr; c.fill(white);
  c.shadowBlur = 0;
  c.clip(white);
  // แก้มชมพูใต้คิ้ว
  c.strokeStyle = glow ? 'rgba(255,190,214,.5)' : 'rgba(246,180,174,.62)'; c.lineWidth = 4.6;
  c.beginPath(); c.moveTo(14 * inn, cutY(14 * inn) + 2.6); c.lineTo(-14 * inn, cutY(-14 * inn) + 2.6); c.stroke();
  if (!glow) {
    const px = 1.6 * inn + gaze * 0.7, py = -1.2;
    gr = c.createLinearGradient(0, py - 3, 0, py + 6.4);
    gr.addColorStop(0, '#6C3F72'); gr.addColorStop(1, '#8A5A8F');
    c.fillStyle = gr; c.beginPath(); c.ellipse(px, py, 5.4, 6.4, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.arc(px - inn * 3.2, py + 2.6, 1.35, 0, TAU); c.fill();
  }
  c.restore();
  // คิ้วหนาปลายมน วางบนเส้นตัด เลยหางตาออกไปนิด หัวคิ้วจบที่หัวตา
  c.strokeStyle = COL.ink; c.lineWidth = glow ? 4.6 : 4.2; c.lineCap = 'round';
  const tail = -10.6 + (1 - k) * 36;   // k = ความกว้างตา (ข้างไกลตอนเฉียง 0.9 → หางคิ้ว -7 · หน้าตรง 1 → -10.6 เท่ากันสองข้าง)
  c.beginPath(); c.moveTo(7 * inn, cutY(7 * inn) - 0.2); c.lineTo(tail * inn, cutY(tail * inn) - 0.5); c.stroke();
  c.restore();
}
function drawFace(c, P, gaze, t, g) {
  eye(c, -1, P, gaze, t, g); eye(c, 1, P, gaze, t, g);
  const [mx, my] = g.mouth;
  c.strokeStyle = COL.ink; c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round';
  if (P.mouth === 'open') {
    const h = 2.6 + P.mouthOpen * 2.2;
    c.fillStyle = '#5B2E58'; c.beginPath(); c.ellipse(mx, my + 1, 4.4, h, 0, 0, TAU); c.fill();
    c.fillStyle = '#E58DAE'; c.beginPath(); c.ellipse(mx, my + 1 + h * 0.45, 2.8, h * 0.42, 0, 0, Math.PI); c.fill();
  } else {
    c.beginPath(); c.moveTo(mx - 3.4, my + 1.6); c.lineTo(mx, my - 1.6); c.lineTo(mx + 3.4, my + 1.6); c.stroke();
  }
}

// ── มือตามแบบ: ซ้าย = กำปั้นกลมมีนิ้วโป้งชี้ขึ้นจับขอบผลึก · ขวา = แขนทรงถั่วโค้งโอบขอบผลึก ──
// (ผู้ใช้ 22 พ.ย.: "มือยังไม่เหมือนแบบ วาดใหม่") ลงสีแบบภาพแบบ: ขอบแสงพีช → ชมพูกุหลาบ → เงาม่วงครึ่งล่าง
// ไม่มีเส้นเข้มบนมือ (ผู้ใช้ 22 พ.ย.: ร่องนิ้ว/ขอบเข้มดูเป็นเส้น → เอาออก) นิ้วโป้งบอกด้วยรูปทรงอย่างเดียว
const HAND_COL = {
  L: { rim: '#F7C4AF', base: '#E0A0A0', base2: '#D6969F', shade: '#BC809A' },
  R: { rim: '#F5BBA9', base: '#D899AB', base2: '#CD90AB', shade: '#B680A5' },
};
/** เส้นรอบมือ: ด้านนอก S → P · ครึ่งวงอุ้งมือ · ด้านใน P → S · ครึ่งวงโคนแขน แล้วดันนิ้วโป้งออกที่มุม thA */
function handPts(S, P, h, side) {
  const dx = P[0] - S[0], dy = P[1] - S[1], L = Math.hypot(dx, dy) || 1e-3;
  const ux = dx / L, uy = dy / L, nx = side * uy, ny = -side * ux;   // n = ด้านนอก (ท้องนูน)
  const pts = [], N = 9;
  const at = (k, w) => [S[0] + dx * k + nx * w, S[1] + dy * k + ny * w];
  const cap = (C, r, a) => [C[0] + (ux * Math.cos(a) + nx * Math.sin(a)) * r, C[1] + (uy * Math.cos(a) + ny * Math.sin(a)) * r];
  for (let i = 0; i <= N; i++) { const k = i / N; pts.push(at(k, lerp(h.r0, h.r1, k) + h.bul * Math.sin(Math.PI * k))); }
  for (let i = 1; i < N; i++) pts.push(cap(P, h.r1, Math.PI / 2 - (Math.PI * i) / N));
  for (let i = N; i >= 0; i--) { const k = i / N; pts.push(at(k, -(lerp(h.r0, h.r1, k) - h.dent * Math.sin(Math.PI * k)))); }
  for (let i = 1; i < N; i++) pts.push(cap(S, h.r0, -Math.PI / 2 - (Math.PI * i) / N));
  if (h.thumb > 0.01) {
    for (const q of pts) {
      const vx = q[0] - P[0], vy = q[1] - P[1], d = Math.hypot(vx, vy) || 1;
      let da = Math.atan2(vy, vx) - h.thA; da = Math.atan2(Math.sin(da), Math.cos(da));
      const wgt = clamp(1.75 - d / h.r1);
      const push = h.thumb * h.r1 * (0.3 * Math.exp(-((da / 0.42) ** 2)) - 0.1 * Math.exp(-(((da - side * 0.62) / 0.2) ** 2))) * wgt;
      q[0] += (vx / d) * push; q[1] += (vy / d) * push;
    }
  }
  return pts;
}
function smoothInto(p, pts, ox = 0, oy = 0) {
  const n = pts.length, m = (a, b) => [(a[0] + b[0]) / 2 + ox, (a[1] + b[1]) / 2 + oy];
  const s0 = m(pts[n - 1], pts[0]); p.moveTo(s0[0], s0[1]);
  for (let i = 0; i < n; i++) { const a = pts[i], e = m(a, pts[(i + 1) % n]); p.quadraticCurveTo(a[0] + ox, a[1] + oy, e[0], e[1]); }
  p.closePath();
  return p;
}
const smooth = (pts, ox, oy) => smoothInto(new Path2D(), pts, ox, oy);

function hand(c, h, a, side, body) {
  // a.r = ง้างออกด้านนอก/ขึ้น · a.dx a.dy = เลื่อนอุ้งมือ (โคนแขนอยู่กับที่ → มือยืดเป็นถั่วตอนง้าง/ตก)
  const P = [h.P[0] + a.dx * 0.7 + side * a.r * 6, h.P[1] + a.dy * 0.7 - a.r * 5];
  const pts = handPts(h.S, P, h, side), col = side < 0 ? HAND_COL.L : HAND_COL.R;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const hh = y1 - y0, path = smooth(pts);
  const minus = (ox, oy) => { const q = new Path2D(); q.rect(x0 - 12, y0 - 12, x1 - x0 + 24, hh + 24); return smoothInto(q, pts, ox, oy); };
  // เงาตกบนตัวและผลึก (ตัดตามตัว ไม่ให้เป็นเงาดำลอยกลางอากาศ)
  if (body) { c.save(); c.clip(body); c.fillStyle = 'rgba(80,36,106,.15)'; c.fill(smooth(pts, 1.4, 2.4)); c.restore(); }
  c.save(); c.clip(path);
  c.fillStyle = col.rim; c.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, hh + 4);                   // ขอบแสงพีช (เหลือเป็นเสี้ยวบนซ้าย)
  let gr = c.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, col.base); gr.addColorStop(1, col.base2);
  c.fillStyle = gr; c.fill(smooth(pts, 2, 2.8));
  c.fillStyle = col.shade; c.fill(minus(-4.2, -Math.min(8, hh * 0.3)), 'evenodd');            // เงาครึ่งล่าง-ขวา โค้งตามทรงมือ
  c.restore();
}

// ── จุดอ่อนบนหัว (เปลวทองทรงอัญมณี มีประกายข้างใน) ──
function star4(c, x, y, r, a = 1) {
  c.save(); c.globalAlpha *= a; c.translate(x, y);
  c.beginPath();
  for (let i = 0; i < 8; i++) { const ang = (i / 8) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.28 : r; c.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); }
  c.closePath(); c.fill(); c.restore();
}
function drawFlame(c, P, t) {
  const b = P.flame;
  if (b <= 0.01) return;
  const fy = -STUMP.flameY + Math.sin(t * 2.4) * 1.2;
  const R = 16 + b * 16;
  let g = c.createRadialGradient(0, fy, 1, 0, fy, R);
  g.addColorStop(0, `rgba(255,224,140,${0.45 * Math.min(1, b)})`); g.addColorStop(1, 'rgba(255,224,140,0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, fy, R, 0, TAU); c.fill();
  c.save(); c.translate(0, fy); c.scale(1 + Math.sin(t * 7) * 0.03, 1 + Math.sin(t * 5.3) * 0.05);
  const p = new Path2D();
  p.moveTo(0, -17); p.bezierCurveTo(3, -10, 9, -4, 8.5, 3); p.bezierCurveTo(8, 10, -8, 10, -8.5, 3); p.bezierCurveTo(-9, -4, -3, -10, 0, -17); p.closePath();
  g = c.createRadialGradient(0, 3, 1, 0, 0, 14);
  g.addColorStop(0, COL.flameIn); g.addColorStop(0.5, COL.flameMid); g.addColorStop(1, COL.flameOut);
  c.globalAlpha = Math.min(1, 0.6 + b * 0.4);
  c.fillStyle = g; c.fill(p);
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(0, -15); c.lineTo(-5, 0); c.lineTo(0, 6); c.closePath(); c.fill();
  c.fillStyle = '#FFFFFF'; star4(c, 0, 0.5, 5.2 + b * 1.2, 0.95);
  c.restore();
  c.fillStyle = '#FFE7A6';
  star4(c, -11, fy - 2, 3.4, 0.5 + 0.5 * Math.sin(t * 3)); star4(c, 12, fy + 4, 2.8, 0.5 + 0.5 * Math.sin(t * 3 + 2));
}

// ── ผลึกขังน้อง (วาดใหม่ตามแบบ 22 พ.ย.): อัญมณีเหลี่ยมมน 12 มุม · วงเหลี่ยมรอบนอกไล่สีรุ้ง (ฟ้าซ้าย ม่วงบน ชมพูขวา) ·
// หน้าโต๊ะใสตรงกลางเห็นน้องหลับ · ประกายในผลึก · แสงวาบกวาดผ่านเป็นระยะ ──
const CRY_W = 58, CRY_H = 46;
// ขอบนอก (สัดส่วนจาก docs/boss-stump/3-parts.jpg) ตามเข็มนาฬิกาเริ่มซ้าย
const GEM = [[-0.5, -0.1], [-0.43, -0.36], [-0.29, -0.5], [0.01, -0.49], [0.26, -0.43], [0.38, -0.35], [0.5, -0.09], [0.41, 0.21], [0.19, 0.43], [-0.11, 0.5], [-0.35, 0.37], [-0.49, 0.1]];
const GEM_C = [-0.02, -0.06];   // กลางหน้าโต๊ะ (ค่อนบนนิด เหมือนมองจากด้านบน)
const GEM_IN = GEM.map(([x, y]) => [GEM_C[0] + (x - GEM_C[0]) * 0.65, GEM_C[1] + (y - GEM_C[1]) * 0.62]);
const CRACKS = [
  { pts: [[0.02, -0.04], [-0.1, -0.18], [-0.08, -0.3], [-0.22, -0.46]], br: [[1, [-0.3, -0.12]]] },
  { pts: [[0.04, -0.02], [0.18, 0.02], [0.24, -0.16], [0.4, -0.2]], br: [[2, [0.3, -0.34]]] },
  { pts: [[0.0, 0.0], [0.05, 0.16], [-0.06, 0.3], [-0.02, 0.46]], br: [[1, [0.2, 0.24]], [2, [-0.22, 0.32]]] },
];
const polyPath = (L, sc = 1) => { const p = new Path2D(); L.forEach(([x, y], i) => (i ? p.lineTo : p.moveTo).call(p, x * CRY_W * sc, y * CRY_H * sc)); p.closePath(); return p; };
const gemPath = (sc = 1) => polyPath(GEM, sc);
// สีเหลี่ยมตามทิศ: ซ้าย = ฟ้า · บน = ม่วงอ่อน · ขวา = ชมพูม่วง · ล่าง = ฟ้าอมม่วง · ฝั่งซ้ายบนสว่างกว่า (แสงมาจากซ้ายบน)
const FACET_HUE = [[Math.PI, [140, 218, 248]], [-Math.PI / 2, [214, 196, 250]], [0, [234, 166, 234]], [Math.PI / 2, [170, 180, 244]]];
function facetRGB(x, y, lift) {
  const a = Math.atan2(y, x);
  let r = 0, g = 0, b = 0, ws = 0;
  for (const [aa, col] of FACET_HUE) { const w = Math.max(0, Math.cos(a - aa)) ** 2; r += col[0] * w; g += col[1] * w; b += col[2] * w; ws += w; }
  const lit = 0.5 + 0.5 * Math.cos(a + 2.3), k = clamp(lit * 0.2 + lift);
  return [r / ws + (255 - r / ws) * k, g / ws + (255 - g / ws) * k, b / ws + (255 - b / ws) * k].map(Math.round);
}

/** ความสูงน้องจิบิท่านั่ง (หน่วยชีท) — วัดจากพิกเซลจริงครั้งเดียว ใช้ย่อให้พอดีผลึก */
let CHIBI_H = 0;
function chibiHeight(look) {
  if (CHIBI_H || typeof document === 'undefined') return CHIBI_H || 60;
  const cv = document.createElement('canvas'); cv.width = cv.height = 400;
  const x = cv.getContext('2d', { willReadFrequently: true });
  drawChibi(x, 200, 340, 1, { view: 'sit', act: 'sleep', look });
  const d = x.getImageData(0, 0, 400, 400).data;
  let top = 400;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 20) { top = Math.floor(i / 4 / 400); break; }
  CHIBI_H = Math.max(20, 340 - top);
  return CHIBI_H;
}

function drawCrystal(c, P, o, t, g) {
  const crack = Math.max(o.crack || 0, P.crackMin);
  c.save(); c.translate(g.cry[0], g.cry[1] - P.crystalUp);
  const W = CRY_W, H = CRY_H, X = (q) => q[0] * W, Y = (q) => q[1] * H;
  const shine = 0.5 + P.rays * 0.9 + crack * 0.12;
  // ออร่าม่วงรอบผลึก
  let gr = c.createRadialGradient(0, 0, 6, 0, 0, 44 + P.rays * 30);
  gr.addColorStop(0, `rgba(222,196,255,${0.62 * shine})`); gr.addColorStop(0.6, `rgba(190,226,255,${0.18 * shine})`); gr.addColorStop(1, 'rgba(214,188,255,0)');
  c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 44 + P.rays * 30, 0, TAU); c.fill();
  if (P.rays > 0) {
    c.save(); c.rotate(t * 0.4); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU, len = (60 + rnd(i) * 50) * P.rays, wd = 0.08 + rnd(i + 9) * 0.06;
      gr = c.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
      gr.addColorStop(0, `rgba(255,240,255,${0.5 * P.rays})`); gr.addColorStop(1, 'rgba(200,180,255,0)');
      c.fillStyle = gr; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, len, a - wd, a + wd); c.closePath(); c.fill();
    }
    c.restore();
  }
  const gem = gemPath(), table = polyPath(GEM_IN);
  // วงเหลี่ยมรอบนอก: แต่ละช่วงแบ่งเป็นสามเหลี่ยมสองชิ้น (ชิ้นนอกสว่าง ชิ้นในเข้ม) → ประกายแบบเพชรเจียระไน
  const n = GEM.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, o0 = GEM[i], o1 = GEM[j], i0 = GEM_IN[i], i1 = GEM_IN[j];
    const mx = (o0[0] + o1[0]) / 2, my = (o0[1] + o1[1]) / 2;
    const flick = 0.06 * Math.max(0, Math.sin(t * 1.7 + i * 1.3));   // เหลี่ยมวาบทีละชิ้นเบา ๆ
    let [r, g2, b] = facetRGB(mx, my, 0.12 + flick);
    c.fillStyle = `rgb(${r},${g2},${b})`;
    c.beginPath(); c.moveTo(X(o0), Y(o0)); c.lineTo(X(o1), Y(o1)); c.lineTo(X(i1), Y(i1)); c.closePath(); c.fill();
    [r, g2, b] = facetRGB(mx, my, -0.04 + flick * 0.5);
    c.fillStyle = `rgb(${r},${g2},${b})`;
    c.beginPath(); c.moveTo(X(o0), Y(o0)); c.lineTo(X(i1), Y(i1)); c.lineTo(X(i0), Y(i0)); c.closePath(); c.fill();
  }
  // เงาแก้วสว่างซ้ายบนทั้งเม็ด (ให้วงเหลี่ยมดูใสเรืองแสง ไม่แบน)
  gr = c.createRadialGradient(-W * 0.25, -H * 0.3, 1, -W * 0.25, -H * 0.3, W * 0.62);
  gr.addColorStop(0, 'rgba(255,255,255,.26)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gr; c.fill(gem);
  // หน้าโต๊ะใส: ไล่ฟ้า → ม่วง → ชมพู · มีแสงในเนื้อ
  gr = c.createLinearGradient(-W * 0.35, -H * 0.35, W * 0.35, H * 0.3);
  gr.addColorStop(0, '#C9D9FB'); gr.addColorStop(0.5, '#D9C6F8'); gr.addColorStop(1, '#EDC2EF');
  c.fillStyle = gr; c.fill(table);
  c.save(); c.clip(table);
  gr = c.createRadialGradient(-W * 0.02, H * 0.02, 2, -W * 0.02, H * 0.02, W * 0.36);
  gr.addColorStop(0, 'rgba(255,244,252,.75)'); gr.addColorStop(1, 'rgba(255,244,252,0)');
  c.fillStyle = gr; c.fill(table);
  // พื้นแก้วใต้ตัวน้อง (แผ่นสะท้อนจาง ๆ)
  c.fillStyle = 'rgba(255,255,255,.22)';
  c.beginPath(); c.ellipse(-W * 0.01, H * 0.25, W * 0.25, H * 0.07, -0.05, 0, TAU); c.fill();
  // น้องหลับอยู่ข้างใน = ตัววาดน้องจิบิของเกม (ลายเส้นเดียวกับในบ้าน) · สีตามตัวที่จะได้
  c.globalAlpha = 0.94;
  drawChibi(c, -W * 0.015, H * 0.285, (H * 0.63) / chibiHeight(o.look), { view: 'sit', act: 'sleep', look: o.look || 'orange', t: t * 60 });
  c.globalAlpha = 1;
  // เนื้อแก้วทับตัวน้อง: ม่วงใสบาง ๆ + แสงสะท้อนเฉียงซ้ายบน
  c.fillStyle = 'rgba(206,184,255,.2)'; c.fill(table);
  c.fillStyle = 'rgba(255,255,255,.2)';
  c.beginPath(); c.moveTo(X(GEM_IN[1]), Y(GEM_IN[1])); c.lineTo(X(GEM_IN[3]), Y(GEM_IN[3])); c.lineTo(-W * 0.24, H * 0.06); c.lineTo(X(GEM_IN[0]), Y(GEM_IN[0])); c.closePath(); c.fill();
  c.restore();
  // เส้นสันเหลี่ยม: สีขาวบาง (ไม่ใช่เส้นขอบเข้ม)
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = 'rgba(255,255,255,.32)'; c.lineWidth = 0.7;
  c.beginPath();
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; c.moveTo(X(GEM[i]), Y(GEM[i])); c.lineTo(X(GEM_IN[i]), Y(GEM_IN[i])); c.moveTo(X(GEM[i]), Y(GEM[i])); c.lineTo(X(GEM_IN[j]), Y(GEM_IN[j])); }
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1; c.stroke(table);
  // ประกายในผลึก (ดาวทองดวงใหญ่ซ้าย · ดาวขาวขวาบน · ดาวจิ๋วกะพริบ)
  const tw = (i) => 0.35 + 0.65 * Math.max(0, Math.sin(t * 2.4 + i * 1.9));
  c.save(); c.shadowColor = 'rgba(255,236,170,.95)'; c.shadowBlur = 6;
  c.fillStyle = '#FFF3C4'; star4(c, -W * 0.27, -H * 0.04, 3.4, tw(0));
  c.fillStyle = '#FFFFFF'; star4(c, W * 0.2, -H * 0.27, 3, tw(1));
  c.restore();
  c.fillStyle = '#FFFFFF';
  for (const [x, y, r, i] of [[-0.16, -0.25, 1.5, 2], [0.29, -0.07, 1.4, 3], [0.33, -0.22, 1.1, 4], [-0.27, -0.24, 1.1, 5]]) star4(c, x * W, y * H, r, tw(i));
  // รอยร้าว (โดนตีจุดอ่อน)
  if (crack > 0) {
    c.save(); c.clip(gem);
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.shadowColor = 'rgba(255,240,255,.95)'; c.shadowBlur = 6;
    for (let k = 0; k < Math.min(3, crack); k++) {
      const cr = CRACKS[k];
      c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 1.5;
      c.beginPath(); cr.pts.forEach(([x, y], i) => (i ? c.lineTo(x * W, y * H) : c.moveTo(x * W, y * H))); c.stroke();
      c.lineWidth = 1;
      for (const [at, [x, y]] of cr.br) { c.beginPath(); c.moveTo(cr.pts[at][0] * W, cr.pts[at][1] * H); c.lineTo(x * W, y * H); c.stroke(); }
    }
    c.restore();
  }
  // ขอบในสว่าง + แสงวาบกวาดผ่านทุก 3.6 วิ
  c.save(); c.clip(gem);
  c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 2; c.stroke(gem);
  const sw = (t % 3.6) / 1.1;
  if (sw < 1) {
    const x0 = lerp(-W * 0.85, W * 0.85, sw);
    gr = c.createLinearGradient(x0 - 9, 0, x0 + 9, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,255,255,${0.42 * Math.sin(sw * Math.PI)})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.save(); c.transform(1, 0, -0.45, 1, 0, 0); c.fillRect(x0 - 9, -H, 18, H * 2); c.restore();
  }
  c.restore();
  c.restore();
}

// ── ของประกอบตามท่า ──
function drawBang(c, P, g) {
  if (P.bang <= 0) return;
  c.save(); c.translate(-48 + g.face * 0.5, -110); c.scale(P.bang, P.bang); c.lineCap = 'round';
  c.strokeStyle = '#FF9C6E'; c.lineWidth = 5; c.beginPath(); c.moveTo(-6, -4); c.lineTo(2, 4); c.stroke();
  c.strokeStyle = '#FFD46E'; c.lineWidth = 4.5; c.beginPath(); c.moveTo(4, -14); c.lineTo(8, -3); c.stroke();
  c.strokeStyle = '#FFB4CF'; c.lineWidth = 4; c.beginPath(); c.moveTo(-15, 2); c.lineTo(-6, 7); c.stroke();
  c.restore();
}
function drawPuff(c, P, g) {
  if (P.puff < 0) return;
  const k = P.puff, a = Math.sin(k * Math.PI);
  c.save(); c.translate(g.mouth[0] - 18 - k * 22, g.mouth[1] - k * 8); c.globalAlpha = a * 0.85;
  c.fillStyle = '#F4ECFF';
  for (const [x, y, r] of [[0, 0, 5], [5, -2, 4], [-5, 1, 3.6], [2, 3, 3.6]]) { c.beginPath(); c.arc(x, y, r * (0.7 + k * 0.5), 0, TAU); c.fill(); }
  c.restore();
}
function drawDissolve(c, P, t) {
  if (P.dissolve <= 0) return;
  const d = P.dissolve;
  for (let i = 0; i < 46; i++) {
    const delay = rnd(i) * 0.5, k = clamp((d - delay) / (1 - delay * 0.8));
    if (k <= 0 || k >= 1) continue;
    const x0 = (rnd(i + 50) - 0.5) * 100, y0 = -rnd(i + 90) * 100;
    const x = x0 + Math.sin(t * 2 + i) * 6 * k, y = y0 - k * (40 + rnd(i + 7) * 50);
    c.fillStyle = ['#FFE7A6', '#FFC6E4', '#DCCBFF', '#FFFFFF'][i % 4];
    star4(c, x, y, 2 + rnd(i + 3) * 3, Math.sin(k * Math.PI));
  }
}

// ───────────────────────── ซ้อนชั้น (จางทั้งตัว / กระพริบขาวตอนโดนตี) ─────────────────────────
const LAYERS = [];
function layer(n, cv) {
  let L = LAYERS[n];
  if (!L) { L = document.createElement('canvas'); LAYERS[n] = L; }
  if (L.width !== cv.width || L.height !== cv.height) { L.width = cv.width; L.height = cv.height; }
  return L;
}
function withLayer(ctx, n, alpha, flash, fn) {
  if (alpha >= 0.999 && flash <= 0.001) { fn(ctx); return; }
  if (alpha <= 0.001) return;
  const L = layer(n, ctx.canvas), c = L.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, L.width, L.height);
  c.setTransform(ctx.getTransform());
  fn(c);
  if (flash > 0) {
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-atop';
    c.fillStyle = `rgba(255,250,255,${flash})`; c.fillRect(0, 0, L.width, L.height);
    c.globalCompositeOperation = 'source-over';
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha *= alpha; ctx.drawImage(L, 0, 0); ctx.restore();
}

const EXPLODE = {
  body: [-10, 0], leaves: [-10, 0], face: [96, -36], flame: [96, -58],
  armL: [104, 30], armR: [128, 30], crystal: [122, 0],
};

/** วาดบอส · คืนค่าท่าที่ใช้ (ไว้โชว์ค่าในหน้าทดสอบ) */
export function drawStumpBoss(ctx, x, groundY, s, o = {}) {
  const state = o.state || 'idle', t = o.t || 0, st = o.st || 0;
  const P = stumpPose(state, st, t, o);
  if (o.turn != null) P.turn = o.turn;
  const g = geo(P.turn);
  const gaze = o.gaze ?? -1, e = o.explode || 0;
  const flash = o.hitT != null && o.hitT < 0.3 ? (1 - o.hitT / 0.3) * 0.75 : 0;
  const off = (k) => [EXPLODE[k][0] * e, EXPLODE[k][1] * e];
  const part = (c, k, fn) => { c.save(); const [dx, dy] = off(k); c.translate(dx, dy); fn(c); c.restore(); };

  ctx.save();
  ctx.translate(x, groundY);
  ctx.scale(s, s);
  const hk = clamp(1 - P.y / 60);
  ctx.fillStyle = `rgba(${COL.shadow},${(0.18 + 0.2 * hk) * P.fade})`;
  ctx.beginPath(); ctx.ellipse(P.x * (1 - e) + 4 * P.turn, 0, 46 * (0.75 + 0.25 * hk), 6.5, 0, 0, TAU); ctx.fill();
  const sh = P.shake ? [Math.sin(t * 61) * P.shake, Math.cos(t * 53) * P.shake * 0.6] : [0, 0];
  ctx.translate(P.x + sh[0], -P.y + sh[1]);
  ctx.translate(0, -50); ctx.rotate(P.rot * (1 - e)); ctx.translate(0, 50);
  ctx.scale(P.sx, P.sy);

  const H = hemGeo(g, t, P), body = bodyPath(g, H);
  withLayer(ctx, 0, P.fade, flash, (c) => {
    part(c, 'body', (c) => { drawBranch(c); drawUnder(c, H); drawBody(c, g, H, body, P.turn); });
    part(c, 'leaves', (c) => drawLeaves(c, t));
    part(c, 'face', (c) => drawFace(c, P, gaze, t, g));
    part(c, 'flame', (c) => drawFlame(c, P, t));
  });
  part(ctx, 'crystal', (c) => drawCrystal(c, P, o, t, g));
  withLayer(ctx, 1, P.fade, flash, (c) => {
    part(c, 'armL', (c) => hand(c, g.handL, P.armL, -1, e ? null : body));
    part(c, 'armR', (c) => hand(c, g.handR, P.armR, 1, e ? null : body));
  });
  drawBang(ctx, P, g);
  drawPuff(ctx, P, g);
  drawDissolve(ctx, P, t);
  ctx.restore();
  return P;
}
