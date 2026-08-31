// src/render/hud.js
import { VIEW, HEALTH, WORD, LETTER_COLORS, COLORS as C } from '../config.js';
import { drawFish, drawCatFace } from './entities.js';
import { getSkin } from '../skins.js';

const { W, H } = VIEW;

// จุดยึดของ HUD แถวบน รวมไว้ที่เดียวจะได้ตรวจว่าไม่ทับกันได้โดยไม่ต้องไล่อ่านทั้งไฟล์
const TREAT_TOP = 58;    // ค่าขนมเปียก ขวาริม ใต้ปุ่มหยุด/เสียงที่เป็น DOM
const WORD_TOP = 22;     // แถวตัวอักษรสะสม ซ้ายบนสุด

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
  ctx.font = "500 13px 'IBM Plex Sans Thai', sans-serif";
  ctx.fillStyle = pal.ink;
  ctx.fillText('ค่าขนมเปียก', treatX - textWidth(ctx, 'ค่าขนมเปียก'), TREAT_TOP);
  ctx.globalAlpha = 1;

  ctx.font = '600 20px Mitr, sans-serif';
  ctx.fillStyle = pal.accent;
  const treatW = textWidth(ctx, treatText);
  ctx.fillText(treatText, treatX - treatW, TREAT_TOP + 16);

  // ไอคอนกับตัวเลขอยู่บรรทัดเดียวกันเสมอ ไม่ว่าเลขจะกี่หลัก เพราะวางไอคอน
  // จากขอบซ้ายของตัวเลขที่วัดมาแล้ว ส่วน y คือกึ่งกลางแนวตั้งของตัวเลข
  // (วาดแบบ baseline 'top' ฟอนต์ 20px กลางจึงอยู่ราว +10 จากขอบบน)
  drawFish(ctx, treatX - treatW - TREAT_ICON_GAP, TREAT_TOP + 26, 10);

  ctx.textAlign = 'left';

  // มาตรวัดความเร็วถูกถอดออกแล้ว — ความเร็วคงที่ หลอดที่ไม่มีวันขยับคือขยะบนจอ

  ctx.restore();

  drawWord(ctx, game);
  drawHealthBar(ctx, game);

  if (game.notice > 0) drawNotice(ctx, game);
  if (game.bonus > 0) drawBonusBanner(ctx, game);

  // แฟลชแดงทั้งจอตอนโดนชน วาดท้ายสุดเพื่อให้ทับทุกอย่าง
  if (game.hurtFlash > 0) {
    ctx.fillStyle = `rgba(255,92,110,${0.3 * game.hurtFlash})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/**
 * แถบสะสมตัวอักษร MEOWZING — ซ้ายบนสุด เป็นของชิ้นเดียวที่อยู่มุมนั้น
 * ตัวที่ยังไม่ได้เก็บวาดเป็นโครงจาง ๆ ไม่ใช่ซ่อนไว้
 * เพราะผู้เล่นต้องเห็นตั้งแต่ต้นว่าเป้าหมายคือกี่ตัว ไม่งั้นไม่รู้ว่าต้องเก็บอะไรอยู่
 */
function drawWord(ctx, game) {
  const pal = game.pal;
  // 19 -> 23 ให้สมส่วนกับหลอดพลังกับค่าขนมเปียกที่อยู่แถวเดียวกัน
  // เพดานอยู่ที่หลอดพลังซึ่งเริ่มที่ x=331 — แปดตัวอักษรที่ขนาดนี้จบราว 277
  // ยังเหลือช่องไฟก่อนถึงหลอด ถ้าจะขยายอีกต้องขยับหลอดด้วย
  const size = 23;
  const gap = 4;
  // ฝั่งซ้ายเจอรอยบากได้เหมือนกันเวลาหมุนจอกลับด้าน จึงคิดระยะขอบด้วยกฎเดียวกัน
  const x0 = edgeInset(safeInsets(ctx).left);
  const y = WORD_TOP;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 14px Mitr, sans-serif';

  for (let i = 0; i < WORD.length; i++) {
    const x = x0 + i * (size + gap);
    const got = i < game.letters;

    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);

    if (got) {
      // ใช้สีประจำตัวเดียวกับลูกอมในฉาก ผู้เล่นจึงโยงได้ทันทีว่าเก็บตัวไหนไปแล้ว
      // ถ้าช่องที่เก็บแล้วเป็นสีเดียวกันหมด แถบนี้จะบอกได้แค่ "จำนวน" ไม่ได้บอก "ตัวไหน"
      const col = LETTER_COLORS[i % LETTER_COLORS.length];
      ctx.fillStyle = col.main;
      ctx.beginPath();
      ctx.roundRect(-size / 2, -size / 2, size, size, 7);
      ctx.fill();
      // เส้นขอบอ่อนด้านบน ทำให้ช่องดูนูนเข้าชุดกับลูกอม
      ctx.strokeStyle = col.lite;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(-size / 2 + 0.7, -size / 2 + 0.7, size - 1.4, size - 1.4, 6);
      ctx.stroke();
      ctx.fillStyle = col.lite;
      ctx.fillText(WORD[i], 0, 0.5);
    } else {
      ctx.globalAlpha = 0.36;
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(-size / 2, -size / 2, size, size, 7);
      ctx.stroke();
      ctx.fillStyle = pal.ink;
      ctx.fillText(WORD[i], 0, 0.5);
    }
    ctx.restore();
  }

  ctx.restore();
}

/** ป้ายกลางจอตอนอยู่ในโบนัส พร้อมเวลาที่เหลือ */
function drawBonusBanner(ctx, game) {
  const secs = Math.ceil(game.bonus / 60);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  ctx.font = "700 17px Mitr, sans-serif";
  const label = `BONUS TIME  ${secs}`;
  drawLabelPill(ctx, label, 78, 30, 18, 'rgba(59,17,85,.82)', C.letterLite, 6);
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
 * วาดป้ายข้อความกลางจอ: กล่องพื้นหลัง + ข้อความข้างใน
 *
 * ── ทำไมต้องวางเองทั้งคู่ ไม่ใช้ textAlign 'center' ──
 * เคยเขียนแบบวาดกล่องกลางจอ แล้วให้ข้อความจัดกลางด้วย textAlign 'center'
 * ซึ่งดูควรจะตรงกันเอง แต่บนมือถือจริงมันเหลื่อมกัน — กล่องเหลือที่ว่างข้างหนึ่ง
 * ส่วนข้อความไปเบียดอีกข้าง
 *
 * ต้นเหตุคือ measureText กับ textAlign ตกลงกันไม่ได้ว่า "จุดอ้างอิง" อยู่ตรงไหน
 * ค่า actualBoundingBoxLeft/Right ที่ควรวัดจากจุดจัดกลาง บางเบราว์เซอร์กลับ
 * รายงานโดยอ้างอิงหัวข้อความแทน พอเอาไปคำนวณขอบกล่องทีละข้างจึงเพี้ยนคนละทาง
 *
 * เลิกเดาว่าเบราว์เซอร์ยึดอะไร แล้วยึดซ้ายอย่างเดียวทั้งกล่องและข้อความ:
 * วัดความกว้าง -> คำนวณกล่องให้อยู่กลางจอ -> วางข้อความเยื้องจากขอบซ้ายกล่อง
 * เท่ากับ pad พอดี ทั้งสองอย่างจึงอ้างอิงตัวเลขชุดเดียวกันและยึดขอบเดียวกัน
 * ไม่มีทางเหลื่อมกันได้อีกไม่ว่าฟอนต์จะโหลดทันหรือไม่
 *
 * ความกว้างเอาค่ามากสุดระหว่าง advance width กับกรอบหมึกจริง เพราะภาษาไทย
 * มีสระบนล่างกับวรรณยุกต์ที่ยื่นพ้นระยะที่เคอร์เซอร์เดินได้
 */
function drawLabelPill(ctx, label, y, h, padX, bg, fg, textDy) {
  const boxW = textWidth(ctx, label) + padX * 2;
  const boxX = Math.round((W - boxW) / 2);

  const align = ctx.textAlign;
  ctx.textAlign = 'left';

  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(boxX, y, boxW, h, h / 2);
  ctx.fill();

  ctx.fillStyle = fg;
  ctx.fillText(label, boxX + padX, y + textDy);

  ctx.textAlign = align;
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
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.globalAlpha = a;

  ctx.font = "600 15px 'IBM Plex Sans Thai', sans-serif";
  // ข้อความมาจากฝั่งเกม เพราะตอนนี้แถบนี้ใช้บอกได้สองเรื่อง
  // (ผ่านด่านย่อย / ขวดพลังมาแล้ว) ไม่ใช่เรื่องเดียวเหมือนเดิม
  const label = game.noticeText || 'ขวดพลังมาแล้ว! กระโดดเก็บให้ทัน';
  drawLabelPill(ctx, label, 80, 26, 17, game.pal.noticeBg, C.danger, 5);

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
  drawCatFace(ctx, cx, cy + 4, 1, getSkin());
  ctx.restore();
}

/**
 * ขวดพลังกลางบน พร้อมเหรียญหน้าแมวที่หัวหลอด
 *
 * 320x20 — ใหญ่กว่าของเดิม (300x16) พอให้อ่านออกโดยไม่ต้องเพ่ง
 * แต่ไม่ถึงกับกินแถบบนทั้งแถบเหมือนรอบที่ลองไว้ 400x26
 *
 * สีเป็นชุดตายตัวไม่อิงจานสีของด่าน — หลอดต้องอ่านออกเท่ากันทั้งด่านกลางคืน
 * และด่านกลางวัน ถ้าอิงจานสีจะมีด่านหนึ่งที่หลอดกลืนพื้นหลังเสมอ
 */
function drawHealthBar(ctx, game) {
  const w = 320;
  const h = 20;
  const badgeR = 16;

  // เหรียญเกยหัวหลอดเข้าไป 6 ทั้งชุด (เหรียญ+ขวด) จึงกว้าง w+30
  // คำนวณ x จากตรงนั้นย้อนกลับ เพื่อให้ "ทั้งชุด" อยู่กลางจอ ไม่ใช่แค่ตัวขวด
  const x = Math.round((W - w + 22) / 2);
  const y = 34;
  const p = Math.max(0, Math.min(1, game.hp / HEALTH.max));
  const low = p <= HEALTH.lowAt;

  ctx.save();
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';

  // ตัวขวด — วงนอกหนาให้ดูเป็นภาชนะจริง ไม่ใช่แถบสีลอย ๆ
  ctx.fillStyle = C.hpCase;
  ctx.beginPath(); ctx.roundRect(x - 4, y - 4, w + 8, h + 8, (h + 8) / 2); ctx.fill();
  ctx.fillStyle = C.hpTrack;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();

  const fw = w * p;
  if (fw > 0.5) {
    // กะพริบเฉพาะตอนใกล้หมด ให้รู้ตัวโดยไม่ต้องละสายตาจากตัวละคร
    ctx.globalAlpha = low ? 0.55 + Math.sin(game.tick * 0.28) * 0.45 : 1;

    if (low) {
      ctx.fillStyle = C.hpLow;
    } else {
      // ไล่สีตามความยาวน้ำที่เหลือจริง ไม่ใช่ตามความยาวขวด
      // หลอดสั้นลงก็ยังเห็นส้ม→แดงครบ ไม่ใช่เหลือแต่ปลายส้มด้านเดียว
      const g = ctx.createLinearGradient(x, 0, x + fw, 0);
      g.addColorStop(0, C.hpWarm);
      g.addColorStop(1, C.hpHot);
      ctx.fillStyle = g;
    }

    ctx.beginPath();
    ctx.roundRect(x, y, fw, h, Math.min(h / 2, fw / 2));
    ctx.fill();

    // ไฮไลต์บนให้ดูเป็นแก้วมีน้ำอยู่ข้างใน แทนที่จะเป็นแถบแบน
    if (fw > 14) {
      ctx.globalAlpha *= 0.34;
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.roundRect(x + 5, y + 4, fw - 10, 5, 2.5);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
  drawCatBadge(ctx, x - 10, y + h / 2, badgeR);

  ctx.restore();
}
