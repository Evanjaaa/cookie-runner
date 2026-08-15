// src/game.js
import {
  VIEW, GROUND_Y, PLAYER_X, SPEED, SCORING, SHIELD, HEALTH, POTION, SHRIMP, MAGNET,
} from './config.js';
import { rectHit } from './utils.js';
import { Player } from './player.js';
import { Level } from './level.js';
import { Particles } from './particles.js';
import { loadBest, saveBest } from './storage.js';
import { sfx } from './audio.js';
import { drawSky, drawHills, drawGround } from './render/background.js';
import {
  drawObstacles, drawTreats, drawPlayer, drawShields, drawShieldRing, drawPotions,
  drawCatPose, drawFish, drawKibble, drawMagnets, drawSuction,
} from './render/entities.js';
import { getSkin } from './skins.js';
import { drawHUD } from './render/hud.js';

export const STATE = { READY: 0, RUN: 1, DEAD: 2, PAUSE: 3 };

/** ของกินตกแต่งบนหน้าแรก พิกัดวัดจากเท้าตัวละคร (dx ไปขวา, dy ขึ้นบนเป็นลบ) */
const HOME_DECO = [
  { dx: -180, dy: -62 },
  { dx: -152, dy: -156, kibble: true },
  { dx: -92, dy: -238 },
  { dx: 104, dy: -206, kibble: true },
  { dx: 152, dy: -104 },
];

export class Game {
  constructor({ onGameOver } = {}) {
    this.player = new Player();
    this.level = new Level();
    this.particles = new Particles();
    this.onGameOver = onGameOver || (() => {});
    this.best = loadBest();
    this.reset();
    // นาฬิกาของหน้าแรกโดยเฉพาะ แยกจาก tick ของรอบเล่น
    // เพราะ tick หยุดเดินตอนไม่ได้อยู่ในสถานะ RUN แต่แมวหน้าแรกต้องขยับตลอด
    this.homeTick = 0;
  }

  reset() {
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
    this.invuln = 0;
    this.hp = HEALTH.max;
    this.hurtFlash = 0;
    this.nextPotionAt = POTION.everyFrames;   // ขวดแรกที่นาทีที่ 1
    this.notice = 0;                          // เฟรมที่เหลือของข้อความแจ้งเตือน
    this.player.reset();
    this.level.reset();
    this.particles.clear();
    this.level.ensureAhead(this.camera);
  }

  start() {
    this.reset();
    this.state = STATE.RUN;
  }

  // ── อินพุต ─────────────────────────────────────────────────

  jump() {
    if (this.state !== STATE.RUN) return;
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
    if (this.state === STATE.READY) this.homeTick += dt;
    if (this.state !== STATE.RUN) return;

    this.tick += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.notice > 0) this.notice -= dt;
    this.hurtFlash = Math.max(0, this.hurtFlash - 0.06 * dt);

    // พลังไหลลงตลอด ไม่ว่าจะหลบเก่งแค่ไหน — นี่คือตัวกำหนดความยาวของรอบ
    this.hp -= HEALTH.drain * dt;
    if (this.hp <= 0) {
      this.hp = 0;
      return this.die();
    }

    this.camera += this.speed * dt;
    this.distance += this.speed * dt;

    const { justLanded, justSlid, fellOut } = this.player.update(dt, this);
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

    // ชนสิ่งกีดขวาง
    for (const o of this.level.obstacles) {
      if (o.x + o.w < this.camera - 60) continue;
      if (o.x > this.camera + VIEW.W) break;
      if (rectHit(bx, b.y, b.w, b.h, o.x, o.y, o.w, o.h)) {
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

    // แม่เหล็กทำงาน: ลากของกินที่อยู่ในรัศมีเข้าหาปากแมว
    // ต้องทำก่อนลูปเก็บ ของที่ถูกลากมาจนถึงตัวจะได้ถูกเก็บในเฟรมเดียวกันเลย
    if (this.magnet > 0) {
      this.magnet -= dt;
      for (const f of this.level.fishes) {
        if (f.got) continue;
        const dx = cx - f.x;
        const dy = cy - f.y;
        const d = Math.hypot(dx, dy);
        if (d > MAGNET.range || d < 1) continue;
        // ยิ่งใกล้ยิ่งเร็ว แต่มีพื้นความเร็วขั้นต่ำเสมอ
        // ไม่งั้นของที่อยู่ข้างหลังจะวิ่งตามกล้องไม่ทันแล้วโดนตัดทิ้งไปเฉย ๆ
        const speed = Math.max(MAGNET.minPull, d * MAGNET.pull) * dt;
        f.x += (dx / d) * speed;
        f.y += (dy / d) * speed;
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
          this.treat += SCORING.pointsPerShrimp;
          this.particles.burst(f.x, f.y, 22, 'shrimp', 7);
          sfx.shrimp();
        } else if (f.kind === 'kibble') {
          this.treat += SCORING.pointsPerKibble;
          this.particles.burst(f.x, f.y, 10, 'kibble');
          sfx.kibble();
        } else {
          this.treat += SCORING.pointsPerFish;
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

  /**
   * เก็บสถิติไว้ก่อนทิ้งรอบเล่นกลางคัน — ใช้ตอนกด "เลิกเล่น"
   * ถ้าไม่เรียก คนที่ทำคะแนนสูงสุดแล้วกดเลิกจะเสียสถิตินั้นไปเฉย ๆ
   * ซึ่งดูเหมือนบั๊กมากกว่าดูเหมือนกติกา
   */
  bankBest() {
    if (this.score > this.best) {
      this.best = this.score;
      saveBest(this.best);
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
    saveBest(this.best);

    setTimeout(() => this.onGameOver(), 750);
  }

  // ── ลูปวาด ─────────────────────────────────────────────────

  draw(ctx) {
    if (this.state === STATE.READY) return this.drawHome(ctx);

    ctx.save();
    if (this.shake > 0.4) {
      ctx.translate(
        (Math.random() - 0.5) * this.shake,
        (Math.random() - 0.5) * this.shake
      );
    }

    drawSky(ctx, this.camera);
    drawHills(ctx, this.camera);
    drawGround(ctx, this.level.pits, this.camera);
    drawObstacles(ctx, this.level.obstacles, this.camera);
    drawTreats(ctx, this.level.fishes, this.camera, this.tick);
    drawPotions(ctx, this.level.potions, this.camera, this.tick);
    drawMagnets(ctx, this.level.magnets, this.camera, this.tick);
    drawShields(ctx, this.level.shields, this.camera);
    this.particles.draw(ctx, this.camera);

    // กะพริบตอนอมตะหลังโดนชน ให้เห็นชัดว่าช่วงนี้ยังชนไม่ได้
    // เช็ค RUN ด้วย ไม่งั้นตอนตาย tick หยุดเดิน แล้วตัวละครอาจค้างสถานะซ่อน
    const blinking =
      this.state === STATE.RUN && this.invuln > 0 && Math.floor(this.tick / 4) % 2 === 0;
    const sucking = this.state === STATE.RUN && this.magnet > 0;
    if (!blinking) drawPlayer(ctx, this.player, this.state === STATE.DEAD, getSkin(), sucking);
    if (sucking) drawSuction(ctx, this.player, this.tick);

    if (this.state !== STATE.DEAD && this.shielded) {
      drawShieldRing(ctx, this.player, this.tick);
    }

    ctx.restore();
    drawHUD(ctx, this);
  }

  /**
   * ฉากหน้าแรก — ไม่มี HUD ไม่มีด่าน มีแค่แมวตัวที่เลือกไว้ยืนรออยู่
   * ตัวละครวางไว้ราว 31% จากซ้าย เพื่อเปิดครึ่งขวาให้แผงเมนู HTML ที่ทับอยู่
   */
  drawHome(ctx) {
    const t = this.homeTick;
    const x = VIEW.W * 0.31;

    drawSky(ctx, 0);
    drawHills(ctx, 0);
    drawGround(ctx, [], 0);

    // สปอตไลต์นุ่ม ๆ ดันตัวละครให้เด่นออกจากฉากหลังม่วง
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

    drawCatPose(ctx, x, GROUND_Y, 2.6, getSkin(), t);
  }
}
