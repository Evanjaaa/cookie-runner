// src/quests.js
// ─────────────────────────────────────────────────────────────
// กิจกรรม — ภารกิจสะสมที่ทำครบแล้วกดรับรางวัลได้
//
// นี่คือทางหาเพชรทางแรกในเกม (ก่อนหน้านี้เพชรมีแค่ก้อนตั้งต้นกับในจดหมาย)
// ตัวเลขรางวัลจึงตั้งให้ "พอสุ่มได้จริง" ไม่ใช่เศษเงิน — 300 เพชร = สุ่มสมบัติ 2 ครั้ง
//
// ── ภารกิจหนึ่งข้อประกอบด้วย ──
//   stat  ชื่อตัวนับใน stats.js ที่ใช้วัด — ไม่มีภารกิจไหนนับเองแยก
//   goal  ถึงเท่านี้ถือว่าครบ
//   show  แปลงค่าดิบเป็นตัวเลขที่คนอ่านรู้เรื่อง (วินาที → นาที ฯลฯ)
//
// ที่ผูกทุกข้อไว้กับตัวนับใน stats.js แทนที่จะให้แต่ละข้อนับเอง เพราะตัวนับ
// พวกนั้นเพิ่มอย่างเดียวไม่เคยลด ภารกิจที่เคยครบแล้วจึงไม่มีทางกลับไปไม่ครบ
// ต่อให้เพิ่มภารกิจใหม่ทีหลัง ของเก่าที่ทำไว้แล้วก็นับให้ย้อนหลังเองทันที
//
// ── เพิ่มภารกิจใหม่ยังไง ──
// เติมอ็อบเจกต์ในอาเรย์ข้างล่างพอ หน้าจอสร้างรายการจาก QUESTS ตรง ๆ
// ห้ามใช้ id ซ้ำกับของเก่า เพราะ id คือกุญแจที่จำว่ารับรางวัลไปแล้วหรือยัง
// ─────────────────────────────────────────────────────────────
import { loadPref, savePref } from './storage.js';
import { loadStats } from './stats.js';

const KEY = 'questsClaimed';


const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const EN_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "1 ก.ย. 69 – 31 ธ.ค. 69" (ไทย ปี พ.ศ. สองหลัก) หรือ "1 Sep – 31 Dec 2026" */
export function seasonText(ev, lang = 'th') {
  const [a, b] = [ev.start, ev.end].map((s) => s.split('-').map(Number));
  if (lang === 'en') {
    const d = ([y, m, dd], year) => `${dd} ${EN_MON[m - 1]}${year ? ' ' + y : ''}`;
    return `${d(a, a[0] !== b[0])} – ${d(b, true)}`;
  }
  const d = ([y, m, dd]) => `${dd} ${TH_MON[m - 1]} ${(y + 543) % 100}`;
  return `${d(a)} – ${d(b)}`;
}

/** มิลลิวินาทีที่เหลือจนจบวันสุดท้ายของกิจกรรม · หมดเวลาแล้ว = 0 */
export function msLeft(ev) {
  const [y, m, d] = ev.end.split('-').map(Number);
  return Math.max(0, new Date(y, m - 1, d + 1) - Date.now());
}

/** เหลืออีกกี่วันถึงวันสุดท้ายของกิจกรรม (นับวันสุดท้ายรวมด้วย) · หมดเวลาแล้ว = 0 */
export function daysLeft(ev) {
  const [y, m, d] = ev.end.split('-').map(Number);
  return Math.max(0, Math.ceil((new Date(y, m - 1, d + 1) - Date.now()) / 86400000));
}

export const QUESTS = [
  {
    id: 'run-30min',
    name: 'นักวิ่งอึด',
    note: 'วิ่งสะสมครบ 30 นาที',
    icon: '⏱️',
    stat: 'seconds',
    goal: 30 * 60,
    show: (v) => Math.floor(v / 60),
    unit: 'นาที',
    reward: { gems: 300 },
  },
  {
    id: 'runs-10',
    name: 'ลงสนามสิบตา',
    note: 'เล่นจบครบ 10 ตา',
    icon: '🏃',
    stat: 'runs',
    goal: 10,
    unit: 'ตา',
    reward: { gold: 5000 },
  },
  {
    id: 'meters-10k',
    name: 'ระยะทางหมื่นเมตร',
    note: 'วิ่งสะสมครบ 10,000 เมตร',
    icon: '🐾',
    stat: 'meters',
    goal: 10000,
    unit: 'ม.',
    reward: { gems: 250 },
  },
  {
    id: 'score-1m',
    name: 'ล้านแรกของเจ้าเหมียว',
    note: 'ทำคะแนนสะสมครบ 1,000,000',
    icon: '⭐',
    stat: 'score',
    goal: 1000000,
    unit: 'คะแนน',
    reward: { gems: 500 },
  },
  {
    id: 'pulls-20',
    name: 'ขาประจำตู้กาช่า',
    note: 'กดสุ่มกาช่าครบ 20 ครั้ง',
    icon: '🎰',
    stat: 'pulls',
    goal: 20,
    unit: 'ครั้ง',
    reward: { gold: 12000 },
  },
  {
    id: 'upgrade-5',
    name: 'ช่างตีบวกมือใหม่',
    note: 'ตีบวกสมบัติสำเร็จ 5 ครั้ง',
    icon: '🔨',
    stat: 'upgrades',
    goal: 5,
    unit: 'ครั้ง',
    reward: { gems: 200 },
  },
];

/**
 * กิจกรรม = แท็บหนึ่งใบบนหน้ากิจกรรม (ผู้ใช้ 9 พ.ย. 2026: "อนาคตมีหลายกิจกรรมพร้อมกัน")
 * เพิ่มกิจกรรมใหม่ = เติมอ็อบเจกต์ที่นี่ (id ห้ามซ้ำ) แล้วใส่รูปได้ที่หลังบ้านแท็บ "รูปกิจกรรม"
 * start / end = ปี ค.ศ. ปปปป-ดด-วว · ตอนนี้ใช้แสดงผลอย่างเดียว ยังไม่ได้ปิดภารกิจเมื่อหมดเวลา
 */
export const QUEST_EVENTS = [
  { id: 'season-1', name: 'ภารกิจสะสม', start: '2026-09-01', end: '2026-12-31', quests: QUESTS },
];

// ── กิจกรรมปลอมไว้ดูหน้าตาแถบแท็บ (ผู้ใช้ 9 พ.ย. 2026) — ลบบล็อกนี้ทั้งก้อนได้เมื่อมีกิจกรรมจริง ──
// โผล่เฉพาะตอนพัฒนา (npm run dev) หรือเปิดลิงก์ที่ต่อท้าย ?testevents · ผู้เล่นทั่วไปไม่เห็น
// test: true = กดรับไม่ได้ (claimQuest ปฏิเสธ) และไม่นับจุดแดงบนปุ่มกิจกรรม — ไม่มีทางได้เพชร/ทองปลอมเข้ากระเป๋า
if (import.meta.env.DEV || new URLSearchParams(location.search).has('testevents')) {
  const fake = (id, name, note, stat, goal, unit, reward, icon) => ({ id: 'test-' + id, name, note, stat, goal, unit, reward, icon, test: true });
  QUEST_EVENTS.push(
    { id: 'test-treasure', name: 'สมบัติแห่งความสุข', start: '2026-11-01', end: '2026-11-12', test: true, bonus: { gems: 300, gold: 5000 }, quests: [
      fake('t1', 'นักล่าสมบัติ', 'วิ่งสะสมครบ 5,000 เมตร', 'meters', 5000, 'ม.', { gems: 100 }, '🧭'),
      fake('t2', 'หีบใบแรก', 'เล่นจบครบ 3 ตา', 'runs', 3, 'ตา', { gold: 1500 }, '🧰'),
      fake('t3', 'มงกุฎเพชร', 'ทำคะแนนสะสมครบ 500,000', 'score', 500000, 'คะแนน', { gems: 300 }, '👑'),
    ] },
    { id: 'test-chef', name: 'เชฟเหมียวมือโปร', start: '2026-11-05', end: '2026-11-22', test: true, bonus: { gems: 500 }, quests: [
      fake('c1', 'ลูกมือในครัว', 'เล่นจบครบ 5 ตา', 'runs', 5, 'ตา', { gold: 2000 }, '🥄'),
      fake('c2', 'อบคุกกี้', 'วิ่งสะสมครบ 10 นาที', 'seconds', 600, 'วินาที', { gems: 80 }, '🍪'),
      fake('c3', 'เค้กสามชั้น', 'วิ่งสะสมครบ 20,000 เมตร', 'meters', 20000, 'ม.', { gems: 200 }, '🎂'),
      fake('c4', 'เชฟใหญ่', 'ทำคะแนนสะสมครบ 2,000,000', 'score', 2000000, 'คะแนน', { gold: 8000 }, '👨‍🍳'),
    ] },
    { id: 'test-daily', name: 'ของขวัญรายวัน', start: '2026-11-01', end: '2026-12-05', test: true, quests: [
      fake('d1', 'แวะมาทักทาย', 'เล่นจบครบ 1 ตา', 'runs', 1, 'ตา', { gold: 500 }, '👋'),
      fake('d2', 'ลองเสี่ยงดวง', 'กดสุ่มกาช่าครบ 1 ครั้ง', 'pulls', 1, 'ครั้ง', { gems: 30 }, '🎲'),
    ] },
    { id: 'test-autumn', name: 'อีเวนต์ใบไม้ร่วง', start: '2026-11-01', end: '2026-11-30', test: true, quests: [
      fake('a1', 'เก็บใบไม้', 'วิ่งสะสมครบ 3,000 เมตร', 'meters', 3000, 'ม.', { gold: 1000 }, '🍂'),
      fake('a2', 'ผจญภัยในป่า', 'เล่นจบครบ 15 ตา', 'runs', 15, 'ตา', { gems: 150 }, '🌲'),
      fake('a3', 'ฟักทองยักษ์', 'ทำคะแนนสะสมครบ 3,000,000', 'score', 3000000, 'คะแนน', { gems: 400 }, '🎃'),
    ] },
    { id: 'test-star', name: 'เทศกาลดาวตก', start: '2026-12-01', end: '2026-12-25', test: true, bonus: { gems: 1000, gold: 20000 }, quests: [
      fake('s1', 'ขอพรดวงแรก', 'กดสุ่มกาช่าครบ 5 ครั้ง', 'pulls', 5, 'ครั้ง', { gems: 60 }, '⭐'),
      fake('s2', 'นักดูดาว', 'วิ่งสะสมครบ 45 นาที', 'seconds', 2700, 'วินาที', { gold: 6000 }, '🔭'),
      fake('s3', 'ช่างตีบวกดวงดาว', 'ตีบวกสมบัติสำเร็จ 10 ครั้ง', 'upgrades', 10, 'ครั้ง', { gems: 250 }, '🔨'),
      fake('s4', 'พรแห่งปี', 'วิ่งสะสมครบ 50,000 เมตร', 'meters', 50000, 'ม.', { gems: 500 }, '🌌'),
      fake('s5', 'ดาวดวงสุดท้าย', 'ทำคะแนนสะสมครบ 5,000,000', 'score', 5000000, 'คะแนน', { gold: 20000 }, '💫'),
    ] },
  );
}

// ── กิจกรรมจากหลังบ้าน (ผู้ใช้ 9 พ.ย. 2026) — ตาราง event_pages (supabase/event-pages.sql) ──
// แถวที่ id ตรงกับกิจกรรมในโค้ด = ทับแค่วันที่กับรูปภารกิจ · แถวอื่น = กิจกรรมที่สร้างเองทั้งหน้า
const BUILT_IN_EVENTS = [...QUEST_EVENTS];

/** ตัวนับที่ภารกิจจากหลังบ้านเลือกวัดได้ · scale = ค่าดิบต่อหนึ่งหน่วยที่แอดมินกรอก */
export const QUEST_STATS = [
  { id: 'seconds', label: 'เวลาวิ่งสะสม', unit: 'นาที', scale: 60, note: 'วิ่งสะสมครบ {n} นาที', icon: '⏱️' },
  { id: 'runs', label: 'เล่นจบกี่ตา', unit: 'ตา', scale: 1, note: 'เล่นจบครบ {n} ตา', icon: '🏃' },
  { id: 'meters', label: 'ระยะทางสะสม', unit: 'เมตร', scale: 1, note: 'วิ่งสะสมครบ {n} เมตร', icon: '🐾' },
  { id: 'score', label: 'คะแนนสะสม', unit: 'คะแนน', scale: 1, note: 'ทำคะแนนสะสมครบ {n}', icon: '⭐' },
  { id: 'pulls', label: 'สุ่มกาช่า', unit: 'ครั้ง', scale: 1, note: 'กดสุ่มกาช่าครบ {n} ครั้ง', icon: '🎰' },
  { id: 'upgrades', label: 'ตีบวกสำเร็จ', unit: 'ครั้ง', scale: 1, note: 'ตีบวกสมบัติสำเร็จ {n} ครั้ง', icon: '🔨' },
];

function customQuest(r, icons) {
  const st = QUEST_STATS.find((x) => x.id === r?.stat);
  const goal = Number(r?.goal);
  if (!st || !r.id || !r.name || !(goal > 0)) return null;
  const reward = {};
  if (r.gems > 0) reward.gems = Number(r.gems);
  if (r.gold > 0) reward.gold = Number(r.gold);
  return {
    id: String(r.id), name: r.name, note: r.note || '', stat: st.id, goal, reward, icon: st.icon, image: icons[r.id] || '',
    ...(st.scale > 1 ? { show: (v) => Math.floor(v / st.scale) } : {}),
  };
}

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** รวมข้อมูลจากหลังบ้านเข้า QUEST_EVENTS · กิจกรรมที่สร้างเองโชว์เฉพาะช่วงวันที่ตั้งไว้ · กิจกรรมในโค้ดยังโชว์ตลอดเหมือนเดิม */
export function applyEventPages(pages) {
  const list = Array.isArray(pages) ? pages : [];
  // แถวของกิจกรรมในโค้ดที่ quests เป็น [] = แอดมินกดลบ (กู้คืนได้จากหลังบ้าน)
  const removed = (e) => { const p = list.find((x) => x.id === e.id); return Array.isArray(p?.quests) && !p.quests.length; };
  const built = BUILT_IN_EVENTS.filter((e) => !removed(e)).map((e) => {
    const p = list.find((x) => x.id === e.id);
    if (!p) return e;
    const icons = p.icons || {};
    return { ...e, start: p.start || e.start, end: p.end || e.end, quests: e.quests.map((q) => (icons[q.id] ? { ...q, image: icons[q.id] } : q)) };
  });
  const today = todayKey();
  const custom = list.filter((p) => !BUILT_IN_EVENTS.some((e) => e.id === p.id) && Array.isArray(p.quests) && p.name && p.start && p.end
    && p.start <= today && daysLeft(p) > 0).map((p) => ({
    id: p.id, name: p.name, start: p.start, end: p.end,
    quests: p.quests.map((r) => customQuest(r, p.icons || {})).filter(Boolean),
  })).filter((e) => e.quests.length);
  QUEST_EVENTS.length = 0;
  QUEST_EVENTS.push(...built, ...custom);
}

let claimed = null;

function loadClaimed() {
  if (claimed) return claimed;
  const saved = loadPref(KEY, null);
  claimed = Array.isArray(saved) ? saved.map(String) : [];
  return claimed;
}

export function isClaimed(id) {
  return loadClaimed().includes(String(id));
}

/**
 * สถานะของภารกิจหนึ่งข้อ ณ ตอนนี้
 *
 * cur ถูกตัดไม่ให้เกิน goal เพราะเลข "42/30" อ่านแล้วสะดุด
 * ส่วน ratio ใช้กับความยาวหลอด จึงต้องอยู่ในช่วง 0-1 เสมอ
 */
export function questState(q) {
  const raw = loadStats()[q.stat] || 0;
  const cur = Math.min(raw, q.goal);
  const done = raw >= q.goal;
  return {
    raw,
    cur,
    done,
    claimed: isClaimed(q.id),
    ratio: q.goal > 0 ? cur / q.goal : 0,
  };
}

/** เรียงของที่กดรับได้ขึ้นก่อน แล้วค่อยของที่ยังทำอยู่ ปิดท้ายด้วยของที่รับไปแล้ว */
export function questList(ev) {
  return ev.quests.map((q) => ({ q, st: questState(q) })).sort((a, b) => {
    const rank = (x) => (x.st.claimed ? 2 : x.st.done ? 0 : 1);
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    // ในกลุ่มเดียวกัน เอาข้อที่ใกล้ครบที่สุดขึ้นก่อน — เห็นแล้วอยากไปทำต่อ
    return b.st.ratio - a.st.ratio;
  });
}

/** มีของค้างให้กดรับกี่ข้อ (รวมรางวัลใหญ่ที่รับได้) — ตัวเลขนี้คุมจุดแดงบนปุ่มกิจกรรม */
export function claimableCount(ev = null) {
  const evs = ev ? [ev] : QUEST_EVENTS.filter((e) => !e.test);
  let n = 0;
  for (const e of evs) {
    n += e.quests.filter((q) => { const st = questState(q); return st.done && !st.claimed; }).length;
    const b = bonusState(e);
    if (b?.done && !b.claimed) n++;
  }
  return n;
}

/**
 * รางวัลใหญ่ท้ายกิจกรรม (ผู้ใช้ 10 พ.ย. 2026): รับรางวัลครบทุกภารกิจของกิจกรรมนั้น = ได้ของพิเศษเพิ่ม
 * กิจกรรมที่มี bonus: { gems, gold } เท่านั้น · จำว่ารับแล้วด้วยกุญแจ 'bonus:<id กิจกรรม>' ในรายการเดียวกับภารกิจ
 * @returns {{ n, got, done, claimed } | null}
 */
export function bonusState(ev) {
  if (!ev?.bonus || !ev.quests?.length) return null;
  const got = ev.quests.filter((q) => isClaimed(q.id)).length;
  return { n: ev.quests.length, got, done: got === ev.quests.length, claimed: isClaimed('bonus:' + ev.id) };
}
export function claimBonus(ev) {
  const st = bonusState(ev);
  if (!st) return { ok: false, reason: 'กิจกรรมนี้ไม่มีรางวัลใหญ่' };
  if (ev.test) return { ok: false, reason: 'กิจกรรมทดสอบ — กดรับจริงไม่ได้' };
  if (!st.done) return { ok: false, reason: 'รับรางวัลให้ครบทุกภารกิจก่อนนะ' };
  if (st.claimed) return { ok: false, reason: 'รับรางวัลใหญ่ไปแล้ว' };
  loadClaimed().push('bonus:' + ev.id);
  savePref(KEY, claimed);
  return { ok: true, reward: ev.bonus };
}

/**
 * รับรางวัลหนึ่งข้อ
 *
 * ไม่จ่ายของเอง — คืนจำนวนที่ต้องจ่ายให้ผู้เรียกไปเติมผ่านทางของมันเอง
 * (ทองต้องผ่าน gacha.js เพชรต้องผ่าน vault.js) ท่าเดียวกับ claimMail()
 * ถ้าเขียนลง localStorage ข้ามหลังสองไฟล์นั้น ตัวเลขบนจอจะไม่ขยับ
 * แล้วการเขียนเซฟครั้งถัดไปของมันจะทับค่าที่เราเพิ่งใส่ไป
 */
export function claimQuest(id) {
  const q = QUEST_EVENTS.flatMap((e) => e.quests).find((x) => x.id === id);
  if (!q) return { ok: false, reason: 'ไม่พบภารกิจนี้' };
  if (q.test) return { ok: false, reason: 'กิจกรรมทดสอบ — กดรับจริงไม่ได้' };

  const st = questState(q);
  if (!st.done) return { ok: false, reason: 'ยังทำไม่ครบ' };
  if (st.claimed) return { ok: false, reason: 'รับรางวัลนี้ไปแล้ว' };

  loadClaimed().push(String(id));
  savePref(KEY, claimed);
  return { ok: true, quest: q, reward: q.reward };
}
