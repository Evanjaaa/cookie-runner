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

    // ── ค่าสำหรับแอนิเมชันล้วน ๆ ไม่แตะฟิสิกส์หรือกล่องชนเลยสักตัว ──
    // ต้องเก็บไว้ที่ตัวละคร ไม่ใช่คำนวณในโค้ดวาด เพราะทั้งสองค่านี้เป็น
    // "ค่าที่ไล่ตามค่าเมื่อกี้" ซึ่งโค้ดวาดทำไม่ได้ มันถูกเรียกใหม่ทุกเฟรมโดยไม่มีความจำ
    this.squash = 0;    // + = แบนกว้าง (ลงพื้น), - = ยืดสูง (ถีบขึ้น)
    this.tailLag = 0;   // หางที่ไล่ตามตัวช้ากว่าจริง
    this.gaitK = 1;     // ตัวคูณจังหวะเดิน เกมตั้งให้ตอนร่างยักษ์ที่เดินช้าลง
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
      // ยืดตัวตอนถีบขึ้น — ไม่มีท่าย่อก่อนกระโดด (anticipation) โดยตั้งใจ
      // เพราะท่าย่อต้องหน่วงการกระโดดจริงไว้สองสามเฟรม ซึ่งในเกมวิ่งหลบ
      // คือการทำให้ปุ่มหนืด ผู้เล่นจะรู้สึกทันทีว่ากดแล้วไม่ขึ้น
      this.squash = -0.9;
      return 'single';
    }
    if (this.jumps === 1) {
      this.vy = PHYSICS.doubleJumpV;
      this.jumps = 2;
      this.squash = -0.7;   // ชั้นสองเบากว่า ยืดน้อยกว่าตามแรงที่น้อยกว่า
      return 'double';
    }
    return null;
  }

  setSlide(on) {
    this.slideHeld = on;
    if (on && !this.onGround && this.vy < 0) this.vy = PHYSICS.fastFallV;
  }

  update(dt, game) {
    // เก็บความเร็วตกไว้ก่อน เพราะเดี๋ยวมันถูกล้างเป็นศูนย์ตอนแตะพื้น
    // แต่เราต้องใช้มันวัดว่า "ลงแรงแค่ไหน" หลังจากนั้น
    const impactV = this.vy;

    this.vy += PHYSICS.gravity * dt;
    this.y += this.vy * dt;
    this.runPhase += game.speed * dt * 0.06;

    // สปริงคลายกลับหาศูนย์ทุกเฟรม ตัวดันให้ยืด/แบนคือ jump() กับจังหวะลงพื้น
    this.squash += (0 - this.squash) * 0.16 * dt;

    const centerWorldX = PLAYER_X + BODY.standW / 2 + game.camera;
    // ระหว่างใช้ความสามารถหรือติดสปีด ถือว่ามีพื้นตลอด วิ่งข้ามหลุมได้เหมือนไม่มีหลุม
    // ถามผ่าน pitsSolid จุดเดียว ตัวละครจึงไม่ต้องรู้ว่ามีกี่อย่างที่ทำให้หลุมหาย
    const overPit = !game.pitsSolid && game.level.isOverPit(centerWorldX);

    let justLanded = false;

    // ต้อง "เพิ่งข้ามเส้นพื้นในเฟรมนี้" ถึงจะยืนได้ (ต้นเฟรมยังอยู่เหนือพื้น)
    // ถ้าเช็คแค่ y >= GROUND_Y แมวที่ร่วงลงหลุมไปลึกแล้วจะเด้งกลับขึ้นมายืน
    // บนขอบหลุมฝั่งตรงข้ามทันทีที่พ้นช่วง x ของหลุม หลุมแคบจึงไม่อันตรายเลย
    // เทียบกับ vy เพราะ y ต้นเฟรมคือ y ปัจจุบันลบระยะที่เพิ่งตกไปในเฟรมนี้
    const crossedGroundNow = this.y - this.vy * dt <= GROUND_Y;

    if (!overPit && this.y >= GROUND_Y && crossedGroundNow) {
      if (!this.onGround) {
        justLanded = true;
        // ตกแรงแค่ไหนแบนแค่นั้น มีเพดานกันไม่ให้ตกจากที่สูงมากแล้วแบนเป็นแพนเค้ก
        this.squash = Math.min(0.85, 0.28 + impactV * 0.03);
      }
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

    // ── หางไล่ตามตัว ──
    // เป้าหมายคือคลื่นของท่าวิ่ง แต่หางวิ่งตามช้ากว่า พอตัวหยุดหางจึงยังแกว่งต่ออีกพัก
    // (follow-through) นี่คือสิ่งที่ทำให้หางดูมีน้ำหนักของตัวเอง แทนที่จะติดแน่นกับก้น
    // ตอนลอยอยู่กลางอากาศหางชี้สวนทางที่กำลังเคลื่อน = ใช้หางถ่วงสมดุล
    const tailTarget = this.onGround
      ? Math.sin(this.runPhase * this.gaitK * 2 + 0.9)
      : Math.max(-1.4, Math.min(1.4, -this.vy * 0.05));
    this.tailLag += (tailTarget - this.tailLag) * 0.2 * dt;

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
