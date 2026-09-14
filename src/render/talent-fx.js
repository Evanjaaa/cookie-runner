// src/render/talent-fx.js
// ─────────────────────────────────────────────────────────────
// ภาพของพรสวรรค์ — อ่านสถานะจาก game.talents อย่างเดียว ไม่เปลี่ยนค่าอะไรเลย
//
// แบ่งสามชั้นตามลำดับการวาดในเกม:
//   back    หลังตัวน้อง  เมฆใต้เท้า ปีกร่อน เส้นพุ่ง ออร่าเงา
//   front   หน้าตัวน้อง  เศษกระจกตอนเด้ง วงนาฬิกา สปริง ลูกศรเปลี่ยนระดับ
//   screen  เต็มจอ       ฟิลเตอร์โลกช้า / โหมดเงา (ใต้ HUD)
//
// ── งบประมาณความหนัก ──
// ทุกอย่างเป็นรูปทรงง่าย ๆ (วงรี เส้น) ไม่ใช้ filter หรือ shadowBlur ในจุดที่วาดทุกเฟรม
// ฟิลเตอร์เต็มจอมีแค่สองอย่างและโผล่เฉพาะช่วงที่ฤทธิ์ทำงาน (2–3 วินาที) ไม่ได้วาดตลอดทั้งตา
// ─────────────────────────────────────────────────────────────
import { VIEW, CAT_LOOK, BODY } from '../config.js';
import { drawPlayer } from './entities.js';

const { W, H } = VIEW;

/**
 * จานสีของร่างเงา (แมวสองโลก) — ม่วงเข้มทั้งตัว ตาสว่าง
 *
 * solid: true = วาดแบบเรียบ ไม่เอารูปหน้าที่ผู้เล่นอัปโหลดมาทับ และไม่มีขอบแสง
 * (ธงเดียวกับที่หน้าระบายสีใช้วาดแผนที่รหัสสี) ร่างเงาจึงเป็นเงาจริง ไม่ใช่รูปถ่ายสีม่วง
 * outfit: null = ไม่ใส่ชุด — ชุดสีสด ๆ บนตัวเงาจะอ่านเป็นตัวละครอีกตัว ไม่ใช่ร่างเงาของน้อง
 */
const TWIN_SKIN = {
  id: 'shadow-twin',
  cat: '#4B2A72', line: '#1C0A30', dark: '#351B55', cream: '#6E4B98',
  pink: '#C79BEA', nose: '#C79BEA', eye: '#F6E9FF', ink: '#F6E9FF',
  whisker: 'rgba(230,210,255,.55)', rain: ['#6E4B98', '#C79BEA', '#351B55'],
  stripes: false, blush: false, solid: true, outfit: null,
};

/** กลางตัวที่ตาเห็น (ตัวขยายขึ้นไปทางหัว สูตรเดียวกับ catAnchor ใน treasure-run.js) */
function anchor(game) {
  const b = game.player.box;
  const half = b.h / 2;
  const s = game.catScale;
  return { x: b.x + b.w / 2, y: b.y + half + half * (1 - s), s, feet: game.player.y, b };
}

// ══ ชั้นหลังตัว ═════════════════════════════════════════════

export function drawTalentBack(ctx, game) {
  const t = game.talents;
  if (!t.id || game.bonus > 0) return;
  const a = anchor(game);
  const p = game.player;

  // ── แมวลอย: ก้อนเมฆใต้เท้า ──
  if (t.id === 'SS7') {
    const ground = p.onGround;
    const w = (ground ? 26 : 32) * a.s;
    const y = a.feet + (ground ? 2 : 7);
    const bob = Math.sin(game.tick * 0.12) * 1.5;
    ctx.save();
    ctx.globalAlpha = ground ? 0.55 : 0.92;
    ctx.fillStyle = '#F4ECFF';
    for (const [dx, dy, r] of [[-0.62, 0.1, 0.42], [0, -0.18, 0.55], [0.62, 0.1, 0.42], [0, 0.22, 0.5]]) {
      ctx.beginPath();
      ctx.ellipse(a.x + dx * w, y + dy * w * 0.6 + bob, r * w, r * w * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // เงาใต้เมฆบาง ๆ ให้เมฆมีปริมาตร ไม่เป็นแผ่นแปะ
    ctx.fillStyle = 'rgba(150,120,210,.35)';
    ctx.beginPath();
    ctx.ellipse(a.x, y + w * 0.3 + bob, w * 0.9, w * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── แมวร่อน: ปีกขนนกสองข้างกางขึ้นเหนือหลังตอนร่อน ──
  // วางโคนปีกไว้กลางหลัง แล้วชี้ปลายขึ้นไปทางซ้ายบน (ทิศตรงข้ามกับที่วิ่ง)
  // เคยหมุนออกด้านข้างแล้ววัดจากภาพจริง ปีกเกือบทั้งปีกจมอยู่หลังตัวน้อง เห็นแค่ปลายนิดเดียว
  if (t.id === 'S1' && t.gliding) {
    const flap = Math.sin(game.tick * 0.32) * 0.12;
    const span = 38 * a.s;
    const rootX = a.x - 6 * a.s;
    const rootY = a.y - 10 * a.s;
    const wing = (rot, sx, fill) => {
      ctx.save();
      ctx.translate(rootX, rootY);
      ctx.rotate(rot + flap);
      ctx.scale(sx, 1);
      ctx.fillStyle = fill;
      ctx.strokeStyle = 'rgba(110,80,150,.6)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-span * 0.25, -span * 1.05, -span * 0.95, -span * 0.82);
      ctx.quadraticCurveTo(-span * 0.78, -span * 0.52, -span * 0.9, -span * 0.38);
      ctx.quadraticCurveTo(-span * 0.62, -span * 0.3, -span * 0.66, -span * 0.12);
      ctx.quadraticCurveTo(-span * 0.35, -span * 0.08, 0, 0);
      ctx.fill();
      ctx.stroke();
      // เส้นขนสองเส้น ให้อ่านเป็นปีกขนนก ไม่ใช่ใบไม้
      ctx.beginPath();
      ctx.moveTo(-span * 0.12, -span * 0.12);
      ctx.lineTo(-span * 0.72, -span * 0.62);
      ctx.moveTo(-span * 0.1, -span * 0.05);
      ctx.lineTo(-span * 0.6, -span * 0.25);
      ctx.stroke();
      ctx.restore();
    };
    ctx.save();
    wing(0.15, 1, 'rgba(226,212,250,.92)');     // ปีกหลัง เข้มกว่า = อยู่ไกลกว่า
    wing(0.55, 0.82, 'rgba(255,250,240,.97)');  // ปีกหน้า ตั้งชันกว่า
    ctx.restore();
  }

  // ── ก้าวพริบตา: เส้นความเร็วลากตามหลัง ──
  if (t.dashing) {
    const k = Math.min(1, t.active / 6);
    ctx.save();
    ctx.strokeStyle = 'rgba(141,243,234,.85)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const y = a.b.y + 6 + i * (a.b.h / 5);
      const len = (40 + ((i * 37 + Math.floor(game.tick)) % 50)) * k;
      ctx.globalAlpha = 0.35 + 0.5 * k * (i % 2 ? 0.6 : 1);
      ctx.lineWidth = i % 2 ? 2 : 3;
      ctx.beginPath();
      ctx.moveTo(a.b.x - 6, y);
      ctx.lineTo(a.b.x - 6 - len, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── แมวเงา: ออร่าม่วงเข้มหลังตัว ──
  if (t.phasing) {
    const pulse = 1 + Math.sin(game.tick * 0.2) * 0.06;
    ctx.save();
    const r = 50 * a.s * pulse;
    const g = ctx.createRadialGradient(a.x, a.y, r * 0.15, a.x, a.y, r);
    // เข้มตรงกลางพอให้ตัวน้องที่โปร่งแสงอยู่ "จมอยู่ในเงา" ไม่ใช่แค่ภาพจาง ๆ
    g.addColorStop(0, 'rgba(48,14,78,.82)');
    g.addColorStop(0.55, 'rgba(70,24,110,.45)');
    g.addColorStop(1, 'rgba(40,10,70,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(a.x, a.y, r, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── แมวกลับตัว: ส่วนโค้งบอกทิศที่กำลังเลื่อน ──
  if (t.id === 'S2' && !p.onGround && Math.abs(p.ovx) > 0.8) {
    const dir = Math.sign(p.ovx);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,243,226,.7)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.7 - i * 0.2;
      const x = a.x - dir * (24 + i * 8) * a.s;
      ctx.beginPath();
      ctx.arc(x, a.y, (10 + i * 4) * a.s, dir > 0 ? Math.PI * 0.7 : -Math.PI * 0.3, dir > 0 ? Math.PI * 1.3 : Math.PI * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ══ ชั้นหน้าตัว ═════════════════════════════════════════════

export function drawTalentFront(ctx, game) {
  const t = game.talents;
  if (!t.id || game.bonus > 0) return;
  const a = anchor(game);

  if (t.twin) drawTwin(ctx, game, t);
  if (t.id === 'SS6' && t.active > 0) drawClaw(ctx, t, a);

  // ── แมวสะท้อน: เศษกระจกหกเหลี่ยมแตกกระจายออกจากตัว ──
  if (t.fx.reflect > 0) {
    const k = 1 - t.fx.reflect;             // 0 → 1
    const r = (26 + k * 46) * a.s;
    ctx.save();
    ctx.globalAlpha = t.fx.reflect;
    ctx.strokeStyle = '#DDF6FF';
    ctx.lineWidth = 3 - k * 2;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + k * 0.6;
      const x = a.x + Math.cos(ang) * r;
      const y = a.y + Math.sin(ang) * r;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(210,240,255,.8)';
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + 0.5;
      const d = r * (1.1 + k * 0.4);
      ctx.save();
      ctx.translate(a.x + Math.cos(ang) * d, a.y + Math.sin(ang) * d);
      ctx.rotate(ang + k * 3);
      ctx.fillRect(-3, -6, 6, 12);
      ctx.restore();
    }
    ctx.restore();
  }

  // ── แมวหยุดจังหวะ: วงนาฬิการอบตัว เข็มเดินช้า ๆ ──
  if (t.slowing) {
    const left = t.active / Math.max(1, t.t.duration);
    const r = 40 * a.s;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = 'rgba(190,210,255,.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    // วงหดตามเวลาที่เหลือ — อ่านได้โดยไม่ต้องมีตัวเลข
    ctx.arc(a.x, a.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(a.x + Math.cos(ang) * (r - 5), a.y + Math.sin(ang) * (r - 5));
      ctx.lineTo(a.x + Math.cos(ang) * (r + 1), a.y + Math.sin(ang) * (r + 1));
      ctx.stroke();
    }
    const hand = game.tick * 0.03;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(a.x + Math.cos(hand) * r * 0.8, a.y + Math.sin(hand) * r * 0.8);
    ctx.stroke();
    ctx.restore();
  }

  // ── แมวเด้ง: สปริงยุบใต้เท้าตอนเพิ่งเด้ง ──
  if (t.fx.bounce > 0) {
    const k = t.fx.bounce;
    const x = a.x;
    const y0 = game.player.y;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.strokeStyle = '#FFD36B';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const coils = 4;
    const h = 14 * k + 4;
    for (let i = 0; i <= coils * 2; i++) {
      const px = x + (i % 2 ? 9 : -9);
      const py = y0 + 6 + (i / (coils * 2)) * h;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(x, y0 + 6);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ── แมวลอย: ลูกศรบอกทิศเปลี่ยนระดับ ──
  if (t.fx.lane > 0) {
    const k = t.fx.lane;
    const dir = t.fx.laneDir;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.fillStyle = '#FFF3E2';
    const x = a.x + 28 * a.s;
    const y = a.y - dir * (1 - k) * 18;
    ctx.beginPath();
    ctx.moveTo(x, y - dir * 8);
    ctx.lineTo(x + 7, y + dir * 3);
    ctx.lineTo(x - 7, y + dir * 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── ระดับบนสุดใกล้หมดเวลา: แถบเล็กใต้เมฆหดลงเรื่อย ๆ ──
  if (t.id === 'SS7' && t.lane === t.tune.lanes.length - 1) {
    const k = Math.max(0, t.topLeft / t.tune.topFrames);
    const w = 34;
    ctx.save();
    ctx.fillStyle = 'rgba(27,15,43,.55)';
    ctx.fillRect(a.x - w / 2, a.feet + 20, w, 4);
    ctx.fillStyle = k < 0.3 ? '#FF8FAE' : '#C9F7F2';
    ctx.fillRect(a.x - w / 2, a.feet + 20, w * k, 4);
    ctx.restore();
  }
}

/**
 * ร่างเงาเหนือหัว — ใช้ท่าวาดตัวน้องชุดเดียวกับตัวจริงทุกเส้น (drawPlayer) แค่เปลี่ยนจานสี
 * ขาแกว่งตามจังหวะวิ่งของตัวจริง จึงอ่านเป็น "อีกร่างหนึ่งของตัวเดียวกัน" ไม่ใช่สติกเกอร์ลอย ๆ
 */
function drawTwin(ctx, game, t) {
  const tw = t.twin;
  const p = game.player;
  const sc = CAT_LOOK * t.tune.scale;
  // ตัวละครปลอมที่มีแค่ค่าที่ drawPlayer อ่าน — ไม่ใช่ Player จริง ไม่มีฟิสิกส์
  const ghost = {
    box: { x: tw.x - BODY.standW / 2, y: tw.y - BODY.standH, w: BODY.standW, h: BODY.standH },
    // y ใช้แค่คำนวณเงาใต้ตัวบนพื้น — ตั้งให้สูงพ้นพื้น 400px เงาจึงจางเป็นศูนย์พอดี
    // (ห้ามตั้งไกลลิบ: เคยใส่ -9999 แล้วรัศมีเงาติดลบจน ellipse() โยน error ลูปวาดหยุดทั้งเกม
    //  และห้ามแก้ด้วย isDead: true แม้จะปิดเงาได้ เพราะมันเปลี่ยนหน้าเป็นหน้าสลบด้วย)
    y: 320 - 400, vy: 0, onGround: false, sliding: false, tilt: 0, squash: 0,
    runPhase: p.runPhase + 1.4, tailLag: Math.sin(game.tick * 0.08), gaitK: 1,
  };
  ctx.save();
  // แสงม่วงรอบร่าง — วาดก่อนตัว ร่างจึงลอยอยู่ในหมอกของตัวเอง
  const cy = tw.y - 23 * sc;
  const r = 40 * sc;
  const g = ctx.createRadialGradient(tw.x, cy, r * 0.2, tw.x, cy, r);
  g.addColorStop(0, `rgba(150,90,230,${0.45 * tw.a})`);
  g.addColorStop(1, 'rgba(90,40,160,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(tw.x, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // ช่วงใกล้หมดเวลา ร่างกะพริบถี่ บอกว่ากำลังจะหายไป
  const ending = t.active > 0 && t.active < 90 && Math.floor(game.tick / 5) % 2 === 0;
  ctx.globalAlpha = tw.a * (ending ? 0.45 : 0.82);
  drawPlayer(ctx, ghost, false, TWIN_SKIN, false, 0, 'happy', sc);
  ctx.restore();
}

/**
 * กรงเล็บของจอมทำลาย — ใบมีดโค้งสามใบกวาดลงเฉียงข้างหน้าตัว
 * จังหวะภาพตรงกับจังหวะโดนจริง: ใบมีดกวาดถึงกลางทางพอดีเฟรมที่ strike() ทำงาน
 */
function drawClaw(ctx, t, a) {
  const dur = t.t.duration;
  const k = 1 - t.active / dur;                           // 0 → 1
  const ease = 1 - Math.pow(1 - Math.min(1, k * 1.6), 3);  // กวาดเร็วแล้วค่อยหยุด
  const alpha = k < 0.15 ? k / 0.15 : k > 0.7 ? (1 - k) / 0.3 : 1;
  const cx = a.b.x + a.b.w + t.tune.reach * 0.42;
  const cy = a.y - 8;
  const rot = -1.05 + ease * 1.5;

  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.translate(cx, cy);

  // รอยข่วนที่ทิ้งไว้ในอากาศ (หลังใบมีดผ่านไปแล้ว)
  if (k > 0.25) {
    ctx.strokeStyle = 'rgba(255,190,230,.75)';
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.lineWidth = 5 - Math.abs(i);
      ctx.beginPath();
      ctx.moveTo(-62 + i * 14, -54 + i * 6);
      ctx.quadraticCurveTo(0 + i * 16, -6 + i * 18, 58 + i * 14, 50 + i * 6);
      ctx.stroke();
    }
  }

  // ใบมีดสามใบ ทรงพระจันทร์เสี้ยว
  ctx.rotate(rot);
  for (let i = -1; i <= 1; i++) {
    ctx.save();
    ctx.translate(i * 17, i * 4);
    ctx.fillStyle = '#FFF6EA';
    ctx.strokeStyle = '#5A2A6E';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -46);
    ctx.quadraticCurveTo(22, -8, 4, 34);
    ctx.quadraticCurveTo(10, -6, 0, -46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // ประกายตอนข่วนโดนของจริง — ข่วนลมไม่มีประกาย ผู้เล่นจึงรู้ว่าโดนหรือไม่โดน
  if (t.struck && t.strikeHits > 0 && k < 0.6) {
    const s = 1 - k / 0.6;
    ctx.save();
    ctx.globalAlpha = s;
    ctx.fillStyle = '#FFE49B';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      const rr = i % 2 ? 10 : 30 * (1.2 - s * 0.4);
      ctx.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ══ ชั้นเต็มจอ ══════════════════════════════════════════════

export function drawTalentScreen(ctx, game) {
  const t = game.talents;
  if (!t.id || game.bonus > 0) return;

  if (t.slowing || t.phasing) {
    const slow = t.slowing;
    // ค่อย ๆ เข้าและค่อย ๆ ออกช่วง 10 เฟรมแรก/สุดท้าย ไม่ใช่ติดทีเดียวเต็ม
    const edge = Math.min(1, t.active / 10, (t.t.duration - t.active) / 10 + 0.05);
    ctx.save();
    ctx.globalAlpha = Math.max(0, edge);
    ctx.fillStyle = slow ? 'rgba(90,120,255,.10)' : 'rgba(70,20,110,.10)';
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.7);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, slow ? 'rgba(40,60,160,.38)' : 'rgba(40,10,70,.42)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}
