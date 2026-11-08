// realtime/src/index.js
// ─────────────────────────────────────────────────────────────
// ห้องออนไลน์ปราสาทแมวเหมียว (ผู้ใช้ 8 พ.ย. 2026 — CASTLE_DESIGN.md หัวข้อ 8)
//
//   Worker รับ WebSocket ที่ /castle?room=castle-N → ส่งต่อให้ Durable Object ของห้องนั้น
//   1 ห้อง = ทั้งปราสาท 3 ชั้น ไม่เกิน 20 ตัว · เต็ม = ตอบ { t: 'full' } แล้วปิด → เกมลองห้องถัดไปเอง
//
//   ซิงก์แบบส่งเฉพาะเหตุการณ์ (เริ่มเดิน/หยุด/หัน/กระโดด/นั่ง/ทำท่า/เปลี่ยนชั้น) + ย้ำตำแหน่งห่าง ๆ ตอนเดิน
//   เครื่องผู้เล่นคำนวณการเดินของแมวตัวอื่นต่อเอง (เดินตามความเร็วเดิน/วิ่งของเกม) — ไม่ส่งพิกัดถี่ ๆ
//
//   ใช้ WebSocket Hibernation: ห้องเงียบ = Durable Object หลับ ไม่คิดเวลา · ping/pong ตอบเองโดยไม่ปลุกห้อง
//
// ข้อความ (JSON · ตัวย่อสั้นให้ข้อความเล็ก):
//   เกม → ห้อง   hi   { name, skin, outfit, tk, ...สถานะ }   เข้าห้อง (ครั้งแรก · tk = ตั๋วล็อกอิน Supabase ถ้ามี)
//                look { name, skin, outfit }             เปลี่ยนชื่อ/ตัว/ชุด
//                st   { w, x, y, dir, mv, run, air, vy, on, sit, em, ea }   สถานะเปลี่ยน
//   ห้อง → เกม   welcome { id, me: { m, name }, peers: [...] } · join { p } · look { id, ... } · st { id, ... } · leave { id }
//                nosit { w, sit, x } (ที่นั่งนี้มีคนนั่งก่อนแล้ว) · full
//
// ล็อกอิน (ผู้ใช้ 8 พ.ย.: "เข้าได้แต่พิมพ์คุยไม่ได้"): เซิร์ฟเวอร์ถาม Supabase เองว่าตั๋วนี้เป็นใคร (ไม่เชื่อเครื่องผู้เล่น)
//   m = 1 สมาชิก (ผูกอีเมลแล้ว) — ชื่อดึงจากตาราง players เอง ปลอมชื่อไม่ได้ · m = 0 ผู้มาเยือน/ไม่ล็อกอิน — เดินเล่น ทำท่าได้ พิมพ์คุยไม่ได้
//   ต้องตั้ง SUPABASE_URL + SUPABASE_ANON_KEY (README) · ไม่ตั้ง = ทุกคนเป็นผู้มาเยือน (เกมยังเล่นได้ปกติ)
//   say { k, v } → say { id, w, k, v } ให้ทุกตัวในชั้นเดียวกัน · ไม่ผ่าน = sayno { why: fast|member|link|number|word|same|bad }
// รายงาน/บล็อกทำฝั่งเกม: บล็อก = ซ่อนข้อความของรหัสนั้นในเครื่อง · รายงาน = ส่งเข้ากล่องแจ้งปัญหาเดิม (bug_reports) พร้อมรหัส u
// ─────────────────────────────────────────────────────────────
import { DurableObject } from 'cloudflare:workers';

const MAX = 20;                       // ต่อห้อง
const MAX_MSG = 600;                  // ไบต์ต่อข้อความ (hi ยาวได้ถึง MAX_HI — มีตั๋วล็อกอิน)
const MAX_HI = 4096;
const WORLDS = new Set(['hall', 'lounge', 'roof']);
const ID_RE = /^[\w:.-]{1,64}$/;      // รหัสตัว/ชุด/ที่นั่ง/พื้น/ท่า

// เว็บที่ต่อเข้ามาได้ — เกมจริง · ลิงก์ทดสอบ · Preview ของ Vercel · เครื่องตัวเอง/วง Wi-Fi ตอนพัฒนา
const ORIGINS = [
  /^https:\/\/meowzing\.vercel\.app$/,
  /^https:\/\/meowzing-test\.vercel\.app$/,
  /^https:\/\/meowzing-[a-z0-9-]+-evanjaaas-projects\.vercel\.app$/,
  /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/,
];

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/health') return new Response('ok');
    if (url.pathname !== '/castle') return new Response('not found', { status: 404 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    const origin = req.headers.get('Origin') || '';
    if (!ORIGINS.some((re) => re.test(origin))) return new Response('forbidden', { status: 403 });
    const want = url.searchParams.get('room') || '';
    const room = /^castle-\d{1,2}$/.test(want) ? want : 'castle-1';
    return env.CASTLE.get(env.CASTLE.idFromName(room)).fetch(req);
  },
};

// ── ตรวจ/ทำความสะอาดข้อมูลจากเกม (ห้ามเชื่ออะไรจากเครื่องผู้เล่น) ──
const num = (v, lo, hi, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v * 10) / 10)) : d);
const ident = (v) => (typeof v === 'string' && ID_RE.test(v) ? v : '');
// อักขระควบคุม / ตัวมองไม่เห็น / ตัวกลับทิศข้อความ — สร้างจากเลขรหัส (เขียนเป็นตัวจริงในซอร์สไม่ได้: บางตัวคือขึ้นบรรทัด)
const BAD_CHARS = new RegExp('[' + [[0x00, 0x1f], [0x7f, 0x9f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2066, 0x2069]]
  .map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + ']', 'g');
function cleanName(v) {
  if (typeof v !== 'string') return 'เหมียว';
  // ตัดอักขระควบคุม/ช่องว่างแปลก ๆ · ไม่เกิน 16 ตัว (นับตามตัวอักษรจริง ไม่ใช่ไบต์)
  const s = [...v.replace(BAD_CHARS, '').trim()].slice(0, 16).join('');
  return s || 'เหมียว';
}
function cleanLook(m, user = null) {
  // สมาชิก: ชื่อจากฐานข้อมูล (ตั้งผ่าน claim_name ไม่ซ้ำใคร) · ยังไม่มีชื่อในฐานข้อมูล = ใช้ชื่อจากเกม
  return {
    name: user?.name ? cleanName(user.name) : cleanName(m.name),
    skin: ident(m.skin) || 'orange', outfit: ident(m.outfit) || 'none', m: user?.member ? 1 : 0,
    u: user?.id ? String(user.id).slice(0, 64) : '',   // รหัสผู้เล่นที่ห้องตรวจแล้ว — เกมใช้บล็อก/รายงาน (ไม่ล็อกอินเลย = '')
  };
}
/**
 * ตั๋วล็อกอินนี้เป็นใคร — ถาม Supabase ตรง ๆ (ใช้ได้ทั้งกุญแจแบบเก่า/ใหม่ของโปรเจกต์) · ไม่ผ่าน/ไม่ได้ตั้งค่า = null (ผู้มาเยือน)
 * สมาชิก = ผูกอีเมลแล้ว (ไม่ใช่บัญชีผู้มาเยือนแบบไม่ระบุตัวตน) · ชื่ออ่านจากแถวของตัวเองใน players (RLS ให้อ่านแถวตัวเอง)
 */
async function whoIs(env, token) {
  if (typeof token !== 'string' || token.length < 20 || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  const base = String(env.SUPABASE_URL).replace(/\/+$/, '');
  const headers = { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token };
  try {
    const r = await fetch(base + '/auth/v1/user', { headers, signal: AbortSignal.timeout(3000) });
    if (!r.ok) return null;
    const u = await r.json();
    if (!u?.id) return null;
    const member = !u.is_anonymous && !!u.email;
    let name = null;
    if (member) {
      const q = await fetch(`${base}/rest/v1/players?select=name&id=eq.${encodeURIComponent(u.id)}`, { headers, signal: AbortSignal.timeout(3000) });
      if (q.ok) name = (await q.json())?.[0]?.name || null;
    }
    return { id: u.id, member, name };
  } catch {
    return null;
  }
}
function cleanState(m) {
  return {
    w: WORLDS.has(m.w) ? m.w : 'hall',
    x: num(m.x, 0, 5000, 400), y: num(m.y, -600, 600, 330),
    dir: m.dir < 0 ? -1 : 1,
    mv: m.mv ? 1 : 0, run: m.run ? 1 : 0,
    air: m.air ? 1 : 0, vy: num(m.vy, -40, 40),
    on: ident(m.on), sit: ident(m.sit),
    em: ident(m.em), ea: num(m.ea, 0, 100000),
  };
}


// ── แชตแยกชั้น (ผู้ใช้ 8 พ.ย.: ฟองบนหัว + กล่องย้อนหลัง · ผู้มาเยือนส่งประโยคสำเร็จรูป/สติกเกอร์ได้ · พิมพ์อิสระเฉพาะสมาชิก) ──
// say { k: 'p' ประโยคสำเร็จรูป | 's' สติกเกอร์ | 'x' พิมพ์เอง, v } → ส่งให้ทุกตัวที่อยู่ชั้นเดียวกัน (รวมคนส่ง = ยืนยันว่าผ่าน)
//   p / s = ส่งแค่รหัส (เกมแปลงเป็นข้อความ/ภาพเอง) — ไม่มีทางมีคำไม่ดี
//   x = สมาชิกเท่านั้น · ไม่เกิน 60 ตัว · ห้ามลิงก์/เบอร์โทร/คำหยาบ · ห้ามซ้ำเดิมใน 10 วิ
// ส่งได้ 3 ข้อความติดกัน แล้วเติม 1 ข้อความทุก 1.5 วิ · ไม่ผ่าน = sayno { why } ให้เกมบอกผู้เล่น
const TEXT_MAX = 60;
// คำหยาบไทย (ตัดช่องว่าง/จุด/ตัวซ้ำก่อนเทียบ) — ระวังคำปกติที่มีคำพวกนี้อยู่ข้างใน (หีบ สัดส่วน) จึงเขียนข้อยกเว้นไว้
const BAD_TH = [/ควย/, /เหี้ย/, /สัส/, /สัด(?!ส่วน)/, /เย็ด/, /หี(?!บ)/, /แตด/, /มึง/, /ระยำ/, /อีดอก/, /ดอกทอง/, /จัญไร/, /ส้นตีน/, /ไอ้?สัตว์/, /ชาติหมา/, /พ่อมึง/, /แม่มึง/, /อีเวร/, /ไอ้เวร/];
const BAD_EN = /\b(fuck\w*|f+u+c+k+|shit\w*|bitch\w*|cunt\w*|dick|pussy|nigg\w*|fag\w*|slut\w*|whore\w*|asshole\w*|bastard\w*|porn\w*|sex\w*|kys)\b/i;
function cleanText(v) {
  if (typeof v !== 'string') return '';
  return [...v.replace(BAD_CHARS, '').replace(/\s+/g, ' ').trim()].slice(0, TEXT_MAX).join('');
}
/** ข้อความนี้ส่งไม่ได้เพราะอะไร — '' = ผ่าน */
function textProblem(v) {
  if (/(https?:\/\/|www\.|\.(com|net|org|co|th|io|me|ly|gg|xyz)\b|line\.me|discord|t\.me\/)/i.test(v)) return 'link';
  if (/\d[\d\s.-]{7,}\d/.test(v)) return 'number';
  const th = v.toLowerCase().replace(/[\s.\-_*+~^'"`!?,|/\\()[\]{}<>]/g, '').replace(/(.)\1{2,}/g, '$1');
  if (BAD_TH.some((re) => re.test(th)) || BAD_EN.test(v) || BAD_EN.test(th)) return 'word';
  return '';
}

export class CastleRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // เกมส่ง "ping" ทุก ~25 วิ กันสายหลุด — ตอบ "pong" เองโดยไม่ต้องปลุกห้อง (ไม่คิดเวลา)
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch() {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    const others = this.ctx.getWebSockets().filter((s) => s !== server);
    if (others.length >= MAX) {
      server.send(JSON.stringify({ t: 'full' }));
      server.close(4001, 'full');
    } else {
      server.serializeAttachment({ id: crypto.randomUUID().slice(0, 8), ready: false, tok: 30, at: Date.now() });
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  /** ส่งให้ทุกตัวในห้องที่เข้าห้องเรียบร้อยแล้ว (ยกเว้น skip) */
  broadcast(obj, skip = null) {
    const msg = JSON.stringify(obj);
    for (const s of this.ctx.getWebSockets()) {
      if (s === skip) continue;
      const a = s.deserializeAttachment();
      if (!a?.ready) continue;
      try { s.send(msg); } catch { /* สายกำลังปิด */ }
    }
  }

  async webSocketMessage(ws, raw) {
    const a = ws.deserializeAttachment();
    if (!a) return;
    if (typeof raw !== 'string' || raw.length > MAX_HI) return;
    // จำกัดความถี่: ถังละ 30 ข้อความ เติม 15 ต่อวินาที — เกมปกติส่งไม่ถึง 5 ต่อวินาที
    const now = Date.now();
    a.tok = Math.min(30, a.tok + ((now - a.at) / 1000) * 15);
    a.at = now;
    if (a.tok < 1) { ws.serializeAttachment(a); return; }
    a.tok -= 1;
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t !== 'hi' && raw.length > MAX_MSG) { ws.serializeAttachment(a); return; }

    if (m.t === 'hi' && !a.ready && !a.joining) {
      a.joining = true;
      ws.serializeAttachment(a);
      const user = await whoIs(this.env, m.tk);   // รอ Supabase ไม่เกิน ~3 วิ — ระหว่างนี้ข้อความอื่นของตัวนี้ถูกข้าม
      const b = ws.deserializeAttachment();
      if (!b) return;
      b.ready = true;
      b.joining = false;
      b.user = user ? { id: user.id, member: user.member, name: user.name } : null;
      b.look = cleanLook(m, b.user);
      b.st = this.seat(ws, cleanState(m));
      ws.serializeAttachment(b);
      const peers = [];
      for (const s of this.ctx.getWebSockets()) {
        if (s === ws) continue;
        const o = s.deserializeAttachment();
        if (o?.ready) peers.push({ id: o.id, ...o.look, ...o.st });
      }
      ws.send(JSON.stringify({ t: 'welcome', id: b.id, me: { m: b.look.m, name: b.look.name, u: b.look.u }, peers }));
      this.broadcast({ t: 'join', p: { id: b.id, ...b.look, ...b.st } }, ws);
      return;
    }
    if (!a.ready) { ws.serializeAttachment(a); return; }
    if (m.t === 'st') {
      a.st = this.seat(ws, cleanState(m));
      ws.serializeAttachment(a);
      this.broadcast({ t: 'st', id: a.id, ...a.st }, ws);
    } else if (m.t === 'look') {
      a.look = cleanLook(m, a.user);
      ws.serializeAttachment(a);
      this.broadcast({ t: 'look', id: a.id, ...a.look }, ws);
    } else if (m.t === 'say') {
      this.say(ws, a, m);
    } else ws.serializeAttachment(a);
  }

  /** แชต: ตรวจแล้วส่งให้ทุกตัวในชั้นเดียวกัน (รวมคนส่ง) — ดูกติกาข้างบน CHAT */
  say(ws, a, m) {
    const no = (why) => { ws.serializeAttachment(a); try { ws.send(JSON.stringify({ t: 'sayno', why })); } catch { /* สายปิด */ } };
    const now = Date.now();
    a.ct = Math.min(3, (a.ct ?? 3) + (now - (a.cat || now)) / 1500);
    a.cat = now;
    if (a.ct < 1) return no('fast');
    const k = m.k;
    let v = '';
    if (k === 'p' || k === 's') {
      v = ident(m.v);
      if (!v || v.length > 24) return no('bad');
    } else if (k === 'x') {
      if (!a.look?.m) return no('member');
      v = cleanText(m.v);
      if (!v) return no('bad');
      const bad = textProblem(v);
      if (bad) return no(bad);
      if (v === a.last && now - (a.lastAt || 0) < 10000) return no('same');
    } else return no('bad');
    a.ct -= 1;
    a.last = v;
    a.lastAt = now;
    ws.serializeAttachment(a);
    const msg = JSON.stringify({ t: 'say', id: a.id, w: a.st.w, k, v });
    for (const s of this.ctx.getWebSockets()) {
      const o = s === ws ? a : s.deserializeAttachment();
      if (!o?.ready || o.st?.w !== a.st.w) continue;
      try { s.send(msg); } catch { /* สายกำลังปิด */ }
    }
  }

  /**
   * จองที่นั่ง: ช่องเดียวกัน (ชั้น + ที่ + ตำแหน่งช่อง) นั่งได้ทีละตัว — ใครส่งถึงห้องก่อนได้ก่อน
   * ตัวที่มาทีหลัง: ไม่ได้นั่ง (ส่ง nosit ให้ลุกขึ้นเอง) · คนอื่นเห็นยืนอยู่หน้าที่นั่ง
   */
  seat(ws, st) {
    if (!st.sit) return st;
    for (const s of this.ctx.getWebSockets()) {
      if (s === ws) continue;
      const o = s.deserializeAttachment();
      if (o?.ready && o.st?.sit === st.sit && o.st.w === st.w && Math.abs(o.st.x - st.x) < 8) {
        try { ws.send(JSON.stringify({ t: 'nosit', w: st.w, sit: st.sit, x: st.x })); } catch { /* สายปิด */ }
        return { ...st, sit: '' };
      }
    }
    return st;
  }

  async webSocketClose(ws) { this.leave(ws); }
  async webSocketError(ws) { this.leave(ws); }

  leave(ws) {
    const a = ws.deserializeAttachment();
    if (a?.ready) {
      a.ready = false;
      ws.serializeAttachment(a);
      this.broadcast({ t: 'leave', id: a.id }, ws);
    }
    try { ws.close(1000, 'bye'); } catch { /* ปิดไปแล้ว */ }
  }
}
