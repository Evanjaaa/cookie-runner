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
// ความคืบหน้า = ตัวนับตอนนี้ ลบ ค่าตอนกิจกรรมเริ่ม (ดู questBase ข้างล่าง · ผู้ใช้ 11 พ.ย. 2026 ไม่นับย้อนหลัง)
//
// ── เพิ่มภารกิจใหม่ยังไง ──
// เติมอ็อบเจกต์ในอาเรย์ข้างล่างพอ หน้าจอสร้างรายการจาก QUESTS ตรง ๆ
// ห้ามใช้ id ซ้ำกับของเก่า เพราะ id คือกุญแจที่จำว่ารับรางวัลไปแล้วหรือยัง
// ─────────────────────────────────────────────────────────────
import { loadPref, savePref } from './storage.js';
import { loadStats } from './stats.js';
import { pushMail } from './mail.js';

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
 * start / end = ปี ค.ศ. ปปปป-ดด-วว · เกมโชว์เฉพาะช่วงนี้ (เลยวันสิ้นสุด = หาย หยุดนับ ข้อที่ครบแต่ลืมรับส่งเข้าจดหมาย)
 */
export const QUEST_EVENTS = [
  { id: 'season-1', name: 'ภารกิจสะสม', start: '2026-09-01', end: '2026-12-31', quests: QUESTS },
];

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

/**
 * รวมข้อมูลจากหลังบ้านเข้า QUEST_EVENTS — ทุกกิจกรรม (ในโค้ดและที่สร้างเอง) โชว์เฉพาะช่วงวันเริ่ม–วันสิ้นสุด (ผู้ใช้ 11 พ.ย. 2026)
 * กิจกรรมที่จบแล้ว: ภารกิจที่ทำครบแต่ลืมกดรับ ส่งเข้าจดหมายให้ (settleEnded)
 */
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
  const custom = list.filter((p) => !BUILT_IN_EVENTS.some((e) => e.id === p.id) && Array.isArray(p.quests) && p.name && p.start && p.end)
    .map((p) => ({
      id: p.id, name: p.name, start: p.start, end: p.end,
      quests: p.quests.map((r) => customQuest(r, p.icons || {})).filter(Boolean),
    })).filter((e) => e.quests.length);
  const all = [...built, ...custom];
  settleEnded(all);
  QUEST_EVENTS.length = 0;
  QUEST_EVENTS.push(...all.filter((e) => (!e.start || e.start <= today) && daysLeft(e) > 0));
  tagQuests();
}

/**
 * กิจกรรมที่จบแล้ว (เลยวันสิ้นสุด): ข้อที่ทำครบแต่ยังไม่ได้กดรับ → จดหมายรางวัลฉบับเดียวต่อกิจกรรม
 * ทำครั้งเดียวต่อกิจกรรม — จำด้วยกุญแจ 'ended:<id>' ในรายการรับแล้ว (ขึ้นคลาวด์ไปด้วย)
 * นับด้วยค่าตัวนับตอนต้นวันนี้ (statsDay): วันนี้เลยวันจบแล้ว และค่าต้นวันจดก่อนเล่นตาแรกของวัน
 * จึงเท่ากับค่าตอนกิจกรรมจบพอดี — ที่วิ่งหลังกิจกรรมจบไม่นับ
 * ไม่เคยเห็นกิจกรรมนี้ (ไม่มีค่าตั้งต้น) / กิจกรรมทดสอบ = ไม่มีอะไรให้ส่ง
 */
function settleEnded(events) {
  const c = loadClaimed();
  const bases = loadPref(BASE_KEY, null) || {};
  let dirty = false;
  for (const ev of events) {
    if (daysLeft(ev) > 0 || c.includes('ended:' + ev.id)) continue;
    c.push('ended:' + ev.id);
    dirty = true;
    const base = bases[ev.id];
    if (!base || ev.test) continue;
    const now = dayStart();
    const got = { gold: 0, gems: 0 }, names = [];
    for (const q of ev.quests) {
      if (c.includes(String(q.id))) continue;
      if ((now[q.stat] || 0) - (base[q.stat] || 0) < q.goal) continue;
      c.push(String(q.id));
      got.gold += q.reward.gold || 0;
      got.gems += q.reward.gems || 0;
      names.push(q.name);
    }
    if (ev.bonus && ev.quests.every((q) => c.includes(String(q.id))) && !c.includes('bonus:' + ev.id)) {
      c.push('bonus:' + ev.id);
      got.gold += ev.bonus.gold || 0;
      got.gems += ev.bonus.gems || 0;
      names.push('รางวัลใหญ่ทำครบทุกภารกิจ');
    }
    if (!names.length) continue;
    const reward = {};
    if (got.gold) reward.gold = got.gold;
    if (got.gems) reward.gems = got.gems;
    pushMail({
      id: 'quest-end-' + ev.id,
      from: 'ทีมงาน MeowZing',
      title: `รางวัลกิจกรรม "${ev.name}"`,
      body: `กิจกรรม "${ev.name}" จบแล้ว ภารกิจที่ทำครบแต่ยังไม่ได้กดรับ ส่งรางวัลมาให้ทางจดหมายนะ` + '\n\n• ' + names.join('\n• '),
      at: todayKey(),
      reward,
    });
  }
  if (dirty) savePref(KEY, c);
}

// ── ภารกิจนับจากวันเริ่มกิจกรรม (ผู้ใช้ 11 พ.ย. 2026) ──
// ตัวนับใน stats.js เป็นยอดสะสมตลอดชีพ — ภารกิจของแต่ละกิจกรรมนับเฉพาะส่วนที่เพิ่มหลังกิจกรรมเริ่ม
//   statsDay   ค่าตัวนับตอนเปิดเกมครั้งแรกของวัน (ก่อนเล่นตาแรกของวันนั้น)
//   questBase  { [id กิจกรรม]: ค่าตัวนับ } — จดครั้งแรกที่เกมเห็นกิจกรรมที่เริ่มแล้ว = ค่าตอนต้นวันนั้น
// เล่นไม่ได้ถ้าไม่เปิดเกม ค่าต้นวันแรกที่เปิดหลังกิจกรรมเริ่มจึงเท่ากับค่าตอนกิจกรรมเริ่มพอดี
// สองคีย์นี้ขึ้นคลาวด์เองในก้อน extra (storage.js) · ข้อที่รับไปแล้วยังนับว่ารับแล้วเหมือนเดิม
const DAY_KEY = 'statsDay';
const BASE_KEY = 'questBase';

function dayStart() {
  const today = todayKey();
  let d = loadPref(DAY_KEY, null);
  if (!d || d.date !== today || !d.stats) {
    d = { date: today, stats: { ...loadStats() } };
    savePref(DAY_KEY, d);
  }
  return d.stats;
}

/** ค่าตัวนับตอนกิจกรรมนี้เริ่ม (ของผู้เล่นคนนี้) · ยังไม่เคยจด + กิจกรรมเริ่มแล้ว = จดเดี๋ยวนี้ */
function baseOf(evId) {
  const all = loadPref(BASE_KEY, null) || {};
  if (all[evId]) return all[evId];
  const ev = QUEST_EVENTS.find((e) => e.id === evId);
  if (!ev || (ev.start && ev.start > todayKey())) return null;
  all[evId] = { ...dayStart() };
  savePref(BASE_KEY, all);
  return all[evId];
}

/** ภารกิจรู้ว่าตัวเองอยู่กิจกรรมไหน (ใช้หาค่าตั้งต้น) */
function tagQuests() {
  for (const ev of QUEST_EVENTS) for (const q of ev.quests) q.ev = ev.id;
}
dayStart();   // จดค่าต้นวันตั้งแต่เปิดเกม ก่อนเล่นตาแรก
tagQuests();

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
  const base = q.ev ? baseOf(q.ev) : null;
  const raw = Math.max(0, (loadStats()[q.stat] || 0) - (base?.[q.stat] || 0));
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
