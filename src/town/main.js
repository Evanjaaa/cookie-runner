// src/town/main.js
// ─────────────────────────────────────────────────────────────
// เมืองแมวเหมียว (หน้าแยก town.html — ยังไม่รวมเข้าเกมจริง · GAME_PLAN.md ข้อ 11)
//
// ขั้น 1 (ตัดสินใจแล้ว): มุมข้าง เดินซ้าย–ขวาเส้นเดียว · ท่าเดิน = ท่าวิ่งสี่จังหวะของเกม (cat2-run) จังหวะช้าลง
//   หันซ้าย = กลับภาพ · ยืนนิ่ง = ท่ายืนหันตามทางที่เดิน · นั่งม้านั่ง = ท่านั่ง
// ขั้น 2: เมืองเดินคนเดียว — ร้าน 5 ร้าน (ข้อมูลร้านชุดเดียวกับร้านเหมียว src/shop.js) · ลานน้ำพุ + ม้านั่ง · ปราสาท (ยังปิด)
//   รอบ 2 (ผู้ใช้ส่งภาพแบบ): ร้านแต่ละร้านรูปทรงของตัวเอง · แม่น้ำ เกาะลอย เรือเหาะ แมว NPC — ภาพทั้งหมดอยู่ใน world.js
// ขั้น 3: ซื้อ/แลกผ่านเซิร์ฟเวอร์ (wallet.js + supabase/town.sql) — ยังไม่ติดตั้ง = โหมดทดลอง
//
// บังคับ (ผู้ใช้ 27 ต.ค.): กระโดดได้ — แรงกระโดด/แรงโน้มถ่วงชุดเดียวกับเกม (PHYSICS) กดกลางอากาศ = ชั้นสอง
//   มือถือ: จอยซ้าย (ลากหมุนได้รอบวง ใช้แค่แกนซ้าย–ขวา) · ปุ่มกลาง = ใช้งาน · ขวา = ปุ่มวิ่ง (สลับ) + ปุ่มกระโดด (ขวาสุด)
//   คอม: ไม่มีปุ่มบนจอ มีแถบบอกปุ่มแทน — ← → / A D เดิน · Shift ค้าง วิ่ง · Enter / Space / ↑ / W กระโดด · E ใช้งาน
//   ทั้งสองแบบ: แตะ/คลิกพื้น = เดินไปเอง (ขึ้นรอยอุ้งเท้าตรงจุดหมาย) · แตะร้าน = เดินไปหน้าประตูแล้วเข้า
// ─────────────────────────────────────────────────────────────
import { H, GY, WORLD_W, START_X, PLACES, drawSky, drawFar, drawClouds, drawHills, drawMidTrees, drawBackRow, drawGround, drawStreet, drawFront, drawPrompt, clearCache } from './world.js';
import { createRunAnim, stepRunAnim, drawCat2Run, RUN_K, RUN_TURN } from '../render/cat2-run.js';
import { drawCat2 } from '../render/cat2.js';
import { getSkin } from '../skins.js';
import { CAT_LOOK, PHYSICS, CAT_ANIM } from '../config.js';
import { drawItemIcon } from '../render/items.js';
import { SHOP_TABS, SHOP_ITEMS, EXCHANGE } from '../shop.js';
import { initWallet, wallet, catalogItem, buy, exchange } from './wallet.js';
import { drawInterior, clearInterior } from './interior.js';

const cv = document.getElementById('town');
const ctx = cv.getContext('2d');
const $ = (id) => document.getElementById(id);

const WALK = 2.6;            // หน่วยโลกต่อเฟรม (60fps)
const RUN = 5.6;             // ตอนวิ่ง (ปุ่มวิ่ง / Shift)
const NEAR = 46;             // ยืนห่างประตูไม่เกินเท่านี้ = ใช้งานได้
const SC = CAT_LOOK * RUN_K; // ขนาดตัวน้องเท่าตอนวิ่งในเกม

const cat = {
  x: START_X, dir: 1, moving: false, target: null, pending: null, sit: null,
  h: 0,                      // ความสูงเท้าจากพื้น (กระโดด)
  A: createRunAnim(),
  P: { onGround: true, jumps: 0, vy: 0, runPhase: 0, squash: 0, sliding: false, y: GY, fainting: false },
};
const keys = { left: false, right: false, shift: false };
let joyDir = 0;              // จอยมือถือ: -1 ซ้าย · 0 ปล่อย · 1 ขวา
let running = false;         // ปุ่มวิ่ง (สลับ)
// คอม (มีเมาส์ชี้ได้) = ซ่อนปุ่มบนจอ โชว์แถบบอกปุ่มคีย์บอร์ดแทน · จอสัมผัส = จอย + ปุ่ม
const deskMq = matchMedia('(hover: hover) and (pointer: fine)');
let desk = deskMq.matches;
document.body.classList.toggle('desk', desk);
deskMq.addEventListener('change', (e) => { desk = e.matches; document.body.classList.toggle('desk', desk); });
let mark = null;             // รอยอุ้งเท้าตรงจุดที่แตะพื้น { x, t } — หายเมื่อถึง/เปลี่ยนใจ
let k = 1, vw = 960, camX = 0, tick = 0, last = performance.now();
let paused = false;   // มีหน้าต่างเปิดอยู่ = ไม่รับปุ่มเดิน
let scene = 'town';   // 'town' | 'shop' (ในร้าน — ดูหัวข้อร้านข้างล่าง) · ประกาศก่อน resize() ที่รันตอนโหลด

// ── ขนาดจอ ────────────────────────────────────────────────────
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth, h = window.innerHeight;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  k = cv.height / H;
  vw = cv.width / k;
  clearCache();
  if (scene === 'shop') measureKeep();
}
window.addEventListener('resize', resize);
resize();

// ── ที่ที่ใช้งานได้ ────────────────────────────────────────────
function nearPlace() {
  let best = null, bd = NEAR;
  for (const p of PLACES) {
    if (p.kind === 'deco') continue;
    const d = Math.abs(cat.x - p.door);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
function actionLabel(p) {
  if (!p) return '';
  if (p.kind === 'shop') return 'เข้าร้าน';
  if (p.kind === 'bench') return cat.sit === p ? 'ลุกขึ้น' : 'นั่งพัก';
  if (p.kind === 'castle') return 'ดูปราสาท';
  return '';
}
function use(p) {
  if (!p) return;
  if (p.kind === 'shop') openShop(p);
  else if (p.kind === 'bench') {
    if (cat.sit === p) cat.sit = null;
    else { cat.sit = p; cat.x = p.door; cat.target = null; }
  } else if (p.kind === 'castle') toast('ปราสาทแมวเหมียวกำลังเตรียมเปิด รอติดตามนะเหมียว');
}

/** กระโดด — ค่าเดียวกับเกม (PHYSICS / CAT_ANIM.squash) · กดกลางอากาศได้อีกครั้ง = ชั้นสอง (ท่าตีลังกาของแต่ละน้องมาจากท่าวิ่ง) */
function jump() {
  if (paused) return;
  const P = cat.P;
  if (P.jumps >= 2) return;
  P.vy = P.jumps === 0 ? PHYSICS.jumpV : PHYSICS.doubleJumpV;
  P.squash = P.jumps === 0 ? CAT_ANIM.squash.jump : CAT_ANIM.squash.double;
  P.jumps++;
  P.onGround = false;
  cat.sit = null;
}

// ── อัปเดต ─────────────────────────────────────────────────────
function update(dt) {
  tick += dt;
  stepFade(dt);
  let dir = 0;
  if (!paused) {
    if (keys.left && !keys.right) dir = -1;
    else if (keys.right && !keys.left) dir = 1;
    else if (joyDir) dir = joyDir;
  }
  const sp = running || keys.shift ? RUN : WALK;
  if (dir) { cat.target = null; cat.pending = null; mark = null; }
  else if (cat.target != null) {
    const d = cat.target - cat.x;
    if (Math.abs(d) <= sp * dt) {
      cat.x = cat.target;
      cat.target = null;
      mark = null;
      if (cat.pending) { const p = cat.pending; cat.pending = null; use(p); }
    } else dir = Math.sign(d);
  }
  if (dir) {
    cat.sit = null;
    cat.dir = dir;
    cat.x = Math.max(40, Math.min(WORLD_W - 40, cat.x + dir * sp * dt));
    // จังหวะก้าวตามความเร็ว — วิ่งก้าวถี่ขึ้น (ท่าวิ่งสี่จังหวะของเกม)
    cat.P.runPhase += 0.408 * (sp / 6.8) * (sp === RUN ? 1.05 : 1.25) * dt;
  }
  cat.moving = !!dir;
  // กระโดด: ตกตามแรงโน้มถ่วงของเกม · ลงพื้น = ตัวแบนตามแรงตก (ท่าลงพื้นของท่าวิ่ง)
  const P = cat.P;
  if (!P.onGround) {
    P.vy += PHYSICS.gravity * dt;
    cat.h -= P.vy * dt;
    if (cat.h <= 0) {
      cat.h = 0;
      P.squash = CAT_ANIM.squash.land(P.vy);
      P.vy = 0;
      P.jumps = 0;
      P.onGround = true;
    }
  }
  P.squash += (0 - P.squash) * CAT_ANIM.squash.decay * dt;
  P.y = GY - cat.h;
  // กล้องตามตัว (น้องอยู่ราว 40% ของจอ) เลื่อนนุ่ม
  const want = Math.max(0, Math.min(WORLD_W - vw, cat.x - vw * 0.4));
  camX += (want - camX) * Math.min(1, 0.12 * dt);
  // ปุ่มใช้งาน
  const p = nearPlace();
  const act = $('btnAct');
  const lab = actionLabel(p);
  act.textContent = lab || 'ใช้งาน';
  act.classList.toggle('off', !lab);
}

// ── วาด ────────────────────────────────────────────────────────
function drawCat(c) {
  const skin = getSkin();
  const x = cat.x;
  const P = cat.P;
  // เงา — ยิ่งลอยสูงยิ่งเล็กและจาง
  const up = Math.min(1, cat.h / 160);
  c.save();
  c.globalAlpha = 0.22 * (1 - up * 0.6);
  c.fillStyle = '#4A2A5A';
  const sw = 1 - up * 0.45;
  c.beginPath(); c.ellipse(x, GY + 3, 26 * SC / 1.4 * sw, 5.5 * sw, 0, 0, Math.PI * 2); c.fill();
  c.restore();
  // เดิน / ลอยกลางอากาศ / ยังตัวแบนจากการลงพื้น = ท่าวิ่งของเกม (มีท่าถีบ ลอย ร่วง ลงพื้นครบ)
  if (cat.moving || !P.onGround || P.squash > 0.05) {
    const r = stepRunAnim(cat.A, P, { catId: skin.id, dt: 1, outfit: skin.outfit?.id, speed: 0, scale: SC, stand: !cat.moving });
    c.save();
    if (cat.dir < 0) { c.translate(2 * x, 0); c.scale(-1, 1); }   // หันซ้าย = กลับภาพท่าวิ่ง (ท่าวิ่งวาดหันขวา)
    drawCat2Run(c, x, GY - cat.h, SC, skin, tick, { ...r, parts: null, ribbon: null });
    c.restore();
  } else {
    cat.A = createRunAnim();   // หยุดแล้วเริ่มเดินใหม่ ท่าไม่ค้างกลางก้าว
    const turn = cat.sit ? 0 : cat.dir > 0 ? RUN_TURN * 0.6 : -RUN_TURN * 0.6;
    const shape = cat.sit ? { sit: 1, turn: 0 } : { turn };
    drawCat2(c, x, cat.sit ? GY - 22 : GY, SC, skin, tick, { k: 1, shape });
  }
}

/** รอยอุ้งเท้าชมพูตรงจุดที่แตะ — เด้งเข้า โยกเบา ๆ วงคลื่นกระจายเป็นจังหวะ หัวใจดวงเล็กลอยขึ้น */
function drawMark(c) {
  if (!mark) return;
  const u = tick - mark.t;
  const pop = Math.min(1, u / 12);
  const s = pop < 1 ? 0.3 + 0.9 * Math.sin(pop * Math.PI * 0.62) : 1 + 0.06 * Math.sin(u * 0.15);
  const x = mark.x, y = GY + 16;
  c.save();
  // วงคลื่นบนพื้น
  const r = (u % 40) / 40;
  c.globalAlpha = 0.6 * (1 - r);
  c.strokeStyle = '#FF8FB3';
  c.lineWidth = 2;
  c.beginPath(); c.ellipse(x, y + 4, 10 + r * 22, (10 + r * 22) * 0.32, 0, 0, Math.PI * 2); c.stroke();
  c.globalAlpha = 1;
  c.translate(x, y - 2);
  c.scale(s, s * 0.8);
  // ขอบขาว + อุ้งเท้าชมพู
  const paw = (grow, col) => {
    c.fillStyle = col;
    c.beginPath(); c.ellipse(0, 3, 9 + grow, 7.4 + grow, 0, 0, Math.PI * 2); c.fill();
    for (const [dx, dy] of [[-9, -6], [-3.4, -11], [3.4, -11], [9, -6]]) { c.beginPath(); c.ellipse(dx, dy, 3.4 + grow, 4 + grow, dx * 0.04, 0, Math.PI * 2); c.fill(); }
  };
  paw(2, '#FFFFFF');
  paw(0, '#FF8FB3');
  c.fillStyle = 'rgba(255,255,255,.55)';
  c.beginPath(); c.ellipse(-3, 0, 3, 1.8, -0.4, 0, Math.PI * 2); c.fill();
  c.restore();
  // หัวใจดวงเล็กลอยขึ้นแล้วจาง (วนทุก ~1 วิ)
  const h = (u % 60) / 60;
  c.save();
  c.globalAlpha = 1 - h;
  c.fillStyle = '#FF8FB3';
  const hx = x + 10 + Math.sin(u * 0.1) * 3, hy = y - 22 - h * 18, hr = 4;
  c.beginPath();
  c.moveTo(hx, hy + hr * 0.9);
  c.bezierCurveTo(hx - hr * 1.45, hy - hr * 0.1, hx - hr * 0.65, hy - hr * 1.15, hx, hy - hr * 0.38);
  c.bezierCurveTo(hx + hr * 0.65, hy - hr * 1.15, hx + hr * 1.45, hy - hr * 0.1, hx, hy + hr * 0.9);
  c.fill();
  c.restore();
}

function draw() {
  ctx.setTransform(k, 0, 0, k, 0, 0);
  if (scene === 'shop') {
    // ในร้าน: ภาพฉากในร้านจากแคช + ของขยับ (ไม่วาดเมือง)
    drawInterior(ctx, shopPlace.tab, vw, keepX, tick);
    drawFade();
    return;
  }
  drawSky(ctx, vw);
  drawFar(ctx, camX, vw, tick);
  drawClouds(ctx, camX, vw, tick);
  drawHills(ctx, camX, vw, tick);
  drawMidTrees(ctx, camX, vw);
  drawBackRow(ctx, camX, vw);
  ctx.setTransform(k, 0, 0, k, -camX * k, 0);
  drawGround(ctx, camX, vw, tick);
  drawStreet(ctx, camX, vw, tick);
  drawMark(ctx);
  const p = nearPlace();
  if (p && !paused && !cat.moving && cat.P.onGround) drawPrompt(ctx, p, actionLabel(p) + (desk ? ' · กด E' : ''), tick);
  drawCat(ctx);
  // ชั้นหน้าสุด (ใกล้ตากว่าตัวน้อง) — เลื่อนเร็วกว่ากล้อง
  ctx.setTransform(k, 0, 0, k, 0, 0);
  drawFront(ctx, camX, vw, tick);
  drawFade();
}

/** ม่านจางตอนเปลี่ยนฉาก (เมือง ↔ ในร้าน) */
function drawFade() {
  if (fade <= 0) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = `rgba(255,246,251,${fade})`;
  ctx.fillRect(0, 0, cv.width, cv.height);
}

function loop(now) {
  const dt = Math.min(3, (now - last) / (1000 / 60));
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// ── บังคับ ─────────────────────────────────────────────────────
// จอย (มือถือ): ลากปุ่มกลมไปได้รอบวง · เลยระยะเผื่อ (dead zone) ทางซ้าย/ขวา = เดิน · ปล่อยนิ้ว = ปุ่มเด้งกลับกลาง
(() => {
  const base = $('joy'), knob = $('joyKnob');
  let id = null;
  const move = (e) => {
    const r = base.getBoundingClientRect();
    const R = r.width * 0.34;                         // ปุ่มไปได้ไกลสุดจากกลางวง
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    joyDir = Math.abs(dx) > R * 0.3 ? Math.sign(dx) : 0;
    base.classList.toggle('l', joyDir < 0);
    base.classList.toggle('r', joyDir > 0);
  };
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    joyDir = 0;
    knob.style.transform = '';
    base.classList.remove('on', 'l', 'r');
  };
  base.addEventListener('pointerdown', (e) => {
    if (id !== null) return;
    e.preventDefault();
    id = e.pointerId;
    base.setPointerCapture(id);
    base.classList.add('on');
    move(e);
  });
  base.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
  base.addEventListener('pointerup', end);
  base.addEventListener('pointercancel', end);
})();
// ปุ่มกระโดด: ขึ้นทันทีที่นิ้วแตะ (ไม่รอปล่อยนิ้ว) — กดอีกทีกลางอากาศ = ชั้นสอง
$('btnJump').addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });
$('btnAct').addEventListener('click', () => { if (!paused) use(nearPlace()); });
function paintRun() {
  const b = $('btnRun');
  b.classList.toggle('on', running);
  b.setAttribute('aria-pressed', running ? 'true' : 'false');
  $('runLab').textContent = running ? 'วิ่ง!' : 'เดิน';
}
$('btnRun').addEventListener('click', () => { running = !running; paintRun(); });
paintRun();

const JUMP_KEYS = ['Enter', ' ', 'ArrowUp', 'w', 'W'];
window.addEventListener('keydown', (e) => {
  if (e.key === 'Shift') keys.shift = true;
  else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
  else if (JUMP_KEYS.includes(e.key) && !paused) {
    // ปุ่มที่เลือกด้วย Tab อยู่ (กรอบโฟกัสขึ้น) = ให้ Enter/Space กดปุ่มนั้นตามปกติ ไม่กระโดด
    if (e.target !== document.body && e.target.matches?.(':focus-visible')) return;
    e.preventDefault();
    if (!e.repeat) jump();   // กดค้างไม่เด้งรัว
  }
  else if ((e.key === 'e' || e.key === 'E') && !paused) use(nearPlace());
  else if (e.key === 'Escape') closeAll();
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'Shift') keys.shift = false;
  else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});

// แตะในฉาก: โดนร้าน/ม้านั่ง/ปราสาท = เดินไปหน้าประตูแล้วใช้งาน · โดนที่อื่น = เดินไปตรงนั้น
cv.addEventListener('pointerdown', (e) => {
  if (paused) return;
  const r = cv.getBoundingClientRect();
  const sx = ((e.clientX - r.left) / r.width) * cv.width / k;
  const sy = ((e.clientY - r.top) / r.height) * cv.height / k;
  const wx = sx + camX;
  // แตะตัวตึก (เหนือเส้นถนน) = ไปเข้าร้าน · แตะถนนหน้าร้าน = แค่เดินไปตรงนั้น (ไม่เปิดร้านเอง)
  const hit = PLACES.find((p) => p.kind !== 'deco' && wx >= p.x && wx <= p.x + p.w && sy >= GY - p.h - 20 && sy <= GY - 4);
  if (hit) {
    mark = null;
    if (Math.abs(cat.x - hit.door) < NEAR) use(hit);
    else { cat.target = hit.door; cat.pending = hit; }
  } else {
    cat.target = Math.max(40, Math.min(WORLD_W - 40, wx));
    cat.pending = null;
    mark = { x: cat.target, t: tick };   // รอยอุ้งเท้าตรงจุดหมาย
  }
});

// ── HUD ทอง + โหมด ─────────────────────────────────────────────
const fmt = (n) => Math.floor(n).toLocaleString('en-US');
function paintHud() {
  const W = wallet();
  $('goldNum').textContent = fmt(W.gold);
  const m = $('modeTag');
  m.textContent = W.mode === 'server' ? 'เชื่อมเซิร์ฟเวอร์ · ใช้ทองจริงของบัญชี' : 'โหมดทดลอง · ' + W.reason + ' (ทองทดลอง ไม่แตะทองจริง)';
  m.classList.toggle('demo', W.mode !== 'server');
}

let toastT = 0;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('on'), 2200);
}

// ── ร้าน: ฉากในร้าน (canvas เดิม — interior.js) + แผงสินค้า (HTML ชุดเดียวทุกร้าน สีตาม data-shop) ──
// เข้าร้าน: ม่านจางขาว ~14 เฟรม → สลับฉากเป็นในร้าน → ม่านจางออก + แผงเลื่อนเข้า · ออกจากร้าน: กลับทางเดิม
// ในร้านไม่วาดเมือง (วาดแค่ภาพฉากในร้านจากแคช + ของขยับไม่กี่ชิ้น) · ลูปเดิมลูปเดียว
// แผง: สร้างการ์ดครั้งเดียวต่อการเข้าร้าน · ซื้อแล้วอัปเดตแค่สถานะ (refreshShop) · ไอคอนวาดครั้งเดียวเก็บเป็นภาพ (iconSrc)
// คลิกการ์ดใช้ตัวรับตัวเดียวทั้งตาราง (ไม่ผูก listener ต่อการ์ด)
const SAY = {
  food: ['ยินดีต้อนรับสู่ร้านขนมเหมียว! วันนี้อบสด ๆ เลยนะ', 'ขอบคุณที่อุดหนุนนะเหมียว อร่อยแน่นอน!'],
  care: ['เข้ามาเลยเหมียว ยาดี ๆ ปรุงใหม่ทุกวัน', 'รับไปแล้วนะ ดูแลน้องดี ๆ น้า'],
  home: ['โรงช่างเหมียวยินดีต้อนรับ! อยากอัปเกรดอะไรดี?', 'เรียบร้อย! แข็งแรงทนทานแน่นอนเหมียว'],
  toy: ['ว้าว มีลูกค้า! ของเล่นใหม่เพียบเลยเหมียว', 'ขอให้สนุกกับของเล่นนะเหมียว!'],
  exchange: ['ร้านแลกของรางวัลยินดีต้อนรับเหมียว', 'แลกสำเร็จ! เก็บทองไว้ดี ๆ นะ'],
};
const FACT = {
  food: 'ใช้ป้อนน้องในบ้านลูกเหมียว',
  toy: 'ซื้อครั้งเดียว เล่นได้ตลอด',
  care: 'ใช้กับน้องในบ้านลูกเหมียว',
  home: 'อัปเกรดถาวร · ซื้อได้ครั้งเดียว',
};
let shopPlace = null, exStep = 1, selId = null;
let fade = 0, fadeDir = 0, fadeThen = null;
let keepX = 220;               // กึ่งกลางเจ้าของร้าน (หน่วยโลก) — ซ้ายของแผงสินค้า
const shopOv = $('shopOv');

/** วางเจ้าของร้านกลางพื้นที่ว่างซ้ายของแผง + ฟองคำพูดเหนือหัว */
function measureKeep() {
  const r = shopOv.querySelector('.sp').getBoundingClientRect();
  const W = window.innerWidth;
  const freeCss = r.left > 120 ? r.left : W;
  keepX = Math.max(170, (freeCss / W) * vw / 2);
  const say = $('shopSay');
  say.style.left = (keepX * (W / vw)) + 'px';
}
function say(text) {
  const el = $('shopSay');
  el.textContent = text;
  el.classList.remove('pop');
  void el.offsetWidth;   // เล่นแอนิเมชันเด้งซ้ำ
  el.classList.add('pop');
}

function openShop(p) {
  if (fadeDir) return;
  shopPlace = p;
  paused = true;
  keys.left = keys.right = false;
  mark = null;
  fadeDir = 1;
  fadeThen = () => {
    scene = 'shop';
    document.body.classList.add('in-shop');
    shopOv.dataset.shop = p.tab;
    shopOv.classList.remove('hidden', 'closing');
    buildShop();
    measureKeep();
    say(SAY[p.tab][0]);
    fadeDir = -1;
  };
}
function leaveShop() {
  if (fadeDir || scene !== 'shop') return;
  shopOv.classList.add('closing');
  fadeDir = 1;
  fadeThen = () => {
    scene = 'town';
    shopOv.classList.add('hidden');
    document.body.classList.remove('in-shop');
    clearInterior();
    paused = false;
    fadeDir = -1;
  };
}
/** ม่านจาง (เรียกจาก update) */
function stepFade(dt) {
  if (!fadeDir) return;
  fade = Math.max(0, Math.min(1, fade + fadeDir * dt / 14));
  if (fadeDir > 0 && fade >= 1) { const f = fadeThen; fadeThen = null; f?.(); }
  else if (fadeDir < 0 && fade <= 0) fadeDir = 0;
}
function closeAll() {
  if (!$('bagOv').classList.contains('hidden')) { $('bagOv').classList.add('hidden'); if (scene !== 'shop') paused = false; return; }
  if (scene === 'shop') leaveShop();
}
$('shopX').addEventListener('click', leaveShop);
$('bagX').addEventListener('click', closeAll);
$('btnBag').addEventListener('click', () => { paused = true; paintBag(); $('bagOv').classList.remove('hidden'); });

// ── ไอคอนสินค้า: วาดครั้งเดียว เก็บเป็นภาพ ──
const iconCache = new Map();
function iconSrc(icon) {
  if (!/^[a-z]+$/.test(icon)) return null;
  let u = iconCache.get(icon);
  if (!u) {
    const c = document.createElement('canvas');
    c.width = c.height = 120;
    const g = c.getContext('2d');
    g.scale(3, 3);
    drawItemIcon(g, icon);
    u = c.toDataURL();
    iconCache.set(icon, u);
  }
  return u;
}
function iconEl(it, cls) {
  const d = document.createElement('div');
  d.className = cls;
  const src = iconSrc(it.icon);
  if (src) { const im = new Image(); im.src = src; im.alt = ''; d.appendChild(im); }
  else d.textContent = it.icon;
  if (it.pack) { const b = document.createElement('i'); b.className = 'pack'; b.textContent = '×' + it.pack[0]; d.appendChild(b); }
  return d;
}

/** สถานะของสินค้าตอนนี้ (ราคาตามเซิร์ฟเวอร์ถ้าเชื่อมอยู่) */
function itemState(it) {
  const W = wallet();
  const c = catalogItem(it.id);
  const price = c ? c.price : it.price;
  const have = c ? (W.bag[c.gives] || 0) : 0;
  const maxed = !!(c?.max_own && have >= c.max_own);
  return { price, have, maxed, poor: !maxed && W.gold < price };
}
const shopItems = () => SHOP_ITEMS[shopPlace?.tab] || [];

function buildShop() {
  const p = shopPlace;
  const tab = SHOP_TABS.find((x) => x.id === p.tab);
  $('shopName').textContent = p.name;
  $('shopSub').textContent = tab ? tab.title : '';
  const ex = p.tab === 'exchange';
  $('shopGrid').classList.toggle('hidden', ex);
  $('shopDetail').classList.toggle('hidden', ex);
  $('shopEx').classList.toggle('hidden', !ex);
  $('shopPop').classList.remove('on');
  if (ex) { paintExchange(); refreshShop(); return; }
  const grid = $('shopGrid');
  grid.replaceChildren();
  for (const it of shopItems()) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sp-card';
    b.dataset.id = it.id;
    b.setAttribute('role', 'option');
    b.appendChild(iconEl(it, 'sc-ico'));
    if (it.tag) { const t = document.createElement('b'); t.className = 'sc-tag'; t.textContent = it.tag; b.appendChild(t); }
    const nm = document.createElement('span'); nm.className = 'sc-name'; nm.textContent = it.name;
    const pr = document.createElement('span'); pr.className = 'sc-price';
    b.append(nm, pr);
    grid.appendChild(b);
  }
  selId = shopItems()[0]?.id || null;
  refreshShop();
}
// ตัวรับคลิกตัวเดียวทั้งตาราง
$('shopGrid').addEventListener('click', (e) => {
  const b = e.target.closest('.sp-card');
  if (!b) return;
  selId = b.dataset.id;
  refreshShop();
});

/** อัปเดตสถานะ (ไม่สร้างการ์ดใหม่): ทอง · ราคา/ป้ายบนการ์ด · ช่องรายละเอียด */
function refreshShop() {
  const W = wallet();
  $('shopGold').textContent = fmt(W.gold);
  if (shopPlace?.tab === 'exchange') return;
  for (const b of $('shopGrid').children) {
    const it = shopItems().find((x) => x.id === b.dataset.id);
    const st = itemState(it);
    b.classList.toggle('sel', b.dataset.id === selId);
    b.setAttribute('aria-selected', b.dataset.id === selId ? 'true' : 'false');
    b.classList.toggle('owned', st.maxed);
    b.classList.toggle('poor', st.poor);
    b.querySelector('.sc-price').innerHTML = st.maxed ? 'มีแล้ว' : `<i class="coin"></i>${fmt(st.price)}`;
  }
  const it = shopItems().find((x) => x.id === selId);
  if (!it) return;
  const st = itemState(it);
  const ico = $('sdIco');
  ico.replaceChildren(...iconEl(it, 'sd-ico-in').childNodes);
  $('sdName').textContent = it.name;
  const tag = $('sdTag');
  tag.textContent = it.tag || '';
  tag.classList.toggle('hidden', !it.tag);
  $('sdDesc').textContent = it.desc;
  const facts = [
    it.pack ? `ได้รับ ×${it.pack[0]} ชิ้น (ลด ${it.pack[1]}%)` : 'ได้รับ 1 ชิ้น',
    FACT[shopPlace.tab],
    `มีในกระเป๋า ${fmt(st.have)} ชิ้น`,
  ];
  if (!st.maxed && !st.poor) facts.push(`ทองหลังซื้อ ${fmt(W.gold - st.price)}`);
  $('sdFacts').replaceChildren(...facts.map((f) => { const li = document.createElement('li'); li.textContent = f; return li; }));
  $('sdPrice').textContent = fmt(st.price);
  const state = $('sdState');
  const btn = $('sdBtn');
  state.className = 'sd-state';
  if (st.maxed) {
    state.textContent = shopPlace.tab === 'home' ? 'อัปเกรดแล้ว (ระดับสูงสุด)' : 'มีของชิ้นนี้แล้ว';
    state.classList.add('ok');
    btn.disabled = true;
    btn.textContent = shopPlace.tab === 'home' ? 'สูงสุดแล้ว' : 'มีแล้ว';
  } else if (st.poor) {
    state.textContent = `ทองไม่พอ · ขาดอีก ${fmt(st.price - W.gold)} ทอง`;
    state.classList.add('bad');
    btn.disabled = true;
    btn.textContent = 'ทองไม่พอ';
  } else {
    state.textContent = '';
    btn.disabled = false;
    btn.textContent = 'ซื้อเลย';
  }
}

$('sdBtn').addEventListener('click', async () => {
  const it = shopItems().find((x) => x.id === selId);
  if (!it) return;
  const btn = $('sdBtn');
  btn.disabled = true;
  btn.textContent = 'กำลังซื้อ…';
  const res = await buy(it.id);
  if (res.ok) {
    popDone(`ซื้อ "${it.name}" แล้ว!`);
    say(SAY[shopPlace.tab][1]);
  } else {
    say(res.msg === 'ทองไม่พอ' ? 'อ๊ะ ทองยังไม่พอนะเหมียว' : res.msg);
    const st = $('sdState');
    st.textContent = res.msg;
    st.className = 'sd-state bad shake';
  }
  paintHud();
  refreshShop();
});

/** ป้ายสำเร็จกลางแผง + เหรียญเด้ง (องค์ประกอบเดียวใช้ซ้ำ) */
let popT = 0;
function popDone(text) {
  const el = $('shopPop');
  el.textContent = text;
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
  clearTimeout(popT);
  popT = setTimeout(() => el.classList.remove('on'), 1600);
}

/** ร้านแลกของรางวัล: แลกค่าขนมเป็นทอง (ใช้ wallet.exchange — กติกาเดิม) */
function paintExchange() {
  const W = wallet();
  const { got, used, cap } = W.today;
  const left = Math.max(0, got - used);
  const per = EXCHANGE.treats / EXCHANGE.gold;
  const pick = Math.floor((left * exStep) / per) * per;
  const box = $('shopEx');
  box.innerHTML = `
    <div class="ex">
      <div class="exrow"><span>ค่าขนมที่เก็บได้วันนี้</span><b>${fmt(got)} / ${fmt(cap)}</b></div>
      <div class="bar"><i style="width:${Math.min(100, (got / cap) * 100)}%"></i></div>
      <div class="exrow small"><span>แลกไปแล้ว ${fmt(used)}</span><span>ยังแลกได้ ${fmt(left)}</span></div>
      <div class="rate"><span class="chip t">${fmt(EXCHANGE.treats)} ค่าขนม</span><span>➜</span><span class="chip g"><i class="coin"></i>${fmt(EXCHANGE.gold)}</span></div>
      <div class="exrow"><span>จำนวนที่จะแลก</span><span class="steps"></span></div>
      <div class="exrow small"><span>แลก ${fmt(pick)} ค่าขนม</span><span>ได้ ${fmt(pick / per)} ทอง</span></div>
    </div>`;
  const ex = box.firstElementChild;
  const steps = ex.querySelector('.steps');
  for (const s of EXCHANGE.steps) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'step' + (s === exStep ? ' on' : '');
    b.textContent = s === 1 ? 'ทั้งหมด' : s === 0.5 ? '½' : '¼';
    b.addEventListener('click', () => { exStep = s; paintExchange(); });
    steps.appendChild(b);
  }
  const go = document.createElement('button');
  go.type = 'button';
  go.className = 'sd-btn';
  go.textContent = pick < per ? 'ค่าขนมยังไม่พอแลก' : 'แลกเลย';
  go.disabled = pick < per;
  go.addEventListener('click', async () => {
    go.disabled = true;
    go.textContent = 'กำลังแลก…';
    const res = await exchange(pick);
    if (res.ok) { popDone(`แลกสำเร็จ! ได้ ${fmt(res.gold)} ทอง`); say(SAY.exchange[1]); }
    else say(res.msg);
    paintHud();
    refreshShop();
    paintExchange();
  });
  ex.appendChild(go);
}

// ── กระเป๋า ────────────────────────────────────────────────────
const ITEM_NAME = {};
for (const list of Object.values(SHOP_ITEMS)) for (const it of list) if (!it.pack) ITEM_NAME[it.id] = it;
function paintBag() {
  const W = wallet();
  const list = $('bagList');
  list.replaceChildren();
  const ids = Object.keys(W.bag).filter((id) => W.bag[id] > 0);
  $('bagEmpty').classList.toggle('hidden', ids.length > 0);
  for (const id of ids) {
    const it = ITEM_NAME[id] || { icon: id, name: id };
    const row = document.createElement('div');
    row.className = 'bagrow';
    const ico = document.createElement('div');
    ico.className = 'ico';
    if (/^[a-z]+$/.test(it.icon)) {
      const ic = document.createElement('canvas');
      ic.width = 80; ic.height = 80;
      const g = ic.getContext('2d');
      g.scale(2, 2);
      drawItemIcon(g, it.icon);
      ico.appendChild(ic);
    } else ico.textContent = it.icon;
    const nm = document.createElement('b'); nm.textContent = it.name;
    const q = document.createElement('span'); q.className = 'qty'; q.textContent = '×' + W.bag[id];
    row.append(ico, nm, q);
    list.appendChild(row);
  }
}

// ── เริ่ม ──────────────────────────────────────────────────────
(async () => {
  paintHud();
  requestAnimationFrame(loop);
  await initWallet();
  paintHud();
  // ฟอนต์ป้ายร้าน (Mali) โหลดเสร็จหลังวาดแคชไปแล้ว — วาดใหม่ให้ป้ายเป็นฟอนต์จริง
  document.fonts?.ready.then(() => clearCache());
})();

if (import.meta.env.DEV) window.__town = { cat, wallet, PLACES };
