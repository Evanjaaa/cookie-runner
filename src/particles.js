// src/particles.js
import { COLORS } from './config.js';

const TINT = {
  dust: 'rgba(255,243,226,.5)',
  mint: COLORS.mintLite,
  kibble: COLORS.kibbleLite,
  shrimp: COLORS.shrimpLite,
  letter: COLORS.letterLite,
  nip: COLORS.nipLite,
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

  /**
   * หางเม็ดที่ทิ้งไว้ข้างหลังตามชุดที่ใส่
   *
   * ── ทำไมไม่ต้องคำนวณให้มันไหลถอยหลังเอง ──
   * อนุภาคเก็บพิกัดเป็น "พิกัดโลก" ไม่ใช่พิกัดจอ (ดู draw ที่ลบ camera ออกตอนวาด)
   * เม็ดที่ปล่อยทิ้งไว้เฉย ๆ จึงอยู่กับที่ในโลก แล้วกล้องวิ่งหนีไปเอง
   * ผลที่เห็นคือหางลากตามหลังโดยไม่ต้องเขียนอะไรเพิ่มเลยสักบรรทัด
   *
   * cfg มาจากชุด (ดู trail ใน outfits.js) — สี รูปทรง อัตราปล่อย อยู่ที่นั่นทั้งหมด
   */
  trail(x, y, cfg) {
    const [r0, r1] = cfg.r || [1.6, 3.2];
    const cols = cfg.colors || ['#FFFFFF'];
    this.add({
      // กระจายจุดเกิดเล็กน้อย ไม่งั้นเม็ดจะเรียงเป็นเส้นตรงเป๊ะจนดูเป็นลายเส้น
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 14,
      vx: (cfg.drift ?? -0.6) + (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: r0 + Math.random() * (r1 - r0),
      color: cols[(Math.random() * cols.length) | 0],
      // shape รับได้ทั้งชื่อเดียวและอาเรย์ของชื่อ
      // แบบอาเรย์ใช้กับชุดที่อยากให้มีของสองอย่างลอยสลับกัน (เช่นดาวกับหัวใจ)
      // เลือกครั้งเดียวตอนเม็ดเกิด เม็ดหนึ่งจึงเป็นทรงเดิมตลอดอายุ ไม่กระพริบสลับ
      shape: Array.isArray(cfg.shape)
        ? cfg.shape[(Math.random() * cfg.shape.length) | 0]
        : (cfg.shape || 'dot'),
      gravity: cfg.gravity ?? 0.05,
      glow: cfg.glow !== false,
      // มุมกับความเร็วหมุนของเม็ดนั้น ๆ สุ่มครั้งเดียวตอนเกิด
      // ทรงที่ไม่ได้ใช้มุม (ดาว/ข้าวหลามตัด/หยด) ก็แค่ไม่อ่านค่านี้ ไม่มีผลอะไร
      spin: Math.random() * Math.PI * 2,
      spinV: (Math.random() - 0.5) * (cfg.spin || 0),
      life: cfg.life || 42,
      max: cfg.life || 42,
      kind: 'trail',
    });
  }

  update(dt) {
    for (const p of this.list) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // เม็ดหางพกแรงโน้มถ่วงของตัวเองมา ชนิดอื่นใช้ค่าประจำชนิดเหมือนเดิม
      p.vy += (p.gravity ?? (p.kind === 'dust' ? -0.02 : 0.12)) * dt;
      if (p.spinV) p.spin += p.spinV * dt;
      p.life -= dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx, camera) {
    for (const p of this.list) {
      const a = p.life / p.max;
      ctx.globalAlpha = a;
      // สีของตัวเองมาก่อนเสมอ ชนิดที่ไม่ได้พกสีมาจึงใช้ตารางเดิมได้ตามปกติ
      ctx.fillStyle = p.color || TINT[p.kind] || TINT.dust;
      const x = p.x - camera;
      const r = p.r * a;
      // แสงเรืองรอบเม็ด — จำเป็นกับหางเม็ด ไม่ใช่ของประดับ
      // เม็ดเล็ก ๆ สีอ่อนบนฉากที่มีสีเยอะจะจมหายไปเลยถ้าเป็นรูปทึบล้วน
      // ขอบฟุ้งทำให้มันอ่านเป็น "แสง" ซึ่งเด่นออกมาจากฉากได้โดยไม่ต้องทำให้ใหญ่จนเกะกะ
      if (p.glow) { ctx.shadowColor = p.color || '#FFFFFF'; ctx.shadowBlur = r * 3.2; }
      const shape = SHAPES[p.shape];
      if (shape) shape(ctx, x, p.y, r, p.spin);
      else { ctx.beginPath(); ctx.arc(x, p.y, r, 0, Math.PI * 2); ctx.fill(); }
      if (p.glow) ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }
}

// ─────────────────────────────────────────────────────────────
// รูปทรงของเม็ดหาง — วาดในไฟล์นี้เองเพื่อไม่ให้ชั้นอนุภาคต้องพึ่งไฟล์ฝั่งวาดภาพ
//
// ทุกทรงถูกวาดที่รัศมีราว 2-5px เท่านั้น รายละเอียดจึงมองไม่เห็นอยู่แล้ว
// สิ่งเดียวที่แยกทรงออกจากกันได้จริงที่ขนาดนี้คือ "เงาร่าง" ทุกทรงจึงต้องต่างกัน
// ที่โครงร่างล้วน ๆ: แฉก / เหลี่ยม / ซี่ / หยด / รี — ไม่ใช่ต่างกันที่ลวดลายข้างใน
// ─────────────────────────────────────────────────────────────
const SHAPES = {
  /** ดาวสี่แฉก — เอวคอด อ่านเป็นประกายแสง */
  star(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  },

  /** ข้าวหลามตัด — ขอบตรงคม อ่านเป็นเกล็ดทอง/อัญมณี ต่างจากดาวที่ขอบเว้า */
  diamond(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.66, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.66, y);
    ctx.closePath();
    ctx.fill();
  },

  /** เกล็ดหิมะ — ซี่หกแฉกบาง ๆ โปร่งกว่าทรงอื่นทั้งหมด */
  flake(ctx, x, y, r, spin = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = Math.max(0.8, r * 0.28);
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(-Math.cos(a) * r, -Math.sin(a) * r);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.restore();
  },

  /** หยดน้ำ — ปลายแหลมบน ท้องกลมล่าง */
  drop(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.2);
    ctx.bezierCurveTo(x + r * 0.8, y - r * 0.2, x + r * 0.8, y + r * 0.7, x, y + r);
    ctx.bezierCurveTo(x - r * 0.8, y + r * 0.7, x - r * 0.8, y - r * 0.2, x, y - r * 1.2);
    ctx.fill();
  },

  /** หัวใจ — สองพูบนกับปลายแหลมล่าง อ่านออกแม้ที่ 3px เพราะเงาร่างไม่ซ้ำทรงไหน */
  heart(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.95);
    ctx.bezierCurveTo(x - r * 1.6, y - r * 0.35, x - r * 0.6, y - r * 1.2, x, y - r * 0.35);
    ctx.bezierCurveTo(x + r * 0.6, y - r * 1.2, x + r * 1.6, y - r * 0.35, x, y + r * 0.95);
    ctx.fill();
  },

  /** ใบไม้ — วงรีเอียง หมุนช้า ๆ ให้ดูเหมือนใบที่กำลังร่วง */
  leaf(ctx, x, y, r, spin = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.25, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
};
