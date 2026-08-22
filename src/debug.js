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
import { addGems, getGems } from './vault.js';

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

/* ป้ายบอกผล — z-index สูงกว่าทุกอย่างในเกม เพราะจุดประสงค์เดียวคือ
   "ต้องเห็นแน่ ๆ" ไม่ว่ากำลังเปิดหน้าไหนค้างอยู่ */
.dbg-toast {
  position: fixed;
  left: 50%;
  top: 14%;
  transform: translateX(-50%);
  z-index: 9999;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid rgba(255,143,176,.65);
  background: rgba(27,15,43,.94);
  color: #FFE3EF;
  font-family: "IBM Plex Sans Thai", system-ui, sans-serif;
  font-size: 15px;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 6px 22px rgba(0,0,0,.45);

  /* ตั้งใจไม่ใส่แอนิเมชันค่อย ๆ จาง — งานเดียวของป้ายนี้คือ "ต้องเห็นแน่ ๆ"
     เคยใส่ @keyframes ที่เริ่มจาก opacity 0 แล้วเจอว่าถ้าแอนิเมชันไม่เดิน
     (แท็บอยู่หลัง เครื่องไม่วาดภาพ) ป้ายจะค้างที่เฟรมแรกคือ opacity 0
     และค่าจากแอนิเมชันชนะค่าปกติที่เขียนไว้ตรงนี้ด้วย ใส่ opacity: 1 ก็ไม่ช่วย
     ผลคือป้ายอยู่ครบทุกอย่างในหน้าเว็บแต่มองไม่เห็นเลย ซึ่งแย่กว่าไม่มีป้าย
     เพราะทำให้เข้าใจผิดว่าเสกไม่ติด แลกความสวยกับความแน่นอนไม่คุ้ม */
  opacity: 1;
}
`;

/** กะพริบแดงสั้น ๆ บอกว่ากดตอนนี้ยังไม่ได้ */
function reject(btn) {
  btn.classList.add('no');
  setTimeout(() => btn.classList.remove('no'), 280);
}

const GEM_GOAL = 999999;

/**
 * ป้ายบอกผลกลางจอ — ของแผงทดสอบเอง ไม่ใช้ระบบข้อความของเกม
 *
 * มีไว้เพราะแถบเพชรโผล่แค่ตอนอยู่หน้าแรก (ดู .hud-top ใน style.css)
 * ถ้าเสกตอนอยู่หน้าอื่นจะไม่เห็นอะไรขยับเลย แล้วแยกไม่ออกว่า
 * "เสกไม่ติด" หรือ "เสกติดแล้วแต่มองไม่เห็นตัวเลข" ซึ่งคนละเรื่องกัน
 */
function toast(text) {
  const el = document.createElement('div');
  el.className = 'dbg-toast';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

/**
 * เสกเพชรให้ครบ GEM_GOAL พอดี ไม่ใช่บวกเพิ่มทุกครั้งที่เรียก
 * คืน false ถ้ามีครบอยู่แล้ว เพื่อให้ปุ่มกะพริบแดงบอกว่าไม่ต้องกดซ้ำ
 */
function fillGems(hooks) {
  const need = GEM_GOAL - getGems();
  if (need <= 0) {
    toast('💎 มีครบ ' + getGems().toLocaleString('en-US') + ' อยู่แล้ว');
    return false;
  }
  addGems(need);
  hooks.refreshCurrency?.();
  toast('💎 เสกเพชรแล้ว ' + getGems().toLocaleString('en-US'));
  return true;
}

/**
 * @param game  ตัวเกม
 * @param hooks { refreshCurrency } — ให้ main.js ส่งฟังก์ชันวาดแถบทอง/เพชรใหม่มา
 *              ไม่ใช้ก็ได้ ปุ่มยังทำงาน แค่ตัวเลขบนจอจะรอรอบวาดถัดไป
 */
export function setupDebug(game, hooks = {}) {
  if (!SHOW_ON_LIVE && !import.meta.env.DEV) return;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  // ── ทางลัดผ่าน URL: เปิด ?gems ก็ได้เพชรเลย ──
  // มีทางนี้เพราะปุ่มในแผงต้องกดถูกที่ ซึ่งบนมือถือแผงพับอยู่และปุ่มเล็กมาก
  // ส่วนลิงก์แค่เปิดก็จบ ใช้ได้ทุกเครื่องโดยไม่ต้องหาปุ่ม
  //
  // ต้องอยู่หลังใส่ CSS เสมอ — toast() ใช้คลาสในนั้น ถ้าเรียกก่อนจะได้
  // ป้ายเปล่า ๆ ไม่มีสไตล์ กลืนไปกับพื้นหลังจนนึกว่าไม่ทำงาน
  //
  // ลบ ?gems ออกจากแถบที่อยู่หลังทำงานเสร็จ ไม่งั้นกดรีเฟรชทีก็เสกซ้ำทุกที
  // จนแยกไม่ออกว่าตัวเลขที่เห็นมาจากการเล่นจริงหรือมาจากทางลัด
  if (new URLSearchParams(location.search).has('gems')) {
    fillGems(hooks);
    const clean = new URL(location.href);
    clean.searchParams.delete('gems');
    history.replaceState(null, '', clean);
  }

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

  // ตั้งต้นเป็น "พับไว้" — ตอนกางอยู่มันทับปุ่มเมนูในล็อบบี้ (แมวน้อย) จนกดไม่ได้
  // ซึ่งเป็นปัญหาจริงเวลาไล่เทสหน้าล็อบบี้ ไม่ใช่แค่บังตา
  // อยากกางค้างไว้ก็กดครั้งเดียว มันจำให้ข้ามการรีเฟรชอยู่แล้ว
  let open = false;
  try {
    open = localStorage.getItem(OPEN_KEY) === '1';
  } catch {
    /* อ่านไม่ได้ก็ถือว่าพับไว้ */
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

  // ── เพชรชมพู ──
  add('💎 เพชร 999,999', () => fillGems(hooks));

  paint();
  document.body.appendChild(box);
}
