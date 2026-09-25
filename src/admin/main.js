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
  overview: 'ภาพรวม', players: 'ผู้เล่น', mail: 'จดหมาย',
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
