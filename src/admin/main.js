// src/admin/main.js
// ─────────────────────────────────────────────────────────────
// หน้าหลังบ้าน — ดู/แก้/ลบข้อมูลผู้เล่น
//
// ── สิ่งที่ต้องเข้าใจก่อนแก้ไฟล์นี้ ──
// หน้านี้ไม่ได้ "มีสิทธิ์" อะไรเป็นพิเศษเลย มันใช้ anon key ตัวเดียวกับตัวเกม
// ซึ่งฝังอยู่ในโค้ดฝั่งผู้เล่นและใครก็อ่านได้ สิ่งที่ทำให้แอดมินเห็นข้อมูลคนอื่น
// คือ RLS policy ในฐานข้อมูล (ดู supabase/admin.sql) ที่เช็คว่า auth.uid()
// อยู่ในตาราง admins หรือเปล่า
//
// แปลว่า:
//   - ใครเปิด /admin.html ก็เปิดได้ แต่จะไม่เห็นข้อมูลสักแถวถ้าไม่ใช่แอดมิน
//   - การเช็คสิทธิ์ในไฟล์นี้มีไว้เพื่อ "บอกผู้ใช้ว่าเข้าไม่ได้" เท่านั้น
//     ไม่ใช่กลไกความปลอดภัย ห้ามย้ายตรรกะสิทธิ์อะไรมาไว้ที่นี่เด็ดขาด
// ─────────────────────────────────────────────────────────────
import './admin.css';
import { CROP0, CROP_ZMAX, normCrop, cropRect, cropStyle } from '../crop.js';
import { GUMBALL, createGumball, drawGumballFrame } from '../render/gumball.js';
import { ALL_OUTFITS, OUTFITS } from '../outfits.js';
import { SKINS } from '../skins.js';
import { OC_W, OC_H, drawOutfitArt } from '../render/outfit-art.js';

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

const $ = (id) => document.getElementById(id);
const el = (sel, root = document) => root.querySelector(sel);

let sb = null;
let pendingEmail = '';

/** โหลด SDK ตอนใช้จริง เหมือนที่ตัวเกมทำ จะได้ไม่ลากมาตอนโหลดหน้า */
async function client() {
  if (!sb) {
    const { createClient } = await import('@supabase/supabase-js');
    sb = createClient(URL_, ANON, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return sb;
}

// ── ตัวช่วยเล็ก ๆ ────────────────────────────────────────────

/** ตัวเลขใหญ่มาจากฐานข้อมูลเป็น string (bigint เกินช่วงที่ JS เก็บได้แม่น) */
const num = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('en-US'));

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** วันเวลาแบบสั้น อ่านง่ายกว่า ISO ตอนกวาดสายตาทั้งตาราง */
function when(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = Date.now();
  const mins = Math.round((now - d.getTime()) / 60000);
  if (mins < 1) return 'เมื่อกี้';
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} ชม.ที่แล้ว`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} วันที่แล้ว`;
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

let toastTimer = 0;
function toast(text, kind = '') {
  const t = $('toast');
  t.textContent = text;
  t.className = 'toast ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
}

function gateMsg(text, kind = '') {
  const m = $('gateMsg');
  m.textContent = text;
  m.className = 'msg ' + kind;
}

// ── กล่องยืนยันของหน้านี้เอง ─────────────────────────────────
//
// แทน confirm()/prompt() ของเบราว์เซอร์ทั้งหมด เหตุผลเต็มอยู่ใน admin.html
// ที่สำคัญที่สุดคือเบราว์เซอร์บางตัวขึ้นช่อง "ไม่ต้องแสดงอีก" ให้ผู้ใช้ติ๊ก
// ซึ่งถ้าติ๊กแล้ว การยืนยันจะหายไปเงียบ ๆ — อันตรายมากกับปุ่มที่ลบข้อมูลถาวร
//
// คืน Promise: ยืนยัน = คืนข้อความที่พิมพ์ (หรือ true ถ้าไม่ได้ขอให้พิมพ์)
//              ยกเลิก = คืน null  ผู้เรียกจึงเช็คแบบเดียวกับ prompt() เดิม
//
// @param opts.title   หัวข้อ
// @param opts.body    HTML ของเนื้อความ (ใช้ <b> เน้นชื่อ/ตัวเลขที่จะโดนลบ)
// @param opts.expect  ถ้าใส่ = ต้องพิมพ์ให้ตรงค่านี้ถึงจะกดยืนยันได้
// @param opts.label   ป้ายเหนือช่องพิมพ์
// @param opts.okText  ข้อความบนปุ่มยืนยัน
function ask({ title, body = '', expect = null, label = '', okText = 'ยืนยัน', cancelText = 'ยกเลิก' }) {
  const box = $('modal');
  const input = $('modalInput');
  const ok = $('modalOk');
  const cancel = $('modalCancel');
  const field = $('modalField');

  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = body;
  $('modalLabel').textContent = label;
  ok.textContent = okText;
  cancel.textContent = cancelText;

  const needType = expect !== null;
  field.classList.toggle('hidden', !needType);
  input.value = '';
  // ปุ่มยืนยันเปิดใช้ได้ก็ต่อเมื่อพิมพ์ตรงแล้วเท่านั้น ไม่ใช่กดได้แล้วค่อยด่า
  // ผู้ใช้จึงเห็นว่ายังไม่ตรงตั้งแต่ก่อนกด แทนที่จะกดแล้วเจอ toast ว่าผิด
  ok.disabled = needType;

  box.classList.remove('hidden');
  (needType ? input : ok).focus();

  return new Promise((resolve) => {
    const done = (val) => {
      box.classList.add('hidden');
      input.removeEventListener('input', onType);
      input.removeEventListener('keydown', onKey);
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      box.removeEventListener('mousedown', onBackdrop);
      document.removeEventListener('keydown', onEsc);
      resolve(val);
    };
    const onType = () => { ok.disabled = input.value.trim() !== String(expect).trim(); };
    const onOk = () => { if (!ok.disabled) done(needType ? input.value.trim() : true); };
    const onCancel = () => done(null);
    // Enter ในช่องพิมพ์ = กดยืนยัน แต่ยังติดเงื่อนไขว่าต้องพิมพ์ตรงเหมือนเดิม
    const onKey = (e) => { if (e.key === 'Enter') onOk(); };
    // คลิกนอกกล่อง = ยกเลิก แต่ต้องเช็คว่าคลิกโดนฉากหลังจริง ไม่ใช่ลากเมาส์
    // ออกมาจากในกล่อง ซึ่งถ้าไม่เช็คจะปิดทิ้งทั้งที่ผู้ใช้แค่ลากเลือกข้อความ
    const onBackdrop = (e) => { if (e.target === box) done(null); };
    const onEsc = (e) => { if (e.key === 'Escape') done(null); };

    input.addEventListener('input', onType);
    input.addEventListener('keydown', onKey);
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
    box.addEventListener('mousedown', onBackdrop);
    document.addEventListener('keydown', onEsc);
  });
}


// ── เข้าสู่ระบบ ──────────────────────────────────────────────
//
// ใช้รหัส 6 หลักทางอีเมลเหมือนตัวเกม ไม่มีรหัสผ่านให้ดูแลและให้หลุด
// shouldCreateUser: false โดยตั้งใจ — หน้านี้ต้องไม่เป็นช่องทางสมัครบัญชีใหม่
// ใครกรอกอีเมลมั่วจะไม่ได้อะไรเลย และไม่มีบัญชีขยะเกิดขึ้นในระบบ

async function sendCode() {
  const email = $('email').value.trim();
  if (!email) return gateMsg('ใส่อีเมลก่อน', 'bad');

  $('sendCode').disabled = true;
  gateMsg('กำลังส่ง…');
  const c = await client();
  const { error } = await c.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  $('sendCode').disabled = false;

  if (error) return gateMsg(errText(error), 'bad');
  pendingEmail = email;
  $('sentTo').textContent = email;
  $('gateStep1').classList.add('hidden');
  $('gateStep2').classList.remove('hidden');
  gateMsg('ส่งแล้ว เช็คกล่องจดหมาย', 'good');
  $('code').focus();
}

async function verifyCode() {
  const token = $('code').value.trim();
  if (token.length < 6) return gateMsg('รหัสมี 6 หลัก', 'bad');

  $('verifyCode').disabled = true;
  gateMsg('กำลังตรวจ…');
  const c = await client();
  const { data, error } = await c.auth.verifyOtp({ email: pendingEmail, token, type: 'email' });
  $('verifyCode').disabled = false;

  if (error) return gateMsg(errText(error), 'bad');
  await afterSignIn(data.user);
}

/** ข้อความ error ของ Supabase เป็นภาษาอังกฤษ แปลเฉพาะอันที่เจอบ่อย */
function errText(error) {
  const m = String(error?.message || '');
  if (/signups not allowed|Signups not allowed/i.test(m)) return 'ไม่มีบัญชีนี้ในระบบ';
  if (/Invalid login|Token has expired|invalid/i.test(m)) return 'รหัสไม่ถูกหรือหมดอายุแล้ว';
  if (/rate limit|too many/i.test(m)) return 'ขอรหัสถี่เกินไป รออีกสักครู่';
  return m || 'ไม่สำเร็จ';
}

/**
 * ตรวจว่าเป็นแอดมินจริงมั้ย แล้วค่อยเปิดแอป
 *
 * ถ้าไม่ใช่ ต้อง signOut ทิ้งด้วย ไม่ใช่แค่ไม่โชว์หน้า — ไม่งั้น session
 * ของคนที่ไม่ใช่แอดมินจะค้างอยู่ในเบราว์เซอร์เครื่องนั้นโดยไม่มีอะไรบอก
 */
async function afterSignIn(user) {
  const c = await client();
  const { data: ok, error } = await c.rpc('is_admin');

  if (error) {
    gateMsg('เช็คสิทธิ์ไม่ได้: ' + errText(error), 'bad');
    return;
  }
  if (!ok) {
    await c.auth.signOut();
    gateMsg('บัญชีนี้ไม่มีสิทธิ์แอดมิน', 'bad');
    return;
  }

  $('whoEmail').textContent = user.email || '';
  $('gate').classList.add('hidden');
  $('app').classList.remove('hidden');
  go(PAGES[location.hash.slice(1)] ? location.hash.slice(1) : 'overview');
}

async function signOut() {
  const c = await client();
  await c.auth.signOut();
  location.reload();
}

// ── ตัวจัดการหน้า ────────────────────────────────────────────

const PAGES = {};

const PAGE_TITLE = {
  overview: 'ภาพรวม', players: 'ผู้เล่น', mail: 'จดหมาย', news: 'ข่าวสาร', promo: 'ป้ายตู้กาช่า', cards: 'รูปการ์ดชุด', reports: 'แจ้งปัญหา',
  scores: 'คะแนน', pulls: 'กาช่า', audit: 'ตรวจผิดปกติ',
};

function go(name) {
  [...$('tabs').children].forEach((b) => b.classList.toggle('on', b.dataset.page === name));
  closeDrawer();
  // จำหน้าไว้ใน # — รีเฟรชแล้วกลับมาหน้าเดิม ไม่เด้งไปภาพรวมทุกครั้ง
  if (location.hash.slice(1) !== name) history.replaceState(null, '', '#' + name);
  document.title = `${PAGE_TITLE[name] || ''} · MeowZing หลังบ้าน`;
  window.scrollTo(0, 0);
  PAGES[name]();
}

/** หัวหน้าแบบเดียวกันทุกหน้า: ชื่อ + คำอธิบาย ซ้าย / ปุ่มหลักของหน้า ขวา */
function pageHead(title, sub, actions = '') {
  return `<div class="phead"><div><h2>${title}</h2><p class="sub">${sub}</p></div>`
    + (actions ? `<div class="phead-actions">${actions}</div>` : '') + '</div>';
}

/** วงกลมตัวแรกของชื่อ — สีคงที่ต่อคน (ได้จาก id) จำคนจากสีได้เวลากวาดตาดูตาราง */
function avatar(p) {
  const name = String(p?.name || '?').trim() || '?';
  let h = 7;
  for (const ch of name + String(p?.id || '')) h = (h * 131 + ch.charCodeAt(0)) % 997;
  h = (h * 37) % 360;
  return `<span class="ava" style="--h:${h}" aria-hidden="true">${esc([...name][0].toUpperCase())}</span>`;
}

/** ช่องชื่อในตาราง: วงกลม + ชื่อ + ไอดีผู้ใช้บรรทัดล่าง */
function whoCell(p) {
  return `<div class="who-cell">${avatar(p)}<span class="nm"><b>${esc(p.name || 'แมวนิรนาม')}</b>`
    + `${p.friend_code ? `<small>${esc(p.friend_code)}</small>` : ''}</span></div>`;
}

/** ป้ายประเภทบัญชี */
function accountPill(p) {
  return p.is_guest ? '<span class="pill guest">ผู้มาเยือน</span>'
    : `<span class="pill email" title="${esc(p.email)}">${esc(p.email)}</span>`;
}

/** เติมไอดีผู้ใช้ (friend_code) ให้แถวที่มาจาก view ของแอดมิน ซึ่งไม่มีคอลัมน์นี้ */
async function attachCodes(rows, key = 'id') {
  const ids = [...new Set(rows.map((r) => r[key]).filter(Boolean))];
  if (!ids.length) return rows;
  const c = await client();
  const { data } = await c.from('players').select('id, friend_code').in('id', ids);
  const byId = new Map((data || []).map((r) => [r.id, r.friend_code]));
  return rows.map((r) => ({ ...r, friend_code: r.friend_code || byId.get(r[key]) || '' }));
}

/** คัดลอกข้อความ — เบราว์เซอร์ที่ไม่ยอมให้คัดลอก บอกให้คัดลอกเองแทนที่จะเงียบ */
async function copyText(text, label = 'คัดลอกแล้ว') {
  try {
    await navigator.clipboard.writeText(text);
    toast(label, 'good');
  } catch {
    toast('คัดลอกไม่ได้ ลองเลือกข้อความแล้วคัดลอกเอง: ' + text, 'bad');
  }
}

const ICON = {
  mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6.5L20.5 7"/></svg>',
  gift: '<svg viewBox="0 0 24 24"><rect x="3.5" y="9" width="17" height="11.5" rx="2"/><path d="M2.5 9h19M12 9v11.5M12 9c-2-4.5-6.5-4-6-1.2.3 1.4 3 1.2 6 1.2Zm0 0c2-4.5 6.5-4 6-1.2-.3 1.4-3 1.2-6 1.2Z"/></svg>',
  alert: '<svg viewBox="0 0 24 24"><path d="M12 3 3 19.5h18L12 3Z"/><path d="M12 10v4.5M12 17.2v.3"/></svg>',
  users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.6 0 4.5 1.6 5 4.4"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  broom: '<svg viewBox="0 0 24 24"><path d="M14 4 9.5 12.5M6 13h9l2 7H4l2-7Z"/><path d="M8 20v-3M12 20v-3"/></svg>',
};

/** โครงตารางแบบเดียวกันทุกหน้า จะได้ไม่ต้องเขียนซ้ำห้ารอบ */
function tableHTML(cols, rows, opts = {}) {
  if (!rows.length) return `<div class="tablewrap"><div class="empty">${opts.empty || 'ไม่มีข้อมูล'}</div></div>`;
  const head = cols.map((c) => `<th class="${c.num ? 'num ' : ''}nosort">${esc(c.label)}</th>`).join('');
  const body = rows
    .map((r, i) => {
      const tds = cols.map((c) => `<td class="${c.num ? 'num' : ''}">${c.cell(r)}</td>`).join('');
      return `<tr class="${opts.onRow ? 'clickable' : ''}" data-i="${i}">${tds}</tr>`;
    })
    .join('');
  return `<div class="tablewrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

// ── หน้า 1: ภาพรวม ──────────────────────────────────────────

PAGES.overview = async () => {
  $('page').innerHTML = pageHead('ภาพรวม', 'กำลังโหลด…');
  const c = await client();
  const { data, error } = await c.rpc('admin_overview');
  if (error) return fail(error);

  const d = data || {};
  const card = (lbl, val, cls = '', note = '', extra = '') =>
    `<div class="card"><div class="lbl">${lbl}</div><div class="val ${cls}">${val}</div>${
      note ? `<div class="note">${note}</div>` : ''
    }${extra}</div>`;
  const group = (title, dot, cards) =>
    `<section class="statgroup" style="--dot:${dot}"><h3>${title}</h3><div class="cards">${cards}</div></section>`;

  const total = Number(d.players_total) || 0;
  const emailShare = total ? Math.round((Number(d.emails) / total) * 100) : 0;
  const quick = (page, icon, title, note) =>
    `<button class="qbtn" type="button" data-go="${page}"><span class="qi">${ICON[icon]}</span><b>${title}</b><span>${note}</span></button>`;

  $('page').innerHTML = `
    ${pageHead('ภาพรวม', 'ตัวเลขทั้งชุดอ่านจากฐานข้อมูลในคำสั่งเดียว จึงเป็นภาพ ณ เวลาเดียวกันทั้งหมด',
      '<button class="btn ghost" type="button" id="ovReload">โหลดใหม่</button>')}

    <div class="quick">
      ${quick('mail', 'gift', 'ส่งของขวัญ', 'ส่งจดหมายด้วยไอดีผู้ใช้ หรือทั้งเซิร์ฟ')}
      ${quick('players', 'users', 'หาผู้เล่น', 'ดู แก้ไข หรือลบบัญชี')}
      ${quick('audit', 'alert', 'ตรวจผิดปกติ', 'บัญชีที่ตัวเลขไม่น่าเป็นไปได้')}
    </div>

    <div class="statgroups section">
      ${group('ผู้เล่น', 'var(--violet)', `
        ${card('ผู้เล่นทั้งหมด', num(d.players_total), 'violet')}
        ${card('เข้าด้วยอีเมล', num(d.emails), 'mint', `${emailShare}% ของทั้งหมด · ข้อมูลไม่หาย`,
          `<div class="split" title="สัดส่วนบัญชีอีเมล"><i style="width:${emailShare}%"></i></div>`)}
        ${card('ผู้มาเยือน', num(d.guests), '', 'ล้างเบราว์เซอร์แล้วข้อมูลหาย')}
        ${card('สมัครใหม่ 24 ชม.', num(d.new_24h))}
        ${card('สมัครใหม่ 7 วัน', num(d.new_7d))}`)}
      ${group('ความเคลื่อนไหว', 'var(--mint)', `
        ${card('เล่นใน 24 ชม.', num(d.active_24h), 'mint')}
        ${card('เล่นใน 7 วัน', num(d.active_7d))}
        ${card('รอบวิ่งสะสม', num(d.runs_total))}
        ${card('สุ่มกาช่าทั้งหมด', num(d.pulls_total))}`)}
      ${group('เศรษฐกิจในเกม', 'var(--gold)', `
        ${card('ทองรวมทั้งระบบ', num(d.gold_total), 'gold')}
        ${card('เพชรรวมทั้งระบบ', num(d.gems_total), 'violet')}
        ${card('คะแนนสูงสุด', num(d.top_score), 'gold')}`)}
    </div>
    <p class="sub footnote">
      "เล่นใน 24 ชม." นับจาก updated_at ของแถวผู้เล่น ซึ่งขยับทุกครั้งที่เกมซิงก์ข้อมูลขึ้นคลาวด์
      — ผู้เล่นที่เปิดเกมแบบออฟไลน์ล้วนจะไม่ถูกนับ
    </p>`;

  $('ovReload').addEventListener('click', () => PAGES.overview());
  $('page').querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
};

// ── หน้า 2: ผู้เล่น ─────────────────────────────────────────

const PAGE_SIZE = 50;

/** ชื่อด่านที่คนอ่านรู้เรื่อง แทน id ในฐานข้อมูล */
const STAGE_NAME = {
  night: 'ครัวกลางคืน', garden: 'สวนดอกไม้', cavern: 'ถ้ำคริสตัล',
  beach: 'ชายหาดยามเย็น', space: 'ห้วงอวกาศ', snow: 'ทุ่งหิมะ',
};
let playersState = { q: '', kind: 'all', sort: 'updated_at', page: 0, rows: [], total: 0 };

PAGES.players = async () => {
  $('page').innerHTML = `
    ${pageHead('ผู้เล่น', 'กดที่แถวเพื่อดูรายละเอียด ส่งของขวัญ แก้ไข หรือลบ',
      `<button class="btn danger" id="purge">${ICON.broom}เคลียร์ผู้มาเยือน</button>`)}
    <div class="toolbar">
      <input class="grow" id="q" type="search" placeholder="ไอดีผู้ใช้ 8 ตัว ชื่อ หรืออีเมล" value="${esc(playersState.q)}" autocomplete="off" spellcheck="false">
      <select id="kind">
        <option value="all">ทุกประเภท</option>
        <option value="email">เข้าด้วยอีเมล</option>
        <option value="guest">ผู้มาเยือน</option>
      </select>
      <select id="sort">
        <option value="updated_at">เล่นล่าสุด</option>
        <option value="created_at">สมัครล่าสุด</option>
        <option value="gold">ทองมากสุด</option>
        <option value="gems">เพชรมากสุด</option>
        <option value="best_score">คะแนนสูงสุด</option>
      </select>
      <span class="count" id="count"></span>
    </div>
    <div id="list"></div>
    <div class="pager">
      <button class="btn ghost" id="prev">ก่อนหน้า</button>
      <span id="pageNo"></span>
      <button class="btn ghost" id="next">ถัดไป</button>
    </div>`;

  $('kind').value = playersState.kind;
  $('sort').value = playersState.sort;

  const reload = () => loadPlayers();
  let t = 0;
  $('q').addEventListener('input', (e) => {
    playersState.q = e.target.value;
    playersState.page = 0;
    clearTimeout(t);
    t = setTimeout(reload, 250);   // หน่วงไว้ ไม่ยิงฐานข้อมูลทุกตัวอักษร
  });
  $('kind').addEventListener('change', (e) => { playersState.kind = e.target.value; playersState.page = 0; reload(); });
  $('sort').addEventListener('change', (e) => { playersState.sort = e.target.value; playersState.page = 0; reload(); });
  $('purge').addEventListener('click', openPurge);
  $('prev').addEventListener('click', () => { if (playersState.page > 0) { playersState.page--; reload(); } });
  $('next').addEventListener('click', () => {
    if ((playersState.page + 1) * PAGE_SIZE < playersState.total) { playersState.page++; reload(); }
  });

  loadPlayers();
};

async function loadPlayers() {
  const s = playersState;
  $('list').innerHTML = '<div class="tablewrap"><div class="empty">กำลังโหลด…</div></div>';

  const c = await client();
  let q = c.from('admin_players').select('*', { count: 'exact' });

  const raw = s.q.trim();
  if (raw) {
    // ไอดีผู้ใช้ 8 ตัว = หาคนนั้นตรงตัว (ไอดีอยู่ในตาราง players ไม่ได้อยู่ใน view นี้)
    // ถ้าไม่เจอ ค่อยค้นเป็นชื่อต่อ เพราะชื่อ 8 ตัวอักษรก็มี
    const byCode = CODE_RE.test(raw.toUpperCase())
      ? (await c.from('players').select('id').eq('friend_code', raw.toUpperCase()).limit(1)).data?.[0]?.id
      : null;
    if (byCode) q = q.eq('id', byCode);
    else {
      // or() ของ postgrest ต้องหนีคอมมากับวงเล็บในคำค้น ไม่งั้นมันไปแยกเป็นเงื่อนไขใหม่
      const term = raw.replace(/[(),]/g, ' ');
      q = q.or(`name.ilike.%${term}%,email.ilike.%${term}%`);
    }
  }
  if (s.kind === 'guest') q = q.is('email', null);
  if (s.kind === 'email') q = q.not('email', 'is', null);

  const from = s.page * PAGE_SIZE;
  const { data, error, count } = await q
    .order(s.sort, { ascending: false, nullsFirst: false })
    .range(from, from + PAGE_SIZE - 1);

  if (error) return failInto('list', error);

  s.rows = await attachCodes(data || []);
  s.total = count || 0;
  $('count').textContent = `${num(s.total)} คน`;
  $('pageNo').textContent = `${s.page + 1} / ${Math.max(1, Math.ceil(s.total / PAGE_SIZE))}`;
  $('prev').disabled = s.page === 0;
  $('next').disabled = (s.page + 1) * PAGE_SIZE >= s.total;

  const cols = [
    { label: 'ผู้เล่น', cell: whoCell },
    { label: 'บัญชี', cell: accountPill },
    { label: 'ทอง', num: true, cell: (r) => num(r.gold) },
    { label: 'เพชร', num: true, cell: (r) => num(r.gems) },
    { label: 'คะแนนสูงสุด', num: true, cell: (r) => num(r.best_score) },
    { label: 'รอบวิ่ง', num: true, cell: (r) => num(r.stats?.runs ?? 0) },
    { label: 'เล่นล่าสุด', cell: (r) => esc(when(r.updated_at)) },
    { label: 'สมัครเมื่อ', cell: (r) => esc(when(r.created_at)) },
  ];

  $('list').innerHTML = tableHTML(cols, s.rows, { onRow: true, empty: 'ไม่เจอผู้เล่นที่ตรงกับไอดีหรือคำค้น' });
  if (s.rows.length === 1 && CODE_RE.test(raw.toUpperCase()) && s.rows[0].friend_code === raw.toUpperCase()) {
    openPlayer(s.rows[0]);
  }
  el('tbody', $('list'))?.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-i]');
    if (tr) openPlayer(s.rows[+tr.dataset.i]);
  });
}

// ── ลิ้นชักรายละเอียดผู้เล่น ────────────────────────────────

function openDrawer(title, html) {
  $('drawerTitle').textContent = title;
  $('drawerBody').innerHTML = html;
  $('drawer').classList.remove('hidden');
  $('scrim').classList.remove('hidden');
}
function closeDrawer() {
  $('drawer').classList.add('hidden');
  $('scrim').classList.add('hidden');
}

async function openPlayer(p) {
  const jsonBox = (v) => `<div class="json">${esc(JSON.stringify(v ?? null, null, 2))}</div>`;
  // แถวจากหน้าตรวจผิดปกติ/ลิงก์อื่นอาจยังไม่มีไอดีผู้ใช้ — เติมก่อนเปิด
  if (!p.friend_code) [p] = await attachCodes([p]);

  openDrawer('รายละเอียดผู้เล่น', `
    <div class="pcard">
      ${avatar(p)}
      <div class="pname">${esc(p.name || 'แมวนิรนาม')}</div>
      <div class="pmeta">
        ${p.friend_code ? `<code class="uid">${esc(p.friend_code)}</code>` : ''}
        ${accountPill(p)}
      </div>
      <div class="pacts">
        <button class="btn small" id="pMail" type="button">${ICON.gift}ส่งของขวัญ</button>
        ${p.friend_code ? `<button class="btn ghost small" id="pCopy" type="button">${ICON.copy}คัดลอกไอดี</button>` : ''}
      </div>
    </div>
    <div class="pnums">
      <div><span>ทอง</span><b>${num(p.gold)}</b></div>
      <div><span>เพชร</span><b>${num(p.gems)}</b></div>
      <div><span>คะแนนสูงสุด</span><b>${num(p.best_score)}</b></div>
      <div><span>รอบวิ่ง</span><b>${num(p.stats?.runs ?? 0)}</b></div>
      <div><span>สุ่มกาช่า</span><b>${num(p.pull_count)}</b></div>
      <div><span>XP</span><b>${num(p.xp)}</b></div>
    </div>
    <div class="row2">
      <div class="formrow"><label>เข้าครั้งล่าสุด</label><div class="readonly">${esc(when(p.last_sign_in_at))}</div></div>
      <div class="formrow"><label>ซิงก์ล่าสุด</label><div class="readonly">${esc(when(p.updated_at))}</div></div>
    </div>

    <div class="sect">แก้ไขได้</div>
    <div class="formrow"><label>ชื่อที่โชว์</label><input id="f_name" type="text" value="${esc(p.name)}" maxlength="16"></div>
    <div class="row2">
      <div class="formrow"><label>ทอง</label>
        <input id="f_gold" type="number" value="${p.gold ?? 0}" disabled></div>
      <div class="formrow"><label>เพชร</label>
        <input id="f_gems" type="number" value="${p.gems ?? 0}" disabled></div>
      <p class="fieldnote">
        แก้ทองกับเพชรตรงนี้ไม่ได้ เพราะแก้แล้วหายเงียบ ๆ —
        ตัวเกมของผู้เล่นดันข้อมูลทั้งแถวขึ้นมาทับทุกครั้งที่มีอะไรเปลี่ยนในเครื่อง
        ค่าที่เพิ่งตั้งจึงถูกเขียนทับด้วยค่าเดิมของเขาภายในไม่กี่วินาทีถ้าเขาเปิดเกมอยู่
        <br>
        <b>ใช้แท็บ "จดหมาย" ส่งเป็นของขวัญแทน</b> — ของขวัญอยู่คนละตารางที่ตัวเกมเขียนไม่ได้
        จึงไม่มีวันถูกทับ และผู้เล่นได้รับแน่นอนไม่ว่าตอนส่งเขาจะออนไลน์อยู่หรือเปล่า
      </p>
    </div>
    <div class="row2">
      <div class="formrow"><label>XP</label><input id="f_xp" type="number" value="${p.xp ?? 0}"></div>
      <div class="formrow"><label>ด่านที่เลือก</label><input id="f_stage" type="text" value="${esc(p.stage)}"></div>
    </div>
    <div class="row2">
      <div class="formrow"><label>สีขน</label><input id="f_skin" type="text" value="${esc(p.skin)}"></div>
      <div class="formrow"><label>ชุดที่ใส่</label><input id="f_outfit" type="text" value="${esc(p.outfit)}"></div>
    </div>

    <details class="raw">
      <summary>ข้อมูลดิบ (อ่านอย่างเดียว)</summary>
      <div class="rawbody">
        <div class="formrow"><label>รหัสระบบ (uuid)</label><div class="readonly">${esc(p.id)}</div></div>
        <div class="formrow"><label>สถิติสะสม</label>${jsonBox(p.stats)}</div>
        <div class="formrow"><label>สมบัติกับขั้นตีบวก</label>${jsonBox(p.treasures)}</div>
        <div class="formrow"><label>ชุดที่สุ่มได้แล้ว (${(p.owned || []).length} ชิ้น)</label>${jsonBox(p.owned)}</div>
        <div class="formrow"><label>สมบัติที่ติดตั้ง</label>${jsonBox(p.equip)}</div>
        <div class="formrow"><label>กิจกรรมที่กดรับแล้ว</label>${jsonBox(p.quests_claimed)}</div>
      </div>
    </details>

    <div class="drawer-actions">
      <button class="btn" id="save">บันทึก</button>
      <button class="btn ghost" id="cancel">ปิด</button>
      <button class="btn danger" id="del">ลบบัญชีนี้</button>
    </div>
    <p class="sub" style="margin-top:14px">
      ลบทั้งบัญชีเข้าสู่ระบบและข้อมูลเกมทุกอย่าง (คะแนน ประวัติกาช่า สมบัติ ชุด)
      ในคำสั่งเดียว ย้อนกลับไม่ได้
      <br><br>
      ต้องลบให้ขาดแบบนี้ ไม่ใช่ลบแค่ข้อมูลเกม — เพราะถ้าบัญชียังอยู่และเจ้าของ
      ยังมีข้อมูลค้างในเครื่อง เกมจะ upsert ดันขึ้นคลาวด์ใหม่ทันทีที่เปิด = ลบไม่ขาด
    </p>`);

  $('cancel').addEventListener('click', closeDrawer);
  $('pMail').addEventListener('click', () => mailTo(p));
  $('pCopy')?.addEventListener('click', () => copyText(p.friend_code, 'คัดลอกไอดี ' + p.friend_code + ' แล้ว'));
  $('save').addEventListener('click', () => savePlayer(p));
  $('del').addEventListener('click', () => deletePlayer(p));
}

/**
 * บันทึกข้อมูลผู้เล่นหนึ่งคน
 *
 * ── ทำไมไม่มีทองกับเพชรใน patch ──
 * เขียนลง players ตรง ๆ ได้ก็จริง แต่มัน "ไม่อยู่" — ตัวเกมของผู้เล่นเก็บค่าพวกนี้
 * ไว้ในเครื่องแล้วดันขึ้นมาทับทั้งแถวทุกครั้งที่มีอะไรเปลี่ยน (pushPlayer ใน net/sync.js
 * ส่ง readLocal() ทั้งก้อน) ส่วนขาดึงลงจากคลาวด์ทำครั้งเดียวตอนเปิดเกม
 *
 * ผลคือถ้าผู้เล่นเปิดเกมอยู่ตอนที่แอดมินกดบันทึก ค่าที่เพิ่งตั้งจะโดนทับหายภายใน
 * ไม่กี่วินาที แต่ถ้าเขาปิดเกมอยู่ค่าจะติด — อาการที่เห็นจึงเป็น "เพิ่มให้คนนี้ขึ้น
 * อีกคนไม่ขึ้น" ทั้งที่ทำเหมือนกันทุกอย่าง ซึ่งหาสาเหตุยากมากถ้าไม่รู้เรื่องนี้
 *
 * ของขวัญผ่านแท็บจดหมายไม่มีปัญหานี้ เพราะอยู่คนละตารางที่ไคลเอนต์เขียนไม่ได้เลย
 * (ดูเหตุผลเต็มที่หัวไฟล์ supabase/mail.sql)
 *
 * ช่องอื่น (ชื่อ/ด่าน/สกิน/ชุด/XP) ยังแก้ได้ตามปกติ เพราะเป็นค่าที่แอดมินใช้แก้
 * ตอนผู้เล่นติดปัญหา ซึ่งมักเป็นตอนที่เขาไม่ได้เปิดเกมอยู่แล้ว
 */
async function savePlayer(p) {
  const patch = {
    name: $('f_name').value.trim() || 'แมวนิรนาม',
    xp: Math.max(0, Math.floor(+$('f_xp').value || 0)),
    stage: $('f_stage').value.trim(),
    skin: $('f_skin').value.trim(),
    outfit: $('f_outfit').value.trim(),
  };

  $('save').disabled = true;
  const c = await client();
  const { error } = await c.from('players').update(patch).eq('id', p.id);
  $('save').disabled = false;

  if (error) return toast('บันทึกไม่สำเร็จ: ' + errText(error), 'bad');
  toast('บันทึกแล้ว', 'good');
  closeDrawer();
  loadPlayers();
}

/**
 * ลบบัญชีผู้เล่นหนึ่งคนให้ขาด
 *
 * เรียก admin_delete_user() ในฐานข้อมูล ไม่ได้ลบจากหน้าเว็บตรง ๆ เพราะบัญชี
 * อยู่ใน auth.users ซึ่งไคลเอนต์แตะไม่ได้ (เหตุผลเต็มอยู่ใน supabase/admin.sql)
 *
 * ให้พิมพ์ชื่อยืนยันแทนกล่อง "แน่ใจมั้ย?" ธรรมดา เพราะกล่องที่กดปุ่มเดียวจบ
 * คนกดผ่านโดยไม่อ่านเสมอเมื่อทำงานซ้ำ ๆ การต้องพิมพ์ชื่อบังคับให้ต้องมองว่า
 * กำลังลบของใครอยู่จริง ๆ ซึ่งเป็นจุดที่พลาดบ่อยที่สุดของงานแบบนี้
 */
async function deletePlayer(p) {
  const name = (p.name || '').trim();
  const typed = await ask({
    title: 'ลบบัญชีผู้เล่น',
    body: `กำลังจะลบบัญชีของ <b>${esc(name)}</b> ทั้งหมด —
           ทั้งบัญชีเข้าสู่ระบบ คะแนน และประวัติกาช่า<br>
           <span class="warn">ย้อนกลับไม่ได้</span>`,
    expect: name,
    label: 'พิมพ์ชื่อผู้เล่นเพื่อยืนยัน',
    okText: 'ลบบัญชีนี้',
  });
  if (typed === null) return;

  const c = await client();
  const { error } = await c.rpc('admin_delete_user', { p_id: p.id });
  if (error) return toast('ลบไม่สำเร็จ: ' + errText(error), 'bad');

  toast('ลบบัญชีแล้ว', 'good');
  closeDrawer();
  loadPlayers();
}

/**
 * เคลียร์บัญชีผู้มาเยือนทีละหลายบัญชี
 *
 * บังคับให้กด "ดูก่อน" จนได้ตัวเลขก่อนเสมอ ปุ่มลบถึงจะกดได้ — คำสั่งลบเป็นชุด
 * คือสิ่งที่พลาดแล้วเจ็บที่สุดในเครื่องมือแบบนี้ การเห็นตัวเลขก่อนคือด่านเดียว
 * ที่จะจับได้ว่าตั้งเงื่อนไขผิด (เช่นเผลอใส่ 0 วัน แล้วมันจะกวาดทั้งหมด)
 *
 * ตัวเลขที่พรีวิวกับที่ลบมาจากฟังก์ชันเดียวกันในฐานข้อมูล ต่างกันแค่ธง dry run
 * จึงเป็นไปไม่ได้ที่เงื่อนไขสองอันจะหลุดจากกัน
 */
function openPurge() {
  openDrawer('เคลียร์ผู้มาเยือน', `
    <p class="sub">
      ผู้มาเยือนคือบัญชีที่ไม่มีอีเมลผูกไว้ เกิดใหม่ทุกครั้งที่มีคนกด
      "เล่นแบบผู้มาเยือน" บนเครื่องใหม่หรือหลังล้างเบราว์เซอร์ นานไปจึงมีบัญชีร้างสะสม
    </p>

    <div class="formrow">
      <label>ไม่ได้เล่นมานานเกิน (วัน) — ใส่ 0 = ไม่สนเรื่องวัน</label>
      <input id="pg_days" type="number" value="3" min="0">
    </div>
    <div class="formrow">
      <label><input id="pg_idle" type="checkbox" checked style="width:auto"> เฉพาะคนที่ไม่เคยวิ่งจบสักรอบและไม่มีคะแนน</label>
    </div>

    <div class="drawer-actions">
      <button class="btn ghost" id="pg_preview">ดูว่าจะลบกี่บัญชี</button>
      <button class="btn danger" id="pg_go" disabled>ลบเลย</button>
    </div>

    <p class="msg" id="pg_msg"></p>

    <p class="sub" style="margin-top:14px">
      บัญชีของคุณเอง บัญชีแอดมินคนอื่น และบัญชีที่ผูกอีเมลไว้แล้ว จะไม่โดนลบ
      ไม่ว่าตั้งเงื่อนไขยังไง — กันไว้ในฝั่งฐานข้อมูล ไม่ใช่แค่ในหน้าเว็บ
    </p>`);

  let previewed = -1;

  const args = () => ({
    p_days: Math.max(0, Math.floor(+$('pg_days').value || 0)),
    p_idle_only: $('pg_idle').checked,
  });

  // เปลี่ยนเงื่อนไขเมื่อไหร่ ตัวเลขที่ดูไว้ก็ใช้ไม่ได้แล้ว ต้องกดดูใหม่
  const invalidate = () => {
    previewed = -1;
    $('pg_go').disabled = true;
    $('pg_msg').textContent = '';
    $('pg_msg').className = 'msg';
  };
  $('pg_days').addEventListener('input', invalidate);
  $('pg_idle').addEventListener('change', invalidate);

  $('pg_preview').addEventListener('click', async () => {
    const c = await client();
    const { data, error } = await c.rpc('admin_purge_guests', { ...args(), p_dry_run: true });
    if (error) {
      $('pg_msg').textContent = errText(error);
      $('pg_msg').className = 'msg bad';
      return;
    }
    previewed = data ?? 0;
    $('pg_go').disabled = previewed === 0;
    $('pg_msg').textContent = previewed === 0
      ? 'ไม่มีบัญชีไหนเข้าเงื่อนไขนี้'
      : 'จะลบ ' + num(previewed) + ' บัญชี';
    $('pg_msg').className = 'msg ' + (previewed === 0 ? '' : 'good');
  });

  $('pg_go').addEventListener('click', async () => {
    if (previewed <= 0) return;
    const typed = await ask({
      title: 'เคลียร์บัญชีผู้มาเยือน',
      body: `กำลังจะลบ <b>${num(previewed)} บัญชี</b> ถาวร<br>
             <span class="warn">ย้อนกลับไม่ได้</span>`,
      expect: previewed,
      label: `พิมพ์เลข ${previewed} เพื่อยืนยัน`,
      okText: 'ลบทั้งหมด',
    });
    if (typed === null) return;

    $('pg_go').disabled = true;
    const c = await client();
    const { data, error } = await c.rpc('admin_purge_guests', { ...args(), p_dry_run: false });
    if (error) {
      $('pg_go').disabled = false;
      return toast('ลบไม่สำเร็จ: ' + errText(error), 'bad');
    }
    toast('ลบไปแล้ว ' + num(data ?? 0) + ' บัญชี', 'good');
    closeDrawer();
    loadPlayers();
  });
}

// ── หน้า 3: คะแนน ───────────────────────────────────────────

PAGES.scores = async () => {
  $('page').innerHTML = `
    ${pageHead('คะแนน', 'สถิติสูงสุดของแต่ละคนแยกตามด่าน — ลบได้ทีละแถวเมื่อเจอคะแนนที่ไม่น่าเป็นไปได้')}
    <div class="toolbar">
      <input class="grow" id="sq" type="text" placeholder="ค้นชื่อผู้เล่น">
      <span class="count" id="scount"></span>
    </div>
    <div id="slist"><div class="tablewrap"><div class="empty">กำลังโหลด…</div></div></div>`;

  let t = 0;
  $('sq').addEventListener('input', () => { clearTimeout(t); t = setTimeout(loadScores, 250); });
  loadScores();
};

async function loadScores() {
  const term = $('sq').value.trim().replace(/[(),]/g, ' ');
  const c = await client();
  let q = c.from('admin_scores').select('*', { count: 'exact' });
  if (term) q = q.ilike('name', `%${term}%`);

  const { data, error, count } = await q.order('score', { ascending: false }).range(0, 199);
  if (error) return failInto('slist', error);

  const rows = await attachCodes(data || [], 'player_id');
  $('scount').textContent = `${num(count || 0)} แถว (โชว์สูงสุด 200)`;

  const cols = [
    { label: 'ผู้เล่น', cell: (r) => whoCell({ ...r, id: r.player_id }) },
    { label: 'บัญชี', cell: accountPill },
    { label: 'ด่าน', cell: (r) => esc(STAGE_NAME[r.stage_id] || r.stage_id) },
    { label: 'คะแนน', num: true, cell: (r) => num(r.score) },
    { label: 'ระยะทาง', num: true, cell: (r) => num(r.distance) + ' ม.' },
    { label: 'เมื่อ', cell: (r) => esc(when(r.updated_at)) },
    { label: '', cell: () => '<button class="btn danger small" data-act="del">ลบ</button>' },
  ];

  $('slist').innerHTML = tableHTML(cols, rows, { empty: 'ยังไม่มีคะแนน' });
  el('tbody', $('slist'))?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act="del"]');
    if (!btn) return;
    const r = rows[+btn.closest('tr').dataset.i];
    // คะแนนแถวเดียวลบแล้วสร้างใหม่ได้ด้วยการเล่น ไม่ต้องให้พิมพ์ยืนยัน
    // เก็บการพิมพ์ไว้ใช้เฉพาะของที่ลบแล้วหายถาวรจริง ๆ (บัญชี) ไม่งั้นจะกลายเป็น
    // พิธีกรรมที่คนพิมพ์ผ่านโดยไม่อ่าน แล้วการยืนยันก็หมดความหมายทุกที่
    const okDel = await ask({
      title: 'ลบคะแนนนี้',
      body: `คะแนน <b>${num(r.score)}</b> ของ <b>${esc(r.name)}</b><br>
             ด่าน <b>${esc(r.stage_id)}</b>`,
      okText: 'ลบคะแนน',
    });
    if (!okDel) return;

    const { error: e2 } = await c
      .from('best_scores').delete()
      .eq('player_id', r.player_id).eq('stage_id', r.stage_id);
    if (e2) return toast('ลบไม่สำเร็จ: ' + errText(e2), 'bad');
    toast('ลบคะแนนแล้ว', 'good');
    loadScores();
  });
}

// ── หน้า 4: กาช่า ───────────────────────────────────────────

PAGES.pulls = async () => {
  $('page').innerHTML = `
    ${pageHead('ประวัติกาช่า', '200 รายการล่าสุด พร้อมสัดส่วนความหายากที่ออกจริง — เอาไว้เทียบกับอัตราที่ตั้งไว้ในเกม')}
    <div id="pstats" class="cards"></div>
    <div id="plist"><div class="tablewrap"><div class="empty">กำลังโหลด…</div></div></div>`;

  const c = await client();
  const { data, error } = await c.from('admin_pulls').select('*').order('created_at', { ascending: false }).range(0, 199);
  if (error) return failInto('plist', error);

  const rows = await attachCodes(data || [], 'player_id');

  // สัดส่วนความหายากจากที่ออกจริง — ตัวเลขนี้ควรใกล้อัตราที่ตั้งไว้ในเกม
  // ถ้าเพี้ยนไปมากแปลว่าสูตรสุ่มมีปัญหา หรือมีคนยิง API ตรงเข้ามาเขียนเอง
  const byRarity = {};
  rows.forEach((r) => { byRarity[r.rarity || '—'] = (byRarity[r.rarity || '—'] || 0) + 1; });
  const RANK = ['SS', 'S', 'A', 'B', 'C'];
  const rk = (k) => (RANK.includes(k) ? RANK.indexOf(k) : 99);
  $('pstats').innerHTML = Object.entries(byRarity)
    .sort((a, b) => rk(a[0]) - rk(b[0]) || b[1] - a[1])
    .map(([k, v]) => `<div class="card"><div class="lbl">${esc(k)}</div><div class="val violet">${v}</div>
        <div class="note">${rows.length ? ((v / rows.length) * 100).toFixed(1) : 0}% ของที่โชว์</div></div>`)
    .join('') || '<div class="card"><div class="lbl">ยังไม่มีการสุ่ม</div></div>';

  const cols = [
    { label: 'ผู้เล่น', cell: (r) => whoCell({ ...r, id: r.player_id }) },
    { label: 'ได้ชุด', cell: (r) => esc(r.outfit_id || '—') },
    { label: 'ความหายาก', cell: (r) => (r.rarity ? `<span class="pill rar-${esc(r.rarity)}">${esc(r.rarity)}</span>` : '—') },
    { label: 'ทองที่ได้', num: true, cell: (r) => num(r.gold_won) },
    { label: 'ของใหม่', cell: (r) => (r.is_new ? '<span class="pill email">ใหม่</span>' : '—') },
    { label: 'เมื่อ', cell: (r) => esc(when(r.created_at)) },
  ];
  $('plist').innerHTML = tableHTML(cols, rows, { empty: 'ยังไม่มีใครสุ่มกาช่า' });
};

// ── หน้า 5: ตรวจผิดปกติ ────────────────────────────────────
//
// หน้านี้คือเหตุผลหลักที่หน้าหลังบ้านคุ้มค่าที่จะมี — ตารางเปล่า ๆ บอกได้แค่
// "มีอะไรบ้าง" แต่หน้านี้ตอบว่า "มีอะไรที่ควรไปดู" ซึ่งเป็นสิ่งที่คนดูแลเกม
// ต้องการจริง ๆ เกณฑ์ปรับได้ เพราะค่าที่ถือว่าปกติจะขยับตามที่เกมโตขึ้น

// ── ส่งจดหมายกับของขวัญ ─────────────────────────────────────
//
// จดหมายที่ส่งจากที่นี่ลงตาราง mail_outbox ไม่ได้เขียนทับ players.mail
// เหตุผลอยู่ในหัวไฟล์ supabase/mail.sql — สรุปสั้น ๆ คือถ้าเขียนลงแถวผู้เล่น
// ตอนที่เจ้าของออนไลน์อยู่ การซิงก์ครั้งถัดไปของเขาจะทับของขวัญหายไปเงียบ ๆ

const mailState = { to: null, mode: 'one', rows: [], found: [] };

/** ไอดีผู้ใช้ที่ผู้เล่นเห็นในเกม = รหัสแมวน้อย 8 ตัว (players.friend_code) */
const CODE_RE = /^[A-Z0-9]{8}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ยังไม่ได้รัน mail_welcome.sql = ตารางยังไม่มีคอลัมน์ kind/active */
function needWelcomeSql(error) {
  return /kind|active|eligible|to_code/.test(String(error?.message || ''));
}
const WELCOME_SQL_HINT = 'ต้องรัน supabase/mail_welcome.sql ใน Supabase ก่อน';

const MODE_BTN = { one: 'ส่งจดหมาย', all: 'ส่งให้ทุกคน', welcome: 'ตั้งจดหมายต้อนรับ' };

PAGES.mail = async () => {
  $('page').innerHTML = `
    ${pageHead('จดหมายและของขวัญ', 'ของขวัญจะเข้ากล่องจดหมายในเกม ผู้เล่นต้องกดรับเอง ทองกับเพชรบวกให้ตอนกดรับ ไม่ใช่ตอนส่ง')}

    <div class="mailform">
      <div class="fld">
        <span>ส่งถึง</span>
        <div class="modes">
          <button class="mode on" id="mModeOne" type="button">เลือกทีละคน</button>
          <button class="mode" id="mModeAll" type="button">ทั้งเซิร์ฟ</button>
          <button class="mode" id="mModeWelcome" type="button">ต้อนรับบัญชีใหม่</button>
        </div>
        <div id="mOne" class="onebox">
          <div class="pickrow">
            <input id="mTo" type="search" placeholder="ไอดีผู้ใช้ 8 ตัว ชื่อ หรืออีเมล" autocomplete="off" spellcheck="false">
            <button class="btn ghost" id="mClear" type="button">ล้าง</button>
          </div>
          <small class="note">ไอดีผู้ใช้ = "รหัสแมวน้อย" ในหน้าโปรไฟล์ของผู้เล่น เช่น 8QQMVX2X</small>
          <div id="mFound" class="found"></div>
        </div>
        <div id="mPicked" class="picked"></div>
      </div>

      <label class="fld"><span>หัวข้อ</span>
        <input id="mTitle" maxlength="80" placeholder="เช่น ขอโทษที่เซิร์ฟล่ม"></label>

      <label class="fld"><span>ข้อความ</span>
        <textarea id="mBody" rows="5" maxlength="1000" placeholder="พิมพ์ข้อความถึงผู้เล่น เว้นบรรทัดได้"></textarea></label>

      <div class="giftrow">
        <label class="fld"><span>เหรียญทอง</span>
          <input id="mGold" type="number" min="0" max="9999999" step="100" value="0"></label>
        <label class="fld"><span>อัญมณีสีชมพู</span>
          <input id="mGems" type="number" min="0" max="9999999" step="10" value="0"></label>
      </div>

      <div class="sendrow">
        <button class="btn" id="mSend" type="button" disabled>ส่งจดหมาย</button>
        <span id="mHint" class="note">เลือกผู้รับก่อน</span>
      </div>
    </div>

    <h3 class="mailsent">จดหมายพิเศษ · ต้อนรับบัญชีใหม่</h3>
    <p class="sub">ส่งให้อัตโนมัติทุกครั้งที่มีคนสร้างบัญชีใหม่ แก้ข้อความหรือยกเลิกได้ตลอด ผู้เล่นที่มีบัญชีอยู่ก่อนวันตั้งจดหมายจะไม่ได้</p>
    <div id="mWelcome" class="welcomes"><div class="empty">กำลังโหลด…</div></div>

    <h3 class="mailsent">จดหมายที่ส่งไปแล้ว</h3>
    <div id="mList"><div class="tablewrap"><div class="empty">กำลังโหลด…</div></div></div>`;

  const to = $('mTo');
  let timer = null;

  // ค้นแบบหน่วงไว้ ไม่ยิงทุกตัวอักษรที่พิมพ์
  to.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(searchPlayers, 260);
  });
  // วางไอดีแล้วกด Enter = ค้นทันที ไม่ต้องรอ
  to.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    clearTimeout(timer);
    searchPlayers();
  });
  $('mClear').addEventListener('click', () => {
    mailState.to = null;
    to.value = '';
    $('mFound').innerHTML = '';
    renderPicked();
  });
  $('mModeOne').addEventListener('click', () => setMode('one'));
  $('mModeAll').addEventListener('click', () => setMode('all'));
  $('mModeWelcome').addEventListener('click', () => setMode('welcome'));
  $('mSend').addEventListener('click', sendMail);

  setMode('one');
  // มาจากปุ่ม "ส่งของขวัญ" ในลิ้นชักผู้เล่น = เลือกผู้รับไว้ให้แล้ว
  if (mailState.preset) {
    mailState.to = mailState.preset;
    mailState.preset = null;
    renderPicked();
    $('mTitle').focus();
  }
  loadSentMail();
};

/** เปิดหน้าจดหมายพร้อมเลือกผู้รับคนนี้ไว้ */
function mailTo(p) {
  mailState.preset = { id: p.id, name: p.name, email: p.email ?? null, friend_code: p.friend_code || '' };
  go('mail');
}

/**
 * ค้นผู้รับ — พิมพ์ไอดีผู้ใช้ (รหัสแมวน้อย 8 ตัว) หรือ uuid = หาตรงตัว
 * นอกนั้นค้นจากชื่อ/อีเมลเหมือนเดิม แล้วแนบไอดีของแต่ละคนมาให้เห็นด้วย
 */
async function searchPlayers() {
  const term = $('mTo').value.trim();
  const box = $('mFound');
  if (term.length < 2) return (box.innerHTML = '');

  const c = await client();
  const code = term.toUpperCase();
  let rows = [];

  if (CODE_RE.test(code) || UUID_RE.test(term)) {
    const q = c.from('players').select('id, name, friend_code');
    const { data, error } = await (UUID_RE.test(term) ? q.eq('id', term) : q.eq('friend_code', code)).limit(1);
    if (error) return (box.innerHTML = `<div class="empty">ค้นหาไม่ได้: ${esc(errText(error))}</div>`);
    rows = data || [];
    // เจอไอดีตรงตัวแล้ว เติมอีเมลให้รู้ว่าเป็นบัญชีแบบไหน (players ไม่มีอีเมล)
    if (rows.length) {
      const { data: acc } = await c.from('admin_players').select('id, email').eq('id', rows[0].id).limit(1);
      rows[0] = { ...rows[0], email: acc?.[0]?.email ?? null };
    }
  }

  // ไอดี 8 ตัวบางทีก็เป็นชื่อได้ (เช่น "MEOWMEOW") หาไอดีไม่เจอค่อยค้นแบบชื่อต่อ
  if (!rows.length) {
    const safe = term.replace(/[(),]/g, ' ');
    const { data, error } = await c
      .from('admin_players')
      .select('id, name, email')
      .or(`name.ilike.%${safe}%,email.ilike.%${safe}%`)
      .limit(8);
    if (error) return (box.innerHTML = `<div class="empty">ค้นหาไม่ได้: ${esc(errText(error))}</div>`);
    rows = data || [];
    if (rows.length) {
      const { data: codes } = await c.from('players').select('id, friend_code').in('id', rows.map((r) => r.id));
      const byId = new Map((codes || []).map((r) => [r.id, r.friend_code]));
      rows = rows.map((r) => ({ ...r, friend_code: byId.get(r.id) || '' }));
    }
  }

  mailState.found = rows;
  if (!rows.length) return (box.innerHTML = '<div class="empty">ไม่เจอผู้เล่นที่ตรงกับไอดีหรือคำค้น</div>');

  box.innerHTML = rows
    .map((p, i) => `<button class="foundrow" data-i="${i}" type="button">
        <b>${esc(p.name)}</b>
        <span>${p.friend_code ? `<code class="uid">${esc(p.friend_code)}</code> · ` : ''}${p.email ? esc(p.email) : 'ผู้มาเยือน'}</span>
      </button>`)
    .join('');

  box.querySelectorAll('.foundrow').forEach((el) => {
    el.addEventListener('click', () => {
      mailState.to = mailState.found[Number(el.dataset.i)];
      $('mTo').value = '';
      box.innerHTML = '';
      renderPicked();
    });
  });
}

/** สลับโหมดผู้รับ: one = ทีละคน / all = ทั้งเซิร์ฟ / welcome = ต้อนรับบัญชีใหม่ */
function setMode(mode) {
  mailState.mode = mode;
  // ล้างคนที่เลือกไว้ทุกครั้งที่สลับโหมด ไม่ให้เหลือค้างแล้วส่งผิดคน
  mailState.to = null;
  $('mTo').value = '';
  $('mFound').innerHTML = '';
  $('mOne').classList.toggle('hidden', mode !== 'one');
  $('mModeOne').classList.toggle('on', mode === 'one');
  $('mModeAll').classList.toggle('on', mode === 'all');
  $('mModeWelcome').classList.toggle('on', mode === 'welcome');
  $('mSend').textContent = MODE_BTN[mode];
  renderPicked();
}

function renderPicked() {
  const mode = mailState.mode;
  if (mode === 'all') {
    // บอกให้ชัดตรงนี้เลยว่าใครจะได้บ้าง เพราะ "ทั้งเซิร์ฟ" ตีความได้หลายแบบ
    // ฉบับที่ส่งทั้งเซิร์ฟเก็บเป็นแถวเดียวที่ไม่ระบุผู้รับ ใครเปิดเกมมาก็เห็น
    // คนที่สมัครทีหลังจึงได้ด้วย
    $('mPicked').innerHTML = '<span class="pill email">ผู้เล่นทุกคน</span> '
      + '<span class="note">รวมคนที่สมัครใหม่ทีหลัง</span>';
    $('mSend').disabled = false;
    $('mHint').textContent = '';
    return;
  }
  if (mode === 'welcome') {
    $('mPicked').innerHTML = '<span class="pill welcome">บัญชีใหม่ทุกบัญชี</span> '
      + '<span class="note">ส่งอัตโนมัติให้ทุกบัญชีที่สร้างหลังจากกดตั้ง · ผู้เล่นเดิมไม่ได้</span>';
    $('mSend').disabled = false;
    $('mHint').textContent = '';
    return;
  }

  const p = mailState.to;
  $('mPicked').innerHTML = p
    ? `<span class="pill email">${esc(p.name)}</span>${p.friend_code ? ` <code class="uid">${esc(p.friend_code)}</code>` : ''}`
      + ` <span class="note">${p.email ? esc(p.email) : 'ผู้มาเยือน'}</span>`
    : '<span class="note">ยังไม่ได้เลือกผู้รับ</span>';
  $('mSend').disabled = !p;
  $('mHint').textContent = p ? '' : 'เลือกผู้รับก่อน';
}

/** ค่าทอง/เพชรจากช่องกรอก — ติดลบหรือพิมพ์มั่วกลายเป็น 0 */
const giftVal = (id) => Math.max(0, Math.floor(Number($(id).value) || 0));
const giftText = (gold, gems) => (gold || gems
  ? `ทอง ${num(gold)} • เพชร ${num(gems)}`
  : 'ไม่มีของขวัญแนบ (ข้อความอย่างเดียว)');

async function sendMail() {
  const mode = mailState.mode;
  const p = mailState.to;
  if (mode === 'one' && !p) return;

  const title = $('mTitle').value.trim();
  const body = $('mBody').value;
  const gold = giftVal('mGold');
  const gems = giftVal('mGems');

  if (!title) return toast('ใส่หัวข้อก่อน', 'bad');

  // ให้ทวนของที่จะส่งอีกรอบ เพราะพิมพ์ศูนย์เกินตัวเดียวก็แจกเกินสิบเท่าแล้ว
  // ask() ใส่ body ด้วย innerHTML จึงต้อง esc ก่อน — หัวข้อมาจากช่องพิมพ์
  // ส่งทั้งเซิร์ฟถอนคืนไม่ได้และกระทบทุกคน จึงบังคับพิมพ์ยืนยันก่อน
  // ส่งทีละคนกับจดหมายต้อนรับกดยืนยันเฉย ๆ พอ (พลาดแล้วยังแก้/ยกเลิกได้)
  let title2 = 'ส่งให้ผู้เล่นทุกคน?';
  let extra = '<br><br>ทุกคนที่เปิดเกมจะได้รับ รวมคนที่สมัครใหม่ทีหลัง และถอนคืนไม่ได้';
  if (mode === 'one') {
    title2 = 'ส่งจดหมายถึง ' + p.name + '?';
    extra = p.friend_code ? '<br>ไอดีผู้ใช้: ' + esc(p.friend_code) : '';
  } else if (mode === 'welcome') {
    title2 = 'ตั้งจดหมายต้อนรับบัญชีใหม่?';
    extra = '<br><br>ทุกบัญชีที่สร้างหลังจากนี้จะได้ฉบับนี้อัตโนมัติ ผู้เล่นเดิมไม่ได้ แก้ข้อความหรือยกเลิกทีหลังได้';
  }
  const ok = await ask({
    title: title2,
    body: `หัวข้อ: ${esc(title)}<br>${esc(giftText(gold, gems))}${extra}`,
    expect: mode === 'all' ? 'ทั้งเซิร์ฟ' : null,
    label: mode === 'all' ? 'พิมพ์ว่า ทั้งเซิร์ฟ เพื่อยืนยัน' : '',
    okText: mode === 'welcome' ? 'ตั้งเลย' : 'ส่งเลย',
  });
  if (!ok) return;

  $('mSend').disabled = true;
  const c = await client();
  const row = {
    // null = ไม่ระบุผู้รับ (ทั้งเซิร์ฟ หรือ ต้อนรับบัญชีใหม่) แถวเดียวไม่ว่าจะมีผู้เล่นกี่คน
    to_player: mode === 'one' ? p.id : null,
    title, body, gold, gems,
    sent_by: (await c.auth.getUser()).data.user?.id ?? null,
  };
  // ใส่ kind เฉพาะจดหมายต้อนรับ — ฉบับธรรมดายังส่งได้แม้ยังไม่ได้รัน mail_welcome.sql
  if (mode === 'welcome') row.kind = 'welcome';
  const { error } = await c.from('mail_outbox').insert(row);
  $('mSend').disabled = false;

  if (error) {
    return toast('ส่งไม่สำเร็จ: ' + (needWelcomeSql(error) ? WELCOME_SQL_HINT : errText(error)), 'bad');
  }

  toast(mode === 'one' ? 'ส่งให้ ' + p.name + ' แล้ว'
    : mode === 'all' ? 'ส่งให้ผู้เล่นทุกคนแล้ว'
    : 'ตั้งจดหมายต้อนรับแล้ว บัญชีใหม่จะได้ตั้งแต่ตอนนี้', 'good');
  $('mTitle').value = '';
  $('mBody').value = '';
  $('mGold').value = '0';
  $('mGems').value = '0';
  loadSentMail();
}

async function loadSentMail() {
  const c = await client();
  const { data, error } = await c.from('admin_mail').select('*').limit(200);
  if (error) {
    failInto('mList', error);
    $('mWelcome').innerHTML = '';
    return;
  }

  const rows = data || [];
  // ยังไม่ได้รัน mail_welcome.sql = ไม่มีคอลัมน์ kind ทุกฉบับถือเป็นจดหมายธรรมดา
  const hasKind = rows.length === 0 || 'kind' in rows[0];
  mailState.rows = rows.filter((r) => r.kind !== 'welcome');
  renderWelcome(rows.filter((r) => r.kind === 'welcome'), hasKind);

  const cols = [
    { label: 'ถึง', cell: (r) => esc(r.to_name) + (r.to_code ? ` <code class="uid">${esc(r.to_code)}</code>` : '') },
    { label: 'หัวข้อ', cell: (r) => esc(r.title) },
    { label: 'ทอง', num: true, cell: (r) => num(r.gold) },
    { label: 'เพชร', num: true, cell: (r) => num(r.gems) },
    // ฉบับทั้งเซิร์ฟมีผู้รับหลายคน ตัวเลขจำนวนคนที่กดรับจึงมีความหมาย
    // ส่วนฉบับที่ส่งทีละคนมีได้แค่ 0 กับ 1 บอกเป็นสถานะอ่านง่ายกว่าบอกเป็นเลข
    { label: 'รับแล้ว', cell: (r) => (r.to_player === null
        ? `<span class="pill email">${num(r.claims)} คน</span>`
        : r.claims ? '<span class="pill email">รับแล้ว</span>'
                   : '<span class="pill guest">ยังไม่รับ</span>') },
    { label: 'ส่งเมื่อ', cell: (r) => esc(when(r.sent_at)) },
  ];
  // ยกเลิก/แก้ได้เฉพาะหลังรัน mail_welcome.sql (ต้องมีคอลัมน์ active)
  if (hasKind) {
    cols.push(
      { label: 'สถานะ', cell: (r) => (r.active === false
          ? '<span class="pill warn">ยกเลิกแล้ว</span>'
          : '<span class="pill email">ส่งอยู่</span>') },
      { label: '', cell: (r) => {
        // ส่งทีละคนแล้วเขารับไปแล้ว = จบเรื่อง ยกเลิกหรือแก้ก็ไม่มีผลอะไรแล้ว
        if (r.to_player !== null && r.claims) return '<span class="note">รับไปแล้ว</span>';
        return '<div class="rowacts">'
          + '<button class="btn ghost small" type="button" data-act="edit">แก้ไข</button>'
          + (r.active === false
            ? '<button class="btn small" type="button" data-act="on">เปิดส่งอีกครั้ง</button>'
            : '<button class="btn danger small" type="button" data-act="off">ยกเลิก</button>')
          + '</div>';
      } },
    );
  }
  $('mList').innerHTML = tableHTML(cols, mailState.rows, { empty: 'ยังไม่เคยส่งจดหมาย' });
  el('tbody', $('mList'))?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const r = mailState.rows[+b.closest('tr').dataset.i];
    if (b.dataset.act === 'edit') editMail(r);
    else setMailActive(r, b.dataset.act === 'on');
  });
}

// ── หน้า: ข่าวสาร ───────────────────────────────────────────
//
// ข่าวที่โผล่ในปุ่มโทรโข่งหน้าแรกของเกม — ตาราง news + รูปใน bucket "news"
// ฟอร์มเดียวใช้ทั้งเพิ่มใหม่และแก้ (กด "แก้" ในรายการ = โหลดข่าวนั้นขึ้นฟอร์ม)
// ขวาของฟอร์มมีตัวอย่างหน้าตาจริงในเกม เห็นก่อนกดลงข่าว

/**
 * ขนาดรูปข่าวที่พอดีกรอบในเกมเป๊ะ (เห็นทั้งแผ่น ไม่โดนตัดขอบ)
 * สัดส่วนต้องตรงกับ aspect-ratio ของ .news-hero ใน src/style.css (2.6 : 1) — แก้ที่หนึ่งต้องแก้อีกที่
 */
const NEWS_IMG = { w: 1560, h: 600 };
const NEWS_RATIO = NEWS_IMG.w / NEWS_IMG.h;

const NEWS_TAGS = ['ประกาศ', 'กิจกรรม', 'อัปเดต', 'ของขวัญ', 'ปิดปรับปรุง'];
const newsState = { editing: null, image: '', crop: { ...CROP0 } };

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const newsDay = (d) => {
  const t = new Date(d + 'T00:00:00');
  return Number.isNaN(t.getTime()) ? '' : t.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
};

PAGES.news = async () => {
  newsState.editing = null;
  newsState.image = '';
  newsState.crop = { ...CROP0 };
  $('page').innerHTML = `
    ${pageHead('ข่าวสาร', 'ข่าวจะขึ้นในปุ่มโทรโข่งหน้าแรกของเกม ผู้เล่นที่ยังไม่เปิดอ่านจะเห็นจุดแดงบนปุ่ม')}

    <div class="newsedit">
      <div class="mailform newsform">
        <h3 class="nf-head" id="nfHead">ลงข่าวใหม่</h3>
        <label class="fld"><span>หัวข้อ</span>
          <input id="nTitle" maxlength="90" placeholder="เช่น กิจกรรมวันฮาโลวีนมาแล้ว!"></label>

        <div class="giftrow">
          <label class="fld"><span>ป้าย</span>
            <input id="nTag" maxlength="16" list="nTagList" value="${NEWS_TAGS[0]}">
            <datalist id="nTagList">${NEWS_TAGS.map((t) => `<option value="${t}">`).join('')}</datalist></label>
          <label class="fld"><span>วันที่</span>
            <input id="nDate" type="date" value="${todayISO()}"></label>
        </div>

        <div class="fld"><span>รูปภาพ <small class="note">ขนาดพอดีกรอบในเกม <b>${NEWS_IMG.w} × ${NEWS_IMG.h} px</b> (แนวนอน 2.6 : 1) — สัดส่วนอื่นจะโดนตัดขอบให้พอดีกรอบ</small></span>
          <div class="pickrow">
            <input id="nImgUrl" type="url" placeholder="วางลิงก์รูป หรือกดอัปโหลด" autocomplete="off" spellcheck="false">
            <label class="btn ghost" for="nImgFile">อัปโหลด</label>
            <input id="nImgFile" type="file" accept="image/*" hidden>
            <button class="btn ghost" id="nImgClear" type="button">ลบรูป</button>
          </div>
          <small class="note" id="nImgMsg"></small>
          <small class="note img-size" id="nImgSize"></small>
          <label class="zoomrow"><span class="note">ครอบตัด: ลากรูปในตัวอย่างทางขวา · ซูม</span><input id="nZoom" type="range" min="1" max="${CROP_ZMAX}" step="0.01" value="1"><button class="btn ghost small" id="nCropReset" type="button">กลางรูป</button></label>
        </div>

        <label class="fld"><span>รายละเอียด</span>
          <textarea id="nBody" rows="7" maxlength="3000" placeholder="เล่ารายละเอียดข่าว เว้นบรรทัดว่าง = ขึ้นย่อหน้าใหม่"></textarea></label>

        <div class="nf-checks">
          <label class="chk"><input type="checkbox" id="nPinned"> ปักหมุดไว้บนสุด</label>
          <label class="chk"><input type="checkbox" id="nActive" checked> โชว์ในเกม</label>
        </div>

        <div class="sendrow">
          <button class="btn" id="nSave" type="button">ลงข่าว</button>
          <button class="btn ghost hidden" id="nCancel" type="button">ยกเลิกการแก้</button>
          <span id="nHint" class="note"></span>
        </div>
      </div>

      <div class="newsprev">
        <span class="note">ตัวอย่างในเกม</span>
        <div class="np-card" id="nPrev"></div>
      </div>
    </div>

    <h3 class="mailsent">ข่าวทั้งหมด</h3>
    <div id="nList"><div class="tablewrap"><div class="empty">กำลังโหลด…</div></div></div>`;

  ['nTitle', 'nTag', 'nDate', 'nBody'].forEach((id) => $(id).addEventListener('input', newsPreview));
  $('nImgUrl').addEventListener('input', () => { newsState.image = $('nImgUrl').value.trim(); newsState.crop = { ...CROP0 }; newsPreview(); });
  $('nImgFile').addEventListener('change', uploadNewsImage);
  $('nZoom').addEventListener('input', () => setNewsCrop(normCrop({ ...newsState.crop, z: +$('nZoom').value })));
  $('nCropReset').addEventListener('click', () => setNewsCrop({ ...CROP0 }));
  $('nImgClear').addEventListener('click', () => {
    newsState.image = '';
    newsState.crop = { ...CROP0 };
    $('nImgUrl').value = '';
    $('nImgMsg').textContent = '';
    newsPreview();
  });
  $('nSave').addEventListener('click', saveNews);
  $('nCancel').addEventListener('click', () => fillNewsForm(null));
  newsPreview();
  loadNewsList();
};

/** บอกขนาดรูปที่ใส่ เทียบกับขนาดที่พอดีกรอบ — ตัดขอบไหม ตัดด้านไหน */
function newsImgCheck(w, h) {
  const box = $('nImgSize');
  if (!w || !h) { box.textContent = ''; return; }
  const r = w / h;
  const off = Math.abs(r - NEWS_RATIO) / NEWS_RATIO;
  let msg = `รูปนี้ ${w} × ${h} px`;
  let kind = 'good';
  if (off <= 0.03) {
    msg += ' — สัดส่วนพอดีกรอบ เห็นทั้งแผ่น ✓';
    if (w < NEWS_IMG.w * 0.6) { msg += ' (แต่รูปเล็ก อาจไม่คมบนจอใหญ่)'; kind = 'warn'; }
  } else if (r < NEWS_RATIO) {
    const cut = Math.round((1 - r / NEWS_RATIO) * 100);
    msg += ` — สูงกว่ากรอบ จะโดนตัดขอบบน-ล่างรวม ${cut}%`;
    kind = 'warn';
  } else {
    const cut = Math.round((1 - NEWS_RATIO / r) * 100);
    msg += ` — กว้างกว่ากรอบ จะโดนตัดขอบซ้าย-ขวารวม ${cut}%`;
    kind = 'warn';
  }
  box.textContent = msg;
  box.className = 'note img-size ' + kind;
}

/** ตัวอย่างหน้าตาในเกม — โครงเดียวกับฝั่งอ่านของเกม (รูปใหญ่ → ป้าย+วันที่ → หัวข้อ → เนื้อ) */
function newsPreview() {
  const title = $('nTitle').value.trim() || 'หัวข้อข่าว';
  const body = $('nBody').value.trim() || 'รายละเอียดข่าวจะขึ้นตรงนี้';
  const img = newsState.image;
  $('nPrev').innerHTML = `
    <div class="np-hero">${img ? `<img src="${esc(img)}" alt="" draggable="false" style="${cropStyle(newsState.crop)}">` : '<span>ยังไม่มีรูป</span>'}</div>
    <div class="np-meta"><span class="np-tag">${esc($('nTag').value.trim() || 'ประกาศ')}</span><time>${newsDay($('nDate').value)}</time></div>
    <h4>${esc(title)}</h4>
    <div class="np-body">${body.split(/\n\s*\n/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}</div>`;
  const im = $('nPrev').querySelector('img');
  $('nZoom').value = newsState.crop.z;
  $('nZoom').disabled = $('nCropReset').disabled = !im;
  if (im) {
    // ลากจัดรูปในตัวอย่าง (สูตรเดียวกับในเกม src/crop.js) — แก้แค่สไตล์รูป ไม่วาดตัวอย่างใหม่ทั้งก้อน (ไม่งั้นหลุดลากกลางทาง)
    bindCrop(im.parentElement, im, () => newsState.crop, setNewsCrop);
    im.addEventListener('error', () => { im.parentElement.innerHTML = '<span>โหลดรูปไม่ได้ — เช็คลิงก์อีกที</span>'; }, { once: true });
    im.addEventListener('load', () => newsImgCheck(im.naturalWidth, im.naturalHeight), { once: true });
  } else {
    $('nImgSize').textContent = '';
  }
}

async function uploadNewsImage(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  const msg = $('nImgMsg');
  if (!file.type.startsWith('image/')) return (msg.textContent = 'ไฟล์นี้ไม่ใช่รูปภาพ');
  if (file.size > 5 * 1024 * 1024) return (msg.textContent = 'รูปใหญ่เกิน 5 MB ลองย่อก่อนนะ');
  msg.textContent = 'กำลังอัปโหลด…';
  const c = await client();
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `${todayISO()}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await c.storage.from('news').upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    msg.textContent = 'อัปโหลดไม่ได้: ' + errText(error) + ' (รัน supabase/news.sql แล้วหรือยัง?)';
    return;
  }
  const { data } = c.storage.from('news').getPublicUrl(path);
  newsState.image = data.publicUrl;
  newsState.crop = { ...CROP0 };
  $('nImgUrl').value = data.publicUrl;
  msg.textContent = 'อัปโหลดแล้ว ✓';
  newsPreview();
}

/** ตั้งค่าครอบตัดรูปข่าว → อัปเดตรูปในตัวอย่างทันที */
function setNewsCrop(c) {
  newsState.crop = c;
  const im = $('nPrev').querySelector('img');
  if (im) im.style.cssText = cropStyle(c);
  $('nZoom').value = c.z;
}

/** ใส่ข่าวลงฟอร์ม (null = ล้างกลับเป็นลงข่าวใหม่) */
function fillNewsForm(n) {
  newsState.editing = n ? n.id : null;
  newsState.image = n?.image_url || '';
  newsState.crop = normCrop(n?.image_crop);
  $('nTitle').value = n?.title || '';
  $('nTag').value = n?.tag || NEWS_TAGS[0];
  $('nDate').value = n?.news_date || todayISO();
  $('nBody').value = n?.body || '';
  $('nImgUrl').value = newsState.image;
  $('nImgMsg').textContent = '';
  $('nPinned').checked = !!n?.pinned;
  $('nActive').checked = n ? !!n.active : true;
  $('nfHead').textContent = n ? 'แก้ข่าว' : 'ลงข่าวใหม่';
  $('nSave').textContent = n ? 'บันทึกการแก้' : 'ลงข่าว';
  $('nCancel').classList.toggle('hidden', !n);
  $('nHint').textContent = '';
  newsPreview();
  if (n) $('nTitle').focus();
}

async function saveNews() {
  const row = {
    title: $('nTitle').value.trim(),
    tag: $('nTag').value.trim() || NEWS_TAGS[0],
    news_date: $('nDate').value || todayISO(),
    body: $('nBody').value.trim(),
    image_url: newsState.image || null,
    image_crop: newsState.image ? newsState.crop : null,
    pinned: $('nPinned').checked,
    active: $('nActive').checked,
  };
  if (!row.title) {
    $('nHint').textContent = 'ใส่หัวข้อก่อนนะ';
    $('nTitle').focus();
    return;
  }
  const btn = $('nSave');
  btn.disabled = true;
  const c = await client();
  const send = (r) => (newsState.editing
    ? c.from('news').update({ ...r, updated_at: new Date().toISOString() }).eq('id', newsState.editing)
    : c.from('news').insert(r));
  let { error } = await send(row);
  // ยังไม่ได้รัน SQL ที่เพิ่มคอลัมน์ครอบตัด → บันทึกข่าวได้ก่อน (ไม่เก็บการครอบตัด) แล้วบอกให้รัน
  if (error && /image_crop/.test(error.message || '')) {
    const { image_crop, ...rest } = row;
    ({ error } = await send(rest));
    if (!error) toast('บันทึกข่าวแล้ว แต่ยังเก็บการครอบตัดไม่ได้ — รัน supabase/gacha-promo.sql ใน Supabase ก่อน', 'bad');
  }
  btn.disabled = false;
  if (error) {
    $('nHint').textContent = 'บันทึกไม่ได้: ' + errText(error);
    return;
  }
  toast(newsState.editing ? 'แก้ข่าวแล้ว' : 'ลงข่าวแล้ว', 'good');
  fillNewsForm(null);
  loadNewsList();
}

async function loadNewsList() {
  const c = await client();
  const { data, error } = await c.from('news')
    .select('*')   // รวม image_crop ถ้ามี (ยังไม่รัน SQL ก็ไม่พัง)
    .order('pinned', { ascending: false })
    .order('news_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return failInto('nList', error);
  const rows = data || [];
  if (!rows.length) {
    $('nList').innerHTML = '<div class="tablewrap"><div class="empty">ยังไม่มีข่าว ลองลงข่าวแรกจากฟอร์มข้างบน</div></div>';
    return;
  }
  $('nList').innerHTML = `<div class="newslist">${rows.map((n, i) => `
    <div class="nl-row${n.active ? '' : ' off'}" data-i="${i}">
      ${n.image_url ? `<span class="nl-thumb"><img src="${esc(n.image_url)}" alt="" loading="lazy" style="${cropStyle(n.image_crop)}"></span>` : '<span class="nl-thumb blank"></span>'}
      <div class="nl-main">
        <div class="nl-pills"><span class="pill tag">${esc(n.tag)}</span>
          ${n.pinned ? '<span class="pill gold">ปักหมุด</span>' : ''}
          ${n.active ? '' : '<span class="pill guest">ซ่อนอยู่</span>'}</div>
        <b>${esc(n.title)}</b>
        <small>${newsDay(n.news_date)} · ลงเมื่อ ${when(n.created_at)}${n.updated_at ? ` · แก้ล่าสุด ${when(n.updated_at)}` : ''}</small>
      </div>
      <div class="nl-acts">
        <button class="btn ghost small" data-act="edit" type="button">แก้</button>
        <button class="btn ghost small" data-act="pin" type="button">${n.pinned ? 'เลิกปักหมุด' : 'ปักหมุด'}</button>
        <button class="btn ghost small" data-act="show" type="button">${n.active ? 'ซ่อน' : 'โชว์'}</button>
        <button class="btn ghost small danger" data-act="del" type="button">ลบ</button>
      </div>
    </div>`).join('')}</div>`;

  $('nList').querySelectorAll('.nl-row').forEach((r) => {
    const n = rows[+r.dataset.i];
    r.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => newsAction(b.dataset.act, n)));
  });
}

async function newsAction(act, n) {
  if (act === 'edit') {
    fillNewsForm(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  const c = await client();
  if (act === 'del') {
    const ok = await ask({
      title: 'ลบข่าวนี้?',
      body: `ข่าว <b>${esc(n.title)}</b> จะหายจากเกมทันทีและกู้คืนไม่ได้<br>ถ้าแค่อยากเก็บไว้ก่อน ใช้ปุ่ม "ซ่อน" แทนได้`,
      okText: 'ลบข่าว',
    });
    if (!ok) return;
    const { error } = await c.from('news').delete().eq('id', n.id);
    if (error) return toast('ลบไม่ได้: ' + errText(error), 'bad');
    // รูปที่อัปโหลดขึ้น bucket ของเราเองลบตามไปด้วย ลิงก์จากที่อื่นไม่แตะ
    const mark = '/storage/v1/object/public/news/';
    if (n.image_url && n.image_url.includes(mark)) {
      await c.storage.from('news').remove([decodeURIComponent(n.image_url.split(mark)[1])]);
    }
    if (newsState.editing === n.id) fillNewsForm(null);
    toast('ลบข่าวแล้ว', 'good');
  } else {
    const patch = act === 'pin' ? { pinned: !n.pinned } : { active: !n.active };
    const { error } = await c.from('news').update(patch).eq('id', n.id);
    if (error) return toast('แก้ไม่ได้: ' + errText(error), 'bad');
    toast(act === 'pin' ? (n.pinned ? 'เลิกปักหมุดแล้ว' : 'ปักหมุดแล้ว')
      : (n.active ? 'ซ่อนข่าวแล้ว' : 'โชว์ข่าวในเกมแล้ว'), 'good');
  }
  loadNewsList();
}

// ── ครอบตัดรูป (ใช้ร่วมกัน: ป้ายตู้กาช่า + ข่าวสาร) ─────────────────
//
// ลากรูป = เลื่อน · ล้อเมาส์ / แถบซูม = ซูม · ดับเบิลคลิก = กลับกลางรูป
// ค่าที่ได้ { x, y, z } ใช้สูตรเดียวกับในเกม (src/crop.js) — ตัวอย่างตรงกับของจริงทุกขนาดจอ

/** ผูกการลากจัดรูปกับกรอบ frame (overflow:hidden มี <img> ข้างใน) · get/set = อ่าน/เขียนค่าครอบตัด */
function bindCrop(frame, img, get, set) {
  let drag = null;
  frame.classList.add('cropable');
  frame.addEventListener('pointerdown', (e) => {
    if (!img.naturalWidth || e.button > 0) return;
    drag = { x: e.clientX, y: e.clientY, c: get() };
    frame.setPointerCapture(e.pointerId);
    frame.classList.add('dragging');
  });
  frame.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const W = frame.clientWidth, H = frame.clientHeight;
    const r = cropRect(img.naturalWidth, img.naturalHeight, W, H, drag.c);
    // รูปเลื่อนตามนิ้ว: ขอบรูปใหม่ = ขอบเดิม + ระยะลาก → แปลงกลับเป็นตำแหน่ง 0..1 (แกนที่รูปพอดีกรอบ = ไม่ขยับ)
    const nx = Math.abs(W - r.w) > 0.5 ? (r.x + e.clientX - drag.x) / (W - r.w) : drag.c.x;
    const ny = Math.abs(H - r.h) > 0.5 ? (r.y + e.clientY - drag.y) / (H - r.h) : drag.c.y;
    set(normCrop({ ...drag.c, x: nx, y: ny }));
  });
  const end = () => { drag = null; frame.classList.remove('dragging'); };
  frame.addEventListener('pointerup', end);
  frame.addEventListener('pointercancel', end);
  frame.addEventListener('wheel', (e) => {
    if (!img.naturalWidth) return;
    e.preventDefault();
    const c = get();
    set(normCrop({ ...c, z: c.z * Math.exp(-e.deltaY * 0.0015) }));
  }, { passive: false });
  frame.addEventListener('dblclick', () => set({ ...CROP0 }));
}

// ── หน้า: ป้ายตู้กาช่า ──────────────────────────────────────────
//
// รูปบนป้ายโปรโมทหน้าสุ่มสกินในเกม — ตาราง gacha_promos + รูปใน bucket "promo" (supabase/gacha-promo.sql)
// อัปโหลดได้หลายรูป · เรียงลำดับ · ซ่อน/ลบ · ตั้งกี่วินาทีเปลี่ยนรูป · ลากครอบตัดในกรอบที่มีตู้หัวแมวทับจริง
// ยังไม่มีรูปที่เปิดอยู่เลย = เกมใช้ภาพป้ายเดิมของตัวเอง (ชุดระดับ S ทีละชุด)

/**
 * สัดส่วนป้ายกับตำแหน่งตู้หัวแมว วัดจากเกมจริง 18 ต.ค. (หน่วย: r = กว้าง/สูงของป้าย · mx = ขอบซ้ายตู้ / กว้างป้าย
 * · my = ขอบบนตู้ / สูงป้าย · mh = สูงตู้ / สูงป้าย) — แก้ขนาดป้ายใน src/style.css ต้องวัดใหม่
 */
const PV_GEO = {
  ipad: { r: 1.748, mx: 0.783, my: -0.09, mh: 1.18, label: 'iPad / คอม',
    // ปุ่มที่วางทับป้ายในเกม [ซ้าย, บน, กว้าง, สูง] สัดส่วนของป้าย (วัดจากเกม 1180×820) — ของสำคัญในรูปอย่าให้โดนบัง
    ui: { p1: [0.034, 0.731, 0.254, 0.19], p5: [0.318, 0.731, 0.269, 0.19], more: [0.757, 0.051, 0.099, 0.051], prev: [0.021, 0.439, 0.057, 0.119], odds: [0.614, 0.785, 0.049, 0.085] } },
  phone: { r: 1.6, mx: 0.76, my: -0.10, mh: 1.18, label: 'มือถือ',
    ui: { p1: [0.031, 0.739, 0.277, 0.192], p5: [0.346, 0.739, 0.292, 0.192], more: [0.717, 0.045, 0.129, 0.059], prev: [0.02, 0.439, 0.063, 0.118], odds: [0.675, 0.791, 0.052, 0.084] } },
};
const PV_UI_TEXT = { p1: '1 ครั้ง', p5: '5 ครั้ง', more: 'ดูสกินอื่นๆ', prev: '', odds: '!' };
const PROMO_REC = { w: 1750, h: 1000 };
const promoState = { rows: [], sel: null, crop: { ...CROP0 }, play: 0, playI: 0 };
const S_OUTFITS = ALL_OUTFITS.filter((o) => o.id !== 'none');
const gmParts = new Map();

/** ตู้หัวแมวตัวเดียวกับในเกม (src/render/gumball.js) วาดนิ่งลงผ้าใบ */
function drawMachine(cv) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
  if (!W || !H) return;
  if (cv.width === W && cv.height === H && cv.dataset.drawn) return;
  cv.width = W;
  cv.height = H;
  const k = Math.min(W / GUMBALL.W, H / GUMBALL.H);
  const key = W + 'x' + H;
  if (!gmParts.has(key)) gmParts.set(key, createGumball(k));
  const c = cv.getContext('2d');
  c.setTransform(k, 0, 0, k, (W - GUMBALL.W * k) / 2, H - GUMBALL.H * k);
  drawGumballFrame(c, gmParts.get(key), 0, 0);
  cv.dataset.drawn = '1';
}

const stageHTML = (id, kind) => `
  <div class="pv-stage ${kind}" id="${id}" style="--r:${PV_GEO[kind].r}">
    <div class="pv-banner"><img alt="" draggable="false"><span class="pv-empty">ยังไม่มีรูป</span><b class="pv-name"></b>
      ${Object.entries(PV_GEO[kind].ui).map(([k, [l, t, w, h]]) => `<i class="pv-ui ${k}" style="left:${l * 100}%;top:${t * 100}%;width:${w * 100}%;height:${h * 100}%">${PV_UI_TEXT[k]}</i>`).join('')}</div>
    <canvas class="pv-machine" aria-hidden="true"></canvas>
  </div>`;

/** จัดตู้หัวแมว + ขนาดชื่อบนป้าย ตามขนาดป้ายจริงในหน้าจอนี้ */
function layoutStage(st) {
  const G = PV_GEO[st.classList.contains('phone') ? 'phone' : 'ipad'];
  const b = st.querySelector('.pv-banner');
  const w = b.clientWidth;
  if (!w) return;
  const bh = w / G.r;
  const m = st.querySelector('.pv-machine');
  const mh = bh * G.mh;
  Object.assign(m.style, { left: b.offsetLeft + w * G.mx + 'px', top: b.offsetTop + bh * G.my + 'px', height: mh + 'px', width: mh * 0.721 + 'px' });
  st.style.setProperty('--bh', bh + 'px');
  delete m.dataset.drawn;
  drawMachine(m);
}

/** ชื่อบนป้ายของแถวนี้ (ตรงกับเกม): ไม่โชว์ = '' · ตั้งเอง = ชื่อนั้น · ไม่ได้ตั้ง = ชื่อชุดที่ลิงก์ */
function promoName(title, outfit) {
  if (title != null) return title;
  return S_OUTFITS.find((o) => o.id === outfit)?.name || '';
}

/** วาดแถว row (หรือค่าที่กำลังแก้) ลงป้ายตัวอย่าง st */
function paintStage(st, url, crop, name) {
  const img = st.querySelector('img');
  st.classList.toggle('blank', !url);
  if (url && img.getAttribute('src') !== url) img.src = url;
  if (!url) img.removeAttribute('src');
  img.style.cssText = cropStyle(crop);
  st.querySelector('.pv-name').textContent = name || '';
}

PAGES.promo = async () => {
  stopPromoPlay();
  promoState.sel = null;
  $('page').innerHTML = `
    ${pageHead('ป้ายตู้กาช่า', 'รูปบนป้ายโปรโมทหน้าสุ่มสกิน เรียงตามลำดับ เปลี่ยนเองตามเวลาที่ตั้ง · ยังไม่มีรูปที่โชว์อยู่ = เกมใช้ภาพป้ายเดิม')}

    <div class="promoedit">
      <div class="mailform promoside">
        <h3 class="nf-head">รูปบนป้าย</h3>
        <div class="pickrow">
          <label class="btn" for="pFiles">+ อัปโหลดรูป</label>
          <input id="pFiles" type="file" accept="image/*" multiple hidden>
          <span class="note">เลือกได้หลายรูปพร้อมกัน</span>
        </div>
        <small class="note">ขนาดแนะนำ <b>${PROMO_REC.w} × ${PROMO_REC.h} px</b> (แนวนอน 1.75 : 1) — ขอบขวาราว 20% โดนตู้หัวแมวบัง ลากจัดรูปได้ทีหลัง</small>
        <small class="note" id="pUpMsg"></small>
        <div id="pList" class="plist"><div class="empty">กำลังโหลด…</div></div>
        <div class="fld"><span>เปลี่ยนรูปทุกกี่วินาที (3–60)</span>
          <div class="pickrow">
            <input id="pSec" type="number" min="3" max="60" step="1" value="10">
            <button class="btn ghost" id="pSecSave" type="button">บันทึก</button>
          </div>
        </div>
      </div>

      <div class="promoright">
        <div class="mailform">
          <h3 class="nf-head" id="peHead">จัดรูป</h3>
          <span class="note">ลากรูปเพื่อเลื่อน · ล้อเมาส์หรือแถบข้างล่างเพื่อซูม · ดับเบิลคลิก = กลับกลางรูป — ตู้หัวแมวที่ทับขอบขวาคือของจริงในเกม</span>
          ${stageHTML('peStage', 'ipad')}
          <label class="zoomrow"><span class="note">ซูม</span><input id="peZoom" type="range" min="1" max="${CROP_ZMAX}" step="0.01" value="1"><button class="btn ghost small" id="peReset" type="button">กลางรูป</button></label>
          <div class="giftrow">
            <label class="fld"><span>ชุดที่ลิงก์ (แตะรูปในเกม = เปิดหน้าชุดนี้)</span>
              <select id="peOutfit"><option value="">— ไม่ลิงก์ —</option>${S_OUTFITS.map((o) => `<option value="${esc(o.id)}">${esc(o.name)}</option>`).join('')}</select></label>
            <label class="fld"><span>ชื่อบนป้าย (เว้นว่าง = ชื่อชุดที่ลิงก์)</span>
              <input id="peTitle" maxlength="40" placeholder="ชื่อชุดที่ลิงก์"></label>
          </div>
          <div class="nf-checks">
            <label class="chk"><input type="checkbox" id="peNoName"> ไม่ต้องโชว์ชื่อบนป้าย</label>
            <label class="chk"><input type="checkbox" id="peUi" checked> โชว์ปุ่มของเกมบนตัวอย่าง (ปุ่มสุ่ม ลูกศร)</label>
          </div>
          <div class="sendrow">
            <button class="btn" id="peSave" type="button" disabled>บันทึกรูปนี้</button>
            <span id="peHint" class="note">เลือกรูปจากรายการทางซ้าย</span>
          </div>
        </div>

        <div class="mailform">
          <h3 class="nf-head">ตัวอย่างหน้าตู้กาช่า</h3>
          <div class="pv-row">
            <div class="pv-col"><span class="note">${PV_GEO.ipad.label}</span>${stageHTML('pvIpad', 'ipad')}</div>
            <div class="pv-col phone"><span class="note">${PV_GEO.phone.label}</span>${stageHTML('pvPhone', 'phone')}</div>
          </div>
          <div class="sendrow">
            <button class="btn ghost" id="pvPlay" type="button">▶ เล่นสไลด์ตามเวลาที่ตั้ง</button>
            <span class="note" id="pvNow"></span>
          </div>
        </div>
      </div>
    </div>`;

  const stages = ['peStage', 'pvIpad', 'pvPhone'].map($);
  const ro = new ResizeObserver(() => stages.forEach(layoutStage));
  stages.forEach((st) => ro.observe(st));
  stages.forEach(layoutStage);

  const ed = $('peStage');
  bindCrop(ed.querySelector('.pv-banner'), ed.querySelector('img'), () => promoState.crop, (c) => {
    promoState.crop = c;
    $('peZoom').value = c.z;
    promoDirty();
  });
  $('peZoom').addEventListener('input', () => { promoState.crop = normCrop({ ...promoState.crop, z: +$('peZoom').value }); promoDirty(); });
  $('peReset').addEventListener('click', () => { promoState.crop = { ...CROP0 }; $('peZoom').value = 1; promoDirty(); });
  ['peOutfit', 'peTitle', 'peNoName'].forEach((id) => $(id).addEventListener('input', promoDirty));
  $('peSave').addEventListener('click', savePromo);
  $('peUi').addEventListener('change', () => $('page').classList.toggle('pv-noui', !$('peUi').checked));
  $('pFiles').addEventListener('change', uploadPromos);
  $('pSecSave').addEventListener('click', savePromoSec);
  $('pvPlay').addEventListener('click', () => (promoState.play ? stopPromoPlay() : startPromoPlay()));
  loadPromos();
};

/** ค่าที่กำลังแก้ → ป้ายแก้รูป + ตัวอย่าง (ระหว่างเล่นสไลด์ ตัวอย่างไม่ตามการแก้) */
function promoDirty() {
  const row = promoState.rows.find((r) => r.id === promoState.sel);
  const title = $('peNoName').checked ? '' : ($('peTitle').value.trim() || null);
  const outfit = $('peOutfit').value || null;
  $('peTitle').disabled = $('peNoName').checked;
  $('peTitle').placeholder = S_OUTFITS.find((o) => o.id === outfit)?.name || 'ชื่อบนป้าย';
  const name = promoName(title, outfit);
  paintStage($('peStage'), row?.image_url || '', promoState.crop, name);
  if (!promoState.play) {
    paintStage($('pvIpad'), row?.image_url || '', promoState.crop, name);
    paintStage($('pvPhone'), row?.image_url || '', promoState.crop, name);
  }
  if (row) {
    const changed = JSON.stringify(normCrop(row.crop)) !== JSON.stringify(promoState.crop) || (row.outfit_id || null) !== outfit || (row.title ?? null) !== title;
    $('peSave').disabled = !changed;
    $('peHint').textContent = changed ? 'ยังไม่ได้บันทึก' : 'บันทึกแล้ว';
  }
}

async function loadPromos(selectId = null) {
  const c = await client();
  const [{ data, error }, cfg] = await Promise.all([
    c.from('gacha_promos').select('*').order('sort', { ascending: true }).order('created_at', { ascending: true }),
    c.from('gacha_promo_settings').select('interval_sec').eq('id', 1).maybeSingle(),
  ]);
  if (error) {
    $('pList').innerHTML = `<div class="empty">อ่านรายการไม่ได้: ${esc(errText(error))}<br>รัน <b>supabase/gacha-promo.sql</b> ใน Supabase แล้วหรือยัง?</div>`;
    return;
  }
  promoState.rows = data || [];
  if (cfg?.data?.interval_sec) $('pSec').value = cfg.data.interval_sec;
  renderPromoList();
  const pick = promoState.rows.find((r) => r.id === (selectId || promoState.sel)) || promoState.rows[0] || null;
  selectPromo(pick);
}

function renderPromoList() {
  const rows = promoState.rows;
  if (!rows.length) {
    $('pList').innerHTML = '<div class="empty">ยังไม่มีรูป — เกมใช้ภาพป้ายเดิมอยู่ · กด "อัปโหลดรูป" เพื่อเริ่ม</div>';
    return;
  }
  $('pList').innerHTML = rows.map((r, i) => `
    <div class="pl-row${r.active ? '' : ' off'}${r.id === promoState.sel ? ' on' : ''}" data-i="${i}">
      <span class="pl-thumb"><img src="${esc(r.image_url)}" alt="" loading="lazy" style="${cropStyle(r.crop)}"></span>
      <div class="pl-main">
        <b>${i + 1}. ${esc(promoName(r.title ?? null, r.outfit_id) || '(ไม่มีชื่อ)')}</b>
        <div class="nl-pills">${r.active ? '<span class="pill tag">โชว์ในเกม</span>' : '<span class="pill guest">ซ่อนอยู่</span>'}</div>
      </div>
      <div class="pl-acts">
        <button class="btn ghost small" data-act="up" type="button" ${i ? '' : 'disabled'} aria-label="เลื่อนขึ้น">▲</button>
        <button class="btn ghost small" data-act="down" type="button" ${i < rows.length - 1 ? '' : 'disabled'} aria-label="เลื่อนลง">▼</button>
        <button class="btn ghost small" data-act="show" type="button">${r.active ? 'ซ่อน' : 'โชว์'}</button>
        <button class="btn ghost small danger" data-act="del" type="button">ลบ</button>
      </div>
    </div>`).join('');
  $('pList').querySelectorAll('.pl-row').forEach((el) => {
    const r = rows[+el.dataset.i];
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) promoAction(b.dataset.act, r);
      else selectPromo(r);
    });
  });
}

function selectPromo(r) {
  promoState.sel = r ? r.id : null;
  promoState.crop = normCrop(r?.crop);
  $('peZoom').value = promoState.crop.z;
  $('peOutfit').value = r?.outfit_id || '';
  $('peNoName').checked = r?.title === '';
  $('peTitle').value = r?.title || '';
  $('peHead').textContent = r ? `จัดรูปที่ ${promoState.rows.indexOf(r) + 1}` : 'จัดรูป';
  $('peSave').disabled = true;
  $('peHint').textContent = r ? '' : 'เลือกรูปจากรายการทางซ้าย';
  $('pList').querySelectorAll('.pl-row').forEach((el) => el.classList.toggle('on', promoState.rows[+el.dataset.i]?.id === promoState.sel));
  promoDirty();
}

async function savePromo() {
  const r = promoState.rows.find((x) => x.id === promoState.sel);
  if (!r) return;
  const patch = {
    crop: promoState.crop,
    outfit_id: $('peOutfit').value || null,
    title: $('peNoName').checked ? '' : ($('peTitle').value.trim() || null),
    updated_at: new Date().toISOString(),
  };
  $('peSave').disabled = true;
  const c = await client();
  const { error } = await c.from('gacha_promos').update(patch).eq('id', r.id);
  if (error) {
    $('peSave').disabled = false;
    $('peHint').textContent = 'บันทึกไม่ได้: ' + errText(error);
    return;
  }
  Object.assign(r, patch);
  toast('บันทึกรูปแล้ว — เกมจะเห็นภายในหนึ่งนาทีหลังเปิดตู้', 'good');
  renderPromoList();
  promoDirty();
}

async function uploadPromos(e) {
  const files = [...(e.target.files || [])];
  e.target.value = '';
  if (!files.length) return;
  const msg = $('pUpMsg');
  const c = await client();
  let sort = promoState.rows.reduce((m, r) => Math.max(m, r.sort || 0), 0);
  let firstId = null, done = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) { toast(`${file.name} ไม่ใช่รูปภาพ — ข้าม`, 'bad'); continue; }
    if (file.size > 8 * 1024 * 1024) { toast(`${file.name} ใหญ่เกิน 8 MB — ข้าม`, 'bad'); continue; }
    msg.textContent = `กำลังอัปโหลด ${done + 1}/${files.length}…`;
    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const path = `${todayISO()}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const up = await c.storage.from('promo').upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) {
      msg.textContent = 'อัปโหลดไม่ได้: ' + errText(up.error) + ' (รัน supabase/gacha-promo.sql แล้วหรือยัง?)';
      return;
    }
    const url = c.storage.from('promo').getPublicUrl(path).data.publicUrl;
    const { data, error } = await c.from('gacha_promos').insert({ image_url: url, sort: ++sort, crop: { ...CROP0 } }).select('id').single();
    if (error) { msg.textContent = 'บันทึกรูปไม่ได้: ' + errText(error); return; }
    firstId ??= data.id;
    done++;
  }
  msg.textContent = done ? `อัปโหลดแล้ว ${done} รูป ✓ — ลากจัดรูปทางขวาได้เลย` : '';
  if (done) loadPromos(firstId);
}

async function promoAction(act, r) {
  const c = await client();
  const rows = promoState.rows;
  const i = rows.indexOf(r);
  if (act === 'up' || act === 'down') {
    const j = act === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= rows.length) return;
    // สลับที่: ให้ลำดับเป็น 1..n ใหม่ทั้งชุด (กันเลขซ้ำจากข้อมูลเก่า)
    const order = rows.slice();
    [order[i], order[j]] = [order[j], order[i]];
    const res = await Promise.all(order.map((x, k) => (x.sort === k + 1 ? null : c.from('gacha_promos').update({ sort: k + 1 }).eq('id', x.id))).filter(Boolean));
    const bad = res.find((x) => x.error);
    if (bad) return toast('เรียงลำดับไม่ได้: ' + errText(bad.error), 'bad');
  } else if (act === 'show') {
    const { error } = await c.from('gacha_promos').update({ active: !r.active }).eq('id', r.id);
    if (error) return toast('แก้ไม่ได้: ' + errText(error), 'bad');
    toast(r.active ? 'ซ่อนรูปแล้ว' : 'โชว์รูปในเกมแล้ว', 'good');
  } else if (act === 'del') {
    const ok = await ask({
      title: 'ลบรูปนี้?',
      body: 'รูปจะหายจากป้ายในเกมทันทีและกู้คืนไม่ได้<br>ถ้าแค่อยากพักไว้ก่อน ใช้ปุ่ม "ซ่อน" แทนได้',
      okText: 'ลบรูป',
    });
    if (!ok) return;
    const { error } = await c.from('gacha_promos').delete().eq('id', r.id);
    if (error) return toast('ลบไม่ได้: ' + errText(error), 'bad');
    const mark = '/storage/v1/object/public/promo/';
    if (r.image_url.includes(mark)) await c.storage.from('promo').remove([decodeURIComponent(r.image_url.split(mark)[1])]);
    if (promoState.sel === r.id) promoState.sel = null;
    toast('ลบรูปแล้ว', 'good');
  }
  loadPromos();
}

async function savePromoSec() {
  const sec = Math.round(+$('pSec').value);
  if (!(sec >= 3 && sec <= 60)) { toast('ตั้งได้ 3–60 วินาที', 'bad'); return; }
  const c = await client();
  const { error } = await c.from('gacha_promo_settings').upsert({ id: 1, interval_sec: sec, updated_at: new Date().toISOString() });
  if (error) return toast('บันทึกไม่ได้: ' + errText(error), 'bad');
  toast(`ตั้งให้เปลี่ยนรูปทุก ${sec} วินาทีแล้ว`, 'good');
  if (promoState.play) { stopPromoPlay(); startPromoPlay(); }
}

/** เล่นสไลด์ตัวอย่าง: รูปที่โชว์อยู่ทั้งหมดตามลำดับ เปลี่ยนตามเวลาที่ตั้ง (ใช้ค่าที่บันทึกแล้ว) */
function startPromoPlay() {
  const list = promoState.rows.filter((r) => r.active);
  if (!list.length) { toast('ยังไม่มีรูปที่โชว์อยู่', 'bad'); return; }
  const sec = Math.max(3, Math.min(60, Math.round(+$('pSec').value) || 10));
  promoState.playI = 0;
  const show = () => {
    if (!$('pvIpad')) return stopPromoPlay();
    const r = list[promoState.playI % list.length];
    const name = promoName(r.title ?? null, r.outfit_id);
    for (const id of ['pvIpad', 'pvPhone']) {
      const st = $(id);
      st.classList.remove('swap');
      void st.offsetWidth;
      st.classList.add('swap');
      paintStage(st, r.image_url, r.crop, name);
    }
    $('pvNow').textContent = `รูปที่ ${(promoState.playI % list.length) + 1}/${list.length} · เปลี่ยนทุก ${sec} วินาที`;
    promoState.playI++;
  };
  show();
  promoState.play = setInterval(show, sec * 1000);
  $('pvPlay').textContent = '■ หยุดสไลด์';
}
function stopPromoPlay() {
  clearInterval(promoState.play);
  promoState.play = 0;
  if ($('pvPlay')) {
    $('pvPlay').textContent = '▶ เล่นสไลด์ตามเวลาที่ตั้ง';
    $('pvNow').textContent = '';
    promoDirty();
  }
}

// ── หน้า: รูปการ์ดชุด ──────────────────────────────────────────
//
// รูปบนการ์ดชุดในเกม (หน้าชุดแมวในคลังน้อง + หน้า "สกินในตู้นี้") — สกินละหนึ่งรูป
// ตาราง outfit_cards (outfit_id เป็น primary key) + รูปใน bucket "cards" (supabase/outfit-cards.sql)
// สกินที่ไม่มีรูป = เกมใช้ภาพเดิมที่วาดเอง (src/render/outfit-art.js — หน้านี้วาดภาพเดิมให้ดูด้วยตัววาดเดียวกัน)

const CARD_REC = { w: 800, h: 992 };   // สัดส่วนเดียวกับกรอบรูปบนการ์ด (OC_W × OC_H = 200 × 248)
const CARD_OUTFITS = ALL_OUTFITS;
const HIDDEN_IDS = new Set(ALL_OUTFITS.filter((o) => !OUTFITS.some((x) => x.id === o.id)).map((o) => o.id));
const cardState = { rows: new Map(), sel: null, image: '', crop: { ...CROP0 }, active: true, fresh: '', locked: false };
const ART_SKIN = { ...SKINS[0], sex: 'm', outfit: null };
const artCache = new Map();

/** ภาพเดิมของชุด (ตัววาดเดียวกับในเกม · แมวส้ม) ลงผ้าใบ */
function paintDefaultArt(cv, o) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let img = artCache.get(o.id);
  if (!img) {
    img = document.createElement('canvas');
    img.width = OC_W * dpr;
    img.height = OC_H * dpr;
    const c = img.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    try { drawOutfitArt(c, ART_SKIN, o); } catch (e) { console.warn('วาดภาพเดิมไม่ได้', o.id, e); }
    artCache.set(o.id, img);
  }
  cv.width = img.width;
  cv.height = img.height;
  cv.getContext('2d').drawImage(img, 0, 0);
}

/** การ์ดแบบในเกม (.oc-card) — มีรูป = <img> ครอบตัด · ไม่มี = ภาพเดิม (วาดหลังใส่ลงหน้าด้วย paintCardArts) */
function cardHTML(o, { img = '', crop = null, locked = false, cls = '' } = {}) {
  return `<div class="ocp-card${o.rarity === 'high' ? ' s' : ''}${locked ? ' locked' : ''} ${cls}" data-id="${esc(o.id)}">
    <span class="ocp-art">${img ? `<img src="${esc(img)}" alt="" draggable="false" style="${cropStyle(crop)}">` : '<canvas></canvas>'}</span>
    <b>${esc(o.name)}</b></div>`;
}
function paintCardArts(root) {
  root.querySelectorAll('.ocp-card').forEach((el) => {
    const cv = el.querySelector('.ocp-art > canvas');
    const o = CARD_OUTFITS.find((x) => x.id === el.dataset.id);
    if (cv && o) paintDefaultArt(cv, o);
  });
}

PAGES.cards = async () => {
  cardState.sel = null;
  cardState.fresh = '';
  $('page').innerHTML = `
    ${pageHead('รูปการ์ดชุด', 'รูปบนการ์ดในหน้าชุดแมว (คลังน้อง) และหน้า "สกินในตู้นี้" ของตู้กาช่า — สกินละหนึ่งรูป · สกินที่ไม่มีรูปใช้ภาพเดิม')}

    <div class="cardedit">
      <div class="mailform cardside">
        <h3 class="nf-head">สกินทั้งหมด <small class="note" id="cCount"></small></h3>
        <span class="note">เลือกสกินที่จะใส่รูป · ป้ายมุมการ์ด: <b>มีรูป</b> = ใช้รูปที่อัปโหลด · <b>ซ่อนในเกม</b> = ชุดนี้ยังไม่เปิดในเกม</span>
        <div id="cGrid" class="ocp-grid"><div class="empty">กำลังโหลด…</div></div>
      </div>

      <div class="promoright">
        <div class="mailform">
          <h3 class="nf-head" id="ceHead">เลือกสกินจากรายการทางซ้าย</h3>
          <div class="ce-row">
            <div class="ce-card-wrap" id="ceWrap"></div>
            <div class="ce-tools">
              <span class="note">ลากรูปในการ์ดเพื่อเลื่อน · ล้อเมาส์หรือแถบซูม · ดับเบิลคลิก = กลับกลางรูป</span>
              <div class="pickrow">
                <label class="btn" for="cFile" id="cFileBtn">อัปโหลดรูป</label>
                <input id="cFile" type="file" accept="image/*" hidden>
              </div>
              <small class="note">ขนาดแนะนำ <b>${CARD_REC.w} × ${CARD_REC.h} px</b> (แนวตั้ง 200 : 248) · ไม่เกิน 5 MB</small>
              <small class="note" id="cMsg"></small>
              <label class="zoomrow"><span class="note">ซูม</span><input id="cZoom" type="range" min="1" max="${CROP_ZMAX}" step="0.01" value="1"><button class="btn ghost small" id="cReset" type="button">กลางรูป</button></label>
              <label class="chk"><input type="checkbox" id="cActive" checked> โชว์รูปนี้ในเกม (ไม่ติ๊ก = เก็บไว้ก่อน เกมใช้ภาพเดิม)</label>
              <div class="sendrow">
                <button class="btn" id="cSave" type="button" disabled>บันทึก</button>
                <button class="btn ghost danger" id="cDel" type="button" disabled>ลบรูป (กลับไปภาพเดิม)</button>
              </div>
              <span id="cHint" class="note"></span>
            </div>
          </div>
        </div>

        <div class="mailform">
          <h3 class="nf-head">ตัวอย่างในเกม</h3>
          <label class="chk"><input type="checkbox" id="cLocked"> ดูแบบผู้เล่นยังไม่มีชุดนี้ (การ์ดขาวดำ)</label>
          <div class="ocp-stage"><div class="ocp-title">ชุดแมว</div><div class="ocp-row" id="cPrev"></div></div>
          <span class="note">การ์ดแรกคือสกินที่กำลังแก้ (ค่าที่ยังไม่บันทึกก็เห็นตรงนี้) · ใบอื่นเป็นสกินถัดไปตามที่บันทึกแล้ว · รูปที่อัปโหลดโชว์เหมือนกันทุกตัวแมว (ภาพเดิมวาดตามแมวที่ผู้เล่นใช้)</span>
        </div>
      </div>
    </div>`;

  $('cFile').addEventListener('change', uploadCardImage);
  $('cZoom').addEventListener('input', () => setCardCrop(normCrop({ ...cardState.crop, z: +$('cZoom').value })));
  $('cReset').addEventListener('click', () => setCardCrop({ ...CROP0 }));
  $('cActive').addEventListener('change', () => { cardState.active = $('cActive').checked; cardDirty(); });
  $('cLocked').addEventListener('change', () => { cardState.locked = $('cLocked').checked; renderCardPreview(); });
  $('cSave').addEventListener('click', saveCard);
  $('cDel').addEventListener('click', deleteCard);
  loadCards();
};

async function loadCards(selectId = null) {
  const c = await client();
  const { data, error } = await c.from('outfit_cards').select('*');
  if (error) {
    $('cGrid').innerHTML = `<div class="empty">อ่านรายการไม่ได้: ${esc(errText(error))}<br>รัน <b>supabase/outfit-cards.sql</b> ใน Supabase แล้วหรือยัง?</div>`;
    return;
  }
  cardState.rows = new Map((data || []).map((r) => [r.outfit_id, r]));
  renderCardGrid();
  selectCard(selectId || cardState.sel || CARD_OUTFITS[0].id, true);
}

function renderCardGrid() {
  const n = CARD_OUTFITS.filter((o) => cardState.rows.has(o.id)).length;
  $('cCount').textContent = `· มีรูปแล้ว ${n} / ${CARD_OUTFITS.length}`;
  $('cGrid').innerHTML = CARD_OUTFITS.map((o) => {
    const r = cardState.rows.get(o.id);
    const tags = [r ? `<i class="ocp-tag ${r.active ? 'has' : 'off'}">${r.active ? 'มีรูป' : 'มีรูป · ซ่อน'}</i>` : '',
      HIDDEN_IDS.has(o.id) ? '<i class="ocp-tag hid">ซ่อนในเกม</i>' : ''].join('');
    return `<button type="button" class="ocp-pick${o.id === cardState.sel ? ' on' : ''}" data-id="${esc(o.id)}">${cardHTML(o, { img: r?.image_url, crop: r?.crop })}<span class="ocp-tags">${tags}</span></button>`;
  }).join('');
  paintCardArts($('cGrid'));
  $('cGrid').querySelectorAll('.ocp-pick').forEach((b) => b.addEventListener('click', () => selectCard(b.dataset.id)));
}

const cardIsDirty = () => {
  const r = cardState.rows.get(cardState.sel);
  if (!r) return !!cardState.image;
  return r.image_url !== cardState.image || r.active !== cardState.active
    || JSON.stringify(normCrop(r.crop)) !== JSON.stringify(cardState.crop);
};

async function selectCard(id, force = false) {
  if (!force && id === cardState.sel) return;
  if (!force && cardIsDirty()) {
    const ok = await ask({ title: 'ทิ้งการแก้ที่ยังไม่บันทึก?', body: 'รูปหรือการครอบตัดของสกินนี้ยังไม่ได้บันทึก', okText: 'ทิ้ง' });
    if (!ok) return;
  }
  await dropFreshCard();
  const o = CARD_OUTFITS.find((x) => x.id === id) || CARD_OUTFITS[0];
  const r = cardState.rows.get(o.id);
  cardState.sel = o.id;
  cardState.image = r?.image_url || '';
  cardState.crop = normCrop(r?.crop);
  cardState.active = r ? r.active : true;
  $('cActive').checked = cardState.active;
  $('cMsg').textContent = '';
  $('ceHead').textContent = o.name + (o.rarity === 'high' ? ' · ระดับ S' : '');
  $('cFileBtn').textContent = cardState.image ? 'เปลี่ยนรูป' : 'อัปโหลดรูป';
  $('cGrid').querySelectorAll('.ocp-pick').forEach((b) => b.classList.toggle('on', b.dataset.id === o.id));
  renderCardEditor();
  cardDirty();
}

/** การ์ดใหญ่สำหรับลากจัดรูป */
function renderCardEditor() {
  const o = CARD_OUTFITS.find((x) => x.id === cardState.sel);
  $('ceWrap').innerHTML = cardHTML(o, { img: cardState.image, crop: cardState.crop, cls: 'big' });
  paintCardArts($('ceWrap'));
  const img = $('ceWrap').querySelector('img');
  if (img) bindCrop(img.parentElement, img, () => cardState.crop, setCardCrop);
  $('cZoom').disabled = $('cReset').disabled = !img;
}

function setCardCrop(c) {
  cardState.crop = c;
  const im = $('ceWrap').querySelector('img');
  if (im) im.style.cssText = cropStyle(c);
  $('cZoom').value = c.z;
  cardDirty();
}

function cardDirty() {
  const dirty = cardIsDirty();
  const r = cardState.rows.get(cardState.sel);
  $('cSave').disabled = !dirty || !cardState.image;
  $('cDel').disabled = !r && !cardState.fresh;
  $('cHint').textContent = !cardState.image ? 'ยังไม่มีรูป — เกมใช้ภาพเดิม' : dirty ? 'ยังไม่ได้บันทึก' : 'บันทึกแล้ว';
  $('cZoom').value = cardState.crop.z;
  renderCardPreview();
}

/** แถวการ์ดแบบหน้าชุดแมว: สกินที่แก้อยู่ + สกินถัดไปอีกสามใบ */
function renderCardPreview() {
  const i = CARD_OUTFITS.findIndex((x) => x.id === cardState.sel);
  if (i < 0) return;
  const list = [0, 1, 2, 3].map((k) => CARD_OUTFITS[(i + k) % CARD_OUTFITS.length]);
  $('cPrev').innerHTML = list.map((o, k) => {
    const r = cardState.rows.get(o.id);
    const img = k === 0 ? cardState.image : r?.active ? r.image_url : '';
    const crop = k === 0 ? cardState.crop : r?.crop;
    return cardHTML(o, { img: k === 0 && !cardState.active ? '' : img, crop, locked: cardState.locked, cls: k === 0 ? 'cur' : '' });
  }).join('');
  paintCardArts($('cPrev'));
}

async function uploadCardImage(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file || !cardState.sel) return;
  const msg = $('cMsg');
  if (!file.type.startsWith('image/')) return (msg.textContent = 'ไฟล์นี้ไม่ใช่รูปภาพ');
  if (file.size > 5 * 1024 * 1024) return (msg.textContent = 'รูปใหญ่เกิน 5 MB ลองย่อก่อนนะ');
  msg.textContent = 'กำลังอัปโหลด…';
  const c = await client();
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `${cardState.sel}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await c.storage.from('cards').upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    msg.textContent = 'อัปโหลดไม่ได้: ' + errText(error) + ' (รัน supabase/outfit-cards.sql แล้วหรือยัง?)';
    return;
  }
  await dropFreshCard();   // อัปโหลดซ้ำก่อนบันทึก = ทิ้งรูปที่อัปไปรอบก่อน
  cardState.fresh = cardState.image = c.storage.from('cards').getPublicUrl(path).data.publicUrl;
  cardState.crop = { ...CROP0 };
  msg.textContent = 'อัปโหลดแล้ว ✓ — ลากจัดรูปในการ์ด แล้วกดบันทึก';
  $('cFileBtn').textContent = 'เปลี่ยนรูป';
  renderCardEditor();
  cardDirty();
}

/** ลบไฟล์ใน bucket ของเราเอง (ลิงก์จากที่อื่นไม่แตะ) */
async function removeCardFile(url) {
  const mark = '/storage/v1/object/public/cards/';
  if (!url || !url.includes(mark)) return;
  const c = await client();
  await c.storage.from('cards').remove([decodeURIComponent(url.split(mark)[1])]);
}
/** รูปที่อัปโหลดแต่ยังไม่บันทึก — ทิ้งไฟล์ไม่ให้ค้างในที่เก็บ */
async function dropFreshCard() {
  const url = cardState.fresh;
  cardState.fresh = '';
  if (url && url !== cardState.rows.get(cardState.sel)?.image_url) await removeCardFile(url);
}

async function saveCard() {
  if (!cardState.sel || !cardState.image) return;
  const old = cardState.rows.get(cardState.sel);
  const row = { outfit_id: cardState.sel, image_url: cardState.image, crop: cardState.crop, active: cardState.active, updated_at: new Date().toISOString() };
  $('cSave').disabled = true;
  const c = await client();
  const { error } = await c.from('outfit_cards').upsert(row);
  if (error) {
    $('cSave').disabled = false;
    $('cHint').textContent = 'บันทึกไม่ได้: ' + errText(error);
    return;
  }
  if (old && old.image_url !== row.image_url) await removeCardFile(old.image_url);   // เปลี่ยนรูป = ลบไฟล์รูปเก่า
  cardState.fresh = '';
  toast('บันทึกรูปการ์ดแล้ว — เกมจะเห็นภายในหนึ่งนาทีหลังเปิดหน้าชุด', 'good');
  loadCards(cardState.sel);
}

async function deleteCard() {
  const r = cardState.rows.get(cardState.sel);
  const o = CARD_OUTFITS.find((x) => x.id === cardState.sel);
  if (!r) { await dropFreshCard(); selectCard(cardState.sel, true); return; }   // ยังไม่เคยบันทึก = แค่ทิ้งรูปที่อัปไว้
  const ok = await ask({
    title: 'ลบรูปการ์ดนี้?',
    body: `การ์ด <b>${esc(o?.name || '')}</b> จะกลับไปใช้ภาพเดิมทันที และกู้รูปคืนไม่ได้<br>ถ้าแค่อยากพักไว้ก่อน เอาติ๊ก "โชว์รูปนี้ในเกม" ออกแล้วบันทึกแทนได้`,
    okText: 'ลบรูป',
  });
  if (!ok) return;
  const c = await client();
  const { error } = await c.from('outfit_cards').delete().eq('outfit_id', r.outfit_id);
  if (error) return toast('ลบไม่ได้: ' + errText(error), 'bad');
  await removeCardFile(r.image_url);
  await dropFreshCard();
  toast('ลบรูปแล้ว — การ์ดกลับไปใช้ภาพเดิม', 'good');
  loadCards(cardState.sel);
}

// ── หน้า: แจ้งปัญหา ─────────────────────────────────────────
//
// เรื่องที่ผู้เล่นส่งจาก ตั้งค่า → ช่วยเหลือ → แจ้งปัญหา (ตาราง bug_reports + รูปใน bucket "reports")
// bucket เป็นส่วนตัว รูปจึงเปิดผ่านลิงก์ชั่วคราว (signed URL) ที่ขอใหม่ทุกครั้งที่โหลดหน้า

const REPORT_STATUS = { new: 'ใหม่', seen: 'กำลังดู', done: 'แก้แล้ว' };
const reportsState = { filter: 'open' };

PAGES.reports = async () => {
  $('page').innerHTML = `
    ${pageHead('แจ้งปัญหา', 'เรื่องที่ผู้เล่นส่งมาจากหน้าตั้งค่า → ช่วยเหลือ · กดที่รูปเพื่อเปิดดูขนาดเต็ม')}
    <div class="modes rp-modes">
      <button class="mode" data-f="open" type="button">ยังไม่เสร็จ</button>
      <button class="mode" data-f="new" type="button">ใหม่</button>
      <button class="mode" data-f="done" type="button">แก้แล้ว</button>
      <button class="mode" data-f="all" type="button">ทั้งหมด</button>
    </div>
    <div id="rpList"><div class="tablewrap"><div class="empty">กำลังโหลด…</div></div></div>`;
  document.querySelectorAll('.rp-modes .mode').forEach((b) => {
    b.classList.toggle('on', b.dataset.f === reportsState.filter);
    b.addEventListener('click', () => {
      reportsState.filter = b.dataset.f;
      document.querySelectorAll('.rp-modes .mode').forEach((x) => x.classList.toggle('on', x === b));
      loadReports();
    });
  });
  loadReports();
};

async function loadReports() {
  const c = await client();
  let q = c.from('bug_reports')
    .select('id, player_id, category, body, images, device, status, created_at')
    .order('created_at', { ascending: false })
    .limit(150);
  if (reportsState.filter === 'open') q = q.in('status', ['new', 'seen']);
  else if (reportsState.filter !== 'all') q = q.eq('status', reportsState.filter);
  const { data, error } = await q;
  if (error) return failInto('rpList', error);
  const rows = data || [];
  if (!rows.length) {
    $('rpList').innerHTML = '<div class="tablewrap"><div class="empty">ไม่มีเรื่องในหมวดนี้ 🎉</div></div>';
    return;
  }

  // ชื่อ/อีเมล/ไอดีของคนส่ง (admin_players มีอีเมล, players มี friend_code)
  const ids = [...new Set(rows.map((r) => r.player_id))];
  const { data: ppl } = await c.from('admin_players').select('id, name, email, is_guest').in('id', ids);
  const who = new Map((ppl || []).map((p) => [p.id, p]));
  const withCodes = await attachCodes(ids.map((id) => ({ id, ...(who.get(id) || {}) })));
  const byId = new Map(withCodes.map((p) => [p.id, p]));

  // ลิงก์ชั่วคราวของรูปทั้งหมดในหน้า ขอทีเดียว (อายุ 1 ชั่วโมง)
  const paths = rows.flatMap((r) => r.images || []);
  const urls = new Map();
  if (paths.length) {
    const { data: signed } = await c.storage.from('reports').createSignedUrls(paths, 3600);
    (signed || []).forEach((s) => { if (s.signedUrl) urls.set(s.path, s.signedUrl); });
  }

  $('rpList').innerHTML = `<div class="rplist">${rows.map((r, i) => {
    const p = byId.get(r.player_id) || { id: r.player_id };
    const pics = (r.images || []).map((path) => urls.get(path)
      ? `<a href="${esc(urls.get(path))}" target="_blank" rel="noopener"><img src="${esc(urls.get(path))}" alt="" loading="lazy"></a>`
      : '<span class="rp-nopic">รูปหาย</span>').join('');
    return `
    <div class="rp-card st-${esc(r.status)}" data-i="${i}">
      <div class="rp-top">
        ${whoCell(p)}
        <span class="pill tag">${esc(r.category)}</span>
        <span class="pill rp-st">${REPORT_STATUS[r.status] || esc(r.status)}</span>
        <small class="rp-when" title="${esc(new Date(r.created_at).toLocaleString('th-TH'))}">${when(r.created_at)}</small>
      </div>
      <p class="rp-body">${esc(r.body)}</p>
      ${pics ? `<div class="rp-pics">${pics}</div>` : ''}
      <details class="rp-dev"><summary>เครื่องที่ใช้</summary><code>${esc(r.device || '—')}</code></details>
      <div class="rp-acts">
        ${r.status !== 'seen' ? '<button class="btn ghost small" data-act="seen" type="button">กำลังดู</button>' : ''}
        ${r.status !== 'done' ? '<button class="btn ghost small" data-act="done" type="button">แก้แล้ว</button>' : ''}
        ${r.status !== 'new' ? '<button class="btn ghost small" data-act="new" type="button">กลับเป็นใหม่</button>' : ''}
        <button class="btn ghost small" data-act="mail" type="button">${ICON.mail}ส่งจดหมายหา</button>
        <button class="btn ghost small" data-act="player" type="button">${ICON.users}ดูผู้เล่น</button>
        <button class="btn ghost small danger" data-act="del" type="button">ลบ</button>
      </div>
    </div>`;
  }).join('')}</div>`;

  $('rpList').querySelectorAll('.rp-card').forEach((card) => {
    const r = rows[+card.dataset.i];
    const p = byId.get(r.player_id) || { id: r.player_id };
    card.querySelectorAll('[data-act]').forEach((b) =>
      b.addEventListener('click', () => reportAction(b.dataset.act, r, p)));
  });
}

async function reportAction(act, r, p) {
  const c = await client();
  if (act === 'mail') return mailTo(p);
  if (act === 'player') return openPlayer(p);
  if (act === 'del') {
    const ok = await ask({
      title: 'ลบเรื่องนี้?',
      body: 'เรื่องนี้และรูปแนบจะถูกลบถาวร กู้คืนไม่ได้<br>ถ้าแก้ปัญหาเสร็จแล้ว ใช้ปุ่ม "แก้แล้ว" แทนได้',
      okText: 'ลบเรื่อง',
    });
    if (!ok) return;
    const { error } = await c.from('bug_reports').delete().eq('id', r.id);
    if (error) return toast('ลบไม่ได้: ' + errText(error), 'bad');
    if (r.images?.length) await c.storage.from('reports').remove(r.images);
    toast('ลบเรื่องแล้ว', 'good');
  } else {
    const { error } = await c.from('bug_reports').update({ status: act }).eq('id', r.id);
    if (error) return toast('แก้สถานะไม่ได้: ' + errText(error), 'bad');
    toast('เปลี่ยนเป็น "' + REPORT_STATUS[act] + '" แล้ว', 'good');
  }
  loadReports();
}

// ── จดหมายพิเศษ: ต้อนรับบัญชีใหม่ ──────────────────────────
// แสดงเป็นการ์ดแยกจากตาราง เพราะมันไม่ได้ "ส่งแล้วจบ" แบบฉบับธรรมดา
// มันยังทำงานอยู่ตลอด (ส่งให้บัญชีใหม่ทุกบัญชี) จึงต้องเห็นสถานะกับปุ่มคุมชัด ๆ

let welcomeRows = [];

function renderWelcome(rows, hasKind) {
  welcomeRows = rows;
  const box = $('mWelcome');
  if (!hasKind) {
    box.innerHTML = `<div class="empty">${WELCOME_SQL_HINT} แล้วรีเฟรชหน้านี้</div>`;
    return;
  }
  if (!rows.length) {
    box.innerHTML = '<div class="empty">ยังไม่มีจดหมายต้อนรับ — เลือก "ต้อนรับบัญชีใหม่" ในฟอร์มข้างบนเพื่อตั้ง</div>';
    return;
  }

  box.innerHTML = rows.map((r, i) => `
    <article class="wcard${r.active ? '' : ' off'}">
      <header>
        <span class="pill ${r.active ? 'welcome' : 'warn'}">${r.active ? 'กำลังส่ง' : 'ยกเลิกแล้ว'}</span>
        <b>${esc(r.title)}</b>
      </header>
      ${r.body ? `<p class="wbody">${esc(r.body)}</p>` : ''}
      <dl class="wmeta">
        <div><dt>ของขวัญ</dt><dd>${esc(giftText(Number(r.gold), Number(r.gems)))}</dd></div>
        <div><dt>ส่งให้บัญชีที่สร้างตั้งแต่</dt><dd>${esc(when(r.sent_at))}</dd></div>
        <div><dt>บัญชีใหม่ที่ได้รับ</dt><dd>${num(r.eligible)} บัญชี · กดรับแล้ว ${num(r.claims)}</dd></div>
        ${r.updated_at ? `<div><dt>แก้ล่าสุด</dt><dd>${esc(when(r.updated_at))}</dd></div>` : ''}
      </dl>
      <div class="wact">
        <button class="btn ghost" type="button" data-edit="${i}">แก้ไขข้อความ</button>
        ${r.active
          ? `<button class="btn danger" type="button" data-off="${i}">ยกเลิกจดหมายนี้</button>`
          : `<button class="btn" type="button" data-on="${i}">เปิดส่งอีกครั้ง</button>`}
      </div>
    </article>`).join('');

  box.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => editMail(welcomeRows[b.dataset.edit])));
  box.querySelectorAll('[data-off]').forEach((b) => b.addEventListener('click', () => setMailActive(welcomeRows[b.dataset.off], false)));
  box.querySelectorAll('[data-on]').forEach((b) => b.addEventListener('click', () => setMailActive(welcomeRows[b.dataset.on], true)));
}

/** ผู้รับของฉบับนี้ เป็นคำที่คนอ่านรู้เรื่อง ใช้ในกล่องยืนยัน */
function mailWho(r) {
  if (r.kind === 'welcome') return 'บัญชีใหม่ทุกบัญชี';
  if (r.to_player === null) return 'ผู้เล่นทุกคน';
  return esc(r.to_name) + (r.to_code ? ` (${esc(r.to_code)})` : '');
}

/** แก้ข้อความ/ของขวัญ (ได้ทั้งจดหมายต้อนรับและฉบับธรรมดา) — ใช้ลิ้นชักข้างเดียวกับหน้าผู้เล่น */
function editMail(r) {
  const welcome = r.kind === 'welcome';
  openDrawer(welcome ? 'แก้จดหมายต้อนรับ' : 'แก้จดหมาย', `
    <p class="sub">ถึง: <b>${mailWho(r)}</b></p>
    <div class="mailform flat">
      <label class="fld"><span>หัวข้อ</span>
        <input id="wTitle" maxlength="80" value="${esc(r.title)}"></label>
      <label class="fld"><span>ข้อความ</span>
        <textarea id="wBody" rows="8" maxlength="1000">${esc(r.body)}</textarea></label>
      <div class="giftrow">
        <label class="fld"><span>เหรียญทอง</span>
          <input id="wGold" type="number" min="0" max="9999999" step="100" value="${Number(r.gold) || 0}"></label>
        <label class="fld"><span>อัญมณีสีชมพู</span>
          <input id="wGems" type="number" min="0" max="9999999" step="10" value="${Number(r.gems) || 0}"></label>
      </div>
      <p class="note">คนที่กดรับไปแล้วได้ของตามจำนวนเดิม ส่วนคนที่ยังไม่รับ${welcome ? ' และบัญชีใหม่ต่อจากนี้' : ''} จะเห็นฉบับที่แก้แล้วตอนเปิดกล่องจดหมายครั้งถัดไป</p>
      <div class="sendrow">
        <button class="btn" id="wSave" type="button">บันทึก</button>
        <button class="btn ghost" id="wCancel" type="button">ยกเลิก</button>
      </div>
    </div>`);

  $('wCancel').addEventListener('click', closeDrawer);
  $('wSave').addEventListener('click', async () => {
    const title = $('wTitle').value.trim();
    if (!title) return toast('ใส่หัวข้อก่อน', 'bad');
    const btn = $('wSave');
    btn.disabled = true;
    const c = await client();
    const { error } = await c.from('mail_outbox').update({
      title,
      body: $('wBody').value,
      gold: giftVal('wGold'),
      gems: giftVal('wGems'),
      updated_at: new Date().toISOString(),
    }).eq('id', r.id);
    btn.disabled = false;
    if (error) return toast('บันทึกไม่สำเร็จ: ' + errText(error), 'bad');
    toast(welcome ? 'บันทึกจดหมายต้อนรับแล้ว' : 'บันทึกจดหมายแล้ว', 'good');
    closeDrawer();
    loadSentMail();
  });
}

/**
 * ยกเลิก / เปิดส่งอีกครั้ง — ใช้คอลัมน์ active ตัวเดียวทั้งจดหมายต้อนรับและฉบับธรรมดา
 * ยกเลิก = ซ่อนจากคนที่ยังไม่ได้รับ (หายจากกล่องในเกมตอนเปิดกล่องครั้งถัดไป) และกดรับไม่ได้อีก
 * คนที่รับไปแล้วได้ของไปแล้ว ถอนคืนไม่ได้ เพราะทอง/เพชรบวกเข้ากระเป๋าในเครื่องเขาไปแล้ว
 */
async function setMailActive(r, on) {
  const welcome = r.kind === 'welcome';
  const who = mailWho(r);
  const ok = await ask({
    title: on ? 'เปิดส่งจดหมายนี้อีกครั้ง?' : 'ยกเลิกจดหมายนี้?',
    body: `หัวข้อ: <b>${esc(r.title)}</b><br>ถึง: ${who}<br><br>` + (on
      ? (welcome
        ? `บัญชีที่สร้างตั้งแต่ ${esc(when(r.sent_at))} และยังไม่ได้กดรับ จะเห็นฉบับนี้อีกครั้ง`
        : 'คนที่ยังไม่ได้กดรับจะเห็นฉบับนี้อีกครั้ง')
      : (welcome ? 'บัญชีใหม่จะไม่ได้รับอีก และ' : '')
        + 'คนที่ยังไม่กดรับจะไม่เห็นฉบับนี้แล้ว (หายจากกล่องจดหมายในเกม)'
        + `<br><span class="warn">คนที่กดรับไปแล้ว${r.claims ? ` (${num(r.claims)} คน)` : ''} ได้ของไปแล้ว ถอนคืนไม่ได้</span> · เปิดกลับมาได้ทีหลัง`),
    okText: on ? 'เปิดส่ง' : 'ยกเลิกจดหมาย',
    // ปุ่มปิดกล่องชื่อ "ยกเลิก" จะอ่านสับสนกับปุ่ม "ยกเลิกจดหมาย" ข้าง ๆ
    cancelText: on ? 'ยกเลิก' : 'ไม่ยกเลิก',
  });
  if (!ok) return;

  const c = await client();
  const { error } = await c.from('mail_outbox')
    .update({ active: on, updated_at: new Date().toISOString() })
    .eq('id', r.id);
  if (error) return toast('ไม่สำเร็จ: ' + errText(error), 'bad');
  toast(on ? 'เปิดส่งอีกครั้งแล้ว' : 'ยกเลิกจดหมายแล้ว', 'good');
  loadSentMail();
}

PAGES.audit = async () => {
  $('page').innerHTML = `
    ${pageHead('ตรวจผิดปกติ', 'ไล่หาบัญชีที่ตัวเลขไม่น่าเป็นไปได้ ปรับเกณฑ์ได้ตามใจ แล้วกดที่แถวเพื่อดูบัญชีนั้น')}
    <div class="toolbar">
      <label class="count">ทองเกิน <input id="tGold" type="number" value="5000000" style="width:130px"></label>
      <label class="count">เพชรเกิน <input id="tGems" type="number" value="100000" style="width:120px"></label>
      <label class="count">คะแนนเกิน <input id="tScore" type="number" value="1000000" style="width:130px"></label>
      <button class="btn" id="runAudit">ตรวจ</button>
    </div>
    <div id="alist"></div>`;

  $('runAudit').addEventListener('click', runAudit);
  runAudit();
};

/**
 * เพดานจำนวนบัญชีที่ดึงมาตรวจในรอบเดียว
 *
 * การตรวจทำที่ฝั่งเบราว์เซอร์ จึงต้องดึงข้อมูลมาทั้งก้อนก่อน ซึ่งมีเพดานเสมอ
 * ตัวเลขนี้ไม่ใช่ปัญหาตอนนี้ แต่วันที่ผู้เล่นเกินเพดาน จะมีบัญชีที่ไม่เคยถูกตรวจ
 * เลยโดยหน้าเว็บไม่บอกอะไร — ซึ่งแย่กว่าไม่มีหน้านี้ เพราะมันสร้างความมั่นใจผิด ๆ
 * ว่า "ตรวจแล้วไม่เจออะไร"
 *
 * จึงเรียงตามคนที่เล่นล่าสุดก่อน (คนที่ยังเล่นอยู่คือคนที่ต้องรู้ก่อน) แล้ว
 * บอกให้ชัดเมื่อผลชนเพดาน ทางแก้ระยะยาวคือย้ายการกรองไปทำในฐานข้อมูล
 * แล้วส่งกลับมาเฉพาะแถวที่เข้าเกณฑ์
 */
const AUDIT_LIMIT = 2000;

async function runAudit() {
  $('alist').innerHTML = '<div class="tablewrap"><div class="empty">กำลังตรวจ…</div></div>';
  const tGold = +$('tGold').value || Infinity;
  const tGems = +$('tGems').value || Infinity;
  const tScore = +$('tScore').value || Infinity;

  const c = await client();
  const { data, error } = await c
    .from('admin_players')
    .select('*')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(AUDIT_LIMIT);
  if (error) return failInto('alist', error);

  const flagged = [];
  (data || []).forEach((p) => {
    const why = [];
    if (Number(p.gold) > tGold) why.push(`ทอง ${num(p.gold)}`);
    if (Number(p.gems) > tGems) why.push(`เพชร ${num(p.gems)}`);
    if (Number(p.best_score) > tScore) why.push(`คะแนน ${num(p.best_score)}`);

    // คะแนนสูงแต่วิ่งน้อย = สัญญาณที่ตรงที่สุดว่าคะแนนไม่ได้มาจากการเล่นจริง
    // เพราะสองตัวเลขนี้มาคนละทาง (คะแนนผ่าน submit_score / รอบวิ่งผ่านการซิงก์)
    const runs = Number(p.stats?.runs ?? 0);
    if (Number(p.best_score) > 100000 && runs < 5) {
      why.push(`คะแนน ${num(p.best_score)} แต่วิ่งแค่ ${runs} รอบ`);
    }
    if (why.length) flagged.push({ ...p, why });
  });

  const cols = [
    { label: 'ผู้เล่น', cell: whoCell },
    { label: 'บัญชี', cell: accountPill },
    { label: 'เหตุที่สะดุดตา', cell: (r) => r.why.map((w) => `<span class="pill warn">${esc(w)}</span>`).join(' ') },
    { label: 'เล่นล่าสุด', cell: (r) => esc(when(r.updated_at)) },
  ];

  const scanned = (data || []).length;
  const capped = scanned >= AUDIT_LIMIT;

  $('alist').innerHTML =
    `<p class="sub">ตรวจ ${num(scanned)} บัญชี เจอที่น่าดู ${num(flagged.length)} บัญชี</p>` +
    (capped
      ? `<p class="sub warn">ชนเพดาน ${num(AUDIT_LIMIT)} บัญชีต่อรอบ —
         ตรวจเฉพาะคนที่เล่นล่าสุด ${num(AUDIT_LIMIT)} คน ยังมีบัญชีเก่ากว่านั้นที่ยังไม่ได้ตรวจ</p>`
      : '') +
    tableHTML(cols, flagged, { onRow: true, empty: 'ไม่เจออะไรผิดปกติตามเกณฑ์นี้' });

  el('tbody', $('alist'))?.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-i]');
    if (tr) openPlayer(flagged[+tr.dataset.i]);
  });
}

// ── error กลาง ──────────────────────────────────────────────

function failHTML(error) {
  return `<div class="tablewrap"><div class="empty">
    <b>โหลดข้อมูลไม่ได้</b><br>${esc(errText(error))}<br><br>
    ถ้าขึ้นว่าไม่เจอตารางหรือ view แปลว่ายังไม่ได้รัน
    <b>supabase/admin.sql</b> ใน SQL Editor ของ Supabase
  </div></div>`;
}

/** ทั้งหน้าโหลดไม่ได้ — ใช้กับหน้าที่ไม่มีแถบเครื่องมือให้รักษาไว้ */
function fail(error) {
  $('page').innerHTML = `<h2>โหลดข้อมูลไม่ได้</h2>` + failHTML(error);
}

/**
 * เฉพาะกล่องผลลัพธ์โหลดไม่ได้ ไม่แตะส่วนอื่นของหน้า
 *
 * ต้องแยกจาก fail() เพราะหน้าที่มีแถบค้นหา/ตัวกรอง ถ้าเขียนทับทั้งหน้าเวลา query พัง
 * แถบเครื่องมือจะหายไปด้วย แล้วผู้ใช้จะไม่มีทางแก้เงื่อนไขแล้วลองใหม่ได้เลย
 * นอกจากรีโหลดหน้าทิ้ง — ซึ่งเป็นสิ่งที่เจอตอนทดสอบจริง
 */
function failInto(id, error) {
  const box = $(id);
  if (box) box.innerHTML = failHTML(error);
}

// ── เริ่มทำงาน ──────────────────────────────────────────────

// ตอนพัฒนาเท่านั้น (Vite ตัดทิ้งตอน build): สคริปต์ทดสอบเปิดหน้าใด ๆ ด้วยฐานข้อมูลจำลอง โดยไม่ต้องล็อกอิน/แตะฐานข้อมูลจริง
if (import.meta.env.DEV) {
  window.__admin = {
    mock(fake) { sb = fake; $('gate').classList.add('hidden'); $('app').classList.remove('hidden'); },
    go,
  };
}

async function boot() {
  if (!URL_ || !ANON) {
    gateMsg('ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL กับ VITE_SUPABASE_ANON_KEY', 'bad');
    return;
  }

  $('sendCode').addEventListener('click', sendCode);
  $('verifyCode').addEventListener('click', verifyCode);
  $('email').addEventListener('keydown', (e) => e.key === 'Enter' && sendCode());
  $('code').addEventListener('keydown', (e) => e.key === 'Enter' && verifyCode());
  $('backToEmail').addEventListener('click', () => {
    $('gateStep2').classList.add('hidden');
    $('gateStep1').classList.remove('hidden');
    gateMsg('');
  });
  $('signOut').addEventListener('click', signOut);
  $('drawerClose').addEventListener('click', closeDrawer);
  $('scrim').addEventListener('click', closeDrawer);
  // Escape ปิดทีละชั้น ไม่ใช่ปิดหมดทีเดียว
  //
  // ask() ดัก Escape ของกล่องยืนยันไว้เองอยู่แล้ว ถ้าตรงนี้ปิดลิ้นชักด้วย
  // การกดครั้งเดียวจะยกเลิกกล่อง "และ" ปิดลิ้นชักข้างหลังไปพร้อมกัน
  // ทั้งที่ผู้ใช้ตั้งใจแค่ถอยออกจากกล่องยืนยันเพื่อกลับไปแก้ค่าในลิ้นชักต่อ
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('modal').classList.contains('hidden')) return;   // กล่องเปิดอยู่ ให้มันจัดการเอง
    closeDrawer();
  });
  $('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-page]');
    if (b) go(b.dataset.page);
  });
  // ── ย่อ/ขยายแถบข้าง (จำไว้ในเครื่อง) — ย่อแล้วชี้ที่ไอคอนเห็นชื่อเมนูจาก title ──
  for (const b of $('tabs').children) b.title = b.textContent.trim();
  const setMini = (on) => {
    $('app').classList.toggle('mini', on);
    const t = $('sideToggle');
    t.setAttribute('aria-expanded', on ? 'false' : 'true');
    t.title = on ? 'ขยายแถบข้าง ([)' : 'ย่อแถบข้าง ([)';
    t.setAttribute('aria-label', on ? 'ขยายแถบข้าง' : 'ย่อแถบข้าง');
    try { localStorage.setItem('admin:sideMini', on ? '1' : '0'); } catch { /* โหมดส่วนตัว */ }
  };
  try { setMini(localStorage.getItem('admin:sideMini') === '1'); } catch { setMini(false); }
  $('sideToggle').addEventListener('click', () => setMini(!$('app').classList.contains('mini')));
  document.addEventListener('keydown', (e) => {
    if (e.key !== '[' || e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    setMini(!$('app').classList.contains('mini'));
  });
  // ค้นจากหัวหน้า — ไปหน้าผู้เล่นพร้อมคำค้น ถ้าเป็นไอดีตรงตัวเจอคนเดียวก็เปิดลิ้นชักให้เลย
  $('gq').addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    const term = e.target.value.trim();
    if (!term) return;
    playersState.q = term;
    playersState.page = 0;
    e.target.value = '';
    e.target.blur();
    go('players');
  });
  // กด / ที่ไหนก็ได้ (ที่ไม่ใช่ช่องพิมพ์) = ไปช่องค้นหา
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
    if ($('app').classList.contains('hidden')) return;
    e.preventDefault();
    $('gq').focus();
  });

  // เปิดหน้ามาแล้วยังมี session ค้างอยู่ = เข้าได้เลย ไม่ต้องขอรหัสใหม่ทุกครั้ง
  const c = await client();
  const { data } = await c.auth.getSession();
  if (data?.session?.user) await afterSignIn(data.session.user);
}

boot();
