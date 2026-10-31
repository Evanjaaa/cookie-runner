// src/town/route-map.js
// ─────────────────────────────────────────────────────────────
// แผนที่เมืองย่อส่วน — หน้าเลือกจุดแวะของเรือ (ผู้ใช้ 31 ต.ค. — แรงบันดาลใจจากแผนที่สวนสนุก)
//   เมืองทั้งเมืองย่อเป็นแถบยาวมินิมอล (เลื่อนซ้าย-ขวาได้) · แม่น้ำด้านล่างให้เรือแล่น · ลำน้ำสาขาลอดใต้สะพานศาลา
//   ทางเดินเลี้ยวผ่านทุกที่ · สถานที่จิ๋ว 12 จุดหน้าตาตามของจริงในเมือง · ต้นไม้ ดอกไม้ เป็ด ใบบัว
// ภาพนิ่ง (drawMapArt) วาดครั้งเดียวต่อขนาดจอ · ชั้นสด (drawMapLive) = เรือ "อยู่ที่นี่" โยก + เส้นทางเรือเส้นประวิ่ง + ประกายน้ำ
// ปุ่ม/ป้ายชื่อ/หมุดเลขเป็น HTML ทับแผนที่ (main.js) — ตำแหน่งจาก mapX() ชุดเดียวกัน
// หน่วย: พิกัดออกแบบ MAP_H สูง 250 · กว้าง mapW() · ผู้เรียกย่อ/ขยายทั้งก้อนตามความสูงจอ
// ─────────────────────────────────────────────────────────────
import { BOAT_STOPS } from './layout.js';

const TAU = Math.PI * 2;
export const MAP_H = 250;
const GAP = 128, PAD = 78;
export const PATH_Y = 150;     // แนวทางเดิน (ฐานสถานที่อยู่เหนือทาง)
export const BASE_Y = 132;     // ฐานรูปสถานที่
export const RIVER_Y = 200;    // ขอบบนแม่น้ำ
export const BOAT_Y = 224;     // แนวเรือ/เส้นทางเรือบนแม่น้ำ
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** คำบอกว่าแต่ละที่คือที่ไหน มีอะไร (แสดงในช่องข้อมูลใต้แผนที่) */
export const STOP_INFO = {
  food: 'ของกินอร่อย ๆ ให้น้องแมว',
  care: 'ยาและของดูแลน้อง',
  home: 'อัปเกรดบ้านลูกเหมียว',
  pierA: 'ท่าเรือย่านร้านค้า จุดขึ้น-ลงเรือ',
  fountain: 'น้ำพุสามชั้นแมวสวมมงกุฎ กระโดดลงเล่นน้ำได้',
  swing: 'ชิงช้า คอนโดแมว แทรมโพลีน กล่องกระดาษ',
  sala: 'ศาลาไทยกลางสะพานข้ามแม่น้ำ นั่งพักชมวิว',
  gardenGate: 'ประตูวาปไปสวนดอกไม้ในฝัน เก็บดอกไม้ ถ่ายรูป',
  toy: 'ของเล่นน้องแมว',
  exchange: 'แลกค่าขนมเป็นทอง',
  pierB: 'ท่าเรือฝั่งปราสาท ใกล้ดินแดนปราสาท',
  castle: 'ดินแดนปราสาทแมวเหมียว (เปิดเร็ว ๆ นี้)',
};

/** ตำแหน่งแนวนอนของจุดแวะบนแผนที่ (เรียงตามเมือง เว้นเท่า ๆ กัน — แผนที่มินิมอล ไม่ต้องตรงสัดส่วนจริง) */
export function mapX(id) { return PAD + BOAT_STOPS.findIndex((s) => s.id === id) * GAP + GAP / 2; }
export function mapW() { return PAD * 2 + BOAT_STOPS.length * GAP; }
const pathY = (x) => PATH_Y + Math.sin(x / 95) * 5;

// ── ภาพนิ่ง ──────────────────────────────────────────────────
export function drawMapArt(c) {
  const W = mapW(), H = MAP_H;
  // พื้นหญ้า + ปื้นหญ้าอ่อน
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#B9E6AA'); g.addColorStop(1, '#A3D99C');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(255,255,255,.18)';
  for (let i = 0; i < W / 70; i++) { c.beginPath(); c.ellipse(hash(i) * W, 60 + hash(i + 7) * 120, 40 + hash(i + 3) * 40, 10 + hash(i + 5) * 8, 0, 0, TAU); c.fill(); }
  const sala = mapX('sala');
  // ลำน้ำสาขา (ไหลลงมาลอดใต้สะพานศาลา)
  c.fillStyle = '#8ED0F6';
  c.beginPath();
  c.moveTo(sala - 15, 0); c.bezierCurveTo(sala - 30, 60, sala - 6, 120, sala - 24, RIVER_Y + 4);
  c.lineTo(sala + 24, RIVER_Y + 4); c.bezierCurveTo(sala + 10, 120, sala + 34, 60, sala + 15, 0);
  c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.4; c.lineCap = 'round';
  for (let y = 16; y < RIVER_Y; y += 22) { c.beginPath(); c.moveTo(sala - 6, y); c.lineTo(sala + 4, y); c.stroke(); }
  // แถวต้นไม้ด้านบน (ต้นกลม + ซากุระ) — เว้นช่องลำน้ำ
  for (let i = 0; i < W / 30; i++) {
    const x = i * 30 + hash(i * 3.1) * 14, y = 16 + hash(i * 1.7) * 26;
    if (Math.abs(x - sala) < 40) continue;
    tree(c, x, y, 11 + hash(i * 2.3) * 5, hash(i * 4.4) < 0.25);
  }
  // แม่น้ำหลัก (ขอบบนเป็นคลื่น) + คลื่น + ใบบัว + เป็ด
  const rg = c.createLinearGradient(0, RIVER_Y, 0, H);
  rg.addColorStop(0, '#A5DEFB'); rg.addColorStop(1, '#6CBDEB');
  c.fillStyle = '#7FB88A';
  c.beginPath(); c.moveTo(0, RIVER_Y - 4);
  for (let x = 0; x <= W; x += 20) c.lineTo(x, RIVER_Y - 4 + Math.sin(x / 40) * 2);
  c.lineTo(W, RIVER_Y + 6); c.lineTo(0, RIVER_Y + 6); c.closePath(); c.fill();
  c.fillStyle = rg;
  c.beginPath(); c.moveTo(0, RIVER_Y);
  for (let x = 0; x <= W; x += 20) c.lineTo(x, RIVER_Y + Math.sin(x / 40) * 2);
  c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.6;
  for (let i = 0; i < W / 46; i++) { const x = i * 46 + hash(i) * 20, y = 214 + hash(i + 9) * 30; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 6, y - 3, x + 12, y); c.stroke(); }
  for (let i = 0; i < W / 160; i++) {
    const x = 60 + i * 160 + hash(i * 5) * 60, y = 232 + hash(i * 6) * 10;
    c.fillStyle = '#7FCB8C';
    c.beginPath(); c.ellipse(x, y, 9, 4, 0, 0.3, TAU - 0.2); c.lineTo(x, y); c.closePath(); c.fill();
    if (i % 2) { c.fillStyle = '#FFB5CF'; c.beginPath(); c.arc(x + 3, y - 2, 2.6, 0, TAU); c.fill(); }
  }
  for (const dx of [0.33, 0.71]) duck(c, W * dx, 240);
  // ทางเดิน (ขอบ + ผิว) + ทางแยกขึ้นไปหน้าแต่ละที่
  c.lineCap = 'round'; c.lineJoin = 'round';
  const road = () => { c.beginPath(); c.moveTo(14, pathY(14)); for (let x = 14; x <= W - 14; x += 8) c.lineTo(x, pathY(x)); };
  c.strokeStyle = '#E2C29A'; c.lineWidth = 17; road(); c.stroke();
  for (const s of BOAT_STOPS) { const x = mapX(s.id); c.beginPath(); c.moveTo(x, pathY(x)); c.lineTo(x, BASE_Y - 2); c.stroke(); }
  c.strokeStyle = '#F6E4C8'; c.lineWidth = 12; road(); c.stroke();
  for (const s of BOAT_STOPS) { const x = mapX(s.id); c.beginPath(); c.moveTo(x, pathY(x)); c.lineTo(x, BASE_Y - 2); c.stroke(); }
  c.setLineDash([3, 9]); c.strokeStyle = 'rgba(214,180,140,.7)'; c.lineWidth = 1.6; road(); c.stroke(); c.setLineDash([]);
  // ท่าเรือ: ทางไม้ลงแม่น้ำ (ข้างตัวศาลา)
  for (const id of ['pierA', 'pierB']) {
    const x = mapX(id) + 34;
    c.fillStyle = '#B98154';
    c.fillRect(x - 7, pathY(x) + 2, 14, RIVER_Y + 14 - pathY(x));
    c.fillStyle = '#D9A26C';
    for (let y = pathY(x) + 4; y < RIVER_Y + 14; y += 5) c.fillRect(x - 6, y, 12, 3.4);
    c.fillStyle = '#7A4E30';
    c.fillRect(x - 8, RIVER_Y + 12, 3, 8); c.fillRect(x + 5, RIVER_Y + 12, 3, 8);
  }
  // ดอกไม้จุด ๆ บนหญ้า (เว้นรอบสถานที่)
  const cols = ['#FF9CC4', '#FFFFFF', '#FFE27A', '#C9AEF7', '#9FD6FA'];
  for (let i = 0; i < W / 9; i++) {
    const x = hash(i * 1.3) * W, y = 52 + hash(i * 2.7) * 140;
    if (Math.abs(y - pathY(x)) < 10) continue;
    if (BOAT_STOPS.some((s) => Math.abs(x - mapX(s.id)) < 46 && y < BASE_Y + 6)) continue;
    c.fillStyle = cols[i % 5];
    c.beginPath(); c.arc(x, y, 1.8, 0, TAU); c.fill();
  }
  // ซุ้มต้นเมือง / ปลายเมือง
  archGate(c, 34, '#FF9CC0', 'เมืองแมวเหมียว');
  archGate(c, W - 34, '#C9A0E6', 'แล้วพบกันใหม่');
  // สถานที่ (ลำน้ำศาลาวาดแล้ว — ศาลาอยู่บนสะพาน)
  for (const s of BOAT_STOPS) LANDMARK[s.id]?.(c, mapX(s.id), BASE_Y);
}

// ── ของประกอบ ────────────────────────────────────────────────
function tree(c, x, y, r, pink) {
  c.fillStyle = 'rgba(60,110,70,.18)';
  c.beginPath(); c.ellipse(x + 2, y + r * 0.9, r * 0.9, r * 0.35, 0, 0, TAU); c.fill();
  c.fillStyle = pink ? '#FFB8D6' : '#7DC688';
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.fillStyle = pink ? '#FFD3E6' : '#95D69A';
  c.beginPath(); c.arc(x - r * 0.25, y - r * 0.25, r * 0.6, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.3)';
  c.beginPath(); c.arc(x - r * 0.4, y - r * 0.45, r * 0.22, 0, TAU); c.fill();
}
function duck(c, x, y) {
  c.fillStyle = '#FFFFFF';
  c.beginPath(); c.ellipse(x, y, 7, 4.5, 0, 0, TAU); c.fill();
  c.beginPath(); c.arc(x + 5, y - 5, 3.4, 0, TAU); c.fill();
  c.fillStyle = '#FFB13D';
  c.beginPath(); c.moveTo(x + 8, y - 5); c.lineTo(x + 11, y - 4); c.lineTo(x + 8, y - 3); c.fill();
}
function shadow(c, x, y, w) {
  c.fillStyle = 'rgba(50,90,60,.22)';
  c.beginPath(); c.ellipse(x, y + 2, w, 6, 0, 0, TAU); c.fill();
}
function rr(c, x, y, w, h, r, col) { c.fillStyle = col; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); }
function door(c, x, y, w, h, col) { c.fillStyle = col; c.beginPath(); c.roundRect(x - w / 2, y - h, w, h, [w / 2, w / 2, 1, 1]); c.fill(); }
function win(c, x, y, col = '#FFF1C9') { c.fillStyle = col; c.beginPath(); c.roundRect(x - 4, y - 5, 8, 10, [4, 4, 1, 1]); c.fill(); }
function catEars(c, x, y, gap, size, col) {
  c.fillStyle = col;
  for (const d of [-1, 1]) { c.beginPath(); c.moveTo(x + d * gap - size * 0.6, y + 2); c.lineTo(x + d * gap, y - size); c.lineTo(x + d * gap + size * 0.6, y + 2); c.closePath(); c.fill(); }
}
function archGate(c, x, col, text) {
  const y = pathY(x);
  c.strokeStyle = col; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - 18, y + 4); c.lineTo(x - 18, y - 30); c.arc(x, y - 30, 18, Math.PI, 0); c.lineTo(x + 18, y + 4); c.stroke();
  for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; c.fillStyle = ['#FFFFFF', '#FFE27A', '#FF8FB3'][i % 3]; c.beginPath(); c.arc(x + Math.cos(a) * 18, y - 30 + Math.sin(a) * 18, 2.4, 0, TAU); c.fill(); }
  c.font = '700 8.5px Mali, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const w = c.measureText(text).width + 10;
  rr(c, x - w / 2, y - 62, w, 13, 6.5, '#FFF9EC');
  c.fillStyle = '#8A4BB8'; c.fillText(text, x, y - 55.5);
}

// ── สถานที่จิ๋ว (ฐานกลาง x, y) — หน้าตาตามของจริงในเมือง ──
const LANDMARK = {
  food(c, x, y) {   // ร้านขนมปัง: ผนังครีม โดมขนมปัง กันสาดชมพู
    shadow(c, x, y, 34);
    rr(c, x - 28, y - 38, 56, 38, 4, '#FFF3E3');
    c.fillStyle = '#D99A5B'; c.beginPath(); c.ellipse(x, y - 38, 32, 22, 0, Math.PI, TAU); c.fill();
    c.fillStyle = '#F2C38A'; c.beginPath(); c.ellipse(x, y - 40, 26, 15, 0, Math.PI, TAU); c.fill();
    c.strokeStyle = '#C47E3E'; c.lineWidth = 2; for (const d of [-10, 0, 10]) { c.beginPath(); c.moveTo(x + d - 4, y - 50); c.lineTo(x + d + 4, y - 44); c.stroke(); }
    for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#FFFFFF' : '#FF8FB3'; c.beginPath(); c.moveTo(x - 30 + i * 10, y - 30); c.lineTo(x - 20 + i * 10, y - 30); c.lineTo(x - 25 + i * 10, y - 23); c.closePath(); c.fill(); }
    door(c, x + 12, y, 12, 18, '#C46A8E'); win(c, x - 12, y - 12);
  },
  care(c, x, y) {   // ร้านยา: ผนังม่วง หลังคาหมวกแม่มด หม้อยาเขียว
    shadow(c, x, y, 32);
    rr(c, x - 24, y - 36, 48, 36, 4, '#E6D8FA');
    c.fillStyle = '#7A5BB0'; c.beginPath(); c.ellipse(x + 2, y - 36, 34, 7, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(x - 18, y - 38); c.quadraticCurveTo(x - 2, y - 58, x + 14, y - 74); c.quadraticCurveTo(x + 8, y - 54, x + 22, y - 38); c.closePath(); c.fill();
    c.fillStyle = '#FFD45A'; c.fillRect(x - 16, y - 44, 36, 4);
    c.fillStyle = '#4C9E62'; c.beginPath(); c.arc(x - 26, y - 6, 9, 0, TAU); c.fill();
    c.fillStyle = '#8CF0A8'; for (const [dx, dy] of [[-2, -14], [3, -19], [-5, -22]]) { c.beginPath(); c.arc(x - 26 + dx, y + dy, 2.2, 0, TAU); c.fill(); }
    door(c, x + 8, y, 12, 18, '#6E4CB8'); win(c, x - 8, y - 14);
  },
  home(c, x, y) {   // ร้านอัปเกรด: บ้านไม้ หลังคาจั่วน้ำตาล ปล่องไฟ ป้ายเฟือง
    shadow(c, x, y, 34);
    rr(c, x - 28, y - 34, 56, 34, 3, '#C88752');
    c.fillStyle = 'rgba(90,50,20,.25)'; for (let yy = y - 28; yy < y; yy += 7) c.fillRect(x - 28, yy, 56, 1.2);
    rr(c, x - 22, y - 70, 9, 22, 2, '#7C7C86');
    c.fillStyle = '#8A5234'; c.beginPath(); c.moveTo(x - 34, y - 32); c.lineTo(x, y - 62); c.lineTo(x + 34, y - 32); c.closePath(); c.fill();
    c.fillStyle = '#B0B4BE'; c.beginPath(); c.arc(x, y - 44, 8, 0, TAU); c.fill();
    c.fillStyle = '#8A5234'; c.beginPath(); c.arc(x, y - 44, 3.4, 0, TAU); c.fill();
    door(c, x + 12, y, 12, 18, '#5E3A22');
    c.fillStyle = '#FF9A3D'; c.beginPath(); c.arc(x - 12, y - 8, 6, Math.PI, 0); c.fill();
  },
  pierA(c, x, y) { pierIcon(c, x, y); },
  pierB(c, x, y) { pierIcon(c, x, y); },
  fountain(c, x, y) {   // ลานน้ำพุ: ลานวงรี น้ำพุสามชั้น แมวมงกุฎ
    c.fillStyle = '#EADCFB'; c.beginPath(); c.ellipse(x, y - 2, 42, 10, 0, 0, TAU); c.fill();
    rr(c, x - 30, y - 18, 60, 16, 7, '#F7F0FF');
    c.fillStyle = '#8FD3F7'; c.beginPath(); c.ellipse(x, y - 18, 28, 5, 0, 0, TAU); c.fill();
    rr(c, x - 4, y - 40, 8, 22, 2, '#E9DDFB');
    c.fillStyle = '#F7F0FF'; c.beginPath(); c.ellipse(x, y - 40, 16, 4.5, 0, 0, TAU); c.fill();
    c.fillStyle = '#8FD3F7'; c.beginPath(); c.ellipse(x, y - 40, 12, 3, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(160,214,255,.9)'; c.lineWidth = 2;
    for (const d of [-1, 1]) { c.beginPath(); c.moveTo(x + d * 14, y - 40); c.quadraticCurveTo(x + d * 24, y - 36, x + d * 22, y - 20); c.stroke(); }
    c.fillStyle = '#F6EEFF'; c.beginPath(); c.arc(x, y - 52, 6, 0, TAU); c.fill(); catEars(c, x, y - 56, 4, 4, '#F6EEFF');
    c.fillStyle = '#FFD45A'; c.beginPath(); c.moveTo(x - 4, y - 59); c.lineTo(x - 4, y - 63); c.lineTo(x - 1.5, y - 61); c.lineTo(x, y - 64); c.lineTo(x + 1.5, y - 61); c.lineTo(x + 4, y - 63); c.lineTo(x + 4, y - 59); c.closePath(); c.fill();
  },
  swing(c, x, y) {   // สนามเด็กเล่น: ชิงช้าม่วง คอนโดแมว แทรมโพลีน
    shadow(c, x, y, 40);
    c.strokeStyle = '#8C6AD6'; c.lineWidth = 3.4; c.lineCap = 'round';
    for (const lx of [x - 4, x + 26]) { c.beginPath(); c.moveTo(lx - 7, y); c.lineTo(lx, y - 44); c.lineTo(lx + 7, y); c.stroke(); }
    rr(c, x - 8, y - 48, 38, 5, 2.5, '#A98AE8');
    c.strokeStyle = '#B08A6A'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 6, y - 44); c.lineTo(x + 6, y - 16); c.moveTo(x + 16, y - 44); c.lineTo(x + 16, y - 16); c.stroke();
    rr(c, x + 3, y - 17, 16, 4, 2, '#FF8FB3');
    rr(c, x - 33, y - 52, 4, 52, 1, '#C9A27E');
    for (const [yy, col] of [[-16, '#FF9CC0'], [-32, '#9FD3FF'], [-48, '#FFE27A']]) rr(c, x - 42, y + yy, 22, 5, 2.5, col);
    rr(c, x - 40, y - 64, 18, 13, 3, '#B79CF0'); catEars(c, x - 31, y - 64, 5, 4, '#B79CF0');
    c.fillStyle = '#FF8FB3'; c.beginPath(); c.ellipse(x - 20, y - 2, 9, 2.6, 0, 0, TAU); c.fill();
  },
  sala(c, x, y) {   // ศาลาไทยบนสะพานโค้ง (ลำน้ำสาขาลอดใต้)
    const by = pathY(x);
    c.fillStyle = '#F7F0FF';
    c.beginPath(); c.moveTo(x - 40, by + 6); c.quadraticCurveTo(x, by - 18, x + 40, by + 6); c.lineTo(x + 40, by + 12); c.quadraticCurveTo(x, by - 10, x - 40, by + 12); c.closePath(); c.fill();
    c.strokeStyle = '#E8C26A'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(x - 40, by + 2); c.quadraticCurveTo(x, by - 22, x + 40, by + 2); c.stroke();
    for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(x + i * 11, by - 6 + Math.abs(i) * 2); c.lineTo(x + i * 11, by - 1 + Math.abs(i) * 2.4); c.stroke(); }
    for (const px of [x - 16, x + 16]) rr(c, px - 2, y - 36, 4, by - 6 - (y - 36), 1, '#F7EEFF');   // เสาศาลาลงถึงพื้นสะพาน
    c.fillStyle = '#7A5BB0'; c.beginPath(); c.moveTo(x - 26, y - 34); c.lineTo(x - 14, y - 46); c.lineTo(x + 14, y - 46); c.lineTo(x + 26, y - 34); c.closePath(); c.fill();
    c.fillStyle = '#8C6AD6'; c.beginPath(); c.moveTo(x - 16, y - 45); c.lineTo(x - 6, y - 58); c.lineTo(x + 6, y - 58); c.lineTo(x + 16, y - 45); c.closePath(); c.fill();
    c.strokeStyle = '#E8C26A'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x - 27, y - 34); c.quadraticCurveTo(x - 31, y - 38, x - 30, y - 42); c.moveTo(x + 27, y - 34); c.quadraticCurveTo(x + 31, y - 38, x + 30, y - 42); c.stroke();
    c.fillStyle = '#FFD45A'; c.beginPath(); c.arc(x, y - 61, 2.6, 0, TAU); c.fill();
  },
  gardenGate(c, x, y) {   // ซุ้มดอกไม้: วงชมพูมีดอกไม้ + แสงวาป + ต้นซากุระ
    tree(c, x - 32, y - 18, 13, true); tree(c, x + 32, y - 16, 12, true);
    shadow(c, x, y, 26);
    const g = c.createRadialGradient(x, y - 24, 2, x, y - 24, 20);
    g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,170,215,.35)');
    c.fillStyle = g; c.beginPath(); c.ellipse(x, y - 22, 14, 20, 0, 0, TAU); c.fill();
    c.strokeStyle = '#FF9CC0'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(x - 20, y); c.lineTo(x - 20, y - 28); c.arc(x, y - 28, 20, Math.PI, 0); c.lineTo(x + 20, y); c.stroke();
    for (let i = 0; i <= 9; i++) { const a = Math.PI + (i / 9) * Math.PI; c.fillStyle = ['#FFFFFF', '#FFE27A', '#C9AEF7'][i % 3]; c.beginPath(); c.arc(x + Math.cos(a) * 20, y - 28 + Math.sin(a) * 20, 2.6, 0, TAU); c.fill(); }
  },
  toy(c, x, y) {   // ร้านของเล่น: ผนังชมพูอ่อน หัวแมวยักษ์บนหลังคา ลูกโป่ง
    shadow(c, x, y, 34);
    rr(c, x - 28, y - 30, 56, 30, [10, 10, 2, 2], '#FFE6F1');
    for (let i = 0; i < 6; i++) { c.fillStyle = ['#FF8FB3', '#FFFFFF', '#FFD45A', '#FFFFFF', '#8EE0C2', '#FFFFFF'][i]; c.fillRect(x - 28 + i * 9.4, y - 30, 9.4, 6); }
    catEars(c, x, y - 54, 14, 10, '#FFB5CF');
    c.fillStyle = '#FFC4DA'; c.beginPath(); c.ellipse(x, y - 44, 24, 17, 0, 0, TAU); c.fill();
    c.strokeStyle = '#8A2E5A'; c.lineWidth = 1.4; c.lineCap = 'round';
    for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * 8, y - 45, 3, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    door(c, x + 12, y, 11, 16, '#FF8FB3');
    for (const [dx, col] of [[-36, '#9FD3FF'], [-31, '#FF8FB3'], [34, '#FFE27A']]) {
      c.strokeStyle = 'rgba(120,80,110,.5)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x + dx, y - 34); c.lineTo(x + dx * 0.9, y - 14); c.stroke();
      c.fillStyle = col; c.beginPath(); c.ellipse(x + dx, y - 38, 5, 6, 0, 0, TAU); c.fill();
    }
  },
  exchange(c, x, y) {   // ร้านแลกของรางวัล: เต็นท์ลายฟ้า-ขาว ธงดาว
    shadow(c, x, y, 34);
    rr(c, x - 26, y - 26, 52, 26, 2, '#2C418E');
    c.save();
    c.beginPath(); c.moveTo(x - 32, y - 22); c.quadraticCurveTo(x - 10, y - 34, x, y - 58); c.quadraticCurveTo(x + 10, y - 34, x + 32, y - 22); c.closePath(); c.clip();
    for (let i = -4; i < 4; i++) { c.fillStyle = i % 2 ? '#FFFFFF' : '#4E78E0'; c.beginPath(); c.moveTo(x, y - 60); c.lineTo(x + i * 9, y - 20); c.lineTo(x + (i + 1) * 9, y - 20); c.closePath(); c.fill(); }
    c.restore();
    c.strokeStyle = '#8A6BC8'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, y - 58); c.lineTo(x, y - 70); c.stroke();
    c.fillStyle = '#FF7EB0'; c.beginPath(); c.moveTo(x, y - 70); c.lineTo(x + 10, y - 67); c.lineTo(x, y - 64); c.fill();
    door(c, x + 10, y, 11, 16, '#8A2E5A');
    c.fillStyle = '#FFD45A'; c.beginPath(); c.arc(x - 10, y - 10, 4, 0, TAU); c.fill();
  },
  castle(c, x, y) {   // ปราสาท: กำแพงขาวชมพู หอยอดม่วง โดมหูแมวมงกุฎทอง + รั้ว
    c.strokeStyle = '#A98AE8'; c.lineWidth = 1.4;
    for (const d of [-1, 1]) for (let i = 1; i <= 4; i++) { const fx = x + d * (34 + i * 7); c.beginPath(); c.moveTo(fx, y); c.lineTo(fx, y - 12); c.stroke(); }
    c.fillStyle = '#A98AE8'; c.fillRect(x - 64, y - 9, 22, 2); c.fillRect(x + 42, y - 9, 22, 2);
    shadow(c, x, y, 40);
    rr(c, x - 30, y - 34, 60, 34, 2, '#FFF0F7');
    for (let i = 0; i < 6; i++) rr(c, x - 28 + i * 10, y - 39, 6, 6, 1, '#FFF0F7');
    c.fillStyle = '#B98AE2'; c.beginPath(); c.ellipse(x, y - 52, 14, 10, 0, Math.PI, TAU); c.fill();
    catEars(c, x, y - 58, 9, 5, '#B98AE2');
    c.fillStyle = '#FFD45A'; c.beginPath(); c.moveTo(x - 4, y - 61); c.lineTo(x - 4, y - 66); c.lineTo(x - 1.5, y - 63); c.lineTo(x, y - 67); c.lineTo(x + 1.5, y - 63); c.lineTo(x + 4, y - 66); c.lineTo(x + 4, y - 61); c.closePath(); c.fill();
    rr(c, x - 10, y - 52, 20, 18, 1, '#FFF6FB');
    for (const tx of [x - 36, x + 36]) {
      rr(c, tx - 8, y - 46, 16, 46, 2, '#FFF6FB');
      c.fillStyle = '#9C7FE0'; c.beginPath(); c.moveTo(tx - 11, y - 46); c.lineTo(tx, y - 66); c.lineTo(tx + 11, y - 46); c.closePath(); c.fill();
      c.fillStyle = '#FF7EB0'; c.beginPath(); c.moveTo(tx, y - 66); c.lineTo(tx, y - 72); c.lineTo(tx + 6, y - 70); c.fill();
      win(c, tx, y - 30);
    }
    door(c, x, y, 16, 22, '#8350BE');
    c.fillStyle = '#E8C26A'; c.beginPath(); c.arc(x, y - 22, 2, 0, TAU); c.fill();
  },
};
function pierIcon(c, x, y) {   // ศาลาท่าเรือ: หลังคาจั่วฟ้า ผนังฟ้า ห่วงชูชีพ (ทางไม้ลงน้ำวาดข้างตัวแล้ว)
  shadow(c, x, y, 26);
  rr(c, x - 18, y - 26, 36, 26, 2, '#DDEFFB');
  for (const px of [x - 20, x + 20]) rr(c, px - 1.5, y - 28, 3, 28, 1, '#FFFFFF');
  c.fillStyle = '#7FB2EA'; c.beginPath(); c.moveTo(x - 26, y - 26); c.lineTo(x, y - 46); c.lineTo(x + 26, y - 26); c.closePath(); c.fill();
  c.strokeStyle = '#FFFFFF'; c.lineWidth = 2.4; c.lineJoin = 'round'; c.beginPath(); c.moveTo(x - 27, y - 25); c.lineTo(x, y - 46); c.lineTo(x + 27, y - 25); c.stroke();
  rr(c, x - 20, y - 30, 40, 6, 2, '#4F86D8');
  c.strokeStyle = '#FF7FAE'; c.lineWidth = 2.6; c.beginPath(); c.arc(x - 8, y - 14, 4, 0, TAU); c.stroke();
  c.fillStyle = '#C79A3A'; c.beginPath(); c.arc(x, y - 36, 3, 0, TAU); c.fill();
  c.strokeStyle = '#8A6BC8'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y - 46); c.lineTo(x, y - 56); c.stroke();
  c.fillStyle = '#FF7EB0'; c.beginPath(); c.moveTo(x, y - 56); c.lineTo(x + 8, y - 54); c.lineTo(x, y - 51); c.fill();
}

// ── ชั้นสด: เรือ "อยู่ที่นี่" + เส้นทางเรือ + ประกายน้ำ ──
/** fromId = ท่าที่เรือจอด · pick = จุดแวะที่เลือก (เรียงลำดับ) · t = เวลา (มิลลิวินาที) */
export function drawMapLive(c, fromId, pick, t) {
  const W = mapW(), f = t / 16.7;
  c.clearRect(0, 0, W, MAP_H);
  // ประกายบนผิวน้ำ
  for (let i = 0; i < W / 70; i++) {
    const a = Math.max(0, Math.sin(f * 0.05 + i * 1.9)) ** 3;
    if (a < 0.1) continue;
    const x = i * 70 + hash(i * 3.3) * 50, y = 210 + hash(i * 7.7) * 34;
    c.globalAlpha = a; c.fillStyle = '#FFFFFF';
    star4(c, x, y, 2 + a * 2.2);
  }
  c.globalAlpha = 1;
  // เส้นทางเรือ: เส้นประชมพูวิ่งตามแม่น้ำ · แต่ละช่วงโค้งลงลึกขึ้นนิด (ไปกลับทางเดิมไม่ทับกันจนอ่านไม่ออก)
  let px = mapX(fromId);
  pick.forEach((s, i) => {
    const x = mapX(s.id), bulge = 10 + (i % 3) * 7;
    const leg = () => { c.beginPath(); c.moveTo(px, BOAT_Y - 4); c.quadraticCurveTo((px + x) / 2, BOAT_Y + bulge, x, BOAT_Y - 4); };
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 5.5; c.setLineDash([]); leg(); c.stroke();
    c.strokeStyle = '#FF6FA5'; c.lineWidth = 3; c.setLineDash([7, 6]); c.lineDashOffset = -f * 0.6; leg(); c.stroke();
    c.setLineDash([]);
    // หัวลูกศรปลายช่วง
    const d = Math.sign(x - px) || 1;
    c.fillStyle = '#FF6FA5';
    c.beginPath(); c.moveTo(x - d * 2, BOAT_Y - 4); c.lineTo(x - d * 10, BOAT_Y - 10); c.lineTo(x - d * 9, BOAT_Y + 2); c.closePath(); c.fill();
    px = x;
  });
  // วงเลขบนน้ำตรงจุดจอด — วาดหลังเส้นทุกช่วง (เส้นช่วงถัดไปไม่ทับเลข) · จอดซ้ำที่เดิมโชว์เลขล่าสุด
  pick.forEach((s, i) => {
    const x = mapX(s.id);
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(x, BOAT_Y - 4, 8.5, 0, TAU); c.fill();
    c.fillStyle = '#FF6FA5'; c.beginPath(); c.arc(x, BOAT_Y - 4, 7, 0, TAU); c.fill();
    c.fillStyle = '#FFFFFF'; c.font = '700 9px Mali, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(String(i + 1), x, BOAT_Y - 3.5);
  });
  // เรือจิ๋ว (อยู่ที่นี่) โยกบนน้ำ + วงคลื่น
  const bx = mapX(fromId), by = BOAT_Y + Math.sin(f * 0.08) * 1.2;
  const u = (f * 0.015) % 1;
  c.strokeStyle = `rgba(255,255,255,${0.8 * (1 - u)})`; c.lineWidth = 1.4;
  c.beginPath(); c.ellipse(bx, by + 3, 18 + u * 14, 3 + u * 3, 0, 0, TAU); c.stroke();
  c.save();
  c.translate(bx, by);
  c.rotate(Math.sin(f * 0.06) * 0.05);
  c.fillStyle = '#9C5240';
  c.beginPath(); c.moveTo(-17, -6); c.quadraticCurveTo(-14, 4, 0, 4); c.quadraticCurveTo(14, 4, 19, -8); c.quadraticCurveTo(8, -3, 0, -3); c.quadraticCurveTo(-8, -3, -17, -6); c.closePath(); c.fill();
  c.strokeStyle = '#FFD45A'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-14, -2); c.quadraticCurveTo(0, 1.5, 15, -3); c.stroke();
  c.strokeStyle = '#7E3E30'; c.lineWidth = 2; c.beginPath(); c.moveTo(18, -7); c.quadraticCurveTo(21, -11, 19, -15); c.stroke();
  c.fillStyle = '#FFA34D'; c.beginPath(); c.arc(-3, -7, 4.2, 0, TAU); c.fill();
  catEars(c, -3, -10, 2.6, 2.6, '#FFA34D');
  c.restore();
}
function star4(c, x, y, r) {
  c.beginPath();
  c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r);
  c.fill();
}
