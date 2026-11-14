// ไอคอนปุ่มเมนูหน้าแรก (ร้านเหมียว ตู้กาช่า การ์ดพลัง คลังน้อง กิจกรรม แผนที่ บ้านลูกเหมียว) — ผู้ใช้ 7 พ.ย. 2026
// สไตล์เดียวกับไอคอนวุ้นแถบบน (เพื่อน ข่าวสาร จดหมาย ตั้งค่า — .ico-jelly ใน index.html):
//   เส้นขอบเข้มรอบตัว → เนื้อวุ้นไล่สีบนลงล่าง → แสงฟุ้งก้นวุ้น → แสงขาวมุมบน (ตัดตามรูปทรง) → รายละเอียด + จุดประกาย
// เนื้อวุ้นไล่สามสี เหลืองอ่อน → ชมพู → ฟ้าอ่อน (ผู้ใช้ 7 พ.ย. 2026: ลองฟ้า → ชมพู → "ผสมสีไล่สีเล่นสี")
// รายละเอียดเล็ก ๆ ก็ใช้สามสีนี้สลับกัน (ลูกบอลกาช่า ดาว ริบบิ้น หมุด ฯลฯ)
// วาดเป็น SVG กรอบ 32×32 แล้วแปะลงผ้าใบเดิมของปุ่ม (main.js paintLobbyIcon) — ขนาด/เงาของปุ่มใช้กฎเดิมทั้งหมด

const P = {
  grad: [[0, '#FFEEA6'], [0.5, '#FF9ECB'], [1, '#8CCBF6']],   // มุมซ้ายบน → มุมขวาล่าง
  line: '#A0336F',     // เส้นขอบ (ชมพูเข้มชุดเดียวกับไอคอนแถบบน)
  glow: '#FFF6FB',     // แสงฟุ้งก้นวุ้น
  pink: '#E0559F', pinkSoft: '#FFD0E8',
  yel: '#FFD653', yelLine: '#D4951C', yelSoft: '#FFEFAE',
  blu: '#62B0EA', bluSoft: '#BDE3FF',
};

/**
 * ไอคอนวุ้นหนึ่งอัน
 * layers = รูปทรงที่วาดซ้อนกัน (ตัวหลังทับตัวหน้า) — แต่ละชั้นได้ขอบ + เนื้อ + แสงฟุ้งของตัวเอง
 * shine  = แสงขาวมุมบนของชั้นสุดท้าย (ตัดตามรูปทรงชั้นนั้น) · after = รายละเอียดวาดทับบนสุด
 */
function jelly(key, layers, { shine = '<ellipse cx="11.5" cy="9.5" rx="7" ry="2.3" transform="rotate(-24 11.5 9.5)"/>', after = '', under = '' } = {}) {
  const id = 'li' + key;
  const body = layers.map((shape, i) => `
    <g fill="none" stroke="${P.line}" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round">${shape}</g>
    <g fill="url(#${id}B)">${shape}</g>
    <g fill="url(#${id}G)">${shape}</g>
    ${i === layers.length - 1 ? `<g clip-path="url(#${id}C)" fill="url(#${id}W)">${shine}</g>` : ''}`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="152" height="152">
  <defs>
    <linearGradient id="${id}B" gradientUnits="userSpaceOnUse" x1="6" y1="3" x2="26" y2="29">
      ${P.grad.map(([o, c]) => `<stop offset="${o}" stop-color="${c}" stop-opacity=".96"/>`).join('')}
    </linearGradient>
    <radialGradient id="${id}G" gradientUnits="userSpaceOnUse" cx="16" cy="30" r="13">
      <stop offset="0" stop-color="${P.glow}" stop-opacity=".8"/>
      <stop offset="1" stop-color="${P.glow}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}W" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".95"/>
      <stop offset="1" stop-color="#fff" stop-opacity=".08"/>
    </linearGradient>
    <clipPath id="${id}C">${layers[layers.length - 1]}</clipPath>
  </defs>
  ${under}${body}${after}
</svg>`;
}

/** จุดประกายขาวคู่ (แบบไอคอนแถบบน) */
const dots = (x, y) => `<circle cx="${x}" cy="${y}" r="1" fill="#fff"/><circle cx="${x + 1.9}" cy="${y - 0.9}" r=".5" fill="#fff"/>`;
/** ประกายสี่แฉกเล็ก */
const twinkle = (x, y, r, fill = '#fff') =>
  `<path d="M${x} ${y - r}Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y}Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r}Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y}Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z" fill="${fill}"/>`;

// ── ร้านเหมียว: ร้านเล็กหลังคาผ้าใบหยัก ประตูกับหน้าต่าง ──
const AWNING = 'M3.6 10.6a3.4 3.4 0 0 1 3.4-3.4h18a3.4 3.4 0 0 1 3.4 3.4V13a2.48 2.48 0 0 1-4.96 0a2.48 2.48 0 0 1-4.96 0a2.48 2.48 0 0 1-4.96 0a2.48 2.48 0 0 1-4.96 0a2.48 2.48 0 0 1-4.96 0Z';
const SHOP = jelly('shop', [
  '<rect x="5.4" y="12.6" width="21.2" height="15.6" rx="2.4"/>',
  `<path d="${AWNING}"/>`,
], {
  shine: '<ellipse cx="11" cy="8.4" rx="7.4" ry="1.7"/>',
  after: `
    <clipPath id="liShopA"><path d="${AWNING}"/></clipPath>
    <g clip-path="url(#liShopA)" fill="#fff" opacity=".6">
      <rect x="8.56" y="6" width="4.96" height="10"/><rect x="18.48" y="6" width="4.96" height="10"/>
    </g>
    <rect x="13.2" y="18.6" width="5.6" height="9.6" rx="2.2" fill="${P.blu}" stroke="${P.line}" stroke-width=".6"/>
    <circle cx="17.3" cy="23.6" r=".75" fill="${P.yel}"/>
    <rect x="7.6" y="17.4" width="4.2" height="4.2" rx="1.1" fill="#fff" opacity=".78"/>
    <rect x="20.2" y="17.4" width="4.2" height="4.2" rx="1.1" fill="#fff" opacity=".78"/>
    <path d="M7.6 19.5h4.2M9.7 17.4v4.2M20.2 19.5h4.2M22.3 17.4v4.2" stroke="${P.pink}" stroke-width=".7" opacity=".7"/>
    ${dots(6.2, 10)}`,
});

// ── ตู้กาช่า: ตู้กลมหัวโดม ลูกบอลข้างใน ฐานมีช่องหยอดเหรียญ ──
const GACHA = jelly('gacha', [
  '<rect x="13" y="1.9" width="6" height="3" rx="1.2"/><circle cx="16" cy="12.6" r="9.2"/><path d="M9.2 20.6h13.6l1.7 6.1a1.9 1.9 0 0 1-1.8 2.4H9.3a1.9 1.9 0 0 1-1.8-2.4Z"/>',
], {
  shine: '<ellipse cx="12.4" cy="7.6" rx="5.2" ry="2" transform="rotate(-30 12.4 7.6)"/>',
  under: '',
  after: `
    <clipPath id="liGachaG"><circle cx="16" cy="12.6" r="7.6"/></clipPath>
    <g clip-path="url(#liGachaG)">
      <circle cx="11.6" cy="16.4" r="2.9" fill="${P.yel}"/>
      <circle cx="17.2" cy="17.4" r="2.9" fill="${P.blu}"/>
      <circle cx="21.6" cy="13.2" r="2.7" fill="${P.pink}" opacity=".85"/>
      <circle cx="15.6" cy="12" r="2.6" fill="#fff" opacity=".9"/>
      <circle cx="10.6" cy="11" r="2.3" fill="${P.bluSoft}"/>
      <circle cx="19.4" cy="8.6" r="2.2" fill="${P.yelSoft}"/>
    </g>
    <ellipse cx="12.6" cy="8.2" rx="3.4" ry="1.3" transform="rotate(-30 12.6 8.2)" fill="#fff" opacity=".75"/>
    <circle cx="16" cy="24.2" r="2.3" fill="${P.yel}" stroke="${P.yelLine}" stroke-width=".8"/>
    <path d="M16 23.1v2.2" stroke="${P.yelLine}" stroke-width="1" stroke-linecap="round"/>
    <rect x="12.6" y="27.3" width="6.8" height="1.4" rx=".7" fill="${P.pink}" opacity=".75"/>
    ${dots(9.6, 11.2)}`,
});

// ── การ์ดพลัง: การ์ดสองใบซ้อนเอียง ใบหน้ามีดาว ──
const TALENT = jelly('talent', [
  '<rect x="4.6" y="6.4" width="13.4" height="19" rx="2.6" transform="rotate(-13 11.3 15.9)"/>',
  '<rect x="13" y="6.6" width="13.4" height="19" rx="2.6" transform="rotate(9 19.7 16.1)"/>',
], {
  shine: '<ellipse cx="17.4" cy="9" rx="5" ry="1.5" transform="rotate(9 17.4 9)"/>',
  after: `
    <g transform="rotate(9 19.7 16.1)">
      <rect x="14.8" y="8.4" width="9.8" height="15.4" rx="1.6" fill="none" stroke="#fff" stroke-width=".8" opacity=".7"/>
      <path d="M19.7 11.2l1.45 2.95 3.25.47-2.35 2.29.56 3.24-2.91-1.53-2.91 1.53.56-3.24-2.35-2.29 3.25-.47Z" fill="${P.yel}" stroke="${P.line}" stroke-width=".8" stroke-linejoin="round"/>
    </g>
    ${twinkle(8.4, 12.6, 1.8)}
    ${twinkle(27.4, 5.2, 1.5, P.bluSoft)}
    ${dots(16.4, 9.8)}`,
});

// ── คลังน้อง: หีบสมบัติฟีลกระเป๋า (หูหิ้วบนฝา สายคาด ตัวล็อกรูปหัวใจ) ──
const STASH = jelly('stash', [
  '<rect x="4.4" y="13.6" width="23.2" height="14.6" rx="3.2"/><path d="M4.4 15.4v-2.6a6.2 6.2 0 0 1 6.2-6.2h10.8a6.2 6.2 0 0 1 6.2 6.2v2.6Z"/>',
], {
  shine: '<ellipse cx="11.6" cy="8.8" rx="6.4" ry="1.7"/>',
  under: `
    <path d="M11.6 7.4V5.8a2.6 2.6 0 0 1 2.6-2.6h3.6a2.6 2.6 0 0 1 2.6 2.6v1.6" fill="none" stroke="${P.line}" stroke-width="4.4" stroke-linecap="round"/>
    <path d="M11.6 7.4V5.8a2.6 2.6 0 0 1 2.6-2.6h3.6a2.6 2.6 0 0 1 2.6 2.6v1.6" fill="none" stroke="${P.yelSoft}" stroke-width="2" stroke-linecap="round"/>`,
  after: `
    <path d="M4.6 15.4h22.8" stroke="${P.line}" stroke-width=".9" opacity=".55"/>
    <path d="M9.6 6.9v21.2M22.4 6.9v21.2" stroke="${P.blu}" stroke-width="2.2" opacity=".55"/>
    <path d="M6.6 24.6h18.8" stroke="#fff" stroke-width=".8" stroke-dasharray="1.4 1.1" stroke-linecap="round" opacity=".75"/>
    <rect x="12.9" y="12.2" width="6.2" height="6.6" rx="1.8" fill="#fff" stroke="${P.line}" stroke-width=".85"/>
    <path d="M16 17.2s-1.9-1.15-1.9-2.45a1 1 0 0 1 1.9-.5 1 1 0 0 1 1.9.5c0 1.3-1.9 2.45-1.9 2.45Z" fill="${P.pink}"/>
    ${dots(6.8, 11.2)}`,
});

// ── กิจกรรม: กล่องของขวัญผูกโบว์ ──
const BOW = 'M16 10.5c-2.6-5-9.6-7-9.9-2.9c-.2 3.3 5.8 3.4 9.9 2.9Z M16 10.5c2.6-5 9.6-7 9.9-2.9c.2 3.3-5.8 3.4-9.9 2.9Z';
const QUEST = jelly('quest', [
  `<path d="${BOW}"/>`,
  '<rect x="5.6" y="15" width="20.8" height="13.2" rx="2.4"/><rect x="3.8" y="10.4" width="24.4" height="6" rx="2"/>',
], {
  shine: '<ellipse cx="10.6" cy="11.8" rx="5.6" ry="1.3"/>',
  after: `
    <rect x="13.9" y="10.4" width="4.2" height="17.8" fill="${P.bluSoft}"/>
    <rect x="15.3" y="10.4" width="1.4" height="17.8" fill="#fff" opacity=".8"/>
    <path d="M5.8 16.4h20.4" stroke="${P.line}" stroke-width=".8" opacity=".5"/>
    <path d="M13.9 10.4v17.8M18.1 10.4v17.8" stroke="${P.blu}" stroke-width=".6"/>
    <path d="M15.5 9.9c-2-2.6-5.6-3.8-5.9-1.9" fill="none" stroke="${P.pink}" stroke-width=".8" stroke-linecap="round" opacity=".7"/>
    <path d="M16.5 9.9c2-2.6 5.6-3.8 5.9-1.9" fill="none" stroke="${P.pink}" stroke-width=".8" stroke-linecap="round" opacity=".7"/>
    <circle cx="16" cy="10.5" r="1.9" fill="${P.yel}" stroke="${P.line}" stroke-width=".85"/>
    ${twinkle(27.6, 3.4, 1.6)}
    ${dots(7.4, 19.6)}`,
});

// ── แผนที่: แผนที่พับสามทบ เส้นทางประ หมุดปักหัวใจ ──
const MAP = jelly('map', [
  '<path d="M3.8 8.8l7.8-2.7 8.8 2.7 7.8-2.7v18.8l-7.8 2.7-8.8-2.7-7.8 2.7Z"/>',
], {
  shine: '<ellipse cx="9" cy="9.2" rx="5.4" ry="1.5" transform="rotate(-19 9 9.2)"/>',
  after: `
    <path d="M11.6 6.1l8.8 2.7v18.8l-8.8-2.7Z" fill="#fff" opacity=".28"/>
    <path d="M11.6 6.1v18.8M20.4 8.8v18.8" stroke="${P.line}" stroke-width=".85" opacity=".55"/>
    <path d="M6.6 22.2c2.8-.4 3.2-4.4 6.6-4.8s4.4 2.6 7.4.9" fill="none" stroke="#fff" stroke-width="1.3" stroke-dasharray="1.6 1.4" stroke-linecap="round"/>
    ${twinkle(6.4, 22.2, 1.7, P.yel)}
    <path d="M22.4 19.6s-4.3-3.9-4.3-6.9a4.3 4.3 0 0 1 8.6 0c0 3-4.3 6.9-4.3 6.9Z" fill="${P.pink}" stroke="${P.line}" stroke-width=".9" stroke-linejoin="round"/>
    <path d="M22.4 15s-1.7-1-1.7-2.15a.86.86 0 0 1 1.7-.44.86.86 0 0 1 1.7.44c0 1.15-1.7 2.15-1.7 2.15Z" fill="#fff"/>
    ${dots(5.8, 11.4)}`,
});

// ── บ้านลูกเหมียว (ผู้ใช้ 14 พ.ย. 2026 — แทนกล่องแมวบนพื้น): บ้านกล่องทรงหัวแมว หูสองข้าง ประตูโค้งมีเบาะ หนวด (ไม่มีป้ายกลางหน้า — ผู้ใช้ว่าดูเหมือนเอเลี่ยน) ──
const KHOUSE = jelly('khouse', [
  '<path d="M6.2 13.4L7.6 3.8l6.4 5.4Z M25.8 13.4L24.4 3.8l-6.4 5.4Z"/>',
  '<rect x="4.4" y="8.4" width="23.2" height="20" rx="4.6"/>',
], {
  shine: '<ellipse cx="11.4" cy="11" rx="6.2" ry="1.6" transform="rotate(-8 11.4 11)"/>',
  after: `
    <path d="M8.1 9.6l.7-3.9 2.9 2.6Z M23.9 9.6l-.7-3.9-2.9 2.6Z" fill="${P.pinkSoft}"/>
    <path d="M11.4 28.4v-5.2a4.6 4.6 0 0 1 9.2 0v5.2Z" fill="${P.line}" opacity=".78"/>
    <path d="M12.6 28.4v-4.9a3.4 3.4 0 0 1 6.8 0v4.9Z" fill="${P.yelSoft}"/>
    <ellipse cx="16" cy="27" rx="3.5" ry="1.3" fill="${P.pink}"/>
    <path d="M3 18.8l3 .5M2.8 21.6l3.1-.1M28.9 18.8l-3 .5M29.2 21.6l-3.1-.1" stroke="${P.line}" stroke-width=".9" stroke-linecap="round" opacity=".75"/>
    <circle cx="7.6" cy="25.2" r=".9" fill="#fff" opacity=".8"/><circle cx="6.6" cy="23.9" r=".45" fill="#fff" opacity=".8"/><circle cx="7.6" cy="23.5" r=".45" fill="#fff" opacity=".8"/><circle cx="8.5" cy="23.9" r=".45" fill="#fff" opacity=".8"/>
    ${twinkle(28.2, 6.2, 1.6, P.yel)}
    ${dots(23.4, 24.6)}`,
});

// ══ ไอคอนพิเศษปุ่มใหญ่แถวล่าง (ผู้ใช้ 14 พ.ย. 2026) ══════════════════════════════
// วุ้นใสเด้งชุดเดียวกับไอคอนเมนู แต่สีไล่ชุดพิเศษ (ทองครีม → ชมพู → ลาเวนเดอร์ → ฟ้า) ขอบม่วงเข้มเข้ากับตัวหนังสือปุ่ม (#6B3FB5)
// เส้นขอบบางกว่าไอคอนเมนู (ผู้ใช้ 14 พ.ย.: "ลดความหนาเส้นขอบตัด") + ขอบในขาวบาง ๆ รอบทุกชิ้น (ดูเป็นวุ้นหนาขึ้น) · ใหญ่กว่าไอคอนอื่น — วางบนผ้าใบปุ่มใหญ่ (main.js paintDockIcon) ยื่นพ้นขอบบนปุ่ม
// กรอบกว้างกว่าสูง (vb) ให้ปราสาท/ห้องนอนไม่โดนบีบ
const SP = {
  castle: { grad: [[0, '#FFF3B0'], [0.32, '#FFB9DE'], [0.66, '#C4A3FF'], [1, '#86D9F5']], line: '#5E2F9E', glow: '#FFFFFF' },
  myhome: { grad: [[0, '#FFE9B8'], [0.35, '#FFB8CF'], [0.7, '#E9A0F0'], [1, '#A9B4FF']], line: '#6A2E95', glow: '#FFF8FD' },
};
function special(key, [W, H], layers, { shine, after = '' }) {
  const id = 'sp' + key, pal = SP[key];
  // วุ้นใสนุ่มเด้งแบบไอคอนเมนู (ผู้ใช้ 15 พ.ย. 2026): ทุกชิ้นมีแสงวาวขาวช่วงบน + แสงฟุ้งก้น + ขอบในขาว · ชิ้นบนสุดมีแสงรีเงาวาว
  const body = layers.map((shape, i) => `
    <g fill="none" stroke="${pal.line}" stroke-width=".85" stroke-linejoin="round" stroke-linecap="round">${shape}</g>
    <g fill="url(#${id}B)">${shape}</g>
    <g fill="url(#${id}G)">${shape}</g>
    <g clip-path="url(#${id}C${i})" fill="url(#${id}T)"><rect x="0" y="0" width="${W}" height="${H}"/></g>
    <g clip-path="url(#${id}C${i})" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.1">${shape}</g>
    ${i === layers.length - 1 ? `<g clip-path="url(#${id}C${i})" fill="url(#${id}W)">${shine}</g>` : ''}`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 6}" height="${H * 6}">
  <defs>
    <linearGradient id="${id}B" gradientUnits="userSpaceOnUse" x1="2" y1="1" x2="${W - 2}" y2="${H - 1}">
      ${pal.grad.map(([o, c]) => `<stop offset="${o}" stop-color="${c}" stop-opacity=".97"/>`).join('')}
    </linearGradient>
    <radialGradient id="${id}G" gradientUnits="userSpaceOnUse" cx="${W / 2}" cy="${H}" r="${H * 0.5}">
      <stop offset="0" stop-color="${pal.glow}" stop-opacity=".95"/>
      <stop offset="1" stop-color="${pal.glow}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}T" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${H}">
      <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".42" stop-color="#fff" stop-opacity=".12"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${id}W" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".95"/>
      <stop offset="1" stop-color="#fff" stop-opacity=".1"/>
    </linearGradient>
    ${layers.map((shape, i) => `<clipPath id="${id}C${i}">${shape}</clipPath>`).join('')}
  </defs>
  ${body}${after}
</svg>`;
}
/** มงกุฎทองเล็ก (ฐานกลาง x,y · กว้าง w) */
const crownSvg = (x, y, w, line) => {
  const h = w * 0.62, l = x - w / 2;
  return `<path d="M${l} ${y}l-.4-${h}l${w * 0.27} ${h * 0.45}l${w * 0.23}-${h * 0.7}l${w * 0.23} ${h * 0.7}l${w * 0.27}-${h * 0.45}l-.4 ${h}Z" fill="${P.yel}" stroke="${line}" stroke-width="0.56" stroke-linejoin="round"/>
    <circle cx="${x}" cy="${y - h * 0.45}" r="${w * 0.08}" fill="${P.pink}"/>`;
};

// ── ปราสาทออนไลน์ (มินิมอล — ผู้ใช้ 15 พ.ย. 2026 "มินิ ๆ รายละเอียดน้อย เส้นขอบบาง"):
//   หอกลางโดมหูแมว + หอข้างหลังคากรวยสองหอ · ประตูโค้ง · หน้าต่างหัวใจเดียว · มงกุฎจิ๋ว · ประกายเดียว
const CL = SP.castle.line;
const CASTLE = special('castle', [40, 34], [
  '<rect x="4" y="15" width="8" height="16.4" rx="2"/><path d="M3.4 16 8 5.6l4.6 10.4Z"/><rect x="28" y="15" width="8" height="16.4" rx="2"/><path d="M27.4 16 32 5.6l4.6 10.4Z"/>',
  '<rect x="11" y="13" width="18" height="18.4" rx="2.6"/><path d="M11.4 14.4Q20 1.4 28.6 14.4Z"/><path d="M13.6 9.8l-.5-4.6 3.6 2.4Z M26.4 9.8l.5-4.6-3.6 2.4Z"/>',
], {
  shine: '<ellipse cx="16.6" cy="8.6" rx="3.6" ry="1.2" transform="rotate(-24 16.6 8.6)"/>',
  after: `
    ${crownSvg(20, 4.4, 3.6, CL)}
    <path d="M20 19.6s-1.5-.9-1.5-1.9a.78.78 0 0 1 1.5-.4.78.78 0 0 1 1.5.4c0 1-1.5 1.9-1.5 1.9Z" fill="${P.pink}"/>
    <path d="M16.4 31.4v-4.2a3.6 3.6 0 0 1 7.2 0v4.2Z" fill="#fff" opacity=".75"/>
    ${twinkle(37.4, 7.4, 1.5, P.yel)}
    <circle cx="14" cy="17.6" r="1.1" fill="#fff"/><circle cx="15.7" cy="16.6" r=".55" fill="#fff"/>`,
});

// ── บ้านของฉัน (มินิมอล): เตียงหลังคามุมข้าง · หมอน · ผ้าห่ม · น้องแมวขดหลับ · พระจันทร์เสี้ยวจิ๋ว ──
const HL = SP.myhome.line;
const MYHOME = special('myhome', [36, 32], [
  '<rect x="4" y="6.4" width="2.4" height="23" rx="1.2"/><rect x="29.6" y="6.4" width="2.4" height="23" rx="1.2"/><rect x="3" y="4.4" width="30" height="4" rx="2"/>',
  '<path d="M5.6 28.4V18a3.2 3.2 0 0 1 6.4 0v10.4Z"/><rect x="7" y="21" width="23.6" height="7" rx="3"/>',
], {
  shine: '<ellipse cx="13" cy="22.2" rx="4" ry=".8"/>',
  after: `
    <path d="M16.8 10.2a1.8 1.8 0 1 0 2.4 2 1.4 1.4 0 1 1-2.4-2Z" fill="${P.yel}"/>
    <ellipse cx="13.6" cy="20.6" rx="3" ry="1.6" fill="#fff"/>
    <path d="M17 21.4q6-1 13.4 0V28H17Z" fill="${P.pinkSoft}"/>
    <ellipse cx="22.4" cy="19.8" rx="4.2" ry="2.1" fill="${P.yelSoft}" stroke="${HL}" stroke-width=".5"/>
    <path d="M18.8 19.4l-.2-1.7 1.3.9M21 18.6l.5-1.5.6 1.5" fill="${P.yelSoft}" stroke="${HL}" stroke-width=".45" stroke-linejoin="round"/>
    <path d="M19 19.9q.4.3.8 0M20.6 19.7q.4.3.8 0" fill="none" stroke="${HL}" stroke-width=".45" stroke-linecap="round"/>
    ${twinkle(33.8, 13.6, 1.3, P.yel)}
    <circle cx="9.4" cy="23.4" r="1" fill="#fff"/><circle cx="10.9" cy="22.5" r=".5" fill="#fff"/>`,
});

export const LOBBY_ICON_SVG = { shop: SHOP, gacha: GACHA, talent: TALENT, stash: STASH, quest: QUEST, map: MAP, khouse: KHOUSE, castle: CASTLE, myhome: MYHOME };

const imgs = {};
/** ภาพของไอคอน key (โหลดครั้งเดียว ใช้ซ้ำ) */
export function lobbyIconImage(key) {
  if (!imgs[key]) {
    const im = new Image();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(LOBBY_ICON_SVG[key]);
    imgs[key] = im;
  }
  return imgs[key];
}
