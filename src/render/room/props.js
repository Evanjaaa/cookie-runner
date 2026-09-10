// src/render/room/props.js
// ─────────────────────────────────────────────────────────────
// ชิ้นส่วนของห้องเวิร์กช็อป
//
// ── ทุกชิ้นในไฟล์นี้ "ไม่รับเวลา" ──
// ฉากนี้เป็นภาพนิ่งตามที่ตั้งใจไว้ ไม่มีชิ้นไหนขยับเลยแม้แต่ชิ้นเดียว
// การไม่รับพารามิเตอร์เวลาเข้ามาตั้งแต่แรกคือวิธีที่ทำให้ "เผลอใส่แอนิเมชัน" ไม่ได้
// ถ้าวันหลังมีคนอยากให้ไอน้ำลอย จะต้องแก้ลายเซ็นฟังก์ชันก่อน ซึ่งเป็นการตัดสินใจ
// ที่ตั้งใจ ไม่ใช่หลุดเข้ามาโดยบังเอิญ
//
//     draw(ctx, x, y, s, p, seed)
//
// ── ของที่ยืมมาจากฉากข้างนอก ──
// ลูกไหมพรม ขวดยา โคมไฟ เพชร ใช้ตัวเดียวกับ render/kingdom/props.js
// ชิ้นพวกนั้นรับเวลาเข้าไปด้วย แต่เป็นฟังก์ชันบริสุทธิ์ — ส่งเวลาค่าคงที่เข้าไป
// ผลลัพธ์ก็คงที่ตาม จึงได้ภาพนิ่งโดยไม่ต้องเขียนของซ้ำอีกชุด (ดู FROZEN ใน index.js)
// ─────────────────────────────────────────────────────────────
import { EDGE } from './palette.js';

export function hash(n) {
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

function pen(ctx, p, s, k = 1) {
  ctx.strokeStyle = p.line;
  ctx.lineWidth = (EDGE / s) * k;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function local(ctx, x, y, s, fn) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  fn();
  ctx.restore();
}

/** รอยเท้าแมว — สัญลักษณ์ประจำร้าน โผล่ทั้งบนหม้อ บนโคม และเหนือหน้าต่าง */
function paw(ctx, x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.25, r, r * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(x + (i - 1) * r * 0.86, y - r * 0.72, r * 0.34, r * 0.44, (i - 1) * 0.34, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ══ โครงห้อง ══════════════════════════════════════════════

/**
 * กำแพงหิน — พื้นหลังของทุกอย่าง
 *
 * ก้อนหินเรียงสลับฟันปลาแถวเว้นแถว ถ้าเรียงตรงกันทุกแถวจะอ่านเป็นตารางกระเบื้อง
 * ไม่ใช่กำแพงหินก่อ ซึ่งเป็นรายละเอียดเล็ก ๆ ที่เปลี่ยนความรู้สึกของทั้งห้อง
 */
export function wall(ctx, W, floorY, p) {
  ctx.fillStyle = p.wall;
  ctx.fillRect(0, 0, W, floorY);

  const bh = 25;
  ctx.strokeStyle = p.wallLine;
  ctx.lineWidth = 2;
  for (let row = 0, y = 0; y < floorY; row++, y += bh) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    const off = row % 2 ? 0 : 31;
    for (let x = off; x < W; x += 62) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, Math.min(y + bh, floorY));
      ctx.stroke();
    }
    // ก้อนสุ่มบางก้อนเข้มกว่าเพื่อน = หินคนละก้อนคนละเฉด ไม่ใช่ผนังปูนทาสี
    for (let x = off, i = 0; x < W; x += 62, i++) {
      if (hash(row * 31 + i) > 0.66) {
        ctx.fillStyle = p.wallBlock;
        ctx.fillRect(x + 2, y + 2, 58, Math.min(bh - 4, floorY - y - 2));
      }
    }
  }

  // เงาไล่จากมุมบนลงมา ให้เพดานดูมืดกว่าระดับสายตา
  const g = ctx.createLinearGradient(0, 0, 0, floorY);
  g.addColorStop(0, p.wallShade);
  g.addColorStop(0.45, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, floorY);
}

/** พื้นหินเรียงแผ่น — เส้นแนวลึกลู่เข้าหาจุดกลางภาพ ทำให้พื้นดูราบไม่ใช่ผนังอีกแผ่น */
export function floor(ctx, W, H, floorY, p) {
  ctx.fillStyle = p.floor;
  ctx.fillRect(0, floorY, W, H - floorY);

  // ── เส้นแผ่นพื้นต้องเบา ──
  // ของเดิมใช้สีเส้นเต็มความเข้ม ผลคือพื้นอ่านเป็นกระดาษกราฟ ไม่ใช่หินปูพื้น
  // ลายพื้นมีหน้าที่บอก "ระยะลึก" เฉย ๆ ไม่ได้มีหน้าที่ให้ใครมอง
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = p.floorLine;
  ctx.lineWidth = 1.4;

  // เส้นขวาง ยิ่งใกล้ยิ่งห่าง = ระยะที่หดตามความลึก
  let y = floorY;
  let gap = 11;
  while (y < H) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    y += gap;
    gap *= 1.5;
  }
  // เส้นแนวลึก ลู่ออกจากจุดกึ่งกลางฉาก
  const vx = W / 2;
  for (let i = -7; i <= 7; i++) {
    ctx.beginPath();
    ctx.moveTo(vx + i * 34, floorY);
    ctx.lineTo(vx + i * 120, H);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ══ ของบนกำแพง ═══════════════════════════════════════════

/**
 * หน้าต่างโค้ง — ช่องเดียวที่เห็นโลกข้างนอก
 *
 * ── ทำไมต้องเป็นจุดสว่างที่สุดของภาพ ──
 * ห้องนี้แน่นไปด้วยของ ถ้าไม่มีจุดให้ตาพัก สายตาจะวิ่งวนไม่รู้จะหยุดตรงไหน
 * ช่องสว่างกลางภาพทำหน้าที่นั้น และบังเอิญเป็นที่ที่ตัวน้องยืนอยู่ใต้พอดี
 */
export function archWindow(ctx, x, y, s, p) {
  local(ctx, x, y, s, () => {
    const R = 92, HB = 58;   // รัศมีส่วนโค้ง กับความสูงส่วนล่าง

    // ช่องฟ้า
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-R, HB);
    ctx.lineTo(-R, 0);
    ctx.arc(0, 0, R, Math.PI, 0);
    ctx.lineTo(R, HB);
    ctx.closePath();
    ctx.clip();

    const sky = ctx.createLinearGradient(0, -R, 0, HB);
    sky.addColorStop(0, p.skyIn[0]);
    sky.addColorStop(0.55, p.skyIn[1]);
    sky.addColorStop(1, p.skyIn[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(-R, -R, R * 2, R + HB);

    // เมืองไกล ๆ วาดเป็นเงาทึบสีเดียว ของที่อยู่ไกลมากไม่ต้องมีรายละเอียด
    // เงาเมืองต้องเข้มพอที่จะอ่านเป็นเงา ของเดิมจางเกินจนดูเป็นแถบสีซีด ๆ
    ctx.fillStyle = 'rgba(198, 156, 126, .92)';
    const towers = [[-66, 44, 26], [-34, 24, 19], [2, 38, 23], [40, 16, 18], [70, 34, 24]];
    for (const [tx, th, tw] of towers) {
      ctx.fillRect(tx - tw / 2, HB - th - 16, tw, th + 16);
      ctx.beginPath();
      ctx.arc(tx, HB - th - 16, tw * 0.62, Math.PI, 0);
      ctx.fill();
      // ยอดหูแมวบนหอ — บอกว่าข้างนอกคืออาณาจักรแมว ไม่ใช่เมืองทั่วไป
      ctx.beginPath();
      ctx.moveTo(tx - tw * 0.5, HB - th - 20);
      ctx.lineTo(tx - tw * 0.24, HB - th - 20 - tw * 0.5);
      ctx.lineTo(tx, HB - th - 22);
      ctx.lineTo(tx + tw * 0.24, HB - th - 20 - tw * 0.5);
      ctx.lineTo(tx + tw * 0.5, HB - th - 20);
      ctx.closePath();
      ctx.fill();
    }
    // โดนัทลอยข้างนอก บอกว่าโลกข้างนอกคืออาณาจักรขนมหวานที่กำลังจะไป
    ctx.strokeStyle = '#F4A9C6';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(30, 4, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // กรอบไม้
    pen(ctx, p, s, 1.1);
    ctx.strokeStyle = p.woodDark;
    ctx.lineWidth = 11 / s;
    ctx.beginPath();
    ctx.moveTo(-R, HB);
    ctx.lineTo(-R, 0);
    ctx.arc(0, 0, R, Math.PI, 0);
    ctx.lineTo(R, HB);
    ctx.stroke();
    ctx.strokeStyle = p.wood;
    ctx.lineWidth = 6 / s;
    ctx.beginPath();
    ctx.moveTo(-R, HB);
    ctx.lineTo(-R, 0);
    ctx.arc(0, 0, R, Math.PI, 0);
    ctx.lineTo(R, HB);
    ctx.stroke();

    // ธรณีหน้าต่าง
    ctx.fillStyle = p.wood;
    pen(ctx, p, s, 0.8);
    rr(ctx, -R - 8, HB, R * 2 + 16, 10, 3);
    ctx.fill(); ctx.stroke();
  });
}

/** ป้ายรอยเท้าเหนือหน้าต่าง — โลโก้ของร้าน */
export function pawSign(ctx, x, y, s, p) {
  local(ctx, x, y, s, () => {
    paw(ctx, 0, 0, 13, 'rgba(120, 84, 56, .42)');
  });
}

/**
 * ตู้ชั้นวางติดผนัง — ช่องเก็บหลอดด้ายกับขวดเล็ก
 * ช่องข้างในต้องเข้มกว่าตัวตู้มาก ไม่งั้นอ่านเป็นลายตารางบนแผ่นไม้ ไม่ใช่ช่องลึก
 */
export function shelfUnit(ctx, x, y, s, p, seed) {
  local(ctx, x, y, s, () => {
    const W = 104, H = 120;
    pen(ctx, p, s, 0.85);
    ctx.fillStyle = p.wood;
    rr(ctx, -W / 2, -H, W, H, 4);
    ctx.fill(); ctx.stroke();

    const cols = 2, rows = 3;
    const cw = (W - 12) / cols, ch = (H - 12) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = -W / 2 + 6 + c * cw;
        const cy = -H + 6 + r * ch;
        ctx.fillStyle = p.woodDeep;
        ctx.fillRect(cx + 2, cy + 2, cw - 4, ch - 4);

        const kind = Math.floor(hash(seed + r * 7 + c * 3) * 3);
        const mx = cx + cw / 2, my = cy + ch - 6;
        if (kind === 0) spool(ctx, mx, my, 0.8, p, seed + r + c);
        else if (kind === 1) {
          // ขวดเล็กสองใบ
          for (const dx of [-8, 8]) {
            ctx.fillStyle = p.glass;
            rr(ctx, mx + dx - 4, my - 16, 8, 16, 2);
            ctx.fill();
            ctx.fillStyle = p.thread[Math.floor(hash(seed + dx + r) * p.thread.length)];
            ctx.fillRect(mx + dx - 3, my - 8, 6, 7);
          }
        } else {
          // ลูกไหมพรมเล็กในช่อง
          ctx.fillStyle = p.thread[Math.floor(hash(seed + r * 5 + c) * p.thread.length)];
          ctx.beginPath(); ctx.arc(mx, my - 9, 9, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,.2)';
          ctx.lineWidth = 1.4 / s;
          ctx.beginPath(); ctx.ellipse(mx, my - 9, 8, 3.6, 0.5, 0, Math.PI * 2); ctx.stroke();
        }
      }
    }
    // แผ่นชั้นคั่น วาดทับหลังของในช่อง จึงดูเหมือนของวางอยู่บนชั้นจริง
    ctx.fillStyle = p.woodLight;
    for (let r = 1; r < rows; r++) {
      ctx.fillRect(-W / 2 + 4, -H + 4 + r * ch - 3, W - 8, 4);
    }
  });
}

/** หลอดด้าย — ของที่มีเยอะที่สุดในร้าน ต้องวาดให้ถูกจนอ่านออกว่าเป็นหลอดด้าย */
export function spool(ctx, x, y, s, p, seed) {
  local(ctx, x, y, s, () => {
    const col = p.thread[Math.floor(hash(seed) * p.thread.length)];
    pen(ctx, p, s, 0.6);
    // แกนไม้บนล่าง
    ctx.fillStyle = p.woodLight;
    rr(ctx, -9, -26, 18, 5, 2); ctx.fill(); ctx.stroke();
    rr(ctx, -9, -5, 18, 5, 2); ctx.fill(); ctx.stroke();
    // ตัวด้ายพันตรงกลาง เอวคอดกว่าหัวท้าย
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-7, -21);
    ctx.quadraticCurveTo(-5, -13, -7, -5);
    ctx.lineTo(7, -5);
    ctx.quadraticCurveTo(5, -13, 7, -21);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.16)';
    ctx.lineWidth = 1.2 / s;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-6.4, -19 + i * 5);
      ctx.lineTo(6.4, -18 + i * 5);
      ctx.stroke();
    }
  });
}

/** ราวแขวนแปรงหวีขน — ของที่บอกว่าที่นี่คือร้านของแมว ไม่ใช่ร้านตัดเสื้อ */
export function brushRack(ctx, x, y, s, p, seed) {
  local(ctx, x, y, s, () => {
    pen(ctx, p, s, 0.85);
    ctx.fillStyle = p.wood;
    rr(ctx, -70, 0, 140, 13, 4); ctx.fill(); ctx.stroke();

    const kinds = [0, 1, 1];
    for (let i = 0; i < 3; i++) {
      const bx = -44 + i * 44;
      // สายแขวน
      ctx.strokeStyle = p.line;
      ctx.lineWidth = 1.8 / s;
      ctx.beginPath(); ctx.moveTo(bx, 13); ctx.lineTo(bx, 24); ctx.stroke();

      if (kinds[i] === 0) {
        // แปรงสี่เหลี่ยมซี่ถี่
        ctx.fillStyle = '#B9BEC4';
        pen(ctx, p, s, 0.7);
        rr(ctx, bx - 17, 24, 34, 30, 5); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(78,53,39,.35)';
        ctx.lineWidth = 1.1 / s;
        for (let k = -3; k <= 3; k++) {
          ctx.beginPath(); ctx.moveTo(bx + k * 4.4, 28); ctx.lineTo(bx + k * 4.4, 50); ctx.stroke();
        }
        ctx.fillStyle = p.wood;
        pen(ctx, p, s, 0.7);
        rr(ctx, bx - 5, 54, 10, 30, 4); ctx.fill(); ctx.stroke();
      } else {
        // หวีทรงรี ด้ามไม้ยาว
        ctx.fillStyle = '#C6CBD1';
        pen(ctx, p, s, 0.7);
        ctx.beginPath(); ctx.ellipse(bx, 40, 15, 18, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(78,53,39,.28)';
        for (let a = 0; a < 26; a++) {
          const px = bx - 10 + (a % 6) * 4;
          const py = 30 + Math.floor(a / 6) * 5.4;
          ctx.beginPath(); ctx.arc(px, py, 1.1, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = p.wood;
        pen(ctx, p, s, 0.7);
        rr(ctx, bx - 4.5, 56, 9, 30, 4); ctx.fill(); ctx.stroke();
      }
    }
  });
}

/** แผนที่ขุมทรัพย์ติดผนัง — ใบไม้เหลืองมีเส้นทางประ กากบาทตรงปลาย */
export function treasureMap(ctx, x, y, s, p, seed) {
  local(ctx, x, y, s, () => {
    const W = 78, H = 60;
    pen(ctx, p, s, 0.7);
    ctx.fillStyle = p.paper;
    // ขอบกระดาษหยักเล็กน้อย กระดาษเก่าไม่มีขอบตรงเป๊ะ
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      const px = -W / 2 + u * W;
      ctx.lineTo(px, -H / 2 + Math.sin(u * 9 + seed) * 1.6);
    }
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      ctx.lineTo(W / 2 + Math.sin(u * 7 + seed) * 1.6, -H / 2 + u * H);
    }
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      ctx.lineTo(W / 2 - u * W, H / 2 + Math.sin(u * 9 + seed * 2) * 1.6);
    }
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // เส้นทางประกับหมุด
    ctx.strokeStyle = p.paperLine;
    ctx.lineWidth = 1.6 / s;
    ctx.setLineDash([4 / s, 3 / s]);
    ctx.beginPath();
    ctx.moveTo(-24, 14);
    ctx.quadraticCurveTo(-4, -6, 6, 8);
    ctx.quadraticCurveTo(16, 20, 26, -10);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#7FB25E';
    ctx.beginPath(); ctx.ellipse(-16, -6, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6FA8D8';
    ctx.beginPath(); ctx.ellipse(14, 16, 8, 4.6, 0, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = '#C8493F';
    ctx.lineWidth = 2.4 / s;
    ctx.beginPath();
    ctx.moveTo(22, -14); ctx.lineTo(30, -6);
    ctx.moveTo(30, -14); ctx.lineTo(22, -6);
    ctx.stroke();

    // หมุดไม้สี่มุม
    ctx.fillStyle = p.woodDark;
    for (const [cx, cy] of [[-W / 2 + 4, -H / 2 + 4], [W / 2 - 4, -H / 2 + 4]]) {
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
    }
  });
}

/** ขนนกแขวน — ของตกแต่งที่ทำให้ผนังฝั่งขวาไม่โล่ง */
export function featherHang(ctx, x, y, s, p, seed) {
  local(ctx, x, y, s, () => {
    for (let i = 0; i < 3; i++) {
      const fx = (i - 1) * 13;
      const len = 26 + hash(seed + i) * 14;
      ctx.strokeStyle = p.line;
      ctx.lineWidth = 1.4 / s;
      ctx.beginPath(); ctx.moveTo(fx, 0); ctx.lineTo(fx, 10); ctx.stroke();

      ctx.fillStyle = p.feather[Math.floor(hash(seed + i * 3) * p.feather.length)];
      pen(ctx, p, s, 0.6);
      ctx.beginPath();
      ctx.ellipse(fx, 10 + len / 2, 6.5, len / 2, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(78,53,39,.4)';
      ctx.lineWidth = 1.2 / s;
      ctx.beginPath(); ctx.moveTo(fx, 10); ctx.lineTo(fx, 10 + len); ctx.stroke();
    }
  });
}

// ══ ของบนพื้นและบนโต๊ะ ═══════════════════════════════════

/**
 * โต๊ะไม้ — วาดเป็นแผ่นหนาที่เห็นด้านข้าง ไม่ใช่เส้นบาง
 * ความหนาของแผ่นคือสิ่งเดียวที่ทำให้โต๊ะดูรับน้ำหนักของที่วางอยู่บนมันได้
 */
export function table(ctx, x, y, w, s, p) {
  local(ctx, x, y, s, () => {
    pen(ctx, p, s, 0.9);
    // หน้าโต๊ะเป็นสี่เหลี่ยมด้านขนาน มองจากมุมสูงเล็กน้อย
    ctx.fillStyle = p.woodLight;
    ctx.beginPath();
    ctx.moveTo(-w / 2 - 20, 0);
    ctx.lineTo(w / 2 + 20, 0);
    ctx.lineTo(w / 2, -18);
    ctx.lineTo(-w / 2, -18);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // ── ด้านหน้าของแผ่น ──
    // ความหนาตรงนี้คือสิ่งเดียวที่ทำให้โต๊ะดูรับน้ำหนักของที่วางอยู่ได้
    // ของเดิมหนา 11 ซึ่งอ่านเป็นแผ่นไม้พาด ไม่ใช่โต๊ะทำงานที่มีของวางเต็ม
    ctx.fillStyle = p.wood;
    rr(ctx, -w / 2 - 20, 0, w + 40, 17, 3);
    ctx.fill(); ctx.stroke();
    // ลายไม้บนด้านหน้า
    ctx.strokeStyle = 'rgba(78,53,39,.2)';
    ctx.lineWidth = 1.4 / s;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * (w / 5), 4); ctx.lineTo(i * (w / 5) + 6, 13);
      ctx.stroke();
    }
    // ขา
    pen(ctx, p, s, 0.9);
    ctx.fillStyle = p.woodDark;
    for (const sx of [-1, 1]) {
      rr(ctx, sx * (w / 2 - 10) - 10, 17, 20, 58, 3);
      ctx.fill(); ctx.stroke();
    }
    // คานยึดขา ทำให้โต๊ะเป็นโครงเดียว ไม่ใช่แผ่นไม้ที่มีเสาสองต้นแยกกัน
    ctx.fillStyle = p.wood;
    rr(ctx, -w / 2 + 4, 50, w - 8, 8, 3);
    ctx.fill(); ctx.stroke();
  });
}

/** หม้อต้มยา — จุดเข้มที่สุดบนโต๊ะซ้าย ถ่วงกับโคมไฟที่สว่างที่สุดบนโต๊ะขวา */
export function cauldron(ctx, x, y, s, p) {
  local(ctx, x, y, s, () => {
    pen(ctx, p, s, 0.9);
    ctx.fillStyle = p.pot;
    ctx.beginPath();
    ctx.moveTo(-30, -34);
    ctx.quadraticCurveTo(-36, -4, -18, 2);
    ctx.lineTo(18, 2);
    ctx.quadraticCurveTo(36, -4, 30, -34);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // ปากหม้อ
    ctx.fillStyle = p.potDark;
    ctx.beginPath(); ctx.ellipse(0, -34, 30, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = p.milk;
    ctx.beginPath(); ctx.ellipse(0, -33, 25, 7, 0, 0, Math.PI * 2); ctx.fill();

    // หูหิ้วข้าง
    ctx.strokeStyle = p.potDark;
    ctx.lineWidth = 4.5 / s;
    ctx.beginPath(); ctx.arc(-32, -20, 8, Math.PI * 0.4, Math.PI * 1.6); ctx.stroke();

    paw(ctx, 0, -16, 9, p.potDark);

    // ไอน้ำ — เส้นโค้งนิ่ง ๆ ไม่ได้ลอย ฉากนี้เป็นภาพนิ่งทั้งฉาก
    ctx.strokeStyle = p.steam;
    ctx.lineWidth = 5 / s;
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(-6 + i * 10, -40);
      ctx.quadraticCurveTo(-16 + i * 22, -56, -6 + i * 12, -74);
      ctx.quadraticCurveTo(2 + i * 6, -88, -2 + i * 14, -98);
      ctx.stroke();
    }
  });
}

/** ตะกร้าไหมพรม — ลูกไหมโผล่พ้นขอบตะกร้า จึงอ่านว่า "เต็มจนล้น" */
export function yarnBasket(ctx, x, y, s, p, seed, ballFn) {
  local(ctx, x, y, s, () => {
    // ลูกไหมวางก่อน ตะกร้าทับทีหลัง ลูกล่างจึงถูกบังครึ่งเหมือนจมอยู่ในตะกร้าจริง
    const n = 4;
    for (let i = 0; i < n; i++) {
      const bx = -20 + (i % 3) * 20 + (i > 2 ? 10 : 0);
      const by = -24 - (i > 2 ? 13 : 0);
      ballFn(ctx, bx, by, 0.62, seed + i * 5);
    }
    pen(ctx, p, s, 0.85);
    ctx.fillStyle = p.wood;
    ctx.beginPath();
    ctx.moveTo(-34, -22);
    ctx.lineTo(34, -22);
    ctx.lineTo(26, 6);
    ctx.lineTo(-26, 6);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // ลายสาน
    ctx.strokeStyle = 'rgba(78,53,39,.26)';
    ctx.lineWidth = 1.5 / s;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-33 + i * 2, -15 + i * 7);
      ctx.lineTo(33 - i * 2, -15 + i * 7);
      ctx.stroke();
    }
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 13, -22); ctx.lineTo(i * 10, 6);
      ctx.stroke();
    }
  });
}

/** โหลแก้วใส่สมุนไพร — ของเล็กที่เติมช่องว่างบนโต๊ะ */
export function herbJar(ctx, x, y, s, p, seed) {
  local(ctx, x, y, s, () => {
    pen(ctx, p, s, 0.75);
    ctx.fillStyle = p.glass;
    rr(ctx, -13, -32, 26, 32, 5);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = p.herb;
    ctx.fillRect(-13, -18, 26, 18);
    // เม็ดสมุนไพร
    ctx.fillStyle = 'rgba(60,90,40,.45)';
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.arc(-10 + hash(seed + i) * 20, -16 + hash(seed + i * 3) * 14, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.stroke();
    ctx.fillStyle = p.cork;
    rr(ctx, -10, -38, 20, 7, 2);
    ctx.fill(); ctx.stroke();
  });
}

/** ชั้นบันไดวางขวดยา — ของกลางฉากที่อยู่ใต้หน้าต่างพอดี */
export function potionSteps(ctx, x, y, s, p, potionFn) {
  local(ctx, x, y, s, () => {
    pen(ctx, p, s, 0.85);
    // สามขั้น ขั้นกลางสูงสุด เงาโดยรวมจึงเป็นสามเหลี่ยมชี้ขึ้นไปหาหน้าต่าง
    const steps = [[-82, 22], [0, 36], [82, 22]];
    for (const [sx, sh] of steps) {
      ctx.fillStyle = p.woodLight;
      rr(ctx, sx - 26, -sh, 52, 7, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = p.wood;
      rr(ctx, sx - 22, -sh + 7, 44, sh - 7, 2); ctx.fill(); ctx.stroke();
    }
    for (const [sx, sh] of steps) {
      potionFn(ctx, sx, -sh, 0.62, sx * 3 + 7);
    }
  });
}

/** หนูนั่งนิ่ง — ฉากนี้ไม่มีอะไรขยับ จึงเขียนตัวนิ่งแยกจากหนูกระโดดของฉากข้างนอก */
export function mouseStill(ctx, x, y, s, p, seed) {
  const face = hash(seed) > 0.5 ? 1 : -1;
  local(ctx, x, y, s, () => {
    ctx.scale(face, 1);
    pen(ctx, p, s, 0.7);
    ctx.fillStyle = '#B3A08E';
    ctx.beginPath(); ctx.ellipse(0, -7, 12, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(10, -9, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#E9AFB6';
    ctx.beginPath(); ctx.arc(7, -15, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#B3A08E';
    ctx.lineWidth = 1.8 / s;
    ctx.beginPath();
    ctx.moveTo(-11, -7);
    ctx.quadraticCurveTo(-22, -10, -26, -2);
    ctx.stroke();
    ctx.fillStyle = p.line;
    ctx.beginPath(); ctx.arc(13, -10, 1.3, 0, Math.PI * 2); ctx.fill();
  });
}

/**
 * พรมรูปหัวใจกลางห้อง — ที่ที่น้องยืน
 *
 * ทรงหัวใจวาดจากวงกลมสองวงกับสามเหลี่ยมปลายแหลม แล้วบีบแนวตั้งให้เป็นมุมมองเฉียง
 * ถ้าไม่บีบ มันจะอ่านเป็นสติกเกอร์หัวใจแปะบนพื้น ไม่ใช่ผ้าที่ปูราบอยู่
 */
export function heartRug(ctx, x, y, s, p) {
  const shape = (ctx, k) => {
    ctx.beginPath();
    ctx.moveTo(0, 62 * k);
    ctx.bezierCurveTo(-92 * k, 18 * k, -70 * k, -34 * k, -30 * k, -20 * k);
    ctx.bezierCurveTo(-14 * k, -14 * k, -6 * k, -4 * k, 0, 4 * k);
    ctx.bezierCurveTo(6 * k, -4 * k, 14 * k, -14 * k, 30 * k, -20 * k);
    ctx.bezierCurveTo(70 * k, -34 * k, 92 * k, 18 * k, 0, 62 * k);
    ctx.closePath();
  };

  local(ctx, x, y, s, () => {
    ctx.scale(1, 0.66);   // มุมมองเฉียง — พื้นราบเสมอถูกบีบแนวตั้ง

    // พู่ชายผ้ารอบขอบ วาดก่อนตัวพรมจึงโผล่ออกมาจากใต้ผืน
    ctx.strokeStyle = p.rugCream;
    ctx.lineWidth = 2.6 / s;
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 58);
      ctx.lineTo(0, 66);
      ctx.stroke();
      ctx.restore();
    }

    pen(ctx, p, s, 0.7);
    ctx.fillStyle = p.rug;
    shape(ctx, 1); ctx.fill(); ctx.stroke();

    ctx.strokeStyle = p.rugGold;
    ctx.lineWidth = 3.2 / s;
    shape(ctx, 0.86); ctx.stroke();
    ctx.lineWidth = 1.8 / s;
    shape(ctx, 0.76); ctx.stroke();

    ctx.fillStyle = p.rugDark;
    shape(ctx, 0.7); ctx.fill();

    // ลายกลางผืน — ลูกไหมพรมสามลูก ตรงกับของที่ร้านนี้ขาย
    const balls = [[-16, 16, 13], [15, 12, 11], [0, 30, 10]];
    for (const [bx, by, br] of balls) {
      ctx.fillStyle = p.rugGold;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = p.rugDark;
      ctx.lineWidth = 1.6 / s;
      ctx.beginPath(); ctx.ellipse(bx, by, br * 0.86, br * 0.36, 0.6, 0, Math.PI * 2); ctx.stroke();
    }
    // เส้นกากบาทจาง ๆ ใต้ลูกไหม ให้ผืนไม่โล่งเป็นสีเดียว
    ctx.strokeStyle = 'rgba(226,178,94,.5)';
    ctx.lineWidth = 2 / s;
    ctx.beginPath();
    ctx.moveTo(-40, 6); ctx.lineTo(40, 6);
    ctx.stroke();
  });
}
