// tools/perf/bootprof.mjs — CPU profile ช่วงเปิดเกม (จนม่านโหลดหาย) แยกเวลาตามฟังก์ชัน (รวมลูก) และตามไฟล์
//   node tools/perf/bootprof.mjs [--device phone] [--gpu] [--top 25]
import { launch, prepare, emulate, sleep } from './lib/cdp.mjs';
import { startServer } from './lib/server.mjs';
import { waitFor } from './scenarios.mjs';
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const srv = await startServer({ mode: 'dev', port: 5199 });
// รอบแรกให้ Vite แปลงไฟล์ให้ครบก่อน (ไม่งั้นเวลาโหลดไฟล์ของ dev server ปนเข้ามา)
{ const W = await launch({ tmp: process.env.PERF_TMP }); await prepare(W.cdp); await W.cdp.send('Page.navigate', { url: srv.url }); await waitFor(W.cdp, `window.__game`, 180000); await W.close(); }
const B = await launch({ gpu: argv.includes('--gpu'), tmp: process.env.PERF_TMP });
const { cdp } = B;
await prepare(cdp); await emulate(cdp, opt('device', 'phone'));
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.setTimeout = ((sT) => function (fn, ms) { if (ms === 15000 && performance.now() < 8000) return 0; return sT.apply(this, arguments); })(window.setTimeout);` });
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 400 });
await cdp.send('Profiler.start');
const t0 = Date.now();
await cdp.send('Page.navigate', { url: srv.url });
await waitFor(cdp, `document.readyState === 'complete' && window.__game && !document.getElementById('splash')`, 180000, 100);
const bootMs = Date.now() - t0;
const { profile } = await cdp.send('Profiler.stop');
await B.close(); await srv.close();

// เวลาต่อโหนด (self) จาก samples → รวมขึ้นไปหาพ่อ (inclusive) · นับฟังก์ชันซ้ำในสแตกครั้งเดียว
const dt = new Map();
for (let i = 0; i < profile.samples.length; i++) dt.set(profile.samples[i], (dt.get(profile.samples[i]) || 0) + (profile.timeDeltas[i] || 0));
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
const key = (n) => { const f = n.callFrame; const u = (f.url || '').replace(/^.*\/(src|node_modules)\//, '$1/').replace(/\?.*$/, ''); return `${f.functionName || '(anon)'} ${u}:${f.lineNumber + 1}`; };
const incl = new Map(), self = new Map(), byFile = new Map();
for (const [id, us] of dt) {
  const n = byId.get(id);
  self.set(key(n), (self.get(key(n)) || 0) + us);
  const f = (n.callFrame.url || '(native)').replace(/^.*\/(src|node_modules)\//, '$1/').replace(/\?.*$/, '');
  byFile.set(f, (byFile.get(f) || 0) + us);
  const seen = new Set();
  for (let p = id; p != null; p = parent.get(p)) { const k = key(byId.get(p)); if (!seen.has(k)) { seen.add(k); incl.set(k, (incl.get(k) || 0) + us); } }
}
const top = Number(opt('top', 25));
const ms = (us) => (us / 1000).toFixed(0).padStart(6);
console.log(`เปิดเกมถึงม่านหาย ${bootMs} ms (dev server, ${opt('device', 'phone')}, ${argv.includes('--gpu') ? 'GPU' : 'ไม่มีการ์ดจอ'})`);
console.log('\nรวมลูก (inclusive) — ตัดฟังก์ชันระดับบนสุดที่ไม่บอกอะไรออก:');
for (const [k, us] of [...incl].filter(([k]) => !/^\((root|program|anon)\) |^\(anon\) :0/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(ms(us), 'ms ', k);
console.log('\nself ตามไฟล์:');
for (const [k, us] of [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(ms(us), 'ms ', k);
process.exit(0);
