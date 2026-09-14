// src/talent-ui.js
//
// ══ หน้าพรสวรรค์ (Talent Card) ═══════════════════════════════════
//
// หน้าจอล้วน ๆ — ข้อมูลการ์ดมาจาก talents.js ส่วนผลระหว่างวิ่งอยู่ใน talent-run.js
// ติดตั้ง/ถอดที่นี่ = บันทึกลงเครื่อง (ซิงก์ขึ้นคลาวด์ให้เอง) แล้วมีผลตั้งแต่ตาถัดไปที่เริ่มวิ่ง

import {
  TALENTS, TYPE_LABEL, talentById, getEquippedTalent, setEquippedTalent, isUnlocked, secText,
} from './talents.js';

/**
 * ระดับของพรสวรรค์
 *
 * บอกระดับด้วยหลายชั้นพร้อมกัน ไม่ใช่สีอย่างเดียว (คนตาบอดสีต้องแยกได้ด้วย):
 *   ตราเหรียญ  — ตัวอักษร A / S / SS อ่านได้ตรง ๆ (รูปใน public/ ชุดเดียวกับตราของชุดแมว)
 *   ขอบการ์ด   — A ขอบม่วงเรียบ / S ขอบทอง / SS ขอบไล่สีรุ้ง
 *   ลายพื้นรูป — A พื้นเรียบ / S แสงทองจาง ๆ / SS จุดประกายเล็ก ๆ
 *   แสงเรือง   — มีเฉพาะ SS และเต้นเบา ๆ
 */
export const RANKS = {
  A: { label: 'A', name: 'พื้นฐาน', sign: 'sign-a.png' },
  S: { label: 'S', name: 'หายาก', sign: 'sign-s.png' },
  SS: { label: 'SS', name: 'หายากที่สุด', sign: 'sign-ss.png' },
};

/**
 * ผูกหน้าพรสวรรค์เข้ากับ DOM
 *
 * รับของที่ต้องใช้จาก main.js เข้ามาแทนการ import เอง (เสียง ตัวช่วยเลื่อน การกลับหน้าแรก)
 * ไฟล์นี้จึงไม่ต้องรู้จักโครงสร้างอื่นของเกมเลย
 *
 * @returns {{ open: () => void }}
 */
export function setupTalentUI({ panel, sfx, unlockAudio, markScrollable, onBack }) {
  const $ = (sel) => panel.querySelector(sel);
  const grid = $('#tlGrid');
  const detail = $('#tlDetail');
  const equipBtn = $('#tldEquip');
  const signUrl = (rank) => import.meta.env.BASE_URL + RANKS[rank].sign;

  const state = {
    filter: 'all',
    selected: null,       // ใบที่เลือกดูอยู่ (มีกรอบครีม)
    lastFocus: null,      // คืนโฟกัสให้การ์ดใบเดิมหลังปิดหน้ารายละเอียด
  };
  // อ่านสดจากที่บันทึกทุกครั้ง ไม่เก็บสำเนาไว้ — จะได้ไม่มีทางหลุดจากของจริง
  const equippedId = () => (getEquippedTalent() || {}).id || null;

  // ── ส่วนประกอบที่ใช้ร่วมระหว่างการ์ด ช่องใช้งานอยู่ และหน้ารายละเอียด ──

  /** รูปของพรสวรรค์ — รูปจริงถ้ามี ไม่งั้นอิโมจิ */
  function artNode(t) {
    if (t.art) {
      const img = document.createElement('img');
      img.className = 'tl-ico-img';
      img.src = import.meta.env.BASE_URL + t.art;
      img.alt = '';
      return img;
    }
    const span = document.createElement('span');
    span.className = 'tl-ico';
    span.textContent = t.icon;
    return span;
  }

  function rankSign(rank, cls) {
    const img = document.createElement('img');
    img.className = cls;
    img.src = signUrl(rank);
    img.alt = 'ระดับ ' + RANKS[rank].label;
    return img;
  }

  /** ตัวเลขเวลาสั้น ๆ บนการ์ด — มีเฉพาะใบที่มีคูลดาวน์ */
  function coolText(t) {
    return t.cooldown ? '⏱ ' + Math.round(t.cooldown / 60) + ' วิ' : '';
  }

  // ── การ์ดหนึ่งใบ ──

  function card(t, i) {
    const got = isUnlocked(t);
    const on = t.id === equippedId();

    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'tl-card rank-' + t.rank.toLowerCase()
      + (got ? '' : ' locked') + (on ? ' equipped' : '') + (t.id === state.selected ? ' sel' : '');
    el.dataset.id = t.id;
    el.setAttribute('role', 'listitem');
    el.setAttribute('aria-label', `${t.name} ระดับ ${t.rank}${on ? ' ใช้งานอยู่' : ''}${got ? '' : ' ยังไม่เปิดใช้'}`);
    // ลำดับหน่วงของแอนิเมชันตอนเข้า — ตัดที่ 12 ใบ ใบท้าย ๆ จะได้ไม่ต้องรอนานจนดูช้า
    el.style.setProperty('--i', Math.min(i, 12));

    const art = document.createElement('span');
    art.className = 'tl-card-art';
    art.appendChild(artNode(t));

    const name = document.createElement('b');
    name.className = 'tl-card-name';
    name.textContent = t.name;

    const desc = document.createElement('small');
    desc.className = 'tl-card-desc';
    desc.textContent = t.short;

    el.append(art, rankSign(t.rank, 'tl-card-rank'), name, desc);

    const cd = coolText(t);
    if (cd && got) {
      const c = document.createElement('span');
      c.className = 'tl-cool';
      c.textContent = cd;
      el.appendChild(c);
    }

    if (on) {
      const tag = document.createElement('span');
      tag.className = 'tl-tag on';
      tag.textContent = '✓ ใช้งานอยู่';
      el.appendChild(tag);
    } else if (!got) {
      const tag = document.createElement('span');
      tag.className = 'tl-tag lock';
      tag.textContent = '🔒 เร็ว ๆ นี้';
      el.appendChild(tag);
    }

    el.addEventListener('click', () => {
      unlockAudio();
      sfx.fish();
      openDetail(t.id, el);
    });
    return el;
  }

  function renderGrid() {
    const list = state.filter === 'all' ? TALENTS : TALENTS.filter((t) => t.rank === state.filter);
    grid.replaceChildren(...list.map(card));
    if (!list.length) {
      const p = document.createElement('p');
      p.className = 'grid-empty';
      p.textContent = 'ยังไม่มีพรสวรรค์ระดับนี้';
      grid.appendChild(p);
    }
    markScrollable(grid);
  }

  // ── ช่อง "ใช้งานอยู่" ด้านซ้าย ──

  function renderSide() {
    $('#tlOwned').textContent = TALENTS.filter(isUnlocked).length;
    $('#tlTotal').textContent = TALENTS.length;

    const t = getEquippedTalent();
    const box = $('#tlEquipped');
    box.className = 'tl-equipped' + (t ? ' rank-' + t.rank.toLowerCase() : ' empty');
    box.replaceChildren();
    if (!t) {
      const p = document.createElement('span');
      p.className = 'tl-equipped-empty';
      p.textContent = 'ยังไม่ได้ติดตั้ง';
      box.appendChild(p);
      box.setAttribute('aria-label', 'ยังไม่ได้ติดตั้งพรสวรรค์');
      return;
    }
    const art = document.createElement('span');
    art.className = 'tl-card-art';
    art.appendChild(artNode(t));
    const name = document.createElement('b');
    name.className = 'tl-card-name';
    name.textContent = t.name;
    const desc = document.createElement('small');
    desc.className = 'tl-card-desc';
    desc.textContent = t.howTo;
    box.append(art, rankSign(t.rank, 'tl-card-rank'), name, desc);
    box.setAttribute('aria-label', 'ใช้งานอยู่: ' + t.name + ' ดูรายละเอียด');
  }

  // ── หน้ารายละเอียด ──
  //
  // เปิดเป็นแผ่นซ้อนในการ์ดเดิม (ท่าเดียวกับกล่องผลสุ่มในตู้กาช่า) ไม่ได้สลับไปอีกแผง
  // ผู้เล่นจึงยังเห็นกริดจาง ๆ อยู่ข้างหลัง รู้ตัวว่ายังอยู่หน้าเดิม ปิดแล้วกลับที่เดิมทันที

  function metaChip(text, cls = '') {
    const s = document.createElement('span');
    s.className = 'tl-meta-chip ' + cls;
    s.textContent = text;
    return s;
  }

  function paintDetail() {
    const t = talentById(state.selected);
    if (!t) return;
    const got = isUnlocked(t);
    const on = t.id === equippedId();
    const cur = getEquippedTalent();

    const sheet = $('.tl-sheet');
    sheet.className = 'tl-sheet rank-' + t.rank.toLowerCase() + (got ? '' : ' locked');

    $('#tldArt').replaceChildren(artNode(t), rankSign(t.rank, 'tl-sheet-rank'));
    $('#tldRank').textContent = `ระดับ ${RANKS[t.rank].label} · ${RANKS[t.rank].name}`;
    $('#tldName').textContent = t.name;
    $('#tldDesc').textContent = t.desc;

    // แถบข้อมูลสั้น: ประเภท + ระยะเวลา + คูลดาวน์ (เฉพาะที่มี)
    const meta = [metaChip(TYPE_LABEL[t.type], 'type')];
    if (t.duration) meta.push(metaChip('นาน ' + secText(t.duration)));
    if (t.cooldown) meta.push(metaChip((t.type === 'reactive' ? 'ชาร์จ ' : 'คูลดาวน์ ') + secText(t.cooldown)));
    $('#tldMeta').replaceChildren(...meta);

    $('#tldEffect').replaceChildren(...t.effect.map((line) => {
      const li = document.createElement('li');
      li.textContent = line;
      return li;
    }));
    $('#tldHow').textContent = got ? '🎮 ' + t.howTo : '';

    // ── บรรทัดสถานะ: บอกผลของการกดปุ่ม "ก่อน" กด ──
    // กรณีมีใบอื่นติดตั้งอยู่ ต้องบอกชื่อใบที่จะถูกถอดออกด้วย ไม่ใช่แค่ "ติดตั้ง"
    // ติดได้ทีละใบ คนกดจะได้ไม่งงว่าใบเดิมหายไปไหน
    const status = $('#tldStatus');
    status.className = 'tl-status';
    if (!got) {
      status.classList.add('lock');
      status.textContent = t.note || 'ยังไม่เปิดใช้งาน';
    } else if (on) {
      status.classList.add('on');
      status.textContent = 'สถานะ: ใช้งานอยู่ — มีผลตั้งแต่เริ่มวิ่งตาถัดไป';
    } else if (cur) {
      status.classList.add('swap');
      status.replaceChildren('จะติดตั้งแทน ');
      const b = document.createElement('b');
      b.textContent = `${cur.icon} ${cur.name}`;
      status.appendChild(b);
    } else {
      status.textContent = 'สถานะ: ยังไม่ได้ติดตั้ง';
    }

    // ติดตั้งอยู่ = ปุ่มกลายเป็น "ถอดออก" (ถอดได้ ไม่ใช่ปุ่มตาย)
    equipBtn.disabled = !got;
    equipBtn.classList.toggle('ghost', on || !got);
    equipBtn.textContent = !got ? 'เร็ว ๆ นี้' : on ? 'ถอดออก' : cur ? 'ติดตั้งแทน' : 'ติดตั้ง';
  }

  function openDetail(id, from) {
    state.selected = id;
    state.lastFocus = from || null;
    // ติดคลาส .sel ให้ใบที่กดทันที ไม่สร้างกริดใหม่ — สร้างใหม่แอนิเมชันตอนเข้าจะเล่นซ้ำทั้งกริด
    for (const c of grid.children) c.classList.toggle('sel', c.dataset && c.dataset.id === id);
    paintDetail();
    detail.classList.add('show');
    detail.setAttribute('aria-hidden', 'false');
    // โฟกัสปุ่มหลักหลังแผ่นเริ่มโผล่ คีย์บอร์ดกด Enter ต่อได้เลย
    requestAnimationFrame(() => (equipBtn.disabled ? $('#tldClose') : equipBtn).focus({ preventScroll: true }));
  }

  function closeDetail() {
    if (!detail.classList.contains('show')) return false;
    detail.classList.remove('show');
    detail.setAttribute('aria-hidden', 'true');
    if (state.lastFocus && state.lastFocus.isConnected) state.lastFocus.focus({ preventScroll: true });
    return true;
  }

  /** วาดการ์ดใหม่เฉพาะใบที่สถานะเปลี่ยน ไม่งั้นแอนิเมชันตอนเข้าเล่นซ้ำทั้งกริด */
  function refreshCards(ids) {
    for (const old of [...grid.querySelectorAll('.tl-card')]) {
      if (!ids.includes(old.dataset.id)) continue;
      const fresh = card(talentById(old.dataset.id), 0);
      fresh.classList.add('no-enter');
      old.replaceWith(fresh);
      if (old.dataset.id === state.selected) state.lastFocus = fresh;
    }
  }

  // ── ปุ่มและการกดต่าง ๆ ──

  equipBtn.addEventListener('click', () => {
    const t = talentById(state.selected);
    if (!t || !isUnlocked(t)) return;
    unlockAudio();
    const before = equippedId();
    if (before === t.id) {
      setEquippedTalent(null);
      sfx.fish();
    } else {
      setEquippedTalent(t.id);
      sfx.potion();
      const side = $('#tlEquipped');
      side.classList.remove('bump');
      void side.offsetWidth;   // เริ่มแอนิเมชันเด้งใหม่ แม้กดติดตั้งติดกันหลายใบ
      side.classList.add('bump');
    }
    renderSide();
    refreshCards([before, t.id].filter(Boolean));
    paintDetail();
  });

  $('#tldClose').addEventListener('click', () => { unlockAudio(); sfx.fish(); closeDetail(); });
  // แตะพื้นมืดรอบแผ่น = ปิด ทางออกที่คนคาดไว้จากหน้าต่างซ้อนแบบนี้
  detail.addEventListener('click', (e) => { if (e.target === detail) { sfx.fish(); closeDetail(); } });

  $('#tlEquipped').addEventListener('click', () => {
    const t = getEquippedTalent();
    if (!t) return;
    unlockAudio();
    sfx.fish();
    openDetail(t.id, $('#tlEquipped'));
  });

  for (const chip of panel.querySelectorAll('#tlFilter .fchip')) {
    chip.addEventListener('click', () => {
      if (state.filter === chip.dataset.rank) return;
      unlockAudio();
      sfx.fish();
      state.filter = chip.dataset.rank;
      for (const c of panel.querySelectorAll('#tlFilter .fchip')) {
        c.classList.toggle('on', c === chip);
        c.setAttribute('aria-pressed', String(c === chip));
      }
      grid.scrollTop = 0;
      renderGrid();
    });
  }

  // ปุ่มกลับ: ถ้าหน้ารายละเอียดเปิดอยู่ ปิดอันนั้นก่อน — กลับทีละชั้นเหมือนทุกเกมมือถือ
  $('#talentBack').addEventListener('click', () => {
    unlockAudio();
    sfx.fish();
    if (!closeDetail()) onBack();
  });

  // Esc ทำงานเฉพาะตอนหน้านี้เปิดอยู่
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || panel.classList.contains('hidden')) return;
    if (!closeDetail()) onBack();
  });

  return {
    open() {
      // เปิดใหม่ทุกครั้งเริ่มสะอาด: ปิดหน้ารายละเอียดที่อาจค้างจากการออกทางอื่น (เช่นกลับหน้าแรก)
      detail.classList.remove('show');
      detail.setAttribute('aria-hidden', 'true');
      state.selected = null;
      renderSide();
      renderGrid();
      grid.scrollTop = 0;
      panel.classList.remove('hidden');
    },
  };
}
