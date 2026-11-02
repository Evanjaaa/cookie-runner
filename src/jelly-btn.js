// src/jelly-btn.js
// ─────────────────────────────────────────────────────────────
// ปุ่มเยลลี่ (ผู้ใช้ 2 พ.ย. 2026 — ต้นแบบที่ปุ่มร้านเหมียวบนหน้าแรก ถ้าผ่านจะใช้กับทุกปุ่มในหน้าแรก)
//
//   กดค้าง = ยุบแบนแบบเยลลี่ (.jelly-press) · ปล่อย = เด้งดึ๋งกลับ ยืด-หด-ยืด แล้วนิ่ง (.jelly-boing)
//   เมาส์ชี้ (คอม) = สั่นดึ๋งเบา ๆ หนึ่งที (.jelly-wiggle)
//   หน้าตา/ท่าทั้งหมดอยู่ใน style.css (กฎ .jelly) — ไฟล์นี้แค่ใส่-ถอดคลาสตามจังหวะนิ้ว
//
// ── ทำไมต้องเลื่อนคลิกออกไปนิดหนึ่ง ──
// ปุ่มหน้าแรกถูกซ่อนทันทีที่หน้าต่างย่อยเปิดทับ ถ้าปล่อยคลิกผ่านทันที ท่าเด้งตอนปล่อยนิ้วจะไม่มีใครได้เห็นเลย
// จึงรอ JELLY_DELAY ให้ปุ่มเด้งขึ้นก่อน แล้วค่อยส่งคลิกต่อให้ตัวจัดการเดิมของปุ่ม (ไม่ต้องแก้โค้ดเปิดหน้าต่างทีละปุ่ม)
// ─────────────────────────────────────────────────────────────

const JELLY_DELAY = 150;   // ms — นานพอให้เห็นเด้งขึ้น ไม่นานจนรู้สึกว่าปุ่มหน่วง
const SHAPES = ['jelly-boing', 'jelly-wiggle'];

/** เล่นท่าใหม่ตั้งแต่ต้น (ถอดคลาสแล้วบังคับคำนวณผังก่อนใส่คืน — ไม่งั้นเบราว์เซอร์ไม่เริ่มท่าซ้ำ) */
function play(el, kind) {
  el.classList.remove(...SHAPES);
  void el.offsetWidth;
  el.classList.add(kind);
}

export function initJelly() {
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest?.('.jelly');
    if (!el || el.disabled) return;
    el.classList.remove(...SHAPES);
    el.classList.add('jelly-press');
  }, true);

  // ปล่อยนิ้วที่ไหนก็ได้ (ลากออกนอกปุ่มก็ยังเด้งกลับ ไม่ค้างแบน)
  const release = () => {
    for (const el of document.querySelectorAll('.jelly.jelly-press')) {
      el.classList.remove('jelly-press');
      play(el, 'jelly-boing');
    }
  };
  window.addEventListener('pointerup', release, true);
  window.addEventListener('pointercancel', release, true);
  window.addEventListener('blur', release);

  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest?.('.jelly');
    if (!el || el.contains(e.relatedTarget) || el.classList.contains('jelly-press')) return;
    play(el, 'jelly-wiggle');
  }, true);

  document.addEventListener('animationend', (e) => {
    const el = e.target;
    if (el.classList?.contains('jelly') && (e.animationName === 'jellyBoing' || e.animationName === 'jellyWiggle')) {
      el.classList.remove(...SHAPES);
    }
  }, true);

  // คลิกจริงจากนิ้ว/เมาส์/คีย์บอร์ด → พักไว้ JELLY_DELAY แล้วส่งคลิกใหม่ให้ปุ่ม (คลิกที่ส่งเองไม่ใช่ isTrusted จึงผ่านตรงนี้ไปเลย)
  // กดรัวระหว่างรอ = นับเป็นครั้งเดียว ไม่เปิดหน้าต่างซ้ำ
  document.addEventListener('click', (e) => {
    const el = e.target.closest?.('.jelly');
    if (!el || !e.isTrusted) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    if (el._jellyT) return;
    el._jellyT = setTimeout(() => { el._jellyT = 0; el.click(); }, JELLY_DELAY);
  }, true);
}
