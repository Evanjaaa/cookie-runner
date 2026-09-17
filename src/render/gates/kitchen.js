// src/render/gates/kitchen.js
// ─────────────────────────────────────────────────────────────
// ภาพทางเข้า "ครัวกลางคืน" — ร้านขนมหลังใหญ่ที่แมววิ่งทะลุเข้าไปจริง
//
// แบ่งเป็นสองชั้นตามลำดับวาดของเกม:
//   back  (หลังพื้น ก่อนของกิน/ตัวแมว)  ชานหน้าร้าน · ข้างในร้าน · ผนังหน้าร้าน · ไอน้ำ
//   front (หลังตัวแมว)                  เสาประตู · บานประตูสวิง · โคมไฟห้อย · ทัพพีห้อย
// ชั้นหน้าคือสิ่งที่ทำให้รู้สึก "เข้าไปข้างใน" — แมววิ่งลอดเสาประตูและอยู่ใต้โคมไฟจริง
//
// ภาพทั้งหมดเป็น Canvas primitive ไม่มีไฟล์รูป ของที่ไล่สีแพง (แสงเรือง/กรวยแสง/ไอน้ำ)
// ทำเป็นสไปรต์แคชครั้งเดียวแล้วแปะซ้ำ (warmKitchenArt) ไอน้ำใช้ชุดอนุภาคขนาดคงที่ ไม่สร้าง/ทิ้งทุกเฟรม
//
// สีทั้งหมดเป็นของตัวอาคารเอง ไม่อ่านจานสีของฉาก — ฉากถูกสลับตอนแมวอยู่ข้างใน
// ถ้าข้างในร้านใช้สีฉาก จะเห็นสีร้านเปลี่ยนวูบตอนสลับ
// ─────────────────────────────────────────────────────────────
import { VIEW, GROUND_Y } from '../../config.js';

const { W, H } = VIEW;

const C = {
  wall: '#7A4466', wallLine: 'rgba(58,26,52,.35)', trim: '#FFE3B8', dark: '#4A2542', darkLite: '#6B3A5C',
  roof: '#C24D72', roofShade: '#98365A', chimney: '#5A3050',
  glow: '#FFC36B', glowDeep: '#FF8F4A',
  inWallTop: '#8E4A6C', inWallBot: '#B0647A', tileA: '#F7D9BC', tileB: '#EDC2A0',
  floor: '#6B3A4F', floorLip: '#F2B26B', floorSeam: 'rgba(40,16,32,.35)',
  wood: '#E0894A', woodLite: '#F2A866', woodDark: '#8A4526',
  steel: '#D8CBE6', steelDark: '#9C8BB3', night: '#3A1D50',
};

// ─────────────────────────────────────────────────────────────
// สไปรต์แคช
// ─────────────────────────────────────────────────────────────
const SPR = {};

function sprite(key, w, h, paint) {
  if (SPR[key]) return SPR[key];
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(w);
  cv.height = Math.ceil(h);
  paint(cv.getContext('2d'), w, h);
  SPR[key] = cv;
  return cv;
}

function glowBlob() {
  return sprite('glow', 128, 128, (g, w) => {
    const r = w / 2;
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, 'rgba(255,214,140,.95)');
    grad.addColorStop(0.35, 'rgba(255,170,90,.45)');
    grad.addColorStop(1, 'rgba(255,150,80,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, w);
  });
}

function lightCone() {
  return sprite('cone', 160, 240, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,220,150,.55)');
    grad.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(w * 0.42, 0);
    g.lineTo(w * 0.58, 0);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.closePath();
    g.fill();
  });
}

function puff() {
  return sprite('puff', 48, 48, (g, w) => {
    const r = w / 2;
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, 'rgba(255,248,240,.85)');
    grad.addColorStop(1, 'rgba(255,248,240,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, w);
  });
}

function tilePattern(ctx) {
  const cv = sprite('tiles', 44, 44, (g) => {
    g.fillStyle = C.tileA; g.fillRect(0, 0, 44, 44);
    g.fillStyle = C.tileB; g.fillRect(0, 0, 22, 22); g.fillRect(22, 22, 22, 22);
    g.strokeStyle = 'rgba(160,96,90,.35)'; g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, 43, 43); g.beginPath(); g.moveTo(22, 0); g.lineTo(22, 44); g.moveTo(0, 22); g.lineTo(44, 22); g.stroke();
  });
  if (!SPR.tilesPat) SPR.tilesPat = ctx.createPattern(cv, 'repeat');
  return SPR.tilesPat;
}

/**
 * สร้างสไปรต์ทั้งหมดล่วงหน้า — เรียกตอนตัดสินใจเปลี่ยนฉาก (ก่อนอาคารโผล่เข้าจอ)
 * ไม่ให้เฟรมแรกที่เห็นอาคารต้องแบกงานสร้างผ้าใบไล่สีหลายแผ่นพร้อมกัน
 */
export function warmKitchenArt(ctx) {
  glowBlob(); lightCone(); puff(); tilePattern(ctx); windowFill(70, 86); doorFill();
}

// ─────────────────────────────────────────────────────────────
// ไอน้ำ — ชุดอนุภาคขนาดคงที่ ใช้ซ้ำตลอด ไม่มีขยะให้ GC เก็บ
// ─────────────────────────────────────────────────────────────
const STEAM = Array.from({ length: 22 }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, r: 10 }));
let lastTick = -1;
let emitAcc = 0;

function stepSteam(tick, emitters) {
  const dt = lastTick < 0 ? 1 : Math.max(0, Math.min(3, tick - lastTick));
  lastTick = tick;
  for (const p of STEAM) {
    if (!p.on) continue;
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.r += 0.18 * dt;
    if (p.life >= p.max) p.on = false;
  }
  emitAcc += dt;
  while (emitAcc >= 7 && emitters.length) {
    emitAcc -= 7;
    const e = emitters[(tick | 0) % emitters.length];
    const p = STEAM.find((q) => !q.on);
    if (!p) break;
    p.on = true;
    p.x = e.x + (Math.random() - 0.5) * 18;
    p.y = e.y;
    p.vx = (Math.random() - 0.5) * 0.35;
    p.vy = -0.7 - Math.random() * 0.5;
    p.life = 0;
    p.max = 60 + Math.random() * 40;
    p.r = 8 + Math.random() * 6;
  }
}

function drawSteam(ctx, cam) {
  const img = puff();
  for (const p of STEAM) {
    if (!p.on) continue;
    const k = p.life / p.max;
    ctx.globalAlpha = 0.55 * Math.sin(Math.PI * k);
    ctx.drawImage(img, p.x - cam - p.r, p.y - p.r, p.r * 2, p.r * 2);
  }
  ctx.globalAlpha = 1;
}

// ─────────────────────────────────────────────────────────────
// ชั้นหลัง
// ─────────────────────────────────────────────────────────────
export function drawKitchenBack(ctx, v) {
  const { m, camera: cam, tick } = v;
  if (m.houseR + 80 - cam < 0 || m.houseL - 200 - cam > W) return;

  drawPorch(ctx, v);

  // ข้างในร้าน — ข้ามได้ถ้าผนังหน้า/หลังทึบเต็มอยู่แล้ว (ไม่ต้องวาดของที่มองไม่เห็น)
  // ชั้นที่แทบมองไม่เห็นแล้ว (โปร่งเกิน 90% หรือถูกบังเกิน 90%) ข้ามไปเลย — ช่วงผ่านประตูคือเฟรมที่หนักที่สุด
  const interiorShown = v.facadeIn < 0.9 && v.facadeOut < 0.9;
  if (interiorShown) drawInterior(ctx, v);

  if (v.facadeIn > 0.1) drawFacade(ctx, v, v.facadeIn);
  else if (v.facadeOut > 0.1) drawFacade(ctx, v, v.facadeOut);

  // ไอน้ำจากปล่องและหม้อ — เดินทุกเฟรมที่อาคารอยู่ในจอ
  const L = m.doorOut - m.doorIn;
  const emitters = interiorShown
    ? [{ x: m.doorIn + L * 0.62, y: 236 }, { x: m.doorIn + L * 0.36, y: 150 }]
    : [{ x: m.houseL + 440, y: 18 }];
  stepSteam(tick, emitters);
  drawSteam(ctx, cam);
}

/** ชานหน้าร้าน: แสงอุ่นจากประตูตกบนพื้น + กระสอบแป้ง/ลังวัตถุดิบ */
function drawPorch(ctx, v) {
  const { m, camera: cam, near } = v;
  const dx = m.doorIn + 60 - cam;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = (0.18 + 0.5 * near) * Math.max(v.facadeIn, 0.4);
  ctx.drawImage(glowBlob(), dx - 190, GROUND_Y - 60, 380, 110);
  ctx.restore();

  // กระสอบแป้งกับลังผลไม้ข้างประตู — บอกว่าที่นี่คือครัว ก่อนเห็นข้างใน
  const sx = m.houseL - 90 - cam;
  if (sx > -120 && sx < W + 20) {
    ctx.fillStyle = '#F4E6D2';
    ctx.beginPath();
    ctx.ellipse(sx + 26, GROUND_Y - 22, 26, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#D9C2A5';
    ctx.fillRect(sx + 14, GROUND_Y - 46, 24, 8);
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(sx + 54, GROUND_Y - 34, 46, 34);
    ctx.fillStyle = C.wood;
    ctx.fillRect(sx + 57, GROUND_Y - 31, 40, 12);
    ctx.fillStyle = '#FF7A6B';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(sx + 64 + i * 12, GROUND_Y - 37, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** ผนังหน้าร้าน — หลังคา ปล่องไฟ หน้าต่างไฟส่อง ป้ายร้าน ซุ้มประตูหน้า/หลัง */
function drawFacade(ctx, v, alpha) {
  const { m, camera: cam, tick } = v;
  const x0 = m.houseL - cam;
  const x1 = m.houseR - cam;
  const wallTop = 96;
  ctx.save();
  ctx.globalAlpha = alpha;

  // ปล่องไฟ (อยู่หลังหลังคา)
  const chx = m.houseL + 420 - cam;
  ctx.fillStyle = C.chimney;
  ctx.fillRect(chx, 6, 46, 60);
  ctx.fillStyle = C.dark;
  ctx.fillRect(chx - 6, 0, 58, 12);

  // ตัวผนัง
  ctx.fillStyle = C.wall;
  ctx.fillRect(x0, wallTop, x1 - x0, GROUND_Y - wallTop);
  ctx.strokeStyle = C.wallLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const first = Math.ceil((cam + Math.max(0, x0)) / 44) * 44;
  for (let wx = first; wx - cam < Math.min(W, x1); wx += 44) {
    ctx.moveTo(wx - cam + 0.5, wallTop + 10);
    ctx.lineTo(wx - cam + 0.5, GROUND_Y - 14);
  }
  ctx.stroke();
  ctx.fillStyle = C.dark;
  ctx.fillRect(x0, GROUND_Y - 14, x1 - x0, 14);
  ctx.fillStyle = C.trim;
  ctx.fillRect(x0, wallTop, x1 - x0, 6);

  // หลังคาขอบหยักแบบร้านขนม
  ctx.fillStyle = C.roof;
  ctx.fillRect(x0 - 24, 40, x1 - x0 + 48, 50);
  ctx.fillStyle = C.roofShade;
  const s0 = Math.max(x0 - 24, -30);
  const s1 = Math.min(x1 + 24, W + 30);
  for (let sx = s0 - ((s0 - (x0 - 24)) % 28); sx < s1; sx += 28) {
    ctx.beginPath();
    ctx.arc(sx + 14, 90, 14, 0, Math.PI);
    ctx.fill();
  }
  ctx.fillStyle = C.trim;
  ctx.fillRect(x0 - 24, 36, x1 - x0 + 48, 6);

  // หน้าต่างไฟส่อง — วางเว้นช่วงซุ้มประตู
  const flick = 0.85 + Math.sin(tick * 0.05) * 0.08;
  for (let wx = m.houseL + 70; wx < m.houseR - 80; wx += 210) {
    if (Math.abs(wx + 35 - (m.doorIn + 60)) < 130 || Math.abs(wx + 35 - (m.doorOut - 60)) < 130) continue;
    const sx = wx - cam;
    if (sx > W || sx + 70 < 0) continue;
    archWindow(ctx, sx, 142, 70, 86, flick);
  }

  // ป้ายร้าน: หมวกเชฟ + ปลา — ไม่มีตัวหนังสือ อ่านได้ทุกภาษา
  const bx = m.doorIn + 12 - cam;
  signBoard(ctx, bx, 104, 132, 34);

  // ซุ้มประตู: ข้างในเป็นแสงอุ่น (ประตูหลังมองจากข้างนอกก็เห็นแสงร้านเช่นกัน)
  archDoorway(ctx, m.doorIn - cam, tick);
  archDoorway(ctx, m.doorOut - 120 - cam, tick);

  ctx.restore();
}

function archWindow(ctx, x, y, w, h, flick) {
  ctx.fillStyle = C.dark;
  roundArch(ctx, x - 5, y - 5, w + 10, h + 10);
  ctx.fill();
  // ช่องกระจกไล่สีเป็นสไปรต์ — ผนังหน้ามีหลายบาน สร้างไล่สีใหม่ทุกบานทุกเฟรมเปลืองเกินจำเป็น
  const ga = ctx.globalAlpha;
  ctx.globalAlpha = ga * flick;
  ctx.drawImage(windowFill(w, h), x, y);
  ctx.globalAlpha = ga;
  ctx.fillStyle = C.dark;
  ctx.fillRect(x + w / 2 - 2.5, y + 4, 5, h - 4);
  ctx.fillRect(x, y + h * 0.55, w, 5);
  ctx.fillStyle = C.trim;
  ctx.fillRect(x - 8, y + h + 4, w + 16, 7);
}

function signBoard(ctx, x, y, w, h) {
  ctx.fillStyle = C.dark;
  ctx.fillRect(x + 20, y - 8, 4, 10);
  ctx.fillRect(x + w - 24, y - 8, 4, 10);
  ctx.fillStyle = C.trim;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = C.dark;
  ctx.stroke();
  // หมวกเชฟ
  const hx = x + 34, hy = y + h / 2 + 2;
  // หมวกขาวบนป้ายครีมจะกลืนกัน — ตีเส้นรอบพุ่มหมวกก่อนแล้วค่อยทาขาวทับด้านใน
  ctx.strokeStyle = C.dark;
  ctx.lineWidth = 3;
  ctx.fillStyle = '#FFFFFF';
  for (const pass of ['stroke', 'fill']) {
    ctx.beginPath();
    ctx.arc(hx - 8, hy - 6, 7, 0, Math.PI * 2);
    ctx.moveTo(hx + 8, hy - 10);
    ctx.arc(hx, hy - 10, 8, 0, Math.PI * 2);
    ctx.moveTo(hx + 15, hy - 6);
    ctx.arc(hx + 8, hy - 6, 7, 0, Math.PI * 2);
    ctx.rect(hx - 9, hy - 4, 18, 10);
    ctx[pass]();
  }
  // ปลาตัวเล็ก
  const fx = x + 88, fy = y + h / 2;
  ctx.fillStyle = '#5ED6D0';
  ctx.beginPath();
  ctx.ellipse(fx, fy, 16, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(fx + 13, fy);
  ctx.lineTo(fx + 25, fy - 8);
  ctx.lineTo(fx + 25, fy + 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.dark;
  ctx.beginPath();
  ctx.arc(fx - 8, fy - 2, 2, 0, Math.PI * 2);
  ctx.fill();
}

/** ซุ้มประตูที่ข้างในเป็นแสงร้าน — x = ขอบซ้ายซุ้มบนจอ */
function archDoorway(ctx, x, tick) {
  if (x > W || x + 120 < 0) return;
  const top = GROUND_Y - 176;
  ctx.fillStyle = C.dark;
  roundArch(ctx, x - 8, top - 8, 136, 184);
  ctx.fill();
  ctx.drawImage(doorFill(), x, top);
  const ga = ctx.globalAlpha;
  ctx.globalAlpha = ga * (0.35 + Math.sin(tick * 0.06) * 0.05);
  ctx.drawImage(glowBlob(), x - 20, top + 10, 160, 160);
  ctx.globalAlpha = ga;
}

function windowFill(w, h) {
  return sprite(`win${w}x${h}`, w, h, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, C.glow);
    grad.addColorStop(1, C.glowDeep);
    g.fillStyle = grad;
    roundArch(g, 0, 0, w, h);
    g.fill();
  });
}

function doorFill() {
  return sprite('door', 120, 176, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#FFD98A');
    grad.addColorStop(1, '#FF9A56');
    g.fillStyle = grad;
    roundArch(g, 0, 0, w, h);
    g.fill();
  });
}

function roundArch(ctx, x, y, w, h) {
  const r = w / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

/** ข้างในร้าน — ตัดเป็นช่องตามผนัง เว้นซุ้มประตูหลังให้มองทะลุออกไปเห็นฉากจริง */
function drawInterior(ctx, v) {
  const { m, camera: cam, tick, inside } = v;
  const a = Math.max(-20, m.doorIn - cam);
  const b = Math.min(W + 20, m.doorOut - cam);
  if (b <= a) return;
  const archX = m.doorOut - 120 - cam;
  const archTop = GROUND_Y - 176;

  ctx.save();
  ctx.beginPath();
  ctx.rect(a, -20, b - a, H + 40);
  // ช่องประตูหลัง (evenodd = เจาะรู)
  ctx.moveTo(archX, GROUND_Y);
  ctx.lineTo(archX, archTop + 60);
  ctx.arc(archX + 60, archTop + 60, 60, Math.PI, 0);
  ctx.lineTo(archX + 120, GROUND_Y);
  ctx.closePath();
  ctx.clip('evenodd');

  // ผนังหลัง
  const wall = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  wall.addColorStop(0, C.inWallTop);
  wall.addColorStop(1, C.inWallBot);
  ctx.fillStyle = wall;
  ctx.fillRect(a, -20, b - a, GROUND_Y + 20);

  // กระเบื้องครึ่งล่าง — ยึดกับพิกัดโลก เลื่อนไปพร้อมพื้น
  ctx.save();
  ctx.translate(-cam % 44, 0);
  ctx.fillStyle = tilePattern(ctx);
  ctx.fillRect(a + (cam % 44), 232, b - a, GROUND_Y - 232);
  ctx.restore();
  ctx.fillStyle = C.darkLite;
  ctx.fillRect(a, 226, b - a, 8);

  // ── ของประกอบข้างใน: เลื่อนช้ากว่าพื้น 10% ให้รู้สึกว่าอยู่ลึกกว่าทางวิ่ง ──
  const L = m.doorOut - m.doorIn;
  const px = (off) => m.doorIn + off - cam + (cam - m.doorIn) * 0.1;
  shelf(ctx, px(90), 118, 230);
  oven(ctx, px(L * 0.33), tick);
  counter(ctx, px(L * 0.56), tick);
  shelf(ctx, px(L * 0.74), 104, 200);
  nightWindow(ctx, px(L - 330), inside, tick);

  // ไล่บรรยากาศ: ยิ่งใกล้ประตูหลัง แสงยิ่งเย็นลงเป็นโทนกลางคืน — เตรียมตาก่อนออกไปเจอฉากใหม่
  const tint = ctx.createLinearGradient(m.doorIn + L * 0.55 - cam, 0, m.doorOut - cam, 0);
  tint.addColorStop(0, 'rgba(58,29,80,0)');
  tint.addColorStop(1, 'rgba(58,29,80,.42)');
  ctx.fillStyle = tint;
  ctx.fillRect(a, -20, b - a, GROUND_Y + 20);

  // คานเพดาน
  ctx.fillStyle = C.dark;
  ctx.fillRect(a, -20, b - a, 44);
  ctx.fillStyle = C.darkLite;
  ctx.fillRect(a, 20, b - a, 6);

  // กรวยแสงจากโคมไฟ (โคมอยู่ชั้นหน้า)
  // ซ้อนแบบปกติ ไม่ใช้ 'lighter' — วัดแล้วการบวกแสงกินเวลาวาดเป็นก้อนใหญ่ที่สุดของชั้นนี้
  // บนผนังโทนเข้ม สีครีมโปร่ง ๆ ให้ภาพแทบไม่ต่างจากการบวกแสง
  for (const off of lampOffsets(L)) {
    const lx = m.doorIn + off - cam;
    if (lx < -120 || lx > W + 120) continue;
    ctx.globalAlpha = 0.42 + Math.sin(tick * 0.07 + off) * 0.04;
    ctx.drawImage(lightCone(), lx - 110, 92, 220, GROUND_Y - 88);
  }
  ctx.globalAlpha = 1;

  // พื้นร้าน — ปิดพื้นของฉาก (สีพื้นฉากเปลี่ยนตอนสลับ ข้างในร้านต้องไม่เปลี่ยนตาม)
  ctx.fillStyle = C.floor;
  ctx.fillRect(a, GROUND_Y, b - a, H - GROUND_Y);
  ctx.fillStyle = C.floorLip;
  ctx.fillRect(a, GROUND_Y, b - a, 6);
  ctx.fillStyle = C.floorSeam;
  for (let wx = Math.ceil((cam + a) / 64) * 64; wx - cam < b; wx += 64) {
    ctx.fillRect(wx - cam, GROUND_Y + 6, 2, H - GROUND_Y);
  }
  ctx.restore();
}

function lampOffsets(L) {
  return [L * 0.16, L * 0.45, L * 0.74];
}

function shelf(ctx, x, y, w) {
  if (x > W || x + w < 0) return;
  ctx.fillStyle = C.woodDark;
  ctx.fillRect(x, y, w, 10);
  ctx.fillRect(x + 12, y + 10, 6, 18);
  ctx.fillRect(x + w - 18, y + 10, 6, 18);
  const jars = ['#FFB86B', '#8FE3D6', '#FF8FB8', '#FFE38A', '#C7A6FF'];
  for (let i = 0; i < 5; i++) {
    const jx = x + 16 + i * (w - 32) / 5;
    const jh = 22 + ((i * 7) % 3) * 6;
    ctx.fillStyle = jars[i];
    ctx.beginPath();
    ctx.roundRect(jx, y - jh, 26, jh, 5);
    ctx.fill();
    ctx.fillStyle = C.dark;
    ctx.fillRect(jx + 3, y - jh - 5, 20, 6);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(jx + 5, y - jh + 5, 4, jh - 10);
  }
}

function oven(ctx, x, tick) {
  const w = 190, h = 150;
  if (x > W || x + w < 0) return;
  const y = GROUND_Y - h;
  ctx.fillStyle = C.darkLite;
  ctx.fillRect(x + 70, -20, 34, y + 20);         // ปล่องเตาขึ้นเพดาน
  ctx.fillStyle = C.dark;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.fillStyle = '#5E3155';
  ctx.fillRect(x + 10, y + 10, w - 20, 16);
  // ปากเตา — ไฟวูบวาบช้า ๆ
  const f = 0.8 + Math.sin(tick * 0.09) * 0.12 + Math.sin(tick * 0.23) * 0.06;
  const grad = ctx.createLinearGradient(0, y + 40, 0, y + h - 16);
  grad.addColorStop(0, '#FFE08A');
  grad.addColorStop(1, '#FF7A3C');
  ctx.globalAlpha = f;
  ctx.fillStyle = grad;
  roundArch(ctx, x + 36, y + 42, w - 72, h - 58);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.globalAlpha = 0.3 * f;
  ctx.drawImage(glowBlob(), x - 30, y - 10, w + 60, h + 40);
  ctx.globalAlpha = 1;
  // ถาดขนมปังในเตา
  ctx.fillStyle = '#B8683A';
  ctx.fillRect(x + 48, y + h - 34, w - 96, 6);
  ctx.fillStyle = '#F2B26B';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(x + 70 + i * 26, y + h - 38, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function counter(ctx, x, tick) {
  const w = 220;
  if (x > W || x + w < 0) return;
  const top = 250;
  ctx.fillStyle = C.woodDark;
  ctx.fillRect(x + 10, top + 12, 12, GROUND_Y - top - 12);
  ctx.fillRect(x + w - 22, top + 12, 12, GROUND_Y - top - 12);
  ctx.fillStyle = C.wood;
  ctx.fillRect(x, top, w, 14);
  ctx.fillStyle = C.woodLite;
  ctx.fillRect(x, top, w, 4);
  // หม้อซุป (ไอน้ำลอยจากตรงนี้ — ดู emitters)
  ctx.fillStyle = C.steelDark;
  ctx.beginPath();
  ctx.roundRect(x + 118, top - 34, 60, 34, 6);
  ctx.fill();
  ctx.fillStyle = C.steel;
  ctx.fillRect(x + 112, top - 38, 72, 8);
  ctx.fillRect(x + 104, top - 26, 10, 5);
  ctx.fillRect(x + 182, top - 26, 10, 5);
  // เขียงกับปลา
  ctx.fillStyle = '#F2C28E';
  ctx.fillRect(x + 22, top - 6, 70, 6);
  ctx.fillStyle = '#5ED6D0';
  ctx.beginPath();
  ctx.ellipse(x + 55, top - 11, 16 + Math.sin(tick * 0.02), 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** หน้าต่างบานกลมมองออกไปเห็นฟ้ากลางคืน — คำใบ้ของฉากที่กำลังจะไป */
function nightWindow(ctx, x, inside, tick) {
  const r = 48;
  if (x - r > W || x + r < 0) return;
  const cy = 128;
  ctx.fillStyle = C.dark;
  ctx.beginPath();
  ctx.arc(x, cy, r + 8, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, '#1B0F2B');
  g.addColorStop(1, '#7A3563');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF3C8';
  ctx.beginPath();
  ctx.arc(x + 14, cy - 14, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1B0F2B';
  ctx.beginPath();
  ctx.arc(x + 20, cy - 18, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,243,226,.8)';
  for (let i = 0; i < 5; i++) {
    const tw = 0.5 + Math.sin(tick * 0.05 + i * 1.7) * 0.5;
    ctx.globalAlpha = 0.4 + tw * 0.6 * (0.4 + inside * 0.6);
    ctx.fillRect(x - 30 + i * 13, cy + 8 - ((i * 17) % 34), 2.5, 2.5);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.dark;
  ctx.fillRect(x - r, cy - 2.5, r * 2, 5);
  ctx.fillRect(x - 2.5, cy - r, 5, r * 2);
}

// ─────────────────────────────────────────────────────────────
// ชั้นหน้า — วาดหลังตัวแมว
// ─────────────────────────────────────────────────────────────
export function drawKitchenFront(ctx, v) {
  const { m, camera: cam, tick } = v;
  if (m.houseR + 80 - cam < 0 || m.houseL - 200 - cam > W) return;

  const inside = (1 - v.facadeIn) * (1 - v.facadeOut);
  if (inside > 0) {
    ctx.save();
    ctx.globalAlpha = inside;
    const L = m.doorOut - m.doorIn;
    for (const [i, off] of lampOffsets(L).entries()) lamp(ctx, m.doorIn + off - cam, tick, i);
    utensils(ctx, m.doorIn + 70 - cam, tick);
    ctx.restore();
  }

  // บานประตูสวิง — ผลักเปิดตอนแมววิ่งถึง
  swingDoors(ctx, m.doorIn - cam, v.swing);
  swingDoors(ctx, m.doorOut - 120 - cam, v.swingOut);

  // เสาประตู — แมววิ่งลอดหลังเสา = ความรู้สึก "ผ่านเข้าไป" ที่ชัดที่สุด
  pillar(ctx, m.doorIn - 36 - cam);
  pillar(ctx, m.doorOut - cam);
}

function pillar(ctx, x) {
  if (x > W || x + 36 < 0) return;
  ctx.fillStyle = C.dark;
  ctx.fillRect(x, 26, 36, GROUND_Y - 26);
  ctx.fillStyle = C.darkLite;
  ctx.fillRect(x + 6, 40, 8, GROUND_Y - 60);
  ctx.fillStyle = C.trim;
  ctx.fillRect(x - 6, 26, 48, 10);
  ctx.fillRect(x - 6, GROUND_Y - 16, 48, 16);
}

function swingDoors(ctx, x, open) {
  if (x > W + 60 || x + 180 < 0) return;
  const top = GROUND_Y - 104;
  const h = 70;
  // บานสวิงแบบประตูร้านอาหาร: ขอบบนโค้งลงหาช่องกลาง ระแนงตั้ง ผลักแล้วบานแคบลง (หมุนออกจากจอ)
  const w = 58 * (1 - open * 0.8);
  const leaf = (hx, dir) => {
    const inner = hx + dir * w;           // ขอบบานฝั่งกลางประตู
    ctx.fillStyle = C.woodDark;
    ctx.beginPath();
    ctx.moveTo(hx, top);
    ctx.quadraticCurveTo((hx + inner) / 2, top - 4, inner, top + 16);
    ctx.lineTo(inner, top + h);
    ctx.lineTo(hx, top + h);
    ctx.closePath();
    ctx.fill();
    if (w < 12) return;
    ctx.fillStyle = C.wood;
    ctx.beginPath();
    ctx.moveTo(hx + dir * 3, top + 4);
    ctx.quadraticCurveTo((hx + inner) / 2, top + 1, inner - dir * 3, top + 19);
    ctx.lineTo(inner - dir * 3, top + h - 3);
    ctx.lineTo(hx + dir * 3, top + h - 3);
    ctx.closePath();
    ctx.fill();
    // ระแนง
    ctx.strokeStyle = C.woodDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 1; k < 4; k++) {
      const sx = hx + dir * (w * k) / 4;
      ctx.moveTo(sx, top + 10 + (k * 4));
      ctx.lineTo(sx, top + h - 6);
    }
    ctx.stroke();
    // บานพับ
    ctx.fillStyle = C.steel;
    ctx.fillRect(hx - 2, top + 10, 4, 8);
    ctx.fillRect(hx - 2, top + h - 18, 4, 8);
  };
  leaf(x + 2, 1);
  leaf(x + 118, -1);
}

function lamp(ctx, x, tick, i) {
  if (x < -60 || x > W + 60) return;
  const sw = Math.sin(tick * 0.03 + i * 1.9) * 0.06;
  const len = 58;
  const bx = x + Math.sin(sw) * len;
  const by = 24 + Math.cos(sw) * len;
  ctx.strokeStyle = C.dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 24);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  const ga = ctx.globalAlpha;
  ctx.globalAlpha = ga * 0.7;
  ctx.drawImage(glowBlob(), bx - 34, by - 12, 68, 68);
  ctx.globalAlpha = ga;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#FFCF6B';
  ctx.beginPath();
  ctx.moveTo(bx - 22, by + 16);
  ctx.quadraticCurveTo(bx, by - 8, bx + 22, by + 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#E08A3A';
  ctx.fillRect(bx - 22, by + 14, 44, 4);
  ctx.fillStyle = '#FFF3C8';
  ctx.beginPath();
  ctx.arc(bx, by + 19, 5, 0, Math.PI);
  ctx.fill();
}

function utensils(ctx, x, tick) {
  if (x < -140 || x > W + 20) return;
  ctx.fillStyle = C.steelDark;
  ctx.fillRect(x, 30, 110, 4);
  const sway = Math.sin(tick * 0.04) * 1.5;
  // ทัพพี
  ctx.strokeStyle = C.steel;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 22, 34);
  ctx.lineTo(x + 22 + sway, 72);
  ctx.stroke();
  ctx.fillStyle = C.steel;
  ctx.beginPath();
  ctx.arc(x + 22 + sway, 78, 8, 0, Math.PI);
  ctx.fill();
  // ตะกร้อตีไข่
  ctx.beginPath();
  ctx.moveTo(x + 58, 34);
  ctx.lineTo(x + 58 - sway, 56);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x + 58 - sway, 70, 8, 15, 0, 0, Math.PI * 2);
  ctx.stroke();
  // ตะหลิว
  ctx.beginPath();
  ctx.moveTo(x + 92, 34);
  ctx.lineTo(x + 92 + sway, 64);
  ctx.stroke();
  ctx.fillRect(x + 84 + sway, 64, 16, 14);
}
