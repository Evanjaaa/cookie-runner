// src/mv/kitten.js
// ─────────────────────────────────────────────────────────────
// น้องส้ม ตัวเอกของ MV — ลูกแมวตัวเดียวกับในเกม
//
// ตัวแมวคือตัวเดียวกับในเกมทุกเส้น (drawCatPose ใน render/entities.js) เปลี่ยนแค่จานสี
// ได้ท่าทางทั้งชุดของเกมมาฟรี: หาว หมอบ นั่ง เอียงหัว ขนพอง ย่อตัว เอื้อมเท้า หมุนตัว ฯลฯ
// และตัวละครหน้าตาเดิมทุก Shot แน่นอน เพราะวาดจากโค้ดชุดเดียว
//
// มีของที่ตัวเกมไม่มีอยู่อย่างเดียวคือ "ท่าหันหลัง" — ตัวเกมเป็นมุมหน้าตรงเสมอ
// ท่าหมุนตัว (turn) ของเกมพลิกภาพกลับด้าน ซึ่งยังเห็นหน้าอยู่ อ่านไม่ออกว่า "หันหลังให้"
// ─────────────────────────────────────────────────────────────
import { drawCatPose, drawPlayer, CAT_EDGE } from '../render/entities.js';
import { BODY, GROUND_Y } from '../config.js';
import { SKINS } from '../skins.js';

/**
 * น้องส้ม — ตัวเดียวกับตัวเอกของเกม (สกิน orange) ใช้จานสีของเกมตรง ๆ ไม่ได้ลอกค่ามา
 * ใครปรับสีน้องส้มในเกม MV ก็เปลี่ยนตาม · noPhoto กันรูปหน้าที่ผู้เล่นเคยอัปโหลดมาแปะทับ
 */
export const HERO = { ...SKINS.find((s) => s.id === 'orange'), noPhoto: true };

/**
 * วาดเหมียวท่าหน้าตรง
 * pose = รูปร่างของท่า (ช่องเดียวกับ IDLE_SHAPE ในเกม เช่น { loaf: 1, shut: 1 })
 *        + mood / gaze / blink ที่ส่งตรงให้ตัววาด
 * t = วินาที — ตัวเกมนับเวลาเป็นเฟรม (60 ต่อวินาที) จึงแปลงให้ตรงนี้
 */
export function drawKitten(ctx, x, feetY, scale, pose = {}, t = 0) {
  const { mood, gaze, blink, ...shape } = pose;
  drawCatPose(ctx, x, feetY, scale, HERO, t * 60, {
    shape, k: 1, mood: mood ?? '', gaze: gaze ?? 0, blink,
  });
}

/**
 * ท่าวิ่ง — ท่าวิ่งของตัวเกมตรง ๆ (drawPlayer) ขาแกว่ง ตัวโยก หางตามแรง
 * phase = ระยะที่วิ่งมาแล้ว (หน่วยโลก) ใช้คิดจังหวะก้าว · air = ลอยสูงจากพื้นเท่าไร (กระโดด)
 * vy = ความเร็วแนวตั้ง (เอียงตัวตอนลอย) · dir = 1 วิ่งไปขวา / -1 วิ่งไปซ้าย
 *
 * ตัวเกมวาดโดยยึดพื้นที่ GROUND_Y (เงาใต้ตัวก็คิดจากค่านั้น) จึงเลื่อนทั้งผืนให้ GROUND_Y
 * ไปตรงกับพื้นของ MV แทนการลอกโค้ดวาดมาแก้ — ได้ท่าวิ่งเดียวกับในเกมทุกเส้น
 */
export function drawKittenRun(ctx, x, feetY, scale, { phase = 0, air = 0, vy = 0, dir = 1, mood = '', squash = 0, tail = 0.3 } = {}) {
  const h = BODY.standH, w = BODY.standW;
  const player = {
    box: { x: -w / 2, y: GROUND_Y - h - air, w, h },
    y: GROUND_Y - air,
    onGround: air < 0.5,
    vy,
    runPhase: phase * 0.06,
    tailLag: tail,
    squash,
    sliding: false,
    tilt: 0,
  };
  ctx.save();
  ctx.translate(x, feetY - GROUND_Y);
  ctx.scale(dir, 1);
  drawPlayer(ctx, player, false, HERO, false, 0, mood, scale, 1, {});
  ctx.restore();
}

/**
 * ท่าหันหลังขดตัว — ของใหม่ที่ตัวเกมไม่มี
 *
 * ── ต้องเป็นตัวเดียวกับด้านหน้า ──
 * ทุกรูปทรงข้างล่างลอกตัวเลขมาจากตัวเกมตอนท่าหมอบ (drawCatStand/drawCatHead ที่ loaf = 1)
 * แล้วกลับซ้ายขวา: ลำตัววงรีเดียวกัน หัวกลมรัศมีเท่ากัน หูสามเหลี่ยมมุมเดียวกัน หางหนาเท่ากัน
 * ต่างแค่ไม่มีหน้า (ปาก ตา หนวด) และหลังหูไม่มีสีชมพู — คนดูจึงเห็นเป็นแมวตัวเดิมที่หันหลังให้
 * ถ้าวาดทรงใหม่เอง (เนิน/โดม) จะกลายเป็นแมวอีกตัวทันที ต่อให้สีเดียวกัน
 *
 * headUp 0..1 = ผงกหัวขึ้น (ได้ยินเสียง / เงยมอง) · earL/earR = กระดิกหูทีละข้าง · flick = สะบัดหาง
 * sit 0..1 = หมอบ (0) → นั่งตัวตรง (1) ใช้ตัวเลขท่านั่งของตัวเกม (sit = 1) แบบเดียวกัน
 * look -1..1 = หันหัวไปซ้าย/ขวา (มองประตู มองเจ้าของ)
 */
export function drawKittenBack(ctx, x, feetY, scale, { headUp = 0, earL = 0, earR = 0, flick = 0, breath = 0, sit = 0, look = 0 } = {}) {
  const s = HERO;
  ctx.save();
  ctx.translate(x, feetY - (BODY.standH / 2) * scale + breath * 0.6);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const edge = () => { ctx.strokeStyle = s.line; ctx.lineWidth = CAT_EDGE; };
  const rim = 'rgba(255,252,240,.32)';   // ขอบแสงชุดเดียวกับตัวเกม

  // ── ตัวเลขของตัวเกม ── ผสมระหว่างท่าหมอบ (loaf = 1) กับท่านั่ง (sit = 1) ตามค่า sit
  // (สูตรใน drawCatStand: cy = 6 + sit·3 + loaf·9 · rx = 14 + sit + loaf·4 · ry = 13 + sit·0.5 − loaf·4.5
  //  หัว hy = −12 + sit·2 + loaf·10.5 · hx = 1 + loaf·2 · หาง (−11 − loaf·3, 8 + sit·4 + loaf·10))
  const L = 1 - sit;
  const cy = 6 + sit * 3 + L * 9;
  const rx = 14 + sit + L * 4;
  const ry = 13 + sit * 0.5 - L * 4.5;
  const hx = -(1 + L * 2) - look * 2.5;               // กลับซ้ายขวา + หันหัว
  const hy = -12 + sit * 2 + L * 10.5 - headUp * 5;
  const R = 13;                                        // รัศมีหัว

  // ── ก้นตอนนั่ง ── สองก้อนผายออกข้างลำตัว (ตัวเกมวาดแบบเดียวกัน) ด้านหลังเห็นชัดกว่าด้านหน้าอีก
  if (sit > 0.02) {
    for (const sx of [-1, 1]) {
      ctx.fillStyle = s.cat;
      ctx.beginPath(); ctx.ellipse(sx * (10 + sit), cy + 8 * sit, 7.5 * sit, 7 * sit, 0, 0, Math.PI * 2);
      ctx.fill(); edge(); ctx.stroke();
    }
  }

  // ── หาง ── สูตรเดียวกับ drawTail ของเกม กลับด้านไปอยู่ขวา
  const tx = 11 + L * 3, ty = 8 + sit * 4 + L * 10, wag = -0.2 + flick * 1.2;
  const tipX = tx + 19, tipY = ty - 12 + wag * 7;
  const tail = () => { ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + 17, ty + 3 + wag * 5, tipX, tipY); };
  ctx.strokeStyle = s.line; ctx.lineWidth = 7 + CAT_EDGE * 2; tail(); ctx.stroke();
  ctx.strokeStyle = s.cat; ctx.lineWidth = 7; tail(); ctx.stroke();
  ctx.fillStyle = s.cream;
  ctx.beginPath(); ctx.arc(tipX, tipY, 3.6, 0, Math.PI * 2); ctx.fill(); edge(); ctx.stroke();

  // ── ลำตัว ── วงรีเดียวกับด้านหน้า (ไม่มีพุงครีม — ด้านหลังเห็นแต่หลัง)
  ctx.fillStyle = s.cat;
  ctx.beginPath(); ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); edge(); ctx.stroke();
  ctx.strokeStyle = rim; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, cy, rx - 1, ry - 1, 0, Math.PI * 1.08, Math.PI * 1.55); ctx.stroke();
  // ลายบนหลัง — ลายเดียวกับที่ตัวเกมมีบนหลัง กลับด้าน และเพิ่มอีกคู่ฝั่งตรงข้ามให้หลังไม่โล่ง
  ctx.strokeStyle = s.dark; ctx.lineWidth = 2.4;
  for (const [x0, x1] of [[10, 11], [6, 7], [-8, -9], [-12, -13]]) {
    ctx.beginPath(); ctx.moveTo(x0, cy - 5); ctx.lineTo(x1, cy); ctx.stroke();
  }

  // คอ — ตอนผงกหัวขึ้น หัวกับตัวต้องยังต่อกัน (ด้านหน้ามีหน้าอกบัง ด้านหลังไม่มี)
  if (headUp > 0.01) {
    ctx.fillStyle = s.cat;
    ctx.beginPath(); ctx.ellipse(hx * 0.5, (hy + cy) / 2 + 2, 9, (cy - hy) / 2, 0, 0, Math.PI * 2); ctx.fill();
  }

  // ── หู ── สามเหลี่ยมชุดเดียวกับด้านหน้า (earsUp ใน drawCatHead) กลับซ้ายขวา
  // ด้านหลังของหูเป็นขนล้วน ไม่มีชมพู
  const ears = [
    [[-13, -8], [-3, -8], [-14 - earL * 2, -20 + earL * 4]],
    [[3, -8], [13, -8], [14 + earR * 2, -20 + earR * 4]],
  ];
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(-look * 0.14);   // หันหัวไปทางที่มอง
  ctx.fillStyle = s.cat;
  for (const [a, b, tip] of ears) {
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...tip); ctx.lineTo(...b); ctx.closePath();
    ctx.fill(); edge(); ctx.stroke();
  }
  // ── หัว ── วงกลมรัศมีเดียวกับด้านหน้า ไม่มีหน้า
  ctx.fillStyle = s.cat;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill(); edge(); ctx.stroke();
  ctx.strokeStyle = rim; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.arc(0, 0, R - 1.1, -Math.PI * 0.95, -Math.PI * 0.4); ctx.stroke();
  // ลายท้ายทอย — ลายหน้าผากของตัวเกมมีสามเส้น ท้ายทอยจึงมีสามเส้นเหมือนกัน
  ctx.strokeStyle = s.dark; ctx.lineWidth = 2.5;
  for (const [x0, y0, x1, y1] of [[5, -11, 4, -5], [-1, -12, -1.5, -6], [-7, -10, -6.5, -5]]) {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

// ── สัญลักษณ์อารมณ์ ─────────────────────────────────────────
// MV เล่าด้วยภาพล้วน อารมณ์บอกด้วยสัญลักษณ์ชุดเดียวกับคลิปเปิดเกม (~ ? ! ♪ z)
// a = ความทึบ 0..1 · ขนาดเป็นหน่วยโลก ย่อขยายตามกล้องเอง

export function drawSymbol(ctx, ch, x, y, size, a = 1, rot = 0) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = `700 ${size}px Mali, "Mali", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.18;
  ctx.strokeStyle = 'rgba(58,40,56,.85)';
  ctx.strokeText(ch, 0, 0);
  ctx.fillStyle = '#FFF8EC';
  ctx.fillText(ch, 0, 0);
  ctx.restore();
}
