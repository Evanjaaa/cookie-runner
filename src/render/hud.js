// src/render/hud.js
import { VIEW, HEALTH, WORD, COLORS as C } from '../config.js';
import { drawFish, drawCatFace } from './entities.js';
import { getSkin } from '../skins.js';

const { W, H } = VIEW;

// จุดยึดของ HUD แถวบน รวมไว้ที่เดียวจะได้ตรวจว่าไม่ทับกันได้โดยไม่ต้องไล่อ่านทั้งไฟล์
const TREAT_TOP = 58;    // ค่าขนมเปียก ขวาริม ใต้ปุ่มหยุด/เสียงที่เป็น DOM
const WORD_TOP = 22;     // แถวตัวอักษรสะสม ซ้ายบนสุด

export function drawHUD(ctx, game) {
  // ทุกสีตัวอักษรมาจากจานสีของด่าน — ฟ้ากลางวันสว่างจนครีมอ่านไม่ออก
  const pal = game.pal;

  ctx.save();
  ctx.textBaseline = 'top';

  // ค่าขนมเปียกเป็นตัวเลขเดียวที่โชว์ระหว่างวิ่ง
  //
  // คะแนนกับระยะทางถูกถอดออก — ทั้งคู่เป็นตัวเลขที่ดูตอนวิ่งไม่ทันอยู่ดี
  // และสรุปให้ครบอยู่แล้วบนหน้าจบรอบ การมีสามตัวเลขแข่งกันอยู่มุมเดียว
  // ทำให้ไม่มีตัวไหนอ่านออกสักตัว เหลือตัวเดียวจึงอ่านได้จริงตอนกำลังวิ่ง
  //
  // ชิดขวาริมและอยู่ใต้แถวปุ่มหยุด/เสียง (ปุ่มเป็น DOM ทับอยู่ราว y12–50)
  // TREAT_TOP จึงเริ่มที่ 58 — ถ้าไปแก้ขนาดปุ่มใน .hudbtns ต้องขยับค่านี้ตาม
  //
  // ไอคอนเดียวพอ — เลขนี้คือคะแนนรวมของกินทุกชนิด ไม่ใช่จำนวนปลา
  // ใช้ปลาเป็นตัวแทนเพราะเป็นของที่เจอบ่อยที่สุดและสีตัดกับพื้นหลังชัดที่สุด
  const treatText = game.treat.toLocaleString('en-US');

  ctx.textAlign = 'right';

  ctx.globalAlpha = 0.62;
  ctx.font = "500 11px 'IBM Plex Sans Thai', sans-serif";
  ctx.fillStyle = pal.ink;
  ctx.fillText('ค่าขนมเปียก', W - 24, TREAT_TOP);
  ctx.globalAlpha = 1;

  ctx.font = '600 22px Mitr, sans-serif';
  ctx.fillStyle = pal.accent;
  ctx.fillText(treatText, W - 24, TREAT_TOP + 15);

  // วัดด้วยฟอนต์เดียวกับที่เพิ่งวาด แล้ววางไอคอนชิดซ้ายของตัวเลข
  drawFish(ctx, W - 38 - ctx.measureText(treatText).width, TREAT_TOP + 27, 11);

  ctx.textAlign = 'left';

  // มาตรวัดความเร็วถูกถอดออกแล้ว — ความเร็วคงที่ หลอดที่ไม่มีวันขยับคือขยะบนจอ

  ctx.restore();

  drawWord(ctx, game);
  drawHealthBar(ctx, game);

  if (game.notice > 0) drawNotice(ctx, game);
  if (game.bonus > 0) drawBonusBanner(ctx, game);

  // แฟลชแดงทั้งจอตอนโดนชน วาดท้ายสุดเพื่อให้ทับทุกอย่าง
  if (game.hurtFlash > 0) {
    ctx.fillStyle = `rgba(255,92,110,${0.3 * game.hurtFlash})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/**
 * แถบสะสมตัวอักษร MEOWZING — ซ้ายบนสุด เป็นของชิ้นเดียวที่อยู่มุมนั้น
 * ตัวที่ยังไม่ได้เก็บวาดเป็นโครงจาง ๆ ไม่ใช่ซ่อนไว้
 * เพราะผู้เล่นต้องเห็นตั้งแต่ต้นว่าเป้าหมายคือกี่ตัว ไม่งั้นไม่รู้ว่าต้องเก็บอะไรอยู่
 */
function drawWord(ctx, game) {
  const pal = game.pal;
  const size = 19;
  const gap = 3.5;
  const x0 = 24;
  const y = WORD_TOP;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 12px Mitr, sans-serif';

  for (let i = 0; i < WORD.length; i++) {
    const x = x0 + i * (size + gap);
    const got = i < game.letters;

    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);

    if (got) {
      ctx.fillStyle = C.letter;
      ctx.beginPath();
      ctx.roundRect(-size / 2, -size / 2, size, size, 6);
      ctx.fill();
      ctx.fillStyle = C.letterLite;
      ctx.fillText(WORD[i], 0, 0.5);
    } else {
      ctx.globalAlpha = 0.36;
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(-size / 2, -size / 2, size, size, 6);
      ctx.stroke();
      ctx.fillStyle = pal.ink;
      ctx.fillText(WORD[i], 0, 0.5);
    }
    ctx.restore();
  }

  ctx.restore();
}

/** ป้ายกลางจอตอนอยู่ในโบนัส พร้อมเวลาที่เหลือ */
function drawBonusBanner(ctx, game) {
  const secs = Math.ceil(game.bonus / 60);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  ctx.font = "700 17px Mitr, sans-serif";
  const label = `BONUS TIME  ${secs}`;
  const w = ctx.measureText(label).width + 34;

  ctx.fillStyle = 'rgba(59,17,85,.82)';
  ctx.beginPath();
  ctx.roundRect((W - w) / 2, 78, w, 30, 15);
  ctx.fill();

  ctx.fillStyle = C.letterLite;
  ctx.fillText(label, W / 2, 84);
  ctx.restore();
}

/**
 * ป้ายบอกว่าขวดพลังกำลังมา
 * จำเป็นเพราะขวดโผล่ตามเวลา ไม่ใช่ตามระยะทาง ผู้เล่นเลยเดาเองไม่ได้
 * ว่าต้องทนอีกไกลแค่ไหน — ถ้าไม่บอก การรอดจนหลอดเกือบหมดจะรู้สึกเหมือนถูกลงโทษ
 */
function drawNotice(ctx, game) {
  // จางเข้าเร็ว จางออกช้า ๆ ช่วงท้าย
  const a = Math.min(1, game.notice / 40);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.globalAlpha = a;

  ctx.font = "600 15px 'IBM Plex Sans Thai', sans-serif";
  // ข้อความมาจากฝั่งเกม เพราะตอนนี้แถบนี้ใช้บอกได้สองเรื่อง
  // (ผ่านด่านย่อย / ขวดพลังมาแล้ว) ไม่ใช่เรื่องเดียวเหมือนเดิม
  const label = game.noticeText || 'ขวดพลังมาแล้ว! กระโดดเก็บให้ทัน';
  const w = ctx.measureText(label).width + 28;

  ctx.fillStyle = game.pal.noticeBg;
  ctx.beginPath();
  ctx.roundRect((W - w) / 2, 80, w, 26, 13);
  ctx.fill();

  ctx.fillStyle = C.danger;
  ctx.fillText(label, W / 2, 85);

  ctx.restore();
}

/** หลอดพลังกลางจอบน — ตัวเดียวที่ผู้เล่นต้องจ้องตลอดเวลา เลยวางไว้กลาง */
/** เหรียญหน้าแมวที่หัวหลอด — วาดจานก่อน แล้วทับด้วยหน้าแมว หูจึงพาดขอบจานพอดี */
function drawCatBadge(ctx, cx, cy, r) {
  ctx.save();
  ctx.fillStyle = 'rgba(30,8,18,.92)';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.hpCase;
  ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.arc(cx, cy, r - 1.6, 0, Math.PI * 2); ctx.stroke();

  // เยื้องลง 4 เพราะจุดกึ่งกลางของหัวอยู่ที่วงหน้า ไม่ใช่รวมหู
  // ถ้าวางกลางจานตรง ๆ หูจะโผล่เกินจนดูหัวลอยขึ้นข้างบน
  drawCatFace(ctx, cx, cy + 4, 1, getSkin());
  ctx.restore();
}

/**
 * ขวดพลังกลางบน พร้อมเหรียญหน้าแมวที่หัวหลอด
 *
 * 320x20 — ใหญ่กว่าของเดิม (300x16) พอให้อ่านออกโดยไม่ต้องเพ่ง
 * แต่ไม่ถึงกับกินแถบบนทั้งแถบเหมือนรอบที่ลองไว้ 400x26
 *
 * สีเป็นชุดตายตัวไม่อิงจานสีของด่าน — หลอดต้องอ่านออกเท่ากันทั้งด่านกลางคืน
 * และด่านกลางวัน ถ้าอิงจานสีจะมีด่านหนึ่งที่หลอดกลืนพื้นหลังเสมอ
 */
function drawHealthBar(ctx, game) {
  const w = 320;
  const h = 20;
  const badgeR = 16;

  // เหรียญเกยหัวหลอดเข้าไป 6 ทั้งชุด (เหรียญ+ขวด) จึงกว้าง w+30
  // คำนวณ x จากตรงนั้นย้อนกลับ เพื่อให้ "ทั้งชุด" อยู่กลางจอ ไม่ใช่แค่ตัวขวด
  const x = Math.round((W - w + 22) / 2);
  const y = 34;
  const p = Math.max(0, Math.min(1, game.hp / HEALTH.max));
  const low = p <= HEALTH.lowAt;

  ctx.save();
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';

  // ตัวขวด — วงนอกหนาให้ดูเป็นภาชนะจริง ไม่ใช่แถบสีลอย ๆ
  ctx.fillStyle = C.hpCase;
  ctx.beginPath(); ctx.roundRect(x - 4, y - 4, w + 8, h + 8, (h + 8) / 2); ctx.fill();
  ctx.fillStyle = C.hpTrack;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();

  const fw = w * p;
  if (fw > 0.5) {
    // กะพริบเฉพาะตอนใกล้หมด ให้รู้ตัวโดยไม่ต้องละสายตาจากตัวละคร
    ctx.globalAlpha = low ? 0.55 + Math.sin(game.tick * 0.28) * 0.45 : 1;

    if (low) {
      ctx.fillStyle = C.hpLow;
    } else {
      // ไล่สีตามความยาวน้ำที่เหลือจริง ไม่ใช่ตามความยาวขวด
      // หลอดสั้นลงก็ยังเห็นส้ม→แดงครบ ไม่ใช่เหลือแต่ปลายส้มด้านเดียว
      const g = ctx.createLinearGradient(x, 0, x + fw, 0);
      g.addColorStop(0, C.hpWarm);
      g.addColorStop(1, C.hpHot);
      ctx.fillStyle = g;
    }

    ctx.beginPath();
    ctx.roundRect(x, y, fw, h, Math.min(h / 2, fw / 2));
    ctx.fill();

    // ไฮไลต์บนให้ดูเป็นแก้วมีน้ำอยู่ข้างใน แทนที่จะเป็นแถบแบน
    if (fw > 14) {
      ctx.globalAlpha *= 0.34;
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.roundRect(x + 5, y + 4, fw - 10, 5, 2.5);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
  drawCatBadge(ctx, x - 10, y + h / 2, badgeR);

  ctx.restore();
}
