// tools/perf/lib/cdp.mjs
// ─────────────────────────────────────────────────────────────
// คุม Chrome ผ่าน DevTools Protocol ด้วย WebSocket ในตัวของ Node 24 — ไม่ต้องลง puppeteer
// เครื่องมือวัดประสิทธิภาพเท่านั้น ไม่ถูก build เข้าเกม (PERF_REPORT.md)
//
// กฎความปลอดภัย (PERF_REPORT.md / .claude/commands/perf-audit.md ข้อ 2.6):
//   โปรไฟล์ Chrome ใหม่ทุกครั้ง · ไม่ล็อกอิน · บล็อก supabase/vercel ทุกคำขอ
// ─────────────────────────────────────────────────────────────
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** โดเมนที่ห้ามคุยด้วยระหว่างทดสอบ (ฐานข้อมูลจริง + ที่ deploy) — ฟอนต์ Google ไม่บล็อก (ภาพจะต่าง) */
export const BLOCKED = ['*supabase.co*', '*supabase.in*', '*supabase.com*', '*vercel.app*', '*vercel.com*', '*workers.dev*'];

async function getJSON(url, tries = 100) {
  let err;
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); return await r.json(); } catch (e) { err = e; await sleep(100); }
  }
  throw err;
}

/**
 * เปิด Chrome headless (โปรไฟล์ใหม่) แล้วต่อเข้าแท็บแรก
 * gpu=false → --disable-gpu (ตรงกับรอบวัดก่อน ๆ) · gpu=true → ลองใช้การ์ดจอจริง
 */
export async function launch({ gpu = false, extra = [], tmp } = {}) {
  const base = tmp || process.env.PERF_TMP || os.tmpdir();
  mkdirSync(base, { recursive: true });
  const dir = mkdtempSync(path.join(base, 'perf-chrome-'));
  const args = [
    '--headless=new',
    // พอร์ต 0 = ให้ Chrome เลือกพอร์ตว่างเอง แล้วเขียนเลขลง <โปรไฟล์>/DevToolsActivePort (พอร์ตตายตัวเคยชนจนเปิดไม่ขึ้น)
    '--remote-debugging-port=0',
    `--user-data-dir=${dir}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-sync', '--disable-component-update', '--disable-default-apps',
    '--disable-background-networking', '--metrics-recording-only',
    // แท็บ headless ไม่มีใครดู — กันเบราว์เซอร์หรี่ timer/เฟรมของหน้าเองระหว่างวัด
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--mute-audio',
    '--window-size=1280,720',
    // gpu: d3d11 = การ์ดจอจริงของเครื่อง (เช็คแล้ว: Intel Iris Xe, 2d_canvas enabled) — ไม่ใส่ d3d11 จะตกไป SwiftShader ซึ่งช้ากว่าไม่มีการ์ดจอ
    ...(gpu ? ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] : ['--disable-gpu']),
    ...extra,
    'about:blank',
  ];
  const proc = spawn(CHROME, args, { stdio: 'ignore' });
  let exited = null;
  proc.on('exit', (code) => { exited = code; });
  // รอไฟล์บอกพอร์ตได้ถึง 40 วิ (เปิดแบบใช้การ์ดจอบางครั้งช้า) · Chrome ปิดตัวเองไปก่อน = บอกเลย
  let port = 0;
  for (let i = 0; i < 400 && !port; i++) {
    try { port = Number(readFileSync(path.join(dir, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0]) || 0; } catch {}
    if (!port) { if (exited != null) break; await sleep(100); }
  }
  if (!port) throw new Error(`Chrome ไม่เปิดพอร์ต DevTools (exit=${exited})`);
  const list = await getJSON(`http://127.0.0.1:${port}/json/list`);
  const page = list.find((t) => t.type === 'page');
  const cdp = await connect(page.webSocketDebuggerUrl);
  const close = async () => {
    try { await cdp.send('Browser.close'); } catch {}
    cdp.ws.close();
    await sleep(400);
    try { proc.kill(); } catch {}
    await sleep(300);
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  };
  return { cdp, proc, close, profileDir: dir, port };
}

/** ต่อ WebSocket ของแท็บ — ได้ send(method, params) กับ on(event, fn) */
export async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = bad; });
  let id = 0;
  const wait = new Map();
  const subs = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString());
    if (m.id && wait.has(m.id)) {
      const { ok, bad, method } = wait.get(m.id);
      wait.delete(m.id);
      if (m.error) bad(new Error(`${method}: ${m.error.message}`)); else ok(m.result);
    } else if (m.method) {
      for (const fn of subs.get(m.method) || []) fn(m.params);
    }
  };
  const send = (method, params = {}) => new Promise((ok, bad) => {
    const i = ++id;
    wait.set(i, { ok, bad, method });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const on = (method, fn) => {
    if (!subs.has(method)) subs.set(method, []);
    subs.get(method).push(fn);
    return () => subs.set(method, subs.get(method).filter((f) => f !== fn));
  };
  /** รันโค้ดในหน้า คืนค่าเป็น JSON — userGesture=true ให้นับเป็นการแตะของผู้เล่น (เสียง/วิดีโอปลดล็อก) */
  const evaluate = async (expr, { gesture = false, timeout = 60000 } = {}) => {
    const r = await send('Runtime.evaluate', {
      expression: expr, awaitPromise: true, returnByValue: true, userGesture: gesture, timeout,
    });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error(`evaluate: ${d.exception?.description || d.text}`);
    }
    return r.result.value;
  };
  return { ws, send, on, evaluate };
}

/** ตั้งหน้าจอจำลอง — ต้องยิงในเซสชันเดียวกับที่วัด (ตัดการเชื่อมต่อแล้วค่าหาย) */
export const DEVICES = {
  // iPhone แนวนอน (ขนาดจุดใกล้ iPhone 17) — จอสัมผัส ด้านสั้น ≤ 500 = IS_PHONE ในเกม
  phone: { width: 874, height: 402, deviceScaleFactor: 3, mobile: true, touch: true },
  // iPad gen 9 แนวนอน
  ipad: { width: 1080, height: 810, deviceScaleFactor: 2, mobile: true, touch: true },
  desktop: { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false, touch: false },
};

export async function emulate(cdp, dev, { cpu = 1 } = {}) {
  const d = typeof dev === 'string' ? DEVICES[dev] : dev;
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: d.width, height: d.height, deviceScaleFactor: d.deviceScaleFactor, mobile: d.mobile,
    screenOrientation: d.width > d.height ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 },
  });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: !!d.touch, maxTouchPoints: d.touch ? 5 : 1 });
  await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: !!d.touch, configuration: d.mobile ? 'mobile' : 'desktop' });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  return d;
}

/** เปิดโดเมนพื้นฐาน + บล็อกฐานข้อมูลจริง + จดทุกคำขอเน็ต */
export async function prepare(cdp, { block = true } = {}) {
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable', { maxTotalBufferSize: 0, maxResourceBufferSize: 0 });
  await cdp.send('Performance.enable', { timeDomain: 'timeTicks' });
  if (block) await cdp.send('Network.setBlockedURLs', { urls: BLOCKED });
  const net = [];
  const byId = new Map();
  cdp.on('Network.requestWillBeSent', (p) => {
    const r = { id: p.requestId, url: p.request.url, method: p.request.method, type: p.type, t: p.timestamp, status: 0, bytes: 0, failed: '' };
    byId.set(p.requestId, r);
    net.push(r);
  });
  cdp.on('Network.responseReceived', (p) => { const r = byId.get(p.requestId); if (r) { r.status = p.response.status; r.fromCache = p.response.fromDiskCache || p.response.fromServiceWorker; } });
  cdp.on('Network.loadingFinished', (p) => { const r = byId.get(p.requestId); if (r) r.bytes = p.encodedDataLength; });
  cdp.on('Network.loadingFailed', (p) => { const r = byId.get(p.requestId); if (r) r.failed = p.blockedReason || p.errorText || 'failed'; });
  const logs = [];
  cdp.on('Runtime.exceptionThrown', (p) => logs.push({ level: 'exception', text: p.exceptionDetails?.exception?.description || p.exceptionDetails?.text }));
  cdp.on('Runtime.consoleAPICalled', (p) => {
    if (p.type === 'error' || p.type === 'warning') logs.push({ level: p.type, text: p.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300) });
  });
  return { net, logs };
}

/** ค่าสะสมของ Performance.getMetrics เป็น object */
export async function metrics(cdp) {
  const { metrics: m } = await cdp.send('Performance.getMetrics');
  return Object.fromEntries(m.map((x) => [x.name, x.value]));
}

/** heap หลังเก็บขยะ (MB) */
export async function heapAfterGC(cdp) {
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.collectGarbage');
  await cdp.send('HeapProfiler.collectGarbage');
  const h = await cdp.send('Runtime.getHeapUsage');
  return { usedMB: h.usedSize / 1048576, totalMB: h.totalSize / 1048576 };
}

/** ห้ามมี session ของ Supabase ในเครื่องทดสอบ — เจอ = โยน error ให้สคริปต์หยุด */
export async function assertNoSession(cdp) {
  const keys = await cdp.evaluate(`Object.keys(localStorage).filter(k => /^sb-.*-auth-token/.test(k))`);
  if (keys.length) throw new Error('STOP: Chrome ทดสอบมี session Supabase: ' + keys.join(','));
}
