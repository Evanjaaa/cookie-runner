// =====================================================================
// meow-audio.js — เพลง "เจ้าเหมียววิ่งเร็ว" + เสียงเอฟเฟกต์เกม รวมไว้ในไฟล์เดียว
// ไม่ต้องใช้ไฟล์เสียงใด ๆ ทุกเสียงสร้างสดด้วย Web Audio API
//
// มี 2 คลาส:
//   MeowSong — เพลงประกอบ (เสียงร้อง + เปียโนคลอ + ประสาน + แพด + เบส + กลอง + เอฟเฟกต์ในเพลง)
//   GameSfx  — เสียงเอฟเฟกต์ (กระโดด เก็บปลา คอมโบ ชน เมี้ยว ฯลฯ)
//
// ไฟล์จากผู้ใช้ (28 ต.ค.) ใช้ในหน้าเมือง (src/town/main.js) — แก้จากต้นฉบับ 3 จุด:
//   1) เปิด export (โปรเจกต์ใช้ Vite)
//   2) ตัวสร้างรับปมปลายทาง (output) เพิ่ม — เมืองส่งช่องเพลง/เอฟเฟกต์ของเกม (audio.js musicOut/sfxOut)
//      เข้ามา เพลงกับเสียงจึงดังตามระดับที่ผู้เล่นตั้งในเกม · ไม่ส่ง = ต่อลำโพงตรงเหมือนเดิม
//   3) ตัวจัดตารางเวลา: ตามเวลาไม่ทัน (สลับแท็บ / เครื่องค้าง) = ข้ามไปเวลาปัจจุบัน ไม่เล่นโน้ตที่ค้างรัวทีเดียว
//
//   import { MeowSong, GameSfx } from './meow-audio.js';
//   const music = new MeowSong(ctx, musicOut());
//   const sfx = new GameSfx(ctx, sfxOut());
//   startButton.onclick = () => music.start();   // ต้องเริ่มจากการกดปุ่ม (กฎเบราว์เซอร์)
//   sfx.jump();  sfx.collect();  sfx.combo(n);  sfx.hit();
//   music.setTempo(120 + speed);                 // เพลงเร็วขึ้นตามความเร็วเกม
//   music.setTrackVolume('voice', 0.7);          // ลดเสียงร้อง (0–1.5)
//   music.setLead('blend');                      // 'blend' | 'voice' | 'piano'
// =====================================================================

// =====================================================================
// MeowSong — เพลงแมวเหมียวแนวสดใส ทำนองแบบเพลงร้อง (ไม่มีคนร้อง)
// เสียงทั้งหมดสังเคราะห์ด้วย Web Audio API · แต่งใหม่ทั้งหมด ไม่ติดลิขสิทธิ์
//
// โครงเพลง (66 ห้อง ≈ 2 นาที 10 วินาที ที่ 120 BPM):
//   Intro → Verse 1 → Pre-chorus → Chorus → Interlude → Verse 2 → Pre-chorus → Chorus
//   → Bridge → Final Chorus (ขึ้นคีย์) → Outro → วนกลับ Verse 1
//
//   music.onStep = (bar, step) => { ... };   // ทำแอนิเมชันตามจังหวะ
// =====================================================================

// ---------- ข้อมูลเพลง ----------
// แต่ละห้อง: [ท่อน, คอร์ด, เมโลดี้ 8 ช่อง, เนื้อร้อง, ตัวเลือก]
//   เมโลดี้: 'C5' = เล่นโน้ต · '-' = ลากโน้ตเดิม · '.' = เงียบ · 'M' = เสียงเมี้ยว
//   เนื้อร้อง: 1 พยางค์ต่อ 1 โน้ต (ไว้ดูว่าร้องตามได้ ไม่ได้ใช้สร้างเสียง)
//   ตัวเลือก: '+2' = ขึ้นคีย์ 2 ครึ่งเสียง · 'fill' = ตีกลองส่งท้ายห้อง
// เขียนโน้ตไว้ในคีย์ F แล้วเลื่อนทั้งเพลงด้วย transpose (ยิ่งมากยิ่งสูง)

// ท่อนที่ใช้ซ้ำ เขียนเป็นฟังก์ชันจะได้ไม่ต้องก๊อปหลายรอบ
const VERSE_MELODY = [
  ['F',  '.  C5 A4 C5 F5 -  E5 D5'],
  ['Dm', 'C5 -  A4 -  .  .  .  . '],
  ['Bb', '.  D5 D5 D5 F5 -  D5 C5'],
  ['C',  'C5 -  G4 -  .  .  M  - '],
  ['F',  '.  C5 A4 C5 F5 -  G5 A5'],
  ['Dm', 'A5 -  F5 -  D5 .  .  . '],
  ['Bb', '.  F5 F5 G5 A5 -  G5 F5'],
  ['C',  'G5 -  -  -  E5 -  C5 . '],
];
const PRE_MELODY = [
  ['Dm', 'D5 -  E5 -  F5 -  A5 - '],
  ['C',  'G5 -  -  -  E5 -  C5 - '],
  ['Bb', 'D5 -  F5 -  Bb5 - A5 - '],
  ['C',  'G5 -  A5 -  Bb5 - C6 - ', 'fill'],
];
const CHORUS_MELODY = [
  ['Bb', 'A5 -  F5 -  A5 -  F5 . '],
  ['C',  'G5 A5 Bb5 A5 G5 - E5 . '],
  ['Am', 'A5 -  E5 -  A5 -  E5 . '],
  ['Dm', 'F5 G5 A5 G5 F5 -  D5 . '],
  ['Bb', 'A5 -  F5 -  A5 -  C6 - '],
  ['C',  'Bb5 - A5 -  G5 -  E5 - '],
  ['F',  'F5 -  -  -  -  -  .  . '],
  ['F',  'M  -  .  .  .  .  .  . ', 'fill'],
];
const CHORUS_LYRICS = [
  'เมี้ยว เมี้ยว เมี้ยว เมี้ยว', 'วิ่ง เร็ว ขึ้น อีก นิด นะ',
  'เมี้ยว เมี้ยว เมี้ยว เมี้ยว', 'ไม่ มี ใคร ตาม ทัน เรา',
  'หาง ชี้ ขึ้น ฟ้า', 'หัว ใจ สด ใส',
  'เย้', '',
];

// ประกอบท่อน: เอาทำนอง + เนื้อร้อง + ตัวเลือกเพิ่มเติม มารวมกัน
const part = (section, melody, lyrics, extra = '') =>
  melody.map(([chord, mel, opt = ''], i) => [section, chord, mel, lyrics[i] || '', `${opt} ${extra}`]);

const MEOW_SONG = {
  bpm: 120,
  transpose: 4,     // ยกทั้งเพลงขึ้นเป็นคีย์ A ให้เสียงร้องสูงและใสขึ้น
  loopFrom: 4,      // จบเพลงแล้ววนกลับห้องที่ 4 (Verse 1)
  bars: [
    ['intro', 'F',  'M  -  .  .  .  .  .  . ', ''],
    ['intro', 'C',  '.  .  .  .  .  .  .  . ', ''],
    ['intro', 'Bb', '.  .  .  .  M  -  .  . ', ''],
    ['intro', 'C',  '.  .  .  .  .  .  .  . ', '', 'fill'],

    ...part('verse', VERSE_MELODY, [
      'เจ้า แมว ตัว น้อย ตื่น นอน', 'ตอน เช้า',
      'บิด ขี้ เกียจ ยาว แล้ว ออก', 'ไป เดิน',
      'กระ โดด ข้าม รั้ว สูง ไม่', 'กลัว สัก นิด',
      'วิ่ง ไป ให้ ไกล ไล่ ตาม', 'แสง แดด อุ่น',
    ]),
    ...part('pre', PRE_MELODY, ['หัว ใจ เต้น แรง', 'ตึก ตัก ตัก', 'รู้ สึก ได้ เลย', 'ถึง เว ลา แล้ว']),
    ...part('chorus', CHORUS_MELODY, CHORUS_LYRICS),

    ['inter', 'F',  'M  -  .  .  .  .  .  . ', ''],
    ['inter', 'C',  '.  .  .  .  M  -  .  . ', ''],

    ...part('verse', VERSE_MELODY, [
      'ตก เย็น กลับ บ้าน เหนื่อย นิด', 'หน่อย หนา',
      'ขด ตัว กลม กลม บน ตัก', 'ของ เธอ',
      'ฝัน ว่า ได้ บิน ข้าม ทะ', 'เล กว้าง ไกล',
      'พรุ่ง นี้ ตื่น มา จะ วิ่ง', 'ไป อีก ครั้ง',
    ]),
    ...part('pre', PRE_MELODY, ['ลม พัด โชย มา', 'หอม ดอก ไม้', 'ชวน ให้ ออก ไป', 'วิ่ง กัน อีก ครั้ง']),
    ...part('chorus', CHORUS_MELODY, CHORUS_LYRICS),

    // ท่อนแยก: ช้าลง ฟุ้งขึ้น โน้ตยาว เปลี่ยนอารมณ์ก่อนฮุกสุดท้าย
    ['bridge', 'Dm', 'A5 -  -  -  F5 -  -  - ', 'บาง วัน'],
    ['bridge', 'Bb', 'D5 -  -  -  F5 -  G5 - ', 'ฟ้า ครึ้ม ฝน'],
    ['bridge', 'F',  'A5 -  G5 -  A5 -  -  - ', 'ไม่ เป็น ไร'],
    ['bridge', 'C',  'C6 -  -  -  G5 -  -  - ', 'นะ เธอ'],
    ['bridge', 'Dm', 'A5 -  -  -  F5 -  -  - ', 'ขอ แค่'],
    ['bridge', 'Bb', 'D5 -  -  -  F5 -  G5 - ', 'มี กัน และ'],
    ['bridge', 'C',  'A5 -  Bb5 - C6 -  -  - ', 'กัน ทุก วัน'],
    ['bridge', 'C',  'M  -  .  .  .  .  .  . ', '', 'fill'],

    ...part('chorus', CHORUS_MELODY, CHORUS_LYRICS, '+2'),   // ฮุกสุดท้าย ขึ้นคีย์

    ['outro', 'Bb', 'A5 -  F5 -  A5 -  F5 . ', 'เมี้ยว เมี้ยว เมี้ยว เมี้ยว', '+2'],
    ['outro', 'C',  'G5 -  -  -  -  -  .  . ', 'เย้', '+2'],
    ['outro', 'F',  'M  -  .  .  .  .  .  . ', '', '+2'],
    ['outro', 'F',  '.  .  .  .  .  .  .  . ', '', '+2'],
  ].map(([section, chord, mel, lyr, opt = '']) => ({
    section,
    chord,
    mel: mel.trim().split(/\s+/),
    lyr: lyr ? lyr.split(' ') : [],
    shift: Number((opt.match(/[+-]\d+/) || [0])[0]),
    fill: opt.includes('fill'),
  })),
};

class MeowSong {
  static CHORD_TONES = {
    F:  ['F4', 'A4', 'C5'],
    Dm: ['D4', 'F4', 'A4'],
    Bb: ['Bb3', 'D4', 'F4'],
    C:  ['C4', 'E4', 'G4'],
    Am: ['A3', 'C4', 'E4'],
  };
  static ROOTS = { F: 'F2', Dm: 'D2', Bb: 'Bb2', C: 'C3', Am: 'A2' };

  constructor(audioContext, output) {
    this.ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    this.song = MEOW_SONG;
    this.bpm = this.song.bpm;
    this.isPlaying = false;
    this.bar = 0;
    this.step = 0;
    this.nextTime = 0;
    this.lookahead = 0.1;
    this.timer = null;
    this.prevFreq = null;
    this.onStep = null;      // callback(bar, step)
    this.prevHarm = null;    // โน้ตก่อนหน้าของเสียงประสาน
    // เสียงทำนอง:
    //   'blend' = เสียงร้องเป็นหลัก + เปียโนเล่นตามเบา ๆ + เสียงประสานในท่อนฮุก (ค่าเริ่มต้น)
    //   'voice' = เสียงร้องอย่างเดียว · 'piano' = เปียโนอย่างเดียว
    this.lead = 'blend';

    // ---------- mixer ----------
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(output || this.ctx.destination);

    // piano = เปียโนที่เล่นตามเสียงร้อง (ตั้งเบาไว้) · harmony = เสียงร้องประสานต่ำลง 1 ขั้นคู่ 3
    // pad = เครื่องสายแพดลากคอร์ดยาว ๆ เป็นพื้นหลัง เชื่อมทุกเสียงให้กลมกลืนกัน
    this.levels = { voice: 0.3, piano: 0.11, harmony: 0.1, pad: 0.06, fx: 0.16, sparkle: 0.04, keys: 0.08, bass: 0.28, drums: 0.38, meow: 0.18 };
    this.tracks = {};
    for (const [name, level] of Object.entries(this.levels)) {
      const g = this.ctx.createGain();
      g.gain.value = level;
      g.connect(this.master);
      this.tracks[name] = g;
    }
    this.vols = {};          // ตัวคูณความดังที่ผู้เล่นปรับเอง (0–1.5) ต่อแทร็ก
    this.muted = {};

    // เอคโค่เบา ๆ
    this.delay = this.ctx.createDelay(1);
    this.feedback = this.ctx.createGain();
    this.wet = this.ctx.createGain();
    this.feedback.gain.value = 0.22;
    this.wet.gain.value = 0.12;
    this.tracks.voice.connect(this.delay);
    this.tracks.meow.connect(this.delay);
    this.delay.connect(this.feedback).connect(this.delay);
    this.delay.connect(this.wet).connect(this.master);
    this._updateDelayTime();

    // รีเวิร์บ: ทำให้เสียงร้องฟุ้ง นุ่ม และหวาน
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this._makeImpulse(2.6);
    this.reverbSend = this.ctx.createGain();
    this.reverbSend.gain.value = 0.45;
    this.tracks.voice.connect(this.reverbSend);
    this.tracks.meow.connect(this.reverbSend);
    this.tracks.sparkle.connect(this.reverbSend);
    this.tracks.piano.connect(this.reverbSend);
    this.tracks.harmony.connect(this.reverbSend);
    this.tracks.pad.connect(this.reverbSend);
    this.tracks.fx.connect(this.reverbSend);
    this.reverbSend.connect(this.reverb).connect(this.master);

    this.noise = this._makeNoise();
  }

  // ---------- ควบคุมเพลง ----------
  start() {
    if (this.isPlaying) return;
    this.ctx.resume();
    this.isPlaying = true;
    this.nextTime = this.ctx.currentTime + 0.05;
    this.timer = setInterval(() => this._scheduler(), 25);
  }
  pause() { this.isPlaying = false; clearInterval(this.timer); }
  stop() { this.pause(); this.bar = 0; this.step = 0; this.prevFreq = null; }
  setLead(name) { this.lead = name; this.prevFreq = null; this.prevHarm = null; }   // สลับเสียงทำนองระหว่างเล่นได้
  setTempo(bpm) { this.bpm = Math.min(200, Math.max(60, bpm)); this._updateDelayTime(); }
  setVolume(v) { this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02); }
  muteTrack(name, muted) { this.muted[name] = muted; this._applyLevel(name); }

  // ปรับความดังแยกแทร็ก: 1 = ค่าปกติ, 0.5 = ครึ่งหนึ่ง, 0 = เงียบ
  // เช่น music.setTrackVolume('voice', 0.6); music.setTrackVolume('piano', 0.3);
  setTrackVolume(name, v) { this.vols[name] = v; this._applyLevel(name); }

  _applyLevel(name) {
    const g = this.tracks[name];
    if (!g) return;
    const v = this.muted[name] ? 0 : this.levels[name] * (this.vols[name] ?? 1);
    g.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  // ---------- ตัวจัดตารางเวลา ----------
  get stepDur() { return 60 / this.bpm / 4; }

  _scheduler() {
    // ตามไม่ทัน (แท็บพื้นหลังโดนหน่วงตัวจับเวลา / เครื่องค้าง) = ข้ามมาเวลาปัจจุบัน ไม่ยิงโน้ตที่ค้างรัวทีเดียว
    if (this.nextTime < this.ctx.currentTime - 0.1) this.nextTime = this.ctx.currentTime + 0.02;
    while (this.nextTime < this.ctx.currentTime + this.lookahead) {
      this._playStep(this.bar, this.step, this.nextTime);
      if (this.onStep) {
        const b = this.bar, s = this.step;
        setTimeout(() => this.onStep(b, s), Math.max(0, (this.nextTime - this.ctx.currentTime) * 1000));
      }
      this.nextTime += this.stepDur;
      if (++this.step === 16) {
        this.step = 0;
        if (++this.bar >= this.song.bars.length) this.bar = this.song.loopFrom;
      }
    }
  }

  _playStep(barIdx, s, t) {
    const b = this.song.bars[barIdx];
    const d = this.stepDur;
    const sec = b.section;
    const k = Math.pow(2, (this.song.transpose + b.shift) / 12);   // ตัวคูณเปลี่ยนคีย์
    const quiet = sec === 'intro' || sec === 'inter' || sec === 'outro';

    // 1) ทำนองร้อง
    if (s % 2 === 0) {
      const i = s / 2;
      const tok = b.mel[i];
      if (tok === 'M') {
        this._meow(t);
      } else if (tok === '.') {
        this.prevFreq = null;
        this.prevHarm = null;
      } else if (tok !== '-') {
        let len = 1;
        while (b.mel[i + len] === '-') len++;
        const f = this._freq(tok) * k;
        const dur = len * 2 * d * 0.95;
        const h = this._thirdBelow(tok) * k;                 // โน้ตประสาน (ต่ำลง 3 ขั้น ตามสเกล)

        if (this.lead === 'piano') {
          this._piano(f, t, dur, this.tracks.piano, 2.6);   // เปียโนเดี่ยว: ดังขึ้นเป็นเสียงหลัก
        } else {
          // เสียงร้องหลัก
          this._voice(f, t, dur, this.tracks.voice, this.prevFreq);
          this.prevFreq = f;

          if (this.lead === 'blend') {
            // เปียโนเล่นตามเบา ๆ เป็นคู่โน้ต (ทำนอง + โน้ตประสาน) ให้ฟีลคอรัส
            this._piano(f, t, dur, this.tracks.piano);
            this._piano(h, t, dur, this.tracks.piano);
          }
          // ท่อนฮุกกับท่อนแยก: เพิ่มเสียงร้องประสานอีกเสียง
          if (sec === 'chorus' || sec === 'bridge') {
            this._voice(h, t, dur, this.tracks.harmony, this.prevHarm);
            this.prevHarm = h;
          }
        }
        if (sec === 'chorus' || sec === 'bridge') this._sparkle(f, t);
      }
    }

    // 2) คีย์บอร์ด
    const tones = MeowSong.CHORD_TONES[b.chord].map(n => this._freq(n) * k);
    if (sec === 'chorus') {
      this._pluck(tones[s % 3] * 2, t, d * 0.7);                 // ไล่โน้ตเร็ว คึกคัก
    } else if (sec === 'pre') {
      if (s % 2 === 0) this._pluck(tones[(s / 2) % 3] * 2, t, d * 1.4);  // ไล่โน้ตช้ากว่า ค่อย ๆ บิลด์
    } else if (sec === 'bridge') {
      if (s % 4 === 0) this._pluck(tones[(s / 4) % 3] * 2, t, d * 4);    // ห่าง ๆ ฟุ้ง ๆ
    } else if (s % 4 === 2) {
      tones.forEach(f => this._pluck(f, t, d * 1.2));             // ดีดจังหวะยก แมวเดินย่อง
    }

    // 2.5) แพดเครื่องสาย: ลากคอร์ดยาวทั้งห้อง หนา-บางตามท่อน
    if (s === 0) {
      const padVol = { intro: 0.7, verse: 0.55, pre: 0.8, chorus: 1, inter: 0.8, bridge: 1.15, outro: 0.8 }[sec];
      this._pad(tones, t, 16 * d, padVol);
    }

    // 2.7) เอฟเฟกต์ในเพลง
    const prev = this.song.bars[barIdx - 1];
    if (s === 0 && b.fill && (sec === 'pre' || sec === 'bridge')) {
      this._riser(t, 16 * d);                        // เสียงลมไต่ขึ้น บอกว่ากำลังจะเข้าฮุก
    }
    if (s === 0 && sec === 'chorus' && prev && prev.section !== 'chorus') {
      this._crash(t);                                // ฉาบเบา ๆ ตอนเข้าฮุก
    }

    // 3) เบส
    const root = this._freq(MeowSong.ROOTS[b.chord]) * k;
    if (sec === 'chorus') {
      if (s % 2 === 0) this._bass((s / 2) % 2 === 0 ? root : root * 2, t, d * 1.6);
    } else if (sec === 'bridge') {
      if (s === 0) this._bass(root, t, d * 14);
    } else if (s === 0) {
      this._bass(root, t, d * 3);
    } else if (s === 8 && !quiet) {
      this._bass(root * 1.5, t, d * 3);
    }

    // 4) กลอง
    if (b.fill && s >= 8) {                                      // ฟิลส่งท่อน
      if (s % 2 === 0 || s >= 13) this._snare(t);
      return;
    }
    if (quiet || sec === 'bridge') {
      if (s === 0) this._kick(t);
      return;
    }
    if (s === 0 || s === 8 || (sec === 'chorus' && s === 10)) this._kick(t);
    if (s === 4 || s === 12) this._snare(t);
    if (sec === 'verse' ? s % 4 === 2 : s % 2 === 0) this._hat(t, s === 14 ? 0.12 : 0.04);
  }

  // ---------- เสียงร้องแบบนุ่มหวาน ----------
  // 1) คลื่น sine เป็นหลัก (นุ่มที่สุด) + triangle บาง ๆ ให้มีเนื้อเสียง
  // 2) ซ้อนเสียงเพี้ยนกันนิด ๆ ให้อุ่นและกลม
  // 3) ฟิลเตอร์ตัดเสียงแหลมตามระดับโน้ต โน้ตสูงก็ยังนุ่ม ไม่แสบหู
  // 4) เข้าเสียงช้า ปล่อยยาว โน้ตต่อกันเนียน
  // 5) vibrato เบา ช้า เริ่มหลังโน้ตดังไปแล้วครู่หนึ่ง
  _voice(f, t, dur, dest, from) {   // from = ความถี่โน้ตก่อนหน้า (ไว้เอื้อน) หรือ null
    const ctx = this.ctx;
    const layers = [['sine', 0, 0.6], ['sine', -7, 0.3], ['sine', 7, 0.3], ['triangle', 0, 0.18]];
    const mix = ctx.createGain();
    const oscs = layers.map(([type, detune, vol]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.detune.value = detune;
      g.gain.value = vol;
      if (from) {                                // เอื้อนจากโน้ตก่อนหน้า
        o.frequency.setValueAtTime(from, t);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.1);
      } else {                                   // ช้อนเสียงขึ้นเล็กน้อยตอนเริ่มประโยค
        o.frequency.setValueAtTime(f * 0.985, t);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.07);
      }
      o.connect(g).connect(mix);
      return o;
    });

    const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    lfo.frequency.value = 4.6;
    lfoGain.gain.setValueAtTime(0, t);
    lfoGain.gain.setValueAtTime(0, t + Math.min(0.18, dur * 0.4));
    lfoGain.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.5, dur));
    lfo.connect(lfoGain);
    oscs.forEach(o => lfoGain.connect(o.frequency));

    const soft = ctx.createBiquadFilter();
    soft.type = 'lowpass';
    soft.frequency.value = Math.min(4000, f * 2.5);
    soft.Q.value = 0.5;

    const g = ctx.createGain();
    const hold = Math.max(t + 0.2, t + dur - 0.08);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + 0.08);
    g.gain.linearRampToValueAtTime(0.85, t + 0.22);
    g.gain.setValueAtTime(0.85, hold);
    g.gain.linearRampToValueAtTime(0, hold + 0.2);

    mix.connect(soft).connect(g).connect(dest);
    [...oscs, lfo].forEach(o => { o.start(t); o.stop(hold + 0.25); });
  }

  // ---------- เปียโน ----------
  // เสียงเปียโนจริงเกิดจากสายที่ถูกค้อนตี ประกอบด้วยหลายความถี่ (ฮาร์มอนิก) ซ้อนกัน
  // เลียนแบบด้วย:
  //   1) ซ้อนคลื่น sine 6 ชั้น ที่ความถี่ 1×, 2×, 3×... ของโน้ต ชั้นสูงเบากว่า
  //   2) ฮาร์มอนิกสูงจางเร็วกว่า → เสียงเริ่มใสแล้วค่อย ๆ กลมนุ่ม
  //   3) สายเปียโนแข็ง ฮาร์มอนิกจึงเพี้ยนสูงนิด ๆ (inharmonicity) ทำให้ฟังเป็นเปียโนไม่ใช่ออร์แกน
  //   4) ตัวโน้ตหลักมี 2 สายเพี้ยนกันนิดหน่อย ให้เสียงมีประกาย
  //   5) เสียง "ตึ้ก" สั้น ๆ ตอนค้อนกระทบสาย
  //   6) โน้ตต่ำก้องนาน โน้ตสูงจางเร็ว เหมือนเปียโนจริง
  _piano(f, t, dur, dest, boost = 1) {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 0.55 * boost;

    // โทนโดยรวม: โน้ตยิ่งเบา ฟิลเตอร์ยิ่งตัดแหลม (ตอนนี้ใช้ค่าคงที่ตามระดับโน้ต)
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = Math.min(9000, f * 7);
    out.connect(tone).connect(dest);

    const B = 0.0004;                                     // ค่าความแข็งของสาย
    const decay = Math.min(2.5, 1.4 * Math.sqrt(440 / f)); // เวลาก้อง (วินาที) ขึ้นกับระดับโน้ต
    const end = t + dur;
    // [ฮาร์มอนิกที่, ความดัง, เพี้ยนกี่ cent]
    const partials = [[1, 1, 0], [1, 0.6, 2.5], [2, 0.45, 0], [3, 0.22, 0], [4, 0.12, 0], [5, 0.06, 0], [6, 0.03, 0]];

    for (const [n, amp, cents] of partials) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = n * f * Math.sqrt(1 + B * n * n);
      o.detune.value = cents;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.004);              // ค้อนตี: ดังทันที
      g.gain.setTargetAtTime(0, t + 0.004, decay / Math.pow(n, 0.8)); // ค่อย ๆ จาง ชั้นสูงจางไวกว่า
      g.gain.setTargetAtTime(0, end, 0.09);                         // ปล่อยคีย์: ตัวหน่วงลงมาซับเสียง
      o.connect(g).connect(out);
      o.start(t);
      o.stop(end + 0.6);
    }

    // เสียงค้อนกระทบสาย
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = Math.min(6000, f * 4);
    bp.Q.value = 1.5;
    const hg = ctx.createGain();
    hg.gain.setValueAtTime(0.25, t);
    hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    src.connect(bp).connect(hg).connect(out);
    src.start(t);
    src.stop(t + 0.05);
  }

  // ---------- เสียงเมี้ยว ----------
  _meow(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(560, t);
    o.frequency.exponentialRampToValueAtTime(860, t + 0.1);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.2);
    o.frequency.exponentialRampToValueAtTime(580, t + 0.45);

    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.Q.value = 3;
    formant.frequency.setValueAtTime(600, t);
    formant.frequency.exponentialRampToValueAtTime(2000, t + 0.12);
    formant.frequency.exponentialRampToValueAtTime(1500, t + 0.25);
    formant.frequency.exponentialRampToValueAtTime(700, t + 0.45);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + 0.04);
    g.gain.linearRampToValueAtTime(0.8, t + 0.3);
    g.gain.linearRampToValueAtTime(0, t + 0.48);

    o.connect(formant).connect(g).connect(this.tracks.meow);
    o.start(t);
    o.stop(t + 0.5);
    this.prevFreq = null;
    this.prevHarm = null;
  }

  // ---------- เครื่องดนตรีอื่น ๆ ----------
  _sparkle(f, t) { this._env(f * 2, t, 0.5, 'sine', this.tracks.sparkle); }
  _pluck(f, t, dur) { this._env(f, t, dur, 'triangle', this.tracks.keys); }
  // เบสอุ่น: sine (ทุ้มกลม) + triangle (ให้ได้ยินชัดในลำโพงเล็ก) ผ่านฟิลเตอร์ตัดแหลม
  _bass(f, t, dur) {
    const ctx = this.ctx;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + 0.01);
    g.gain.setTargetAtTime(0.6, t + 0.01, 0.15);
    g.gain.setTargetAtTime(0.0001, t + dur, 0.05);
    lp.connect(g).connect(this.tracks.bass);
    [['sine', 1], ['triangle', 0.5]].forEach(([type, vol]) => {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = type;
      o.frequency.value = f;
      og.gain.value = vol;
      o.connect(og).connect(lp);
      o.start(t);
      o.stop(t + dur + 0.3);
    });
  }

  // riser: noise ผ่านฟิลเตอร์ที่กวาดจากต่ำไปสูง ดังขึ้นเรื่อย ๆ แล้วตัดตอนเข้าฮุก
  _riser(t, dur) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(6000, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.02);
    src.connect(bp).connect(g).connect(this.tracks.fx);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  // ฉาบ: noise ความถี่สูงจางยาว + ประกายย่านกลาง
  _crash(t) {
    [['highpass', 5000, 0.6, 1.6], ['bandpass', 3200, 0.3, 0.8]].forEach(([type, freq, vol, len]) => {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.setTargetAtTime(0, t, len / 4);
      src.connect(f).connect(g).connect(this.tracks.fx);
      src.start(t);
      src.stop(t + len + 0.1);
    });
  }

  // แพดเครื่องสาย: คลื่น sawtooth 2 ตัวเพี้ยนกันต่อโน้ต → ฟิลเตอร์ตัดให้นุ่ม → เข้าช้า ออกช้า
  // คอร์ดถัดไปจะค่อย ๆ ซ้อนทับ (crossfade) ทำให้เปลี่ยนคอร์ดเนียน ไม่มีรอยต่อ
  _pad(freqs, t, dur, vol) {
    const ctx = this.ctx;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.linearRampToValueAtTime(1500, t + dur * 0.5);   // ค่อย ๆ สว่างขึ้นกลางห้อง
    lp.frequency.linearRampToValueAtTime(1000, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.35);
    g.gain.setValueAtTime(vol, t + dur - 0.05);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.5);
    lp.connect(g).connect(this.tracks.pad);
    for (const f of freqs) {
      for (const cents of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = cents;
        o.connect(lp);
        o.start(t);
        o.stop(t + dur + 0.55);
      }
    }
  }

  _env(f, t, dur, type, dest) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  _kick(t) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(this.tracks.drums);
    o.start(t);
    o.stop(t + 0.22);
  }
  _snare(t) {
    this._noiseHit(t, 0.12, 'bandpass', 1500, 0.6);
    this._noiseHit(t + 0.012, 0.1, 'bandpass', 1500, 0.4);
  }
  _hat(t, len) { this._noiseHit(t, len, 'highpass', 8000, 0.25); }

  _noiseHit(t, len, type, freq, vol) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(filter).connect(g).connect(this.tracks.drums);
    src.start(t);
    src.stop(t + len + 0.02);
  }

  // ---------- ตัวช่วย ----------
  _freq(note) {         // 'Bb5' → Hz (รองรับ # และ b)
    const m = note.match(/^([A-G])([#b]?)(\d)$/);
    let semis = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
    if (m[2] === '#') semis++;
    if (m[2] === 'b') semis--;
    const midi = (Number(m[3]) + 1) * 12 + semis;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  _thirdBelow(note) {
    // หาโน้ตที่ต่ำลง 2 ขั้นในสเกล F major (F G A Bb C D E) แล้วคืนค่าเป็น Hz (ก่อนเปลี่ยนคีย์)
    // เช่น A5 → F5, C6 → A5, F5 → D5 ประสานกันเป็นคู่ 3 ฟังกลมกล่อม
    const scale = [5, 7, 9, 10, 0, 2, 4];               // pitch class ของ F G A Bb C D E
    const midi = Math.round(69 + 12 * Math.log2(this._freq(note) / 440));
    const i = scale.indexOf(midi % 12);
    const target = scale[(i + 5) % 7];                   // ถอยหลัง 2 ขั้น
    let m = midi - 1;
    while (m % 12 !== target) m--;
    return 440 * Math.pow(2, (m - 69) / 12);
  }
  _makeNoise() {
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }
  _makeImpulse(seconds) {   // เสียงก้องจาก noise ที่ค่อย ๆ จาง (สเตอริโอ)
    const rate = this.ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
    return buf;
  }
  _updateDelayTime() {
    this.delay.delayTime.setTargetAtTime(this.stepDur * 3, this.ctx.currentTime, 0.05);
  }
}


// =====================================================================
// GameSfx — ชุดเสียงเอฟเฟกต์สำหรับเกมแมว สังเคราะห์ด้วย Web Audio API
// ทุกเสียงที่มีโน้ต จูนอยู่ในคีย์ A major เท่ากับเพลง MeowSong เล่นทับกันจึงไม่เพี้ยน
//
//   const sfx = new GameSfx(ctx, sfxOut());   // ใช้ AudioContext ตัวเดียวกับเพลง
//   sfx.jump();          // หรือ sfx.play('jump')
//   sfx.combo(3);        // คอมโบที่ 3 เสียงจะสูงขึ้นเรื่อย ๆ
//
// รายการเสียง: jump, doubleJump, land, collect, combo(n), powerUp, hit,
//              meow, purr, click, countdown(isGo), levelUp, gameOver
// =====================================================================

class GameSfx {
  static SOUNDS = ['jump', 'doubleJump', 'land', 'collect', 'combo', 'powerUp',
                   'hit', 'meow', 'purr', 'click', 'countdown', 'levelUp', 'gameOver'];

  constructor(audioContext, output) {
    this.ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    this.out = this.ctx.createGain();
    this.out.gain.value = 0.5;
    this.out.connect(output || this.ctx.destination);
    this.noise = this._makeNoise();
  }

  setVolume(v) { this.out.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02); }

  // เรียกด้วยชื่อ เช่น sfx.play('collect') — สะดวกเวลาเก็บชื่อเสียงไว้ในข้อมูลเกม
  play(name, ...args) {
    if (GameSfx.SOUNDS.includes(name)) this[name](...args);
  }

  // ===================== เสียงการเคลื่อนไหว =====================

  // กระโดด: เสียงไต่ขึ้นเร็ว ๆ "ฟิ้ว"
  jump() {
    const t = this._now(), f = this._vary(330);
    this._tone(f, t, 0.16, 'triangle', 0.5, f * 2.3);
    this._tone(f, t, 0.12, 'square', 0.08, f * 2.3);
  }

  // กระโดดสองชั้น: ไต่ขึ้นสองจังหวะ สูงกว่าครั้งแรก
  doubleJump() {
    const t = this._now(), f = this._vary(520);
    this._tone(f, t, 0.1, 'triangle', 0.45, f * 2);
    this._tone(f * 1.26, t + 0.07, 0.14, 'triangle', 0.45, f * 2.6);
  }

  // ลงพื้น: "ตุ้บ" เบา ๆ เหมือนอุ้งเท้าแมว
  land() {
    const t = this._now();
    this._tone(130, t, 0.1, 'sine', 0.6, 50);
    this._noiseHit(t, 0.05, 'lowpass', 500, 0.25);
  }

  // ===================== เสียงเก็บของ / รางวัล =====================

  // เก็บปลา/เหรียญ: ระฆังสองโน้ต B → E "ติ๊ง-ติ๊ง"
  collect() {
    const t = this._now();
    this._bell(this._midi(83), t, 0.25, 0.45);         // B5
    this._bell(this._midi(88), t + 0.07, 0.4, 0.5);    // E6
  }

  // คอมโบ: ยิ่งเก็บต่อเนื่อง โน้ตยิ่งสูงตามสเกล (ส่งจำนวนคอมโบเข้ามา)
  combo(n = 1) {
    const t = this._now();
    const steps = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];   // A major pentatonic
    const m = 81 + steps[Math.min(n - 1, steps.length - 1)];  // เริ่มที่ A5
    this._bell(this._midi(m - 5), t, 0.08, 0.25);              // โน้ตนำสั้น ๆ
    this._bell(this._midi(m), t + 0.04, 0.35, 0.5);
  }

  // พลังพิเศษ: อาร์เปจจิโอ A major ไต่ขึ้นยาว + ประกายระยิบ
  powerUp() {
    const t = this._now();
    [69, 73, 76, 81, 85, 88, 93].forEach((m, i) => {
      this._tone(this._midi(m), t + i * 0.055, 0.18, 'triangle', 0.4);
      this._bell(this._midi(m + 12), t + i * 0.055, 0.25, 0.15);
    });
    this._noiseHit(t + 0.38, 0.5, 'highpass', 7000, 0.15);      // ระยิบตอนท้าย
  }

  // ===================== เสียงเจ็บ / อารมณ์แมว =====================

  // ชนสิ่งกีดขวาง: "ปึ้ก" + เสียงตกลง
  hit() {
    const t = this._now();
    this._noiseHit(t, 0.22, 'lowpass', 1200, 0.6);
    this._tone(220, t, 0.3, 'square', 0.18, 55);
    this._tone(110, t, 0.25, 'sine', 0.5, 40);
  }

  // เมี้ยวสั้น ๆ น่ารัก (สุ่มระดับเสียงนิดหน่อยทุกครั้ง จะได้ไม่ซ้ำ)
  meow() {
    const t = this._now(), k = this._vary(1, 0.12);
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(650 * k, t);
    o.frequency.exponentialRampToValueAtTime(1000 * k, t + 0.08);
    o.frequency.exponentialRampToValueAtTime(700 * k, t + 0.3);
    const vowel = this.ctx.createBiquadFilter();               // กวาดเป็นสระ "มี-เอี้ยว"
    vowel.type = 'bandpass';
    vowel.Q.value = 3;
    vowel.frequency.setValueAtTime(700, t);
    vowel.frequency.exponentialRampToValueAtTime(2200, t + 0.09);
    vowel.frequency.exponentialRampToValueAtTime(900, t + 0.3);
    const g = this._env(t, 0.03, 0.32, 0.7);
    o.connect(vowel).connect(g);
    o.start(t);
    o.stop(t + 0.35);
  }

  // ครางครืดคราด (purr): เสียงต่ำ ๆ ที่ดังเบาสลับกันเร็ว ๆ ประมาณ 25 ครั้งต่อวินาที
  purr(duration = 1.2) {
    const t = this._now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 280;
    const body = this.ctx.createOscillator();                  // เสียงทุ้มในอก
    body.frequency.value = 55;
    const bodyG = this.ctx.createGain();
    bodyG.gain.value = 0.4;

    const am = this.ctx.createGain();                          // ตัวทำให้สั่น
    am.gain.value = 0.5;
    const lfo = this.ctx.createOscillator(), lfoG = this.ctx.createGain();
    lfo.frequency.value = 25;
    lfoG.gain.value = 0.5;
    lfo.connect(lfoG).connect(am.gain);

    const g = this._env(t, 0.15, duration, 1.6);
    src.connect(lp).connect(am);
    body.connect(bodyG).connect(am);
    am.connect(g);
    [src, body, lfo].forEach(n => { n.start(t); n.stop(t + duration + 0.05); });
  }

  // ===================== เสียงระบบเกม =====================

  // คลิกปุ่มเมนู: "ติ๊ก" เล็ก ๆ
  click() {
    this._tone(1760, this._now(), 0.035, 'sine', 0.35);
  }

  // นับถอยหลัง: เรียก countdown() ตอน 3, 2, 1 และ countdown(true) ตอน "เริ่ม!"
  countdown(isGo = false) {
    const t = this._now();
    const f = this._midi(isGo ? 93 : 81);                      // A5 / A6
    const len = isGo ? 0.4 : 0.14;
    this._tone(f, t, len, 'triangle', 0.5);
    this._tone(f, t, len, 'square', 0.08);
  }

  // เลเวลอัป / ชนะ: แตรสั้น ๆ แล้วจบด้วยคอร์ด A major
  levelUp() {
    const t = this._now();
    [69, 73, 76].forEach((m, i) => this._lead(this._midi(m), t + i * 0.1, 0.12, 0.4));
    [81, 85, 88].forEach(m => this._lead(this._midi(m), t + 0.32, 0.7, 0.3));
    this._bell(this._midi(93), t + 0.32, 0.8, 0.2);
  }

  // เกมโอเวอร์: ทำนองไต่ลงช้า ๆ แบบน่าเอ็นดู ไม่เศร้าเกินไป
  gameOver() {
    const t = this._now();
    const notes = [76, 74, 73, 71];                            // E D C# B
    notes.forEach((m, i) => this._lead(this._midi(m), t + i * 0.22, 0.2, 0.4));
    this._lead(this._midi(69), t + 0.9, 0.9, 0.4, -0.6);       // จบที่ A แล้วเสียงตกลงนิด ๆ
  }

  // ===================== ตัวสร้างเสียงพื้นฐาน =====================

  _now() { this.ctx.resume(); return this.ctx.currentTime + 0.005; }
  _midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  _vary(x, amount = 0.04) { return x * (1 + (Math.random() - 0.5) * amount); } // สุ่มเล็กน้อยกันฟังซ้ำ

  // envelope ที่ต่อเข้า output: เข้าเร็ว ค้าง แล้วจาง
  _env(t, attack, dur, vol) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.out);
    return g;
  }

  // โน้ตพื้นฐาน ถ้าใส่ endF เสียงจะไหลไปถึงความถี่นั้น (ใช้ทำเสียงกระโดด/ตก)
  _tone(f, t, dur, type, vol, endF) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (endF) o.frequency.exponentialRampToValueAtTime(endF, t + dur);
    o.connect(this._env(t, 0.005, dur, vol));
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // ระฆัง: sine + ฮาร์มอนิกแบบโลหะ (2.76 เท่า) ที่จางเร็วกว่า
  _bell(f, t, dur, vol) {
    this._tone(f, t, dur, 'sine', vol);
    this._tone(f * 2.76, t, dur * 0.4, 'sine', vol * 0.3);
  }

  // ลีดนุ่ม ๆ มี vibrato ใช้กับเสียงเพลงสั้น (levelUp, gameOver) ให้เข้ากับเสียงร้องในเพลง
  _lead(f, t, dur, vol, bend = 0) {
    const o = this.ctx.createOscillator(), lfo = this.ctx.createOscillator(), lfoG = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f, t);
    if (bend) o.frequency.linearRampToValueAtTime(f * Math.pow(2, bend / 12), t + dur);
    lfo.frequency.value = 5;
    lfoG.gain.value = f * 0.008;
    lfo.connect(lfoG).connect(o.frequency);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = f * 3;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(lp).connect(g).connect(this.out);
    [o, lfo].forEach(n => { n.start(t); n.stop(t + dur + 0.02); });
  }

  _noiseHit(t, len, type, freq, vol) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    src.connect(filter).connect(this._env(t, 0.003, len, vol));
    src.start(t);
    src.stop(t + len + 0.02);
  }

  _makeNoise() {
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }
}

export { MeowSong, GameSfx, MEOW_SONG };
