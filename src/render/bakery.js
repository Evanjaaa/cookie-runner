// src/render/bakery.js
// ─────────────────────────────────────────────────────────────
// ครัวกลางคืน — ผนังกระเบื้อง / หน้าต่างโค้งเห็นพระจันทร์กับหลังคาเมือง / ชั้นวางขวดโหล
//                เตาอบที่ไฟยังติด / หม้อกระทะแขวน / พวงไฟสาย / ไอน้ำกับสะเก็ดไฟลอย
//                เคาน์เตอร์เตรียมของหน้าสุด
//
// ── ทำไมอยู่ที่นี่ ──
// เหตุผลเดียวกับ sea.js / space.js / snow.js / cave.js / meadow.js:
// ฉากหลังของด่านนี้เคยเป็นแค่ "ฟ้าไล่สี + เนิน + ของประกอบลอย ๆ" ซึ่งอ่านไม่ออกว่าเป็นครัว
// ทั้งที่ทางเข้าด่าน (render/gates/kitchen.js) พาผู้เล่นวิ่งทะลุร้านขนมมาทั้งหลัง
// ไฟล์นี้ทำให้ "ข้างในร้าน" กับ "ตัวด่าน" เป็นที่เดียวกันจริง ๆ
//
// ── จานสีมาจากด่านจริง ──
// ฟ้าของด่าน (ม่วงกลางคืน) ถูกใช้เป็น "ท้องฟ้าที่เห็นผ่านหน้าต่าง" ไม่ใช่ฟ้าเปิดโล่ง
// ค่าสีเดิมทุกตัวจึงยังมีความหมาย และ HUD ที่ปรับมาให้อ่านบนโทนนี้ก็ยังอ่านออกเหมือนเดิม
//
// ── สองย่านสลับกันตามระยะทาง (ย่านละ 4400px ≈ 10.8 วินาที) ──
//   0 โซนเตาอบ — ไฟเตาอุ่น ๆ แสงทาบพื้น
//   1 โซนชั้นวางของ — หน้าต่างบานใหญ่ แสงจันทร์ ขวดโหลเต็มชั้น
//
// ── ประสิทธิภาพ ──
// ผนัง ชั้นวาง เตาอบ หน้าต่าง เคาน์เตอร์ = แผ่นแคชกว้าง 1920 แปะแบบวนขอบ
// ไอน้ำกับสะเก็ดไฟเป็นพูลคงที่ (10 + 14) ไม่มีการสร้างอ็อบเจกต์ใหม่ระหว่างเล่น
// ไม่มี filter / shadowBlur เลย แสงเรืองอบไว้ในสไปรต์ตั้งแต่ตอนสร้าง
// ─────────────────────────────────────────────────────────────
import { VIEW, GROUND_Y } from '../config.js';
import { placed, minGap } from './scenery.js';
import { stageById } from '../stages.js';

const { W, H } = VIEW;
const TAU = Math.PI * 2;
const TILE = 1920;

export const BAKERY_C = {
  wall: '#3A2148', wallHi: '#4C2C5C', wallLo: '#2A1738',
  tile: '#5A3466', tileLine: '#2A1738',
  wood: '#8E5A34', woodDark: '#6B3F22', woodLite: '#B3794A',
  steel: '#8C7FA8', steelDark: '#5E5478', steelLite: '#C4BADA',
  fire: '#FFA657', fireHot: '#FFE0A8', fireDeep: '#E2622E',
  jarA: '#F2C27A', jarB: '#E88FA8', jarC: '#9BD8C4', jarD: '#C6AFE0',
  cream: '#FFF3E2', moon: '#FFF7DA',
  bulb: '#FFD98A', wire: '#2A1738',
  // เตาอบใช้ชุดสีของตัวเอง ไม่ปนกับเหล็กชั้นวาง ไม่งั้นมันจะจมหายไปกับผนัง
  ovenBody: '#2E1B30', ovenTrim: '#7A4A38', ovenTrimLite: '#C98A52',
};

const C = BAKERY_C;

export function bakeryHash(n) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}
const hash = bakeryHash;

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** เศษที่เหลือแบบไม่ติดลบ — ของที่วนซ้ำต้องใช้ตัวนี้ ไม่ใช่ % เปล่า ๆ (ดูบันทึกใน sea.js) */
function wrap(v, m) {
  const r = v % m;
  return r < 0 ? r + m : r;
}

function ease(t) {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
}

const SPR = {};

export function bakerySprite(key, w, h, paint) {
  if (SPR[key]) return SPR[key];
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(w);
  cv.height = Math.ceil(h);
  paint(cv.getContext('2d'), w, h);
  SPR[key] = cv;
  return cv;
}

function tileRow(ctx, img, tw, offset, y) {
  const x0 = -wrap(offset, tw);
  for (let x = x0; x < W; x += tw) ctx.drawImage(img, x, y);
}

// ── ของชิ้นใหญ่ประจำครัว: หน้าต่าง ↔ เตาอบ ──
//
// เดิมสองอย่างนี้ต่างคนต่างวนด้วยช่วงแคบ ๆ แล้วใช้ "ความโปร่งใสตามย่าน" เป็นตัวสลับ
// ผลคือมันผุดขึ้นกลางจอแล้วจางหายที่เดิม ไม่ใช่ของที่ตั้งอยู่ในห้องจริง ๆ
// (วัดแล้วหน้าต่างโผล่ที่ x=140 เตาอบโผล่ที่ x=668 — กลางจอทั้งคู่)
//
// ตอนนี้ทั้งคู่เป็นของในชั้นเดียวกัน วางสลับช่องเว้นช่อง ห่างกันช่องละ FIX_GAP
// ผู้เล่นจึงเห็นมันไหลเข้ามาจากขอบขวาทีละชิ้น เหมือนวิ่งผ่านห้องครัวยาว ๆ จริง ๆ
//
// FIX_GAP ต้องไม่น้อยกว่า จอ + ความกว้างชิ้น (ดู minGap ใน scenery.js)
// ส่วน depth เลือกจากจังหวะที่อยากได้: 1260 / 0.26 ≈ 4,850px ≈ 12 วินาทีต่อหนึ่งชิ้น
// ซึ่งเท่ากับจังหวะของย่านเดิมพอดี แต่คราวนี้เป็นการเคลื่อนที่จริง ไม่ใช่การจางเข้าออก
const FIX_DEPTH = 0.26;
const FIX_GAP = minGap(300);

// ─────────────────────────────────────────────────────────────
// ผนังครัว — ครึ่งบนทาสีเข้ม ครึ่งล่างเป็นกระเบื้อง
// ─────────────────────────────────────────────────────────────
function wallSheet() {
  return bakerySprite('bkWall', 240, H, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, C.wallLo);
    grad.addColorStop(0.5, C.wall);
    grad.addColorStop(1, C.wallHi);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    // แนวกระเบื้องครึ่งล่าง — สลับฟันปลาเหมือนกระเบื้องครัวจริง
    const top = GROUND_Y - 150;
    g.fillStyle = C.tile;
    g.fillRect(0, top, w, h - top);
    g.strokeStyle = C.tileLine;
    g.lineWidth = 2;
    g.beginPath();
    for (let y = top; y < h; y += 26) {
      g.moveTo(0, y);
      g.lineTo(w, y);
    }
    for (let row = 0, y = top; y < h; y += 26, row++) {
      for (let x = (row % 2 ? 0 : 26); x < w; x += 52) {
        g.moveTo(x, y);
        g.lineTo(x, y + 26);
      }
    }
    g.stroke();
    // คิ้วไม้คั่นระหว่างผนังกับกระเบื้อง
    g.fillStyle = C.woodDark;
    g.fillRect(0, top - 8, w, 8);
    g.fillStyle = C.woodLite;
    g.fillRect(0, top - 8, w, 2);
  });
}

// ─────────────────────────────────────────────────────────────
// หน้าต่างโค้ง — ท้องฟ้ากลางคืนกับหลังคาเมืองอยู่ข้างนอก
// นี่คือที่ที่จานสี sky ของด่านยังทำหน้าที่อยู่
// ─────────────────────────────────────────────────────────────
function windowSprite() {
  return bakerySprite('bkWindow', 300, 230, (g, w, h) => {
    const pal = stageById('night').palette;
    const r = w / 2;
    // ช่องกระจก (โค้งบน)
    g.save();
    g.beginPath();
    g.moveTo(12, h - 10);
    g.lineTo(12, 96);
    g.quadraticCurveTo(r, -34, w - 12, 96);
    g.lineTo(w - 12, h - 10);
    g.closePath();
    g.clip();
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, pal.sky[0]);
    sky.addColorStop(0.6, pal.sky[1]);
    sky.addColorStop(1, pal.sky[2]);
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    // พระจันทร์กับดาว
    const halo = g.createRadialGradient(w * 0.66, 78, 4, w * 0.66, 78, 62);
    halo.addColorStop(0, 'rgba(255,247,218,.7)');
    halo.addColorStop(1, 'rgba(255,247,218,0)');
    g.fillStyle = halo;
    g.fillRect(0, 0, w, h);
    g.fillStyle = C.moon;
    g.beginPath();
    g.arc(w * 0.66, 78, 22, 0, TAU);
    g.fill();
    g.fillStyle = pal.sky[1];
    g.beginPath();
    g.arc(w * 0.66 + 11, 71, 19, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,243,226,.75)';
    for (let i = 0; i < 12; i++) {
      g.beginPath();
      g.arc(hash(i * 3.1) * w, 20 + hash(i * 7.7) * 120, 1 + hash(i) * 1.2, 0, TAU);
      g.fill();
    }
    // หลังคาเมืองข้างนอก
    g.fillStyle = 'rgba(30,16,48,.9)';
    for (let i = 0; i < 7; i++) {
      const bx = i * 46 + hash(i * 5.3) * 14;
      const bh = 40 + hash(i * 2.2) * 54;
      g.fillRect(bx, h - 10 - bh, 40, bh);
      g.fillStyle = 'rgba(255,214,150,.5)';
      for (let k = 0; k < 3; k++) {
        if (hash(i * 9.1 + k) > 0.55) g.fillRect(bx + 8 + k * 11, h - 10 - bh + 12, 6, 8);
      }
      g.fillStyle = 'rgba(30,16,48,.9)';
    }
    g.restore();

    // กรอบหน้าต่าง + กบ
    g.strokeStyle = C.wood;
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(12, h - 10);
    g.lineTo(12, 96);
    g.quadraticCurveTo(r, -34, w - 12, 96);
    g.lineTo(w - 12, h - 10);
    g.stroke();
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(r, 24);
    g.lineTo(r, h - 10);
    g.moveTo(16, 132);
    g.lineTo(w - 16, 132);
    g.stroke();
    // ขอบล่างหน้าต่าง
    g.fillStyle = C.woodLite;
    g.fillRect(2, h - 14, w - 4, 10);
  });
}

// ─────────────────────────────────────────────────────────────
// ชั้นวางของกับขวดโหล — แผ่นยาววนได้
// ─────────────────────────────────────────────────────────────
function shelfBand() {
  return bakerySprite('bkShelf', TILE, 210, (g, w, h) => {
    for (let row = 0; row < 2; row++) {
      const y = 52 + row * 96;
      g.fillStyle = C.woodDark;
      g.fillRect(0, y, w, 10);
      g.fillStyle = C.woodLite;
      g.fillRect(0, y, w, 3);
      // ขาชั้น
      g.fillStyle = C.woodDark;
      for (let x = 60; x < w; x += 320) g.fillRect(x, y - 44, 7, 44);

      let x = 24;
      let i = 0;
      while (x < w - 40) {
        const kind = Math.floor(hash(i * 3.7 + row) * 4);
        const s = 0.8 + hash(i * 5.1) * 0.5;
        if (kind === 0) jar(g, x, y, s, i);
        else if (kind === 1) cakeStand(g, x, y, s);
        else if (kind === 2) bowlStack(g, x, y, s, i);
        else bagSack(g, x, y, s);
        x += 46 * s + hash(i * 2.9) * 26;
        i++;
      }
    }
  });
}

function jar(g, x, y, s, i) {
  const cols = [C.jarA, C.jarB, C.jarC, C.jarD];
  const hh = 30 * s;
  g.fillStyle = 'rgba(255,243,226,.22)';
  g.fillRect(x, y - hh, 22 * s, hh);
  g.fillStyle = cols[i % 4];
  g.fillRect(x + 2, y - hh * 0.62, 18 * s, hh * 0.62 - 2);
  g.fillStyle = C.cream;
  g.fillRect(x - 1, y - hh - 5, 24 * s, 6);
  g.fillStyle = 'rgba(255,255,255,.35)';
  g.fillRect(x + 4, y - hh + 4, 3, hh - 10);
}

function cakeStand(g, x, y, s) {
  g.fillStyle = C.steelLite;
  g.fillRect(x + 10 * s, y - 16 * s, 4 * s, 16 * s);
  g.fillRect(x, y - 18 * s, 24 * s, 3 * s);
  g.fillStyle = C.cream;
  g.beginPath();
  g.arc(x + 12 * s, y - 24 * s, 11 * s, Math.PI, TAU);
  g.fill();
  g.fillStyle = C.jarB;
  g.beginPath();
  g.arc(x + 12 * s, y - 30 * s, 3.4 * s, 0, TAU);
  g.fill();
}

function bowlStack(g, x, y, s, i) {
  for (let k = 0; k < 2 + (i % 2); k++) {
    g.fillStyle = k % 2 ? C.steel : C.steelLite;
    g.beginPath();
    g.ellipse(x + 14 * s, y - 6 * s - k * 9 * s, 15 * s, 6 * s, 0, Math.PI, TAU);
    g.fill();
  }
}

function bagSack(g, x, y, s) {
  g.fillStyle = '#D9C49A';
  g.beginPath();
  g.moveTo(x + 4 * s, y);
  g.lineTo(x + 2 * s, y - 24 * s);
  g.quadraticCurveTo(x + 14 * s, y - 34 * s, x + 26 * s, y - 24 * s);
  g.lineTo(x + 24 * s, y);
  g.closePath();
  g.fill();
  g.strokeStyle = C.woodDark;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x + 6 * s, y - 20 * s);
  g.lineTo(x + 22 * s, y - 20 * s);
  g.stroke();
}

// ─────────────────────────────────────────────────────────────
// เตาอบ — หมุดหมายของโซนเตา ไฟในเตาเต้นช้า ๆ
// ─────────────────────────────────────────────────────────────
function ovenSprite() {
  return bakerySprite('bkOven', 300, 240, (g, w, h) => {
    const base = h - 4;
    // ── ทำไมต้องเข้มกว่าผนัง ──
    // เหล็กสีม่วงเทาชุดเดียวกับผนังทำให้เตากลายเป็นเงาจาง ๆ อ่านไม่ออกว่าเป็นของชิ้นไหน
    // เตาจึงใช้เหล็กดำอมอุ่นกับคิ้วทองแดง ซึ่งไม่มีที่ไหนในฉากใช้
    g.fillStyle = C.ovenBody;
    g.fillRect(10, base - 200, w - 20, 200);
    g.fillStyle = C.ovenTrim;
    g.fillRect(10, base - 200, w - 20, 16);
    g.fillStyle = C.ovenTrimLite;
    g.fillRect(10, base - 200, w - 20, 4);
    // ปล่องกับท่อ
    g.fillStyle = C.ovenBody;
    g.fillRect(w * 0.62, base - 240, 26, 44);
    g.fillStyle = C.ovenTrim;
    g.fillRect(w * 0.62, base - 240, 8, 44);
    // ประตูเตาสองบาน (ช่องไฟเว้นไว้ ให้ผู้เรียกวาดไฟเรืองสดทับ)
    for (let i = 0; i < 2; i++) {
      const dx = 30 + i * 128;
      g.fillStyle = C.ovenTrim;
      g.fillRect(dx, base - 152, 112, 104);
      g.fillStyle = '#170C20';
      g.fillRect(dx + 10, base - 142, 92, 76);
      g.fillStyle = C.ovenTrimLite;
      g.fillRect(dx + 8, base - 40, 96, 9);
      g.fillStyle = C.ovenBody;
      g.fillRect(dx + 44, base - 44, 24, 5);
    }
    // มือจับกับหน้าปัด
    g.fillStyle = C.ovenTrimLite;
    g.fillRect(20, base - 172, w - 40, 7);
    g.fillStyle = C.fire;
    g.beginPath();
    g.arc(w - 34, base - 186, 5, 0, TAU);
    g.fill();
  });
}

/** ไฟในเตา — วาดสดเพราะต้องเต้น (สองช่อง ช่องละแถบไล่สี) */
function ovenFire(ctx, x, y, tick, a) {
  for (let i = 0; i < 2; i++) {
    const dx = x + 40 + i * 128;
    const fy = y + 98;
    const k = 0.72 + 0.28 * Math.sin(tick * 0.09 + i * 1.7);
    const grad = ctx.createLinearGradient(0, fy + 56, 0, fy);
    grad.addColorStop(0, `rgba(255,234,190,${0.98 * a})`);
    grad.addColorStop(0.5, `rgba(255,166,87,${0.88 * a * k})`);
    grad.addColorStop(1, 'rgba(226,98,46,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(dx, fy, 92, 56);
    // เปลวเล็ก ๆ ในช่อง
    ctx.fillStyle = `rgba(255,214,150,${0.5 * a * k})`;
    for (let f = 0; f < 3; f++) {
      const fx = dx + 18 + f * 28;
      const hh = 14 + Math.sin(tick * 0.14 + f + i) * 6;
      ctx.beginPath();
      ctx.moveTo(fx, fy + 54);
      ctx.quadraticCurveTo(fx + 7, fy + 54 - hh, fx + 14, fy + 54);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ─────────────────────────────────────────────────────────────
// หม้อกระทะแขวน + พวงไฟสาย (ชั้นบนสุด)
// ─────────────────────────────────────────────────────────────
function hangBand() {
  return bakerySprite('bkHang', TILE, 150, (g, w, h) => {
    // ราวเหล็ก
    g.fillStyle = C.steelDark;
    g.fillRect(0, 26, w, 7);
    g.fillStyle = C.steel;
    g.fillRect(0, 26, w, 2);
    let x = 40;
    let i = 0;
    while (x < w - 40) {
      const s = 0.85 + hash(i * 4.4) * 0.5;
      g.strokeStyle = C.steelDark;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, 33);
      g.lineTo(x, 46);
      g.stroke();
      if (i % 3 === 2) {
        // กระทะ
        g.fillStyle = C.steelDark;
        g.beginPath();
        g.arc(x, 46 + 22 * s, 22 * s, 0, TAU);
        g.fill();
        g.fillStyle = C.steel;
        g.beginPath();
        g.arc(x - 5 * s, 46 + 18 * s, 14 * s, 0, TAU);
        g.fill();
      } else {
        // หม้อ
        g.fillStyle = i % 2 ? C.steel : C.steelDark;
        g.fillRect(x - 18 * s, 46, 36 * s, 30 * s);
        g.fillStyle = C.steelLite;
        g.fillRect(x - 21 * s, 44, 42 * s, 5);
      }
      x += 96 * s + hash(i * 2.7) * 60;
      i++;
    }
    // สายไฟหลอดกลมห้อยเป็นท้องช้าง
    g.strokeStyle = C.wire;
    g.lineWidth = 2.5;
    g.beginPath();
    for (let sx = 0; sx < w; sx += 240) {
      g.moveTo(sx, 8);
      g.quadraticCurveTo(sx + 120, 40, sx + 240, 8);
    }
    g.stroke();
    for (let sx = 0; sx < w; sx += 60) {
      const t = ((sx % 240) / 240);
      const y = 8 + 4 * (1 - (2 * t - 1) ** 2) * 8;
      g.fillStyle = C.bulb;
      g.beginPath();
      g.arc(sx, y + 6, 5, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(255,217,138,.25)';
      g.beginPath();
      g.arc(sx, y + 6, 12, 0, TAU);
      g.fill();
    }
  });
}

// ─────────────────────────────────────────────────────────────
// เคาน์เตอร์เตรียมของหน้าสุด — อยู่เหนือเส้นพื้นนิดเดียว ไม่บังทางวิ่ง
// ─────────────────────────────────────────────────────────────
const COUNTER_H = 104;

function counterBand() {
  return bakerySprite('bkCounter', TILE, COUNTER_H, (g, w, h) => {
    g.fillStyle = C.woodDark;
    g.fillRect(0, h - 58, w, 58);
    g.fillStyle = C.wood;
    g.fillRect(0, h - 58, w, 12);
    g.fillStyle = C.woodLite;
    g.fillRect(0, h - 58, w, 4);
    // ลิ้นชักกับมือจับ
    g.strokeStyle = 'rgba(42,23,56,.6)';
    g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x < w; x += 140) {
      g.moveTo(x, h - 46);
      g.lineTo(x, h);
    }
    g.stroke();
    g.fillStyle = C.steelLite;
    for (let x = 60; x < w; x += 140) g.fillRect(x, h - 30, 22, 4);

    // ของวางบนเคาน์เตอร์
    let x = 30;
    let i = 0;
    while (x < w - 60) {
      const kind = i % 4;
      const y = h - 58;
      if (kind === 0) {
        // ถาดคุกกี้
        g.fillStyle = C.steel;
        g.fillRect(x, y - 10, 66, 10);
        g.fillStyle = '#C97B3E';
        for (let k = 0; k < 3; k++) {
          g.beginPath();
          g.arc(x + 14 + k * 20, y - 14, 7, 0, TAU);
          g.fill();
        }
      } else if (kind === 1) {
        // โถแป้งกับไม้นวด
        g.fillStyle = C.cream;
        g.beginPath();
        g.ellipse(x + 20, y - 14, 20, 14, 0, Math.PI, TAU);
        g.fill();
        g.fillStyle = C.wood;
        g.fillRect(x + 44, y - 8, 46, 7);
        g.fillStyle = C.woodLite;
        g.fillRect(x + 40, y - 7, 6, 5);
        g.fillRect(x + 88, y - 7, 6, 5);
      } else if (kind === 2) {
        // หม้อมีไอ (ผู้เรียกวาดไอน้ำสดทับ)
        g.fillStyle = C.steelDark;
        g.fillRect(x + 6, y - 26, 44, 26);
        g.fillStyle = C.steelLite;
        g.fillRect(x + 2, y - 30, 52, 6);
      } else {
        // เค้กใต้ฝาครอบ
        g.fillStyle = C.cream;
        g.beginPath();
        g.arc(x + 24, y - 6, 20, Math.PI, TAU);
        g.fill();
        g.fillStyle = C.jarB;
        g.fillRect(x + 8, y - 16, 32, 5);
        g.strokeStyle = 'rgba(255,255,255,.35)';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(x + 24, y - 4, 26, Math.PI, TAU);
        g.stroke();
      }
      x += 150 + hash(i * 3.3) * 90;
      i++;
    }
    // แป้งฟุ้งบนหน้าเคาน์เตอร์
    g.fillStyle = 'rgba(255,243,226,.5)';
    for (let k = 0; k < 90; k++) {
      g.beginPath();
      g.arc(hash(k * 5.5) * w, h - 58 + hash(k * 2.2) * 8, 1 + hash(k) * 1.4, 0, TAU);
      g.fill();
    }
  });
}

// ─────────────────────────────────────────────────────────────
// ไอน้ำกับสะเก็ดไฟ — พูลคงที่
// ─────────────────────────────────────────────────────────────
const STEAM = Array.from({ length: 10 }, (_, i) => ({
  x: hash(i * 2.3) * W,
  y: hash(i * 5.1) * GROUND_Y,
  r: 8 + hash(i * 7.7) * 12,
  vy: -(0.25 + hash(i * 3.3) * 0.4),
  ph: hash(i * 9.1) * TAU,
}));

const EMBERS = Array.from({ length: 14 }, (_, i) => ({
  x: hash(i * 3.7) * W,
  y: hash(i * 6.1) * GROUND_Y,
  r: 1 + hash(i * 8.3) * 1.8,
  vy: -(0.3 + hash(i * 4.4) * 0.6),
  ph: hash(i * 2.9) * TAU,
}));

/**
 * ไอน้ำกับสะเก็ดไฟ
 *
 * ── ทำไมต้องลบด้วย cam ──
 * ของพวกนี้ลอยอยู่ "ในห้อง" ไม่ได้ลอยติดหน้าจอ ถ้าไม่เลื่อนตามกล้อง มันจะลอยขึ้น
 * อยู่กับที่ขณะที่ทั้งห้องไหลผ่านไป ซึ่งอ่านเป็นฝุ่นติดเลนส์ ไม่ใช่ไอที่ลอยอยู่ในครัว
 * ช่วงวนกว้างกว่าจอ (W + 120) ของจึงโผล่นอกจอเสมอ ไม่ผุดกลางจอ
 */
function drawAir(ctx, cam, tick) {
  const air = (x, depth) => wrap(x - cam * depth, W + 120) - 60;
  ctx.save();
  // ไอน้ำ — ก้อนขาวจาง ๆ ลอยขึ้นแล้วบานออก
  for (const p of STEAM) {
    p.y += p.vy;
    if (p.y < GROUND_Y - 220) { p.y = GROUND_Y - 30; p.x = hash(p.x * 0.27 + tick) * W; }
    const k = clamp01((GROUND_Y - p.y) / 200);
    ctx.globalAlpha = 0.16 * (1 - k);
    ctx.fillStyle = C.cream;
    ctx.beginPath();
    ctx.arc(air(p.x, 0.45) + Math.sin(tick * 0.02 + p.ph) * 14, p.y, p.r * (1 + k * 1.6), 0, TAU);
    ctx.fill();
  }
  // สะเก็ดไฟจากเตา
  ctx.globalCompositeOperation = 'lighter';
  for (const p of EMBERS) {
    p.y += p.vy;
    if (p.y < -6) { p.y = GROUND_Y + 6; p.x = hash(p.x * 0.31 + tick) * W; }
    ctx.globalAlpha = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(tick * 0.06 + p.ph));
    ctx.fillStyle = C.fire;
    ctx.beginPath();
    ctx.arc(air(p.x, 0.55) + Math.sin(tick * 0.03 + p.ph) * 8, p.y, p.r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ฉากหลังครัวกลางคืนเต็มจอ
//
// @param opts.lit  ความสว่างของห้อง 0 → 1 (ด่านจริงใช้ 1)
// ─────────────────────────────────────────────────────────────
/** หน้าต่างโค้งพร้อมแสงจันทร์ทาบพื้น — x = ขอบซ้ายของหน้าต่างบนจอ */
function drawKitchenWindow(ctx, x) {
  ctx.drawImage(windowSprite(), x, 52, 300, 230);
  // แสงจันทร์ทาบพื้น
  // แคบและจางกว่าที่คิดไว้มาก — ลำแสงกว้าง ๆ ทึบ ๆ อ่านเป็นแผ่นพลาสติก ไม่ใช่แสง
  const beam = ctx.createLinearGradient(0, 264, 0, GROUND_Y + 10);
  beam.addColorStop(0, 'rgba(255,247,218,.13)');
  beam.addColorStop(1, 'rgba(255,247,218,0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(x + 66, 264);
  ctx.lineTo(x + 234, 264);
  ctx.lineTo(x + 268, GROUND_Y + 10);
  ctx.lineTo(x + 24, GROUND_Y + 10);
  ctx.closePath();
  ctx.fill();
}

/** เตาอบที่ไฟยังติด พร้อมแสงทาบพื้น */
function drawOven(ctx, x, tick, lit) {
  const y = GROUND_Y - 240;
  ctx.save();
  ctx.globalAlpha = lit;
  ctx.drawImage(ovenSprite(), x, y, 300, 240);
  ovenFire(ctx, x, y, tick, lit);
  const pool = ctx.createRadialGradient(x + 150, GROUND_Y - 6, 10, x + 150, GROUND_Y - 6, 230);
  pool.addColorStop(0, 'rgba(255,166,87,.3)');
  pool.addColorStop(1, 'rgba(255,166,87,0)');
  ctx.fillStyle = pool;
  ctx.fillRect(x - 90, GROUND_Y - 120, 480, 140);
  ctx.restore();
}

export function drawBakeryBackdrop(ctx, cam, tick, opts = {}) {
  const lit = clamp01(opts.lit ?? 1);

  // 1) ผนัง
  tileRow(ctx, wallSheet(), 240, cam * 0.04, 0);

  // 2) ชั้นวางของ — ความสว่างคงที่
  // เดิมสว่างตามย่าน ซึ่งอ่านเป็น "ทั้งแถวค่อย ๆ สว่างขึ้นเอง" ทั้งที่กล้องเลื่อนไปข้างหน้าเฉย ๆ
  ctx.save();
  ctx.globalAlpha = 0.92 * lit;
  tileRow(ctx, shelfBand(), TILE, cam * 0.14, 62);
  ctx.restore();

  // 3) ของชิ้นใหญ่: หน้าต่างสลับเตาอบ ไหลเข้าจอจากขวาเสมอ (ดู FIX_GAP ข้างบน)
  placed(cam, FIX_DEPTH, FIX_GAP, 340, (i, x) => {
    if (i % 2 === 0) drawKitchenWindow(ctx, x);
    else drawOven(ctx, x, tick, lit);
  });

  // 5) ราวหม้อกระทะกับพวงไฟ (ชั้นบนสุด)
  ctx.save();
  ctx.globalAlpha = 0.95 * lit;
  tileRow(ctx, hangBand(), TILE, cam * 0.3, -14);
  ctx.restore();

  // 6) เคาน์เตอร์หน้าสุด
  tileRow(ctx, counterBand(), TILE, cam * 0.5, GROUND_Y - COUNTER_H + 18);

  drawAir(ctx, cam, tick);
}

export function warmBakeryArt() {
  wallSheet();
  windowSprite();
  shelfBand();
  ovenSprite();
  hangBand();
  counterBand();
}
