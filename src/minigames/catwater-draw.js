// src/minigames/catwater-draw.js
// ─────────────────────────────────────────────────────────────
// ตัววาดของมินิเกม "แมวหนีน้ำ" — Canvas 2D ล้วน ไม่มีไฟล์ภาพ
//
// ── แยกจาก catwater.js เพราะ ──
// ไฟล์เกมถือ "ความจริง" (ตำแหน่ง น้ำสูงเท่าไหร่ ใครโดนอะไร) ไฟล์นี้แค่อ่านแล้ววาด ไม่แก้สถานะเลย
// จะปรับหน้าตาอย่างไรก็ไม่มีทางทำให้ฟิสิกส์หรือคะแนนเพี้ยน
//
// ── สไตล์ ── (ตาม brief) เส้นขอบน้ำตาลเข้ม #4E3527 หนา ไม่ใช้ดำ · เงาไม่เกิน 3 โทนต่อวัสดุ
// ห้องซักผ้าสะอาด อบอุ่น ปลอดภัย — น้ำใส ๆ การ์ตูน ไม่ใช่น้ำท่วมน่ากลัว
//
// พิกัดทุกอย่างเป็น "หน่วยฉาก" 960×480 (W×H) พื้นห้องอยู่ที่ FLOOR — ผู้เรียกตั้ง transform ย่อขยายให้เอง
// ─────────────────────────────────────────────────────────────
import { setCatEdgeScale, drawPlayer, drawCatPose, drawFish, drawKibble, drawShrimp, drawJelly, drawCrystal, pickupAura } from '../render/entities.js';
import { GROUND_Y, TREATS, foodLook } from '../config.js';
import { t as tr } from '../i18n.js';

export const W = 960;
export const H = 480;
export const FLOOR = 430;
export const INK = '#4E3527';

const TAU = Math.PI * 2;

function rr(c, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + k, y);
  c.arcTo(x + w, y, x + w, y + h, k);
  c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k);
  c.arcTo(x, y, x + w, y, k);
  c.closePath();
}
/** ตัวคูณความหนาเส้นขอบฉาก (ห้อง เฟอร์นิเจอร์ ของ ป้าย) — บางลง 30% ตามที่ผู้ใช้ขอ · ตัวหนังสือ HUD ไม่โดน */
const LINE_K = 0.7;
function ink(c, w = 3) {
  c.strokeStyle = INK;
  c.lineWidth = w * LINE_K;
  c.lineJoin = 'round';
  c.lineCap = 'round';
}
function fillStroke(c, fill, w = 3) {
  c.fillStyle = fill;
  c.fill();
  ink(c, w);
  c.stroke();
}

// ══ ฉากหลัง (วาดครั้งเดียวต่อขนาดผ้าใบ) ═══════════════════════════

/**
 * ผนัง หน้าต่าง ชั้นตกแต่ง บัวเชิงผนัง พื้น — ของนิ่งทั้งหมด
 * วาดล้นนอกกรอบ 960×480 ออกไปด้วย จอที่สัดส่วนไม่ตรง (มือถือยาว/แท็บเล็ตสูง) จะเห็นห้องต่อเนื่อง ไม่มีขอบดำ
 */
export function paintRoom(c) {
  // ผนังครีมอุ่น ไล่บนลงล่าง + กระเบื้องครึ่งล่าง
  const g = c.createLinearGradient(0, 0, 0, FLOOR);
  g.addColorStop(0, '#FFF3DF');
  g.addColorStop(1, '#FBE3C4');
  c.fillStyle = g;
  c.fillRect(-1200, -800, W + 2400, FLOOR + 800);
  // กระเบื้องฟ้าพาสเทลครึ่งล่าง (ห้องซักผ้า) — เส้นยาแนวอ่อน
  const tileTop = 250;
  c.fillStyle = '#DDEFF2';
  c.fillRect(-1200, tileTop, W + 2400, FLOOR - tileTop);
  c.strokeStyle = 'rgba(120,170,180,.35)';
  c.lineWidth = 1.5;
  for (let y = tileTop + 30; y < FLOOR; y += 30) {
    c.beginPath(); c.moveTo(-1200, y); c.lineTo(W + 1200, y); c.stroke();
  }
  for (let x = -1200; x < W + 1200; x += 40) {
    c.beginPath(); c.moveTo(x, tileTop); c.lineTo(x, FLOOR); c.stroke();
  }
  // คิ้วกระเบื้อง
  c.fillStyle = '#B9DCE3';
  c.fillRect(-1200, tileTop - 8, W + 2400, 10);
  ink(c, 2.5);
  c.beginPath(); c.moveTo(-1200, tileTop - 8); c.lineTo(W + 1200, tileTop - 8); c.stroke();
  c.beginPath(); c.moveTo(-1200, tileTop + 2); c.lineTo(W + 1200, tileTop + 2); c.stroke();
  // ลายจุดอุ้งเท้าจาง ๆ บนวอลล์เปเปอร์
  c.fillStyle = 'rgba(232,170,140,.18)';
  for (let i = 0; i < 26; i++) {
    const x = ((i * 137) % (W + 200)) - 100;
    const y = 24 + ((i * 71) % 190);
    c.beginPath(); c.ellipse(x, y, 5, 4, 0, 0, TAU); c.fill();
    for (let k = -1; k <= 1; k++) { c.beginPath(); c.arc(x + k * 5, y - 7 + Math.abs(k) * 2, 2.2, 0, TAU); c.fill(); }
  }

  // หน้าต่างกลางผนัง — ฟ้ากับเมฆ (ตัวจับตาของฉาก)
  const wx = 330, wy = 40, ww = 170, wh = 104;
  rr(c, wx - 8, wy - 8, ww + 16, wh + 16, 14);
  fillStroke(c, '#F6D9AE', 3);
  rr(c, wx, wy, ww, wh, 8);
  const sky = c.createLinearGradient(0, wy, 0, wy + wh);
  sky.addColorStop(0, '#9FD8F5');
  sky.addColorStop(1, '#D9F0FB');
  fillStroke(c, sky, 3);
  c.fillStyle = '#FFFFFF';
  for (const [cx, cy, r] of [[wx + 44, wy + 40, 14], [wx + 62, wy + 34, 18], [wx + 82, wy + 42, 12], [wx + 128, wy + 66, 10], [wx + 142, wy + 62, 13]]) {
    c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill();
  }
  ink(c, 3);
  c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.moveTo(wx, wy + wh / 2); c.lineTo(wx + ww, wy + wh / 2); c.stroke();
  // ม่านสั้นสองข้าง
  for (const s of [-1, 1]) {
    const cx = s < 0 ? wx - 4 : wx + ww + 4;
    c.beginPath();
    c.moveTo(cx, wy - 10);
    c.quadraticCurveTo(cx - s * 34, wy + 30, cx - s * 18, wy + 70);
    c.lineTo(cx, wy + 70);
    c.closePath();
    fillStroke(c, '#F7B7C9', 2.5);
  }
  c.fillStyle = '#E8A07A';
  rr(c, wx - 24, wy - 16, ww + 48, 8, 4);
  fillStroke(c, '#C98A5E', 2.5);

  // ราวตากผ้าเล็ก ๆ ขวาบน + ผ้าขนหนู (ตกแต่ง ไม่ใช่ที่ยืน)
  ink(c, 2);
  c.beginPath(); c.moveTo(600, 70); c.quadraticCurveTo(680, 86, 760, 70); c.stroke();
  for (const [x, col] of [[630, '#FFD27A'], [668, '#A8DDF0'], [706, '#F7B7C9']]) {
    c.beginPath();
    c.moveTo(x, 76); c.lineTo(x + 26, 78); c.lineTo(x + 24, 118); c.lineTo(x + 2, 116); c.closePath();
    fillStroke(c, col, 2);
    c.fillStyle = '#FFFFFF';
    c.fillRect(x + 5, 104, 16, 3);
  }

  // พื้นไม้
  const fg = c.createLinearGradient(0, FLOOR, 0, H + 200);
  fg.addColorStop(0, '#E2B987');
  fg.addColorStop(1, '#C99862');
  c.fillStyle = fg;
  c.fillRect(-1200, FLOOR, W + 2400, 800);
  c.strokeStyle = 'rgba(78,53,39,.18)';
  c.lineWidth = 2;
  for (let x = -1200; x < W + 1200; x += 70) {
    c.beginPath(); c.moveTo(x, FLOOR + 4); c.lineTo(x - 30, H + 200); c.stroke();
  }
  // บัวเชิงผนัง
  c.fillStyle = '#F4E3C8';
  c.fillRect(-1200, FLOOR - 12, W + 2400, 12);
  ink(c, 3);
  c.beginPath(); c.moveTo(-1200, FLOOR - 12); c.lineTo(W + 1200, FLOOR - 12); c.stroke();
  c.beginPath(); c.moveTo(-1200, FLOOR); c.lineTo(W + 1200, FLOOR); c.stroke();
}

// ══ เฟอร์นิเจอร์ = ที่ยืน ═══════════════════════════════════════

/** วาดที่ยืนหนึ่งชิ้นตามชนิด — p.y คือผิวบนที่เท้าเหยียบ (ตรงกับฟิสิกส์) */
export function drawPlatform(c, p, t) {
  let dx = 0;
  // สั่นก่อนจม = สัญญาณเตือน (telegraph) — สั่นแรงขึ้นเรื่อย ๆ จนจม
  if (p.state === 'shake') dx = Math.sin(t * 60) * (1.5 + p.k * 2.5);
  c.save();
  c.translate(dx, p.sink || 0);
  const { x, y, w } = p;
  const bottom = p.wall ? y + 12 : FLOOR;
  switch (p.type) {
    case 'washer': {
      rr(c, x, y, w, bottom - y, 12);
      fillStroke(c, '#FFFFFF');
      c.fillStyle = '#E6EEF2';
      rr(c, x + 6, y + 6, w - 12, 18, 6); c.fill();
      ink(c, 2.5); c.stroke();
      c.fillStyle = '#F7B7C9';
      c.beginPath(); c.arc(x + w - 22, y + 15, 5, 0, TAU); c.fill();
      c.fillStyle = '#9FD8F5';
      c.beginPath(); c.arc(x + w - 38, y + 15, 4, 0, TAU); c.fill();
      // ประตูกลม
      const cx = x + w / 2, cy = y + (bottom - y) * 0.6, r = Math.min(w, bottom - y) * 0.3;
      c.beginPath(); c.arc(cx, cy, r + 6, 0, TAU); fillStroke(c, '#D9E3E8');
      c.beginPath(); c.arc(cx, cy, r, 0, TAU);
      const gl = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      gl.addColorStop(0, '#BFE6F7'); gl.addColorStop(1, '#7FC3E3');
      fillStroke(c, gl, 2.5);
      c.strokeStyle = 'rgba(255,255,255,.75)';
      c.lineWidth = 3;
      c.beginPath(); c.arc(cx, cy, r * 0.65, -2.6, -1.6); c.stroke();
      break;
    }
    case 'basket': {
      c.beginPath();
      c.moveTo(x, y + 6); c.lineTo(x + w, y + 6); c.lineTo(x + w - 7, bottom); c.lineTo(x + 7, bottom); c.closePath();
      fillStroke(c, '#E9B86E');
      c.strokeStyle = 'rgba(78,53,39,.35)';
      c.lineWidth = 2;
      for (let yy = y + 16; yy < bottom - 4; yy += 10) { c.beginPath(); c.moveTo(x + 4, yy); c.lineTo(x + w - 4, yy); c.stroke(); }
      // ผ้าโผล่จากตะกร้า
      c.beginPath(); c.ellipse(x + w * 0.35, y + 4, w * 0.24, 9, -0.2, Math.PI, TAU); fillStroke(c, '#A8DDF0', 2.5);
      c.beginPath(); c.ellipse(x + w * 0.68, y + 5, w * 0.22, 8, 0.25, Math.PI, TAU); fillStroke(c, '#F7B7C9', 2.5);
      rr(c, x - 3, y + 2, w + 6, 8, 4); fillStroke(c, '#D79E52', 2.5);
      break;
    }
    case 'chair': {
      ink(c, 3);
      c.fillStyle = '#C98A5E';
      for (const lx of [x + 6, x + w - 12]) { rr(c, lx, y + 8, 7, bottom - y - 8, 3); fillStroke(c, '#B57748', 2.5); }
      rr(c, x + w - 14, y - 46, 9, 54, 4); fillStroke(c, '#B57748', 2.5);
      rr(c, x + w - 30, y - 50, 32, 10, 5); fillStroke(c, '#D9A06C', 2.5);
      rr(c, x - 2, y, w + 4, 12, 5); fillStroke(c, '#D9A06C');
      c.fillStyle = '#F7B7C9';
      rr(c, x + 6, y - 6, w - 18, 8, 4); fillStroke(c, '#F7B7C9', 2.5);
      break;
    }
    case 'box':
    case 'float': {
      const h = p.type === 'float' ? 30 : bottom - y;
      const wet = p.wetK || 0;
      rr(c, x, y, w, h, 4);
      const col = wet > 0.5 ? '#B98A57' : '#D9A86C';
      fillStroke(c, col);
      c.fillStyle = wet > 0.5 ? '#A57A49' : '#C79358';
      c.fillRect(x + 2, y + 2, w - 4, 7);
      // เทปกาว + ป้ายอุ้งเท้า
      c.fillStyle = 'rgba(255,240,200,.85)';
      c.fillRect(x + w / 2 - 6, y, 12, Math.min(h, 22));
      c.fillStyle = 'rgba(78,53,39,.45)';
      c.beginPath(); c.ellipse(x + w / 2, y + h * 0.62, 5, 4, 0, 0, TAU); c.fill();
      if (wet > 0.05) {
        // คราบน้ำซึมขึ้นจากก้นกล่อง
        c.fillStyle = `rgba(90,140,170,${0.25 * wet})`;
        c.fillRect(x + 2, y + h * (1 - wet * 0.8), w - 4, h * wet * 0.8 - 2);
      }
      break;
    }
    case 'table': {
      for (const lx of [x + 10, x + w - 20]) { rr(c, lx, y + 10, 10, bottom - y - 10, 3); fillStroke(c, '#B57748', 2.5); }
      rr(c, x - 4, y, w + 8, 14, 6); fillStroke(c, '#D9A06C');
      c.fillStyle = '#F2C98F';
      c.fillRect(x, y + 2, w, 3);
      // ผ้าพับซ้อนบนโต๊ะ (ตกแต่ง)
      rr(c, x + w * 0.62, y - 10, 34, 10, 3); fillStroke(c, '#A8DDF0', 2);
      rr(c, x + w * 0.64, y - 18, 30, 8, 3); fillStroke(c, '#FFF3B0', 2);
      break;
    }
    case 'toybox': {
      rr(c, x, y, w, bottom - y, 8); fillStroke(c, '#F7B7C9');
      rr(c, x - 3, y, w + 6, 12, 5); fillStroke(c, '#F49AB3');
      c.fillStyle = '#FFFFFF';
      c.beginPath(); c.arc(x + w / 2, y + (bottom - y) * 0.6, 9, 0, TAU); c.fill();
      c.fillStyle = '#F49AB3';
      c.beginPath(); c.ellipse(x + w / 2, y + (bottom - y) * 0.6 + 2, 3.5, 3, 0, 0, TAU); c.fill();
      break;
    }
    case 'cabinet': {
      rr(c, x, y, w, bottom - y, 8); fillStroke(c, '#C98A5E');
      c.fillStyle = '#B57748';
      c.fillRect(x + 4, y + 4, w - 8, 8);
      for (const dx2 of [0, 1]) {
        rr(c, x + 8 + dx2 * (w / 2 - 4), y + 18, w / 2 - 12, bottom - y - 28, 5);
        fillStroke(c, '#D9A06C', 2.5);
        c.fillStyle = '#FFE48A';
        c.beginPath(); c.arc(x + w / 2 + (dx2 ? 8 : -8), y + (bottom - y) * 0.5, 3.5, 0, TAU); c.fill();
      }
      rr(c, x - 4, y, w + 8, 10, 4); fillStroke(c, '#B57748');
      break;
    }
    case 'shelf':
    case 'ledge': {
      // ชั้นติดผนัง — แผ่นไม้กับขายึดสามเหลี่ยม + ของจุกจิกบนชั้น
      const col = p.type === 'ledge' ? '#F6D9AE' : '#D9A06C';
      for (const bx of [x + 14, x + w - 14]) {
        c.beginPath(); c.moveTo(bx - 6, y + 10); c.lineTo(bx + 6, y + 10); c.lineTo(bx - 6, y + 30); c.closePath();
        fillStroke(c, '#B57748', 2.5);
      }
      rr(c, x, y, w, 12, 5); fillStroke(c, col);
      if (p.type === 'shelf') {
        // ขวดน้ำยาซักผ้าพาสเทล
        for (const [ox, col2, hh] of [[0.18, '#A8DDF0', 22], [0.32, '#FFF3B0', 16]]) {
          rr(c, x + w * ox, y - hh, 14, hh, 4); fillStroke(c, col2, 2);
        }
      }
      break;
    }
    default: {
      rr(c, x, y, w, bottom - y, 6); fillStroke(c, '#D9A06C');
    }
  }
  c.restore();
}

// ══ น้ำ ═══════════════════════════════════════════════════════

/** ผิวน้ำ ณ x — คลื่นเล็ก ๆ สองชั้นซ้อน + คลื่นอีเวนต์ (wave) ที่วิ่งผ่าน */
export function waterY(surface, x, t, crest = null) {
  let y = surface + Math.sin(x * 0.035 + t * 2.2) * 2.2 + Math.sin(x * 0.012 - t * 1.4) * 1.6;
  if (crest) y -= Math.exp(-(((x - crest.x) / 46) ** 2)) * crest.h;
  return y;
}

/** น้ำใสการ์ตูน: ตัวน้ำโปร่ง เงาสะท้อนแถบขาว ฟองอากาศ เส้นผิวน้ำหนา */
export function drawWater(c, surface, t, crest, bubbles) {
  // น้ำอยู่ "บนพื้นห้อง" — ไม่ลงไปทับแถบพื้นไม้ข้างล่างเส้นพื้น (ตอนเริ่มพื้นต้องเห็นชัดว่าแห้ง)
  if (surface >= FLOOR - 1) return;
  const base = FLOOR + 2;
  c.save();
  c.beginPath();
  c.moveTo(-1200, base);
  c.lineTo(-1200, Math.min(base, waterY(surface, -1200, t, crest)));
  for (let x = -40; x <= W + 40; x += 12) c.lineTo(x, Math.min(base, waterY(surface, x, t, crest)));
  c.lineTo(W + 1200, Math.min(base, waterY(surface, W + 1200, t, crest)));
  c.lineTo(W + 1200, base);
  c.closePath();
  const g = c.createLinearGradient(0, surface, 0, FLOOR);
  g.addColorStop(0, 'rgba(126,206,240,.62)');
  g.addColorStop(1, 'rgba(70,160,214,.72)');
  c.fillStyle = g;
  c.fill();
  // เงาสะท้อน: แถบขาวสั้น ๆ ไหลช้า ๆ ใต้ผิวน้ำ
  c.clip();
  c.fillStyle = 'rgba(255,255,255,.28)';
  for (let i = 0; i < 7; i++) {
    const x = ((i * 157 + t * 18) % (W + 160)) - 80;
    const y = surface + 14 + (i % 3) * 16;
    rr(c, x, y, 34 + (i % 2) * 18, 4, 2);
    c.fill();
  }
  // ฟองอากาศ
  c.strokeStyle = 'rgba(255,255,255,.8)';
  c.lineWidth = 1.6;
  for (const b of bubbles) {
    c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.stroke();
  }
  c.restore();
  // เส้นผิวน้ำ: ขาวหนา + ขอบน้ำเงินเข้มบาง (อ่านออกชัดว่าน้ำถึงตรงไหน)
  c.save();
  c.beginPath();
  for (let x = -40; x <= W + 40; x += 12) {
    const y = Math.min(base, waterY(surface, x, t, crest));
    if (x === -40) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.strokeStyle = 'rgba(255,255,255,.95)';
  c.lineWidth = 4;
  c.stroke();
  c.strokeStyle = 'rgba(46,120,170,.55)';
  c.lineWidth = 1.5;
  c.translate(0, 3);
  c.stroke();
  c.restore();
}

// ══ ตัวน้อง ════════════════════════════════════════════════════

/**
 * น้องตอนเล่น — ท่าวิ่งด้านข้างจากในด่าน (drawPlayer) แบบเดียวกับที่บ้านลูกเหมียวใช้ตอนเดิน
 * cat: { x, y(เท้า), dir, vy, onGround, runPhase, speed, mood, shiver, scale, skin }
 */
export function drawCatSide(c, cat) {
  setCatEdgeScale(0.7);   // เส้นตัวน้องบางเท่าฉากห้องซักผ้า
  c.save();
  const jx = cat.shiver ? Math.sin(cat.t * 1.7) * cat.shiver * 1.6 : 0;
  c.translate(cat.x + jx, cat.y - GROUND_Y);
  if (cat.dir < 0) c.scale(-1, 1);
  const fake = {
    box: { x: -20, y: GROUND_Y - 46, w: 40, h: 46 },
    y: GROUND_Y,
    runPhase: cat.runPhase,
    onGround: cat.onGround,
    vy: cat.onGround ? 0 : cat.vy / 75,   // หน่วยของ drawPlayer = พิกเซลต่อเฟรม (60fps)
    tilt: 0, squash: cat.squash || 0, tailLag: Math.sin(cat.runPhase) * 0.3, sliding: false,
  };
  drawPlayer(c, fake, false, cat.skin, !!cat.mouth, 0, cat.mood || '', cat.scale, cat.speed > 0.5 ? 1 : 0.6);
  c.restore();
}

/** น้องหน้าตรง (ฉากเปิด / จบเกม / ทำลายสถิติ) */
export function drawCatFront(c, x, feetY, scale, skin, t, idle) {
  setCatEdgeScale(0.7);
  drawCatPose(c, x, feetY, scale, skin, t, idle);
}

// ══ ของเก็บ = ของกินชุดเดียวกับในด่าน ═══════════════════════════════
// ตัววาดเดิมของเกมหลัก (drawJelly/drawFish/...) ขนาดตาม TREATS/FOOD_LOOK ชุดเดียวกัน หน้าตาจึงตรงกับในด่านเป๊ะ
// ในด่านของกินไม่มีออร่า (ขึ้นทีละหลายสิบชิ้น) แต่ในมินิเกมมีแค่ 1-2 ชิ้นบนจอ จึงใส่ออร่า (pickupAura ตัวเดียวกับไอเทมพลัง)
// สีประจำชนิด — ของยิ่งคะแนนสูง แสงยิ่งเด่น
const TREAT_R = 11;
const AURA_TINT = {
  jelly: 'rgba(255,170,212,A)',
  fish: 'rgba(140,240,226,A)',
  kibble: 'rgba(255,190,120,A)',
  shrimp: 'rgba(255,222,120,A)',
  crystal: 'rgba(196,186,255,A)',
};

export function drawCollectible(c, it, t) {
  const f = t * 60;   // ตัววาดของเกมหลักนับเวลาเป็นเฟรม
  const bob = Math.sin(t * 3 + it.x * 0.05) * 3;
  const x = it.x, y = it.y + bob;
  const r = TREAT_R * foodLook(it.kind);
  const big = TREATS[it.kind]?.scale || 1;
  c.save();
  c.globalAlpha = it.fade == null ? 1 : it.fade;
  pickupAura(c, x, y, r * Math.max(1, big) * (it.kind === 'crystal' ? 0.8 : 1), AURA_TINT[it.kind] || AURA_TINT.fish, f, it.x * 0.02);
  switch (it.kind) {
    case 'jelly': drawJelly(c, x, y, r, f, it.x); break;
    case 'kibble': drawKibble(c, x, y, r, f, it.x); break;
    case 'shrimp': drawShrimp(c, x, y, r * TREATS.shrimp.scale, f); break;
    case 'crystal': drawCrystal(c, x, y, r * TREATS.crystal.scale, f); break;
    default: drawFish(c, x, y, r, f, it.x);
  }
  c.restore();
}

// ══ อีเวนต์ ════════════════════════════════════════════════════

/** ป้ายเตือน (telegraph) — ไอคอนในวงกลมเหลือง กะพริบ */
export function drawWarnBadge(c, x, y, icon, t) {
  const p = 0.75 + 0.25 * Math.sin(t * 14);
  c.save();
  c.globalAlpha = p;
  c.beginPath(); c.arc(x, y, 17, 0, TAU);
  fillStroke(c, '#FFE48A', 3);
  c.font = '18px sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(icon, x, y + 1);
  c.restore();
}

export function drawEvent(c, ev, t) {
  switch (ev.kind) {
    case 'splash': {
      if (ev.phase === 'warn') {
        const x = ev.side < 0 ? 26 : W - 26;
        drawWarnBadge(c, x, ev.y, '💦', t);
        // ลูกศรชี้ทางที่น้ำจะพุ่ง
        ink(c, 3);
        c.beginPath(); c.moveTo(x - ev.side * 24, ev.y); c.lineTo(x - ev.side * 44, ev.y); c.stroke();
      } else if (ev.phase === 'go') {
        c.save();
        c.translate(ev.x, ev.y);
        c.beginPath(); c.ellipse(0, 0, 22, 14, 0, 0, TAU);
        fillStroke(c, 'rgba(126,206,240,.9)', 2.5);
        c.fillStyle = 'rgba(255,255,255,.8)';
        c.beginPath(); c.ellipse(-5 * ev.side, -4, 7, 3, 0, 0, TAU); c.fill();
        for (let i = 1; i <= 3; i++) {
          c.fillStyle = `rgba(126,206,240,${0.6 - i * 0.15})`;
          c.beginPath(); c.arc(ev.side * -i * 16, (i % 2 ? -1 : 1) * 4, 7 - i, 0, TAU); c.fill();
        }
        c.restore();
      }
      break;
    }
    case 'shower': {
      const top = 0;
      // หัวฝักบัวเลื่อนลงมาจากเพดาน
      c.save();
      c.translate(ev.x, top);
      ink(c, 3);
      c.fillStyle = '#D9E3E8';
      rr(c, -4, -10, 8, 26, 3); fillStroke(c, '#D9E3E8', 2.5);
      c.beginPath(); c.ellipse(0, 18, 22, 9, 0, 0, TAU); fillStroke(c, '#E6EEF2', 2.5);
      c.restore();
      if (ev.phase === 'warn') {
        drawWarnBadge(c, ev.x, 52, '🚿', t);
        // หยดน้ำนำร่อง
        c.fillStyle = 'rgba(126,206,240,.8)';
        for (let i = 0; i < 3; i++) {
          const y = 34 + ((t * 160 + i * 60) % 180);
          c.beginPath(); c.ellipse(ev.x - 12 + i * 12, y, 2.5, 4, 0, 0, TAU); c.fill();
        }
      } else if (ev.phase === 'go') {
        const g = c.createLinearGradient(0, 26, 0, FLOOR);
        g.addColorStop(0, 'rgba(160,220,245,.85)');
        g.addColorStop(1, 'rgba(160,220,245,.35)');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(ev.x - 18, 26); c.lineTo(ev.x + 18, 26); c.lineTo(ev.x + ev.w / 2, FLOOR); c.lineTo(ev.x - ev.w / 2, FLOOR);
        c.closePath(); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.7)';
        c.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const xx = ev.x - ev.w / 2 + 10 + i * (ev.w - 20) / 5;
          const off = (t * 420 + i * 47) % 60;
          c.beginPath(); c.moveTo(xx, 40 + off); c.lineTo(xx, 62 + off); c.stroke();
        }
      }
      break;
    }
    case 'bucket': {
      if (ev.phase === 'warn') {
        // เงาวงรีบนที่ที่ถังจะตก + ป้ายเตือน
        c.fillStyle = `rgba(78,53,39,${0.18 + 0.12 * Math.sin(t * 14)})`;
        c.beginPath(); c.ellipse(ev.x, ev.groundY, 30, 7, 0, 0, TAU); c.fill();
        drawWarnBadge(c, ev.x, 40, '🪣', t);
      }
      if (ev.phase === 'go' || ev.phase === 'land') {
        c.save();
        c.translate(ev.x, ev.y);
        c.rotate(ev.rot || 0);
        c.beginPath();
        c.moveTo(-18, -22); c.lineTo(18, -22); c.lineTo(13, 10); c.lineTo(-13, 10); c.closePath();
        fillStroke(c, '#9FD8F5', 3);
        c.fillStyle = '#7FC3E3';
        c.fillRect(-16, -12, 32, 5);
        ink(c, 2.5);
        c.beginPath(); c.arc(0, -22, 16, Math.PI, TAU); c.stroke();
        c.restore();
      }
      break;
    }
    case 'wave': {
      if (ev.phase === 'warn') {
        const x = ev.side < 0 ? 26 : W - 26;
        drawWarnBadge(c, x, ev.surface - 34, '🌊', t);
      }
      break;
    }
    default:
  }
}

// ══ ละออง ═════════════════════════════════════════════════════

export function drawParticles(c, parts) {
  for (const p of parts) {
    const a = Math.max(0, Math.min(1, p.life / p.max));
    c.globalAlpha = a;
    if (p.kind === 'drop' || p.kind === 'splash') {
      c.fillStyle = 'rgba(126,206,240,.95)';
      c.beginPath(); c.ellipse(p.x, p.y, p.r * 0.75, p.r, Math.atan2(p.vy, p.vx) + Math.PI / 2, 0, TAU); c.fill();
    } else if (p.kind === 'dust') {
      c.fillStyle = 'rgba(240,222,196,.9)';
      c.beginPath(); c.arc(p.x, p.y, p.r * (1.6 - a * 0.6), 0, TAU); c.fill();
    } else if (p.kind === 'spark') {
      c.fillStyle = p.color || '#FFE48A';
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.life * 4);
      c.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = i % 2 ? p.r * 0.35 : p.r;
        const ang = (i / 8) * TAU;
        c.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      c.closePath(); c.fill();
      c.restore();
    } else if (p.kind === 'text') {
      c.font = `700 ${p.size || 18}px Mali, sans-serif`;
      c.textAlign = 'center';
      c.lineWidth = 4;
      c.strokeStyle = INK;
      c.strokeText(p.text, p.x, p.y);
      c.fillStyle = p.color || '#FFF6D8';
      c.fillText(p.text, p.x, p.y);
    }
  }
  c.globalAlpha = 1;
}

// ══ HUD ═══════════════════════════════════════════════════════

function pill(c, x, y, w, h, label, value, align) {
  rr(c, x, y, w, h, h / 2);
  c.fillStyle = 'rgba(255,248,232,.92)';
  c.fill();
  ink(c, 3);
  c.stroke();
  c.fillStyle = INK;
  c.textBaseline = 'middle';
  c.textAlign = align;
  c.font = '700 13px Mali, sans-serif';
  c.fillText(label, align === 'left' ? x + 16 : x + w - 16, y + h * 0.3);
  c.font = '800 21px Mali, sans-serif';
  c.fillText(value, align === 'left' ? x + 16 : x + w - 16, y + h * 0.68);
}

const fmtTime = (s) => {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};
export { fmtTime };

/**
 * แถบบน: เวลารอด (ซ้าย) / คะแนน (ขวา) / คอมโบ (กลาง) / ป้ายเตือนน้ำสูง
 * ปุ่มหยุด/ปิด (DOM) อยู่มุมขวาบน — เว้นที่ให้มันด้วย padR
 */
export function drawHud(c, s, view) {
  const top = view.top + 10;
  const left = view.left + 12;
  const right = view.right - 12 - view.padR;
  pill(c, left, top, 128, 50, tr('💦 รอด'), fmtTime(s.time), 'left');
  drawHearts(c, left + 6, top + 64, s);
  pill(c, right - 150, top, 150, 50, tr('⭐ คะแนน'), s.score.toLocaleString('en-US'), 'right');
  if (s.combo.tier) {
    const k = Math.min(1, s.combo.pop);
    c.save();
    c.translate(W / 2, top + 26);
    c.scale(1 + k * 0.25, 1 + k * 0.25);
    c.font = '800 24px Mali, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 6;
    c.strokeStyle = INK;
    const txt = `${s.combo.tier} x${s.combo.mult}`;
    c.strokeText(txt, 0, 0);
    c.fillStyle = s.combo.mult >= 5 ? '#FF9FD2' : s.combo.mult >= 3 ? '#FFE48A' : '#9DF2C8';
    c.fillText(txt, 0, 0);
    c.restore();
  }
  if (s.critical) {
    const p = 0.6 + 0.4 * Math.sin(s.clock * 9);
    c.save();
    c.globalAlpha = p;
    rr(c, W / 2 - 92, top + 46, 184, 32, 16);
    fillStroke(c, '#FF8A8A', 3);
    c.fillStyle = '#FFFFFF';
    c.font = '800 16px Mali, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(tr('⚠️ น้ำสูงมาก!'), W / 2, top + 62);
    c.restore();
  }
}

/** รูปหัวใจขนาด r รอบจุด (0,0) */
function heartPath(c, r) {
  c.beginPath();
  c.moveTo(0, r * 0.9);
  c.bezierCurveTo(-r * 1.25, r * 0.05, -r * 0.95, -r * 0.95, 0, -r * 0.35);
  c.bezierCurveTo(r * 0.95, -r * 0.95, r * 1.25, r * 0.05, 0, r * 0.9);
  c.closePath();
}

/**
 * หัวใจชีวิตใต้เวลารอด — เต็ม = แดงชมพูมีไฮไลต์ / หมด = โครงจาง
 * ดวงที่เพิ่งหาย: แตกเป็นสองซีก (รอยร้าวซิกแซก) แยกออกข้าง หมุน ร่วง แล้วจาง พร้อมเศษชิ้นเล็ก
 */
export function drawHearts(c, x, y, s) {
  const R = 12, GAP = 30;
  for (let i = 0; i < s.max; i++) {
    const cx = x + R + i * GAP;
    const fx = s.heartFx.find((h) => h.i === i);
    c.save();
    c.translate(cx, y);
    if (i < s.hearts) {
      // หัวใจดวงสุดท้ายเต้นตุบ ๆ เตือนว่าเหลือดวงเดียว
      const beat = s.hearts === 1 ? 1 + Math.max(0, Math.sin(s.clock * 8)) * 0.12 : 1;
      c.scale(beat, beat);
      heartPath(c, R);
      fillStroke(c, '#FF6F91', 2.6);
      c.fillStyle = 'rgba(255,255,255,.7)';
      c.beginPath(); c.ellipse(-R * 0.42, -R * 0.28, R * 0.22, R * 0.14, -0.6, 0, TAU); c.fill();
    } else if (fx) {
      const k = fx.t / 1.1;
      // ช่วงแรกสั่น+ร้าว แล้วแยกสองซีก
      const split = Math.max(0, (fx.t - 0.12) / 0.98);
      const shakeX = fx.t < 0.12 ? Math.sin(fx.t * 140) * 2 : 0;
      c.globalAlpha = 1 - Math.max(0, (k - 0.55) / 0.45);
      for (const side of [-1, 1]) {
        c.save();
        c.translate(shakeX + side * split * 14, split * split * 30);
        c.rotate(side * split * 0.7);
        // ครึ่งซีกด้วยการตัดตามรอยร้าวซิกแซกกลางดวง
        c.beginPath();
        c.moveTo(0, -R * 0.35);
        c.lineTo(side * -R * 0.15, -R * 0.05);
        c.lineTo(side * R * 0.12, R * 0.22);
        c.lineTo(side * -R * 0.08, R * 0.5);
        c.lineTo(0, R * 0.9);
        c.lineTo(side * R * 1.6, R * 0.9);
        c.lineTo(side * R * 1.6, -R * 1.2);
        c.closePath();
        c.clip();
        heartPath(c, R);
        fillStroke(c, '#FF6F91', 2.6);
        c.restore();
      }
      // เศษชิ้นเล็กกระจาย
      c.fillStyle = '#FF9FB5';
      for (let j = 0; j < 5; j++) {
        const ang = -Math.PI / 2 + (j - 2) * 0.55;
        const d = split * (16 + j * 3);
        c.beginPath();
        c.arc(Math.cos(ang) * d, Math.sin(ang) * d + split * split * 26, 2.2 * (1 - k * 0.6), 0, TAU);
        c.fill();
      }
    } else {
      heartPath(c, R);
      c.fillStyle = 'rgba(78,53,39,.18)';
      c.fill();
      c.strokeStyle = 'rgba(78,53,39,.45)';
      c.lineWidth = 2;
      c.setLineDash([3, 3]);
      c.stroke();
      c.setLineDash([]);
    }
    c.restore();
  }
}

/** ตัวเลขนับถอยหลังกลางจอ — เด้งเข้าแล้วจาง */
export function drawCountdown(c, label, k) {
  c.save();
  c.globalAlpha = Math.min(1, (1 - k) * 2.2);
  c.translate(W / 2, H * 0.42);
  const sc = 0.7 + Math.min(1, k * 4) * 0.5;
  c.scale(sc, sc);
  c.font = '800 72px Mali, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = 10;
  c.strokeStyle = INK;
  c.strokeText(label, 0, 0);
  c.fillStyle = label === 'GO!' ? '#9DF2C8' : '#FFE48A';
  c.fillText(label, 0, 0);
  c.restore();
}

/** ฟองคำพูดของน้อง (ฉากเปิด) */
export function drawSpeech(c, x, y, text) {
  c.save();
  c.font = '700 17px Mali, sans-serif';
  const w = c.measureText(text).width + 30;
  rr(c, x - w / 2, y - 40, w, 36, 18);
  fillStroke(c, '#FFFDF7', 3);
  c.beginPath(); c.moveTo(x - 8, y - 5); c.lineTo(x + 2, y + 8); c.lineTo(x + 8, y - 5); c.closePath();
  c.fillStyle = '#FFFDF7'; c.fill();
  ink(c, 3);
  c.beginPath(); c.moveTo(x - 8, y - 4); c.lineTo(x + 2, y + 8); c.lineTo(x + 8, y - 4); c.stroke();
  c.fillStyle = INK;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, x, y - 22);
  c.restore();
}
