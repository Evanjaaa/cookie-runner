// src/town/emotes.js
// ─────────────────────────────────────────────────────────────
// ท่าทางของน้องในเมือง (ผู้ใช้ 28 ต.ค.) — ปุ่มข้างจอย (มือถือ) / ปุ่ม Q (คอม) เปิดแผงเลือกท่า
//
// ท่าทั้งหมดมาจากหน้าแรกชุดเดียวกัน ไม่มีท่าชุดที่สองให้ดูแล:
//   ท่าค้าง   = ท่าว่างของหน้าแรก (IDLE_ACTS ใน game.js → รูปร่างจาก IDLE_SHAPE / poseShape) ค้างจนกว่าจะเดิน
//   ท่าเล่น   = ท่าตอบการแตะ (HOME_MOVES) จาก src/home-moves.js เล่นจบแล้วกลับยืน (ท่ารับหัวใจเอาออกจากวงล้อแล้ว — ผู้ใช้ 28 ต.ค.)
//   ท่าแอ็ค   = ท่าประจำชุดระดับ S (cat2Act) — โชว์เฉพาะตอนใส่ชุดที่มีท่าแอ็ค ค้างจนกว่าจะเดิน
// เสียงร้อง (voices) กับของประกอบ (หัวใจ ประกาย zzz) ยิงตามจังหวะเดียวกับหน้าแรก
//
// เดิน / กระโดด / นั่งม้านั่ง = ตัดท่าทันที (main.js เรียก stopEmote(true))
// เลือกท่าใหม่ระหว่างท่าเดิมยังไม่จบ = ผสมจากรูปร่างที่ค้างอยู่ช่วงสั้น ๆ ไม่วาร์ป
// ─────────────────────────────────────────────────────────────
import { HOME_MOVES, LOVE_MOVE, mixShape, scaleShape, E } from '../home-moves.js';
import { poseShape, drawHeart, star4 } from '../render/entities.js';
import { cat2Act } from '../render/cat2.js';
import { BODY } from '../config.js';
import { sfx as voice } from '../audio.js';

const BLEND = 14;     // เฟรมผสมจากท่าที่ค้างอยู่เข้าท่าใหม่
const FADE_OUT = 20;  // เฟรมคลายท่าตอนกดหยุด

// ท่าค้าง — ค่าเดียวกับ IDLE_ACTS ของหน้าแรก (เสียง / ช่วงเข้าท่า) · หาวจบเองหลัง 3 วิ (ปากอ้าค้างนานกว่านี้อ่านเป็นภาพค้าง)
const HOLD = {
  sit: { ease: 48, voice: 'mew' },
  loaf: { ease: 26, voice: 'snooze' },
  groom: { ease: 26, voice: 'purr' },
  yawn: { ease: 26, voice: 'yawn', hold: 180 },
};
const MOVES = Object.fromEntries([...HOME_MOVES, LOVE_MOVE].map((m) => [m.id, m]));

// แผงเลือกท่า: ชื่อ + ไอคอน (emoji เหมือนปุ่มกระเป๋า)
const LIST = [
  { id: 'sit', kind: 'hold', name: 'นั่ง', icon: '🐈' },
  { id: 'loaf', kind: 'hold', name: 'หมอบ', icon: '🍞' },
  { id: 'groom', kind: 'hold', name: 'เลียอุ้งเท้า', icon: '👅' },
  { id: 'yawn', kind: 'hold', name: 'หาว', icon: '🥱' },
  { id: 'wave', kind: 'move', name: 'โบกมือ', icon: '👋' },
  { id: 'heart', kind: 'move', name: 'ส่งหัวใจ', icon: '💝' },
  { id: 'scratch', kind: 'move', name: 'เกาท้อง', icon: '🐾' },
  { id: 'curl', kind: 'move', name: 'ขดตัวเขิน', icon: '☺️' },
  { id: 'float', kind: 'move', name: 'ลอยเฟี้ยว', icon: '😎' },
  { id: 'tail', kind: 'move', name: 'เล่นหาง', icon: '🌀' },
];

/** รายการท่าที่เลือกได้ตอนนี้ — ท่าแอ็คขึ้นเฉพาะตอนใส่ชุดระดับ S ที่มีท่าแอ็ค */
export function emoteList(outfit) {
  const out = LIST.slice();
  if (outfit && cat2Act(outfit.id)) out.push({ id: 'act', kind: 'act', name: 'ท่าแอ็ค · ' + outfit.name, icon: '✨' });
  return out;
}

let cur = null;     // { id, kind, t, out, from, act }
const fx = [];      // ของประกอบ (พิกัดโลก) — ลอยไปเองหลังปล่อย ไม่ติดตัว

export const emoteId = () => (cur && cur.out < 0 ? cur.id : null);

/** เริ่มท่า — outfit ใช้หาท่าแอ็คของชุดที่ใส่อยู่ */
export function startEmote(id, outfit, tick) {
  const def = id === 'act' ? { kind: 'act' } : LIST.find((d) => d.id === id);
  if (!def) return;
  const act = def.kind === 'act' ? cat2Act(outfit?.id) : null;
  if (def.kind === 'act' && !act) return;
  const now = emotePose(tick);
  cur = {
    id, kind: def.kind, act, out: -1,
    // รับหัวใจ: ข้ามช่วงรอหัวใจลอยมาจากปุ่ม (ในเมืองไม่มีหัวใจลอยมา) เหลือแค่จังหวะเงยมองก่อนกระโดด
    t: id === 'love' ? LOVE_MOVE.lead - 14 : 0,
    t0: 0,
    from: now ? scaleShape(now.shape, now.k) : null,
  };
  cur.t0 = cur.t;
  if (def.kind === 'hold') voice[HOLD[id].voice]?.();
}

/** หยุดท่า — now = ตัดทันที (เริ่มเดิน/กระโดด) · ไม่งั้นค่อย ๆ คลายกลับยืน */
export function stopEmote(now = false) {
  if (!cur) return;
  if (now) cur = null;
  else if (cur.out < 0) cur.out = 0;
}

/**
 * เดินท่าไปทีละเฟรม · at = จุดอ้างอิงบนตัวน้องตอนนี้ (ใช้ปล่อยของประกอบ)
 */
export function stepEmote(dt, at) {
  for (const p of fx) {
    p.age += dt;
    if (p.age < 0) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.g || 0) * dt;
    p.vx *= 0.985;
  }
  for (let i = fx.length - 1; i >= 0; i--) if (fx[i].age >= fx[i].life) fx.splice(i, 1);
  if (!cur) return;
  const t0 = cur.t;
  cur.t += dt;
  if (cur.out >= 0) {
    cur.out += dt;
    if (cur.out >= FADE_OUT) cur = null;
    return;
  }
  if (cur.kind === 'move') {
    const m = MOVES[cur.id];
    for (const [f, v] of m.voices || []) if (t0 < f && cur.t >= f) voice[v]?.();
    for (const [f, fn] of m.fx || []) if (t0 < f && cur.t >= f) fn(emitter(), at);
    if (cur.t >= m.dur) cur = null;
  } else if (cur.kind === 'hold' && HOLD[cur.id].hold && cur.t >= HOLD[cur.id].hold) cur.out = 0;
}

/** รูปร่างตอนนี้ { k, shape } ส่งให้ drawCat2 ได้ตรง ๆ · null = ไม่ได้ทำท่า */
export function emotePose(tick) {
  if (!cur) return null;
  let k = 1, shape;
  const u = cur.t - cur.t0;
  if (cur.kind === 'move') {
    const m = MOVES[cur.id];
    shape = m.shape(Math.min(cur.t, m.dur));
  } else {
    shape = cur.kind === 'act' ? cur.act.shape(tick) : poseShape(cur.id);
    const ease = cur.kind === 'hold' ? HOLD[cur.id].ease : 30;
    k = E.io(Math.min(1, u / ease));
  }
  // เฟรมแรก ๆ ผสมจากท่าที่ค้างอยู่ — กำลังนั่งแล้วเปลี่ยนเป็นโบกมือ = ลุกจากท่านั่งจริง ไม่วาร์ปไปยืนก่อน
  if (cur.from && u < BLEND) {
    shape = mixShape(cur.from, k < 1 ? scaleShape(shape, k) : shape, E.io(u / BLEND));
    k = 1;
  }
  if (cur.out >= 0) k *= 1 - E.io(Math.min(1, cur.out / FADE_OUT));
  return { k, shape };
}

/** ความสูงที่ท่ายกตัวน้องขึ้น (หน่วยตัวแมว คูณสเกลเอง) */
export function emoteLift(pose) {
  return pose ? (pose.shape.lift || 0) * pose.k : 0;
}

/** จุดอ้างอิงบนตัวน้อง — สูตรเดียวกับ homeAnchors ของหน้าแรก (หัว -12 หน่วยจากกลางตัว) */
export function emoteAnchors(x, feet, scale) {
  const body = feet - (BODY.standH / 2) * scale;
  return {
    scale,
    head: { x: x + scale, y: body - 12 * scale, r: 13 * scale },
    chest: { x, y: body + 2 * scale, s: scale },
    tail: { x: x - 26 * scale, y: body - 12 * scale },
  };
}

// ตัวปล่อยของประกอบ — ชุดเดียวกับ fxEmit ของหน้าแรก (game.js)
const rnd = (a, b) => a + Math.random() * (b - a);
function emitter() {
  return {
    sparks(p, n) {
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + rnd(-0.3, 0.3);
        fx.push({ kind: 'spark', x: p.x, y: p.y, vx: Math.cos(ang) * rnd(1.2, 2.2),
          vy: Math.sin(ang) * rnd(1.2, 2.2) - 0.6, r: rnd(4, 7), age: 0, life: rnd(26, 36) });
      }
    },
    blush(head) {
      for (let i = 0; i < 3; i++) {
        const side = i % 2 ? 1 : -1;
        fx.push({ kind: 'heart', x: head.x + side * head.r * rnd(0.9, 1.3), y: head.y + rnd(-4, 6),
          vx: side * rnd(0.2, 0.5), vy: rnd(-0.9, -0.6), r: rnd(3.5, 5), age: -i * 6, life: 50 });
      }
    },
    z(head) {
      fx.push({ kind: 'z', x: head.x + head.r * 0.8, y: head.y - head.r * 0.8,
        vx: 0.35, vy: -0.5, r: head.r * 0.5, age: 0, life: 84 });
    },
    gift(chest) {
      const s = chest.s;
      fx.push({ kind: 'big', x: chest.x + 10 * s, y: chest.y, vx: 1.5, vy: -1.55, r: 13, age: 0, life: 74 });
      for (let i = 0; i < 8; i++) {
        const side = i % 2 ? 1 : -1;
        fx.push({ kind: 'heart', x: chest.x + side * 12 * s, y: chest.y + 2 * s,
          vx: side * rnd(2, 3.2), vy: rnd(-1.3, -0.2), r: rnd(4, 6.5), age: 0, life: rnd(44, 60), g: 0.03 });
      }
      for (let i = 0; i < 6; i++) {
        const side = i % 2 ? 1 : -1;
        fx.push({ kind: 'spark', x: chest.x + side * 14 * s, y: chest.y, vx: side * rnd(1.5, 2.8),
          vy: rnd(-1.6, 0.4), r: rnd(4, 6.5), age: 0, life: 32 });
      }
    },
  };
}

/** วาดของประกอบ (พิกัดโลก) — เรียกหลังวาดตัวน้อง ของจึงอยู่หน้าตัว · หน้าตาเดียวกับ drawHomeFx */
export function drawEmoteFx(ctx) {
  for (const p of fx) {
    if (p.age < 0) continue;
    const u = p.age / p.life;
    ctx.save();
    if (p.kind === 'big') {
      const s = p.r * (1 + u * 1.7);
      ctx.globalAlpha = u < 0.65 ? 1 : (1 - u) / 0.35;
      ctx.fillStyle = 'rgba(255,120,170,.28)';
      ctx.beginPath(); ctx.arc(p.x, p.y, s * 1.35, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2;
      drawHeart(ctx, p.x, p.y, s);
    } else if (p.kind === 'heart') {
      ctx.globalAlpha = Math.min(1, (1 - u) * 2.2);
      ctx.lineWidth = 1.4;
      drawHeart(ctx, p.x, p.y, p.r * (0.6 + (1 - u) * 0.4));
    } else if (p.kind === 'spark') {
      ctx.globalAlpha = 1 - u;
      ctx.fillStyle = '#FFF1A8';
      star4(ctx, p.x, p.y, p.r * (1 - u * 0.6));
    } else if (p.kind === 'z') {
      ctx.globalAlpha = Math.sin(u * Math.PI) * 0.9;
      const size = p.r * (0.7 + u * 0.7);
      ctx.font = `700 ${size.toFixed(1)}px Mali, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(60,30,90,.55)';
      ctx.strokeText('z', p.x, p.y);
      ctx.fillStyle = '#EDE3FF';
      ctx.fillText('z', p.x, p.y);
    }
    ctx.restore();
  }
}
