// src/render/outline.js
// ─────────────────────────────────────────────────────────────
// เส้นขอบรอบของทุกชิ้นในด่าน (สิ่งกีดขวาง ของอันตราย ของกิน ไอเท็ม)
// ให้เข้าชุดกับเส้นขอบตัวแมว — ของในฉากจะได้ไม่ดูเป็นคนละลายเส้นกับตัวละคร
//
// ── ทำไมไม่ไปเติม stroke ในฟังก์ชันวาดทีละชิ้น ──
// ของในเกมมีหลายสิบแบบ ต่อฉากต่อธีม ถ้าตีเส้นทีละชิ้นต้องแก้ทุกฟังก์ชัน
// และชิ้นที่วาดจากหลายรูปซ้อนกันจะได้เส้นทับกันกลางตัว ไม่ใช่แค่รอบนอก
//
// ── วิธีที่ใช้ ──
// 1) วาดของทั้งหมดลงผ้าใบแยกแบบ "ไม่มีแสงเรือง" แล้วทาสีทึบทั้งรูป = เงาของรูปทรง
// 2) วางเงาเยื้องรอบทิศลงจอจริง
// 3) วาดของจริง (มีแสงเรืองครบ) ทับลงไป ส่วนที่เงาโผล่พ้นออกมาคือเส้นขอบพอดี
//
// ทำไมต้องวาดสองรอบ ไม่ใช้ภาพจากรอบแรกวางทับเลย: ไอเท็มมีวงแสงเรืองโปร่งกว้าง
// ถ้าเงามาจากภาพที่มีแสงเรือง เงาจะเป็นวงใหญ่ทั้งวง แล้วโผล่ผ่านแสงโปร่งเป็นคราบเทาดำ
// (วัดแล้วเห็นชัดที่ขวดพลังกับโล่) รอบแรกจึงต้องปิดแสงเรืองให้เหลือแต่ตัวของจริง ๆ
//
// ของใหม่ที่เพิ่มในอนาคตได้เส้นขอบเองแค่วาดในบล็อกที่ส่งเข้ามา
// หน้าแรกกับห้องไม่ผ่านที่นี่ — ใช้เฉพาะตอนวิ่งในด่านกับฉากโบนัส
// ─────────────────────────────────────────────────────────────
import { OUTLINE } from '../config.js';
import { GLOW } from './entities.js';

let layer = null;
let layerCtx = null;

/** ผ้าใบเงาขนาดเท่าจอจริง — สร้างใหม่เฉพาะตอนขนาดจอเปลี่ยน */
function ensure(w, h) {
  if (!layer) {
    layer = document.createElement('canvas');
    layerCtx = layer.getContext('2d');
    // เงาเบลอ (shadowBlur) ก็เป็นแสงเรืองอีกแบบที่ฟังก์ชันวาดตั้งเองโดยตรง
    // ปิดที่ตัวผ้าใบนี้ทีเดียว: ค่าที่ตั้งเข้ามาถูกเมินทิ้ง ผ้าใบนี้จึงไม่มีเงาเบลอเลย
    for (const key of ['shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY']) {
      Object.defineProperty(layerCtx, key, { get: () => (key === 'shadowColor' ? 'rgba(0,0,0,0)' : 0), set: () => {} });
    }
  }
  if (layer.width !== w || layer.height !== h) {
    layer.width = w;
    layer.height = h;
  }
}

/** ทิศที่วางเงาเยื้อง — n ทิศเรียงรอบวง (ดู OUTLINE.dirs) */
const dirsCache = new Map();
function dirs(n) {
  if (!dirsCache.has(n)) {
    dirsCache.set(n, Array.from({ length: n }, (_, i) => [Math.cos((i * 2 * Math.PI) / n), Math.sin((i * 2 * Math.PI) / n)]));
  }
  return dirsCache.get(n);
}

/**
 * วาดของชุดหนึ่งพร้อมเส้นขอบรอบนอก
 * @param {CanvasRenderingContext2D} ctx ผ้าใบหลักของเกม
 * @param {(c: CanvasRenderingContext2D) => void} paint วาดของทั้งหมดลงผ้าใบที่ส่งให้ — ถูกเรียกสองครั้ง
 *   จึงห้ามเปลี่ยนสถานะเกมข้างใน (วาดอย่างเดียว)
 */
export function drawOutlined(ctx, paint, spans = null) {
  if (OUTLINE.on) {
    const { width: w, height: h } = ctx.canvas;
    const m = ctx.getTransform();
    // ── ทำเฉพาะแถบที่มีของ ──
    // เส้นขอบคือการแปะผ้าใบเงาทั้งจอซ้ำ 8 ทิศ + ล้าง + ทาสี = ราวสิบรอบเต็มจอต่อเฟรม
    // ซึ่งกินแรงการ์ดจอที่สุดในเกม (ตัวทำให้มือถือร้อน) ทั้งที่ส่วนใหญ่ของจอว่างเปล่า
    // ผู้เรียกส่งแถบแนวนอนที่มีของอยู่มา (พิกัดเกม เผื่อขอบไว้แล้ว) — นอกแถบไม่มีอะไรให้ตีเส้น
    // ภาพที่ได้จึงเหมือนเดิมทุกพิกเซล แค่ไม่เสียแรงกับพื้นที่ว่าง
    // ไม่ส่งมา = ทั้งจอเหมือนเดิม / ส่งมาแต่ว่าง = ไม่มีของให้ตีเส้น ข้ามรอบเงาไปเลย
    const cols = spans
      ? spans.map(([a, b]) => {
        const x0 = Math.max(0, Math.floor(m.a * a + m.e));
        const x1 = Math.min(w, Math.ceil(m.a * b + m.e));
        return [x0, x1 - x0];
      }).filter(([, sw]) => sw > 0)
      : [[0, w]];

    if (cols.length) {
      ensure(w, h);

      // รอบเงา: transform เดียวกับผ้าใบหลัก (สเกลความละเอียด + การสั่นจอ) และปิดแสงเรือง
      layerCtx.setTransform(1, 0, 0, 1, 0, 0);
      layerCtx.globalCompositeOperation = 'source-over';
      layerCtx.clearRect(0, 0, w, h);
      layerCtx.setTransform(m);
      GLOW.on = false;
      try { paint(layerCtx); } finally { GLOW.on = true; }

      // ทาสีเส้นทับทั้งรูป — source-in เก็บความโปร่งใสของรูปเดิมไว้ ขอบจึงยังนุ่มเท่าเดิม
      layerCtx.setTransform(1, 0, 0, 1, 0, 0);
      layerCtx.globalCompositeOperation = 'source-in';
      layerCtx.fillStyle = OUTLINE.color;
      for (const [sx, sw] of cols) layerCtx.fillRect(sx, 0, sw, h);
      layerCtx.globalCompositeOperation = 'source-over';

      // ความหนาคิดเป็นหน่วยของเกม แล้วคูณสเกลจอ เส้นจึงหนาเท่ากันทุกความละเอียด
      const r = OUTLINE.width * Math.hypot(m.a, m.b);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (const [dx, dy] of dirs(OUTLINE.dirs)) {
        for (const [sx, sw] of cols) ctx.drawImage(layer, sx, 0, sw, h, sx + dx * r, dy * r, sw, h);
      }
      ctx.restore();
    }
  }
  paint(ctx);
}

/**
 * แถบแนวนอนบนจอที่มีของอยู่ สำหรับส่งให้ drawOutlined
 * @param {Array<Array<{x:number,w?:number,got?:boolean}>>} lists ของแต่ละชนิด (x = พิกัดโลก)
 * @param {number} camera
 * @param {number} viewW ความกว้างจอในหน่วยเกม
 * @returns {Array<[number, number]>} แถบ [ซ้าย, ขวา] ในพิกัดจอ เรียงและรวมที่ซ้อนกันแล้ว
 *
 * เผื่อขอบข้างละ OUTLINE.pad — ภาพบางชิ้นล้นกล่องชนออกไป (ชิ้นที่โดนชนกระเด็นหมุน ปีกผึ้ง
 * ประกายรอบไอเท็ม) แนวตั้งไม่ตัดเลย เพราะของห้อยจากเพดานกับของร่วงลากยาวถึงขอบบนจอ
 */
export function outlineSpans(lists, camera, viewW) {
  const pad = OUTLINE.pad;
  const raw = [];
  for (const list of lists) {
    for (const e of list) {
      if (e.got) continue;
      const a = e.x - camera - pad;
      const b = e.x - camera + (e.w || 0) + pad;
      if (b < 0 || a > viewW) continue;
      raw.push([Math.max(0, a), Math.min(viewW, b)]);
    }
  }
  raw.sort((p, q) => p[0] - q[0]);
  const out = [];
  for (const s of raw) {
    const last = out[out.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
    else out.push(s);
  }
  return out;
}
