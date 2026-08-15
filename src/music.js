// src/music.js
// ─────────────────────────────────────────────────────────────
// เพลงประกอบ สังเคราะห์เองทั้งหมดเหมือนเสียงเอฟเฟกต์ ไม่มีไฟล์เพลง
//
// เมโลดี้อยู่ในสเกลเพนทาโทนิก C (C D E G A) — ไม่มีคู่เสียงที่กัดกันเอง
// วนซ้ำนาน ๆ จึงไม่เลี่ยนหู ซึ่งสำคัญมากกับเกมที่เล่นรอบละหลายนาที
// คอร์ดเดินเป็น I–vi–IV–V ซึ่งเป็นทางเดินคอร์ดที่ฟังหวานที่สุดชุดหนึ่ง
//
// เรื่องจังหวะ: ห้ามใช้ setInterval ยิงโน้ตทีละตัว เพราะ timer ของเบราว์เซอร์
// คลาดเป็นสิบมิลลิวินาทีและหยุดเดินตอนสลับแท็บ จังหวะจะเพี้ยนทันที
// ต้องจองโน้ตล่วงหน้าไว้กับนาฬิกาของ AudioContext ซึ่งเดินด้วย sample clock
// ─────────────────────────────────────────────────────────────
import { audioCtx, isMuted } from './audio.js';

const BPM = 128;
const BEAT = 60 / BPM;

// ความดังรวมของเพลง ต่ำกว่าเสียงเอฟเฟกต์มาก เพราะเพลงต้องเป็นพื้นหลัง
// ไม่ใช่ตัวเอก ถ้าดังกว่านี้เสียงแมวร้องกับเสียงเก็บของจะจมหายไป
// วัดจริงที่ 0.5 แล้วได้ peak 0.080 เทียบกับเสียงกระโดด 0.123 ซึ่งห่างแค่ 1.5 เท่า
// เพลงดังต่อเนื่องตลอดเวลา ต่างจากเอฟเฟกต์ที่ดังแวบเดียว ความรู้สึกจึงเด่นกว่าตัวเลข
// 0.4 ทำให้ห่างราว 2 เท่า = ได้ยินเพลงชัดแต่ไม่กลบเสียงแมว
const MUSIC_VOL = 0.4;

const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880.0, C6 = 1046.5;
const F2 = 87.31, G2 = 98.0, A2 = 110.0, C3 = 130.81;

/** [ความถี่ (null = พัก), ความยาวเป็นบีต] รวม 32 บีต = 8 ห้อง */
const LEAD = [
  [E5, 1], [G5, 1], [A5, 1], [G5, 1],
  [E5, 1], [D5, 1], [C5, 2],
  [E5, 1], [G5, 1], [C6, 1], [A5, 1],
  [G5, 2], [E5, 2],

  [G5, 1], [A5, 1], [C6, 1], [A5, 1],
  [G5, 1], [E5, 1], [D5, 2],
  [C6, 1], [A5, 1], [G5, 1], [E5, 1],
  [D5, 1], [C5, 3],
];

/** เบสห้องละตัว เดินเป็น C – Am – F – G สองรอบ */
const BASS = [
  [C3, 4], [A2, 4], [F2, 4], [G2, 4],
  [C3, 4], [A2, 4], [F2, 4], [G2, 4],
];

const LOOP_BEATS = 32;

/** แปลง [ความถี่, ความยาว] เป็นรายการโน้ตที่รู้ว่าเริ่มบีตที่เท่าไหร่ */
function schedule(seq) {
  let at = 0;
  return seq.map(([freq, beats]) => {
    const note = { at, beats, freq };
    at += beats;
    return note;
  }).filter((n) => n.freq);
}

const LEAD_NOTES = schedule(LEAD);
const BASS_NOTES = schedule(BASS);

let master = null;
let timer = null;
let loopStart = 0;   // เวลาของ AudioContext ที่ลูปรอบปัจจุบันเริ่ม

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
}

/**
 * จองโน้ตของลูปถัดไปล่วงหน้า
 * เรียกถี่กว่าความยาวลูปมาก เพื่อให้จองทันแม้เบราว์เซอร์หน่วง timer ไปบ้าง
 */
function pump() {
  const ac = audioCtx();
  const loopDur = LOOP_BEATS * BEAT;

  // จองไว้ล่วงหน้าหนึ่งลูปเสมอ
  while (loopStart < ac.currentTime + loopDur) {
    for (const n of LEAD_NOTES) {
      voice(n.freq, loopStart + n.at * BEAT, n.beats, {
        type: 'triangle', vol: 0.085, attack: 0.02, release: 0.72,
      });
    }
    for (const n of BASS_NOTES) {
      voice(n.freq, loopStart + n.at * BEAT, n.beats, {
        type: 'sine', vol: 0.075, attack: 0.04, release: 0.8,
      });
    }
    loopStart += loopDur;
  }
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

/** ปิดเสียงเพลงทันที ไม่ใช่แค่หยุดจองโน้ตใหม่ */
export function setMusicMuted(m) {
  if (!master) return;
  const ac = audioCtx();
  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.setTargetAtTime(m ? 0 : MUSIC_VOL, ac.currentTime, 0.05);
}
