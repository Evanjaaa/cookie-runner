// src/catcards-ui.js
// ─────────────────────────────────────────────────────────────
// การ์ดส่งต่อน้อง — หาบ้านใหม่ให้ลูกแมว (Lv1-2) กับเพื่อน
//
// ── เรื่องของระบบ ──
// บ้านจุน้องได้จำกัด (ห้อง 3 + กล่องหน้าประตู 1) ลูกแมวที่ยังเล็กส่งการ์ดหาบ้านใหม่กับเพื่อนได้
// เพื่อนไปเยี่ยมดูน้องในบ้านเราก่อน แล้วค่อยกดรับ → เรายืนยัน (หรือตั้งส่งให้อัตโนมัติไว้)
// → น้องย้ายไปบ้านเพื่อน เริ่มนับการเลี้ยงใหม่กับเจ้าของใหม่ · การ์ดหมดอายุใน 3 วัน
// บ้านผู้รับเต็มอยู่ = กดรับไม่ได้
//
// ── ข้อมูลอยู่ที่ไหน ──
// การ์ดอยู่บนเซิร์ฟเวอร์ (supabase/cat_cards.sql) / น้องอยู่ในเครื่อง (cats.js)
// sync() คือตัวเดียวที่เอาสองฝั่งมาตรงกัน: การ์ดที่ส่งสำเร็จ → เอาน้องออกจากบ้านผู้ส่ง
// / การ์ดที่ถึงเรา → สร้างน้องในบ้านเรา (กันรับซ้ำด้วย got ใน cats.js)
// ทุกปุ่มในหน้านี้เรียก sync() ต่อท้าย ข้อมูลจึงไม่ค้างครึ่ง ๆ กลาง ๆ แม้เน็ตหลุดกลางทาง
// ─────────────────────────────────────────────────────────────
import {
  reloadCats, allCats, catById, canSend, cardSnapshot, setCard, handOver, receiveCat, cardReceived,
  homeFull, levelOf, nameOf, fosterCats, SEND_MAX_LV,
} from './cats.js';
import { catSkin, skinById } from './skins.js';
import { drawCatFace } from './render/entities.js';
import { reasonText } from './friends.js';
import * as cloud from './net/cloud.js';
import { t } from './i18n.js';

const $ = (id) => document.getElementById(id);

/** เหตุผลที่ทำไม่สำเร็จ → ข้อความ (ที่ไม่ใช่ของการ์ดใช้ข้อความของระบบเพื่อน) */
function cardReason(reason) {
  switch (reason) {
    case 'notfriend': return 'ส่งการ์ดได้เฉพาะเพื่อนแมวเท่านั้น';
    case 'dup': return 'น้องตัวนี้มีการ์ดส่งต่อค้างอยู่แล้ว';
    case 'limit': return 'ส่งการ์ดค้างไว้เยอะแล้ว รอเพื่อนตอบก่อนนะ';
    case 'bad': return `ส่งต่อได้เฉพาะลูกแมว Lv1-${SEND_MAX_LV}`;
    case 'gone': return 'การ์ดใบนี้ถูกยกเลิกหรือตอบไปแล้ว';
    case 'expired': return 'การ์ดใบนี้หมดอายุแล้ว';
    case 'full': return 'บ้านเต็มแล้ว รับน้องเพิ่มไม่ได้';
    case 'schema': return 'ระบบการ์ดส่งต่อยังไม่พร้อม (ยังไม่ได้ตั้งค่าฐานข้อมูล)';
    default: return reasonText(reason);
  }
}

/** เวลาที่เหลือก่อนการ์ดหมดอายุ */
function leftText(until) {
  const ms = Date.parse(until) - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 'หมดอายุแล้ว';
  const h = Math.floor(ms / 3600000);
  if (h >= 24) return `เหลือ ${Math.floor(h / 24)} วัน`;
  if (h >= 1) return `เหลือ ${h} ชม.`;
  return `เหลือ ${Math.max(1, Math.floor(ms / 60000))} นาที`;
}

export function setupCatCardsUI(deps) {
  const { sfx, unlockAudio, paintMini, catRoomUI, refreshHome, publishHome } = deps;

  // ทางเชื่อมคลาวด์ — ตอนพัฒนาสลับเป็นข้อมูลปลอมได้ผ่าน window.__cards (ไม่ต้องมีสองบัญชีจริง)
  let api = {
    fetchCatCards: cloud.fetchCatCards, sendCatCard: cloud.sendCatCard, respondCatCard: cloud.respondCatCard,
    confirmCatCard: cloud.confirmCatCard, cancelCatCard: cloud.cancelCatCard, claimCatCard: cloud.claimCatCard,
    fetchFriends: cloud.fetchFriends, fetchProfileById: cloud.fetchProfileById,
  };

  let list = [];              // การ์ดล่าสุดจากเซิร์ฟเวอร์
  let loaded = false;
  let reason = null;          // อ่านการ์ดไม่ได้เพราะอะไร (null = อ่านได้)
  let friendCount = 0;        // มีเพื่อนให้ส่งต่อไหม (บ้านเต็มแล้วยังเจอกล่องได้ถ้ามี)
  let tab = 'in';
  let busy = false;
  let syncing = null;
  const gifts = [];           // น้องที่เพิ่งได้จากการ์ด รอโชว์หน้า "น้องมาถึงบ้านแล้ว!"

  // ─────────────────────────────────────────────────────────
  // ซิงก์การ์ด ↔ น้องในบ้าน
  // ─────────────────────────────────────────────────────────

  /**
   * อ่านการ์ดใหม่แล้วจัดน้องในบ้านให้ตรง — เรียกซ้อนกันได้
   * เรียกตอนรอบเก่ายังวิ่งอยู่ = นัดรอบใหม่ต่อท้าย ไม่ใช่ใช้ผลรอบเก่า: รอบเก่าอาจอ่านก่อนเรากดส่งการ์ด
   * แล้วล้างป้ายการ์ดที่เพิ่งติดให้น้องทิ้ง (น้องจะกดส่งซ้ำได้แล้วโดนเซิร์ฟเวอร์ตอบ dup)
   */
  let again = false;
  function sync() {
    if (syncing) { again = true; return syncing; }
    syncing = doSync().finally(() => {
      syncing = null;
      if (again) { again = false; sync(); }
    });
    return syncing;
  }

  async function doSync() {
    reloadCats();
    const watch = allCats().map((c) => c.card?.id).filter(Boolean);
    const [r, f] = await Promise.all([api.fetchCatCards(watch), api.fetchFriends()]);
    if (f.ok) friendCount = f.friends.length;
    if (!r.ok) {
      reason = r.reason;
      loaded = true;
      paint();
      return;
    }
    reason = null;
    loaded = true;
    list = r.cards;
    reloadCats();
    let changed = false;

    // ── ขาออก: ไล่จากเก่าไปใหม่ ใบใหม่สุดของน้องแต่ละตัวเป็นตัวตัดสิน ──
    const live = new Map();   // cat_id → การ์ดที่ยังค้าง
    for (const c of [...list].reverse()) {
      if (c.dir !== 'out') continue;
      if (c.status === 'open' || c.status === 'accepted') {
        live.set(c.cat_id, c);
      } else if (c.status === 'done' || c.status === 'claimed') {
        live.delete(c.cat_id);
        // ย้ายบ้านสำเร็จ — เอาน้องออกจากบ้านเรา
        if (catById(c.cat_id) && handOver(c.cat_id)) changed = true;
      } else {
        live.delete(c.cat_id);
      }
    }
    for (const cat of allCats()) {
      const c = live.get(cat.id);
      const want = c ? { id: c.id, to: c.to_id, toName: c.to_name || '', until: c.expires_at, status: c.status } : null;
      if (JSON.stringify(cat.card || null) !== JSON.stringify(want)) {
        setCard(cat.id, want);
        changed = true;
      }
    }

    // ── ขาเข้า: การ์ดที่ส่งสำเร็จแล้ว = รับน้องเข้าบ้าน ──
    for (const c of [...list].reverse()) {
      if (c.dir === 'in' && c.status === 'done' && cardReceived(c.id)) { api.claimCatCard(c.id); continue; }
      if (c.dir !== 'in' || (c.status !== 'done' && c.status !== 'claimed') || cardReceived(c.id)) continue;
      const got = receiveCat(c.id, c.cat, c.from_name);
      if (!got || got === 'full') continue;
      changed = true;
      gifts.push(got.id);
      if (c.status === 'done') api.claimCatCard(c.id);   // บอกเซิร์ฟเวอร์ว่ารับแล้ว (ซ้ำได้ ไม่เป็นไร)
    }

    if (changed) {
      catRoomUI.refresh();
      refreshHome();
      publishHome();
    }
    catRoomUI.refreshDot();
    paint();
    showGift();
  }

  /** โชว์น้องที่เพิ่งมาถึงทีละตัว (ระหว่างวิ่งไม่โชว์ — รอกลับมาหน้าอื่นก่อน) */
  function showGift() {
    if (!gifts.length || !$('foundPanel').classList.contains('hidden')) return;
    // หน้าการ์ดเปิดอยู่ = รอปิดก่อน (หน้าพบน้องอยู่ชั้นล่างกว่า จะโดนบังมิด) — close() เรียกซ้ำให้
    if (!panel.classList.contains('hidden') || !sendPanel.classList.contains('hidden')) return;
    if ($('startPanel').classList.contains('hidden') && !catRoomUI.isOpen()) return;
    const id = gifts.shift();
    if (!catById(id)) return;
    sfx.mew();
    catRoomUI.openFound(id, 'gift');
  }

  /** การ์ดที่รอเราทำอะไรสักอย่าง: เพื่อนส่งมา (รอตอบ) / เพื่อนกดรับน้องเรา (รอยืนยัน) / บ้านเต็มรับไม่ได้ */
  function pendingCount() {
    let n = 0;
    for (const c of list) {
      if (c.dir === 'in' && c.status === 'open') n++;
      else if (c.dir === 'out' && c.status === 'accepted') n++;
      else if (c.dir === 'in' && c.status === 'done' && !cardReceived(c.id)) n++;
    }
    return n;
  }

  /** ข้อความใต้การ์ดน้องในห้อง ตอนน้องมีการ์ดค้างอยู่ */
  function noteFor(cat) {
    const k = cat.card;
    if (!k) return '';
    const who = k.toName || 'เพื่อน';
    if (k.status === 'accepted') return `${who} อยากรับน้องแล้ว! ยืนยันได้ที่การ์ดส่งต่อ`;
    return `ส่งการ์ดถึง ${who} แล้ว รอตอบอยู่ · ${leftText(k.until)}`;
  }

  // ─────────────────────────────────────────────────────────
  // หน้าการ์ดส่งต่อ (ถึงเรา / ที่ส่งไป)
  // ─────────────────────────────────────────────────────────

  const panel = $('catCardsPanel');

  function open(which = null) {
    if (which) tab = which;
    else if (list.some((c) => c.dir === 'out' && c.status === 'accepted')
      && !list.some((c) => c.dir === 'in' && c.status === 'open')) tab = 'out';
    panel.classList.remove('hidden');
    say('');
    paint();
    sync();
  }

  function close() {
    panel.classList.add('hidden');
    showGift();
  }

  $('ccClose').addEventListener('click', () => { unlockAudio(); sfx.fish(); close(); });
  for (const b of document.querySelectorAll('#ccTabs .fchip')) {
    b.addEventListener('click', () => {
      unlockAudio();
      sfx.fish();
      tab = b.dataset.tab;
      paint();
    });
  }

  let sayTimer = 0;
  function say(text, bad = false) {
    const el = $('ccMsg');
    el.textContent = text ? t(text) : '';
    el.classList.toggle('bad', bad);
    clearTimeout(sayTimer);
    if (text) sayTimer = setTimeout(() => { el.textContent = ''; }, 4000);
  }

  function paint() {
    catRoomUI.paintBadge();
    catRoomUI.refreshDot();
    if (panel.classList.contains('hidden')) return;
    for (const b of document.querySelectorAll('#ccTabs .fchip')) {
      const on = b.dataset.tab === tab;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    }
    const inN = list.filter((c) => c.dir === 'in' && (c.status === 'open' || (c.status === 'done' && !cardReceived(c.id)))).length;
    const outN = list.filter((c) => c.dir === 'out' && c.status === 'accepted').length;
    $('ccInNum').textContent = inN ? String(inN) : '';
    $('ccInNum').classList.toggle('hidden', !inN);
    $('ccOutNum').textContent = outN ? String(outN) : '';
    $('ccOutNum').classList.toggle('hidden', !outN);

    const box = $('ccList');
    box.innerHTML = '';
    if (!loaded) { note(box, 'กำลังโหลด…'); return; }
    if (reason) { note(box, cardReason(reason)); return; }
    const rows = list.filter((c) => c.dir === tab);
    if (!rows.length) {
      note(box, tab === 'in'
        ? 'ยังไม่มีการ์ดส่งต่อถึงเรา'
        : 'ยังไม่ได้ส่งการ์ดหาบ้านให้น้องตัวไหน ลูกแมว Lv1-2 กดส่งต่อได้ที่การ์ดน้องในบ้าน', '📭');
      return;
    }
    paintRows(box, rows);
  }

  function note(box, text, icon = '') {
    const p = document.createElement('p');
    p.className = 'grid-empty cc-empty';
    if (icon) {
      const i = document.createElement('span');
      i.className = 'cc-empty-ico';
      i.setAttribute('aria-hidden', 'true');
      i.textContent = icon;
      p.appendChild(i);
    }
    p.append(t(text));
    box.appendChild(p);
  }

  /** การ์ดที่ยังรอใครสักคนทำอะไร (ขึ้นก่อน) / ที่จบแล้ว (ขึ้นท้าย ใต้เส้นคั่น) */
  const isLive = (c) => c.status === 'open' || c.status === 'accepted'
    || (c.dir === 'in' && c.status === 'done' && !cardReceived(c.id));

  function paintRows(box, rows) {
    const live = rows.filter(isLive);
    const past = rows.filter((c) => !isLive(c));
    for (const c of live) box.appendChild(cardRow(c));
    if (past.length) {
      const h = document.createElement('p');
      h.className = 'cc-sep';
      h.textContent = t('การ์ดที่จบแล้ว');
      box.appendChild(h);
      for (const c of past) box.appendChild(cardRow(c));
    }
  }

  /**
   * การ์ดหนึ่งใบ = โปสการ์ด: แสตมป์รูปน้อง · ชื่อ/ป้ายสายพันธุ์/เลเวล · จากใคร-ถึงใคร · ป้ายสถานะ
   * · ตราประทับเวลาที่เหลือมุมขวาบน · ปุ่มมุมขวาล่าง
   */
  function cardRow(c) {
    const snap = c.cat || {};
    const row = document.createElement('div');
    row.className = `cc-card ${c.dir} ${c.status}` + (isLive(c) ? ' live' : '');

    const stamp = document.createElement('div');
    stamp.className = 'cc-stamp';
    const face = document.createElement('canvas');
    const skin = catSkin({ ...snap, exp: 0 });
    paintMini(face, 64, (g) => drawCatFace(g, 32, 37, 1.55, skin, { mood: 'happy' }));
    stamp.appendChild(face);

    const body = document.createElement('div');
    body.className = 'cc-body';
    const top = document.createElement('div');
    top.className = 'cc-top';
    const name = document.createElement('b');
    name.className = 'cc-name';
    name.textContent = snap.name || nameOf(null);
    const sex = document.createElement('i');
    sex.className = 'cc-sex ' + (snap.sex === 'm' ? 'm' : 'f');
    sex.textContent = snap.sex === 'm' ? '♂' : '♀';
    const breed = document.createElement('span');
    breed.className = 'cc-tag';
    breed.textContent = skinById(snap.breed).name;
    const lv = document.createElement('span');
    lv.className = 'cc-tag lv';
    lv.textContent = 'Lv.' + (snap.lv || 1);
    top.append(name, sex, breed, lv);
    const who = document.createElement('small');
    who.className = 'cc-who';
    who.textContent = c.dir === 'in' ? `จาก ${c.from_name || 'เพื่อน'}` : `ถึง ${c.to_name || 'เพื่อน'}`;
    const pill = document.createElement('span');
    pill.className = 'cc-pill';
    pill.textContent = statusText(c);
    body.append(top, who, pill);

    const side = document.createElement('div');
    side.className = 'cc-side';
    const mark = document.createElement('span');
    mark.className = 'cc-mark';
    mark.textContent = markText(c);
    side.appendChild(mark);
    const acts = document.createElement('div');
    acts.className = 'cc-acts';
    for (const a of actionsFor(c)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cc-btn ' + (a.kind || 'soft');
      btn.textContent = t(a.text);
      btn.disabled = busy || !!a.disabled;
      btn.addEventListener('click', () => { unlockAudio(); sfx.fish(); a.run(); });
      acts.appendChild(btn);
    }
    if (acts.children.length) side.appendChild(acts);
    row.append(stamp, body, side);
    return row;
  }

  /** ตราประทับมุมการ์ด — การ์ดที่ยังค้าง = เวลาที่เหลือ / จบแล้ว = ผลลัพธ์สั้น ๆ */
  function markText(c) {
    if (c.status === 'open' || c.status === 'accepted') return leftText(c.expires_at);
    if (c.status === 'done' || c.status === 'claimed') return 'ถึงบ้านแล้ว';
    if (c.status === 'expired') return 'หมดอายุ';
    return 'ยกเลิก';
  }

  function statusText(c) {
    const inbound = c.dir === 'in';
    switch (c.status) {
      // บ้านเต็ม = ปุ่มรับน้องกดไม่ได้ — บอกเหตุผลตรงนี้ (มือถือไม่มี tooltip ให้อ่าน)
      case 'open': return inbound
        ? (homeFull() ? 'บ้านเต็มอยู่ ทำที่ว่างก่อนถึงจะรับน้องได้' : 'อยากหาบ้านใหม่ให้น้อง')
        : 'รอเพื่อนตอบ';
      case 'accepted': return inbound
        ? `รอ ${c.from_name || 'เพื่อน'} ยืนยันส่งน้อง`
        : `${c.to_name || 'เพื่อน'} อยากรับน้องแล้ว!`;
      case 'done':
        if (!inbound) return 'น้องย้ายไปบ้านใหม่แล้ว';
        return cardReceived(c.id) ? 'น้องมาอยู่บ้านเราแล้ว' : 'น้องรอเข้าบ้านอยู่ — บ้านเต็ม ทำที่ว่างก่อนนะ';
      case 'claimed': return inbound ? 'น้องมาอยู่บ้านเราแล้ว' : 'น้องถึงบ้านใหม่เรียบร้อย';
      case 'declined': return inbound ? 'ไม่ได้รับน้อง' : 'เพื่อนยังรับน้องไม่ได้ น้องอยู่กับเราต่อ';
      case 'cancelled': return inbound ? 'การ์ดถูกยกเลิกแล้ว' : 'ยกเลิกการ์ดแล้ว';
      case 'expired': return 'การ์ดหมดอายุแล้ว';
      default: return '';
    }
  }

  function actionsFor(c) {
    if (c.dir === 'in') {
      if (c.status === 'open') {
        const full = homeFull();
        return [
          { text: 'รับน้อง', kind: 'yes', disabled: full, run: () => respond(c, true) },
          { text: 'ไปดูน้อง', kind: 'soft', run: () => visitSender(c) },
          { text: 'ไม่รับ', kind: 'warn', run: () => respond(c, false) },
        ];
      }
      if (c.status === 'accepted') return [{ text: 'ไปดูน้อง', kind: 'soft', run: () => visitSender(c) }];
      return [];
    }
    if (c.status === 'open') return [{ text: 'ยกเลิกการ์ด', kind: 'warn', run: () => cancel(c) }];
    if (c.status === 'accepted') {
      return [
        { text: 'ยืนยันส่งน้อง', kind: 'yes', run: () => confirm(c) },
        { text: 'ยกเลิก', kind: 'warn', run: () => cancel(c) },
      ];
    }
    return [];
  }

  /** ทุกปุ่ม: ล็อกปุ่ม → เรียกเซิร์ฟเวอร์ → บอกผล → ซิงก์ใหม่ทั้งชุด */
  async function act(fn, ok) {
    if (busy) return;
    busy = true;
    paint();
    const r = await fn();
    busy = false;
    if (r.ok) ok(r);
    else { sfx.upFail?.(); say(cardReason(r.reason), true); }
    await sync();
  }

  function respond(c, accept) {
    if (accept && homeFull()) { say(cardReason('full'), true); return; }
    act(() => api.respondCatCard(c.id, accept), (r) => {
      const name = c.cat?.name || 'น้อง';
      if (r.result === 'declined') say(`ไม่ได้รับ${name}`);
      else if (r.result === 'done') { sfx.cheer?.(); say(`${name}กำลังมาที่บ้านเราแล้ว!`); }
      else { sfx.potion?.(); say(`รับ${name}แล้ว รอ ${c.from_name || 'เพื่อน'} ยืนยันนะ`); }
    });
  }

  function confirm(c) {
    act(() => api.confirmCatCard(c.id), () => {
      sfx.cheer?.();
      say(`ส่ง${c.cat?.name || 'น้อง'}ไปบ้านใหม่แล้ว ขอให้มีความสุขนะ`);
    });
  }

  function cancel(c) {
    act(() => api.cancelCatCard(c.id), () => say('ยกเลิกการ์ดแล้ว น้องอยู่กับเราต่อนะ'));
  }

  /** ไปดูน้องในการ์ดที่บ้านเพื่อน (ดูอย่างเดียว) — กดกลับแล้วมาหน้านี้ */
  async function visitSender(c) {
    if (busy) return;
    busy = true;
    paint();
    const r = await api.fetchProfileById(c.from_id);
    busy = false;
    paint();
    const home = r.ok ? (r.profile.public_profile?.home || []) : [];
    // บ้านเพื่อนยังไม่เคยขึ้นโปรไฟล์ (เพื่อนยังไม่ได้อัปเดตเกม) — ใช้น้องในการ์ดแทน
    const cats = home.some((x) => x.id === c.cat_id) ? home : [...home, { ...c.cat, wait: false, card: true }];
    close();
    catRoomUI.openVisit({
      name: c.from_name || (r.ok && r.profile.name) || 'เพื่อน',
      cats,
      focus: c.cat_id,
      back: () => open('in'),
    });
  }

  /** เยี่ยมบ้านเพื่อน (จากหน้าเพื่อน/โปรไฟล์) */
  function visitFriend(profileRow, back = null) {
    const home = profileRow?.public_profile?.home || [];
    catRoomUI.openVisit({ name: profileRow?.name || 'เพื่อน', cats: home, back });
  }

  // ─────────────────────────────────────────────────────────
  // ส่งการ์ด
  // ─────────────────────────────────────────────────────────

  const sendPanel = $('catSendPanel');
  let sendCatId = null;
  let sendTo = null;

  async function openSend(catId) {
    reloadCats();
    const cat = catById(catId);
    if (!cat) return;
    if (!canSend(cat)) {
      catRoomUI.toast(cat.card ? cardReason('dup') : cardReason('bad'));
      return;
    }
    sendCatId = catId;
    sendTo = null;
    $('csAuto').checked = false;
    $('csMsg').textContent = '';
    $('csName').textContent = nameOf(cat);
    $('csSub').textContent = `${skinById(cat.breed).name} · ${cat.sex === 'm' ? '♂ ตัวผู้' : '♀ ตัวเมีย'} · Lv.${levelOf(cat)}`;
    paintMini($('csFace'), 96, (g) => drawCatFace(g, 48, 55, 2.45, catSkin(cat), { mood: 'happy' }));
    sendPanel.classList.remove('hidden');
    paintFriends(null);
    const r = await api.fetchFriends();
    if (sendCatId !== catId) return;
    if (r.ok) friendCount = r.friends.length;
    paintFriends(r);
  }

  function paintFriends(r) {
    const box = $('csFriends');
    box.innerHTML = '';
    $('csGo').disabled = true;
    if (!r) { note(box, 'กำลังโหลดรายชื่อเพื่อน…'); return; }
    if (!r.ok) { note(box, cardReason(r.reason)); return; }
    if (!r.friends.length) { note(box, 'ยังไม่มีเพื่อนแมว เพิ่มเพื่อนได้ที่หน้าเพื่อนก่อนนะ'); return; }
    for (const f of r.friends) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cs-friend';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      const face = document.createElement('canvas');
      const snap = f.public_profile || {};
      paintMini(face, 44, (g) => drawCatFace(g, 22, 25, 1.05, { ...skinById(snap.skin), noPhoto: true }));
      const name = document.createElement('b');
      name.textContent = f.name || 'เพื่อน';
      const tick = document.createElement('i');
      tick.className = 'cs-tick';
      tick.setAttribute('aria-hidden', 'true');
      tick.textContent = '✓';
      b.append(face, name, tick);
      b.addEventListener('click', () => {
        unlockAudio();
        sfx.fish();
        sendTo = { id: f.id, name: f.name || 'เพื่อน' };
        for (const x of box.querySelectorAll('.cs-friend')) {
          const on = x === b;
          x.classList.toggle('on', on);
          x.setAttribute('aria-checked', String(on));
        }
        $('csGo').disabled = false;
      });
      box.appendChild(b);
    }
  }

  function closeSend() {
    sendPanel.classList.add('hidden');
    sendCatId = null;
    showGift();
  }

  $('csClose').addEventListener('click', () => { unlockAudio(); sfx.fish(); closeSend(); });
  $('csGo').addEventListener('click', async () => {
    unlockAudio();
    const cat = catById(sendCatId);
    if (!cat || !sendTo || busy) return;
    busy = true;
    $('csGo').disabled = true;
    $('csMsg').textContent = t('กำลังส่ง…');
    const r = await api.sendCatCard(sendTo.id, cardSnapshot(cat), $('csAuto').checked);
    busy = false;
    if (!r.ok) {
      sfx.upFail?.();
      $('csMsg').textContent = t(cardReason(r.reason));
      $('csGo').disabled = false;
      return;
    }
    // จำการ์ดไว้กับน้องทันที ไม่ต้องรอซิงก์ (หน้าห้องจะได้ขึ้นป้ายเลย)
    setCard(cat.id, { id: r.id, to: sendTo.id, toName: sendTo.name, until: new Date(Date.now() + 3 * 86400000).toISOString(), status: 'open' });
    sfx.potion?.();
    const done = `ส่งการ์ดหาบ้านใหม่ถึง ${sendTo.name} แล้ว`;
    catRoomUI.refresh();
    publishHome();
    sync();
    if (catRoomUI.isOpen()) {
      closeSend();
      catRoomUI.toast(done);
    } else {
      // ส่งจากหน้าพบน้อง ห้องยังไม่เปิด — ป้ายในห้องมองไม่เห็น บอกในหน้านี้แล้วค่อยปิดเอง
      $('csMsg').textContent = t(done);
      setTimeout(() => { if (!sendCatId || sendCatId === cat.id) closeSend(); }, 1600);
    }
  });

  // ซิงก์ตอนเปิดเกม (รอเข้าสู่ระบบก่อน) ทุกสองนาที และตอนกลับมาที่แท็บ — การ์ดจากเพื่อนจะได้ไม่ค้าง
  setTimeout(sync, 5000);
  setInterval(() => { if (!document.hidden) sync(); }, 2 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });

  const ui = {
    sync, open, close, openSend, visitFriend, pendingCount, noteFor, showGift,
    // บ้านเราเปลี่ยน (ออกจากห้อง / พบน้องใหม่) — อัปเดตโปรไฟล์ให้เพื่อนที่มาเยี่ยมเห็นตรง
    // publishProfile ส่งเฉพาะตอนเนื้อหาเปลี่ยนจริง เรียกบ่อยได้
    publish: () => publishHome(),
    canRehome: () => friendCount > 0,
    hasFoster: () => fosterCats().length > 0,
  };
  if (import.meta.env.DEV) {
    window.__cards = { ui, room: catRoomUI, setApi: (a) => { api = { ...api, ...a }; }, get list() { return list; } };
  }
  return ui;
}
