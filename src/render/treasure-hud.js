// src/render/treasure-hud.js
// ─────────────────────────────────────────────────────────────
// ช่องสมบัติที่ติดตั้งไว้ โผล่กลางล่างของจอระหว่างวิ่ง
//
// วางไว้กลางล่างเพราะเป็นที่เดียวที่ไม่ชนกับอะไรเลย:
//   ซ้ายบน  = แถวตัวอักษรสะสม     ขวาบน = ค่าขนมเปียก + ปุ่มหยุด
//   ซ้ายล่าง/ขวาล่าง = ปุ่มกระโดด/หมอบ บนมือถือ
// และเป็นที่ที่สายตาผ่านบ่อยอยู่แล้วเพราะน้องแมววิ่งอยู่แถวล่างของจอ
//
// วาดหลัง postProcess() = ไม่สั่นตามจอตอนโดนชน ตั้งใจ — ตัวเลขนับถอยหลัง
// ที่สั่นไปมาอ่านไม่ทันพอดีในจังหวะที่ชุลมุนที่สุด
// ─────────────────────────────────────────────────────────────
import { VIEW } from '../config.js';

const { W, H } = VIEW;

const SLOT = 54;      // ด้านของช่องหนึ่งช่อง
const GAP = 9;
const BOTTOM = 12;    // ห่างจากขอบล่างของจอ
const STRIP = 16;     // แถบนับถอยหลังที่ก้นช่อง
const RADIUS = 13;
/** จำนวนช่องสมบัติต่อตา (ดู treasures.js — ติดตั้งได้ตาละ 3 ชิ้น) */
const SLOTS = 3;
/** ช่องการ์ดพรสวรรค์ห่างจากกลุ่มช่องสมบัติเท่านี้ — กว้างกว่า GAP ให้อ่านออกว่าเป็นคนละกลุ่ม */
const TALENT_GAP = 18;
/** สีขอบการ์ดพรสวรรค์ตามระดับ — ชุดเดียวกับกรอบการ์ดในหน้าการ์ดพลัง (A ขอบครีม / S ทอง / SS ชมพูรุ้ง) */
const RANK_COLOR = { A: '#EADCF7', S: '#FFC93C', SS: '#FF8FB0' };

/** วาดกรอบมนลงใน path ปัจจุบัน แยกไว้เพราะต้องใช้ทั้งตอน fill และตอน clip */
function slotPath(ctx, x, y) {
  ctx.beginPath();
  ctx.roundRect(x, y, SLOT, SLOT, RADIUS);
}

/**
 * @param gauges ผลจาก TreasureRun.gauges()
 * @param tick   ตัวนับเฟรมของเกม ใช้ทำจังหวะเต้นของช่องที่พร้อมใช้
 * @param talent การ์ดพรสวรรค์แบบทำงานเอง (ไม่มีปุ่มให้กด) ที่ติดตั้งอยู่ — null = ไม่ต้องโชว์
 *
 * ช่องสมบัติขึ้นครบ 3 ช่องเสมอ — ช่องที่ไม่ได้ติดตั้งเป็นกรอบว่าง ๆ ไม่มีไอคอน
 * ผู้เล่นจะได้รู้ว่ามีที่ใส่สมบัติอีกกี่ชิ้น (เดิมไม่ติดตั้งเลย = ไม่มีอะไรขึ้น ไม่รู้ว่ามีระบบนี้)
 * การ์ดพรสวรรค์ที่ไม่ต้องกดวางต่อขวา แค่บอกว่ากำลังใช้ใบไหนอยู่
 * (ใบที่ต้องกดมีปุ่มของตัวเองมุมขวาล่างอยู่แล้ว)
 */
export function drawTreasureSlots(ctx, gauges, tick, talent = null) {
  const list = gauges || [];
  const n = Math.max(SLOTS, list.length);
  const total = n * SLOT + (n - 1) * GAP;
  let x = (W - total) / 2;
  const y = H - BOTTOM - SLOT;

  ctx.save();
  ctx.textAlign = 'center';
  for (let i = 0; i < n; i++) {
    if (list[i]) drawSlot(ctx, list[i], x, y, tick);
    else drawEmptySlot(ctx, x, y);
    x += SLOT + GAP;
  }
  if (talent) drawTalentSlot(ctx, talent, x - GAP + TALENT_GAP, y);
  ctx.restore();
}

/** ช่องที่ยังไม่ได้ใส่สมบัติ — กรอบจาง ๆ ไม่มีไอคอน ไม่มีตัวเลข */
function drawEmptySlot(ctx, x, y) {
  slotPath(ctx, x, y);
  ctx.fillStyle = 'rgba(20,11,34,.5)';
  ctx.fill();
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255,243,226,.22)';
  ctx.stroke();
  ctx.setLineDash([]);
}

/** การ์ดพรสวรรค์ที่ใช้อยู่ — ไอคอน + ขอบสีตามระดับ + ป้ายระดับมุมบนขวา */
function drawTalentSlot(ctx, t, x, y) {
  const c = RANK_COLOR[t.rank] || RANK_COLOR.A;
  slotPath(ctx, x, y);
  ctx.fillStyle = 'rgba(20,11,34,.82)';
  ctx.fill();
  // พื้นย้อมสีตามระดับ — อิโมจิบางตัวสีเข้ม (🐾 ⚓) จมหายบนพื้นมืดล้วน
  ctx.save();
  slotPath(ctx, x, y);
  const bg = ctx.createRadialGradient(x + SLOT / 2, y + SLOT / 2, 2, x + SLOT / 2, y + SLOT / 2, SLOT * 0.62);
  bg.addColorStop(0, 'rgba(255,248,236,.62)');
  bg.addColorStop(1, 'rgba(255,248,236,.08)');
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = c;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.font = '27px serif';
  ctx.fillText(t.icon, x + SLOT / 2, y + SLOT / 2 + 1);
  ctx.restore();

  slotPath(ctx, x, y);
  ctx.lineWidth = 2;
  ctx.strokeStyle = c;
  ctx.stroke();

  // ป้ายระดับ (A / S / SS) เกาะมุมบนขวา บอกว่าเป็นการ์ด ไม่ใช่สมบัติอีกชิ้น
  const label = t.rank || 'A';
  ctx.save();
  ctx.font = '700 10px Mali, sans-serif';
  const bw = Math.max(16, ctx.measureText(label).width + 8);
  const bx = x + SLOT - bw + 4;
  const by = y - 6;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, 14, 7);
  ctx.fillStyle = c;
  ctx.fill();
  ctx.fillStyle = '#2A1238';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + bw / 2, by + 7.5);
  ctx.restore();
}

function drawSlot(ctx, g, x, y, tick) {
  // สามสถานะที่หน้าตาต้องต่างกันให้อ่านออกในแวบเดียว:
  //   พร้อม   = สว่างเต็ม มีวงเรืองรอบ
  //   ชาร์จ   = หรี่ไอคอนลง โชว์ตัวเลขว่าเหลืออีกเท่าไหร่
  //   ใช้แล้ว = หรี่จนเกือบจาง ไม่มีตัวเลข เพราะไม่มีอะไรให้รอแล้ว (นมวิเศษ)
  const spent = !g.ready && g.unit === 'none';
  const charging = !g.ready && !spent;

  // ── วงเรืองตอนพร้อมใช้ ──
  // ใช้ shadow แทนการวาดวงซ้อน จะได้ฟุ้งจริงโดยไม่ต้องไล่ alpha หลายชั้น
  if (g.ready) {
    const pulse = 0.5 + 0.5 * Math.sin(tick / 13);
    ctx.save();
    ctx.shadowColor = g.color;
    ctx.shadowBlur = 9 + pulse * 9;
    slotPath(ctx, x, y);
    ctx.fillStyle = 'rgba(20,11,34,.9)';
    ctx.fill();
    ctx.restore();
  }

  // ── พื้นช่อง ──
  // ช่องที่ใช้ไปแล้วยังต้องทึบพอ ๆ กับช่องอื่น ไม่งั้นมันกลืนกับพื้นด่าน
  // จนดูเหมือน "ช่องหาย" แทนที่จะเป็น "ช่องที่ใช้ไปแล้ว" ซึ่งคนละความหมาย
  slotPath(ctx, x, y);
  ctx.fillStyle = spent ? 'rgba(20,11,34,.74)' : 'rgba(20,11,34,.82)';
  ctx.fill();

  // ── พื้นไล่ขึ้นตามความคืบหน้า ──
  // ไล่ "จากล่างขึ้นบน" ไม่ใช่กวาดเป็นวงกลม เพราะที่ขนาด 54px วงกวาด
  // อ่านตำแหน่งเข็มไม่ออก ส่วนระดับน้ำที่สูงขึ้นดูออกทันทีแม้เหลือบมอง
  if (charging && g.ratio > 0) {
    ctx.save();
    slotPath(ctx, x, y);
    ctx.clip();
    const fh = SLOT * Math.min(1, g.ratio);
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = g.color;
    ctx.fillRect(x, y + SLOT - fh, SLOT, fh);
    // ขีดสว่างที่ผิวน้ำ ให้เห็นว่ามันขยับอยู่แม้ตอนที่พื้นยังจาง
    ctx.globalAlpha = 0.75;
    ctx.fillRect(x, y + SLOT - fh, SLOT, 1.5);
    ctx.restore();
  }

  // ── ไอคอน ──
  // ยกขึ้นจากกลางช่องเล็กน้อยเมื่อมีแถบตัวเลข ไม่งั้นไอคอนจะทับตัวเลข
  ctx.save();
  ctx.globalAlpha = g.ready ? 1 : spent ? 0.34 : 0.5;
  ctx.textBaseline = 'middle';
  ctx.font = '27px serif';
  ctx.fillText(g.emoji, x + SLOT / 2, y + (charging ? SLOT / 2 - 7 : SLOT / 2));
  ctx.restore();

  // ── แถบนับถอยหลัง ──
  if (charging) {
    const text = countdownText(g);
    if (text) {
      ctx.save();
      slotPath(ctx, x, y);
      ctx.clip();
      ctx.fillStyle = 'rgba(9,5,17,.78)';
      ctx.fillRect(x, y + SLOT - STRIP, SLOT, STRIP);
      ctx.restore();

      ctx.save();
      ctx.textBaseline = 'middle';
      ctx.font = '700 13px Mali, sans-serif';
      ctx.fillStyle = g.color;
      ctx.fillText(text, x + SLOT / 2, y + SLOT - STRIP / 2 + 0.5);
      ctx.restore();
    }
  }

  // ── ขอบ ──
  slotPath(ctx, x, y);
  ctx.lineWidth = g.ready ? 2 : 1.5;
  ctx.strokeStyle = g.ready ? g.color : 'rgba(255,243,226,.24)';
  ctx.globalAlpha = spent ? 0.72 : 1;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/**
 * ข้อความในแถบล่าง
 *
 * ── ทำไมไม่มีคำว่า "วิ" ต่อท้าย ──
 * เคยเขียนเป็น "44 วิ" แล้ววัดจริงพบว่า Mitr วาดสระ ิ เป็นขีดตรง ๆ เหนือ ว
 * อ่านออกมาเป็น "ō" ไม่ใช่ "วิ" ส่วนฟอนต์ที่วาดถูกคือฟอนต์สำรองของเครื่อง
 * ซึ่งแปลว่าหน้าตาจะเปลี่ยนไปตามมือถือแต่ละรุ่น — คุมไม่ได้
 * ที่ 12px ในช่องกว้าง 54px ไม่มีที่ให้เสี่ยงแบบนั้น
 *
 * เลยแยกสองหน่วยด้วยรูปแบบตัวเลขแทน ซึ่งวาดเหมือนกันทุกเครื่อง:
 *   นับเวลา   → ตัวเลขเปล่า ๆ  อ่านเป็นวินาทีเหมือนคูลดาวน์ในเกมทั่วไป
 *   นับจำนวน  → มี × นำหน้า    อ่านเป็น "อีกกี่ชิ้น" ไม่ปนกับเวลา
 *
 * วินาทีปัดขึ้นเสมอ — เหลือ 0.3 วิต้องอ่านว่า 1 ไม่ใช่ 0
 * เลข 0 ค้างบนจอทั้งที่ยังไม่ทำงานทำให้ดูเหมือนเกมค้าง
 */
function countdownText(g) {
  if (g.unit === 'sec') return String(Math.ceil(g.left / 60));
  if (g.unit === 'hits') return '×' + Math.max(1, Math.round(g.left));
  return '';
}
