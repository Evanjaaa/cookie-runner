// src/render/hud.js
import { coverExt } from './cover-ext.js';
import { VIEW, COLORS as C, BONUS, SCENE, LIVES, comboMult } from '../config.js';
import { drawFish, drawCatFace } from './entities.js';
import { getSkin } from '../skins.js';
import { CAT2, useCat2, drawCatFaceAuto } from './cat2.js';
import { t } from '../i18n.js';

const { W, H } = VIEW;

// จุดยึดของ HUD แถวบน รวมไว้ที่เดียวจะได้ตรวจว่าไม่ทับกันได้โดยไม่ต้องไล่อ่านทั้งไฟล์
const TREAT_TOP = 58;    // ค่าขนมเปียก ขวาริม ใต้ปุ่มหยุด/เสียงที่เป็น DOM
const WORD_TOP = 22;     // แถวตัวอักษรสะสม ซ้ายบนสุด
const RUN_TOP = 66;      // หลอดระยะในด่านย่อย ใต้หลอดพลัง (ขอบล่างหลอดพลังจบที่ 58)
// ขอบบนสุดที่ป้ายกลางจอ (โบนัส / ผ่านด่าน) ยื่นขึ้นไปได้ — รวมวงตัวเลขตอนเด้ง ขอบครีม และประกาย
// ต้องพ้นหลอดระยะ (ราง 66-76 + หัวน้องบนหลอดที่ยื่นลงมาอีกนิด) ห้ามบังเส้นทาง
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
  // ทุกสีตัวอักษรมาจากจานสีของด่าน — ฟ้ากลางวันสว่างจนครีมอ่านไม่ออก
  const pal = game.pal;

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
  ctx.globalAlpha = 0.72;
  ctx.font = "600 13px Mali, sans-serif";
  ctx.fillStyle = pal.ink;
  const treatLabel = t('ค่าขนมเปียก');
  ctx.fillText(treatLabel, treatX - textWidth(ctx, treatLabel), TREAT_TOP);
  ctx.globalAlpha = 1;

  ctx.font = '700 20px Mali, sans-serif';
  ctx.fillStyle = pal.accent;
  const treatW = textWidth(ctx, treatText);
  ctx.fillText(treatText, treatX - treatW, TREAT_TOP + 16);

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
  drawFish(ctx, treatX - treatW - TREAT_ICON_GAP, TREAT_TOP + 16 + inkMid, 10);

  ctx.textAlign = 'left';

  // มาตรวัดความเร็วถูกถอดออกแล้ว — ความเร็วคงที่ หลอดที่ไม่มีวันขยับคือขยะบนจอ

  ctx.restore();

  ctx.save();
  ctx.translate(0, -ext.top);   // แถบบนทั้งชุดชิดขอบจอจริงเหมือนกัน (ดูข้างบน)
  // เกมเพลย์ใหม่ (25 ต.ค. 2026): ตัวอักษรโบนัส → คอมโบความอร่อย · หลอดพลัง → หัวใจเก้าดวง
  drawCombo(ctx, game);
  drawHearts(ctx, game);
  drawMission(ctx, game);
  drawRunBar(ctx, game);

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

  // ขอบครีมหนา แล้วตัวป้ายไล่สีข้างใน
  ctx.fillStyle = '#FFF6E6';
  ctx.beginPath(); ctx.roundRect(boxX - 3, y - 3, boxW + 6, h + 6, (h + 6) / 2); ctx.fill();
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
    ctx.beginPath(); ctx.arc(bx, cy, r + 3, 0, Math.PI * 2); ctx.fill();
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

/** ป้ายกลางจอตอนอยู่ในโบนัส พร้อมเวลาที่เหลือ */
function drawBonusBanner(ctx, game) {
  const secs = Math.ceil(game.bonus / 60);
  // เวลาที่ผ่านมาในโบนัส (ป้ายเด้งเข้าช่วง 18 เฟรมแรก) และเศษของวินาที (เลขเด้งตอนเปลี่ยน)
  const since = BONUS.frames - game.bonus;
  const frac = (game.bonus % 60) / 60;

  ctx.save();
  ctx.font = "700 19px Mali, sans-serif";
  // วงตัวเลขตอนเด้งสุดยื่นขึ้นเหนือป้าย (34+8)/2*1.22+3 - 17 ≈ 12 หน่วย ประกายอีก 8
  drawCandyPill(ctx, 'BONUS TIME', BANNER_CLEAR + 12, 34, 'bonus', game.tick, {
    pop: Math.min(1, since / 18),
    badge: secs,
    bump: frac > 0.85 ? (frac - 0.85) / 0.15 : 0,
  });
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
  const h = 7;
  const x = Math.round((W - w) / 2);
  const y = RUN_TOP;

  // ด่านที่เขียนลำดับท่อนเองวัดความคืบหน้าด้วยระยะ ไม่ใช่เวลา (ดู Game.sceneProgress)
  const p = game.sceneProgress;
  const fw = w * p;

  ctx.save();

  ctx.fillStyle = C.runCase;
  ctx.beginPath(); ctx.roundRect(x - 3, y - 3, w + 6, h + 6, (h + 6) / 2); ctx.fill();
  ctx.fillStyle = C.runTrack;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();

  if (fw > 0.5) {
    const g = ctx.createLinearGradient(x, 0, x + Math.max(fw, 1), 0);
    g.addColorStop(0, C.runWarm);
    g.addColorStop(1, C.runHot);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x, y, fw, h, Math.min(h / 2, fw / 2));
    ctx.fill();
  }

  drawGoalFlag(ctx, x + w + 8, y + h / 2, game.nextScene ? game.tick : -1);

  // หัวน้องวิ่งไปตามหลอด — หนีบไว้ในราง ไม่งั้นตอนเริ่มฉากมันจะไปทับ
  // เหรียญหน้าแมวที่หัวหลอดพลังซึ่งอยู่เยื้องซ้ายขึ้นไปนิดเดียว
  // 12 คือระยะที่วัดแล้วหัวน้องพ้นขอบเหรียญสนิทตอนหลอดยังว่าง
  const mx = x + Math.max(12, Math.min(w - 8, fw));
  hudFace(ctx, mx, y + h / 2, 0.4, getSkin());

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

/** ธงปลายทางของฉาก — โบกตอนถึงแล้ว เพื่อบอกว่ากำลังจะเปลี่ยนฉาก */
function drawGoalFlag(ctx, x, y, wave) {
  const sway = wave >= 0 ? Math.sin(wave * 0.22) * 1.5 : 0;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.cream;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, y + 4);
  ctx.lineTo(x, y - 9.5);
  ctx.stroke();

  ctx.fillStyle = C.runHot;
  ctx.beginPath();
  ctx.moveTo(x + 0.8, y - 9.5);
  ctx.quadraticCurveTo(x + 4.6, y - 8.8 + sway, x + 8, y - 7);
  ctx.quadraticCurveTo(x + 4.6, y - 5.2 + sway, x + 0.8, y - 4.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** หลอดพลังกลางจอบน — ตัวเดียวที่ผู้เล่นต้องจ้องตลอดเวลา เลยวางไว้กลาง */
/** เหรียญหน้าแมวที่หัวหลอด — วาดจานก่อน แล้วทับด้วยหน้าแมว หูจึงพาดขอบจานพอดี */
function drawCatBadge(ctx, cx, cy, r) {
  ctx.save();
  ctx.fillStyle = 'rgba(30,8,18,.92)';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.hpCase;
  ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.arc(cx, cy, r - 1.6, 0, Math.PI * 2); ctx.stroke();

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

/**
 * แมวเก้าชีวิต — หัวใจเก้าดวงกลางบน (แทนหลอดพลัง) พร้อมเหรียญหน้าแมวหัวแถว
 * ดวงที่เสียแล้ว = โครงจาง · ดวงที่เพิ่งเสีย = แตกกระเด็นเล็ก ๆ (game.lifeLost)
 * เหลือ ≤ LIVES.lowAt = ดวงที่เหลือเต้นตุบ ๆ เตือน
 */
function drawHearts(ctx, game) {
  const n = LIVES.max, r = 9, gap = 23;
  const w = (n - 1) * gap;
  const x0 = Math.round((W - w + 30) / 2);
  const y = 44;
  const lives = Math.max(0, Math.min(n, game.lives ?? n));
  const low = lives > 0 && lives <= LIVES.lowAt;
  ctx.save();
  // พื้นหลังแคปซูลอ่านออกทุกฉาก
  ctx.fillStyle = C.hpCase;
  ctx.beginPath(); ctx.roundRect(x0 - 16, y - 15, w + 32, 30, 15); ctx.fill();
  ctx.fillStyle = C.hpTrack;
  ctx.beginPath(); ctx.roundRect(x0 - 12, y - 11, w + 24, 22, 11); ctx.fill();
  for (let i = 0; i < n; i++) {
    const x = x0 + i * gap;
    if (i < lives) {
      const beat = low ? 1 + 0.14 * Math.max(0, Math.sin(game.tick * 0.22)) : 1;
      const g = ctx.createLinearGradient(0, y - r, 0, y + r);
      g.addColorStop(0, '#FF8FB0');
      g.addColorStop(1, '#E8325E');
      ctx.fillStyle = g;
      heartPath(ctx, x, y + 1, r * beat);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath(); ctx.ellipse(x - r * 0.42, y - r * 0.3, r * 0.22, r * 0.14, -0.6, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 1.6;
      heartPath(ctx, x, y + 1, r * 0.9);
      ctx.stroke();
      // ดวงที่เพิ่งเสีย: ขยายแล้วจางหาย
      if (i === lives && game.lifeLost > 0) {
        const u = 1 - game.lifeLost / 40;
        ctx.globalAlpha = 1 - u;
        ctx.fillStyle = '#FF5C84';
        heartPath(ctx, x, y + 1 - u * 10, r * (1 + u * 0.8));
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }
  drawCatBadge(ctx, x0 - 26, y, 16);
  ctx.restore();
}

/**
 * ภารกิจในรอบ (game.extras.mission) — ซ้ายบน ใต้คอมโบ: ข้อความภารกิจ + หลอดความคืบหน้า
 * ทำสำเร็จ = ป้าย "สำเร็จ!" สีทองค้างสั้น ๆ (game.extras.missionDone)
 */
function drawMission(ctx, game) {
  const ex = game.extras;
  if (!ex || game.bonus > 0) return;
  const m = ex.mission;
  if (!m && !(ex.missionDone > 0)) return;
  const x0 = edgeInset(safeInsets(ctx).left) + 8;
  const y = WORD_TOP + 50;
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = "600 12px Mali, sans-serif";
  if (m) {
    const lab = '🎯 ' + t(m.text);
    const w = Math.max(150, textWidth(ctx, lab) + 20);
    ctx.fillStyle = C.hpCase;
    ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.roundRect(x0 - 8, y - 13, w, 34, 12); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFE9F0';
    ctx.fillText(lab, x0, y - 2);
    const p = Math.max(0, Math.min(1, m.n / m.goal));
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath(); ctx.roundRect(x0, y + 10, w - 16, 5, 2.5); ctx.fill();
    ctx.fillStyle = '#FFD86B';
    if (p > 0) { ctx.beginPath(); ctx.roundRect(x0, y + 10, (w - 16) * p, 5, 2.5); ctx.fill(); }
  } else {
    const lab = '🎯 ' + t('ภารกิจสำเร็จ!');
    ctx.globalAlpha = Math.min(1, ex.missionDone / 30);
    ctx.fillStyle = '#FFB800';
    ctx.beginPath(); ctx.roundRect(x0 - 8, y - 13, textWidth(ctx, lab) + 20, 26, 12); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(lab, x0, y);
  }
  ctx.restore();
}

/**
 * คอมโบความอร่อย — ซ้ายบนสุด (ที่เดิมของแถบตัวอักษร): "คอมโบ 23" + ป้ายตัวคูณ ×1.5
 * ขึ้นขั้นตัวคูณ = ตัวเลขเด้ง (game.comboPop) · คอมโบหลุด = ข้อความ "คอมโบหลุด" จางหาย (game.comboBreak)
 */
function drawCombo(ctx, game) {
  const x0 = edgeInset(safeInsets(ctx).left) + 8;
  const y = WORD_TOP + 12;
  const n = game.combo || 0;
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  if (n > 0) {
    const m = comboMult(n);
    const pop = game.comboPop > 0 ? 1 + 0.35 * Math.sin((game.comboPop / 30) * Math.PI) : 1;
    // แคปซูลรองหลังให้อ่านออกทุกฉาก (สีเดียวกับแคปซูลหัวใจ)
    ctx.font = '700 20px Mali, sans-serif';
    const bw = 64 + textWidth(ctx, String(n)) + (m > 1 ? 44 : 0);
    ctx.fillStyle = C.hpCase;
    ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.roundRect(x0 - 8, y - 15, bw, 30, 15); ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.font = "600 13px Mali, sans-serif";
    ctx.fillStyle = '#FFE9F0';
    const lab = t('คอมโบ');
    ctx.fillText(lab, x0, y);
    ctx.globalAlpha = 1;
    const lw = textWidth(ctx, lab);
    ctx.save();
    ctx.translate(x0 + lw + 6, y);
    ctx.scale(pop, pop);
    ctx.font = '700 20px Mali, sans-serif';
    ctx.fillStyle = '#FFD86B';
    ctx.fillText(String(n), 0, 1);
    const nw = textWidth(ctx, String(n));
    ctx.restore();
    if (m > 1) {
      const px = x0 + lw + 12 + nw * pop;
      const label = '×' + m;
      ctx.font = '700 13px Mali, sans-serif';
      const tw = textWidth(ctx, label);
      ctx.fillStyle = m >= 3 ? '#FF7EC8' : m >= 2 ? '#FFA928' : '#3FC3D8';
      ctx.beginPath(); ctx.roundRect(px, y - 10, tw + 12, 20, 10); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(label, px + 6, y + 1);
    }
  } else if (game.comboBreak > 0) {
    ctx.globalAlpha = Math.min(1, game.comboBreak / 25);
    ctx.font = "700 14px Mali, sans-serif";
    const lab = t('คอมโบหลุด!');
    ctx.fillStyle = C.hpCase;
    ctx.beginPath(); ctx.roundRect(x0 - 8, y - 15, textWidth(ctx, lab) + 16, 30, 15); ctx.fill();
    ctx.fillStyle = '#FF8FB0';
    ctx.fillText(lab, x0, y);
  }
  ctx.restore();
}

