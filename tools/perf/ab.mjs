// tools/perf/ab.mjs — วัดต้นทุนทีละส่วนแบบสลับรอบในหน้าเดียว (ABAB…) — ลดผลของเครื่องที่แกว่ง
//   node tools/perf/ab.mjs <ชุดเงื่อนไข> [--gpu] [--device phone] [--rounds 4] [--secs 6] [--scene home|run]
// ชุดเงื่อนไขอยู่ในตาราง SETS ข้างล่าง — แต่ละเงื่อนไขคือโค้ดที่รันในหน้าก่อนเริ่มช่วงวัด (dev เท่านั้น)
import { launch, prepare, emulate, sleep } from './lib/cdp.mjs';
import { startServer } from './lib/server.mjs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/server.mjs';
import { boot, goHome, startRun } from './scenarios.mjs';

const RESET = `window.__rimOff = false; if (window.__game && window.__game.__origDrawHomeCat) window.__game.drawHomeCat = window.__game.__origDrawHomeCat;`;
const NOCAT = `(() => { const g = window.__game; if (!g.__origDrawHomeCat) g.__origDrawHomeCat = g.drawHomeCat; g.drawHomeCat = function () {}; })()`;
const SETS = {
  home: [
    ['ปกติ', RESET],
    ['ปิดแสงขอบ', RESET + 'window.__rimOff = true;'],
    ['ไม่วาดน้อง', RESET + 'window.__rimOff = true;' + NOCAT],
  ],
};

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const set = SETS[argv[0]];
const rounds = Number(opt('rounds', 4)), secs = Number(opt('secs', 6));
const collector = readFileSync(path.join(ROOT, 'tools/perf/inject/collector.js'), 'utf8');
const srv = await startServer({ mode: 'dev', port: 5199 });
const B = await launch({ port: 9333, gpu: argv.includes('--gpu'), tmp: process.env.PERF_TMP });
const { cdp } = B;
await prepare(cdp); await emulate(cdp, opt('device', 'phone'));
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.setTimeout = ((sT) => function (fn, ms) { if (ms === 15000 && performance.now() < 8000) return 0; return sT.apply(this, arguments); })(window.setTimeout);` });
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: collector });
const ctx = { cdp, srv, O: { mode: 'dev' } };
await boot(ctx); await goHome(ctx);
if (opt('scene', 'home') === 'run') await startRun(ctx);
await sleep(3000);
const res = set.map(() => []);
for (let r = 0; r < rounds; r++) {
  for (let i = 0; i < set.length; i++) {
    await cdp.evaluate(set[i][1] + ';true');
    await sleep(600);   // ให้ภาพเฟรมแรกหลังสลับผ่านไปก่อน
    await cdp.evaluate('__perf.start()');
    await sleep(secs * 1000);
    const p = await cdp.evaluate('__perf.stop()');
    res[i].push({ draw: p.drawMs.p50, cb: p.cbMs.p50, fps: p.fps, drawPerSec: p.drawMs.perSec });
  }
}
await cdp.evaluate(RESET + ';true');
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
console.log(`\n${argv[0]} · ${opt('device', 'phone')} · ${argv.includes('--gpu') ? 'GPU' : 'ไม่มีการ์ดจอ'} · ${rounds} รอบ × ${secs} วิ`);
console.log('เงื่อนไข'.padEnd(14), 'draw p50 (ทุกรอบ)'.padEnd(40), 'median', 'fps');
for (let i = 0; i < set.length; i++) {
  const d = res[i].map((x) => x.draw);
  console.log(set[i][0].padEnd(14), d.map((x) => x.toFixed(1)).join(' / ').padEnd(40), med(d).toFixed(1).padStart(6), med(res[i].map((x) => x.fps)).toFixed(1));
}
await B.close(); await srv.close(); process.exit(0);
