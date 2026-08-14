// src/input.js
// รับอินพุตแล้วยิง callback ออกไป — ไฟล์นี้ไม่รู้จักเกมเลยแม้แต่นิดเดียว
// ทำแบบนี้เพื่อให้เปลี่ยนปุ่มหรือเพิ่ม gamepad ทีหลังได้โดยไม่ต้องแตะโค้ดเกม

const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW'];
const SLIDE_KEYS = ['ArrowDown', 'KeyS'];
const PAUSE_KEYS = ['Escape', 'KeyP'];

export function setupInput(stageEl, handlers) {
  const { onConfirm, onSlideStart, onSlideEnd, onTogglePause = () => {} } = handlers;

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
  });

  window.addEventListener('keyup', (e) => {
    if (SLIDE_KEYS.includes(e.code)) onSlideEnd();
  });

  // แตะที่จอ = กระโดด (ยกเว้นตอนแตะบนแผงเมนูหรือปุ่มมือถือ)
  stageEl.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.panel, .touchpad')) return;
    onConfirm();
  });

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

  hold('btnJump', onConfirm, () => {});
  hold('btnSlide', onSlideStart, onSlideEnd);
}
