// src/town/town-sfx.js
// ─────────────────────────────────────────────────────────────
// เสียงเอฟเฟกต์ของเมือง/สวน (ผู้ใช้ 31 ต.ค.) — ต่อยอดจาก GameSfx (meow-audio.js ไฟล์ของผู้ใช้ ไม่แก้ไฟล์นั้น)
// สร้างสดด้วย Web Audio ทั้งหมด (ไม่มีไฟล์เสียง) · ไหลช่องเอฟเฟกต์ของเมืองชุดเดียวกัน
//   mushroom  เห็ดนุ่ม "บุ๋ง~" ต่ำ เด้งสั่นแบบเยลลี่
//   tulip     ทิวลิป "ปุ๊ง!" สูงใส + กริ๊งระยิบ
//   trampoline สปริง "ด๊องง~" เสียงสั่นไต่ขึ้น
//   swing     ชิงช้า: whoosh ลมตามแรงแกว่ง · squeak เอี๊ยดเบา ๆ ตอนสุดทาง
//   box       กล่องกระดาษ "กรอบแกรบ" · sit นั่งเบาะ "ปุ๊บ" นุ่ม
//   shutter   กล้อง "แชะ!" · tick นับถอยหลัง · warp ประตูวาประยิบ
//   splash    ลงเรือ "จ๋อม" · paddle พายเรือ "ซู่" เบา ๆ · bell ระฆังเรือแวะท่า · boop ชนลูกไหมพรม
//   waterSplash น้องกระโดดลงน้ำในอ่างน้ำพุ "จ๋อม!" + หยดน้ำกระเซ็น · waterStep เดินลุยน้ำ "แจ๋บ" เบา ๆ
//   pick      เก็บดอกไม้ "ปิ๊ง~" ระฆังแก้วไต่ขึ้น (ดอกสีรุ้งหายาก = ยาวขึ้น วิบวับกว่า)
//   fountain  เสียงน้ำพุต่อเนื่อง (เรียกทุกเฟรมด้วยความดัง 0..1 ตามระยะ) + หยดน้ำ "ติ๋ง" สุ่ม ๆ
// ─────────────────────────────────────────────────────────────
import { GameSfx } from './meow-audio.js';

export class TownSfx extends GameSfx {
  // เรียกได้ทุกเมธอดที่ไม่ขึ้นต้นด้วย _ (เสียงเดิมของ GameSfx + เสียงใหม่ข้างล่าง)
  play(name, ...args) {
    if (name && name[0] !== '_' && typeof this[name] === 'function' && name !== 'play' && name !== 'setVolume') this[name](...args);
  }

  /** เห็ด: ต่ำนุ่ม ระดับเสียงตกแล้วสั่นขึ้นลงเหมือนเยลลี่ · v = แรงตก */
  mushroom(v = 8) {
    const t = this._now(), k = Math.min(1, 0.45 + v / 16), f = this._vary(260);
    const o = this.ctx.createOscillator(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.4, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.62, t + 0.12);
    o.frequency.exponentialRampToValueAtTime(f * 0.8, t + 0.45);
    lfo.frequency.setValueAtTime(14, t);
    lfo.frequency.linearRampToValueAtTime(6, t + 0.45);
    lg.gain.setValueAtTime(f * 0.12, t);
    lg.gain.exponentialRampToValueAtTime(1, t + 0.45);
    lfo.connect(lg).connect(o.frequency);
    o.connect(this._env(t, 0.01, 0.48, 0.55 * k));
    [o, lfo].forEach((n) => { n.start(t); n.stop(t + 0.5); });
    this._noiseHit(t, 0.06, 'lowpass', 420, 0.22 * k);   // "ปุ" ตอนเท้าแตะหมวกเห็ด
  }

  /** ทิวลิป: เด้งสูงใส "ปุ๊ง" + กริ๊งระยิบสองโน้ต (คนละอารมณ์กับเห็ด) */
  tulip(v = 8) {
    const t = this._now(), k = Math.min(1, 0.45 + v / 16), f = this._vary(620);
    this._tone(f, t, 0.16, 'triangle', 0.42 * k, f * 1.9);
    this._tone(f * 0.5, t, 0.1, 'sine', 0.3 * k, f * 0.9);
    this._bell(this._midi(88), t + 0.06, 0.3, 0.16 * k);
    this._bell(this._midi(95), t + 0.12, 0.35, 0.12 * k);
  }

  /** แทรมโพลีน: สปริง "ด๊องง~" สั่นเร็วแล้วไต่ขึ้นตามตัวที่เด้งขึ้น */
  trampoline() {
    const t = this._now(), f = this._vary(180);
    const o = this.ctx.createOscillator(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 3.2, t + 0.38);
    lfo.frequency.value = 22;
    lg.gain.setValueAtTime(f * 0.25, t);
    lg.gain.exponentialRampToValueAtTime(2, t + 0.38);
    lfo.connect(lg).connect(o.frequency);
    o.connect(this._env(t, 0.005, 0.42, 0.45));
    [o, lfo].forEach((n) => { n.start(t); n.stop(t + 0.45); });
    this._noiseHit(t, 0.05, 'bandpass', 900, 0.2);
  }

  /** ชิงช้า: ลมวูบตอนผ่านจุดต่ำสุด — a = แรงแกว่ง 0..1 (ยิ่งแรงยิ่งดังยิ่งสูง) */
  swing(a = 0.5) {
    const t = this._now(), dur = 0.42;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(380 + a * 300, t);
    bp.frequency.exponentialRampToValueAtTime(900 + a * 900, t + dur * 0.5);
    bp.frequency.exponentialRampToValueAtTime(420, t + dur);
    src.connect(bp).connect(this._env(t, dur * 0.45, dur, 0.06 + a * 0.18));
    src.start(t);
    src.stop(t + dur + 0.02);
  }
  /** ชิงช้า: เชือก/โซ่เอี๊ยดเบา ๆ ตอนแกว่งสุดทาง */
  squeak(a = 0.5) {
    const t = this._now(), f = this._vary(1300, 0.1);
    this._tone(f, t, 0.09, 'sine', 0.05 + a * 0.08, f * 1.25);
  }

  /** กล่องกระดาษ: กรอบแกรบสามจังหวะ */
  box() {
    const t = this._now();
    [0, 0.07, 0.15].forEach((d, i) => this._noiseHit(t + d, 0.05, 'bandpass', 1800 + i * 500, 0.22));
    this._tone(160, t + 0.18, 0.12, 'sine', 0.25, 90);
  }

  /** นั่งเบาะ: ปุ๊บนุ่ม ๆ */
  sit() {
    const t = this._now();
    this._noiseHit(t, 0.12, 'lowpass', 600, 0.25);
    this._tone(200, t, 0.12, 'sine', 0.3, 130);
  }

  /** กล้อง: แชะ! (ม่านชัตเตอร์สองจังหวะ) + กริ๊งเล็ก ๆ */
  shutter() {
    const t = this._now();
    this._noiseHit(t, 0.03, 'highpass', 3000, 0.45);
    this._tone(2400, t, 0.02, 'square', 0.12);
    this._noiseHit(t + 0.07, 0.04, 'highpass', 2200, 0.4);
    this._tone(1600, t + 0.07, 0.025, 'square', 0.1);
    this._bell(this._midi(96), t + 0.14, 0.4, 0.1);
  }
  /** นับถอยหลังกล้อง: ติ๊ด */
  tick() { this._tone(1320, this._now(), 0.07, 'sine', 0.3); }

  /** ประตูวาป: ระยิบไต่ขึ้นเป็นอาร์เปจจิโอ + ลมหวีด */
  warp() {
    const t = this._now();
    [76, 79, 83, 86, 88, 91, 95].forEach((m, i) => this._bell(this._midi(m), t + i * 0.06, 0.4, 0.18));
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(600, t);
    bp.frequency.exponentialRampToValueAtTime(5000, t + 0.6);
    src.connect(bp).connect(this._env(t, 0.25, 0.7, 0.12));
    src.start(t);
    src.stop(t + 0.75);
  }

  /** ลงเรือ: จ๋อม */
  splash() {
    const t = this._now();
    this._tone(700, t, 0.12, 'sine', 0.3, 220);
    this._noiseHit(t + 0.02, 0.25, 'lowpass', 1400, 0.28);
  }
  /**
   * พายเรือหนึ่งจังหวะ (เรียกทุก ~0.8 วิตอนเรือแล่น) — ผู้ใช้ 31 ต.ค. ขอให้ได้ยินชัด (เดิมเบาจนแทบไม่ได้ยิน)
   *   ไม้พายจ้วงน้ำ "จ๋อบ" → ลากน้ำ "ซู่ว" (กวาดความถี่ขึ้นลง) → หยดน้ำจากใบพาย "ติ๋ง ๆ" · level 0..1 = ความดังตามระยะ
   */
  paddle(level = 1) {
    const k = Math.max(0, Math.min(1, level));
    if (k < 0.03) return;
    const t = this._now(), f = this._vary(340, 0.12);
    this._tone(f, t, 0.09, 'sine', 0.24 * k, f * 0.55);
    this._noiseHit(t, 0.06, 'lowpass', 900, 0.2 * k);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(500, t + 0.05);
    bp.frequency.exponentialRampToValueAtTime(1500, t + 0.3);
    bp.frequency.exponentialRampToValueAtTime(700, t + 0.55);
    src.connect(bp).connect(this._env(t + 0.05, 0.18, 0.5, 0.2 * k));
    src.start(t + 0.05);
    src.stop(t + 0.6);
    for (let i = 0; i < 2; i++) {
      const d = 0.5 + i * 0.1 + Math.random() * 0.06, ff = 1300 + Math.random() * 900;
      this._tone(ff, t + d, 0.04, 'sine', 0.07 * k, ff * 1.4);
    }
  }
  /** เก็บดอกไม้: ปิ๊ง~ ระฆังแก้วไต่ขึ้นสามโน้ต + ดีดเบา ๆ · rare = ดอกสีรุ้ง (ไต่ยาวขึ้น) */
  pick(rare = false) {
    const t = this._now();
    this._tone(this._vary(520), t, 0.07, 'triangle', 0.18, 700);
    const notes = rare ? [81, 85, 88, 93, 97] : [81, 85, 88];
    notes.forEach((m, i) => this._bell(this._midi(m), t + 0.04 + i * 0.07, 0.45, 0.16 - i * 0.015));
  }
  /** เรือถึงจุดแวะ: กระดิ่งเรือสองที */
  bell() {
    const t = this._now();
    this._bell(this._midi(84), t, 0.5, 0.25);
    this._bell(this._midi(84), t + 0.22, 0.6, 0.22);
  }
  /**
   * น้ำพุ: เสียงซ่าต่อเนื่อง (สร้างครั้งแรกที่เรียก แล้วปรับแค่ความดัง) — level 0..1 ตามระยะน้องกับน้ำพุ
   *   ซ่ากลางสูง (ละอองตก) + ทุ้มต่ำ (น้ำไหลลงอ่าง) · ความดังกระเพื่อมช้า ๆ ให้ฟังเป็นน้ำจริง · หยดน้ำ "ติ๋ง" สุ่มตามความดัง
   */
  fountain(level = 0) {
    const ctx = this.ctx, now = ctx.currentTime;
    if (!this._fnt) {
      if (level < 0.01) return;
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.6;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650;
      const hiG = ctx.createGain(); hiG.gain.value = 0.55;
      const loG = ctx.createGain(); loG.gain.value = 0.7;
      const wob = ctx.createGain(); wob.gain.value = 0.8;
      const l1 = ctx.createOscillator(), l1g = ctx.createGain(); l1.frequency.value = 0.31; l1g.gain.value = 0.12;
      const l2 = ctx.createOscillator(), l2g = ctx.createGain(); l2.frequency.value = 3.3; l2g.gain.value = 0.06;
      l1.connect(l1g).connect(wob.gain); l2.connect(l2g).connect(wob.gain);
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(bp).connect(hiG).connect(wob);
      src.connect(lp).connect(loG).connect(wob);
      wob.connect(g).connect(this.out);
      [src, l1, l2].forEach((n) => n.start());
      this._fnt = { g, next: 0 };
    }
    const f = this._fnt;
    f.g.gain.setTargetAtTime(level * 0.32, now, 0.25);
    if (level > 0.08 && now >= f.next) {
      f.next = now + 0.12 + Math.random() * (0.5 - level * 0.3);
      const fr = 1300 + Math.random() * 2200;
      this._tone(fr, now + 0.01, 0.06, 'sine', 0.05 * level, fr * 1.5);
    }
  }

  /** กระโดดลงน้ำในอ่าง: "จ๋อม!" (เสียงลงต่ำเร็ว ๆ) + ซ่ากระเซ็น + หยดน้ำติ๋ง ๆ ตามหลัง · v = แรงตก */
  waterSplash(v = 8) {
    const t = this._now(), k = Math.min(1, 0.4 + Math.abs(v) / 14);
    this._tone(this._vary(900), t, 0.13, 'sine', 0.3 * k, 260);
    this._noiseHit(t, 0.32, 'bandpass', 2200, 0.42 * k);
    this._noiseHit(t + 0.02, 0.18, 'lowpass', 900, 0.3 * k);
    for (let i = 0; i < 4; i++) {
      const f = 1400 + Math.random() * 2000;
      this._tone(f, t + 0.12 + i * 0.07 + Math.random() * 0.04, 0.05, 'sine', 0.08 * k, f * 1.5);
    }
  }
  /** เดินลุยน้ำ: แจ๋บเบา ๆ */
  waterStep() {
    const t = this._now();
    this._noiseHit(t, 0.1, 'bandpass', this._vary(1900, 0.2), 0.16);
    this._tone(this._vary(700, 0.15), t, 0.05, 'sine', 0.06, 380);
  }

  /** ชนลูกไหมพรม: บุ๊บ */
  boop() {
    const t = this._now(), f = this._vary(420);
    this._tone(f, t, 0.1, 'sine', 0.35, f * 0.7);
  }
}
