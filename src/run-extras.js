// src/run-extras.js
//
// ══ ของใหม่ระหว่างวิ่ง (เกมเพลย์ใหม่ ขั้นที่ 3 — ผู้ใช้ตกลง 25 ต.ค. 2026 · GAME_PLAN.md ข้อ 8) ══
//
//   จุดเลเซอร์แดง  — แทนโบนัสตัวอักษร: จุดแดงโผล่วิ่งนำหน้าตามระยะที่กำหนด (ทุกคนเท่ากัน)
//                    ไล่จับให้ทันภายในไม่กี่วินาทีโดยไม่ชน = หลุดเข้าโลกโบนัส · ชน/ไม่ทัน = จุดแดงหนีไป
//   ปลาทอง         — นาน ๆ โผล่สักตัวลอยระดับกระโดด เก็บได้ = หัวใจคืน 1 ดวง (เต็มอยู่แล้ว = คะแนนก้อน)
//   ภารกิจในรอบ    — เป้าเล็ก ๆ ทีละข้อ ทำสำเร็จ = หัวใจคืน 1 ดวง (เต็มอยู่แล้ว = คะแนนก้อน) แล้วข้อใหม่มาต่อ
//   เหตุการณ์สุ่ม   — ช่วงสั้น ๆ ~12 วิ ที่กติกาเปลี่ยน (ขั้นที่ 4): หมาไล่ (โลกเร็วขึ้น) · ฝนตก (แอ่งน้ำ เหยียบ = คอมโบหาย)
//                    · ตลาดนัด (ของกินเต็มทาง) · กลางคืน (มองเห็นแคบรอบตัว) — สุ่มไม่ซ้ำแบบเดิมติดกัน
//
// Game เรียก: reset() ตอนเริ่มตา · update(game, dt, cx, cy) ทุกเฟรมวิ่งปกติ (ไม่ใช่โบนัส)
//   onTreat(midAir) / onHit() / onSkill() จากจุดที่เกิดเหตุ · draw(ctx, game) ในชั้นฉาก
// HUD อ่าน mission / missionDone ไปวาดเอง (render/hud.js drawMission)

import { VIEW, GROUND_Y, PLAYER_X, LIVES, LEVEL } from './config.js';
import { sfx } from './audio.js';

/** จุดเลเซอร์แดง — หน่วยเวลาเป็นเฟรม 60fps */
export const LASER = {
  firstAt: 45 * 60,     // โผล่ครั้งแรกหลังเริ่มวิ่ง
  every: 80 * 60,       // จากนั้นทุกเท่านี้ (นับเฉพาะเวลาวิ่งปกติ)
  enter: 40,            // ลอยเข้าจอ
  chase: 270,           // ช่วงไล่จับ (~4.5 วิ)
  catchR: 46,           // ระยะแตะจุดแดง (px จากกลางตัวน้อง)
  hop: 54,              // สลับระดับสูง-ต่ำทุกเท่านี้
  levels: [GROUND_Y - 34, GROUND_Y - 128],   // ระดับพื้น (วิ่งชน) / ระดับกระโดด
};
/** ปลาทอง (หัวใจคืน) */
export const GOLDFISH = { firstAt: 50 * 60, every: 60 * 60, y: GROUND_Y - 112, r: 16, pickR: 42, bonus: 5000 };
/** ภารกิจในรอบ */
export const MISSION = { gap: 6 * 60, bonus: 5000, doneFrames: 150 };

/** เหตุการณ์สุ่ม — เฟรม 60fps · fade = เข้า/ออก */
export const EVENTS = {
  firstAt: 30 * 60,
  gap: [40 * 60, 60 * 60],   // หลังเหตุการณ์จบ รอสุ่มในช่วงนี้
  fade: 50,
  list: {
    dog: { name: 'หมาไล่! วิ่งหนีเร็ว', dur: 12 * 60, speed: 1.3 },
    rain: { name: 'ฝนตก! ระวังแอ่งน้ำ', dur: 13 * 60, puddleEvery: 80, puddleW: 74 },
    market: { name: 'ตลาดนัด! ของกินเต็มทาง', dur: 12 * 60, rowEvery: 55 },
    night: { name: 'กลางคืน! มองไม่ค่อยเห็น', dur: 13 * 60, radius: 250 },
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
    this.noHit = 0;
    this.evAt = EVENTS.firstAt;
    this.ev = null;                  // { id, t, dur, cfg }
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

  /** รางวัลหัวใจคืน (หรือคะแนนก้อนถ้าเต็ม) */
  reward(game, why) {
    if (game.lives < LIVES.max) {
      game.lives++;
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

    const e = this.ev;
    if (!e) {
      if (this.t < this.evAt || this.laser || game.skillFlying) return;
      const ids = Object.keys(EVENTS.list).filter((k) => k !== this.evLast);
      const id = ids[Math.floor(Math.random() * ids.length)];
      const cfg = EVENTS.list[id];
      this.ev = { id, t: 0, dur: cfg.dur, cfg };
      this.evLast = id;
      this.evTick = 0;
      game.noticeText = cfg.name;
      game.notice = 130;
      const snd = sfx['event' + id[0].toUpperCase() + id.slice(1)];
      if (snd) snd();
      return;
    }
    e.t += dt;
    this.evTick += dt;
    const live = e.t > EVENTS.fade && e.t < e.dur - EVENTS.fade;
    if (e.id === 'dog' && this.evTick >= 90) { this.evTick = 0; sfx.eventDog(); }
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

  updateMission(game, dt) {
    if (!this.mission) {
      this.mWait -= dt;
      if (this.mWait > 0) return;
      let k;
      do k = Math.floor(Math.random() * MISSIONS.length); while (k === this.mLast && MISSIONS.length > 1);
      this.mLast = k;
      const d = MISSIONS[k], goal = d.goal(this.mIdx);
      this.mission = { kind: d.kind, goal, n: 0, text: d.text(goal) };
      return;
    }
    const m = this.mission;
    if (m.kind === 'combo') m.n = Math.max(m.n, game.combo);
    if (m.kind === 'nohit') m.n = this.noHit;
    if (m.n >= m.goal) {
      this.reward(game, 'ภารกิจสำเร็จ!');
      sfx.bonus();
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
        this.reward(game, 'ปลาทอง!');
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
      if (this.t < this.laserAt || game.skillFlying || this.ev) return;   // ไม่ชนกับเหตุการณ์สุ่ม
      this.laser = { t: 0, sx: VIEW.W + 30, y: LASER.levels[0], ty: LASER.levels[0], phase: 'enter', fail: false, hopT: 0 };
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
      L.sx = PLAYER_X + 300 - 340 * u;
      L.hopT += dt;
      if (L.hopT >= LASER.hop) {
        L.hopT = 0;
        L.ty = L.ty === LASER.levels[0] ? LASER.levels[1] : LASER.levels[0];
      }
      if (u >= 1) { L.phase = 'flee'; L.t = 0; L.fail = true; }
    } else {
      L.sx += 14 * dt;
      L.ty = LASER.levels[1] - 60;
      if (L.sx > VIEW.W + 80) { this.laser = null; return; }
    }
    L.y += (L.ty - L.y) * Math.min(1, 0.16 * dt);
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
    for (const p of this.puddles) drawPuddle(ctx, p.x - game.camera, p.w, p.hit, t);
    if (this.fish && !this.fish.got) drawGoldfish(ctx, this.fish.x - game.camera, this.fish.y + Math.sin(t * 0.08) * 6, t);
    const L = this.laser;
    if (L) drawLaser(ctx, L, t);
  }

  /** ชั้นบนสุดก่อน HUD (พิกัดจอ): ฝนตก · กลางคืน · หมาไล่ · ธงตลาดนัด */
  drawScreen(ctx, game) {
    const e = this.ev;
    if (!e || game.bonus > 0) return;
    const k = Math.max(0, this.evK), t = game.tick;
    ctx.save();
    if (e.id === 'night') {
      const cx = PLAYER_X + 20, cy = game.player.y - 25;
      const r = e.cfg.radius;
      const g = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r * 1.25);
      g.addColorStop(0, 'rgba(10,8,30,0)');
      g.addColorStop(1, `rgba(10,8,30,${0.88 * k})`);
      ctx.fillStyle = g;
      ctx.fillRect(-400, -400, VIEW.W + 800, VIEW.H + 800);
      ctx.globalAlpha = k;
      for (let i = 0; i < 18; i++) {
        const tw = Math.sin(t * 0.05 + i * 1.7);
        if (tw < 0.3) continue;
        ctx.fillStyle = `rgba(255,250,220,${tw * 0.8})`;
        ctx.beginPath(); ctx.arc((i * 137) % VIEW.W, 20 + ((i * 53) % 90), 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (e.id === 'rain') {
      ctx.fillStyle = `rgba(90,110,170,${0.16 * k})`;
      ctx.fillRect(-400, -400, VIEW.W + 800, VIEW.H + 800);
      ctx.strokeStyle = `rgba(220,235,255,${0.55 * k})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < 70; i++) {
        const x = ((i * 97 + t * 9) % (VIEW.W + 120)) - 60, y = ((i * 61 + t * 15) % (VIEW.H + 60)) - 30;
        ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 16);
      }
      ctx.stroke();
    }
    if (e.id === 'market') {
      ctx.globalAlpha = k;
      const cols = ['#FF7EC8', '#FFD86B', '#7ED9F0', '#9BE38A', '#FF9A3D'];
      ctx.strokeStyle = 'rgba(120,80,60,.8)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 8); ctx.quadraticCurveTo(VIEW.W / 2, 34, VIEW.W, 8); ctx.stroke();
      for (let i = 0; i < 16; i++) {
        const u = (i + 0.5) / 16, x = u * VIEW.W, y = 8 + 26 * 4 * u * (1 - u) * 0.98;
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath(); ctx.moveTo(x - 11, y); ctx.lineTo(x + 11, y); ctx.lineTo(x, y + 20 + Math.sin(t * 0.1 + i) * 2); ctx.closePath(); ctx.fill();
      }
    }
    if (e.id === 'dog') drawDog(ctx, 26 - (1 - k) * 160, GROUND_Y, t);
    ctx.restore();
  }
}

/** แอ่งน้ำ (ฝนตก) — เหยียบแล้วน้ำกระจาย */
function drawPuddle(ctx, x, w, hit, t) {
  ctx.save();
  ctx.fillStyle = hit ? 'rgba(120,160,220,.35)' : 'rgba(110,160,230,.75)';
  ctx.beginPath(); ctx.ellipse(x + w / 2, GROUND_Y + 2, w / 2, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(230,245,255,.8)';
  ctx.lineWidth = 1.5;
  const r = (t * 0.6) % 20;
  ctx.beginPath(); ctx.ellipse(x + w / 2, GROUND_Y + 2, r + 6, (r + 6) * 0.25, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/** หมาไล่ — หมาน้ำตาลวิ่งงับตามขอบซ้ายจอ */
function drawDog(ctx, x, gy, t) {
  const b = Math.sin(t * 0.5) * 3;
  ctx.save();
  ctx.translate(x, gy - 30 + b);
  ctx.fillStyle = '#B07A4E';
  ctx.strokeStyle = '#5A3420';
  ctx.lineWidth = 2.5;
  for (const [lx, ph] of [[-16, 0], [-6, 2], [10, 1], [20, 3]]) {
    ctx.beginPath(); ctx.moveTo(lx, 10); ctx.lineTo(lx + Math.sin(t * 0.5 + ph) * 7, 28 - b); ctx.stroke();
  }
  ctx.beginPath(); ctx.ellipse(0, 4, 30, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-28, 0); ctx.quadraticCurveTo(-42, -12 + Math.sin(t * 0.8) * 5, -38, -18); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(32, -10, 16, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#8A5634';
  ctx.beginPath(); ctx.ellipse(24, -22, 6, 11, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3A2410';
  ctx.beginPath(); ctx.arc(47, -10, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(36, -14, 2.2, 0, Math.PI * 2); ctx.fill();
  if (Math.sin(t * 0.25) > 0.5) {   // อ้าปากเห่า
    ctx.fillStyle = '#E8607E';
    ctx.beginPath(); ctx.ellipse(44, -2, 6, 3.5, 0.2, 0, Math.PI * 2); ctx.fill();
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
