// src/town/bridge.js
// ─────────────────────────────────────────────────────────────
// แม่น้ำกลางเมือง + สะพานไทยมีศาลา (ผู้ใช้ 31 ต.ค.: แต่งสไตล์ปราสาทแมวเหมียวได้เต็มที่)
//
// แม่น้ำ: ไหลจากน้ำตกบนภูเขาไกล คดเคี้ยวลงมาผ่านเนิน ลอดใต้สะพาน ไปรวมแม่น้ำหน้าเมือง
//   วาดแบบมุมมองจริง — แต่ละระดับความลึก (s) เลื่อนตามกล้องเท่ากับชั้นฉากหลังที่ลึกเท่ากัน (parallax p)
//   ปลายไกลบีบเข้ากลางจอ (จุดลับตา) ใกล้ตัวกว้างเท่าร่องน้ำใต้สะพาน · ฉากหลังชั้นต่าง ๆ เว้นช่องตามแม่น้ำ (riverGap)
// สะพาน: พื้นหินโค้ง (ระดับจาก deckLift ใน layout.js ตัวเดียวกับฟิสิกส์) · ราวลูกกรงหัวเสาบัว · พวงมาลัยห้อย
//   ซุ้มโค้งใหญ่ใต้สะพานเปิดโล่ง — เห็นน้ำ/เรือลอดผ่าน · รูปปั้นแมวเฝ้าหัวสะพาน · ธงราวจากชายคาศาลา
// ศาลา: หลังคาไทยสองชั้นกระเบื้องม่วง ช่อฟ้า/หางหงส์เป็นหางแมวทอง หน้าบันตราหน้าแมว ระบายชมพู โคมห้อย ตั่งให้นั่ง
//   เสาหน้าวาดทับตัวน้อง (drawBridgeFront) — เดินผ่านใต้ศาลาแล้วลอดหลังเสา
// ของนิ่งวาดครั้งเดียวเก็บเป็นภาพ (cached) · น้ำ ประกาย โคม วาดสด
// ─────────────────────────────────────────────────────────────
import { H, GY, ROAD_B, DEPTH, BRIDGE, DECK_Y, SALA, STATUES, groundY } from './layout.js';
import { cached, light, lg, ears, catFace, heart, star } from './world.js';

const TAU = Math.PI * 2;
const { x0: BX0, x1: BX1, rx: RX, half: HALF } = BRIDGE;
const CL = RX - HALF, CR = RX + HALF;          // ตลิ่งสองฝั่ง (ระดับถนน)
const SX = SALA.cx, EAVE = SALA.eave;
const ARCH = { cx: RX, cy: 340, rx: 128, ry: 26 }; // ซุ้มโค้งใต้สะพาน (ขอบบน 314 — สูงพอให้น้องนั่งเรือลอดได้)

// ── แม่น้ำไกล (พิกัดจอ) ───────────────────────────────────────
// s = 0 ต้นน้ำ (น้ำตก) → 1 ถึงแนวถนน · p(s) = อัตราเลื่อนตามกล้อง (ความลึก) · y(s) ไล่ลงตรง ๆ
const SRC_Y = 150;
const depthP = (s) => 0.1 + 0.9 * s ** 2.2;
const riverY = (s) => SRC_Y + (GY - SRC_Y) * s;
const bend = (s) => 560 * (1 - s) ** 1.4 * Math.sin(4.6 * s + 0.6);   // คดเคี้ยว (หน่วยชั้นของตัวเอง)
function riverPt(s, camX, vw) {
  const p = depthP(s), C = vw / 2;
  return { x: C + (RX - camX - C + bend(s)) * p, y: riverY(s), hw: HALF * p, p };
}

/** ช่องแม่น้ำในชั้นฉากหลังที่เลื่อน par เท่าของกล้อง → [ซ้าย, ขวา] พิกัดจอ (ให้ชั้นนั้นเว้นบ้าน/ต้นไม้) */
export function riverGap(camX, vw) {
  return (par) => {
    if (par <= 0.1) return null;
    const s = Math.min(1, ((par - 0.1) / 0.9) ** (1 / 2.2));
    const r = riverPt(s, camX, vw);
    return [r.x - r.hw - 8, r.x + r.hw + 8];
  };
}

/** ภูเขาต้นน้ำ + น้ำตก (ไกลมาก — วาดก่อนชั้นเนิน) */
export function drawRiverSource(c, camX, vw, t) {
  const r = riverPt(0, camX, vw);
  const x = r.x;
  if (x < -260 || x > vw + 260) return;
  c.save();
  // ภูเขาสองยอด ร่องกลางเป็นต้นน้ำ
  c.fillStyle = lg(c, 0, 80, 0, 262, [[0, '#E4D8FA'], [1, '#CDBBF0']]);
  c.beginPath();
  c.moveTo(x - 230, 262);
  c.quadraticCurveTo(x - 150, 150, x - 78, 100);
  c.quadraticCurveTo(x - 40, 118, x - 6, SRC_Y - 22);
  c.lineTo(x + 6, SRC_Y - 22);
  c.quadraticCurveTo(x + 40, 112, x + 84, 88);
  c.quadraticCurveTo(x + 160, 150, x + 240, 262);
  c.closePath();
  c.fill();
  // ซีกเงา (แดดมาจากขวาบน)
  c.fillStyle = 'rgba(120,90,180,.16)';
  c.beginPath(); c.moveTo(x - 230, 262); c.quadraticCurveTo(x - 150, 150, x - 78, 100); c.quadraticCurveTo(x - 92, 170, x - 60, 262); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(x + 84, 88); c.quadraticCurveTo(x + 50, 160, x + 70, 262); c.lineTo(x + 6, 262); c.lineTo(x + 6, SRC_Y - 22); c.quadraticCurveTo(x + 40, 112, x + 84, 88); c.fill();
  // หมวกหิมะชมพูอ่อน
  c.fillStyle = 'rgba(255,246,252,.9)';
  for (const [px, py, d] of [[x - 78, 100, -1], [x + 84, 88, 1]]) {
    c.beginPath();
    c.moveTo(px - 22, py + 18); c.quadraticCurveTo(px - 8, py + 2, px, py); c.quadraticCurveTo(px + 8, py + 2, px + 22, py + 18);
    c.lineTo(px + 12, py + 14); c.lineTo(px + 4 * d, py + 22); c.lineTo(px - 8, py + 14);
    c.closePath(); c.fill();
  }
  // น้ำตก
  c.fillStyle = 'rgba(236,248,255,.92)';
  c.fillRect(x - 6, SRC_Y - 22, 12, 24);
  c.fillStyle = 'rgba(170,215,250,.8)';
  for (let i = 0; i < 4; i++) c.fillRect(x - 5 + i * 3, SRC_Y - 22 + ((t * 0.9 + i * 7) % 20), 1.4, 6);
  // ละอองน้ำตก
  c.fillStyle = 'rgba(255,255,255,.55)';
  for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x - 8 + i * 8, SRC_Y + 1 + Math.sin(t * 0.06 + i) * 1.2, 5, 0, TAU); c.fill(); }
  // หมอกไกล (เท่าชั้นเนินไกล)
  c.fillStyle = 'rgba(236,230,255,.32)';
  c.fillRect(x - 240, 80, 480, 182);
  c.restore();
}

/**
 * แม่น้ำคดเคี้ยวจากน้ำตกลงมาถึงแนวถนน — วาดสองรอบ:
 *   รอบไกล (near = false) หลังชั้นเนิน ก่อนต้นไม้/แถวบ้าน → โดนหมอกของชั้นหลังทับ จางตามระยะ
 *   รอบใกล้ (near = true) หลังแถวบ้าน เฉพาะช่วงใกล้ (ไม่มีหมอกทับ สีใส) ขอบบนค่อย ๆ จางเข้าหารอบไกล ไม่เห็นรอยต่อ
 */
const NEAR_S = 0.8;
export function drawRiverFar(c, camX, vw, t, near = false) {
  const s0 = near ? NEAR_S : 0, N = near ? 16 : 40, Lp = [], Rp = [];
  for (let i = 0; i <= N; i++) {
    const r = riverPt(s0 + ((1 - s0) * i) / N, camX, vw);
    Lp.push([r.x - r.hw, r.y]);
    Rp.push([r.x + r.hw, r.y]);
  }
  const minX = Math.min(...Lp.map((q) => q[0])), maxX = Math.max(...Rp.map((q) => q[0]));
  if (maxX < -20 || minX > vw + 20) return;
  const sAt = (i) => s0 + ((1 - s0) * i) / N;
  const y0 = riverY(s0), fadeK = near ? (y) => Math.min(1, (y - y0) / ((GY - y0) * 0.55)) : () => 1;
  // สะพานอยู่ไกลเกินจอหนึ่งช่วง = แม่น้ำค่อย ๆ จางหาย (ไม่ให้เห็นลำน้ำพาดเฉียงข้ามฟ้าตอนอยู่ปลายเมือง)
  const far = Math.abs(RX - camX - vw * 0.5) - vw * 0.85;
  if (far > 520) return;
  c.save();
  const base = far > 0 ? 1 - far / 520 : 1;
  c.globalAlpha = base;
  // ตลิ่งหญ้าเขียวอ่อนรอบลำน้ำ (กว้างกว่าน้ำนิดหนึ่ง)
  c.fillStyle = near ? lg(c, 0, y0, 0, GY, [[0, 'rgba(178,226,170,0)'], [0.55, 'rgba(178,226,170,.95)'], [1, 'rgba(178,226,170,.95)']]) : 'rgba(186,230,178,.9)';
  c.beginPath();
  Lp.forEach(([x, y], i) => { const w = 1.5 + 8 * depthP(sAt(i)); i ? c.lineTo(x - w, y) : c.moveTo(x - w, y); });
  for (let i = N; i >= 0; i--) { const w = 1.5 + 8 * depthP(sAt(i)); c.lineTo(Rp[i][0] + w, Rp[i][1]); }
  c.closePath(); c.fill();
  // ผิวน้ำ: ไกลอมหมอก → ใกล้ฟ้าใส
  c.fillStyle = near
    ? lg(c, 0, y0, 0, GY, [[0, 'rgba(150,208,246,0)'], [0.55, 'rgba(140,204,245,1)'], [1, '#7EC4F0']])
    : lg(c, 0, SRC_Y, 0, GY, [[0, '#D2E8FB'], [0.4, '#A4D4F6'], [1, '#86C8F2']]);
  c.beginPath();
  Lp.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  for (let i = N; i >= 0; i--) c.lineTo(Rp[i][0], Rp[i][1]);
  c.closePath(); c.fill();
  // เงาตลิ่งฝั่งซ้าย (แดดขวาบน)
  if (!near) {
    c.strokeStyle = 'rgba(80,120,190,.22)';
    c.lineWidth = 2;
    c.beginPath(); Lp.forEach(([x, y], i) => (i ? c.lineTo(x + 1.5, y) : c.moveTo(x + 1.5, y))); c.stroke();
  }
  // ประกายไหลลงมาหาเรา (ไกลสั้น/จาง ใกล้ยาว/ชัด)
  c.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const s = (i / 14 + t * 0.0016) % 1;
    if (s < s0) continue;
    c.globalAlpha = base * fadeK(riverY(s));
    const r = riverPt(s, camX, vw);
    const off = Math.sin(i * 2.3) * r.hw * 0.55;
    c.strokeStyle = `rgba(255,255,255,${0.25 + 0.5 * r.p})`;
    c.lineWidth = 0.8 + 1.4 * r.p;
    c.beginPath(); c.moveTo(r.x + off - 3 - 8 * r.p, r.y); c.lineTo(r.x + off + 3 + 8 * r.p, r.y); c.stroke();
  }
  c.restore();
}

// ── สะพาน (พิกัดโลก) ──────────────────────────────────────────
const top = (x) => groundY(x);              // ขอบหลังพื้นสะพาน (เส้นเท้าน้อง)
const front = (x) => groundY(x) + DEPTH;    // ขอบหน้าพื้นสะพาน
const faceBot = (x) => (x > CL - 14 && x < CR + 14 ? H : ROAD_B + 12);

/** เส้นตามโค้งสะพาน f(x) + dy จาก a ถึง b (ไปทางไหนก็ได้) · move = เริ่มเส้นใหม่ */
function along(c, a, b, f, dy = 0, step = 8, move = true) {
  const n = Math.max(1, Math.ceil(Math.abs(b - a) / Math.abs(step)));
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n;
    if (move && i === 0) c.moveTo(x, f(x) + dy); else c.lineTo(x, f(x) + dy);
  }
}

/** หน้าสะพาน (ผนังหินใต้พื้น) — เจาะช่องซุ้มโค้งด้วย evenodd ให้เห็นน้ำ/เรือข้างหลัง */
function facePath(c) {
  c.beginPath();
  along(c, BX0, BX1, front);
  for (let x = BX1; x >= BX0; x -= 4) c.lineTo(x, faceBot(x));
  c.closePath();
  const { cx, cy, rx } = ARCH;
  c.moveTo(cx - rx, H + 2);
  c.lineTo(cx - rx, cy);
  c.ellipse(cx, cy, rx, ARCH.ry, 0, Math.PI, TAU);
  c.lineTo(cx + rx, H + 2);
  c.closePath();
}

/**
 * หน้าสะพานแยกสองชิ้น: part 'land' = ผนังทางลาดสองฝั่ง (ซุ้มหลอก) · 'arch' = ช่วงข้ามน้ำ (ซุ้มโค้ง เสาตอม่อ เงาใต้ซุ้ม)
 * ชิ้น arch วาดหลังเรือ — เรือแล่นผ่านหน้าผนังทางลาด แต่ลอดหลังเสาตอม่อ/ใต้หัวซุ้ม (ดู drawBridgeArch)
 */
const AL = CL - 14, AR = CR + 14;   // ช่วงข้ามน้ำ (เสาตอม่อรวม)
function drawFace(c, part) {
  c.save();
  c.beginPath();
  if (part === 'arch') c.rect(AL, 0, AR - AL, H + 10);
  else { c.rect(BX0 - 80, 0, AL - BX0 + 80, H + 10); c.rect(AR, 0, BX1 - AR + 80, H + 10); }
  c.clip();
  c.save();
  facePath(c);
  c.fillStyle = lg(c, 0, DECK_Y + DEPTH, 0, H, [[0, '#FFF4FA'], [1, '#EBCFE6']]);
  c.fill('evenodd');
  c.clip('evenodd');
  // แนวก้อนหิน
  c.strokeStyle = 'rgba(170,120,170,.2)';
  c.lineWidth = 1;
  for (let y = DECK_Y + DEPTH + 8, r = 0; y < H; y += 15, r++) {
    c.beginPath(); c.moveTo(BX0, y); c.lineTo(BX1, y); c.stroke();
    for (let x = BX0 + (r % 2) * 18; x < BX1; x += 36) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 15); c.stroke(); }
  }
  c.restore();
  const { cx, cy, rx, ry } = ARCH;
  if (part === 'arch') {
    // ขอบซุ้มหนา + เส้นทอง
    c.strokeStyle = '#F3D9EC';
    c.lineWidth = 7;
    c.beginPath(); c.moveTo(cx - rx - 3, H); c.lineTo(cx - rx - 3, cy); c.ellipse(cx, cy, rx + 3, ry + 3, 0, Math.PI, TAU); c.lineTo(cx + rx + 3, H); c.stroke();
    c.strokeStyle = '#E7B640';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(cx - rx - 7, H); c.lineTo(cx - rx - 7, cy); c.ellipse(cx, cy, rx + 7, ry + 7, 0, Math.PI, TAU); c.lineTo(cx + rx + 7, H); c.stroke();
    // ใต้ซุ้ม: เงามืดบนสุด จางลงหาน้ำ (ทับเรือที่ลอดผ่านด้วย)
    c.beginPath(); c.moveTo(cx - rx, H); c.lineTo(cx - rx, cy); c.ellipse(cx, cy, rx, ry, 0, Math.PI, TAU); c.lineTo(cx + rx, H); c.closePath();
    c.fillStyle = lg(c, 0, cy - ry, 0, ROAD_B + 26, [[0, 'rgba(60,36,110,.5)'], [0.45, 'rgba(60,36,110,.16)'], [1, 'rgba(60,36,110,0)']]);
    c.fill();
    // หินหัวซุ้ม (keystone) + ตราหน้าแมว
    const ky = cy - ry - 2;
    c.fillStyle = '#E7B640';
    c.beginPath(); c.arc(cx, ky, 11.5, 0, TAU); c.fill();
    c.fillStyle = '#FFE9F3';
    c.beginPath(); c.arc(cx, ky, 9, 0, TAU); c.fill();
    catFace(c, cx, ky + 1, 8, true, '#8C6AD6');
    // เสาตอม่อสองฝั่ง (หินอ่อนสว่าง + แถบทองที่ระดับน้ำ)
    for (const px of [AL, CR - 22]) {
      c.fillStyle = lg(c, px, 0, px + 36, 0, [[0, '#F6E2F0'], [0.5, '#FFF8FC'], [1, '#EBCFE6']]);
      c.fillRect(px, front(px + 18) + 6, 36, H - front(px + 18) - 6);
      c.fillStyle = '#E7B640';
      c.fillRect(px - 2, ROAD_B + 10, 40, 5);
      c.fillStyle = 'rgba(255,143,179,.8)';
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(px + 6 + i * 12, ROAD_B + 10); c.lineTo(px + 12 + i * 12, ROAD_B + 2); c.lineTo(px + 18 + i * 12, ROAD_B + 10); c.fill(); }
    }
  } else {
    // ซุ้มหลอก (ช่องโค้งเล็ก) บนผนังทางลาดสองฝั่ง — ยิ่งใกล้แม่น้ำผนังยิ่งสูง ซุ้มสูงตาม
    for (const nx of [CL - 60, CL - 130, CR + 60, CR + 130]) {
      const ny = front(nx) + 12, nb = ROAD_B + 6;
      if (nb - ny < 34) continue;
      c.fillStyle = '#D9BCE4';
      c.beginPath(); c.moveTo(nx - 15, nb); c.lineTo(nx - 15, ny + 15); c.arc(nx, ny + 15, 15, Math.PI, 0); c.lineTo(nx + 15, nb); c.closePath(); c.fill();
      c.fillStyle = '#B99ACE';
      c.beginPath(); c.moveTo(nx - 10, nb); c.lineTo(nx - 10, ny + 17); c.arc(nx, ny + 17, 10, Math.PI, 0); c.lineTo(nx + 10, nb); c.closePath(); c.fill();
      c.fillStyle = '#FFE680';
      star(c, nx, ny + 22, 4); c.fill();
    }
  }
  // แถบทองใต้ราวหน้า (ลายข้าวหลามตัดชมพูทอง)
  c.beginPath(); along(c, BX0, BX1, front, 0); along(c, BX1, BX0, front, 6, -8, false); c.closePath();
  c.fillStyle = '#E7B640';
  c.fill();
  for (let x = BX0 + 10; x < BX1 - 6; x += 16) {
    const y = front(x) + 3;
    c.fillStyle = (Math.round(x / 16) % 2) ? '#FF8FB3' : '#FFF4C0';
    c.beginPath(); c.moveTo(x, y - 2.4); c.lineTo(x + 3, y); c.lineTo(x, y + 2.4); c.lineTo(x - 3, y); c.closePath(); c.fill();
  }
  c.restore();
}

/** พื้นสะพาน: หินอ่อนครีมม่วง + พรมชมพูขอบทองตามแนวโค้ง */
function drawDeck(c) {
  c.save();
  c.beginPath(); along(c, BX0, BX1, top); along(c, BX1, BX0, front, 0, -8, false); c.closePath();
  c.fillStyle = lg(c, 0, DECK_Y, 0, GY + DEPTH, [[0, '#F8EEF8'], [1, '#E8D6EF']]);
  c.fill();
  c.clip();
  c.strokeStyle = 'rgba(150,110,190,.25)';
  c.lineWidth = 1;
  for (const dy of [10, 42]) { c.beginPath(); along(c, BX0, BX1, top, dy); c.stroke(); }
  for (let x = BX0 + 16; x < BX1; x += 32) {
    for (const [a, b, o] of [[0, 10, 0], [42, DEPTH, 16]]) { c.beginPath(); c.moveTo(x + o, top(x + o) + a); c.lineTo(x + o, top(x + o) + b); c.stroke(); }
  }
  // พรม
  c.beginPath(); along(c, BX0 + 20, BX1 - 20, top, 16); along(c, BX1 - 20, BX0 + 20, top, 36, -8, false); c.closePath();
  c.fillStyle = '#F08AB4';
  c.fill();
  c.strokeStyle = '#FFD45A';
  c.lineWidth = 2;
  c.beginPath(); along(c, BX0 + 20, BX1 - 20, top, 17); c.stroke();
  c.beginPath(); along(c, BX0 + 20, BX1 - 20, top, 35); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.55)';
  for (let x = BX0 + 40; x < BX1 - 30; x += 26) { heart(c, x, top(x) + 26.5, 2.6); c.fill(); }
  c.restore();
}

/** ราวลูกกรงตามโค้ง f — สูง hh · หัวเสาบัวทองทุก gap · ราวหลังจางกว่า (อยู่ไกล) */
function drawRail(c, f, hh, gap, far) {
  const a = BX0 + 8, b = BX1 - 8;
  c.save();
  c.globalAlpha = far ? 0.9 : 1;
  // ลูกกรง
  c.strokeStyle = far ? '#E6D2EE' : '#F6E6F4';
  c.lineWidth = 2.4;
  for (let x = a + 4; x < b; x += 6) { c.beginPath(); c.moveTo(x, f(x) - 1); c.lineTo(x, f(x) - hh + 4); c.stroke(); }
  c.strokeStyle = 'rgba(150,110,190,.3)';
  c.lineWidth = 0.8;
  for (let x = a + 5.5; x < b; x += 6) { c.beginPath(); c.moveTo(x, f(x) - 1); c.lineTo(x, f(x) - hh + 4); c.stroke(); }
  // คานบน
  c.strokeStyle = far ? '#EADBF2' : '#FFF8FC';
  c.lineWidth = 4.5;
  c.lineCap = 'round';
  c.beginPath(); along(c, a, b, f, -hh + 3); c.stroke();
  c.strokeStyle = '#E7B640';
  c.lineWidth = 1.4;
  c.beginPath(); along(c, a, b, f, -hh + 1); c.stroke();
  // เสา + หัวบัว
  const posts = [];
  for (let x = a; x <= b + 0.1; x += gap) posts.push(Math.min(x, b));
  for (const x of posts) {
    const y = f(x);
    c.fillStyle = far ? '#EADBF2' : '#FFF8FC';
    c.fillRect(x - 3.5, y - hh - 2, 7, hh + 2);
    c.fillStyle = 'rgba(150,110,190,.25)';
    c.fillRect(x + 1.5, y - hh - 2, 2, hh + 2);
    c.fillStyle = '#E7B640';
    c.fillRect(x - 4.5, y - hh - 4, 9, 3);
    c.beginPath(); c.moveTo(x - 4, y - hh - 4); c.quadraticCurveTo(x - 5, y - hh - 11, x, y - hh - 15); c.quadraticCurveTo(x + 5, y - hh - 11, x + 4, y - hh - 4); c.closePath(); c.fill();
    c.fillStyle = '#FFF4C0';
    c.beginPath(); c.ellipse(x - 1.2, y - hh - 9, 1.2, 2.4, 0, 0, TAU); c.fill();
  }
  c.restore();
  return posts;
}

/** พวงมาลัยห้อยระหว่างเสาราวหน้า (เว้นช่วงหนึ่ง) — มะลิขาวสลับกุหลาบชมพู ตุ้งติ้งดาวเรืองปลาย */
function drawGarlands(c, posts, f, hh) {
  for (let i = 0; i < posts.length - 1; i += 2) {
    const a = posts[i], b = posts[i + 1];
    const ya = f(a) - hh + 2, yb = f(b) - hh + 2;
    const n = 9;
    for (let k = 0; k <= n; k++) {
      const u = k / n, x = a + (b - a) * u;
      const y = ya + (yb - ya) * u + Math.sin(u * Math.PI) * 9;
      c.fillStyle = k % 3 === 1 ? '#FF8FB3' : '#FFFDF6';
      c.beginPath(); c.arc(x, y, 2.3, 0, TAU); c.fill();
    }
    const mx = (a + b) / 2, my = (ya + yb) / 2 + 9;
    c.strokeStyle = '#E7B640'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(mx, my); c.lineTo(mx, my + 7); c.stroke();
    c.fillStyle = '#FFB547';
    c.beginPath(); c.arc(mx, my + 9, 2.8, 0, TAU); c.fill();
  }
}

/** รูปปั้นแมวนั่งเฝ้าหัวสะพาน (หินอ่อน มงกุฎทอง ปลอกคอกระดิ่ง) บนแท่น */
function drawStatue(c, x, face) {
  c.fillStyle = 'rgba(80,40,110,.16)';
  c.beginPath(); c.ellipse(x, GY + 3, 28, 5, 0, 0, TAU); c.fill();
  // แท่น
  c.fillStyle = lg(c, 0, GY - 40, 0, GY, [[0, '#FFF6FB'], [1, '#EBCFE6']]);
  c.fillRect(x - 19, GY - 36, 38, 36);
  c.fillStyle = '#E7B640';
  c.fillRect(x - 22, GY - 41, 44, 6);
  c.fillRect(x - 22, GY - 5, 44, 5);
  c.fillStyle = '#F7B7D0';
  c.beginPath(); c.roundRect(x - 12, GY - 30, 24, 20, 4); c.fill();
  c.fillStyle = '#FFFFFF';
  c.beginPath(); c.ellipse(x, GY - 17, 4, 3.2, 0, 0, TAU); c.fill();
  for (const [dx, dy] of [[-4.4, -5], [0, -7.2], [4.4, -5]]) { c.beginPath(); c.arc(x + dx, GY - 17 + dy, 1.7, 0, TAU); c.fill(); }
  // ตัวแมวนั่ง
  const b = GY - 41;
  c.save();
  c.translate(x, 0);
  c.scale(face, 1);
  const stone = lg(c, -20, 0, 22, 0, [[0, '#E9D6EA'], [0.55, '#FFF8F4'], [1, '#F4E4EE']]);
  // หางพันหน้าตัก
  c.strokeStyle = '#EBD9EC'; c.lineWidth = 7; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-14, b - 4); c.quadraticCurveTo(-24, b - 10, -18, b - 22); c.stroke();
  c.fillStyle = stone;
  c.beginPath(); c.ellipse(0, b - 22, 17, 22, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(-2, b - 4, 19, 6, 0, 0, TAU); c.fill();
  // ขาหน้า
  c.fillStyle = '#FFF8F4';
  for (const dx of [-6, 6]) { c.beginPath(); c.roundRect(dx - 4, b - 22, 8, 20, 4); c.fill(); }
  // หัว
  const hy = b - 52;
  ears(c, 3, hy - 9, 9, 8, '#F7EAF0', '#FFC9D4');
  c.fillStyle = stone;
  c.beginPath(); c.ellipse(3, hy, 15, 13.5, 0, 0, TAU); c.fill();
  catFace(c, 4, hy + 1, 12, true, '#9C80D8');
  // ปลอกคอทอง + กระดิ่ง
  c.strokeStyle = '#E7B640'; c.lineWidth = 3;
  c.beginPath(); c.arc(2, hy + 4, 13, Math.PI * 0.2, Math.PI * 0.8); c.stroke();
  c.fillStyle = '#FFD45A';
  c.beginPath(); c.arc(2, hy + 17, 3.2, 0, TAU); c.fill();
  // มงกุฎทองเล็ก
  c.fillStyle = '#FFD45A';
  c.beginPath(); c.moveTo(-5, hy - 12); c.lineTo(-6, hy - 19); c.lineTo(-1.5, hy - 15.5); c.lineTo(3, hy - 21); c.lineTo(7.5, hy - 15.5); c.lineTo(12, hy - 19); c.lineTo(11, hy - 12); c.closePath(); c.fill();
  c.fillStyle = '#FF8FB3';
  c.beginPath(); c.arc(3, hy - 15, 1.6, 0, TAU); c.fill();
  c.restore();
}

/** ธงราวสามเหลี่ยมจากชายคาศาลาลงหาหัวรูปปั้น (หย่อนกลาง) */
function drawBunting(c) {
  const cols = ['#FF8FB3', '#FFD45A', '#C8A8F5', '#8EE0C2', '#9FD3FF'];
  for (const [ax, ay, bx, by] of [[STATUES[0].x + 4, GY - 104, SX - SALA.low.w0 + 4, EAVE + 4], [SX + SALA.low.w0 - 4, EAVE + 4, STATUES[1].x - 4, GY - 104]]) {
    const pt = (u) => [ax + (bx - ax) * u, ay + (by - ay) * u + Math.sin(u * Math.PI) * 30];
    c.strokeStyle = 'rgba(140,100,170,.6)'; c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i <= 24; i++) { const [x, y] = pt(i / 24); i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke();
    for (let i = 1; i < 16; i++) {
      const [x, y] = pt(i / 16), [x2, y2] = pt((i + 0.45) / 16);
      c.fillStyle = cols[i % cols.length];
      c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.lineTo((x + x2) / 2, (y + y2) / 2 + 11); c.closePath(); c.fill();
    }
  }
}

function drawBody(c) {
  drawBunting(c);
  drawRail(c, top, 24, 40, true);      // ราวหลัง (อยู่หลังตัวน้อง ยังไม่บัง)
  drawDeck(c);
  drawFace(c, 'land');
  const posts = drawRail(c, front, 22, 36, false);
  drawGarlands(c, posts, front, 22);
  for (const s of STATUES) drawStatue(c, s.x, s.face);
}

// ── ศาลา ──────────────────────────────────────────────────────
/** เสาศาลา (โคนทอง ทาสีครีม หัวเสาทอง คันทวยโค้ง) จาก y0 (ใต้ชายคา) ถึง y1 */
function salaPost(c, x, y0, y1, near) {
  c.fillStyle = lg(c, x - 5, 0, x + 5, 0, [[0, near ? '#FFF8FC' : '#EEDDF2'], [1, near ? '#F0D8EA' : '#DCC6E6']]);
  c.fillRect(x - (near ? 5 : 4), y0, near ? 10 : 8, y1 - y0);
  c.fillStyle = '#E7B640';
  c.fillRect(x - 6, y1 - 9, 12, 9);
  c.fillRect(x - 6, y0 + 2, 12, 5);
  c.fillStyle = '#FF8FB3';
  c.fillRect(x - 6, y1 - 12, 12, 3);
  // คันทวยสองข้างหัวเสา
  c.strokeStyle = '#E7B640'; c.lineWidth = 2.2; c.lineCap = 'round';
  for (const d of [-1, 1]) { c.beginPath(); c.moveTo(x + d * 4, y0 + 18); c.quadraticCurveTo(x + d * 14, y0 + 14, x + d * 15, y0 + 3); c.stroke(); }
}

/** หางแมวทองม้วนปลาย (ช่อฟ้า / หางหงส์) จาก (x,y) ชี้ทาง d (−1 ซ้าย · 1 ขวา) ยาว s */
function catTail(c, x, y, d, s) {
  c.strokeStyle = '#E7B640'; c.lineWidth = s * 0.2; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + d * s * 0.5, y - s * 0.1, x + d * s * 0.7, y - s * 0.75, x + d * s * 0.35, y - s * 0.95); c.stroke();
  c.fillStyle = '#FFD45A';
  c.beginPath(); c.arc(x + d * s * 0.35, y - s * 0.95, s * 0.16, 0, TAU); c.fill();
}

/** หลังคาชั้นหนึ่ง: คางหมู ฐานกว้าง w0 ที่ y0 → บนกว้าง w1 ที่ y1 · กระเบื้องเกล็ดสองโทน · ลำยองทอง ใบระกา */
function roofTier(c, w0, y0, w1, y1, colA, colB) {
  c.save();
  c.beginPath(); c.moveTo(SX - w0, y0); c.lineTo(SX - w1, y1); c.lineTo(SX + w1, y1); c.lineTo(SX + w0, y0); c.closePath();
  c.fillStyle = colA;
  c.fill();
  c.clip();
  for (let y = y1 + 3, r = 0; y < y0 + 4; y += 6, r++) {
    c.fillStyle = r % 2 ? colB : colA;
    for (let x = SX - w0 - 10 + (r % 2) * 5; x < SX + w0 + 10; x += 10) { c.beginPath(); c.arc(x, y, 5.2, 0, Math.PI); c.fill(); }
  }
  c.fillStyle = 'rgba(255,255,255,.14)';
  c.fillRect(SX - w0, y1, w0 * 2, 3);
  c.restore();
  // ลำยอง (ขอบเอียงสองข้าง) + ใบระกาฟันเลื่อย
  c.strokeStyle = '#E7B640'; c.lineWidth = 3; c.lineCap = 'round';
  for (const d of [-1, 1]) {
    c.beginPath(); c.moveTo(SX + d * w0, y0); c.lineTo(SX + d * w1, y1); c.stroke();
    c.fillStyle = '#FFD45A';
    for (let k = 1; k < 5; k++) {
      const u = k / 5, x = SX + d * (w0 + (w1 - w0) * u), y = y0 + (y1 - y0) * u;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + d * 6, y - 2); c.lineTo(x + d * 2, y - 5); c.closePath(); c.fill();
    }
  }
  // เชิงชายทอง + กระจังเรียง
  c.fillStyle = '#E7B640';
  c.fillRect(SX - w0 - 2, y0, w0 * 2 + 4, 5);
  c.fillStyle = '#FFE680';
  for (let x = SX - w0 + 4; x < SX + w0 - 2; x += 9) { c.beginPath(); c.moveTo(x - 3, y0); c.lineTo(x, y0 - 5); c.lineTo(x + 3, y0); c.closePath(); c.fill(); }
}

function drawSalaBack(c) {
  const { posts, low, up } = SALA;
  const fy = DECK_Y + DEPTH;
  // พื้นไม้ขัดเงาในศาลา
  c.fillStyle = lg(c, 0, DECK_Y, 0, fy, [[0, '#C98E62'], [1, '#B07448']]);
  c.beginPath(); c.moveTo(SX - 112, DECK_Y); c.lineTo(SX + 112, DECK_Y); c.lineTo(SX + 118, fy - 4); c.lineTo(SX - 118, fy - 4); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(90,50,20,.25)'; c.lineWidth = 1;
  for (let y = DECK_Y + 9; y < fy - 4; y += 9) { c.beginPath(); c.moveTo(SX - 114, y); c.lineTo(SX + 114, y); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.18)';
  c.fillRect(SX - 60, DECK_Y + 4, 120, 3);
  c.fillStyle = '#E7B640';
  c.fillRect(SX - 118, fy - 5, 236, 3);
  // เสาหลัง
  for (const px of posts) salaPost(c, SX + px, EAVE + 6, DECK_Y, false);
  // ตั่งไม้ขาโค้ง เบาะชมพู (นั่งได้ — bench3 ใน layout.js)
  const by = DECK_Y;
  c.fillStyle = '#8E4E2C';
  for (const d of [-1, 1]) {
    c.beginPath(); c.moveTo(SX + d * 30, by - 20); c.quadraticCurveTo(SX + d * 36, by - 8, SX + d * 32, by); c.lineTo(SX + d * 27, by); c.quadraticCurveTo(SX + d * 30, by - 10, SX + d * 25, by - 20); c.closePath(); c.fill();
  }
  c.fillStyle = '#A8643C';
  c.beginPath(); c.roundRect(SX - 36, by - 26, 72, 8, 3); c.fill();
  c.fillStyle = '#E7B640';
  c.fillRect(SX - 36, by - 19, 72, 2);
  c.fillStyle = '#FFB3CF';
  c.beginPath(); c.roundRect(SX - 32, by - 30, 64, 5, 2.5); c.fill();
  // ระบายชมพูใต้ชายคา (เป็นลอนระหว่างเสา)
  c.fillStyle = '#FF9CC0';
  for (let x = SX - low.w0 + 6; x < SX + low.w0 - 6; x += 12) { c.beginPath(); c.arc(x + 6, EAVE + 5, 6, 0, Math.PI); c.fill(); }
  c.fillStyle = '#FFFFFF';
  for (let x = SX - low.w0 + 12; x < SX + low.w0 - 6; x += 12) { c.beginPath(); c.arc(x, EAVE + 9, 1.4, 0, TAU); c.fill(); }
  // หลังคาสองชั้น + หางหงส์ + ช่อฟ้า + หน้าบันตราหน้าแมว
  roofTier(c, low.w0, EAVE, low.w1, EAVE - low.rise, '#8C6AD6', '#7B58C8');
  for (const d of [-1, 1]) catTail(c, SX + d * low.w0, EAVE + 2, d, 20);
  roofTier(c, up.w0, EAVE - 20, up.w1, up.top, '#A98AE8', '#9A7ADF');
  for (const d of [-1, 1]) catTail(c, SX + d * up.w0, EAVE - 18, d, 16);
  c.fillStyle = '#E7B640';
  c.fillRect(SX - up.w1 - 3, up.top - 4, (up.w1 + 3) * 2, 5);
  for (const d of [-1, 1]) catTail(c, SX + d * (up.w1 + 2), up.top - 2, d, 26);
  const ey = EAVE - 38;
  c.fillStyle = '#E7B640';
  c.beginPath(); c.arc(SX, ey, 14, 0, TAU); c.fill();
  ears(c, SX, ey - 9, 8, 7, '#E7B640', '#FFC9D4');
  c.fillStyle = '#FFE9F3';
  c.beginPath(); c.arc(SX, ey, 11, 0, TAU); c.fill();
  catFace(c, SX, ey + 1, 10, true, '#7A4BB8');
  for (const d of [-1, 1]) { c.fillStyle = '#FFE680'; star(c, SX + d * 30, ey + 2, 4.5); c.fill(); }
}

function drawSalaFront(c) {
  for (const px of SALA.posts) salaPost(c, SX + px, EAVE + 7, DECK_Y + DEPTH - 8, true);
}

// ── วาด ────────────────────────────────────────────────────────
const inView = (camX, vw) => BX1 + 80 > camX && BX0 - 80 < camX + vw;
const BODY = { x: BX0 - 70, y: EAVE - 10, w: BX1 - BX0 + 140, h: H - EAVE + 10 };
const SALA_BOX = { x: SX - 180, y: SALA.up.top - 40, w: 360, h: DECK_Y + DEPTH - SALA.up.top + 40 };

/** น้ำใต้ซุ้มสะพาน + เงาสะท้อนหน้าสะพานในแม่น้ำหน้าเมือง (สด — ก่อนเรือ ก่อนตัวสะพาน) */
export function drawBridgeWater(c, camX, vw, t) {
  if (!inView(camX, vw)) return;
  c.save();
  // ประกายวิบวับในร่องน้ำ
  c.strokeStyle = 'rgba(255,255,255,.6)';
  c.lineWidth = 1.5;
  c.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const x = CL + 30 + ((i * 53 + t * 0.4) % (CR - CL - 60));
    const y = ARCH.cy - 6 + (i % 4) * 9;
    const w = 6 + (i % 3) * 4;
    c.globalAlpha = 0.35 + 0.35 * Math.sin(t * 0.07 + i);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.stroke();
  }
  // เงาสะท้อนโค้งซุ้ม (กลับหัว ไหววูบวาบ)
  c.globalAlpha = 0.35;
  c.strokeStyle = '#F3D9EC';
  c.lineWidth = 2.5;
  c.beginPath();
  for (let a = 0; a <= 1.001; a += 0.05) {
    const x = ARCH.cx - ARCH.rx + 2 * ARCH.rx * a;
    const y = ROAD_B + 22 + Math.sin(a * Math.PI) * 10 + Math.sin(t * 0.08 + a * 9) * 1.3;
    a ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.stroke();
  // เงาสะท้อนผนังทางลาดในแม่น้ำหน้าเมือง
  c.globalAlpha = 1;
  for (const [a, b] of [[BX0 + 30, CL - 14], [CR + 14, BX1 - 30]]) {
    for (let y = ROAD_B + 18; y < H; y += 4) {
      const wob = Math.sin(t * 0.06 + y * 0.7) * 3;
      c.fillStyle = `rgba(255,236,248,${0.28 - (y - ROAD_B - 18) * 0.008})`;
      c.fillRect(a + wob, y, b - a, 2);
    }
  }
  c.restore();
}

/** ตัวสะพาน + ศาลา (หลังตัวน้อง) */
export function drawBridge(c, camX, vw) {
  if (!inView(camX, vw)) return;
  cached(c, 'bridge', BODY.x, BODY.y, BODY.w, BODY.h, (cc) => { drawBody(cc); light(cc, BODY.x, BODY.y, BODY.w, BODY.h); });
  if (SALA_BOX.x + SALA_BOX.w > camX && SALA_BOX.x < camX + vw) {
    cached(c, 'sala', SALA_BOX.x, SALA_BOX.y, SALA_BOX.w, SALA_BOX.h, drawSalaBack);
  }
}

/** ช่วงข้ามน้ำของหน้าสะพาน (ซุ้มโค้ง เสาตอม่อ) — วาดหลังเรือ เรือจึงลอดใต้ซุ้ม/หลังเสา */
const ARCH_BOX = { x: AL - 4, y: DECK_Y + DEPTH - 8, w: AR - AL + 8, h: H - DECK_Y - DEPTH + 8 };
export function drawBridgeArch(c, camX, vw) {
  if (!inView(camX, vw)) return;
  cached(c, 'bridgeArch', ARCH_BOX.x, ARCH_BOX.y, ARCH_BOX.w, ARCH_BOX.h, (cc) => { drawFace(cc, 'arch'); light(cc, BODY.x, BODY.y, BODY.w, BODY.h); });
}

/** เสาหน้าศาลา + โคมห้อย (ทับตัวน้อง — เดินลอดใต้ศาลาแล้วผ่านหลังเสา) */
export function drawBridgeFront(c, camX, vw, t) {
  if (!(SALA_BOX.x + SALA_BOX.w > camX && SALA_BOX.x < camX + vw)) return;
  cached(c, 'salaF', SX - 110, EAVE, 220, DECK_Y + DEPTH - EAVE, drawSalaFront);
  // โคมกระดาษชมพูห้อยใต้ชายคา (แกว่งเบา ๆ) + กระดิ่งทองที่มุม
  for (const [dx, len, kind] of [[-66, 20, 0], [66, 20, 0], [-124, 10, 1], [124, 10, 1]]) {
    const ax = SX + dx, ay = EAVE + 7;
    const sw = Math.sin(t * 0.05 + dx) * 0.12;
    const lx = ax + Math.sin(sw) * len, ly = ay + Math.cos(sw) * len;
    c.strokeStyle = '#B08A3A'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(lx, ly); c.stroke();
    if (kind === 0) {
      const g = c.createRadialGradient(lx, ly + 8, 1, lx, ly + 8, 18);
      g.addColorStop(0, 'rgba(255,220,150,.5)'); g.addColorStop(1, 'rgba(255,220,150,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(lx, ly + 8, 18, 0, TAU); c.fill();
      c.fillStyle = '#E7B640';
      c.fillRect(lx - 4, ly, 8, 2.5);
      c.fillStyle = '#FF8FB3';
      c.beginPath(); c.ellipse(lx, ly + 9, 7, 8, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.4)';
      c.beginPath(); c.ellipse(lx - 2.5, ly + 7, 2, 4, 0, 0, TAU); c.fill();
      c.fillStyle = '#E7B640';
      c.fillRect(lx - 3, ly + 16, 6, 2);
      c.strokeStyle = '#FFD45A'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(lx, ly + 18); c.lineTo(lx, ly + 25); c.stroke();
    } else {
      c.fillStyle = '#FFD45A';
      c.beginPath(); c.moveTo(lx - 4, ly + 7); c.quadraticCurveTo(lx, ly - 2, lx + 4, ly + 7); c.closePath(); c.fill();
      c.beginPath(); c.arc(lx, ly + 8, 1.4, 0, TAU); c.fill();
    }
  }
}
