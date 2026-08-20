// src/main.js
import './style.css';
import { VIEW, SCORING } from './config.js';
import { Game, STATE } from './game.js';
import { setupInput } from './input.js';
import { unlockAudio, getVolume, setVolume, sfx } from './audio.js';
import { startMusic } from './music.js';
import { SKINS, getSkin, setSkin } from './skins.js';
import { STAGES, getStage, setStage } from './stages.js';
import { RARITY, wearable, setOutfit, pullPool, ownedCount } from './outfits.js';
import { getGold, pull, MULTI_PULLS, GOLD_RATE, DUPE_REFUND } from './gacha.js';
import { loadBest } from './storage.js';
import { drawCatPose, drawCatFace, drawObstacles } from './render/entities.js';
import { drawSky, drawHills, drawGround } from './render/background.js';
import { setupDebug } from './debug.js';   // แผงปุ่มทดสอบชั่วคราว ลบได้ทั้งบรรทัด

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
const outfitPanel = document.getElementById('outfitPanel');
const gachaPanel = document.getElementById('gachaPanel');
const rankPanel = document.getElementById('rankPanel');
const settingsPanel = document.getElementById('settingsPanel');
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
  document.getElementById('outfitName').textContent = s.outfit.name;
  document.getElementById('stageName').textContent = st.name;
  paintMini(document.getElementById('skinIcon'), 76, (c) => drawCatFace(c, 38, 44, 1.8, s));
  // ไอคอนชุดใช้ตัวเต็ม ไม่ใช่แค่หัว เพราะเสื้อกับกระโปรงอยู่ที่ลำตัว
  paintMini(document.getElementById('outfitIcon'), 76, (c) => drawCatPose(c, 38, 68, 1.05, s, 60));
  paintStageScene(document.getElementById('stageIcon'), st, 210);
  paintMini(document.getElementById('rankIcon'), 76, drawTrophy);
  paintBox(document.getElementById('gachaIcon'), 76, 76, (c) => {
    c.save(); c.scale(76 / 150, 76 / 170); drawGachaMachine(c); c.restore();
  });
  // ทองย้ายไปอยู่แถบบนแล้ว ป้ายตรงนี้บอกความคืบหน้าแทนจะมีประโยชน์กว่า
  document.getElementById('gachaSub').textContent =
    'ปลดล็อก ' + ownedCount() + '/' + pullPool().length;
  refreshGold();
}

/** แถบทองบนสุดกับตัวเลขในพาเนลกาช่า อัปเดตพร้อมกันจากที่เดียว */
function refreshGold() {
  const text = getGold().toLocaleString('en-US');
  document.getElementById('goldTop').textContent = text;
  document.getElementById('goldAmount').textContent = text;
}

// ── ตู้กาช่า ───────────────────────────────────────────────

/** เหมือน paintMini แต่ไม่บังคับสี่เหลี่ยมจัตุรัส ตู้กาช่าเป็นทรงสูง */
function paintBox(canvas, w, h, draw) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  draw(c);
}

const CAPSULE_COLORS = ['#FF7FAE', '#FFC93C', '#8FE8FF', '#9DE86F', '#C77DFF', '#FF8A5C'];

// ตู้วาดในพิกัด 150x170 เสมอ แล้วค่อยขยายที่ ctx
// พิกัดทุกจุดในฟังก์ชันวาดจึงไม่ต้องแก้ตามขนาดที่แสดงจริง
const MACHINE_W = 200;
const MACHINE_H = 226;

// ── สถานะแอนิเมชันเปิดกาช่า ────────────────────────────────
// pullProgress เดินจาก 0 ถึง 1 ตลอดช่วงเปิด แล้วค้างที่ 0 ตอนไม่ได้สุ่ม
// เก็บผลไว้ใน pending ก่อน ค่อยโชว์ตอนแคปซูลแตก — ไม่งั้นเห็นของก่อนเปิด
// ซึ่งทำให้แอนิเมชันไม่มีความหมาย
const PULL_FRAMES = 62;
let gachaShake = 0;
let pullProgress = 0;
let pullPending = null;
let spinT = 0;

/**
 * ตู้กาช่าหน้าตาแมว ๆ วาดในกรอบ 150x170
 * shake 0-1 = แรงสั่นตอนเพิ่งกดสุ่ม ลดลงเองทุกเฟรม
 */
function drawGachaMachine(c, t = 0, shake = 0, anim = 0) {
  const cx = 75;
  c.save();
  if (shake > 0) {
    c.translate((Math.random() - 0.5) * shake * 8, (Math.random() - 0.5) * shake * 6);
  }

  // หูแมวบนโดม วาดก่อนโดมเพื่อให้โคนหูถูกกลบ
  for (const dir of [-1, 1]) {
    c.fillStyle = '#F2913D';
    c.beginPath();
    c.moveTo(cx + dir * 20, 34); c.lineTo(cx + dir * 34, 6); c.lineTo(cx + dir * 41, 36);
    c.closePath(); c.fill();
    c.fillStyle = '#FF9BB0';
    c.beginPath();
    c.moveTo(cx + dir * 25, 31); c.lineTo(cx + dir * 33, 15); c.lineTo(cx + dir * 36.5, 32);
    c.closePath(); c.fill();
  }

  // โดมแก้ว
  c.fillStyle = 'rgba(190,235,255,.25)';
  c.beginPath(); c.arc(cx, 62, 44, 0, Math.PI * 2); c.fill();

  // แคปซูลข้างใน ลอยหมุนช้า ๆ
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + t * 0.014;
    const rad = 11 + (i % 3) * 11;
    const bx = cx + Math.cos(a) * rad;
    const by = 62 + Math.sin(a) * rad * 0.82 + Math.sin(t * 0.05 + i) * 2;
    c.fillStyle = CAPSULE_COLORS[i % CAPSULE_COLORS.length];
    c.beginPath(); c.arc(bx, by, 7.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)';
    c.beginPath(); c.arc(bx - 2.4, by - 2.7, 2.2, 0, Math.PI * 2); c.fill();
  }

  // ขอบโดมกับแสงสะท้อน วาดทับแคปซูลให้ดูเหมือนอยู่หลังกระจก
  c.strokeStyle = 'rgba(255,243,226,.5)';
  c.lineWidth = 2.5;
  c.beginPath(); c.arc(cx, 62, 44, 0, Math.PI * 2); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.2)';
  c.beginPath(); c.ellipse(cx - 17, 45, 11, 18, -0.5, 0, Math.PI * 2); c.fill();

  // ตัวตู้
  c.fillStyle = '#E8637F';
  c.beginPath(); c.roundRect(cx - 46, 99, 92, 64, 14); c.fill();
  c.fillStyle = 'rgba(255,255,255,.16)';
  c.beginPath(); c.roundRect(cx - 46, 99, 92, 8, 6); c.fill();

  // ช่องรับของ
  c.fillStyle = '#5A1B2E';
  c.beginPath(); c.roundRect(cx - 20, 132, 40, 24, 8); c.fill();

  // ปุ่มหมุน เข็มหมุนตามเวลาและสะบัดแรงตอนสั่น
  c.fillStyle = '#FFD97A';
  c.beginPath(); c.arc(cx, 118, 10.5, 0, Math.PI * 2); c.fill();
  c.save();
  c.translate(cx, 118);
  c.rotate(t * 0.02 + shake * 7);
  c.strokeStyle = '#A9701A';
  c.lineWidth = 3.4;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); c.stroke();
  c.restore();

  // หัวใจสองข้าง
  c.fillStyle = 'rgba(255,255,255,.45)';
  for (const dx of [-33, 33]) {
    c.beginPath();
    c.arc(cx + dx - 2.7, 116, 2.9, 0, Math.PI * 2);
    c.arc(cx + dx + 2.7, 116, 2.9, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(cx + dx - 5.4, 117.6); c.lineTo(cx + dx, 124); c.lineTo(cx + dx + 5.4, 117.6);
    c.closePath(); c.fill();
  }

  if (anim > 0) drawCapsuleDrop(c, cx, anim);

  c.restore();
}

/** แคปซูลหนึ่งลูก split 0 = ปิดสนิท 1 = สองซีกแยกจากกันสุด */
function drawCapsule(c, x, y, r, split) {
  const gap = split * 10;
  c.fillStyle = '#FFC93C';
  c.beginPath(); c.arc(x, y - gap, r, Math.PI, 0); c.fill();
  c.fillStyle = '#FF7FAE';
  c.beginPath(); c.arc(x, y + gap, r, 0, Math.PI); c.fill();
  if (split < 0.25) {
    c.fillStyle = 'rgba(255,255,255,.6)';
    c.beginPath(); c.arc(x - r * 0.32, y - r * 0.38, r * 0.28, 0, Math.PI * 2); c.fill();
  }
}

/**
 * ไทม์ไลน์การเปิด p = 0 ถึง 1
 *   0.00-0.34 ยังไม่โผล่ ตู้กำลังหมุนปั่นแคปซูลอยู่ข้างบน
 *   0.34-0.70 แคปซูลหล่นลงช่อง เร่งความเร็วแบบของตกจริง (k กำลังสอง)
 *   0.70-1.00 ฝาแยกออก พร้อมวงแสงระเบิดกับประกายกระจาย
 */
function drawCapsuleDrop(c, cx, p) {
  if (p < 0.34) return;

  if (p < 0.7) {
    const k = (p - 0.34) / 0.36;
    drawCapsule(c, cx, 96 + k * k * 48, 9, 0);
    return;
  }

  const k = (p - 0.7) / 0.3;
  drawCapsule(c, cx, 144, 9, k);

  c.save();
  c.globalAlpha = (1 - k) * 0.9;
  c.strokeStyle = '#FFF6D8';
  c.lineWidth = 3.5 * (1 - k) + 1;
  c.beginPath(); c.arc(cx, 144, 9 + k * 42, 0, Math.PI * 2); c.stroke();

  c.fillStyle = '#FFE9A8';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    const rad = 10 + k * 34;
    const sr = (1 - k) * 3.2;
    c.beginPath();
    c.arc(cx + Math.cos(a) * rad, 144 + Math.sin(a) * rad * 0.7, sr, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

const pct = (n) => Math.round(n * 100) + '%';

function refreshGacha() {
  const gold = getGold();
  refreshGold();
  document.getElementById('ownedCount').textContent = ownedCount();
  document.getElementById('totalCount').textContent = pullPool().length;

  // สร้างจากค่าจริงเสมอ ไม่เขียนตัวเลขค้างไว้ใน HTML
  // ไม่งั้นวันที่แก้อัตราแล้วลืมแก้ข้อความ ผู้เล่นจะโดนบอกอัตราผิด
  document.getElementById('gachaOdds').innerHTML =
    '<span class="hi">ระดับสูง ' + pct(RARITY.high.rate) + '</span><br>' +
    'ระดับกลาง ' + pct(RARITY.normal.rate) + '<br>' +
    'เหรียญทอง ' + pct(GOLD_RATE);

  document.getElementById('pull1').disabled = gold < 5000;
  document.getElementById('pull5').disabled = gold < 5000 * MULTI_PULLS;
}

/** การ์ดผลสุ่ม — ชุดใส่ได้ทุกสีขน จึงพรีวิวบนแมวตัวที่เลือกอยู่ */
function showPullResults(results) {
  const box = document.getElementById('gachaResult');
  box.innerHTML = '';

  for (const r of results) {
    const card = document.createElement('div');

    if (r.kind === 'gold') {
      card.className = 'got-card gold';
      card.innerHTML =
        '<span class="coin big" aria-hidden="true"></span><b></b><small></small>';
      card.querySelector('b').textContent = '+' + r.gold.toLocaleString('en-US');
      const tag = card.querySelector('small');
      tag.textContent = 'เหรียญทอง';
      tag.style.color = '#B99BD4';
    } else {
      const o = r.outfit;
      const tier = RARITY[o.rarity];

      card.className =
        'got-card' + (o.rarity === 'high' ? ' high' : '') + (r.isNew ? '' : ' dupe');
      card.innerHTML = '<canvas width="56" height="56"></canvas><b></b><small></small>';
      card.querySelector('b').textContent = o.name;

      const tag = card.querySelector('small');
      tag.textContent = r.isNew ? tier.name : 'ซ้ำ +' + DUPE_REFUND.toLocaleString('en-US');
      tag.style.color = r.isNew ? tier.color : '#B99BD4';

      paintMini(card.querySelector('canvas'), 56,
        (c) => drawCatPose(c, 30, 52, 0.82, { ...getSkin(), outfit: o }, 60));
    }

    // เหลื่อมกันทีละใบ ใบระดับสูงจะได้มีจังหวะให้สังเกตเห็นว่าเรืองแสง
    card.style.setProperty('--d', (box.children.length * 0.11).toFixed(2) + 's');
    box.appendChild(card);
  }
}

function doPull(times) {
  if (pullProgress > 0) return;   // กันกดรัวระหว่างแอนิเมชันยังไม่จบ

  const res = pull(times);
  if (!res.ok) return;

  unlockAudio();
  sfx.potion();                   // เสียงตอนหมุนตู้ เสียงของรางวัลมาทีหลัง
  gachaShake = 1;
  pullProgress = 0.0001;          // ต้องมากกว่า 0 ให้ลูปรู้ว่ากำลังเปิดอยู่
  pullPending = res.results;

  document.getElementById('gachaResult').innerHTML = '';
  refreshGacha();
  refreshHome();
}

/** เรียกตอนแคปซูลแตกพอดี — เสียงกับการ์ดจึงมาพร้อมกับภาพ */
function revealPull() {
  const results = pullPending;
  pullPending = null;
  if (!results) return;

  // ได้ของระดับสูงอย่างน้อยหนึ่งชิ้น = เสียงใหญ่ ไม่งั้นเสียงเก็บของธรรมดา
  if (results.some((r) => r.kind === 'outfit' && r.outfit.rarity === 'high')) sfx.bonus();
  else sfx.kibble();

  showPullResults(results);
  // เก็บประวัติขึ้นคลาวด์ถ้าต่ออยู่ — ล้มเหลวก็ไม่กระทบการเล่น
  import('./net/sync.js').then((m) => m.recordPulls(results)).catch(() => {});
  // ทองที่เพิ่งได้ต้องขึ้นแถบบนทันทีพร้อมการ์ด ไม่ใช่รอเปิดพาเนลใหม่
  refreshGacha();
  refreshHome();
}

function showGacha(on) {
  gachaPanel.classList.toggle('hidden', !on);
  startPanel.classList.toggle('hidden', on);
  if (on) {
    document.getElementById('gachaResult').innerHTML = '';
    refreshGacha();
  } else {
    // ปิดพาเนลกลางแอนิเมชัน: ล้างสถานะทิ้ง ไม่งั้นเปิดกลับมาเจอผลเก่าเด้งขึ้นเอง
    // ของที่สุ่มได้ถูกบันทึกไปตั้งแต่ตอนกดแล้ว จึงไม่มีอะไรหาย
    pullProgress = 0;
    pullPending = null;
    gachaShake = 0;
  }
}

/** ถ้วยรางวัลบนแท่นสามขั้น ใช้เป็นไอคอนปุ่มอันดับ */
function drawTrophy(c) {
  c.fillStyle = '#FFC93C';
  // ตัวถ้วย
  c.beginPath();
  c.moveTo(26, 16);
  c.lineTo(50, 16);
  c.quadraticCurveTo(48, 42, 38, 44);
  c.quadraticCurveTo(28, 42, 26, 16);
  c.fill();
  // หูจับสองข้าง
  c.strokeStyle = '#FFC93C';
  c.lineWidth = 3.4;
  c.beginPath(); c.arc(24, 23, 7, Math.PI * 0.55, Math.PI * 1.5); c.stroke();
  c.beginPath(); c.arc(52, 23, 7, Math.PI * 1.5, Math.PI * 0.45); c.stroke();
  // ก้านกับฐาน
  c.fillStyle = '#E0A82A';
  c.fillRect(35, 43, 6, 8);
  c.beginPath(); c.roundRect(28, 50, 20, 5, 2); c.fill();
  // แท่นสามขั้น บอกว่าเป็นเรื่องอันดับไม่ใช่แค่รางวัล
  c.fillStyle = 'rgba(255,243,226,.5)';
  c.beginPath(); c.roundRect(12, 62, 16, 8, 2); c.fill();
  c.fillStyle = 'rgba(255,243,226,.8)';
  c.beginPath(); c.roundRect(30, 57, 16, 13, 2); c.fill();
  c.fillStyle = 'rgba(255,243,226,.35)';
  c.beginPath(); c.roundRect(48, 65, 16, 5, 2); c.fill();
}

// ── กระดานคะแนน ────────────────────────────────────────────

function rankNote(html) {
  document.getElementById('rankList').innerHTML =
    '<p class="rank-note">' + html + '</p>';
}

async function buildRank() {
  const st = getStage();
  document.getElementById('rankStage').textContent = st.name;
  rankNote('กำลังโหลด…');

  // นำเข้าแบบไดนามิก ไม่งั้น SDK ของ Supabase จะถูกมัดรวมมากับตัวเกม
  // ทั้งที่คนไม่เปิดหน้านี้ก็ต้องโหลด
  let mod;
  try {
    mod = await import('./net/cloud.js');
  } catch {
    rankNote('โหลดระบบอันดับไม่สำเร็จ');
    return;
  }

  if (!mod.cloudReady) {
    rankNote('ยังไม่ได้ต่อฐานข้อมูล<br>สถิติเก็บอยู่ในเครื่องนี้เท่านั้น');
    return;
  }

  const rows = await mod.fetchLeaderboard(st.id, 20);
  if (!rows.length) {
    rankNote('ยังไม่มีใครทำคะแนนในด่านนี้<br>ไปเป็นคนแรกกันเถอะ!');
    return;
  }

  const list = document.getElementById('rankList');
  list.innerHTML = '';
  rows.forEach((r, i) => {
    const row = document.createElement('div');
    row.className = 'rank-row' + (i < 3 ? ' top' + (i + 1) : '');
    row.innerHTML = '<span class="no"></span><span class="who"></span><span class="pts"></span>';
    row.querySelector('.no').textContent = i + 1;
    row.querySelector('.who').textContent = r.name || 'แมวนิรนาม';
    row.querySelector('.pts').textContent = Number(r.score).toLocaleString('en-US');
    list.appendChild(row);
  });
}

const NAME_KEY = 'cookie-runner:name';

/** ชื่อที่โชว์บนกระดาน เก็บสำเนาไว้ในเครื่องด้วย จะได้เติมช่องได้ทันทีไม่ต้องรอเน็ต */
function localName() {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
}

async function saveName() {
  const input = document.getElementById('rankName');
  const name = input.value.trim().slice(0, 16);
  if (!name) return;

  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* เซฟในเครื่องไม่ได้ก็ยังส่งขึ้นคลาวด์ได้ */
  }

  const btn = document.getElementById('rankSave');
  btn.disabled = true;
  try {
    const { pushName } = await import('./net/cloud.js');
    await pushName(name);
    await buildRank();       // อันดับต้องโชว์ชื่อใหม่ทันที ไม่ต้องกดกลับแล้วเข้าใหม่
  } catch {
    /* ต่อไม่ได้ก็ยังเก็บชื่อไว้ในเครื่อง เดี๋ยวคราวหน้าค่อยส่ง */
  }
  btn.disabled = false;
}

// ── ตั้งค่า ────────────────────────────────────────────────

const VOL_STEP = 0.1;

function drawVolume() {
  const v = getVolume();
  const lit = Math.round(v * 10);

  const bar = document.getElementById('volBar');
  if (bar.children.length !== 10) {
    bar.innerHTML = '<i></i>'.repeat(10);
  }
  [...bar.children].forEach((el, i) => el.classList.toggle('on', i < lit));

  document.getElementById('volNum').textContent = Math.round(v * 100) + '%';
  // ปิดปุ่มที่กดไปก็ไม่มีอะไรเกิดขึ้น ดีกว่าปล่อยให้กดแล้วเงียบไม่รู้ว่าสุดแล้ว
  document.getElementById('volDown').disabled = v <= 0;
  document.getElementById('volUp').disabled = v >= 1;
}

function stepVolume(dir) {
  setVolume(getVolume() + dir * VOL_STEP);
  drawVolume();
  // ให้ได้ยินระดับใหม่ทันทีตอนกด ไม่ต้องออกไปลองในเกมแล้วค่อยกลับมาปรับ
  sfx.fish();
}

// จำว่าเปิดมาจากแผงไหน แล้วคืนกลับไปที่เดิมตอนกดกลับ
// เข้าได้ทั้งจากหน้าแรกและจากหน้าหยุดชั่วคราวกลางรอบเล่น ซึ่งคนละที่กัน
let settingsFrom = [];

function showSettings(on) {
  if (on) {
    settingsFrom = [...document.querySelectorAll('.panel:not(.hidden)')];
    settingsFrom.forEach((p) => p.classList.add('hidden'));
    settingsPanel.classList.remove('hidden');
    drawVolume();
  } else {
    settingsPanel.classList.add('hidden');
    settingsFrom.forEach((p) => p.classList.remove('hidden'));
    settingsFrom = [];
  }
}

function showRank(on) {
  rankPanel.classList.toggle('hidden', !on);
  startPanel.classList.toggle('hidden', on);
  if (on) {
    document.getElementById('rankName').value = localName();
    buildRank();
  }
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

// ชุดที่กดเลือกไว้แต่ยังไม่กดยืนยัน — null = ยังไม่ได้เปิดหน้านี้
let pendingOutfit = null;

function buildOutfitGrid() {
  const grid = document.getElementById('outfitGrid');
  grid.innerHTML = '';

  const s = getSkin();
  if (pendingOutfit === null) pendingOutfit = s.outfit.id;

  for (const o of wearable()) {
    const on = o.id === pendingOutfit;

    const card = document.createElement('button');
    card.className =
      'skin-card' + (on ? ' on' : '') + (o.rarity === 'high' ? ' high' : '');
    card.innerHTML = '<canvas width="96" height="96"></canvas><b></b><small></small>';
    card.querySelector('b').textContent = o.name;
    card.querySelector('small').textContent =
      on ? (o.id === s.outfit.id ? 'กำลังใส่' : 'เลือกไว้') : o.note;

    // "ขนล้วน" ไม่มีระดับ จึงไม่ติดป้าย
    if (o.rarity) {
      const badge = document.createElement('span');
      badge.className = 'tier-badge ' + o.rarity;
      badge.textContent = RARITY[o.rarity].name;
      card.appendChild(badge);
    }

    // วาดแมวตัวที่เลือกอยู่ใส่ชุดใบนี้จริง ๆ ไม่ใช่หุ่นกลาง
    paintMini(card.querySelector('canvas'), 96,
      (c) => drawCatPose(c, 55, 88, 1.5, { ...s, outfit: o }, 60));

    // กดการ์ดแค่ "เลือกไว้" ยังไม่เปลี่ยนจริง ต้องกดยืนยันอีกที
    // ผู้เล่นจึงลองไล่ดูได้ทั้งหน้าโดยไม่เผลอเปลี่ยนชุดที่ใส่อยู่ทิ้ง
    card.addEventListener('click', () => {
      if (pendingOutfit === o.id) return;
      pendingOutfit = o.id;
      unlockAudio();
      sfx.fish();
      buildOutfitGrid();
    });

    grid.appendChild(card);
  }
}

function showOutfits(on) {
  outfitPanel.classList.toggle('hidden', !on);
  startPanel.classList.toggle('hidden', on);
  // ล้างตัวเลือกค้างตอนปิด ไม่งั้นเปิดกลับมาเจอใบที่เคยกดไว้ยังไฮไลต์อยู่
  // ทั้งที่ตอนนั้นกดยกเลิกไปแล้ว
  if (!on) pendingOutfit = null;
}

function goHome() {
  game.reset();   // กลับสู่สถานะ READY ฉากหน้าแรกจึงถูกวาดแทนฉากเล่น
  overPanel.classList.add('hidden');
  pausePanel.classList.add('hidden');
  skinPanel.classList.add('hidden');
  stagePanel.classList.add('hidden');
  outfitPanel.classList.add('hidden');
  gachaPanel.classList.add('hidden');
  rankPanel.classList.add('hidden');
  settingsPanel.classList.add('hidden');
  settingsFrom = [];
  startPanel.classList.remove('hidden');
  // คืนปุ่มบนแถบในจอให้ตรงกับสถานะจริง ไม่งั้นถ้าเลิกเล่นตอนหยุดอยู่
  // ปุ่มจะค้างเป็นสามเหลี่ยม "เล่นต่อ" ทั้งที่ไม่มีรอบเล่นให้เล่นต่อแล้ว
  pauseBtn.classList.remove('playing');
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
document.getElementById('btnOutfits').addEventListener('click', () => {
  unlockAudio(); startMusic();
  pendingOutfit = getSkin().outfit.id;
  buildOutfitGrid();
  showOutfits(true);
});
document.getElementById('outfitApply').addEventListener('click', () => {
  if (!pendingOutfit) return showOutfits(false);   // กันเคสกดยืนยันทั้งที่ยังไม่ได้เลือกอะไร
  setOutfit(pendingOutfit);
  refreshHome();
  showOutfits(false);
});
document.getElementById('outfitBack').addEventListener('click', () => showOutfits(false));
document.getElementById('btnGacha').addEventListener('click', () => {
  unlockAudio(); startMusic();
  showGacha(true);
});
document.getElementById('gachaBack').addEventListener('click', () => showGacha(false));
document.getElementById('btnRank').addEventListener('click', () => {
  unlockAudio(); startMusic();
  showRank(true);
});
document.getElementById('rankBack').addEventListener('click', () => showRank(false));
document.getElementById('rankSave').addEventListener('click', saveName);
document.getElementById('rankName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveName();
  e.stopPropagation();   // กันไม่ให้ปุ่ม Space/ลูกศรตอนพิมพ์ไปสั่งกระโดด
});
document.getElementById('pull1').addEventListener('click', () => doPull(1));
document.getElementById('pull5').addEventListener('click', () => doPull(MULTI_PULLS));
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
  outfitPanel.classList.add('hidden');
  gachaPanel.classList.add('hidden');
  rankPanel.classList.add('hidden');
  settingsPanel.classList.add('hidden');
  settingsFrom = [];
  pauseBtn.classList.remove('playing');
}

// ── หยุด / เล่นต่อ ─────────────────────────────────────────

function setPaused(on) {
  // pause()/resume() คืน false ถ้าสถานะไม่เข้าเงื่อนไข เช่นกด Esc ตอนตายอยู่
  // เช็คก่อนแตะ UI ไม่งั้นพาเนลกับสถานะเกมจะหลุดจากกัน
  if (on ? !game.pause() : !game.resume()) return;
  pausePanel.classList.toggle('hidden', !on);
  pauseBtn.classList.toggle('playing', on);
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
  if (!outfitPanel.classList.contains('hidden')) return;
  if (!gachaPanel.classList.contains('hidden')) return;
  if (!rankPanel.classList.contains('hidden')) return;
  if (!settingsPanel.classList.contains('hidden')) return;
  if (game.state === STATE.READY) startRun();
  else if (!overPanel.classList.contains('hidden')) startRun();
}

setupInput(document.getElementById('stage'), {
  onConfirm: confirm,
  onSlideStart: () => game.setSlide(true),
  onSlideEnd: () => game.setSlide(false),
  onTogglePause: () => setPaused(game.state === STATE.RUN),
});

const root = document.documentElement;

// ── เต็มจอ + ล็อกแนวนอนอัตโนมัติ ─────────────────────────────
//
// ปุ่มเต็มจอถูกถอดออกแล้ว เกมพาตัวเองเข้าเต็มจอให้เลย แต่เบราว์เซอร์ทุกตัว
// ยอมให้สั่งเต็มจอได้เฉพาะในจังหวะที่ผู้เล่นเพิ่งแตะจอเท่านั้น สั่งตอนโหลดหน้า
// จะถูกปฏิเสธทุกครั้ง จึงต้องผูกไว้กับการแตะแทน
//
// ไม่ตั้งธง "ทำไปแล้ว" ค้างไว้ เพราะครั้งแรกอาจไม่สำเร็จ (ผู้ใช้กดปฏิเสธ หรือ
// แตะโดนตรงที่เบราว์เซอร์ไม่นับเป็น gesture) ปล่อยให้ลองใหม่ทุกครั้งที่ยังไม่
// เต็มจอ ซึ่งราคาถูกมากเพราะ isFull() ตัดจบให้ตั้งแต่บรรทัดแรก
const coarse = window.matchMedia('(hover: none) and (pointer: coarse)');
const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

async function goImmersive() {
  if (!coarse.matches) return;   // บนคอมย่อ/ขยายหน้าต่างเองได้อยู่แล้ว

  if (!isFull()) {
    // Safari รุ่นเก่ายังใช้ชื่อแบบมี webkit นำหน้า
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!req) return;            // iPhone ไม่มี API นี้เลย ป้ายขอให้หมุนจอรับช่วงต่อ
    try {
      await req.call(root);
    } catch {
      return;                    // ยังไม่ได้ ไว้แตะครั้งหน้าค่อยลองใหม่
    }
  }

  // ล็อกแนวจอทำได้เฉพาะตอนอยู่เต็มจอแล้ว และมีแต่ Android ที่รองรับจริง
  try {
    await screen.orientation?.lock?.('landscape');
  } catch {
    /* iOS ไม่รองรับ / เครื่องล็อกแนวจอไว้เอง — ป้ายขอให้หมุนจอรับช่วงต่อ */
  }
}

document.addEventListener('pointerdown', goImmersive);

document.getElementById('startBtn').addEventListener('click', startRun);
document.getElementById('retryBtn').addEventListener('click', startRun);

// ปุ่มปิด/เปิดเสียง
document.getElementById('btnSettings').addEventListener('click', () => {
  unlockAudio(); startMusic();
  showSettings(true);
});
document.getElementById('settingsBack').addEventListener('click', () => showSettings(false));
document.getElementById('volDown').addEventListener('click', () => stepVolume(-1));
document.getElementById('volUp').addEventListener('click', () => stepVolume(1));

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

  // ตู้กาช่าวาดใหม่เฉพาะตอนเปิดพาเนลอยู่ ไม่ต้องเสียเฟรมทิ้งตอนเล่นเกม
  if (!gachaPanel.classList.contains('hidden')) {
    // เร่งการหมุนตอนกำลังเปิด แต่สะสมต่อจากค่าเดิม ไม่ใช่คูณเวลาจริง
    // ไม่งั้นเฟสจะกระโดดตอนเริ่มและจบแอนิเมชัน
    spinT += dt * (pullProgress > 0 ? 4.5 : 1);
    gachaShake = Math.max(0, gachaShake - 0.05 * dt);

    if (pullProgress > 0) {
      pullProgress += dt / PULL_FRAMES;
      // แตกที่ 0.7 ตรงกับจังหวะฝาแยกใน drawCapsuleDrop
      if (pullPending && pullProgress >= 0.7) revealPull();
      if (pullProgress >= 1) pullProgress = 0;
    }

    paintBox(document.getElementById('gachaMachine'), MACHINE_W, MACHINE_H, (c) => {
      c.scale(MACHINE_W / 150, MACHINE_H / 170);
      drawGachaMachine(c, spinT, gachaShake, pullProgress);
    });
  }

  requestAnimationFrame(loop);
}

// ช่องสำหรับเครื่องมือตอนพัฒนา เช่นสคริปต์วาดแผนที่ด่านทั้งด่าน
// Vite ตัดทิ้งทั้งบรรทัดตอน build จริง ไม่หลุดไปอยู่ใน bundle
if (import.meta.env.DEV) window.__game = game;

setupDebug(game);   // แผงปุ่มทดสอบชั่วคราว ลบได้ทั้งบรรทัด

requestAnimationFrame(loop);
game.draw(ctx);
