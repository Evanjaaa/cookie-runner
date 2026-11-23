// tools/perf/run.mjs — วัดสถานการณ์มาตรฐาน (PERF_REPORT.md หัวข้อ 2)
//
//   node tools/perf/run.mjs <สถานการณ์> [--mode dev|build] [--device phone|ipad|desktop]
//        [--cpu 4] [--secs 20] [--level high|mid|save] [--reps 1] [--gpu] [--trace] [--tag ชื่อ]
//
// สถานการณ์: home · idle · run · panels · town · load · hidden
// ผลดิบ → tools/perf/out/<tag>-<สถานการณ์>-<device>-<level>.json (ไม่เข้า git)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { launch, prepare, emulate, metrics, heapAfterGC, assertNoSession, sleep } from './lib/cdp.mjs';
import { startServer, ROOT } from './lib/server.mjs';
import { traceWindow } from './lib/trace.mjs';
import { SCENARIOS } from './scenarios.mjs';
import { execFileSync } from 'node:child_process';
import { unlinkSync } from 'node:fs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const name = argv[0];
const O = {
  mode: opt('mode', 'dev'), device: opt('device', 'phone'), cpu: Number(opt('cpu', 1)), secs: Number(opt('secs', 20)),
  level: opt('level', 'high'), reps: Number(opt('reps', 1)), gpu: !!opt('gpu', false), trace: !!opt('trace', false),
  tag: opt('tag', 'base'), port: Number(opt('port', 5199)), cport: Number(opt('cport', 9333)), seed: Number(opt('seed', 12345)),
  spot: opt('spot', ''), hour: opt('hour', ''), outfit: opt('outfit', ''), skin: opt('skin', ''), stage: opt('stage', ''),
  keep: !!opt('keep', false), url: opt('url', ''), census: !!opt('census', false), swap: opt('swap', ''), base: opt('base', 'HEAD'), net: opt('net', ''),
};
if (!SCENARIOS[name]) { console.error('ไม่รู้จักสถานการณ์', name, Object.keys(SCENARIOS)); process.exit(1); }

const OUT = path.join(ROOT, 'tools/perf/out');
mkdirSync(OUT, { recursive: true });
const collector = readFileSync(path.join(ROOT, 'tools/perf/inject/collector.js'), 'utf8');
const census = readFileSync(path.join(ROOT, 'tools/perf/inject/census.js'), 'utf8');

/** สถานะผู้เล่นทดสอบ — ใส่ localStorage ก่อนสคริปต์เกมรัน (โปรไฟล์ใหม่ทุกครั้ง) */
function presetScript(O) {
  const gfx = { same: true, scenes: Object.fromEntries(['home', 'room', 'run'].map((s) => [s, { level: O.level, fps: O.level === 'save' ? 30 : 60, res: O.level === 'save' ? 'low' : O.level === 'mid' ? 'mid' : 'high' }])) };
  const set = { 'cookie-runner:pref:gfxScenes': JSON.stringify(gfx), 'cookie-runner:pref:gfx': JSON.stringify(O.level) };
  if (O.stage) set['cookie-runner:stage'] = O.stage;
  if (O.skin) set['cookie-runner:skin'] = O.skin;
  if (O.outfit) set['cookie-runner:outfit'] = O.outfit;
  // Math.random มีเมล็ด — ฉากที่สุ่มของออกมาใกล้กันทุกรอบ (เวลาจริงยังแกว่ง แต่ของในฉากชุดเดียวกัน)
  // ตัวกันค้าง 15 วิของ boot.js (setTimeout(hideSplash, 15000)) ถูกข้าม — ไม่งั้นม่านเปิดก่อนเกมโหลดเสร็จ
  // แล้วสคริปต์วัดจะเริ่มจับเวลาระหว่างที่ main.js ยังรันอยู่ (ม่านหาย = main.js โหลดเสร็จจริงเท่านั้น)
  return `(() => {
    try { if (!sessionStorage.getItem('__perfSet')) { const s = ${JSON.stringify(set)}; for (const k in s) localStorage.setItem(k, s[k]); sessionStorage.setItem('__perfSet', '1'); } } catch {}
    const sT = window.setTimeout;
    window.setTimeout = function (fn, ms) { if (ms === 15000 && performance.now() < 8000 && !window.__splashFallbackSkipped) { window.__splashFallbackSkipped = true; return 0; } return sT.apply(this, arguments); };
    let a = ${O.seed} >>> 0;
    Math.random = function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  })();`;
}

const pick = (m) => ({
  task: m.TaskDuration * 1000, script: m.ScriptDuration * 1000, layout: m.LayoutDuration * 1000, style: m.RecalcStyleDuration * 1000,
  layouts: m.LayoutCount, styles: m.RecalcStyleCount, heapMB: m.JSHeapUsedSize / 1048576, nodes: m.Nodes, listeners: m.JSEventListeners,
});

// --swap ไฟล์[,ไฟล์] = ใช้โค้ดเดิมจาก git (--base, ค่าเริ่มต้น HEAD) แทนไฟล์งาน — วัด baseline โดยไม่ต้องย้อนไฟล์ (dev เท่านั้น)
const SWAPS = O.swap ? String(O.swap).split(',') : [];
const OLD = new Map();
async function loadOld(srv) {
  for (const rel of SWAPS) {
    const src = execFileSync('git', ['show', `${O.base}:${rel}`], { cwd: ROOT, maxBuffer: 1 << 28 }).toString('utf8');
    const tmp = path.join(path.dirname(rel), '__perf_old__' + path.basename(rel));
    writeFileSync(path.join(ROOT, tmp), src);
    const fwd = (x) => x.split('\\').join('/');
    try { OLD.set('/' + fwd(rel), await (await fetch(srv.url + fwd(tmp))).text()); } finally { unlinkSync(path.join(ROOT, tmp)); }
  }
}

async function one(rep, srv) {
  const B = await launch({ port: O.cport, gpu: O.gpu, tmp: process.env.PERF_TMP });
  const { cdp } = B;
  try {
    const { net, logs } = await prepare(cdp);
    const dev = await emulate(cdp, O.device, { cpu: 1 });
    // --net 4g|3g = เน็ตมือถือจำลอง + ปิดแคช (เปิดเกมครั้งแรก S6)
    const NET = { '4g': { latency: 60, downloadThroughput: 9e6 / 8, uploadThroughput: 3e6 / 8 }, '3g': { latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 0.75e6 / 8 } };
    if (NET[O.net]) {
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      await cdp.send('Network.emulateNetworkConditions', { offline: false, ...NET[O.net] });
    }
    if (OLD.size) {
      await cdp.send('Fetch.enable', { patterns: [...OLD.keys()].map((p) => ({ urlPattern: '*' + p + '*' })) });
      cdp.on('Fetch.requestPaused', async (p) => {
        const body = OLD.get(new URL(p.request.url).pathname);
        if (body != null) await cdp.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }], body: Buffer.from(body).toString('base64') });
        else await cdp.send('Fetch.continueRequest', { requestId: p.requestId });
      });
    }
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: presetScript(O) });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: collector });
    if (O.census) await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: census });
    const ctx = {
      cdp, O, srv, dev, net, logs, sleep,
      measure: async (label, secs, during) => {
        const m0 = pick(await metrics(cdp));
        await cdp.evaluate('__perf.start()');
        if (O.census) await cdp.evaluate('__census.start(true)');
        const tr = O.trace ? traceWindow(cdp, Math.min(secs, 6)) : null;
        const t0 = Date.now();
        if (during) await during(secs); else await sleep(secs * 1000);
        while (Date.now() - t0 < secs * 1000) await sleep(50);
        const p = await cdp.evaluate('__perf.stop()');
        const cen = O.census ? await cdp.evaluate('__census.stop()') : null;
        const m1 = pick(await metrics(cdp));
        const s = p.secs;
        const cpu = {
          taskMsPerSec: (m1.task - m0.task) / s, scriptMsPerSec: (m1.script - m0.script) / s,
          layoutMsPerSec: (m1.layout - m0.layout) / s, styleMsPerSec: (m1.style - m0.style) / s,
          layoutsPerSec: (m1.layouts - m0.layouts) / s, stylesPerSec: (m1.styles - m0.styles) / s,
          nodes: m1.nodes, listeners: m1.listeners, heapMB: m1.heapMB,
        };
        const threads = tr ? await tr : null;
        return { label, cpu, page: p, threads, census: cen };
      },
      heap: () => heapAfterGC(cdp),
    };
    await assertNoSession(cdp).catch(() => {});
    if (O.cpu !== 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: O.cpu });
    const res = await SCENARIOS[name](ctx);
    await assertNoSession(cdp);
    const host = (u) => { try { return new URL(u).hostname; } catch { return ''; } };
    const leaked = net.filter((r) => /supabase\.(co|in|com)$|vercel\.(app|com)$|workers\.dev$/.test(host(r.url)) && !r.failed);
    if (leaked.length) throw new Error('STOP: มีคำขอหลุดไปฐานข้อมูลจริง ' + leaked.map((r) => r.url).join(' '));
    return { rep, res, net: summarizeNet(net), logs: logs.slice(0, 30) };
  } finally {
    if (!O.keep) await B.close();
  }
}

function summarizeNet(net) {
  const byUrl = new Map();
  for (const r of net) {
    const u = r.url.replace(/^https?:\/\/127\.0\.0\.1:\d+/, '');
    const e = byUrl.get(u) || { n: 0, bytes: 0, status: r.status, failed: r.failed };
    e.n += 1; e.bytes += r.bytes || 0; byUrl.set(u, e);
  }
  const dup = [...byUrl].filter(([u, e]) => e.n > 1 && !u.startsWith('data:')).map(([u, e]) => `${e.n}× ${u.slice(0, 100)}`);
  const bad = [...byUrl].filter(([, e]) => e.status >= 400 || e.failed).map(([u, e]) => `${e.status || e.failed} ${u.slice(0, 100)}`);
  return { requests: net.length, kb: Math.round(net.reduce((s, r) => s + (r.bytes || 0), 0) / 1024), dup: dup.slice(0, 20), bad: bad.slice(0, 20) };
}

const srv = O.url ? { url: O.url, close: async () => {} } : await startServer({ mode: O.mode, port: O.port });
if (SWAPS.length) await loadOld(srv);
const all = [];
try {
  for (let i = 0; i < O.reps; i++) {
    const r = await one(i, srv);
    all.push(r);
    if (r.res.bootMs) console.log('boot (ถึงม่านหาย) ms:', r.res.bootMs, r.res.timing ? JSON.stringify(r.res.timing) : '', '· net', JSON.stringify({ req: r.net.requests, kb: r.net.kb, dup: r.net.dup.length, bad: r.net.bad.length }));
    for (const m of r.res.windows || []) printWindow(m);
    if (r.res.points) for (const pt of r.res.points) console.log('  รอบ', pt.round, JSON.stringify(pt));
    if (r.res.sites1) { console.log('  ผ้าใบตามจุดสร้าง ก่อนเปิดหน้าต่าง:'); for (const x of r.res.sites0) console.log('    ', x); console.log('  หลังเปิดครบ:'); for (const x of r.res.sites1) console.log('    ', x); }
    if (r.res.before) console.log('  เสียงก่อนซ่อน', JSON.stringify(r.res.before), '→ หลังซ่อน', JSON.stringify(r.res.after));
  }
} finally {
  await srv.close();
}
const file = path.join(OUT, `${O.tag}-${name}-${O.device}-${O.level}${O.cpu > 1 ? '-cpu' + O.cpu : ''}${O.gpu ? '-gpu' : ''}${O.spot ? '-' + O.spot : ''}.json`);
writeFileSync(file, JSON.stringify({ opts: O, runs: all }, null, 1));
console.log('→', path.relative(ROOT, file));
process.exit(0);

function printWindow(m) {
  const p = m.page, c = m.cpu;
  const f = (x) => (typeof x === 'number' ? (Math.round(x * 10) / 10) : x);
  console.log(`[${m.label}] ${f(p.secs)}s fps=${f(p.fps)} draws=${f(p.drawFps)}/s · rAF cb/frame=${f(p.cbPerFrame)} · cb ms p50/p95/p99/max=${f(p.cbMs.p50)}/${f(p.cbMs.p95)}/${f(p.cbMs.p99)}/${f(p.cbMs.max)} · gap p95/p99/max=${f(p.gap.p95)}/${f(p.gap.p99)}/${f(p.gap.max)} >34ms=${p.gap.over34}`);
  console.log(`   draw ms p50/p95/p99=${f(p.drawMs.p50)}/${f(p.drawMs.p95)}/${f(p.drawMs.p99)} (${f(p.drawMs.perSec)} ms/s) · update p50=${f(p.updMs.p50)} (${f(p.updMs.perSec)} ms/s) · main task=${f(c.taskMsPerSec)} ms/s script=${f(c.scriptMsPerSec)} style=${f(c.styleMsPerSec)} layout=${f(c.layoutMsPerSec)} (${f(c.layoutsPerSec)}/s)`);
  console.log(`   timers ${f(p.timerFiredPerSec)}/s (${f(p.timerMsPerSec)} ms/s) · intervals=${p.intervalsAlive.length} · LoAF ${p.loaf.n} (${f(p.loaf.perMin)}/min) · canvas n=${p.canvas.n} ${f(p.canvas.mb)}MB made=${f(p.canvas.madePerSec)}/s resize=${f(p.canvas.resizesPerSec)}/s · heap=${f(c.heapMB)}MB nodes=${c.nodes} listeners=${c.listeners} · audio=${p.audio.join(',')} media=${p.media.join(',')}`);
  console.log('   loops:', p.loops.slice(0, 6).map((l) => `${l.k} ${l.perSec}/s ${l.ms}ms/s`).join(' | '));
  if (m.census) { const c = m.census; console.log('   CENSUS main', c.mainCanvas, 'fullscreens/frame', JSON.stringify(c.fullScreensPerFrame)); console.log('    main/f:', JSON.stringify(c.perFrameMain).slice(0, 900)); console.log('    off/f:', JSON.stringify(c.perFrameOff).slice(0, 700)); console.log('    big:', c.bigDraws.slice(0, 14).join(' ;; ')); console.log('    filters:', c.filters.join(' | ')); console.log('    readbacks:', c.readbacks.join(' | ')); }
  if (m.threads) console.log('   threads ms/s:', m.threads.map((t) => `${t.name} ${t.msPerSec}`).join(' | '));
}
