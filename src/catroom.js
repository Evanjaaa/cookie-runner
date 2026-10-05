// src/catroom.js
// ─────────────────────────────────────────────────────────────
// ตัวควบคุม "บ้านน้องแมว" — กล้อง น้องเดินเล่น และฉากตอนดูแล
//
// ไฟล์นี้ไม่แตะข้อมูลการเลี้ยงเลย (EXP ความหิว ทอง อยู่ใน cats.js กับ main.js)
// หน้าที่เดียวคือ "เล่นฉาก" ให้ตรงกับสิ่งที่ผู้เล่นกด:
//   ให้อาหาร  อาหารเทลงชาม → ร้องเรียก → น้องหูตั้ง วิ่งมาที่ชาม กล้องเลื่อนตาม → นั่งกิน
//   เล่น      ลูกบอลกลิ้งบนพรม น้องย่อตัวเล็งแล้วกระโดดตะครุบสามรอบ
//   อาบน้ำ    เดินไปกระโดดลงอ่าง ฟองฟู่ แล้วขึ้นมาสะบัดขน
//   นอน       ไปที่เตียง (ถ้ามีคนนอนอยู่ไปม้านั่ง/เปล) ขดตัวหลับ มี zzz ลอย
// ไม่ได้กดอะไร น้องเดินเล่นเอง นั่ง เลีย หาว ขึ้นไปนั่งริมหน้าต่าง นอนในเปล
//
// ── มุมมอง ──
// ตอนเดินใช้ท่าวิ่งด้านข้างตัวเดียวกับในด่าน (drawPlayer) กลับซ้ายขวาตามทิศ
// ตอนหยุดใช้ท่าหน้าตรงชุดเดียวกับหน้าแรก (drawCatPose) — ทุกท่าเป็นของเดิมในเกม
//
// วาดบนผ้าใบหลักของเกม ผ่าน Game (game.catRoom) ไม่มีลูปของตัวเอง
// ─────────────────────────────────────────────────────────────
import { VIEW, GROUND_Y } from './config.js';
import {
  CATROOM_W, LANE_Y, SPOTS, drawCatRoomBack, drawCatRoomLight, drawCatRoomFront,
  drawTubFront, drawBoxFront, drawBowlFront, drawWaterFront, drawHammockFront, drawTreeBall, TREE_BALL,
  TREE_HOLE, drawHoleFront,
} from './render/catroom.js';
import { drawCatPose, drawPlayer } from './render/entities.js';
import { roomCats, waitingCats, levelOf, sizeOf, isSad, nameOf } from './cats.js';
import { catSkin } from './skins.js';
import { drawItemIcon } from './render/items.js';
import { sfx } from './audio.js';
import { t as tr } from './i18n.js';

/** หน่วงเสียงในฉากเดียวกัน (setTimeout ธรรมดา — ฉากในบ้านไม่มีปุ่มหยุดเกมให้ต้องล้างคิว) */
const later = (fn, ms) => setTimeout(fn, ms);

const MAX_CAM = CATROOM_W - VIEW.W;
/** ขนาดตัวโตเต็มวัยในห้อง — เล็กกว่าหน้าแรก (2.6) เพราะห้องหนึ่งมีได้สามตัว */
const ADULT = 1.85;
const WALK = 1.15;   // หน่วยต่อเฟรม
const RUN = 3.6;
/** เดินไปทำกิจกรรมที่ผู้เล่นกด — เร็วกว่าเดินเล่น ห้องกว้างสองจอ ไม่งั้นต้องรอนาน */
const BRISK = 2.6;
/** แนวเท้าของแต่ละตัว ห่างกันนิดหน่อย น้องสามตัวจะได้ไม่ยืนทับเส้นเดียวกัน */
const LANES = [LANE_Y - 6, LANE_Y + 4, LANE_Y + 14];

/** ท่าพักตอนว่าง วนสุ่ม — ทุกท่ามาจาก IDLE_SHAPE ของหน้าแรก */
const IDLE_POSES = ['stand', 'sit', 'groom', 'sit', 'yawn', 'knead', 'loaf'];

/** จุดขึ้นไปนั่ง/นอนได้ ที่ไม่ใช่พื้น */
const PERCHES = {
  // เตียงนอนได้สามตัว — แต่ละที่นอนเป็นจุดของตัวเอง ไม่แย่งกัน
  bed0: SPOTS.beds[0],
  bed1: SPOTS.beds[1],
  bed2: SPOTS.beds[2],
  seat: SPOTS.seat,
  hammock: SPOTS.hammock,
  // คอนโดแมวกับชั้นบนผนัง — ขึ้นไปได้ทีละแท่นตามทาง (TREE_ROUTES)
  treeLow: SPOTS.treeLow,
  treeMid: SPOTS.treeMid,
  treeTop: SPOTS.treeTop,
  treeHouse: SPOTS.treeHouse,
  shelfLow: SPOTS.shelfLow,
  shelfHigh: SPOTS.shelfHigh,
};
const BEDS = ['bed1', 'bed0', 'bed2'];

/**
 * ทางปีน — จุดสูงบนคอนโดไปถึงได้ทีละแท่น ไม่กระโดดจากพื้นขึ้นยอดทีเดียว
 * จุดที่ไม่อยู่ในตารางนี้ (เตียง ม้านั่ง เปล) กระโดดจากพื้นทีเดียวถึง
 */
const TREE_ROUTES = {
  treeLow: ['treeLow'],
  treeMid: ['treeLow', 'treeMid'],
  treeTop: ['treeLow', 'treeTop'],
  // บ้านกล่อง: ขึ้นแท่นล่างก่อนแล้วกระโดดมุดเข้ารู
  treeHouse: ['treeLow', 'treeHouse'],
  shelfLow: ['treeLow', 'treeMid', 'shelfLow'],
  shelfHigh: ['treeLow', 'treeMid', 'shelfLow', 'shelfHigh'],
};
const routeTo = (name) => TREE_ROUTES[name] || [name];
const CLIMBS = ['treeLow', 'treeMid', 'treeTop', 'treeHouse', 'shelfLow', 'shelfHigh'];

/**
 * จุดที่ลากน้องไปวางแล้วเริ่มกิจกรรมได้ (พิกัดห้อง) — เทียบกับ "เท้า" ของน้องที่ถืออยู่
 * กรอบกว้างกว่าตัวของจริงพอสมควร วางคลาดนิดหน่อยก็ยังติด (นิ้วบนมือถือไม่แม่นเท่าเมาส์)
 */
const DROPS = [
  { act: 'feed', label: 'ให้อาหาร', x0: 70, x1: 262, y0: 290, y1: 400 },
  { act: 'drink', label: 'ให้น้ำ', x0: 262, x1: 334, y0: 290, y1: 400 },
  { act: 'bathe', label: 'อาบน้ำ', x0: SPOTS.tub.x - 75, x1: SPOTS.tub.x + 75, y0: 262, y1: 372 },
  { act: 'sleep', label: 'พาไปนอน', at: 'bed', x0: SPOTS.beds[0].x - 70, x1: SPOTS.beds[2].x + 70, y0: 170, y1: 340 },
  { act: 'sleep', label: 'พาไปนอน', at: 'seat', x0: SPOTS.seat.x - 110, x1: SPOTS.seat.x + 110, y0: 220, y1: 330 },
  // เปลอยู่ในโซนคอนโด ต้องมาก่อนโซนคอนโด — จุดวางที่เจาะจงกว่าต้องได้ลองก่อน
  { act: 'sleep', label: 'พาไปนอน', at: 'hammock', x0: SPOTS.hammock.x - 48, x1: SPOTS.hammock.x + 48, y0: 280, y1: 350 },
  { act: 'perch', label: 'เข้าบ้าน', at: 'treeHouse', x0: SPOTS.treeHouse.x - 38, x1: SPOTS.treeHouse.x + 38, y0: 120, y1: 200 },
  { act: 'perch', label: 'นั่งบนชั้น', at: 'shelfHigh', x0: SPOTS.shelfHigh.x - 44, x1: SPOTS.shelfHigh.x + 44, y0: 80, y1: 170 },
  { act: 'perch', label: 'นั่งบนชั้น', at: 'shelfLow', x0: SPOTS.shelfLow.x - 44, x1: SPOTS.shelfLow.x + 44, y0: 171, y1: 250 },
  { act: 'play', label: 'เล่นคอนโด', tree: true, x0: SPOTS.treeLow.x - 50, x1: SPOTS.treeMid.x + 50, y0: 80, y1: 372 },
  { act: 'play', label: 'เล่นด้วย', x0: SPOTS.toys.x - 65, x1: SPOTS.toys.x + 65, y0: 270, y1: 372 },
];

const rand = (a, b) => a + Math.random() * (b - a);

/**
 * จังหวะท่ากินข้าว — หนึ่ง "คำ" ยาว EAT_BITE เฟรม แบ่งเป็นช่วง (สัดส่วน 0-1 ของคำ):
 *   0.00-0.22  ก้มหัวลงชาม หูเอียงไปข้างหน้า
 *   0.22-0.34  อ้าปากงับ "งั่ม" (เสียงกรุบ/งั่มดังตรงนี้ — ดู stepAct)
 *   0.34-1.00  เงยขึ้นครึ่งทาง เคี้ยวงั่ม ๆ ปากขยับสามที หลับตายิ้ม หัวโยก หางกระดิก
 * ทุกคำที่ EAT_YUM เงยหน้าขึ้นเลียปาก (แลบลิ้น) ตาเป็นประกาย มีหัวใจเด้ง = อร่อยมาก
 */
const EAT_BITE = 34;
const EAT_YUM = 4;
const BITE_AT = 0.22;

const smooth = (x) => { const v = clamp(x, 0, 1); return v * v * (3 - 2 * v); };
const lo0 = () => SPOTS.play[0];
const hi0 = () => SPOTS.play[1];

/**
 * จังหวะท่าดื่มน้ำ — ก้มหัวลงชามน้ำแล้วเลียแผล็บ ๆ ถี่ ๆ (แมวจริงเลียน้ำเร็วมาก)
 * หนึ่งแผล็บยาว SIP เฟรม ลิ้นแลบช่วงต้นของแผล็บ (เสียงจุ๊บดังตรงนั้น ดู stepAct)
 * ทุก ๆ DRINK_REST เฟรม เงยหน้าขึ้นพักหายใจ เลียปากหนึ่งที แล้วก้มดื่มต่อ
 */
const SIP = 11;
const DRINK_REST = 88;

function drinkShape(t) {
  const cyc = t % DRINK_REST;
  // ช่วงเงยหน้าพัก (22 เฟรมท้ายของรอบ)
  if (cyc > DRINK_REST - 22) {
    const k = (cyc - (DRINK_REST - 22)) / 22;
    const up = Math.sin(k * Math.PI);
    return {
      shape: { sit: 0.3, crouch: 0.7 * (1 - up), tilt: -0.08 * up, mouth: k > 0.35 && k < 0.6 ? 1 : 0, wag: 0.4 * Math.sin(t * 0.25) },
      mood: 'happy',
    };
  }
  const lap = (t % SIP) / SIP < 0.45;
  return {
    shape: { sit: 0.3, crouch: 0.78, ear: -0.2, mouth: lap ? 1 : 0, sy: lap ? -0.03 : 0, wag: 0.35 * Math.sin(t * 0.2) },
    mood: 'happy',
  };
}

/** รูปร่างท่ากิน ณ เฟรม t ของการกิน (ส่งเข้า drawCatPose เป็น idle.shape) */
function eatShape(t) {
  const n = Math.floor(t / EAT_BITE);
  const ph = (t % EAT_BITE) / EAT_BITE;
  // คำที่เงยหน้าเลียปาก
  if (n % EAT_YUM === EAT_YUM - 1) {
    const up = smooth(ph / 0.25) * (1 - smooth((ph - 0.8) / 0.2));
    return {
      shape: { sit: 0.35, crouch: 0.15 * (1 - up), tilt: -0.12 * up, mouth: ph > 0.25 && ph < 0.7 ? 1 : 0, wag: 0.6 * Math.sin(t * 0.3) },
      mood: ph > 0.25 && ph < 0.7 ? 'happy' : 'starry',
    };
  }
  // ก้ม → งับ → เคี้ยว
  const dip = ph < BITE_AT ? smooth(ph / BITE_AT) : ph < 0.34 ? 1 : 1 - smooth((ph - 0.34) / 0.3) * 0.55;
  const bite = ph >= BITE_AT && ph < 0.34;
  // เคี้ยวสามทีในช่วงที่เหลือ — ปากเปิด/ปิดสลับเร็ว ๆ
  const chew = ph >= 0.34 ? Math.sin(((ph - 0.34) / 0.66) * Math.PI * 6) > 0.2 : false;
  return {
    shape: {
      sit: 0.3,
      crouch: dip * 0.62,
      // งับแล้วตัวยุบลงนิดหนึ่ง (squash) แล้วเด้งคืนตอนเคี้ยว
      sy: bite ? -0.06 : 0,
      sx: bite ? 0.05 : 0,
      ear: -0.25 * dip,
      tilt: ph >= 0.34 ? Math.sin(t * 0.32) * 0.07 : 0,
      mouth: bite || chew ? 1 : 0,
      wag: 0.5 * Math.sin(t * 0.22),
    },
    mood: ph >= 0.34 ? 'happy' : '',
  };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * หัวใจทรงป่อง ปลายมน — แทนตัวอักษร ♥ ของฟอนต์ที่ปลายแหลมเป็นเข็ม
 * สองพูกลมบน แล้วโค้งลงมาบรรจบกันเป็นปลายมน ๆ (ไม่ใช่มุมแหลม)
 * ตีขอบเข้มก่อนแบบหนา + มุมมน แล้วค่อยเติมสี ขอบจึงมนตามรูปทั้งดวง
 */
function softHeart(ctx, x, y, r, fill) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, r * 1.05);
  ctx.bezierCurveTo(-r * 0.35, r * 0.85, -r * 1.25, r * 0.25, -r * 1.2, -r * 0.3);
  ctx.bezierCurveTo(-r * 1.15, -r * 1.05, -r * 0.2, -r * 1.15, 0, -r * 0.45);
  ctx.bezierCurveTo(r * 0.2, -r * 1.15, r * 1.15, -r * 1.05, r * 1.2, -r * 0.3);
  ctx.bezierCurveTo(r * 1.25, r * 0.25, r * 0.35, r * 0.85, 0, r * 1.05);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.4;
  ctx.strokeStyle = 'rgba(58,29,80,.9)';
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
  // ประกายเล็ก ๆ บนพูซ้าย
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.55, -r * 0.45, r * 0.24, r * 0.16, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** กลางวัน 6:00-18:00 ตามเวลาไทย */
export function isNightNow(d = new Date()) {
  const h = (d.getUTCHours() + 7) % 24;
  return h < 6 || h >= 18;
}

export class CatRoom {
  constructor() {
    this.cam = 1080;         // เปิดมาที่กลางห้อง (ม้านั่งริมหน้าต่าง)
    this.camGoal = null;     // เป้าที่กล้องกำลังเลื่อนไปเอง
    this.follow = null;      // ตามตัวไหนอยู่
    this.vel = 0;            // แรงเหวี่ยงหลังปล่อยนิ้ว
    this.drag = null;
    this.t = 0;
    this.actors = new Map();
    this.waitActor = null;
    this.selected = null;
    this.fx = [];            // หัวใจ zzz ฟอง เศษอาหาร
    this.floats = [];        // ตัวเลขลอย +EXP
    this.fills = [0, 0, 0];
    this.kinds = ['kibble', 'kibble', 'kibble'];
    this.toy = null;         // ของเล่นที่กลิ้งอยู่บนพรม
    this.night = isNightNow();
    this.ball = { ang: 0, vel: 0 };   // ลูกบอลห้อยบนคอนโด (ดู TREE_BALL)
    this.onTapCat = null;
    this.onActDone = null;
    // ไปเยี่ยมบ้านเพื่อน: { room: [น้อง], wait: น้อง|null } แทนน้องของเรา (ดู visitorCat ใน cats.js)
    // null = บ้านของเราเอง
    this.source = null;
  }

  // ── ข้อมูล → ตัวละครในห้อง ────────────────────────────────

  /** อ่านน้องจาก cats.js ใหม่ — เรียกตอนเปิดห้องและหลังทุกการเปลี่ยนแปลงข้อมูล */
  sync() {
    const room = this.source ? this.source.room : roomCats();
    const keep = new Set(room.map((c) => c.id));
    for (const id of [...this.actors.keys()]) if (!keep.has(id)) this.actors.delete(id);
    room.forEach((c, i) => {
      let a = this.actors.get(c.id);
      if (!a) {
        a = {
          id: c.id, x: rand(300, 1500), y: LANES[i % 3], lane: LANES[i % 3], dir: Math.random() < 0.5 ? -1 : 1,
          mode: 'idle', wait: rand(30, 160), pose: 'sit', poseK: 0, perch: null,
          runPhase: Math.random() * 6, act: null, hop: null, bubble: null, react: 0, then: null,
        };
        this.actors.set(c.id, a);
      }
      a.cat = c;
      a.bowl = i;
      a.skin = catSkin(c);
      a.size = ADULT * sizeOf(levelOf(c));
      a.sad = isSad(c);
    });
    const w = this.source ? this.source.wait : waitingCats()[0];
    this.waitActor = w ? { id: w.id, cat: w, skin: catSkin(w), size: ADULT * sizeOf(1) } : null;
    if (this.selected && !keep.has(this.selected) && this.waitActor?.id !== this.selected) this.selected = null;
    if (!this.selected) this.selected = room[0]?.id || this.waitActor?.id || null;
  }

  open(selectId = null) {
    this.night = isNightNow();
    this.sync();
    if (selectId) this.selected = selectId;
    const a = this.actorOf(this.selected);
    this.cam = a ? clamp(a.x - VIEW.W / 2, 0, MAX_CAM) : 1080;
    this.camGoal = null;
    this.follow = null;
  }

  actorOf(id) {
    if (!id) return null;
    if (this.waitActor?.id === id) return { ...this.waitActor, x: SPOTS.box.x, y: SPOTS.box.y - 24, waiting: true };
    return this.actors.get(id) || null;
  }

  /** กำลังเล่นฉากดูแลอยู่ไหม (เดินเล่นเองไม่นับ — กดดูแลแทรกได้เสมอ) */
  isBusy(id) {
    const a = this.actors.get(id);
    return !!a && !!a.task;
  }

  select(id) {
    this.selected = id;
  }

  /** เลื่อนกล้องไปหาน้องตัวนี้ */
  focus(id) {
    const a = this.actorOf(id);
    if (!a) return;
    this.follow = a.waiting ? null : id;
    this.camGoal = clamp(a.x - VIEW.W / 2, 0, MAX_CAM);
  }

  // ── การเคลื่อนที่ ────────────────────────────────────────

  /** เดิน (หรือวิ่ง) ไปที่ x บนพื้น แล้วค่อยกระโดดขึ้นจุดนั่ง (ถ้ามี) */
  goTo(a, x, { speed = WALK, perch = null, y = null, then = null } = {}) {
    const go = () => {
      a.mode = 'walk';
      // จะขึ้นไปนั่งที่สูง = เดินบนพรมไปจนถึงใต้จุดนั้นก่อน แล้วค่อยกระโดดขึ้น (ดู step)
      // ถ้าเล็ง y ของเบาะตั้งแต่ออกเดิน ตัวจะค่อย ๆ ลอยขึ้นกลางทาง = เดินลอยเหนือพื้น
      a.target = { x, y: perch ? a.lane : (y ?? a.lane), perch };
      a.speed = speed;
      a.then = then;
      a.dir = x >= a.x ? 1 : -1;
    };
    // อยู่บนที่สูงอยู่ ต้องลงมาตามทางที่ขึ้นไปก่อน (คอนโดลงทีละแท่น)
    if (a.stack?.length || a.perch) {
      this.descendTo(a, 0, go);
      return;
    }
    go();
  }

  /**
   * ปีนไปจุดสูง (เตียง ม้านั่ง เปล แท่นคอนโด ชั้นบนผนัง) — เดินบนพรมไปถึงใต้จุดแรกของทาง
   * แล้วกระโดดขึ้นทีละแท่น ถ้าอยู่บนคอนโดอยู่แล้วและทางซ้อนกัน ไม่ต้องลงถึงพื้น
   */
  climbTo(a, name, then, speed = WALK) {
    const route = routeTo(name);
    a.goal = name;
    const done = then;
    then = () => { a.goal = null; if (done) done(); };
    const stack = a.stack || [];
    let keep = 0;
    while (keep < stack.length && keep < route.length && stack[keep] === route[keep]) keep++;
    const up = () => this.hopChain(a, route.slice(keep), then);
    if (stack.length) {
      this.descendTo(a, keep, () => (keep ? up() : this.walkThenUp(a, route, then, speed)));
      return;
    }
    this.walkThenUp(a, route, then, speed);
  }

  walkThenUp(a, route, then, speed) {
    const first = PERCHES[route[0]];
    this.goTo(a, first.x + (route.length > 1 ? 0 : rand(-12, 12)), {
      speed,
      then: () => this.hopChain(a, route, then),
    });
  }

  /** กระโดดต่อกันทีละจุดตามรายชื่อ */
  hopChain(a, names, then) {
    if (!names.length) { if (then) then(); return; }
    const [name, ...rest] = names;
    const p = PERCHES[name];
    const dy = Math.abs(a.y - p.y);
    this.hop(a, p.x, p.y, () => {
      a.stack = [...(a.stack || []), name];
      a.perch = p;
      a.perchName = name;
      this.hopChain(a, rest, then);
    }, 'auto', Math.max(26, Math.min(70, dy * 0.4 + 22)));
  }

  /** ลงจากที่สูงทีละแท่นจนเหลือ depth แท่น (0 = ลงถึงพรม) */
  descendTo(a, depth, then) {
    const stack = a.stack || [];
    if (!stack.length && a.perch) {
      // ขึ้นมาด้วยทางเก่า (ไม่มีประวัติทาง) — กระโดดลงพรมตรง ๆ
      a.perch = null;
      a.perchName = null;
      this.hop(a, a.x + (a.x < 900 ? 40 : -40), a.lane, then);
      return;
    }
    if (stack.length <= depth) { if (then) then(); return; }
    stack.pop();
    a.stack = stack;
    if (stack.length) {
      const name = stack[stack.length - 1];
      const p = PERCHES[name];
      a.perch = p;
      a.perchName = name;
      this.hop(a, p.x, p.y, () => this.descendTo(a, depth, then), 'auto', 30);
    } else {
      a.perch = null;
      a.perchName = null;
      const out = a.x + (a.x < 900 ? 40 : -40);
      this.hop(a, out, a.lane, then, 'auto', 34);
    }
  }

  /** ค้างท่าหนึ่งชั่วครู่แล้วไปต่อ (ใช้ร้อยฉากเล่นคอนโด) */
  actFor(a, kind, frames, then) {
    a.mode = 'act';
    a.act = { kind, t: 0, dur: frames, then };
  }

  /**
   * กระโดด — land บอกเสียงตอนลง: 'auto' = เดาจากที่ที่ลง (เบาะ = ฟุ่บ / พื้น = ตุ้บ)
   * 'none' = ผู้เรียกเล่นเสียงลงเอง (เช่นกระโดดลงอ่างเป็นเสียงน้ำกระเซ็น)
   */
  hop(a, toX, toY, then, land = 'auto', height = 44) {
    a.mode = 'hop';
    a.hop = { fx: a.x, fy: a.y, tx: toX, ty: toY, t: 0, dur: height < 30 ? 16 : 26, land, height };
    a.dir = toX >= a.x ? 1 : -1;
    a.then = then;
    if (this.hear(a)) sfx.bounce();
  }

  /**
   * น้องตัวนี้อยู่ในจอไหม — เสียงท่าทางเล่นเฉพาะตัวที่เห็นอยู่
   * ห้องกว้างสองจอกว่า น้องที่อยู่อีกฝั่งของห้องส่งเสียงด้วยจะฟังรกและไม่รู้ว่าเสียงมาจากไหน
   */
  hear(a) {
    return a.x > this.cam - 80 && a.x < this.cam + VIEW.W + 80;
  }

  /** จุดนี้ว่างไหม — ตัวที่นั่งอยู่และตัวที่ "กำลังเดินไป" (จองไว้) นับว่าไม่ว่าง กันสองตัวไปทับกัน */
  perchFree(name, me) {
    for (const a of this.actors.values()) {
      if (a !== me && (a.perchName === name || a.goal === name)) return false;
    }
    return true;
  }

  /**
   * จุดพักบนพื้นที่ไม่ทับตัวอื่น — สุ่มใหม่จนห่างจากทุกตัว (ทั้งที่ยืนอยู่และที่กำลังเดินไป)
   * ไม่น้อยกว่า gap หน่วย ลองสิบครั้งแล้วยังไม่ได้ก็เอาจุดที่ห่างที่สุดที่เจอ
   */
  freeFloorX(a, around, spread = 420, gap = 70) {
    const [lo, hi] = SPOTS.roam;
    const others = [...this.actors.values()].filter((o) => o !== a && !o.perch && o.mode !== 'held');
    let best = null;
    for (let i = 0; i < 10; i++) {
      const x = clamp(around + rand(-spread, spread), lo, hi);
      const near = Math.min(Infinity, ...others.map((o) => Math.min(Math.abs(o.x - x), Math.abs((o.target?.x ?? o.x) - x))));
      if (near >= gap) return x;
      if (!best || near > best.near) best = { x, near };
    }
    return best.x;
  }

  /** ว่างแล้ว เลือกว่าจะทำอะไรต่อ */
  wander(a) {
    if (a.social) return;   // อยู่ในวงเล่นกับเพื่อน วงเป็นคนสั่ง
    const r = Math.random();
    const pick = (name) => (this.perchFree(name, a) ? name : null);
    let perch = null;
    if (!a.sad) {
      if (r < 0.1) perch = pick('seat');
      else if (r < 0.16) perch = pick('hammock');
      else if (r < 0.22) perch = BEDS.find((b) => this.perchFree(b, a)) || null;
      // ปีนคอนโด/กระโดดขึ้นชั้นบนผนังเล่น
      else if (r < 0.4) {
        const free = CLIMBS.filter((n) => this.perchFree(n, a));
        perch = free[Math.floor(Math.random() * free.length)] || null;
      }
    }
    if (perch) {
      this.climbTo(a, perch, () => {
        // ขึ้นแท่นล่างแล้วบางทีตะปบลูกบอลที่ห้อยอยู่เล่นเอง
        if (perch === 'treeLow' && Math.random() < 0.6) {
          this.actFor(a, 'swat', 70, () => this.rest(a, 'sit', rand(200, 400)));
          return;
        }
        const pose = perch === 'hammock' || BEDS.includes(perch) ? 'loaf' : Math.random() < 0.5 ? 'sit' : 'loaf';
        this.rest(a, pose, rand(300, 700));
      });
      return;
    }
    const [lo, hi] = SPOTS.roam;
    const x = this.freeFloorX(a, a.x);
    void lo; void hi;
    this.goTo(a, x, {
      speed: a.sad ? WALK * 0.7 : WALK,
      then: () => this.rest(a, a.sad ? 'loaf' : IDLE_POSES[Math.floor(Math.random() * IDLE_POSES.length)], rand(160, 420)),
    });
  }

  /** พักท่าหนึ่งค้างไว้ */
  rest(a, pose, frames) {
    a.mode = 'idle';
    a.pose = pose;
    a.wait = frames;
    if (!this.hear(a)) return;
    // เสียงประจำท่า — สุ่มให้ไม่ดังทุกครั้ง ไม่งั้นห้องจะร้องตลอดเวลา
    const r = Math.random();
    if (pose === 'yawn' && r < 0.6) later(() => sfx.yawn(), 200);
    else if (pose === 'knead' && r < 0.5) sfx.purr();
    else if (pose === 'groom' && r < 0.6) [0, 260, 520].forEach((ms) => later(() => sfx.lick(), ms));
    else if (pose === 'loaf' && r < 0.25) sfx.snooze();
    else if (pose === 'sit' && r < 0.15) sfx.mew();
  }

  // ── ฉากตอนดูแล ──────────────────────────────────────────

  /**
   * ให้อาหาร: เทอาหาร → ร้องเรียก → น้องวิ่งมาที่ชามของตัวเอง → นั่งกิน
   * onDone เรียกตอนกินเสร็จ (หน้าจอโชว์ +EXP ตอนนั้น จะได้ตรงกับภาพ)
   */
  feed(id, kind, onDone) {
    const a = this.actors.get(id);
    if (!a) return;
    const b = SPOTS.bowls[a.bowl];
    this.fills[a.bowl] = 1;
    this.kinds[a.bowl] = kind;
    // เคาะชาม "ติ๊ง ติ๊ง" → เทอาหารกรุบกรับลงชาม
    sfx.bowlTap();
    later(() => sfx.pour(), 260);
    this.burst(b.x, b.y - 10, 'crumb', 8);
    // เรียกน้อง — หูตั้ง มีเครื่องหมายตกใจ แล้วออกวิ่ง
    this.cancel(a);
    a.task = 'feed';
    a.bubble = { text: '!', t: 50 };
    a.mode = 'idle';
    a.pose = 'puff';
    a.wait = 9999;
    // น้องได้ยินแล้วร้องรับ "เหมียว~" ดีใจ
    later(() => sfx.trill(), 420);
    this.camGoal = clamp(b.x - VIEW.W / 2 + 120, 0, MAX_CAM);
    this.follow = id;
    setTimeout(() => {
      // วิ่งมาตามพรมจนถึงหน้าชาม แล้วกระโดดเตี้ย ๆ ไปยืนหลังชาม — ชามจึงอยู่หน้าตัวเสมอ
      // (เดิมเดินเฉียงขึ้นไปตรง ๆ ตัวเลยลากผ่านชามใบอื่นและนั่งทับชามของตัวเอง)
      this.goTo(a, b.x, {
        speed: RUN,
        then: () => this.hop(a, b.x, b.y - 10, () => {
          a.act = { kind: 'eat', t: 0, dur: 240, onDone, food: kind };
          a.mode = 'act';
          a.pose = 'groom';
          a.dir = 1;
        }, 'none', 12),
      });
    }, 420);
  }

  play(id, toy, onDone) {
    const a = this.actors.get(id);
    if (!a) return;
    this.cancel(a);
    a.task = 'play';
    const [lo, hi] = SPOTS.play;
    // ── ของเล่นแต่ละชิ้นเล่นคนละแบบ ──
    //   yarn     ลูกไหมกลิ้งไปบนพรม คลายเส้นไหมเป็นทางยาว ตะปบแล้วกลิ้งต่อ จบด้วยนอนหงายกอดไหม
    //   ball     บอลกระดิ่งเด้งดึ๋งขึ้นลง กรุ๊งกริ๊งทุกครั้งที่กระทบพื้น น้องกระโดดสูงรับกลางอากาศ
    //   mouse    หนูของเล่นวิ่งดุ๊กดิ๊กไปมาเอง น้องย่องเล็งนาน ๆ แล้วพุ่งตะครุบ หนูจี๊ดแล้วตีลังกาหนี
    //   feather  ไม้ตกแมวห้อยลงมาจากข้างบน ขนนกส่ายไปมา น้องยืนสองขาตบแล้วกระโดดตรงขึ้นไปคว้า
    const t = { kind: toy, x: rand(lo, hi), y: a.lane + 4, vx: 0, spin: 0, h: 0, vy: 0, dir: 1, flip: 0, x0: 0 };
    if (toy === 'yarn') t.x0 = t.x;
    if (toy === 'ball') { t.h = 70; t.vy = 0; }
    if (toy === 'mouse') { t.dir = Math.random() < 0.5 ? -1 : 1; t.run = 1.4; }
    if (toy === 'feather') { t.h = 66; t.base = t.x; }
    this.toy = t;
    this.toySound();
    this.focus(id);
    this.camGoal = clamp(this.toy.x - VIEW.W / 2, 0, MAX_CAM);
    a.act = { kind: 'play', t: 0, dur: 0, left: toy === 'feather' ? 4 : 3, onDone };
    this.chaseToy(a);
  }

  chaseToy(a) {
    const toy = this.toy;
    if (!toy) return;
    // ไม้ตกแมว: ไปยืนใต้ขนนกพอดี แล้วยืนสองขาตบ
    if (toy.kind === 'feather') {
      this.goTo(a, toy.x, {
        speed: RUN * 0.7,
        then: () => {
          a.mode = 'act';
          a.pose = 'wave';
          a.poseK = 0;
          a.act.t = 0;
          a.act.dur = rand(50, 80);
          a.act.stage = 'reach';
        },
      });
      return;
    }
    // หนู: ย่องเข้าไปไม่ใกล้มาก (หนูวิ่งตลอด) แล้วเล็งนานกว่าของเล่นอื่น
    const gap = toy.kind === 'mouse' ? 120 : 46;
    this.goTo(a, toy.x - gap * Math.sign(toy.x - a.x || 1), {
      speed: toy.kind === 'mouse' ? WALK * 1.4 : RUN * 0.8,
      then: () => {
        // ย่อตัวเล็ง (ส่งเสียงแง้บ ๆ แบบจ้องนก) แล้วตะครุบ
        a.mode = 'act';
        a.pose = 'wiggle';
        sfx.chirp();
        a.act.t = 0;
        a.act.dur = toy.kind === 'mouse' ? 70 : 50;
        a.act.stage = 'aim';
      },
    });
  }

  /**
   * ดื่มน้ำ — ฟรี: น้องเดินมาตามพรมถึงหน้าชามน้ำ กระโดดเตี้ย ๆ ไปหลังชาม แล้วเลียน้ำแผล็บ ๆ
   * ชามน้ำมีใบเดียว ถ้ามีตัวอื่นดื่มอยู่ ไปยืนเยื้องข้าง ๆ (ยังอยู่หลังชาม)
   */
  drink(id, onDone) {
    const a = this.actors.get(id);
    if (!a) return;
    this.cancel(a);
    a.task = 'drink';
    this.focus(id);
    const w = SPOTS.water;
    const busy = [...this.actors.values()].some((o) => o !== a && o.act?.kind === 'drink');
    const x = w.x + (busy ? 22 : 0);
    sfx.trill();
    this.goTo(a, x, {
      speed: BRISK,
      then: () => this.hop(a, x, w.y - 10, () => {
        a.act = { kind: 'drink', t: 0, dur: 230, onDone };
        a.mode = 'act';
        a.dir = 1;
      }, 'none', 12),
    });
  }

  /**
   * เล่นคอนโดแมว (ฟรี) — ปีนขึ้นแท่นล่างตะปบลูกบอลให้แกว่ง → ปีนขึ้นยอดข่วนเสา →
   * กระโดดไปนั่งบนหลังคาบ้านดีใจ → ปีนลงตามทาง
   */
  treePlay(id, onDone) {
    const a = this.actors.get(id);
    if (!a) return;
    this.cancel(a);
    a.task = 'play';
    this.focus(id);
    sfx.chirp();
    const finish = () => {
      a.task = null;
      this.rest(a, 'love', 90);
      this.burst(a.x, a.y - 50, 'heart', 3);
      sfx.purr();
      if (this.follow === a.id) this.follow = null;
      if (onDone) onDone();
    };
    this.climbTo(a, 'treeLow', () => this.actFor(a, 'swat', 90, () =>
      this.climbTo(a, 'treeTop', () => this.actFor(a, 'scratch', 80, () =>
        this.climbTo(a, 'treeMid', () => this.actFor(a, 'cheer', 60, () =>
          this.descendTo(a, 0, finish)))))), BRISK);
  }

  // ── น้องเล่นกันเอง ─────────────────────────────────────
  //
  // น้องที่ว่างอยู่บนพรมเดินมาเจอกันใกล้ ๆ = มีโอกาสชวนกันเล่น เป็นวง (session) หนึ่งวง
  // ทุกตัวในวงทำขั้นเดียวกันพร้อมกัน แล้วรอให้ครบทุกตัวก่อนไปขั้นถัดไป:
  //   chase  ตัวนำวิ่งหนี ตัวอื่นวิ่งไล่ตาม
  //   aim    หันหน้าเข้าหากัน ย่อตัวเล็ง ส่ายก้น
  //   pounce กระโดดตะครุบเข้าหากันกลางวง ขนพอง ดาวกระจาย
  //   bat    ยืนตบอุ้งเท้าใส่กันไปมา
  //   happy  ดีใจ หัวใจเด้ง → วนอีกรอบ หรือแยกย้าย
  // ตัวที่สามเดินผ่านมาใกล้วงตอนกำลังเล่น = เข้ามาแจมได้ตั้งแต่ขั้นถัดไป
  // กดดูแลหรือยกตัวไหนออกไป ตัวนั้นออกจากวง ที่เหลือเล่นต่อ (เหลือตัวเดียว = จบวง)

  /** ตรวจทุก ๆ ไม่กี่วินาทีว่ามีน้องว่าง ๆ อยู่ใกล้กันไหม */
  stepSocial(dt) {
    this.socialWait = (this.socialWait ?? 180) - dt;
    if (this.socialWait > 0) return;
    this.socialWait = rand(150, 260);
    const free = [...this.actors.values()].filter((a) => this.canSocial(a));
    const s = this.social;
    if (s) {
      // ตัวที่ว่างอยู่ใกล้วง เข้ามาแจม
      for (const a of free) {
        if (Math.abs(a.x - s.cx) < 320 && Math.random() < 0.7) {
          s.join.push(a);
          a.social = s;
          a.bubble = { text: '♪', t: 50 };
        }
      }
      return;
    }
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        if (Math.abs(free[i].x - free[j].x) < 300 && Math.random() < 0.45) {
          this.startSocial([free[i], free[j]]);
          return;
        }
      }
    }
  }

  canSocial(a) {
    return !a.task && !a.social && !a.perch && !a.stack?.length && a.mode !== 'held'
      && (a.mode === 'idle' || (a.mode === 'walk' && !a.then)) && !a.sad;
  }

  startSocial(members) {
    const s = { members: [], join: [], cx: 0, round: 0, phase: null, pending: 0, dir: 1 };
    this.social = s;
    for (const a of members) {
      a.social = s;
      a.bubble = { text: '♪', t: 50 };
    }
    s.members = members.slice();
    if (members.some((a) => this.hear(a))) sfx.chirp();
    this.socialPhase('chase');
  }

  leaveSocial(a) {
    const s = a.social;
    if (!s) return;
    a.social = null;
    s.members = s.members.filter((m) => m !== a);
    s.join = s.join.filter((m) => m !== a);
    if (s.members.length + s.join.length < 2) {
      for (const m of [...s.members, ...s.join]) {
        m.social = null;
        if (m.mode === 'act' || m.mode === 'idle') this.rest(m, 'sit', rand(120, 240));
      }
      if (this.social === s) this.social = null;
      return;
    }
    // ตัวที่ออกไปยังค้างขั้นนี้อยู่ — นับว่าทำเสร็จแล้ว ไม่ให้วงรอค้าง
    if (s.pending > 0 && s.waiting?.has(a)) {
      s.waiting.delete(a);
      s.pending--;
      if (s.pending <= 0) this.socialNext(s);
    }
  }

  /** ทุกตัวในวงทำขั้นนี้เสร็จแล้ว → ขั้นถัดไป */
  socialNext(s) {
    if (this.social !== s) return;
    const order = ['chase', 'aim', 'pounce', 'bat', 'happy'];
    const i = order.indexOf(s.phase);
    if (s.phase === 'happy') {
      s.round++;
      if (s.round >= 2 || Math.random() < 0.35) { this.endSocial(s); return; }
      this.socialPhase('chase');
      return;
    }
    this.socialPhase(order[i + 1]);
  }

  endSocial(s) {
    for (const m of [...s.members, ...s.join]) {
      m.social = null;
      this.rest(m, Math.random() < 0.5 ? 'sit' : 'groom', rand(200, 400));
    }
    this.social = null;
  }

  socialPhase(phase) {
    const s = this.social;
    if (!s) return;
    // ตัวที่ขอแจมเข้าวงตอนเริ่มขั้นใหม่
    if (s.join.length) { s.members.push(...s.join); s.join = []; }
    s.phase = phase;
    const ms = s.members;
    s.pending = ms.length;
    s.waiting = new Set(ms);
    const done = (a) => () => {
      if (a.social !== s || !s.waiting.has(a)) return;
      s.waiting.delete(a);
      s.pending--;
      if (s.pending <= 0) this.socialNext(s);
    };
    const hearAny = ms.some((a) => this.hear(a));
    s.cx = ms.reduce((t, a) => t + a.x, 0) / ms.length;

    if (phase === 'chase') {
      // ตัวนำวิ่งหนีไปทางที่ว่างกว่า ตัวอื่นวิ่งไล่ตามเป็นแถว
      const [lo, hi] = SPOTS.roam;
      const lead = ms[Math.floor(Math.random() * ms.length)];
      s.dir = lead.x < (lo + hi) / 2 ? 1 : -1;
      const goal = clamp(lead.x + s.dir * rand(180, 300), lo + 60, hi - 60);
      this.goTo(lead, goal, { speed: RUN * 0.75, then: done(lead) });
      let k = 1;
      for (const a of ms) {
        if (a === lead) continue;
        this.goTo(a, clamp(goal - s.dir * 46 * k, lo, hi), { speed: RUN * 0.82, then: done(a) });
        k++;
      }
      if (hearAny) later(() => sfx.trill(), 200);
      return;
    }
    // ขั้นที่เหลือเล่นกันกลางวง — เรียงตัวรอบจุดกลาง หันเข้าหากัน
    const n = ms.length;
    ms.forEach((a, i) => {
      const slot = s.cx + (i - (n - 1) / 2) * 74;
      a.faceTo = s.cx;
      if (phase === 'aim') {
        this.goTo(a, slot, { speed: WALK * 1.6, then: () => this.actFor(a, 'wiggle', 46, done(a)) });
      } else if (phase === 'pounce') {
        // กระโดดเข้าหากันครึ่งทาง แล้วเด้งกลับ
        const mid = a.x + (s.cx - a.x) * 0.55;
        this.hop(a, mid, a.lane, () => {
          if (this.hear(a)) sfx.thump();
          this.burst(s.cx, a.lane - 30, 'star', 3);
          this.actFor(a, 'puffed', 30, () => this.hop(a, slot, a.lane, done(a), 'auto', 18));
        }, 'none', 36);
        if (i === 0 && hearAny) sfx.startle();
      } else if (phase === 'bat') {
        this.actFor(a, 'bat', 96, done(a));
      } else {
        this.actFor(a, 'cheer', 56, done(a));
        this.burst(a.x, a.y - 50, 'heart', 2);
        if (i === 0 && hearAny) sfx.purr();
      }
    });
  }

  /** วางน้องลงบนชั้นบนผนัง (ลากมาวาง) — นั่งพักตรงนั้น ไม่ใช่กิจกรรมดูแล */
  perchAt(a, name) {
    const p = PERCHES[name];
    a.stack = routeTo(name).slice();
    a.perch = p;
    a.perchName = name;
    this.hop(a, p.x, p.y, () => this.rest(a, 'sit', rand(400, 800)), 'auto', 6);
  }

  /** เสียงของเล่นแต่ละชิ้น — ตอนโยนออกมาและทุกครั้งที่ถูกตะปบ */
  toySound() {
    const k = this.toy?.kind;
    if (k === 'ball') sfx.jingle();
    else if (k === 'mouse') sfx.squeak();
    else if (k === 'feather') sfx.swish();
    else sfx.roll();
  }

  /** @param direct true = ถูกยกมาวางในอ่างแล้ว ลงน้ำเลยไม่ต้องเดินมา */
  bathe(id, onDone, direct = false) {
    const a = this.actors.get(id);
    if (!a) return;
    this.cancel(a);
    a.task = 'bath';
    this.focus(id);
    const intoTub = () => this.hop(a, SPOTS.tub.x, SPOTS.tub.y, () => {
      a.mode = 'act';
      a.pose = 'sit';
      a.inTub = true;
      a.act = { kind: 'bath', t: 0, dur: 300, onDone };
      sfx.splash();
      this.burst(a.x, a.y - 20, 'bubble', 8);
    }, 'none', direct ? 8 : 44);
    if (direct) { intoTub(); return; }
    this.goTo(a, SPOTS.tub.x - 70, { speed: BRISK, then: intoTub });
  }

  /** @param at ชื่อที่นอนที่ถูกยกมาวาง (bed0-2 / seat / hammock) — นอนตรงนั้นเลยไม่ต้องเดินมา */
  sleep(id, onDone, at = null) {
    const a = this.actors.get(id);
    if (!a) return;
    this.cancel(a);
    a.task = 'sleep';
    this.focus(id);
    // เตียงก่อน (สามที่) แล้วค่อยม้านั่ง/เปล — ห้องมีสามตัว นอนบนเตียงได้ครบทุกตัว
    const name = at || [...BEDS, 'seat', 'hammock', 'treeHouse'].find((n) => this.perchFree(n, a)) || 'bed1';
    const p = PERCHES[name];
    const lieDown = () => {
      a.perchName = name;
      a.mode = 'act';
      // หมอบขดตัวหลับ (loaf) ไม่ใช่นอนตะแคง — ท่าตะแคงหมุนทั้งตัวจนไหลลงจากเบาะ
      a.pose = 'loaf';
      a.act = { kind: 'sleep', t: 0, dur: 600, onDone };
      // หาวก่อน แล้วทิ้งตัวลงนอน "ฮื้อ"
      sfx.yawn();
      later(() => sfx.flop(), 820);
    };
    if (at) {
      // ถูกวางลงบนที่นอนแล้ว — ร่อนลงที่นอนนิดเดียวแล้วนอนเลย
      a.perch = p;
      a.stack = [name];
      this.hop(a, p.x, p.y, lieDown, 'auto', 6);
      return;
    }
    this.climbTo(a, name, lieDown, BRISK);
  }

  /** แตะลูบตัวน้อง */
  pet(id) {
    const a = this.actors.get(id);
    if (!a || a.act) return;
    a.react = 70;
    this.burst(a.x, a.y - 40 * a.size / ADULT, 'heart', 4);
    sfx.purr();
    if (Math.random() < 0.5) later(() => sfx.mew(), 380);
  }

  /** น้องเพิ่งโตเต็มวัย — กระโดดดีใจ ดาวพราว */
  celebrate(id) {
    const a = this.actors.get(id);
    if (!a) return;
    this.focus(id);
    a.react = 140;
    this.burst(a.x, a.y - 50, 'star', 18);
    this.burst(a.x, a.y - 50, 'heart', 8);
  }

  cancel(a) {
    a.goal = null;
    this.leaveSocial(a);
    if (a.act?.onDone) {
      const done = a.act.onDone;
      a.act = null;
      done();
    }
    a.task = null;
    a.act = null;
    a.inTub = false;
    a.then = null;
    a.bubble = null;
  }

  /** เลขลอยเหนือหัวน้อง */
  floatText(id, text, color = '#FFF6D8') {
    const a = this.actorOf(id);
    if (!a) return;
    this.floats.push({ x: a.x, y: a.y - 52 * (a.size || ADULT) - 30, text, color, t: 0 });
  }

  burst(x, y, kind, n) {
    for (let i = 0; i < n; i++) {
      this.fx.push({
        kind, x: x + rand(-14, 14), y: y + rand(-8, 8),
        vx: rand(-1.1, 1.1), vy: kind === 'crumb' || kind === 'drop' ? rand(-2.4, -0.8) : rand(-1.6, -0.6),
        t: 0, life: kind === 'star' ? rand(50, 90) : rand(60, 100), r: rand(3, 6), spin: rand(-0.2, 0.2),
      });
    }
  }

  // ── อินพุต (พิกัดฉาก 960×420) ──────────────────────────

  /**
   * นิ้วลงบนห้อง — ถ้าลงบนตัวน้อง (ที่อยู่ในห้อง ไม่ใช่ตัวในกล่อง) จำไว้ก่อน
   * ขยับเกิน 8 หน่วยเมื่อไหร่ = ยกน้องขึ้น / ไม่ขยับแล้วปล่อย = แตะ (เลือก/ลูบ) เหมือนเดิม
   * ลงบนที่ว่าง = ลากเลื่อนห้องเหมือนเดิม
   */
  pointerDown(x, y) {
    const hit = this.hitCat(x + this.cam, y);
    const onCat = hit && this.actors.has(hit) ? hit : null;
    this.drag = { x0: x, y0: y, cam0: this.cam, lx: x, moved: false, at: performance.now(), cat: onCat };
    this.vel = 0;
  }

  pointerMove(x, y) {
    const d = this.drag;
    if (!d) return;
    if (this.grab) {
      this.grab.sx = x;
      this.grab.sy = y;
      return;
    }
    if (Math.hypot(x - d.x0, (y ?? d.y0) - d.y0) > 8) d.moved = true;
    if (!d.moved) return;
    if (d.cat) {
      this.startGrab(d.cat, x, y);
      return;
    }
    this.camGoal = null;
    this.follow = null;
    this.vel = d.lx - x;
    d.lx = x;
    this.cam = clamp(d.cam0 - (x - d.x0), 0, MAX_CAM);
  }

  pointerUp(x, y) {
    const d = this.drag;
    this.drag = null;
    if (this.grab) {
      this.dropGrab();
      return;
    }
    if (!d || d.moved) return;
    const hit = this.hitCat(x + this.cam, y);
    if (hit) {
      this.selected = hit;
      if (this.onTapCat) this.onTapCat(hit);
    }
  }

  hitCat(wx, wy) {
    let best = null;
    const test = (id, ax, ay, size) => {
      const h = 52 * size;
      const w = 30 * size;
      if (wx > ax - w && wx < ax + w && wy > ay - h && wy < ay + 6) {
        if (!best || ay > best.y) best = { id, y: ay };
      }
    };
    for (const a of this.actors.values()) test(a.id, a.x, a.y, a.size);
    if (this.waitActor) test(this.waitActor.id, SPOTS.box.x, SPOTS.box.y - 20, this.waitActor.size);
    return best?.id || null;
  }

  // ── ยกน้อง / วางน้อง ────────────────────────────────────

  /** ของเล่นหนึ่งเฟรม — แต่ละชิ้นเคลื่อนไหวคนละแบบ (ดู play) */
  stepToy(dt) {
    const t = this.toy;
    const [lo, hi] = SPOTS.play;
    if (t.kind === 'mouse') {
      // วิ่งเองตลอด เร็วบ้างช้าบ้าง หยุดดมพื้นเป็นพัก ๆ เลี้ยวกลับที่ขอบลาน
      t.pause = Math.max(0, (t.pause || 0) - dt);
      if (!t.pause && Math.random() < 0.006 * dt) t.pause = rand(20, 50);
      if (!t.pause) t.x += t.dir * t.run * dt;
      if (t.x < lo - 40) t.dir = 1;
      if (t.x > hi + 40) t.dir = -1;
      if (Math.random() < 0.004 * dt) t.dir *= -1;
      t.run += (1.4 - t.run) * 0.01 * dt;
      t.bob = (t.bob || 0) + dt * (t.pause ? 0.1 : 0.6);
    } else if (t.kind === 'feather') {
      // ขนนกส่ายไปมารอบจุดกลาง (คนถือไม้ตกแมวแกว่งจากข้างบน)
      t.phase = (t.phase || 0) + dt * 0.05;
      t.x = t.base + Math.sin(t.phase) * 40 + Math.sin(t.phase * 2.7) * 12;
      t.h = 62 + Math.sin(t.phase * 1.9) * 10 + (t.jerk || 0);
      t.jerk = (t.jerk || 0) * Math.pow(0.9, dt);
    } else {
      t.x += t.vx * dt;
      t.vx *= Math.pow(t.kind === 'ball' ? 0.985 : 0.95, dt);
      t.spin += t.vx * 0.08 * dt;
      if (t.x < lo - 60 || t.x > hi + 60) t.vx *= -0.6;
      if (t.kind === 'ball') {
        // เด้งดึ๋ง: แรงโน้มถ่วง + กระดอนคืนครึ่งหนึ่ง กรุ๊งกริ๊งทุกครั้งที่กระทบพื้นแรง ๆ
        t.vy -= 0.32 * dt;
        t.h += t.vy * dt;
        if (t.h <= 0) {
          t.h = 0;
          if (t.vy < -2.2) {
            t.vy = -t.vy * 0.62;
            if (this.hear({ x: t.x })) sfx.jingle();
          } else t.vy = 0;
        }
      }
    }
    if (t.flip) t.flip = Math.max(0, t.flip - 0.035 * dt);
  }

  /** ยกน้องขึ้น — น้องห้อยตามนิ้ว กิจกรรมที่ทำค้างอยู่ถูกยกเลิก (ข้อมูลบันทึกไปแล้วตั้งแต่ตอนกด) */
  startGrab(id, sx, sy) {
    const a = this.actors.get(id);
    // บ้านเพื่อน (source) ดูอย่างเดียว — ยกได้แต่วางลงจุดกิจกรรมไม่ได้ น้องจะค้างกลางอากาศ
    if (!a || this.source) return;
    this.cancel(a);
    if (this.toy && a.task === 'play') this.toy = null;
    a.mode = 'held';
    a.perch = null;
    a.perchName = null;
    a.stack = [];
    a.hop = null;
    a.then = null;
    a.inTub = false;
    a.swing = 0;
    // จับตรงไหนของตัวก็ห้อยจากตรงนั้น — ตัวไม่กระตุกไปหานิ้ว
    this.grab = { id, sx, sy, offX: a.x - (this.cam + sx), offY: a.y - sy, lastX: a.x, zone: null };
    this.selected = id;
    this.follow = null;
    this.camGoal = null;
    sfx.huh();
    if (this.onGrab) this.onGrab(id);
  }

  /** จุดวางที่เท้าน้องอยู่ตอนนี้ (null = ไม่ได้อยู่เหนือจุดไหน) */
  dropZoneAt(x, y) {
    return DROPS.find((z) => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1) || null;
  }

  /**
   * ปล่อยน้อง — อยู่เหนือจุดกิจกรรม = บอกหน้าจอให้เริ่มกิจกรรมนั้น (หน้าจอเป็นคนเช็คทอง/บันทึก)
   * ไม่อยู่เหนือจุดไหน = ร่วงลงพรมตรงนั้นแล้วนั่งเฉย ๆ
   */
  dropGrab() {
    const g = this.grab;
    this.grab = null;
    const a = this.actors.get(g.id);
    if (!a) return;
    const zone = this.dropZoneAt(a.x, a.y);
    a.mode = 'idle';
    a.swing = 0;

    // นอน: วางลงที่นอนที่ใกล้ที่สุดในโซนนั้นเลย (เตียงเลือกหมอนที่ว่างใกล้ตัวที่สุด)
    if (zone?.act === 'sleep') {
      let at = zone.at;
      if (at === 'bed') {
        const free = BEDS.filter((b) => this.perchFree(b, a));
        at = free.sort((p, q) => Math.abs(PERCHES[p].x - a.x) - Math.abs(PERCHES[q].x - a.x))[0] || null;
      } else if (!this.perchFree(at, a)) at = null;
      if (at) {
        if (this.onDropCat) this.onDropCat(a.id, 'sleep', { at });
        return;
      }
    }
    if (zone?.act === 'perch' && this.perchFree(zone.at, a)) {
      this.perchAt(a, zone.at);
      return;
    }
    if (zone?.act === 'play' && zone.tree) {
      if (this.onDropCat) this.onDropCat(a.id, 'play', { tree: true });
      return;
    }
    if (zone?.act === 'bathe') {
      if (this.onDropCat) this.onDropCat(a.id, 'bathe', { direct: true });
      return;
    }

    // ร่วงลงพรม (ชามข้าว/หีบของเล่น/ที่อื่น) — ชามกับหีบเปิดเมนูให้เลือกต่อ
    // วางที่ชามข้าว = ลงข้างเสื่อให้อาหาร (ไม่นั่งรอหน้าชามระหว่างเลือกอาหาร — จะบังชาม)
    const x = zone?.act === 'feed' ? SPOTS.roam[0] : clamp(a.x, 40, CATROOM_W - 40);
    // วางทับตัวอื่นบนพรม = ขยับออกไปข้าง ๆ นิดหนึ่ง ไม่นั่งซ้อนกัน
    const crowd = [...this.actors.values()].find((o) => o !== a && !o.perch && Math.abs(o.x - x) < 50);
    if (crowd) a.x = clamp(crowd.x + (x >= crowd.x ? 60 : -60), 40, CATROOM_W - 40);
    this.hop(a, crowd ? a.x : x, a.lane, () => this.rest(a, 'sit', rand(200, 400)), 'auto', 6);
    // ส่งตำแหน่งบนจอ (หน่วยฉาก) ไปด้วย เมนูเลือกอาหาร/ของเล่นจะเด้งขึ้นใกล้จุดที่วาง
    if (zone && zone.act !== 'perch' && this.onDropCat) {
      this.onDropCat(a.id, zone.act, { at: { x: (zone.x0 + zone.x1) / 2 - this.cam, y: zone.y0 } });
    }
  }

  /** ปุ่มลูกศรเลื่อนห้องทีละครึ่งจอ */
  nudge(dir) {
    this.follow = null;
    this.camGoal = clamp(this.cam + dir * VIEW.W * 0.5, 0, MAX_CAM);
  }

  get atLeft() { return this.cam <= 2; }
  get atRight() { return this.cam >= MAX_CAM - 2; }

  // ── อัปเดต ─────────────────────────────────────────────

  update(dt) {
    this.t += dt;

    // กล้อง: นิ้วลากอยู่ > ตามตัว > ไปเป้า > ไหลตามแรงเหวี่ยง
    if (!this.drag) {
      if (this.follow) {
        const a = this.actors.get(this.follow);
        if (a) this.camGoal = clamp(a.x - VIEW.W / 2, 0, MAX_CAM);
      }
      if (this.camGoal !== null) {
        this.cam += (this.camGoal - this.cam) * Math.min(1, 0.08 * dt);
        if (Math.abs(this.camGoal - this.cam) < 0.5 && !this.follow) this.camGoal = null;
      } else if (Math.abs(this.vel) > 0.05) {
        this.cam = clamp(this.cam + this.vel * dt, 0, MAX_CAM);
        this.vel *= Math.pow(0.92, dt);
      }
    }

    // ลากน้องไปชิดขอบจอ = เลื่อนห้องตาม (ห้องกว้างเกือบสามจอ ไม่งั้นพาน้องข้ามห้องไม่ได้)
    const g = this.grab;
    if (g) {
      const edge = 80;
      const push = g.sx < edge ? -(edge - g.sx) : g.sx > VIEW.W - edge ? g.sx - (VIEW.W - edge) : 0;
      if (push) this.cam = clamp(this.cam + push * 0.12 * dt, 0, MAX_CAM);
      const a = this.actors.get(g.id);
      if (a) {
        a.x = clamp(this.cam + g.sx + g.offX, 30, CATROOM_W - 30);
        // ยกได้ไม่ต่ำกว่าพื้นพรม และไม่สูงจนหัวทะลุเพดาน
        a.y = clamp(g.sy + g.offY, 120, a.lane);
        // ตัวแกว่งตามแรงลาก แล้วค่อย ๆ นิ่ง เหมือนห้อยจากหนังคอ
        const v = a.x - g.lastX;
        g.lastX = a.x;
        a.swing = (a.swing || 0) * Math.pow(0.86, dt) + clamp(v, -14, 14) * 0.022;
        const zone = this.dropZoneAt(a.x, a.y);
        if (zone !== g.zone) {
          g.zone = zone;
          if (zone) sfx.fish();
        }
      }
    }

    for (const a of this.actors.values()) this.step(a, dt);
    this.stepSocial(dt);

    // ลูกบอลห้อยแกว่งแบบลูกตุ้ม แล้วค่อย ๆ หยุด
    const b = this.ball;
    b.vel += -b.ang * 0.014 * dt;
    b.vel *= Math.pow(0.985, dt);
    // แกว่งได้ไม่เกินระยะเสาที่อยู่ข้าง ๆ — ลูกบอลจะไม่ทะลุเสาไปอยู่หน้าไม้
    b.ang = clamp(b.ang + b.vel * dt, -0.42, 0.42);
    if (Math.abs(b.ang) >= 0.42) b.vel *= -0.5;

    // น้องที่รออยู่ในกล่องร้องเมี้ยวเบา ๆ เป็นระยะ (ได้ยินเฉพาะตอนกล้องอยู่แถวกล่อง)
    if (this.waitActor) {
      this.waitMew = (this.waitMew ?? rand(240, 480)) - dt;
      if (this.waitMew <= 0) {
        this.waitMew = rand(420, 780);
        if (this.hear({ x: SPOTS.box.x })) sfx.mew();
      }
    }

    if (this.toy) this.stepToy(dt);

    for (const p of this.fx) {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'crumb' || p.kind === 'drop') p.vy += 0.12 * dt;
      else p.vy *= Math.pow(0.985, dt);
    }
    this.fx = this.fx.filter((p) => p.t < p.life);
    for (const f of this.floats) f.t += dt;
    this.floats = this.floats.filter((f) => f.t < 90);
  }

  step(a, dt) {
    if (a.mode === 'held') { a.runPhase += dt * 0.05; return; }   // ถูกยกอยู่ ตำแหน่งมาจาก update
    a.runPhase += dt * (a.mode === 'walk' ? a.speed * 0.09 : 0.02);
    if (a.react > 0) a.react -= dt;
    if (a.bubble) { a.bubble.t -= dt; if (a.bubble.t <= 0) a.bubble = null; }
    a.poseK = Math.min(1, a.poseK + 0.06 * dt);

    if (a.mode === 'walk') {
      const tx = a.target.x;
      const d = tx - a.x;
      const s = a.speed * dt;
      a.dir = d >= 0 ? 1 : -1;
      if (Math.abs(d) <= s) {
        a.x = tx;
        if (a.target.perch) {
          const p = a.target.perch;
          a.target.perch = null;
          this.hop(a, a.x, p.y, a.then);
          a.perch = p;
          return;
        }
        a.y += (a.target.y - a.y);
        a.mode = 'idle';
        a.poseK = 0;
        const then = a.then;
        a.then = null;
        if (then) then(); else this.rest(a, 'sit', rand(120, 300));
      } else {
        a.x += Math.sign(d) * s;
        a.y += (a.target.y - a.y) * Math.min(1, 0.05 * dt);
        // ฝีเท้าตุ้บ ๆ เฉพาะตอนรีบ (วิ่งมากินข้าว / ไปทำกิจกรรม) — เดินเล่นช้า ๆ เงียบ
        if (a.speed >= BRISK && this.hear(a)) {
          a.stepT = (a.stepT || 0) + dt;
          const every = a.speed >= RUN ? 9 : 12;
          if (a.stepT >= every) { a.stepT -= every; sfx.pat(); }
        }
      }
      return;
    }

    if (a.mode === 'hop') {
      const h = a.hop;
      h.t += dt / h.dur;
      const k = Math.min(1, h.t);
      a.x = h.fx + (h.tx - h.fx) * k;
      a.y = h.fy + (h.ty - h.fy) * k - Math.sin(k * Math.PI) * h.height;
      if (k >= 1) {
        if (h.land === 'auto' && this.hear(a)) {
          if (h.ty < a.lane - 20) sfx.fluff(); else sfx.thump();
        }
        a.hop = null;
        a.mode = 'idle';
        a.poseK = 0;
        const then = a.then;
        a.then = null;
        if (then) then(); else this.rest(a, 'sit', rand(100, 200));
      }
      return;
    }

    if (a.mode === 'act' && a.act) {
      this.stepAct(a, dt);
      return;
    }

    if (a.mode === 'idle') {
      a.wait -= dt;
      if (a.wait <= 0) {
        a.perchName = a.perch ? a.perchName : null;
        this.wander(a);
      }
    }
  }

  stepAct(a, dt) {
    const act = a.act;
    act.t += dt;

    // ท่าย่อยที่ร้อยต่อกัน (เล่นคอนโด) — จบแล้วไปขั้นถัดไปเอง ไม่นับเป็นการดูแลจบ
    if (act.then) {
      const tick = (every) => Math.floor(act.t / every) !== Math.floor((act.t - dt) / every);
      if (act.kind === 'swat' && tick(26)) {
        // ตะปบลูกบอล — ลูกบอลแกว่งไปตามทิศที่ตบ
        const dir = TREE_BALL.x >= a.x ? 1 : -1;
        this.ball.vel += 0.11 * dir;
        if (this.hear(a)) { sfx.swish(); later(() => sfx.bounce(), 60); }
      } else if (act.kind === 'scratch' && tick(20)) {
        if (this.hear(a)) sfx.claw();
        this.burst(a.x + 6, a.y - 20, 'crumb', 1);
      } else if (act.kind === 'bat' && tick(24)) {
        if (this.hear(a)) sfx.swish();
        if (Math.random() < 0.3 && this.hear(a)) later(() => sfx.chirp(), 120);
      } else if (act.kind === 'cheer' && tick(60)) {
        sfx.trill();
        this.burst(a.x, a.y - 40, 'star', 5);
      }
      if (act.t >= act.dur) {
        a.act = null;
        a.mode = 'idle';
        a.wait = 1e9;
        act.then();
      }
      return;
    }

    if (act.kind === 'eat') {
      const f = Math.max(0, 1 - act.t / act.dur);
      this.fills[a.bowl] = f;
      // เสียงดังตรงจังหวะที่ปากงับลงชาม (ดู eatShape) — ข้าวเม็ดกรุบ ๆ / ปลา แซลมอน งั่ม ๆ นุ่ม ๆ
      // คำที่เงยหน้าเลียปาก: แผล็บ ๆ + หัวใจเด้ง แทนเสียงเคี้ยว
      // ช่วงท้ายเลียน้ำตามสองสามแผล็บ
      if (act.t < act.dur - 50) {
        const at = (x) => Math.floor((x - BITE_AT * EAT_BITE) / EAT_BITE);
        if (at(act.t) !== at(act.t - dt)) {
          const n = Math.floor(act.t / EAT_BITE);
          if (n % EAT_YUM === EAT_YUM - 1) {
            sfx.lick();
            later(() => sfx.lick(), 160);
            this.fx.push({ kind: 'heart', x: a.x + 14, y: a.y - 46 * a.size, vx: 0.25, vy: -0.9, t: 0, life: 70, r: 5, spin: 0 });
          } else {
            if (act.food === 'kibble') sfx.crunch(); else sfx.nom();
            this.burst(a.x + rand(-6, 6), a.y - 4, 'crumb', 3);
          }
        }
      }
      if (act.t >= act.dur - 50 && act.t - dt < act.dur - 50) sfx.lap();
    } else if (act.kind === 'drink') {
      // เสียงจุ๊บทุกครั้งที่ลิ้นแลบ (ยกเว้นช่วงเงยหน้าพัก) + หยดน้ำกระเด็นเล็ก ๆ
      const cyc = act.t % DRINK_REST;
      if (cyc <= DRINK_REST - 22 && Math.floor(act.t / SIP) !== Math.floor((act.t - dt) / SIP)) {
        sfx.sip();
        if (Math.random() < 0.5) this.burst(SPOTS.water.x + rand(-8, 8), SPOTS.water.y - 8, 'drop', 2);
      }
      // เงยหน้าพัก: เลียปากแผล็บหนึ่งที
      if (cyc > DRINK_REST - 12 && (act.t - dt) % DRINK_REST <= DRINK_REST - 12) sfx.lick();
    } else if (act.kind === 'sleep') {
      if (Math.floor(act.t / 50) !== Math.floor((act.t - dt) / 50)) {
        this.fx.push({ kind: 'zzz', x: a.x + 10, y: a.y - 30, vx: 0.3, vy: -0.5, t: 0, life: 90, r: 7, spin: 0 });
      }
      // กรนเบา ๆ เป็นระยะ สลับกับครางตอนเคลิ้ม
      if (act.t > 90 && act.t < act.dur - 80 && Math.floor(act.t / 130) !== Math.floor((act.t - dt) / 130)) {
        if (Math.random() < 0.7) sfx.snore(); else sfx.snooze();
      }
      // ตื่นแล้วหาวบิดขี้เกียจ
      if (act.t > act.dur - 60 && a.pose !== 'yawn') {
        a.pose = 'yawn';
        sfx.yawn();
      }
    } else if (act.kind === 'bath') {
      if (Math.floor(act.t / 22) !== Math.floor((act.t - dt) / 22)) {
        this.burst(a.x, a.y - 30, 'bubble', 2);
        if (act.t < act.dur - 70) {
          sfx.scrub();
          if (Math.random() < 0.45) later(() => sfx.bubblePop(), 90);
        }
      }
      // ช่วงท้ายขนพองแล้วสะบัดตัวไล่น้ำ
      if (act.t >= act.dur - 70 && act.t - dt < act.dur - 70) {
        sfx.shake();
        this.burst(a.x, a.y - 30, 'bubble', 6);
      }
      a.pose = act.t > act.dur - 70 ? 'puff' : 'sit';
    } else if (act.kind === 'play') {
      // ── ไม้ตกแมว: ยืนตบขนนกที่ส่ายอยู่เหนือหัว แล้วกระโดดตรงขึ้นไปคว้า ──
      if (act.stage === 'reach') {
        const toy = this.toy;
        if (toy) a.x += (toy.x - a.x) * Math.min(1, 0.05 * dt);   // ขยับตามขนนกไปมา
        if (Math.floor(act.t / 18) !== Math.floor((act.t - dt) / 18) && this.hear(a)) sfx.swish();
        if (act.t >= act.dur) {
          act.stage = 'leap';
          a.act = act;
          this.hop(a, a.x, a.lane, () => {
            act.left--;
            if (toy) {
              // คว้าได้ ขนนกกระตุกขึ้นหนี ส่ายไปอีกทาง
              toy.jerk = 26;
              toy.base = clamp(toy.base + rand(-120, 120), lo0(), hi0());
              this.burst(a.x, a.lane - 70, 'star', 4);
              sfx.swish();
            }
            a.mode = 'act';
            act.t = 0;
            if (act.left > 0) { a.pose = 'puff'; act.dur = 34; act.stage = 'land'; }
            else { a.pose = 'love'; act.dur = 80; act.stage = 'end'; }
          }, 'auto', 64);
          a.act = act;
        }
        return;
      }
      if (act.stage === 'aim' && act.t >= act.dur) {
        // ตะครุบ — หนูวิ่งอยู่ ต้องเล็งข้างหน้าทางที่หนูกำลังไป / บอลกระโดดสูงรับกลางอากาศ
        act.stage = 'pounce';
        const toy = this.toy;
        const lead = toy?.kind === 'mouse' && !toy.pause ? toy.dir * toy.run * 24 : 0;
        const tx = toy ? toy.x + lead : a.x + 40 * a.dir;
        const high = toy?.kind === 'ball' ? 66 : toy?.kind === 'mouse' ? 52 : 44;
        a.act = act;
        this.hop(a, tx, a.lane, () => {
          sfx.thump();
          this.burst(tx, a.lane - 20, 'star', 4);
          act.left--;
          if (toy) {
            if (toy.kind === 'mouse') {
              // หนูโดนตะครุบ: จี๊ด ตีลังกา แล้ววิ่งหนีอีกทางเร็วขึ้น
              toy.flip = 1;
              toy.dir = Math.random() < 0.5 ? 1 : -1;
              toy.run = 3.4;
              toy.pause = 0;
            } else if (toy.kind === 'ball') {
              toy.vx = rand(3, 5) * (Math.random() < 0.5 ? -1 : 1);
              toy.vy = rand(6, 8);
            } else {
              toy.vx = rand(4, 7) * (Math.random() < 0.5 ? -1 : 1);
            }
            this.toySound();
          }
          if (act.left > 0) {
            a.mode = 'act';
            a.pose = 'puff';
            act.t = 0;
            act.dur = 40;
            act.stage = 'land';
          } else {
            a.mode = 'act';
            // จบด้วยท่าประจำของเล่น: ไหมพรม = นอนหงายกอดไหม / หนู = ขนพองภูมิใจ / อื่น ๆ = ดีใจ
            a.pose = toy?.kind === 'yarn' ? 'roll' : toy?.kind === 'mouse' ? 'puff' : 'love';
            act.t = 0;
            act.dur = toy?.kind === 'yarn' ? 110 : 80;
            act.stage = 'end';
          }
        });
        a.act = act;
        return;
      }
      if (act.stage === 'land' && act.t >= act.dur) {
        this.chaseToy(a);
        a.act = act;
        return;
      }
      if (act.stage !== 'end' || act.t < act.dur) return;
      this.toy = null;
    }

    if (act.t >= act.dur) {
      a.act = null;
      a.task = null;
      a.inTub = false;
      if (act.kind === 'bath') {
        this.hop(a, SPOTS.tub.x + 74, a.lane, () => this.rest(a, 'puff', 60));
      } else if (act.kind === 'sleep') {
        this.rest(a, 'sit', rand(100, 200));
      } else if (act.kind === 'eat' || act.kind === 'drink') {
        // กินเสร็จ: กระโดดลงพรม แล้วเดินออกไปพักพ้นโซนชาม ไม่นั่งทับชามข้าว
        this.hop(a, a.x, a.lane, () => this.goTo(a, rand(SPOTS.roam[0], SPOTS.roam[0] + 160), {
          then: () => this.rest(a, 'love', 90),
        }), 'auto', 12);
      } else {
        this.rest(a, 'love', 90);
      }
      this.burst(a.x, a.y - 50, 'heart', 3);
      sfx.purr();
      if (act.onDone) act.onDone();
      if (this.follow === a.id) this.follow = null;
    }
  }

  // ── วาด ────────────────────────────────────────────────

  draw(ctx) {
    const tf = ctx.getTransform();
    const scale = Math.hypot(tf.a, tf.b) || 1;
    const cam = Math.round(this.cam * scale) / scale;
    const bathing = [...this.actors.values()].some((a) => a.inTub);

    drawCatRoomBack(ctx, cam, this.t, this.night, scale, { fills: this.fills, kinds: this.kinds, bathing });

    ctx.save();
    ctx.translate(-cam, 0);

    // น้องที่รออยู่ในกล่องหน้าประตู
    // กล่องต้อนรับ: วาดด้านหน้ากล่องทุกครั้ง (เดิมวาดเฉพาะตอนมีน้องรอ กล่องเปล่าเลยเหลือแต่ฝาหลังลอยอยู่)
    const w = this.waitActor;
    if (w) {
      const bob = Math.sin(this.t * 0.05) * 1.5;
      drawCatPose(ctx, SPOTS.box.x - 4, SPOTS.box.y - 22 + bob, w.size, w.skin, this.t, { pose: 'sit', k: 1 });
    }
    drawBoxFront(ctx);
    if (w && this.selected === w.id) this.drawTag(ctx, SPOTS.box.x, SPOTS.box.y - 22 - 52 * w.size - 4, nameOf(w.cat));

    if (this.toy) this.drawToy(ctx);
    drawTreeBall(ctx, this.ball.ang);

    // ระหว่างยกน้อง: จุดที่วางได้เรืองจาง ๆ ทุกจุด จุดที่อยู่ใต้ตัวน้องเรืองชัดพร้อมป้าย
    if (this.grab) this.drawDrops(ctx);

    // เรียงตามความลึก — ตัวที่เท้าอยู่ต่ำกว่า (ใกล้จอ) วาดทีหลัง
    const list = [...this.actors.values()].sort((p, q) => (p.mode === 'held') - (q.mode === 'held') || p.y - q.y);
    for (const a of list) {
      this.drawActor(ctx, a);
      if (a.inTub) drawTubFront(ctx);
      if (a.perchName === 'hammock' && a.mode !== 'hop' && a.mode !== 'held') drawHammockFront(ctx);
      // น้องที่อยู่ "หลัง" ชามใบไหน (กำลังกิน / กำลังกระโดดเข้า-ออก) วาดชามใบนั้นทับอีกที
      // ชามจึงอยู่หน้าตัวน้องเสมอ ไม่มีจังหวะที่ดูเหมือนยืนหรือนั่งทับชาม
      SPOTS.bowls.forEach((b, i) => {
        if (a.y < b.y - 1 && Math.abs(a.x - b.x) < 36) drawBowlFront(ctx, i, this.fills[i], this.kinds[i]);
      });
      if (a.y < SPOTS.water.y - 1 && Math.abs(a.x - SPOTS.water.x) < 36) {
        // วงน้ำกระเพื่อมทุกครั้งที่ลิ้นแตะน้ำ
        const ripple = a.act?.kind === 'drink' ? (a.act.t % SIP) / SIP : 0;
        drawWaterFront(ctx, ripple);
      }
    }

    this.drawFx(ctx);
    ctx.restore();

    drawCatRoomLight(ctx, cam, this.t, this.night);
    drawCatRoomFront(ctx, cam, this.t);

    ctx.save();
    ctx.translate(-cam, 0);
    this.drawFloats(ctx);
    ctx.restore();
  }

  drawDrops(ctx) {
    const on = this.grab.zone;
    const pulse = 0.5 + Math.sin(this.t * 0.15) * 0.5;
    for (const z of DROPS) {
      const hot = z === on;
      ctx.save();
      ctx.globalAlpha = hot ? 0.55 + pulse * 0.3 : 0.22;
      ctx.strokeStyle = hot ? '#FFF3B0' : '#FFFFFF';
      ctx.fillStyle = hot ? 'rgba(255,236,150,.22)' : 'rgba(255,255,255,.06)';
      ctx.lineWidth = hot ? 4 : 2;
      ctx.setLineDash(hot ? [] : [8, 6]);
      ctx.beginPath();
      ctx.roundRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0, 18);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // ป้ายชื่อกิจกรรมลอยเหนือหัวน้องที่ถืออยู่ — ตามนิ้วไปตลอด ไม่โดนการ์ดหรือปุ่มบัง
    const a = this.actors.get(this.grab.id);
    if (on && a) this.drawTag(ctx, a.x, a.y - 52 * a.size - 14, tr(on.label));
  }

  /** น้องที่ถูกยกอยู่ — ห้อยตัวยืด ขาห้อย แกว่งตามแรงลาก เงาบนพรมเล็กลงตามความสูง */
  drawHeld(ctx, a) {
    const s = a.size;
    const lift = Math.max(0, a.lane - a.y);
    ctx.save();
    ctx.globalAlpha = Math.max(0.08, 0.26 - lift / 900);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    const k = Math.max(0.45, 1 - lift / 320);
    ctx.ellipse(a.x, a.lane + 4, 22 * s / ADULT * 1.4 * k, 6 * s / ADULT * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // หมุนรอบจุดที่ถูกจับ (กลางหลังคอ) ตัวจึงแกว่งเหมือนห้อย ไม่ใช่หมุนรอบเท้า
    const pivotY = a.y - 40 * s;
    ctx.save();
    ctx.translate(a.x, pivotY);
    ctx.rotate(clamp(a.swing || 0, -0.5, 0.5));
    ctx.translate(-a.x, -pivotY);
    drawCatPose(ctx, a.x, a.y, s, a.skin, this.t + a.runPhase * 10, {
      shape: { sy: 0.14, sx: -0.08, ear: 0.35, tilt: 0.05, wag: Math.sin(this.t * 0.2) * 0.6 },
      k: 1,
      mood: 'happy',
    });
    ctx.restore();
  }

  /** น้องที่อยู่ในบ้านกล่อง — วาดหมอบในรู ตัดภาพตามรู เห็นหน้าโผล่ออกมา แล้วขอบรูทับอีกที */
  drawInHouse(ctx, a) {
    const s = a.size;
    const h = TREE_HOLE;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(h.x, h.y, h.rx, h.ry, 0, 0, Math.PI * 2);
    ctx.clip();
    // หมอบอยู่ด้านในบ้าน หัวตรงกลางรูพอดี — ตัวลูกแมวเล็กเห็นทั้งหัว ตัวโตเห็นเต็มรู
    const sleepy = a.act?.kind === 'sleep' || a.pose === 'loaf';
    drawCatPose(ctx, h.x, h.y + 26 * s, s, a.skin, this.t + a.runPhase * 10,
      { pose: 'loaf', k: 1, blink: sleepy ? true : undefined, mood: sleepy ? undefined : 'happy' });
    ctx.restore();
    drawHoleFront(ctx);
    if (this.selected === a.id) this.drawTag(ctx, h.x, h.y - h.ry - 8, nameOf(a.cat));
  }

  drawActor(ctx, a) {
    const s = a.size;
    const sel = this.selected === a.id;
    const skin = a.skin;
    if (a.mode === 'held') {
      this.drawHeld(ctx, a);
      return;
    }
    if (a.perchName === 'treeHouse' && a.mode !== 'hop') {
      this.drawInHouse(ctx, a);
      return;
    }

    if (sel && !this.clean) {
      ctx.save();
      ctx.globalAlpha = 0.5 + Math.sin(this.t * 0.08) * 0.15;
      ctx.strokeStyle = '#FFE9A8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(a.x, a.y + 4, 30 * s / ADULT + 6, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (a.mode === 'walk' || a.mode === 'hop') {
      // ท่าวิ่งด้านข้างจากในด่าน — ตั้งพื้นของมันให้ตรงเท้าน้อง แล้วกลับด้านตามทิศ
      ctx.save();
      ctx.translate(a.x, a.y - GROUND_Y);
      if (a.dir < 0) ctx.scale(-1, 1);
      const fake = {
        box: { x: -20, y: GROUND_Y - 46, w: 40, h: 46 },
        y: GROUND_Y,
        runPhase: a.runPhase,
        onGround: a.mode === 'walk',
        vy: a.mode === 'hop' ? (a.hop.t < 0.5 ? -8 : 8) : 0,
        tilt: 0, squash: 0, tailLag: Math.sin(a.runPhase) * 0.3, sliding: false,
      };
      drawPlayer(ctx, fake, false, skin, false, 0, a.sad ? 'sad' : '', s, a.speed > WALK * 1.5 ? 1 : 0.6);
      ctx.restore();
    } else {
      // เงา
      ctx.save();
      ctx.globalAlpha = 0.26;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(a.x, a.y + 4, 22 * s / ADULT * 1.4, 6 * s / ADULT, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      let pose = a.pose;
      let mood;
      if (a.react > 0) { pose = 'love'; mood = 'happy'; }
      else if (a.sad && !a.act) mood = 'sad';
      const lift = a.react > 0 ? Math.abs(Math.sin(a.react * 0.18)) * 10 : 0;
      if (a.act?.then && ['swat', 'scratch', 'cheer', 'wiggle', 'bat', 'puffed'].includes(a.act.kind)) {
        const k = a.act.kind;
        // หันเข้าหาเพื่อน (มุมมองหน้าตรง หันได้แค่เอียงหัว/ตัวไปทางนั้น)
        const toward = a.faceTo !== undefined ? Math.sign(a.faceTo - a.x) || 1 : 1;
        const shape = k === 'wiggle'
          ? { crouch: 1, sway: 1, ear: 0.85, tilt: 0.1 * toward, lean: 0.08 * toward }
          : k === 'puffed'
            ? { puff: 1, ear: 0.7, tilt: 0.05 }
            : k === 'bat'
              // ยืนตบอุ้งเท้าใส่กันสลับจังหวะ เอนตัวเข้าหาเพื่อน
              ? { sit: 0.25, wave: 1, tilt: (0.1 + Math.sin(this.t * 0.35) * 0.08) * toward, lean: 0.06 * toward, wag: 0.6 * Math.sin(this.t * 0.4) }
              : k === 'swat'
          // ยืนสองขาหลังเอื้อมตบลูกบอล (โบกอุ้งเท้าเร็ว ๆ)
          ? { sit: 0.3, wave: 1, tilt: -0.1, ear: -0.3, wag: 0.6 * Math.sin(this.t * 0.4) }
          : k === 'scratch'
            // ข่วนเสา — อุ้งเท้าสองข้างสลับขึ้นลง
            ? { scratch: 1, scratchT: Math.sin(this.t * 0.5), ear: 0.2, wag: 0.4 }
            : { sit: 0.6, chirp: 1, tilt: 0.15 };
        drawCatPose(ctx, a.x, a.y, s, skin, this.t + a.runPhase * 10, { shape, k: 1, mood: k === 'scratch' ? '' : 'happy' });
      } else if (a.act?.kind === 'drink') {
        // ท่าดื่มน้ำ: ก้มเลียแผล็บ ๆ เงยพักเป็นระยะ (ดู drinkShape)
        const e = drinkShape(a.act.t);
        drawCatPose(ctx, a.x, a.y, s, skin, this.t + a.runPhase * 10, { shape: e.shape, k: 1, mood: e.mood });
      } else if (a.act?.kind === 'eat' && a.act.t < a.act.dur - 50) {
        // ท่ากินข้าว: ก้มงับ เคี้ยว เงยเลียปาก (ดู eatShape)
        const e = eatShape(a.act.t);
        drawCatPose(ctx, a.x, a.y, s, skin, this.t + a.runPhase * 10, { shape: e.shape, k: 1, mood: e.mood });
      } else if (a.perchName === 'hammock' && a.mode !== 'hop') {
        // ในเปล: ขดตัวหมอบ หางสั้นเก็บเข้าตัว — หางยาวปกติจะโผล่ทะลุผ้าเปลออกมาข้าง ๆ
        drawCatPose(ctx, a.x, a.y, s, skin, this.t + a.runPhase * 10,
          { shape: { loaf: 1, shut: 1, tailShort: 0.95, wag: 0 }, k: 1, mood, blink: true });
      } else {
        drawCatPose(ctx, a.x, a.y - lift, s, skin, this.t + a.runPhase * 10,
          { pose, k: Math.min(1, a.poseK), mood, blink: a.act?.kind === 'sleep' ? true : undefined });
      }
    }

    // หัวสูงราว 46 หน่วยต่อสเกล (ลูกแมวหัวโตกว่านิดหน่อย) — ป้ายกับฟองคำพูดลอยเหนือหัวพอดีทุกวัย
    const top = a.y - 52 * s - 4;
    if (a.bubble) this.drawBubble(ctx, a.x + 14 * s, top - 6, a.bubble.text);
    if (sel) this.drawTag(ctx, a.x, top - (a.bubble ? 26 : 0), nameOf(a.cat));
  }

  /**
   * ป้ายชื่อ — วัดความสูงจริงของข้อความ (สระบน วรรณยุกต์ สระล่างภาษาไทยสูงกว่าตัวอักษรละติน)
   * แล้วขยายกรอบให้คลุมทั้งหมด เดิมกรอบสูงตายตัว 20 หน่วย ไม้ตรี/ไม้จัตวาบนสระอีเลยล้นออกนอกกรอบ
   */
  drawTag(ctx, x, y, text) {
    if (this.clean) return;   // โหมดดูเต็มจอ: ไม่มีป้ายชื่อ เหลือแต่ห้องกับน้อง
    ctx.save();
    ctx.font = '700 13px "Mali", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const m = ctx.measureText(text);
    const up = Math.max(11, m.actualBoundingBoxAscent || 11);
    const down = Math.max(3, m.actualBoundingBoxDescent || 3);
    const h = up + down + 9;
    const w = m.width + 18;
    ctx.fillStyle = 'rgba(58,29,80,.82)';
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - 2 - h, w, h, Math.min(10, h / 2));
    ctx.fill();
    ctx.fillStyle = '#FFF6D8';
    ctx.fillText(text, x, y - 2 - h + 4.5 + up);
    ctx.restore();
  }

  drawBubble(ctx, x, y, text) {
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#5C3B26';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#E2463F';
    ctx.font = '900 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
    ctx.restore();
  }

  /** ของเล่นในห้อง — รูปทรงเดียวกับไอคอนในเมนู (render/items.js) ขยับตามชนิด */
  drawToy(ctx) {
    const t = this.toy;
    const S = 0.9;    // ไอคอนกรอบ 40 → ราว 36 หน่วยในห้อง (ราวครึ่งตัวน้อง เห็นชัดว่าเป็นอะไร)
    // เงาบนพรม เล็กลงตามความสูง
    if (t.kind !== 'feather') {
      ctx.save();
      ctx.globalAlpha = 0.22 * Math.max(0.3, 1 - t.h / 120);
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(t.x, t.y + 1, 15 * Math.max(0.4, 1 - t.h / 160), 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (t.kind === 'yarn') {
      // เส้นไหมที่คลายออกตามทางที่กลิ้ง
      ctx.save();
      ctx.strokeStyle = '#E07FA1';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(t.x0, t.y - 1);
      const n = 6;
      for (let i = 1; i <= n; i++) {
        const x = t.x0 + ((t.x - t.x0) * i) / n;
        ctx.lineTo(x, t.y - 1 + (i % 2 ? -2 : 2));
      }
      ctx.stroke();
      ctx.restore();
    }
    if (t.kind === 'feather') {
      // เชือกจากไม้ตกแมวที่ยื่นลงมาจากขอบบนจอ แล้วขนนกห้อยปลายเชือก
      const fy = t.y - t.h;
      const topX = t.base + 30;
      ctx.save();
      ctx.strokeStyle = '#9A6636';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(topX + 60, 30); ctx.lineTo(topX, 92); ctx.stroke();
      ctx.strokeStyle = '#5C3B26';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(topX, 92); ctx.quadraticCurveTo((topX + t.x) / 2, fy - 20, t.x, fy - 10); ctx.stroke();
      ctx.translate(t.x, fy);
      ctx.rotate(Math.sin((t.phase || 0) * 3) * 0.35);
      ctx.scale(1.4, 1.4);
      ctx.fillStyle = '#9B7BF0';
      ctx.strokeStyle = '#5C3B26';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(-3, 0, 4, 11, -0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FF8FB8';
      ctx.beginPath(); ctx.ellipse(4, 3, 3.2, 9, 0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#E9DAFF'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-3, -9); ctx.lineTo(-3, 9); ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.save();
    if (t.kind === 'mouse') {
      // หนู: หันตามทางที่วิ่ง ตัวกระดุ๊กกระดิ๊กตอนวิ่ง ตีลังกาตอนโดนตะครุบ
      const bob = Math.abs(Math.sin(t.bob || 0)) * 2;
      ctx.translate(t.x, t.y - 10 - bob - Math.sin(t.flip * Math.PI) * 30);
      ctx.rotate(t.flip * Math.PI * 2 * -t.dir);
      ctx.scale(-t.dir * S * 1.3, S * 1.3);   // ตัวหนูในไอคอนกินที่น้อยกว่าชิ้นอื่น ขยายเพิ่มให้ขนาดพอ ๆ กัน
    } else {
      // ไหมพรม / บอล: หมุนตามที่กลิ้ง บอลลอยตามความสูงที่เด้ง
      ctx.translate(t.x, t.y - 12 - t.h);
      ctx.rotate(t.spin);
      // บอลกระทบพื้นแบนนิดหนึ่ง
      if (t.kind === 'ball' && t.h < 2 && Math.abs(t.vy) > 1) ctx.scale(1.12, 0.88);
      ctx.scale(S, S);
    }
    ctx.translate(-20, -20);
    drawItemIcon(ctx, t.kind);
    ctx.restore();
  }

  drawFx(ctx) {
    for (const p of this.fx) {
      const k = 1 - p.t / p.life;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 1.6);
      if (p.kind === 'heart') {
        softHeart(ctx, p.x, p.y, p.r * 1.15, '#FF8FB8');
      } else if (p.kind === 'zzz') {
        ctx.fillStyle = '#E8E2FF';
        ctx.strokeStyle = '#4A3A72';
        ctx.lineWidth = 3;
        ctx.font = '900 ' + (12 + p.t * 0.08) + 'px sans-serif';
        ctx.strokeText('z', p.x, p.y);
        ctx.fillText('z', p.x, p.y);
      } else if (p.kind === 'drop') {
        ctx.fillStyle = 'rgba(143,208,240,.95)';
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.9, 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'bubble') {
        ctx.strokeStyle = 'rgba(160,205,240,.95)';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
      } else if (p.kind === 'star') {
        ctx.fillStyle = '#FFE48A';
        ctx.translate(p.x, p.y);
        ctx.rotate(p.t * p.spin);
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? p.r * 0.45 : p.r * 1.2;
          const ang = (i / 10) * Math.PI * 2;
          ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = '#B5763C';
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  drawFloats(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '800 18px "Mali", sans-serif';
    for (const f of this.floats) {
      const k = f.t / 90;
      ctx.globalAlpha = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
      const y = f.y - k * 40;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(58,29,80,.9)';
      if (f.hearts) {
        // "+" ตามด้วยหัวใจที่วาดเอง เรียงกันกึ่งกลางที่ตัวน้อง
        const plus = ctx.measureText('+').width;
        const gap = 17;
        const total = plus + 4 + f.hearts * gap;
        let x = f.x - total / 2;
        ctx.textAlign = 'left';
        ctx.strokeText('+', x, y);
        ctx.fillStyle = f.color;
        ctx.fillText('+', x, y);
        ctx.textAlign = 'center';
        x += plus + 4 + gap / 2;
        for (let i = 0; i < f.hearts; i++) softHeart(ctx, x + i * gap, y - 6, 7.2, f.color);
        continue;
      }
      ctx.strokeText(f.text, f.x, y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, y);
    }
    ctx.restore();
  }

  /** หัวใจลอยเหนือหัวน้อง (ความผูกพันที่ได้) — วาดเอง ไม่ใช้ตัวอักษร ♥ ของฟอนต์ */
  floatHearts(id, n, color = '#FF8FB8') {
    const a = this.actorOf(id);
    if (!a || n <= 0) return;
    // เริ่มต่ำกว่าข้อความ (+EXP / ดีใจ!) หนึ่งบรรทัด สองอย่างจะลอยขึ้นเป็นแถวไม่ซ้อนกัน
    this.floats.push({ x: a.x, y: a.y - 52 * (a.size || ADULT) - 4, hearts: Math.min(5, n), color, t: 0 });
  }
}
