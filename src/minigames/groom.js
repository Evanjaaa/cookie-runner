// src/minigames/groom.js
// ─────────────────────────────────────────────────────────────
// มินิเกม "ตัดขนแมว" ✂️ — ร้านกรูมมิ่งเล็ก ๆ ให้น้องแต่งตัว (Cute + Satisfying + Creative)
// "ผู้เล่นไม่ได้ตัดขนแมว — ผู้เล่นกำลังแต่งตัวให้น้องแมวน่ารักขึ้น"
//
// ลำดับ: เลือกโจทย์ → แปรง → อาบน้ำอุ่น → เป่าขน → เล็มตามเส้น → จัดทรง+เครื่องประดับ → ก่อน/หลัง → คะแนน
//
// ── ขนของน้อง ── ตัวน้องวาดด้วยตัววาดเดิมของเกม (drawCatPose) ทุกสกิน/ทุกวัย
// "ขนที่เล่นได้" คือวงขนฟูรอบหัว (ปอยขน 26 ปอย) วาดหลังหัวน้อง — ความยาว 0-3 ต่อปอย
// เล็มแล้วปอยสั้นลงตามเส้นนำ · ยุ่ง/เปียก/สกปรก เป็นค่าต่อปอย/ต่อจุด ไม่มีฟิสิกส์ขนจริง
//
// โครงเดียวกับแมวหนีน้ำ: ลูปเดียว (ตามเพดานเฟรมของหน้า "บ้านแมว+มินิเกม") ปิดแล้วล้างทุกอย่าง
// ─────────────────────────────────────────────────────────────
import { drawCatPose, setCatEdgeScale } from '../render/entities.js';
import { drawSpeech, INK } from './catwater-draw.js';
import { sfx, killSfx } from '../audio.js';
import { setMusicTrack } from '../music.js';
import { loadPref, savePref } from '../storage.js';
import { quality, canvasDprCap, framePacer } from '../graphics.js';
import { t as tr } from '../i18n.js';

const W = 960, H = 480;
const TAU = Math.PI * 2;
const TABLE_Y = 352;              // ผิวโต๊ะกรูมมิ่ง = เท้าน้อง (สูงพอให้แถบเครื่องมือล่างไม่บังตัวน้อง)
const TUFTS = 26;
const PHASES = ['brush', 'wash', 'dry', 'cut', 'style'];
const PHASE_ICON = { brush: '🪮', wash: '🧴', dry: '💨', cut: '✂️', style: '🎀' };
const PREF = 'mgGroom';

/** โจทย์ทรงขน — target(a) = ความยาวที่ต้องการ (0-3) ตามมุมรอบหัว (a = -π/2 คือกลางหัว) */
const STYLES = [
  { id: 'mochi', icon: '🍡', name: 'Mochi Cut', desc: 'ทรงกลม นุ่ม น่ารัก', target: () => 1.2 },
  { id: 'lion', icon: '🦁', name: 'Little Lion', desc: 'รอบหัวฟูนิด ๆ', target: () => 2.4 },
  { id: 'royal', icon: '👑', name: 'Royal Cut', desc: 'เรียบร้อยและหรู', target: (a) => 1.5 + 0.35 * Math.cos(a) ** 2, acc: 'crown' },
  { id: 'princess', icon: '🎀', name: 'Cute Princess', desc: 'ทรงหวาน ๆ', target: () => 1.6, acc: 'ribbon' },
  { id: 'gentleman', icon: '🎩', name: 'Gentleman', desc: 'ทรงสุภาพบุรุษ', target: (a) => 0.9 + 0.7 * Math.cos(a) ** 2, acc: 'hat' },
  { id: 'cloud', icon: '☁️', name: 'Cloud Cut', desc: 'กลมเป็นก้อนเมฆ', target: (a) => 1.7 + 0.45 * Math.abs(Math.sin(a * 3)) },
  { id: 'flower', icon: '🌸', name: 'Flower Cut', desc: 'แต่งด้วยดอกไม้', target: () => 1.3, acc: 'flower' },
];
const FREE = { id: 'free', icon: '✨', name: 'Free Style', desc: 'ตามใจเลย', target: () => 1.5 };
export const GROOM_ACCS = [
  ['ribbon', '🎀'], ['flower', '🌸'], ['crown', '👑'], ['hat', '🎩'], ['star', '⭐'], ['butterfly', '🦋'],
];
const DIFF = {
  easy: { tol: 30, safe: [0.28, 0.8] },
  normal: { tol: 20, safe: [0.33, 0.75] },
  hard: { tol: 13, safe: [0.42, 0.64] },
};

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDist = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

// ══ ฉาก: ห้องกรูมมิ่ง (วาดครั้งเดียวต่อขนาดผ้าใบ) ═════════════════
function rr(c, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + k, y); c.arcTo(x + w, y, x + w, y + h, k); c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k); c.arcTo(x, y, x + w, y, k); c.closePath();
}
/** เส้นขอบฉาก/ของบางลง 30% ให้เท่าหน้าอื่น (LINE_K เดียวกับบ้านลูกเหมียวและแมวหนีน้ำ) */
const LINE_K = 0.7;
function fs(c, fill, w = 2.2) {
  c.fillStyle = fill; c.fill();
  c.strokeStyle = INK; c.lineWidth = w * LINE_K; c.lineJoin = 'round'; c.stroke();
}
function paw(c, x, y, s, col) {
  c.fillStyle = col;
  c.beginPath(); c.ellipse(x, y, 6 * s, 5 * s, 0, 0, TAU); c.fill();
  for (const [dx, dy] of [[-6, -7], [-2, -10], [2, -10], [6, -7]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, 2.4 * s, 0, TAU); c.fill(); }
}
function paintSalon(c) {
  // ผนังครีม + ลายทางอ่อน
  c.fillStyle = '#FFF4E4';
  c.fillRect(-1200, -800, W + 2400, H + 1600);
  c.fillStyle = 'rgba(247,183,201,.16)';
  for (let x = -1200; x < W + 1200; x += 48) c.fillRect(x, -800, 22, 800 + 300);
  // บัวผนัง + พื้นไม้
  c.fillStyle = '#F2D7B8';
  c.fillRect(-1200, 300, W + 2400, 12);
  const fg = c.createLinearGradient(0, 312, 0, H);
  fg.addColorStop(0, '#E6C29A'); fg.addColorStop(1, '#D3A877');
  c.fillStyle = fg;
  c.fillRect(-1200, 312, W + 2400, 800);
  c.strokeStyle = 'rgba(78,53,39,.14)'; c.lineWidth = 2;
  for (let x = -1200; x < W + 1200; x += 64) { c.beginPath(); c.moveTo(x, 314); c.lineTo(x - 24, H + 200); c.stroke(); }
  // ป้ายอุ้งเท้ากลางผนัง
  rr(c, W / 2 - 58, 22, 116, 46, 23); fs(c, '#F7B7C9');
  paw(c, W / 2 - 30, 52, 1.1, '#FFFFFF'); paw(c, W / 2 + 30, 52, 1.1, '#FFFFFF');
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(W / 2, 45, 7, 0, TAU); c.fill();
  // กระจกซ้าย
  c.beginPath(); c.ellipse(150, 150, 62, 80, 0, 0, TAU); fs(c, '#F6D9AE', 3);
  c.beginPath(); c.ellipse(150, 150, 50, 68, 0, 0, TAU);
  const mg = c.createLinearGradient(110, 90, 190, 210); mg.addColorStop(0, '#E4F4FB'); mg.addColorStop(1, '#BFE3F2');
  fs(c, mg, 2);
  c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 5;
  c.beginPath(); c.arc(150, 150, 38, -2.6, -1.9); c.stroke();
  // ชั้นวางขวา: แชมพู ผ้าขนหนู
  for (const y of [110, 200]) { rr(c, 700, y, 190, 10, 4); fs(c, '#D9A06C'); }
  for (const [x, col, h] of [[712, '#A8DDF0', 34], [744, '#F7B7C9', 28], [772, '#FFF3B0', 38]]) { rr(c, x, 110 - h, 22, h, 6); fs(c, col, 2); }
  for (const [x, col] of [[716, '#F7B7C9'], [764, '#A8DDF0'], [812, '#FFF3B0']]) { rr(c, x, 176, 42, 24, 6); fs(c, col, 2); }
  // ไดร์แขวนผนัง
  c.beginPath(); c.arc(850, 160, 18, 0, TAU); fs(c, '#C9B5FF'); rr(c, 842, 160, 14, 34, 5); fs(c, '#B49CFF');
  // ตู้อุปกรณ์ซ้ายล่าง
  rr(c, 40, 240, 150, 120, 10); fs(c, '#F2C98F');
  for (const y of [258, 304]) { rr(c, 52, y, 126, 38, 6); fs(c, '#FBDDB1', 2); c.fillStyle = '#B57748'; c.beginPath(); c.arc(115, y + 19, 4, 0, TAU); c.fill(); }
  // โต๊ะกรูมมิ่ง (กลาง) — ผิวโต๊ะ = เท้าน้อง
  rr(c, W / 2 - 170, TABLE_Y - 6, 340, 26, 12); fs(c, '#D9A06C', 3);
  rr(c, W / 2 - 150, TABLE_Y - 14, 300, 14, 7); fs(c, '#A8DDF0', 2.4);   // แผ่นรองนุ่ม
  for (const lx of [W / 2 - 140, W / 2 + 122]) { rr(c, lx, TABLE_Y + 20, 18, 80, 5); fs(c, '#B57748', 2.4); }
  paw(c, W / 2, TABLE_Y + 12, 0.9, '#B57748');
}

// ══ เครื่องประดับ ═════════════════════════════════════════════
function drawAcc(c, kind, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.lineWidth = 2.2; c.strokeStyle = INK; c.lineJoin = 'round';
  if (kind === 'ribbon') {
    for (const d of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(d * 22, -16, d * 24, 0); c.quadraticCurveTo(d * 22, 14, 0, 0); fs(c, '#FF8FB8'); }
    c.beginPath(); c.arc(0, 0, 6, 0, TAU); fs(c, '#FF6F91');
  } else if (kind === 'flower') {
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; c.beginPath(); c.ellipse(Math.cos(a) * 9, Math.sin(a) * 9, 8, 6, a, 0, TAU); fs(c, '#FFC6DD', 1.8); }
    c.beginPath(); c.arc(0, 0, 6, 0, TAU); fs(c, '#FFD54A', 1.8);
  } else if (kind === 'crown') {
    c.beginPath(); c.moveTo(-20, 8); c.lineTo(-20, -10); c.lineTo(-10, 0); c.lineTo(0, -16); c.lineTo(10, 0); c.lineTo(20, -10); c.lineTo(20, 8); c.closePath(); fs(c, '#FFD54A');
    c.fillStyle = '#FF8FB8'; c.beginPath(); c.arc(0, 0, 3.5, 0, TAU); c.fill();
  } else if (kind === 'hat') {
    rr(c, -24, 4, 48, 8, 4); fs(c, '#4A3A5A'); rr(c, -14, -22, 28, 28, 4); fs(c, '#4A3A5A');
    c.fillStyle = '#FF8FB8'; c.fillRect(-14, -2, 28, 5);
  } else if (kind === 'star') {
    c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 7 : 16; const a = -Math.PI / 2 + i / 10 * TAU; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); fs(c, '#FFE48A');
  } else if (kind === 'butterfly') {
    for (const d of [-1, 1]) { c.beginPath(); c.ellipse(d * 11, -5, 11, 9, d * 0.4, 0, TAU); fs(c, '#9FD8F5', 1.8); c.beginPath(); c.ellipse(d * 9, 8, 7, 6, -d * 0.3, 0, TAU); fs(c, '#C9B5FF', 1.8); }
    rr(c, -2.5, -12, 5, 24, 2.5); fs(c, '#4A3A5A', 1.5);
  }
  c.restore();
}

/**
 * @param deps.panel    #groomPanel
 * @param deps.onExit   ออกจากมินิเกม (กลับหน้าเลือกเกม)
 * @param deps.onFinish จบหนึ่งรอบ ({ score, stars }) → ข้อความรางวัล (หรือ '')
 */
export function createGroom({ panel, onExit, onFinish }) {
  const $ = (id) => panel.querySelector('#' + id);
  const canvas = $('grCanvas');
  const ctx = canvas.getContext('2d');
  const bg = document.createElement('canvas');
  const view = { scale: 1, ox: 0, oy: 0, dpr: 1 };
  const best = loadPref(PREF, null) || { score: 0, stars: 0 };
  let skin = null, g = null, raf = 0, lastNow = 0, paused = null;
  let mode = 'challenge', diff = 'normal';
  const pace = framePacer();
  // เสียงที่ถูรัว ๆ แล้วยิงถี่ — เว้นระยะขั้นต่ำต่อชนิด ไม่ให้ซ้อนกันเป็นก้อนเสียงยาว
  const sfxLast = {};
  function sfxOnce(key, gap, fn) {
    const now = performance.now() / 1000;
    if (now - (sfxLast[key] ?? -9) < gap) return;
    sfxLast[key] = now;
    fn?.();
  }

  // ── รูปหัวน้องตามวัย (ตรงกับ drawCatStand/drawCatHead) ──
  function geo() {
    const baby = skin?.age === 'baby', young = skin?.age === 'young';
    const S = baby ? 3.4 : young ? 3.9 : 4.1;
    const hs = baby ? 1.42 : young ? 1.14 : 1;
    const cx = W / 2 + 1 * S;
    const cy = TABLE_Y - 23 * S + (-10 + (baby ? 5 : young ? 1 : 0)) * S;
    return { S, cx, cy, r: 12 * hs * S, unit: 6.2 * S };
  }

  function newGame(style) {
    const G = geo();
    const tufts = [];
    for (let i = 0; i < TUFTS; i++) {
      // วงรอบหัว เว้นช่วงล่าง (คอ/ตัว) — มุมจาก 140° ถึง 400° (ผ่านด้านบน)
      const a = Math.PI * (0.78 + (i / (TUFTS - 1)) * 1.44);
      tufts.push({ a, len: rand(2.7, 3), mess: rand(0.6, 1), brushed: 0, target: style.target(a) });
    }
    const dirt = [];
    for (let i = 0; i < 7; i++) {
      const a = rand(0, TAU), d = rand(0.2, 0.85);
      const onBody = i >= 5;
      dirt.push({ x: G.cx + Math.cos(a) * G.r * d, y: onBody ? G.cy + G.r * rand(1.3, 1.9) : G.cy + Math.sin(a) * G.r * d * 0.9, v: 1, r: rand(5, 8) * G.S / 3.4 });
    }
    const guide = [];
    for (let k = 0; k <= 90; k++) {
      const a = Math.PI * (0.78 + (k / 90) * 1.44);
      guide.push({ a, cut: false });
    }
    const snap = () => ({ tufts: tufts.map((t) => ({ ...t })), dirt: dirt.map((d) => ({ ...d })), wet: 0, acc: null, neat: 0 });
    const state = {
      G, style, tufts, dirt, guide, phase: 'intro', clock: 0, phaseT: 0,
      wet: 0, dryness: 0, heat: 0, blowing: false, hotT: 0, safeT: 0, coldT: 0,
      cutOk: 0, cutBad: 0, overCut: 0, warnAt: -9, acc: null, neat: 0, fluff: 0,
      times: {}, done: {}, parts: [], caption: null, mood: '', shut: false, wobble: 0,
      slider: 0.5, before: null, pointer: null,
    };
    state.before = snap();
    return state;
  }

  // ══ ขนาดผ้าใบ ══
  function resize() {
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch) return;
    const dpr = Math.min(window.devicePixelRatio || 1, canvasDprCap('room'));
    const pw = Math.round(cw * dpr), ph = Math.round(ch * dpr);
    if (canvas.width === pw && canvas.height === ph && view.dpr === dpr) return;
    canvas.width = pw; canvas.height = ph; view.dpr = dpr;
    view.scale = Math.min(cw / W, ch / H);
    view.ox = (cw - W * view.scale) / 2;
    view.oy = (ch - H * view.scale) / 2;
    bg.width = pw; bg.height = ph;
    const b = bg.getContext('2d');
    b.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.ox, dpr * view.oy);
    paintSalon(b);
  }
  const toScene = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - view.ox) / view.scale, y: (e.clientY - r.top - view.oy) / view.scale };
  };

  // ══ ละออง / คำพูด ══
  function emit(kind, x, y, n, o = {}) {
    for (let i = 0; i < n && g.parts.length < 80; i++) {
      const a = o.angle ?? rand(-Math.PI, 0), sp = rand(o.min ?? 30, o.max ?? 110);
      g.parts.push({ kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(o.rmin ?? 2.5, o.rmax ?? 5), life: o.life ?? rand(0.5, 0.9), max: o.life ?? 0.9, g: o.g ?? 0, color: o.color });
    }
  }
  function say(text, sec = 1.6) { g.caption = { text: tr(text), t: sec }; }
  function popText(text, x, y, color = '#FFE48A') { g.parts.push({ kind: 'text', text: tr(text), x, y, vx: 0, vy: -40, life: 1.1, max: 1.1, g: 0, color }); }

  // ══ เฟส ══
  const HINTS = {
    brush: ['🪮', 'แปรงขน', 'ลากผ่านขนรอบหัวให้เรียบทุกปอย'],
    wash: ['🧴', 'อาบน้ำอุ่น', 'ถูตรงคราบเปื้อนให้ฟองฟู'],
    dry: ['💨', 'เป่าขน', 'กดค้างเพื่อเป่า ปล่อยเพื่อพัก — รักษาเข็มไว้ในช่องเขียว'],
    cut: ['✂️', 'เล็มขน', 'ลากตามเส้นประเพื่อเล็มขน'],
    style: ['🎀', 'จัดทรง', 'หวีขนให้เรียบ แตะเพื่อฟู แล้วเลือกเครื่องประดับ'],
  };
  function setPhase(p) {
    g.phase = p;
    g.phaseT = 0;
    const tool = $('grTool');
    const h = HINTS[p];
    $('grTools').classList.toggle('hidden', !h);
    $('grAcc').classList.toggle('hidden', p !== 'style');
    $('grNext').classList.add('hidden');
    $('grNext').onclick = null;   // ล้างปุ่ม "ถัดไป" ของเฟสก่อน (ไม่งั้นกดแล้วกระโดดเฟสซ้ำ)
    if (h) {
      tool.querySelector('.gr-tool-ico').textContent = h[0];
      tool.querySelector('.gr-tool-name').textContent = tr(h[1]);
      tool.querySelector('.gr-tool-hint').textContent = tr(h[2]);
      tool.classList.remove('pop'); void tool.offsetWidth; tool.classList.add('pop');
      sfx.fish();
    }
    if (p === 'wash') { g.mood = 'hurt'; say('น้ำ...!? 😨'); sfx.startle(); }
    if (p === 'brush') { g.mood = ''; say('วันนี้มาแต่งตัวกัน!'); }
    if (p === 'dry') { g.mood = ''; g.shut = false; g.wet = 1; }
    if (p === 'cut') say('ลากตามเส้นเพื่อเล็มขนนะ');
    if (p === 'style') { $('grNext').textContent = tr('เสร็จแล้ว ✨'); $('grNext').classList.remove('hidden'); paintAcc(); }
  }
  function phaseDone(p, label = 'NICE!') {
    if (g.done[p]) return;
    g.done[p] = true;
    g.times[p] = g.phaseT;
    sfx.bonus();
    popText('✨ ' + label, g.G.cx, g.G.cy - g.G.r - 70, '#9DF2C8');
    emit('spark', g.G.cx, g.G.cy - g.G.r, 10, { min: 60, max: 170, color: '#FFE48A' });
    const next = PHASES[PHASES.indexOf(p) + 1];
    $('grNext').textContent = tr('ถัดไป ›');
    $('grNext').classList.remove('hidden');
    $('grNext').onclick = () => { sfx.fish(); setPhase(next); };
  }

  // ── แปรง ──
  function brushAt(x, y, dist) {
    const { cx, cy, r, unit } = g.G;
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    if (d < r * 0.6 || d > r + 3.2 * unit) return;
    const a = Math.atan2(dy, dx);
    let hit = false;
    for (const t of g.tufts) {
      if (angDist(t.a, a) > 0.26) continue;
      t.mess = Math.max(0, t.mess - dist * 0.012);
      hit = true;
    }
    if (hit && Math.random() < 0.35) emit('spark', x, y, 1, { min: 10, max: 40, color: '#FFF3B0', life: 0.5 });
    if (hit) sfxOnce('fluff', 0.3, sfx.fluff);
  }
  // ── อาบน้ำ ──
  function washAt(x, y, dist) {
    let hit = false;
    for (const s of g.dirt) {
      if (s.v <= 0 || Math.hypot(s.x - x, s.y - y) > 30) continue;
      s.v = Math.max(0, s.v - dist * 0.01);
      hit = true;
    }
    if (Math.hypot(x - g.G.cx, y - g.G.cy) < g.G.r * 2.4 && Math.random() < 0.5) {
      g.parts.push({ kind: 'bubble', x: x + rand(-14, 14), y: y + rand(-10, 10), vx: rand(-12, 12), vy: rand(-40, -14), r: rand(4, 10), life: 1.4, max: 1.4, g: 0 });
      if (Math.random() < 0.1) sfxOnce('bubble', 0.18, sfx.bubblePop);
    }
    if (hit) sfxOnce('scrub', 0.28, sfx.scrub);
  }
  // ── ตัด ──
  function guidePt(k, t = g.tufts) {
    const { cx, cy, r, unit } = g.G;
    const tgt = g.style.target(g.guide[k].a);
    const rad = r * 0.92 + tgt * unit;
    return { x: cx + Math.cos(g.guide[k].a) * rad, y: cy + Math.sin(g.guide[k].a) * rad };
  }
  function cutAt(x, y, dist) {
    const tol = DIFF[diff].tol;
    let bestK = -1, bestD = 1e9;
    for (let k = 0; k < g.guide.length; k++) {
      const p = guidePt(k);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) { bestD = d; bestK = k; }
    }
    const { cx, cy, r, unit } = g.G;
    const inFur = Math.hypot(x - cx, y - cy) > r * 0.8 && Math.hypot(x - cx, y - cy) < r + 3.3 * unit;
    if (bestD <= tol) {
      const gk = g.guide[bestK];
      if (gk.cut) {
        g.overCut += dist;
        if (g.overCut > 260 && g.clock - g.warnAt > 1.6) { g.warnAt = g.clock; g.overCut = 0; say('⚠️ พอแล้วน้า~'); }
        return;
      }
      gk.cut = true;
      g.cutOk++;
      for (const t of g.tufts) {
        if (angDist(t.a, gk.a) > 0.14 || t.len <= t.target) continue;
        t.len = t.target;
        const tip = { x: cx + Math.cos(t.a) * (r * 0.92 + (t.target + 0.6) * unit), y: cy + Math.sin(t.a) * (r * 0.92 + (t.target + 0.6) * unit) };
        emit('fur', tip.x, tip.y, 3, { min: 20, max: 70, g: 160, life: 0.8, color: skin.cat });
      }
      if (g.cutOk % 3 === 0) sfx.pat();
    } else if (inFur && dist > 2) {
      g.cutBad += dist / 60;
      if (g.clock - g.warnAt > 1.2) { g.warnAt = g.clock; popText('⚠️ ตรงนี้ไม่ใช่เส้นนะ', x, y - 20, '#FF9FB5'); }
    }
  }
  // ── จัดทรง ──
  function styleAt(x, y, dist) {
    const { cx, cy, r, unit } = g.G;
    const d = Math.hypot(x - cx, y - cy);
    if (d < r * 0.6 || d > r + 3.3 * unit) return;
    g.neat = Math.min(1, g.neat + dist * 0.0015);
    if (Math.random() < 0.25) emit('spark', x, y, 1, { min: 10, max: 30, color: '#FFFFFF', life: 0.5 });
  }

  // ══ ปุ่ม/นิ้ว ══
  let down = false, lastP = null;
  function onDown(e) {
    if (!g || paused) return;
    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);
    down = true;
    lastP = toScene(e);
    g.pointer = lastP;
    if (g.phase === 'dry') { g.blowing = true; }
    if (g.phase === 'style') {
      // แตะ = ฟูขึ้นเด้ง ๆ
      g.fluff = 1; sfx.fluff();
    }
    if (g.phase === 'reveal') g.slider = clamp((lastP.x - (W / 2 - 230)) / 460, 0, 1);
    onMove(e, true);
  }
  function onMove(e, first = false) {
    if (!g) return;
    const p = toScene(e);
    g.pointer = p;
    if (!down) return;
    const dist = first ? 14 : Math.hypot(p.x - lastP.x, p.y - lastP.y);
    // แบ่งช่วงลากยาวเป็นจุดถี่ ๆ ไม่ให้ลากเร็วแล้วข้ามเส้น
    const steps = Math.max(1, Math.ceil(dist / 8));
    for (let i = 1; i <= steps; i++) {
      const x = lastP.x + (p.x - lastP.x) * (i / steps), y = lastP.y + (p.y - lastP.y) * (i / steps);
      const dd = dist / steps;
      if (g.phase === 'brush') brushAt(x, y, dd);
      else if (g.phase === 'wash') washAt(x, y, dd);
      else if (g.phase === 'cut') cutAt(x, y, dd);
      else if (g.phase === 'style') styleAt(x, y, dd);
    }
    if (g.phase === 'reveal') g.slider = clamp((p.x - (W / 2 - 230)) / 460, 0, 1);
    lastP = p;
  }
  function onUp() { down = false; if (g) g.blowing = false; }

  // ══ อัปเดต ══
  function update(dt) {
    g.clock += dt;
    g.phaseT += dt;
    for (const p of g.parts) { p.life -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    g.parts = g.parts.filter((p) => p.life > 0);
    if (g.caption) { g.caption.t -= dt; if (g.caption.t <= 0) g.caption = null; }
    g.fluff = Math.max(0, g.fluff - dt * 2.5);
    g.wobble = Math.max(0, g.wobble - dt * 3);
    const P = g.phase;
    if (P === 'intro' && g.phaseT > 1.6) setPhase('brush');
    if (P === 'brush') {
      // ครบ 92% = ผ่าน (ปอยปลายวงที่ชิดไหล่เอื้อมยาก ไม่ต้องเป๊ะทุกปอย) — ที่เหลือหวีให้เรียบเอง
      const prog = Math.min(1, g.tufts.filter((t) => t.mess < 0.15).length / TUFTS / 0.92);
      g.progress = prog;
      if (prog >= 1) {
        for (const t of g.tufts) t.mess = Math.min(t.mess, 0.1); g.mood = 'happy'; say('นุ่มแล้ว! 😌'); phaseDone('brush'); }
      else if (g.phaseT > 14 && g.phaseT - dt <= 14) say('ตรงนี้ยังไม่ได้แปรงนะ 🤨');
    } else if (P === 'wash') {
      const prog = 1 - g.dirt.reduce((s, d) => s + d.v, 0) / g.dirt.length;
      g.progress = prog;
      g.wet = Math.min(1, g.wet + dt * 0.6);
      // น้ำอุ่น: กลัว → เฉย ๆ → สบาย → หลับตาฟิน
      if (prog > 0.25 && g.mood === 'hurt') { g.mood = ''; say('อุ่นดีนะ... 😐'); }
      // ถูรัว ๆ จนถึง 60% กับ 100% เกือบพร้อมกัน = เสียงคราง (~1 วิ) กับเสียงง่วงซ้อนกันยาวค้าง
      // → ครางเฉพาะตอนยังห่างจากจบ · ตอนจบเล่นเสียงง่วงเฉพาะถ้าเสียงครางจบไปแล้ว
      if (prog > 0.6 && !g.shut) { g.mood = 'happy'; g.shut = true; say('สบายจัง~ 😌'); if (prog < 0.85) { sfx.purr(); g.purrAt = g.clock; } }
      if (prog >= 1) { say('ง่วงเลย... 😴'); if (!(g.clock - (g.purrAt ?? -9) < 1.1)) sfxOnce('sleepy', 1, sfx.snooze); phaseDone('wash'); }
    } else if (P === 'dry') {
      const [lo, hi] = DIFF[diff].safe;
      g.heat = clamp(g.heat + (g.blowing ? 0.3 : -0.3) * dt, 0, 1);
      const inSafe = g.heat >= lo && g.heat <= hi;
      if (g.blowing) {
        g.wobble = 1;
        if (Math.random() < dt * 8) {
          const p = g.pointer || { x: g.G.cx + 160, y: g.G.cy };
          const a = Math.atan2(g.G.cy - p.y, g.G.cx - p.x);
          emit('air', p.x, p.y, 1, { angle: a + rand(-0.25, 0.25), min: 160, max: 260, life: 0.5, rmin: 2, rmax: 3.5 });
        }
        if (Math.floor(g.clock * 3) !== Math.floor((g.clock - dt) * 3)) sfx.swish();
        if (g.heat > hi) { g.hotT += dt; g.mood = 'hurt'; if (g.clock - g.warnAt > 1.8) { g.warnAt = g.clock; say('เบา ๆ หน่อย! 😾'); sfx.hurt(); } }
        else if (inSafe) { g.safeT += dt; g.dryness = Math.min(1, g.dryness + dt * 0.22); g.mood = 'happy'; }
        else { g.coldT += dt; g.dryness = Math.min(1, g.dryness + dt * 0.08); g.mood = ''; }
      }
      g.wet = 1 - g.dryness;
      g.progress = g.dryness;
      if (g.dryness >= 1) { g.blowing = false; say('ฟูนุ่มเลย! 😺'); phaseDone('dry', 'PERFECT DRY!'); }
    } else if (P === 'cut') {
      const prog = g.guide.filter((k) => k.cut).length / g.guide.length;
      g.progress = prog;
      if (prog >= 0.92) { const a = cutAcc(); say(a >= 0.9 ? 'เหมียวชอบมาก! ✨' : 'เอ่อ...สวยแล้วมั้ง? 😐'); phaseDone('cut', a >= 0.9 ? 'PERFECT!' : a >= 0.75 ? 'GREAT!' : 'GOOD!'); }
      else if (prog >= 0.6 && !g.done.cutEarly) { g.done.cutEarly = true; $('grNext').textContent = tr('พอแค่นี้ ›'); $('grNext').classList.remove('hidden'); $('grNext').onclick = () => { g.times.cut = g.phaseT; g.done.cut = true; sfx.fish(); setPhase('style'); }; }
    } else if (P === 'style') {
      g.progress = g.neat;
    }
  }
  const cutAcc = () => g.cutOk / Math.max(1, g.cutOk + g.cutBad);

  // ══ วาด ══
  /**
   * ขนฟูรอบหัว — งอกออกจากตัวน้องจริง ๆ ไม่ใช่แผ่นแปะ
   * ปอยแต่ละปอยเป็นทรงหยดน้ำปลายมน โคนฝังอยู่ใต้หัว (มองไม่เห็นรอยต่อ) ซ้อนเกยกันเป็นก้อนเดียว
   * เส้นขอบ: วาดทุกปอยเป็นสีเส้นหนากว่าไว้ข้างใต้ก่อน แล้วลงสีทับทุกปอย → เหลือเส้นเฉพาะรอบนอกทั้งก้อน
   * (ท่าเดียวกับหางของตัวน้องใน entities.js) ด้านในจึงไม่มีเส้นตัดกันเลย
   * สี: ไล่จากสีตัวตรงโคน → เข้มขึ้นนิดที่ปลาย (แสงเงาแบบ cel) — ขนจึงอ่านเป็นส่วนหนึ่งของตัว
   */
  function tuftShape(c, an, R0, R1, w) {
    const { cx, cy } = g.G;
    const at = (a, R) => [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
    c.moveTo(...at(an - w, R0));
    c.bezierCurveTo(...at(an - w * 1.05, R0 + (R1 - R0) * 0.55), ...at(an - w * 0.55, R1), ...at(an, R1));
    c.bezierCurveTo(...at(an + w * 0.55, R1), ...at(an + w * 1.05, R0 + (R1 - R0) * 0.55), ...at(an + w, R0));
    c.closePath();
  }
  function furTufts(st, wet, wobble) {
    const { r, unit } = g.G;
    return st.tufts.map((t, i) => {
      const len = Math.max(0.2, t.len) * (1 - wet * 0.3);
      let an = t.a + t.mess * Math.sin(t.a * 7 + 1.3) * 0.16;
      an += wet * 0.25 * Math.cos(t.a);
      an += wobble * Math.sin(g.clock * 22 + t.a * 5) * 0.04;
      const L = len * unit * (1 + g.fluff * 0.12) * (1 - st.neat * 0.04) + t.mess * unit * 0.2 * Math.sin(i * 2.7);
      return { an, R0: r * 0.55, R1: r * 0.93 + L, w: 0.2 + 0.03 * Math.sin(i * 1.9) - t.mess * 0.03 };
    });
  }
  function drawFur(c, st, wet, wobble) {
    const { cx, cy, r, unit } = g.G;
    const col = skin.cat, dark = skin.dark, line = skin.line || skin.dark;
    const tufts = furTufts(st, wet, wobble);
    const all = () => { c.beginPath(); for (const t of tufts) tuftShape(c, t.an, t.R0, t.R1, t.w); };
    c.save();
    c.lineJoin = 'round';
    // 1) เส้นขอบรอบนอกทั้งก้อน (ลงสีเส้นหนาไว้ใต้ทุกปอย)
    all();
    c.strokeStyle = line; c.lineWidth = 0.62 * 2 * 0.7 * g.G.S; c.stroke();
    // 2) เนื้อขน: สีตัวที่โคน → เข้มขึ้นนิดที่ปลาย
    const gr = c.createRadialGradient(cx, cy, r * 0.8, cx, cy, r + unit * 3.4);
    gr.addColorStop(0, col);
    gr.addColorStop(0.55, col);
    gr.addColorStop(1, dark);
    all();
    c.fillStyle = gr; c.fill();
    // 3) ไฮไลต์นุ่มด้านบน (แสงตก)
    const hg = c.createRadialGradient(cx - r * 0.2, cy - r * 0.9, r * 0.2, cx, cy - r * 0.4, r + unit * 2.4);
    hg.addColorStop(0, 'rgba(255,255,255,.3)');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    all();
    c.fillStyle = hg; c.fill();
    // 4) เส้นขนบาง ๆ จาง ๆ ทุกสามปอย (ไม่ใช่เส้นขอบ — แค่บอกทิศขน)
    c.strokeStyle = dark; c.globalAlpha = 0.3; c.lineWidth = 1.1; c.lineCap = 'round';
    tufts.forEach((t, i) => {
      if (i % 3) return;
      const r0 = r * 1.0, r1 = r0 + (t.R1 - r0) * 0.7;
      if (r1 <= r0 + 2) return;
      c.beginPath();
      c.moveTo(cx + Math.cos(t.an) * r0, cy + Math.sin(t.an) * r0);
      c.quadraticCurveTo(cx + Math.cos(t.an + 0.06) * (r0 + r1) / 2, cy + Math.sin(t.an + 0.06) * (r0 + r1) / 2, cx + Math.cos(t.an + 0.03) * r1, cy + Math.sin(t.an + 0.03) * r1);
      c.stroke();
    });
    c.globalAlpha = 1;
    if (wet > 0.05) { all(); c.globalAlpha = wet * 0.3; c.fillStyle = dark; c.fill(); c.globalAlpha = 1; }
    c.restore();
  }
  function drawCat(c, st, { wet = 0, dirtOn = true, accOn = true, mood = '', shut = false, wobble = 0 } = {}) {
    drawFur(c, st, wet, wobble);
    setCatEdgeScale(0.7);
    const f = g.clock * 60;
    drawCatPose(c, W / 2, TABLE_Y - 8, g.G.S, skin, f, {
      shape: { sit: 1, ear: wobble ? Math.sin(f * 0.6) * 0.3 : 0, tilt: Math.sin(f * 0.02) * 0.04, wag: Math.sin(f * 0.08) * 0.6 },
      k: 1, mood, blink: shut ? true : undefined,
    });
    if (dirtOn) {
      for (const s of st.dirt) {
        if (s.v <= 0.02) continue;
        c.globalAlpha = s.v * 0.75; c.fillStyle = '#9A7452';
        c.beginPath(); c.ellipse(s.x, s.y, s.r * 1.3, s.r, 0.4, 0, TAU); c.fill();
        c.beginPath(); c.arc(s.x + s.r, s.y - s.r * 0.6, s.r * 0.45, 0, TAU); c.fill();
        c.globalAlpha = 1;
      }
    }
    if (accOn && st.acc) drawAcc(c, st.acc, g.G.cx + g.G.r * 0.55, g.G.cy - g.G.r * 0.95, g.G.S / 3);
  }
  function drawGuide(c) {
    c.save();
    c.setLineDash([8, 7]);
    c.lineWidth = 3;
    for (let k = 0; k < g.guide.length - 1; k++) {
      const p = guidePt(k), q = guidePt(k + 1);
      c.strokeStyle = g.guide[k].cut ? 'rgba(157,242,200,.9)' : 'rgba(255,255,255,.95)';
      c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke();
    }
    c.setLineDash([]);
    c.restore();
  }
  function drawProgress(c) {
    // ขั้นตอนบนสุด: 🐾 ── 🪮 ── 🧴 ── 💨 ── ✂️ ── ✨
    const steps = ['🐾', ...PHASES.map((p) => PHASE_ICON[p]), '✨'];
    const cur = g.phase === 'reveal' || g.phase === 'result' ? steps.length - 1 : Math.max(0, PHASES.indexOf(g.phase) + 1);
    const x0 = W / 2 - 150, dx = 50, y = 24;
    c.save();
    c.lineWidth = 4; c.strokeStyle = 'rgba(78,53,39,.25)';
    c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + dx * 6, y); c.stroke();
    c.font = '18px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    steps.forEach((s, i) => {
      c.beginPath(); c.arc(x0 + i * dx, y, i === cur ? 17 : 14, 0, TAU);
      c.fillStyle = i < cur ? '#9DF2C8' : i === cur ? '#FFE48A' : '#FFF8EA';
      c.fill(); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
      c.fillText(s, x0 + i * dx, y + 1);
    });
    // หลอดความคืบหน้าของเฟสนี้
    if (PHASES.includes(g.phase) && g.phase !== 'style') {
      const bw = 220, bx = W / 2 - bw / 2, by = 50;
      rr(c, bx, by, bw, 12, 6); c.fillStyle = 'rgba(255,248,234,.9)'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
      rr(c, bx + 2, by + 2, Math.max(0, (bw - 4) * clamp(g.progress || 0, 0, 1)), 8, 4); c.fillStyle = '#7FD3A8'; c.fill();
    }
    c.restore();
  }
  function drawDryMeter(c) {
    const [lo, hi] = DIFF[diff].safe;
    const x = W - 92, y0 = 110, h = 220;
    c.save();
    rr(c, x, y0, 30, h, 15);
    const gr = c.createLinearGradient(0, y0 + h, 0, y0);
    gr.addColorStop(0, '#A8DDF0'); gr.addColorStop(0.5, '#FFE48A'); gr.addColorStop(1, '#FF8A8A');
    c.fillStyle = gr; c.fill(); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
    // ช่องปลอดภัย
    c.fillStyle = 'rgba(127,211,168,.55)';
    c.fillRect(x + 3, y0 + h * (1 - hi), 24, h * (hi - lo));
    c.strokeStyle = '#2E9C6A'; c.lineWidth = 2; c.strokeRect(x + 3, y0 + h * (1 - hi), 24, h * (hi - lo));
    // เข็ม
    const ny = y0 + h * (1 - g.heat);
    c.beginPath(); c.moveTo(x - 10, ny - 7); c.lineTo(x + 2, ny); c.lineTo(x - 10, ny + 7); c.closePath();
    c.fillStyle = '#FFFFFF'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
    c.font = '700 12px Mali, sans-serif'; c.textAlign = 'center'; c.fillStyle = INK;
    c.fillText(tr('ร้อน'), x + 15, y0 - 8); c.fillText(tr('เย็น'), x + 15, y0 + h + 16);
    c.restore();
  }
  function drawParts(c) {
    for (const p of g.parts) {
      const a = Math.max(0, Math.min(1, p.life / p.max));
      c.globalAlpha = a;
      if (p.kind === 'bubble') {
        c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 2; c.fillStyle = 'rgba(200,236,255,.35)';
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); c.stroke();
      } else if (p.kind === 'fur') {
        c.fillStyle = p.color || '#F2C98F';
        c.beginPath(); c.ellipse(p.x, p.y, p.r * 1.4, p.r * 0.6, p.life * 5, 0, TAU); c.fill();
      } else if (p.kind === 'air') {
        c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); c.stroke();
      } else if (p.kind === 'spark') {
        c.fillStyle = p.color || '#FFE48A';
        c.save(); c.translate(p.x, p.y); c.rotate(p.life * 4); c.beginPath();
        for (let i = 0; i < 8; i++) { const r = i % 2 ? p.r * 0.35 : p.r; const an = i / 8 * TAU; c.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
        c.closePath(); c.fill(); c.restore();
      } else if (p.kind === 'text') {
        c.font = '800 18px Mali, sans-serif'; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = INK;
        c.strokeText(p.text, p.x, p.y); c.fillStyle = p.color; c.fillText(p.text, p.x, p.y);
      }
    }
    c.globalAlpha = 1;
  }
  /** ไอคอนอุปกรณ์ลอยตามนิ้ว/เมาส์ตอนใช้งาน (หวี สบู่ ไดร์ กรรไกร) — ฉากอื่นไม่แสดงอะไร */
  const HAND_ICON = { brush: '🪮', wash: '🧼', dry: '💨', cut: '✂️', style: '🪮' };
  function drawTool(c) {
    const p = g.pointer, ico = HAND_ICON[g.phase];
    if (!p || !ico) return;
    c.save();
    c.font = '40px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.globalAlpha = down ? 1 : 0.75;
    // เรืองขาวรอบไอคอน ให้เห็นชัดแม้ลากทับขนสีเข้ม
    c.shadowColor = 'rgba(255,255,255,.95)'; c.shadowBlur = 10;
    c.fillText(ico, p.x + 22, p.y - 22);
    c.restore();
  }

  function draw() {
    const { dpr, scale, ox, oy } = view;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
    if (g.phase === 'reveal') {
      // ก่อน (ซ้ายของเส้นแบ่ง) / หลัง (ขวา) — ลากเส้นแบ่งเพื่อเทียบ
      const sx = W / 2 - 230 + 460 * g.slider;
      ctx.save(); ctx.beginPath(); ctx.rect(-500, -500, sx + 500, H + 1000); ctx.clip();
      drawCat(ctx, g.before, { wet: 0, mood: '', dirtOn: true, accOn: false });
      ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(sx, -500, W + 500, H + 1000); ctx.clip();
      drawCat(ctx, g, { mood: 'starry', dirtOn: false });
      ctx.restore();
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(sx - 2, 70, 4, TABLE_Y - 60);
      ctx.beginPath(); ctx.arc(sx, 240, 16, 0, TAU); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.font = '800 15px Mali, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = INK; ctx.fillText('‹ ›', sx, 245);
      ctx.font = '800 20px Mali, sans-serif'; ctx.lineWidth = 5; ctx.strokeStyle = '#FFFFFF';
      for (const [txt, x] of [['BEFORE', W / 2 - 250], ['AFTER', W / 2 + 250]]) { ctx.strokeText(txt, x, 110); ctx.fillStyle = INK; ctx.fillText(txt, x, 110); }
    } else {
      drawCat(ctx, g, { wet: g.wet, mood: g.mood, shut: g.shut, wobble: g.wobble });
      if (g.phase === 'cut') drawGuide(ctx);
      if (g.phase === 'dry') drawDryMeter(ctx);
    }
    drawParts(ctx);
    drawProgress(ctx);
    // กล่องคำพูดลอยเหนือหัวน้อง (พ้นแผงคอขน)
    if (g.caption) drawSpeech(ctx, g.G.cx, g.G.cy - g.G.r - g.G.unit * 3.3, g.caption.text);
    drawTool(ctx);
    if (g.phase !== 'reveal' && g.phase !== 'result') {
      ctx.font = '700 14px Mali, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = INK;
      ctx.fillText(g.style.icon + ' ' + g.style.name, 20, 30);
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!pace(now, quality('room').fps)) return;
    const dt = Math.min(1 / 30, Math.max(0, (now - lastNow) / 1000));
    lastNow = now;
    if (!g) return;
    if (!paused) update(dt);
    resize();
    draw();
  }

  // ══ เครื่องประดับ (DOM) ══
  function paintAcc() {
    const box = $('grAcc');
    box.innerHTML = '';
    for (const [id, ico] of [['none', '🚫'], ...GROOM_ACCS]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gr-acc' + ((g.acc || 'none') === id ? ' on' : '');
      b.textContent = ico;
      b.setAttribute('aria-label', id);
      b.addEventListener('click', () => { g.acc = id === 'none' ? null : id; sfx.jingle?.(); paintAcc(); if (g.acc) { emit('spark', g.G.cx + g.G.r * 0.55, g.G.cy - g.G.r, 6, { color: '#FFF3B0' }); } });
      box.appendChild(b);
    }
  }

  // ══ คะแนน ══
  const stars = (q) => Math.max(1, Math.min(5, Math.round(q * 5)));
  function finish() {
    const t = g.times;
    const brushQ = clamp(1 - Math.max(0, (t.brush || 30) - 10) / 25, 0.3, 1);
    const cleanQ = clamp(1 - Math.max(0, (t.wash || 30) - 8) / 25, 0.4, 1);
    const dryQ = g.safeT / Math.max(0.001, g.safeT + g.hotT + g.coldT * 0.3);
    const cutQ = cutAcc() * (g.guide.filter((k) => k.cut).length / g.guide.length > 0.85 ? 1 : 0.85);
    let match = 1;
    if (g.style.id !== 'free') {
      const err = g.tufts.reduce((s, x) => s + Math.abs(x.len - x.target), 0) / TUFTS;
      match = clamp(1 - err / 1.6, 0, 1) * (g.style.acc && g.acc !== g.style.acc ? 0.85 : 1);
    }
    const styleQ = clamp(0.55 * match + 0.3 * g.neat + (g.acc ? 0.15 : 0.05), 0, 1);
    const rows = [
      ['ความสะอาด', stars(cleanQ)], ['การแปรง', stars(brushQ)], ['การเป่า', stars(dryQ)],
      ['การเล็ม', stars(cutQ)], ['ความสวย', stars(styleQ)],
    ];
    let score = rows.reduce((s, r) => s + r[1] * 180, 0);
    const bonus = [];
    if (rows[1][1] === 5) bonus.push(['Perfect Brush', 100]);
    if (cutAcc() >= 0.9) bonus.push(['Perfect Cut', 300]);
    if (dryQ >= 0.9) bonus.push(['Perfect Dry', 200]);
    if (g.cutBad < 1 && g.hotT < 0.3) bonus.push(['No Mistakes', 500]);
    if (g.style.id !== 'free' && match >= 0.85) bonus.push(['Style Match', 500]);
    score += bonus.reduce((s, b) => s + b[1], 0);
    const avg = Math.round(rows.reduce((s, r) => s + r[1], 0) / rows.length);
    const RATE = { 5: ['Master Groomer!', 'เหมียวชอบมาก! ✨'], 4: ['Great Groomer!', 'หล่อ/สวยแล้ว!'], 3: ['Good!', 'นุ่มฟูน่ารัก'], 2: ['Needs Practice', 'น้องยังน่ารักเหมือนเดิมนะ! 💕'], 1: ['Oops...', 'น้องยังน่ารักเหมือนเดิมนะ! 💕'] };
    const isBest = score > best.score;
    if (isBest) { best.score = score; best.stars = avg; savePref(PREF, best); }
    const reward = onFinish ? onFinish({ score, stars: avg }) || '' : '';
    // หน้าสรุป (DOM)
    $('grRows').innerHTML = rows.map(([n, s]) => `<div><span>${tr(n)}</span><b>${'★'.repeat(s)}<i>${'★'.repeat(5 - s)}</i></b></div>`).join('');
    $('grBonus').textContent = bonus.map((b) => `${b[0]} +${b[1]}`).join(' · ');
    $('grScore').textContent = score.toLocaleString('en-US');
    $('grRate').textContent = (isBest ? '🎉 NEW BEST! · ' : '') + RATE[avg][0];
    $('grLine').textContent = tr(RATE[avg][1]);
    $('grReward').textContent = reward;
    $('grReward').classList.toggle('hidden', !reward);
    $('grResult').classList.remove('hidden');
    $('grTools').classList.add('hidden');
    sfx.cheer(); setTimeout(() => sfx.trill(), 300);
    g.phase = 'result';
  }

  // ══ ปุ่ม DOM ══
  const btns = (sel, fn) => panel.querySelectorAll(sel).forEach((b) => b.addEventListener('click', () => fn(b)));
  btns('[data-grmode]', (b) => { mode = b.dataset.grmode; sfx.fish(); paintIntro(); });
  btns('[data-grdiff]', (b) => { diff = b.dataset.grdiff; sfx.fish(); paintIntro(); });
  function paintIntro() {
    panel.querySelectorAll('[data-grmode]').forEach((b) => b.classList.toggle('on', b.dataset.grmode === mode));
    panel.querySelectorAll('[data-grdiff]').forEach((b) => b.classList.toggle('on', b.dataset.grdiff === diff));
    const s = g?.style;
    $('grTarget').textContent = s ? `${s.icon} ${s.name} — ${tr(s.desc)}` : '';
  }
  function rollStyle() {
    const s = mode === 'free' ? FREE : STYLES[Math.floor(Math.random() * STYLES.length)];
    g = newGame(s);
    paintIntro();
  }
  btns('[data-grmode]', () => rollStyle());
  $('grStart').addEventListener('click', () => {
    sfx.trill();
    $('grIntro').classList.add('hidden');
    g.phase = 'intro'; g.phaseT = 0;
    say(skin?.sex === 'f' ? 'วันนี้มาแต่งสวยกัน!' : 'วันนี้มาแต่งหล่อกัน!');
  });
  $('grReroll').addEventListener('click', () => { sfx.fish(); rollStyle(); });
  $('grNext').addEventListener('click', () => {
    if (g.phase === 'style') {
      sfx.fish();
      g.times.style = g.phaseT;
      g.phase = 'reveal'; g.slider = 0.5; g.mood = 'starry';
      $('grTools').classList.add('hidden');
      $('grAcc').classList.add('hidden');
      $('grRevealBar').classList.remove('hidden');
      sfx.levelUp();
      emit('spark', g.G.cx, g.G.cy - g.G.r, 16, { min: 80, max: 220, color: '#FFE48A' });
    }
  });
  $('grSeeScore').addEventListener('click', () => { $('grRevealBar').classList.add('hidden'); finish(); });
  $('grAgain').addEventListener('click', () => { sfx.restart?.(); start(); });
  $('grView').addEventListener('click', () => { sfx.fish(); $('grResult').classList.add('hidden'); g.phase = 'reveal'; $('grRevealBar').classList.remove('hidden'); });
  $('grHome').addEventListener('click', () => close());
  function togglePause() {
    if (!g) return;
    paused = !paused;
    $('grPauseBox').classList.toggle('hidden', !paused);
    if (paused) { killSfx(); sfx.pause(); } else { sfx.resume(); lastNow = performance.now(); }
  }
  $('grPause').addEventListener('click', togglePause);
  $('grResume').addEventListener('click', togglePause);
  $('grQuit').addEventListener('click', () => close());

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', (e) => onMove(e));
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) canvas.addEventListener(ev, onUp);
  function onVis() { if (document.hidden && !paused && g && g.phase !== 'result') togglePause(); }

  function start() {
    paused = false;
    for (const id of ['grResult', 'grPauseBox', 'grTools', 'grAcc', 'grRevealBar']) $(id).classList.add('hidden');
    $('grIntro').classList.remove('hidden');
    rollStyle();
    g.phase = 'menu';
  }

  function open(opts = {}) {
    skin = opts.skin;
    panel.classList.remove('hidden');
    document.addEventListener('visibilitychange', onVis);
    setMusicTrack('garden');   // เพลงเบา ๆ สบาย ๆ
    start();
    resize();
    lastNow = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function close() {
    if (panel.classList.contains('hidden')) return;
    cancelAnimationFrame(raf);
    raf = 0;
    document.removeEventListener('visibilitychange', onVis);
    down = false;
    killSfx();
    panel.classList.add('hidden');
    g = null;
    onExit?.();
  }

  return { open, close, best: () => ({ ...best }), debug: () => g };
}
