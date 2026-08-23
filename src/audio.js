// src/audio.js
// สังเคราะห์เสียงเองด้วย Web Audio API — ไม่ต้องมีไฟล์เสียงสักไฟล์
// อยากปรับเสียงให้ถูกใจ ลองแก้ 3 อย่างนี้:
//   type  — square = 8-bit / sine = นุ่ม / sawtooth = แสบ / triangle = กลาง ๆ
//   ช่วงความถี่ — สูงขึ้น = สดใสขึ้น
//   dur   — สั้นลง = กระชับขึ้น

let ac = null;
let bus = null;

// ระดับเสียงรวม 0–1 เก็บไว้ในเครื่องอย่างเดียว ไม่ซิงก์ขึ้นคลาวด์
// เพราะเป็นค่าของ "เครื่องนี้" ไม่ใช่ของผู้เล่น — ต่อหูฟังกับเปิดลำโพงคนละระดับกัน
const VOL_KEY = 'cookie-runner:vol';
const VOL_DEFAULT = 0.8;   // เว้นหัวไว้ให้เพิ่มได้ ไม่ใช่เปิดมาสุดแล้วปุ่ม + กดไม่ขึ้น

let volume = (() => {
  try {
    const raw = localStorage.getItem(VOL_KEY);
    // ต้องเช็ค null ก่อนแปลงเป็นตัวเลข — Number(null) ได้ 0 ซึ่งผ่านทุกเงื่อนไข
    // ข้างล่างหมด กลายเป็นว่าคนเปิดเกมครั้งแรกเจอเกมเงียบสนิทโดยไม่รู้สาเหตุ
    if (raw === null || raw === "") return VOL_DEFAULT;
    const v = Number(raw);
    return Number.isFinite(v) && v >= 0 && v <= 1 ? v : VOL_DEFAULT;
  } catch {
    return VOL_DEFAULT;   // โหมดส่วนตัวอ่านไม่ได้
  }
})();

function ctx() {
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  return ac;
}

/**
 * ทางออกเสียงเดียวของทั้งเกม — ทั้งเอฟเฟกต์และเพลงต้องต่อผ่านตัวนี้
 *
 * เดิมทุกเสียงต่อเข้า destination ตรง ๆ แล้วใช้ธง muted เช็คทีละจุด
 * ซึ่งปรับระดับเสียงไม่ได้เลย ทำได้แค่เปิดกับปิด พอมีปมรวมจุดเดียวแล้ว
 * ระดับเสียงกลายเป็นตัวเลขตัวเดียว และ "ปิดเสียง" ก็คือระดับ 0 ไม่ต้องมีธงแยก
 */
export function audioOut() {
  const a = ctx();
  if (!bus) {
    bus = a.createGain();
    bus.gain.value = volume;
    bus.connect(a.destination);
  }
  return bus;
}

export function getVolume() {
  return volume;
}

/** คืนค่าที่ตั้งได้จริงหลังตัดให้อยู่ในช่วง 0–1 */
export function setVolume(v) {
  volume = Math.max(0, Math.min(1, Math.round(v * 100) / 100));
  try {
    localStorage.setItem(VOL_KEY, String(volume));
  } catch {
    /* เซฟไม่ได้ก็ยังใช้ได้ในรอบนี้ */
  }
  if (bus) {
    // ไล่ไปหาค่าใหม่แทนการกระโดด ไม่งั้นได้เสียง "ป๊อก" ทุกครั้งที่กดปุ่ม
    bus.gain.setTargetAtTime(volume, ctx().currentTime, 0.03);
  }
  return volume;
}

/**
 * เบราว์เซอร์บล็อกเสียงจนกว่าผู้ใช้จะกดอะไรสักอย่าง
 * ต้องเรียกฟังก์ชันนี้ตอนกดปุ่มครั้งแรก ไม่งั้นจะเงียบสนิท
 */
export function unlockAudio() {
  const a = ctx();
  if (a.state === 'suspended') a.resume();
}

/** ให้โมดูลเพลงใช้ context เดียวกัน ไม่งั้นจะได้ AudioContext ซ้อนสองตัว */
export function audioCtx() {
  return ctx();
}

function tone(from, to, dur, type = 'square', vol = 0.12) {
  if (volume <= 0) return;   // ปมรวมกรองให้อยู่แล้ว ตัดตรงนี้ไว้เพื่อไม่สร้าง node ทิ้ง
  const a = ctx();
  if (a.state === 'suspended') return;

  const t = a.currentTime;
  const osc = a.createOscillator();
  const gain = a.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);

  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);  // fade out กันเสียง "ป๊อก"

  osc.connect(gain);
  gain.connect(audioOut());
  osc.start(t);
  osc.stop(t + dur + 0.02);
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
  if (volume <= 0) return;
  const a = ctx();
  if (a.state === 'suspended') return;

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

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.025);   // เข้าเร็วแบบเสียงร้อง
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
  gain.connect(audioOut());

  osc.start(t);
  lfo.start(t);
  osc.stop(t + dur + 0.05);
  lfo.stop(t + dur + 0.05);
}

// ─────────────────────────────────────────────────────────────
// เรื่อง vol ของเสียงแมว: ตัวเลขเทียบกับ tone() ตรง ๆ ไม่ได้
// bandpass ตัดพลังงานทิ้งไปราว 2.4 เท่า เสียงแมว vol 0.12 จึงดังจริง
// แค่ครึ่งเดียวของเสียงเก็บของที่ vol 0.10 ซึ่งต่อตรงไม่ผ่านฟิลเตอร์
// ค่าที่ตั้งไว้ล่างนี้วัดจากของจริงแล้วให้ดังกว่าเสียงเก็บของเล็กน้อย
// เพราะเป็น "เสียงตัวละคร" ควรเด่นกว่าเสียงไอเทม
// ถ้าแก้ q ต้องวัดความดังใหม่ทุกครั้ง เพราะ q ยิ่งสูงยิ่งเบา
// ─────────────────────────────────────────────────────────────
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
    setTimeout(() => tone(1568, null, 0.05, 'sine', 0.10), 42);
    setTimeout(() => tone(2093, null, 0.09, 'triangle', 0.075), 84);
  },

  // เก็บเม็ดกลม — ต่ำกว่าเสียงปลาหนึ่งช่วง เสียง triangle อวบกว่า
  // และโน้ตท้ายค้างยาวกว่า ให้รู้สึกว่าได้ของใหญ่กว่าโดยไม่ต้องมองจอ
  kibble: () => {
    tone(784, null, 0.06, 'triangle', 0.11);
    setTimeout(() => tone(1046, null, 0.06, 'triangle', 0.11), 50);
    setTimeout(() => tone(1568, null, 0.14, 'sine', 0.09), 100);
  },

  // เก็บกุ้งทอง — อาร์เพจจิโอเมเจอร์ไล่ขึ้น G-C-E-G แล้วปิดด้วยโน้ตสูงค้างยาว
  // ซ้อนคู่ห้าตอนท้ายให้ฟังเป็นระฆังหรูแทนที่จะเป็นเสียงเดี่ยว ๆ
  // ตั้งใจให้ยาวกว่าเสียงอื่นเกือบเท่าตัว เพราะนาน ๆ ได้ยินที ควรได้อวด
  shrimp: () => {
    [784, 1046, 1318, 1568].forEach((f, i) =>
      setTimeout(() => tone(f, null, 0.13, 'triangle', 0.115), i * 58)
    );
    setTimeout(() => tone(2093, null, 0.34, 'sine', 0.105), 250);
    setTimeout(() => tone(3136, null, 0.3, 'sine', 0.055), 310);
  },

  // เก็บขวดพลัง — อวดได้หน่อย เพราะนาน ๆ โผล่ที
  potion: () => {
    tone(523, 784, 0.16, 'triangle', 0.12);
    setTimeout(() => tone(784, 1046, 0.18, 'sine', 0.11), 110);
    setTimeout(() => tone(1046, 1568, 0.26, 'sine', 0.09), 240);
  },

  // เก็บแม่เหล็ก — กวาดขึ้นยาว ๆ เหมือนเสียงชาร์จพลัง บอกว่า "เริ่มมีผลแล้ว"
  magnet: () => {
    tone(320, 1300, 0.3, 'square', 0.1);
    setTimeout(() => tone(1046, 1568, 0.22, 'triangle', 0.1), 170);
  },

  // เก็บตัวอักษร — ไล่เสียงสูงขึ้นทีละตัว บอกความคืบหน้าโดยไม่ต้องมองจอ
  letter: (n) => {
    const base = 660 * Math.pow(1.09, n - 1);
    tone(base, null, 0.07, 'triangle', 0.12);
    setTimeout(() => tone(base * 1.5, null, 0.11, 'sine', 0.1), 55);
  },

  // เข้าโหมดโบนัส — แฟนแฟร์ไล่ขึ้นยาว ๆ ให้รู้ทันทีว่ามีอะไรใหญ่กำลังเกิด
  bonus: () => {
    [523, 659, 784, 1046, 1318].forEach((f, i) =>
      setTimeout(() => tone(f, null, 0.16, 'triangle', 0.12), i * 90)
    );
    setTimeout(() => { tone(1568, null, 0.5, 'sine', 0.11); tone(2093, null, 0.45, 'sine', 0.06); }, 470);
  },
  // ความสามารถติด — กวาดขึ้นแล้วปิดด้วยคอร์ดค้าง ให้รู้ว่าเข้าสถานะพิเศษแล้ว
  skill: () => {
    tone(392, 1046, 0.26, 'square', 0.1);
    setTimeout(() => { tone(1046, null, 0.34, 'triangle', 0.11); tone(1568, null, 0.3, 'sine', 0.07); }, 190);
  },

  // เก็บต้นหญ้าแมว — กวาดขึ้นเร็วปรื๊ดแล้วปิดสั้น ให้รู้สึกว่า "ดีดออกไป"
  nip: () => {
    tone(420, 1600, 0.16, 'square', 0.11);
    setTimeout(() => tone(1200, 1900, 0.12, 'triangle', 0.09), 90);
  },

  shield: () => {
    tone(880, null, 0.05, 'triangle', 0.11);
    setTimeout(() => tone(1320, null, 0.08, 'triangle', 0.11), 45);
  },
  shieldBreak: () => tone(700, 160, 0.28, 'sawtooth', 0.13),
  // เสียงพุ่งชนกล่อง: ทุ้มหนักนำ แล้วตามด้วยเสียงแตกแหลม ๆ
  smash: () => {
    tone(210, 62, 0.15, 'sawtooth', 0.18);
    setTimeout(() => tone(560, 170, 0.11, 'square', 0.11), 28);
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
      setTimeout(() => tone(f, null, 0.3, 'triangle', 0.12), i * 70)
    );
    setTimeout(() => { tone(1760, null, 0.6, 'sine', 0.1); tone(2637, null, 0.5, 'sine', 0.05); }, 210);
  },

  // ล้มเหลว — ของแตกแล้วเสียงร่วงลงต่ำ ปิดท้ายด้วยเสียงแมวอ้อน
  // ต้องไม่เป็นเสียง "ผิดพลาด" แบบระบบแจ้งเตือน เพราะการตีไม่ติดคือส่วนหนึ่งของเกม
  // ไม่ใช่ความผิดของคนเล่น เสียงอ้อนจึงอ่านเป็น "เสียดายจัง" ไม่ใช่ "คุณทำพลาด"
  upFail: () => {
    tone(520, 90, 0.36, 'sawtooth', 0.14);
    setTimeout(() => tone(300, 70, 0.3, 'square', 0.085), 90);
    setTimeout(() => meow({ start: 420, peak: 450, end: 150, dur: 0.5, vol: 0.2, q: 5, wobble: 22 }), 210);
  },

  // เย้! — แมวดีใจสองพยางค์ไล่ขึ้น แล้วปิดด้วยประกายระฆังสามเม็ด
  //
  // ใช้ตอนเปิดกาช่าได้ของ ซึ่งเป็นจังหวะเดียวในเกมที่ควรรู้สึกว่า "มีคนดีใจด้วย"
  // ไม่ใช่แค่ได้ยินว่าระบบทำงานเสร็จ จึงเป็นเสียงร้องจริง ๆ (meow) ไม่ใช่โทนเปล่า
  // พยางค์ที่สองสูงกว่าและยาวกว่าพยางค์แรก = รูปทรงของเสียงคนที่ตื่นเต้นขึ้นเรื่อย ๆ
  // ถ้าสองพยางค์เท่ากันจะฟังเป็นเสียงร้องเรียก ไม่ใช่เสียงดีใจ
  cheer: () => {
    meow({ start: 700, peak: 1180, end: 980, dur: 0.16, vol: 0.28, q: 4, wobble: 18 });
    setTimeout(() => meow({ start: 900, peak: 1520, end: 1240, dur: 0.24, vol: 0.3, q: 4, wobble: 15 }), 150);
    [1568, 2093, 2637].forEach((f, i) =>
      setTimeout(() => tone(f, null, 0.18, 'sine', 0.065), 340 + i * 70)
    );
  },

  // ชนสิ่งกีดขวาง — ลากลงต่ำกว่าจุดเริ่มเยอะ ๆ กับสั่นถี่ = ฟังอ้อนน่าสงสาร
  // ดังกว่าเสียงกระโดดอีกนิด เพราะเป็นสัญญาณว่ากำลังเสียพลัง ต้องรู้ตัวทันที
  hurt: () => meow({ start: 720, peak: 790, end: 265, dur: 0.42, vol: 0.36, q: 5, wobble: 30 }),

  // พลังหมด — เสียงเดียวกันแต่ยาวและจบต่ำกว่า เหมือนหมดแรงแล้วเสียงหายไป
  die: () => {
    meow({ start: 640, peak: 700, end: 155, dur: 0.9, vol: 0.38, q: 5.5, wobble: 26 });
    setTimeout(() => meow({ start: 330, peak: 350, end: 130, dur: 0.7, vol: 0.22, q: 5.5, wobble: 20 }), 420);
  },
};

// ช่องสำหรับวัดระดับเสียงตอนพัฒนา ใช้เทียบความดังระหว่างเสียงแต่ละตัว
// Vite แทน import.meta.env.DEV ด้วย false ตอน build จริง บรรทัดนี้จึงถูกตัดทิ้งทั้งก้อน
if (import.meta.env.DEV) window.__sfx = sfx;
