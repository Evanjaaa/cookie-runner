// src/render/cat-moji.js
// ─────────────────────────────────────────────────────────────
// น้องแมวส้มตัวหลัก · ลายเส้นใหม่จากนักวาด (โมจิ) — ไฟล์ src/render/cat2/cat-orange-front.svg (อ่านผ่าน moji-svg.js)
// ตอนนี้อยู่แค่หน้า cat-lab (ยืนเทียบกับน้องแบบเดิม cat2.js) ยังไม่เข้าเกม · ไม่แตะตัววาดเดิม
//
// ไม่ได้แปะเป็นรูป: อ่านทุกชิ้นจาก SVG เป็นคำสั่งเส้น แล้ววาดเองบน Canvas ตามแบบทุกชั้น
// (สีไล่ เงาขน ลาย ครีม หูใน ตา แก้ม) — สีมาจากไฟล์นักวาดตรง ๆ ไม่ได้แทนด้วยจานสีของตัวเดิม
//
// ── ขยับด้วยจังหวะเดียวกับน้องแบบเดิม ──
// หายใจ ถ่ายน้ำหนัก หัวเอียง หูกระดิก กะพริบ กลอกตา ปากเมี้ยว และท่าแขน (IK) ใช้สูตร/ค่าชุดเดียวกับ drawCat2
// (ฟังก์ชันจังหวะดึงจาก CAT2_RIG ใน cat2.js) — ยืนเทียบกันแล้วขยับพร้อมกันทุกเฟรม
// ชิ้นส่วนดัดทีละจุดแบบเดียวกับ cat2 (โคนแขน/ขาแทบไม่ขยับ ปลายขยับเต็ม) ขอบจึงต่อกับตัวเรียบ
//
// ── พิกัด ──
// ไฟล์ใหม่ (424×621.551) วางตัวเลื่อนจากไฟล์เดิม (600×720) ไป (−88, −40.449) — ชื่อชิ้นและจุดหมุนชุดเดียวกัน
// ตอนอ่านจึงเลื่อนกลับ แล้วใช้ค่าคงที่ของ cat2 ได้ตรง ๆ (กลางตัว x 300 · เท้า y 648 · ท่าพักแขน ARM_REST)
//
// ── ยังไม่มีในไฟล์นักวาด ──
// มีแค่ด้านหน้ายืน: มุมเฉียง/หลัง/ข้าง ยังเป็นด้านหน้า · นั่ง/หมอบ = ย่อตัวแบบประมาณ · ไม่มีหาง
// ─────────────────────────────────────────────────────────────
import { IDLE_SHAPE } from './entities.js';
import { CAT2_RIG } from './cat2.js';
import { mojiModel, buildPath } from './moji-svg.js';

const { FEET_Y, UNIT, ARM_REST, gazeAt, blinkAt, hash, ease, clamp01, solveArm, armTarget, rotPt } = CAT2_RIG;
const TAU = Math.PI * 2;
const LINE = '#5A3420';   // สีเส้นของแบบ (stroke ทุกเส้นในไฟล์)
const LW = 4.252;          // เส้นขอบหลักในไฟล์ (cls-9 / cls-11)

let MODEL = null, failed = null;
function model() {
  if (!MODEL && !failed) {
    try { MODEL = mojiModel(); } catch (e) { failed = e; console.warn('[cat-moji]', e); }
  }
  return MODEL;
}
/** อ่านไฟล์ของนักวาด (รวมอยู่ในชุดไฟล์แล้ว — อ่านทันที) */
export const loadCatMoji = () => (model() ? Promise.resolve(MODEL) : Promise.reject(failed));
export const catMojiReady = () => !!model();
export const catMojiError = () => failed;

// ══ วาดชุดคำสั่ง ══
/** ตัวแปลงเฉพาะที่ของการดัด ณ จุด (x, y) — ให้สีไล่เลื่อน/หมุนไปกับชิ้นที่ถูกดัด */
function localAffine(f, x, y) {
  const h = 4;
  const [px, py] = f(x, y), [ax, ay] = f(x + h, y), [bx, by] = f(x, y + h);
  const a = (ax - px) / h, b = (ay - py) / h, c = (bx - px) / h, d = (by - py) / h;
  return new DOMMatrix([a, b, c, d, px - (a * x + c * y), py - (b * x + d * y)]);
}
function fillPaint(ctx, path, paint, f) {
  if (typeof paint === 'string') {
    ctx.fillStyle = paint;
    ctx.fill(path);
    return;
  }
  ctx.save();
  ctx.clip(path);
  if (f) { const m = localAffine(f, paint.at[0], paint.at[1]); ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f); }
  const m = paint.m;
  ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
  const g = paint.linear
    ? ctx.createLinearGradient(paint.x1, paint.y1, paint.x2, paint.y2)
    : ctx.createRadialGradient(paint.fx, paint.fy, 0, paint.cx, paint.cy, paint.r);
  for (const [o, c] of paint.stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(-4000, -4000, 8000, 8000);
  ctx.restore();
}
/**
 * f = ตัวดัดจุด (x, y) → [x, y] หรือ null (ไม่ดัด)
 * hooks[id](ctx, draw, op) — วาดชิ้น/กลุ่มนั้นเอง (เช่น ตากะพริบ) · draw() = วาดตามแบบ
 */
function drawOps(ctx, ops, f, hooks = {}) {
  for (const op of ops) {
    const h = hooks[op.id] || hooks[op.name];
    if (h && !op._inHook) {
      h(ctx, () => drawOps(ctx, [{ ...op, _inHook: true }], f, hooks), op);
      continue;
    }
    const a0 = ctx.globalAlpha;
    if (op.alpha !== 1) ctx.globalAlpha = a0 * op.alpha;
    if (op.kind === 'group') drawOps(ctx, op.ops, f, hooks);
    else if (op.kind === 'clip') {
      ctx.save();
      ctx.clip(f ? op.clipCmds.reduce((pp, q) => buildPath(q, f, pp), new Path2D()) : op.clip);
      drawOps(ctx, op.ops, f, hooks);
      ctx.restore();
    } else {
      const path = f ? buildPath(op.cmds, f) : op.path;
      if (op.fill) fillPaint(ctx, path, op.fill, f);
      if (op.stroke) {
        ctx.strokeStyle = typeof op.stroke === 'string' ? op.stroke : op.stroke.stops[0]?.[1] || LINE;
        ctx.lineWidth = op.width;
        ctx.lineCap = op.cap;
        ctx.lineJoin = op.join;
        ctx.stroke(path);
      }
    }
    ctx.globalAlpha = a0;
  }
}
function rotAt(ctx, p, a) {
  if (!a) return;
  ctx.translate(p.x, p.y);
  ctx.rotate(a);
  ctx.translate(-p.x, -p.y);
}

// ══ ตา / ปาก (ขยับตามจังหวะ) ══
/** ตาปิด: 'blink' = โค้ง ∪ พริ้ม · 'happy' = โค้ง ∩ ยิ้มตา */
function closedEye(ctx, e, kind, side) {
  const w = e.r * 0.92, dir = side === 'left' ? -1 : 1;
  ctx.save();
  ctx.strokeStyle = LINE;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = LW * 1.15;
  ctx.beginPath();
  if (kind === 'happy') {
    ctx.moveTo(e.x - w, e.y + 10);
    ctx.quadraticCurveTo(e.x, e.y - 30, e.x + w, e.y + 10);
  } else {
    ctx.moveTo(e.x - w, e.y + 2);
    ctx.quadraticCurveTo(e.x, e.y + 30, e.x + w, e.y + 2);
  }
  ctx.stroke();
  // ขนตาเส้นสั้นที่หางตา (ฝั่งนอก)
  const tx = e.x + dir * w, ty = kind === 'happy' ? e.y + 10 : e.y + 2;
  ctx.lineWidth = LW * 0.9;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx + dir * 12, ty + (kind === 'happy' ? 6 : -8));
  ctx.stroke();
  ctx.restore();
}

// ══ วาดน้อง ══
/**
 * วาดน้องแมวส้มลายเส้นใหม่ — อาร์กิวเมนต์ชุดเดียวกับ drawCat2 (ไม่มี skin: ไฟล์นี้เป็นน้องส้มตัวหลักตัวเดียว)
 * idle = { k, shape, pose, mood, noBlink } แบบเดียวกับ drawCat2
 * คืน false ถ้าไฟล์ยังโหลดไม่เสร็จ (เรียกโหลดให้เอง) — ผู้เรียกวาดอย่างอื่นแทนไปก่อน
 */
export function drawCatMoji(ctx, x, feetY, scale, t = 0, idle = null) {
  const M = model();
  if (!M) return false;
  const P = M.parts;
  const T = t / 60;

  // ── ค่าจากท่า (สูตรเดียวกับ drawCat2) ──
  const shape = idle?.shape || (idle?.pose ? IDLE_SHAPE[idle.pose] : null) || null;
  const k = idle ? clamp01(idle.k) : 0;
  const v = (key) => (shape?.[key] || 0) * k;
  const raw = (key) => shape?.[key] || 0;
  const sit = ease(clamp01((v('sit') - 0.3) / 0.4)), crouch = v('crouch'), loaf = ease(clamp01((v('loaf') - 0.3) / 0.4));
  const roll = v('roll'), sprawl = v('sprawl'), puff = v('puff');
  const wave = v('wave'), waveT = raw('waveT');
  const knead = v('knead'), kneadT = shape && 'kneadT' in shape ? raw('kneadT') : Math.sin(t * 0.3);
  const clasp = v('clasp'), offer = v('offer');
  const scratch = v('scratch'), scratchT = raw('scratchT');
  const reachL = v('reachL'), paw = v('paw');
  const lick = shape?.lick ? Math.max(0, Math.sin(t * 0.22)) * v('lick') : 0;
  // ปากขยับเอง: ทุก ~3.3 วินาที สุ่มเมี้ยวเบา ๆ หรืองุบงิบ (ตรงกับตัวเดิม)
  const mn = Math.floor(T / 3.3), mc = T - mn * 3.3, mh = hash(mn + 21);
  const mew = mh > 0.5 && mc < 0.5 ? Math.sin((mc / 0.5) * Math.PI) * (0.4 + 0.3 * hash(mn + 5)) : 0;
  const smack = mh > 0.22 && mh <= 0.5 && mc < 0.7 ? Math.abs(Math.sin((mc / 0.7) * Math.PI * 2)) * 0.3 : 0;
  const mute = (idle?.mood ?? shape?.mood) === 'sleepy';
  const chirp = Math.max(v('mouth'), shape?.chirp ? Math.max(0, Math.sin(t * 0.3)) * v('chirp') : 0, mute ? 0 : mew, mute ? 0 : smack);
  const yawn = Math.min(v('mouth'), v('shut'));
  const mood = idle?.mood ?? (k > 0.35 ? shape?.mood || '' : '');
  const happy = mood === 'happy';

  // ── จังหวะประจำตัว ──
  const breath = Math.sin(T * 2.1);
  const breathLag = Math.sin(T * 2.1 - 0.55);
  const sway = (Math.sin(T * 0.5) * 0.02 + Math.sin(T * 1.3 + 0.8) * 0.004) * (1 - k * 0.7);
  const look = gazeAt(T), headLook = gazeAt(T - 0.12);
  const lookK = 1 - k;
  const forced = shape?.gaze != null ? shape.gaze * k : null;
  const forcedY = forced != null ? (shape?.gazeY || 0) * k : 0;
  const gx = forced ?? look.x * lookK, gy = forced != null ? forcedY : look.y * lookK;
  const hx = forced != null ? forced * 0.6 : headLook.x * lookK, hy = forced != null ? forcedY * 0.6 : headLook.y * lookK;
  const blink = idle?.noBlink ? 0 : blinkAt(T, look);
  const tiltOf = (tt) => Math.sin(tt * 0.6) * 0.03;
  const tiltK = clasp > 0.05 ? 1 - 0.55 * clamp01(clasp * 1.5) : 1;
  const tilt = tiltOf(T) * (1 - k * 0.6) + hx * 0.05 + v('tilt') * tiltK + lick * 0.07;
  const earLag = (tiltOf(T - 0.22) - tiltOf(T)) * 4;
  const en = Math.floor(T / 2.4), ec = T - en * 2.4;
  const flickAt = (u) => (u >= 0 && u < 0.22 ? Math.sin((u / 0.22) * Math.PI * 2) : 0);
  const twitch = hash(en + 9) > 0.2
    ? (flickAt(ec) + (hash(en + 17) > 0.55 ? flickAt(ec - 0.26) * 0.8 : 0)) * (0.2 + 0.1 * hash(en + 4))
    : 0;
  const twitchSide = hash(en + 31) > 0.82 ? 'both' : hash(en + 3) > 0.5 ? 'left' : 'right';
  const hang = Math.sin(T * 0.5 - 0.7) * 0.025 * (1 - k * 0.5);
  const pop = k > 0 ? Math.sin(Math.min(1, k) * Math.PI) * 0.03 : 0;

  // ── ทรงตัว: นั่ง/ย่อ/หมอบ = ตัวช่วงบนลดลง ขาพับสั้น (ไฟล์นักวาดยังไม่มีท่านั่ง — ย่อจากท่ายืน) ──
  const drop = 58 * sit + 24 * crouch + 74 * loaf;
  const legK = 1 - 0.5 * sit - 0.28 * crouch - 0.72 * loaf;
  const spread = 12 * sit + 6 * crouch + 12 * loaf;
  const SY = (1 + breath * 0.012) * (1 - 0.06 * sit - 0.14 * loaf);

  ctx.save();
  ctx.translate(x + v('dx') * scale, feetY);
  ctx.rotate(v('lean'));
  const sc = scale * UNIT * (1 + puff * 0.06);
  ctx.scale(sc * (1 + pop + v('sx')), sc * (1 - pop * 0.6 + v('sy')));
  ctx.translate(-300, -FEET_Y);
  if (roll) rotAt(ctx, { x: 300, y: 470 }, roll * 1.25);

  // ── ตัวดัดจุดของแต่ละชิ้น (สูตรเดียวกับ cat2 · ไม่มีมุมหัน) ──
  const HIP = { x: 300, y: 600 };
  const upperPt = (px, py) => {
    const w = ease(clamp01((592 - py) / 55));
    const Y = 560 + (py - 560) * (1 + (SY - 1) * w) + drop;
    return rotPt(HIP, sway * w, px, Y);
  };
  const CROTCH = { x: 300, y: 596 };
  const legPt = (side) => {
    const d = side === 'left' ? -1 : 1;
    const hip = M.piv[`hip-${side}`];
    const a = -d * 0.5 * sprawl;
    const kick = v(side === 'left' ? 'kickL' : 'kickR');
    const lift = v(side === 'left' ? 'liftL' : 'liftR');
    return (px, py) => {
      let X = px + d * spread, Y = FEET_Y - (FEET_Y - py) * legK;
      if (lift) {
        const w = ease(clamp01((Y - hip.y - 6) / (FEET_Y - hip.y - 6))) * ease(clamp01(Math.hypot(X - CROTCH.x, Y - CROTCH.y) / 38));
        Y -= lift * w;
      }
      if (a) [X, Y] = rotPt(hip, a, X, Y);
      if (kick) {
        const w = ease(clamp01((Y - (hip.y - 20)) / 80)) * ease(clamp01(Math.hypot(X - CROTCH.x, Y - CROTCH.y) / 38));
        if (w > 0) [X, Y] = rotPt(hip, kick * w, X, Y);
      }
      return [X, Y];
    };
  };
  const armAngles = (side) => {
    const L = side === 'left';
    let t1 = hang + (L ? 1 : -1) * (breath * 0.018 + sprawl * 0.35), t2 = 0;
    const list = L ? [
      [[262, 476 + kneadT * 10], knead * (1 - clasp)],
      [[282, 478 + offer * 30], clasp],
      [[281, 502], offer * (1 - clasp) * (1 - v('tada'))],
      [[256 + scratchT * 7, 508 + scratchT * 8], scratch],
      [[100, 515], reachL],
      [[283, 368 + lick * 8], paw],
      [[232, 548], loaf],
      [[104, 490], yawn],
      [[90, 468], v('swingL')],
      [[104, 404], v('tada')],
      [[104, 404], v('raiseL')],
      [[20, 446], v('giveL')],
      // นั่ง (ไฟล์ยังไม่มีท่านั่ง — ตัวเดิมเปลี่ยนเป็นตัวนั่งทั้งตัว): อุ้งเท้าวางลงหน้าตัวระหว่างขา ไม่กางค้าง
      [[246, 528], sit * (1 - paw) * (1 - scratch) * (1 - knead)],
    ] : [
      [[338, 476 - kneadT * 10], knead * (1 - clasp)],
      [[318, 478 + offer * 30], clasp],
      [[319, 502], offer * (1 - clasp) * (1 - v('tada'))],
      [[466 + waveT * 14, 366 + Math.abs(waveT) * 4], wave],
      [[368, 548], loaf],
      [[496, 490], yawn],
      [[336, 384], v('chinR')],
      [[496, 404], v('tada')],
      [[446, 352], v('earR')],
      [[354, 528], sit * (1 - knead)],
    ];
    const tg = armTarget(list);
    if (tg) {
      const ik = solveArm(M.piv[`shoulder-${side}`], ARM_REST[side].E0, ARM_REST[side].P0, tg);
      t1 += (ik.t1 - t1) * tg.w;
      t2 += (ik.t2 - t2) * tg.w;
    }
    t1 += v(L ? 'armSwingL' : 'armSwingR');
    t2 += v(L ? 'elbowL' : 'elbowR');
    return { t1, t2 };
  };
  const armPt = (side, ang) => {
    const L = side === 'left';
    const S = M.piv[`shoulder-${side}`], E0 = ARM_REST[side].E0;
    return (px, py) => {
      const x0 = 300 + (L ? -1 : 1) * (100 + (py - 446) * 0.2);
      const w1 = ease(clamp01((L ? x0 - px : px - x0) / 46));
      const w2 = ease(clamp01((L ? E0.x + 14 - px : px - (E0.x - 14)) / 28));
      let X = px, Y = py;
      if (w2 > 0 && ang.t2) [X, Y] = rotPt(E0, ang.t2 * w2, X, Y);
      if (w1 > 0) {
        [X, Y] = rotPt(S, ang.t1 * w1, X, Y);
        Y -= breath * 1.2 * w1;
      }
      return upperPt(X, Y);
    };
  };
  const headDrop = drop + crouch * 6;
  const head = (c) => {
    rotAt(c, HIP, sway);
    c.translate(0, headDrop - breathLag * 2.2);
    rotAt(c, M.piv.neck, tilt);
    c.translate(hx * 3, hy * 2);
  };
  const earPt = (side) => {
    const d = side === 'left' ? 1 : -1;
    const a = earLag + d * v('ear') * 0.3 + (twitchSide === side || twitchSide === 'both' ? -d * twitch : 0);
    const piv = M.piv[`ear-${side}`];
    return (px, py) => {
      const w = ease(clamp01((212 - py) / 75));
      if (w <= 0) return [px, py];
      const [X, Y] = rotPt(piv, a * w, px, py);
      return [X - hx * 2.5 * w, Y - hy * 1.5 * w];
    };
  };

  // ── ตา ปาก ──
  const sleepy = mood === 'sleepy';
  const lid = mood === 'tired' ? 0.5 : 0;
  const shut = Math.max(lid, blink, v('shut'));
  const cool = v('wink') > 0.5, cute = v('winkCute') > 0.5;
  const closedKind = (side) => {
    if (loaf >= 0.5) return 'blink';
    if (yawn > 0.3) return 'blink';
    if (sit > 0.5 && paw > 0.6) return 'blink';
    if (happy && !(clasp > 0.3)) return 'happy';
    if (side === 'right' && (cool || cute || mood === 'smug')) return 'happy';
    if (shut > 0.75) return 'blink';
    return null;
  };
  const squash = sleepy ? Math.max(0.5, shut) : shut;
  const lx = gx * 7 - hx * 2 + v('pupilX') * 20, ly = gy * 5 + (sleepy ? 7 : 0) + v('pupilY') * 17;
  const moving = /^(pupil|shine|reflection)/;
  const eyeHook = (side) => (c, draw, op) => {
    const e = M.eye[side];
    if (!e) return draw();
    const kind = closedKind(side);
    if (kind) return closedEye(c, e, kind, side);
    c.save();
    c.translate(e.x, e.y);
    c.scale(1, 1 - squash * 0.9);
    c.translate(-e.x, -e.y);
    // ตาดำ (วงสีทอง) อยู่กับที่ · รูม่านตา ประกาย เงาสะท้อน กลอกตามสายตา (ตัดอยู่ในวงตา) · ขอบตา/ขนตาอยู่กับที่
    const inner = op.ops?.[0]?.ops || op.ops || [];
    const iris = inner.find((o) => /^iris/.test(o.name));
    for (const o of inner) {
      if (!moving.test(o.name)) { drawOps(c, [o], null); continue; }
      c.save();
      if (iris) c.clip(iris.path);
      c.translate(lx, ly);
      drawOps(c, [o], null);
      c.restore();
    }
    c.restore();
  };
  const mouthHook = (c, draw) => {
    const mo = Math.max(chirp, yawn);
    const m = M.mouth;
    if (m && mo > 0.02) {
      // ปากอ้า: โพรงปากใต้เส้น ω + ลิ้นชมพู (เส้น ω วาดทับ)
      // หาว = อ้ากว้างกว่าร้องเมี้ยวมาก (เทียบปากหาวของแบบเดิม)
      const cx = m.x, top = m.top + (m.bottom - m.top) * 0.55, rx = m.w * (0.22 + 0.12 * mo + 0.2 * yawn), ry = 4 + 15 * mo + 24 * yawn;
      const q = new Path2D();
      q.moveTo(cx - rx, top);
      q.bezierCurveTo(cx - rx, top + ry * 1.3, cx + rx, top + ry * 1.3, cx + rx, top);
      q.closePath();
      c.save();
      c.fillStyle = '#9C3F45';
      c.fill(q);
      c.clip(q);
      c.fillStyle = '#FF8C8C';
      c.beginPath();
      c.ellipse(cx, top + ry * 1.05, rx * 0.7, ry * 0.45, 0, 0, TAU);
      c.fill();
      c.restore();
      c.strokeStyle = LINE;
      c.lineWidth = 2.835;
      c.lineJoin = 'round';
      c.stroke(q);
    }
    draw();
  };
  const faceHooks = { 'eye-left': eyeHook('left'), 'eye-right': eyeHook('right'), mouth: mouthHook };

  // ── วาดตามลำดับชั้นในไฟล์: ขา → ลำตัว → แขน → พุง → หู → หัว → หน้า ──
  const armL = armPt('left', armAngles('left')), armR = armPt('right', armAngles('right'));
  const legL = legPt('left'), legR = legPt('right');
  const body = {
    'leg-left': legL, 'leg-right': legR, torso: upperPt,
    'arm-left': armL, 'arm-right': armR, belly: upperPt,
  };
  for (const id of ['leg-left', 'leg-right', 'torso', 'arm-left', 'arm-right', 'belly']) {
    if (P[id]) drawOps(ctx, P[id], body[id]);
  }
  ctx.save();
  head(ctx);
  if (P['ear-left']) drawOps(ctx, P['ear-left'], earPt('left'));
  if (P['ear-right']) drawOps(ctx, P['ear-right'], earPt('right'));
  if (P.head) drawOps(ctx, P.head, null);
  if (P.face) drawOps(ctx, P.face, null, faceHooks);
  ctx.restore();

  ctx.restore();
  return true;
}
