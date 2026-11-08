// src/town/stickers.js
// ─────────────────────────────────────────────────────────────
// สติกเกอร์แชตปราสาท (ผู้ใช้ 8 พ.ย. — ผู้มาเยือนก็ส่งได้) วาดด้วยผ้าใบทั้งหมด หน้าตาเหมือนกันทุกเครื่อง (ไม่ใช้อีโมจิ)
//   แสงเงาในเนื้อ (ไล่สี + จุดแสง) ไม่มีเส้นขอบรอบรูป · drawSticker(c, id, x, y, r) วาดกลางที่ (x, y) รัศมีราว r
//   ห้องส่งแค่รหัส id — เพิ่มสติกเกอร์ใหม่ = เพิ่มใน STICKERS + กรณีใน drawSticker ที่เดียว
// ─────────────────────────────────────────────────────────────
import { heart, star } from './world.js';

export const STICKERS = [
  { id: 'heart', name: 'หัวใจ' }, { id: 'star', name: 'ดาวยิ้ม' }, { id: 'paw', name: 'อุ้งเท้า' }, { id: 'flower', name: 'ดอกไม้' },
  { id: 'fish', name: 'ปลา' }, { id: 'cake', name: 'คัพเค้ก' }, { id: 'note', name: 'เพลง' }, { id: 'sparkle', name: 'ประกาย' },
  { id: 'catJoy', name: 'แมวยิ้ม' }, { id: 'catLove', name: 'แมวตาหัวใจ' }, { id: 'catCry', name: 'แมวร้องไห้' }, { id: 'catWow', name: 'แมวตกใจ' },
];
export const STICKER_IDS = new Set(STICKERS.map((s) => s.id));

const TAU = Math.PI * 2;
const radial = (c, x, y, r, stops) => {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r * 1.05);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
};
const dot = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
const shine = (c, x, y, rx, ry, a = -0.5) => { c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(x, y, rx, ry, a, 0, TAU); c.fill(); };
function sparkle4(c, x, y, r, col) {
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x, y - r); c.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y); c.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
  c.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y); c.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
  c.fill();
}

/** หน้าแมวส้มกลม หูมน — eyes: joy | love | cry | wow */
function catFace(c, x, y, r, eyes) {
  for (const d of [-1, 1]) {
    c.fillStyle = radial(c, x + d * r * 0.55, y - r * 0.8, r * 0.5, [[0, '#FFD3A8'], [1, '#F2A15E']]);
    c.beginPath(); c.moveTo(x + d * r * 0.2, y - r * 0.7); c.quadraticCurveTo(x + d * r * 0.62, y - r * 1.35, x + d * r * 0.92, y - r * 0.45); c.closePath(); c.fill();
    c.fillStyle = '#FFB3C8';
    c.beginPath(); c.moveTo(x + d * r * 0.36, y - r * 0.66); c.quadraticCurveTo(x + d * r * 0.62, y - r * 1.1, x + d * r * 0.78, y - r * 0.55); c.closePath(); c.fill();
  }
  c.fillStyle = radial(c, x, y, r, [[0, '#FFE2C4'], [0.6, '#FBB979'], [1, '#EE9550']]);
  c.beginPath(); c.ellipse(x, y, r, r * 0.88, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,248,238,.92)'; c.beginPath(); c.ellipse(x, y + r * 0.34, r * 0.5, r * 0.36, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(214,120,60,.55)';
  for (const k of [-1, 0, 1]) { c.beginPath(); c.ellipse(x + k * r * 0.18, y - r * 0.66, r * 0.05, r * 0.14, k * 0.25, 0, TAU); c.fill(); }
  const ex = r * 0.38, ey = y - r * 0.08;
  if (eyes === 'love') for (const d of [-1, 1]) { c.fillStyle = '#FF4F8B'; heart(c, x + d * ex, ey - r * 0.1, r * 0.24); c.fill(); shine(c, x + d * ex - r * 0.07, ey - r * 0.13, r * 0.05, r * 0.03); }
  else if (eyes === 'wow') for (const d of [-1, 1]) { dot(c, x + d * ex, ey, r * 0.15, '#3B2A4A'); dot(c, x + d * ex - r * 0.05, ey - r * 0.06, r * 0.05, '#FFFFFF'); }
  else {
    c.strokeStyle = '#4A2E3E'; c.lineWidth = r * 0.09; c.lineCap = 'round';
    for (const d of [-1, 1]) {
      c.beginPath();
      if (eyes === 'cry') { c.moveTo(x + d * ex - r * 0.14, ey - r * 0.06); c.lineTo(x + d * ex + r * 0.14, ey + r * 0.02); }
      else c.arc(x + d * ex, ey + r * 0.06, r * 0.13, Math.PI * 1.1, Math.PI * 1.9);
      c.stroke();
    }
  }
  if (eyes === 'cry') {
    for (const d of [-1, 1]) {
      c.fillStyle = 'rgba(120,190,255,.9)';
      c.beginPath(); c.moveTo(x + d * ex, ey + r * 0.08); c.quadraticCurveTo(x + d * (ex + r * 0.12), ey + r * 0.38, x + d * ex, ey + r * 0.44); c.quadraticCurveTo(x + d * (ex - r * 0.12), ey + r * 0.38, x + d * ex, ey + r * 0.08); c.fill();
    }
  }
  dot(c, x - r * 0.58, y + r * 0.2, r * 0.14, 'rgba(255,130,160,.45)');
  dot(c, x + r * 0.58, y + r * 0.2, r * 0.14, 'rgba(255,130,160,.45)');
  c.fillStyle = '#FF7FA0'; c.beginPath(); c.moveTo(x - r * 0.07, y + r * 0.14); c.lineTo(x + r * 0.07, y + r * 0.14); c.lineTo(x, y + r * 0.22); c.closePath(); c.fill();
  c.strokeStyle = '#4A2E3E'; c.lineWidth = r * 0.06; c.lineCap = 'round';
  if (eyes === 'wow') { c.fillStyle = '#7A3A4E'; c.beginPath(); c.ellipse(x, y + r * 0.42, r * 0.1, r * 0.13, 0, 0, TAU); c.fill(); }
  else if (eyes === 'cry') { c.beginPath(); c.arc(x, y + r * 0.48, r * 0.12, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
  else { c.beginPath(); c.arc(x - r * 0.07, y + r * 0.24, r * 0.08, 0.2, Math.PI - 0.2); c.arc(x + r * 0.07, y + r * 0.24, r * 0.08, 0.2, Math.PI - 0.2); c.stroke(); }
  shine(c, x - r * 0.5, y - r * 0.42, r * 0.16, r * 0.08);
}

/** วาดสติกเกอร์ id กลางที่ (x, y) รัศมีราว r */
export function drawSticker(c, id, x, y, r) {
  c.save();
  c.lineJoin = 'round';
  if (id === 'heart') {
    c.fillStyle = radial(c, x, y, r, [[0, '#FFC2DA'], [0.55, '#FF6FA5'], [1, '#E2457F']]);
    heart(c, x, y - r * 0.05, r * 0.95); c.fill();
    shine(c, x - r * 0.38, y - r * 0.42, r * 0.2, r * 0.11);
    sparkle4(c, x + r * 0.78, y - r * 0.7, r * 0.22, '#FFE48A');
  } else if (id === 'star') {
    c.fillStyle = radial(c, x, y, r, [[0, '#FFF6C4'], [0.6, '#FFD84F'], [1, '#F2AE2E']]);
    star(c, x, y + r * 0.06, r * 1.02, -Math.PI / 2); c.fill();
    c.strokeStyle = '#7A4A1E'; c.lineWidth = r * 0.08; c.lineCap = 'round';
    for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * r * 0.2, y + r * 0.04, r * 0.08, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    c.beginPath(); c.arc(x, y + r * 0.16, r * 0.1, 0.25, Math.PI - 0.25); c.stroke();
    dot(c, x - r * 0.36, y + r * 0.2, r * 0.09, 'rgba(255,130,120,.55)'); dot(c, x + r * 0.36, y + r * 0.2, r * 0.09, 'rgba(255,130,120,.55)');
    shine(c, x - r * 0.12, y - r * 0.42, r * 0.1, r * 0.06);
  } else if (id === 'paw') {
    c.fillStyle = radial(c, x, y + r * 0.2, r * 0.6, [[0, '#FFD0E2'], [1, '#F27FAE']]);
    c.beginPath(); c.ellipse(x, y + r * 0.28, r * 0.5, r * 0.42, 0, 0, TAU); c.fill();
    for (const [dx, dy, s] of [[-0.62, -0.18, 0.2], [-0.24, -0.6, 0.22], [0.24, -0.6, 0.22], [0.62, -0.18, 0.2]]) {
      c.fillStyle = radial(c, x + dx * r, y + dy * r, s * r, [[0, '#FFD0E2'], [1, '#F27FAE']]);
      c.beginPath(); c.ellipse(x + dx * r, y + dy * r, s * r, s * r * 1.18, dx * 0.4, 0, TAU); c.fill();
    }
    shine(c, x - r * 0.18, y + r * 0.12, r * 0.14, r * 0.07);
  } else if (id === 'flower') {
    c.fillStyle = '#7CC67E';
    c.beginPath(); c.ellipse(x + r * 0.55, y + r * 0.62, r * 0.32, r * 0.14, -0.6, 0, TAU); c.fill();
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU - Math.PI / 2, px = x + Math.cos(a) * r * 0.5, py = y + Math.sin(a) * r * 0.5;
      c.fillStyle = radial(c, px, py, r * 0.42, [[0, '#FFE0EC'], [1, '#FF8DB8']]);
      c.beginPath(); c.ellipse(px, py, r * 0.4, r * 0.32, a, 0, TAU); c.fill();
    }
    c.fillStyle = radial(c, x, y, r * 0.28, [[0, '#FFF3B0'], [1, '#F5C340']]);
    c.beginPath(); c.arc(x, y, r * 0.26, 0, TAU); c.fill();
    shine(c, x - r * 0.08, y - r * 0.09, r * 0.08, r * 0.05);
  } else if (id === 'fish') {
    c.fillStyle = radial(c, x + r * 0.7, y, r * 0.5, [[0, '#BFE6FF'], [1, '#5FA8E8']]);
    c.beginPath(); c.moveTo(x + r * 0.5, y); c.quadraticCurveTo(x + r * 0.85, y - r * 0.5, x + r, y - r * 0.48); c.quadraticCurveTo(x + r * 0.82, y, x + r, y + r * 0.48); c.quadraticCurveTo(x + r * 0.85, y + r * 0.5, x + r * 0.5, y); c.fill();
    c.fillStyle = radial(c, x - r * 0.1, y, r * 0.75, [[0, '#DDF2FF'], [0.6, '#8CCBF6'], [1, '#4F96DA']]);
    c.beginPath(); c.ellipse(x - r * 0.12, y, r * 0.72, r * 0.5, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)';
    for (const k of [0, 1, 2]) { c.beginPath(); c.arc(x + r * (0.05 + k * 0.18), y + r * 0.05, r * 0.14, -1.2, 1.2); c.fill(); }
    dot(c, x - r * 0.5, y - r * 0.08, r * 0.1, '#2E3A5A'); dot(c, x - r * 0.53, y - r * 0.12, r * 0.035, '#FFFFFF');
    c.strokeStyle = '#2E3A5A'; c.lineWidth = r * 0.06; c.lineCap = 'round';
    c.beginPath(); c.arc(x - r * 0.62, y + r * 0.14, r * 0.07, 0.3, Math.PI - 0.3); c.stroke();
    shine(c, x - r * 0.3, y - r * 0.3, r * 0.18, r * 0.07, -0.2);
  } else if (id === 'cake') {
    const cup = new Path2D();
    cup.moveTo(x - r * 0.58, y); cup.lineTo(x + r * 0.58, y); cup.lineTo(x + r * 0.42, y + r * 0.82); cup.lineTo(x - r * 0.42, y + r * 0.82); cup.closePath();
    c.fillStyle = radial(c, x, y + r * 0.4, r * 0.7, [[0, '#FFF0C8'], [1, '#E8B86A']]); c.fill(cup);
    c.save(); c.clip(cup); c.fillStyle = 'rgba(200,130,60,.28)';
    for (let k = -3; k <= 3; k++) { c.fillRect(x + k * r * 0.2 - r * 0.04, y, r * 0.08, r * 0.9); }
    c.restore();
    c.fillStyle = radial(c, x, y - r * 0.25, r * 0.7, [[0, '#FFE6F1'], [0.6, '#FFA6CA'], [1, '#F27FB0']]);
    c.beginPath(); c.ellipse(x, y - r * 0.05, r * 0.66, r * 0.26, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(x, y - r * 0.3, r * 0.48, r * 0.24, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(x, y - r * 0.52, r * 0.28, r * 0.18, 0, 0, TAU); c.fill();
    dot(c, x + r * 0.05, y - r * 0.78, r * 0.15, '#E8335F'); shine(c, x, y - r * 0.83, r * 0.05, r * 0.03);
    for (const [dx, dy, col] of [[-0.3, -0.15, '#8CCBF6'], [0.25, -0.32, '#FFE48A'], [0.4, -0.05, '#A8E6A8'], [-0.1, -0.42, '#FFFFFF']]) dot(c, x + dx * r, y + dy * r, r * 0.05, col);
    shine(c, x - r * 0.3, y - r * 0.35, r * 0.12, r * 0.06);
  } else if (id === 'note') {
    c.fillStyle = radial(c, x, y, r, [[0, '#D8C2FF'], [1, '#8A5FD6']]);
    c.beginPath(); c.ellipse(x - r * 0.42, y + r * 0.5, r * 0.26, r * 0.2, -0.4, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(x + r * 0.42, y + r * 0.34, r * 0.26, r * 0.2, -0.4, 0, TAU); c.fill();
    c.fillRect(x - r * 0.22, y - r * 0.6, r * 0.11, r * 1.1); c.fillRect(x + r * 0.62, y - r * 0.76, r * 0.11, r * 1.1);
    c.beginPath(); c.moveTo(x - r * 0.22, y - r * 0.6); c.lineTo(x + r * 0.73, y - r * 0.76); c.lineTo(x + r * 0.73, y - r * 0.5); c.lineTo(x - r * 0.22, y - r * 0.34); c.closePath(); c.fill();
    sparkle4(c, x - r * 0.7, y - r * 0.55, r * 0.2, '#FFE48A');
    shine(c, x - r * 0.5, y + r * 0.44, r * 0.08, r * 0.05);
  } else if (id === 'sparkle') {
    sparkle4(c, x - r * 0.15, y + r * 0.05, r * 0.85, '#FFD84F');
    sparkle4(c, x - r * 0.15, y + r * 0.05, r * 0.45, '#FFF6C4');
    sparkle4(c, x + r * 0.62, y - r * 0.55, r * 0.34, '#FF9EC4');
    sparkle4(c, x + r * 0.55, y + r * 0.62, r * 0.26, '#9ED2FF');
  } else {
    catFace(c, x, y + r * 0.1, r * 0.82, id === 'catLove' ? 'love' : id === 'catCry' ? 'cry' : id === 'catWow' ? 'wow' : 'joy');
  }
  c.restore();
}

/** สติกเกอร์บนปุ่มในแผงแชต — ผ้าใบเล็กคมตามความละเอียดจอ (วาดครั้งเดียว) */
export function stickerCanvas(id, px = 40) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const cv = document.createElement('canvas');
  cv.width = cv.height = Math.round(px * dpr);
  cv.style.width = cv.style.height = px + 'px';
  const c = cv.getContext('2d');
  c.scale(dpr, dpr);
  drawSticker(c, id, px / 2, px / 2, px * 0.4);
  return cv;
}
