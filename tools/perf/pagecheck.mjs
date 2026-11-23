// tools/perf/pagecheck.mjs — เปิดทุกหน้าที่ใช้โค้ดร่วมกัน แล้วเก็บ error ของหน้า (เทียบโค้ดเดิม/ใหม่ได้ด้วย --swap)
//   node tools/perf/pagecheck.mjs [--swap ไฟล์,ไฟล์] [--base HEAD]
import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { launch, prepare, emulate, sleep } from './lib/cdp.mjs';
import { startServer, ROOT } from './lib/server.mjs';
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const PAGES = ['', 'town.html?demo', 'editor.html', 'admin.html', 'cat-lab.html', 'run-lab.html', 'monster-lab.html', 'gameplay-lab.html'];
const srv = await startServer({ mode: 'dev', port: 5199 });
const OLD = new Map();
for (const rel of (opt('swap', '') ? opt('swap').split(',') : [])) {
  const src = execFileSync('git', ['show', `${opt('base', 'HEAD')}:${rel}`], { cwd: ROOT, maxBuffer: 1 << 28 }).toString('utf8');
  const tmp = path.join(path.dirname(rel), '__perf_old__' + path.basename(rel));
  writeFileSync(path.join(ROOT, tmp), src);
  const fwd = (x) => x.split('\\').join('/');
  try { OLD.set('/' + fwd(rel), await (await fetch(srv.url + fwd(tmp))).text()); } finally { unlinkSync(path.join(ROOT, tmp)); }
}
for (const p of PAGES) {
  const B = await launch({ tmp: process.env.PERF_TMP });
  const { cdp } = B;
  const { logs, net } = await prepare(cdp);
  await emulate(cdp, 'desktop');
  if (OLD.size) {
    await cdp.send('Fetch.enable', { patterns: [...OLD.keys()].map((u) => ({ urlPattern: '*' + u + '*' })) });
    cdp.on('Fetch.requestPaused', async (e) => {
      const body = OLD.get(new URL(e.request.url).pathname);
      if (body != null) await cdp.send('Fetch.fulfillRequest', { requestId: e.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }], body: Buffer.from(body).toString('base64') });
      else await cdp.send('Fetch.continueRequest', { requestId: e.requestId });
    });
  }
  await cdp.send('Page.navigate', { url: srv.url + p });
  await sleep(14000);
  const mode = p.startsWith('town') ? await cdp.evaluate(`window.__town?.wallet?.mode || ''`).catch(() => '') : '';
  const ex = logs.filter((l) => l.level === 'exception' || l.level === 'error').map((l) => l.text.split('\n')[0].slice(0, 160));
  const bad404 = net.filter((r) => r.status === 404).map((r) => r.url.replace(srv.url, '/'));
  console.log(`${(p || 'index.html').padEnd(18)} ${mode ? 'wallet=' + mode + ' ' : ''}error ${ex.length}${ex.length ? ': ' + [...new Set(ex)].slice(0, 4).join(' | ') : ''}${bad404.length ? ' · 404: ' + [...new Set(bad404)].slice(0, 4).join(' ') : ''}`);
  if (mode === 'server') { console.log('STOP: เมืองเข้าโหมด server'); process.exit(1); }
  await B.close();
}
await srv.close();
process.exit(0);
