// src/bonus-layouts.js
// ─────────────────────────────────────────────────────────────
// ฉากฟ้าโบนัส (เก็บตัวอักษรครบ → ปลาทองพาขึ้นฟ้า) — แนวของกิน แม่เหล็ก และระยะบิน
//
// ── ทำไมแยกออกมาจาก game.js ──
// หน้าออกแบบด่าน (editor.html) มีท่อนโบนัสให้วางของกินบนฟ้าเอง แล้วต้องรู้ตัวเลขชุดเดียวกับเกมเป๊ะ:
// แนวของกินเริ่มตรงไหน บินได้ไกลแค่ไหน แม่เหล็กอยู่ตรงไหน ถ้าหน้านั้นคิดเองซ้ำ
// วันที่มีคนปรับจังหวะโบนัสใน config.js ตัวเลขสองฝั่งจะเพี้ยนจากกันเงียบ ๆ
// ไฟล์นี้ไม่มีโค้ดวาดและไม่รู้จัก Game — เป็นข้อมูลกับสูตรล้วน ทั้งสองฝั่งจึงเรียกได้
// ─────────────────────────────────────────────────────────────
import { BONUS, BONUS_MAGNET, LEVEL, VIEW, PLAYER_X } from './config.js';

/**
 * แบบจัดวางของกินบนฟ้าที่ออกแบบเอง — ทำจากหน้าออกแบบด่าน (ท่อนโบนัส) แล้วส่งออกมาวางต่อท้ายที่นี่
 *
 *   { name: 'ชื่อแบบ', treats: [[x, y, 'ชนิด'], ...] }
 *   x = ระยะนับจากจุดเริ่มบิน (ตำแหน่งแมวตอนเริ่มลอย) · y = ความสูงบนจอ (0 = ขอบบน)
 *   ชนิด = 'jelly' | 'fish' | 'kibble' | 'shrimp' | 'crystal' (ดู TREATS ใน config.js)
 *
 * มีหลายแบบ = สุ่มหยิบหนึ่งแบบต่อหนึ่งรอบโบนัส · ยังไม่มีเลย = ใช้แนวคลื่นสามเลนแบบเดิม
 * เกมจึงไม่พังระหว่างที่ยังไม่ได้ออกแบบ และเพิ่มแบบใหม่ได้ทีละแบบโดยไม่ต้องแก้โค้ดอื่น
 */
export const BONUS_LAYOUTS = [];

/**
 * ระยะต่าง ๆ ของฉากฟ้า นับจาก bonusCam ตอนเริ่มโบนัส
 *   fieldAt  จุดเริ่มแนวของกิน = ตำแหน่งแมวตอนเริ่มบินพอดี (ช่วงรับแมวกล้องนิ่ง จึงนับแค่ช่วงทะยาน)
 *   catAt    ตำแหน่งแมวในโลกตอนเริ่มโบนัส (ใช้วางแม่เหล็ก)
 *   span     ความยาวที่ปูของไว้ — เผื่อเกินระยะบินไว้หนึ่งจอ ขอบขวาจะได้ไม่ว่าง
 *   flyLen   ระยะที่แมวบินผ่านจริง นับจาก fieldAt — ของที่วางเลยจุดนี้เก็บไม่ได้
 *            (โลกเลื่อนเฉพาะช่วงทะยานกับช่วงบิน ดู worldMoves ใน Game.updateBonus)
 */
export function bonusGeometry(speed) {
  const flyFrames = BONUS.frames - BONUS.catchFrames - BONUS.riseFrames - BONUS.fallFrames - BONUS.leaveFrames;
  return {
    fieldAt: BONUS.riseFrames * speed + 200,
    catAt: PLAYER_X,
    span: speed * BONUS.frames + VIEW.W,
    flyLen: flyFrames * speed,
  };
}

/**
 * ปูของกินบนฟ้าสำหรับโหมดโบนัส
 *
 * มีแบบที่ออกแบบไว้ (BONUS_LAYOUTS) = สุ่มหยิบมาหนึ่งแบบ
 * ไม่มี = แนวคลื่นสามเลนแบบเดิม: สามเลนสลับกันเป็นเกลียว ผู้เล่นจึงต้องขยับขึ้นลงตลอด
 * ระยะห่าง 50px เลือกมาจากงบคะแนน: ทั้งโบนัสให้ราวสองถึงสามเท่าของรอบเล่นปกติ
 * ถ้าถี่กว่านี้คะแนนจากโบนัสจะกลบคะแนนจากการเล่นจริงจนสถิติไม่มีความหมาย
 */
export function buildBonusField(startX, span, layouts = BONUS_LAYOUTS) {
  if (layouts.length) {
    const L = layouts[Math.floor(Math.random() * layouts.length)];
    return L.treats
      .filter(([x]) => x < span)
      .map(([x, y, kind]) => ({ x: startX + x, y, r: LEVEL.fishR, got: false, kind }));
  }

  const out = [];
  let i = 0;
  for (let x = startX; x < startX + span; x += BONUS.colGap, i++) {
    // เติมครบทั้งสามเลนทุกคอลัมน์ ไม่ใช่สลับกันทีละเลน — ของจึงแน่นเต็มฟ้า
    // แต่ละเลนแกว่งคนละเฟส เลนจึงไขว้กันไปมา ผู้เล่นต้องขยับหาจุดที่คุ้มที่สุด
    // ไม่ใช่เลือกเลนเดียวแล้วลอยนิ่งยาว ๆ
    for (let lane = 0; lane < 3; lane++) {
      const y = 118 + lane * BONUS.laneGap
        + Math.sin(x / 250 + lane * 2.1) * BONUS.waveAmp * 0.5;

      // ให้ปลาเป็นส่วนใหญ่ เม็ดกลมรองลงมา กุ้งนาน ๆ ที
      // ถ้าเทเม็ดแพงลงมาหมด คะแนนโบนัสจะกลบคะแนนจากการเล่นจริงจนสถิติไม่มีความหมาย
      const n = i * 3 + lane;
      const kind = n % 17 === 8 ? 'shrimp' : (n % 4 === 2 ? 'kibble' : 'fish');
      out.push({ x, y, r: LEVEL.fishR, got: false, kind });
    }
  }
  return out;
}

/**
 * โปรยแม่เหล็กทั่วสนามโบนัส
 * catX = ตำแหน่งตัวแมวในพิกัดโลก ณ วินาทีที่เริ่มโบนัส
 */
export function buildBonusMagnets(catX, span, speed) {
  const lanes = [118, 186, 254];   // ระดับเดียวกับสามเลนของแนวอาหาร

  // ลูกแรกอยู่ถัดจากจุดเริ่มลอยเล็กน้อย ไม่ใช่ระหว่างช่วงทะยานขึ้นแล้ว
  // คำนวณจากค่าใน BONUS ตรง ๆ เผื่อมีคนไปปรับจังหวะฉากแล้วลืมแก้ตรงนี้
  const firstAt = (BONUS.catchFrames + BONUS.riseFrames) * speed + BONUS_MAGNET.afterFly;
  const out = [{ x: catX + firstAt, y: lanes[1], r: BONUS_MAGNET.r, got: false }];

  let i = 0;
  const from = catX + firstAt + BONUS_MAGNET.gap;
  for (let x = from; x < catX + span; x += BONUS_MAGNET.gap, i++) {
    out.push({ x, y: lanes[i % 3], r: BONUS_MAGNET.r, got: false });
  }
  return out;
}
