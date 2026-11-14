// src/town/home-cats.js
// ─────────────────────────────────────────────────────────────
// น้องแมวเด็กในห้องเลี้ยง (ผู้ใช้ 14 พ.ย. 2026: "เอาน้องแมวเด็กที่วาดลงเกมจริง ให้เดินเล่นในห้องแบบดูธรรมชาติ")
//
// ใคร: น้องในห้องเลี้ยงจริงของผู้เล่น (cats.js roomCats — state 'room') · วาดด้วยน้องจิบิ (render/chibi.js)
//   สีตามสายพันธุ์ (สีเก่าเทียบสีใหม่ BREED_LOOK) · ขนาดตามวัย: ลูกแมว Lv1–2 เล็ก · วัยรุ่น Lv3–4 ใหญ่ขึ้น (cats.js sizeOf)
//   ทดสอบไม่มีน้อง: ?kits=5 = น้องตัวอย่าง (ไม่บันทึก)
//
// ทำอะไร (สุ่มต่อกันไปเรื่อย ๆ ทีละตัว ไม่พร้อมกัน — ดู pick()):
//   เดินเล่น (ท่าเดิน 4 จังหวะ เท้าไม่ไถล) · ยืนมองรอบ ๆ / ร้องเหมียว / หาว · นั่งพัก
//   ไปนอนที่ที่นอนน้อง (จองที่ ไม่แย่งกัน) · ไปนั่งข้างชามอาหาร · กระโดดขึ้นม้านั่งริมหน้าต่างไปนั่งดูวิว (หันหลัง)
//   ผู้เล่นเดินมาใกล้ = หันมามอง บางทีเดินมาหาแล้วร้องเหมียว มีหัวใจลอย · ใกล้ ๆ เห็นป้ายชื่อน้อง
//   น้องที่หิว/ง่วง (cats.js needNow) ไปชามอาหาร/ที่นอนบ่อยขึ้น
// ตำแหน่งที่นอน/ชาม/ม้านั่ง มาจาก home.js (NURSE_SPOTS) — ชุดของแต่ละแบบห้อง (โล่ง/เริ่มต้น/ครบ)
// ─────────────────────────────────────────────────────────────
import { GY } from './layout.js';
import { drawChibi, chibiLookFor } from '../render/chibi.js';
import { roomCats, levelOf, sizeOf, nameOf, needNow } from '../cats.js';
import { NURSE_SPOTS } from './home.js';
import { label } from './castle-hall.js';
import { heart } from './world.js';

const TAU = Math.PI * 2;
/** สีขนเก่าในกล่อง → สีน้องจิบิที่ลงไว้แล้ว */
const BREED_LOOK = { tabby: 'salid', midnight: 'konja', grey: 'korat', snow: 'manee' };
const KID_K = 0.11;            // เท่าน้องจิบิในเกม (cat2.js drawChibiAs2): หน่วยชีท → ×SC
const STRIDE = 30;             // หน่วยชีทต่อหนึ่งจังหวะเดิน (ท่าเดิน 4 จังหวะ)
const BEAT = 12;               // เฟรมต่อจังหวะ — ก้าวถี่แบบลูกแมวขาสั้น
const LANES = [-7, 3, 11, -2, 7];   // แนวเท้าของแต่ละตัว (ห่างกันนิด ๆ ไม่ยืนทับเส้นเดียวกัน)
const DEMO = [['pearl', 1, 'ไข่มุก'], ['calico', 2, 'ขนมชั้น'], ['tabby', 3, 'ลายจุด'], ['snow', 1, 'มณี'], ['wilat', 4, 'วิลาศ']];

const rnd = (a, b) => a + Math.random() * (b - a);
const pickW = (list) => { const s = list.reduce((a, [, w]) => a + w, 0); let r = Math.random() * s; for (const [v, w] of list) if ((r -= w) <= 0) return v; return list[0][0]; };

/** สร้างน้องในห้อง · SC = ขนาดตัวผู้เล่นในเมือง */
export function createKittens(SC) {
  let list = [];
  try { list = roomCats(); } catch { list = []; }
  const q = new URLSearchParams(location.search).get('kits');
  if (!list.length && q) {
    list = DEMO.slice(0, Math.max(1, Math.min(5, +q || 5))).map(([breed, lv, name], i) => ({ id: 'demo' + i, breed, name, demoLv: lv }));
  }
  const S = NURSE_SPOTS;
  return list.slice(0, 5).map((c, i) => {
    const lv = c.demoLv || levelOf(c);
    const k = KID_K * SC * (sizeOf(lv) / sizeOf(1));
    const x = rnd(S.roam[0] + 60, S.roam[1] - 60);
    return {
      cat: c, name: c.name || nameOf(c), look: chibiLookFor(BREED_LOOK[c.breed] || c.breed), k, lane: LANES[i % LANES.length],
      x, y: GY + LANES[i % LANES.length], dir: Math.random() < 0.5 ? -1 : 1,
      st: 'idle', t: 0, dur: rnd(30, 140), tx: x, spot: null, ph: 0, tOff: Math.floor(Math.random() * 900),
      hop: null, act: 'auto', view: 'q', hearts: [], seen: 0,
    };
  });
}

/** ที่นอน/ที่นั่งที่ตัวอื่นจองแล้ว */
const taken = (kits, me, spot) => kits.some((o) => o !== me && o.spot && o.spot.x === spot.x && o.spot.y === spot.y);

function need(k, key) { try { return k.cat.demoLv ? 70 : needNow(k.cat, key); } catch { return 70; } }

/** เลือกกิจกรรมถัดไป (สุ่มถ่วงน้ำหนักตามความหิว/ง่วง/ผู้เล่นอยู่ใกล้) */
function pick(k, kits, px) {
  const S = NURSE_SPOTS;
  const freeBeds = S.beds.filter((b) => !taken(kits, k, b));
  const freeBowls = S.bowls.filter((b) => !taken(kits, k, b));
  const seatFree = S.seat && S.seat.spots.filter((b) => !taken(kits, k, b));
  const near = Math.abs(px - k.x) < 360;
  const sleepy = need(k, 'sleep') < 45, hungry = need(k, 'food') < 45;
  const what = pickW([
    ['walk', 40], ['idle', 18], ['sit', 16],
    ...(freeBeds.length ? [['bed', sleepy ? 26 : 9]] : []),
    ...(freeBowls.length ? [['bowl', hungry ? 22 : 7]] : []),
    ...(seatFree?.length ? [['window', 7]] : []),
    ...(near ? [['visit', 7]] : []),
  ]);
  k.spot = null;
  if (what === 'walk') {
    const span = rnd(70, 300) * (Math.random() < 0.5 ? -1 : 1);
    goTo(k, Math.max(S.roam[0], Math.min(S.roam[1], k.x + span)), { then: Math.random() < 0.5 ? 'idle' : 'sit' });
  } else if (what === 'idle') rest(k, 'idle', rnd(80, 220));
  else if (what === 'sit') rest(k, 'sit', rnd(180, 480));
  else if (what === 'bed') { const b = freeBeds[Math.floor(Math.random() * freeBeds.length)]; k.spot = b; goTo(k, b.x, { then: 'sleep' }); }
  else if (what === 'bowl') { const b = freeBowls[Math.floor(Math.random() * freeBowls.length)]; k.spot = b; goTo(k, b.x + b.side * 16, { then: 'eat' }); }
  else if (what === 'window') { const b = seatFree[Math.floor(Math.random() * seatFree.length)]; k.spot = b; goTo(k, b.x, { then: 'hopup' }); }
  else if (what === 'visit') goTo(k, px + (k.x < px ? -46 : 46), { then: 'greet' });
}
function goTo(k, x, { then }) {
  k.st = 'walk'; k.tx = x; k.then = then; k.t = 0;
  if (Math.abs(x - k.x) < 4) { k.st = 'arrive'; return; }
  k.dir = x > k.x ? 1 : -1;
}
function rest(k, st, dur) { k.st = st; k.t = 0; k.dur = dur; k.act = 'auto'; }

/** หนึ่งเฟรม (dt = เฟรม 60fps) · px,py = ตำแหน่งผู้เล่น */
export function stepKittens(kits, dt, px, py, tick) {
  for (const k of kits) {
    k.t += dt;
    for (const h of k.hearts) h.t += dt;
    k.hearts = k.hearts.filter((h) => h.t < 70);
    const dP = Math.abs(px - k.x);
    if (k.st === 'walk') {
      const sp = (STRIDE * k.k) / BEAT;   // หน่วยโลกต่อเฟรม — ตรงจังหวะก้าว เท้าไม่ไถล
      const d = k.tx - k.x, step = Math.min(Math.abs(d), sp * dt);
      k.x += Math.sign(d) * step;
      k.ph += step / (STRIDE * k.k);
      k.y += ((GY + k.lane) - k.y) * Math.min(1, 0.1 * dt);
      if (Math.abs(k.tx - k.x) < 0.5) k.st = 'arrive';
      continue;
    }
    if (k.st === 'arrive') {
      const th = k.then;
      if (th === 'sleep') { k.st = 'sleep'; k.t = 0; k.dur = rnd(600, 1500); k.y = k.spot.y; }
      else if (th === 'eat') { k.st = 'eat'; k.t = 0; k.dur = rnd(240, 480); k.dir = k.spot.x > k.x ? 1 : -1; }
      else if (th === 'hopup') { k.st = 'hop'; k.t = 0; k.hop = { y0: k.y, y1: k.spot.y, x0: k.x, x1: k.spot.x, up: true }; }
      else if (th === 'greet') { k.st = 'greet'; k.t = 0; k.dur = rnd(150, 260); k.dir = px > k.x ? 1 : -1; k.hearts.push({ t: 0, x: rnd(-6, 6) }); k.meowAt = 10; }
      else rest(k, th === 'sit' ? 'sit' : 'idle', th === 'sit' ? rnd(180, 420) : rnd(80, 200));
      continue;
    }
    if (k.st === 'hop') {
      // กระโดดเป็นโค้ง ~0.45 วิ (ขึ้นม้านั่ง / ลงพื้น)
      const u = Math.min(1, k.t / 26), H = k.hop;
      k.x = H.x0 + (H.x1 - H.x0) * u;
      k.y = H.y0 + (H.y1 - H.y0) * u - Math.sin(u * Math.PI) * 26;
      if (u >= 1) {
        k.hop = null;
        if (H.up) { k.st = 'window'; k.t = 0; k.dur = rnd(500, 1100); }
        else { k.y = GY + k.lane; k.spot = null; pick(k, kits, px); }
      }
      continue;
    }
    // พฤติกรรมอยู่กับที่
    if ((k.st === 'idle' || k.st === 'sit') && dP < 90) {
      if (k.seen <= 0) { k.dir = px > k.x ? 1 : -1; k.seen = 1; if (Math.random() < 0.35) { k.st = 'look'; k.t = 0; k.dur = rnd(90, 160); } }
    } else if (dP > 140) k.seen = 0;
    if (k.t < k.dur) continue;
    // จบกิจกรรม → ลุกจากที่ / ลงจากม้านั่ง แล้วเลือกอย่างใหม่
    if (k.st === 'window') { k.st = 'hop'; k.t = 0; k.hop = { y0: k.y, y1: GY + k.lane, x0: k.x, x1: k.x + (Math.random() < 0.5 ? -40 : 40), up: false }; continue; }
    if (k.st === 'sleep') { k.y = GY + k.lane; k.spot = null; }
    pick(k, kits, px);
  }
}

/** ท่าวาดของน้องตามสถานะ */
function pose(k, tick) {
  const t = tick + k.tOff;
  const faceRight = k.dir > 0;
  switch (k.st) {
    case 'walk': return { view: 'q', t, act: 'idle', walk4: Math.floor(k.ph) % 4, walkPhase: k.ph, faceRight };
    case 'sit': case 'eat': return { view: 'sit', t, act: 'auto', faceRight };
    case 'sleep': return { view: 'sit', t, act: 'sleep', faceRight };
    case 'window': return { view: 'back', t, act: 'idle', faceRight };
    case 'look': return { view: 'front', t, act: 'auto', faceRight };
    case 'greet': return { view: 'front', t, act: k.t > 10 && k.t < 70 ? 'meow' : 'idle', faceRight };
    case 'hop': return { view: 'q', t, act: 'idle', faceRight: k.hop.x1 >= k.hop.x0 };
    default: return { view: 'q', t, act: 'auto', faceRight };
  }
}

/**
 * วาดน้อง (เฉพาะตัวที่ pass(k) — ใช้แยกชั้นหลัง/หน้าตัวผู้เล่น) · px = ผู้เล่น (ป้ายชื่อขึ้นเมื่อเดินมาใกล้)
 */
export function drawKittens(c, kits, tick, pass, px, camX, vw) {
  const list = kits.filter((k) => pass(k) && k.x > camX - 80 && k.x < camX + vw + 80).sort((a, b) => a.y - b.y);
  for (const k of list) {
    const P = pose(k, tick);
    // เงาใต้ตัว (ลอยตอนกระโดด = เล็ก/จางลง)
    const ground = k.st === 'hop' ? k.hop.y0 + (k.hop.y1 - k.hop.y0) * Math.min(1, k.t / 26) : k.y;
    const lift = Math.max(0, ground - k.y), sh = 1 - Math.min(0.5, lift / 50);
    c.save();
    c.globalAlpha = 0.2 * sh; c.fillStyle = '#4A2A5A';
    c.beginPath(); c.ellipse(k.x, ground + 2, 120 * k.k * sh, 4.5 * sh, 0, 0, TAU); c.fill();
    c.restore();
    drawChibi(c, k.x, k.y, k.k, { ...P, look: k.look });
    if (k.st === 'sleep' && Math.floor((tick + k.tOff) / 50) % 3 === 0) {
      const u = ((tick + k.tOff) % 50) / 50;
      c.save(); c.globalAlpha = Math.sin(u * Math.PI) * 0.85; c.fillStyle = '#8A6BC2';
      c.font = `700 ${Math.round(9 + u * 5)}px Mali, sans-serif`; c.textAlign = 'center';
      c.fillText('z', k.x + 14 + u * 10, k.y - 350 * k.k * 0.95 - u * 16); c.restore();
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
    if (d > 110) continue;
    c.save(); c.globalAlpha = Math.min(1, (110 - d) / 30);
    label(c, k.x, k.y - 350 * k.k - 14, k.name, 'rgba(255,255,255,.92)', '#8A4FD0', 10);
    c.restore();
  }
}
