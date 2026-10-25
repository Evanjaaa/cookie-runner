// src/run-extras.js
//
// ══ ของใหม่ระหว่างวิ่ง (เกมเพลย์ใหม่ ขั้นที่ 3 — ผู้ใช้ตกลง 25 ต.ค. 2026 · GAME_PLAN.md ข้อ 8) ══
//
//   จุดเลเซอร์แดง  — แทนโบนัสตัวอักษร: จุดแดงโผล่วิ่งนำหน้าตามระยะที่กำหนด (ทุกคนเท่ากัน)
//                    ไล่จับให้ทันภายในไม่กี่วินาทีโดยไม่ชน = หลุดเข้าโลกโบนัส · ชน/ไม่ทัน = จุดแดงหนีไป
//   ปลาทอง         — นาน ๆ โผล่สักตัว (~2.5 นาที) ลอยระดับกระโดด เก็บได้ = หัวใจคืน 1 ดวง (เต็มอยู่แล้ว = คะแนนก้อน)
//   ภารกิจในรอบ    — เป้าเล็ก ๆ ทีละข้อ ทำสำเร็จ = ค่าขนม · ทุกข้อที่ 3 = หัวใจคืน 1 ดวง แล้วข้อใหม่มาต่อ
//                    (ผู้ใช้ 25 ต.ค.: เดิมทุกข้อแจกหัวใจ = คืนบ่อยเกินไป)
//   เหตุการณ์สุ่ม   — ช่วงสั้น ๆ ~12 วิ ที่กติกาเปลี่ยน (ขั้นที่ 4): หมาไล่ (โลกเร็วขึ้น) · ฝนตก (แอ่งน้ำ เหยียบ = คอมโบหาย)
//                    · ตลาดนัด (ของกินเต็มทาง) · กลางคืน (มองเห็นแคบรอบตัว) — สุ่มไม่ซ้ำแบบเดิมติดกัน
//
// Game เรียก: reset() ตอนเริ่มตา · update(game, dt, cx, cy) ทุกเฟรมวิ่งปกติ (ไม่ใช่โบนัส)
//   onTreat(midAir) / onHit() / onSkill() จากจุดที่เกิดเหตุ · draw(ctx, game) ในชั้นฉาก
// HUD อ่าน mission / missionDone ไปวาดเอง (render/hud.js drawMission)

import { VIEW, GROUND_Y, PLAYER_X, LIVES, LEVEL } from './config.js';
import { sfx } from './audio.js';
import { t as t2 } from './i18n.js';

/**
 * จุดเลเซอร์แดง — หน่วยเวลาเป็นเฟรม 60fps
 * ผู้ใช้ 25 ต.ค.: เดิมจับได้แทบทุกครั้ง (ลอยผ่านตัวช้า ๆ ช่วงอยู่ในระยะจับ ~73 เฟรม นานกว่าจังหวะสลับระดับ 54)
 * → มาห่างขึ้น · ผ่านตัวเร็วขึ้น (ช่วงจับได้ ~40 เฟรม) · สลับระดับถี่และสุ่มสามระดับ · ส่ายซ้ายขวา
 * ต้องดูจังหวะแล้วกระโดดให้ตรง ไม่ใช่วิ่งเฉย ๆ ก็ได้
 */
export const LASER = {
  firstAt: 60 * 60,     // โผล่ครั้งแรกหลังเริ่มวิ่ง (เดิม 45 วิ)
  every: 110 * 60,      // จากนั้นทุกเท่านี้ (นับเฉพาะเวลาวิ่งปกติ · เดิม 80 วิ)
  enter: 40,            // ลอยเข้าจอ
  chase: 210,           // ช่วงไล่จับ (~3.5 วิ · เดิม 4.5)
  catchR: 38,           // ระยะแตะจุดแดง (px จากกลางตัวน้อง · เดิม 46)
  hop: [30, 50],        // เปลี่ยนระดับทุก ๆ (สุ่มในช่วงนี้ เดาจังหวะไม่ได้ · เดิมตายตัว 54)
  dart: 26,             // ส่ายหน้า-หลังได้ไกลเท่านี้ (px)
  // กลาง (กระโดดเตี้ย) / สูง (กระโดดเต็มแรงหรือสองจังหวะ) — ไม่มีระดับพื้นแล้ว:
  // วัดจริงแล้ววิ่งเฉย ๆ ไม่กดอะไรก็ชนจุดแดงที่ระดับพื้นได้ 8 ใน 12 ครั้ง ต้องกระโดดจับเสมอ
  levels: [GROUND_Y - 95, GROUND_Y - 150],
};
/** ปลาทอง (หัวใจคืน) */
export const GOLDFISH = { firstAt: 90 * 60, every: 150 * 60, y: GROUND_Y - 112, r: 16, pickR: 42, bonus: 5000 };
/** ภารกิจในรอบ */
// treats = ค่าขนมของข้อปกติ (+step ต่อข้อ) · heartEvery = ข้อที่เท่าไหร่ได้หัวใจแทน (เต็มอยู่แล้ว = bonus)
export const MISSION = { gap: 6 * 60, treats: 2000, step: 500, heartEvery: 3, bonus: 5000, doneFrames: 150 };

/**
 * เหตุการณ์สุ่ม — เฟรม 60fps · fade = เข้า/ออก
 * danger = เหตุการณ์อันตราย: เตือนก่อน warn เฟรม (3 วิ) — ป้ายเตือนกลางจอ + เสียงหวอ + จอเรืองแดงเต้นแบบสัญญาณหนีไฟ
 * (ผู้ใช้ 25 ต.ค.) แล้วค่อยเกิดจริง · ตลาดนัดเป็นเรื่องดี ไม่ต้องเตือน
 */
export const EVENTS = {
  firstAt: 30 * 60,
  gap: [40 * 60, 60 * 60],   // หลังเหตุการณ์จบ รอสุ่มในช่วงนี้
  fade: 50,
  warn: 180,
  list: {
    dog: { name: 'หมาไล่! วิ่งหนีเร็ว', warnText: 'ระวัง! หมากำลังไล่มา', danger: true, dur: 12 * 60, speed: 1.3 },
    rain: { name: 'ฝนตก! ระวังแอ่งน้ำ', warnText: 'ระวัง! พายุฝนกำลังมา', danger: true, dur: 13 * 60, puddleEvery: 80, puddleW: 74, boltEvery: 230 },
    market: { name: 'ตลาดนัด! ของกินเต็มทาง', dur: 12 * 60, rowEvery: 55 },
    night: { name: 'กลางคืน! มองไม่ค่อยเห็น', warnText: 'ระวัง! ฟ้ากำลังมืด', danger: true, dur: 13 * 60, radius: 250 },
  },
};

/** ชุดภารกิจ — goal(i) = เป้าตามลำดับข้อที่ (ยากขึ้นเรื่อย ๆ) · text(goal) = ข้อความบน HUD */
const MISSIONS = [
  { kind: 'eat', goal: (i) => 40 + 20 * i, text: (g) => `เก็บของกิน ${g} ชิ้น` },
  { kind: 'combo', goal: (i) => 20 + 15 * i, text: (g) => `ทำคอมโบให้ถึง ${g}` },
  { kind: 'nohit', goal: (i) => (20 + 8 * i) * 60, text: (g) => `วิ่งไม่ชน ${Math.round(g / 60)} วิ` },
  { kind: 'air', goal: (i) => 12 + 8 * i, text: (g) => `เก็บของกลางอากาศ ${g} ชิ้น` },
  { kind: 'skill', goal: () => 1, text: () => 'ใช้สกิล 1 ครั้ง' },
];

export class RunExtras {
  constructor() { this.reset(); }

  reset() {
    this.t = 0;                      // เวลาวิ่งปกติสะสม (เฟรม)
    this.laserAt = LASER.firstAt;
    this.laser = null;               // { t, x, y, ty, phase: 'enter'|'chase'|'flee', fail }
    this.fishAt = GOLDFISH.firstAt;
    this.fish = null;                // { x, y, got }
    this.mIdx = 0;
    this.mLast = -1;
    this.mission = null;             // { kind, goal, n, text }
    this.mWait = 3 * 60;             // ข้อแรกมาหลังเริ่มวิ่งนิดหนึ่ง
    this.missionDone = 0;            // เฟรมนับถอยหลังป้าย "สำเร็จ" บน HUD
    this.doneM = null;               // ข้อที่เพิ่งสำเร็จ { text, prize } — HUD โชว์ค้างตอนฉลอง
    this.noHit = 0;
    this.evAt = EVENTS.firstAt;
    this.ev = null;                  // { id, t, dur, cfg }
    this.warn = null;                // เตือนก่อนเหตุการณ์อันตราย { id, t, cfg } — ครบ EVENTS.warn แล้วเกิดจริง
    this.flash = 0;                  // ฝนตก: ฟ้าแลบ (เฟรมนับถอยหลัง) · boltX = ตำแหน่งสายฟ้า
    this.boltX = 0;
    this.evLast = null;
    this.puddles = [];               // ฝนตก: แอ่งน้ำบนพื้น (พิกัดโลก)
    this.evTick = 0;
  }

  /** ความแรงของเหตุการณ์ตอนนี้ 0..1 (เข้า/ออกนุ่ม ๆ) */
  get evK() {
    const e = this.ev;
    if (!e) return 0;
    return Math.min(1, e.t / EVENTS.fade, (e.dur - e.t) / EVENTS.fade);
  }
  /** ตัวคูณความเร็วโลก (หมาไล่) — game.js คูณเข้า gdt */
  get speedK() {
    return this.ev?.id === 'dog' ? 1 + (this.ev.cfg.speed - 1) * Math.max(0, this.evK) : 1;
  }

  // ── เหตุการณ์จากเกม ──
  onTreat(midAir) {
    const m = this.mission;
    if (!m) return;
    if (m.kind === 'eat') m.n++;
    if (m.kind === 'air' && midAir) m.n++;
  }
  onHit() {
    this.noHit = 0;
    if (this.mission?.kind === 'nohit') this.mission.n = 0;
    // ไล่จับอยู่แล้วชน = จุดแดงหนี
    if (this.laser && this.laser.phase !== 'flee') { this.laser.phase = 'flee'; this.laser.t = 0; this.laser.fail = true; }
  }
  onSkill() {
    if (this.mission?.kind === 'skill') this.mission.n++;
  }

  /** รางวัลหัวใจคืน (หรือคะแนนก้อนถ้าเต็ม) · src = จุดที่หัวใจฟื้นแล้วบินกลับช่อง (ดู game.gainLife) */
  reward(game, why, src) {
    if (game.gainLife(src)) {
      game.noticeText = why + ' หัวใจ +1';
    } else {
      game.treat += MISSION.bonus;
      game.noticeText = why + ' +' + MISSION.bonus.toLocaleString('en-US');
    }
    game.notice = 110;
  }

  update(game, dt, cx, cy) {
    this.t += dt;
    this.noHit += dt;
    if (this.missionDone > 0) this.missionDone = Math.max(0, this.missionDone - dt);
    this.updateMission(game, dt);
    this.updateFish(game, dt, cx, cy);
    this.updateLaser(game, dt, cx, cy);
    this.updateEvent(game, dt, cx);
  }

  updateEvent(game, dt, cx) {
    // แอ่งน้ำที่วางไว้แล้วยังอยู่จนวิ่งผ่าน (ฝนหยุดแล้วก็ยังต้องหลบ)
    for (const p of this.puddles) {
      if (p.hit || !game.player.onGround) continue;
      if (cx > p.x && cx < p.x + p.w) {
        p.hit = true;
        game.breakCombo();
        game.particles.burst(cx, GROUND_Y - 4, 16, 'dust', 6);
        sfx.splash();
      }
    }
    this.puddles = this.puddles.filter((p) => p.x + p.w > game.camera - 60);

    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
    const w = this.warn;
    if (w) {
      w.t += dt;
      if (w.t >= EVENTS.warn) { this.warn = null; this.beginEvent(game, w.id); }
      return;
    }
    const e = this.ev;
    if (!e) {
      if (this.t < this.evAt || this.laser || game.skillFlying) return;
      const ids = Object.keys(EVENTS.list).filter((k) => k !== this.evLast);
      this.startEvent(game, ids[Math.floor(Math.random() * ids.length)]);
      return;
    }
    const before = e.t;
    e.t += dt;
    this.evTick += dt;
    const live = e.t > EVENTS.fade && e.t < e.dur - EVENTS.fade;
    if (e.id === 'dog' && this.evTick >= 90) { this.evTick = 0; sfx.eventDog(); }
    // ฝนตก: ฟ้าแลบ + ฟ้าร้องเป็นระยะ
    if (e.id === 'rain' && live && Math.floor(before / e.cfg.boltEvery) !== Math.floor(e.t / e.cfg.boltEvery)) {
      this.flash = 16;
      this.boltX = 120 + Math.random() * (VIEW.W - 240);
      sfx.thunder();
    }
    if (e.id === 'rain' && live && this.evTick >= e.cfg.puddleEvery) {
      this.evTick = 0;
      const x = game.camera + VIEW.W + 30;
      if (game.level.isClearSpot(x + e.cfg.puddleW / 2, e.cfg.puddleW / 2 + 20)) this.puddles.push({ x, w: e.cfg.puddleW, hit: false });
    }
    if (e.id === 'market' && live && this.evTick >= e.cfg.rowEvery) {
      this.evTick = 0;
      // แถวของกินลอยระดับต่าง ๆ — วางเฉพาะจุดที่ไม่ทับสิ่งกีดขวาง/หลุม
      const x0 = game.camera + VIEW.W + 30;
      const y = GROUND_Y - [40, 90, 140][Math.floor(Math.random() * 3)];
      for (let i = 0; i < 6; i++) {
        const x = x0 + i * 34;
        if (!game.level.isClearSpot(x, 18)) continue;
        game.level.fishes.push({ x, y: y - Math.sin((i / 5) * Math.PI) * 18, r: LEVEL.fishR, got: false, kind: 'fish' });
      }
    }
    if (e.t >= e.dur) {
      this.ev = null;
      this.evAt = this.t + EVENTS.gap[0] + Math.random() * (EVENTS.gap[1] - EVENTS.gap[0]);
    }
  }

  /** เริ่มเหตุการณ์ — อันตราย = เตือนก่อน 3 วิ (เสียงหวอ) แล้ว beginEvent เอง · debug.js เรียกตรงได้ */
  startEvent(game, id) {
    const cfg = EVENTS.list[id];
    this.evLast = id;
    this.ev = null;
    if (cfg.danger) {
      this.warn = { id, t: 0, cfg };
      sfx.siren();
      return;
    }
    this.beginEvent(game, id);
  }

  beginEvent(game, id) {
    const cfg = EVENTS.list[id];
    this.ev = { id, t: 0, dur: cfg.dur, cfg };
    this.evLast = id;
    this.evTick = 0;
    game.noticeText = cfg.name;
    game.notice = 130;
    const snd = sfx['event' + id[0].toUpperCase() + id.slice(1)];
    if (snd) snd();
  }

  updateMission(game, dt) {
    if (!this.mission) {
      this.mWait -= dt;
      if (this.mWait > 0) return;
      let k;
      do k = Math.floor(Math.random() * MISSIONS.length); while (k === this.mLast && MISSIONS.length > 1);
      this.mLast = k;
      const d = MISSIONS[k], goal = d.goal(this.mIdx);
      const heart = (this.mIdx + 1) % MISSION.heartEvery === 0;
      this.mission = { kind: d.kind, goal, n: 0, text: d.text(goal), heart, treats: MISSION.treats + MISSION.step * this.mIdx };
      return;
    }
    const m = this.mission;
    if (m.kind === 'combo') m.n = Math.max(m.n, game.combo);
    if (m.kind === 'nohit') m.n = this.noHit;
    if (m.n >= m.goal) {
      // หัวใจฟื้นตรงการ์ดภารกิจ (พิกัด HUD ซ้ายบน — ตรงกับ drawMission) แล้วบินกลับช่อง
      let prize = 'treat', amount = m.treats;
      if (m.heart) {
        this.reward(game, 'ภารกิจสำเร็จ!', { x: 46, y: 78, world: false });
        if (game.heartFx) prize = 'heart'; else amount = MISSION.bonus;
      } else {
        game.treat += amount;
        game.noticeText = 'ภารกิจสำเร็จ! +' + amount.toLocaleString('en-US');
        game.notice = 110;
      }
      this.doneM = { text: m.text, prize, amount };
      sfx.missionDone();
      this.mission = null;
      this.mIdx++;
      this.mWait = MISSION.gap;
      this.missionDone = MISSION.doneFrames;
    }
  }

  updateFish(game, dt, cx, cy) {
    const f = this.fish;
    if (f) {
      if (!f.got && Math.hypot(cx - f.x, cy - f.y) < GOLDFISH.pickR) {
        f.got = true;
        this.reward(game, 'ปลาทอง!', { x: f.x, y: f.y, world: true });
        game.particles.burst(f.x, f.y, 24, 'letter', 7);
        sfx.potion();
      }
      if (f.got || f.x < game.camera - 60) this.fish = null;
      return;
    }
    if (this.t < this.fishAt) return;
    // หาที่โล่งข้างหน้า (ไม่ลอยเหนือหลุม/สิ่งกีดขวาง) — ไม่มีที่ว่างก็รอเฟรมถัดไป
    const x = game.camera + VIEW.W + 40;
    if (!game.level.isClearSpot(x, 70)) return;
    this.fish = { x, y: GOLDFISH.y, got: false };
    this.fishAt = this.t + GOLDFISH.every;
  }

  updateLaser(game, dt, cx, cy) {
    const L = this.laser;
    if (!L) {
      if (this.t < this.laserAt || game.skillFlying || this.ev || this.warn) return;   // ไม่ชนกับเหตุการณ์สุ่ม
      this.laser = { t: 0, sx: VIEW.W + 30, y: LASER.levels[0], ty: LASER.levels[0], phase: 'enter', fail: false, hopT: 0, hopAt: LASER.hop[0] };
      this.laserAt = this.t + LASER.every;
      game.noticeText = 'จุดแดง! ไล่จับให้ทัน';
      game.notice = 120;
      sfx.letter(1);
      return;
    }
    L.t += dt;
    // จุดแดงลอยอยู่บนจอ (พิกัดจอ sx) — เข้าจอ → ไล่จับ: ค่อย ๆ ถอยเข้าหาน้อง สลับระดับสูง/ต่ำ → หนี
    if (L.phase === 'enter') {
      const u = Math.min(1, L.t / LASER.enter);
      L.sx = VIEW.W + 30 - (VIEW.W + 30 - (PLAYER_X + 300)) * (1 - (1 - u) ** 3);
      if (u >= 1) { L.phase = 'chase'; L.t = 0; }
    } else if (L.phase === 'chase') {
      const u = Math.min(1, L.t / LASER.chase);
      L.sx = PLAYER_X + 300 - 340 * u + Math.sin(L.t * 0.11) * LASER.dart;
      L.hopT += dt;
      if (L.hopT >= L.hopAt) {
        L.hopT = 0;
        L.hopAt = LASER.hop[0] + Math.random() * (LASER.hop[1] - LASER.hop[0]);
        const others = LASER.levels.filter((y) => y !== L.ty);
        L.ty = others[Math.floor(Math.random() * others.length)];
      }
      if (u >= 1) { L.phase = 'flee'; L.t = 0; L.fail = true; }
    } else {
      L.sx += 14 * dt;
      L.ty = LASER.levels[1] - 60;
      if (L.sx > VIEW.W + 80) { this.laser = null; return; }
    }
    L.y += (L.ty - L.y) * Math.min(1, 0.22 * dt);
    if (L.phase === 'chase') {
      const wx = game.camera + L.sx;
      if (Math.hypot(cx - wx, cy - L.y) < LASER.catchR) {
        this.laser = null;
        game.particles.burst(wx, L.y, 26, 'letter', 8);
        game.noticeText = 'จับจุดแดงได้!';
        game.notice = 90;
        game.startBonus();
      }
    }
  }

  // ── วาด (พิกัดจอ — ผู้เรียกอยู่ในชั้นฉากที่ x = โลก − camera) ──
  draw(ctx, game) {
    const t = game.tick;
    for (const p of this.puddles) drawPuddle(ctx, p.x - game.camera, p.w, p.hit, t, p.x);
    if (this.fish && !this.fish.got) drawGoldfish(ctx, this.fish.x - game.camera, this.fish.y + Math.sin(t * 0.08) * 6, t);
    const L = this.laser;
    if (L) drawLaser(ctx, L, t);
  }

  /** ชั้นบนสุดก่อน HUD (พิกัดจอ): ฝนตก · กลางคืน · หมาไล่ · ตลาดนัด · ป้ายเตือนก่อนเหตุการณ์อันตราย */
  drawScreen(ctx, game) {
    if (game.bonus > 0) return;
    const t = game.tick;
    ctx.save();
    const e = this.ev;
    if (e) {
      const k = Math.max(0, this.evK);
      if (e.id === 'night') drawNight(ctx, game, e, k, t);
      if (e.id === 'rain') drawRain(ctx, k, t, this.flash, this.boltX);
      if (e.id === 'market') drawMarket(ctx, k, t);
      if (e.id === 'dog') {
        drawSpeedLines(ctx, k, t);
        drawDog(ctx, 70 - (1 - k) * 200, GROUND_Y, t, 1.15);
      }
    }
    if (this.warn) drawWarning(ctx, this.warn, t);
    ctx.restore();
  }
}

// ══ ภาพเหตุการณ์ (ผู้ใช้ 25 ต.ค. 2026: ปรับให้สวย ละเอียดขึ้น ค่อย ๆ แต่ง) ══════════════

const TAU = Math.PI * 2;
const { W: VW, H: VH } = VIEW;

/** ดาวสี่แฉก */
function sparkle4(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

// ── ป้ายเตือน: สัญญาณหนีไฟ ─────────────────────────────────────
// จอเรืองแดงจากขอบเต้นตามจังหวะหวอ (0.7 วิ/รอบ) · แถบเหลือง-ดำเลื่อนบน/ล่าง
// ป้ายสามเหลี่ยม "!" เด้งกลางจอ + ป้ายแดงบอกว่าอะไรกำลังมา + วงนับถอยหลัง 3-2-1
function drawWarning(ctx, w, t) {
  const n = EVENTS.warn;
  const a = Math.min(1, w.t / 12, (n - w.t) / 10);
  if (a <= 0) return;
  const pulse = 0.5 + 0.5 * Math.sin((w.t / 42) * TAU - Math.PI / 2);
  ctx.save();
  ctx.globalAlpha = a;
  // แสงแดงทั้งจอ + ขอบเข้ม
  ctx.fillStyle = `rgba(255,30,50,${0.06 + 0.1 * pulse})`;
  ctx.fillRect(-400, -400, VW + 800, VH + 800);
  const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VW * 0.62);
  vg.addColorStop(0, 'rgba(255,20,40,0)');
  vg.addColorStop(1, `rgba(230,10,30,${0.3 + 0.4 * pulse})`);
  ctx.fillStyle = vg;
  ctx.fillRect(-400, -400, VW + 800, VH + 800);
  // แถบเหลือง-ดำเลื่อน (ล่างจอ) — บนจอโดน HUD บังจึงไม่ทำ
  const bh = 12, by = VH - bh;
  ctx.save();
  ctx.beginPath(); ctx.rect(-400, by, VW + 800, bh); ctx.clip();
  ctx.fillStyle = '#FFD23F';
  ctx.fillRect(-400, by, VW + 800, bh);
  ctx.fillStyle = '#2A1A10';
  const off = (w.t * 1.5) % 28;
  for (let x = -420 + off; x < VW + 420; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, by + bh); ctx.lineTo(x + 12, by); ctx.lineTo(x + 24, by); ctx.lineTo(x + 12, by + bh);
    ctx.fill();
  }
  ctx.restore();

  // ป้ายสามเหลี่ยม "!" — เด้งเข้า แล้วเต้นตามหวอ
  const cx = VW / 2, cy = VH * 0.43;   // ใต้ป้ายแจ้งข่าวกลางบน (drawNotice) — สูงกว่านี้สามเหลี่ยมชนป้ายนั้น
  const pop = Math.min(1, w.t / 14);
  const s = (pop < 1 ? 0.4 + 0.75 * Math.sin(pop * Math.PI * 0.62) : 1) * (1 + 0.07 * pulse);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.rotate(Math.sin(w.t * 0.5) * 0.04 * pulse);
  const tri = (R) => {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const an = -Math.PI / 2 + i * (TAU / 3);
      const px = Math.cos(an) * R, py = Math.sin(an) * R + R * 0.18;
      const nx = Math.cos(an + TAU / 3) * R, ny = Math.sin(an + TAU / 3) * R + R * 0.18;
      if (i === 0) ctx.moveTo((px + nx) / 2, (py + ny) / 2);
      ctx.arcTo(nx, ny, nx + (Math.cos(an + 2 * TAU / 3) * R - nx) / 2, ny + (Math.sin(an + 2 * TAU / 3) * R + R * 0.18 - ny) / 2, R * 0.16);
    }
    ctx.closePath();
  };
  // ผู้ใช้ 25 ต.ค. (ขัดเกลา UI): เล็กลง ~12% · ขอบครีมบางลง · เรืองแดงเบาลง ไม่บังพื้นที่เล่นเกินจำเป็น
  ctx.scale(0.88, 0.88);
  ctx.shadowColor = `rgba(233,90,105,${0.45 + 0.35 * pulse})`;
  ctx.shadowBlur = 10 + 8 * pulse;
  ctx.fillStyle = '#FFF6E6';
  tri(48.6);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#E95A69';
  tri(47);
  ctx.fill();
  const yg = ctx.createLinearGradient(0, -36, 0, 30);
  yg.addColorStop(0, '#FFF08A');
  yg.addColorStop(1, '#FFC21F');
  ctx.fillStyle = yg;
  tri(38);
  ctx.fill();
  ctx.fillStyle = '#2A1A10';
  ctx.beginPath(); ctx.roundRect(-4.5, -16, 9, 25, 4.5); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 17, 5, 0, TAU); ctx.fill();
  ctx.restore();

  // ป้ายข้อความแดง + วงนับถอยหลัง
  const label = t2(w.cfg.warnText);
  ctx.font = "800 18px Mali, sans-serif";
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const iconW = 30;
  const tw = ctx.measureText(label).width;
  const ph = 35, pw = iconW + tw + 28 + 40;
  const px = cx - pw / 2, py = cy + 52;
  ctx.fillStyle = 'rgba(40,0,10,.22)';
  ctx.beginPath(); ctx.roundRect(px - 1.2, py + 2, pw + 2.4, ph + 2.4, ph / 2 + 1.2); ctx.fill();
  ctx.fillStyle = '#FFF6E6';
  ctx.beginPath(); ctx.roundRect(px - 1.2, py - 1.2, pw + 2.4, ph + 2.4, ph / 2 + 1.2); ctx.fill();
  const rg = ctx.createLinearGradient(0, py, 0, py + ph);
  rg.addColorStop(0, '#F47A86');
  rg.addColorStop(1, '#D9404F');
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, ph / 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.beginPath(); ctx.roundRect(px + 14, py + 3, pw - 28, 9, 4.5); ctx.fill();
  drawWarnIcon(ctx, w.id, px + 14 + iconW / 2, py + ph / 2, t);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = '#7A0A1E';
  ctx.strokeText(label, px + 14 + iconW + 6, py + ph / 2 + 1);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(label, px + 14 + iconW + 6, py + ph / 2 + 1);
  // วงนับถอยหลัง 3-2-1 (เด้งทุกครั้งที่เลขเปลี่ยน)
  const left = Math.max(1, Math.ceil(((n - w.t) / n) * 3));
  const sub = 1 - (((n - w.t) / n) * 3 - (left - 1));
  const bump = 1 + 0.3 * Math.max(0, 1 - sub * 4);
  const bx = px + pw - 20, byy = py + ph / 2, br = 14 * bump;
  ctx.fillStyle = '#FFF6E6';
  ctx.beginPath(); ctx.arc(bx, byy, br + 1.2, 0, TAU); ctx.fill();
  const cg = ctx.createLinearGradient(0, byy - br, 0, byy + br);
  cg.addColorStop(0, '#FFF08A');
  cg.addColorStop(1, '#FFB21F');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.arc(bx, byy, br, 0, TAU); ctx.fill();
  ctx.font = `800 ${Math.round(18 * bump)}px Mali, sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#7A3A00';
  ctx.strokeText(String(left), bx, byy + 1);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(String(left), bx, byy + 1);
  ctx.restore();
}

/** ไอคอนในป้ายเตือน: อุ้งเท้าหมา / เมฆฝน / พระจันทร์ — วาดสีขาวบนป้ายแดง */
function drawWarnIcon(ctx, id, x, y, t) {
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#6E0014';
  ctx.lineWidth = 3;
  if (id === 'dog') {
    const pad = () => {
      ctx.beginPath(); ctx.ellipse(x, y + 4, 7.5, 6.2, 0, 0, TAU);
      for (const [dx, dy, r] of [[-8.5, -3, 3.4], [-3, -8.5, 3.6], [3, -8.5, 3.6], [8.5, -3, 3.4]]) {
        ctx.moveTo(x + dx + r, y + dy); ctx.arc(x + dx, y + dy, r, 0, TAU);
      }
    };
    pad(); ctx.stroke(); pad(); ctx.fill();
  } else if (id === 'rain') {
    const cloud = () => {
      ctx.beginPath();
      ctx.arc(x - 6, y - 1, 6.5, 0, TAU);
      ctx.moveTo(x + 9, y - 3); ctx.arc(x + 2, y - 4, 8, 0, TAU);
      ctx.moveTo(x + 15, y); ctx.arc(x + 9, y, 6, 0, TAU);
      ctx.roundRect(x - 12, y - 1, 26, 7, 3.5);
    };
    cloud(); ctx.stroke(); cloud(); ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const o = ((t * 0.5 + i * 4) % 8);
      ctx.beginPath(); ctx.moveTo(x - 6 + i * 6, y + 9 + o * 0.4); ctx.lineTo(x - 8 + i * 6, y + 13 + o * 0.4); ctx.stroke();
    }
  } else {
    const moon = () => {
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, TAU);
    };
    moon(); ctx.stroke(); moon(); ctx.fill();
    ctx.fillStyle = '#E2213C';
    ctx.beginPath(); ctx.arc(x + 5, y - 4, 8.5, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ── หมาไล่ ────────────────────────────────────────────────────
// หมาชิบะตัวกลม ๆ หัวโต (สัดส่วนน่ารักแบบเดียวกับน้องแมว — ผู้ใช้ 25 ต.ค. ขอวาดใหม่ให้สวยขึ้น · เส้นขอบบาง ~2)
// วิ่งควบ (ขาหน้าคู่/ขาหลังคู่สลับกัน) ตัวเด้ง หางม้วนสะบัด หูตั้งพลิ้ว คิ้วจุดแบบชิบะ + คิ้วขมวด
// เห่า = อ้าปากเห็นเขี้ยวกับลิ้น (จังหวะเดียวกับ dogBark ที่น้องแมวใช้สะดุ้ง) · ไม่เห่า = แลบลิ้นหอบ
// พิกัดในตัว: หันขวา (0,0) = พื้นใต้กลางตัว · s = ขนาด
const DOG = {
  fur: '#E8964F', furHi: '#F7BC7E', furDark: '#C46F34', cream: '#FFF3E0',
  ink: '#5A3218', nose: '#2B1A10', inner: '#F7A6B4', tongue: '#FF7D93', mouth: '#8A2638',
};

/** จังหวะเห่า (0..1) — หมาอ้าปาก / น้องแมวสะดุ้งตาปิดพร้อมกัน */
export function dogBark(t) {
  return Math.max(0, Math.min(1, (Math.sin(t * 0.25) - 0.45) / 0.2));
}

/** ขาหมาสองท่อน (ต้นขา-แข้ง) อ้วนกลม + อุ้งเท้าครีม · a = มุมแกว่ง (0 = ตั้งตรง · + = ไปข้างหน้า) */
function dogLeg(ctx, hx, hy, a, bend, far) {
  const L1 = 11, L2 = 11;
  const kx = hx + Math.sin(a) * L1, ky = hy + Math.cos(a) * L1;
  const b = a + bend;
  const px = kx + Math.sin(b) * L2, py = ky + Math.cos(b) * L2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = DOG.ink;
  ctx.lineWidth = 11.4;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(px, py); ctx.stroke();
  ctx.strokeStyle = far ? DOG.furDark : DOG.fur;
  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(px, py); ctx.stroke();
  // ถุงเท้าครีมปลายขา + อุ้งเท้า
  ctx.strokeStyle = far ? '#EAD6BC' : DOG.cream;
  ctx.lineWidth = 9;
  const sx = kx + (px - kx) * 0.55, sy = ky + (py - ky) * 0.55;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(px, py); ctx.stroke();
  ctx.fillStyle = DOG.ink;
  ctx.beginPath(); ctx.ellipse(px + 2, py + 0.8, 6, 4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = far ? '#EAD6BC' : DOG.cream;
  ctx.beginPath(); ctx.ellipse(px + 2, py + 0.6, 5, 3.2, 0, 0, TAU); ctx.fill();
}

function drawDog(ctx, x, gy, t, s = 1) {
  const ph = t * 0.45;
  const bob = -Math.abs(Math.cos(ph)) * 4.5;
  const pitch = Math.sin(ph) * 0.06;
  const bk = dogBark(t);
  const bark = bk > 0;
  ctx.save();
  ctx.translate(x, gy);
  ctx.scale(s, s);

  // ฝุ่นฟุ้งหลังเท้า
  for (let i = 0; i < 5; i++) {
    const u = ((t * 0.035 + i / 5) % 1);
    ctx.globalAlpha = 0.5 * (1 - u);
    ctx.fillStyle = '#EFE3D0';
    ctx.beginPath(); ctx.arc(-30 - u * 46, -4 - u * 10 + (i % 2) * 3, 5 + u * 9, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // เงาใต้ตัว
  ctx.fillStyle = 'rgba(40,20,10,.22)';
  ctx.beginPath(); ctx.ellipse(4, 1, 36 + bob, 4.5, 0, 0, TAU); ctx.fill();

  ctx.translate(0, bob);
  ctx.rotate(pitch);

  // ขาข้างไกล (สีเข้ม) — วิ่งควบ: คู่หน้ากับคู่หลังแกว่งสวนกัน
  const fa = Math.sin(ph) * 0.95, ba = Math.sin(ph + Math.PI) * 0.95;
  dogLeg(ctx, 15, -22, Math.sin(ph + 0.4) * 0.95, -0.5, true);
  dogLeg(ctx, -17, -22, Math.sin(ph + Math.PI + 0.4) * 0.95, 0.45, true);

  // หางม้วนแบบชิบะ (สะบัดรอบโคนหาง)
  ctx.save();
  ctx.translate(-26, -38);
  ctx.rotate(Math.sin(t * 0.6) * 0.18);
  const tail = () => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-12, -4, -16, -22, -4, -24);
    ctx.bezierCurveTo(6, -25, 8, -13, 0, -12);
  };
  ctx.lineCap = 'round';
  ctx.strokeStyle = DOG.ink; ctx.lineWidth = 11.4; tail(); ctx.stroke();
  ctx.strokeStyle = DOG.fur; ctx.lineWidth = 9; tail(); ctx.stroke();
  ctx.strokeStyle = DOG.cream; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-9, -18); ctx.bezierCurveTo(-8, -23, -1, -24, 2, -19); ctx.stroke();
  ctx.restore();

  // ตัว: ทรงถั่วอ้วน อกครีม ท้องครีม
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(-30, -30);
    ctx.bezierCurveTo(-31, -46, -14, -50, 4, -48);
    ctx.bezierCurveTo(20, -46, 30, -40, 28, -26);
    ctx.bezierCurveTo(26, -14, 10, -12, -6, -13);
    ctx.bezierCurveTo(-22, -14, -30, -18, -30, -30);
    ctx.closePath();
  };
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = DOG.ink;
  body(); ctx.stroke();
  const bg = ctx.createLinearGradient(0, -50, 0, -12);
  bg.addColorStop(0, DOG.furHi);
  bg.addColorStop(0.55, DOG.fur);
  bg.addColorStop(1, DOG.furDark);
  ctx.fillStyle = bg;
  body(); ctx.fill();
  ctx.save();
  body(); ctx.clip();
  ctx.fillStyle = DOG.cream;
  ctx.beginPath(); ctx.ellipse(21, -26, 10, 14, -0.15, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -12, 22, 6, 0, 0, TAU); ctx.fill();
  // ขนไฮไลต์บนหลัง
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.beginPath(); ctx.ellipse(-6, -44, 16, 4, -0.08, 0, TAU); ctx.fill();
  ctx.restore();

  // ขาข้างใกล้
  dogLeg(ctx, 17, -20, fa, -0.5, false);
  dogLeg(ctx, -15, -20, ba, 0.45, false);

  // หัว
  ctx.save();
  ctx.translate(31, -50);
  ctx.rotate(-pitch * 1.3 + Math.sin(ph * 2) * 0.025);
  // ปลอกคอแดงคาดคอ + ป้ายทองห้อย (วาดก่อนหัว หัวทับขอบบน)
  ctx.save();
  ctx.translate(-12, 11);
  ctx.rotate(1.2);
  ctx.fillStyle = DOG.ink;
  ctx.beginPath(); ctx.roundRect(-10.8, -4.2, 21.6, 8.4, 4.2); ctx.fill();
  ctx.fillStyle = '#E8334A';
  ctx.beginPath(); ctx.roundRect(-10, -3.2, 20, 6.4, 3.2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.fillRect(-8, -2.4, 16, 1.4);
  ctx.restore();
  ctx.fillStyle = '#FFD23F';
  ctx.strokeStyle = DOG.ink;
  ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.arc(-6 + Math.sin(ph) * 2, 18, 3.8, 0, TAU); ctx.fill(); ctx.stroke();
  // หูข้างไกล (ตั้ง ปลายพลิ้วตามจังหวะวิ่ง)
  const flap = Math.sin(ph) * 0.12;
  const ear = (ex, ey, rot, far) => {
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(rot + flap);
    ctx.beginPath();
    ctx.moveTo(-8, 2);
    ctx.quadraticCurveTo(-6, -12, 1, -18);
    ctx.quadraticCurveTo(7, -10, 8, 2);
    ctx.closePath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = DOG.ink;
    ctx.stroke();
    ctx.fillStyle = far ? DOG.furDark : DOG.fur;
    ctx.fill();
    ctx.fillStyle = far ? '#D98A92' : DOG.inner;
    ctx.beginPath();
    ctx.moveTo(-4, 1);
    ctx.quadraticCurveTo(-3, -8, 1, -12);
    ctx.quadraticCurveTo(4, -6, 4.5, 1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  ear(-11, -15, -0.35, true);
  // ศีรษะกลม แก้มป่อง
  const head = () => {
    ctx.beginPath();
    ctx.moveTo(-18, 4);
    ctx.bezierCurveTo(-24, -10, -15, -24, 0, -24);
    ctx.bezierCurveTo(15, -24, 23, -13, 22, -2);
    ctx.bezierCurveTo(21, 9, 9, 15, 0, 15);
    ctx.bezierCurveTo(-10, 15, -16, 12, -18, 4);
    ctx.closePath();
  };
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = DOG.ink;
  head(); ctx.stroke();
  const hg = ctx.createLinearGradient(0, -24, 0, 15);
  hg.addColorStop(0, DOG.furHi);
  hg.addColorStop(1, DOG.fur);
  ctx.fillStyle = hg;
  head(); ctx.fill();
  // แก้ม/คางครีม
  ctx.save();
  head(); ctx.clip();
  ctx.fillStyle = DOG.cream;
  ctx.beginPath(); ctx.ellipse(8, 9, 17, 9, -0.1, 0, TAU); ctx.fill();
  ctx.restore();
  ear(3, -19, 0.12, false);
  // ปากกระบอกครีมยื่น + จมูก
  ctx.fillStyle = DOG.ink;
  ctx.beginPath(); ctx.ellipse(21, 2, 10, 7.6, -0.05, 0, TAU); ctx.fill();
  ctx.fillStyle = DOG.cream;
  ctx.beginPath(); ctx.ellipse(21, 2, 9, 6.6, -0.05, 0, TAU); ctx.fill();
  // ปาก: เห่า = อ้ากว้างเห็นเขี้ยว+ลิ้น · ไม่เห่า = แลบลิ้นหอบ
  if (bark) {
    const o = 2 + 6 * bk;
    ctx.fillStyle = DOG.ink;
    ctx.beginPath();
    ctx.moveTo(13, 5); ctx.quadraticCurveTo(22, 6, 29, 5);
    ctx.quadraticCurveTo(26, 8 + o * 1.4, 18, 8 + o);
    ctx.quadraticCurveTo(13, 8 + o * 0.6, 13, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = DOG.mouth;
    ctx.beginPath();
    ctx.moveTo(14.5, 6.2); ctx.quadraticCurveTo(22, 7, 27.4, 6.2);
    ctx.quadraticCurveTo(25, 7.6 + o * 1.25, 18, 7 + o * 0.95);
    ctx.quadraticCurveTo(15, 7 + o * 0.5, 14.5, 6.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = DOG.tongue;
    ctx.beginPath(); ctx.ellipse(19.5, 7.4 + o * 0.75, 5, 2.4, 0.1, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.moveTo(24.5, 6.4); ctx.lineTo(26, 6.4); ctx.lineTo(25.2, 9.4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(16, 6.4); ctx.lineTo(17.5, 6.4); ctx.lineTo(16.8, 9); ctx.closePath(); ctx.fill();
  } else {
    ctx.strokeStyle = DOG.ink;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(15, 6); ctx.quadraticCurveTo(18.5, 8.5, 21.5, 6); ctx.quadraticCurveTo(24.5, 8.5, 28, 6); ctx.stroke();
    const sw = Math.sin(t * 0.5) * 1.2;
    ctx.fillStyle = DOG.ink;
    ctx.beginPath(); ctx.ellipse(18.5 + sw * 0.3, 11.5, 4.2, 5.4, 0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = DOG.tongue;
    ctx.beginPath(); ctx.ellipse(18.5 + sw * 0.3, 11.5, 3, 4.2, 0.15, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(160,40,70,.6)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(18.5 + sw * 0.3, 8.5); ctx.lineTo(18.7 + sw * 0.3, 13); ctx.stroke();
  }
  ctx.fillStyle = DOG.nose;
  ctx.beginPath(); ctx.ellipse(29, -1.5, 4.4, 3.4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.65)';
  ctx.beginPath(); ctx.ellipse(28, -2.8, 1.6, 0.9, -0.3, 0, TAU); ctx.fill();
  // ตาโตกลมเป็นประกาย (ตาปิดครึ่งตอนเห่า) + คิ้วจุดชิบะ + คิ้วขมวด
  ctx.fillStyle = DOG.nose;
  ctx.beginPath(); ctx.ellipse(9, -8, 3.8, 4.6 * (1 - bk * 0.35), 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(10.2, -9.6, 1.5, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(8, -6.6, 0.7, 0, TAU); ctx.fill();
  ctx.fillStyle = DOG.cream;
  ctx.beginPath(); ctx.ellipse(6, -15.5, 3.2, 2, -0.2, 0, TAU); ctx.fill();
  ctx.strokeStyle = DOG.ink;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(3.5, -14.5 + bk); ctx.lineTo(13.5, -11.5); ctx.stroke();
  // แก้มแดง
  ctx.fillStyle = 'rgba(255,120,130,.42)';
  ctx.beginPath(); ctx.ellipse(4, 3, 4.4, 2.6, 0, 0, TAU); ctx.fill();
  ctx.restore();

  // ฟอง "โฮ่ง!" ตอนเห่า
  if (bark) {
    ctx.save();
    ctx.translate(74, -96);
    ctx.scale(0.7 + 0.3 * bk, 0.7 + 0.3 * bk);
    ctx.font = "800 15px Mali, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const word = t2('โฮ่ง!');
    const ww = ctx.measureText(word).width + 18;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = DOG.ink;
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.roundRect(-ww / 2, -13, ww, 26, 13); ctx.moveTo(-10, 11); ctx.lineTo(-18, 22); ctx.lineTo(-2, 12);
    ctx.stroke(); ctx.fill();
    ctx.fillStyle = '#E8334A';
    ctx.fillText(word, 0, 1);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * น้องแมวตกใจตอนหนีหมา — วาดในชั้นตัวน้อง (game.js) เหนือหัว
 * เส้นตกใจสามขีด (สั่นแรงขึ้นตอนหมาเห่า) · หยดเหงื่อปลิวไปข้างหลัง
 * (เคยมีวง "!" ด้วย — ผู้ใช้ 25 ต.ค. ให้เอาออก)
 * @param k ความแรงของเหตุการณ์ 0..1 (เข้า/ออกนุ่ม)
 */
export function drawScared(ctx, x, y, t, k) {
  if (k <= 0.02) return;
  const bk = dogBark(t);
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 1.5);
  // เส้นตกใจสามขีด (ข้างหัว)
  ctx.strokeStyle = '#E2463F';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  const jit = bk * 2;
  for (let i = 0; i < 3; i++) {
    const a = -0.5 - i * 0.55;
    const r0 = 13 + jit, r1 = 21 + jit + 3 * Math.sin(t * 0.4 + i);
    ctx.beginPath();
    ctx.moveTo(x - 30 + Math.cos(a) * r0, y + 12 + Math.sin(a) * r0);
    ctx.lineTo(x - 30 + Math.cos(a) * r1, y + 12 + Math.sin(a) * r1);
    ctx.stroke();
  }
  // หยดเหงื่อปลิวไปข้างหลัง (วนทุก ~1 วิ)
  const u = (t % 60) / 60;
  ctx.globalAlpha = Math.min(1, k * 1.5) * (1 - u);
  const dx = x - 50 - u * 22, dy = y + 20 - u * 6 + u * u * 16;   // หลังหัว ไม่ทับหน้า
  ctx.fillStyle = '#8FD3FF';
  ctx.strokeStyle = '#2E6FA8';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(dx, dy - 6);
  ctx.quadraticCurveTo(dx + 4.5, dy, dx, dy + 3.5);
  ctx.quadraticCurveTo(dx - 4.5, dy, dx, dy - 6);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

/** หมาไล่: เส้นความเร็วพุ่งผ่านจอ (โลกเร็วขึ้น) */
function drawSpeedLines(ctx, k, t) {
  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${0.35 * k})`;
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const len = 40 + (i * 37) % 70;
    const x = VW - ((t * 22 + i * 173) % (VW + 300)) + 150;
    const y = 60 + ((i * 89) % (VH - 120));
    ctx.lineWidth = 1.2 + (i % 3) * 0.6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
  }
  ctx.restore();
}

// ── ฝนตก ──────────────────────────────────────────────────────
// ฟ้าครึ้มไล่จากบน · เมฆฝนลอยช้า ๆ · ฝนสองชั้น (ไกลบาง/ใกล้หนา) · ละอองกระเด็นบนพื้น · ฟ้าแลบ + สายฟ้า
function drawRain(ctx, k, t, flash, boltX) {
  ctx.save();
  const sky = ctx.createLinearGradient(0, -400, 0, VH * 0.75);
  sky.addColorStop(0, `rgba(40,50,80,${0.6 * k})`);
  sky.addColorStop(1, `rgba(70,90,140,${0.12 * k})`);
  ctx.fillStyle = sky;
  ctx.fillRect(-400, -400, VW + 800, VH + 800);
  // เมฆฝน
  for (let i = 0; i < 6; i++) {
    const cx = ((i * 211 - t * 0.25) % (VW + 300) + VW + 300) % (VW + 300) - 150;
    const cy = 8 + (i % 3) * 14;
    ctx.globalAlpha = 0.92 * k;
    const cg = ctx.createLinearGradient(0, cy - 34, 0, cy + 30);
    cg.addColorStop(0, i % 2 ? '#8A93AB' : '#9AA3BA');
    cg.addColorStop(1, i % 2 ? '#4A5168' : '#565E76');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(cx - 58, cy + 26);
    ctx.arc(cx - 36, cy + 8, 24, Math.PI * 0.75, Math.PI * 1.6);
    ctx.arc(cx, cy - 2, 34, Math.PI * 1.15, Math.PI * 1.85);
    ctx.arc(cx + 40, cy + 8, 26, Math.PI * 1.4, Math.PI * 0.25);
    ctx.lineTo(cx + 58, cy + 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath(); ctx.ellipse(cx - 6, cy - 18, 20, 9, -0.2, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // ฝน: ชั้นไกล
  ctx.strokeStyle = `rgba(200,215,245,${0.32 * k})`;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (let i = 0; i < 60; i++) {
    const x = ((i * 83 + t * 6) % (VW + 120)) - 60, y = ((i * 47 + t * 11) % (VH + 60)) - 30;
    ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 11);
  }
  ctx.stroke();
  // ฝน: ชั้นใกล้
  ctx.strokeStyle = `rgba(232,242,255,${0.6 * k})`;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 0; i < 46; i++) {
    const x = ((i * 131 + t * 10) % (VW + 160)) - 80, y = ((i * 71 + t * 19) % (VH + 80)) - 40;
    ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 20);
  }
  ctx.stroke();
  // ละอองกระเด็นบนพื้น
  ctx.strokeStyle = `rgba(232,242,255,${0.7 * k})`;
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 16; i++) {
    const u = ((t * 0.05 + i * 0.37) % 1);
    const x = (i * 157 + Math.floor(t * 0.05 + i * 0.37) * 97) % VW;
    ctx.globalAlpha = (1 - u) * k;
    ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 1, 3 + u * 9, 1 + u * 2.4, 0, Math.PI, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(232,242,255,.8)';
    ctx.beginPath(); ctx.arc(x - 4 - u * 4, GROUND_Y - 3 - u * 8 + u * u * 6, 1.3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 4 + u * 4, GROUND_Y - 3 - u * 7 + u * u * 6, 1.3, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // ฟ้าแลบ
  if (flash > 0) {
    const f = flash / 16;
    ctx.fillStyle = `rgba(235,240,255,${0.5 * f * f * k})`;
    ctx.fillRect(-400, -400, VW + 800, VH + 800);
    if (flash > 9) {
      ctx.strokeStyle = 'rgba(255,255,230,.95)';
      ctx.shadowColor = 'rgba(200,220,255,1)';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let x = boltX, y = 20;
      ctx.moveTo(x, y);
      for (let i = 1; i <= 6; i++) {
        x += ((i * 37 + boltX) % 30) - 15;
        y += 26;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** แอ่งน้ำ (ฝนตก) — น้ำสะท้อนฟ้า ขอบเข้ม วงน้ำกระเพื่อมจากเม็ดฝน · เหยียบแล้วน้ำแตกกระจายจางลง */
function drawPuddle(ctx, x, w, hit, t, seed) {
  const cx = x + w / 2, cy = GROUND_Y + 3, rx = w / 2;
  ctx.save();
  ctx.globalAlpha = hit ? 0.45 : 1;
  ctx.fillStyle = 'rgba(30,50,90,.4)';
  ctx.beginPath(); ctx.ellipse(cx, cy + 1, rx + 4, 8.5, 0, 0, TAU); ctx.fill();
  const g = ctx.createLinearGradient(0, cy - 7, 0, cy + 7);
  g.addColorStop(0, '#BFE4FF');
  g.addColorStop(1, '#3D7FD6');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, 6.5, 0, 0, TAU); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, 6.5, 0, 0, TAU); ctx.clip();
  // แสงสะท้อน
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath(); ctx.ellipse(cx - rx * 0.35, cy - 2.5, rx * 0.32, 1.6, -0.05, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.beginPath(); ctx.ellipse(cx + rx * 0.3, cy - 1, rx * 0.15, 1.1, 0, 0, TAU); ctx.fill();
  // วงน้ำกระเพื่อม 2 วง
  ctx.strokeStyle = 'rgba(240,250,255,.8)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 2; i++) {
    const u = ((t * 0.025 + i * 0.5 + (seed % 7) * 0.13) % 1);
    const px = cx + (i ? 0.3 : -0.25) * rx;
    ctx.globalAlpha = (hit ? 0.45 : 1) * (1 - u);
    ctx.beginPath(); ctx.ellipse(px, cy, 3 + u * 14, (3 + u * 14) * 0.28, 0, 0, TAU); ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

// ── ตลาดนัด ────────────────────────────────────────────────────
// ธงราวสองสาย (ผืนสามเหลี่ยมขอบขาวแกว่ง) · ไฟประดับดวงกลมเรืองกระพริบสลับ · กระดาษสีโปรยช้า ๆ
// (มุมบนเป็นที่ของ HUD — ของตกแต่งชิ้นใหญ่วางตรงนั้นจะโดนบังมิด)
const MARKET_COLS = ['#FF7EC8', '#FFD86B', '#7ED9F0', '#9BE38A', '#FF9A3D', '#C49EFF'];
function drawMarket(ctx, k, t) {
  ctx.save();
  ctx.globalAlpha = k;
  const drop = (1 - k) * -60;   // ธงราวหย่อนลงมาตอนเริ่ม
  const string = (y0, sag, n, phase, size) => {
    ctx.strokeStyle = 'rgba(110,70,50,.9)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-10, y0); ctx.quadraticCurveTo(VW / 2, y0 + sag * 2, VW + 10, y0); ctx.stroke();
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, x = u * VW, y = y0 + sag * 4 * u * (1 - u) * 0.98;
      const sw = Math.sin(t * 0.07 + i * 0.9 + phase) * 0.12;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(sw);
      ctx.fillStyle = '#FFF6E6';
      ctx.beginPath(); ctx.moveTo(-size - 2, -1); ctx.lineTo(size + 2, -1); ctx.lineTo(0, size * 1.9 + 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = MARKET_COLS[(i + Math.round(phase)) % MARKET_COLS.length];
      ctx.beginPath(); ctx.moveTo(-size, 0); ctx.lineTo(size, 0); ctx.lineTo(0, size * 1.9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.beginPath(); ctx.moveTo(-size * 0.55, 2); ctx.lineTo(size * 0.55, 2); ctx.lineTo(0, size * 1.05); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  };
  ctx.translate(0, drop);
  string(4, 24, 18, 0, 11);
  string(-4, 46, 13, 3, 9);
  // ไฟประดับ
  for (let i = 0; i < 22; i++) {
    const u = (i + 0.25) / 22, x = u * VW, y = 4 + 24 * 4 * u * (1 - u) * 0.98 + 3;
    const on = (Math.floor(t / 20) + i) % 3 !== 0;
    const col = i % 2 ? '255,214,90' : '255,140,190';
    if (on) {
      const gl = ctx.createRadialGradient(x, y, 0, x, y, 12);
      gl.addColorStop(0, `rgba(${col},.75)`);
      gl.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = on ? `rgb(${col})` : 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill();
  }
  ctx.translate(0, -drop);
  // กระดาษสีโปรย
  for (let i = 0; i < 18; i++) {
    const y = ((t * (0.6 + (i % 4) * 0.15) + i * 61) % (VH + 40)) - 20;
    const x = (i * 149 + Math.sin(t * 0.03 + i) * 30) % VW;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 0.05 + i);
    ctx.scale(1, Math.sin(t * 0.08 + i));
    ctx.fillStyle = MARKET_COLS[i % MARKET_COLS.length];
    ctx.fillRect(-3.5, -2, 7, 4);
    ctx.restore();
  }
  ctx.restore();
}

// ── กลางคืน ───────────────────────────────────────────────────
// มืดรอบนอกโทนน้ำเงินคราม เหลือวงแสงอุ่นรอบตัวน้อง · พระจันทร์เสี้ยวเรือง · ดาวสี่แฉกระยิบ · หิ่งห้อยลอยรอบตัว
function drawNight(ctx, game, e, k, t) {
  const cx = PLAYER_X + 20, cy = game.player.y - 25;
  const r = e.cfg.radius;
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, r * 0.42, cx, cy, r * 1.25);
  g.addColorStop(0, 'rgba(12,14,48,0)');
  g.addColorStop(0.6, `rgba(12,14,48,${0.6 * k})`);
  g.addColorStop(1, `rgba(8,8,32,${0.9 * k})`);
  ctx.fillStyle = g;
  ctx.fillRect(-400, -400, VW + 800, VH + 800);
  // แสงอุ่นรอบตัวน้อง
  const warm = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.7);
  warm.addColorStop(0, `rgba(255,220,150,${0.14 * k})`);
  warm.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = warm;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, 0, TAU); ctx.fill();
  ctx.globalAlpha = k;
  // พระจันทร์เสี้ยว
  const mx = VW - 92, my = 196;   // ใต้ป้ายคอมโบขวา — สูงกว่านี้ทับตัวเลขค่าขนม
  const mg = ctx.createRadialGradient(mx, my, 10, mx, my, 70);
  mg.addColorStop(0, 'rgba(255,245,200,.45)');
  mg.addColorStop(1, 'rgba(255,245,200,0)');
  ctx.fillStyle = mg;
  ctx.beginPath(); ctx.arc(mx, my, 70, 0, TAU); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(mx, my, 24, 0, TAU); ctx.clip();
  ctx.fillStyle = '#FFF4C8';
  ctx.fillRect(mx - 30, my - 30, 60, 60);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(mx + 12, my - 7, 21, 0, TAU); ctx.fill();
  ctx.restore();
  // ดาว
  for (let i = 0; i < 28; i++) {
    const tw = Math.sin(t * 0.05 + i * 1.7);
    if (tw < 0.1) continue;
    const sx = (i * 137) % VW, sy = 150 + ((i * 53) % 90);
    ctx.fillStyle = `rgba(255,250,220,${tw * 0.9})`;
    if (i % 4 === 0) sparkle4(ctx, sx, sy, 3.5 + tw * 2);
    else { ctx.beginPath(); ctx.arc(sx, sy, 1.3 + tw * 0.5, 0, TAU); ctx.fill(); }
  }
  // หิ่งห้อย
  for (let i = 0; i < 12; i++) {
    const a = t * 0.01 * (1 + (i % 3) * 0.3) + i * 2.1;
    const fx = cx + Math.cos(a) * (90 + (i * 23) % 150) + Math.sin(t * 0.04 + i) * 12;
    const fy = cy + Math.sin(a * 1.3) * (50 + (i * 17) % 70);
    const b = 0.5 + 0.5 * Math.sin(t * 0.12 + i * 1.3);
    const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 9);
    fg.addColorStop(0, `rgba(230,255,140,${0.85 * b})`);
    fg.addColorStop(1, 'rgba(230,255,140,0)');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(fx, fy, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,255,220,${b})`;
    ctx.beginPath(); ctx.arc(fx, fy, 1.6, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/** ปลาทอง: ปลาทองเรืองแสง + หัวใจดวงเล็กเหนือหัว */
function drawGoldfish(ctx, x, y, t) {
  const r = GOLDFISH.r;
  ctx.save();
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
  glow.addColorStop(0, 'rgba(255,230,140,.55)');
  glow.addColorStop(1, 'rgba(255,230,140,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(x, y - r, x, y + r);
  g.addColorStop(0, '#FFF2A8');
  g.addColorStop(0.5, '#FFC93C');
  g.addColorStop(1, '#E39A12');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#8A5A08';
  ctx.lineWidth = 2;
  // หาง
  ctx.beginPath();
  ctx.moveTo(x + r * 0.7, y);
  ctx.lineTo(x + r * 1.7, y - r * 0.8 + Math.sin(t * 0.3) * 2);
  ctx.lineTo(x + r * 1.7, y + r * 0.8 - Math.sin(t * 0.3) * 2);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // ตัว
  ctx.beginPath(); ctx.ellipse(x, y, r * 1.1, r * 0.75, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3A2408';
  ctx.beginPath(); ctx.arc(x - r * 0.55, y - r * 0.1, r * 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath(); ctx.ellipse(x - r * 0.1, y - r * 0.4, r * 0.4, r * 0.14, -0.2, 0, Math.PI * 2); ctx.fill();
  // หัวใจลอยเหนือ
  const hy = y - r * 1.9 + Math.sin(t * 0.12) * 2, hr = 7;
  ctx.fillStyle = '#FF5C84';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, hy + hr * 0.9);
  ctx.bezierCurveTo(x - hr * 1.45, hy - hr * 0.1, x - hr * 0.65, hy - hr * 1.15, x, hy - hr * 0.38);
  ctx.bezierCurveTo(x + hr * 0.65, hy - hr * 1.15, x + hr * 1.45, hy - hr * 0.1, x, hy + hr * 0.9);
  ctx.closePath();
  ctx.stroke(); ctx.fill();
  ctx.restore();
}

/** จุดเลเซอร์แดง: แสงเรืองแดง + แกนขาว + ลำแสงจาง ๆ จากมุมบนขวา (ไฟฉายเลเซอร์นอกจอ) */
function drawLaser(ctx, L, t) {
  const x = L.sx, y = L.y;
  const flick = 0.85 + 0.15 * Math.sin(t * 0.9);
  ctx.save();
  if (L.phase !== 'flee') {
    ctx.strokeStyle = 'rgba(255,60,80,.18)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(VIEW.W + 40, -40); ctx.lineTo(x, y); ctx.stroke();
  }
  const g = ctx.createRadialGradient(x, y, 0, x, y, 30);
  g.addColorStop(0, `rgba(255,70,90,${0.75 * flick})`);
  g.addColorStop(1, 'rgba(255,70,90,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FF2E4D';
  ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFE6EA';
  ctx.beginPath(); ctx.arc(x - 2, y - 2, 3.2, 0, Math.PI * 2); ctx.fill();
  // วงจับเวลาไล่จับ (หดลงตามเวลาที่เหลือ)
  if (L.phase === 'chase') {
    const left = 1 - Math.min(1, L.t / LASER.chase);
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); ctx.stroke();
  }
  ctx.restore();
}
