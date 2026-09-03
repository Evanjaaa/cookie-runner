// src/outfits.js
// ─────────────────────────────────────────────────────────────
// ชุดของแมว — แยกจากสกิน (ซึ่งคุมสีขน) คนละหมวดกันโดยสิ้นเชิง
//
// ชุดไม่ได้วาดตัวละครใหม่ แค่แปะของทับตัวที่วาดอยู่แล้ว จึงต้องใช้ได้
// ทั้งท่ายืน ท่าวิ่ง ท่าหมอบ และตอนตาย โดยไม่ต้องรู้ว่ากำลังอยู่ท่าไหน
//
// hook สามตัว ทำงานคนละระบบพิกัด:
//   back(ctx, s, pose) — พิกัดลำตัว วาดก่อนทุกอย่าง สำหรับของที่ต้องอยู่หลังตัว
//   body(ctx, s, pose) — พิกัดลำตัว วาดหลังลำตัวก่อนหัว สำหรับเสื้อ ปลอกคอ
//   head(ctx, s, opts) — พิกัดหัว (0,0 = กลางหัว รัศมี 13) สำหรับหมวก โบว์ แว่น
//
// pose เป็น 'stand' หรือ 'slide' — ลำตัวสองท่านี้คนละรูปทรงกัน
// เสื้อผ้าทุกชิ้นจึงต้องวาดผ่าน clipBody() ไม่งั้นจะล้นออกนอกตัวแมว
//
// ชุดทุกชุดใส่ได้ทั้งแมวส้มและแมวขาว เพราะทั้งสองคือตัวละครเดียวกัน
// ต่างแค่สีขน ชุดจึงเป็นของผู้เล่น ไม่ใช่ของตัวใดตัวหนึ่ง
//
// ระดับความหายากคุมทั้งโบนัสคะแนนและอัตราสุ่ม ดู RARITY ข้างล่าง
// foodBonus ไม่ได้เขียนในแต่ละชุด แต่เติมให้จากระดับตอนท้ายไฟล์
// เพื่อไม่ให้ค่าของชุดระดับเดียวกันเพี้ยนกันเองเวลามีคนเพิ่มชุดใหม่
// ─────────────────────────────────────────────────────────────
import { loadOutfit, saveOutfit, loadOwned, saveOwned } from './storage.js';
import { star4 } from './render/entities.js';

export const RARITY = {
  high: {
    key: 'high',
    name: 'ระดับสูง',
    short: 'SS',
    color: '#FFC93C',
    foodBonus: 1000,   // บวกต่ออาหารหนึ่งเม็ด
    rate: 0.1,         // โอกาสออกจากตู้กาช่า
  },
  normal: {
    key: 'normal',
    name: 'ระดับกลาง',
    short: 'S',
    color: '#8DF3EA',
    foodBonus: 500,
    rate: 0.6,   // ส่วนที่เหลือจาก 100% เป็นเหรียญทอง ดู GOLD_RATE ใน gacha.js
  },
};

// ── เครื่องมือร่วม ───────────────────────────────────────────

/** ตัดขอบให้เสื้อผ้าอยู่ในทรงลำตัวเสมอ ตัวเลขต้องตรงกับ drawCatStand/drawCatSlide */
function clipBody(ctx, pose, fn) {
  ctx.save();
  ctx.beginPath();
  if (pose === 'slide') ctx.ellipse(-2, 2, 19, 10, -0.08, 0, Math.PI * 2);
  else ctx.ellipse(0, 6, 14, 13, 0, 0, Math.PI * 2);
  ctx.clip();
  fn();
  ctx.restore();
}

/** กระโปรง/ชายเสื้อ — ถมครึ่งล่างของลำตัวแล้วตีแถบชายกระโปรง */
function skirt(ctx, pose, main, hem) {
  clipBody(ctx, pose, () => {
    const top = pose === 'slide' ? 3 : 7;
    ctx.fillStyle = main;
    ctx.fillRect(-26, top, 52, 28);
    if (hem) {
      ctx.fillStyle = hem;
      ctx.fillRect(-26, top, 52, 2.6);
    }
  });
}

/** ถมลำตัวทั้งตัว = ชุดเต็มตัว ใช้เป็นฐานแล้วค่อยแต่งลายทับ */
function fullSuit(ctx, pose, main) {
  clipBody(ctx, pose, () => {
    ctx.fillStyle = main;
    ctx.fillRect(-28, -14, 56, 40);
  });
}

/** เสื้อกั๊ก — สองแผงซ้ายขวา เว้นกลางไว้ให้เห็นพุง จึงอ่านเป็นเสื้อเปิดอก */
function vest(ctx, pose, leather) {
  clipBody(ctx, pose, () => {
    ctx.fillStyle = leather;
    if (pose === 'slide') {
      ctx.fillRect(-23, -11, 17, 26);
      ctx.fillRect(6, -11, 19, 26);
    } else {
      ctx.fillRect(-17, -9, 10, 30);
      ctx.fillRect(7, -9, 12, 30);
    }
  });
}

/** ผ้าคาดเฉียงอก */
function sash(ctx, pose, cloth, trim) {
  clipBody(ctx, pose, () => {
    ctx.save();
    ctx.translate(pose === 'slide' ? -2 : 0, pose === 'slide' ? 2 : 6);
    ctx.rotate(-0.62);
    ctx.fillStyle = cloth;
    ctx.fillRect(-28, -4.2, 56, 8.4);
    if (trim) {
      ctx.fillStyle = trim;
      ctx.fillRect(-28, 3.2, 56, 1.6);
    }
    ctx.restore();
  });
}

/** ลายทางแนวนอน ใช้กับชุดโจรสลัด */
function stripes(ctx, pose, color) {
  clipBody(ctx, pose, () => {
    ctx.fillStyle = color;
    for (let y = -12; y < 22; y += 7) ctx.fillRect(-28, y, 56, 3.4);
  });
}

/**
 * ปลอกคอ — วาดนอก clipBody ได้ เพราะมันคาดรอบคอซึ่งอยู่เหนือลำตัวขึ้นไป
 * ส่วนโค้ง 0.1π-0.9π คือครึ่งล่างของวง = ด้านหน้าใต้คาง
 */
function collar(ctx, pose, color, width, charm) {
  const cx = pose === 'slide' ? 7 : 1;
  const cy = pose === 'slide' ? 0 : -3;
  const r = pose === 'slide' ? 7.5 : 9.5;

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();

  if (charm) charm(cx, cy + r, r);
}

/** ปกกะลาสี — สามเหลี่ยมคว่ำพาดบ่า */
function sailorCollar(ctx, pose, main, line) {
  const cx = pose === 'slide' ? 6 : 0;
  const cy = pose === 'slide' ? -2 : -4;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = main;
  ctx.beginPath();
  ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.lineTo(0, 13);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-7.5, 2.2); ctx.lineTo(0, 10.5); ctx.lineTo(7.5, 2.2);
  ctx.stroke();
  ctx.restore();
}

/** โบว์ผูก ปีกสองข้างเป็นสามเหลี่ยมปลายบาน */
function bowKnot(ctx, x, y, r, main, lite) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = main;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(dir * r * 1.6, -r);
    ctx.lineTo(dir * r * 1.6, r);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = lite;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** แถบคาดหน้าผาก ตัดตามวงหัวเพื่อให้โค้งรับกับหัวจริง */
function headBand(ctx, y, h, main, trim) {
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = main;
  ctx.fillRect(-14, y, 28, h);
  if (trim) {
    ctx.fillStyle = trim;
    ctx.fillRect(-14, y + h, 28, 1.4);
  }
  ctx.restore();
}

/** หมวกทรงสูง — หูแมวยังโผล่สองข้างเพราะทรงกระบอกแคบกว่าระยะหู */
function topHat(ctx, body, band, gold) {
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(0, -12.5, 15, 3.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-8.5, -26, 17, 14.5, 2.4); ctx.fill();
  ctx.fillStyle = band;
  ctx.fillRect(-8.5, -17.5, 17, 4.8);
  ctx.fillStyle = gold;
  ctx.fillRect(-2.6, -18, 5.2, 5.8);
}

/** หมวกเชฟ — ก้อนฟูสามก้อนบนแถบฐาน */
function chefHat(ctx) {
  ctx.fillStyle = '#FFFFFF';
  for (const [px, py, r] of [[-6.5, -20, 6], [6.5, -20, 6], [0, -23.5, 7]]) {
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.beginPath(); ctx.roundRect(-10, -17, 20, 6.5, 2.4); ctx.fill();
  ctx.fillStyle = '#D9E0EC';
  ctx.fillRect(-10, -12, 20, 1.6);
}

/** หมวกทรงกรวยของพ่อมด เอียงไปข้างหลังนิดหน่อยให้ดูมีน้ำหนัก */
function coneHat(ctx, main, star) {
  ctx.fillStyle = main;
  ctx.beginPath();
  ctx.moveTo(-11, -11.5); ctx.lineTo(-4, -31); ctx.lineTo(9.5, -12.5);
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-1, -11.5, 13.5, 3.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = star;
  ctx.beginPath(); ctx.arc(-5, -21, 2.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(1.5, -16, 1.4, 0, Math.PI * 2); ctx.fill();
}

/** มงกุฎเล็ก n แฉก วางบนเส้นวงหัว */
function crown(ctx, spikes, main, gem, lift = 0) {
  ctx.strokeStyle = main;
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.arc(0, lift, 12, Math.PI * 1.22, Math.PI * 1.78); ctx.stroke();

  ctx.fillStyle = main;
  for (const [px, h] of spikes) {
    const py = lift - Math.sqrt(Math.max(0, 144 - px * px));
    ctx.beginPath();
    ctx.moveTo(px - 3, py); ctx.lineTo(px, py - h); ctx.lineTo(px + 3, py);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = gem;
  ctx.beginPath(); ctx.arc(0, lift - 10.4, 2.2, 0, Math.PI * 2); ctx.fill();
}

/** ใบไม้หนึ่งใบ โคนอยู่ที่ (x,y) ปลายชี้ไปตามมุม rot */
function leaf(ctx, x, y, len, wid, rot, fill, vein) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -wid, len, 0);
  ctx.quadraticCurveTo(len * 0.5, wid, 0, 0);
  ctx.fill();
  if (vein) {
    ctx.strokeStyle = vein;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(len - 1.5, 0); ctx.stroke();
  }
  ctx.restore();
}

/** อัญมณีทรงข้าวหลามตัดพร้อมจุดสะท้อนแสง */
function gem(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.72, y);
  ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.72, y);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.65)';
  ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.3, r * 0.22, 0, Math.PI * 2); ctx.fill();
}

/**
 * พระจันทร์เสี้ยว — วาดเป็นรูปเดียวจบด้วยกฎ evenodd
 *
 * ── ทำไมไม่ใช้ destination-out ──
 * วิธีนั้นคือ "ลบพิกเซล" ซึ่งลบทะลุทุกอย่างที่วาดไว้ก่อนหน้าในผืนเดียวกัน
 * ไม่ใช่แค่ตัดวงกลมของตัวเอง ผลคือเจาะรูโปร่งทะลุท้องฟ้ากับฉากหลังไปเลย
 * เห็นเป็นวงขาวโบ๋กลางจอ (ทดสอบแล้วเป็นแบบนั้นจริง)
 *
 * evenodd เติมเฉพาะพื้นที่ "อยู่ในวงนอกแต่ไม่อยู่ในวงใน" จึงได้เสี้ยวจริง ๆ
 * โดยไม่แตะอะไรที่วาดไว้ก่อนเลย
 *
 * cut = ระยะเยื้องของวงที่มาบัง ยิ่งมากเสี้ยวยิ่งหนา
 */
function crescent(ctx, x, y, r, color, cut = 0.47) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x + r * cut, y - r * 0.24, r * 0.87, 0, Math.PI * 2);
  ctx.fill('evenodd');
}

/** ชายผ้าหยักครึ่งวงกลมเรียงติดกัน — อ่านเป็นระบายผ้า/ไอซิ่ง ไม่ใช่ขอบตรงธรรมดา */
function scallop(ctx, x0, x1, y, step, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let x = x0; x <= x1; x += step) { ctx.moveTo(x, y); ctx.arc(x, y, r, 0, Math.PI); }
  ctx.fill();
}

/** แปลงสี #RRGGBB เป็น rgba() เพื่อใช้กับไล่เฉดที่ต้องจางไปจนใส */
function fade(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * ออร่ารอบตัว — เครื่องหมายของชุดระดับสูง ประกอบด้วย 5 ชั้น
 *   1 แสงนวลก้อนใหญ่หลังตัว   — ตัวที่ให้ความรู้สึก "อลังการ" มากที่สุด
 *   2 ธารแสงลากไปข้างหลัง     — บอกทิศทางที่วิ่งมา
 *   3 วงแหวนประกายสองชั้น     — หมุนสวนทางกัน ตาจึงจับได้ว่ามีมิติ
 *   4 ละอองลอยขึ้น            — กันไม่ให้ทุกอย่างหมุนรอบจุดเดียวจนดูตาย
 *   5 ประกายใหญ่วาบเป็นจังหวะ  — จุดพีคที่ดึงสายตาเป็นระยะ
 *
 * ชั้น 2-5 ใช้บวกสีทั้งหมด แสงจึงซ้อนกันแล้วสว่างขึ้นเหมือนแสงจริง
 * และไปเข้าทางแสงฟุ้งของ post.js ต่ออีกชั้น
 *
 * ใช้ performance.now() แทนการรับ tick เข้ามา เพราะ hook พวกนี้ถูกเรียก
 * จากหลายเส้นทาง (ในเกม หน้าแรก การ์ดตัวอย่างในเมนู) ซึ่งบางเส้นทางไม่มี
 * เวลาเกมให้ส่ง การผูกกับนาฬิกาจริงทำให้กะพริบเหมือนกันทุกที่โดยไม่ต้อง
 * แก้ signature ของฟังก์ชันวาดสักตัว และเป็นเอฟเฟกต์ประดับล้วน ไม่กระทบกติกา
 */
function sparkleAura(ctx, pose, main, lite = '#FFFFFF') {
  const t = performance.now() * 0.005;
  const cx = pose === 'slide' ? -2 : 0;
  const cy = pose === 'slide' ? 2 : 4;

  ctx.save();

  // 1 แสงนวลก้อนใหญ่ ใช้ทับสีปกติ ไม่งั้นจะกลบตัวละครที่วาดทีหลัง
  const breathe = 1 + Math.sin(t * 1.1) * 0.09;
  const halo = 44 * breathe;
  const grad = ctx.createRadialGradient(cx, cy, 3, cx, cy, halo);
  grad.addColorStop(0, fade(main, 0.32));
  grad.addColorStop(0.5, fade(main, 0.12));
  grad.addColorStop(1, fade(main, 0));
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, halo, 0, Math.PI * 2); ctx.fill();

  ctx.globalCompositeOperation = 'lighter';

  // 2 ธารแสงลากหลัง จางลงเรื่อย ๆ ตามระยะ
  for (let i = 1; i <= 4; i++) {
    ctx.globalAlpha = 0.15 / i;
    ctx.fillStyle = main;
    ctx.beginPath();
    ctx.ellipse(cx - i * 11, cy + Math.sin(t * 1.6 + i) * 2,
      13 - i * 1.7, 10 - i * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3 วงแหวนประกายสองชั้น หมุนสวนทางกัน
  for (const [count, rad, spin, size, col] of [
    [7, 26, 0.55, 2.0, main],
    [5, 39, -0.36, 1.3, lite],
  ]) {
    ctx.fillStyle = col;
    for (let i = 0; i < count; i++) {
      const a = t * spin + (i / count) * Math.PI * 2;
      const r = rad + Math.sin(t * 1.3 + i) * 5;
      const pulse = Math.abs(Math.sin(t * 2 + i * 1.7));
      ctx.globalAlpha = 0.3 + pulse * 0.6;
      star4(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.74, size * (0.6 + pulse));
    }
  }

  // 4 ละอองลอยขึ้นแล้วจางหาย วนใหม่คนละเฟส
  ctx.fillStyle = lite;
  for (let i = 0; i < 6; i++) {
    const k = (t * 0.2 + i / 6) % 1;
    const soft = Math.sin(k * Math.PI);
    ctx.globalAlpha = soft * 0.62;
    star4(ctx, cx + Math.sin(i * 2.3 + t * 0.4) * 21, cy + 22 - k * 54, 0.9 + soft * 1.5);
  }

  // 5 ประกายใหญ่วาบ ทีละจุดสลับมุมไปเรื่อย ๆ
  const cycle = (t * 0.42) % 1;
  if (cycle < 0.38) {
    const k = cycle / 0.38;
    const spot = Math.floor(t * 0.42) % 3;
    const [sx, sy] = [[17, -20], [-19, -13], [13, 17]][spot];
    ctx.globalAlpha = Math.sin(k * Math.PI) * 0.8;
    ctx.fillStyle = lite;
    star4(ctx, cx + sx, cy + sy, 2.5 + Math.sin(k * Math.PI) * 5);
  }

  ctx.restore();
}

// ── รายการชุด ────────────────────────────────────────────────

const LIST = [
  {
    id: 'none',
    rarity: null,
    name: 'ขนล้วน',
    note: 'ไม่ใส่อะไรเลย',
  },

  // ══ ระดับสูง ═══════════════════════════════════════════════
  //
  // ┌───────────────────────────────────────────────────────┐
  // │  แบบฟอร์มของชุดระดับสูง — ชุดใหม่ต้องมีครบทุกข้อ         │
  // └───────────────────────────────────────────────────────┘
  //
  // ตัวตรวจท้ายไฟล์จะฟ้องตอนเปิดเกมโหมด dev ถ้าขาดข้อไหนไป
  // ไม่ต้องจำเอง แค่ทำตามชุดที่มีอยู่แล้วเป็นตัวอย่าง
  //
  // ── ช่องข้อมูลที่ต้องมี ──
  //   bonus      จานสีฟ้าตอนโบนัส 6 ค่า (sky[3] / glow / speck / cloud / cloudSoft / sparkle)
  //   rain       สีเม็ดที่โปรยตอนใช้สกิล 3 สี [หลัก, สว่าง, เข้ม]
  //   rainShape  ทรงของเม็ดนั้น — ต้องมีอยู่ใน RAIN_SHAPES (render/entities.js)
  //   glow       สีประกายวิบบนเม็ดที่โปรย
  //   trail      หางเม็ดที่ทิ้งไว้ข้างหลังตอนวิ่ง (ดูกติกาข้างล่าง)
  //
  // ── hook ที่ต้องมีครบสามตัว ──
  //   back()     ออร่ารอบตัว + ของชิ้นเด่นประจำชุดที่ลอยอยู่ข้างหลัง
  //   body()     เสื้อผ้าผ่าน clipBody/fullSuit + ปลอกคอที่มีจี้
  //   head()     เครื่องประดับหัว
  //
  // ── กติกาที่เคยพลาดมาแล้วจริง อย่าทำซ้ำ ──
  //
  //   1. ห้ามใช้ destination-out เจาะรูปทรง
  //      มันลบทะลุทุกอย่างที่วาดไว้ก่อนในผืนเดียวกัน ไม่ใช่แค่ตัดรูปตัวเอง
  //      ผลคือเจาะรูโปร่งทะลุท้องฟ้าเห็นเป็นวงขาวโบ๋ ใช้ fill('evenodd') แทน
  //      (ดู crescent() เป็นตัวอย่าง)
  //
  //   2. star4() ไม่รับสีเป็นพารามิเตอร์ ต้องตั้ง ctx.fillStyle ก่อนเรียกเสมอ
  //      เคยส่งสีเป็นอาร์กิวเมนต์ที่สี่แล้วมันถูกทิ้ง ดาวเลยถูกวาดด้วยสีที่ค้างอยู่
  //
  //   3. ของประดับบนอกต้องวางที่ "พุง" ไม่ใช่ระดับอก
  //      ระดับอกโดนหัวแมวกับปลอกคอบังจนเห็นแค่ขอบโผล่นิดเดียว
  //
  //   4. ผ้าคลุม/ชั้นเสื้อต้องต่างค่าความสว่างจากชุดด้านในอย่างน้อยหนึ่งขั้น
  //      สีใกล้กันเกินไปจะกลืนเป็นก้อนเดียวจนอ่านไม่ออกว่ามีผ้าคลุม
  //
  //   5. เครื่องประดับที่พุ่งออกจากหัวต้องอ้อมพ้นปลายหู
  //      เส้นรัศมีจากกลางหัวจะทับหูพอดีจนอ่านเป็นตะเกียบปักหัว
  //      ใช้วงโค้งที่จุดศูนย์กลางอยู่ต่ำแต่รัศมีใหญ่กว่าหัวแทน
  //
  // ── กติกาของ trail ──
  //   ทรงต้องต่างจากชุดอื่นที่ "เงาร่าง" ไม่ใช่ที่ลวดลาย
  //     เม็ดวาดที่รัศมี 2-5px รายละเอียดข้างในมองไม่เห็นอยู่แล้ว
  //     ที่แยกออกจากกันได้จริงคือโครงร่างล้วน ๆ: แฉก/เหลี่ยม/ซี่/หยด/รี
  //   ต้องจางหายก่อนตกถึงพื้น (คุมด้วย life กับ gravity)
  //     ถ้าตกถึงพื้นแล้วค้าง มันจะไปทับหนามกับปากหลุมจนอ่านผิดว่าตรงนั้นปลอดภัย
  //   every x life ต้องให้มีอยู่ราว 8-10 เม็ดพร้อมกัน
  //     มากกว่านั้นจะบังของที่ต้องหลบ น้อยกว่านั้นจะไม่เห็นเป็นหาง
  //   ทรงที่ต้องหมุน (ใบไม้/เกล็ดหิมะ) ใส่ spin
  //     มุมหมุนสุ่มครั้งเดียวตอนเม็ดเกิด ห้ามคำนวณจากตำแหน่งเด็ดขาด
  //     เคยพลาดมาแล้วกับผลไม้: ตำแหน่งเปลี่ยนทุกเฟรมเพราะกล้องเลื่อน
  //     ผลไม้ลูกเดียวจึงสลับชนิดทุกเฟรมจนเห็นเป็นกระพริบ
  {
    id: 'noble',
    rarity: 'high',
    name: 'ลูกคุณหนูจอมซน',
    note: 'หมวกสูงกับเสื้อกั๊กแดงทอง',
    // โบนัสไทม์เปลี่ยนเป็นฟ้าทองอุ่น ๆ เข้ากับชุด
    bonus: {
      sky: ['#33210A', '#8A5C1E', '#C99A52'],
      glow: 'rgba(210,165,80,.34)',
      speck: 'rgba(228,200,140,.62)',
      cloud: '#D8C08A',
      cloudSoft: '#9C7C46',
      sparkle: '#E8C46B',
    },
    // เม็ดที่โปรยลงมาเปลี่ยนเป็นทอง และของกินทั้งจอมีประกายทองวิบวับ
    rain: ['#FFC93C', '#FFF0BC', '#A5701A'],
    rainShape: 'coin',
    glow: '#FFE9A8',

    // เกล็ดทองร่วง — หนักที่สุดในบรรดาหางเม็ดทั้งหมด (gravity 0.075)
    // ทองควรรู้สึกมีน้ำหนัก ไม่ใช่ลอยเหมือนแสง
    trail: {
      every: 5, shape: 'diamond',
      colors: ['#FFE9A8', '#FFC93C', '#FFF0BC'],
      r: [2.2, 4], life: 44, gravity: 0.075, drift: -0.5,
    },
    back(ctx, s, pose) {
      const t = performance.now() * 0.003;
      const cx = pose === 'slide' ? -2 : 0;
      const cy = pose === 'slide' ? 2 : 4;


      // ── ตราประจำตระกูลลอยหลังหัว ──
      // โล่ทองกับดาวตรงกลาง เป็นของชิ้นเด่นที่ทำให้ชุดนี้จำได้จากเงาร่างอย่างเดียว
      ctx.save();
      ctx.translate(cx - 21, cy - 27);
      ctx.rotate(Math.sin(t * 0.6) * 0.06);
      ctx.shadowColor = '#FFE9A8';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#F0C55C';
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(8.5, -6); ctx.lineTo(8.5, 3);
      ctx.quadraticCurveTo(8.5, 9, 0, 12);
      ctx.quadraticCurveTo(-8.5, 9, -8.5, 3);
      ctx.lineTo(-8.5, -6);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#7A2430';
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(6, -4); ctx.lineTo(6, 2);
      ctx.quadraticCurveTo(6, 6.5, 0, 8.8);
      ctx.quadraticCurveTo(-6, 6.5, -6, 2);
      ctx.lineTo(-6, -4);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFE9A8';
      star4(ctx, 0, 0.5, 4);
      ctx.restore();

      sparkleAura(ctx, pose, '#FFD86B', '#FFF3C4');

      // เกล็ดทองลอยรอบตัว
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        const a = t * 0.5 + k * 2.1;
        const r = 36 + k * 5;
        const tw = 0.35 + Math.abs(Math.sin(t * 1.6 + k * 1.7)) * 0.65;
        ctx.globalAlpha = tw;
        ctx.fillStyle = k === 1 ? '#FFF3C4' : '#FFD86B';
        star4(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.72, 1.7 + tw * 1.8);
      }
      ctx.restore();
    },
    body(ctx, s, pose) {
      fullSuit(ctx, pose, '#F5F1E6');            // เชิ้ตขาว
      clipBody(ctx, pose, () => {
        // ไล่สีเสื้อคลุมจากดำอมม่วงไปดำสนิท ผ้าจึงดูมีความลึกแทนที่จะเป็นแผ่นสีเดียว
        const cg = ctx.createLinearGradient(0, -14, 0, 26);
        cg.addColorStop(0, '#33283F');
        cg.addColorStop(1, '#17131F');
        ctx.fillStyle = cg;
        if (pose === 'slide') {
          ctx.fillRect(-24, -12, 15, 28);
          ctx.fillRect(9, -12, 17, 28);
        } else {
          ctx.fillRect(-18, -10, 9, 32);
          ctx.fillRect(9, -10, 12, 32);
        }
        // เสื้อกั๊กแดงไล่สี พร้อมขอบทองสองข้าง
        const vg = ctx.createLinearGradient(0, 0, 0, 24);
        vg.addColorStop(0, '#D8404E');
        vg.addColorStop(1, '#8E1C28');
        ctx.fillStyle = vg;
        if (pose === 'slide') ctx.fillRect(-9, 0, 18, 16);
        else ctx.fillRect(-9, 2, 18, 20);
        ctx.fillStyle = '#FFC93C';
        if (pose === 'slide') { ctx.fillRect(-9.8, 0, 1.4, 16); ctx.fillRect(8.4, 0, 1.4, 16); }
        else { ctx.fillRect(-9.8, 2, 1.4, 20); ctx.fillRect(8.4, 2, 1.4, 20); }
        ctx.fillStyle = '#FFC93C';               // กระดุมทอง
        for (const gy of pose === 'slide' ? [3, 8] : [5, 11]) {
          ctx.beginPath(); ctx.arc(pose === 'slide' ? 0 : 0, gy, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      });
      // ── ผ้าคลุมไหล่แดงขอบทอง ──
      // ชั้นที่สามที่ชุดนี้เคยขาดไป — ชุดใหม่ ๆ มีผ้าคลุมกันหมด ตัวนี้เลยดูแบนกว่าเพื่อน
      const sway = Math.sin(performance.now() * 0.0033) * 1.4;
      const capeY = pose === 'slide' ? -10 : -12;
      // ── ทำไมผ้าคลุมเป็นม่วงไม่ใช่แดง ──
      // ลองแดงก่อนแล้วมันไปกลืนกับเสื้อกั๊กแดงที่อยู่ใต้พอดี เห็นเป็นก้อนแดงก้อนเดียว
      // ไม่ใช่สามชั้น (โค้ทดำ / ผ้าคลุม / เสื้อกั๊ก) ซึ่งคือทั้งหมดที่เพิ่มชั้นนี้เข้ามาเพื่อ
      // ม่วงเข้มอมน้ำเงินต่างจากทั้งโค้ทดำและกั๊กแดง ชั้นทั้งสามจึงแยกกันได้ด้วยตาเปล่า
      const mg = ctx.createLinearGradient(0, capeY, 0, capeY + 16);
      mg.addColorStop(0, '#4A2A72');
      mg.addColorStop(1, '#2E1A4E');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.moveTo(-15, capeY);
      ctx.quadraticCurveTo(-20 + sway, capeY + 10, -12 + sway, capeY + 15);
      ctx.lineTo(12 - sway, capeY + 15);
      ctx.quadraticCurveTo(20 - sway, capeY + 10, 15, capeY);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#FFC93C';
      ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-15, capeY);
      ctx.quadraticCurveTo(-20 + sway, capeY + 10, -12 + sway, capeY + 15);
      ctx.lineTo(12 - sway, capeY + 15);
      ctx.quadraticCurveTo(20 - sway, capeY + 10, 15, capeY);
      ctx.stroke();

      // หูกระต่ายแดงใต้คาง — เลื่อนลงให้พ้นชายผ้าคลุม
      const bx = pose === 'slide' ? 7 : 1;
      const by = pose === 'slide' ? 8 : 9;
      bowKnot(ctx, bx, by, 4.6, '#C42B3A', '#FFC93C');
    },
    head(ctx) {
      topHat(ctx, '#1E1A26', '#C42B3A', '#FFC93C');
      // แว่นตาข้างเดียว = สัญลักษณ์ลูกคุณหนู
      ctx.strokeStyle = '#FFC93C';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(7, -1, 5.2, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(11.5, 1.5); ctx.lineTo(14, 6); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.beginPath(); ctx.arc(7, -1, 4.6, 0, Math.PI * 2); ctx.fill();
    },
  },
  {
    id: 'princess',
    rarity: 'high',
    name: 'องค์หญิงหิมะ',
    note: 'มงกุฎใหญ่กับชุดราตรีฟ้า',
    // ฟ้าฟรุ้ง ๆ วิ๊บวั๊บตามที่สั่ง
    bonus: {
      sky: ['#123B60', '#3F82AC', '#8FBDD4'],
      glow: 'rgba(120,190,225,.34)',
      speck: 'rgba(200,232,245,.62)',
      cloud: '#C8DFEC',
      cloudSoft: '#7FA6BC',
      sparkle: '#7FD8F0',
    },
    rain: ['#6FD4FF', '#DEF7FF', '#2E7EA8'],
    rainShape: 'snow',
    glow: '#BFEEFF',

    // เกล็ดหิมะ — เบาที่สุด แทบไม่ตก (gravity 0.012) และหมุนช้า ๆ ระหว่างลอย
    // อายุยาวกว่าชุดอื่นเพราะหิมะที่หายเร็วจะดูเหมือนประกายมากกว่าหิมะ
    trail: {
      every: 6, shape: 'flake',
      colors: ['#DEF7FF', '#BFEEFF', '#8FE0FF'],
      r: [2.4, 4.4], life: 58, gravity: 0.012, drift: -0.4, spin: 0.06,
    },
    back(ctx, s, pose) {
      const t = performance.now() * 0.003;
      const cx = pose === 'slide' ? -2 : 0;
      const cy = pose === 'slide' ? 2 : 4;


      // ── เกล็ดหิมะยักษ์ลอยหลังหัว ──
      // ของชิ้นเด่นประจำชุด หมุนช้ามาก (0.18 รอบต่อวินาที) ให้รู้สึกเย็นและนิ่ง
      // ไม่ใช่หมุนติ้ว ๆ ซึ่งจะอ่านเป็นของเล่นมากกว่าเวทมนตร์น้ำแข็ง
      ctx.save();
      ctx.translate(cx - 21, cy - 27);
      ctx.rotate(t * 0.18);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(214,244,255,.92)';
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-Math.cos(a) * 12, -Math.sin(a) * 12);
        ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
        ctx.stroke();
        // ซี่แขนงเล็กที่ปลายแต่ละแฉก ทำให้อ่านเป็นเกล็ดหิมะไม่ใช่ดาวกระจาย
        ctx.lineWidth = 1.6;
        for (const sgn of [-1, 1]) {
          const ex = Math.cos(a) * 12 * sgn, ey = Math.sin(a) * 12 * sgn;
          for (const off of [-0.6, 0.6]) {
            ctx.beginPath();
            ctx.moveTo(ex * 0.62, ey * 0.62);
            ctx.lineTo(ex * 0.62 + Math.cos(a + off) * 4.6 * sgn, ey * 0.62 + Math.sin(a + off) * 4.6 * sgn);
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      sparkleAura(ctx, pose, '#8FE8FF', '#E4FAFF');

      // ละอองน้ำแข็งลอยรอบตัว
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        const a = t * 0.45 + k * 2.1;
        const r = 36 + k * 5;
        const tw = 0.35 + Math.abs(Math.sin(t * 1.5 + k * 1.7)) * 0.65;
        ctx.globalAlpha = tw;
        ctx.fillStyle = k === 1 ? '#FFFFFF' : '#A8E8FF';
        star4(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.72, 1.7 + tw * 1.8);
      }
      ctx.restore();

      // ผ้าคลุมยาวสยายไปข้างหลัง วาดใน back จึงอยู่หลังตัวจริง ๆ
      ctx.save();
      // ไล่สีจากฟ้าเข้มตรงไหล่ไปจางที่ปลาย ผ้าจึงดูบางลงตรงชายแทนที่จะทึบเท่ากันทั้งผืน
      const rg = ctx.createLinearGradient(0, 0, -30, 18);
      rg.addColorStop(0, 'rgba(140,215,250,.92)');
      rg.addColorStop(1, 'rgba(190,236,255,.42)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      if (pose === 'slide') {
        ctx.moveTo(-6, -6); ctx.quadraticCurveTo(-26, -4, -34, 6);
        ctx.quadraticCurveTo(-22, 10, -6, 8);
      } else {
        ctx.moveTo(-6, -6); ctx.quadraticCurveTo(-24, 4, -22, 22);
        ctx.quadraticCurveTo(-10, 18, -2, 20);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    },
    body(ctx, s, pose) {
      fullSuit(ctx, pose, '#BEE6FA');
      clipBody(ctx, pose, () => {
        // กระโปรงไล่สีจากฟ้าอ่อนไปฟ้าเข้ม แทนสีเดียวแบน ๆ ของเดิม
        const sg = ctx.createLinearGradient(0, pose === 'slide' ? 3 : 7, 0, 26);
        sg.addColorStop(0, '#8FD6F4');
        sg.addColorStop(1, '#4C9CCC');
        ctx.fillStyle = sg;
        ctx.fillRect(-26, pose === 'slide' ? 3 : 7, 52, 28);
      });
      // ชายกระโปรงหยักเป็นน้ำแข็ง — ขอบตรงของเดิมทำให้ดูเป็นกระโปรงธรรมดา
      clipBody(ctx, pose, () => {
        scallop(ctx, -24, 24, pose === 'slide' ? 9 : 15, 6, 3.4, '#EAF8FF');
      });
      clipBody(ctx, pose, () => {
        // ลายเกล็ดบนชายกระโปรง
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        for (const px of [-9, -1, 7]) {
          ctx.beginPath(); ctx.arc(px, pose === 'slide' ? 6 : 11, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      });
      collar(ctx, pose, '#4EA8D8', 3.4, (x, y) => {
        // แสงนวลรองหลังดาว ไม่งั้นดาวฟ้าบนผ้าฟ้าค่าใกล้กันเกินจนจม
        const gg = ctx.createRadialGradient(x, y, 0, x, y, 8);
        gg.addColorStop(0, 'rgba(224,248,255,.8)');
        gg.addColorStop(1, 'rgba(224,248,255,0)');
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        star4(ctx, x, y, 4);
      });
    },
    head(ctx) {
      crown(ctx, [[-8, 5], [-3.5, 7.5], [3.5, 7.5], [8, 5]], '#EAF6FF', '#5FD0FF', -1);
      // ต่างหูหยดน้ำสองข้าง
      ctx.fillStyle = '#5FD0FF';
      ctx.beginPath(); ctx.arc(-12, 4, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(14, 4, 1.8, 0, Math.PI * 2); ctx.fill();
    },
  },
  {
    id: 'fruit',
    rarity: 'high',
    name: 'ปาร์ตี้ผลไม้รวม',
    note: 'ชุดผลไม้สดใส หวานฉ่ำทั้งตัว',
    // ฟ้าโบนัสเป็นส้มอมชมพูแบบน้ำผลไม้ปั่น
    bonus: {
      sky: ['#3A1220', '#A83C4E', '#FF9A5C'],
      glow: 'rgba(255,150,90,.34)',
      speck: 'rgba(255,220,150,.66)',
      cloud: '#FFD9A8',
      cloudSoft: '#C9705E',
      sparkle: '#FFE07A',
    },
    // เม็ดที่โปรยลงมาเป็นผลไม้จริง ๆ ห้าชนิดสลับกัน (ดู rainFruit ใน entities.js)
    // สีในอาเรย์นี้ไม่ได้ใช้กับตัวผลไม้ เพราะแต่ละชนิดมีสีของตัวเองอยู่แล้ว
    // แต่ยังใช้กับอนุภาคที่กระเด็นตอนเก็บ จึงตั้งเป็นโทนผลไม้รวมไว้
    rain: ['#FF5C5C', '#FFE07A', '#3FBF6A'],
    rainShape: 'fruit',
    glow: '#FFC46B',

    // เม็ดกลมสีผลไม้ — ใช้ทรงกลมล้วนโดยตั้งใจ
    // ทรงผลไม้จริงมีรายละเอียดเยอะเกินกว่าจะอ่านออกที่รัศมี 3px
    // ย่อลงมาแล้วจะกลายเป็นก้อนสีมั่ว ๆ สู้ใช้กลมแล้วให้ "สี" เป็นตัวบอกธีมดีกว่า
    trail: {
      every: 5, shape: 'dot',
      colors: ['#FF4D4D', '#FFB627', '#8BD44E', '#B06CE8'],
      r: [2.2, 4], life: 42, gravity: 0.06, drift: -0.6,
    },
    back(ctx, s, pose) {
      sparkleAura(ctx, pose, '#FF7A5C', '#FFE9B0');
    },
    body(ctx, s, pose) {
      // เสื้อขาวครีมเป็นพื้น ให้ผลไม้สีจัดลอยเด่นขึ้นมา
      fullSuit(ctx, pose, '#FFF6E4');
      clipBody(ctx, pose, () => {
        // ผลไม้เรียงพาดกลางอก เลือกสีตามผลไม้จริง ไม่ได้สุ่มสี
        const fruits = [
          ['#FF4D4D', '#FF9A9A'],   // สตรอว์เบอร์รี่
          ['#FFB627', '#FFD98A'],   // ส้ม
          ['#8BD44E', '#C6EFA0'],   // กีวี
          ['#B06CE8', '#DCB6FF'],   // องุ่น
        ];
        // ── ทำไมต้องวางต่ำขนาดนี้ ──
        // เดิมวางไว้ที่ y ราว -4 ซึ่งเป็นระดับอก แต่ระดับนั้นโดนหัวแมวกับปลอกคอ
        // บังจนเห็นแค่ขอบผลไม้โผล่นิดเดียว ต้องลงมาที่พุงถึงจะมีที่ว่างให้เห็นเต็มลูก
        const y0 = pose === 'slide' ? 2 : 9;
        fruits.forEach(([main, lite], k) => {
          // เรียงโค้งตามพุงแทนที่จะเรียงเป็นเส้นตรง จะได้ดูเหมือนติดอยู่บนตัวจริง ๆ
          const fx = -12 + k * 8;
          const fy = y0 + Math.abs(k - 1.5) * 1.8;
          ctx.fillStyle = main;
          ctx.beginPath(); ctx.arc(fx, fy, 5, 0, Math.PI * 2); ctx.fill();
          // ไฮไลต์มุมบนซ้ายทุกลูก ทำให้ดูฉ่ำเหมือนผลไม้จริง ไม่ใช่วงกลมสีแบน
          ctx.fillStyle = lite;
          ctx.beginPath(); ctx.arc(fx - 1.6, fy - 1.8, 1.9, 0, Math.PI * 2); ctx.fill();
        });
      });
      // ปลอกคอเปลือกส้ม พร้อมจี้เชอร์รี่ห้อยใต้คาง
      collar(ctx, pose, '#FF8A3C', 3.4, (cx, cy) => {
        ctx.fillStyle = '#E23B4E';
        ctx.beginPath(); ctx.arc(cx, cy + 1.5, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3FBF6A';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(cx, cy - 1.4); ctx.lineTo(cx + 2.5, cy - 5); ctx.stroke();
      });
    },
    head(ctx) {
      // หมวกแตงโม — เปลือกเขียว ขอบขาว เนื้อแดงมีเมล็ด
      ctx.fillStyle = '#2FA858';
      ctx.beginPath(); ctx.arc(0, -9, 13, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#EAF7E4';
      ctx.beginPath(); ctx.arc(0, -9, 11, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#FF5566';
      ctx.beginPath(); ctx.arc(0, -9, 9.4, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#3A1010';
      for (const sx of [-5, 0, 5]) {
        ctx.beginPath(); ctx.ellipse(sx, -12.5, 0.9, 1.4, 0, 0, Math.PI * 2); ctx.fill();
      }
      // เชอร์รี่คู่บนยอดหมวก เด้งเบา ๆ ให้ชุดดูมีชีวิตแม้ตอนยืนนิ่ง
      const t = performance.now() * 0.004;
      const bob = Math.sin(t) * 1.2;
      ctx.strokeStyle = '#3FBF6A';
      ctx.lineWidth = 1.3;
      for (const dx of [-4, 4]) {
        ctx.beginPath();
        ctx.moveTo(0, -20); ctx.quadraticCurveTo(dx * 0.6, -25, dx, -26 + bob);
        ctx.stroke();
      }
      ctx.fillStyle = '#E23B4E';
      for (const dx of [-4, 4]) {
        ctx.beginPath(); ctx.arc(dx, -26 + bob, 2.6, 0, Math.PI * 2); ctx.fill();
      }
    },
  },
  {
    id: 'sweet',
    rarity: 'high',
    name: 'เหมียวขนมหวานมหัศจรรย์',
    note: 'ผู้พิทักษ์แห่งอาณาจักรขนมหวาน',
    // ฟ้าโบนัสเป็นชมพูพาสเทลไล่ไปครีม เหมือนท้องฟ้าในร้านขนม
    bonus: {
      sky: ['#4A2246', '#B0567E', '#FFC6B0'],
      glow: 'rgba(255,170,205,.34)',
      speck: 'rgba(255,235,245,.72)',
      cloud: '#FFE3F0',
      cloudSoft: '#C87FA8',
      sparkle: '#FFF0F7',
    },
    rain: ['#FF8FC0', '#FFF3DC', '#A8DCFF'],
    rainShape: 'sweet',
    glow: '#FFD3E8',

    // หัวใจกับดาวลอยสลับกัน — ตรงกับ "ดาวเล็ก ๆ และหัวใจลอยออกมาขณะเคลื่อนไหว"
    // ตกช้า (gravity 0.03) ให้ลอยขึ้นค้างอยู่พักหนึ่งก่อนจางหาย ดูเป็นเวทมนตร์
    // ไม่ใช่ของหล่นธรรมดา — 9 เม็ดพร้อมกัน เบาพอที่จะไม่บังหนามที่ต้องหลบ
    trail: {
      every: 5, shape: ['heart', 'star'],
      colors: ['#FFB3D1', '#A8DCFF', '#FFF3DC', '#D6BBFF'],
      r: [2.2, 4], life: 46, gravity: 0.03, drift: -0.55,
    },

    back(ctx, s, pose) {
      const t = performance.now() * 0.003;
      const cx = pose === 'slide' ? -2 : 0;
      const cy = pose === 'slide' ? 2 : 4;

      sparkleAura(ctx, pose, '#FF9EC8', '#FFF0F7');

      // ── ประกายสามสีลอยรอบตัว ──
      // ชมพู/ฟ้า/ขาว ตามสเปก คนละวงโคจร คนละจังหวะวิบ
      // ใช้ดาวสี่แฉกล้วน ไม่ปนหัวใจ เพราะหัวใจไปอยู่ในหางเม็ดแล้ว
      // ถ้าใส่ทั้งสองที่จะกลายเป็นหัวใจเต็มจอจนรก
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const cols = ['#FFB3D1', '#A8DCFF', '#FFFFFF'];
      for (let k = 0; k < 3; k++) {
        const a = t * 0.55 + k * 2.1;
        const r = 30 + k * 5;
        const tw = 0.35 + Math.abs(Math.sin(t * 1.7 + k * 1.5)) * 0.65;
        ctx.globalAlpha = tw;
        ctx.fillStyle = cols[k];
        star4(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.72, 1.8 + tw * 2);
      }
      ctx.restore();
    },

    body(ctx, s, pose) {
      const t = performance.now() * 0.003;

      // ── ชุดครีม ──
      fullSuit(ctx, pose, '#FFF3DC');
      // กระโปรงชมพูพาสเทลครึ่งล่าง ชายเป็นครีมขาว
      skirt(ctx, pose, '#FFB3D1', '#FFFFFF');

      clipBody(ctx, pose, () => {
        // ── ลายน้ำตาลไอซิ่งหยดจากคอลงมา ──
        // ครึ่งวงกลมเรียงติดกันเป็นแถบหยัก คือลายที่อ่านเป็น "ไอซิ่ง" ได้ทันที
        // วาดเป็นแถบตรงจะกลายเป็นเสื้อลายขวางธรรมดาแทน
        // ต้องต่ำกว่าชายผ้าคลุม (capeY + 17 = 6) ไม่งั้นโดนคลุมทับจนไม่เห็นเลย
        // ตรงนี้พอดีกับขอบบนของกระโปรง จึงอ่านเป็นไอซิ่งที่หยดลงมาบนกระโปรง
        const icingY = pose === 'slide' ? 5 : 10;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(-28, icingY - 8);
        ctx.lineTo(28, icingY - 8);
        ctx.lineTo(28, icingY);
        for (let x = 24; x >= -28; x -= 8) {
          ctx.arc(x, icingY, 4, 0, Math.PI);
        }
        ctx.closePath();
        ctx.fill();

        // เม็ดลูกกวาดโรยบนกระโปรง — วางครึ่งล่างเพราะครึ่งบนโดนผ้าคลุมกับหัวบัง
        const dots = pose === 'slide'
          ? [[-12, 6], [-1, 9], [10, 6]]
          : [[-9, 13], [1, 17], [9, 13], [-3, 20]];
        const dc = ['#A8DCFF', '#D6BBFF', '#FF8FC0'];
        dots.forEach(([dx, dy], k) => {
          ctx.fillStyle = dc[k % 3];
          ctx.beginPath(); ctx.ellipse(dx, dy, 2.4, 1.7, 0.4, 0, Math.PI * 2); ctx.fill();
        });
      });

      // ── ผ้าคลุมสั้นลายเค้กสองชั้น ──
      // ม่วงอ่อนทับชุดครีม ต่างค่าความสว่างชัด ไม่งั้นกลืนเป็นก้อนเดียว
      const sway = Math.sin(t * 1.2) * 1.5;
      const capeY = pose === 'slide' ? -9 : -11;
      ctx.fillStyle = '#D6BBFF';
      ctx.beginPath();
      ctx.moveTo(-16, capeY);
      ctx.quadraticCurveTo(-21 + sway, capeY + 11, -13 + sway, capeY + 17);
      ctx.lineTo(13 - sway, capeY + 17);
      ctx.quadraticCurveTo(21 - sway, capeY + 11, 16, capeY);
      ctx.closePath(); ctx.fill();
      // ชายผ้าเป็นครีมหยัก ให้อ่านเป็นชั้นเค้กไม่ใช่ผ้าคลุมเฉย ๆ
      ctx.fillStyle = '#FFF8EC';
      ctx.beginPath();
      for (let x = -13; x <= 13; x += 6.5) {
        ctx.moveTo(x + sway * 0.5, capeY + 17);
        ctx.arc(x + sway * 0.5, capeY + 17, 3.2, 0, Math.PI);
      }
      ctx.fill();

      // ── ปลอกคอริบบิ้นพร้อมจี้หัวใจลูกกวาด ──
      collar(ctx, pose, '#FF8FC0', 3.4, (cx, cy) => {
        // โบว์ใหญ่ขึ้นและเลื่อนลง — ที่ตำแหน่งเดิมมันอยู่ใต้ผ้าคลุมพอดีจนมองไม่เห็น
        // ชมพูเข้ม ไม่ใช่ชมพูพาสเทล — โบว์ไปนั่งอยู่บนแถบไอซิ่งสีขาวพอดี
        // สีอ่อนกับพื้นขาวค่าใกล้กันเกินจนโบว์หายไปทั้งชิ้น (ลองแล้วเป็นแบบนั้นจริง)
        bowKnot(ctx, cx, cy + 5, 5.4, '#FF6FA8', '#FFD3E8');
        // หัวใจห้อยใต้โบว์
        ctx.fillStyle = '#FF6FA8';
        const hy = cy + 13, hr = 3.2;
        ctx.beginPath();
        ctx.moveTo(cx, hy + hr * 0.95);
        ctx.bezierCurveTo(cx - hr * 1.6, hy - hr * 0.35, cx - hr * 0.6, hy - hr * 1.2, cx, hy - hr * 0.35);
        ctx.bezierCurveTo(cx + hr * 0.6, hy - hr * 1.2, cx + hr * 1.6, hy - hr * 0.35, cx, hy + hr * 0.95);
        ctx.fill();
      });
    },

    head(ctx) {
      const t = performance.now() * 0.004;

      // ── มงกุฎครีมกับลูกกวาด ──
      // ยอดแหลมสามยอดต่ำ ๆ อยู่ระหว่างหูทั้งสอง จึงไม่ไปทับหูเหมือนเครื่องประดับ
      // ที่พุ่งออกจากกลางหัว (กติกาข้อ 5 ที่หัวหมวด)
      ctx.fillStyle = '#FFF8EC';
      ctx.beginPath();
      ctx.moveTo(-7, -9);
      ctx.lineTo(-4.5, -15); ctx.lineTo(-2, -10.5);
      ctx.lineTo(0, -16.5); ctx.lineTo(2, -10.5);
      ctx.lineTo(4.5, -15); ctx.lineTo(7, -9);
      ctx.closePath(); ctx.fill();
      // ฐานมงกุฎเป็นครีมหยัก
      ctx.beginPath();
      for (const bx of [-5, -1.5, 2, 5.5]) { ctx.moveTo(bx, -9); ctx.arc(bx, -9, 2.2, 0, Math.PI); }
      ctx.fill();

      // ลูกกวาดบนยอดมงกุฎ วิบสลับกัน
      const beads = [[-4.5, -16, '#A8DCFF'], [0, -17.6, '#FF8FC0'], [4.5, -16, '#D6BBFF']];
      beads.forEach(([bx, by, col], k) => {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.4 + Math.abs(Math.sin(t + k * 1.4)) * 0.6;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(bx - 0.7, by - 0.8, 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });

      // ดาวจิ๋ววิบข้างมงกุฎ
      for (const [dx, ph] of [[-10, 0], [10, 1.7]]) {
        const k = 0.4 + Math.abs(Math.sin(t * 1.2 + ph)) * 0.6;
        ctx.globalAlpha = k;
        ctx.fillStyle = '#FFF0F7';
        star4(ctx, dx, -12, 1.3 + k * 1.1);
      }
      ctx.globalAlpha = 1;
    },
  },
  {
    id: 'lunar',
    rarity: 'high',
    name: 'จันทราแมวรัตติกาล',
    note: 'ผู้พิทักษ์แห่งแสงจันทร์',
    // ฟ้าโบนัสเป็นคืนเดือนหงาย กรมท่าไล่ไปม่วง จบด้วยเงินอมฟ้าตรงขอบฟ้า
    bonus: {
      sky: ['#0A1030', '#2A1E5C', '#6A5AA8'],
      glow: 'rgba(150,180,255,.34)',
      speck: 'rgba(226,236,255,.75)',
      cloud: '#C9D4F5',
      cloudSoft: '#5A5490',
      sparkle: '#EAF2FF',
    },
    rain: ['#8FA8F0', '#EAF2FF', '#3A3A72'],
    rainShape: 'star',
    glow: '#BFD2FF',

    // ── หางดาวที่ทิ้งไว้ข้างหลังตอนวิ่ง ──
    // every 5 + life 42 = มีอยู่ราว 8 เม็ดพร้อมกัน เบาพอที่จะไม่บังหนามที่ต้องหลบ
    // gravity ต่ำ (0.045) กับ life สั้น ทำให้เม็ดจางหายก่อนตกถึงพื้นเสมอ
    // ถ้าปล่อยให้ตกถึงพื้นแล้วค้าง มันจะไปทับหนามกับปากหลุมจนอ่านผิดว่าตรงนั้นปลอดภัย
    trail: {
      every: 5,
      shape: 'star',
      colors: ['#EAF2FF', '#BFD2FF', '#8FA8F0'],
      r: [2.4, 4.4],
      life: 48,
      gravity: 0.045,
      drift: -0.7,
    },

    back(ctx, s, pose) {
      const t = performance.now() * 0.003;
      const cx = pose === 'slide' ? -2 : 0;
      const cy = pose === 'slide' ? 2 : 4;

      // ── วงแสงจันทร์หลังตัว ──
      // วาดก่อนออร่า เพื่อให้ออร่าฟุ้งทับขอบวงอีกชั้น ขอบจึงนุ่มไม่ใช่เส้นคม
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // รัศมี 42 — อยู่ระหว่างของเดิม (34 ซึ่งแนบตัวเกินจนไม่เห็นเป็นวง)
      // กับที่เคยลองขยายไว้ (50 ซึ่งใหญ่จนกินพื้นที่รอบตัวมากไป)
      const ring = 42 + Math.sin(t * 0.9) * 2;
      // แถบสว่างต้องบางลงตามรัศมีที่โตขึ้น ไม่งั้นวงจะกลายเป็นก้อนฟุ้งทึบแทนที่จะเป็นวง
      const g = ctx.createRadialGradient(cx, cy, ring * 0.78, cx, cy, ring);
      g.addColorStop(0, 'rgba(150,180,255,0)');
      // จางลงจาก .52 -> .32 ให้เป็นแสงเรืองบาง ๆ ไม่ใช่วงสีทึบที่แย่งสายตาไปจากตัวละคร
      g.addColorStop(0.62, 'rgba(176,200,255,.32)');
      g.addColorStop(1, 'rgba(150,180,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, ring, 0, Math.PI * 2); ctx.fill();

      // ── พระจันทร์เสี้ยวเงินลอยหลังหัว ──
      // ปิดชั้น lighter ของวงแสงก่อน ไม่งั้นเสี้ยวจะถูกบวกสีจนกลายเป็นก้อนขาวล้วน
      ctx.restore();
      ctx.save();
      ctx.translate(cx - 22, cy - 28);
      ctx.rotate(-0.35 + Math.sin(t * 0.7) * 0.05);
      ctx.globalAlpha = 0.95;
      ctx.shadowColor = '#CFE0FF';
      ctx.shadowBlur = 12;
      crescent(ctx, 0, 0, 11, '#E8EEFF');
      ctx.restore();

      sparkleAura(ctx, pose, '#8FA8F0', '#EAF2FF');

      // ── ดาวเล็ก ๆ ลอยรอบตัว ──
      // สามดวงคนละวงโคจร คนละจังหวะวิบ ตาจึงจับได้ว่าลอยอยู่จริงไม่ใช่แปะติดที่
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        const a = t * 0.5 + k * 2.1;
        const r = 37 + k * 5;   // เกาะขอบวงแสง ดาวจึงลอยอยู่แถวขอบ ไม่ใช่กองอยู่ในวง
        const tw = 0.35 + Math.abs(Math.sin(t * 1.6 + k * 1.7)) * 0.65;
        ctx.globalAlpha = tw;
        ctx.fillStyle = k === 1 ? '#EAF2FF' : '#BFD2FF';
        star4(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7, 1.8 + tw * 1.8);
      }
      ctx.restore();
    },

    body(ctx, s, pose) {
      const t = performance.now() * 0.003;

      // ── ชุดคลุมโทนกรมท่า ──
      fullSuit(ctx, pose, '#1E2450');
      clipBody(ctx, pose, () => {
        // ครึ่งล่างเป็นม่วงเข้ม ไล่ต่อจากกรมท่าด้านบน ได้ผ้าที่ดูมีความลึก
        const g = ctx.createLinearGradient(0, -14, 0, 26);
        g.addColorStop(0, '#232A5C');
        g.addColorStop(1, '#3B2560');
        ctx.fillStyle = g;
        ctx.fillRect(-28, -14, 56, 40);

        // แถบเงินคาดกลางตัว
        ctx.fillStyle = '#C8D4F0';
        ctx.fillRect(-28, pose === 'slide' ? 6 : 9, 56, 2.2);

        // ดาวเล็ก ๆ ประดับบนผ้า วิบเบา ๆ คนละจังหวะ
        ctx.fillStyle = '#DCE6FF';
        // วางเฉพาะครึ่งล่าง เพราะครึ่งบนโดนผ้าคลุมทับจนมองไม่เห็นเลย
        const dots = pose === 'slide'
          ? [[-13, 5], [-2, 8], [9, 5], [16, 8]]
          : [[-9, 12], [0, 16], [9, 12], [-4, 19], [6, 19]];
        dots.forEach(([dx, dy], k) => {
          ctx.globalAlpha = 0.5 + Math.abs(Math.sin(t * 1.3 + k * 1.4)) * 0.5;
          star4(ctx, dx, dy, 1.5);
        });
        ctx.globalAlpha = 1;
      });

      // ── ผ้าคลุมสั้นพาดไหล่ ──
      // ชายผ้าขยับตามเวลาเล็กน้อย ให้รู้สึกว่าเป็นผ้าไม่ใช่แผ่นแข็ง
      // วาดนอก clipBody เพราะผ้าคลุมต้องล้นออกนอกลำตัวได้ ไม่งั้นจะดูเป็นเสื้อกล้าม
      const sway = Math.sin(t * 1.1) * 1.6;
      const capeY = pose === 'slide' ? -9 : -11;
      // สว่างกว่าชุดด้านในหนึ่งขั้น ไม่งั้นผ้าคลุมกับชุดกลืนเป็นก้อนเดียว
      // แล้วอ่านไม่ออกว่ามีผ้าคลุมอยู่ (ลองสีเดียวกันแล้วหายไปเลยจริง ๆ)
      const cg = ctx.createLinearGradient(0, capeY, 0, capeY + 20);
      cg.addColorStop(0, '#5B4AA8');
      cg.addColorStop(1, '#3A2B7A');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(-17, capeY);
      ctx.quadraticCurveTo(-22 + sway, capeY + 13, -14 + sway, capeY + 20);
      ctx.lineTo(14 - sway, capeY + 20);
      ctx.quadraticCurveTo(22 - sway, capeY + 13, 17, capeY);
      ctx.closePath(); ctx.fill();
      // ขอบเงินตามชายผ้า
      ctx.strokeStyle = '#CBD8F5';
      ctx.lineWidth = 1.7;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-17, capeY);
      ctx.quadraticCurveTo(-22 + sway, capeY + 13, -14 + sway, capeY + 20);
      ctx.lineTo(14 - sway, capeY + 20);
      ctx.quadraticCurveTo(22 - sway, capeY + 13, 17, capeY);
      ctx.stroke();

      // ── ปลอกคอเครื่องรางเวทมนตร์ + เข็มกลัดพระจันทร์เสี้ยวที่หน้าอก ──
      collar(ctx, pose, '#3A3A78', 3.6, (cx, cy) => {
        // แสงนวลรองข้างหลังเข็มกลัด ให้เงินไม่จมไปกับผ้าสีเข้ม
        const gg = ctx.createRadialGradient(cx, cy + 2, 0, cx, cy + 2, 7);
        gg.addColorStop(0, 'rgba(190,214,255,.5)');
        gg.addColorStop(1, 'rgba(190,214,255,0)');
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.arc(cx, cy + 2, 9, 0, Math.PI * 2); ctx.fill();

        // เข็มกลัดเสี้ยว — เจาะแบบเดียวกับดวงจันทร์ด้านหลัง
        ctx.save();
        ctx.translate(cx, cy + 2);
        ctx.rotate(-0.4);
        crescent(ctx, 0, 0, 4.8, '#EAF0FF');
        ctx.restore();

        // อัญมณีรูปดาวเม็ดเล็กห้อยใต้เข็มกลัด
        gem(ctx, cx, cy + 9, 2.6, '#8FA8F0');
      });
    },

    head(ctx) {
      const t = performance.now() * 0.004;

      // ── มงกุฎแถบเงินคาดหน้าผาก ──
      headBand(ctx, -9, 3.4, '#2B2F63', '#C8D4F0');

      // ── พระจันทร์เสี้ยวเงินบนหน้าผาก ──
      ctx.save();
      ctx.translate(0, -12.5);
      ctx.rotate(-0.3);
      ctx.shadowColor = '#CFE0FF';
      ctx.shadowBlur = 7;
      crescent(ctx, 0, 0, 5.6, '#EDF2FF');
      ctx.restore();

      // อัญมณีดาวเม็ดจิ๋วสองข้างของเสี้ยว วิบสลับกัน
      for (const [dx, ph] of [[-8, 0], [8, 1.6]]) {
        const k = 0.4 + Math.abs(Math.sin(t + ph)) * 0.6;
        ctx.globalAlpha = k;
        ctx.fillStyle = '#DCE6FF';
        star4(ctx, dx, -10, 1.4 + k * 1.1);
      }
      ctx.globalAlpha = 1;
    },
  },
  {
    id: 'rainbow',
    rarity: 'high',
    name: 'สายรุ้งเจ็ดสี',
    note: 'ชุดสายรุ้งเปล่งประกายทั้งตัว',
    bonus: {
      sky: ['#1B1040', '#5B3AA8', '#C86BD8'],
      glow: 'rgba(180,120,255,.36)',
      speck: 'rgba(255,220,255,.7)',
      cloud: '#F2D8FF',
      cloudSoft: '#9A6BC8',
      sparkle: '#FFFFFF',
    },
    // หยดน้ำใสไล่แปดสี (ดู DROP_COLORS ใน entities.js) — สีในอาเรย์นี้ใช้กับ
    // อนุภาคตอนเก็บเท่านั้น ตัวหยดเลือกสีเองจากพิกัดเพื่อให้ไล่โทนต่อเนื่อง
    rain: ['#FF5C7A', '#FFF3B0', '#4FC9E8'],
    rainShape: 'drop',
    glow: '#E9C8FF',

    // หยดน้ำเจ็ดสี — ใช้ชุดสีเดียวกับเม็ดที่โปรยตอนสกิล หางกับเม็ดโปรยจึงเป็นเรื่องเดียวกัน
    trail: {
      every: 4, shape: 'drop',
      colors: ['#A96BFF', '#5BC8FF', '#3FD98A', '#FFE04D', '#FF9A3C', '#FF4D5E', '#FF7ABF'],
      r: [2, 3.6], life: 40, gravity: 0.07, drift: -0.6,
    },
    back(ctx, s, pose) {
      sparkleAura(ctx, pose, '#B06CE8', '#FFFFFF');

      // ── โค้งสายรุ้งหลังตัว ──
      // วาดในชั้น back จึงอยู่หลังตัวแมว อ่านเป็นรัศมี/ปีก ไม่ใช่แถบพาดบังหน้า
      const t = performance.now() * 0.003;
      const cx = pose === 'slide' ? -2 : 0;
      const cy = pose === 'slide' ? 4 : 6;
      const cols = ['#FF4D6D', '#FF9A3C', '#FFE04D', '#4FD97A', '#4FC9E8', '#7A6BFF', '#C86BD8'];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      cols.forEach((c, k) => {
        // แต่ละสีเต้นคนละจังหวะ วงจึงกระเพื่อมเป็นคลื่น ไม่ใช่ขยายพร้อมกันทั้งก้อน
        const r = 26 + k * 3.4 + Math.sin(t + k * 0.5) * 1.6;
        ctx.globalAlpha = 0.42 - k * 0.025;
        ctx.strokeStyle = c;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI * 1.08, Math.PI * 1.92);
        ctx.stroke();
      });
      ctx.restore();
    },
    body(ctx, s, pose) {
      clipBody(ctx, pose, () => {
        // ไล่เจ็ดสีจากบนลงล่างด้วย gradient ไม่ใช่แถบแยกชิ้น สีจึงไหลต่อเนื่อง
        const g = ctx.createLinearGradient(0, -14, 0, 26);
        const cols = ['#FF4D6D', '#FF9A3C', '#FFE04D', '#4FD97A', '#4FC9E8', '#7A6BFF', '#C86BD8'];
        cols.forEach((c, k) => g.addColorStop(k / (cols.length - 1), c));
        ctx.fillStyle = g;
        ctx.fillRect(-28, -14, 56, 40);

        // แถบประกายวิ่งพาดเสื้อเป็นจังหวะ ทำให้ผ้าดูเป็นมันวาว ไม่ใช่สีทึบนิ่ง ๆ
        const t = performance.now() * 0.0016;
        const sweep = ((t % 1) * 76) - 38;
        const sg = ctx.createLinearGradient(sweep - 12, 0, sweep + 12, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)');
        sg.addColorStop(0.5, 'rgba(255,255,255,.5)');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(-28, -14, 56, 40);
      });
      collar(ctx, pose, '#FFFFFF', 3, (cx, cy) => {
        ctx.save();
        ctx.translate(cx, cy + 2);
        // แสงนวลรองข้างหลังก่อน ดาวขาวบนเสื้อสีจัดจะได้ไม่จมหายไปกับพื้นหลัง
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 9);
        g.addColorStop(0, 'rgba(255,243,176,.85)');
        g.addColorStop(1, 'rgba(255,243,176,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
        ctx.rotate(performance.now() * 0.002);
        // star4 ใช้ fillStyle ปัจจุบัน ไม่ได้รับสีเป็นพารามิเตอร์
        // ต้องตั้งทับก่อน ไม่งั้นดาวจะถูกวาดด้วย gradient ของแสงนวลข้างบนแล้วจางหาย
        ctx.fillStyle = '#FFFFFF';
        star4(ctx, 0, 0, 5.6);
        ctx.restore();
      });
    },
    head(ctx) {
      const t = performance.now() * 0.004;

      // ── มงกุฎสายรุ้งลอยเหนือหัว ──
      // เดิมวาดเป็นเส้นพุ่งออกจากกลางหัว ซึ่งทับหูแมวพอดีจนอ่านเป็นตะเกียบปักหัว
      // เปลี่ยนเป็นวงโค้งที่ "คร่อมอยู่เหนือทุกอย่าง" แทน — จุดศูนย์กลางอยู่ต่ำ
      // แต่รัศมีใหญ่กว่าหัว เส้นจึงลอยพ้นปลายหูทั้งสองข้างโดยไม่แตะอะไรเลย
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      const cols = ['#FF4D6D', '#FF9A3C', '#FFE04D', '#4FD97A', '#4FC9E8', '#7A6BFF', '#C86BD8'];
      cols.forEach((c, k) => {
        const r = 20 + k * 1.9 + Math.sin(t * 1.2 + k * 0.6) * 0.8;
        ctx.strokeStyle = c;
        ctx.lineWidth = 1.9;
        ctx.globalAlpha = 0.9 - k * 0.06;
        ctx.beginPath();
        ctx.arc(0, -4, r, Math.PI * 1.16, Math.PI * 1.84);
        ctx.stroke();
      });
      ctx.restore();

      // ดาวประกายลอยรอบหัว หมุนคนละความเร็วกับมงกุฎ ตาจึงจับได้ว่ามีสองชั้น
      for (let k = 0; k < 3; k++) {
        const a = t * 0.6 + k * 2.1;
        const r = 15 + Math.sin(t + k) * 2;
        const tw = 0.5 + Math.abs(Math.sin(t * 1.7 + k * 1.3)) * 0.5;
        ctx.globalAlpha = tw;
        ctx.fillStyle = '#FFFFFF';
        star4(ctx, Math.cos(a) * r, Math.sin(a) * r - 4, 2.6 + tw * 1.4);
      }
      ctx.globalAlpha = 1;
    },
  },

  {
    id: 'dryad',
    rarity: 'high',
    name: 'นางไม้มรกต',
    note: 'มงกุฎใบไม้กับปีกใบไม้',
    // ป่าลึกยามเช้า เขียวมรกตตัดทอง
    bonus: {
      sky: ['#0A2818', '#256B3E', '#7FAE86'],
      glow: 'rgba(130,205,150,.32)',
      speck: 'rgba(196,232,192,.6)',
      cloud: '#B8D8B4',
      cloudSoft: '#6E9670',
      sparkle: '#7FDC96',
    },
    rain: ['#5FD35A', '#D6FFC9', '#256B3E'],
    rainShape: 'leaf',
    glow: '#B6F5A8',

    // ใบไม้ปลิว — หมุนแรงที่สุด (spin 0.09) และตกช้า ให้เห็นเป็นใบที่ร่วงหมุนคว้าง
    trail: {
      every: 6, shape: 'leaf',
      colors: ['#8BE87F', '#D6FFC9', '#5FD35A'],
      r: [2.4, 4.2], life: 52, gravity: 0.03, drift: -0.5, spin: 0.09,
    },
    back(ctx, s, pose) {
      const t = performance.now() * 0.003;
      const cx = pose === 'slide' ? -2 : 0;
      const cy = pose === 'slide' ? 2 : 4;


      // ── พวงมาลัยใบไม้ลอยหลังหัว ──
      // วงใบไม้เรียงรอบ เป็นของชิ้นเด่นประจำชุดแบบเดียวกับพระจันทร์ของชุดจันทรา
      ctx.save();
      ctx.translate(cx - 21, cy - 27);
      ctx.rotate(Math.sin(t * 0.5) * 0.08);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + t * 0.12;
        ctx.save();
        ctx.translate(Math.cos(a) * 10, Math.sin(a) * 10);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = i % 2 ? '#7EE08C' : '#4FBF63';
        ctx.beginPath(); ctx.ellipse(0, 0, 5.2, 2.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // ดอกไม้เม็ดกลางวง
      ctx.fillStyle = '#FFE7A8';
      ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      sparkleAura(ctx, pose, '#8FF0A8', '#DFFFE0');

      // ละอองเกสรลอยรอบตัว
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        const a = t * 0.5 + k * 2.1;
        const r = 36 + k * 5;
        const tw = 0.35 + Math.abs(Math.sin(t * 1.6 + k * 1.7)) * 0.65;
        ctx.globalAlpha = tw;
        ctx.fillStyle = k === 1 ? '#FFE7A8' : '#B6F5A8';
        star4(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.72, 1.6 + tw * 1.7);
      }
      ctx.restore();

      // ปีกใบไม้คู่ ชี้ไปข้างหลัง (มุมราว π = ทางซ้าย)
      const bx = pose === 'slide' ? -5 : -4;
      const by = pose === 'slide' ? 0 : 2;
      leaf(ctx, bx, by, 21, 8.5, Math.PI + 0.52, 'rgba(126,224,140,.75)', 'rgba(37,104,64,.65)');
      leaf(ctx, bx, by, 18, 7, Math.PI - 0.24, 'rgba(95,211,90,.72)', 'rgba(37,104,64,.65)');
    },
    body(ctx, s, pose) {
      fullSuit(ctx, pose, '#2F7C4E');
      clipBody(ctx, pose, () => {
        // ไล่สีจากเขียวสว่างลงไปเขียวเข้ม ผ้าจึงมีความลึกแทนที่จะเป็นแผ่นเดียว
        const sg = ctx.createLinearGradient(0, pose === 'slide' ? 3 : 7, 0, 26);
        sg.addColorStop(0, '#57B877');
        sg.addColorStop(1, '#2A6E45');
        ctx.fillStyle = sg;
        ctx.fillRect(-26, pose === 'slide' ? 3 : 7, 52, 28);
      });
      // ชายกระโปรงหยักเป็นใบไม้
      clipBody(ctx, pose, () => {
        scallop(ctx, -24, 24, pose === 'slide' ? 9 : 15, 6, 3.4, '#9CF0AE');
      });
      clipBody(ctx, pose, () => {
        // เข็มขัดเถาวัลย์ทอง
        ctx.strokeStyle = '#E8C86B';
        ctx.lineWidth = 2.2;
        const by = pose === 'slide' ? 3 : 7;
        ctx.beginPath(); ctx.moveTo(-22, by); ctx.lineTo(22, by); ctx.stroke();
      });
      // ใบไม้บนบ่า วาดนอก clip ให้ล้นพ้นไหล่ออกมาได้นิดหน่อย
      leaf(ctx, pose === 'slide' ? 1 : -6, pose === 'slide' ? -5 : -3, 11, 4.4, -2.35,
        '#5FD35A', '#2F7C4E');
      collar(ctx, pose, '#E8C86B', 3, (x, y) => gem(ctx, x, y, 3.6, '#2BE0A8'));
    },
    head(ctx) {
      // วงเถาวัลย์รอบหัว แล้วปักใบไม้เรียงบนวง
      ctx.strokeStyle = '#2F7C4E';
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(0, 0, 12, Math.PI * 1.18, Math.PI * 1.82); ctx.stroke();

      leaf(ctx, -8.5, -8.6, 8, 3.2, -2.55, '#5FD35A', '#2F7C4E');
      leaf(ctx, -3, -11.8, 9.5, 3.8, -2.0, '#7BE07A', '#2F7C4E');
      leaf(ctx, 3, -11.8, 9.5, 3.8, -1.14, '#5FD35A', '#2F7C4E');
      leaf(ctx, 8.5, -8.6, 8, 3.2, -0.59, '#7BE07A', '#2F7C4E');

      gem(ctx, 0, -9.6, 3.4, '#2BE0A8');
    },
  },

  // ══ ระดับกลาง ═════════════════════════════════════════════
  {
    id: 'bow',
    rarity: 'normal',
    name: 'โบว์หวาน',
    note: 'โบว์กับกระดิ่ง',
    body(ctx, s, pose) {
      skirt(ctx, pose, '#FF7FAE', '#FFF2F8');
      collar(ctx, pose, '#E8365F', 3.6, (x, y) => {
        ctx.fillStyle = '#FFC93C';
        ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#8A5A00';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - 2.4, y); ctx.lineTo(x + 2.4, y); ctx.stroke();
        ctx.fillStyle = '#8A5A00';
        ctx.beginPath(); ctx.arc(x, y + 1.7, 0.9, 0, Math.PI * 2); ctx.fill();
      });
    },
    head(ctx, s, { earsBack }) {
      // เกาะอยู่บนหูขวา ตอนหมอบหูลู่ไปหลัง โบว์จึงต้องขยับตาม
      bowKnot(ctx, earsBack ? 2 : 10, earsBack ? -12 : -14, 4.6, '#FF5C93', '#FFD6E6');
    },
  },
  {
    id: 'ninja',
    rarity: 'normal',
    name: 'นินจาส้ม',
    note: 'ผ้าคาดหัวแดง',
    body(ctx, s, pose) {
      sash(ctx, pose, '#C8324B', '#2A2333');
      collar(ctx, pose, '#2A2333', 4);
    },
    head(ctx) {
      headBand(ctx, -9.2, 5.4, '#C8324B', '#2A2333');
      // ชายผ้าปลิวไปข้างหลัง ใช้สีแดงเพราะสีเข้มจะจมหายไปกับฉากม่วง
      ctx.strokeStyle = '#C8324B';
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-10, -7.5); ctx.quadraticCurveTo(-19, -9, -24, -15);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-10.5, -5.5); ctx.quadraticCurveTo(-20, -3.5, -25, -5.5);
      ctx.stroke();
      ctx.fillStyle = '#FFE07A';
      ctx.beginPath(); ctx.arc(5.5, -6.4, 2.1, 0, Math.PI * 2); ctx.fill();
    },
  },
  {
    id: 'chef',
    rarity: 'normal',
    name: 'เชฟน้อย',
    note: 'หมวกฟูกับผ้ากันเปื้อน',
    body(ctx, s, pose) {
      skirt(ctx, pose, '#FBF6EC', '#E2D7C4');
      clipBody(ctx, pose, () => {
        ctx.strokeStyle = '#C9B79B';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(-7, pose === 'slide' ? 4 : 8);
        ctx.lineTo(-7, 24);
        ctx.moveTo(8, pose === 'slide' ? 4 : 8);
        ctx.lineTo(8, 24);
        ctx.stroke();
      });
      collar(ctx, pose, '#E05A4A', 3.4);
    },
    head(ctx) {
      chefHat(ctx);
    },
  },
  {
    id: 'pirate',
    rarity: 'normal',
    name: 'โจรสลัดน้อย',
    note: 'ผ้าปิดตากับเสื้อลายทาง',
    body(ctx, s, pose) {
      fullSuit(ctx, pose, '#F3EDE2');
      stripes(ctx, pose, '#2F4B7C');
      sash(ctx, pose, '#B8442F');
    },
    head(ctx) {
      headBand(ctx, -10, 5.6, '#2F4B7C', '#1D3155');
      // ผ้าปิดตาข้างซ้าย เชือกพาดขึ้นไปหลังหู
      ctx.strokeStyle = '#15121D';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-11, -4.5); ctx.lineTo(1, -6); ctx.stroke();
      ctx.fillStyle = '#15121D';
      ctx.beginPath(); ctx.ellipse(-5, -1, 5.4, 4.4, -0.12, 0, Math.PI * 2); ctx.fill();
    },
  },
  {
    id: 'hoodie',
    rarity: 'normal',
    name: 'ฮู้ดสตรีท',
    note: 'เสื้อฮู้ดกับหมวกกลับหลัง',
    back(ctx, s, pose) {
      // ฮู้ดกองอยู่ต้นคอ ต้องอยู่หลังหัวถึงจะดูเป็นผ้าไม่ใช่ปลอกคอ
      ctx.fillStyle = '#3E6E8E';
      ctx.beginPath();
      ctx.ellipse(pose === 'slide' ? 2 : -4, pose === 'slide' ? -3 : -5, 10, 7, -0.3, 0, Math.PI * 2);
      ctx.fill();
    },
    body(ctx, s, pose) {
      fullSuit(ctx, pose, '#4E86A8');
      clipBody(ctx, pose, () => {
        ctx.fillStyle = '#3E6E8E';
        ctx.fillRect(-28, pose === 'slide' ? 5 : 11, 56, 20);   // กระเป๋าหน้า
        ctx.strokeStyle = '#DCE9F2';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-2, -4); ctx.lineTo(-4, 6);
        ctx.moveTo(3, -4); ctx.lineTo(5, 6);
        ctx.stroke();
      });
    },
    head(ctx) {
      // หมวกแก๊ปกลับหลัง ปีกจึงยื่นไปทางซ้าย
      ctx.fillStyle = '#E0533F';
      ctx.beginPath(); ctx.arc(0, -8, 10.5, Math.PI, 0); ctx.fill();
      ctx.fillRect(-10.5, -8.6, 21, 3);
      ctx.beginPath(); ctx.ellipse(-13, -7.4, 5.4, 2.2, 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFD36E';
      ctx.beginPath(); ctx.arc(0, -17.5, 1.8, 0, Math.PI * 2); ctx.fill();
    },
  },

  {
    id: 'tiara',
    rarity: 'normal',
    name: 'มงกุฎจิ๋ว',
    note: 'มงกุฎเล็กกับเกล็ดหิมะ',
    body(ctx, s, pose) {
      skirt(ctx, pose, '#9FD4F2', '#FFFFFF');
      collar(ctx, pose, '#6FB8E0', 3.4, (x, y) => {
        ctx.strokeStyle = '#EAF6FF';
        ctx.lineWidth = 1.3;
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(x - Math.cos(a) * 3.4, y - Math.sin(a) * 3.4);
          ctx.lineTo(x + Math.cos(a) * 3.4, y + Math.sin(a) * 3.4);
          ctx.stroke();
        }
      });
    },
    head(ctx) {
      crown(ctx, [[-6, 4.5], [0, 7], [6, 4.5]], '#DCE6F5', '#5FD0FF');
    },
  },
  {
    id: 'rocker',
    rarity: 'normal',
    name: 'ร็อกเกอร์',
    note: 'แว่นดำกับเสื้อหนัง',
    body(ctx, s, pose) {
      vest(ctx, pose, '#2A2333');
      collar(ctx, pose, '#2A2333', 4.4);
      const cx = pose === 'slide' ? 7 : 1;
      const cy = pose === 'slide' ? 0 : -3;
      const r = pose === 'slide' ? 7.5 : 9.5;
      ctx.fillStyle = '#D8DDE8';
      for (let i = 0; i < 4; i++) {
        const a = Math.PI * (0.22 + i * 0.19);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    head(ctx) {
      ctx.strokeStyle = '#15121D';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-10, -2.6); ctx.lineTo(-13.2, -3.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, -2.6); ctx.lineTo(14, -3.8); ctx.stroke();

      ctx.fillStyle = '#15121D';
      ctx.beginPath(); ctx.roundRect(-11, -5, 10.5, 7, 2.4); ctx.fill();
      ctx.beginPath(); ctx.roundRect(2, -5, 10.5, 7, 2.4); ctx.fill();
      ctx.fillRect(-1, -3.6, 3.4, 1.8);

      ctx.strokeStyle = 'rgba(255,255,255,.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-9, 0.6); ctx.lineTo(-6, -3.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, 0.6); ctx.lineTo(7, -3.4); ctx.stroke();
    },
  },
  {
    id: 'nurse',
    rarity: 'normal',
    name: 'พยาบาลน้อย',
    note: 'หมวกกาชาดกับชุดขาว',
    body(ctx, s, pose) {
      fullSuit(ctx, pose, '#FBFDFF');
      clipBody(ctx, pose, () => {
        ctx.fillStyle = '#E4576A';
        const gy = pose === 'slide' ? 2 : 6;
        ctx.fillRect(-11.5, gy - 1.4, 7, 2.8);
        ctx.fillRect(-9.4, gy - 3.5, 2.8, 7);
      });
      collar(ctx, pose, '#7FC6E8', 3.2);
    },
    head(ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.roundRect(-9.5, -17.5, 19, 8, 2.4); ctx.fill();
      ctx.fillStyle = '#E4576A';
      ctx.fillRect(-2.6, -16, 5.2, 2.4);
      ctx.fillRect(-0.6, -18, 1.2, 6.4);
    },
  },
  {
    id: 'wizard',
    rarity: 'normal',
    name: 'พ่อมดน้อย',
    note: 'หมวกกรวยกับเสื้อคลุมดาว',
    body(ctx, s, pose) {
      fullSuit(ctx, pose, '#3B357A');
      clipBody(ctx, pose, () => {
        ctx.fillStyle = '#FFD86B';
        for (const [px, py] of [[-9, 2], [2, 9], [9, -1], [-3, 14]]) {
          star4(ctx, px, py + (pose === 'slide' ? -4 : 0), 2.1);
        }
      });
      collar(ctx, pose, '#FFD86B', 3);
    },
    head(ctx) {
      coneHat(ctx, '#3B357A', '#FFD86B');
    },
  },
  {
    id: 'sailor',
    rarity: 'normal',
    name: 'กะลาสีน้อย',
    note: 'ปกกะลาสีกับหมวกขาว',
    body(ctx, s, pose) {
      fullSuit(ctx, pose, '#F6F8FC');
      sailorCollar(ctx, pose, '#33518C', '#FFFFFF');
      const bx = pose === 'slide' ? 6 : 0;
      bowKnot(ctx, bx, pose === 'slide' ? 3 : 1, 3.4, '#E4576A', '#FFD9DE');
    },
    head(ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.ellipse(0, -11.5, 12, 3.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -12.5, 8.6, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#33518C';
      ctx.fillRect(-8.6, -13.6, 17.2, 2.4);
    },
  },
];

// เติม foodBonus จากระดับ ไม่ให้ค่าของชุดระดับเดียวกันเพี้ยนกันเอง
export const OUTFITS = LIST.map((o) => ({
  ...o,
  foodBonus: o.rarity ? RARITY[o.rarity].foodBonus : 0,
}));

export const OUTFIT_COST = 5000;      // ทองต่อการสุ่มหนึ่งครั้ง

export function outfitById(id) {
  return OUTFITS.find((o) => o.id === id) || OUTFITS[0];
}

/** ทุกชุดที่สุ่มได้ — ไม่รวม 'ขนล้วน' ซึ่งมีติดตัวมาแต่แรก */
export function pullPool() {
  return OUTFITS.filter((o) => o.rarity);
}

// ── ครอบครอง ────────────────────────────────────────────────
// เก็บรวมชุดเดียวไม่แยกตามแมว เพราะ id ไม่ซ้ำกันอยู่แล้ว
// และการ "ได้ของจากกาช่า" เป็นของบัญชีผู้เล่น ไม่ใช่ของตัวละคร

const owned = new Set(loadOwned());

export function isOwned(id) {
  return id === 'none' || owned.has(id);
}

export function grantOutfit(id) {
  if (owned.has(id)) return false;
  owned.add(id);
  saveOwned([...owned]);
  return true;
}

export function ownedCount() {
  return owned.size;
}

/**
 * รายการ id เรียงตามลำดับที่ได้มา ตัวแรกคือชิ้นที่ได้มานานที่สุด
 *
 * Set ใน JS จำลำดับที่ใส่เข้าไป และ grantOutfit() มีแต่เพิ่มไม่มีลบ
 * ลำดับนี้จึงเท่ากับลำดับที่สุ่มได้จริง ใช้กับตัวกรอง "ล่าสุด" ได้เลย
 * โดยไม่ต้องเก็บเวลาที่ได้เพิ่มอีกช่อง
 */
export function ownedOrder() {
  return [...owned];
}

/** เฉพาะชุดที่ปลดล็อกแล้ว ใช้กับเมนูเลือกชุด */
export function wearable() {
  return OUTFITS.filter((o) => isOwned(o.id));
}

// ── ชุดที่ใส่อยู่ ────────────────────────────────────────────
// เก็บค่าเดียว ไม่แยกตามตัวแมว เพราะเปลี่ยนสีขนไม่ได้แปลว่าเปลี่ยนตัวละคร

function resolve(id) {
  const o = outfitById(id);
  // ชุดที่ยังไม่ได้ปลดล็อกใส่ไม่ได้ กันกรณีข้อมูลเก่าค้างอยู่ใน localStorage
  return isOwned(o.id) ? o : outfitById('none');
}

let chosen = null;

export function getOutfit() {
  if (chosen === null) chosen = resolve(loadOutfit()).id;
  return resolve(chosen);
}

export function setOutfit(id) {
  const o = resolve(id);
  chosen = o.id;
  saveOutfit(o.id);
  return o;
}

// ─────────────────────────────────────────────────────────────
// ตัวตรวจแบบฟอร์มของชุดระดับสูง — ทำงานเฉพาะตอน dev
//
// มีไว้เพราะข้อกำหนดที่เป็นคอมเมนต์อย่างเดียวไม่มีใครบังคับ
// คนเพิ่มชุดใหม่ลืมช่องใดช่องหนึ่งแล้วจะไม่รู้ตัวจนกว่าจะไปเจอเองในเกม
// (เช่นลืม trail แล้วชุดนั้นไม่มีหางเม็ดอยู่ชุดเดียว ซึ่งสังเกตยากมาก)
//
// Vite แทน import.meta.env.DEV ด้วย false ตอน build จริง บล็อกนี้จึงถูกตัดทิ้งทั้งก้อน
// ไม่มีต้นทุนอะไรเลยกับเกมที่ deploy ออกไป
// ─────────────────────────────────────────────────────────────
if (import.meta.env.DEV) {
  const BONUS_KEYS = ['sky', 'glow', 'speck', 'cloud', 'cloudSoft', 'sparkle'];
  const TRAIL_KEYS = ['every', 'shape', 'colors', 'r', 'life', 'gravity'];

  for (const o of OUTFITS) {
    if (o.rarity !== 'high') continue;
    const miss = [];

    for (const k of ['back', 'body', 'head']) {
      if (typeof o[k] !== 'function') miss.push(k + '()');
    }
    for (const k of ['rain', 'rainShape', 'glow', 'trail', 'bonus']) {
      if (!o[k]) miss.push(k);
    }
    if (o.rain && o.rain.length !== 3) miss.push('rain ต้องมี 3 สี');
    if (o.bonus) {
      for (const k of BONUS_KEYS) if (!o.bonus[k]) miss.push('bonus.' + k);
      if (o.bonus.sky && o.bonus.sky.length !== 3) miss.push('bonus.sky ต้องมี 3 สี');
    }
    if (o.trail) {
      for (const k of TRAIL_KEYS) if (o.trail[k] === undefined) miss.push('trail.' + k);
      // ตรวจว่าหางจางหายก่อนตกถึงพื้นจริงไหม — คิดระยะตกจาก s = ½at²
      const t = o.trail;
      if (t.life && t.gravity) {
        const fall = 0.5 * t.gravity * t.life * t.life;
        if (fall > 120) miss.push(`trail ตกไกล ${Math.round(fall)}px ก่อนหมดอายุ (เกิน 120 จะไปทับหนามกับปากหลุม)`);
      }
      // จำนวนเม็ดที่มีอยู่พร้อมกัน ต้องอยู่ในช่วงที่อ่านออกแต่ไม่บังทาง
      if (t.every && t.life) {
        const alive = Math.round(t.life / t.every);
        if (alive < 6 || alive > 14) miss.push(`trail มี ${alive} เม็ดพร้อมกัน (ควรอยู่ราว 8-10)`);
      }
    }

    if (miss.length) {
      console.warn(
        `[ชุดระดับสูง] "${o.name}" ยังไม่ครบแบบฟอร์ม — ขาด: ${miss.join(', ')}\n`
        + 'ดูข้อกำหนดที่หัวหมวด "ระดับสูง" ใน src/outfits.js'
      );
    }
  }
}
