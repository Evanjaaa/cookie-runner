// src/catroom-ui.js
// ─────────────────────────────────────────────────────────────
// หน้าจอของระบบน้องแมว — บ้านน้อง หน้าพบน้อง เรื่องราว มินิเกม และเคล็ดลับน้องส้ม
//
// แยกจาก main.js เหมือน talent-ui.js: รับของที่ต้องใช้ร่วมจาก main.js ผ่าน deps
// ตัวฉากห้องอยู่ใน catroom.js (วาดบนผ้าใบเกม) ไฟล์นี้ดูแลแค่ปุ่ม การ์ด และกติกาเงิน
//
// ── เรื่องเงิน ──
// อาหารกับของเล่นจ่ายด้วยทอง หักผ่าน addGold ของ gacha.js (ส่งมาทาง deps) ที่เดียว
// cats.js ไม่แตะทองเลย — ลำดับเสมอ: เช็คทอง → หักทอง → บันทึกการดูแล
// ทองไม่พอซื้อข้าวเม็ดถูกสุด = พี่ส้มแบ่งข้าวให้ฟรี น้องต้องไม่หิวเพราะเราไม่มีทอง
// ─────────────────────────────────────────────────────────────
import {
  roomCats, waitingCats, allCats, catById, care, petCat, renameCat, unlockToy, ownsToy, graduate,
  settleHome, reloadCats, levelOf, expInfo, expLeftToday, needNow, isSad, heartsOf, nameOf, storyOf,
  careInfo, rollFind, rollBreed, adoptFound, noteRunNoFind, FOODS, TOYS, ACTIONS, NEEDS, NAME_IDEAS, GROWN_LV,
  ROOM_SLOTS,
} from './cats.js';
import { catSkin, skinById } from './skins.js';
import { CatRoom } from './catroom.js';
import { drawCatPose, drawCatFace } from './render/entities.js';
import { drawCatBox } from './render/catbox.js';
import { drawItemIcon } from './render/items.js';
import { TIPS, tipSeen, markTip } from './tips.js';
import { dayKey } from './clock.js';
import { rollFaceId } from './faces.js';
import { STATE } from './game.js';
import { startMusic } from './music.js';
import { t, getLang } from './i18n.js';

const rand = (a, b) => a + Math.random() * (b - a);
const later = (fn, ms) => setTimeout(fn, ms);
/** วันที่ในเรื่องราวของน้อง ตามภาษาที่เลือก (ไทย = พ.ศ.) */
const fmtDate = (ms) => new Date(ms).toLocaleDateString(getLang() === 'en' ? 'en-GB' : 'th-TH');
const $ = (id) => document.getElementById(id);

/** แถวน้ำในเมนูให้อาหาร — ฟรีเสมอ (ดื่มน้ำ ดู ACTIONS.drink ใน cats.js) */
const WATER = { id: 'water', name: 'น้ำสะอาด', price: 0, aff: 1 };
/** แถวคอนโดแมวในเมนูของเล่น — ฟรีเสมอ น้องปีนเล่นบนคอนโด (ดู treePlay ใน catroom.js) */
const TREE = { id: 'tree', name: 'คอนโดแมว', price: 0, aff: 2 };

export function setupCatRoomUI(deps) {
  const {
    game, sfx, unlockAudio, paintMini, paintFitted, getGold, addGold, refreshGold,
    closeAllPanels, startPanel, refreshHome, confirmBox, recheckSkin,
  } = deps;

  const panel = $('catRoomPanel');
  const hit = $('crHit');
  const room = new CatRoom();
  // ช่องส่องสถานะตอนพัฒนา (สคริปต์ทดสอบอ่านตำแหน่ง/ท่าของน้องจากตรงนี้)
  if (import.meta.env.DEV) window.__catRoom = room;
  let ticker = 0;
  let picker = null;      // 'feed' | 'play' | null

  // ─────────────────────────────────────────────────────────
  // เคล็ดลับน้องส้ม
  // ─────────────────────────────────────────────────────────

  const tipQueue = [];
  // กล่องเปิดอยู่จริงไหม ดูจากหน้าจอ ไม่จำเป็นตัวแปร — closeAllPanels ปิดกล่องได้โดยไม่บอกเรา
  const tipOpen = () => !$('tipPanel').classList.contains('hidden');

  function paintTipFace() {
    paintMini($('tipFace'), 120, (c) => drawCatFace(c, 60, 66, 2.3, { ...skinById('orange'), noPhoto: true }, { mood: 'happy' }));
  }

  /** โชว์เคล็ดลับครั้งเดียวต่อบัญชี — ซ้อนกันหลายอันก็เข้าคิวทีละอัน */
  function showTip(id, force = false) {
    if (!TIPS[id] || (!force && tipSeen(id))) return;
    markTip(id);
    tipQueue.push(id);
    if (!tipOpen()) nextTip();
  }

  function nextTip() {
    const id = tipQueue.shift();
    if (!id) return;
    paintTipFace();
    $('tipText').textContent = TIPS[id];
    $('tipPanel').classList.remove('hidden');
    sfx.trill();
  }

  $('tipOk').addEventListener('click', () => {
    unlockAudio();
    sfx.fish();
    $('tipPanel').classList.add('hidden');
    nextTip();
  });

  // ─────────────────────────────────────────────────────────
  // เปิด / ปิดบ้านน้อง
  // ─────────────────────────────────────────────────────────

  function open(selectId = null) {
    reloadCats();
    const settled = settleHome();
    closeAllPanels();
    startPanel.classList.add('hidden');
    // เปิดจากหน้าจบรอบ (ปุ่ม "ไปบ้านน้อง" ในหน้าพบน้อง) เกมยังค้างอยู่ในสถานะตาย
    // ห้องวาดแทนหน้าแรกเฉพาะตอน READY — ต้องพาเกมกลับมาที่หน้าแรกก่อน
    if (game.state !== STATE.READY) {
      game.reset();
      game.syncMusic();
    }
    game.catRoom = room;
    game.syncMusic();   // เปลี่ยนเป็นเพลงบ้านน้อง
    room.onTapCat = onTapCat;
    room.onGrab = (id) => select(id);
    room.onDropCat = onDropCat;
    room.onNotice = (text) => toast(text);
    room.open(selectId);
    panel.classList.remove('hidden');
    refreshGold();
    paintAll();
    clearInterval(ticker);
    // หลอดความต้องการลดลงตามเวลาจริง — ทาสีใหม่ทุกสองวินาทีพอ ไม่ต้องทุกเฟรม
    ticker = setInterval(() => {
      if (panel.classList.contains('hidden')) { clearInterval(ticker); return; }
      paintCard();
      paintArrows();
    }, 2000);
    requestAnimationFrame(arrowLoop);

    if (!roomCats().length && !waitingCats().length) showTip('emptyRoom');
    else {
      showTip('room');
      if (roomCats().length) showTip('drag');
    }
    if (settled.grown.length) showTip('grown');
  }

  function close() {
    setClean(false);
    clearInterval(ticker);
    closePicker();
    panel.classList.add('hidden');
    game.catRoom = null;
    game.syncMusic();   // กลับเป็นเพลงหน้าแรก
    recheckSkin();
    startPanel.classList.remove('hidden');
    refreshHome();
  }

  /**
   * ออกจากบ้าน — กลับด้านของตอนเข้า: ม่านวงกลมขยายจากกลางจอปิดห้อง → ปิดห้องข้างหลังม่าน
   * → ม่านหดกลับเข้าไปที่กล่องแมวบนหน้าแรก (เหมือนน้องเดินกลับเข้ากล่อง)
   */
  let leaving = false;
  $('crBack').addEventListener('click', () => {
    if (leaving) return;
    leaving = true;
    unlockAudio();
    sfx.fish();
    later(() => sfx.bubblePop(), 300);
    const wipe = $('roomWipe');
    wipe.className = 'room-wipe in-center';
    setTimeout(() => {
      close();
      // ปุ่มกล่องเพิ่งโผล่หลังปิดห้อง — วัดตำแหน่งตอนนี้ ม่านจะหดเข้าไปตรงกล่องพอดี
      const btn = $('btnHomeBox').getBoundingClientRect();
      const stage = wipe.parentElement.getBoundingClientRect();
      wipe.style.setProperty('--wx', ((btn.left + btn.width / 2 - stage.left) / stage.width * 100) + '%');
      wipe.style.setProperty('--wy', ((btn.top + btn.height / 2 - stage.top) / stage.height * 100) + '%');
      wipe.className = 'room-wipe out-box';
      game.homeBoxPop = 1;   // กล่องเด้งรับตอนม่านหดเข้าไป
      setTimeout(() => { wipe.className = 'room-wipe'; leaving = false; }, 560);
    }, 430);
  });

  // ลูกศรเลื่อนห้อง — จางหายเมื่อสุดทางแล้ว
  function paintArrows() {
    $('crLeft').classList.toggle('off', room.atLeft);
    $('crRight').classList.toggle('off', room.atRight);
  }
  function arrowLoop() {
    if (panel.classList.contains('hidden')) return;
    paintArrows();
    requestAnimationFrame(arrowLoop);
  }
  // ── ดูเต็มจอ ── ซ่อน UI ทั้งหมด เหลือห้องกับน้อง (ปัดเลื่อนห้อง แตะ/ลากน้องยังได้ตามปกติ)
  function setClean(on) {
    panel.classList.toggle('clean', on);
    room.clean = on;
    $('crFull').setAttribute('aria-pressed', on ? 'true' : 'false');
    $('crFull').setAttribute('aria-label', on ? 'แสดงเมนู' : 'ดูเต็มจอ');
    if (on) closePicker();
  }
  $('crFull').addEventListener('click', () => {
    unlockAudio();
    sfx.fish();
    setClean(!panel.classList.contains('clean'));
  });

  $('crLeft').addEventListener('click', () => { unlockAudio(); sfx.fish(); room.nudge(-1); });
  $('crRight').addEventListener('click', () => { unlockAudio(); sfx.fish(); room.nudge(1); });

  // ── นิ้วบนห้อง: ลาก = เลื่อนห้อง / แตะ = เลือกน้อง (แตะซ้ำตัวเดิม = ลูบ) ──
  function toScene(e) {
    const r = hit.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 960, y: ((e.clientY - r.top) / r.height) * 420 };
  }
  hit.addEventListener('pointerdown', (e) => {
    unlockAudio();
    closePicker();
    hit.setPointerCapture?.(e.pointerId);
    const p = toScene(e);
    room.pointerDown(p.x, p.y);
  });
  hit.addEventListener('pointermove', (e) => {
    const p = toScene(e);
    room.pointerMove(p.x, p.y);
  });
  hit.addEventListener('pointerup', (e) => {
    const p = toScene(e);
    room.pointerUp(p.x, p.y);
  });
  hit.addEventListener('pointercancel', () => { room.drag = null; });

  /**
   * ลากน้องไปวางบนจุดกิจกรรม — ทางเดียวกับกดปุ่มดูแล (เช็คทอง บันทึก เล่นฉาก)
   * ชามข้าว/หีบของเล่นต้องเลือกของก่อน จึงเปิดเมนูเลือกให้ ส่วนอ่างกับที่นอนเริ่มเลย
   */
  function onDropCat(id, act, opts) {
    const c = catById(id);
    if (!c || c.state !== 'room') return;
    select(id);
    // วางที่คอนโดแมว = เล่นคอนโดเลย (ฟรี ไม่ต้องเลือกของเล่น)
    if (act === 'play' && opts?.tree) {
      doCare(id, 'play', { aff: TREE.aff, tree: true });
      return;
    }
    if (act === 'feed' || act === 'play') {
      openPicker(act, opts?.at);
      return;
    }
    doCare(id, act, opts);
  }

  function onTapCat(id) {
    const was = selectedId === id;
    select(id);
    if (was && catById(id)?.state === 'room') {
      const got = petCat(id);
      room.pet(id);
      if (got) room.floatHearts(id, 1);
      paintCard();
    } else {
      sfx.mew();
    }
  }

  // ─────────────────────────────────────────────────────────
  // การ์ดน้องที่เลือก
  // ─────────────────────────────────────────────────────────

  let selectedId = null;

  function select(id) {
    selectedId = id;
    room.select(id);
    closePicker();
    paintAll();
  }

  function paintAll() {
    if (!selectedId || !catById(selectedId) || catById(selectedId).state === 'grown') {
      selectedId = room.selected;
    }
    room.select(selectedId);
    paintChips();
    paintCard();
    paintArrows();
    const empty = !roomCats().length && !waitingCats().length;
    $('crEmpty').classList.toggle('hidden', !empty);
    $('crCard').classList.toggle('hidden', empty);
    $('crActs').classList.toggle('hidden', empty);
    $('crEmptyText').textContent = 'ตอนวิ่งลองสังเกตกล่องกระดาษริมทางนะ น้องแมวตัวเล็ก ๆ อาจรออยู่';
  }

  function paintChips() {
    const box = $('crCats');
    box.innerHTML = '';
    const list = [...roomCats(), ...waitingCats()];
    for (const c of list) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cr-chip' + (c.id === selectedId ? ' on' : '') + (c.state === 'wait' ? ' wait' : '');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', c.id === selectedId ? 'true' : 'false');
      b.innerHTML = '<canvas width="40" height="40"></canvas><span><b></b><small></small></span>';
      b.querySelector('b').textContent = nameOf(c);
      b.querySelector('small').textContent = c.state === 'wait' ? 'รอในกล่อง' : 'Lv.' + levelOf(c);
      paintMini(b.querySelector('canvas'), 40, (g) => drawCatFace(g, 20, 23, 0.95, catSkin(c)));
      if (c.state === 'room' && needsCare(c)) {
        const dot = document.createElement('i');
        dot.className = 'dot';
        b.appendChild(dot);
      }
      b.addEventListener('click', () => {
        unlockAudio();
        sfx.fish();
        select(c.id);
        room.focus(c.id);
      });
      box.appendChild(b);
    }
    // ช่องว่างที่เหลือ — ให้เห็นว่ายังรับน้องได้อีกกี่ตัว
    for (let i = roomCats().length; i < ROOM_SLOTS; i++) {
      const e = document.createElement('span');
      e.className = 'cr-chip empty';
      e.textContent = '+';
      e.setAttribute('aria-hidden', 'true');
      box.appendChild(e);
    }
  }

  /** ตอนนี้ดูแลแล้วได้ EXP ไหม (ใช้ทั้งจุดแดงบนการ์ดน้องและบนปุ่มล็อบบี้) */
  function needsCare(c) {
    if (expLeftToday(c) <= 0) return false;
    return Object.keys(ACTIONS).some((a) => careInfo(c, a).wants);
  }

  function paintCard() {
    const c = catById(selectedId);
    if (!c) return;
    const waiting = c.state === 'wait';
    $('crName').textContent = nameOf(c);
    const sex = $('crSex');
    sex.className = 'sex-tag ' + c.sex;
    sex.textContent = c.sex === 'f' ? '♀' : '♂';
    sex.setAttribute('aria-label', c.sex === 'f' ? 'ตัวเมีย' : 'ตัวผู้');

    const xp = expInfo(c);
    $('crLv').textContent = xp.lv;
    $('crExpFill').style.width = (xp.ratio * 100).toFixed(1) + '%';
    $('crExpTxt').textContent = xp.maxed ? 'โตเต็มวัย' : `${xp.into}/${xp.need}`;

    for (const row of document.querySelectorAll('#crNeeds .cr-need')) {
      const v = needNow(c, row.dataset.need);
      const bar = row.querySelector('i');
      bar.style.width = v.toFixed(1) + '%';
      row.classList.toggle('low', v < 30);
      row.classList.toggle('mid', v >= 30 && v < 60);
    }

    const hearts = heartsOf(c);
    $('crHearts').textContent = '♥'.repeat(hearts) + '♡'.repeat(5 - hearts);

    let note;
    if (waiting) note = 'รออยู่ในกล่องหน้าประตู จะย้ายเข้าห้องเมื่อมีที่ว่าง';
    else if (isSad(c)) note = 'น้องเหงา... ได้ EXP ครึ่งเดียวจนกว่าจะได้รับการดูแล';
    else if (expLeftToday(c) <= 0) note = 'วันนี้โตเต็มเพดานแล้ว พรุ่งนี้มาเลี้ยงต่อนะ';
    else note = 'วันนี้ยังโตได้อีก ' + expLeftToday(c) + ' EXP';
    $('crNote').textContent = note;

    const busy = room.isBusy(c.id);
    for (const b of document.querySelectorAll('#crActs .cr-act')) {
      b.disabled = waiting || busy;
      // ปุ่มให้อาหารรวมน้ำไว้ด้วย — เรืองชวนกดเมื่อหิวหรือกระหายอย่างใดอย่างหนึ่ง
      const acts = b.dataset.act === 'feed' ? ['feed', 'drink'] : [b.dataset.act];
      const wants = !waiting && acts.some((x) => careInfo(c, x).wants);
      const capped = expLeftToday(c) <= 0;
      b.classList.toggle('want', wants && !capped);
      // ── เวลาที่เหลือก่อนดูแลแล้วได้ EXP อีก ── (ปุ่มรวมอาหาร/น้ำ ใช้อันที่ถึงก่อน)
      let cd = b.querySelector('.cr-cd');
      if (!cd) {
        cd = document.createElement('small');
        cd.className = 'cr-cd';
        b.querySelector('b').after(cd);
      }
      if (waiting) cd.textContent = '';
      else if (capped) cd.textContent = 'เต็มวันนี้';
      else if (wants) cd.textContent = 'ได้ EXP';
      else cd.textContent = waitText(Math.min(...acts.map((x) => minutesUntilWant(c, x))));
      cd.classList.toggle('ready', wants && !capped);
    }
  }

  // ─────────────────────────────────────────────────────────
  // ดูแล
  // ─────────────────────────────────────────────────────────

  for (const b of document.querySelectorAll('#crActs .cr-act')) {
    b.addEventListener('click', () => {
      unlockAudio();
      const c = catById(selectedId);
      if (!c || c.state !== 'room' || room.isBusy(c.id)) return;
      const act = b.dataset.act;
      if (act === 'feed' || act === 'play') {
        sfx.fish();
        if (picker === act) closePicker(); else openPicker(act);
        return;
      }
      doCare(c.id, act, {});
    });
  }

  /** อีกกี่นาทีความต้องการนี้จะลดลงต่ำกว่าเกณฑ์ (ดูแลแล้วได้ EXP) */
  function minutesUntilWant(c, act) {
    const a = ACTIONS[act];
    const v = needNow(c, a.need);
    if (v < a.below) return 0;
    return Math.ceil(((v - a.below) / NEEDS[a.need].perHour) * 60) + 1;
  }

  /** "อีก 25 นาที" / "อีก 2 ชม." / "อีก 2 ชม. 10 นาที" */
  function waitText(min) {
    // เว้นวรรคแบบไม่ตัดบรรทัด ( ) — เวลาต้องอยู่บรรทัดเดียวกันทั้งก้อน ไม่ขาดเป็น "11 ชม." / "27 นาที"
    const nb = ' ';
    if (min < 60) return 'อีก ' + Math.max(1, min) + nb + 'นาที';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return 'อีก ' + h + nb + 'ชม.' + (m ? nb + m + nb + 'นาที' : '');
  }

  /** ป้ายแจ้งสั้น ๆ กลางล่างของห้อง จางหายเอง */
  let toastTimer = 0;
  function toast(text) {
    let el = $('crToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'crToast';
      el.className = 'cr-toast';
      el.setAttribute('role', 'status');
      panel.appendChild(el);
    }
    el.textContent = t(text);
    el.classList.remove('show');
    void el.offsetWidth;   // เริ่มแอนิเมชันใหม่ทุกครั้ง แม้ข้อความเดิม
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function closePicker() {
    picker = null;
    $('crPicker').classList.add('hidden');
  }

  /**
   * @param at ตำแหน่งบนจอ (หน่วยฉาก 960×420) ที่จะให้เมนูเด้งขึ้นใกล้ ๆ — มาจากการลากน้องไปวาง
   *           ไม่ส่ง = เด้งข้างแถวปุ่มดูแลทางขวาเหมือนเดิม
   */
  function openPicker(kind, at = null) {
    picker = kind;
    const list = $('crPickList');
    list.innerHTML = '';
    $('crPickTitle').textContent = kind === 'feed' ? 'อาหารและน้ำ' : 'เลือกของเล่น';
    const gold = getGold();
    // เมนูให้อาหารมีน้ำสะอาด (ฟรี) อยู่บนสุด — ให้น้ำกับให้อาหารอยู่ปุ่มเดียวกัน
    // ของเล่น: ลูกไหมพรมบนสุด ตามด้วยคอนโดแมว แล้วของเล่นที่ซื้อได้
    const rows = kind === 'feed' ? [WATER, ...FOODS] : [TOYS[0], TREE, ...TOYS.slice(1)];
    for (const it of rows) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cr-pick';
      const owned = kind === 'play' && ownsToy(it.id);
      // ทองไม่พอซื้อข้าวเม็ด = พี่ส้มแบ่งให้ฟรี (จานแรกเท่านั้น)
      const shared = kind === 'feed' && it.id === 'kibble' && gold < it.price;
      const free = owned || shared || it.price === 0;
      if (it === WATER) b.classList.add('water');
      if (it === TREE) b.classList.add('tree');
      // รูปของชิ้นนั้นหน้าชื่อ — เห็นก่อนซื้อว่าได้อะไร (หน้าตาเดียวกับของในห้อง)
      b.innerHTML = '<canvas class="cr-icon" width="40" height="40" aria-hidden="true"></canvas>'
        + '<b></b><small class="cr-aff"></small><span class="cr-price"></span>';
      paintMini(b.querySelector('canvas'), 40, (g) => drawItemIcon(g, it.id));
      b.querySelector('b').textContent = it.name;
      b.querySelector('.cr-aff').textContent = '♥'.repeat(Math.min(5, it.aff));
      const price = b.querySelector('.cr-price');
      if (shared) price.textContent = 'พี่ส้มแบ่งให้';
      else if (owned || it.price === 0) price.textContent = kind === 'play' ? 'มีแล้ว' : 'ฟรี';
      else {
        price.innerHTML = '<span class="coin" aria-hidden="true"></span>';
        price.append(it.price.toLocaleString('en-US'));
        if (kind === 'play') price.prepend('ซื้อ ');
      }
      b.disabled = !free && gold < it.price;
      b.addEventListener('click', () => choose(kind, it, free));
      list.appendChild(b);
    }
    const pk = $('crPicker');
    pk.classList.remove('hidden');
    pk.classList.toggle('at', !!at);
    if (at) {
      // วางเหนือจุดกิจกรรม แล้วดันกลับเข้าในจอถ้าล้นขอบ
      const box = panel.getBoundingClientRect();
      const k = box.width / 960;
      const w = pk.offsetWidth;
      const h = pk.offsetHeight;
      const left = Math.max(8, Math.min(box.width - w - 8, at.x * k - w / 2));
      const top = Math.max(8, Math.min(box.height - h - 8, at.y * k - h - 6));
      pk.style.left = left + 'px';
      pk.style.top = top + 'px';
    } else {
      pk.style.left = '';
      pk.style.top = '';
    }
  }

  async function choose(kind, it, free) {
    unlockAudio();
    const id = selectedId;
    const c = catById(id);
    if (!c || room.isBusy(id)) return;
    closePicker();

    // น้ำสะอาด = ดื่มน้ำ (ฟรี) ไม่ใช่การให้อาหาร
    if (it === WATER) {
      doCare(id, 'drink', {});
      return;
    }
    if (it === TREE) {
      doCare(id, 'play', { aff: TREE.aff, tree: true });
      return;
    }

    if (kind === 'play' && !free) {
      const ok = await confirmBox({
        title: 'ซื้อ' + it.name + '?',
        body: 'ซื้อครั้งเดียว ใช้เล่นกับน้องทุกตัวได้ตลอด',
        cost: it.price,
        after: 'ทองคงเหลือหลังซื้อ ' + (getGold() - it.price).toLocaleString('en-US'),
        okText: 'ซื้อเลย',
      });
      if (!ok) return;
      if (getGold() < it.price) { sfx.upFail(); return; }
      addGold(-it.price);
      unlockToy(it.id);
      refreshGold();
      sfx.upWin();
    } else if (kind === 'feed' && !free) {
      if (getGold() < it.price) { sfx.upFail(); return; }
      addGold(-it.price);
      refreshGold();
    }
    doCare(id, kind, { aff: it.aff, item: it.id });
  }

  /** บันทึกการดูแลทันที แล้วเล่นฉากให้ตรง — ตัวเลขลอยตอนฉากจบ */
  function doCare(id, act, { aff = 1, item = null, at = null, direct = false, tree = false } = {}) {
    // ดูแลซ้ำก่อนถึงเวลา = ยังทำได้ (น้องดีใจ) แต่ไม่ได้ EXP — บอกสั้น ๆ ว่าอีกนานเท่าไหร่
    // ต้องคำนวณก่อน care() เพราะ care() เติมความต้องการเต็มหลอดทันที
    const before = catById(id);
    if (before) {
      if (expLeftToday(before) <= 0) toast('วันนี้น้องโตเต็มที่แล้ว พรุ่งนี้มาเลี้ยงต่อนะ');
      else if (!careInfo(before, act).wants) toast('ยังไม่ได้ EXP — ' + waitText(minutesUntilWant(before, act)) + ' ถึงจะได้อีกครั้ง');
    }
    const res = care(id, act, { aff });
    if (!res) return;
    const done = () => afterCare(id, res);
    if (act === 'feed') room.feed(id, item || 'kibble', done);
    else if (act === 'drink') room.drink(id, done);   // ดื่มน้ำฟรี ไม่มีของให้เลือก
    else if (act === 'play' && tree) room.treePlay(id, done);   // เล่นคอนโดแมว
    else if (act === 'play') room.play(id, item || 'yarn', done);
    else if (act === 'bathe') room.bathe(id, done, direct);   // direct = ถูกยกมาวางในอ่างแล้ว
    else room.sleep(id, done, at);                            // at = ที่นอนที่ถูกยกมาวาง
    paintCard();
  }

  function afterCare(id, res) {
    if (res.exp > 0) {
      room.floatText(id, `+${res.exp} EXP`, '#FFE48A');
      sfx.kibble();   // ติ๊ง ๆ ตอน EXP ลอยขึ้น
    }
    else room.floatText(id, t('ดีใจ!'), '#FFF6D8');
    if (res.aff > 0) setTimeout(() => room.floatHearts(id, res.aff), 380);
    if (res.after > res.before && !res.grew) {
      sfx.levelUp();
      setTimeout(() => room.floatText(id, 'Lv.' + res.after + '!', '#9DF2C8'), 760);
    }
    const c = catById(id);
    if (c && expLeftToday(c) <= 0) showTip('roomCap');
    if (res.grew) growUp(id);
    paintAll();
  }

  /** ถึง Lv5 — ฉลองในห้อง แล้วย้ายไปหน้าแรก รับน้องจากกล่องเข้าห้อง */
  const growing = new Set();
  function growUp(id) {
    if (growing.has(id)) return;
    growing.add(id);
    room.celebrate(id);
    sfx.cheer();
    room.floatText(id, t('โตเต็มวัยแล้ว!'), '#FFE48A');
    setTimeout(() => {
      growing.delete(id);
      const moved = graduate(id);
      room.sync();
      if (moved) room.floatText(moved.id, t('ย้ายเข้าห้องแล้ว!'), '#FFF6D8');
      paintAll();
      showTip('grown');
      refreshDot();
    }, 2400);
  }

  // ─────────────────────────────────────────────────────────
  // ชื่อ / เรื่องราว / มินิเกม
  // ─────────────────────────────────────────────────────────

  $('crRename').addEventListener('click', () => {
    unlockAudio();
    sfx.fish();
    if (selectedId) openFound(selectedId, 'rename');
  });
  $('crStory').addEventListener('click', () => {
    unlockAudio();
    sfx.fish();
    if (selectedId) openStory(selectedId);
  });

  function openStory(id) {
    const c = catById(id);
    if (!c) return;
    $('storyTitle').textContent = 'เรื่องราวของ ' + nameOf(c);
    const list = $('storyList');
    list.innerHTML = '';
    for (const ch of storyOf(c, fmtDate)) {
      const row = document.createElement('div');
      row.className = 'story-ch' + (ch.open ? '' : ' locked');
      row.innerHTML = '<b></b><p></p>';
      row.querySelector('b').textContent = ch.open ? 'ตอนที่ ' + ch.n : '🔒 ตอนที่ ' + ch.n + ' · ปลดเมื่อ Lv.' + ch.n;
      row.querySelector('p').textContent = ch.text;
      list.appendChild(row);
    }
    $('catStoryPanel').classList.remove('hidden');
  }
  $('storyClose').addEventListener('click', () => {
    unlockAudio();
    sfx.fish();
    $('catStoryPanel').classList.add('hidden');
  });

  $('crMini').addEventListener('click', () => {
    unlockAudio();
    sfx.fish();
    $('miniPanel').classList.remove('hidden');
    showTip('mini');
  });
  $('miniClose').addEventListener('click', () => {
    unlockAudio();
    sfx.fish();
    $('miniPanel').classList.add('hidden');
  });

  // ─────────────────────────────────────────────────────────
  // พบน้อง (หลังจบรอบ) / ตั้งชื่อใหม่
  // ─────────────────────────────────────────────────────────

  let foundId = null;
  let foundMode = 'found';
  let foundRAF = 0;
  let foundT = 0;

  function paintFoundArt() {
    const c = catById(foundId);
    if (!c) return;
    foundT++;
    paintMini($('foundArt'), 200, (g) => {
      // ประกายลอยรอบตัว (หมุนวนช้า ๆ) แล้วน้องนั่งในกล่อง หัวโผล่พ้นขอบ
      g.fillStyle = 'rgba(255,236,150,.9)';
      for (let i = 0; i < 5; i++) {
        const a = foundT * 0.012 + i * 1.26;
        const x = 100 + Math.cos(a) * 78;
        const y = 92 + Math.sin(a) * 50;
        const r = 2.5 + Math.abs(Math.sin(foundT * 0.05 + i)) * 2.5;
        g.beginPath();
        g.moveTo(x, y - r * 2); g.lineTo(x + r * 0.5, y); g.lineTo(x, y + r * 2); g.lineTo(x - r * 0.5, y); g.closePath();
        g.moveTo(x - r * 2, y); g.lineTo(x, y + r * 0.5); g.lineTo(x + r * 2, y); g.lineTo(x, y - r * 0.5); g.closePath();
        g.fill();
      }
      // กล่องก่อน แล้วน้องนั่ง "ใน" กล่อง: ตัดภาพน้องที่ขอบปากกล่อง ช่วงล่างจมอยู่ในกล่อง
      // เห็นแค่หัวกับไหล่โผล่พ้นขอบ (เดิมวาดน้องยืนบนขอบกล่อง เลยดูลอยอยู่เหนือกล่อง)
      g.save();
      g.translate(100, 184);
      g.scale(1.3, 1.3);
      drawCatBox(g, 0, 0, foundT, 1);
      g.restore();
      const rim = 184 - 34 * 1.3;   // ขอบบนผนังหน้ากล่อง
      const bob = Math.sin(foundT * 0.06) * 2;
      g.save();
      g.beginPath();
      g.rect(0, 0, 200, rim + 2);
      g.clip();
      drawCatPose(g, 100, rim + 20 + bob, 1.55, catSkin(c), foundT, { pose: 'sit', k: 1, mood: 'happy' });
      g.restore();
      // อุ้งเท้าหน้าสองข้างเกาะขอบกล่อง
      const pc = catSkin(c);
      for (const dx of [-14, 14]) {
        g.beginPath();
        g.ellipse(100 + dx, rim + 1, 6.5, 4.5, 0, 0, Math.PI * 2);
        g.fillStyle = pc.cream || pc.cat;
        g.fill();
        g.strokeStyle = pc.line || '#5C3B26';
        g.lineWidth = 1.6;
        g.stroke();
      }
    });
    if (!$('foundPanel').classList.contains('hidden')) foundRAF = requestAnimationFrame(paintFoundArt);
    else foundRAF = 0;
  }

  function openFound(id, mode = 'found') {
    const c = catById(id);
    if (!c) return;
    foundId = id;
    foundMode = mode;
    const sex = $('foundSex');
    sex.textContent = c.sex === 'f' ? '♀ ตัวเมีย' : '♂ ตัวผู้';
    sex.classList.toggle('f', c.sex === 'f');
    $('foundBreed').textContent = skinById(c.breed).name;
    $('foundStory').textContent = storyOf(c, fmtDate)[0].text;
    $('foundName').value = c.name || '';
    $('foundWait').classList.toggle('hidden', mode !== 'found' || c.state !== 'wait');
    document.querySelector('#foundPanel .found-title').textContent = mode === 'found' ? 'พบน้องแมว!' : 'ตั้งชื่อน้อง';
    $('foundGo').textContent = mode === 'found' ? 'ไปบ้านน้อง' : 'บันทึก';
    $('foundLater').textContent = mode === 'found' ? 'ไว้ทีหลัง' : 'ยกเลิก';
    $('foundPanel').classList.remove('hidden');
    if (!foundRAF) foundRAF = requestAnimationFrame(paintFoundArt);
  }

  function saveFoundName(fallback) {
    const c = catById(foundId);
    if (!c) return;
    const typed = $('foundName').value.trim();
    if (typed) renameCat(c.id, typed);
    else if (fallback && !c.name) renameCat(c.id, NAME_IDEAS[Math.floor(Math.random() * NAME_IDEAS.length)]);
  }

  $('foundDice').addEventListener('click', () => {
    unlockAudio();
    sfx.fish();
    const cur = $('foundName').value;
    let n = cur;
    while (n === cur) n = NAME_IDEAS[Math.floor(Math.random() * NAME_IDEAS.length)];
    $('foundName').value = n;
  });

  $('foundGo').addEventListener('click', () => {
    unlockAudio();
    sfx.potion();
    saveFoundName(true);
    $('foundPanel').classList.add('hidden');
    const id = foundId;
    if (foundMode === 'found') {
      const c = catById(id);
      open(c ? id : null);
      if (c?.state === 'wait') showTip('waiting');
    } else {
      room.sync();
      paintAll();
    }
  });
  $('foundLater').addEventListener('click', () => {
    unlockAudio();
    sfx.fish();
    if (foundMode === 'found') saveFoundName(true);
    $('foundPanel').classList.add('hidden');
    const c = catById(foundId);
    if (foundMode === 'found' && c?.state === 'wait') showTip('waiting');
  });

  // ─────────────────────────────────────────────────────────
  // ต่อกับรอบวิ่ง
  // ─────────────────────────────────────────────────────────

  /**
   * ตอนกดเล่น — รอบนี้มีกล่องไหม คืนแผนให้ main.js ฝากเข้า Game
   * กล่องแรกของบัญชี น้องส้มเป็นคนเล่าในห้องก่อนวิ่งว่าได้ยินเสียงร้อง (คืน line มาด้วย)
   */
  function planRun(playerLv) {
    reloadCats();
    if (!rollFind(playerLv)) return { plan: null, line: null };
    const first = !allCats().length && !tipSeen('firstBox');
    const breed = rollBreed();
    const sex = Math.random() < 0.5 ? 'm' : 'f';
    const plan = { at: Math.round(rand(420, 840)), breed, sex, face: rollFaceId(breed, sex) };
    if (first) markTip('firstBox');
    return { plan, line: first ? TIPS.firstBox : null };
  }

  /** จบรอบ — พบน้อง = รับเข้าบ้านแล้วเปิดหน้าตั้งชื่อ / ไม่พบ = นับเข้าการันตีสะสม */
  function afterRun(found, where, playerLv) {
    if (!found) {
      noteRunNoFind(playerLv);
      return null;
    }
    const cat = adoptFound(where, found);
    refreshDot();
    return cat;
  }

  // ─────────────────────────────────────────────────────────
  // ปุ่มล็อบบี้
  // ─────────────────────────────────────────────────────────

  /** จุดแดงบนปุ่มบ้านน้อง = มีน้องที่ดูแลแล้วได้ EXP อยู่ตอนนี้ */
  function refreshDot() {
    const on = roomCats().some(needsCare) || roomCats().some((c) => levelOf(c) >= GROWN_LV);
    $('catRoomDot').classList.toggle('hidden', !on);
  }

  /** ปุ่มบ้านน้องในแถวขวาถูกแทนด้วยกล่องแมวในฉากแล้ว (drawHomeBox) — ไม่มีไอคอนให้วาด
   *  คงชื่อไว้เพราะ refreshHome ใน main.js ยังเรียกอยู่ */
  function paintIcon() {}

  /**
   * แตะกล่องแมวบนหน้าแรก → กล่องเด้ง ฝากาง → ม่านวงกลมขยายออกจากกล่องจนเต็มจอ
   * → เปิดห้องข้างหลังม่าน → ม่านหดเปิดออกตรงกลาง เผยห้องลูกเหมียว
   */
  let entering = false;
  $('btnHomeBox').addEventListener('click', () => {
    if (entering) return;
    entering = true;
    unlockAudio();
    startMusic();   // ต้องอยู่ในจังหวะที่ผู้ใช้กด ไม่งั้นมือถือบล็อกเพลง
    sfx.bubblePop();
    later(() => sfx.trill(), 120);
    game.homeBoxPop = 1;
    const wipe = $('roomWipe');
    const btn = $('btnHomeBox').getBoundingClientRect();
    const stage = wipe.parentElement.getBoundingClientRect();
    wipe.style.setProperty('--wx', ((btn.left + btn.width / 2 - stage.left) / stage.width * 100) + '%');
    wipe.style.setProperty('--wy', ((btn.top + btn.height / 2 - stage.top) / stage.height * 100) + '%');
    setTimeout(() => {
      wipe.className = 'room-wipe in';
      setTimeout(() => {
        open();
        wipe.className = 'room-wipe out';
        setTimeout(() => { wipe.className = 'room-wipe'; entering = false; }, 560);
      }, 430);
    }, 220);
  });

  // ทุกวันใหม่จุดแดงต้องคิดใหม่ (เพดาน EXP รีเซ็ต)
  let lastDay = dayKey();
  setInterval(() => {
    if (dayKey() !== lastDay) { lastDay = dayKey(); refreshDot(); }
  }, 60000);

  /** ข้อมูลน้องเปลี่ยนจากที่อื่น (แผงทดสอบ / ซิงก์) — วาดใหม่ น้องที่ถึง Lv5 ได้ฉลองในห้อง */
  function refresh() {
    reloadCats();
    refreshDot();
    if (panel.classList.contains('hidden')) return;
    room.sync();
    paintAll();
    for (const c of roomCats()) if (levelOf(c) >= GROWN_LV) growUp(c.id);
  }

  return { refresh, open, close, openStory, openFound, planRun, afterRun, refreshDot, paintIcon, showTip, isOpen: () => !panel.classList.contains('hidden') };
}
