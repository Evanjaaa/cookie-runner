/**
 * บอสกล้วยราคี (บอสตัวแรกของเกม · ธีมต้นกล้วย — ผู้ใช้ 26 พ.ย. 2026)
 * ภาพจากไฟล์นักออกแบบ 3 ท่า (src/render/bosses/banana/*.svg · พิกัดชุดเดียวกัน):
 *   banana-boss-final.svg        ท่าหลัก — ใบกล้วย · เครือกล้วยบนหัว · ตัว(+แขนขวา) · แขนซ้าย · ขา 2 · รากเอว · หน้า · ปลีเขา · กำปั้น 2
 *   banana-boss-grab-final.svg   ท่าเอื้อมจับกล้วยบนหลัง — แขนซ้ายยก + มือจับกล้วย
 *   banana-boss-throw-final.svg  ท่าปากล้วย — แขนเหวี่ยง + มือแบ + กล้วยที่ปา + เส้นลม (ไฟล์นี้มี transform จัดวาง — ถอดออกแล้วพิกัดตรงกัน)
 * แต่ละกลุ่ม → ภาพของตัวเอง ขยับทีละชิ้นด้วยหมุน/ย่อ-ขยาย/เลื่อนรอบจุดหมุน · สลับชิ้นแขนตามท่า
 * เส้นขอบนอกหนา (outer-outline ในไฟล์ = เงาทึบทั้งตัวท่าเดียว ขยับตามชิ้นไม่ได้) → สร้างขอบเข้มต่อชิ้น (ขยายเงาชิ้นออก) วาดชั้นล่างสุด
 *
 * หน่วย: (0,0) = พื้นใต้ตัวตรงกลาง · พื้น → ยอดเครือกล้วย = BANANA_BOSS.H (100) · หันซ้ายตามไฟล์ (หาน้อง) · gaze > 0 = หันขวา
 * drawBananaBoss(ctx, x, groundY, s, o) — o: state st t gaze bob explode hitT · คืนค่าท่า
 *   ท่าเลเซอร์ในเกม: o.beamAim (เรเดียน กดลงจากแนวนอน รอบลูกแสง) · o.beamThin (ความหนา ×) · o.beamLen (ความยาว ×) — ลำแสงไม่ทะลุพื้น · o.noStumps = ไม่วาดตอ (หน้าเกมวาดเอง)
 * ทุกอย่างคิดจากเวลา → ลากเวลาย้อนได้ภาพเดิม
 *
 * ท่าคว้า B1–B10 (ผู้ใช้ 27 พ.ย. · ด่านบอสใน gameplay-lab) — "ช่อง" ตามรายการภาพที่ส่งนักวาด:
 *   ตอนนี้ประกอบจากชิ้นเดิมไปก่อน · วางไฟล์ SVG ของนักวาดใน banana/slots/ (ชื่อขึ้นต้นด้วยรหัสช่อง) = ใช้ไฟล์นั้นแทนเอง
 *   ท่าแขนยืด (state มี reach): หน้าเกมส่ง o.reachTo = จุดมือ [x, y] หน่วยบอส (x ไปทางน้อง = ลบ · y ขึ้น = บวก)
 *     โค้ดยืดท่อนแขนจากไหล่ไปถึงมือเอง · o.held(x, y) = วาดของในกำมือ (น้อง) ก่อนวาดมือทับ — x, y = จุดมือบนจอ
 *   o.rage = หน้าโกรธ (B10) ทับหน้า · o.noThrown = ไม่วาดกล้วยที่ปา (หน้าเกมวาดลูกของตัวเองด้วย drawBananaThrown)
 *   รายละเอียดการตั้งชื่อไฟล์/กระดาษ: banana/slots/README.md
 * ท่าปลูกกล้วยตอผุด (plant · ไฟล์ plant-stump 01/02): ต้นกล้วยตอวาดด้วยโค้ด — หน้าเกมใช้ BANANA_BOSS_ACT.plant + bananaStumpAt() + drawBananaStump() (o.noStumps = บอสไม่วาดตอเอง)
 */
import BASE from './banana/banana-boss-final.svg?raw';
import GRAB from './banana/banana-boss-grab-final.svg?raw';
import THROW from './banana/banana-boss-throw-final.svg?raw';
// ท่าโดนตี (ผู้ใช้ 28 พ.ย. · ไฟล์ banana-boss-hit-final.svg): ทั้งท่าคนละกระดาษ (1522×1076) — เลื่อนตาม SHIFT.hit ให้เท้าตรงพื้นท่าหลัก (ขนาดเท่ากัน)
import HIT from './banana/banana-boss-hit-final.svg?raw';
// ท่าเลเซอร์จากหัวปลี (ผู้ใช้ 28 พ.ย.): 01 = เตรียมชาร์จพลัง (ไฟล์ banana-boss-laser-01-final.svg) · 02 = ยิง (รอไฟล์)
import LASER1 from './banana/banana-boss-laser-01-final.svg?raw';
import LASER2 from './banana/banana-boss-laser-02-final.svg?raw';   // 02 = ก้มหัวยิงจากหัวปลี
// 03 = ลำแสง (laser-beam) + ลูกแสงปลายหัวปลี (laser-orb) — ไฟล์นี้ย่อตัวบอส 0.4555 วางที่ (665, 367) → แปลงกลับเป็นพิกัดท่ายิง 02
import LASER3 from './banana/banana-boss-laser-03-final.svg?raw';
// ท่าปลูกกล้วยตอผุด (ผู้ใช้ 28 พ.ย.): 01 = เงื้อแขนสองข้าง เอนหลัง ยกขา · 02 = ทุบพื้น มือฝังดิน เศษดินแตก — ต้นกล้วยตอผุดเป็นแถวไปหาน้อง (โค้ดวาดเอง)
import PLANT1 from './banana/banana-boss-plant-stump-01-final.svg?raw';
import PLANT2 from './banana/banana-boss-plant-stump-02-final.svg?raw';

export const BANANA_BOSS = {
  name: 'บอสกล้วยราคี',
  title: 'จอมโหดแห่งสวนกล้วย',
  H: 100, hover: 0, top: 24, halfW: 66,
  ratio: 2.0,
};
export const BANANA_BOSS_STATES = {
  walk:   { name: 'เดิน',            em: '🚶', note: 'ย่ำเดินหนัก ๆ แบบยักษ์ (ขาจากท่าหลัก ขยับด้วยโค้ด): ยกขาสลับ ตัวเด้งขึ้นลง เอียงถ่ายน้ำหนัก กำปั้นแกว่งสวน · เดินอยู่กับที่ (หน้าเกมเลื่อนตำแหน่งเอง)', loop: 1.2 },
  idle:   { name: 'ยืนขู่',         em: '😈', note: 'หายใจ ตัวโยก ใบกล้วยไหว เครือกล้วยเด้ง กำปั้นบีบ', loop: 3.2 },
  enter:  { name: 'เปิดตัว',         em: '🎬', note: 'ตกลงจากฟ้า กระแทกพื้นฝุ่นฟุ้ง แล้วคำรามชูกำปั้น', dur: 2.6 },
  throw:  { name: 'ปากล้วย',         em: '🍌', note: 'เอื้อมจับกล้วยบนหลัง เอนตัวง้าง แล้วเหวี่ยงปากล้วยหมุนติ้วไปหาน้อง', dur: 2.6 },
  slam:   { name: 'กระแทกพื้น',       em: '💥', note: 'ย่อตัว กระโดด แล้วทิ้งตัวกระแทกพื้น คลื่นฝุ่นแผ่ (กระโดดข้าม)', dur: 2.4 },
  tired:  { name: 'เหนื่อย',          em: '😵', note: 'ตัวทรุด ใบกล้วยตก กำปั้นห้อย หอบ', loop: 1.8 },
  defeat: { name: 'แพ้',             em: '💫', note: 'สั่น แสงกะพริบ เครือกล้วยหลุดกระเด็น ล้มหงาย แล้วสลายเป็นประกาย', dur: 4.4 },
  // ── ท่าคว้า (ช่อง B1–B9 · slot = รหัสภาพนักวาด · reach = ท่าแขนยืด มือแบบไหน) ──
  grabWind:  { name: 'ง้างคว้า',        em: '🫳', slot: 'B1', note: 'ช่วงเตือนก่อนคว้า: เอนหลัง ง้างแขนไปด้านหลังสุด ตัวสั่นเก็บแรง', loop: 1.0 },
  grabLow:   { name: 'คว้าพื้น',         em: '✋', slot: 'B2', note: 'แขนยืดพุ่งเรียดพื้น ตัวโน้มหน้า ฝ่ามือแบ (น้องกระโดดข้าม)', loop: 1.2, reach: 'open' },
  grabHigh:  { name: 'คว้าระดับหัว',     em: '✋', slot: 'B3', note: 'แขนพุ่งตรงระดับหัวน้อง (น้องหมอบลอด)', loop: 1.2, reach: 'open' },
  grabAbove: { name: 'ตะครุบจากข้างบน',  em: '🫳', slot: 'B4', note: 'แขนโค้งยกสูงแล้วฟาดลง ฝ่ามือคว่ำ ตัวยืด (ดูเงามือ ลอยให้พ้นจังหวะ)', loop: 1.4, reach: 'open' },
  hold:      { name: 'ยกน้องค้าง',       em: '✊', slot: 'B5', note: 'กำมือชูระดับหัว หัวเราะชอบใจ (โค้ดวางน้องในกำมือ)', loop: 1.5, reach: 'fist' },
  pull:      { name: 'ลากเข้าหาปาก',     em: '😋', slot: 'B6', note: 'ทางเลือก: อ้าปาก แขนหดดึงน้องเข้าหาตัว ตาหิว', loop: 1.6, reach: 'fist' },
  stun:      { name: 'เสียหลักมึน',      em: '🌀', slot: 'B7', note: 'น้องดิ้นหลุด: มือสะบัดกาง ตัวเซถอยหลัง ตาหมุน เครือกล้วยเผยอ', loop: 1.8 },
  shakeHold: { name: 'เขย่า',            em: '🫨', slot: 'B8', note: 'ดิ้นไม่หลุด: กำน้องเขย่า ตัวเอียงซ้ายขวา หัวเราะ', loop: 0.6, reach: 'fist' },
  laser:     { name: 'เลเซอร์หัวปลี',    em: '🔆', note: 'ชาร์จ: ย่อตัวเงยหน้า ลูกแสงเหนือหัวปลีโตขึ้น สายฟ้าวน ตัวสั่น (ไฟล์ 01) → ยิง: ก้มหัวพุ่งหัวปลีไปหาน้อง ตัวถีบรับแรง ใบสะบัด (ไฟล์ 02 · ลำแสงรอไฟล์) — ผู้เล่นกระโดดหนี', dur: 3.2 },
  plant:     { name: 'ปลูกกล้วยตอผุด',   em: '🌱', note: 'เงื้อแขนสองข้าง เอนหลัง ยกขา (ไฟล์ 01) → ทุบพื้นมือฝังดิน เศษดินกระเด็น (ไฟล์ 02) → ต้นกล้วยตอเล็กใหญ่ผุดเป็นแถวไล่ไปหาน้อง ทีละต้น (พื้นนูนเตือนก่อน) — ผู้เล่นกระโดดหลบ', dur: 3.5 },
  hit:       { name: 'โดนตี',            em: '💢', note: 'สะดุ้งหงายหลัง หัวสะบัด กัดฟัน มือแบกันหน้า (ไฟล์ท่าโดนตี) · โดนตีตอนไหนก็เข้าท่านี้แวบหนึ่ง (o.hitT)', dur: 0.9 },
  toss:      { name: 'โยน',              em: '🤾', slot: 'B9', note: 'เหวี่ยงแขนไปทางซ้ายสุด ตัวบิดตาม ปล่อยมือ', dur: 0.8 },
};
/** B10 หน้าโกรธ (แยกเฉพาะหน้า) — วางทับหน้าเดิมตอน o.rage */
export const BANANA_RAGE_SLOT = 'B10';
/** จังหวะท่า (วินาทีในท่า) — หน้าเกมปล่อยกล้วย/คลื่นตามนี้ ท่าทางจะตรงกัน */
export const BANANA_BOSS_ACT = { throw: { release: 1.05 }, slam: { land: 1.25 }, laser: { fire: 1.6, end: 2.85 },
  // ปลูกกล้วยตอผุด: slam = มือทุบพื้น · ต้นกล้วยตอ: x (หน่วยบอส · ลบ = ไปทางน้อง) h สูง (หน่วยบอส) at = วินาทีที่โผล่พ้นดิน
  //   พื้นนูนเตือน warn วิ ก่อน at · ค้าง hold วิ · มุดกลับ sink วิ — อันตรายช่วง at … at+hold (หน้าเกมเช็กชนช่วงนี้ หรือวาดเองด้วย drawBananaStump)
  plant: { slam: 0.9, warn: 0.32, rise: 0.16, hold: 0.5, sink: 0.24, end: 3.05,
    stumps: [[-62, 15], [-84, 26], [-106, 14], [-128, 29], [-150, 18]].map(([x, h], i) => ({ x, h, at: 1.1 + i * 0.3 })) },
};   // laser: ยิงช่วง fire–end (หน้าเกมวางลำแสง/เช็กชนช่วงนี้)

// ── ชิ้นส่วน ──
const VB = { x: -420, y: 90, w: 1680, h: 1000 };   // บน −140: ลูกแสง/สายฟ้าท่าเลเซอร์อยู่เหนือหัว · ขวา +60   // ขวา +110: ใบกล้วยท่าโดนตีเอนไปหลัง   // เผื่อซ้าย: กล้วยที่ปา + เส้นลมในไฟล์ท่าปาอยู่นอกตัวทางซ้าย
const GROUND = 1066, CX = 545, UNIT = (GROUND - 270) / BANANA_BOSS.H;
const INK = '#583720';
const PARTS = {
  base: ['leaves', 'banana-crown', 'torso', 'left-arm', 'left-leg', 'right-leg', 'waist', 'face', 'horn', 'left-fist', 'right-fist'],
  grab: ['raised-left-arm', 'raised-left-hand'],
  throw: ['throwing-left-arm', 'open-left-hand', 'thrown-banana', 'throw-motion'],
  // ท่าโดนตี (ลำดับชั้นตามไฟล์) — เก็บชื่อขึ้นต้น hit: (ชื่อขา/มือซ้ำกับท่าอื่น)
  hit: ['back-leaves', 'extended-left-arm', 'recoil-torso', 'left-leg', 'right-leg', 'waist-leaves', 'folded-right-arm', 'purple-horn', 'tilted-head',
    'mouth-and-teeth', 'head-reaction-marks', 'open-left-hand', 'front-right-fist'],
};
  // ท่าชาร์จเลเซอร์ 01 · charging-arcs / energy-orb / energy-sparks = แสงพลัง (ไม่มีขอบเข้ม)
//   สายฟ้า/ประกาย (charging-arcs-back/front · energy-sparks) เอาออกแล้ว — ผู้ใช้ 28 พ.ย. "เอาพวกเส้น ๆ ออก" (เหลือลูกแสง + แสงฟุ้ง)
PARTS.laser1 = ['back-leaves', 'rear-left-fist', 'purple-horn', 'raised-head', 'mouth-and-teeth', 'arched-torso', 'left-leg', 'waist-leaves',
  'right-leg', 'front-right-fist', 'energy-orb'];
PARTS.laser2 = ['upper-back-leaf', 'far-fist', 'far-arm', 'back-bananas', 'low-back-leaf', 'left-leg', 'arched-torso', 'waist-leaves', 'right-leg',
  'lowered-head', 'purple-horn', 'sweeping-back-leaf', 'near-fist'];
PARTS.plant1 = ['rear-arm', 'rear-banana-tip', 'upper-back-leaf', 'back-banana-peels', 'wide-side-leaf', 'lower-back-leaf', 'extended-left-leg', 'tilted-torso',
  'lowered-right-leg', 'waist-leaves', 'purple-horn', 'raised-head', 'mouth-and-teeth', 'raised-arm', 'raised-banana-hand'];
PARTS.plant2 = ['rear-left-leaf', 'sweeping-left-leaf', 'banana-crown', 'upper-right-leaf', 'wide-right-leaf', 'lower-right-leaf', 'rear-left-leg', 'crouched-torso',
  'waist-leaves', 'bent-right-leg', 'left-grounded-arm', 'lowered-head', 'mouth-and-teeth', 'purple-horn', 'right-grounded-arm', 'ground-pieces'];
const SRC = { base: BASE, grab: GRAB, throw: THROW, hit: HIT, laser1: LASER1, laser2: LASER2, plant1: PLANT1, plant2: PLANT2 };
// ท่าที่มาเป็นทั้งตัวคนละกระดาษ: เลื่อนให้เท้าตรงพื้นท่าหลัก (ขนาดเท่ากัน) · ชิ้นเก็บชื่อ "ท่า:ชิ้น" (ชื่อซ้ำกับท่าอื่น)
const SHIFT = { hit: [-220, 110], laser1: [-165, 72], laser2: [-273, 47], plant1: [-240, 104], plant2: [-215, 92] };   // plant1: เท้าที่ยืน y 962 x 985 · plant2: เท้า y 974 (ก้อนดินจมพื้นนิด)   // laser1: เท้าล่างสุด y 994 · กลางเท้า x 710 · laser2: y 1019 · x 818
// สายฟ้า/ประกายรวมพลัง: แยกเส้น (SPLIT_N = จำนวนเส้นที่อ่านได้จากไฟล์)
const SPLIT = new Set(['charging-arcs-back', 'charging-arcs-front', 'energy-sparks']), SPLIT_N = {};
const NOINK = new Set(['laser1:charging-arcs-back', 'laser1:charging-arcs-front', 'laser1:energy-sparks', 'laser1:energy-orb']);
// จุดหมุนท่าชาร์จเลเซอร์ (พิกัดท่าหลักหลังเลื่อน)
// ท่ายิง (02): หัว/หัวปลีก้มไปหาน้อง · ปลายหัวปลี = จุดออกลำแสง
// ลำแสง: พิกัดไฟล์ 03 → พิกัดท่าหลัก = (p − [665, 367]) / 0.4555 + SHIFT.laser2
const L3K = 1 / 0.4555, L3 = { e: -273 - 665 / 0.4555, f: 47 - 367 / 0.4555 };
const L3PT = (x, y) => [x * L3K + L3.e, y * L3K + L3.f];
const BEAM_TIP = [592, 551.5], ORB_C = [684, 561];   // ปลายลำแสงฝั่งบอส · กลางลูกแสง (พิกัดไฟล์ 03)
const L2PIV = { neck: [487, 607], tip: [-30, 500], nearFist: [962, 517], farFist: [497, 337], sweep: [627, 497], upper: [707, 337], low: [907, 657], bananas: [677, 477], hip: [545, 900] };
const LPIV = { orb: [967, 210], neck: [785, 545], horn: [875, 400], fistB: [383, 637], fistF: [931, 724], leaves: [835, 522] };
// จุดหมุนท่าปลูกกล้วยตอ (พิกัดไฟล์ของท่านั้น → เลื่อนตาม SHIFT)
const shp = (pose, [x, y]) => [x + SHIFT[pose][0], y + SHIFT[pose][1]];
const P1PIV = Object.fromEntries(Object.entries({ foot: [985, 962], arm: [915, 560], rear: [762, 505], neck: [905, 500], horn: [930, 262], leaves: [960, 560], leg: [705, 650] }).map(([k, v]) => [k, shp('plant1', v)]));
const P2PIV = Object.fromEntries(Object.entries({ neck: [765, 555], horn: [640, 520], crown: [795, 420], leafL: [672, 455], leafR: [830, 410], leafLow: [975, 470] }).map(([k, v]) => [k, shp('plant2', v)]));
// จุดหมุนท่าโดนตี (พิกัดท่าหลักหลังเลื่อนแล้ว)
const HPIV = { neck: [780, 585], shoulder: [665, 445], marks: [865, 395], leaves: [690, 560], horn: [930, 405], fist: [745, 730], waist: [520, 815] };
// จุดหมุน (พิกัดไฟล์)
const PIV = {
  hip: [545, 930], crownBase: [450, 560], leafBase: [500, 600], face: [345, 685], horn: [300, 640],
  legL: [405, 815], legR: [700, 785],   // โคนขา (รากเอวบังรอยต่อ) — ท่าเดิน
  shoulderL: [262, 770], fistL: [137, 899], fistR: [893, 730], waist: [550, 790], banana: [-207, 605],   // กลางกล้วยที่ปา (พิกัดท่าหลัก)
};
const toU = ([fx, fy]) => [(fx - CX) / UNIT, (GROUND - fy) / UNIT];
/** จุดบนตัว (หน่วยบอส · x ไปทางน้อง = ลบ · y ขึ้น = บวก) ตอนยืนท่าหลัก — หน้าเกมใช้เล็งจุดตี/จุดปล่อยของ */
// ไฟล์ท่าแต่ละท่านักวาดวาดตัวโตไม่เท่ากัน → ย่อให้เท่าท่าหลัก (วัดหัว/กำปั้นเทียบท่าหลัก · ผู้ใช้ 28 พ.ย. "ให้ตัวบอสขนาดเท่ากันในแต่ละท่า")
//   ย่อรอบเท้า (CX, GROUND) — เท้ายังอยู่ที่พื้นเดิม · ท่ายิงเลเซอร์ (02) โตสุด ~1.2 เท่า
const POSE_K = { hit: 0.95, laser1: 0.94, laser2: 0.83, plant2: 0.97 };
const kU = (u, k) => [u[0] * k, u[1] * k];
export const BANANA_BOSS_PT = { laserTip: kU(toU(L2PIV.tip), POSE_K.laser2), laserOrb: kU(toU(L3PT(...ORB_C)), POSE_K.laser2), laserBeam: kU(toU(L3PT(...BEAM_TIP)), POSE_K.laser2), face: toU(PIV.face), shoulder: toU(PIV.shoulderL), fist: toU(PIV.fistL), crown: toU(PIV.crownBase), horn: toU(PIV.horn), banana: toU(PIV.banana) };
const EXPLODE = {
  leaves: [0, -90], 'banana-crown': [-20, -150], torso: [40, 0], 'left-arm': [-60, 20], 'left-leg': [-40, 110], 'right-leg': [60, 110],
  waist: [20, 60], face: [-110, -20], horn: [-110, -110], 'left-fist': [-150, 60], 'right-fist': [150, -20],
  'raised-left-arm': [-60, -40], 'raised-left-hand': [-80, -120], 'throwing-left-arm': [-60, -40], 'open-left-hand': [-120, -40],
};

// เศษสีที่โผล่เกินในไฟล์ → ลบออกจากภาพชิ้นตอนโหลด (พิกัดไฟล์ · ผู้ใช้ 27 พ.ย.)
//   torso: สีเขียวของตัวโผล่เป็นแถบบางระหว่างใต้ปาก (หน้า) กับเส้นขอบขาซ้าย — อยู่ใต้หน้า/ขาส่วนอื่นอยู่แล้ว ลบเฉพาะแถบ
// เติมรูปทรงที่ไฟล์วาดไว้แค่ครึ่ง (ส่วนที่เหลือซ่อนหลังชิ้นอื่นในท่านิ่ง · ขยับแล้วเห็นขาด) — แทน d ของเส้นตอนโหลด (ผู้ใช้ 28 พ.ย.)
//   ใบกล้วยเน่าสีเข้มขวาสุดที่เอว: ขอบขวาเว้าตามขาขวา → โค้งป่องเต็มใบแบบใบอื่น (ขาเดินแล้วไม่ขาด)
const FILL = { waist: [['M563 773 Q604 732 638 771 Q632 824 675 904 L666 925 Q646 905 611 853Z', 'M563 773 Q604 732 640 770 Q666 806 678 866 Q684 902 672 922 Q666 928 660 921 Q640 902 611 853Z']] };
const CUT = { torso: [[[270, 812], [318, 812], [301, 866], [292, 882], [270, 882]]] };

let IMG = null, READY = false;
const RES = 1;
/** โหลดภาพชิ้นส่วนครั้งเดียว: ภาพสี + ภาพขอบเข้ม (เงาชิ้นขยายออก) */
export function loadBananaBoss() {
  if (IMG) return IMG.ready;
  IMG = {};
  const jobs = [];
  for (const [pose, ids] of Object.entries(PARTS)) {
    const doc = new DOMParser().parseFromString(SRC[pose].slice(SRC[pose].indexOf('<svg')), 'image/svg+xml');
    const root = doc.documentElement;
    root.setAttribute('viewBox', `${VB.x} ${VB.y} ${VB.w} ${VB.h}`);
    root.setAttribute('width', VB.w * RES); root.setAttribute('height', VB.h * RES);
    const top = [...root.children].filter((e) => e.tagName === 'g');
    // ไฟล์ท่าปา: ชิ้นตัว/หน้า/ขา มี transform จัดวาง (ย่อ .684 + เลื่อน) · ชิ้นแขน/มือ/กล้วย/เส้นลม วาดในพิกัดหน้ากระดาษตรง ๆ
    //   → ชิ้นที่มี transform: ถอดออก · ชิ้นที่ไม่มี: ใส่ตัวแปลงย้อนกลับ — ทุกชิ้นได้พิกัดเดียวกับท่าหลัก
    const placed = top.map((g) => g.getAttribute('transform')).find((v) => v && /matrix/.test(v));
    let inv = null;
    if (placed) {
      const [a, , , d, e, f] = placed.match(/-?[\d.]+/g).map(Number);
      inv = `matrix(${1 / a} 0 0 ${1 / d} ${-e / a} ${-f / d})`;
    }
    for (const g of top) {
      if (SHIFT[pose]) { g.setAttribute('transform', `translate(${SHIFT[pose][0]} ${SHIFT[pose][1]})`); continue; }
      if (g.getAttribute('transform')) g.removeAttribute('transform');
      else if (inv) g.setAttribute('transform', inv);
      // ชิ้นของท่าหลัก: คงการตัดตามเงาทั้งตัว (approved-outline) แบบไฟล์ต้นฉบับ — ส่วนที่ซ่อนอยู่นอกเงาตัวไม่โผล่ (ผู้ใช้ 27 พ.ย.)
      //   ภาพถูกตัดตอนท่านิ่งแล้วค่อยขยับทั้งชิ้น → ชิ้นที่ขยับไม่โดนตัดขอบซ้ำ · ท่าจับ/ท่าปา: ไฟล์มีตัวแปลงจัดวาง เงาไม่ตรงพิกัด จึงถอดออก
      if (pose !== 'base' && /approved-outline/.test(g.getAttribute('clip-path') || '')) g.removeAttribute('clip-path');
    }
    if (pose === 'base') for (const [gid, list] of Object.entries(FILL)) for (const [from, to] of list) for (const p of doc.getElementById(gid)?.querySelectorAll('path') || []) if (p.getAttribute('d').trim() === from) p.setAttribute('d', to);
    for (const id of ids) {
      jobs.push(new Promise((ok) => {
        for (const g of top) g.setAttribute('display', g.id === id ? 'inline' : 'none');
        const im = new Image();
        im.onload = () => { const pic = CUT[id] ? cutOf(im, CUT[id]) : im; const key = SHIFT[pose] ? pose + ':' + id : id; IMG[key] = { im: pic, ink: NOINK.has(key) ? null : inkOf(pic) }; ok(); };
        im.onerror = () => ok();
        im.src = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(doc)], { type: 'image/svg+xml' }));
      }));
      // สายฟ้า/ประกายท่าชาร์จ: แยกทีละเส้น (ขยับคนละจังหวะ) — เก็บเป็น "laser1:ชิ้น#ลำดับ"
      if ((pose === 'laser1' && SPLIT.has(id)) || (pose === 'plant2' && id === 'ground-pieces')) {
        const grp = top.find((g) => g.id === id), kids = [...grp.children];
        kids.forEach((k0, i) => jobs.push(new Promise((ok) => {
          for (const g of top) g.setAttribute('display', g === grp ? 'inline' : 'none');
          kids.forEach((k) => k.setAttribute('display', k === k0 ? 'inline' : 'none'));
          const xml = new XMLSerializer().serializeToString(doc);
          kids.forEach((k) => k.removeAttribute('display'));
          const im = new Image();
          im.onload = () => { IMG[`${pose}:${id}#${i}`] = { im, ink: NOINK.has(pose + ':' + id) ? null : inkOf(im) }; ok(); };
          im.onerror = () => ok();
          im.src = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
        })));
        SPLIT_N[id] = kids.length;
      }
    }
  }
  // ลำแสง + ลูกแสง (ไฟล์ 03): ภาพเฉพาะชิ้น ตัดกรอบเอง ความละเอียด ×2.2 (ขยายกลับ 1/0.4555 แล้วยังคม)
  {
    const doc = new DOMParser().parseFromString(LASER3.slice(LASER3.indexOf('<svg')), 'image/svg+xml');
    const root = doc.documentElement, top = [...root.children].filter((e) => e.tagName === 'g');
    for (const [id, box, fade] of [['laser-beam', [0, 392, 600, 230], true], ['laser-orb', [646, 523, 76, 76], false]]) {
      jobs.push(new Promise((ok) => {
        for (const g of top) g.setAttribute('display', g.id === id ? 'inline' : 'none');
        const R3 = 2.2;
        root.setAttribute('viewBox', box.join(' ')); root.setAttribute('width', box[2] * R3); root.setAttribute('height', box[3] * R3);
        const im = new Image();
        im.onload = () => {
          const cv = document.createElement('canvas'); cv.width = box[2] * R3; cv.height = box[3] * R3;
          const c = cv.getContext('2d'); c.drawImage(im, 0, 0, cv.width, cv.height);
          if (fade) {   // ปลายซ้ายของลำแสงในไฟล์ถูกตัดตรงขอบกระดาษ → จางหายนุ่ม ๆ แทนขอบตัด
            c.globalCompositeOperation = 'destination-out';
            const g = c.createLinearGradient(0, 0, cv.width * 0.35, 0); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = g; c.fillRect(0, 0, cv.width * 0.35, cv.height);
          }
          // แนวกลางลำแสง (ถ่วงตามความทึบ · พิกัดไฟล์ 03) — หน้าเกมให้ลำแสงผ่านกลางลูกแสงพอดี (เส้นชนตรงภาพ)
          let cy = box[1] + box[3] / 2;
          if (fade) {
            const d = c.getImageData(0, 0, cv.width, cv.height).data; let sw = 0, sy = 0;
            for (let yy = 0; yy < cv.height; yy++) for (let xx = Math.floor(cv.width * 0.4); xx < cv.width; xx += 3) { const a = d[(yy * cv.width + xx) * 4 + 3]; sw += a; sy += a * yy; }
            if (sw) cy = box[1] + sy / sw / R3;
          }
          IMG['laser3:' + id] = { cv, box, cy }; ok();
        };
        im.onerror = () => ok();
        im.src = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(doc)], { type: 'image/svg+xml' }));
      }));
    }
  }
  IMG.ready = Promise.all(jobs).then(() => { READY = true; });
  loadSlots();
  return IMG.ready;
}
// ══ ช่องท่าจากนักวาด (B1–B10) ══
// วางไฟล์ใน src/render/bosses/banana/slots/ ชื่อขึ้นต้นด้วยรหัสช่อง เช่น B2-grab-low.svg · หลายเฟรม: B2-grab-low-1.svg, -2 … (เรียงตามเลขท้าย)
// กระดาษ/พิกัดเดียวกับ banana-boss-final.svg (เท้าเดิม) · ท่าแขนยืด: แยกมือเป็น <g id="hand"> โค้ดยืดท่อนแขนให้เอง
const SLOT_SRC = import.meta.glob('./banana/slots/B*.svg', { query: '?raw', import: 'default', eager: true });
const SPR = {};   // รหัสช่อง → { frames: [{ body, hand, c }] } (ใส่เมื่อโหลดภาพเสร็จ)
const SLOT_FPS = 8;
function svgImage(doc) {
  return new Promise((ok) => {
    const im = new Image();
    im.onload = () => ok(im); im.onerror = () => ok(null);
    im.src = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(doc)], { type: 'image/svg+xml' }));
  });
}
/** เหลือเฉพาะ el (ซ่อนพี่น้องทุกชั้นตามสายบรรพบุรุษ · คง defs/style ไว้) */
function only(doc, el) {
  for (let a = el; a && a !== doc.documentElement; a = a.parentNode) {
    for (const sib of a.parentNode.children) if (sib !== a && !/^(defs|style|title)$/i.test(sib.tagName)) sib.setAttribute('display', 'none');
  }
}
function loadSlots() {
  const bySlot = {};
  for (const [path, raw] of Object.entries(SLOT_SRC)) {
    const name = path.split('/').pop().replace(/\.svg$/i, '');
    const slot = (name.match(/^(B\d+)/i) || [])[1]?.toUpperCase();
    if (!slot) continue;
    const n = +((name.match(/-(\d+)$/) || [])[1] || 0);
    (bySlot[slot] ||= []).push([n, raw]);
  }
  for (const [slot, list] of Object.entries(bySlot)) {
    list.sort((a, b) => a[0] - b[0]);
    Promise.all(list.map(async ([, raw]) => {
      const mk = () => {
        const doc = new DOMParser().parseFromString(raw.slice(raw.indexOf('<svg')), 'image/svg+xml');
        const root = doc.documentElement;
        root.setAttribute('viewBox', `${VB.x} ${VB.y} ${VB.w} ${VB.h}`);
        root.setAttribute('width', VB.w * RES); root.setAttribute('height', VB.h * RES);
        return doc;
      };
      const d1 = mk(), hand = d1.getElementById('hand');
      if (hand) hand.setAttribute('display', 'none');
      const body = await svgImage(d1);
      let h = null;
      if (hand) { const d2 = mk(); only(d2, d2.getElementById('hand')); const im = await svgImage(d2); if (im) h = { im, c: bboxCenter(im) }; }
      return body ? { body, hand: h } : null;
    })).then((frames) => { frames = frames.filter(Boolean); if (frames.length) SPR[slot] = { frames }; });
  }
}
/** เฟรมของช่อง ณ เวลาในท่า (วน/ค้างเฟรมสุดท้ายตามชนิดท่า) */
function slotFrame(slot, st, loop) {
  const S = slot && SPR[slot];
  if (!S) return null;
  const n = S.frames.length, i = Math.floor(st * SLOT_FPS);
  return S.frames[loop ? i % n : Math.min(n - 1, i)];
}
/** กลางภาพจริง (ส่วนที่ทึบ) ของภาพขนาดกระดาษ VB → พิกัดไฟล์ */
function bboxCenter(im) {
  const R = 4, w = Math.ceil(VB.w / R), h = Math.ceil(VB.h / R);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.drawImage(im, 0, 0, w, h);
  const d = c.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return [VB.x + VB.w / 2, VB.y + VB.h / 2];
  return [VB.x + ((x0 + x1 + 1) / 2) * R, VB.y + ((y0 + y1 + 1) / 2) * R];
}
const CENTER = {};
const centerOf = (id) => (CENTER[id] ||= IMG?.[id] ? bboxCenter(IMG[id].im) : [0, 0]);

/** ลบพื้นที่ (รูปหลายเหลี่ยมพิกัดไฟล์) ออกจากภาพชิ้น */
function cutOf(im, polys) {
  const W = VB.w * RES, H = VB.h * RES;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.drawImage(im, 0, 0, W, H);
  c.globalCompositeOperation = 'destination-out';
  for (const p of polys) {
    c.beginPath();
    p.forEach(([x, y], i) => c[i ? 'lineTo' : 'moveTo']((x - VB.x) * RES, (y - VB.y) * RES));
    c.fill();
  }
  return cv;
}
/** ขอบเข้มของชิ้น: ทาเงาชิ้นสีเส้น แล้วขยายออกรอบตัว ~3.5 พิกเซลไฟล์ (ผู้ใช้ 27 พ.ย.: ลดจาก 6 — ขอบนอกหนาเท่าเส้นในตัวแบบไฟล์ต้นฉบับ) */
function inkOf(im) {
  const W = VB.w * RES, H = VB.h * RES;
  const tint = document.createElement('canvas'); tint.width = W; tint.height = H;
  const t = tint.getContext('2d');
  t.drawImage(im, 0, 0, W, H);
  t.globalCompositeOperation = 'source-in'; t.fillStyle = INK; t.fillRect(0, 0, W, H);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const R = 3.5 * RES;
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; c.drawImage(tint, Math.cos(a) * R, Math.sin(a) * R); }
  c.drawImage(tint, 0, 0);
  return cv;
}

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const easeOut = (k) => { k = clamp(k); return 1 - (1 - k) ** 3; };
const easeIn = (k) => { k = clamp(k); return k * k * k; };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const back = (k) => { k = clamp(k); const s = 1.7; return 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2; };

// ───────── ท่าทาง ─────────
/**
 * P: y(ยกทั้งตัว หน่วยไฟล์) sx sy(ยืดรอบเท้า) rot(เอียงรอบสะโพก · บวก = เอนไปหลัง/ขวา) shake
 *    arm 'base'|'grab'|'throw' · armRot(แขนซ้ายหมุนรอบไหล่) · fistL/fistR [dx,dy,scale] · leaf crown horn faceK waist (มุม/ยืด)
 *    banana: { x, y, rot, a } กล้วยที่ปา (พิกัดไฟล์) · motion 0..1 เส้นลม · dust 0..1 · wave 0..1 คลื่นพื้น · flash 0..1 · fade
 */
export function bananaBossPose(state, st, t, o = {}) {
  const bob = o.bob === false ? 0 : 1;
  const P = { y: 0, x: 0, sx: 1, sy: 1, rot: 0, shake: 0, arm: 'base', armRot: 0, fistL: [0, 0, 1], fistR: [0, 0, 1],
    leaf: 0, crown: [0, 0, 0], horn: 0, faceK: 1, faceY: 0, waist: 0, banana: null, motion: 0, dust: -1, wave: -1,
    flash: 0, fade: 1, crownFly: null, sparkle: 0, eyes: 'grin', flame: 0, crackMin: 0, rays: 0 };
  const breathe = Math.sin((t / 3.2) * TAU);
  // ชั้นพื้นฐาน: หายใจ ใบไหว เครือกล้วยเด้ง กำปั้นบีบ
  const idleLayer = (k = 1) => {
    P.sy += breathe * 0.018 * bob * k; P.sx -= breathe * 0.01 * bob * k;
    P.rot += Math.sin((t / 3.2) * TAU + 0.8) * 0.012 * k;
    P.leaf += Math.sin(t * 1.7) * 0.035 * k;
    P.crown[1] += Math.sin(t * 3.4 + 0.5) * 4 * k; P.crown[2] += Math.sin(t * 1.7 + 1.2) * 0.025 * k;
    P.horn += Math.sin(t * 2.1) * 0.03 * k;
    const sq = Math.max(0, Math.sin(t * 2.4)) * 0.05 * k;
    P.fistL[2] += sq; P.fistR[2] += Math.max(0, Math.sin(t * 2.4 + 1.6)) * 0.05 * k;
    P.fistL[1] += Math.sin(t * 2.2) * 5 * k; P.fistR[1] += Math.sin(t * 2.2 + 1.3) * 6 * k;
    P.waist += Math.sin(t * 2.6) * 0.03 * k;
  };
  if (state === 'idle') idleLayer();
  else if (state === 'enter') {
    const fall = seg(st, 0, 0.55), land = seg(st, 0.55, 0.95), roar = seg(st, 1.15, 2.3);
    P.y = fall < 1 ? (1 - easeIn(fall)) * 900 : 0;
    P.sy = 1 - Math.sin(land * Math.PI) * 0.22; P.sx = 1 + Math.sin(land * Math.PI) * 0.14;
    if (land > 0 && land < 1) P.dust = land;
    if (st > 0.55 && st < 1.4) P.wave = seg(st, 0.55, 1.4);
    const r = Math.sin(roar * Math.PI);
    P.shake = roar > 0 && roar < 1 ? Math.sin(st * 60) * 5 * r : 0;
    P.faceK = 1 + r * 0.1; P.leaf = -r * 0.12 + Math.sin(st * 22) * 0.03 * r;
    P.fistL = [-r * 20, -r * 70, 1 + r * 0.15]; P.fistR = [r * 20, -r * 60, 1 + r * 0.15];
    P.armRot = r * 0.35;
    P.crown[1] = -r * 14;
    if (st > 2.3) idleLayer(seg(st, 2.3, 2.6));
  } else if (state === 'throw') {
    const R = BANANA_BOSS_ACT.throw.release;
    const reach = seg(st, 0, 0.38), hold = seg(st, 0.38, 0.85), swing = seg(st, 0.85, R), follow = seg(st, R, 1.6), rec = seg(st, 1.7, 2.4);
    idleLayer(0.4);
    if (st < 0.38) { P.armRot = ease(reach) * 1.1; P.rot = ease(reach) * 0.06; }
    else if (st < R) {
      P.arm = 'grab';
      P.rot = 0.06 + ease(hold) * 0.05 - ease(swing) * 0.05;   // เอนหลังง้าง
      P.sy = 1 + ease(hold) * 0.03; P.y = ease(hold) * 6;
      P.crown[1] = -ease(hold) * 6;
    } else if (st < 1.85) {
      P.arm = 'throw';
      const f = easeOut(follow);
      P.rot = -0.08 * Math.sin(f * Math.PI * 0.9) - 0.02;   // เหวี่ยงเอนหน้า
      P.motion = 1 - follow;
      P.faceK = 1 + Math.sin(follow * Math.PI) * 0.06;
    } else { P.rot = -0.02 * (1 - ease(rec)); }
    // กล้วยที่ปา: เกิดที่มือตอนปล่อย พุ่งไปซ้ายเป็นโค้งต่ำลง หมุนติ้ว
    if (st >= R - 0.02 && st < R + 1.4) {
      const k = seg(st, R, R + 1.4), [bx, by] = PIV.banana;
      P.banana = { x: bx - k * 1500, y: by + k * 380 - Math.sin(k * Math.PI) * 200, rot: -k * TAU * 3, a: 1 - seg(k, 0.9, 1) };
    }
  } else if (state === 'slam') {
    const L = BANANA_BOSS_ACT.slam.land;
    const crouch = seg(st, 0, 0.45), jump = seg(st, 0.45, L), land = seg(st, L, L + 0.35), rec = seg(st, 1.8, 2.4);
    if (st < 0.45) { P.sy = 1 - ease(crouch) * 0.14; P.sx = 1 + ease(crouch) * 0.08; P.fistL = [0, -ease(crouch) * 40, 1.08]; P.fistR = [0, -ease(crouch) * 50, 1.08]; P.armRot = ease(crouch) * 0.5; }
    else if (st < L) {
      const h = Math.sin(jump * Math.PI);
      P.y = h * 160; P.sy = 1 + h * 0.06; P.sx = 1 - h * 0.04;
      P.fistL = [0, -60 - h * 20, 1.12]; P.fistR = [0, -70 - h * 20, 1.12]; P.armRot = 0.6 + h * 0.2; P.leaf = -h * 0.15;
    } else {
      const sq = Math.sin(land * Math.PI) * (1 - land * 0.3);
      P.sy = 1 - sq * 0.24; P.sx = 1 + sq * 0.16;
      P.fistL = [0, 30 * sq, 1 + sq * 0.1]; P.fistR = [0, 30 * sq, 1 + sq * 0.1]; P.armRot = -0.1 * sq;
      P.leaf = sq * 0.12;
      P.shake = st < L + 0.5 ? Math.sin(st * 70) * (L + 0.5 - st) * 16 : 0;
      if (land < 1) P.dust = land;
      P.wave = seg(st, L, L + 0.9);
      idleLayer(ease(rec));
    }
  } else if (state === 'tired') {
    const pant = Math.sin((st / 0.9) * TAU);
    P.y = -14; P.sy = 0.94 + pant * 0.02; P.sx = 1.03 - pant * 0.01;
    P.rot = -0.05 + Math.sin((st / 1.8) * TAU) * 0.03;
    P.leaf = 0.22 + pant * 0.03; P.crown = [0, 10, 0.08]; P.horn = 0.1;
    P.fistL = [-6, 26, 0.96]; P.fistR = [6, 34, 0.96]; P.armRot = -0.15;
    P.faceY = 10; P.eyes = 'dizzy';
  } else if (state === 'defeat') {
    const shake = seg(st, 0, 1.3), pop = seg(st, 1.1, 2.2), fall = seg(st, 1.6, 2.7), fade = seg(st, 2.8, 4.0);
    P.shake = st < 1.6 ? Math.sin(st * 55) * 6 * (0.4 + shake) : 0;
    P.flash = st < 1.6 ? Math.max(0, Math.sin(st * 14)) * shake : 0;
    if (pop > 0) P.crownFly = { x: pop * 260, y: -Math.sin(pop * Math.PI) * 260 + pop * pop * 300, rot: pop * 3, a: 1 - seg(pop, 0.7, 1) };
    P.rot = ease(fall) * 0.55; P.sy = 1 - ease(fall) * 0.12; P.leaf = 0.3 * ease(fall); P.fistL = [0, 40 * ease(fall), 0.95]; P.fistR = [0, 40 * ease(fall), 0.95];
    P.fade = 1 - fade; P.sparkle = fade > 0 ? fade : 0; P.eyes = 'dizzy';
  } else if (state === 'walk') { idleLayer(0.35); walkPose(P, st, t); }
  else if (state === 'hit') hitPose(P, st, t);
  else if (state === 'laser') laserPose(P, st, t);
  else if (state === 'plant') plantPose(P, st, t);
  else if (BANANA_BOSS_STATES[state]?.slot) grabPose(P, state, st, t, o, idleLayer);
  return P;
}
/** ท่าเดิน (ผู้ใช้ 28 พ.ย. · ไม่มีไฟล์ขาใหม่ — ใช้ขาท่าหลัก): ก้าวสั้นย่ำหนัก
 *  ขาแต่ละข้าง = แกว่งรอบโคนขา + ยกเท้าตอนแกว่งไปหน้า (หันซ้าย → หน้า = มุมบวก) · สองข้างสลับครึ่งรอบ
 *  ตัว: สูงสุดกลางก้าว ต่ำสุด + ยุบตอนเท้าลง · เอียงไปข้างที่เหยียบ · กำปั้นแกว่งสวนขา · ใบ/เครือกล้วยเด้งตามช้ากว่านิด */
function walkPose(P, st, t) {
  const L = BANANA_BOSS_STATES.walk.loop, w = (st / L) * TAU;
  const leg = (ph) => {
    const a = w + ph, swing = Math.sin(a), up = Math.max(0, Math.cos(a));
    return [0.13 * swing, 52 * up ** 1.4, up];   // [มุม, ยกสูง (หน่วยไฟล์), แรงยก 0..1]
  };
  P.legL = leg(0); P.legR = leg(Math.PI);
  const bob = 7 * (1 - Math.cos(2 * w)) / 2;
  P.legBob = bob;   // ขาข้างที่เหยียบยืดลงชดเชยตัวที่เด้งขึ้น — เท้าติดพื้นตลอด
  const stepHit = Math.abs(Math.sin(w));                     // 0 = เท้าเพิ่งลง
  const land = Math.max(0, 1 - stepHit / 0.35);
  P.y += bob;                                                // เด้งขึ้นกลางก้าว
  P.sy *= 1 - 0.028 * land; P.sx *= 1 + 0.018 * land;          // ยุบรับน้ำหนักตอนเท้าลง
  P.rot += 0.03 * Math.sin(w);                                // เอียงไปข้างที่เหยียบ
  P.shake += 3 * land * land;                                 // พื้นสะเทือนนิด ๆ ทุกก้าว
  P.fistL[0] += -16 * Math.sin(w + Math.PI); P.fistL[1] += -6 * Math.abs(Math.sin(w));
  P.fistR[0] += -14 * Math.sin(w); P.fistR[1] += -6 * Math.abs(Math.cos(w));
  P.armRot += 0.05 * Math.sin(w + Math.PI);
  P.leaf += 0.05 * Math.sin(2 * w - 0.9);
  P.crown[1] += 6 * Math.sin(2 * w - 1.1); P.crown[2] += 0.03 * Math.sin(w - 0.6);
  P.horn += 0.04 * Math.sin(2 * w - 0.7);
  P.waist += 0.04 * Math.sin(w);
  P.step = land;   // หน้าเกม/หน้าทดสอบใช้ยิงเสียงก้าว
}
/** ท่าชาร์จเลเซอร์ (ไฟล์ 01): ย่อตัวรับแรง → ลูกแสงเหนือหัวปลีโตขึ้น เต้นถี่ขึ้น · สายฟ้าวนรอบลูกแสง กะพริบ · ตัวสั่นแรงขึ้นเรื่อย ๆ
 *  ช่วงท้าย (≥ 1.6 วิ) = พลังเต็ม แสงจ้าสุด — ท่ายิง (ไฟล์ 02) จะต่อจากจังหวะนี้ */
function laserPose(P, st, t) {
  const A = BANANA_BOSS_ACT.laser;
  if (st >= A.fire) return laserFirePose(P, st - A.fire, st, t);
  P.laserPose = true;
  const ch = ease(clamp(st / 1.6));                 // พลังที่ชาร์จ 0..1
  const dip = ease(clamp(st / 0.35));
  P.sy = 1 - 0.04 * dip + Math.sin(t * 5) * 0.008; P.sx = 1 + 0.025 * dip;
  P.shake = Math.sin(t * 70) * (1 + 5 * ch * ch);   // สั่นเก็บแรง
  // สายฟ้ารวมพลัง (ผู้ใช้ 28 พ.ย.): ครั้งเดียว · ทีละเส้นคนละจังหวะ (ดูธรรมชาติ)
  //   ผุด: เส้นค่อย ๆ โผล่ทีละเส้น ลอยเข้าที่ · ค้าง: แต่ละเส้นส่ายเบา ๆ คนละรอบ · ไหลเข้า: ช้าก่อนแล้วเร่ง (ถูกดูด) หมุนวนเข้า จางตอนใกล้แตะลูกแสง
  const F0 = BANANA_BOSS_ACT.laser.fire;
  const strand = (key, i, n) => {
    const h = Math.sin((i + 1) * 12.9898 + key.length * 4.1) * 43758.5453, r = h - Math.floor(h);   // สุ่มคงที่ต่อเส้น
    const born = 0.04 + 0.32 * (i / Math.max(1, n - 1)) * (0.6 + 0.4 * r), go = 0.62 + 0.28 * r, dur = 0.5 + 0.22 * (1 - r);
    const inn = ease(clamp((st - born) / 0.32)), f = clamp((st - go) / dur), pull = f * f * (3 - 2 * f) * (0.35 + 0.65 * f);
    const sw = Math.sin(t * (2.4 + 1.6 * r) + i * 1.7) * 0.05 * (1 - f);
    const s0 = (0.88 + 0.12 * inn) * (1 + 0.025 * Math.sin(t * (5 + 3 * r) + i)), s = s0 * (1 - 0.97 * pull);
    const a = st >= F0 ? 0 : inn * Math.min(1, (1 - pull) / 0.35) * (0.82 + 0.18 * Math.abs(Math.sin(t * (17 + 9 * r) + i)));
    return { s, a, rot: sw + (key === 'charging-arcs-front' ? -1 : 1) * 0.45 * pull ** 1.4, done: pull };
  };
  const strands = {};
  for (const key of SPLIT) strands[key] = Array.from({ length: SPLIT_N[key] || 0 }, (_, i) => strand(key, i, SPLIT_N[key]));
  const all = Object.values(strands).flat();
  const wB = { s: Math.min(1, ...all.map((q) => q.s)) }, wF = wB;
  const gulp = st < F0 ? Math.max(0, 1 - Math.min(wB.s, wF.s) / 0.3) : 0;   // สายฟ้าไหลเข้าหมด = ลูกแสงพองรับพลังเต็มที่
  P.L = {
    orb: (0.35 + 0.65 * back(clamp(st / 1.2))) * (1 + 0.09 * ch * Math.sin(t * (14 + 14 * ch)) + 0.12 * gulp * ch),
    orbA: clamp(st / 0.25),
    strands,
    glow: ch * (0.8 + 0.2 * Math.sin(t * 20)),
    head: -0.03 * ch + Math.sin(t * 47) * 0.006 * ch,   // เงยหน้าขึ้นอีกนิด สั่นตาม
    horn: Math.sin(t * 40) * 0.03 * ch,
    fist: 1 + 0.06 * ch * Math.abs(Math.sin(t * 9)),
    leaves: Math.sin(t * 3) * 0.03 + 0.04 * ch * Math.sin(t * 25),
  };
}
/** ท่ายิงเลเซอร์ (ไฟล์ 02): u = เวลาหลังเริ่มยิง · ก้มหัวพุ่งหัวปลี (สปริงเข้า) → ยิงค้าง ตัวถีบรับแรงสั่นตลอด ใบ/เครือกล้วยสะบัดไปหลัง → ช่วงท้ายผ่อนแรง
 *  ลำแสง = ชั้นแยกจากนักวาด (รอไฟล์) — ตอนนี้วาดแค่แสงจ้าที่ปลายหัวปลี (P.L2.tip) */
function laserFirePose(P, u, st, t) {
  P.laser2Pose = true;
  const A = BANANA_BOSS_ACT.laser, len = A.end - A.fire;
  const snap = u < 0.08 ? Math.sin((u / 0.08) * Math.PI / 2) : Math.exp(-(u - 0.08) * 7) * Math.cos((u - 0.08) * 18);
  const on = clamp(u / 0.06) * (1 - ease(clamp((u - len) / 0.3)));   // แรงยิง 0..1 (ผ่อนหลังจบยิง)
  P.rot = -0.04 * snap + 0.02 * on;                // พุ่งหัวไปหน้า แล้วถีบรับแรงถอยหลังนิด
  P.sx = 1 + 0.02 * snap; P.sy = 1 - 0.03 * snap - 0.015 * on;
  P.shake = Math.sin(t * 85) * 4.5 * on + 10 * snap;
  const blast = on * (0.7 + 0.3 * Math.sin(t * 30));
  P.L2 = {
    head: 0.03 * snap + Math.sin(t * 60) * 0.006 * on,
    fist: 1 + 0.05 * on * Math.abs(Math.sin(t * 11)),
    sweep: 0.05 * blast + Math.sin(t * 2.4) * 0.02,   // ใบกล้วยสะบัดไปหลังตามแรงยิง
    upper: 0.04 * blast, low: 0.05 * blast,
    bananas: [Math.sin(t * 26) * 3 * on, Math.abs(Math.sin(t * 13)) * -4 * on],
    tip: on * (0.85 + 0.15 * Math.sin(t * 40)),
    // ลูกแสงปลายหัวปลี: ผุดเด้งตอนเริ่มยิง เต้นถี่ · หดหายตอนจบ
    orb: (u < 0.2 ? back(u / 0.2) * 1.15 : 1 + 0.12 * Math.sin(t * 38)) * (1 - ease(clamp((u - len) / 0.25))),
    // ลำแสง: พุ่งออกจากลูกแสงยืดถึงสุด (0.18 วิ) · ค้างยิง แกนแสงกะพริบ · จบ = หางหลุดพุ่งไปหาน้องแล้วจาง
    beam: easeOut(clamp(u / 0.18)) * 1.6,
    beamY: 1 + 0.07 * Math.sin(t * 52) + 0.04 * Math.sin(t * 23),
    beamGo: Math.max(0, u - len) * 2600,
    beamA: 1 - clamp((u - len) / 0.3),
  };
}
/** ต้นกล้วยตอแต่ละต้น ณ เวลา st ในท่า: warn 0..1 (พื้นนูนเตือน) · rise 0..~1.1 (โผล่ · เด้งเกินนิด) · sway มุมโยก · dirt 0..1 เวลาหลังโผล่ (ดินกระเด็น) · null = ยังไม่มา/หายแล้ว */
export function bananaStumpAt(i, st) {
  const A = BANANA_BOSS_ACT.plant, S = A.stumps[i], d = st - S.at;
  if (d < -A.warn || d > A.hold + A.sink) return null;
  if (d < 0) return { warn: 1 + d / A.warn, rise: 0, sway: 0, dirt: -1 };
  const up = d < A.rise ? back(d / A.rise) : 1, down = ease(clamp((d - A.hold) / A.sink));
  return { warn: 0, rise: up * (1 - down), sway: Math.exp(-d * 6) * Math.sin(d * 26) * 0.09 * (1 - down), dirt: d < 0.55 ? d / 0.55 : -1, sinkDirt: down > 0 && down < 1 ? down : -1 };
}
/** ท่าปลูกกล้วยตอผุด: 01 เงื้อสองแขนเอนหลัง สั่นเก็บแรง → ฟาดลง (สลับไฟล์ 02 ตอน slam) → ทุบ: ยุบตัวสปริง ก้อนดินเด้ง ฝุ่นฟุ้ง
 *  → ค้างมือฝังดิน: ทุกครั้งที่ตอผุด ตัวกดลงนิด (ดันพลังลงดิน) หัวหัวเราะ → ท้ายท่า ยืดตัวขึ้นนิดก่อนกลับท่ายืน */
function plantPose(P, st, t) {
  const A = BANANA_BOSS_ACT.plant;
  if (st < A.slam) {   // ไฟล์ 01: เงื้อ
    P.plant1Pose = true; P.rotAt = P1PIV.foot;
    const up = ease(st / 0.5), tr = seg(st, 0.15, A.slam - 0.16), drop = easeIn(seg(st, A.slam - 0.16, A.slam));
    P.rot = 0.045 * up - 0.12 * drop;                     // เอนหลังเงื้อ → ฟาดตัวลงไปหน้า
    P.y = 12 * up * (1 - drop);
    P.sy = 1 + 0.03 * up - 0.06 * drop; P.sx = 1 - 0.015 * up + 0.035 * drop;
    P.shake = Math.sin(t * 64) * 4 * tr * (1 - drop);    // สั่นเก็บแรง
    const quiver = Math.sin(t * 41) * 0.022 * tr;
    P.p1 = {
      arm: 0.1 * up + quiver - 0.55 * drop,               // แขนง้างไปหลังอีกนิด → ฟาดข้ามหัวลงหน้า
      rear: 0.06 * up - quiver - 0.35 * drop,
      head: 0.05 * up - 0.12 * drop + Math.sin(t * 2.3) * 0.01,
      horn: Math.sin(t * 3) * 0.04 + 0.05 * up,
      leaves: 0.05 * up + Math.sin(t * 2.4) * 0.03 - 0.1 * drop,
      leg: 0.07 * up - 0.16 * drop,                        // ขาที่ยกเตะสูงอีกนิด → ฟาดลง
    };
    return;
  }
  // ไฟล์ 02: ทุบพื้น มือฝังดิน
  P.plant2Pose = true; P.rotAt = [CX, GROUND];
  const u = st - A.slam;
  const imp = u < 0.05 ? Math.sin((u / 0.05) * Math.PI / 2) : Math.exp(-(u - 0.05) * 7) * Math.cos((u - 0.05) * 19);
  let push = 0;   // ดันพลังลงดินทุกครั้งที่ตอผุด
  for (const S of A.stumps) { const d = st - S.at + 0.12; if (d > 0 && d < 0.4) push = Math.max(push, Math.sin((d / 0.4) * Math.PI)); }
  const rec = ease(seg(st, A.end, BANANA_BOSS_STATES.plant.dur));   // ยืดตัวขึ้นก่อนกลับท่ายืน
  P.sy = 1 - 0.08 * imp - 0.025 * push + 0.035 * rec; P.sx = 1 + 0.05 * imp + 0.012 * push - 0.015 * rec;
  P.rot = 0.012 * push - 0.03 * rec;
  P.shake = 16 * Math.max(0, imp) + (u < 0.5 ? Math.sin(t * 78) * 10 * (1 - u / 0.5) : 0) + Math.sin(t * 60) * 2.2 * push;
  if (u < 0.55) P.dust = u / 0.55;
  if (u < 0.9) P.wave = u / 0.9;
  const pop = (k) => Math.sin(Math.PI * clamp(k));   // ก้อนดินกระดอนขึ้นแล้วตกที่เดิม
  P.p2 = {
    head: 0.05 * Math.max(0, imp) - 0.02 * push + Math.sin(t * 2.2) * 0.012 - 0.04 * rec,
    horn: Math.sin(t * 2.6) * 0.03 + 0.06 * Math.max(0, imp),
    crown: [Math.sin(t * 26) * 2 * push, -14 * pop(u / 0.3) + Math.sin(t * 3.4) * 3, 0.06 * pop(u / 0.35)],
    leafL: -0.07 * Math.max(0, imp) + Math.sin(t * 1.9) * 0.03 + 0.02 * push,
    leafR: 0.06 * Math.max(0, imp) + Math.sin(t * 1.7 + 0.8) * 0.03 - 0.02 * push,
    rocks: [0, 1, 2, 3].map((i) => { const k = (u - i * 0.03) / (0.3 + 0.06 * i), h = [46, 34, 40, 28][i]; return [[-8, -3, 6, 3][i] * pop(k), -h * pop(k) - 5 * push, [-0.18, -0.1, 0.16, 0.08][i] * pop(k)]; }),
  };
  P.stumps = A.stumps.map((_, i) => bananaStumpAt(i, st));
}
/** ท่าโดนตี: สะดุ้งหงายหลังแรง (0–0.1 วิ) → สปริงเด้งกลับนิ่ง · หัวสะบัด มือแบสั่น รอยตกใจเด้งออก ใบกล้วยสะบัด
 *  ขยับน้อย ๆ รอบจุดต่อ — ชิ้นซ้อนกันที่ข้อต่อพอ เส้นไม่ขาด */
function hitPose(P, st, t) {
  P.hitPose = true; P.eyes = 'hit';
  const jolt = st < 0.1 ? Math.sin((st / 0.1) * Math.PI / 2) : Math.exp(-(st - 0.1) * 6) * Math.cos((st - 0.1) * 16);
  const settle = Math.exp(-st * 4);
  P.rot = 0.07 * jolt;                       // เอนหลังรอบสะโพก (หันซ้าย → หงายไปขวา)
  P.sx = 1 + 0.03 * jolt; P.sy = 1 - 0.045 * jolt;
  P.shake = (st < 0.35 ? Math.sin(st * 85) * 7 * (1 - st / 0.35) : 0) + 12 * jolt;
  P.h = {
    head: 0.09 * jolt + Math.sin(t * 2.2) * 0.012,          // หัวสะบัดไปหลังแล้วเด้งกลับ
    arm: -0.07 * jolt + Math.sin(st * 30) * 0.035 * settle,  // แขน+มือแบสั่นตกใจ (หมุนรอบไหล่ด้วยกัน)
    fist: [8 * jolt, -6 * jolt],
    leaves: 0.08 * jolt + Math.sin(t * 1.7) * 0.03,
    horn: 0.12 * jolt,
    marks: 0.55 + 0.45 * back(clamp(st / 0.22)) + 0.05 * Math.sin(t * 9),   // รอยตกใจเด้งออก
    waist: -0.06 * jolt,
  };
}

// ── ท่าคว้า B1–B9 (ประกอบจากชิ้นเดิมไปก่อน) ──
const lerp2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const REST = toU(PIV.fistL);   // มือซ้ายตอนยืนท่าหลัก
/** ทางเดินมือสาธิต (ไม่มี o.reachTo — หน้า monster-lab) · u = 0..1 ในรอบท่า */
function demoReach(state, u, t, st) {
  const out = u < 0.35 ? easeOut(u / 0.35) : u < 0.55 ? 1 : 1 - ease((u - 0.55) / 0.45);
  // ระยะสาธิต ≈ ที่น้องยืนในหน้า monster-lab (ในเกมจริงหน้าเกมส่ง o.reachTo ไปถึงตัวน้องเอง)
  if (state === 'grabLow') return lerp2(REST, [-135, 8], out);
  if (state === 'grabHigh') return lerp2(REST, [-135, 30], out);
  if (state === 'grabAbove') {
    if (u < 0.35) return lerp2(REST, [-120, 125], ease(u / 0.35));
    if (u < 0.45) return lerp2([-120, 125], [-150, 8], easeIn((u - 0.35) / 0.1));
    if (u < 0.65) return [-150, 8];
    return lerp2([-150, 8], REST, ease((u - 0.65) / 0.35));
  }
  if (state === 'pull') return lerp2([-150, 14], [-40, 44], ease(u));
  if (state === 'shakeHold') return [-62 + Math.sin((st / 0.3) * TAU) * 12, 82 + Math.cos((st / 0.15) * TAU) * 5];
  return [-62 + Math.sin(t * 9) * 2, 82 + Math.abs(Math.sin(t * 9)) * 3];   // hold
}
function grabPose(P, state, st, t, o, idleLayer) {
  const D = BANANA_BOSS_STATES[state], L = D.loop || D.dur, u = (st % L) / L;
  const reach = (hand) => { P.arm = 'reach'; P.reach = { hand, at: o.reachTo || demoReach(state, u, t, st) }; };
  if (state === 'grabWind') {                       // B1 ง้าง: เอนหลัง แขนเหวี่ยงไปหลังสุด กำปั้นบีบแน่น ตัวสั่น
    const k = ease(seg(st, 0, 0.35));
    idleLayer(0.3);
    P.rot += 0.1 * k + Math.sin(t * 46) * 0.007 * k;
    P.sy += 0.03 * k; P.y = 5 * k; P.faceK = 1 + 0.03 * k; P.crown[1] -= 6 * k; P.leaf -= 0.08 * k;
    P.armRot = 1.0 * k; P.fistL = [10 * k, -10 * k, 1 + 0.12 * k]; P.fistR = [14 * k, -8 * k, 1 + 0.08 * k];
  } else if (state === 'grabLow' || state === 'grabHigh' || state === 'grabAbove') {   // B2–B4 แขนพุ่ง
    idleLayer(0.2);
    P.rot -= state === 'grabLow' ? 0.11 : state === 'grabHigh' ? 0.07 : 0.04;
    P.sy += state === 'grabAbove' ? 0.05 : -0.03; P.sx += 0.02;
    P.faceK = 1.04; P.leaf += 0.06; P.fistR = [-6, 8, 1];
    reach('open');
  } else if (state === 'hold' || state === 'shakeHold') {   // B5 ยกค้าง หัวเราะ · B8 เขย่า
    const f = state === 'shakeHold' ? 13 : 9, lb = Math.abs(Math.sin(t * f));
    P.y = lb * 5; P.faceK = 1.05 + lb * 0.04; P.crown[1] = -lb * 8; P.leaf = Math.sin(t * f) * 0.05;
    P.rot = state === 'shakeHold' ? Math.sin((st / 0.3) * TAU) * 0.08 : 0.03 + Math.sin(t * f) * 0.015;
    P.fistR = [0, -lb * 10, 1.05];
    reach('fist');
  } else if (state === 'pull') {                    // B6 ลากเข้าหาปาก
    idleLayer(0.3);
    P.rot -= 0.03; P.faceK = 1.1 + Math.sin(t * 7) * 0.03; P.leaf += 0.04;
    reach('fist');
  } else if (state === 'stun') {                    // B7 เสียหลักมึน
    const sw = Math.sin((st / 1.8) * TAU * 2), hit = 1 - ease(seg(st, 0, 0.3));
    P.rot = 0.1 + sw * 0.06 + hit * 0.08;
    P.shake = hit * Math.sin(st * 60) * 4;
    P.crown = [-16, -26 + Math.sin(t * 5) * 4, 0.32 + sw * 0.05]; P.horn = 0.22 + sw * 0.05; P.leaf = 0.15;
    P.armRot = 0.55 + sw * 0.1; P.fistL = [-40, -34, 1]; P.fistR = [46, -44 + sw * 6, 1];
    P.eyes = 'dizzy'; P.faceY = 4;
  } else if (state === 'toss') {                    // B9 โยน: เหวี่ยงไปซ้ายสุด ตัวบิดตาม
    const sw = ease(seg(st, 0, 0.3)), rec = ease(seg(st, 0.45, 0.8));
    P.arm = st < 0.55 ? 'throw' : 'base';
    P.rot = (0.06 - 0.16 * sw) * (1 - rec);
    P.motion = st < 0.55 ? 1 - seg(st, 0.2, 0.55) : 0;
    P.faceK = 1 + 0.05 * Math.sin(seg(st, 0, 0.5) * Math.PI);
  }
}

// ───────── วาด ─────────
const about = (c, [px, py], a = 0, sx = 1, sy = 1) => { c.translate(px, py); if (a) c.rotate(a); if (sx !== 1 || sy !== 1) c.scale(sx, sy); c.translate(-px, -py); };
function star(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.32 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill();
}

const ARM_COL = '#629c2e', ARM_LIT = '#81bf43';
/**
 * แขนซ้ายยืด (ท่าคว้า): ท่อนแขนโค้งจากไหล่ (ตามตัวที่เอน/ยืด) ไปถึงจุดมือ แล้ววางมือ (แบ/กำ) ทับปลาย
 * วาดในกรอบตรง (ไม่เอนตามตัว) → จุดมือตรงกับที่หน้าเกมใช้ชน · o.held วาดน้องในกำมือก่อนวาดมือทับ
 */
function drawReach(ctx, P, o, R) {
  const { x, groundY, k, face, shake, body, spr } = R;
  ctx.save(); body(ctx); const M = ctx.getTransform(); ctx.restore();
  const frame = (c) => { c.translate(x + shake * k, groundY); c.scale(k * face, k); c.translate(-CX, -GROUND); };
  ctx.save(); frame(ctx);
  const sh = ctx.getTransform().inverse().transformPoint(M.transformPoint(new DOMPoint(PIV.shoulderL[0], PIV.shoulderL[1])));
  const hx = CX + P.reach.at[0] * UNIT * face, hy = GROUND - P.reach.at[1] * UNIT;
  const dx = hx - sh.x, dy = hy - sh.y, len = Math.hypot(dx, dy) || 1;
  let nx = dy / len, ny = -dx / len;
  if (ny > 0) { nx = -nx; ny = -ny; }                 // โก่งขึ้นเสมอ (แขนยางเหวี่ยงเป็นโค้ง)
  const bend = Math.min(110, len * 0.18);
  const cx = (sh.x + hx) / 2 + nx * bend, cy = (sh.y + hy) / 2 + ny * bend;
  const arm = (w, col, off = 0) => {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
    ctx.moveTo(sh.x + nx * off, sh.y + ny * off); ctx.quadraticCurveTo(cx + nx * off, cy + ny * off, hx + nx * off * 0.5, hy + ny * off * 0.5); ctx.stroke();
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  arm(92 + 8, INK); arm(92, ARM_COL);
  ctx.save(); ctx.globalAlpha *= 0.6; arm(22, ARM_LIT, 22); ctx.restore();
  ctx.restore();
  // น้องในกำมือ (พิกัดจอของผู้เรียก) — วาดก่อนมือ มือจึงทับกลางตัว
  const sx = x + shake * k + (hx - CX) * k * face, sy = groundY + (hy - GROUND) * k;
  P.handAt = [sx, sy];
  if (o.held) { const f = ctx.filter; ctx.filter = 'none'; ctx.save(); o.held(sx, sy); ctx.restore(); ctx.filter = f; }
  // มือ: ไฟล์นักวาด (กลุ่ม hand) > มือจากไฟล์เดิม · มือแบหมุนตามทิศแขน · กำปั้นตั้งตรง
  const id = P.reach.hand === 'fist' ? 'left-fist' : 'open-left-hand';
  const own = spr?.hand, pic = own || IMG[id];
  if (!pic) return;
  const c = own ? own.c : centerOf(id);
  const a0 = own ? Math.PI : Math.atan2(c[1] - PIV.shoulderL[1], c[0] - PIV.shoulderL[0]);
  const a = P.reach.hand === 'fist' ? Math.sin(st0(o) * 9) * 0.06 : Math.atan2(dy, dx) - a0;
  ctx.save(); frame(ctx);
  const hs = P.reach.hand === 'fist' ? 0.95 : 1.05;
  ctx.translate(hx, hy); ctx.rotate(a); ctx.scale(hs, hs); ctx.translate(-c[0], -c[1]);
  if (!own) ctx.drawImage(pic.ink, VB.x, VB.y, VB.w, VB.h);
  ctx.drawImage(own ? own.im : pic.im, VB.x, VB.y, VB.w, VB.h);
  ctx.restore();
}
const st0 = (o) => o.t || 0;
/** B10 หน้าโกรธ: ไฟล์นักวาด (ทับหน้าเดิม) — ยังไม่มี = หน้าเดิมแดงเรื่อ + รอยเส้นเลือดปูด 💢 กะพริบ */
let RAGE_FACE = null;
function drawRage(ctx, P, body, t, st) {
  const own = slotFrame(BANANA_RAGE_SLOT, st, true);
  const faceXf = (c) => { c.translate(0, P.faceY); about(c, PIV.face, 0, P.faceK, P.faceK); };
  ctx.save(); body(ctx); faceXf(ctx);
  if (own) ctx.drawImage(own.body, VB.x, VB.y, VB.w, VB.h);
  else if (IMG.face) {
    if (!RAGE_FACE) {
      RAGE_FACE = document.createElement('canvas'); RAGE_FACE.width = VB.w * RES; RAGE_FACE.height = VB.h * RES;
      const c = RAGE_FACE.getContext('2d');
      c.drawImage(IMG.face.im, 0, 0, RAGE_FACE.width, RAGE_FACE.height);
      c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(232,40,40,.32)'; c.fillRect(0, 0, RAGE_FACE.width, RAGE_FACE.height);
    }
    ctx.globalAlpha *= 0.75 + 0.25 * Math.sin(t * 6);
    ctx.drawImage(RAGE_FACE, VB.x, VB.y, VB.w, VB.h);
    // รอยเส้นเลือดปูด (สี่แฉกโค้ง) ข้างหัว
    ctx.globalAlpha = 1; ctx.translate(420, 600); const pk = 1 + 0.12 * Math.abs(Math.sin(t * 5)); ctx.scale(pk, pk);
    ctx.strokeStyle = '#E8283C'; ctx.lineWidth = 11; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(10, -26); ctx.quadraticCurveTo(10, -10, 26, -10); ctx.stroke(); }
  }
  ctx.restore();
}
/** กล้วยที่ปา (ชิ้นจากไฟล์ท่าปา) วาดลอยที่จุด x, y บนจอ หมุน rot — หน้าเกมใช้วาดลูกที่บินเข้าหาน้อง */
export function drawBananaThrown(ctx, x, y, s, rot = 0) {
  if (!IMG) loadBananaBoss();
  const im = READY && IMG['thrown-banana'];
  if (!im) return;
  const c = centerOf('thrown-banana'), k = s / UNIT;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k); ctx.translate(-c[0], -c[1]);
  ctx.drawImage(im.ink, VB.x, VB.y, VB.w, VB.h);
  ctx.drawImage(im.im, VB.x, VB.y, VB.w, VB.h);
  ctx.restore();
}

/** วาดบอสกล้วยราคี — คืนค่าท่า (หน้าทดสอบแสดงในแท็บ "ค่า") */
export function drawBananaBoss(ctx, x, groundY, s, o = {}) {
  if (!IMG) loadBananaBoss();
  const state = BANANA_BOSS_STATES[o.state] ? o.state : 'idle';
  const t = o.t || 0, st = o.st || 0;
  const P0 = bananaBossPose(state, st, t, o);
  // โดนตีตอนไหนก็ตาม (o.hitT 0–0.55 วิ · ยกเว้นตอนแพ้): เข้าท่าโดนตีแวบหนึ่ง — ค่าที่คืนยังเป็นท่าเดิม (หน้าเกมเล็งจุดตีจากท่าเดิม)
  const hitOver = state !== 'defeat' && state !== 'hit' && o.hitT != null && o.hitT >= 0 && o.hitT < 0.55 && IMG?.['hit:tilted-head'];
  const P = hitOver ? bananaBossPose('hit', o.hitT, t, o) : P0;
  if (!READY) return P0;
  const ex = clamp(o.explode || 0);
  const face = (o.gaze ?? -1) > 0 ? -1 : 1;   // ไฟล์หันซ้าย · มองขวา = กลับด้าน
  const k = s / UNIT;
  const hit = o.hitT != null && o.hitT >= 0 && o.hitT < 0.35 ? 1 - o.hitT / 0.35 : 0;
  const shake = P.shake + (hit ? Math.sin(o.hitT * 90) * 8 * hit : 0);

  // รายการชิ้นตามลำดับชั้น + ตัวแปลงของแต่ละชิ้น (พิกัดไฟล์ หลังตัวแปลงทั้งตัว)
  const items = [];
  const put = (id, xf) => { if (IMG[id]) items.push([id, xf]); };
  const armSet = P.arm === 'grab' ? ['raised-left-arm', 'raised-left-hand'] : P.arm === 'throw' ? ['throwing-left-arm', 'open-left-hand'] : P.arm === 'reach' ? [] : ['left-arm', 'left-fist'];
  const D = BANANA_BOSS_STATES[state];
  const own = P.hitPose || P.laserPose || P.laser2Pose || P.plant1Pose || P.plant2Pose;   // ท่าที่มีไฟล์ทั้งตัวของตัวเอง
  const spr = own ? null : slotFrame(D.slot, st, !!D.loop);   // ไฟล์ท่าจากนักวาด (ถ้ามี) แทนชิ้นประกอบทั้งตัว
  put('leaves', (c) => about(c, PIV.leafBase, P.leaf));
  put('banana-crown', (c) => { c.translate(P.crown[0], P.crown[1]); about(c, PIV.crownBase, P.crown[2]); });
  put('torso', (c) => about(c, PIV.fistR, 0, 1, 1));   // ตัว + แขนขวา (กำปั้นขวาวาดทับปลายแขน)
  const legXf = (q, piv) => (q ? (c) => { c.translate(0, -q[1] + (P.legBob || 0) * (1 - q[2])); about(c, piv, q[0]); } : null);   // ท่าเดิน: ยกเท้า + แกว่งรอบโคนขา
  put('left-leg', legXf(P.legL, PIV.legL));
  put('waist', (c) => about(c, PIV.waist, P.waist));
  put('right-leg', legXf(P.legR, PIV.legR));   // ขาขวาบังใบกล้วยเน่าที่เอว (ใบขวาสุดเติมเต็มแล้ว · ผู้ใช้ 28 พ.ย.)
  const armXf = P.arm === 'base' ? (c) => about(c, PIV.shoulderL, P.armRot) : null;
  put(armSet[0], armXf);
  put('face', (c) => { c.translate(0, P.faceY); about(c, PIV.face, 0, P.faceK, P.faceK); });
  put('horn', (c) => { c.translate(0, P.faceY); about(c, PIV.horn, P.horn); });
  if (P.arm === 'base') put('left-fist', (c) => { about(c, PIV.shoulderL, P.armRot); c.translate(P.fistL[0], P.fistL[1]); about(c, PIV.fistL, 0, P.fistL[2], P.fistL[2]); });
  else put(armSet[1], null);
  put('right-fist', (c) => { c.translate(P.fistR[0], P.fistR[1]); about(c, PIV.fistR, 0, P.fistR[2], P.fistR[2]); });
  if (P.arm === 'throw' && P.motion > 0.01) put('throw-motion', null);
  if (spr) items.splice(0, items.length, ['@sprite', null]);
  if (P.laser2Pose) {   // ท่ายิงเลเซอร์: ชิ้นชุดของไฟล์เลเซอร์ 02
    const L = P.L2, head = (c) => about(c, L2PIV.neck, L.head);
    const XF = {
      'lowered-head': head, 'purple-horn': head,
      'near-fist': (c) => about(c, L2PIV.nearFist, 0, L.fist, L.fist), 'far-fist': (c) => about(c, L2PIV.farFist, 0, L.fist, L.fist),
      'sweeping-back-leaf': (c) => about(c, L2PIV.sweep, L.sweep), 'upper-back-leaf': (c) => about(c, L2PIV.upper, L.upper),
      'low-back-leaf': (c) => about(c, L2PIV.low, L.low), 'back-bananas': (c) => c.translate(L.bananas[0], L.bananas[1]),
    };
    items.splice(0, items.length, ...PARTS.laser2.filter((id) => IMG['laser2:' + id]).map((id) => ['laser2:' + id, XF[id] || null]));
  }
  if (P.laserPose) {   // ท่าชาร์จเลเซอร์: ชิ้นชุดของไฟล์เลเซอร์ 01 แทนทั้งตัว
    const L = P.L, head = (c) => about(c, LPIV.neck, L.head);
    const XF = {
      'energy-orb': (c) => { head(c); about(c, LPIV.orb, 0, L.orb, L.orb); },
      'raised-head': head, 'mouth-and-teeth': head, 'purple-horn': (c) => { head(c); about(c, LPIV.horn, L.horn); },
      'back-leaves': (c) => about(c, LPIV.leaves, L.leaves),
      'rear-left-fist': (c) => about(c, LPIV.fistB, 0, L.fist, L.fist), 'front-right-fist': (c) => about(c, LPIV.fistF, 0, L.fist, L.fist),
    };
    P.alpha = { 'laser1:energy-orb': L.orbA };
    const list = [];
    for (const id of PARTS.laser1) {
      if (SPLIT.has(id) && SPLIT_N[id]) {   // ทีละเส้น: หมุน/ย่อรอบลูกแสงตามค่าของเส้นนั้น
        L.strands[id].forEach((q, i) => {
          const key = `laser1:${id}#${i}`;
          if (!IMG[key]) return;
          P.alpha[key] = q.a;
          list.push([key, (c) => { head(c); about(c, LPIV.orb, q.rot, q.s, q.s); }]);
        });
      } else if (IMG['laser1:' + id]) list.push(['laser1:' + id, XF[id] || null]);
    }
    items.splice(0, items.length, ...list);
  }
  if (P.plant1Pose) {   // ท่าปลูกกล้วยตอ 01 (เงื้อ): ชิ้นชุดของไฟล์ 01 แทนทั้งตัว
    const Q = P.p1, head = (c) => about(c, P1PIV.neck, Q.head), arm = (c) => about(c, P1PIV.arm, Q.arm), rear = (c) => about(c, P1PIV.rear, Q.rear), leaves = (c) => about(c, P1PIV.leaves, Q.leaves);
    const XF = {
      'rear-arm': rear, 'rear-banana-tip': rear, 'raised-arm': arm, 'raised-banana-hand': arm,
      'raised-head': head, 'mouth-and-teeth': head, 'purple-horn': (c) => { head(c); about(c, P1PIV.horn, Q.horn); },
      'upper-back-leaf': leaves, 'back-banana-peels': leaves, 'wide-side-leaf': leaves, 'lower-back-leaf': (c) => about(c, P1PIV.leaves, Q.leaves * 0.6),
      'extended-left-leg': (c) => about(c, P1PIV.leg, Q.leg),
    };
    items.splice(0, items.length, ...PARTS.plant1.filter((id) => IMG['plant1:' + id]).map((id) => ['plant1:' + id, XF[id] || null]));
  }
  if (P.plant2Pose) {   // ท่าปลูกกล้วยตอ 02 (ทุบพื้น): ชิ้นชุดของไฟล์ 02 · ก้อนดินแยก 4 ก้อนกระดอนคนละจังหวะ
    const Q = P.p2, head = (c) => about(c, P2PIV.neck, Q.head);
    const XF = {
      'lowered-head': head, 'mouth-and-teeth': head, 'purple-horn': (c) => { head(c); about(c, P2PIV.horn, Q.horn); },
      'banana-crown': (c) => { c.translate(Q.crown[0], Q.crown[1]); about(c, P2PIV.crown, Q.crown[2]); },
      'rear-left-leaf': (c) => about(c, P2PIV.leafL, Q.leafL * 0.7), 'sweeping-left-leaf': (c) => about(c, P2PIV.leafL, Q.leafL),
      'upper-right-leaf': (c) => about(c, P2PIV.leafR, Q.leafR), 'wide-right-leaf': (c) => about(c, P2PIV.leafR, Q.leafR * 0.8),
      'lower-right-leaf': (c) => about(c, P2PIV.leafLow, Q.leafR * 0.6),
    };
    const list = [];
    for (const id of PARTS.plant2) {
      if (id === 'ground-pieces' && SPLIT_N[id]) {
        for (let i = 0; i < SPLIT_N[id]; i++) {
          const key = `plant2:${id}#${i}`, r = Q.rocks[i] || [0, 0, 0];
          if (IMG[key]) list.push([key, (c) => { c.translate(r[0], r[1]); about(c, centerOf(key), r[2]); }]);
        }
      } else if (IMG['plant2:' + id]) list.push(['plant2:' + id, XF[id] || null]);
    }
    items.splice(0, items.length, ...list);
  }
  if (P.hitPose) {   // ท่าโดนตี: ชิ้นชุดของไฟล์ท่าโดนตีแทนทั้งตัว
    const H = P.h, head = (c) => about(c, HPIV.neck, H.head), arm = (c) => about(c, HPIV.shoulder, H.arm);
    const XF = {
      'back-leaves': (c) => about(c, HPIV.leaves, H.leaves), 'extended-left-arm': arm, 'open-left-hand': arm,
      'waist-leaves': (c) => about(c, HPIV.waist, H.waist),
      'purple-horn': (c) => { head(c); about(c, HPIV.horn, H.horn); }, 'tilted-head': head, 'mouth-and-teeth': head,
      'head-reaction-marks': (c) => { head(c); about(c, HPIV.marks, 0, H.marks, H.marks); },
      'front-right-fist': (c) => c.translate(H.fist[0], H.fist[1]),
    };
    items.splice(0, items.length, ...PARTS.hit.filter((id) => IMG['hit:' + id]).map((id) => ['hit:' + id, XF[id] || null]));
  }

  const body = (c) => {
    c.translate(x + shake * k, groundY - (P.y + (o.alt || 0)) * k * (UNIT / UNIT));
    c.scale(k * face, k);
    c.translate(-CX, -GROUND);
    const pk = P.hitPose ? POSE_K.hit : P.laserPose ? POSE_K.laser1 : P.laser2Pose ? POSE_K.laser2 : P.plant2Pose ? POSE_K.plant2 : 1;
    about(c, [CX, GROUND], 0, P.sx * pk, P.sy * pk);
    about(c, P.rotAt || PIV.hip, P.rot);
  };
  const drawItems = (layer) => {
    for (const [id, xf] of items) {
      if (id === 'banana-crown' && P.crownFly) continue;
      const pic = id === '@sprite' ? (layer === 'im' ? spr.body : null) : IMG[id]?.[layer];
      if (!pic) continue;
      const [dx, dy] = (EXPLODE[id] || [0, 0]).map((v) => v * ex);
      ctx.save();
      body(ctx);
      if (xf) xf(ctx);
      if (id === 'throw-motion') ctx.globalAlpha *= P.motion;
      if (P.alpha?.[id] != null) { if (P.alpha[id] <= 0.005) { ctx.restore(); continue; } ctx.globalAlpha *= P.alpha[id]; }
      if (id === 'laser1:back-leaves' && layer === 'im' && P.L.glow > 0.01) {   // แสงฟุ้งรอบลูกแสง — ชั้นหลังสุด (ไม่ทับเขาม่วง/หัว)
        const [gx, gy] = LPIV.orb, r = 120 + 160 * Math.min(1.3, P.L.glow), a = Math.min(1, P.L.glow);
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
        g.addColorStop(0, `rgba(255,250,200,${0.9 * a})`); g.addColorStop(0.4, `rgba(255,230,60,${0.45 * a})`); g.addColorStop(1, 'rgba(255,220,40,0)');
        ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r, 0, TAU); ctx.fill(); ctx.restore();
      }
      ctx.drawImage(pic, VB.x + dx, VB.y + dy, VB.w, VB.h);
      ctx.restore();
    }
  };

  ctx.save();
  ctx.globalAlpha *= P.fade;
  // เงาใต้ตัว (หดตอนลอย)
  ctx.save();
  const air = clamp(P.y / 600);
  ctx.globalAlpha *= 0.22 * (1 - air * 0.7);
  ctx.fillStyle = '#3A1D0B';
  ctx.beginPath();
  ctx.ellipse(x + 20 * k * face, groundY + 4 * k, 420 * k * (1 - air * 0.5) * P.sx, 40 * k, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  drawItems('ink');   // ขอบเข้มรอบนอก (ชั้นล่างสุด)
  if (hit || P.flash) ctx.filter = `brightness(${1 + 0.9 * Math.max(hit, P.flash)})`;
  drawItems('im');
  if (P.laser2Pose && (IMG['laser3:laser-beam'] || IMG['laser3:laser-orb'])) {   // ลำแสง + ลูกแสง (ไฟล์ 03) — ออกจากปลายหัวปลี ตามหัวที่สั่น
    const L = P.L2;
    ctx.save();
    if (o.beamAim != null) { ctx.beginPath(); ctx.rect(x - 1e5, groundY - 1e5, 2e5, 1e5); ctx.clip(); }   // ลำแสงกดลงพื้น: ไม่ทะลุใต้พื้น
    body(ctx); about(ctx, L2PIV.neck, L.head);
    ctx.transform(L3K, 0, 0, L3K, L3.e, L3.f);   // พิกัดไฟล์ 03
    const B = IMG['laser3:laser-beam'];
    if (B && L.beam > 0.01 && L.beamA > 0.01) {
      // หน้าเกม: o.beamAim = กดลำแสงลงจากแนวนอน (เรเดียน · หมุนรอบลูกแสง) · o.beamThin = บางลง · ลำแสงไม่ทะลุพื้น (ตัดที่ groundY)
      ctx.save(); ctx.globalAlpha *= L.beamA;
      if (o.beamAim != null) {
        ctx.translate(ORB_C[0], ORB_C[1]); ctx.rotate(-o.beamAim - 0.036); ctx.translate(-ORB_C[0], -ORB_C[1]);   // +0.036: ลำแสงเป็นลิ่มขอบล่างเรียบ → หมุนให้แนวกลางลิ่มทับเส้นเล็ง
      }
      if (o.beamAim != null) {   // หน้าเกม: แนวกลางลำแสงผ่านกลางลูกแสง · o.beamLen = ยาวขึ้นให้ถึงขอบจอ
        ctx.translate(BEAM_TIP[0] - L.beamGo * 0.4555, ORB_C[1]); ctx.scale(L.beam * (o.beamLen ?? 1), L.beamY * (o.beamThin ?? 1)); ctx.translate(-BEAM_TIP[0], -B.cy);
      } else { ctx.translate(BEAM_TIP[0] - L.beamGo * 0.4555, BEAM_TIP[1]); ctx.scale(L.beam, L.beamY); ctx.translate(-BEAM_TIP[0], -BEAM_TIP[1]); }
      ctx.drawImage(B.cv, B.box[0], B.box[1], B.box[2], B.box[3]);
      ctx.restore();
    }
    const O = IMG['laser3:laser-orb'];
    if (O && L.orb > 0.01) {
      ctx.save(); ctx.translate(ORB_C[0], ORB_C[1]); ctx.scale(L.orb, L.orb); ctx.translate(-ORB_C[0], -ORB_C[1]);
      ctx.drawImage(O.cv, O.box[0], O.box[1], O.box[2], O.box[3]);
      ctx.restore();
    }
    ctx.restore();
  }
  if (P.laser2Pose && P.L2.tip > 0.01) {   // แสงจ้าปลายหัวปลี (ใต้ลูกแสง)
    ctx.save(); body(ctx); about(ctx, L2PIV.neck, P.L2.head);
    const [gx, gy] = L2PIV.tip, a = P.L2.tip, r = 70 + 40 * a;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    g.addColorStop(0, `rgba(255,255,235,${a})`); g.addColorStop(0.35, `rgba(255,238,90,${0.75 * a})`); g.addColorStop(1, 'rgba(255,220,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r, 0, TAU); ctx.fill();
    ctx.restore();
  }
  if (o.rage && !P.crownFly && !own) drawRage(ctx, P, body, t, st);
  if (P.reach) drawReach(ctx, P, o, { x, groundY, k, face, shake, body, spr });
  ctx.filter = 'none';
  // เครือกล้วยหลุดกระเด็น (แพ้)
  if (P.crownFly && IMG['banana-crown']) {
    ctx.save(); body(ctx);
    ctx.globalAlpha *= P.crownFly.a;
    ctx.translate(P.crownFly.x, P.crownFly.y); about(ctx, PIV.crownBase, P.crownFly.rot);
    ctx.drawImage(IMG['banana-crown'].ink, VB.x, VB.y, VB.w, VB.h);
    ctx.drawImage(IMG['banana-crown'].im, VB.x, VB.y, VB.w, VB.h);
    ctx.restore();
  }
  // กล้วยที่ปา
  if (P.banana && !o.noThrown && IMG['thrown-banana']) {
    ctx.save(); body(ctx);
    ctx.globalAlpha *= P.banana.a;
    const [bx, by] = PIV.banana;
    ctx.translate(P.banana.x - bx, P.banana.y - by); about(ctx, PIV.banana, P.banana.rot);
    ctx.drawImage(IMG['thrown-banana'].ink, VB.x, VB.y, VB.w, VB.h);
    ctx.drawImage(IMG['thrown-banana'].im, VB.x, VB.y, VB.w, VB.h);
    ctx.restore();
  }
  // ฝุ่นตอนลงพื้น + คลื่นพื้น
  const fx = (fn) => { ctx.save(); ctx.translate(x, groundY); ctx.scale(k, k); fn(); ctx.restore(); };
  if (P.dust >= 0) fx(() => {
    ctx.globalAlpha *= 0.55 * (1 - P.dust); ctx.fillStyle = '#EAD9B8';
    for (const d of [-1, 1]) for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(d * (300 + P.dust * 260 + i * 70), -20 - i * 22 - P.dust * 30, 46 * (1 - P.dust * 0.4), 0, TAU); ctx.fill(); }
  });
  if (P.wave >= 0 && P.wave < 1) fx(() => {
    ctx.globalAlpha *= 0.6 * (1 - P.wave); ctx.strokeStyle = '#FFF4D6'; ctx.lineWidth = 18;
    ctx.beginPath(); ctx.ellipse(0, -6, 300 + P.wave * 900, 40 + P.wave * 50, 0, Math.PI, TAU); ctx.stroke();
  });
  // ต้นกล้วยตอผุด (ท่าปลูก) — หน้าเกมวาดเอง (o.noStumps) ตามตำแหน่งในเกม
  if (P.stumps && !o.noStumps) P.stumps.forEach((q, i) => { if (q) drawBananaStump(ctx, x + BANANA_BOSS_ACT.plant.stumps[i].x * s * face, groundY, s, { ...q, h: BANANA_BOSS_ACT.plant.stumps[i].h, seed: i, t }); });
  // ดาวมึน (เหนื่อย/แพ้)
  if (P.eyes === 'dizzy') {
    ctx.save(); body(ctx);
    ctx.fillStyle = '#FFE14A';
    for (let i = 0; i < 3; i++) { const a = t * 3 + (i / 3) * TAU; star(ctx, 340 + Math.cos(a) * 120, 470 + Math.sin(a) * 30, 26); }
    ctx.restore();
  }
  ctx.restore();
  // ประกายสลาย (แพ้)
  if (P.sparkle > 0) fx(() => {
    ctx.fillStyle = '#FFF3B0';
    for (let i = 0; i < 18; i++) {
      const r = Math.sin(i * 91.7) * 0.5 + 0.5, a = (i / 18) * TAU;
      ctx.globalAlpha = (1 - P.sparkle) * 0.9;
      star(ctx, Math.cos(a) * (120 + P.sparkle * 420 * r), -400 + Math.sin(a) * (100 + P.sparkle * 300) - P.sparkle * 200, 20 * (1 - P.sparkle * 0.5));
    }
  });
  return P0;
}

// ══ ต้นกล้วยตอผุด (ท่าปลูก · ผู้ใช้ 28 พ.ย.) — วาดด้วยโค้ดโทนเดียวกับตัวบอส (เขียว 2 เฉด · ใบเน่าน้ำตาล · เส้นน้ำตาลเข้มหนา) ══
const SK = { ink: '#663b19', g: '#80c045', gd: '#629c2e', soil: '#c5803d', rot: '#865e3a', cut: '#F4ECC4', ring: '#D2BF74' };
const rnd = (seed, i) => { const h = Math.sin(seed * 78.233 + i * 12.9898) * 43758.5453; return h - Math.floor(h); };
function stumpPath(c, pts) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 6) c.bezierCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], pts[i + 4], pts[i + 5]); c.closePath(); }
/** ตัวต้นกล้วยตอ (พิกัดไฟล์บอส · โคน = (0,0) · ขึ้น = ลบ) สูง H กว้างโคน W */
function stumpBody(c, H, W, seed, big) {
  const wb = W / 2, wt = W * 0.43, ry = wt * 0.34, lean = (rnd(seed, 1) - 0.5) * W * 0.12;
  c.lineJoin = 'round'; c.lineCap = 'round';
  // ต้นใหญ่: ใบกล้วยกว้างโค้งลงข้างหนึ่ง + ยอดอ่อนม้วน — อยู่หลังหน้าตัด
  if (big) {
    const sh = H * 0.62, sx = lean - wt * 0.1, dir = rnd(seed, 2) < 0.5 ? -1 : 1, L = W * 1.25;
    // ใบกล้วย: ก้านออกจากหน้าตัด โค้งขึ้นแล้วห้อยลง ขอบหยักนิด
    c.save(); c.translate(sx + dir * wt * 0.2, -H - 4); c.scale(dir, 1);
    const leaf = [0, 0, 10, -sh * 0.55, L * 0.45, -sh * 0.95, L * 0.8, -sh * 0.8, L * 1.02, -sh * 0.68, L * 1.05, -sh * 0.35, L * 0.92, -sh * 0.18,
      L * 0.72, -sh * 0.32, L * 0.5, -sh * 0.25, L * 0.3, -sh * 0.32, L * 0.12, -sh * 0.38, 14, -sh * 0.15, 0, 0];
    stumpPath(c, leaf); c.fillStyle = SK.g; c.fill();
    c.save(); c.clip(); c.fillStyle = SK.gd;
    stumpPath(c, [0, -sh * 0.3, L * 0.3, -sh * 0.6, L * 0.7, -sh * 0.62, L * 1.1, -sh * 0.55, L * 1.1, -sh * 0.2, L * 1.1, 0, L * 1.1, 0, 0, 0, 0, 0, 0, -sh * 0.3]); c.fill();
    c.restore();
    stumpPath(c, leaf); c.strokeStyle = SK.ink; c.lineWidth = 10; c.stroke();
    c.beginPath(); c.moveTo(6, -6); c.bezierCurveTo(16, -sh * 0.5, L * 0.5, -sh * 0.72, L * 0.98, -sh * 0.52); c.lineWidth = 4.5; c.stroke();
    c.restore();
    // ยอดอ่อนม้วนตั้งตรง
    stumpPath(c, [sx - 16, -H + 4, sx - 20, -H - sh * 0.5, sx - 26, -H - sh * 0.8, sx - 10, -H - sh * 0.86, sx + 6, -H - sh * 0.8, sx + 12, -H - sh * 0.4, sx + 16, -H + 4, sx, -H + 10, sx - 8, -H + 10, sx - 16, -H + 4]);
    c.fillStyle = SK.g; c.fill(); c.strokeStyle = SK.ink; c.lineWidth = 10; c.stroke();
    c.beginPath(); c.moveTo(sx + 2, -H - 6); c.quadraticCurveTo(sx - 4, -H - sh * 0.5, sx - 14, -H - sh * 0.8); c.lineWidth = 4.5; c.stroke();
  }
  // ลำต้น: โคนบาน ปลายสอบนิด
  const body = [-wb, 6, -wb * 1.02, -H * 0.35, -wt * 1.06 + lean * 0.5, -H * 0.7, -wt + lean, -H, wt * 0.3 + lean, -H - ry * 0.4, wt * 0.7 + lean, -H - ry * 0.4, wt + lean, -H,
    wt * 1.06 + lean * 0.5, -H * 0.7, wb * 1.02, -H * 0.35, wb, 6, wb * 0.4, 14, -wb * 0.4, 14, -wb, 6];
  stumpPath(c, body);
  c.fillStyle = SK.g; c.fill();
  c.save(); c.clip();
  c.fillStyle = SK.gd;   // เงาข้างขวา
  stumpPath(c, [wt * 0.38 + lean, -H - 20, wt * 0.2 + lean * 0.6, -H * 0.6, wb * 0.25, -H * 0.25, wb * 0.35, 20, wb * 0.8, 20, wb * 1.3, 20, wb * 1.3, 0, wb * 1.3, -H, wb * 1.3, -H - 20, wt * 0.38 + lean, -H - 20]);
  c.fill();
  // ลายกาบกล้วย: เส้นโค้งตามแนวต้น
  c.strokeStyle = SK.ink; c.lineWidth = 4.5;
  for (const [fx, top, bot] of [[-0.45, 0.82, 0.2], [0.05, 0.55, 0.05], [0.5, 0.9, 0.35]]) {
    c.beginPath(); c.moveTo(fx * wb, -H * bot); c.quadraticCurveTo(fx * wb * 1.08 + lean * 0.4, -H * (bot + top) / 2, fx * wt + lean, -H * top); c.stroke();
  }
  c.restore();
  stumpPath(c, body); c.strokeStyle = SK.ink; c.lineWidth = 11; c.stroke();
  // หน้าตัด: วงกาบซ้อนกัน
  c.save(); c.translate(lean, -H);
  c.beginPath(); c.ellipse(0, 0, wt, ry, 0, 0, TAU); c.fillStyle = SK.cut; c.fill(); c.lineWidth = 10; c.stroke();
  c.strokeStyle = SK.ring; c.lineWidth = 4;
  for (const k of [0.7, 0.42]) { c.beginPath(); c.ellipse(-wt * 0.04 * (1 - k), ry * 0.06, wt * k, ry * k, 0, 0, TAU); c.stroke(); }
  c.beginPath(); c.ellipse(-wt * 0.05, ry * 0.08, wt * 0.16, ry * 0.16, 0, 0, TAU); c.fillStyle = SK.ring; c.fill();
  c.restore();
  // กาบใบเน่าสีน้ำตาลรอบโคน (แบบรากเอวบอส)
  const lh = Math.min(H * 0.55, 120);
  for (const [bx, tip, w] of [[-0.7, -1.1, 0.78], [0.68, 1.0, 0.72], [0.0, -0.3, 0.8]]) {
    const x0 = bx * wb, w2 = w * wb * 0.5, tx = x0 + tip * wb * 0.5, ty = -lh * (0.78 + 0.25 * rnd(seed, bx * 10));
    stumpPath(c, [x0 - w2, 8, x0 - w2 * 1.1, -lh * 0.35, tx - w2 * 0.4, ty * 0.8, tx, ty, tx + w2 * 0.2, ty * 0.6, x0 + w2 * 1.05, -lh * 0.3, x0 + w2, 8, x0, 12, x0, 12, x0 - w2, 8]);
    c.fillStyle = SK.rot; c.fill(); c.strokeStyle = SK.ink; c.lineWidth = 9; c.stroke();
    c.beginPath(); c.moveTo(x0, 4); c.quadraticCurveTo(x0 + (tx - x0) * 0.3, ty * 0.5, tx - (tx - x0) * 0.15, ty * 0.85); c.lineWidth = 4; c.stroke();
  }
}
function soilChunk(c, x, y, r, rot) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.beginPath(); c.moveTo(-r, r * 0.2); c.lineTo(-r * 0.5, -r * 0.8); c.lineTo(r * 0.6, -r * 0.7); c.lineTo(r, r * 0.3); c.lineTo(r * 0.1, r * 0.8); c.closePath();
  c.fillStyle = SK.soil; c.fill(); c.strokeStyle = SK.ink; c.lineWidth = Math.max(4, r * 0.32); c.lineJoin = 'round'; c.stroke();
  c.restore();
}
/** ต้นกล้วยตอหนึ่งต้นที่จุด x บนจอ ยืนบนพื้น groundY · s = พิกเซลต่อหน่วยบอส (ตัวเดียวกับ drawBananaBoss)
 *  o: h สูง (หน่วยบอส) · warn 0..1 พื้นนูนเตือน · rise 0..~1.1 โผล่ · sway มุมโยก · dirt 0..1 ดินกระเด็นหลังโผล่ · sinkDirt · seed · t — ใช้กับค่าจาก bananaStumpAt() */
export function drawBananaStump(ctx, x, groundY, s, o = {}) {
  const k = s / UNIT, H = (o.h || 20) * UNIT, W = 104 + H * 0.4, seed = o.seed || 0, t = o.t || 0, big = (o.h || 20) >= 20;
  ctx.save(); ctx.translate(x, groundY); ctx.scale(k, k);
  // พื้นนูนเตือน: เนินดินโป่ง + รอยแตก + ดินเม็ดเล็กเด้ง (ยิ่งใกล้ยิ่งแรง)
  const mound = o.warn > 0 ? o.warn : o.rise > 0 ? Math.max(0, 1 - (o.dirt >= 0 ? o.dirt : 1)) * 0.8 : 0;
  if (mound > 0.01) {
    const jig = o.warn > 0 ? Math.sin(t * 55 + seed) * 3 * o.warn : 0, mw = W * (0.55 + 0.25 * mound), mh = 10 + 16 * mound;
    ctx.beginPath(); ctx.moveTo(-mw - 10 + jig, 4); ctx.quadraticCurveTo(-mw * 0.5 + jig, -mh, jig, -mh * 1.05); ctx.quadraticCurveTo(mw * 0.5 + jig, -mh, mw + 10 + jig, 4); ctx.closePath();
    ctx.fillStyle = SK.soil; ctx.fill(); ctx.strokeStyle = SK.ink; ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath();
    for (const d of [-1, 1]) { ctx.moveTo(jig + d * 6, -mh * 0.9); ctx.lineTo(jig + d * mw * 0.3, -mh * 0.45); ctx.lineTo(jig + d * mw * 0.45, -mh * 0.55); }
    ctx.stroke();
    if (o.warn > 0) for (let i = 0; i < 3; i++) { const hop = Math.abs(Math.sin(t * (13 + i * 3) + seed + i)) * 22 * o.warn; soilChunk(ctx, (i - 1) * mw * 0.45, -mh - 6 - hop, 7 + 2 * rnd(seed, i), t * 4 + i); }
  }
  // ต้นกล้วยตอ: ดันขึ้นจากใต้ดิน (ตัดส่วนใต้ดินทิ้ง) · โยกเด้งหลังโผล่
  if (o.rise > 0.005) {
    ctx.save();
    ctx.beginPath(); ctx.rect(-W * 3, -H * 3, W * 6, H * 3 + 14); ctx.clip();
    ctx.rotate(o.sway || 0);
    ctx.translate(0, H * (1 - o.rise) * 1.05);
    stumpBody(ctx, H, W, seed, big);
    ctx.restore();
  }
  // ดินกระเด็นตอนโผล่ / ตอนมุดลง
  const burst = o.dirt >= 0 ? o.dirt : o.sinkDirt >= 0 ? o.sinkDirt * 0.6 : -1;
  if (burst >= 0 && burst < 1) {
    ctx.globalAlpha *= 1 - burst * burst;
    for (let i = 0; i < 6; i++) {
      const dir = (i % 2 ? 1 : -1) * (0.4 + rnd(seed, i + 7) * 0.9), sp = 120 + 120 * rnd(seed, i + 3);
      soilChunk(ctx, dir * sp * burst + dir * W * 0.3, -(220 + 140 * rnd(seed, i)) * burst + 380 * burst * burst - 10, 9 + 7 * rnd(seed, i + 1), burst * 6 * dir);
    }
  }
  ctx.restore();
}
