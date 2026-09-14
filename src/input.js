// src/input.js
// รับอินพุตแล้วยิง callback ออกไป — ไฟล์นี้ไม่รู้จักเกมเลยแม้แต่นิดเดียว
// ทำแบบนี้เพื่อให้เปลี่ยนปุ่มหรือเพิ่ม gamepad ทีหลังได้โดยไม่ต้องแตะโค้ดเกม

const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW'];
const SLIDE_KEYS = ['ArrowDown', 'KeyS'];
const PAUSE_KEYS = ['Escape', 'KeyP'];
// ท่าพิเศษของพรสวรรค์ — ปุ่มที่มือซ้ายเอื้อมถึงโดยไม่ต้องละจากลูกศร/Space
const SKILL_KEYS = ['KeyE', 'KeyX', 'ShiftLeft', 'ShiftRight'];

export function setupInput(stageEl, handlers) {
  const {
    onConfirm, onSlideStart, onSlideEnd, onTogglePause = () => {},
    // ปล่อยปุ่มกระโดด — พรสวรรค์ที่ต้องกดค้าง (ร่อน / บังคับกลางอากาศ) ต้องรู้ว่าปล่อยเมื่อไหร่
    onJumpEnd = () => {},
    onSkill = () => {},
  } = handlers;

  window.addEventListener('keydown', (e) => {
    if (JUMP_KEYS.includes(e.code)) {
      e.preventDefault();
      if (!e.repeat) onConfirm();   // e.repeat กันการกดค้างแล้วกระโดดรัว
    }
    if (SLIDE_KEYS.includes(e.code)) {
      e.preventDefault();
      onSlideStart();
    }
    if (PAUSE_KEYS.includes(e.code)) {
      e.preventDefault();
      if (!e.repeat) onTogglePause();
    }
    if (SKILL_KEYS.includes(e.code) && !e.repeat) onSkill();
  });

  window.addEventListener('keyup', (e) => {
    if (SLIDE_KEYS.includes(e.code)) onSlideEnd();
    if (JUMP_KEYS.includes(e.code)) onJumpEnd();
  });

  // จอสัมผัสมีปุ่มกระโดด/หมอบลอยอยู่ในจอให้อยู่แล้ว จึงไม่รับการแตะที่พื้นจอ
  // ไม่งั้นนิ้วที่วางพักไว้ หรือแตะเพื่อจะกดปุ่มอื่น กลายเป็นสั่งกระโดดทั้งหมด
  //
  // ใช้เงื่อนไขเดียวกับกฎที่โชว์ .touchpad ใน style.css เป๊ะ ๆ — ถ้าเครื่องไหน
  // เห็นปุ่ม เครื่องนั้นต้องแตะพื้นจอไม่ได้ ทั้งสองอย่างจึงเปิดปิดพร้อมกันเสมอ
  // เช็คตอนเกิดอีเวนต์ ไม่ใช่ตอนโหลด เผื่อเสียบเมาส์เข้ากับแท็บเล็ตกลางคัน
  const touchpadShown = window.matchMedia('(hover: none) and (pointer: coarse)');

  // .hud-top คือแถบทอง/ปุ่มหยุด/เสียง ที่ย้ายเข้ามาอยู่ในเวทีแล้ว
  // ถ้าไม่กันไว้ คลิกปุ่มหยุดบนคอมจะเด้งขึ้นมาถึง stage แล้วสั่งกระโดดพ่วงไปด้วย
  stageEl.addEventListener('pointerdown', (e) => {
    if (touchpadShown.matches) return;
    if (e.target.closest('.panel, .touchpad, .hud-top, .skillpad')) return;
    onConfirm();
  });
  // ปล่อยคลิกที่ไหนก็ได้ = ปล่อยปุ่มกระโดด (ลากเมาส์ออกนอกเวทีแล้วปล่อยก็ต้องนับ)
  window.addEventListener('pointerup', () => { if (!touchpadShown.matches) onJumpEnd(); });

  const hold = (id, down, up) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); down(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) =>
      el.addEventListener(t, up)
    );
    // ปุ่มหมอบต้องกดค้าง ซึ่งบน Android ตีความเป็น long-press แล้วเด้งเมนูขึ้นมา
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  };

  hold('btnJump', onConfirm, onJumpEnd);
  hold('btnSlide', onSlideStart, onSlideEnd);
  hold('btnSkill', onSkill, () => {});
}
