// src/render/moji-svg.js
// ─────────────────────────────────────────────────────────────
// อ่านไฟล์ลายเส้นใหม่จากนักวาด (โมจิ) — src/render/cat2/cat-orange-front.svg
// ใช้ร่วมกันสองที่:
//   • cat-moji.js — วาดตามไฟล์ตรง ๆ (ตัวเทียบ/เป้าหมายใน cat-lab)
//   • cat2.js     — "สไตล์โมจิ": ตัววาดเดิมยืมชั้นรายละเอียด (ลาย หูใน แก้ม พุง ตา อุ้งเท้า) จากไฟล์นี้
//
// ไฟล์จาก Illustrator ต่างจากไฟล์เดิม (Figma) ตรงที่:
//   • สีอยู่ในคลาส CSS (.cls-N) ไม่ได้อยู่ใน attribute · หน้ากากอยู่ในคลาส
//   • เส้นใช้คำสั่งสัมพัทธ์ตัวเล็ก + ตัวเลขติดกัน ("-1.6.2") · สีไล่มีจุดโฟกัส (fx, fy) และรับค่าต่อกันผ่าน xlink:href
//   • พิกัดเลื่อนจากไฟล์เดิม (−88, −40.449) — อ่านแล้วเลื่อนกลับ ให้ตรงกับไฟล์เดิม (กลางตัว x 300 · เท้า y 648)
//   • หัวไฟล์ที่ได้มามีไบต์เสียก่อน <svg — ตัดทิ้งตอนอ่าน (ไม่แก้ไฟล์ของนักวาด)
// ─────────────────────────────────────────────────────────────
import MOJI_SVG from './cat2/cat-orange-front.svg?raw';
import MOJI_BACK_SVG from './cat2/cat-orange-back.svg?raw';
import MOJI_Q3_SVG from './cat2/cat-orange-perspective.svg?raw';
import MOJI_EMO_SVG from './cat2/cat-orange-emotion.svg?raw';
import MOJI_EMO2_SVG from './cat2/cat-orange-emotion-2.svg?raw';

/** ไฟล์ใหม่ → พิกัดไฟล์เดิม (วัดจากจุดหมุนหู/ไหล่ซ้ายที่ตรงกันพอดี) */
export const MOJI_OX = 88, MOJI_OY = 40.449;
/** ไฟล์ด้านหลัง (cat-orange-back 460.986 × 621.551) เลื่อนจากไฟล์เดิม (−51.014, −40.449) — วัดจากจุดหมุนหู/ไหล่ */
const FILES = { front: { text: MOJI_SVG, ox: MOJI_OX, oy: MOJI_OY, root: 'cat-front' }, back: { text: MOJI_BACK_SVG, ox: 51.014, oy: 40.449, root: 'cat-back' },
  // มุมเฉียงขวา (cat-orange-perspective 22 พ.ย. — ไฟล์ส่งออกที่โมจิแก้ · น้องหัน yaw 0.75) — ไฟล์ใหญ่ วางห่างจากมุม (−445.44, −413.351)
  q3: { text: MOJI_Q3_SVG, ox: -445.44, oy: -413.351, root: 'cat-orange-perspective' },
  // ชุดหน้า (cat-orange-emotion V.2 · 24 พ.ย.): หัวอย่างเดียว ตา 7 แบบ × ปาก 6 แบบ วางซ้อนกันในกลุ่ม eyes / mouth
  //   หัวตรงกับไฟล์ด้านหน้าหลังเลื่อนเพิ่ม 14.685 (วัดจากจุดแรกของหัว fill_8 และจมูก — ตรงกันทั้งสองจุด)
  emo: { text: MOJI_EMO_SVG, ox: MOJI_OX + 14.685, oy: MOJI_OY, root: 'cat-front' },
  // ชุดหน้าเพิ่ม (cat-orange-emotion V.3 · 24 พ.ย.): หัวเดียวกัน ตา มึน/หัวใจ/เจ็บ/เจ้าเล่ห์ · ปาก งอน/แลบลิ้นซน/เจ็บ/เจ้าเล่ห์/ตกใจ
  emo2: { text: MOJI_EMO2_SVG, ox: MOJI_OX + 14.685, oy: MOJI_OY, root: 'cat-front' } };
// ระยะเลื่อนของไฟล์ที่กำลังอ่าน (buildModel ตั้งค่าก่อนอ่าน — อ่านทีละไฟล์ ไม่ซ้อนกัน)
let OX = MOJI_OX, OY = MOJI_OY;

// ══ อ่านเส้น (d) → คำสั่ง M / L / C / Z พิกัดจริง ══
export function parseD(d) {
  const tk = d.match(/[MmLlHhVvCcSsQqTtZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
  const out = [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, cx2 = null, cy2 = null, qx = null, qy = null;
  const num = () => +tk[i++];
  const cubic = (x1, y1, x2, y2, ex, ey) => {
    out.push(['C', x1, y1, x2, y2, ex, ey]);
    cx2 = x2; cy2 = y2; x = ex; y = ey;
  };
  while (i < tk.length) {
    if (/^[A-Za-z]$/.test(tk[i])) cmd = tk[i++];
    else if (!cmd || cmd === 'Z' || cmd === 'z') { i++; continue; }
    const rel = cmd >= 'a' && cmd <= 'z';
    const ox = rel ? x : 0, oy = rel ? y : 0;
    const C = cmd.toUpperCase();
    if (C !== 'C' && C !== 'S') cx2 = null;
    if (C !== 'Q' && C !== 'T') qx = null;
    if (C === 'Z') {
      out.push(['Z']);
      x = sx; y = sy;
    } else if (C === 'M') {
      x = ox + num(); y = oy + num();
      sx = x; sy = y;
      out.push(['M', x, y]);
      cmd = rel ? 'l' : 'L';   // ตัวเลขชุดถัดไปหลัง M = เส้นตรง
    } else if (C === 'L') {
      x = ox + num(); y = oy + num();
      out.push(['L', x, y]);
    } else if (C === 'H') {
      x = ox + num();
      out.push(['L', x, y]);
    } else if (C === 'V') {
      y = oy + num();
      out.push(['L', x, y]);
    } else if (C === 'C') {
      cubic(ox + num(), oy + num(), ox + num(), oy + num(), ox + num(), oy + num());
    } else if (C === 'S') {
      // จุดควบคุมแรก = สะท้อนจุดควบคุมที่สองของโค้งก่อนหน้า (ไม่มีโค้งก่อนหน้า = จุดปัจจุบัน)
      const x1 = cx2 == null ? x : 2 * x - cx2, y1 = cy2 == null ? y : 2 * y - cy2;
      cubic(x1, y1, ox + num(), oy + num(), ox + num(), oy + num());
    } else if (C === 'Q' || C === 'T') {
      let px, py;
      if (C === 'Q') { px = ox + num(); py = oy + num(); } else { px = qx == null ? x : 2 * x - qx; py = qy == null ? y : 2 * y - qy; }
      const ex = ox + num(), ey = oy + num();
      const x0 = x, y0 = y;
      cubic(x0 + (2 / 3) * (px - x0), y0 + (2 / 3) * (py - y0), ex + (2 / 3) * (px - ex), ey + (2 / 3) * (py - ey), ex, ey);
      cx2 = null;
      qx = px; qy = py;
    } else {
      i++;   // คำสั่งที่ไฟล์นี้ไม่ใช้ (โค้งวงรี A) — ข้าม
    }
  }
  return out;
}
/** วงกลม → โค้งสี่ท่อน (ดัดได้แบบเส้นอื่น) */
function circleCmds(cx, cy, r) {
  const k = r * 0.5523;
  return [
    ['M', cx + r, cy],
    ['C', cx + r, cy + k, cx + k, cy + r, cx, cy + r],
    ['C', cx - k, cy + r, cx - r, cy + k, cx - r, cy],
    ['C', cx - r, cy - k, cx - k, cy - r, cx, cy - r],
    ['C', cx + k, cy - r, cx + r, cy - k, cx + r, cy],
    ['Z'],
  ];
}
const shiftCmds = (cmds) => cmds.map((q) => (q[0] === 'Z' ? q : q.map((v, j) => (j === 0 ? v : j % 2 ? v + OX : v + OY))));
export function buildPath(cmds, f, into = new Path2D()) {
  for (const c of cmds) {
    if (c[0] === 'M') into.moveTo(...(f ? f(c[1], c[2]) : [c[1], c[2]]));
    else if (c[0] === 'L') into.lineTo(...(f ? f(c[1], c[2]) : [c[1], c[2]]));
    else if (c[0] === 'C') {
      if (f) into.bezierCurveTo(...f(c[1], c[2]), ...f(c[3], c[4]), ...f(c[5], c[6]));
      else into.bezierCurveTo(c[1], c[2], c[3], c[4], c[5], c[6]);
    } else into.closePath();
  }
  return into;
}

// ══ สไตล์จาก <style> ══
function parseCss(text) {
  const rules = [];
  for (const [, sel, body] of text.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const props = {};
    for (const decl of body.split(';')) {
      const m = decl.indexOf(':');
      if (m > 0) props[decl.slice(0, m).trim()] = decl.slice(m + 1).trim();
    }
    rules.push({ classes: sel.split(',').map((s) => s.trim().replace(/^\./, '')), props });
  }
  return rules;
}
const INHERIT = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'];
export function rgba(hex, a = 1) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return hex || '#000';
  let h = m[1];
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h, 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
function parseTransform(tr) {
  let m = new DOMMatrix();
  for (const [, fn, args] of (tr || '').matchAll(/(\w+)\(([^)]*)\)/g)) {
    const n = args.trim().split(/[\s,]+/).map(Number);
    if (fn === 'translate') m = m.translate(n[0], n[1] || 0);
    else if (fn === 'rotate') m = n.length >= 3 ? m.translate(n[1], n[2]).rotate(n[0]).translate(-n[1], -n[2]) : m.rotate(n[0]);
    else if (fn === 'scale') m = m.scale(n[0], n[1] ?? n[0]);
    else if (fn === 'skewX') m = m.skewX(n[0]);
    else if (fn === 'skewY') m = m.skewY(n[0]);
    else if (fn === 'matrix') m = m.multiply(new DOMMatrix(n));
  }
  return m;
}

// ══ อ่านไฟล์ → ชิ้นส่วน ══
// ชิ้น: { kind: 'shape', id, name, cmds, path, fill, stroke, width, cap, join, alpha }
//       { kind: 'group', id, name, ops, alpha } · { kind: 'clip', clip, clipCmds, ops }
// fill/stroke = สี (string) หรือสีไล่ { linear, cx, cy, fx, fy, r, x1, y1, x2, y2, m, stops, at }
function buildModel(text, rootId = 'cat-front') {
  const at = text.indexOf('<svg');
  if (at < 0) throw new Error('ไม่พบ <svg ในไฟล์ลายเส้นโมจิ');
  const doc = new DOMParser().parseFromString(text.slice(at), 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw new Error('อ่าน SVG ลายเส้นโมจิไม่ได้');
  const css = parseCss([...doc.querySelectorAll('style')].map((s) => s.textContent).join('\n'));
  const own = (el) => {
    const cls = new Set((el.getAttribute('class') || '').split(/\s+/).filter(Boolean));
    const p = {};
    for (const a of [...INHERIT, 'opacity', 'mask', 'clip-path']) if (el.hasAttribute(a)) p[a] = el.getAttribute(a);
    for (const r of css) if (r.classes.some((c) => cls.has(c))) Object.assign(p, r.props);
    return p;
  };
  const gradCache = {};
  const grad = (id) => {
    if (id in gradCache) return gradCache[id];
    const chain = [];
    for (let el = doc.getElementById(id), n = 0; el && n < 8; n++) {
      chain.push(el);
      const href = el.getAttribute('xlink:href') || el.getAttribute('href');
      el = href ? doc.getElementById(href.slice(1)) : null;
    }
    if (!chain.length) return (gradCache[id] = null);
    const attr = (a, d) => { for (const el of chain) if (el.hasAttribute(a)) return el.getAttribute(a); return d; };
    const stopEl = chain.find((el) => el.querySelector('stop'));
    const stops = stopEl ? [...stopEl.querySelectorAll('stop')].map((s) => [
      Math.max(0, Math.min(1, parseFloat(s.getAttribute('offset') || '0') * (/%/.test(s.getAttribute('offset') || '') ? 0.01 : 1))),
      rgba(s.getAttribute('stop-color') || '#000', +(s.getAttribute('stop-opacity') ?? 1)),
    ]) : [[0, '#000']];
    const cx = +attr('cx', 0), cy = +attr('cy', 0);
    const g = {
      linear: chain[0].tagName === 'linearGradient',
      cx, cy, fx: +attr('fx', cx), fy: +attr('fy', cy), r: +attr('r', 1),
      x1: +attr('x1', 0), y1: +attr('y1', 0), x2: +attr('x2', 1), y2: +attr('y2', 0),
      m: new DOMMatrix().translate(OX, OY).multiply(parseTransform(attr('gradientTransform', ''))),
      stops,
    };
    // จุดกลางของสีไล่ในพิกัดตัว — ใช้หาว่าชิ้นนั้นถูกดัดไปเท่าไหร่ตรงจุดนี้
    const p = g.m.transformPoint(new DOMPoint(g.linear ? (g.x1 + g.x2) / 2 : cx, g.linear ? (g.y1 + g.y2) / 2 : cy));
    g.at = [p.x, p.y];
    return (gradCache[id] = g);
  };
  const paint = (v) => {
    if (!v || v === 'none') return null;
    const m = /^url\(#([^)]+)\)$/.exec(v);
    return m ? grad(m[1]) || null : v;
  };
  // transform บนชิ้น (วงรีหมุนในไฟล์มุมเฉียง) — ใช้ก่อนเลื่อนพิกัด
  const withXf = (el, cmds) => {
    const tr = el.getAttribute('transform');
    if (!tr || !cmds) return cmds;
    const m = parseTransform(tr);
    return cmds.map((q) => { if (q[0] === 'Z') return q; const o = [q[0]]; for (let j = 1; j < q.length; j += 2) { const p = m.transformPoint(new DOMPoint(q[j], q[j + 1])); o.push(p.x, p.y); } return o; });
  };
  const shapeCmds = (el) => shiftCmds0(withXf(el, rawCmds(el)));
  const shiftCmds0 = (c) => (c ? shiftCmds(c) : null);
  const rawCmds = (el) => {
    if (el.tagName === 'path') return parseD(el.getAttribute('d') || '');
    if (el.tagName === 'rect') {
      const x = +el.getAttribute('x') || 0, y = +el.getAttribute('y') || 0, w = +el.getAttribute('width'), h = +el.getAttribute('height');
      return [['M', x, y], ['L', x + w, y], ['L', x + w, y + h], ['L', x, y + h], ['Z']];
    }
    if (el.tagName === 'polygon' || el.tagName === 'polyline') {
      const n = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
      const o = [];
      for (let j = 0; j + 1 < n.length; j += 2) o.push([j ? 'L' : 'M', n[j], n[j + 1]]);
      if (el.tagName === 'polygon') o.push(['Z']);
      return o;
    }
    return rawCmds0(el);
  };
  const rawCmds0 = (el) => {
    if (el.tagName === 'path') return parseD(el.getAttribute('d') || '');
    if (el.tagName === 'circle') return circleCmds(+el.getAttribute('cx'), +el.getAttribute('cy'), +el.getAttribute('r'));
    if (el.tagName === 'ellipse') {
      const rx = +el.getAttribute('rx'), ry = +el.getAttribute('ry'), ex = +el.getAttribute('cx'), ey = +el.getAttribute('cy');
      return circleCmds(0, 0, 1).map((q) => (q[0] === 'Z' ? q : q.map((v, j) => (j === 0 ? v : j % 2 ? ex + v * rx : ey + v * ry))));
    }
    return null;
  };
  const compile = (el, inh) => {
    const ops = [];
    for (const c of el.children) {
      const tag = c.tagName;
      if (tag === 'defs' || tag === 'mask' || tag === 'style' || tag === 'title' || tag === 'clipPath') continue;
      const p = own(c);
      const sty = { ...inh };
      for (const a of INHERIT) if (p[a] != null) sty[a] = p[a];
      const alpha = p.opacity != null ? +p.opacity : 1;
      let op;
      if (tag === 'g') {
        op = { kind: 'group', id: c.id || '', name: c.getAttribute('data-name') || c.id || '', ops: compile(c, sty), alpha };
      } else {
        const cmds = shapeCmds(c);
        if (!cmds) continue;
        op = {
          kind: 'shape', id: c.id || '', name: c.getAttribute('data-name') || c.id || '', cmds, alpha,
          path: buildPath(cmds, null),
          fill: paint(sty.fill ?? '#000'),
          stroke: paint(sty.stroke),
          width: parseFloat(sty['stroke-width'] ?? '1'),
          cap: sty['stroke-linecap'] || 'butt',
          join: sty['stroke-linejoin'] || 'miter',
        };
      }
      // หน้ากาก (mask) ของแบบ = รูปทรงที่ตัดอุ้งเท้าครีมให้อยู่ในขา/แขน — ใช้เป็นเส้นตัด (clip)
      // clip-path (ไฟล์มุมเฉียง — ส่งออกจาก Figma ซ้อนเส้นตัดหลายชั้น) ใช้แบบเดียวกับหน้ากาก
      const mk = /^url\(#([^)]+)\)$/.exec(p.mask || p['clip-path'] || '');
      const mEl = mk && doc.getElementById(mk[1]);
      if (mEl) {
        const clipCmds = [...mEl.querySelectorAll('path, circle, ellipse, rect, polygon')].map(shapeCmds).filter(Boolean);
        ops.push({ kind: 'clip', clipCmds, clip: clipCmds.reduce((pp, q) => buildPath(q, null, pp), new Path2D()), ops: [op] });
      } else ops.push(op);
    }
    return ops;
  };
  const root = doc.getElementById(rootId) || doc.documentElement;
  const parts = {};
  // ชิ้นที่ไฟล์ส่งมาไม่มีชื่อ: เดาจากชิ้นก่อนหน้า (ฉบับแก้แก้ม 21 พ.ย. — พุงหลุดชื่อ 'belly' เหลือแต่ path เปล่าต่อจากแขนขวา)
  const UNNAMED_AFTER = { 'arm-right': 'belly' };
  let prev = '';
  for (const c of root.children) {
    const id = c.id || (UNNAMED_AFTER[prev] && !parts[UNNAMED_AFTER[prev]] ? UNNAMED_AFTER[prev] : '');
    if (c.id) prev = c.id;
    if (!id || id === 'pivots') continue;
    parts[id] = compile({ children: [c] }, {});
    // ชิ้นเดี่ยวที่เพิ่งได้ชื่อ: ตั้งชื่อให้ตัว shape ด้วย (ผู้ใช้ค้นด้วยชื่อชิ้น เช่น hook 'belly' ของ cat2)
    if (!c.id && parts[id].length === 1 && !parts[id][0].id) Object.assign(parts[id][0], { id, name: id });
  }
  // จุดหมุน: วงกลมรัศมี 5 ที่เส้นเริ่มจากจุดล่างสุด → กลาง = (x, y − 5)
  const piv = {};
  for (const p of root.querySelectorAll('#pivots path, #pivots circle')) {
    const name = p.id.replace(/^pivot-/, '');
    if (p.tagName === 'circle') piv[name] = { x: +p.getAttribute('cx') + OX, y: +p.getAttribute('cy') + OY };
    else {
      const [x, y] = (p.getAttribute('d').match(/-?(?:\d+\.?\d*|\.\d+)/g) || []).map(Number);
      piv[name] = { x: x + OX, y: y - 5 + OY };
    }
  }
  // กลางตา = วงตาดำ (iris)
  const eye = {};
  for (const side of ['left', 'right']) {
    const c = root.querySelector(`#eye-${side} circle`);
    if (c) eye[side] = { x: +c.getAttribute('cx') + OX, y: +c.getAttribute('cy') + OY, r: +c.getAttribute('r') };
  }
  // ปาก (เส้น ω) — จุดกลาง/ขอบบน-ล่าง ไว้วางปากอ้า
  const mouthOp = findOp(parts.face || [], 'mouth');
  let mouth = null;
  if (mouthOp?.cmds) {   // ไฟล์มุมเฉียง: 'mouth' เป็นกลุ่ม (ไม่ใช่เส้นเดี่ยว) — ไม่ต้องใช้จุดปาก
    const pts = mouthOp.cmds.filter((q) => q[0] !== 'Z').flatMap((q) => { const o = []; for (let j = 1; j < q.length; j += 2) o.push([q[j], q[j + 1]]); return o; });
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    mouth = { x: (Math.min(...xs) + Math.max(...xs)) / 2, top: Math.min(...ys), bottom: Math.max(...ys), w: Math.max(...xs) - Math.min(...xs) };
  }
  return { parts, piv, eye, mouth };
}
export function findOp(ops, id) {
  for (const op of ops) {
    if (op.id === id || op.name === id) return op;
    if (op.ops) { const r = findOp(op.ops, id); if (r) return r; }
  }
  return null;
}

const MODELS = {};
/** ชิ้นส่วนทั้งหมดของไฟล์โมจิ (อ่านครั้งแรกครั้งเดียว) */
export function mojiModel(which = 'front') {
  if (!MODELS[which]) {
    const f = FILES[which];
    OX = f.ox; OY = f.oy;
    MODELS[which] = buildModel(f.text, f.root);
  }
  return MODELS[which];
}
/** เนื้อในของชิ้น (เช่น 'ear-left') — ไฟล์ห่อแต่ละชิ้นเป็นกลุ่มชื่อเดียวกัน */
export function mojiPart(id, which = 'front') {
  const ops = mojiModel(which).parts[id] || [];
  return ops.length === 1 && ops[0].kind === 'group' && ops[0].id === id ? ops[0].ops : ops;
}

// ══ แปลงเป็นชุดคำสั่งของ cat2.js ══
// cat2 วาดสีไล่โดยแปลงวงกลมหน่วย (0,0 r1) ด้วยเมทริกซ์ m · สีบนชิ้นผ่านตาราง ROLE (ตัวพิมพ์ใหญ่)
// lineK = ตัวคูณเส้นของ cat2 (LINE_K) — หารไว้ก่อน เส้นในไฟล์โมจิเป็นความหนาสุดท้ายอยู่แล้ว
export function toCat2Ops(ops, lineK = 1) {
  const conv = (o) => {
    if (o.kind === 'group') return { kind: 'group', id: o.id, ops: o.ops.map(conv) };
    if (o.kind === 'clip') return { kind: 'clip', clip: o.clip, clipCmds: o.clipCmds, ops: o.ops.map(conv) };
    const g = o.fill && typeof o.fill === 'object' && !o.fill.linear ? o.fill : null;
    return {
      kind: 'shape', id: o.id, path: o.path, cmds: o.cmds,
      fill: typeof o.fill === 'string' ? o.fill.toUpperCase() : null,
      grad: g ? {
        m: g.m.translate(g.cx, g.cy).scale(g.r),
        f: [(g.fx - g.cx) / (g.r || 1), (g.fy - g.cy) / (g.r || 1)],   // จุดโฟกัสในพิกัดวงกลมหน่วย
        stops: g.stops,
        at: g.at,   // จุดกลางสีไล่ (พิกัดตัว) — ตัวดัดจุดใช้หาว่าสีไล่ต้องเลื่อน/หมุนตามเท่าไหร่
      } : null,
      fillAlpha: o.alpha ?? 1,
      stroke: typeof o.stroke === 'string' ? o.stroke.toUpperCase() : null,
      // เส้นลงสีไล่วงกลม (ชุดหน้า V.3: ตามึนก้นหอย / ตาเจ็บ >< — กลางส้ม ขอบน้ำตาลเข้ม) · รูปแบบเดียวกับ grad
      sgrad: o.stroke && typeof o.stroke === 'object' && !o.stroke.linear ? {
        m: o.stroke.m.translate(o.stroke.cx, o.stroke.cy).scale(o.stroke.r),
        f: [(o.stroke.fx - o.stroke.cx) / (o.stroke.r || 1), (o.stroke.fy - o.stroke.cy) / (o.stroke.r || 1)],
        stops: o.stroke.stops,
      } : null,
      width: (o.width || 1) / lineK,
      cap: o.cap, join: o.join,
    };
  };
  return ops.map(conv);
}
