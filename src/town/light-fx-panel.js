// src/town/light-fx-panel.js
// ─────────────────────────────────────────────────────────────
// แผงทดลองชั้นแสง บนดาดฟ้าชั้น 3 (ผู้ใช้ 16 พ.ย. 2026: "อยู่ลิงก์เดียวกัน มีปุ่มเปิดปิดเอฟเฟกต์ + แดดเย็น กลางวัน กลางคืน ไม่ต้องเปลี่ยนลิงก์")
//   ความแรงแสงอยู่ในหน้าตั้งค่า (หัวข้อ "ภาพ") · แผงนี้ = เวลา (ตามจริง / กลางวัน / แดดเย็น / กลางคืน — castle-sky.js)
//   โผล่เฉพาะตอนอยู่ดาดฟ้า · เฉพาะ dev server หรือเปิดด้วย ?fxpanel (ของทดลอง — ผู้เล่นจริงยังไม่เห็น)
//   ปุ่มตามกฎหน้าย่อย: วุ้นใส ไม่มีฐานเข้ม กดแล้วสว่างลดนิดเดียว · ปุ่มที่เลือก = ชมพู
// ─────────────────────────────────────────────────────────────
import { setForcedHour, forcedHour } from './castle-sky.js';

const CSS = `
.fxp { position: fixed; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 58px); transform: translateX(-50%); z-index: 6;
  display: flex; flex-direction: column; gap: 5px; padding: 7px 9px; border-radius: 16px;
  background: rgba(255,255,255,.55); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
  box-shadow: 0 6px 18px -8px rgba(80,40,140,.45), inset 0 1px 1px rgba(255,255,255,.9); font-family: Mali, sans-serif; }
.fxp.off { display: none; }
.fxp-row { display: flex; align-items: center; gap: 4px; }
.fxp-row > b { min-width: 3.4em; color: #6B4FA0; font-size: 12px; font-weight: 700; }
.fxp button { border: 1px solid rgba(255,255,255,.85); border-radius: 999px; padding: 4px 10px; cursor: pointer;
  background: linear-gradient(180deg, rgba(240,232,255,.95), rgba(214,196,244,.9)); color: #5E3A8F; font: 700 12px Mali, sans-serif;
  box-shadow: inset 0 1px 2px rgba(255,255,255,.9), 0 3px 8px -5px rgba(90,50,150,.5); touch-action: manipulation; }
.fxp button:active { filter: brightness(.93); }
.fxp button.on { background: radial-gradient(circle at 35% 25%, rgba(255,255,255,.55), rgba(255,160,200,.92) 45%, rgba(236,110,165,.97)); color: #FFFFFF; text-shadow: 0 1px 2px rgba(160,40,100,.45); }
@media (max-height: 520px) { .fxp { top: calc(env(safe-area-inset-top, 0px) + 46px); padding: 5px 7px; } .fxp button { padding: 3px 8px; font-size: 11px; } .fxp-row > b { font-size: 11px; } }
`;
const TIMES = [[null, 'ตามจริง'], [11, 'กลางวัน'], [17.6, 'แดดเย็น'], [21, 'กลางคืน']];

/** hooks: { visible() → อยู่ดาดฟ้าไหม } */
export function mountLightPanel(hooks) {
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const box = document.createElement('div');
  box.className = 'fxp off';
  box.setAttribute('aria-label', 'ทดลองเอฟเฟกต์แสง');
  const row = (title, list, cur, set) => {
    const r = document.createElement('div');
    r.className = 'fxp-row';
    const b = document.createElement('b'); b.textContent = title; r.append(b);
    const btns = list.map(([v, label]) => {
      const x = document.createElement('button');
      x.type = 'button'; x.textContent = label;
      x.addEventListener('click', (e) => { e.stopPropagation(); set(v); paint(); });
      x.addEventListener('pointerdown', (e) => e.stopPropagation());
      r.append(x);
      return [v, x];
    });
    return { r, paint: () => { for (const [v, x] of btns) x.classList.toggle('on', v === cur()); } };
  };
  // ระดับแสงย้ายไปหน้าตั้งค่าแล้ว (ผู้ใช้ 16 พ.ย.) — แผงนี้เหลือแค่สลับเวลาไว้เทส
  const b = row('เวลา', TIMES, forcedHour, setForcedHour);
  box.append(b.r);
  document.body.appendChild(box);
  function paint() { b.paint(); }
  paint();
  const sync = () => { box.classList.toggle('off', !hooks.visible()); paint(); };
  setInterval(sync, 300);
  sync();
}
