// src/player.js
import { GROUND_Y, PLAYER_X, PHYSICS, BODY, VIEW } from './config.js';

// ─────────────────────────────────────────────────────────────
// สำคัญ: this.y คือ "ตำแหน่งเท้า" ไม่ใช่ขอบบนของตัว
// เพราะเท้าอยู่ที่เดิมเสมอไม่ว่าจะยืนหรือหมอบ
// ถ้าเก็บเป็นขอบบน พอหมอบแล้วความสูงเปลี่ยน การเช็คพื้นจะพังทันที
// ─────────────────────────────────────────────────────────────

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.y = GROUND_Y;
    this.vy = 0;
    this.onGround = true;
    this.jumps = 0;
    this.sliding = false;
    this.slideHeld = false;
    this.runPhase = 0;
    this.tilt = 0;
  }

  get width() { return this.sliding ? BODY.slideW : BODY.standW; }
  get height() { return this.sliding ? BODY.slideH : BODY.standH; }

  /** กล่องชน (พิกัดหน้าจอ ยังไม่บวก camera) */
  get box() {
    const w = this.width;
    const h = this.height;
    return {
      x: PLAYER_X + (this.sliding ? BODY.slideOffsetX : 0),
      y: this.y - h,
      w,
      h,
    };
  }

  /** คืน 'single' | 'double' | null เพื่อให้ผู้เรียกไปเล่นเสียง/เอฟเฟกต์ต่อ */
  jump() {
    if (this.jumps === 0) {
      this.vy = PHYSICS.jumpV;
      this.jumps = 1;
      this.onGround = false;
      this.sliding = false;
      return 'single';
    }
    if (this.jumps === 1) {
      this.vy = PHYSICS.doubleJumpV;
      this.jumps = 2;
      return 'double';
    }
    return null;
  }

  setSlide(on) {
    this.slideHeld = on;
    if (on && !this.onGround && this.vy < 0) this.vy = PHYSICS.fastFallV;
  }

  update(dt, game) {
    this.vy += PHYSICS.gravity * dt;
    this.y += this.vy * dt;
    this.runPhase += game.speed * dt * 0.06;

    const centerWorldX = PLAYER_X + BODY.standW / 2 + game.camera;
    const overPit = game.level.isOverPit(centerWorldX);

    let justLanded = false;

    // ต้อง "เพิ่งข้ามเส้นพื้นในเฟรมนี้" ถึงจะยืนได้ (ต้นเฟรมยังอยู่เหนือพื้น)
    // ถ้าเช็คแค่ y >= GROUND_Y แมวที่ร่วงลงหลุมไปลึกแล้วจะเด้งกลับขึ้นมายืน
    // บนขอบหลุมฝั่งตรงข้ามทันทีที่พ้นช่วง x ของหลุม หลุมแคบจึงไม่อันตรายเลย
    // เทียบกับ vy เพราะ y ต้นเฟรมคือ y ปัจจุบันลบระยะที่เพิ่งตกไปในเฟรมนี้
    const crossedGroundNow = this.y - this.vy * dt <= GROUND_Y;

    if (!overPit && this.y >= GROUND_Y && crossedGroundNow) {
      if (!this.onGround) justLanded = true;
      this.y = GROUND_Y;
      this.vy = 0;
      this.onGround = true;
      this.jumps = 0;
    } else {
      this.onGround = false;
      if (this.jumps === 0) this.jumps = 1;   // เดินตกหลุม = เสียสิทธิ์กระโดดแรก
    }

    // หมอบได้เฉพาะตอนแตะพื้น แต่กดค้างรอไว้ตั้งแต่กลางอากาศได้
    this.sliding = this.slideHeld && this.onGround;

    return { justLanded, fellOut: this.y > VIEW.H + 100 };
  }

  /** ตอนตาย: ปลิวขึ้นแล้วหมุนตกจอ */
  updateDead(dt) {
    this.vy += PHYSICS.gravity * dt;
    this.y += this.vy * dt;
    this.tilt += 0.09 * dt;
  }
}
