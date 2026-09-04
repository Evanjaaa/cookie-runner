// src/treasure-run.js
// ─────────────────────────────────────────────────────────────
// ตัวรันสมบัติระหว่างวิ่ง — นับเงื่อนไข ยิงฤทธิ์ แล้วคิวแอนิเมชัน
//
// ไฟล์นี้ไม่วาดอะไรเลยและไม่รู้จัก canvas — มันแค่บอกว่า "ตอนนี้ควรเห็นอะไร"
// ผ่านรายการ shows แล้วให้ render/treasure-fx.js เอาไปวาด
// แยกกันเพราะกติกากับภาพเปลี่ยนคนละจังหวะ และทดสอบกติกาได้โดยไม่ต้องเปิดจอ
//
// หลักการเดียวที่ยึดทั้งไฟล์: ทุกตัวนับเป็นแบบ "ครบแล้วรีเซ็ตแล้วนับใหม่"
// สมบัติชิ้นเดียวจึงทำงานได้เรื่อย ๆ ทั้งตา ไม่ใช่ครั้งเดียวจบ
// (ยกเว้นนมวิเศษที่ตั้งใจให้ครั้งเดียวต่อตา)
// ─────────────────────────────────────────────────────────────
import { equippedTreasures } from './vault.js';
import { effectValue } from './treasures.js';
import { VIEW, GROUND_Y, PLAYER_X, LEVEL } from './config.js';

/** กี่เฟรมที่แอนิเมชันของสมบัติแต่ละแบบกินเวลา */
const SHOW_FRAMES = {
  orange: 96,
  berry: 84,
  paw: 72,
  yarn: 78,
  milk: 90,
  star: 84,
  balloon: 66,
  cake: 108,
};

export class TreasureRun {
  constructor() {
    this.reset();
  }

  /**
   * เริ่มตาใหม่ — อ่านสมบัติที่ติดตั้งไว้ ณ วินาทีนั้น
   *
   * อ่านตอน reset ไม่ใช่ตอน constructor เพราะผู้เล่นเปลี่ยนชุดติดตั้งได้
   * ระหว่างอยู่หน้าแรก ถ้าอ่านครั้งเดียวตอนเปิดเกมจะได้ของเก่าค้างทั้งรอบ
   */
  reset() {
    this.slots = equippedTreasures().map(({ treasure, level }) => ({
      t: treasure,
      level,
      value: effectValue(treasure, level),
      count: 0,      // ตัวนับของ trigger ชิ้นนี้
      used: false,   // สำหรับชิ้นที่ใช้ได้ครั้งเดียวต่อตา
      cool: 0,       // คูลดาวน์ (ลูกโป่ง)
    }));

    this.shows = [];        // แอนิเมชันที่กำลังเล่นอยู่
    this.pops = [];         // ตัวเลขคะแนนที่ลอยขึ้น
    this.guardFrames = 0;   // โล่จากนมวิเศษ
    this.comboBroken = false;
  }

  get active() {
    return this.slots.length > 0;
  }

  /** ตัวคูณคะแนนของกิน — รวมทุกชิ้นที่ให้ rate (ตอนนี้มีแค่อุ้งเท้า) */
  get treatMult() {
    let m = 1;
    for (const s of this.slots) if (s.t.effect.type === 'rate') m += s.value;
    return m;
  }

  /**
   * แรงแม่เหล็กติดตัวจากสมบัติ — 0 คือไม่มี, 1 คือแรงเท่าไอเทมแม่เหล็กเต็ม ๆ
   *
   * ใช้ค่าที่แรงที่สุดชิ้นเดียว ไม่ได้บวกทับกัน เผื่อวันหลังมีสมบัติแนวนี้หลายชิ้น
   * ถ้าบวกกันจะทะลุแรงของไอเทมจริงได้ ซึ่งทำให้ไอเทมในด่านหมดความหมาย
   */
  get magnetPull() {
    let best = 0;
    for (const s of this.slots) {
      if (s.t.effect.type === 'magnet') best = Math.max(best, s.value);
    }
    return best;
  }

  /** กำลังมีโล่จากนมอยู่ไหม — เกมเอาไปใช้ตัดสินว่าชนแล้วเจ็บหรือเปล่า */
  get shielded() {
    return this.guardFrames > 0;
  }

  // ── ยิงฤทธิ์ ──────────────────────────────────────────────

  /**
   * ฤทธิ์ทำงานหนึ่งครั้ง
   * คะแนนบวกเข้า treat ของเกมโดยตรง จะได้ไหลไปรวมกับคะแนนรวมตามปกติ
   */
  fire(slot, game) {
    const kind = slot.t.effect.type;

    this.shows.push({
      id: slot.t.id,
      t: 0,
      life: SHOW_FRAMES[slot.t.id] || 80,
      color: slot.t.color,
    });

    if (kind === 'score') {
      game.treat += slot.value;
      this.pops.push({ t: 0, life: 70, text: '+' + slot.value.toLocaleString('en-US'), color: slot.t.color });
    } else if (kind === 'guard') {
      this.guardFrames = slot.value;
    } else if (kind === 'spawn') {
      this.spawnTreats(game, slot.value);
    }
  }

  /**
   * เสกของกินรอบตัว (เค้ก)
   *
   * ใส่เข้ากอง fishes ของด่านเลย ไม่ได้ทำกองแยก ของที่เสกมาจึงถูกเก็บ
   * ด้วยโค้ดเดิมทุกอย่าง และได้โบนัสจากสมบัติชิ้นอื่นด้วยโดยไม่ต้องเขียนเพิ่ม
   *
   * วางเป็นครึ่งวงเหนือหัวเยื้องไปข้างหน้า เพราะกล้องวิ่งไปทางขวาตลอด
   * ถ้าวางรอบตัวเป็นวงกลมเต็ม ครึ่งซ้ายจะไหลพ้นตัวไปก่อนที่จะเอื้อมถึง
   */
  spawnTreats(game, n) {
    const cx = game.camera + PLAYER_X + 40;
    const cy = GROUND_Y - 70;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * 0.62 + (i / Math.max(1, n - 1)) * Math.PI * 0.75;
      game.level.fishes.push({
        x: cx + Math.cos(a) * 92,
        y: cy + Math.sin(a) * 54,
        r: LEVEL.fishR,
        got: false,
        kind: i % 2 === 0 ? 'kibble' : 'fish',
      });
    }
  }

  // ── ตัวนับต่าง ๆ ที่เกมเรียกเข้ามา ────────────────────────

  /** เก็บของกินได้หนึ่งชิ้น — midAir บอกว่าเก็บตอนเท้าลอยพ้นพื้นหรือเปล่า */
  onTreat(game, midAir) {
    for (const s of this.slots) {
      const g = s.t.trigger;
      if (g.type === 'treats' || g.type === 'combo' || (g.type === 'air' && midAir)) {
        s.count++;
        if (s.count >= g.every) {
          s.count = 0;
          this.fire(s, game);
        }
      }
    }
  }

  /**
   * โดนชน
   * คืน true = นมวิเศษรับไว้ให้แล้ว เกมต้องไม่หักพลัง
   */
  onHit(game) {
    // สายคอมโบขาดทันทีที่โดนชน ไม่ว่าจะกันได้หรือไม่ก็ตาม
    for (const s of this.slots) if (s.t.trigger.type === 'combo') s.count = 0;

    for (const s of this.slots) {
      if (s.t.trigger.type !== 'hit' || s.used) continue;
      s.used = true;
      this.fire(s, game);
      return true;
    }
    return false;
  }

  /**
   * ขอกระโดดเพิ่มจากลูกโป่ง
   * คืน true ถ้าใช้ได้ แล้วเริ่มนับคูลดาวน์ทันที
   */
  tryExtraJump(game) {
    for (const s of this.slots) {
      if (s.t.effect.type !== 'jump' || s.cool > 0) continue;
      s.cool = s.value;
      this.fire(s, game);
      return true;
    }
    return false;
  }

  // ── เดินเวลา ─────────────────────────────────────────────

  update(dt, game) {
    if (this.guardFrames > 0) this.guardFrames -= dt;

    for (const s of this.slots) {
      if (s.cool > 0) s.cool -= dt;

      // ตัวนับแบบเวลาเดินเองทุกเฟรม ไม่ต้องรอให้ผู้เล่นทำอะไร
      if (s.t.trigger.type === 'time') {
        s.count += dt;
        if (s.count >= s.t.trigger.every) {
          s.count = 0;
          this.fire(s, game);
        }
      }
    }

    for (const w of this.shows) w.t += dt;
    this.shows = this.shows.filter((w) => w.t < w.life);

    for (const p of this.pops) p.t += dt;
    this.pops = this.pops.filter((p) => p.t < p.life);
  }

  /**
   * ความคืบหน้าของแต่ละชิ้น ให้ช่องสมบัติในจอเอาไปวาด
   *
   * คืนเป็น "ข้อมูลดิบ" ไม่ใช่ข้อความสำเร็จรูป — ฝั่งวาดเป็นคนตัดสินใจเองว่า
   * จะโชว์เป็นวินาที เป็นจำนวนชิ้น หรือไม่โชว์เลยเมื่อที่ไม่พอ
   * ถ้าปั้นข้อความมาจากตรงนี้ ไฟล์ที่ควรรู้แค่กติกาจะกลายเป็นคนคุมหน้าตาไปด้วย
   *
   *   ready  ฤทธิ์พร้อมใช้ / ทำงานอยู่ตอนนี้
   *   ratio  0–1 ชาร์จไปแล้วเท่าไหร่ (เอาไปวาดเป็นพื้นไล่ขึ้น)
   *   left   เหลืออีกเท่าไหร่ถึงจะทำงาน หน่วยตาม unit
   *   unit   'sec'  = left เป็นเฟรม ให้แปลงเป็นวินาที
   *          'hits' = left เป็นจำนวนของกินที่ต้องเก็บอีก
   *          'none' = ไม่มีอะไรให้นับ (ทำงานตลอด หรือใช้ไปแล้ว)
   */
  gauges() {
    return this.slots.map((s) => {
      const g = s.t.trigger;
      let ratio = 1;
      let ready = true;
      let left = 0;
      let unit = 'none';

      if (g.type === 'time') {
        ratio = Math.min(1, s.count / g.every);
        left = Math.max(0, g.every - s.count);
        unit = 'sec';
        ready = false;
      } else if (g.type === 'treats' || g.type === 'combo' || g.type === 'air') {
        ratio = Math.min(1, s.count / g.every);
        left = Math.max(0, Math.ceil(g.every - s.count));
        unit = 'hits';
        ready = false;
      } else if (g.type === 'hit') {
        // ใช้ไปแล้วก็จบตา ไม่มีตัวนับให้ดู เหลือแค่บอกว่าหมดสิทธิ์แล้ว
        ratio = s.used ? 0 : 1;
        ready = !s.used;
      }

      // ลูกโป่งเป็น passive แต่คิดด้วยคูลดาวน์ ต้องทับค่าที่ trigger ให้มาทั้งชุด
      if (s.t.effect.type === 'jump') {
        ready = s.cool <= 0;
        ratio = ready ? 1 : 1 - s.cool / s.value;
        left = Math.max(0, s.cool);
        unit = ready ? 'none' : 'sec';
      }

      return { id: s.t.id, emoji: s.t.emoji, color: s.t.color, ratio, ready, left, unit };
    });
  }
}

/**
 * จุดกึ่งกลางตัวแมวในพิกัดจอ — แอนิเมชันทุกตัวอ้างอิงจากที่นี่
 *
 * เป็น "กลางตัวที่ตาเห็น" ไม่ใช่กลางกล่องชน สองอย่างนี้ตรงกันเฉพาะตอนขนาดปกติ
 * ตอนกินอาหารกระป๋องแล้วตัวโต กล่องชนคงเดิมแต่ตัวสูงขึ้นไปทางหัว
 * ถ้ายึดกล่อง ฟองนมกับตัวเลขคะแนนจะไปโผล่แถวเข่าแทนที่จะอยู่กลางตัว
 * (สูตรเดียวกับ catView ใน render/entities.js — ที่นั่นคือฝั่งวาด ที่นี่คือฝั่งกติกา)
 */
export function catAnchor(game) {
  const b = game.player.box;
  const half = b.h / 2;
  const s = game.catScale;
  return { x: b.x + b.w / 2, y: b.y + half + half * (1 - s), s };
}

export const SCREEN = { W: VIEW.W, H: VIEW.H };
