// src/talent-run.js
// ─────────────────────────────────────────────────────────────
// ตัวรันพรสวรรค์ระหว่างวิ่ง — ท่าเดียวกับ treasure-run.js ของสมบัติ
//
// หน้าที่: อ่านใบที่ติดตั้ง แล้วบอกเกมว่า "รอบนี้ตัวน้องเคลื่อนที่ต่างไปยังไง"
//
// ── ตัวละครไม่รู้จักพรสวรรค์เลย ──
// Player อ่านแค่ก้อน mods (แรงโน้มถ่วง แรงกระโดด จำนวนกระโดดกลางอากาศ ความเร็วตกสูงสุด ฯลฯ)
// ซึ่งไฟล์นี้เป็นคนเขียนให้ทุกเฟรม ถอดพรสวรรค์ออก = mods กลับเป็นค่ากลาง ตัวละครเหมือนเดิมเป๊ะ
//
// ── เกมไม่ต้องรู้ว่าใบไหนทำอะไร ──
// เกมถามคำถามกลาง ๆ: timeK (โลกเร็ว/ช้าแค่ไหน), phasing (ทะลุของไหม), floating (ลอยข้ามหลุมไหม)
// tryReflect (ชนแล้วมีอะไรรับไหม) — เพิ่มใบใหม่จึงแก้แค่ไฟล์นี้กับ talents.js
//
// ── ช่วงโบนัสบนฟ้า ──
// ทุกอย่างหยุดทำงาน (ท่าที่กำลังออกฤทธิ์จบทันที) เพราะโบนัสคุมตัวน้องด้วยกติกาของมันเอง
// ถ้าปล่อยให้พรสวรรค์ทำงานต่อ ตัวเบาจะทำให้การตีปีกบนฟ้าเพี้ยน และท่าพุ่งจะพาหลุดหลังปลา
// ─────────────────────────────────────────────────────────────
import { getEquippedTalent } from './talents.js';
import { GROUND_Y, PLAYER_X } from './config.js';
import { sfx } from './audio.js';

/** ค่ากลาง — ตัวละครที่ไม่มีพรสวรรค์ใช้ก้อนนี้ (แช่แข็งไว้ กันใครเผลอแก้ของส่วนกลาง) */
export const NEUTRAL_MODS = Object.freeze({
  gravity: 1,          // ตัวคูณแรงโน้มถ่วง
  jump: 1,             // ตัวคูณแรงกระโดดทุกชั้น
  airJumps: 0,         // กระโดดกลางอากาศเพิ่มจากปกติ
  extraV: 0,           // แรงของจังหวะที่เพิ่มมา
  maxFall: Infinity,   // ความเร็วตกสูงสุด (ร่อน)
  hover: false,        // ค้างความสูงไว้ ไม่มีแรงโน้มถ่วง (พุ่งกลางอากาศ)
  noFastFall: false,   // กดหมอบกลางอากาศแล้วไม่ดิ่ง (ปุ่มหมอบถูกยืมไปทำอย่างอื่น)
  laneY: null,         // โหมดลอย: ความสูงเท้าที่ต้องไปอยู่ (null = วิ่งปกติ)
  laneEase: 0.2,
});

export class TalentRun {
  constructor() {
    this.reset(null);
  }

  /**
   * เริ่มตาใหม่ — อ่านใบที่ติดตั้ง ณ ตอนนั้น (เปลี่ยนใบได้ระหว่างอยู่หน้าแรก)
   * @param player ส่งมาเพื่อติดตั้ง mods ให้ทันเฟรมแรก
   */
  reset(player) {
    this.t = getEquippedTalent();
    this.cool = 0;          // คูลดาวน์ที่เหลือ (เฟรม)
    this.active = 0;        // ฤทธิ์ที่เหลือ (เฟรม)
    this.slowT = 0;         // ช่วงโลกช้าหลังเด้งสะท้อน
    this.jumpHeld = false;
    this.slideHeld = false;
    this.glideLeft = 0;
    this.gliding = false;
    this.lane = 1;          // แมวลอยเริ่มที่ลอยต่ำ
    this.topLeft = 0;
    this.lockLeft = 0;
    this.bounceWait = 0;
    this.readyPing = false;
    // แมวสองโลก: ร่างเงาเหนือหัว — null = ไม่มี (พิกัดจอ เหมือนตัวจริง)
    this.twin = null;
    // จอมทำลาย: ข่วนไปแล้วหรือยังในการกดครั้งนี้ + ข่วนโดนกี่ชิ้น (ให้ภาพประกายตอนโดน)
    this.struck = false;
    this.strikeHits = 0;
    // ตัวจับเวลาของภาพล้วน ๆ ฝั่งวาดอ่านอย่างเดียว
    this.fx = { reflect: 0, lane: 0, laneDir: 0, bounce: 0, dashStart: 0 };
    this.mods = { ...NEUTRAL_MODS };
    if (player) this.attach(player);
  }

  /** ผูก mods เข้ากับตัวละคร — เรียกซ้ำหลัง player.reset() (เช่นตอนดึงขึ้นจากหลุม) */
  attach(player) {
    player.mods = this.mods;
    player.ox = 0;
    player.ovx = 0;
    this.lane = 1;
    this.topLeft = 0;
    this.lockLeft = 0;
    this.writeMods(player, false);
  }

  get id() { return this.t ? this.t.id : null; }
  get tune() { return this.t ? this.t.tune : {}; }

  /** ใบนี้มีปุ่มท่าพิเศษ (หรือช่องบอกสถานะชาร์จ) ให้โชว์ไหม */
  get hasButton() {
    return !!this.t && (this.t.type === 'active' || this.t.type === 'reactive');
  }

  // ── คำถามกลางที่เกมถาม ──────────────────────────────────

  /** ตัวคูณเวลาของ "โลก" — ท่าพุ่ง > 1, หยุดจังหวะ/หลังเด้งสะท้อน < 1 */
  get timeK() {
    let k = 1;
    if (this.active > 0 && (this.id === 'A4' || this.id === 'SS4')) k *= this.tune.timeK;
    if (this.slowT > 0) k *= this.t.tune.slowK;
    return k;
  }

  /** กำลังเป็นเงา ทะลุสิ่งกีดขวางได้ */
  get phasing() { return this.id === 'SS1' && this.active > 0; }

  /** ลอยอยู่ ไม่ตกหลุม */
  get floating() { return this.id === 'SS7'; }

  get dashing() { return this.id === 'A4' && this.active > 0; }
  get slowing() { return this.id === 'SS4' && this.active > 0; }

  /** ช่วงเตือนก่อนเงาหมด — ให้ตัวกะพริบ ผู้เล่นจะได้ไม่พุ่งใส่หนามตอนฤทธิ์หมดพอดี */
  get shadowEnding() {
    return this.phasing && this.active < this.tune.warnFrames;
  }

  /**
   * สถานะให้ปุ่มท่าพิเศษเอาไปวาด
   *   ratio  0–1 ความพร้อม (1 = พร้อมใช้)
   *   state  'ready' | 'active' | 'cool'
   */
  gauge() {
    if (!this.hasButton) return null;
    const t = this.t;
    if (this.active > 0) {
      return { state: 'active', ratio: this.active / Math.max(1, t.duration), left: this.active, t };
    }
    if (this.cool > 0) {
      return { state: 'cool', ratio: 1 - this.cool / t.cooldown, left: this.cool, t };
    }
    return { state: 'ready', ratio: 1, left: 0, t };
  }

  // ── อินพุต ─────────────────────────────────────────────

  /** กดกระโดด — คืน true ถ้าใบนี้ใช้ปุ่มนี้ไปทำอย่างอื่นแล้ว (เกมไม่ต้องกระโดดต่อ) */
  onJumpPress(game) {
    this.jumpHeld = true;
    if (this.id !== 'SS7') return false;
    this.changeLane(game, +1);
    return true;
  }

  onJumpRelease() {
    this.jumpHeld = false;
  }

  /**
   * กด/ปล่อยหมอบ — คืน true ถ้าใบนี้กินการกดครั้งนี้ไปแล้ว
   * แมวลอย: กดตอนอยู่สูง = ลงหนึ่งระดับ (ไม่หมอบ) ถึงพื้นแล้วกดอีกทีจึงเป็นหมอบจริง
   */
  onSlide(game, on) {
    this.slideHeld = on;
    if (this.id !== 'SS7' || !on || game.bonus > 0) return false;
    if (this.lane > 0) {
      this.changeLane(game, -1);
      return true;
    }
    return false;
  }

  changeLane(game, dir) {
    const lanes = this.tune.lanes;
    let to = this.lane + dir;
    // ระดับบนสุดถูกล็อกชั่วคราวหลังเพิ่งลดลงมาเอง — กันขึ้นไปค้างซ้ำทันที
    if (to === lanes.length - 1 && this.lockLeft > 0) {
      sfx.upFail();
      return;
    }
    to = Math.max(0, Math.min(lanes.length - 1, to));
    if (to === this.lane) return;
    this.lane = to;
    if (to === lanes.length - 1) this.topLeft = this.tune.topFrames;
    this.fx.lane = 1;
    this.fx.laneDir = dir;
    const p = game.player;
    // ขึ้นลงระดับแล้วเลิกหมอบเสมอ ไม่งั้นลอยขึ้นไปทั้งท่าหมอบแล้วกล่องชนเพี้ยน
    p.slideHeld = false;
    game.particles.burst(p.box.x + game.camera + 20, p.y, 8, 'dust', 3);
    if (dir > 0) sfx.jump(); else sfx.slide();
  }

  /** กดปุ่มท่าพิเศษ — คืน true ถ้าใช้ได้จริง */
  useSkill(game) {
    if (!this.t || this.t.type !== 'active') return false;
    if (game.bonus > 0) return false;
    if (this.active > 0 || this.cool > 0) {
      sfx.upFail();
      return false;
    }
    const p = game.player;
    const cx = p.box.x + game.camera + p.box.w / 2;
    const cy = p.box.y + p.box.h / 2;
    this.active = this.t.duration;

    if (this.id === 'A4') {
      this.fx.dashStart = 1;
      game.particles.burst(cx, cy, 14, 'mint', 6);
      sfx.dash();
    } else if (this.id === 'SS1') {
      game.particles.burst(cx, cy, 20, 'shadow', 5);
      sfx.shadow();
    } else if (this.id === 'SS4') {
      sfx.timeSlow();
    } else if (this.id === 'SS3') {
      // ร่างเงาโผล่จากตัวจริงแล้วลอยขึ้นไปประจำที่ ไม่ใช่โผล่วาบกลางอากาศ
      const b = p.box;
      if (!this.twin) this.twin = { x: b.x + b.w / 2, y: p.y, a: 0 };
      game.particles.burst(cx, cy, 18, 'shadow', 5);
      sfx.shadow();
      sfx.trill();
    } else if (this.id === 'SS6') {
      this.struck = false;
      this.strikeHits = 0;
      sfx.claw();
    }
    return true;
  }

  /** ร่างเงาเก็บของได้ตอนนี้ไหม — ต้องชัดพอแล้ว (ช่วงจางเข้า/ออกยังไม่นับ) */
  get twinCollects() {
    return !!this.twin && this.id === 'SS3' && this.active > 0 && this.twin.a > 0.5;
  }

  /** กลางตัวร่างเงาในพิกัดจอ */
  get twinCenter() {
    const tw = this.twin;
    return { x: tw.x, y: tw.y - 23 * this.tune.scale };
  }

  /**
   * จอมทำลาย: ข่วนทุกอย่างในระยะข้างหน้าให้กระเด็น
   * ใช้ smashObstacle/smashHazard ของเกมเอง ผลจึงเหมือนตอนพุ่งชนด้วยสปีดทุกประการ
   * (ของปลิวหมุนแล้วจาง ได้คะแนนพุ่งชน จอสั่น) ไม่ได้เขียนกติกาการพังขึ้นใหม่
   */
  strike(game) {
    const b = game.player.box;
    const from = b.x + b.w - 12 + game.camera;
    const to = from + this.tune.reach;
    let hits = 0;
    for (const o of game.level.obstacles) {
      if (o.smashed || o.x + o.w < from) continue;
      if (o.x > to) break;
      game.smashObstacle(o);
      hits++;
    }
    for (const h of game.level.hazards) {
      if (h.smashed || h.x + h.w < from || h.x > to) continue;
      game.smashHazard(h);
      hits++;
    }
    for (const f of game.level.fallers) {
      if (f.dead || f.x + f.w < from || f.x > to) continue;
      f.dead = true;
      game.particles.burst(f.x + f.w / 2, f.y + f.h / 2, 16, 'crumb', 6);
      hits++;
    }
    this.strikeHits = hits;
    if (hits) game.shake = Math.max(game.shake, 11);
  }

  /**
   * ชนสิ่งกีดขวาง — แมวสะท้อนรับไว้ได้ไหม
   * คืน true = เด้งกลับแล้ว เกมต้องไม่หักพลัง
   */
  tryReflect(game, x, y) {
    if (this.id !== 'SS2' || this.cool > 0 || game.bonus > 0) return false;
    const tn = this.tune;
    const p = game.player;
    this.cool = this.t.cooldown;
    this.slowT = tn.slowFrames;
    this.fx.reflect = 1;

    // เด้งขึ้นกลางอากาศ แล้วยังกระโดดชั้นสองต่อได้ — เด้งแล้วต้องมีทางแก้ตัว
    // ไม่ใช่เด้งแล้วร่วงลงใส่ของชิ้นเดิมซ้ำโดยทำอะไรไม่ได้
    p.vy = tn.bounceV;
    p.onGround = false;
    p.sliding = false;
    p.jumps = 1;
    p.squash = -0.8;
    game.invuln = Math.max(game.invuln, tn.invuln);
    game.shake = Math.max(game.shake, 9);
    game.particles.burst(x, y, 18, 'mirror', 7);
    sfx.reflect();
    return true;
  }

  onBonusStart(game) {
    this.active = 0;
    this.slowT = 0;
    this.twin = null;
    game.player.ox = 0;
    game.player.ovx = 0;
    this.lane = 1;
  }

  onDeath() {
    this.active = 0;
    this.slowT = 0;
    this.twin = null;
  }

  // ── เดินเวลา ─────────────────────────────────────────────

  /** เรียกทุกเฟรมตอนวิ่งปกติ (ไม่ใช่โบนัส) ก่อนเดินฟิสิกส์ */
  update(dt, game) {
    const p = game.player;
    if (!this.t) return;
    const tn = this.tune;

    // ── ตัวจับเวลา ──
    if (this.active > 0) {
      this.active -= dt;
      if (this.active <= 0) {
        this.active = 0;
        this.cool = this.t.cooldown;
      }
    } else if (this.cool > 0) {
      this.cool -= dt;
      if (this.cool <= 0) {
        this.cool = 0;
        // เสียงบอกว่าพร้อมอีกครั้ง — ระหว่างวิ่งไม่มีเวลาเหลือบมองปุ่ม
        if (this.hasButton) sfx.talentReady();
      }
    }
    if (this.slowT > 0) this.slowT = Math.max(0, this.slowT - dt);
    for (const k of ['reflect', 'lane', 'bounce', 'dashStart']) {
      if (this.fx[k] > 0) this.fx[k] = Math.max(0, this.fx[k] - 0.05 * dt);
    }

    // ── S1 ร่อน: กดค้างตอนกำลังตก ──
    if (this.id === 'S1') {
      if (p.onGround) this.glideLeft = tn.frames;
      this.gliding = this.jumpHeld && !p.onGround && p.vy > 0 && this.glideLeft > 0;
      if (this.gliding) {
        this.glideLeft -= dt;
        p.ox = Math.min(tn.driftMax, p.ox + tn.drift * dt);
      } else if (p.onGround) {
        p.ox = Math.max(0, p.ox - 1.6 * dt);
      }
    }

    // ── S2 บังคับกลางอากาศ ──
    if (this.id === 'S2') {
      if (!p.onGround) {
        const want = (this.jumpHeld ? 1 : 0) - (this.slideHeld ? 1 : 0);
        if (want) p.ovx += want * tn.accel * dt;
        else p.ovx *= Math.pow(0.9, dt);
        p.ovx = Math.max(-tn.maxV, Math.min(tn.maxV, p.ovx));
        p.ox = Math.max(tn.back, Math.min(tn.fwd, p.ox + p.ovx * dt));
      } else {
        p.ovx = 0;
        const s = tn.settle * dt;
        p.ox = Math.abs(p.ox) <= s ? 0 : p.ox - Math.sign(p.ox) * s;
      }
    }

    // ── A4 พุ่ง: ตัวน้องไหลนำกล้องไปข้างหน้าช่วงสั้น ๆ แล้วกลับที่เดิม ──
    if (this.id === 'A4') {
      const target = this.active > 0 ? tn.lunge : 0;
      p.ox += (target - p.ox) * Math.min(1, (this.active > 0 ? 0.35 : 0.12) * dt);
      if (this.active > 0 && Math.floor(game.tick) % 2 === 0) {
        game.particles.add({
          x: p.box.x + game.camera, y: p.box.y + Math.random() * p.box.h,
          vx: -3 - Math.random() * 3, vy: 0, r: 2 + Math.random() * 2,
          kind: 'mint', life: 14, max: 14,
        });
      }
    }

    // ── SS1 เงา: ควันม่วงลอยจากตัวตลอดช่วงฤทธิ์ ──
    if (this.phasing && Math.floor(game.tick) % 3 === 0) {
      game.particles.add({
        x: p.box.x + game.camera + Math.random() * p.box.w,
        y: p.box.y + Math.random() * p.box.h,
        vx: -1.2 - Math.random(), vy: -0.6 - Math.random() * 0.6,
        r: 3 + Math.random() * 3, kind: 'shadow', gravity: -0.01, life: 30, max: 30,
      });
    }

    // ── SS3 ร่างเงา: ลอยตามเหนือหัว จางเข้าตอนเรียก จางออกตอนหมดเวลา ──
    // ตามแบบหน่วง ๆ ไม่ติดหัวแน่น — เห็นว่าเป็นอีกตัวที่บินตาม ไม่ใช่หมวกที่แปะอยู่บนหัว
    if (this.twin) {
      const tw = this.twin;
      const b = p.box;
      const tx = b.x + b.w / 2 - 4;
      const ty = Math.max(tn.minFeetY, p.y - tn.above) + Math.sin(game.tick * 0.09) * 3;
      const k = Math.min(1, tn.follow * dt);
      tw.x += (tx - tw.x) * k;
      tw.y += (ty - tw.y) * k;
      const want = this.active > 0 ? 1 : 0;
      tw.a += Math.sign(want - tw.a) * Math.min(Math.abs(want - tw.a), tn.fade * dt);
      if (tw.a <= 0 && this.active <= 0) this.twin = null;
      else if (Math.floor(game.tick) % 4 === 0) {
        game.particles.add({
          x: tw.x + game.camera - 10 + Math.random() * 20, y: tw.y - 10 - Math.random() * 30,
          vx: -1.4 - Math.random(), vy: -0.3, r: 2 + Math.random() * 2.5,
          kind: 'shadow', gravity: -0.01, life: 24, max: 24,
        });
      }
    }

    // ── SS6 จอมทำลาย: ข่วนโดนจริงที่เฟรม strikeAt หลังกด ──
    if (this.id === 'SS6' && this.active > 0 && !this.struck
        && this.t.duration - this.active >= tn.strikeAt) {
      this.struck = true;
      this.strike(game);
    }

    // ── SS5 เด้ง: แตะพื้นแล้วเด้งเอง เว้นแต่กดหมอบค้าง ──
    if (this.id === 'SS5') {
      if (p.onGround && !this.slideHeld && !p.sliding) {
        this.bounceWait += dt;
        if (this.bounceWait >= tn.delay) {
          this.bounceWait = 0;
          p.jump();
          this.fx.bounce = 1;
          game.particles.burst(p.box.x + game.camera + 20, GROUND_Y, 8, 'dust', 4);
          sfx.bounce();
        }
      } else {
        this.bounceWait = 0;
      }
    }

    // ── SS7 ลอย: ระดับบนสุดมีเวลาจำกัด ──
    if (this.id === 'SS7') {
      const top = tn.lanes.length - 1;
      if (this.lane === top) {
        this.topLeft -= dt;
        if (this.topLeft <= 0) {
          this.lane = top - 1;
          this.lockLeft = tn.lockFrames;
          this.fx.lane = 1;
          this.fx.laneDir = -1;
          sfx.slide();
        }
      } else if (this.lockLeft > 0) {
        this.lockLeft -= dt;
      }
      if (this.lane > 0 && p.sliding) p.slideHeld = false;
      // เมฆใต้ตัวทิ้งไอเป็นระยะ
      if (Math.floor(game.tick) % 6 === 0) {
        game.particles.add({
          x: p.box.x + game.camera + 8 + Math.random() * 24, y: p.y + 6,
          vx: -1.5, vy: 0.3, r: 3 + Math.random() * 3, kind: 'dust', life: 22, max: 22,
        });
      }
    }

    this.writeMods(p, game.bonus > 0);
  }

  /** เขียนค่า mods ของเฟรมนี้ — เรียกท้าย update และตอนผูกกับตัวละคร */
  writeMods(p, off) {
    const m = this.mods;
    Object.assign(m, NEUTRAL_MODS);
    if (!this.t || off) return;
    const tn = this.tune;
    switch (this.id) {
      case 'A1':
        m.airJumps = tn.airJumps;
        m.extraV = tn.extraV;
        break;
      case 'A2':
      case 'A3':
        m.gravity = tn.gravity;
        m.jump = tn.jump;
        break;
      case 'A4':
        m.hover = this.active > 0 && !p.onGround;
        break;
      case 'S1':
        if (this.gliding) m.maxFall = tn.maxFall;
        break;
      case 'S2':
        m.noFastFall = true;
        break;
      case 'SS7':
        m.laneY = tn.lanes[this.lane];
        m.laneEase = tn.ease;
        break;
      default:
    }
  }

  /** เท้าหนักลงพื้น — แมวหนักสั่นจอเบา ๆ */
  get landShake() {
    return this.id === 'A3' ? this.tune.landShake : 0;
  }
}

/** จุดอ้างอิงของเอฟเฟกต์ — กลางกล่องชนในพิกัดจอ (รวมระยะเลื่อน ox แล้ว) */
export function talentAnchor(game) {
  const b = game.player.box;
  return { x: b.x + b.w / 2, y: b.y + b.h / 2, feet: game.player.y, px: PLAYER_X };
}
