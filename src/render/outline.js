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
export function drawOutlined(ctx, paint) {
  if (OUTLINE.on) {
    const { width: w, height: h } = ctx.canvas;
    ensure(w, h);

    // รอบเงา: transform เดียวกับผ้าใบหลัก (สเกลความละเอียด + การสั่นจอ) และปิดแสงเรือง
    const m = ctx.getTransform();
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
    layerCtx.fillRect(0, 0, w, h);
    layerCtx.globalCompositeOperation = 'source-over';

    // ความหนาคิดเป็นหน่วยของเกม แล้วคูณสเกลจอ เส้นจึงหนาเท่ากันทุกความละเอียด
    const r = OUTLINE.width * Math.hypot(m.a, m.b);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const [dx, dy] of dirs(OUTLINE.dirs)) ctx.drawImage(layer, dx * r, dy * r);
    ctx.restore();
  }
  paint(ctx);
}
