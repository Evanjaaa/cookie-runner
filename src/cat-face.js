// src/cat-face.js
// ─────────────────────────────────────────────────────────────
// หน้าประจำตัวของน้อง (ผู้ใช้ 24 พ.ย. 2026 — "ให้ผู้เล่นเลือกหน้าเองได้ จะเฟี้ยวมาก")
//   ผู้เล่นเลือกตา + ปาก จากชุดหน้าที่นักวาด (โมจิ) ออกแบบ + สีตา แก้ม จมูก
//   หน้าที่เลือกเป็นหน้าหลักทุกท่า (ตัว แขน ขา หาง เล่นแอนิเมชันเดิม) — ตัววาด (cat2.js) เปลี่ยนชั่วคราวเองตอน
//   กะพริบตา · หาว · หลับ/หมอบ · โดนชน แล้วกลับมาเป็นหน้าที่เลือก (แบบ ข. ที่ผู้ใช้เลือก)
//
// ตอนนี้: น้องส้มตัวหลักตัวเดียว (ชุดหน้าของตัวอื่นรอโมจิวาด) · เปิดจากหน้ารายละเอียดน้องในคลังน้อง (ปุ่ม "แต่งหน้า")
// เก็บในเครื่อง (loadPref/savePref 'catFace') — ยังไม่ขึ้นคลาวด์/ไม่ส่งให้ผู้เล่นอื่นในเมือง (ระบบของเจ้าของโปรเจกต์ ทำทีหลัง)
// ─────────────────────────────────────────────────────────────
import { loadPref, savePref } from './storage.js';
import { setPlayerFaces, drawFacePart } from './render/cat2.js';

/** แมวที่แต่งหน้าได้แล้ว (มีชุดหน้าของโมจิ) */
export const FACE_CATS = ['orange'];
export const canEditFace = (id) => FACE_CATS.includes(id);

// [ชื่อในตัววาด, ชื่อไทย] — ชื่อชั้นใน SVG ดูได้ใน cat-lab แท็บแต่งหน้า
export const FACE_EYES = [
  ['', 'ดั้งเดิม'], ['open', 'ตาแป๋ว'], ['sparkling', 'ตาดาว'], ['heart', 'ตาหัวใจ'], ['shocked', 'ตาโต'],
  ['half', 'ตาปรือ'], ['wink', 'ขยิบตา'], ['closed', 'ยิ้มตาหยี'], ['crying', 'ตาคลอ'], ['mischievous', 'เจ้าเล่ห์'],
  ['dizzy', 'ตามึน'], ['pain', 'หยีตา ><'],
];
export const FACE_MOUTHS = [
  ['', 'ดั้งเดิม'], ['closed', 'ยิ้มเหมียว'], ['happy', 'ยิ้มกว้าง'], ['open', 'อ้าปากนิด'], ['playful', 'แลบลิ้น'],
  ['mischievous', 'ยิ้มเจ้าเล่ห์'], ['hungry', 'น้ำลายไหล'], ['shocked', 'ปากตกใจ'], ['sulky', 'งอน'], ['sad', 'ปากเบ้'],
  ['yawn', 'อ้ากว้าง'], ['pain', 'ปากเจ็บ'],
];
export const FACE_COLORS = {
  // ตาแยกสามส่วน (ผู้ใช้ 24 พ.ย.) — eyeColor เดิม (สองส่วนรวม) ตัววาดยังอ่านได้ ของที่เคยเซฟไว้ไม่หาย
  irisColor: { name: 'สีพื้นในตา', list: ['#FFC95A', '#5BB8FF', '#3E7BEB', '#4CC27A', '#9FD34A', '#B07CFF', '#FF7FB8', '#E0405A', '#B8834A', '#9AA7B5'] },
  pupilColor: { name: 'สีตาดำ', list: ['#5A3420', '#1E1420', '#24305E', '#4A2470', '#1F4A35', '#6A1E2E', '#21545E', '#4A4A58'] },
  lashColor: { name: 'สีขนตา', list: ['#2B1911', '#141014', '#6B3B22', '#5B2A86', '#C2457A', '#22345E', '#8A2E2E', '#2F5E4A'] },
  cheekColor: { name: 'สีแก้ม', list: ['#FF8FB0', '#FF6F8F', '#FFB070', '#FF5A5A', '#C98CFF', '#FFD36B'] },
  noseColor: { name: 'สีจมูก', list: ['#FF8C8C', '#E8607A', '#9B5A44', '#3A2418', '#C78EFF', '#F5B08A'] },
  mouthColor: { name: 'สีเส้นปาก', list: ['#2B1911', '#8A3A2A', '#C2457A', '#5B2A86', '#22345E', '#E0405A'] },
};

// ── ข้อมูล ──
let faces = loadPref('catFace', {}) || {};
// ย้ายของเดิม: สีตาแบบรวม (eyeColor) → พื้นในตา + ตาดำ (ตัวเลือกใหม่แยกสามส่วน)
for (const f of Object.values(faces)) if (f?.eyeColor) { f.irisColor ??= f.eyeColor; f.pupilColor ??= f.eyeColor; delete f.eyeColor; }
setPlayerFaces(faces);
export const getFace = (id) => faces[id] || {};
const cleanFace = (face) => Object.fromEntries(Object.entries(face || {}).filter(([, v]) => v));
/** ลองหน้า (ยังไม่บันทึก) — ตัวน้องทุกที่วาดด้วยหน้านี้จนกว่าจะกดตกลง (บันทึก) หรือ ✕ (คืนของที่บันทึกไว้) */
function previewFace(id, face) {
  const clean = cleanFace(face), map = { ...faces };
  if (Object.keys(clean).length) map[id] = clean; else delete map[id];
  setPlayerFaces(map);
}
export function setFace(id, face) {
  const clean = cleanFace(face);
  faces = { ...faces };
  if (Object.keys(clean).length) faces[id] = clean; else delete faces[id];
  savePref('catFace', faces);
  setPlayerFaces(faces);
}

// ── ตัวแต่งหน้า (ลิ้นชักขวาของหน้ารายละเอียดน้อง) ──
const CLOSE_ICON = '<svg viewBox="0 0 24 24" width="60%" height="60%" aria-hidden="true">'
  + '<path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" fill="none" stroke="currentColor"'
  + ' stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let ui = null;   // { el, id, skin, tab, onClose, job }
// มุมกล้องตอนแต่งหน้า (ผู้ใช้ 24 พ.ย.): 'body' เต็มตัว · 'face' ซูมหน้า — main.js อ่านค่านี้ตอนวาดเวที
let zoom = 'face';
export const faceZoom = () => zoom;
// ไอคอน: เต็มตัว = กรอบมุมสี่ด้านล้อมตัวแมวทั้งตัว · ซูมหน้า = แว่นขยายมีหน้าแมวข้างใน
const ICON_BODY = '<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M4 10V5.5A1.5 1.5 0 0 1 5.5 4H10M22 4h4.5A1.5 1.5 0 0 1 28 5.5V10M28 22v4.5a1.5 1.5 0 0 1-1.5 1.5H22M10 28H5.5A1.5 1.5 0 0 1 4 26.5V22"/>'
  + '<path d="M12.2 9.6 13.4 7l1.6 1.8h2l1.6-1.8 1.2 2.6M12.2 9.6a3.9 3.9 0 0 0 7.6 0M13 13.6c-1.2 1.5-1.6 3.6-1.3 6.4h8.6c.3-2.8-.1-4.9-1.3-6.4M13.6 20v3M18.4 20v3"/></g></svg>';
const ICON_FACE = '<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'
  + '<circle cx="13.5" cy="13.5" r="9"/><path d="m20.2 20.2 7.3 7.3"/>'
  + '<path d="M9.4 12.4 9.8 8.6l2.4 1.9h2.6l2.4-1.9.4 3.8a4.6 4.6 0 1 1-8.2 0Z"/></g>'
  + '<circle cx="11.9" cy="14" r="1" fill="currentColor"/><circle cx="15.1" cy="14" r="1" fill="currentColor"/></svg>';

/** เปิดตัวแต่งหน้าใน host (การ์ดหน้ารายละเอียด) — skin = สกินของแมวตัวนั้น (ไม่ใส่ชุด) · onChange = วาดตัวบนเวทีใหม่ */
export function openFaceEditor(host, id, skin, { onClose, onChange, sfx } = {}) {
  closeFaceEditor(true);
  const el = document.createElement('section');
  el.className = 'cf-drawer';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'แต่งหน้าน้อง');
  el.innerHTML = `
    <header class="cf-head">
      <h3>แต่งหน้าน้อง</h3>
      <button type="button" class="xbtn cf-x" aria-label="ปิด">${CLOSE_ICON}</button>
    </header>
    <nav class="cf-tabs" role="tablist">
      <button type="button" role="tab" data-tab="eye">ตา</button>
      <button type="button" role="tab" data-tab="mouth">ปาก</button>
      <button type="button" role="tab" data-tab="color">สี</button>
    </nav>
    <div class="cf-body"></div>
    <footer class="cf-foot">
      <button type="button" class="btn ghost cf-reset">หน้าเดิมทั้งหมด</button>
      <button type="button" class="btn okbtn cf-ok">ตกลง</button>
    </footer>`;
  host.appendChild(el);
  // ปุ่มมุมกล้อง: ลอยบนเวทีมุมซ้ายล่าง (ฝั่งตัวน้อง)
  const zb = document.createElement('div');
  zb.className = 'cf-zoom';
  zb.setAttribute('role', 'group');
  zb.setAttribute('aria-label', 'มุมกล้อง');
  zb.innerHTML = `<button type="button" data-z="body" aria-label="เต็มตัว" title="เต็มตัว">${ICON_BODY}</button><button type="button" data-z="face" aria-label="ซูมหน้า" title="ซูมหน้า">${ICON_FACE}</button>`;
  host.appendChild(zb);
  const paintZoom = () => { for (const b of zb.children) { b.classList.toggle('on', b.dataset.z === zoom); b.setAttribute('aria-pressed', String(b.dataset.z === zoom)); } };
  for (const b of zb.children) b.onclick = () => { if (zoom === b.dataset.z) return; sfx?.(); zoom = b.dataset.z; paintZoom(); onChange?.(); };
  paintZoom();
  // แบบ ก. (ผู้ใช้ 24 พ.ย.): เลือก = ลองดูบนตัวน้อง (draft) · ตกลง = บันทึก · ✕ / ปิดทางอื่น = ยกเลิก คืนหน้าเดิม
  ui = { el, zb, id, skin, tab: 'eye', onClose, onChange, sfx, job: 0, draft: { ...getFace(id) } };
  el.querySelector('.cf-x').onclick = () => { sfx?.(); closeFaceEditor(); };
  el.querySelector('.cf-ok').onclick = () => { sfx?.(); setFace(id, ui.draft); ui.saved = true; closeFaceEditor(); };
  el.querySelector('.cf-reset').onclick = () => { sfx?.(); ui.draft = {}; previewFace(id, ui.draft); refresh(true); onChange?.(); };
  for (const b of el.querySelectorAll('.cf-tabs button')) b.onclick = () => { sfx?.(); ui.tab = b.dataset.tab; paint(); };
  host.closest('.panel')?.classList.add('cf-open');
  paint();
  requestAnimationFrame(() => { el.classList.add('on'); zb.classList.add('on'); });
}
export function closeFaceEditor(silent = false) {
  if (!ui) return;
  const { el, zb, onClose, onChange, saved } = ui;
  if (!saved) { setPlayerFaces(faces); onChange?.(); }   // ไม่ได้กดตกลง = คืนหน้าที่บันทึกไว้
  el.closest('.panel')?.classList.remove('cf-open');
  ui.job++;
  ui = null;
  el.remove();
  zb?.remove();
  if (!silent) onClose?.();
}
export const faceEditorOpen = () => !!ui;

// เลือกแล้วไม่สร้างหน้าใหม่ (ผู้ใช้ 24 พ.ย. "เลือกแล้วอย่ารีเฟรชหน้าใหม่") — แค่ย้ายกรอบที่เลือก
//   รูปย่อในแท็บเดียวกันไม่ขึ้นกับตัวเลือกของแท็บนั้นเอง จึงไม่ต้องวาดใหม่ · แถบเลื่อนอยู่ที่เดิม
function pick(key, val) {
  ui.draft = { ...ui.draft, [key]: val };
  previewFace(ui.id, ui.draft);
  ui.sfx?.();
  refresh(false);
  ui.onChange?.();
}
/** อัปเดตกรอบที่เลือก + ปุ่มหน้าเดิม ในที่เดิม · redraw = วาดรูปย่อใหม่ทับที่เดิม (กดหน้าเดิม — ตา/ปาก/สีอื่นเปลี่ยน) */
function refresh(redraw) {
  const { el, tab, id } = ui;
  const face = cleanFace(ui.draft);
  el.querySelector('.cf-reset').disabled = !Object.keys(face).length;
  if (tab === 'color') {
    for (const row of el.querySelectorAll('.cf-colrow')) {
      const key = row.dataset.key, cur = (face[key] || '').toUpperCase(), list = FACE_COLORS[key].list;
      const custom = cur && !list.some((v) => v.toUpperCase() === cur);
      for (const b of row.querySelectorAll('.cf-sw')) {
        const on = b.classList.contains('wheel') ? !!custom : (b.dataset.v || '').toUpperCase() === cur;
        b.classList.toggle('on', on);
        if (b.classList.contains('wheel')) { if (custom) b.style.setProperty('--c', cur); else b.style.removeProperty('--c'); }
      }
    }
    return;
  }
  const key = tab, jobs = [];
  for (const b of el.querySelectorAll('.cf-tile')) {
    const on = (face[key] || '') === b.dataset.v;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
    if (redraw) jobs.push([b.querySelector('canvas'), { ...face, [key]: b.dataset.v || undefined }, key]);
  }
  if (jobs.length) thumbs(jobs);
}

function paint() {
  const { el, tab, id } = ui;
  for (const b of el.querySelectorAll('.cf-tabs button')) {
    b.classList.toggle('on', b.dataset.tab === tab);
    b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  }
  const face = cleanFace(ui.draft);
  el.querySelector('.cf-reset').disabled = !Object.keys(face).length;
  const body = el.querySelector('.cf-body');
  body.innerHTML = '';
  if (tab === 'color') return paintColors(body, face);
  const list = tab === 'eye' ? FACE_EYES : FACE_MOUTHS, key = tab;
  const grid = document.createElement('div');
  grid.className = 'cf-grid';
  const jobs = [];
  for (const [v, name] of list) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cf-tile' + ((face[key] || '') === v ? ' on' : '');
    b.setAttribute('aria-pressed', String((face[key] || '') === v));
    b.dataset.v = v;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 0;
    b.append(cv);
    const nm = document.createElement('span');
    nm.textContent = name;
    b.append(nm);
    b.onclick = () => pick(key, v);
    grid.append(b);
    jobs.push([cv, { ...face, [key]: v || undefined }, key, v]);
  }
  body.append(grid);
  thumbs(jobs);
}

/** ไอคอนในแต่ละช่อง: เฉพาะตาคู่ / เฉพาะปาก (ผู้ใช้ 24 พ.ย.) — หน้าเต็มดูจากตัวน้องบนเวที · วาดทีละช่องต่อเฟรม */
function thumbs(jobs) {
  const my = ++ui.job;
  const step = () => {
    if (!ui || ui.job !== my || !jobs.length) return;
    const [cv, face, key] = jobs.shift();
    const box = cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round((box.width || 72) * dpr), H = Math.round((box.height || 64) * dpr);
    // วาดบนผ้าใบสำรองก่อน แล้วค่อยแปะทับ — รูปเดิมไม่หายวูบระหว่างวาดใหม่
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const c = off.getContext('2d');
    // ช่อง "ดั้งเดิม" (ไม่ล็อก) = ตาแป๋ว/ยิ้มเหมียว จาง ๆ — หน้าเปลี่ยนเองตามท่า
    const kind = key === 'eye' ? 'eye' : 'mouth', v = face[key] || '';
    if (!v) c.globalAlpha = 0.42;
    drawFacePart(c, W, H, kind, v || (kind === 'eye' ? 'open' : 'closed'), face);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const g = cv.getContext('2d');
    g.clearRect(0, 0, W, H);
    g.drawImage(off, 0, 0);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// กลุ่มสี (ผู้ใช้ 24 พ.ย. "เพิ่มกรอบพื้นหลังของหมวดสีตา"): สีตาสามส่วนอยู่ในการ์ดเดียวกัน · แก้ม-จมูกอีกการ์ด
const COLOR_GROUPS = [['ดวงตา', ['irisColor', 'pupilColor', 'lashColor']], ['แก้ม จมูก และปาก', ['cheekColor', 'noseColor', 'mouthColor']]];
function paintColors(body, face) {
  const boxOf = {};
  for (const [title, keys] of COLOR_GROUPS) {
    const g = document.createElement('section');
    g.className = 'cf-colgroup';
    const h = document.createElement('h3');
    h.textContent = title;
    g.append(h);
    body.append(g);
    for (const k of keys) boxOf[k] = g;
  }
  for (const [key, { name, list }] of Object.entries(FACE_COLORS)) {
    const row = document.createElement('div');
    row.className = 'cf-colrow';
    row.dataset.key = key;
    const h = document.createElement('h4');
    h.textContent = name;
    row.append(h);
    const sw = document.createElement('div');
    sw.className = 'cf-swatches';
    const cur = (face[key] || '').toUpperCase();
    const dot = (val, label, cls = '') => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cf-sw ' + cls + (cur === val.toUpperCase() ? ' on' : '');
      b.title = label;
      b.setAttribute('aria-label', label);
      b.dataset.v = val;
      if (val) b.style.setProperty('--c', val);
      b.onclick = () => pick(key, val);
      sw.append(b);
    };
    dot('', 'สีเดิม', 'def');
    for (const v of list) dot(v, v);
    // วงล้อสี: เลือกสีอิสระ — เป็นสีที่ไม่อยู่ในชุด = โชว์เป็นเม็ดที่เลือก
    const wheel = document.createElement('label');
    const custom = cur && !list.some((v) => v.toUpperCase() === cur);
    wheel.className = 'cf-sw wheel' + (custom ? ' on' : '');
    wheel.title = 'เลือกสีเอง';
    if (custom) wheel.style.setProperty('--c', cur);
    const inp = document.createElement('input');
    inp.type = 'color';
    inp.value = cur || list[0];
    inp.setAttribute('aria-label', 'เลือก' + name + 'เอง');
    let t = 0;
    inp.oninput = () => {
      wheel.style.setProperty('--c', inp.value);
      ui.draft = { ...ui.draft, [key]: inp.value.toUpperCase() };
      previewFace(ui.id, ui.draft);
      ui.onChange?.();
      clearTimeout(t);
      t = setTimeout(() => ui && refresh(false), 250);   // ลากวงล้อ: ย้ายกรอบที่เลือกหลังหยุดลาก (ไม่สร้างแถวใหม่)
    };
    wheel.append(inp);
    sw.append(wheel);
    row.append(sw);
    (boxOf[key] || body).append(row);
  }
}
