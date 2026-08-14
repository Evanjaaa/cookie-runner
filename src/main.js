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
}

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
