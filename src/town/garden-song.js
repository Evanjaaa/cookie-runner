// src/town/garden-song.js
// ─────────────────────────────────────────────────────────────
// เพลงสวนดอกไม้ในฝัน (ผู้ใช้ 31 ต.ค.) — เพลงของสวนโดยเฉพาะ ทำนองไพเราะ ฟังแล้วเหมือนอยู่ในโลกความฝัน
// แต่งใหม่ทั้งหมด (ไม่ติดลิขสิทธิ์) · สร้างสดด้วย Web Audio ไม่มีไฟล์เสียง · ไม่แตะ meow-audio.js (ไฟล์ของผู้ใช้)
//
// สไตล์: เพลงกล่องดนตรีจังหวะวอลซ์ (3/4) ช้า ๆ 76 BPM · คีย์ A major (เข้ากับเสียงเอฟเฟกต์ของเมืองที่จูนคีย์ A)
//   ทำนอง = กล่องดนตรี (ดิ๊ง) ซ้อนขลุ่ยลมเบา ๆ ให้โน้ตยาวลอยค้าง · ฮาร์ปไล่คอร์ดซ้าย-ขวา · แพดนุ่ม
//   คอรัส "อู~" ในท่อนกลางและรอบสุดท้าย · เบสอุ่นจังหวะแรก · ระฆังแก้วระยิบสุ่ม · ฮาร์ปกรีดขึ้นตอนเปลี่ยนท่อน
//   รีเวิร์บยาว + เอคโค่หนึ่งจังหวะ = ฟุ้ง ลอย ฝัน
// คอร์ดสีฝัน: Amaj7 · F#m7 · Dmaj7 · C#m7 · Bm7 · Dm6 (ยืมคอร์ดไมเนอร์ — อบอุ่นปนคิดถึง) · E7sus
// โครง (48 ห้อง ≈ 1 นาที 54 วินาที): Intro → A → A' → B (คอรัส) → A → A' (ประกายเต็ม) → Outro → วนกลับ A
//
//   const s = new DreamSong(ctx, musicOut());  s.start();  s.pause();  s.stop() (กลับไปต้นเพลง)
// ─────────────────────────────────────────────────────────────

// โน้ตคอร์ด (ระดับเสียงของแพด · ฮาร์ปเล่นสูงขึ้น 1 ช่วงเสียง · เบสต่ำลง 1 ช่วงเสียงจากตัวแรก)
const CH = {
  Amaj7: ['A3', 'C#4', 'E4', 'G#4'],
  'F#m7': ['F#3', 'A3', 'C#4', 'E4'],
  Dmaj7: ['D3', 'F#3', 'A3', 'C#4'],
  E: ['E3', 'G#3', 'B3', 'E4'],
  Esus: ['E3', 'A3', 'B3', 'E4'],
  'C#m7': ['C#3', 'E3', 'G#3', 'B3'],
  Bm7: ['B2', 'D3', 'F#3', 'A3'],
  Dm6: ['D3', 'F3', 'A3', 'B3'],
  E7sus: ['E3', 'A3', 'B3', 'D4'],
};
// ทำนอง 6 ช่องต่อห้อง (ช่องละครึ่งจังหวะ) · 'C#5' = เล่น · '-' = ลากต่อ · '.' = เงียบ
const A = [
  ['Amaj7', 'C#5 - E5 - A5 -'],
  ['F#m7', 'G#5 - - - F#5 E5'],
  ['Dmaj7', 'F#5 - A5 - C#6 -'],
  ['E', 'B5 - - - - -'],
  ['Amaj7', 'C#5 - E5 - A5 -'],
  ['C#m7', 'G#5 - B5 - G#5 E5'],
  ['Dmaj7', 'F#5 - E5 - D5 C#5'],
  ['Esus', 'B4 - - - . .'],
];
const A2 = [
  ['Amaj7', 'C#5 - E5 - A5 -'],
  ['F#m7', 'G#5 - - - A5 B5'],
  ['Dmaj7', 'C#6 - - - B5 A5'],
  ['Dm6', 'F5 - - - A5 -'],
  ['Amaj7', 'E5 - - - C#5 -'],
  ['E7sus', 'D5 - B4 - E5 -'],
  ['Amaj7', 'A4 - - - - -'],
  ['Amaj7', '. . . . C#5 D5', 'gliss'],
];
const B = [
  ['Dmaj7', 'F#5 - - - A5 -'],
  ['C#m7', 'G#5 - - - E5 -'],
  ['Bm7', 'F#5 - D5 - B4 -'],
  ['E7sus', 'E5 - - - D5 -'],
  ['F#m7', 'C#5 - F#5 - A5 -'],
  ['C#m7', 'G#5 - - - E5 -'],
  ['Dmaj7', 'F#5 - A5 - C#6 -'],
  ['E', 'B5 - - - G#5 -', 'gliss'],
];
const sec = (name, rows) => rows.map(([chord, mel, opt = '']) => [name, chord, mel, opt]);
const SONG = {
  bpm: 76,
  loopFrom: 4,
  bars: [
    ['intro', 'Amaj7', '. . . . . .'],
    ['intro', 'F#m7', '. . . . . .'],
    ['intro', 'Dmaj7', '. . . . . .'],
    ['intro', 'Esus', '. . . . . .', 'gliss'],
    ...sec('a', A),
    ...sec('a', A2),
    ...sec('b', B),
    ...sec('a', A),
    ...sec('full', A2),
    ['outro', 'Dmaj7', 'A5 - - - F#5 -'],
    ['outro', 'Dm6', 'F5 - - - D5 -'],
    ['outro', 'Amaj7', 'E5 - - - C#5 -'],
    ['outro', 'Amaj7', 'A4 - - - - -', 'gliss'],
  ].map(([section, chord, mel, opt = '']) => ({ section, chord, mel: mel.trim().split(/\s+/), gliss: opt.includes('gliss') })),
};
// ห้าเสียงคีย์ A (ระฆังแก้ว / ฮาร์ปกรีด) — ไม่มีโน้ตไหนขัดคอร์ด · เรียงจาก C เพราะเลขช่วงเสียงเปลี่ยนที่โน้ต C (ฮาร์ปกรีดไล่ขึ้นจริง)
const PENTA = ['C#', 'E', 'F#', 'A', 'B'];

export class DreamSong {
  constructor(audioContext, output) {
    this.ctx = audioContext;
    this.song = SONG;
    this.bpm = SONG.bpm;
    this.isPlaying = false;
    this.bar = 0;
    this.step = 0;
    this.nextTime = 0;
    this.lookahead = 0.12;
    this.timer = null;
    this.level = 0.38;   // วัดเรนเดอร์จริงแล้วดังพอ ๆ กับเพลงเมือง (RMS ราว −21 dB) — เปลี่ยนโลกเสียงไม่กระโดด
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = 0;
    this.master.connect(output || c.destination);
    this.levels = { box: 0.34, flute: 0.1, harp: 0.17, pad: 0.075, choir: 0.05, bass: 0.24, glass: 0.06 };
    this.tracks = {};
    for (const [name, v] of Object.entries(this.levels)) {
      const g = c.createGain();
      g.gain.value = v;
      g.connect(this.master);
      this.tracks[name] = g;
    }
    // รีเวิร์บยาว (ฟุ้งแบบห้องโถงในฝัน) — ตัดแหลมขาออกให้นุ่ม
    this.reverb = c.createConvolver();
    this.reverb.buffer = this._impulse(4.2);
    const rvTone = c.createBiquadFilter();
    rvTone.type = 'lowpass';
    rvTone.frequency.value = 5200;
    this.rvSend = c.createGain();
    this.rvSend.gain.value = 0.6;
    this.rvSend.connect(this.reverb).connect(rvTone).connect(this.master);
    for (const n of ['box', 'flute', 'harp', 'pad', 'choir', 'glass']) this.tracks[n].connect(this.rvSend);
    // เอคโค่หนึ่งจังหวะ (กล่องดนตรี + ระฆังแก้ว)
    this.delay = c.createDelay(2);
    this.delay.delayTime.value = 60 / this.bpm;
    const fb = c.createGain(), wet = c.createGain(), dTone = c.createBiquadFilter();
    fb.gain.value = 0.32;
    wet.gain.value = 0.2;
    dTone.type = 'lowpass';
    dTone.frequency.value = 3000;
    this.delay.connect(dTone).connect(fb).connect(this.delay);
    dTone.connect(wet).connect(this.master);
    this.tracks.box.connect(this.delay);
    this.tracks.glass.connect(this.delay);
    this.noise = this._noise();
  }

  // ── ควบคุม ──
  start() {
    if (this.isPlaying) return;
    const c = this.ctx;
    c.resume();
    this.isPlaying = true;
    // ค่อย ๆ ดังขึ้น 2 วินาที (เข้าสวนแล้วเพลงลอยเข้ามา)
    this.master.gain.cancelScheduledValues(c.currentTime);
    this.master.gain.setTargetAtTime(this.level, c.currentTime, 0.7);
    this.nextTime = c.currentTime + 0.05;
    this.timer = setInterval(() => this._scheduler(), 25);
  }
  pause() {
    this.isPlaying = false;
    clearInterval(this.timer);
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);   // หางเสียงที่ค้างจางลงนุ่ม ๆ
  }
  stop() { this.pause(); this.bar = 0; this.step = 0; }
  setVolume(v) { this.level = v; if (this.isPlaying) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }

  get stepDur() { return 60 / this.bpm / 2; }   // ครึ่งจังหวะ · 6 ช่องต่อห้อง (3/4)
  _scheduler() {
    if (this.nextTime < this.ctx.currentTime - 0.1) this.nextTime = this.ctx.currentTime + 0.02;
    while (this.nextTime < this.ctx.currentTime + this.lookahead) {
      this._playStep(this.bar, this.step, this.nextTime);
      this.nextTime += this.stepDur;
      if (++this.step === 6) {
        this.step = 0;
        if (++this.bar >= this.song.bars.length) this.bar = this.song.loopFrom;
      }
    }
  }

  _playStep(barIdx, s, t) {
    const b = this.song.bars[barIdx], d = this.stepDur, sc = b.section;
    const tones = CH[b.chord].map((n) => this._freq(n));
    const soft = sc === 'intro' || sc === 'outro';
    // 1) ทำนอง: กล่องดนตรี + ขลุ่ยลมลากโน้ตยาว
    const tok = b.mel[s];
    if (tok && tok !== '-' && tok !== '.') {
      let len = 1;
      while (b.mel[s + len] === '-') len++;
      const f = this._freq(tok), dur = len * d;
      this._box(f, t, sc === 'full' ? 1.08 : 1);
      this._flute(f, t, dur * 0.98, sc === 'b' || sc === 'full' ? 1.3 : 1);
      if (sc === 'full' || sc === 'b') this._box(f * 2, t + 0.012, 0.22);   // ประกายคู่แปดบาง ๆ ท่อนกลาง/รอบท้าย
    }
    // 2) ฮาร์ปไล่คอร์ดขึ้น-ลง (ราก สาม ห้า → รากสูง → ห้า สาม · สลับซ้ายขวา) · ช่วงต้น/ท้ายเพลงเล่นห่าง ๆ
    if (!soft || s % 2 === 0) {
      const f = s === 3 ? tones[0] * 4 : tones[[0, 1, 2, 0, 2, 1][s]] * 2;
      this._harp(f, t, (s === 0 ? 1 : 0.75) * (soft ? 0.8 : 1), s % 2 ? 0.35 : -0.35);
    }
    // 3) ต้นห้อง: แพด + เบส + คอรัส (ท่อนกลาง/รอบท้าย) · จังหวะสามเบสเบา ๆ ให้แกว่งแบบวอลซ์
    const root = tones[0] / 2 < 65 ? tones[0] : tones[0] / 2;
    if (s === 0) {
      const bar = 6 * d;
      this._pad(tones, t, bar, soft ? 0.8 : sc === 'b' ? 1.15 : 1);
      this._bass(root, t, bar * 0.9);
      if (sc === 'b' || sc === 'full') this._choir(tones.slice(1).map((f) => f * 2), t, bar);
    }
    if (s === 4 && !soft) this._bass(root * 1.5, t, 1.8 * d, 0.32);   // จังหวะสาม: โน้ตห้าเบา ๆ
    // 4) ระฆังแก้วระยิบสุ่ม (ห้าเสียง สูง ๆ) — มากขึ้นในท่อนกลางและรอบท้าย
    const p = { intro: 0.22, a: 0.07, b: 0.14, full: 0.2, outro: 0.18 }[sc];
    if (Math.random() < p) {
      const n = PENTA[(Math.random() * 5) | 0] + 6;   // C#6–B6 (สูงกว่านี้แสบหู)
      this._glass(this._freq(n), t + Math.random() * d * 0.5, Math.random() * 1.4 - 0.7);
    }
    // 5) ฮาร์ปกรีดขึ้นตอนจะขึ้นท่อนใหม่ (ครึ่งหลังของห้อง)
    if (b.gliss && s === 2) this._gliss(t, 3.6 * d);
  }

  // ── เครื่องดนตรี ──
  /** กล่องดนตรี: ซี่เหล็กดีด = เสียงพื้น + ฮาร์มอนิกแบบระฆังที่จางไวกว่า + ติ๊กสั้น ๆ */
  _box(f, t, vol = 1) {
    const c = this.ctx, out = c.createGain();
    out.gain.value = vol;
    out.connect(this.tracks.box);
    for (const [r, a, dec] of [[1, 1, 1.9], [2, 0.16, 0.7], [3, 0.07, 0.35], [5.4, 0.035, 0.16]]) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.value = f * r;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(a, t + 0.003);
      g.gain.setTargetAtTime(0, t + 0.003, dec / 3);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dec * 2.2 + 0.1);
    }
    this._click(t, Math.min(9000, f * 6), 0.05 * vol, out);
  }
  /** ขลุ่ยลม: ลากโน้ตให้ค้างลอย (กล่องดนตรีจางเร็ว) · เข้าช้า สั่นเบา ๆ หลังโน้ตดังแล้ว · มีลมหายใจบาง ๆ */
  _flute(f, t, dur, vol = 1) {
    const c = this.ctx;
    const g = c.createGain(), lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(4200, f * 3);
    const end = t + Math.max(0.25, dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.14);
    g.gain.setValueAtTime(vol, end - 0.05);
    g.gain.linearRampToValueAtTime(0, end + 0.45);
    lp.connect(g).connect(this.tracks.flute);
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 5;
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(f * 0.005, t + Math.min(0.6, dur));
    lfo.connect(lg);
    for (const [type, det, a] of [['sine', 0, 0.8], ['triangle', 4, 0.25]]) {
      const o = c.createOscillator(), og = c.createGain();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = det;
      og.gain.value = a;
      lg.connect(o.frequency);
      o.connect(og).connect(lp);
      o.start(t);
      o.stop(end + 0.5);
    }
    lfo.start(t);
    lfo.stop(end + 0.5);
    this._breath(t, Math.max(0.2, dur), f, vol);
  }
  _breath(t, dur, f, vol) {
    const c = this.ctx, src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise;
    src.loop = true;
    bp.type = 'bandpass';
    bp.frequency.value = Math.min(6000, f * 2);
    bp.Q.value = 2.2;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05 * vol, t + 0.08);
    g.gain.linearRampToValueAtTime(0.015 * vol, t + 0.3);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.3);
    src.connect(bp).connect(g).connect(this.tracks.flute);
    src.start(t);
    src.stop(t + dur + 0.35);
  }
  /** ฮาร์ป: ดีดใส (triangle + sine คู่แปด) จางยาว · pan = ซ้าย/ขวา */
  _harp(f, t, vol, pan) {
    const c = this.ctx, g = c.createGain(), lp = c.createBiquadFilter(), pn = c.createStereoPanner();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(7000, f * 6), t);
    lp.frequency.exponentialRampToValueAtTime(Math.min(3000, f * 2.5), t + 0.4);
    pn.pan.value = pan;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.setTargetAtTime(0, t + 0.006, 0.55);
    lp.connect(g).connect(pn).connect(this.tracks.harp);
    for (const [type, r, a] of [['triangle', 1, 0.8], ['sine', 2, 0.25]]) {
      const o = c.createOscillator(), og = c.createGain();
      o.type = type;
      o.frequency.value = f * r;
      og.gain.value = a;
      o.connect(og).connect(lp);
      o.start(t);
      o.stop(t + 2.6);
    }
  }
  /** ฮาร์ปกรีดขึ้น (ห้าเสียง สองช่วงเสียงครึ่ง) */
  _gliss(t, dur) {
    const notes = [];
    for (const o of [4, 5, 6]) for (const n of PENTA) notes.push(n + o);
    notes.length = 13;
    notes.forEach((n, i) => this._harp(this._freq(n), t + (i / notes.length) * dur, 0.42 + i * 0.02, -0.6 + (i / notes.length) * 1.2));
  }
  /** แพดนุ่ม: triangle เพี้ยนกันนิด ๆ เข้าช้าออกช้า (ซ้อนคอร์ดถัดไปเนียน ๆ) · สว่างขึ้นกลางห้อง */
  _pad(freqs, t, dur, vol) {
    const c = this.ctx, lp = c.createBiquadFilter(), g = c.createGain();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(800, t);
    lp.frequency.linearRampToValueAtTime(1500, t + dur * 0.5);
    lp.frequency.linearRampToValueAtTime(900, t + dur + 1);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.9);
    g.gain.setValueAtTime(vol, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 1.4);
    lp.connect(g).connect(this.tracks.pad);
    for (const f of freqs) {
      for (const det of [-6, 6]) {
        const o = c.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        o.detune.value = det;
        o.connect(lp);
        o.start(t);
        o.stop(t + dur + 1.5);
      }
    }
  }
  /** คอรัส "อู~": คลื่นฟันเลื่อยผ่านฟิลเตอร์แบบสระ อู · สั่นช้า ๆ · เข้าช้ามาก */
  _choir(freqs, t, dur) {
    const c = this.ctx;
    const f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), lp = c.createBiquadFilter(), g = c.createGain();
    f1.type = 'bandpass'; f1.frequency.value = 380; f1.Q.value = 1.1;
    f2.type = 'bandpass'; f2.frequency.value = 900; f2.Q.value = 1.6;
    lp.type = 'lowpass'; lp.frequency.value = 1800;
    const mix = c.createGain();
    f1.connect(mix); f2.connect(mix);
    mix.connect(lp).connect(g).connect(this.tracks.choir);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + 1.1);
    g.gain.setValueAtTime(1, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 1.3);
    freqs.forEach((f, i) => {
      for (const det of [-8, 8]) {
        const o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = det;
        lfo.frequency.value = 4.6 + i * 0.3;
        lg.gain.value = f * 0.004;
        lfo.connect(lg).connect(o.frequency);
        o.connect(f1); o.connect(f2);
        o.start(t); lfo.start(t);
        o.stop(t + dur + 1.4); lfo.stop(t + dur + 1.4);
      }
    });
  }
  /** เบสอุ่น: sine กลม ๆ + คู่แปดบาง ๆ (ลำโพงเล็กยังได้ยิน) */
  _bass(f, t, dur, vol = 1) {
    const c = this.ctx, g = c.createGain(), lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.setTargetAtTime(vol * 0.55, t + 0.03, 0.3);
    g.gain.setTargetAtTime(0, t + dur, 0.2);
    lp.connect(g).connect(this.tracks.bass);
    for (const [r, a] of [[1, 1], [2, 0.3]]) {
      const o = c.createOscillator(), og = c.createGain();
      o.type = 'sine';
      o.frequency.value = f * r;
      og.gain.value = a;
      o.connect(og).connect(lp);
      o.start(t);
      o.stop(t + dur + 1);
    }
  }
  /** ระฆังแก้ว: เสียงพื้น + ฮาร์มอนิกแบบระฆัง (2.76×) จางยาว ลอยในรีเวิร์บ */
  _glass(f, t, pan) {
    const c = this.ctx, pn = c.createStereoPanner();
    pn.pan.value = pan;
    pn.connect(this.tracks.glass);
    for (const [r, a, dec] of [[1, 1, 1.4], [2.76, 0.3, 0.5]]) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.value = f * r;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(a, t + 0.004);
      g.gain.setTargetAtTime(0, t + 0.004, dec / 3);
      o.connect(g).connect(pn);
      o.start(t);
      o.stop(t + dec * 2.2 + 0.1);
    }
  }
  _click(t, freq, vol, dest) {
    const c = this.ctx, src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise;
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 3;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
    src.connect(bp).connect(g).connect(dest);
    src.start(t);
    src.stop(t + 0.03);
  }

  // ── ตัวช่วย ──
  _freq(note) {   // 'C#5' → Hz
    const m = note.match(/^([A-G])([#b]?)(\d)$/);
    let semi = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
    if (m[2] === '#') semi++;
    if (m[2] === 'b') semi--;
    return 440 * Math.pow(2, ((Number(m[3]) + 1) * 12 + semi - 69) / 12);
  }
  _noise() {
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  _impulse(seconds) {
    const rate = this.ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }
}
