// src/render/hud.js
import { VIEW, SCORING, HEALTH, WORD, COLORS as C } from '../config.js';
import { drawFish } from './entities.js';

const { W, H } = VIEW;

export function drawHUD(ctx, game) {
  // ทุกสีตัวอักษรมาจากจานสีของด่าน — ฟ้ากลางวันสว่างจนครีมอ่านไม่ออก
  const pal = game.pal;

  ctx.save();
  ctx.textBaseline = 'top';

  ctx.globalAlpha = 0.62;
  ctx.font = "500 11px 'IBM Plex Sans Thai', sans-serif";
  ctx.fillStyle = pal.ink;
  ctx.fillText('คะแนน', 24, 22);
  ctx.fillText('ระยะทาง', 150, 22);
  ctx.globalAlpha = 1;

  // เม็ดละ 1000 คะแนนแล้ว เลขโตเร็วมาก ใส่คอมมาไม่งั้นอ่านไม่ทันตอนวิ่ง
  ctx.font = '600 24px Mitr, sans-serif';
  ctx.fillText(game.score.toLocaleString('en-US'), 24, 36);

  ctx.font = '600 20px Mitr, sans-serif';
  ctx.fillText(Math.floor(game.distance / SCORING.pxPerMeter) + ' ม.', 150, 39);

  // ค่าขนมเปียก — คะแนนสะสมจากของกินทุกชนิดรวมกัน ไม่ใช่จำนวนเม็ด
  // ชิดขวาเพราะตัวเลขยาวขึ้นเรื่อย ๆ ถ้าชิดซ้ายจะงอกไปทับหลอดพลังกลางจอ
  const treatText = game.treat.toLocaleString('en-US');

  ctx.textAlign = 'right';

  ctx.globalAlpha = 0.62;
  ctx.font = "500 11px 'IBM Plex Sans Thai', sans-serif";
  ctx.fillStyle = pal.ink;
  ctx.fillText('ค่าขนมเปียก', W - 24, 22);
  ctx.globalAlpha = 1;

  ctx.font = '600 20px Mitr, sans-serif';
  ctx.fillStyle = pal.accent;
  ctx.fillText(treatText, W - 24, 37);

  // วัดความกว้างด้วยฟอนต์เดียวกับที่เพิ่งวาด แล้วเอาไอคอนไปวางชิดซ้ายของตัวเลข
  // โชว์ทั้งสองชนิด ให้เห็นว่าเลขนี้นับรวมทั้งปลาและเม็ดกลม
  // กุ้งวาดที่ขนาดปกติตรงนี้ ไม่ต้องคูณ SHRIMP.scale เหมือนในด่าน
  // เพราะแถวไอคอนต้องดูสูงเท่ากันหมด ไม่ใช่โชว์ขนาดจริง
  // ไอคอนเดียวพอ — เลขนี้คือคะแนนรวมของกินทุกชนิด ไม่ใช่จำนวนปลา
  // ใช้ปลาเป็นตัวแทนเพราะเป็นของที่เจอบ่อยที่สุดและสีตัดกับพื้นหลังชัดที่สุด
  drawFish(ctx, W - 40 - ctx.measureText(treatText).width, 47, 10);

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
 * แถบสะสมตัวอักษร SPEEDCAT — วางชิดซ้ายใต้คะแนน เหมือนที่คุกกี้รันทำ
 * ตัวที่ยังไม่ได้เก็บวาดเป็นโครงจาง ๆ ไม่ใช่ซ่อนไว้
 * เพราะผู้เล่นต้องเห็นตั้งแต่ต้นว่าเป้าหมายคือกี่ตัว ไม่งั้นไม่รู้ว่าต้องเก็บอะไรอยู่
 */
function drawWord(ctx, game) {
  const pal = game.pal;
  const size = 19;
  const gap = 3.5;
  const x0 = 24;
  const y = 68;

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
  ctx.roundRect((W - w) / 2, 62, w, 30, 15);
  ctx.fill();

  ctx.fillStyle = C.letterLite;
  ctx.fillText(label, W / 2, 68);
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
  const label = 'ขวดพลังมาแล้ว! กระโดดเก็บให้ทัน';
  const w = ctx.measureText(label).width + 28;

  ctx.fillStyle = game.pal.noticeBg;
  ctx.beginPath();
  ctx.roundRect((W - w) / 2, 66, w, 26, 13);
  ctx.fill();

  ctx.fillStyle = C.danger;
  ctx.fillText(label, W / 2, 71);

  ctx.restore();
}

/** หลอดพลังกลางจอบน — ตัวเดียวที่ผู้เล่นต้องจ้องตลอดเวลา เลยวางไว้กลาง */
function drawHealthBar(ctx, game) {
  const pal = game.pal;
  const w = 300;
  const h = 16;
  const x = (W - w) / 2;
  const y = 38;
  const p = Math.max(0, Math.min(1, game.hp / HEALTH.max));
  const low = p <= HEALTH.lowAt;

  ctx.save();
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';

  ctx.globalAlpha = 0.62;
  ctx.font = "500 11px 'IBM Plex Sans Thai', sans-serif";
  ctx.fillStyle = pal.ink;
  ctx.fillText('พลัง', W / 2, 22);
  ctx.globalAlpha = 1;

  // ขอบนอกกับราง
  ctx.fillStyle = pal.railBack;
  ctx.beginPath(); ctx.roundRect(x - 3, y - 3, w + 6, h + 6, (h + 6) / 2); ctx.fill();
  ctx.fillStyle = pal.rail;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();

  const fw = w * p;
  if (fw > 0.5) {
    // กะพริบเฉพาะตอนใกล้หมด ให้รู้ตัวโดยไม่ต้องละสายตาจากตัวละคร
    ctx.globalAlpha = low ? 0.55 + Math.sin(game.tick * 0.28) * 0.45 : 1;
    ctx.fillStyle = low ? C.danger : C.mint;
    ctx.beginPath();
    ctx.roundRect(x, y, fw, h, Math.min(h / 2, fw / 2));
    ctx.fill();

    // ไฮไลต์บนให้ดูเป็นหลอดแก้วแทนที่จะเป็นแถบแบน
    if (fw > 10) {
      ctx.globalAlpha *= 0.32;
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.roundRect(x + 4, y + 3.5, fw - 8, 4, 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
