// src/minigames/catwater.js
// ─────────────────────────────────────────────────────────────
// มินิเกม "แมวหนีน้ำ" 🐱💦 — ห้องซักผ้าน้ำค่อย ๆ ท่วม ช่วยน้องกระโดดหนีขึ้นของให้นานที่สุด
//
// ── หัวใจของเกม ──
// "ผู้เล่นไม่ได้สู้กับน้ำ — ผู้เล่นกำลังช่วยแมวหนีสิ่งที่มันเกลียดที่สุด"
// แตะน้ำไม่ตายทันที (ระดับความเปียก 0-3) · อันตรายทุกอย่างเตือนก่อนเสมอ (เตือน → หลบ → ผล)
//
// ── แยกเป็นโมดูลของตัวเอง ──
// ไม่แตะระบบหลักเลย: มีลูป requestAnimationFrame ของตัวเอง (เปิดเฉพาะตอนเล่น ปิดสนิทตอนออก)
// ใช้ของเดิมแค่ ตัววาดน้อง (drawPlayer/drawCatPose) เสียง (sfx) เพลง (setMusicTrack) ที่เก็บค่า (loadPref)
// รางวัลไม่ได้อยู่ในนี้ — ผู้เปิด (catroom-ui.js) รับคะแนนไปให้ผ่านระบบดูแลน้องเดิม (care) ไม่มีสกุลเงินใหม่
//
// ── ลำดับในหนึ่งเฟรม ── ปุ่ม → ฟิสิกส์น้อง → ชนที่ยืน → น้ำ → อีเวนต์ → ของเก็บ → คะแนน → ละออง → วาด
// ─────────────────────────────────────────────────────────────
import {
  W, H, FLOOR, paintRoom, drawPlatform, drawWater, waterY, drawCatSide, drawCatFront,
  drawCollectible, drawEvent, drawParticles, drawHud, drawCountdown, drawSpeech, fmtTime,
} from './catwater-draw.js';
import { sfx, killSfx } from '../audio.js';
import { setMusicTrack } from '../music.js';
import { loadPref, savePref } from '../storage.js';
import { t as tr } from '../i18n.js';
import { quality, canvasDprCap, framePacer } from '../graphics.js';
import { TREATS } from '../config.js';

/** สีข้อความคะแนน/ประกายตอนเก็บ ตามชนิดของกิน */
const TREAT_COLOR = { jelly: '#FFC2DF', fish: '#9DF2E3', kibble: '#FFC98A', shrimp: '#FFE48A', crystal: '#D9D2FF' };

// ══ ค่าปรับสมดุล (หน่วย: พิกเซลฉาก / วินาที) ═════════════════════
export const PLAYER_SPEED = 240;
export const GROUND_ACCEL = 2600;
export const AIR_ACCEL = 2400;      // เลี้ยวกลางอากาศได้เกือบเท่าบนพื้น — กระโดดแล้วปรับไปลงอีกชิ้นทัน
export const FRICTION = 3000;
export const AIR_FRICTION = 1800;   // ปล่อยจอยกลางอากาศ = หยุดไหล ตกลงตรง ๆ (กะจุดลงได้ เดิมไหลต่อด้วยความเร็วเต็มจนเลยเป้า)
// ขึ้นไว-ลงไว: แรงกระโดดกับแรงโน้มถ่วงสูงคู่กัน ความสูงเท่าเดิม (≈117) แต่ถึงยอดใน 0.3 วิ (เดิม 0.34 ลอยหน่วง)
// ขาลงหนักขึ้นอีก 20% (FALL_MULT) — ตกลงไวแบบการ์ตูน ไม่ล่องลอยตอนกะจังหวะลงอีกชิ้น
export const JUMP_FORCE = 780;      // ที่ยืนทุกขั้นห่างกันไม่เกิน 100 (ดู LAYOUT)
export const GRAVITY = 2600;
const FALL_MULT = 1.2;
export const MAX_FALL_SPEED = 1100;
const COYOTE = 0.13;                // เดินตกขอบแล้วยังกดกระโดดได้อีกนิด — กดช้ากว่าตาเห็นไม่โดนลงโทษ
const JUMP_BUFFER = 0.16;           // กดกระโดดก่อนเท้าแตะพื้นนิดหนึ่ง = กระโดดทันทีที่แตะ
const DROP_S = 0.28;                // ทิ้งตัวลงจากที่ยืน: ลอดผ่านชิ้นที่ยืนอยู่ได้ช่วงสั้น ๆ
const CAT_SCALE = 1.3;
const CAT_H = 46 * CAT_SCALE;       // จากเท้าถึงยอดหัว (ใช้วัดความเปียก)
const WET_FEET = 4;                 // น้ำเหนือเท้าเกิน 4 = เปียกเท้า (เผื่อคลื่นเล็กบนผิวน้ำ ไม่ให้เปียกกะพริบ)
const WET_BODY = 16;                // น้ำถึงลำตัว
const WET_HEAD = CAT_H * 0.82;      // น้ำถึงหัว = จบเกม
const WATER_START = 0;              // เริ่มที่พื้นแห้ง — แอ่งน้ำค่อย ๆ ซึมขึ้นช่วงแรก (Calm)
const WATER_MAX = 350;              // น้ำหยุดที่นี่ — เหนือชั้นสูงสุดแล้ว เหลือแต่กล่องลอยน้ำให้กระโดดต่อ
const PREF = 'mgWater';
const HEARTS = 3;                  // ตกน้ำ (น้ำถึงหัว) ได้ 3 ครั้ง ครั้งที่ 3 = จบเกม
const RESCUE_S = 0.75;             // จมอยู่ครู่หนึ่งก่อนถูกช่วยขึ้นที่แห้ง (ให้เห็นว่าเสียหัวใจเพราะอะไร)
const SAFE_S = 2;                  // อมตะหลังถูกช่วย (ตัวกะพริบ) — ไม่เสียหัวใจซ้ำติด ๆ

/** สถานะเดียวตัดสินทุกอย่าง (ไม่ใช้ boolean หลายตัว) — CRITICAL คือ PLAYING ตอนน้ำใกล้ถึงหัว */
export const S = {
  MENU: 'menu', COUNTDOWN: 'countdown', PLAYING: 'playing', PAUSED: 'paused',
  CRITICAL: 'critical', GAME_OVER: 'gameOver', RESULT: 'result',
};
const LIVE = new Set([S.PLAYING, S.CRITICAL]);

/** ความเร็วน้ำขึ้นตามเวลา — เริ่มนิ่ง แล้วค่อย ๆ เร่ง (Calm → Rising → Danger → Panic → Critical) */
function riseSpeed(t) {
  if (t < 8) return 0.4;
  if (t < 20) return 3;
  if (t < 35) return 4.5;
  if (t < 50) return 6;
  if (t < 65) return 7;
  return Math.min(11, 7.5 + (t - 65) * 0.08);
}

// ══ ผังห้อง ════════════════════════════════════════════════════
// y = ผิวบนที่เหยียบ · wall = ชั้นติดผนัง (บางเฉียบ ยืนได้จากด้านบนอย่างเดียว)
// ทุกขั้นสูงกว่าขั้นก่อนไม่เกิน ~100 (กระโดดได้ 108) และห่างแนวนอนไม่เกิน ~120 — มีทางขึ้นถึงยอดเสมอ
const LAYOUT = [
  { type: 'washer', x: 36, y: 332, w: 120 },
  { type: 'basket', x: 176, y: 374, w: 70 },
  { type: 'chair', x: 286, y: 366, w: 66 },
  { type: 'box', x: 376, y: 382, w: 62, temp: true },
  { type: 'table', x: 470, y: 318, w: 160 },
  { type: 'box', x: 650, y: 384, w: 58, temp: true },
  { type: 'toybox', x: 726, y: 350, w: 72 },
  { type: 'cabinet', x: 812, y: 256, w: 104 },
  // ── ชั้นติดผนังวางแบบขั้นบันได: ของข้างล่างยื่นเลยขอบชั้นทั้งสองข้าง ──
  // เดินตกขอบซ้าย/ขวาของชั้นไหนก็ลงบนของชิ้นล่างพอดี (เดิมชั้นซ้ายคลุมเครื่องซักผ้ามิด ตกขอบแล้วเลยไปพื้นทั้งสองทาง)
  { type: 'shelf', x: 96, y: 238, w: 110, wall: true },     // ซ้ายตกลงเครื่องซักผ้า · ขวาตกลงตะกร้า
  { type: 'shelf', x: 494, y: 224, w: 112, wall: true },    // ตกขอบไหนก็ลงโต๊ะ
  { type: 'ledge', x: 318, y: 156, w: 112, wall: true },    // ซ้ายลงเก้าอี้ · ขวาลงกล่อง
  { type: 'shelf', x: 700, y: 160, w: 104, wall: true },    // ซ้ายลงกล่อง · ขวาลงตู้
];

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * @param deps.panel     แผงเต็มจอ (#catWaterPanel)
 * @param deps.onExit    ออกจากมินิเกม (กลับหน้าเดิม — ผู้เรียกคืนเพลง/แสดงผลรางวัล)
 * @param deps.onFinish  จบหนึ่งรอบ ({ score, time, best }) → คืนข้อความรางวัล (หรือ '') สำหรับหน้าสรุป
 */
export function createCatWater({ panel, onExit, onFinish }) {
  const $ = (id) => panel.querySelector('#' + id);
  const canvas = $('cwCanvas');
  const ctx = canvas.getContext('2d');
  const bg = document.createElement('canvas');
  const view = { scale: 1, ox: 0, oy: 0, dpr: 1, left: 0, right: W, top: 0, padR: 0 };

  let state = S.MENU;
  let paused = null;          // สถานะก่อนหยุด (กลับมาต่อจากเดิม)
  let raf = 0;
  let lastNow = 0;
  let skin = null;
  let retry = false;
  // axis = แรงเดินจากจอยสติ๊ก -1..1 (ลากน้อย = เดินช้า) · left/right = คีย์บอร์ด
  const input = { left: false, right: false, axis: 0, jumpAt: -1, dropAt: -1 };
  const best = loadPref(PREF, null) || { score: 0, time: 0 };

  // ── โลกหนึ่งรอบ (สร้างใหม่ทุกครั้งที่เริ่ม) ──
  let w = null;

  function newWorld() {
    const plats = LAYOUT.map((p) => ({
      ...p,
      // ขยับนิด ๆ ทุกรอบ ไม่ให้จำตำแหน่งได้เป๊ะ (เฉพาะของที่ตั้งบนพื้น — ระยะกระโดดยังเท่าเดิม)
      x: p.wall ? p.x : p.x + Math.round(rand(-8, 8)),
      state: 'dry', k: 0, t: 0, sink: 0, wetK: 0,
    }));
    return {
      clock: 0,            // เวลาจริงตั้งแต่เปิด (แอนิเมชัน)
      time: 0,             // เวลารอด (เดินเฉพาะตอนเล่น)
      cd: 0,               // ตัวจับเวลาฉากเปิด/นับถอยหลัง
      over: 0,             // ตัวจับเวลาหลังจบ
      level: WATER_START,
      score: 0,
      timePts: 0,
      survTick: 0,
      combo: { count: 0, timer: 0, tier: '', mult: 1, pop: 0 },
      critical: false,
      plats,
      floats: [],
      items: [],
      itemTimer: 4,
      events: [],
      nextHazard: 22 + rand(0, 3),
      nextFloat: 28 + rand(0, 3),
      parts: [],
      bubbles: Array.from({ length: 12 }, () => ({ x: rand(0, W), y: FLOOR - rand(0, 8), r: rand(2, 5), v: rand(14, 30) })),
      crest: null,
      shake: 0,
      nearMiss: { armed: 0, cool: 0 },
      hearts: HEARTS,
      heartFx: [],          // หัวใจที่กำลังแตก { i, t } — วาดใน HUD
      newBest: false,
      reward: '',
      cat: {
        x: W / 2, y: FLOOR, vx: 0, vy: 0, dir: 1, onGround: true, ground: null, coyote: 0,
        runPhase: 0, squash: 0, stun: 0, wet: 0, mood: '', shiver: 0, t: 0, speed: 0,
        takeoff: null, takeoffY: FLOOR, mouth: 0, scale: CAT_SCALE, skin,
      },
    };
  }

  // ══ ขนาดผ้าใบ ══════════════════════════════════════════════
  function resize() {
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch) return;
    // ความคมตามความสวยของหน้า 'บ้านแมว+มินิเกม' ในตั้งค่า (สูง 1.5 / กลาง 1.25 / ประหยัด 1)
    const dpr = Math.min(window.devicePixelRatio || 1, canvasDprCap('room'));
    const pw = Math.round(cw * dpr), ph = Math.round(ch * dpr);
    if (canvas.width === pw && canvas.height === ph && view.dpr === dpr) return;
    canvas.width = pw;
    canvas.height = ph;
    view.dpr = dpr;
    // พอดีจอแบบไม่ตัด (contain) — ห้องวาดล้นขอบไว้แล้ว ส่วนที่เกินจึงเป็นห้องต่อ ไม่ใช่แถบดำ
    view.scale = Math.min(cw / W, ch / H);
    view.ox = (cw - W * view.scale) / 2;
    view.oy = (ch - H * view.scale) / 2;
    view.left = -view.ox / view.scale;
    view.right = W + view.ox / view.scale;
    view.top = -view.oy / view.scale;
    // ปุ่มหยุดมุมขวาบน (DOM) — HUD คะแนนหลบให้ (ออกจากเกมได้ทางหน้าพัก "เลิกเล่น" อย่างเดียว)
    view.padR = 60 / view.scale;
    bg.width = pw;
    bg.height = ph;
    const b = bg.getContext('2d');
    b.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.ox, dpr * view.oy);
    paintRoom(b);
  }

  // ══ ละอองและข้อความลอย ═══════════════════════════════════════
  function emit(kind, x, y, n, o = {}) {
    for (let i = 0; i < n && w.parts.length < 90; i++) {
      const a = o.angle ?? rand(-Math.PI, 0);
      const sp = rand(o.min ?? 60, o.max ?? 180);
      w.parts.push({
        kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(o.rmin ?? 2.5, o.rmax ?? 4.5),
        life: o.life ?? rand(0.35, 0.7), max: o.life ?? 0.7, g: o.g ?? 700, color: o.color,
      });
    }
  }
  function popText(text, x, y, color = '#FFF6D8', size = 18) {
    w.parts.push({ kind: 'text', text, x, y, vx: 0, vy: -55, life: 1, max: 1, g: 0, color, size });
  }
  const splashAt = (x, y, n = 8) => emit('splash', x, y, n, { min: 90, max: 220, angle: undefined });

  // ══ คะแนน / คอมโบ ══════════════════════════════════════════
  function comboUp() {
    const c = w.combo;
    c.count++;
    c.timer = 6;      // ไม่ทำอะไรเกิน 6 วิ = คอมโบหลุด ("ช้าจนเกินไป")
    const tier = c.count >= 7 ? ['AMAZING!', 5] : c.count >= 4 ? ['GREAT!', 3] : c.count >= 2 ? ['GOOD!', 2] : ['', 1];
    if (tier[0] !== c.tier) {
      c.tier = tier[0];
      c.mult = tier[1];
      if (c.tier) {
        c.pop = 1;
        sfx.kibble();
        emit('spark', w.cat.x, w.cat.y - 40, 6, { min: 60, max: 160, color: '#FFE48A', life: 0.7, g: 120, rmin: 4, rmax: 7 });
      }
    }
  }
  function comboReset() {
    const c = w.combo;
    c.count = 0;
    c.timer = 0;
    c.tier = '';
    c.mult = 1;
  }
  function award(pts, label, x, y, color) {
    const v = pts * w.combo.mult;
    w.score += v;
    popText(label ? `${label} +${v}` : `+${v}`, x, y, color);
  }

  // ══ ที่ยืน ══════════════════════════════════════════════════
  const surface = () => FLOOR - w.level;
  const topOf = (p) => p.y + (p.sink || 0);
  const solid = (p) => p.state !== 'gone';
  const allPlats = () => w.plats.concat(w.floats);
  const inX = (p, x, pad = 6) => x >= p.x - pad && x <= p.x + p.w + pad;

  /** กล่องกระดาษ: แห้ง → เปียก → สั่น (เตือน) → จม — ไม่จมทันทีแบบไม่บอก */
  function updatePlatforms(dt) {
    const sy = surface();
    for (const p of w.plats) {
      if (!p.temp || p.state === 'gone') continue;
      if (p.state === 'dry' && sy < FLOOR - 6) { p.state = 'wet'; p.t = 0; }
      if (p.state === 'wet') {
        p.t += dt;
        p.wetK = Math.min(1, p.t / 3.5);
        if (p.t > 3.5) { p.state = 'shake'; p.t = 0; sfx.shake(); }
      } else if (p.state === 'shake') {
        p.t += dt;
        p.k = Math.min(1, p.t / 1.6);
        if (p.t > 1.6) { p.state = 'sink'; p.t = 0; sfx.bubblePop(); splashAt(p.x + p.w / 2, sy, 6); }
      } else if (p.state === 'sink') {
        p.sink += 46 * dt;
        if (p.sink > FLOOR - p.y + 12) p.state = 'gone';
      }
    }
    // กล่องลอยน้ำ: ลอยตามผิวน้ำ ไหลช้า ๆ ครบเวลาแล้วสั่นก่อนจม
    for (const f of w.floats) {
      f.t += dt;
      if (f.state === 'float') {
        f.x = clamp(f.x + f.vx * dt, 20, W - 20 - f.w);
        if (f.x <= 20 || f.x >= W - 20 - f.w) f.vx = -f.vx;
        if (f.t > f.life) { f.state = 'shake'; f.t = 0; sfx.shake(); }
      } else if (f.state === 'shake') {
        f.k = Math.min(1, f.t / 1.5);
        if (f.t > 1.5) { f.state = 'sink'; f.t = 0; sfx.bubblePop(); }
      } else if (f.state === 'sink') {
        f.sink += 38 * dt;
        if (f.sink > 40) f.state = 'gone';
      }
      f.y = waterY(sy, f.x + f.w / 2, w.clock, w.crest) - 14 + (f.drop > 0 ? -f.drop : 0);
      if (f.drop > 0) f.drop = Math.max(0, f.drop - 220 * dt);
    }
    w.floats = w.floats.filter((f) => f.state !== 'gone');
  }

  // ══ น้อง ════════════════════════════════════════════════════
  function updateCat(dt) {
    const c = w.cat;
    c.t += dt * 60;
    if (c.safe > 0) c.safe -= dt;
    // จมน้ำอยู่ (เพิ่งเสียหัวใจ) — ตัวลอยนิ่งในน้ำ ควบคุมไม่ได้ ครบเวลาแล้วถูกช่วยขึ้นที่แห้ง
    if (c.rescue > 0) {
      c.rescue -= dt;
      c.vx = 0;
      c.y = Math.min(c.y + 30 * dt, FLOOR);
      if (Math.random() < dt * 14) emit('drop', c.x + rand(-14, 14), surface(), 1, { min: 60, max: 130, angle: -Math.PI / 2 + rand(-0.6, 0.6), life: 0.5 });
      if (c.rescue <= 0) rescueCat();
      return;
    }
    const slow = c.wet >= 2 ? 0.7 : 1;
    const ctl = c.stun > 0 ? 0 : 1;
    if (c.stun > 0) c.stun -= dt;
    const keys = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const dir = ctl * (keys || input.axis);
    if (dir) c.dir = Math.sign(dir);
    const target = dir * PLAYER_SPEED * slow;
    const acc = c.onGround ? GROUND_ACCEL : AIR_ACCEL;
    if (dir) c.vx += clamp(target - c.vx, -acc * dt, acc * dt);
    else {
      const f = c.onGround ? FRICTION : AIR_FRICTION;
      c.vx += clamp(-c.vx, -f * dt, f * dt);
    }

    // กระโดด (บัฟเฟอร์ + coyote) — ไม่มีกระโดดสองชั้น ผู้เล่นต้องคิดเรื่องตำแหน่ง
    const wantJump = input.jumpAt >= 0 && w.clock - input.jumpAt <= JUMP_BUFFER;
    if (ctl && wantJump && (c.onGround || c.coyote > 0)) {
      input.jumpAt = -1;
      c.vy = -JUMP_FORCE * (c.wet >= 2 ? 0.9 : 1);
      c.takeoff = c.onGround ? c.ground : c.takeoff;
      c.takeoffY = c.y;
      c.onGround = false;
      c.coyote = 0;
      c.squash = -0.15;
      sfx.jump();
      if (c.wet) splashAt(c.x, surface(), 5);
      else emit('dust', c.x, c.y, 4, { min: 20, max: 60, g: -20, life: 0.4 });
    }

    // ทิ้งตัวลงจากที่ยืน (↓ / ดึงจอยลง) — ลอดผ่านชิ้นที่ยืนอยู่ ไปลงชิ้นล่างได้ทันที ไม่ต้องเดินหาขอบ
    const wantDrop = input.dropAt >= 0 && w.clock - input.dropAt <= JUMP_BUFFER;
    if (ctl && wantDrop && c.onGround && c.ground) {
      input.dropAt = -1;
      c.dropPlat = c.ground;
      c.dropT = DROP_S;
      c.takeoff = c.ground;
      c.takeoffY = c.y;
      c.onGround = false;
      c.ground = null;
      c.vy = 140;
      c.y += 2;
      c.coyote = 0;
    }
    if (c.dropT > 0) c.dropT -= dt;

    // ยืนบนของที่ขยับ (กล่องลอย/กล่องจม) = ตัวไปกับมัน
    if (c.onGround && c.ground) {
      const p = c.ground;
      if (!solid(p) || !inX(p, c.x, 4)) {
        c.onGround = false;
        c.coyote = COYOTE;
        c.takeoff = p;
        c.takeoffY = c.y;
      } else {
        c.y = topOf(p);
        if (p.vx && p.state === 'float') c.x += p.vx * dt;
      }
    }

    if (!c.onGround) {
      c.coyote = Math.max(0, c.coyote - dt);
      c.vy = Math.min(MAX_FALL_SPEED, c.vy + GRAVITY * (c.vy > 0 ? FALL_MULT : 1) * dt);
    }
    c.x = clamp(c.x + c.vx * dt, 18, W - 18);
    const prev = c.y;
    if (!c.onGround) {
      c.y += c.vy * dt;
      if (c.vy >= 0) {
        // ชนที่ยืนแบบทางเดียว: ตกลงมาทับผิวบนเท่านั้น (กระโดดลอดจากข้างล่างขึ้นไปได้)
        let land = null, landY = FLOOR;
        if (c.y >= FLOOR) land = 'floor';
        for (const p of allPlats()) {
          if (!solid(p) || p.state === 'sink' && p.sink > 20) continue;
          if (c.dropT > 0 && p === c.dropPlat) continue;   // กำลังทิ้งตัวลอดชิ้นนี้
          const top = topOf(p);
          // ลงจอดเผื่อขอบ 12 หน่วย — เท้าเฉียดขอบก็ยังยืนได้ (ตาเห็นว่าแตะแล้ว)
          if (prev <= top + 2 && c.y >= top && inX(p, c.x, 12) && top <= landY) { land = p; landY = top; }
        }
        if (land) landOn(land === 'floor' ? null : land, land === 'floor' ? FLOOR : landY);
      }
    }
    c.speed = Math.abs(c.vx) / PLAYER_SPEED;
    if (c.onGround && c.speed > 0.05) c.runPhase += dt * 14 * c.speed;
    c.squash += (0 - c.squash) * Math.min(1, dt * 10);
  }

  function landOn(p, y) {
    const c = w.cat;
    const fall = c.vy;
    c.y = y;
    c.vy = 0;
    c.onGround = true;
    c.ground = p;
    if (fall > 300) {
      c.squash = 0.18;
      sfx.land();
      if (c.wet) splashAt(c.x, surface(), 4);
      else emit('dust', c.x, y, 5, { min: 30, max: 90, g: -10, life: 0.45 });
    }
    // Clean Jump: จากที่ยืนชิ้นหนึ่งไปอีกชิ้น (ไม่นับพื้นห้อง)
    if (p && c.takeoff && c.takeoff !== p) {
      award(50, 'Clean Jump', c.x, y - 60, '#9DF2C8');
      comboUp();
    }
    // Near Miss: น้ำเกือบถึงเท้าแล้วหนีขึ้นที่สูงทัน
    if (w.nearMiss.armed > 0 && y < c.takeoffY - 30 && w.nearMiss.cool <= 0) {
      award(100, 'Near Miss!', c.x, y - 84, '#FFE48A');
      comboUp();
      w.nearMiss.armed = 0;
      w.nearMiss.cool = 3;
      c.mood = 'happy';
      c.moodT = 0.8;   // 😮‍💨 รอดแล้ว
    }
    c.takeoff = null;
  }

  /** ความเปียก 0-3 จากน้ำเหนือเท้า — ถึงหัว = จบ */
  function updateWet(dt) {
    const c = w.cat;
    if (c.rescue > 0) return;
    const depth = c.y - waterY(surface(), c.x, w.clock, w.crest);
    const wet = depth <= WET_FEET ? 0 : depth < WET_BODY ? 1 : depth < WET_HEAD ? 2 : 3;
    if (wet > c.wet) {
      if (wet === 1) { sfx.startle(); splashAt(c.x, c.y, 5); }
      if (wet === 2) { sfx.hurt(); splashAt(c.x, c.y - 10, 8); comboReset(); }   // ตกน้ำ = คอมโบหลุด
    }
    c.wet = wet;
    if (wet === 3) return loseHeart();
    // น้ำใต้เท้าไม่ถึง 12 หน่วย = ตั้งไว้ว่า "เกือบโดน" ถ้าหนีขึ้นที่สูงได้ภายใน 1.5 วิ ได้โบนัส
    if (depth > -12 && depth <= 0 && c.onGround) w.nearMiss.armed = 1.5;
    w.nearMiss.armed = Math.max(0, w.nearMiss.armed - dt);
    w.nearMiss.cool = Math.max(0, w.nearMiss.cool - dt);
    c.shiver = wet >= 2 ? 1 : wet === 1 ? 0.4 : 0;
    // หน้าตาตามสถานการณ์: น้ำมา 😨 → เท้าเปียก 😐 → ตัวเปียก 😿 → ใกล้หัว 😱
    if (c.moodT > 0) { c.moodT -= dt; return; }
    c.mood = wet >= 2 ? (depth > WET_HEAD - 12 ? 'dizzy' : 'sad') : wet === 1 ? 'hurt' : depth > -45 ? 'sad' : '';
    c.mouth = wet >= 2 && Math.sin(w.clock * 6) > 0.3 ? 1 : 0;
  }

  // ══ หัวใจ ═══════════════════════════════════════════════════
  /** น้ำถึงหัว = เสียหัวใจ 1 ดวง (แตกใน HUD) · หมดหัวใจ = จบเกม · ยังเหลือ = จมแวบหนึ่งแล้วถูกช่วยขึ้นที่แห้ง */
  function loseHeart() {
    const c = w.cat;
    if (c.safe > 0 || c.rescue > 0) return;
    w.hearts--;
    w.heartFx.push({ i: w.hearts, t: 0 });
    sfx.shieldBreak();
    sfx.splash();
    comboReset();
    w.shake = 0.18;
    splashAt(c.x, c.y - CAT_H, 14);
    if (w.hearts <= 0) return gameOver();
    later(() => sfx.startle(), 150);
    c.rescue = RESCUE_S;
    c.stun = 0;
    c.vy = 0;
    c.onGround = false;
    c.ground = null;
    c.mood = 'dizzy';
    c.moodT = RESCUE_S + 0.6;
  }

  /** ช่วยน้องขึ้นที่แห้งที่ใกล้ที่สุด (สูงพ้นน้ำพอ) — ไม่มีเลยก็เสกกล่องลอยน้ำมารองให้ */
  function rescueCat() {
    const c = w.cat;
    const sy = surface();
    const dry = (gap) => allPlats().filter((p) => solid(p) && p.state !== 'sink' && p.state !== 'shake' && topOf(p) < sy - gap);
    let spots = dry(CAT_H + 20);
    if (!spots.length) spots = dry(CAT_H * 0.6);
    let p;
    if (spots.length) {
      p = spots.reduce((a, b) => (Math.abs(b.x + b.w / 2 - c.x) < Math.abs(a.x + a.w / 2 - c.x) ? b : a));
    } else {
      spawnFloat();
      p = w.floats[w.floats.length - 1];
      p.x = clamp(c.x - 30, 30, W - 90);
      p.drop = 0;
      p.life += 3;
    }
    c.x = p.x + p.w / 2;
    c.y = topOf(p);
    c.vx = 0;
    c.vy = 0;
    c.onGround = true;
    c.ground = p;
    c.wet = 0;
    c.safe = SAFE_S;
    c.mood = 'happy';
    c.moodT = 0.9;   // 😮‍💨 รอดแล้ว
    sfx.trill();
    emit('spark', c.x, c.y - 30, 8, { min: 40, max: 130, g: 40, life: 0.7, rmin: 3, rmax: 6, color: '#FFF3B0' });
    popText(tr('รอดแล้ว!'), c.x, c.y - CAT_H - 18, '#9DF2C8', 17);
  }

  // ══ อีเวนต์สุ่ม ═════════════════════════════════════════════
  /** ที่ที่ของจะตกลงไปเจอ ณ x — ผิวที่ยืนสูงสุดใต้ y หรือผิวน้ำ (แล้วแต่อันไหนสูงกว่า) */
  function landYAt(x) {
    let y = FLOOR;
    for (const p of allPlats()) if (solid(p) && inX(p, x, 0)) y = Math.min(y, topOf(p));
    return Math.min(y, surface());
  }

  function startHazard() {
    const c = w.cat;
    const kinds = ['splash'];
    if (w.time > 26) kinds.push('bucket');
    if (w.time > 30) kinds.push('shower');
    if (w.level > 30) kinds.push('wave');
    const kind = pick(kinds);
    const ev = { kind, phase: 'warn', t: 0, hit: false };
    if (kind === 'splash') {
      ev.side = Math.random() < 0.5 ? -1 : 1;
      ev.y = clamp(c.y - 24, 60, FLOOR - 20);
      ev.warn = 1.2;
      ev.x = ev.side < 0 ? -30 : W + 30;
    } else if (kind === 'shower') {
      ev.x = clamp(c.x + rand(-40, 40), 80, W - 80);
      ev.w = 96;
      ev.warn = 1.4;
      sfx.pour();
    } else if (kind === 'bucket') {
      ev.x = clamp(c.x, 50, W - 50);
      ev.groundY = landYAt(ev.x);
      ev.warn = 1.25;
      ev.y = -40;
      ev.vy = 0;
    } else {
      ev.side = Math.random() < 0.5 ? -1 : 1;
      ev.warn = 1.2;
      ev.surface = surface();
    }
    // เริ่มเตือนตอนน้องอยู่ในเขตอันตรายพอดี — หนีพ้นได้ = Perfect Escape
    ev.inDanger = dangerNow(ev);
    w.events.push(ev);
  }

  function dangerNow(ev) {
    const c = w.cat;
    if (ev.kind === 'splash') return Math.abs(ev.y - (c.y - 22)) < 30;
    if (ev.kind === 'shower') return Math.abs(c.x - ev.x) < ev.w / 2 + 10;
    if (ev.kind === 'bucket') return Math.abs(c.x - ev.x) < 34;
    return c.y > surface() - 34;
  }

  function hitCat(ev, knockX = 0, knockY = -220, stun = 0.35) {
    const c = w.cat;
    if (ev.hit) return;
    ev.hit = true;
    c.stun = stun;
    c.vx = knockX;
    if (knockY) { c.vy = knockY; c.onGround = false; c.ground = null; }
    c.mood = 'hurt';
    c.moodT = 0.9;
    comboReset();
    sfx.splash();
    later(() => sfx.startle(), 90);
    splashAt(c.x, c.y - 26, 12);
    w.shake = 0.15;
  }

  /** ตัวจับเวลาเล็ก ๆ ในเกม — เดินตามเวลาเกม (หยุดตอนพัก) และล้างทิ้งทั้งหมดตอนออก */
  let timers = [];
  function later(fn, ms) { timers.push({ at: w.clock + ms / 1000, fn }); }

  function updateEvents(dt) {
    const c = w.cat;
    // ── ตารางอันตราย: ถี่ขึ้นตามเวลา ห่างกันอย่างน้อย 5 วิ ทีละหนึ่งอย่าง ──
    if (w.time >= w.nextHazard && !w.events.some((e) => e.kind !== 'float')) {
      startHazard();
      const gap = Math.max(5, 9.5 - (w.time - 22) * 0.06);
      w.nextHazard = w.time + rand(gap, gap + 2.5);
    }
    // ── กล่องลอยน้ำ (ตัวช่วย): บ่อยขึ้นตอนน้ำสูง — ช่วงท้ายคือทางรอดเดียว ──
    if (w.time >= w.nextFloat && w.level > 40) {
      spawnFloat();
      const high = w.level > 220;
      w.nextFloat = w.time + (high ? rand(4.5, 6) : rand(8, 11));
    }

    for (const ev of w.events) {
      ev.t += dt;
      if (ev.phase === 'warn') {
        if (ev.t >= ev.warn) {
          ev.phase = 'go';
          ev.t = 0;
          if (ev.kind === 'splash') sfx.splash();
          if (ev.kind === 'wave') { sfx.swish(); later(() => sfx.splash(), 160); w.crest = { x: ev.side < 0 ? -60 : W + 60, h: 0 }; }
          if (ev.kind === 'shower') sfx.pour();
        }
        continue;
      }
      if (ev.kind === 'splash') {
        ev.x -= ev.side * 900 * dt;
        if (Math.abs(ev.x - c.x) < 30 && Math.abs(ev.y - (c.y - 22)) < 26) hitCat(ev, -ev.side * 260);
        if (ev.x < -60 || ev.x > W + 60) ev.done = true;
      } else if (ev.kind === 'shower') {
        if (Math.abs(c.x - ev.x) < ev.w / 2 + 8) hitCat(ev, 0, 0, 0.2);
        w.level = Math.min(WATER_MAX, w.level + 1.1 * dt);
        if (Math.random() < dt * 20) splashAt(ev.x + rand(-ev.w / 2, ev.w / 2), landYAt(ev.x), 1);
        if (ev.t > 2.8) ev.done = true;
      } else if (ev.kind === 'bucket') {
        if (ev.phase === 'go') {
          ev.vy += GRAVITY * 0.8 * dt;
          ev.y += ev.vy * dt;
          if (Math.abs(ev.x - c.x) < 30 && ev.y + 10 > c.y - CAT_H && ev.y - 22 < c.y) hitCat(ev, 0, -160, 0.5);
          if (ev.y + 10 >= ev.groundY) {
            ev.y = ev.groundY - 10;
            ev.phase = 'land';
            ev.t = 0;
            sfx.thump();
            w.shake = 0.12;
            if (ev.groundY >= surface() - 2) { w.level = Math.min(WATER_MAX, w.level + 3); splashAt(ev.x, ev.groundY, 10); }
            else emit('dust', ev.x, ev.groundY, 6, { min: 40, max: 110, g: -10, life: 0.5 });
          }
        } else {
          ev.rot = Math.min(1.4, ev.t * 4);
          if (ev.t > 0.7) ev.done = true;
        }
      } else if (ev.kind === 'wave') {
        const cr = w.crest;
        cr.x -= ev.side * 520 * dt;
        cr.h = Math.min(26, cr.h + 120 * dt);
        if (Math.abs(c.x - cr.x) < 28 && c.y > surface() - 30) hitCat(ev, -ev.side * 220, -320, 0.3);
        if (cr.x < -80 || cr.x > W + 80) { ev.done = true; w.crest = null; }
      }
      // จบอีเวนต์โดยไม่โดน ทั้งที่ตอนเริ่มเตือนยืนอยู่ในเขตอันตราย = Perfect Escape
      if (ev.done && ev.inDanger && !ev.hit) {
        award(200, 'Perfect Escape!', c.x, c.y - 70, '#FF9FD2');
        comboUp();
        sfx.bonus();
      }
    }
    w.events = w.events.filter((e) => !e.done);
  }

  function spawnFloat() {
    const c = w.cat;
    // ห่างน้องพอให้ต้องกระโดด แต่ไม่ไกลเกินเอื้อม · ไม่ทับตัวน้อง
    const side = c.x < W / 2 ? 1 : -1;
    const x = clamp(c.x + side * rand(110, 210) - 30, 30, W - 90);
    const life = Math.max(5, 8 - w.time * 0.02);
    w.floats.push({ type: 'float', x, y: surface() - 14, w: 60, vx: rand(-14, 14), state: 'float', t: 0, k: 0, sink: 0, life, drop: 90, wetK: 0.3 });
    sfx.bubblePop();
    later(() => splashAt(x + 30, surface(), 8), 380);
  }

  // ══ ของเก็บ ═════════════════════════════════════════════════
  // ของกินจากเกมหลัก: [ชนิด, คะแนน, โอกาส%, ชอบที่สูง]
  // คะแนน = ของในด่าน ÷ 10 (ลำดับและสัดส่วนเท่ากัน ให้เข้ากับสเกลมินิเกม) · ยิ่งคะแนนสูงยิ่งหายาก
  // ของคะแนนสูง (กุ้งทอง คริสตัลดาว) ชอบไปอยู่บนชั้นสูง ต้องกระโดดไปเก็บ = รางวัลของคนกล้าเสี่ยง
  const ITEMS = [
    ['jelly', 40, 40, false],
    ['fish', 100, 30, false],
    ['kibble', 250, 17, false],
    ['shrimp', 550, 9, true],
    ['crystal', 1200, 4, true],
  ];
  function spawnItem() {
    const sy = surface();
    const c = w.cat;
    // วางบนที่ยืนที่ยังแห้งเท่านั้น — ไม่มีของที่ต้องลงน้ำไปเก็บ
    const spots = allPlats().filter((p) => solid(p) && p.state !== 'sink' && topOf(p) < sy - 34);
    if (!spots.length) return;
    let r = Math.random() * 100;
    let kind = ITEMS[0];
    for (const it of ITEMS) { if (r < it[2]) { kind = it; break; } r -= it[2]; }
    // ของดีไปอยู่สูง (ถ้ายังมีชั้นสูงที่แห้งอยู่) — ของธรรมดาอยู่ที่ไหนก็ได้
    const high = spots.filter((p) => topOf(p) < 270);
    const p = pick(kind[3] && high.length ? high : spots);
    const x = p.x + rand(14, p.w - 14);
    const y = topOf(p) - rand(24, 60);
    if (Math.hypot(x - c.x, y - (c.y - 24)) < 70) return;
    w.items.push({ kind: kind[0], pts: kind[1], x, y, t: 0, fade: 0, plat: p, dy: y - topOf(p) });
  }
  function updateItems(dt) {
    const c = w.cat;
    w.itemTimer -= dt;
    if (w.itemTimer <= 0 && w.items.length < 2) { spawnItem(); w.itemTimer = rand(3.5, 5); }
    const sy = surface();
    for (const it of w.items) {
      it.t += dt;
      if (it.plat) it.y = topOf(it.plat) + it.dy;
      if (it.plat?.state === 'float') it.x += it.plat.vx * dt;
      it.fade = Math.min(1, it.t * 4);
      if (it.t > 11 || it.y > sy - 6 || !solid(it.plat)) { it.gone = true; continue; }
      // ระยะเก็บกว้างตามขนาดที่ตาเห็น (คริสตัลใหญ่สุด เก็บง่ายสุด — เหมือนในด่าน)
      const reach = it.kind === 'crystal' ? 40 : it.kind === 'shrimp' ? 34 : 30;
      if (Math.hypot(it.x - c.x, it.y - (c.y - 24)) < reach) {
        it.gone = true;
        const col = TREAT_COLOR[it.kind] || '#FFE48A';
        award(it.pts, '', it.x, it.y - 18, col);
        comboUp();
        // เสียงเก็บของกินชนิดนั้นจากเกมหลัก (ดู TREATS.sfx)
        (sfx[TREATS[it.kind]?.sfx] || sfx.fish)();
        const n = it.kind === 'crystal' ? 14 : it.kind === 'shrimp' ? 10 : 6;
        emit('spark', it.x, it.y, n, { min: 50, max: it.kind === 'crystal' ? 220 : 140, g: 60, life: 0.6, rmin: 3, rmax: it.kind === 'crystal' ? 8 : 6, color: col });
        if (it.kind === 'crystal') w.shake = 0.08;
      }
    }
    w.items = w.items.filter((i) => !i.gone);
  }

  // ══ จบเกม ═══════════════════════════════════════════════════
  function gameOver() {
    if (state === S.GAME_OVER || state === S.RESULT) return;
    state = S.GAME_OVER;
    w.over = 0;
    input.left = input.right = false; input.axis = 0;
    sfx.splash();
    later(() => sfx.hurt(), 120);
    splashAt(w.cat.x, w.cat.y - CAT_H, 14);
  }

  function showResult() {
    state = S.RESULT;
    const time = Math.floor(w.time);
    w.newBest = w.score > best.score;
    if (w.newBest) best.score = w.score;
    if (time > best.time) best.time = time;
    savePref(PREF, best);
    w.reward = onFinish ? onFinish({ score: w.score, time, best: best.score }) || '' : '';
    $('cwResTitle').textContent = w.newBest ? '🎉 NEW BEST!' : '💦 GAME OVER';
    $('cwResTime').textContent = fmtTime(time);
    $('cwResScore').textContent = w.score.toLocaleString('en-US');
    $('cwResBest').textContent = best.score.toLocaleString('en-US');
    $('cwResReward').textContent = w.reward;
    $('cwResReward').classList.toggle('hidden', !w.reward);
    // การ์ดสรุปหลบไปอีกฝั่งของตัวน้อง (เห็นน้องเปียก/กระโดดดีใจข้าง ๆ)
    $('cwResult').classList.toggle('side-r', w.cat.x < W / 2);
    $('cwResult').classList.toggle('side-l', w.cat.x >= W / 2);
    $('cwResult').classList.remove('hidden');
    if (w.newBest) { sfx.cheer(); later(() => sfx.levelUp(), 300); } else later(() => sfx.mew(), 200);
  }

  // ══ หนึ่งเฟรม ═══════════════════════════════════════════════
  function update(dt) {
    w.clock += dt;
    for (const tm of timers) if (w.clock >= tm.at) { tm.done = true; tm.fn(); }
    timers = timers.filter((tm) => !tm.done);
    // ฟองอากาศ + ละออง เดินตลอด (แม้ตอนนับถอยหลัง/จบเกม — ฉากยังมีชีวิต)
    const sy = surface();
    for (const b of w.bubbles) {
      b.y -= b.v * dt;
      b.x += Math.sin(w.clock * 2 + b.r) * 6 * dt;
      if (b.y < sy + 6) { b.y = FLOOR - rand(0, 8); b.x = rand(0, W); }
    }
    for (const p of w.parts) {
      p.life -= dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    w.parts = w.parts.filter((p) => p.life > 0);
    w.combo.pop = Math.max(0, w.combo.pop - dt * 3);
    for (const h of w.heartFx) h.t += dt;
    w.heartFx = w.heartFx.filter((h) => h.t < 1.1);
    w.shake = Math.max(0, w.shake - dt);

    if (state === S.COUNTDOWN) {
      w.cd += dt;
      if (w.cd > 1.7 && w.cd - dt <= 1.7) sfx.pour();             // เสียงน้ำเริ่มไหล 💧
      for (const k of [1.9, 2.7, 3.5]) if (w.cd >= k && w.cd - dt < k) sfx.bowlTap?.();
      if (w.cd >= 4.3) { state = S.PLAYING; sfx.trill(); }
      return;
    }
    if (state === S.GAME_OVER) {
      w.over += dt;
      // หยุดค้าง 0.5 วิ แล้วน้องเปียกหมดแรง หยดน้ำ แล้วค่อยขึ้นหน้าสรุป
      if (w.over > 0.5 && Math.random() < dt * 10) emit('drop', w.cat.x + rand(-16, 16), w.cat.y - rand(10, 40), 1, { min: 0, max: 10, angle: Math.PI / 2, g: 500, life: 0.6 });
      if (w.over > 2.1) showResult();
      return;
    }
    if (state === S.RESULT) {
      if (w.newBest && Math.random() < dt * 6) emit('spark', w.cat.x + rand(-40, 40), w.cat.y - rand(40, 90), 1, { min: 10, max: 40, g: 40, life: 0.8, rmin: 4, rmax: 7 });
      return;
    }
    if (!LIVE.has(state)) return;

    w.time += dt;
    updateCat(dt);
    updatePlatforms(dt);
    w.level = Math.min(WATER_MAX, w.level + riseSpeed(w.time) * dt);
    updateEvents(dt);
    updateItems(dt);
    updateWet(dt);
    if (!LIVE.has(state)) return;

    // คะแนนเวลา 10/วิ + โบนัสรอดทุก 5 วิ
    w.timePts += dt * 10;
    if (w.timePts >= 1) { const n = Math.floor(w.timePts); w.score += n; w.timePts -= n; }
    if (Math.floor(w.time / 5) > w.survTick) {
      w.survTick = Math.floor(w.time / 5);
      w.score += 100;
      popText(tr('+100 รอด!'), w.cat.x, w.cat.y - 70, '#BDE8FF', 15);
    }
    if (w.combo.timer > 0) { w.combo.timer -= dt; if (w.combo.timer <= 0) comboReset(); }

    // วิกฤต: น้ำสูงเกินชั้นกลาง หรือน้องตัวเปียกแล้ว
    w.critical = surface() < 240 || w.cat.wet >= 2;
    state = w.critical ? S.CRITICAL : S.PLAYING;
  }

  function draw() {
    const { dpr, scale, ox, oy } = view;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    const sh = w.shake > 0 ? (Math.random() - 0.5) * 6 : 0;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (ox + sh * scale), dpr * oy);
    const t = w.clock;
    for (const p of w.plats) if (p.state !== 'gone') drawPlatform(ctx, p, t);
    for (const it of w.items) drawCollectible(ctx, it, t);
    for (const ev of w.events) if (ev.kind === 'bucket' || ev.kind === 'shower') drawEvent(ctx, ev, t);

    const c = w.cat;
    const front = state === S.COUNTDOWN || state === S.GAME_OVER || state === S.RESULT;
    if (front) drawFrontCat(c, t);
    else {
      // อมตะหลังถูกช่วย = ตัวกะพริบจาง-ชัด (ไม่หายวับทั้งตัว ผู้เล่นต้องเห็นตลอดว่าน้องอยู่ไหน)
      ctx.save();
      if (c.safe > 0 && Math.floor(t * 12) % 2) ctx.globalAlpha = 0.35;
      drawCatSide(ctx, c);
      ctx.restore();
    }

    for (const f of w.floats) drawPlatform(ctx, f, t);
    drawWater(ctx, surface(), t, w.crest, w.bubbles);
    for (const ev of w.events) if (ev.kind === 'splash' || ev.kind === 'wave') drawEvent(ctx, ev, t);
    drawParticles(ctx, w.parts);

    if (state !== S.COUNTDOWN) drawHud(ctx, { time: w.time, score: w.score, combo: w.combo, critical: w.critical && LIVE.has(state), clock: t, hearts: w.hearts, heartFx: w.heartFx, max: HEARTS }, view);
    if (state === S.COUNTDOWN) {
      if (w.cd < 1.9) drawSpeech(ctx, c.x, c.y - CAT_H * 1.45 - 6, tr(retry ? 'เอาใหม่ก็ได้... แต่ไม่เอาน้ำนะ!' : 'ไม่เอาน้ำนะ...'));
      else {
        const k = w.cd - 1.9;
        const step = Math.floor(k / 0.8);
        const label = ['3', '2', '1', 'GO!'][Math.min(3, step)];
        drawCountdown(ctx, label, (k % 0.8) / 0.8);
      }
    }
  }

  function drawFrontCat(c, t) {
    const f = t * 60;
    let idle;
    if (state === S.COUNTDOWN) {
      // มองน้ำ 😨 (รอบใหม่ 😾 หูลู่ไม่พอใจ)
      const look = w.cd > 1.6 ? 1 : 0;
      idle = retry
        ? { shape: { ear: 0.75, tilt: -0.08, gaze: 0, wag: 0.8 * Math.sin(f * 0.3) }, k: 1, mood: 'smug', gaze: 0.6 }
        : { shape: { ear: 0.4 + look * 0.4, sy: -0.03 * look, puff: 0.25 * look }, k: 1, mood: look ? 'hurt' : '', gaze: 0.7 };
    } else if (state === S.RESULT && w.newBest) {
      // ทำลายสถิติ: กระโดดดีใจ หางแกว่ง ตาเป็นดาว
      const hop = Math.abs(Math.sin(t * 5)) * 16;
      drawCatFront(ctx, c.x, c.y - hop, CAT_SCALE, skin, f, { shape: { wave: 1, wag: Math.sin(f * 0.35) * 0.9, sy: 0.04 }, k: 1, mood: 'starry' });
      return;
    } else {
      // เปียกน้ำหมดแรง 😿💦 — นั่งแหมะ หูลู่ ตัวแบน
      idle = { shape: { sit: 1, ear: 0.9, sy: -0.06, sx: 0.04, wag: 0, tailShort: 0.4 }, k: 1, mood: 'sad' };
    }
    drawCatFront(ctx, c.x, c.y, CAT_SCALE, skin, f, idle);
  }

  // ══ ลูป ══════════════════════════════════════════════════════
  const pace = framePacer();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    // เพดานเฟรมของหน้า 'บ้านแมว+มินิเกม' (ตั้งค่า → กราฟิก) — ตั้งทีเดียวกับบ้านลูกเหมียว
    if (!pace(now, quality('room').fps)) return;
    const dt = Math.min(1 / 30, Math.max(0, (now - lastNow) / 1000));
    lastNow = now;
    if (state !== S.PAUSED) update(dt);
    resize();
    draw();
  }

  // ══ ปุ่ม ═════════════════════════════════════════════════════
  const KEYS_LEFT = ['ArrowLeft', 'KeyA'];
  const KEYS_RIGHT = ['ArrowRight', 'KeyD'];
  const KEYS_JUMP = ['Space', 'ArrowUp', 'KeyW'];
  const KEYS_DROP = ['ArrowDown', 'KeyS'];
  function onKey(e) {
    if (panel.classList.contains('hidden')) return;
    const down = e.type === 'keydown';
    let used = true;
    if (KEYS_LEFT.includes(e.code)) input.left = down;
    else if (KEYS_RIGHT.includes(e.code)) input.right = down;
    else if (KEYS_JUMP.includes(e.code)) { if (down && !e.repeat) input.jumpAt = w ? w.clock : 0; }
    else if (KEYS_DROP.includes(e.code)) { if (down && !e.repeat) input.dropAt = w ? w.clock : 0; }
    else if (down && (e.code === 'KeyP' || e.code === 'Escape')) togglePause();
    else used = false;
    // กันปุ่มไปถึงเกมหลักข้างหลัง (เช่น Space = เริ่มวิ่ง)
    if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
  }
  function onBlur() { input.left = input.right = false; input.axis = 0; }
  function onVis() { if (document.hidden && LIVE.has(state)) togglePause(); }

  // ── จอยสติ๊กลอย (แบบเกมมือถือ) ──
  // แตะตรงไหนก็ได้ในครึ่งซ้าย = วงจอยไปเกิดใต้นิ้ว ไม่ต้องเล็งปุ่มเล็ก ๆ
  // ลากซ้าย/ขวา = เดิน แรงตามระยะลาก (มีช่วงตายกลางกันมือสั่น และถึง 55% ของรัศมีก็วิ่งเต็มแรงแล้ว)
  // จอยใช้เดินอย่างเดียว (ซ้าย/ขวา) — กระโดดคือปุ่ม 🐾 ทางขวาเท่านั้น
  // (เคยให้ดันขึ้น = กระโดด แต่นิ้วที่ลากเฉียงขึ้นนิดเดียวก็ถึงเกณฑ์ น้องกระโดดเองโดยไม่ตั้งใจ)
  const stick = $('cwStick'), stickBase = $('cwStickBase'), knob = $('cwStickKnob');
  const STICK_R = 46;
  let stickId = null, sx0 = 0;
  function stickHome() {
    stickBase.style.removeProperty('left');
    stickBase.style.removeProperty('top');
    stick.classList.remove('on');
  }
  function stickMove(e) {
    // ปุ่มจอยเลื่อนได้แค่แนวนอน — ให้เห็นชัดว่าจอยนี้ใช้เดินอย่างเดียว
    const dx = clamp(e.clientX - sx0, -STICK_R, STICK_R);
    knob.style.transform = `translate(${dx}px, 0)`;
    const k = dx / STICK_R;
    // ช่วงตายกลาง 12% · ถึง 55% ของรัศมีก็วิ่งเต็มแรง (เดิม 70% — ต้องลากไกลเกิน นิ้วล้า)
    const DEAD = 0.12;
    input.axis = Math.abs(k) < DEAD ? 0 : Math.sign(k) * Math.min(1, (Math.abs(k) - DEAD) / (0.55 - DEAD));
  }
  stick.addEventListener('pointerdown', (e) => {
    if (stickId !== null) return;
    e.preventDefault();
    stickId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    const r = stick.getBoundingClientRect();
    sx0 = e.clientX;
    stickBase.style.left = `${e.clientX - r.left}px`;
    stickBase.style.top = `${e.clientY - r.top}px`;
    stick.classList.add('on');
    stickMove(e);
  });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) stickMove(e); });
  const stickEnd = (e) => {
    if (e.pointerId !== stickId) return;
    stickId = null;
    input.axis = 0;
    knob.style.transform = '';
    stickHome();
  };
  for (const ev of ['pointerup', 'pointercancel']) stick.addEventListener(ev, stickEnd);
  $('cwJump').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (w) input.jumpAt = w.clock;
    $('cwJump').classList.add('on');
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) $('cwJump').addEventListener(ev, () => $('cwJump').classList.remove('on'));

  function togglePause() {
    if (state === S.PAUSED) {
      state = paused;
      paused = null;
      $('cwPauseBox').classList.add('hidden');
      sfx.resume();
      lastNow = performance.now();
    } else if (LIVE.has(state) || state === S.COUNTDOWN) {
      paused = state;
      state = S.PAUSED;
      input.left = input.right = false; input.axis = 0;
      $('cwPauseBox').classList.remove('hidden');
      killSfx();
      sfx.pause();
    }
  }
  $('cwPause').addEventListener('click', togglePause);
  $('cwResume').addEventListener('click', togglePause);
  $('cwQuit').addEventListener('click', () => close());
  $('cwRetry').addEventListener('click', () => { sfx.restart(); start(true); });
  $('cwHome').addEventListener('click', () => close());

  // ══ เปิด / เริ่ม / ปิด ═════════════════════════════════════════
  function start(again = false) {
    retry = again;
    w = newWorld();
    timers = [];
    state = S.COUNTDOWN;
    $('cwResult').classList.add('hidden');
    $('cwPauseBox').classList.add('hidden');
    sfx.mew();
  }

  /** เปิดมินิเกม — skin = สกินของน้องที่เล่นด้วย (ระบบตัวละครเดิม) */
  function open(opts = {}) {
    skin = opts.skin;
    panel.classList.remove('hidden');
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    setMusicTrack('beach');   // เพลงซน ๆ เบา ๆ
    start(false);
    resize();
    lastNow = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
  }

  /** ปิด — ล้างลูป ตัวฟัง ตัวจับเวลา และเสียงที่ค้างทั้งหมด แล้วคืนหน้าเดิม */
  function close() {
    if (panel.classList.contains('hidden')) return;
    cancelAnimationFrame(raf);
    raf = 0;
    timers = [];
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('keyup', onKey, true);
    window.removeEventListener('blur', onBlur);
    document.removeEventListener('visibilitychange', onVis);
    input.left = input.right = false; input.axis = 0;
    killSfx();
    state = S.MENU;
    paused = null;
    panel.classList.add('hidden');
    w = null;
    onExit?.();
  }

  return {
    open,
    close,
    best: () => ({ ...best }),
    get state() { return state; },
    // สำหรับสคริปต์ทดสอบ (โหมดพัฒนา)
    debug: () => w,
  };
}
