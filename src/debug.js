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

// จำว่าพับอยู่หรือกางอยู่ ข้ามการรีเฟรช
// เวลาไล่แก้หน้าตาเวอร์ชันมือถือต้องรีโหลดบ่อยมาก ถ้าไม่จำไว้
// จะต้องมากดพับใหม่ทุกรอบซึ่งน่ารำคาญกว่าตัวแผงที่บังจออีก
const OPEN_KEY = 'cookie-runner:dbg-open';

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
  gap: 6px;
  font-family: "IBM Plex Sans Thai", system-ui, sans-serif;
}

/* แท็บพับ/กาง — กลมเล็ก กดง่ายด้วยนิ้วโป้ง ตอนพับเหลือแค่ตัวนี้ตัวเดียว */
.dbg-toggle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px dashed rgba(255,243,226,.4);
  background: rgba(27,15,43,.8);
  color: #FFF3E2;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  touch-action: manipulation;
}
.dbg-toggle:active { background: rgba(78,205,196,.3); }

.dbg-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}
.dbg-tag {
  font-size: 8px;
  letter-spacing: .16em;
  color: rgba(255,243,226,.42);
  padding-left: 4px;
}
.dbg-body button {
  padding: 8px 12px;
  border-radius: 10px;
  /* เส้นประบอกกลาย ๆ ว่าไม่ใช่ UI จริงของเกม */
  border: 1px dashed rgba(255,243,226,.38);
  background: rgba(27,15,43,.8);
  color: #FFF3E2;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.4;
  cursor: pointer;
  white-space: nowrap;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  touch-action: manipulation;
  transition: background .1s ease, border-color .1s ease;
}
.dbg-body button:active { background: rgba(78,205,196,.3); }
.dbg-body button.no { border-color: #FF5C6E; color: #FF9BA6; }
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

  // ── แท็บพับ/กาง ──
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'dbg-toggle';
  box.appendChild(toggle);

  const body = document.createElement('div');
  body.className = 'dbg-body';
  box.appendChild(body);

  let open = true;
  try {
    open = localStorage.getItem(OPEN_KEY) !== '0';
  } catch {
    /* อ่านไม่ได้ก็ถือว่ากางไว้ */
  }

  function paint() {
    body.style.display = open ? 'flex' : 'none';
    toggle.textContent = open ? '✕' : '🐞';
    toggle.setAttribute('aria-label', open ? 'ซ่อนปุ่มทดสอบ' : 'แสดงปุ่มทดสอบ');
  }

  toggle.addEventListener('click', () => {
    open = !open;
    try {
      localStorage.setItem(OPEN_KEY, open ? '1' : '0');
    } catch {
      /* เซฟไม่ได้ก็แค่ไม่จำ ไม่ใช่เหตุให้พับไม่ได้ */
    }
    paint();
  });

  const tag = document.createElement('span');
  tag.className = 'dbg-tag';
  tag.textContent = 'TEST';
  body.appendChild(tag);

  const add = (label, run) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', () => {
      if (!run()) reject(b);
    });
    body.appendChild(b);
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

  paint();
  document.body.appendChild(box);
}
