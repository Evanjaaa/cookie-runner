// src/music.js
// ─────────────────────────────────────────────────────────────
// เพลงประกอบ สังเคราะห์เองทั้งหมดเหมือนเสียงเอฟเฟกต์ ไม่มีไฟล์เพลง
//
// ทุกเพลงอยู่ในสเกลเพนทาโทนิก C (C D E G A) เหมือนกันหมด
// สลับไปมาระหว่างเพลงกลางคันจึงไม่มีวันหลุดคีย์ ไม่ว่าจะสลับตอนไหน
//
// เรื่องจังหวะ: ห้ามใช้ setInterval ยิงโน้ตทีละตัว เพราะ timer ของเบราว์เซอร์
// คลาดเป็นสิบมิลลิวินาทีและหยุดเดินตอนสลับแท็บ จังหวะจะเพี้ยนทันที
// ต้องจองโน้ตล่วงหน้าไว้กับนาฬิกาของ AudioContext ซึ่งเดินด้วย sample clock
//
// เรื่องสลับเพลง: เพราะจองล่วงหน้าไว้ทั้งลูป (15 วินาที) ถ้าแค่เปลี่ยนตัวแปร
// เพลงใหม่จะเริ่มดังช้าถึง 15 วินาที ซึ่งยาวกว่าช่วงพิเศษบางช่วงทั้งช่วง
// จึงต้องเก็บอ้างอิงโน้ตที่จองไว้ แล้วยกเลิกตัวที่ "ยังไม่เริ่มเล่น" ตอนสลับ
// ─────────────────────────────────────────────────────────────
import { audioCtx, isMuted } from './audio.js';

const BPM = 128;
const BEAT = 60 / BPM;
const LOOP_BEATS = 32;

// วัดจริงแล้ว 0.4 ทำให้เพลงเบากว่าเสียงเอฟเฟกต์ราวสองเท่า
// ได้ยินเพลงชัดแต่ไม่กลบเสียงแมว
const MUSIC_VOL = 0.4;

const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880.0;
const C6 = 1046.5, D6 = 1174.66, E6 = 1318.51, G6 = 1567.98, A6 = 1760.0;
const F2 = 87.31, G2 = 98.0, A2 = 110.0, C3 = 130.81;
// ช่วงกลางสำหรับแพดคอร์ดค้างของเพลงบนฟ้า
const A3 = 220.0, C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.0, A4 = 440.0;

// ── เพลงหลัก: ตอนวิ่งปกติ ────────────────────────────────────
const MAIN_LEAD = [
  [E5, 1], [G5, 1], [A5, 1], [G5, 1],
  [E5, 1], [D5, 1], [C5, 2],
  [E5, 1], [G5, 1], [C6, 1], [A5, 1],
  [G5, 2], [E5, 2],

  [G5, 1], [A5, 1], [C6, 1], [A5, 1],
  [G5, 1], [E5, 1], [D5, 2],
  [C6, 1], [A5, 1], [G5, 1], [E5, 1],
  [D5, 1], [C5, 3],
];
const MAIN_BASS = [
  [C3, 4], [A2, 4], [F2, 4], [G2, 4],
  [C3, 4], [A2, 4], [F2, 4], [G2, 4],
];

// ── เพลงเต้น: ตอนแมวใช้ความสามารถ ────────────────────────────
// เขบ็ตรัวกับเบสทุกบีต ฟังซนและมีชีวิตกว่าเพลงหลักชัดเจน
const DANCE_LEAD = [
  [G5, .5], [G5, .5], [A5, .5], [C6, .5], [A5, .5], [G5, .5], [E5, 1],
  [E5, .5], [G5, .5], [A5, .5], [G5, .5], [E5, .5], [D5, .5], [C5, 1],
  [C6, .5], [C6, .5], [A5, .5], [G5, .5], [A5, .5], [C6, .5], [D6, 1],
  [G5, .5], [A5, .5], [C6, 1], [E6, 2],

  [E6, .5], [D6, .5], [C6, .5], [A5, .5], [G5, .5], [A5, .5], [C6, 1],
  [A5, .5], [G5, .5], [E5, .5], [G5, .5], [A5, .5], [C6, .5], [A5, 1],
  [G5, .5], [E5, .5], [D5, .5], [E5, .5], [G5, .5], [A5, .5], [C6, 1],
  [A5, .5], [G5, .5], [E5, 1], [C5, 2],
];
const DANCE_BASS = [
  ...Array(4).fill([C3, 1]), ...Array(4).fill([A2, 1]),
  ...Array(4).fill([F2, 1]), ...Array(4).fill([G2, 1]),
  ...Array(4).fill([C3, 1]), ...Array(4).fill([A2, 1]),
  ...Array(4).fill([F2, 1]), ...Array(4).fill([G2, 1]),
];

// ── เพลงหน้าแรก ──────────────────────────────────────────────
// กระโดดสั้น-ยาวสลับกัน ฟังซนแต่ไม่รัวเท่าเพลงเต้น
// เบสเคาะเว้นจังหวะแบบ "ตุ๊บ...ตุ๊บ" ให้รู้สึกเบาและน่ารัก
const HOME_LEAD = [
  [C5, .5], [E5, .5], [G5, 1], [E5, .5], [G5, .5], [A5, 1],
  [G5, .5], [E5, .5], [D5, 1], [C5, .5], [D5, .5], [E5, 1],
  [G5, .5], [A5, .5], [C6, 1], [A5, .5], [G5, .5], [E5, 1],
  [D5, 1], [E5, 1], [C5, 2],

  [E5, .5], [G5, .5], [A5, 1], [C6, .5], [A5, .5], [G5, 1],
  [A5, .5], [G5, .5], [E5, 1], [D5, .5], [E5, .5], [G5, 1],
  [C6, .5], [A5, .5], [G5, 1], [E5, .5], [D5, .5], [C5, 1],
  [E5, 1], [D5, 1], [C5, 2],
];
const HOME_BASS = [C3, A2, F2, G2, C3, A2, F2, G2].flatMap((r) => [
  [r, 1], [null, 1], [r, 1], [null, 1],
]);

// ─────────────────────────────────────────────────────────────
// เพลงบนฟ้า — ต้องฟังแล้วรู้ทันทีว่าคนละเพลงกับตอนวิ่ง
//
// เวอร์ชันแรกฟังคล้ายเพลงหลักมากเพราะอยู่ช่วงเสียงเดียวกัน (C5-C6)
// และเดินคอร์ดชุดเดียวกัน ต่างแค่ sine กับ triangle ซึ่งหูแยกแทบไม่ออก
// แก้สามอย่างพร้อมกัน: ยกเมโลดี้ขึ้นทั้งอ็อกเทฟ (C6-A6),
// เว้นจังหวะให้มีที่ว่างเยอะ, และเพิ่มแพดคอร์ดค้างเป็นพื้นเสียง
// ทั้งสามอย่างคือสิ่งที่ทำให้เพลงฟังว่า "ลอยอยู่" ไม่ใช่ "กำลังวิ่ง"
// ─────────────────────────────────────────────────────────────

/** กลางวัน: ลอยโปร่ง สดใส ปลายวลีค้างไว้ให้หายใจ */
const SKY_DAY_LEAD = [
  [G6, 2], [null, 1], [E6, 1],
  [C6, 3], [null, 1],
  [D6, 2], [G6, 2],
  [E6, 3], [null, 1],

  [A6, 2], [null, 1], [G6, 1],
  [E6, 3], [null, 1],
  [C6, 2], [D6, 2],
  [C6, 4],
];
/** แพดสองชั้นซ้อนกันเป็นคอร์ด — layer เดียวเล่นได้ทีละโน้ต จึงต้องแยกสองชั้น */
const SKY_DAY_PAD_A = [[C4, 8], [F4, 8], [G4, 8], [C4, 8]];
const SKY_DAY_PAD_B = [[E4, 8], [A4, 8], [D4, 8], [E4, 8]];
const SKY_DAY_BASS = [[C3, 8], [F2, 8], [G2, 8], [C3, 8]];

/** กลางคืน: กล่อมนอน เดินลงตลอด โน้ตยาวกว่ากลางวันอีก */
const SKY_NIGHT_LEAD = [
  [E6, 3], [null, 1],
  [C6, 4],
  [D6, 2], [C6, 2],
  [A5, 3], [null, 1],

  [G5, 4],
  [C6, 3], [null, 1],
  [A5, 2], [G5, 2],
  [E5, 4],
];
const SKY_NIGHT_PAD_A = [[C4, 8], [A3, 8], [F4, 8], [G4, 8]];
const SKY_NIGHT_PAD_B = [[E4, 8], [C4, 8], [A4, 8], [D4, 8]];
const SKY_NIGHT_BASS = [[C3, 8], [A2, 8], [F2, 8], [G2, 8]];

/** แปลง [ความถี่, ความยาว] เป็นรายการโน้ตที่รู้ว่าเริ่มบีตที่เท่าไหร่ */
function schedule(seq) {
  let at = 0;
  return seq.map(([freq, beats]) => {
    const note = { at, beats, freq };
    at += beats;
    return note;
  }).filter((n) => n.freq);   // [null, n] = ตัวหยุด ใช้เว้นจังหวะ
}

const soft = (type, vol, attack, release) => ({ type, vol, attack, release });

const TRACKS = {
  main: [
    { notes: schedule(MAIN_LEAD), voice: soft('triangle', 0.085, 0.02, 0.72) },
    { notes: schedule(MAIN_BASS), voice: soft('sine', 0.075, 0.04, 0.8) },
  ],
  dance: [
    // square ตัดผ่านเสียงอื่นได้ดี และ release สั้นทำให้โน้ตขาดเป็นห้วง ๆ
    // ซึ่งคือสิ่งที่ทำให้ฟังเป็นจังหวะเต้น ไม่ใช่เสียงลากยาว
    { notes: schedule(DANCE_LEAD), voice: soft('square', 0.07, 0.012, 0.46) },
    { notes: schedule(DANCE_BASS), voice: soft('triangle', 0.08, 0.02, 0.4) },
  ],
  home: [
    // release 0.55 ทำให้โน้ตขาดสั้น ๆ ฟังกระโดดน่ารัก ไม่ลากเนือย
    { notes: schedule(HOME_LEAD), voice: soft('triangle', 0.09, 0.015, 0.55) },
    { notes: schedule(HOME_BASS), voice: soft('sine', 0.07, 0.02, 0.5) },
  ],
  skyDay: [
    // attack ยาวมากทำให้โน้ตค่อย ๆ โผล่แทนที่จะดีดออกมา = ฟังนุ่มและลอย
    { notes: schedule(SKY_DAY_LEAD), voice: soft('sine', 0.075, 0.12, 0.84) },
    { notes: schedule(SKY_DAY_PAD_A), voice: soft('sine', 0.05, 0.5, 0.92) },
    { notes: schedule(SKY_DAY_PAD_B), voice: soft('sine', 0.042, 0.6, 0.92) },
    { notes: schedule(SKY_DAY_BASS), voice: soft('sine', 0.05, 0.25, 0.9) },
  ],
  skyNight: [
    { notes: schedule(SKY_NIGHT_LEAD), voice: soft('sine', 0.07, 0.18, 0.88) },
    { notes: schedule(SKY_NIGHT_PAD_A), voice: soft('sine', 0.048, 0.6, 0.94) },
    { notes: schedule(SKY_NIGHT_PAD_B), voice: soft('sine', 0.04, 0.7, 0.94) },
    { notes: schedule(SKY_NIGHT_BASS), voice: soft('sine', 0.045, 0.3, 0.92) },
  ],
};

// ช่องสำหรับตรวจเนื้อเพลงตอนพัฒนา ใช้เทียบว่าแต่ละเพลงต่างกันจริงไหม
// Vite ตัดทิ้งทั้งบรรทัดตอน build จริง ไม่หลุดไปอยู่ใน bundle
if (import.meta.env.DEV) window.__tracks = TRACKS;

let master = null;
let timer = null;
let loopStart = 0;      // เวลาของ AudioContext ที่ลูปรอบปัจจุบันเริ่ม
let track = 'main';
let booked = [];        // โน้ตที่จองไว้แล้ว เก็บไว้เพื่อยกเลิกตอนสลับเพลง

function voice(freq, at, beats, { type, vol, attack, release }) {
  const ac = audioCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const dur = beats * BEAT;

  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);

  // ขึ้นนุ่ม ลงนุ่ม — ตัดเสียง "ป๊อก" ตอนโน้ตเริ่มและจบ
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + attack);
  gain.gain.setValueAtTime(vol, at + dur * release);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);

  osc.connect(gain);
  gain.connect(master);
  osc.start(at);
  osc.stop(at + dur + 0.02);

  booked.push({ osc, at });
}

/**
 * จองโน้ตของลูปถัดไปล่วงหน้า
 * เรียกถี่กว่าความยาวลูปมาก เพื่อให้จองทันแม้เบราว์เซอร์หน่วง timer ไปบ้าง
 */
function pump() {
  const ac = audioCtx();
  const loopDur = LOOP_BEATS * BEAT;

  while (loopStart < ac.currentTime + loopDur) {
    for (const layer of TRACKS[track]) {
      for (const n of layer.notes) {
        voice(n.freq, loopStart + n.at * BEAT, n.beats, layer.voice);
      }
    }
    loopStart += loopDur;
  }

  // ทิ้งอ้างอิงของโน้ตที่เล่นจบไปแล้ว ไม่งั้น array โตไม่หยุด
  const now = ac.currentTime;
  booked = booked.filter((b) => b.at > now - 8);
}

/** เรียกซ้ำได้ ครั้งที่สองเป็นต้นไปไม่ทำอะไร */
export function startMusic() {
  if (timer) return;
  const ac = audioCtx();
  if (ac.state === 'suspended') return;   // ยังไม่ได้ปลดล็อกเสียง ค่อยมาใหม่

  master = ac.createGain();
  master.gain.value = isMuted() ? 0 : MUSIC_VOL;
  master.connect(ac.destination);

  loopStart = ac.currentTime + 0.15;
  pump();
  timer = setInterval(pump, 2000);
}

/**
 * สลับเพลงให้ทันใจ
 * ยกเลิกเฉพาะโน้ตที่ "ยังไม่เริ่มเล่น" ส่วนตัวที่กำลังดังอยู่ปล่อยให้จบเอง
 * ถ้าตัดตัวที่กำลังดังด้วยจะได้เสียง "ป๊อก" ตรงรอยต่อทุกครั้ง
 */
export function setMusicTrack(name) {
  if (!TRACKS[name] || name === track) return;
  track = name;
  if (!master) return;

  const ac = audioCtx();
  const now = ac.currentTime;
  booked = booked.filter((b) => {
    if (b.at > now + 0.03) {
      try { b.osc.stop(now); } catch { /* หยุดไปแล้ว */ }
      return false;
    }
    return true;
  });

  loopStart = now + 0.05;
  pump();
}

/** ปิดเสียงเพลงทันที ไม่ใช่แค่หยุดจองโน้ตใหม่ */
export function setMusicMuted(m) {
  if (!master) return;
  const ac = audioCtx();
  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.setTargetAtTime(m ? 0 : MUSIC_VOL, ac.currentTime, 0.05);
}
