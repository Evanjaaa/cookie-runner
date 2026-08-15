// src/render/hud.js
import { VIEW, SCORING, HEALTH, COLORS as C } from '../config.js';
import { drawFish } from './entities.js';

const { W, H } = VIEW;

export function drawHUD(ctx, game) {
  ctx.save();
  ctx.textBaseline = 'top';

  ctx.globalAlpha = 0.62;
  ctx.font = "500 11px 'IBM Plex Sans Thai', sans-serif";
  ctx.fillStyle = C.cream;
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
  ctx.fillStyle = C.cream;
  ctx.fillText('ค่าขนมเปียก', W - 24, 22);
  ctx.globalAlpha = 1;

  ctx.font = '600 20px Mitr, sans-serif';
  ctx.fillStyle = C.fishLite;
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

  drawHealthBar(ctx, game);

  if (game.notice > 0) drawNotice(ctx, game);

  // แฟลชแดงทั้งจอตอนโดนชน วาดท้ายสุดเพื่อให้ทับทุกอย่าง
  if (game.hurtFlash > 0) {
    ctx.fillStyle = `rgba(255,92,110,${0.3 * game.hurtFlash})`;
    ctx.fillRect(0, 0, W, H);
  }
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

  ctx.fillStyle = 'rgba(27,15,43,.72)';
  ctx.beginPath();
  ctx.roundRect((W - w) / 2, 66, w, 26, 13);
  ctx.fill();

  ctx.fillStyle = C.danger;
  ctx.fillText(label, W / 2, 71);

  ctx.restore();
}

/** หลอดพลังกลางจอบน — ตัวเดียวที่ผู้เล่นต้องจ้องตลอดเวลา เลยวางไว้กลาง */
function drawHealthBar(ctx, game) {
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
  ctx.fillStyle = C.cream;
  ctx.fillText('พลัง', W / 2, 22);
  ctx.globalAlpha = 1;

  // ขอบนอกกับราง
  ctx.fillStyle = 'rgba(27,15,43,.55)';
  ctx.beginPath(); ctx.roundRect(x - 3, y - 3, w + 6, h + 6, (h + 6) / 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,243,226,.14)';
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
