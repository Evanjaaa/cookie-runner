// src/town/layout.js
// ─────────────────────────────────────────────────────────────
// ผังเมืองแมวเหมียว — ตำแหน่งทุกอย่าง + พื้นที่ยืนได้ (ชุดเดียวที่ภาพ world/bridge/play และฟิสิกส์ใน main ใช้ร่วมกัน)
//
// ขยายเมือง (ผู้ใช้ 31 ต.ค.): แม่น้ำคั่นกลางเมือง · สะพานไทยโค้งมีศาลากลาง (แต่งสไตล์ปราสาทแมวเหมียว) · เรือทางลัด
//   ฝั่งร้านค้า (ซ้าย): ร้านแลกของกิน ร้านขายยา ร้านอัปเกรด · ท่าเรือ · ลานน้ำพุ · สนามเด็กเล่น
//   ฝั่งปราสาท (ขวา): สวนดอกไม้ · ร้านของเล่น ร้านแลกของรางวัล · ท่าเรือ · ปราสาท
//   กระโดดขึ้นไปยืนบนของได้ (หลังคาร้าน กันสาด ม้านั่ง น้ำพุ ศาลา คอนโดแมว ...) — ดู SURFACES
//
// หน่วยโลก: สูง 420 (เท่าจอเกม) · เท้าน้องบนถนนอยู่ที่ GY · y มากขึ้น = ลงล่าง
// ─────────────────────────────────────────────────────────────

export const H = 420;
export const GY = 330;            // เส้นเท้าน้อง = ขอบหลังของถนน
export const ROAD_B = 382;        // ขอบหน้าถนน → คันหิน → แม่น้ำหน้าเมือง
export const DEPTH = ROAD_B - GY; // ความลึกของถนน/พื้นสะพาน (หลัง → หน้า)
export const WORLD_W = 5820;
export const START_X = 150;

// ── สะพาน ─────────────────────────────────────────────────────
// พื้นสะพานโค้งขึ้นจากถนนสองฝั่ง (ทางลาดนุ่ม smoothstep) แล้วราบตรงกลางที่ศาลาตั้ง · แม่น้ำลอดใต้ช่วง rx ± half
export const BRIDGE = { x0: 2820, x1: 3560, ramp: 250, rise: 88, rx: 3190, half: 150 };
export const DECK_Y = GY - BRIDGE.rise;   // ระดับพื้นศาลา (ยอดสะพาน)

/** สะพานยกพื้นสูงจากถนนเท่าไรตรง x (0 = ถนนปกติ) */
export function deckLift(x) {
  const { x0, x1, ramp, rise } = BRIDGE;
  if (x <= x0 || x >= x1) return 0;
  const u = x < x0 + ramp ? (x - x0) / ramp : x > x1 - ramp ? (x1 - x) / ramp : 1;
  return rise * u * u * (3 - 2 * u);
}
/** พื้นแข็งที่เดินได้ตลอด (ถนน + พื้นสะพาน) — ตกไม่ทะลุ */
export function groundY(x) { return GY - deckLift(x); }

// ศาลากลางสะพาน: เสา 4 คู่ · หลังคาไทยสองชั้น ชายคาล่างที่ eave · สันหลังคาราบ (ยืนได้)
const SX = BRIDGE.rx, EAVE = DECK_Y - 125;
export const SALA = {
  cx: SX, eave: EAVE,
  posts: [-96, -36, 36, 96],
  low: { w0: 140, w1: 100, rise: 25 },     // หลังคาชั้นล่าง: กว้างครึ่งหนึ่ง 140 ที่ชายคา → 100 ที่บน
  up: { w0: 104, w1: 62, top: EAVE - 55 }, // ชั้นบน: ฐาน 104 → สัน 62
};
// รูปปั้นแมวเฝ้าหัวสะพานสองฝั่ง
export const STATUES = [{ x: BRIDGE.x0 - 30, face: 1 }, { x: BRIDGE.x1 + 30, face: -1 }];

// ── สถานที่ ───────────────────────────────────────────────────
/**
 * kind: shop (เปิดหน้าร้านหมวด tab) · bench (นั่งพัก) · castle (ยังไม่เปิด) · deco (ตกแต่ง)
 *       pier (ท่าเรือ — ล่องเรือไป to) · swing (ชิงช้า) · box (กล่องกระดาษ มุดได้)
 * doorK = ประตูอยู่ที่สัดส่วนนี้ของความกว้าง (น้องยืนตรงนั้นแล้วใช้งาน) · gy = ระดับพื้นตรงประตู (ค่าเริ่มต้น GY)
 * sprite = ไฟล์ภาพแทนภาพวาด (ดูหัว world.js) · art: false = ภาพอยู่ในชิ้นอื่น (ตั่งในศาลา)
 */
export const PLACES = [
  // ── ฝั่งร้านค้า ──
  { id: 'food', kind: 'shop', tab: 'food', name: 'ร้านแลกของกิน', x: 300, w: 270, h: 255, doorK: 0.79, sprite: null },
  { id: 'care', kind: 'shop', tab: 'care', name: 'ร้านขายยา', x: 720, w: 235, h: 290, doorK: 0.76, sprite: null },
  { id: 'home', kind: 'shop', tab: 'home', name: 'ร้านอัปเกรดอุปกรณ์', x: 1105, w: 260, h: 270, doorK: 0.78, sprite: null },
  { id: 'pierA', kind: 'pier', name: 'ท่าเรือฝั่งร้านค้า', to: 'pierB', x: 1440, w: 120, h: 70, doorK: 0.5 },
  { id: 'bench1', kind: 'bench', name: 'ม้านั่ง', x: 1650, w: 72, h: 46 },
  { id: 'fountain', kind: 'deco', name: 'ลานกลางเมือง', x: 1760, w: 170, h: 150 },
  { id: 'bench2', kind: 'bench', name: 'ม้านั่ง', x: 1970, w: 72, h: 46 },
  { id: 'swing', kind: 'swing', name: 'ชิงช้า', x: 2330, w: 100, h: 156, doorK: 0.5 },
  { id: 'box', kind: 'box', name: 'กล่องกระดาษ', x: 2650, w: 70, h: 50, doorK: 0.5 },
  // ── บนสะพาน ──
  { id: 'bench3', kind: 'bench', name: 'ตั่งในศาลา', x: SX - 36, w: 72, h: 46, gy: DECK_Y, art: false },
  // ── ฝั่งปราสาท ──
  { id: 'toy', kind: 'shop', tab: 'toy', name: 'ร้านของเล่น', x: 4000, w: 270, h: 280, doorK: 0.77, sprite: null },
  { id: 'exchange', kind: 'shop', tab: 'exchange', name: 'ร้านแลกของรางวัล', x: 4420, w: 265, h: 270, doorK: 0.78, sprite: null },
  { id: 'pierB', kind: 'pier', name: 'ท่าเรือฝั่งปราสาท', to: 'pierA', x: 4780, w: 120, h: 70, doorK: 0.5 },
  { id: 'castle', kind: 'castle', name: 'ปราสาทแมวเหมียว', x: 5120, w: 540, h: 330, doorK: 0.5, sprite: null },
];
for (const p of PLACES) p.door = p.x + p.w * (p.doorK ?? 0.5);
export const placeById = (id) => PLACES.find((p) => p.id === id);

/** ตะเกียงริมถนน [x, มีธงห้อย] — เว้นหน้าประตูร้าน */
export const LAMPS = [[240, 1], [645, 0], [1030, 1], [1600, 0], [2120, 1], [2745, 0], [3640, 1], [4345, 0], [4745, 1]];
/** ของตกแต่งตามทาง [ชนิด, x] — ชนิดเดิม (world.js drawProp) + ชนิดใหม่ (play.js drawDeco) */
export const PROPS = [
  ['crate', 690], ['bush', 1068], ['sign', 2085], ['bush', 2290], ['cart', 2595],
  ['mailbox', 3932], ['pot', 4392], ['cart', 4960], ['bush', 5700], ['endarch', 5752],
];

// ── ของเล่น ───────────────────────────────────────────────────
export const TOWER = { x: 2200 };                    // คอนโดแมว (ปีนขึ้นชั้น ๆ ได้)
export const BLOCKS = { x: 3860 };                   // กองตัวต่อ ABC
export const ARCH = { x: 3680, w: 110 };             // ซุ้มดอกไม้ (ยืนบนโค้งได้)
export const TRAMPS = [{ id: 'trampA', x: 2510 }, { id: 'trampB', x: 5060 }];   // แทรมโพลีนหัวแมว เด้งสูง
export const TRAMP_V = 17.5;                         // แรงเด้ง (ต่อเฟรม) — สูง ~245 เกินกระโดดสองชั้น (แรงโน้มถ่วงคือ JUMP.gravity)

// ── กระโดดในเมือง (แยกจาก PHYSICS ของเกมวิ่ง — เกมวิ่งผูกกับระยะหลุม/แนวปลา ห้ามแตะ) ──
// ลอยนุ่มกว่าเกมวิ่ง เห็นตัวน้องลอยชัด · ชั้นแรก ~140 (ขึ้นกันสาดร้าน/ตะเกียงได้ทีเดียว) · สองชั้น ~220 (กำแพงปราสาท ยอดคอนโด สันหลังคาศาลา)
// ความสูงจริงต่อเฟรม ≈ v² / (2 × gravity) − v/2 (ชั้นแรก ~146 · กันสาดสูงสุด 132 ต้องเหลือเผื่อ)
export const JUMP = { gravity: 0.62, v1: -13.8, v2: -10 };
export const YARN = { x: 3780, r: 13, min: 3640, max: 3985 };   // ลูกไหมพรม (เดินชนแล้วกลิ้ง)

// ── แมวเจ้าของร้าน (NPC) — วางข้างร้านของตัวเอง ──
export const NPCS = [
  { skin: 'snow', x: 600, flip: true },        // ข้างร้านแลกของกิน
  { skin: 'midnight', x: 985, flip: true },    // ข้างร้านขายยา
  { skin: 'grey', x: 1393, flip: true },       // ข้างร้านอัปเกรดอุปกรณ์
  { skin: 'calico', x: 3970, flip: false },    // ข้างร้านของเล่น
  { skin: 'pearl', x: 4712, flip: true },      // ข้างร้านแลกของรางวัล
];

// ── พื้นที่ยืนได้ ─────────────────────────────────────────────
/**
 * ผิวที่กระโดดขึ้นไปยืนได้ — ทะลุขึ้นจากข้างล่างได้ ยืนบนผิวด้านบน (ลากจอยลง / กด ↓ = ลงผ่าน)
 * pts = จุดเรียงตาม x ([x, y] ต่อเป็นเส้นหัก ยืนบนเนินได้) · bounce = แทรมโพลีน (ลงแล้วเด้งขึ้นด้วยแรงนี้)
 * ตัวเลขทุกชุดตรงกับภาพใน world.js / bridge.js / play.js — แก้ภาพตรงไหนต้องแก้ตรงนี้ด้วย
 */
const flat = (id, x0, x1, y, o) => ({ id, pts: [[x0, y], [x1, y]], ...o });
/** ขอบบนวงรี (กลาง cx,cy รัศมี rx,ry) ช่วง u = a..b (−1 ซ้ายสุด · 1 ขวาสุด) */
function arcTop(id, cx, cy, rx, ry, a, b, n = 10) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = a + ((b - a) * i) / n;
    pts.push([cx + rx * u, cy - ry * Math.sqrt(Math.max(0, 1 - u * u))]);
  }
  return { id, pts };
}
/** เส้นโค้งกำลังสอง p0 → p2 (คุมด้วย p1) */
function quad(p0, p1, p2, n = 10) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
    pts.push([a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]]);
  }
  return pts;
}

function shopSurfaces(p) {
  const { x, w, id } = p, cx = x + w / 2;
  if (id === 'food') {
    // กันสาด → โดมขนมปัง (ส่วนที่ไม่ชันเกิน)
    return [flat('food:awn', x - 4, x + w + 4, GY - 132), arcTop('food:dome', cx, GY - 146, w / 2 + 6, 98, -0.8, 0.8, 14)];
  }
  if (id === 'care') {
    // หม้อปรุงยา → ปีกหมวกแม่มดสองข้าง (กรวยหมวกชันเกิน ยืนไม่ได้)
    const bx = cx + 6, rx = w / 2 + 12;
    return [
      flat('care:pot', x - 2, x + 38, GY - 38),
      arcTop('care:brimL', bx, GY - 156, rx, 16, -0.94, -0.6, 4),
      arcTop('care:brimR', bx, GY - 156, rx, 16, 0.6, 0.94, 4),
    ];
  }
  if (id === 'home') {
    // เตาหลอม → หลังคาจั่ว → ยอดปล่องไฟ · ถังไม้หน้าร้าน
    const fx = x + 52;
    return [
      arcTop('home:forge', fx, GY - 58, 34, 34, -0.7, 0.7, 6),
      { id: 'home:roof', pts: [[x - 10, GY - 156], [cx, GY - 262], [x + w + 10, GY - 156]] },
      flat('home:chim', x + 30, x + 66, GY - 258),
      flat('home:barrel', x + w - 16, x + w + 4, GY - 31),
    ];
  }
  if (id === 'toy') {
    // กันสาดลูกกวาด → หัวแมวยักษ์บนหลังคา
    return [flat('toy:awn', x + 10, x + w - 10, GY - 116), arcTop('toy:head', cx, GY - 182, 79, 60, -0.75, 0.75, 12)];
  }
  if (id === 'exchange') {
    // หีบสมบัติ → หลังคาเต็นท์ (ขึ้นได้ทั้งสองฝั่งถึงยอด)
    const wt = GY - 132, peak = GY - 245;
    const L = quad([x - 6, wt + 6], [cx - w * 0.2, wt - 40], [cx, peak]);
    const R = quad([cx, peak], [cx + w * 0.2, wt - 40], [x + w + 6, wt + 6]);
    return [flat('ex:chest', x - 10, x + 18, GY - 30), { id: 'ex:tent', pts: [...L, ...R.slice(1)] }];
  }
  return [];
}

function buildSurfaces() {
  const S = [];
  for (const p of PLACES) {
    if (p.kind === 'shop') S.push(...shopSurfaces(p));
    else if (p.kind === 'bench') {
      const y = p.gy ?? GY;
      S.push(flat(p.id + ':seat', p.x, p.x + p.w, y - 26));
      if (p.art !== false) S.push(flat(p.id + ':back', p.x + 2, p.x + p.w - 2, y - 50));
    } else if (p.id === 'fountain') {
      const cx = p.x + p.w / 2;
      S.push(flat('fnt:rim', cx - 86, cx + 86, GY - 44), flat('fnt:bowl', cx - 44, cx + 44, GY - 112), flat('fnt:cat', cx - 12, cx + 12, GY - 154));
    } else if (p.kind === 'castle') {
      // ป้าย "เปิดเร็ว ๆ นี้" → ป้ายชื่อเหนือประตู → ทางเดินบนกำแพงระหว่างหอคอย
      const { x, w } = p, cx = x + w / 2, y = GY - 176;
      S.push(
        flat('cas:sign', cx - 48, cx + 48, GY - 70), flat('cas:name', cx - 62, cx + 62, GY - 166),
        flat('cas:w1', x + 66, x + 92, y), flat('cas:w2', x + 150, cx - 62, y),
        flat('cas:w3', cx + 62, x + w - 150, y), flat('cas:w4', x + w - 92, x + w - 66, y),
      );
    } else if (p.kind === 'box') S.push(flat('box:top', p.x + 4, p.x + p.w - 4, GY - 44));
    else if (p.kind === 'swing') S.push(flat('swing:beam', p.x - 4, p.x + p.w + 4, GY - 156));
  }
  for (const [x] of LAMPS) S.push(flat('lamp:' + x, x - 9, x + 9, GY - 134));
  for (const [k, x] of PROPS) {
    if (k === 'crate') S.push(flat('crate:' + x, x - 22, x + 22, GY - 40), flat('crate2:' + x, x - 4, x + 26, GY - 70));
    else if (k === 'sign') S.push(flat('sign:' + x, x - 26, x + 28, GY - 56));
    else if (k === 'mailbox') S.push(flat('mail:' + x, x - 13, x + 13, GY - 64));
    else if (k === 'cart') S.push(flat('cart:' + x, x - 34, x + 30, GY - 46));
    else if (k === 'endarch') S.push(arcTop('end:' + x, x, GY - 100, 44, 44, -0.7, 0.7, 6));
  }
  // ซุ้มทางเข้าเมือง (ป้ายบนสุด)
  S.push(flat('welcome', 16, 194, GY - 176));
  // สะพาน: ศาลา (ชายคาล่าง → ชั้นบน → สัน) + รูปปั้นแมวเฝ้าหัวสะพาน
  const { low, up, eave } = SALA;
  S.push({ id: 'sala:roof', pts: [
    [SX - low.w0, eave], [SX - low.w1, eave - low.rise], [SX - up.w1, up.top],
    [SX + up.w1, up.top], [SX + low.w1, eave - low.rise], [SX + low.w0, eave],
  ] });
  for (const s of STATUES) S.push(flat('stat:' + s.x, s.x - 21, s.x + 21, GY - 40), flat('stat:h' + s.x, s.x - 11, s.x + 11, GY - 116));
  // ของเล่น
  const t = TOWER.x;
  S.push(
    flat('tw:1', t - 44, t + 6, GY - 48), flat('tw:2', t - 6, t + 46, GY - 96),
    flat('tw:3', t - 42, t + 8, GY - 144), flat('tw:top', t - 22, t + 22, GY - 186),
  );
  const b = BLOCKS.x;
  S.push(flat('blk:1', b - 45, b + 45, GY - 30), flat('blk:2', b - 30, b + 30, GY - 60), flat('blk:3', b - 15, b + 15, GY - 90));
  S.push(arcTop('arch', ARCH.x + ARCH.w / 2, GY - 96, ARCH.w / 2, 56, -0.8, 0.8, 8));
  for (const tr of TRAMPS) S.push(flat(tr.id, tr.x - 30, tr.x + 30, GY - 24, { bounce: TRAMP_V }));
  for (const s of S) { s.x0 = s.pts[0][0]; s.x1 = s.pts[s.pts.length - 1][0]; }
  return S;
}
export const SURFACES = buildSurfaces();

/** ความสูงผิว s ตรง x (null = ไม่อยู่ในช่วงผิว) */
export function surfY(s, x) {
  if (x < s.x0 || x > s.x1) return null;
  const P = s.pts;
  for (let i = 1; i < P.length; i++) {
    if (x <= P[i][0]) {
      const [ax, ay] = P[i - 1], [bx, by] = P[i];
      return bx === ax ? Math.min(ay, by) : ay + ((by - ay) * (x - ax)) / (bx - ax);
    }
  }
  return P[P.length - 1][1];
}
