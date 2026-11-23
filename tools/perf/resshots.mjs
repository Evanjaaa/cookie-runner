// tools/perf/resshots.mjs — ภาพเทียบความละเอียดผ้าใบบนจอมือถือ (ข้อเสนอ B1) · นาฬิกาปลอม = ท่าเดียวกันทุกภาพ
//   node tools/perf/resshots.mjs <โฟลเดอร์ผล>
// 1.6 = ส่ง graphics.js ที่แก้ RES.high ในหน่วยความจำ (ดักคำขอ) — ไม่แตะไฟล์งาน
import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { launch, prepare, emulate, sleep } from './lib/cdp.mjs';
import { startServer, ROOT } from './lib/server.mjs';
import { waitFor } from './scenarios.mjs';
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const det = readFileSync(path.join(ROOT, 'tools/perf/inject/determinism.js'), 'utf8');
const srv = await startServer({ mode: 'dev', port: 5199 });
const src = readFileSync(path.join(ROOT, 'src/graphics.js'), 'utf8');
const patched = src.replace('high: { scale: 2, dpr: 1.5 }', 'high: { scale: 1.6, dpr: 1.5 }');
if (patched === src) throw new Error('หา RES.high ไม่เจอ');
const tmp = 'src/__perf_b1__graphics.js';
writeFileSync(path.join(ROOT, tmp), patched);
let js16; try { js16 = await (await fetch(srv.url + tmp)).text(); } finally { unlinkSync(path.join(ROOT, tmp)); }
for (const [label, res, swap] of [['2.0', 'high', false], ['1.6', 'high', true], ['1.4', 'mid', false]]) {
  const B = await launch({ tmp: process.env.PERF_TMP });
  const { cdp } = B;
  await prepare(cdp); await emulate(cdp, 'phone');
  if (swap) {
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*/src/graphics.js*' }] });
    cdp.on('Fetch.requestPaused', (e) => (new URL(e.request.url).pathname === '/src/graphics.js'
      ? cdp.send('Fetch.fulfillRequest', { requestId: e.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }], body: Buffer.from(js16).toString('base64') })
      : cdp.send('Fetch.continueRequest', { requestId: e.requestId })));
  }
  const gfx = { same: true, scenes: Object.fromEntries(['home', 'room', 'run'].map((s) => [s, { level: 'high', fps: 60, res }])) };
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.setItem('cookie-runner:pref:gfxScenes', ${JSON.stringify(JSON.stringify(gfx))}); } catch {}` });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: det });
  await cdp.send('Page.navigate', { url: srv.url });
  await waitFor(cdp, `document.readyState === 'complete' && window.__game`, 180000);
  await cdp.evaluate(`document.fonts.ready.then(() => true)`);
  await sleep(2500);
  await cdp.evaluate(`(() => { document.getElementById('titlePanel').classList.add('hidden'); document.getElementById('homeBtn').click(); return true; })()`, { gesture: true });
  await sleep(1500);
  await cdp.evaluate(`__det.step(90).then(() => true)`);
  await sleep(800);
  const cw = await cdp.evaluate(`document.getElementById('game').width + 'x' + document.getElementById('game').height`);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(path.join(out, `res-${label}.png`), Buffer.from(data, 'base64'));
  console.log(label, 'ผ้าใบ', cw);
  await B.close();
}
await srv.close(); process.exit(0);
