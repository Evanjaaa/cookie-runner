// src/config.js
// ─────────────────────────────────────────────────────────────
// ตัวเลขทุกตัวที่ปรับแล้วเกมเปลี่ยน "ความรู้สึก" อยู่ในไฟล์นี้ที่เดียว
// อยากจูนความสนุก มาที่นี่ ไม่ต้องไปไล่หาในไฟล์อื่น
// ─────────────────────────────────────────────────────────────

export const VIEW = { W: 960, H: 420 };

/** ผิวบนของพื้น ทุกอย่างวัดจากเส้นนี้ */
export const GROUND_Y = 320;

/** ตัวละครตรึงอยู่ที่ x นี้ตลอด สิ่งที่ขยับจริงคือ "กล้อง" */
export const PLAYER_X = 170;

export const PHYSICS = {
  gravity: 0.86,        // ↑ = ตกเร็ว กระโดดกระชับ / ↓ = ลอยนาน
  jumpV: -15.6,         // แรงกระโดดครั้งแรก (ติดลบ = ขึ้น)
  doubleJumpV: -13.2,   // กระโดดชั้นสอง
  fastFallV: 4.5,       // กด ↓ กลางอากาศ = ดิ่งลง
  deathBounceV: -9,
};

export const SPEED = {
  start: 6.2,           // ความเร็วเริ่มต้น (px ต่อเฟรมที่ 60fps)
  max: 12.4,
  gain: 0.00075,        // เพิ่มต่อเฟรม = ความยากที่มาเอง ไม่ต้องออกแบบด่านเพิ่ม
};

export const BODY = {
  standW: 40, standH: 46,
  slideW: 52, slideH: 26,
  slideOffsetX: -6,
};

export const LEVEL = {
  chunkW: 760,                        // ความกว้างของ "ท่อน" ด่านหนึ่งท่อน
  spike: { w: 32, h: 38 },
  bar: { w: 170, top: 232, h: 54 },   // ช่องใต้คาน = 320-286 = 34px → ต้องหมอบเท่านั้น
  coinR: 11,
};

export const SHIELD = {
  spawnChance: 0.22,    // โอกาสโผล่ต่อหนึ่งท่อนด่าน
  r: 14,
  y: GROUND_Y - 96,     // ลอยสูงพอที่ต้องกระโดดถึงจะเก็บได้
  invulnFrames: 50,     // อมตะสั้น ๆ หลังโล่แตก ให้วิ่งหนีทัน
};

export const SCORING = {
  pointsPerJelly: 12,
  pxPerScorePoint: 10,
  pxPerMeter: 24,
};

export const COLORS = {
  night: '#1B0F2B', plum: '#3A1D50', berry: '#7A3563',
  hillFar: '#4E2A63', hillMid: '#6B3560', hillNear: '#93445F',
  ground: '#8E4A2C', crust: '#C9743E', crustTop: '#EFA657',
  dough: '#F3C173', doughDark: '#D89A4C', choc: '#5B3018',
  // แมวน้อยสีส้ม: cat = ขนหลัก / catDark = ลายกับขา / catCream = พุงกับปลายหาง
  cat: '#F2913D', catDark: '#C96A1E', catCream: '#FFE7C4',
  catPink: '#FF9BB0', catInk: '#3A1B08',
  mint: '#4ECDC4', mintLite: '#8DF3EA',
  danger: '#FF5C6E', cream: '#FFF3E2',
};
