// SVG recorder: Canvas2D-like context that records drawing as vector SVG.
// Must run BEFORE drawing modules are imported (replaces window.Path2D).
(() => {
  const RealPath2D = window.Path2D;
  const TAU = Math.PI * 2;
  const warn = new Map();
  const W = (k) => warn.set(k, (warn.get(k) || 0) + 1);
  const num = (v) => (Math.abs(v) < 1e-9 ? 0 : +v.toFixed(3));

  function parseD(d) {
    const tk = d.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
    const out = []; let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, c2 = null, q = null;
    const n = () => +tk[i++];
    const cub = (a, b, c, d2, e, f) => { out.push(['C', a, b, c, d2, e, f]); c2 = [c, d2]; x = e; y = f; };
    while (i < tk.length) {
      if (/^[A-Za-z]$/.test(tk[i])) cmd = tk[i++]; else if (!cmd || /z/i.test(cmd)) { i++; continue; }
      const rel = cmd >= 'a', ox = rel ? x : 0, oy = rel ? y : 0, C = cmd.toUpperCase();
      if (C !== 'C' && C !== 'S') c2 = null;
      if (C !== 'Q' && C !== 'T') q = null;
      if (C === 'Z') { out.push(['Z']); x = sx; y = sy; }
      else if (C === 'M') { x = ox + n(); y = oy + n(); sx = x; sy = y; out.push(['M', x, y]); cmd = rel ? 'l' : 'L'; }
      else if (C === 'L') { x = ox + n(); y = oy + n(); out.push(['L', x, y]); }
      else if (C === 'H') { x = ox + n(); out.push(['L', x, y]); }
      else if (C === 'V') { y = oy + n(); out.push(['L', x, y]); }
      else if (C === 'C') cub(ox + n(), oy + n(), ox + n(), oy + n(), ox + n(), oy + n());
      else if (C === 'S') { const a = c2 ? 2 * x - c2[0] : x, b = c2 ? 2 * y - c2[1] : y; cub(a, b, ox + n(), oy + n(), ox + n(), oy + n()); }
      else if (C === 'Q' || C === 'T') {
        let px, py; if (C === 'Q') { px = ox + n(); py = oy + n(); } else { px = q ? 2 * x - q[0] : x; py = q ? 2 * y - q[1] : y; }
        const ex = ox + n(), ey = oy + n(), x0 = x, y0 = y;
        cub(x0 + 2 / 3 * (px - x0), y0 + 2 / 3 * (py - y0), ex + 2 / 3 * (px - ex), ey + 2 / 3 * (py - ey), ex, ey); c2 = null; q = [px, py];
      } else if (C === 'A') {
        let rx = Math.abs(n()), ry = Math.abs(n()); const phi = (n() * Math.PI) / 180, fa = n(), fs = n(); const ex = ox + n(), ey = oy + n();
        if (!rx || !ry) { out.push(['L', ex, ey]); x = ex; y = ey; continue; }
        const cp = Math.cos(phi), sp = Math.sin(phi), dx = (x - ex) / 2, dy = (y - ey) / 2;
        const x1 = cp * dx + sp * dy, y1 = -sp * dx + cp * dy;
        const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry); if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
        const sgn = fa === fs ? -1 : 1, nm = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1, den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
        const co = sgn * Math.sqrt(Math.max(0, nm / den)), cxp = (co * rx * y1) / ry, cyp = (-co * ry * x1) / rx;
        const cx = cp * cxp - sp * cyp + (x + ex) / 2, cy = sp * cxp + cp * cyp + (y + ey) / 2;
        const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
        const t0 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry); let dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
        if (!fs && dt > 0) dt -= TAU; else if (fs && dt < 0) dt += TAU;
        const segs = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9)), st = dt / segs, k = 4 / 3 * Math.tan(st / 4);
        const P = (a) => [cx + rx * Math.cos(a) * cp - ry * Math.sin(a) * sp, cy + rx * Math.cos(a) * sp + ry * Math.sin(a) * cp];
        const D = (a) => [-rx * Math.sin(a) * cp - ry * Math.cos(a) * sp, -rx * Math.sin(a) * sp + ry * Math.cos(a) * cp];
        let a = t0;
        for (let s2 = 0; s2 < segs; s2++) { const b = a + st, p0 = P(a), p1 = P(b), d0 = D(a), d1 = D(b); cub(p0[0] + k * d0[0], p0[1] + k * d0[1], p1[0] - k * d1[0], p1[1] - k * d1[1], p1[0], p1[1]); a = b; }
        x = ex; y = ey; c2 = null;
      } else i++;
    }
    return out;
  }
  class Builder {
    constructor() { this.cmds = []; this.cur = null; this.start = null; }
    moveTo(x, y) { this.cmds.push(['M', x, y]); this.cur = [x, y]; this.start = [x, y]; }
    lineTo(x, y) { if (!this.cur) return this.moveTo(x, y); this.cmds.push(['L', x, y]); this.cur = [x, y]; }
    bezierCurveTo(a, b, c, d, x, y) { if (!this.cur) this.moveTo(a, b); this.cmds.push(['C', a, b, c, d, x, y]); this.cur = [x, y]; }
    quadraticCurveTo(px, py, x, y) { if (!this.cur) this.moveTo(px, py); const [x0, y0] = this.cur; this.bezierCurveTo(x0 + 2 / 3 * (px - x0), y0 + 2 / 3 * (py - y0), x + 2 / 3 * (px - x), y + 2 / 3 * (py - y), x, y); }
    closePath() { if (this.cmds.length) { this.cmds.push(['Z']); this.cur = this.start ? [...this.start] : null; } }
    rect(x, y, w, h) { this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath(); }
    roundRect(x, y, w, h, r = 0) {
      let rr = Array.isArray(r) ? r[0] : r; rr = typeof rr === 'object' ? rr.x : rr; rr = Math.min(rr || 0, Math.abs(w) / 2, Math.abs(h) / 2);
      if (!rr) return this.rect(x, y, w, h);
      this.moveTo(x + rr, y); this.lineTo(x + w - rr, y); this.arc(x + w - rr, y + rr, rr, -Math.PI / 2, 0);
      this.lineTo(x + w, y + h - rr); this.arc(x + w - rr, y + h - rr, rr, 0, Math.PI / 2);
      this.lineTo(x + rr, y + h); this.arc(x + rr, y + h - rr, rr, Math.PI / 2, Math.PI);
      this.lineTo(x, y + rr); this.arc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5); this.closePath();
    }
    arc(x, y, r, a0, a1, ccw = false) { this.ellipse(x, y, r, r, 0, a0, a1, ccw); }
    ellipse(cx, cy, rx, ry, rot, a0, a1, ccw = false) {
      // มุมแบบ Chrome (canonicalizeAngle): arc(0, 2π, true) = วงเต็มทวนเข็ม ไม่ใช่ยาวศูนย์
      let sweep;
      if (!ccw && a1 - a0 >= TAU) sweep = TAU;
      else if (ccw && a0 - a1 >= TAU) sweep = -TAU;
      else if (!ccw && a0 > a1) sweep = TAU - ((a0 - a1) % TAU);
      else if (ccw && a0 < a1) sweep = -(TAU - ((a1 - a0) % TAU));
      else sweep = a1 - a0;
      const cr = Math.cos(rot), sr = Math.sin(rot);
      const P = (a) => { const ex = rx * Math.cos(a), ey = ry * Math.sin(a); return [cx + ex * cr - ey * sr, cy + ex * sr + ey * cr]; };
      const D = (a) => { const ex = -rx * Math.sin(a), ey = ry * Math.cos(a); return [ex * cr - ey * sr, ex * sr + ey * cr]; };
      const p0 = P(a0);
      if (this.cur) this.lineTo(...p0); else this.moveTo(...p0);
      const n = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
      const step = sweep / n, k = 4 / 3 * Math.tan(step / 4);
      let a = a0;
      for (let i = 0; i < n; i++) { const b = a + step, s = P(a), e = P(b), ds = D(a), de = D(b); this.bezierCurveTo(s[0] + k * ds[0], s[1] + k * ds[1], e[0] - k * de[0], e[1] - k * de[1], e[0], e[1]); a = b; }
    }
    arcTo() { W('arcTo'); }
  }
  const mapCmds = (cmds, m) => cmds.map((q) => { if (q[0] === 'Z') return q; const o = [q[0]]; for (let i = 1; i < q.length; i += 2) { const p = m.transformPoint(new DOMPoint(q[i], q[i + 1])); o.push(p.x, p.y); } return o; });
  const toD = (cmds) => cmds.map((q) => q[0] + (q.length > 1 ? q.slice(1).map(num).join(' ') : '')).join('');
  class RecPath extends Builder {
    constructor(arg) {
      super();
      this.real = arg instanceof RecPath ? new RealPath2D(arg.real) : arg != null ? new RealPath2D(arg) : new RealPath2D();
      if (arg instanceof RecPath) { this.cmds = arg.cmds.slice(); this.cur = arg.cur; this.start = arg.start; }
      else if (typeof arg === 'string') this.cmds = parseD(arg);
    }
    addPath(p, m) {
      const mm = m ? new DOMMatrix([m.a, m.b, m.c, m.d, m.e, m.f]) : null; this.real.addPath(p.real, m);
      const add = mm ? mapCmds(p.cmds, mm) : p.cmds; this.cmds.push(...add);
      // จุดปัจจุบันต่อจากเส้นที่เพิ่ม (ตามเบราว์เซอร์ — lineTo หลัง addPath ต่อเส้นเดิม ไม่ขึ้นรูปใหม่)
      let st = null, cur = null; for (const q of add) { if (q[0] === 'M') { st = [q[1], q[2]]; cur = st; } else if (q[0] === 'Z') cur = st; else cur = [q[q.length - 2], q[q.length - 1]]; }
      if (cur) { this.cur = cur; this.start = st; }
    }
  }
  for (const f of ['moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'closePath', 'rect', 'roundRect', 'arc', 'ellipse', 'arcTo']) {
    const orig = Builder.prototype[f];
    RecPath.prototype[f] = function (...a) { try { this.real[f](...a); } catch { /* */ } return orig.apply(this, a); };
  }
  window.Path2D = RecPath;
  for (const P of [CanvasRenderingContext2D.prototype, typeof OffscreenCanvasRenderingContext2D !== 'undefined' ? OffscreenCanvasRenderingContext2D.prototype : null].filter(Boolean)) {
    for (const f of ['fill', 'stroke', 'clip', 'isPointInPath', 'isPointInStroke']) {
      const o = P[f];
      P[f] = function (...a) { return o.apply(this, a.map((v) => (v instanceof RecPath ? v.real : v))); };
    }
  }
  const probe = document.createElement('canvas').getContext('2d');
  function color(c) {
    probe.fillStyle = '#000'; probe.fillStyle = c; const s = probe.fillStyle;
    const m = /^rgba?\(([^)]+)\)$/.exec(s);
    if (m) { const [r, g, b, a = 1] = m[1].split(',').map((v) => +v); return [`rgb(${r},${g},${b})`, a]; }
    return [s, 1];
  }
  class Grad { constructor(type, args) { this.type = type; this.args = args; this.stops = []; } addColorStop(o, c) { this.stops.push([o, c]); } }
  window.SVGRecorder = class {
    constructor(w, h) {
      this.canvas = { width: w, height: h };
      this.defs = []; this.root = []; this.stack = [this.root]; this.id = 0;
      this.st = { m: new DOMMatrix(), clips: [], fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10, globalAlpha: 1, globalCompositeOperation: 'source-over', dash: [], font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic', filter: 'none', shadowBlur: 0, shadowColor: 'rgba(0,0,0,0)', shadowOffsetX: 0, shadowOffsetY: 0, imageSmoothingEnabled: true };
      this.saved = []; this.path = new Builder();
      for (const k of Object.keys(this.st)) if (k !== 'm' && k !== 'clips') Object.defineProperty(this, k, { get: () => this.st[k], set: (v) => { this.st[k] = v; }, configurable: true });
    }
    get warnings() { return Object.fromEntries(warn); }
    __svgTag(name, open) { if (open) { const g = { tag: name, kids: [] }; this.stack[this.stack.length - 1].push(g); this.stack.push(g.kids); } else this.stack.pop(); }
    save() { this.saved.push({ ...this.st, m: DOMMatrix.fromMatrix(this.st.m), clips: this.st.clips.slice(), dash: this.st.dash.slice() }); }
    restore() { if (this.saved.length) this.st = this.saved.pop(); }
    getTransform() { return DOMMatrix.fromMatrix(this.st.m); }
    setTransform(a, b, c, d, e, f) { this.st.m = a && typeof a === 'object' ? new DOMMatrix([a.a, a.b, a.c, a.d, a.e, a.f]) : new DOMMatrix([a, b, c, d, e, f]); }
    resetTransform() { this.st.m = new DOMMatrix(); }
    transform(a, b, c, d, e, f) { this.st.m = this.st.m.multiply(new DOMMatrix([a, b, c, d, e, f])); }
    translate(x, y) { this.st.m = this.st.m.translate(x, y); }
    scale(x, y) { this.st.m = this.st.m.scale(x, y); }
    rotate(a) { this.st.m = this.st.m.rotate((a * 180) / Math.PI); }
    setLineDash(d) { this.st.dash = d.slice(); }
    getLineDash() { return this.st.dash.slice(); }
    createRadialGradient(...a) { return new Grad('radial', a); }
    createLinearGradient(...a) { return new Grad('linear', a); }
    createPattern() { W('pattern'); return null; }
    createConicGradient() { W('conic'); return new Grad('conic', []); }
    beginPath() { this.path = new Builder(); }
    _dev(x, y) { const p = this.st.m.transformPoint(new DOMPoint(x, y)); return [p.x, p.y]; }
    _inv(p) { const q = this.st.m.inverse().transformPoint(new DOMPoint(p[0], p[1])); return [q.x, q.y]; }
    _append(cmds) { for (const q of mapCmds(cmds, this.st.m)) { if (q[0] === 'M') this.path.moveTo(q[1], q[2]); else if (q[0] === 'L') this.path.lineTo(q[1], q[2]); else if (q[0] === 'C') this.path.bezierCurveTo(...q.slice(1)); else this.path.closePath(); } }
    _local(fn) { const t = new Builder(); if (this.path.cur) t.cur = this._inv(this.path.cur); fn(t); this._append(t.cmds); }
    moveTo(x, y) { this.path.moveTo(...this._dev(x, y)); }
    lineTo(x, y) { this.path.lineTo(...this._dev(x, y)); }
    bezierCurveTo(a, b, c, d, x, y) { this.path.bezierCurveTo(...this._dev(a, b), ...this._dev(c, d), ...this._dev(x, y)); }
    quadraticCurveTo(...a) { this._local((t) => t.quadraticCurveTo(...a)); }
    arc(...a) { this._local((t) => t.arc(...a)); }
    ellipse(...a) { this._local((t) => t.ellipse(...a)); }
    rect(...a) { this._local((t) => t.rect(...a)); }
    roundRect(...a) { this._local((t) => t.roundRect(...a)); }
    closePath() { this.path.closePath(); }
    arcTo() { W('arcTo'); }
    _shape(p) { if (p instanceof RecPath) return { d: toD(p.cmds), m: this.st.m }; return { d: toD(mapCmds(this.path.cmds, this.st.m.inverse())), m: this.st.m }; }
    _paint(style, alpha) {
      if (style instanceof Grad) {
        const id = 'g' + ++this.id, stops = style.stops.map(([o, c]) => { const [col, a] = color(c); return `<stop offset="${num(o)}" stop-color="${col}"${a < 1 ? ` stop-opacity="${num(a)}"` : ''}/>`; }).join('');
        const a = style.args.map(num);
        if (style.type === 'radial') this.defs.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" fx="${a[0]}" fy="${a[1]}" fr="${a[2]}" cx="${a[3]}" cy="${a[4]}" r="${a[5]}">${stops}</radialGradient>`);
        else if (style.type === 'linear') this.defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${a[0]}" y1="${a[1]}" x2="${a[2]}" y2="${a[3]}">${stops}</linearGradient>`);
        else { W('conic-fill'); return null; }
        return [`url(#${id})`, alpha];
      }
      if (style == null || typeof style !== 'string') { W('non-color-style'); return null; }
      const [c, a] = color(style);
      return [c, a * alpha];
    }
    _emit(body) {
      if (this.st.globalCompositeOperation !== 'source-over') { W('gco:' + this.st.globalCompositeOperation); return; }
      let out = body;
      for (let i = this.st.clips.length - 1; i >= 0; i--) out = { tag: null, clip: this.st.clips[i], kids: [out] };
      this.stack[this.stack.length - 1].push(out);
    }
    _mat(m) { return `matrix(${[m.a, m.b, m.c, m.d, m.e, m.f].map(num).join(' ')})`; }
    fill(a, b) {
      const p = a instanceof RecPath ? a : null, rule = typeof a === 'string' ? a : b;
      const s = this._shape(p), pt = this._paint(this.st.fillStyle, this.st.globalAlpha);
      if (!pt || !s.d) return;
      this._emit(`<path d="${s.d}" transform="${this._mat(s.m)}" fill="${pt[0]}"${pt[1] < 1 ? ` fill-opacity="${num(pt[1])}"` : ''}${rule === 'evenodd' ? ' fill-rule="evenodd"' : ''}/>`);
    }
    stroke(a) {
      const p = a instanceof RecPath ? a : null;
      const s = this._shape(p), pt = this._paint(this.st.strokeStyle, this.st.globalAlpha);
      if (!pt || !s.d) return;
      const dash = this.st.dash.length ? ` stroke-dasharray="${this.st.dash.map(num).join(' ')}"` : '';
      this._emit(`<path d="${s.d}" transform="${this._mat(s.m)}" fill="none" stroke="${pt[0]}"${pt[1] < 1 ? ` stroke-opacity="${num(pt[1])}"` : ''} stroke-width="${num(this.st.lineWidth)}" stroke-linecap="${this.st.lineCap}" stroke-linejoin="${this.st.lineJoin}"${dash}/>`);
    }
    clip(a, b) {
      const p = a instanceof RecPath ? a : null, rule = typeof a === 'string' ? a : b;
      const s = this._shape(p), id = 'c' + ++this.id;
      this.defs.push(`<clipPath id="${id}" clipPathUnits="userSpaceOnUse"><path d="${s.d}" transform="${this._mat(s.m)}"${rule === 'evenodd' ? ' clip-rule="evenodd"' : ''}/></clipPath>`);
      this.st.clips = [...this.st.clips, id];
    }
    fillRect(x, y, w, h) { const t = new RecPath(); t.rect(x, y, w, h); this.fill(t); }
    strokeRect(x, y, w, h) { const t = new RecPath(); t.rect(x, y, w, h); this.stroke(t); }
    clearRect() { W('clearRect'); }
    fillText() { W('fillText'); }
    strokeText() { W('strokeText'); }
    measureText(s) { probe.font = this.st.font; return probe.measureText(s); }
    drawImage() { W('drawImage(raster)'); }
    getImageData() { W('getImageData'); return new ImageData(1, 1); }
    putImageData() { W('putImageData'); }
    isPointInPath() { W('isPointInPath'); return false; }
    serialize(viewBox) {
      const ser = (n) => {
        if (typeof n === 'string') return n;
        const inner = n.kids.map(ser).join('');
        if (n.clip) return `<g clip-path="url(#${n.clip})">${inner}</g>`;
        if (!inner) return '';
        const id = n.tag ? String(n.tag).replace(/[^\w-]/g, '_') : '';
        return `<g${id ? ` id="${id}_${++this.id}" data-name="${id}"` : ''}>${inner}</g>`;
      };
      const body = this.root.map(ser).join('\n');
      return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">\n<defs>${this.defs.join('\n')}</defs>\n${body}\n</svg>\n`;
    }
  };
})();
