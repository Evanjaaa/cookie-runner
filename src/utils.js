// src/utils.js

/** ตรวจว่าสี่เหลี่ยมสองอันซ้อนกันไหม (AABB collision) */
export function rectHit(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * ลากของชิ้นหนึ่งเข้าหาจุด (tx,ty) แบบมีแรงเฉื่อย
 *
 * วิธีเดิมคือ "ขยับตามสัดส่วนระยะที่เหลือ" ซึ่งมีปัญหาสองอย่างพร้อมกัน:
 *   1 เร็วตอนอยู่ไกล แล้วช้าลงเรื่อย ๆ ตอนใกล้จะถึง — กลับด้านกับที่ควรรู้สึก
 *   2 ทิศทางถูกเซ็ตใหม่ทุกเฟรมเป็นเส้นตรงเข้าหาเป้า ของที่กำลังร่วงอยู่
 *     จึงหักศอกทันทีที่เข้าระยะ เห็นเป็นรอยหักชัดเจน
 *
 * ตัวนี้แก้ทั้งสอง:
 *   - ความเร็วเป้าหมายไล่ขึ้นแบบกำลังสองเมื่อเข้าใกล้ ของจึงพุ่งเข้าตอนท้าย
 *   - ความเร็วจริงค่อย ๆ หันเข้าหาความเร็วเป้าหมาย ไม่สแนป เส้นทางเลยโค้ง
 *
 * เก็บความเร็วไว้บนตัวของเองเป็น mvx/mvy (ตั้งชื่อไม่ให้ชนกับ vy ของเม็ดที่ร่วงอยู่)
 * ครั้งแรกเริ่มที่ความเร็วพื้นทันที ไม่ให้ของที่อยู่ข้างหลังโดนกล้องทิ้งช่วงกำลังเร่ง
 *
 * base  ความเร็วขั้นต่ำ ต้องมากกว่าความเร็วกล้องเสมอ
 * rush  ความเร็วที่บวกเพิ่มตอนจ่อตัว
 * turn  หักเลี้ยวได้กี่ส่วนต่อเฟรม ยิ่งน้อยยิ่งโค้งกว้าง
 */
export function seek(item, tx, ty, d, cfg, dt) {
  const ux = (tx - item.x) / d;
  const uy = (ty - item.y) / d;

  if (item.mvx === undefined) {
    item.mvx = ux * cfg.base;
    item.mvy = uy * cfg.base;
    // ล็อกค่าสุ่มรายชิ้นไว้ตั้งแต่เฟรมแรกที่ถูกจับ
    //
    // ทั้งทิศวนและความเร็วส่วนตัวคิดจาก item.x ซึ่งเปลี่ยนทุกเฟรมระหว่างบิน
    // ถ้าคำนวณใหม่เรื่อย ๆ ทิศวนจะพลิกซ้ายขวากลับไปมาและความเร็วจะไหลขึ้นลงเอง
    // กลายเป็นสั่นแทนที่จะโค้งลื่น แถมผลลัพธ์ยังเพี้ยนตามอัตราเฟรมของเครื่องด้วย
    item.msw = Math.sin(item.x * 0.11) < 0 ? -1 : 1;
    item.mrnd = Math.sin(item.x * 0.07);
  }

  const near = 1 - Math.min(1, d / cfg.range);

  // vary: ผสมความต่างรายชิ้นจากพิกัดของมันเอง (คงที่ตลอดอายุของชิ้นนั้น)
  // ของเป็นกองใหญ่จึงไม่เคลื่อนเป็นก้อนเดียวกันแข็ง ๆ
  const jitter = cfg.vary ? 1 + item.mrnd * cfg.vary : 1;
  const target = (cfg.base + near * near * cfg.rush) * jitter;

  // swirl: บิดทิศให้เฉียงออกจากแนวตรงนิดหน่อย แล้วจางลงเมื่อเข้าใกล้
  // ของจึงวนเข้าเป็นก้นหอย ไม่ใช่พุ่งตรงเป๊ะเหมือนกันทุกชิ้น
  let dx = ux;
  let dy = uy;
  if (cfg.swirl) {
    const s = cfg.swirl * (1 - near) * item.msw;
    dx = ux - uy * s;
    dy = uy + ux * s;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
  }

  // ease: ที่ขอบระยะดูดยังหักเข้าไม่ได้เลย แล้วค่อย ๆ หักแรงขึ้นเมื่อเข้ามา
  // กันอาการของทั้งแถวกระตุกเปลี่ยนทิศพร้อมกันตอนแตะเส้นขอบพอดี
  const ramp = cfg.ease ? Math.min(1, near / cfg.ease) : 1;

  // แปลงอัตราต่อเฟรมให้เป็นต่อ dt จริง เกมจึงรู้สึกเท่ากันทุกอัตราเฟรม
  const k = 1 - Math.pow(1 - cfg.turn * ramp, dt);
  item.mvx += (dx * target - item.mvx) * k;
  item.mvy += (dy * target - item.mvy) * k;

  item.x += item.mvx * dt;
  item.y += item.mvy * dt;
}

export function randInt(n) {
  return Math.floor(Math.random() * n);
}

export function pick(arr) {
  return arr[randInt(arr.length)];
}
