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
let me = null;          // { id, email } ของแอดมินที่ล็อกอินอยู่
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
function ask({ title, body = '', expect = null, label = '', okText = 'ยืนยัน' }) {
  const box = $('modal');
  const input = $('modalInput');
  const ok = $('modalOk');
  const cancel = $('modalCancel');
  const field = $('modalField');

  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = body;
  $('modalLabel').textContent = label;
  ok.textContent = okText;

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

  me = { id: user.id, email: user.email };
  $('whoEmail').textContent = user.email || '';
  $('gate').classList.add('hidden');
  $('app').classList.remove('hidden');
  go('overview');
}

async function signOut() {
  const c = await client();
  await c.auth.signOut();
  location.reload();
}

// ── ตัวจัดการหน้า ────────────────────────────────────────────

const PAGES = {};
let current = '';

function go(name) {
  current = name;
  [...$('tabs').children].forEach((b) => b.classList.toggle('on', b.dataset.page === name));
  closeDrawer();
  PAGES[name]();
}

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
  $('page').innerHTML = '<h2>ภาพรวม</h2><p class="sub">กำลังโหลด…</p>';
  const c = await client();
  const { data, error } = await c.rpc('admin_overview');
  if (error) return fail(error);

  const d = data || {};
  const card = (lbl, val, cls = '', note = '') =>
    `<div class="card"><div class="lbl">${lbl}</div><div class="val ${cls}">${val}</div>${
      note ? `<div class="note">${note}</div>` : ''
    }</div>`;

  $('page').innerHTML = `
    <h2>ภาพรวม</h2>
    <p class="sub">ตัวเลขทั้งชุดนี้อ่านมาจากฐานข้อมูลในคำสั่งเดียว จึงเป็นภาพ ณ เวลาเดียวกันทั้งหมด</p>
    <div class="cards">
      ${card('ผู้เล่นทั้งหมด', num(d.players_total), 'violet')}
      ${card('เข้าด้วยอีเมล', num(d.emails), 'mint', 'ข้ามเครื่องได้ ข้อมูลไม่หาย')}
      ${card('ผู้มาเยือน', num(d.guests), '', 'ล้างเบราว์เซอร์แล้วข้อมูลหาย')}
      ${card('สมัครใหม่ 24 ชม.', num(d.new_24h))}
      ${card('สมัครใหม่ 7 วัน', num(d.new_7d))}
      ${card('เล่นใน 24 ชม.', num(d.active_24h), 'mint')}
      ${card('เล่นใน 7 วัน', num(d.active_7d))}
      ${card('ทองรวมทั้งระบบ', num(d.gold_total), 'gold')}
      ${card('เพชรรวมทั้งระบบ', num(d.gems_total), 'violet')}
      ${card('รอบวิ่งสะสม', num(d.runs_total))}
      ${card('สุ่มกาช่าทั้งหมด', num(d.pulls_total))}
      ${card('คะแนนสูงสุด', num(d.top_score), 'gold')}
    </div>
    <p class="sub">
      "เล่นใน 24 ชม." นับจาก updated_at ของแถวผู้เล่น ซึ่งขยับทุกครั้งที่เกมซิงก์ข้อมูลขึ้นคลาวด์
      — ผู้เล่นที่เปิดเกมแบบออฟไลน์ล้วนจะไม่ถูกนับ
    </p>`;
};

// ── หน้า 2: ผู้เล่น ─────────────────────────────────────────

const PAGE_SIZE = 50;
let playersState = { q: '', kind: 'all', sort: 'updated_at', page: 0, rows: [], total: 0 };

PAGES.players = async () => {
  $('page').innerHTML = `
    <h2>ผู้เล่น</h2>
    <p class="sub">กดที่แถวเพื่อดูรายละเอียด แก้ไข หรือลบ</p>
    <div class="toolbar">
      <input class="grow" id="q" type="text" placeholder="ค้นชื่อหรืออีเมล" value="${esc(playersState.q)}">
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
      <button class="btn danger" id="purge">เคลียร์ผู้มาเยือน</button>
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

  if (s.q.trim()) {
    // or() ของ postgrest ต้องหนีคอมมากับวงเล็บในคำค้น ไม่งั้นมันไปแยกเป็นเงื่อนไขใหม่
    const term = s.q.trim().replace(/[(),]/g, ' ');
    q = q.or(`name.ilike.%${term}%,email.ilike.%${term}%`);
  }
  if (s.kind === 'guest') q = q.is('email', null);
  if (s.kind === 'email') q = q.not('email', 'is', null);

  const from = s.page * PAGE_SIZE;
  const { data, error, count } = await q
    .order(s.sort, { ascending: false, nullsFirst: false })
    .range(from, from + PAGE_SIZE - 1);

  if (error) return failInto('list', error);

  s.rows = data || [];
  s.total = count || 0;
  $('count').textContent = `${num(s.total)} คน`;
  $('pageNo').textContent = `${s.page + 1} / ${Math.max(1, Math.ceil(s.total / PAGE_SIZE))}`;
  $('prev').disabled = s.page === 0;
  $('next').disabled = (s.page + 1) * PAGE_SIZE >= s.total;

  const cols = [
    { label: 'ชื่อ', cell: (r) => esc(r.name) },
    { label: 'บัญชี', cell: (r) =>
        r.is_guest ? '<span class="pill guest">ผู้มาเยือน</span>'
                   : `<span class="pill email">${esc(r.email)}</span>` },
    { label: 'ทอง', num: true, cell: (r) => num(r.gold) },
    { label: 'เพชร', num: true, cell: (r) => num(r.gems) },
    { label: 'คะแนนสูงสุด', num: true, cell: (r) => num(r.best_score) },
    { label: 'รอบวิ่ง', num: true, cell: (r) => num(r.stats?.runs ?? 0) },
    { label: 'เล่นล่าสุด', cell: (r) => esc(when(r.updated_at)) },
    { label: 'สมัครเมื่อ', cell: (r) => esc(when(r.created_at)) },
  ];

  $('list').innerHTML = tableHTML(cols, s.rows, { onRow: true, empty: 'ไม่เจอผู้เล่นที่ตรงกับที่ค้น' });
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

function openPlayer(p) {
  const jsonBox = (v) => `<div class="json">${esc(JSON.stringify(v ?? null, null, 2))}</div>`;

  openDrawer(p.name || 'ผู้เล่น', `
    <div class="formrow">
      <label>รหัสผู้เล่น (แก้ไม่ได้)</label>
      <div class="readonly">${esc(p.id)}</div>
    </div>
    <div class="formrow">
      <label>บัญชี</label>
      <div class="readonly">${p.is_guest ? 'ผู้มาเยือน — ไม่มีอีเมลผูกไว้' : esc(p.email)}</div>
    </div>
    <div class="row2">
      <div class="formrow"><label>เข้าครั้งล่าสุด</label><div class="readonly">${esc(when(p.last_sign_in_at))}</div></div>
      <div class="formrow"><label>ซิงก์ล่าสุด</label><div class="readonly">${esc(when(p.updated_at))}</div></div>
    </div>

    <div class="sect">แก้ไขได้</div>
    <div class="formrow"><label>ชื่อที่โชว์</label><input id="f_name" type="text" value="${esc(p.name)}" maxlength="16"></div>
    <div class="row2">
      <div class="formrow"><label>ทอง</label><input id="f_gold" type="number" value="${p.gold ?? 0}"></div>
      <div class="formrow"><label>เพชร</label><input id="f_gems" type="number" value="${p.gems ?? 0}"></div>
    </div>
    <div class="row2">
      <div class="formrow"><label>XP</label><input id="f_xp" type="number" value="${p.xp ?? 0}"></div>
      <div class="formrow"><label>ด่านที่เลือก</label><input id="f_stage" type="text" value="${esc(p.stage)}"></div>
    </div>
    <div class="row2">
      <div class="formrow"><label>สีขน</label><input id="f_skin" type="text" value="${esc(p.skin)}"></div>
      <div class="formrow"><label>ชุดที่ใส่</label><input id="f_outfit" type="text" value="${esc(p.outfit)}"></div>
    </div>

    <div class="sect">ข้อมูลดิบ (อ่านอย่างเดียว)</div>
    <div class="formrow"><label>สถิติสะสม</label>${jsonBox(p.stats)}</div>
    <div class="formrow"><label>สมบัติกับขั้นตีบวก</label>${jsonBox(p.treasures)}</div>
    <div class="formrow"><label>ชุดที่สุ่มได้แล้ว (${(p.owned || []).length} ชิ้น)</label>${jsonBox(p.owned)}</div>
    <div class="formrow"><label>สมบัติที่ติดตั้ง</label>${jsonBox(p.equip)}</div>
    <div class="formrow"><label>กิจกรรมที่กดรับแล้ว</label>${jsonBox(p.quests_claimed)}</div>

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
  $('save').addEventListener('click', () => savePlayer(p));
  $('del').addEventListener('click', () => deletePlayer(p));
}

async function savePlayer(p) {
  const patch = {
    name: $('f_name').value.trim() || 'แมวนิรนาม',
    gold: Math.max(0, Math.floor(+$('f_gold').value || 0)),
    gems: Math.max(0, Math.floor(+$('f_gems').value || 0)),
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
    <h2>คะแนน</h2>
    <p class="sub">สถิติสูงสุดของแต่ละคนแยกตามด่าน — ลบได้ทีละแถวเมื่อเจอคะแนนที่ไม่น่าเป็นไปได้</p>
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

  const rows = data || [];
  $('scount').textContent = `${num(count || 0)} แถว (โชว์สูงสุด 200)`;

  const cols = [
    { label: 'ชื่อ', cell: (r) => esc(r.name) },
    { label: 'บัญชี', cell: (r) => r.is_guest ? '<span class="pill guest">ผู้มาเยือน</span>' : `<span class="pill email">${esc(r.email)}</span>` },
    { label: 'ด่าน', cell: (r) => esc(r.stage_id) },
    { label: 'คะแนน', num: true, cell: (r) => num(r.score) },
    { label: 'ระยะทาง', num: true, cell: (r) => num(r.distance) + ' ม.' },
    { label: 'เมื่อ', cell: (r) => esc(when(r.updated_at)) },
    { label: '', cell: () => '<button class="btn danger" data-act="del">ลบ</button>' },
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
    <h2>ประวัติกาช่า</h2>
    <p class="sub">200 รายการล่าสุด พร้อมสัดส่วนความหายากที่ออกจริง — เอาไว้เทียบกับอัตราที่ตั้งไว้ในเกม</p>
    <div id="pstats" class="cards"></div>
    <div id="plist"><div class="tablewrap"><div class="empty">กำลังโหลด…</div></div></div>`;

  const c = await client();
  const { data, error } = await c.from('admin_pulls').select('*').order('created_at', { ascending: false }).range(0, 199);
  if (error) return failInto('plist', error);

  const rows = data || [];

  // สัดส่วนความหายากจากที่ออกจริง — ตัวเลขนี้ควรใกล้อัตราที่ตั้งไว้ในเกม
  // ถ้าเพี้ยนไปมากแปลว่าสูตรสุ่มมีปัญหา หรือมีคนยิง API ตรงเข้ามาเขียนเอง
  const byRarity = {};
  rows.forEach((r) => { byRarity[r.rarity || '—'] = (byRarity[r.rarity || '—'] || 0) + 1; });
  $('pstats').innerHTML = Object.entries(byRarity)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<div class="card"><div class="lbl">${esc(k)}</div><div class="val violet">${v}</div>
        <div class="note">${rows.length ? ((v / rows.length) * 100).toFixed(1) : 0}% ของที่โชว์</div></div>`)
    .join('') || '<div class="card"><div class="lbl">ยังไม่มีการสุ่ม</div></div>';

  const cols = [
    { label: 'ชื่อ', cell: (r) => esc(r.name) },
    { label: 'ได้ชุด', cell: (r) => esc(r.outfit_id || '—') },
    { label: 'ความหายาก', cell: (r) => esc(r.rarity || '—') },
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

const mailState = { to: null, all: false, rows: [], found: [] };

PAGES.mail = async () => {
  $('page').innerHTML = `
    <h2>ส่งจดหมายและของขวัญ</h2>
    <p class="sub">ของขวัญจะเข้ากล่องจดหมายในเกม ผู้เล่นต้องกดรับเอง ทองกับเพชรบวกให้ตอนกดรับ ไม่ใช่ตอนส่ง</p>

    <div class="mailform">
      <div class="fld">
        <span>ส่งถึง</span>
        <div class="modes">
          <button class="mode on" id="mModeOne" type="button">เลือกทีละคน</button>
          <button class="mode" id="mModeAll" type="button">ทั้งเซิร์ฟ</button>
        </div>
        <div id="mOne">
          <div class="pickrow">
            <input id="mTo" type="search" placeholder="พิมพ์ชื่อหรืออีเมลเพื่อค้นหา" autocomplete="off">
            <button class="btn ghost" id="mClear" type="button">ล้าง</button>
          </div>
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

    <h3 class="mailsent">จดหมายที่ส่งไปแล้ว</h3>
    <div id="mList"><div class="tablewrap"><div class="empty">กำลังโหลด…</div></div></div>`;

  const to = $('mTo');
  let timer = null;

  // ค้นแบบหน่วงไว้ ไม่ยิงทุกตัวอักษรที่พิมพ์
  to.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(searchPlayers, 260);
  });
  $('mClear').addEventListener('click', () => {
    mailState.to = null;
    to.value = '';
    $('mFound').innerHTML = '';
    renderPicked();
  });
  $('mModeOne').addEventListener('click', () => setMode(false));
  $('mModeAll').addEventListener('click', () => setMode(true));
  $('mSend').addEventListener('click', sendMail);

  setMode(false);
  loadSentMail();
};

async function searchPlayers() {
  const term = $('mTo').value.trim();
  const box = $('mFound');
  if (term.length < 2) return (box.innerHTML = '');

  const c = await client();
  const safe = term.replace(/[(),]/g, ' ');
  const { data, error } = await c
    .from('admin_players')
    .select('id, name, email')
    .or(`name.ilike.%${safe}%,email.ilike.%${safe}%`)
    .limit(8);

  if (error) return (box.innerHTML = `<div class="empty">ค้นหาไม่ได้: ${esc(errText(error))}</div>`);

  mailState.found = data || [];
  if (!mailState.found.length) return (box.innerHTML = '<div class="empty">ไม่เจอผู้เล่นที่ตรงกับคำค้น</div>');

  box.innerHTML = mailState.found
    .map((p, i) => `<button class="foundrow" data-i="${i}" type="button">
        <b>${esc(p.name)}</b>
        <span>${p.email ? esc(p.email) : 'ผู้มาเยือน'}</span>
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

/** สลับระหว่างส่งทีละคนกับส่งทั้งเซิร์ฟ */
function setMode(all) {
  mailState.all = all;
  // ล้างคนที่เลือกไว้ทุกครั้งที่สลับโหมด ไม่ให้เหลือค้างแล้วส่งผิดคน
  mailState.to = null;
  $('mTo').value = '';
  $('mFound').innerHTML = '';
  $('mOne').classList.toggle('hidden', all);
  $('mModeOne').classList.toggle('on', !all);
  $('mModeAll').classList.toggle('on', all);
  renderPicked();
}

function renderPicked() {
  if (mailState.all) {
    // บอกให้ชัดตรงนี้เลยว่าใครจะได้บ้าง เพราะ "ทั้งเซิร์ฟ" ตีความได้หลายแบบ
    // ฉบับที่ส่งทั้งเซิร์ฟเก็บเป็นแถวเดียวที่ไม่ระบุผู้รับ ใครเปิดเกมมาก็เห็น
    // คนที่สมัครทีหลังจึงได้ด้วย
    $('mPicked').innerHTML = '<span class="pill email">ผู้เล่นทุกคน</span> '
      + '<span class="note">รวมคนที่สมัครใหม่ทีหลัง</span>';
    $('mSend').disabled = false;
    $('mHint').textContent = '';
    return;
  }

  const p = mailState.to;
  $('mPicked').innerHTML = p
    ? `<span class="pill email">${esc(p.name)}</span> <span class="note">${p.email ? esc(p.email) : 'ผู้มาเยือน'}</span>`
    : '<span class="note">ยังไม่ได้เลือกผู้รับ</span>';
  $('mSend').disabled = !p;
  $('mHint').textContent = p ? '' : 'เลือกผู้รับก่อน';
}

async function sendMail() {
  const all = mailState.all;
  const p = mailState.to;
  if (!all && !p) return;

  const title = $('mTitle').value.trim();
  const body = $('mBody').value;
  const gold = Math.max(0, Math.floor(Number($('mGold').value) || 0));
  const gems = Math.max(0, Math.floor(Number($('mGems').value) || 0));

  if (!title) return toast('ใส่หัวข้อก่อน', 'bad');

  // ให้ทวนของที่จะส่งอีกรอบ เพราะพิมพ์ศูนย์เกินตัวเดียวก็แจกเกินสิบเท่าแล้ว
  const gift = gold || gems
    ? `ทอง ${num(gold)} • เพชร ${num(gems)}`
    : 'ไม่มีของขวัญแนบ (ข้อความอย่างเดียว)';
  // ask() ใส่ body ด้วย innerHTML จึงต้อง esc ก่อน — หัวข้อมาจากช่องพิมพ์
  // ถ้าไม่ esc คนที่พิมพ์แท็กลงไปจะทำให้กล่องยืนยันแสดงผลเพี้ยน
  // ส่งทั้งเซิร์ฟถอนคืนไม่ได้และกระทบทุกคน จึงบังคับพิมพ์ยืนยันก่อน
  // ต่างจากส่งทีละคนที่กดยืนยันเฉย ๆ พอ เพราะพลาดแล้วแก้ได้ด้วยการคุยกับคนเดียว
  const ok = await ask({
    title: all ? 'ส่งให้ผู้เล่นทุกคน?' : 'ส่งจดหมายถึง ' + p.name + '?',
    body: `หัวข้อ: ${esc(title)}<br>${esc(gift)}`
      + (all ? '<br><br>ทุกคนที่เปิดเกมจะได้รับ รวมคนที่สมัครใหม่ทีหลัง และถอนคืนไม่ได้' : ''),
    expect: all ? 'ทั้งเซิร์ฟ' : null,
    label: all ? 'พิมพ์ว่า ทั้งเซิร์ฟ เพื่อยืนยัน' : '',
    okText: 'ส่งเลย',
  });
  if (!ok) return;

  $('mSend').disabled = true;
  const c = await client();
  const { error } = await c.from('mail_outbox').insert({
    // null = ส่งทั้งเซิร์ฟ ใช้แถวเดียวไม่ว่าจะมีผู้เล่นกี่คน
    to_player: all ? null : p.id,
    title, body, gold, gems,
    sent_by: (await c.auth.getUser()).data.user?.id ?? null,
  });
  $('mSend').disabled = false;

  if (error) return toast('ส่งไม่สำเร็จ: ' + errText(error), 'bad');

  toast(all ? 'ส่งให้ผู้เล่นทุกคนแล้ว' : 'ส่งให้ ' + p.name + ' แล้ว', 'good');
  $('mTitle').value = '';
  $('mBody').value = '';
  $('mGold').value = '0';
  $('mGems').value = '0';
  loadSentMail();
}

async function loadSentMail() {
  const c = await client();
  const { data, error } = await c.from('admin_mail').select('*').limit(100);
  if (error) return failInto('mList', error);

  mailState.rows = data || [];
  const cols = [
    { label: 'ถึง', cell: (r) => esc(r.to_name) },
    { label: 'หัวข้อ', cell: (r) => esc(r.title) },
    { label: 'ทอง', num: true, cell: (r) => num(r.gold) },
    { label: 'เพชร', num: true, cell: (r) => num(r.gems) },
    // ฉบับที่ส่งทั้งเซิร์ฟมีผู้รับหลายคน ตัวเลขนี้จึงบอกว่ากดรับไปแล้วกี่คน
    // ฉบับทั้งเซิร์ฟมีผู้รับหลายคน ตัวเลขจำนวนคนที่กดรับจึงมีความหมาย
    // ส่วนฉบับที่ส่งทีละคนมีได้แค่ 0 กับ 1 บอกเป็นสถานะอ่านง่ายกว่าบอกเป็นเลข
    { label: 'รับแล้ว', cell: (r) => (r.to_player === null
        ? `<span class="pill email">${num(r.claims)} คน</span>`
        : r.claims ? '<span class="pill email">รับแล้ว</span>'
                   : '<span class="pill guest">ยังไม่รับ</span>') },
    { label: 'ส่งเมื่อ', cell: (r) => esc(when(r.sent_at)) },
  ];
  $('mList').innerHTML = tableHTML(cols, mailState.rows, { empty: 'ยังไม่เคยส่งจดหมาย' });
}

PAGES.audit = async () => {
  $('page').innerHTML = `
    <h2>ตรวจผิดปกติ</h2>
    <p class="sub">ไล่หาบัญชีที่ตัวเลขไม่น่าเป็นไปได้ ปรับเกณฑ์ได้ตามใจ</p>
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

async function runAudit() {
  $('alist').innerHTML = '<div class="tablewrap"><div class="empty">กำลังตรวจ…</div></div>';
  const tGold = +$('tGold').value || Infinity;
  const tGems = +$('tGems').value || Infinity;
  const tScore = +$('tScore').value || Infinity;

  const c = await client();
  const { data, error } = await c.from('admin_players').select('*').limit(2000);
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
    { label: 'ชื่อ', cell: (r) => esc(r.name) },
    { label: 'บัญชี', cell: (r) => r.is_guest ? '<span class="pill guest">ผู้มาเยือน</span>' : `<span class="pill email">${esc(r.email)}</span>` },
    { label: 'เหตุที่สะดุดตา', cell: (r) => r.why.map((w) => `<span class="pill warn">${esc(w)}</span>`).join(' ') },
    { label: 'เล่นล่าสุด', cell: (r) => esc(when(r.updated_at)) },
  ];

  $('alist').innerHTML =
    `<p class="sub">ตรวจ ${num((data || []).length)} บัญชี เจอที่น่าดู ${num(flagged.length)} บัญชี</p>` +
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
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeDrawer());
  $('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-page]');
    if (b) go(b.dataset.page);
  });

  // เปิดหน้ามาแล้วยังมี session ค้างอยู่ = เข้าได้เลย ไม่ต้องขอรหัสใหม่ทุกครั้ง
  const c = await client();
  const { data } = await c.auth.getSession();
  if (data?.session?.user) await afterSignIn(data.session.user);
}

boot();
