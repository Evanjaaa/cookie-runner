// src/render/items.js
// ─────────────────────────────────────────────────────────────
// รูปไอคอนของในเมนูบ้านน้อง (อาหาร น้ำ ของเล่น คอนโด) — วาดด้วยโค้ด ไม่มีไฟล์ภาพ
// ทุกชิ้นวาดในกรอบ 40×40 ให้กึ่งกลางอยู่ที่ (20, 20) ผู้เรียกย่อ/ขยายเอง
// หน้าตาเดียวกับของจริงในห้อง (ชามทอง ลูกบอลกระดิ่ง ไม้ตกแมว ฯลฯ) ซื้อแล้วได้ตรงที่เห็น
// ─────────────────────────────────────────────────────────────
const LINE = '#5C3B26';

function pen(ctx, w = 1.6) {
  ctx.strokeStyle = LINE;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

function fs(ctx, fill, w = 1.6) {
  ctx.fillStyle = fill;
  ctx.fill();
  pen(ctx, w);
  ctx.stroke();
}

/** ชามทองเปล่า ๆ — ผิวข้างในเป็นสีของที่ใส่ (fill) */
function bowl(ctx, fill) {
  ctx.beginPath();
  ctx.ellipse(20, 22, 15, 4.5, 0, 0, Math.PI * 2);
  fs(ctx, fill);
  ctx.beginPath();
  ctx.moveTo(5, 22);
  ctx.quadraticCurveTo(6, 32, 12, 33);
  ctx.lineTo(28, 33);
  ctx.quadraticCurveTo(34, 32, 35, 22);
  ctx.ellipse(20, 22, 15, 4.5, 0, 0, Math.PI, false);
  ctx.closePath();
  fs(ctx, '#EBB94C');
  ctx.strokeStyle = '#FCE08F'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(20, 22, 12, 3, 0, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
}

function fishShape(ctx, x, y, len, fill, belly) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-len / 2, 0);
  ctx.quadraticCurveTo(0, -len * 0.42, len * 0.32, 0);
  ctx.quadraticCurveTo(0, len * 0.42, -len / 2, 0);
  ctx.closePath();
  fs(ctx, fill, 1.4);
  ctx.beginPath();
  ctx.moveTo(len * 0.28, 0);
  ctx.lineTo(len * 0.55, -len * 0.22);
  ctx.lineTo(len * 0.55, len * 0.22);
  ctx.closePath();
  fs(ctx, fill, 1.4);
  ctx.fillStyle = belly;
  ctx.beginPath(); ctx.ellipse(-len * 0.08, len * 0.08, len * 0.22, len * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = LINE;
  ctx.beginPath(); ctx.arc(-len * 0.32, -len * 0.04, 1.1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

const DRAW = {
  water(ctx) {
    bowl(ctx, '#8FD0F0');
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(20, 22, 6, 1.6, 0, 0, Math.PI * 2); ctx.stroke();
    // หยดน้ำ
    ctx.beginPath();
    ctx.moveTo(29, 4);
    ctx.quadraticCurveTo(35, 11, 32, 14);
    ctx.quadraticCurveTo(29, 16, 26.5, 14);
    ctx.quadraticCurveTo(24, 11, 29, 4);
    ctx.closePath();
    fs(ctx, '#7CC4F2', 1.3);
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.beginPath(); ctx.ellipse(28, 11, 1, 1.8, -0.3, 0, Math.PI * 2); ctx.fill();
  },
  kibble(ctx) {
    bowl(ctx, '#8A5A2E');
    // เม็ดอาหารกองพูน
    const pts = [[13, 19], [18, 17], [23, 17], [28, 19], [16, 14], [21, 13], [26, 15], [20, 9.5]];
    for (const [x, y] of pts) {
      ctx.beginPath(); ctx.ellipse(x, y, 3.2, 2.6, 0.3, 0, Math.PI * 2);
      fs(ctx, '#C9874A', 1.1);
    }
  },
  fish(ctx) {
    bowl(ctx, '#B9C6D2');
    fishShape(ctx, 19, 15, 24, '#C9D3DE', '#F2F5F8');
  },
  salmon(ctx) {
    bowl(ctx, '#F7B39A');
    // ชิ้นแซลมอนมีลายมันสีขาว
    ctx.beginPath();
    ctx.moveTo(8, 18);
    ctx.quadraticCurveTo(14, 6, 31, 9);
    ctx.quadraticCurveTo(35, 14, 30, 19);
    ctx.closePath();
    fs(ctx, '#F49A7C', 1.4);
    ctx.strokeStyle = '#FFE3D6'; ctx.lineWidth = 1.4;
    for (const x of [15, 21, 27]) { ctx.beginPath(); ctx.moveTo(x, 9.5); ctx.quadraticCurveTo(x + 2, 13, x - 1, 17.5); ctx.stroke(); }
  },
  yarn(ctx) {
    ctx.beginPath(); ctx.arc(19, 21, 12, 0, Math.PI * 2);
    fs(ctx, '#F3A3BF');
    ctx.strokeStyle = '#E07FA1'; ctx.lineWidth = 1.4;
    for (const [r, a] of [[9, 0.3], [6, 1.2], [9, 2.2]]) { ctx.beginPath(); ctx.arc(19, 21, r, a, a + 2.2); ctx.stroke(); }
    pen(ctx, 1.4);
    ctx.beginPath(); ctx.moveTo(29, 27); ctx.quadraticCurveTo(35, 32, 33, 36); ctx.stroke();
  },
  feather(ctx) {
    pen(ctx, 2);
    ctx.strokeStyle = '#9A6636';
    ctx.beginPath(); ctx.moveTo(6, 36); ctx.lineTo(24, 12); ctx.stroke();
    pen(ctx, 1);
    ctx.beginPath(); ctx.moveTo(24, 12); ctx.quadraticCurveTo(28, 14, 27, 18); ctx.stroke();
    ctx.save();
    ctx.translate(29, 13);
    ctx.rotate(0.6);
    ctx.beginPath(); ctx.ellipse(0, 0, 4, 10, 0, 0, Math.PI * 2);
    fs(ctx, '#9B7BF0', 1.3);
    ctx.strokeStyle = '#DCC9FF'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 9); ctx.stroke();
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(33, 21, 2.5, 6, 0.9, 0, Math.PI * 2);
    fs(ctx, '#FF8FB8', 1.2);
  },
  ball(ctx) {
    ctx.beginPath(); ctx.arc(20, 21, 12, 0, Math.PI * 2);
    fs(ctx, '#F6C063');
    ctx.strokeStyle = '#D99A2B'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(8.5, 21); ctx.lineTo(31.5, 21); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, 9); ctx.lineTo(20, 33); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.ellipse(15, 15, 3, 2, -0.6, 0, Math.PI * 2); ctx.fill();
    // กระดิ่งในลูก
    ctx.beginPath(); ctx.arc(26, 27, 3.2, 0, Math.PI * 2);
    fs(ctx, '#FCE08F', 1.2);
  },
  mouse(ctx) {
    pen(ctx, 1.4);
    ctx.beginPath(); ctx.moveTo(30, 27); ctx.quadraticCurveTo(38, 26, 36, 18); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, 27);
    ctx.quadraticCurveTo(6, 13, 18, 13);
    ctx.quadraticCurveTo(31, 13, 32, 27);
    ctx.closePath();
    fs(ctx, '#B9B2C9');
    ctx.beginPath(); ctx.arc(10, 15, 4, 0, Math.PI * 2);
    fs(ctx, '#B9B2C9', 1.3);
    ctx.fillStyle = '#FFB3CF';
    ctx.beginPath(); ctx.arc(10, 15, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = LINE;
    ctx.beginPath(); ctx.arc(8, 22, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FF8FB8';
    ctx.beginPath(); ctx.arc(4.5, 25, 1.6, 0, Math.PI * 2); ctx.fill();
  },
  tree(ctx) {
    const post = (x, top, bottom) => {
      ctx.beginPath(); ctx.rect(x - 2.5, top, 5, bottom - top);
      fs(ctx, '#E2C69A', 1.2);
    };
    ctx.beginPath(); ctx.roundRect(5, 34, 30, 4, 2);
    fs(ctx, '#D9B784', 1.3);
    post(12, 22, 34);
    post(28, 14, 34);
    post(18, 6, 22);
    ctx.beginPath(); ctx.roundRect(5, 20, 16, 4, 2); fs(ctx, '#D9B784', 1.2);
    ctx.beginPath(); ctx.roundRect(12, 5, 13, 4, 2); fs(ctx, '#D9B784', 1.2);
    ctx.beginPath(); ctx.roundRect(21, 6, 13, 10, 2); fs(ctx, '#E2C69A', 1.2);
    ctx.fillStyle = '#6E4E30';
    ctx.beginPath(); ctx.ellipse(27.5, 11.5, 3, 3.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(13, 27); ctx.quadraticCurveTo(20, 34, 27, 27);
    fs(ctx, '#E9A0BA', 1.1);
  },
};

/** วาดไอคอนของชิ้นนั้นลงกรอบ 40×40 — id ไม่รู้จัก = ไม่วาดอะไร */
export function drawItemIcon(ctx, id) {
  const f = DRAW[id];
  if (f) f(ctx);
}
