// src/skill-ui.js
//
// ══ หมวดสกิลในหน้าพรสวรรค์ ═══════════════════════════════════════
//
// หน้าจอล้วน ๆ — ข้อมูลสกิลกับภารกิจปลดล็อกอยู่ใน skills.js ผลระหว่างวิ่งอยู่ใน game.js
// ใช้แผงเดียวกับพรสวรรค์ (#talentPanel) สลับด้วยแท็บบนหัว — ไฟล์นี้ดูแลแท็บด้วย
// หมวดพรสวรรค์ยังเป็นของ talent-ui.js ทั้งหมด ที่นี่แค่ซ่อน/โชว์มัน
//
// ── ทำไมกดการ์ดแล้วติดตั้งเลย ไม่เปิดหน้ารายละเอียดก่อน ──
// การ์ดสกิลกว้างพอจะใส่ผลในเกมครบทุกบรรทัดอยู่แล้ว ไม่มีอะไรต้องไปดูต่อ
// และติดตั้งได้ทีละอันเสมอ (ถอดจนว่างไม่ได้) กดผิดก็แค่กดอีกใบ

import { SKILL } from './config.js';
import { stageById } from './stages.js';
import {
  SKILLS, skillProgress, isSkillUnlocked, getEquippedSkill, setEquippedSkill, skillSeconds,
} from './skills.js';

/**
 * @param {object} o
 * @param {HTMLElement} o.panel      #talentPanel
 * @param {{ open: () => void }} o.talentUI  หน้าพรสวรรค์ — open() รีเซ็ตแผงแล้วโชว์
 * @returns {{ open: (tab?: 'skill'|'talent') => void }}
 */
export function setupSkillUI({ panel, talentUI, sfx, unlockAudio, markScrollable }) {
  const $ = (sel) => panel.querySelector(sel);
  const grid = $('#skGrid');
  const side = $('#skEquipped');
  const tabs = [...panel.querySelectorAll('#tlTabs .fchip')];

  // เปิดแผงครั้งแรกเจอหมวดสกิล (ปุ่มล็อบบี้ชื่อ "สกิล") — ครั้งต่อไปจำหมวดล่าสุดไว้ในรอบเล่นนี้
  let tab = 'skill';

  const stageName = (sk) => {
    const st = stageById(sk.stage);
    // ขึ้นต้นด้วยคำยาวเฉพาะ กฎแปลใน i18n-en.js จะได้จับเฉพาะป้ายนี้ ไม่ไปโดนประโยคอื่นที่ขึ้นต้นว่า "ด่าน"
    return st ? 'สกิลประจำด่าน' + st.name : '';
  };

  function artNode(sk) {
    const art = document.createElement('span');
    art.className = 'tl-card-art';
    const ico = document.createElement('span');
    ico.className = 'tl-ico';
    ico.textContent = sk.icon;
    art.appendChild(ico);
    return art;
  }

  // คลาสเสริมของชิปต้องขึ้นต้น sk-chip- เสมอ — เคยใช้ 'stage' แล้วไปชนกับ .stage (กรอบเกมทั้งจอ)
  // บนมือถือกฎนั้นยืดชิปจนเต็มการ์ด บนคอมไม่เห็นเพราะกฎชุดนั้นอยู่ใน media query ของมือถือ
  function chip(text, cls = '') {
    const s = document.createElement('span');
    s.className = 'sk-chip ' + cls;
    s.textContent = text;
    return s;
  }

  /** เงื่อนไขปลดล็อก + หลอดความคืบหน้า (เฉพาะสกิลที่ยังล็อก) */
  function questNode(sk) {
    const p = skillProgress(sk);
    const box = document.createElement('div');
    box.className = 'sk-quest';
    const line = document.createElement('span');
    line.className = 'sk-quest-text';
    line.textContent = '🔒 ' + sk.unlock.text;
    const bar = document.createElement('span');
    bar.className = 'sk-bar';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(p.goal));
    bar.setAttribute('aria-valuenow', String(p.now));
    const fill = document.createElement('i');
    fill.style.width = (p.ratio * 100).toFixed(1) + '%';
    bar.appendChild(fill);
    const num = document.createElement('b');
    num.className = 'sk-quest-num';
    num.textContent = `${p.now} / ${p.goal}`;
    box.append(line, bar, num);
    return box;
  }

  // ── การ์ดหนึ่งใบ ──

  function card(sk, i) {
    const got = isSkillUnlocked(sk);
    const on = sk.id === getEquippedSkill().id;

    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'tl-card sk-card' + (got ? '' : ' locked') + (on ? ' equipped' : '');
    el.dataset.id = sk.id;
    el.setAttribute('role', 'listitem');
    el.setAttribute('aria-label', `${sk.name}${on ? ' ใช้งานอยู่' : ''}${got ? '' : ' ยังไม่ปลดล็อก'}`);
    el.style.setProperty('--i', Math.min(i, 12));

    const head = document.createElement('span');
    head.className = 'sk-head';
    const titles = document.createElement('span');
    titles.className = 'sk-titles';
    const name = document.createElement('b');
    name.className = 'sk-name';
    name.textContent = sk.name;
    const chips = document.createElement('span');
    chips.className = 'sk-chips';
    chips.append(chip(stageName(sk), 'sk-chip-stage'), chip(`ออกฤทธิ์ ${skillSeconds(sk)} วิ`));
    titles.append(name, chips);
    head.append(artNode(sk), titles);

    const short = document.createElement('small');
    short.className = 'sk-short';
    short.textContent = sk.short;

    const list = document.createElement('ul');
    list.className = 'sk-effect';
    for (const line of sk.effect) {
      const li = document.createElement('li');
      li.textContent = line;
      list.appendChild(li);
    }

    const foot = document.createElement('span');
    foot.className = 'sk-foot';
    if (!got) foot.appendChild(questNode(sk));
    else foot.appendChild(chip(on ? '✓ ใช้งานอยู่' : 'แตะเพื่อติดตั้ง', on ? 'sk-chip-on' : 'sk-chip-equip'));

    el.append(head, short, list, foot);

    el.addEventListener('click', () => {
      unlockAudio();
      if (!isSkillUnlocked(sk)) {
        // ยังล็อก: สั่นการ์ดบอกว่ากดไม่ได้ เงื่อนไขอยู่บนการ์ดให้อ่านแล้ว
        sfx.fish();
        el.classList.remove('nope');
        void el.offsetWidth;
        el.classList.add('nope');
        return;
      }
      if (sk.id === getEquippedSkill().id) { sfx.fish(); return; }
      setEquippedSkill(sk.id);
      sfx.potion();
      render(true);
      side.classList.remove('bump');
      void side.offsetWidth;   // เริ่มแอนิเมชันเด้งใหม่ แม้กดติดตั้งติดกันหลายใบ
      side.classList.add('bump');
    });
    return el;
  }

  function renderSide() {
    const sk = getEquippedSkill();
    const name = document.createElement('b');
    name.className = 'tl-card-name';
    name.textContent = sk.name;
    const desc = document.createElement('small');
    desc.className = 'tl-card-desc';
    desc.textContent = sk.short;
    side.replaceChildren(artNode(sk), name, desc);
    side.setAttribute('aria-label', 'ใช้งานอยู่: ' + sk.name);
    // เวลาชาร์จมาจาก config ตัวเดียวกับเกม — ปรับที่นั่นแล้วข้อความตามเอง
    $('#skBody .tl-side-note').replaceChildren(
      'ติดตั้งได้ทีละ 1 สกิล', document.createElement('br'),
      `หลอดบนหัวเต็มทุก ${Math.round(SKILL.chargeFrames / 60)} วิ`, document.createElement('br'),
      'แล้วออกฤทธิ์เอง',
    );
  }

  /** @param {boolean} [quiet] true = สร้างการ์ดใหม่โดยไม่เล่นแอนิเมชันตอนเข้า (หลังกดติดตั้ง) */
  function render(quiet = false) {
    renderSide();
    const cards = SKILLS.map(card);
    if (quiet) for (const c of cards) c.classList.add('no-enter');
    grid.replaceChildren(...cards);
    markScrollable(grid);
  }

  // ── แท็บ ──
  // ซ่อนของเฉพาะหมวดด้วยคลาสบนแผง (.tab-skill) ใน CSS ที่เดียว ไม่ไล่ตั้ง hidden ทีละชิ้น

  function setTab(next) {
    tab = next;
    panel.classList.toggle('tab-skill', tab === 'skill');
    for (const c of tabs) {
      const on = c.dataset.tab === tab;
      c.classList.toggle('on', on);
      c.setAttribute('aria-selected', String(on));
    }
    $('#tlKicker').textContent = tab === 'skill' ? 'SKILL' : 'TALENT';
    $('#tlTitle').textContent = tab === 'skill' ? 'สกิล' : 'พรสวรรค์';
    if (tab === 'skill') { render(); grid.scrollTop = 0; }
  }

  for (const c of tabs) {
    c.addEventListener('click', () => {
      if (c.dataset.tab === tab) return;
      unlockAudio();
      sfx.fish();
      setTab(c.dataset.tab);
    });
  }

  return {
    open(next = tab) {
      talentUI.open();   // รีเซ็ตหมวดพรสวรรค์ + โชว์แผง
      setTab(next);
    },
  };
}
