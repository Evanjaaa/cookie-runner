// src/town/chat.js
// ─────────────────────────────────────────────────────────────
// แชตแยกชั้นในปราสาท (ผู้ใช้ 8 พ.ย. 2026) — ฟองบนหัว + กล่องดูย้อนหลังของชั้นนี้
//
//   ทุกคน (รวมผู้มาเยือน): ประโยคสำเร็จรูป + สติกเกอร์ (ส่งแค่รหัส — ไม่มีทางมีคำไม่ดี)
//   สมาชิก (ล็อกอินด้วยอีเมล — ห้องตรวจกับ Supabase เอง): พิมพ์เองได้ ไม่เกิน 60 ตัว
//     ห้องกรองคำหยาบ/ลิงก์/เบอร์โทร + จำกัดความถี่ (realtime/src/index.js)
//   ซ่อนข้อความ (บล็อก): จำรหัสผู้เล่นไว้ในเครื่อง ไม่เห็นข้อความ/ฟองของคนนั้นอีก
//   รายงาน: ส่งเข้ากล่องแจ้งปัญหาเดิม (bug_reports หมวด "แชตปราสาท") พร้อมชื่อ รหัส และข้อความล่าสุด แล้วซ่อนให้เลย
//   (กฎ Play Store เรื่องเนื้อหาที่ผู้เล่นสร้าง: กรองคำ · รายงาน · บล็อก · จำกัดความถี่)
//
// รอบ 2 (ผู้ใช้ 9 พ.ย. "ใช้งานยากไปนิด ปรับ UI ให้ลื่น"):
//   ไม่มีแท็บแล้ว — แถบล่างมีช่องพิมพ์ตลอด + ปุ่ม "ประโยค" / "สติกเกอร์" เปิดแผงเลือกเหนือแถบ
//   เลือกประโยค/สติกเกอร์ = ส่งแล้วปิดแชตเลย (แตะครั้งเดียวจบ) · พิมพ์ = ส่งแล้วแผงยังเปิดคุยต่อได้
//   แชตไม่หยุดเกม (เดินคุยไปได้) · แตะฉากนอกแผง = ปิด · มือถือ: แผงยกขึ้นพ้นคีย์บอร์ดเอง
//   แชตปิดอยู่มีข้อความใหม่ = ป้ายเล็ก "ชื่อ: ข้อความ" โผล่ข้างปุ่มแชตสักครู่ (แตะ = เปิดแชต)
//
// ข้อความแสดงเมื่อห้องส่งกลับมาแล้วเท่านั้น (ของเราก็ด้วย) = ข้อความที่ห้องไม่ให้ผ่านจะไม่โผล่
// ─────────────────────────────────────────────────────────────
import { STICKERS, STICKER_IDS, drawSticker, stickerCanvas } from './stickers.js';

/** ประโยคสำเร็จรูป — ห้องส่งแค่ id · เพิ่ม/แก้ข้อความได้ที่นี่ที่เดียว (id เดิมห้ามเปลี่ยนความหมาย) */
export const PRESETS = [
  { id: 'hi', text: 'สวัสดีเหมียว~' }, { id: 'yay', text: 'เย้ เจอกันแล้ว!' }, { id: 'cute', text: 'ชุดน่ารักมากเลย' },
  { id: 'play', text: 'มาเล่นด้วยกันไหม' }, { id: 'follow', text: 'ตามมาทางนี้เลย' }, { id: 'wait', text: 'รอแป๊บนะ' },
  { id: 'lounge', text: 'ไปนั่งเล่นชั้น 2 กัน' }, { id: 'roof', text: 'ขึ้นไปดูดาวชั้น 3 กัน' }, { id: 'wish', text: 'ไปขอพรดาวตกกัน' },
  { id: 'photo', text: 'ถ่ายรูปด้วยกันไหม' }, { id: 'friend', text: 'เป็นเพื่อนกันนะ' }, { id: 'thanks', text: 'ขอบคุณนะ' },
  { id: 'sorry', text: 'ขอโทษนะ' }, { id: 'yes', text: 'ได้เลย!' }, { id: 'later', text: 'ไว้คราวหน้านะ' },
  { id: 'bye', text: 'ไปก่อนนะ บ๊ายบาย' },
];
const PRESET = Object.fromEntries(PRESETS.map((p) => [p.id, p.text]));
const FLOOR_NAME = { hall: 'ชั้น 1 · โถงต้อนรับ', lounge: 'ชั้น 2 · ห้องนั่งเล่น', roof: 'ชั้น 3 · ดาดฟ้าชมดาว' };
const LOG_MAX = 40;
const LIFE = { x: 5600, p: 5000, s: 3600 };   // ฟองบนหัวค้างกี่ ms (พิมพ์เอง / ประโยค / สติกเกอร์)
const NO = {
  fast: 'ส่งเร็วไปนิด รอแป๊บแล้วค่อยส่งใหม่นะ',
  member: 'พิมพ์คุยได้เฉพาะคนที่ล็อกอินด้วยอีเมล · ใช้ประโยคกับสติกเกอร์ได้เลยนะ',
  link: 'ส่งลิงก์ในแชตไม่ได้นะ',
  number: 'ส่งเบอร์โทรหรือตัวเลขยาว ๆ ไม่ได้นะ เพื่อความปลอดภัย',
  word: 'มีคำที่ไม่น่ารัก ลองพิมพ์ใหม่นะเหมียว',
  same: 'ข้อความซ้ำเดิม รอสักครู่นะ',
  bad: 'ส่งข้อความนี้ไม่ได้',
};
const BLOCK_KEY = 'cookie-runner:chat-block';

const $ = (id) => document.getElementById(id);
let api = null;   // { send(k, v), canType(), floor(), toast(text), report({ category, body }), desk() }
let open = false, pick = null;   // pick = แผงเลือกที่เปิดอยู่: null | 'p' ประโยค | 's' สติกเกอร์
const logs = new Map();      // ชั้น → [{ id, name, u, m, mine, k, v, text, at }]
const bubbles = new Map();   // รหัสในห้อง → { k, v, at, lines, w }
let blocked = new Set();
try { blocked = new Set(JSON.parse(localStorage.getItem(BLOCK_KEY) || '[]')); } catch { /* โหมดส่วนตัว */ }
const saveBlocked = () => { try { localStorage.setItem(BLOCK_KEY, JSON.stringify([...blocked].slice(-200))); } catch { /* เต็ม/โหมดส่วนตัว */ } };
/** กุญแจบล็อก: รหัสผู้เล่นที่ห้องตรวจแล้ว (ถาวร) · ไม่ล็อกอินเลย = รหัสในห้อง (เฉพาะรอบนี้) */
const blockKey = (who) => (who.u ? 'u:' + who.u : 's:' + who.id);

// ── ตัดบรรทัดในฟอง: แยกคำไทยด้วย Intl.Segmenter · ไม่ให้คำเดี่ยวตกบรรทัด (กฎ CLAUDE.md) = หาความกว้างแคบสุดที่ยังได้จำนวนบรรทัดเท่าเดิม ──
const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
const measureCv = document.createElement('canvas').getContext('2d');
const FONT = '600 12px Mali, sans-serif';
function wrapAt(words, maxW) {
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur + w;
    if (cur && measureCv.measureText(t.trimEnd()).width > maxW) { lines.push(cur.trimEnd()); cur = w.trimStart(); } else cur = t;
  }
  if (cur.trim()) lines.push(cur.trimEnd());
  return lines;
}
function wrapText(text, maxW = 132, maxLines = 3) {
  measureCv.font = FONT;
  const words = seg ? [...seg.segment(text)].map((s) => s.segment) : [...text];
  let lines = wrapAt(words, maxW);
  if (lines.length > 1) {
    const n = lines.length;
    let lo = 40, hi = maxW;
    while (hi - lo > 2) { const mid = (lo + hi) / 2; if (wrapAt(words, mid).length > n) lo = mid; else hi = mid; }
    lines = wrapAt(words, hi);
  }
  if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/u, '…'); }
  return lines;
}

/** ข้อความจากห้อง: who = { id, name, u, m, mine } */
export function chatReceive(msg, who) {
  if (!who.mine && blocked.has(blockKey(who))) return;
  let text = '';
  if (msg.k === 'p') { text = PRESET[msg.v]; if (!text) return; }
  else if (msg.k === 's') { if (!STICKER_IDS.has(msg.v)) return; }
  else if (msg.k === 'x') { text = String(msg.v || '').slice(0, 80); if (!text) return; }
  else return;
  const at = performance.now();
  const row = { id: who.id, name: who.name, u: who.u, m: who.m, mine: !!who.mine, k: msg.k, v: msg.v, text, at };
  const list = logs.get(msg.w) || [];
  list.push(row);
  if (list.length > LOG_MAX) list.shift();
  logs.set(msg.w, list);
  bubbles.set(who.id, { k: msg.k, v: msg.v, at, w: msg.w, lines: msg.k === 's' ? null : wrapText(text) });
  if (msg.w === api?.floor()) {
    if (open) renderLog(); else if (!who.mine) peek(row);
  }
}
/** ห้องไม่ให้ผ่าน → บอกผู้เล่น */
export function chatSayNo(why) { api?.toast(NO[why] || NO.bad); }
/** สายหลุด/ออกจากปราสาท — ฟองหายหมด (ประวัติยังอยู่จนปิดหน้า) */
export function chatReset() { bubbles.clear(); hidePeek(); }

/** ฟองของรหัสนี้ (ยังไม่หมดเวลา และอยู่ชั้นนี้) */
export function bubbleOf(id) {
  if (!id) return null;
  const b = bubbles.get(id);
  if (!b) return null;
  const age = performance.now() - b.at;
  if (age > LIFE[b.k]) { bubbles.delete(id); return null; }
  return b.w === api?.floor() ? b : null;
}
/** วาดฟองเหนือจุด (x, y = ขอบล่างของฟอง) — เด้งเข้า ค่อยจางตอนหมดเวลา */
export function drawBubble(c, x, y, b) {
  const age = performance.now() - b.at, life = LIFE[b.k];
  const a = Math.min(1, age / 140, (life - age) / 400);
  if (a <= 0) return;
  const u = Math.min(1, age / 260), pop = 1 + Math.sin(u * Math.PI) * 0.12 * (1 - u);   // เด้งเข้า
  c.save();
  c.globalAlpha = a;
  c.translate(x, y); c.scale(pop, pop);
  if (b.k === 's') {
    c.fillStyle = 'rgba(255,255,255,.88)';
    c.beginPath(); c.arc(0, -24, 23, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(-6, -3); c.lineTo(0, 4); c.lineTo(6, -3); c.fill();
    drawSticker(c, b.v, 0, -24, 18 + Math.sin(age * 0.012) * 0.6);
  } else {
    c.font = FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
    const w = Math.max(...b.lines.map((l) => c.measureText(l).width)) + 18, lh = 15, h = b.lines.length * lh + 12;
    c.fillStyle = 'rgba(70,30,110,.18)';
    c.beginPath(); c.roundRect(-w / 2, -h - 4, w, h, 11); c.fill();
    c.fillStyle = '#FFFFFF';
    c.beginPath(); c.roundRect(-w / 2, -h - 6, w, h, 11); c.moveTo(-6, -7); c.lineTo(0, 1); c.lineTo(6, -7); c.fill();
    c.fillStyle = '#5B3A8A';
    b.lines.forEach((l, i) => c.fillText(l, 0, -h - 6 + 6 + lh / 2 + i * lh + 0.5));
  }
  c.restore();
}

// ── ป้ายข้อความใหม่ข้างปุ่มแชต (แชตปิดอยู่) ──
let peekTimer = null;
function peek(r) {
  const el = $('chatPeek');
  if (!el) return;
  el.textContent = `${r.name}: ${r.k === 's' ? 'ส่งสติกเกอร์' : r.text}`;
  el.classList.remove('hidden');
  $('btnChat')?.classList.add('new');
  clearTimeout(peekTimer);
  peekTimer = setTimeout(() => el.classList.add('hidden'), 4200);
}
function hidePeek() { clearTimeout(peekTimer); $('chatPeek')?.classList.add('hidden'); $('btnChat')?.classList.remove('new'); }

// ── แผงแชต ──
export const chatOpen = () => open;
export function toggleChat(on = !open) {
  if (!api || on === open) return;
  open = on;
  $('chatPanel').classList.toggle('hidden', !open);
  $('btnChat')?.setAttribute('aria-expanded', String(open));
  if (open) {
    hidePeek();
    pick = api.canType() ? null : 'p';   // ผู้มาเยือนพิมพ์ไม่ได้ → เปิดแผงประโยคให้เลย
    paintChat();
    renderLog();
    fitKeyboard();
    if (api.desk() && api.canType()) setTimeout(() => $('chatText').focus(), 30);
  } else {
    document.activeElement?.blur?.();
    $('chatPanel').style.bottom = '';
  }
}
export const closeChat = () => toggleChat(false);
/** เปิดแผงแล้ว (คอมกด Enter) → ไปที่ช่องพิมพ์ */
export function focusChat() { if (open && api?.canType()) $('chatText').focus(); }

/** ชื่อชั้น + แผงเลือก + ช่องพิมพ์ (สมาชิก/ผู้มาเยือน) — เรียกตอนเปิดแผง / สถานะเปลี่ยน */
export function paintChat() {
  if (!api) return;
  $('chatTitle').textContent = 'แชต · ' + (FLOOR_NAME[api.floor()] || 'ปราสาท');
  $('chatPick').classList.toggle('hidden', !pick);
  $('chatPaneP').classList.toggle('hidden', pick !== 'p');
  $('chatPaneS').classList.toggle('hidden', pick !== 's');
  $('chatToolP').classList.toggle('on', pick === 'p');
  $('chatToolS').classList.toggle('on', pick === 's');
  $('chatToolP').setAttribute('aria-expanded', String(pick === 'p'));
  $('chatToolS').setAttribute('aria-expanded', String(pick === 's'));
  const can = api.canType();
  $('chatForm').classList.toggle('hidden', !can);
  $('chatLock').classList.toggle('hidden', can);
}

function renderLog() {
  const ol = $('chatLog');
  const list = (logs.get(api.floor()) || []).filter((r) => r.mine || !blocked.has(blockKey(r)));
  ol.replaceChildren();
  if (!list.length) {
    const li = document.createElement('li');
    li.className = 'chat-empty';
    li.textContent = 'ยังไม่มีใครคุยในชั้นนี้ ทักทายเพื่อน ๆ ก่อนเลย';
    ol.append(li);
  }
  for (const r of list) {
    const li = document.createElement('li');
    li.className = 'chat-row' + (r.mine ? ' mine' : '') + (r.m ? '' : ' guest');
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = r.mine ? 'เรา' : r.name;
    const msg = document.createElement('span');
    msg.className = 'msg';
    if (r.k === 's') { msg.append(stickerCanvas(r.v, 30)); msg.setAttribute('aria-label', STICKERS.find((s) => s.id === r.v)?.name || 'สติกเกอร์'); }
    else msg.textContent = r.text;
    li.append(who, msg);
    if (!r.mine) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'chat-more';
      more.setAttribute('aria-label', `ซ่อนหรือรายงาน ${r.name}`);
      more.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18.5" cy="12" r="2"/></svg>';
      more.addEventListener('click', (e) => { e.stopPropagation(); toggleActs(li, r); });
      li.append(more);
    }
    ol.append(li);
  }
  if (blocked.size) {
    const li = document.createElement('li');
    li.className = 'chat-unblock';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chat-link';
    b.textContent = `ซ่อนไว้ ${blocked.size} คน · แตะเพื่อเลิกซ่อนทั้งหมด`;
    b.addEventListener('click', () => { blocked.clear(); saveBlocked(); renderLog(); api.toast('เลิกซ่อนข้อความทั้งหมดแล้ว'); });
    li.append(b);
    ol.append(li);
  }
  ol.scrollTop = ol.scrollHeight;
}
/** ปุ่ม ⋯ ท้ายแถวของคนอื่น = ซ่อนข้อความ / รายงาน (แตะรายงานสองครั้งเพื่อยืนยัน กันพลาด) */
function toggleActs(li, r) {
  const old = li.nextElementSibling?.classList.contains('chat-acts') ? li.nextElementSibling : null;
  document.querySelectorAll('.chat-acts').forEach((e) => e.remove());
  if (old) return;
  const box = document.createElement('li');
  box.className = 'chat-acts';
  const hide = document.createElement('button');
  hide.type = 'button'; hide.className = 'chat-act ghost'; hide.textContent = 'ซ่อนข้อความคนนี้';
  hide.addEventListener('click', (e) => { e.stopPropagation(); block(r); api.toast(`ซ่อนข้อความของ ${r.name} แล้ว`); });
  const rep = document.createElement('button');
  rep.type = 'button'; rep.className = 'chat-act report'; rep.textContent = 'รายงาน';
  let armed = false;
  rep.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!armed) { armed = true; rep.textContent = 'แตะอีกครั้งเพื่อส่งรายงาน'; setTimeout(() => { armed = false; if (rep.isConnected) rep.textContent = 'รายงาน'; }, 3500); return; }
    rep.disabled = true;
    const said = (logs.get(api.floor()) || []).filter((x) => x.id === r.id).slice(-5).map((x) => '- ' + (x.k === 's' ? '[สติกเกอร์ ' + x.v + ']' : x.text));
    const body = ['[แชตปราสาท] รายงานผู้เล่น', `ชื่อ: ${r.name} (${r.m ? 'สมาชิก' : 'ผู้มาเยือน'})`, `รหัส: ${r.u || '-'}`, `ชั้น: ${api.floor()}`, 'ข้อความล่าสุด:', ...said].join('\n');
    const res = await api.report({ category: 'แชตปราสาท', body }).catch(() => ({ ok: false }));
    block(r);
    api.toast(res?.ok ? 'ส่งรายงานแล้ว ขอบคุณนะ ทีมงานจะตรวจสอบ (ซ่อนข้อความคนนี้ให้แล้ว)'
      : res?.reason === 'offline' ? 'ต้องเข้าสู่ระบบก่อนถึงจะส่งรายงานได้ — ซ่อนข้อความคนนี้ให้แล้วนะ'
        : 'ส่งรายงานไม่สำเร็จ ลองใหม่ภายหลังนะ (ซ่อนข้อความคนนี้ให้แล้ว)');
  });
  box.append(hide, rep);
  li.after(box);
}
function block(r) {
  blocked.add(blockKey(r));
  saveBlocked();
  bubbles.delete(r.id);
  renderLog();
}

/** มือถือ: คีย์บอร์ดขึ้น = ยกแผงขึ้นพ้นคีย์บอร์ด (visualViewport) */
function fitKeyboard() {
  const vv = window.visualViewport;
  const el = $('chatPanel');
  if (!vv || !open) return;
  const hidden = window.innerHeight - vv.height - vv.offsetTop;   // ส่วนที่คีย์บอร์ดบัง
  el.style.bottom = hidden > 40 ? `${Math.round(hidden + 8)}px` : '';
  el.classList.toggle('kb', hidden > 40);
}

/** ต่อแผงแชตกับเกม — เรียกครั้งเดียว */
export function initChat(a) {
  api = a;
  const pP = $('chatPaneP');
  for (const p of PRESETS) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chat-chip'; b.textContent = p.text;
    b.addEventListener('click', () => { api.send('p', p.id); closeChat(); });   // แตะครั้งเดียวจบ
    pP.append(b);
  }
  const pS = $('chatPaneS');
  for (const s of STICKERS) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chat-stk'; b.setAttribute('aria-label', 'สติกเกอร์' + s.name);
    b.append(stickerCanvas(s.id, 40));
    b.addEventListener('click', () => { api.send('s', s.id); closeChat(); });
    pS.append(b);
  }
  const tool = (k) => () => { pick = pick === k ? null : k; paintChat(); };
  $('chatToolP').addEventListener('click', tool('p'));
  $('chatToolS').addEventListener('click', tool('s'));
  const input = $('chatText');
  const count = () => { $('chatSend').disabled = !input.value.trim(); };
  input.addEventListener('input', count);
  input.addEventListener('focus', () => { if (pick) { pick = null; paintChat(); } setTimeout(fitKeyboard, 250); });
  input.addEventListener('blur', () => setTimeout(fitKeyboard, 250));
  $('chatForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    api.send('x', v);
    input.value = '';
    count();
  });
  count();
  $('chatX').addEventListener('click', closeChat);
  $('btnChat')?.addEventListener('click', () => toggleChat());
  $('chatPeek')?.addEventListener('click', () => toggleChat(true));
  $('chatLock')?.addEventListener('click', () => api.toast(NO.member));
  window.visualViewport?.addEventListener('resize', fitKeyboard);
  window.visualViewport?.addEventListener('scroll', fitKeyboard);
}
