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
import { audioCtx, audioOut } from './audio.js';

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


// ─────────────────────────────────────────────────────────────
// เพลงประจำแมพ — ฉากละเพลง สลับตอนไล่สีเปลี่ยนฉาก
//
// ทุกเพลงยังอยู่ในเพนทาโทนิก C ชุดเดียวกับเพลงอื่นทั้งเกม (กฎที่หัวไฟล์)
// สลับกลางคันตอนไหนก็ไม่หลุดคีย์ ซึ่งจำเป็นมากเพราะการเปลี่ยนฉากเกิดขึ้น
// กลางลูปเสมอ ไม่เคยตรงหัวเพลงพอดี
//
// ที่ทำให้แต่ละแมพฟังต่างกันจึงไม่ใช่คีย์ แต่เป็นสามอย่างนี้:
//   ช่วงเสียง   ต่ำ = อึดอัด/ลึก  สูง = โปร่ง/เบา
//   ความถี่โน้ต ถี่ = เร่ง/ซน     ห่าง = เวิ้งว้าง/สงบ
//   รูปคลื่น    square = คม  triangle = กลม  sine = นุ่ม
// ─────────────────────────────────────────────────────────────

// 🌙 ครัวกลางคืน — เดินเบา ๆ ย่องในครัวตอนดึก โน้ตสั้นห้วนแบบเดินเขย่งเท้า
const NIGHT_LEAD = [
  [E5, .5], [G5, .5], [E5, 1], [D5, .5], [C5, .5], [D5, 1],
  [E5, .5], [G5, .5], [A5, 1], [G5, 2],
  [C5, .5], [D5, .5], [E5, 1], [G5, .5], [E5, .5], [D5, 1],
  [C5, 2], [null, 2],

  [G5, .5], [A5, .5], [G5, 1], [E5, .5], [D5, .5], [E5, 1],
  [C5, .5], [E5, .5], [G5, 1], [A5, 2],
  [G5, .5], [E5, .5], [D5, 1], [C5, .5], [D5, .5], [E5, 1],
  [C5, 2], [null, 2],
];
const NIGHT_BASS = [C3, C3, A2, A2, F2, F2, G2, G2].flatMap((r) => [[r, 2], [null, 2]]);

// 🌻 สวนดอกไม้ — กลางวันสดใส เขบ็ตกระโดดขึ้นลงเหมือนผีเสื้อบิน
const GARDEN_LEAD = [
  [G5, .5], [C6, .5], [A5, .5], [G5, .5], [E5, .5], [G5, .5], [A5, 1],
  [C6, .5], [D6, .5], [C6, .5], [A5, .5], [G5, 1], [E5, 1],
  [D5, .5], [E5, .5], [G5, .5], [A5, .5], [C6, 1], [A5, 1],
  [G5, .5], [E5, .5], [D5, 1], [C5, 2],

  [C6, .5], [A5, .5], [G5, .5], [A5, .5], [C6, .5], [D6, .5], [E6, 1],
  [D6, .5], [C6, .5], [A5, .5], [G5, .5], [A5, 1], [C6, 1],
  [G5, .5], [A5, .5], [C6, .5], [A5, .5], [G5, 1], [E5, 1],
  [G5, .5], [E5, .5], [D5, 1], [C5, 2],
];
const GARDEN_BASS = [C3, A2, F2, G2, C3, A2, F2, G2].flatMap((r) => [
  [r, 1], [null, .5], [r, .5], [null, 2],
]);

// 🔮 ถ้ำคริสตัล — โน้ตห่าง ๆ ปล่อยให้เงียบเป็นช่วง ๆ ฟังแล้วรู้สึกว่ามีที่ว่างรอบตัว
const CAVERN_LEAD = [
  [C5, 2], [null, 1], [E5, 1],
  [G5, 2], [null, 2],
  [A5, 1], [G5, 1], [E5, 2],
  [D5, 2], [null, 2],

  [E5, 2], [null, 1], [G5, 1],
  [C6, 2], [null, 2],
  [A5, 1], [G5, 1], [E5, 2],
  [C5, 4],
];
const CAVERN_BASS = [C3, C3, F2, F2, A2, A2, G2, G2].flatMap((r) => [[r, 4]]);

// 🏖️ ชายหาด — โยกช้า ๆ ตามคลื่น โน้ตยาวเว้นจังหวะแบบเพลงชิล
const BEACH_LEAD = [
  [E5, 1.5], [G5, .5], [A5, 2],
  [G5, 1.5], [E5, .5], [D5, 2],
  [C5, 1.5], [E5, .5], [G5, 2],
  [A5, 1.5], [G5, .5], [E5, 2],

  [G5, 1.5], [A5, .5], [C6, 2],
  [A5, 1.5], [G5, .5], [E5, 2],
  [D5, 1.5], [E5, .5], [G5, 2],
  [E5, 1.5], [D5, .5], [C5, 2],
];
const BEACH_BASS = [C3, A2, F2, G2, C3, A2, F2, G2].flatMap((r) => [
  [r, 1.5], [null, .5], [r, 1], [null, 1],
]);

// 🚀 ห้วงอวกาศ — ช่วงเสียงกว้างมาก กระโดดข้ามคู่เสียงใหญ่ ฟังแล้วรู้สึกไร้พื้น
const SPACE_LEAD = [
  [C5, 1], [G5, 1], [E6, 2],
  [A5, 1], [D6, 1], [G5, 2],
  [E5, 1], [C6, 1], [A6, 2],
  [G5, 2], [D5, 2],

  [G5, 1], [E6, 1], [C6, 2],
  [D6, 1], [A5, 1], [E5, 2],
  [C6, 1], [G6, 1], [E5, 2],
  [D5, 2], [C5, 2],
];
const SPACE_PAD = [C4, C4, A3, A3, F4, F4, G4, G4].flatMap((r) => [[r, 4]]);
const SPACE_BASS = [C3, A2, F2, G2, C3, A2, F2, G2].flatMap((r) => [[r, 4]]);

// ❄️ ทุ่งหิมะ — ช่วงเสียงสูงล้วน โน้ตสั้นบาง ๆ เหมือนเกล็ดน้ำแข็งกระทบกัน
const SNOW_LEAD = [
  [C6, .5], [D6, .5], [E6, 1], [D6, .5], [C6, .5], [A5, 1],
  [G5, .5], [A5, .5], [C6, 1], [A5, 2],
  [E6, .5], [D6, .5], [C6, 1], [A5, .5], [G5, .5], [A5, 1],
  [G5, 2], [E5, 2],

  [G5, .5], [A5, .5], [C6, 1], [E6, .5], [D6, .5], [C6, 1],
  [D6, .5], [C6, .5], [A5, 1], [G5, 2],
  [C6, .5], [A5, .5], [G5, 1], [E5, .5], [G5, .5], [A5, 1],
  [G5, 2], [C6, 2],
];
const SNOW_BASS = [C3, C3, A2, A2, F2, F2, G2, G2].flatMap((r) => [[r, 3], [null, 1]]);

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

  // ── เพลงประจำแมพ ──
  // ระดับเสียง (vol) ของทุกเพลงตั้งใกล้เคียงกับ main เพื่อไม่ให้ดังกระโดด
  // ตอนวิ่งข้ามฉาก ซึ่งเกิดขึ้นกลางเกมโดยที่ผู้เล่นไม่ได้กดอะไรเลย
  night: [
    { notes: schedule(NIGHT_LEAD), voice: soft('triangle', 0.08, 0.02, 0.5) },
    { notes: schedule(NIGHT_BASS), voice: soft('sine', 0.08, 0.05, 0.85) },
  ],
  garden: [
    { notes: schedule(GARDEN_LEAD), voice: soft('triangle', 0.082, 0.012, 0.42) },
    { notes: schedule(GARDEN_BASS), voice: soft('sine', 0.072, 0.03, 0.6) },
  ],
  cavern: [
    // release ยาวมาก โน้ตจึงลากค้างในที่ว่างระหว่างตัว ให้ความรู้สึกก้องแบบในถ้ำ
    { notes: schedule(CAVERN_LEAD), voice: soft('sine', 0.085, 0.06, 1.6) },
    { notes: schedule(CAVERN_BASS), voice: soft('sine', 0.062, 0.25, 1.2) },
  ],
  beach: [
    { notes: schedule(BEACH_LEAD), voice: soft('triangle', 0.078, 0.05, 0.95) },
    { notes: schedule(BEACH_BASS), voice: soft('sine', 0.07, 0.06, 0.9) },
  ],
  space: [
    { notes: schedule(SPACE_LEAD), voice: soft('sine', 0.075, 0.1, 1.1) },
    { notes: schedule(SPACE_PAD), voice: soft('sine', 0.042, 0.7, 1.0) },
    { notes: schedule(SPACE_BASS), voice: soft('sine', 0.05, 0.3, 1.0) },
  ],
  snow: [
    { notes: schedule(SNOW_LEAD), voice: soft('triangle', 0.07, 0.01, 0.34) },
    { notes: schedule(SNOW_BASS), voice: soft('sine', 0.065, 0.05, 0.75) },
  ],
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
const FILE_TRACKS = {
  home: import.meta.env.BASE_URL + 'home-theme.mp3',
};

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
    if (track === 'home') { loopStart = ac.currentTime + 0.05; pump(); }
  });

  fileGain = ac.createGain();
  // เริ่มที่ศูนย์เสมอ แล้วค่อยหรี่ขึ้น — กันเสียงป๊อกตอนโน้ตแรกของเพลงดังขึ้นมา
  fileGain.gain.value = 0;
  ac.createMediaElementSource(fileEl).connect(fileGain);
  fileGain.connect(audioOut());
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
function fadeIn() {
  const ac = audioCtx();
  const g = fileGain.gain;
  const from = Math.max(FADE_FLOOR, g.value);
  g.cancelScheduledValues(ac.currentTime);
  g.setValueAtTime(from, ac.currentTime);
  g.exponentialRampToValueAtTime(FILE_VOL, ac.currentTime + FADE_IN);
}

/** หรี่ลงจนเงียบแบบเร็ว ๆ — linear พอ เพราะสั้นจนรูปทรงของเส้นไม่มีผลกับหู */
function fadeOut() {
  const ac = audioCtx();
  const g = fileGain.gain;
  g.cancelScheduledValues(ac.currentTime);
  g.setValueAtTime(g.value, ac.currentTime);
  g.linearRampToValueAtTime(0, ac.currentTime + FADE_OUT);
}

function playFile(src) {
  const el = ensureFileEl();
  fadeToken++;   // ยกเลิกคิวหยุดที่ค้างอยู่ ไม่งั้นมันจะมาหยุดเพลงที่เพิ่งสั่งเล่น
  // ตั้ง src ใหม่เฉพาะตอนเปลี่ยนเพลงจริง ๆ ไม่งั้นกลับมาหน้าแรกทีไรเพลงจะเริ่มใหม่หมด
  if (el.getAttribute('src') !== src) {
    el.setAttribute('src', src);
    el.load();
  }
  fadeIn();
  el.play().catch(() => { /* ยังไม่ได้ปลดล็อกเสียง เดี๋ยวรอบหน้าค่อยเล่น */ });
}

/**
 * หรี่ลงจนเงียบก่อนค่อย pause จริง
 * ต้อง pause ด้วย ไม่ใช่หรี่เฉย ๆ ไม่งั้นเพลงยังเดินอยู่เบื้องหลังแล้วกลับมา
 * หน้าแรกอีกทีจะพบว่าข้ามไปไกลกว่าที่ควร แถมยังกินแบนด์วิดท์ฟรี ๆ
 */
function stopFile() {
  if (!fileEl || fileEl.paused) return;
  const my = ++fadeToken;
  fadeOut();
  setTimeout(() => {
    // เช็คโทเคนก่อน เผื่อระหว่างหรี่มีคำสั่งเล่นใหม่แทรกเข้ามา
    if (my === fadeToken && fileEl) fileEl.pause();
  }, FADE_OUT * 1000 + 60);
}

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

  // เพลงที่เล่นจากไฟล์ กับช่วงที่ตั้งใจให้เงียบ ไม่ต้องจองโน้ตอะไรเลย
  // ต้องดัน loopStart ตามเวลาปัจจุบันไว้ด้วย ไม่งั้นพอสลับกลับไปเพลงสังเคราะห์
  // มันจะเห็นว่า loopStart ค้างอยู่ในอดีตแล้วจองโน้ตย้อนหลังรัวเป็นพันตัว
  if (track === SILENT || fileFor(track)) {
    loopStart = ac.currentTime;
    return;
  }

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

  // MUSIC_VOL คือระดับเพลง "เทียบกับเสียงเอฟเฟกต์" ส่วนระดับเสียงรวม
  // อยู่ที่ปมของ audio.js ปลายทาง จึงไม่ต้องรู้เรื่องปิดเสียงตรงนี้เลย
  master = ac.createGain();
  master.gain.value = MUSIC_VOL;
  master.connect(audioOut());

  loopStart = ac.currentTime + 0.15;
  // เพลงตอนเปิดหน้าแรกเป็นไฟล์ ต้องสั่งเล่นตรงนี้ด้วย — setMusicTrack() ที่ถูกเรียก
  // ไปก่อนหน้านี้ตอน reset() ยังทำอะไรไม่ได้ เพราะ master ยังไม่มี
  const f = fileFor(track);
  if (f) playFile(f);
  else stopFile();
  pump();
  timer = setInterval(pump, 2000);
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
  if (f) playFile(f);
  else stopFile();

  loopStart = now + 0.05;
  pump();
}

/* setMusicMuted ถูกถอดออกแล้ว — ปิดเสียงคือ setVolume(0) ที่ปมรวมใน audio.js
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
  window.__tracks = TRACKS;
  window.__music = {
    get el() { return fileEl; },
    get track() { return track; },
    get failed() { return fileFailed; },
    get running() { return Boolean(timer); },
    // ระดับเสียงจริงของเพลงไฟล์ ณ วินาทีนี้ — ใช้ตรวจว่าหรี่เข้า/ออกทำงานจริง
    // วัดจากเสียงรวมที่ปมไม่ได้ เพราะมีหางเพลงเก่ากับเสียงเอฟเฟกต์ปนอยู่
    get gain() { return fileGain ? fileGain.gain.value : null; },
    get target() { return FILE_VOL; },
  };
}
