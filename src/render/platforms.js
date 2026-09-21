// src/render/platforms.js
// ─────────────────────────────────────────────────────────────
// พื้นเหยียบได้ — วาดด้วยจานสีของฉาก จึงกลืนเป็นส่วนหนึ่งของแมพ ไม่ใช่ของแปลกปลอม
//   เนิน     ก้อนแป้งคุกกี้โผล่ขึ้นจากพื้น มีเปลือกกรอบตามแนวผิวและช็อกชิป
//   พื้นลอย  แท่งเวเฟอร์ลอย มีไส้ครีมตรงกลาง และเงาบนพื้นบอกว่าลอยอยู่จริง
//
// รูปผิวมาจาก platTop() ใน level.js ตัวเดียวกับที่ฟิสิกส์ใช้ ที่ตาเห็นกับที่เท้าเหยียบ
// จึงเป็นเส้นเดียวกันเสมอ ไม่มีทางเพี้ยนจากกันได้
// ─────────────────────────────────────────────────────────────
import { GROUND_Y, VIEW, LEVEL } from '../config.js';
import { platTop } from '../level.js';

const { ledgeThick } = LEVEL;

export function drawPlats(ctx, plats, camera, pal) {
  for (const p of plats) {
    const x0 = p.x - camera;
    if (x0 > VIEW.W + 20 || x0 + p.w < -20) continue;
    if (p.kind === 'hill') drawHill(ctx, p, camera, pal);
    else drawLedge(ctx, p, camera, pal);
  }
}

function drawHill(ctx, p, cam, pal) {
  const pts = [];
  for (let x = p.x; x < p.x + p.w; x += 6) pts.push([x - cam, platTop(p, x)]);
  pts.push([p.x + p.w - cam, GROUND_Y]);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p.x - cam, GROUND_Y + 8);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(p.x + p.w - cam, GROUND_Y + 8);
  ctx.closePath();
  ctx.fillStyle = pal.ground;
  ctx.fill();
  ctx.clip();

  // เปลือกกรอบสองชั้นวิ่งตามผิว — ท่าเดียวกับแถบผิวของพื้นปกติ (crust / crustTop)
  const trace = (dy, width, color) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + dy) : ctx.moveTo(x, y + dy)));
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.stroke();
  };
  trace(11, 22, pal.crust);
  trace(3, 6, pal.crustTop);

  // ช็อกชิป — ตำแหน่งตายตัวตามพิกัดโลก เลื่อนจอแล้วไม่วิบวับ
  ctx.fillStyle = 'rgba(58,28,16,.75)';
  for (let x = p.x + 30; x < p.x + p.w - 20; x += 46) {
    const top = platTop(p, x);
    const depth = 30 + ((x * 7) % 23);
    if (top + depth > GROUND_Y) continue;
    ctx.beginPath();
    ctx.ellipse(x - cam, top + depth, 5, 4, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLedge(ctx, p, cam, pal) {
  const x = p.x - cam;
  // ถาม platTop ตัวเดียวกับฟิสิกส์ แท่งที่เขียนว่า lift กับที่เขียนว่า top จึงวาดที่เดียวกันเสมอ
  // (เคยอ่าน p.top ตรง ๆ แล้วแท่งที่ใช้ lift กลายเป็นพื้นล่องหน — เหยียบได้แต่มองไม่เห็น)
  const y = platTop(p, p.x);

  // เงาบนพื้น — เห็นแล้วรู้ทันทีว่าแท่งนี้ลอยอยู่ ไม่ได้ตั้งบนพื้น
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.beginPath();
  ctx.ellipse(x + p.w / 2, GROUND_Y + 2, p.w * 0.42, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const r = 9;
  const body = () => {
    ctx.beginPath();
    ctx.roundRect(x, y, p.w, ledgeThick, r);
  };

  ctx.save();
  body();
  ctx.fillStyle = pal.crust;
  ctx.fill();
  ctx.clip();

  // ลายตารางเวเฟอร์
  ctx.strokeStyle = 'rgba(90,40,18,.28)';
  ctx.lineWidth = 1.5;
  for (let gx = x + 14; gx < x + p.w; gx += 16) {
    ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + ledgeThick); ctx.stroke();
  }
  // ไส้ครีมตรงกลาง + ผิวบนที่โดนแสง
  ctx.fillStyle = '#FFF1D6';
  ctx.fillRect(x, y + ledgeThick / 2 - 2, p.w, 4);
  ctx.fillStyle = pal.crustTop;
  ctx.fillRect(x, y, p.w, 6);
  ctx.restore();

  ctx.save();
  body();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(60,24,10,.45)';
  ctx.stroke();
  ctx.restore();
}
