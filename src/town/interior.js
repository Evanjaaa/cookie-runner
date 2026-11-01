// src/town/interior.js
// ─────────────────────────────────────────────────────────────
// ฉากภายในร้าน (เมืองแมวเหมียว) — วาดบน canvas ตัวเดิมของหน้าเมือง ลูปเดิม ไม่สร้างระบบใหม่
//
// ผู้ใช้ 27 ต.ค. (บรีฟปรับร้าน): แตะร้าน → จางเข้าฉากในร้าน · มีเคาน์เตอร์ ชั้นวาง เจ้าของร้าน ของตกแต่งตามประเภท
// น้องไม่ต้องเดินในร้าน — ฉากเป็นพื้นหลังให้แผงสินค้า (HTML ใน town.html · ควบคุมใน main.js)
//
// ภาพฉากแต่ละร้าน (ผนัง ชั้นวาง ป้าย เคาน์เตอร์ ของขยับ) = interior-art.js · ไฟล์นี้ดูแลแคช + เจ้าของร้าน
// ประสิทธิภาพ: ส่วนนิ่ง (ผนัง ชั้นวาง ของบนชั้น / เคาน์เตอร์) วาดครั้งเดียวต่อร้าน/ขนาดจอ เก็บเป็นภาพสองชั้น (หลัง · หน้า)
// ทุกเฟรม: ภาพหลัง → เจ้าของร้าน (ขยับได้) → ภาพเคาน์เตอร์ → ของขยับไม่กี่ชิ้น (ฟองยา ไฟเตา ลูกโป่ง ประกาย ไอขนม)
// ออกจากร้าน = ทิ้งภาพ (clearInterior)
//
// เจ้าของร้าน = แม่ค้าประจำร้าน (CAT2_KEEPERS ใน cat2.js · shop = id ร้าน · ใส่ชุดประจำตัว) — ตัววาดน้องตัวเดียวกับเกม
// ร้านไหนยังไม่มีแม่ค้าออกแบบ → ใช้สกิน keeper ในตารางข้างล่างยืนแทน · ในเมืองไม่มีนั่งข้างร้านแล้ว
// keepX = กึ่งกลางพื้นที่ว่างทางซ้ายของแผงสินค้า (main.js วัดจากตำแหน่งแผงจริง) — เจ้าของร้านไม่โดนแผงบัง
// ─────────────────────────────────────────────────────────────
import { drawCat2, CAT2_KEEPERS } from '../render/cat2.js';
import { skinById } from '../skins.js';
import { HOME_MOVES } from '../home-moves.js';
import { H } from './world.js';
import { SHOP_ART, COUNTER } from './interior-art.js';

/** สกินยืนแทนในร้าน (ใช้เมื่อร้านยังไม่มีแม่ค้าใน CAT2_KEEPERS) · ภาพฉากแต่ละร้านอยู่ใน interior-art.js */
export const INTERIOR = {
  food: { keeper: 'snow' },
  care: { keeper: 'midnight' },
  home: { keeper: 'grey' },
  toy: { keeper: 'calico' },
  exchange: { keeper: 'pearl' },
};

// ── แคช (ภาพหลัง + ภาพเคาน์เตอร์ ต่อร้าน/ขนาดจอ — ออกจากร้านแล้วทิ้ง) ──
let cache = null;
export function clearInterior() { cache = null; act = null; eye.w = 0; eye.until = -1; }

// ── ท่าทางเจ้าของร้าน (ผู้ใช้ 1 พ.ย.) ──
// ยืนว่าง: หายใจ กะพริบตา ขยับปาก แกว่งหาง (ตัววาดทำเองตาม t) + เอียงหัวช้า ๆ มองซ้ายขวาเป็นพัก ๆ
// เข้าร้าน = โบกมือทัก · จากนั้นทุก ~8–12 วินาที เล่นท่าทักลูกค้าหนึ่งท่า (ท่าเดียวกับหน้าแรก — ท่ายืนที่ไม่หลบหลังเคาน์เตอร์)
const KEEP_MOVES = HOME_MOVES.filter((m) => m.id === 'wave' || m.id === 'heart');
const KEEP_SCALE = 2.4;   // ผู้ใช้ 1 พ.ย.: ขยายจาก 1.9
/** ขอบบนหัวเจ้าของร้าน (รวมหมวก · หน่วยโลก) — main.js วางฟองคำพูดไว้เหนือจุดนี้ */
export const KEEP_TOP = COUNTER + 6 - 76 * KEEP_SCALE;   // เผื่อหมวก/ขนนกสูงสุด (ร้านแลกของรางวัล)
let act = null;   // { move, start, next } · start = tick ที่เริ่มท่า · next = tick ที่จะเล่นท่าถัดไป

// ── สายตาตามผู้เล่น (ผู้ใช้ 1 พ.ย.) ── คอม = กรอกตามองตามเมาส์ · มือถือ = มองจุดที่จิ้มเลือกของ ค้างครู่หนึ่งแล้วกลับไปมองเล่น
// tx/ty = เป้า (-1..1) จากตำแหน่งชี้เทียบหัวน้อง · w = น้ำหนักการมองตาม (ค่อย ๆ เข้า/ออก ไม่ให้ตาวูบ)
const HEAD_Y = COUNTER + 6 - 38 * KEEP_SCALE;   // ระดับตาโดยประมาณ (หน่วยโลก)
const eye = { x: 0, y: 0, tx: 0, ty: 0, w: 0, until: -1 };
let lastT = 0, lastKeepX = 0;
let view = { s: 1, oy: 0 };   // มุมมองล่าสุดที่วาด (ใช้แปลงตำแหน่งที่ผู้เล่นชี้)
/** จุดที่ผู้เล่นชี้/จิ้ม (หน่วยโลก) · hold = จำนวนเฟรมที่มองค้างหลังชี้ครั้งล่าสุด */
export function keeperLook(wx, wy, hold) {
  // พิกัดจอ → พิกัดฉาก (ฉากอาจถูกย่อ/เลื่อน — drawInterior view)
  wx /= view.s; wy = (wy - view.oy) / view.s;
  eye.tx = Math.max(-1, Math.min(1, (wx - lastKeepX) / 300));
  eye.ty = Math.max(-1, Math.min(1, (wy - HEAD_Y) / 220));
  eye.until = lastT + hold;
}
function lookAtPlayer(sh, t) {
  const on = t < eye.until;
  eye.w += ((on ? 1 : 0) - eye.w) * 0.12;
  eye.x += (eye.tx - eye.x) * 0.2;
  eye.y += (eye.ty - eye.y) * 0.2;
  if (eye.w < 0.01 || (sh.gaze != null && !sh.idle)) return sh;   // ท่าที่สั่งสายตาเอง: ไม่แย่ง
  const w = eye.w, mix = (a, b) => (a || 0) * (1 - w) + b * w;
  // หัวหันตามนิด + ตาดำกรอกไปชัด ๆ (pupilX/Y)
  return { ...sh, gaze: mix(sh.gaze, eye.x * 0.6), gazeY: mix(sh.gazeY, eye.y * 0.45), pupilX: mix(sh.pupilX, eye.x * 0.32), pupilY: mix(sh.pupilY, eye.y * 0.28) };
}
function keeperShape(t) {
  if (!act) act = { move: KEEP_MOVES[0], start: t + 24, next: 0 };   // เพิ่งเข้าร้าน: รอฉากจางเข้าแล้วโบกมือทัก
  const r = t - act.start;
  if (act.move && r >= act.move.dur) act = { move: null, last: act.move, start: 0, next: t + 480 + Math.random() * 240 };
  if (!act.move && t >= act.next) {
    const pool = KEEP_MOVES.filter((m) => m !== act.last);   // ไม่ซ้ำท่าล่าสุด
    act = { move: pool[Math.floor(Math.random() * pool.length)], start: t, next: 0 };
  }
  if (act.move && t >= act.start) return { ...act.move.shape(t - act.start), turn: 0 };
  // ยืนว่าง: เอียงหัวช้า ๆ + เหลือบมองซ้าย/ขวาเป็นพัก (ตาไปก่อน หัวตามนิด)
  const T = t / 60, look = Math.sin(T * 0.37) > 0.6 ? 1 : Math.sin(T * 0.37) < -0.75 ? -1 : 0;
  return { turn: 0, tilt: Math.sin(T * 0.8) * 0.04 + look * 0.04, gaze: look * 0.7, idle: true };
}
function drawKeeper(c, id, keepX, t) {
  const s = CAT2_KEEPERS.find((d) => d.shop === id) || skinById(INTERIOR[id].keeper);
  if (!s) return;
  lastT = t; lastKeepX = keepX;
  const sh = lookAtPlayer(keeperShape(t), t);
  // ยืนสูงพอให้เห็นถึงอก (หัวโตแบบชิบิ — จมลึกกว่านี้เห็นแค่หัว) · lift = หน่วยตัวแมว (เด้งดีใจ)
  drawCat2(c, keepX, COUNTER + 6 - (sh.lift || 0) * KEEP_SCALE, KEEP_SCALE, s, t, { k: 1, shape: sh });
}

/**
 * วาดฉากในร้าน (พิกัดจอ: กว้าง vw สูง H) — ภาพนิ่งจากแคช + ของขยับ
 * v = { s, oy }: ย่อฉาก s เท่า แล้วเลื่อนลง oy (หน่วยจอ) — จอแนวตั้งที่แผงอยู่ล่าง ฉากต้องพอดีพื้นที่เหนือแผง (main.js measureKeep)
 * keepX เป็นพิกัดฉาก (ก่อนย่อ)
 */
export function drawInterior(c, id, vw, keepX, t, v = { s: 1, oy: 0 }) {
  const art = SHOP_ART[id];
  view = v;
  const k = c.getTransform().a * v.s;
  vw /= v.s;   // ความกว้างฉากที่เห็น (หน่วยฉาก)
  const key = `${id}|${Math.round(vw)}|${Math.round(keepX)}|${k.toFixed(3)}`;
  if (!cache || cache.key !== key) {
    const layer = (paint) => {
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(vw * k);
      cv.height = Math.ceil(H * k);
      const cc = cv.getContext('2d');
      cc.scale(k, k);
      paint(cc);
      return cv;
    };
    cache = { key, back: layer((cc) => art.back(cc, vw, keepX)), front: layer((cc) => art.front(cc, keepX)) };
  }
  if (v.s < 1) { c.fillStyle = '#2A1E3A'; c.fillRect(0, 0, vw * v.s, H); }   // ใต้ฉากที่ย่อ (หลังแผง)
  c.save();
  c.translate(0, v.oy);
  c.scale(v.s, v.s);
  c.drawImage(cache.back, 0, 0, vw, H);
  drawKeeper(c, id, keepX, t);
  c.drawImage(cache.front, 0, 0, vw, H);
  art.live(c, vw, keepX, t);
  c.restore();
}
