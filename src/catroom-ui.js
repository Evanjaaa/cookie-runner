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
  ROOM_SLOTS, fosterCats, canSend, visitorCat, cheerCat,
} from './cats.js';
import { catSkin, skinById } from './skins.js';
import { createCatWater } from './minigames/catwater.js';
import { createGroom } from './minigames/groom.js';
import { setRoomAudio, getRoomMix, setRoomMix } from './audio.js';
import { setSong, songIndex, SONG_LISTS } from './music.js';
import { fmtTime } from './minigames/catwater-draw.js';
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
import { setSexText } from './utils.js';

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
  // ระบบการ์ดส่งต่อน้อง (catcards-ui.js) — สร้างทีหลังแล้วเสียบเข้ามาทาง setCards
  let cards = null;
  // ไปเยี่ยมบ้านเพื่อน: { name, room: [น้อง], wait: น้อง|null, back } — null = บ้านของเรา
  // น้องของเพื่อนเป็นข้อมูลดูอย่างเดียว (visitorCat) ไม่มีใน cats.js จึงแตะ/ดูแล/บันทึกอะไรไม่ได้
  let visit = null;

  /** น้องที่โชว์เป็นชิปตอนนี้ — บ้านเพื่อน หรือบ้านเรา (ห้อง → กล่องหน้าประตู → รอบ้านใหม่) */
  const listCats = () => (visit
    ? [...visit.room, ...(visit.wait ? [visit.wait] : [])]
    : [...roomCats(), ...waitingCats(), ...fosterCats()]);
  const getCat = (id) => (visit ? listCats().find((c) => c.id === id) || null : catById(id));

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

  function open(selectId = null, keepVisit = false) {
    // เปิดบ้านเราเสมอ เว้นแต่ openVisit เป็นคนเรียก — แผงอาจถูกปิดทางอื่น (closeAllPanels)
    // ระหว่างเยี่ยมบ้านเพื่อนโดยไม่ผ่าน close() ถ้าไม่ล้างตรงนี้ เปิดบ้านครั้งหน้าจะเจอบ้านเพื่อน
    if (!keepVisit && visit) leaveVisitMode();
    reloadCats();
    const settled = visit ? { grown: [], moved: null } : settleHome();
    closeAllPanels();
    startPanel.classList.add('hidden');
    // เปิดจากหน้าจบรอบ (ปุ่ม "ไปบ้านน้อง" ในหน้าพบน้อง) เกมยังค้างอยู่ในสถานะตาย
    // ห้องวาดแทนหน้าแรกเฉพาะตอน READY — ต้องพาเกมกลับมาที่หน้าแรกก่อน
    if (game.state !== STATE.READY) {
      game.reset();
      game.syncMusic();
    }
    game.catRoom = room;
    setRoomAudio(true);   // ระดับเสียงชุดของห้อง (ตั้งที่ ⚙️ ในห้อง)
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

    if (visit) return;
    if (!roomCats().length && !waitingCats().length) showTip('emptyRoom');
    else {
      showTip('room');
      if (roomCats().length) showTip('drag');
    }
    if (settled.grown.length) showTip('grown');
    if (cards) cards.sync();
  }

  /** ล้างสถานะเยี่ยมบ้านเพื่อน (ไม่ปิดแผง ไม่พากลับ) */
  function leaveVisitMode() {
    visit = null;
    room.source = null;
    panel.classList.remove('visiting');
    $('crTitle').textContent = t('บ้านลูกเหมียว');
  }

  function close() {
    if (visit) leaveVisitMode();
    setClean(false);
    clearInterval(ticker);
    closePicker();
    panel.classList.add('hidden');
    game.catRoom = null;
    setRoomAudio(false);
    game.syncMusic();   // กลับเป็นเพลงหน้าแรก
    if (cards) cards.publish();
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
    if (visit) { unlockAudio(); sfx.fish(); endVisit(); return; }
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
    if (!selectedId || !getCat(selectedId) || getCat(selectedId).state === 'grown') {
      selectedId = room.selected || listCats()[0]?.id || null;
    }
    room.select(selectedId);
    paintChips();
    paintCard();
    paintArrows();
    paintCardsBtn();
    const empty = !listCats().length;
    $('crEmpty').classList.toggle('hidden', !empty);
    $('crCard').classList.toggle('hidden', empty);
    $('crActs').classList.toggle('hidden', empty);
    $('crEmptyText').textContent = visit
      ? 'บ้านนี้ยังไม่มีน้องเลย'
      : 'ตอนวิ่งลองสังเกตกล่องกระดาษริมทางนะ น้องแมวตัวเล็ก ๆ อาจรออยู่';
  }

  function paintChips() {
    const box = $('crCats');
    box.innerHTML = '';
    const list = listCats();
    for (const c of list) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cr-chip' + (c.id === selectedId ? ' on' : '') + (c.state !== 'room' ? ' wait' : '');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', c.id === selectedId ? 'true' : 'false');
      b.innerHTML = '<canvas width="40" height="40"></canvas><span><b></b><small></small></span>';
      b.querySelector('b').textContent = nameOf(c);
      b.querySelector('small').textContent = c.state === 'foster' ? 'รอบ้านใหม่'
        : c.state === 'wait' ? 'รอในกล่อง' : 'Lv.' + levelOf(c);
      paintMini(b.querySelector('canvas'), 40, (g) => drawCatFace(g, 20, 23, 0.95, catSkin(c)));
      // มีการ์ดส่งต่อค้างอยู่ = ป้ายจดหมายเล็ก ๆ มุมชิป
      if (c.card) {
        const tag = document.createElement('i');
        tag.className = 'cr-chip-card';
        tag.setAttribute('aria-label', 'มีการ์ดส่งต่อ');
        tag.textContent = '💌';
        b.appendChild(tag);
      }
      if (!visit && c.state === 'room' && needsCare(c)) {
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
    // ช่องว่างที่เหลือ — ให้เห็นว่ายังรับน้องได้อีกกี่ตัว (บ้านเพื่อนไม่ต้องโชว์)
    for (let i = visit ? ROOM_SLOTS : roomCats().length; i < ROOM_SLOTS; i++) {
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
    const c = getCat(selectedId);
    if (!c) return;
    const waiting = c.state !== 'room';
    // ปุ่มส่งต่อให้เพื่อน — ลูกแมว Lv1-2 ที่ยังไม่มีการ์ดค้าง (บ้านเพื่อนไม่มีปุ่มนี้)
    $('crSend').classList.toggle('hidden', !!visit || !canSend(c));
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
    if (visit) note = c.card ? 'น้องกำลังรอบ้านใหม่อยู่นะ' : 'น้องของ ' + visit.name;
    else if (c.card) note = cards ? cards.noteFor(c) : 'มีการ์ดส่งต่อค้างอยู่';
    else if (c.state === 'foster') note = 'บ้านเต็มแล้ว น้องรอบ้านใหม่อยู่ ส่งการ์ดหาเพื่อนที่พร้อมดูแลได้เลย';
    else if (waiting) note = 'รออยู่ในกล่องหน้าประตู จะย้ายเข้าห้องเมื่อมีที่ว่าง';
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

  $('crSend').addEventListener('click', () => {
    unlockAudio();
    sfx.fish();
    const c = catById(selectedId);
    if (c && cards) cards.openSend(c.id);
  });
  $('crCards').addEventListener('click', () => {
    unlockAudio();
    sfx.fish();
    if (cards) cards.open();
  });

  /** ป้ายตัวเลขบนปุ่มการ์ดส่งต่อ = การ์ดที่รอเราทำอะไรสักอย่าง */
  function paintCardsBtn() {
    const n = cards ? cards.pendingCount() : 0;
    const num = $('crCardsNum');
    num.textContent = n ? String(n) : '';
    num.classList.toggle('hidden', !n);
  }

  // ─────────────────────────────────────────────────────────
  // เยี่ยมบ้านเพื่อน
  // ─────────────────────────────────────────────────────────

  /**
   * เปิดห้องของเพื่อน (ดูอย่างเดียว) — ห้องเดียวกับบ้านเรา แต่น้องมาจากโปรไฟล์สาธารณะของเพื่อน
   * @param v.name  ชื่อเพื่อน
   * @param v.cats  รายการจาก homePublic() ของเพื่อน
   * @param v.focus id น้องที่จะเลือกไว้ (เช่นน้องในการ์ด)
   * @param v.back  เรียกตอนกดกลับ — พากลับไปหน้าที่มา (ห้องเราปิดให้แล้วถ้าเปิดจากข้างนอก)
   */
  function openVisit({ name, cats: list = [], focus = null, back = null }) {
    const all = list.map((p) => visitorCat(p));
    const pick = focus ? 'v:' + focus : null;
    const inRoom = all.filter((c) => c.state === 'room').slice(0, ROOM_SLOTS);
    const wait = all.find((c) => c.state !== 'room' && c.id === pick)
      || all.find((c) => c.state !== 'room') || null;
    const wasOpen = !panel.classList.contains('hidden');
    visit = { name: String(name || 'เพื่อน'), room: inRoom, wait, back, wasOpen };
    room.source = { room: inRoom, wait };
    panel.classList.add('visiting');
    $('crTitle').textContent = t('บ้านของ') + ' ' + visit.name;
    if (wasOpen) {
      room.sync();
      room.open(pick);
      selectedId = room.selected;
      paintAll();
    } else {
      open(pick, true);
    }
    if (pick) room.focus(pick);
  }

  function endVisit() {
    const v = visit;
    if (!v) return;
    leaveVisitMode();
    selectedId = null;
    if (v.wasOpen) {
      room.sync();
      room.open(null);
      paintAll();
    } else {
      close();
    }
    if (v.back) v.back();
  }

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

  // ── มินิเกม "แมวหนีน้ำ" (src/minigames/catwater.js) ──
  // เล่นกับน้องที่เลือกอยู่ในห้อง — รางวัลคือ "ได้เล่นด้วยกัน" ผ่านระบบดูแลเดิม (care 'play'):
  // ความผูกพันตามคะแนน + EXP ใต้เพดานรายวันเดิม · ไม่มีสกุลเงินใหม่
  // ให้เฉพาะตอนน้องอยากเล่น (ความสนุกต่ำกว่าเกณฑ์ เหมือนเล่นของเล่นในบ้าน) — กดเล่นรัว ๆ ปั๊มความผูกพันไม่ได้
  let mgCat = null;   // id น้องที่เล่นด้วย — น้องในห้องเท่านั้น (null = ห้องยังว่าง เล่นไม่ได้)
  let mgPick = null;  // น้องที่ผู้เล่นเลือกเองในหน้าเลือกน้อง (จำไว้ข้ามรอบ)
  let mgRes = null;
  /** ออกจากมินิเกม: น้องที่เล่นด้วยหายเศร้า แล้วให้ห้องอ่านข้อมูลน้องใหม่ทันที
   *  (เดิมตัวน้องในห้องถือข้อมูลชุดเก่า เลยยังหน้าเศร้าค้างทั้งที่เพิ่งเล่นด้วยกัน) */
  function miniCheer() {
    if (mgCat && !visit) cheerCat(mgCat);
    room.sync();
  }   // ผลการดูแลรอบล่าสุด — ลอยหัวใจ/EXP ให้เห็นตอนกลับเข้าห้อง
  const catWater = createCatWater({
    panel: $('catWaterPanel'),
    onFinish: ({ score }) => {
      const c = mgCat && catById(mgCat);
      if (!c || c.state !== 'room' || visit) return '';
      if (!careInfo(c, 'play').wants) return nameOf(c) + ' ' + t('เล่นจนพอใจแล้ว รอน้องอยากเล่นอีกครั้งนะ');
      const res = care(c.id, 'play', { aff: score >= 3000 ? 3 : score >= 1000 ? 2 : 1 });
      if (!res) return '';
      mgRes = { id: c.id, res };
      return nameOf(c) + ' ' + t('ดีใจ!') + ' 💗 +' + res.aff + (res.exp > 0 ? ' · +' + res.exp + ' EXP' : '');
    },
    onExit: () => {
      game.syncMusic();
      miniCheer();
      // เลิกเล่น / กลับ = กลับมาหน้าเลือกเกม (เปิดแผงก่อน ลูปวาดน้องถึงจะเดิน)
      $('miniPanel').classList.remove('hidden');
      paintMiniCard();
      if (mgRes) {
        const { id, res } = mgRes;
        mgRes = null;
        afterCare(id, res);
      }
    },
  });
  if (import.meta.env.DEV) window.__catWater = catWater;

  // ── มินิเกม "ตัดขนแมว" (src/minigames/groom.js) — รางวัล = ได้อาบน้ำแต่งตัว (care 'bathe') ──
  const groom = createGroom({
    panel: $('groomPanel'),
    onFinish: ({ stars }) => {
      const c = mgCat && catById(mgCat);
      if (!c || c.state !== 'room' || visit) return '';
      if (!careInfo(c, 'bathe').wants) return nameOf(c) + ' ' + t('ตัวหอมสะอาดอยู่แล้ว รอให้น้องมอมแมมก่อนนะ');
      const res = care(c.id, 'bathe', { aff: stars >= 5 ? 3 : stars >= 3 ? 2 : 1 });
      if (!res) return '';
      mgRes = { id: c.id, res };
      return nameOf(c) + ' ' + t('ดีใจ!') + ' 💗 +' + res.aff + (res.exp > 0 ? ' · +' + res.exp + ' EXP' : '');
    },
    onExit: () => {
      game.syncMusic();
      miniCheer();
      $('miniPanel').classList.remove('hidden');
      paintMiniCard();
      if (mgRes) { const { id, res } = mgRes; mgRes = null; afterCare(id, res); }
    },
  });
  if (import.meta.env.DEV) window.__groom = groom;

  // ── ⚙️ ตั้งค่าบ้านลูกเหมียว — เพลงห้อง (แผ่นเสียง) + ระดับเพลง/เอฟเฟกต์แยกจากทั้งเกม ──
  const ROOM_MIX = [['music', 'Music'], ['sfx', 'Sfx']];
  const muteMemo = {};
  function paintRoomSet() {
    const row = $('crSetPanel').querySelector('.vinyl-row[data-song="room"]');
    const list = SONG_LISTS.room, i = songIndex('room'), song = list[i];
    row.querySelector('.vinyl-title').textContent = song.title;
    row.querySelector('.vinyl-credit').textContent = t('โดย') + ' ' + song.artist + ' ' + t('จาก') + ' ' + song.from;
    row.querySelector('.vinyl-num').textContent = (i + 1) + '/' + list.length;
    row.querySelector('.vinyl').style.setProperty('--disc-hue', song.hue);
    for (const [ch, id] of ROOM_MIX) {
      const v = getRoomMix(ch);
      const bar = $('crMix' + id + 'Bar');
      if (bar.children.length !== 10) bar.innerHTML = '<i></i>'.repeat(10);
      [...bar.children].forEach((el, k) => el.classList.toggle('on', k < Math.round(v * 10)));
      $('crMix' + id + 'Num').textContent = Math.round(v * 100) + '%';
      $('crMix' + id + 'Down').disabled = v <= 0;
      $('crMix' + id + 'Up').disabled = v >= 1;
      $('crMix' + id + 'Mute').classList.toggle('muted', v <= 0);
    }
  }
  for (const [ch, id] of ROOM_MIX) {
    $('crMix' + id + 'Down').addEventListener('click', () => { setRoomMix(ch, getRoomMix(ch) - 0.1); paintRoomSet(); if (ch === 'sfx') sfx.fish(); });
    $('crMix' + id + 'Up').addEventListener('click', () => { setRoomMix(ch, getRoomMix(ch) + 0.1); paintRoomSet(); if (ch === 'sfx') sfx.fish(); });
    $('crMix' + id + 'Mute').addEventListener('click', () => {
      unlockAudio();
      if (getRoomMix(ch) > 0) { muteMemo[ch] = getRoomMix(ch); setRoomMix(ch, 0); }
      else { setRoomMix(ch, muteMemo[ch] > 0 ? muteMemo[ch] : 0.8); if (ch === 'sfx') sfx.fish(); }
      paintRoomSet();
    });
  }
  for (const btn of $('crSetPanel').querySelectorAll('.vinyl-arrow')) {
    btn.addEventListener('click', () => {
      unlockAudio();
      setSong('room', songIndex('room') + Number(btn.dataset.step));
      paintRoomSet();
      const disc = $('crSetPanel').querySelector('.vinyl');
      disc.classList.remove('swap'); void disc.offsetWidth; disc.classList.add('swap');
    });
  }
  $('crSet').addEventListener('click', () => { unlockAudio(); sfx.fish(); paintRoomSet(); $('crSetPanel').classList.remove('hidden'); });
  $('crSetClose').addEventListener('click', () => { unlockAudio(); sfx.fish(); $('crSetPanel').classList.add('hidden'); });

  /** น้องที่จะเล่นด้วย: ที่เลือกไว้เอง → น้องที่เลือกอยู่ในห้อง → น้องตัวแรกในห้อง */
  function miniCat() {
    if (visit) return null;
    const ok = (id) => { const c = id && catById(id); return c && c.state === 'room' ? c : null; };
    return ok(mgPick) || ok(selectedId) || roomCats()[0] || null;
  }

  /**
   * มินิเกมทั้งหมด (4 กรอบ) — art = ไฟล์รูปโปรโมทใน public/minigames/ (วางไฟล์ชื่อนี้แล้วรูปขึ้นเอง
   * ยังไม่มีไฟล์ = ภาพแทนสีพาสเทลกับไอคอน) · open = ฟังก์ชันเริ่มเกม (ไม่มี = เร็ว ๆ นี้)
   * เพิ่มเกมใหม่: เปลี่ยนแถวที่เป็น soon เป็นเกมจริง ไม่ต้องแก้ HTML
   */
  const MINI_GAMES = [
    { id: 'catwater', name: 'แมวหนีน้ำ', ico: '💦', art: 'minigames/catwater.png', tint: ['#9FD8F5', '#C9B5FF'],
      open: (c) => catWater.open({ skin: catSkin(c) }),
      // ป้ายใต้ชื่อเกม (แคปซูลม่วง) — สถิติคะแนน + เวลารอดนานสุด
      chips: () => { const b = catWater.best(); return [t('สถิติ') + ' ' + (b.score || 0).toLocaleString('en-US'), t('เวลา') + ' ' + fmtTime(b.time || 0)]; } },
    { id: 'groom', name: 'ตัดขนแมว', ico: '✂️', art: 'minigames/groom.png', tint: ['#FFD3E7', '#FFC98A'],
      open: (c) => groom.open({ skin: catSkin(c) }),
      chips: () => { const b = groom.best(); return [t('สถิติ') + ' ' + (b.score || 0).toLocaleString('en-US'), '★'.repeat(b.stars || 0) || t('ยังไม่เคยเล่น')]; } },
    { id: 'game3', name: 'เร็ว ๆ นี้', ico: '🐟', art: 'minigames/game3.png', tint: ['#BDF2E3', '#9FD8F5'] },
    { id: 'game4', name: 'เร็ว ๆ นี้', ico: '🎈', art: 'minigames/game4.png', tint: ['#FFF3B0', '#F7B7C9'] },
  ];
  // รูปโปรโมท: ลองโหลดครั้งเดียว โหลดได้ค่อยติดคลาส has-art (ไม่มีไฟล์ = ภาพแทนอยู่ต่อ ไม่ขึ้นรูปแตก)
  const artOk = {};
  for (const g of MINI_GAMES) {
    const img = new Image();
    img.onload = () => { artOk[g.id] = true; const el = document.querySelector(`#mgGames [data-game="${g.id}"]`); el?.classList.add('has-art'); };
    img.src = import.meta.env.BASE_URL + g.art;
  }

  function paintMiniGames() {
    const box = $('mgGames');
    box.innerHTML = '';
    const c = mgCat && catById(mgCat);
    for (const g of MINI_GAMES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.game = g.id;
      b.setAttribute('role', 'listitem');
      b.className = 'mini-game' + (g.open ? '' : ' soon') + (artOk[g.id] ? ' has-art' : '');
      b.disabled = !g.open || !c;
      b.innerHTML = '<span class="mini-art"><i class="mini-art-ph" aria-hidden="true"></i><em class="mini-soon-tag"></em></span>'
        + '<b class="mini-gname"></b><span class="mini-chips"></span>';
      const art = b.querySelector('.mini-art');
      art.style.setProperty('--art', `url("${import.meta.env.BASE_URL + g.art}")`);
      art.style.setProperty('--tint-a', g.tint[0]);
      art.style.setProperty('--tint-b', g.tint[1]);
      b.querySelector('.mini-art-ph').textContent = g.ico;
      b.querySelector('.mini-soon-tag').textContent = g.open ? '' : '🔒 ' + t('เร็ว ๆ นี้');
      b.querySelector('.mini-gname').textContent = t(g.name);
      const chips = b.querySelector('.mini-chips');
      for (const txt of g.chips ? g.chips() : [t('กำลังสร้างอยู่จ้า')]) {
        const chip = document.createElement('i');
        chip.textContent = txt;
        chips.appendChild(chip);
      }
      if (g.open) {
        b.addEventListener('click', () => {
          unlockAudio();
          sfx.fish();
          const cat = mgCat && catById(mgCat);
          if (!cat) return;   // เล่นได้เฉพาะกับน้องในห้อง
          $('miniPanel').classList.add('hidden');
          g.open(cat);
        });
      }
      box.appendChild(b);
    }
  }

  // ── น้องในหน้ามินิเกมขยับได้ ── หายใจ กะพริบตา หางแกว่ง (drawCatPose ทำให้เองตามเวลา t)
  // ทุก ~4 วิ เอียงหัวร้องทักหนึ่งที · ลูปเปิดเฉพาะตอนหน้ามินิเกมเปิดอยู่ ~30 ครั้ง/วิ แล้วหยุดเอง
  let petSkin = null, petRaf = 0, petLast = 0;
  const petT0 = performance.now();
  function drawPet(now) {
    const cv = $('mgPetArt');
    const g = cv.getContext('2d');
    const t = (now - petT0) / 1000 * 60;   // ตัววาดน้องนับเวลาเป็นเฟรม 60fps
    const ph = (t % 240) / 240;
    const chirp = ph > 0.78 && ph < 0.95 ? Math.sin(((ph - 0.78) / 0.17) * Math.PI) : 0;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    const k = cv.width / 150;
    g.setTransform(k, 0, 0, k, 0, 0);
    drawCatPose(g, 75, 138, 2.1, petSkin, t, {
      shape: { sit: 1, tilt: 0.06 + chirp * 0.14, ear: -chirp * 0.3, chirp: chirp > 0.1 ? 1 : 0, wag: Math.sin(t * 0.09) * 0.7 },
      k: 1, mood: 'happy',
    });
  }
  function startPetLoop() {
    const cv = $('mgPetArt');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== 150 * dpr) { cv.width = 150 * dpr; cv.height = 150 * dpr; }
    drawPet(performance.now());
    if (petRaf) return;
    const loop = (now) => {
      if ($('miniPanel').classList.contains('hidden') || !petSkin) { petRaf = 0; return; }
      petRaf = requestAnimationFrame(loop);
      if (now - petLast < 33) return;
      petLast = now;
      drawPet(now);
    };
    petRaf = requestAnimationFrame(loop);
  }

  /** ฝั่งซ้าย: โชว์น้องที่พาไปเล่น — ตัวน้อง ชื่อ เลเวล หลอดความสนุก (อยากเล่นไหม) หัวใจความผูกพัน */
  function paintMiniCard() {
    const c = miniCat();
    mgCat = c ? c.id : null;
    $('mgPetInfo').classList.toggle('hidden', !c);
    $('mgPetEmpty').classList.toggle('hidden', !!c);
    $('mgPetArt').classList.toggle('hidden', !c);
    $('mgPetName').textContent = c ? nameOf(c) : '';
    if (!c) petSkin = null;   // ห้องว่าง = หยุดลูปวาดน้อง
    if (c) {
      const sk = catSkin(c);
      petSkin = sk;
      startPetLoop();
      const e = expInfo(c);
      $('mgPetLv').textContent = 'Lv.' + e.lv;
      $('mgPetExp').style.width = Math.round(e.ratio * 100) + '%';
      const fun = Math.round(needNow(c, 'fun'));
      $('mgPetFun').style.width = fun + '%';
      const want = careInfo(c, 'play').wants;
      // สั้นพอให้อยู่บรรทัดเดียวบนมือถือ (รายละเอียดว่าได้อะไร อยู่ในหน้าเลือกน้อง)
      $('mgPetWant').textContent = want ? t('อยากเล่น 💗') : t('เล่นพอแล้ว');
      $('mgPetWant').classList.toggle('full', !want);
      const h = heartsOf(c);
      $('mgPetHearts').textContent = '♥'.repeat(h) + '♡'.repeat(5 - h);
    }
    $('cwSwap').classList.toggle('hidden', roomCats().length < 2);
    paintMiniGames();
  }

  /** หน้าเลือกน้อง — การ์ดน้องในห้องทุกตัว บอกด้วยว่าตัวไหนกำลังอยากเล่น (เล่นแล้วได้รางวัล) */
  function openMiniPick() {
    const grid = $('mgPickGrid');
    grid.innerHTML = '';
    const cur = miniCat();
    for (const c of roomCats()) {
      const want = careInfo(c, 'play').wants;
      const on = !!cur && c.id === cur.id;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mgpick-card' + (on ? ' on' : '');
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.innerHTML = '<canvas width="84" height="84"></canvas><b></b><small></small><i class="mgpick-want"></i>';
      b.querySelector('b').textContent = nameOf(c);
      b.querySelector('small').textContent = 'Lv.' + levelOf(c);
      const tag = b.querySelector('i');
      tag.textContent = want ? t('อยากเล่น 💗') : t('เล่นพอแล้ว');
      tag.classList.toggle('full', !want);
      paintMini(b.querySelector('canvas'), 84, (g) => drawCatFace(g, 42, 48, 1.95, catSkin(c)));
      b.addEventListener('click', () => {
        unlockAudio();
        sfx.fish();
        mgPick = c.id;
        $('mgPickPanel').classList.add('hidden');
        paintMiniCard();
        $('miniPanel').classList.remove('hidden');
      });
      grid.appendChild(b);
    }
    $('miniPanel').classList.add('hidden');
    $('mgPickPanel').classList.remove('hidden');
  }
  $('cwSwap').addEventListener('click', () => { unlockAudio(); sfx.fish(); openMiniPick(); });
  $('mgPickBack').addEventListener('click', () => {
    unlockAudio();
    sfx.fish();
    $('mgPickPanel').classList.add('hidden');
    $('miniPanel').classList.remove('hidden');
  });

  $('crMini').addEventListener('click', () => {
    unlockAudio();
    sfx.fish();
    paintMiniCard();
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
    setSexText(sex, t(c.sex === 'f' ? '♀ ตัวเมีย' : '♂ ตัวผู้'));
    sex.classList.toggle('f', c.sex === 'f');
    $('foundBreed').textContent = skinById(c.breed).name;
    $('foundStory').textContent = storyOf(c, fmtDate)[0].text;
    $('foundName').value = c.name || '';
    const fresh = mode === 'found' || mode === 'gift';
    $('foundWait').classList.toggle('hidden', !fresh || c.state !== 'wait');
    // บ้านเต็มตอนพบ = น้องรอบ้านใหม่ — ทางลัดส่งการ์ดหาเพื่อนได้เลยจากหน้านี้
    const foster = mode === 'found' && c.state === 'foster';
    $('foundFoster').classList.toggle('hidden', !foster);
    $('foundSend').classList.toggle('hidden', !foster || !cards);
    // ปุ่มสามปุ่มล้นแถว — น้องรอบ้านใหม่ไม่ต้องมีปุ่มไปบ้าน (ชิปน้องยังอยู่ในบ้านให้กดส่งทีหลังได้)
    $('foundGo').classList.toggle('hidden', foster && !!cards);
    document.querySelector('#foundPanel .found-title').textContent = mode === 'found' ? 'พบน้องแมว!'
      : mode === 'gift' ? 'น้องมาถึงบ้านแล้ว!' : 'ตั้งชื่อน้อง';
    // ตั้งชื่อน้องที่เพิ่งมาถึง: ปุ่มหลัก = บันทึกชื่อ แล้วพาไปหาน้องในบ้านต่อทันที (ดู foundGo ข้างล่าง)
    // TODO สตอรี่ตอนน้องมาถึงบ้าน — จะมีแอนิเมชันสั้น ๆ คั่นก่อนเข้าบ้าน (ผู้ใช้จะปรับทีหลัง)
    $('foundGo').textContent = fresh ? 'บันทึกชื่อ' : 'บันทึก';
    $('foundLater').textContent = fresh ? 'ไว้ทีหลัง' : 'ยกเลิก';
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
    if (foundMode === 'found' || foundMode === 'gift') {
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
    if (foundMode === 'found' || foundMode === 'gift') saveFoundName(true);
    $('foundPanel').classList.add('hidden');
    const c = catById(foundId);
    if (foundMode === 'found' && c?.state === 'wait') showTip('waiting');
  });

  // ทางลัด: น้องรอบ้านใหม่ → ส่งการ์ดหาเพื่อนเลย (ตั้งชื่อก่อน ชื่อจะได้ไปกับการ์ด)
  $('foundSend').addEventListener('click', () => {
    unlockAudio();
    sfx.fish();
    saveFoundName(true);
    $('foundPanel').classList.add('hidden');
    if (cards) cards.openSend(foundId);
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
    // บ้านเต็มแต่มีเพื่อนให้ส่งต่อ = ยังเจอกล่องได้ (น้องที่พบจะรอบ้านใหม่)
    if (!rollFind(playerLv, { canRehome: !!cards && cards.canRehome() })) return { plan: null, line: null };
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
    if (cat && cards) cards.publish();
    return cat;
  }

  // ─────────────────────────────────────────────────────────
  // ปุ่มล็อบบี้
  // ─────────────────────────────────────────────────────────

  /** จุดแดงบนปุ่มบ้านน้อง = มีน้องที่ดูแลแล้วได้ EXP อยู่ตอนนี้ */
  function refreshDot() {
    const on = roomCats().some(needsCare) || roomCats().some((c) => levelOf(c) >= GROWN_LV)
      || fosterCats().some((c) => !c.card) || (!!cards && cards.pendingCount() > 0);
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
    if (visit) { paintCardsBtn(); return; }
    room.sync();
    paintAll();
    for (const c of roomCats()) if (levelOf(c) >= GROWN_LV) growUp(c.id);
  }

  return {
    refresh, open, close, openStory, openFound, planRun, afterRun, refreshDot, paintIcon, showTip, toast,
    openVisit, paintBadge: paintCardsBtn, setCards: (c) => { cards = c; refreshDot(); },
    isOpen: () => !panel.classList.contains('hidden'),
    isVisiting: () => !!visit,
  };
}
