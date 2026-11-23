// tools/perf/scenarios.mjs — สถานการณ์มาตรฐาน (สคริปต์ตายตัว รันซ้ำได้)
// แต่ละตัวคืน { windows: [ผลวัดแต่ละช่วง], extra }
import { sleep } from './lib/cdp.mjs';

export async function waitFor(cdp, expr, ms = 60000, every = 200) {
  const t0 = Date.now();
  for (;;) {
    let ok = false;
    try { ok = await cdp.evaluate(`!!(${expr})`); } catch {}
    if (ok) return true;
    if (Date.now() - t0 > ms) throw new Error('timeout: ' + expr);
    await sleep(every);
  }
}

/** เปิดหน้าเกมแล้วรอจนพร้อม (ม่านโหลดหาย + ฟอนต์มา) */
export async function boot(ctx, q = '') {
  const { cdp, srv } = ctx;
  const t0 = Date.now();
  await cdp.send('Page.navigate', { url: srv.url + q });
  await waitFor(cdp, `document.readyState === 'complete' && document.getElementById('titlePanel') && !document.getElementById('splash')`, 180000);
  if (ctx.O.mode === 'dev') await waitFor(cdp, `window.__game`, 60000);
  ctx.bootMs = Date.now() - t0;
  await cdp.evaluate(`document.fonts.ready.then(() => true)`);
  await sleep(800);
}

/** ข้ามหน้าชื่อเกมไปหน้าแรก (ไม่ผ่านปุ่มเข้าสู่ระบบ — ค้างรอ Supabase) */
export async function goHome(ctx) {
  await ctx.cdp.evaluate(`(() => { document.getElementById('titlePanel').classList.add('hidden'); document.getElementById('homeBtn').click(); return true; })()`, { gesture: true });
  await sleep(1500);
}

export async function key(cdp, code, hold = 90) {
  const map = { ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40], ShiftLeft: ['Shift', 16], Space: [' ', 32] };
  const [k, vk] = map[code];
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code, key: k, windowsVirtualKeyCode: vk });
  await sleep(hold);
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: k, windowsVirtualKeyCode: vk });
}

/** แตะจอแบบผู้เล่น (นับเป็นการแตะจริง — lastInput ของหน้าแรกรีเซ็ต) */
export async function tap(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

/** (dev) กันน้องตายระหว่างวัด — หัวใจ/พลังเต็มตลอด ไม่รับการชน — พฤติกรรมนี้ใช้เฉพาะตอนวัดเวลา ไม่ใช้ตอนเทียบพฤติกรรม */
const KEEP_ALIVE = `(() => {
  const g = window.__game; if (!g || g.__keep) return !!g;
  g.__keep = true; g.takeHit = function () {};
  const up = g.update;
  g.update = function (dt) { if (this.state === 1 || this.lives !== undefined) { this.lives = Math.max(this.lives, 3); this.hp = 1e9; } return up.call(this, dt); };
  return true;
})()`;

export async function startRun(ctx) {
  const { cdp } = ctx;
  await cdp.evaluate(`document.getElementById('stageGo').click(), true`, { gesture: true });
  await sleep(600);
  // ข้ามฉากห้องก่อนวิ่ง (กดปุ่มเดียวกับผู้เล่น)
  await key(cdp, 'ArrowUp');
  await waitFor(cdp, `window.__game ? window.__game.state !== 0 : document.querySelector('#introPanel.hidden')`, 20000);
  await sleep(800);
  await cdp.evaluate(KEEP_ALIVE);
}

/** กระโดดเป็นจังหวะแบบผู้เล่น + สไลด์บ้าง */
async function playFor(cdp, secs) {
  const t0 = Date.now(); let i = 0;
  while (Date.now() - t0 < secs * 1000) {
    i++;
    if (i % 5 === 0) await key(cdp, 'ArrowDown', 500); else await key(cdp, 'ArrowUp', i % 3 ? 90 : 260);
    await sleep(700 + (i * 137) % 600);
  }
}

export const SCENARIOS = {
  /** S1a หน้าแรก มีคนแตะ */
  async home(ctx) {
    const { cdp, O } = ctx;
    await boot(ctx); await goHome(ctx);
    await sleep(3000);
    const w = await ctx.measure('home-active', O.secs, async (secs) => {
      const t0 = Date.now();
      while (Date.now() - t0 < secs * 1000) { await key(cdp, 'ShiftLeft', 40); await sleep(2000); }
    });
    return { windows: [w], heap: await ctx.heap(), bootMs: ctx.bootMs };
  },
  /** S1b หน้าแรกปล่อยนิ่ง (ข้ามเส้น 45 วิ) — วัดช่วงก่อนเส้นกับหลังเส้น */
  async idle(ctx) {
    const { O } = ctx;
    await boot(ctx); await goHome(ctx);
    await key(ctx.cdp, 'ShiftLeft', 40);
    await sleep(5000);
    const before = await ctx.measure('home-still<45s', 20);
    await sleep(Math.max(0, 47000 - 25000));
    const after = await ctx.measure('home-idle>45s', O.secs);
    return { windows: [before, after] };
  },
  /** S2 วิ่ง */
  async run(ctx) {
    const { cdp, O } = ctx;
    await boot(ctx); await goHome(ctx);
    await sleep(1500);
    await startRun(ctx);
    await sleep(2000);
    const w = await ctx.measure('run', O.secs, (secs) => playFor(cdp, secs));
    const st = await cdp.evaluate(`window.__game ? { state: __game.state, dist: Math.round(__game.distance || 0), score: __game.score, stage: (window.__game.stage || {}).id } : null`);
    return { windows: [w], state: st, heap: await ctx.heap() };
  },
};

/** เปิดหน้าเมือง (โหมดตัวอย่างเสมอ — ห้ามโหมด server) */
export async function bootTown(ctx) {
  const { cdp, srv, O } = ctx;
  const q = `town.html?demo${O.spot ? '&spot=' + O.spot : ''}${O.hour ? '&hour=' + O.hour : ''}`;
  await cdp.send('Page.navigate', { url: srv.url + q });
  await waitFor(cdp, `document.readyState === 'complete' && document.getElementById('town')`, 180000);
  if (O.mode === 'dev') {
    await waitFor(cdp, `window.__town`, 60000);
    const mode = await cdp.evaluate(`window.__town.wallet && window.__town.wallet.mode`);
    if (mode === 'server') throw new Error('STOP: เมืองเข้าโหมด server');
  }
  await cdp.evaluate(`document.fonts.ready.then(() => true)`);
  await sleep(4000);
}

// หน้าต่างที่เปิดจากหน้าแรกได้ (ปุ่มล็อบบี้) — เปิด แล้วปิดด้วย goHome() (ปุ่ม homeBtn ปิดทุกแผง)
const PANEL_BTNS = ['btnGacha', 'btnStash', 'btnShop', 'btnMap', 'btnDaily', 'btnMail', 'btnSettings', 'btnQuests', 'btnLvGift', 'btnNews', 'btnFriends', 'btnTalent', 'btnCatStore'];
const snapState = (cdp) => cdp.evaluate(`(() => { const c = __perf.canvasMB(); return { canvases: c.n, canvasMB: Math.round(c.mb * 10) / 10, nodes: document.getElementsByTagName('*').length }; })()`);

Object.assign(SCENARIOS, {
  /** S5 เมือง — ยืนเฉย ๆ ในฉาก (?spot= / &hour=) */
  async town(ctx) {
    await bootTown(ctx);
    const w = await ctx.measure('town' + (ctx.O.spot ? '-' + ctx.O.spot : ''), ctx.O.secs);
    return { windows: [w], heap: await ctx.heap() };
  },
  /** S4 เปิด/ปิดหน้าต่าง × รอบ — heap/ผ้าใบ/listener หลังเก็บขยะต้องไม่โต */
  async panels(ctx) {
    const { cdp, O } = ctx;
    await boot(ctx); await goHome(ctx); await sleep(2000);
    const rounds = Math.max(1, Math.round(O.secs));
    const pts = [];
    const sites0 = await cdp.evaluate(`__perf.canvasMB().bySite`);
    const take = async (i) => { const h = await ctx.heap(); const m = await cdp.send('Performance.getMetrics'); const g = Object.fromEntries(m.metrics.map((x) => [x.name, x.value])); pts.push({ round: i, heapMB: Math.round(h.usedMB * 10) / 10, listeners: g.JSEventListeners, docs: g.Documents, ...(await snapState(cdp)) }); };
    await take(0);
    for (let i = 1; i <= rounds; i++) {
      for (const id of PANEL_BTNS) {
        await cdp.evaluate(`(() => { const b = document.getElementById('${id}'); if (b) b.click(); return true; })()`, { gesture: true });
        await sleep(700);
        await cdp.evaluate(`(() => { document.getElementById('homeBtn').click(); return true; })()`, { gesture: true });
        await sleep(300);
      }
      if (i === 1 || i % 5 === 0 || i === rounds) await take(i);
    }
    const sites1 = await cdp.evaluate(`__perf.canvasMB().bySite`);
    return { windows: [], points: pts, sites0, sites1 };
  },
  /** S7 แท็บซ่อน — จำลอง visibilitychange แล้วดูว่าอะไรยังทำงาน (เสียง timer เน็ต) */
  async hidden(ctx) {
    const { cdp } = ctx;
    await boot(ctx); await goHome(ctx);
    await key(cdp, 'ShiftLeft', 40);
    await sleep(3000);
    const before = await cdp.evaluate(`({ audio: __perf.audioCtx.map((c) => c.state) })`);
    await cdp.evaluate(`(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); return true; })()`);
    await sleep(2000);
    const w = await ctx.measure('hidden(จำลอง)', ctx.O.secs);
    const after = await cdp.evaluate(`({ audio: __perf.audioCtx.map((c) => c.state) })`);
    return { windows: [w], before, after };
  },
});

Object.assign(SCENARIOS, {
  /** S6 เปิดเกมครั้งแรก — เวลาถึงม่านหาย (main.js รันจบ) · คำขอ/ไบต์ · long tasks ช่วงเปิด */
  async load(ctx) {
    const { cdp } = ctx;
    await boot(ctx);
    const t = await cdp.evaluate(`(() => { const n = performance.getEntriesByType('navigation')[0] || {}; const fcp = performance.getEntriesByName('first-contentful-paint')[0]; return { dcl: Math.round(n.domContentLoadedEventEnd || 0), load: Math.round(n.loadEventEnd || 0), fcp: fcp ? Math.round(fcp.startTime) : 0, res: performance.getEntriesByType('resource').length }; })()`);
    return { windows: [], bootMs: ctx.bootMs, timing: t };
  },
});
