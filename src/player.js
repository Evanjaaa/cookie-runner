// src/player.js
import { GROUND_Y, PLAYER_X, PHYSICS, BODY, VIEW } from './config.js';

/** เอียงเกือบ 90° = นอนตะแคง ไม่เอาให้ถึง 90 เป๊ะเพราะดูแข็งเกินไป */
const FAINT_TILT = Math.PI / 2 * 0.94;
/** ระยะที่ตัวต้องจมลงตอนล้มสุด เพื่อให้ลำตัวแนบพื้นแทนที่จะลอย */
const FAINT_DROP = 9;

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
    this.fainting = false;
    this.faintV = 0;
  }

  /**
   * ท่าเป็นลม: ล้มพับลงนอนกับพื้นตรงจุดที่ยืนอยู่
   * ใช้ตอนพลังหมด ต่างจากตอนตกหลุมที่ต้องปลิวหมุนตกจอไป
   */
  faint() {
    this.fainting = true;
    this.sliding = false;   // ถ้ากดหมอบค้างอยู่ ท่าหมอบหมุนแล้วดูประหลาด
    this.slideHeld = false;
    this.vy = 0;
    this.y = GROUND_Y;
    this.tilt = 0;
    this.faintV = 0;
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
    // ระหว่างใช้ความสามารถ ถือว่ามีพื้นตลอด เดินข้ามหลุมได้เหมือนไม่มีหลุม
    const overPit = !game.skillOn && game.level.isOverPit(centerWorldX);

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
    const wasSliding = this.sliding;
    this.sliding = this.slideHeld && this.onGround;

    // ยิงเฉพาะจังหวะที่ "เริ่มหมอบจริง" ไม่ใช่ทุกเฟรมที่กดค้าง
    // และไม่ใช่ตอนกดกลางอากาศ ซึ่งยังหมอบไม่ได้จนกว่าจะแตะพื้น
    const justSlid = this.sliding && !wasSliding;

    return { justLanded, justSlid, fellOut: this.y > VIEW.H + 100 };
  }

  updateDead(dt) {
    if (this.fainting) {
      // ล้มแบบเร่งความเร็ว เหมือนของที่เสียหลักแล้วล้มจริง ไม่ใช่หมุนคงที่
      this.faintV = Math.min(0.34, this.faintV + 0.022 * dt);
      this.tilt = Math.min(FAINT_TILT, this.tilt + this.faintV * dt);
      // ยิ่งเอียงยิ่งจมลง ให้ลำตัวไปแนบพื้นพอดีตอนเอียงสุด
      // ต้องชดเชยเพราะการหมุนใช้กลางกล่องชนเป็นแกน ถ้าไม่ขยับจะลอยเหนือพื้น
      this.y = GROUND_Y + (this.tilt / FAINT_TILT) * FAINT_DROP;
      return;
    }

    // ตกหลุม: ปลิวขึ้นแล้วหมุนตกจอไป
    this.vy += PHYSICS.gravity * dt;
    this.y += this.vy * dt;
    this.tilt += 0.09 * dt;
  }
}
