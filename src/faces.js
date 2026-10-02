// src/faces.js
// ─────────────────────────────────────────────────────────────
// หน้าของน้องแมวจากกล่อง — 5 สายพันธุ์ × (เมีย 3 + ผู้ 3) = 30 หน้า
//
// ── หลักการ ──
//   ตัวแมว (ตัว ขา แขน หาง ท่า แอนิเมชัน) ใช้ระบบเดิมชุดเดียวกันทุกตัว ไม่มีอะไรเปลี่ยน
//   + หน้า (ไฟล์นี้: ข้อมูลล้วน ไม่มีโค้ดวาด)
//   + สี/ลายขน (skins.js)
//   = น้องแต่ละตัว
// ตัววาดหน้าอยู่ที่ render/faces.js ที่เดียว อ่านข้อมูลชุดนี้แล้ววาดทับหัวเดิม (ดู drawCatHead)
// หน้าเปลี่ยนแค่ "หน้าตาปกติ" — อารมณ์ชั่วคราว (หลับตา ดีใจ ตกใจ เศร้า) ยังใช้ของเดิมทุกตัว
// ผู้เล่นจึงจำน้องได้จากทรงหู ลาย คิ้ว จมูก แก้ม แม้ตอนที่น้องกำลังทำหน้าดีใจอยู่
//
// ── ช่องข้อมูล (ทุกช่องเว้นได้ = ค่าตั้งต้นแบบหน้าเดิม) ── หน่วยเดียวกับหัวแมว (รัศมีหัว 13)
//   iris        สีตา (ทับ eye ของสกิน — แมวดำได้ตาสว่างอ่านง่าย)
//   eye.shape   'round' กลม / 'almond' อัลมอนด์ / 'half' ปรือครึ่งตา
//   eye.r       ขนาดตา (เดิม 3)       eye.tilt  ยกหางตา (+ ขึ้น / − ตก) เรเดียน
//   eye.lid     เปลือกตาบนปิดลงมา 0-1  eye.line  เส้นเปลือกตาบน (ความหนา)
//   eye.lash    ขนตา (จำนวนเส้น)       eye.asym  ตาขวาปิดลงเพิ่ม 0-1 (หยี / ขยิบ)
//   eye.uneven  ตาซ้ายโตกว่า 0-0.4    eye.look  [x, y] ตำแหน่งตาดำ (มองขึ้น/มองข้าง)
//   eye.pupil   'round' / 'oval'       eye.pr    ขนาดตาดำเทียบตา  eye.shine  จุดประกาย 1-3
//   brow        'soft' 'raised' 'low' 'one' (ยักคิ้วข้างเดียว) 'inner' (หัวคิ้วยก = สงสัย)
//   nose        { shape: 'tri' | 'heart' | 'round' | 'broad', k: ขนาด }
//   mouth       { type: 'w' 'smile' 'closed' 'open' 'tongue' 'grin' 'side' 'flat' 'lazy' 'tooth' 'crooked', k }
//   muzzle      [กว้าง, สูง] ของปากสีครีม (เดิม [7.5, 5])
//   puff        แก้มป่องยื่นออกนอกหัว 0-1   blush  แก้มชมพู
//   tufts       ขนปุยข้างแก้ม 0-3 ปอย     crown  ปอยขนกลางหน้าผาก   fluff  ขนฟูรอบหัว
//   marks       ลายหน้าผาก: 'tabbySoft' 'tabbyFine' 'tabbyBold' 'tabbyCurved' (เฉพาะสายลาย) / 'fur' ขีดขนจาง ๆ
//   cheekMarks  ลายแก้ม       mask  ความเข้มหน้ากากวิเชียรมาศ (เดิม 1)
//   ear         { tip: 'point' | 'round' | 'sharp', size, base (ฐานกว้าง), tilt: [ซ้าย, ขวา] }
//   whisk       { len, n (2-3 เส้น), droop }
// ─────────────────────────────────────────────────────────────

export const FACES = {
  // ══ ปลาสลิด (TAB) ══════════════════════════════════════════
  // หวาน อ่อนโยน ไร้เดียงสา
  'TAB-F01': {
    iris: '#3F7A2E',
    eye: { shape: 'round', r: 3.7, tilt: -0.14, pupil: 'oval', pr: 0.42, shine: 2 },
    brow: 'soft', nose: { shape: 'tri', k: 0.8 }, mouth: { type: 'w', k: 0.8 },
    muzzle: [7, 4.8], blush: true, tufts: 1, marks: 'tabbySoft',
    ear: { tip: 'round', size: 0.95 }, whisk: { len: 0.8 },
  },
  // สง่า โตเป็นผู้ใหญ่ ใจดี
  'TAB-F02': {
    iris: '#8A9A2A',
    eye: { shape: 'almond', r: 3.4, tilt: 0.2, line: 1.3, pr: 0.5 },
    brow: 'soft', nose: { shape: 'heart', k: 0.85 }, mouth: { type: 'closed', k: 0.8 },
    muzzle: [6.4, 4.8], tufts: 2, marks: 'tabbyFine',
    ear: { tip: 'point', size: 1.08, base: 0.95 }, whisk: { len: 1.15 },
  },
  // ซน ขี้เล่น
  'TAB-F03': {
    iris: '#4C8A33',
    eye: { shape: 'round', r: 3.8, asym: 0.45, uneven: 0.12, pupil: 'oval', pr: 0.45, shine: 2 },
    brow: 'one', nose: { shape: 'tri', k: 0.85 }, mouth: { type: 'tongue', k: 1 },
    muzzle: [7.8, 5.2], puff: 0.6, cheekMarks: true, tufts: 2, marks: 'tabbyCurved',
    ear: { tip: 'point', size: 1, tilt: [-0.6, 0.5] }, whisk: { len: 1 },
  },
  // มั่นใจ ร่าเริง
  'TAB-M01': {
    iris: '#B07A1C',
    eye: { shape: 'round', r: 3.4, line: 1.6, lid: 0.12, pr: 0.55 },
    brow: 'soft', nose: { shape: 'broad', k: 1.1 }, mouth: { type: 'smile', k: 1.2 },
    muzzle: [8.4, 5.6], cheekMarks: true, tufts: 2, marks: 'tabbyBold',
    ear: { tip: 'point', size: 1, base: 1.15 }, whisk: { len: 1.1, n: 3 },
  },
  // ขี้เกียจ ง่วง ๆ
  'TAB-M02': {
    iris: '#9A7A22',
    eye: { shape: 'half', r: 3.4, tilt: -0.18, line: 1.5, pr: 0.42 },
    brow: 'low', nose: { shape: 'round', k: 0.9 }, mouth: { type: 'lazy', k: 0.8 },
    muzzle: [8, 5.2], tufts: 1, marks: 'tabbyFine',
    ear: { tip: 'round', size: 0.95, tilt: [0.4, -0.4] }, whisk: { len: 1, droop: 1.2 },
  },
  // กล้าหาญ ชอบผจญภัย
  'TAB-M03': {
    iris: '#5E8A1E',
    eye: { shape: 'almond', r: 3.5, tilt: 0.08, line: 1.5, look: [0.6, 0], pr: 0.55 },
    brow: 'soft', nose: { shape: 'broad', k: 1.1 }, mouth: { type: 'smile', k: 1 },
    muzzle: [8.2, 5.4], cheekMarks: true, tufts: 1, marks: 'tabbyBold',
    ear: { tip: 'sharp', size: 1.08 }, whisk: { len: 1.15, n: 3 },
  },

  // ══ ดำสนิท (BLACK) — ตาสว่างตัดกับหน้าเข้ม อ่านหน้าออกง่าย ══════
  // ลึกลับ น่ารัก
  'BLACK-F01': {
    iris: '#F2C94C',
    eye: { shape: 'almond', r: 3.9, tilt: 0.1, lid: 0.2, line: 1.2, pupil: 'oval', pr: 0.42, shine: 2 },
    nose: { shape: 'tri', k: 0.8 }, mouth: { type: 'closed', k: 0.75 },
    muzzle: [6.4, 4.8], crown: 0.6, tufts: 2, marks: 'fur',
    ear: { tip: 'sharp', size: 1.08 }, whisk: { len: 1.1 },
  },
  // เจ้าหญิง
  'BLACK-F02': {
    iris: '#8FE0B0',
    eye: { shape: 'round', r: 4.2, lash: 3, pupil: 'oval', pr: 0.45, shine: 3 },
    nose: { shape: 'heart', k: 0.85 }, mouth: { type: 'smile', k: 0.7 },
    muzzle: [7, 4.8], blush: true, tufts: 1,
    ear: { tip: 'round', size: 0.95 }, whisk: { len: 0.9 },
  },
  // มั่นใจ ขี้แกล้ง
  'BLACK-F03': {
    iris: '#F5A742',
    eye: { shape: 'almond', r: 3.3, tilt: 0.22, line: 1.2, pr: 0.5 },
    brow: 'one', nose: { shape: 'tri', k: 0.8 }, mouth: { type: 'side', k: 1 },
    muzzle: [7, 5], tufts: 1, marks: 'fur',
    ear: { tip: 'point', size: 1.05, tilt: [0, 0.4] }, whisk: { len: 1 },
  },
  // เท่ สุขุม
  'BLACK-M01': {
    iris: '#B9E05A',
    eye: { shape: 'almond', r: 3.3, lid: 0.3, line: 1.4, pr: 0.5 },
    nose: { shape: 'broad', k: 1 }, mouth: { type: 'closed', k: 1 },
    muzzle: [8, 5.2], tufts: 1,
    ear: { tip: 'sharp', size: 1.05, base: 1.05 }, whisk: { len: 1.1 },
  },
  // อบอุ่น ปกป้อง
  'BLACK-M02': {
    iris: '#F2B84C',
    eye: { shape: 'round', r: 3.8, line: 1.8, lid: 0.1, pr: 0.5, shine: 2 },
    brow: 'soft', nose: { shape: 'round', k: 1.15 }, mouth: { type: 'smile', k: 1.3 },
    muzzle: [8.8, 5.8], puff: 0.4, tufts: 2,
    ear: { tip: 'round', size: 1, base: 1.15 }, whisk: { len: 1.05 },
  },
  // ซนชอบก่อเรื่อง
  'BLACK-M03': {
    iris: '#E8E05A',
    eye: { shape: 'round', r: 3.7, asym: 0.5, uneven: 0.1, pr: 0.48, shine: 2 },
    nose: { shape: 'tri', k: 0.9 }, mouth: { type: 'tooth', k: 1 },
    muzzle: [7.8, 5.2], puff: 0.6, crown: 0.7, tufts: 3, marks: 'fur',
    ear: { tip: 'point', size: 1, tilt: [0.6, -0.5] }, whisk: { len: 1, n: 3 },
  },

  // ══ เทาหมอก (GRAY) ══════════════════════════════════════════
  // อ่อนโยน นุ่มนวล
  'GRAY-F01': {
    iris: '#E0A33A',
    eye: { shape: 'round', r: 4, pupil: 'oval', pr: 0.55, shine: 2 },
    nose: { shape: 'round', k: 0.8 }, mouth: { type: 'smile', k: 0.7 },
    muzzle: [7.2, 5], crown: 0.5, tufts: 1,
    ear: { tip: 'round', size: 0.95 }, whisk: { len: 0.9 },
  },
  // ช่างสงสัย ฉลาด
  'GRAY-F02': {
    iris: '#5FB0D8',
    eye: { shape: 'round', r: 4, look: [0.3, -0.9], pr: 0.48, shine: 2 },
    brow: 'inner', nose: { shape: 'tri', k: 0.8 }, mouth: { type: 'open', k: 0.7 },
    muzzle: [7, 5], puff: 0.5, tufts: 1, marks: 'fur',
    ear: { tip: 'point', size: 1.1 }, whisk: { len: 1 },
  },
  // ชอบเหม่อ ฝันกลางวัน
  'GRAY-F03': {
    iris: '#A88FE8',
    eye: { shape: 'almond', r: 4, lid: 0.32, line: 1.2, pupil: 'round', pr: 0.6, shine: 3 },
    nose: { shape: 'heart', k: 0.75 }, mouth: { type: 'closed', k: 0.6 },
    muzzle: [7, 4.8], tufts: 1, marks: 'fur',
    ear: { tip: 'round', size: 1 }, whisk: { len: 0.9, droop: 0.6 },
  },
  // พลังเหลือ ร่าเริง
  'GRAY-M01': {
    iris: '#E8C24A',
    eye: { shape: 'round', r: 4.1, pr: 0.62, shine: 2 },
    brow: 'raised', nose: { shape: 'tri', k: 0.95 }, mouth: { type: 'grin', k: 1.1 },
    muzzle: [8.4, 5.6], crown: 0.6,
    ear: { tip: 'point', size: 1.08 }, whisk: { len: 1.1 },
  },
  // สุขุม เป็นผู้ใหญ่
  'GRAY-M02': {
    iris: '#6DA07A',
    eye: { shape: 'almond', r: 3.3, lid: 0.15, line: 1.3, pupil: 'oval', pr: 0.5 },
    nose: { shape: 'broad', k: 1.1 }, mouth: { type: 'closed', k: 0.95 },
    muzzle: [8.6, 5.6], tufts: 1,
    ear: { tip: 'point', size: 1, base: 1.15 }, whisk: { len: 1.15 },
  },
  // ตลก ติงต๊อง
  'GRAY-M03': {
    iris: '#D8B04A',
    eye: { shape: 'round', r: 3.6, uneven: 0.35, pr: 0.55 },
    brow: 'one', nose: { shape: 'round', k: 0.9 }, mouth: { type: 'crooked', k: 1 },
    muzzle: [8, 5.4], puff: 0.7, crown: 0.8, tufts: 3,
    ear: { tip: 'point', size: 1, tilt: [-0.7, 0.3] }, whisk: { len: 1.1, n: 3, droop: 0.5 },
  },

  // ══ ขาวมุก (WHITE) — ลายละเอียดใช้สีเข้มพอให้เห็นบนขนขาว ═══════
  // นางฟ้า บริสุทธิ์
  'WHITE-F01': {
    iris: '#6AA8E8',
    eye: { shape: 'round', r: 3.9, line: 0.9, pupil: 'round', pr: 0.5, shine: 2 },
    nose: { shape: 'tri', k: 0.8 }, mouth: { type: 'smile', k: 0.7 },
    muzzle: [7.4, 5.2], puff: 0.3, blush: true, crown: 0.5, tufts: 1,
    ear: { tip: 'round', size: 0.95 }, whisk: { len: 0.9 },
  },
  // สง่า หรูหรา
  'WHITE-F02': {
    iris: '#4FA0D8',
    eye: { shape: 'almond', r: 3.5, tilt: 0.2, lash: 3, line: 1.1, pupil: 'oval', pr: 0.45 },
    nose: { shape: 'heart', k: 0.8 }, mouth: { type: 'closed', k: 0.7 },
    muzzle: [6.4, 4.8], tufts: 2, marks: 'fur',
    ear: { tip: 'sharp', size: 1.08, base: 0.95 }, whisk: { len: 1.2 },
  },
  // สดใส ร่าเริง (ตาสองสี — แมวขาวตาต่างสีมีจริง)
  'WHITE-F03': {
    iris: '#58B0E8', irisR: '#E8B54A',
    eye: { shape: 'round', r: 4.1, pr: 0.45, shine: 3 },
    brow: 'raised', nose: { shape: 'tri', k: 0.8 }, mouth: { type: 'tongue', k: 1 },
    muzzle: [7.6, 5.2], blush: true, crown: 0.5, tufts: 1,
    ear: { tip: 'round', size: 1, fluffy: true }, whisk: { len: 1 },
  },
  // อบอุ่น น่าไว้ใจ
  'WHITE-M01': {
    iris: '#E2A83C',
    eye: { shape: 'round', r: 3.8, line: 1.7, lid: 0.08, pr: 0.5, shine: 2 },
    nose: { shape: 'broad', k: 1.05 }, mouth: { type: 'smile', k: 1.3 },
    muzzle: [8.8, 5.8], puff: 0.4, tufts: 1,
    ear: { tip: 'round', size: 1 }, whisk: { len: 1.05 },
  },
  // ขี้คิด ดูจริงจังแต่น่ารัก
  'WHITE-M02': {
    iris: '#7AA2C8',
    eye: { shape: 'almond', r: 3.3, lid: 0.32, line: 1.3, pr: 0.5 },
    brow: 'low', nose: { shape: 'broad', k: 0.85 }, mouth: { type: 'flat', k: 1 },
    muzzle: [7.6, 5], crown: 0.5,
    ear: { tip: 'point', size: 1.05 }, whisk: { len: 1.1 },
  },
  // ปุยที่สุด
  'WHITE-M03': {
    iris: '#E8C25A',
    eye: { shape: 'round', r: 3.9, pr: 0.4, shine: 2 },
    nose: { shape: 'tri', k: 0.85 }, mouth: { type: 'smile', k: 1.3 },
    muzzle: [8.6, 5.8], puff: 0.8, fluff: true, crown: 1, tufts: 3,
    ear: { tip: 'round', size: 1, fluffy: true }, whisk: { len: 1 },
  },

  // ══ วิเชียรมาศ (SIAMESE) — ตาฟ้า + หน้ากากต้องจำได้ทุกหน้า ════════
  // สง่า ฉลาด
  'SIAMESE-F01': {
    iris: '#3A7BD5',
    eye: { shape: 'almond', r: 3.9, tilt: 0.2, line: 1.1, pupil: 'oval', pr: 0.45, shine: 2 },
    nose: { shape: 'tri', k: 0.8 }, mouth: { type: 'closed', k: 0.75 },
    muzzle: [6.4, 4.8], mask: 1.1, marks: 'fur',
    ear: { tip: 'sharp', size: 1.1, base: 0.95 }, whisk: { len: 1.1 },
  },
  // หวาน ขี้อ้อน
  'SIAMESE-F02': {
    iris: '#5B9BEA',
    eye: { shape: 'round', r: 4.1, line: 0.9, pr: 0.55, shine: 3 },
    nose: { shape: 'tri', k: 0.8 }, mouth: { type: 'smile', k: 0.7 },
    muzzle: [7.2, 5], mask: 0.85, puff: 0.3, tufts: 1,
    ear: { tip: 'point', size: 1 }, whisk: { len: 0.95 },
  },
  // ฉลาดแกมโกง ขี้เล่น
  'SIAMESE-F03': {
    iris: '#2E8FE0',
    eye: { shape: 'almond', r: 3.3, tilt: 0.24, line: 1.2, pupil: 'oval', pr: 0.5 },
    brow: 'one', nose: { shape: 'tri', k: 0.8 }, mouth: { type: 'side', k: 1 },
    muzzle: [6.6, 5], mask: 1.2, marks: 'fur',
    ear: { tip: 'sharp', size: 1.1 }, whisk: { len: 1.05 },
  },
  // สง่างาม มั่นใจ
  'SIAMESE-M01': {
    iris: '#2F6FC8',
    eye: { shape: 'almond', r: 3.6, line: 1.6, look: [0.4, 0], pr: 0.5 },
    nose: { shape: 'broad', k: 1.05 }, mouth: { type: 'closed', k: 1.1 },
    muzzle: [8.2, 5.4], puff: 0.3, mask: 1.25, marks: 'fur',
    ear: { tip: 'point', size: 1.05, base: 1.1 }, whisk: { len: 1.15 },
  },
  // ขี้เซา ชิล ๆ
  'SIAMESE-M02': {
    iris: '#6AA8E8',
    eye: { shape: 'half', r: 3.6, tilt: -0.16, line: 1.4, pr: 0.42 },
    brow: 'low', nose: { shape: 'round', k: 0.95 }, mouth: { type: 'lazy', k: 0.85 },
    muzzle: [7.8, 5.2], mask: 1.05,
    ear: { tip: 'point', size: 1, tilt: [0.5, -0.5] }, whisk: { len: 1, droop: 1.2 },
  },
  // ตัวป่วนนักผจญภัย
  'SIAMESE-M03': {
    iris: '#3F8FE8',
    eye: { shape: 'almond', r: 3.9, asym: 0.45, uneven: 0.12, pr: 0.5, shine: 2 },
    nose: { shape: 'tri', k: 0.9 }, mouth: { type: 'grin', k: 1.1 },
    muzzle: [7.8, 5.2], puff: 0.5, mask: 1.15, crown: 0.6, tufts: 3,
    ear: { tip: 'point', size: 1.05, tilt: [-0.5, 0.6] }, whisk: { len: 1.05, n: 3 },
  },
};

/** สายพันธุ์ในเกม (skins.js) → รหัสหน้า */
const BREED_CODE = { tabby: 'TAB', midnight: 'BLACK', grey: 'GRAY', snow: 'WHITE', siamese: 'SIAMESE' };

/** รหัสหน้าทั้งสามแบบของสายพันธุ์และเพศนี้ */
export function faceIdsFor(breed, sex) {
  const code = BREED_CODE[breed];
  if (!code) return [];
  const g = sex === 'f' ? 'F' : 'M';
  return [1, 2, 3].map((n) => `${code}-${g}0${n}`);
}

/** สุ่มหน้าให้น้องตัวใหม่ (ตอนพบน้อง) */
export function rollFaceId(breed, sex) {
  const ids = faceIdsFor(breed, sex);
  return ids[Math.floor(Math.random() * ids.length)] || null;
}

/**
 * หน้าของน้องตัวนี้ — น้องที่รับมาก่อนมีระบบหน้า (ไม่มีช่อง face) ได้หน้าคงที่จาก seed ของตัวเอง
 * ไม่สุ่มใหม่ทุกครั้ง น้องจึงหน้าเดิมเสมอไม่ว่าจะเปิดเกมกี่รอบ
 */
export function faceOf(cat) {
  if (!cat) return null;
  if (cat.face && FACES[cat.face]) return FACES[cat.face];
  const ids = faceIdsFor(cat.breed, cat.sex);
  if (!ids.length) return null;
  return FACES[ids[Math.abs(Math.floor(Number(cat.seed) || 0)) % ids.length]];
}
