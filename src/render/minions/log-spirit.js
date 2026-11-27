/**
 * ลูกน้องของบอสภูตตอไม้: วิญญาณท่อนซุงน้อย "ผู้พิทักษ์คริสตัลตัวจิ๋วแห่งป่า"
 * (แบบจากผู้ใช้ 22 พ.ย. 2026 · ภาพใน docs/minion-log/1-sheet.png) — วาดสดด้วยโค้ด
 * เส้นขอบตัดสีหมึกรอบตัว + คริสตัล (ผู้ใช้ขอ 27 พ.ย. ให้เข้ากับน้องแมว · ink-outline.js · ปิดได้ด้วย o.ink = false)
 *   ออร่าคริสตัลกับประกายไม่มีเส้น (วาดนอกชั้นเส้น)
 *
 * เชื่อมกับบอส: วงปีไม้บนหัว · คริสตัลม่วงบนหัว (แหล่งพลัง + อาวุธยิง) · ใบไม้เล็กงอกตามตัว · โทนม่วง ชมพู พีช
 * ต่างจากบอส: ไม่มีแขน · ไม่มีน้องในคริสตัล · ตัวเล็กกลม คล่อง · ตอไม้ลอยบนหมอกม่วง (ไม่ใช่ผ้าคลุม)
 *
 * หน่วย: (0,0) = ก้นหมอกล่างสุดตรงกลาง · ขึ้นบน = y ติดลบ · ก้นหมอก → ขอบตอบนสุด = LOG_SPIRIT.H (100)
 * ตัวเป็นทรงกระบอก: ของบนผิว (ตา ปาก ร่องเปลือก ใบไม้ คริสตัล) วางตามมุมรอบตัว (azimuth: x = R·sin · หน้า/หลัง = cos)
 *   → หันเฉียงตามแบบ (ตาข้างไกลแคบลงเอง) และหมุนตัวได้จริง
 * drawLogSpirit(ctx, x, groundY, s, o) — x = กลางตัว · groundY = พื้น (ลอยเหนือพื้นเอง) · s = พิกเซลต่อหน่วย
 *   o.state · o.st วินาทีในท่า · o.t วินาทีรวม · o.gaze -1 มองซ้าย…1 · o.face บังคับสีหน้า ('angry' | 'squeeze' | 'swirl' | 'sleep')
 *   o.turn 0 = หันหน้าตรง · o.inPlace = ท่าพุ่งไม่เลื่อนตัวเอง (หน้าเกมเลื่อนให้) · o.alt ลอยสูงเพิ่ม · o.explode 0–1 แยกชิ้น
 *   o.shots false = ไม่วาดเศษคริสตัลที่ยิงออกไป (หน้าเกมวาดเองด้วย drawLogSpiritShard)
 * ทุกอย่างคิดจากเวลาอย่างเดียว → ลากเวลาย้อนได้ภาพเดิมเป๊ะ
 */
import { INK, inkFilter, inkPx, screenBox, blitInk } from '../ink-outline.js';

export const LOG_SPIRIT = {
  name: 'วิญญาณท่อนซุงน้อย',
  title: 'ผู้พิทักษ์คริสตัลตัวจิ๋วแห่งป่า',
  H: 100,        // ก้นหมอก → ขอบตอบน (หน่วย)
  hover: 12,     // ลอยเหนือพื้นตอนปกติ
  top: 52,       // เผื่อเหนือหัว: คริสตัล + ท่ากระโดด (หน้าทดสอบใช้จัดภาพให้พอดีจอ)
  halfW: 54,     // ครึ่งความกว้างรวมหมอก
  ratio: 0.75,   // สูงกี่เท่าของน้องแมวตัวโต (ตัวเล็กกว่าน้อง — เหยียบหัวได้)
};

/** ท่าทั้งหมด · loop = วนทุกกี่วินาที · dur = เล่นครั้งเดียวแล้วค้างท่าสุดท้าย (ตามชีตแบบ) */
export const LOG_SPIRIT_STATES = {
  idle:  { name: 'ลอยปกติ',    em: '🪵', note: 'ลอยขึ้นลงคล่อง ๆ · หมอกม่วงพลิ้ว · คริสตัลหมุนช้า ๆ · กะพริบตา', loop: 3.2 },
  dash:  { name: 'พุ่งชน',      em: '💨', note: 'เอนหลังตั้งหลัก แล้วพุ่งเอนหน้า หมอกลากเป็นควันยาว', dur: 1.7 },
  spin:  { name: 'หมุนตัว',     em: '🌀', note: 'ย่อตัวแล้วหมุนรอบตัว 1 รอบ หน้า ใบไม้ คริสตัลหมุนตามจริง', dur: 1.5 },
  hop:   { name: 'กระโดดลอย',  em: '⤴️', note: 'ย่อแล้วเด้งขึ้น ตาหยี หมอกยืดตาม ลงพื้นหมอกกระเซ็น', dur: 1.3 },
  shoot: { name: 'ยิงคริสตัล',  em: '🔮', note: 'คริสตัลบนหัวเรืองพลัง แล้วยิงเศษคริสตัล 3 ลูกไปทางน้อง', dur: 2.0 },
  stomp: { name: 'โดนเหยียบ',  em: '💫', note: 'แบนแต๋ ตาหยี >< · คริสตัลกระเด็นแตก · ตาหมุนแล้วสลายเป็นหมอก', dur: 1.5 },
  dizzy: { name: 'มึนงง',       em: '😵', note: 'ตาหมุน @@ ก้นหอยลอยเหนือหัว โคลงเคลง', loop: 1.6 },
  sleep: { name: 'หลับ',        em: '💤', note: 'หลับตาพริ้ม ลอยช้า ๆ มี Zz', loop: 3.2 },
};
/** จังหวะท่ายิง (วินาทีในท่า) + ความเร็วเศษคริสตัล (หน่วย/วิ) — หน้าเกมปล่อยกระสุนตามนี้ ท่าทางจะตรงกัน */
export const LOG_SPIRIT_ACT = { shoot: [0.6, 0.85, 1.1], shardSpeed: 300 };

// ── สี (ดูดจากภาพแบบ แล้วเข้มขึ้นนิดให้อ่านออกบนฉากป่าม่วง) ──
const C = {
  lip: '#D898A2', top1: '#FDECD5', top2: '#F6CDB9', ring: 'rgba(230,138,146,.55)',
  groove: 'rgba(150,72,120,.2)', grooveHi: 'rgba(255,228,216,.18)',
  leafHi: '#DCD79F', leaf: '#C3C084', leaf2: '#A1A36A',
  eyeW: '#FFF7EB', eyeW2: '#F8E0CB', pupil: '#683A7E', pupil2: '#8B5AA2', ink: '#683A7D', mouth: '#91558A',
  shadow: '150,110,200',
};

const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const easeOut = (k) => { k = clamp(k); return 1 - (1 - k) ** 3; };
const pop = (k) => { k = clamp(k); return 1 + Math.sin(k * Math.PI) * 0.35 * (1 - k); };
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function star4(c, x, y, r, a = 1) {
  if (a <= 0.01) return;
  c.save(); c.globalAlpha *= a; c.translate(x, y);
  c.beginPath();
  for (let i = 0; i < 8; i++) { const ang = (i / 8) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.28 : r; c.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); }
  c.closePath(); c.fill(); c.restore();
}

// ───────────────────────── ท่าทาง ─────────────────────────
export function logSpiritPose(state, st, t, o = {}) {
  const H = LOG_SPIRIT.hover;
  const P = {
    y: H, x: 0, sx: 1, sy: 1, rot: 0, shake: 0, phi: 0,
    eyes: 'angry', lid: 0, mouth: 'caret', mouthOpen: 0,
    flow: 1, trail: 0, lift: 0,                       // หมอก: แรงพลิ้ว · ลากไปข้างหลัง (พุ่ง) · ห้อยลง(+)/บานขึ้น(-)
    cryUp: 0, cryGlow: 0.5, cryRot: 0.4 + Math.sin(t * 0.8) * 0.32, cryFlash: 0, cryShow: 1, cryFly: -1, cryBreak: -1,
    bang: 0, burst: 0, spiral: 0, zzz: 0, speed: 0, swoosh: 0, rise: 0, splash: -1, gather: 0, poof: -1, puffT: -1, shots: [],
  };
  const bob = o.bob === false ? 0 : 1;
  const float = (amp = 1) => {                       // ลอยขึ้นลงคล่อง ๆ (เร็วกว่าบอส)
    const a = amp * bob;
    P.y += Math.sin((t / 1.6) * TAU) * 3 * a;
    P.rot += Math.sin((t / 3.2) * TAU) * 0.035 * amp;
    const br = Math.sin((t / 1.6) * TAU + 0.7) * amp;
    P.sx *= 1 + br * 0.015; P.sy *= 1 - br * 0.015;
    P.lift += Math.cos((t / 1.6) * TAU) * 1.4 * a;    // ลอยขึ้น → หมอกห้อยตามหลัง
  };
  const blink = () => { const bp = (t + 0.7) % 3.4; P.lid = bp < 0.15 ? Math.sin((bp / 0.15) * Math.PI) : 0; };
  if (state === 'idle') { float(); blink(); }
  else if (state === 'dash') {
    const go = !o.inPlace;
    if (st < 0.5) {                        // ตั้งหลัก: เอนหลัง ถอยนิด ย่อ สั่น ตาเรือง
      const k = ease(st / 0.5); float(1 - k);
      P.rot += 0.2 * k; P.x = 7 * k; P.sx *= 1 + 0.1 * k; P.sy *= 1 - 0.1 * k; P.shake = 0.6 * k;
      P.bang = st > 0.05 ? pop((st - 0.05) / 0.3) : 0; P.eyes = 'glow'; P.mouth = 'grit'; P.lift -= 2.5 * k; P.flow = 1 + k;
    } else if (st < 1.05) {                // พุ่ง: เอนหน้า ยืดยาว หมอกลากเป็นควัน
      const u = (st - 0.5) / 0.55, k = ease(clamp(u / 0.2));
      P.x = go ? lerp(7, -64, easeOut(u)) : 7 * (1 - k);
      P.rot = lerp(0.2, -0.26, k); P.sx = lerp(1.1, 1.14, k); P.sy = 0.9; P.y = H + 2;
      P.trail = k; P.speed = k; P.flow = 2.2; P.mouth = 'grit';
    } else {                               // เบรก เอนหลังนิด แล้วลอยกลับที่
      const u = clamp((st - 1.05) / 0.65), k = ease(u);
      P.x = go ? lerp(-64, 0, k) : 0;
      P.rot = lerp(-0.26, 0, k) + 0.16 * Math.sin(Math.PI * clamp(u / 0.45)) * (1 - u);
      P.sx = lerp(1.14, 1, k); P.sy = lerp(0.9, 1, k); P.y = H + 2 * (1 - k);
      P.trail = 1 - ease(clamp(u / 0.55)); P.speed = Math.max(0, 1 - u * 3); P.flow = lerp(2.2, 1, k);
      if (u > 0.6) blink();
    }
  } else if (state === 'spin') {
    if (st < 0.22) {                       // ย่อตัวเตรียมหมุน
      const k = ease(st / 0.22); float(1 - k);
      P.sy *= 1 - 0.08 * k; P.sx *= 1 + 0.06 * k; P.y -= 2 * k; P.lift -= 2 * k;
    } else if (st < 1.12) {                // หมุนรอบตัว 1 รอบ (หน้า/ใบไม้/คริสตัลไปตามมุม) ลอยขึ้นนิด หมอกเหวี่ยง
      const u = (st - 0.22) / 0.9, a = Math.sin(Math.PI * u);
      P.phi = -TAU * ease(u); P.swoosh = a; P.y = H + 7 * a; P.flow = 1 + a; P.sy = 1 + 0.04 * a; P.sx = 1 - 0.03 * a; P.lift = 2.5 * a;
    } else {                               // โคลงตัวหยุด
      const u = clamp((st - 1.12) / 0.38);
      P.rot = 0.09 * Math.sin(u * 3 * Math.PI) * (1 - u); P.sy = 1 - 0.06 * Math.sin(u * Math.PI) * (1 - u); P.flow = lerp(1.6, 1, u);
    }
  } else if (state === 'hop') {
    if (st < 0.2) {                        // ย่อสปริง หมอกบานออก
      const k = ease(st / 0.2);
      P.sy = 1 - 0.16 * k; P.sx = 1 + 0.13 * k; P.y = H - 3 * k; P.lift = -3 * k;
    } else if (st < 0.85) {                // ลอยขึ้น ตาหยี เอนหน้า หมอกยืดลงตาม
      const u = (st - 0.2) / 0.65, a = Math.sin(Math.PI * u);
      P.y = H + 46 * a; P.sy = lerp(1.14, 1, clamp(u * 2.2)); P.sx = lerp(0.9, 1, clamp(u * 2.2));
      P.rot = -0.18 * Math.sin(Math.PI * clamp(u * 1.1)); P.lift = 4 * (1 - u) - 1; P.flow = 1.8; P.rise = a * (u < 0.5 ? 1 : 0.4);
      P.eyes = u < 0.8 ? 'squeeze' : 'angry';
    } else {                               // ลงพื้น: ยุบ หมอกกระเซ็นสองข้าง
      const u = clamp((st - 0.85) / 0.45), sq = Math.sin(clamp(u / 0.35) * Math.PI) * (1 - u);
      P.sy = 1 - 0.2 * sq; P.sx = 1 + 0.16 * sq; P.y = H - 3 * sq; P.lift = -3 * sq; P.splash = u; P.flow = lerp(1.6, 1, u);
    }
  } else if (state === 'shoot') {
    float(0.5);
    const S = LOG_SPIRIT_ACT.shoot;
    if (st < S[0]) {                       // ชาร์จ: เอนหลัง คริสตัลลอยขึ้นเรืองแสง ประกายไหลเข้า
      const k = ease(st / S[0]);
      P.rot += 0.1 * k; P.x = 3 * k; P.cryUp = 6 * k; P.cryGlow = 0.5 + 1.1 * k; P.gather = k; P.eyes = 'glow'; P.shake = 0.35 * k; P.mouth = 'grit';
      P.sy *= 1 + 0.04 * k; P.bang = st > 0.05 ? pop((st - 0.05) / 0.3) : 0;
    } else if (st < S[2] + 0.25) {         // ยิงทีละลูก: ตัวกระตุกถอย + คริสตัลวาบ
      let rec = 0;
      for (const ts of S) if (st >= ts) rec = Math.max(rec, Math.exp(-(st - ts) * 14));
      P.x = 3 + 3.5 * rec; P.rot += 0.1 + 0.07 * rec; P.cryUp = 6 + 2 * rec; P.cryGlow = 1.6; P.cryFlash = rec; P.eyes = 'glow';
      P.mouth = 'open'; P.mouthOpen = 0.3 + 0.7 * rec; P.sx *= 1 + 0.05 * rec; P.sy *= 1 - 0.05 * rec;
    } else {                               // คืนท่า
      const k = ease((st - S[2] - 0.25) / 0.65);
      P.x = 3 * (1 - k); P.rot += 0.1 * (1 - k); P.cryUp = 6 * (1 - k); P.cryGlow = lerp(1.6, 0.5, k); P.eyes = k < 0.5 ? 'glow' : 'angry';
    }
    for (const ts of S) if (st >= ts) P.shots.push(st - ts);
  } else if (state === 'stomp') {
    // โดนเหยียบ: แบนแต๋ → เด้งโคลง ตาหมุน → สลายเป็นก้อนหมอก · คริสตัลกระเด็นขึ้นแล้วแตกเป็นประกาย
    P.cryShow = 0; P.cryFly = st;
    if (st >= 0.34) P.cryBreak = st - 0.34;
    if (st < 0.16) {
      const k = Math.sin(((st / 0.16) * Math.PI) / 2);
      P.sy = 1 - 0.42 * k; P.sx = 1 + 0.32 * k; P.y = H - 5 * k; P.eyes = 'squeeze'; P.mouth = 'open'; P.mouthOpen = 0.6; P.lift = -3 * k;
    } else if (st < 0.55) {
      const u = (st - 0.16) / 0.39, sq = 0.42 * (1 - ease(u)) * Math.cos(u * 2.5 * Math.PI) * (u < 0.2 ? 1 : 0.45);
      P.sy = 1 - sq; P.sx = 1 + sq * 0.75; P.y = H - 5 * (1 - ease(u));
      P.eyes = u < 0.3 ? 'squeeze' : 'swirl'; P.mouth = 'wavy'; P.spiral = ease(u * 1.5); P.rot = 0.12 * Math.sin(u * 4 * Math.PI) * (1 - u * 0.5);
    } else {
      const k = clamp((st - 0.55) / 0.45);
      P.eyes = 'swirl'; P.mouth = 'wavy'; P.spiral = 1 - k; P.poof = k; P.rot = 0.06 * Math.sin(st * 20) * (1 - k);
      P.puffT = st - 0.55;
    }
    P.burst = st < 0.6 ? pop(st / 0.4) * (1 - ease((st - 0.35) / 0.25)) : 0;
    P.flow = 1.6;
  } else if (state === 'dizzy') {
    float(0.6);
    P.eyes = 'swirl'; P.mouth = 'wavy'; P.spiral = 1;
    P.rot += Math.sin(t * 3.9) * 0.08; P.x = Math.sin(t * 1.95) * 2.5; P.flow = 1.2;
  } else if (state === 'sleep') {
    const br = Math.sin((t / 3.2) * TAU);
    P.y = H - 3 + br * 2.2 * bob; P.sy = 1 + br * 0.02; P.sx = 1 - br * 0.015; P.lift = -br;
    P.eyes = 'sleep'; P.zzz = 1; P.flow = 0.55; P.cryGlow = 0.32; P.rot = Math.sin((t / 6.4) * TAU) * 0.03;
  }
  // บังคับสีหน้า (หน้าทดสอบ · เทียบกับ Expression Sheet)
  const F = o.face;
  if (F && F !== 'auto' && state !== 'stomp') {
    P.bang = 0; P.burst = 0; P.spiral = 0; P.zzz = 0;
    if (F === 'angry') { P.eyes = 'angry'; P.mouth = 'caret'; P.lid = 0; }
    else if (F === 'squeeze') { P.eyes = 'squeeze'; P.mouth = 'caret'; P.burst = 1; }
    else if (F === 'swirl') { P.eyes = 'swirl'; P.mouth = 'wavy'; P.spiral = 1; }
    else if (F === 'sleep') { P.eyes = 'sleep'; P.mouth = 'caret'; P.zzz = 1; }
  }
  if (o.turn === 0) P.phi += 0.32;    // หันหน้าตรง
  return P;
}

// ───────────────────────── รูปทรง ─────────────────────────
const TOP_Y = -90, RX = 31, RY = 9.4, TILT = RY / RX;
const FACE_AZ = -0.32;                     // หน้าเยื้องซ้าย (หาน้อง) ตามภาพแบบ
const radAt = (y) => lerp(RX, 40.5, clamp((TOP_Y - y) / (TOP_Y + 40)) ** 1.25);   // รัศมีตัวที่ความสูง y (ตอบานป้อมลงล่าง)

// ── ชายล่างแบบบอสใหญ่ (ผู้ใช้ 22 พ.ย.: "หมอกเหมือนกลุ่มควันก้อนเมฆ — วาดข้างล่างให้เหมือนบอส แต่ใช้โทนสีเดิม") ──
// ตัวไม้บานลงเป็นชายผ้าสองชั้นเหมือนภูตตอไม้ (src/render/bosses/stump.js): ชั้นหน้า = แถบชายม้วน ลอนห้อยสลับยอดเว้า ·
// ชั้นใน = ผ้าซับม่วงเข้มโผล่ใต้ยอดเว้า · ปลายสองข้างบานออก · ทุกปมเป็นคลื่นวิ่ง ชั้นในช้ากว่าครึ่งจังหวะ
// สีใช้โทนม่วงอ่อนอมชมพูเดิมของลูกน้อง (ไม่ใช่พีชของบอส): ไม้ครึ่งล่างค่อย ๆ อมม่วง → แถบชายม่วงชมพู → ผ้าซับม่วงเข้ม
// ข้างขวา: top → (c1,c2) → m → (c3,c4) → end (ปลายชายขวา) · ข้างซ้าย: end → (c1,c2) → m → (c3,c4) → top
// hem = ขอบชายชั้นหน้า ขวา → ซ้าย สลับ ลอนห้อย (คู่) / ยอดเว้า (คี่) · under = ขอบผ้าซับ ลอน (คี่) โผล่ใต้ยอดเว้า
const G = {
  R: { top: [RX, TOP_Y], c1: [33.5, -78], c2: [37.5, -64], m: [41.5, -52], c3: [46.5, -40], c4: [57, -31], end: [57, -17] },
  L: { end: [-47, -12.5], c1: [-47.5, -24], c2: [-45, -37], m: [-40.6, -47], c3: [-36.6, -61], c4: [-32.6, -77], top: [-RX, TOP_Y] },
  hem: [[48, -11.5], [39, -12], [27, -0.8], [13, -6], [-6, 1.2], [-23, -8], [-37, -6.4]],
  under: [[42, -13], [36, -4], [27, -5], [13, 3.2], [-6, -3.6], [-23, 1], [-38, -9.6]],
};
const HEM_W = TAU / 1.9;
const bz = (q, u) => { const v = 1 - u; return [0, 1].map((k) => v * v * v * q[0][k] + 3 * v * v * u * q[1][k] + 3 * v * u * u * q[2][k] + u * u * u * q[3][k]); };
/** เส้นผ่านปมแบบหัวลอนนอนราบ · ปลายสองข้างรับต่อจากเส้นข้างตัว (ลงแนวดิ่ง) — สูตรเดียวกับชายบอส */
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
function hemGeo(t, P) {
  const f = P.flow, lift = P.lift, w = t * HEM_W, tr = P.trail;
  const drag = (x, y) => { const back = clamp((x + 20) / 70); return [x + tr * back * back * 10, y - tr * back * 3]; };   // พุ่ง → ชายครึ่งขวาสะบัดไปข้างหลัง
  const wob = (i, ax, ay, ph = 0) => [Math.cos(w - i * 0.95 + ph) * ax * f, Math.sin(w - i * 0.95 + ph) * ay * f];
  const dR = wob(0, 0.7, 0.9), dL = wob(8, 0.6, 0.8);
  const tipR = drag(G.R.end[0] + dR[0], G.R.end[1] + dR[1] + lift * 0.3), tipL = drag(G.L.end[0] + dL[0], G.L.end[1] + dL[1] + lift * 0.3);
  const nodes = G.hem.map(([x, y], i) => {
    const lobe = i % 2 === 0, [dx, dy] = wob(i + 1, lobe ? 0.9 : 0.5, lobe ? 1.9 : 1.1);
    return drag(x + dx, y + dy + lift * (lobe ? 1 : 0.4));
  });
  const under = G.under.map(([x, y], i) => {
    const endN = i === 0 || i === G.under.length - 1, lobe = i % 2 === 1;
    const [dx, dy] = wob(i + 0.5, endN ? 0.2 : 0.9, endN ? 0.3 : lobe ? 2.3 : 1.2, 1.7);
    return drag(x + dx, y + dy + lift * (endN ? 0.3 : lobe ? 1.15 : 0.5));
  });
  // ความหนาแถบม้วน: ลอนห้อยหนา ยอดเว้าบาง ปลายข้างบางสุด · หายใจเบา ๆ ตามคลื่น
  const th = [1.4, ...nodes.map((_, i) => (i % 2 === 0 ? 8.8 : 5.4) * (1 + Math.sin(w - (i + 1) * 0.95 + 0.8) * 0.1 * f)), 1.4];
  const segs = waveSegs([tipR, ...nodes, tipL], true);
  const pts = [];
  segs.forEach((q, j) => { for (let i = j ? 1 : 0; i <= 10; i++) { const u = i / 10, [x, y] = bz(q, u); pts.push([x, y, lerp(th[j], th[j + 1], ease(u))]); } });
  const nP = pts.length;
  pts.forEach((q, i) => { const k = (Math.min(i, nP - 1 - i) - 2) / 12; q.push(ease(k)); });   // ปลายสองข้างแถบบางลงจนหาย
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], L = Math.hypot(tx, ty) || 1;
    pts[i].splice(3, 0, -ty / L, tx / L);   // [x, y, หนา, nx, ny, ค่อย ๆ หายที่ปลาย] · n ชี้เข้าตัว
  }
  return { tipR, tipL, dR, dL, segs, pts, under: waveSegs(under, false), U: under };
}
function bodyPath(H) {
  const p = new Path2D(), R = G.R, L = G.L;
  const c4 = [R.c4[0] + H.dR[0] * 0.5, R.c4[1] + H.dR[1] * 0.5], c1 = [L.c1[0] + H.dL[0] * 0.5, L.c1[1] + H.dL[1] * 0.5];
  p.moveTo(...L.top);
  p.ellipse(0, TOP_Y, RX, RY, 0, Math.PI, 0, false);
  p.bezierCurveTo(...R.c1, ...R.c2, ...R.m);
  p.bezierCurveTo(...R.c3, ...c4, ...H.tipR);
  for (const q of H.segs) p.bezierCurveTo(...q[1], ...q[2], ...q[3]);
  p.bezierCurveTo(...c1, ...L.c2, ...L.m);
  p.bezierCurveTo(...L.c3, ...L.c4, ...L.top);
  p.closePath();
  return p;
}
const along = (c, pts, off) => { c.beginPath(); pts.forEach(([x, y, th, nx, ny, e], i) => { const d = off * e; (i ? c.lineTo : c.moveTo).call(c, x + nx * d, y + ny * d); }); };
/** แถบตามขอบชาย ระหว่างระยะ lo → hi จากขอบล่าง (วัดเข้าตัว) */
function hemStrip(S, lo, hi) {
  const z = new Path2D();
  S.forEach(([x, y, th, nx, ny, e], i) => { const d = lo(th, x) * e; (i ? z.lineTo : z.moveTo).call(z, x + nx * d, y + ny * d); });
  for (let i = S.length - 1; i >= 0; i--) { const [x, y, th, nx, ny, e] = S[i], d = hi(th, x) * e; z.lineTo(x + nx * d, y + ny * d); }
  z.closePath();
  return z;
}
/** ผ้าซับชั้นใน ม่วงเข้ม (วาดก่อนตัว — เห็นแค่ลอนที่ห้อยต่ำกว่าชั้นหน้า) */
function drawUnder(c, H) {
  const U = H.U, p = new Path2D();
  p.moveTo(U[0][0], -30); p.lineTo(...U[0]);
  for (const q of H.under) p.bezierCurveTo(...q[1], ...q[2], ...q[3]);
  p.lineTo(U[U.length - 1][0], -30); p.closePath();
  let gr = c.createLinearGradient(-40, 0, 44, 0);
  gr.addColorStop(0, '#B48ADF'); gr.addColorStop(0.5, '#A27DD8'); gr.addColorStop(1, '#8F6CCB');
  c.fillStyle = gr; c.fill(p);
  c.save(); c.clip(p);
  gr = c.createLinearGradient(0, -12, 0, 3);
  gr.addColorStop(0, 'rgba(84,48,140,.2)'); gr.addColorStop(1, 'rgba(84,48,140,0)');
  c.fillStyle = gr; c.fillRect(-50, -30, 100, 34);
  c.strokeStyle = 'rgba(232,214,252,.42)'; c.lineWidth = 2; c.stroke(p);   // ขอบล่างรับแสงนิด ๆ (ครึ่งในของเส้นเท่านั้น)
  c.lineJoin = 'round';
  c.strokeStyle = 'rgba(66,34,110,.14)'; c.lineWidth = 6.4; along(c, H.pts, 0); c.stroke();   // เงานุ่มใต้ชายชั้นหน้า
  c.strokeStyle = 'rgba(66,34,110,.18)'; c.lineWidth = 3; along(c, H.pts, 0); c.stroke();
  c.restore();
}
const GROOVES = [[-1.22, -50, 3.2], [-0.62, -56, 3.6], [0.02, -46, 3.8], [0.6, -52, 3.6], [1.16, -48, 3.2]];   // [มุมรอบตัว, ปลายล่าง (จางหาย), หนา]
function drawBody(c, P, t, H, body) {
  let gr = c.createLinearGradient(-48, 0, 58, 0);
  gr.addColorStop(0, '#F5BCA9'); gr.addColorStop(0.45, '#E6A2AE'); gr.addColorStop(1, '#B680BA');
  c.fillStyle = gr; c.fill(body);
  c.save(); c.clip(body);
  const all = () => c.fillRect(-70, -112, 150, 130);
  // บนอมน้ำตาลไม้ · ครึ่งล่างค่อย ๆ กลายเป็นม่วงอ่อน (โทนเดิมของลูกน้อง)
  gr = c.createLinearGradient(0, -100, 0, 0);
  gr.addColorStop(0, 'rgba(184,116,96,.22)'); gr.addColorStop(0.3, 'rgba(184,116,96,0)');
  gr.addColorStop(0.44, 'rgba(224,168,236,0)'); gr.addColorStop(0.72, 'rgba(224,168,236,.64)'); gr.addColorStop(1, 'rgba(208,152,236,.84)');
  c.fillStyle = gr; all();
  // ร่องเปลือกแนวตั้ง (วางตามมุมรอบตัว · จางหายลงล่าง)
  c.lineCap = 'round';
  for (const [az0, y1, wd] of GROOVES) {
    const az = az0 + P.phi, dp = Math.cos(az);
    if (dp < 0.1) continue;
    const sn = Math.sin(az), y0 = TOP_Y + RY * dp + 2, ym = (y0 + y1) / 2, al = clamp(dp * 2.2);
    const xa = radAt(y0) * sn, xb = radAt(y1) * sn, xm = radAt(ym) * sn * 1.04;
    const fade = (rgb, a) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, `rgba(${rgb},${a * al})`); g.addColorStop(0.6, `rgba(${rgb},${a * 0.8 * al})`); g.addColorStop(1, `rgba(${rgb},0)`); return g; };
    c.strokeStyle = fade('150,72,120', 0.2); c.lineWidth = wd * (0.45 + 0.55 * dp);
    c.beginPath(); c.moveTo(xa, y0); c.quadraticCurveTo(xm, ym, xb, y1); c.stroke();
    c.strokeStyle = fade('255,228,216', 0.18); c.lineWidth = wd * 0.45 * dp;
    c.beginPath(); c.moveTo(xa - 2.2, y0 + 1.5); c.quadraticCurveTo(xm - 2.2, ym, xb - 2.2, y1 - 1); c.stroke();
  }
  // ── ชายล่างแบบบอส ──
  const S = H.pts;
  // โซนสว่างเหนือแถบม้วน ขอบบนเป็นหยดสีห้อยลงมา (สูตรเดียวกับบอส) — โทนม่วงชมพู
  const drip = (th, x) => th + 13 - 7.5 * Math.max(0, Math.sin(x * 0.21 + 0.6)) ** 1.5 - 4 * Math.max(0, Math.sin(x * 0.37 + 2.1)) ** 2;
  gr = c.createLinearGradient(-48, 0, 58, 0);
  gr.addColorStop(0, 'rgba(246,200,234,.34)'); gr.addColorStop(0.5, 'rgba(236,190,242,.3)'); gr.addColorStop(1, 'rgba(214,172,240,.26)');
  c.fillStyle = gr; c.fill(hemStrip(S, (th) => th - 0.5, drip));
  // แถบม้วนชาย: ชมพูอมม่วงซ้าย → ม่วงอ่อน → ม่วงขวา · ขอบบนไล่นุ่มเข้าเนื้อ ขอบล่างคือขอบตัว
  gr = c.createLinearGradient(-48, 0, 58, 0);
  gr.addColorStop(0, '#EDB4E2'); gr.addColorStop(0.4, '#DDA2EC'); gr.addColorStop(0.68, '#C890E6'); gr.addColorStop(1, '#AE82DE');
  c.globalAlpha = 0.45; c.fillStyle = gr; c.fill(hemStrip(S, (th) => th - 0.5, (th) => th + 2.6)); c.globalAlpha = 1;
  c.fillStyle = gr; c.fill(hemStrip(S, () => -2, (th) => th));
  c.fillStyle = 'rgba(255,236,252,.16)'; c.fill(hemStrip(S, () => -2, (th) => th * 0.45));   // ม้วนผ้าสว่างขึ้นหาขอบล่าง
  // แสงนวลซ้ายบน · เงาฝั่งขวา (ทั้งไม้และชายต่อกันเป็นเนื้อเดียว)
  gr = c.createRadialGradient(-22, -74, 3, -22, -74, 48);
  gr.addColorStop(0, 'rgba(255,234,218,.4)'); gr.addColorStop(1, 'rgba(255,234,218,0)');
  c.fillStyle = gr; all();
  gr = c.createLinearGradient(8, 0, 58, 0);
  gr.addColorStop(0, 'rgba(100,52,150,0)'); gr.addColorStop(1, 'rgba(100,52,150,.3)');
  c.fillStyle = gr; all();
  c.restore();
}
/** เส้นแบ่งชิ้นตอนแยกส่วน (ตอไม้ เหนือเส้น · ชายผ้า ใต้เส้น) */
function splitClip(above) {
  const p = new Path2D();
  p.moveTo(-90, above ? -140 : 30);
  for (let x = -90; x <= 110; x += 4) p.lineTo(x, -30 + 2 * Math.sin(x * 0.17 + 1));
  p.lineTo(110, above ? -140 : 30); p.closePath();
  return p;
}

function drawTop(c, P, t) {
  c.fillStyle = C.lip; c.beginPath(); c.ellipse(0, TOP_Y + 0.8, RX, RY + 0.9, 0, 0, TAU); c.fill();
  let gr = c.createLinearGradient(-RX, TOP_Y - RY, RX, TOP_Y + RY);
  gr.addColorStop(0, C.top1); gr.addColorStop(1, C.top2);
  const face = new Path2D(); face.ellipse(0, TOP_Y, RX - 1.4, RY - 0.7, 0, 0, TAU);
  c.fillStyle = gr; c.fill(face);
  c.save(); c.clip(face);
  // วงปีไม้ขดก้นหอย (หมุนตามตัว)
  c.strokeStyle = C.ring; c.lineWidth = 1.5; c.lineCap = 'round';
  c.beginPath();
  const turns = 3.1, a0 = 0.6 + P.phi;
  for (let a = 0; a <= turns * TAU; a += 0.12) {
    const r = 2.2 + (a / (turns * TAU)) * 22.5;
    c.lineTo(2 + Math.sin(a + a0) * r, TOP_Y + 0.4 + Math.cos(a + a0) * r * TILT);
  }
  c.stroke();
  // แสงบนหน้าตัด
  gr = c.createRadialGradient(-10, TOP_Y - 2, 1, -10, TOP_Y - 2, 22);
  gr.addColorStop(0, 'rgba(255,250,236,.45)'); gr.addColorStop(1, 'rgba(255,250,236,0)');
  c.fillStyle = gr; c.fill(face);
  c.restore();
}

// ── คริสตัลหกเหลี่ยมบนหัว: ปริซึม + ยอดแหลม · หมุนรอบแกนได้จริง (เหลี่ยมเปลี่ยนแสงตามมุม) ──
const CRY = { r0: 11.4, r1: 13.8, hs: 15, ht: 30, az: 1.2, off: 7, lean: 0.1 };
const CRY_STOPS = [[0, [132, 92, 220]], [0.45, [186, 146, 248]], [0.8, [226, 206, 255]], [1, [252, 248, 255]]];
function cryRGB(l, pink = 0) {
  l = clamp(l);
  let i = 0;
  while (i < CRY_STOPS.length - 2 && l > CRY_STOPS[i + 1][0]) i++;
  const [a, ca] = CRY_STOPS[i], [b, cb] = CRY_STOPS[i + 1], k = (l - a) / (b - a);
  return ca.map((v, j) => Math.round(lerp(lerp(v, cb[j], k), [246, 168, 226][j], pink)));
}
const rgb = (a, al = 1) => `rgba(${a[0]},${a[1]},${a[2]},${al})`;
/** (cx, cy) = กลางฐานคริสตัล · rot = มุมหมุนรอบแกน · glow 0..2 · flash 0..1 */
/** only: 'aura' | 'core' | 'stars' = วาดเฉพาะส่วนนั้น (ตอนมีเส้นขอบ เนื้อคริสตัลอยู่ในชั้นเส้น ออร่า/ประกายอยู่นอก) · ไม่ใส่ = ครบ */
function drawCrystalAt(c, cx, cy, rot, glow, flash, t, only) {
  c.save(); c.translate(cx, cy); c.rotate(CRY.lean); c.translate(-cx, -cy);   // เอียงขวานิดตามแบบ
  drawCrystalBody(c, cx, cy, rot, glow, flash, t, only);
  c.restore();
}
function drawCrystalBody(c, cx, cy, rot, glow, flash, t, only) {
  const { r0, r1, hs, ht } = CRY;
  // ออร่า
  let gr;
  if (!only || only === 'aura') {
    gr = c.createRadialGradient(cx, cy - ht * 0.5, 2, cx, cy - ht * 0.5, 22 + glow * 10);
    gr.addColorStop(0, `rgba(226,196,255,${0.32 * glow})`); gr.addColorStop(1, 'rgba(214,180,255,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(cx, cy - ht * 0.5, 22 + glow * 10, 0, TAU); c.fill();
    if (only) return;
  }
  if (only === 'stars') { cryStars(c, cx, cy, t); return; }
  const B = [], S = [], T = [cx + 1.2 + Math.sin(rot) * 0.8, cy - ht];
  for (let j = 0; j < 6; j++) {
    const a = rot + (j * Math.PI) / 3;
    B.push([cx + r0 * Math.sin(a), cy + r0 * Math.cos(a) * TILT]);
    S.push([cx + r1 * Math.sin(a), cy - hs + r1 * Math.cos(a) * TILT]);
  }
  const faces = [];
  for (let j = 0; j < 6; j++) {
    const m = rot + ((j + 0.5) * Math.PI) / 3, d = Math.cos(m), lit = 0.5 - 0.38 * Math.sin(m) + 0.08 * d;
    if (d > 0.02) faces.push({ d, z: 0, pts: [B[j], B[(j + 1) % 6], S[(j + 1) % 6], S[j]], lit });
    if (d > -0.16) faces.push({ d, z: 1, pts: [S[j], S[(j + 1) % 6], T], lit: lit + 0.18 });
  }
  faces.sort((a, b) => a.z - b.z || a.d - b.d);
  if (only === 'core') {                   // เส้นขอบคริสตัล (อยู่ในชั้นเส้นของตัว): ลากก่อนเนื้อ → เหลือครึ่งนอก แยกคริสตัลออกจากหน้าตอ
    const all = new Path2D();
    for (const f of faces) { f.pts.forEach(([x, y], i) => (i ? all.lineTo(x, y) : all.moveTo(x, y))); all.closePath(); }
    c.save(); c.strokeStyle = INK_COL; c.lineWidth = INK_W * 2; c.lineJoin = 'round'; c.stroke(all); c.restore();
  }
  const body = new Path2D();
  for (const f of faces) {
    const p = new Path2D();
    f.pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath();
    body.addPath(p);
    const ys = f.pts.map((q) => q[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
    gr = c.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, rgb(cryRGB(f.lit + 0.08 + glow * 0.05))); gr.addColorStop(1, rgb(cryRGB(f.lit - 0.1 + glow * 0.04, f.z ? 0 : 0.28)));
    c.fillStyle = gr; c.fill(p);
  }
  c.save(); c.clip(body);
  // แสงในเนื้อคริสตัล (ชมพูกลางตัว) + วาบตอนยิง
  gr = c.createRadialGradient(cx - 1, cy - hs * 0.7, 1, cx - 1, cy - hs * 0.7, 16);
  gr.addColorStop(0, `rgba(255,214,246,${0.3 + 0.25 * glow})`); gr.addColorStop(1, 'rgba(255,214,246,0)');
  c.fillStyle = gr; c.fillRect(cx - 14, cy - ht - 2, 28, ht + 6);
  if (flash > 0) { c.fillStyle = `rgba(255,255,255,${0.75 * flash})`; c.fillRect(cx - 14, cy - ht - 2, 28, ht + 6); }
  // สันเหลี่ยมสว่าง (เส้นขาวบางในเนื้อ ไม่ใช่เส้นขอบ)
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 0.7; c.lineJoin = 'round';
  c.beginPath();
  for (let j = 0; j < 6; j++) {
    const a = rot + (j * Math.PI) / 3;
    if (Math.cos(a) > 0) { c.moveTo(B[j][0], B[j][1]); c.lineTo(S[j][0], S[j][1]); c.lineTo(T[0], T[1]); }
  }
  c.stroke();
  c.restore();
  if (!only) cryStars(c, cx, cy, t);
}
/** ประกายกะพริบบนคริสตัล */
function cryStars(c, cx, cy, t) {
  c.fillStyle = '#FFFFFF';
  star4(c, cx - 4.5, cy - CRY.hs - 3, 2.6, 0.4 + 0.6 * Math.max(0, Math.sin(t * 2.6)));
  star4(c, cx + 4, cy - 7, 1.6, 0.3 + 0.7 * Math.max(0, Math.sin(t * 2.6 + 2.1)));
}
const cryBase = (P) => [CRY.off * Math.sin(CRY.az + P.phi), TOP_Y + 0.6 + CRY.off * Math.cos(CRY.az + P.phi) * TILT];

// ── ใบไม้ (ใบมนสองโทน มะกอกอ่อน) ──
const LEAVES = [
  { az: 1.02, rim: true, ang: -0.7, len: 30, w: 12.5, ph: 0 },       // ใบใหญ่บนขอบตอขวา
  { az: 1.3, rim: true, ang: 0.12, len: 22, w: 9.6, ph: 1.4 },
  { az: -1.36, y: -64, ang: 0.5, len: 17, w: 8.2, ph: 2.2 },         // ข้างซ้าย
  { az: 1.34, y: -60, ang: 0.32, len: 17.5, w: 8.4, ph: 3.1 },       // ข้างขวา
];
function leafPose(L, P, t) {
  const az = L.az + P.phi, sn = Math.sin(az), dp = Math.cos(az);
  const x = L.rim ? (RX - 2) * sn : radAt(L.y) * sn * 0.97, y = L.rim ? TOP_Y + (RY - 1) * dp : L.y;
  const side = sn >= 0 ? 1 : -1, sway = Math.sin(t * 2.4 + L.ph) * 0.09 * (1 + P.flow * 0.3);
  return { x, y, ang: side > 0 ? L.ang + sway : Math.PI - L.ang - sway, len: L.len * (0.42 + 0.58 * Math.abs(sn)), w: L.w, depth: dp };
}
function drawLeaf(c, x, y, ang, len, w, depth = 1) {
  c.save(); c.translate(x, y); c.rotate(ang);
  const p = new Path2D();
  p.moveTo(0, 0);
  p.bezierCurveTo(len * 0.22, -w * 1.05, len * 0.72, -w * 1.0, len, -w * 0.08);
  p.bezierCurveTo(len * 0.74, w * 0.92, len * 0.24, w * 0.86, 0, 0);
  const gr = c.createLinearGradient(0, -w, 0, w);
  gr.addColorStop(0, C.leafHi); gr.addColorStop(0.5, C.leaf); gr.addColorStop(1, C.leaf2);
  c.fillStyle = gr; c.fill(p);
  c.save(); c.clip(p);
  c.fillStyle = 'rgba(112,112,64,.2)';
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, w * 0.12, len, -w * 0.08); c.lineTo(len, w * 1.3); c.lineTo(0, w * 1.3); c.closePath(); c.fill();
  if (depth < 0) { c.fillStyle = 'rgba(96,62,120,.16)'; c.fill(p); }
  c.restore();
  c.strokeStyle = 'rgba(255,255,228,.5)'; c.lineWidth = 0.9; c.lineCap = 'round';
  c.beginPath(); c.moveTo(len * 0.1, 0); c.quadraticCurveTo(len * 0.5, w * 0.05, len * 0.86, -w * 0.06); c.stroke();
  c.restore();
}
function drawLeaves(c, P, t, front) {
  for (const L of LEAVES) {
    const q = leafPose(L, P, t);
    if ((q.depth >= 0) === front) drawLeaf(c, q.x, q.y, q.ang, q.len, q.w, q.depth);
  }
}

// ── หน้า ──
const EYE_Y = -54, EYE_R = 37.3, MOUTH_Y = -44.4;
function eye(c, side, P, gaze, t, k) {
  const inn = side < 0 ? 1 : -1;           // ทิศหัวตา (เข้าหาจมูก)
  c.strokeStyle = C.ink; c.lineCap = 'round'; c.lineJoin = 'round';
  if (P.eyes === 'squeeze') {              // >< ปลายชี้เข้าหาจมูก
    c.lineWidth = 3.2;
    c.beginPath(); c.moveTo(-6.4 * inn, -6); c.lineTo(5 * inn, -0.4); c.lineTo(-6.4 * inn, 5.2); c.stroke();
    return;
  }
  if (P.eyes === 'swirl') {                // @@ ก้นหอยหมุน
    c.save(); c.rotate(t * 5 * side); c.lineWidth = 2;
    c.beginPath();
    for (let a = 0; a <= TAU * 2.3; a += 0.2) { const r = 0.6 + (a / (TAU * 2.3)) * 8.6; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.stroke(); c.restore();
    return;
  }
  if (P.eyes === 'sleep') {                // หลับพริ้ม ◡
    c.lineWidth = 2.8;
    c.beginPath(); c.moveTo(-7.4, -0.6); c.quadraticCurveTo(0, 6.4, 7.4, -0.6); c.stroke();
    return;
  }
  // ตาโกรธตามแบบ: ตาขาวรีกลม ถูกเส้นคิ้วตัดเฉียง (หัวตาต่ำ หางตาสูง) · ตาดำม่วงโตห้อยจากคิ้ว ค่อนหัวตา
  const glow = P.eyes === 'glow', RXe = 11, RYe = 10.6;
  const drop = (glow ? 1 : 0) + P.lid * 18;
  const A = [10 * inn, -3.6 + drop], B = [-10 * inn, -11 + drop];
  const cutY = (x) => A[1] + ((B[1] - A[1]) * (x - A[0])) / (B[0] - A[0]);
  c.save();
  c.beginPath(); c.moveTo(15 * inn, cutY(15 * inn)); c.lineTo(-15 * inn, cutY(-15 * inn)); c.lineTo(-15 * inn, 14); c.lineTo(15 * inn, 14); c.closePath();
  c.clip();
  const white = new Path2D(); white.ellipse(0, 0.4, RXe, RYe, 0, 0, TAU);
  if (glow) { c.shadowColor = 'rgba(255,120,190,.95)'; c.shadowBlur = 9; }
  let gr = c.createLinearGradient(0, -8, 0, 10.5);
  gr.addColorStop(0, glow ? '#FFF4F8' : C.eyeW); gr.addColorStop(1, glow ? '#FFB2D0' : C.eyeW2);
  c.fillStyle = gr; c.fill(white);
  c.shadowBlur = 0;
  c.clip(white);
  const px = 2.2 * inn + gaze * 1.3, py = -0.6;
  gr = c.createLinearGradient(0, py - 6, 0, py + 8.4);
  gr.addColorStop(0, C.pupil); gr.addColorStop(1, glow ? '#B0569A' : C.pupil2);
  c.fillStyle = gr; c.beginPath(); c.ellipse(px, py, 7.9, 8.9, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.arc(px - inn * 2.8, py + 3, 1.5, 0, TAU); c.fill();
  c.restore();
  // คิ้วหนาปลายมนบนเส้นตัด (ข้างไกลสั้นลงตามมุม)
  c.lineWidth = glow ? 3.9 : 3.6;
  const tail = -11.6 + (1 - k) * 9;
  c.beginPath(); c.moveTo(9 * inn, cutY(9 * inn) - 0.2); c.lineTo(tail * inn, cutY(tail * inn) - 0.5); c.stroke();
}
function mouth(c, P) {
  c.strokeStyle = C.mouth; c.lineWidth = 2; c.lineCap = 'round'; c.lineJoin = 'round';
  if (P.mouth === 'open') {
    const h = 2 + P.mouthOpen * 2;
    c.fillStyle = '#5E2E5C'; c.beginPath(); c.ellipse(0, 0.6, 3.4, h, 0, 0, TAU); c.fill();
    c.fillStyle = '#E58DAE'; c.beginPath(); c.ellipse(0, 0.6 + h * 0.45, 2.1, h * 0.42, 0, 0, Math.PI); c.fill();
  } else if (P.mouth === 'grit') {
    c.fillStyle = '#5E2E5C'; c.beginPath(); c.roundRect(-4, -1.6, 8, 3.8, 1.9); c.fill();
    c.fillStyle = '#FFF4EA'; c.beginPath(); c.roundRect(-3.2, -0.9, 6.4, 1.5, 0.75); c.fill();
  } else if (P.mouth === 'wavy') {
    c.beginPath(); c.moveTo(-4, 0.6); c.quadraticCurveTo(-2, -1.6, 0, 0.4); c.quadraticCurveTo(2, 2.2, 4, 0); c.stroke();
  } else {                                 // ^ เล็ก ๆ ตามแบบ
    c.beginPath(); c.moveTo(-3.2, 1.7); c.lineTo(0, -1.5); c.lineTo(3.2, 1.7); c.stroke();
  }
}
function drawFace(c, P, gaze, t) {
  const az0 = FACE_AZ + P.phi;
  for (const side of [-1, 1]) {            // แก้มชมพูจาง ๆ ใต้ตา
    const az = az0 + side * 0.5, k = Math.cos(az);
    if (k <= 0.05 || P.eyes === 'swirl') continue;
    const gr = c.createRadialGradient(EYE_R * Math.sin(az), EYE_Y + 10.5, 0.5, EYE_R * Math.sin(az), EYE_Y + 10.5, 6);
    gr.addColorStop(0, `rgba(246,138,168,${0.32 * k})`); gr.addColorStop(1, 'rgba(246,138,168,0)');
    c.fillStyle = gr; c.beginPath(); c.ellipse(EYE_R * Math.sin(az), EYE_Y + 10.5, 6 * k, 3.4, 0, 0, TAU); c.fill();
  }
  for (const side of [-1, 1]) {
    const az = az0 + side * 0.46, k = Math.cos(az);
    if (k <= 0.06) continue;
    c.save(); c.translate(EYE_R * Math.sin(az), EYE_Y); c.scale(k, 1);
    eye(c, side, P, gaze, t, k);
    c.restore();
  }
  const km = Math.cos(az0);
  if (km > 0.06) { c.save(); c.translate(EYE_R * Math.sin(az0) * 0.99, MOUTH_Y); c.scale(km, 1); mouth(c, P); c.restore(); }
}

// ───────────────────────── เอฟเฟกต์ ─────────────────────────
function marks(c, x, y, P, k, cols, angs) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.scale(k, k); c.lineCap = 'round';
  angs.forEach(([a, r0, r1, w], i) => {
    c.strokeStyle = cols[i]; c.lineWidth = w;
    c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); c.stroke();
  });
  c.restore();
}
/** หลังตัว: ควันพุ่ง · เส้นความเร็ว · วงเหวี่ยงตอนหมุน (ครึ่งหลัง) */
function drawBehindFx(c, P, t) {
  if (P.trail > 0) {
    for (let i = 0; i < 10; i++) {
      const u = (t * 2.6 + i / 10) % 1, x = 50 + u * 100 + rnd(i) * 8, y = -10 - rnd(i + 3) * 40 + Math.sin(u * 6 + i) * 3 - u * 8;
      const r = (14 - u * 5) * (0.8 + rnd(i + 7) * 0.4), al = P.trail * (1 - u) ** 1.2, gr = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 0.5, x, y, r);
      gr.addColorStop(0, `rgba(250,234,255,${0.85 * al})`); gr.addColorStop(1, `rgba(206,160,240,${0.7 * al})`);
      c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
  }
  if (P.speed > 0) {
    c.lineCap = 'round'; c.lineWidth = 2.2;
    for (let i = 0; i < 6; i++) {
      const u = (t * 3.2 + i * 0.29) % 1, y = -88 + i * 14, x0 = 46 + u * 60;
      c.strokeStyle = `rgba(255,255,255,${0.8 * P.speed * (1 - u)})`;
      c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + 18 + rnd(i) * 16, y); c.stroke();
    }
  }
  if (P.swoosh > 0) swoosh(c, P, t, false);
}
function swoosh(c, P, t, front) {
  // เส้นโค้งเร็วสองข้างตัว (แบบในชีต "หมุนตัว") · ข้างหน้า = เส้นล่าง ข้างหลัง = เส้นบน
  if (!front) return;
  c.lineCap = 'round';
  for (const sd of [-1, 1]) for (let j = 0; j < 3; j++) {
    const R = 54 + j * 7, a0 = (sd < 0 ? Math.PI : 0) - 0.55 + j * 0.12, sweep = 0.95 - j * 0.2, cy = -52 + j * 4;
    for (let k = 0; k < 6; k++) {
      const u0 = a0 + (sweep * k) / 6, u1 = a0 + (sweep * (k + 1)) / 6, f = Math.sin(((k + 0.5) / 6) * Math.PI);
      c.strokeStyle = `rgba(236,214,255,${0.85 * P.swoosh * f * (1 - j * 0.25)})`; c.lineWidth = (3.4 - j * 0.8) * f + 0.4;
      c.beginPath(); c.arc(0, cy, R, u0, u1); c.stroke();
    }
  }
}
/** หน้าตัว: เครื่องหมายตกใจ · เจ็บ · มึน · หลับ · ประกายรวมพลัง · คริสตัลกระเด็น/แตก · สลายเป็นหมอก */
function drawFrontFx(c, P, t) {
  if (P.swoosh > 0) swoosh(c, P, t, true);
  marks(c, -38, -92, P, P.bang, ['#FFA7D0', '#FF8FC2', '#FFBEDB'], [[-2.25, 9, 21, 4.6], [-1.75, 10, 19, 4.2], [-2.75, 9, 15, 4]]);
  marks(c, 36, -94, P, P.burst, ['#FFD26A', '#FFBF4F', '#FFE08A'], [[-0.95, 9, 20, 4.6], [-0.45, 10, 18, 4.2], [-1.45, 9, 15, 4]]);
  if (P.spiral > 0) {                      // ก้นหอยมึนเหนือหัว
    c.save(); c.translate(-36, -112); c.globalAlpha *= P.spiral; c.rotate(t * 2.2);
    c.strokeStyle = '#C69BEA'; c.lineWidth = 2.6; c.lineCap = 'round';
    c.beginPath(); for (let a = 0; a <= TAU * 1.9; a += 0.18) { const r = 0.8 + (a / (TAU * 1.9)) * 8; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.stroke();
    c.restore();
  }
  if (P.zzz > 0) {
    c.save(); c.fillStyle = '#A774D8'; c.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const u = (t * 0.45 + i / 3) % 1;
      c.globalAlpha = P.zzz * Math.sin(u * Math.PI); c.font = `700 ${9 + i * 2.5}px Mitr, sans-serif`;
      c.fillText(i % 2 ? 'z' : 'Z', 26 + u * 12 + i * 6, -100 - u * 22 - i * 6);
    }
    c.restore();
  }
  if (P.rise > 0) {                        // เส้นลมตอนเด้งขึ้น
    c.lineCap = 'round'; c.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const x = -24 + i * 16, u = (t * 3 + i * 0.27) % 1;
      c.strokeStyle = `rgba(240,224,255,${0.75 * P.rise * (1 - u)})`;
      c.beginPath(); c.moveTo(x, 6 + u * 14); c.lineTo(x, 18 + u * 14); c.stroke();
    }
  }
  if (P.gather > 0) {                      // ประกายไหลเข้าคริสตัล
    const [bx, by] = cryBase(P), cy = by - CRY.ht * 0.55 - P.cryUp;
    for (let i = 0; i < 12; i++) {
      const u = (t * 1.6 + rnd(i)) % 1, r = 46 * (1 - u), a = rnd(i + 3) * TAU;
      c.fillStyle = ['#FFE7A6', '#FFC6E4', '#DCCBFF', '#FFFFFF'][i % 4];
      star4(c, bx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, 1.2 + 1.8 * (1 - u), P.gather * Math.min(1, u * 3));
    }
  }
  // คริสตัลกระเด็นหลุดจากหัว (โดนเหยียบ) → แตกเป็นประกาย
  if (P.cryFly >= 0 && P.cryBreak < 0) {
    const [bx, by] = cryBase(P), tau = P.cryFly;
    const x = bx - 10 * tau, y = by - (160 * tau - 150 * tau * tau);
    c.save(); c.translate(x, y - CRY.ht * 0.5); c.rotate(-tau * 9); c.translate(-x, -(y - CRY.ht * 0.5));
    drawCrystalAt(c, x, y, 0.4 + tau * 14, 1, 0, t);
    c.restore();
  }
  if (P.cryBreak >= 0 && P.cryBreak < 0.8) {
    const [bx, by] = cryBase(P), k = P.cryBreak;
    const tb = 0.34, x0 = bx - 10 * tb, y0 = by - (160 * tb - 150 * tb * tb) - CRY.ht * 0.5;   // จุดที่คริสตัลลอยถึงตอนแตก
    let gr = c.createRadialGradient(x0, y0, 1, x0, y0, 16 + k * 40);
    gr.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - ease(k / 0.35))})`); gr.addColorStop(1, 'rgba(224,190,255,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(x0, y0, 16 + k * 40, 0, TAU); c.fill();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + rnd(i) * 0.5, v = 60 + rnd(i + 2) * 50;
      gemBit(c, x0 + Math.cos(a) * v * k, y0 + Math.sin(a) * v * k * 0.85 + 120 * k * k, 2.6 + rnd(i + 5) * 2.4, a + k * 9, 1 - ease(k / 0.8));
    }
    c.fillStyle = '#FFFFFF'; star4(c, x0, y0, 10 * (1 - k / 0.4), clamp(1 - k / 0.4));
    c.fillStyle = '#FFE7A6';
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.4; star4(c, x0 + Math.cos(a) * (8 + k * 30), y0 + Math.sin(a) * (8 + k * 26), 2.6, clamp(1 - k / 0.6)); }
  }
  // สลาย: ก้อนหมอกบานออก + ประกาย + ใบไม้ปลิว
  if (P.puffT >= 0 && P.puffT < 1) {
    const k = P.puffT, a = 1 - ease(k / 0.95);
    for (let i = 0; i < 10; i++) {
      const an = (i / 10) * TAU + rnd(i) * 0.6, d = 10 + 30 * easeOut(k / 0.6) * (0.7 + rnd(i + 1) * 0.6);
      const x = Math.cos(an) * d, y = -44 + Math.sin(an) * d * 0.8 - k * 10, r = (12 + rnd(i + 4) * 6) * (0.6 + 0.7 * ease(k / 0.5));
      const gr = c.createRadialGradient(x - r * 0.2, y - r * 0.25, 0.5, x, y, r);   // ก้อนหมอกนุ่ม ขอบจางหาย (ไม่ใช่ฟองแข็ง)
      const col = i % 3 ? '206,162,240' : '240,176,224';
      gr.addColorStop(0, `rgba(250,236,255,${0.85 * a})`); gr.addColorStop(0.55, `rgba(${col},${0.55 * a})`); gr.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    for (let i = 0; i < 10; i++) {
      const an = (i / 10) * TAU + 0.3, d = 14 + 46 * easeOut(k / 0.7);
      c.fillStyle = ['#FFE7A6', '#FFC6E4', '#FFFFFF', '#DCCBFF'][i % 4];
      star4(c, Math.cos(an) * d, -44 + Math.sin(an) * d * 0.8 - k * 16, 2.4 + rnd(i) * 1.6, a);
    }
    for (let i = 0; i < 3; i++) {
      const L = LEAVES[i], q = leafPose(L, P, 0), sw = Math.sin(k * 7 + i * 2);
      drawLeaf(c, q.x * 0.6 + sw * 6 + (i - 1) * k * 22, q.y * 0.55 + k * k * 46 - 10 * k, q.ang + k * 4 * (i % 2 ? 1 : -1), L.len * 0.8, L.w * 0.8);
    }
  }
}
function gemBit(c, x, y, r, rot, a) {
  if (a <= 0.01) return;
  c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha *= a;
  const gr = c.createLinearGradient(-r, -r, r, r);
  gr.addColorStop(0, '#F4EAFF'); gr.addColorStop(0.5, '#C9A8FA'); gr.addColorStop(1, '#F2B6E6');
  c.fillStyle = gr; c.beginPath(); c.moveTo(0, -r); c.lineTo(r * 0.62, 0); c.lineTo(0, r); c.lineTo(-r * 0.62, 0); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(0, -r); c.lineTo(-r * 0.62, 0); c.lineTo(0, -r * 0.1); c.closePath(); c.fill();
  c.restore();
}
/** หมอกกระเซ็นตอนลงพื้น (พิกัดพื้น) */
function drawSplash(c, P) {
  if (P.splash < 0 || P.splash >= 1) return;
  const k = P.splash, a = (1 - k) * 0.7;
  for (const sd of [-1, 1]) for (let j = 0; j < 4; j++) {
    c.fillStyle = `rgba(226,196,246,${a * (1 - j * 0.14)})`;
    c.beginPath(); c.arc(P.x + sd * (26 + k * (34 + j * 10) + j * 6), -2 - k * (3 + j * 1.6), 4 + k * 6 - j * 0.5, 0, TAU); c.fill();
  }
}

// ───────────────────────── ซ้อนชั้น (จางทั้งตัวตอนสลาย) ─────────────────────────
let LAYER = null;
function withLayer(ctx, alpha, fn, ink) {
  if (alpha <= 0.001) return;
  if (!LAYER) LAYER = document.createElement('canvas');
  const L = LAYER;
  if (L.width !== ctx.canvas.width || L.height !== ctx.canvas.height) { L.width = ctx.canvas.width; L.height = ctx.canvas.height; }
  const c = L.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, L.width, L.height);
  c.setTransform(ctx.getTransform());
  c.save(); fn(c); c.restore();
  blitInk(ctx, L, alpha, ink && ink.filter, ink && ink.box);
}
/** ความหนาเส้นขอบ (หน่วยลูกน้อง) + สี — ตัวเล็กกว่าบอส หน่วยเล็กกว่า → หน่วยมากกว่าให้ออกมาหนาพอ ๆ กันบนจอ */
const INK_W = 0.8, INK_COL = '#4A2645';

const EXPLODE = { skirt: [0, 30], wood: [0, 0], face: [-58, 4], crystal: [10, -52], leaves: [52, -16] };

/** วาดลูกน้อง · คืนค่าท่าที่ใช้ */
export function drawLogSpirit(ctx, x, groundY, s, o = {}) {
  const state = o.state || 'idle', t = o.t || 0, st = o.st || 0;
  const P = logSpiritPose(state, st, t, o);
  const e = o.explode || 0, gaze = o.gaze ?? -1, hgt = P.y + (o.alt || 0);
  const off = (k) => [EXPLODE[k][0] * e, EXPLODE[k][1] * e];
  const part = (c, k, fn) => { if (!e) { fn(c); return; } c.save(); const [dx, dy] = off(k); c.translate(dx, dy); fn(c); c.restore(); };
  const gone = P.poof >= 0 ? 1 - ease(P.poof) : 1;

  ctx.save();
  ctx.translate(x, groundY);
  ctx.scale(s, s);
  const hk = clamp(1 - hgt / 70);
  ctx.fillStyle = `rgba(${C.shadow},${(0.14 + 0.16 * hk) * gone})`;
  ctx.beginPath(); ctx.ellipse(P.x * (1 - e) + 3, 0, 40 * (0.7 + 0.3 * hk), 5, 0, 0, TAU); ctx.fill();
  drawSplash(ctx, P);
  ctx.save();
  const sh = P.shake ? [Math.sin(t * 61) * P.shake, Math.cos(t * 53) * P.shake * 0.6] : [0, 0];
  ctx.translate(P.x + sh[0], -hgt + sh[1]);
  if (!e) drawBehindFx(ctx, P, t);
  const ink = (o.ink ?? INK.on) ? { filter: inkFilter(inkPx(ctx, INK_W), INK_COL), box: screenBox(ctx, -110 - e * 70, -200 - e * 60, 110 + e * 70, 50 + e * 40, 12) } : null;
  const place = (c) => {
    c.translate(0, -50); c.rotate(P.rot * (1 - e)); c.translate(0, 50);
    c.scale(P.sx, P.sy);
    if (P.poof >= 0) { const k = ease(P.poof); c.translate(0, -45); c.scale(1 - 0.45 * k, 1 - 0.55 * k); c.translate(0, 45); }
  };
  const cry = (c, only) => { if (P.cryShow) part(c, 'crystal', (c) => { const [bx, by] = cryBase(P); drawCrystalAt(c, bx, by - P.cryUp, P.cryRot + P.phi, P.cryGlow, P.cryFlash, t, only); }); };
  const body = (c) => {
    place(c);
    const H = hemGeo(t, P), path = bodyPath(H);
    part(c, 'leaves', (c) => drawLeaves(c, P, t, false));
    if (!e) { drawUnder(c, H); drawBody(c, P, t, H, path); }
    else {   // แยกชิ้น: ชายผ้าสองชั้น (ใต้เส้น) กับตอไม้ (เหนือเส้น) — ภาพเดียวกันตัดแบ่ง ตอนรวมจึงต่อกันสนิท
      part(c, 'skirt', (c) => { drawUnder(c, H); c.save(); c.clip(splitClip(false)); drawBody(c, P, t, H, path); c.restore(); });
      part(c, 'wood', (c) => { c.save(); c.clip(splitClip(true)); drawBody(c, P, t, H, path); c.restore(); });
    }
    part(c, 'wood', (c) => drawTop(c, P, t));
    part(c, 'face', (c) => drawFace(c, P, gaze, t));
    cry(c, ink ? 'core' : undefined);
    part(c, 'leaves', (c) => drawLeaves(c, P, t, true));
  };
  if (ink) {                               // ออร่า (หลังตัว) → ตัว+คริสตัลในชั้นเส้น → ประกาย
    const extra = (only) => { if (!P.cryShow) return; const fn = (c) => { place(c); cry(c, only); }; if (gone < 0.999) withLayer(ctx, gone, fn); else { ctx.save(); fn(ctx); ctx.restore(); } };
    extra('aura');
    withLayer(ctx, gone, body, ink);
    extra('stars');
  } else if (P.poof >= 0) withLayer(ctx, gone, body);
  else { ctx.save(); body(ctx); ctx.restore(); }
  if (!e) drawFrontFx(ctx, P, t);
  ctx.restore();
  // เศษคริสตัลที่ยิงออกไป (หน้าทดสอบ · หน้าเกมวาดเองตามตำแหน่งจริง)
  if (o.shots !== false && P.shots.length) {
    const x0 = P.x - 4, y0 = -hgt + TOP_Y - P.cryUp - CRY.ht * 0.6;
    for (const dt of P.shots) {
      if (dt > 1.4) continue;
      const sx = x0 - LOG_SPIRIT_ACT.shardSpeed * dt, sy = y0 + 22 * dt;
      if (dt < 0.12) {                     // วาบตอนออกจากคริสตัล
        const gr = ctx.createRadialGradient(x0, y0, 1, x0, y0, 16);
        gr.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - dt / 0.12)})`); gr.addColorStop(1, 'rgba(230,200,255,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x0, y0, 16, 0, TAU); ctx.fill();
      }
      drawLogSpiritShard(ctx, sx, sy, t + dt, 1, clamp((1.4 - dt) / 0.3));
    }
  }
  ctx.restore();
  return P;
}

/** เศษคริสตัลที่ลูกน้องยิง (บินไปทางซ้าย) · พิกัดของผู้เรียก · sc = ขนาด (1 = หน่วยลูกน้อง) */
export function drawLogSpiritShard(ctx, x, y, t, sc = 1, a = 1) {
  if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha *= a;
  let gr = ctx.createLinearGradient(0, 0, 42, 0);
  gr.addColorStop(0, 'rgba(206,164,255,.75)'); gr.addColorStop(1, 'rgba(255,186,236,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(2, -5.5); ctx.quadraticCurveTo(22, -3, 42, 0); ctx.quadraticCurveTo(22, 3, 2, 5.5); ctx.closePath(); ctx.fill();
  gr = ctx.createRadialGradient(0, 0, 1, 0, 0, 15);
  gr.addColorStop(0, 'rgba(255,242,255,.9)'); gr.addColorStop(0.5, 'rgba(200,154,255,.42)'); gr.addColorStop(1, 'rgba(200,154,255,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < 3; i++) star4(ctx, 13 + i * 9 + ((t * 90) % 9), Math.sin(t * 8 + i * 2) * 3, 1.9 - i * 0.4, 0.85 - i * 0.2);
  ctx.rotate(-0.22 + Math.sin(t * 10) * 0.14);
  const Q = [[-8.5, 0], [-2.5, -6.4], [4.6, -5.2], [8, 0], [4.6, 5.2], [-2.5, 6.4]], M = [0.6, -0.6];
  const cols = ['#F7F0FF', '#DCC6FD', '#C3A2F8', '#AE88EE', '#C9AAF8', '#E6D6FE'];
  for (let i = 0; i < 6; i++) {
    const p = Q[i], q = Q[(i + 1) % 6];
    ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(M[0], M[1]); ctx.lineTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.85)'; star4(ctx, -3, -2.4, 2.2, 0.8 + 0.2 * Math.sin(t * 9));
  ctx.restore();
}
