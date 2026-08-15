// src/main.js
import './style.css';
import { VIEW, SCORING } from './config.js';
import { Game, STATE } from './game.js';
import { setupInput } from './input.js';
import { unlockAudio, toggleMute, sfx } from './audio.js';
import { startMusic, setMusicMuted } from './music.js';
import { SKINS, getSkin, setSkin } from './skins.js';
import { STAGES, getStage, setStage } from './stages.js';
import { loadBest } from './storage.js';
import { drawCatPose, drawCatFace, drawObstacles } from './render/entities.js';
import { drawSky, drawHills, drawGround } from './render/background.js';

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
const skinPanel = document.getElementById('skinPanel');
const stagePanel = document.getElementById('stagePanel');
const pauseBtn = document.getElementById('btnPause');

const game = new Game({ onGameOver: showGameOver });

// ── หน้าแรกกับการเลือกตัวละคร ──────────────────────────────

/**
 * วาดลงแคนวาสเล็กในเมนู
 * ต้องคูณ DPR เอง เพราะ fitDPR() ดูแลเฉพาะจอเกมหลัก
 * ขนาดที่แสดงจริงคุมด้วย CSS ส่วนตรงนี้คุมแค่ความละเอียด
 */
function paintMini(canvas, logical, draw) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = logical * dpr;
  canvas.height = logical * dpr;
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, logical, logical);
  draw(c);
}

/**
 * ภาพตัวอย่างด่าน — ใช้ฟังก์ชันวาดฉากตัวจริงย่อส่วนลงมา ไม่ได้วาดภาพจำลองใหม่
 * ที่ทำแบบนี้เพราะภาพจำลองจะเพี้ยนจากของจริงทันทีที่มีคนแก้สีในด่าน
 * ฟังก์ชันพวกนี้อ้างขนาด 960x420 ตายตัว จึงต้อง scale เอาที่ ctx
 */
function paintStageScene(canvas, stage, logicalW) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const logicalH = Math.round((logicalW * 420) / 960);
  canvas.width = logicalW * dpr;
  canvas.height = logicalH * dpr;

  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.scale(logicalW / 960, logicalH / 420);

  drawSky(c, 0, stage.palette);
  drawHills(c, 0, stage.palette);
  drawGround(c, [], 0, stage.palette);
  // วางสิ่งกีดขวางสองชิ้นให้เห็นว่าธีมนี้หน้าตาแบบไหน
  drawObstacles(c, [
    { x: 300, y: 320 - 38, w: 32, h: 38, kind: 'spike' },
    { x: 600, y: 320 - 88, w: 46, h: 88, rows: 2, kind: 'crate' },
  ], 0, stage.theme);
}

function refreshHome() {
  const s = getSkin();
  const st = getStage();
  document.getElementById('skinName').textContent = s.name;
  document.getElementById('stageName').textContent = st.name;
  document.getElementById('homeBest').textContent = game.best.toLocaleString('en-US');
  paintMini(document.getElementById('skinIcon'), 76, (c) => drawCatFace(c, 38, 44, 1.8, s));
  paintStageScene(document.getElementById('stageIcon'), st, 210);
}

function buildStageGrid() {
  const grid = document.getElementById('stageGrid');
  grid.innerHTML = '';

  for (const st of STAGES) {
    const on = st.id === getStage().id;

    const card = document.createElement('button');
    card.className = 'stage-card' + (on ? ' on' : '');
    card.innerHTML =
      '<canvas></canvas>' +
      '<span class="row"><b></b><small></small></span>' +
      '<span class="best">สถิติ <b></b></span>';
    card.querySelector('b').textContent = st.name;
    card.querySelector('small').textContent = on ? 'กำลังเล่น' : st.note;
    card.querySelector('.best b').textContent = loadBest(st.id).toLocaleString('en-US');
    paintStageScene(card.querySelector('canvas'), st, 232);

    card.addEventListener('click', () => {
      if (st.id === getStage().id) return showStages(false);
      setStage(st.id);
      unlockAudio();
      sfx.potion();
      game.reset();     // โหลดจานสีกับเส้นทางของด่านใหม่ ฉากหน้าแรกเปลี่ยนตามทันที
      buildStageGrid();
      refreshHome();
    });

    grid.appendChild(card);
  }
}

function showStages(on) {
  stagePanel.classList.toggle('hidden', !on);
  startPanel.classList.toggle('hidden', on);
}

function buildSkinGrid() {
  const grid = document.getElementById('skinGrid');
  grid.innerHTML = '';

  for (const s of SKINS) {
    const on = s.id === getSkin().id;

    const card = document.createElement('button');
    card.className = 'skin-card' + (on ? ' on' : '');
    card.innerHTML = '<canvas width="96" height="96"></canvas><b></b><small></small>';
    card.querySelector('b').textContent = s.name;
    card.querySelector('small').textContent = on ? 'กำลังใช้' : s.note;

    // t=60 ไม่ใช่ 0 เพราะที่ t=0 แมวกำลังหลับตาพอดี รูปตัวอย่างจะดูเหมือนหลับ
    paintMini(card.querySelector('canvas'), 96, (c) => drawCatPose(c, 55, 88, 1.5, s, 60));

    card.addEventListener('click', () => {
      if (s.id === getSkin().id) return showSkins(false);
      setSkin(s.id);
      unlockAudio();
      sfx.fish();
      buildSkinGrid();
      refreshHome();
    });

    grid.appendChild(card);
  }
}

function showSkins(on) {
  skinPanel.classList.toggle('hidden', !on);
  startPanel.classList.toggle('hidden', on);
}

function goHome() {
  game.reset();   // กลับสู่สถานะ READY ฉากหน้าแรกจึงถูกวาดแทนฉากเล่น
  overPanel.classList.add('hidden');
  pausePanel.classList.add('hidden');
  skinPanel.classList.add('hidden');
  stagePanel.classList.add('hidden');
  startPanel.classList.remove('hidden');
  // คืนปุ่มบนแถบหัวเรื่องให้ตรงกับสถานะจริง ไม่งั้นถ้าเลิกเล่นตอนหยุดอยู่
  // ปุ่มจะค้างเป็น "▶ เล่นต่อ" ทั้งที่ไม่มีรอบเล่นให้เล่นต่อแล้ว
  pauseBtn.textContent = '⏸';
  pauseBtn.setAttribute('aria-label', 'หยุดชั่วคราว');
  refreshHome();
}

document.getElementById('btnSkins').addEventListener('click', () => {
  // แตะเมนูก็นับเป็น gesture แล้ว เพลงหน้าแรกจึงเริ่มได้โดยไม่ต้องกดเริ่มวิ่งก่อน
  unlockAudio(); startMusic();
  buildSkinGrid();
  showSkins(true);
});
document.getElementById('skinBack').addEventListener('click', () => showSkins(false));
document.getElementById('btnStages').addEventListener('click', () => {
  unlockAudio(); startMusic();
  buildStageGrid();
  showStages(true);
});
document.getElementById('stageBack').addEventListener('click', () => showStages(false));
document.getElementById('homeBtn').addEventListener('click', goHome);

// เลิกเล่นกลางคัน: เก็บสถิติก่อน แล้วค่อยทิ้งรอบเล่น
document.getElementById('quitBtn').addEventListener('click', () => {
  game.bankBest();
  goHome();
});

refreshHome();

function showGameOver() {
  document.getElementById('finalScore').textContent = game.score.toLocaleString('en-US');
  document.getElementById('finalDist').textContent =
    Math.floor(game.distance / SCORING.pxPerMeter) + ' ม.';
  document.getElementById('bestScore').textContent = game.best.toLocaleString('en-US');
  document.getElementById('overTitle').textContent =
    game.score >= game.best && game.score > 0 ? 'สถิติใหม่!' : 'หมดแรงแล้ว';
  overPanel.classList.remove('hidden');
}

function startRun() {
  unlockAudio();   // ต้องเรียกตอนผู้ใช้กดปุ่ม ไม่งั้นเบราว์เซอร์บล็อกเสียง
  startMusic();    // ต้องอยู่หลัง unlockAudio เพราะ context ยังถูกระงับอยู่ก่อนหน้านั้น
  game.start();
  startPanel.classList.add('hidden');
  overPanel.classList.add('hidden');
  pausePanel.classList.add('hidden');
  skinPanel.classList.add('hidden');
  stagePanel.classList.add('hidden');
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
  if (game.state === STATE.RUN) return game.jump();
  // อยู่ในหน้าเลือกตัวละคร: กด Space ต้องไม่กระโดดข้ามไปเริ่มเกม
  if (!skinPanel.classList.contains('hidden')) return;
  if (!stagePanel.classList.contains('hidden')) return;
  if (game.state === STATE.READY) startRun();
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
  setMusicMuted(muted);   // เสียงเอฟเฟกต์เช็ค flag เอง แต่เพลงต้องสั่งหรี่โดยตรง
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

// ช่องสำหรับเครื่องมือตอนพัฒนา เช่นสคริปต์วาดแผนที่ด่านทั้งด่าน
// Vite ตัดทิ้งทั้งบรรทัดตอน build จริง ไม่หลุดไปอยู่ใน bundle
if (import.meta.env.DEV) window.__game = game;

requestAnimationFrame(loop);
game.draw(ctx);
