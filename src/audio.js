// src/audio.js
// สังเคราะห์เสียงเองด้วย Web Audio API — ไม่ต้องมีไฟล์เสียงสักไฟล์
// อยากปรับเสียงให้ถูกใจ ลองแก้ 3 อย่างนี้:
//   type  — square = 8-bit / sine = นุ่ม / sawtooth = แสบ / triangle = กลาง ๆ
//   ช่วงความถี่ — สูงขึ้น = สดใสขึ้น
//   dur   — สั้นลง = กระชับขึ้น

let ac = null;
let bus = null;

// ── ระดับเสียงสองช่อง ─────────────────────────────────────
//
// เก็บไว้ในเครื่องอย่างเดียว ไม่ซิงก์ขึ้นคลาวด์ เพราะเป็นค่าของ "เครื่องนี้"
// ไม่ใช่ของผู้เล่น — ต่อหูฟังกับเปิดลำโพงคนละระดับกัน
//
// ── ทำไมแยกเพลงกับเอฟเฟกต์ ──
// สองอย่างนี้ทำหน้าที่คนละอย่าง เพลงคือบรรยากาศที่เปิดค้างไว้นาน ส่วนเอฟเฟกต์
// คือสัญญาณว่าเกิดอะไรขึ้น คนที่เปิดเพลงของตัวเองอยู่ยังต้องการได้ยินสัญญาณ
// ตัวเลขเดียวคุมสองอย่างพร้อมกันจึงบังคับให้เลือกอย่างใดอย่างหนึ่งเสมอ
const MIX_KEY = { music: 'cookie-runner:vol:music', sfx: 'cookie-runner:vol:sfx' };
// คีย์ชุดเดิมสมัยยังมีระดับเดียว — ย้ายค่านั้นมาเป็นค่าตั้งต้นของทั้งสองช่อง
// คนที่เคยหรี่เสียงไว้จึงกลับมาเจอระดับเดิม ไม่ใช่เกมที่ดังขึ้นมาเอง
const LEGACY_VOL_KEY = 'cookie-runner:vol';
const VOL_DEFAULT = 0.8;   // เว้นหัวไว้ให้เพิ่มได้ ไม่ใช่เปิดมาสุดแล้วปุ่ม + กดไม่ขึ้น

function readVol(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    // ต้องเช็ค null ก่อนแปลงเป็นตัวเลข — Number(null) ได้ 0 ซึ่งผ่านทุกเงื่อนไข
    // ข้างล่างหมด กลายเป็นว่าคนเปิดเกมครั้งแรกเจอเกมเงียบสนิทโดยไม่รู้สาเหตุ
    if (raw === null || raw === '') return fallback;
    const v = Number(raw);
    return Number.isFinite(v) && v >= 0 && v <= 1 ? v : fallback;
  } catch {
    return fallback;   // โหมดส่วนตัวอ่านไม่ได้
  }
}

const legacyVol = readVol(LEGACY_VOL_KEY, VOL_DEFAULT);
// ── ระดับเสียงของบ้านลูกเหมียว (รวมมินิเกม) แยกจากทั้งเกม ── ตั้งที่ปุ่ม ⚙️ ในห้อง
// อยู่ในห้อง (setRoomAudio(true)) = ช่อง music/sfx ใช้ค่าชุดนี้แทน · ค่าตั้งต้น = ค่าของทั้งเกม
const ROOM_KEY = { music: 'cookie-runner:vol:room:music', sfx: 'cookie-runner:vol:room:sfx' };
let roomMode = false;
// หน้าเมืองแมวเหมียว (town.html) มีระดับเสียงของตัวเองอีกชุด — ตั้งในหน้าตั้งค่าของเมือง ไม่แตะค่าของเกม
const TOWN_KEY = { music: 'cookie-runner:vol:town:music', sfx: 'cookie-runner:vol:town:sfx' };
let townMode = false;
const level = {
  music: readVol(MIX_KEY.music, legacyVol),
  sfx: readVol(MIX_KEY.sfx, legacyVol),
  // ── ช่องของคลิปเปิดเกม ──
  // แยกจากสองช่องบนโดยตั้งใจ และ "ไม่" อ่านจากที่บันทึกไว้ของเกม
  // คนที่หรี่เพลงกับเอฟเฟกต์ของเกมเป็น 0 ไว้ ต้องยังได้ยินคลิปถ้าเปิดเสียงคลิปไว้
  // (เคยส่งเสียงคลิปผ่านสองช่องนั้น ผลคือปิดเสียงเกม = คลิปเงียบตามไปด้วย แยกกันไม่ได้จริง)
  // เปิด/ปิดเสียงคลิปคุมที่ปุ่มลำโพงในหน้าตั้งค่า ซึ่งเป็นคนละค่ากับระดับช่องนี้
  intro: 0.9,
};

/** ปมย่อยของแต่ละช่อง สร้างตอนถูกขอใช้ครั้งแรก */
const subBus = { music: null, sfx: null, intro: null };

/**
 * ── สวิตช์ปิดเสียงข้างเครื่องของ iPhone ──
 *
 * iOS แบ่งเสียงของหน้าเว็บเป็นสองประเภท: "ambient" (เสียงประกอบ) กับ "playback"
 * (สื่อที่ผู้ใช้ตั้งใจเปิดฟัง) ค่าเริ่มต้นของ Web Audio คือ ambient ซึ่ง
 * "โดนสวิตช์ปิดเสียงข้างเครื่องปิดทับเสมอ" ต่อให้เร่งเสียงในเกมจนสุดก็เงียบสนิท
 * — บนคอมไม่มีสวิตช์นี้ จึงได้ยินปกติ กลายเป็นอาการ "คอมมีเสียง มือถือเงียบ"
 *
 * ขอเปลี่ยนเป็น playback ตั้งแต่สร้าง context เกมจึงดังเหมือนแอปเพลง
 * ไม่ขึ้นกับสวิตช์นั้นอีก (Safari 17+ / Chrome บนแอนดรอยด์รุ่นใหม่)
 * เครื่องที่ไม่มี API นี้ก็ข้ามไปเงียบ ๆ ไม่มีอะไรเสียหาย
 */
function askPlaybackSession() {
  try {
    if (navigator.audioSession && navigator.audioSession.type !== 'playback') {
      navigator.audioSession.type = 'playback';
    }
  } catch {
    /* เบราว์เซอร์ไม่รองรับก็ใช้ค่าเดิมของมันไป */
  }
}

function ctx() {
  if (!ac) {
    // ── latencyHint: 'interactive' ──
    // บอกเบราว์เซอร์ว่าเสียงชุดนี้ต้องตอบสนองทันใจ ไม่ใช่เพลงที่เล่นยาว ๆ
    // มันจะเลือกบัฟเฟอร์เล็กที่สุดที่เครื่องไหว = เสียงออกเร็วขึ้นหลังสั่ง
    // ค่าเริ่มต้นของ Chrome เป็นแบบนี้อยู่แล้ว แต่ Safari/iOS เลือกบัฟเฟอร์ใหญ่กว่า
    // ถ้าไม่บอก ซึ่งคือที่มาของ "เสียงมาช้ากว่าภาพนิดหนึ่ง" บนมือถือ
    const AC = window.AudioContext || window.webkitAudioContext;
    try {
      ac = new AC({ latencyHint: 'interactive' });
    } catch {
      ac = new AC();   // เบราว์เซอร์เก่าที่ไม่รับ option ก็ใช้ค่าเริ่มต้นไป
    }
    // ── ทำไมต้องฟังเหตุการณ์ ไม่ใช่เช็ค state หลัง resume() ──
    // บน iOS คำสั่งปลุกตอบกลับมาก่อนที่ state จะเปลี่ยนเป็น running จริง
    // โค้ดที่เช็ค state ทันทีหลัง resume จึงเห็นว่า "ยังไม่ตื่น" แล้วไม่ทำงานที่ฝากไว้
    // ผลคือเพลงหน้าแรกไม่ดังและไฟล์เสียงคลิปไม่ถูกโหลดรอ — บนคอมไม่เจอเพราะ
    // Chrome เปลี่ยน state ให้เสร็จก่อนตอบกลับเสมอ
    ac.addEventListener('statechange', () => flushWakeQueue());
    askPlaybackSession();
  }
  return ac;
}

/** เคยมีการแตะ/กดจากผู้ใช้จริงแล้วหรือยัง (ตั้งจาก unlockAudio ซึ่งถูกเรียกจากการกดเท่านั้น) */
let touched = false;

/**
 * context สำหรับ "เสียงที่อยากดังตอนนี้" — คืน null ถ้ายังไม่ถึงเวลาที่สร้างได้
 *
 * ── ทำไมห้ามสร้างก่อนผู้ใช้แตะจอ ──
 * iOS ผูกสิทธิ์ใช้ระบบเสียงไว้กับการแตะจอของผู้ใช้ ระบบเสียงที่ถูกสร้างขึ้นก่อนหน้านั้น
 * จะเกิดมาในสภาพที่ปลุกไม่ขึ้นจริง สั่ง resume() แล้วรายงานว่า running ก็จริง
 * แต่ไม่มีเสียงออกสักตัวทั้งเกม (วัดจริงบน iPhone มาแล้ว)
 *
 * ตัวที่มาเรียกก่อนเวลาคือฉากหน้าแรก — น้องแมวส่งเสียงเหมียวเองระหว่างยืนรออยู่
 * ตั้งแต่ยังไม่มีใครแตะอะไรเลย ซึ่งเสียงนั้นไม่มีทางดังอยู่แล้วเพราะเบราว์เซอร์บล็อก
 * จึงไม่ต้องสร้างอะไรทั้งนั้น รอให้แตะก่อนแล้วค่อยเริ่มชีวิตระบบเสียง
 */
function liveCtx() {
  if (ac) return ac;
  if (touched) return ctx();
  const ua = navigator.userActivation;
  // เบราว์เซอร์ที่บอกได้ว่าเคยมีการกดไหม ให้เชื่อมัน (Chrome / Safari รุ่นใหม่)
  if (ua && ua.hasBeenActive) return ctx();
  return null;
}

/**
 * เสียงพร้อมใช้จริงตอนนี้ไหม — ถามได้โดยไม่ไปสร้าง context ขึ้นมาเอง
 * (สำคัญ: ถามด้วย audioCtx() จะกลายเป็นการสร้างระบบเสียงก่อนผู้ใช้แตะจอ
 *  ซึ่งเป็นต้นเหตุที่ iPhone เงียบทั้งเกม — ดู liveCtx)
 */
export function audioLive() {
  return !!ac && ac.state === 'running';
}

/**
 * สถานะระบบเสียง ณ ตอนนี้ — ใช้บอกผู้เล่นเวลาเงียบผิดปกติ
 *   none        ยังไม่เคยสร้างเลย (ยังไม่มีเสียงอะไรถูกสั่ง)
 *   running     พร้อมใช้จริง
 *   suspended   ยังไม่ได้ปลุก (เบราว์เซอร์รอให้แตะหน้าจอก่อน)
 *   interrupted iOS ตัดไปตอนมีสายเข้า/สลับแอป ต้องปลุกใหม่
 */
export function audioState() {
  return {
    state: ac ? ac.state : 'none',
    session: (navigator.audioSession && navigator.audioSession.type) || null,
    muted: level.music <= 0 && level.sfx <= 0,
  };
}

/**
 * ปมรวมของทั้งเกม — ทั้งเพลงและเอฟเฟกต์ไหลผ่านตัวนี้ก่อนออกลำโพง
 *
 * เดิมทุกเสียงต่อเข้า destination ตรง ๆ แล้วใช้ธง muted เช็คทีละจุด
 * ซึ่งปรับระดับเสียงไม่ได้เลย ทำได้แค่เปิดกับปิด
 *
 * ตอนนี้ตัวมันเองไม่หรี่อะไร (คงที่ 1) หน้าที่หรี่ย้ายไปอยู่ที่ปมของแต่ละช่อง
 * แต่ยังต้องมีอยู่ เพราะเป็นจุดเดียวที่รู้จัก destination — วันหลังจะใส่
 * เอฟเฟกต์รวมอย่างลิมิตเตอร์ก็แทรกตรงนี้ที่เดียว ไม่ต้องไล่แก้ทุกช่อง
 */
export function audioOut() {
  const a = ctx();
  if (!bus) {
    bus = a.createGain();
    bus.gain.value = 1;
    bus.connect(a.destination);
  }
  return bus;
}

/** ปมของช่องหนึ่ง — ทุกเสียงต้องต่อผ่านช่องของตัวเอง ไม่ต่อปมรวมตรง ๆ */
/** ระดับที่ใช้จริงตอนนี้ (ในห้อง = ค่าห้อง) */
function eff(ch) {
  if (townMode && ch in townLevel) return townLevel[ch];
  return roomMode && ch in roomLevel ? roomLevel[ch] : level[ch];
}

function chanOut(ch) {
  const a = ctx();
  if (!subBus[ch]) {
    const g = a.createGain();
    g.gain.value = eff(ch);
    g.connect(audioOut());
    subBus[ch] = g;
  }
  return subBus[ch];
}

export function musicOut() { return chanOut('music'); }
export function sfxOut() { return chanOut('sfx'); }

/**
 * เสียงเอฟเฟกต์กำลังถูกส่งไปช่องไหน
 *
 * ปกติคือช่อง sfx ของเกม แต่ระหว่างคลิปเปิดเกมจะสลับไปช่อง intro ทั้งชุด
 * เสียงในคลิป (กรน ท้องร้อง หาว เสียงปลา) จึงไม่ขึ้นกับระดับเสียงเอฟเฟกต์ของเกมเลย
 *
 * ทำที่ชั้นนี้ชั้นเดียว ตัวเสียงแต่ละตัวจึงไม่ต้องรู้เรื่องคลิปเลยสักตัว
 */
let sfxRoute = 'sfx';
export function setSfxRoute(ch) {
  sfxRoute = ch in level ? ch : 'sfx';
}
/**
 * ขยายเสียงเอฟเฟกต์ทั้งก้อน (หน้ารายละเอียดชุดระดับ S ในเกม — ผู้ใช้ 25 ต.ค. "ในเกมเสียงคลิปพรีวิวเบา")
 * boost ≠ 1 = เสียงใหม่วิ่งผ่านปมขยาย → ตัวกันเสียงแตก (compressor) → ช่องเดิม · เสียงที่ดังอยู่แล้วไม่เปลี่ยน
 */
let sfxBoost = 1, boostIn = null, boostTo = null;
export function setSfxBoost(x) {
  sfxBoost = x > 0 ? x : 1;
  if (boostIn) boostIn.gain.value = sfxBoost;
}
/** ปมปลายทางของเสียงเอฟเฟกต์ ณ ตอนนี้ (เปลี่ยนตาม setSfxRoute) */
function routeOut() {
  const out = chanOut(sfxRoute);
  if (sfxBoost === 1) return out;
  if (!boostIn || boostTo !== out) {
    const a = ctx();
    boostIn = a.createGain();
    const comp = a.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.knee.value = 8;
    comp.ratio.value = 6;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    boostIn.connect(comp);
    comp.connect(out);
    boostTo = out;
  }
  boostIn.gain.value = sfxBoost;
  return boostIn;
}
/** ระดับของช่องที่เสียงเอฟเฟกต์กำลังไป — ใช้ตัดตั้งแต่ต้นทางเวลาเงียบอยู่ */
const routeLevel = () => eff(sfxRoute);

const roomLevel = {
  music: readVol(ROOM_KEY.music, level.music),
  sfx: readVol(ROOM_KEY.sfx, level.sfx),
};
/** เข้า/ออกบ้านลูกเหมียว — สลับไปใช้ระดับเสียงชุดของห้อง */
export function setRoomAudio(on) {
  roomMode = !!on;
  for (const ch of Object.keys(subBus)) {
    if (subBus[ch]) subBus[ch].gain.setTargetAtTime(eff(ch), ctx().currentTime, 0.05);
  }
}
export function getRoomMix(ch) { return roomLevel[ch] ?? 0; }

const townLevel = {
  music: readVol(TOWN_KEY.music, level.music),
  sfx: readVol(TOWN_KEY.sfx, level.sfx),
};
/** หน้าเมือง — ใช้ระดับเสียงชุดของเมือง (เรียกครั้งเดียวตอนเปิดหน้า town.html) */
export function setTownAudio(on) {
  townMode = !!on;
  for (const ch of Object.keys(subBus)) {
    if (subBus[ch]) subBus[ch].gain.setTargetAtTime(eff(ch), ctx().currentTime, 0.05);
  }
}
export function getTownMix(ch) { return townLevel[ch] ?? 0; }
export function setTownMix(ch, v) {
  if (!(ch in townLevel)) return 0;
  townLevel[ch] = Math.max(0, Math.min(1, Math.round(v * 100) / 100));
  try { localStorage.setItem(TOWN_KEY[ch], String(townLevel[ch])); } catch { /* รอบนี้ยังใช้ได้ */ }
  if (subBus[ch] && townMode) subBus[ch].gain.setTargetAtTime(eff(ch), ctx().currentTime, 0.03);
  return townLevel[ch];
}
export function setRoomMix(ch, v) {
  if (!(ch in roomLevel)) return 0;
  roomLevel[ch] = Math.max(0, Math.min(1, Math.round(v * 100) / 100));
  try { localStorage.setItem(ROOM_KEY[ch], String(roomLevel[ch])); } catch { /* รอบนี้ยังใช้ได้ */ }
  if (subBus[ch] && roomMode) subBus[ch].gain.setTargetAtTime(eff(ch), ctx().currentTime, 0.03);
  return roomLevel[ch];
}

/** ระดับของช่องหนึ่ง 0–1 */
export function getMix(ch) {
  return level[ch] ?? 0;
}

/**
 * เสียงของ "ตัวเกม" ถูกหรี่จนเงียบหมดทั้งสองช่องหรือยัง
 *
 * ── ทำไมต้องมีฟังก์ชันนี้ ──
 * ระดับเสียงเก็บใน localStorage ซึ่งแยกกันคนละโดเมน (เครื่องเดียวกันแต่เปิดจาก
 * เว็บจริงกับจากเครื่องทดสอบในบ้าน = คนละที่เก็บ) หรี่ไว้ที่ไหนก็เงียบเฉพาะที่นั่น
 * ผู้เล่นจึงเจอ "เกมเดียวกันแต่ที่หนึ่งมีเสียง อีกที่หนึ่งเงียบสนิท" โดยไม่มีอะไรบอก
 * — เกิดขึ้นจริงมาแล้ว ใช้เวลาหาสาเหตุนานเพราะไม่มีร่องรอยให้เห็นบนหน้าจอเลย
 *
 * ช่องของคลิปเปิดเกมไม่นับ เพราะมันแยกจากเสียงเกมโดยตั้งใจ (คลิปยังดังได้ขณะเกมเงียบ)
 */
export function gameMuted() {
  return level.music <= 0 && level.sfx <= 0;
}

/** ตั้งระดับของช่องหนึ่ง คืนค่าที่ตั้งได้จริงหลังตัดให้อยู่ในช่วง 0–1 */
export function setMix(ch, v) {
  if (!(ch in level)) return 0;
  level[ch] = Math.max(0, Math.min(1, Math.round(v * 100) / 100));
  try {
    localStorage.setItem(MIX_KEY[ch], String(level[ch]));
  } catch {
    /* เซฟไม่ได้ก็ยังใช้ได้ในรอบนี้ */
  }
  if (subBus[ch]) {
    // ไล่ไปหาค่าใหม่แทนการกระโดด ไม่งั้นได้เสียง "ป๊อก" ทุกครั้งที่กดปุ่ม
    subBus[ch].gain.setTargetAtTime(eff(ch), ctx().currentTime, 0.03);
  }
  return level[ch];
}

/**
 * เบราว์เซอร์บล็อกเสียงจนกว่าผู้ใช้จะกดอะไรสักอย่าง
 * ต้องเรียกฟังก์ชันนี้ตอนกดปุ่มครั้งแรก ไม่งั้นจะเงียบสนิท
 *
 * ── ทำไมต้องคืน Promise ──
 * resume() ไม่ได้ตื่นทันทีที่เรียก มันคืนงานที่เสร็จอีกไม่กี่มิลลิวินาทีต่อมา
 * ระหว่างนั้น state ยังเป็น 'suspended' อยู่ ใครที่เช็ค state แล้วเลิกทำไปเลย
 * จะเงียบทั้งรอบโดยไม่มีใครมาลองใหม่ให้ — เป็นที่มาของบั๊ก "เพลงขึ้นบ้างไม่ขึ้นบ้าง"
 * (เพลงถูกสั่งทันทีที่กดปุ่ม ส่วนเสียงเอฟเฟกต์ยิงทีหลังจึงรอดมาตลอด)
 *
 * คนที่ต้องการเสียง "ตอนนี้" จึงควรรอ Promise นี้ก่อน แทนการเช็ค state เอง
 * เรียกซ้ำได้ ตื่นอยู่แล้วก็คืนงานที่เสร็จแล้วกลับไป
 */
/**
 * งานที่ต้องรอให้เสียง "ตื่น" ก่อนถึงทำได้
 *
 * ── ทำไมต้องมีคิวนี้ ──
 * iOS ไม่ยอมให้สร้างของในระบบเสียงก่อนผู้ใช้แตะจอ โดยเฉพาะการต่อไฟล์เสียง
 * เข้ากับกราฟ (createMediaElementSource) ถ้าไปทำตั้งแต่ตอนเปิดหน้า
 * ทั้ง context จะค้างอยู่ในสภาพที่ปลุกไม่ขึ้นจริง — สั่ง resume() แล้วรายงานว่า
 * running ก็จริง แต่ไม่มีเสียงออกสักตัวทั้งเกม (เจอจริงบน iPhone: หน้าทดสอบ
 * ที่สร้าง context ตอนแตะปุ่มดังปกติ ส่วนตัวเกมที่สร้างไว้ตั้งแต่เปิดหน้าเงียบสนิท)
 *
 * ของที่อยากทำล่วงหน้าจึงต้องฝากไว้ที่นี่ แล้วจะถูกทำให้ทันทีที่เสียงตื่นจริง
 */
const wakeQueue = [];
export function whenAudioAwake(fn) {
  if (ac && ac.state === 'running') {
    fn();
    return;
  }
  wakeQueue.push(fn);
}

function flushWakeQueue() {
  // เรียกจากหลายทาง (ตอนปลุก / ตอน state เปลี่ยน) จึงต้องกันไว้เองว่าตื่นจริงแล้ว
  if (!ac || ac.state !== 'running') return;
  while (wakeQueue.length) {
    const fn = wakeQueue.shift();
    try {
      fn();
    } catch {
      /* งานเตรียมของชิ้นหนึ่งพังห้ามลามไปหยุดชิ้นอื่น */
    }
  }
}

let waking = null;
export function unlockAudio() {
  // ถูกเรียกจากการกด/แตะของผู้ใช้เท่านั้น จึงใช้เป็นสัญญาณว่า "มีสิทธิ์ใช้เสียงแล้ว" ได้
  touched = true;
  // ขอโหมด playback ซ้ำทุกครั้งที่ปลุก — iOS รีเซ็ตกลับเป็น ambient ได้เองหลังถูกขัดจังหวะ
  askPlaybackSession();
  const a = ctx();
  // ── ตื่นอยู่แล้วก็ต้องเคลียร์คิวด้วย ──
  // ทางนี้คือทางที่เกิดบ่อยที่สุดบนคอม: context ถูกสร้างตอนคลิกแรกแล้วตื่นทันที
  // ไม่ต้อง resume() เลย ของที่ฝากไว้ก่อนหน้านั้น (เพลงหน้าแรก / โหลดเสียงคลิป)
  // จึงค้างอยู่ในคิวตลอดกาล = เพลงหน้าแรกไม่ดังเลย และเสียงคลิปมาช้าเพราะไม่ได้โหลดรอ
  if (a.state === 'running') {
    flushWakeQueue();
    return Promise.resolve(true);
  }
  if (!waking) {
    waking = a.resume()
      .then(() => {
        // ตื่นแล้วค่อยทำงานที่ฝากไว้ — ตรงนี้อยู่หลังการแตะจอเสมอ ซึ่งเป็นเงื่อนไขของ iOS
        if (a.state === 'running') flushWakeQueue();
        return a.state === 'running';
      })
      .catch(() => false)
      .finally(() => { waking = null; });
  }
  return waking;
}

/** ให้โมดูลเพลงใช้ context เดียวกัน ไม่งั้นจะได้ AudioContext ซ้อนสองตัว */
export function audioCtx() {
  return ctx();
}

// ── ตัดเสียงเอฟเฟกต์กลางทาง ──────────────────────────────────
//
// เสียงเอฟเฟกต์ไม่ได้ดังจบในเฟรมที่สั่ง เสียงร้องของน้องยาวได้ถึง 0.9 วินาที
// และเสียงหลายตัวเป็น "ชุด" ที่ทยอยออกทีละส่วนด้วยตัวจับเวลา (ดู later())
//
// เวลาหยุดเกม สองอย่างนี้จึงต้องถูกตัดพร้อมกัน:
//   1. ตัวที่กำลังดังอยู่       — หรี่ปมขาออกลงให้เงียบ
//   2. ตัวที่ตั้งเวลารอคิวอยู่  — ล้างตัวจับเวลาทิ้ง ไม่ให้มันเกิดขึ้นเลย
// ถ้าตัดแค่ข้อแรก เสียงส่วนหลังของชุดจะโผล่มาดังในหน้าที่เกมหยุดไปแล้ว
//
// ── ทำไมเก็บ "ปมขาออก" ไม่ใช่ตัว oscillator ──
// หยุด oscillator ตรง ๆ คือตัดคลื่นกลางลูก ได้เสียง "ป๊อก" ทุกครั้ง
// หรี่ปมลงใน 25 มิลลิวินาทีแทน แล้วปล่อยให้ oscillator จบเองตามกำหนดเดิม
// ซึ่งเป็นเหตุผลเดียวกับที่ tone() กับ meow() ทุกตัวมี fade out ปิดท้ายอยู่แล้ว
// ─────────────────────────────────────────────────────────────

/** ปมขาออกของเสียงที่ยังไม่จบ พร้อมเวลาที่มันจะจบ */
let liveSfx = [];
/** ตัวจับเวลาของเสียงชุดที่ยังไม่ออก */
let sfxTimers = [];

/**
 * ตั้งเวลายิงเสียงส่วนถัดไปของชุดเดียวกัน — ใช้แทน setTimeout ทุกที่ในไฟล์นี้
 * จำ id ไว้เพื่อให้ killSfx() ล้างได้ ถ้าใช้ setTimeout ตรง ๆ จะล้างไม่ได้เลย
 */
function later(fn, ms) {
  const id = setTimeout(() => {
    sfxTimers = sfxTimers.filter((t) => t !== id);
    fn();
  }, ms);
  sfxTimers.push(id);
  return id;
}

/** จำปมขาออกไว้ตัดทีหลัง พร้อมทิ้งตัวที่เล่นจบไปแล้วออกจากรายการ */
function trackSfx(gain, endAt) {
  const now = ctx().currentTime;
  liveSfx = liveSfx.filter((s) => s.endAt > now);
  liveSfx.push({ gain, endAt });
}

/**
 * ทำให้เสียงเอฟเฟกต์เงียบทันที ทั้งตัวที่ดังอยู่และตัวที่รอคิว
 *
 * ไม่แตะระดับเสียงของช่อง เสียงที่สั่งขึ้นมา "หลัง" การตัดจึงดังปกติ
 * ซึ่งจำเป็น เพราะเสียงปุ่มหยุดเองก็ออกหลังการตัด (ดู setPaused ใน main.js)
 */
export function killSfx() {
  for (const id of sfxTimers) clearTimeout(id);
  sfxTimers = [];
  if (!ac) return;

  const t = ac.currentTime;
  for (const s of liveSfx) {
    try {
      const g = s.gain.gain;
      // ค้างค่าปัจจุบันไว้ก่อนแล้วค่อยหรี่ ไม่งั้นคำสั่งที่จองไว้เดิมจะชนะ
      // แล้วเสียงจะดังต่อเหมือนไม่ได้ตัดอะไรเลย
      // ต้องกัน 0 ด้วย เพราะ exponential ramp ใช้กับศูนย์ไม่ได้ (โยน error)
      const v = Math.max(0.0001, g.value);
      g.cancelScheduledValues(t);
      g.setValueAtTime(v, t);
      g.exponentialRampToValueAtTime(0.0001, t + 0.025);
    } catch {
      /* ปมถูกเก็บคืนไปแล้ว ไม่มีอะไรต้องตัด */
    }
  }
  liveSfx = [];
}

/**
 * จางเสียงเอฟเฟกต์ที่ดังอยู่ลงช้า ๆ ใน sec วินาที + ทิ้งเสียงชุดที่รอคิว — ใช้ตอนกดข้ามท่าเปิดตัวสกิน
 * (killSfx ตัดใน 25ms เหมาะกับหยุดเกม แต่ข้ามท่าต้องค่อย ๆ เบาลงไม่ให้สะดุดหู)
 */
export function fadeSfx(sec = 0.3) {
  for (const id of sfxTimers) clearTimeout(id);
  sfxTimers = [];
  if (!ac) return;
  const t = ac.currentTime;
  for (const s of liveSfx) {
    try {
      const g = s.gain.gain;
      const v = Math.max(0.0001, g.value);
      g.cancelScheduledValues(t);
      g.setValueAtTime(v, t);
      g.exponentialRampToValueAtTime(0.0001, t + sec);
    } catch {
      /* เล่นจบไปแล้ว */
    }
  }
  liveSfx = [];
}

function tone(from, to, dur, type = 'square', vol = 0.12) {
  if (routeLevel() <= 0) return;   // ปมรวมกรองให้อยู่แล้ว ตัดตรงนี้ไว้เพื่อไม่สร้าง node ทิ้ง
  // ยังไม่เคยแตะจอ = ยังไม่มีสิทธิ์สร้างระบบเสียง (ดู liveCtx) เสียงนี้ไม่ดังอยู่แล้ว
  const a = liveCtx();
  if (!a) return;
  // ตื่นไม่ทัน: ปลุกไว้ก่อนแล้วเล่นต่อไปเลย — เสียงที่จองไว้จะดังทันทีที่ตื่น
  // (ของเดิม return ทิ้งเงียบ ๆ ซึ่งบนมือถือที่ปลุกช้ากว่าคอมคือเสียงหายไปดื้อ ๆ)
  if (a.state !== 'running') unlockAudio();

  const t = a.currentTime;
  const osc = a.createOscillator();
  const gain = a.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);

  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);  // fade out กันเสียง "ป๊อก"

  osc.connect(gain);
  gain.connect(routeOut());
  osc.start(t);
  osc.stop(t + dur + 0.02);
  trackSfx(gain, t + dur + 0.02);
}

/**
 * เสียงซ่า (noise) ผ่านฟิลเตอร์ — สำหรับเสียงที่ไม่มีระดับเสียงแน่นอน
 * น้ำกระเซ็น ฟองสบู่ เม็ดอาหารร่วงลงชาม เคี้ยวกรุบ ฝีเท้า ซึ่ง tone() กับ meow() ทำไม่ได้
 * (คลื่นที่มีระดับเสียงฟังเป็น "โน้ต" เสมอ ต่อให้สั้นแค่ไหน)
 *
 * ใช้บัฟเฟอร์สุ่มก้อนเดียวทั้งเกม แล้วเริ่มเล่นจากจุดสุ่ม — ไม่ต้องสร้างใหม่ทุกครั้ง
 * และเสียงสองครั้งติดกันไม่ซ้ำกันเป๊ะ ซึ่งจะฟังเป็นเสียงเครื่องจักร
 *
 * @param type   ชนิดฟิลเตอร์: bandpass = เสียงเฉพาะช่วง (กรุบ/ซ่า) / lowpass = ทุ้มอู้ (ตุ้บ/ฟู่)
 * @param freqTo กวาดความถี่ฟิลเตอร์ไปถึงค่านี้ตอนจบ (น้ำกระเซ็นแล้วจางลงเป็นทุ้ม)
 */
let noiseBuf = null;
function noise({ dur = 0.1, vol = 0.1, type = 'bandpass', freq = 2000, freqTo = null, q = 1, attack = 0.004 } = {}) {
  if (routeLevel() <= 0) return;
  const a = liveCtx();
  if (!a) return;
  if (a.state !== 'running') unlockAudio();
  if (!noiseBuf) {
    const n = Math.floor(a.sampleRate);
    noiseBuf = a.createBuffer(1, n, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = a.currentTime;
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = a.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + Math.min(attack, dur * 0.8));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(routeOut());
  src.start(t, Math.random() * 0.8);
  src.stop(t + dur + 0.02);
  trackSfx(g, t + dur + 0.02);
}

const rnd = (a, b) => a + Math.random() * (b - a);

/**
 * กระดิ่งแก้ว — โน้ตหลัก sine + โอเวอร์โทนแบบระฆัง (2.76 และ 5.4 เท่า ไม่ใช่ฮาร์มอนิกตรง)
 * ที่จางเร็วกว่าโน้ตหลัก = หัวเสียง "กริ๊ง" ใส ๆ แล้วเหลือเสียงหวานกังวาน (ใช้กับเสียงเวทมนตร์ของสกิน)
 */
function glassBell(f, dur = 0.6, vol = 0.05) {
  tone(f, null, dur, 'sine', vol);
  tone(f * 2.76, null, dur * 0.42, 'sine', vol * 0.3);
  tone(f * 5.4, null, dur * 0.18, 'sine', vol * 0.12);
}

/**
 * กล่องดนตรี — triangle (หวานกว่า sine มีเนื้อ) + คู่แปดบนเบา ๆ จางเร็ว = เสียงหวีดเหล็กเล็ก ๆ ของกล่องดนตรี
 */
function musicBox(f, dur = 0.55, vol = 0.05) {
  tone(f, null, dur, 'triangle', vol);
  tone(f * 2, null, dur * 0.45, 'sine', vol * 0.35);
  tone(f * 3.01, null, dur * 0.2, 'sine', vol * 0.12);
}

/**
 * เสียงร้องของแมว — คลื่นเปล่า ๆ จาก tone() ทำเสียงนี้ไม่ได้ เพราะฟังเป็น "บี๊บ"
 * สิ่งที่ทำให้ฟังเป็นเสียงร้องคือสามอย่างนี้รวมกัน:
 *   1. sawtooth  — มีฮาร์มอนิกเยอะเหมือนเสียงจากสายเสียงจริง
 *   2. bandpass ที่กวาดตามระดับเสียง — เลียนฟอร์แมนต์ คือสิ่งที่ทำให้เกิด "สระ"
 *      ของคำว่าเมี้ยว ถ้าตัดตัวนี้ออกจะเหลือแค่เสียงหวีดเลื่อนขึ้นลง
 *   3. LFO สั่นเบา ๆ — เสียงสัตว์จริงไม่เคยนิ่งสนิท ถ้านิ่งจะฟังเป็นเครื่องสังเคราะห์
 *
 * รูปทรงระดับเสียง: พุ่งขึ้นเร็วแล้วลากลงยาว = "เมี้ย~ว"
 * ยิ่ง end ต่ำกว่า start มาก ยิ่งฟังอ้อน ๆ น่าสงสาร
 */
function meow({ start, peak, end, dur, vol = 0.13, q = 6, wobble = 24 }) {
  if (routeLevel() <= 0) return;
  // ยังไม่เคยแตะจอ = ยังไม่มีสิทธิ์สร้างระบบเสียง (ดู liveCtx) เสียงนี้ไม่ดังอยู่แล้ว
  const a = liveCtx();
  if (!a) return;
  // ตื่นไม่ทัน: ปลุกไว้ก่อนแล้วเล่นต่อไปเลย — เสียงที่จองไว้จะดังทันทีที่ตื่น
  // (ของเดิม return ทิ้งเงียบ ๆ ซึ่งบนมือถือที่ปลุกช้ากว่าคอมคือเสียงหายไปดื้อ ๆ)
  if (a.state !== 'running') unlockAudio();

  const t = a.currentTime;
  const osc = a.createOscillator();
  const filt = a.createBiquadFilter();
  const gain = a.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(start, t);
  osc.frequency.exponentialRampToValueAtTime(peak, t + dur * 0.16);
  osc.frequency.exponentialRampToValueAtTime(end, t + dur);

  filt.type = 'bandpass';
  filt.Q.value = q;
  filt.frequency.setValueAtTime(start * 1.7, t);
  filt.frequency.exponentialRampToValueAtTime(peak * 2, t + dur * 0.2);
  filt.frequency.exponentialRampToValueAtTime(end * 1.5, t + dur);

  // ── หัวเสียงต้องมาไว ──
  // ของเดิมไล่ขึ้น 25 มิลลิวินาที ซึ่งเป็นหูที่ได้ยินว่า "เสียงมาช้ากว่าภาพ"
  // วัดจริง: กดกระโดดแล้วเสียงโผล่ที่ 26.5ms ส่วนเสียงลงพื้น (ไม่มีหัวไล่) โผล่ที่ 5.1ms
  // สองเสียงนี้อยู่ในเกมเดียวกันแต่มาไม่พร้อมกัน จึงรู้สึกว่าจังหวะไม่ตรง
  // 7ms ยังนุ่มพอที่จะไม่เกิดเสียง "คลิก" ตอนเริ่ม แต่ไวขึ้นสามเท่า
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.007);   // เข้าเร็วแบบเสียงร้อง
  gain.gain.setValueAtTime(vol, t + dur * 0.5);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  const lfo = a.createOscillator();
  const lfoGain = a.createGain();
  lfo.frequency.value = wobble;
  lfoGain.gain.value = start * 0.035;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);   // ต่อเข้า AudioParam ต่อพ่วงไม่ได้ ต้องแยกบรรทัด

  osc.connect(filt);
  filt.connect(gain);
  gain.connect(routeOut());

  osc.start(t);
  lfo.start(t);
  osc.stop(t + dur + 0.05);
  lfo.stop(t + dur + 0.05);
  trackSfx(gain, t + dur + 0.05);
}

/**
 * เสียงท้องร้อง — "โครก~"
 *
 * ── สิ่งที่ทำให้ฟังเป็นท้อง ไม่ใช่เสียงคำราม ──
 * เสียงท้องจริงคือแก๊สกับน้ำไหลผ่านลำไส้ มันจึงไม่ใช่เสียงต่อเนื่องเรียบ ๆ
 * แต่เป็น "ฟองที่แตกเป็นห้วงถี่ ๆ" ซึ่งทำได้ด้วยสามอย่างรวมกัน:
 *   1. sawtooth ต่ำ ๆ    — ให้เนื้อเสียงหนา ๆ ทุ้ม ๆ
 *   2. bandpass ที่กวาดขึ้นลง — ให้มันฟังเป็นเสียงอู้อี้จากข้างใน ไม่ใช่ลำโพงตรง ๆ
 *   3. กระพือความดังเร็ว ๆ (bubble) ด้วยความถี่ที่ไม่คงที่ — นี่คือส่วนที่ทำให้ฟังเป็น "โครก"
 *      ถ้ากระพือด้วยจังหวะคงที่เป๊ะจะฟังเป็นมอเตอร์ ต้องให้มันเร่งแล้วช้าลงระหว่างทาง
 *
 * ระดับเสียงกวาดลงตอนท้ายเล็กน้อย เหมือนฟองสุดท้ายที่ค่อย ๆ หมดแรง
 */
function growl({ dur = 1.1, base = 92, vol = 0.34, bubble = 19 } = {}) {
  if (routeLevel() <= 0) return;
  // ยังไม่เคยแตะจอ = ยังไม่มีสิทธิ์สร้างระบบเสียง (ดู liveCtx) เสียงนี้ไม่ดังอยู่แล้ว
  const a = liveCtx();
  if (!a) return;
  // ตื่นไม่ทัน: ปลุกไว้ก่อนแล้วเล่นต่อไปเลย — เสียงที่จองไว้จะดังทันทีที่ตื่น
  // (ของเดิม return ทิ้งเงียบ ๆ ซึ่งบนมือถือที่ปลุกช้ากว่าคอมคือเสียงหายไปดื้อ ๆ)
  if (a.state !== 'running') unlockAudio();

  const t = a.currentTime;
  const osc = a.createOscillator();
  const filt = a.createBiquadFilter();
  const gain = a.createGain();
  const trem = a.createGain();     // ตัวกระพือ — คูณทับบนเส้นความดังหลัก

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(base * 1.12, t);
  osc.frequency.linearRampToValueAtTime(base * 0.86, t + dur * 0.45);
  osc.frequency.linearRampToValueAtTime(base * 1.05, t + dur * 0.7);
  osc.frequency.exponentialRampToValueAtTime(base * 0.7, t + dur);

  filt.type = 'bandpass';
  filt.Q.value = 2.6;
  filt.frequency.setValueAtTime(base * 2.6, t);
  filt.frequency.linearRampToValueAtTime(base * 4.2, t + dur * 0.35);
  filt.frequency.linearRampToValueAtTime(base * 2.2, t + dur);

  // เส้นความดังหลัก: เข้าเร็ว ค้างไว้ แล้วลากหาย
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.06);
  gain.gain.setValueAtTime(vol, t + dur * 0.55);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  // ฟอง: LFO แบบสี่เหลี่ยมกระพือความดัง ความถี่เร่งขึ้นช่วงกลางแล้วช้าลงตอนจบ
  const lfo = a.createOscillator();
  const depth = a.createGain();
  lfo.type = 'square';
  lfo.frequency.setValueAtTime(bubble * 0.6, t);
  lfo.frequency.linearRampToValueAtTime(bubble, t + dur * 0.4);
  lfo.frequency.linearRampToValueAtTime(bubble * 0.45, t + dur);
  depth.gain.value = 0.42;
  trem.gain.value = 0.58;          // 0.58 ± 0.42 = กระพือระหว่าง 0.16 ถึง 1
  lfo.connect(depth);
  depth.connect(trem.gain);

  osc.connect(filt);
  filt.connect(trem);
  trem.connect(gain);
  gain.connect(routeOut());

  osc.start(t);
  lfo.start(t);
  osc.stop(t + dur + 0.05);
  lfo.stop(t + dur + 0.05);
  trackSfx(gain, t + dur + 0.05);
}

// ─────────────────────────────────────────────────────────────
// เรื่อง vol ของเสียงแมว: ตัวเลขเทียบกับ tone() ตรง ๆ ไม่ได้
// bandpass ตัดพลังงานทิ้งไปราว 2.4 เท่า เสียงแมว vol 0.12 จึงดังจริง
// แค่ครึ่งเดียวของเสียงเก็บของที่ vol 0.10 ซึ่งต่อตรงไม่ผ่านฟิลเตอร์
// ค่าที่ตั้งไว้ล่างนี้วัดจากของจริงแล้วให้ดังกว่าเสียงเก็บของเล็กน้อย
// เพราะเป็น "เสียงตัวละคร" ควรเด่นกว่าเสียงไอเทม
// ถ้าแก้ q ต้องวัดความดังใหม่ทุกครั้ง เพราะ q ยิ่งสูงยิ่งเบา
// ─────────────────────────────────────────────────────────────
// ── เล่นไฟล์เสียง ────────────────────────────────────────────
//
// เสียงในเกมสังเคราะห์เองทั้งหมด ยกเว้นคลิปเปิดเกมที่ใช้ไฟล์จริงสองไฟล์
// (เพลงประกอบคลิป กับเสียงท้องร้อง) — ของสองอย่างนี้เป็นเสียงที่ "อัดมา" ไม่ใช่เสียงสังเคราะห์
//
// ต่อผ่านปมของช่องเดิม (music / sfx) เสียงจึงหรี่และปิดตามหน้าตั้งค่าเหมือนเสียงอื่นทุกตัว
// ไม่ต้องเช็คการปิดเสียงเองเลยสักจุด
//
// ── ทำไมเก็บ element ไว้ใช้ซ้ำ ──
// createMediaElementSource() ผูกกับ <audio> ตัวหนึ่งได้ครั้งเดียวตลอดอายุของมัน
// สร้างใหม่ทุกครั้งที่เล่นจะได้ error ตั้งแต่ครั้งที่สอง และไฟล์ต้องโหลดใหม่ทุกครั้งด้วย

const clips = new Map();

function clipOf(src, ch) {
  let c = clips.get(src);
  if (c) return c;
  const a = ctx();
  const el = new Audio(src);
  el.preload = 'auto';
  const gain = a.createGain();
  gain.gain.value = 0;
  a.createMediaElementSource(el).connect(gain);
  gain.connect(chanOut(ch));
  c = { el, gain, ch, failed: false, timer: 0 };
  // โหลดไม่ได้ (ไฟล์หาย/เน็ตพัง) ผู้เรียกจะได้รู้แล้วถอยไปใช้เสียงสังเคราะห์แทน
  el.addEventListener('error', () => { c.failed = true; });
  clips.set(src, c);
  return c;
}

/**
 * โหลดไฟล์รอไว้ล่วงหน้า
 * ถ้าไปโหลดตอนถึงจังหวะที่ต้องใช้ เสียงจะดังช้ากว่าภาพที่มันควรตรงด้วย
 */
export function prepareAudioFile(src, ch = 'sfx') {
  try {
    primeClip(clipOf(src, ch));
  } catch {
    /* เตรียมไม่ได้ก็ไม่เป็นไร ตอนเล่นจริงจะลองใหม่เอง */
  }
}

/**
 * "จุดติด" ไฟล์เสียงหนึ่งครั้ง — สั่งเล่นแล้วหยุดทันที
 *
 * ── ทำไมต้องทำ ──
 * iOS ไม่สนใจ preload="auto" มันจะไม่แตะไฟล์เลยจนกว่าจะเคยถูกสั่งเล่น
 * ในจังหวะที่ผู้ใช้แตะจอ ผลคือพอถึงจังหวะที่ต้องดังจริง (เสียงท้องร้องในคลิป)
 * มันเพิ่งเริ่มโหลดตอนนั้น เสียงจึงมาช้ากว่าภาพ — แต่ "จุดจบ" ยังตรงเวลาเดิม
 * เพราะคำสั่งหยุดตั้งไว้ตามนาฬิกา ไม่ได้ตามตัวไฟล์ (ตรงกับอาการที่เจอเป๊ะ)
 *
 * ระดับเสียงของคลิปยังเป็นศูนย์อยู่ตอนนี้ การจุดติดจึงไม่มีใครได้ยิน
 */
function primeClip(c) {
  if (c.primed) return;
  c.primed = true;
  try {
    const p = c.el.play();
    if (p && p.then) {
      p.then(() => {
        // ถ้าระหว่างนั้นมีคำสั่งเล่นจริงเข้ามาแล้ว ห้ามไปหยุดของจริง
        if (c.wantPlay) return;
        c.el.pause();
        try { c.el.currentTime = 0; } catch { /* ยังไม่มีข้อมูลไฟล์ */ }
      }).catch(() => { /* เบราว์เซอร์ยังไม่ยอมก็ข้ามไป ตอนเล่นจริงจะลองใหม่ */ });
    }
  } catch {
    /* เล่นไม่ได้ตอนนี้ก็ไม่เป็นไร */
  }
}

/**
 * เล่นไฟล์เสียงหนึ่งไฟล์ — คืน false ถ้าเล่นไม่ได้ (ปิดเสียงอยู่ / ยังไม่ปลดล็อก / ไฟล์เสีย)
 * ผู้เรียกเอาค่านี้ไปตัดสินใจถอยไปใช้เสียงสังเคราะห์แทนได้
 *
 * @param dur    ถ้ามากกว่า 0 = ให้หรี่ลงแล้วหยุดเมื่อครบเวลานี้ (วินาที)
 *               ใช้กับไฟล์ที่ยาวกว่าช่วงที่ต้องการ เช่นเสียงท้องร้องที่ต้องจบพร้อมจังหวะในคลิป
 * @param fadeIn เวลาที่ใช้ไล่ความดังขึ้นตอนเริ่ม กันเสียง "ป๊อก" ตอนโน้ตแรก
 */
export function playAudioFile(src, { ch = 'sfx', vol = 0.9, dur = 0, fadeIn = 0, fade = 0.12 } = {}) {
  if (eff(ch) <= 0) return false;

  let c;
  try {
    c = clipOf(src, ch);
  } catch {
    return false;
  }
  if (c.failed) return false;

  // ── เสียงยังไม่ตื่น: รอแล้วเล่นเอง ไม่ใช่ยอมแพ้ ──
  // เดิมคืน false ตรงนี้ ผลคือเพลงคลิปที่ถูกสั่งทันทีที่กดปุ่มไม่เคยได้เล่นเลย
  // ทั้งที่อีกไม่กี่มิลลิวินาทีต่อมาเสียงก็พร้อมแล้ว (ดู unlockAudio)
  // คืน true เพราะกำลังจะเล่นจริง ผู้เรียกจึงไม่ต้องถอยไปใช้เสียงสังเคราะห์
  if (ctx().state !== 'running') {
    c.pending = true;
    unlockAudio().then((ok) => {
      if (ok && c.pending) startClip(c, src, { vol, dur, fadeIn, fade });
      c.pending = false;
    });
    return true;
  }

  startClip(c, src, { vol, dur, fadeIn, fade });
  return true;
}

/** เริ่มเล่นจริง — แยกออกมาเพราะถูกเรียกได้สองทาง: ทันที กับ หลังรอเสียงตื่น */
function startClip(c, src, { vol, dur, fadeIn, fade }) {
  c.wantPlay = true;   // กันไม่ให้การ "จุดติด" ที่ค้างอยู่มาสั่งหยุดของจริง
  const a = ctx();
  const t = a.currentTime;
  clearTimeout(c.timer);
  c.gain.gain.cancelScheduledValues(t);
  if (fadeIn > 0) {
    c.gain.gain.setValueAtTime(0.0001, t);
    c.gain.gain.exponentialRampToValueAtTime(vol, t + fadeIn);
  } else {
    c.gain.gain.setValueAtTime(vol, t);
  }

  try { c.el.currentTime = 0; } catch { /* ยังไม่มีข้อมูลไฟล์ ก็เล่นจากที่ค้างอยู่ */ }
  c.el.play().catch(() => { c.failed = true; });

  // หยุดเองเมื่อครบเวลาที่ขอ — หรี่ก่อนแล้วค่อย pause ไม่ตัดห้วน
  if (dur > 0) {
    c.timer = setTimeout(() => stopAudioFile(src, fade), Math.max(0, dur - fade) * 1000);
  }
}

/**
 * หยุดไฟล์เสียงค้างไว้ตรงที่เล่นถึง แล้วเล่นต่อจากจุดเดิมได้ (ปุ่มหยุด/เล่นต่อ)
 *
 * ต่างจาก stopAudioFile ตรงที่ไม่หรี่และไม่รีเซ็ตตำแหน่ง — เสียงต้องกลับมาต่อจุดเดิมเป๊ะ
 * ไม่งั้นภาพกับเพลงจะคลาดกันทุกครั้งที่กดหยุด
 * ไม่แตะ wantPlay เพราะไฟล์นี้ยังถือว่า "กำลังเล่นอยู่" แค่ค้างไว้ชั่วคราว
 */
export function pauseAudioFile(src) {
  const c = clips.get(src);
  if (!c || c.el.paused) return false;
  c.el.pause();
  return true;
}

/** เล่นต่อจากจุดที่ pauseAudioFile ค้างไว้ */
export function resumeAudioFile(src) {
  const c = clips.get(src);
  if (!c || !c.wantPlay || !c.el.paused) return false;
  c.el.play().catch(() => { c.failed = true; });
  return true;
}

/** หรี่ลงจนเงียบแล้วหยุด — เรียกซ้ำได้ ไฟล์ที่ไม่ได้เล่นอยู่ก็ไม่มีอะไรเกิดขึ้น */
export function stopAudioFile(src, fade = 0.3) {
  const c = clips.get(src);
  if (!c) return;
  // สั่งหยุดระหว่างที่ยังรอเสียงตื่นอยู่ = ยกเลิกคิวทิ้ง ไม่งั้นมันจะมาเริ่มเล่นทีหลัง
  // ตอนที่คลิปจบไปแล้ว (เช่นกดข้ามคลิปก่อนเสียงจะทันได้เล่น)
  c.pending = false;
  c.wantPlay = false;
  if (c.el.paused) return;
  const a = ctx();
  const t = a.currentTime;
  clearTimeout(c.timer);
  c.gain.gain.cancelScheduledValues(t);
  // ต้องตรึงค่าปัจจุบันไว้ก่อนไล่ลง ไม่งั้นมันจะกระโดดไปเริ่มไล่จากค่าที่ตั้งไว้ล่าสุดแทน
  c.gain.gain.setValueAtTime(Math.max(0.0001, c.gain.gain.value), t);
  c.gain.gain.exponentialRampToValueAtTime(0.0001, t + fade);
  c.timer = setTimeout(() => c.el.pause(), fade * 1000 + 40);
}

/**
 * เพลงไทยโรแมนติกของท่าเปิดตัวคู่ (สไบไทย / หนุ่มไทยโจงกระเบน) — ท่อนละ 4 จังหวะที่ 72 bpm (3.33 วิ = 200 เฟรม)
 * ทำนอง [จังหวะ, ความถี่, ยาวกี่จังหวะ] · คอร์ด = เบส + เสียงประสานค้าง · ท่อน 4 = ปิดเพลง (ลงโด ค้างยาว)
 * เสียงยาว (≥ 1 จังหวะ) = ขิมรัว (ตีซ้ำถี่ ๆ ค่อย ๆ เบาลง) · เสียงสั้น = ระนาดเอก (ไม้นวม)
 */
const PAIR_SONG = [
  { mel: [[0, 659, 1], [1, 784, 0.5], [1.5, 880, 0.5], [2, 784, 1], [3, 659, 0.5], [3.5, 587, 0.5]], bass: [131, 196], pad: [262, 330, 392] },
  { mel: [[0, 587, 1], [1, 659, 0.5], [1.5, 784, 0.5], [2, 659, 1.5], [3.5, 587, 0.5]], bass: [110, 165], pad: [220, 262, 330] },
  { mel: [[0, 523, 0.5], [0.5, 587, 0.5], [1, 659, 1], [2, 784, 0.5], [2.5, 880, 0.5], [3, 1046, 1]], bass: [98, 147], pad: [196, 294, 392] },
  { mel: [[0, 880, 0.75], [0.75, 784, 0.25], [1, 659, 1], [2, 587, 0.5], [2.5, 659, 0.5], [3, 523, 1]], bass: [131, 196], pad: [262, 330, 392] },
  { mel: [[0, 784, 0.5], [0.5, 880, 0.5], [1, 1046, 3]], bass: [131, 98], pad: [262, 330, 392, 523] },
  // ท่อนสั้นครึ่งท่อน (2 จังหวะ) — เติมช่องก่อนเพลงหยุดรอโลกสีชมพู
  { mel: [[0, 659, 1], [1, 587, 1]], bass: [131], pad: [262, 330, 392], beats: 2 },
];
/** ความดังรวมของเพลงประกอบ (ผู้ใช้ 24 ต.ค. "เบากว่านี้หน่อย" — เดิม 1) */
const PAIR_SONG_VOL = 0.3;   // รอบสอง (ผู้ใช้ 24 ต.ค.): เบาแบบคลอ ๆ ใต้เสียงเอฟเฟกต์ แต่ยังได้ยิน
/**
 * เพลงประกอบท่าเปิดตัวสกิน S ที่เหลือ (ผู้ใช้ 25 ต.ค. "สร้างเพลงประกอบให้คลิปพรีวิวระดับ S ทั้งหมด")
 * ท่อนละ 4 จังหวะ (ความยาวเฟรม = 14400 / bpm — ตัวท่าเปิดตัวใน cat2.js เรียกทีละท่อนด้วยความยาวนี้) · ท่อน 0–3 วน · ท่อน 4 = ปิดเพลง
 * mel = [จังหวะ, ความถี่, ยาวกี่จังหวะ] · bass = เบสตามจังหวะ (ระยะห่าง bassEvery) · pad = คอร์ดค้างบาง ๆ
 *   sweet    = กล่องดนตรีวอลทซ์หวาน ๆ C major 120 bpm + เบสดีด
 *   princess = เซเลสตาเกล็ดหิมะ A minor 80 bpm + คอร์ดลอย ๆ
 *   noble    = มินูเอต์ฮาร์ปซิคอร์ด G major 120 bpm
 *   chawee   = แจ๊สล็อบบี้ไวบราโฟน D minor 96 bpm + ดับเบิลเบสเดิน + แปรงกลอง
 */
const S_SONGS = {
  sweet: { bpm: 120, inst: 'box', bassInst: 'pluck', bassEvery: 2, pad: 0.6, phrases: [
    { mel: [[0, 659, 0.5], [0.5, 784, 0.5], [1, 1046, 1], [2, 988, 0.5], [2.5, 880, 0.5], [3, 784, 1]], bass: [131, 196], chord: [262, 330, 392] },
    { mel: [[0, 698, 0.5], [0.5, 880, 0.5], [1, 1046, 0.5], [1.5, 880, 0.5], [2, 784, 1.5], [3.5, 659, 0.5]], bass: [175, 131], chord: [262, 349, 440] },
    { mel: [[0, 587, 0.5], [0.5, 659, 0.5], [1, 698, 0.5], [1.5, 784, 0.5], [2, 880, 0.5], [2.5, 988, 0.5], [3, 1046, 1]], bass: [196, 147], chord: [247, 294, 392] },
    { mel: [[0, 1319, 0.5], [0.5, 1175, 0.5], [1, 1046, 1], [2, 784, 0.5], [2.5, 659, 0.5], [3, 523, 1]], bass: [131, 196], chord: [262, 330, 392] },
    { mel: [[0, 784, 0.5], [0.5, 1319, 0.5], [1, 1046, 3]], bass: [131, 98], chord: [262, 330, 392, 523] },
  ] },
  princess: { bpm: 80, inst: 'celesta', bassInst: 'soft', bassEvery: 2, pad: 1, phrases: [
    { mel: [[0, 659, 1], [1, 880, 1], [2, 988, 0.5], [2.5, 1046, 0.5], [3, 988, 1]], bass: [110, 165], chord: [220, 262, 330] },
    { mel: [[0, 880, 1], [1, 784, 1], [2, 659, 1.5], [3.5, 784, 0.5]], bass: [87, 131], chord: [175, 220, 262] },
    { mel: [[0, 698, 1], [1, 880, 1], [2, 1046, 1], [3, 1319, 1]], bass: [131, 196], chord: [262, 330, 392] },
    { mel: [[0, 1175, 0.5], [0.5, 1046, 0.5], [1, 988, 1], [2, 831, 1], [3, 880, 1]], bass: [82, 123], chord: [165, 208, 247] },
    { mel: [[0, 1319, 1], [1, 880, 3]], bass: [110, 82], chord: [220, 262, 330, 440] },
  ] },
  noble: { bpm: 120, inst: 'harpsi', bassInst: 'harpsi', bassEvery: 1, pad: 0, phrases: [
    { mel: [[0, 587, 0.5], [0.5, 784, 0.5], [1, 880, 0.5], [1.5, 988, 0.5], [2, 1046, 0.5], [2.5, 1175, 0.5], [3, 784, 1]], bass: [98, 147, 196, 147], chord: [] },
    { mel: [[0, 1319, 0.5], [0.5, 1046, 0.5], [1, 1175, 0.5], [1.5, 1319, 0.5], [2, 1480, 0.5], [2.5, 1568, 0.5], [3, 784, 1]], bass: [131, 196, 262, 196], chord: [] },
    { mel: [[0, 1046, 0.5], [0.5, 1175, 0.5], [1, 1046, 0.5], [1.5, 988, 0.5], [2, 880, 0.5], [2.5, 988, 0.5], [3, 1046, 1]], bass: [147, 220, 294, 220], chord: [] },
    { mel: [[0, 988, 0.5], [0.5, 1046, 0.5], [1, 988, 0.5], [1.5, 880, 0.5], [2, 784, 0.5], [2.5, 740, 0.5], [3, 784, 1]], bass: [98, 147, 196, 98], chord: [] },
    { mel: [[0, 1175, 0.5], [0.5, 988, 0.5], [1, 784, 3]], bass: [98, 196], chord: [] },
  ] },
  chawee: { bpm: 96, inst: 'vibes', bassInst: 'walk', bassEvery: 1, pad: 0.5, brush: true, phrases: [
    { mel: [[0, 880, 0.75], [0.75, 698, 0.25], [1, 587, 1], [2, 659, 0.5], [2.5, 698, 0.5], [3, 880, 1]], bass: [73, 87, 110, 131], chord: [294, 349, 440] },
    { mel: [[0, 784, 0.75], [0.75, 659, 0.25], [1, 523, 1], [2, 587, 0.5], [2.5, 659, 0.5], [3, 784, 1]], bass: [98, 123, 147, 175], chord: [247, 294, 349] },
    { mel: [[0, 698, 0.5], [0.5, 880, 0.5], [1, 1046, 1], [2, 988, 0.5], [2.5, 880, 0.5], [3, 784, 1]], bass: [110, 139, 165, 196], chord: [277, 330, 392] },
    { mel: [[0, 698, 1], [1, 659, 0.5], [1.5, 587, 0.5], [2, 554, 1], [3, 587, 1]], bass: [73, 110, 147, 110], chord: [294, 349, 440] },
    { mel: [[0, 880, 0.5], [0.5, 1175, 3.5]], bass: [73], chord: [294, 349, 440, 523] },
  ] },
};
/** ความดังรวมเพลงประกอบสกิน S (เท่าเพลงชุดคู่) */
const S_SONG_VOL = 0.3;
function sPhrase(id, i) {
  const S = S_SONGS[id], P = S.phrases[i], B = 60000 / S.bpm, V = S_SONG_VOL;
  const end = i === 4;
  for (const [b, f, d] of P.mel) {
    later(() => {
      if (S.inst === 'box') musicBox(f, Math.max(0.5, d * 0.5), 0.06 * V);
      else if (S.inst === 'celesta') { glassBell(f, 0.6 + d * 0.5, 0.05 * V); tone(f / 2, null, d * 0.6, 'sine', 0.012 * V); }
      else if (S.inst === 'harpsi') { tone(f, null, 0.35, 'sawtooth', 0.016 * V); tone(f * 2, null, 0.18, 'triangle', 0.014 * V); tone(f, null, 0.5, 'triangle', 0.02 * V); }
      else { tone(f, null, 0.5 + d * 0.6, 'sine', 0.045 * V); tone(f * 4, null, 0.12, 'sine', 0.008 * V); }   // vibes
    }, b * B);
  }
  P.bass.forEach((f, k) => later(() => {
    if (S.bassInst === 'pluck') tone(f, null, 0.3, 'triangle', 0.07 * V);
    else if (S.bassInst === 'soft') tone(f, f * 0.995, 1.6, 'sine', 0.06 * V);
    else if (S.bassInst === 'harpsi') { tone(f, null, 0.3, 'sawtooth', 0.012 * V); tone(f, null, 0.4, 'triangle', 0.04 * V); }
    else { tone(f, f * 0.98, 0.42, 'triangle', 0.09 * V); tone(f * 2, null, 0.2, 'sine', 0.02 * V); }   // ดับเบิลเบสเดิน
  }, k * S.bassEvery * B));
  if (S.pad) for (const f of P.chord) tone(f, f * 1.002, end ? 3.6 : (4 * B) / 1000 + 0.1, 'sine', 0.009 * S.pad * V);
  // แปรงกลองปัดจังหวะ 2, 4 (แจ๊ส)
  if (S.brush && !end) for (const b of [1, 3]) later(() => noise({ dur: 0.18, vol: 0.03 * V, freq: 4200, q: 0.6, attack: 0.04 }), b * B);
}
function pairPhrase(i) {
  const P = PAIR_SONG[i], B = 833, V = PAIR_SONG_VOL;
  for (const [b, f, d] of P.mel) {
    later(() => {
      if (d >= 1) {
        // ขิมรัว: ตีถี่ ๆ ตลอดความยาวโน้ต เบาลงเรื่อย ๆ
        const n = Math.round((d * B) / 110);
        for (let k = 0; k < n; k++) later(() => { tone(f, null, 0.22, 'triangle', 0.03 * V * (1 - (k / n) * 0.6)); tone(f * 2, null, 0.1, 'sine', 0.006 * V); }, k * 110);
      } else {
        tone(f, null, 0.45, 'triangle', 0.038 * V);
        tone(f * 4, null, 0.08, 'sine', 0.006 * V);
      }
    }, b * B);
  }
  // เบสนุ่มจังหวะ 1 กับ 3 + คอร์ดค้างบาง ๆ
  P.bass.forEach((f, k) => later(() => tone(f, f * 0.995, 1.4, 'sine', 0.05 * V), k * 2 * B));
  const beats = P.beats || 4;
  for (const f of P.pad) tone(f, f * 1.002, i === 4 ? 4.5 : (beats * B) / 1000 + 0.1, 'sine', 0.008 * V);
  // ฉิ่ง (เปิด) จังหวะ 1, 3 · ฉับ (ปิด) จังหวะ 2, 4 — ท่อนปิดเพลงตีฉิ่งครั้งเดียว
  for (let b = 0; b < (i === 4 ? 1 : beats); b++) {
    later(() => (b % 2 === 0 ? glassBell(2794, 0.5, 0.012 * V) : noise({ dur: 0.05, vol: 0.02 * V, type: 'highpass', freq: 5200, attack: 0.002 })), b * B);
  }
}

// ── ตัวช่วยของชุดบอสภูตตอไม้ (ดูหัวข้อ 🪵 ท้ายตาราง sfx) ──
// ผลึกในคีย์เดียวกับเพลง grove/stump: ลาไมเนอร์เพนทาโทนิก A C D E G จาก A5 ถึง A7
const CRY = [880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093, 2349.32, 2637.02, 3135.96, 3520];
const pickCry = (lo, hi) => CRY[lo + Math.floor(Math.random() * (hi - lo + 1))];
/** ไม้เคาะ "ป๊อก" — sine ไถลงเร็ว (เนื้อไม้) + ซ่าแคบสั้น ๆ (ผิวไม้กระทบ) */
function woodKnock(f = 440, vol = 0.12) {
  tone(f, f * 0.5, 0.1, 'sine', vol);
  noise({ dur: 0.04, vol: vol * 0.45, freq: f * 3.2, q: 4 });
}
/** ตุ้บหนัก ๆ ของตอไม้ทั้งต้น — ทุ้มต่ำไถลง + ฝุ่นอู้ */
function woodThud(vol = 0.2) {
  tone(130, 46, 0.38, 'sine', vol);
  tone(260, 90, 0.12, 'triangle', vol * 0.3);
  noise({ dur: 0.3, vol: vol * 0.4, type: 'lowpass', freq: 700, freqTo: 140 });
}
/** เสียงพูดของภูตตอไม้ — เมี้ยวต่ำ ๆ ฟอร์แมนต์กว้าง (q ต่ำ) สั่นช้า = "ฮึ่ม / ฮะ" แบบตัวโตใจดี ไม่ใช่สัตว์ร้าย */
function stumpVoice(start, peak, end, dur, vol = 0.12) {
  meow({ start, peak, end, dur, vol, q: 2.4, wobble: 7 });
}

// ── เสียงดุ (ผู้ใช้ 22 พ.ย.: "อยากให้ดุดันมากกว่านี้") ──
const DRIVE = new Map();
/** เส้นโค้งทำเสียงแตกพร่า (tanh) — k มาก = แตกมาก */
function driveCurve(k) {
  if (!DRIVE.has(k)) {
    const n = 1024, c = new Float32Array(n), d = Math.tanh(k);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / d; }
    DRIVE.set(k, c);
  }
  return DRIVE.get(k);
}
/**
 * คำรามสัตว์ใหญ่ — ฟันเลื่อยสามตัวเพี้ยนกัน (เสียงหนาเหมือนหลายลำคอ) → แตกพร่า (WaveShaper)
 * → ฟอร์แมนต์สระกวาดจาก vowel ไป vowelTo ("อา→โอ") → กระพือรัว (flutter = ลำคอสั่น) + เสียงต่ำใต้ (sub) + ลมหายใจซ่า
 * ระดับเสียง f0 → f1 (ขึ้นช่วงแรก) → f2 (ลากลงตอนท้าย)
 */
function beast({ dur = 1, f0 = 90, f1 = 130, f2 = 70, vol = 0.2, flutter = 28, drive = 3, vowel = [650, 1000], vowelTo = [450, 760], breath = 0.5, sub = 0.5 } = {}) {
  if (routeLevel() <= 0) return;
  const a = liveCtx();
  if (!a) return;
  if (a.state !== 'running') unlockAudio();
  const t = a.currentTime, end = t + dur;
  const out = a.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.07, dur * 0.2));
  out.gain.setValueAtTime(vol, t + dur * 0.55);
  out.gain.exponentialRampToValueAtTime(0.0001, end);
  const trem = a.createGain(); trem.gain.value = 0.62;
  const lfo = a.createOscillator(), dep = a.createGain();
  lfo.frequency.setValueAtTime(flutter, t); lfo.frequency.linearRampToValueAtTime(flutter * 0.6, end);
  dep.gain.value = 0.38; lfo.connect(dep); dep.connect(trem.gain);
  const pre = a.createGain(); pre.gain.value = 0.7;
  const sh = a.createWaveShaper(); sh.curve = driveCurve(drive); sh.oversample = '2x';
  const glide = (o, k = 1) => { o.frequency.setValueAtTime(f0 * k, t); o.frequency.exponentialRampToValueAtTime(f1 * k, t + dur * 0.25); o.frequency.exponentialRampToValueAtTime(f2 * k, end); };
  const srcs = [-14, 0, 13].map((c) => { const o = a.createOscillator(); o.type = 'sawtooth'; o.detune.value = c; glide(o); o.connect(pre); return o; });
  pre.connect(sh);
  vowel.forEach((fv, i) => {
    const bp = a.createBiquadFilter(), g = a.createGain();
    bp.type = 'bandpass'; bp.Q.value = 3.5;
    bp.frequency.setValueAtTime(fv, t); bp.frequency.linearRampToValueAtTime(vowelTo[i], end);
    g.gain.value = i ? 0.55 : 1;
    sh.connect(bp); bp.connect(g); g.connect(trem);
  });
  trem.connect(out);
  if (sub) {   // ทุ้มใต้คำราม = ตัวใหญ่ หนัก
    const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; glide(o, 0.5); g.gain.value = sub; o.connect(g); g.connect(out); srcs.push(o);
  }
  out.connect(routeOut());
  for (const o of [...srcs, lfo]) { o.start(t); o.stop(end + 0.05); }
  trackSfx(out, end + 0.05);
  if (breath) noise({ dur, vol: vol * breath * 0.45, freq: 900, freqTo: 420, q: 0.8, attack: 0.05 });
}
/** กระแทกหนัก "ตูม" — ทุ้มลึกไถลง + ซ่ากรองกลาง (เนื้อกระแทก) + แตกสั้นด้านบน (ผิวกระทบ) */
function impact(vol = 0.25, deep = 1) {
  vol *= 0.5;   // วัดแล้ว: ทุ้มลึกกินพลังงานมาก ที่ 1 เท่าดังกว่าเสียงโดนชน 5 เท่า (ลำโพงมือถือแตก)
  tone(120 * deep, 34 * deep, 0.6, 'sine', vol);
  tone(240 * deep, 70 * deep, 0.16, 'triangle', vol * 0.35);
  noise({ dur: 0.28, vol: vol * 0.55, freq: 380, freqTo: 120, q: 0.7, attack: 0.002 });
  noise({ dur: 0.06, vol: vol * 0.4, type: 'highpass', freq: 3000, attack: 0.001 });
}
/** พื้นสะเทือนอู้ยาว ๆ */
function rumble(dur = 1, vol = 0.1) {
  vol *= 0.5;
  noise({ dur, vol, type: 'lowpass', freq: 160, freqTo: 55, q: 0.9, attack: Math.min(0.15, dur * 0.2) });
  tone(48, 38, dur, 'sine', vol * 0.6);
}
/**
 * เวทแตกพร่า "ซิ้ววว!" — ฟันเลื่อยสองตัวเพี้ยนกัน ไถระดับเสียง → แตกพร่า → ฟิลเตอร์แคบกวาดตาม
 * (ผู้ใช้ 22 พ.ย.: เสียงปล่อยท่าบอส "นุ่มนวลน่ารักไป" → ใช้ตัวนี้แทนกระดิ่งแก้ว ได้เสียงพลังที่คมและอันตราย)
 */
function zap({ from = 1800, to = 300, dur = 0.25, vol = 0.1, drive = 4, q = 3 } = {}) {
  if (routeLevel() <= 0) return;
  const a = liveCtx();
  if (!a) return;
  if (a.state !== 'running') unlockAudio();
  const t = a.currentTime, end = t + dur;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, end);
  const sh = a.createWaveShaper(); sh.curve = driveCurve(drive); sh.oversample = '2x';
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
  bp.frequency.setValueAtTime(from * 1.5, t); bp.frequency.exponentialRampToValueAtTime(Math.max(80, to * 1.5), end);
  const oscs = [-22, 22].map((d) => {
    const o = a.createOscillator(); o.type = 'sawtooth'; o.detune.value = d;
    o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, end);
    o.connect(sh); return o;
  });
  sh.connect(bp); bp.connect(g); g.connect(routeOut());
  for (const o of oscs) { o.start(t); o.stop(end + 0.03); }
  trackSfx(g, end + 0.03);
}
/** ไม้ลั่นเอี๊ยด — ฟันเลื่อยต่ำผ่านฟิลเตอร์แคบ ระดับเสียงกระตุกเป็นช่วง ๆ (เส้นใยไม้บิด) */
function creak(dur = 0.6, vol = 0.06, f = 140) {
  const n = Math.max(3, Math.round(dur / 0.07));
  for (let i = 0; i < n; i++) later(() => {
    const ff = f * rnd(0.85, 1.25);
    tone(ff, ff * rnd(0.9, 1.1), 0.08, 'sawtooth', vol * rnd(0.5, 1));
    noise({ dur: 0.05, vol: vol * 0.5, freq: ff * 6, q: 6 });
  }, (i / n) * dur * 1000);
}

export const sfx = {
  // กระโดด — เมี้ยวสั้นสดใส เสียงสูง
  jump: () => meow({ start: 620, peak: 990, end: 700, dur: 0.2, vol: 0.3, q: 4 }),
  // กระโดดชั้นสอง — โทนสูงกว่าอีกขั้น ให้รู้ว่าคนละจังหวะกัน
  double: () => meow({ start: 780, peak: 1220, end: 880, dur: 0.18, vol: 0.29, q: 4 }),
  // หมอบ — เสียงต่ำในลำคอ สั้นกว่า คนละโทนกับกระโดดชัดเจน
  slide: () => meow({ start: 400, peak: 470, end: 285, dur: 0.22, vol: 0.3, q: 5, wobble: 17 }),

  land: () => tone(150, 90, 0.07, 'sine', 0.07),

  // เก็บเม็ดอาหารปลา — สามโน้ตไล่ขึ้นเร็ว ๆ เสียง sine นุ่ม ๆ ให้ฟังน่ารัก
  // สั้นมากโดยตั้งใจ เพราะเก็บติด ๆ กันทีละหลายเม็ด ถ้ายาวกว่านี้จะทับกันเละ
  fish: () => {
    tone(1174, null, 0.055, 'sine', 0.10);
    later(() => tone(1568, null, 0.05, 'sine', 0.10), 42);
    later(() => tone(2093, null, 0.09, 'triangle', 0.075), 84);
  },

  // เก็บเม็ดกลม — ต่ำกว่าเสียงปลาหนึ่งช่วง เสียง triangle อวบกว่า
  // และโน้ตท้ายค้างยาวกว่า ให้รู้สึกว่าได้ของใหญ่กว่าโดยไม่ต้องมองจอ
  kibble: () => {
    tone(784, null, 0.06, 'triangle', 0.11);
    later(() => tone(1046, null, 0.06, 'triangle', 0.11), 50);
    later(() => tone(1568, null, 0.14, 'sine', 0.09), 100);
  },

  // เก็บกุ้งทอง — อาร์เพจจิโอเมเจอร์ไล่ขึ้น G-C-E-G แล้วปิดด้วยโน้ตสูงค้างยาว
  // ซ้อนคู่ห้าตอนท้ายให้ฟังเป็นระฆังหรูแทนที่จะเป็นเสียงเดี่ยว ๆ
  // ตั้งใจให้ยาวกว่าเสียงอื่นเกือบเท่าตัว เพราะนาน ๆ ได้ยินที ควรได้อวด
  shrimp: () => {
    [784, 1046, 1318, 1568].forEach((f, i) =>
      later(() => tone(f, null, 0.13, 'triangle', 0.115), i * 58)
    );
    later(() => tone(2093, null, 0.34, 'sine', 0.105), 250);
    later(() => tone(3136, null, 0.3, 'sine', 0.055), 310);
  },

  // เก็บเยลลี่จิ๋ว — "บึ๋ง" นุ่ม ๆ เหมือนเยลลี่เด้ง: sine ไถขึ้นสั้น ๆ แล้วเด้งซ้ำเบากว่า
  // ของคะแนนน้อยสุดและมีเยอะที่สุด จึงเบาและสั้นกว่าเสียงปลา เก็บติดกันเป็นแถวแล้วไม่หนวกหู
  jelly: () => {
    tone(520, 880, 0.07, 'sine', 0.085);
    later(() => tone(700, 1040, 0.06, 'sine', 0.055), 60);
  },

  // เก็บคริสตัลดาว (ของตำนาน) — ระฆังแก้วระยิบ: โน้ตสูงไล่ขึ้นเร็ว ๆ ห้าตัว
  // แล้วปิดด้วยคอร์ดสูงค้างยาวที่สั่นระริก ให้ฟังออกทันทีว่าหรูกว่ากุ้งทอง
  crystal: () => {
    [1318, 1760, 2093, 2637, 3136].forEach((f, i) =>
      later(() => tone(f, null, 0.1, 'sine', 0.09), i * 45)
    );
    later(() => tone(2637, null, 0.5, 'triangle', 0.08), 240);
    later(() => tone(3951, null, 0.45, 'sine', 0.05), 260);
    [0, 90, 180].forEach((ms, i) =>
      later(() => tone(4186 + i * 220, null, 0.08, 'sine', 0.035), 320 + ms)
    );
  },

  // เก็บขวดพลัง — อวดได้หน่อย เพราะนาน ๆ โผล่ที
  potion: () => {
    tone(523, 784, 0.16, 'triangle', 0.12);
    later(() => tone(784, 1046, 0.18, 'sine', 0.11), 110);
    later(() => tone(1046, 1568, 0.26, 'sine', 0.09), 240);
  },

  // หัวใจคืน (ช่วงฟื้น) — ตุบ-ตุบ หัวใจเต้นสองครั้งต่ำ ๆ แล้วระยิบไล่ขึ้น = กลับมามีชีวิต
  heartRevive: () => {
    tone(110, 70, 0.12, 'sine', 0.2);
    later(() => tone(120, 75, 0.14, 'sine', 0.22), 190);
    [784, 988, 1318, 1568].forEach((f, i) =>
      later(() => tone(f, null, 0.12, 'triangle', 0.08), 360 + i * 60)
    );
    later(() => tone(523, 1046, 0.3, 'sine', 0.06), 380);
  },
  // หัวใจคืน (ถึงช่อง) — "ป๊อก" อวบ ๆ ตามด้วยระฆังคู่ ให้รู้ว่าเข้าที่แล้ว
  heartLand: () => {
    tone(300, 620, 0.08, 'triangle', 0.14);
    later(() => { tone(1568, null, 0.3, 'sine', 0.1); tone(2093, null, 0.26, 'sine', 0.06); }, 60);
  },
  // ภารกิจสำเร็จ — ติ๊ง-ติ๊ง-ตา-ด๊า! แฟนแฟร์สั้นสดใส + ระยิบปิด (คนละแบบกับแฟนแฟร์เข้าโบนัส)
  missionDone: () => {
    tone(1046, null, 0.08, 'square', 0.07);
    later(() => tone(1318, null, 0.08, 'square', 0.07), 90);
    later(() => { tone(1568, null, 0.12, 'triangle', 0.13); tone(784, null, 0.12, 'triangle', 0.08); }, 180);
    later(() => { tone(2093, null, 0.42, 'triangle', 0.13); tone(1046, null, 0.4, 'sine', 0.09); tone(1318, null, 0.4, 'sine', 0.06); }, 300);
    [2637, 3136, 3951].forEach((f, i) => later(() => tone(f, null, 0.08, 'sine', 0.04), 420 + i * 70));
  },

  // เก็บแม่เหล็ก — กวาดขึ้นยาว ๆ เหมือนเสียงชาร์จพลัง บอกว่า "เริ่มมีผลแล้ว"
  magnet: () => {
    tone(320, 1300, 0.3, 'square', 0.1);
    later(() => tone(1046, 1568, 0.22, 'triangle', 0.1), 170);
  },

  // เก็บตัวอักษร — ไล่เสียงสูงขึ้นทีละตัว บอกความคืบหน้าโดยไม่ต้องมองจอ
  letter: (n) => {
    const base = 660 * Math.pow(1.09, n - 1);
    tone(base, null, 0.07, 'triangle', 0.12);
    later(() => tone(base * 1.5, null, 0.11, 'sine', 0.1), 55);
  },

  // เข้าโหมดโบนัส — แฟนแฟร์ไล่ขึ้นยาว ๆ ให้รู้ทันทีว่ามีอะไรใหญ่กำลังเกิด
  bonus: () => {
    [523, 659, 784, 1046, 1318].forEach((f, i) =>
      later(() => tone(f, null, 0.16, 'triangle', 0.12), i * 90)
    );
    later(() => { tone(1568, null, 0.5, 'sine', 0.11); tone(2093, null, 0.45, 'sine', 0.06); }, 470);
  },
  // เวทวาร์ปขึ้นฟ้า — เล่นตอนปลาเริ่มพาทะยานขึ้น (ช่วง rise ของโบนัส)
  //
  // สามชั้นซ้อนกันให้ได้ความรู้สึก "วิ๊ง ๆ" แบบเวทมนตร์:
  //   1) กวาดความถี่ขึ้นยาว ๆ = พลังกำลังสะสม (ยาวเท่าช่วง rise พอดี ~1.7 วิ)
  //   2) เกล็ดระยิบไล่ขึ้นเป็นบันไดห้าเสียง = ประกายบนจอ
  //   3) ระฆังคู่ห้าตอนท้าย = จังหวะที่วาบขาวแล้วหายไป
  // เสียง sine/triangle ล้วน ไม่ใช้ square เพราะต้องนุ่มกว่าเสียงเก็บของทุกตัว
  warp: () => {
    tone(330, 1760, 1.5, 'sine', 0.07);
    [1046, 1318, 1568, 2093, 2637].forEach((f, i) =>
      later(() => tone(f, null, 0.2, 'triangle', 0.055 + i * 0.008), 120 + i * 190)
    );
    later(() => { tone(2093, null, 0.6, 'sine', 0.1); tone(3136, null, 0.55, 'sine', 0.05); }, 1180);
  },

  // ความสามารถติด — กวาดขึ้นแล้วปิดด้วยคอร์ดค้าง ให้รู้ว่าเข้าสถานะพิเศษแล้ว
  skill: () => {
    tone(392, 1046, 0.26, 'square', 0.1);
    later(() => { tone(1046, null, 0.34, 'triangle', 0.11); tone(1568, null, 0.3, 'sine', 0.07); }, 190);
  },

  // เก็บต้นหญ้าแมว — กวาดขึ้นเร็วปรื๊ดแล้วปิดสั้น ให้รู้สึกว่า "ดีดออกไป"
  nip: () => {
    tone(420, 1600, 0.16, 'square', 0.11);
    later(() => tone(1200, 1900, 0.12, 'triangle', 0.09), 90);
  },

  shield: () => {
    tone(880, null, 0.05, 'triangle', 0.11);
    later(() => tone(1320, null, 0.08, 'triangle', 0.11), 45);
  },
  shieldBreak: () => tone(700, 160, 0.28, 'sawtooth', 0.13),

  // ── พรสวรรค์ ── เสียงสั้นทุกตัว เพราะเล่นซ้ำบ่อยระหว่างวิ่ง
  // พุ่ง — กวาดขึ้นเร็ว อ่านเป็น "วูบ"
  dash: () => tone(260, 1400, 0.16, 'sawtooth', 0.09),
  // กลายเป็นเงา — กวาดลงต่ำ ๆ ทุ้ม ๆ
  shadow: () => {
    tone(520, 110, 0.36, 'triangle', 0.16);
    later(() => tone(300, 90, 0.26, 'sine', 0.1), 90);
  },
  // โลกช้าลง — เสียงลากยาวลงช้า ๆ แล้วมีเสียงติ๊กตามหลัง
  timeSlow: () => {
    tone(900, 240, 0.55, 'sine', 0.15);
    later(() => tone(1200, 1180, 0.05, 'square', 0.06), 260);
    later(() => tone(1200, 1180, 0.05, 'square', 0.05), 560);
  },
  // เด้งสะท้อน — "โบ๊ง" ใสกับเสียงกระจกกริ๊ง
  reflect: () => {
    tone(180, 620, 0.2, 'sine', 0.18);
    later(() => tone(2400, 2100, 0.12, 'triangle', 0.08), 40);
  },
  // กรงเล็บข่วน — ขีดสามเส้นไล่กัน สูงไปต่ำ
  claw: () => {
    tone(2200, 380, 0.11, 'sawtooth', 0.08);
    later(() => tone(1900, 320, 0.11, 'sawtooth', 0.07), 55);
    later(() => tone(1600, 260, 0.12, 'sawtooth', 0.07), 110);
  },
  // เด้งตัวเอง — เบากว่ากระโดดปกติ เพราะดังเองทุกครั้งที่แตะพื้น
  bounce: () => tone(240, 520, 0.12, 'sine', 0.1),
  // ท่าพิเศษพร้อมใช้อีกครั้ง — กริ๊งสองโน้ตสั้น ๆ
  talentReady: () => {
    tone(1320, 1320, 0.07, 'triangle', 0.07);
    later(() => tone(1760, 1760, 0.09, 'triangle', 0.07), 70);
  },
  // เสียงพุ่งชนกล่อง: ทุ้มหนักนำ แล้วตามด้วยเสียงแตกแหลม ๆ
  smash: () => {
    tone(210, 62, 0.15, 'sawtooth', 0.18);
    later(() => tone(560, 170, 0.11, 'square', 0.11), 28);
  },

  // ── ตีบวกสมบัติ: สามเสียงที่ต้องฟังเป็นเรื่องเดียวกัน ──
  //
  // forge สะสมความรู้สึกขึ้นไปแล้วค้างไว้ ไม่มีจุดจบในตัวเอง คนฟังจึงรอว่า
  // "แล้วไง" ต่อ ซึ่งเป็นความรู้สึกที่ต้องการพอดีระหว่างรอผลตีบวก
  // แล้ว upWin/upFail เป็นตัวมาปิดประโยคนั้น จะปิดด้วยดีใจหรือเสียใจก็ว่ากันไป

  // ชาร์จพลัง — กวาดขึ้นยาวเกือบวินาที ซ้อนสองชั้นให้เสียงหนาเหมือนของกำลังร้อน
  forge: () => {
    tone(170, 880, 0.85, 'sawtooth', 0.07);
    tone(340, 1760, 0.85, 'square', 0.028);
  },

  // สำเร็จ — คอร์ดระฆังไล่ขึ้นแล้วปิดด้วยประกายค้างยาว
  // สูงกว่าและยาวกว่า sfx.bonus ที่ใช้ตอนได้ของ เพราะตีบวกติดนาน ๆ ครั้ง
  upWin: () => {
    [659, 880, 1318].forEach((f, i) =>
      later(() => tone(f, null, 0.3, 'triangle', 0.12), i * 70)
    );
    later(() => { tone(1760, null, 0.6, 'sine', 0.1); tone(2637, null, 0.5, 'sine', 0.05); }, 210);
  },

  // ล้มเหลว — ของแตกแล้วเสียงร่วงลงต่ำ ปิดท้ายด้วยเสียงแมวอ้อน
  // ต้องไม่เป็นเสียง "ผิดพลาด" แบบระบบแจ้งเตือน เพราะการตีไม่ติดคือส่วนหนึ่งของเกม
  // ไม่ใช่ความผิดของคนเล่น เสียงอ้อนจึงอ่านเป็น "เสียดายจัง" ไม่ใช่ "คุณทำพลาด"
  upFail: () => {
    tone(520, 90, 0.36, 'sawtooth', 0.14);
    later(() => tone(300, 70, 0.3, 'square', 0.085), 90);
    later(() => meow({ start: 420, peak: 450, end: 150, dur: 0.5, vol: 0.2, q: 5, wobble: 22 }), 210);
  },

  // เย้! — แมวดีใจสองพยางค์ไล่ขึ้น แล้วปิดด้วยประกายระฆังสามเม็ด
  //
  // ใช้ตอนเปิดกาช่าได้ของ ซึ่งเป็นจังหวะเดียวในเกมที่ควรรู้สึกว่า "มีคนดีใจด้วย"
  // ไม่ใช่แค่ได้ยินว่าระบบทำงานเสร็จ จึงเป็นเสียงร้องจริง ๆ (meow) ไม่ใช่โทนเปล่า
  // พยางค์ที่สองสูงกว่าและยาวกว่าพยางค์แรก = รูปทรงของเสียงคนที่ตื่นเต้นขึ้นเรื่อย ๆ
  // ถ้าสองพยางค์เท่ากันจะฟังเป็นเสียงร้องเรียก ไม่ใช่เสียงดีใจ
  cheer: () => {
    meow({ start: 700, peak: 1180, end: 980, dur: 0.16, vol: 0.28, q: 4, wobble: 18 });
    later(() => meow({ start: 900, peak: 1520, end: 1240, dur: 0.24, vol: 0.3, q: 4, wobble: 15 }), 150);
    [1568, 2093, 2637].forEach((f, i) =>
      later(() => tone(f, null, 0.18, 'sine', 0.065), 340 + i * 70)
    );
  },

  // ── เสียงตอนถูกแตะตัว ──────────────────────────────────────
  // เสียงชุดนี้ผูกกับท่าตอบการแตะใน src/home-moves.js (ช่อง voices ของแต่ละท่า)
  // ตั้งใจให้ต่างกันชัดเจน เพราะมันคือสิ่งเดียวที่บอกว่า "แตะแล้วได้ท่าใหม่จริง"
  // ในวินาทีแรก ก่อนที่ท่าจะเข้าเต็มที่พอให้ตาอ่านออก

  // ── เสียงพูดประจำท่า ────────────────────────────────────────
  // ทุกท่าที่น้องทำมีเสียงของตัวเอง ท่าไหนที่ปากขยับเป็นจังหวะจะร้องตามปากทุกครั้ง
  // ที่อ้า ไม่ใช่ร้องทีเดียวตอนเริ่มท่า (ดู stepVoice ใน game.js)
  //
  // ── ทำไมเสียงของท่าว่างเบากว่าเสียงของท่าที่ผู้เล่นสั่ง ──
  // ท่าว่างเล่นเองทุกไม่กี่วินาทีตลอดเวลาที่ค้างอยู่หน้าล็อบบี้ ถ้าดังเท่ากับเสียง
  // ที่ตอบการกด มันจะกลายเป็นเสียงรบกวนที่ไม่มีทางปิด ไม่ใช่บรรยากาศ
  // ระดับที่ตั้งไว้คือ "ได้ยินว่ามีน้องอยู่" ไม่ใช่ "น้องเรียก"

  // หาว — ยาวที่สุดในชุด ไล่ลงต่ำเรื่อย ๆ จนจบ เหมือนลมที่หมดไปกลางคำ
  // ขึ้นต้นสูงกว่าที่จบเกือบเท่าตัว ซึ่งเป็นรูปทรงของเสียงหาว ไม่ใช่เสียงเรียก
  yawn: () => meow({ start: 520, peak: 640, end: 290, dur: 0.78, vol: 0.17, q: 5, wobble: 11 }),

  // มิ้ว — สั้นและเบาที่สุด ใช้ตอนน้องนั่งลงเฉย ๆ กับตอนร้องรับหัวใจ
  // สั้นระดับนี้ (0.13 วินาที) จำเป็น เพราะมันร้องซ้ำตามจังหวะปากได้หลายครั้งติดกัน
  mew: () => meow({ start: 700, peak: 1010, end: 870, dur: 0.13, vol: 0.21, q: 4, wobble: 19 }),

  // ครางตอนเคลิ้มจะหลับ — ต่ำและเบากว่า purr อีกขั้น ใช้ตอนหมอบเป็นก้อนขนมปัง
  snooze: () => meow({ start: 232, peak: 258, end: 196, dur: 0.66, vol: 0.13, q: 6, wobble: 21 }),

  // เสียงตอนล้มตัวลงนอน — สั้น ต่ำ กลม ๆ เหมือนถอนหายใจพอใจ
  flop: () => meow({ start: 372, peak: 424, end: 322, dur: 0.28, vol: 0.23, q: 5.5, wobble: 25 }),

  // สะดุ้ง — สั้นและสูงที่สุด พุ่งขึ้นเร็วมากแล้วตัดจบทันที
  // ใช้ตอนขนพอง ซึ่งเป็นท่าเดียวที่เกิดจากความตกใจ ไม่ใช่ความสบายใจ
  startle: () => meow({ start: 880, peak: 1560, end: 1180, dur: 0.11, vol: 0.29, q: 4, wobble: 9 }),


  // ทักทาย — เสียงรัวในลำคอที่แมวใช้ทักคนที่คุ้นเคย ไม่ใช่เสียงเมี้ยวเต็มเสียง
  // ความรัวมาจาก wobble ที่สูงกว่าเสียงอื่นเกือบเท่าตัว ตัวเสียงเองสั้นและลงท้ายสูง
  trill: () => meow({ start: 480, peak: 880, end: 830, dur: 0.24, vol: 0.26, q: 4, wobble: 36 }),

  // ครางเวลาสบายใจ — ความถี่ต่ำมากบวกการสั่นถี่ ๆ = เสียงครืดครืดในอก
  // ยาวกว่าเสียงอื่นเกือบสามเท่าโดยตั้งใจ เพราะการครางที่สั้นจะฟังเป็นเสียงบ่น
  // เบากว่าเสียงอื่นด้วย มันเป็นเสียงที่ควรได้ยินตอนอยู่ใกล้ ๆ ไม่ใช่เสียงเรียก
  purr: () => meow({ start: 148, peak: 168, end: 132, dur: 0.95, vol: 0.2, q: 6, wobble: 27 }),

  // เสียงกระตุกถี่ ๆ ที่แมวทำตอนจ้องนก — สามเม็ดสั้นมากติดกัน
  // สั้นระดับ 0.06 วินาทีเพื่อให้ฟังเป็น "การกระตุก" ไม่ใช่โน้ตสามตัว
  chirp: () => {
    [0, 90, 180].forEach((ms, i) =>
      later(() => meow({
        start: 820 + i * 90, peak: 1320 + i * 110, end: 1020 + i * 90,
        dur: 0.06, vol: 0.23, q: 5, wobble: 22,
      }), ms)
    );
  },

  // ได้หัวใจ — เมี้ยวอ้อนสองพยางค์ ตัวแรกสั้น ตัวหลังยาวและลงท้ายสูงกว่าที่เริ่ม
  //
  // ต่างจาก cheer ตรงที่ไม่มีประกายระฆังต่อท้าย เพราะนี่ไม่ใช่เสียง "ได้ของ"
  // แต่เป็นเสียงของตัวละครที่ดีใจ ระฆังจะทำให้ฟังเป็นเสียงระบบแจ้งรางวัลทันที
  // ส่วนเสียงแจ้งรางวัลจริงมีอยู่แล้วตอนกล่องของขวัญเปิด จะได้ไม่ซ้อนกันสองชั้น
  //
  // ปลายเสียงที่ลงท้ายสูงกว่าจุดเริ่ม (end > start) คือรูปทรงของเสียงอ้อน
  // ส่วนเสียงเรียกหรือเสียงเจ็บจะลงต่ำกว่าจุดเริ่มเสมอ — ดู hurt กับ die ข้างล่าง
  love: () => {
    meow({ start: 560, peak: 900, end: 760, dur: 0.18, vol: 0.27, q: 4, wobble: 16 });
    later(() => meow({ start: 640, peak: 1080, end: 980, dur: 0.34, vol: 0.29, q: 4, wobble: 13 }), 190);
  },

  // ชนสิ่งกีดขวาง — ลากลงต่ำกว่าจุดเริ่มเยอะ ๆ กับสั่นถี่ = ฟังอ้อนน่าสงสาร
  // ดังกว่าเสียงกระโดดอีกนิด เพราะเป็นสัญญาณว่ากำลังเสียพลัง ต้องรู้ตัวทันที
  hurt: () => meow({ start: 720, peak: 790, end: 265, dur: 0.42, vol: 0.36, q: 5, wobble: 30 }),

  // พลังหมด — เสียงเดียวกันแต่ยาวและจบต่ำกว่า เหมือนหมดแรงแล้วเสียงหายไป
  die: () => {
    meow({ start: 640, peak: 700, end: 155, dur: 0.9, vol: 0.38, q: 5.5, wobble: 26 });
    later(() => meow({ start: 330, peak: 350, end: 130, dur: 0.7, vol: 0.22, q: 5.5, wobble: 20 }), 420);
  },

  // ── ปุ่มควบคุมรอบเล่น ───────────────────────────────────────
  //
  // สี่เสียงนี้เป็นชุดเดียวกัน ต้องฟังออกว่าเป็นญาติกันแต่คนละความหมาย
  // กฎเดียวที่ใช้แยก: ทิศทางของระดับเสียง
  //     ลง = หยุด / ออก        ขึ้น = ไปต่อ / เอาใหม่
  // และทุกตัวปิดท้ายด้วยเสียงน้องสั้น ๆ ไม่ใช่โทนเปล่า เพราะปุ่มพวกนี้อยู่ในเกมแมว
  // ถ้าเป็นบี๊บล้วนจะฟังเป็นเสียงของเครื่อง ไม่ใช่เสียงของเกม
  //
  // เบากว่าเสียงในสนามทุกตัวโดยตั้งใจ — เสียงปุ่มไม่ควรดังกว่าเสียงที่บอกว่า
  // กำลังเกิดอะไรกับตัวละคร มันเป็นแค่การตอบรับว่า "กดติดแล้ว"

  // หยุดชั่วคราว — สองโน้ตวางลงนุ่ม ๆ เหมือนวางของ ปิดด้วยมิ้วเบา ๆ
  pause: () => {
    tone(880, null, 0.08, 'sine', 0.09);
    later(() => tone(587, null, 0.15, 'sine', 0.09), 70);
    later(() => meow({ start: 520, peak: 560, end: 415, dur: 0.17, vol: 0.15, q: 5, wobble: 18 }), 140);
  },

  // เล่นต่อ — กลับด้านของ pause เป๊ะ ๆ คู่โน้ตเดียวกันแต่ไล่ขึ้น แล้วมิ้วสดใสกว่า
  // ที่ต้องเป็นโน้ตคู่เดิมเพราะปุ่มเดียวกันสลับสองสถานะ หูจึงควรได้ยินว่าเป็นสวิตช์ตัวเดียว
  resume: () => {
    tone(587, null, 0.08, 'sine', 0.09);
    later(() => tone(880, null, 0.13, 'sine', 0.09), 70);
    later(() => meow({ start: 640, peak: 950, end: 870, dur: 0.15, vol: 0.17, q: 4, wobble: 16 }), 130);
  },

  // เริ่มใหม่ / วิ่งอีกรอบ — ดีดขึ้นเร็วปรื๊ดแล้วรัวทักทาย = "เอาใหม่!"
  // ใช้ wobble สูงแบบ trill เพราะเป็นเสียงที่ควรอ่านว่ากระตือรือร้น ไม่ใช่แค่ตอบรับ
  restart: () => {
    tone(523, 1046, 0.13, 'triangle', 0.095);
    later(() => tone(1318, null, 0.12, 'sine', 0.08), 110);
    later(() => meow({ start: 620, peak: 1090, end: 1010, dur: 0.2, vol: 0.21, q: 4, wobble: 31 }), 165);
  },

  // เลิกเล่น / กลับหน้าแรก — ไล่ลงสามขั้นช้า ๆ ปิดด้วยเสียงอ้อนเบา ๆ
  //
  // ต้องอ่านเป็น "บายน้า" ไม่ใช่ "ผิดพลาด" จึงใช้ sine ล้วนกับโน้ตในคอร์ดเดียวกัน
  // (G-E-C) ไม่ใช่เสียงกวาดลงหรือ sawtooth ซึ่งฟังเป็นของพัง
  // และปลายเสียงน้องลงต่ำแค่พอรู้ว่าเสียดาย ไม่ลงลึกเท่า hurt กับ die
  quit: () => {
    [784, 659, 523].forEach((f, i) =>
      later(() => tone(f, null, 0.13, 'sine', 0.09), i * 75)
    );
    later(() => meow({ start: 500, peak: 545, end: 355, dur: 0.3, vol: 0.17, q: 5, wobble: 20 }), 225);
  },

  // ── หน้าสรุปคะแนน ──────────────────────────────────────────
  //
  // หน้านี้มีสามเหตุการณ์ที่ตาเห็นไม่พร้อมกัน: หน้าเปิด -> ตัวเลขไล่จนหยุด -> เลเวลขึ้น
  // เสียงจึงต้องแยกเป็นสามก้อนตามนั้น ถ้ายิงรวดเดียวตอนเปิดหน้า มันจะกลายเป็น
  // เสียงกองเดียวที่จบไปก่อนตัวเลขจะไล่ถึงด้วยซ้ำ แล้วไม่มีอะไรรับช่วงตอนตัวเลขลงที่
  // (ลำดับจริงอยู่ที่ showGameOver ใน main.js)

  // หน้าเปิด — ระฆังเบาสองเม็ดกับมิ้วสั้น เหมือนน้องเดินมานั่งข้าง ๆ แล้วดูคะแนนด้วยกัน
  // เบาที่สุดในสามก้อน เพราะเป็นแค่การเปิดฉาก ของจริงยังไม่มา
  summary: () => {
    tone(1046, null, 0.16, 'sine', 0.07);
    later(() => tone(1568, null, 0.22, 'sine', 0.05), 120);
    later(() => meow({ start: 560, peak: 770, end: 650, dur: 0.2, vol: 0.16, q: 5, wobble: 17 }), 225);
  },

  // ตัวเลขไล่จนหยุด — เคาะเดียวสั้นใส ซ้อนคู่แปดเบา ๆ ให้ฟังเป็นระฆังไม่ใช่บี๊บ
  // สั้นมากโดยตั้งใจ หน้าที่เดียวของมันคือทำให้ตัวเลขรู้สึกว่า "ลงที่" แล้ว
  tally: () => {
    tone(1318, null, 0.18, 'triangle', 0.095);
    tone(2637, null, 0.16, 'sine', 0.035);
  },

  // เลเวลอัพ — อาร์เพจจิโอไล่ขึ้นสี่ขั้น ปิดด้วยคอร์ดค้างกับน้องดีใจ
  // ดังและยาวที่สุดของหน้านี้ เพราะนาน ๆ เกิดที ควรได้เป็นพระเอกของจังหวะนั้น
  levelUp: () => {
    [523, 659, 784, 1046].forEach((f, i) =>
      later(() => tone(f, null, 0.16, 'triangle', 0.105), i * 70)
    );
    later(() => { tone(1568, null, 0.45, 'sine', 0.095); tone(2093, null, 0.4, 'sine', 0.045); }, 290);
    later(() => meow({ start: 760, peak: 1290, end: 1130, dur: 0.26, vol: 0.25, q: 4, wobble: 14 }), 415);
  },

  // ── คลิปเปิดเกม ───────────────────────────────────────────
  // ท้องร้องรอบแรก — ยาวและดัง ตามด้วยฟองเล็ก ๆ ปิดท้าย ให้ได้จังหวะ "โคร~ก ครืด"
  tummy: () => {
    growl({ dur: 1.15, base: 92, vol: 0.36, bubble: 19 });
    later(() => growl({ dur: 0.32, base: 132, vol: 0.2, bubble: 26 }), 1020);
  },
  // ท้องร้องรอบสอง — สั้นกว่าและสูงกว่า อ่านเป็น "ยังหิวอยู่นะ" ไม่ใช่เสียงเดิมซ้ำ
  tummySmall: () => growl({ dur: 0.5, base: 118, vol: 0.26, bubble: 24 }),

  // ฟองจมูกแตก — ป๊อกสั้น ๆ สองชั้น: ตัวแตก (สูงขึ้นเร็ว) กับละอองที่ตกลง (ต่ำลง)
  // ต้องสั้นมาก ถ้ายาวเกิน 0.1 วินาทีจะฟังเป็นเสียงนกหวีด ไม่ใช่ฟองแตก
  bubblePop: () => {
    tone(820, 1900, 0.05, 'sine', 0.13);
    later(() => tone(1500, 700, 0.06, 'sine', 0.05), 35);
  },

  // เมี้ยวแบบถาม "หืม?" — ต่างจาก mew ตรงที่ปลายเสียง "ขึ้น" ไม่ใช่ลง
  // ภาษาไหนก็ตามคำถามจบด้วยเสียงสูง หูจึงอ่านออกว่าสงสัยโดยไม่ต้องมีคำพูด
  huh: () => meow({ start: 560, peak: 640, end: 1020, dur: 0.3, vol: 0.22, q: 4.5, wobble: 16 }),

  // ══ บ้านน้องแมว (src/catroom.js) ══════════════════════════
  // ทุกเสียงเบากว่าเสียงในด่าน — ในบ้านมีน้องหลายตัวทำอะไรพร้อมกันได้ ถ้าดังเท่าในด่านจะรก

  // เคาะชามเรียกน้อง "ติ๊ง ติ๊ง" — เสียงโลหะใส ๆ สองที ทุกตัวในบ้านรู้ว่าข้าวมาแล้ว
  bowlTap: () => {
    tone(1760, null, 0.32, 'sine', 0.07);
    tone(3520, null, 0.12, 'sine', 0.02);
    later(() => { tone(1975, null, 0.4, 'sine', 0.07); tone(3950, null, 0.14, 'sine', 0.02); }, 150);
  },
  // เม็ดอาหารร่วงลงชาม — เม็ดเล็ก ๆ กระทบกันเป็นห้วงถี่ ๆ แล้วซาลง
  pour: () => {
    for (let i = 0; i < 14; i++) {
      later(() => noise({ dur: 0.028, vol: rnd(0.05, 0.1), freq: rnd(2600, 5200), q: 3.5 }), i * 32 + rnd(0, 18));
    }
    later(() => noise({ dur: 0.2, vol: 0.03, freq: 3200, freqTo: 1800, q: 1 }), 60);
  },
  // เคี้ยวข้าวเม็ด "กรุบ กรุบ" — สองคำติดกัน คำหลังเบากว่า
  crunch: () => {
    // งับ "ง่ำ" ทุ้มสั้น ๆ ก่อน แล้วตามด้วยกรุบ ๆ สองที — ฟังเป็นการเคี้ยวของกรอบ ไม่ใช่แค่เสียงซ่า
    tone(210, 150, 0.06, 'sine', 0.09);
    noise({ dur: 0.055, vol: 0.2, freq: rnd(2200, 2900), q: 1.3 });
    later(() => noise({ dur: 0.05, vol: 0.15, freq: rnd(1700, 2300), q: 1.3 }), 85);
    later(() => noise({ dur: 0.04, vol: 0.09, freq: rnd(2600, 3200), q: 1.5 }), 165);
  },
  // กินของนิ่ม (ปลา/แซลมอน) "งั่ม ๆ" — ทุ้มนุ่ม ไม่มีเสียงกรอบ
  nom: () => {
    noise({ dur: 0.09, vol: 0.14, type: 'lowpass', freq: 760, q: 0.8 });
    tone(240, 170, 0.08, 'sine', 0.08);
    later(() => { noise({ dur: 0.07, vol: 0.09, type: 'lowpass', freq: 600, q: 0.8 }); tone(220, 160, 0.06, 'sine', 0.05); }, 140);
  },
  // เลียน้ำหนึ่งแผล็บ — ลิ้นแตะน้ำ "จุ๊บ" สั้น ๆ มีน้ำกระเซ็นเบา ๆ (ดังทุกครั้งที่ลิ้นแลบ ดู drinkShape)
  sip: () => {
    tone(rnd(520, 620), rnd(1100, 1350), 0.045, 'sine', 0.08);
    noise({ dur: 0.05, vol: 0.05, freq: rnd(3200, 4200), q: 2.2 });
  },
  // เลียน้ำ "แผล็บ ๆ" — หยดสั้นไล่ขึ้นสามที
  lap: () => {
    [0, 120, 240].forEach((ms) => later(() => tone(rnd(700, 820), rnd(1300, 1500), 0.05, 'sine', 0.05), ms));
  },
  // ฝีเท้าบนพรม — ตุ้บเบามาก ดังเฉพาะตอนวิ่งมาหาเรา
  pat: () => noise({ dur: 0.05, vol: 0.05, type: 'lowpass', freq: 520, q: 0.6 }),
  // กระโดดลงพื้น — ตุ้บทุ้มสั้น
  thump: () => {
    tone(150, 70, 0.09, 'sine', 0.12);
    noise({ dur: 0.06, vol: 0.06, type: 'lowpass', freq: 500, q: 0.6 });
  },
  // กระโดดลงเบาะ/ฟูก — ฟุ่บนุ่ม ๆ ไม่มีเสียงตุ้บ
  fluff: () => noise({ dur: 0.16, vol: 0.09, type: 'lowpass', freq: 1100, freqTo: 400, q: 0.5, attack: 0.02 }),
  // กระโดดลงอ่าง — น้ำกระเซ็นแล้วจางเป็นเสียงทุ้ม ตามด้วยฟองผุดสองสามเม็ด
  splash: () => {
    noise({ dur: 0.5, vol: 0.2, type: 'lowpass', freq: 5200, freqTo: 380, q: 0.7, attack: 0.006 });
    noise({ dur: 0.18, vol: 0.08, freq: 3600, q: 1.5 });
    [140, 230, 330].forEach((ms) => later(() => tone(rnd(700, 950), rnd(1600, 2100), 0.05, 'sine', 0.06), ms));
  },
  // ถูตัวในอ่าง — ซ่าเบา ๆ ไล่ขึ้น เหมือนฟองถูไปมา
  scrub: () => noise({ dur: rnd(0.16, 0.24), vol: 0.06, freq: 1400, freqTo: 3400, q: 0.9, attack: 0.04 }),
  // สะบัดขนไล่น้ำ — ฟรึ่บถี่ ๆ แล้วมีหยดน้ำกระเด็น
  shake: () => {
    for (let i = 0; i < 7; i++) later(() => noise({ dur: 0.035, vol: 0.08, freq: rnd(2200, 3200), q: 1.1 }), i * 42);
    [80, 190, 300].forEach((ms) => later(() => tone(rnd(1400, 1900), rnd(2400, 2900), 0.04, 'sine', 0.04), ms));
  },
  // ลูกบอลกระดิ่ง — กรุ๊งกริ๊งสามเม็ด
  jingle: () => {
    [0, 70, 150].forEach((ms, i) => later(() => tone([2637, 3136, 2794][i], null, 0.22, 'triangle', 0.045), ms));
  },
  // หนูของเล่นบีบ "จี๊ด"
  squeak: () => {
    tone(1700, 2700, 0.07, 'sine', 0.08);
    later(() => tone(2500, 1800, 0.08, 'sine', 0.06), 70);
  },
  // ไม้ตกแมวสะบัด — วืดสั้น ๆ
  swish: () => noise({ dur: 0.22, vol: 0.07, freq: 900, freqTo: 5200, q: 1.6, attack: 0.05 }),
  // ไหมพรมกลิ้งบนพรม — ฟืดทุ้มเบา ๆ
  roll: () => noise({ dur: 0.45, vol: 0.05, type: 'lowpass', freq: 420, q: 0.6, attack: 0.08 }),
  // กรนเบา ๆ ตอนหลับ — หายใจเข้าช้าแล้วออก
  snore: () => {
    noise({ dur: 0.9, vol: 0.045, type: 'lowpass', freq: 340, q: 0.9, attack: 0.55 });
    later(() => noise({ dur: 0.7, vol: 0.03, type: 'lowpass', freq: 520, freqTo: 260, q: 0.7, attack: 0.08 }), 950);
  },
  // เลียขน "แผล็บ" — สั้นกว่าเลียน้ำ
  lick: () => tone(rnd(620, 720), rnd(1100, 1250), 0.045, 'sine', 0.04),

  // ══ ท่าเปิดตัวสกิน "เหมียวขนมหวานมหัศจรรย์" ══
  // โทนรวม: หวาน ใส ระยิบ — กระดิ่งแก้ว กล่องดนตรี ป๊อปขนมนุ่ม ๆ ไม่มีเสียงทุ้มแข็ง (ไม่ใช่เสียงต่อสู้)
  // ทุกเสียงเป็นคีย์ C เมเจอร์เดียวกัน ฟังต่อกันทั้งท่าเป็นเพลงสั้น ๆ เพลงเดียว
  // แอบมอง: "เมี้ยว?" สั้น ๆ เสียงขึ้นท้าย (สงสัย) + ประกายเม็ดเดียว
  sweetPeek: () => {
    meow({ start: 620, peak: 760, end: 1100, dur: 0.22, vol: 0.2, q: 4, wobble: 14 });
    later(() => glassBell(3136, 0.35, 0.02), 120);
  },
  // หดหัวกลับ: ลมวืดสั้นกวาดลง + เสียงจี๊ดเล็ก ๆ (ตกใจ)
  sweetHide: () => {
    tone(1500, 2300, 0.06, 'sine', 0.05);
    noise({ dur: 0.17, vol: 0.07, freq: 4200, freqTo: 800, q: 1.3, attack: 0.015 });
  },
  // คัพเค้กพุ่งออกจากขอบ: เสียงสปริงขึ้นสั้น ๆ
  sweetHop: () => {
    tone(260, 760, 0.13, 'sine', 0.07);
    noise({ dur: 0.1, vol: 0.03, freq: 1200, freqTo: 3000, q: 1.2, attack: 0.02 });
  },
  // คัพเค้กแตะพื้น: ตุ้บนุ่ม + "ดึ๋ง" สปริงการ์ตูน
  sweetBoing: () => {
    tone(130, 70, 0.09, 'sine', 0.11);
    tone(230, 560, 0.08, 'sine', 0.1);
    later(() => tone(560, 300, 0.16, 'triangle', 0.055), 75);
    later(() => tone(420, 340, 0.12, 'sine', 0.03), 170);
  },
  // คัพเค้กสั่นรอป๊อป: กุกกักเบา ๆ ห้าที + กระดิ่งจิ๋วกรุ๊งกริ๊ง
  sweetRattle: () => {
    [0, 90, 165, 230, 285].forEach((ms, i) => later(() => {
      noise({ dur: 0.045, vol: 0.05 + i * 0.006, freq: 3200 + i * 200, q: 3 });
      tone([2637, 2960, 3136, 3520, 3951][i], null, 0.12, 'triangle', 0.02);
    }, ms));
  },
  // ป๊อป! ฝาคัพเค้กเปิด: เสียงจุกขวด + ลมพุ่งขึ้น + ครีมฟุ้งนุ่ม
  sweetPop: () => {
    noise({ dur: 0.06, vol: 0.13, freq: 1700, q: 0.8 });
    tone(950, 240, 0.08, 'sine', 0.12);
    later(() => noise({ dur: 0.38, vol: 0.05, freq: 800, freqTo: 6000, q: 1.2, attack: 0.05 }), 30);
    later(() => noise({ dur: 0.32, vol: 0.05, type: 'lowpass', freq: 900, freqTo: 300, q: 0.7, attack: 0.03 }), 50);
  },
  // รวมพลัง: กระดิ่งแก้วไล่ขึ้นหกโน้ต เร่งจังหวะเข้าหาจุดปรากฏ + ลมประกายพัดเข้ากลาง
  sweetGather: () => {
    noise({ dur: 0.62, vol: 0.03, freq: 2600, freqTo: 9000, q: 1.1, attack: 0.5 });
    [1046, 1318, 1568, 2093, 2637, 3136].forEach((f, i) => later(() => glassBell(f, 0.5, 0.032 + i * 0.005), [0, 120, 220, 305, 375, 430][i]));
  },
  // ปรากฏตัว: ป๊อปนุ่มกลมตอนแสงวาบ + คอร์ดประกายใส ๆ ค้าง + ลมริบบิ้นวืดพันตัว
  sweetAppear: () => {
    tone(380, 960, 0.1, 'sine', 0.13);
    noise({ dur: 0.1, vol: 0.05, freq: 3000, q: 1.4 });
    [2093, 2637, 3136].forEach((f) => glassBell(f, 1.1, 0.026));
    later(() => tone(4186, null, 0.9, 'sine', 0.016), 40);
    later(() => noise({ dur: 0.62, vol: 0.05, freq: 650, freqTo: 5200, q: 1.2, attack: 0.16 }), 70);
  },
  // ลืมตา + คทาโผล่: กล่องดนตรีเมโลดี้หวานห้าโน้ต (โน้ตท้ายค้าง) มีเสียงประสานคู่ล่างเบา ๆ
  sweetMusicBox: () => {
    const mel = [[1318, 0], [1568, 150], [2093, 300], [1976, 450], [2349, 600]];
    mel.forEach(([f, ms], i) => later(() => musicBox(f, i === mel.length - 1 ? 1.1 : 0.55, 0.05), ms));
    later(() => musicBox(784, 0.9, 0.022), 0);
    later(() => musicBox(1046, 1.2, 0.022), 600);
  },
  // รับคทา: ป๊อปนุ่ม "ปุ๊" + กระดิ่งแก้ว "กริ๊ง" ใส ๆ
  sweetCatch: () => {
    tone(560, 880, 0.07, 'sine', 0.11);
    later(() => glassBell(2637, 0.6, 0.05), 30);
    later(() => glassBell(3520, 0.45, 0.025), 90);
  },
  // ควงคทา: ลมวืดกวาดขึ้นสองรอบตามวงที่ควง + เสียงเวทเลื่อนขึ้นนุ่ม ๆ (ท่าเปิดตัวยืดเวลา: ควงรอบละ ~0.42 วิ)
  sweetTwirl: () => {
    noise({ dur: 0.42, vol: 0.05, freq: 700, freqTo: 4200, q: 1.5, attack: 0.16 });
    later(() => noise({ dur: 0.42, vol: 0.055, freq: 900, freqTo: 6200, q: 1.5, attack: 0.16 }), 410);
    tone(660, 1760, 0.82, 'sine', 0.028);
    later(() => tone(990, 2640, 0.7, 'triangle', 0.016), 160);
  },
  // ระเบิดขนม: ป๊อปขนมรัวเก้าเม็ด (สุ่มเสียงสูงต่ำ) + กระดิ่งแก้วไล่ลงพรั่งพรู + ฟองนุ่มทุ้มรองนิดเดียว
  sweetBurst: () => {
    tone(220, 120, 0.22, 'sine', 0.07);
    noise({ dur: 0.14, vol: 0.06, freq: 2200, freqTo: 900, q: 1.2 });
    for (let i = 0; i < 9; i++) later(() => tone(rnd(480, 900), rnd(1150, 1900), 0.07, 'sine', 0.075), 40 + i * 42 + rnd(-10, 10));
    [3136, 2637, 2349, 2093, 1568, 1318].forEach((f, i) => later(() => glassBell(f, 0.55, 0.03), 110 + i * 55));
  },
  // โพสท่าแอ็ค: เมี้ยวอ้อนเสียงใส ลงท้ายสูงกว่าที่เริ่ม (end > start = น่ารัก ขี้อ้อน)
  sweetMew: () => meow({ start: 760, peak: 1180, end: 1060, dur: 0.28, vol: 0.24, q: 4, wobble: 15 }),
  // กระดิ่งหางตอนหางตวัด: กรุ๊งกริ๊งสามเม็ด + ระฆังค้าง
  sweetBell: () => {
    [0, 60, 130].forEach((ms, i) => later(() => tone([2637, 3520, 2960][i], null, 0.24, 'triangle', 0.04), ms));
    later(() => glassBell(3136, 0.7, 0.026), 150);
  },
  // ปิดท่า: ประกายระยิบหกเม็ดเบาลงเรื่อย ๆ + เสียงใสสูงค้างแล้วจางหายไปพร้อมแสงฉาก
  sweetShimmer: () => {
    [4186, 3520, 3951, 3136, 3520, 2637].forEach((f, i) => later(() => tone(f, null, 0.35, 'sine', 0.03 - i * 0.004), i * 85));
    later(() => tone(2093, null, 1.2, 'sine', 0.016), 120);
  },

  // ══ ท่าเปิดตัวสกิน "องค์หญิงหิมะ" (รอบสาม: จอน้ำแข็งเกาะ → เกล็ดหิมะลอยลง → ดอกน้ำแข็งบาน → ยิงเวททำลายจอ → กระโดด ปัดคทา → โพสเสกน้ำแข็ง) ══
  // โทนรวม: หนาวใส ระยิบ สง่า — ลมหนาว กระดิ่งแก้ว กล่องดนตรี แก้วร้าว/แตก · คีย์ D เมเจอร์ (D E F# A B) ทั้งท่า
  // น้ำแข็งเกาะจอ: เสียงน้ำแข็งเกาะ "กริ๊ก ๆ" ถี่ ๆ + ลมหนาว + เสียงใสสูงลอยค้าง
  snowFreeze: () => {
    noise({ dur: 1.6, vol: 0.035, freq: 500, freqTo: 1400, q: 0.8, attack: 0.7 });
    [0, 70, 150, 210, 290, 360].forEach((ms, i) => later(() => noise({ dur: 0.05, vol: 0.025 + i * 0.003, freq: 5200 + i * 300, q: 4 }), ms));
    later(() => tone(2349, null, 1.4, 'sine', 0.012), 300);
  },
  // เกล็ดหิมะลอยลง: กระดิ่งแก้วหกโน้ตไล่ลงช้า ๆ (ดวงละโน้ต) + ระยิบจิ๋ว
  snowDescend: () => {
    [2960, 2637, 2349, 1976, 1760, 1480].forEach((f, i) => later(() => glassBell(f, 0.8, 0.026), i * 230));
    later(() => noise({ dur: 0.8, vol: 0.016, freq: 7000, q: 2, attack: 0.3 }), 200);
  },
  // หมุนวนเข้ากลาง: ลมหมุนกวาดขึ้น + ระยิบเร่งจังหวะ
  snowGather: () => {
    noise({ dur: 0.7, vol: 0.04, freq: 600, freqTo: 4200, q: 1.5, attack: 0.4 });
    [1480, 1760, 2217, 2637, 2960, 3520].forEach((f, i) => later(() => glassBell(f, 0.35, 0.02 + i * 0.003), [0, 110, 200, 270, 325, 365][i]));
  },
  // ดอกน้ำแข็งตูมเต้นตุบ ๆ: "ติ๊ง" แก้วสามทีถี่ขึ้น
  snowBud: () => {
    [0, 260, 440].forEach((ms, i) => later(() => { tone(140, 90, 0.12, 'sine', 0.06); glassBell([1760, 2217, 2637][i], 0.4, 0.024); }, ms));
  },
  // "ปริ๊ง": บานนุ่ม ๆ — คอร์ดกระดิ่งใส + ระยิบพรั่งพรูไล่ขึ้น + ลมนุ่ม
  snowBloom: () => {
    tone(600, 1200, 0.08, 'sine', 0.08);
    [1175, 1480, 1760, 2349].forEach((f) => glassBell(f, 1.4, 0.026));
    [2637, 2960, 3520, 3951, 4699].forEach((f, i) => later(() => glassBell(f, 0.45, 0.018), 80 + i * 60));
    later(() => noise({ dur: 0.6, vol: 0.035, freq: 900, freqTo: 5600, q: 1.2, attack: 0.15 }), 40);
  },
  // ลืมตา: กล่องดนตรีเมโลดี้ฤดูหนาวห้าโน้ต (โน้ตท้ายค้าง) + คู่ล่างเบา ๆ
  snowWake: () => {
    const mel = [[1480, 0], [1760, 150], [2349, 300], [2217, 450], [2960, 600]];
    mel.forEach(([f, ms], i) => later(() => musicBox(f, i === mel.length - 1 ? 1.1 : 0.55, 0.045), ms));
    later(() => musicBox(740, 0.9, 0.02), 0);
    later(() => musicBox(1175, 1.2, 0.02), 600);
  },
  // เห็นน้ำแข็งเกาะจอ: "เมี้ยว?" สั้น ๆ เสียงขึ้นท้าย (สงสัย)
  snowNotice: () => meow({ start: 640, peak: 780, end: 1120, dur: 0.24, vol: 0.2, q: 4, wobble: 14 }),
  // เล็ง-ชาร์จ: เสียงใสไล่ขึ้นค่อย ๆ ดัง + ลมประกาย (ท่าเปิดตัวยืดเวลา: เล็งถึงยิง ~0.37 วิ)
  snowCharge: () => {
    tone(740, 2349, 0.36, 'sine', 0.03);
    noise({ dur: 0.36, vol: 0.025, freq: 3000, freqTo: 9000, q: 2, attack: 0.28 });
    [1760, 2349, 2960].forEach((f, i) => later(() => glassBell(f, 0.3, 0.02), 60 + i * 95));
  },
  // ยิงเวทเข้าหาจอ: "ฟิ้ว" พุ่ง + กระดิ่งใส
  snowCast: () => {
    noise({ dur: 0.22, vol: 0.07, freq: 1200, freqTo: 7000, q: 1.4, attack: 0.02 });
    tone(880, 3520, 0.18, 'sine', 0.05);
    later(() => glassBell(3520, 0.5, 0.03), 60);
  },
  // จอร้าว: แกร๊ก ๆ ถี่ขึ้นเรื่อย ๆ
  snowCrack: () => {
    [0, 85, 155, 215, 265, 300].forEach((ms, i) => later(() => {   // ร้าวถึงแตก ~0.31 วิ (ยืดเวลาแล้ว)
      noise({ dur: 0.04, vol: 0.06 + i * 0.008, freq: 2600 + i * 450, q: 4 });
      tone(rnd(3000, 4200), null, 0.05, 'triangle', 0.012);
    }, ms));
  },
  // จอแตก: แก้วแตก (ซ่าสูง + กริ๊งรัวพรั่งพรู) + ตุ้บนุ่ม + คอร์ดใสค้าง
  snowShatter: () => {
    noise({ dur: 0.09, vol: 0.15, freq: 3500, q: 0.9 });
    tone(160, 70, 0.3, 'sine', 0.09);
    later(() => noise({ dur: 0.8, vol: 0.06, freq: 6200, freqTo: 2400, q: 1.1, attack: 0.02 }), 20);
    for (let i = 0; i < 14; i++) later(() => glassBell(rnd(2200, 4600), 0.4, 0.018), 30 + i * 32 + rnd(-8, 8));
    later(() => [1175, 1480, 1760, 2349].forEach((f) => glassBell(f, 1.3, 0.022)), 140);
  },
  // กระโดดดีใจ: เด้งนุ่ม "ปุ๊ง" + ระยิบตอนลอย + ตุ้บเบา ๆ ตอนลง
  snowHop: () => {
    tone(300, 760, 0.12, 'sine', 0.07);
    [2349, 2960, 3520].forEach((f, i) => later(() => glassBell(f, 0.35, 0.022), 90 + i * 60));
    later(() => { tone(150, 80, 0.12, 'sine', 0.07); noise({ dur: 0.18, vol: 0.03, freq: 4500, q: 2 }); }, 330);
  },
  // ปัดคทา: ลมวืดโค้ง + กระดิ่งไล่ตามรอยหิมะ
  snowSweep: () => {
    noise({ dur: 0.56, vol: 0.05, freq: 800, freqTo: 4800, q: 1.4, attack: 0.19 });   // ปัดคทา ~0.58 วิ (ยืดเวลาแล้ว)
    [3520, 2960, 2637, 2349, 1760].forEach((f, i) => later(() => glassBell(f, 0.35, 0.02), 100 + i * 68));
  },
  // เสกน้ำแข็งในอุ้งเท้า: คอร์ดเวทก่อตัว (ไล่ขึ้นแล้วค้าง) + ระยิบหมุน
  snowConjure: () => {
    [1175, 1480, 1760, 2349, 2960].forEach((f, i) => later(() => glassBell(f, i === 4 ? 1.2 : 0.5, 0.026), i * 45));
    later(() => noise({ dur: 0.5, vol: 0.025, freq: 3500, freqTo: 8000, q: 1.6, attack: 0.2 }), 120);
  },
  // ขยิบตา: เมี้ยวหวาน ลงท้ายสูง
  snowMew: () => meow({ start: 720, peak: 1120, end: 1080, dur: 0.3, vol: 0.22, q: 4, wobble: 12 }),
  // ปิดท่า: ระยิบหิมะหกเม็ดเบาลง + เสียงใสค้างจางไป
  snowShimmer: () => {
    [4699, 3520, 3951, 2960, 3520, 2349].forEach((f, i) => later(() => tone(f, null, 0.35, 'sine', 0.028 - i * 0.004), i * 90));
    later(() => tone(2349, null, 1.3, 'sine', 0.015), 120);
  },
  // ══ ท่าเปิดตัวสกิน "ลูกคุณหนูจอมซน" (พิธีเปิดตัวที่โดนป่วน: ม่าน กลองรัว แตร → เวทีว่าง → มาการองชนป้าย → โหนเชือก ตีลังกา → โค้งคำนับ → ยิงหนังสติ๊ก) ══
  // โทนรวม: พิธีในวังแบบตลก ๆ — กลองสแนร์ แตรทองเหลือง ฮาร์ปซิคอร์ด (มินูเอต์) สลับเสียงการ์ตูนซน ๆ · คีย์ G เมเจอร์ทั้งท่า
  // กลองรัว: สแนร์รัวถี่ค่อย ๆ ดังขึ้น ~1.2 วิ ปิดด้วยฉาบเบา ๆ
  nobleDrumroll: () => {
    for (let i = 0; i < 38; i++) later(() => noise({ dur: 0.05, vol: 0.016 + i * 0.0016, freq: 1900 + rnd(-200, 200), q: 0.7 }), i * 28 + rnd(-4, 4));
    later(() => { noise({ dur: 0.5, vol: 0.05, type: 'highpass', freq: 5200, attack: 0.005 }); tone(180, 120, 0.2, 'sine', 0.06); }, 1080);
  },
  // ป้ายผ้าคลี่ลง: ผ้าสะบัด "ฟึ่บ" + ม้วนกลิ้งลง
  nobleUnroll: () => {
    noise({ dur: 0.5, vol: 0.05, type: 'lowpass', freq: 1800, freqTo: 400, q: 0.8, attack: 0.04 });
    later(() => noise({ dur: 0.08, vol: 0.06, freq: 900, q: 1.2 }), 420);
  },
  // แตรประโคม: "ปา-ปา-ปา ป๊าม!" ทองเหลือง (sawtooth + square) + คอร์ดรองค้าง
  nobleFanfare: () => {
    const brass = (f, d, v) => { tone(f, null, d, 'sawtooth', v); tone(f, null, d, 'square', v * 0.45); tone(f * 2, null, d * 0.8, 'triangle', v * 0.35); };
    [[392, 0, 0.12], [587, 140, 0.12], [784, 280, 0.12], [988, 440, 0.75]].forEach(([f, ms, d]) => later(() => brass(f, d, 0.022), ms));
    later(() => { brass(392, 0.8, 0.012); brass(494, 0.8, 0.011); brass(587, 0.8, 0.011); }, 440);
  },
  // ม่านเปิด: ผ้ากำมะหยี่ไถลยาว + รอกเชือกติ๊ก ๆ
  nobleCurtain: () => {
    noise({ dur: 0.9, vol: 0.05, type: 'bandpass', freq: 700, freqTo: 1500, q: 0.6, attack: 0.15 });
    [0, 120, 230, 330, 420, 500].forEach((ms) => later(() => noise({ dur: 0.03, vol: 0.03, freq: 3200, q: 5 }), ms));
  },
  // เวทีว่าง "…?": จิ้งหรีดสองสามที + ไซโลโฟนสองโน้ตลงแบบงง ๆ
  nobleHuh: () => {
    [0, 90, 180].forEach((ms) => later(() => tone(4400, 4300, 0.05, 'sine', 0.012), ms));
    later(() => { tone(784, null, 0.18, 'triangle', 0.05); }, 380);
    later(() => { tone(587, 554, 0.32, 'triangle', 0.05); }, 560);
  },
  // ยิงหนังสติ๊กนอกจอ: "ปึ๋ง" ยางดีด + ลมวืดเข้ามา
  nobleShoot: () => {
    tone(170, 95, 0.16, 'sawtooth', 0.035);
    tone(340, 190, 0.12, 'triangle', 0.04);
    later(() => noise({ dur: 0.22, vol: 0.05, freq: 2600, freqTo: 900, q: 1.2, attack: 0.03 }), 40);
  },
  // มาการองชนป้าย: ป๊อปนุ่ม + ผ้าสะบัด
  nobleHit: () => {
    noise({ dur: 0.06, vol: 0.12, freq: 1500, q: 0.9 });
    tone(880, 260, 0.09, 'sine', 0.1);
    later(() => noise({ dur: 0.3, vol: 0.05, type: 'lowpass', freq: 1400, freqTo: 500, q: 0.8, attack: 0.02 }), 40);
  },
  // ป้ายพลิก: ลมวืดหมุน + ไซโลโฟนไล่ลงขำ ๆ
  nobleFlip: () => {
    noise({ dur: 0.3, vol: 0.045, freq: 900, freqTo: 3000, q: 1.4, attack: 0.08 });
    [1568, 1319, 1175, 988, 784].forEach((f, i) => later(() => tone(f, null, 0.12, 'triangle', 0.035), 80 + i * 55));
  },
  // โหนเชือกเข้าฉาก: ลมวู้บยาวกวาดขึ้นลง + เมี้ยว "เย้~" ดีใจ
  nobleSwing: () => {
    noise({ dur: 0.8, vol: 0.06, freq: 500, freqTo: 1800, q: 1.1, attack: 0.3 });
    later(() => meow({ start: 700, peak: 1250, end: 980, dur: 0.5, vol: 0.2, q: 4, wobble: 9 }), 120);
  },
  // ปล่อยมือตีลังกา: ฟิ้ววหมุน + ระยิบ
  nobleSpin: () => {
    noise({ dur: 0.38, vol: 0.07, freq: 900, freqTo: 3600, q: 1.4, attack: 0.05 });
    [1568, 1976, 2349].forEach((f, i) => later(() => glassBell(f, 0.3, 0.02), 60 + i * 70));
  },
  // ลงเวที "ตึง!" + หมวกเด้ง "ดึ๋ง"
  nobleLand: () => {
    tone(150, 60, 0.2, 'sine', 0.14);
    noise({ dur: 0.12, vol: 0.09, type: 'lowpass', freq: 700, freqTo: 240 });
    later(() => { tone(420, 900, 0.1, 'sine', 0.07); later(() => tone(900, 520, 0.14, 'triangle', 0.04), 90); }, 50);
  },
  // จัดหมวก: ผ้ากรอบแกรบ + "อะแฮ่ม" เมี้ยวทุ้มสั้น
  nobleFix: () => {
    noise({ dur: 0.18, vol: 0.04, freq: 2200, q: 1.5, attack: 0.02 });
    later(() => meow({ start: 430, peak: 520, end: 380, dur: 0.28, vol: 0.16, q: 5, wobble: 8 }), 160);
  },
  // โค้งคำนับ: ฮาร์ปซิคอร์ดเล่นวลีแรกของ "Minuet in G" (Bach/Petzold — สาธารณสมบัติ)
  nobleMinuet: () => {
    const hc = (f, d) => { tone(f, null, d, 'sawtooth', 0.016); tone(f * 2, null, d * 0.5, 'triangle', 0.012); tone(f / 2, null, d * 0.6, 'triangle', 0.008); };
    [[587, 0], [392, 300], [440, 450], [494, 600], [523, 750], [587, 900], [392, 1200], [392, 1500]].forEach(([f, ms], i) => later(() => hc(f, i === 7 ? 0.6 : 0.32), ms));
    [[196, 0], [247, 900], [196, 1200]].forEach(([f, ms]) => later(() => tone(f, null, 0.5, 'triangle', 0.016), ms));
  },
  // ชักหนังสติ๊ก: ป๊อปประกาย "ติ๊ง!"
  nobleGrab: () => {
    tone(520, 1040, 0.08, 'sine', 0.08);
    later(() => glassBell(1976, 0.5, 0.04), 40);
    later(() => glassBell(2637, 0.4, 0.022), 100);
  },
  // ง้างยาง: เสียงยางยืดครืดไต่ขึ้น
  noblePull: () => {
    tone(160, 330, 0.36, 'sawtooth', 0.016);
    noise({ dur: 0.36, vol: 0.025, freq: 500, freqTo: 1300, q: 4, attack: 0.25 });
  },
  // ขยิบตาแลบลิ้น: หัวเราะคิกคักแบบแมว "เหมี๊ยว ฮิ ๆ"
  nobleGiggle: () => {
    meow({ start: 900, peak: 1350, end: 1150, dur: 0.12, vol: 0.17, q: 4, wobble: 18 });
    later(() => meow({ start: 950, peak: 1400, end: 1200, dur: 0.11, vol: 0.15, q: 4, wobble: 18 }), 150);
  },
  // ยิง! ยางดีด + มาการองพุ่งเข้าหากล้อง (ลมดังขึ้นเรื่อย ๆ)
  nobleFire: () => {
    tone(230, 110, 0.18, 'square', 0.04);
    tone(460, 220, 0.12, 'triangle', 0.04);
    noise({ dur: 0.26, vol: 0.07, freq: 600, freqTo: 5200, q: 1.2, attack: 0.2 });
  },
  // มาการองแตก + ไฟเวทีสว่าง: ป๊อป + ฉาบ + แตรสั้นสองโน้ต + กระดิ่งทองพรั่งพรู
  nobleBurst: () => {
    noise({ dur: 0.07, vol: 0.14, freq: 1600, q: 0.9 });
    tone(950, 240, 0.09, 'sine', 0.11);
    later(() => noise({ dur: 0.9, vol: 0.045, type: 'highpass', freq: 5000, attack: 0.01 }), 20);
    const brass = (f, d, v) => { tone(f, null, d, 'sawtooth', v); tone(f * 2, null, d * 0.8, 'triangle', v * 0.35); };
    later(() => { brass(784, 0.14, 0.018); brass(988, 0.14, 0.014); }, 60);
    later(() => { brass(1175, 0.7, 0.018); brass(988, 0.7, 0.012); brass(784, 0.7, 0.012); }, 210);
    [3136, 2637, 2349, 1976, 1568, 1319].forEach((f, i) => later(() => glassBell(f, 0.55, 0.026), 120 + i * 55));
  },
  // ปิดท่า: ประกายทองหกเม็ดเบาลง + เสียงใสค้างจางไป
  nobleShimmer: () => {
    [3136, 2637, 2960, 2349, 2637, 1976].forEach((f, i) => later(() => tone(f, null, 0.35, 'sine', 0.026 - i * 0.0035), i * 90));
    later(() => tone(1568, null, 1.2, 'sine', 0.014), 120);
  },
  // ══ ท่าเปิดตัวสกิน "พี่ชาวี" (วีไอพีมาถึง: ช่องมองภาพปาปารัสซี่ → ประตูหมุน → เดินเท่ แฟลชรัว → วิทยุ → เลื่อนแว่น → กระเป๋าทอง → ชัตเตอร์ปกนิตยสาร) ══
  // โทนรวม: แจ๊สล็อบบี้โรงแรมยามค่ำ — ดับเบิลเบสเดิน ไวบราโฟน ทองเหลืองสั้น ๆ สลับเสียงกล้อง/วิทยุจริง · คีย์ D ไมเนอร์
  // ล็อบบี้ยามค่ำ: ดับเบิลเบสเดินสี่โน้ต + แปรงกลองปัด + คอร์ดไวบราโฟนค้าง
  chaweeLobby: () => {
    const bass = (f, d) => { tone(f, f * 0.98, d, 'triangle', 0.09); tone(f * 2, null, d * 0.5, 'sine', 0.025); };
    [[73.4, 0], [87.3, 380], [110, 760], [130.8, 1140]].forEach(([f, ms]) => later(() => bass(f, 0.34), ms));
    [0, 380, 760, 1140].forEach((ms) => later(() => noise({ dur: 0.22, vol: 0.02, freq: 4200, q: 0.6, attack: 0.06 }), ms + 190));
    later(() => [293.7, 349.2, 440, 523.3, 659.3].forEach((f, i) => later(() => glassBell(f, 1.4, 0.014), i * 30)), 1420);
  },
  // กล้องเริ่มอัด: "ปิ๊บ ปิ๊บ" + เสียงฮัมมอเตอร์เบา ๆ
  chaweeRec: () => {
    [0, 110].forEach((ms) => later(() => tone(2093, null, 0.06, 'sine', 0.05), ms));
    later(() => tone(120, null, 0.5, 'sawtooth', 0.006), 160);
  },
  // ประตูหมุนกระจก: ลมวืดช้า ๆ ขึ้นลง + กระจกกระทบเบา ๆ
  chaweeDoor: () => {
    noise({ dur: 1.1, vol: 0.04, type: 'bandpass', freq: 420, freqTo: 1100, q: 0.7, attack: 0.4 });
    later(() => glassBell(1760, 0.3, 0.012), 520);
  },
  // โฟกัสล็อก: ปิ๊บสูงสองที
  chaweeLock: () => {
    [0, 80].forEach((ms) => later(() => tone(2637, null, 0.05, 'square', 0.02), ms));
  },
  // รองเท้าหนังบนพื้นหินอ่อน "ก๊อก"
  chaweeStep: () => {
    noise({ dur: 0.035, vol: 0.06, type: 'highpass', freq: 2600, attack: 0.002 });
    tone(190, 120, 0.05, 'sine', 0.05);
  },
  // ชัตเตอร์กล้อง "แชะ" + แฟลชชาร์จหวีดสั้น
  chaweeShutter: () => {
    noise({ dur: 0.02, vol: 0.09, freq: 3000, q: 0.8 });
    later(() => noise({ dur: 0.03, vol: 0.06, freq: 1800, q: 1 }), 45);
    later(() => tone(2800 + rnd(-300, 300), 5200, 0.14, 'sine', 0.008), 60);
  },
  // วิทยุเข้า: คลิก + ซ่าสั้น + ปิ๊บ
  chaweeRadio: () => {
    tone(1400, null, 0.03, 'square', 0.03);
    later(() => noise({ dur: 0.38, vol: 0.035, type: 'bandpass', freq: 1800, q: 0.9, attack: 0.02 }), 40);
    later(() => tone(1760, null, 0.08, 'sine', 0.04), 420);
  },
  // ตอบวิทยุ: เมี้ยวทุ้มนิ่ง ๆ "ครับ" + คลิกปิดสาย
  chaweeRoger: () => {
    meow({ start: 380, peak: 470, end: 360, dur: 0.3, vol: 0.15, q: 5, wobble: 6 });
    later(() => { noise({ dur: 0.12, vol: 0.025, type: 'bandpass', freq: 1800, q: 0.9 }); tone(1400, null, 0.03, 'square', 0.025); }, 520);
  },
  // เลื่อนแว่น: "ฟึ่บ" สั้น + แสงวิ้งบนเลนส์
  chaweeShades: () => {
    noise({ dur: 0.16, vol: 0.035, freq: 1500, freqTo: 3200, q: 1.3, attack: 0.04 });
    later(() => glassBell(2637, 0.4, 0.03), 120);
  },
  // ขยิบตา: วิ้งสองเม็ด + เมี้ยวสั้นเท่ ๆ
  chaweeWink: () => {
    [3136, 3951].forEach((f, i) => later(() => glassBell(f, 0.35, 0.025), i * 70));
    later(() => meow({ start: 560, peak: 760, end: 640, dur: 0.18, vol: 0.13, q: 4, wobble: 10 }), 160);
  },
  // สลักกระเป๋า "แกร๊ก" โลหะ
  chaweeLatch: () => {
    tone(1900, 1200, 0.03, 'square', 0.03);
    noise({ dur: 0.03, vol: 0.06, type: 'highpass', freq: 3500 });
  },
  // แง้มกระเป๋า แสงทองทะลัก: วืดขึ้น + กระดิ่งทองไล่ขึ้น + คอร์ดค้างอุ่น ๆ
  chaweeGold: () => {
    noise({ dur: 0.6, vol: 0.05, freq: 600, freqTo: 4200, q: 1.2, attack: 0.25 });
    [1175, 1397, 1760, 2093, 2349, 2794].forEach((f, i) => later(() => glassBell(f, 0.6, 0.024), 80 + i * 55));
    later(() => [587, 698, 880].forEach((f) => tone(f, null, 0.9, 'triangle', 0.012)), 120);
  },
  // ชัตเตอร์ใหญ่ปกนิตยสาร: แชะดัง + แฟลชป๊อป + ตุ้บต่ำ
  chaweeSnap: () => {
    noise({ dur: 0.03, vol: 0.13, freq: 2600, q: 0.8 });
    later(() => noise({ dur: 0.05, vol: 0.09, freq: 1500, q: 1 }), 60);
    later(() => { tone(140, 70, 0.22, 'sine', 0.1); noise({ dur: 0.5, vol: 0.03, type: 'highpass', freq: 6000, attack: 0.005 }); }, 70);
  },
  // ไฟล็อบบี้สว่าง: ทองเหลือง "บ๊า—ดา!" + เบสลง + ฉาบแปรง
  chaweeJazz: () => {
    const brass = (f, d, v) => { tone(f, null, d, 'sawtooth', v); tone(f * 2, null, d * 0.7, 'triangle', v * 0.3); };
    later(() => { brass(587, 0.12, 0.016); brass(698, 0.12, 0.013); brass(880, 0.12, 0.013); }, 0);
    later(() => { brass(523, 0.7, 0.016); brass(659, 0.7, 0.013); brass(784, 0.7, 0.013); brass(988, 0.7, 0.01); }, 200);
    later(() => tone(73.4, 72, 0.6, 'triangle', 0.09), 200);
    later(() => noise({ dur: 0.9, vol: 0.03, type: 'highpass', freq: 5200, attack: 0.01 }), 200);
  },

  // ══ ท่าเปิดตัวชุดคู่ "สไบไทย" + "หนุ่มไทยโจงกระเบน" (ริมแม่น้ำยามเย็น: ยื่นดอกบัว เขิน ๆ · หนุ่มวิ่งจู๊ด เสกดอกบัว) ══
  // โทนรวม: ระนาดเอก/ขิมห้าเสียงไทย (โด เร มี ซอล ลา) หวาน ๆ ช้า ๆ + น้ำไหลเบา ๆ — ตลกตอนหนุ่มวิ่ง/ย่อง
  // ริมน้ำยามเย็น: น้ำไหลเบา ๆ + กระดิ่งใสแว่ว (ทำนองหลักอยู่ในเพลงประกอบ pairSong*)
  pairRiver: () => {
    noise({ dur: 2.6, vol: 0.022, type: 'bandpass', freq: 700, freqTo: 900, q: 0.6, attack: 0.8 });
    [2093, 2637, 3136].forEach((f, i) => later(() => glassBell(f, 0.7, 0.012), 400 + i * 300));
  },
  // หันมาหากล้อง: ผ้าไหวฟึ่บ + ขิมกรีดขึ้น
  pairTurn: () => {
    noise({ dur: 0.3, vol: 0.03, freq: 900, freqTo: 2200, q: 1, attack: 0.1 });
    [1046, 1175, 1319, 1568].forEach((f, i) => later(() => glassBell(f, 0.4, 0.016), 80 + i * 45));
  },
  // ฝันหวาน ตาวิ้ง: กริ๊งใส ๆ สามเม็ดห่าง ๆ
  pairDream: () => {
    [2093, 2637, 3136].forEach((f, i) => later(() => glassBell(f, 0.6, 0.02), i * 240));
  },
  // แขนยื่นดอกบัวเข้าเฟรม: ผ้าเสียดสีเบา ๆ
  pairPaw: () => noise({ dur: 0.25, vol: 0.025, freq: 1200, freqTo: 600, q: 1.1, attack: 0.08 }),
  // ตาวาวเหลือบเห็น: "ติ๊ง!" ใสสูง
  pairTing: () => {
    glassBell(2637, 0.5, 0.05);
    later(() => glassBell(3951, 0.4, 0.03), 60);
  },
  // หนุ่มยิ้มนิด ๆ: ระนาดสองโน้ตอุ่น ๆ
  pairSmile: () => {
    [[659, 0], [784, 140]].forEach(([f, ms]) => later(() => { tone(f, null, 0.5, 'triangle', 0.04); tone(f * 2, null, 0.2, 'sine', 0.01); }, ms));
  },
  // ค่อย ๆ ลุกยืน: ขิมรัวไล่ขึ้นช้า ๆ
  pairRise: () => {
    [523, 587, 659, 784, 880, 1046, 1175, 1319].forEach((f, i) => later(() => glassBell(f, 0.5, 0.018), i * 110));
  },
  // รับดอกบัว: กระดิ่งทองพรั่งพรูเบา ๆ + คอร์ดหวานค้าง
  pairGive: () => {
    [1568, 1319, 1175, 1046, 1319, 1568, 2093].forEach((f, i) => later(() => glassBell(f, 0.6, 0.02), i * 60));
    later(() => [523, 659, 784].forEach((f) => tone(f, null, 1.3, 'triangle', 0.014)), 120);
  },
  // เขิน: เมี้ยวเบา ๆ อ้อน ๆ สองตัว (หญิงสูง ชายทุ้ม) + หัวใจป๊อปเบา ๆ
  pairShy: () => {
    meow({ start: 880, peak: 1180, end: 900, dur: 0.22, vol: 0.1, q: 5, wobble: 14 });
    later(() => meow({ start: 520, peak: 680, end: 520, dur: 0.24, vol: 0.1, q: 5, wobble: 10 }), 380);
    [0, 260, 520].forEach((ms) => later(() => tone(1200, 1700, 0.07, 'sine', 0.025), 700 + ms));
  },
  // สบตากัน โลกสีชมพู: ฮาร์ปกวาดขึ้นหวาน ๆ + คอร์ดค้างอุ่น ๆ + กระดิ่งวิ้ง (ผู้ใช้ 24 ต.ค. "โลกสีชมพูสุดโรแมนติก")
  pairRomance: () => {
    [523, 659, 784, 1046, 1319, 1568, 2093].forEach((f, i) => later(() => tone(f, null, 0.9, 'triangle', 0.03), i * 70));
    later(() => [392, 523, 659, 784].forEach((f) => tone(f, f * 1.003, 3.2, 'sine', 0.018)), 300);
    [2637, 3136, 3520].forEach((f, i) => later(() => glassBell(f, 0.8, 0.016), 700 + i * 380));
  },
  // ตัดไปหน้าหนุ่ม: ถอนใจหวาน ๆ + กระดิ่งสองเม็ด
  pairSigh2: () => {
    meow({ start: 560, peak: 640, end: 470, dur: 0.6, vol: 0.08, q: 5, wobble: 10 });
    [1568, 2093].forEach((f, i) => later(() => glassBell(f, 0.6, 0.018), 260 + i * 200));
  },
  // สะดุ้ง! เสียงกระดิ่งแตก + "ปึ๊ง" + เมี้ยวตกใจสองตัว
  pairStartle: () => {
    tone(880, 1760, 0.06, 'square', 0.03);
    noise({ dur: 0.12, vol: 0.06, type: 'highpass', freq: 2500, attack: 0.002 });
    later(() => meow({ start: 900, peak: 1500, end: 1300, dur: 0.14, vol: 0.12, q: 4, wobble: 20 }), 40);
    later(() => meow({ start: 600, peak: 1000, end: 860, dur: 0.15, vol: 0.12, q: 4, wobble: 20 }), 90);
  },
  // หัวเราะเขิน ๆ: เมี้ยวคิกคักสลับสองเสียง + ระนาดเบา ๆ
  pairLaugh: () => {
    [[0, 1200], [150, 1300], [300, 760], [450, 840], [620, 1250], [780, 800]].forEach(([ms, f]) => later(() => meow({ start: f * 0.9, peak: f, end: f * 0.92, dur: 0.1, vol: 0.09, q: 4, wobble: 16 }), ms));
    [[784, 200], [880, 500], [1046, 800]].forEach(([f, ms]) => later(() => tone(f, null, 0.4, 'triangle', 0.025), ms));
  },
  // ── เพลงประกอบท่าเปิดตัวคู่ (ผู้ใช้ 24 ต.ค. "เพลงไทยโรแมนติก ทำนองเพราะ ๆ") ──
  // ทำนองห้าเสียงไทย (โด เร มี ซอล ลา) ช้า 72 bpm · ขิมรัวเสียงยาว · ฉิ่ง-ฉับ · เบสกับคอร์ดนุ่ม ๆ
  // ตัดเป็นท่อนละ 4 จังหวะ (200 เฟรม) ท่อน A–D วนต่อกัน — ตัวท่าเปิดตัวเรียกทีละท่อน (กดข้าม/หยุด เพลงหยุดตามท่อน)
  pairSongA: () => pairPhrase(0),
  pairSongB: () => pairPhrase(1),
  pairSongC: () => pairPhrase(2),
  pairSongD: () => pairPhrase(3),
  pairSongEnd: () => pairPhrase(4),
  pairSongH: () => pairPhrase(5),
  ...Object.fromEntries(Object.keys(S_SONGS).flatMap((id) => [0, 1, 2, 3, 4].map((i) => [id + 'Song' + 'ABCDE'[i], () => sPhrase(id, i)]))),   // sweetSongA … chaweeSongE (E = ปิดเพลง)
  // ── เหตุการณ์สุ่มระหว่างวิ่ง (run-extras.js · เกมเพลย์ใหม่ 25 ต.ค. 2026) ──
  // หมาไล่: เห่า "โฮ่ง โฮ่ง" ทุ้ม ๆ
  eventDog: () => {
    [0, 180].forEach((ms) => later(() => {
      noise({ dur: 0.12, vol: 0.06, type: 'bandpass', freq: 520, freqTo: 300, q: 1.6, attack: 0.01 });
      tone(240, 150, 0.12, 'sawtooth', 0.03);
    }, ms));
  },
  // ฝนตก: ฟ้าร้องไกล ๆ + ฝนซ่า
  eventRain: () => {
    noise({ dur: 1.4, vol: 0.06, type: 'lowpass', freq: 300, freqTo: 120, attack: 0.08 });
    later(() => noise({ dur: 2.4, vol: 0.03, type: 'highpass', freq: 3500, attack: 0.5 }), 300);
  },
  // เตือนเหตุการณ์อันตราย: หวอ "วี้-หว่อ" 4 รอบ (~2.8 วิ ตรงกับช่วงเตือน 3 วิ) — สองเสียงซ้อนให้หนาแบบไซเรนจริง
  siren: () => {
    for (let i = 0; i < 4; i++) {
      later(() => { tone(620, 980, 0.34, 'sawtooth', 0.04); tone(624, 986, 0.34, 'triangle', 0.06); }, i * 700);
      later(() => { tone(980, 620, 0.34, 'sawtooth', 0.04); tone(986, 624, 0.34, 'triangle', 0.06); }, i * 700 + 350);
    }
  },
  // ฝนตก: ฟ้าร้อง — แตกเปรี๊ยะสั้น ๆ แล้วครืนต่ำยาว
  thunder: () => {
    noise({ dur: 0.18, vol: 0.07, type: 'highpass', freq: 1800, attack: 0.005 });
    later(() => noise({ dur: 1.6, vol: 0.09, type: 'lowpass', freq: 260, freqTo: 70, attack: 0.04 }), 90);
  },
  // ตลาดนัด: กระดิ่งร้านค้าไล่ขึ้นสดใส
  eventMarket: () => {
    [784, 988, 1175, 1568].forEach((f, i) => later(() => glassBell(f, 0.5, 0.03), i * 90));
  },
  // กลางคืน: คอร์ดต่ำนุ่ม ๆ + นกฮูก "ฮู้ ฮู้"
  eventNight: () => {
    [196, 247, 294].forEach((f) => tone(f, null, 1.4, 'sine', 0.02));
    [400, 700].forEach((ms) => later(() => tone(420, 380, 0.3, 'sine', 0.05), ms));
  },
  // ก้าวเดินบนหญ้า: ฟุบนุ่ม ๆ
  pairStep: () => noise({ dur: 0.06, vol: 0.03, type: 'lowpass', freq: 900, freqTo: 400 }),
  // ดมดอกไม้: สูดลม "ฟืด" + ถอนใจสุข "อืมม"
  pairSniff: () => {
    noise({ dur: 0.35, vol: 0.03, type: 'highpass', freq: 2500, freqTo: 4000, attack: 0.15 });
    later(() => meow({ start: 700, peak: 760, end: 560, dur: 0.5, vol: 0.08, q: 6, wobble: 8 }), 420);
  },
  // ลัลลา: เมี้ยวเป็นทำนองห้าเสียงสั้น ๆ + ระนาดตาม
  pairLala: () => {
    [[1046, 0], [1175, 200], [1319, 400], [1175, 600], [1046, 800], [880, 1000], [1046, 1300]].forEach(([f, ms]) => later(() => {
      meow({ start: f * 0.9, peak: f, end: f * 0.95, dur: 0.16, vol: 0.07, q: 5, wobble: 10 });
      tone(f / 2, null, 0.25, 'triangle', 0.025);
    }, ms));
  },
  // บัวอีกดอกลอยมาตามน้ำ: ประกายทองแว่ว ๆ (แอบใบ้)
  pairHint: () => {
    [2349, 2637, 3136, 3520].forEach((f, i) => later(() => glassBell(f, 0.7, 0.014), i * 120));
  },
  // ปิดท่า: ระนาดสามโน้ตจบวลี + กระดิ่งค้าง
  pairPose: () => {
    [[784, 0], [880, 120], [1046, 260]].forEach(([f, ms]) => later(() => { tone(f, null, 0.6, 'triangle', 0.045); tone(f * 4, null, 0.15, 'sine', 0.008); }, ms));
    later(() => glassBell(2093, 1.2, 0.02), 300);
  },
  // กล้องเหวี่ยง: ลมวืด
  pairWhip: () => noise({ dur: 0.35, vol: 0.05, type: 'bandpass', freq: 400, freqTo: 2600, q: 0.8, attack: 0.12 }),
  // หลงรัก ถอนหายใจ: เมี้ยวทุ้มยาวลากลง "เฮ้อ~"
  pairSigh: () => {
    meow({ start: 620, peak: 700, end: 420, dur: 0.8, vol: 0.1, q: 5, wobble: 12 });
    later(() => [1319, 1175, 1046].forEach((f, i) => later(() => glassBell(f, 0.5, 0.015), i * 160)), 300);
  },
  // ปิ๊ง! ไอเดียผุด
  pairPing: () => {
    tone(1568, 3136, 0.08, 'sine', 0.07);
    later(() => glassBell(3136, 0.5, 0.05), 70);
  },
  // วิ่งจู๊ด: ซิปลมพุ่งสูงขึ้นเร็ว ๆ
  pairDash: () => {
    noise({ dur: 0.28, vol: 0.07, type: 'bandpass', freq: 800, freqTo: 5000, q: 1.4, attack: 0.02 });
    tone(400, 1800, 0.2, 'triangle', 0.03);
  },
  // ไถลหยุด: เอี๊ยด + ฝุ่นฟุ้ง
  pairSkid: () => {
    tone(1300, 900, 0.18, 'sawtooth', 0.012);
    noise({ dur: 0.3, vol: 0.05, type: 'lowpass', freq: 1400, freqTo: 400, attack: 0.01 });
  },
  // ร่ายเวทแมว: เสียงวิ้งหมุนไต่ขึ้น + คอร์ดทองค้าง
  pairCast: () => {
    noise({ dur: 0.8, vol: 0.03, freq: 1200, freqTo: 5200, q: 2, attack: 0.3 });
    [1046, 1319, 1568, 2093, 2637].forEach((f, i) => later(() => glassBell(f, 0.5, 0.02), i * 90));
    later(() => meow({ start: 520, peak: 700, end: 600, dur: 0.22, vol: 0.09, q: 4, wobble: 10 }), 120);
  },
  // บัวผุดจากน้ำ: จ๋อม + ประกาย
  pairLotusRise: () => {
    tone(520, 200, 0.14, 'sine', 0.08);
    noise({ dur: 0.18, vol: 0.04, type: 'highpass', freq: 3000, attack: 0.005 });
    later(() => [1568, 2093, 2637].forEach((f, i) => later(() => glassBell(f, 0.5, 0.02), i * 70)), 160);
  },
  // รับดอกบัวไว้ในมือ: ป๊อปเบา ๆ + เมี้ยวพอใจ
  pairCatch: () => {
    tone(700, 1100, 0.07, 'sine', 0.05);
    later(() => meow({ start: 560, peak: 720, end: 640, dur: 0.18, vol: 0.1, q: 4, wobble: 10 }), 140);
  },
  // ย่อง ๆ: พิซซิคาโต้ปลายเท้าขึ้นลงแบบการ์ตูน
  pairTiptoe: () => {
    [523, 659, 587, 698, 659, 784, 698, 880].forEach((f, i) => later(() => tone(f, null, 0.08, 'triangle', 0.035), i * 170));
  },

  // แสงขาวปิดคลิป — ประกายไล่ขึ้นห้าเม็ด แล้วค้างเสียงใสสูงไว้ให้หายไปพร้อมแสง
  // เบาทุกเม็ด เพราะเป็นจังหวะส่งต่อเข้าหน้าแรก ไม่ใช่จุดพีคของคลิป
  introShine: () => {
    [1046, 1318, 1568, 2093, 2637].forEach((f, i) =>
      later(() => tone(f, null, 0.42, 'sine', 0.06), i * 62)
    );
    later(() => { tone(3136, null, 1.1, 'sine', 0.035); tone(2093, null, 1.2, 'triangle', 0.03); }, 330);
  },

  // ══ ฉากเปิดกาช่า (gacha-cine.js) ══
  // อุ้งเท้าตบเกาะขอบ — ตุ้บนุ่ม ๆ สั้น
  cineGrab: () => {
    noise({ dur: 0.08, vol: 0.12, type: 'lowpass', freq: 700, freqTo: 260 });
    tone(210, 120, 0.07, 'sine', 0.08);
  },
  // หัวโผล่ — ปุ๊ง เด้งขึ้น
  cinePeek: () => {
    tone(330, 660, 0.12, 'sine', 0.11);
    later(() => tone(660, 990, 0.08, 'triangle', 0.06), 70);
  },
  // กรอกตามอง — ติ๊กเบา ๆ
  cineLook: () => tone(1400, 1700, 0.05, 'sine', 0.045),
  // เห็นแคปซูล — กริ๊งประกายสามโน้ตไล่ขึ้น
  cineSpot: () => {
    [1318, 1760, 2349].forEach((f, i) => later(() => glassBell(f, 0.45, 0.05), i * 70));
  },
  // กล้องแพนขึ้น — ลมหวิวกวาดขึ้น
  cinePan: () => noise({ dur: 0.5, vol: 0.06, type: 'bandpass', freq: 500, freqTo: 2400, q: 0.8, attack: 0.15 }),
  // กระโดดม้วนตัว — ฟิ้ววว หมุน + เมี้ยวสั้นดีใจ
  cineFlip: () => {
    noise({ dur: 0.38, vol: 0.09, type: 'bandpass', freq: 900, freqTo: 3200, q: 1.4, attack: 0.05 });
    meow({ start: 700, peak: 1150, end: 900, dur: 0.18, vol: 0.2, q: 4 });
  },
  // คว้าแคปซูล — ตุ้บ + กริ๊งพลาสติก
  cineCatch: () => {
    noise({ dur: 0.1, vol: 0.13, type: 'lowpass', freq: 900, freqTo: 300 });
    later(() => musicBox(1046, 0.35, 0.05), 40);
  },
  // สปอยล์ระดับ A — ประกายหวาน ๆ
  cineSpoilA: () => {
    [1046, 1318, 1568].forEach((f, i) => later(() => musicBox(f, 0.5, 0.045), i * 110));
  },
  // สปอยล์ระดับ S — ชาร์จพลังกวาดขึ้น + ระฆังทองไล่ขึ้น + คอร์ดค้าง
  cineSpoilS: () => {
    tone(260, 1040, 0.9, 'sine', 0.06);
    [784, 988, 1175, 1568, 1976].forEach((f, i) => later(() => glassBell(f, 0.6, 0.05 + i * 0.006), 150 + i * 120));
    later(() => { tone(1568, null, 0.9, 'sine', 0.06); tone(2349, null, 0.8, 'sine', 0.035); }, 820);
  },
  // เกร็งดึงฝา — ครืดสั่น ๆ ไต่ขึ้น
  cineStrain: () => {
    tone(180, 360, 0.26, 'sawtooth', 0.035);
    noise({ dur: 0.26, vol: 0.05, type: 'bandpass', freq: 400, freqTo: 900, q: 3 });
  },
  // ฝาหลุด — ป๊อก! + ลมพุ่ง
  cinePop: () => {
    tone(900, 200, 0.09, 'square', 0.08);
    noise({ dur: 0.12, vol: 0.14, type: 'bandpass', freq: 1800, freqTo: 500, q: 1.2 });
    later(() => noise({ dur: 0.6, vol: 0.07, type: 'highpass', freq: 1200, freqTo: 6000, attack: 0.05 }), 60);
  },
  // แสงขาวเต็มจอ — ประกายใสยาว ๆ
  cineFlash: () => {
    [2093, 2637, 3136, 4186].forEach((f, i) => later(() => tone(f, null, 0.5, 'sine', 0.035), i * 55));
  },

  // ═════════ 🪵 บอสภูตตอไม้ + ลูกน้องวิญญาณท่อนซุงน้อย (ด่านสอนป่าผลึก · ผู้ใช้ 22 พ.ย. 2026) ═════════
  // ชุดเดียวกับเพลง grove / stump / stumpRage (music.js) — ประกอบจากสามเนื้อเสียงเท่านั้น:
  //   ไม้ (woodKnock / woodThud) · คริสตัล (glassBell โน้ตจาก CRY) · เวท (ซ่ากวาดความถี่)
  // โน้ตทุกตัวอยู่ในลาไมเนอร์เพนทาโทนิก = คีย์เดียวกับเพลง ดังทับเพลงตอนไหนก็กลมกลืน
  // เสียงบอสต่ำ/หนา (stumpVoice) · ลูกน้องสูง/สั้น/เบากว่า (ตัวเล็ก) — หูแยกออกว่าใครทำอะไรโดยไม่ต้องมอง

  // ── บอส: เปิดตัว ──
  // ร่วงจากฟ้า: ลมหวีดลงหนัก ๆ + คำรามต่ำไล่มาจากไกล
  stumpDrop: () => {
    noise({ dur: 0.55, vol: 0.1, freq: 3200, freqTo: 380, q: 1.1, attack: 0.4 });
    tone(1318.51, 330, 0.5, 'sine', 0.025);
    later(() => beast({ dur: 0.45, f0: 70, f1: 95, f2: 80, vol: 0.08, flutter: 20, drive: 2, breath: 0.3 }), 120);
  },
  // ลงพื้น: กระแทก "ตูม" + ตอไม้ทั้งต้น + พื้นสะเทือนยาว + เศษผลึกกระเด็น
  stumpLand: () => {
    impact(0.26, 0.9);
    woodThud(0.1);
    woodKnock(200, 0.1);
    rumble(1.1, 0.12);
    [1760, 2637.02, 2093, 3135.96].forEach((f, i) => later(() => glassBell(f, 0.45, 0.022), 70 + i * 60));
  },
  // คำราม: "ร้าาา~" สัตว์ใหญ่แตกพร่า + ก้องสะท้อน (คำรามซ้อนต่ำกว่า ช้ากว่า) + พื้นสะเทือน + ใบไม้สั่น + ไม้ลั่น
  stumpRoar: () => {
    beast({ dur: 1.35, f0: 85, f1: 150, f2: 60, vol: 0.2, flutter: 32, drive: 4.5, vowel: [720, 1120], vowelTo: [430, 720] });
    later(() => beast({ dur: 1.1, f0: 70, f1: 120, f2: 52, vol: 0.08, flutter: 26, drive: 3, breath: 0, sub: 0 }), 170);
    rumble(1.3, 0.12);
    creak(0.8, 0.05, 120);
    later(() => noise({ dur: 0.9, vol: 0.045, freq: 5200, q: 0.8, attack: 0.15 }), 120);
  },

  // ── บอส: ท่าโจมตี ──
  // เตือนก่อนทุกท่า (ตาแดง ย่อตัว): "ฮึ่ย!" ขู่สั้นแตกพร่า + ผลึกกริ๊ง = สัญญาณให้เตรียมหลบ
  stumpWarn: () => {
    beast({ dur: 0.36, f0: 120, f1: 175, f2: 105, vol: 0.15, flutter: 24, drive: 3.5, vowel: [800, 1200], vowelTo: [600, 950], breath: 0.4 });
    later(() => glassBell(1318.51, 0.35, 0.025), 90);
  },
  // ปาเวท — ชาร์จพลังในฝ่ามือ (ช่วงเตือน): วนเวทไต่ขึ้น + ฮัมต่ำ + ประกายแตกเปรี๊ยะ
  stumpCastCharge: () => {
    zap({ from: 70, to: 280, dur: 0.85, vol: 0.06, drive: 6, q: 4 });     // ฮัมพลังมืดไต่ขึ้นในฝ่ามือ
    tone(55, 110, 0.85, 'sawtooth', 0.03);
    noise({ dur: 0.85, vol: 0.04, freq: 1500, freqTo: 6000, q: 3, attack: 0.6 });
    for (let i = 0; i < 8; i++) later(() => noise({ dur: 0.025, vol: 0.05 + i * 0.005, freq: rnd(2500, 6500), q: 6 }), 120 + i * 80 + rnd(-20, 20));   // ประกายไฟฟ้าแตกถี่ขึ้น
  },
  // ปาเวท (ทีละลูก): "ซิ้ว!" แหลมคม ฟันเลื่อยไถลง + แก้วกริ๊ง · ระดับเสียงตามเลน ต่ำ/กลาง/สูง = มี/ซอล/ลา
  stumpCast: (lane = 'low') => {
    const k = { low: 1, mid: 1.26, high: 1.5 }[lane] || 1;                 // ระดับเสียงตามเลน (ต่ำ/กลาง/สูง ฟังออก)
    zap({ from: 1500 * k, to: 200 * k, dur: 0.3, vol: 0.12, drive: 5, q: 2.4 });   // "ซิ้ววว!" แตกพร่า
    noise({ dur: 0.07, vol: 0.12, type: 'highpass', freq: 2600, attack: 0.001 });   // หัวเสียงแตก "เปรี๊ยะ"
    impact(0.1, 1.7);                                                      // ถีบออกจากฝ่ามือ
    later(() => glassBell(880 * k, 0.22, 0.016), 25);                      // เหลือเสียงผลึกนิดเดียว ไม่หวาน
  },
  // ระเบิดพลัง — ตาหยีรวมพลัง (ช่วงเตือน): ฮัมต่ำแตกพร่าไต่ขึ้น + ประกายไฟแตกถี่ขึ้น + คำรามในลำคอ
  stumpBurstCharge: () => {
    beast({ dur: 0.95, f0: 60, f1: 75, f2: 110, vol: 0.1, flutter: 36, drive: 5, vowel: [500, 900], vowelTo: [800, 1300], breath: 0.2 });
    tone(55, 220, 0.95, 'sawtooth', 0.03);
    for (let i = 0; i < 9; i++) later(() => noise({ dur: 0.03, vol: 0.03 + i * 0.004, freq: rnd(2500, 6000), q: 5 }), 120 + i * 85);
  },
  // ระเบิดพลัง (วงคลื่นพื้น): ตูม + คลื่นอู้กวาดขึ้น + แตกพร่าหยาบ + พื้นสะเทือน + ผลึกก้อง
  stumpBurst: () => {
    impact(0.3, 0.85);
    zap({ from: 420, to: 55, dur: 0.6, vol: 0.09, drive: 8, q: 1.4 });   // คลื่นพลังแตกพร่าทุ้มลง
    noise({ dur: 0.2, vol: 0.12, freq: 900, q: 0.6, attack: 0.002 });       // กรอบ "ครืน" ตอนระเบิด
    later(() => noise({ dur: 0.75, vol: 0.08, type: 'lowpass', freq: 220, freqTo: 3200, attack: 0.06 }), 30);
    beast({ dur: 0.5, f0: 90, f1: 60, f2: 45, vol: 0.09, flutter: 40, drive: 6, breath: 0, sub: 0.3 });
    rumble(1.0, 0.12);
    later(() => glassBell(440, 0.6, 0.02), 140);
  },
  // พุ่งชน — ถอยตั้งหลัก (ช่วงเตือน): คำรามต่ำในคอ "กรรรร" ยาว + ไม้ลั่นเอี๊ยด + พื้นครูด + อู้ไต่ขึ้น
  stumpChargeUp: () => {
    beast({ dur: 1.05, f0: 62, f1: 70, f2: 95, vol: 0.13, flutter: 44, drive: 5, vowel: [520, 820], vowelTo: [700, 1100], breath: 0.6 });
    creak(0.9, 0.055, 110);
    noise({ dur: 1.0, vol: 0.05, freq: 400, freqTo: 900, q: 1.2, attack: 0.3 });
    rumble(1.0, 0.07);
  },
  // พุ่งชน (ออกตัว): ตูมถีบตัว + "อ้ากกก!" + ลมวืดหนัก + ไม้กระทบกึกกัก + พื้นสะเทือน
  stumpDash: () => {
    impact(0.24, 0.8);
    beast({ dur: 0.75, f0: 110, f1: 170, f2: 90, vol: 0.18, flutter: 30, drive: 5, vowel: [760, 1180], vowelTo: [520, 820] });
    noise({ dur: 0.9, vol: 0.15, freq: 300, freqTo: 2600, q: 1, attack: 0.15 });
    rumble(0.9, 0.09);
    [0, 60, 120, 180, 240].forEach((ms, i) => later(() => woodKnock(330 - i * 30, 0.06), ms));
  },
  // พุ่งผ่านตัวน้อง: วู้บผ่านหู (ดอปเปลอร์ — สูงแล้วตกลง) + ลมกระแทก
  stumpPass: () => {
    noise({ dur: 0.4, vol: 0.13, freq: 2600, freqTo: 500, q: 1.3, attack: 0.04 });
    tone(260, 120, 0.4, 'sawtooth', 0.035);
    noise({ dur: 0.25, vol: 0.06, type: 'lowpass', freq: 300, freqTo: 90, attack: 0.01 });
  },
  // กลับเข้าฉากจากขวา: อู้ไต่ขึ้น + ตุ้บลงที่
  stumpReturn: () => {
    noise({ dur: 0.8, vol: 0.07, freq: 300, freqTo: 1400, q: 1.1, attack: 0.5 });
    later(() => { woodThud(0.14); rumble(0.5, 0.06); }, 700);
  },
  // เกราะผลึกก่อตัว: คอร์ดผลึกไล่ขึ้นแล้วค้าง + ฮัมพลังต่ำสั่น + ระยิบ
  stumpShield: () => {
    [440, 523.25, 659.25].forEach((f, i) => later(() => glassBell(f, 1.0, 0.03), i * 70));   // คอร์ดผลึกต่ำ (ลาไมเนอร์) หม่น ๆ
    zap({ from: 110, to: 440, dur: 1.2, vol: 0.045, drive: 5, q: 5 });     // พลังเกราะก่อตัวไต่ขึ้น
    tone(55, 55, 1.3, 'sine', 0.07);
    rumble(1.2, 0.08);
    later(() => { for (let i = 0; i < 6; i++) later(() => noise({ dur: 0.03, vol: 0.035 + i * 0.009, freq: 3200 + i * 400, q: 5 }), i * 70); }, 750);
  },
  // เกราะแตกเป็นฝน: ตูม + แก้วแตก + กริ๊งพรั่งพรู
  stumpShieldBreak: () => {
    impact(0.22, 1.05);
    zap({ from: 2400, to: 300, dur: 0.35, vol: 0.08, drive: 6, q: 2 });
    noise({ dur: 0.14, vol: 0.18, freq: 3800, q: 0.8 });
    for (let i = 0; i < 9; i++) later(() => glassBell(pickCry(2, 8), 0.3, 0.018), 20 + i * 32 + rnd(-8, 8));
  },
  // ผลึกร่วง (ฝนผลึก / ผลึกตกท้ายด่านวิ่ง): หวีดลงแหลม
  stumpRainFall: () => {
    zap({ from: 2800, to: 700, dur: 0.45, vol: 0.09, drive: 2.5, q: 5 });  // หวีดดิ่งลงแหลมคม
    noise({ dur: 0.4, vol: 0.035, freq: 6000, freqTo: 1500, q: 2, attack: 0.3 });
  },
  // ผลึกปักพื้น: กระแทกสั้นหนัก + ดินแตก + กริ๊ง (สุ่มโน้ตในคีย์ ปักหลายอันติดกันเป็นทำนองสั้น ๆ)
  stumpRainLand: () => {
    impact(0.16, 1.35);
    noise({ dur: 0.12, vol: 0.09, freq: 1300, q: 0.8, attack: 0.001 });    // ดินแตกกรอบ
    zap({ from: 900, to: 160, dur: 0.16, vol: 0.05, drive: 6, q: 2 });
    glassBell(pickCry(1, 5), 0.35, 0.025);
  },
  // หมอกหลับใหล (ทีละก้อน): ลมฟู่ + เสียงต่ำสองตัวตีกัน (หลอน) + กล่องดนตรีกล่อมเพี้ยนลง
  stumpFog: () => {
    noise({ dur: 0.9, vol: 0.065, type: 'lowpass', freq: 1100, freqTo: 280, attack: 0.25 });   // ลมฟู่
    tone(55, 50, 1.0, 'sine', 0.035);                                      // เสียงต่ำสองตัวตีกัน (หลอน)
    tone(58.3, 52, 1.0, 'sine', 0.03);
    tone(659.25, 440, 0.9, 'sine', 0.025);                                 // เสียงวังเวงไถลง
    tone(664, 443, 0.9, 'sine', 0.022);
    zap({ from: 300, to: 120, dur: 0.8, vol: 0.025, drive: 3, q: 6 });
  },
  // ไม้ลั่น + ถอนหายใจขู่เบา ๆ ระหว่างลอยรอท่าถัดไป (ให้รู้ว่าตัวมันยังมีชีวิต ไม่ใช่ภาพนิ่ง)
  stumpCreak: () => {
    creak(0.5, 0.035, 130);
    later(() => beast({ dur: 0.6, f0: 65, f1: 72, f2: 60, vol: 0.05, flutter: 18, drive: 2, breath: 0.8, sub: 0.2 }), 200);
  },

  // ── บอส: โดนตี / อารมณ์ ──
  // กระโดดใส่เปลวจุดอ่อน: ตูม + ไม้ป๊อก + ผลึกร้าวแกร๊ก + กริ๊ง + บอสร้อง "อ๊ากก!" (เจ็บ + โกรธ)
  stumpHit: () => {
    impact(0.2, 1.2);
    woodKnock(300, 0.14);
    [0, 40, 75, 105].forEach((ms, i) => later(() => noise({ dur: 0.04, vol: 0.07 + i * 0.01, freq: 3000 + i * 600, q: 4 }), ms));
    later(() => glassBell(1760, 0.5, 0.04), 30);
    later(() => beast({ dur: 0.5, f0: 190, f1: 320, f2: 140, vol: 0.17, flutter: 26, drive: 4, vowel: [850, 1250], vowelTo: [600, 900] }), 80);
  },
  // บอสเหนื่อย (แถบความหวังเต็ม): ถอนหายใจ "เฮ้อ~" + มึน กล่องดนตรีไล่ลง (ช่วงให้ผู้เล่นได้โจมตี จึงไม่ดุ)
  stumpTired: () => {
    stumpVoice(260, 280, 150, 0.8, 0.09);
    noise({ dur: 0.9, vol: 0.04, type: 'lowpass', freq: 1400, freqTo: 300, attack: 0.3 });
    [1318.51, 1174.66, 1046.5, 880].forEach((f, i) => later(() => musicBox(f, 0.4, 0.022), 300 + i * 140));
  },
  // บอสโกรธ (ผลึกร้าว 2/3): คำรามยาวแตกพร่าที่สุดในชุด + ก้อง + ตูม + พื้นสะเทือน + ผลึกสั่นก้อง
  stumpRage: () => {
    beast({ dur: 1.5, f0: 95, f1: 170, f2: 70, vol: 0.21, flutter: 36, drive: 6, vowel: [760, 1180], vowelTo: [420, 700] });
    later(() => beast({ dur: 1.2, f0: 76, f1: 135, f2: 56, vol: 0.09, flutter: 30, drive: 4, breath: 0, sub: 0 }), 190);
    impact(0.22, 0.8);
    rumble(1.5, 0.13);
    later(() => [880, 1318.51, 1760].forEach((f) => glassBell(f, 1.2, 0.02)), 300);
  },
  // หัวเราะเยาะ (ฉากแพ้): "ฮะ ฮะ ฮ่าาา!" เสียงใหญ่แหบ ตัวสุดท้ายยาวและสูง
  stumpLaugh: () => {
    [[0, 0.17], [210, 0.17], [420, 0.17], [640, 0.6]].forEach(([ms, d], i) => later(() => beast({
      dur: d, f0: 150 + i * 10, f1: 200 + i * 25, f2: i === 3 ? 120 : 150, vol: 0.13, flutter: 16, drive: 3, vowel: [800, 1200], vowelTo: [700, 1100], breath: 0.5, sub: 0.3,
    }), ms));
  },

  // ── บอส: ท่าแพ้ (จังหวะตาม STUMP_DEFEAT ใน stump.js) ──
  // 0 → 1.9 วิ: ตกใจ + พลังทะลักไต่ขึ้น + ผลึกหวีดสูงขึ้น + รอยร้าวแกร๊กถี่ขึ้นเรื่อย ๆ จนแตก
  stumpQuake: () => {
    later(() => beast({ dur: 0.7, f0: 220, f1: 380, f2: 260, vol: 0.15, flutter: 22, drive: 3.5, vowel: [900, 1300], vowelTo: [800, 1200] }), 40);
    rumble(1.9, 0.07);
    tone(70, 140, 1.85, 'sine', 0.07);
    later(() => tone(880, 1760, 1.3, 'sine', 0.018), 500);
    [0, 260, 480, 660, 810, 940, 1050, 1150, 1240, 1320, 1390, 1450, 1510, 1560, 1610, 1650, 1690, 1730, 1770].forEach((ms, i) => later(() => {
      noise({ dur: 0.04, vol: 0.04 + i * 0.003, freq: 2400 + i * 150, q: 4 });
      if (i % 3 === 0) tone(rnd(2600, 4200), null, 0.05, 'triangle', 0.01);
    }, ms));
  },
  // 1.9 วิ: ผลึกระเบิด — แก้วแตกใหญ่ + ตุ้บ + กริ๊งพรั่งพรู + คอร์ดผลึกค้างยาว (ปลดปล่อย)
  stumpShatter: () => {
    impact(0.24, 0.9);
    noise({ dur: 0.12, vol: 0.15, freq: 3600, q: 0.8 });
    later(() => noise({ dur: 1.1, vol: 0.07, freq: 6500, freqTo: 2200, q: 1.1, attack: 0.02 }), 20);
    for (let i = 0; i < 18; i++) later(() => glassBell(pickCry(5, 10), 0.5, 0.02), 30 + i * 34 + rnd(-8, 8));
    later(() => [880, 1318.51, 1760, 2093].forEach((f) => glassBell(f, 1.6, 0.03)), 160);
  },
  // 2.5 วิ: ตัวสลายเป็นละอองแสง — ผลึกไล่ขึ้นทีละขั้นทั้งสเกล + ลมใสลอยขึ้น
  stumpMelt: () => {
    noise({ dur: 2.0, vol: 0.03, freq: 2000, freqTo: 9000, q: 1.2, attack: 0.8 });
    CRY.forEach((f, i) => later(() => glassBell(f, 0.55, 0.026), i * 170));
    later(() => tone(440, 880, 1.6, 'sine', 0.02), 200);
  },

  // ── ✨ พลังแห่งความหวัง (ท่าพิเศษตอนบอสเวียนหัว · ผู้ใช้ 22 พ.ย.) — คีย์เดียวกับเพลงบอส ──
  // พุ่งเข้าหาบอส: ลมวืดไต่ขึ้นแรง + ประกายผลึกไล่ขึ้นตามความเร็ว
  hopeRush: () => {
    noise({ dur: 0.55, vol: 0.12, freq: 400, freqTo: 5200, q: 1.1, attack: 0.35 });
    tone(220, 880, 0.5, 'triangle', 0.05);
    [1046.5, 1318.51, 1760, 2093, 2637.02].forEach((f, i) => later(() => glassBell(f, 0.3, 0.025), 80 + i * 70));
  },
  // คัตซีนรวมพลัง: ใจเต้นตุบ ๆ + ระยิบไต่ขึ้น + คอร์ดลอยค้าง (ลา-โด-มี)
  hopeCharge: () => {
    [0, 210, 820, 1030].forEach((ms) => later(() => tone(95, 60, 0.14, 'sine', 0.16), ms));
    noise({ dur: 1.3, vol: 0.03, freq: 2500, freqTo: 9000, q: 1.5, attack: 1.0 });
    [880, 1046.5, 1318.51].forEach((f, i) => later(() => tone(f, null, 1.1, 'sine', 0.025), 150 + i * 120));
    for (let i = 0; i < 6; i++) later(() => glassBell(CRY[3 + i], 0.4, 0.02), 300 + i * 140);
  },
  // กดตรงจังหวะ: เป๊ะ = คอร์ดใสเต็ม + ระฆัง · ดี = เบากว่า
  hopeTap: (perfect = true) => {
    tone(1318.51, 1760, 0.08, 'triangle', 0.1);
    [1760, 2093, 2637.02].forEach((f, i) => later(() => glassBell(f, perfect ? 0.7 : 0.45, perfect ? 0.045 : 0.03), 30 + i * 45));
    if (perfect) later(() => [3135.96, 3520].forEach((f) => glassBell(f, 0.6, 0.025)), 170);
  },
  // ปล่อยพลัง: แสงพุ่ง "ฟิ้ววว" + คอร์ดโดเมเจอร์ (สว่าง = ความหวัง) + ระฆังพรั่งพรู
  hopeBeam: () => {
    noise({ dur: 0.7, vol: 0.12, freq: 900, freqTo: 7000, q: 1, attack: 0.05 });
    tone(440, 1760, 0.35, 'sawtooth', 0.03);
    later(() => { [523.25, 659.25, 783.99, 1046.5].forEach((f) => tone(f, null, 1.1, 'triangle', 0.05)); }, 120);
    for (let i = 0; i < 10; i++) later(() => glassBell(pickCry(5, 10), 0.45, 0.022), 140 + i * 45);
  },
  // พลาด/ไม่ทัน: เสียงพลังฟุบ ไถลงทุ้ม + ซ่าดับ
  hopeMiss: () => {
    tone(660, 165, 0.5, 'triangle', 0.08);
    noise({ dur: 0.45, vol: 0.05, type: 'lowpass', freq: 2500, freqTo: 200, attack: 0.02 });
    later(() => tone(196, 98, 0.35, 'sine', 0.1), 180);
  },

  // ── ดาวแห่งความหวัง ──
  // บอสทำดาวหล่น: กริ๊งเบา ๆ สองตัว
  hopeStarDrop: () => {
    glassBell(2637.02, 0.3, 0.018);
    later(() => glassBell(2093, 0.3, 0.015), 70);
  },
  // เก็บดาว: ไต่ขึ้นทีละขั้นของสเกลตามดวงที่ n (เหมือนตัวอักษรเดิม แต่เป็นเสียงผลึก) — ใกล้เต็มแถบ = เสียงสูงขึ้นเอง
  hopeStar: (n = 1) => {
    const f = CRY[2 + Math.max(0, Math.min(CRY.length - 3, n - 1))];
    tone(f, f * 1.5, 0.08, 'triangle', 0.08);
    later(() => glassBell(f * 2, 0.55, 0.05), 50);
    later(() => glassBell(f * 4, 0.3, 0.015), 110);
  },
  // แถบความหวังเต็ม: ผลึกไล่ขึ้นเป็นคอร์ด + ระยิบ
  hopeFull: () => {
    [880, 1046.5, 1318.51, 1760, 2093, 2637.02].forEach((f, i) => later(() => glassBell(f, i === 5 ? 1.0 : 0.45, 0.032), i * 55));
    noise({ dur: 0.7, vol: 0.03, freq: 5000, freqTo: 9000, q: 1.4, attack: 0.3 });
  },

  // ── จบด่าน ──
  // ชนะบอส: แตรสั้นโมทีฟผลึก ลา-โด-มี → ซอล → คอร์ดโดเมเจอร์ค้าง (มืด → สว่าง = น้องเป็นอิสระ)
  bossWin: () => {
    [880, 1046.5, 1318.51].forEach((f, i) => later(() => tone(f, null, 0.14, 'triangle', 0.11), i * 110));
    later(() => tone(1567.98, null, 0.32, 'triangle', 0.12), 330);
    later(() => {
      [1046.5, 1318.51, 1567.98, 2093].forEach((f) => tone(f, null, 1.2, 'triangle', 0.055));
      tone(523.25, null, 1.2, 'sine', 0.08);
    }, 640);
    [2637.02, 3135.96, 3520, 4186].forEach((f, i) => later(() => glassBell(f, 0.6, 0.025), 700 + i * 90));
  },
  // แพ้ (กลับบ้านไปพัก): กล่องดนตรีไล่ลงช้า ๆ แล้วค้างที่ลา — เศร้านิด ๆ แต่อบอุ่น ไม่ลงโทษ
  bossLose: () => {
    [[1318.51, 0], [1174.66, 280], [1046.5, 560], [880, 840], [783.99, 1220], [880, 1500]]
      .forEach(([f, ms], i) => later(() => musicBox(f, i === 5 ? 1.4 : 0.6, 0.045), ms));
    later(() => tone(220, null, 1.6, 'sine', 0.04), 1500);
  },

  // ── ลูกน้อง: วิญญาณท่อนซุงน้อย (ตัวเล็ก = เสียงสูงกว่า สั้นกว่า เบากว่าบอส) ──
  // ชาร์จคริสตัลบนหัว (~0.6 วิ): หวีดใสไต่ขึ้น + ระยิบ แล้วกริ๊งตอนพร้อมยิง
  mobCharge: () => {
    tone(660, 1760, 0.55, 'sine', 0.03);
    noise({ dur: 0.55, vol: 0.022, freq: 3000, freqTo: 8000, q: 2, attack: 0.45 });
    later(() => glassBell(1760, 0.3, 0.025), 420);
  },
  // ยิงเศษคริสตัล (ทีละลูก): "ปิ๊ว" เล็ก ๆ
  mobShoot: () => {
    tone(2093, 1046.5, 0.09, 'triangle', 0.05);
    later(() => glassBell(1567.98, 0.22, 0.022), 15);
  },
  // ฝูงตั้งหลัก "!": ป๊อกไม้ + ปิ๊ก
  mobAlert: () => {
    woodKnock(760, 0.08);
    later(() => tone(1318.51, 1760, 0.07, 'square', 0.025), 40);
  },
  // พุ่ง (ทีละตัว): วืดสั้น + ไม้กึก
  mobDash: () => {
    noise({ dur: 0.26, vol: 0.06, freq: 900, freqTo: 2800, q: 1.3, attack: 0.05 });
    woodKnock(480, 0.05);
  },
  // ══ บอสกล้วยราคี (ผู้ใช้ 26 พ.ย. — src/render/bosses/banana.js) ══
  // ตัวตนเสียง: ต้นกล้วยยักษ์ = ใบกล้วยกว้างเสียดสี "ซ่าาา" · เนื้อกล้วยหนึบ "ปุ๊/หนึบ" · หัวเราะกวน ๆ "เฮะ ๆ" แตกพร่า · กล้วยหมุน "วื้บ ๆ"
  // ใบกล้วยเสียดสี: ซ่ากว้างกรองสูง ไถขึ้นแล้วลง
  bananaRustle: (vol = 0.05) => {
    noise({ dur: 0.5, vol, type: 'bandpass', freq: 2600, freqTo: 4800, q: 0.6, attack: 0.12 });
    later(() => noise({ dur: 0.35, vol: vol * 0.7, type: 'bandpass', freq: 4200, freqTo: 2200, q: 0.7, attack: 0.05 }), 220);
  },
  // ตกจากฟ้า: ลมหวีดไถลง + ใบกล้วยพัดพึ่บพั่บ
  bananaDrop: () => {
    noise({ dur: 0.55, vol: 0.11, freq: 3400, freqTo: 420, q: 1.1, attack: 0.38 });
    tone(1600, 300, 0.52, 'sine', 0.028);
    [80, 200, 320, 420].forEach((ms) => later(() => noise({ dur: 0.08, vol: 0.05, freq: 1800, q: 1.2 }), ms));
  },
  // ลงพื้น: ตูมหนัก + เนื้อกล้วยหนึบ "ปึ้บ" + พื้นสะเทือน + ใบกล้วยสั่นซ่า
  // ก้าวเดิน: ตึ้บหนักแต่สั้น + ใบกล้วยไหวเบา ๆ (ท่าเดิน · ผู้ใช้ 28 พ.ย.)
  bananaStep: () => {
    impact(0.12, 0.9);
    tone(130, 55, 0.13, 'triangle', 0.05);
    noise({ dur: 0.08, vol: 0.04, type: 'lowpass', freq: 700, freqTo: 180 });
    later(() => sfx.bananaRustle(0.02), 40);
  },
  bananaLand: () => {
    impact(0.28, 0.85);
    tone(180, 60, 0.22, 'triangle', 0.08);
    noise({ dur: 0.14, vol: 0.08, type: 'lowpass', freq: 900, freqTo: 200 });
    rumble(1.1, 0.13);
    later(() => sfx.bananaRustle(0.06), 60);
  },
  // คำรามหัวเราะเยาะ: คำรามแตกพร่า แล้ว "เฮะ เฮะ เฮะ" ทุ้ม ๆ สามที + ใบกล้วยสั่น
  bananaRoar: () => {
    beast({ dur: 0.9, f0: 95, f1: 170, f2: 110, vol: 0.19, flutter: 30, drive: 4.5, vowel: [760, 1180], vowelTo: [560, 900] });
    [950, 1170, 1380].forEach((ms, i) => later(() => beast({ dur: 0.17, f0: 150 - i * 8, f1: 190 - i * 10, f2: 130, vol: 0.12, flutter: 18, drive: 3.5, vowel: [820, 1300], vowelTo: [700, 1100], breath: 0.6, sub: 0.3 }), ms));
    rumble(1.2, 0.1);
    later(() => sfx.bananaRustle(0.07), 100);
  },
  // ยืนเฉย: หัวเราะในคอเบา ๆ "หึ ๆ"
  bananaChuckle: () => {
    [0, 190].forEach((ms) => later(() => beast({ dur: 0.15, f0: 120, f1: 150, f2: 110, vol: 0.07, flutter: 16, drive: 2.5, vowel: [700, 1150], vowelTo: [600, 1000], breath: 0.5, sub: 0.2 }), ms));
    later(() => sfx.bananaRustle(0.03), 120);
  },
  // เอื้อมไปหลัง: วื้บแขนสั้น ๆ
  bananaReach: () => {
    noise({ dur: 0.28, vol: 0.07, freq: 600, freqTo: 1800, q: 1.2, attack: 0.08 });
    sfx.bananaRustle(0.035);
  },
  // จับกล้วย: "ป๊อก" เด็ดกล้วยจากเครือ (ก้านหัก) + หนึบ
  bananaPluck: () => {
    woodKnock(520, 0.1);
    tone(700, 260, 0.09, 'triangle', 0.06);
    later(() => tone(320, 520, 0.08, 'sine', 0.05), 50);
  },
  // ง้าง: แค่นหัวเราะ "หึ!" + ลมดูดเข้า
  bananaWindup: () => {
    beast({ dur: 0.32, f0: 110, f1: 160, f2: 140, vol: 0.12, flutter: 22, drive: 4, vowel: [700, 1100], vowelTo: [800, 1250], breath: 0.7 });
    noise({ dur: 0.35, vol: 0.06, freq: 2400, freqTo: 700, q: 1, attack: 0.25 });
  },
  // ปา: เหวี่ยงแขนวู้บแรง + ฮึบ + กล้วยหมุนติ้ว "วื้บ วื้บ วื้บ" เบาลงเรื่อย ๆ (ลอยไกลออกไป)
  bananaThrow: () => {
    noise({ dur: 0.3, vol: 0.15, freq: 400, freqTo: 3400, q: 1.1, attack: 0.03 });
    beast({ dur: 0.28, f0: 140, f1: 120, f2: 90, vol: 0.14, flutter: 26, drive: 5, vowel: [900, 1300], vowelTo: [650, 950], breath: 0.4 });
    [120, 230, 340, 450, 560, 670, 780].forEach((ms, i) => later(() => {
      noise({ dur: 0.09, vol: 0.075 * (1 - i * 0.11), freq: 900 + i * 60, freqTo: 1800, q: 2 });
      tone(320 - i * 10, 260 - i * 10, 0.08, 'sine', 0.02 * (1 - i * 0.11));
    }, ms));
  },
  // ย่อตัวกระแทกพื้น: ครางต่ำสะสมแรง + ระดับเสียงไถขึ้น
  bananaSlamCharge: () => {
    beast({ dur: 0.5, f0: 80, f1: 110, f2: 130, vol: 0.12, flutter: 24, drive: 3, vowel: [600, 950], vowelTo: [750, 1150] });
    tone(90, 200, 0.45, 'sawtooth', 0.025);
  },
  // กระโดด: สปริงเด้ง "ด๊อยง" ทุ้ม ๆ + ลมขึ้น
  bananaJump: () => {
    tone(140, 520, 0.22, 'sine', 0.09);
    tone(70, 260, 0.22, 'triangle', 0.04);
    noise({ dur: 0.3, vol: 0.08, freq: 500, freqTo: 2600, q: 1, attack: 0.05 });
  },
  // ทิ้งตัวกระแทก: ตูมหนักสุด + หนึบ + พื้นสะเทือนยาว + คลื่นวิ่งซ่า + ใบกล้วยสะบัด
  bananaSlam: () => {
    impact(0.34, 0.75);
    later(() => impact(0.14, 0.6), 90);
    tone(160, 48, 0.3, 'triangle', 0.09);
    rumble(1.6, 0.16);
    noise({ dur: 0.9, vol: 0.07, freq: 1400, freqTo: 300, q: 0.7, attack: 0.04 });
    later(() => sfx.bananaRustle(0.08), 80);
  },
  // ท่าปลูกกล้วยตอ (ผู้ใช้ 28 พ.ย.): พื้นนูนเตือน = ดินครืดต่ำ ๆ สั้น ๆ
  bananaStumpRumble: () => {
    noise({ dur: 0.28, vol: 0.06, type: 'lowpass', freq: 420, freqTo: 900, attack: 0.18 });
    tone(55, 75, 0.26, 'triangle', 0.035);
  },
  // ตอผุด: "ปึ้ก" ทุ้มหนึบ (ต้นใหญ่ทุ้มกว่า) + ดินแตกซ่า + ใบกล้วยไหว
  bananaStumpPop: (h = 20, i = 0) => {
    const big = Math.min(1, Math.max(0, (h - 12) / 16)), up = 1 + (i % 3) * 0.06;
    impact(0.14 + 0.08 * big, 1.05 - 0.25 * big);
    tone((260 - 90 * big) * up, (110 - 30 * big) * up, 0.16, 'triangle', 0.08);
    noise({ dur: 0.16, vol: 0.06, type: 'bandpass', freq: 1300, freqTo: 500, q: 0.9 });
    later(() => sfx.bananaRustle(0.025), 50);
  },
  // โดนตี: "ปั้ก" เนื้อกล้วยหนึบ + ร้องโอ๊ยแหบ ๆ
  bananaHit: () => {
    impact(0.18, 1.3);
    tone(420, 140, 0.16, 'triangle', 0.09);
    noise({ dur: 0.06, vol: 0.08, freq: 2200, q: 3 });
    later(() => beast({ dur: 0.42, f0: 210, f1: 330, f2: 160, vol: 0.15, flutter: 26, drive: 4, vowel: [880, 1300], vowelTo: [620, 950] }), 70);
  },
  // เหนื่อย: ถอนหายใจยาว "ฟู่วว" + นกหวีดสไลด์ลง (แฟบ) + กล่องดนตรีไล่ลง
  bananaTired: () => {
    noise({ dur: 1.0, vol: 0.06, type: 'lowpass', freq: 1500, freqTo: 260, attack: 0.25 });
    tone(620, 180, 0.9, 'sine', 0.045);
    [1046.5, 880, 783.99, 659.25].forEach((f, i) => later(() => musicBox(f, 0.4, 0.022), 450 + i * 140));
  },
  // แพ้ 0 วิ: ตัวสั่นคราง ดังขึ้นเรื่อย ๆ + พื้นสะเทือน
  bananaQuake: () => {
    beast({ dur: 1.2, f0: 120, f1: 200, f2: 240, vol: 0.15, flutter: 34, drive: 4, vowel: [820, 1250], vowelTo: [950, 1400] });
    rumble(1.4, 0.1);
    [0, 160, 300, 430, 550, 660, 760, 850, 930, 1000].forEach((ms) => later(() => noise({ dur: 0.05, vol: 0.05, freq: 3000, q: 1 }), ms));
  },
  // แพ้ 1.1 วิ: เครือกล้วยหลุดกระเด็น "ป๊อง!" + กระดิ่งเด้ง
  bananaCrownPop: () => {
    tone(260, 900, 0.18, 'sine', 0.1);
    woodKnock(640, 0.09);
    [1318.51, 1567.98, 2093].forEach((f, i) => later(() => glassBell(f, 0.35, 0.025), 60 + i * 70));
  },
  // แพ้ 1.6 วิ: ล้มหงาย "ตุ้บ" + นกหวีดไถลงยาว
  bananaFall: () => {
    tone(700, 150, 0.7, 'sine', 0.05);
    later(() => { impact(0.24, 0.8); rumble(0.9, 0.1); sfx.bananaRustle(0.06); }, 650);
  },
  // แพ้ 2.8 วิ: สลายเป็นประกาย — กริ๊งไล่ขึ้น
  bananaSparkle: () => {
    [1046.5, 1318.51, 1567.98, 2093, 2637.02, 3135.96].forEach((f, i) => later(() => glassBell(f, 0.6, 0.028), i * 90));
    noise({ dur: 1.0, vol: 0.03, type: 'highpass', freq: 6000, attack: 0.2 });
  },
  // ── ท่าคว้า (ผู้ใช้ 27 พ.ย. — ด่านบอสกล้วยใน gameplay-lab) ── ตัวตนเดียวกับชุดบน: ใบกล้วยซ่า · เนื้อหนึบ · หัวเราะกวน ๆ
  // ง้างคว้า (เตือน): "ฮึ่บ!" ในคอ + ลมดูดเข้าไต่ขึ้น + ใบกล้วยสั่น — ฟังอย่างเดียวก็รู้ว่า "จะคว้าแล้ว" (ต่างจากเสียงง้างปา)
  bananaGrabWarn: () => {
    beast({ dur: 0.36, f0: 120, f1: 175, f2: 150, vol: 0.13, flutter: 24, drive: 4.5, vowel: [640, 1050], vowelTo: [820, 1300], breath: 0.6 });
    noise({ dur: 0.7, vol: 0.05, freq: 700, freqTo: 2600, q: 1.4, attack: 0.5 });
    tone(220, 440, 0.6, 'triangle', 0.025);
    later(() => sfx.bananaRustle(0.045), 80);
  },
  // แขนยืดพุ่ง: ยางยืด "วื้ดดด" ไถขึ้น + ลมแหวก
  bananaGrabReach: () => {
    tone(160, 620, 0.28, 'sawtooth', 0.035);
    tone(320, 1240, 0.28, 'sine', 0.03);
    noise({ dur: 0.3, vol: 0.1, freq: 500, freqTo: 3200, q: 1.1, attack: 0.03 });
  },
  // ตะครุบลงพื้น: ฟาด "ปั้ก!" หนึบ ๆ + พื้นสะเทือนเบา
  bananaGrabSlam: () => {
    impact(0.2, 1.05);
    tone(300, 90, 0.16, 'triangle', 0.08);
    noise({ dur: 0.12, vol: 0.09, type: 'lowpass', freq: 1400, freqTo: 300 });
    rumble(0.5, 0.06);
  },
  // มือว่างดึงกลับ (หลบได้): ยางหดสั้น ๆ "ฟึ่บ"
  bananaGrabMiss: () => {
    tone(700, 180, 0.2, 'sine', 0.04);
    noise({ dur: 0.18, vol: 0.05, freq: 2400, freqTo: 600, q: 1.2 });
  },
  // จับได้: "หนึบ!" + หัวเราะสะใจสั้น ๆ "เฮะ!"
  bananaGrabCatch: () => {
    tone(260, 120, 0.12, 'triangle', 0.1);
    later(() => tone(180, 360, 0.1, 'sine', 0.06), 40);
    noise({ dur: 0.06, vol: 0.07, freq: 1800, q: 2 });
    later(() => beast({ dur: 0.22, f0: 150, f1: 195, f2: 140, vol: 0.12, flutter: 20, drive: 3.5, vowel: [820, 1300], vowelTo: [700, 1100], breath: 0.6, sub: 0.3 }), 120);
  },
  // กดรัวดิ้น: ดีดขาเบา ๆ สูงขึ้นตามจำนวนครั้ง (ใกล้หลุด = เสียงไต่สูง) · n = ครั้งที่ / need = ที่ต้องได้
  bananaMash: (n = 1, need = 7) => {
    const k = Math.min(1, n / need);
    tone(420 + k * 520, 300 + k * 420, 0.06, 'triangle', 0.06);
    noise({ dur: 0.04, vol: 0.04, freq: 2600 + k * 1800, q: 3 });
  },
  // ดิ้นหลุด: "ป๊อป!" + สปริงเด้งขึ้น + ประกายเล็ก
  bananaEscape: () => {
    tone(300, 1200, 0.18, 'sine', 0.1);
    woodKnock(700, 0.07);
    noise({ dur: 0.1, vol: 0.06, freq: 3200, q: 1.5 });
    [1318.51, 1567.98].forEach((f, i) => later(() => glassBell(f, 0.3, 0.022), 90 + i * 70));
  },
  // บอสเสียหลักมึน: นกหวีดวน "หวิ๊ว ๆ" + ครางงง
  bananaStun: () => {
    [0, 160, 320].forEach((ms, i) => later(() => tone(900 - i * 60, 600 - i * 60, 0.14, 'sine', 0.04), ms));
    later(() => beast({ dur: 0.5, f0: 140, f1: 120, f2: 95, vol: 0.09, flutter: 34, drive: 2.5, vowel: [700, 1050], vowelTo: [560, 860], breath: 0.6, sub: 0.2 }), 120);
  },
  // เขย่า: กุกกักถี่ ๆ + หัวเราะ "ฮ่า ๆ"
  bananaShake: () => {
    for (let i = 0; i < 6; i++) later(() => { noise({ dur: 0.05, vol: 0.06, freq: 900 + (i % 2) * 500, q: 1.4 }); tone(220 + (i % 2) * 60, 180, 0.05, 'triangle', 0.035); }, i * 65);
    [0, 170].forEach((ms) => later(() => beast({ dur: 0.16, f0: 165, f1: 200, f2: 150, vol: 0.1, flutter: 18, drive: 3, vowel: [860, 1320], vowelTo: [720, 1120], breath: 0.6, sub: 0.2 }), ms));
  },
  // โยนทิ้ง: วู้บเหวี่ยง + "ฮึบ!"
  bananaToss: () => {
    noise({ dur: 0.32, vol: 0.13, freq: 450, freqTo: 3000, q: 1.1, attack: 0.04 });
    beast({ dur: 0.24, f0: 140, f1: 120, f2: 95, vol: 0.12, flutter: 24, drive: 4.5, vowel: [880, 1280], vowelTo: [640, 940], breath: 0.4 });
  },
  // ลากถึงปาก (ทางเลือก): "งั่ม!" ทุ้ม ๆ ตลก ๆ
  bananaChomp: () => {
    tone(240, 110, 0.14, 'square', 0.05);
    woodKnock(300, 0.1);
    later(() => woodKnock(260, 0.08), 90);
    later(() => beast({ dur: 0.3, f0: 130, f1: 150, f2: 110, vol: 0.1, flutter: 16, drive: 3, vowel: [600, 950], vowelTo: [520, 820], breath: 0.4, sub: 0.3 }), 140);
  },
  // เปลือกกล้วยหล่นลงพื้น / น้องเก็บ / ปาโดนบอส "แปะ!"
  bananaPeelDrop: () => { tone(500, 240, 0.14, 'triangle', 0.05); noise({ dur: 0.08, vol: 0.05, type: 'lowpass', freq: 1200 }); },
  bananaPeelPick: () => { tone(660, 990, 0.08, 'sine', 0.07); later(() => tone(990, 1320, 0.08, 'sine', 0.05), 60); },
  bananaPeelHit: () => {
    noise({ dur: 0.07, vol: 0.14, freq: 1600, q: 0.8, attack: 0.001 });   // "แปะ!"
    tone(380, 160, 0.12, 'triangle', 0.08);
    later(() => beast({ dur: 0.3, f0: 230, f1: 320, f2: 180, vol: 0.12, flutter: 26, drive: 4, vowel: [900, 1320], vowelTo: [640, 980] }), 60);
  },
  // ลูกสมุนช่วยคว้า: ตะโกนเรียกลูกสมุน · วิ่งต้อย ๆ · กระโจนเกาะ "ฮึบ!" · โดนสะบัดหลุด "ด๊อยง" · กัดขา "งั่บ"
  bananaCall: () => {
    beast({ dur: 0.5, f0: 140, f1: 210, f2: 170, vol: 0.12, flutter: 26, drive: 4, vowel: [760, 1200], vowelTo: [880, 1350], breath: 0.5 });
    later(() => sfx.bananaRustle(0.05), 150);
  },
  mobScurry: () => { for (let i = 0; i < 5; i++) later(() => woodKnock(820 + (i % 2) * 140, 0.035), i * 95); },
  mobCling: () => {
    tone(520, 880, 0.1, 'triangle', 0.08);
    later(() => tone(300, 200, 0.1, 'triangle', 0.06), 70);
    noise({ dur: 0.05, vol: 0.05, freq: 2400, q: 2 });
  },
  mobShakeOff: () => { tone(600, 300, 0.08, 'sine', 0.05); noise({ dur: 0.06, vol: 0.05, freq: 1600, q: 1.5 }); },
  mobFling: () => {
    tone(180, 760, 0.3, 'sine', 0.09);
    noise({ dur: 0.3, vol: 0.07, freq: 800, freqTo: 3000, q: 1, attack: 0.03 });
    later(() => [1567.98, 2093].forEach((f, i) => later(() => glassBell(f, 0.25, 0.02), i * 60)), 120);
  },
  mobBite: () => { woodKnock(360, 0.1); tone(300, 140, 0.12, 'square', 0.05); },

  // โดนเหยียบ: "ปุ๊" นุ่ม + ไม้ป๊อก + คริสตัลบนหัวแตกกริ๊ง + สลายเป็นหมอกฟู่
  mobStomp: () => {
    tone(320, 140, 0.12, 'sine', 0.13);
    woodKnock(560, 0.08);
    later(() => { noise({ dur: 0.05, vol: 0.06, freq: 4200, q: 2 }); glassBell(2637.02, 0.3, 0.03); glassBell(3520, 0.25, 0.018); }, 60);
    later(() => noise({ dur: 0.35, vol: 0.035, type: 'lowpass', freq: 1500, freqTo: 400, attack: 0.05 }), 160);
  },
};

// ช่องสำหรับวัดระดับเสียงตอนพัฒนา ใช้เทียบความดังระหว่างเสียงแต่ละตัว
// Vite แทน import.meta.env.DEV ด้วย false ตอน build จริง บรรทัดนี้จึงถูกตัดทิ้งทั้งก้อน
if (import.meta.env.DEV) {
  window.__sfx = sfx;
  // ── ช่องตรวจว่าเสียงเงียบจริงหรือแค่ดูเหมือนเงียบ ──
  // ตัวเลขสองตัวบอกว่ายังมีอะไรค้างอยู่ ส่วน bus() ให้เอาไปต่อ AnalyserNode
  // เพื่อวัดความดังจริงที่ออกลำโพง ซึ่งเป็นวิธีเดียวที่พิสูจน์ได้ว่าหยุดแล้วเงียบ
  // (ปมพวกนี้ไม่อยู่ใน DOM หาจากหน้าเว็บไม่เจอ ต้องส่งออกมาทางนี้)
  window.__sfxState = {
    get live() { return liveSfx.length; },
    get queued() { return sfxTimers.length; },
    bus: audioOut,
  };
  // ไฟล์เสียงของคลิปสร้างด้วย new Audio() จึงไม่ได้อยู่ใน DOM หาจากหน้าเว็บไม่เจอ
  // ต้องส่งออกมาทางนี้ถึงจะตรวจได้ว่ามันเล่นจริงไหม ดังแค่ไหน และยังรอเสียงตื่นอยู่หรือเปล่า
  window.__clips = () => [...clips].map(([src, c]) => ({
    src, t: +c.el.currentTime.toFixed(2), paused: c.el.paused,
    // readyState 4 = โหลดพอเล่นรวดเดียวจบแล้ว / 0 = ยังไม่มีข้อมูลเลย
    ready: c.el.readyState,
    gain: +c.gain.gain.value.toFixed(3), failed: c.failed, pending: !!c.pending,
  }));
}
