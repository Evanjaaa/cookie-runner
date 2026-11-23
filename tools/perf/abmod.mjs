// tools/perf/abmod.mjs — วัดเวลาโค้ดเดิม (A) เทียบโค้ดใหม่ (B) สลับกันทุกเฟรมในหน้าเดียว
//
//   node tools/perf/abmod.mjs --swap src/town/rim-light.js [--base HEAD] [--scene home|run] [--device phone]
//        [--gpu] [--secs 20] [--rounds 3]
//
// ดักคำขอไฟล์โมดูล แล้วส่ง "ตัวกลาง" ที่ import ทั้งสองเวอร์ชัน: ฟังก์ชันที่ export ถูกเรียกตามฝั่งของเฟรม (__abSide)
// ฟังก์ชันชื่อขึ้นต้น set… ถูกเรียกทั้งสองฝั่ง (สถานะของโมดูลตรงกัน) · ค่าคงที่เอาจากฝั่งใหม่
// ใช้กับ dev server เท่านั้น · ตัวเลขเวลา = เวลาของ game.draw (ไม่มีการ์ดจอ = รวมการลงสีแล้ว)
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { launch, prepare, emulate, sleep } from './lib/cdp.mjs';
import { startServer, ROOT } from './lib/server.mjs';
import { waitFor, goHome, startRun } from './scenarios.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const rel = opt('swap'), base = opt('base', 'HEAD');
const secs = Number(opt('secs', 20)), rounds = Number(opt('rounds', 3));
const srv = await startServer({ mode: 'dev', port: 5199 });

const modPath = '/' + rel.replace(/\\/g, '/');
// --aa = คู่ควบคุม: ทั้งสองฝั่งเป็นโค้ดปัจจุบัน → ความต่างที่วัดได้คือระดับ noise ของวิธีนี้
const oldSrc = argv.includes('--aa') ? readFileSync(path.join(ROOT, rel), 'utf8')
  : execFileSync('git', ['show', `${base}:${rel}`], { cwd: ROOT, maxBuffer: 1 << 28 }).toString('utf8');
const tmp = path.join(path.dirname(rel), '__perf_old__' + path.basename(rel));
writeFileSync(path.join(ROOT, tmp), oldSrc);
let oldJs;
try { oldJs = await (await fetch(srv.url + tmp.replace(/\\/g, '/'))).text(); } finally { unlinkSync(path.join(ROOT, tmp)); }
const newSrc = readFileSync(path.join(ROOT, rel), 'utf8');
const names = new Set();
for (const s of [newSrc, oldSrc]) {
  for (const m of s.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
}
const OLDURL = modPath.replace(/[^/]+$/, '__perf_ab_old__.js');
const wrapper = [
  `import * as N from '${modPath}?abnew';`,
  `import * as O from '${OLDURL}';`,
  ...[...names].map((n) => (/^set[A-Z]/.test(n)
    ? `export function ${n}(...a) { try { O.${n}?.(...a); } catch {} return N.${n}(...a); }`
    : `export const ${n} = typeof N.${n} === 'function' ? function (...a) { return (window.__abSide === 'A' && O.${n} ? O.${n} : N.${n}).apply(this, a); } : N.${n};`)),
].join('\n');

const collector = readFileSync(path.join(ROOT, 'tools/perf/inject/collector.js'), 'utf8');
const B = await launch({ gpu: argv.includes('--gpu'), tmp: process.env.PERF_TMP });
const { cdp } = B;
await prepare(cdp); await emulate(cdp, opt('device', 'phone'));
await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*' + modPath + '*' }, { urlPattern: '*' + OLDURL + '*' }] });
cdp.on('Fetch.requestPaused', async (p) => {
  const u = new URL(p.request.url);
  const js = (body) => cdp.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }, { name: 'Cache-Control', value: 'no-store' }], body: Buffer.from(body).toString('base64') });
  if (u.pathname === OLDURL) return js(oldJs);
  if (u.pathname === modPath && !u.search.includes('abnew')) return js(wrapper);
  return cdp.send('Fetch.continueRequest', { requestId: p.requestId });
});
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.setTimeout = ((sT) => function (fn, ms) { if (ms === 15000 && performance.now() < 8000) return 0; return sT.apply(this, arguments); })(window.setTimeout);` });
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: collector });
const ctx = { cdp, srv, O: { mode: 'dev' } };
await cdp.send('Page.navigate', { url: srv.url });
await waitFor(cdp, `document.readyState === 'complete' && window.__game && !document.getElementById('splash')`, 180000);
await sleep(1500);
await goHome(ctx);
if (opt('scene', 'home') === 'run') await startRun(ctx);
await sleep(3000);
// --block = สลับเป็นช่วง (A ทั้งช่วง แล้ว B ทั้งช่วง …) วัดเฟรมต่อวินาที — ใช้กับโหมดการ์ดจอที่งานไปตันฝั่ง GPU
// (เวลาของ game.draw ไม่รวมงานของ GPU และงานของเฟรม A/B จะปนกันถ้าสลับทุกเฟรม)
if (argv.includes('--block')) {
  const out = { A: [], B: [] };
  // วอร์มเครื่องก่อน (คอมไพล์ shader / แคชของทั้งสองฝั่ง) แล้วทิ้งผล · สลับลำดับ AB/BA ทุกรอบ ตัดผลของ "ฝั่งที่มาทีหลังได้เปรียบ"
  for (const s of ['A', 'B']) { await cdp.evaluate(`window.__abSide = '${s}'`); await sleep(6000); }
  for (let r = 0; r < rounds; r++) {
    for (const s of (r % 2 ? ['B', 'A'] : ['A', 'B'])) {
      await cdp.evaluate(`window.__abSide = '${s}'`);
      await sleep(1500);
      await cdp.evaluate('__perf.start()');
      await sleep(secs * 1000);
      const p = await cdp.evaluate('__perf.stop()');
      out[s].push(p.drawFps);
    }
  }
  await B.close(); await srv.close();
  console.log(`\nA/B สลับเป็นช่วง ${secs} วิ · ${rel} · ${opt('scene', 'home')} · ${opt('device', 'phone')} · ${argv.includes('--gpu') ? 'GPU' : 'ไม่มีการ์ดจอ'}`);
  console.log('  เฟรมที่วาดได้ต่อวินาที A:', out.A.map((x) => x.toFixed(2)).join(' / '), '· B:', out.B.map((x) => x.toFixed(2)).join(' / '));
  process.exit(0);
}
await cdp.evaluate('window.__perfAB = true');
const per = [];
for (let r = 0; r < rounds; r++) {
  await cdp.evaluate('__perf.start()');
  await sleep(secs * 1000);
  const fr = await cdp.evaluate(`(() => { __perf.stop(); return __perf.frames.filter((f) => f[5]).map((f) => [f[6], f[4], f[2]]); })()`);
  const pick = (s, i) => fr.filter((f) => f[0] === s).map((f) => f[i]).sort((a, b) => a - b);
  const q = (a, p) => a[Math.min(a.length - 1, Math.floor(p * a.length))] || 0;
  const A = pick('A', 1), Bv = pick('B', 1);
  per.push({ nA: A.length, nB: Bv.length, a50: q(A, 0.5), b50: q(Bv, 0.5), a95: q(A, 0.95), b95: q(Bv, 0.95), aMean: A.reduce((s, x) => s + x, 0) / A.length, bMean: Bv.reduce((s, x) => s + x, 0) / Bv.length });
}
await cdp.evaluate('window.__perfAB = false');
await B.close(); await srv.close();
const f1 = (x) => x.toFixed(1);
console.log(`\nA/B สลับทุกเฟรม · ${rel} (A=${base} B=ปัจจุบัน) · ${opt('scene', 'home')} · ${opt('device', 'phone')} · ${argv.includes('--gpu') ? 'GPU' : 'ไม่มีการ์ดจอ'}`);
for (const p of per) console.log(`  รอบ: n=${p.nA}/${p.nB} · draw p50 A ${f1(p.a50)} → B ${f1(p.b50)} ms (${f1((p.b50 / p.a50 - 1) * 100)}%) · p95 ${f1(p.a95)} → ${f1(p.b95)} · เฉลี่ย ${f1(p.aMean)} → ${f1(p.bMean)} (${f1((p.bMean / p.aMean - 1) * 100)}%)`);
process.exit(0);
