// src/town/home-debug.js
// ─────────────────────────────────────────────────────────────
// แผงปุ่มทดสอบ 🐞 ของบ้านของฉัน (ห้องนอน + ห้องเลี้ยงน้อง) — ผู้ใช้ 15 พ.ย. 2026: "หน้าห้องนอน/ห้องน้องไม่มีปุ่มเทสต์ มีแค่หน้าแรกกับหน้าอื่น"
// หน้าตา/การพับเหมือนแผงทดสอบหน้าแรก (src/debug.js) · โผล่เฉพาะตอนรัน dev server (main.js โหลดไฟล์นี้ใต้ import.meta.env.DEV — เว็บจริงไม่มี)
// โผล่เฉพาะตอนอยู่ห้องนอน/ห้องเลี้ยง (hooks.visible) · ลบทิ้งได้: ลบไฟล์นี้ + บรรทัด import ใน town/main.js
// ─────────────────────────────────────────────────────────────
import { debugAdopt, debugNeeds, debugClearDishes, roomCats, ROOM_SLOTS } from '../cats.js';
import { debugBag, wallet } from './wallet.js';
import { debugKits, callToBowl, callToTub } from './home-cats.js';
import { pourBowl } from '../cats.js';

const OPEN_KEY = 'cookie-runner:dbg-open';
const CSS = `
.hdbg { position: fixed; left: 6px; top: 50%; transform: translateY(-50%); z-index: 99; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; font-family: "IBM Plex Sans Thai", system-ui, sans-serif; }
.hdbg.off { display: none; }
.hdbg-toggle { width: 34px; height: 34px; border-radius: 50%; border: 1px dashed rgba(255,243,226,.4); background: rgba(27,15,43,.8); color: #FFF3E2; font-size: 15px; line-height: 1; cursor: pointer; padding: 0; touch-action: manipulation; }
.hdbg-body { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; max-height: calc(100dvh - 56px); overflow-y: auto; scrollbar-width: none; }
.hdbg-body::-webkit-scrollbar { display: none; }
@media (max-height: 560px) { .hdbg-body { display: grid; grid-template-columns: repeat(2, auto); gap: 4px; } .hdbg-tag { grid-column: 1 / -1; } .hdbg-body button { padding: 5px 9px; font-size: 11px; text-align: left; } }
.hdbg-tag { font-size: 8px; letter-spacing: .16em; color: rgba(255,243,226,.6); padding-left: 4px; }
.hdbg-body button { padding: 7px 12px; border-radius: 10px; border: 1px dashed rgba(255,243,226,.38); background: rgba(27,15,43,.8); color: #FFF3E2; font-family: inherit; font-size: 12px; line-height: 1.4; cursor: pointer; white-space: nowrap; touch-action: manipulation; }
.hdbg-body button:active { background: rgba(78,205,196,.3); }
.hdbg-body button.no { border-color: #FF5C6E; color: #FF9BA6; }
`;

/**
 * hooks: { visible() → อยู่ห้องนอน/ห้องเลี้ยงไหม · nursery() → อยู่ห้องเลี้ยงไหม · kits() → น้องในห้องเลี้ยงตอนนี้ · toast(msg) · refreshHud() }
 */
export function mountHomeDebug(hooks) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const box = document.createElement('div');
  box.className = 'hdbg off';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'hdbg-toggle';
  const body = document.createElement('div');
  body.className = 'hdbg-body';
  box.append(toggle, body);
  document.body.appendChild(box);

  let open = false;
  try { open = localStorage.getItem(OPEN_KEY) === '1'; } catch { /* พับไว้ */ }
  const paint = () => { body.style.display = open ? '' : 'none'; toggle.textContent = open ? '✕' : '🐞'; toggle.setAttribute('aria-label', open ? 'ซ่อนปุ่มทดสอบ' : 'แสดงปุ่มทดสอบ'); };
  toggle.addEventListener('click', () => { open = !open; try { localStorage.setItem(OPEN_KEY, open ? '1' : '0'); } catch { /* ไม่จำ */ } paint(); });
  paint();

  const tag = document.createElement('span');
  tag.className = 'hdbg-tag';
  tag.textContent = 'TEST · บ้านของฉัน';
  body.appendChild(tag);
  const add = (label, run) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', () => {
      let ok = false;
      try { ok = run(); } catch (e) { console.error(e); }
      if (!ok) { b.classList.add('no'); setTimeout(() => b.classList.remove('no'), 280); }
    });
    body.appendChild(b);
  };
  const go = (q) => { location.href = location.pathname + '?' + q; return true; };
  const inNursery = () => hooks.nursery();

  // ── ไปห้อง / แบบห้อง ──
  add('🛏 ไปห้องนอน', () => go('spot=home&demo'));
  add('🐾 ห้องเลี้ยง (น้องจริงในเครื่อง)', () => go('spot=nursery&demo'));
  add('🐾 ห้องเลี้ยง + น้องตัวอย่าง 5 ตัว', () => go('spot=nursery&kits=5&demo'));
  add('📦 ห้องเลี้ยงแบบโล่ง (ยังไม่มีน้อง)', () => go('spot=nursery&home=empty&demo'));
  add('🎁 ห้องเลี้ยงชุดเริ่มต้น', () => go('spot=nursery&home=starter&demo'));

  // ── น้อง / ของ ──
  add('🐱 เสกลูกแมว 1 ตัว (โหลดห้องใหม่)', () => {
    if (roomCats().length >= ROOM_SLOTS) { hooks.toast(`ห้องเต็มแล้ว (${ROOM_SLOTS} ตัว) — ตัวใหม่จะไปรอในกล่อง`); }
    const c = debugAdopt();
    if (!c) return false;
    hooks.toast('🐱 ได้น้อง ' + (c.name || 'ตัวใหม่') + ' แล้ว — กำลังโหลดห้องใหม่');
    setTimeout(() => go('spot=nursery&demo'), 700);
    return true;
  });
  add('🍚 เติมของกินในกระเป๋า (+5 ทุกเมนู)', () => {
    if (!['kibble', 'fish', 'salmon'].every((id) => debugBag(id, 5))) { hooks.toast('โหมดเซิร์ฟเวอร์ใช้ของจริง เสกไม่ได้ — เปิดด้วย ?demo'); return false; }
    hooks.refreshHud?.(); hooks.toast('🍚 ข้าวเม็ด ปลาทู แซลมอน +5'); return true;
  });
  add('🧸 ของเล่นครบ 3 ชิ้น + แชมพู 3 ขวด', () => {
    const ok = ['feather', 'ball', 'mouse'].every((id) => (wallet().bag[id] || 0) > 0 || debugBag(id, 1)) && debugBag('shampoo', 3);
    if (!ok) { hooks.toast('โหมดเซิร์ฟเวอร์ใช้ของจริง เสกไม่ได้ — เปิดด้วย ?demo'); return false; }
    hooks.refreshHud?.(); hooks.toast('🧸 ไม้ตกแมว บอลกระดิ่ง หนูของเล่น + แชมพูหอม 3 ขวด'); return true;
  });
  add('😿 ทุกตัวหิว + มอม + ง่วง', () => { debugNeeds(15); hooks.toast('😿 ทุกตัวหิว มอม ง่วงแล้ว (น้องตัวอย่างไม่มีค่าจริง)'); return true; });
  add('😺 ทุกตัวอิ่ม สะอาด สดชื่น', () => { debugNeeds(100); hooks.toast('😺 ทุกตัวเต็มหลอดแล้ว'); return true; });
  add('🧹 ล้างอาหารในชามทุกใบ', () => { debugClearDishes(); for (const k of hooks.kits() || []) k.dish = null; hooks.toast('🧹 ชามว่างทุกใบ'); return true; });

  // ── สั่งท่า (ห้องเลี้ยง) ──
  add('🍽 เทอาหารให้ทุกตัว (ไม่หักกระเป๋า)', () => {
    if (!inNursery()) return false;
    for (const k of hooks.kits()) {
      if (k.bowl == null) continue;
      if (!k.cat.demoLv) pourBowl(k.cat.id, 'fish', 1);
      callToBowl(hooks.kits(), k.cat.id, 'fish');
    }
    return true;
  });
  add('🛁 ส่งตัวแรกไปอาบน้ำ', () => { const k = inNursery() && hooks.kits()[0]; return !!k && callToTub(hooks.kits(), k.cat.id); });
  add('🧗 ทุกตัวไปปีนคอนโด', () => inNursery() && debugKits(hooks.kits(), 'climb') > 0);
  add('🦘 ทุกตัวกระโดดเล่น', () => inNursery() && debugKits(hooks.kits(), 'jump') > 0);
  add('🏃 ทุกตัววิ่งจู๊ดข้ามห้อง', () => inNursery() && debugKits(hooks.kits(), 'run') > 0);
  add('🪜 ตัวหนึ่งไต่ชั้นผนัง → เปลญวน', () => inNursery() && debugKits(hooks.kits(), 'shelves') > 0);
  add('💧 ตัวหนึ่งไปดื่มน้ำ', () => inNursery() && debugKits(hooks.kits(), 'drink') > 0);
  add('🚽 ตัวหนึ่งเข้าห้องน้ำแมว', () => inNursery() && debugKits(hooks.kits(), 'litter') > 0);

  // โผล่เฉพาะห้องนอน/ห้องเลี้ยง
  setInterval(() => box.classList.toggle('off', !hooks.visible()), 400);
  box.classList.toggle('off', !hooks.visible());
}
