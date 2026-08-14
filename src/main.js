// src/main.js
import './style.css';
import { VIEW, SCORING } from './config.js';
import { Game, STATE } from './game.js';
import { setupInput } from './input.js';
import { unlockAudio, toggleMute } from './audio.js';

const { W, H } = VIEW;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// รองรับจอความละเอียดสูง ไม่งั้นภาพจะเบลอบน Retina
function fitDPR() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fitDPR();
window.addEventListener('resize', fitDPR);

const startPanel = document.getElementById('startPanel');
const overPanel = document.getElementById('overPanel');
const pausePanel = document.getElementById('pausePanel');
const pauseBtn = document.getElementById('btnPause');

const game = new Game({ onGameOver: showGameOver });

function showGameOver() {
  document.getElementById('finalScore').textContent = game.score;
  document.getElementById('finalDist').textContent =
    Math.floor(game.distance / SCORING.pxPerMeter) + ' ม.';
  document.getElementById('bestScore').textContent = game.best;
  document.getElementById('overTitle').textContent =
    game.score >= game.best && game.score > 0 ? 'สถิติใหม่!' : 'เตาปิดแล้ว';
  overPanel.classList.remove('hidden');
}

function startRun() {
  unlockAudio();   // ต้องเรียกตอนผู้ใช้กดปุ่ม ไม่งั้นเบราว์เซอร์บล็อกเสียง
  game.start();
  startPanel.classList.add('hidden');
  overPanel.classList.add('hidden');
  pausePanel.classList.add('hidden');
  pauseBtn.textContent = '⏸';
}

// ── หยุด / เล่นต่อ ─────────────────────────────────────────

function setPaused(on) {
  // pause()/resume() คืน false ถ้าสถานะไม่เข้าเงื่อนไข เช่นกด Esc ตอนตายอยู่
  // เช็คก่อนแตะ UI ไม่งั้นพาเนลกับสถานะเกมจะหลุดจากกัน
  if (on ? !game.pause() : !game.resume()) return;
  pausePanel.classList.toggle('hidden', !on);
  pauseBtn.textContent = on ? '▶' : '⏸';
  pauseBtn.setAttribute('aria-label', on ? 'เล่นต่อ' : 'หยุดชั่วคราว');
}

pauseBtn.addEventListener('click', () => setPaused(game.state === STATE.RUN));
document.getElementById('resumeBtn').addEventListener('click', () => setPaused(false));
document.getElementById('restartBtn').addEventListener('click', startRun);

// สลับแท็บหรือสลับแอปแล้วหยุดให้เอง จะได้ไม่กลับมาเจอว่าตายไปแล้ว
document.addEventListener('visibilitychange', () => {
  if (document.hidden) setPaused(true);
});

// ปุ่มเดียวทำได้ 3 อย่าง ขึ้นกับสถานะเกม
function confirm() {
  if (game.state === STATE.RUN) game.jump();
  else if (game.state === STATE.READY) startRun();
  else if (!overPanel.classList.contains('hidden')) startRun();
}

setupInput(document.getElementById('stage'), {
  onConfirm: confirm,
  onSlideStart: () => game.setSlide(true),
  onSlideEnd: () => game.setSlide(false),
  onTogglePause: () => setPaused(game.state === STATE.RUN),
});

document.getElementById('startBtn').addEventListener('click', startRun);
document.getElementById('retryBtn').addEventListener('click', startRun);

// ปุ่มปิด/เปิดเสียง
const muteBtn = document.getElementById('btnMute');
muteBtn.addEventListener('click', () => {
  const muted = toggleMute();
  muteBtn.textContent = muted ? '🔇' : '🔊';
  muteBtn.setAttribute('aria-label', muted ? 'เปิดเสียง' : 'ปิดเสียง');
});

// ── ลูปหลัก ────────────────────────────────────────────────

let last = performance.now();

function loop(now) {
  // แปลงเวลาจริงเป็น "จำนวนเฟรมที่ 60fps"
  // เพื่อให้เกมเร็วเท่ากันทั้งจอ 60Hz และ 144Hz
  let dt = (now - last) / 16.667;
  last = now;
  dt = Math.min(dt, 3);   // กันการกระโดดข้ามเวลาตอนสลับแท็บ

  game.update(dt);
  game.draw(ctx);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
game.draw(ctx);
