// src/render/dock-art.js
// ─────────────────────────────────────────────────────────────
// ภาพปุ่มพิเศษแถวล่างหน้าแรก (ผู้ใช้ 15 พ.ย. 2026 ส่งภาพแบบ + brief "Redesign Special Menu Buttons")
//   ปราสาทออนไลน์ = ปราสาทแมวบนเมฆ · บ้านของฉัน = หน้าต่างห้องนอน น้องแมวหลับใต้ผ้าห่ม
//
// แต่ละภาพ = ป้ายวุ้นทรงเมฆ (ขอบนอกม่วงบาง → ขอบขาวหนาแบบสติกเกอร์ → ขอบในลาเวนเดอร์ → ผิวไล่ม่วง-ชมพู ใส มันวาว)
//   + ภาพประกอบยื่นพ้นขอบบนป้าย · ชื่อปุ่มเป็นตัวหนังสือ HTML ทับส่วนล่าง (แปลภาษา/ย่อพอดีกรอบได้ — fit-labels.js)
// ภาพประกอบทุกชิ้น = วุ้นใสนุ่มเด้งแบบไอคอนเมนูหน้าแรก (lobby-icons.js) — ผู้ใช้ 15 พ.ย.: "ให้ไอคอนเป็นแบบพวกข้างบน ใสเด้งนุ่ม ลายเส้นเอาแบบนี้"
//   ทุกชิ้น (J): เส้นขอบม่วงบาง → เนื้อโปร่งแสงไล่สามสีพาสเทล → แสงฟุ้งขาวก้นวุ้น → แสงวาวขาวช่วงบน → ขอบในขาว (กร่อนจากรูปทรง) · ชิ้นเด่นมีแสงรีเงาวาว + จุดแสงลูกอม
// พิกัด viewBox 300×260 · ตัวป้าย (กรอบปุ่มจริง) = x 8–292, y 100–248 → CSS วางภาพตามสัดส่วนนี้ (style.css ".dock2")
// เป็นภาพนิ่งชิ้นเดียว (img) — ประกายดาว/แสงวิ่งเป็นชั้น CSS แยก ขยับด้วย transform/opacity เท่านั้น (เบาเครื่อง)
// ─────────────────────────────────────────────────────────────

// ป้ายเมฆถอดออก (ผู้ใช้ 15 พ.ย. 2026): ตัวปุ่มใช้กรอบวุ้นชุดเดียวกับปุ่มเมนู (ร้านเหมียว/คลังน้อง — .lobby-btn.jelly ใน style.css)
//   ภาพนี้เหลือแค่ไอคอน วางตำแหน่งเดิม · อยากได้ป้ายเมฆคืน = ตั้ง PLAQUE เป็น true แล้วคืนกฎ CSS ใน style.css
const PLAQUE = false;

// เส้นภาพประกอบ = ชมพูเข้มสีเดียวกับเส้นไอคอนเมนูข้างบน (P.line ใน lobby-icons.js — ผู้ใช้ 15 พ.ย. 2026 "ตัดขอบสีเดียวกับไอคอนด้านบน")
// เดิมม่วง #5E2F9E หนา 2.3 · ภาพนี้ย่อเหลือ ~0.56px ต่อหน่วย (ไอคอนเมนู ~1.3) จึงต้องหนากว่าในหน่วยภาพถึงจะดูเท่ากันบนจอ
const OL = '#A0336F';
const LW = 3.4;          // ความหนาเส้นแต่ละชิ้น
const RIM = 1.2;   // ผู้ใช้ 15 พ.ย. 2026 "ลดลงให้เท่าข้างบน" (เดิม 2.6) · ขอบนอกรวม = LW + RIM×2 = 5.8 หน่วย ≈ 3px บนจอคอม เท่าเส้นไอคอนร้านเหมียว         // ขอบนอกรอบเงาทั้งภาพ (หน่วยภาพ) — ขอบหนาแบบไอคอนเมนู

// สีวุ้นแต่ละชนิด (บนซ้าย → กลาง → ล่างขวา) — พาสเทลหลายเฉดผสมกันแบบไอคอนเมนู
const C = {   // เข้มขึ้นเท่าไอคอนเมนูข้างบน (ผู้ใช้ 15 พ.ย. 2026)
  roof: ['#E2BBFF', '#9561EC', '#5A48D4'],
  wall: ['#FFEAA8', '#FFB0DA', '#B9A0FF'],
  back: ['#DDBCFF', '#A578EE', '#7A68E4'],
  door: ['#D9B4FF', '#8D5AE6', '#5E54D8'],
  cloud: ['#FFFFFF', '#DCCBFF', '#A9A6FF'],
  pink: ['#FFD0EA', '#FF84C2', '#D85FB2'],
  gold: ['#FFEFA0', '#FFCB4D', '#F2A23A'],
  frame: ['#FFD6F0', '#EE92D4', '#A67AEC'],
  sky: ['#7A4ED0', '#6E4CCB', '#9C7AE8'],
  drape: ['#F2DCFF', '#C094F4', '#8E78E8'],
  blanket: ['#EEC8FF', '#B07AEE', '#7E66E2'],
  cream: ['#FFFCEC', '#FFE4C8', '#F2C2DE'],
  lamp: ['#FFFBD8', '#FFE48A', '#FFC65A'],
  blue: ['#D2E4FF', '#8AB0F4', '#6884E8'],
};

let uid = 0;
// ไม่ใช้ฟิลเตอร์ SVG ในภาพไอคอนเลย (ผู้ใช้ 15 พ.ย. 2026 "มือถือเบลอ"): Safari มือถือวาดภาพ <img> ที่มีฟิลเตอร์ความละเอียด 1 เท่าแล้วขยาย → ขอบแตกเป็นขั้น
//   ขอบนอก = รูปทรงทุกชิ้น (OUT) ลากเส้นหนา LW + RIM×2 ไว้ใต้สุด · ขอบในขาว = เส้นไล่ขาว→ใส ตัดตามรูปทรง
let OUT = [];
/** สร้างภาพหนึ่งชิ้น: เก็บรูปทรงทุกชิ้นระหว่างสร้าง แล้วใส่ชั้นขอบนอกตรง <!--OL--> */
function art(build) {
  OUT = [];
  const svg = build();
  return svg.replace('<!--OL-->', `<g fill="none" stroke="${OL}" stroke-width="${LW + RIM * 2}" stroke-linejoin="round" stroke-linecap="round">${OUT.join('')}</g>`);
}
/**
 * ชิ้นวุ้นหนึ่งชิ้น (เหมือน special()/jelly() ใน lobby-icons.js)
 * shapes = รูปทรง SVG · pal = สามสีไล่ · shine = แสงรีเงาวาว (ตัดตามรูปทรง) · line/lw = เส้นขอบ · op = ความทึบเนื้อ
 */
function J(shapes, pal, { shine = '', line = OL, lw = LW, op = 0.95 } = {}) {
  const id = 'j' + uid++;
  OUT.push(shapes);
  return `<linearGradient id="${id}" x1="0" y1="0" x2=".5" y2="1">${pal.map((c, i) => `<stop offset="${i / (pal.length - 1)}" stop-color="${c}" stop-opacity="${op}"/>`).join('')}</linearGradient>
  <g fill="none" stroke="${line}" stroke-width="${lw}" stroke-linejoin="round" stroke-linecap="round">${shapes}</g>
  <g fill="url(#${id})">${shapes}</g>
  <g fill="url(#jGlow)">${shapes}</g>
  <g fill="url(#jTop)">${shapes}</g>
  <clipPath id="${id}c">${shapes}</clipPath>
  <g clip-path="url(#${id}c)" fill="none" stroke="url(#jRimG)" stroke-width="3.2" stroke-linejoin="round">${shapes}</g>
  ${shine ? `<g clip-path="url(#${id}c)" fill="url(#jShine)">${shine}</g>` : ''}`;
}
/** จุดแสงลูกอมคู่ (แบบไอคอนเมนู) */
const dots = (x, y, s = 1) => `<circle cx="${x}" cy="${y}" r="${2.6 * s}" fill="#fff"/><circle cx="${x + 4.6 * s}" cy="${y - 2.4 * s}" r="${1.3 * s}" fill="#fff"/>`;

const star = (cx, cy, r, rot = 0) => {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2 + rot, rr = i % 2 ? r * 0.5 : r;
    p.push(`${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `M${p.join('L')}Z`;
};
/** ดาวทองวุ้น */
const goldStar = (cx, cy, r, rot = 0, lw = 1.8) =>
  J(`<path d="${star(cx, cy, r, rot)}"/>`, C.gold, { line: '#C47E1E', lw, op: 0.95, shine: `<ellipse cx="${cx - r * 0.2}" cy="${cy - r * 0.35}" rx="${r * 0.38}" ry="${r * 0.2}" transform="rotate(-20 ${cx} ${cy})"/>` });
const paw = (cx, cy, s, fill) =>
  `<g fill="${fill}"><ellipse cx="${cx}" cy="${cy + 2.2 * s}" rx="${4.4 * s}" ry="${3.5 * s}"/>
   <circle cx="${cx - 4.6 * s}" cy="${cy - 2.4 * s}" r="${1.7 * s}"/><circle cx="${cx - 1.6 * s}" cy="${cy - 4.6 * s}" r="${1.8 * s}"/>
   <circle cx="${cx + 1.6 * s}" cy="${cy - 4.6 * s}" r="${1.8 * s}"/><circle cx="${cx + 4.6 * s}" cy="${cy - 2.4 * s}" r="${1.7 * s}"/></g>`;

const DEFS = `
  <linearGradient id="body" x1="0" y1="76" x2="0" y2="248" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#A874F2" stop-opacity=".9"/><stop offset=".5" stop-color="#8048DE" stop-opacity=".88"/><stop offset="1" stop-color="#6430C2" stop-opacity=".94"/></linearGradient>
  <radialGradient id="pinkB" cx="150" cy="268" r="175" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFB4E2" stop-opacity=".8"/><stop offset=".55" stop-color="#F0A6DA" stop-opacity=".3"/><stop offset="1" stop-color="#F7B9DC" stop-opacity="0"/></radialGradient>
  <radialGradient id="pinkL" cx="10" cy="150" r="120" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFD0EC" stop-opacity=".75"/><stop offset="1" stop-color="#FFD0EC" stop-opacity="0"/></radialGradient>
  <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".78"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="swoosh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFE6F4" stop-opacity=".95"/><stop offset=".6" stop-color="#F7C6EA" stop-opacity=".7"/><stop offset="1" stop-color="#F7C6EA" stop-opacity="0"/></linearGradient>
  <radialGradient id="jGlow" cx=".5" cy="1" r=".46"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".5"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
  <linearGradient id="jTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".3" stop-color="#fff" stop-opacity=".06"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="jShine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity=".2"/></linearGradient>
  <linearGradient id="jRimG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset=".45" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>
  <filter id="glowF" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="rimHi" x="0" y="0" width="100%" height="100%">
    <feMorphology in="SourceAlpha" operator="erode" radius="2.6" result="e"/><feOffset in="e" dy="3.2" result="eo"/>
    <feComposite in="SourceAlpha" in2="eo" operator="out" result="ring"/><feGaussianBlur in="ring" stdDeviation=".7" result="rb"/>
    <feFlood flood-color="#FFFFFF" flood-opacity=".75"/><feComposite in2="rb" operator="in"/></filter>
  <filter id="rimLo" x="0" y="0" width="100%" height="100%">
    <feMorphology in="SourceAlpha" operator="erode" radius="2" result="e"/><feOffset in="e" dy="-7" result="eo"/>
    <feComposite in="SourceAlpha" in2="eo" operator="out" result="ring"/><feGaussianBlur in="ring" stdDeviation="3" result="rb"/>
    <feFlood flood-color="#6A36BE" flood-opacity=".3"/><feComposite in2="rb" operator="in"/></filter>`;

/** ป้ายวุ้นทรงเมฆ: shapes = รูปทรงรวม (สี่เหลี่ยมมน + ก้อนเมฆบนขอบ) */
function plaque(shapes) {
  return `
  <clipPath id="pc">${shapes}</clipPath>
  <mask id="outside" maskUnits="userSpaceOnUse" x="-20" y="-20" width="340" height="300"><rect x="-20" y="-20" width="340" height="300" fill="#fff"/><g fill="#000">${shapes}</g></mask>
  <g mask="url(#outside)"><g transform="translate(0 9)" opacity=".42" filter="url(#soft)" fill="#5A2C9C">${shapes}</g></g>
  <g fill="none" stroke-linejoin="round">
    <g stroke="#7E48CC" stroke-width="19">${shapes}</g>
    <g stroke="#FFF7FC" stroke-opacity=".94" stroke-width="14">${shapes}</g>
    <g stroke="#CFAEF8" stroke-width="5.5">${shapes}</g>
  </g>
  <g fill="url(#body)">${shapes}</g>
  <g clip-path="url(#pc)">
    <rect x="0" y="60" width="300" height="200" fill="url(#pinkB)"/>
    <rect x="0" y="60" width="300" height="200" fill="url(#pinkL)"/>
    <ellipse cx="150" cy="114" rx="128" ry="17" fill="url(#gloss)" opacity=".6"/>
    <path d="M-4 206 C 40 246 120 246 214 224" fill="none" stroke="url(#swoosh)" stroke-width="6" stroke-linecap="round"/>
    <path d="M10 222 C 50 250 110 250 160 240" fill="none" stroke="#FFFFFF" stroke-opacity=".35" stroke-width="2.5" stroke-linecap="round"/>
  </g>
  <g filter="url(#rimLo)" fill="#000">${shapes}</g>
  <g filter="url(#rimHi)" fill="#000">${shapes}</g>
  <circle cx="26" cy="160" r="6.2" fill="#fff" opacity=".95"/><circle cx="36" cy="146" r="3.4" fill="#fff" opacity=".85"/>`;
}

/** ก้อนเมฆวุ้น (วงกลมหลายวงรวมเป็นก้อนเดียว — ขอบในขาวคิดจากรูปรวม ไม่มีเส้นวงซ้อนข้างใน) */
const cloud = (circles) => J(circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join(''), C.cloud, { op: 0.94 });

// ── ปราสาทออนไลน์ ──
const CASTLE_SHAPES = `<rect x="8" y="100" width="284" height="148" rx="46"/><circle cx="44" cy="116" r="28"/><circle cx="84" cy="104" r="22"/><circle cx="258" cy="112" r="24"/>`;
const tower = (cx, flag) => `
  <path d="M${cx} 34 V14" stroke="${OL}" stroke-width="3.4" stroke-linecap="round"/>
  ${J(`<path d="M${cx + 1} 13 L${cx + 17} 19 L${cx + 1} 25Z"/>`, flag, { lw: 3.0 })}
  ${J(`<rect x="${cx - 16}" y="82" width="32" height="70" rx="5"/>`, C.wall)}
  ${J(`<path d="M${cx - 27} 86 L${cx} 34 L${cx + 27} 86 Q${cx} 95 ${cx - 27} 86Z"/>`, C.roof, { shine: `<ellipse cx="${cx - 9}" cy="62" rx="3.4" ry="14" transform="rotate(26 ${cx - 9} 62)"/>` })}
  ${J(`<path d="M${cx - 6.5} 128 v-12 a6.5 6.5 0 0 1 13 0 v12z"/>`, C.door, { lw: 3.0 })}`;

const CASTLE = art(() => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 260">
<defs>${DEFS}</defs>
${PLAQUE ? plaque(CASTLE_SHAPES) : ''}
<!--OL-->
${cloud([[50, 142, 20], [70, 132, 18], [248, 134, 18], [264, 146, 18]])}
<!-- หอหลังสีม่วงโผล่ระหว่างหอกลางกับหอขวา -->
${J('<rect x="178" y="58" width="26" height="70" rx="4"/><path d="M172 62 L191 26 L210 62 Q191 69 172 62Z"/>', C.back)}
${tower(86, C.pink)}
${tower(214, C.gold)}
<!-- หอกลาง -->
<path d="M150 14 V2" stroke="${OL}" stroke-width="3.4" stroke-linecap="round"/>
${J('<path d="M151 2 L173 8.5 L151 15Z"/>', C.pink, { lw: 3.0 })}
${J('<rect x="112" y="70" width="76" height="84" rx="6"/>', C.wall, { shine: '<ellipse cx="124" cy="112" rx="3" ry="30"/>' })}
${J('<path d="M98 76 L150 14 L202 76 Q150 89 98 76Z"/>', C.roof, { shine: '<ellipse cx="130" cy="46" rx="4.4" ry="22" transform="rotate(40 130 46)"/>' })}
${J('<rect x="104" y="72" width="92" height="10" rx="5"/>', C.back, { lw: 3.1 })}
${J('<rect x="112" y="88" width="76" height="9" rx="2"/>', C.pink, { lw: 3.0 })}
${J('<path d="M150 92 C138 78 124 82 126 92 C124 102 138 104 150 92Z M150 92 C162 78 176 82 174 92 C176 102 162 104 150 92Z"/>', C.pink, { lw: 3.1 })}
${goldStar(150, 92, 7, 0, 1.6)}
${J('<path d="M136 154 V120 A14 14 0 0 1 164 120 V154Z"/>', C.door, { shine: '<ellipse cx="143" cy="118" rx="4" ry="2" transform="rotate(-30 143 118)"/>' })}
${paw(150, 137, 1.3, '#FF9FCB')}
${dots(120, 80, 0.8)}
${cloud([[80, 158, 18], [104, 164, 14], [62, 166, 12], [198, 164, 14], [222, 158, 18], [240, 166, 12]])}
${dots(70, 150, 0.9)}${dots(214, 150, 0.9)}
${goldStar(36, 150, 19, -0.2, 2.2)}
${paw(36, 152, 1.05, '#FFFFFF')}
</svg>`);

// ── บ้านของฉัน ──
const HOME_SHAPES = `<rect x="8" y="100" width="284" height="148" rx="46"/><circle cx="40" cy="120" r="26"/><circle cx="262" cy="116" r="26"/>`;
const HOME = art(() => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 260">
<defs>${DEFS}
  <radialGradient id="glow"><stop offset="0" stop-color="#FFF3B8" stop-opacity=".9"/><stop offset="1" stop-color="#FFF3B8" stop-opacity="0"/></radialGradient>
</defs>
${PLAQUE ? plaque(HOME_SHAPES) : ''}
<circle cx="54" cy="122" r="30" fill="url(#glow)"/>
<!--OL-->
<!-- หน้าต่างห้องนอน: กรอบวุ้นชมพูลาเวนเดอร์ ท้องฟ้ากลางคืน ดาวแขวน -->
${J('<path d="M92 156 V56 Q92 36 112 36 H208 Q228 36 228 56 V156Z"/>', C.frame)}
${J('<path d="M102 156 V60 Q102 46 116 46 H204 Q218 46 218 60 V156Z"/>', C.sky, { op: 0.93 })}
<g stroke="#EBDDFF" stroke-width="1.4" opacity=".9"><path d="M140 46 V62"/><path d="M160 46 V76"/><path d="M180 46 V58"/></g>
${goldStar(140, 67, 5.8, 0, 1.4)}${goldStar(160, 81, 6.5, 0.2, 1.4)}${goldStar(180, 63, 5.2, -0.2, 1.4)}
<circle cx="120" cy="94" r="1.6" fill="#fff" opacity=".85"/><circle cx="202" cy="98" r="1.3" fill="#fff" opacity=".75"/>
${J('<path d="M102 48 C116 48 126 54 130 60 C120 84 124 104 134 124 C120 128 110 126 102 122Z"/>', C.drape, { shine: '<ellipse cx="111" cy="86" rx="2.6" ry="26" transform="rotate(-6 111 86)"/>' })}
${J('<path d="M218 48 C204 48 194 54 190 60 C200 84 196 104 186 124 C200 128 210 126 218 122Z"/>', C.drape)}
${J('<rect x="84" y="28" width="152" height="17" rx="8.5"/>', C.frame, { shine: '<ellipse cx="150" cy="32" rx="58" ry="2.4"/>' })}
${dots(102, 64, 0.8)}
<!-- โคมดาว (ซ้าย) · แสงเรืองวาดนอกกลุ่มขอบนอก (ไม่งั้นได้วงขอบรอบแสง) -->
${J('<ellipse cx="54" cy="160" rx="13" ry="4.5"/>', C.roof, { lw: 3.1 })}
${J('<rect x="50" y="142" width="8" height="18" rx="2"/>', C.back, { lw: 3.0 })}
${J('<rect x="38" y="104" width="32" height="38" rx="10"/>', C.lamp, { op: 0.92, shine: '<ellipse cx="45" cy="118" rx="2.6" ry="10"/>' })}
${J('<path d="M38 106 Q54 88 70 106Z"/>', C.roof, { lw: 3.1 })}
${J('<rect x="40" y="139" width="28" height="7" rx="3.5"/>', C.roof, { lw: 3.0 })}
${goldStar(54, 123, 8, 0, 1.6)}
<!-- หมอน + น้องแมวหลับ + ผ้าห่ม -->
${J('<ellipse cx="160" cy="132" rx="38" ry="13"/>', C.cream, { lw: 3.3 })}
${J('<path d="M141 112 L143 94 L155 104Z M179 112 L177 94 L165 104Z"/>', C.cream, { lw: 3.3 })}
<path d="M145.5 108 L146.5 99 L152 104Z M174.5 108 L173.5 99 L168 104Z" fill="#FFC6DE"/>
${J('<ellipse cx="160" cy="120" rx="23" ry="18.5"/>', C.cream, { lw: 3.3, op: 0.97, shine: '<ellipse cx="150" cy="108" rx="7" ry="3" transform="rotate(-18 150 108)"/>' })}
<g fill="none" stroke="#6A3FA8" stroke-width="2.2" stroke-linecap="round">
  <path d="M148 121 q4.5 3.6 9 0"/><path d="M163 121 q4.5 3.6 9 0"/>
  <path d="M156.5 128 q1.75 1.8 3.5 0 q1.75 1.8 3.5 0"/>
</g>
<ellipse cx="146" cy="127" rx="4.2" ry="2.6" fill="#FFB3D2" opacity=".85"/><ellipse cx="174" cy="127" rx="4.2" ry="2.6" fill="#FFB3D2" opacity=".85"/>
${J('<path d="M84 160 C88 140 118 134 150 137 C178 136 208 132 236 142 C242 148 242 156 238 162 Z"/>', C.blanket, { shine: '<ellipse cx="116" cy="143" rx="22" ry="2.6" transform="rotate(-6 116 143)"/>' })}
${J('<ellipse cx="146" cy="138" rx="7" ry="5"/><ellipse cx="174" cy="138" rx="7" ry="5"/>', C.cream, { lw: 3.1, op: 0.97 })}
<g fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.2" stroke-linecap="round"><path d="M196 147 C210 143 222 145 230 149"/></g>
${dots(98, 150, 0.8)}
<g fill="none" stroke="#8050C9" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
  <path d="M190 94 h9 l-9 9.5 h9"/><path d="M204 80 h6.5 l-6.5 7 h6.5"/>
</g>
<!-- กองหนังสือ + เบาะอุ้งเท้า (ขวา) -->
${J('<rect x="232" y="146" width="42" height="11" rx="3.5"/>', C.blue, { lw: 3.1 })}
${J('<rect x="236" y="135" width="38" height="11" rx="3.5"/>', C.pink, { lw: 3.1 })}
${J('<rect x="234" y="124" width="40" height="11" rx="3.5"/>', C.back, { lw: 3.1 })}
${J('<path d="M236 122 C234 108 244 104 254 104 C264 104 274 108 272 122 C266 127 242 127 236 122Z"/>', C.pink, { lw: 3.1, shine: '<ellipse cx="248" cy="108" rx="7" ry="2.2" transform="rotate(-10 248 108)"/>' })}
${paw(254, 116, 1.1, '#FFFFFF')}
<!-- โบว์วุ้นม่วงดาวทอง มุมขวาบนกรอบ -->
${J('<path d="M226 36 L216 58 L224 54 L228 62Z M234 36 L244 58 L236 54 L232 62Z"/>', C.roof, { lw: 3.1 })}
${J('<path d="M230 34 C212 14 200 28 210 38 C200 48 214 52 230 34Z M230 34 C248 14 260 28 250 38 C260 48 246 52 230 34Z"/>', C.roof, { lw: 3.3, shine: '<ellipse cx="214" cy="26" rx="5" ry="2" transform="rotate(-30 214 26)"/>' })}
${goldStar(230, 34, 9, 0.1, 1.7)}
${cloud([[86, 166, 13], [106, 170, 10], [214, 170, 10], [234, 166, 13]])}
</svg>`);

export const DOCK_ART = { castle: CASTLE, myhome: HOME };
export const dockArtURL = (key) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(DOCK_ART[key]);
