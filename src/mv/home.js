// src/mv/home.js
// ─────────────────────────────────────────────────────────────
// บ้านของเหมียว — แถบยาวแถบเดียว ซ้ายไปขวา (ดูผังใน STORYBOARD.md หัวข้อ E)
//
// ── ทำไมเป็นแถบเดียว ไม่ใช่ฉากแยกทีละห้อง ──
// บรีฟย้ำเรื่องความต่อเนื่องมากที่สุด: ห้ามให้ของย้ายที่ ห้ามโลกดูเป็นฉากแยกกัน
// วาดบ้านทั้งหลังเป็นโลกเดียว แล้วให้กล้องเลื่อนไปดูทีละส่วน ของทุกชิ้นจึงอยู่ที่เดิม
// เสมอโดยอัตโนมัติ — ฉากไหนเห็นโซฟา โซฟาก็อยู่ตำแหน่งเดียวกับฉากอื่นเป๊ะ
//
// พิกัดโลก: พื้นห้อง (โคนผนัง) = y 0 · ขึ้นข้างบน = ติดลบ · เพดาน = -830
// 1 หน่วย ≈ 3 มม. ลูกแมวยืนสูง ~46 หน่วย (ขนาดเดียวกับตัวเกมที่ scale 1)
// ─────────────────────────────────────────────────────────────
import { hash } from './anim.js';

/** ตำแหน่งของทุกชิ้นในบ้าน — ฉากไหนจะวางตัวละครข้างของชิ้นไหน อ่านจากตรงนี้ */
export const HOME = {
  ceil: -830,
  /** ตัวละครเดินบนพื้นห่างผนังออกมานิดหนึ่ง (อยู่หน้าเฟอร์นิเจอร์เสมอ) */
  walkY: 44,
  window: { x0: 40, x1: 340, y0: -720, y1: -285 },
  bench: { x0: 16, x1: 364, top: -150 },
  cushion: { x: 190, top: -168 },
  sofa: { x0: 700, x1: 1150, seat: -142, back: -318 },
  rug: { x0: 640, x1: 1320 },
  arch1: { x0: 1420, x1: 1580 },
  // ── โถง / ห้องกินข้าว ──
  door: { x0: 1680, x1: 1840, top: -600 },
  table: { x0: 1990, x1: 2310, top: -250 },
  chairs: [{ x: 1950, dir: 1 }, { x: 2350, dir: -1 }],
  arch2: { x0: 2440, x1: 2600 },
  // ── ครัว ──
  counter: { x0: 2640, x1: 3300, top: -300 },
  stove: { x: 2980 },
  bowl: { x: 2830 },
  wallEnd: 3500,
};

export const PAL = {
  wall: '#FCEBDA',
  wallLow: '#F4D5BE',
  trim: '#E9BD9C',
  base: '#D89C7B',
  floor: '#E3B089',
  floorFar: '#D29A70',
  plank: 'rgba(150,90,55,.28)',
  line: '#7A5242',
  frame: '#FFF6EA',
  cushion: '#F7A9BB',
  cushionLite: '#FFD0DA',
  sofa: '#9DC8B2',
  sofaDark: '#7FB09A',
  sofaLite: '#BFE0CD',
  wood: '#C98C62',
  woodDark: '#A96F4B',
  curtain: '#FFD9A6',
  curtainDark: '#F2BC7D',
  sun: '255,244,206',
};

const ln = (ctx, w = 3) => { ctx.strokeStyle = PAL.line; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; };
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

/**
 * วาดบ้าน (ส่วนที่อยู่หลังตัวละคร)
 * t = วินาที · door = ประตูหน้าบ้านเปิดแค่ไหน 0..1 (ฉาก 3) · sun = ความชันของแดด (ลำแสงเลื่อนไปทางขวาเท่านี้ต่อความสูงหนึ่งหน่วย)
 *   ตอนเช้าแดดต่ำ ลำแสงยาวเอียงมาก · สายขึ้นแดดสูงขึ้น ลำแสงสั้นลง (ดูฉาก 6)
 */
export function drawHomeBack(ctx, t, sun = 0.55, door = 0) {
  wallAndFloor(ctx);
  shelf(ctx, -390);
  windowView(ctx, t);
  pictures(ctx);
  sofa(ctx);
  lamp(ctx, 1250);
  arch(ctx, HOME.arch1);
  frontDoor(ctx, door);
  diningSet(ctx);
  arch(ctx, HOME.arch2);
  kitchen(ctx);
  bench(ctx);
  curtains(ctx, t);
  sunbeam(ctx, t, sun);
}

function wallAndFloor(ctx) {
  const X0 = -1400, X1 = 4200;
  ctx.fillStyle = PAL.wall;
  ctx.fillRect(X0, HOME.ceil - 400, X1 - X0, -HOME.ceil + 400);
  // ผนังท่อนล่าง (บัวผนัง) สีเข้มกว่า ให้ห้องมีระดับ ไม่ใช่ผนังแผ่นเดียวโล่ง ๆ
  ctx.fillStyle = PAL.wallLow;
  ctx.fillRect(X0, -230, X1 - X0, 230);
  ctx.fillStyle = PAL.trim;
  ctx.fillRect(X0, -236, X1 - X0, 10);
  // ลายจุดบนวอลเปเปอร์ — จาง ๆ พอให้ผนังมีผิว
  ctx.fillStyle = 'rgba(233,178,150,.35)';
  for (let x = X0; x < X1; x += 90) {
    for (let y = HOME.ceil + 40, r = 0; y < -260; y += 80, r++) {
      ctx.beginPath(); ctx.arc(x + (r % 2) * 45, y, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.fillStyle = PAL.base;
  ctx.fillRect(X0, -16, X1 - X0, 16);
  // พื้นไม้ — มุมมองก้มนิด ๆ พื้นยื่นเข้าหาคนดู ไกล (โคนผนัง) สีเข้มกว่าใกล้
  const g = ctx.createLinearGradient(0, 0, 0, 260);
  g.addColorStop(0, PAL.floorFar); g.addColorStop(1, PAL.floor);
  ctx.fillStyle = g;
  ctx.fillRect(X0, 0, X1 - X0, 400);
  ctx.strokeStyle = PAL.plank; ctx.lineWidth = 2;
  for (const y of [22, 52, 92, 144, 210]) { ctx.beginPath(); ctx.moveTo(X0, y); ctx.lineTo(X1, y); ctx.stroke(); }
  for (let i = 0; i < 90; i++) {
    const row = i % 5, y0 = [0, 22, 52, 92, 144][row], y1 = [22, 52, 92, 144, 210][row];
    const x = X0 + ((i * 263 + row * 97) % (X1 - X0));
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
  }
}

function windowView(ctx, t) {
  const { x0, x1, y0, y1 } = HOME.window;
  const w = x1 - x0, h = y1 - y0;
  ctx.save();
  rr(ctx, x0, y0, w, h, 16); ctx.clip();
  // ฟ้ายามเช้า: ฟ้าอ่อนบน → พีชใกล้ขอบฟ้า
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#BFE6F7'); g.addColorStop(0.62, '#E8F3F2'); g.addColorStop(1, '#FFE5C8');
  ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
  // ดวงอาทิตย์ต่ำ ๆ มุมซ้ายล่าง = ต้นลำแสงที่เอียงลงขวาในห้อง
  const sg = ctx.createRadialGradient(x0 + 40, y1 - 90, 4, x0 + 40, y1 - 90, 150);
  sg.addColorStop(0, 'rgba(255,250,220,1)'); sg.addColorStop(0.25, 'rgba(255,238,190,.7)'); sg.addColorStop(1, 'rgba(255,238,190,0)');
  ctx.fillStyle = sg; ctx.fillRect(x0, y0, w, h);
  // เมฆลอยช้า ๆ — เลื่อนตามเวลาจริง หน้าต่างจึงไม่ใช่ภาพนิ่ง
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  for (let i = 0; i < 3; i++) {
    const cx = x0 + ((i * 140 + t * 6) % (w + 160)) - 60, cy = y0 + 70 + i * 55;
    for (const [dx, dy, r] of [[0, 0, 20], [22, -8, 24], [46, 0, 18], [24, 6, 18]]) {
      ctx.beginPath(); ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  // ยอดไม้นอกบ้านไหวตามลม
  for (let i = 0; i < 4; i++) {
    const cx = x0 + 30 + i * 85, cy = y1 - 30 - (i % 2) * 26, sway = Math.sin(t * 0.9 + i) * 3;
    ctx.fillStyle = i % 2 ? '#A9D8A0' : '#93CB8C';
    ctx.beginPath(); ctx.arc(cx + sway, cy, 52, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // กรอบ + ไม้แบ่งช่อง
  ln(ctx, 4);
  ctx.fillStyle = PAL.frame;
  ctx.beginPath(); ctx.roundRect(x0 - 16, y0 - 16, w + 32, h + 32, 24); ctx.roundRect(x0, y0, w, h, 16); ctx.fill('evenodd'); ctx.stroke();
  rr(ctx, x0, y0, w, h, 16); ctx.stroke();
  ctx.fillStyle = PAL.frame;
  rr(ctx, x0 + w / 2 - 7, y0, 14, h, 4); ctx.fill(); ctx.stroke();
  rr(ctx, x0, y0 + h * 0.42 - 7, w, 14, 4); ctx.fill(); ctx.stroke();
  // ประกายบนกระจก
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(x0 + 26, y0 + 60); ctx.lineTo(x0 + 70, y0 + 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x0 + w / 2 + 30, y0 + h * 0.42 + 50); ctx.lineTo(x0 + w / 2 + 60, y0 + h * 0.42 + 22); ctx.stroke();
  // ขอบหน้าต่างล่าง
  ctx.fillStyle = PAL.frame; ln(ctx, 3);
  rr(ctx, x0 - 30, y1 + 12, w + 60, 16, 6); ctx.fill(); ctx.stroke();
}

function curtains(ctx, t) {
  const { x0, x1, y0 } = HOME.window;
  const rodY = y0 - 46, bottom = HOME.bench.top - 14;
  // ราวม่าน
  ln(ctx, 3);
  ctx.fillStyle = PAL.woodDark;
  rr(ctx, x0 - 60, rodY - 6, x1 - x0 + 120, 12, 6); ctx.fill(); ctx.stroke();
  for (const x of [x0 - 64, x1 + 64]) { ctx.beginPath(); ctx.arc(x, rodY, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  // สองผืน: ผืนซ้ายรวบชิดซ้าย ผืนขวารวบชิดขวา ชายม่านพลิ้วตามลมคนละจังหวะ
  for (const [side, xa, xb] of [[-1, x0 - 50, x0 + 34], [1, x1 - 34, x1 + 50]]) {
    const wind = Math.sin(t * 1.3 + side) * 10 + Math.sin(t * 2.7) * 4;
    const hem = side * -wind * 0.6 + wind;
    ctx.fillStyle = PAL.curtain; ln(ctx, 3);
    ctx.beginPath();
    ctx.moveTo(xa, rodY);
    ctx.lineTo(xb, rodY);
    ctx.quadraticCurveTo(xb + hem * 0.4, (rodY + bottom) / 2, xb + hem, bottom);
    // ชายม่านเป็นคลื่น
    const n = 4, span = (xa - xb);
    for (let i = 1; i <= n; i++) {
      const x = xb + hem + (span * i) / n;
      ctx.quadraticCurveTo(x - span / n / 2, bottom + 10, x, bottom);
    }
    ctx.quadraticCurveTo(xa + hem * 0.4, (rodY + bottom) / 2, xa, rodY);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // จีบผ้า
    ctx.strokeStyle = PAL.curtainDark; ctx.lineWidth = 4;
    for (let i = 1; i < 4; i++) {
      const x = xa + ((xb - xa) * i) / 4;
      ctx.beginPath(); ctx.moveTo(x, rodY + 10);
      ctx.quadraticCurveTo(x + hem * 0.3, (rodY + bottom) / 2, x + hem * (0.6 + i * 0.1), bottom - 6);
      ctx.stroke();
    }
  }
}

function bench(ctx) {
  const { x0, x1, top } = HOME.bench;
  // ม้านั่งริมหน้าต่างแบบกล่องไม้ — ฝาเป็นที่นั่ง ตัวกล่องมีบานตู้สองบาน
  ln(ctx, 3);
  ctx.fillStyle = PAL.wood;
  ctx.fillRect(x0, top, x1 - x0, -top); ctx.strokeRect(x0, top, x1 - x0, -top);
  ctx.fillStyle = PAL.woodDark;
  rr(ctx, x0 - 8, top - 14, x1 - x0 + 16, 16, 6); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(122,82,66,.55)'; ctx.lineWidth = 3;
  const mid = (x0 + x1) / 2;
  for (const [a, b] of [[x0 + 18, mid - 8], [mid + 8, x1 - 18]]) {
    rr(ctx, a, top + 22, b - a, -top - 46, 8); ctx.stroke();
    ctx.fillStyle = PAL.line; ctx.beginPath(); ctx.arc(a + (b - a) / 2, top + 50, 5, 0, Math.PI * 2); ctx.fill();
  }
  // เบาะกลมของเหมียว
  const c = HOME.cushion;
  ctx.fillStyle = PAL.cushion; ln(ctx, 3);
  ctx.beginPath(); ctx.ellipse(c.x, c.top + 8, 78, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAL.cushionLite;
  ctx.beginPath(); ctx.ellipse(c.x, c.top + 3, 58, 8, 0, 0, Math.PI * 2); ctx.fill();
}

function shelf(ctx, x) {
  // ชั้นหนังสือเตี้ย + กระถางต้นไม้ ทางซ้ายของหน้าต่าง
  ln(ctx, 3);
  ctx.fillStyle = PAL.wood;
  rr(ctx, x, -330, 230, 330, 8); ctx.fill(); ctx.stroke();
  const books = ['#F4A6A0', '#9CC8E8', '#F7D57A', '#B9A4E2', '#9DD3B5', '#F6B98A'];
  for (let r = 0; r < 2; r++) {
    const y = -310 + r * 160;
    ctx.fillStyle = PAL.woodDark; ctx.fillRect(x + 12, y + 130, 206, 10);
    let bx = x + 16;
    for (let i = 0; i < 7; i++) {
      const bw = 18 + (i * 7 + r * 3) % 12, bh = 90 + ((i * 13 + r * 5) % 36);
      ctx.fillStyle = books[(i + r * 2) % books.length];
      const lean = i === 5 ? 0.18 : 0;
      ctx.save(); ctx.translate(bx, y + 130); ctx.rotate(lean);
      ctx.fillRect(0, -bh, bw, bh); ctx.strokeRect(0, -bh, bw, bh);
      ctx.restore();
      bx += bw + 3;
    }
  }
  // กระถาง
  ctx.fillStyle = '#E88F6E';
  ctx.beginPath(); ctx.moveTo(x + 70, -330); ctx.lineTo(x + 160, -330); ctx.lineTo(x + 150, -392); ctx.lineTo(x + 80, -392); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#7CC08A';
  for (const [dx, dy, r, a] of [[0, -40, 32, 0], [-30, -20, 26, -0.5], [32, -24, 28, 0.5], [0, -76, 24, 0]]) {
    ctx.beginPath(); ctx.ellipse(x + 115 + dx, -392 + dy, r * 0.6, r, a, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
}

function pictures(ctx) {
  // กรอบรูปบนผนังสองกรอบ — รูปวาดแมว (เจ้าของรักแมว) กับรูปดวงอาทิตย์
  ln(ctx, 3);
  for (const [x, y, w, h, kind] of [[470, -560, 120, 150, 'cat'], [610, -520, 90, 90, 'sun']]) {
    ctx.fillStyle = PAL.woodDark; rr(ctx, x - 10, y - 10, w + 20, h + 20, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFF8EE'; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
    if (kind === 'cat') {
      ctx.fillStyle = '#FF9538';   // รูปวาดน้องส้มเอง
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.66, 30, 26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.38, 22, 0, Math.PI * 2); ctx.fill();
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + w / 2 + s * 8, y + h * 0.3); ctx.lineTo(x + w / 2 + s * 22, y + h * 0.16); ctx.lineTo(x + w / 2 + s * 21, y + h * 0.36); ctx.fill(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.7, 13, 14, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#FFC857';
      ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, 20, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#FFC857'; ctx.lineWidth = 4;
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x + w / 2 + Math.cos(a) * 27, y + h / 2 + Math.sin(a) * 27); ctx.lineTo(x + w / 2 + Math.cos(a) * 36, y + h / 2 + Math.sin(a) * 36); ctx.stroke(); }
    }
  }
}

function sofa(ctx) {
  const { x0, x1, seat, back } = HOME.sofa;
  ln(ctx, 3);
  // ขาโซฟา
  ctx.fillStyle = PAL.woodDark;
  for (const x of [x0 + 30, x1 - 44]) { ctx.fillRect(x, -30, 14, 30); ctx.strokeRect(x, -30, 14, 30); }
  // พนักพิง
  ctx.fillStyle = PAL.sofaDark;
  rr(ctx, x0 + 40, back, x1 - x0 - 80, seat - back + 20, 36); ctx.fill(); ctx.stroke();
  // เบาะพิงสองใบ
  ctx.fillStyle = PAL.sofa;
  const mid = (x0 + x1) / 2;
  for (const [a, b] of [[x0 + 62, mid - 4], [mid + 4, x1 - 62]]) { rr(ctx, a, back + 20, b - a, seat - back - 16, 28); ctx.fill(); ctx.stroke(); }
  // ฐานที่นั่ง
  ctx.fillStyle = PAL.sofaDark;
  rr(ctx, x0 + 10, seat + 18, x1 - x0 - 20, -seat - 48, 18); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAL.sofa;
  for (const [a, b] of [[x0 + 48, mid - 2], [mid + 2, x1 - 48]]) { rr(ctx, a, seat, b - a, 30, 14); ctx.fill(); ctx.stroke(); }
  // ท้าวแขน
  for (const x of [x0, x1 - 64]) {
    ctx.fillStyle = PAL.sofa;
    rr(ctx, x, seat - 70, 64, 110, 30); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAL.sofaLite; rr(ctx, x + 10, seat - 62, 44, 18, 9); ctx.fill();
  }
  // หมอนอิงสีครีมใบเดียว
  ctx.fillStyle = '#FFE7C2';
  ctx.save(); ctx.translate(x1 - 130, seat - 34); ctx.rotate(0.18);
  rr(ctx, -34, -34, 68, 64, 18); ctx.fill(); ctx.stroke(); ctx.restore();
}

function lamp(ctx, x) {
  ln(ctx, 3);
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(x, -8); ctx.lineTo(x, -460); ctx.stroke();
  ctx.fillStyle = PAL.woodDark; ln(ctx, 3);
  ctx.beginPath(); ctx.ellipse(x, -6, 46, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#FFF1C9';
  ctx.beginPath(); ctx.moveTo(x - 44, -440); ctx.lineTo(x + 44, -440); ctx.lineTo(x + 30, -530); ctx.lineTo(x - 30, -530); ctx.closePath(); ctx.fill(); ctx.stroke();
}

function arch(ctx, { x0, x1 }) {
  const top = -560, w = x1 - x0;
  ctx.fillStyle = '#E7C4AC'; ln(ctx, 4);
  ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, top + w / 2); ctx.arc(x0 + w / 2, top + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x1, 0); ctx.closePath();
  ctx.fill(); ctx.stroke();
  // โถงข้างหลังสว่างกว่านิด ๆ (มีแสงจากประตูหน้าบ้าน)
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, 'rgba(255,240,220,.0)'); g.addColorStop(1, 'rgba(255,240,220,.55)');
  ctx.fillStyle = g; ctx.fill();
}

function sunbeam(ctx, t, s) {
  const { x0, x1, y0, y1 } = HOME.window;
  // ลำแสง = เงาของกระจกที่ถูกยืดลงพื้นตามมุมแดด (ขอบบนกระจก → ไกล · ขอบล่าง → ใกล้)
  const foot = (x, y) => [x + (0 - y) * s, 0];
  const A = [x0, y0], B = [x1, y0], C = [x0, y1];
  const B2 = foot(...B), C2 = foot(...C);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createLinearGradient(x0, y0, B2[0], 0);
  const pulse = 0.9 + Math.sin(t * 0.5) * 0.1;
  g.addColorStop(0, `rgba(${PAL.sun},${0.55 * pulse})`);
  g.addColorStop(1, `rgba(${PAL.sun},${0.12 * pulse})`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...B); ctx.lineTo(...B2); ctx.lineTo(...C2); ctx.lineTo(...C); ctx.closePath(); ctx.fill();
  // แผ่นแสงบนพื้น
  ctx.fillStyle = `rgba(${PAL.sun},.45)`;
  ctx.beginPath(); ctx.moveTo(C2[0], 0); ctx.lineTo(B2[0], 0); ctx.lineTo(B2[0] + 60, 60); ctx.lineTo(C2[0] + 30, 60); ctx.closePath(); ctx.fill();
  ctx.restore();

  // ฝุ่นในแสง — ลอยช้า ๆ วิบวับ อยู่เฉพาะในลำแสง
  ctx.save();
  for (let i = 0; i < 70; i++) {
    const u = hash(i), v = hash(i + 50);
    const y = y0 + ((v * (0 - y0) + -t * (4 + u * 5)) % (0 - y0) + (0 - y0)) % (0 - y0);
    // ขอบซ้ายของลำแสง = ขอบกระจกด้านซ้าย จนพ้นขอบล่างกระจกแล้วเอียงตามแดด · ขอบขวาเอียงตลอด
    const left = y < y1 ? x0 : x0 + (y - y1) * s;
    const right = x1 + (y - y0) * s;
    const x = left + ((u * 997) % 1) * (right - left) + Math.sin(t * 0.6 + i) * 12;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.8 + u) + i * 1.7));
    ctx.fillStyle = `rgba(255,252,236,${0.75 * tw})`;
    ctx.beginPath(); ctx.arc(x, y, 1.6 + u * 1.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ── โถง: ประตูหน้าบ้าน ─────────────────────────────────────
function frontDoor(ctx, open) {
  const { x0, x1, top } = HOME.door;
  const w = x1 - x0;
  ln(ctx, 4);
  ctx.fillStyle = PAL.frame;
  rr(ctx, x0 - 18, top - 18, w + 36, -top + 18, 10); ctx.fill(); ctx.stroke();
  // ช่องประตู — เห็นแสงข้างนอกเมื่อเปิด
  ctx.fillStyle = '#FFF4DA';
  ctx.fillRect(x0, top, w, -top); ctx.strokeRect(x0, top, w, -top);
  // บานประตู — เปิดด้วยการบีบความกว้าง (บานหมุนเข้าหาผนัง)
  const dw = w * (1 - open * 0.82);
  ctx.fillStyle = '#C98C62';
  rr(ctx, x0, top, dw, -top, 6); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(122,82,66,.5)'; ctx.lineWidth = 3;
  rr(ctx, x0 + dw * 0.15, top + 250, dw * 0.7, 250, 8); ctx.stroke();
  ctx.fillStyle = '#CFEAF5'; ln(ctx, 3);
  ctx.beginPath(); ctx.ellipse(x0 + dw / 2, top + 125, dw * 0.22, 50, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#F2C14E';
  ctx.beginPath(); ctx.arc(x0 + dw - 22, -300, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // พรมเช็ดเท้า
  ctx.fillStyle = '#F4A6A0';
  ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, 30, 110, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // ที่แขวนกุญแจ + ร่มพิงผนัง
  ctx.fillStyle = PAL.woodDark;
  rr(ctx, x1 + 40, -470, 90, 18, 6); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#8FB8DE'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(x1 + 70, -20); ctx.lineTo(x1 + 60, -210); ctx.stroke();
  ctx.fillStyle = '#8FB8DE'; ln(ctx, 3);
  ctx.beginPath(); ctx.moveTo(x1 + 60, -210); ctx.lineTo(x1 + 30, -60); ctx.lineTo(x1 + 95, -60); ctx.closePath(); ctx.fill(); ctx.stroke();
}

// ── โถง: โต๊ะกินข้าว + เก้าอี้สองตัว ───────────────────────
// มองด้านข้าง: แผ่นโต๊ะกับขาสองขา ใต้โต๊ะโล่งเป็น "อุโมงค์" ให้ลูกแมววิ่งลอด (ฉาก 2, 3)
function diningSet(ctx) {
  const { x0, x1, top } = HOME.table;
  ln(ctx, 3);
  for (const c of HOME.chairs) chair(ctx, c.x, c.dir);
  ctx.fillStyle = PAL.woodDark;
  for (const x of [x0 + 24, x1 - 44]) { ctx.fillRect(x, top, 20, -top); ctx.strokeRect(x, top, 20, -top); }
  ctx.fillStyle = PAL.wood;
  rr(ctx, x0 - 10, top - 18, x1 - x0 + 20, 20, 6); ctx.fill(); ctx.stroke();
  // ผ้าปูโต๊ะลายทาง ห้อยลงมานิดหนึ่ง
  ctx.fillStyle = '#FFE3A8';
  rr(ctx, x0 + 30, top - 22, x1 - x0 - 60, 46, 6); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(240,160,120,.6)'; ctx.lineWidth = 3;
  for (let x = x0 + 50; x < x1 - 30; x += 30) { ctx.beginPath(); ctx.moveTo(x, top - 20); ctx.lineTo(x, top + 22); ctx.stroke(); }
  // แจกันดอกไม้
  const mx = (x0 + x1) / 2;
  ln(ctx, 3); ctx.fillStyle = '#9CC8E8';
  rr(ctx, mx - 20, top - 80, 40, 60, 12); ctx.fill(); ctx.stroke();
  for (const [dx, dy, c] of [[-22, -104, '#F7A9BB'], [0, -122, '#FFC857'], [22, -100, '#F4A6A0']]) {
    ctx.strokeStyle = '#7CC08A'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(mx, top - 76); ctx.lineTo(mx + dx, top + dy + 14); ctx.stroke();
    ctx.fillStyle = c; ln(ctx, 3);
    ctx.beginPath(); ctx.arc(mx + dx, top + dy + 6, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
}

function chair(ctx, x, dir) {
  // dir = ด้านที่หันเข้าหาโต๊ะ · พนักพิงอยู่ฝั่งตรงข้าม
  ctx.save(); ctx.translate(x, 0); ctx.scale(dir, 1);
  ln(ctx, 3);
  ctx.fillStyle = PAL.woodDark;
  for (const lx of [-48, 30]) { ctx.fillRect(lx, -150, 14, 150); ctx.strokeRect(lx, -150, 14, 150); }
  ctx.fillRect(-48, -340, 14, 190); ctx.strokeRect(-48, -340, 14, 190);
  ctx.fillStyle = PAL.wood;
  rr(ctx, -56, -164, 104, 18, 6); ctx.fill(); ctx.stroke();
  rr(ctx, -56, -350, 26, 120, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#F7A9BB';
  rr(ctx, -48, -180, 90, 18, 9); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ── ครัว ─────────────────────────────────────────────────
function kitchen(ctx) {
  const { x0, x1, top } = HOME.counter;
  // กระเบื้องเหนือเคาน์เตอร์
  ctx.fillStyle = '#EAF4F2';
  ctx.fillRect(x0 - 20, top - 260, x1 - x0 + 40, 260);
  ctx.strokeStyle = 'rgba(150,190,190,.5)'; ctx.lineWidth = 2;
  for (let y = top - 260; y < top; y += 40) { ctx.beginPath(); ctx.moveTo(x0 - 20, y); ctx.lineTo(x1 + 20, y); ctx.stroke(); }
  for (let x = x0 - 20; x < x1 + 20; x += 40) { ctx.beginPath(); ctx.moveTo(x, top - 260); ctx.lineTo(x, top); ctx.stroke(); }
  // ตู้แขวน
  ln(ctx, 3);
  for (let x = x0; x < x1 - 60; x += 170) {
    ctx.fillStyle = '#FFF1E0'; rr(ctx, x, top - 520, 150, 200, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAL.line; ctx.beginPath(); ctx.arc(x + 130, top - 340, 5, 0, Math.PI * 2); ctx.fill();
  }
  // เคาน์เตอร์ + ตู้ล่าง
  ctx.fillStyle = '#FFF1E0';
  ctx.fillRect(x0, top, x1 - x0, -top); ctx.strokeRect(x0, top, x1 - x0, -top);
  ctx.strokeStyle = 'rgba(122,82,66,.45)'; ctx.lineWidth = 3;
  for (let x = x0 + 20; x < x1 - 100; x += 165) { rr(ctx, x, top + 40, 145, -top - 70, 8); ctx.stroke(); }
  ln(ctx, 3); ctx.fillStyle = '#9CC8E8';
  rr(ctx, x0 - 16, top - 20, x1 - x0 + 32, 24, 6); ctx.fill(); ctx.stroke();
  // เตา + กระทะ (ต้นเสียง "ปัง" ในฉาก 5)
  const sx = HOME.stove.x;
  ctx.fillStyle = '#5C5670'; rr(ctx, sx - 80, top - 30, 160, 12, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6E6A80';
  ctx.beginPath(); ctx.ellipse(sx, top - 44, 62, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(sx + 58, top - 46); ctx.lineTo(sx + 140, top - 60); ctx.stroke();
  // ถุงอาหารแมวบนเคาน์เตอร์ (ลายปลา)
  ln(ctx, 3); ctx.fillStyle = '#FFB36B';
  ctx.beginPath(); ctx.moveTo(x0 + 70, top - 20); ctx.lineTo(x0 + 80, top - 150); ctx.lineTo(x0 + 170, top - 150); ctx.lineTo(x0 + 180, top - 20); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#7FD1E8';
  ctx.beginPath(); ctx.ellipse(x0 + 122, top - 86, 26, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x0 + 146, top - 86); ctx.lineTo(x0 + 164, top - 100); ctx.lineTo(x0 + 164, top - 72); ctx.closePath(); ctx.fill(); ctx.stroke();
  // ตู้เย็นท้ายครัว
  ctx.fillStyle = '#DCEBF5'; rr(ctx, x1 + 30, -640, 150, 640, 18); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1 + 30, -400); ctx.lineTo(x1 + 180, -400); ctx.stroke();
  ctx.fillStyle = PAL.line; rr(ctx, x1 + 44, -560, 10, 90, 5); ctx.fill(); rr(ctx, x1 + 44, -370, 10, 110, 5); ctx.fill();
  // ผนังท้ายบ้าน
  ctx.fillStyle = '#EBCDB6'; ctx.fillRect(HOME.wallEnd, HOME.ceil - 400, 900, -HOME.ceil + 900);
  ln(ctx, 4); ctx.beginPath(); ctx.moveTo(HOME.wallEnd, HOME.ceil - 400); ctx.lineTo(HOME.wallEnd, 400); ctx.stroke();
}

/**
 * ชามข้าวของน้องส้ม — บนพื้นหน้าเคาน์เตอร์ (อยู่หน้าตัวละคร จึงแยกจากฉากหลัง)
 * wobble = โยกจากการโดนแตะ (เรเดียน) · fill 0..1 = อาหารในชาม
 */
export function drawBowl(ctx, x, y, { wobble = 0, fill = 0, eaten = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.translate(0, 6); ctx.rotate(wobble); ctx.translate(0, -6);
  ln(ctx, 3);
  // ตัวชาม
  ctx.fillStyle = '#FF9DBA';
  ctx.beginPath(); ctx.moveTo(-46, -26); ctx.lineTo(46, -26); ctx.quadraticCurveTo(42, 4, 28, 6); ctx.lineTo(-28, 6); ctx.quadraticCurveTo(-42, 4, -46, -26); ctx.closePath();
  ctx.fill(); ctx.stroke();
  // ปากชาม — ข้างในสีชมพูอ่อน
  ctx.fillStyle = '#FFD0DA';
  ctx.beginPath(); ctx.ellipse(0, -26, 46, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // ── อาหารพูนอยู่ "ในชาม" ──
  // วาดหลังปากชาม และทุกเม็ดอยู่ในวงปากชาม (กว้างสุดตรงกลาง แคบลงที่ขอบ) เป็นกองนูนขึ้นมา
  // ถ้าวาดก่อนตัวชามแล้วให้ชามทับ เม็ดที่โผล่พ้นขอบจะลอยอยู่นอกชามให้เห็น
  const level = fill * (1 - eaten * 0.55);
  if (level > 0.01) {
    ctx.fillStyle = '#B87440';
    ctx.beginPath(); ctx.ellipse(0, -26, 40 * Math.min(1, level * 1.6), 5.5, 0, 0, Math.PI * 2); ctx.fill();
    const n = Math.round(30 * level);
    for (let i = 0; i < n; i++) {
      const u = hash(i + 3) * 2 - 1, v = hash(i + 40);
      const px = u * 36 * Math.min(1, level * 1.5);
      const mound = (1 - u * u) * 11 * level;          // กองสูงตรงกลาง ลาดลงหาขอบ
      const py = -26 + (v - 0.5) * 7 - v * mound;
      ctx.fillStyle = i % 3 ? '#C9824A' : '#A8683A';
      ctx.beginPath(); ctx.ellipse(px, py, 5.5, 4, u * 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  // หน้าแมวบนชาม
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(0, -8, 10, 0, Math.PI * 2); ctx.fill();
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 3, -15); ctx.lineTo(sx * 10, -22); ctx.lineTo(sx * 10, -11); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
