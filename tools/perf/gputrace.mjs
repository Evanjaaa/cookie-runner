// tools/perf/gputrace.mjs — อัด trace หน้าแรก แล้วไล่ว่างานบน GPU process / renderer หมดไปกับอะไร (เวลา self ต่อชื่อ event)
import { launch, prepare, emulate, sleep } from './lib/cdp.mjs';
import { startServer } from './lib/server.mjs';
import { boot, goHome } from './scenarios.mjs';
const argv = process.argv.slice(2);
const gpu = argv.includes('--gpu'), dev = argv.includes('--desktop') ? 'desktop' : argv.includes('--ipad') ? 'ipad' : 'phone';
const srv = await startServer({ mode: 'dev', port: 5199 });
const B = await launch({ port: 9333, gpu, tmp: process.env.PERF_TMP });
const { cdp } = B;
await prepare(cdp); await emulate(cdp, dev);
const ctx = { cdp, srv, O: { mode: 'dev' } };
await boot(ctx); await goHome(ctx); await sleep(4000);
const events = [];
cdp.on('Tracing.dataCollected', (p) => events.push(...p.value));
const done = new Promise((r) => cdp.on('Tracing.tracingComplete', r));
await cdp.send('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: ['toplevel', 'gpu', 'cc', 'viz', 'skia', 'disabled-by-default-skia', 'blink', 'devtools.timeline', 'disabled-by-default-gpu.service', 'gpu.capture'], recordMode: 'recordAsMuchAsPossible' } });
await sleep(5000);
await cdp.send('Tracing.end'); await done;
const tname = new Map(), pname = new Map();
for (const e of events) { if (e.ph === 'M' && e.name === 'thread_name') tname.set(e.pid + ':' + e.tid, e.args.name); if (e.ph === 'M' && e.name === 'process_name') pname.set(e.pid, e.args.name); }
// self time: เรียง X events ต่อ thread แล้วหักลูกออก
const byThread = new Map();
for (const e of events) if (e.ph === 'X' && e.dur > 0) { const k = e.pid + ':' + e.tid; (byThread.get(k) || byThread.set(k, []).get(k)).push(e); }
for (const [k, evs] of byThread) {
  const name = (pname.get(Number(k.split(':')[0])) || '') + '/' + (tname.get(k) || k);
  if (!/CrGpuMain|CrRendererMain|VizCompositor|Compositor/.test(name)) continue;
  evs.sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  const self = new Map(); const stack = [];
  for (const e of evs) {
    while (stack.length && stack[stack.length - 1].ts + stack[stack.length - 1].dur <= e.ts) stack.pop();
    if (stack.length) { const p = stack[stack.length - 1]; p.__child = (p.__child || 0) + Math.min(e.dur, p.ts + p.dur - e.ts); }
    stack.push(e);
  }
  for (const e of evs) { const s = Math.max(0, e.dur - (e.__child || 0)); self.set(e.name, (self.get(e.name) || 0) + s); }
  const tot = [...self.values()].reduce((a, b) => a + b, 0);
  console.log(`\n${name}: self total ${(tot / 1000 / 5).toFixed(0)} ms/s`);
  for (const [n, us] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`  ${(us / 1000 / 5).toFixed(1).padStart(7)} ms/s  ${n}`);
}
await B.close(); await srv.close(); process.exit(0);
