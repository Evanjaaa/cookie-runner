// src/input.js
// รับอินพุตแล้วยิง callback ออกไป — ไฟล์นี้ไม่รู้จักเกมเลยแม้แต่นิดเดียว
// ทำแบบนี้เพื่อให้เปลี่ยนปุ่มหรือเพิ่ม gamepad ทีหลังได้โดยไม่ต้องแตะโค้ดเกม

const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW'];
const SLIDE_KEYS = ['ArrowDown', 'KeyS'];

export function setupInput(stageEl, handlers) {
  const { onConfirm, onSlideStart, onSlideEnd } = handlers;

  window.addEventListener('keydown', (e) => {
    if (JUMP_KEYS.includes(e.code)) {
      e.preventDefault();
      if (!e.repeat) onConfirm();   // e.repeat กันการกดค้างแล้วกระโดดรัว
    }
    if (SLIDE_KEYS.includes(e.code)) {
      e.preventDefault();
      onSlideStart();
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
  };

  hold('btnJump', onConfirm, () => {});
  hold('btnSlide', onSlideStart, onSlideEnd);
}
