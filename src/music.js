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
import { audioCtx, musicOut, audioLive, whenAudioAwake } from './audio.js';
import { loadPref, savePref } from './storage.js';

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
// ช่วงล่างสำหรับเบสที่ "เดิน" ไม่ใช่แค่ยืนราก และตัวบนสุดสำหรับเสียงใส ๆ ของทุ่งหิมะ
const D3 = 146.83, E3 = 164.81, F3 = 174.61, G3 = 196.0;
const C7 = 2093.0;

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
  const out = seq.map(([freq, beats, vel = 1]) => {
    const note = { at, beats, freq, vel };   // freq เป็นอาร์เรย์ได้ = คอร์ด · vel = น้ำหนักโน้ต (เน้น/เบา)
    at += beats;
    return note;
  }).filter((n) => n.freq);   // [null, n] = ตัวหยุด ใช้เว้นจังหวะ
  out.beats = at;   // ความยาวรวมรวมตัวหยุด — ตรวจกับ LOOP_BEATS ตอน dev (ท้ายไฟล์)
  return out;
}


// ─────────────────────────────────────────────────────────────
// เพลงประจำแมพ — ฉากละเพลง สลับตอนไล่สีเปลี่ยนฉาก
//
// ทุกเพลงยังอยู่ในเพนทาโทนิก C ชุดเดียวกับเพลงอื่นทั้งเกม (กฎที่หัวไฟล์)
// สลับกลางคันตอนไหนก็ไม่หลุดคีย์ ซึ่งจำเป็นมากเพราะการเปลี่ยนฉากเกิดขึ้น
// กลางลูปเสมอ ไม่เคยตรงหัวเพลงพอดี
//
// รอบแรกแยกแต่ละแมพด้วยช่วงเสียง / ความถี่โน้ต / รูปคลื่น เท่านั้น แล้วมันฟังคล้ายกันไปหมด
// สาเหตุคือทั้งหกเพลงยังเป็นโครงเดียวกันเป๊ะ — "เมโลดี้เดินหน้าเรื่อย ๆ + เบสยืนรากคอร์ดละสี่บีต"
// ต่างกันแค่รายละเอียดที่หูจับไม่ทันตอนกำลังวิ่งหลบสิ่งกีดขวางอยู่
//
// รอบนี้จึงเปลี่ยนสองอย่างที่หูจับได้ไวกว่ามาก คือ "จังหวะ" กับ "ชั้นเสียง"
// ให้ทุกแมพมีลายเซ็นที่แมพอื่นไม่มีเลยสักแมพ:
//   🌙 กลางคืน  เบสเดินทีละบีตไม่หยุด + เมโลดี้แทงนอกจังหวะ (แทบไม่มีตัวไหนตกบีต)
//   🌻 สวน      จังหวะสามช่า อุ๊ม-ปะ-ปะ — แมพเดียวในเกมที่ไม่ใช่สี่จังหวะ
//   🔮 ถ้ำ      มีชั้นเสียงสะท้อน ทวนโมทีฟช้ากว่าหนึ่งบีตแล้วสูงขึ้นหนึ่งอ็อกเทฟ
//   🏖️ ชายหาด   คอร์ดสับนอกจังหวะทุกตัว + เบสเว้นจังหวะแบบเพลงดับ
//   🚀 อวกาศ    อาร์เพจจิโอเขบ็ตวิ่งไม่หยุดอยู่ใต้เมโลดี้ยาว ๆ
//   ❄️ หิมะ     กล่องดนตรี ไม่มีชั้นไหนตีจังหวะเลย เหลือแต่เสียงใสกับพื้นเสียงนุ่ม ๆ
//
// ข้อบังคับ: ทุกชั้นของทุกเพลงต้องรวมได้ 32 บีตพอดี (LOOP_BEATS) เพราะ pump()
// จองทุกชั้นพร้อมกันที่หัวลูปเสมอ ชั้นที่สั้นกว่าจะทิ้งความเงียบไว้ท้ายลูป
// ส่วนชั้นที่ยาวกว่าจะเลยไปทับลูปถัดไปจนจังหวะเพี้ยนสะสมไปเรื่อย ๆ
// ─────────────────────────────────────────────────────────────

// 🌙 ครัวกลางคืน — ย่องเข้าครัวตอนดึก
// เบสเดินทีละบีตไม่หยุดเลยทั้งเพลง = ฝีเท้าที่ไม่กล้าหยุดยืน
// ส่วนเมโลดี้เริ่มที่ "และ" ของบีตเกือบทุกวลี ฟังแล้วเหมือนชะโงกดูแล้วรีบหุบ
const NIGHT_LEAD = [
  [null, .5], [E5, .5], [G5, .5], [null, .5], [E5, 1], [null, 1],
  [null, .5], [D5, .5], [C5, .5], [null, .5], [D5, .5], [null, 1.5],
  [null, .5], [G5, .5], [A5, .5], [null, .5], [G5, 1], [E5, 1],
  [D5, .5], [null, .5], [C5, 1], [null, 2],

  [null, .5], [G5, .5], [A5, .5], [C6, .5], [null, .5], [A5, .5], [G5, 1],
  [null, .5], [E5, .5], [G5, .5], [null, .5], [E5, .5], [D5, .5], [C5, 1],
  [null, .5], [A5, .5], [null, .5], [G5, .5], [E5, 1], [D5, 1],
  [C5, .5], [null, .5], [D5, .5], [E5, .5], [null, 2],
];
// เบสเดิน: ไม่ยืนรากค้าง แต่ไต่ผ่านโน้ตในคอร์ดไปเรื่อย ๆ ทีละบีต
const NIGHT_BASS = [
  C3, E3, G3, E3,   A2, C3, E3, C3,
  F2, A2, C3, A2,   G2, D3, G3, D3,
  C3, E3, G3, A3,   A2, C3, E3, G3,
  F2, A2, C3, D3,   G2, A2, C3, D3,
].map((r) => [r, 1]);
// ช้อนกระทบแก้วเบา ๆ บีตสุดท้ายของทุกแปดบีต — กลิ่นห้องครัวที่เมโลดี้ให้ไม่ได้
const NIGHT_CLINK = [
  [null, 7], [C6, 1], [null, 7], [E6, 1],
  [null, 7], [G6, 1], [null, 7], [E6, 1],
];

// 🌻 สวนดอกไม้ — จังหวะสามช่า
// วางเป็นวลีละสามบีต 10 วลี แล้วปิดท้ายด้วยตัวยาวสองบีตให้ครบ 32 พอดี (30 + 2)
// วิธีนี้ได้กลิ่นวอลซ์จริง ๆ ทั้งที่ลูปยังยาว 32 บีตเท่าเพลงอื่นทุกเพลง
const GARDEN_LEAD = [
  [G5, 1], [A5, .5], [C6, 1.5],
  [A5, 1], [G5, .5], [E5, 1.5],
  [E5, 1], [G5, .5], [A5, 1.5],
  [C6, 1], [A5, .5], [G5, 1.5],
  [D6, 1], [C6, .5], [A5, 1.5],

  [C6, 1], [G5, .5], [E5, 1.5],
  [G5, 1], [A5, .5], [C6, 1.5],
  [E6, 1], [D6, .5], [C6, 1.5],
  [A5, 1], [G5, .5], [E5, 1.5],
  [D5, 1], [E5, .5], [G5, 1.5],
  [C6, 2],
];
// อุ๊ม-ปะ-ปะ: รากต่ำหนึ่งตัว แล้วโน้ตในคอร์ดที่สูงกว่าอีกสองตัว วนทุกสามบีต
// ชั้นนี้เป็นทั้งเบสและคอร์ดในตัว แมพนี้จึงมีแค่สองชั้นแต่ไม่ฟังโหวง
const GARDEN_OOMPAH = [
  [C3, 1], [G3, 1], [C4, 1],
  [C3, 1], [G3, 1], [E4, 1],
  [A2, 1], [A3, 1], [C4, 1],
  [F2, 1], [C4, 1], [A3, 1],
  [G2, 1], [D4, 1], [G3, 1],

  [C3, 1], [G3, 1], [C4, 1],
  [A2, 1], [A3, 1], [E4, 1],
  [F2, 1], [C4, 1], [F4, 1],
  [G2, 1], [D4, 1], [G4, 1],
  [C3, 1], [G3, 1], [C4, 1],
  [G2, 2],
];

// 🔮 ถ้ำคริสตัล — เสียงสะท้อนของจริง ไม่ใช่แค่ปล่อยหางยาว
// โมทีฟสั้นสามตัวแล้วเงียบยาว ที่ว่างตรงนั้นมีไว้ให้เสียงสะท้อนได้ยินชัดเป็นตัว ๆ
const CAVERN_LEAD = [
  [C5, 1], [E5, 1], [G5, 1], [null, 5],
  [A5, 1], [G5, 1], [E5, 1], [null, 5],
  [G5, 1], [E5, 1], [D5, 1], [null, 5],
  [C5, 2], [null, 6],
];
// ชั้นสะท้อน: โน้ตชุดเดียวกันเป๊ะ แต่ช้ากว่าหนึ่งบีตและสูงขึ้นหนึ่งอ็อกเทฟ
// ต้องเบากว่าชั้นหลักหลายเท่า ไม่งั้นหูจะได้ยินเป็นสองเสียงคู่กัน ไม่ใช่เสียงก้อง
const CAVERN_ECHO = [
  [null, 1], [C6, 1], [E6, 1], [G6, 1], [null, 4],
  [null, 1], [A6, 1], [G6, 1], [E6, 1], [null, 4],
  [null, 1], [G6, 1], [E6, 1], [D6, 1], [null, 4],
  [null, 1], [C6, 2], [null, 5],
];
// รากค้างทีละแปดบีต นานกว่าทุกแมพ = พื้นเสียงที่แทบไม่ขยับเลย
const CAVERN_BASS = [[C3, 8], [A2, 8], [F2, 8], [G2, 8]];

// 🏖️ ชายหาด — คอร์ดสับนอกจังหวะ
// หัวใจอยู่ที่ชั้น SKANK ล้วน ๆ ทุกตัวตกที่ "และ" ของบีต ไม่มีสักตัวที่ตรงบีต
// พอเบสลงตรงบีตแทน สองชั้นนี้เลยสลับกันคนละครึ่งบีตตลอดเพลง = จังหวะโยก
const BEACH_LEAD = [
  [null, 1], [G5, 2], [E5, 1],
  [D5, 3], [null, 1],
  [E5, 1], [G5, 1], [A5, 2],
  [G5, 4],

  [null, 1], [C6, 2], [A5, 1],
  [G5, 3], [null, 1],
  [E5, 1], [D5, 1], [E5, 2],
  [C5, 4],
];
// เงียบครึ่งบีต ดีดครึ่งบีต สลับกันไปทั้งเพลง สองตัวต่อคอร์ดเพื่อให้ได้ยินเป็นคอร์ด
const BEACH_SKANK = [
  [E5, G5], [E5, C6], [A5, C6], [A5, C6],
  [A5, C6], [A5, E6], [G5, D6], [G5, D6],
].flatMap(([a, b]) => [
  [null, .5], [a, .5], [null, .5], [b, .5],
  [null, .5], [a, .5], [null, .5], [b, .5],
]);
// เบสแบบเพลงดับ: รากสองครั้งติดแล้วทิ้งช่วง ปิดท้ายด้วยคู่ห้าก่อนขึ้นห้องใหม่
const BEACH_BASS = [
  [C3, G2], [C3, G2], [A2, E3], [A2, E3],
  [F2, C3], [F2, C3], [G2, D3], [G2, D3],
].flatMap(([r, f]) => [[r, 1], [null, .5], [r, .5], [null, .5], [f, 1], [null, .5]]);

// 🚀 ห้วงอวกาศ — อาร์เพจจิโอวิ่งไม่หยุด
// เขบ็ตวิ่งรัวอยู่ข้างล่างตลอด 32 บีตโดยไม่มีช่องว่างเลยสักตัว ฟังเป็นเครื่องจักรที่เดินอยู่
// ส่วนเมโลดี้ข้างบนยาวและห่างจนตัดกันชัด = มีของเคลื่อนที่อยู่ แต่ตัวเราลอยนิ่ง
const SPACE_ARP = [
  [C4, E4, G4, C5, E5, C5, G4, E4],
  [A3, C4, E4, A4, C5, A4, E4, C4],
  [F3, A3, C4, F4, A4, F4, C4, A3],
  [G3, D4, G4, A4, D5, A4, G4, D4],
  [C4, E4, G4, C5, E5, C5, G4, E4],
  [A3, C4, E4, A4, C5, A4, E4, C4],
  [F3, A3, C4, F4, A4, F4, C4, A3],
  [G3, D4, G4, A4, D5, A4, G4, D4],
].flatMap((bar) => bar.map((f) => [f, .5]));
const SPACE_LEAD = [
  [C6, 2], [null, 2], [G6, 2], [null, 2],
  [E6, 3], [null, 1], [A6, 2], [null, 2],
  [D6, 2], [null, 2], [G6, 2], [null, 2],
  [E6, 4], [null, 4],
];
const SPACE_PAD_A = [[C4, 8], [A3, 8], [F4, 8], [G4, 8]];
const SPACE_PAD_B = [[G4, 8], [E4, 8], [C5, 8], [D5, 8]];
const SPACE_BASS = [[C3, 8], [A2, 8], [F2, 8], [G2, 8]];

// ❄️ ทุ่งหิมะ — กล่องดนตรี
// แมพเดียวที่ไม่มีชั้นไหนตีจังหวะเลย เบสเป็นพื้นเสียงนุ่มที่ขยับทุกแปดบีตเท่านั้น
// วลีเดินลงเกือบทุกวลี ให้ความรู้สึกของอะไรที่ค่อย ๆ ร่วงลงมา
const SNOW_LEAD = [
  [E6, 1], [D6, 1], [C6, 2],
  [A5, 1], [G5, 1], [E5, 2],
  [G5, 1], [A5, 1], [C6, 2],
  [A5, 4],

  [C6, 1], [A5, 1], [G5, 2],
  [E6, 1], [D6, 1], [C6, 2],
  [D6, 1], [C6, 1], [A5, 2],
  [G5, 4],
];
// เสียงใสตัวเล็ก ๆ โผล่ไม่ตรงจังหวะและไม่ซ้ำที่เดิม เหมือนเกล็ดที่บังเอิญกระทบกัน
const SNOW_TWINKLE = [
  [null, 1.5], [G6, .5], [null, 2], [C7, .5], [null, 3.5],
  [null, 2.5], [A6, .5], [null, 1], [E6, .5], [null, 3.5],
  [null, 1], [C7, .5], [null, 2.5], [G6, .5], [null, 3.5],
  [null, 3], [E6, .5], [null, 1], [C7, .5], [null, 3],
];
// เว้นสองบีตท้ายรากทุกตัว ไม่ให้พื้นเสียงต่อกันเป็นพืด จะได้ยังรู้สึกโล่ง
const SNOW_BASS = [C3, A2, F2, G2].flatMap((r) => [[r, 6], [null, 2]]);

// ─────────────────────────────────────────────────────────────
// เพลงสกิล — สกิลละเพลง ไม่ซ้ำกัน (เต้นใช้ DANCE ด้านบน)
//
// ยาว 32 บีตเท่าทุกเพลงและอยู่ในเพนทาโทนิก C เหมือนกัน (เบส/แพดใช้ F ได้แบบเพลงอื่น)
// สกิลติดกลางเพลงแมพเสมอ สลับตอนไหนก็ไม่หลุดคีย์
// แต่ละเพลงต่างกันที่ "จังหวะ" เป็นหลัก ไม่ใช่แค่ทำนอง — ฟังสองวินาทีก็รู้ว่าสกิลไหนติด
// ─────────────────────────────────────────────────────────────

// 🦸 ฮีโร่ — แตรปลุกใจ: โน้ตซ้ำสองตัวแล้วกระโดดขึ้นคู่สี่ (ท่าเปิดของเพลงฮีโร่ทั่วโลก)
// เบสเขบ็ตสลับคู่แปดไม่หยุด = เครื่องยนต์ที่กำลังพุ่ง
const HERO_LEAD = [
  [G5, .5], [G5, .5], [C6, 1.5], [G5, .5], [C6, 1],
  [E6, 2], [D6, 1], [C6, 1],
  [A5, .5], [A5, .5], [D6, 1.5], [A5, .5], [D6, 1],
  [G6, 3], [null, 1],
  [E6, .5], [E6, .5], [D6, .5], [C6, .5], [D6, 1], [E6, 1],
  [G6, 1.5], [E6, .5], [D6, 2],
  [C6, .5], [D6, .5], [E6, .5], [G6, .5], [A6, 1], [G6, 1],
  [C6, 3], [null, 1],
];
const HERO_BASS = [[C3, C4], [C3, C4], [F2, F3], [G2, G3], [C3, C4], [A2, A3], [F2, F3], [C3, C4]]
  .flatMap(([lo, hi]) => [[lo, .5], [hi, .5], [lo, .5], [hi, .5], [lo, .5], [hi, .5], [lo, .5], [hi, .5]]);
// แพดค้างข้างหลังเหมือนเครื่องเป่าทองเหลืองทั้งวง ให้แตรนำไม่โดดเดี่ยว
const HERO_PAD = [[E4, 8], [F4, 4], [G4, 4], [E4, 4], [A4, 4], [F4, 4], [E4, 4]];

// 🦋 บิน — พิณลอยฟ้า: อาร์เพจจิโอสามพยางค์ (1/3 บีต) ไหลขึ้นลงไม่หยุด
// ทุกเพลงอื่นแบ่งบีตเป็นสองหรือสี่ เพลงนี้เพลงเดียวแบ่งสาม ฟังเป็นคลื่นลม ไม่ใช่จังหวะเดิน
const FLY_HARP = [
  [C5, E5, G5, C6], [A4, C5, E5, A5], [F4, A4, C5, A5], [G4, D5, G5, A5],
  [C5, E5, G5, C6], [A4, C5, E5, A5], [F4, A4, C5, A5], [G4, D5, G5, A5],
].flatMap(([a, b, c, d]) => [a, b, c, d, c, b, a, b, c, d, c, b].map((f) => [f, 1 / 3]));
const FLY_LEAD = [
  [E6, 3], [D6, 1], [C6, 4],
  [A5, 3], [C6, 1], [D6, 4],
  [E6, 2], [G6, 2], [A6, 2], [G6, 2],
  [E6, 6], [null, 2],
];
const FLY_BASS = [[C3, 8], [A2, 8], [F2, 8], [G2, 8]];

// ✨ ทอง — ดิสโก้: ทำนองขึ้นต้นด้วยตัวหยุดครึ่งบีตเกือบทุกห้อง (ฟังก์)
// เบสเด้งคู่แปดแบบดิสโก้ และเสียงกริ๊งเหรียญตัวเดียวท้ายทุกห้อง
const GOLD_LEAD = [
  [null, .5], [C6, .5], [null, .5], [A5, .5], [C6, .5], [D6, 1], [C6, .5],
  [null, .5], [E6, .5], [D6, .5], [C6, .5], [A5, 1], [G5, 1],
  [null, .5], [A5, .5], [null, .5], [C6, .5], [A5, .5], [G5, 1], [E5, .5],
  [G5, .5], [A5, .5], [C6, 1], [null, 2],
  [null, .5], [E6, .5], [null, .5], [D6, .5], [E6, .5], [G6, 1], [E6, .5],
  [null, .5], [A6, .5], [G6, .5], [E6, .5], [D6, 1], [C6, 1],
  [null, .5], [D6, .5], [E6, .5], [D6, .5], [C6, .5], [A5, .5], [G5, 1],
  [C6, 2], [null, 2],
];
const GOLD_BASS = [[C3, C4], [A2, A3], [F2, F3], [G2, G3], [C3, C4], [A2, A3], [F2, F3], [G2, G3]]
  .flatMap(([r, hi]) => [[r, .75], [r, .25], [hi, .5], [r, .5], [null, .5], [r, .5], [hi, 1]]);
const GOLD_COIN = Array.from({ length: 8 }, () => [[null, 3.5], [C7, .5]]).flat();

// 💎 คริสตัล — ระฆังแก้วในถ้ำ: โน้ตดีดสั้นหางยาว แล้วมีเสียงสะท้อนตามมาครึ่งบีตหลัง
// เบสเคาะทุกบีตช้า ๆ แบบหัวใจเต้น — เพลงเดียวที่โทนหม่นลง (ขึ้นต้นด้วย A)
const CRYSTAL_LEAD = [
  [A5, 1], [E6, 1], [D6, 1], [A5, 1],
  [C6, 1], [G5, 1], [E5, 2],
  [A5, 1], [C6, 1], [E6, 1], [G6, 1],
  [E6, 4],
  [D6, 1], [C6, 1], [A5, 1], [G5, 1],
  [A5, 1], [C6, 1], [D6, 2],
  [E6, 1], [D6, 1], [C6, 1], [A5, 1],
  [A5, 4],
];
// สะท้อน = ทำนองเดิมเลื่อนช้าไปครึ่งบีต ตัดตัวท้ายให้ยาวรวมยังเป็น 32 พอดี
const CRYSTAL_ECHO = [[null, .5], ...CRYSTAL_LEAD.slice(0, -1), [A5, 3.5]];
const CRYSTAL_BASS = [A2, C3, A2, C3, G2, F2, G2, A2].flatMap((r) => Array(4).fill([r, 1]));

// ☃️ บอลหิมะ — เลื่อนหิมะวิ่งเร็ว: ทำนองสั้นขาดเป็นตัว ๆ กระดิ่งกรุ๊งกริ๊งทุกบีต
// เบสแบบ "ตุ้ม-ปะ" สลับรากกับคู่ห้า ฟังเป็นล้อที่กลิ้งเป็นจังหวะ
const SNOWBALL_LEAD = [
  [G5, .5], [E5, .5], [G5, .5], [A5, .5], [G5, 1], [E5, 1],
  [D5, .5], [E5, .5], [G5, .5], [E5, .5], [D5, 1], [C5, 1],
  [A5, .5], [G5, .5], [A5, .5], [C6, .5], [D6, 1], [C6, 1],
  [A5, .5], [G5, .5], [E5, 1], [G5, 2],
  [C6, .5], [D6, .5], [E6, .5], [D6, .5], [C6, 1], [A5, 1],
  [G5, .5], [A5, .5], [C6, .5], [A5, .5], [G5, 1], [E5, 1],
  [D5, .5], [E5, .5], [G5, .5], [A5, .5], [G5, .5], [E5, .5], [D5, 1],
  [C5, 2], [null, 2],
];
const SNOWBALL_BELLS = Array.from({ length: 32 }, () => [[E6, .25], [G6, .25], [null, .5]]).flat();
const SNOWBALL_BASS = [[C3, G3], [A2, E3], [F2, C3], [G2, D3], [C3, G3], [A2, E3], [F2, C3], [G2, D3]]
  .flatMap(([r, f]) => [[r, 1], [f, 1], [r, 1], [f, 1]]);

// ─────────────────────────────────────────────────────────────
// 🌳 ด่านสอน "ป่าผลึก" + บอสภูตตอไม้ (ผู้ใช้ 22 พ.ย. 2026 · ต้นแบบใน gameplay-lab.html)
// รอบสอง (ผู้ใช้: "เพิ่มชนิดดนตรีอื่น ๆ ให้เป็นเพลงมากกว่านี้"): เล่นด้วยเครื่องดนตรีสังเคราะห์ (INST ท้ายหัวข้อ)
// แทนคลื่นเปล่า · ยาว 64 บีต (ท่อน A + ท่อน B) · จังหวะของตัวเอง (grove 116 · stump 140 · stumpRage 152 BPM)
//
// สามเพลงเป็นครอบครัวเดียวกัน:
//   โมทีฟผลึก "ลา-โด-มี-เร" (A C E D) ขึ้นต้นท่อน A ทุกเพลง · เสียงไม้ (ไม้เคาะ / กลองไทโกะ) · กระดิ่งคริสตัล
//   ทำนองอยู่ในเพนทาโทนิก C ตามกฎหัวไฟล์ ศูนย์กลางที่ "ลา" · คอร์ด Am F C G (F อยู่ในแพด/เบส/พิณได้แบบเพลงอื่น)
//
//   🌳 grove      ขลุ่ยนำ · คาลิมบาดีดวน (ท่อน A) → พิณกวาด (ท่อน B) · เครื่องสายแพดนุ่ม · เบสกลม
//                กระเดื่องนุ่ม ไม้เคาะ เชคเกอร์ · กล็อกเคนสปีลระยิบ
//   🪵 stump      แตรทองเหลืองนำ · เครื่องสายรัวเขบ็ต · เบสดีด · คณะประสานเสียง "อา~"
//                ชุดกลอง (กระเดื่อง สแนร์ ไฮแฮต ฉาบ) + กลองไทโกะ (ไม้) · ระฆังผลึก
//   🔥 stumpRage  วัตถุดิบเดียวกันแต่เร็วขึ้น · เครื่องสาย/ไฮแฮตเขบ็ตสองชั้น · ไทโกะทุกห้อง · ประสานเสียงทั้งเพลง
//                + ระฆังผลึกสะท้อนทำนองแตรอ็อกเทฟบนไล่หลังครึ่งบีต
// ─────────────────────────────────────────────────────────────
const E2 = 82.41, E7 = 2637.02, X = 1;   // X = กลองที่ไม่มีระดับเสียง (ค่าอะไรก็ได้ที่ไม่ใช่ null)

// คอร์ดที่ใช้ในสามเพลง — แต่ละเครื่องหยิบรูปที่ตัวเองเล่น (ไม่มี B · F อยู่แค่ในแพด/เบส/พิณต่ำ)
const CH = {
  Am: { pad: [A3, C4, E4], arp: [A4, E5, C5, E5, A5, E5, C5, E5], harp: [A3, E4, A4, C5, E5, C5, A4, E4], bass: [A2, E3, A3], hi: [A4, A4, E5, A4, A5, E5, A4, E5], choir: [A4, E5] },
  F: { pad: [F3, A3, C4], arp: [A4, C5, G5, C5, A5, C5, G5, C5], harp: [F3, C4, A4, C5, A5, C5, A4, C4], bass: [F2, C3, F3], hi: [A4, A4, C5, A4, A5, C5, A4, C5], choir: [A4, C5] },
  C: { pad: [G3, C4, E4], arp: [G4, C5, E5, C5, G5, E5, C5, E5], harp: [C4, G4, C5, E5, G5, E5, C5, G4], bass: [C3, G3, C4], hi: [C5, C5, G5, C5, E5, G5, C5, G5], choir: [G4, E5] },
  G: { pad: [G3, D4, A4], arp: [G4, D5, G5, D5, A5, D5, G5, D5], harp: [G3, D4, A4, D5, G5, D5, A4, D4], bass: [G2, D3, G3], hi: [G4, G4, D5, G4, G5, D5, G4, D5], choir: [G4, D5] },
};
/** ทุกห้อง 4 บีต: fn(คอร์ด, ห้องที่) → [[ความถี่, บีต, น้ำหนัก], ...] */
const perBar = (chords, fn) => chords.flatMap((c, i) => fn(CH[c], i));
const eighths = (fs, vel = [1, .7, .85, .7]) => fs.map((f, i) => [f, .5, vel[i % vel.length]]);
const rest = (b) => [[null, b]];

// ── 🌳 grove (116 BPM) ──
const GROVE_A = ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'G'];
const GROVE_B = ['F', 'G', 'Am', 'C', 'F', 'G', 'Am', 'G'];
const GROVE_CH = [...GROVE_A, ...GROVE_B];
// ขลุ่ย · ท่อน A: โมทีฟผลึก เดินจังหวะกระโดด (จุด-เขบ็ต) · ท่อน B: ขึ้นสูง ลากยาว ร้องเป็นเพลง
const GROVE_FLUTE = [
  [A5, .75], [C6, .25], [E6, 1], [D6, .5], [C6, .5], [A5, 1],
  [C6, .75], [D6, .25], [C6, .5], [A5, .5], [G5, 2],
  [E5, .75], [G5, .25], [C6, 1], [D6, .5], [E6, .5], [G6, 1],
  [E6, .75], [D6, .25], [D6, 2], [null, 1],
  [A5, .75], [C6, .25], [E6, 1], [G6, .5], [E6, .5], [D6, 1],
  [C6, .75], [A5, .25], [C6, .5], [D6, .5], [E6, 2],
  [D6, .75], [E6, .25], [D6, .5], [C6, .5], [A5, .5], [G5, .5], [A5, 1],
  [null, 1], [E5, .5], [G5, .5], [A5, 2],

  [C6, 1.5], [A5, .5], [C6, 1], [D6, 1],
  [E6, 1.5], [D6, .5], [D6, 2],
  [C6, 1], [E6, 1], [A6, 1.5], [G6, .5],
  [E6, 3], [null, 1],
  [C6, 1.5], [D6, .5], [E6, 1], [G6, 1],
  [A6, 1.5], [G6, .5], [E6, 1], [D6, 1],
  [E6, 1], [C6, 1], [A5, 1], [C6, .5], [D6, .5],
  [D6, 2], [null, 1], [E5, .5], [G5, .5],
];
// คาลิมบาดีดวนเขบ็ต (ท่อน A) → พิณกวาดส่ง แล้วพิณเล่นคอร์ดแตก (ท่อน B) — สองท่อนเนื้อเสียงต่างกันชัด
const GROVE_KALIMBA = [...perBar(GROVE_A, (c) => eighths(c.arp)), ...rest(32)];
const GROVE_HARP = [
  ...rest(28), ...[A4, C5, D5, E5, G5, A5, C6, D6].map((f) => [f, .25, .8]), [E6, 2],
  ...perBar(GROVE_B, (c) => eighths(c.harp, [1, .6, .75, .6, .9, .6, .75, .6])),
];
const GROVE_PAD = GROVE_CH.map((c, i) => [CH[c].pad, 4, i < 8 ? .7 : 1]);
const GROVE_BASS = perBar(GROVE_CH, (c, i) => (i < 8
  ? [[c.bass[0], 2], [c.bass[1], 1], [c.bass[0], 1]]
  : [[c.bass[0], 1.5], [c.bass[0], .5, .7], [c.bass[1], 1.5], [c.bass[2], .5, .7]]));
const GROVE_KICK = perBar(GROVE_CH, (c, i) => (i < 8 ? [[X, 2], [X, 2, .8]] : [[X, 1.5], [X, .5, .6], [X, 2, .85]]));
const GROVE_WOOD = perBar(GROVE_CH, (c, i) => (i % 4 === 3
  ? [[null, 1], [G5, 1], [null, 1], [G5, .5], [E5, .5, .8]]
  : [[null, 1], [G5, 1], [null, 1], [E5, 1]]));
const GROVE_SHAKER = perBar(GROVE_CH, (c, i) => eighths(Array(8).fill(X), i < 8 ? [.35, .7] : [.55, 1]));
const GROVE_GLOCK = [
  [null, 3.5], [A6, .5], [null, 3.5], [E6, .5], [null, 3.5], [G6, .5], [null, 1.5], [A6, .5], [C7, .5], [null, 1.5],
  [null, 3.5], [C7, .5], [null, 3.5], [A6, .5], [null, 3.5], [G6, .5], [null, 2], [E6, .5], [G6, .5], [A6, 1],
  [null, 2], [E6, .5], [G6, .5], [A6, 1], [null, 3.5], [C7, .5], [null, 2], [A6, .5], [C7, .5], [E7, 1], [null, 4],
  [null, 2], [G6, .5], [A6, .5], [C7, 1], [null, 3.5], [A6, .5], [null, 2], [E6, .5], [G6, .5], [A6, 1], [null, 4],
];

// ── 🪵 stump (140 BPM) ──
const STUMP_A = ['Am', 'Am', 'F', 'G', 'Am', 'C', 'G', 'G'];
const STUMP_B = ['F', 'G', 'Am', 'Am', 'F', 'G', 'C', 'G'];
const STUMP_CH = [...STUMP_A, ...STUMP_B];
// แตรนำ · ท่อน A: โมทีฟผลึกแบบเร่ง (ลา ลา โด มี — เร โด) ถาม-ตอบ · ท่อน B: โน้ตยาวฮึกเหิม ไต่ขึ้นถึงลาสูง
const STUMP_BRASS = [
  [A5, .5], [A5, .5], [C6, .5], [E6, 1], [D6, .5], [C6, 1],
  [A5, .5], [G5, .5], [A5, 1], [null, 2],
  [C6, .5], [C6, .5], [D6, .5], [E6, 1], [G6, .5], [E6, 1],
  [D6, 1.5], [C6, .5], [D6, 2],
  [A5, .5], [A5, .5], [C6, .5], [E6, 1], [G6, .5], [A6, 1],
  [G6, .5], [E6, .5], [C6, 1], [E6, .5], [D6, .5], [C6, 1],
  [D6, .5], [E6, .5], [G6, 1], [E6, .5], [D6, .5], [C6, .5], [D6, .5],
  [A5, 2], [null, 2],

  [C6, 2], [A5, 1], [C6, 1],
  [D6, 3], [E6, .5], [D6, .5],
  [E6, 2], [A5, 2],
  [A5, .5], [C6, .5], [E6, .5], [G6, .5], [A6, 2],
  [A6, 1.5], [G6, .5], [E6, 1], [C6, 1],
  [D6, 1.5], [E6, .5], [G6, 2],
  [E6, 1], [G6, 1], [E6, 1], [C6, 1],
  [D6, 2], [null, 2],
];
// ประสานเสียง "อา~": ครึ่งหลังท่อน A เข้ามาต่ำ ๆ → ท่อน B เต็มเสียงทุกห้อง
const STUMP_CHOIR = [[null, 16], [[A3, E4], 4, .75], [[G3, E4], 4, .75], [[G3, D4], 8, .75], ...STUMP_B.map((c) => [CH[c].choir, 4])];
const STUMP_STR = perBar(STUMP_CH, (c) => eighths(c.hi, [1, .55, .8, .55]));
const STUMP_BASS = perBar(STUMP_CH, (c) => { const [r, f, o] = c.bass; return [r, r, o, r, f, r, o, f].map((x, i) => [x, .5, i % 2 ? .75 : 1]); });
const STUMP_KICK = perBar(STUMP_CH, (c, i) => (i % 8 === 7 ? [[X, 1], [X, 1], [X, .5], [X, .5], [X, 1]] : [[X, 1], [null, .5], [X, .5, .8], [X, 1], [null, 1]]));
const SNARE_FILL = [[null, 1], [X, 1], [X, .5, .8], [X, .5, .9], [X, .25, .6], [X, .25, .7], [X, .25, .85], [X, .25, 1]];
const STUMP_SNARE = perBar(STUMP_CH, (c, i) => (i % 8 === 7 ? SNARE_FILL : [[null, 1], [X, 1], [null, 1], [X, 1]]));
const STUMP_HAT = perBar(STUMP_CH, (c, i) => eighths(Array(8).fill(X), i < 8 ? [.9, .45, .7, .45] : [1, .5, .75, .5]));
const STUMP_OHAT = [...rest(32), ...perBar(STUMP_B, () => [[null, 3.5], [X, .5]])];
const TAIKO_FILL = [[null, 1], [A2, .25, .6], [A2, .25, .7], [A2, .25, .8], [A2, .25, .9], [E2, .5], [E2, .5], [E2, 1]];
const STUMP_TAIKO = perBar(STUMP_CH, (c, i) => (i % 4 === 3 ? TAIKO_FILL
  : i < 8 ? (i % 2 ? rest(4) : [[E2, 1], [null, 3]])
  : [[E2, 1], [null, 1], [E2, 1], [A2, .5, .7], [A2, .5, .8]]));
const STUMP_CRASH = [[X, .5], [null, 31.5], [X, .5], [null, 31.5]];
const STUMP_BELL = [[A6, .5], [null, 7.5], [G6, .5], [null, 7.5], [A6, .5], [null, 7.5], [E6, .5], [null, 3.5], [A6, .5], [null, 3.5]];
const STUMP_BELLS = [...STUMP_BELL, ...STUMP_BELL];

// ── 🔥 stumpRage (152 BPM) ──
const RAGE_ECHO = [[null, .5], ...STUMP_BRASS.slice(0, -1).map(([f, b]) => [f && f * 2, b, .8]), [null, 1.5]];
const RAGE_CHOIR = STUMP_CH.map((c, i) => [CH[c].choir, 4, i < 8 ? .8 : 1]);
const RAGE_STR = perBar(STUMP_CH, (c) => c.hi.flatMap((f) => [[f, .25, 1], [f, .25, .55]]));
const RAGE_KICK = perBar(STUMP_CH, (c, i) => (i % 8 === 7 ? [[X, 1], [X, 1], [X, .5], [X, .5], [X, 1]] : [[X, 1], [X, 1, .8], [X, .5], [X, .5, .8], [X, 1, .85]]));
const RAGE_SNARE = perBar(STUMP_CH, (c, i) => (i % 4 === 3 ? SNARE_FILL : [[null, 1], [X, 1], [null, 1], [X, 1]]));
const RAGE_HAT = perBar(STUMP_CH, () => Array(16).fill(X).map((x, j) => [x, .25, [1, .4, .7, .4][j % 4]]));
const RAGE_TAIKO = perBar(STUMP_CH, (c, i) => (i % 4 === 3 ? TAIKO_FILL : [[E2, 1], [A2, .5, .7], [A2, .5, .8], [E2, 1], [A2, 1, .8]]));
const RAGE_CRASH = [0, 1, 2, 3].flatMap(() => [[X, .5], [null, 15.5]]);

const soft = (type, vol, attack, release) => ({ type, vol, attack, release });
/** เสียงตี (กลอง/ไม้เคาะ): ระดับเสียงไถลงเหลือ drop เท่าใน dropT วิ · ตัดยาวไม่เกิน len วิ (โน้ตยาวก็ยังสั้น) */
const hit = (type, vol, len, drop, dropT = 0.08) => ({ type, vol, attack: 0.003, release: 0.08, len, drop, dropT });
/** เครื่องดนตรีจาก INST (ข้างล่าง) */
const inst = (name, vol) => ({ inst: name, vol });
/** เพลงที่มีจังหวะ/ความดังรวมของตัวเอง (ไม่ใส่ = BPM กลาง และเท่าเดิม) */
const tr = (bpm, gain, layers) => Object.assign(layers, { bpm, gain });

// ─────────────────────────────────────────────────────────────
// 🎻 เครื่องดนตรีสังเคราะห์ — ทุกตัวรับ (ac, ความถี่, เวลาเริ่ม, ยาวกี่วินาที, ความดัง, ปลายทาง)
// แล้วคืนตัวต้นเสียงทั้งหมด (ไว้ยกเลิกตอนสลับเพลง) · ประกอบหลายคลื่น + ฟิลเตอร์ + ซ่า ให้ได้เนื้อเสียงเครื่องจริง
// ─────────────────────────────────────────────────────────────
let noiseBuf = null;
function noiseSrc(ac, at, end) {
  if (!noiseBuf) {
    const n = ac.sampleRate;
    noiseBuf = ac.createBuffer(1, n, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  src.start(at, Math.random() * 0.9);
  src.stop(end + 0.02);
  return src;
}
function mkOsc(ac, type, f, at, end, det = 0) {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, at);
  if (det) o.detune.setValueAtTime(det, at);
  o.start(at);
  o.stop(end + 0.02);
  return o;
}
function mkFilter(ac, type, f, q = 1) {
  const b = ac.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  return b;
}
function mkGain(ac, v = 1) { const g = ac.createGain(); g.gain.value = v; return g; }
/** ตีแล้วจาง (กลอง ดีด เคาะ) */
function perc(g, at, peak, decay, attack = 0.003) {
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
}
/** เข้า a วิ ค้างจนจบโน้ต แล้วจางใน rel วิ · คืนเวลาที่เงียบสนิท */
function swell(g, at, dur, peak, a, rel) {
  const top = at + Math.min(a, dur * 0.9), off = Math.max(top + 0.005, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), top);
  g.gain.setValueAtTime(Math.max(0.0002, peak), off);
  g.gain.exponentialRampToValueAtTime(0.0001, off + rel);
  return off + rel;
}
/** สั่นเสียง (เซนต์) เริ่มหลังเป่า/สีไปครู่หนึ่ง เหมือนนักดนตรีจริง */
function vibrato(ac, oscs, at, end, rate, depth, delay) {
  const l = mkOsc(ac, 'sine', rate, at, end);
  const d = mkGain(ac, 0);
  d.gain.setValueAtTime(0, at + delay);
  d.gain.linearRampToValueAtTime(depth, at + delay + 0.3);
  l.connect(d);
  for (const o of oscs) d.connect(o.detune);
  return l;
}
const INST = {
  // ขลุ่ย: sine + คู่แปดบาง ๆ + ลมหายใจ (ซ่ากรองแคบรอบโน้ต ดังตอนเป่าแล้วเหลือนิดเดียว) + สั่นเสียงตอนลากยาว
  flute(ac, f, at, dur, vol, out) {
    const g = mkGain(ac, 0); g.connect(out);
    const end = swell(g, at, dur * 0.92, vol, 0.045, 0.12);
    const o1 = mkOsc(ac, 'sine', f, at, end), o2 = mkOsc(ac, 'triangle', f * 2, at, end);
    o1.connect(g); const g2 = mkGain(ac, 0.1); o2.connect(g2); g2.connect(g);
    const n = noiseSrc(ac, at, end), bp = mkFilter(ac, 'bandpass', f * 1.5, 6), ng = mkGain(ac, 0);
    ng.gain.setValueAtTime(0.0001, at); ng.gain.exponentialRampToValueAtTime(0.5, at + 0.03); ng.gain.exponentialRampToValueAtTime(0.12, at + 0.16);
    n.connect(bp); bp.connect(ng); ng.connect(g);
    return [o1, o2, n, ...(dur > 0.4 ? [vibrato(ac, [o1, o2], at, end, 5.4, 10, 0.2)] : [])];
  },
  // คาลิมบา: sine หางยาว + เหล็กดีด "ติ๊ง" (โอเวอร์โทน ×5.95) หายเร็ว
  kalimba(ac, f, at, dur, vol, out) {
    const dec = Math.min(1.5, 0.45 + 280 / f);
    const g = mkGain(ac, 0); g.connect(out); perc(g, at, vol, dec);
    const o1 = mkOsc(ac, 'sine', f, at, at + dec), o2 = mkOsc(ac, 'sine', f * 5.95, at, at + 0.12);
    const g2 = mkGain(ac, 0); perc(g2, at, 0.4, 0.1);
    o1.connect(g); o2.connect(g2); g2.connect(g);
    return [o1, o2];
  },
  // พิณ: ดีดสายฟันเลื่อย ฟิลเตอร์ปิดจากใสลงทุ้มเร็ว ๆ (เสียงสายที่เพิ่งถูกดีด) หางยาว
  harp(ac, f, at, dur, vol, out) {
    const dec = Math.min(2.2, 0.8 + 250 / f);
    const g = mkGain(ac, 0); g.connect(out); perc(g, at, vol, dec, 0.002);
    const lp = mkFilter(ac, 'lowpass', 1000, 1.2);
    lp.frequency.setValueAtTime(Math.min(12000, f * 9), at); lp.frequency.exponentialRampToValueAtTime(f * 1.6, at + 0.35);
    const o1 = mkOsc(ac, 'sawtooth', f, at, at + dec), o2 = mkOsc(ac, 'triangle', f, at, at + dec, 4);
    const g1 = mkGain(ac, 0.35); o1.connect(g1); g1.connect(lp); o2.connect(lp); lp.connect(g);
    return [o1, o2];
  },
  // เครื่องสายแพด: ฟันเลื่อยสามตัวเพี้ยนกันนิด ๆ (= หลายคันชักพร้อมกัน) + ฟิลเตอร์นุ่ม + สีเข้าช้า + สั่นเสียง
  strings(ac, f, at, dur, vol, out) {
    const g = mkGain(ac, 0); g.connect(out);
    const end = swell(g, at, dur, vol, Math.min(0.35, dur * 0.4), 0.35);
    const lp = mkFilter(ac, 'lowpass', Math.min(5000, f * 3.2), 0.7); lp.connect(g);
    const os = [-9, 0, 9].map((c) => { const o = mkOsc(ac, 'sawtooth', f, at, end, c); o.connect(lp); return o; });
    return [...os, vibrato(ac, os, at, end, 5, 6, 0.3)];
  },
  // เครื่องสายสีสั้น (สตักกาโต) — ท่อนรัวของเพลงบอส
  stac(ac, f, at, dur, vol, out) {
    const d = Math.min(dur * 0.8, 0.16);
    const g = mkGain(ac, 0); g.connect(out);
    const end = swell(g, at, d, vol, 0.008, 0.07);
    const lp = mkFilter(ac, 'lowpass', 1000, 1.4);
    lp.frequency.setValueAtTime(Math.min(9000, f * 6), at); lp.frequency.exponentialRampToValueAtTime(Math.min(6000, f * 3), at + 0.1);
    lp.connect(g);
    return [-7, 7].map((c) => { const o = mkOsc(ac, 'sawtooth', f, at, end, c); o.connect(lp); return o; });
  },
  // แตรทองเหลือง: ฟันเลื่อยคู่ ฟิลเตอร์เปิดพรวดตอนเป่า (เสียง "แป๊น" ของแตร) แล้วลดลงมาค้าง
  brass(ac, f, at, dur, vol, out) {
    const g = mkGain(ac, 0); g.connect(out);
    const end = swell(g, at, dur * 0.95, vol, 0.03, 0.09);
    const lp = mkFilter(ac, 'lowpass', 1000, 2);
    lp.frequency.setValueAtTime(f * 1.2, at);
    lp.frequency.exponentialRampToValueAtTime(Math.min(9000, f * 7), at + 0.06);
    lp.frequency.exponentialRampToValueAtTime(Math.min(6000, f * 3.5), at + 0.3);
    lp.connect(g);
    const os = [-6, 6].map((c) => { const o = mkOsc(ac, 'sawtooth', f, at, end, c); o.connect(lp); return o; });
    return [...os, ...(dur > 0.5 ? [vibrato(ac, os, at, end, 5.5, 8, 0.35)] : [])];
  },
  // คณะประสานเสียง "อา~": ฟันเลื่อยสามตัวผ่านฟอร์แมนต์สระ "อา" (730 / 1090 / 2440 Hz) + สั่นเสียงกว้าง
  choir(ac, f, at, dur, vol, out) {
    const g = mkGain(ac, 0); g.connect(out);
    const end = swell(g, at, dur, vol, Math.min(0.4, dur * 0.4), 0.45);
    const mix = mkGain(ac, 1);
    for (const [ff, q, k] of [[730, 6, 1], [1090, 7, 0.6], [2440, 9, 0.25]]) {
      const bp = mkFilter(ac, 'bandpass', ff, q), kg = mkGain(ac, k);
      mix.connect(bp); bp.connect(kg); kg.connect(g);
    }
    const os = [-11, 0, 10].map((c) => { const o = mkOsc(ac, 'sawtooth', f, at, end, c); o.connect(mix); return o; });
    return [...os, vibrato(ac, os, at, end, 4.6, 12, 0.3)];
  },
  // กล็อกเคนสปีล / ระฆังผลึก: sine + โอเวอร์โทนแบบระฆัง (×2.76 ×5.4) จางเร็วกว่าตัวหลัก
  bell(ac, f, at, dur, vol, out) {
    const dec = 1.3;
    const g = mkGain(ac, 0); g.connect(out); perc(g, at, vol, dec, 0.002);
    const o1 = mkOsc(ac, 'sine', f, at, at + dec), o2 = mkOsc(ac, 'sine', f * 2.76, at, at + 0.5), o3 = mkOsc(ac, 'sine', f * 5.4, at, at + 0.2);
    const g2 = mkGain(ac, 0); perc(g2, at, 0.3, 0.45); const g3 = mkGain(ac, 0); perc(g3, at, 0.12, 0.18);
    o1.connect(g); o2.connect(g2); g2.connect(g); o3.connect(g3); g3.connect(g);
    return [o1, o2, o3];
  },
  // เบสกลม: sine + triangle คู่แปดบาง ๆ (มีหัวเสียงพอให้ได้ยินบนลำโพงมือถือ)
  bass(ac, f, at, dur, vol, out) {
    const g = mkGain(ac, 0); g.connect(out);
    const end = swell(g, at, dur * 0.9, vol, 0.01, 0.08);
    const o1 = mkOsc(ac, 'sine', f, at, end), o2 = mkOsc(ac, 'triangle', f * 2, at, end);
    o1.connect(g); const g2 = mkGain(ac, 0.3); o2.connect(g2); g2.connect(g);
    return [o1, o2];
  },
  // เบสดีด (เพลงบอส): ฟันเลื่อย + ฟิลเตอร์ดีดเปิดแล้วปิด + sine ใต้ให้หนัก
  pbass(ac, f, at, dur, vol, out) {
    const g = mkGain(ac, 0); g.connect(out);
    const end = swell(g, at, dur * 0.85, vol, 0.005, 0.05);
    const lp = mkFilter(ac, 'lowpass', 1000, 3);
    lp.frequency.setValueAtTime(f * 7, at); lp.frequency.exponentialRampToValueAtTime(f * 2, at + 0.15);
    const o1 = mkOsc(ac, 'sawtooth', f, at, end), o2 = mkOsc(ac, 'sine', f, at, end);
    const g1 = mkGain(ac, 0.5); o1.connect(lp); lp.connect(g1); g1.connect(g); o2.connect(g);
    return [o1, o2];
  },
  // ── กลอง (ความถี่ของโน้ตใช้เป็นระดับเสียงเฉพาะไทโกะ/ไม้เคาะ) ──
  kick(ac, f, at, dur, vol, out) {
    const g = mkGain(ac, 0); g.connect(out); perc(g, at, vol, 0.42);
    const o = mkOsc(ac, 'sine', 160, at, at + 0.42);
    o.frequency.exponentialRampToValueAtTime(45, at + 0.13);
    o.connect(g);
    const n = noiseSrc(ac, at, at + 0.02), hp = mkFilter(ac, 'highpass', 3000), ng = mkGain(ac, 0);
    perc(ng, at, vol * 0.25, 0.015, 0.001); n.connect(hp); hp.connect(ng); ng.connect(out);
    return [o, n];
  },
  snare(ac, f, at, dur, vol, out) {
    const n = noiseSrc(ac, at, at + 0.22);
    const bp = mkFilter(ac, 'bandpass', 1900, 0.8), g = mkGain(ac, 0); perc(g, at, vol, 0.2, 0.001);
    const hp = mkFilter(ac, 'highpass', 6000), g2 = mkGain(ac, 0); perc(g2, at, vol * 0.5, 0.13, 0.001);
    n.connect(bp); bp.connect(g); g.connect(out); n.connect(hp); hp.connect(g2); g2.connect(out);
    const o = mkOsc(ac, 'triangle', 220, at, at + 0.12); o.frequency.exponentialRampToValueAtTime(165, at + 0.08);
    const g3 = mkGain(ac, 0); perc(g3, at, vol * 0.7, 0.1); o.connect(g3); g3.connect(out);
    return [n, o];
  },
  hat(ac, f, at, dur, vol, out) {
    const n = noiseSrc(ac, at, at + 0.06), hp = mkFilter(ac, 'highpass', 7500), g = mkGain(ac, 0);
    perc(g, at, vol, 0.045, 0.001); n.connect(hp); hp.connect(g); g.connect(out);
    return [n];
  },
  ohat(ac, f, at, dur, vol, out) {
    const n = noiseSrc(ac, at, at + 0.32), hp = mkFilter(ac, 'highpass', 6500), g = mkGain(ac, 0);
    perc(g, at, vol, 0.3, 0.002); n.connect(hp); hp.connect(g); g.connect(out);
    return [n];
  },
  shaker(ac, f, at, dur, vol, out) {
    const n = noiseSrc(ac, at, at + 0.1), bp = mkFilter(ac, 'bandpass', 6200, 1.5), g = mkGain(ac, 0);
    perc(g, at, vol, 0.09, 0.018); n.connect(bp); bp.connect(g); g.connect(out);
    return [n];
  },
  crash(ac, f, at, dur, vol, out) {
    const n = noiseSrc(ac, at, at + 1.8), hp = mkFilter(ac, 'highpass', 4500), g = mkGain(ac, 0);
    perc(g, at, vol, 1.7, 0.002); n.connect(hp); hp.connect(g); g.connect(out);
    return [n];
  },
  // กลองไทโกะ: หนังใหญ่ระดับเสียงไถลง + เสียงไม้ตีหนัง (ซ่ากรองต่ำ) — เสียง "ไม้" ของภูตตอไม้ในเพลงบอส
  taiko(ac, f, at, dur, vol, out) {
    const g = mkGain(ac, 0); g.connect(out); perc(g, at, vol, 0.55, 0.002);
    const o = mkOsc(ac, 'sine', f, at, at + 0.55); o.frequency.exponentialRampToValueAtTime(f * 0.62, at + 0.3); o.connect(g);
    const o2 = mkOsc(ac, 'triangle', f * 1.6, at, at + 0.15); const g2 = mkGain(ac, 0); perc(g2, at, 0.35, 0.12); o2.connect(g2); g2.connect(g);
    const n = noiseSrc(ac, at, at + 0.14), lp = mkFilter(ac, 'lowpass', 700), ng = mkGain(ac, 0);
    perc(ng, at, vol * 0.6, 0.12, 0.001); n.connect(lp); lp.connect(ng); ng.connect(out);
    return [o, o2, n];
  },
  // ไม้เคาะ: เนื้อไม้ไถลงสั้น + ผิวกระทบ
  wood(ac, f, at, dur, vol, out) {
    const g = mkGain(ac, 0); g.connect(out); perc(g, at, vol, 0.08, 0.001);
    const o = mkOsc(ac, 'sine', f, at, at + 0.08); o.frequency.exponentialRampToValueAtTime(f * 0.72, at + 0.05); o.connect(g);
    const n = noiseSrc(ac, at, at + 0.03), bp = mkFilter(ac, 'bandpass', f * 2.6, 5), ng = mkGain(ac, 0);
    perc(ng, at, vol * 0.6, 0.025, 0.001); n.connect(bp); bp.connect(ng); ng.connect(out);
    return [o, n];
  },
};

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

  // ── เพลงประจำแมพ ──
  // ระดับเสียง (vol) รวมของทุกเพลงตั้งใกล้เคียงกับ main เพื่อไม่ให้ดังกระโดด
  // ตอนวิ่งข้ามฉาก ซึ่งเกิดขึ้นกลางเกมโดยที่ผู้เล่นไม่ได้กดอะไรเลย
  // แมพที่มีหลายชั้นจึงต้องเบาลงเป็นชั้น ๆ ไม่ใช่ตั้งดังเท่าแมพที่มีสองชั้น
  night: [
    // square + release สั้นมาก = เสียงแทงคม ๆ ไม่มีหาง เข้ากับท่าย่อง
    { notes: schedule(NIGHT_LEAD), voice: soft('square', 0.082, 0.008, 0.2) },
    { notes: schedule(NIGHT_BASS), voice: soft('triangle', 0.115, 0.012, 0.3) },
    { notes: schedule(NIGHT_CLINK), voice: soft('sine', 0.049, 0.005, 0.6) },
  ],
  garden: [
    { notes: schedule(GARDEN_LEAD), voice: soft('triangle', 0.112, 0.015, 0.6) },
    // release สั้นทำให้ "ปะ-ปะ" เด้งออกจากกันเป็นตัว ๆ ถ้าลากยาวจะกลายเป็นแพดทันที
    { notes: schedule(GARDEN_OOMPAH), voice: soft('triangle', 0.073, 0.01, 0.3) },
  ],
  cavern: [
    { notes: schedule(CAVERN_LEAD), voice: soft('sine', 0.101, 0.05, 0.5) },
    // เบามากและหางยาวกว่าชั้นหลัก จึงได้ยินเป็นเสียงที่ตีกลับมาจากผนัง ไม่ใช่อีกเสียงหนึ่ง
    { notes: schedule(CAVERN_ECHO), voice: soft('sine', 0.033, 0.03, 0.3) },
    { notes: schedule(CAVERN_BASS), voice: soft('sine', 0.071, 0.35, 1.2) },
  ],
  beach: [
    { notes: schedule(BEACH_LEAD), voice: soft('sine', 0.07, 0.08, 0.9) },
    // release 0.16 คือหัวใจของคอร์ดสับ ต้องขาดทันทีที่ดีด ไม่ให้ค้างไปทับบีตถัดไป
    { notes: schedule(BEACH_SKANK), voice: soft('triangle', 0.048, 0.005, 0.16) },
    { notes: schedule(BEACH_BASS), voice: soft('sine', 0.085, 0.02, 0.5) },
  ],
  space: [
    { notes: schedule(SPACE_LEAD), voice: soft('sine', 0.06, 0.15, 1.2) },
    { notes: schedule(SPACE_ARP), voice: soft('triangle', 0.042, 0.004, 0.22) },
    { notes: schedule(SPACE_PAD_A), voice: soft('sine', 0.038, 0.8, 1.0) },
    { notes: schedule(SPACE_PAD_B), voice: soft('sine', 0.032, 0.9, 1.0) },
    { notes: schedule(SPACE_BASS), voice: soft('sine', 0.048, 0.3, 1.0) },
  ],
  snow: [
    // release 0.12 = เริ่มเบาลงตั้งแต่ยังไม่ถึงหนึ่งในแปดของตัวโน้ต ที่เหลือเป็นหาง
    // ที่ค่อย ๆ จางไปเอง ซึ่งคือรูปเสียงของกล่องดนตรีพอดี
    { notes: schedule(SNOW_LEAD), voice: soft('triangle', 0.126, 0.004, 0.12) },
    { notes: schedule(SNOW_TWINKLE), voice: soft('sine', 0.041, 0.004, 0.08) },
    { notes: schedule(SNOW_BASS), voice: soft('sine', 0.081, 0.35, 0.7) },
  ],

  // ── เพลงสกิล (ชื่อแทร็กอยู่ใน tune.music ของ skills.js) ──
  // ความดังรวมตั้งใกล้เพลงเต้น — สกิลติดกลางเพลงแมพ ถ้าดังกว่าจะกระโดดจนสะดุ้ง
  skillHero: [
    { notes: schedule(HERO_LEAD), voice: soft('square', 0.062, 0.01, 0.6) },
    { notes: schedule(HERO_BASS), voice: soft('triangle', 0.07, 0.008, 0.35) },
    { notes: schedule(HERO_PAD), voice: soft('sine', 0.036, 0.3, 0.95) },
  ],
  skillFly: [
    { notes: schedule(FLY_LEAD), voice: soft('sine', 0.075, 0.12, 0.85) },
    // พิณ: ดีดแล้วจางเร็ว ตัวถัดไปมาก่อนตัวเดิมหาย = ม่านเสียงพลิ้ว ๆ
    { notes: schedule(FLY_HARP), voice: soft('triangle', 0.04, 0.004, 0.3) },
    { notes: schedule(FLY_BASS), voice: soft('sine', 0.05, 0.3, 0.9) },
  ],
  skillGold: [
    { notes: schedule(GOLD_LEAD), voice: soft('square', 0.058, 0.008, 0.4) },
    { notes: schedule(GOLD_BASS), voice: soft('triangle', 0.09, 0.008, 0.3) },
    { notes: schedule(GOLD_COIN), voice: soft('sine', 0.045, 0.003, 0.2) },
  ],
  skillCrystal: [
    // release 0.15 = ดีดแล้วเริ่มจางทันที ที่เหลือเป็นหาง = เสียงระฆังแก้ว
    { notes: schedule(CRYSTAL_LEAD), voice: soft('sine', 0.1, 0.005, 0.15) },
    { notes: schedule(CRYSTAL_ECHO), voice: soft('sine', 0.034, 0.005, 0.15) },
    { notes: schedule(CRYSTAL_BASS), voice: soft('sine', 0.07, 0.02, 0.4) },
  ],
  skillSnow: [
    { notes: schedule(SNOWBALL_LEAD), voice: soft('triangle', 0.1, 0.006, 0.4) },
    { notes: schedule(SNOWBALL_BELLS), voice: soft('sine', 0.022, 0.002, 0.3) },
    { notes: schedule(SNOWBALL_BASS), voice: soft('triangle', 0.075, 0.01, 0.3) },
  ],

  // ── ด่านสอนป่าผลึก + บอสภูตตอไม้ (ดูหัวข้อ 🌳 / 🎻 ข้างบน) · gain ปรับจากการวัดให้ดังใกล้เพลงแมพอื่น ──
  grove: tr(116, 0.72, [
    { notes: schedule(GROVE_FLUTE), voice: inst('flute', 0.1) },
    { notes: schedule(GROVE_KALIMBA), voice: inst('kalimba', 0.055) },
    { notes: schedule(GROVE_HARP), voice: inst('harp', 0.07) },
    { notes: schedule(GROVE_PAD), voice: inst('strings', 0.011) },
    { notes: schedule(GROVE_BASS), voice: inst('bass', 0.085) },
    { notes: schedule(GROVE_KICK), voice: inst('kick', 0.11) },
    { notes: schedule(GROVE_WOOD), voice: inst('wood', 0.05) },
    { notes: schedule(GROVE_SHAKER), voice: inst('shaker', 0.05) },
    { notes: schedule(GROVE_GLOCK), voice: inst('bell', 0.03) },
  ]),
  stump: tr(140, 0.88, [
    { notes: schedule(STUMP_BRASS), voice: inst('brass', 0.05) },
    { notes: schedule(STUMP_CHOIR), voice: inst('choir', 0.12) },
    { notes: schedule(STUMP_STR), voice: inst('stac', 0.02) },
    { notes: schedule(STUMP_BASS), voice: inst('pbass', 0.07) },
    { notes: schedule(STUMP_KICK), voice: inst('kick', 0.18) },
    { notes: schedule(STUMP_SNARE), voice: inst('snare', 0.09) },
    { notes: schedule(STUMP_HAT), voice: inst('hat', 0.045) },
    { notes: schedule(STUMP_OHAT), voice: inst('ohat', 0.035) },
    { notes: schedule(STUMP_TAIKO), voice: inst('taiko', 0.2) },
    { notes: schedule(STUMP_CRASH), voice: inst('crash', 0.05) },
    { notes: schedule(STUMP_BELLS), voice: inst('bell', 0.035) },
  ]),
  stumpRage: tr(152, 0.76, [
    { notes: schedule(STUMP_BRASS), voice: inst('brass', 0.052) },
    { notes: schedule(RAGE_ECHO), voice: inst('bell', 0.022) },
    { notes: schedule(RAGE_CHOIR), voice: inst('choir', 0.12) },
    { notes: schedule(RAGE_STR), voice: inst('stac', 0.017) },
    { notes: schedule(STUMP_BASS), voice: inst('pbass', 0.072) },
    { notes: schedule(RAGE_KICK), voice: inst('kick', 0.18) },
    { notes: schedule(RAGE_SNARE), voice: inst('snare', 0.09) },
    { notes: schedule(RAGE_HAT), voice: inst('hat', 0.04) },
    { notes: schedule(RAGE_TAIKO), voice: inst('taiko', 0.2) },
    { notes: schedule(RAGE_CRASH), voice: inst('crash', 0.05) },
    { notes: schedule(STUMP_BELLS), voice: inst('bell', 0.04) },
  ]),
};

// ─────────────────────────────────────────────────────────────
// เพลงหน้าแรกเป็น "ไฟล์จริง" ไม่ใช่เสียงสังเคราะห์ — ตัวเดียวในเกมที่เป็นแบบนี้
//   Love You - Singing Kitten [Japanese Ver.] โดย tideblue จาก Pixabay
//   ยาว 3:15 สัญญาอนุญาต Pixabay Content License (ใช้เชิงพาณิชย์ได้ ไม่บังคับเครดิต)
//
// เล่นผ่าน <audio> ไม่ใช่ decodeAudioData เพราะไฟล์ 6MB ถ้ารอถอดรหัสทั้งก้อนก่อน
// จะเงียบอยู่หลายวินาทีตอนเปิดหน้าแรก ส่วน <audio> เริ่มเล่นได้ตั้งแต่โหลดได้ไม่กี่วินาที
// และ loop ในตัวมันเองวนให้เองไม่รู้จบโดยไม่ต้องมีตัวจับเวลาคอยเช็ค
//
// ต่อผ่าน createMediaElementSource เข้าปมรวมเดียวกับเสียงอื่น ปุ่มปรับเสียง
// ในหน้าตั้งค่าจึงคุมเพลงนี้ได้ด้วยโดยไม่ต้องเขียนอะไรเพิ่ม
//
// BASE_URL ไม่ใช่ '/' ตรง ๆ เพราะ vite ตั้ง base: './' ไว้ (ดู vite.config.js)
// เว็บที่ deploy ลงโฟลเดอร์ย่อยจึงยังหาไฟล์เจอ
// ─────────────────────────────────────────────────────────────
/**
 * เพลงหน้าแรกให้ผู้เล่นเลือก (ตั้งค่า → เสียง → แผ่นเสียง) — เพิ่มเพลงใหม่ = เพิ่มแถวตรงนี้ + วางไฟล์ใน public/
 * ทุกเพลงของ tideblue จาก Pixabay (Pixabay Content License — ใช้เชิงพาณิชย์ได้ ไม่บังคับเครดิต แต่เราใส่ให้)
 */
export const HOME_SONGS = [
  { file: 'home-theme.mp3', title: 'Love You - Singing Kitten [Japanese Ver.]', artist: 'tideblue', from: 'Pixabay', hue: 320 },
  { file: 'tideblue-robo-kitty-waits-vocoder-cat-song-571162.mp3', title: 'Robo Kitty Waits [ Vocoder Cat Song ]', artist: 'tideblue', from: 'Pixabay', hue: 200 },
  { file: 'tideblue-ocean-morning-japanese-ver-chill-rampb-521267.mp3', title: 'Ocean Morning (Japanese Ver. / Chill R&B)', artist: 'tideblue', from: 'Pixabay', hue: 170 },
];
/** เพลงบ้านลูกเหมียว — เลือกแยกจากเพลงหน้าแรก (ตั้งค่า → เสียง → แผ่นเสียงแผ่นที่สอง) */
export const ROOM_SONGS = [
  { file: 'Music_room.mp3', title: 'Love You - Singing Kitten [English Ver.]', artist: 'tideblue', from: 'Pixabay', hue: 30 },
  { file: 'Tide Blue - Sunset Amber Chill (Instrumental).mp3', title: 'Sunset Amber Chill (Instrumental)', artist: 'Tide Blue', from: 'Pixabay', hue: 40 },
];
export const SONG_LISTS = { home: HOME_SONGS, room: ROOM_SONGS };
const SONG_PREF = { home: 'homeSong', room: 'roomSong' };
const songIdx = {};
for (const k of Object.keys(SONG_LISTS)) {
  songIdx[k] = Math.max(0, Math.min(SONG_LISTS[k].length - 1, Number(loadPref(SONG_PREF[k], 0)) || 0));
}
// ชื่อไฟล์มีเว้นวรรค/วงเล็บได้ — เข้ารหัสเป็น URL ก่อนใช้
const songSrc = (k, i = songIdx[k]) => import.meta.env.BASE_URL + encodeURI(SONG_LISTS[k][i].file);

export function songIndex(kind) { return songIdx[kind]; }

/** เปลี่ยนเพลงของหน้าหนึ่ง (home / room) — กำลังเล่นเพลงของหน้านั้นอยู่ = สลับทันที (หรี่ลง-ดังขึ้นนุ่ม ๆ) */
export function setSong(kind, i) {
  const n = SONG_LISTS[kind].length;
  songIdx[kind] = ((i % n) + n) % n;
  savePref(SONG_PREF[kind], songIdx[kind]);
  FILE_TRACKS[kind] = songSrc(kind);
  delete filePos[FILE_TRACKS[kind]];   // เพลงใหม่เริ่มจากหัวเพลงเสมอ
  if (track === kind && master && !fileFailed) playFile(FILE_TRACKS[kind], kind === 'room' ? ROOM_FADE_IN : FADE_IN);
  return songIdx[kind];
}

const FILE_TRACKS = {
  home: songSrc('home'),
  // บ้านน้องแมว (src/catroom.js) — เพลงของห้องโดยเฉพาะ
  room: songSrc('room'),
};

// เพลงบ้านน้องใช้ชื่อในตาราง TRACKS ด้วย (setMusicTrack รับเฉพาะชื่อที่มีในตาราง)
// ถ้าไฟล์โหลดไม่ได้ ถอยไปใช้เพลงสังเคราะห์ของหน้าแรก ห้องจะได้ไม่เงียบสนิท
TRACKS.room = TRACKS.home;

/**
 * ตำแหน่งที่เล่นค้างไว้ของแต่ละไฟล์ — ไฟล์เพลงใช้ <audio> ตัวเดียวสลับ src กัน
 * ถ้าไม่จำไว้ ออกจากบ้านน้องกลับมาหน้าแรกทีไรเพลงหน้าแรกจะเริ่มต้นใหม่ทุกครั้ง
 */
const filePos = {};

// วัด RMS เทียบกับเพลงสังเคราะห์ในเกมจริง ไม่ได้เดาเอา
// ที่ 0.5 เพลงหน้าแรกดังกว่าเพลงตอนวิ่ง 3.5 dB (1.5 เท่า) เพราะไฟล์จริงถูกบีบ
// ไดนามิกมาแน่นกว่าโน้ตสังเคราะห์ที่เว้นช่องว่างเยอะ — พีคใกล้กันแต่หูได้ยินคนละระดับ
// 0.33 ทำให้ดังพอ ๆ กัน เข้าเกมแล้วเสียงไม่กระโดดลง
const FILE_VOL = 0.33;

// ── ขาออก: สั้น ──────────────────────────────────────────────
// จำเป็นมาก ไม่ใช่ของประดับ: การสั่ง pause() ตรง ๆ คือการตัดคลื่นเสียงกลางคัน
// ลำโพงต้องกระโดดจากค่าปัจจุบันไปศูนย์ในหนึ่งแซมเปิล ซึ่งได้ยินเป็นเสียง "ป๊อก"
// เพลงที่ถูกบีบไดนามิกมาแน่นยิ่งชัด เพราะแทบไม่มีจังหวะที่คลื่นอยู่ใกล้ศูนย์เลย
//
// 0.14 วิสั้นพอให้รู้สึกว่าเพลง "หยุดทันที" ตามที่ต้องการ แต่ยาวพอให้คลื่น
// ไหลลงถึงศูนย์อย่างนุ่มนวลจนไม่มีเสียงป๊อก
const FADE_OUT = 0.14;

// ── ขาเข้า: ยาว ──────────────────────────────────────────────
// เข้าหน้าแรกทางไหนก็ตาม (เล่นจบ กดเลิกเล่น กดกลับ) เพลงต้องค่อย ๆ ดังขึ้น
// ไม่ใช่โผล่มาเต็มเสียงทันที ซึ่งกระแทกหูโดยเฉพาะตอนเพิ่งตายแล้วจอเงียบอยู่
const FADE_IN = 1.6;
/** เข้า/ออกบ้านลูกเหมียว — ค่อย ๆ ดังขึ้นช้ากว่าปกติ (ผู้ใช้ขอราว 3 วินาที) */
const ROOM_FADE_IN = 3;
// หรี่ขึ้นช้าเริ่มจากเบา ๆ ที่ยังได้ยิน (−30 dB ของระดับเต็ม) ไม่ใช่จากเกือบเงียบ (−52 dB)
// เริ่มจากเกือบเงียบ ครึ่งแรกของ 3 วินาทีจะเบาจนไม่ได้ยิน แล้วเพลงโผล่มาช่วงท้ายทีเดียว
// เริ่มที่ระดับนี้ = ได้ยินตั้งแต่วินาทีแรก แล้วดังขึ้นต่อเนื่องจนรู้ว่า "กำลังดังขึ้น"
const SLOW_FROM = 0.032;

// ค่าเริ่มของการหรี่ขึ้น ต้องมากกว่าศูนย์เพราะ exponentialRamp ผ่านศูนย์ไม่ได้
// (คณิตศาสตร์ของมันคือคูณทีละขั้น ถ้าเริ่มที่ศูนย์จะคูณเท่าไหร่ก็ยังศูนย์)
const FADE_FLOOR = 0.0008;

let fileEl = null;
let fileGain = null;
let fileFailed = false;   // โหลดไฟล์ไม่ได้ = ถอยไปใช้เพลงสังเคราะห์ตัวเดิม
let fadeToken = 0;        // กันคิวหยุดที่ค้างอยู่ไปหยุดเพลงที่เพิ่งสั่งเล่นใหม่

/** เพลงนี้ต้องเล่นจากไฟล์ไหม — ถ้าไฟล์พังไปแล้วให้ตอบว่าไม่ จะได้ถอยไปใช้ของสังเคราะห์ */
function fileFor(name) {
  return !fileFailed && FILE_TRACKS[name] ? FILE_TRACKS[name] : null;
}

function ensureFileEl() {
  if (fileEl) return fileEl;
  const ac = audioCtx();

  fileEl = new Audio();
  fileEl.loop = true;         // วนเองไม่รู้จบ ไม่ต้องมีตัวจับเวลาคอยเช็คว่าจบเพลงยัง
  fileEl.preload = 'auto';
  fileEl.addEventListener('error', () => {
    // ไฟล์หาย/เน็ตพัง — อย่าปล่อยให้หน้าแรกเงียบสนิท ถอยไปใช้เพลงสังเคราะห์
    console.warn('[music] โหลดเพลงหน้าแรกไม่ได้ ใช้เพลงสังเคราะห์แทน');
    fileFailed = true;
    if (FILE_TRACKS[track]) { restartLoop(ac.currentTime + 0.05); pump(); }
  });

  fileGain = ac.createGain();
  // เริ่มที่ศูนย์เสมอ แล้วค่อยหรี่ขึ้น — กันเสียงป๊อกตอนโน้ตแรกของเพลงดังขึ้นมา
  fileGain.gain.value = 0;
  ac.createMediaElementSource(fileEl).connect(fileGain);
  fileGain.connect(musicOut());
  return fileEl;
}

/**
 * ค่อย ๆ ดังขึ้นจนถึงระดับปกติ
 *
 * ใช้ exponential ไม่ใช่ linear เพราะหูคนรับรู้ความดังแบบลอการิทึม
 * ไล่เป็นเส้นตรงจะได้ยินเป็น "ดังพรวดตอนต้นแล้วนิ่งยาว" ไม่ใช่ค่อย ๆ ดังขึ้น
 * ส่วน exponential ไล่ขึ้นสม่ำเสมอในหูจริง ๆ
 *
 * เริ่มจากระดับปัจจุบันเสมอ (ไม่รีเซ็ตเป็นศูนย์) เผื่อสั่งเล่นซ้อนตอนที่ยัง
 * หรี่ลงไม่สุด เสียงจะได้ไต่ขึ้นต่อจากจุดเดิมแทนที่จะกระตุกลงไปเริ่มใหม่
 */
function fadeIn(sec = FADE_IN, start = null) {
  const ac = audioCtx();
  const g = fileGain.gain;
  // start = ระดับที่ผู้เรียกเพิ่งตั้งไว้ — ต้องส่งมาตรง ๆ เพราะ g.value ยังคืนค่าเก่าของเฟรมที่แล้ว
  // (เคยเจอ: สลับเพลงหน้าแรก→เพลงห้อง ตั้งเสียงลงเงียบแล้ว แต่อ่าน g.value ได้ 0.33 เต็ม
  //  เลยกลายเป็นหรี่จากเต็มไปเต็ม เพลงห้องดังเต็มทันทีไม่มีหรี่ขึ้นเลย)
  const from = Math.max(FADE_FLOOR, start ?? g.value);
  g.cancelScheduledValues(ac.currentTime);
  g.setValueAtTime(from, ac.currentTime);
  g.exponentialRampToValueAtTime(FILE_VOL, ac.currentTime + sec);
}

/** หรี่ลงจนเงียบแบบเร็ว ๆ — linear พอ เพราะสั้นจนรูปทรงของเส้นไม่มีผลกับหู */
function fadeOut() {
  const ac = audioCtx();
  const g = fileGain.gain;
  g.cancelScheduledValues(ac.currentTime);
  g.setValueAtTime(g.value, ac.currentTime);
  g.linearRampToValueAtTime(0, ac.currentTime + FADE_OUT);
}

/** ตอนนี้ควรให้ไฟล์เพลงเล่นอยู่ไหม — ใช้กันไม่ให้การลองใหม่ไปเล่นเพลงที่สั่งหยุดไปแล้ว */
let fileWanted = false;
let gestureHooked = false;

/**
 * ลองสั่งเล่นใหม่ตอนผู้ใช้แตะจอครั้งถัดไป
 *
 * ── ทำไมต้องมี ──
 * เดิมตรงนี้กลืนข้อผิดพลาดทิ้งพร้อมคอมเมนต์ว่า "เดี๋ยวรอบหน้าค่อยเล่น"
 * แต่ไม่มี "รอบหน้า" จริง ๆ เลย ไม่มีใครมาสั่งซ้ำอีก
 *
 * จุดที่ระเบิดคือตอนคลิปเปิดเกมจบเอง: คำสั่งเล่นเพลงมาจากตัวจับเวลา ไม่ได้มาจากการแตะจอ
 * iOS จึงปฏิเสธ แล้วเพลงหน้าแรกก็เงียบไปทั้งรอบ — และเป็นบ้างไม่เป็นบ้าง
 * เพราะขึ้นกับว่าก่อนหน้านั้นไฟล์เคยถูกเล่นสำเร็จไปแล้วหรือยัง (ถ้าเคย iOS จะปล่อยผ่าน)
 */
function retryFileOnGesture() {
  if (gestureHooked) return;
  gestureHooked = true;
  const evs = ['pointerdown', 'touchend', 'keydown'];
  const go = () => {
    for (const ev of evs) document.removeEventListener(ev, go, true);
    gestureHooked = false;
    if (!fileWanted || !fileEl || bufSrc) return;   // เล่นจากหน่วยความจำอยู่แล้ว ไม่ต้องปลุก <audio>
    fileEl.play().catch(retryFileOnGesture);
  };
  for (const ev of evs) document.addEventListener(ev, go, { capture: true, passive: true });
}

// ══ เล่นจากหน่วยความจำแทน <audio> (แก้เพลงค้างแล้วเล่นท่อนเดิมซ้ำบนไอโฟน) ═════════════════
// <audio> ที่ต่อเข้า Web Audio (createMediaElementSource) บน Safari ป้อนเสียงจากเธรดหลัก
// เครื่องยุ่ง (หน้าแรกวาดหนัก/เปิดแผง) ป้อนไม่ทัน = เสียงก้อนเดิมวนซ้ำ ฟังเป็น "ค้างแล้วเล่นท่อนเดิมซ้ำ"
// ถอดรหัสไฟล์ทั้งเพลงเป็น AudioBuffer แล้วเล่นด้วย AudioBufferSourceNode — เล่นบนเธรดเสียงล้วน
// เธรดหลักยุ่งแค่ไหนเพลงก็ไม่สะดุด · ระหว่างถอดรหัส (1-2 วิ) เล่นด้วย <audio> ไปก่อน แล้วสลับต่อตำแหน่งเดิม
// ถอดที่ 32kHz (ไม่ใช่ 48k) ประหยัดหน่วยความจำ ~1/3 หูแยกไม่ออกสำหรับเพลงในเกม · เก็บไว้แค่เพลงล่าสุดเพลงเดียว
const decoded = new Map();    // src → AudioBuffer
const decoding = new Map();   // src → Promise
let bufSrc = null;            // AudioBufferSourceNode ที่เล่นอยู่
let bufFor = null;            // src ของเพลงที่เล่นจากหน่วยความจำ
let bufStartAt = 0;
let bufOffset = 0;

function bufPos() {
  if (!bufSrc) return 0;
  const d = bufSrc.buffer.duration || 1;
  return (bufOffset + audioCtx().currentTime - bufStartAt) % d;
}
function stopBuf() {
  if (!bufSrc) return;
  try { bufSrc.stop(); } catch { /* หยุดไปแล้ว */ }
  try { bufSrc.disconnect(); } catch { /* ถอดไปแล้ว */ }
  bufSrc = null;
  bufFor = null;
}
function startBuf(src, offset = 0, when = null) {
  const ac = audioCtx();
  const b = decoded.get(src);
  const n = ac.createBufferSource();
  n.buffer = b;
  n.loop = true;
  n.connect(fileGain);
  const t = when ?? ac.currentTime;
  const off = ((offset % b.duration) + b.duration) % b.duration;
  n.start(t, off);
  bufSrc = n;
  bufFor = src;
  bufStartAt = t;
  bufOffset = off;
}
function decodeSong(src) {
  if (decoded.has(src)) return Promise.resolve(decoded.get(src));
  if (decoding.has(src)) return decoding.get(src);
  const p = fetch(src)
    .then((r) => { if (!r.ok) throw new Error('fetch ' + r.status); return r.arrayBuffer(); })
    .then((ab) => new Promise((res, rej) => {
      let oc;
      try { oc = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, 1, 32000); } catch { oc = audioCtx(); }
      oc.decodeAudioData(ab, res, rej);   // แบบ callback — Safari รุ่นเก่าไม่คืน Promise
    }))
    .then((buf) => {
      // เก็บแค่เพลงที่เพิ่งถอดเพลงเดียว (ยกเว้นตัวที่กำลังเล่นอยู่) — กันหน่วยความจำบวมบนมือถือ
      for (const k of [...decoded.keys()]) if (k !== bufFor) decoded.delete(k);
      decoded.set(src, buf);
      return buf;
    })
    .finally(() => decoding.delete(src));
  decoding.set(src, p);
  return p;
}

function playFile(src, fadeSec = FADE_IN) {
  const el = ensureFileEl();
  fileWanted = true;
  fadeToken++;   // ยกเลิกคิวหยุดที่ค้างอยู่ ไม่งั้นมันจะมาหยุดเพลงที่เพิ่งสั่งเล่น
  let start = null;   // ระดับเริ่มของการหรี่ขึ้น (null = ต่อจากระดับที่ดังอยู่ตอนนี้)

  // ── มีเพลงนี้ในหน่วยความจำแล้ว = เล่นจากหน่วยความจำเลย ──
  const playing = bufFor || el.getAttribute('src');
  let savedPos = null;   // จำตำแหน่งของเพลงเก่าไปแล้วข้างบน — ข้างล่างห้ามเขียนทับด้วยเวลาเก่าของ <audio>
  if (decoded.has(src) || bufFor) {
    if (playing !== src) {
      if (playing) { filePos[playing] = bufFor ? bufPos() : (el.currentTime || 0); savedPos = playing; }
      start = fadeSec > FADE_IN ? FILE_VOL * SLOW_FROM : FADE_FLOOR;
      fileGain.gain.cancelScheduledValues(audioCtx().currentTime);
      fileGain.gain.setValueAtTime(start, audioCtx().currentTime);
    }
    if (decoded.has(src)) {
      if (bufFor !== src) {
        stopBuf();
        el.pause();
        startBuf(src, filePos[src] || 0);
      }
      fadeIn(fadeSec, start);
      return;
    }
    stopBuf();   // เพลงเก่าเล่นจากหน่วยความจำ เพลงใหม่ยังไม่ได้ถอด — หยุดตัวเก่า ไปทาง <audio> ข้างล่าง
  }
  // ตั้ง src ใหม่เฉพาะตอนเปลี่ยนเพลงจริง ๆ ไม่งั้นกลับมาหน้าแรกทีไรเพลงจะเริ่มใหม่หมด
  const old = el.getAttribute('src');
  if (old !== src) {
    if (old && old !== savedPos) filePos[old] = el.currentTime || 0;
    el.setAttribute('src', src);
    el.load();
    // เล่นต่อจากจุดที่ค้างไว้ (ต้องรอให้รู้ความยาวไฟล์ก่อนถึงตั้งตำแหน่งได้)
    const at = filePos[src];
    if (at) {
      el.addEventListener('loadedmetadata', () => {
        try { el.currentTime = at % (el.duration || Infinity); } catch { /* ยังเลื่อนไม่ได้ */ }
      }, { once: true });
    }
    // สลับเพลงกลางทาง ไล่เสียงขึ้นจากเบาใหม่ — ไม่งั้นเพลงใหม่โผล่มาเต็มเสียงทันที
    start = fadeSec > FADE_IN ? FILE_VOL * SLOW_FROM : FADE_FLOOR;
    fileGain.gain.cancelScheduledValues(audioCtx().currentTime);
    fileGain.gain.setValueAtTime(start, audioCtx().currentTime);
  }
  // ── เริ่มหรี่ขึ้นตอนเพลงเริ่มดังจริง ไม่ใช่ตอนสั่ง ──
  // ไฟล์ใหม่ต้องโหลดก่อน (บนมือถืออาจเกินวินาที) ถ้าเริ่มนับตั้งแต่สั่ง ช่วงหรี่ขึ้นจะหมดไปกับการรอโหลด
  if (el.paused || el.readyState < 3) {
    const token = fadeToken;
    el.addEventListener('playing', () => { if (token === fadeToken) fadeIn(fadeSec, start); }, { once: true });
  } else {
    fadeIn(fadeSec, start);
  }
  el.play().catch(retryFileOnGesture);

  // ── ถอดรหัสเบื้องหลัง แล้วสลับไปเล่นจากหน่วยความจำต่อตำแหน่งเดิม ──
  const token = fadeToken;
  decodeSong(src).then(() => {
    if (token !== fadeToken || !fileWanted || el.getAttribute('src') !== src || bufFor === src) return;
    const ac = audioCtx();
    const lead = 0.05;
    startBuf(src, (el.currentTime || 0) + lead, ac.currentTime + lead);
    setTimeout(() => { if (bufFor === src) el.pause(); }, lead * 1000 + 15);
  }).catch(() => { /* ถอดไม่ได้ (เครื่องหน่วยความจำไม่พอ ฯลฯ) = เล่นด้วย <audio> ต่อไป */ });
}

/**
 * "จุดติด" ไฟล์เพลงหนึ่งครั้งในจังหวะที่ผู้ใช้แตะจอ
 *
 * iOS ปลดล็อกไฟล์เสียงเป็นราย ๆ ไฟล์ ไฟล์ที่ไม่เคยถูกเล่นในจังหวะที่แตะจอ
 * จะถูกปฏิเสธเมื่อสั่งเล่นจากตัวจับเวลาทีหลัง (ซึ่งคือตอนคลิปเปิดเกมจบเอง)
 * สั่งเล่นแล้วหยุดทันทีตั้งแต่ตอนแตะครั้งแรก ทุกคำสั่งหลังจากนั้นจึงผ่านตลอด
 * ระดับเสียงของไฟล์ยังเป็นศูนย์อยู่ตอนนี้ จึงไม่มีใครได้ยินการจุดติด
 */
let primed = false;
export function primeMusicFile() {
  if (primed || fileFailed) return;
  const src = FILE_TRACKS.home;
  if (!src) return;
  primed = true;
  try {
    const el = ensureFileEl();
    // มีเพลงไฟล์เล่นอยู่แล้ว (เช่นเพลงบ้านลูกเหมียว) = ไฟล์ปลดล็อกไปแล้ว ไม่ต้องจุดติดซ้ำ
    // ห้ามสลับ src เด็ดขาด — เคยเจอ: จุดติดครั้งแรกโดนปฏิเสธ แล้วมาลองใหม่ตอนผู้เล่นพิมพ์ชื่อน้อง
    // ในห้อง ตัวจุดติดสลับไฟล์เป็นเพลงหน้าแรกทับเพลงห้องที่กำลังเล่นอยู่
    if (fileWanted || !el.paused) return;
    if (el.getAttribute('src') !== src) {
      el.setAttribute('src', src);
      el.load();
    }
    const p = el.play();
    if (p && p.then) {
      p.then(() => {
        if (fileWanted) return;   // ระหว่างนั้นมีคำสั่งเล่นจริงแล้ว ห้ามไปหยุด
        el.pause();
        try { el.currentTime = 0; } catch { /* ยังไม่มีข้อมูลไฟล์ */ }
      }).catch(() => { primed = false; });
    }
  } catch {
    primed = false;
  }
}

/**
 * หรี่ลงจนเงียบก่อนค่อย pause จริง
 * ต้อง pause ด้วย ไม่ใช่หรี่เฉย ๆ ไม่งั้นเพลงยังเดินอยู่เบื้องหลังแล้วกลับมา
 * หน้าแรกอีกทีจะพบว่าข้ามไปไกลกว่าที่ควร แถมยังกินแบนด์วิดท์ฟรี ๆ
 */
function stopFile() {
  fileWanted = false;
  if (!bufSrc && (!fileEl || fileEl.paused)) return;
  const my = ++fadeToken;
  fadeOut();
  setTimeout(() => {
    // เช็คโทเคนก่อน เผื่อระหว่างหรี่มีคำสั่งเล่นใหม่แทรกเข้ามา
    if (my !== fadeToken) return;
    if (bufSrc) { filePos[bufFor] = bufPos(); stopBuf(); }   // จำตำแหน่ง กลับมาเล่นต่อจากเดิม
    if (fileEl) fileEl.pause();
  }, FADE_OUT * 1000 + 60);
}

/** เวลาที่ใช้หรี่ตอนสั่งหยุด — สั้นพอให้รู้สึกว่า "หยุดทันที" แต่ยังไม่มีเสียงป๊อก */
const STOP_FADE = 0.06;

let master = null;
let timer = null;
let loopStart = 0;      // เวลาของ AudioContext ที่ลูปรอบปัจจุบันเริ่ม
let bookedTo = 0;       // จองโน้ตไว้ถึงเวลานี้แล้ว (pump จองต่อจากตรงนี้)
const AHEAD = 6;        // จองล่วงหน้ากี่วินาที — pump ทุก 2 วิ จึงมีโน้ตรอไว้อย่างน้อย 4 วิเสมอ
/** เริ่มลูปใหม่ที่เวลา t (เปลี่ยนเพลง / เริ่มเพลง) */
function restartLoop(t) { loopStart = bookedTo = t; }
/** ความยาวลูปของเพลง (บีต) = ชั้นที่ยาวที่สุด — เพลงเดิมทุกเพลง 32 บีต (LOOP_BEATS) */
function loopBeats(L) { return L.beats || (L.beats = Math.max(...L.map((l) => l.notes.beats || LOOP_BEATS))); }
let track = 'main';
let booked = [];        // โน้ตที่จองไว้แล้ว เก็บไว้เพื่อยกเลิกตอนสลับเพลง

/** เล่นโน้ตหนึ่งตัว (sec = ความยาวเป็นวินาที · vel = น้ำหนักโน้ต × ความดังรวมของเพลง) */
function voice(freq, at, sec, v, vel = 1) {
  const ac = audioCtx();
  if (Array.isArray(freq)) { for (const f of freq) voice(f, at, sec, v, vel); return; }   // คอร์ด
  if (v.inst) {
    for (const node of INST[v.inst](ac, freq, at, sec, v.vol * vel, master)) booked.push({ osc: node, at });
    return;
  }
  const { type, attack, release, len = 0, drop = 0, dropT = 0.08 } = v;
  const vol = v.vol * vel;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  // len = เสียงตี (กลอง/ไม้เคาะ) ดังสั้นเท่านี้ ไม่ว่าโน้ตจะยาวกี่บีต
  const dur = len ? Math.min(len, sec) : sec;

  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  // drop = ระดับเสียงไถลงเร็ว ๆ หลังตี → หนังกลอง/เนื้อไม้ "ตุ้ม" "ป๊อก" แทนที่จะเป็นโน้ตนิ่ง
  if (drop) osc.frequency.exponentialRampToValueAtTime(freq * drop, at + Math.min(dropT, dur));

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

  // เพลงที่เล่นจากไฟล์ กับช่วงที่ตั้งใจให้เงียบ ไม่ต้องจองโน้ตอะไรเลย
  // ต้องดัน loopStart ตามเวลาปัจจุบันไว้ด้วย ไม่งั้นพอสลับกลับไปเพลงสังเคราะห์
  // มันจะเห็นว่า loopStart ค้างอยู่ในอดีตแล้วจองโน้ตย้อนหลังรัวเป็นพันตัว
  if (track === SILENT || fileFor(track)) {
    restartLoop(ac.currentTime);
    return;
  }

  // ── จองทีละช่วง (AHEAD วิข้างหน้า) ไม่ใช่ทั้งลูปทีเดียว ──
  // เพลงที่ใช้เครื่องดนตรี (INST) สร้างหลายปมต่อโน้ต ลูปละหลายพันปม ถ้าจองรวดเดียวจะกระตุกบนมือถือ
  // จองทีละไม่กี่วินาทีงานกระจายเท่า ๆ กันทุกรอบ pump · จังหวะยังตรงเพราะยึดนาฬิกา AudioContext เหมือนเดิม
  const L = TRACKS[track];
  const beat = 60 / (L.bpm || BPM), loopDur = loopBeats(L) * beat, k = L.gain || 1;
  const now = ac.currentTime, horizon = now + AHEAD;
  while (loopStart + loopDur < now) loopStart += loopDur;   // แท็บหลับนาน ๆ — ข้ามลูปที่ผ่านไปแล้ว ไม่จองย้อนหลัง
  if (bookedTo < loopStart) bookedTo = loopStart;
  while (bookedTo < horizon) {
    const loopEnd = loopStart + loopDur, end = Math.min(horizon, loopEnd);
    for (const layer of L) {
      for (const n of layer.notes) {
        const t = loopStart + n.at * beat;
        if (t >= bookedTo && t < end && t > now - 0.02) voice(n.freq, t, n.beats * beat, layer.voice, n.vel * k);
      }
    }
    bookedTo = end;
    if (end >= loopEnd) loopStart = loopEnd;
  }

  // ทิ้งอ้างอิงของโน้ตที่เล่นจบไปแล้ว ไม่งั้น array โตไม่หยุด
  booked = booked.filter((b) => b.at > now - 8);
}

/**
 * ── ตอนนี้ "ควร" มีเพลงอยู่ไหม ──
 *
 * ต่างจาก timer ที่บอกว่า "เพลงกำลังเล่นอยู่จริงไหม" — ตัวนี้คือความตั้งใจของเกม
 * จำเป็นเพราะคำสั่งเริ่มเพลงอาจต้องรอเสียงตื่นก่อน แล้วระหว่างที่รออยู่นั้น
 * เกมอาจเปลี่ยนใจไปแล้ว (เช่นคลิปเปิดเกมสั่งหยุดเพลงหน้าแรก)
 *
 * เคยไม่มีตัวนี้แล้วเจอจริง: กดเข้าเกมบนมือถือ → เพลงหน้าแรกถูกสั่งเล่นตอนเสียงยังไม่ตื่น
 * → คลิปเริ่มแล้วสั่งหยุดเพลง (ซึ่งยังไม่ได้เริ่ม จึงไม่มีอะไรให้หยุด)
 * → พอเสียงตื่น คิวเก่าก็เริ่มเพลงหน้าแรกขึ้นมาทับเพลงของคลิป = สองเพลงดังพร้อมกัน
 * บนคอมไม่เจอเพราะเสียงตื่นทันทีที่คลิกแรก คิวจึงไม่เคยค้างข้ามจังหวะ
 */
let wanted = false;
let queued = false;
let retry = 0;
/** ตอนนี้ตั้งใจให้เพลงเล่นอยู่ไหม (startMusic แล้วยังไม่ stopMusic) — main.js ใช้จำสถานะก่อนสลับแอป */
export const musicIsWanted = () => wanted;

/** เรียกซ้ำได้ ครั้งที่สองเป็นต้นไปไม่ทำอะไร */
export function startMusic() {
  wanted = true;
  if (timer) return;

  // ── ยังไม่ตื่น: ฝากไว้ก่อน แล้วค่อยเริ่มเองตอนเสียงตื่น ──
  // ห้ามเรียก audioCtx() ตรงนี้ เพราะเท่ากับสร้างระบบเสียงตั้งแต่ยังไม่มีใครแตะจอ
  // ซึ่ง iOS ไม่ยอม (ดู liveCtx ใน audio.js)
  if (!audioLive()) {
    if (queued) return;
    queued = true;
    whenAudioAwake(() => {
      queued = false;
      if (wanted) startMusic();   // ระหว่างรอมีคนสั่งหยุดไปแล้วก็จบตรงนี้
    });
    // ── ตาข่ายกันพลาด ──
    // คิวข้างบนอาศัยว่ามีใครสักคนบอกเราว่า "เสียงตื่นแล้ว" ซึ่งถ้าพลาดไปทางใดทางหนึ่ง
    // (เบราว์เซอร์บางตัวเปลี่ยนสถานะช้ากว่าที่ตอบกลับมา) เพลงจะไม่ดังทั้งเกม
    // และไม่มีอะไรบนจอบอกเลยว่าเกิดอะไรขึ้น — เจอมาแล้วสองรอบ
    // จึงถามเองซ้ำทุกวินาทีครึ่ง จนกว่าจะได้เล่นจริงหรือมีคนสั่งหยุด
    clearInterval(retry);
    retry = setInterval(() => {
      if (!wanted || timer) { clearInterval(retry); retry = 0; return; }
      if (audioLive()) { clearInterval(retry); retry = 0; startMusic(); }
    }, 1500);
    return;
  }

  const ac = audioCtx();

  // MUSIC_VOL คือระดับเพลง "เทียบกับเสียงเอฟเฟกต์" ส่วนระดับเสียงรวม
  // อยู่ที่ปมของ audio.js ปลายทาง จึงไม่ต้องรู้เรื่องปิดเสียงตรงนี้เลย
  master = ac.createGain();
  master.gain.value = MUSIC_VOL;
  master.connect(musicOut());

  restartLoop(ac.currentTime + 0.15);
  // เพลงตอนเปิดหน้าแรกเป็นไฟล์ ต้องสั่งเล่นตรงนี้ด้วย — setMusicTrack() ที่ถูกเรียก
  // ไปก่อนหน้านี้ตอน reset() ยังทำอะไรไม่ได้ เพราะ master ยังไม่มี
  const f = fileFor(track);
  if (f) playFile(f);
  else stopFile();
  pump();
  timer = setInterval(pump, 2000);
}

/**
 * หยุดเพลง — เรียกซ้ำได้ ครั้งที่สองเป็นต้นไปไม่ทำอะไร
 *
 * ── ทำไมต้องหยุดจริง ไม่ใช่หรี่ลงเป็นศูนย์ ──
 * หรี่ไว้แล้วตัวจับจังหวะยังเดินต่อ มันจะจองโน้ตล่วงหน้าทุกสองวินาทีไปเรื่อย ๆ
 * ทั้งที่ไม่มีใครได้ยิน แล้วตอนเปิดคืนเพลงจะอยู่กลางท่อนที่ไหนก็ไม่รู้
 * หยุดจริงแล้ว startMusic() จะเริ่มลูปใหม่จากหัวเพลง ซึ่งเป็นจุดที่ฟังดีที่สุด
 *
 * ── ลำดับในนี้สำคัญ ──
 * หรี่ก้อนรวมลงก่อนแล้วค่อยสั่ง oscillator หยุดตามหลัง ถ้าสั่งหยุดทันที
 * มันจะตัดคลื่นกลางลูกแล้วได้เสียง "ป๊อก" พร้อมกันทุกเลเยอร์
 * (เหตุผลเดียวกับที่ setMusicTrack ปล่อยโน้ตที่กำลังดังอยู่ให้จบเอง)
 */
export function stopMusic() {
  // ยกเลิกความตั้งใจก่อนเป็นอันดับแรก คิวที่ค้างอยู่จะได้ไม่เริ่มเพลงขึ้นมาทีหลัง
  wanted = false;
  if (retry) { clearInterval(retry); retry = 0; }
  if (timer) { clearInterval(timer); timer = null; }
  stopFile();   // เพลงไฟล์หรี่ลงแล้ว pause ตัวเองอยู่แล้ว ไม่ต้องทำอะไรเพิ่ม

  if (!master) { booked = []; return; }

  const ac = audioCtx();
  const t = ac.currentTime;
  const dying = master;
  const notes = booked;
  // ตัดอ้างอิงทิ้งก่อนรอหรี่จบ ไม่งั้นถ้ามีคำสั่งเล่นแทรกเข้ามาระหว่างนี้
  // โน้ตใหม่จะไปต่อกับก้อนที่กำลังจะตาย แล้วหายไปพร้อมกัน
  master = null;
  booked = [];

  dying.gain.cancelScheduledValues(t);
  dying.gain.setValueAtTime(Math.max(0.0001, dying.gain.value), t);
  dying.gain.exponentialRampToValueAtTime(0.0001, t + STOP_FADE);
  for (const b of notes) {
    try { b.osc.stop(t + STOP_FADE + 0.02); } catch { /* หยุดไปแล้ว */ }
  }
  setTimeout(() => dying.disconnect(), (STOP_FADE + 0.15) * 1000);
}

/**
 * สลับเพลงให้ทันใจ
 * ยกเลิกเฉพาะโน้ตที่ "ยังไม่เริ่มเล่น" ส่วนตัวที่กำลังดังอยู่ปล่อยให้จบเอง
 * ถ้าตัดตัวที่กำลังดังด้วยจะได้เสียง "ป๊อก" ตรงรอยต่อทุกครั้ง
 */
/**
 * ชื่อพิเศษที่แปลว่า "ไม่ต้องมีเพลงเลย"
 *
 * มีไว้เพราะฉากห้องก่อนเริ่มวิ่งต้องเงียบสนิท เหลือแค่เสียงน้องแมวร้อง
 * ใช้เป็นชื่อเพลงชื่อหนึ่งแทนที่จะทำฟังก์ชัน stopMusic() แยก เพื่อให้ syncMusic()
 * ในเกมยังเป็น "จุดตัดสินใจเดียว" ที่บอกได้ว่าตอนนี้ควรได้ยินอะไร
 */
export const SILENT = 'none';

export function setMusicTrack(name) {
  if (name !== SILENT && !TRACKS[name]) return;
  if (name === track) return;
  const prev = track;
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

  // สลับระหว่างเพลงไฟล์กับเพลงสังเคราะห์ — ต้องปิดอีกฝั่งเสมอ ไม่งั้นซ้อนกันสองเพลง
  const f = fileFor(name);
  // เข้า/ออกบ้านลูกเหมียว: เพลงเริ่มเบาแล้วค่อย ๆ ดังขึ้นราว 3 วินาที (ทั้งเพลงห้องและเพลงหน้าแรกตอนกลับ)
  // ไม่ใช่ดังเต็มทันทีที่สลับฉาก
  const slow = name === 'room' || prev === 'room';
  if (f) playFile(f, slow ? ROOM_FADE_IN : FADE_IN);
  else stopFile();

  restartLoop(now + 0.05);
  pump();
}

/* setMusicMuted ถูกถอดออกแล้ว — ปิดเสียงเพลงคือ setMix('music', 0) ใน audio.js
   ซึ่งหรี่ทั้งเพลงและเอฟเฟกต์พร้อมกัน ไม่ต้องมีสองทางให้หลุดจากกัน */

// ─────────────────────────────────────────────────────────────
// ช่องสำหรับตรวจตอนพัฒนา — เนื้อเพลงสังเคราะห์ กับสถานะของเพลงไฟล์
//
// ต้องอยู่ "ท้ายไฟล์" เท่านั้น เคยวางไว้กลางไฟล์ตรงใต้ TRACKS แล้วพัง เพราะ
// target: FILE_VOL ถูกอ่านค่าทันทีตอนโมดูลเริ่มทำงาน ซึ่งตอนนั้น FILE_VOL
// ยังประกาศไม่ถึง → ReferenceError แล้วลามทำให้ main.js ที่ import ต่อตายทั้งไฟล์
// (อาการที่เห็นคือปุ่มทั้งหน้ากดไม่ได้เลย ไม่ใช่แค่เพลงไม่ดัง)
//
// ตัว <audio> สร้างด้วย new Audio() จึงไม่ได้อยู่ใน DOM หาจากหน้าเว็บไม่เจอ
// ต้องส่งออกมาทางนี้ถึงจะตรวจได้
// Vite ตัดทิ้งทั้งก้อนตอน build จริง ไม่หลุดไปอยู่ใน bundle
// ─────────────────────────────────────────────────────────────
if (import.meta.env.DEV) {
  // ทุกชั้นต้องจบที่ 32 บีตพอดี (LOOP_BEATS) — ชั้นที่สั้น/ยาวกว่าจะเพี้ยนสะสมทุกลูป
  for (const [name, layers] of Object.entries(TRACKS)) layers.forEach((l, i) => {
    const want = loopBeats(layers);
    if (Math.abs(l.notes.beats - want) > 1e-6) console.warn(`[music] ${name} ชั้น ${i} ยาว ${l.notes.beats} บีต (ต้อง ${want})`);
  });
  window.__tracks = TRACKS;
  window.__music = {
    get el() { return fileEl; },
    // เล่นจากหน่วยความจำอยู่ไหม + ตำแหน่ง (ตรวจการสลับจาก <audio> → AudioBuffer)
    get buffered() { return bufFor; },
    get bufPos() { return bufPos(); },
    get track() { return track; },
    get failed() { return fileFailed; },
    get running() { return Boolean(timer); },
    // ระดับเสียงจริงของเพลงไฟล์ ณ วินาทีนี้ — ใช้ตรวจว่าหรี่เข้า/ออกทำงานจริง
    // วัดจากเสียงรวมที่ปมไม่ได้ เพราะมีหางเพลงเก่ากับเสียงเอฟเฟกต์ปนอยู่
    get gain() { return fileGain ? fileGain.gain.value : null; },
    get target() { return FILE_VOL; },
  };
}
