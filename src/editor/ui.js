// src/editor/ui.js
// หน้าตาแบบ Canva ของโต๊ะออกแบบด่าน — เฉพาะเรื่องการจัดแผง ไม่แตะข้อมูลด่านเลย
//
//   ซ้าย  แถบไอคอนหมวด + แผงของทีละหมวด + ช่องค้นหาข้ามทุกหมวด
//         กดไอคอนหมวดที่เปิดอยู่ซ้ำ = พับแผงเก็บ สนามกว้างขึ้น (เหมือนแผงข้างของ Canva)
//   ขวา   แท็บ ชิ้นที่เลือก / ท่อนนี้ / ของในท่อน / ปุ่มลัด — คลิกชิ้นในสนามแล้วเด้งมาแท็บแรกเอง
//
// main.js สร้างชิปใส่กล่องเดิม (kitMark, kitObs, ...) เหมือนเดิมทุกอย่าง ไฟล์นี้แค่ซ่อน/โชว์กล่อง
// จึงไม่มีสูตรตำแหน่ง/ขนาดของตัวเอง (กติกาหน้าออกแบบใน CLAUDE.md)

const PREF = 'meowzing-editor-ui';
const load = () => { try { return JSON.parse(localStorage.getItem(PREF)) || {}; } catch { return {}; } };
const save = (patch) => { try { localStorage.setItem(PREF, JSON.stringify({ ...load(), ...patch })); } catch { /* ไม่เป็นไร */ } };

const $ = (id) => document.getElementById(id);
const body = document.body;

// ── ซ้าย: หมวด ────────────────────────────────────────────

const rail = $('kitRail');
const pane = $('kitPane');
const search = $('kitSearch');
const railBtns = [...rail.querySelectorAll('.rb')];
const cats = [...pane.querySelectorAll('.cat')];

/** หมวดที่ใช้ได้ตอนนี้ — ท่อนโบนัสซ่อนหมวด .no-bonus ทั้งหมด (เหลือวาดลาย/ของกิน/กติกา) */
const usable = (key) => {
  const b = railBtns.find((x) => x.dataset.cat === key);
  return b && getComputedStyle(b).display !== 'none';
};

let active = load().cat || 'mark';

function showCat(key, { keepOpen = false } = {}) {
  if (!usable(key)) key = usable('mark') ? 'mark' : 'food';
  active = key;
  save({ cat: key });
  railBtns.forEach((b) => b.classList.toggle('on', b.dataset.cat === key));
  if (!search.value.trim()) cats.forEach((c) => c.classList.toggle('show', c.dataset.cat === key));
  if (!keepOpen) setCollapsed(false);
  if (key === 'props') openStageGroup();
  pane.scrollTop = 0;
}

function setCollapsed(on) {
  body.classList.toggle('kit-collapsed', on);
  save({ collapsed: on });
}

railBtns.forEach((b) => b.addEventListener('click', () => {
  // กดหมวดที่เปิดอยู่ซ้ำ = พับ/กางแผง (ท่าเดียวกับแผงข้างของ Canva)
  if (b.dataset.cat === active && !search.value.trim()) {
    setCollapsed(!body.classList.contains('kit-collapsed'));
    return;
  }
  if (search.value) { search.value = ''; applySearch(); }
  showCat(b.dataset.cat);
}));

/** หมวด "ตามด่าน": กางกลุ่มของด่านที่เลือกอยู่ พับด่านอื่น — ไม่ต้องไล่หาในหกกลุ่ม */
function openStageGroup() {
  const pick = $('stagePick');
  const name = pick && pick.selectedOptions[0] ? pick.selectedOptions[0].textContent.trim() : '';
  const groups = [...$('kitProps').querySelectorAll('details.kit-group')];
  if (!groups.length) return;
  let hit = false;
  for (const g of groups) {
    const on = g.querySelector('summary').textContent.trim() === name;
    g.open = on;
    hit ||= on;
  }
  if (!hit) groups[0].open = true;
}
$('stagePick')?.addEventListener('change', () => { if (active === 'props') openStageGroup(); });

// ── ค้นหา ──
// หาทั้งชื่อและคำอธิบายของชิป (ข้อความบนชิป + ทูลทิป) ข้ามทุกหมวดพร้อมกัน
// ระหว่างค้น: โชว์ทุกหมวดที่มีของตรง กางกลุ่มที่พับไว้ ซ่อนชิปที่ไม่ตรง
function applySearch() {
  const q = search.value.trim().toLowerCase();
  body.classList.toggle('kit-searching', !!q);
  let found = 0;
  for (const c of cats) {
    if (!q) {
      c.classList.toggle('show', c.dataset.cat === active);
      c.querySelectorAll('.chip, details.kit-group').forEach((el) => el.classList.remove('miss'));
      continue;
    }
    let n = 0;
    c.querySelectorAll('.chip').forEach((ch) => {
      const txt = (ch.textContent + ' ' + (ch.title || '')).toLowerCase();
      const ok = txt.includes(q);
      ch.classList.toggle('miss', !ok);
      if (ok) n++;
    });
    c.querySelectorAll('details.kit-group').forEach((g) => {
      const any = g.querySelector('.chip:not(.miss)');
      g.classList.toggle('miss', !any);
      if (any) g.open = true;
    });
    c.classList.toggle('show', n > 0);
    // หมวดที่ถูกซ่อนทั้งหมวด (เช่น .no-bonus ในท่อนโบนัส) ไม่นับ — ผู้ใช้มองไม่เห็นอยู่ดี
    if (n > 0 && getComputedStyle(c).display !== 'none') found += n;
  }
  $('kitEmpty').classList.toggle('hidden', !q || found > 0);
  if (!q && active === 'props') openStageGroup();
}
search.addEventListener('input', applySearch);
search.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { search.value = ''; applySearch(); search.blur(); }
  e.stopPropagation();   // พิมพ์ในช่องค้นหาต้องไม่ไปกดคีย์ลัดของสนาม (G, S, Delete ...)
});
// "/" = ไปช่องค้นหา (เหมือนเว็บทั่วไป) — ยกเว้นตอนพิมพ์อยู่ในช่องอื่น
window.addEventListener('keydown', (e) => {
  // ตามตำแหน่งปุ่ม (ev.code) — แป้นไทยปุ่มนี้พิมพ์เป็น "ฝ" ไม่ใช่ "/"
  if (!(e.code === 'Slash' && !e.shiftKey) || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  e.preventDefault();
  setCollapsed(false);
  search.focus();
  search.select();
}, true);

// ท่อนโบนัสซ่อนบางหมวด — ถ้าหมวดที่เปิดอยู่หายไป ย้ายไปหมวดที่ยังใช้ได้
new MutationObserver(() => { if (!usable(active)) showCat(active, { keepOpen: true }); })
  .observe(body, { attributes: true, attributeFilter: ['class'] });

// ── ขวา: แท็บ ──────────────────────────────────────────────

const side = document.querySelector('.side.right');
const tabs = [...$('rTabs').querySelectorAll('.rt')];
let tab = load().tab || 'insp';

function showTab(key) {
  tab = key;
  save({ tab: key });
  side.dataset.tab = key;
  tabs.forEach((b) => {
    const on = b.dataset.tab === key;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', String(on));
  });
}
tabs.forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

// คลิกชิ้นในสนาม → เด้งไปแท็บ "ชิ้นที่เลือก" เอง
// ยกเว้นคลิกมาจากแผงขวาเอง (เช่นกดแถวในรายการของ) — ไม่งั้นรายการจะหายไปจากตาทุกครั้งที่กด
let lastDownInSide = false;
window.addEventListener('pointerdown', (e) => { lastDownInSide = !!e.target.closest('.side.right'); }, true);
const inspBody = $('inspBody');
let lastInsp = '';
new MutationObserver(() => {
  const empty = !!inspBody.querySelector(':scope > p.tip:only-child');
  const sig = inspBody.textContent.slice(0, 60);
  // เปิดแผงเลเยอร์อยู่ = ให้อยู่ต่อ (แบบ Canva: เลือกบนสนามแล้วแถวในเลเยอร์ไฮไลต์ตาม)
  if (!empty && sig !== lastInsp && !lastDownInSide && tab !== 'insp' && tab !== 'list') showTab('insp');
  lastInsp = sig;
}).observe(inspBody, { childList: true, subtree: true });

// จำนวนของในท่อน บนหัวแท็บ — นับแถวจริงในรายการ (main.js วาดใหม่ทุกครั้งที่ของเปลี่ยน)
const list = $('itemList');
const count = $('rtCount');
const paintCount = () => {
  const n = list.querySelectorAll('.irow[data-id]').length;
  count.textContent = n ? String(n) : '';
};
new MutationObserver(paintCount).observe(list, { childList: true });

// ── เริ่ม ──
// main.js สร้างชิปตอนโหลดโมดูล — รอหนึ่งเฟรมให้ครบก่อนค่อยจัดหมวด/ค้นหา
requestAnimationFrame(() => {
  // ของกินมีหลายโซน กางหมดยาวเกือบ 3,300px — กางแค่โซนแรก ที่เหลือกดหัวข้อเพื่อกาง
  document.querySelectorAll('#kitFood details.food-zone').forEach((z, i) => { z.open = i === 0; });
  showCat(active, { keepOpen: true });
  setCollapsed(!!load().collapsed);
  showTab(tab);
  paintCount();
});
