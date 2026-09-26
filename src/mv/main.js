// src/mv/main.js
// ─────────────────────────────────────────────────────────────
// เครื่องเล่น MV — วาดทุกเฟรมจาก "เวลาของเพลง" ตรง ๆ
//
// กำลังเล่น = เวลามาจาก audio.currentTime · หยุดอยู่ = เวลามาจากแถบเลื่อน
// ภาพจึงตรงกับเพลงเสมอ กรอไปจุดไหนก็เห็นเฟรมนั้นทันที ไม่ต้องเล่นไล่มาจากต้น
//
// จอภายใน 960×540 (16:9) ขยายตามขนาดหน้าต่างด้วยความละเอียดจริงของจอ
// ─────────────────────────────────────────────────────────────
import * as S1 from './scene01.js';
import * as S2 from './scene02.js';
import * as S3 from './scene03.js';
import * as S4 from './scene04.js';
import * as S5 from './scene05.js';
import * as S6 from './scene06.js';

const W = 960, H = 540;
const LENGTH = 92;   // 0:00–1:30 ตามบรีฟ + ค้างภาพสุดท้าย 2 วินาที

/** ฉากทั้งหมดตามสตอรีบอร์ด — ฉากที่ยังไม่ได้ทำจะขึ้นการ์ดบอกไว้แทน */
const SCENES = [
  { no: 1, name: 'MORNING', from: 0, to: 15, mod: S1 },
  { no: 2, name: 'BREAKFAST', from: 15, to: 32, mod: S2 },
  { no: 3, name: 'FOLLOWING', from: 32, to: 42.5, mod: S3 },
  { no: 4, name: 'THE SECRET TREASURE', from: 42.5, to: 62, mod: S4 },
  { no: 5, name: 'LITTLE SCARE', from: 62, to: 72, mod: S5 },
  { no: 6, name: 'TOGETHER', from: 72, to: 92, mod: S6 },
];

const cv = document.getElementById('mv');
const ctx = cv.getContext('2d');
const audio = new Audio(import.meta.env.BASE_URL + 'home-theme.mp3');
audio.preload = 'auto';

const ui = {
  play: document.getElementById('play'),
  bar: document.getElementById('bar'),
  time: document.getElementById('time'),
  chips: document.getElementById('chips'),
};

let scrubT = Number(new URLSearchParams(location.search).get('t')) || 0;
let playing = false;

function fit() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = cv.getBoundingClientRect();
  cv.width = Math.round(r.width * dpr);
  cv.height = Math.round(r.width * (H / W) * dpr);
}
addEventListener('resize', fit);

function now() { return playing ? audio.currentTime : scrubT; }

/** วาดหนึ่งเฟรม ณ เวลา t — ฟังก์ชันบริสุทธิ์ เรียกซ้ำกี่รอบก็ได้ภาพเดิม */
export function drawFrame(t) {
  const k = cv.width / W;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  const sc = SCENES.find((s) => t >= s.from && t < s.to) || SCENES[SCENES.length - 1];
  const local = t - sc.from;
  if (!sc.mod) return placeholder(sc);

  const cam = sc.mod.camera(local);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.x, -cam.y);
  sc.mod.draw(ctx, local);
  ctx.restore();
  sc.mod.drawOverlay?.(ctx, local, W, H);
  grade();
}

/** โทนภาพรวม: ขอบจอมืดลงนุ่ม ๆ + อุ่นขึ้นนิดหนึ่ง ให้ดูเป็นภาพยนตร์ ไม่ใช่ภาพประกอบแบน ๆ */
function grade() {
  const g = ctx.createRadialGradient(W / 2, H * 0.52, H * 0.35, W / 2, H * 0.5, W * 0.72);
  g.addColorStop(0, 'rgba(60,30,40,0)');
  g.addColorStop(1, 'rgba(60,30,40,.32)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function placeholder(sc) {
  ctx.fillStyle = '#2A1A33';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFE9C9';
  ctx.textAlign = 'center';
  ctx.font = '700 34px Mali, sans-serif';
  ctx.fillText(`SCENE 0${sc.no} — ${sc.name}`, W / 2, H / 2 - 10);
  ctx.font = '600 18px Mali, sans-serif';
  ctx.fillStyle = '#C9B3DD';
  ctx.fillText('ฉากนี้ยังไม่ได้ทำ — ดูเรื่องใน STORYBOARD.md', W / 2, H / 2 + 26);
}

const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

function loop() {
  let t = now();
  if (playing && t >= LENGTH) { audio.pause(); playing = false; scrubT = t = LENGTH - 0.001; }
  drawFrame(t);
  ui.bar.value = t;
  ui.time.textContent = `${fmt(t)} / ${fmt(LENGTH)}`;
  ui.play.textContent = playing ? '❚❚' : '▶';
  requestAnimationFrame(loop);
}

async function toggle() {
  if (playing) { scrubT = audio.currentTime; audio.pause(); playing = false; return; }
  audio.currentTime = scrubT >= LENGTH - 0.05 ? 0 : scrubT;
  try { await audio.play(); playing = true; } catch { playing = false; }
}

function seek(t) {
  scrubT = Math.max(0, Math.min(LENGTH - 0.001, t));
  if (playing) audio.currentTime = scrubT;
}

ui.play.addEventListener('click', toggle);
ui.bar.max = LENGTH;
ui.bar.addEventListener('input', () => seek(Number(ui.bar.value)));
for (const s of SCENES) {
  const b = document.createElement('button');
  b.textContent = `${s.no} · ${s.name}`;
  b.className = s.mod ? 'chip' : 'chip todo';
  b.addEventListener('click', () => seek(s.from));
  ui.chips.append(b);
}
addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); toggle(); }
  if (e.code === 'ArrowRight') seek(now() + (e.shiftKey ? 0.1 : 1));
  if (e.code === 'ArrowLeft') seek(now() - (e.shiftKey ? 0.1 : 1));
});

// ให้สคริปต์ทดสอบสั่งวาดเฟรมไหนก็ได้ (หน้านี้เป็นหน้าทำงาน ไม่ได้ขึ้นเว็บจริง)
window.__mv = { drawFrame, seek, SCENES };

fit();
document.fonts?.ready.then(() => requestAnimationFrame(loop));
