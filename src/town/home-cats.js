// src/town/home-cats.js
// ─────────────────────────────────────────────────────────────
// น้องแมวเด็กในห้องเลี้ยง (ผู้ใช้ 14 พ.ย. 2026: "เอาน้องแมวเด็กที่วาดลงเกมจริง ให้เดินเล่นในห้องแบบดูธรรมชาติ")
//
// ใคร: น้องในห้องเลี้ยงจริงของผู้เล่น (cats.js roomCats — state 'room') · วาดด้วยน้องจิบิ (render/chibi.js)
//   สีตามสายพันธุ์ (สีเก่าเทียบสีใหม่ BREED_LOOK) · ขนาดตามวัย: ลูกแมว Lv1–2 เล็ก · วัยรุ่น Lv3–4 ใหญ่ขึ้น (cats.js sizeOf)
//   ทดสอบไม่มีน้อง: ?kits=5 = น้องตัวอย่าง (ไม่บันทึก)
//
// เดินตรงไหน (ผู้ใช้ 15 พ.ย. 2026 "ไม่เดินเหยียบสิ่งของ ให้เดินตรงพื้น"):
//   เลนเดินอยู่ "หน้า" ฐานเฟอร์นิเจอร์ (GY + LANES — เส้น GY คือแนวที่ของทุกชิ้นตั้งอยู่) จึงไม่ทับของ
//   จะไปที่นอน/ชาม/ม้านั่ง = เดินตามเลนไปถึงหน้าที่นั้นก่อน แล้วค่อยก้าวเฉียงเข้าไป (ny) · ลุกออก = ก้าวกลับมาที่เลน
//
// ทำอะไร (สุ่มต่อกันไปเรื่อย ๆ ทีละตัว ไม่พร้อมกัน — ดู pick()):
//   คนเดียว: เดินเล่น (ท่าเดิน 4 จังหวะ เท้าไม่ไถล) · ยืนมองรอบ ๆ / ร้องเหมียว / หาว · นั่งพัก
//     ไปนอนที่ที่นอน (จองที่ ไม่แย่งกัน) · ไปนั่งกินข้างชาม · กระโดดขึ้นม้านั่งริมหน้าต่างไปนั่งดูวิว (หันหลัง)
//   กับเพื่อน (ผู้ใช้ 15 พ.ย. "มีปฏิกิริยากันมากกว่านี้"):
//     วิ่งไล่จับ (chase/flee — ตัวหนึ่งไล่ อีกตัววิ่งหนี กลับตัวที่ขอบห้อง จับได้ = หันหน้าชนกัน หัวใจลอย)
//     เดินไปทัก (approach — เพื่อนที่นั่งอยู่หันมารอ ถึงแล้วเอาหน้าชนกัน ร้องเหมียว)
//   กับผู้เล่น:
//     เดินมาใกล้ = หันมามอง · เดินมาหาแล้วร้องเหมียว มีหัวใจลอย (visit/greet)
//     เดินตามต้อย ๆ ตอนผู้เล่นเดินผ่าน (follow — หยุดเมื่อผู้เล่นหยุด แล้วนั่งมอง)
//     ผู้เล่นกระโดดใกล้ ๆ = สะดุ้งกระโดดตัวลอยแล้วหันมามอง (startle)
//   น้องที่หิว/ง่วง (cats.js needNow) ไปชาม/ที่นอนบ่อยขึ้น
// ชามอาหาร (ผู้ใช้ 15 พ.ย. 2026 — หน้าเทอาหาร town/feed.js): ชามใบละตัว ผูกถาวร (cats.js bowlCats · k.bowl)
//   น้องกินเฉพาะชามตัวเอง · เทอาหารแล้ว (callToBowl) = ร้องเหมียววิ่งจู๊ดมากินทันที (ท่าวิ่งของ chibi-acts) อาหารในชามค่อย ๆ หมด แล้วชามว่าง (eatDish)
// อาบน้ำ (ผู้ใช้ 15 พ.ย. — town/bath.js เลือกน้อง → callToTub): วิ่งไปข้างอ่าง กระโดดลงไปนั่งแช่ ฟองแชมพูฟูบนหัว โยกตัว ฟองลอย
//   สะบัดหัว → กระโดดออก สะบัดตัวไล่น้ำ ประกายวิ้ง = อาบเสร็จ (cats.js care 'bathe') · อ่างใช้ได้ทีละตัว
// คอนโดแมว: เดินไปข้างบันได กระโดดขึ้นเบาะทีละชั้น (สุ่มว่าขึ้นถึงชั้นไหน) นั่งพักบนเบาะ แล้วกระโดดลงทีละชั้น (จองเบาะ ไม่แย่งกัน)
// ตำแหน่งที่นอน/ชาม/ม้านั่ง มาจาก home.js (NURSE_SPOTS) — ชุดของแต่ละแบบห้อง (โล่ง/เริ่มต้น/ครบ)
// ─────────────────────────────────────────────────────────────
import { GY } from './layout.js';
import { drawChibi, chibiLookFor, CHIBI_INK } from '../render/chibi.js';
import { roomCats, levelOf, sizeOf, nameOf, needNow, bowlCats, dishOf, eatDish, catById, fillRoom, care, petCat } from '../cats.js';
import { foamHead, foam, bubble, puff, sparkle, chibiRunPose, drawChibiAct, jumpSquash } from '../render/chibi-acts.js';
import { NURSE_SPOTS, BOWL_TOP, drawNurseBowl, bedCave, litterDoor, drawNurseWater } from './home.js';
import { label } from './castle-hall.js';
import { heart } from './world.js';

const TAU = Math.PI * 2;
/** สีขนเก่าในกล่อง → สีน้องจิบิที่ลงไว้แล้ว */
const BREED_LOOK = { tabby: 'salid', midnight: 'konja', grey: 'korat', snow: 'manee' };
const KID_K = 0.11;            // เท่าน้องจิบิในเกม (cat2.js drawChibiAs2): หน่วยชีท → ×SC
const STRIDE = 30;             // หน่วยชีทต่อหนึ่งจังหวะเดิน (ท่าเดิน 4 จังหวะ)
const BEAT = 12;               // เฟรมต่อจังหวะ — ก้าวถี่แบบลูกแมวขาสั้น
// เลนเดินของแต่ละตัว = ระยะหน้าเส้นฐานเฟอร์นิเจอร์ (GY) · ห่างกันพอไม่ยืนทับกัน · ไม่ลึกเกิน (มือถือแถบปุ่มล่างบัง)
const LANES = [18, 30, 12, 36, 24];
const RUN = 1.9;               // วิ่งไล่ = เร็วกว่าเดิน (ก้าวถี่ขึ้นตามความเร็ว เท้ายังไม่ไถล)
const DASH = 11;
const BED_EDGE = 44;            // ระยะยืนข้างที่นอนก่อนกระโดดขึ้น (ที่นอนกว้างสุด ~80)                // วิ่งจู๊ดไปกินข้าว/อาบน้ำ (ผู้ใช้ 15 พ.ย.: "เร็วหน่อย ไม่ต้องช้ามาก") — ข้ามห้องราว 10 วิ
const DASH_STRIDE = 2.4;       // ก้าววิ่งยาวกว่าก้าวเดิน (ขาไม่ปั่นถี่เกิน)
const DEMO = [['pearl', 1, 'ไข่มุก'], ['calico', 2, 'ขนมชั้น'], ['tabby', 3, 'ลายจุด'], ['snow', 1, 'มณี'], ['wilat', 4, 'วิลาศ']];

const rnd = (a, b) => a + Math.random() * (b - a);
const pickW = (list) => { const s = list.reduce((a, [, w]) => a + w, 0); let r = Math.random() * s; for (const [v, w] of list) if ((r -= w) <= 0) return v; return list[0][0]; };
/**
 * เลนเดิน (ระยะจากผนังหลัง) — ผ่านหน้าน้ำพุแมว = หลบลงมาเลนหน้า (ผู้ใช้ 16 พ.ย.: "อย่าให้เดินเหยียบที่กินน้ำ")
 * น้ำพุชิดผนัง ขอบล่างแค่ GY+8 — เลนหลัง (12–24) เท้าทับฐานน้ำพุพอดี ดูเหมือนยืนบนน้ำพุ
 */
const FOUNT_CLEAR = 40, FOUNT_HALF = 62;
const laneY = (k) => {
  const W = NURSE_SPOTS.water, y = GY + k.lane;
  return W && Math.abs(k.x - W.x) < FOUNT_HALF && y < GY + FOUNT_CLEAR ? GY + FOUNT_CLEAR : y;
};
const clampX = (x) => Math.max(NURSE_SPOTS.roam[0], Math.min(NURSE_SPOTS.roam[1], x));
/** หน้าตาน้องจิบิตามสายพันธุ์ (หน้าเทอาหารใช้วาดรูปน้องบนชาม) */
export const kitLook = (c) => chibiLookFor(BREED_LOOK[c.breed] || c.breed);
/** อาหารในชามของน้องตัวนี้ (ตัวอย่าง ?kits เก็บในตัวเอง ไม่บันทึก) */
export const kitDish = (k) => (k.cat.demoLv ? (k.dish && !k.dish.eaten ? k.dish : null) : dishOf(catById(k.cat.id)));
const bowlSpot = (k) => (k.bowl != null ? NURSE_SPOTS.bowls[k.bowl] || null : null);
/** จุดนั่งกินของชาม: ฝั่งซ้ายของชาม หันขวาเข้าหาชาม (ชามห่างกัน 40 — กินพร้อมกันได้ทุกตัวไม่ทับกัน) */
const EAT_DX = -17;

/** สร้างน้องในห้อง · SC = ขนาดตัวผู้เล่นในเมือง */
export function createKittens(SC) {
  let list = [];
  try { fillRoom(); list = roomCats(); } catch { list = []; }   // น้องที่รออยู่ย้ายเข้าห้องจนเต็ม 5 ช่องก่อน
  const q = new URLSearchParams(location.search).get('kits');
  if (!list.length && q) {
    list = DEMO.slice(0, Math.max(1, Math.min(5, +q || 5))).map(([breed, lv, name], i) => ({ id: 'demo' + i, breed, name, demoLv: lv }));
  }
  const S = NURSE_SPOTS;
  let owners = [];
  try { owners = list.length && !list[0].demoLv ? bowlCats() : []; } catch { owners = []; }
  return list.slice(0, 5).map((c, i) => {
    const bi = c.demoLv ? i : owners.findIndex((o) => o && o.id === c.id);
    const bowl = bi >= 0 && bi < S.bowls.length ? bi : null;   // ห้องมีชามน้อยกว่า (ชุดเริ่มต้น) = บางตัวยังไม่มีชาม
    const lv = c.demoLv || levelOf(c);
    const k = KID_K * SC * (sizeOf(lv) / sizeOf(1));
    const x = rnd(S.roam[0] + 60, S.roam[1] - 60);
    const lane = LANES[i % LANES.length];
    return {
      cat: c, name: c.name || nameOf(c), look: chibiLookFor(BREED_LOOK[c.breed] || c.breed), k, lane,
      x, y: GY + lane, dir: Math.random() < 0.5 ? -1 : 1,
      st: 'idle', t: 0, dur: rnd(30, 140), tx: x, ty: null, spot: null, ph: 0, tOff: Math.floor(Math.random() * 900),
      hop: null, other: null, mul: 1, hearts: [], seen: 0, cool: 0, meowT: -1, bowl, dish: null, eatK: 0,
      run: false, route: null, routeEnd: null, wantBath: false, bathing: false,
    };
  });
}

/** ที่นอน/ที่นั่งที่ตัวอื่นจองแล้ว */
const taken = (kits, me, spot) => kits.some((o) => o !== me && o.spot && o.spot.x === spot.x && o.spot.y === spot.y);
/** ว่างพอให้ชวนเล่น (ไม่ได้นอน กิน นั่งหน้าต่าง หรือเล่นกับตัวอื่นอยู่) */
const FREE = new Set(['idle', 'sit', 'look', 'walk']);
/** อ่างไม่ว่าง = มีตัวที่ถูกเรียกไปอาบ/กำลังอาบ/กำลังสะบัดตัวอยู่ */
export const tubBusy = (kits) => kits.some((o) => o.wantBath || o.bathing);
// เสียงกิจกรรมของน้อง (ผู้ใช้ 15 พ.ย. 2026: กินข้าว อาบน้ำ กระโดด) — main.js ตั้งตัวเล่นเสียง (เล่นเฉพาะน้องที่อยู่ในจอ)
let SOUND = null;
const lastSnd = {};
export function setKitSound(fn) { SOUND = fn; }
/** เล่นเสียงหนึ่งครั้ง (เสียงเดียวกันห่างกันอย่างน้อย gap เฟรม — 5 ตัวทำพร้อมกันไม่ดังซ้อนจนหนวกหู) */
function snd(name, k, gap = 6, ...args) {
  if (!SOUND) return;
  const now = performance.now() / 16.7;
  if (now - (lastSnd[name] ?? -1e9) < gap) return;
  lastSnd[name] = now;
  SOUND(name, k.x, ...args);
}
/** ข้ามจังหวะ q (เฟรม) ระหว่างเฟรมนี้กับเฟรมก่อน */
const crossed = (t, dt, at) => t >= at && t - dt < at;
/** สถานะที่วาดด้วยรวมท่า (act 'auto' — มีร้องเหมียว/หาวแทรกเอง) */
const AUTO_ST = new Set(['idle', 'sit', 'look', 'wait', 'sniff', 'perch', 'step', 'shelfsit']);
const freeMate = (k, o) => o !== k && FREE.has(o.st) && !o.other && !o.spot && o.ty == null && Math.abs(o.y - laneY(o)) < 1;

function need(k, key) { try { return k.cat.demoLv ? 70 : needNow(k.cat, key); } catch { return 70; } }

// ── ตัวช่วยเปลี่ยนสถานะ ──
/** เดินไป x (ตามเลน) · ny = ระดับเท้าปลายทาง (ก้าวเฉียงเข้าไปช่วงท้าย) · then = ทำอะไรต่อเมื่อถึง */
function goTo(k, x, then, ny = null, mul = 1, run = false) {
  k.st = 'walk'; k.tx = clampX(x); k.ty = ny; k.then = then; k.t = 0; k.mul = mul; k.run = run;
  // ไปกินข้าว/ดื่มน้ำ (ที่นั่งอยู่หลังชาม/หลังน้ำพุ): เดินตามเลนไปถึงหน้าที่ก่อน แล้วกระโดดเข้าไป — ไม่เดินทะลุชาม/น้ำพุ (ผู้ใช้ 16 พ.ย.)
  k.hopY = null;
  if ((then === 'eat' || then === 'drink') && ny != null) { k.hopY = ny; k.ty = null; }
  if (Math.abs(k.tx - k.x) > 1) k.dir = k.tx > k.x ? 1 : -1;
}
function rest(k, st, dur) { k.st = st; k.t = 0; k.dur = dur; k.mul = 1; k.run = false; }
/** กระโดดโค้ง · กระโดดจริงจัง (สูง) = ย่อตัวก่อนดีด 9 เฟรม (ท่ากระโดดของ chibi-acts) · ลงแล้วตัวยุบเด้ง (k.land) */
function hopTo(k, x1, y1, h, dur, next) { k.st = 'hop'; k.t = 0; k.hop = { x0: k.x, y0: k.y, x1, y1, h, dur, next, pre: h > 15 ? 13 : h > 10 ? 8 : 0 }; }
const hopU = (k) => Math.max(0, Math.min(1, (k.t - k.hop.pre) / k.hop.dur));
function addHeart(k) { k.hearts.push({ t: 0, x: rnd(-6, 6) }); }
function face(k, x) { if (Math.abs(x - k.x) > 1) k.dir = x > k.x ? 1 : -1; }
/** จบการเล่นคู่ — ทั้งสองตัวหันหน้าชนกัน ร้องเหมียว หัวใจลอย แล้วแยกย้าย */
function meet(a, b) {
  for (const [p, q] of [[a, b], [b, a]]) {
    p.st = 'meet'; p.t = 0; p.dur = rnd(110, 160); p.other = q; p.mul = 1; p.tx = p.x; p.ty = null;
    face(p, q.x); addHeart(p);
  }
  a.meowT = 0; b.meowT = 40;
}
/** ปล่อยจากคู่เล่น */
function unpair(k) { const o = k.other; k.other = null; if (o && o.other === k) o.other = null; }

/**
 * ก้าวหนึ่งเฟรมไปทาง (tx, ty) — เดินตามเลนก่อน เหลือ ~40 หน่วยค่อยก้าวเฉียงเข้าไปหา ty
 * คืน true = ถึงแล้ว · ความเร็ว = ระยะก้าวตามจังหวะท่าเดิน (เท้าไม่ไถล) × mul
 */
function walkStep(k, dt) {
  const sp = ((STRIDE * k.k) / BEAT) * k.mul;
  const d = k.tx - k.x, step = Math.min(Math.abs(d), sp * dt);
  k.x += Math.sign(d) * step;
  if (step > 0.05) k.dir = Math.sign(d);
  const goal = k.ty ?? laneY(k);
  const wantY = k.ty != null && Math.abs(d) > 40 ? laneY(k) : goal;
  const dy = wantY - k.y, sy = Math.min(Math.abs(dy), sp * 0.75 * dt);
  k.y += Math.sign(dy) * sy;
  k.ph += (step + sy) / (STRIDE * k.k * (k.run ? DASH_STRIDE : 1));
  return Math.abs(k.tx - k.x) < 0.5 && Math.abs(goal - k.y) < 0.5;
}

/** เลือกกิจกรรมถัดไป (สุ่มถ่วงน้ำหนักตามความหิว/ง่วง/เพื่อน/ผู้เล่น) */
function pick(k, kits, P) {
  const S = NURSE_SPOTS;
  k.useWater = false; k.useLitter = false;   // เลิกจองน้ำพุ/ห้องน้ำ (เลือกใหม่ได้ข้างล่าง)
  // ยังอยู่ในที่ (ที่นอน/ข้างชาม) → ก้าวกลับออกมาที่เลนก่อน
  // อยู่บนที่นอน → กระโดดลงข้างที่นอน (ฝั่งที่ใกล้ห้องมากกว่า) แล้วค่อยเลือกต่อ
  if (k.inBed) {
    const b = k.inBed; k.inBed = null; k.spot = null;
    const side = b.x + BED_EDGE > S.roam[1] ? -1 : b.x - BED_EDGE < S.roam[0] ? 1 : Math.random() < 0.5 ? -1 : 1;
    face(k, b.x + side * BED_EDGE);
    hopTo(k, b.x + side * BED_EDGE, laneY(k), 16, 22, 'pick');
    return;
  }
  // นั่งอยู่หลังชาม/หลังน้ำพุ (กินข้าว ดมชาม ดื่มน้ำเสร็จ) → กระโดดออกมาที่เลน ไม่เดินทะลุของ (ผู้ใช้ 16 พ.ย.)
  if (k.y < laneY(k) - 6) {
    k.spot = null;
    const x1 = clampX(k.x + rnd(-10, 10));
    face(k, x1 + (Math.random() < 0.5 ? -1 : 1));
    hopTo(k, x1, laneY(k), k.y < GY - 10 ? 18 : 14, 20, 'outpick');   // ลงแล้ว (ไม่มีชื่อในตาราง) = เลือกกิจกรรมต่อ
    return;
  }
  if (Math.abs(k.y - laneY(k)) > 1) { k.spot = null; goTo(k, k.x + rnd(-24, 24), kitDish(k) || k.wantBath ? 'hurry' : 'idle', laneY(k)); return; }   // มีอาหาร/ถูกเรียกอาบน้ำ = ก้าวออกมาแล้วไปต่อทันที
  unpair(k);
  const freeBeds = S.beds.filter((b) => !taken(kits, k, b));
  // ถูกเรียกไปอาบน้ำ = วิ่งจู๊ดไปข้างอ่าง (ก่อนอย่างอื่น)
  if (k.wantBath && S.tub) { k.wantBath = false; k.bathing = true; goTo(k, S.tub.out, 'tub', null, DASH, true); return; }
  const myBowl = bowlSpot(k), fed = !!kitDish(k);
  if (myBowl && fed) { k.spot = myBowl; goTo(k, myBowl.x, 'eat', GY - 2, Math.abs(myBowl.x - k.x) > 60 ? DASH : 1.6, Math.abs(myBowl.x - k.x) > 60); return; }   // มีอาหารในชาม = วิ่งจู๊ดไปนั่งหลังชามตัวเองก่อนเสมอ
  const seatFree = S.seat && S.seat.spots.filter((b) => !taken(kits, k, b));
  const mates = kits.filter((o) => freeMate(k, o) && Math.abs(o.x - k.x) < 420);   // ชวนเฉพาะเพื่อนที่อยู่ไม่ไกล (ไกลไป = อีกตัวนั่งรอนาน)
  const dP = Math.abs(P.x - k.x);
  const sleepy = need(k, 'sleep') < 45, hungry = need(k, 'food') < 45;
  const what = pickW([
    ['walk', 34], ['idle', 16], ['sit', 14], ['jumpplay', 7],   // กระโดดเล่นดีใจอยู่กับที่ (ท่ากระโดดใน cat-lab)
    ...(freeBeds.length ? [['bed', sleepy ? 26 : 8]] : []),
    ...(myBowl && fed ? [['bowl', 400]] : myBowl ? [['bowl', hungry ? 10 : 3]] : []),   // มีอาหารในชาม = ไปกินก่อนอย่างอื่น · ชามว่าง = แวะไปดม
    ...(seatFree?.length ? [['window', 6]] : []),
    ...(S.condo && S.condo.perches.some((p) => !taken(kits, k, p)) ? [['climb', 9]] : []),   // คอนโดมีเบาะว่าง = ไปปีนเล่น
    ...(S.shelves && !kits.some((o) => o !== k && o.parkour) ? [['shelves', 7]] : []),   // ไต่ชั้นผนัง → เปลญวน (ทีละตัว)
    ...(S.water && !kits.some((o) => o !== k && o.useWater) ? [['drink', need(k, 'water') < 45 ? 22 : 5]] : []),   // ดื่มน้ำที่น้ำพุแมว
    ...(S.litter && !kits.some((o) => o !== k && o.useLitter) ? [['litter', 4]] : []),   // เข้าห้องน้ำแมว
    ...(mates.length ? [['chase', 9], ['approach', 9]] : []),
    ...(dP < 360 ? [['visit', 7]] : []),
    ...(dP < 300 && P.moving ? [['follow', 14]] : []),
  ]);
  k.spot = null;
  if (what === 'walk') {
    const span = rnd(70, 300) * (Math.random() < 0.5 ? -1 : 1);
    goTo(k, k.x + span, Math.random() < 0.5 ? 'idle' : 'sit');
  } else if (what === 'idle') rest(k, 'idle', rnd(80, 220));
  else if (what === 'sit') rest(k, 'sit', rnd(180, 480));
  else if (what === 'jumpplay') rest(k, 'jumpplay', 128);
  else if (what === 'bed') {   // เดินไปข้างที่นอนบนพื้น แล้วกระโดดขึ้น (ผู้ใช้ 15 พ.ย.: ไม่เดินเหยียบตะกร้า/ที่นอน)
    const b = freeBeds[Math.floor(Math.random() * freeBeds.length)]; k.spot = b;
    goTo(k, b.x + (k.x < b.x ? -1 : 1) * BED_EDGE, 'bedhop');
  }
  else if (what === 'bowl') { k.spot = myBowl; goTo(k, myBowl.x, 'eat', GY - 2); }   // ชามว่าง = แวะไปดม
  else if (what === 'climb') goTo(k, S.condo.base, 'climb');
  else if (what === 'shelves') { k.parkour = true; goTo(k, S.shelves.start, 'shelfgo'); }
  else if (what === 'drink') { k.useWater = true; goTo(k, S.water.stand, 'drink', S.water.sy); }
  else if (what === 'litter') { k.useLitter = true; goTo(k, S.litter.x, 'litter', GY + 3); }
  else if (what === 'window') { const b = seatFree[Math.floor(Math.random() * seatFree.length)]; k.spot = b; goTo(k, b.x, 'hopup'); }
  else if (what === 'visit') goTo(k, P.x + (k.x < P.x ? -46 : 46), 'greet');
  else if (what === 'follow') { k.st = 'follow'; k.t = 0; k.dur = rnd(300, 620); k.fOff = rnd(36, 70) * (k.x < P.x ? -1 : 1); k.mul = 1; }
  else {
    const o = mates[Math.floor(Math.random() * mates.length)];
    k.other = o; o.other = k;
    if (what === 'chase') {
      // ตัวนี้ไล่ เพื่อนวิ่งหนี (หันหนีไปทางที่ห่างจากตัวไล่)
      k.st = 'chase'; k.t = 0; k.dur = rnd(150, 260); k.mul = RUN; k.ty = null;
      o.st = 'flee'; o.t = 0; o.mul = RUN * 0.88; o.ty = null; o.dir = o.x >= k.x ? 1 : -1;
      if (Math.random() < 0.5) { k.meowT = 0; }
    } else {
      // เดินไปทัก — เพื่อนหันมารอ
      goTo(k, o.x + (k.x < o.x ? -1 : 1) * 100 * (k.k + o.k), 'nuzzle');   // หยุดห่างพอให้หน้าเกือบชนกัน (ครึ่งตัวของทั้งคู่ — เงาใต้ตัวกว้าง 120·k)
      o.st = 'wait'; o.t = 0; o.dur = 600; face(o, k.x);
    }
  }
}

/**
 * หนึ่งเฟรม (dt = เฟรม 60fps) · px,py = ตำแหน่งผู้เล่น
 */
let lastPx = null, stillT = 0;
export function stepKittens(kits, dt, px, py, tick) {
  // ผู้เล่นกำลังเดินอยู่ไหม (เดิน/วิ่งผ่าน = ชวนน้องเดินตาม) · ลอยจากพื้น = กระโดด
  const vx = lastPx == null ? 0 : (px - lastPx) / Math.max(dt, 0.001);
  lastPx = px;
  stillT = Math.abs(vx) > 0.3 ? 0 : stillT + dt;
  const P = { x: px, y: py, vx, moving: stillT < 20, air: py < GY - 24, dir: vx > 0.3 ? 1 : vx < -0.3 ? -1 : 0 };
  const S = NURSE_SPOTS;
  KITS = kits;
  // ฝักบัวเปิดตอนมีน้องกำลังลงอ่าง/แช่น้ำ (ค่อย ๆ เปิด-ปิด)
  const wantShower = kits.some((q) => q.st === 'bath' || (q.st === 'hop' && q.hop?.next === 'bath')) ? 1 : 0;
  SHOWER += (wantShower - SHOWER) * Math.min(1, 0.05 * dt);

  for (const k of kits) {
    k.t += dt;
    if (k.cool > 0) k.cool -= dt;
    if (k.land > 0) k.land = Math.max(0, k.land - dt);
    if (k.dizzyLeft > 0) k.dizzyLeft -= dt;
    // ฝุ่นตอนวิ่ง: ก้อนฝุ่นนุ่ม ๆ หลุดจากเท้าทุกจังหวะ ค้างกับพื้น พองแล้วจางลอยขึ้น
    if (k.dust) { for (const d of k.dust) { d.t += dt; d.y -= 0.12 * dt; d.x += d.vx * dt; } k.dust = k.dust.filter((d) => d.t < 34); }
    if (k.run && k.st === 'walk') {
      k.dustAcc = (k.dustAcc || 0) + dt;
      if (k.dustAcc >= 4) { k.dustAcc = 0; (k.dust ||= []).push({ x: k.x - k.dir * 6 + (Math.random() - 0.5) * 4, y: k.y - 1, t: 0, vx: -k.dir * (0.15 + Math.random() * 0.25), s: 0.8 + Math.random() * 0.5 }); }
    }
    if (k.meowT >= 0) {
      if (!k.mSaid) { k.mSaid = true; snd('kitMeow', k, 25, k.k < 0.17 ? 1.12 : 0.95); }
      k.meowT += dt; if (k.meowT > 170) { k.meowT = -1; k.mSaid = false; }
    }
    // รวมท่าของน้องจิบิ (act 'auto' — chibi.js AUTO_STEPS): ร้องเหมียวที่จังหวะ 480 ของรอบ 1260 เฟรม
    if (AUTO_ST.has(k.st) && k.meowT < 0) {
      const ph = (((tick + k.tOff) % 1260) + 1260) % 1260;
      if (ph >= 480 && ph - dt < 480) snd('kitMeow', k, 25, k.k < 0.17 ? 1.12 : 0.95);
    }
    for (const h of k.hearts) h.t += dt;
    k.hearts = k.hearts.filter((h) => h.t < 70);
    if (k.st === 'held') { stepHeld(k, kits, dt); continue; }   // ถูกยกอยู่ = ตามนิ้ว
    const dP = Math.abs(px - k.x);

    // ผู้เล่นกระโดดใกล้ ๆ → สะดุ้งเด้งตัว แล้วหันมามอง (เฉพาะตอนอยู่บนเลน ไม่ได้ทำอะไรสำคัญ)
    if (P.air && dP < 110 && k.cool <= 0 && FREE.has(k.st) && !k.other && Math.abs(k.y - laneY(k)) < 1) {
      k.cool = 240;
      if (Math.random() < 0.7) { face(k, px); hopTo(k, k.x - k.dir * 6, k.y, 16, 22, 'look'); continue; }
    }

    if (k.st === 'walk') {
      if (walkStep(k, dt)) arrive(k, px);
      continue;
    }
    if (k.st === 'follow') {
      // เดินตามต้อย ๆ ห่างผู้เล่นพอดี ๆ · ไกลไปก็วิ่งตาม · ผู้เล่นหยุดนาน = นั่งมอง
      k.tx = clampX(px + k.fOff); k.ty = null;
      const far = Math.abs(k.tx - k.x);
      k.mul = far > 120 ? RUN : 1;
      if (far > 3) walkStep(k, dt); else face(k, px);
      if (k.t > k.dur || (!P.moving && far < 6)) { face(k, px); rest(k, 'sit', rnd(160, 320)); if (Math.random() < 0.5) k.meowT = 0; }
      continue;
    }
    if (k.st === 'chase') {
      const o = k.other;
      if (!o || o.st !== 'flee') { unpair(k); rest(k, 'idle', rnd(60, 120)); continue; }
      k.tx = clampX(o.x - Math.sign(o.x - k.x || 1) * 60 * (k.k + o.k));
      walkStep(k, dt);
      if (Math.abs(o.x - k.x) < 100 * (k.k + o.k) || k.t > k.dur) meet(k, o);   // จับได้ = ตัวชนกัน
      continue;
    }
    if (k.st === 'flee') {
      // วิ่งหนีไปข้างหน้า ชนขอบห้องแล้วกลับตัววิ่งผ่านตัวไล่ไป
      if (k.x <= S.roam[0] + 2) k.dir = 1; else if (k.x >= S.roam[1] - 2) k.dir = -1;
      k.tx = clampX(k.x + k.dir * 60);
      walkStep(k, dt);
      if (!k.other) rest(k, 'idle', rnd(60, 120));
      continue;
    }
    if (k.st === 'hop') {
      // กระโดดเป็นโค้ง (ขึ้นม้านั่ง / ลงพื้น / สะดุ้ง)
      const H = k.hop;
      if (k.t < H.pre) continue;   // ย่อตัวเตรียมดีด
      if (crossed(k.t, dt, H.pre) && H.h > 10) snd('kitHop', k, 4, k.k < 0.17 ? 1.15 : 0.95);
      const u = hopU(k);
      // ทางโค้ง: x ออกตัวเร็วแล้วผ่อน · y = เส้นตรง + โหนกพาราโบลา (ขาลงเร่งเหมือนตกจริง — ลงจากที่สูงตกเร็วตอนท้าย)
      const ux = u + 0.35 * u * (1 - u);
      k.x = H.x0 + (H.x1 - H.x0) * ux;
      const drop = H.y1 - H.y0, uy = drop > 0 ? u * u * (0.4 + 0.6 * u) / 1 : u;
      k.y = H.y0 + drop * Math.min(1, uy) - 4 * u * (1 - u) * H.h;
      if (u >= 1) {
        k.hop = null; k.y = H.y1; k.land = H.h > 10 ? 26 : 0;
        if (k.land) snd('kitLand', k, 4);
        if (H.next === 'bath') snd('kitSplash', k, 10);
        if (H.next === 'window') rest(k, 'window', rnd(500, 1100));
        else if (H.next === 'bed') { k.inBed = k.spot; rest(k, 'sleep', rnd(600, 1500)); }
        else if (H.next === 'dropped') afterDrop(k, kits, H);
        else if (H.next === 'perchland') { rest(k, 'perch', rnd(360, 900)); }
        else if (H.next === 'shelfland') { rest(k, 'shelfsit', rnd(360, 800)); }
        else if (H.next === 'look') { face(k, px); rest(k, 'look', rnd(70, 130)); }
        else if (H.next === 'route') { if (k.route?.length) { rest(k, 'step', k.lastPt?.rest || 14 + Math.random() * 16); if (!k.lastPt?.sit) face(k, k.route[0].x); } else routeNext(k, kits, P); }
        else if (H.next === 'bath') { rest(k, 'bath', BATH_T); k.dir = -1; }
        else if (H.next === 'dry') dryOff(k);
        else if (H.next === 'eatland' || H.next === 'drinkland') { k.then = H.next === 'eatland' ? 'eat' : 'drink'; arrive(k, px); }   // ลงหลังชาม/น้ำพุแล้ว = เริ่มกิน/ดื่ม
        else { k.spot = null; pick(k, kits, P); }
      }
      continue;
    }
    if (k.st === 'wait') {
      // รอเพื่อนที่เดินมาทัก — หันตามตลอด · เพื่อนเลิกมา = เลิกรอ
      const o = k.other;
      if (o && o.other === k && o.st === 'walk' && o.then === 'nuzzle') { face(k, o.x); continue; }
      unpair(k); rest(k, 'sit', rnd(120, 240));
      continue;
    }
    if (k.st === 'meet') {
      if (k.other) face(k, k.other.x);
      if (k.t >= k.dur) { unpair(k); rest(k, Math.random() < 0.5 ? 'sit' : 'idle', rnd(120, 300)); }
      continue;
    }

    if (k.st === 'eat') {
      // กินทีละนิด — อาหารในชามลดตาม (drawBowlFood) · หมด = บันทึกว่ากินแล้ว · งับทุกจังหวะผงกหัว = เสียงหงับ
      k.eatK = Math.min(1, k.t / k.dur);
      if (k.t > 22 && k.t < k.dur - 70 && Math.floor(k.t / 18) !== Math.floor((k.t - dt) / 18)) snd('kitNom', k, 5);
      if (k.t >= k.dur) {
        if (k.cat.demoLv) { if (k.dish) k.dish.eaten = true; } else eatDish(k.cat.id);
        k.eatK = 0; addHeart(k); k.meowT = 0; snd('kitHappy', k, 20);
        k.spot = null; pick(k, kits, P);
      }
      continue;
    }
    if (k.st === 'bath') {
      if (Math.random() < 0.035 * dt) snd('bubblePop', k, 3);
      if (crossed(k.t, dt, BATH_T * 0.8)) snd('kitShake', k, 10);
    }
    if (k.st === 'dry') {
      if (crossed(k.t, dt, 2)) snd('kitShake', k, 10);
      if (crossed(k.t, dt, 42)) snd('kitHappy', k, 10);
    }
    if (k.st === 'drink' && Math.floor(k.t / 14) !== Math.floor((k.t - dt) / 14)) snd('kitLap', k, 6);
    if (k.st === 'litter') {
      const L = NURSE_SPOTS.litter, u = k.t;
      k.y = GY + 3;   // ตำแหน่งวาดตอนเข้า-ออกคิดใน drawKittens (กระโดดหดตัวเข้าประตู · เด้งออก)
      if (crossed(u, dt, 6)) snd('kitHop', k, 4, 1.25);
      if (crossed(u, dt, LITTER_T - 28)) snd('kitHop', k, 4, 1.1);
      if (crossed(u, dt, LITTER_T - 6)) snd('kitLand', k, 4);
      if (u > 40 && u < LITTER_T - 40 && Math.floor(u / 22) !== Math.floor((u - dt) / 22)) snd('kitScratch', k, 8);
      void L;
    }
    if (k.st === 'jumpplay') {   // จังหวะของท่ากระโดด (chibi-acts jump): ดีดตัว 26 · ลงพื้น 74
      if (crossed(k.t, dt, 26)) snd('kitHop', k, 4, k.k < 0.17 ? 1.15 : 0.95);
      if (crossed(k.t, dt, 74)) snd('kitLand', k, 4);
    }
    // พฤติกรรมอยู่กับที่ — ผู้เล่นเดินมาใกล้ = หันมามอง
    if ((k.st === 'idle' || k.st === 'sit') && dP < 90) {
      if (k.seen <= 0) { face(k, px); k.seen = 1; if (Math.random() < 0.35) rest(k, 'look', rnd(90, 160)); }
    } else if (dP > 140) k.seen = 0;
    if (k.t < k.dur) continue;
    // จบกิจกรรม → ลงจากม้านั่ง / ลุกจากที่ แล้วเลือกอย่างใหม่
    if (k.st === 'window') { k.spot = null; hopTo(k, clampX(k.x + (Math.random() < 0.5 ? -40 : 40)), laneY(k), 26, 26, 'pick'); continue; }
    if (k.st === 'perch') { climbDown(k); continue; }
    if (k.st === 'step') { routeNext(k, kits, P); continue; }
    if (k.st === 'shelfsit') { k.spot = null; const d = Math.random() < 0.5 ? -1 : 1; face(k, k.x + d); hopTo(k, clampX(k.x + d * 34), laneY(k), 12, 22 + Math.sqrt(Math.max(1, laneY(k) - k.y)) * 1.5, 'pick'); continue; }
    if (k.st === 'dizzy') { snd('kitShake', k, 10); k.dizzyLeft = 0; }
    if (k.st === 'drink') {   // ดื่มอิ่ม = นับเป็นการดูแลแบบให้น้ำ (cats.js care 'drink' — ฟรี) · หัวใจลอย
      k.useWater = false; addHeart(k);
      if (!k.cat.demoLv) { try { care(k.cat.id, 'drink'); } catch { /* ไม่บันทึก */ } }
    }
    if (k.st === 'litter') { k.useLitter = false; k.y = GY + 3; addHeart(k); snd('kitHappy', k, 20); }
    if (k.st === 'bath') { hopTo(k, S.tub.out, laneY(k), 34, 28, 'dry'); continue; }
    if (k.st === 'dry') { k.bathing = false; addHeart(k); k.meowT = 0; }
    if (k.st === 'bath') { /* จบแช่ → กระโดดออก (ข้างล่าง) */ }
    pick(k, kits, P);
  }
}

/** เดินถึงที่หมาย → ทำต่อตาม then */
function arrive(k, px) {
  const th = k.then;
  k.ty = null; k.mul = 1;
  if (k.hopY != null && (th === 'eat' || th === 'drink')) {   // ถึงหน้าชาม/น้ำพุแล้ว → ย่อตัวกระโดดเข้าไปนั่งข้างหลัง
    const y1 = k.hopY;
    k.hopY = null; k.run = false;
    hopTo(k, k.x, y1, th === 'drink' ? 20 : 14, th === 'drink' ? 22 : 18, th === 'drink' ? 'drinkland' : 'eatland');
    return;
  }
  if (!k.spot && (th === 'hopup' || th === 'bedhop' || th === 'eat')) { rest(k, 'idle', 60); return; }   // ที่จองถูกยกเลิกระหว่างทาง
  if (th === 'sleep') rest(k, 'sleep', rnd(600, 1500));
  else if (th === 'bedhop') { face(k, k.spot.x); hopTo(k, k.spot.x, k.spot.y, 22 + Math.max(0, GY - k.spot.y) * 0.4, 24, 'bed'); }
  else if (th === 'eat') {
    const d = kitDish(k);
    if (d) { rest(k, 'eat', rnd(300, 420)); k.eatK = 0; } else rest(k, 'sniff', rnd(90, 150));   // ชามว่าง = ดมแล้วนั่งมอง
  }
  else if (th === 'hopup') hopTo(k, k.spot.x, k.spot.y, 26, 26, 'window');
  else if (th === 'climb') climbUp(k);
  else if (th === 'shelfgo') {   // ไต่ชั้นผนัง: กระโดดทีละชั้น พักนอนในเปลญวน แล้วไต่ต่อลงพื้นอีกฝั่ง
    const SH = NURSE_SPOTS.shelves;
    k.route = [...SH.path.map((q) => ({ ...q })), { x: SH.end, y: laneY(k) }];
    k.routeEnd = 'pick';
    routeNext(k, KITS);
  }
  else if (th === 'drink') rest(k, 'drink', rnd(200, 320));
  else if (th === 'litter') rest(k, 'litter', LITTER_T);
  else if (th === 'tub') { const T = NURSE_SPOTS.tub; hopTo(k, T.x, T.y, 46, 30, 'bath'); }
  else if (th === 'greet') { rest(k, 'greet', rnd(150, 260)); face(k, px); addHeart(k); k.meowT = 10; }
  else if (th === 'nuzzle') {
    const o = k.other;
    if (o && o.other === k && o.st === 'wait') meet(k, o);
    else { unpair(k); rest(k, 'idle', rnd(60, 140)); }
  } else rest(k, th === 'sit' ? 'sit' : 'idle', th === 'hurry' ? 1 : th === 'sit' ? rnd(180, 420) : rnd(80, 200));
}

// ── คอนโดแมว ──
/** ข้างบันได → เลือกชั้นที่จะขึ้น (เบาะว่างชั้นสูงสุดที่สุ่มได้) → กระโดดขึ้นทีละชั้น */
function climbUp(k) {
  const C = NURSE_SPOTS.condo, kits = KITS;
  const free = C.perches.map((p, i) => (taken(kits, k, p) ? -1 : i)).filter((i) => i >= 0);
  if (!free.length) { rest(k, 'look', rnd(60, 120)); return; }
  const top = free[Math.floor(Math.random() * free.length)];
  k.spot = C.perches[top];   // จองเบาะปลายทาง
  k.route = C.perches.slice(0, top + 1).map((p) => ({ x: p.x, y: p.y }));
  k.routeEnd = 'perch';
  routeNext(k, kits);
}
/** ลงจากเบาะ: ทีละชั้นจนถึงชั้นแรก แล้วกระโดดลงพื้นข้างบันได */
function climbDown(k) {
  const C = NURSE_SPOTS.condo;
  const i = C.perches.findIndex((p) => p.x === k.spot?.x && p.y === k.spot?.y);
  k.route = [...C.perches.slice(0, Math.max(0, i)).reverse().map((p) => ({ x: p.x, y: p.y })), { x: C.base, y: laneY(k) }];
  k.spot = null;
  k.routeEnd = 'pick';
  routeNext(k, KITS);
}
/** ไปจุดถัดไปของเส้นทาง (กระโดดโค้งสั้น ๆ) · หมด = นั่งพักบนเบาะ / เลือกกิจกรรมใหม่ */
function routeNext(k, kits, P = { x: -1e6, y: GY, moving: false }) {
  const n = k.route?.shift();
  k.lastPt = n || null;
  if (n) {
    face(k, n.x);
    const up = k.y - n.y, dist = Math.abs(n.x - k.x);
    // ขึ้น = โค้งเลยเบาะนิดแล้วลง · ลง = เด้งออกนิดแล้วตกตามแรงโน้มถ่วง · เวลาตามระยะ (สูง/ไกล = ลอยนานขึ้น)
    if (up > 0) hopTo(k, n.x, n.y, up * 0.35 + 16, 22 + Math.sqrt(up) * 1.6 + dist * 0.04, 'route');
    else hopTo(k, n.x, n.y, 12, 18 + Math.sqrt(-up) * 1.5 + dist * 0.04, 'route');
    return;
  }
  k.route = null; k.parkour = false;
  if (k.routeEnd === 'perch') { rest(k, 'perch', rnd(360, 900)); k.dir = Math.random() < 0.5 ? -1 : 1; }
  else pick(k, kits, P);
}
let KITS = [];
const LITTER_T = 260;   // ในห้องน้ำแมว ~4 วิ (มุดเข้า 0.5 วิ · ขุดทราย · ออกมา 0.5 วิ)   // ชุดน้องที่กำลังเดิน (ฟังก์ชันคอนโดต้องดูว่าเบาะไหนถูกจอง)

// ── อาบน้ำ ──
const BATH_T = 560;   // แช่ในอ่าง ~9 วิ (ฟองฟู → โยกตัว → สะบัดหัวช่วงท้าย)
function dryOff(k) {
  rest(k, 'dry', 80);
  // อาบเสร็จ = นับเป็นการดูแล (สะอาดเต็มหลอด · EXP ตามระบบเดิม) — น้องตัวอย่างไม่บันทึก
  if (!k.cat.demoLv) { try { care(k.cat.id, 'bathe'); } catch { /* ข้อมูลน้องหาย = แค่ไม่บันทึก */ } }
}
/**
 * ส่งน้องไปอาบน้ำ (หน้าเลือกน้อง town/bath.js) · คืน false = อ่างไม่ว่าง / ห้องยังไม่มีอ่าง
 * น้องหลับ/อยู่บนคอนโด = ตื่น/ลงมาก่อน · กลางอากาศ/เล่นกับเพื่อน/กำลังกิน = ทำให้จบก่อนแล้วค่อยมา
 */
export function callToTub(kits, catId) {
  const k = kits.find((q) => q.cat.id === catId);
  if (!k || !NURSE_SPOTS.tub || tubBusy(kits)) return false;
  k.wantBath = true;
  k.meowT = 0;
  if (k.st === 'perch' || k.st === 'window') { k.t = k.dur; return true; }
  if (k.st === 'hop' || k.other || k.st === 'eat' || k.route || k.st === 'litter') return true;   // กำลังไต่/กระโดด = จบก่อนแล้วค่อยมา
  pick(k, kits, { x: -1e6, y: GY, moving: false });
  return true;
}

/** ท่าวาดของน้องตามสถานะ */
function pose(k, tick) {
  const t = tick + k.tOff;
  const faceRight = k.dir > 0;
  const mouth = k.meowT >= 0 ? 'meow' : null;
  switch (k.st) {
    case 'walk': case 'chase': case 'flee':
      if (k.run) { const R = chibiRunPose(k.ph % 4); return { ...R.opt, t, faceRight, rot: R.rot, lift: R.lift }; }   // วิ่งจู๊ด: เอนหน้า หูลู่ หางชี้
      return { view: 'q', t, act: mouth || 'idle', walk4: Math.floor(k.ph) % 4, walkPhase: k.ph, faceRight };
    case 'perch': return { view: 'sit', t, act: mouth || 'auto', faceRight };
    case 'shelfsit': return { view: 'sit', t, act: k.spot?.sit && k.t > 60 ? 'sleep' : mouth || 'auto', faceRight };
    case 'held': {
      const w = k.woozy;
      return { view: 'front', t, act: 'idle', faceRight: false, fx: { sy: 1.05, sx: 0.97, ear: 0.32 + (w ? 0.2 * Math.sin(t * 0.3) : 0), mouth: w ? 0.3 : 0.12, tilt: w ? 0.16 * Math.sin(t * 0.21) : 0 }, over: w ? spiralEyes(t) : null };
    }
    case 'dizzy': {   // ปล่อยลงพื้นตอนมึน: ตาก้นหอย ตัวโยกไปมาแล้วค่อย ๆ นิ่ง ปากอ้านิด หูตก
      const fade = Math.min(1, k.dizzyLeft / 90);
      return { view: 'front', t, act: 'idle', faceRight, fx: { tilt: 0.16 * Math.sin(t * 0.13) * fade, ear: -0.15, mouth: 0.25 * fade }, over: fade > 0.15 ? spiralEyes(t) : null };
    }
    case 'step': if (k.lastPt?.sit) return { view: 'sit', t, act: k.t > 50 && k.t < k.dur - 20 ? 'sleep' : 'auto', faceRight };   // นอนพักในเปลญวน
      return { view: 'q', t, act: mouth || 'auto', faceRight };
    case 'drink': {   // ดื่มน้ำ (แบบท่ากินข้าว): นั่งหลังน้ำพุ ก้มหน้าลงอ่าง เลียแจ๊บ ๆ ตาหลับพริ้ม — น้ำพุวาดทับหน้าตัว
      const down = Math.min(1, k.t / 20) * Math.max(0, Math.min(1, (k.dur - k.t) / 16)), lap = Math.abs(Math.sin((k.t / 7) * Math.PI));
      // หัวตั้งตรงกลางอ่าง — หักการโยกตัวตอนนิ่ง (life() ใน chibi.js) ออก ไม่ให้หัวเอียงข้างน้ำพุ (ผู้ใช้ 16 พ.ย.)
      return { view: 'sit', t, act: 'idle', faceRight, fx: { tilt: -Math.sin((t / 330) * Math.PI * 2) * 0.02, open: down > 0.4 ? 0 : 1, mouth: (0.15 + 0.3 * lap) * down, sy: 1 - 0.06 * down, sx: 1 + 0.03 * down, ear: 0.04 * lap - 0.04 * down, head: { dy: (10 + 4 * lap) * down } } };   // ปากแตะผิวน้ำในอ่าง หน้ายังโผล่พ้นขอบน้ำพุ
    }
    case 'litter': return { view: 'q', t, act: 'idle', faceRight: k.t < LITTER_T / 2 };   // เดินเข้า (หันขวา) · หันกลับออกมา
    case 'bath': {
      const u = k.t / BATH_T, shake = u > 0.8 ? (u - 0.8) / 0.2 : -1;
      const shakeRot = shake >= 0 ? 0.24 * Math.sin(shake * Math.PI * 9) * Math.sin(shake * Math.PI) : 0;
      const foamK = Math.min(1, k.t / 40) * (shake >= 0 ? 1 - shake : 1);
      return {
        view: 'sit', t, act: 'idle', faceRight: false,
        fx: { open: 0, mouth: shake >= 0 ? 0.3 : 0.1, ear: shake >= 0 ? 0.2 * Math.sin(shake * 40) : -0.1, tilt: 0.035 * Math.sin(k.t * 0.09), head: { rot: shakeRot + 0.04 * Math.sin(k.t * 0.32) } },
        over: (c) => foamHead(c, foamK, shakeRot, k.k),   // เส้นฟองหนาเท่าฟองขอบอ่าง
      };
    }
    case 'dry': return { view: 'front', t, act: 'idle', faceRight, fx: { tilt: 0.12 * Math.sin(k.t * 0.9) * Math.max(0, 1 - k.t / 45), open: k.t < 45 ? 0 : 1, mouth: k.t > 45 ? 0.35 : 0 } };
    case 'follow':
      return Math.abs(k.tx - k.x) > 3
        ? { view: 'q', t, act: 'idle', walk4: Math.floor(k.ph) % 4, walkPhase: k.ph, faceRight }
        : { view: 'q', t, act: mouth || 'idle', faceRight };
    case 'sit': case 'wait': case 'sniff': return { view: 'sit', t, act: mouth || 'auto', faceRight };
    case 'eat': {
      // ท่ากินข้าว (cat-lab): ก้มหน้าจุ่มชาม ผงกหัวงับ ๆ → ช่วงท้ายเงยหน้าเคี้ยวตาหลับพริ้ม
      const end = k.dur - 70, down = Math.min(1, k.t / 22) * (k.t > end ? Math.max(0, 1 - (k.t - end) / 16) : 1);
      const nib = k.t < end ? Math.abs(Math.sin((k.t / 18) * Math.PI)) : 0;
      const chew = k.t > end + 16 ? Math.abs(Math.sin(((k.t - end) / 9) * Math.PI)) : 0;
      return { view: 'sit', t, act: 'idle', faceRight, fx: { open: 0, mouth: nib * 0.35 * down + chew * 0.42, sy: 1 - 0.08 * down, sx: 1 + 0.04 * down, ear: 0.05 * nib - 0.04 * down, head: { dy: 30 * down + 7 * nib * down } } };   // ปากแตะยอดข้าวในชามพอดี (ผู้ใช้ 15 พ.ย.: หน้าไม่ต่ำเกินข้าว)
    }
    case 'sniff': return { view: 'sit', t, act: 'idle', faceRight, fx: { head: { dy: 40 * Math.min(1, k.t / 20) * Math.max(0, 1 - (k.t - 60) / 20) }, ear: -0.05 } };
    case 'sleep': return { view: 'sit', t, act: 'sleep', faceRight };
    case 'window': return { view: 'back', t, act: 'idle', faceRight };
    case 'look': return { view: 'front', t, act: mouth || 'auto', faceRight };
    case 'greet': return { view: 'front', t, act: mouth || 'idle', faceRight };
    case 'meet': return { view: 'q', t, act: mouth || 'idle', faceRight };
    case 'hop': {
      // ท่ากระโดด (cat-lab): ย่อตัวก่อนดีด → ลอยตัวยืด ขาเหยียด หูปลิว ปากอ้า หางสะบัด · หน้าเชิดขาขึ้น ก้มขาลง
      const H = k.hop, fr = H.x1 === H.x0 ? faceRight : H.x1 > H.x0;
      if (k.t < H.pre) {   // ย่อตัวลงช้า ๆ แล้วค้างก่อนดีด (ตาหรี่ หูพับ หางชี้)
        const c = 1 - (1 - k.t / H.pre) ** 2;
        return { view: 'q', t, act: 'idle', faceRight: fr, fx: { sy: 1 - 0.2 * c, sx: 1 + 0.13 * c, ear: -0.26 * c, open: 1 - 0.45 * c, tailRot: 0.25 * c, head: { dy: 6 * c } } };
      }
      const u = hopU(k), arc = Math.sin(u * Math.PI);
      const sq = Math.min(0, jumpSquash(k.t - H.pre, H.dur));   // ยืดสูงตอนถีบ + ยืดเท้าลงหาพื้นตอนใกล้ถึง
      const down = H.y1 > H.y0;
      return {
        view: 'q', t, act: 'idle', walk4: u < 0.55 ? 0 : 1, walkPhase: u < 0.55 ? 0.5 : 1.5, faceRight: fr,
        rot: (down ? 0.04 : 0.14) - (down ? 0.3 : 0.28) * u,
        fx: { sy: 1 - 0.24 * sq, sx: 1 + 0.13 * sq, ear: 0.2 * arc - 0.14, mouth: 0.45, open: 1, tailRot: 0.3 - 0.6 * u },
      };
    }
    default: return { view: 'q', t, act: mouth || 'auto', faceRight };
  }
}

/**
 * วาดน้อง (เฉพาะตัวที่ pass(k) — ใช้แยกชั้นหลัง/หน้าตัวผู้เล่น) · px = ผู้เล่น (ป้ายชื่อขึ้นเมื่อเดินมาใกล้)
 */
/**
 * lit (ไม่บังคับ — main.js ส่งมาเมื่อฉากมีชั้นแสง · ผู้ใช้ 16 พ.ย. 2026): { cast: เงาทอดแบบใหม่เปิดไหม, draw(c, k, ground, fn) }
 *   ใช้กับน้องที่ยืน/เดิน/นั่ง/นอนธรรมดาเท่านั้น — อาบน้ำ/ในกระบะทราย/นอนในบ้าน/กระโดดเล่น วาดแบบเดิม
 *   เงาทอดเปิด = ไม่วาดเงาวงรีใต้ตัว (ห้ามซ้อนกัน)
 */
export function drawKittens(c, kits, tick, pass, px, camX, vw, lit = null) {
  const list = kits.filter((k) => k.st !== 'held' && pass(k) && k.x > camX - 80 && k.x < camX + vw + 80).sort((a, b) => a.y - b.y);
  for (const k of list) {
    const P = pose(k, tick);
    const T = NURSE_SPOTS.tub, inTub = k.st === 'bath';
    // เงาใต้ตัว (ลอยตอนกระโดด = เล็ก/จางลง) · ในอ่าง = ไม่มีเงา
    const ground = k.st === 'hop' ? k.hop.y0 + (k.hop.y1 - k.hop.y0) * hopU(k) : k.y;
    const lift = Math.max(0, ground - k.y), sh = 1 - Math.min(0.5, lift / 50);
    if (k.st === 'jumpplay') {
      drawChibiAct(c, k.x, k.y, k.k, { act: 'jump', t: k.t, look: k.look, faceRight: k.dir > 0 });
      continue;
    }
    if (k.land > 0) {   // เพิ่งลงพื้น = แบนกว้าง → เด้งยืดนิด → นิ่ง (สูตรเดียวกับท่ากระโดดในหน้าทดลอง)
      const q = jumpSquash(26 - k.land + 100, 100) * 0.22;
      P.fx = { ...(P.fx || {}), sy: (P.fx?.sy || 1) * (1 - q), sx: (P.fx?.sx || 1) * (1 + q * 0.7) };
    }
    const plainLit = lit && !inTub && k.st !== 'litter' && !(k.st === 'sleep' && k.inBed && bedCave(k.inBed));
    if (!inTub && k.st !== 'litter' && !(k.st === 'sleep' && k.inBed && bedCave(k.inBed)) && !(plainLit && lit.cast)) {
      c.save();
      c.globalAlpha = 0.2 * sh; c.fillStyle = '#4A2A5A';
      c.beginPath(); c.ellipse(k.x, ground + 2, 120 * k.k * sh, 4.5 * sh, 0, 0, TAU); c.fill();
      c.restore();
    }
    // วิ่งจู๊ด: ฝุ่นจิ๋วจากเท้าทุกจังหวะลง ค้างกับพื้นหลังตัว (วาดหน่วยชีทของน้อง — เส้นหนาเท่าท่าในหน้าทดลอง)
    for (const d of k.dust || []) {   // ฝุ่นนุ่ม ๆ ตามหลังตอนวิ่งจู๊ด (หน่วยชีทของน้อง เส้นหนาเท่ากันทุกตัว)
      const a = d.t / 34;
      c.save(); c.translate(d.x, d.y); c.scale(k.k, k.k);
      puff(c, 0, -12 - a * 14, (12 + a * 22) * d.s, 0.85 * (1 - a) * Math.min(1, d.t / 3));
      c.restore();
    }
    if (inTub) {
      // ฟองสบู่ลอยขึ้นรอบอ่าง (หลังตัว)
      c.save(); c.translate(T.x, T.rim); c.scale(k.k, k.k);
      // ฟองลอยขึ้นส่ายไปมา (มากขึ้น ลอยช้า ๆ บางลูกลอยออกนอกอ่าง)
      for (let i = 0; i < 20; i++) { const a = (((tick + k.tOff) * (0.45 + 0.25 * ((i * 0.61) % 1)) + i * 23) % 190) / 190; bubble(c, -230 + 460 * ((i * 0.37) % 1) + Math.sin(a * 7 + i) * 22 + (i % 3 - 1) * a * 60, -30 - a * 420, 7 + 6 * ((i * 0.53) % 1), Math.sin(a * Math.PI) * 0.95); }
      c.restore();
      c.save(); c.beginPath(); c.rect(k.x - 200, k.y - 400, 400, 400 - (k.y - T.rim) + 1); c.clip();   // ใต้ปากอ่าง = จมน้ำ
    }
    if (k.st === 'litter') {
      // ทรายกระเด็นออกจากประตูระหว่างขุด + น้องจางหายเข้า/ออกประตู
      const L = NURSE_SPOTS.litter, u = k.t;
      if (u > 34 && u < LITTER_T - 34) for (let i = 0; i < 6; i++) {
        const born = Math.floor((u - i * 7) / 42) * 42 + i * 7, age = u - born, sd = (i % 2 ? 1 : -1);
        if (age < 0 || age > 26) continue;
        c.save(); c.globalAlpha = 1 - age / 26; c.fillStyle = i % 3 ? '#EAD3AA' : '#D7B886';
        c.beginPath(); c.arc(L.x + sd * (8 + age * 1.3), L.door + 6 - Math.sin((age / 26) * Math.PI) * (9 + (i % 3) * 4) + age * 0.2, 1.9, 0, TAU); c.fill(); c.restore();
      }
      // เข้า: ย่อตัว → กระโดดโค้งเข้าประตู ตัวหดเล็กลงตอนลอดประตู · ข้างใน: ตัวเล็กหันหลังขุดทราย (โยกตัว) ในเงามืด
      // ออก: หันหน้า เด้งพุ่งออกจากประตู ตัวขยายคืน (เกินนิดแล้วหดกลับ) ลงพื้นตัวแบนแล้วเด้ง
      const D = litterDoor(), ez = (v) => v * v * (3 - 2 * v);
      let sx = 1, x = L.x, y = GY + 3, clip = false, fx = null, view = 'q', inside = false;
      if (u < 30) {
        const e = u / 30;
        if (e < 0.25) { const q = Math.sin((e / 0.25) * Math.PI / 2); fx = { sy: 1 - 0.18 * q, sx: 1 + 0.12 * q, ear: -0.2 * q }; }
        else { const j = (e - 0.25) / 0.75; y = GY + 3 + (D.y - GY - 3) * ez(j) - Math.sin(j * Math.PI) * 16; sx = 1 - 0.45 * ez(j); clip = j > 0.55; fx = { sy: 1.1, sx: 0.94, ear: 0.15, mouth: 0.3 }; }
      } else if (u > LITTER_T - 30) {
        const j = (u - (LITTER_T - 30)) / 30;
        if (j < 0.8) { const jj = j / 0.8; y = D.y + (GY + 3 - D.y) * ez(jj) - Math.sin(jj * Math.PI) * 18; sx = 0.55 + 0.53 * ez(jj); clip = jj < 0.3; fx = { sy: 1.1, sx: 0.94, ear: 0.18, mouth: 0.35 }; view = 'front'; }
        else { const q = Math.sin(((j - 0.8) / 0.2) * Math.PI); sx = 1.08 - 0.08 * ((j - 0.8) / 0.2); fx = { sy: 1 - 0.15 * q, sx: 1 + 0.1 * q }; view = 'front'; }
      } else { inside = true; }
      if (inside) continue;   // ทำธุระอยู่ข้างใน = ไม่เห็นตัว (ผู้ใช้ 15 พ.ย.) — เห็นแค่ทรายกระเด็นกับเสียงขุด
      c.save();
      if (clip) c.clip(D.path);
      drawChibi(c, x, y, k.k * sx, { view, t: tick + k.tOff, act: inside && view === 'sit' ? 'auto' : 'idle', look: k.look, fx, faceRight: k.dir > 0 });
      if (clip) {
        const g = c.createLinearGradient(0, D.top, 0, D.y);
        g.addColorStop(0, 'rgba(60,35,95,.5)'); g.addColorStop(1, 'rgba(60,35,95,.08)');
        c.fillStyle = g; c.fill(D.path);
      }
      c.restore();
      continue;
    }
    const cave = k.st === 'sleep' && k.inBed && bedCave(k.inBed);
    if (cave) {
      // นอนในโดม/บ้านไม้: ตัวน้องอยู่ข้างใน — ตัดตามช่องประตู ตัวเล็กลงนิด (ไกลเข้าไปข้างใน) + เงามืดด้านบน
      c.save(); c.clip(cave.path);
      drawChibi(c, k.x, cave.y, k.k * 0.84, { ...P, look: k.look });
      const g = c.createLinearGradient(0, cave.top, 0, cave.y);
      g.addColorStop(0, 'rgba(60,35,95,.45)'); g.addColorStop(0.55, 'rgba(60,35,95,.12)'); g.addColorStop(1, 'rgba(60,35,95,0)');
      c.fillStyle = g; c.fill(cave.path);
      c.restore();
    } else {
      const body = (g) => {
        if (P.rot || P.lift) {
          g.save(); g.translate(k.x, k.y - (P.lift || 0) * k.k); g.rotate((P.rot || 0) * (P.faceRight ? -1 : 1));
          drawChibi(g, 0, 0, k.k, { ...P, look: k.look });
          g.restore();
        } else drawChibi(g, k.x, k.y, k.k, { ...P, look: k.look });
      };
      if (plainLit) lit.draw(c, k, ground, body); else body(c);
    }
    if (inTub) {
      c.restore();
      // ฟองฟูรอบตัวที่ปากอ่าง (ข้างตัว + หน้าอก ต่ำกว่าปาก — ไม่บังหน้า) ขยับนุ่ม ๆ
      c.save(); c.translate(k.x, T.rim); c.scale(k.k, k.k);
      const w = Math.sin((tick + k.tOff) * 0.05) * 3;
      // ฟองชุดเดียวกับฟองขอบอ่าง (ผู้ใช้ 15 พ.ย.: ให้เข้ากัน): ลูกขนาดเท่ากัน (~7–10 px บนฉาก) เส้นหนาเท่ากัน (unit = k)
      //   ชั้นล่างเต็มปากอ่าง + ชั้นบนสูงถึงแก้ม/ปาก (ต่ำกว่าตา — เส้นแดงที่ผู้ใช้ขีด)
      const R = 0.155 / k.k;   // รัศมีคงที่บนฉาก ไม่ว่าน้องตัวเล็กตัวใหญ่
      foam(c, [[-178, -24, 58 * R], [-112, -18, 62 * R], [-40, -14, 58 * R], [40, -14, 58 * R], [112, -18, 62 * R], [178, -24, 58 * R],   // ชั้นล่างนั่งบนปากอ่าง (ไม่ห้อยทับตัวอ่าง)
        // ชั้นบน: ยอดฟองหยุดที่ระดับแก้ม/ปาก (−88 หน่วยตัวน้องจากปากอ่าง — ขอบล่างตาอยู่ราว −100) ไม่บังตา
        ...[-150, -90, -30, 30, 90, 150].map((x, i) => { const r = (i % 2 ? 48 : 45) * R; return [x, -88 + r + (i % 2 ? w : -w) * 0.5, r]; })], 1, k.k);
      c.restore();
      c.save();
      c.restore();
    }
    // เดินอ้อมไปนั่งหลังน้ำพุ (ก่อนดื่ม/หลังดื่มเดินออก): ตัวอยู่หลังแนวน้ำพุ = น้ำพุบังตัว ไม่ดูเหมือนเดินทับน้ำพุ (ผู้ใช้ 16 พ.ย.)
    if (k.st !== 'drink' && NURSE_SPOTS.water && k.y < GY + 6 && Math.abs(k.x - NURSE_SPOTS.water.x) < 50) drawNurseWater(c, tick);
    // กระโดดลงหลังชามตัวเอง: ชาม (+ อาหาร) บังขาตอนลง ไม่ดูเหมือนกระโดดทะลุชาม
    if (k.st === 'hop' && (k.hop?.next === 'eatland' || k.hop?.next === 'outpick') && k.bowl != null && k.y < GY + 4 && Math.abs(k.x - (bowlSpot(k)?.x ?? -1e9)) < 30) {   // กระโดดเข้า/ออกจากหลังชามตัวเอง
      drawNurseBowl(c, k.bowl);
      const d = kitDish(k), b = bowlSpot(k);
      if (d && b) drawFoodMound(c, b.x, GY - BOWL_TOP, d.food, 1, tick + k.tOff);
    }
    if (k.st === 'drink') {
      // น้ำพุอยู่หน้าตัว (หน้าน้องจุ่มลงอ่างจริง) + หยดน้ำกระเด็นตอนเลีย
      drawNurseWater(c, tick);
      // หัวที่ก้มลงอ่างอยู่หน้าน้ำ (ผู้ใช้ 15 พ.ย.: บังน้ำเฉพาะหัว) — วาดน้องซ้ำ ตัดเฉพาะเหนือคาง
      const hdy = P.fx?.head?.dy || 0, chin = k.y + (-116 + hdy) * k.k;
      c.save(); c.beginPath(); c.rect(k.x - 200 * k.k, k.y - 420 * k.k, 400 * k.k, chin - (k.y - 420 * k.k)); c.clip();
      drawChibi(c, k.x, k.y, k.k, { ...P, look: k.look });
      c.restore();
      const W = NURSE_SPOTS.water;
      for (let i = 0; i < 4; i++) {
        const a = ((k.t + i * 7) % 26) / 26;
        c.save(); c.globalAlpha = 1 - a; c.fillStyle = '#CFEFFF';
        c.beginPath(); c.arc(W.x + (i - 1.5) * 4 + (i % 2 ? 1 : -1) * a * 6, W.rim - 3 - Math.sin(a * Math.PI) * 6, 1, 0, TAU); c.fill(); c.restore();
      }
    }
    if ((k.st === 'eat' || k.st === 'sniff') && k.bowl != null) {
      // ชามอยู่หน้าตัว: วาดชาม (+ อาหารที่เหลือ) ทับ → หน้าน้องจุ่มลงในชามจริง
      drawNurseBowl(c, k.bowl);
      const d = kitDish(k), b = bowlSpot(k);
      if (d && b) drawFoodMound(c, b.x, GY - BOWL_TOP, d.food, 1 - (k.st === 'eat' ? k.eatK : 0), tick + k.tOff);
    }
    if (k.st === 'dry' && k.t > 40) {
      // อาบเสร็จ: ประกายวิ้งรอบตัว
      c.save(); c.translate(k.x, k.y); c.scale(k.k, k.k);
      for (let i = 0; i < 4; i++) { const a = Math.min(1, Math.max(0, (k.t - 40 - i * 6) / 34)); sparkle(c, (i - 1.5) * 70, -200 - 60 * ((i * 0.53) % 1) - a * 40, 16, Math.sin(a * Math.PI)); }
      c.restore();
    }
    if (k.dizzyLeft > 0) dizzyStars(c, k, tick, Math.min(1, k.dizzyLeft / 60));
    if (k.st === 'sleep') {
      // Z z z ลอยขึ้นเฉียงจากหัวทีละตัว (แบบน้องตัวโตตอนนอน) — ตัวใหญ่ขึ้นตามที่ลอยสูง แล้วจางหาย
      const cave = k.inBed && bedCave(k.inBed);
      const hx = k.x + 12, hy = cave ? cave.top - 2 : k.y - 320 * k.k;
      for (let i = 0; i < 3; i++) {
        const u = ((((tick + k.tOff) / 150 + i / 3) % 1) + 1) % 1;
        c.save();
        c.globalAlpha = Math.min(1, u * 5) * (1 - u) * 0.95;
        c.font = `800 ${Math.round(8 + u * 9)}px Mali, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.9)'; c.fillStyle = '#8A6BC2';
        const zx = hx + u * 22 + Math.sin(u * 6 + i) * 2.5, zy = hy - u * 34;
        c.strokeText('Z', zx, zy); c.fillText('Z', zx, zy);
        c.restore();
      }
    }
    for (const h of k.hearts) {
      const u = h.t / 70;
      c.save(); c.globalAlpha = 1 - u; c.fillStyle = '#FF8FB3';
      heart(c, k.x + h.x + Math.sin(h.t * 0.12) * 4, k.y - 350 * k.k - 6 - u * 28, 5 + u * 2); c.fill(); c.restore();
    }
  }
}
/** ป้ายชื่อน้องที่อยู่ใกล้ผู้เล่น (วาดบนสุด) */
export function drawKittenNames(c, kits, px) {
  for (const k of kits) {
    const d = Math.abs(px - k.x);
    if (d > 110 || k.st === 'held' || k.st === 'litter') continue;
    c.save(); c.globalAlpha = Math.min(1, (110 - d) / 30);
    label(c, k.x, k.y - 350 * k.k - 14, k.name, 'rgba(255,255,255,.92)', '#8A4FD0', 10);
    c.restore();
  }
}

/**
 * เพิ่งเทอาหารลงชามของน้อง (หน้าเทอาหาร) — ตัวอย่าง ?kits จำอาหารไว้ในตัว · ทุกตัว: ร้องเหมียวแล้ววิ่งมาที่ชาม
 * น้องกำลังหลับ/นั่งหน้าต่าง/เล่นกับเพื่อน = ทำต่อให้จบก่อน แล้วค่อยมากิน (pick เลือกไปชามก่อนอย่างอื่น)
 */
export function callToBowl(kits, catId, food) {
  const k = kits.find((q) => q.cat.id === catId);
  if (!k || k.bowl == null) return;
  if (k.cat.demoLv) k.dish = { food, at: Date.now(), eaten: false };
  // ได้กลิ่นอาหาร: หลับอยู่ก็ตื่น · นั่งหน้าต่างอยู่ = กระโดดลงแล้วมา · กลางอากาศ/เล่นกับเพื่อนอยู่ = จบก่อนแล้วค่อยมา
  if (k.st === 'hop' || k.other || k.st === 'eat' || k.route || k.st === 'litter') return;
  k.meowT = 0;
  if (k.st === 'window' || k.st === 'perch') { k.t = k.dur; return; }   // นั่งหน้าต่าง/บนคอนโด = ลงมาก่อนแล้ววิ่งมา
  if (k.bathing || k.st === 'dry') return;   // อาบน้ำอยู่ = อาบให้เสร็จก่อน
  pick(k, kits, { x: -1e6, y: GY, moving: false });
}

/** อาหารในชาม (วาดทับชามว่างในฉาก ก่อนตัวน้อง) — กองพูนตามที่เหลือ: เท = เต็ม · กิน = ค่อย ๆ ยุบ */
const FOOD_LOOK = {
  kibble: { a: '#E2A86C', b: '#B97C45' },
  fish: { a: '#D8E4EE', b: '#8FA9C2' },
  salmon: { a: '#FFB48A', b: '#F07F5A' },
};
export function drawBowlFood(c, kits, tick) {
  for (const k of kits) {
    const b = bowlSpot(k), d = b && kitDish(k);
    if (!d) continue;
    const left = 1 - (k.st === 'eat' ? k.eatK : 0);
    if (left > 0.02) drawFoodMound(c, b.x, GY - BOWL_TOP, d.food, left, tick + k.tOff);
  }
}
/** กองอาหารบนปากชาม (กลาง x · ปากชาม top · left 0..1 ที่เหลือ · ph = จังหวะไอหอม) — ฉากห้องเลี้ยง + หน้าเทอาหารใช้ตัวเดียวกัน */
export function drawFoodMound(c, x, top, food, left = 1, ph = 0) {
  {
    const d = { food };
    const L = FOOD_LOOK[d.food] || FOOD_LOOK.kibble, h = 1 + 4.5 * left, w = 12.5 * (0.55 + 0.45 * left);
    c.save();
    c.fillStyle = L.b;
    c.beginPath(); c.ellipse(x, top + 0.5, w + 1, 3.2, 0, 0, TAU); c.fill();
    c.fillStyle = L.a;
    c.beginPath(); c.ellipse(x, top - h * 0.45, w, h, 0, Math.PI, TAU); c.fill();
    if (d.food === 'kibble') {
      for (let i = 0; i < 7; i++) { const u = i / 6; c.fillStyle = i % 2 ? L.a : L.b; c.beginPath(); c.arc(x - w + 2 + u * (w * 2 - 4), top - Math.sin(u * Math.PI) * h * 0.9, 1.7, 0, TAU); c.fill(); }
    } else if (d.food === 'fish') {
      // ปลาทูตัวเล็กนอนบนกอง (ลำตัว + หาง)
      c.fillStyle = '#B9CCDD'; c.beginPath(); c.ellipse(x - 1, top - h - 0.5, 6.5, 2.4, -0.15, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(x + 5, top - h - 1); c.lineTo(x + 9, top - h - 3.2); c.lineTo(x + 9, top - h + 1.4); c.closePath(); c.fill();
      c.fillStyle = '#4A5A70'; c.beginPath(); c.arc(x - 5.2, top - h - 1, 0.7, 0, TAU); c.fill();
    } else {
      // แซลมอนชิ้นโต ลายขาว
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 0.8;
      for (const dx of [-5, 0, 5]) { c.beginPath(); c.moveTo(x + dx - 1.5, top - h * 0.2); c.quadraticCurveTo(x + dx, top - h * 0.9, x + dx + 1.5, top - h * 0.2); c.stroke(); }
    }
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(x - w * 0.45, top - h * 0.7, 2.2, 1, -0.4, 0, TAU); c.fill();
    // ไอหอมลอยขึ้นตอนยังเต็ม ๆ (ชวนน้องมากิน)
    if (left > 0.6) {
      const u = (((ph % 90) + 90) % 90) / 90;
      c.globalAlpha = Math.sin(u * Math.PI) * 0.5; c.strokeStyle = '#FFFFFF'; c.lineWidth = 1.2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x - 3, top - h - 2 - u * 12); c.quadraticCurveTo(x + 1, top - h - 6 - u * 12, x - 2, top - h - 10 - u * 12); c.stroke();
    }
    c.restore();
  }
}

/** ทดสอบ (แผงทดสอบห้องเลี้ยง town/home-debug.js): สั่งน้องทุกตัวที่ว่างทำท่า — climb ปีนคอนโด · jump กระโดดเล่น · run วิ่งจู๊ดข้ามห้อง */
export function debugKits(kits, what) {
  const S = NURSE_SPOTS;
  let n = 0;
  for (const k of kits) {
    if (k.bathing || k.st === 'hop' || k.route || k.st === 'eat' || k.st === 'perch') continue;
    const ok = what === 'climb' ? !!S.condo : what === 'jump' || what === 'run' ? true
      : what === 'shelves' ? S.shelves && !kits.some((o) => o.parkour) : what === 'drink' ? S.water && !kits.some((o) => o.useWater) : what === 'litter' ? S.litter && !kits.some((o) => o.useLitter) : false;
    if (!ok) continue;
    unpair(k); k.spot = null;
    if (what === 'climb' && S.condo) goTo(k, S.condo.base + (n % 2 ? 14 : 0), 'climb');
    else if (what === 'jump') rest(k, 'jumpplay', 128);
    else if (what === 'run') goTo(k, k.x < (S.roam[0] + S.roam[1]) / 2 ? S.roam[1] - 60 : S.roam[0] + 60, 'sit', null, DASH, true);
    else if (what === 'shelves' && S.shelves && !kits.some((o) => o.parkour)) { k.parkour = true; goTo(k, S.shelves.start, 'shelfgo'); }
    else if (what === 'drink' && S.water && !kits.some((o) => o.useWater)) { k.useWater = true; goTo(k, S.water.stand, 'drink', S.water.sy, DASH, true); }   // ปุ่มทดสอบ = วิ่งไป (ไม่ต้องรอนาน)
    else if (what === 'litter' && S.litter && !kits.some((o) => o.useLitter)) { k.useLitter = true; goTo(k, S.litter.x, 'litter', GY + 3, DASH, true); }
    else continue;
    n++;
  }
  return n;
}

// ── ฟองกระเด็นตอนผู้เล่นเหยียบ/กระโดดลงอ่าง (ผู้ใช้ 15 พ.ย. 2026 "เหมือนน้ำพุในเมือง") — main.js เรียกคู่กับน้ำกระเซ็น ──
const FOAM_FX = [];
/** ฟองพุ่งออกจากจุด (x, y = ผิวน้ำในอ่าง) · power = แรงตก */
export function foamBurst(x, y, power = 3, t = 0) {
  const k = Math.min(1.5, 0.45 + Math.abs(power) / 10), n = Math.round(5 + k * 6), b = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    b.push({ ox: side * (4 + Math.random() * 8), vx: side * (0.35 + Math.random() * 1.1) * k, vy: -(0.7 + Math.random() * 1.3) * k, r: 2.2 + Math.random() * 3 * k, life: 50 + Math.random() * 40 });
  }
  FOAM_FX.push({ x, y, t0: t, b });
  if (FOAM_FX.length > 10) FOAM_FX.shift();
}
/** วาดฟองที่กระเด็น (ทับตัวผู้เล่น) — ลอยขึ้นช้า ๆ ส่ายนิด ๆ แล้วแตกหาย */
export function drawFoamBursts(c, t) {
  for (let i = FOAM_FX.length - 1; i >= 0; i--) {
    const F = FOAM_FX[i], a = t - F.t0;
    if (a > 95) { FOAM_FX.splice(i, 1); continue; }
    for (const q of F.b) {
      if (a > q.life) continue;
      const drag = 1 - Math.exp(-a / 18);
      const x = F.x + q.ox + q.vx * 18 * drag + Math.sin(a * 0.12 + q.ox) * 1.5;
      const y = F.y - 4 + q.vy * 18 * drag - a * 0.12;
      bubble(c, x, y, q.r, Math.min(1, (q.life - a) / 14));
    }
  }
}

// ── ฝักบัว (ผู้ใช้ 15 พ.ย. 2026: "ตอนน้องอาบน้ำ ให้มีน้ำไหลออกจากฝักบัว + เสียงน้ำ") ──
//   ฝักบัวทองในภาพอ่าง (home.js tubArt: หัวฝักบัวกลาง x = อ่าง − 32, ขอบล่าง GY − 124) · main.js เล่นเสียงน้ำตาม showerLevel()
let SHOWER = 0;
/** ฝักบัวเปิดแค่ไหน 0..1 (ค่อย ๆ เปิด/ปิด) */
export const showerLevel = () => SHOWER;
/** น้ำไหลจากฝักบัวลงอ่าง: สายน้ำใสบาง ๆ บานออกนิด + หยดน้ำวิ่งลง + ละอองกระเซ็นที่ผิวน้ำ (วาดก่อนตัวน้อง — สายน้ำอยู่หลังตัว) */
export function drawShower(c, tick) {
  const T = NURSE_SPOTS.tub;
  if (!T || SHOWER < 0.02) return;
  const a = SHOWER, hx = T.x - 38, top = GY - 124, bot = T.rim - 5, len = bot - top;
  c.save();
  c.lineCap = 'round';
  // สายน้ำ 5 สาย บานออกจากหัวฝักบัว
  for (let i = 0; i < 5; i++) {
    const o = (i - 2) * 3.2;
    const g = c.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, `rgba(205,236,255,${0.75 * a})`);
    g.addColorStop(1, `rgba(170,215,250,${0.3 * a})`);
    c.strokeStyle = g; c.lineWidth = 1.3;
    const sway = Math.sin(tick * 0.09 + i) * 0.6;
    c.beginPath(); c.moveTo(hx + o * 0.9, top); c.quadraticCurveTo(hx + o * 1.4 + sway, top + len * 0.5, hx + o * 2 + sway, bot); c.stroke();
  }
  // หยดน้ำวิ่งลงตามสาย
  for (let i = 0; i < 16; i++) {
    const u = (((tick * 0.05 + i * 0.37) % 1) + 1) % 1, o = ((i % 5) - 2) * 3.2;
    const x = hx + o * (0.9 + 1.1 * u), y = top + u * len;
    c.globalAlpha = a * (0.55 + 0.45 * Math.sin(u * Math.PI));
    c.fillStyle = i % 3 ? '#E6F6FF' : '#FFFFFF';
    c.beginPath(); c.ellipse(x, y, 0.9, 2.2, 0, 0, Math.PI * 2); c.fill();
  }
  // ละอองกระเซ็นที่ผิวน้ำ
  for (let i = 0; i < 8; i++) {
    const u = (((tick * 0.045 + i * 0.29) % 1) + 1) % 1, side = i % 2 ? 1 : -1;
    const x = hx + side * (3 + u * 9 + (i % 3) * 2), y = bot - Math.sin(u * Math.PI) * (5 + (i % 4) * 1.5);
    c.globalAlpha = a * (1 - u) * 0.9;
    c.fillStyle = '#FFFFFF';
    c.beginPath(); c.arc(x, y, 0.9 + (i % 2) * 0.4, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// ═══════════════ ยก/ลากน้อง (ผู้ใช้ 15 พ.ย. 2026: "แบบห้องเก่า — ยกลากไปวางที่ไหนก็ได้ ลากไปอาบน้ำ กินข้าว ฯลฯ
//   แกว่งไปมารัว ๆ ราว 5 วิ = น้องมึน หน้าเวียนหัว") — main.js ส่งนิ้ว (พิกัดโลก) มาทุกเฟรม ──
//   ยก = ห้อยจากหนังคอ แกว่งตามแรงลาก · จุดวาง (ที่นอน เบาะคอนโด ชั้นผนัง เปลญวน ม้านั่งริมหน้าต่าง อ่าง ชาม น้ำพุ ห้องน้ำ) เรืองตอนลากผ่าน
//   ปล่อยบนจุดวาง = ทำกิจกรรมนั้นเลย · ปล่อยกลางอากาศ = ร่วงลงพื้นตามแรงโน้มถ่วง ตัวแบนแล้วเด้ง
//   มึน (สูตรห้องเก่า catroom.js): นับเฉพาะ "แกว่งกลับทิศถี่ ๆ" ครบ ~5 วิ · ยกพาไปเฉย ๆ ไม่มึน · ปล่อยตอนมึน = ตาก้นหอย ดาวหมุนต่ออีก ~5 วิ
let GRAB = null;
const DIZZY_AFTER = 300;
export const grabbing = () => !!GRAB;

/** จุดวางทั้งหมด (เรียงจากชิ้นเล็กเจาะจง → พื้นที่ใหญ่ — ตัวแรกที่ตรงชนะ) */
let ZONES = null;
function dropZones() {
  if (ZONES) return ZONES;
  const S = NURSE_SPOTS, Z = [];
  for (const p of S.condo?.perches || []) Z.push({ kind: 'perch', spot: p, x0: p.x - 34, x1: p.x + 34, y0: p.y - 46, y1: p.y + 14, label: 'นั่งเบาะคอนโด' });
  for (const p of S.shelves?.path || []) Z.push({ kind: 'shelf', spot: p, x0: p.x - 30, x1: p.x + 30, y0: p.y - 46, y1: p.y + 12, label: p.sit ? 'นอนเปลญวน' : 'นั่งชั้นผนัง' });
  for (const p of S.seat?.spots || []) Z.push({ kind: 'seat', spot: p, x0: p.x - 44, x1: p.x + 44, y0: p.y - 46, y1: p.y + 14, label: 'นั่งดูวิว' });
  if (S.tub) Z.push({ kind: 'bath', x0: S.tub.x - 82, x1: S.tub.x + 82, y0: GY - 170, y1: GY - 28, label: 'อาบน้ำ' });
  for (const b of S.beds) Z.push({ kind: 'bed', spot: b, x0: b.x - 44, x1: b.x + 44, y0: GY - 120, y1: GY + 30, label: 'นอน' });
  if (S.bowls.length) Z.push({ kind: 'eat', x0: S.bowls[0].x - 28, x1: S.bowls[S.bowls.length - 1].x + 28, y0: GY - 90, y1: GY + 30, label: 'กินข้าว' });
  if (S.water) Z.push({ kind: 'drink', x0: S.water.x - 36, x1: S.water.x + 36, y0: GY - 90, y1: GY + 30, label: 'ดื่มน้ำ' });
  if (S.litter) Z.push({ kind: 'litter', x0: S.litter.x - 44, x1: S.litter.x + 44, y0: GY - 100, y1: GY + 30, label: 'เข้าห้องน้ำ' });
  return (ZONES = Z);
}
const zoneAt = (x, y) => dropZones().find((z) => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1) || null;

/** น้องตัวที่อยู่ใต้นิ้ว (พิกัดโลก) — ตัวหน้าสุดก่อน · ตัวที่มุดห้องน้ำอยู่ = แตะไม่ได้ */
export function kitAt(kits, wx, wy) {
  return [...kits].sort((a, b) => b.y - a.y).find((k) => k.st !== 'litter' && k.st !== 'held'
    && Math.abs(wx - k.x) <= 140 * k.k + 5 && wy >= k.y - 360 * k.k - 5 && wy <= k.y + 6) || null;
}
/** ปล่อยทุกอย่างที่น้องจอง/ทำค้างอยู่ (ถูกยกขึ้นกลางกิจกรรม) */
function releaseAll(k) {
  unpair(k);
  k.spot = null; k.inBed = null; k.route = null; k.parkour = false; k.useWater = false; k.useLitter = false;
  k.bathing = false; k.wantBath = false; k.hop = null; k.run = false; k.ty = null; k.afterFall = null; k.eatK = 0;
}
/** เริ่มยก (นิ้วลากเกิน 8 จุดจากตัวน้อง) · wx, wy = นิ้วตอนนี้ (พิกัดโลก) */
export function grabKit(kits, k, wx, wy) {
  releaseAll(k);
  k.st = 'held'; k.t = 0; k.swing = 0; k.dizzy = 0; k.woozy = false;
  GRAB = { k, wx, wy, offX: k.x - wx, offY: k.y - wy, lastX: k.x, lastY: k.y, lastDir: 0, lastDirY: 0, flipAt: undefined, zone: null, t: 0 };
  snd('kitMeow', k, 4, k.k < 0.17 ? 1.3 : 1.1);   // "เมี้ยว!" ตกใจนิด ๆ
}
/** นิ้วเลื่อน (main.js เรียกทุกเฟรมระหว่างยก — กล้องเลื่อนตามขอบจอ พิกัดโลกของนิ้วจึงเปลี่ยนเองได้) */
export function moveGrab(wx, wy) { if (GRAB) { GRAB.wx = wx; GRAB.wy = wy; } }

function stepHeld(k, kits, dt) {
  const G = GRAB;
  if (!G || G.k !== k) { rest(k, 'idle', 60); return; }
  G.t += dt;
  k.x = Math.max(NURSE_SPOTS.roam[0] - 40, Math.min(NURSE_SPOTS.roam[1] + 60, G.wx + G.offX));
  k.y = Math.max(70, Math.min(laneY(k), G.wy + G.offY));
  const vx = k.x - G.lastX, vy = k.y - G.lastY;
  G.lastX = k.x; G.lastY = k.y;
  // ตัวแกว่งตามแรงลาก แล้วค่อย ๆ นิ่ง เหมือนห้อยจากหนังคอ
  k.swing = (k.swing || 0) * Math.pow(0.86, dt) + Math.max(-14, Math.min(14, vx)) * 0.03;
  // แกว่งกลับทิศถี่ ๆ (ซ้าย-ขวา หรือ ขึ้น-ลง) = กำลังเขย่า/หมุนน้อง
  const dx = Math.abs(vx) > 3 ? Math.sign(vx) : 0, dyy = Math.abs(vy) > 3 ? Math.sign(vy) : 0;
  if (dx && G.lastDir && dx !== G.lastDir) G.flipAt = G.t;
  if (dyy && G.lastDirY && dyy !== G.lastDirY) G.flipAt = G.t;
  if (dx) G.lastDir = dx;
  if (dyy) G.lastDirY = dyy;
  const shaking = G.flipAt !== undefined && G.t - G.flipAt < 30;
  k.dizzy = Math.max(0, Math.min(1, (k.dizzy || 0) + (shaking ? dt / DIZZY_AFTER : -dt / 90)));
  const was = k.woozy;
  if (k.dizzy >= 1) k.woozy = true;
  else if (k.dizzy < 0.5) k.woozy = false;
  if (k.woozy && !was) snd('kitDizzy', k, 30);
  const z = zoneAt(k.x, k.y);
  if (z !== G.zone) { G.zone = z; if (z) snd('tick', k, 3); }
}

/** ร่วงลงพื้นตรงนั้น (ตามแรงโน้มถ่วง) แล้วค่อยทำ then */
function fallTo(k, then = null) {
  k.afterFall = then;
  const drop = laneY(k) - k.y;
  hopTo(k, k.x, laneY(k), 0, Math.max(6, Math.sqrt(Math.max(0, drop)) * 2.4), 'dropped');
  k.hop.fall = drop;
}
function afterDrop(k, kits, H) {
  if ((H.fall || 0) > 14) { k.land = 26; snd('kitLand', k, 4); }
  const then = k.afterFall; k.afterFall = null;
  const S = NURSE_SPOTS;
  if (then === 'eat' && k.bowl != null) { k.spot = bowlSpot(k); goTo(k, k.spot.x, 'eat', GY - 2); return; }
  if (then === 'drink' && S.water) { k.useWater = true; goTo(k, S.water.stand, 'drink', S.water.sy); return; }
  if (then === 'litter' && S.litter) { k.useLitter = true; goTo(k, S.litter.x, 'litter', GY + 3); return; }
  if (k.dizzyLeft > 0) { rest(k, 'dizzy', k.dizzyLeft); return; }
  rest(k, 'look', rnd(70, 130));
}

/** ปล่อยนิ้ว — อยู่เหนือจุดวาง = ทำกิจกรรมนั้น (ที่ไม่ว่าง = ร่วงลงพื้นแทน) · คืนชื่อกิจกรรม (main.js ขึ้นข้อความ) */
export function dropGrab(kits) {
  const G = GRAB;
  GRAB = null;
  if (!G) return null;
  const k = G.k, z = zoneAt(k.x, k.y);
  if (k.woozy) k.dizzyLeft = 300;   // ปล่อยตอนมึน = มึนต่ออีก ~5 วิ (ดาวหมุน ตาก้นหอย)
  k.woozy = false; k.dizzy = 0; k.swing = 0;
  const free = (spot) => spot && !taken(kits, k, spot);
  if (z?.kind === 'bath' && !kits.some((o) => o !== k && (o.bathing || o.wantBath))) {
    k.bathing = true; face(k, NURSE_SPOTS.tub.x); hopTo(k, NURSE_SPOTS.tub.x, NURSE_SPOTS.tub.y, 10, 16, 'bath');
  } else if (z?.kind === 'bed' && free(z.spot)) {
    k.spot = z.spot; hopTo(k, z.spot.x, z.spot.y, 8, 14, 'bed');
  } else if (z?.kind === 'perch' && free(z.spot)) {
    k.spot = z.spot; hopTo(k, z.spot.x, z.spot.y, 6, 12, 'perchland');
  } else if (z?.kind === 'shelf' && free(z.spot)) {
    k.spot = z.spot; hopTo(k, z.spot.x, z.spot.y, 6, 12, 'shelfland');
  } else if (z?.kind === 'seat' && free(z.spot)) {
    k.spot = z.spot; hopTo(k, z.spot.x, z.spot.y, 6, 12, 'window');
  } else if (z && (z.kind === 'eat' || z.kind === 'drink' || z.kind === 'litter')) {
    fallTo(k, z.kind);
  } else { fallTo(k); return null; }
  snd('kitHappy', k, 10);
  return z.label;
}

/** แตะน้อง (ไม่ได้ลาก) = ลูบ: หัวใจ + ร้องเหมียว + ครางเบา ๆ · น้องจริงได้ความผูกพัน (cats.js petCat วันละไม่เกิน 5) */
export function petKit(kits, k) {
  addHeart(k);
  k.meowT = 0;
  if (!k.cat.demoLv) { try { petCat(k.cat.id); } catch { /* ไม่บันทึก */ } }
  snd('purr', k, 40, 0.8);
  if (['idle', 'sit', 'walk', 'wait', 'sniff'].includes(k.st) && !k.other) rest(k, 'look', rnd(90, 150));
}

/** ตาก้นหอย (ทับตาท่าหน้าตรง — พิกัดตัวน้องจิบิ · ตำแหน่งตาเดียวกับ drawHead มุมหน้า) */
function spiralEyes(t) {
  return (c, L, sy) => {
    c.save();
    c.translate(0, -125 * (sy - 1));
    for (const ex of [-53.5, 53.5]) {
      c.fillStyle = '#FFFFFF'; c.strokeStyle = CHIBI_INK; c.lineWidth = 3.5;
      c.beginPath(); c.ellipse(ex, -199, 37, 35, 0, 0, TAU); c.fill(); c.stroke();
      c.lineWidth = 4.2; c.lineCap = 'round'; c.beginPath();
      const rot = t * 0.18 * (ex < 0 ? 1 : -1);
      for (let i = 0; i <= 44; i++) { const u = i / 44, a = u * Math.PI * 2 * 2.4 + rot, rr = 3 + u * 27; const px = ex + Math.cos(a) * rr, py = -199 + Math.sin(a) * rr * 0.94; if (i) c.lineTo(px, py); else c.moveTo(px, py); }
      c.stroke();
    }
    c.restore();
  };
}
/** ดาวมึนหมุนเป็นวงรอบหัว (พิกัดโลก) · k = ความชัด 0..1 */
function dizzyStars(c, kit, tick, a = 1, top = null) {
  const hx = kit.x, hy = top ?? kit.y - 352 * kit.k;
  for (let i = 0; i < 3; i++) {
    const ang = (tick + kit.tOff) * 0.12 + (i / 3) * TAU;
    const x = hx + Math.cos(ang) * 150 * kit.k, y = hy + Math.sin(ang) * 30 * kit.k, r = (28 + 6 * Math.sin(ang)) * kit.k;
    c.save(); c.globalAlpha = a * (0.6 + 0.4 * Math.sin(ang));
    c.fillStyle = '#FFD84D'; c.strokeStyle = '#E0A21E'; c.lineWidth = 0.8;
    c.beginPath();
    for (let j = 0; j < 10; j++) { const aa = (j / 10) * TAU - Math.PI / 2, rr = j % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr); }
    c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
}

/** วาดตอนยก: จุดวางใกล้ ๆ (เส้นประจาง) + จุดที่ตรงอยู่ (เรือง) + ตัวน้องห้อยแกว่ง + ดาวมึน + ป้ายกิจกรรม — บนสุด */
/** lit = แสงขอบ/เงาทอดแบบ drawKittens (ผู้ใช้ 16 พ.ย.: "ยกน้องลากไปมาแล้วแสงเงาหาย") */
export function drawGrab(c, kits, tick, lit = null) {
  const G = GRAB;
  if (!G) return;
  const k = G.k, pulse = 0.5 + 0.5 * Math.sin(tick * 0.15);
  for (const z of dropZones()) {
    const hot = z === G.zone;
    if (!hot && Math.abs((z.x0 + z.x1) / 2 - k.x) > 260) continue;
    c.save();
    c.globalAlpha = hot ? 0.55 + pulse * 0.35 : 0.3;
    c.fillStyle = hot ? 'rgba(255,236,150,.22)' : 'rgba(255,255,255,.06)';
    c.strokeStyle = hot ? '#FFF3B0' : '#FFFFFF';
    c.lineWidth = hot ? 2.6 : 1.2;
    c.setLineDash(hot ? [] : [5, 4]);
    c.beginPath(); c.roundRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0, 10); c.fill(); c.stroke();
    c.restore();
  }
  // เงาบนพื้นใต้ตัว (เล็กลงตามความสูง)
  const lift = Math.max(0, laneY(k) - k.y), sh = 1 - Math.min(0.6, lift / 120);
  if (!lit?.cast) {   // เงาทอดแบบใหม่เปิด = ไม่วาดวงรี (ห้ามซ้อน)
    c.save(); c.globalAlpha = 0.18 * sh; c.fillStyle = '#4A2A5A';
    c.beginPath(); c.ellipse(k.x, laneY(k) + 2, 110 * k.k * sh, 4 * sh, 0, 0, TAU); c.fill(); c.restore();
  }
  // ตัวห้อยจากหนังคอ (หมุนรอบจุดเหนือหัว) · มีชั้นแสง = แสงขอบ + เงาทอดลงพื้นใต้ตัว (จางลงตามความสูงที่ยก)
  const P = pose(k, tick), pvx = k.x, pvy = k.y - 330 * k.k;
  const body = (g) => {
    g.save(); g.translate(pvx, pvy); g.rotate(Math.max(-0.7, Math.min(0.7, k.swing || 0))); g.translate(-pvx, -pvy);
    drawChibi(g, k.x, k.y, k.k, { ...P, look: k.look });
    g.restore();
  };
  if (lit) lit.draw(c, k, laneY(k), body); else body(c);
  if (k.woozy) dizzyStars(c, k, tick, 1, pvy - 20 * k.k);
  for (const h of k.hearts) {
    const u = h.t / 70;
    c.save(); c.globalAlpha = 1 - u; c.fillStyle = '#FF8FB3';
    heart(c, k.x + h.x, pvy - 10 - u * 28, 5 + u * 2); c.fill(); c.restore();
  }
  if (G.zone) label(c, k.x, pvy - 26, G.zone.label, 'rgba(255,255,255,.95)', '#E0559F', 11);
}
