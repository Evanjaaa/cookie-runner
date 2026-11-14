// src/fit-labels.js
// ─────────────────────────────────────────────────────────────
// ชื่อปุ่มย่อเองให้พอดีกรอบ (ผู้ใช้ 14 พ.ย. 2026: "บ้านลูกเหมียว" ล้นกรอบปุ่ม — ทุกปุ่มที่เป็นแบบนี้)
//
// ใช้กับชื่อใต้ไอคอนปุ่มเมนู (.lobby-btn b) ทุกปุ่ม รวมปุ่มใหญ่แถวล่าง (ปราสาทออนไลน์ · บ้านของฉัน)
// วิธี: ล้างขนาดที่เคยย่อ → วัดความกว้างจริงของชื่อ (scrollWidth) เทียบช่องในปุ่ม → ยาวเกิน = ย่อตามสัดส่วนพอดี
//   ไม่ย่อเล็กกว่า MIN ของขนาดเดิม (เล็กกว่านั้นอ่านไม่ออก) · ชื่อสั้นอยู่แล้วไม่แตะ
// วัดใหม่เมื่อ: ปุ่มเปลี่ยนขนาด (หมุนจอ/ย่อหน้าต่าง/ปุ่มเพิ่งโผล่จากซ่อน) · ฟอนต์โหลดเสร็จ · ข้อความเปลี่ยน (สลับภาษา)
// ─────────────────────────────────────────────────────────────
const SEL = '.lobby-btn b';
const MIN = 0.6;    // ย่อได้ต่ำสุด 60% ของขนาดตาม CSS
const PAD = 6;      // เว้นขอบซ้าย-ขวาในปุ่มรวมกัน (px) ไม่ให้ตัวหนังสือแตะขอบกรอบ

function fit(b) {
  const btn = b.closest('.lobby-btn');
  if (!btn) return;
  b.style.fontSize = '';
  const room = btn.clientWidth - PAD;
  if (room <= 0) return;   // ปุ่มซ่อนอยู่ — วัดใหม่ตอนโผล่ (ResizeObserver)
  const need = b.scrollWidth;
  if (need <= room) return;
  const base = parseFloat(getComputedStyle(b).fontSize) || 12;
  b.style.fontSize = Math.max(base * MIN, base * (room / need) * 0.98).toFixed(2) + 'px';
}

export function fitLabels(root = document) {
  for (const b of root.querySelectorAll(SEL)) fit(b);
}

/** เริ่มคอยปรับชื่อปุ่มทุกปุ่ม (เรียกครั้งเดียวตอนเปิดเกม) */
export function initFitLabels() {
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fitLabels(); }); };
  const ro = new ResizeObserver(later);
  for (const btn of document.querySelectorAll('.lobby-btn')) ro.observe(btn);
  // ข้อความในชื่อเปลี่ยน (สลับภาษา) — ดูเฉพาะตัวชื่อปุ่ม ไม่ดูทั้งหน้า (หน้าเกมเปลี่ยนตัวเลขทุกเฟรม ห้ามวัดตาม)
  const mo = new MutationObserver(later);
  for (const b of document.querySelectorAll(SEL)) mo.observe(b, { subtree: true, childList: true, characterData: true });
  document.fonts?.ready.then(later);
  window.addEventListener('resize', later);
  later();
}
