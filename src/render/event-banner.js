// src/render/event-banner.js
// ─────────────────────────────────────────────────────────────
// เทมเพลตกรอบทางเข้ากิจกรรม — ใช้ชุดเดียวกันทั้งหน้าแรกของเกมและตัวอย่างในหลังบ้าน หน้าตาจึงตรงกันเสมอ
// ของที่เปลี่ยนได้มีแค่ ข้อความสองบรรทัด + วันสิ้นสุด (เวลาที่เหลือคำนวณเอง) · หน้าตาอยู่ใน src/event-banner.css
// ─────────────────────────────────────────────────────────────
import { drawCat2 } from './cat2.js';
import { skinById } from '../skins.js';
import { daysLeft } from '../quests.js';
import { cropStyle } from '../crop.js';

/** พื้นหลังสำเร็จรูปของกรอบ (ลายอยู่ใน src/event-banner.css ตาม data-bg) — หลังบ้านสร้างปุ่มเลือกจากตารางนี้ */
export const BANNER_BGS = [
  { id: 'pink', name: 'ชมพูลำแสง' },
  { id: 'sky', name: 'ฟ้าปุยเมฆ' },
  { id: 'mint', name: 'มิ้นต์จุดแต้ม' },
  { id: 'lemon', name: 'เหลืองเนย' },
  { id: 'night', name: 'คืนดาวม่วง' },
  { id: 'peach', name: 'พีชหัวใจ' },
];

export const EV_BANNER_INNER = `
  <span class="evb-clip" aria-hidden="true"><canvas class="evb-cat"></canvas><span class="evb-pic" hidden><img alt="" draggable="false"></span></span>
  <span class="evb-text">
    <b class="evb-kick"></b>
    <b class="evb-name"></b>
    <span class="evb-time"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="#FFF3C4" stroke="#8A5A1E" stroke-width="2.6"/><path d="M12 6.8V12l3.6 2.2" fill="none" stroke="#8A5A1E" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="evb-left"></span></span>
  </span>
  <span class="evb-go" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9.5 5.5 16 12l-6.500 6.500" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;

/** น้องส้มกอดปลา สวมมงกุฎ — ของทั้งสองวาดในพิกัดไฟล์ออกแบบของตัวน้อง (holdDraw) จึงอยู่บนตัวพอดี */
export function paintBannerCat(cv) {
  const W = 200, H = 190, dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = W * dpr;
  cv.height = H * dpr;
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawCat2(c, W / 2, 196, 2.9, skinById('orange'), 600, { k: 1, shape: { knead: 1, clasp: 1, grip: 1, kneadT: 0 }, mood: 'happy', holdDraw: (g, x, y) => {
    g.save();
    g.translate(x, y - 34);
    g.rotate(-0.12);
    g.scale(0.82, 0.82);
    g.lineJoin = 'round';
    g.lineWidth = 7;
    g.strokeStyle = '#3F5F8C';
    g.fillStyle = '#7FA8D8';
    g.beginPath();
    g.moveTo(96, 0);
    g.lineTo(142, -34);
    g.lineTo(136, 34);
    g.closePath();
    g.fill(); g.stroke();
    g.beginPath();
    g.ellipse(0, 0, 104, 46, 0, 0, Math.PI * 2);
    g.fill(); g.stroke();
    g.fillStyle = '#C7DCF2';
    g.beginPath(); g.ellipse(-8, 18, 66, 20, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#233A5C';
    g.beginPath(); g.arc(-70, -10, 8, 0, Math.PI * 2); g.fill();
    g.restore();
    g.save();
    g.translate(290, 100);
    g.rotate(-0.14);
    g.scale(0.86, 0.86);
    g.lineJoin = 'round';
    g.lineWidth = 7;
    g.fillStyle = '#FFCF4D';
    g.strokeStyle = '#B9791B';
    g.beginPath();
    g.moveTo(-74, 30); g.lineTo(-86, -38); g.lineTo(-38, -4); g.lineTo(0, -56); g.lineTo(38, -4); g.lineTo(86, -38); g.lineTo(74, 30);
    g.closePath();
    g.fill(); g.stroke();
    g.fillStyle = '#FF7FA8';
    g.beginPath(); g.arc(0, 8, 11, 0, Math.PI * 2); g.fill();
    g.restore();
  } });
}

/** ข้อความยาวย่อตัวหนังสือให้พอดีบรรทัด (ไม่ตัดบรรทัด ไม่ล้นทับปุ่มลูกศร) */
function fitLine(el) {
  el.style.fontSize = '';
  if (el.clientWidth && el.scrollWidth > el.clientWidth) el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * el.clientWidth / el.scrollWidth * 0.94) + 'px';
}

/** เขียนข้อความลงกรอบ: item = { kicker, title, end: 'ปปปป-ดด-วว', image?, crop?, bg?, bgImage? } · ไม่มีรูป/โหลดไม่ได้ = น้องส้มกอดปลา · tr = ตัวแปลภาษา (ในเกม) */
export function fillBanner(root, item, lang = 'th', tr = (s) => s) {
  const en = lang === 'en';
  const n = item.end ? daysLeft({ end: item.end }) : -1;
  const kick = root.querySelector('.evb-kick'), name = root.querySelector('.evb-name');
  const clip = root.querySelector('.evb-clip');
  clip.dataset.bg = item.bg || 'pink';
  clip.classList.toggle('evb-own', !!item.bgImage);   // รูปพื้นหลังที่อัปโหลดเอง ทับลายสำเร็จรูป
  clip.style.background = item.bgImage ? `center / cover no-repeat url("${item.bgImage}")` : '';
  const cat = root.querySelector('.evb-cat'), pic = root.querySelector('.evb-pic'), im = pic.firstChild;
  const show = !!item.image && im.dataset.bad !== item.image;   // รูปที่เคยโหลดไม่ได้ ไม่ลองซ้ำ (src เดิม onerror จะไม่ยิงอีก กรอบจะว่าง)
  pic.hidden = !show;
  cat.hidden = show;
  if (show) {
    im.onerror = () => { im.dataset.bad = item.image; pic.hidden = true; cat.hidden = false; };
    if (im.getAttribute('src') !== item.image) im.src = item.image;
    im.style.cssText = cropStyle(item.crop);
  }
  kick.textContent = tr(item.kicker || '');
  name.textContent = tr(item.title || '');
  root.querySelector('.evb-left').textContent = n < 0 ? 'ยังไม่ตั้งวันสิ้นสุด'
    : n ? (en ? `${n} days left` : `เหลืออีก ${n} วัน`) : (en ? 'Ended' : 'หมดเวลาแล้ว');
  fitLine(kick);
  fitLine(name);
}
