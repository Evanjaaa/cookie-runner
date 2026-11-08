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
//   เกม → ห้อง   hi   { name, skin, outfit, ...สถานะ }   เข้าห้อง (ครั้งแรก)
//                look { name, skin, outfit }             เปลี่ยนชื่อ/ตัว/ชุด
//                st   { w, x, y, dir, mv, run, air, vy, on, sit, em, ea }   สถานะเปลี่ยน
//   ห้อง → เกม   welcome { id, peers: [...] } · join { p } · look { id, ... } · st { id, ... } · leave { id } · full
//
// ยังไม่มี: ตรวจล็อกอิน (Supabase) · แชต — ทำขั้นต่อไป (แชตต้องมีกรองคำ รายงาน บล็อก จำกัดความถี่ ตามกฎ Play)
// ─────────────────────────────────────────────────────────────
import { DurableObject } from 'cloudflare:workers';

const MAX = 20;                       // ต่อห้อง
const MAX_MSG = 600;                  // ไบต์ต่อข้อความ
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
function cleanLook(m) {
  return { name: cleanName(m.name), skin: ident(m.skin) || 'orange', outfit: ident(m.outfit) || 'none' };
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
    if (typeof raw !== 'string' || raw.length > MAX_MSG) return;
    // จำกัดความถี่: ถังละ 30 ข้อความ เติม 15 ต่อวินาที — เกมปกติส่งไม่ถึง 5 ต่อวินาที
    const now = Date.now();
    a.tok = Math.min(30, a.tok + ((now - a.at) / 1000) * 15);
    a.at = now;
    if (a.tok < 1) { ws.serializeAttachment(a); return; }
    a.tok -= 1;
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object') return;

    if (m.t === 'hi' && !a.ready) {
      a.ready = true;
      a.look = cleanLook(m);
      a.st = cleanState(m);
      ws.serializeAttachment(a);
      const peers = [];
      for (const s of this.ctx.getWebSockets()) {
        if (s === ws) continue;
        const o = s.deserializeAttachment();
        if (o?.ready) peers.push({ id: o.id, ...o.look, ...o.st });
      }
      ws.send(JSON.stringify({ t: 'welcome', id: a.id, peers }));
      this.broadcast({ t: 'join', p: { id: a.id, ...a.look, ...a.st } }, ws);
      return;
    }
    if (!a.ready) return;
    if (m.t === 'st') {
      a.st = cleanState(m);
      ws.serializeAttachment(a);
      this.broadcast({ t: 'st', id: a.id, ...a.st }, ws);
    } else if (m.t === 'look') {
      a.look = cleanLook(m);
      ws.serializeAttachment(a);
      this.broadcast({ t: 'look', id: a.id, ...a.look }, ws);
    } else ws.serializeAttachment(a);
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
