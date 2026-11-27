/**
 * บอสตัวแรก: ภูตตอไม้ "ผู้เฝ้าคริสตัลแห่งป่าแมว" (แบบจากผู้ใช้ 17 พ.ย. 2026 · ภาพใน docs/boss-stump/1-main.jpg)
 * วาดสดด้วยโค้ดทั้งตัว นูนด้วยไล่สี/แสงเงาในเนื้อ
 * เส้นขอบตัดสีหมึกรอบแต่ละชิ้น (ตัว · ขอบนอกผลึก · แขน · ไม่มีเส้น: เปลวบนหัว น้องในผลึก ประกาย) — ผู้ใช้ขอ 27 พ.ย. ให้เข้ากับน้องแมว (ink-outline.js · ปิดได้ด้วย o.ink = false)
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
 *   o.look สีน้องที่หลุดออกมาตอนผลึกแตก (คีย์ของ CHIBI_LOOKS · ในผลึกเห็นเป็นเงา ไม่บอกสี) · o.explode 0–1 แยกชิ้น
 * ทุกอย่างคิดจากเวลาอย่างเดียว → ลากเวลาย้อนกลับได้ภาพเดิมเป๊ะ
 */
import { drawChibi } from '../chibi.js';
import { INK, inkFilter, inkPx, screenBox, blitInk } from '../ink-outline.js';

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
  defeat: { name: 'แพ้',            em: '💥', note: 'จ้องแค้น รอยแสงแตก → ผลึกระเบิด ปล่อยน้อง → ตัวกลายเป็นแสงสลาย → น้องตื่นร้องเหมียว', dur: 6.4 },
  // ── ท่าโจมตีตามชีตแบบ docs/boss-stump/4-sheet.jpg (ผู้ใช้ 22 พ.ย.: "อัปเกรดทุกอย่างของมอนสเตอร์") ──
  // ทุกท่า = ช่วงเตือน (o.warnT วิ ตาแดง/ย่อร่าง ให้รู้ล่วงหน้า) → ปล่อยของ → คืนท่า · หน้าเกมใช้เวลาชุดเดียวกัน (STUMP_ACT)
  enter:  { name: 'เปิดตัว',          em: '🎬', note: 'ตกลงจากฟ้า กระแทกพื้นฝุ่นฟุ้ง เด้งขึ้นลอย แล้วคำรามขู่', dur: 2.4 },
  cast:   { name: 'ปาเวทคริสตัล',     em: '🔮', note: 'ชูผลึก วงเวทเรืองขึ้นหน้าผลึก แล้วยิงลูกแสงทีละลูก (ต่ำ = กระโดด · กลาง = หมอบ · สูง = อยู่เฉย)', dur: 3.2 },
  burst:  { name: 'ระเบิดพลัง',       em: '💥', note: 'ตาหยี >< กอดผลึกแน่น ดูดแสงเข้าตัว แล้วระเบิดเป็นวงคลื่นพื้น (กระโดดข้าม)', dur: 2.8 },
  charge: { name: 'พุ่งชน',           em: '💨', note: 'ถอยตั้งหลัก เอนหลัง ตาแดง แล้วพุ่งเอนหน้าทิ้งหมอกม่วงยาว (หมอบลอดใต้ตัว)', dur: 3.2 },
  shield: { name: 'เรียกหินป้องกัน',  em: '🛡️', note: 'หลับตารวมพลัง สร้างเกราะผลึกรอบตัว แล้วเกราะแตกเป็นฝนผลึกปักพื้น (กระโดดข้าม)', dur: 3.6 },
  fog:    { name: 'หมอกหลับใหล',      em: '💤', note: 'สูดลมพองตัว หลับตา แล้วเป่าหมอกม่วง (โดนแล้วง่วง กระโดดเตี้ยลง)', dur: 3.2 },
};
export const WARN_TIME = 1.0;
/** ท่าแพ้ (วินาทีในท่า): ผลึกแตก · เริ่มสลาย · สลายหมด + น้องลงพื้น · น้องตื่น · จบ — หน้าเกมใช้จังหวะเดียวกัน (สั่นจอ / โชว์การ์ดชนะ) */
// melt 2.05 (เดิม 2.5): ผู้ใช้ 22 พ.ย. "แสงไหลผ่านจบแล้วมอนส์ถึงหายวาป" → เริ่มสลายทันทีที่ผลึกระเบิด ตัวกลายเป็นแสงไปพร้อมแสงระเบิด
export const STUMP_DEFEAT = { shatter: 1.9, melt: 2.05, free: 4.7, wake: 4.95, done: 6.2 };
/** จังหวะของแต่ละท่า (วินาทีหลังช่วงเตือน) — หน้าเกมปล่อยของตามนี้ ท่าทางบอสจะตรงกับของที่ออกมา */
export const STUMP_ACT = {
  cast: { gap: 0.5, tail: 0.8 },             // ลูกแสงทุก gap วิ (0.5 = กระโดดลูกต่ำแล้วลงพื้นทันลูกสูงถัดไป) · จำนวน = o.n
  burst: { gap: 0.55, tail: 1.0 },           // วงคลื่นทุก gap วิ · จำนวน = o.n
  charge: { dash: 1.1, back: 1.0 },          // พุ่ง dash วิ (หน้าเกมเลื่อนตัวเอง) แล้วกลับเข้าฉาก
  shield: { form: 0.5, hold: 0.9, tail: 1.2 },   // เกราะก่อตัว → ค้าง → แตก (= ฝนผลึก)
  fog: { gap: 0.45, tail: 1.2 },             // พ่นหมอกทุก gap วิ · จำนวน = o.n
};

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

// ── ท่าแพ้: เส้นสลาย (ขอบล่างของส่วนที่ยังเหลือ) ไต่จากใต้ชายผ้าขึ้นไปเหนือเปลว ──
const MELT_FROM = 8, MELT_TO = -134;
// ความเร็วเส้นสลายเกือบคงที่ (เดิม ease เต็ม = ช่วงกลางพุ่งเร็ว กวาดทั้งตัวใน ~0.4 วิ ดูเหมือนหายวาป)
const meltK = (d) => 0.8 * clamp(d) + 0.2 * ease(d);
const meltEdge = (d) => lerp(MELT_FROM, MELT_TO, meltK(d));
/** วินาทีในท่าแพ้ที่เส้นสลายขึ้นถึงความสูง y (หาย้อนจาก meltK) */
function meltTimeAt(y) {
  const want = (MELT_FROM - y) / (MELT_FROM - MELT_TO);
  let a = 0, b = 1;
  for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (meltK(m) < want) a = m; else b = m; }
  return STUMP_DEFEAT.melt + a * (STUMP_DEFEAT.free - STUMP_DEFEAT.melt);
}
const FLAME_POP_AT = meltTimeAt(-STUMP.flameY + 6);
/** น้องที่หลุดจากผลึก (พิกัดพื้น หน่วยบอส): ลอยเด้งขึ้นในฟองแสง → ลอยนิ่ง → ค่อย ๆ ลงพื้น → ฟองแตก → ตื่น */
function freedKitten(s) {
  const D = STUMP_DEFEAT;
  if (s < D.shatter) return null;
  const v = s - D.shatter, y0 = -38, y1 = -56, down = D.free - 0.85;
  const bobAt = (vv) => y1 + Math.sin((vv - 0.5) * 2.6) * 2.2;
  let y;
  if (v < 0.5) y = lerp(y0, y1, 1 - (1 - v / 0.5) ** 3);
  else if (s < down) y = bobAt(v);
  else y = lerp(bobAt(down - D.shatter), 0, ease((s - down) / 0.85));
  const landed = s >= D.free;
  return { x: -1, y, v, grow: lerp(1, 1.15, clamp(v / 0.5)), pop: landed ? s - D.free : -1, awake: s >= D.wake ? s - D.wake : -1 };
}

// ───────────────────────── ท่าทาง ─────────────────────────
/** arm = ค่าเพิ่มจากตำแหน่งตั้งต้นของมุมนั้น { dx, dy, r (+ = ง้างออกด้านนอก) } */
export function stumpPose(state, st, t, o = {}) {
  const P = {
    y: STUMP.hover, x: 0, sx: 1, sy: 1, rot: 0, shake: 0, turn: 1,
    armL: { dx: 0, dy: 0, r: 0 }, armR: { dx: 0, dy: 0, r: 0 },
    eyes: 'angry', lid: 0, mouth: 'frown', mouthOpen: 0,
    flame: 0.6, bang: 0, fade: 1, rays: 0, crystalUp: 0, puff: -1, dissolve: 0, crackMin: 0,
    flow: 1, hemLift: 0,   // ชายผ้า: แรงพลิ้ว · ลอนห้อยลง(+)/บานขึ้น(-)
    // เอฟเฟกต์ท่าโจมตี (0 = ไม่มี) — วาดใน drawStumpBoss
    crystalPush: 0, magic: 0, cast: 0, gather: 0, ring: -1, burstFlash: 0, trail: 0,
    dome: 0, domeBreak: -1, fog: 0, fogPuff: -1, land: -1, roar: 0, rage: 0,
    cryX: 0, cryY: 0, cryRot: 0, magicAt: null, vein: 0,
    // ท่าแพ้
    bodyCrack: 0, cryScale: 1, cryWhite: 0, cryJit: 0, shatter: -1, dEdge: null, glowRing: 0, flamePop: -1, kit: null,
  };
  const W = o.warnT ?? WARN_TIME, A = STUMP_ACT;
  // ท่าโจมตี (ผู้ใช้ 22 พ.ย.: "ถือผลึกไปด้วยแล้วปล่อยพลังดูแปลก ให้ปล่อยมือข้างนึง ยื่นแขนให้ชัด"):
  // มือขวาประคองผลึกไว้ข้างเดียว (ผลึกเอียงพิงมือขวา) · มือซ้ายปล่อยจากผลึก ยื่นแขนออกไปทำท่า
  // k = ยื่นแค่ไหน 0..1 · to = ตำแหน่งอุ้งมือ · sh = โคนแขน (ไหล่ขอบตัว) · glow = อุ้งมือเรืองพลัง
  const freeL = (k, to, sh, glow = 0) => {
    P.armL = { dx: 0, dy: 0, r: 0, reach: k, to, sh, glow };
    P.armR = { dx: 4 * k, dy: 3 * k, r: 0 };
    P.cryX = 3 * k; P.cryY = 1.5 * k; P.cryRot = 0.07 * k;
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
      freeL(k, [-54, -60], [-45, -50], 0.5 * k);
      P.bang = ph > 0.08 ? pop((ph - 0.08) / 0.3) : 0;
      P.lid = 0.25 * k;
      P.flow = 1 - 0.4 * k; P.hemLift = -2.6 * k;          // ย่อตัว → ชายบานออก
    } else if (ph < W + 0.3) {             // ปล่อย: ยืดตัวพุ่งไปทางซ้าย
      const k = ease((ph - W) / 0.3);
      P.sx = lerp(1.1, 0.9, k); P.sy = lerp(0.87, 1.12, k);
      P.x = -9 * k; P.rot = lerp(-0.05, 0.04, k);
      freeL(1, [lerp(-54, -63, k), lerp(-60, -44, k)], [lerp(-45, -48, k), lerp(-50, -44, k)], 0.5);
      P.bang = 1 - k; P.lid = 0.25;
      P.flow = lerp(0.6, 2, k); P.hemLift = lerp(-2.6, 3.2, k);   // พุ่ง → ชายสะบัดตามหลัง
    } else {                               // คืนท่า
      const k = ease((ph - W - 0.3) / (L - W - 0.3));
      P.sx = lerp(0.9, 1, k); P.sy = lerp(1.12, 1, k);
      P.x = -9 * (1 - k); P.rot = 0.04 * (1 - k);
      freeL(1 - k, [-63, -44], [-48, -44]);
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
    // ท่าแพ้ (ผู้ใช้ 22 พ.ย.: "อัปเกรดให้อลังเลิศเลอ"):
    // สะท้านเจ็บ → หันหน้าตรง ลอยขึ้น รอยแสงแตกทั่วตัว ผลึกหลุดมือ สั่นเรืองจนขาว →
    // ผลึกระเบิดเป็นเศษคริสตัล ปล่อยน้องในฟองแสง → ตัวค่อย ๆ กลายเป็นแสงและสลายจากชายผ้าขึ้นไปถึงเปลวทันที (ใบไม้ร่วง เปลวแตกเป็นดาว) →
    // น้องค่อย ๆ ลอยลงพื้น ฟองแตก ตื่นขึ้นมาร้องเหมียว
    // สีหน้า (ผู้ใช้ 22 พ.ย.: ไม่เอาหน้าตกใจ — "โกรธอยู่แต่เครียดแค้นว่าแพ้แล้ว"):
    //   เจ็บหยีตา อ้าปาก → จ้องเขม็งแค้น ตาดำเล็กสั่น เส้นเลือดปูด เหงื่อ หน้ามืดครึ้ม →
    //   ผลึกแตก: หยีตาน้ำตาเล็ดด้วยความแค้น → จ้องแค้นทั้งน้ำตาจนตัวสลายหายไป
    const s = st, D = STUMP_DEFEAT;
    P.crackMin = 3; P.turn = 1 - ease((s - 0.45) / 0.65);
    // ปาก: อ้านิด ๆ แบบตอนโกรธตาแดง (ผู้ใช้ 22 พ.ย.: ปากกัดฟันคว่ำดูแปลก) · เจ็บ/น้ำตาเล็ด = อ้ากว้างขึ้น · สั่นระริกตลอด
    P.mouth = 'open'; P.vein = 1; P.angryBrow = 1;
    P.mouthOpen = (s < 0.45 || (s >= D.shatter && s < D.shatter + 0.55) ? 0.55 : 0.3) + 0.08 * Math.sin(t * 31);
    P.eyes = s < 0.45 || (s >= D.shatter && s < D.shatter + 0.55) ? 'squeeze' : 'grudge';
    P.gloom = s < 0.45 ? 0 : clamp((s - 0.45) / 0.5);
    P.sweat = s >= 0.6 && s < D.shatter ? s - 0.6 : -1;
    P.tear = s >= D.shatter ? s - D.shatter : -1;
    if (s < 0.45) {                        // สะท้านจากโดนตีครั้งสุดท้าย
      const k = s / 0.45, j = Math.sin(k * Math.PI);
      P.shake = 3.4 * (1 - k) + 0.5; P.x = 9 * Math.sin((Math.min(1, k * 2.5) * Math.PI) / 2) * (1 - ease(k));
      P.sy = 1 - 0.1 * j; P.sx = 1 + 0.08 * j; P.rot = 0.1 * j;
      P.armL = { dx: -3, dy: -5 * j, r: 0.4 * j }; P.armR = { dx: 3, dy: -5 * j, r: 0.4 * j };
      P.cryJit = 1.2; P.flow = 1.8; P.hemLift = -2 * j; P.flame = 0.9;
    } else if (s < D.shatter) {            // พลังทะลักจากข้างใน: ลอยขึ้น รอยแสงแตกลาม ผลึกหลุดมือ สั่นแรงขึ้นจนขาว
      const u = (s - 0.45) / (D.shatter - 0.45), e = ease(u), e2 = ease(u / 0.5);
      P.y = STUMP.hover + 8 * e; P.sx = 1 - 0.04 * e; P.sy = 1 + 0.05 * e;
      P.shake = 0.5 + 2.4 * u * u; P.bodyCrack = ease(u / 0.85); P.rays = 0.85 * e;
      P.cryY = 5 * e; P.cryScale = 1 + 0.14 * e; P.cryJit = 0.8 + 1.6 * u; P.cryWhite = clamp((u - 0.68) / 0.32);
      P.armL = { dx: -4 * e2, dy: 4 * e2, r: 0.3 * e2 }; P.armR = { dx: 5 * e2, dy: 4 * e2, r: 0.3 * e2 };
      P.flow = 1.6; P.hemLift = -2.5 * e; P.glowRing = e; P.flame = 0.9;
    } else {                               // ผลึกแตก → เซ → สลายจากล่างขึ้นบน
      const v = s - D.shatter, q = Math.sin(clamp(v / 0.3) * Math.PI) * Math.max(0, 1 - v / 0.7), fl = clamp(v / 0.4);
      const d = clamp((s - D.melt) / (D.free - D.melt));
      P.shatter = v; P.dissolve = d;
      if (d > 0) P.dEdge = meltEdge(d);
      P.y = STUMP.hover + 8 - 4 * clamp(v / 0.7) + 6 * d;
      P.sy = 1.05 - 0.18 * q - 0.03 * d; P.sx = 0.96 + 0.16 * q + 0.02 * d;
      P.shake = Math.max(0.7, 3 * (1 - v / 0.7)) * (1 - 0.7 * d);   // สั่นเกร็งด้วยความแค้นจนหายไป
      P.rot = -0.06 * Math.sin(v * TAU) * Math.max(0, 1 - v);
      P.bodyCrack = 1 + 0.6 * Math.max(0, 1 - v / 0.6) + 0.5 * d;    // แสงทะลักจากรอยแตกมากขึ้นเรื่อย ๆ ระหว่างสลาย
      // ตัวที่ยังเหลือค่อย ๆ สว่างขึ้นเป็นแสงและจางลง → ไม่มีจังหวะ "ตัวทึบอยู่ดี ๆ แล้วหายวับ"
      P.lightUp = 0.12 * clamp(v / 0.15) + 0.55 * ease(d); P.fade = 1 - 0.35 * ease(d);
      P.armL = { dx: -4 - 2 * q, dy: lerp(4, 9, fl) - 6 * q, r: lerp(0.3, -0.3, fl) + 0.5 * q };
      P.armR = { dx: 5 + 2 * q, dy: lerp(4, 9, fl) - 6 * q, r: lerp(0.3, -0.3, fl) + 0.5 * q };
      P.flow = 1.4; P.hemLift = lerp(-2.5, 1, fl); P.glowRing = 1 - 0.6 * d; P.flame = 0.8 + 0.4 * q;
      if (s >= FLAME_POP_AT) P.flamePop = s - FLAME_POP_AT;
      if (s >= D.free) P.fade = 0;
    }
    P.kit = freedKitten(s);
  } else if (state === 'enter') {
    // 0–0.55 ตกจากฟ้า · กระแทกพื้น ฝุ่นฟุ้ง · เด้งขึ้นลอย · 1.15 วิ คำรามขู่ (ตาแดง ปากอ้า สั่น แขนกาง)
    if (st < 0.55) {
      const k = st / 0.55;
      P.y = lerp(240, 1, k * k); P.sx = 0.9; P.sy = 1.12; P.flow = 2; P.hemLift = -3.5;
      P.armL = { dx: -3, dy: -7, r: 0.4 }; P.armR = { dx: 3, dy: -7, r: 0.4 };
    } else if (st < 1.15) {
      const k = (st - 0.55) / 0.6, sq = Math.sin(clamp(k / 0.32) * Math.PI) * (1 - k);
      P.y = lerp(1, STUMP.hover, ease(k)); P.sx = 1 + sq * 0.24; P.sy = 1 - sq * 0.26;
      P.land = k; P.flow = 1.8; P.hemLift = 3 * (1 - k); P.lid = sq * 0.5;
    } else {
      const k = clamp((st - 1.15) / 1.05), roar = Math.sin(k * Math.PI);
      P.y += Math.sin((t / 2.4) * TAU) * 2 * bob;
      P.eyes = roar > 0.15 ? 'rage' : 'angry'; P.mouth = 'open'; P.mouthOpen = roar;
      P.shake = roar * 2.2; P.sx = 1 + roar * 0.05; P.sy = 1 + roar * 0.04; P.roar = roar;
      freeL(ease(clamp(k * 3)) * (k < 0.8 ? 1 : 1 - (k - 0.8) / 0.2), [-56, -68 - roar * 3], [-45, -56]);
      P.bang = k > 0.05 ? pop((k - 0.05) / 0.4) : 0; P.flame = 0.6 + roar * 0.5; P.flow = 1 + roar;
    }
  } else if (state === 'cast') {
    const n = o.n ?? 3, gap = A.cast.gap, rel = st - W;
    P.y += Math.sin((t / 2.4) * TAU) * 2 * bob;
    P.eyes = 'rage'; P.flame = 0.8;
    if (rel < 0) {                         // ชูผลึกไปข้างหน้า · วงเวทโตขึ้น · หมุนตัวเล็กน้อย
      const k = ease(st / W);
      P.rot = 0.05 * k + Math.sin(st * 9) * 0.012 * k; P.sy = 1 + 0.03 * k; P.sx = 1 - 0.02 * k;
      freeL(k, [-62, -46], [-48, -44], k);
      P.magic = k; P.magicAt = [-76, -46]; P.shake = k * 0.6;
      P.bang = st > 0.08 ? pop((st - 0.08) / 0.3) : 0;
    } else if (rel < n * gap) {            // ยิงทีละลูก: ผลึกกระตุกไปหน้า + แสงวาบ
      const ph = (rel % gap) / gap, kick = Math.sin(clamp(ph / 0.35) * Math.PI) * (1 - ph);
      P.magic = 1; P.cast = Math.max(0, 1 - ph * 2.5);
      P.x = kick * 2.5; P.rot = 0.03 - 0.04 * kick;
      freeL(1, [-62 - kick * 3, -46], [-48, -44], 1);
      P.magicAt = [-76 - kick * 3, -46];
      P.sx = 1 + kick * 0.04; P.sy = 1 - kick * 0.04;
    } else {                               // คืนท่า
      const k = ease((rel - n * gap) / A.cast.tail);
      P.magic = 1 - k; P.rot = 0.03 * (1 - k);
      freeL(1 - k, [-62, -46], [-48, -44], 1 - k);
      P.magicAt = [-76, -46];
      if (k > 0.4) P.eyes = 'angry';
    }
  } else if (state === 'burst') {
    const n = o.n ?? 1, gap = A.burst.gap, rel = st - W;
    if (rel < 0) {                         // ดูดพลัง: ตาหยี >< ย่อตัวเกร็ง กอดผลึกแน่น ประกายพุ่งเข้าผลึก
      const k = ease(st / W);
      P.eyes = 'squeeze'; P.mouth = 'grit';
      P.sx = 1 + 0.08 * k; P.sy = 1 - 0.1 * k; P.y = STUMP.hover - 5 * k;
      P.shake = 0.5 + k * 1.6; P.flow = 1 - 0.5 * k; P.hemLift = -2 * k;
      P.armL = { dx: 3 * k, dy: 2 * k, r: -0.2 * k }; P.armR = { dx: -3 * k, dy: 2 * k, r: -0.2 * k };
      P.gather = k; P.flame = 0.7 + 0.5 * k;
    } else if (rel < n * gap + 0.25) {     // ปล่อย: ตัวพองยืด แขนกาง วาบแสง (ทุกวงคลื่น)
      const ph = (rel % gap) / gap, k = ease(clamp(rel / 0.18)), pulse = Math.max(0, 1 - ph * 2.2);
      P.eyes = 'rage'; P.mouth = 'open'; P.mouthOpen = 0.9;
      P.sx = lerp(1.08, 0.94, k) + pulse * 0.06; P.sy = lerp(0.9, 1.1, k) - pulse * 0.03; P.y = STUMP.hover + 3 * k;
      freeL(ease(clamp(rel / 0.14)), [-58 - pulse * 2, -68 - pulse * 2], [-46, -56], 0.6 + pulse * 0.4);
      P.ring = rel < n * gap ? ph : -1; P.burstFlash = pulse; P.flame = 1.2; P.shake = pulse * 2.5;
      P.flow = 2.2; P.hemLift = -3;
    } else {
      const k = ease((rel - n * gap - 0.25) / A.burst.tail);
      P.sx = lerp(0.94, 1, k); P.sy = lerp(1.1, 1, k); P.y = STUMP.hover + 3 * (1 - k);
      freeL(1 - k, [-58, -68], [-46, -56], 0.6 * (1 - k));
      P.eyes = k < 0.5 ? 'rage' : 'angry'; P.mouth = k < 0.4 ? 'open' : 'frown'; P.mouthOpen = 0.6 * (1 - k);
      P.flow = lerp(2, 1, k);
    }
  } else if (state === 'charge') {
    const dash = A.charge.dash, rel = st - W;
    P.eyes = 'rage';
    if (rel < 0) {                         // ถอยตั้งหลัก: เอนหลัง ย่อ หมุนตัวสั่น ชายผ้าสะบัด
      const k = ease(st / W);
      P.rot = 0.14 * k + Math.sin(st * 22) * 0.015 * k; P.sx = 1 + 0.06 * k; P.sy = 1 - 0.08 * k;
      P.y = STUMP.hover + 4 * k; P.shake = k;
      freeL(0.75 * k, [-52, -58], [-45, -48]);
      P.flow = 1 + k; P.hemLift = -2 * k; P.mouth = 'grit';
      P.bang = st > 0.08 ? pop((st - 0.08) / 0.3) : 0;
    } else if (rel < dash) {               // พุ่ง: เอนหน้า ยืดยาว ทิ้งหมอกม่วง (ลอยสูงพอให้หมอบลอด)
      const k = ease(clamp(rel / 0.15));
      P.rot = lerp(0.14, -0.2, k); P.sx = lerp(1.06, 1.16, k); P.sy = lerp(0.92, 0.9, k);
      P.y = STUMP.hover + 4; P.trail = k; P.flow = 2.4; P.hemLift = 3.2;
      const pk = ease(clamp(rel / 0.12));
      freeL(lerp(0.75, 1, pk), [lerp(-52, -64, pk), lerp(-58, -42, pk)], [lerp(-45, -49, pk), lerp(-48, -44, pk)], 0.35);
      P.mouth = 'open'; P.mouthOpen = 0.5;
    } else {                               // กลับเข้าฉาก: เบรกเอนหลัง แล้วคืนท่า
      const k = ease((rel - dash) / A.charge.back);
      P.rot = lerp(0.12, 0, k); P.sx = lerp(0.95, 1, k); P.sy = lerp(1.05, 1, k);
      P.trail = Math.max(0, 0.6 - k); P.flow = lerp(2, 1, k); P.hemLift = -2.5 * (1 - k);
      freeL(1 - k, [-64, -42], [-49, -44]);
      if (k > 0.5) P.eyes = 'angry';
    }
  } else if (state === 'shield') {
    const { form, hold } = A.shield, rel = st - W;
    P.y += Math.sin((t / 2.4) * TAU) * 2 * bob;
    P.eyes = 'focus'; P.mouth = 'grit'; P.vein = 1;
    if (rel < 0) {                         // หลับตาปี๋รวมพลัง ยกแขน ผลึกเรือง (เกร็ง สั่นนิด ๆ)
      const k = ease(st / W);
      freeL(k, [-54, -68], [-45, -56], k);
      P.gather = k * 0.6; P.y += 3 * k; P.shake = 0.5 * k; P.vein = ease(clamp(st / 0.3));
    } else if (rel < form + hold) {        // เกราะผลึกก่อตัว แล้วค้าง (หินผลึกโคจรรอบตัว)
      P.dome = ease(rel / form); P.y += 3 + Math.sin(rel * 5);
      freeL(1, [-54, -68 + Math.sin(rel * 5) * 1.2], [-45, -56], 1);
    } else {                               // เกราะแตก = ฝนผลึก · ลืมตาโกรธ
      const k = rel - form - hold;
      P.domeBreak = clamp(k / 0.7); P.shake = Math.max(0, 1.6 - k * 3);
      P.eyes = k < 0.6 ? 'rage' : 'angry'; P.mouth = k < 0.6 ? 'open' : 'frown'; P.mouthOpen = 0.6; P.vein = Math.max(0, 1 - k * 2);
      const b = ease(k / 0.7);
      const sw = ease(clamp(k / 0.25));
      freeL(1 - ease(clamp((k - 0.35) / 0.6)), [lerp(-54, -64, sw), lerp(-68, -54, sw)], [lerp(-45, -48, sw), lerp(-56, -48, sw)], 1 - sw * 0.6);
      P.y += 3 * (1 - b);
    }
  } else if (state === 'fog') {
    const n = o.n ?? 2, gap = A.fog.gap, rel = st - W;
    P.eyes = 'focus';
    if (rel < 0) {                         // สูดลม: พองตัว เอนหลังนิด
      const k = ease(st / W);
      P.sx = 1 + 0.07 * k; P.sy = 1 + 0.05 * k; P.rot = 0.05 * k; P.mouth = 'puff';
      freeL(0.85 * k, [-47, -54], [-44, -45]); P.fog = k * 0.5;
    } else if (rel < n * gap + 0.3) {      // เป่า: ปากกลม ยุบตัวทีละพัฟ หมอกพวยพุ่ง
      const ph = (rel % gap) / gap, puff = Math.sin(clamp(ph / 0.5) * Math.PI);
      P.mouth = 'o'; P.mouthOpen = 0.6 + puff * 0.4; P.eyes = 'angry'; P.lid = 0.42;   // ตาหรี่จ้องน้อง
      P.sx = 1.05 - puff * 0.06; P.sy = 1.04 - puff * 0.06; P.rot = 0.02 - 0.05 * puff; P.fog = 1;
      P.fogPuff = rel < n * gap ? ph : -1; P.x = -puff * 1.5;
      const pk = ease(clamp(rel / 0.2));
      freeL(lerp(0.85, 1, pk), [lerp(-47, -62, pk) - puff * 3, lerp(-54, -50, pk)], [lerp(-44, -48, pk), lerp(-45, -46, pk)], 0.3);
    } else {
      const k = ease((rel - n * gap - 0.3) / A.fog.tail);
      P.fog = 1 - k; P.sx = lerp(1.02, 1, k); P.sy = lerp(1.01, 1, k);
      freeL(1 - k, [-62, -50], [-48, -46]);
      P.eyes = 'angry'; P.lid = 0.42 * (1 - k); P.mouth = k < 0.7 ? 'smirk' : 'frown';
    }
  }
  // เฟสโกรธ (หน้าเกมส่ง o.rage เมื่อผลึกร้าว 2 ครั้ง): ออร่าชมพูแดง เปลวใหญ่ขึ้น
  if (o.rage && state !== 'defeat') { P.rage = 1; P.flame = P.flame * 1.2 + 0.15; }
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
const LEAVES = [[-24, -103, -2.55, 16, 8], [27, -103, -0.5, 16, 8], [29, -84, 0.2, 12, 6], [54, -80, 0.6, 13, 6.5], [49, -102, -1.2, 9, 4.5]];
const LEAF_DROP = LEAVES.map(([, y]) => meltTimeAt(y + 5));   // วินาทีในท่าแพ้ที่ใบนี้หลุด
function drawLeaves(c, t, P) {
  LEAVES.forEach(([x, y, a, len, w], i) => {
    if (P.dEdge != null && P.dEdge < y + 5) return;   // หลุดแล้ว (วาดเป็นใบร่วงใน drawDefeatFx)
    leaf(c, x, y, a + Math.sin(t * 2.2 + i * 1.9) * 0.09, len, w);
  });
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
  const innS = side < 0 ? 1 : -1;
  if (P.eyes === 'squeeze') {              // ตาหยี >< (ซ้าย > · ขวา <) ปลายชี้เข้าหาจมูก
    c.strokeStyle = COL.ink; c.lineWidth = 3.6; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-5.5 * innS, -5); c.lineTo(4.5 * innS, 0.5); c.lineTo(-5.5 * innS, 5.5); c.stroke();
    if (P.angryBrow) {                     // คิ้วขมวดกดหัวคิ้ว (เจ็บแต่ยังโกรธ ไม่ใช่ร้องไห้อ่อนแอ)
      c.lineWidth = 4.6; c.beginPath(); c.moveTo(7.5 * innS, -8); c.lineTo(-9 * innS, -14.5); c.stroke();
    }
    c.restore(); return;
  }
  if (P.eyes === 'focus') {                // หลับตาปี๋ เกร็งรวมพลัง (ผู้ใช้ 22 พ.ย.: หลับตาแบบเดิมดูสงบไป)
    // คิ้วโกรธเอียงเดิม (หัวคิ้วกดต่ำ) · เส้นตาปิดโค้งลงเอียงตามคิ้ว · ไม่มีขีดใต้ตา (ผู้ใช้: ดูเป็นขนตา)
    const A = [8 * innS, -2.6], B = [-8 * innS, -8.6];
    const cutY = (x) => A[1] + ((B[1] - A[1]) * (x - A[0])) / (B[0] - A[0]);
    const tail = -10.2 + (1 - k) * 34;
    c.strokeStyle = COL.ink; c.lineCap = 'round'; c.lineJoin = 'round';
    c.lineWidth = 4.6; c.beginPath(); c.moveTo(6.6 * innS, cutY(6.6 * innS) - 0.6); c.lineTo(tail * innS, cutY(tail * innS) - 0.8); c.stroke();
    c.lineWidth = 3.4; c.beginPath(); c.moveTo(-6.6 * innS, -1.6); c.quadraticCurveTo(-0.5 * innS, 5.6, 6.4 * innS, 2.6); c.stroke();
    c.fillStyle = 'rgba(246,150,160,.35)'; c.beginPath(); c.ellipse(-1.5 * innS, 9, 5, 2.2, 0, 0, TAU); c.fill();
    c.restore(); return;
  }
  if (P.eyes === 'shock') {                // ตาโตตกใจ (ท่าแพ้): ตาขาวเต็มดวง ตาดำหดเล็กสั่นระริก คิ้วยกสูงหัวคิ้วชี้ขึ้น
    const tr = Math.sin(t * 38) * 0.35;
    const gr = c.createLinearGradient(0, -9, 0, 9.5);
    gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(1, '#FFE4EE');
    c.fillStyle = gr; c.beginPath(); c.ellipse(0, 0, 7.8, 9.4, 0, 0, TAU); c.fill();
    c.fillStyle = COL.pupil; c.beginPath(); c.ellipse(0.8 * innS + tr, 0.8, 2.7, 3.3, 0, 0, TAU); c.fill();
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(0.8 * innS + tr - 1, -0.3, 0.85, 0, TAU); c.fill();
    c.strokeStyle = COL.ink; c.lineWidth = 3.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(6 * innS, -15.5); c.quadraticCurveTo(-1 * innS, -17, (-9 + (1 - k) * 20) * innS, -13); c.stroke();
    c.restore(); return;
  }
  if (P.eyes === 'calm') {                 // หลับตาสงบ: เส้นโค้งคว่ำ + คิ้วผ่อนลง
    c.strokeStyle = COL.ink; c.lineWidth = 3.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-6.8, -0.5); c.quadraticCurveTo(0, 7.5, 6.8, -0.5); c.stroke();
    c.fillStyle = 'rgba(246,170,170,.35)'; c.beginPath(); c.ellipse(-1 * innS, 8, 5, 2.2, 0, 0, TAU); c.fill();
    c.lineWidth = 3; c.beginPath(); c.moveTo(4.5 * innS, -9.5); c.lineTo(-6 * innS * (side < 0 ? g.eyeKL : 1), -11.2); c.stroke();
    c.restore(); return;
  }
  const rage = P.eyes === 'rage', glow = P.eyes === 'glow' || rage;
  const grudge = P.eyes === 'grudge';   // จ้องแค้น (ท่าแพ้): คิ้วกดชันกว่า ตาหรี่ลง ตาดำหดเล็กสั่นระริก ขอบตาแดงเรื่อ
  // ตาตามแบบ (ผู้ใช้ 22 พ.ย.: "ยังเหล่ วาดใหม่"): ตาขาวรีตั้ง ถูกคิ้วตัดเฉียง (หัวตาต่ำ หางตาสูง)
  // ตาดำโตห้อยจากคิ้ว (ขอบบนจมใต้คิ้ว ไม่ลอยกลางตา) อยู่ค่อนหัวตาทั้งสองข้างแบบสมมาตร → ดูขึงขัง ไม่เหล่
  const inn = side < 0 ? 1 : -1;   // ทิศหัวตา (เข้าหาจมูก)
  const RX = 7.6, RY = 9, CY = 0.5;
  const drop = (glow ? 2 : 0) + (grudge ? 2.4 : 0) + P.lid * 16;
  const A = [8 * inn, (grudge ? -0.4 : -2.2) + drop], B = [-8 * inn, (grudge ? -10.6 : -8.2) + drop];   // เส้นคิ้วตัดตา: A = หัวตา · B = หางตา
  const cutY = (x) => A[1] + ((B[1] - A[1]) * (x - A[0])) / (B[0] - A[0]);
  c.save();
  c.beginPath();
  c.moveTo(14 * inn, cutY(14 * inn)); c.lineTo(-14 * inn, cutY(-14 * inn)); c.lineTo(-14 * inn, 14); c.lineTo(14 * inn, 14); c.closePath();
  c.clip();
  const white = new Path2D(); white.ellipse(0, CY, RX, RY, 0, 0, TAU);
  if (glow) { c.shadowColor = rage ? 'rgba(255,70,120,.95)' : 'rgba(255,170,205,.9)'; c.shadowBlur = rage ? 12 : 10; }
  let gr = c.createLinearGradient(0, -8, 0, CY + RY);
  gr.addColorStop(0, rage ? '#FFF2F5' : glow ? '#FFFFFF' : grudge ? '#FFF3EF' : '#FFF4E4'); gr.addColorStop(1, rage ? '#FF9DBA' : glow ? '#FFE3EE' : grudge ? '#F6BFC6' : '#FBE2C4');
  c.fillStyle = gr; c.fill(white);
  c.shadowBlur = 0;
  c.clip(white);
  // แก้มชมพูใต้คิ้ว
  c.strokeStyle = rage ? 'rgba(255,90,140,.55)' : glow ? 'rgba(255,190,214,.5)' : 'rgba(246,180,174,.62)'; c.lineWidth = 4.6;
  c.beginPath(); c.moveTo(14 * inn, cutY(14 * inn) + 2.6); c.lineTo(-14 * inn, cutY(-14 * inn) + 2.6); c.stroke();
  if (grudge) {                            // ตาดำหดเล็ก สั่นระริกด้วยความแค้น จ้องตรงมาที่น้อง
    const px = 1.2 * inn + gaze * 0.5 + Math.sin(t * 47 + side) * 0.45, py = 1.2 + Math.cos(t * 41) * 0.35;
    c.fillStyle = '#5E3266'; c.beginPath(); c.ellipse(px, py, 3.3, 3.9, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(px - inn * 1.6, py - 1.4, 0.9, 0, TAU); c.fill();
  } else if (!glow) {
    const px = 1.6 * inn + gaze * 0.7, py = -1.2;
    gr = c.createLinearGradient(0, py - 3, 0, py + 6.4);
    gr.addColorStop(0, '#6C3F72'); gr.addColorStop(1, '#8A5A8F');
    c.fillStyle = gr; c.beginPath(); c.ellipse(px, py, 5.4, 6.4, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.arc(px - inn * 3.2, py + 2.6, 1.35, 0, TAU); c.fill();
  }
  c.restore();
  // คิ้วหนาปลายมน วางบนเส้นตัด เลยหางตาออกไปนิด หัวคิ้วจบที่หัวตา
  c.strokeStyle = COL.ink; c.lineWidth = rage ? 5 : glow ? 4.6 : grudge ? 5.2 : 4.2; c.lineCap = 'round';
  const tail = -10.6 + (1 - k) * 36;   // k = ความกว้างตา (ข้างไกลตอนเฉียง 0.9 → หางคิ้ว -7 · หน้าตรง 1 → -10.6 เท่ากันสองข้าง)
  c.beginPath(); c.moveTo(7 * inn, cutY(7 * inn) - 0.2); c.lineTo(tail * inn, cutY(tail * inn) - 0.5); c.stroke();
  c.restore();
}
function drawVein(c, P, g, t) {
  if (!(P.vein > 0)) return;
  const s = P.vein * (1 + Math.sin(t * 9) * 0.08);
  c.save(); c.translate(g.eyeL[0] - 9, g.eyeL[1] - 16); c.scale(s, s); c.rotate(-0.2);
  c.strokeStyle = '#F4577F'; c.lineWidth = 2.2; c.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    c.save(); c.rotate((i * Math.PI) / 2);
    c.beginPath(); c.moveTo(1.6, -4.6); c.quadraticCurveTo(1.8, -1.8, 4.6, -1.6); c.stroke();
    c.restore();
  }
  c.restore();
}
/** หน้าตอนแพ้: เส้นเครียดบนหน้าผาก · เหงื่อ · น้ำตาแค้นเล็ดไหลอาบแก้ม (ไม่มีเส้นขอบ) */
function drawGrudgeMarks(c, P, g, t) {
  if (P.gloom > 0) {                       // หน้ามืดครึ้ม (เงาม่วงนุ่มคลุมหน้าผาก — "เครียดจัด" แบบมังงะ ไม่มีขอบแข็ง)
    const cx = (g.eyeL[0] + g.eyeR[0]) / 2, cy = g.eyeL[1] - 16, pulse = 0.85 + 0.15 * Math.sin(t * 5);
    c.save(); c.translate(cx, cy); c.scale(1, 0.5);
    const gr = c.createRadialGradient(0, 0, 2, 0, 0, 38);
    gr.addColorStop(0, `rgba(84,38,118,${0.3 * P.gloom * pulse})`); gr.addColorStop(1, 'rgba(84,38,118,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 38, 0, TAU); c.fill();
    c.restore();
  }
  if (P.sweat >= 0) {                      // เหงื่อหยดใหญ่ไหลลงข้างขมับ
    const k = (P.sweat % 1.1) / 1.1, x = g.eyeR[0] + 14, y = g.eyeR[1] - 12 + k * 10;
    c.save(); c.globalAlpha *= Math.sin(k * Math.PI) * 0.95;
    const gr = c.createLinearGradient(x - 3, y - 6, x + 3, y + 5);
    gr.addColorStop(0, '#EAF8FF'); gr.addColorStop(1, '#9ED2F2');
    c.fillStyle = gr; c.beginPath(); c.moveTo(x, y - 6.5); c.quadraticCurveTo(x + 4, y + 1, x, y + 3.6); c.quadraticCurveTo(x - 4, y + 1, x, y - 6.5); c.fill();
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.ellipse(x - 1.1, y - 0.6, 0.8, 1.6, 0.2, 0, TAU); c.fill();
    c.restore();
  }
  if (P.tear >= 0) {                       // น้ำตาแค้นเล็ดจากหางตา: คลอ → หยดไหลอาบแก้มเป็นทาง (วนเป็นจังหวะ)
    const pool = clamp(P.tear / 0.25);
    for (const side of [-1, 1]) {
      const [ex, ey] = side < 0 ? g.eyeL : g.eyeR, ox = ex + side * 6.5, oy = ey + 4.5;
      c.save();
      c.fillStyle = `rgba(190,232,255,${0.75 * pool})`; c.beginPath(); c.ellipse(ox - side * 2, oy, 3.6 * pool, 1.7 * pool, 0, 0, TAU); c.fill();
      const streak = clamp((P.tear - 0.15) / 0.5) * 13;
      if (streak > 0) {
        const gr = c.createLinearGradient(0, oy, 0, oy + streak);
        gr.addColorStop(0, 'rgba(190,232,255,.7)'); gr.addColorStop(1, 'rgba(190,232,255,.15)');
        c.strokeStyle = gr; c.lineWidth = 2.6; c.lineCap = 'round';
        c.beginPath(); c.moveTo(ox, oy); c.quadraticCurveTo(ox + side * 1.5, oy + streak * 0.5, ox + side * 0.5, oy + streak); c.stroke();
      }
      const k = ((P.tear + (side > 0 ? 0.35 : 0)) % 0.9) / 0.9;
      if (P.tear > 0.2) {
        const y = oy + 2 + k * 15, x = ox + side * (0.6 + k * 1.2);
        c.globalAlpha *= Math.sin(k * Math.PI);
        c.fillStyle = '#CDEEFF'; c.beginPath(); c.moveTo(x, y - 4); c.quadraticCurveTo(x + 2.8, y + 1, x, y + 2.6); c.quadraticCurveTo(x - 2.8, y + 1, x, y - 4); c.fill();
        c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(x - 0.8, y, 0.7, 0, TAU); c.fill();
      }
      c.restore();
    }
  }
}
function drawFace(c, P, gaze, t, g) {
  eye(c, -1, P, gaze, t, g); eye(c, 1, P, gaze, t, g);
  drawVein(c, P, g, t);
  drawGrudgeMarks(c, P, g, t);
  const [mx, my] = g.mouth;
  c.strokeStyle = COL.ink; c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round';
  if (P.mouth === 'open') {
    const h = 2.6 + P.mouthOpen * 2.2;
    c.fillStyle = '#5B2E58'; c.beginPath(); c.ellipse(mx, my + 1, 4.4, h, 0, 0, TAU); c.fill();
    c.fillStyle = '#E58DAE'; c.beginPath(); c.ellipse(mx, my + 1 + h * 0.45, 2.8, h * 0.42, 0, 0, Math.PI); c.fill();
  } else if (P.mouth === 'grit') {          // กัดฟันเกร็ง
    c.fillStyle = '#5B2E58'; c.beginPath(); c.roundRect(mx - 5, my - 1.8, 10, 4.6, 2.2); c.fill();
    c.fillStyle = '#FFF4EA'; c.beginPath(); c.roundRect(mx - 4, my - 1, 8, 1.8, 0.9); c.fill();
  } else if (P.mouth === 'puff') {         // กลั้นลมแก้มป่อง
    for (const sd of [-1, 1]) {
      const gr = c.createRadialGradient(mx + sd * 9, my - 1, 0.5, mx + sd * 9, my - 1, 6.5);
      gr.addColorStop(0, 'rgba(255,214,206,.55)'); gr.addColorStop(1, 'rgba(255,190,190,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(mx + sd * 9, my - 1, 6.5, 0, TAU); c.fill();
    }
    c.beginPath(); c.moveTo(mx - 2.4, my + 0.4); c.quadraticCurveTo(mx, my + 1.6, mx + 2.4, my + 0.4); c.stroke();
  } else if (P.mouth === 'smirk') {        // ยิ้มมุมปากเจ้าเล่ห์ (มุมปากฝั่งน้องยกขึ้น)
    c.beginPath(); c.moveTo(mx + 3.6, my + 1.2); c.quadraticCurveTo(mx, my + 2.2, mx - 4, my - 1.6); c.stroke();
  } else if (P.mouth === 'wavy') {         // ปากเบี้ยวคลื่น (มึน/หมดแรง)
    c.beginPath(); c.moveTo(mx - 5, my + 0.6); c.quadraticCurveTo(mx - 2.5, my - 2.4, mx, my + 0.4); c.quadraticCurveTo(mx + 2.5, my + 3.2, mx + 5, my + 0.2); c.stroke();
  } else if (P.mouth === 'flat') {
    c.beginPath(); c.moveTo(mx - 3, my + 0.6); c.quadraticCurveTo(mx, my - 0.4, mx + 3, my + 0.6); c.stroke();
  } else if (P.mouth === 'o') {             // ปากกลมเป่าหมอก
    const r = 2 + P.mouthOpen * 1.6;
    c.fillStyle = '#5B2E58'; c.beginPath(); c.ellipse(mx - 1, my + 0.5, r * 0.9, r, 0, 0, TAU); c.fill();
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
  const wr = h.wrist || 0;   // 0 = ทรงถั่ว/กำปั้น (กอดผลึก) · 1 = แขนเรียว ข้อมือคอด อุ้งมือกลมโตที่ปลาย (ยื่นแขน)
  const wOf = (k, sgn) => lerp(lerp(h.r0, h.r1, k) + sgn * (sgn > 0 ? h.bul : h.dent) * Math.sin(Math.PI * k),
    h.r0 * (1 - 0.12 * Math.sin(Math.PI * clamp(k / 0.68))) + (h.r1 - h.r0) * ease((k - 0.6) / 0.4), wr);
  for (let i = 0; i <= N; i++) { const k = i / N; pts.push(at(k, wOf(k, 1))); }
  for (let i = 1; i < N; i++) pts.push(cap(P, h.r1, Math.PI / 2 - (Math.PI * i) / N));
  for (let i = N; i >= 0; i--) { const k = i / N; pts.push(at(k, -wOf(k, -1))); }
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

/** only: 'glow' = วาดแค่แสงเรืองรอบอุ้งมือ · 'solid' = วาดมือไม่มีแสง (ตอนมีเส้นขอบ แสงต้องอยู่นอกชั้นเส้น ไม่งั้นกลายเป็นควันดำ) */
function hand(c, h, a, side, body, only) {
  // a.r = ง้างออกด้านนอก/ขึ้น · a.dx a.dy = เลื่อนอุ้งมือ (โคนแขนอยู่กับที่ → มือยืดเป็นถั่วตอนง้าง/ตก)
  let P = [h.P[0] + a.dx * 0.7 + side * a.r * 6, h.P[1] + a.dy * 0.7 - a.r * 5], S = h.S;
  if (a.reach > 0) {
    const k = a.reach;
    P = [lerp(P[0], a.to[0], k), lerp(P[1], a.to[1], k)];
    S = [lerp(S[0], a.sh[0], k), lerp(S[1], a.sh[1], k)];
    h = { ...h, r0: lerp(h.r0, 8.2, k), r1: lerp(h.r1, 10.8, k), bul: lerp(h.bul, 1.2, k), dent: lerp(h.dent, 0.8, k), wrist: 0.25 * k };
  }
  if (a.glow > 0 && only !== 'solid') {   // อุ้งมือเรืองพลัง (ปล่อยพลังจากมือนี้)
    const R = h.r1 * 2.4, gr = c.createRadialGradient(P[0], P[1], 1, P[0], P[1], R);
    gr.addColorStop(0, `rgba(255,214,246,${0.7 * a.glow})`); gr.addColorStop(1, 'rgba(230,180,255,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(P[0], P[1], R, 0, TAU); c.fill();
  }
  if (only === 'glow') return;
  const pts = handPts(S, P, h, side), col = side < 0 ? HAND_COL.L : HAND_COL.R;
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

// ── ผลึกขังน้อง (อัปเกรด 22 พ.ย.): อัญมณีเหลี่ยมมน 12 มุม เจียระไน 48 เหลี่ยม (ขอบบน · เหลี่ยมข้าง · ดาว) ไล่สีในตัว ·
// สีตามทิศ (ฟ้าซ้าย ม่วงบน ชมพูขวา) + เหลือบรุ้งโอปอลเลื่อนช้า · สันเหลี่ยมเป็นแสงตามทิศแสง (ไม่ใช่เส้นขอบ) ·
// หน้าโต๊ะใสเห็นเงาน้องหลับจาง ๆ (ไม่บอกสี) · ประกายวิ่งวน · แสงวาบกวาดทุก 3.6 วิ · ประกายรุ้งที่มุม ──
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

// วงกลางของการเจียระไน: กลางขอบแต่ละช่วงดึงเข้าหาแกน → แต่ละช่วงของวงนอกแตกเป็น 4 เหลี่ยม (ขอบบน · เหลี่ยมข้างสองชิ้น · ดาว)
const GEM_MID = GEM.map((q, i) => { const r = GEM[(i + 1) % GEM.length]; const mx = (q[0] + r[0]) / 2, my = (q[1] + r[1]) / 2; return [GEM_C[0] + (mx - GEM_C[0]) * 0.86, GEM_C[1] + (my - GEM_C[1]) * 0.84]; });
const LIGHT_A = Math.atan2(-1, -0.8);   // แสงมาจากซ้ายบน
/** สีรุ้งพาสเทล (h องศา) → [r,g,b] */
function pastelHue(h, sat = 0.75, lum = 0.8) {
  const f = (n) => { const k = (((n + h / 30) % 12) + 12) % 12, a = sat * Math.min(lum, 1 - lum); return Math.round(255 * (lum - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return [f(0), f(8), f(4)];
}
const mixRGB = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));

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

/**
 * น้องในผลึก = เงาจาง ๆ ไม่บอกสีขน (ผู้ใช้ 22 พ.ย.: "ไม่ต้องสปอยสีน้องแมว ให้โชว์เป็นเงาแมวข้างในแบบจาง ๆ")
 * วาดน้องจิบิจริง (ท่าหลับ หายใจ) ลงชั้นแยก → ย้อมเป็นสีม่วงเงาทั้งตัว → วางทับด้วยความจาง + เบลอนิด ๆ ให้เหมือนอยู่ลึกในแก้ว
 * ใช้ทรงตัวน้องจิบิ "ส้ม" เสมอ (ทรงหู/ขนต่างกันในบางสี → เงาก็ไม่บอกใบ้) · ไฟหัวใจสีชมพูเต้นตุบ ๆ บอกว่ายังมีชีวิต
 */
function drawKittenShadow(c, P, o, t, W, H) {
  const cx = -W * 0.015, cy = H * 0.285, sc = (H * 0.63) / chibiHeight('orange');
  const m = c.getTransform(), k = Math.hypot(m.a, m.b);
  // กรอบพิกเซลจริงของผลึก (ล้าง/คัดลอกเฉพาะตรงนี้ ไม่ทั้งจอ)
  const xs = [], ys = [];
  for (const [px, py] of [[-W * 0.6, -H * 0.6], [W * 0.6, -H * 0.6], [-W * 0.6, H * 0.6], [W * 0.6, H * 0.6]]) { xs.push(m.a * px + m.c * py + m.e); ys.push(m.b * px + m.d * py + m.f); }
  const L = layer(2, c.canvas), lc = L.getContext('2d');
  const bx = Math.max(0, Math.floor(Math.min(...xs))), by = Math.max(0, Math.floor(Math.min(...ys)));
  const bw = Math.min(L.width, Math.ceil(Math.max(...xs))) - bx, bh = Math.min(L.height, Math.ceil(Math.max(...ys))) - by;
  if (bw <= 0 || bh <= 0) return;
  lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(bx, by, bw, bh);
  lc.setTransform(m);
  drawChibi(lc, cx, cy, sc, { view: 'sit', act: 'sleep', look: 'orange', t: t * 60 });
  // ย้อมทั้งตัวเป็นเงาม่วง (บนเข้มนิด ล่างจางลงเหมือนจมในแสงผลึก)
  lc.globalCompositeOperation = 'source-in';
  const gr = lc.createLinearGradient(0, -H * 0.3, 0, H * 0.32);
  gr.addColorStop(0, 'rgb(104,74,170)'); gr.addColorStop(1, 'rgb(138,108,204)');
  lc.fillStyle = gr; lc.fillRect(-W, -H, W * 2, H * 2);
  lc.globalCompositeOperation = 'source-over';
  const breathe = 0.5 + 0.5 * Math.sin(t * 1.9);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha *= (0.3 + 0.05 * breathe) * (1 - (P.cryWhite || 0));
  c.filter = `blur(${Math.max(0.35, k * 0.22).toFixed(2)}px)`;
  c.drawImage(L, bx, by, bw, bh, bx, by, bw, bh);
  c.restore();
  // ไฟหัวใจ: เรืองชมพู-ทองที่อก เต้นสองจังหวะ (ตุบ-ตุบ … พัก)
  const ph = (t % 1.6) / 1.6, beat = Math.exp(-(((ph - 0.08) / 0.05) ** 2)) + 0.7 * Math.exp(-(((ph - 0.26) / 0.05) ** 2));
  const hx = cx + W * 0.005, hy = cy - H * 0.245, hr = W * (0.06 + 0.022 * beat);
  const hg = c.createRadialGradient(hx, hy, 0, hx, hy, hr);
  hg.addColorStop(0, `rgba(255,226,240,${0.5 + 0.35 * beat})`); hg.addColorStop(0.5, `rgba(255,170,214,${0.22 + 0.2 * beat})`); hg.addColorStop(1, 'rgba(255,170,214,0)');
  c.fillStyle = hg; c.beginPath(); c.arc(hx, hy, hr, 0, TAU); c.fill();
}

function drawCrystal(c, P, o, t, g, ink = 0) {
  if (P.shatter >= 0) return;              // แตกแล้ว (เศษผลึกวาดใน drawShatter)
  const crack = Math.max(o.crack || 0, P.crackMin);
  const jx = P.cryJit ? Math.sin(t * 57) * P.cryJit : 0, jy = P.cryJit ? Math.cos(t * 49) * P.cryJit * 0.7 : 0;
  c.save(); c.translate(g.cry[0] - P.crystalPush * 0.8 + P.cryX + jx, g.cry[1] - P.crystalUp - P.crystalPush * 0.35 + P.cryY + jy); c.rotate(P.cryRot);
  if (P.cryScale !== 1) c.scale(P.cryScale, P.cryScale);
  const W = CRY_W, H = CRY_H, X = (q) => q[0] * W, Y = (q) => q[1] * H;
  const shine = 0.5 + P.rays * 0.9 + crack * 0.12 + P.gather * 0.9 + P.magic * 0.5 + P.burstFlash * 0.8 + P.cast * 0.6;
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
  const gem = gemPath(), table = polyPath(GEM_IN), n = GEM.length;
  const C0 = [GEM_C[0] * W, GEM_C[1] * H];
  if (ink) {                               // เส้นขอบรอบเม็ด: ลากก่อนเนื้อ → ครึ่งในโดนเนื้อทับ เหลือครึ่งนอกเท่าเส้นตัวบอส
    c.save(); c.strokeStyle = INK_COL; c.globalAlpha *= ink; c.lineJoin = 'round'; c.lineWidth = (INK_W * 2) / P.cryScale; c.stroke(gem); c.restore();
  }
  // ── ฐานเนื้อแก้วทั้งเม็ด (กันรอยต่อเหลี่ยมเห็นพื้นหลัง) ──
  c.fillStyle = '#D7CCF6'; c.fill(gem);
  // ── วงนอกเจียระไน 48 เหลี่ยม: ขอบบนบาง · เหลี่ยมข้างซ้าย/ขวา · ดาว · แต่ละชิ้นไล่สีในตัว + เหลือบรุ้งเลื่อนช้า ──
  const facet = (pts, lift, seed) => {
    const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3, cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
    const ang = Math.atan2(cy - GEM_C[1], cx - GEM_C[0]);
    const lit = Math.max(0, Math.cos(ang - LIGHT_A));
    const wave = Math.max(0, Math.sin(t * 1.3 - ang * 2 + seed)) ** 6 * 0.22;      // ประกายวิ่งวนรอบเม็ด
    const base = facetRGB(cx, cy, lift - 0.1 + lit * 0.14 + wave);
    const iri = pastelHue((ang * 180) / Math.PI * 1.5 + t * 24 + seed * 40, 0.9, 0.76);   // เหลือบรุ้งแบบโอปอล
    const col = mixRGB(base, iri, 0.32);
    const hi = mixRGB(col, [255, 255, 255], 0.2 + wave), lo = mixRGB(col, [140, 116, 212], 0.2);
    const g0 = pts[0], g1 = pts[2];
    const gr = c.createLinearGradient(g0[0] * W, g0[1] * H, g1[0] * W, g1[1] * H);
    gr.addColorStop(0, `rgb(${hi})`); gr.addColorStop(1, `rgb(${lo})`);
    c.fillStyle = gr;
    c.beginPath(); c.moveTo(pts[0][0] * W, pts[0][1] * H); c.lineTo(pts[1][0] * W, pts[1][1] * H); c.lineTo(pts[2][0] * W, pts[2][1] * H); c.closePath(); c.fill();
  };
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, O0 = GEM[i], O1 = GEM[j], M = GEM_MID[i], T0 = GEM_IN[i], T1 = GEM_IN[j];
    const r = (k) => (rnd(i * 4 + k) - 0.5) * 0.2;
    facet([O0, O1, M], 0.2 + r(0), i);          // ขอบบน (บาง สว่าง)
    facet([O0, M, T0], 0.04 + r(1), i + 0.3);   // เหลี่ยมข้างซ้าย
    facet([O1, T1, M], -0.06 + r(2), i + 0.6);  // เหลี่ยมข้างขวา (เข้มกว่า → เห็นสันชัด)
    facet([M, T0, T1], 0.12 + r(3), i + 0.9);   // ดาว
  }
  // ── เนื้อแก้วเป็นก้อน: แสงนวลซ้ายบน · เงาม่วงใสด้านล่างขวา (นูนด้วยแสงเงา ไม่ใช่เส้นขอบ) ──
  let gg = c.createRadialGradient(-W * 0.26, -H * 0.32, 1, -W * 0.26, -H * 0.32, W * 0.66);
  gg.addColorStop(0, 'rgba(255,255,255,.34)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gg; c.fill(gem);
  gg = c.createLinearGradient(-W * 0.2, -H * 0.2, W * 0.35, H * 0.5);
  gg.addColorStop(0.45, 'rgba(118,86,206,0)'); gg.addColorStop(1, 'rgba(118,86,206,.2)');
  c.fillStyle = gg; c.fill(gem);
  // ── หน้าโต๊ะใส: ไล่ฟ้า → ลาเวนเดอร์ → ชมพู ──
  gg = c.createLinearGradient(-W * 0.35, -H * 0.35, W * 0.35, H * 0.3);
  gg.addColorStop(0, '#D3E2FC'); gg.addColorStop(0.5, '#E0D2FA'); gg.addColorStop(1, '#F2CDF1');
  c.fillStyle = gg; c.fill(table);
  c.save(); c.clip(table);
  // แสงเรืองจากกลางผลึก (ตัวน้องอยู่หน้าแสงนี้ → เห็นเป็นเงา)
  gg = c.createRadialGradient(-W * 0.02, H * 0.06, 2, -W * 0.02, H * 0.06, W * 0.36);
  gg.addColorStop(0, 'rgba(255,250,255,.95)'); gg.addColorStop(0.55, 'rgba(255,240,252,.45)'); gg.addColorStop(1, 'rgba(255,240,252,0)');
  c.fillStyle = gg; c.fill(table);
  // ด้านล่างสะท้อนเหลี่ยมฐาน (กาไลโดสโคปจาง ๆ ผ่านแก้ว)
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    c.fillStyle = i % 2 ? 'rgba(255,255,255,.08)' : 'rgba(150,120,220,.045)';
    c.beginPath(); c.moveTo(C0[0], C0[1] + H * 0.05); c.lineTo(GEM_IN[i][0] * W, GEM_IN[i][1] * H); c.lineTo(GEM_IN[j][0] * W, GEM_IN[j][1] * H); c.closePath(); c.fill();
  }
  // น้องหลับอยู่ข้างใน = เงาจาง ๆ (ไม่บอกสีขน · เห็นสีจริงตอนผลึกแตก)
  drawKittenShadow(c, P, o, t, W, H);
  // เนื้อแก้วทับตัวน้อง: ม่วงใสบาง ๆ + แสงสะท้อนเฉียงซ้ายบน
  c.fillStyle = 'rgba(206,184,255,.14)'; c.fill(table);
  gg = c.createLinearGradient(X(GEM_IN[1]), Y(GEM_IN[1]), -W * 0.1, H * 0.12);
  gg.addColorStop(0, 'rgba(255,255,255,.42)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gg;
  c.beginPath(); c.moveTo(X(GEM_IN[0]), Y(GEM_IN[0])); c.lineTo(X(GEM_IN[1]), Y(GEM_IN[1])); c.lineTo(X(GEM_IN[3]), Y(GEM_IN[3])); c.lineTo(-W * 0.2, H * 0.04); c.closePath(); c.fill();
  c.restore();
  // ── สันเหลี่ยม: แสงขาวบางตามทิศแสง (ด้านรับแสงชัด ด้านเงาจางจนแทบหาย) ──
  c.lineCap = 'round'; c.lineJoin = 'round';
  const ridge = (a, b, w) => {
    const ang = Math.atan2((a[1] + b[1]) / 2 - GEM_C[1], (a[0] + b[0]) / 2 - GEM_C[0]);
    const al = 0.05 + 0.42 * Math.max(0, Math.cos(ang - LIGHT_A)) ** 2;
    c.strokeStyle = `rgba(255,255,255,${al})`; c.lineWidth = w;
    c.beginPath(); c.moveTo(a[0] * W, a[1] * H); c.lineTo(b[0] * W, b[1] * H); c.stroke();
  };
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    ridge(GEM[i], GEM_MID[i], 0.55); ridge(GEM_MID[i], GEM_IN[i], 0.5); ridge(GEM_MID[i], GEM_IN[j], 0.5); ridge(GEM[i], GEM_IN[i], 0.65);
    ridge(GEM_IN[i], GEM_IN[j], 0.9);            // ขอบหน้าโต๊ะ
  }
  // ── ประกายในผลึก (ดาวทองดวงใหญ่ซ้าย · ดาวขาวขวาบน · ดาวจิ๋วกะพริบ) ──
  const tw = (i) => 0.35 + 0.65 * Math.max(0, Math.sin(t * 2.4 + i * 1.9));
  c.save(); c.shadowColor = 'rgba(255,236,170,.95)'; c.shadowBlur = 6;
  c.fillStyle = '#FFF3C4'; star4(c, -W * 0.27, -H * 0.04, 3.4, tw(0));
  c.fillStyle = '#FFFFFF'; star4(c, W * 0.2, -H * 0.27, 3, tw(1));
  c.restore();
  c.fillStyle = '#FFFFFF';
  for (const [x, y, r, i] of [[-0.16, -0.25, 1.5, 2], [0.29, -0.07, 1.4, 3], [0.33, -0.22, 1.1, 4], [-0.27, -0.24, 1.1, 5]]) star4(c, x * W, y * H, r, tw(i));
  // รอยร้าว (โดนตีจุดอ่อน): แสงขาวแตกในเนื้อ แกนชมพู
  if (crack > 0) {
    c.save(); c.clip(gem);
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.shadowColor = 'rgba(255,240,255,.95)'; c.shadowBlur = 6;
    for (let k = 0; k < Math.min(3, crack); k++) {
      const cr = CRACKS[k];
      for (const [col, lw] of [['rgba(255,255,255,.95)', 1.7], ['rgba(255,190,232,.9)', 0.6]]) {
        c.strokeStyle = col; c.lineWidth = lw;
        c.beginPath(); cr.pts.forEach(([x, y], i) => (i ? c.lineTo(x * W, y * H) : c.moveTo(x * W, y * H))); c.stroke();
        c.lineWidth = lw * 0.65;
        for (const [at, [x, y]] of cr.br) { c.beginPath(); c.moveTo(cr.pts[at][0] * W, cr.pts[at][1] * H); c.lineTo(x * W, y * H); c.stroke(); }
      }
    }
    c.restore();
  }
  // ── ขอบในเรือง: ขาวทางแสง · ชมพูสะท้อนด้านล่างขวา · แสงวาบกวาดผ่านทุก 3.6 วิ ──
  c.save(); c.clip(gem);
  gg = c.createLinearGradient(-W * 0.45, -H * 0.45, W * 0.45, H * 0.45);
  gg.addColorStop(0, 'rgba(255,255,255,.9)'); gg.addColorStop(0.5, 'rgba(255,255,255,.25)'); gg.addColorStop(1, 'rgba(255,196,238,.55)');
  c.strokeStyle = gg; c.lineWidth = 2.6; c.stroke(gem);
  const sw = (t % 3.6) / 1.1;
  if (sw < 1) {
    const x0 = lerp(-W * 0.85, W * 0.85, sw);
    gg = c.createLinearGradient(x0 - 9, 0, x0 + 9, 0);
    gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(0.5, `rgba(255,255,255,${0.42 * Math.sin(sw * Math.PI)})`); gg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gg; c.save(); c.transform(1, 0, -0.45, 1, 0, 0); c.fillRect(x0 - 9, -H, 18, H * 2); c.restore();
  }
  c.restore();
  // ── แสงจับมุม: หน้าต่างแสงซ้ายบน (ขาวคม) + ประกายรุ้งที่มุมเหลี่ยม ──
  c.fillStyle = 'rgba(255,255,255,.78)';
  c.beginPath(); c.moveTo(X(GEM[1]) + 2.4, Y(GEM[1]) + 2.6); c.lineTo(X(GEM[2]) + 1.4, Y(GEM[2]) + 2.2); c.lineTo(X(GEM_MID[1]) + 0.2, Y(GEM_MID[1]) + 0.6); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.55)';
  c.beginPath(); c.ellipse(-W * 0.25, -H * 0.2, W * 0.05, H * 0.022, -0.75, 0, TAU); c.fill();
  for (const [vi, ph] of [[2, 0], [6, 2.1], [9, 4.2]]) {
    const k = Math.max(0, Math.sin(t * 1.5 + ph)) ** 8;
    if (k < 0.02) continue;
    const [vx, vy] = [GEM[vi][0] * W * 0.97, GEM[vi][1] * H * 0.97];
    c.save(); c.globalCompositeOperation = 'lighter';
    c.fillStyle = 'rgba(255,150,210,.7)'; star4(c, vx - 0.6, vy, 3.6 * k, k);
    c.fillStyle = 'rgba(140,210,255,.7)'; star4(c, vx + 0.6, vy, 3.6 * k, k);
    c.restore();
    c.fillStyle = '#FFFFFF'; star4(c, vx, vy, 2.6 * k, k);
  }
  if (P.cryWhite > 0) {                    // ก่อนแตก: เรืองจนขาวทั้งเม็ด
    gr = c.createRadialGradient(0, 0, 4, 0, 0, W * 0.9);
    gr.addColorStop(0, `rgba(255,255,255,${0.8 * P.cryWhite})`); gr.addColorStop(1, 'rgba(255,220,250,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(0, 0, W * 0.9, 0, TAU); c.fill();
    c.fillStyle = `rgba(255,252,255,${0.85 * P.cryWhite})`; c.fill(gem);
  }
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
// ───────────────────────── ท่าแพ้ ─────────────────────────
/** รอยแสงแตกบนตัว (วาดทับเนื้อไม้ ใต้หน้า) — ลามจากผลึกขึ้นหัวและออกข้าง ทีละเส้น */
const BODY_CRACKS = [
  [0, [[0, -44], [-1, -56], [3, -66], [0, -86], [2, -96], [-1, -104]]],
  [0.05, [[-2, -40], [-8, -52], [-5, -60], [-15, -70], [-13, -84], [-21, -94]]],
  [0.1, [[2, -42], [10, -50], [8, -58], [18, -66], [16, -80], [24, -90]]],
  [0.2, [[-6, -36], [-18, -40], [-26, -48], [-34, -46], [-41, -57]]],
  [0.25, [[6, -36], [18, -38], [28, -46], [36, -44], [43, -55]]],
  [0.35, [[-3, -26], [-12, -20], [-22, -17], [-31, -9]]],
  [0.4, [[3, -26], [12, -19], [24, -15], [33, -7]]],
];
function drawBodyCracks(c, P, body) {
  const k = P.bodyCrack;
  if (!(k > 0)) return;
  c.save(); c.clip(body); c.lineCap = 'round'; c.lineJoin = 'round';
  // แสงซึมจากข้างใน (ยิ่งแตกมาก ยิ่งสว่าง)
  const gr = c.createRadialGradient(0, -45, 4, 0, -45, 70);
  gr.addColorStop(0, `rgba(255,214,236,${0.35 * Math.min(1.4, k)})`); gr.addColorStop(1, 'rgba(255,214,236,0)');
  c.fillStyle = gr; c.fillRect(-70, -110, 140, 115);
  for (const [delay, pts] of BODY_CRACKS) {
    const f = clamp((Math.min(k, 1) - delay) / (1 - delay) * 1.25);
    if (f <= 0) continue;
    const n = pts.length - 1, upto = f * n, last = Math.floor(upto);
    const path = () => {
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i <= Math.min(n, last); i++) c.lineTo(pts[i][0], pts[i][1]);
      if (last < n) c.lineTo(lerp(pts[last][0], pts[last + 1][0], upto - last), lerp(pts[last][1], pts[last + 1][1], upto - last));
    };
    const glow = Math.min(1.5, k);
    c.strokeStyle = `rgba(255,150,210,${0.32 * glow})`; c.lineWidth = 7; path(); c.stroke();
    c.strokeStyle = `rgba(255,186,226,${0.8 * Math.min(1, glow)})`; c.lineWidth = 3; path(); c.stroke();
    c.strokeStyle = 'rgba(255,253,244,.98)'; c.lineWidth = 1.3; path(); c.stroke();
  }
  c.restore();
}
/** เส้นสลาย (พิกัดตัว) — ขอบหยักวิ่งไหว ๆ */
const meltY = (P, x, t) => P.dEdge + 3.2 * Math.sin(x * 0.19 + t * 2.6) + 2 * Math.sin(x * 0.43 - t * 4.1) + 1.2 * Math.sin(x * 0.87 + 1.7);
/** ลบส่วนใต้เส้นสลายออกจากชั้นภาพ แล้วเผาขอบให้เรืองแสง (วาดบนชั้นภาพของตัว/แขน) */
function meltMask(c, P, t) {
  if (P.dEdge == null) return;
  const line = (dy) => { for (let x = -150; x <= 150; x += 4) (x === -150 ? c.moveTo : c.lineTo).call(c, x, meltY(P, x, t) + dy); };
  // ต้องตั้งสีทึบเองทุกครั้ง: destination-out ลบตามความทึบของสีที่ใช้ทา — สีค้างจากรอบก่อน (วาบขาวโปร่งตอนโดนตี) เคยทำให้ลบได้แค่ครึ่ง
  // ตัวเลยค้างเป็นเงาจาง ๆ ทั้งตัวแล้วหายวับตอนจบ (ผู้ใช้ 22 พ.ย.: "แสงไหลผ่านจบแล้วมอนส์ถึงหายวาป")
  c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000';
  c.beginPath(); line(0); c.lineTo(150, 140); c.lineTo(-150, 140); c.closePath(); c.fill();
  c.globalCompositeOperation = 'source-atop';
  c.lineJoin = 'round';
  c.strokeStyle = 'rgba(255,190,228,.55)'; c.lineWidth = 13; c.beginPath(); line(-2); c.stroke();
  c.strokeStyle = 'rgba(255,240,214,.95)'; c.lineWidth = 4; c.beginPath(); line(-0.8); c.stroke();
  c.globalCompositeOperation = 'source-over';
}
const meltHalfW = (y) => (y > -16 ? 50 : y > -60 ? lerp(55, 42, (-16 - y) / 44) : y > -100 ? lerp(42, 30, (-60 - y) / 40) : 10);
const MOTE_N = 150, MELT_DUR = STUMP_DEFEAT.free - STUMP_DEFEAT.melt;
/** ละอองจากเส้นสลาย (ประกาย · ดวงไฟนุ่ม · เศษเปลือกไม้) ลอยขึ้น · ใบไม้หลุดร่วง · เปลวแตกเป็นดาวทอง — พิกัดตัว */
function drawDefeatFx(c, P, t) {
  if (P.dEdge != null && P.dissolve < 1) {   // แสงฟุ้งเหนือเส้นสลาย (ไฟเผาขอบเป็นแสง)
    const hw = meltHalfW(P.dEdge) + 6, gr = c.createLinearGradient(0, P.dEdge - 16, 0, P.dEdge + 10);
    gr.addColorStop(0, 'rgba(255,226,244,0)'); gr.addColorStop(0.6, `rgba(255,236,232,${0.5 * (1 - P.dissolve * 0.5)})`); gr.addColorStop(1, 'rgba(255,200,236,0)');
    c.fillStyle = gr; c.beginPath();
    for (let x = -hw; x <= hw; x += 4) (x === -hw ? c.moveTo : c.lineTo).call(c, x, meltY(P, x, t) - 16 * Math.sqrt(1 - (x / hw) ** 2));
    for (let x = hw; x >= -hw; x -= 4) c.lineTo(x, meltY(P, x, t) + 10 * Math.sqrt(1 - (x / hw) ** 2));
    c.closePath(); c.fill();
  }
  if (P.dissolve > 0) {
    const d = P.dissolve;
    for (let i = 0; i < MOTE_N; i++) {
      const b = (i + rnd(i) * 0.9) / MOTE_N, age = (d - b) * MELT_DUR, life = 1.1 + rnd(i + 4) * 0.7;
      if (age <= 0 || age >= life) continue;
      const yb = meltEdge(b), x0 = (rnd(i + 11) - 0.5) * 2 * meltHalfW(yb), u = age / life;
      const x = x0 + Math.sin(age * 2.4 + i) * 5 * u + (rnd(i + 5) - 0.5) * 16 * u, y = yb - 2 - age * (24 + rnd(i + 3) * 34);
      const a = Math.min(1, age / 0.12) * (1 - u) ** 1.3, kind = i % 3;
      if (kind === 0) { c.fillStyle = ['#FFE7A6', '#FFFFFF', '#FFD0EA'][i % 9 / 3 | 0]; star4(c, x, y, 2.6 + rnd(i + 7) * 3.6, a); }
      else if (kind === 1) {
        const r = 3.4 + rnd(i + 8) * 4.4, gr = c.createRadialGradient(x, y, 0.3, x, y, r);
        gr.addColorStop(0, `rgba(255,248,252,${a})`); gr.addColorStop(0.5, `rgba(${i % 2 ? '255,196,230' : '214,190,255'},${0.6 * a})`); gr.addColorStop(1, 'rgba(230,200,255,0)');
        c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      } else {
        c.save(); c.translate(x, y); c.rotate(age * (3 + rnd(i) * 5) + i); c.globalAlpha *= a;
        c.fillStyle = [COL.bodyL, COL.bodyM, COL.hemM, COL.top1][i % 4];
        const r = 1.6 + rnd(i + 9) * 2;
        c.beginPath(); c.moveTo(-r, -r * 0.6); c.lineTo(r * 0.9, -r * 0.8); c.lineTo(r, r * 0.6); c.lineTo(-r * 0.7, r * 0.8); c.closePath(); c.fill();
        c.restore();
      }
    }
  }
  // ใบไม้หลุดร่วงลงพื้น หมุนคว้าง แล้วจางหาย
  if (P.dEdge != null) {
    LEAVES.forEach(([x, y, a0, len, w], i) => {
      const age = P.st - LEAF_DROP[i];
      if (age <= 0 || age > 2.2) return;
      const fall = Math.min(P.y - y - 3, 34 * age * age + 10 * age);   // ร่วงถึงพื้นแล้วนอนนิ่ง
      c.save(); c.globalAlpha *= clamp((2.2 - age) / 0.5);
      leaf(c, x + Math.sin(age * 3.2 + i) * 9 + (i % 2 ? 1 : -1) * age * 10, y + fall, a0 + age * (i % 2 ? 2.4 : -2.4), len, w);
      c.restore();
    });
  }
  if (P.flamePop >= 0 && P.flamePop < 1.1) {   // เปลวจุดอ่อนแตกเป็นดาวทอง
    const k = P.flamePop, fy = -STUMP.flameY;
    const gr = c.createRadialGradient(0, fy, 1, 0, fy, 18 + k * 34);
    gr.addColorStop(0, `rgba(255,240,180,${0.85 * (1 - ease(k / 0.5))})`); gr.addColorStop(1, 'rgba(255,224,140,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(0, fy, 18 + k * 34, 0, TAU); c.fill();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU - Math.PI / 2 + 0.2, dd = 6 + (1 - (1 - k / 1.1) ** 2) * (30 + rnd(i) * 22);
      c.fillStyle = i % 3 ? '#FFE08A' : '#FFFFFF';
      star4(c, Math.cos(a) * dd, fy + Math.sin(a) * dd + k * k * 16, 3 + rnd(i + 3) * 2.5, clamp(1 - k / 1.1));
    }
  }
}
/** แสงบนพื้นใต้ตัว (พลังทะลัก) — พิกัดพื้น */
function drawGroundGlow(c, P, t) {
  if (!(P.glowRing > 0)) return;
  const a = P.glowRing;
  c.save(); c.scale(1, 0.2);
  const gr = c.createRadialGradient(0, 0, 4, 0, 0, 96);
  gr.addColorStop(0, `rgba(255,228,246,${0.6 * a})`); gr.addColorStop(0.6, `rgba(236,196,255,${0.3 * a})`); gr.addColorStop(1, 'rgba(230,190,255,0)');
  c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 96, 0, TAU); c.fill();
  c.restore();
  c.fillStyle = '#FFF2FA';
  for (let i = 0; i < 10; i++) { const an = (i / 10) * TAU + t * 0.9; star4(c, Math.cos(an) * 64, -1 + Math.sin(an) * 11, 2.2, a * (0.5 + 0.5 * Math.sin(t * 5 + i))); }
}
/** ผลึกระเบิด (พิกัดพื้น): แสงวาบ · ลำแสง · คลื่นวงแหวน · เศษคริสตัลกระเด็นตกพื้น · ประกาย */
const SHATTER_AT = [-1, -53];
function drawShatter(c, P) {
  const v = P.shatter;
  if (v < 0 || v > 1.7) return;
  const [X, Y] = SHATTER_AT;
  let gr = c.createRadialGradient(X, Y, 2, X, Y, 40 + v * 240);
  gr.addColorStop(0, `rgba(255,255,255,${0.95 * clamp(1 - v / 0.45)})`); gr.addColorStop(0.35, `rgba(255,214,240,${0.5 * clamp(1 - v / 0.6)})`); gr.addColorStop(1, 'rgba(230,200,255,0)');
  c.fillStyle = gr; c.beginPath(); c.arc(X, Y, 40 + v * 240, 0, TAU); c.fill();
  if (v < 0.9) {
    c.save(); c.translate(X, Y); c.rotate(v * 0.8);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU, len = (90 + rnd(i) * 120) * (0.4 + v * 1.2), wd = 0.05 + rnd(i + 9) * 0.05, al = 0.55 * (1 - v / 0.9);
      gr = c.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
      gr.addColorStop(0, `rgba(255,246,255,${al})`); gr.addColorStop(1, 'rgba(255,200,240,0)');
      c.fillStyle = gr; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, len, a - wd, a + wd); c.closePath(); c.fill();
    }
    c.restore();
  }
  for (const [d0, col] of [[0, '255,240,250'], [0.12, '255,170,214']]) {   // คลื่นแสงวงแหวน (ขอบนุ่ม ไม่ใช่เส้น)
    const k = (v - d0) / 0.7;
    if (k <= 0 || k >= 1) continue;
    const r = 20 + (1 - (1 - k) ** 3) * 230, th = 6 + 16 * (1 - k);
    c.save(); c.translate(X, Y); c.scale(1, 0.86);
    gr = c.createRadialGradient(0, 0, Math.max(0, r - th), 0, 0, r + th * 0.4);
    gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(0.72, `rgba(${col},${0.75 * (1 - k)})`); gr.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = gr; c.beginPath(); c.arc(0, 0, r + th * 0.4, 0, TAU); c.fill();
    c.restore();
  }
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * TAU + rnd(i) * 0.4, sp = 110 + rnd(i + 3) * 170, life = 1.0 + rnd(i + 6) * 0.6;
    if (v > life) continue;
    const x = X + Math.cos(a) * sp * v, y = Math.min(-2, Y + Math.sin(a) * sp * v * 0.8 + 150 * v * v);
    const r = 3.5 + rnd(i + 9) * 6.5, al = 1 - ease((v - life * 0.6) / (life * 0.4));
    if (i % 3) drawGemBit(c, x, y, r, a + v * (4 + rnd(i) * 8), al);
    else drawChunk(c, x, y, r * 1.4, a + v * 6, al, i);
  }
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU + 0.2, dd = 20 + (1 - (1 - clamp(v / 0.8)) ** 3) * (90 + rnd(i) * 80);
    c.fillStyle = i % 3 ? '#FFFFFF' : '#FFE7A6';
    star4(c, X + Math.cos(a) * dd, Y + Math.sin(a) * dd * 0.85, 2.5 + rnd(i + 2) * 3.5, clamp(1 - v / 0.9));
  }
}
/** ก้อนผลึกเหลี่ยม (สีตามทิศเหมือนผลึกใหญ่) */
function drawChunk(c, x, y, r, rot, a, i) {
  if (a <= 0.01) return;
  c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha *= a;
  const pts = [[-1, -0.7], [0.2, -1], [1, -0.3], [0.7, 0.8], [-0.6, 0.9]].map(([px, py]) => [px * r, py * r]);
  const [r1, g1, b1] = facetRGB(Math.cos(i), Math.sin(i), 0.15);
  c.fillStyle = `rgb(${r1},${g1},${b1})`; c.beginPath(); pts.forEach(([px, py], j) => (j ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); c.lineTo(pts[1][0], pts[1][1]); c.lineTo(0, 0); c.closePath(); c.fill();
  c.restore();
}
function heart(c, x, y, r, a) {
  if (a <= 0.01) return;
  c.save(); c.translate(x, y); c.scale(r / 10, r / 10); c.globalAlpha *= a;
  c.fillStyle = '#FF7FB0';
  c.beginPath(); c.moveTo(0, 8); c.bezierCurveTo(-12, 0, -9, -10, 0, -4); c.bezierCurveTo(9, -10, 12, 0, 0, 8); c.fill();
  c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-4, -3, 2, 1.3, -0.6, 0, TAU); c.fill();
  c.restore();
}
/** น้องที่หลุดออกมา (พิกัดพื้น): ฟองแสงสีรุ้ง → ลงพื้น ฟองแตก → ตื่นร้องเหมียว หัวใจลอย */
function drawFreedKitten(c, P, o, t) {
  const K = P.kit;
  if (!K) return;
  const kh = CRY_H * 0.63 * 1.14 * K.grow, sc = kh / chibiHeight(o.look), feet = K.y, cy = feet - kh * 0.52;
  const landSq = K.pop >= 0 ? Math.sin(clamp(K.pop / 0.3) * Math.PI) * (1 - clamp(K.pop / 0.3)) : 0;
  // แสงนวลรอบตัวน้อง + เงาบนพื้นเมื่อใกล้พื้น
  let gr = c.createRadialGradient(K.x, cy, 2, K.x, cy, kh);
  gr.addColorStop(0, `rgba(255,246,252,${K.pop >= 0 ? 0.4 * clamp(1 - K.pop / 1.2) : 0.6})`); gr.addColorStop(1, 'rgba(255,220,246,0)');
  c.fillStyle = gr; c.beginPath(); c.arc(K.x, cy, kh, 0, TAU); c.fill();
  const near = clamp(1 + feet / 40);
  c.fillStyle = `rgba(${COL.shadow},${0.25 * near})`; c.beginPath(); c.ellipse(K.x, 0, kh * 0.42 * (0.6 + 0.4 * near), 3.2, 0, 0, TAU); c.fill();
  c.save(); c.translate(K.x, feet); c.scale(1 + landSq * 0.14, 1 - landSq * 0.14);
  drawChibi(c, 0, 0, sc, { view: 'sit', act: K.awake >= 0 ? 'meow' : 'sleep', look: o.look || 'orange', t: K.awake >= 0 ? K.awake * 60 : t * 60 });
  c.restore();
  // ฟองแสง: ไม่มีเส้นขอบ — ขอบเป็นแสงไล่สีรุ้งจาง ๆ + แสงสะท้อนโค้งซ้ายบน
  const R = kh * 0.68 * (K.pop >= 0 ? 1 + K.pop * 2 : 1), ba = K.pop >= 0 ? clamp(1 - K.pop / 0.16) : clamp(K.v / 0.25);
  if (ba > 0) {
    c.save(); c.globalAlpha *= ba;
    gr = c.createRadialGradient(K.x, cy, R * 0.55, K.x, cy, R);
    gr.addColorStop(0, 'rgba(255,255,255,.04)'); gr.addColorStop(0.78, 'rgba(214,226,255,.22)'); gr.addColorStop(0.92, 'rgba(255,200,236,.42)'); gr.addColorStop(1, 'rgba(255,236,250,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(K.x, cy, R, 0, TAU); c.fill();
    gr = c.createLinearGradient(K.x - R, cy - R, K.x + R, cy + R);
    gr.addColorStop(0, 'rgba(150,226,255,.22)'); gr.addColorStop(0.5, 'rgba(220,190,255,0)'); gr.addColorStop(1, 'rgba(255,170,220,.22)');
    c.fillStyle = gr; c.beginPath(); c.arc(K.x, cy, R, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2.2; c.lineCap = 'round';
    c.beginPath(); c.arc(K.x, cy, R * 0.8, Math.PI * 1.08, Math.PI * 1.42); c.stroke();
    c.fillStyle = '#FFFFFF'; star4(c, K.x + R * 0.5, cy - R * 0.55, 2.6, 0.5 + 0.5 * Math.sin(t * 4));
    for (let i = 0; i < 4; i++) { const an = t * 1.6 + (i / 4) * TAU; star4(c, K.x + Math.cos(an) * R * 1.08, cy + Math.sin(an) * R * 1.02, 1.8, 0.4 + 0.4 * Math.sin(t * 6 + i)); }
    c.restore();
  }
  if (K.pop >= 0 && K.pop < 0.5) {         // ฟองแตก: หยดแสงกระเด็นเป็นวง
    const k = K.pop / 0.5;
    for (let i = 0; i < 12; i++) {
      const an = (i / 12) * TAU, dd = kh * 0.7 + k * 26;
      c.fillStyle = i % 2 ? 'rgba(220,236,255,.9)' : 'rgba(255,214,240,.9)';
      c.globalAlpha = 1 - k; c.beginPath(); c.arc(K.x + Math.cos(an) * dd, cy + Math.sin(an) * dd, 2.2 * (1 - k) + 0.6, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  }
  if (K.awake >= 0) {                      // ตื่นแล้ว: หัวใจลอยขึ้นทีละดวง
    for (let i = 0; i < 4; i++) {
      const age = K.awake - i * 0.28;
      if (age <= 0 || age > 1.5) continue;
      const u = age / 1.5;
      heart(c, K.x + (i % 2 ? 1 : -1) * (8 + i * 3) + Math.sin(age * 4 + i) * 3, cy - kh * 0.5 - u * 30, 5.5 + i * 0.6, Math.sin(u * Math.PI));
    }
  }
}

// ───────────────────────── เอฟเฟกต์ท่าโจมตี (พิกัดบอส · นุ่ม ๆ สีผลึก ไม่มีเส้นขอบเข้ม) ─────────────────────────
/** ย้อมแสงผลึกลงบนชั้นมือ (ทาเฉพาะเนื้อที่มีอยู่แล้ว · ใกล้ผลึกสว่างกว่า) */
function armGlow(c, P, g, k) {
  const [cx, cy] = cryAt(P, g), R = 62 + 34 * P.rays;
  c.save(); c.globalCompositeOperation = 'source-atop';
  const gr = c.createRadialGradient(cx, cy, 6, cx, cy, R);
  gr.addColorStop(0, `rgba(255,250,255,${0.9 * k})`); gr.addColorStop(0.55, `rgba(246,230,255,${0.62 * k})`); gr.addColorStop(1, `rgba(236,214,255,${0.18 * k})`);
  c.fillStyle = gr; c.fillRect(cx - R * 1.6, cy - R * 1.6, R * 3.2, R * 3.2);
  c.restore();
}
const cryAt = (P, g) => [g.cry[0] - P.crystalPush * 0.8 + P.cryX, g.cry[1] - P.crystalUp - P.crystalPush * 0.35 + P.cryY];
/** ฝุ่นตอนกระแทกพื้น (พิกัดพื้น) */
function drawLand(c, P) {
  if (P.land < 0 || P.land >= 1) return;
  const k = P.land, a = (1 - k) * 0.75;
  for (const sd of [-1, 1]) for (let j = 0; j < 5; j++) {
    c.fillStyle = `rgba(243,230,247,${a * (1 - j * 0.12)})`;
    c.beginPath(); c.arc(sd * (26 + k * (60 + j * 14) + j * 8), -3 - k * (4 + j * 2), 5 + k * 7 - j * 0.6, 0, TAU); c.fill();
  }
}
/** หลังตัว: ออร่าโกรธ · หมอกม่วงตอนพุ่ง · แสงรวมพลัง */
function drawBehind(c, P, g, t) {
  if (P.rage) {
    const a = 0.16 + 0.08 * Math.sin(t * 6);
    const gr = c.createRadialGradient(0, -50, 10, 0, -50, 96);
    gr.addColorStop(0, `rgba(255,110,150,${a})`); gr.addColorStop(1, 'rgba(255,110,150,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(0, -50, 96, 0, TAU); c.fill();
  }
  if (P.trail > 0) {
    for (let i = 0; i < 12; i++) {
      const u = (t * 2.4 + i / 12) % 1, y = -18 - rnd(i) * 78;
      c.fillStyle = `rgba(${i % 3 ? '196,156,236' : '236,170,220'},${0.42 * P.trail * (1 - u)})`;
      c.beginPath(); c.arc(46 + u * 130 + rnd(i + 4) * 10, y + Math.sin(u * 5 + i) * 4, 15 - u * 8, 0, TAU); c.fill();
    }
    c.strokeStyle = `rgba(255,255,255,${0.55 * P.trail})`; c.lineWidth = 2.2; c.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const u = (t * 3.1 + i * 0.37) % 1, y = -88 + i * 17, x0 = 58 + u * 70;
      c.globalAlpha = 1 - u; c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + 26 + rnd(i) * 20, y); c.stroke();
    }
    c.globalAlpha = 1;
  }
  if (P.fog > 0) {                         // หมอกเรี่ยชายผ้า
    for (let i = 0; i < 6; i++) {
      const x = -52 + i * 21 + Math.sin(t * 1.3 + i) * 4, y = -2 + Math.sin(t * 1.7 + i * 2) * 2, r = 13 + (i % 2) * 3;
      const gr = c.createRadialGradient(x, y, 1, x, y, r);
      gr.addColorStop(0, `rgba(214,184,246,${0.42 * P.fog})`); gr.addColorStop(1, 'rgba(214,184,246,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
  }
}
/** หน้าตัว: วงเวท · วาบยิง · ประกายรวมพลัง · วงระเบิด · เกราะผลึก · หมอกจากปาก · เสียงคำราม */
function drawFront(c, P, g, t) {
  const [cx, cy] = cryAt(P, g);
  if (P.gather > 0) {                      // ประกายไหลเข้าผลึก
    for (let i = 0; i < 16; i++) {
      const u = (t * 1.4 + rnd(i)) % 1, r = 82 * (1 - u), a = rnd(i + 3) * TAU;
      c.fillStyle = ['#FFE7A6', '#FFC6E4', '#DCCBFF', '#FFFFFF'][i % 4];
      star4(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, 1.4 + 2.2 * (1 - u), P.gather * Math.min(1, u * 3));
    }
  }
  if (P.magic > 0) {                       // วงเวทหน้าฝ่ามือ (หันข้างเข้าหาน้อง = วงรีแคบ)
    const m = ease(P.magic), mx = P.magicAt ? P.magicAt[0] : cx - 38, ry = 25 * m, rx = 6 + 2.5 * m;
    const cy0 = cy, cyM = P.magicAt ? P.magicAt[1] : cy0;
    let gr = c.createRadialGradient(mx, cyM, 1, mx, cyM, 30 * m + 1);
    gr.addColorStop(0, `rgba(255,236,255,${0.55 * m})`); gr.addColorStop(1, 'rgba(230,190,255,0)');
    c.fillStyle = gr; c.beginPath(); c.ellipse(mx, cyM, 18 * m + 1, 30 * m + 1, 0, 0, TAU); c.fill();
    c.save(); c.shadowColor = 'rgba(255,170,230,.95)'; c.shadowBlur = 8;
    c.strokeStyle = `rgba(255,230,250,${0.9 * m})`; c.lineWidth = 2;
    c.beginPath(); c.ellipse(mx, cyM, rx, ry, 0, 0, TAU); c.stroke();
    c.strokeStyle = `rgba(214,170,255,${0.8 * m})`; c.lineWidth = 1.3;
    c.beginPath(); c.ellipse(mx, cyM, rx * 0.62, ry * 0.68, 0, 0, TAU); c.stroke();
    c.restore();
    c.fillStyle = '#FFF4FF';
    for (let i = 0; i < 8; i++) { const a = t * 3 + (i / 8) * TAU; star4(c, mx + Math.cos(a) * rx * 0.82, cyM + Math.sin(a) * ry * 0.84, 1.8, m * (0.6 + 0.4 * Math.sin(t * 8 + i))); }
    if (P.cast > 0) {
      gr = c.createRadialGradient(mx, cyM, 1, mx, cyM, 26);
      gr.addColorStop(0, `rgba(255,255,255,${0.9 * P.cast})`); gr.addColorStop(1, 'rgba(255,220,255,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(mx, cyM, 26, 0, TAU); c.fill();
      c.fillStyle = '#FFFFFF'; star4(c, mx, cyM, 6 + P.cast * 9, P.cast);
    }
  }
  if (P.burstFlash > 0) {
    const gr = c.createRadialGradient(cx, cy, 2, cx, cy, 70);
    gr.addColorStop(0, `rgba(255,255,255,${0.75 * P.burstFlash})`); gr.addColorStop(1, 'rgba(255,200,240,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, 70, 0, TAU); c.fill();
  }
  if (P.ring >= 0) {                       // วงพลังรอบตัว (วงคลื่นพื้นจริงหน้าเกมวาดต่อ)
    const r = 46 + P.ring * 74, a = 1 - P.ring;
    c.strokeStyle = `rgba(255,236,255,${0.85 * a})`; c.lineWidth = 7 * a + 1;
    c.beginPath(); c.ellipse(0, -46, r, r * 0.92, 0, 0, TAU); c.stroke();
    c.strokeStyle = `rgba(255,150,206,${0.6 * a})`; c.lineWidth = 3 * a + 0.5;
    c.beginPath(); c.ellipse(0, -46, r * 0.9, r * 0.83, 0, 0, TAU); c.stroke();
    c.fillStyle = '#E9DAFF';
    for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU + 0.3; drawGemBit(c, Math.cos(an) * r, -46 + Math.sin(an) * r * 0.92, 5, an + t * 3, a); }
  }
  if (P.dome > 0) drawDome(c, P.dome, t);
  if (P.domeBreak >= 0 && P.domeBreak < 1) {
    const k = P.domeBreak;
    for (let i = 0; i < 18; i++) {
      const an = (i / 18) * TAU + rnd(i) * 0.3, d = 78 + k * (50 + rnd(i + 2) * 60);
      drawGemBit(c, Math.cos(an) * d, -50 + Math.sin(an) * d * 0.95 + k * k * 30, 5 + rnd(i + 5) * 4, an + k * 6, 1 - k);
    }
    const gr = c.createRadialGradient(0, -50, 10, 0, -50, 90);
    gr.addColorStop(0, `rgba(255,255,255,${0.5 * (1 - k)})`); gr.addColorStop(1, 'rgba(230,200,255,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(0, -50, 90, 0, TAU); c.fill();
  }
  if (P.fogPuff >= 0) {                    // หมอกพวยออกจากปากไปทางน้อง
    const [mx, my] = g.mouth, ph = P.fogPuff;
    for (let j = 0; j < 4; j++) {
      const k = clamp(ph * 1.2 - j * 0.12);
      c.fillStyle = `rgba(214,190,246,${0.7 * (1 - k) * (k > 0 ? 1 : 0)})`;
      c.beginPath(); c.arc(mx - 8 - k * 52 - j * 5, my + 3 - k * 5 + j * 3, 3.5 + k * 11 - j, 0, TAU); c.fill();
    }
  }
  if (P.roar > 0) {                        // เสียงคำราม
    const [mx, my] = g.mouth;
    for (let j = 0; j < 3; j++) {
      const r = 12 + j * 8 + ((t * 40) % 8);
      c.strokeStyle = `rgba(255,170,200,${P.roar * (0.8 - j * 0.22)})`; c.lineWidth = 2.6 - j * 0.5; c.lineCap = 'round';
      c.beginPath(); c.arc(mx, my, r, Math.PI - 0.55, Math.PI + 0.55); c.stroke();
    }
  }
}
/** เศษผลึกเล็ก (ประกายในวงระเบิด / เกราะแตก) */
function drawGemBit(c, x, y, r, rot, a) {
  if (a <= 0.01) return;
  c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha *= a;
  const gr = c.createLinearGradient(-r, -r, r, r);
  gr.addColorStop(0, '#CFF4FF'); gr.addColorStop(0.5, '#DCC8FF'); gr.addColorStop(1, '#F8C6EE');
  c.fillStyle = gr; c.beginPath(); c.moveTo(0, -r); c.lineTo(r * 0.62, 0); c.lineTo(0, r); c.lineTo(-r * 0.62, 0); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(0, -r); c.lineTo(-r * 0.62, 0); c.lineTo(0, -r * 0.1); c.closePath(); c.fill();
  c.restore();
}
/** เกราะผลึกทรงกลมเหลี่ยม (low-poly) + หินผลึกโคจรรอบตัว */
function drawDome(c, d, t) {
  const k = ease(d), R = 80 * pop(d), cy = -50, n = 12;
  c.save(); c.globalAlpha *= k;
  const O = [], I = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + t * 0.25, b = a + TAU / (n * 2);
    O.push([Math.cos(a) * R, cy + Math.sin(a) * R * 0.96]); I.push([Math.cos(b) * R * 0.56, cy + Math.sin(b) * R * 0.54]);
  }
  const tri = (p1, p2, p3, f) => { c.fillStyle = f; c.beginPath(); c.moveTo(...p1); c.lineTo(...p2); c.lineTo(...p3); c.closePath(); c.fill(); };
  const bg = c.createRadialGradient(0, cy, R * 0.3, 0, cy, R);
  bg.addColorStop(0, 'rgba(206,176,255,.06)'); bg.addColorStop(1, 'rgba(196,160,255,.26)');
  c.fillStyle = bg; c.beginPath(); c.ellipse(0, cy, R, R * 0.96, 0, 0, TAU); c.fill();
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, lit = 0.5 + 0.5 * Math.cos((i / n) * TAU + 2.3);
    tri(O[i], O[j], I[i], `rgba(${lit > 0.6 ? '196,232,255' : '206,178,255'},${0.22 + lit * 0.16})`);
    tri(I[i], O[j], I[j], `rgba(240,200,250,${0.08 + lit * 0.1})`);
    tri([0, cy], I[i], I[j], `rgba(230,214,255,${0.05 + lit * 0.06})`);
  }
  c.strokeStyle = 'rgba(255,255,255,.42)'; c.lineWidth = 1; c.lineJoin = 'round';
  c.beginPath();
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; c.moveTo(...O[i]); c.lineTo(...O[j]); c.lineTo(...I[i]); c.lineTo(...O[i]); c.moveTo(...I[i]); c.lineTo(...I[j]); }
  c.stroke();
  c.save(); c.shadowColor = 'rgba(200,160,255,.9)'; c.shadowBlur = 8;
  c.strokeStyle = 'rgba(236,220,255,.75)'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(0, cy, R, R * 0.96, 0, 0, TAU); c.stroke();
  c.restore();
  c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2.6;
  c.beginPath(); c.ellipse(0, cy, R * 0.97, R * 0.93, 0, Math.PI * 1.05, Math.PI * 1.45); c.stroke();
  for (let i = 0; i < 6; i++) {
    const a = t * 1.8 + (i / 6) * TAU;
    drawGemBit(c, Math.cos(a) * (R + 12), cy + 8 + Math.sin(a) * 24, 6, a * 0.5, 0.75 + 0.25 * Math.sin(a));
  }
  c.restore();
}

// ───────────────────────── ซ้อนชั้น (จางทั้งตัว / กระพริบขาวตอนโดนตี) ─────────────────────────
const LAYERS = [];
function layer(n, cv) {
  let L = LAYERS[n];
  if (!L) { L = document.createElement('canvas'); LAYERS[n] = L; }
  if (L.width !== cv.width || L.height !== cv.height) { L.width = cv.width; L.height = cv.height; }
  return L;
}
function withLayer(ctx, n, alpha, flash, fn, post, ink) {
  if (alpha >= 0.999 && flash <= 0.001 && !post && !ink) { fn(ctx); return; }
  if (alpha <= 0.001) return;
  const L = layer(n, ctx.canvas), c = L.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, L.width, L.height);
  c.setTransform(ctx.getTransform());
  fn(c);
  if (post) { c.save(); post(c); c.restore(); }
  if (flash > 0) {                         // วาบขาว (โดนตี / กำลังกลายเป็นแสง) — save/restore ไม่ให้สีโปร่งค้างไปรอบถัดไป
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-atop';
    c.fillStyle = `rgba(255,250,255,${flash})`; c.fillRect(0, 0, L.width, L.height);
    c.restore();
  }
  blitInk(ctx, L, alpha, ink && ink.filter, ink && ink.box);
}
/** ความหนาเส้นขอบ (หน่วยบอส) + สี — ใกล้เส้นน้องแมวเมื่อยืนข้างกัน */
const INK_W = 0.9, INK_COL = '#4A2645';

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
  ctx.fillStyle = `rgba(${COL.shadow},${(0.18 + 0.2 * hk) * P.fade * (1 - P.dissolve)})`;
  ctx.beginPath(); ctx.ellipse(P.x * (1 - e) + 4 * P.turn, 0, 46 * (0.75 + 0.25 * hk), 6.5, 0, 0, TAU); ctx.fill();
  drawLand(ctx, P);
  drawGroundGlow(ctx, P, t);
  ctx.save();
  const sh = P.shake ? [Math.sin(t * 61) * P.shake, Math.cos(t * 53) * P.shake * 0.6] : [0, 0];
  ctx.translate(P.x + sh[0], -P.y + sh[1]);
  ctx.translate(0, -50); ctx.rotate(P.rot * (1 - e)); ctx.translate(0, 50);
  ctx.scale(P.sx, P.sy);

  const H = hemGeo(g, t, P), body = bodyPath(g, H);
  const melt = P.dEdge != null ? (c) => meltMask(c, P, t) : null;
  // เส้นขอบ: ทำงานเฉพาะกรอบรอบตัวบอส (เผื่อแขนยื่น/ผลึกลอย) ไม่ใช่ทั้งจอ
  // ตอนแพ้: เส้นจางหายเร็ว ๆ ตอนเริ่มสลายเป็นแสง (ไม่ให้ขอบเส้นสลายมีเส้นดำ)
  const inkOp = P.dissolve > 0 ? 1 - clamp(P.dissolve * 5) : 1;
  const ink = (o.ink ?? INK.on) && inkOp > 0.05
    ? { filter: inkFilter(inkPx(ctx, INK_W), INK_COL, inkOp), box: screenBox(ctx, -150 - e * 140, -240, 150 + e * 140, 30, 12) } : null;
  if (!e) drawBehind(ctx, P, g, t);
  const glowUp = Math.max(flash, P.lightUp || 0);   // โดนตี (วาบ) หรือกำลังสลายเป็นแสง
  withLayer(ctx, 0, P.fade, glowUp, (c) => {
    part(c, 'body', (c) => { drawBranch(c); drawUnder(c, H); drawBody(c, g, H, body, P.turn); drawBodyCracks(c, P, body); });
    part(c, 'leaves', (c) => drawLeaves(c, t, P));
    part(c, 'face', (c) => drawFace(c, P, gaze, t, g));
    if (!ink) part(c, 'flame', (c) => drawFlame(c, P, t));
  }, melt, ink);
  // เปลวบนหัว: ไม่มีเส้นขอบ (ผู้ใช้ 27 พ.ย.) → ชั้นของตัวเอง ยังจาง/วาบ/สลายพร้อมตัว
  if (ink) withLayer(ctx, 2, P.fade, glowUp, (c) => part(c, 'flame', (c) => drawFlame(c, P, t)), melt);
  part(ctx, 'crystal', (c) => drawCrystal(c, P, o, t, g, ink ? inkOp : 0));
  if (ink && (P.armL.glow > 0 || P.armR.glow > 0)) withLayer(ctx, 3, P.fade, 0, (c) => {   // แสงมือ: นอกชั้นเส้น
    part(c, 'armL', (c) => hand(c, g.handL, P.armL, -1, null, 'glow'));
    part(c, 'armR', (c) => hand(c, g.handR, P.armR, 1, null, 'glow'));
  }, melt);
  // แสงจากผลึกตกบนมือ: ผลึกวาดทับตัว (ออร่า + ลำแสง + เรืองขาวก่อนแตก) แต่มือวาดทีหลังผลึก → ต้องย้อมแสงให้มือเอง
  // ไม่งั้นตอนแพ้ตัวสว่างจ้าแต่มือทึบอยู่คู่เดียว (ผู้ใช้ 28 พ.ย.)
  const armLight = e ? 0 : clamp(0.5 * P.rays + 0.9 * P.cryWhite);
  const armPost = armLight > 0.01 || melt ? (c) => { if (armLight > 0.01) armGlow(c, P, g, armLight); if (melt) melt(c); } : null;
  withLayer(ctx, 1, P.fade, glowUp, (c) => {
    const only = ink ? 'solid' : undefined;
    part(c, 'armL', (c) => hand(c, g.handL, P.armL, -1, e ? null : body, only));
    part(c, 'armR', (c) => hand(c, g.handR, P.armR, 1, e ? null : body, only));
  }, armPost, ink);
  if (!e) drawFront(ctx, P, g, t);
  drawBang(ctx, P, g);
  drawPuff(ctx, P, g);
  P.st = st; drawDefeatFx(ctx, P, t);
  ctx.restore();
  // พิกัดพื้น: ผลึกระเบิด + น้องที่หลุดออกมา (ไม่ยืด/เอียงตามตัวบอส)
  drawShatter(ctx, P);
  drawFreedKitten(ctx, P, o, t);
  ctx.restore();
  return P;
}

const BOLT_TINT = { low: '40,196,255', mid: '255,72,156', high: '146,96,255' };   // ต่ำ ฟ้า = กระโดด · กลาง ชมพู = หมอบ · สูง ม่วง = อยู่เฉย
// ═════════════ ของที่ท่าโจมตีปล่อยออกมา (หน้าเกมวาดเองตามตำแหน่งจริง · พิกัดจอ) ═════════════
/** ลูกแสงคริสตัล (ปาเวท): ผลึกเล็กหมุน + ออร่า + หางแสงไปทางขวา · lane ใช้ย้อมสีให้อ่านง่าย */
export function drawStumpBolt(ctx, x, y, t, lane = 'low') {
  const tint = BOLT_TINT[lane] || BOLT_TINT.high;
  ctx.save(); ctx.translate(x, y); ctx.scale(1.35, 1.35);
  let gr = ctx.createLinearGradient(0, 0, 52, 0);
  gr.addColorStop(0, `rgba(${tint},.7)`); gr.addColorStop(1, `rgba(${tint},0)`);
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(28, -5, 52, 0); ctx.quadraticCurveTo(28, 5, 0, 8); ctx.closePath(); ctx.fill();
  gr = ctx.createRadialGradient(0, 0, 1, 0, 0, 19);
  gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.45, `rgba(${tint},.55)`); gr.addColorStop(1, `rgba(${tint},0)`);
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, 19, 0, TAU); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < 3; i++) star4(ctx, 16 + i * 12 + ((t * 120) % 12), Math.sin(t * 9 + i * 2) * 4, 2.2 - i * 0.5, 0.8 - i * 0.2);
  ctx.rotate(t * 7);
  gr = ctx.createLinearGradient(-6, -9, 6, 9);
  gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.45, `rgb(${tint})`); gr.addColorStop(1, `rgba(${tint},.85)`);
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(5.6, 0); ctx.lineTo(0, 9); ctx.lineTo(-5.6, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(-5.6, 0); ctx.lineTo(0, -1); ctx.closePath(); ctx.fill();
  ctx.restore();
}
/** วงคลื่นพลังบนพื้น (ระเบิดพลัง): วงรีรอบบอส + สันคลื่นด้านหน้าสูง h (ส่วนที่ชน) */
// ผู้ใช้ 22 พ.ย.: "วงคลื่นที่ออกมายังไม่สวย อัปเกรด" — เดิมเป็นเส้นวงรีบางเส้นเดียว + ก้อนคลื่นชมพู
// ใหม่: วงพลังบนพื้นเป็นแถบเรืองสามชั้น (ครึ่งหลังจาง ครึ่งหน้าชัด = มีมิติ) + ประกายไฟวิ่งรอบวง + ละอองลอยขึ้นจากวง
//       ด้านหน้า (ส่วนที่ชน) = กำแพงคลื่นผลึกม้วนหน้า: ไล่ขาว → ชมพู → ม่วง มีแถบแสงขอบหน้า ผลึกแหลมโผล่จากยอด
//       ฝอยประกายพ่นจากยอด · ฝุ่นดินฟุ้งหน้าคลื่น · เส้นความเร็วลากหลัง — ความสูงที่ชน (h) ตรงกับยอดคลื่นเหมือนเดิม
export function drawStumpRing(ctx, cx, gy, r, h, t) {
  const fx = cx - r, a = clamp(1 - (r - 600) / 500), ry = Math.min(30, r * 0.1), y0 = gy - 2;
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.lineCap = 'round';
  // ── วงพลังบนพื้น ──
  const fill = ctx.createRadialGradient(cx, y0, Math.max(1, r * 0.7), cx, y0, r);
  fill.addColorStop(0, 'rgba(255,190,230,0)'); fill.addColorStop(1, 'rgba(255,190,230,.16)');
  ctx.save(); ctx.translate(cx, y0); ctx.scale(1, ry / r); ctx.translate(-cx, -y0);
  ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(cx, y0, r, 0, TAU); ctx.fill();
  ctx.restore();
  for (const [s0, s1, k] of [[Math.PI, TAU, 0.45], [0, Math.PI, 1]]) {   // ครึ่งหลัง (บน) จาง · ครึ่งหน้า (ล่าง) ชัด
    for (const [w, col, al] of [[18, '255,120,196', 0.22], [9, '255,182,226', 0.55], [3.2, '255,252,250', 0.95]]) {
      ctx.strokeStyle = `rgba(${col},${al * k})`; ctx.lineWidth = w;
      ctx.beginPath(); ctx.ellipse(cx, y0, r, ry, 0, s0, s1); ctx.stroke();
    }
  }
  // ประกายไฟวิ่งรอบวง (เส้นสั้นสว่าง) + ละอองลอยขึ้นจากวงฝั่งหน้า
  for (let i = 0; i < 10; i++) {
    const an = (i / 10) * TAU + t * 2.2 + r * 0.004, front = Math.sin(an) > 0;
    ctx.strokeStyle = `rgba(255,248,220,${front ? 0.95 : 0.4})`; ctx.lineWidth = front ? 3 : 2;
    ctx.beginPath(); ctx.ellipse(cx, y0, r, ry, 0, an, an + 0.08); ctx.stroke();
  }
  ctx.fillStyle = '#FFF4FB';
  for (let i = 0; i < 14; i++) {
    const an = (i / 14) * Math.PI + 0.1, u = (r * 0.01 + i * 0.37 + t * 1.3) % 1;
    star4(ctx, cx + Math.cos(an) * r, y0 + Math.sin(an) * ry - u * 26, 2 + (i % 3), Math.sin(u * Math.PI) * 0.85);
  }
  // ── กำแพงคลื่นด้านหน้า (ส่วนที่ชน) ──
  const top = gy - h - 3, lip = fx - 4;
  let gr = ctx.createRadialGradient(fx + 8, gy - h * 0.55, 2, fx + 8, gy - h * 0.55, h + 34);
  gr.addColorStop(0, 'rgba(255,150,214,.55)'); gr.addColorStop(1, 'rgba(255,150,214,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(fx + 8, gy - h * 0.55, h + 34, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,200,236,.45)'; ctx.lineWidth = 2;    // เส้นความเร็วลากหลังคลื่น
  for (let i = 0; i < 4; i++) { const y = gy - 6 - i * (h / 4); ctx.beginPath(); ctx.moveTo(fx + 40 + i * 6, y); ctx.lineTo(fx + 76 + i * 16 + (i % 2) * 20, y); ctx.stroke(); }
  /** ลูกคลื่นพลังหนึ่งลูก: หน้าชันโค้งเว้า → ยอดมน → หลังลาด · ไล่ขาว-ชมพู-ม่วง · ฟองแสงเป็นลอนบนยอด · เส้นพลังในเนื้อคลื่น */
  const crest = (bx, hh, al) => {
    const tp = gy - hh - 3;
    const p = new Path2D();
    p.moveTo(bx - 20, gy);
    p.bezierCurveTo(bx - 21, gy - hh * 0.5, bx - 15, tp + 3, bx - 3, tp);
    p.bezierCurveTo(bx + 9, tp - 3, bx + 22, tp + 3, bx + 30, gy - hh * 0.55);
    p.bezierCurveTo(bx + 37, gy - hh * 0.28, bx + 45, gy - 3, bx + 58, gy);
    p.closePath();
    ctx.save(); ctx.globalAlpha *= al;
    let g = ctx.createLinearGradient(0, tp - 4, 0, gy);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.28, '#FFC6E8'); g.addColorStop(0.62, '#EB8ED8'); g.addColorStop(1, 'rgba(146,96,236,.92)');
    ctx.fillStyle = g; ctx.fill(p);
    ctx.save(); ctx.clip(p);
    g = ctx.createLinearGradient(bx - 22, 0, bx + 58, 0);                 // ขอบหน้าสว่าง · หลังคลื่นมีเงาม่วงลึก
    g.addColorStop(0, 'rgba(255,255,255,.8)'); g.addColorStop(0.3, 'rgba(255,255,255,0)'); g.addColorStop(0.72, 'rgba(110,60,190,0)'); g.addColorStop(1, 'rgba(110,60,190,.4)');
    ctx.fillStyle = g; ctx.fillRect(bx - 26, tp - 8, 90, hh + 14);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.6;        // เส้นพลังวิ่งขึ้นในเนื้อคลื่น
    for (let i = 0; i < 3; i++) {
      const x = bx - 8 + i * 12, ph = (t * 3 + i * 0.4) % 1;
      ctx.globalAlpha = al * Math.sin(ph * Math.PI);
      ctx.beginPath(); ctx.moveTo(x, gy - 2); ctx.quadraticCurveTo(x - 6, gy - hh * 0.5, x - 2, gy - hh * (0.4 + 0.5 * ph)); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.92)';                              // ฟองแสงเป็นลอนตามยอด
    for (let i = 0; i < 6; i++) { const x = bx - 13 + i * 6.5, y = tp + 1.5 + i * i * 0.55, rr = (4.6 - i * 0.45) * (0.9 + 0.1 * Math.sin(t * 9 + i)); ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); }
    ctx.restore();
    return tp;
  };
  crest(fx + 30, h * 0.62, 0.7);                                         // ลูกเล็กตามหลัง (ไม่ชน แค่ภาพ)
  crest(fx, h, 1);                                                       // ลูกหน้า = ส่วนที่ชน (สูง h)
  // ผลึกแหลมโผล่จากยอดคลื่น (เหลี่ยมสว่าง/มืด)
  for (const [dx, hh, ww, lean] of [[-2, 15, 4.5, -0.4], [7, 11, 3.6, 0.1], [-9, 9, 3.2, -0.8]]) {
    ctx.save(); ctx.translate(fx + dx, top + 2); ctx.rotate(lean);
    ctx.fillStyle = '#F6EFFF'; ctx.beginPath(); ctx.moveTo(-ww, 0); ctx.lineTo(0, -hh); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#B394F0'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -hh); ctx.lineTo(ww, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // ฝอยประกายพ่นจากยอด (ลอยไปหลัง) + ฝุ่นดินฟุ้งหน้าคลื่น
  for (let i = 0; i < 7; i++) {
    const u = (t * 2.4 + i / 7) % 1, x = lip + u * (24 + i * 4), y = top - 4 - Math.sin(u * Math.PI) * (12 + (i % 3) * 6);
    ctx.fillStyle = i % 2 ? '#FFFFFF' : '#FFE3F4'; star4(ctx, x, y, 2.6 - u * 1.4, 1 - u);
  }
  for (let i = 0; i < 4; i++) {
    const u = (t * 1.8 + i * 0.27) % 1, x = fx - 22 - u * 26 - i * 4, y = gy - 4 - u * 10;
    const g2 = ctx.createRadialGradient(x, y, 0.5, x, y, 6 + u * 8);
    g2.addColorStop(0, `rgba(236,214,246,${0.6 * (1 - u)})`); g2.addColorStop(1, 'rgba(236,214,246,0)');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, y, 6 + u * 8, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
/** ก้อนหมอกหลับใหล (มี zZ ลอย) */
export function drawStumpFog(ctx, x, y, r, t, a = 1) {
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= a;
  for (const [dx, dy, rr, col] of [[-r * 0.55, r * 0.18, 0.62, '140,96,214'], [r * 0.5, r * 0.2, 0.6, '150,104,222'], [0, -r * 0.15, 0.78, '170,124,232'], [-r * 0.15, r * 0.3, 0.6, '124,84,200']]) {
    const R = r * rr * (1 + Math.sin(t * 2.2 + dx) * 0.05);
    const gr = ctx.createRadialGradient(dx - R * 0.3, dy - R * 0.35, 1, dx, dy, R);
    gr.addColorStop(0, 'rgba(240,226,255,.95)'); gr.addColorStop(0.55, `rgba(${col},.85)`); gr.addColorStop(1, `rgba(${col},.9)`);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(dx, dy, R, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#FF7EC8'; ctx.font = '700 12px Mitr, sans-serif'; ctx.textAlign = 'center';
  for (let i = 0; i < 2; i++) { const u = (t * 0.7 + i * 0.5) % 1; ctx.globalAlpha = a * Math.sin(u * Math.PI); ctx.fillText(i ? 'z' : 'Z', r * 0.3 + u * 10 + i * 6, -r * 0.7 - u * 16); }
  ctx.restore();
}
// ── ฝนผลึก: เม็ดผลึกเจียระไน (ไม่มีเส้นขอบ · นูนด้วยหน้าเหลี่ยมสว่าง/มืด + เหลือบรุ้งตามเวลา) ──
/** ขนาดผลึกปักพื้น (หน้าเกมใช้ทำกล่องชน: แคบกว่าภาพนิดหน่อย ให้เฉียดแล้วรอด) */
export const STUMP_RAIN = { spikeH: 46, hitW: 24, hitH: 36, fallR: 15, fallTip: 28 };
const RAIN_LIT = [244, 251, 255], RAIN_MID = [206, 190, 255], RAIN_DEEP = [150, 116, 232], RAIN_PINK = [255, 140, 206];
const rgbS = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
/** แท่งผลึกหกเหลี่ยมยืนบนจุด (0,0) ยอดชี้ขึ้น สูง h กว้างครึ่งหนึ่ง w · hue = เหลือบรุ้ง */
function rainPrism(c, w, h, hue, a = 1) {
  const sh = -h * 0.7, irid = pastelHue(hue, 0.7, 0.86);
  const face = (pts, top, bot) => {
    const gr = c.createLinearGradient(0, -h, 0, 0);
    gr.addColorStop(0, top); gr.addColorStop(1, bot);
    c.fillStyle = gr; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath(); c.fill();
  };
  c.save(); c.globalAlpha *= a;
  const L = -w, R = w, mL = -w * 0.22, mR = w * 0.34;
  // หน้าซ้าย (รับแสง) · หน้ากลาง (เหลือบ) · หน้าขวา (เงา ไล่ชมพูที่โคน)
  face([[L, 0], [L * 0.9, sh], [0, -h], [mL, sh + h * 0.04], [mL * 1.1, 0]], rgbS(RAIN_LIT), rgbS(mixRGB(RAIN_MID, irid, 0.35)));
  face([[mL * 1.1, 0], [mL, sh + h * 0.04], [0, -h], [mR, sh + h * 0.02], [mR * 0.95, 0]], rgbS(mixRGB(RAIN_MID, irid, 0.5)), rgbS(mixRGB(RAIN_DEEP, RAIN_PINK, 0.25)));
  face([[mR * 0.95, 0], [mR, sh + h * 0.02], [0, -h], [R * 0.9, sh], [R, 0]], rgbS(mixRGB(RAIN_DEEP, irid, 0.2)), rgbS(mixRGB(RAIN_DEEP, RAIN_PINK, 0.6)));
  // ยอด: เหลี่ยมหัวสว่างกว่า (แสงมาจากซ้ายบน)
  c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.moveTo(L * 0.9, sh); c.lineTo(0, -h); c.lineTo(mL, sh + h * 0.04); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(mL, sh + h * 0.04); c.lineTo(0, -h); c.lineTo(mR, sh + h * 0.02); c.closePath(); c.fill();
  // แกนเรืองชมพูข้างใน (ลึกจากโคน)
  let gr = c.createRadialGradient(w * 0.1, -h * 0.22, 1, w * 0.1, -h * 0.22, h * 0.42);
  gr.addColorStop(0, rgbS(RAIN_PINK, 0.42)); gr.addColorStop(1, rgbS(RAIN_PINK, 0));
  c.fillStyle = gr; c.beginPath(); c.moveTo(L, 0); c.lineTo(L * 0.9, sh); c.lineTo(0, -h); c.lineTo(R * 0.9, sh); c.lineTo(R, 0); c.closePath(); c.fill();
  // เส้นแสงสะท้อนบนสันซ้าย + จุดวาวโคน
  c.fillStyle = 'rgba(255,255,255,.75)';
  c.beginPath(); c.moveTo(L * 0.78, -h * 0.08); c.lineTo(L * 0.7, sh * 0.96); c.lineTo(-w * 0.12, -h * 0.9); c.lineTo(L * 0.52, sh * 0.9); c.lineTo(L * 0.6, -h * 0.1); c.closePath(); c.fill();
  c.restore();
}
/** ผลึกที่ตกลงมา (ฝนผลึก): ผลึกยาวปลายแหลมชี้ลง + หางแสงด้านบน + ประกายร่วงตาม · rot = เวลาเดิน (ส่าย/เหลือบ) */
export function drawStumpShard(ctx, x, y, rot) {
  const t = rot / 12, L = 46, w = 12.5, tip = STUMP_RAIN.fallTip;
  ctx.save(); ctx.translate(x, y);
  // หางแสง (ยาวขึ้นด้านบน) + ออร่า
  let gr = ctx.createLinearGradient(0, -tip - 84, 0, 0);
  gr.addColorStop(0, 'rgba(206,180,255,0)'); gr.addColorStop(0.7, 'rgba(226,206,255,.5)'); gr.addColorStop(1, 'rgba(255,236,252,.78)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-w * 1.05, -6); ctx.quadraticCurveTo(-w * 0.4, -tip - 40, 0, -tip - 84); ctx.quadraticCurveTo(w * 0.4, -tip - 40, w * 1.05, -6); ctx.closePath(); ctx.fill();
  gr = ctx.createRadialGradient(0, 2, 2, 0, 2, 34);
  gr.addColorStop(0, 'rgba(255,240,252,.78)'); gr.addColorStop(0.5, 'rgba(236,206,255,.38)'); gr.addColorStop(1, 'rgba(214,188,255,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 2, 34, 0, TAU); ctx.fill();
  // ประกายร่วงตามหาง
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < 4; i++) {
    const u = (t * 2.4 + i * 0.25) % 1;
    star4(ctx, Math.sin(i * 2.7 + t * 3) * w * 0.9, -tip - 6 - u * 70, 3 - i * 0.45, (1 - u) * 0.95);
  }
  // ตัวผลึก: ส่ายนิด ๆ · หน้าบนสั้น (ยอดหลัง) หน้าล่างยาว (ปลายแหลมชี้พื้น)
  ctx.rotate(Math.sin(t * 5) * 0.09);
  ctx.save(); ctx.scale(1, -1); rainPrism(ctx, w, tip, t * 40 + x * 0.3); ctx.restore();   // ครึ่งล่าง ชี้ลง
  ctx.save(); ctx.translate(0, 0.5); rainPrism(ctx, w, L - tip, t * 40 + x * 0.3 + 60); ctx.restore();   // ครึ่งบน
  // ประกายที่ปลาย
  ctx.fillStyle = '#FFFFFF'; star4(ctx, 0, tip + 2, 4 + Math.sin(t * 14) * 1.2, 0.9);
  ctx.restore();
}
/** ผลึกปักพื้น (ต้องกระโดดข้าม): กอผลึก 5 แท่ง แท่งกลางสูงสุด + ไฟเรืองที่โคน + เศษผลึกบนพื้น · k = เด้งตอนปัก 0..1 */
export function drawStumpSpike(ctx, x, gy, k, t) {
  const sc = pop(k) * ease(Math.min(1, k * 2)), H = STUMP_RAIN.spikeH, hue = t * 30 + x * 0.25;
  ctx.save(); ctx.translate(x, gy);
  // แสงตกพื้น (ไม่ยืดตามเด้ง ให้พื้นนิ่ง)
  const ga = (0.45 + 0.15 * Math.sin(t * 4)) * ease(k * 1.5);
  let gr = ctx.createRadialGradient(0, -2, 2, 0, -2, 40);
  gr.addColorStop(0, `rgba(255,150,210,${ga})`); gr.addColorStop(0.6, `rgba(196,160,255,${ga * 0.45})`); gr.addColorStop(1, 'rgba(196,160,255,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, -2, 40, 11, 0, 0, TAU); ctx.fill();
  // เศษผลึกบนพื้น
  for (const [dx, r, ro] of [[-24, 3.4, 0.6], [21, 3, -0.5], [-15, 2.2, 1.1], [28, 2, 0.2]]) drawGemBit(ctx, dx, -r * 0.6, r, ro, ease(k * 1.4));
  ctx.beginPath(); ctx.rect(-60, -H * 1.6, 120, H * 1.6 + 3); ctx.clip();   // โคนแท่งเอียงไม่จมทะลุพื้น
  ctx.scale(sc, sc);
  // กอผลึก (หลัง → หน้า): [dx, สูง, กว้างครึ่ง, เอียง]
  const C = [[-11, H * 0.6, 7.5, -0.34], [12, H * 0.52, 7, 0.4], [0, H, 10.5, 0.02], [-19, H * 0.3, 5, -0.7], [19, H * 0.26, 4.5, 0.75]];
  C.forEach(([dx, h, w, lean], i) => { ctx.save(); ctx.translate(dx, 1); ctx.rotate(lean); rainPrism(ctx, w, h, hue + i * 47); ctx.restore(); });
  // ประกายวิบวับที่ยอดแท่งกลาง + ข้าง
  ctx.fillStyle = '#FFFFFF';
  const tw = 0.5 + 0.5 * Math.sin(t * 5.5);
  star4(ctx, -1.5, -H + 2, 3 + tw * 3.2, 0.4 + tw * 0.55);
  star4(ctx, -14 - H * 0.12, -H * 0.55, 1.6 + (1 - tw) * 1.8, 0.3 + (1 - tw) * 0.5);
  ctx.restore();
}
/** วงเตือนบนพื้น ก่อนผลึกตก · k = 0..1 ใกล้ตก (วงหดเข้า + เงาผลึกเข้มขึ้น) */
export function drawStumpMarker(ctx, x, gy, k, t) {
  ctx.save();
  const rx = 34 - 10 * k, ry = 8 - 1.5 * k;
  // เงาผลึกที่กำลังตก (โตขึ้นเรื่อย ๆ)
  let gr = ctx.createRadialGradient(x, gy - 2, 1, x, gy - 2, 10 + 16 * k);
  gr.addColorStop(0, `rgba(150,90,200,${0.12 + 0.3 * k})`); gr.addColorStop(1, 'rgba(150,90,200,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, gy - 2, 10 + 16 * k, 3 + 4 * k, 0, 0, TAU); ctx.fill();
  // วงชมพูกะพริบ
  ctx.globalAlpha = 0.45 + 0.45 * Math.abs(Math.sin(t * 16));
  ctx.fillStyle = `rgba(255,110,170,${0.1 + 0.16 * k})`; ctx.beginPath(); ctx.ellipse(x, gy - 2, rx, ry, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#FF78B0'; ctx.lineWidth = 3; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -t * 40;
  ctx.beginPath(); ctx.ellipse(x, gy - 2, rx, ry, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  // ลูกศรเล็กชี้ลง (ตกตรงนี้)
  ctx.fillStyle = '#FFE6F3';
  const ay = gy - 22 - 6 * Math.abs(Math.sin(t * 8));
  ctx.beginPath(); ctx.moveTo(x - 6, ay); ctx.lineTo(x + 6, ay); ctx.lineTo(x, ay + 7); ctx.closePath(); ctx.fill();
  ctx.restore();
}
/** เส้นเตือนแนวลูกแสง (ก่อนยิง) · a = 0..1 ใกล้ยิง */
export function drawStumpLane(ctx, x0, x1, y, a, t, lane = 'low') {
  const tint = BOLT_TINT[lane] || BOLT_TINT.high;
  ctx.save();
  const gr = ctx.createLinearGradient(x1, 0, x0, 0);
  gr.addColorStop(0, `rgba(${tint},0)`); gr.addColorStop(1, `rgba(${tint},${0.55 * a})`);
  ctx.strokeStyle = gr; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.setLineDash([2, 12]); ctx.lineDashOffset = t * 90;
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  ctx.restore();
}
/** แถบเตือนพุ่งชน: แถบชมพูระดับลำตัว (ช่องล่างว่าง = หมอบลอด) ลูกศรวิ่งไปทางซ้าย · k = 0..1 ใกล้พุ่ง */
export function drawStumpDashWarn(ctx, x1, top, bot, k, t) {
  ctx.save();
  const gr = ctx.createLinearGradient(x1, 0, 0, 0);
  gr.addColorStop(0, `rgba(255,110,156,${0.26 * k})`); gr.addColorStop(1, `rgba(255,110,156,${0.05 * k})`);
  ctx.fillStyle = gr; ctx.fillRect(0, top, x1, bot - top);
  ctx.strokeStyle = `rgba(255,110,156,${0.55 * k})`; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.lineDashOffset = t * 60;
  ctx.beginPath(); ctx.moveTo(x1, bot); ctx.lineTo(0, bot); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = `rgba(255,240,246,${0.8 * k})`;
  const my = (top + bot) / 2;
  for (let i = 0; i < 6; i++) {
    const x = ((x1 - (t * 260 + i * (x1 / 6)) % x1) + x1) % x1;
    ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x + 12, my - 10); ctx.lineTo(x + 7, my); ctx.lineTo(x + 12, my + 10); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
