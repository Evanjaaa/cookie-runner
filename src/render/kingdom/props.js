// src/render/kingdom/props.js
// ─────────────────────────────────────────────────────────────
// คลังชิ้นส่วนของฉาก — ปราสาท ต้นไม้ เห็ด โดนัท ขวดยา ไหมพรม หนู โคมไฟ
//
// ── กติกาเดียวของไฟล์นี้ ──
// ทุกชิ้นเป็นฟังก์ชันบริสุทธิ์หน้าตาเหมือนกันเป๊ะ:
//
//     draw(ctx, x, y, s, p, t, seed)
//
//     x, y   จุดอ้างอิงของชิ้นนั้นในพิกัดฉาก (ส่วนใหญ่คือ "จุดที่แตะพื้น")
//     s      ตัวคูณขนาด 1 = ขนาดมาตรฐาน
//     p      จานสี (ดู palette.js) — ห้ามเขียนเลขสีฝังไว้ในชิ้นส่วน
//     t      เลขเฟรม ใช้กับชิ้นที่ขยับ
//     seed   ตัวเลขคงที่ต่อชิ้น ใช้สุ่มหน้าตาให้แต่ละชิ้นไม่เหมือนกัน
//            แต่ "ชิ้นเดิมต้องหน้าตาเดิมทุกครั้ง" จึงสุ่มจากเลขนี้ ไม่ใช่ Math.random()
//
// หน้าตาเหมือนกันหมดแปลว่าเอาไปเสียบใน layers.js ได้ทุกชิ้นโดยไม่ต้องรู้ว่ามันคืออะไร
// และเอาไปใช้กับระบบฉากของด่านจริง (src/render/background.js) ได้ด้วยลายเซ็นเดียวกัน
// ─────────────────────────────────────────────────────────────
import { EDGE } from './palette.js';

/** สุ่มแบบคงที่ — เลขเดิมเข้าไปได้ผลเดิมออกมาเสมอ */
export function hash(n) {
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

/** ตั้งปากกาเส้นขอบ — หาร s ทิ้งเพื่อให้เส้นหนาเท่ากันทุกชิ้นไม่ว่าชิ้นนั้นจะย่อขยายเท่าไหร่ */
function pen(ctx, p, s, k = 1) {
  ctx.strokeStyle = p.line;
  ctx.lineWidth = (EDGE / s) * k;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

/** สี่เหลี่ยมมุมมน — ใช้บ่อยจนต้องมีตัวช่วย ทรงมนคือหัวใจของสไตล์การ์ตูน */
function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** เปิดพิกัดท้องถิ่นของชิ้นส่วน — ข้างในเขียนเป็นหน่วยของตัวเองได้เลย ไม่ต้องคูณ s เอง */
function local(ctx, x, y, s, fn) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  fn();
  ctx.restore();
}

/**
 * ช่องหน้าต่างรูปหน้าแมว — ลายเซ็นของอาณาจักรนี้
 * หัวมนกับหูสามเหลี่ยมสองข้าง วาดเป็นเงาทึบสีเดียว ไม่มีรายละเอียดข้างใน
 * เพราะมันเป็น "ช่องมืด" ไม่ใช่รูปแมว ถ้าใส่ตาใส่จมูกจะกลายเป็นสติกเกอร์แปะกำแพง
 */
function catHole(ctx, cx, cy, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  // หูซ้าย
  ctx.moveTo(cx - r * 0.86, cy - r * 0.42);
  ctx.lineTo(cx - r * 0.62, cy - r * 1.28);
  ctx.lineTo(cx - r * 0.16, cy - r * 0.74);
  // หูขวา
  ctx.lineTo(cx + r * 0.16, cy - r * 0.74);
  ctx.lineTo(cx + r * 0.62, cy - r * 1.28);
  ctx.lineTo(cx + r * 0.86, cy - r * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy - r * 0.1, r * 0.86, r * 0.88, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ══ ชั้นฟ้า ═══════════════════════════════════════════════

/** ก้อนเมฆนุ่ม ๆ — วงกลมสามสี่วงซ้อนกัน ไม่มีเส้นขอบ เมฆมีขอบแล้วจะกลายเป็นก้อนหิน */
function cloud(ctx, x, y, s, p, t, seed) {
  local(ctx, x, y, s, () => {
    const n = 4 + Math.floor(hash(seed) * 3);
    ctx.fillStyle = p.cloudShade;
    for (let i = 0; i < n; i++) {
      const bx = (i - (n - 1) / 2) * 26 + (hash(seed + i) - 0.5) * 10;
      const br = 20 + hash(seed + i * 3) * 14;
      ctx.beginPath();
      ctx.arc(bx, 6, br, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = p.cloud;
    for (let i = 0; i < n; i++) {
      const bx = (i - (n - 1) / 2) * 26 + (hash(seed + i) - 0.5) * 10;
      const br = 20 + hash(seed + i * 3) * 14;
      ctx.beginPath();
      ctx.arc(bx, 0, br, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** ของลอยบนฟ้า — อมยิ้ม เพชร รอยเท้าแมว เลือกตามเลขสุ่มคงที่ */
function skyBauble(ctx, x, y, s, p, t, seed) {
  const bob = Math.sin(t * 0.02 + seed) * 4;
  local(ctx, x, y + bob, s, () => {
    const kind = Math.floor(hash(seed * 3) * 3);
    pen(ctx, p, s, 0.8);
    if (kind === 0) {
      // เพชร
      ctx.fillStyle = p.gem[Math.floor(hash(seed + 1) * p.gem.length)];
      ctx.beginPath();
      ctx.moveTo(0, -9); ctx.lineTo(7, -1); ctx.lineTo(0, 10); ctx.lineTo(-7, -1);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (kind === 1) {
      // ลูกอมกลม
      ctx.fillStyle = p.candyPink;
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = p.candyCream;
      ctx.beginPath(); ctx.arc(-2.4, -2.4, 2.6, 0, Math.PI * 2); ctx.fill();
    } else {
      // รอยเท้าแมว — เม็ดใหญ่หนึ่งเม็ดกับเม็ดเล็กสามเม็ด
      ctx.fillStyle = p.candyCream;
      ctx.beginPath(); ctx.ellipse(0, 3, 6, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse((i - 1) * 5.4, -4.6, 2.2, 2.8, (i - 1) * 0.4, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
    }
  });
}

// ══ ชั้นปราสาท ════════════════════════════════════════════

/** หอคอยหนึ่งต้น พร้อมหมวกทรงกระบอกด้านบน — ใช้ซ้ำทั้งในปราสาทและบนกำแพง */
function towerAt(ctx, p, s, cx, top, w, bottom) {
  ctx.fillStyle = p.stone;
  ctx.fillRect(cx - w / 2, top, w, bottom - top);
  pen(ctx, p, s, 0.75);
  ctx.strokeRect(cx - w / 2, top, w, bottom - top);

  // หมวกหอคอย กว้างกว่าตัวหอเล็กน้อยจึงอ่านเป็น "หมวก" ไม่ใช่ท่อนต่อ
  ctx.fillStyle = p.roof;
  rr(ctx, cx - w * 0.66, top - w * 0.34, w * 1.32, w * 0.4, w * 0.14);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = p.roofDark;
  ctx.fillRect(cx - w * 0.66, top - w * 0.02, w * 1.32, w * 0.08);

  // แถบเงาด้านขวาของหอ — ทรงกระบอกต้องมีด้านมืด ไม่งั้นอ่านเป็นแผ่นสี่เหลี่ยม
  ctx.fillStyle = p.stoneDark;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(cx + w * 0.18, top, w * 0.32, bottom - top);
  ctx.globalAlpha = 1;
}

/**
 * ปราสาทแมว — ชิ้นเอกกลางฉาก
 *
 * ── ทำไมต้องเป็นชั้น ๆ ──
 * ปราสาทที่อ่านออกจากไกลได้คือปราสาทที่มี "เงาโดยรวมเป็นขั้นบันได"
 * ไม่ใช่ปราสาทที่มีรายละเอียดเยอะ ชั้นล่างกว้างสุดแล้วแคบขึ้นไปสามชั้น
 * ตากวาดครั้งเดียวก็รู้ว่าเป็นปราสาท แม้ชั้นนี้จะเลื่อนช้าและอยู่หลังทุกอย่าง
 */
function castle(ctx, x, y, s, p, t, seed) {
  local(ctx, x, y, s, () => {
    pen(ctx, p, s, 0.75);

    // ── ชั้นล่างสุด ──
    ctx.fillStyle = p.stone;
    ctx.fillRect(-110, -120, 220, 120);
    ctx.strokeRect(-110, -120, 220, 120);

    // ประตูโค้งกลาง — จุดเดียวที่เป็นสีเข้มในก้อนสว่าง ตาจึงหยุดตรงกลางเสมอ
    ctx.fillStyle = p.window;
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.lineTo(-22, -44);
    ctx.arc(0, -44, 22, Math.PI, 0);
    ctx.lineTo(22, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    catHole(ctx, -66, -76, 15, p.window);
    catHole(ctx, 66, -76, 15, p.window);

    // ── ชั้นกลาง ──
    ctx.fillStyle = p.stoneLight;
    ctx.fillRect(-78, -196, 156, 78);
    ctx.strokeRect(-78, -196, 156, 78);
    catHole(ctx, -40, -152, 14, p.window);
    catHole(ctx, 40, -152, 14, p.window);

    // ผ้าคาดใต้ชั้นกลาง — แถบสีม่วงอ่อนตัดกับหินสีครีมทั้งก้อน
    ctx.fillStyle = p.banner;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 22 - 11, -118);
      ctx.lineTo(i * 22 + 11, -118);
      ctx.lineTo(i * 22, -104);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }

    // ── ชั้นบนสุด ──
    ctx.fillStyle = p.stone;
    ctx.fillRect(-46, -252, 92, 58);
    ctx.strokeRect(-46, -252, 92, 58);
    catHole(ctx, 0, -218, 15, p.window);

    // ── หอคอย ──
    // สองต้นนอกสูงกว่าสองต้นใน แล้วต้นกลางสูงสุด = เงาโดยรวมเป็นสามเหลี่ยม
    towerAt(ctx, p, s, -96, -168, 30, -110);
    towerAt(ctx, p, s, 96, -168, 30, -110);
    towerAt(ctx, p, s, -58, -232, 26, -186);
    towerAt(ctx, p, s, 58, -232, 26, -186);
    towerAt(ctx, p, s, 0, -300, 32, -242);

    // ธงบนยอดหอกลาง โบกตามเวลา
    const wave = Math.sin(t * 0.05) * 5;
    ctx.fillStyle = p.bannerDark;
    ctx.beginPath();
    ctx.moveTo(0, -322);
    ctx.lineTo(30 + wave, -312);
    ctx.lineTo(0, -302);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -300); ctx.lineTo(0, -326);
    ctx.stroke();
  });
}

/** กำแพงเมืองพร้อมหอคอยหนึ่งต้น — วางซ้ำสองข้างเพื่อขนาบปราสาทกลาง */
function wallTower(ctx, x, y, s, p, t, seed) {
  local(ctx, x, y, s, () => {
    pen(ctx, p, s, 0.75);
    // แนวกำแพงเตี้ย
    ctx.fillStyle = p.stoneLight;
    ctx.fillRect(-70, -74, 140, 74);
    ctx.strokeRect(-70, -74, 140, 74);
    catHole(ctx, -38, -44, 12, p.window);
    catHole(ctx, 38, -44, 12, p.window);
    // หอคอยตรงกลางกำแพง
    towerAt(ctx, p, s, 0, -150, 40, -60);
    catHole(ctx, 0, -112, 13, p.window);
  });
}

// ══ ชั้นธรรมชาติ ══════════════════════════════════════════

/** เนินมอสส์ — ก้อนมนคลุมด้วยมอสส์ ใช้เป็นฐานให้ของอื่นยืน */
function mossHill(ctx, x, y, s, p, t, seed) {
  local(ctx, x, y, s, () => {
    const w = 80 + hash(seed) * 60;
    const h = 34 + hash(seed + 3) * 26;
    pen(ctx, p, s, 0.7);
    ctx.fillStyle = p.rock;
    ctx.beginPath();
    ctx.ellipse(0, 0, w, h, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // มอสส์คลุมด้านบน ขอบล่างหยักเป็นหยดย้อยลงมา = ดูชุ่มน้ำ
    ctx.fillStyle = p.moss;
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.ellipse(0, 0, w, h, 0, Math.PI, 0);
    for (let i = 0; i <= 6; i++) {
      const px = w - (i / 6) * w * 2;
      ctx.quadraticCurveTo(px + w / 6, -h * 0.3 + 10, px, -h * 0.34);
    }
    ctx.closePath();
    ctx.fill();
  });
}

/**
 * น้ำตก — ชิ้นเดียวในฉากที่ "ไหล" จริง
 * ริ้วน้ำเลื่อนลงด้วย modulo ของเวลา จึงวนไม่รู้จบโดยไม่ต้องเก็บสถานะอะไรเลย
 */
function waterfall(ctx, x, y, s, p, t, seed) {
  local(ctx, x, y, s, () => {
    const w = 26 + hash(seed) * 14;
    const h = 96 + hash(seed + 2) * 40;
    ctx.fillStyle = p.water;
    rr(ctx, -w / 2, 0, w, h, w * 0.3);
    ctx.fill();
    // ริ้วเงาไหลลง — ตัดด้วย clip ให้อยู่ในลำน้ำเสมอ
    ctx.save();
    ctx.clip();
    ctx.fillStyle = p.waterShade;
    for (let i = 0; i < 4; i++) {
      const off = (t * 1.6 + i * 40 + seed * 13) % (h + 40);
      ctx.globalAlpha = 0.55;
      rr(ctx, -w * 0.3 + (i % 2) * w * 0.34, off - 30, w * 0.22, 26, w * 0.1);
      ctx.fill();
    }
    ctx.restore();
    // แอ่งฟองด้านล่าง
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = p.water;
    ctx.beginPath();
    ctx.ellipse(0, h, w * 0.9, w * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

/**
 * ผาหินคลุมมอสส์ พร้อมน้ำตกไหลลงมาจากยอด
 *
 * ── ทำไมรวมผากับน้ำตกเป็นชิ้นเดียว ──
 * ตอนแยกเป็นสองชิ้นแล้ววางเอง น้ำตกลอยอยู่กลางอากาศเพราะยอดผาไม่ได้อยู่ตรงนั้นพอดี
 * และเวลาปรับขนาดผา ต้องไปตามแก้ตำแหน่งน้ำตกทุกครั้ง
 * รวมเป็นชิ้นเดียว น้ำจึงออกจากยอดผาเสมอไม่ว่าจะย่อขยายเท่าไหร่
 */
function cliff(ctx, x, y, s, p, t, seed) {
  local(ctx, x, y, s, () => {
    const w = 78 + hash(seed) * 46;
    const h = 92 + hash(seed + 3) * 54;
    pen(ctx, p, s, 0.75);

    // ตัวผา — ด้านซ้ายชันกว่าด้านขวา ผาที่สมมาตรจะอ่านเป็นก้อนน้ำแข็ง
    ctx.fillStyle = p.rock;
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.lineTo(-w * 0.82, -h * 0.72);
    ctx.quadraticCurveTo(-w * 0.5, -h, 0, -h);
    ctx.quadraticCurveTo(w * 0.62, -h, w * 0.86, -h * 0.52);
    ctx.lineTo(w, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // ร่องหินสองสามเส้น บอกว่าเป็นหินไม่ใช่ดินก้อนเดียว
    ctx.strokeStyle = p.rockDark;
    ctx.lineWidth = 2.2 / s;
    for (let i = 0; i < 3; i++) {
      const gx = -w * 0.5 + hash(seed + i * 5) * w;
      ctx.beginPath();
      ctx.moveTo(gx, -h * 0.5 * hash(seed + i));
      ctx.lineTo(gx + 6, 0);
      ctx.stroke();
    }

    // มอสส์คลุมยอด ขอบล่างย้อยเป็นหยด — คลุมแค่ส่วนบน ให้เห็นเนื้อหินด้านล่าง
    // ถ้าคลุมทั้งก้อน ผาจะกลายเป็นพุ่มไม้เขียวก้อนหนึ่ง ไม่ใช่หน้าผา
    ctx.fillStyle = p.moss;
    ctx.beginPath();
    ctx.moveTo(-w * 0.86, -h * 0.66);
    ctx.quadraticCurveTo(-w * 0.5, -h, 0, -h);
    ctx.quadraticCurveTo(w * 0.62, -h, w * 0.86, -h * 0.5);
    for (let i = 6; i >= 0; i--) {
      const px = -w * 0.86 + (i / 6) * w * 1.72;
      // เดิมย้อยลงมาถึงครึ่งผา ทำให้ทั้งก้อนเป็นสีเขียวจนอ่านเป็นพุ่มไม้
      // เหลือแค่หมวกบาง ๆ ที่ยอด เนื้อหินจึงได้เป็นตัวหลักของทรง
      const dip = -h * 0.68 + hash(seed + i * 7) * h * 0.14;
      ctx.quadraticCurveTo(px + w * 0.1, dip + 12, px, dip);
    }
    ctx.closePath();
    ctx.fill();
    // แถบสว่างบนสันมอสส์ = แสงตกด้านบน ทำให้มอสส์เป็นก้อนหนา ไม่ใช่แผ่นแปะ
    ctx.save();
    ctx.clip();
    ctx.fillStyle = p.mossLight;
    ctx.beginPath();
    ctx.moveTo(-w * 0.86, -h * 0.66);
    ctx.quadraticCurveTo(-w * 0.5, -h, 0, -h);
    ctx.quadraticCurveTo(w * 0.62, -h, w * 0.86, -h * 0.5);
    ctx.lineTo(w * 0.86, -h * 0.66);
    ctx.quadraticCurveTo(w * 0.4, -h * 0.86, -w * 0.6, -h * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    pen(ctx, p, s, 0.75);
    ctx.beginPath();
    ctx.moveTo(-w * 0.86, -h * 0.66);
    ctx.quadraticCurveTo(-w * 0.5, -h, 0, -h);
    ctx.quadraticCurveTo(w * 0.62, -h, w * 0.86, -h * 0.5);
    ctx.stroke();

    // น้ำตกไหลจากยอด — บางผาเท่านั้นที่มี ไม่งั้นทั้งฉากมีแต่น้ำ
    if (hash(seed + 11) > 0.42) {
      const fx = (hash(seed + 13) - 0.5) * w * 0.7;
      waterfall(ctx, fx, -h * 0.62, 0.9, p, t, seed + 2);
    }
  });
}

/** ต้นไม้แฟนตาซี — พุ่มกลมสามก้อนบนลำต้นโค้ง โยกตามลม */
function tree(ctx, x, y, s, p, t, seed) {
  const sway = Math.sin(t * 0.016 + seed) * 0.035;
  local(ctx, x, y, s, () => {
    ctx.rotate(sway);
    pen(ctx, p, s, 0.8);
    ctx.fillStyle = p.trunk;
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.quadraticCurveTo(-4, -34, -9, -58);
    ctx.lineTo(9, -58);
    ctx.quadraticCurveTo(4, -34, 7, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    const puffs = [[-22, -68, 24], [22, -72, 22], [0, -92, 28]];
    ctx.fillStyle = p.moss;
    for (const [px, py, pr] of puffs) {
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // เงาใต้พุ่มแต่ละก้อน — ตัดด้วยวงของพุ่มเองจึงไม่ล้นออกไปเป็นจานสีเข้ม
    for (const [px, py, pr] of puffs) {
      ctx.save();
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = p.mossDark;
      ctx.beginPath();
      ctx.arc(px + pr * 0.3, py + pr * 0.45, pr * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // ไฮไลต์บนซ้ายของแต่ละพุ่ม บอกทิศแสงให้ตรงกันทั้งฉาก
    ctx.fillStyle = p.mossLight;
    for (const [px, py, pr] of puffs) {
      ctx.beginPath();
      ctx.arc(px - pr * 0.28, py - pr * 0.3, pr * 0.44, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** พุ่มไม้เตี้ย — ก้อนมอสส์สามก้อนติดพื้น ใช้ถมช่องว่างระหว่างของชิ้นใหญ่ */
function bush(ctx, x, y, s, p, t, seed) {
  local(ctx, x, y, s, () => {
    pen(ctx, p, s, 0.7);
    ctx.fillStyle = p.moss;
    for (let i = 0; i < 3; i++) {
      const bx = (i - 1) * 16;
      const br = 14 + hash(seed + i) * 8;
      ctx.beginPath(); ctx.arc(bx, -br * 0.4, br, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 3; i++) ctx.arc((i - 1) * 16, -8, 16, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = p.mossDark;
    ctx.beginPath(); ctx.arc(8, 6, 20, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = p.mossLight;
    ctx.beginPath(); ctx.arc(-14, -14, 6, 0, Math.PI * 2); ctx.fill();
  });
}

// ══ ของหวาน ═══════════════════════════════════════════════

/** โดนัทยักษ์ — เอียงเล็กน้อยตามเลขสุ่ม ไม่งั้นวางกี่อันก็เหมือนกันหมด */
function donut(ctx, x, y, s, p, t, seed) {
  local(ctx, x, y, s, () => {
    ctx.rotate((hash(seed) - 0.5) * 0.9);
    pen(ctx, p, s, 0.8);
    const R = 30, r = 11;
    ctx.fillStyle = p.trunk;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.arc(0, 0, r, 0, Math.PI * 2, true);
    ctx.fill('evenodd'); ctx.stroke();
    // ไอซิ่งคลุมครึ่งบน ขอบล่างเป็นคลื่นย้อย
    ctx.fillStyle = hash(seed + 4) > 0.5 ? p.candyPink : p.candyCream;
    ctx.beginPath();
    for (let a = 0; a <= 32; a++) {
      const th = Math.PI + (a / 32) * Math.PI * 2;
      const wob = 1 + Math.sin(th * 6 + seed) * 0.07;
      const rad = R * 0.94 * wob;
      ctx[a ? 'lineTo' : 'moveTo'](Math.cos(th) * rad, Math.sin(th) * rad);
    }
    ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    // เม็ดโรยหน้า
    for (let i = 0; i < 9; i++) {
      const a = hash(seed + i * 7) * Math.PI * 2;
      const d = r * 1.6 + hash(seed + i * 11) * (R - r * 2);
      ctx.save();
      ctx.translate(Math.cos(a) * d, Math.sin(a) * d);
      ctx.rotate(a);
      ctx.fillStyle = p.gem[i % p.gem.length];
      ctx.fillRect(-3, -1.1, 6, 2.2);
      ctx.restore();
    }
  });
}

/** อมยิ้มเกลียว — ก้านเสียบพื้น หัวหมุนช้า ๆ */
function lollipop(ctx, x, y, s, p, t, seed) {
  local(ctx, x, y, s, () => {
    pen(ctx, p, s, 0.8);
    ctx.strokeStyle = p.line;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -42); ctx.stroke();
    ctx.save();
    ctx.translate(0, -52);
    ctx.rotate(t * 0.006 + seed);
    ctx.fillStyle = p.candyCream;
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
    // เกลียวชมพูวาดด้วยเส้นหนาไล่รัศมี ถูกกว่าการวาดรูปทรงเกลียวจริง
    ctx.strokeStyle = p.candyPink;
    ctx.lineWidth = 4.6 / s;
    ctx.beginPath();
    for (let a = 0; a < 34; a++) {
      const th = (a / 34) * Math.PI * 4;
      const rad = 2 + (a / 34) * 14;
      ctx[a ? 'lineTo' : 'moveTo'](Math.cos(th) * rad, Math.sin(th) * rad);
    }
    ctx.stroke();
    pen(ctx, p, s, 0.8);
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  });
}

/** ไม้เท้าลูกกวาดโค้งเป็นซุ้ม — ของชิ้นสูงที่ช่วยคั่นจังหวะแนวนอนของฉาก */
function candyArch(ctx, x, y, s, p, t, seed) {
  local(ctx, x, y, s, () => {
    ctx.lineCap = 'round';
    ctx.strokeStyle = p.candyCream;
    ctx.lineWidth = 13 / s;
    ctx.beginPath();
    ctx.moveTo(-34, 0);
    ctx.quadraticCurveTo(0, -104, 34, 0);
    ctx.stroke();
    // ลายเฉียงสีแดง วาดทับด้วยเส้นสั้น ๆ ตามแนวโค้ง
    ctx.strokeStyle = p.candyRed;
    ctx.lineWidth = 4.4 / s;
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      const bx = (1 - u) * (1 - u) * -34 + 2 * (1 - u) * u * 0 + u * u * 34;
      const by = (1 - u) * (1 - u) * 0 + 2 * (1 - u) * u * -104 + u * u * 0;
      ctx.beginPath();
      ctx.moveTo(bx - 4, by - 5);
      ctx.lineTo(bx + 4, by + 5);
      ctx.stroke();
    }
  });
}

/** เห็ดแฟนตาซี — หมวกแดงจุดขาว ขยับตัวเบา ๆ เหมือนหายใจ */
function mushroom(ctx, x, y, s, p, t, seed) {
  const breathe = 1 + Math.sin(t * 0.03 + seed * 2) * 0.04;
  local(ctx, x, y, s, () => {
    ctx.scale(1, breathe);
    pen(ctx, p, s, 0.8);
    ctx.fillStyle = p.candyCream;
    rr(ctx, -6, -20, 12, 20, 5);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = p.candyRed;
    ctx.beginPath();
    ctx.ellipse(0, -20, 19, 14, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = p.candyCream;
    for (let i = 0; i < 3; i++) {
      const dx = (i - 1) * 8 + (hash(seed + i) - 0.5) * 4;
      ctx.beginPath();
      ctx.ellipse(dx, -24 - hash(seed + i * 5) * 4, 3.4, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// ══ ของเล่นและของสะสม ════════════════════════════════════

/**
 * ลูกไหมพรม — โยกไปมาช้า ๆ และปลายเส้นสะบัดตามแรง
 *
 * ── ทำไมปลายเส้นต้องช้ากว่าตัวลูก ──
 * เส้นด้ายเบากว่าลูกมาก มันจึงตามหลังเสมอ ไม่ได้ขยับพร้อมกัน
 * ใช้เฟสที่หน่วงไว้เล็กน้อยกับปลายเส้น ก็ได้ความรู้สึกว่ามันมีน้ำหนักคนละแบบ
 * ถ้าขยับพร้อมกันเป๊ะ ทั้งก้อนจะอ่านเป็นสติกเกอร์แผ่นเดียวที่ถูกหมุน
 */
function yarnBall(ctx, x, y, s, p, t, seed) {
  const rock = Math.sin(t * 0.026 + seed * 1.7) * 0.11;
  local(ctx, x, y, s, () => {
    const R = 18;
    const col = p.yarn[Math.floor(hash(seed) * p.yarn.length)];

    // หมุนรอบ "จุดที่แตะพื้น" ไม่ใช่จุดกลางลูก ลูกกลม ๆ ที่โยกจึงกลิ้งไปมาบนพื้นจริง
    ctx.rotate(rock);
    pen(ctx, p, s, 0.8);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, -R, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.arc(0, -R, R, 0, Math.PI * 2); ctx.clip();
    ctx.lineWidth = 2.2 / s;
    ctx.strokeStyle = 'rgba(0,0,0,.22)';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -R, R * 0.94, R * 0.4, i * 0.9 + 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // ปลายเส้นที่คลายออกมา หน่วงเฟสไว้ 0.9 เรเดียนจึงตามหลังตัวลูก
    const lag = Math.sin(t * 0.026 + seed * 1.7 - 0.9) * 7;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.6 / s;
    ctx.beginPath();
    ctx.moveTo(R * 0.7, -R * 0.5);
    ctx.quadraticCurveTo(R * 1.5 + lag, -R * 0.2, R * 1.2 + lag * 1.4, 0);
    ctx.stroke();
  });
}

/** ผีเสื้อ — บินเป็นเลขแปดรอบจุดหนึ่ง ปีกกระพือเร็วกว่าการเคลื่อนที่มาก */
function butterfly(ctx, x, y, s, p, t, seed) {
  const a = t * 0.012 + seed * 2;
  // เลขแปด: แกนนอนหนึ่งรอบ แกนตั้งสองรอบ ทำให้เส้นทางไม่ซ้ำรอยตัวเอง
  const fx = Math.sin(a) * 34;
  const fy = Math.sin(a * 2) * 14;
  const flap = Math.abs(Math.sin(t * 0.28 + seed));
  local(ctx, x + fx, y + fy, s, () => {
    ctx.rotate(Math.cos(a) * 0.25);
    const col = p.gem[Math.floor(hash(seed) * p.gem.length)];
    pen(ctx, p, s, 0.6);
    ctx.fillStyle = col;
    // ปีกแบนลงตอนกระพือ = มองจากด้านข้าง ไม่ใช่ปีกหดเล็กลง
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.beginPath();
      ctx.ellipse(4.5, -2, 4.6 * (0.25 + flap * 0.75), 5.2, -0.4, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = p.line;
    ctx.beginPath(); ctx.ellipse(0, 0, 1.4, 4.4, 0, 0, Math.PI * 2); ctx.fill();
  });
}

/**
 * หนูตัวเล็กวิ่งเล่น — ของที่ "มีชีวิต" ชิ้นหลักของฉากที่หยุดนิ่ง
 *
 * ── ทำไมต้องกระโดด ไม่ใช่แค่เลื่อนไปมา ──
 * ของเดิมเลื่อนซ้ายขวาด้วยไซน์ ซึ่งอ่านเป็น "ถูกอะไรลากไถลไปมา" ไม่ใช่สัตว์
 * สิ่งมีชีวิตอ่านออกจาก "จังหวะที่ไม่สม่ำเสมอ" — ออกวิ่ง หยุด กระโดด แล้วหันกลับ
 *
 * รอบหนึ่งยาว 200 เฟรม (ราวสามวินาที) เดินไปกลับแบบคลื่นสามเหลี่ยม
 * แล้วกระโดดสามครั้งซ้อนอยู่คนละความถี่ จังหวะสองอันจึงไม่ตรงกันเลยทั้งรอบ
 * ตาจับไม่ได้ว่ามันวนซ้ำ ทั้งที่จริง ๆ แล้ววนอยู่
 */
function mouse(ctx, x, y, s, p, t, seed) {
  const T = 200;
  const ph = ((t + seed * 53) % T) / T;

  // เดินไปกลับ: คลื่นสามเหลี่ยม 0→1→0 หันหน้าตามทิศที่กำลังไป
  const tri = ph < 0.5 ? ph * 2 : 2 - ph * 2;
  const dx = (tri - 0.5) * 46;
  const face = ph < 0.5 ? 1 : -1;

  // กระโดดสามครั้งต่อรอบ — ครึ่งบนของไซน์คือช่วงลอย ครึ่งล่างคือช่วงอยู่บนพื้น
  const air = Math.max(0, Math.sin(((ph * 3) % 1) * Math.PI * 2));
  const hop = air * 15;

  local(ctx, x + dx, y - hop, s, () => {
    ctx.scale(face, 1);
    // ยืดตอนลอย แบนตอนแตะพื้น = น้ำหนักตัว ถ้าไม่มีจะดูเหมือนภาพถูกยกขึ้นเฉย ๆ
    ctx.scale(1 - air * 0.12, 1 + air * 0.16);

    pen(ctx, p, s, 0.7);
    ctx.fillStyle = p.mouse;
    ctx.beginPath(); ctx.ellipse(0, -7, 12, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(10, -9, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = p.mouseEar;
    ctx.beginPath(); ctx.arc(7, -15, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // ขาหลังยืดออกตอนลอย เหมือนถีบตัวขึ้น
    ctx.strokeStyle = p.mouse;
    ctx.lineWidth = 2.4 / s;
    ctx.beginPath();
    ctx.moveTo(-5, -2);
    ctx.lineTo(-8 - air * 5, 0);
    ctx.stroke();

    // หางสะบัดตามจังหวะกระโดด ปลายหางช้ากว่าตัวเสมอ จึงใช้เฟสที่ต่างกันเล็กน้อย
    const flick = Math.sin(t * 0.12 + seed) * 4 + air * 6;
    ctx.lineWidth = 1.8 / s;
    ctx.beginPath();
    ctx.moveTo(-11, -7);
    ctx.quadraticCurveTo(-22, -10 - flick, -26, -2 - flick * 0.6);
    ctx.stroke();

    ctx.fillStyle = p.line;
    ctx.beginPath(); ctx.arc(13, -10, 1.3, 0, Math.PI * 2); ctx.fill();
  });
}

/** ขวดยาวิเศษ — น้ำยาข้างในเรืองเป็นจังหวะ ใช้เป็นไอเทมได้ในอนาคต */
function potion(ctx, x, y, s, p, t, seed) {
  const pulse = 0.6 + Math.sin(t * 0.05 + seed * 4) * 0.4;
  local(ctx, x, y, s, () => {
    const liquid = p.potionLiquid[Math.floor(hash(seed) * p.potionLiquid.length)];
    // แสงเรืองรอบขวด วาดก่อนตัวขวดจึงดูเหมือนแสงลอดออกมา ไม่ใช่วงกลมแปะทับ
    const g = ctx.createRadialGradient(0, -14, 1, 0, -14, 26);
    g.addColorStop(0, liquid);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 0.28 * pulse;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, -14, 26, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    pen(ctx, p, s, 0.75);
    ctx.fillStyle = p.potionGlass;
    ctx.beginPath();
    ctx.moveTo(-4, -30);
    ctx.lineTo(-4, -22);
    ctx.quadraticCurveTo(-12, -16, -12, -8);
    ctx.quadraticCurveTo(-12, 0, 0, 0);
    ctx.quadraticCurveTo(12, 0, 12, -8);
    ctx.quadraticCurveTo(12, -16, 4, -22);
    ctx.lineTo(4, -30);
    ctx.closePath();
    ctx.fill();
    // น้ำยาอยู่ครึ่งล่างของขวด ตัดด้วย clip ของทรงขวดเอง
    ctx.save();
    ctx.clip();
    ctx.fillStyle = liquid;
    ctx.fillRect(-13, -13, 26, 14);
    ctx.restore();
    ctx.stroke();
    // จุกไม้ก๊อก
    ctx.fillStyle = p.lantern;
    rr(ctx, -5, -35, 10, 6, 2);
    ctx.fill(); ctx.stroke();
  });
}

/** ตะกร้าใส่ขวดยา — กลุ่มของสามชิ้น ใช้เป็นของหน้าฉากที่มีน้ำหนัก */
function potionBasket(ctx, x, y, s, p, t, seed) {
  local(ctx, x, y, s, () => {
    potion(ctx, -13, -12, 0.85, p, t, seed);
    potion(ctx, 13, -12, 0.85, p, t, seed + 9);
    potion(ctx, 0, -6, 0.95, p, t, seed + 17);
    pen(ctx, p, s, 0.8);
    ctx.fillStyle = p.lantern;
    ctx.beginPath();
    ctx.moveTo(-26, -14);
    ctx.lineTo(26, -14);
    ctx.lineTo(19, 6);
    ctx.lineTo(-19, 6);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.18)';
    ctx.lineWidth = 1.6 / s;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 13, -14); ctx.lineTo(i * 10, 6);
      ctx.stroke();
    }
  });
}

/** โคมไฟ — จุดสว่างอุ่นจุดเดียวของฉาก ไฟวูบไหวเบา ๆ */
function lantern(ctx, x, y, s, p, t, seed) {
  const flicker = 0.75 + Math.sin(t * 0.09 + seed) * 0.12 + Math.sin(t * 0.21) * 0.06;
  local(ctx, x, y, s, () => {
    const g = ctx.createRadialGradient(0, -26, 2, 0, -26, 52);
    g.addColorStop(0, p.lanternGlow);
    g.addColorStop(1, 'rgba(255,206,106,0)');
    ctx.globalAlpha = 0.34 * flicker;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, -26, 52, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    pen(ctx, p, s, 0.8);
    ctx.fillStyle = p.lantern;
    // หลังคาและฐาน
    ctx.beginPath();
    ctx.moveTo(-14, -44); ctx.lineTo(14, -44); ctx.lineTo(9, -52); ctx.lineTo(-9, -52);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    rr(ctx, -13, -10, 26, 10, 3); ctx.fill(); ctx.stroke();
    // กระจกและเปลวไฟ
    ctx.fillStyle = p.lanternGlow;
    rr(ctx, -11, -44, 22, 34, 4);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = p.candyCream;
    ctx.globalAlpha = flicker;
    ctx.beginPath();
    ctx.ellipse(0, -26, 4.5, 7 * flicker, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // หูหิ้ว
    ctx.beginPath();
    ctx.arc(0, -52, 6, Math.PI, 0);
    ctx.stroke();
  });
}

/** ชามอาหารแมว — ของเล็กที่บอกว่า "ที่นี่มีแมวอยู่" โดยไม่ต้องวาดแมว */
function bowl(ctx, x, y, s, p, t, seed) {
  local(ctx, x, y, s, () => {
    pen(ctx, p, s, 0.8);
    ctx.fillStyle = p.stoneLight;
    ctx.beginPath();
    ctx.moveTo(-20, -14);
    ctx.quadraticCurveTo(-18, 2, 0, 2);
    ctx.quadraticCurveTo(18, 2, 20, -14);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -14, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // รอยเท้าแมวบนข้างชาม
    ctx.fillStyle = p.stoneDark;
    ctx.beginPath(); ctx.ellipse(0, -6, 3.4, 2.8, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse((i - 1) * 3.4, -10.5, 1.3, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** เพชรบนพื้น — ของสะสมชิ้นเล็ก มีประกายวิ่งผ่านเป็นจังหวะ */
function gem(ctx, x, y, s, p, t, seed) {
  const bob = Math.sin(t * 0.035 + seed * 5) * 2.5;
  local(ctx, x, y + bob, s, () => {
    const col = p.gem[Math.floor(hash(seed) * p.gem.length)];
    pen(ctx, p, s, 0.7);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -16); ctx.lineTo(10, -5); ctx.lineTo(0, 8); ctx.lineTo(-10, -5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = p.candyCream;
    ctx.beginPath();
    ctx.moveTo(0, -16); ctx.lineTo(4, -6); ctx.lineTo(0, 0); ctx.lineTo(-4, -6);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  });
}

/** ประกายเล็ก ๆ ลอยในอากาศ — สี่แฉก ไม่ใช่วงกลม วงกลมอ่านเป็นฝุ่นไม่ใช่ประกาย */
function sparkle(ctx, x, y, s, p, t, seed) {
  const k = (Math.sin(t * 0.06 + seed * 7) + 1) / 2;
  if (k < 0.05) return;
  local(ctx, x, y, s * (0.5 + k * 0.7), () => {
    ctx.globalAlpha = k * 0.9;
    ctx.fillStyle = p.sparkle;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.quadraticCurveTo(1.6, -1.6, 9, 0);
    ctx.quadraticCurveTo(1.6, 1.6, 0, 9);
    ctx.quadraticCurveTo(-1.6, 1.6, -9, 0);
    ctx.quadraticCurveTo(-1.6, -1.6, 0, -9);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

/** รอยเท้าแมว — เม็ดใหญ่หนึ่งกับเม็ดเล็กสามเม็ด ใช้ซ้ำหลายที่จนต้องแยกออกมา */
function pawMark(ctx, x, y, r, fill) {
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

/**
 * พรมวิเศษที่น้องยืนอยู่
 *
 * ── สองอย่างที่ทำให้ของเดิมดูผิด ──
 * 1. เปอร์สเปกทีฟกลับด้าน — ขอบไกล (ด้านบน) ถูกวาดกว้าง 300 ส่วนขอบใกล้ 224
 *    ของจริงต้องกลับกัน ด้านที่อยู่ใกล้ตาต้องกว้างกว่าเสมอ ไม่งั้นสมองอ่านว่า
 *    "แผ่นนี้เอียงหนีเข้าหาเรา" ซึ่งขัดกับพื้นที่เอียงหนีออกไป เลยรู้สึกแปลกทันที
 * 2. วางต่ำกว่าเท้าน้อง 18 หน่วย น้องจึงยืนอยู่ "เหนือ" พรม ไม่ใช่ "บน" พรม
 *    ตอนนี้ขอบไกลของพรมอยู่เหนือเส้นพื้นเล็กน้อย เท้าจึงตกลงในผืนพรมพอดี
 *
 * ── ทำไมต้องมีพู่ที่ขอบล่าง ──
 * พรมกับ "แผ่นสีสี่เหลี่ยมคางหมู" ต่างกันตรงพู่ชายผ้า มันเป็นสัญญาณเดียวที่บอกว่า
 * ของชิ้นนี้เป็นผ้าทอ ไม่ใช่แผ่นกระเบื้องหรือเวที
 */
function rug(ctx, x, y, s, p, t, seed) {
  // ครึ่งความกว้างของขอบไกลกับขอบใกล้ และความลึกของผืน
  const FAR = 132, NEAR = 196, D = 74;

  /** สี่เหลี่ยมคางหมูที่ย่อเข้าหาใจกลางผืนตามอัตราส่วน k (1 = เต็มผืน) */
  const shape = (k) => {
    const fh = FAR * k, nh = NEAR * k;
    const y0 = D / 2 - (D / 2) * k, y1 = D / 2 + (D / 2) * k;
    ctx.beginPath();
    ctx.moveTo(-fh, y0);
    ctx.lineTo(fh, y0);
    ctx.lineTo(nh, y1);
    ctx.lineTo(-nh, y1);
    ctx.closePath();
  };

  local(ctx, x, y, s, () => {
    // เงาใต้พรม ทำให้ผืนผ้าแนบพื้นแทนที่จะลอย
    ctx.fillStyle = p.shadow;
    ctx.beginPath();
    ctx.ellipse(0, D * 0.62, NEAR * 0.98, D * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    // พู่ชายผ้าที่ขอบใกล้ วาดก่อนตัวพรมจึงโผล่ออกมาจากใต้ผืน ไม่ใช่แปะทับบนผืน
    ctx.strokeStyle = p.rugGold;
    ctx.lineWidth = 2.2 / s;
    ctx.lineCap = 'round';
    for (let i = -11; i <= 11; i++) {
      const fx = (i / 11) * NEAR * 0.96;
      const len = 6 + hash(seed + i * 3) * 4;
      ctx.beginPath();
      ctx.moveTo(fx, D);
      ctx.lineTo(fx + (hash(seed + i) - 0.5) * 3, D + len);
      ctx.stroke();
    }

    pen(ctx, p, s, 0.7);
    ctx.fillStyle = p.rug;
    shape(1); ctx.fill(); ctx.stroke();

    // ขอบทองสองเส้นซ้อน ทำให้อ่านเป็นผ้าทอที่มีลายขอบ ไม่ใช่แผ่นสีเรียบ
    ctx.strokeStyle = p.rugGold;
    ctx.lineWidth = 3 / s;
    shape(0.9); ctx.stroke();
    ctx.lineWidth = 1.6 / s;
    shape(0.82); ctx.stroke();

    // เนื้อในเข้มกว่าขอบ ไล่ให้ด้านไกลมืดกว่าด้านใกล้ = ผืนผ้าหนีเข้าไปในเงา
    const g = ctx.createLinearGradient(0, 0, 0, D);
    g.addColorStop(0, p.rugDark);
    g.addColorStop(1, p.rug);
    ctx.fillStyle = g;
    shape(0.78); ctx.fill();

    // ลายกลางผืน — วงรีทองกับรอยเท้าแมวหนึ่งรอย
    // ลายเดียวใหญ่ ๆ อ่านออกกว่าลายเล็กเรียงกันหลายอัน ซึ่งของเดิมทำแล้วกลายเป็น
    // แถวจุดเล็ก ๆ ที่ดูเหมือนตัวหนังสือมากกว่าลายพรม
    ctx.strokeStyle = p.rugGold;
    ctx.lineWidth = 2.4 / s;
    ctx.beginPath();
    ctx.ellipse(0, D * 0.54, NEAR * 0.3, D * 0.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    pawMark(ctx, 0, D * 0.54, 8, p.rugGold);

    // รอยเท้าเล็กสองข้างของลายกลาง ถ่วงให้ผืนไม่โล่งเป็นสีเดียว
    for (const sx of [-1, 1]) {
      pawMark(ctx, sx * NEAR * 0.56, D * 0.56, 5.2, p.rugGold);
    }
  });
}

/**
 * คลังชิ้นส่วนทั้งหมด — เข้าถึงด้วยชื่อ
 * layers.js อ้างถึงชิ้นส่วนด้วย "ชื่อ" ไม่ใช่ตัวฟังก์ชัน การสลับชิ้นส่วนหรือ
 * เพิ่มของใหม่จึงเป็นแค่การเติมคีย์ในนี้ ไม่ต้องแก้ตัวเรนเดอร์เลย
 */
export const PROPS = {
  cloud, skyBauble,
  castle, wallTower,
  mossHill, cliff, waterfall, tree, bush,
  donut, lollipop, candyArch, mushroom,
  yarnBall, mouse, butterfly, potion, potionBasket, lantern, bowl, gem, sparkle, rug,
};
