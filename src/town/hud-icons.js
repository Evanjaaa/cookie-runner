// src/town/hud-icons.js
// ─────────────────────────────────────────────────────────────
// ไอคอนปุ่มรอบจอของเมือง/ปราสาท/บ้าน (ผู้ใช้ 15 พ.ย. 2026 — ส่งแบบ UI ใหม่)
//   เทมเพลตวุ้นใสชุดเดียวกับไอคอนแถบบนหน้าแรก (.ico-jelly ใน index.html): ขอบเข้ม → เนื้อวุ้นไล่สี → แสงฟุ้งก้น → แสงขาวมุมบน + จุดประกาย
//   แต่ "เล่นสีต่างจากหน้าแรก" — หน้าแรกเป็นวุ้นชมพู · หน้านี้เป็นวุ้นลาเวนเดอร์ไล่ม่วง ขอบม่วงพลัม แต้มชมพู/ทอง/มิ้นต์
//   ปุ่มแชต = วุ้นชมพู (ตามแบบ) · ปุ่มท่าทาง/วิ่งในวงผ่าครึ่ง = ไอคอนเล็กสีอ่อนในแต่ละซีก
// ใส่ลงปุ่มด้วย data-ico="ชื่อ" (initHudIcons) — ปุ่ม/การกดใช้กฎเดิมใน town.css
// ─────────────────────────────────────────────────────────────
const PAL = {
  lav: { b: ['#F3E8FF', '#C9AAFF', '#9874EA'], line: '#5A2E9A', glow: '#FDF6FF' },
  pink: { b: ['#FFD3E8', '#FF9CCB', '#E8609F'], line: '#A22E6C', glow: '#FFEAF5' },
  mint: { b: ['#E2FBF2', '#A7E9D2', '#5FC3A4'], line: '#2E7F69', glow: '#F2FFFA' },
  peach: { b: ['#FFF1D2', '#FFC98C', '#EE9A4E'], line: '#A55A1E', glow: '#FFF8E8' },
  trio: { b: ['#FFF0B8', '#FFC4E1', '#C9AEFF'], line: '#9A62B8', glow: '#FFFFFF' },   // จอยอุ้งเท้า: เหลือง → ชมพู → ม่วง
};
let uid = 0;
/**
 * วุ้นหนึ่งชิ้น · shapes = รูปทรงเติมสี · tubes = เส้นหนาแบบท่อวุ้น (ไม้แขวน) · shine = แสงขาวมุมบน (ตัดตามรูป) · after = รายละเอียดทับ
 */
function jelly(pal, { shapes = '', tubes = '', shine = '', after = '', line = true }) {
  const P = PAL[pal], id = 'h' + (uid++);
  const tubeOut = tubes ? `<g fill="none" stroke="${P.line}" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round">${tubes}</g>` : '';
  const tubeIn = tubes ? `<g fill="none" stroke="url(#${id}B)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${tubes}</g>
    <g fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".9" stroke-linecap="round" stroke-linejoin="round" transform="translate(-.5 -.6)">${tubes}</g>` : '';
  return `<svg viewBox="0 0 32 32" aria-hidden="true">
  <defs>
    <linearGradient id="${id}B" gradientUnits="userSpaceOnUse" x1="0" y1="4" x2="0" y2="29">
      <stop offset="0" stop-color="${P.b[0]}" stop-opacity=".95"/><stop offset=".55" stop-color="${P.b[1]}" stop-opacity=".9"/><stop offset="1" stop-color="${P.b[2]}" stop-opacity=".95"/>
    </linearGradient>
    <radialGradient id="${id}G" gradientUnits="userSpaceOnUse" cx="16" cy="30" r="13">
      <stop offset="0" stop-color="${P.glow}" stop-opacity=".85"/><stop offset="1" stop-color="${P.glow}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}W" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".92"/><stop offset="1" stop-color="#fff" stop-opacity=".06"/></linearGradient>
    ${shapes ? `<clipPath id="${id}C">${shapes}</clipPath>` : ''}
  </defs>
  ${shapes ? `${line ? `<g fill="none" stroke="${P.line}" stroke-width="2.3" stroke-linejoin="round">${shapes}</g>` : ''}<g fill="url(#${id}B)">${shapes}</g><g fill="url(#${id}G)">${shapes}</g>
  <g clip-path="url(#${id}C)" fill="url(#${id}W)">${shine}</g>` : ''}
  ${tubeOut}${tubeIn}${after}
</svg>`;
}
const dots = (x, y) => `<circle cx="${x}" cy="${y}" r="1" fill="#fff"/><circle cx="${x + 1.8}" cy="${y - 1}" r=".5" fill="#fff"/>`;
const L = PAL.lav.line;

export const HUD_ICONS = {
  // ประตูโค้งไม้ม่วง + ลูกบิดทอง + อุ้งเท้า (ออก/กลับหน้าแรก)
  door: jelly('lav', {
    shapes: '<path d="M7.8 28.4V13.6a8.2 8.2 0 0 1 16.4 0v14.8Z"/>',
    shine: '<ellipse cx="12.4" cy="10.6" rx="4.6" ry="1.7" transform="rotate(-36 12.4 10.6)"/>',
    after: `<path d="M11 28.2V15a5 5 0 0 1 10 0v13.2" fill="none" stroke="${L}" stroke-width=".9" opacity=".45"/>
      <circle cx="19.6" cy="20.4" r="1.5" fill="#FFD86B" stroke="#B9822A" stroke-width=".6"/>
      <path d="M16 14.6c1.3 0 2.3.9 2.3 1.9 0 .8-.7 1.2-1.2 1-.4-.1-.7-.3-1.1-.3s-.7.2-1.1.3c-.5.2-1.2-.2-1.2-1 0-1 1-1.9 2.3-1.9Z M13.4 13.4a.8 1 0 1 0 0 .1Z M15.1 11.9a.8 1 0 1 0 0 .1Z M16.9 11.9a.8 1 0 1 0 0 .1Z M18.6 13.4a.8 1 0 1 0 0 .1Z" fill="#FFD3E8"/>
      <path d="M5.6 28.6h20.8" stroke="${L}" stroke-width="1.6" stroke-linecap="round"/>${dots(9.6, 17.6)}`,
  }),
  // ไม้แขวนเสื้อหูแมว (ห้องแต่งตัว)
  hanger: jelly('lav', {
    tubes: '<path d="M13.4 9.6a2.6 2.6 0 1 1 3.9 2.3c-.8.4-1.3 1-1.3 1.9v1.4"/><path d="M16 15.4 4.9 23.9c-1 .8-.5 2.4.8 2.4h20.6c1.3 0 1.8-1.6.8-2.4Z"/>',
    after: `<path d="M12.2 9.4 11.6 5.6l2.6 1.9M19.8 9.4l.6-3.8-2.6 1.9" fill="#FFB8DA" stroke="${L}" stroke-width="1" stroke-linejoin="round"/>
      <circle cx="16" cy="20.6" r="1.4" fill="#FF8FC0"/>${dots(7.2, 22.4)}`,
  }),
  // แผนที่ปราสาท (พับสามทบ หมุดหัวใจ)
  map: jelly('lav', {
    shapes: '<path d="M3.8 8.8l7.8-2.7 8.8 2.7 7.8-2.7v18.8l-7.8 2.7-8.8-2.7-7.8 2.7Z"/>',
    shine: '<ellipse cx="9" cy="9.2" rx="5.4" ry="1.5" transform="rotate(-19 9 9.2)"/>',
    after: `<path d="M11.6 6.1l8.8 2.7v18.8l-8.8-2.7Z" fill="#fff" opacity=".28"/>
      <path d="M11.6 6.1v18.8M20.4 8.8v18.8" stroke="${L}" stroke-width=".85" opacity=".5"/>
      <path d="M6.6 22.2c2.8-.4 3.2-4.4 6.6-4.8s4.4 2.6 7.4.9" fill="none" stroke="#fff" stroke-width="1.3" stroke-dasharray="1.6 1.4" stroke-linecap="round"/>
      <path d="M22.4 19.6s-4.3-3.9-4.3-6.9a4.3 4.3 0 0 1 8.6 0c0 3-4.3 6.9-4.3 6.9Z" fill="#FF8FC0" stroke="#A22E6C" stroke-width=".9" stroke-linejoin="round"/>
      <path d="M22.4 15s-1.7-1-1.7-2.15a.86.86 0 0 1 1.7-.44.86.86 0 0 1 1.7.44c0 1.15-1.7 2.15-1.7 2.15Z" fill="#fff"/>${dots(5.8, 11.4)}`,
  }),
  // กล้องถ่ายรูป (เลนส์ม่วงเข้ม แสงวาว แฟลชชมพู)
  camera: jelly('lav', {
    shapes: '<path d="M10.4 9.6l1.9-3.2h7.4l1.9 3.2Z"/><rect x="3.4" y="9.4" width="25.2" height="17" rx="4"/>',
    shine: '<ellipse cx="10" cy="11.8" rx="5.6" ry="1.4"/>',
    after: `<circle cx="16" cy="18" r="6" fill="#fff" stroke="${L}" stroke-width="1"/>
      <circle cx="16" cy="18" r="4.2" fill="#6A3FB0"/><circle cx="16" cy="18" r="2.2" fill="#9C7BE0"/>
      <circle cx="14.5" cy="16.5" r="1.2" fill="#fff" opacity=".9"/>
      <rect x="22.6" y="11.6" width="3.6" height="2.4" rx="1" fill="#FF8FC0" stroke="#A22E6C" stroke-width=".5"/>
      <path d="M5.6 15.4h3" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>${dots(6.2, 12.4)}`,
  }),
  // หัวแมว (รายชื่อสมาชิกในปราสาท) — ทรงเดียวกับไอคอนเพื่อนหน้าแรก สีใหม่
  cat: jelly('lav', {
    shapes: '<path d="M5.4 15.6C5.4 10 5.8 6.2 6.9 4.9 7.6 4.1 9.6 5.4 14 9.4Z"/><path d="M26.6 15.6C26.6 10 26.2 6.2 25.1 4.9 24.4 4.1 22.4 5.4 18 9.4Z"/><ellipse cx="16" cy="18.6" rx="11.8" ry="9.8"/>',
    shine: '<ellipse cx="12.6" cy="13" rx="7.6" ry="3.2" transform="rotate(-16 12.6 13)"/>',
    after: `<path d="M7.8 8.2 8.2 12.3l3.2-2.4ZM24.2 8.2 23.8 12.3l-3.2-2.4Z" fill="#FFD3E8" opacity=".95"/>
      <ellipse cx="11.4" cy="18.6" rx="2" ry="2.4" fill="#2A1044"/><ellipse cx="20.6" cy="18.6" rx="2" ry="2.4" fill="#2A1044"/>
      <circle cx="12.1" cy="17.7" r=".85" fill="#fff"/><circle cx="21.3" cy="17.7" r=".85" fill="#fff"/>
      <circle cx="8.3" cy="22.2" r="1.8" fill="#FF7FB8" opacity=".55"/><circle cx="23.7" cy="22.2" r="1.8" fill="#FF7FB8" opacity=".55"/>
      <path d="M14.9 21.4h2.2L16 22.6Z" fill="#B8236A" stroke="#B8236A" stroke-width=".8" stroke-linejoin="round"/>
      <path d="M13.7 23.6q1.15 1.2 2.3 0 1.15 1.2 2.3 0" fill="none" stroke="#2A1044" stroke-width="1.15" stroke-linecap="round"/>${dots(9.4, 13.4)}`,
  }),
  // เฟือง (ตั้งค่า) — ทรงเดียวกับหน้าแรก กลางทอง
  gear: jelly('lav', {
    shapes: [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="13.2" y="2.4" width="5.6" height="7" rx="1.6" transform="rotate(${a} 16 16)"/>`).join('') + '<circle cx="16" cy="16" r="9.6"/>',
    shine: '<ellipse cx="12.4" cy="10.4" rx="6.6" ry="2.6" transform="rotate(-28 12.4 10.4)"/>',
    after: `<circle cx="16" cy="16" r="4.6" fill="#FFD86B" stroke="#B9822A" stroke-width=".8"/><circle cx="14.8" cy="14.7" r="1.25" fill="#fff" opacity=".9"/>${dots(9.4, 11.6)}`,
  }),
  // แชต (วุ้นชมพูตามแบบ · จุดสามจุด)
  chat: jelly('pink', {
    shapes: '<path d="M7.4 5.6h17.2a4 4 0 0 1 4 4v9.6a4 4 0 0 1-4 4h-9l-6.4 5v-5H7.4a4 4 0 0 1-4-4V9.6a4 4 0 0 1 4-4Z"/>',
    shine: '<ellipse cx="12" cy="8.6" rx="6.4" ry="1.6"/>',
    after: `<circle cx="10.4" cy="14.6" r="1.9" fill="#fff"/><circle cx="16" cy="14.6" r="1.9" fill="#fff"/><circle cx="21.6" cy="14.6" r="1.9" fill="#fff"/>${dots(6.6, 10.4)}`,
  }),
  // กระเป๋าเป้วุ้น (ผู้ใช้ 15 พ.ย. 2026 "วาดเป็นไอคอนกระเป๋าใหม่") — หูหิ้วท่อวุ้น ฝาพับ กระเป๋าหน้าชมพูลายหัวใจ
  bag: jelly('lav', {
    tubes: '<path d="M12 9.4V7.6a4 4 0 0 1 8 0v1.8"/>',
    shapes: '<path d="M9 9.4h14a4 4 0 0 1 4 4v10.8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V13.4a4 4 0 0 1 4-4Z"/>',
    shine: '<ellipse cx="11.6" cy="12.2" rx="5.4" ry="1.5" transform="rotate(-12 11.6 12.2)"/>',
    after: `<path d="M5.4 15.6q10.6 4 21.2 0" fill="none" stroke="${L}" stroke-width=".9" opacity=".45"/>
      <rect x="10.6" y="18.6" width="10.8" height="7.2" rx="2.4" fill="#FFC3E0" stroke="${L}" stroke-width=".85"/>
      <path d="M16 24.4s-1.7-1-1.7-2.2a.9.9 0 0 1 1.7-.45.9.9 0 0 1 1.7.45c0 1.2-1.7 2.2-1.7 2.2Z" fill="#fff"/>
      <circle cx="16" cy="17.2" r="1.1" fill="#FFD86B" stroke="#B9822A" stroke-width=".5"/>${dots(8.2, 13.6)}`,
  }),
  // หน้าแมวเล็ก (ซีกท่าทาง) — มิ้นต์อ่อนตามแบบ
  emote: jelly('mint', {
    shapes: '<path d="M6 16C6 10.6 6.4 7 7.5 5.8 8.2 5 10.1 6.3 14.2 10Z"/><path d="M26 16C26 10.6 25.6 7 24.5 5.8 23.8 5 21.9 6.3 17.8 10Z"/><ellipse cx="16" cy="19" rx="11.2" ry="9.2"/>',
    shine: '<ellipse cx="12.4" cy="13.6" rx="6.6" ry="2.6" transform="rotate(-16 12.4 13.6)"/>',
    after: `<path d="M12 19.2q1-1.2 2 0M18 19.2q1-1.2 2 0" fill="none" stroke="#2E5F52" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="9.4" cy="22" r="1.6" fill="#FF8FC0" opacity=".55"/><circle cx="22.6" cy="22" r="1.6" fill="#FF8FC0" opacity=".55"/>
      <path d="M14.4 22.6q.8.9 1.6 0 .8.9 1.6 0" fill="none" stroke="#2E5F52" stroke-width="1" stroke-linecap="round"/>${dots(9.8, 14)}`,
  }),
  // ปุ่มลากจอย = อุ้งเท้าวุ้นสามสีพาสเทล (ผู้ใช้ 15 พ.ย. 2026) · ถั่วนิ้วชมพูอ่อน
  joypaw: jelly('trio', {
    line: false,   // ไม่มีเส้นขอบตัด (ผู้ใช้ 15 พ.ย.)
    shapes: '<path d="M16 14.6c4.8 0 8.9 3.6 8.9 7.5 0 2.9-2.6 4.4-4.8 3.8-1.6-.4-2.7-1.1-4.1-1.1s-2.5.7-4.1 1.1c-2.2.6-4.8-.9-4.8-3.8 0-3.9 4.1-7.5 8.9-7.5Z"/><ellipse cx="6.6" cy="12.4" rx="3.1" ry="3.7" transform="rotate(-22 6.6 12.4)"/><ellipse cx="12.2" cy="6.9" rx="3.2" ry="3.9"/><ellipse cx="19.8" cy="6.9" rx="3.2" ry="3.9"/><ellipse cx="25.4" cy="12.4" rx="3.1" ry="3.7" transform="rotate(22 25.4 12.4)"/>',
    shine: '<ellipse cx="12.6" cy="18.4" rx="4.4" ry="1.5" transform="rotate(-12 12.6 18.4)"/><ellipse cx="11.4" cy="5.6" rx="1.4" ry=".9"/><ellipse cx="19" cy="5.6" rx="1.4" ry=".9"/><ellipse cx="5.8" cy="11" rx="1.2" ry=".8"/><ellipse cx="24.6" cy="11" rx="1.2" ry=".8"/>',
    after: `<path d="M16 18.4c2.3 0 4.1 1.5 4.1 3.2" fill="none" stroke="#FFFFFF" stroke-width="1" stroke-linecap="round" opacity=".7"/>
      <ellipse cx="16" cy="21.6" rx="3.6" ry="2.4" fill="#FFB3D6" opacity=".55"/>${dots(9.6, 17.8)}`,
  }),
  // อุ้งเท้า (ซีกวิ่ง/เดิน) — พีชตามแบบ
  run: jelly('peach', {
    shapes: '<path d="M16 15.8c4.4 0 8.2 3.4 8.2 6.9 0 2.7-2.4 4-4.4 3.5-1.5-.3-2.5-1-3.8-1s-2.3.7-3.8 1c-2 .5-4.4-.8-4.4-3.5 0-3.5 3.8-6.9 8.2-6.9Z"/><ellipse cx="7.3" cy="13" rx="2.9" ry="3.5" transform="rotate(-20 7.3 13)"/><ellipse cx="12.5" cy="7.9" rx="3" ry="3.7"/><ellipse cx="19.5" cy="7.9" rx="3" ry="3.7"/><ellipse cx="24.7" cy="13" rx="2.9" ry="3.5" transform="rotate(20 24.7 13)"/>',
    shine: '<ellipse cx="13" cy="19" rx="4" ry="1.4" transform="rotate(-12 13 19)"/><ellipse cx="11.6" cy="6.6" rx="1.3" ry=".8"/><ellipse cx="18.6" cy="6.6" rx="1.3" ry=".8"/>',
    after: `<path d="M16 19.4c2 0 3.6 1.4 3.6 2.8" fill="none" stroke="#FFD3E8" stroke-width="1" stroke-linecap="round" opacity=".8"/>`,
  }),
};

/** ใส่ไอคอนลงทุกปุ่มที่มี data-ico */
export function initHudIcons(root = document) {
  for (const el of root.querySelectorAll('[data-ico]')) {
    const svg = HUD_ICONS[el.dataset.ico];
    if (svg) el.innerHTML = svg;
  }
}
