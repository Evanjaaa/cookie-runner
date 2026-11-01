// src/render/items.js
// ─────────────────────────────────────────────────────────────
// รูปไอคอนของ (อาหาร น้ำ ของเล่น คอนโด + ของในร้านเมือง: ยา แชมพู วิตามิน อ่าง เบาะ) — วาดด้วยโค้ด ไม่มีไฟล์ภาพ
// ทุกชิ้นวาดในกรอบ 40×40 ให้กึ่งกลางอยู่ที่ (20, 20) ผู้เรียกย่อ/ขยายเอง
// หน้าตาเดียวกับของจริงในห้อง (ชามทอง ลูกบอลกระดิ่ง ไม้ตกแมว ฯลฯ) ซื้อแล้วได้ตรงที่เห็น
// ผู้ใช้ 1 พ.ย.: วาดใหม่ให้ดูดีขึ้น — ไล่สี มีแสงเงา เส้นขอบน้ำตาลนุ่ม · ลูกบอล/ไหมพรม/หนูยังหมุนกลิ้งในห้องได้ (ทรงอยู่กลางกรอบ)
// ─────────────────────────────────────────────────────────────
const LINE = '#5C3B26';
const TAU = Math.PI * 2;

function pen(ctx, w = 1.4) {
  ctx.strokeStyle = LINE;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}
function fs(ctx, fill, w = 1.4) {
  ctx.fillStyle = fill;
  ctx.fill();
  pen(ctx, w);
  ctx.stroke();
}
function lin(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
function rad(ctx, x, y, r, stops, fx = x, fy = y) {
  const g = ctx.createRadialGradient(fx, fy, 0, x, y, r);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
/** แสงวาวรูปรีเล็ก ๆ */
function gloss(ctx, x, y, rx, ry, a = -0.5, alpha = 0.75) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, a, 0, TAU); ctx.fill();
}
function shadow(ctx, x, y, rx, ry = 2.2) {
  ctx.fillStyle = 'rgba(70,40,20,.16)';
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
}
function sparkle(ctx, x, y, r, col = '#FFFFFF') {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/** ชามทอง — ผิวข้างในเป็นสีของที่ใส่ (fill) · ลายอุ้งเท้านูนหน้าชาม */
function bowl(ctx, fill) {
  shadow(ctx, 20, 35, 15);
  ctx.beginPath();
  ctx.moveTo(4.5, 22);
  ctx.quadraticCurveTo(5.5, 32, 12, 33.5);
  ctx.lineTo(28, 33.5);
  ctx.quadraticCurveTo(34.5, 32, 35.5, 22);
  ctx.ellipse(20, 22, 15.5, 4.8, 0, 0, Math.PI, false);
  ctx.closePath();
  fs(ctx, lin(ctx, 5, 0, 35, 0, [[0, '#FFE39A'], [0.45, '#F2BE4E'], [1, '#C98A2E']]));
  ctx.fillStyle = 'rgba(150,90,20,.32)';
  ctx.beginPath(); ctx.ellipse(20, 29.5, 2.6, 2.1, 0, 0, TAU); ctx.fill();
  for (const [dx, dy] of [[-3, -2.3], [-1, -3.8], [1, -3.8], [3, -2.3]]) { ctx.beginPath(); ctx.arc(20 + dx, 29.5 + dy, 0.95, 0, TAU); ctx.fill(); }
  gloss(ctx, 9.5, 27, 1.6, 3.6, 0.5, 0.55);
  ctx.beginPath(); ctx.ellipse(20, 22, 15.5, 4.8, 0, 0, TAU);
  fs(ctx, lin(ctx, 0, 17, 0, 27, [[0, '#FFF2C4'], [1, '#EDB445']]));
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.ellipse(20, 22.4, 12.8, 3.4, 0, 0, TAU); ctx.fill();
}

/** ปลาทูนึ่ง: หลังเขียวอมฟ้า ลายคลื่นเข้ม ท้องเงิน */
function mackerel(ctx, x, y, len, rot = 0) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  const body = new Path2D();
  body.moveTo(-len / 2, 0);
  body.bezierCurveTo(-len * 0.3, -len * 0.34, len * 0.2, -len * 0.3, len * 0.34, -len * 0.02);
  body.bezierCurveTo(len * 0.2, len * 0.26, -len * 0.3, len * 0.3, -len / 2, 0);
  // หาง
  ctx.beginPath(); ctx.moveTo(len * 0.3, 0); ctx.lineTo(len * 0.56, -len * 0.2); ctx.quadraticCurveTo(len * 0.48, 0, len * 0.56, len * 0.2); ctx.closePath();
  fs(ctx, '#6F93B4', 1.2);
  ctx.fillStyle = lin(ctx, 0, -len * 0.3, 0, len * 0.28, [[0, '#4E7697'], [0.45, '#8FB0CB'], [0.62, '#E7EEF5'], [1, '#C9D6E2']]);
  ctx.fill(body);
  ctx.save(); ctx.clip(body);
  ctx.strokeStyle = 'rgba(30,50,80,.55)'; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) { const sx = -len * 0.22 + i * len * 0.13; ctx.beginPath(); ctx.moveTo(sx, -len * 0.3); ctx.quadraticCurveTo(sx + 2, -len * 0.18, sx - 1, -len * 0.08); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-len * 0.05, len * 0.08, len * 0.22, len * 0.035, 0, 0, TAU); ctx.fill();
  ctx.restore();
  pen(ctx, 1.2); ctx.stroke(body);
  // ครีบ + เหงือก + ตา
  ctx.beginPath(); ctx.moveTo(-len * 0.12, -len * 0.22); ctx.lineTo(-len * 0.02, -len * 0.34); ctx.lineTo(len * 0.06, -len * 0.21); fs(ctx, '#6F93B4', 1);
  ctx.strokeStyle = 'rgba(30,50,80,.5)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(-len * 0.3, 0, len * 0.12, -0.9, 0.9); ctx.stroke();
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(-len * 0.37, -len * 0.04, 1.9, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2A2030'; ctx.beginPath(); ctx.arc(-len * 0.37, -len * 0.04, 1.1, 0, TAU); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(-len * 0.385, -len * 0.06, 0.45, 0, TAU); ctx.fill();
  ctx.restore();
}

/** ขวดแก้วทรงกลม (ยาเร่งโต) — คืน path แก้วให้ผู้เรียกใช้ตัด */
function flaskPath() {
  const p = new Path2D();
  p.moveTo(16.5, 9); p.lineTo(16.5, 15.5);
  p.bezierCurveTo(8, 18, 6.5, 33, 20, 35);
  p.bezierCurveTo(33.5, 33, 32, 18, 23.5, 15.5);
  p.lineTo(23.5, 9); p.closePath();
  return p;
}

const DRAW = {
  water(ctx) {
    bowl(ctx, lin(ctx, 0, 19, 0, 26, [[0, '#BFE8FF'], [1, '#5FB7EA']]));
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.ellipse(18, 22.2, 6, 1.5, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath(); ctx.ellipse(18, 22.2, 9.5, 2.4, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    // หยดน้ำ
    ctx.beginPath();
    ctx.moveTo(29, 3.5);
    ctx.bezierCurveTo(31, 7, 35, 10, 34, 13.5);
    ctx.bezierCurveTo(33, 17, 25, 17, 24, 13.5);
    ctx.bezierCurveTo(23, 10, 27, 7, 29, 3.5);
    ctx.closePath();
    fs(ctx, lin(ctx, 24, 4, 34, 17, [[0, '#BDE8FF'], [1, '#3FA2E0']]), 1.2);
    gloss(ctx, 27.2, 11.5, 1, 2, 0.3, 0.9);
    sparkle(ctx, 9, 10, 2.6, '#BDE8FF');
  },
  kibble(ctx) {
    bowl(ctx, '#7A4A22');
    // กองข้าวเม็ดพูน: ทรงปลา/หัวใจ/กลม สามโทน
    ctx.beginPath(); ctx.moveTo(7.5, 22); ctx.quadraticCurveTo(12, 9, 20, 9.5); ctx.quadraticCurveTo(28, 9, 32.5, 22); ctx.closePath();
    ctx.fillStyle = '#8A5428'; ctx.fill();
    const cols = ['#D99350', '#C27A3C', '#E7AE6A'];
    const P = [[11, 20, 'o'], [16, 20.5, 'h'], [22, 20.5, 'o'], [28, 20, 'f'], [13.5, 16, 'f'], [19, 15.5, 'o'], [25, 16, 'h'], [16.5, 11.8, 'o'], [22.5, 11.5, 'f'], [20, 7.8, 'h']];
    P.forEach(([x, y, k], i) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate((i % 3 - 1) * 0.4);
      ctx.beginPath();
      if (k === 'h') { ctx.moveTo(0, 2.4); ctx.bezierCurveTo(-3.6, 0, -2.6, -2.8, 0, -1.2); ctx.bezierCurveTo(2.6, -2.8, 3.6, 0, 0, 2.4); }
      else if (k === 'f') { ctx.moveTo(-3.4, 0); ctx.quadraticCurveTo(-0.5, -2.6, 2, 0); ctx.lineTo(3.6, -1.6); ctx.lineTo(3.6, 1.6); ctx.lineTo(2, 0); ctx.quadraticCurveTo(-0.5, 2.6, -3.4, 0); }
      else ctx.ellipse(0, 0, 3, 2.5, 0, 0, TAU);
      ctx.closePath();
      fs(ctx, cols[i % 3], 0.9);
      gloss(ctx, -0.8, -0.8, 1, 0.55, -0.4, 0.55);
      ctx.restore();
    });
    sparkle(ctx, 33, 8, 2.4, '#FFE39A');
  },
  fish(ctx) {
    bowl(ctx, '#DCE6EE');
    mackerel(ctx, 19, 15, 26, -0.12);
    // ใบตะไคร้ + พริกแดงเล็ก ๆ ข้างปลา
    ctx.fillStyle = '#6CC070'; ctx.beginPath(); ctx.ellipse(30, 19.5, 4, 1.4, -0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#E8484A'; ctx.beginPath(); ctx.ellipse(9, 20, 2.4, 1.1, 0.5, 0, TAU); ctx.fill();
  },
  salmon(ctx) {
    bowl(ctx, '#FBD3C2');
    // ชิ้นแซลมอนหนา: หนังเงินด้านบน เนื้อส้มไล่สี ลายมันขาวโค้ง
    const sl = new Path2D();
    sl.moveTo(7, 19); sl.bezierCurveTo(8, 9, 22, 4.5, 32, 8.5); sl.bezierCurveTo(35.5, 12, 34, 18, 30, 20); sl.lineTo(7, 19); sl.closePath();
    ctx.fillStyle = lin(ctx, 0, 6, 0, 20, [[0, '#FFB08E'], [1, '#F27A52']]); ctx.fill(sl);
    ctx.save(); ctx.clip(sl);
    ctx.strokeStyle = '#FFE8DC'; ctx.lineWidth = 1.5;
    for (const x of [13, 19, 25, 30]) { ctx.beginPath(); ctx.moveTo(x - 1, 6); ctx.quadraticCurveTo(x + 2.5, 12, x - 1.5, 20); ctx.stroke(); }
    ctx.strokeStyle = '#8D99AA'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(7, 19); ctx.bezierCurveTo(8, 9, 22, 4.5, 32, 8.5); ctx.stroke();
    ctx.restore();
    pen(ctx, 1.2); ctx.stroke(sl);
    gloss(ctx, 14, 11, 3, 1.1, -0.5, 0.6);
    // มะนาวฝาน + ใบผักชี
    ctx.beginPath(); ctx.moveTo(30, 21); ctx.arc(30, 21, 5, Math.PI, TAU); ctx.closePath(); fs(ctx, '#FFE57A', 1);
    ctx.strokeStyle = 'rgba(200,160,30,.7)'; ctx.lineWidth = 0.8;
    for (const a of [1.25, 1.5, 1.75]) { ctx.beginPath(); ctx.moveTo(30, 21); ctx.lineTo(30 + Math.cos(a * Math.PI) * 4, 21 + Math.sin(a * Math.PI) * 4); ctx.stroke(); }
    ctx.fillStyle = '#6CC070';
    for (const [x, y, a] of [[8, 20, -0.6], [11, 21, 0.3]]) { ctx.beginPath(); ctx.ellipse(x, y, 2.6, 1.3, a, 0, TAU); ctx.fill(); }
  },
  yarn(ctx) {
    // ไหมพรมชมพู: ลูกกลมไล่สี + เส้นพันหลายทิศ + ปลายเส้นหลุด
    pen(ctx, 1.3);
    ctx.strokeStyle = '#E0789C';
    ctx.beginPath(); ctx.moveTo(29, 28); ctx.bezierCurveTo(36, 31, 31, 37, 36, 37.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(19, 20, 12.5, 0, TAU);
    fs(ctx, rad(ctx, 19, 20, 13, [[0, '#FFD3E1'], [0.6, '#F7A2C0'], [1, '#E2779E']], 15, 15));
    ctx.save(); ctx.beginPath(); ctx.arc(19, 20, 12, 0, TAU); ctx.clip();
    ctx.lineWidth = 1.2;
    for (const [a, c] of [[-0.6, '#E8739C'], [-0.1, '#FFE0EA'], [0.5, '#E8739C'], [1.2, '#FFE0EA'], [1.9, '#D8628C']]) {
      ctx.strokeStyle = c;
      ctx.save(); ctx.translate(19, 20); ctx.rotate(a);
      for (const r of [5, 8.5, 12]) { ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.45, 0, 0, TAU); ctx.stroke(); }
      ctx.restore();
    }
    ctx.restore();
    pen(ctx, 1.3); ctx.beginPath(); ctx.arc(19, 20, 12.5, 0, TAU); ctx.stroke();
    gloss(ctx, 14, 14, 3, 1.8, -0.6, 0.6);
  },
  feather(ctx) {
    // ไม้ตกแมว: ด้ามลายทางลูกกวาด + เชือก + ช่อขนนกสามสี + กระดิ่งทอง
    ctx.save(); ctx.translate(7, 36); ctx.rotate(0.68);   // ด้ามเฉียงขึ้นขวา ปลายที่ (≈25.5, 12.5)
    ctx.beginPath(); ctx.roundRect(-1.8, -30, 3.6, 30, 1.8); fs(ctx, '#FFFFFF', 1.1);
    ctx.save(); ctx.beginPath(); ctx.roundRect(-1.8, -30, 3.6, 30, 1.8); ctx.clip();
    ctx.fillStyle = '#FF7FAA'; for (let v = -30; v < 0; v += 5) { ctx.beginPath(); ctx.moveTo(-2, v); ctx.lineTo(2, v - 2.5); ctx.lineTo(2, v); ctx.lineTo(-2, v + 2.5); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.restore();
    pen(ctx, 0.9); ctx.strokeStyle = '#9A6636';
    ctx.beginPath(); ctx.moveTo(25.5, 12.5); ctx.quadraticCurveTo(29, 13, 28.5, 17); ctx.stroke();
    const fe = (x, y, a, len, w, col, edge) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-w, len * 0.3, -w * 0.8, len * 0.8, 0, len); ctx.bezierCurveTo(w * 0.8, len * 0.8, w, len * 0.3, 0, 0); ctx.closePath();
      fs(ctx, col, 1);
      ctx.strokeStyle = edge; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(0, len - 1); ctx.stroke();
      for (let k = 0.3; k < 0.9; k += 0.18) { for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, len * k); ctx.lineTo(d * w * 0.6, len * (k + 0.1)); ctx.stroke(); } }
      ctx.restore();
    };
    fe(28.5, 17, 0.55, 15, 4.2, '#8FE0D0', '#4FB3A2');
    fe(28.5, 17, -0.15, 17, 4.6, '#B9A2F5', '#8466E0');
    fe(28.5, 17, -0.8, 14, 4, '#FF9FC2', '#E06C96');
    ctx.beginPath(); ctx.arc(28.5, 17, 2.8, 0, TAU);
    fs(ctx, rad(ctx, 28.5, 17, 3, [[0, '#FFF2B0'], [1, '#E3A93A']], 27.5, 16), 0.9);
  },
  ball(ctx) {
    // บอลกระดิ่ง: เหลืองไล่สี คาดแถบมิ้นต์ ลายดาวชมพู + ช่องเห็นกระดิ่งทอง
    ctx.beginPath(); ctx.arc(20, 20, 12.5, 0, TAU);
    fs(ctx, rad(ctx, 20, 20, 13, [[0, '#FFF0B0'], [0.55, '#FFD06A'], [1, '#F2A33A']], 15.5, 15));
    ctx.save(); ctx.beginPath(); ctx.arc(20, 20, 12, 0, TAU); ctx.clip();
    ctx.fillStyle = '#8EE0C2';
    ctx.beginPath(); ctx.ellipse(20, 20, 14, 3.4, -0.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(40,120,90,.4)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(20, 20, 14, 3.4, -0.5, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#FF8FB3';
    for (const [x, y] of [[13, 13.5], [26.5, 25.5], [25, 12]]) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.2 : 2.6; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    pen(ctx, 1.3); ctx.beginPath(); ctx.arc(20, 20, 12.5, 0, TAU); ctx.stroke();
    // ช่องกระดิ่ง
    ctx.beginPath(); ctx.ellipse(16, 27.5, 3.6, 1.6, 0.4, 0, TAU); fs(ctx, '#7A4A22', 0.9);
    ctx.fillStyle = '#FFE08A'; ctx.beginPath(); ctx.arc(16.3, 27.3, 1.1, 0, TAU); ctx.fill();
    gloss(ctx, 15, 13, 3.6, 2.2, -0.6, 0.7);
  },
  mouse(ctx) {
    // หนูของเล่นผ้านุ่ม: ตะเข็บหลัง หางเชือกปลายพู่ชมพู
    pen(ctx, 1.3); ctx.strokeStyle = '#8E7FA8';
    ctx.beginPath(); ctx.moveTo(30, 26); ctx.bezierCurveTo(37, 26, 38, 20, 34.5, 17.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(34, 16.5, 2.4, 0, TAU); fs(ctx, '#FF8FB8', 1);
    const body = new Path2D();
    body.moveTo(3.5, 27); body.quadraticCurveTo(5, 12.5, 18, 12.5); body.quadraticCurveTo(31.5, 12.5, 32, 27); body.closePath();
    ctx.fillStyle = lin(ctx, 0, 12, 0, 28, [[0, '#DCD5EC'], [1, '#A89FC4']]); ctx.fill(body);
    ctx.save(); ctx.clip(body);
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(16, 27, 12, 4, 0, 0, TAU); ctx.fill();
    ctx.restore();
    pen(ctx, 1.3); ctx.stroke(body);
    ctx.strokeStyle = 'rgba(110,90,150,.7)'; ctx.lineWidth = 0.9; ctx.setLineDash([1.6, 1.6]);
    ctx.beginPath(); ctx.moveTo(10, 16.5); ctx.quadraticCurveTo(19, 11.5, 29, 18); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(10.5, 14, 4.4, 0, TAU); fs(ctx, '#C9C1DD', 1.2);
    ctx.fillStyle = '#FFB3CF'; ctx.beginPath(); ctx.arc(10.5, 14, 2.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2A2030'; ctx.beginPath(); ctx.arc(8, 21.5, 1.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(7.6, 21, 0.45, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FF7FAA'; ctx.beginPath(); ctx.arc(4, 25, 1.7, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(92,59,38,.6)'; ctx.lineWidth = 0.6;
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(4.5, 25); ctx.lineTo(0.5, 25 + d * 2.5); ctx.stroke(); }
    gloss(ctx, 20, 16, 3.5, 1.4, -0.2, 0.55);
  },
  tree(ctx) {
    // คอนโดแมว: เสาพันเชือกป่าน ชั้นเบาะชมพู บ้านกล่องม่วงประตูกลม พู่ห้อยแกว่ง
    shadow(ctx, 20, 37.5, 16, 1.8);
    const post = (x, top, bottom) => {
      ctx.beginPath(); ctx.rect(x - 2.6, top, 5.2, bottom - top);
      fs(ctx, '#E9CFA0', 1.1);
      ctx.strokeStyle = 'rgba(150,110,60,.55)'; ctx.lineWidth = 0.8;
      for (let y = top + 1.5; y < bottom; y += 2.2) { ctx.beginPath(); ctx.moveTo(x - 2.4, y + 1); ctx.lineTo(x + 2.4, y); ctx.stroke(); }
    };
    ctx.beginPath(); ctx.roundRect(4, 33.5, 32, 4.5, 2); fs(ctx, '#C99F70', 1.2);
    post(11, 22, 34); post(29, 15, 34); post(17, 7, 22);
    ctx.beginPath(); ctx.roundRect(4, 19.5, 18, 4.5, 2); fs(ctx, '#C99F70', 1.1);
    ctx.beginPath(); ctx.roundRect(5, 18, 16, 2.5, 1.2); fs(ctx, '#FFB3CF', 0.8);
    ctx.beginPath(); ctx.roundRect(10.5, 4.5, 14, 4, 2); fs(ctx, '#C99F70', 1.1);
    ctx.beginPath(); ctx.roundRect(11.5, 3, 12, 2.5, 1.2); fs(ctx, '#FFB3CF', 0.8);
    // บ้านกล่อง
    ctx.beginPath(); ctx.roundRect(21, 6, 15, 11, 2.5);
    fs(ctx, lin(ctx, 0, 6, 0, 17, [[0, '#D6C6FF'], [1, '#A88BF0']]), 1.1);
    ctx.fillStyle = '#5A3E8A'; ctx.beginPath(); ctx.ellipse(28.5, 12, 3.2, 3.4, 0, 0, TAU); ctx.fill();
    gloss(ctx, 24, 8.5, 2, 0.8, 0, 0.6);
    // พู่ห้อย
    ctx.strokeStyle = '#9A6636'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(8, 24); ctx.lineTo(8, 29); ctx.stroke();
    ctx.beginPath(); ctx.arc(8, 30.5, 2.2, 0, TAU); fs(ctx, '#8EE0C2', 0.8);
    // ลายอุ้งเท้าที่ฐาน
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(20, 35.8, 1.6, 1.1, 0, 0, TAU); ctx.fill();
  },

  // ── ของในร้านเมือง ──
  grow(ctx) {
    // ยาเร่งโต: ขวดกลมเรืองแสงเขียวมิ้นต์ ฟองลอย จุกไม้ ป้ายลูกศรขึ้น
    ctx.fillStyle = rad(ctx, 20, 26, 18, [[0, 'rgba(120,240,170,.45)'], [1, 'rgba(120,240,170,0)']]);
    ctx.beginPath(); ctx.arc(20, 26, 18, 0, TAU); ctx.fill();
    const g = flaskPath();
    ctx.fillStyle = 'rgba(230,245,255,.55)'; ctx.fill(g);
    ctx.save(); ctx.clip(g);
    ctx.fillStyle = lin(ctx, 0, 21, 0, 35, [[0, '#9CF7C4'], [1, '#2FBF7E']]);
    ctx.beginPath(); ctx.moveTo(4, 22); ctx.quadraticCurveTo(12, 19.5, 20, 22); ctx.quadraticCurveTo(28, 24.5, 36, 22); ctx.lineTo(36, 40); ctx.lineTo(4, 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (const [x, y, r] of [[15, 30, 1.4], [23, 27, 1.1], [19, 32.5, 0.9], [26, 31, 1.5]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    ctx.restore();
    pen(ctx, 1.3); ctx.stroke(g);
    ctx.beginPath(); ctx.roundRect(15.5, 4, 9, 6, 2); fs(ctx, lin(ctx, 0, 4, 0, 10, [[0, '#E3B07A'], [1, '#B07A48']]), 1.1);
    ctx.beginPath(); ctx.roundRect(15, 8.5, 10, 2.4, 1); fs(ctx, '#FFC94A', 0.9);
    // ป้ายลูกศรขึ้น
    ctx.beginPath(); ctx.roundRect(14.5, 24.5, 11, 7.5, 2); fs(ctx, '#FFF6DC', 0.9);
    ctx.fillStyle = '#2FA86A'; ctx.beginPath(); ctx.moveTo(20, 25.8); ctx.lineTo(23, 29); ctx.lineTo(21.2, 29); ctx.lineTo(21.2, 31); ctx.lineTo(18.8, 31); ctx.lineTo(18.8, 29); ctx.lineTo(17, 29); ctx.closePath(); ctx.fill();
    gloss(ctx, 12.5, 21, 1.4, 3.8, 0.4, 0.75);
    sparkle(ctx, 31, 9, 2.8, '#FFF2B0');
    sparkle(ctx, 7, 14, 2, '#B6FFCB');
  },
  shampoo(ctx) {
    // แชมพูหอม: ขวดปั๊มชมพู ป้ายอุ้งเท้า ฟองสบู่ลอย
    shadow(ctx, 20, 37.5, 10, 1.8);
    ctx.beginPath(); ctx.roundRect(17.5, 7, 5, 6, 1); fs(ctx, '#FFFFFF', 1.1);
    ctx.beginPath(); ctx.moveTo(15, 7.5); ctx.lineTo(15, 4.5); ctx.lineTo(27, 4.5); ctx.quadraticCurveTo(29, 4.5, 29, 6.5); ctx.lineTo(27, 6.5); ctx.lineTo(27, 7.5); ctx.closePath(); fs(ctx, '#FFFFFF', 1.1);
    ctx.beginPath(); ctx.roundRect(15.5, 12, 9, 3.5, 1.2); fs(ctx, '#FF8FB3', 1);
    ctx.beginPath(); ctx.roundRect(10.5, 15, 19, 22, 6);
    fs(ctx, lin(ctx, 10, 0, 30, 0, [[0, '#FFC6DA'], [0.5, '#FF9FC2'], [1, '#EE7AA4']]), 1.3);
    ctx.beginPath(); ctx.ellipse(20, 26, 6.5, 6, 0, 0, TAU); fs(ctx, '#FFFFFF', 0.9);
    ctx.fillStyle = '#FF7FAA';
    ctx.beginPath(); ctx.ellipse(20, 27.6, 2.3, 1.9, 0, 0, TAU); ctx.fill();
    for (const [dx, dy] of [[-2.6, -1.8], [-0.9, -3.3], [0.9, -3.3], [2.6, -1.8]]) { ctx.beginPath(); ctx.arc(20 + dx, 27.6 + dy, 0.85, 0, TAU); ctx.fill(); }
    gloss(ctx, 13.5, 21, 1.3, 4.5, 0.05, 0.7);
    for (const [x, y, r] of [[7, 14, 3.4], [5, 24, 2.2], [33, 12, 2.8], [34.5, 20, 1.8]]) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = 'rgba(200,235,255,.45)'; ctx.fill();
      ctx.strokeStyle = 'rgba(120,170,220,.8)'; ctx.lineWidth = 0.8; ctx.stroke();
      gloss(ctx, x - r * 0.35, y - r * 0.35, r * 0.3, r * 0.2, -0.6, 0.9);
    }
  },
  vitamin(ctx) {
    // วิตามินขนสวย: กระปุกใส เม็ดหัวใจหลากสี ฝาส้ม + แคปซูลชมพูขาวหน้ากระปุก
    shadow(ctx, 19, 37.5, 12, 1.8);
    const jar = new Path2D(); jar.roundRect(8.5, 12, 21, 25, 5);
    ctx.fillStyle = 'rgba(230,245,255,.6)'; ctx.fill(jar);
    ctx.save(); ctx.clip(jar);
    const hc = ['#FF8FB3', '#FFD45A', '#8EE0C2', '#B9A2F5'];
    let i = 0;
    for (let y = 34; y > 17; y -= 4.2) for (let x = 11 + ((y / 4.2) % 2) * 2; x < 29; x += 5, i++) {
      ctx.fillStyle = hc[i % 4];
      ctx.beginPath(); ctx.moveTo(x, y + 1.6); ctx.bezierCurveTo(x - 2.6, y - 0.2, x - 1.8, y - 2.2, x, y - 0.9); ctx.bezierCurveTo(x + 1.8, y - 2.2, x + 2.6, y - 0.2, x, y + 1.6); ctx.fill();
    }
    ctx.restore();
    pen(ctx, 1.3); ctx.stroke(jar);
    ctx.beginPath(); ctx.roundRect(10.5, 22, 17, 9, 2); fs(ctx, '#FFF6DC', 0.9);
    ctx.fillStyle = '#FF7FAA'; ctx.beginPath(); ctx.moveTo(19, 29.2); ctx.bezierCurveTo(15.5, 27, 16.5, 23.5, 19, 25.2); ctx.bezierCurveTo(21.5, 23.5, 22.5, 27, 19, 29.2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(7.5, 7.5, 23, 6, 2.5); fs(ctx, lin(ctx, 0, 7, 0, 13, [[0, '#FFB866'], [1, '#F08A2E']]), 1.2);
    ctx.strokeStyle = 'rgba(160,80,10,.5)'; ctx.lineWidth = 0.7;
    for (let x = 10; x < 30; x += 2.5) { ctx.beginPath(); ctx.moveTo(x, 8.5); ctx.lineTo(x, 12.5); ctx.stroke(); }
    gloss(ctx, 11.5, 18, 1, 3.5, 0, 0.75);
    // แคปซูล
    ctx.save(); ctx.translate(31, 31); ctx.rotate(-0.6);
    ctx.beginPath(); ctx.roundRect(-6, -2.6, 12, 5.2, 2.6); fs(ctx, '#FFFFFF', 1);
    ctx.beginPath(); ctx.moveTo(0, -2.6); ctx.lineTo(-3.4, -2.6); ctx.arc(-3.4, 0, 2.6, -Math.PI / 2, Math.PI / 2, true); ctx.lineTo(0, 2.6); ctx.closePath(); fs(ctx, '#FF7FAA', 1);
    gloss(ctx, -2.5, -1.1, 1.6, 0.6, 0, 0.7);
    ctx.restore();
    sparkle(ctx, 33.5, 9, 2.5, '#FFE39A');
  },
  tub(ctx) {
    // อ่างอาบน้ำใหญ่: อ่างขาเสือขอบฟ้า ฟองโฟมล้น เป็ดยางเหลือง
    shadow(ctx, 20, 37.5, 16, 1.8);
    for (const x of [9, 31]) { ctx.beginPath(); ctx.moveTo(x - 2.5, 31); ctx.quadraticCurveTo(x - 3, 36, x - 1, 36.5); ctx.lineTo(x + 1.5, 36.5); ctx.quadraticCurveTo(x + 2.5, 34, x + 2, 31); ctx.closePath(); fs(ctx, '#F2C24A', 1); }
    // ฟองโฟม (หลังขอบอ่าง)
    const foam = [[9, 17, 4.5], [14, 14.5, 5], [20, 13.5, 5.5], [26, 14.5, 5], [31, 17, 4.5]];
    for (const [x, y, r] of foam) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); fs(ctx, '#FFFFFF', 1.1); }
    ctx.fillStyle = 'rgba(180,220,255,.6)'; for (const [x, y, r] of foam) { ctx.beginPath(); ctx.arc(x + r * 0.3, y + r * 0.3, r * 0.4, 0, TAU); ctx.fill(); }
    // เป็ดยาง
    ctx.beginPath(); ctx.ellipse(27, 14, 4.6, 3.2, 0, 0, TAU); fs(ctx, '#FFD45A', 1);
    ctx.beginPath(); ctx.arc(24.5, 10, 2.8, 0, TAU); fs(ctx, '#FFD45A', 1);
    ctx.fillStyle = '#FF9A3C'; ctx.beginPath(); ctx.ellipse(21.4, 10.6, 1.6, 0.9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2A2030'; ctx.beginPath(); ctx.arc(24, 9.4, 0.6, 0, TAU); ctx.fill();
    // ตัวอ่าง
    const tub = new Path2D();
    tub.moveTo(3, 18); tub.lineTo(37, 18); tub.quadraticCurveTo(37, 32, 26, 32.5); tub.lineTo(14, 32.5); tub.quadraticCurveTo(3, 32, 3, 18); tub.closePath();
    ctx.fillStyle = lin(ctx, 0, 18, 0, 33, [[0, '#FFFFFF'], [1, '#DDE8F2']]); ctx.fill(tub);
    pen(ctx, 1.3); ctx.stroke(tub);
    ctx.beginPath(); ctx.roundRect(1.5, 16.5, 37, 4, 2); fs(ctx, lin(ctx, 0, 16, 0, 21, [[0, '#BFE3FF'], [1, '#7CC4F2']]), 1.2);
    ctx.fillStyle = 'rgba(124,196,242,.55)'; ctx.beginPath(); ctx.ellipse(20, 26, 4, 3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; for (const [dx, dy] of [[-2.6, -2.5], [0, -3.6], [2.6, -2.5]]) { ctx.beginPath(); ctx.arc(20 + dx, 26 + dy, 0.9, 0, TAU); ctx.fill(); }
    gloss(ctx, 8, 24, 1.3, 3.5, -0.4, 0.85);
  },
  bed(ctx) {
    // เบาะนุ่มพิเศษ: เบาะโดนัทม่วงพาสเทลขอบฟู เบาะในชมพู หมอนลายอุ้งเท้า ดาวทอง
    shadow(ctx, 20, 35.5, 17, 2.4);
    ctx.beginPath(); ctx.ellipse(20, 25, 17.5, 9.5, 0, 0, TAU);
    fs(ctx, lin(ctx, 0, 15, 0, 35, [[0, '#E6DAFF'], [1, '#A98BEA']]), 1.3);
    ctx.beginPath(); ctx.ellipse(20, 23.5, 11.5, 5.2, 0, 0, TAU);
    fs(ctx, lin(ctx, 0, 18, 0, 29, [[0, '#FFC4DA'], [1, '#FF9FC2']]), 1.1);
    ctx.strokeStyle = 'rgba(120,80,190,.45)'; ctx.lineWidth = 0.9;
    for (const x of [6, 12, 28, 34]) { ctx.beginPath(); ctx.moveTo(x, 27 + Math.abs(x - 20) * -0.1); ctx.quadraticCurveTo(x + 1, 31, x + (x < 20 ? 2 : -2), 33); ctx.stroke(); }
    // หมอน
    ctx.beginPath(); ctx.ellipse(17, 20.5, 6.5, 3.6, -0.15, 0, TAU); fs(ctx, '#FFFFFF', 1);
    ctx.fillStyle = '#FFB3CF';
    ctx.beginPath(); ctx.ellipse(17, 21.3, 1.5, 1.2, 0, 0, TAU); ctx.fill();
    for (const [dx, dy] of [[-1.8, -1.2], [0, -2.1], [1.8, -1.2]]) { ctx.beginPath(); ctx.arc(17 + dx, 21.3 + dy, 0.6, 0, TAU); ctx.fill(); }
    gloss(ctx, 9, 21, 2.5, 1.2, -0.4, 0.6);
    // ป้ายดาว
    ctx.fillStyle = '#FFD45A';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.9 : 4.2; ctx.lineTo(31 + Math.cos(a) * r, 11 + Math.sin(a) * r); }
    ctx.closePath(); fs(ctx, '#FFD45A', 0.9);
    sparkle(ctx, 8, 10, 2.4, '#FFF2B0');
  },
};

/** วาดไอคอนของชิ้นนั้นลงกรอบ 40×40 — id ไม่รู้จัก = ไม่วาดอะไร */
export function drawItemIcon(ctx, id) {
  const f = DRAW[id];
  if (!f) return;
  ctx.save();
  f(ctx);
  ctx.restore();
}
