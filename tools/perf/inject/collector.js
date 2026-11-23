// tools/perf/inject/collector.js
// ฉีดเข้าหน้าก่อนสคริปต์ของเกม (Page.addScriptToEvaluateOnNewDocument) — ไม่ได้อยู่ในซอร์สเกม
// เก็บ: เวลาทุกเฟรม (rAF) · จำนวนลูป rAF ต่อเฟรม · timer ที่ตื่น · long animation frames
//       ผ้าใบที่ยังมีชีวิต · AudioContext · สื่อที่เล่นอยู่ · (dev) เวลา game.update / game.draw
// ห่อฟังก์ชันของเบราว์เซอร์แบบโปร่งใส — พฤติกรรมของเกมเหมือนเดิม (id ของ rAF/timer คือตัวจริง)
(() => {
  if (window.__perf) return;
  const now = performance.now.bind(performance);
  const cfg = Object.assign({ canvasStacks: true, mutations: false }, window.__perfCfg || {});
  const P = {
    on: false, t0: 0,
    frames: [],          // [ts, nCallbacks, msCallbacks, msUpdate, msDraw, drew]
    loops: new Map(),    // ชื่อ callback → { n, ms }
    timers: { set: 0, fired: 0, ms: 0, byName: new Map() },
    intervals: new Map(),// id → { ms, name, alive }
    loaf: [],
    canvases: [],        // WeakRef
    canvasMade: 0, canvasSites: new Map(), canvasResizes: 0, resizeSites: new Map(),
    audioCtx: [], media: new Set(),
    mut: 0,
  };
  window.__perf = P;

  // ── rAF ── จัดกลุ่มตาม timestamp ของเฟรม (callback ในเฟรมเดียวกันได้ค่าเดียวกัน)
  const rAF = window.requestAnimationFrame.bind(window);
  let cur = null, inRAF = 0;
  const flushFrame = () => { if (cur && P.on) P.frames.push(cur); cur = null; };
  window.requestAnimationFrame = function (cb) {
    return rAF(function perfWrap(ts) {
      // __perfAB: สลับฝั่งโค้ด A/B ทุกเฟรม (tools/perf/abmod.mjs) แล้วจดว่าเฟรมนี้เป็นฝั่งไหน
      if (!cur || cur[0] !== ts) { flushFrame(); if (window.__perfAB) window.__abSide = window.__abSide === 'A' ? 'B' : 'A'; cur = [ts, 0, 0, 0, 0, 0, window.__abSide || '']; }
      const a = now();
      inRAF++;
      try { return cb(ts); } finally {
        inRAF--;
        const d = now() - a;
        cur[1] += 1; cur[2] += d;
        if (P.on) {
          const k = cb.name || '(anon)';
          const e = P.loops.get(k) || { n: 0, ms: 0 };
          e.n += 1; e.ms += d; P.loops.set(k, e);
        }
      }
    });
  };

  // ── timers ── นับการตื่นทั้งหมด (แบต: เครื่องต้องตื่นมาทำงานทุกครั้ง)
  const sT = window.setTimeout.bind(window), sI = window.setInterval.bind(window), cI = window.clearInterval.bind(window);
  const site = () => { const s = (new Error().stack || '').split('\n'); return (s[3] || '').trim().replace(/\?[^:)]*/g, '').slice(0, 160); };
  const wrapT = (fn, name) => function perfTimer() {
    const a = now();
    try { return typeof fn === 'function' ? fn.apply(this, arguments) : undefined; } finally {
      if (P.on) {
        const d = now() - a;
        P.timers.fired += 1; P.timers.ms += d;
        const e = P.timers.byName.get(name) || { n: 0, ms: 0 };
        e.n += 1; e.ms += d; P.timers.byName.set(name, e);
      }
    }
  };
  window.setTimeout = function (fn, ms, ...rest) {
    if (P.on) P.timers.set += 1;
    return sT(wrapT(fn, 'T ' + (fn && fn.name || '') + ' @' + site()), ms, ...rest);
  };
  window.setInterval = function (fn, ms, ...rest) {
    const name = 'I ' + (fn && fn.name || '') + ' ' + ms + 'ms @' + site();
    const id = sI(wrapT(fn, name), ms, ...rest);
    P.intervals.set(id, { ms, name, alive: true });
    return id;
  };
  window.clearInterval = function (id) { const e = P.intervals.get(id); if (e) e.alive = false; return cI(id); };

  // ── long animation frames ── บอกสคริปต์ต้นเหตุของเฟรมที่ยาวได้
  try {
    new PerformanceObserver((list) => {
      if (!P.on) return;
      for (const e of list.getEntries()) {
        P.loaf.push({
          t: e.startTime, dur: e.duration, block: e.blockingDuration, render: e.renderStart ? e.startTime + e.duration - e.renderStart : 0,
          scripts: (e.scripts || []).slice(0, 4).map((s) => ({ d: Math.round(s.duration), fn: s.sourceFunctionName, url: (s.sourceURL || '').replace(/^.*\/(src|assets)\//, '$1/'), inv: s.invoker })),
        });
      }
    }).observe({ type: 'long-animation-frame', buffered: false });
  } catch {}

  // ── ผ้าใบ ── จดทุกตัวที่สร้าง (WeakRef ไม่กันการเก็บขยะ) + จุดที่สร้าง
  const cE = Document.prototype.createElement;
  const noteCanvas = (c) => {
    P.canvases.push(new WeakRef(c));
    P.canvasMade += 1;
    if (cfg.canvasStacks) {
      const s = (new Error().stack || '').split('\n').slice(3, 5).map((x) => x.trim().replace(/\?[^:)]*/g, '').replace(/^at /, '').replace(/https?:\/\/[^/]+\//, '')).join(' < ').slice(0, 200);
      P.canvasSites.set(s, (P.canvasSites.get(s) || 0) + 1);
      c.__site = s;
    }
  };
  Document.prototype.createElement = function (tag) {
    const el = cE.apply(this, arguments);
    if (typeof tag === 'string' && tag.toLowerCase() === 'canvas') noteCanvas(el);
    return el;
  };
  if (window.OffscreenCanvas) {
    const OC = window.OffscreenCanvas;
    window.OffscreenCanvas = new Proxy(OC, { construct(t, args) { const c = new t(...args); noteCanvas(c); return c; } });
  }
  for (const proto of [HTMLCanvasElement.prototype, window.OffscreenCanvas && OffscreenCanvas.prototype].filter(Boolean)) {
    for (const k of ['width', 'height']) {
      const d = Object.getOwnPropertyDescriptor(proto, k);
      if (!d || !d.set) continue;
      // จดเฉพาะครั้งที่ค่าเปลี่ยนจริง (ตั้งค่าเท่าเดิมก็ล้างผ้าใบ แต่ไม่จองหน่วยความจำใหม่) + จุดที่สั่ง
      Object.defineProperty(proto, k, { ...d, set(v) {
        if (P.on) {
          P.canvasResizes += 1;
          if (d.get && d.get.call(this) !== v) {
            const s = (new Error().stack || '').split('\n').slice(2).filter((x) => !x.includes('<anonymous>')).slice(0, 2).map((x) => x.trim().replace(/\?[^:)]*/g, '').replace(/https?:\/\/[^/]+\//, '').replace(/^at /, '')).join(' < ');
            P.resizeSites.set(s, (P.resizeSites.get(s) || 0) + 1);
          }
        }
        d.set.call(this, v);
      } });
    }
  }

  // ── เสียง/วิดีโอ ──
  for (const name of ['AudioContext', 'webkitAudioContext']) {
    const AC = window[name];
    if (!AC) continue;
    window[name] = new Proxy(AC, { construct(t, args) { const c = new t(...args); P.audioCtx.push(c); return c; } });
  }
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { P.media.add(this); return play.apply(this, arguments); };

  // ── (dev) เวลา update/draw ของเกม ── main.js ตั้ง window.__game ตอน DEV
  let G;
  Object.defineProperty(window, '__game', {
    configurable: true,
    get() { return G; },
    set(g) {
      G = g;
      const up = g.update, dr = g.draw;
      g.update = function (dt) { const a = now(); try { return up.call(this, dt); } finally { if (cur && inRAF) cur[3] += now() - a; } };
      // วาดนอกลูป (เช่นตอนผ้าใบเปลี่ยนขนาด) นับแยก ไม่ปนกับเฟรม
      g.draw = function (ctx) { const a = now(); try { return dr.call(this, ctx); } finally { if (cur && inRAF) { cur[4] += now() - a; cur[5] = 1; } else if (P.on) P.drawOutside += 1; } };
    },
  });

  if (cfg.mutations) {
    new MutationObserver((r) => { if (P.on) P.mut += r.length; }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  }

  // ── API ──
  // จุดที่สร้างผ้าใบนับสะสมตั้งแต่เปิดหน้า (ส่วนใหญ่สร้างตอนเปิดเกม ก่อนเริ่มวัด) · made = เฉพาะช่วงวัด
  P.reset = () => {
    flushFrame();
    P.frames = []; P.loops = new Map(); P.loaf = [];
    P.timers = { set: 0, fired: 0, ms: 0, byName: new Map() };
    P.canvasMade = 0; P.canvasResizes = 0; P.resizeSites = new Map(); P.mut = 0; P.drawOutside = 0;
  };
  P.start = () => { P.reset(); P.on = true; P.t0 = now(); };
  P.canvasMB = () => {
    let n = 0, px = 0; const big = [];
    const seen = new Set();
    const all = [...document.querySelectorAll('canvas')];
    for (const w of P.canvases) { const c = w.deref(); if (c) all.push(c); }
    for (const c of all) {
      if (seen.has(c)) continue; seen.add(c);
      const p = (c.width || 0) * (c.height || 0);
      n += 1; px += p;
      if (p > 0) big.push([p, (c.id || c.className || (c.isConnected ? 'dom' : c instanceof HTMLCanvasElement ? 'detached' : 'offscreen')) + ' ' + c.width + 'x' + c.height + (c.__site ? ' @' + c.__site.split(' < ')[0] : '')]);
    }
    big.sort((a, b) => b[0] - a[0]);
    // รวม MB ตามจุดที่สร้าง — แคชไหนกินหน่วยความจำเท่าไหร่
    const bySite = new Map();
    for (const c of seen) { const k = c.__site ? c.__site.split(' < ')[0] : (c.id || 'html'); const e = bySite.get(k) || [0, 0]; e[0] += 1; e[1] += (c.width || 0) * (c.height || 0) * 4 / 1048576; bySite.set(k, e); }
    const sites = [...bySite].sort((a, b) => b[1][1] - a[1][1]).slice(0, 15).map(([k, [cnt, mb]]) => `${mb.toFixed(1)}MB ×${cnt} ${k}`);
    return { n, mb: px * 4 / 1048576, top: big.slice(0, 12).map((b) => b[1]), bySite: sites };
  };
  P.stop = () => {
    flushFrame();
    P.on = false;
    const secs = (now() - P.t0) / 1000;
    const pct = (a, q) => (a.length ? a[Math.min(a.length - 1, Math.floor(q * a.length))] : 0);
    const r2 = (x) => Math.round(x * 100) / 100;
    const F = P.frames;
    const gaps = []; for (let i = 1; i < F.length; i++) gaps.push(F[i][0] - F[i - 1][0]);
    const cbs = F.map((f) => f[2]).sort((a, b) => a - b);
    const draws = F.filter((f) => f[5]);
    const dms = draws.map((f) => f[4]).sort((a, b) => a - b);
    const ums = F.map((f) => f[3]).sort((a, b) => a - b);
    const dgaps = []; for (let i = 1; i < draws.length; i++) dgaps.push(draws[i][0] - draws[i - 1][0]);
    const sg = [...gaps].sort((a, b) => a - b), sdg = [...dgaps].sort((a, b) => a - b);
    const loops = [...P.loops].map(([k, v]) => ({ k, n: v.n, perSec: r2(v.n / secs), ms: r2(v.ms / secs) })).sort((a, b) => b.ms - a.ms).slice(0, 15);
    const timers = [...P.timers.byName].map(([k, v]) => ({ k, perSec: r2(v.n / secs), msPerSec: r2(v.ms / secs) })).sort((a, b) => b.perSec - a.perSec).slice(0, 15);
    const iv = [...P.intervals.values()].filter((e) => e.alive).map((e) => e.name);
    const audio = P.audioCtx.map((c) => c.state + '@' + c.sampleRate);
    const media = [...P.media].filter((m) => !m.paused).map((m) => (m.tagName + ' ' + (m.currentSrc || m.src || '').split('/').pop()).slice(0, 80));
    const loafs = P.loaf.sort((a, b) => b.dur - a.dur);
    return {
      secs: r2(secs), frames: F.length, fps: r2(F.length / secs),
      cbPerFrame: r2(F.reduce((s, f) => s + f[1], 0) / Math.max(1, F.length)),
      cbMs: { p50: r2(pct(cbs, 0.5)), p95: r2(pct(cbs, 0.95)), p99: r2(pct(cbs, 0.99)), max: r2(cbs[cbs.length - 1] || 0), perSec: r2(cbs.reduce((s, x) => s + x, 0) / secs) },
      gap: { p50: r2(pct(sg, 0.5)), p95: r2(pct(sg, 0.95)), p99: r2(pct(sg, 0.99)), max: r2(sg[sg.length - 1] || 0), over20: gaps.filter((g) => g > 20).length, over34: gaps.filter((g) => g > 34).length },
      draws: draws.length, drawFps: r2(draws.length / secs),
      drawMs: { p50: r2(pct(dms, 0.5)), p95: r2(pct(dms, 0.95)), p99: r2(pct(dms, 0.99)), max: r2(dms[dms.length - 1] || 0), perSec: r2(dms.reduce((s, x) => s + x, 0) / secs) },
      updMs: { p50: r2(pct(ums, 0.5)), p95: r2(pct(ums, 0.95)), perSec: r2(ums.reduce((s, x) => s + x, 0) / secs) },
      drawGap: { p50: r2(pct(sdg, 0.5)), p95: r2(pct(sdg, 0.95)), p99: r2(pct(sdg, 0.99)), max: r2(sdg[sdg.length - 1] || 0) },
      loops, timers, timerFiredPerSec: r2(P.timers.fired / secs), timerMsPerSec: r2(P.timers.ms / secs), intervalsAlive: iv,
      loaf: { n: loafs.length, perMin: r2(loafs.length / secs * 60), top: loafs.slice(0, 6).map((l) => ({ dur: Math.round(l.dur), block: Math.round(l.block), render: Math.round(l.render), s: l.scripts })) },
      canvas: { ...P.canvasMB(), madePerSec: r2(P.canvasMade / secs), resizesPerSec: r2(P.canvasResizes / secs), sites: [...P.canvasSites].sort((a, b) => b[1] - a[1]).slice(0, 10), resizeSites: [...P.resizeSites].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${r2(v / secs)}/s ${k}`) },
      audio, media, mutPerSec: r2(P.mut / secs),
    };
  };
})();
