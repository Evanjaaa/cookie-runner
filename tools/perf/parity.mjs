// tools/perf/parity.mjs — พิสูจน์ว่าภาพ (และสถานะเกม) เหมือนเดิมทุกพิกเซล ก่อน/หลังแก้
//
//   node tools/perf/parity.mjs --swap src/town/rim-light.js [--swap ไฟล์อื่น…] [--base HEAD]
//        [--scene home|run] [--device phone|ipad|desktop] [--level high|mid|save] [--gpu]
//        [--frames 20,60,140] [--tag ชื่อ]
//
// ฝั่ง A = โค้ดเดิมจาก git (ดักคำขอไฟล์โมดูลแล้วส่งเวอร์ชันเดิมให้แทน — ไม่แตะไฟล์ในโฟลเดอร์งาน)
// ฝั่ง B = โค้ดปัจจุบัน · ลำดับ A B A B → เทียบ A–B ทุกเฟรมที่ถ่าย + คู่ควบคุม A–A, B–B (harness ต้องนิ่ง)
// นาฬิกาปลอม (inject/determinism.js): เวลาเดินเฉพาะตอนสั่ง → ทุกฝั่งเห็นเฟรมเดียวกันเป๊ะ
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { launch, prepare, emulate, sleep } from './lib/cdp.mjs';
import { startServer, ROOT } from './lib/server.mjs';
import { waitFor } from './scenarios.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const swaps = argv.flatMap((a, i) => (a === '--swap' ? [argv[i + 1]] : []));
const O = {
  base: opt('base', 'HEAD'), scene: opt('scene', 'home'), device: opt('device', 'phone'), level: opt('level', 'high'),
  gpu: argv.includes('--gpu'), frames: opt('frames', '20,60,140').split(',').map(Number), tag: opt('tag', 'parity'),
  fx: opt('fx', ''), skin: opt('skin', ''), outfit: opt('outfit', ''), stage: opt('stage', ''),
  page: opt('page', 'index'), spot: opt('spot', ''), hour: opt('hour', ''),
};
const OUT = path.join(ROOT, 'tools/perf/out/parity', O.tag);
mkdirSync(OUT, { recursive: true });
const det = readFileSync(path.join(ROOT, 'tools/perf/inject/determinism.js'), 'utf8');

const srv = await startServer({ mode: 'dev', port: 5199 });

// ── โค้ดเดิมของแต่ละไฟล์ ผ่านการแปลงของ Vite (import ถูกเขียนเป็น path เต็มแล้ว) ──
const OLD = new Map();
for (const rel of swaps) {
  const src = execFileSync('git', ['show', `${O.base}:${rel}`], { cwd: ROOT, maxBuffer: 1 << 28 }).toString('utf8');
  const dir = path.dirname(rel), tmp = path.join(dir, '__perf_old__' + path.basename(rel));
  writeFileSync(path.join(ROOT, tmp), src);
  try {
    const r = await fetch(srv.url + tmp.replace(/\\/g, '/'));
    OLD.set('/' + rel.replace(/\\/g, '/'), await r.text());
  } finally { unlinkSync(path.join(ROOT, tmp)); }
}

function preset() {
  const g = { same: true, scenes: Object.fromEntries(['home', 'room', 'run'].map((s) => [s, { level: O.level, fps: O.level === 'save' ? 30 : 60, res: O.level === 'save' ? 'low' : O.level === 'mid' ? 'mid' : 'high' }])) };
  const set = { 'cookie-runner:pref:gfxScenes': JSON.stringify(g), 'cookie-runner:pref:gfx': JSON.stringify(O.level) };
  if (O.fx) set['cookie-runner:town:lightfx'] = O.fx;
  if (O.skin) set['cookie-runner:skin'] = O.skin;
  if (O.outfit) set['cookie-runner:outfit'] = O.outfit;
  if (O.stage) set['cookie-runner:stage'] = O.stage;
  return `try { const s = ${JSON.stringify(set)}; for (const k in s) localStorage.setItem(k, s[k]); } catch {}`;
}

const STATE = `(() => { const g = window.__game; if (!g) return null; const p = g.player || {};
  const r = (x) => (typeof x === 'number' ? Math.round(x * 1000) / 1000 : x);
  return JSON.stringify({ st: g.state, sc: g.score, d: r(g.distance), cam: r(g.camera), py: r(p.y), pvy: r(p.vy), lv: g.lives, hp: r(g.hp), combo: g.combo,
    n: ['obstacles', 'treats', 'pickups', 'hazards', 'pits'].map((k) => (Array.isArray(g[k]) ? g[k].length : (g.level && Array.isArray(g.level[k]) ? g.level[k].length : -1))) }); })()`;

async function side(label, useOld) {
  const B = await launch({ port: 9333, gpu: O.gpu, tmp: process.env.PERF_TMP });
  const { cdp } = B;
  let served = 0;
  try {
    await prepare(cdp);
    await emulate(cdp, O.device);
    if (useOld && OLD.size) {
      await cdp.send('Fetch.enable', { patterns: [...OLD.keys()].map((p) => ({ urlPattern: '*' + p + '*', requestStage: 'Request' })) });
      cdp.on('Fetch.requestPaused', async (p) => {
        const u = new URL(p.request.url);
        const body = OLD.get(u.pathname);
        if (body != null) {
          served++;
          await cdp.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }, { name: 'Cache-Control', value: 'no-store' }], body: Buffer.from(body).toString('base64') });
        } else await cdp.send('Fetch.continueRequest', { requestId: p.requestId });
      });
    }
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: preset() });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: det });
    // เมือง: เปิดโหมดตัวอย่างเสมอ (?demo — ไม่แตะฐานข้อมูลจริง) · เลือกฉาก/ชั่วโมงผ่าน URL ที่เมืองรองรับอยู่แล้ว
    const town = O.page === 'town';
    const q = town ? `town.html?demo${O.spot ? '&spot=' + O.spot : ''}${O.hour ? '&hour=' + O.hour : ''}` : '';
    await cdp.send('Page.navigate', { url: srv.url + q });
    await waitFor(cdp, town ? `document.readyState === 'complete' && window.__town` : `document.readyState === 'complete' && window.__game`, 180000);
    await cdp.evaluate(`document.fonts.ready.then(() => true)`);
    await sleep(2500);
    if (town) {
      const mode = await cdp.evaluate(`window.__town.wallet && window.__town.wallet.mode`);
      if (mode === 'server') throw new Error('STOP: เมืองเข้าโหมด server (ต้องเป็น demo)');
    } else {
      await cdp.evaluate(`(() => { document.getElementById('titlePanel').classList.add('hidden'); document.getElementById('homeBtn').click(); return true; })()`, { gesture: true });
    }
    await sleep(1500);
    if (O.scene === 'run') {
      await cdp.evaluate(`document.getElementById('stageGo').click(), true`, { gesture: true });
      await sleep(800);
    }
    const shots = [], states = [];
    let f = 0;
    const maxF = Math.max(...O.frames);
    while (f < maxF) {
      // อินพุตตายตัวตามเฟรม (ฉากวิ่ง): กระโดดทุก 50 เฟรม · สไลด์ช่วงสั้นทุก 170 เฟรม
      if (O.scene === 'run' && f > 0) {
        if (f % 50 === 0) await cdp.evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', key: 'ArrowUp' })), true`);
        if (f % 50 === 6) await cdp.evaluate(`window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp', key: 'ArrowUp' })), true`);
      }
      const step = Math.min(10, maxF - f, ...O.frames.filter((x) => x > f).map((x) => x - f));
      await cdp.evaluate(`__det.step(${step}).then(() => true)`);
      f += step;
      if (f % 60 === 0 || O.frames.includes(f)) states.push([f, await cdp.evaluate(STATE)]);
      if (O.frames.includes(f)) {
        const url = await cdp.evaluate(`__det.shot('${O.page === 'town' ? '#town' : '#game'}')`);
        const file = path.join(OUT, `${label}-f${f}.png`);
        writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
        shots.push(file);
      }
    }
    const errors = await cdp.evaluate(`__det.errors.slice(0, 5)`);
    return { shots, states, errors, served };
  } finally { await B.close(); }
}

const res = {};
for (const [label, old] of [['A1', true], ['B1', false], ['A2', true], ['B2', false]]) res[label] = await side(label, old);
await srv.close();

const diff = (a, b, out) => JSON.parse(execFileSync('python', [path.join(ROOT, 'tools/perf/imgdiff.py'), a, b, out]).toString());
const rows = [];
let ok = true;
for (let i = 0; i < O.frames.length; i++) {
  const f = O.frames[i];
  const ab = diff(res.A1.shots[i], res.B1.shots[i], path.join(OUT, `diff-AB-f${f}.png`));
  const aa = diff(res.A1.shots[i], res.A2.shots[i], path.join(OUT, `diff-AA-f${f}.png`));
  const bb = diff(res.B1.shots[i], res.B2.shots[i], path.join(OUT, `diff-BB-f${f}.png`));
  const ab2 = diff(res.A2.shots[i], res.B2.shots[i], path.join(OUT, `diff-AB2-f${f}.png`));
  rows.push({ f, ab, ab2, aa, bb });
  if (!ab.pass || !ab2.pass) ok = false;
}
const st = (r) => JSON.stringify(r.states);
const stateSame = st(res.A1) === st(res.B1) && st(res.A2) === st(res.B2);
const ctlSame = st(res.A1) === st(res.A2) && st(res.B1) === st(res.B2);
const summary = { opts: { ...O, swaps }, rows, stateSame, ctlSame, errors: { A: res.A1.errors, B: res.B1.errors }, ok: ok && stateSame };
writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
for (const r of rows) {
  const s = (d) => (d.same ? 'เหมือน' : `ต่าง ${d.diffPx}px max ${d.max}${d.groups != null ? ' กลุ่ม ' + d.groups + ' ใหญ่สุด ' + d.biggestGroup : ''}`);
  console.log(`f${r.f}: A–B ${s(r.ab)} · A–B(รอบ2) ${s(r.ab2)} · คุม A–A ${s(r.aa)} · B–B ${s(r.bb)}`);
}
console.log(`ไฟล์เดิมที่ดักส่ง (ฝั่ง A ต้อง > 0): A1 ${res.A1.served} A2 ${res.A2.served} · B1 ${res.B1.served}`);
console.log(`สถานะเกม A=B: ${stateSame} · คุม: ${ctlSame} · error ในหน้า A/B: ${res.A1.errors.length}/${res.B1.errors.length}`);
console.log(ok && stateSame ? 'ผ่าน' : 'ไม่ผ่าน', '→', path.relative(ROOT, OUT));
process.exit(0);
