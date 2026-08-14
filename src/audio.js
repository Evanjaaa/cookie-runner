// src/audio.js
// สังเคราะห์เสียงเองด้วย Web Audio API — ไม่ต้องมีไฟล์เสียงสักไฟล์
// อยากปรับเสียงให้ถูกใจ ลองแก้ 3 อย่างนี้:
//   type  — square = 8-bit / sine = นุ่ม / sawtooth = แสบ / triangle = กลาง ๆ
//   ช่วงความถี่ — สูงขึ้น = สดใสขึ้น
//   dur   — สั้นลง = กระชับขึ้น

let ac = null;
let muted = false;

function ctx() {
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  return ac;
}

/**
 * เบราว์เซอร์บล็อกเสียงจนกว่าผู้ใช้จะกดอะไรสักอย่าง
 * ต้องเรียกฟังก์ชันนี้ตอนกดปุ่มครั้งแรก ไม่งั้นจะเงียบสนิท
 */
export function unlockAudio() {
  const a = ctx();
  if (a.state === 'suspended') a.resume();
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(from, to, dur, type = 'square', vol = 0.12) {
  if (muted) return;
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
  gain.connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  jump: () => tone(320, 620, 0.12, 'square', 0.11),
  double: () => tone(500, 940, 0.13, 'square', 0.10),
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

  // เก็บขวดพลัง — อวดได้หน่อย เพราะนาน ๆ โผล่ที
  potion: () => {
    tone(523, 784, 0.16, 'triangle', 0.12);
    setTimeout(() => tone(784, 1046, 0.18, 'sine', 0.11), 110);
    setTimeout(() => tone(1046, 1568, 0.26, 'sine', 0.09), 240);
  },

  shield: () => {
    tone(880, null, 0.05, 'triangle', 0.11);
    setTimeout(() => tone(1320, null, 0.08, 'triangle', 0.11), 45);
  },
  shieldBreak: () => tone(700, 160, 0.28, 'sawtooth', 0.13),
  hurt: () => tone(400, 110, 0.2, 'sawtooth', 0.14),
  die: () => tone(320, 60, 0.55, 'sawtooth', 0.16),
};
