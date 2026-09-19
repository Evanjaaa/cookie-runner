// src/gate-run.js
// ─────────────────────────────────────────────────────────────
// ตัวเดินจังหวะทางเข้าด่านหนึ่งครั้ง (TransitionManager) — สร้างใหม่ทุกครั้งที่เปลี่ยนฉากผ่านทางเข้า
//
// ลำดับขั้น (อิงตำแหน่งแมวในพิกัดโลก ไม่อิงเวลา — ติดสปีดหรือเฟรมตกก็ยังตรงตำแหน่งเสมอ):
//   approach   ยังอยู่นอกอาคาร เห็นอาคาร/ประตู แสงอุ่นจากประตูเข้มขึ้นเมื่อเข้าใกล้
//   inside     แมวผ่านประตูแล้ว → ผนังหน้าอาคารจางหาย เห็นข้างใน / เริ่มเตรียมฉากทีละขั้นต่อเฟรม
//   activated  จอถูกปิดเต็ม + เตรียมครบ → สลับฉากจริง (ผู้เล่นมองไม่เห็นข้างนอกในเฟรมนั้น)
//   done       กล้องพ้นตัวอาคารไปแล้ว → Game ทิ้งอ็อบเจกต์นี้
//
// ตัวนี้ไม่แตะ Game เอง แค่ "ตอบ" ว่าถึงเวลาสลับหรือยัง Game เป็นคนสลับ (ดู Game.updateGate)
// ─────────────────────────────────────────────────────────────
import { PLAYER_X, VIEW } from './config.js';

/**
 * ระยะที่ต้องเลี้ยงทางเข้าไว้ต่อ "หลังกล้องพ้นตัวอาคารแล้ว"
 *
 * ── ทำไมไม่ใช่ 40 เหมือนเดิม ──
 * ไฟล์ภาพของทางเข้าทุกอันวาดต่อไปจนกล้องเลยขอบขวาของอาคารไปอีก 80–200px
 * (ดูเงื่อนไขตัดการวาดในแต่ละไฟล์ของ render/gates/) แต่ของเดิมทิ้งอ็อบเจกต์นี้ที่ 40
 * ภาพของทางเข้าจึงถูกตัดหายกลางคันทุกครั้ง — และของในด่านที่ถูกอาคารบังอยู่
 * (ต้นมะพร้าว ร่มชายหาด แถบพื้น) ก็โผล่พรวดขึ้นมาพร้อมกันในเฟรมเดียว
 *
 * 240 = มากกว่าค่าที่ไกลที่สุดในบรรดาไฟล์ภาพ (200) เผื่อไว้อีกหน่อย
 * ปล่อยให้แต่ละไฟล์เป็นคนตัดสินเองว่าจะเลิกวาดตอนไหน ซึ่งมันทำอยู่แล้ว
 */
const ART_TAIL = 240;
import { gateMarks } from './gates.js';
import { ScenePreloader } from './scene-preload.js';

export class GateRun {
  /**
   * @param def   รายการใน GATES
   * @param x0    จุดเริ่มทางเข้าในพิกัดโลก (= nextChunkX ตอนตัดสินใจเปลี่ยนฉาก)
   * @param to    ฉากปลายทาง
   */
  constructor(def, x0, to) {
    this.def = def;
    this.to = to;
    this.m = gateMarks(def, x0);
    this.preload = new ScenePreloader(to);
    this.activated = false;
    this.lateSwitch = false;   // true = ต้องเร่งทำขั้นที่เหลือเพราะผู้เล่นเร็วเกินที่คำนวณไว้
    this.swing = 0;            // มุมบานประตูหน้า (0 ปิด → 1 เปิดสุด) ให้ภาพใช้
    this.swingOut = 0;         // บานประตูหลัง
  }

  /** ตำแหน่งตัวแมวในพิกัดโลก ณ กล้องนี้ */
  static px(camera) {
    return camera + PLAYER_X;
  }

  /**
   * เดินหนึ่งเฟรม — คืน true ถ้าเฟรมนี้คือเฟรมที่ต้องสลับฉาก
   * @param camera กล้องปัจจุบัน
   * @param dt     เวลาเฟรม (ใช้กับแอนิเมชันบานประตูเท่านั้น)
   */
  update(camera, dt) {
    const { m } = this;
    const px = camera + PLAYER_X;

    // บานประตูผลักเปิดเมื่อแมวเข้าใกล้ ปิดกลับช้า ๆ เมื่อผ่านไปแล้ว
    this.swing = approachDoor(this.swing, px, m.doorIn, dt);
    this.swingOut = approachDoor(this.swingOut, px, m.doorOut, dt);

    if (this.activated) return false;

    // เริ่มเตรียมฉากตั้งแต่แมวก้าวผ่านประตู — ทีละขั้นต่อเฟรม
    if (px >= m.doorIn) this.preload.step();

    const covered = camera >= m.coverFrom && camera <= m.coverTo;
    if (covered && this.preload.done) return this.activate();

    // เลยช่วงปิดจอไปแล้วแต่ยังเตรียมไม่ครบ (เร็วผิดปกติ) — จบให้ครบแล้วสลับทันที
    // ประตูหลังยังโผล่มาแค่ขอบจอ ผู้เล่นจึงแทบไม่มีทางเห็นข้างนอกก่อนสลับ
    if (camera > m.coverTo) {
      this.lateSwitch = true;
      this.preload.finish();
      return this.activate();
    }
    return false;
  }

  activate() {
    this.activated = true;
    return true;
  }

  /**
   * พ้นอาคารไปทั้งหลังแล้ว (รวมผนังหลังที่ยังเห็นอยู่ด้านซ้ายจอ)
   *
   * ทางเข้าบางอันมีภาพที่ต้องเล่นต่อหลังพ้นตัวอาคารไปไกลกว่าปกติมาก
   * (ทุ่งหิมะ: กองหิมะที่ร่วงลงมาบังรอยต่อแล้วค่อยละลาย) จึงตั้ง artTail เองได้
   * ตัวอ็อบเจกต์นี้ต้องอยู่ต่อจนภาพนั้นจบ ไม่งั้นมันจะถูกทิ้งกลางอนิเมชัน
   */
  isDone(camera) {
    return camera > this.m.houseR + (this.def.artTail ?? ART_TAIL);
  }

  /** ตัวแมวอยู่ช่วงไหนของทางเข้า — ภาพใช้ตัดสินใจว่าจะโชว์ผนังหน้า/ข้างใน */
  view(camera, tick) {
    return gateViewAt(this.m, camera, tick, camera + PLAYER_X, this.swing, this.swingOut);
  }
}

/**
 * สูตรมุมมองของทางเข้า ณ ตำแหน่งแมว px — หน้าออกแบบด่านเรียกตัวเดียวกันนี้
 * ภาพในหน้าออกแบบจึงจางผนัง/เปิดประตูตรงจังหวะเดียวกับเกมจริงเป๊ะ
 */
export function gateViewAt(m, camera, tick, px, swing = 0, swingOut = 0) {
  return {
    m,
    camera,
    tick,
    px,
    swing,
    swingOut,
    // ผนังหน้า: เต็มตอนอยู่ข้างนอก → จางหายภายใน 110px หลังก้าวผ่านประตู
    facadeIn: 1 - clamp01((px - m.doorIn - 10) / 110),
    // ผนังหลัง (มองจากฝั่งฉากใหม่): กลับมาทึบภายใน 110px หลังออกประตูหลัง
    facadeOut: clamp01((px - m.doorOut - 30) / 110),
    // ความคืบหน้าข้างใน 0 → 1 ใช้ไล่บรรยากาศจากแสงอุ่นไปทางกลางคืน
    inside: clamp01((px - m.doorIn) / (m.doorOut - m.doorIn)),
    // เข้าใกล้ประตูหน้า 0 → 1 (หนึ่งจอก่อนถึง) — แสงจากประตูเข้มขึ้น
    near: clamp01(1 - (m.doorIn - px) / VIEW.W),
  };
}

/** บานประตูเปิดไหม ณ ตำแหน่งนี้ (ไม่มีแอนิเมชัน) — ใช้ในหน้าออกแบบ */
export function doorOpenAt(px, doorX) {
  return px > doorX - 90 && px < doorX + 60 ? 1 : 0;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** บานประตู: เปิดไวเมื่อแมวอยู่ในระยะ 90px หน้าประตูถึง 60px หลังประตู แล้วค่อย ๆ ปิดกลับ */
function approachDoor(cur, px, doorX, dt) {
  const want = px > doorX - 90 && px < doorX + 60 ? 1 : 0;
  const k = want > cur ? 0.35 : 0.06;
  return cur + (want - cur) * Math.min(1, k * dt);
}
