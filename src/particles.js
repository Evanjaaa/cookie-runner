// src/particles.js
import { COLORS } from './config.js';

const TINT = {
  dust: 'rgba(255,243,226,.5)',
  mint: COLORS.mintLite,
  crumb: COLORS.cat,
};

export class Particles {
  constructor() {
    this.list = [];
  }

  clear() {
    this.list.length = 0;
  }

  add(p) {
    this.list.push({ life: 24, max: 24, r: 3, vx: 0, vy: 0, kind: 'dust', ...p });
  }

  /** ระเบิดออกทุกทิศ ใช้ตอนเก็บเจลลี่หรือตาย */
  burst(x, y, count, kind, power = 4.5) {
    for (let i = 0; i < count; i++) {
      this.add({
        x, y,
        vx: (Math.random() - 0.5) * power,
        vy: (Math.random() - 0.5) * power,
        r: Math.random() * 3 + 1.5,
        kind,
        life: 26, max: 26,
      });
    }
  }

  /** ฝุ่นลอยขึ้น ใช้ตอนกระโดดและลงพื้น */
  dust(x, y, count) {
    for (let i = 0; i < count; i++) {
      this.add({
        x, y,
        vx: -(Math.random() * 2 + 1),
        vy: -(Math.random() * 1.6),
        r: Math.random() * 4 + 2,
        kind: 'dust',
        life: 26, max: 26,
      });
    }
  }

  update(dt) {
    for (const p of this.list) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.kind === 'dust' ? -0.02 : 0.12) * dt;
      p.life -= dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx, camera) {
    for (const p of this.list) {
      const a = p.life / p.max;
      ctx.globalAlpha = a;
      ctx.fillStyle = TINT[p.kind] || TINT.dust;
      ctx.beginPath();
      ctx.arc(p.x - camera, p.y, p.r * a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
