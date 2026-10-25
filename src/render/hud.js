// src/render/hud.js
import { coverExt } from './cover-ext.js';
import { VIEW, COLORS as C, BONUS, SCENE, LIVES, comboMult } from '../config.js';
import { drawFish, drawCatFace } from './entities.js';
import { getSkin } from '../skins.js';
import { CAT2, useCat2, drawCatFaceAuto } from './cat2.js';
import { t } from '../i18n.js';
import { MISSION } from '../run-extras.js';

const { W, H } = VIEW;

// จุดยึดของ HUD แถวบน รวมไว้ที่เดียวจะได้ตรวจว่าไม่ทับกันได้โดยไม่ต้องไล่อ่านทั้งไฟล์
const TREAT_TOP = 58;    // ค่าขนมเปียก ขวาริม ใต้ปุ่มหยุด/เสียงที่เป็น DOM
const WORD_TOP = 22;     // แถวตัวอักษรสะสม ซ้ายบนสุด
const RUN_TOP = 76;      // หลอดระยะในด่านย่อย ใต้ช่องหัวใจ (ขอบครีมช่องหัวใจจบที่ ~59 · เว้นห่างตามที่ผู้ใช้ขอ 25 ต.ค.)
// ขอบบนสุดที่ป้ายกลางจอ (โบนัส / ผ่านด่าน) ยื่นขึ้นไปได้ — รวมวงตัวเลขตอนเด้ง ขอบครีม และประกาย
// ต้องพ้นหลอดระยะ (ราง RUN_TOP ถึง +10 + หัวน้องบนหลอดที่ยื่นลงมาอีกนิด) ห้ามบังเส้นทาง
const BANNER_CLEAR = RUN_TOP + 22;

/**
 * ระยะขั้นต่ำจากขอบจอ สำหรับเครื่องที่ไม่รายงานเขตปลอดภัยมาให้
 *
 * เดิม 24 ซึ่งพอบนคอมที่ canvas มีขอบจอเป็นกรอบให้อยู่แล้ว แต่บนมือถือ
 * canvas ยืดเต็มจอ (ดู .stage > canvas) และหน้าเว็บตั้ง viewport-fit=cover
 * ขอบจริงของเครื่องจึงกินเข้ามาถึงตรงนั้น
 */
const EDGE_MIN = 31;

/**
 * สัดส่วนของระยะปลอดภัยที่ยอมเว้นจริงสำหรับของที่อยู่ "แถวบนสุด"
 *
 * env(safe-area-inset-*) เผื่อไว้เท่ากันตลอดด้าน แต่บนมือถือแนวนอนรอยบาก
 * (หรือ Dynamic Island) อยู่กลางด้านข้าง ไม่ได้กินขึ้นไปถึงมุมบน ของที่เกาะ
 * แถวบนสุดอย่างแถวตัวอักษรกับค่าขนมเปียกจึงกินเข้าไปในระยะนั้นได้บางส่วน
 * โดยไม่โดนบัง — สิ่งที่ต้องพ้นจริง ๆ ตรงมุมคือความโค้งของมุมจอเท่านั้น
 *
 * 0.6 คือจุดที่ยังพ้นมุมโค้งของเครื่องที่โค้งลึกที่สุด แต่ไม่เสียที่ไปกับ
 * ระยะที่เผื่อไว้สำหรับรอยบากซึ่งอยู่คนละที่กับของพวกนี้
 * ถ้าเครื่องไหนยังโดนบัง ให้ขยับค่านี้ขึ้น (0.8 / 1.0 = เว้นเต็มระยะปลอดภัย)
 */
const SAFE_RATIO = 0.6;

/**
 * ระยะที่ควรเว้นจากขอบจอจริง — เอาค่าที่มากกว่า ไม่ใช่บวกกัน
 *
 * เคยเขียนเป็น EDGE_MIN + safe ซึ่งผิด เพราะสองค่านี้แก้ปัญหาเดียวกันคนละวิธี
 * safe คือระยะที่เครื่องรายงานว่าพ้นรอยบากแน่นอน ส่วน EDGE_MIN คือค่าที่เดาไว้
 * เผื่อเครื่องที่ไม่รายงานอะไรมาเลย พอบวกกันบนเครื่องที่มีรอยบากจริงจะเว้นซ้ำซ้อน
 *
 * EDGE_MIN = 31 ตรงกับ 3.2% ของความกว้าง ซึ่งเป็นค่าเดียวกับที่แถบบนฝั่ง DOM
 * ใช้ใน style.css ปุ่มหยุดกับค่าขนมเปียกจึงเรียงเป็นคอลัมน์เดียวกันพอดี
 */
function edgeInset(safeSide) {
  return Math.max(EDGE_MIN, safeSide * SAFE_RATIO);
}

/** ช่องไฟระหว่างไอคอนปลากับตัวเลข */
const TREAT_ICON_GAP = 14;

/* ── ระยะปลอดภัยของจอ (รอยบาก / มุมโค้ง / แถบ home) ──────────────
 *
 * ค่าคงที่ข้างบนอย่างเดียวไม่พอ เพราะแต่ละเครื่องกินขอบไม่เท่ากัน
 * iPhone ที่มี Dynamic Island ตอนแนวนอนกินฝั่งรอยบากถึงราว 59px
 * ซึ่งมากกว่าระยะที่เผื่อไว้ ตัวหนังสือจึงยังไปนอนอยู่ใต้รอยบากเหมือนเดิม
 *
 * CSS มีค่าให้อยู่แล้วคือ env(safe-area-inset-*) แต่ HUD วาดบน canvas
 * ซึ่งอ่าน CSS ไม่ได้ จึงต้องทำ "ตัวตรวจ" เป็น div ซ่อนไว้ที่เอา env() มาใส่
 * เป็น padding แล้วอ่านค่ากลับออกมาเป็นตัวเลข
 *
 * อ่านทีเดียวตอนขนาด canvas เปลี่ยน (= ตอนหมุนจอ/เปลี่ยนขนาดหน้าต่าง)
 * ไม่ใช่อ่านทุกเฟรม เพราะ getComputedStyle บังคับให้เบราว์เซอร์คำนวณเลย์เอาต์ใหม่
 */
let probe = null;
let insetCache = { cssW: -1, left: 0, right: 0 };

function readSafeInsets() {
  if (!probe) {
    probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)';
    document.body.appendChild(probe);
  }
  const cs = getComputedStyle(probe);
  return { left: parseFloat(cs.paddingLeft) || 0, right: parseFloat(cs.paddingRight) || 0 };
}

/**
 * ระยะปลอดภัย แปลงจากพิกเซล CSS เป็นหน่วยพิกัดของ canvas แล้ว
 * (canvas วาดด้วยระบบพิกัด 960x420 ของตัวเอง ไม่ใช่พิกเซลจริงบนจอ)
 */
function safeInsets(ctx) {
  const cssW = ctx.canvas.clientWidth || W;
  if (cssW !== insetCache.cssW) {
    const px = readSafeInsets();
    const k = W / cssW;
    insetCache = { cssW, left: px.left * k, right: px.right * k };
  }
  return insetCache;
}

export function drawHUD(ctx, game) {

  ctx.save();
  ctx.textBaseline = 'top';
  // iPad: ฉากต่อขึ้นบน (render/cover-ext.js) — แถบ HUD ย้ายขึ้นไปชิดขอบจอจริง ไม่ค้างอยู่กลางจอ
  const ext = coverExt(ctx);
  ctx.translate(0, -ext.top);

  // ค่าขนมเปียกเป็นตัวเลขเดียวที่โชว์ระหว่างวิ่ง
  //
  // คะแนนกับระยะทางถูกถอดออก — ทั้งคู่เป็นตัวเลขที่ดูตอนวิ่งไม่ทันอยู่ดี
  // และสรุปให้ครบอยู่แล้วบนหน้าจบรอบ การมีสามตัวเลขแข่งกันอยู่มุมเดียว
  // ทำให้ไม่มีตัวไหนอ่านออกสักตัว เหลือตัวเดียวจึงอ่านได้จริงตอนกำลังวิ่ง
  //
  // ชิดขวาริมและอยู่ใต้แถวปุ่มหยุด/เสียง (ปุ่มเป็น DOM ทับอยู่ราว y12–50)
  // TREAT_TOP จึงเริ่มที่ 58 — ถ้าไปแก้ขนาดปุ่มใน .hudbtns ต้องขยับค่านี้ตาม
  //
  // ไอคอนเดียวพอ — เลขนี้คือคะแนนรวมของกินทุกชนิด ไม่ใช่จำนวนปลา
  // ใช้ปลาเป็นตัวแทนเพราะเป็นของที่เจอบ่อยที่สุดและสีตัดกับพื้นหลังชัดที่สุด
  const treatText = game.treat.toLocaleString('en-US');
  const safe = safeInsets(ctx);
  const treatX = W - edgeInset(safe.right);

  // ยึดซ้ายแล้ววัดความกว้างเอง แทนการใช้ textAlign 'right'
  //
  // 'right' ยึดที่ "จุดที่เคอร์เซอร์เดินจบ" ไม่ใช่ขอบหมึกจริง ตัวท้ายของคำไทย
  // จึงล้ำพ้นจุดนั้นออกไปได้ ผลคือป้ายกับตัวเลขที่ควรชิดขอบขวาตรงกัน
  // กลับยื่นไม่เท่ากันข้างละไม่กี่พิกเซล ซึ่งพอสองบรรทัดวางซ้อนกันแล้วเห็นชัดว่าเบี้ยว
  ctx.textAlign = 'left';

  // ── สัดส่วนสองบรรทัดนี้ ──
  // เดิมป้าย 11px คู่กับตัวเลข 22px = ต่างกันเท่าตัวพอดี ซึ่งห่างเกินไป
  // ป้ายเล็กจนอ่านเป็นเศษฝุ่น ส่วนตัวเลขใหญ่จนดูลอยไม่มีอะไรถ่วง
  // 13/20 (ต่างกัน 1.5 เท่า) ทั้งคู่อ่านออกและอ่านเป็นของชิ้นเดียวกัน
  // ผู้ใช้ 25 ต.ค.: ตัวเลขจางกลืนฉาก → ตัวหนาขึ้น + ตีขอบเข้ม (ภาษาเดียวกับการ์ดลูกกวาด) อ่านออกทุกฉาก
  ctx.font = "700 13px Mali, sans-serif";
  const treatLabel = t('ค่าขนมเปียก');
  inkText(ctx, treatLabel, treatX - textWidth(ctx, treatLabel), TREAT_TOP, 'rgba(40,10,50,.85)', 3.6, '#FFF6E6');

  ctx.font = '800 24px Mali, sans-serif';
  const treatW = textWidth(ctx, treatText);
  ctx.save();
  ctx.shadowColor = 'rgba(20,10,30,.35)';
  ctx.shadowOffsetY = 2;
  ctx.shadowBlur = 2;
  inkText(ctx, treatText, treatX - treatW, TREAT_TOP + 16, '#3A2A10', 4.5, '#FFE7A0');
  ctx.restore();

  // ไอคอนกับตัวเลขอยู่บรรทัดเดียวกันเสมอ ไม่ว่าเลขจะกี่หลัก เพราะวางไอคอน
  // จากขอบซ้ายของตัวเลขที่วัดมาแล้ว
  //
  // ── y มาจากไหน ──
  // เคยใช้ +26 ซึ่งคือกึ่งกลางของ "กล่อง em" (74 + 20/2) แต่กล่อง em
  // ไม่ใช่ขอบหมึกจริง ตัวเลขกินพื้นที่แค่ช่วงกลางของกล่องเท่านั้น
  //
  // วัดด้วย measureText จริง (Mitr 600 20px) หมึกของตัวเลขกินพื้นตั้งแต่ +9 ถึง +25
  // จากจุดวาด กึ่งกลางที่ตาเห็นจริงจึงอยู่ที่ +17 ไม่ใช่ +10
  // ปลาจึงลอยสูงกว่าเลขอยู่ 7px มาตลอด — บนมือถือที่ HUD ถูกขยายเต็มจอจึงเห็นชัด
  //
  // ── เลิกใช้ค่าคงที่ วัดหมึกจริงทุกครั้งแทน ──
  // ค่าคงที่ +17 ที่เคยวัดไว้ผิดจริง: วัดซ้ำตอนฟอนต์ Mitr โหลดครบแล้ว หมึกตัวเลข
  // อยู่ที่ +1 ถึง +14 กึ่งกลางคือ +7.5 ปลาจึงห้อยต่ำกว่าเลขอยู่ 7.5px ทุกขนาด
  // เห็นชัดตอนเลขถึงหลักล้าน เพราะเลขยาวพ้นป้ายด้านบน ปลาเลยลอยอยู่ตัวเดียว
  //
  // ต้นเหตุคือหมึกของตัวเลขขึ้นกับว่าตอนนั้นฟอนต์ไหนวาดอยู่ ฟอนต์สำรองกับ Mitr
  // วางตัวเลขไม่ตรงกัน ค่าคงที่ตัวเดียวจึงถูกได้แค่กรณีเดียว
  // วัดจากเลข 0-9 ล้วน ไม่ใช่ข้อความจริง — จุลภาคห้อยต่ำกว่าเส้นฐาน ถ้านับด้วยจะดึงกึ่งกลางลง
  const ink = ctx.measureText('0123456789');
  const inkMid = ((ink.actualBoundingBoxDescent || 0) - (ink.actualBoundingBoxAscent || 0)) / 2;
  drawFish(ctx, treatX - treatW - TREAT_ICON_GAP - 2, TREAT_TOP + 16 + inkMid, 12);

  ctx.textAlign = 'left';

  // มาตรวัดความเร็วถูกถอดออกแล้ว — ความเร็วคงที่ หลอดที่ไม่มีวันขยับคือขยะบนจอ

  ctx.restore();

  ctx.save();
  ctx.translate(0, -ext.top);   // แถบบนทั้งชุดชิดขอบจอจริงเหมือนกัน (ดูข้างบน)
  // เกมเพลย์ใหม่ (25 ต.ค. 2026): ตัวอักษรโบนัส → คอมโบความอร่อย · หลอดพลัง → หัวใจเก้าดวง
  drawRunTime(ctx, game);
  drawCombo(ctx, game);
  drawHearts(ctx, game);
  drawMission(ctx, game);
  drawRunBar(ctx, game);
  drawHeartFx(ctx, game, ext.top);

  if (game.notice > 0) drawNotice(ctx, game);
  ctx.restore();
  // ป้ายโบนัสอยู่กลางฉากเล่น (ไม่ใช่แถบบน) — ไม่ต้องเลื่อน
  if (game.bonus > 0) drawBonusBanner(ctx, game);

  // แฟลชแดงทั้งจอตอนโดนชน วาดท้ายสุดเพื่อให้ทับทุกอย่าง
  if (game.hurtFlash > 0) {
    ctx.fillStyle = `rgba(255,92,110,${0.3 * game.hurtFlash})`;
    ctx.fillRect(0, -ext.top, W, H + ext.top + ext.bottom);   // คลุมทั้งจอจริงรวมส่วนต่อ
  }
}

// ── ป้ายกลางจอแบบลูกกวาด (โบนัส / ผ่านด่าน) ─────────────────────
//
// เดิมเป็นแคปซูลม่วงเข้มโปร่ง ตัวหนังสือจาง — บนฉากกลางคืนกลืนไปกับฟ้า
// และบนฉากสว่างก็อ่านเป็นแถบเงาดำ ๆ ไม่ใช่ "ข่าวดี"
// ตอนนี้เป็นป้ายทึบสีสด ขอบครีมหนา เงาใต้ป้าย แสงเงาวาวด้านบน กับแสงวิ่งผ่านเป็นระยะ
// ตัวหนังสือขาวตีขอบเข้ม — อ่านออกทุกฉากตั้งแต่ครัวมืดไปจนถึงทุ่งหิมะขาว
//
// ธีมสีคือ [บน, ล่าง, ขอบตัวหนังสือ, แสงเรืองรอบป้าย]
const PILL_THEME = {
  bonus: ['#FF7EC8', '#FF9A3D', '#8A1F5C', 'rgba(255,140,190,.55)'],
  clear: ['#FFE066', '#FFA928', '#8A4A00', 'rgba(255,214,90,.55)'],
  info: ['#8EF0E4', '#3FC3D8', '#0B4A5C', 'rgba(120,230,230,.5)'],
};

/** ดาวสี่แฉกเล็ก ๆ ข้างป้าย */
function sparkle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/**
 * ป้ายลูกกวาด — คำนวณกล่องให้อยู่กลางจอเอง แล้ววางข้อความยึดขอบซ้ายกล่อง
 * (ไม่ใช้ textAlign 'center' — บนมือถือ measureText กับ textAlign อ้างจุดคนละที่ ป้ายกับข้อความเคยเหลื่อมกัน)
 * @param pop    0→1 ตอนป้ายเพิ่งโผล่ (เด้งจากเล็กไปเต็ม เลยนิดแล้วคืน)
 * @param badge  ข้อความในวงกลมท้ายป้าย (ตัวเลขนับถอยหลัง) — null = ไม่มีวง
 * @param bump   0→1 เด้งวงกลมตอนตัวเลขเปลี่ยน
 */
function drawCandyPill(ctx, label, y, h, theme, tick, { pop = 1, badge = null, bump = 0 } = {}) {
  const [top, bottom, ink, glow] = PILL_THEME[theme];
  const padX = h * 0.62;
  const badgeD = badge != null ? h + 8 : 0;
  const textW = textWidth(ctx, label);
  const boxW = textW + padX * 2 + (badge != null ? badgeD * 0.72 : 0);
  const boxX = Math.round((W - boxW) / 2);
  const cx = boxX + boxW / 2;
  const cy = y + h / 2;

  // เด้งเข้า: เลยขนาดจริงไปนิดแล้วคืน (easeOutBack)
  const c1 = 1.7, v = pop - 1;
  const s = pop >= 1 ? 1 : Math.max(0.01, 1 + (c1 + 1) * v * v * v + c1 * v * v);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);
  ctx.textAlign = 'left';

  // แสงเรืองรอบป้าย + เงาใต้ป้าย
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 16;
  ctx.fillStyle = 'rgba(40,14,60,.45)';
  ctx.beginPath(); ctx.roundRect(boxX, y + 4, boxW, h, h / 2); ctx.fill();
  ctx.restore();

  // ขอบครีมบาง (ผู้ใช้ 25 ต.ค. — เดิม 3) แล้วตัวป้ายไล่สีข้างใน
  ctx.fillStyle = '#FFF6E6';
  ctx.beginPath(); ctx.roundRect(boxX - 1.8, y - 1.8, boxW + 3.6, h + 3.6, (h + 3.6) / 2); ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(boxX, y, boxW, h, h / 2); ctx.fill();

  // แสงเงาวาวครึ่งบน + แสงวิ่งผ่านทุก ~2.5 วินาที (clip ในตัวป้าย)
  ctx.save();
  ctx.beginPath(); ctx.roundRect(boxX, y, boxW, h, h / 2); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.34)';
  ctx.beginPath(); ctx.roundRect(boxX + h * 0.3, y + 2.5, boxW - h * 0.6, h * 0.36, h * 0.18); ctx.fill();
  const sweep = ((tick % 150) / 150) * (boxW + 120) - 60;
  const sg = ctx.createLinearGradient(boxX + sweep - 30, 0, boxX + sweep + 30, 0);
  sg.addColorStop(0, 'rgba(255,255,255,0)');
  sg.addColorStop(0.5, 'rgba(255,255,255,.55)');
  sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(boxX + sweep - 18, y + h); ctx.lineTo(boxX + sweep + 4, y);
  ctx.lineTo(boxX + sweep + 26, y); ctx.lineTo(boxX + sweep + 4, y + h);
  ctx.fill();
  ctx.restore();

  // ตัวหนังสือขาวตีขอบเข้ม
  const tx = boxX + padX;
  const ty = cy;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = ink;
  ctx.strokeText(label, tx, ty + 1);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(label, tx, ty + 1);

  // วงกลมตัวเลขท้ายป้าย (ทองสด ขอบขาว) เด้งตอนเลขเปลี่ยน
  if (badge != null) {
    const bx = boxX + boxW - badgeD * 0.42;
    const r = (badgeD / 2) * (1 + bump * 0.22);
    ctx.fillStyle = '#FFF6E6';
    ctx.beginPath(); ctx.arc(bx, cy, r + 1.8, 0, Math.PI * 2); ctx.fill();
    const bg = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    bg.addColorStop(0, '#FFF08A');
    bg.addColorStop(1, '#FFB21F');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(bx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.beginPath(); ctx.ellipse(bx, cy - r * 0.45, r * 0.6, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#8A4A00';
    ctx.strokeText(String(badge), bx, cy + 1);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(String(badge), bx, cy + 1);
  }

  // ประกายวิบสองข้างป้าย คนละจังหวะ
  ctx.fillStyle = '#FFF8C8';
  for (const [sx, sy, ph] of [[boxX - 12, y - 2, 0], [boxX + boxW + 12, y + h, 1.7], [boxX + 16, y + h + 5, 3.1]]) {
    const k = 0.35 + Math.abs(Math.sin(tick * 0.09 + ph)) * 0.65;
    sparkle(ctx, sx, sy, 6 * k);
  }
  ctx.restore();
}

/**
 * ตัวนับถอยหลังกลางจอตอนอยู่ในโบนัส — วงลูกกวาดวงเดียว ตัวเลขวินาทีที่เหลือ (ผู้ใช้ 25 ต.ค.: ไม่ต้องมีคำว่า BONUS TIME)
 * วงแหวนทองรอบนอกหดตามเวลาที่เหลือ · เลขเด้งทุกครั้งที่เปลี่ยน · 3 วิสุดท้ายวงเป็นแดงเต้นเตือนว่าใกล้หมด
 */
function drawBonusBanner(ctx, game) {
  const secs = Math.ceil(game.bonus / 60);
  // เวลาที่ผ่านมาในโบนัส (วงเด้งเข้าช่วง 18 เฟรมแรก) และเศษของวินาที (เลขเด้งตอนเปลี่ยน)
  const since = BONUS.frames - game.bonus;
  const frac = (game.bonus % 60) / 60;
  const bump = frac > 0.85 ? (frac - 0.85) / 0.15 : 0;
  const pop = easeOutBack(Math.min(1, since / 18));
  const last = secs <= 3;
  const cx = W / 2, cy = BANNER_CLEAR + 28, R = 22;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pop, pop);
  // เงา + ขอบครีมบาง
  ctx.fillStyle = 'rgba(40,14,60,.3)';
  ctx.beginPath(); ctx.arc(0, 2.5, R + 1.8, 0, TAU); ctx.fill();
  ctx.fillStyle = '#FFF6E6';
  ctx.beginPath(); ctx.arc(0, 0, R + 1.8, 0, TAU); ctx.fill();
  const g = ctx.createLinearGradient(0, -R, 0, R);
  g.addColorStop(0, last ? '#FF8A9A' : '#FF7EC8');
  g.addColorStop(1, last ? '#E8233F' : '#FF9A3D');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath(); ctx.ellipse(-R * 0.25, -R * 0.5, R * 0.5, R * 0.22, -0.3, 0, TAU); ctx.fill();
  // วงแหวนเวลาที่เหลือ
  const left = Math.max(0, game.bonus / BONUS.frames);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,.3)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, R - 4, 0, TAU); ctx.stroke();
  ctx.strokeStyle = '#FFF08A';
  ctx.beginPath(); ctx.arc(0, 0, R - 4, -Math.PI / 2, -Math.PI / 2 + TAU * left); ctx.stroke();
  // ตัวเลข
  const s = (1 + bump * 0.3) * (last ? 1 + 0.08 * Math.max(0, Math.sin(game.tick * 0.3)) : 1);
  ctx.scale(s, s);
  ctx.font = '800 20px Mali, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  inkText(ctx, String(secs), 0, 1, last ? '#7A0A1E' : '#8A1F5C', 4.5);
  ctx.restore();
}

/**
 * ความกว้างที่ข้อความกินจริง
 *
 * เอาค่ามากสุดระหว่าง advance width (ระยะที่เคอร์เซอร์เดิน) กับกรอบหมึกจริง
 * เพราะภาษาไทยมีสระบนล่างกับวรรณยุกต์ที่ยื่นพ้นระยะที่เคอร์เซอร์เดินได้
 * ถ้าใช้ advance อย่างเดียว ตัวท้ายจะล้ำออกไปจากที่คำนวณไว้เล็กน้อยเสมอ
 */
function textWidth(ctx, str) {
  const m = ctx.measureText(str);
  const ink = (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || 0);
  return Math.max(m.width, ink);
}

/**
 * ป้ายบอกว่าขวดพลังกำลังมา
 * จำเป็นเพราะขวดโผล่ตามเวลา ไม่ใช่ตามระยะทาง ผู้เล่นเลยเดาเองไม่ได้
 * ว่าต้องทนอีกไกลแค่ไหน — ถ้าไม่บอก การรอดจนหลอดเกือบหมดจะรู้สึกเหมือนถูกลงโทษ
 */
function drawNotice(ctx, game) {
  // จางเข้าเร็ว จางออกช้า ๆ ช่วงท้าย
  const a = Math.min(1, game.notice / 40);

  ctx.save();
  ctx.globalAlpha = a;

  ctx.font = "700 16px Mali, sans-serif";
  // ข้อความมาจากฝั่งเกม เพราะตอนนี้แถบนี้ใช้บอกได้หลายเรื่อง
  // ผ่านด่าน = ป้ายทองสด (ข่าวดีใหญ่) / เรื่องอื่น (ขวดพลัง ดึงขึ้นจากหลุม) = ป้ายฟ้าสด
  const label = game.noticeText || 'ขวดพลังมาแล้ว! กระโดดเก็บให้ทัน';
  const theme = label.startsWith('ผ่านด่าน') ? 'clear' : 'info';
  // เด้งเข้าช่วง 16 เฟรมแรกของข้อความ (notice นับถอยหลังจากค่าตั้งต้น)
  const start = theme === 'clear' ? SCENE.noticeFrames : Math.max(game.notice, 90);
  drawCandyPill(ctx, t(label), BANNER_CLEAR + 8, 32, theme, game.tick, { pop: Math.min(1, (start - game.notice) / 16) });

  ctx.restore();
}

// ── หลอดบอกระยะในด่านย่อย ────────────────────────────────────
//
// ความเร็ววิ่งคงที่ "เวลาที่เหลือของฉาก" จึงเท่ากับ "ระยะที่เหลือ" เป๊ะ ๆ
// เลยอ่านจากตัวนับฉากได้ตรง ๆ ไม่ต้องเก็บระยะทางแยกอีกชุดให้คลาดกัน
//
// ครบเวลาแล้วเกมยังไม่สลับฉากทันที มันรอให้วิ่งถึงทางเชื่อมก่อน (ดู updateScene)
// ช่วงนั้นถือว่าเต็มหลอด ไม่ใช่ล้นหรือรีเซ็ต ผู้เล่นจะได้เห็นว่า "ถึงธงแล้ว กำลังเปลี่ยนฉาก"
// ─────────────────────────────────────────────────────────────
function drawRunBar(ctx, game) {
  // ── ทำไมไม่ใช้ x ชุดเดียวกับหลอดพลัง ──
  //
  // หลอดพลังมีเหรียญหน้าแมวยื่นออกมาทางซ้าย และมันจัดให้ "ทั้งชุด" (เหรียญ+ขวด)
  // อยู่กลางจอ ตัวขวดเปล่า ๆ จึงเยื้องไปทางขวาจากกลางจอ 11px (วัดจากพิกเซลจริงแล้ว)
  //
  // ถ้าหลอดนี้ไปอิง x ของขวด มันจะเยื้องขวาตามไปด้วย แล้วตาจะอ่านว่า
  // "ไม่ตรงกลาง" เพราะตาเทียบกับชุดแดงทั้งชุด ไม่ได้เทียบกับตัวขวดอย่างเดียว
  // จึงจัดกลางจอตรง ๆ แล้วทำให้สั้นกว่าขวด พอให้ปลายซ้ายพ้นเหรียญ
  // และปลายขวารวมธงไม่เลยขอบขวด — ได้หลอดเล็กที่ร่วมจุดศูนย์กลางเดียวกันกับชุดแดง
  const w = 290;
  const h = 9;
  const x = Math.round((W - w) / 2);
  const y = RUN_TOP;
  const tick = game.tick;

  // ด่านที่เขียนลำดับท่อนเองวัดความคืบหน้าด้วยระยะ ไม่ใช่เวลา (ดู Game.sceneProgress)
  const p = game.sceneProgress;
  const fw = w * p;

  ctx.save();

  // ── กรอบ: ขอบครีม + เงาใต้ ภาษาเดียวกับการ์ดลูกกวาด/ช่องหัวใจ (ผู้ใช้ 25 ต.ค.) ──
  ctx.fillStyle = 'rgba(30,8,40,.32)';
  ctx.beginPath(); ctx.roundRect(x - 1.6, y + 0.5, w + 3.2, h + 3.2, (h + 3.2) / 2); ctx.fill();
  ctx.fillStyle = '#FFF6E6';
  ctx.beginPath(); ctx.roundRect(x - 1.6, y - 1.6, w + 3.2, h + 3.2, (h + 3.2) / 2); ctx.fill();
  const tg = ctx.createLinearGradient(0, y, 0, y + h);
  tg.addColorStop(0, '#4B4552');
  tg.addColorStop(1, '#615A6B');
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();

  // หมุดหลักไมล์ 1/4 · 1/2 · 3/4 — ผ่านแล้วเป็นทอง
  for (const k of [0.25, 0.5, 0.75]) {
    ctx.fillStyle = p >= k ? '#FFF6B0' : 'rgba(255,246,230,.35)';
    ctx.beginPath(); ctx.arc(x + w * k, y + h / 2, 1.6, 0, TAU); ctx.fill();
  }

  if (fw > 0.5) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, fw, h, Math.min(h / 2, fw / 2));
    ctx.clip();
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#FFE98A');
    g.addColorStop(0.55, '#FFA63D');
    g.addColorStop(1, '#FF5E9C');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, fw, h);
    // ลายทางลูกกวาดเลื่อนไปข้างหน้า = กำลังวิ่ง
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    const off = (tick * 0.6) % 14;
    for (let sx = x - 14 + off; sx < x + fw + 14; sx += 14) {
      ctx.beginPath();
      ctx.moveTo(sx, y + h); ctx.lineTo(sx + 6, y); ctx.lineTo(sx + 12, y); ctx.lineTo(sx + 6, y + h);
      ctx.fill();
    }
    // วาวครึ่งบน
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fillRect(x, y + 1, fw, 2.4);
    // แสงวิ่งผ่านทุก ~3 วิ
    const sweep = ((tick % 180) / 180) * (fw + 80) - 40;
    const sg = ctx.createLinearGradient(x + sweep - 24, 0, x + sweep + 24, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, 'rgba(255,255,255,.7)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(x + sweep - 24, y, 48, h);
    ctx.restore();
  }

  // ธงปลายทาง (แบบเดิม ไม่มีวงล้อม — ผู้ใช้ 25 ต.ค.) — เสาครีม ผืนธงชมพู
  // ใกล้ถึง (≥ 90%) ผืนธงเป็นทองเรืองแสงเต้น · ถึงแล้วธงโบก
  const fx = x + w + 9, fy = y + h / 2;
  const near = p >= 0.9 || game.nextScene;
  const sway = game.nextScene ? Math.sin(tick * 0.22) * 1.8 : 0;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(30,8,40,.35)';
  ctx.lineWidth = 3.6;
  ctx.beginPath(); ctx.moveTo(fx, fy + 6); ctx.lineTo(fx, fy - 11); ctx.stroke();
  ctx.strokeStyle = '#FFF6E6';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(fx, fy + 6); ctx.lineTo(fx, fy - 11); ctx.stroke();
  if (near) {
    ctx.shadowColor = 'rgba(255,214,90,.95)';
    ctx.shadowBlur = 6 + 6 * Math.max(0, Math.sin(tick * 0.2));
  }
  ctx.fillStyle = near ? '#FFC83A' : '#FF5E9C';
  ctx.beginPath();
  ctx.moveTo(fx + 0.9, fy - 11);
  ctx.quadraticCurveTo(fx + 5.4, fy - 10.2 + sway, fx + 9.5, fy - 8);
  ctx.quadraticCurveTo(fx + 5.4, fy - 6 + sway, fx + 0.9, fy - 5.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // ประกายระยิบไล่หลังหัวน้อง
  if (fw > 14) {
    ctx.fillStyle = '#FFF6B0';
    for (let i = 0; i < 4; i++) {
      const u = ((tick * 0.03 + i / 4) % 1);
      const sx = x + Math.max(12, Math.min(w - 8, fw)) - 10 - u * 26;
      const sy = y + h / 2 + Math.sin(i * 2.3 + tick * 0.1) * 7;
      ctx.globalAlpha = 1 - u;
      sparkle(ctx, sx, sy, 2.6 * (1 - u) + 0.6);
    }
    ctx.globalAlpha = 1;
  }

  // หัวน้องวิ่งไปตามหลอด — หนีบไว้ในราง ไม่งั้นตอนเริ่มฉากมันจะไปทับ
  // เหรียญหน้าแมวที่หัวหลอดพลังซึ่งอยู่เยื้องซ้ายขึ้นไปนิดเดียว
  // 12 คือระยะที่วัดแล้วหัวน้องพ้นขอบเหรียญสนิทตอนหลอดยังว่าง
  const mx = x + Math.max(12, Math.min(w - 8, fw));
  hudFace(ctx, mx, y + h / 2 - Math.abs(Math.sin(tick * 0.18)) * 1.6, 0.44, getSkin());

  ctx.restore();
}

// ── หน้าน้องบน HUD (เหรียญหัวหลอดพลัง · หัวที่วิ่งบนหลอดระยะทาง) — ลายเส้นใหม่ (ผู้ใช้ 18 ต.ค.) ──
// หน้าแบบใหม่วาดหนัก (ตัววาดเต็ม เฉพาะหัว) แต่ HUD วาดทุกเฟรม → วาดครั้งเดียวเก็บเป็นภาพ แล้วแปะซ้ำ
// แมวที่ยังใช้ตัววาดเดิม (ลูกแมว · มีรูปหน้าอัปโหลด) = หน้าเดิมเหมือนก่อน
const FACE_RES = 4;   // ความละเอียดภาพเทียบหน่วย HUD (จอเรตินา + เวทีขยาย ยังคม)
const faceCache = new Map();
function hudFace(ctx, cx, cy, scale, skin) {
  if (!(CAT2.ui && useCat2(skin))) return drawCatFace(ctx, cx, cy, scale, skin);
  const key = [skin.id, skin.palette, skin.sex, skin.age, skin.outfit?.id, scale].join('|');
  let cv = faceCache.get(key);
  if (!cv) {
    // กรอบ 70×74 หน่วย (ต่อ scale 1) จุดกลางหน้าที่ (35, 42) — เผื่อหมวก/หูที่ยื่นขึ้นไป
    const S = scale * FACE_RES;
    cv = document.createElement('canvas');
    cv.width = Math.ceil(70 * S);
    cv.height = Math.ceil(74 * S);
    drawCatFaceAuto(cv.getContext('2d'), 35 * S, 42 * S, S, skin);
    if (faceCache.size > 24) faceCache.clear();
    faceCache.set(key, cv);
  }
  ctx.drawImage(cv, cx - 35 * scale, cy - 42 * scale, 70 * scale, 74 * scale);
}

/** หลอดพลังกลางจอบน — ตัวเดียวที่ผู้เล่นต้องจ้องตลอดเวลา เลยวางไว้กลาง */
/** เหรียญหน้าแมวที่หัวหลอด — วาดจานก่อน แล้วทับด้วยหน้าแมว หูจึงพาดขอบจานพอดี */
function drawCatBadge(ctx, cx, cy, r) {
  ctx.save();
  ctx.fillStyle = 'rgba(30,8,40,.32)';
  ctx.beginPath(); ctx.arc(cx, cy + 2.5, r + 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFF6E6';
  ctx.beginPath(); ctx.arc(cx, cy, r + 1.8, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, '#FF9CBC');
  g.addColorStop(1, '#E2366C');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

  // เยื้องลง 4 เพราะจุดกึ่งกลางของหัวอยู่ที่วงหน้า ไม่ใช่รวมหู
  // ถ้าวางกลางจานตรง ๆ หูจะโผล่เกินจนดูหัวลอยขึ้นข้างบน
  hudFace(ctx, cx, cy + 4, 1, getSkin());
  ctx.restore();
}

/** หัวใจหนึ่งดวง (กลางที่ x,y รัศมี r) */
function heartPath(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.45, y - r * 0.1, x - r * 0.65, y - r * 1.15, x, y - r * 0.38);
  ctx.bezierCurveTo(x + r * 0.65, y - r * 1.15, x + r * 1.45, y - r * 0.1, x, y + r * 0.9);
  ctx.closePath();
}

// ── แถบซ้ายบน (เวลา · คอมโบ · ภารกิจ) + ช่องหัวใจ ─────────────────────
// ผู้ใช้ 25 ต.ค. 2026: กรอบแดงทึบชุดแรกไม่เด่นไม่สวย → ใช้ภาษาเดียวกับป้ายลูกกวาด (drawCandyPill)
// ขอบครีม · ไล่สีสด · วาวครึ่งบน · แสงวิ่งผ่าน · วงไอคอนแปะหัวการ์ดแบบสติกเกอร์
const TAU = Math.PI * 2;
// [บน, ล่าง, หมึกตีขอบตัวหนังสือ]
const CARD = {
  time: ['#86DEFF', '#3D8CF0', '#123F7A'],
  combo: ['#FFC45E', '#FF6A8C', '#8A1F3D'],
  hot: ['#FF92E2', '#B05CFF', '#4A1680'],      // คอมโบตัวคูณ ×3
  broke: ['#C9B8D8', '#8A779F', '#3A2B4D'],
};
// กรอบของนาฬิกา (ฟ้า) / ช่องหัวใจ (ชมพู) — ผู้ใช้ 25 ต.ค. ลองแบบไม่มีกรอบ: true = กลับไปมีกรอบเหมือนเดิม
const HUD_FRAMES = { time: false, hearts: false };
// หัวใจเก้าดวง: ระยะห่างดวง · รัศมี · y กลางแถว (ช่องจบที่ y+16 = 56 · หลอดเส้นทางเริ่ม RUN_TOP)
const HEART_ROW = { gap: 26, r: 10, y: 40 };

const easeOutBack = (u) => { const c = 1.9, v = u - 1; return 1 + (c + 1) * v * v * v + c * v * v; };

/**
 * การ์ดลูกกวาดมุมมนเต็ม — shine = แสงวิ่งผ่านเป็นระยะ
 * ผู้ใช้ 25 ต.ค. (ขัดเกลา UI): ขอบครีม 2.5 → 1.2 · เงาใต้ .32 → .22 · แสงวิ่งปิดเป็นค่าตั้งต้น
 * (ทุกป้ายวิ้งพร้อมกันแย่งสายตา — เก็บไว้ให้ป้ายฉลองที่ต้องเด่นจริง ๆ)
 */
function candyCard(ctx, x, y, w, h, theme, tick, shine = false) {
  const [top, bottom] = CARD[theme];
  const r = h / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(30,8,40,.22)';
  ctx.beginPath(); ctx.roundRect(x - 1.2, y + 2, w + 2.4, h + 2.4, r + 1.2); ctx.fill();
  ctx.fillStyle = '#FFF6E6';
  ctx.beginPath(); ctx.roundRect(x - 1.2, y - 1.2, w + 2.4, h + 2.4, r + 1.2); ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.beginPath(); ctx.roundRect(x + r * 0.6, y + 2, w - r * 1.2, Math.min(h * 0.36, 12), 6); ctx.fill();
  if (shine) {
    const sweep = ((tick % 260) / 260) * (w + 200) - 100;
    const sg = ctx.createLinearGradient(x + sweep - 30, 0, x + sweep + 30, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, 'rgba(255,255,255,.45)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(x + sweep - 18, y + h); ctx.lineTo(x + sweep + 4, y);
    ctx.lineTo(x + sweep + 26, y); ctx.lineTo(x + sweep + 4, y + h);
    ctx.fill();
  }
  ctx.restore();
}

/** ตัวหนังสือขาวตีขอบเข้ม (แบบป้ายลูกกวาด) */
function inkText(ctx, s, x, y, ink, lw = 4, fill = '#FFFFFF') {
  ctx.lineJoin = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = ink;
  ctx.strokeText(s, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(s, x, y);
}

/** วงไอคอนหัวการ์ด (สติกเกอร์): ขอบครีม ไล่สีข้างใน วาว · icon(cx, cy, r) วาดทับ */
function iconBadge(ctx, cx, cy, r, top, bottom, icon) {
  ctx.save();
  ctx.fillStyle = 'rgba(30,8,40,.2)';
  ctx.beginPath(); ctx.arc(cx, cy + 2, r + 1.2, 0, TAU); ctx.fill();
  ctx.fillStyle = '#FFF6E6';
  ctx.beginPath(); ctx.arc(cx, cy, r + 1.2, 0, TAU); ctx.fill();
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  icon(cx, cy, r);
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.beginPath(); ctx.ellipse(cx - r * 0.3, cy - r * 0.5, r * 0.42, r * 0.2, -0.4, 0, TAU); ctx.fill();
  ctx.restore();
}

/** เปลวไฟหยดน้ำชี้ขึ้น (ไอคอนคอมโบ) */
function flamePath(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.bezierCurveTo(x + r * 0.3, y - r * 0.45, x + r * 0.85, y - r * 0.15, x + r * 0.7, y + r * 0.38);
  ctx.bezierCurveTo(x + r * 0.55, y + r * 0.86, x - r * 0.55, y + r * 0.86, x - r * 0.7, y + r * 0.38);
  ctx.bezierCurveTo(x - r * 0.82, y - r * 0.05, x - r * 0.25, y - r * 0.3, x, y - r);
  ctx.closePath();
}

/** หัวใจมันวาว (ใช้ทั้งในช่องและตัวที่บินกลับ) */
function glossyHeart(ctx, x, y, r) {
  const g = ctx.createLinearGradient(0, y - r, 0, y + r);
  g.addColorStop(0, '#FF8FB2');
  g.addColorStop(1, '#E3174E');
  ctx.fillStyle = g;
  heartPath(ctx, x, y, r);
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.13);
  ctx.strokeStyle = '#A80E3A';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath(); ctx.ellipse(x - r * 0.42, y - r * 0.32, r * 0.24, r * 0.14, -0.6, 0, TAU); ctx.fill();
}

/** กึ่งกลางช่องหัวใจดวงที่ i (พิกัด HUD) — ทั้งแถวรวมเหรียญหน้าแมวอยู่กลางจอ */
function heartSlotX(i) {
  const w = (LIVES.max - 1) * HEART_ROW.gap;
  return Math.round((W - w + 36) / 2) + i * HEART_ROW.gap;
}

/**
 * แมวเก้าชีวิต — ช่องหัวใจเก้าดวงกลางบน พร้อมเหรียญหน้าแมวหัวแถว
 * ดวงที่เสียแล้ว = ช่องว่างรูปหัวใจ · ดวงที่เพิ่งเสีย = ขยายจางหาย (game.lifeLost)
 * เหลือ ≤ LIVES.lowAt = ดวงที่เหลือเต้นตุบ + ช่องเรืองแดงเตือน
 * หัวใจคืน (game.heartFx) = ช่องนั้นว่างจนตัวที่บินมาถึง แล้วเด้งรับ (drawHeartFx วาดตัวบิน)
 */
function drawHearts(ctx, game) {
  const n = LIVES.max, { gap, r, y } = HEART_ROW;
  const w = (n - 1) * gap;
  const x0 = heartSlotX(0);
  const lives = Math.max(0, Math.min(n, game.lives ?? n));
  const low = lives > 0 && lives <= LIVES.lowAt;
  const fx = game.heartFx, F = LIVES.fx;
  const fxSlot = fx ? Math.min(fx.slot, lives - 1) : -1;
  const landT = fx ? fx.t - F.revive - F.fly : -1;   // ≥ 0 = ถึงช่องแล้ว
  const bx = x0 - 22, bw = w + 44, by = y - 16, bh = 32;
  ctx.save();
  // เตือนใกล้หมด: เรืองแดงรอบช่องเต้นตามหัวใจ (ไม่มีกรอบ = เรืองที่ตัวหัวใจแทน ดูข้างล่าง)
  if (low && HUD_FRAMES.hearts) {
    ctx.save();
    ctx.shadowColor = 'rgba(255,40,90,.9)';
    ctx.shadowBlur = 10 + 8 * Math.max(0, Math.sin(game.tick * 0.22));
    ctx.fillStyle = '#FFF6E6';
    ctx.beginPath(); ctx.roundRect(bx - 1.4, by - 1.4, bw + 2.8, bh + 2.8, (bh + 2.8) / 2); ctx.fill();
    ctx.restore();
  }
  if (HUD_FRAMES.hearts) {
    ctx.fillStyle = 'rgba(30,8,40,.22)';
    ctx.beginPath(); ctx.roundRect(bx - 2, by + 3, bw + 4, bh + 3, bh / 2 + 2); ctx.fill();
    ctx.fillStyle = '#FFF6E6';
    ctx.beginPath(); ctx.roundRect(bx - 1.4, by - 1.4, bw + 2.8, bh + 2.8, (bh + 2.8) / 2); ctx.fill();
    const g = ctx.createLinearGradient(0, by, 0, by + bh);
    g.addColorStop(0, '#FFE6EF');
    g.addColorStop(1, '#FFB9CF');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, bh / 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.roundRect(bx + 14, by + 2, bw - 28, 9, 4.5); ctx.fill();
  }

  for (let i = 0; i < n; i++) {
    const x = x0 + i * gap;
    const flying = i === fxSlot && landT < 0;
    // ช่องที่ว่าง (เสียไปแล้ว / รอหัวใจบินมา) = โครงเส้นเทาอมม่วงบาง ๆ บนพื้นจาง — สีคนละตระกูลกับดวงเต็ม
    // เดิมเป็นชมพูจางทับชมพู บนจอมือถือแยกกับดวงเต็มไม่ค่อยออก (ผู้ใช้ 25 ต.ค.)
    if ((i >= lives || flying) && !HUD_FRAMES.hearts) {
      // ไม่มีกรอบ: ช่องว่าง = หัวใจโปร่งขอบขาว (มีเส้นเข้มรองใต้ขอบ อ่านออกทั้งฉากสว่างและมืด)
      heartPath(ctx, x, y + 1, r * 0.95);
      ctx.fillStyle = 'rgba(255,255,255,.16)';
      ctx.fill();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(40,10,40,.35)';
      ctx.lineWidth = 3.4;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    } else if (i >= lives || flying) {
      ctx.fillStyle = 'rgba(120,90,130,.13)';
      heartPath(ctx, x, y + 1, r * 0.95);
      ctx.fill();
      ctx.strokeStyle = 'rgba(130,95,140,.5)';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([2.6, 2.2]);
      heartPath(ctx, x, y + 1, r * 0.95);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (i < lives && !flying) {
      let s = low ? 1 + 0.14 * Math.max(0, Math.sin(game.tick * 0.22)) : 1;
      if (i === fxSlot && landT >= 0) {
        const u = landT / F.land;
        s *= 1 + 0.65 * Math.exp(-5 * u) * Math.cos(u * 13);
        // แสงวาบหลังดวงตอนเข้าช่อง
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - u * 1.6);
        const gl = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
        gl.addColorStop(0, 'rgba(255,255,255,.95)');
        gl.addColorStop(0.4, 'rgba(255,140,180,.6)');
        gl.addColorStop(1, 'rgba(255,140,180,0)');
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(x, y, r * 3, 0, TAU); ctx.fill();
        ctx.restore();
      }
      if (!HUD_FRAMES.hearts) {
        // ไม่มีกรอบ: ขอบขาวบาง + เงาใต้ — ไม่กลืนกับด่านโทนชมพู/แดง · ใกล้หมด = เรืองแดงที่ตัวหัวใจ
        ctx.save();
        ctx.shadowColor = low ? 'rgba(255,40,90,.95)' : 'rgba(30,8,40,.4)';
        ctx.shadowBlur = low ? 6 + 6 * Math.max(0, Math.sin(game.tick * 0.22)) : 3;
        ctx.shadowOffsetY = low ? 0 : 1.5;
        heartPath(ctx, x, y + 1, r * s);
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3.2;
        ctx.stroke();
        ctx.restore();
      }
      glossyHeart(ctx, x, y + 1, r * s);
    } else if (i === lives && game.lifeLost > 0) {
      // ดวงที่เพิ่งเสีย: ขยายแล้วจางหาย
      const u = 1 - game.lifeLost / 40;
      ctx.globalAlpha = 1 - u;
      ctx.fillStyle = '#FF5C84';
      heartPath(ctx, x, y + 1 - u * 10, r * (1 + u * 0.8));
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  drawCatBadge(ctx, x0 - 34, y, 19);
  ctx.restore();
}

/**
 * หัวใจคืน — วาดทับทุกอย่างบน HUD
 *   ฟื้น (revive): หัวใจโผล่ตรงจุดที่ได้ เต้นตุบสองที วงแสงขยาย ประกายหมุนรอบ
 *   บิน (fly): โค้งขึ้นไปหาช่อง ทิ้งหางหัวใจเล็ก ๆ กับประกาย
 *   ถึงช่อง (land): วงแหวนกระจาย + ดาวกระเด็นรอบช่อง (ตัวหัวใจในช่องเด้งใน drawHearts)
 * @param extTop เลื่อนพิกัดโลก → HUD (HUD ถูก translate ขึ้น ext.top ในจอ iPad)
 */
function drawHeartFx(ctx, game, extTop) {
  const fx = game.heartFx;
  if (!fx) return;
  const F = LIVES.fx;
  const slot = Math.max(0, Math.min(fx.slot, (game.lives || 1) - 1));
  const tx = heartSlotX(slot), ty = HEART_ROW.y + 1;
  const sx = fx.src.world ? fx.src.x - game.camera : fx.src.x;
  const sy = fx.src.world ? fx.src.y + extTop : fx.src.y;
  const t = fx.t;
  ctx.save();
  if (t < F.revive) {
    const u = t / F.revive;
    const grow = easeOutBack(Math.min(1, u * 2.4));
    // ตุบ-ตุบ สองจังหวะ (ตรงกับเสียง heartRevive)
    const beat = 1 + 0.22 * (Math.exp(-((u - 0.45) ** 2) / 0.004) + Math.exp(-((u - 0.72) ** 2) / 0.004));
    const R = 15 * grow * beat;
    const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, 46);
    gl.addColorStop(0, `rgba(255,255,255,${0.8 * grow})`);
    gl.addColorStop(0.35, `rgba(255,120,170,${0.55 * grow})`);
    gl.addColorStop(1, 'rgba(255,120,170,0)');
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(sx, sy, 46, 0, TAU); ctx.fill();
    if (u > 0.35) {
      const k = (u - 0.35) / 0.65;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3 * (1 - k) + 0.5;
      ctx.beginPath(); ctx.arc(sx, sy, 16 + 34 * k, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#FFF6B0';
    for (let i = 0; i < 6; i++) {
      const a = i * (TAU / 6) + t * 0.09;
      const d = 22 + 6 * Math.sin(t * 0.2 + i);
      sparkle(ctx, sx + Math.cos(a) * d, sy + Math.sin(a) * d, 3.2 * grow);
    }
    glossyHeart(ctx, sx, sy, R);
  } else if (t < F.revive + F.fly) {
    const u = (t - F.revive) / F.fly;
    const at = (v) => {
      const e = v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2;
      const cx = (sx + tx) / 2, cy = Math.min(sy, ty) - 70;
      const a = 1 - e;
      return [a * a * sx + 2 * a * e * cx + e * e * tx, a * a * sy + 2 * a * e * cy + e * e * ty];
    };
    // หางหัวใจเล็ก ๆ + ประกาย
    for (let k = 5; k >= 1; k--) {
      const v = u - k * 0.06;
      if (v <= 0) continue;
      const [px, py] = at(v);
      ctx.globalAlpha = 0.5 * (1 - k / 6);
      ctx.fillStyle = '#FF7DA6';
      heartPath(ctx, px, py, 7 - k * 0.8);
      ctx.fill();
      ctx.fillStyle = '#FFF6B0';
      sparkle(ctx, px + Math.sin(k * 2.1 + t * 0.3) * 8, py + Math.cos(k * 1.7) * 8, 2.4);
    }
    ctx.globalAlpha = 1;
    const [px, py] = at(u);
    glossyHeart(ctx, px, py, 15 - 5 * u);
  } else {
    const u = (t - F.revive - F.fly) / F.land;
    ctx.globalAlpha = Math.max(0, 1 - u);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3 * (1 - u) + 0.5;
    ctx.beginPath(); ctx.arc(tx, ty, 10 + 26 * u, 0, TAU); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * (TAU / 8) + 0.3;
      const d = 12 + 30 * Math.sqrt(u);
      ctx.fillStyle = i % 2 ? '#FFF6B0' : '#FF9CC0';
      sparkle(ctx, tx + Math.cos(a) * d, ty + Math.sin(a) * d, 4 * (1 - u) + 1);
    }
  }
  ctx.restore();
}

// ── ตั๋วภารกิจ (ผู้ใช้ 25 ต.ค.: ให้ต่างจากแคปซูลคอมโบ) ──
// สี่เหลี่ยมมุมมน (ไม่ใช่แคปซูล) พื้นกระดาษสีอ่อน ตัวหนังสือเข้มไม่ตีขอบ · หัวตั๋วสีเข้มทางซ้ายคั่นด้วยรอยปรุ
// ภารกิจ = หัวม่วง · สำเร็จ = หัวทองพื้นครีมทอง
const TICKET = {
  quest: { stubA: '#AE90F2', stubB: '#7B52E6', paperA: '#FFFDF8', paperB: '#F1E8FF', line: '#9376DB', ink: '#3E2A78', sub: '#6B54B0' },
  done: { stubA: '#FFD45A', stubB: '#F0A21F', paperA: '#FFFCEB', paperB: '#FFEDB8', line: '#E2A126', ink: '#7A4300', sub: '#9A5C00' },
};
const TICKET_STUB = 30;

function questTicket(ctx, x, y, w, h, tone) {
  const T = TICKET[tone], R = 9;
  ctx.save();
  ctx.fillStyle = 'rgba(30,8,40,.22)';
  ctx.beginPath(); ctx.roundRect(x, y + 2.5, w, h, R); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, R); ctx.clip();
  const pg = ctx.createLinearGradient(0, y, 0, y + h);
  pg.addColorStop(0, T.paperA);
  pg.addColorStop(1, T.paperB);
  ctx.fillStyle = pg;
  ctx.fillRect(x, y, w, h);
  const sg = ctx.createLinearGradient(0, y, 0, y + h);
  sg.addColorStop(0, T.stubA);
  sg.addColorStop(1, T.stubB);
  ctx.fillStyle = sg;
  ctx.fillRect(x, y, TICKET_STUB, h);
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.fillRect(x, y, TICKET_STUB, h * 0.38);
  ctx.restore();
  // รอยปรุระหว่างหัวตั๋วกับตัวตั๋ว
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([3, 2.6]);
  ctx.beginPath(); ctx.moveTo(x + TICKET_STUB, y + 3); ctx.lineTo(x + TICKET_STUB, y + h - 3); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = T.line;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, R); ctx.stroke();
  ctx.restore();
}

/**
 * ภารกิจในรอบ (game.extras.mission) — ซ้ายบน ใต้นาฬิกา: ตั๋วภารกิจ (หัวม่วงไอคอนเป้า · ข้อความ · หลอดความคืบหน้า)
 * ทำสำเร็จ = ตั๋วทองเด้งขึ้น "ภารกิจสำเร็จ!" + รางวัล + ดาวกระจาย ค้างสั้น ๆ (game.extras.missionDone)
 * จุดหัวใจฟื้นของภารกิจ (run-extras.js updateMission) = กลางหัวตั๋ว
 */
function drawMission(ctx, game) {
  const ex = game.extras;
  if (!ex || game.bonus > 0) return;
  const m = ex.mission;
  const done = !m && ex.missionDone > 0 && ex.doneM;
  if (!m && !done) return;
  const left = edgeInset(safeInsets(ctx).left);
  // h 46: ข้อความมีสระบน/วรรณยุกต์ (เช่น 'ชิ้น') — ต้องเว้นจากขอบบนพอสมควร ไม่ใช่แค่ไม่ล้น (ผู้ใช้ 25 ต.ค.)
  const cy = WORD_TOP + 56, h = 46, top = cy - h / 2;
  const sx = left + TICKET_STUB / 2;   // กลางหัวตั๋ว
  const tx = left + TICKET_STUB + 9;
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  if (m) {
    const T = TICKET.quest;
    ctx.font = "700 13px Mali, sans-serif";
    const lab = t(m.text);
    const w = Math.max(180, tx - left + textWidth(ctx, lab) + 26);
    questTicket(ctx, left, top, w, h, 'quest');
    // ไอคอนเป้าบนหัวตั๋ว
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(sx, cy, 9.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FF5C84';
    ctx.beginPath(); ctx.arc(sx, cy, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(sx, cy, 4.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FF5C84';
    ctx.beginPath(); ctx.arc(sx, cy, 2.4, 0, TAU); ctx.fill();
    ctx.fillStyle = T.ink;
    ctx.fillText(lab, tx, cy - 6);
    // หลอดความคืบหน้า + ตัวเลข
    const p = Math.max(0, Math.min(1, m.n / m.goal));
    const sec = m.kind === 'nohit';
    const cnt = (sec ? Math.floor(m.n / 60) : Math.floor(m.n)) + '/' + (sec ? Math.round(m.goal / 60) : m.goal);
    ctx.font = "700 10px Mali, sans-serif";
    const cw = textWidth(ctx, cnt);
    const bw = w - (tx - left) - cw - 16, by = cy + 9, bh = 6;
    ctx.fillStyle = '#E3D8F8';
    ctx.beginPath(); ctx.roundRect(tx, by, bw, bh, bh / 2); ctx.fill();
    if (p > 0) {
      const fw = Math.max(bh, bw * p);
      const bg = ctx.createLinearGradient(tx, 0, tx + bw, 0);
      bg.addColorStop(0, '#9376DB');
      bg.addColorStop(1, '#F28DB7');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.roundRect(tx, by, fw, bh, bh / 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.beginPath(); ctx.roundRect(tx + 3, by + 1.2, Math.max(0, fw - 6), 1.8, 0.9); ctx.fill();
    }
    ctx.fillStyle = T.sub;
    ctx.fillText(cnt, tx + bw + 6, by + bh / 2 + 0.5);
  } else {
    // ฉลองสำเร็จ: เด้งเข้า → ค้าง → จางออก 25 เฟรมสุดท้าย
    const T = TICKET.done;
    const k = 1 - ex.missionDone / MISSION.doneFrames;
    const pop = easeOutBack(Math.min(1, k * 6));
    const d = ex.doneM;
    const head = t('ภารกิจสำเร็จ!');
    const sub = d.prize === 'heart' ? t('หัวใจ +1') : '+' + d.amount.toLocaleString('en-US');
    ctx.font = "800 15px Mali, sans-serif";
    const w = Math.max(160, tx - left + textWidth(ctx, head) + 18);
    const mx = left + w / 2;
    ctx.globalAlpha = Math.min(1, ex.missionDone / 25);
    // ดาวกระจายจากตั๋ว
    if (k < 0.5) {
      const u = k / 0.5;
      for (let i = 0; i < 12; i++) {
        const a = i * (TAU / 12) + 0.2;
        const dd = 20 + 70 * Math.sqrt(u);
        ctx.fillStyle = i % 3 === 0 ? '#FFFFFF' : i % 3 === 1 ? '#FFE066' : '#FF9CC0';
        sparkle(ctx, mx + Math.cos(a) * dd * 1.4, cy + Math.sin(a) * dd * 0.7, 5 * (1 - u) + 1);
      }
    }
    ctx.translate(mx, cy);
    ctx.scale(pop, pop);
    ctx.translate(-mx, -cy);
    // สูงกว่าตั๋วปกติ: หัวเรื่อง 15px มีสระบน/วรรณยุกต์ ('สำเร็จ') เคยล้นขอบบน (ผู้ใช้ 25 ต.ค.)
    questTicket(ctx, left, cy - 25, w, 50, 'done');
    // เครื่องหมายถูกบนหัวตั๋ว
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(sx - 6, cy);
    ctx.lineTo(sx - 1.5, cy + 4.6);
    ctx.lineTo(sx + 6.5, cy - 4.6);
    ctx.stroke();
    ctx.font = "800 15px Mali, sans-serif";
    ctx.fillStyle = T.ink;
    ctx.fillText(head, tx, cy - 6);
    ctx.font = "700 12px Mali, sans-serif";
    if (d.prize === 'heart') glossyHeart(ctx, tx + 6, cy + 13, 6);
    else drawFish(ctx, tx + 6, cy + 13, 6);
    ctx.fillStyle = T.sub;
    ctx.fillText(sub, tx + 16, cy + 13);
  }
  ctx.restore();
}

/**
 * เวลาที่วิ่งไปแล้วในรอบนี้ — ซ้ายบนสุด เหนือคอมโบ: วงนาฬิกา (เข็มเดินตามวินาที) + "3:07"
 * นับจาก game.tick (เดินเฉพาะตอนวิ่ง หยุดเกม/ฉากเปิดไม่นับ) · 60 เฟรม = 1 วินาที
 * เกินชั่วโมงขึ้น "1:02:05"
 */
function drawRunTime(ctx, game) {
  const left = edgeInset(safeInsets(ctx).left);
  const r = 14, cx = left + r, cy = WORD_TOP + 8;
  const sec = Math.floor((game.tick || 0) / 60);
  const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, ss = sec % 60;
  const pad = (v) => String(v).padStart(2, '0');
  const txt = h > 0 ? h + ':' + pad(m) + ':' + pad(ss) : m + ':' + pad(ss);
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = '800 16px Mali, sans-serif';
  const tw = textWidth(ctx, txt);
  if (HUD_FRAMES.time) candyCard(ctx, cx, cy - 13, r + 8 + tw + 14, 26, 'time', game.tick, false);
  iconBadge(ctx, cx, cy, r, '#FFFFFF', '#D5EEFF', (x, y, rr) => {
    ctx.fillStyle = '#7FB4F0';
    for (let i = 0; i < 4; i++) {
      const a = i * (TAU / 4);
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr * 0.72, y + Math.sin(a) * rr * 0.72, 1.3, 0, TAU); ctx.fill();
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1F5FC0';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - rr * 0.5); ctx.stroke();
    const a = (ss / 60) * TAU - Math.PI / 2;
    ctx.strokeStyle = '#FF4F7E';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * rr * 0.66, y + Math.sin(a) * rr * 0.66); ctx.stroke();
    ctx.fillStyle = '#1F5FC0';
    ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill();
  });
  if (!HUD_FRAMES.time) ctx.font = '800 18px Mali, sans-serif';   // ไม่มีกรอบ = ตัวเลขใหญ่ขึ้นนิด ไม่ให้ดูจมเล็กข้างวงนาฬิกา
  inkText(ctx, txt, cx + r + 8, cy + 1, CARD.time[2], HUD_FRAMES.time ? 4 : 4.6);
  ctx.restore();
}

/**
 * คอมโบความอร่อย — ขวาบน ใต้ค่าขนมเปียก: วงเปลวไฟ · "คอมโบ" · ตัวเลขใหญ่ · ป้ายตัวคูณ ×1.5
 * ขึ้นขั้นตัวคูณ = เปลวไฟกับตัวเลขเด้ง (game.comboPop) · ×3 = การ์ดเปลี่ยนเป็นชมพูม่วง
 * คอมโบหลุด = การ์ดเทา "คอมโบหลุด!" จางหาย (game.comboBreak)
 */
function drawCombo(ctx, game) {
  // ขวาริม ใต้ค่าขนมเปียก (ตัวเลขจบราว TREAT_TOP+36) — คอมโบคือตัวคูณค่าขนม จึงอยู่คู่กัน (ผู้ใช้ 25 ต.ค.)
  const right = W - edgeInset(safeInsets(ctx).right);
  const r = 14, cy = TREAT_TOP + 66;   // ผู้ใช้ 25 ต.ค.: เล็กลง (ตัวหนังสือเท่าเดิม) + เว้นจากตัวเลขค่าขนม ~13
  const n = game.combo || 0;
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  if (n > 0) {
    const m = comboMult(n);
    const theme = m >= 3 ? 'hot' : 'combo';
    const ink = CARD[theme][2];
    const pop = game.comboPop > 0 ? 1 + 0.35 * Math.sin((game.comboPop / 30) * Math.PI) : 1;
    const lab = t('คอมโบ');
    const num = String(n);
    const chip = '×' + m;
    ctx.font = "700 12px Mali, sans-serif";
    const lw = textWidth(ctx, lab);
    ctx.font = '800 22px Mali, sans-serif';
    const nw = textWidth(ctx, num);
    ctx.font = '800 13px Mali, sans-serif';
    const cw = m > 1 ? textWidth(ctx, chip) + 12 : 0;
    const w = r + 7 + lw + 5 + nw + (m > 1 ? 8 + cw : 0) + 10;
    const cx = right - w, tx = cx + r + 7;
    candyCard(ctx, cx, cy - 13, w, 26, theme, game.tick + 40);
    const flick = 1 + 0.07 * Math.sin(game.tick * 0.35);
    iconBadge(ctx, cx, cy, r * pop, m >= 3 ? '#FFB5F0' : '#FFE07A', m >= 3 ? '#C24DFF' : '#FF7A2E', (x, y, rr) => {
      ctx.save();
      ctx.translate(x, y + rr * 0.15);
      ctx.scale(1, flick);
      ctx.fillStyle = '#FFFFFF';
      flamePath(ctx, 0, 0, rr * 0.72);
      ctx.fill();
      ctx.fillStyle = m >= 3 ? '#FF7EE0' : '#FFC23A';
      flamePath(ctx, 0, rr * 0.2, rr * 0.4);
      ctx.fill();
      ctx.restore();
    });
    ctx.font = "700 12px Mali, sans-serif";
    inkText(ctx, lab, tx, cy + 1, ink, 3.4);
    ctx.save();
    ctx.translate(tx + lw + 5, cy + 1);
    ctx.scale(pop, pop);
    ctx.font = '800 22px Mali, sans-serif';
    inkText(ctx, num, 0, 0, ink, 5, '#FFF3A0');
    ctx.restore();
    if (m > 1) {
      const px = tx + lw + 5 + nw * pop + 8;
      ctx.fillStyle = '#FFF6E6';
      ctx.beginPath(); ctx.roundRect(px - 1.2, cy - 9.2, cw + 2.4, 18.4, 9.2); ctx.fill();
      const cg = ctx.createLinearGradient(0, cy - 8, 0, cy + 8);
      cg.addColorStop(0, m >= 3 ? '#FF6FD0' : m >= 2 ? '#FFB13D' : '#4FD8EA');
      cg.addColorStop(1, m >= 3 ? '#C21F8A' : m >= 2 ? '#F0661A' : '#1E98C8');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.roundRect(px, cy - 8, cw, 16, 8); ctx.fill();
      ctx.font = '800 13px Mali, sans-serif';
      inkText(ctx, chip, px + 6, cy + 1, 'rgba(60,10,40,.55)', 3);
    }
  } else if (game.comboBreak > 0) {
    ctx.globalAlpha = Math.min(1, game.comboBreak / 25);
    ctx.font = "800 14px Mali, sans-serif";
    const lab = t('คอมโบหลุด!');
    const w = r + 7 + textWidth(ctx, lab) + 10;
    const cx = right - w, tx = cx + r + 7;
    candyCard(ctx, cx, cy - 12, w, 24, 'broke', 0, false);
    iconBadge(ctx, cx, cy, r, '#E4DAEE', '#9C8AB0', (x, y, rr) => {
      ctx.fillStyle = '#FFFFFF';
      ctx.save();
      ctx.translate(x, y + rr * 0.15);
      ctx.scale(1, 0.7);
      flamePath(ctx, 0, 0, rr * 0.6);
      ctx.fill();
      ctx.restore();
    });
    inkText(ctx, lab, tx, cy + 1, CARD.broke[2], 3.6);
  }
  ctx.restore();
}
