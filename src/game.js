// src/game.js
import {
  VIEW, GROUND_Y, PLAYER_X, SPEED, SCORING, SHIELD, HEALTH, POTION, SHRIMP, MAGNET,
  LEVEL, LETTER, WORD, BONUS, SKILL, SPEEDUP, BONUS_MAGNET, BONUS_PULL,
} from './config.js';
import { rectHit, seek } from './utils.js';
import { Player } from './player.js';
import { Level } from './level.js';
import { Particles } from './particles.js';
import { loadBest, saveBest } from './storage.js';
import { sfx } from './audio.js';
import { setMusicTrack } from './music.js';
import { drawSky, drawHills, drawGround } from './render/background.js';
import {
  drawObstacles, drawTreats, drawPlayer, drawShields, drawShieldRing, drawPotions,
  drawCatPose, drawFish, drawKibble, drawMagnets, drawSuction, drawLetters, drawClouds,
  drawBigFish,
  drawBonusSparkle,
  drawRain, drawSkillGauge, drawNips,
} from './render/entities.js';
import { getSkin } from './skins.js';
import { getStage } from './stages.js';
import { drawHUD } from './render/hud.js';
import { postProcess } from './render/post.js';

export const STATE = { READY: 0, RUN: 1, DEAD: 2, PAUSE: 3 };

/**
 * ปูของกินบนฟ้าสำหรับโหมดโบนัส
 *
 * สามเลนสลับกันเป็นเกลียว ผู้เล่นจึงต้องขยับขึ้นลงตลอด ไม่ใช่ลอยนิ่งรอเก็บ
 * ระยะห่าง 50px เลือกมาจากงบคะแนน: ทั้งโบนัสให้ราวสองถึงสามเท่าของรอบเล่นปกติ
 * ถ้าถี่กว่านี้คะแนนจากโบนัสจะกลบคะแนนจากการเล่นจริงจนสถิติไม่มีความหมาย
 */
function buildBonusField(startX, span) {
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

/**
 * ท่าว่างของแมวหน้าแรก — ยืนเฉย ๆ ครบ IDLE_GAP แล้วทำท่าหนึ่งท่า วนไปเรื่อย ๆ
 *
 * เรียงตามลำดับ ไม่สุ่ม เพราะสุ่มแล้วมีโอกาสออกท่าเดิมซ้ำติดกัน
 * ซึ่งอ่านเป็น "ค้าง" ไม่ใช่ "ทำท่า" ส่วนการวนตามลำดับรับประกันว่าเห็นครบทุกท่า
 *
 * hold นับรวมช่วงเปลี่ยนท่าเข้า-ออกด้วย จึงต้องมากกว่า IDLE_EASE * 2 เสมอ
 * ไม่งั้นท่าจะยังไม่ทันเข้าเต็มที่ก็ต้องคลายกลับแล้ว
 */
const IDLE_GAP = 180;    // 3 วินาทีที่ยืนเฉย ๆ ก่อนจะทำท่าถัดไป
const IDLE_EASE = 26;    // เฟรมที่ใช้ค่อย ๆ เข้าและออกจากท่า
const IDLE_HOLD = 300;   // ค้างท่าละ 5 วินาที (รวมช่วงเข้า-ออกแล้ว)
const IDLE_ACTS = [
  // หาวสั้นกว่าท่าอื่น — ปากอ้าค้างนานกว่านี้อ่านเป็นภาพค้าง ไม่ใช่การหาว
  // ส่วนท่าอื่นเป็นท่าพักอยู่แล้ว ค้างนานเท่าไหร่ก็ยังดูเป็นธรรมชาติ
  { pose: 'yawn', hold: 180 },          // หาว 3 วินาที
  { pose: 'sit', hold: IDLE_HOLD },     // นั่ง
  { pose: 'groom', hold: IDLE_HOLD },   // นั่งเลียอุ้งเท้า
  { pose: 'loaf', hold: IDLE_HOLD },    // หมอบเป็นก้อนขนมปัง
];

/** ของกินตกแต่งบนหน้าแรก พิกัดวัดจากเท้าตัวละคร (dx ไปขวา, dy ขึ้นบนเป็นลบ) */
const HOME_DECO = [
  { dx: -180, dy: -62 },
  { dx: -152, dy: -156, kibble: true },
  { dx: -92, dy: -238 },
  { dx: 104, dy: -206, kibble: true },
  { dx: 152, dy: -104 },
];

/**
 * แต่งแสงฉากหลังหน้าแรก
 *
 * เรียกก่อนวาดตัวละคร ทุกอย่างในนี้จึงลงบน "ฉากหลัง" อย่างเดียว
 * ตัวน้องแมวที่วาดทีหลังยังสว่างเต็มที่เสมอ
 *
 * ครั้งแรกเคยไล่สีให้ขอบซ้าย-ขวา-บนมืด แล้วมันอ่านเป็นคราบดำฟุ้งทับรูป เลยถอดออกไป
 * รอบนี้กลับมาใหม่แต่คนละทรง — ถ่วงน้ำหนักไปทางล่างแทนที่จะมืดเท่ากันทุกด้าน
 * ซึ่งเป็นทิศทางที่ตาคนอ่านว่า "แสงมาจากข้างบน" ไม่ใช่ "รูปเปื้อน"
 * และช่วยให้ปุ่มเล่นกับปุ่มกระโดด/หมอบที่ลอยอยู่มุมล่างมีพื้นเข้มรองรับ
 */
function dimForUi(ctx) {
  const { W, H } = VIEW;
  const INK = '18,7,30';

  // 1) หรี่เรียบบาง ๆ ทั้งผืน แค่พอกลบความจัดของสีให้เข้ากับโทนม่วงของเกม
  ctx.fillStyle = `rgba(${INK},.08)`;
  ctx.fillRect(0, 0, W, H);

  // 2) ขอบมืดนุ่ม — ยกจุดศูนย์กลางขึ้นไปเหนือกลางจอ (0.34H)
  //    ขอบล่างจึงอยู่ไกลจากศูนย์กลางกว่าขอบบน แล้วมืดกว่าเองโดยไม่ต้องวาดแยก
  const edge = ctx.createRadialGradient(W / 2, H * 0.34, H * 0.30, W / 2, H * 0.34, H * 1.15);
  edge.addColorStop(0, `rgba(${INK},0)`);
  edge.addColorStop(0.62, `rgba(${INK},.10)`);
  edge.addColorStop(1, `rgba(${INK},.46)`);
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, W, H);

  // 3) แถบล่างอีกชั้น เริ่มจากครึ่งจอลงไป ให้พื้นจมหายเข้าไปในกรอบแทนที่จะโดนตัดห้วน ๆ
  const floor = ctx.createLinearGradient(0, H * 0.52, 0, H);
  floor.addColorStop(0, `rgba(${INK},0)`);
  floor.addColorStop(1, `rgba(${INK},.42)`);
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, W, H);
}

export class Game {
  constructor({ onGameOver } = {}) {
    this.player = new Player();
    this.level = new Level();
    this.particles = new Particles();
    this.onGameOver = onGameOver || (() => {});
    this.stage = getStage();
    this.best = loadBest(this.stage.id);
    this.reset();
    // นาฬิกาของหน้าแรกโดยเฉพาะ แยกจาก tick ของรอบเล่น
    // เพราะ tick หยุดเดินตอนไม่ได้อยู่ในสถานะ RUN แต่แมวหน้าแรกต้องขยับตลอด
    this.homeTick = 0;

    // คิวท่าว่าง — อยู่ในตัว Game ไม่ใช่ในฟังก์ชันวาด เพราะมันคือ "สถานะ"
    // ที่ต้องเดินต่อทุกเฟรม ส่วนฟังก์ชันวาดควรอ่านอย่างเดียวไม่จำอะไร
    this.idleAt = 0;      // ท่าถัดไปในตาราง
    this.idleWait = 0;    // ยืนเฉย ๆ มากี่เฟรมแล้ว
    this.idleT = -1;      // เฟรมในท่าปัจจุบัน (-1 = ยังไม่ได้ทำท่าอะไร)

    // ฉากห้องก่อนเริ่มวิ่ง — เป็นแค่ "โหมดวาด" ไม่ใช่สถานะเกม
    // สถานะยังเป็น READY อยู่ ระบบหยุด/นับคะแนน/อินพุตจึงไม่ต้องรู้จักมันเลย
    this.inRoom = false;
  }

  /**
   * ตัวอักษรถัดไปที่ต้องเก็บ — null = ไม่ต้องวางแล้ว
   * Level เรียกฟังก์ชันนี้ตอนสร้างท่อน จึงวางเฉพาะตัวที่ผู้เล่นยังขาดจริง ๆ
   */
  nextLetterIndex() {
    if (this.bonus > 0 || this.letters >= WORD.length) return null;
    return this.letters;
  }

  /**
   * แตะสิ่งกีดขวางและหลุมไม่ได้ทั้งช่วงออกฤทธิ์และช่วงกะพริบ
   * ถ้าตัดฤทธิ์พร้อมกับที่เริ่มกะพริบ ผู้เล่นจะโดนชนตรงเฟรมที่เพิ่งเห็นสัญญาณ
   * ซึ่งรู้สึกเหมือนโดนโกง — สัญญาณเตือนต้องมาก่อนผลจริงเสมอ
   */
  get skillOn() {
    return this.skill > 0 || this.skillBlink > 0;
  }

  /**
   * ตอนนี้เหยียบหลุมได้เหมือนพื้นแข็งรึยัง
   *
   * มีสองอย่างที่ทำให้หลุมหาย: ความสามารถประจำตัว กับไอเทมสปีด
   * รวมไว้ที่เดียวเพื่อให้ player.js ถามคำถามเดียว ไม่ต้องไล่เช็คทีละแหล่ง
   * เพิ่มของใหม่ที่ทำให้ข้ามหลุมได้ในอนาคต ก็มาต่อเงื่อนไขที่นี่ที่เดียว
   */
  /**
   * กำลังอยู่ในฉากฟ้าหรือยัง — ของที่ปูไว้บนฟ้าวาดได้เฉพาะตอนนี้เท่านั้น
   * ช่วงปลารับตัวกับพาลงเป็นฉากพื้น ถ้าเผลอวาดของบนฟ้าตอนนั้นจะทับกันสองชั้น
   */
  get skyScene() {
    return this.bonusPhase === 'fly';
  }

  get pitsSolid() {
    return this.skillOn || this.boost > 0;
  }

  /**
   * จุดตัดสินใจเดียวว่าตอนนี้ควรเล่นเพลงอะไร
   *
   * เดิมสั่ง setMusicTrack กระจายอยู่หลายจุด ซึ่งชนกันแน่เมื่อสถานะซ้อนกัน
   * เช่นความสามารถกำลังทำงานอยู่แล้วเข้าโบนัสบนฟ้าพอดี — ใครสั่งทีหลังชนะ
   * ตอนนี้ทุกที่เรียก syncMusic() แล้วให้ฟังก์ชันนี้ตัดสินจากสถานะจริงแทน
   * ลำดับความสำคัญ: บนฟ้า > ความสามารถ > ปกติ
   */
  syncMusic() {
    if (this.state === STATE.READY) setMusicTrack('home');
    else if (this.bonus > 0) setMusicTrack(this.stage.bonusTrack);
    else if (this.skill > 0) setMusicTrack('dance');
    else setMusicTrack('main');
  }

  reset() {
    // อ่านด่านใหม่ทุกครั้งที่รีเซ็ต ผู้เล่นอาจเพิ่งเลือกด่านอื่นจากหน้าแรก
    this.stage = getStage();
    this.pal = this.stage.palette;
    this.best = loadBest(this.stage.id);
    this.level.reset(this.stage.route);
    this.level.nextLetter = () => this.nextLetterIndex();

    this.state = STATE.READY;
    this.camera = 0;
    this.speed = SPEED.run;   // คงที่ตลอดรอบ ระยะกระโดดจึงเท่าเดิมเสมอ
    this.distance = 0;
    // สะสมคะแนนตรง ๆ ไม่นับจำนวนเม็ด เพราะของเก็บมีหลายราคาแล้ว
    this.treat = 0;
    this.score = 0;
    this.shake = 0;
    this.tick = 0;
    this.shielded = false;
    this.magnet = 0;      // เฟรมที่แม่เหล็กยังทำงานเหลืออยู่
    this.letters = 0;     // เก็บตัวอักษร SPEEDCAT ได้กี่ตัวแล้ว
    this.bonus = 0;       // เฟรมที่เหลือของโหมดโบนัส (0 = ไม่ได้อยู่ในโบนัส)
    this.bonusPhase = '';
    this.bonusTreats = [];
    this.bonusMagnets = [];
    // ตำแหน่งปลาเก็บเป็นพิกัดจอ ไม่ใช่พิกัดโลก เพราะมันเกาะอยู่กับตัวแมว
    // ซึ่งตรึงอยู่ที่ PLAYER_X ตลอด ไม่ต้องแปลงกลับไปกลับมาให้ยุ่ง
    this.fishX = VIEW.W + 140;
    this.fishY = GROUND_Y - 60;
    this.fishDir = -1;
    this.flash = 0;        // ความเข้มแสงวาบตอนสลับฉาก 0-1
    this.flashInk = false; // true = วาบดำ (ขากลับ) / false = วาบขาว (ขาขึ้น)

    // ความสามารถประจำตัว: ชาร์จ → ออกฤทธิ์ → กะพริบ → ชาร์จใหม่
    this.charge = 0;       // เฟรมที่ชาร์จไปแล้ว
    this.skill = 0;        // เฟรมที่เหลือของช่วงออกฤทธิ์
    this.skillBlink = 0;   // เฟรมที่เหลือของช่วงกะพริบ (ยังอมตะ)
    this.rain = [];        // เม็ดที่โปรยลงมา
    this.boost = 0;        // เฟรมที่เหลือของสปีดจากต้นหญ้าแมว
    this.stepAcc = 0;      // เศษเวลาที่ยังไม่ครบหนึ่งก้าวฟิสิกส์
    this.syncMusic();      // เผื่อรอบก่อนจบตอนกำลังออกฤทธิ์หรืออยู่บนฟ้า
    this.invuln = 0;
    this.hp = HEALTH.max;
    this.hurtFlash = 0;
    this.nextPotionAt = POTION.everyFrames;   // ขวดแรกที่นาทีที่ 1
    this.notice = 0;                          // เฟรมที่เหลือของข้อความแจ้งเตือน
    // เข้าหน้าแรกใหม่ให้ยืนตั้งหลักก่อนเสมอ ไม่ใช่โผล่มากลางท่าที่ค้างจากรอบก่อน
    this.idleWait = 0;
    this.idleT = -1;

    this.player.reset();
    this.particles.clear();
    this.level.ensureAhead(this.camera);
  }

  start() {
    this.reset();
    this.state = STATE.RUN;
    // ต้องเรียกซ้ำหลังตั้ง RUN — reset() รันตอน state ยังเป็น READY
    // ถ้าไม่เรียก เพลงหน้าแรกจะค้างเล่นต่อไปทั้งที่เริ่มวิ่งแล้ว
    this.syncMusic();
  }

  // ── อินพุต ─────────────────────────────────────────────────

  jump() {
    if (this.state !== STATE.RUN) return;

    // ระหว่างโบนัส ปุ่มเดียวกันเปลี่ยนหน้าที่เป็น "ตีปีก" ไม่ใช่กระโดด
    // คุมได้เฉพาะช่วงลอยอยู่แล้ว ช่วงทะยานขึ้นกับร่อนลงเป็นแอนิเมชันล้วน
    if (this.bonus > 0) {
      if (this.bonusPhase !== 'fly') return;
      this.player.vy = BONUS.flapV;
      this.particles.dust(PLAYER_X + this.camera, this.player.y + 16, 4);
      sfx.jump();
      return;
    }

    const kind = this.player.jump();
    if (kind === 'single') {
      this.particles.dust(PLAYER_X + 12 + this.camera, GROUND_Y, 6);
      sfx.jump();
    } else if (kind === 'double') {
      this.particles.burst(PLAYER_X + 20 + this.camera, this.player.y - 10, 8, 'mint', 3);
      sfx.double();
    }
  }

  setSlide(on) {
    if (this.state !== STATE.RUN) return;
    this.player.setSlide(on);
  }

  // ── หยุด/เล่นต่อ ───────────────────────────────────────────
  // update() มี `if (this.state !== STATE.RUN) return` อยู่แล้ว
  // แค่เปลี่ยน state เกมก็หยุดเอง ส่วน draw() ยังวาดเฟรมค้างไว้ตามปกติ

  pause() {
    if (this.state !== STATE.RUN) return false;
    this.state = STATE.PAUSE;
    return true;
  }

  resume() {
    if (this.state !== STATE.PAUSE) return false;
    this.state = STATE.RUN;
    // ปล่อยหมอบทิ้ง เพราะถ้าปล่อยนิ้ว/คีย์ตอนหยุดอยู่ setSlide จะถูกบล็อก
    // ไม่งั้นกลับมาเล่นต่อแล้วแมวหมอบค้างโดยไม่ได้กดอะไร
    this.player.setSlide(false);
    return true;
  }

  // ── ลูปอัปเดต ──────────────────────────────────────────────

  update(dt) {
    if (this.state === STATE.DEAD) {
      this.player.updateDead(dt);
      this.shake *= 0.88;
      this.hurtFlash = Math.max(0, this.hurtFlash - 0.06 * dt);
      this.particles.update(dt);
      return;
    }
    if (this.state === STATE.READY) {
      this.homeTick += dt;
      this.stepIdle(dt);
    }
    if (this.state !== STATE.RUN) return;

    this.tick += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.notice > 0) this.notice -= dt;
    this.hurtFlash = Math.max(0, this.hurtFlash - 0.06 * dt);
    this.flash = Math.max(0, this.flash - BONUS.flashFade * dt);

    // เร่งเวลาเฉพาะ "โลก" ไม่ใช่ตัวจับเวลา
    // ตัวจับเวลาทุกตัว (พลัง ความสามารถ แม่เหล็ก โบนัส สปีด) ยังเดินด้วย dt จริง
    // ไม่งั้นของดีที่เก็บมาจะหมดอายุเร็วขึ้นตามไปด้วย กลายเป็นโทษแทนรางวัล
    if (this.boost > 0) this.boost -= dt;
    const gdt = dt * (this.boost > 0 ? SPEEDUP.mult : 1);

    if (this.bonus > 0) return this.updateBonus(dt, gdt);

    // พลังไหลลงตลอด ไม่ว่าจะหลบเก่งแค่ไหน — นี่คือตัวกำหนดความยาวของรอบ
    this.hp -= HEALTH.drain * dt;
    if (this.hp <= 0) {
      this.hp = 0;
      return this.die();
    }

    // เดินโลกด้วยก้าวขนาด 1 เฟรมอ้างอิงเป๊ะ ๆ เศษที่เหลือเก็บไว้เฟรมถัดไป
    //
    // ห้ามส่ง gdt ก้อนเดียวเข้า player.update เด็ดขาด เกมอินทิเกรตแบบ Euler
    // ซึ่งมีค่าคลาดเคลื่อนแปรตามขนาดก้าว (y เพี้ยนไป g·t·h/2)
    // ก้าว 1.4 เท่าทำให้แมวตกต่ำกว่าเส้นอ้างอิง ~3px ที่ยอดโค้ง
    // ขณะที่กล่องซ้อนสามชั้นมีระยะเผื่อแค่ 2.3px → ชนทั้งที่กดถูกจังหวะ
    // (ซอยเป็น 1.0+0.4 ก็ยังไม่พอ ขนาดก้าวไม่เท่าเดิมก็เพี้ยนคนละทิศแทน)
    //
    // ก้าวคงที่ = 1 เท่านั้น เส้นทางในพิกัดโลกจึงตรงกับ jumpPath() ใน level.js
    // ที่ใช้วางอาหารทุกเม็ด ไม่ว่าจะติดสปีดอยู่หรือเฟรมจะตกแค่ไหน
    let justLanded = false, justSlid = false, fellOut = false;
    for (this.stepAcc += gdt; this.stepAcc >= 1; this.stepAcc -= 1) {
      this.camera += this.speed;
      this.distance += this.speed;
      const r = this.player.update(1, this);
      justLanded = justLanded || r.justLanded;
      justSlid = justSlid || r.justSlid;
      fellOut = fellOut || r.fellOut;
    }
    if (justLanded) {
      this.particles.dust(PLAYER_X + this.camera, GROUND_Y, 5);
      sfx.land();
    }
    if (justSlid) {
      this.particles.dust(PLAYER_X + this.camera, GROUND_Y, 4);
      sfx.slide();
    }
    if (fellOut) return this.die('fall');

    const b = this.player.box;
    const bx = b.x + this.camera;

    // ชิ้นที่ถูกชนไปแล้ว: ปลิวตามแรงที่ได้รับ หมุนไปด้วย แล้วจางหาย
    // อัปเดตก่อนเช็คชน จะได้ไม่มีเฟรมไหนที่มันยังอยู่ที่เดิมแต่ชนไม่ได้
    for (const o of this.level.obstacles) {
      if (!o.smashed) continue;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.vy += SPEEDUP.smash.gravity * dt;
      o.rot += o.spin * dt;
      o.life -= dt;
    }

    // ชนสิ่งกีดขวาง
    for (const o of this.level.obstacles) {
      // ต้องข้ามก่อนบรรทัด break ข้างล่าง ชิ้นที่ปลิวไปข้างหน้าจะได้ไม่ไปตัดลูป
      // ทิ้งทั้งที่ยังมีสิ่งกีดขวางจริงรออยู่ถัดไป
      if (o.smashed) continue;
      if (o.x + o.w < this.camera - 60) continue;
      if (o.x > this.camera + VIEW.W) break;
      if (rectHit(bx, b.y, b.w, b.h, o.x, o.y, o.w, o.h)) {
        if (this.boost > 0) {                  // ติดสปีดอยู่ พุ่งชนกระเด็น
          this.smashObstacle(o);
          continue;
        }
        if (this.skillOn) break;               // ความสามารถทำงาน ทะลุผ่านได้เลย
        if (this.invuln > 0) break;            // กำลังอมตะ ผ่านได้
        if (this.shielded) {                   // มีโล่ → โล่แตกแทนที่จะตาย
          this.shielded = false;
          this.invuln = SHIELD.invulnFrames;
          this.shake = 10;
          this.particles.burst(bx + b.w / 2, b.y + b.h / 2, 16, 'dust', 6);
          sfx.shieldBreak();
          break;
        }
        this.takeHit(bx + b.w / 2, b.y + b.h / 2);
        break;
      }
    }

    // takeHit อาจทำให้พลังหมดแล้วตายไปแล้ว ต้องหยุดก่อนไปเก็บของ
    if (this.state !== STATE.RUN) return;

    const cx = bx + b.w / 2;
    const cy = b.y + b.h / 2;

    this.updateSkill(dt, cx, cy);

    // แม่เหล็กทำงาน: ลากของกินที่อยู่ในรัศมีเข้าหาปากแมว
    // ต้องทำก่อนลูปเก็บ ของที่ถูกลากมาจนถึงตัวจะได้ถูกเก็บในเฟรมเดียวกันเลย
    if (this.magnet > 0) this.magnet -= dt;

    // ดูดของในแมพเข้าหาตัว — เกิดได้สองทาง: เก็บไอเทมแม่เหล็ก
    // หรือกำลังใช้ความสามารถประจำตัว (ซึ่งมีแม่เหล็กติดตัวอยู่ในนั้น)
    // ระยะของความสามารถแคบกว่าไอเทมนิดหน่อย ไอเทมที่ต้องออกแรงเก็บจึงยังคุ้มกว่า
    if (this.magnet > 0 || this.skill > 0) {
      const range = this.magnet > 0 ? MAGNET.range : SKILL.magnetRange;
      // สร้างครั้งเดียวนอกลูป ของในระยะมีได้หลายสิบชิ้นต่อเฟรม
      const cfg = {
        range,
        base: MAGNET.minPull,
        rush: MAGNET.rush,
        turn: MAGNET.turn,
        ease: MAGNET.ease,
        swirl: MAGNET.swirl,
        vary: MAGNET.vary,
      };
      // ความสามารถประจำตัว = ดูดได้ทุกอย่างในสนาม ทั้งไอเทมสปีด แม่เหล็ก
      // โล่ ขวดยา และของชนิดใหม่ที่จะเพิ่มทีหลัง (ดู Level.pullables)
      //
      // ส่วนไอเทมแม่เหล็กที่เก็บมาดูดได้แค่ของกินกับตัวอักษร ตั้งใจให้ต่างกัน
      // ของที่ได้จากความสามารถของตัวเองควรคุ้มกว่าของที่เก็บได้ทั่วไป
      const lists = this.skill > 0
        ? this.level.pullables
        : [this.level.fishes, this.level.letters];

      for (const list of lists) {
        for (const f of list) {
          if (f.got) continue;
          const dx = cx - f.x;
          const dy = cy - f.y;
          const d = Math.hypot(dx, dy);
          if (d > range || d < 1) continue;
          seek(f, cx, cy, d, cfg, dt);
        }
      }
    }

    // เก็บของกิน — คะแนนล้วน ไม่ฟื้นพลัง พลังมาจากขวดยาอย่างเดียว
    for (const f of this.level.fishes) {
      if (f.got || f.x < this.camera - 40) continue;
      // กุ้งตัวใหญ่กว่า ระยะเก็บเลยกว้างกว่าให้สมกับที่ตาเห็น
      const pad = f.kind === 'shrimp' ? SHRIMP.pickPad : 22;
      if (Math.hypot(cx - f.x, cy - f.y) < f.r + pad) {
        f.got = true;
        if (f.kind === 'shrimp') {
          this.treat += SCORING.pointsPerShrimp + this.foodBonus;
          this.particles.burst(f.x, f.y, 22, 'shrimp', 7);
          sfx.shrimp();
        } else if (f.kind === 'kibble') {
          this.treat += SCORING.pointsPerKibble + this.foodBonus;
          this.particles.burst(f.x, f.y, 10, 'kibble');
          sfx.kibble();
        } else {
          this.treat += SCORING.pointsPerFish + this.foodBonus;
          this.particles.burst(f.x, f.y, 7, 'mint');
          sfx.fish();
        }
      }
    }

    // เก็บขวดพลัง
    for (const p of this.level.potions) {
      if (p.got || p.x < this.camera - 40) continue;
      if (Math.hypot(cx - p.x, cy - p.y) < POTION.pickR) {
        p.got = true;
        this.hp = Math.min(HEALTH.max, this.hp + POTION.heal);
        this.particles.burst(p.x, p.y, 20, 'crumb', 6);
        this.notice = 0;   // เก็บได้แล้ว ข้อความเตือนไม่ต้องค้างต่อ
        sfx.potion();
      }
    }

    // เก็บแม่เหล็ก — เก็บซ้ำระหว่างที่ยังมีผลอยู่ = ต่อเวลาใหม่เต็ม ไม่ใช่สะสม
    for (const m of this.level.magnets) {
      if (m.got || m.x < this.camera - 40) continue;
      if (Math.hypot(cx - m.x, cy - m.y) < MAGNET.pickR) {
        m.got = true;
        this.magnet = MAGNET.frames;
        this.particles.burst(m.x, m.y, 16, 'mint', 5);
        sfx.magnet();
      }
    }

    // เก็บต้นหญ้าแมว — เก็บซ้ำระหว่างที่ยังติดอยู่ = ต่อเวลาใหม่เต็ม
    // และซ้อนกับแม่เหล็ก ความสามารถ หรือโบนัสได้หมด เพราะเป็นคนละตัวจับเวลากัน
    for (const n of this.level.nips) {
      if (n.got || n.x < this.camera - 40) continue;
      if (Math.hypot(cx - n.x, cy - n.y) < SPEEDUP.pickR) {
        n.got = true;
        this.boost = SPEEDUP.frames;
        this.particles.burst(n.x, n.y, 18, 'nip', 6);
        sfx.nip();
      }
    }

    // ประกายเขียวตามหลังตอนติดสปีด ปล่อยจากด้านหลังตัวเพื่อให้อ่านเป็น "เส้นทางที่ผ่านมา"
    if (this.boost > 0 && Math.floor(this.tick) % SPEEDUP.trailEvery === 0) {
      this.particles.burst(bx + 4, b.y + b.h * 0.7, 3, 'nip', 3);
    }

    // วิ่งข้ามปากหลุมอยู่: โปรยประกายใต้เท้าตรงที่ควรจะไม่มีพื้น
    // ถ้าไม่มีสัญญาณอะไรเลย ภาพที่เห็นคือแมวลอยอยู่เหนือช่องว่าง
    // ซึ่งอ่านเป็นบั๊กมากกว่าอ่านเป็น "เร็วจนไม่ตก"
    if (this.boost > 0 && this.player.onGround
      && this.level.isOverPit(bx + b.w / 2)) {
      this.particles.burst(bx + b.w / 2, GROUND_Y - 2, 3, 'nip', 4);
    }

    // เก็บตัวอักษร SPEEDCAT
    for (const l of this.level.letters) {
      if (l.got || l.x < this.camera - 40) continue;
      if (Math.hypot(cx - l.x, cy - l.y) < LETTER.pickR) {
        l.got = true;
        this.letters = Math.min(WORD.length, this.letters + 1);
        this.treat += SCORING.pointsPerLetter;
        this.particles.burst(l.x, l.y, 16, 'letter', 5);
        sfx.letter(this.letters);
        if (this.letters >= WORD.length) this.startBonus();
      }
    }

    // เก็บโล่
    for (const s of this.level.shields) {
      if (s.got || s.x < this.camera - 40) continue;
      if (Math.hypot(cx - s.x, cy - s.y) < s.r + 24) {
        s.got = true;
        this.shielded = true;
        this.particles.burst(s.x, s.y, 12, 'dust', 5);
        sfx.shield();
      }
    }

    this.level.cull(this.camera);
    this.level.ensureAhead(this.camera);

    // ขวดพลังโผล่ตามเวลา ไม่ใช่ตามระยะทาง — วางหลัง ensureAhead เสมอ
    // เพราะ spawnPotion ต้องอ่านหนาม/หลุมข้างหน้าเพื่อหาจุดโล่ง
    if (this.tick >= this.nextPotionAt) {
      this.level.spawnPotion(this.camera + VIEW.W + 120);
      this.nextPotionAt += POTION.everyFrames;
      this.notice = POTION.noticeFrames;
    }

    this.score =
      Math.floor(this.distance / SCORING.pxPerScorePoint) + this.treat;

    this.particles.update(dt);
    this.shake *= 0.9;
  }

  /**
   * พุ่งชนสิ่งกีดขวางตอนติดสปีด — ไม่เจ็บ ได้คะแนน แล้วชิ้นนั้นปลิวออกไป
   * สุ่มแรงในช่วงที่ตั้งไว้ ชิ้นที่โดนชนติด ๆ กันจึงไม่ปลิวทางเดียวกันเป๊ะ
   */
  smashObstacle(o) {
    const s = SPEEDUP.smash;
    const rnd = (a, b) => a + Math.random() * (b - a);

    o.smashed = true;
    o.vx = rnd(s.vx[0], s.vx[1]);
    o.vy = rnd(s.vy[0], s.vy[1]);
    o.rot = 0;
    // สุ่มทิศหมุน แต่บังคับความเร็วขั้นต่ำไว้ 35% ของเพดาน
    // ถ้าปล่อยให้สุ่มได้ทั้งช่วง บางชิ้นจะได้ค่าใกล้ศูนย์แล้วปลิวไปแบบไม่หมุนเลย
    // ซึ่งดูเหมือนของค้างกลางอากาศมากกว่าของที่เพิ่งโดนชน
    o.spin = (Math.random() < 0.5 ? -1 : 1) * rnd(s.spin * 0.35, s.spin);
    o.life = s.life;

    this.treat += SCORING.pointsPerSmash;
    this.shake = 9;
    this.particles.burst(o.x + o.w / 2, o.y + o.h / 2, 18, 'nip', 7);
    sfx.smash();
  }

  /** ชนแล้วเจ็บ ไม่ตายทันที — ตายก็ต่อเมื่อพลังหมดเกลี้ยง */
  takeHit(x, y) {
    this.hp -= HEALTH.hitDamage;
    this.invuln = HEALTH.invulnAfterHit;
    this.shake = 12;
    this.hurtFlash = 1;
    this.particles.burst(x, y, 14, 'crumb', 6);
    sfx.hurt();

    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
  }

  // ── ความสามารถประจำตัว ─────────────────────────────────────

  /**
   * เดินสถานะความสามารถ แล้วจัดการเม็ดที่โปรยลงมา
   * เรียกทุกเฟรมของช่วงวิ่งปกติเท่านั้น — ระหว่างโบนัสไม่ชาร์จและไม่โปรย
   * เพราะโบนัสเป็นรางวัลอยู่แล้ว ถ้าซ้อนกันอีกจะกลายเป็นคะแนนฟรีจนไม่มีความหมาย
   */
  updateSkill(dt, cx, cy) {
    if (this.skill > 0) {
      this.skill -= dt;

      // โปรยเม็ดใหม่จากเหนือจอเป็นจังหวะ กระจายทั่วความกว้างจอ
      this.rainTick = (this.rainTick || 0) + dt;
      while (this.rainTick >= SKILL.rainEvery) {
        this.rainTick -= SKILL.rainEvery;
        this.rain.push({
          x: this.camera + 120 + Math.random() * (VIEW.W - 140),
          y: -20 - Math.random() * 90,
          vy: SKILL.fallV * (0.8 + Math.random() * 0.5),
          got: false,
        });
      }

      if (this.skill <= 0) {
        this.skill = 0;
        this.skillBlink = SKILL.blinkFrames;
      }
    } else if (this.skillBlink > 0) {
      this.skillBlink = Math.max(0, this.skillBlink - dt);
      // คืนเพลงหลักตอนกะพริบจบ ไม่ใช่ตอนฤทธิ์หมด
      // จะได้ยังรู้สึกว่าอยู่ในช่วงพิเศษจนกว่าจะกลับปกติจริง ๆ
      if (this.skillBlink === 0) this.syncMusic();
    } else {
      // ชาร์จเฉพาะตอนไม่ได้ออกฤทธิ์ เต็มเมื่อไหร่ติดเมื่อนั้น ไม่ต้องกดอะไร
      this.charge += dt;
      if (this.charge >= SKILL.chargeFrames) {
        this.charge = 0;
        this.skill = SKILL.activeFrames;
        this.rainTick = 0;
        sfx.skill();
        this.syncMusic();
      }
    }

    // เม็ดที่โปรยแล้ว: ร่วงลงมาก่อน พอเข้าระยะก็พุ่งเข้าตัวเอง
    const rainCfg = {
      range: SKILL.pullRange,
      base: SKILL.minPull,
      rush: SKILL.rush,
      turn: SKILL.turn,
      ease: SKILL.ease,
    };
    for (const d of this.rain) {
      if (d.got) continue;
      const dx = cx - d.x;
      const dy = cy - d.y;
      const dist = Math.hypot(dx, dy);

      if (dist < SKILL.pullRange && dist > 1) {
        // สืบทอดความเร็วที่กำลังร่วงอยู่มาเป็นความเร็วตั้งต้น
        // เม็ดจึงโค้งจากแนวดิ่งเข้าหาตัว แทนที่จะหักศอกทันทีที่เข้าระยะ
        if (d.mvx === undefined) {
          d.mvx = 0;
          d.mvy = d.vy;
        }
        seek(d, cx, cy, dist, rainCfg, dt);
      } else {
        d.y += d.vy * dt;
      }

      if (dist < SKILL.pickR) {
        d.got = true;
        this.treat += SCORING.pointsPerRain + this.foodBonus;
        this.particles.burst(d.x, d.y, 9, 'kibble');
        sfx.kibble();
      }
    }

    // ทิ้งเม็ดที่เก็บแล้วหรือหลุดจอ ไม่งั้น array โตไม่หยุด
    this.rain = this.rain.filter(
      (d) => !d.got && d.y < VIEW.H + 60 && d.x > this.camera - 120
    );
  }

  // ── โหมดโบนัส ──────────────────────────────────────────────

  /**
   * เริ่มโบนัส — ไม่แตะ state ของด่านเลย แค่ "หยุดใช้มัน" ชั่วคราว
   * ระหว่างโบนัสจะไม่เรียก ensureAhead/cull ด่านจึงค้างอยู่ที่เดิม
   * พอจบแล้ว ensureAhead จะไล่สร้างท่อนจนทันกล้อง ส่วนท่อนที่ตกค้างข้างหลัง
   * โดน cull ทิ้งเอง จึงไม่มีรอยต่อให้ต้องจัดการเป็นพิเศษ
   */
  startBonus() {
    this.bonus = BONUS.frames;
    this.bonusPhase = 'catch';
    this.syncMusic();      // เพลงบนฟ้าต้องมาแทนเพลงเต้นทันที ถ้าความสามารถกำลังทำงานอยู่
    this.letters = 0;              // เริ่มสะสมคำใหม่หลังจบโบนัส

    // ยังไม่วาบตอนนี้ — ฉากยังเป็นพื้นอยู่ ปลาต้องว่ายเข้ามาให้เห็นก่อน
    // แสงวาบจะมาตอนตัดเข้าฉากฟ้าจริง ๆ ท้ายช่วง rise
    this.player.sliding = false;
    this.player.slideHeld = false;
    this.player.vy = 0;
    this.riseFrom = GROUND_Y;

    this.fishX = VIEW.W + 140;     // เริ่มนอกจอฝั่งขวา
    this.fishY = GROUND_Y - 74;
    this.fishDir = -1;             // หันซ้าย เพราะกำลังว่ายเข้าหาแมว

    const span = this.speed * BONUS.frames + VIEW.W;
    // แนวอาหารเริ่มหลังจบช่วงทะยาน ไม่งั้นของแถวแรกจะไหลผ่านไปตอนยังอยู่ฉากพื้น
    const flyFrom = (BONUS.catchFrames + BONUS.riseFrames) * this.speed;
    this.bonusTreats = buildBonusField(this.camera + flyFrom + 200, span);
    this.bonusMagnets = buildBonusMagnets(this.camera + PLAYER_X, span, this.speed);
    sfx.bonus();
  }

  /**
   * ปลาไล่ตามความสูงเป้าหมายแบบหน่วง แล้วบีบไม่ให้ห่างเกิน 9px
   * หน่วงอย่างเดียวไม่พอ ตอนผู้เล่นตีปีกรัว ๆ แมวขึ้นเร็วกว่าปลาไล่ทัน
   * วัดจริงแล้วห่างได้ถึง 12.6px ซึ่งเห็นชัดว่าแมวลอยหลุดจากหลัง
   */
  followFish(ideal, dt) {
    const y = this.fishY + (ideal - this.fishY) * Math.min(1, 0.3 * dt);
    return Math.max(ideal - 9, Math.min(ideal + 9, y));
  }

  /** หันหัวปลาทีละนิด ค่ากลางระหว่าง -1 กับ 1 จะเห็นเป็นปลากำลังหมุนตัวกลับ */
  turnFish(to, dt) {
    this.fishDir += (to - this.fishDir) * Math.min(1, 0.14 * dt);
  }

  /** งานที่ทำครั้งเดียวตอนเปลี่ยนช่วงฉาก */
  enterBonusPhase(to) {
    // ขาววาบตอนตัดขึ้นฟ้า ดำวาบตอนปิดฉากกลับลงพื้น
    if (to === 'fly' || to === 'fall') {
      this.flash = 1;
      this.flashInk = to === 'fall';
    }

    if (to === 'fall') {
      // ทิ้งของบนฟ้าให้หมดก่อนฉากพื้นจะกลับมา
      //
      // สนามโบนัสถูกปูไว้ยาวกว่าที่กล้องวิ่งจริงในช่วงลอย ของแถวท้าย ๆ
      // จึงยังค้างอยู่ข้างหน้าตอนเริ่มร่อนลง ถ้าไม่ทิ้ง มันจะถูกวาดทับ
      // ซ้อนกับด่านจริงเป็นภาพสองชั้น — เก็บก็ไม่ได้เพราะพ้นช่วง fly แล้ว
      this.bonusTreats = [];
      this.bonusMagnets = [];

      // ระหว่างลอยอยู่บนฟ้า กล้องวิ่งไปไกลมากโดยไม่มีใครสร้างด่านรอไว้
      // ต้องไล่สร้างให้ทันก่อนฉากพื้นจะกลับมาให้เห็น ไม่งั้นจะโผล่มาเจอที่ว่าง
      this.level.cull(this.camera);
      this.level.ensureAhead(this.camera);
    }
  }

  updateBonus(dt, gdt = dt) {
    this.bonus -= dt;
    this.camera += this.speed * gdt;
    this.distance += this.speed * gdt;

    const p = this.player;
    const elapsed = BONUS.frames - this.bonus;
    const carry = BONUS.carryUp;
    const restX = PLAYER_X - 6;      // ตำแหน่งจอที่ปลาลอยอยู่ใต้เท้าแมว

    // เลือกช่วงฉากจากเวลา แล้วค่อยยิงงาน "ตอนเข้าช่วง" ทีหลัง
    // แยกสองขั้นแบบนี้เพื่อให้แสงวาบกับการไล่สร้างด่านเกิดครั้งเดียวจริง ๆ
    const prev = this.bonusPhase;
    let phase;
    if (elapsed < BONUS.catchFrames) phase = 'catch';
    else if (elapsed < BONUS.catchFrames + BONUS.riseFrames) phase = 'rise';
    else if (this.bonus < BONUS.leaveFrames) phase = 'leave';
    else if (this.bonus < BONUS.leaveFrames + BONUS.fallFrames) phase = 'fall';
    else phase = 'fly';
    this.bonusPhase = phase;
    if (prev !== phase) this.enterBonusPhase(phase);

    if (phase === 'catch') {
      // ปลาว่ายเข้ามาจากขอบขวา ชะลอตอนใกล้ถึงตัว (ease-out กำลังสาม)
      const k = Math.min(1, elapsed / BONUS.catchFrames);
      const e = 1 - Math.pow(1 - k, 3);
      this.fishX = (VIEW.W + 140) + (restX - (VIEW.W + 140)) * e;
      this.fishY = (GROUND_Y - 74) + (GROUND_Y - 18 - (GROUND_Y - 74)) * e;
      this.turnFish(-1, dt);

      // ช้อนขึ้นเฉพาะ 30% สุดท้าย ก่อนหน้านั้นแมวยังวิ่งอยู่บนพื้นตามปกติ
      const lift = Math.max(0, (k - 0.7) / 0.3);
      const smooth = lift * lift * (3 - 2 * lift);
      p.y = GROUND_Y + ((this.fishY - carry) - GROUND_Y) * smooth;
      p.vy = 0;
      if (k > 0.7 && elapsed % 3 < dt) {
        this.particles.burst(PLAYER_X + this.camera, GROUND_Y, 3, 'mint', 3);
      }
    } else if (phase === 'rise') {
      // ทะยานขึ้น — คุมไม่ได้ ให้ดูเป็นการ "ถูกปลาพาขึ้นฟ้า"
      const t = Math.min(1, (elapsed - BONUS.catchFrames) / BONUS.riseFrames);
      const e = 1 - (1 - t) * (1 - t);
      const from = GROUND_Y - 18;
      this.fishX += (restX - this.fishX) * Math.min(1, 0.2 * dt);
      this.fishY = from + (BONUS.flyY + carry - from) * e;
      p.y = this.fishY - carry;
      p.vy = 0;
      this.turnFish(1, dt);   // หมุนตัวกลับไปหันทางที่วิ่ง
      if (elapsed % 4 < dt) {
        this.particles.burst(PLAYER_X + this.camera, p.y + 30, 4, 'mint', 3);
      }
    } else if (phase === 'fly') {
      p.vy += BONUS.gravity * dt;
      p.y += p.vy * dt;
      if (p.y < BONUS.topY) { p.y = BONUS.topY; p.vy = 0; }
      if (p.y > BONUS.floorY) { p.y = BONUS.floorY; p.vy = 0; }
      // ปลาตามช้ากว่าแมวนิดหน่อย ได้ความรู้สึกว่ามีน้ำหนักจริง ไม่ใช่ติดกาว
      // แต่ต้องคุมเพดานความห่างไว้ ไม่งั้นตอนตีปีกรัว ๆ แมวจะลอยหลุดจากหลังปลา
      this.fishY = this.followFish(p.y + carry, dt);
      this.fishX += (restX - this.fishX) * Math.min(1, 0.2 * dt);
      this.turnFish(1, dt);
    } else if (phase === 'fall') {
      // ร่อนลง — เข้าหาพื้นแบบ ease ไม่ต้องจำตำแหน่งตั้งต้น
      p.y += (GROUND_Y - p.y) * Math.min(1, 0.085 * dt);
      p.vy = 0;
      this.fishY = this.followFish(p.y + carry, dt);
      this.fishX += (restX - this.fishX) * Math.min(1, 0.2 * dt);
      this.turnFish(1, dt);
    } else {
      // ปล่อยแมวลงจุดเดิม แล้วว่ายออกไปทางซ้าย
      p.y = GROUND_Y;
      p.vy = 0;
      this.turnFish(-1, dt);
      // ถอยลงนิดหน่อยก่อนเร่งออก ให้เห็นจังหวะ "วางแล้วค่อยไป"
      const gone = 1 - this.bonus / BONUS.leaveFrames;
      this.fishX -= BONUS.leaveSpeed * gone * dt;
      this.fishY += ((GROUND_Y - 52) - this.fishY) * Math.min(1, 0.08 * dt);
    }

    // แมวยืนบนหลังปลาตลอด ท่าวิ่งจึงถูกกว่าท่าลอยกลางอากาศ
    p.onGround = true;
    p.runPhase += this.speed * dt * 0.06;

    // ฉากพื้นถูกวาดในทุกช่วงยกเว้นตอนลอย จึงต้องมีด่านรออยู่จริง
    if (phase !== 'fly') this.level.ensureAhead(this.camera);

    const b = p.box;
    const cx = b.x + this.camera + b.w / 2;
    const cy = b.y + b.h / 2;

    // เก็บของได้เฉพาะตอนอยู่ฉากฟ้า ช่วงเปิดกับปิดแมวอยู่ในมือปลา
    // ตอนนี้ของบนฟ้าทุกชิ้นก็อยู่ในช่วงนี้ทั้งหมดแล้ว จึงไม่มีอะไรตกหล่น
    const collecting = phase === 'fly';

    // เก็บแม่เหล็กก่อนดูด ลูกที่เพิ่งแตะจะได้ออกฤทธิ์ในเฟรมเดียวกันเลย
    if (collecting) for (const m of this.bonusMagnets) {
      if (m.got) continue;
      if (Math.hypot(cx - m.x, cy - m.y) < BONUS_MAGNET.pickR) {
        m.got = true;
        this.magnet = MAGNET.frames;
        this.particles.burst(m.x, m.y, 16, 'mint', 5);
        sfx.magnet();
      }
    }

    // ตัวจับเวลาแม่เหล็กต้องเดินตอนอยู่บนฟ้าด้วย ไม่งั้นลูกที่เก็บมาก่อนเข้าโบนัส
    // จะค้างเวลาไว้แล้วไปหมดอายุทีเดียวตอนกลับลงพื้น
    if (this.magnet > 0) this.magnet -= dt;

    if (this.magnet > 0 && collecting) {
      for (const f of this.bonusTreats) {
        if (f.got) continue;
        const dx = cx - f.x;
        const dy = cy - f.y;
        const d = Math.hypot(dx, dy);
        if (d > BONUS_PULL.range || d < 1) continue;
        seek(f, cx, cy, d, BONUS_PULL, dt);
      }
    }

    if (collecting) for (const f of this.bonusTreats) {
      if (f.got) continue;
      if (Math.hypot(cx - f.x, cy - f.y) < f.r + 24) {
        f.got = true;
        const b0 = this.foodBonus;
        if (f.kind === 'shrimp') { this.treat += SCORING.pointsPerShrimp + b0; sfx.shrimp(); }
        else if (f.kind === 'kibble') { this.treat += SCORING.pointsPerKibble + b0; sfx.kibble(); }
        else { this.treat += SCORING.pointsPerFish + b0; sfx.fish(); }
        this.particles.burst(f.x, f.y, 8, f.kind === 'kibble' ? 'kibble' : 'mint');
      }
    }

    this.score = Math.floor(this.distance / SCORING.pxPerScorePoint) + this.treat;
    this.particles.update(dt);
    this.shake *= 0.9;

    if (this.bonus <= 0) {
      // ไม่ต้องวาบตรงนี้แล้ว ฉากพื้นโผล่มาตั้งแต่ช่วง fall
      // ตอนนี้แค่คืนการควบคุมให้ผู้เล่นเงียบ ๆ ปลาว่ายพ้นจอไปแล้ว
      this.bonus = 0;
      this.bonusPhase = '';
      this.bonusTreats = [];
      this.bonusMagnets = [];
      this.syncMusic();    // กลับไปเพลงเต้นถ้าความสามารถยังเหลือเวลา ไม่งั้นเพลงหลัก
      p.y = GROUND_Y;
      p.vy = 0;
      p.onGround = true;
      p.jumps = 0;
      this.level.cull(this.camera);
      this.level.ensureAhead(this.camera);
    }
  }

  /** โบนัสคะแนนต่ออาหารหนึ่งเม็ด มาจากระดับของชุดที่ใส่อยู่ */
  get foodBonus() {
    return getSkin().outfit.foodBonus || 0;
  }

  /**
   * ฉากโบนัส — มีสองหน้าตา สลับกันด้วยแสงวาบขาว
   *   ช่วง fly        = ฟ้าเปิดโล่ง ไม่มีพื้นไม่มีสิ่งกีดขวาง
   *   ช่วงอื่นทั้งหมด = ฉากพื้นปกติ เพราะปลากำลังรับ/ส่งแมวอยู่ที่ระดับพื้น
   */
  drawBonus(ctx) {
    const skin = getSkin();
    const sky = this.skyScene;

    if (sky) {
      // ชุดระดับสูงเปลี่ยนสีฟ้าโบนัสได้ — ผสมทับจานสีของด่านเฉพาะคีย์ที่ชุดกำหนด
      // ไม่ได้แทนทั้งจาน เพราะยังต้องใช้สี HUD กับสีของกินจากด่านเดิม
      const pal = skin.outfit.bonus ? { ...this.pal, ...skin.outfit.bonus } : this.pal;
      drawSky(ctx, this.camera, pal, true);
      drawClouds(ctx, this.camera, pal);
      if (skin.outfit.bonus?.sparkle) {
        drawBonusSparkle(ctx, this.tick, skin.outfit.bonus.sparkle);
      }
    } else {
      drawSky(ctx, this.camera, this.pal);
      drawHills(ctx, this.camera, this.pal);
      drawGround(ctx, this.level.pits, this.camera, this.pal);
      drawObstacles(ctx, this.level.obstacles, this.camera, this.stage.theme);
      drawTreats(ctx, this.level.fishes, this.camera, this.tick);
    }

    // ของบนฟ้าทั้งหมดวาดเฉพาะตอนอยู่ฉากฟ้าเท่านั้น
    //
    // แนวเริ่มที่ราว 1,356px จากจุดเข้าโบนัส แต่จอกว้าง 960px ขอบขวาของจอ
    // จึงไปถึงแนวตั้งแต่เฟรมที่ 58 ซึ่งยังอยู่ช่วงปลาว่ายเข้ามารับด้วยซ้ำ
    // ถ้าไม่กันไว้ จะเห็นกำแพงปลาลอยทับฉากพื้นก่อนจะขึ้นฟ้าจริง
    //
    // ไม่ต้องกลัวว่ามันจะโผล่มาแบบกะทันหันตอนเข้าฉากฟ้า เพราะจังหวะนั้น
    // แสงขาววาบเต็มจอกลบรอยต่อให้อยู่แล้ว
    if (sky) {
      drawMagnets(ctx, this.bonusMagnets, this.camera, this.tick);
      drawTreats(ctx, this.bonusTreats, this.camera, this.tick);
    }

    this.particles.draw(ctx, this.camera);

    // ปลาก่อนแมว แมวจึงนั่งทับอยู่บนหลังปลาไม่ใช่จมอยู่ข้างใน
    drawBigFish(ctx, this.fishX, this.fishY, BONUS.fishR, this.fishDir, this.tick);
    drawPlayer(ctx, this.player, false, skin, this.magnet > 0);
    if (this.magnet > 0) drawSuction(ctx, this.player, this.tick);

    postProcess(ctx);
    drawHUD(ctx, this);
    this.drawFlash(ctx);
  }

  /** แสงวาบเต็มจอ วาดท้ายสุดให้ทับ HUD ด้วย ไม่งั้นรอยต่อยังโผล่ให้เห็น */
  drawFlash(ctx) {
    if (this.flash <= 0) return;
    ctx.fillStyle = this.flashInk
      ? `rgba(8,3,16,${this.flash})`
      : `rgba(255,255,255,${this.flash})`;
    ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  }

  /**
   * เก็บสถิติไว้ก่อนทิ้งรอบเล่นกลางคัน — ใช้ตอนกด "เลิกเล่น"
   * ถ้าไม่เรียก คนที่ทำคะแนนสูงสุดแล้วกดเลิกจะเสียสถิตินั้นไปเฉย ๆ
   * ซึ่งดูเหมือนบั๊กมากกว่าดูเหมือนกติกา
   */
  bankBest() {
    if (this.score > this.best) {
      this.best = this.score;
      saveBest(this.stage.id, this.best, Math.floor(this.distance / SCORING.pxPerMeter));
    }
  }

  /**
   * cause 'faint' = พลังหมด ล้มพับนอนกับพื้นตรงนั้น
   * cause 'fall'  = ตกหลุม ปลิวหมุนตกจอไปตามเดิม
   */
  die(cause = 'faint') {
    if (this.state === STATE.DEAD) return;
    this.state = STATE.DEAD;

    if (cause === 'faint') {
      this.shake = 8;   // เบากว่าตกหลุม เพราะเป็นการทรุดลง ไม่ใช่กระแทก
      this.player.faint();
      this.particles.dust(PLAYER_X + this.camera, GROUND_Y, 9);
    } else {
      this.shake = 16;
      this.player.vy = -9;
      this.particles.burst(PLAYER_X + 20 + this.camera, this.player.y - 20, 18, 'crumb', 7);
    }

    sfx.die();

    this.best = Math.max(this.best, this.score);
    saveBest(this.stage.id, this.best, Math.floor(this.distance / SCORING.pxPerMeter));

    setTimeout(() => this.onGameOver(), 750);
  }

  // ── ลูปวาด ─────────────────────────────────────────────────

  draw(ctx) {
    if (this.state === STATE.READY) return this.inRoom ? this.drawRoom(ctx) : this.drawHome(ctx);
    if (this.bonus > 0) return this.drawBonus(ctx);

    ctx.save();
    if (this.shake > 0.4) {
      ctx.translate(
        (Math.random() - 0.5) * this.shake,
        (Math.random() - 0.5) * this.shake
      );
    }

    drawSky(ctx, this.camera, this.pal);
    drawHills(ctx, this.camera, this.pal);
    drawGround(ctx, this.level.pits, this.camera, this.pal);
    drawObstacles(ctx, this.level.obstacles, this.camera, this.stage.theme);
    drawTreats(ctx, this.level.fishes, this.camera, this.tick);
    drawPotions(ctx, this.level.potions, this.camera, this.tick);
    drawMagnets(ctx, this.level.magnets, this.camera, this.tick);
    drawLetters(ctx, this.level.letters, this.camera, this.tick);
    drawNips(ctx, this.level.nips, this.camera, this.tick);
    drawShields(ctx, this.level.shields, this.camera);
    this.particles.draw(ctx, this.camera);

    // กะพริบตอนอมตะหลังโดนชน ให้เห็นชัดว่าช่วงนี้ยังชนไม่ได้
    // เช็ค RUN ด้วย ไม่งั้นตอนตาย tick หยุดเดิน แล้วตัวละครอาจค้างสถานะซ่อน
    const blinking =
      this.state === STATE.RUN && this.invuln > 0 && Math.floor(this.tick / 4) % 2 === 0;
    drawRain(ctx, this.rain, this.camera, getSkin(), this.tick);

    // อ้าปากกับคลื่นดูดโผล่ทั้งตอนมีไอเทมแม่เหล็กและตอนใช้ความสามารถ
    // เพราะทั้งสองกรณีคือ "กำลังดูดของเข้าตัว" เหมือนกัน ต้องอ่านออกเหมือนกัน
    const sucking = this.state === STATE.RUN && (this.magnet > 0 || this.skill > 0);
    // กะพริบสองกรณี: หลังโดนชน กับตอนความสามารถใกล้หมดฤทธิ์
    const skillFlicker = this.skillBlink > 0 && Math.floor(this.tick / 5) % 2 === 0;
    if (!blinking && !skillFlicker) {
      drawPlayer(ctx, this.player, this.state === STATE.DEAD, getSkin(), sucking,
        this.skill > 0 ? this.tick : 0);
    }
    if (sucking) drawSuction(ctx, this.player, this.tick);

    // หลอดความสามารถ ซ่อนตอนตายเพราะไม่มีความหมายแล้ว
    if (this.state !== STATE.DEAD) {
      drawSkillGauge(ctx, this.player, this.charge / SKILL.chargeFrames, this.skillOn, this.tick);
    }

    if (this.state !== STATE.DEAD && this.shielded) {
      drawShieldRing(ctx, this.player, this.tick);
    }

    ctx.restore();
    postProcess(ctx);
    drawHUD(ctx, this);
    this.drawFlash(ctx);
  }

  /**
   * ฉากหน้าแรก — ไม่มี HUD ไม่มีด่าน มีแค่แมวตัวที่เลือกไว้ยืนรออยู่
   * ตัวละครวางไว้ราว 31% จากซ้าย เพื่อเปิดครึ่งขวาให้แผงเมนู HTML ที่ทับอยู่
   */
  /**
   * เดินคิวท่าว่างไปทีละเฟรม
   * แยกจาก drawHome() เพราะการวาดอาจถูกข้ามได้ (เฟรมตก) แต่เวลาต้องเดินตรงเสมอ
   */
  stepIdle(dt) {
    if (this.idleT < 0) {
      this.idleWait += dt;
      if (this.idleWait >= IDLE_GAP) {
        this.idleWait = 0;
        this.idleT = 0;
        this.idleAt = (this.idleAt + 1) % IDLE_ACTS.length;
      }
      return;
    }

    this.idleT += dt;
    if (this.idleT >= IDLE_ACTS[this.idleAt].hold) this.idleT = -1;   // กลับไปยืนเฉย ๆ
  }

  /**
   * ท่าที่ต้องวาดตอนนี้ — null = ยืนปกติ
   * k คือน้ำหนักของท่า 0→1→0 ทำให้เข้าและออกจากท่าแบบค่อยเป็นค่อยไป
   */
  get idlePose() {
    if (this.idleT < 0) return null;
    const act = IDLE_ACTS[this.idleAt];
    const k = Math.min(1, this.idleT / IDLE_EASE, (act.hold - this.idleT) / IDLE_EASE);
    // นุ่มขึ้นด้วย smoothstep — เข้า-ออกแบบเส้นตรงจะเห็นหัวท้ายกระตุกเป็นจังหวะ
    const e = Math.max(0, Math.min(1, k));
    return { pose: act.pose, k: e * e * (3 - 2 * e) };
  }

  /**
   * ฉากห้องก่อนเริ่มวิ่ง — น้องยืนอยู่กลางห้องรอพูดจบ
   *
   * ภาพห้องเป็น background ของ .stage ที่ CSS สลับให้ (ดู .stage:has(#introPanel...))
   * ตรงนี้จึงล้าง canvas ให้โปร่งแล้ววาดแค่ตัวแมว เหมือนที่หน้าแรกทำ
   * ต่างกันแค่ไม่มีของกินลอยรอบตัวกับไม่มีท่าว่าง — ฉากนี้สั้นแค่สามวินาที
   * ถ้าใส่ท่าว่างเข้าไปด้วยจะได้แค่ท่าที่ทำค้างไว้ครึ่งเดียวแล้วตัดจบ
   */
  drawRoom(ctx) {
    const t = this.homeTick;
    const x = VIEW.W * 0.5;

    ctx.clearRect(0, 0, VIEW.W, VIEW.H);

    // หรี่บาง ๆ ให้กล่องคำพูดสีครีมกับตัวแมวเด้งออกจากห้องที่สีอุ่นใกล้กัน
    ctx.fillStyle = 'rgba(24,10,38,.14)';
    ctx.fillRect(0, 0, VIEW.W, VIEW.H);

    // สปอตไลต์ใต้เท้า ดันตัวละครให้เด่นออกจากพรม
    const glow = ctx.createRadialGradient(x, GROUND_Y - 40, 10, x, GROUND_Y - 40, 165);
    glow.addColorStop(0, 'rgba(255,214,150,.26)');
    glow.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 180, GROUND_Y - 215, 360, 275);

    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, GROUND_Y + 5, 44 - Math.sin(t * 0.045) * 2.5, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawCatPose(ctx, x, GROUND_Y, 2.6, getSkin(), t);
    postProcess(ctx, { edges: false });
  }

  drawHome(ctx) {
    const t = this.homeTick;
    // ตรงกลางเป๊ะ ๆ เพราะฉากหลังมีเก้าอี้อยู่กลางภาพ และน้องต้องยืนอยู่บนเบาะพอดี
    // (เคยเยื้องซ้ายไป 0.47 เพื่อถ่วงกับปุ่มเล่นมุมขวาล่าง แต่การยืนตรงกับเก้าอี้สำคัญกว่า)
    // ถ้าเปลี่ยนฉากหลังใหม่ ต้องปรับ $FOCUS ใน tools/render-bg.ps1 ให้เบาะมาอยู่ที่ GROUND_Y ด้วย
    const x = VIEW.W * 0.5;

    // ฉากหลังเป็น background ของ .stage ใน CSS (ดูเหตุผลในไฟล์นั้น)
    // ตรงนี้จึงต้องล้างให้โปร่งก่อน ไม่งั้นฉากของรอบเล่นที่แล้วจะค้างทับภาพอยู่
    ctx.clearRect(0, 0, VIEW.W, VIEW.H);
    dimForUi(ctx);

    // สปอตไลต์นุ่ม ๆ ดันตัวละครให้เด่นออกจากฉากหลัง
    const glow = ctx.createRadialGradient(x, GROUND_Y - 60, 10, x, GROUND_Y - 60, 175);
    glow.addColorStop(0, 'rgba(255,214,150,.22)');
    glow.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 190, GROUND_Y - 245, 380, 305);

    // ของกินลอยรอบตัว — กันฝั่งซ้ายโล่ง และบอกใบ้ว่าเกมนี้ต้องเก็บอะไร
    // ตำแหน่งวัดจากตัวละคร ทุกจุดอยู่ซ้ายของแผงเมนูจึงไม่มีอะไรถูกบัง
    HOME_DECO.forEach((d, i) => {
      const y = GROUND_Y + d.dy + Math.sin(t * 0.03 + i * 1.7) * 5;
      if (d.kibble) drawKibble(ctx, x + d.dx, y, 11);
      else drawFish(ctx, x + d.dx, y, 11);
    });

    // เงาใต้เท้าหดขยายสวนจังหวะหายใจ ทำให้ตัวละครดูมีน้ำหนัก
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, GROUND_Y + 5, 44 - Math.sin(t * 0.045) * 2.5, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawCatPose(ctx, x, GROUND_Y, 2.6, getSkin(), t, this.idlePose);
    postProcess(ctx, { edges: false });
  }
}
