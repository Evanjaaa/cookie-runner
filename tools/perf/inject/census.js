// tools/perf/inject/census.js — นับคำสั่งวาด Canvas 2D ต่อเฟรม (ไม่ขึ้นกับความแรงของเครื่องทดสอบ)
// ใช้เฉพาะรอบวิเคราะห์ (--census) — ห่อทุกเมธอดจึงมีต้นทุนเพิ่ม ห้ามใช้ตัวเลขเวลาจากรอบนี้
// แยกผ้าใบหลัก (#game) กับผ้าใบอื่น · drawImage/fillRect นับพื้นที่เป็นพิกเซลจริง (คูณ transform)
(() => {
  if (window.__census) return;
  const C = { on: false, frames: 0, main: new Map(), off: new Map(), px: { main: 0, off: 0 }, big: new Map(), filters: new Map(), sites: new Map(), siteOn: false };
  window.__census = C;
  const P2 = CanvasRenderingContext2D.prototype;
  const PO = window.OffscreenCanvasRenderingContext2D && OffscreenCanvasRenderingContext2D.prototype;
  const isMain = (ctx) => ctx.canvas && ctx.canvas.id === 'game';
  const bump = (ctx, k, n = 1) => { const m = isMain(ctx) ? C.main : C.off; m.set(k, (m.get(k) || 0) + n); };
  const scaleOf = (ctx) => { try { const t = ctx.getTransform(); return Math.abs(t.a * t.d - t.b * t.c); } catch { return 1; } };
  // เฟรมแรกที่ไม่ใช่ของตัววัดเอง (สคริปต์ที่ฉีดเข้ามาไม่มี URL = <anonymous>) + เฟรมถัดไปอีกหนึ่ง
  const site = () => {
    const s = (new Error().stack || '').split('\n').slice(1).filter((x) => !x.includes('<anonymous>'));
    return s.slice(0, 2).map((x) => x.trim().replace(/\?[^:)]*/g, '').replace(/https?:\/\/[^/]+\//, '').replace(/^at /, '')).join(' < ').slice(0, 200);
  };
  const area = (ctx, w, h, label) => {
    const a = Math.abs(w * h) * scaleOf(ctx);
    const k = isMain(ctx) ? 'main' : 'off';
    C.px[k] += a;
    if (a > 250000 && C.on) { const s = label + ' ' + k + ' ' + (C.siteOn ? site() : ''); C.big.set(s, (C.big.get(s) || 0) + a); }
    return a;
  };
  for (const proto of [P2, PO].filter(Boolean)) {
    const wrap = (name, pre) => {
      const f = proto[name];
      if (typeof f !== 'function') return;
      proto[name] = function () {
        if (C.on) { bump(this, name); if (pre) pre(this, arguments); }
        return f.apply(this, arguments);
      };
    };
    wrap('drawImage', (ctx, a) => {
      let w, h;
      if (a.length >= 9) { w = a[7]; h = a[8]; } else if (a.length >= 5) { w = a[3]; h = a[4]; } else { w = a[0].width || a[0].videoWidth || 0; h = a[0].height || a[0].videoHeight || 0; }
      area(ctx, w, h, 'drawImage' + (a[0] && a[0].width ? '(' + a[0].width + 'x' + a[0].height + ')' : ''));
      if (ctx.filter && ctx.filter !== 'none') { bump(ctx, 'drawImage+filter'); C.filters.set(ctx.filter, (C.filters.get(ctx.filter) || 0) + 1); }
      if (ctx.shadowBlur > 0 && ctx.shadowColor !== 'rgba(0, 0, 0, 0)') bump(ctx, 'drawImage+shadow');
    });
    wrap('fillRect', (ctx, a) => { area(ctx, a[2], a[3], 'fillRect'); if (ctx.filter && ctx.filter !== 'none') bump(ctx, 'fill+filter'); });
    wrap('clearRect', (ctx, a) => area(ctx, a[2], a[3], 'clearRect'));
    wrap('fill', (ctx) => { if (ctx.filter && ctx.filter !== 'none') { bump(ctx, 'fill+filter'); C.filters.set(ctx.filter, (C.filters.get(ctx.filter) || 0) + 1); } if (ctx.shadowBlur > 0 && ctx.shadowColor !== 'rgba(0, 0, 0, 0)') bump(ctx, 'fill+shadow'); if (ctx.globalCompositeOperation !== 'source-over') bump(ctx, 'fill+gco:' + ctx.globalCompositeOperation); });
    wrap('stroke', (ctx) => { if (ctx.filter && ctx.filter !== 'none') bump(ctx, 'stroke+filter'); if (ctx.shadowBlur > 0 && ctx.shadowColor !== 'rgba(0, 0, 0, 0)') bump(ctx, 'stroke+shadow'); });
    for (const n of ['fillText', 'strokeText', 'clip', 'save', 'restore', 'createLinearGradient', 'createRadialGradient', 'createConicGradient', 'createPattern', 'measureText', 'putImageData', 'arc', 'ellipse', 'bezierCurveTo', 'quadraticCurveTo', 'beginPath', 'setTransform', 'roundRect']) wrap(n);
    wrap('getImageData', (ctx, a) => { area(ctx, a[2], a[3], 'getImageData'); if (C.siteOn || true) { const s = site(); C.sites.set('getImageData ' + s, (C.sites.get('getImageData ' + s) || 0) + 1); } });
    for (const prop of ['filter', 'shadowBlur', 'globalCompositeOperation', 'font']) {
      const d = Object.getOwnPropertyDescriptor(proto, prop);
      if (!d || !d.set) continue;
      Object.defineProperty(proto, prop, { ...d, set(v) { if (C.on) { if (prop === 'filter' && v !== 'none') bump(this, 'set filter'); else if (prop === 'shadowBlur' && v > 0) bump(this, 'set shadowBlur'); else if (prop === 'globalCompositeOperation' && v !== 'source-over') bump(this, 'set gco'); else if (prop === 'font') bump(this, 'set font'); } d.set.call(this, v); } });
    }
  }
  // นับเฟรมจาก rAF ของหน้า
  const rAF = window.requestAnimationFrame;
  let lastTs = -1;
  window.requestAnimationFrame = function (cb) { return rAF.call(window, (ts) => { if (C.on && ts !== lastTs) { lastTs = ts; C.frames++; } return cb(ts); }); };
  C.start = (siteOn = false) => { C.on = true; C.siteOn = siteOn; C.frames = 0; C.main = new Map(); C.off = new Map(); C.px = { main: 0, off: 0 }; C.big = new Map(); C.filters = new Map(); C.sites = new Map(); };
  C.stop = () => {
    C.on = false;
    const f = Math.max(1, C.frames);
    const per = (m) => Object.fromEntries([...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round(v / f * 10) / 10]));
    const mainPx = document.getElementById('game');
    const screenPx = mainPx ? mainPx.width * mainPx.height : 1;
    return {
      frames: C.frames, mainCanvas: mainPx ? mainPx.width + 'x' + mainPx.height : '',
      perFrameMain: per(C.main), perFrameOff: per(C.off),
      // พื้นที่ที่วาดต่อเฟรม หน่วย "เต็มจอ" (1 = ทั้งผ้าใบหลักหนึ่งรอบ)
      fullScreensPerFrame: { main: Math.round(C.px.main / f / screenPx * 100) / 100, off: Math.round(C.px.off / f / screenPx * 100) / 100 },
      bigDraws: [...C.big].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, v]) => `${(v / f / screenPx).toFixed(2)}scr ${k}`),
      filters: [...C.filters].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${(v / f).toFixed(1)}/f ${k}`),
      readbacks: [...C.sites].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${(v / f).toFixed(2)}/f ${k}`),
    };
  };
})();
