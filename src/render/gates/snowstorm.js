// src/render/gates/snowstorm.js
// ─────────────────────────────────────────────────────────────
// ภาพทางเข้า "ทุ่งหิมะ" — ร่อนลงจากอวกาศ → เข้าชั้นบรรยากาศของดาวน้ำแข็ง
//                        → หิมะเริ่มตก → พายุหิมะขาวโพลน → พายุสงบ → ทุ่งหิมะเปิดออก
//
// ── ทำไมเป็นแบบนี้ ──
// ด่านก่อนหน้าคือห้วงอวกาศเสมอ (ลำดับด่านคงที่ใน stages.js) ทางเข้านี้จึงเป็น "ขาลง"
// ที่สะท้อนกับทางเข้าห้วงอวกาศซึ่งเป็น "ขาขึ้น" พอดี: ที่นั่นทะเลร่วงลง ที่นี่ดาวลอยขึ้น
// และไม่มีประตู ไม่มีถ้ำ ไม่มีอุโมงค์ ไม่มีซุ้ม — สิ่งที่พาเปลี่ยนฉากคือ "อากาศ"
//
// ── ลำดับที่ผู้เล่นเห็น (u = ความคืบหน้าข้างใน 0 → 1) ──
//   ก่อนถึง      พื้นเริ่มมีน้ำแข็งเกาะ เสาน้ำแข็งเอียงรับลม เกล็ดหิมะแรก ๆ ปลิวผ่าน
//   0.00–0.20   ร่อนลง: อวกาศเลื่อนขึ้นพ้นจอ ขอบดาวน้ำแข็งโค้งขึ้นมารับ
//   0.20–0.45   เข้าชั้นบรรยากาศ: ฟ้าหน้าหนาว หิมะ 25% → 60% ลมแรงขึ้น พื้นเริ่มขาว
//   0.45–0.70   WOW พายุหิมะ: หิมะ 100% + หมอกขาว จอเกือบขาวโพลน (จังหวะที่จอถูกปิด)
//   0.70–1.00   พายุสงบ: หมอกจางลง ทุ่งหิมะ เทือกเขา และปราสาทน้ำแข็งค่อย ๆ เผยตัว
//
// ── ห้ามขาวจนมองไม่เห็นตัวละคร ──
// หมอกหนาสุดที่ 0.82 ไม่ใช่ 1 และแมวถูกวาด "หลัง" ชั้นหน้าของทางเข้าเสมอ (ดู game.js)
// ทดสอบแล้วว่าตัวแมว ปลา และสิ่งกีดขวางยังอ่านออกตลอดช่วงพายุ
//
// ── ประสิทธิภาพ ──
// พื้นทางวิ่ง = ชั้นแคชวาดครั้งเดียวทั้งเส้น / ฉากหิมะทั้งชุด = แผ่นแคช (ดู render/snow.js)
// ที่วาดสดคือ ขอบดาวน้ำแข็ง เสาน้ำแข็ง กองหิมะชั้นหน้า และลมกระโชก — นับชิ้นได้ ไม่มี filter
// ─────────────────────────────────────────────────────────────
import { VIEW, GROUND_Y } from '../../config.js';
import { drawSpaceBackdrop } from '../space.js';
import {
  SNOW_C as C, snowHash as hash, drawSnowBackdrop, zonesAt, warmSnowArt,
} from '../snow.js';

const { W, H } = VIEW;
const TAU = Math.PI * 2;

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function ease(t) {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
}

// ─────────────────────────────────────────────────────────────
// ชั้นแคช — ทางวิ่งตลอดเส้น (พื้นหินอวกาศเกาะน้ำแข็ง → หิมะบาง → ทุ่งหิมะหนา)
// ─────────────────────────────────────────────────────────────
const PAD = 160;
const TAIL = 150;   // ปลายทางค่อย ๆ จางให้พื้นของด่านจริงรับช่วง (เหมือนทางเข้าห้วงอวกาศ)
let CACHE = null;

function layerScale(ctx) {
  const t = ctx.getTransform();
  return Math.min(2, Math.max(1, Math.round(Math.hypot(t.a, t.b) * 4) / 4));
}

function buildTrail(layout, scale) {
  const len = layout.interior + layout.houseLead + PAD + TAIL;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(len * scale);
  cv.height = Math.ceil((H - GROUND_Y + 40) * scale);
  const g = cv.getContext('2d');
  g.scale(scale, scale);
  g.translate(0, -(GROUND_Y - 40));
  paintTrail(g, len, PAD + layout.houseLead);
  return {
    key: `${scale}|${layout.interior}|${layout.houseLead}`,
    trail: { cv, w: len, h: H - GROUND_Y + 40, s: scale },
  };
}

function layers(ctx, m) {
  const layout = { houseLead: m.doorIn - m.houseL, interior: m.doorOut - m.doorIn };
  const scale = layerScale(ctx);
  const key = `${scale}|${layout.interior}|${layout.houseLead}`;
  if (!CACHE || CACHE.key !== key) CACHE = buildTrail(layout, scale);
  return CACHE;
}

export function warmSnowGateArt(_ctx, layout, scale = 1) {
  warmSnowArt();
  const s = Math.min(2, Math.max(1, Math.round(scale * 4) / 4));
  CACHE = buildTrail(layout, s);
}

/**
 * ทางวิ่งทั้งเส้น — x = 0 คือขอบซ้ายของชั้น, gate0 คือจุดที่ผู้เล่นเริ่มร่อนลง
 * หิมะบนพื้นหนาขึ้นเรื่อย ๆ ตามระยะ = "หิมะกำลังทับถม" โดยไม่ต้องมีระบบสะสมจริง
 */
function paintTrail(g, len, gate0) {
  const deckH = H - GROUND_Y;
  const snowAt = (x) => ease(clamp01((x - gate0 + 520) / 900));   // 0 หินเปล่า → 1 หิมะหนา

  // หินของดาว (ต่อจากพื้นด่านห้วงอวกาศ) แล้วค่อยถูกหิมะกลบ
  g.fillStyle = '#2C2947';
  g.fillRect(0, GROUND_Y, len, deckH);
  g.fillStyle = '#4A4668';
  g.fillRect(0, GROUND_Y, len, 12);

  // ชั้นหิมะบนสุด — ขอบบนเป็นคลื่นเล็ก ๆ ไม่ใช่เส้นตรง
  g.fillStyle = C.snowSoft;
  g.beginPath();
  g.moveTo(0, H);
  for (let x = 0; x <= len; x += 22) {
    const k = snowAt(x);
    const y = GROUND_Y + 14 - k * 14 + Math.sin(x * 0.02) * 2.2 * k;
    g.lineTo(x, k < 0.02 ? GROUND_Y + 14 : y);
  }
  g.lineTo(len, H);
  g.closePath();
  g.fill();
  g.fillStyle = C.snow;
  g.beginPath();
  g.moveTo(0, H);
  for (let x = 0; x <= len; x += 22) {
    const k = snowAt(x);
    const y = GROUND_Y + 16 - k * 14 + Math.sin(x * 0.017 + 1.1) * 2.6 * k;
    g.lineTo(x, k < 0.02 ? GROUND_Y + 18 : y);
  }
  g.lineTo(len, H);
  g.closePath();
  g.fill();

  // ขอบเข้มใต้ผิวหิมะ — เส้นที่บอกว่า "พื้นอยู่ตรงนี้" ต้องอ่านออกแม้ตอนพายุขาวโพลน
  g.strokeStyle = C.snowDeep;
  g.lineWidth = 2.5;
  g.beginPath();
  for (let x = 0; x <= len; x += 22) {
    const k = ease(clamp01((x - gate0 + 520) / 900));
    const y = GROUND_Y + 16 - k * 14 + Math.sin(x * 0.017 + 1.1) * 2.6 * k + 2;
    if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();

  // เงาใต้ผิวหิมะ ให้พื้นไม่แบน
  g.fillStyle = 'rgba(169,200,222,.55)';
  for (let x = 40; x < len; x += 96) {
    const k = snowAt(x);
    if (k < 0.15) continue;
    g.beginPath();
    g.ellipse(x, GROUND_Y + 34, 34 * k, 6 * k, 0, 0, TAU);
    g.fill();
  }

  // กองหิมะข้างทาง + น้ำแข็งโผล่ — ยิ่งลึกยิ่งเยอะ
  for (let i = 0; i < 26; i++) {
    const x = gate0 - 400 + i * ((len - gate0 + 400) / 26) + hash(i * 3.1) * 40;
    const k = snowAt(x);
    if (k < 0.1) continue;
    const r = (14 + hash(i * 5.7) * 26) * k;
    g.fillStyle = C.snow;
    g.beginPath();
    g.ellipse(x, GROUND_Y + 16, r, r * 0.5, 0, Math.PI, TAU);
    g.fill();
    g.fillStyle = C.snowShade;
    g.beginPath();
    g.ellipse(x + r * 0.3, GROUND_Y + 18, r * 0.5, r * 0.2, 0, Math.PI, TAU);
    g.fill();
  }

  // ปลายทางจางหาย ให้พื้นของด่านจริงโผล่ขึ้นมารับช่วงพอดี
  g.globalCompositeOperation = 'destination-out';
  const fade = g.createLinearGradient(len - TAIL, 0, len, 0);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = fade;
  g.fillRect(len - TAIL, GROUND_Y - 40, TAIL, H - GROUND_Y + 40);
  g.globalCompositeOperation = 'source-over';
}

function blit(ctx, layer, worldX, cam, y) {
  ctx.drawImage(
    layer.cv, 0, 0, layer.cv.width, layer.cv.height,
    Math.round(worldX - cam), y, layer.w, layer.h
  );
}

// ─────────────────────────────────────────────────────────────
// จังหวะของทางเข้า — คำนวณจาก u ที่เดียว ทั้งภาพหลังและภาพหน้าอ่านจากตัวนี้
// ─────────────────────────────────────────────────────────────
function beats(u) {
  return {
    // อวกาศเลื่อนขึ้นพ้นจอ (ขาลง = ของไกลลอยขึ้น) — กลับทางกับทางเข้าห้วงอวกาศ
    drop: ease(clamp01((u - 0.015) / 0.18)),
    // ความหนาแน่นหิมะ: 0 → 1 ตอนพายุ → 0.5 ตอนสงบ (ค่าเดียวกับที่ด่านจริงใช้)
    snow: u < 0.45
      ? lerp(0.05, 0.92, ease(clamp01((u - 0.12) / 0.33)))
      : lerp(0.92, 0.45, ease(clamp01((u - 0.7) / 0.3))),
    // หมอกขาว: ขึ้นถึง 0.82 กลางพายุ แล้วจางหมดตอนเผยทุ่ง
    haze: 0.82 * ease(clamp01((u - 0.3) / 0.2)) * (1 - ease(clamp01((u - 0.62) / 0.26))),
    // ลม: แรงสุดกลางพายุ
    wind: -(0.4 + 2.6 * ease(clamp01((u - 0.15) / 0.3)) * (1 - 0.45 * ease(clamp01((u - 0.7) / 0.3)))),
  };
}

/**
 * น้ำหนักย่านระหว่างทางเข้า
 * ช่วงเผยทุ่งบังคับให้เป็น "ทุ่งเปิดโล่ง + เทือกน้ำแข็ง + ปราสาทอยู่ไกล ๆ" เพื่อให้เป็นจังหวะ WOW
 * แล้วไล่กลับเข้าหาค่าจริงของด่าน (zonesAt) ก่อนถึงทางออก ภาพจึงส่งต่อโดยไม่มีอะไรกระโดด
 */
function zonesFor(cam, u) {
  const nat = zonesAt(cam);
  const want = [1, 0.15, 0.62, 0.85];
  const k = ease(clamp01((u - 0.86) / 0.14));
  return nat.map((v, i) => lerp(want[i], v, k));
}

// ─────────────────────────────────────────────────────────────
// ชั้นหลัง
// ─────────────────────────────────────────────────────────────
export function drawSnowGateBack(ctx, v) {
  const { m, camera: cam } = v;
  if (m.houseR + 200 - cam < 0 || m.houseL - 320 - cam > W) return;

  if (v.facadeIn > 0.02) drawApproach(ctx, v);

  const world = (1 - v.facadeIn) * (1 - v.facadeOut);
  if (world > 0.02) drawInside(ctx, v, world);
}

/** ช่วงก่อนร่อนลง — น้ำแข็งเริ่มเกาะพื้นของด่านเดิม เสาน้ำแข็งรับลม เกล็ดแรก ๆ ปลิว */
function drawApproach(ctx, v) {
  const { m, camera: cam, tick } = v;
  ctx.save();
  ctx.globalAlpha = v.facadeIn;
  blit(ctx, layers(ctx, m).trail, m.houseL - PAD, cam, GROUND_Y - 40);
  for (let i = 0; i < 4; i++) {
    icePillar(ctx, m.houseL + 40 + i * 74 - cam, 0.5 + hash(i * 2.7) * 0.6, i);
  }
  // เกล็ดหิมะแรก ๆ ที่ลมหอบมา — ยังน้อยมาก แค่พอให้รู้ว่าอากาศเปลี่ยน
  ctx.fillStyle = C.snow;
  for (let i = 0; i < 10; i++) {
    const p = ((tick * 1.6 + i * 96) % 900) / 900;
    ctx.globalAlpha = v.facadeIn * 0.7 * Math.sin(Math.PI * p);
    ctx.beginPath();
    ctx.arc(W - p * (W + 120) + 60, 60 + hash(i * 4.4) * (GROUND_Y - 80) + Math.sin(tick * 0.04 + i) * 8, 1.6 + hash(i) * 1.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** ข้างใน — โลกหิมะเต็มจอ โดยมีอวกาศของด่านเดิมค่อย ๆ ลอยขึ้นพ้นจอในช่วงแรก */
function drawInside(ctx, v, alpha) {
  const { m, camera: cam, tick } = v;
  const u = v.inside;
  const b = beats(u);

  ctx.save();
  ctx.globalAlpha = alpha;
  drawSnowBackdrop(ctx, cam, tick, {
    snow: b.snow, wind: b.wind, haze: b.haze, zones: zonesFor(cam, u),
  });

  // อวกาศเหนือขอบดาว — เห็นได้เฉพาะส่วนที่ยังอยู่ "นอกผิวดาว" ที่กำลังโตขึ้นเรื่อย ๆ
  if (u < 0.24) spaceAbove(ctx, cam, tick, u, alpha);

  blit(ctx, layers(ctx, m).trail, m.houseL - PAD, cam, GROUND_Y - 40);
  ctx.restore();
}

/**
 * ห้วงอวกาศที่ยังเห็นอยู่ "เหนือขอบดาวน้ำแข็ง"
 *
 * ── ทำไมต้องตัดด้วยวงกลม ──
 * ตัวที่เล่าว่า "เรากำลังร่อนลงสู่ดาวดวงหนึ่ง" คือเส้นขอบโค้งที่ค่อย ๆ เลื่อนขึ้นกินจอ
 * ถ้าใช้วิธีจางอวกาศทิ้งเฉย ๆ จะได้ภาพดำทับขาวขุ่น ๆ ที่ไม่ได้เล่าอะไรเลย
 * ข้างในวงคือโลกหิมะที่วาดไว้แล้ว (= ผิวดาว) จึงไม่ต้องถมสีขาวทับให้เสียของ
 */
function spaceAbove(ctx, cam, tick, u, alpha) {
  const e = ease(clamp01(u / 0.22));
  const R = lerp(700, 2600, e);
  const cx = W * 0.44;
  const cy = lerp(H + 60, -40, e) + R;      // ขอบบนของดาวไล่จากใต้จอขึ้นไปพ้นจอ
  const fade = 1 - ease(clamp01((u - 0.17) / 0.07));
  if (fade <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = alpha * fade;
  // ตัดเอาเฉพาะนอกวงดาว (evenodd) — ที่เหลือคืออวกาศ
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.clip('evenodd');
  drawSpaceBackdrop(ctx, cam, tick, { u: 1 });
  ctx.restore();

  // ชั้นบรรยากาศเรืองที่ขอบดาว — เส้นที่ทำให้ขอบอ่านเป็น "ผิวดาว" ไม่ใช่รอยตัดภาพ
  ctx.save();
  ctx.globalAlpha = alpha * fade;
  const halo = ctx.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.14);
  halo.addColorStop(0, 'rgba(214,242,255,.75)');
  halo.addColorStop(1, 'rgba(190,230,255,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.14, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#EAF8FF';
  ctx.lineWidth = Math.max(2, R * 0.006);
  ctx.beginPath();
  ctx.arc(cx, cy, R, Math.PI * 1.08, Math.PI * 1.98);
  ctx.stroke();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ชั้นหน้า — กองหิมะชั้นหน้า ลมกระโชก เสาน้ำแข็งที่ปากทาง
// ─────────────────────────────────────────────────────────────
export function drawSnowGateFront(ctx, v) {
  const { m, camera: cam, tick } = v;
  if (m.houseR + 200 - cam < 0 || m.houseL - 320 - cam > W) return;

  const inside = (1 - v.facadeIn) * (1 - v.facadeOut);
  const u = v.inside;
  const b = beats(u);

  // เสาน้ำแข็งเอนรับลมที่ปากทาง — ป้ายบอกว่า "จากนี้ไปคือดินแดนหนาว" โดยไม่ต้องมีประตู
  for (let i = 0; i < 3; i++) {
    const x = m.doorIn - 40 + i * 52 - cam;
    if (x > -60 && x < W + 60) icePillar(ctx, x, 1.1 + hash(i * 6.3) * 0.5, i + 7);
  }

  if (inside <= 0.02) return;

  // กองหิมะชั้นหน้า — วิ่งเร็วกว่าฉากทั้งหมด ให้รู้สึกว่ามีของอยู่ "หน้า" ตัวละคร
  ctx.save();
  ctx.globalAlpha = inside * 0.95;
  ctx.fillStyle = C.snow;
  const span = W * 1.6;
  for (let i = 0; i < 4; i++) {
    const x = ((i * 430 - cam * 1.25) % span + span) % span - 150;
    const r = 90 + hash(i * 7.7) * 90;
    ctx.beginPath();
    ctx.ellipse(x, H + 26, r, 34 + hash(i) * 20, 0, Math.PI, TAU);
    ctx.fill();
  }
  ctx.restore();

  // ลมกระโชกชั้นหน้า — เส้นยาวพาดผ่านหน้าจอเป็นระลอก แรงสุดกลางพายุ
  const gust = ease(clamp01((u - 0.25) / 0.2)) * (1 - ease(clamp01((u - 0.68) / 0.24)));
  if (gust > 0.03) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const p = ((tick * 0.028 + i * 0.1428) % 1);
      const y = hash(i * 9.3) * H;
      const x = W + 140 - p * (W + 420);
      ctx.globalAlpha = inside * gust * 0.75 * Math.sin(Math.PI * p);
      ctx.lineWidth = 2 + hash(i) * 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 90, y + 6, x + 190, y + 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** เสาน้ำแข็งเอียงรับลม — ของชิ้นเดียวที่ใช้ทั้งช่วงก่อนถึงและปากทาง */
function icePillar(ctx, x, s, seed) {
  const lean = (hash(seed * 3.3) - 0.5) * 0.3;
  const h = (54 + hash(seed * 5.1) * 70) * s;
  ctx.save();
  ctx.translate(x, GROUND_Y + 14);
  ctx.rotate(lean);
  ctx.fillStyle = C.iceDeep;
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.lineTo(13 * s, 0);
  ctx.lineTo(-13 * s, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.ice;
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.lineTo(4 * s, 0);
  ctx.lineTo(-8 * s, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.iceLite;
  ctx.beginPath();
  ctx.moveTo(-1 * s, -h * 0.86);
  ctx.lineTo(2 * s, -h * 0.2);
  ctx.lineTo(-4 * s, -h * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
