// src/debug.js
// ─────────────────────────────────────────────────────────────
// แผงปุ่มทดสอบ — ของชั่วคราว ไม่ใช่ส่วนหนึ่งของเกม
//
// วิธีลบทิ้งตอนไม่ต้องใช้แล้ว ทำแค่ 2 อย่าง ไม่มีอะไรพังตามมา:
//   1. ลบไฟล์นี้
//   2. ลบสองบรรทัดใน main.js — บรรทัด import กับบรรทัด setupDebug(game)
//
// ตั้งใจไม่แตะ index.html และ style.css เลยแม้แต่บรรทัดเดียว
// แผงนี้สร้าง DOM กับสไตล์ของตัวเองทั้งหมดตอนรัน ลบไฟล์ = หายเกลี้ยง
//
// ปุ่มทั้งสองไม่ได้เขียนตรรกะซ้ำ แต่ไปกดสวิตช์ตัวเดียวกับที่เกมใช้จริง
// ผลที่เห็นจึงตรงกับตอนเล่นจริงเป๊ะ ไม่ใช่ทางลัดที่ทำงานคนละทาง
// ─────────────────────────────────────────────────────────────
import { SKILL } from './config.js';
import { STATE } from './game.js';

// false = โผล่เฉพาะตอนรัน dev server ส่วนเว็บที่ deploy จริงจะไม่มี
// และ Vite ตัดโค้ดทั้งก้อนทิ้งตอน build ผู้เล่นจึงงัดมาใช้ไม่ได้เลย
// เปลี่ยนเป็น true ถ้าอยากเทสบนเว็บที่ deploy ด้วย
const SHOW_ON_LIVE = false;

const CSS = `
.dbg {
  position: fixed;
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 99;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  font-family: "IBM Plex Sans Thai", system-ui, sans-serif;
}
.dbg-tag {
  font-size: 8px;
  letter-spacing: .16em;
  color: rgba(255,243,226,.42);
  padding-left: 4px;
}
.dbg button {
  padding: 6px 10px;
  border-radius: 9px;
  /* เส้นประบอกกลาย ๆ ว่าไม่ใช่ UI จริงของเกม */
  border: 1px dashed rgba(255,243,226,.38);
  background: rgba(27,15,43,.74);
  color: #FFF3E2;
  font-family: inherit;
  font-size: 11px;
  line-height: 1.4;
  cursor: pointer;
  white-space: nowrap;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  touch-action: manipulation;
  transition: background .1s ease, border-color .1s ease;
}
.dbg button:active { background: rgba(78,205,196,.3); }
.dbg button.no { border-color: #FF5C6E; color: #FF9BA6; }
`;

/** กะพริบแดงสั้น ๆ บอกว่ากดตอนนี้ยังไม่ได้ */
function reject(btn) {
  btn.classList.add('no');
  setTimeout(() => btn.classList.remove('no'), 280);
}

export function setupDebug(game) {
  if (!SHOW_ON_LIVE && !import.meta.env.DEV) return;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.className = 'dbg';

  const tag = document.createElement('span');
  tag.className = 'dbg-tag';
  tag.textContent = 'TEST';
  box.appendChild(tag);

  const add = (label, run) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', () => {
      if (!run()) reject(b);
    });
    box.appendChild(b);
  };

  // ── ความสามารถประจำตัว ──
  // ดันหลอดชาร์จให้เต็มแทนการตั้ง skill เอง เกมจะได้ยิงเข้าช่วงออกฤทธิ์
  // ผ่านทางเดิมของมันเองทุกขั้น ทั้งเสียง เพลง และการรีเซ็ตตัวนับเม็ดที่โปรย
  add('⚡ สกิลน้องแมว', () => {
    if (game.state !== STATE.RUN || game.bonus > 0 || game.skillOn) return false;
    game.charge = SKILL.chargeFrames;
    return true;
  });

  // ── โบนัสตัวอักษร SPEEDCAT ──
  // เรียกจุดเริ่มตัวจริง ไม่ใช่แค่ยัดตัวอักษรให้ครบ เพราะการนับครบ
  // เกิดในลูปเก็บของ ซึ่งจะไม่ทำงานถ้าไม่มีตัวอักษรอยู่บนจอพอดี
  add('⭐ โบนัสตัวอักษร', () => {
    if (game.state !== STATE.RUN || game.bonus > 0) return false;
    game.startBonus();
    return true;
  });

  document.body.appendChild(box);
}
