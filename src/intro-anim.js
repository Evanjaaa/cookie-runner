// src/intro-anim.js
//
// ══ คลิปเปิดเกมที่วาดด้วยโค้ด ══════════════════════════════════════
//
// เรื่องย่อ (20.35 วินาที — ยาวเท่าเพลงประกอบพอดี):
//
//   องก์หนึ่ง ในปราสาท (0–13.4)
//   น้องส้มหมอบหลับ ฟองจมูกพองยุบ → กล้องซูมเข้าท้อง ท้องร้อง
//   → ฟองแตก ตื่นงัวเงีย ลุกขึ้น หาว → นั่งลูบท้อง → มองซ้าย มองขวา (?)
//   → ปิ๊ง (!) ย่อตัวส่ายก้น → กระโดดออกนอกจอ → แสงขาววาบเป็นรอยต่อ
//
//   องก์สอง นอกปราสาท (13.4–20.35)
//   ออกมาเดินเรื่อย ๆ กล้องแพลนตามจังหวะเดิน → ปลาทองว่ายเข้ามาพร้อมของกิน
//   → ยื่นให้ น้องดีใจ (!) → ปลาดึงคืน น้องเขย่งคว้าไม่ทัน (?)
//   → ปลาทำท่าล้อแล้วพุ่งขึ้นฟ้าหายออกนอกจอไปเลย (กล้องอยู่กับน้อง ไม่แพลนตามปลา)
//   → น้องไม่ยอมแพ้ วิ่งตามต่อ → แสงขาวสว่างเต็มจอ แล้วส่งต่อเข้าหน้าแรก
//
// ── ไม่มีตัวหนังสือในคลิปเลย ──
// ทุกอารมณ์เล่าด้วยสัญลักษณ์ (~ ? !) กับท่าทางเท่านั้น คนไม่อ่านไทยก็ดูรู้เรื่อง
// และสัญลักษณ์พวกนี้ฟอนต์ไหนก็หน้าตาใกล้กัน ถึงฟอนต์เกมยังโหลดไม่เสร็จก็ไม่เพี้ยน
//
// ── ทำไมวาดเองแทนวิดีโอ ──
//   คม     วาดใหม่ทุกเฟรมที่ความละเอียดจอจริง ซูมเข้าไปใกล้แค่ไหนเส้นก็ไม่แตก
//          (คลิปเดิมมีรายละเอียดจริงแค่ราว 540p ขยายขึ้นจอมือถือแล้วเบลอ)
//   เร็ว   ไม่มีไฟล์ให้โหลด เปิดปุ๊บขึ้นปั๊บ ไม่มีจังหวะค้างรอบัฟเฟอร์
//   พอดี   กล้องเลือกกรอบภาพเองตามสัดส่วนจอ ไม่ต้องเลือกระหว่าง "โดนตัด" กับ "ขอบดำ"
//
// ── โครง ──
// ทุกอย่างในคลิปคิดจาก "เวลาตั้งแต่เริ่ม" ตัวเดียว ไม่มีสถานะที่สะสมข้ามเฟรม
// เฟรมไหนหลุดก็แค่ข้ามไป ภาพกับเสียงไม่มีทางคลาดกันสะสม และกรอเวลาไปดูจุดไหนก็ได้
// (ท่าเดียวกับฉากในเกมที่ส่งเวลาเข้าไปในฟังก์ชันวาดตรง ๆ)
//
// หน่วยพิกัดของฉาก = หน่วยเดียวกับตัวเกม (VIEW 960x420) ของทุกชิ้นจึงหยิบมาวางได้เลย
// ─────────────────────────────────────────────────────────────
import { VIEW, GROUND_Y, BODY } from './config.js';
import { drawRoomScene } from './render/room/index.js';
import { drawKingdom } from './render/kingdom/index.js';
import { drawCatPose, drawPlayer, drawBigFish, drawShrimp, star4 } from './render/entities.js';
import { SKINS } from './skins.js';
import { REGIONS, pickSkin } from './paint.js';
import {
  sfx, playAudioFile, stopAudioFile, pauseAudioFile, resumeAudioFile,
  prepareAudioFile, setSfxRoute,
} from './audio.js';
import { loadPref, savePref } from './storage.js';

const { W, H } = VIEW;

/**
 * น้องส้ม — ตัวเอกของคลิป
 * ใช้สกินส้มตรง ๆ ไม่ใช่ getSkin() เพราะคลิปต้องเป็นตัวเดิมทุกเครื่อง
 * noPhoto กันรูปหน้าที่ผู้เล่นเคยอัปโหลด ไม่ให้ไปแปะทับหน้าน้องในคลิป
 */
const HERO = { ...SKINS.find((s) => s.id === 'orange'), noPhoto: true };

// ── ไฟล์เสียงของคลิป ────────────────────────────────────────
//
// สองไฟล์นี้เป็นเสียงที่อัดมา ต่างจากเสียงอื่นในเกมที่สังเคราะห์ด้วยโค้ดทั้งหมด
// ต่อผ่านช่องเสียงปกติ (ดู playAudioFile ใน audio.js) จึงหรี่/ปิดตามหน้าตั้งค่าเหมือนกัน

// ── เปิด/ปิดเสียงของคลิปทั้งก้อน ──
//
// แยกจากเสียงเพลงกับเอฟเฟกต์ของเกม (หน้าตั้งค่ามีสองอันนั้นอยู่แล้ว) เพราะเป็นคนละเรื่องกัน:
// คนที่อยากเปิดเสียงเกมแต่ไม่อยากให้คลิปดังทุกครั้งที่เข้าเกม ต้องปิดได้เฉพาะคลิป
// ปิดแล้วคลิปยังเล่นภาพตามปกติ แค่เงียบสนิททั้งเพลงและเสียงประกอบทุกจังหวะ
const SOUND_PREF = 'introSound';

export function introSoundEnabled() {
  return loadPref(SOUND_PREF, true) !== false;
}

export function setIntroSoundEnabled(on) {
  savePref(SOUND_PREF, !!on);
}

/**
 * โหลดไฟล์เสียงของคลิปรอไว้ล่วงหน้า — เรียกตอนเปิดเกม
 *
 * ── ทำไมต้องอุ่นด้วย "ตัวที่จะเล่นจริง" ──
 * เดิมอุ่นด้วย <audio> ลอย ๆ อีกตัวแล้วหวังให้แคชของเบราว์เซอร์ช่วยตอนเล่นจริง
 * ซึ่งได้ผลเกือบตลอด แต่ตัวที่เล่นจริงต้องเริ่มบัฟเฟอร์ใหม่อยู่ดี วัดแล้วครั้งแรก
 * ที่ยังไม่มีไฟล์ในแคช เพลงดังช้ากว่าภาพเกือบหกวินาที
 * อุ่นตัวเดียวกับที่จะเล่น มันจึงพร้อมเล่นทันทีตั้งแต่เฟรมแรกของคลิป
 *
 * ปิดเสียงคลิปไว้ = ไม่ต้องโหลดอะไรเลย ประหยัดเน็ตไป 0.65 MB
 */
export function prepareIntroSound() {
  if (!introSoundEnabled()) return;
  prepareAudioFile(MUSIC_SRC, 'intro');
  prepareAudioFile(HUNGRY_SRC, 'intro');
}

/** เพลงประกอบคลิป — ไฟล์ยาว 20.5 วินาที แต่คลิปยาว 13.6 จึงไม่ได้ฟังจนจบเพลง
    เริ่มพร้อมเฟรมแรก แล้วหรี่จบพร้อมแสงขาวตอนปิดคลิป ไม่ได้ตัดห้วน */
const MUSIC_SRC = import.meta.env.BASE_URL + 'Music.mp3';
/** ดังพอได้ยินชัดแต่ไม่กลบเสียงน้อง — เสียงท้องร้องกับเสียงหาวต้องยังเด่นกว่าเพลง */
const MUSIC_VOL = 0.5;

/** เสียงท้องร้อง — ไฟล์ยาว 1.07 วินาที
    จังหวะยาวในคลิป 1.35 วินาที (ไฟล์จบก่อนนิดหน่อย ปล่อยให้จบเอง)
    จังหวะสั้น 0.55–0.6 วินาที (ไฟล์ยาวเกิน ต้องหรี่ตัดให้จบพร้อมภาพที่หยุดสั่น) */
const HUNGRY_SRC = import.meta.env.BASE_URL + 'Hungry.mp3';
const HUNGRY_VOL = 0.95;

/**
 * เสียงท้องร้องหนึ่งครั้ง
 * ใช้ไฟล์จริงก่อน ถ้าเล่นไม่ได้ (ไฟล์หาย/ปิดเสียง/ยังไม่ปลดล็อก) ถอยไปใช้เสียงสังเคราะห์ตัวเดิม
 * คลิปจึงไม่มีทางเงียบผิดจังหวะ ไม่ว่าไฟล์จะโหลดทันหรือไม่
 */
function growlSound(dur, small = false) {
  if (playAudioFile(HUNGRY_SRC, { ch: 'intro', vol: small ? HUNGRY_VOL * 0.85 : HUNGRY_VOL, dur })) return;
  if (small) sfx.tummySmall();
  else sfx.tummy();
}

/** ตำแหน่งกับขนาดน้องบนพรม — ค่าเดียวกับที่เกมวาดน้องในห้อง (ดู drawRoom ใน game.js) */
const CAT = { x: W * 0.5, feet: GROUND_Y, scale: 2.6 };

// ── ตารางเวลา (วินาที) ───────────────────────────────────────
// แก้จังหวะทั้งคลิปได้ที่ตารางนี้ที่เดียว ท่า กล้อง สัญลักษณ์ และเสียง อ่านจากตัวเลขชุดเดียวกัน
const T = {
  fadeIn: 0.9,          // จางจากจอดำ
  snore: [0.7, 2.1],    // เสียงกรน ตรงกับจังหวะฟองจมูกพอง
  zoomAt: 2.7,          // กล้องพุ่งเข้าท้อง
  zoomDur: 0.55,        // สั้นโดยตั้งใจ — อ่านเป็น "กล้องตัดไปที่ท้อง" ไม่ใช่เลื่อนชมวิว
  growl1: 3.55,         // ท้องร้องยาว
  growl1Dur: 1.35,
  growl2: 5.45,         // ท้องร้องสั้น
  growl2Dur: 0.6,
  pullAt: 6.15,         // ถอยกล้องออกให้เห็นทั้งตัว
  pullDur: 0.7,
  pop: 6.3,             // ฟองจมูกแตก = ตื่น
  standAt: 6.55,        // ลุกจากท่าหมอบ
  standDur: 0.7,
  blinks: [7.3, 7.55],  // กะพริบตาปรือสองที
  yawnAt: 7.7,
  yawnDur: 1.25,
  rubAt: 9.05,          // นั่งลูบท้อง
  rubDur: 1.45,
  rubGrowl: 9.35,       // ท้องร้องเบา ๆ ระหว่างลูบ
  rubGrowlDur: 0.55,
  lookAt: 10.5,         // ? มองซ้าย แล้วมองขวา
  ideaAt: 11.8,         // ! ปิ๊ง
  crouchAt: 12.05,      // ย่อตัวส่ายก้น
  jumpAt: 12.68,        // กระโดด
  jumpDur: 0.62,

  // ── องก์สอง: นอกปราสาท ──
  // flash = แสงขาวรอยต่อ (คนละดวงกับแสงปิดคลิปตอนจบ) ใช้กลบจังหวะเปลี่ยนฉากในบ้าน→นอกบ้าน
  flash: 12.92,
  outside: 13.38,       // ฉากนอกบ้านจางเข้าจากขาว เริ่มเดิน
  fishIn: 15.9,         // ปลาทองว่ายเข้ามาจากขวา
  offer: 16.75,         // ยื่นของกินให้
  happy: 16.95,         // น้องดีใจ (!)
  pull: 17.55,          // ปลาดึงของกินคืน
  reach: 17.78,         // น้องเขย่งคว้า
  miss: 18.05,          // คว้าไม่ทัน (?)
  tease: 18.35,         // ปลาทำท่าล้อ
  flee: 18.8,           // ปลาพุ่งขึ้นฟ้า กล้องแพลนตาม
  chase: 19.38,         // น้องวิ่งตามต่อ
  shineAt: 19.82,       // แสงขาวปิดคลิปเริ่มบาน
  end: 20.35,           // ขาวเต็มจอ — ส่งต่อให้หน้าแรกจางออกจากสีขาว (เพลงยาว 20.47)
};
export const INTRO_ANIM_LENGTH = T.end;

// ── องก์สอง ────────────────────────────────────────────────
//
// ฉากนอกบ้านใช้ "ฉากปราสาท" ชุดเดียวกับล็อบบี้ (drawKingdom) ซึ่งเลื่อนฉากได้ด้วย worldX
// น้องจึงอยู่กับที่บนจอแล้วให้ฉากไหลผ่าน — ท่าเดียวกับตอนวิ่งจริงในเกม
// กล้องที่ "แพลนตาม" จึงคือฉากที่เลื่อน ไม่ใช่กล้องที่ขยับจริง

/** น้องยืนค้างที่นี่ตลอดองก์สอง เยื้องซ้ายไว้ให้เห็นทางข้างหน้าที่กำลังจะเดินไป */
const OUT_CAT_X = 300;
/** ตัวคูณขนาดของ drawPlayer — ให้ตัวโตใกล้เคียงกับตอนอยู่ในห้อง (CAT.scale 2.6) */
const OUT_SCALE = 2.15;

/**
 * ระยะทางที่เดินไปแล้ว (หน่วยฉาก) — เป็นคีย์เฟรมแทนความเร็ว
 *
 * ── ทำไมเก็บเป็นระยะ ไม่ใช่ความเร็ว ──
 * ถ้าเก็บความเร็วแล้วบวกสะสมทุกเฟรม เฟรมที่หายไปจะทำให้ระยะคลาดกันสะสม
 * และกรอเวลาไปดูกลางคลิปไม่ได้ ระยะแบบคีย์เฟรมให้ภาพเดิมเสมอไม่ว่าจะมาถึงยังไง
 *
 * ช่วงราบ = หยุดยืนคุยกับปลา / ช่วงชัน = วิ่ง
 */
const WALK = [
  [T.outside, 0],
  [T.fishIn, 250],       // เดินเรื่อย ๆ
  [T.offer, 288],        // ชะลอลงตอนปลาเข้ามา
  [T.pull, 300],         // หยุดมองของกิน
  [T.chase, 300],        // ค้างไว้ตลอดช่วงโดนแกล้ง
  [T.end, 560],          // ออกวิ่งตามปลา
];
const walkDist = (t) => keys(t, WALK);

/** เส้นทางของปลาทอง (พิกัดฉาก) — เข้าจากขวา ลอยอยู่หน้าน้อง แล้วพุ่งขึ้นฟ้าทางขวาบน */
const FISH_X = [
  [T.fishIn, 880], [T.offer, 470], [T.pull, 478], [T.tease, 466],
  [T.flee, 486], [T.chase, 600], [T.end, 700],
];
// ── ลงมากวนให้ต่ำ แล้วหนีขึ้นให้พ้นจอไปเลย ──
// ช่วงกวน: ลอยระดับหัวน้อง (หัวอยู่ราว y=221) จึงอ่านเป็น "มาหยอกถึงหน้า" ไม่ใช่ลอยอยู่ไกล ๆ
// ช่วงหนี: พุ่งขึ้นเลยขอบบนของฉาก (y ติดลบ) หายออกนอกจอไปจริง ๆ ไม่ค้างเป็นจุดบนฟ้า
const FISH_Y = [
  [T.fishIn, 196], [T.offer, 222], [T.pull, 190], [T.tease, 200],
  [T.flee, 196], [T.chase, -90], [T.end, -220],
];
/** ขนาดปลา — ตัวใหญ่เต็มตาตอนมากวน แล้วเล็กลงนิดเดียวตอนพุ่งหนี (หายเพราะพ้นจอ ไม่ใช่เพราะหด) */
const FISH_R = [[T.fishIn, 42], [T.offer, 50], [T.flee, 50], [T.chase, 38], [T.end, 32]];

export const INTRO_ACT2_AT = T.outside;

// ─────────────────────────────────────────────────────────────
// ตัวช่วยคณิต
// ─────────────────────────────────────────────────────────────
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, k) => a + (b - a) * k;
/** ช่วงเวลา → 0..1 */
const span = (t, from, dur) => clamp01((t - from) / dur);
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeIn = (k) => k * k * k;
/** เลยเป้าไปนิดแล้วเด้งกลับ — ให้การซูมกับสัญลักษณ์มีแรงกระแทกแบบการ์ตูน */
const easeOutBack = (k) => {
  const c = 1.35;
  return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
};
/** ขึ้นเร็ว ค้าง แล้วลงเร็ว — ใช้กับของที่โผล่แล้วหายในช่วงเวลาหนึ่ง */
const envelope = (t, from, dur, attack = 0.12, release = 0.25) => {
  if (t < from || t > from + dur) return 0;
  return Math.min(clamp01((t - from) / attack), clamp01((from + dur - t) / release));
};
/**
 * ค่าตามคีย์เฟรม [[เวลา, ค่า], ...] ไล่ระหว่างคีย์แบบนุ่มหัวท้าย
 * ก่อนคีย์แรกและหลังคีย์สุดท้ายค้างค่าไว้
 */
function keys(t, list) {
  if (t <= list[0][0]) return list[0][1];
  for (let i = 1; i < list.length; i++) {
    const [t1, v1] = list[i];
    if (t <= t1) {
      const [t0, v0] = list[i - 1];
      return lerp(v0, v1, easeInOut((t - t0) / (t1 - t0 || 1)));
    }
  }
  return list[list.length - 1][1];
}

// ─────────────────────────────────────────────────────────────
// ท่าทางของน้องตามเวลา
//
// ── ทำไมผสมค่าท่าเอง ไม่ใช้ชื่อท่าสำเร็จ ──
// ท่าสำเร็จในเกม (loaf, knead, wiggle ...) เปลี่ยนจากท่าหนึ่งไปอีกท่าได้ทางเดียว
// คือคลายกลับเป็นท่ายืนก่อน น้องจะลุกยืนแว้บหนึ่งทุกครั้งที่เปลี่ยนท่า
// ส่งค่าผสมเอง (idle.shape ใน drawCatPose) จึงไหลจากหมอบ → ยืน → นั่งลูบท้อง
// → ย่อตัว ได้ต่อเนื่องเป็นการเคลื่อนไหวเดียว
// ─────────────────────────────────────────────────────────────
const S1 = T.standAt + T.standDur;
const Y0 = T.yawnAt;
const Y1 = T.yawnAt + T.yawnDur;
const R0 = T.rubAt;
const R1 = T.rubAt + T.rubDur;
const L = T.lookAt;
const C = T.crouchAt;
const J = T.jumpAt;

const TRACK = {
  loaf: [[0, 1], [T.standAt, 1], [S1, 0]],
  // หาว: อ้าปากค้างแล้วค่อยหุบ
  mouth: [[0, 0], [Y0, 0], [Y0 + 0.3, 1], [Y1 - 0.3, 1], [Y1, 0]],
  // นั่งตั้งแต่ลูบท้องจนก่อนย่อตัว
  sit: [[0, 0], [R0 - 0.1, 0], [R0 + 0.35, 1], [C, 1], [C + 0.3, 0]],
  // ลูบท้อง = ท่านวดแป้ง สองอุ้งเท้ากดสลับกันบนท้องพอดี
  knead: [[0, 0], [R0, 0], [R0 + 0.4, 1], [R1 - 0.3, 1], [R1, 0]],
  crouch: [[0, 0], [C, 0], [C + 0.3, 1], [J - 0.04, 1], [J + 0.06, 0]],
  // หูลู่นิด ๆ ตอนงัวเงีย ตั้งขึ้นตอนตื่นเต็มตา แล้วลู่อีกทีตอนเล็งกระโดด
  ear: [[0, 0], [T.pop, 0], [T.pop + 0.4, 0.55], [R1, 0.55], [L, 0], [C, 0], [C + 0.3, 0.85], [J + 0.06, 0]],
  // เอียงหัวตอนหาว และเอียงตามทางที่มองตอนมองซ้ายขวา
  tilt: [[0, 0], [Y0, 0], [Y0 + 0.3, -0.12], [Y1 - 0.3, -0.12], [Y1, 0],
    [L, 0], [L + 0.2, -0.13], [L + 0.55, -0.13], [L + 0.8, 0.13], [L + 1.1, 0.13], [L + 1.3, 0]],
  gaze: [[0, 0], [L, 0], [L + 0.2, -1], [L + 0.55, -1], [L + 0.8, 1], [L + 1.1, 1], [L + 1.3, 0]],
};
const track = (t, name) => keys(t, TRACK[name]);

function poseAt(t) {
  const crouch = track(t, 'crouch');
  const shape = {
    loaf: track(t, 'loaf'),
    sit: track(t, 'sit'),
    knead: track(t, 'knead'),
    mouth: track(t, 'mouth'),
    crouch,
    sway: crouch,
    ear: track(t, 'ear'),
    tilt: track(t, 'tilt'),
  };

  // ── ตา ──
  //   หลับ → ตาปรืองัวเงีย (กะพริบช้า ๆ หลับตาตอนหาว) → ลืมตาเต็ม → ตาเป็นประกายตอนปิ๊ง
  //   → ตาจ้องตอนเล็ง → ยิ้มตอนกระโดด
  let mood = '';
  let blink = false;
  if (t < T.pop) {
    blink = true;
  } else if (t < L) {
    mood = 'tired';
    blink = T.blinks.some((b) => t >= b && t < b + 0.12) || (t > Y0 + 0.2 && t < Y1 - 0.15);
  } else if (t >= T.ideaAt && t < C) {
    mood = 'starry';
  } else if (t >= J) {
    mood = 'happy';
  }
  return { shape, k: 1, mood, blink, gaze: track(t, 'gaze') };
}

/** ทางกระโดด — โค้งพุ่งขึ้นไปทางขวาจนพ้นกรอบ กล้องไม่ตาม */
const JUMP_X = 600;
const jumpY = (p) => -(560 * p - 180 * p * p);
function jumpAt(t) {
  const p = span(t, T.jumpAt, T.jumpDur);
  return {
    p,
    dx: JUMP_X * p,
    dy: jumpY(p),
    // ยืดตัวตอนพุ่งออก แล้วคืนทรงกลางอากาศ
    stretch: t >= T.jumpAt ? Math.pow(1 - p, 2) : 0,
    rot: 0.45 * p,
  };
}

// ─────────────────────────────────────────────────────────────
// หาตำแหน่งท้องกับหน้า "จากภาพจริง"
//
// ── ทำไมไม่เขียนพิกัดตายตัว ──
// แต่ละท่าบีบยืดลำตัวแล้วเลื่อนหัวกับขาตามค่าที่จูนจากภาพ (ดู drawCatStand)
// คำนวณย้อนหาว่าท้องกับหน้าไปอยู่ตรงไหนต้องไล่ตามทุกขั้น และวันที่มีคนจูนท่าใหม่
// กล้องจะซูมพลาดท้อง สัญลักษณ์จะลอยห่างหัวไปทันทีโดยไม่มีใครรู้
//
// จึงวาดน้องอีกตัวลงผ้าใบซ่อนด้วย "จานสีรหัส" ของหน้าระบายสี (ทุกส่วนเป็นสีเฉพาะตัว)
// แล้วหาว่าพิกเซลสีครีมก้อนใหญ่สุดอยู่ตรงไหน = ท้อง / พิกเซลสีจมูก = หน้า
// ─────────────────────────────────────────────────────────────
function locate(idle) {
  const RES = 2;                       // วาดละเอียดสองเท่า ขอบก้อนจะได้ไม่หยาบ
  const cv = document.createElement('canvas');
  cv.width = W * RES;
  cv.height = H * RES;
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.scale(RES, RES);
  drawCatPose(c, CAT.x, CAT.feet, CAT.scale, pickSkin(), 0, idle);

  const code = (key) => parseInt(REGIONS.find((r) => r.key === key).pick.slice(1, 3), 16);
  const CREAM = code('cream');
  const NOSE = code('nose');
  const { data } = c.getImageData(0, 0, cv.width, cv.height);
  const w = cv.width;
  const h = cv.height;
  cv.width = 0;

  // ── ท้อง = ก้อนสีครีมที่ใหญ่ที่สุด ──
  // สีครีมมีหลายก้อน (ปาก ปลายหาง อุ้งเท้า) ต้องไล่เป็นก้อน ไม่ใช่เฉลี่ยทุกพิกเซล
  // ไม่งั้นจุดกลางจะโดนปากกับเท้าดึงออกนอกท้อง
  const seen = new Uint8Array(w * h);
  const isCode = (i, v) => data[i * 4 + 3] === 255 && data[i * 4] === v && data[i * 4 + 1] === 0;
  let best = null;
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || !isCode(i, CREAM)) continue;
    const blob = { n: 0, sx: 0, sy: 0, x0: w, x1: 0, y0: h, y1: 0 };
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const j = stack.pop();
      const x = j % w;
      const y = (j / w) | 0;
      blob.n++; blob.sx += x; blob.sy += y;
      blob.x0 = Math.min(blob.x0, x); blob.x1 = Math.max(blob.x1, x);
      blob.y0 = Math.min(blob.y0, y); blob.y1 = Math.max(blob.y1, y);
      for (const k of [j - 1, j + 1, j - w, j + w]) {
        if (k >= 0 && k < w * h && !seen[k] && isCode(k, CREAM)) { seen[k] = 1; stack.push(k); }
      }
    }
    if (!best || blob.n > best.n) best = blob;
  }

  let nx = 0, ny = 0, nn = 0;
  let fx0 = w, fx1 = 0, fy1 = 0;
  for (let i = 0; i < w * h; i++) {
    if (data[i * 4 + 3] !== 255) continue;
    const x = i % w;
    const y = (i / w) | 0;
    fx0 = Math.min(fx0, x); fx1 = Math.max(fx1, x); fy1 = Math.max(fy1, y);
    if (isCode(i, NOSE)) { nx += x; ny += y; nn++; }
  }

  // หาไม่เจอ (เช่นมีคนเปลี่ยนรหัสสี) ก็ยังเล่นได้ แค่ใช้ค่ากะด้วยตา
  const belly = best
    ? { x: best.sx / best.n / RES, y: best.sy / best.n / RES,
        rx: (best.x1 - best.x0) / 2 / RES, ry: (best.y1 - best.y0) / 2 / RES }
    : { x: CAT.x, y: CAT.feet - 36, rx: 24, ry: 20 };
  const face = nn ? { x: nx / nn / RES, y: ny / nn / RES } : { x: CAT.x, y: CAT.feet - 80 };
  return { belly, face, left: fx0 / RES, right: fx1 / RES, bottom: fy1 / RES };
}

/** ตำแหน่งของทั้งสามท่าหลัก — หาครั้งเดียวตอนเริ่มคลิป */
function locateAll() {
  return {
    sleep: locate({ shape: { loaf: 1 }, k: 1, blink: true }),
    stand: locate({ shape: {}, k: 1 }),
    sit: locate({ shape: { sit: 1, knead: 1 }, k: 1 }),
  };
}

/** จมูกของน้อง ณ เวลานี้ — ไล่ระหว่างตำแหน่งของท่าหมอบ ยืน นั่ง ตามน้ำหนักของท่า */
function faceAt(t, spot) {
  const loaf = track(t, 'loaf');
  const sit = track(t, 'sit');
  const x = lerp(lerp(spot.stand.face.x, spot.sleep.face.x, loaf), spot.sit.face.x, sit);
  const y = lerp(lerp(spot.stand.face.y, spot.sleep.face.y, loaf), spot.sit.face.y, sit);
  return { x, y };
}

// ─────────────────────────────────────────────────────────────
// กล้อง
//
// ── กล้องบอก "อะไรต้องอยู่ในกรอบ" ไม่ใช่ "ซูมกี่เท่า" ──
// แต่ละช็อตให้กล่องในหน่วยฉาก (กลาง x,y กว้าง w สูง h) แล้วตอนวาดค่อยหาซูม
// ที่ทำให้กล่องนั้นอยู่ในจอพอดี จอยาว (มือถือ) กับจอเหลี่ยม (แท็บเล็ต) จึงเห็นของ
// สำคัญครบเท่ากัน — เคยบอกเป็นตัวคูณซูมตรง ๆ แล้วบนจอ 4:3 หูกับหางหลุดกรอบ
// ─────────────────────────────────────────────────────────────

/** ช็อตกว้าง: เห็นห้องเกือบทั้งห้อง ดันเข้าช้า ๆ จากกรอบแรกไปกรอบหลัง */
const WIDE_FROM = { w: 830, h: 362 };
const WIDE_TO = { w: 760, h: 332 };
/**
 * ช็อตใกล้: ท้องเป็นจุดสนใจ แต่ยังเห็นหน้าหลับตายิ้มทั้งหน้าอยู่ด้านบน
 * มุกของช็อตนี้คือ "ท้องร้องลั่นแต่เจ้าตัวยังหลับสบาย" ถ้าหน้าหลุดกรอบ มุกหายไปครึ่งหนึ่ง
 */
const CLOSE = { w: 280, h: 128 };
const closeCenter = (spot) => ({ x: spot.sleep.belly.x, y: spot.sleep.belly.y - spot.sleep.belly.ry * 1.25 });
/**
 * ช็อตกลาง: ทั้งตัวตอนยืน เผื่อที่เหนือหัวให้ ? กับ ! และที่ด้านขวาบนให้เห็นจังหวะกระโดดออก
 * กล้องค้างกรอบนี้จนจบ ไม่แพนตามตอนกระโดด — น้องต้อง "หลุดกรอบไป" ถึงจะเป็นการออกฉาก
 */
const MED = { x: CAT.x, y: 250, w: 470, h: 205 };
/** กรอบหดเลยเป้าไปราว 10% ตอนซูมเด้ง (ดู easeOutBack) */
const OVERSHOOT = 1.12;

/** ซูมที่ทำให้กล่อง w x h อยู่ในจอพอดี แต่ไม่ต่ำกว่า "ห้องเต็มจอ" เพราะนอกห้องไม่มีอะไรวาดไว้ */
const fitZoom = (cw, ch, w, h) => Math.max(Math.max(ch / H, cw / W), Math.min(cw / w, ch / h));

function cameraAt(t, spot) {
  // ภาพนิ่งสนิทจะอ่านเป็นภาพค้าง ไม่ใช่คลิป ช็อตกว้างจึงดันเข้าช้า ๆ ตลอด
  const push = span(t, 0, T.zoomAt);
  const wide = { x: CAT.x, y: 244, w: lerp(WIDE_FROM.w, WIDE_TO.w, push), h: lerp(WIDE_FROM.h, WIDE_TO.h, push) };
  const close = { ...closeCenter(spot), ...CLOSE };

  let cam;
  if (t < T.pullAt) {
    const k = span(t, T.zoomAt, T.zoomDur);
    const kp = easeInOut(k);            // ตำแหน่งไปถึงเป้าแบบนุ่ม
    const kz = easeOutBack(k);          // กรอบหดเลยเป้านิดแล้วเด้งกลับ = แรงกระแทก
    cam = { x: lerp(wide.x, close.x, kp), y: lerp(wide.y, close.y, kp),
      w: lerp(wide.w, close.w, kz), h: lerp(wide.h, close.h, kz) };
  } else {
    // ถอยออกนุ่ม ๆ ไม่เด้ง — จังหวะนี้คือ "ตื่น" ไม่ใช่มุกตลก
    const k = easeInOut(span(t, T.pullAt, T.pullDur));
    cam = { x: lerp(close.x, MED.x, k), y: lerp(close.y, MED.y, k),
      w: lerp(close.w, MED.w, k), h: lerp(close.h, MED.h, k) };
  }
  // กล้องสั่นตามแรงท้องร้อง — เบามาก แค่พอให้รู้สึกว่าเสียงมีแรง
  cam.shake = envelope(t, T.growl1, T.growl1Dur) + envelope(t, T.growl2, T.growl2Dur) * 0.55
    + envelope(t, T.rubGrowl, T.rubGrowlDur) * 0.3;
  return cam;
}

// ── กล้ององก์สอง ──
// ช็อตกว้างกว่าในห้องทั้งหมด เพราะฉากนอกบ้านเล่าด้วย "ทาง" ไม่ใช่ด้วยรายละเอียดบนตัวน้อง
// และต้องมีที่เหลือทางขวาให้ปลาว่ายเข้ามา กับที่เหลือด้านบนให้ปลาพุ่งหนีขึ้นฟ้า
const OUT_WALK0 = { x: 430, y: 248, w: 700, h: 306 };   // เพิ่งออกมา
const OUT_WALK1 = { x: 430, y: 243, w: 645, h: 282 };   // ค่อย ๆ ดันเข้าระหว่างเดิน
const OUT_MEET = { x: 432, y: 236, w: 600, h: 262 };    // ตอนคุยกับปลา
const OUT_RUN = { x: 420, y: 246, w: 660, h: 289 };     // ออกวิ่งต่อ

/** ไล่กล้องจากกรอบหนึ่งไปอีกกรอบ */
const camLerp = (a, b, k) => ({
  x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k),
});

/**
 * กล้ององก์สอง — อยู่กับน้องตลอด ไม่แพลนตามปลา
 *
 * ปลาพุ่งขึ้นแล้วหลุดออกนอกกรอบไปเอง ซึ่งเป็นการ "ออกฉาก" ที่อ่านง่ายกว่าการตามไปดู
 * (ถ้ากล้องตามขึ้นไป น้องจะหลุดกรอบแทน แล้วคนดูจะขาดตัวเอกไปช่วงหนึ่ง)
 */
function outCamera(t) {
  if (t < T.fishIn) return camLerp(OUT_WALK0, OUT_WALK1, easeInOut(span(t, T.outside, T.fishIn - T.outside)));
  if (t < T.chase) return camLerp(OUT_WALK1, OUT_MEET, easeInOut(span(t, T.fishIn, 0.8)));
  return camLerp(OUT_MEET, OUT_RUN, easeInOut(span(t, T.chase, 0.5)));
}

/** ยกตัวขึ้นเป็นเส้นโค้งครึ่งวงกลม ใช้กับท่ากระโดดดีใจและท่าเขย่งคว้า */
const hop = (t, at, dur, h) => {
  const p = span(t, at, dur);
  return p <= 0 || p >= 1 ? 0 : Math.sin(p * Math.PI) * h;
};

/** แสงขาวรอยต่อระหว่างสองฉาก — ขึ้นเต็มตอนอยู่ในห้อง แล้วจางออกเมื่อฉากนอกบ้านมาแทน */
function seamFlash(t) {
  if (t < T.flash) return 0;
  if (t < T.outside) return clamp01((t - T.flash) / 0.26);
  return 1 - span(t, T.outside, 0.52);
}

// ─────────────────────────────────────────────────────────────
// ภาพห้องที่วาดเก็บไว้
//
// ── ทำไมต้องเก็บ ──
// ห้องเป็นภาพนิ่งทั้งห้อง แต่มีชิ้นส่วนหลายร้อยชิ้นกับไล่สีเต็มจอหลายชั้น
// วาดใหม่ทุกเฟรมที่ความละเอียดจอมือถือ (~2000x920) วัดแล้วได้ 35 fps บนเครื่องช้า
// วาดเก็บครั้งเดียวแล้วแปะตามกล้อง ได้ 44 fps บนเครื่องเดียวกัน โดยภาพต่างจากวาดสด
// ไม่ถึง 1/255 ส่วนที่ขยับ (น้อง เงา ฟอง สัญลักษณ์) ยังวาดสดทุกเฟรม
//
// ── ทำไมหลายใบ ไม่ใช่ใบเดียว ──
// ภาพที่เก็บคมเท่าความละเอียดตอนวาดเท่านั้น เก็บใบเดียวที่ความละเอียดช็อตใกล้ทั้งห้อง
// จะได้ภาพกว้างเกือบ 7000px ซึ่งเกินเพดานผ้าใบของ iPhone (16 ล้านพิกเซล)
// จึงเก็บแยกตามช็อต: ทั้งห้องที่ความละเอียดช็อตกว้าง + เฉพาะรอบตัวน้องที่ความละเอียด
// ช็อตกลางและช็อตใกล้ แต่ละเฟรมใช้ใบที่คมที่สุดซึ่งครอบสิ่งที่กล้องเห็นได้ทั้งหมด
// ─────────────────────────────────────────────────────────────

/** ห้องกับแสงที่ไม่ขยับ — ใช้ทั้งตอนวาดเก็บและตอนวาดสด ผลจึงเหมือนกันเป๊ะ */
function paintRoom(g) {
  drawRoomScene(g);
  // หรี่ห้องลงเล็กน้อยกับไฟส่องที่พรม — สูตรเดียวกับตอนน้องยืนในห้อง (drawRoom ใน game.js)
  // มืดกว่านั้นอีกหน่อย เพราะน้องกำลังหลับ
  g.fillStyle = 'rgba(24,10,38,.24)';
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(CAT.x, GROUND_Y - 30, 10, CAT.x, GROUND_Y - 30, 190);
  glow.addColorStop(0, 'rgba(255,214,150,.3)');
  glow.addColorStop(1, 'rgba(255,214,150,0)');
  g.fillStyle = glow;
  g.fillRect(CAT.x - 200, GROUND_Y - 230, 400, 300);
}

/** วาดห้องเฉพาะกล่อง rect (หน่วยฉาก) ที่ความละเอียด res พิกเซลต่อหน่วย */
function roomShot(rect, res) {
  // เพดานผ้าใบ: ด้านละไม่เกิน 8192 และพื้นที่ไม่เกิน 16 ล้านพิกเซล (ต่ำสุดของ iPhone)
  res = Math.min(res, 8192 / rect.w, 8192 / rect.h, Math.sqrt(16e6 / (rect.w * rect.h)));
  const c = document.createElement('canvas');
  c.width = Math.ceil(rect.w * res);
  c.height = Math.ceil(rect.h * res);
  const g = c.getContext('2d');
  g.setTransform(res, 0, 0, res, -rect.x * res, -rect.y * res);
  paintRoom(g);
  return { c, rect, res };
}

/** กล่องรอบจุดกลาง (หนีบไว้ในห้อง) */
function around(cx, cy, w, h) {
  w = Math.min(W, w);
  h = Math.min(H, h);
  return { x: Math.max(0, Math.min(W - w, cx - w / 2)), y: Math.max(0, Math.min(H - h, cy - h / 2)), w, h };
}

function buildRoomShots(cw, ch, spot) {
  const c = closeCenter(spot);
  const list = [
    // กล่องกว้างกว่ากรอบของช็อตราวครึ่งหนึ่ง เผื่อกล้องสั่นกับตอนซูมเด้ง
    roomShot(around(c.x, c.y, CLOSE.w * 1.45, CLOSE.h * 1.6), fitZoom(cw, ch, CLOSE.w, CLOSE.h) * OVERSHOOT),
    roomShot(around(MED.x, MED.y, MED.w * 1.3, MED.h * 1.45), fitZoom(cw, ch, MED.w, MED.h)),
    roomShot({ x: 0, y: 0, w: W, h: H }, fitZoom(cw, ch, WIDE_TO.w, WIDE_TO.h)),
  ].sort((a, b) => b.res - a.res);   // คมสุดก่อน
  return { cw, ch, list };
}

/** คืนหน่วยความจำภาพที่เก็บไว้ — ภาพใหญ่ระดับหลายสิบ MB บนแท็บเล็ต ไม่ควรค้างหลังคลิปจบ */
function dropRoomShots(shots) {
  if (!shots) return;
  for (const s of shots.list) s.c.width = 0;
}

// ─────────────────────────────────────────────────────────────
// ของที่วาดทับฉาก
// ─────────────────────────────────────────────────────────────

/**
 * แรงท้องร้อง ณ เวลานี้ 0..1 พร้อมจังหวะสั่น
 * คลื่นสั่นเร็วคูณเปลือกช้า = กระเพื่อมเป็นห้วง ๆ ตรงกับฟองในเสียง (ดู growl ใน audio.js)
 */
function rumbleAt(t) {
  const e = Math.max(
    envelope(t, T.growl1, T.growl1Dur, 0.08, 0.35),
    envelope(t, T.growl2, T.growl2Dur, 0.06, 0.25) * 0.6,
    envelope(t, T.rubGrowl, T.rubGrowlDur, 0.06, 0.25) * 0.45,
  );
  // ความถี่สั่นไม่คงที่เหมือนฟองในเสียง — ถ้าคงที่จะดูเป็นเครื่องสั่น
  const wob = Math.sin(t * 58 + Math.sin(t * 7) * 2.2);
  return { e, wob };
}

/**
 * ฟองจมูกตอนหลับ — พองยุบตามลมหายใจ แล้วแตกเป็นละอองตอนตื่น
 * ใช้แทนตัว Z เพราะคลิปนี้ไม่มีตัวอักษร และฟองจมูกอ่านเป็น "หลับลึก" ได้ชัดกว่าด้วย
 * วาดในหน่วยฉาก จึงติดจมูกไปเองไม่ว่ากล้องจะซูมแค่ไหน
 */
function drawBubble(ctx, t, face, frames) {
  if (t > T.pop + 0.4) return;
  const breath = (Math.sin(frames * 0.045) + 1) / 2;
  const { e, wob } = rumbleAt(t);
  ctx.save();
  if (t < T.pop) {
    // ฟองโตขึ้นเรื่อย ๆ ตลอดช่วงหลับ แล้วพองยุบตามลมหายใจทับอีกชั้น
    // ขอบซ้ายของฟองแตะจมูกพอดี ฟองจึงดูงอกออกมาจากจมูก ไม่ใช่ลอยอยู่ข้าง ๆ
    const grow = 0.75 + 0.25 * span(t, 0, T.pop);
    const r = (5.5 + breath * 5) * grow * (1 + wob * e * 0.08);
    const x = face.x + 1.5 + r * 0.92;
    const y = face.y + 1.5;
    ctx.globalAlpha = Math.min(1, t / 0.5);
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,.55)');
    g.addColorStop(0.7, 'rgba(190,228,255,.42)');
    g.addColorStop(1, 'rgba(160,210,250,.5)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 0.9;
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.13, -0.6, 0, Math.PI * 2); ctx.fill();
  } else {
    // แตกเป็นละอองหกเม็ดกระจายออก
    const p = span(t, T.pop, 0.4);
    const x = face.x + 8;
    const y = face.y + 1.5;
    ctx.fillStyle = `rgba(210,236,255,${1 - p})`;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const d = 5 + 14 * easeOutBack(Math.min(1, p * 1.2));
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d + p * 4, 1.4 * (1 - p) + 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** เส้นสั่นรอบท้อง "(( ))" — วาดในหน่วยจอ ความหนาเส้นจึงเท่าเดิมไม่ว่าจะซูมเท่าไหร่ */
function drawRumbleLines(ctx, t, bx, by, rx, ry, u) {
  const { e } = rumbleAt(t);
  if (e <= 0.01) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      // เส้นวิ่งออกจากท้องแล้วจาง วนรอบละ 0.36 วินาที สามเส้นเหลื่อมกัน
      const p = ((t * 2.8 + i / 3) % 1);
      const a = e * Math.min(1, (1 - p) * 1.6) * Math.min(1, p * 5);
      if (a <= 0.02) continue;
      const r = 1.08 + p * 0.42;
      const jitter = Math.sin(t * 40 + i * 2 + side) * u * 1.2;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.ellipse(bx + jitter, by, rx * r, ry * r,
        0, side < 0 ? Math.PI * 0.78 : -Math.PI * 0.22, side < 0 ? Math.PI * 1.22 : Math.PI * 0.22);
      ctx.lineWidth = u * 9;
      ctx.strokeStyle = '#4A1F05';
      ctx.stroke();
      ctx.lineWidth = u * 4.5;
      ctx.strokeStyle = '#FFF4DC';
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * สัญลักษณ์แบบการ์ตูน (~ ? !) — เด้งออกมา สั่นตามแรงที่ส่งมา แล้วจางหาย
 * วาดในหน่วยจอ ขนาดส่งมาจากผู้เรียก (คิดจากขนาดตัวน้องบนจอ)
 *
 * at/dur = ช่วงที่โผล่ / x,y = กลางสัญลักษณ์บนจอ / shake = 0..1 สั่นมากน้อย
 */
function drawMark(ctx, t, glyph, at, dur, x, y, size, tilt, shake = 0) {
  const k = span(t, at, 0.26);
  const out = 1 - span(t, at + dur - 0.12, 0.2);
  if (k <= 0 || out <= 0) return;
  const pop = easeOutBack(k);
  const wob = Math.sin(t * 58 + Math.sin(t * 7) * 2.2);
  // ลอยขึ้นช้า ๆ ระหว่างที่ค้างอยู่ ของที่นิ่งสนิทกลางอากาศอ่านเป็นสติกเกอร์แปะจอ
  const rise = span(t, at, dur) * size * 0.18;

  ctx.save();
  ctx.translate(x + wob * shake * size * 0.05, y - rise);
  ctx.rotate(tilt + wob * shake * 0.06);
  ctx.scale(pop, pop);
  ctx.globalAlpha = out;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.font = `700 ${size}px Mali, system-ui, sans-serif`;
  // สามชั้น: เงาเข้ม / ขอบหนา / เนื้อสีเหลืองไล่ลงส้ม — เหมือนสัญลักษณ์ในการ์ตูน
  ctx.lineWidth = size * 0.22;
  ctx.strokeStyle = 'rgba(40,14,0,.35)';
  ctx.strokeText(glyph, size * 0.05, size * 0.07);
  ctx.strokeStyle = '#4A1F05';
  ctx.strokeText(glyph, 0, 0);
  const g = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
  g.addColorStop(0, '#FFE78A');
  g.addColorStop(1, '#FF9D2E');
  ctx.fillStyle = g;
  ctx.fillText(glyph, 0, 0);
  ctx.restore();
}

/** ฝุ่นตอนถีบตัวออกจากพรม — หน่วยฉาก */
function drawDust(ctx, t) {
  const p = span(t, T.jumpAt, 0.5);
  if (p <= 0 || p >= 1) return;
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const side = i % 2 ? 1 : -1;
    const spread = (i + 1) / 7;
    const x = CAT.x + side * (10 + spread * 46 * easeOutBack(Math.min(1, p * 1.4)));
    const y = CAT.feet + 2 - spread * 10 * p;
    const r = (5 + spread * 7) * (0.6 + p * 0.7);
    ctx.globalAlpha = (1 - p) * 0.75;
    ctx.fillStyle = '#F4E7D3';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** ประกายที่หลุดทิ้งไว้ตามทางกระโดด — หน่วยฉาก */
function drawTrail(ctx, t) {
  if (t < T.jumpAt) return;
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const born = T.jumpAt + i * 0.07;
    const age = t - born;
    if (age < 0 || age > 0.7) continue;
    const q = ((i + 0.5) / 6) * 0.55;             // ตำแหน่งบนทางกระโดดตอนเกิด
    const x = CAT.x + JUMP_X * q + Math.sin(i * 2.1) * 12;
    const y = CAT.feet - 40 + jumpY(q) + Math.cos(i * 1.7) * 10;
    const a = 1 - age / 0.7;
    ctx.globalAlpha = a;
    ctx.fillStyle = i % 2 ? '#FFF6C8' : '#FFFFFF';
    star4(ctx, x, y - age * 12, (6 + (i % 3) * 2.5) * (0.5 + a * 0.6));
  }
  ctx.restore();
}

/** เส้นความเร็วตามหลังตัวตอนพุ่ง — หน่วยจอ */
function drawSpeedLines(ctx, t, sx, sy, u) {
  const p = span(t, T.jumpAt, T.jumpDur);
  if (p <= 0 || p >= 1) return;
  const a = Math.min(1, p * 8) * (1 - p);
  // ทิศตรงข้ามกับทางที่พุ่ง (พุ่งไปขวาบน เส้นจึงลากไปซ้ายล่าง)
  const vx = -JUMP_X;
  const vy = 560 - 360 * p;
  const len = Math.hypot(vx, vy);
  const dx = vx / len;
  const dy = vy / len;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#FFF8E6';
  for (let i = -2; i <= 2; i++) {
    const off = i * u * 16;
    const l = u * (70 + (2 - Math.abs(i)) * 35);
    const x0 = sx - dy * off + dx * u * 40;
    const y0 = sy + dx * off + dy * u * 40;
    ctx.globalAlpha = a * (0.9 - Math.abs(i) * 0.18);
    ctx.lineWidth = u * (5 - Math.abs(i));
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + dx * l, y0 + dy * l);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * แสงขาวปิดคลิป — บานออกจากจุดที่น้องกระโดดพ้นกรอบ พร้อมดาวประกายพุ่งออก
 * แล้วค่อย ๆ ขาวเต็มจอ เฟรมสุดท้ายของคลิปจึงเป็นสีขาวล้วน
 * ให้หน้าแรกของเกมจางออกมาจากสีขาวต่อได้เนียน (ดู closing-white ใน style.css)
 */
function drawShine(ctx, t, ox, oy, cw, ch, u) {
  const f = span(t, T.shineAt, T.end - T.shineAt - 0.05);
  if (f <= 0) return;
  const diag = Math.hypot(cw, ch);

  ctx.save();
  const r = Math.max(1, diag * 1.5 * easeIn(f) + u * 30 * Math.min(1, f * 6));
  const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,252,238,.9)');
  g.addColorStop(1, 'rgba(255,248,225,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cw, ch);

  // ดาวประกายพุ่งออกจากจุดกำเนิดแสง
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + i * 0.37;
    const speed = 0.55 + ((i * 7) % 5) / 8;
    const d = diag * 0.55 * speed * easeInOut(Math.min(1, f * 1.4));
    const x = ox + Math.cos(a) * d;
    const y = oy + Math.sin(a) * d;
    const tw = 0.6 + 0.4 * Math.sin(t * 20 + i);
    ctx.globalAlpha = Math.min(1, f * 5) * (1 - span(f, 0.6, 0.4));
    ctx.fillStyle = i % 3 ? '#FFFFFF' : '#FFF1B0';
    star4(ctx, x, y, u * (7 + (i % 4) * 3) * tw);
  }

  // ขาวทึบเต็มจอช่วงท้าย
  ctx.globalAlpha = span(t, T.end - 0.4, 0.38);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, cw, ch);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// องก์สอง — นอกปราสาท
// ─────────────────────────────────────────────────────────────

/**
 * น้องในองก์สอง — ยืนอยู่กับที่บนจอ ให้ฉากไหลผ่าน (ท่าเดียวกับตอนวิ่งจริงในเกม)
 * คืนก้อนที่มีแค่ค่าที่ drawPlayer อ่าน ไม่ใช่ Player จริง ไม่มีฟิสิกส์
 */
function outCat(t) {
  const dist = walkDist(t);
  const lift = hop(t, T.happy, 0.46, 28) + hop(t, T.reach, 0.52, 62);
  const feet = GROUND_Y - lift;
  return {
    box: { x: OUT_CAT_X - BODY.standW / 2, y: feet - BODY.standH, w: BODY.standW, h: BODY.standH },
    y: feet,
    // vy ใช้แค่เอียงตัวตอนลอย — ส่งค่าจากทิศที่กำลังขึ้น/ลงพอ
    vy: lift > 0.5 ? (t < T.reach + 0.26 && t > T.reach ? -6 : 4) : 0,
    onGround: lift < 0.5,
    sliding: false, tilt: 0, squash: 0,
    // จังหวะขาเดินจากระยะทางที่เดินไปแล้ว — หยุดเดินเมื่อไหร่ขาก็หยุดเอง
    runPhase: dist * 0.06,
    tailLag: Math.sin(dist * 0.06 * 2 + 0.9),
    gaitK: 1,
    dist,
    lift,
  };
}

/** อารมณ์หน้าน้องในองก์สอง */
function outMood(t) {
  if (t >= T.chase) return 'happy';        // ไม่ยอมแพ้ วิ่งตาม
  if (t >= T.miss) return '';              // งง ๆ ตอนคว้าไม่ทัน
  if (t >= T.happy) return 'starry';       // ดีใจตาเป็นประกาย
  return '';
}

/** ของกินที่ปลาถือมา — ติดอยู่กับตัวปลา ยื่นลงมาตอนให้ แล้วถูกดึงกลับขึ้นไป */
function drawTreat(ctx, t, fx, fy, r, frames) {
  if (t > T.chase) return;                 // พาหนีขึ้นฟ้าไปแล้ว ไกลจนไม่ต้องวาด
  // ยื่นลงมาหาน้องตอนเสนอให้ แล้วหดกลับเข้าตัวปลาตอนดึงคืน
  const out = keys(t, [[T.fishIn, 0.2], [T.offer, 1], [T.pull, 1], [T.pull + 0.3, 0.15], [T.end, 0.1]]);
  const k = r / 34;
  ctx.save();
  // เยื้องลงซ้ายให้พ้นลำตัวปลา — วางใกล้กว่านี้แล้ววัดจากภาพจริง กุ้งจมหายไปในตัวปลา
  // มองไม่ออกว่าปลาถืออะไรมาให้ ซึ่งเป็นใจความทั้งหมดของช็อตนี้
  // ระยะคูณด้วย k ตามขนาดปลา ปลาโตขึ้นเมื่อไหร่กุ้งก็ถอยห่างตามเอง
  ctx.translate(fx - 46 * k * out, fy + 34 * k * out);
  ctx.scale(k, k);
  drawShrimp(ctx, 0, 0, 17, frames);
  ctx.restore();
}

function drawOutside(ctx, cw, ch, t) {
  const cam = outCamera(t);
  const z = fitZoom(cw, ch, cam.w, cam.h);
  const hw = cw / (2 * z);
  const hh = ch / (2 * z);
  const cx = Math.max(hw, Math.min(W - hw, cam.x));
  const cy = Math.max(hh, Math.min(H - hh, cam.y));
  const u = ch / 420;
  const toScreen = (x, y) => [(x - cx) * z + cw / 2, (y - cy) * z + ch / 2];
  const frames = t * 60;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cw, ch);

  // ── ฉาก (หน่วยฉาก) ──
  ctx.setTransform(z, 0, 0, z, cw / 2 - cx * z, ch / 2 - cy * z);
  const cat = outCat(t);
  // ฉากปราสาทชุดเดียวกับล็อบบี้ เลื่อนตามระยะที่น้องเดินไป = กล้องแพลนตามจังหวะเดิน
  drawKingdom(ctx, frames, { worldX: cat.dist + 180 });

  // ── ปลาทอง ──
  const fx = keys(t, FISH_X);
  const fy = keys(t, FISH_Y);
  const fr = keys(t, FISH_R);
  const dir = keys(t, [[T.fishIn, -1], [T.tease, -1], [T.flee, -0.5], [T.chase, 1], [T.end, 1]]);
  // ท่าล้อ: สะบัดตัวไปมาถี่ ๆ ก่อนพุ่งหนี
  const taunt = t >= T.tease && t < T.flee ? Math.sin((t - T.tease) * 26) * 9 : 0;
  // พ้นขอบบนของฉากไปแล้วก็ไม่ต้องวาด — ปลาหายไปเพราะบินพ้นจอ ไม่ใช่เพราะจางหาย
  const gone = fy < -fr * 2.2;
  if (t >= T.fishIn && !gone) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, span(t, T.fishIn, 0.25));
    drawBigFish(ctx, fx + taunt, fy, fr, dir, frames);
    drawTreat(ctx, t, fx + taunt, fy, fr, frames);
    ctx.restore();
  }

  // ── น้อง ──
  drawPlayer(ctx, cat, false, HERO, false, 0, outMood(t), OUT_SCALE, 1, {});

  // ฝุ่นตอนออกวิ่ง — ปล่อยจากใต้เท้าไล่ถอยหลัง
  if (t >= T.chase) {
    const p = span(t, T.chase, 0.5);
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const q = (i + 1) / 6;
      const age = (p * 2.2 + q) % 1;
      ctx.globalAlpha = (1 - age) * 0.5;
      ctx.fillStyle = '#F6EAD6';
      ctx.beginPath();
      ctx.arc(OUT_CAT_X - 18 - age * 90, GROUND_Y - 4 - age * 12, 4 + age * 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── ของบนจอ (หน่วยจอ) ──
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const head = 13 * OUT_SCALE * z;
  const [hx, hy] = toScreen(OUT_CAT_X + 8, cat.y - 86);
  const markX = Math.max(head, Math.min(cw - head, hx + head * 1.1));
  const markY = Math.max(head, hy - head * 1.6);
  drawMark(ctx, t, '!', T.happy, T.pull - T.happy + 0.1, markX, markY, head * 1.4, -0.08, 0.5);
  drawMark(ctx, t, '?', T.miss, T.tease - T.miss + 0.35, markX, markY, head * 1.3, 0.12);

  // ประกายตอนปลาพุ่งหนี — ทิ้งไว้ตามทางที่มันพุ่งขึ้นไป
  if (t >= T.flee) {
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const born = T.flee + i * 0.06;
      const age = t - born;
      if (age < 0 || age > 0.7) continue;
      const q = span(born, T.flee, T.chase - T.flee);
      const [sx2, sy2] = toScreen(keys(born, FISH_X), keys(born, FISH_Y));
      ctx.globalAlpha = (1 - age / 0.7) * 0.9;
      ctx.fillStyle = i % 2 ? '#FFF1B0' : '#FFFFFF';
      star4(ctx, sx2 + Math.sin(i * 2.1) * 14, sy2 + age * 26 + Math.cos(i * 1.7) * 10,
        u * (6 + (i % 3) * 3) * (1 - q * 0.4));
    }
    ctx.restore();
  }

  // แสงขาวปิดคลิป — บานจากจุดที่น้องวิ่งออกไปทางขวา
  const [ex, ey] = toScreen(OUT_CAT_X + 210, GROUND_Y - 120);
  drawShine(ctx, t, Math.max(cw * 0.1, Math.min(cw * 0.92, ex)),
    Math.max(ch * 0.08, Math.min(ch * 0.9, ey)), cw, ch, u);

  // แสงขาวรอยต่อกำลังจางออกตอนเพิ่งเข้าฉากนี้
  const seam = seamFlash(t);
  if (seam > 0) {
    ctx.fillStyle = `rgba(255,255,255,${seam})`;
    ctx.fillRect(0, 0, cw, ch);
  }
}

// ─────────────────────────────────────────────────────────────
// เล่นคลิป
// ─────────────────────────────────────────────────────────────

/**
 * เล่นคลิปลงผ้าใบที่ให้มา แล้วเรียก onDone ตอนจบ (ภาพเฟรมสุดท้ายเป็นสีขาวล้วน)
 * onShine ถูกเรียกตอนแสงขาวเริ่มบาน ราวครึ่งวินาทีก่อนจบ
 *
 * คืนฟังก์ชันสำหรับหยุดกลางคัน (ผู้เล่นแตะข้าม) ตัวฟังก์ชันมีของแถมติดมาด้วย:
 *   stop.pause()   หยุดค้างเฟรมปัจจุบัน (เพลงค้างตามไปด้วย)
 *   stop.resume()  เล่นต่อจากเฟรมเดิม
 *   stop.paused    กำลังค้างอยู่ไหม
 * ตอนนี้ใช้ในหน้าพรีวิว (intro-preview.html) — คลิปในเกมจริงเรียกแค่ตัวฟังก์ชันเหมือนเดิม
 *
 * ต้องเรียกหลังผู้เล่นแตะจอแล้ว เบราว์เซอร์ถึงจะยอมให้มีเสียง
 */
export function playIntroAnim(canvas, { onDone = () => {}, onShine = () => {} } = {}) {
  const ctx = canvas.getContext('2d');
  const spot = locateAll();
  const cues = [
    ...T.snore.map((at) => ({ at, fn: () => sfx.snooze() })),
    { at: T.growl1, fn: () => growlSound(T.growl1Dur) },
    { at: T.growl2, fn: () => growlSound(T.growl2Dur, true) },
    { at: T.pop, fn: () => sfx.bubblePop() },
    { at: T.yawnAt + 0.05, fn: () => sfx.yawn() },
    { at: T.rubGrowl, fn: () => growlSound(T.rubGrowlDur, true) },
    { at: T.lookAt + 0.05, fn: () => sfx.huh() },
    { at: T.ideaAt, fn: () => sfx.trill() },
    { at: T.jumpAt, fn: () => sfx.jump() },
    // ── องก์สอง ──
    { at: T.outside, fn: () => sfx.land() },        // ลงพื้นนอกปราสาท
    // ยิงตอนตัวปลาเริ่มโผล่เข้ากรอบจริง ไม่ใช่ตอนมันยังอยู่นอกจอ
    { at: T.fishIn + 0.2, fn: () => sfx.bonus() },  // ปลาทองมาแล้ว (เสียงเดียวกับตอนเข้าโบนัสในเกม)
    { at: T.offer, fn: () => sfx.fish() },          // ยื่นของกินให้
    { at: T.happy, fn: () => sfx.trill() },         // ดีใจ
    { at: T.pull, fn: () => sfx.startle() },        // อ้าว ดึงคืน
    { at: T.reach, fn: () => sfx.jump() },          // เขย่งคว้า
    { at: T.miss, fn: () => sfx.huh() },            // คว้าไม่ทัน
    { at: T.tease, fn: () => sfx.chirp() },         // ปลาล้อ
    { at: T.flee, fn: () => sfx.dash() },           // พุ่งหนีขึ้นฟ้า
    { at: T.chase, fn: () => sfx.mew() },           // ไม่ยอมแพ้ วิ่งตาม
    // onShine = บอกผู้เรียกว่าแสงขาวเริ่มแล้ว (เช่นให้ซ่อนปุ่มที่ลอยทับคลิปอยู่)
    // แสงขาวเริ่มบาน = เริ่มหรี่เพลงให้พอดีหมดตอนจอขาวเต็ม ไม่ใช่ตัดห้วนตอนคลิปจบ
    { at: T.shineAt, fn: () => { sfx.introShine(); stopAudioFile(MUSIC_SRC, T.end - T.shineAt); } },
  ];

  // ปิดเสียงคลิปไว้ = ข้ามคิวเสียงทั้งชุด (ภาพยังเล่นครบเหมือนเดิมทุกเฟรม)
  // อ่านค่าครั้งเดียวตอนเริ่ม ไม่ใช่ทุกเฟรม — เปลี่ยนค่ากลางคลิปไม่ได้อยู่แล้ว
  const soundOn = introSoundEnabled();

  let raf = 0;
  let stopped = false;
  let shined = false;
  let shots = null;
  // เข้าองก์สองแล้วไม่ใช้ภาพห้องอีก — ต้องมีธงไว้บอก fitCanvas ไม่ให้สร้างใหม่
  // (ถ้าปล่อยให้มันเห็นว่า shots เป็น null มันจะวาดเก็บใหม่ทุกเฟรมจนคลิปหนืด)
  let roomDone = false;

  /** ความละเอียดผ้าใบ = พิกเซลจริงของจอ — นี่คือเหตุผลที่คลิปนี้คมกว่าวิดีโอ */
  function fitCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cw = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const ch = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    if (roomDone) return [cw, ch];
    // จอหมุนหรือเปลี่ยนขนาด = ความละเอียดที่เก็บไว้ไม่ตรงแล้ว วาดเก็บใหม่
    if (!shots || shots.cw !== cw || shots.ch !== ch) {
      dropRoomShots(shots);
      shots = buildRoomShots(cw, ch, spot);
    }
    return [cw, ch];
  }

  // วาดเก็บก่อนเริ่มนับเวลา — ใช้เวลาเสี้ยววินาทีแรก ถ้าไปทำในเฟรมแรก
  // นาฬิกาจะเดินไปแล้วระหว่างนั้น จังหวะเสียงกับภาพช่วงต้นจะถูกกินไปฟรี ๆ
  fitCanvas();

  if (soundOn) {
    // ทุกเสียงในคลิปไปช่อง intro ของตัวเอง ไม่ปนกับช่องเพลง/เอฟเฟกต์ของเกม
    // เสียงสังเคราะห์ (กรน หาว เสียงปลา) ตามไปด้วยผ่าน setSfxRoute
    setSfxRoute('intro');
    // เสียงท้องร้องดังครั้งแรกที่วินาทีที่ 3.5 — โหลดรอไว้ตั้งแต่ตอนนี้จะได้ดังตรงจังหวะ
    prepareAudioFile(HUNGRY_SRC, 'intro');
    // เพลงเริ่มพร้อมเฟรมแรกของคลิป ไล่ความดังขึ้นสั้น ๆ กันเสียงป๊อกตอนโน้ตแรก
    playAudioFile(MUSIC_SRC, { ch: 'intro', vol: MUSIC_VOL, fadeIn: 0.35 });
  }

  let start = performance.now();
  let last = start;
  let paused = false;
  let pausedAt = 0;

  function finish() {
    stopped = true;
    // คืนเส้นทางเสียงเอฟเฟกต์ให้เกม ไม่งั้นเสียงในเกมทั้งหมดจะไปออกช่องของคลิปต่อ
    setSfxRoute('sfx');
    // กดข้ามกลางคลิป: หรี่เพลงลงเร็ว ๆ แล้วหยุด ไม่ให้ค้างเล่นต่อตอนเข้าหน้าแรก
    // (ถ้าดูจนจบ เพลงหรี่หมดไปตั้งแต่ตอนแสงขาวแล้ว สั่งซ้ำตรงนี้ก็ไม่มีอะไรเกิดขึ้น)
    stopAudioFile(MUSIC_SRC, 0.25);
    cancelAnimationFrame(raf);
    dropRoomShots(shots);
    shots = null;
  }

  function frame(now) {
    if (stopped) return;
    // ── เฟรมหายไปนานผิดปกติ (สลับแอป / จอดับ / วาดเก็บใหม่ตอนหมุนจอ) ──
    // เลื่อนนาฬิกาของคลิปตามไปด้วย เหมือนกดหยุดไว้ ไม่งั้นกลับมาแล้วคลิปกระโดดข้ามไป
    // และเสียงทุกจุดที่ข้ามไปจะดังพร้อมกันทีเดียวเป็นก้อน
    if (now - last > 250) start += now - last - 1000 / 60;
    last = now;
    const t = (now - start) / 1000;
    const [cw, ch] = fitCanvas();

    // เข้าฉากนอกบ้านแล้วไม่ต้องใช้ภาพห้องที่วาดเก็บไว้อีก คืนหน่วยความจำทันที
    // (บนแท็บเล็ตภาพชุดนี้กินหลายสิบ MB ถ้าถือไว้จนจบคลิปก็เปลืองเปล่า ๆ)
    if (!roomDone && t >= T.outside) {
      roomDone = true;
      dropRoomShots(shots);
      shots = null;
    }

    // เสียงยิงครั้งเดียวต่อจุด ตอนเวลาข้ามจุดนั้นไป ต่อให้เฟรมกระตุกก็ไม่ยิงซ้ำ
    if (soundOn) for (const c of cues) if (!c.done && t >= c.at) { c.done = true; c.fn(); }

    // สัญญาณ "แสงขาวเริ่มแล้ว" ต้องยิงเสมอ ไม่เกี่ยวกับเสียง — มันคือตัวสั่งซ่อนป้ายบนคลิป
    if (!shined && t >= T.shineAt) { shined = true; onShine(); }

    draw(ctx, cw, ch, Math.min(t, T.end), spot, shots);

    if (t >= T.end) { finish(); onDone(); return; }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  // ── หยุด / เล่นต่อ ──
  // ทั้งคลิปคิดจาก "เวลาตั้งแต่เริ่ม" ตัวเดียว การหยุดจึงเป็นแค่การเลื่อนจุดเริ่มต้น
  // ไปข้างหน้าเท่าที่ค้างไว้ — ไม่มีสถานะไหนต้องเก็บเพิ่ม และเสียงที่ยิงไปแล้วก็ไม่ยิงซ้ำ
  //
  // เพลงค้างไว้ตรงจุดเดิมแล้วเล่นต่อ (ไม่ใช่หยุดแล้วเริ่มใหม่) ภาพกับเพลงจึงไม่คลาดกัน
  // ส่วนเสียงสั้น ๆ ที่กำลังดังค้างอยู่ปล่อยให้ดังจนจบ — สั้นกว่าครึ่งวินาทีทุกตัว
  finish.pause = () => {
    if (stopped || paused) return;
    paused = true;
    pausedAt = performance.now();
    cancelAnimationFrame(raf);
    if (soundOn) pauseAudioFile(MUSIC_SRC);
  };

  finish.resume = () => {
    if (stopped || !paused) return;
    paused = false;
    const now = performance.now();
    start += now - pausedAt;
    last = now;
    if (soundOn) resumeAudioFile(MUSIC_SRC);
    raf = requestAnimationFrame(frame);
  };

  Object.defineProperty(finish, 'paused', { get: () => paused });

  return finish;
}

/**
 * วาดหนึ่งเฟรม ณ เวลา t — ฟังก์ชันบริสุทธิ์ เรียกซ้ำด้วย t เดิมได้ภาพเดิมทุกครั้ง
 * ไว้ตรวจภาพทีละเฟรม cached = true ใช้ภาพห้องที่วาดเก็บ แบบเดียวกับตอนเล่นจริง
 */
export function drawIntroFrame(ctx, cw, ch, t, { cached = false } = {}) {
  const spot = locateAll();
  const shots = cached ? buildRoomShots(cw, ch, spot) : null;
  draw(ctx, cw, ch, t, spot, shots);
  dropRoomShots(shots);
}

function draw(ctx, cw, ch, t, spot, shots = null) {
  // เลยรอยต่อไปแล้ว = ฉากนอกปราสาท (องก์สอง) คนละฉากคนละกล้องกันทั้งก้อน
  if (t >= T.outside) return drawOutside(ctx, cw, ch, t);

  const cam = cameraAt(t, spot);

  // ── กรอบภาพ ──
  const z = fitZoom(cw, ch, cam.w, cam.h);
  // กันกล้องไม่ให้มองเลยขอบห้อง — นอกห้องไม่มีอะไรวาดไว้
  const hw = cw / (2 * z);
  const hh = ch / (2 * z);
  const cx = Math.max(hw, Math.min(W - hw, cam.x));
  const cy = Math.max(hh, Math.min(H - hh, cam.y));
  const u = ch / 420;                          // หน่วยจอ: 1 = ความสูงจอ / 420
  const sx = Math.sin(t * 71) * cam.shake * u * 2.2;
  const sy = Math.cos(t * 83) * cam.shake * u * 1.6;
  const toScreen = (x, y) => [(x - cx) * z + cw / 2 + sx, (y - cy) * z + ch / 2 + sy];

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cw, ch);

  // ── ฉาก (หน่วยฉาก) ──
  ctx.setTransform(z, 0, 0, z, cw / 2 - cx * z + sx, ch / 2 - cy * z + sy);
  if (shots) {
    // ใบที่คมที่สุดซึ่งครอบทุกขอบของสิ่งที่กล้องเห็น (เผื่อระยะกล้องสั่น)
    // ถ้าใบเล็กยังไม่ครอบ ใช้ใบถัดไป ไม่งั้นจะเห็นขอบภาพแหว่ง
    const m = (Math.abs(sx) + Math.abs(sy)) / z;
    const shot = shots.list.find(({ rect: r }) => cx - hw - m >= r.x && cx + hw + m <= r.x + r.w
      && cy - hh - m >= r.y && cy + hh + m <= r.y + r.h) || shots.list[shots.list.length - 1];
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(shot.c, shot.rect.x, shot.rect.y, shot.rect.w, shot.rect.h);
  } else {
    paintRoom(ctx);
  }

  const frames = t * 60;
  const breathe = Math.sin(frames * 0.045);
  const pose = poseAt(t);
  const jump = jumpAt(t);
  const loaf = pose.shape.loaf;

  // ── เงาไล่สีจางออกที่ขอบ ──
  // วงรีทึบดูดีตอนภาพกว้าง แต่พอซูมสามเท่า ขอบแข็งของมันตัดผ่านพรมเป็นเส้นชัด
  // ท่าหมอบกว้างกว่าท่ายืน เงาจึงไล่ความกว้างตามน้ำหนักท่าหมอบ
  // และหดจางลงตามความสูงที่ตัวลอยพ้นพื้นตอนกระโดด
  const loafRx = Math.min((spot.sleep.right - spot.sleep.left) * 0.42, 72);
  const lift = Math.max(0, -jump.dy);
  const srx = lerp(46, loafRx, loaf) * (1 - Math.min(0.7, lift / 300)) - breathe * 1.5 * loaf;
  const shadowA = 1 - Math.min(1, lift / 160);
  if (shadowA > 0) {
    ctx.save();
    ctx.translate(CAT.x + jump.dx * 0.15, spot.sleep.bottom + 2);
    ctx.scale(1, 10 / srx);
    const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, srx);
    sh.addColorStop(0, `rgba(0,0,0,${0.34 * shadowA})`);
    sh.addColorStop(0.65, `rgba(0,0,0,${0.2 * shadowA})`);
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.arc(0, 0, srx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawDust(ctx, t);

  // ── น้อง ──
  const { e, wob } = rumbleAt(t);
  if (jump.p < 1) {
    ctx.save();
    // กระโดด: เลื่อนทั้งตัวตามทาง หมุนไปทางที่พุ่ง ยืดตัวตอนถีบออก — ทั้งหมดรอบจุดที่เท้าแตะ
    if (t >= T.jumpAt) {
      ctx.translate(CAT.x + jump.dx, CAT.feet + jump.dy);
      ctx.rotate(jump.rot);
      ctx.scale(1 - jump.stretch * 0.16, 1 + jump.stretch * 0.28);
      ctx.translate(-CAT.x, -CAT.feet);
    }
    // ท้องพองยุบตามลมหายใจตอนหลับ — ขยายรอบจุดที่ตัวแตะพื้น ตัวจึงไม่ลอยขึ้นจากพรม
    const puff = 1 + breathe * 0.018 * loaf;
    ctx.translate(CAT.x, spot.sleep.bottom);
    ctx.scale(1 + (puff - 1) * 0.4, puff);
    ctx.translate(-CAT.x, -spot.sleep.bottom);
    // ท้องร้อง: บีบยืดรอบจุดกลางท้อง — ตอนซูมใกล้ ภาพเต็มจอเป็นท้อง จึงอ่านเป็น "ท้องกระเพื่อม"
    if (e > 0) {
      const b = loaf > 0.5 ? spot.sleep.belly : spot.sit.belly;
      const j = wob * e * 0.045;
      ctx.translate(b.x, b.y);
      ctx.scale(1 + j, 1 - j * 0.8);
      ctx.translate(-b.x, -b.y);
    }
    drawCatPose(ctx, CAT.x, CAT.feet, CAT.scale, HERO, frames, pose);
    ctx.restore();
  }

  drawBubble(ctx, t, spot.sleep.face, frames);
  drawTrail(ctx, t);

  // ── ของบนจอ (หน่วยจอ) ──
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // เส้นสั่นรอบท้อง
  const belly = loaf > 0.5 ? spot.sleep.belly : spot.sit.belly;
  const [bx, by] = toScreen(belly.x, belly.y);
  drawRumbleLines(ctx, t, bx, by, belly.rx * z, belly.ry * z, u);

  // ── ~ ข้างตัวตอนท้องร้อง ──
  // วางข้างลำตัว ห้ามอยู่เหนือท้องตรง ๆ เพราะตรงนั้นคือหน้าน้อง
  // ระยะและขนาดคิดจากตัวน้องบนจอ ไม่ใช่จากความสูงจอ — จอยาวหรือจอเหลี่ยมจึงอยู่ข้างตัวเท่ากัน
  // ลำตัวกว้างราว 2.2 เท่าของท้อง สัญลักษณ์จึงอยู่ที่ 2.9 เท่า = พ้นตัวพอดี
  const shake = rumbleAt(t).e;
  const keepX = (x, size) => Math.max(size, Math.min(cw - size, x));
  const brx = belly.rx * z;
  const big = Math.min(ch * 0.24, brx * 1.65);
  drawMark(ctx, t, '~', T.growl1, T.growl1Dur, keepX(bx + brx * 2.9, big), by - brx * 0.5, big, -0.18, shake);
  drawMark(ctx, t, '~', T.growl2, T.growl2Dur, keepX(bx - brx * 2.9, big * 0.8), by - brx * 1.3, big * 0.8, 0.16, shake);
  drawMark(ctx, t, '~', T.rubGrowl, T.rubGrowlDur + 0.2, keepX(bx + brx * 3, big), by - brx * 0.4, big, -0.15, shake);

  // ── ? กับ ! เหนือหัว ──
  const face = faceAt(t, spot);
  const head = CAT.scale * 13 * z;                        // รัศมีหัวบนจอ
  const [hx, hy] = toScreen(face.x, face.y);
  const markX = keepX(hx + head * 0.95, head);
  const markY = Math.max(head, hy - head * 2.05);
  drawMark(ctx, t, '?', T.lookAt, T.ideaAt - T.lookAt - 0.05, markX, markY, head * 1.25, 0.12);
  drawMark(ctx, t, '!', T.ideaAt, C + 0.45 - T.ideaAt, markX, markY, head * 1.45, -0.08,
    1 - span(t, T.ideaAt + 0.1, 0.25));

  // ── กระโดด ──
  const [jx, jy] = toScreen(CAT.x + jump.dx, CAT.feet + jump.dy - 40);
  drawSpeedLines(ctx, t, jx, jy, u);

  // แสงบานจากจุดที่น้องพ้นขอบจอ — หนีบให้อยู่ในจอ ไม่งั้นจุดกำเนิดแสงจะอยู่นอกจอจนมองไม่เห็น
  const [ex, ey] = toScreen(CAT.x + JUMP_X * 0.42, CAT.feet + jumpY(0.42) - 40);
  drawShine(ctx, t, Math.max(cw * 0.1, Math.min(cw * 0.92, ex)), Math.max(ch * 0.08, Math.min(ch * 0.9, ey)), cw, ch, u);

  // จางเข้าจากจอดำ
  const fade = 1 - span(t, 0, T.fadeIn);
  if (fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${fade})`;
    ctx.fillRect(0, 0, cw, ch);
  }

  // แสงขาวรอยต่อ — กลบจังหวะตัดจากในห้องไปนอกปราสาท
  const seam = seamFlash(t);
  if (seam > 0) {
    ctx.fillStyle = `rgba(255,255,255,${seam})`;
    ctx.fillRect(0, 0, cw, ch);
  }
}
