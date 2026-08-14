// src/game.js
import { VIEW, GROUND_Y, PLAYER_X, SPEED, SCORING, SHIELD } from './config.js';
import { rectHit } from './utils.js';
import { Player } from './player.js';
import { Level } from './level.js';
import { Particles } from './particles.js';
import { loadBest, saveBest } from './storage.js';
import { sfx } from './audio.js';
import { drawSky, drawHills, drawGround } from './render/background.js';
import {
  drawObstacles, drawCoins, drawPlayer, drawShields, drawShieldRing,
} from './render/entities.js';
import { drawHUD } from './render/hud.js';

export const STATE = { READY: 0, RUN: 1, DEAD: 2 };

export class Game {
  constructor({ onGameOver } = {}) {
    this.player = new Player();
    this.level = new Level();
    this.particles = new Particles();
    this.onGameOver = onGameOver || (() => {});
    this.best = loadBest();
    this.reset();
  }

  reset() {
    this.state = STATE.READY;
    this.camera = 0;
    this.speed = SPEED.start;
    this.distance = 0;
    this.jelly = 0;
    this.score = 0;
    this.shake = 0;
    this.tick = 0;
    this.shielded = false;
    this.invuln = 0;
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

  // ── ลูปอัปเดต ──────────────────────────────────────────────

  update(dt) {
    if (this.state === STATE.DEAD) {
      this.player.updateDead(dt);
      this.shake *= 0.88;
      this.particles.update(dt);
      return;
    }
    if (this.state !== STATE.RUN) return;

    this.tick += dt;
    if (this.invuln > 0) this.invuln -= dt;

    // ความเร็วเพิ่มเรื่อย ๆ = ความยากที่ไม่ต้องออกแบบด่านเพิ่ม
    this.speed = Math.min(SPEED.max, this.speed + SPEED.gain * dt);
    this.camera += this.speed * dt;
    this.distance += this.speed * dt;

    const { justLanded, fellOut } = this.player.update(dt, this);
    if (justLanded) {
      this.particles.dust(PLAYER_X + this.camera, GROUND_Y, 5);
      sfx.land();
    }
    if (fellOut) return this.die();

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
        return this.die();
      }
    }

    const cx = bx + b.w / 2;
    const cy = b.y + b.h / 2;

    // เก็บเจลลี่
    for (const c of this.level.coins) {
      if (c.got || c.x < this.camera - 40) continue;
      if (Math.hypot(cx - c.x, cy - c.y) < c.r + 22) {
        c.got = true;
        this.jelly++;
        this.particles.burst(c.x, c.y, 7, 'mint');
        sfx.coin();
      }
    }

    // เก็บโล่
    for (const s of this.level.shields) {
      if (s.got || s.x < this.camera - 40) continue;
      if (Math.hypot(cx - s.x, cy - s.y) < s.r + 24) {
        s.got = true;
        this.shielded = true;
        this.particles.burst(s.x, s.y, 12, 'dust', 5);
        sfx.coin();
      }
    }

    this.level.cull(this.camera);
    this.level.ensureAhead(this.camera);

    this.score =
      Math.floor(this.distance / SCORING.pxPerScorePoint) +
      this.jelly * SCORING.pointsPerJelly;

    this.particles.update(dt);
    this.shake *= 0.9;
  }

  die() {
    if (this.state === STATE.DEAD) return;
    this.state = STATE.DEAD;
    this.shake = 16;
    this.player.vy = -9;
    this.particles.burst(PLAYER_X + 20 + this.camera, this.player.y - 20, 18, 'crumb', 7);
    sfx.die();

    this.best = Math.max(this.best, this.score);
    saveBest(this.best);

    setTimeout(() => this.onGameOver(), 750);
  }

  // ── ลูปวาด ─────────────────────────────────────────────────

  draw(ctx) {
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
    drawCoins(ctx, this.level.coins, this.camera);
    drawShields(ctx, this.level.shields, this.camera);
    this.particles.draw(ctx, this.camera);
    drawPlayer(ctx, this.player, this.state === STATE.DEAD);

    if (this.state !== STATE.DEAD && (this.shielded || this.invuln > 0)) {
      drawShieldRing(ctx, this.player, this.tick);
    }

    ctx.restore();
    drawHUD(ctx, this);
  }
}
