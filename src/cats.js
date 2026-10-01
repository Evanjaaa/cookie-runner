// src/cats.js
// ─────────────────────────────────────────────────────────────
// น้องแมวจากกล่อง — ข้อมูลและกติกาการเลี้ยงทั้งหมด (ไม่มีหน้าจอในไฟล์นี้)
//
// ── เรื่องของระบบ ──
// น้องในกล่องคือลูกแมวที่ถูกทิ้ง ผู้เล่นพบระหว่างวิ่ง แล้วพากลับมาเลี้ยงที่บ้าน
// เลี้ยงจาก Lv1 ถึง Lv5 ราวหนึ่งสัปดาห์ โตเต็มวัยแล้วย้ายไปอยู่หน้าแรก เลือกลงวิ่งได้
// น้องส้มไม่อยู่ในไฟล์นี้ — เป็นตัวหลักของเกม ไม่ต้องเลี้ยง ไม่กินช่องห้อง
//
// ── ช่อง ──
//   ห้องเลี้ยง 3 ตัว + ฝากรอในกล่องหน้าประตู 1 ตัว   (ตัวที่โตแล้วไม่นับ ไม่จำกัดจำนวน)
//   ห้องกับกล่องเต็มทั้งคู่ = กล่องไม่โผล่ระหว่างวิ่งเลย
//
// ── เวลา ──
// ความหิว/ง่วง/ความสะอาด/ความสนุก ไม่ได้มีใครคอยลดทุกวินาที
// แต่ละค่าจำแค่ "ค่าล่าสุด + เวลาที่ตั้ง" แล้วคิดใหม่ทุกครั้งที่อ่าน
// น้องแต่ละตัวจึงมีนาฬิกาของตัวเองตามเวลาที่ดูแลล่าสุด ปิดเกมไปก็ยังนับต่อ
// เวลามาจาก clock.js ซึ่งอิงนาฬิกาเซิร์ฟเวอร์ ไม่ใช่นาฬิกาเครื่อง
//
// ── ปล่อยไว้นาน ๆ ──
// น้องแค่ทำหน้าเศร้า และได้ EXP ครึ่งเดียวจนกว่าจะได้รับการดูแล
// ไม่ป่วย ไม่หนีออกจากบ้าน — น้องเคยถูกทิ้งมาแล้ว ระบบนี้ต้องไม่ทิ้งซ้ำ
//
// ── เก็บที่ไหน ──
// ก้อนเดียวใน pref 'cats' — ขึ้นคลาวด์เองผ่านคอลัมน์ extra (ดู storage.js)
// ─────────────────────────────────────────────────────────────
import { loadPref, savePref } from './storage.js';
import { now, dayKey } from './clock.js';

export const ROOM_SLOTS = 3;
export const WAIT_SLOTS = 1;
export const GROWN_LV = 5;

/** EXP สะสมที่ต้องมีเพื่อถึงเลเวลนั้น (ช่อง 0 ไม่ใช้) */
export const LV_EXP = [0, 0, 120, 300, 500, 700];

/**
 * เพดาน EXP ต่อวัน — ตัวกำหนดว่าโตได้เร็วสุดแค่ไหน
 * 700 / 100 = เจ็ดวันพอดีถ้าดูแลเต็มเพดานทุกวัน ไม่มีทางรีบกว่านี้ (ไม่มียาเร่งโดยตั้งใจ)
 * ดูแลครบทุกอย่างในหนึ่งวันได้ราว 120 จึงเต็มเพดานได้โดยไม่ต้องเฝ้าจอ
 */
export const DAY_EXP_CAP = 100;

/**
 * สายพันธุ์ที่พบได้ในกล่อง — โอกาสอิงสัดส่วนสีแมวที่พบบ่อยในโลกจริงแบบคร่าว ๆ
 * id ตรงกับจานสีใน skins.js (น้องส้มไม่อยู่ในกล่อง เพราะเป็นตัวหลักของเกม)
 * เพิ่มสายพันธุ์ใหม่ = เพิ่มจานสีใน skins.js แล้วเพิ่มบรรทัดที่นี่
 */
export const BREEDS = [
  { id: 'tabby', w: 35, tier: 'common' },
  { id: 'midnight', w: 30, tier: 'common' },
  { id: 'grey', w: 20, tier: 'uncommon' },
  { id: 'snow', w: 10, tier: 'rare' },
  { id: 'siamese', w: 5, tier: 'rare' },
];

/**
 * ความต้องการสี่อย่าง ลดลงต่อชั่วโมงเท่าไหร่ (เต็ม 100)
 *   food   หิวจากอิ่มจนหมดในแปดชั่วโมง = ให้อาหารวันละสองสามมื้อพอ ไม่ต้องเฝ้า
 *   sleep  ราวสิบหกชั่วโมง
 *   clean  อาบน้ำวันละครั้งก็เหลือ
 *   fun    ราวสิบชั่วโมง
 */
export const NEEDS = {
  food: { perHour: 12.5 },
  sleep: { perHour: 6 },
  clean: { perHour: 3.5 },
  fun: { perHour: 10 },
  // กระหายเร็วกว่าหิวนิดหน่อย — ดื่มน้ำฟรี จึงแวะมาให้น้ำได้บ่อย ๆ
  water: { perHour: 14 },
};
export const NEED_KEYS = ['food', 'water', 'sleep', 'clean', 'fun'];

/**
 * การดูแลสี่อย่าง
 *   need   ความต้องการที่เติมให้เต็ม
 *   below  ต้องลดลงต่ำกว่านี้ก่อนถึงจะได้ EXP — กดรัว ๆ ตอนอิ่มอยู่แล้วไม่ได้อะไร
 *   exp    EXP ต่อครั้ง (ก่อนติดเพดานรายวัน)
 */
export const ACTIONS = {
  feed: { need: 'food', below: 75, exp: 15 },
  play: { need: 'fun', below: 75, exp: 15 },
  bathe: { need: 'clean', below: 60, exp: 20 },
  sleep: { need: 'sleep', below: 60, exp: 10 },
  // ดื่มน้ำ — ฟรี ไม่มีของให้เลือก (ชามน้ำมีน้ำอยู่ตลอด) EXP น้อยกว่าให้อาหารเพราะไม่ต้องจ่าย
  drink: { need: 'water', below: 75, exp: 10 },
};

/**
 * อาหาร — ซื้อด้วยทองตอนให้ ไม่มีของค้างในกระเป๋า
 * ของแพงได้ความผูกพันกับท่าดีใจมากกว่า แต่ EXP เท่ากันทุกจาน
 * (ถ้าของแพงโตเร็วขึ้น มันคือยาเร่งแบบแอบ ๆ ซึ่งตกลงกันไว้ว่าไม่มี)
 */
export const FOODS = [
  { id: 'kibble', name: 'ข้าวเม็ดกรุบกรอบ', price: 100, aff: 1 },
  { id: 'fish', name: 'ปลาทูนึ่ง', price: 400, aff: 3 },
  { id: 'salmon', name: 'แซลมอนชิ้นโต', price: 900, aff: 5 },
];

/** ของเล่น — ซื้อครั้งเดียวใช้ได้ตลอด ลูกไหมพรมมีให้ตั้งแต่แรก */
export const TOYS = [
  { id: 'yarn', name: 'ลูกไหมพรม', price: 0, aff: 1 },
  { id: 'feather', name: 'ไม้ตกแมว', price: 1500, aff: 2 },
  { id: 'ball', name: 'บอลกระดิ่ง', price: 2500, aff: 3 },
  { id: 'mouse', name: 'หนูของเล่น', price: 4000, aff: 4 },
];

/** แตะลูบน้องได้ความผูกพันวันละไม่เกินเท่านี้ (ลูบได้ไม่จำกัด แค่ไม่นับเพิ่ม) */
const PET_AFF_DAY = 5;
export const AFF_MAX = 100;

// ── การพบกล่อง ──
/** เลเวลผู้เล่นที่เริ่มเจอกล่อง — กล่องแรกการันตีตอนถึงเลเวลนี้ (น้องส้มพาไปเจอ) */
export const FIND_LEVEL = 5;
/** โอกาสต่อรอบ — วันละ 5-10 รอบ = เจอราวทุก 3-5 วัน */
const FIND_CHANCE = 1 / 30;
/** วิ่งครบเท่านี้รอบแล้วยังไม่เจอ รอบถัดไปเจอแน่นอน กันคนที่ดวงไม่ดีจริง ๆ */
const FIND_PITY = 40;

/** ชื่อแนะนำตอนตั้งชื่อน้อง (ปุ่มสุ่มชื่อ) */
export const NAME_IDEAS = [
  'มะลิ', 'โมจิ', 'ข้าวปั้น', 'ถั่วแดง', 'ขนมปัง', 'ส้มโอ', 'มะพร้าว', 'ไข่ตุ๋น',
  'บัวลอย', 'น้ำผึ้ง', 'เมฆ', 'ดาว', 'ลูกชุบ', 'ทองหยิบ', 'มินต์', 'โกโก้',
  'ชาไทย', 'ซูชิ', 'วาฟเฟิล', 'พุดดิ้ง', 'นมเย็น', 'ข้าวตู', 'กะทิ', 'เผือก',
];

// ─────────────────────────────────────────────────────────────
// ที่เก็บ
// ─────────────────────────────────────────────────────────────

const PREF = 'cats';

function blank() {
  return { v: 1, list: [], finds: { since: 0, day: '', total: 0 }, toys: ['yarn'] };
}

/** อ่านก้อนข้อมูล — ทุกช่องที่หายหรือพังถูกเติมค่าตั้งต้น ไม่ปล่อยให้หน้าจอพังเพราะข้อมูลเก่า */
function load() {
  const raw = loadPref(PREF, null);
  const st = blank();
  if (!raw || typeof raw !== 'object') return st;
  if (Array.isArray(raw.list)) st.list = raw.list.filter((c) => c && c.id && c.breed).map(fixCat);
  if (raw.finds && typeof raw.finds === 'object') st.finds = { ...st.finds, ...raw.finds };
  if (Array.isArray(raw.toys)) st.toys = [...new Set(['yarn', ...raw.toys])];
  return st;
}

function fixCat(c) {
  const t = now();
  const need = {};
  for (const k of NEED_KEYS) {
    const v = c.need?.[k];
    need[k] = Array.isArray(v) && v.length === 2 ? [Number(v[0]) || 0, Number(v[1]) || t] : [70, t];
  }
  return {
    ...c,
    exp: Math.max(0, Number(c.exp) || 0),
    aff: Math.max(0, Math.min(AFF_MAX, Number(c.aff) || 0)),
    state: ['room', 'wait', 'grown'].includes(c.state) ? c.state : 'room',
    need,
  };
}

let state = load();

function save() {
  savePref(PREF, state);
}

/** ข้อมูลอาจถูกเทลงมาใหม่จากคลาวด์ (เข้าบัญชีอื่น) — หน้าจอเรียกก่อนเปิดห้องทุกครั้ง */
export function reloadCats() {
  state = load();
}

// ─────────────────────────────────────────────────────────────
// อ่าน
// ─────────────────────────────────────────────────────────────

export const allCats = () => state.list.slice();
export const roomCats = () => state.list.filter((c) => c.state === 'room');
export const waitingCats = () => state.list.filter((c) => c.state === 'wait');
export const grownCats = () => state.list.filter((c) => c.state === 'grown');
export const catById = (id) => state.list.find((c) => c.id === id) || null;
export const ownsToy = (id) => state.toys.includes(id);
export const breedOf = (id) => BREEDS.find((b) => b.id === id) || BREEDS[0];

/** ห้อง + กล่องฝากเต็มทั้งคู่ */
export function homeFull() {
  return roomCats().length >= ROOM_SLOTS && waitingCats().length >= WAIT_SLOTS;
}

/** ค่าความต้องการ ณ ตอนนี้ (0-100) */
export function needNow(cat, key, t = now()) {
  const [v, at] = cat.need[key];
  const hours = Math.max(0, t - at) / 3600000;
  return Math.max(0, Math.min(100, v - hours * NEEDS[key].perHour));
}

/** อารมณ์รวม = ค่าเฉลี่ยของสี่อย่าง — ต่ำกว่า 30 = เศร้า ได้ EXP ครึ่งเดียว */
export function moodOf(cat, t = now()) {
  let sum = 0;
  for (const k of NEED_KEYS) sum += needNow(cat, k, t);
  return sum / NEED_KEYS.length;
}
export const isSad = (cat, t) => moodOf(cat, t) < 30;

export function levelOf(cat) {
  let lv = 1;
  while (lv < GROWN_LV && cat.exp >= LV_EXP[lv + 1]) lv++;
  return lv;
}

/** หลอด EXP ของเลเวลปัจจุบัน */
export function expInfo(cat) {
  const lv = levelOf(cat);
  if (lv >= GROWN_LV) return { lv, into: 1, need: 1, ratio: 1, maxed: true };
  const from = LV_EXP[lv];
  const need = LV_EXP[lv + 1] - from;
  const into = cat.exp - from;
  return { lv, into, need, ratio: into / need, maxed: false };
}

/** EXP ที่ยังได้อีกวันนี้ */
export function expLeftToday(cat) {
  const today = dayKey();
  return cat.expDay === today ? Math.max(0, DAY_EXP_CAP - (cat.expToday || 0)) : DAY_EXP_CAP;
}

/**
 * วัยของน้องตามเลเวล — หน้าตาเปลี่ยนเป็นช่วง ๆ ไม่ใช่ค่อย ๆ โตทีละนิด
 *   baby   Lv1-2  ลูกแมว: ตัวกลมป้อม หัวโตมาก ตาโต หูเล็กมน ขาสั้น หางสั้น มีขนปุยบนหัว
 *   young  Lv3-4  วัยรุ่น: ตัวยืด ขายาวขึ้น หูใหญ่ (แมววัยรุ่นจริงหูโตกว่าตัว)
 *   null   Lv5    โตเต็มวัย หน้าตาเดียวกับแมวทุกตัวในเกม
 * วาดจากโมเดลเดียวกันทุกวัย (ดู s.age ใน render/entities.js) น้องจึงใส่ชุด ทำท่า
 * และเปลี่ยนสีได้ทุกเลเวล โดยไม่ต้องมีภาพแยก
 */
export function ageOf(lv) {
  if (lv <= 2) return 'baby';
  if (lv < GROWN_LV) return 'young';
  return null;
}

/** ขนาดตัวเทียบตัวโตเต็มวัย ตามวัย */
export function sizeOf(lv) {
  const age = ageOf(lv);
  return age === 'baby' ? 0.62 : age === 'young' ? 0.82 : 1;
}

/** ความผูกพันเป็นหัวใจ 0-5 ดวง */
export const heartsOf = (cat) => Math.floor((cat.aff || 0) / (AFF_MAX / 5));

// ─────────────────────────────────────────────────────────────
// ดูแล
// ─────────────────────────────────────────────────────────────

/**
 * ทำได้ไหม และถ้าทำแล้วจะได้ EXP ไหม
 * กดได้เสมอ (น้องชอบให้ดูแล) แต่ EXP นับเฉพาะตอนที่ความต้องการลดลงจริง
 */
export function careInfo(cat, act, t = now()) {
  const a = ACTIONS[act];
  const v = needNow(cat, a.need, t);
  const wants = v < a.below;
  return { value: v, wants, full: v >= 99, expLeft: expLeftToday(cat) };
}

/**
 * ดูแลหนึ่งครั้ง — ไม่หักทองในนี้ (เรื่องเงินเป็นของ gacha.js ที่เดียว ผู้เรียกหักเอง)
 * @param extra.aff ความผูกพันที่ได้จากของที่ใช้ (อาหาร/ของเล่น)
 * คืน { exp, aff, before, after, grew } — grew = เพิ่งถึง Lv5 ต้องฉลองแล้วย้ายไปหน้าแรก
 */
export function care(id, act, extra = {}) {
  const cat = catById(id);
  const a = ACTIONS[act];
  if (!cat || !a || cat.state !== 'room') return null;
  const t = now();
  const today = dayKey(t);
  const before = levelOf(cat);

  let exp = 0;
  if (needNow(cat, a.need, t) < a.below) {
    if (cat.expDay !== today) { cat.expDay = today; cat.expToday = 0; }
    const raw = isSad(cat, t) ? Math.ceil(a.exp / 2) : a.exp;
    exp = Math.min(raw, DAY_EXP_CAP - cat.expToday);
    cat.expToday += exp;
    cat.exp += exp;
  }
  cat.need[a.need] = [100, t];

  const aff = Math.min(AFF_MAX - cat.aff, (extra.aff || 1));
  cat.aff += aff;

  const after = levelOf(cat);
  save();
  return { exp, aff, before, after, grew: after >= GROWN_LV && before < GROWN_LV };
}

/** ลูบตัวน้อง — ได้ความผูกพันนิดหน่อย วันละไม่เกิน PET_AFF_DAY */
export function petCat(id) {
  const cat = catById(id);
  if (!cat) return 0;
  const today = dayKey();
  if (cat.petDay !== today) { cat.petDay = today; cat.petToday = 0; }
  if (cat.petToday >= PET_AFF_DAY || cat.aff >= AFF_MAX) return 0;
  cat.petToday++;
  cat.aff++;
  save();
  return 1;
}

export function renameCat(id, name) {
  const cat = catById(id);
  const clean = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 16);
  if (!cat || !clean) return false;
  cat.name = clean;
  save();
  return true;
}

/** ได้ของเล่นชิ้นใหม่ (หักทองแล้วจากผู้เรียก) */
export function unlockToy(id) {
  if (!TOYS.some((x) => x.id === id) || ownsToy(id)) return;
  state.toys.push(id);
  save();
}

/**
 * ย้ายน้องที่ถึง Lv5 ไปหน้าแรก แล้วรับน้องจากกล่องฝากเข้าห้องแทน
 * คืนน้องที่เพิ่งย้ายเข้าห้อง (ถ้ามี) ให้หน้าจอบอกผู้เล่น
 */
export function graduate(id) {
  const cat = catById(id);
  if (!cat || levelOf(cat) < GROWN_LV || cat.state === 'grown') return null;
  cat.state = 'grown';
  cat.grownAt = now();
  const moved = promoteWaiting();
  save();
  return moved;
}

/**
 * จัดบ้านให้เรียบร้อยตอนเปิดห้อง — น้องที่ถึง Lv5 ค้างอยู่ (เช่นปิดแอปกลางฉากฉลอง)
 * ย้ายไปหน้าแรก แล้วรับน้องจากกล่องฝากเข้าห้องถ้ามีที่ว่าง
 * คืน { grown, moved } ให้หน้าจอบอกผู้เล่น
 */
export function settleHome() {
  const grown = [];
  for (const c of roomCats()) {
    if (levelOf(c) >= GROWN_LV) {
      c.state = 'grown';
      c.grownAt = now();
      grown.push(c);
    }
  }
  const moved = promoteWaiting();
  if (grown.length || moved) save();
  return { grown, moved };
}

/** ห้องมีที่ว่าง = รับน้องที่รออยู่ในกล่องเข้ามา */
function promoteWaiting() {
  const w = waitingCats()[0];
  if (!w || roomCats().length >= ROOM_SLOTS) return null;
  w.state = 'room';
  // นาฬิกาความต้องการเริ่มนับใหม่ตอนเข้าห้อง ไม่ใช่ตอนที่พบ — ช่วงที่รออยู่ในกล่อง
  // น้องส้มดูแลให้อยู่ ถ้านับต่อจากวันที่พบ น้องจะเข้าห้องมาพร้อมความหิวเต็มหลอด
  const t = now();
  for (const k of NEED_KEYS) w.need[k] = [70, t];
  return w;
}

// ─────────────────────────────────────────────────────────────
// พบน้องระหว่างวิ่ง
// ─────────────────────────────────────────────────────────────

/**
 * รอบนี้กล่องจะโผล่ไหม — ถามครั้งเดียวตอนเริ่มวิ่ง
 * กล่องแรกการันตีเมื่อถึงเลเวล FIND_LEVEL / วันละไม่เกินหนึ่งกล่อง / มีการันตีสะสม
 */
export function rollFind(playerLv) {
  if (playerLv < FIND_LEVEL || homeFull()) return false;
  const f = state.finds;
  if (f.day === dayKey()) return false;
  if (!f.total) return true;
  if ((f.since || 0) >= FIND_PITY) return true;
  return Math.random() < FIND_CHANCE;
}

/** จบรอบโดยไม่ได้พบน้อง — นับเข้าการันตีสะสม */
export function noteRunNoFind(playerLv) {
  if (playerLv < FIND_LEVEL) return;
  state.finds.since = (state.finds.since || 0) + 1;
  save();
}

/** สุ่มสายพันธุ์ตามน้ำหนัก — สุ่มตั้งแต่ตอนวางกล่อง ลูกแมวที่วิ่งตามจะได้สีตรงกับตัวที่ได้จริง */
export function rollBreed() {
  const sum = BREEDS.reduce((s, b) => s + b.w, 0);
  let r = Math.random() * sum;
  for (const b of BREEDS) {
    r -= b.w;
    if (r < 0) return b.id;
  }
  return BREEDS[0].id;
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * พบน้องในกล่อง — สร้างน้องตัวใหม่ (ยังไม่มีชื่อ หน้าจอจะถามชื่อทีหลัง)
 * @param where { stage, stageName } ด่านที่พบ ใช้เขียนเรื่องราวตอนแรกของน้อง
 * คืน null ถ้าห้องกับกล่องเต็ม (ไม่ควรเกิด เพราะกล่องไม่โผล่ตอนเต็ม แต่กันไว้)
 */
export function adoptFound(where = {}, pre = {}) {
  if (homeFull()) return null;
  const t = now();
  const need = {};
  // มาถึงแบบหิวนิด ๆ ง่วงหน่อย ตัวมอมแมม — การดูแลครั้งแรกได้ EXP ทันทีทุกอย่าง
  for (const k of NEED_KEYS) need[k] = [k === 'clean' ? 40 : 55, t];
  const cat = {
    id: newId(),
    breed: BREEDS.some((b) => b.id === pre.breed) ? pre.breed : rollBreed(),
    sex: pre.sex === 'm' || pre.sex === 'f' ? pre.sex : (Math.random() < 0.5 ? 'm' : 'f'),
    name: '',
    foundAt: t,
    where: { stage: where.stage || '', stageName: where.stageName || '' },
    from: null,
    exp: 0,
    aff: 0,
    need,
    state: roomCats().length < ROOM_SLOTS ? 'room' : 'wait',
    seed: Math.floor(Math.random() * 1e6),
  };
  state.list.push(cat);
  state.finds = { since: 0, day: dayKey(t), total: (state.finds.total || 0) + 1 };
  save();
  return cat;
}

/** ชื่อที่จะโชว์ — ยังไม่ได้ตั้งชื่อใช้คำเรียกกลาง ๆ */
export const nameOf = (cat) => cat?.name || 'น้องใหม่';

// ─────────────────────────────────────────────────────────────
// เรื่องราว
// ─────────────────────────────────────────────────────────────

const STORY_LOCKED = 'ยังไม่ปลดล็อก — น้องจะเล่าให้ฟังเมื่อสนิทกันมากขึ้น';

/**
 * เรื่องของน้องห้าตอน ปลดตอนละเลเวล
 * ตอนแรกเขียนจากเหตุการณ์จริง (ด่านที่พบ วันที่พบ) ทุกตัวจึงมีที่มาของตัวเองโดยไม่ต้องเขียนเพิ่ม
 * ตอนที่สองถึงห้ายังไม่มีเนื้อเรื่อง — รอคลังเรื่องที่กำลังเขียน
 */
export function storyOf(cat, fmtDate = (ms) => new Date(ms).toLocaleDateString('th-TH')) {
  const lv = levelOf(cat);
  const where = cat.where?.stageName || 'ริมทาง';
  const first = cat.from
    ? `ได้รับน้องมาจาก ${cat.from} ที่ช่วยน้องไว้ก่อนหน้านี้ เมื่อวันที่ ${fmtDate(cat.foundAt)}`
    : `พบน้องอยู่ในกล่องกระดาษใบเก่าระหว่างวิ่งผ่าน${where} เมื่อวันที่ ${fmtDate(cat.foundAt)} `
      + 'ตัว\u2060สั่นนิด ๆ แต่ยังร้องเมี้ยวทักทายเสียงเบา ๆ';
  const out = [{ n: 1, open: true, text: first }];
  for (let n = 2; n <= GROWN_LV; n++) {
    out.push({ n, open: lv >= n, text: lv >= n ? 'เรื่องราวตอนนี้กำลังเขียนอยู่ เร็ว ๆ นี้นะ' : STORY_LOCKED });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// เครื่องมือทดสอบ (แผงดีบัก) — ไม่มีทางเรียกจากหน้าจอปกติ
// ─────────────────────────────────────────────────────────────

/** ย้อนเวลาของน้องทุกตัวไป h ชั่วโมง = เหมือนเวลาผ่านไป h ชั่วโมง */
export function debugAge(hours) {
  const ms = hours * 3600000;
  for (const c of state.list) {
    for (const k of NEED_KEYS) c.need[k][1] -= ms;
    if (c.expDay) c.expDay = '';
  }
  save();
}

/** เพิ่ม EXP ตรง ๆ (ข้ามเพดานรายวัน) */
export function debugExp(id, n) {
  const cat = catById(id);
  if (!cat) return null;
  const before = levelOf(cat);
  cat.exp += n;
  save();
  const after = levelOf(cat);
  return { before, after, grew: after >= GROWN_LV && before < GROWN_LV };
}

/** ล้างวันที่พบล่าสุด = รอบหน้ากล่องโผล่แน่นอน */
export function debugForceFind() {
  state.finds.day = '';
  state.finds.since = FIND_PITY;
  save();
}

/** พบน้องทันทีโดยไม่ต้องวิ่ง */
export function debugAdopt() {
  const c = adoptFound({ stage: '', stageName: 'สวนหลังบ้าน' });
  if (c) state.finds.day = '';
  save();
  return c;
}

/** ล้างน้องทั้งหมด */
export function debugClearCats() {
  state = blank();
  save();
}
