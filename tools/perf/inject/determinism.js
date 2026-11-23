// tools/perf/inject/determinism.js — นาฬิกาปลอมสำหรับเทียบภาพ (ฉีดก่อนสคริปต์ของเกม)
// เวลาไม่เดินเอง: performance.now / Date / rAF / setTimeout / setInterval เดินเฉพาะตอนสั่ง __det.step()
// Math.random มีเมล็ดตายตัว → โค้ดชุดเดียวกันรันสองครั้งต้องได้ภาพเดียวกันทุกพิกเซล (ตรวจด้วยคู่ควบคุม A/A)
(() => {
  if (window.__det) return;
  const SEED = Number(window.__detSeed || 12345) >>> 0;
  const EPOCH = Number(window.__detEpoch || Date.parse('2026-11-23T20:30:00+07:00'));
  const realST = window.setTimeout.bind(window);
  let T = 0;
  const D = { raf: [], rafId: 0, timers: [], tid: 0, frames: 0, errors: [] };
  window.__det = D;
  D.now = () => T;
  performance.now = () => T;
  const RD = Date;
  function FakeDate(...a) {
    if (!new.target) return new RD(EPOCH + T).toString();
    return a.length ? new RD(...a) : new RD(EPOCH + T);
  }
  FakeDate.prototype = RD.prototype;
  FakeDate.now = () => EPOCH + T;
  FakeDate.parse = RD.parse; FakeDate.UTC = RD.UTC;
  window.Date = FakeDate;
  let a = SEED;
  Math.random = function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  window.requestAnimationFrame = (cb) => { const id = ++D.rafId; D.raf.push([id, cb]); return id; };
  window.cancelAnimationFrame = (id) => { D.raf = D.raf.filter(([i]) => i !== id); };
  window.setTimeout = (fn, ms = 0, ...args) => { const id = ++D.tid; D.timers.push({ id, at: T + Math.max(0, +ms || 0), fn, args, every: 0 }); return id; };
  window.setInterval = (fn, ms = 0, ...args) => { const id = ++D.tid; const e = Math.max(1, +ms || 0); D.timers.push({ id, at: T + e, fn, args, every: e }); return id; };
  window.clearTimeout = window.clearInterval = (id) => { D.timers = D.timers.filter((t) => t.id !== id); };
  const run = (f, ...x) => { try { if (typeof f === 'function') f(...x); } catch (e) { D.errors.push(String(e && e.stack || e).slice(0, 300)); } };
  // แทรกช่วงพักจริงระหว่าง callback ให้ microtask (await/then) ทำงานครบก่อนตัวถัดไป เหมือนเบราว์เซอร์จริง
  const tick = () => new Promise((r) => realST(r, 0));
  D.step = async (n = 1, dt = 1000 / 60) => {
    for (let i = 0; i < n; i++) {
      const target = T + dt;
      for (;;) {
        D.timers.sort((p, q) => p.at - q.at || p.id - q.id);
        const t = D.timers[0];
        if (!t || t.at > target) break;
        T = Math.max(T, t.at);
        if (t.every) t.at += t.every; else D.timers.shift();
        run(t.fn, ...t.args);
        await tick();
      }
      T = target;
      const q = D.raf; D.raf = [];
      for (const [, cb] of q) run(cb, T);
      await tick();
      D.frames++;
    }
    return { T, frames: D.frames, errors: D.errors.length };
  };
  /** ภาพผ้าใบเป็น PNG (dataURL) — เทียบนอกหน้า */
  D.shot = (sel = '#game') => { const c = document.querySelector(sel); return c ? c.toDataURL('image/png') : ''; };
})();
