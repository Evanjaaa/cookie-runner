// src/render/cat2.js
// ─────────────────────────────────────────────────────────────
// น้องแมวแบบใหม่ (ทดลอง) — ลายเส้นจากไฟล์ออกแบบ src/render/cat2/cat-front.svg
//
// ไม่ได้แปะเป็นรูป: อ่านรูปทรงทุกชิ้นจาก SVG มาเป็น Path2D แล้ววาดเองบน Canvas
// สีแต่ละชิ้นผูกกับ "บทบาท" (ตัว ลาย เงา ครีม เส้น ...) จึงสลับเป็นสีของแมวตัวอื่นได้
// ชิ้นส่วนแยกตาม id ในไฟล์ (หัว หู แขน ขา ตา ...) และหมุนรอบจุดหมุนในกลุ่ม pivots
// หางไม่มีในไฟล์ออกแบบ — วาดด้วยโค้ดในลายเส้นเดียวกัน (ดู tailGeom)
//
// ── ทำไมชิ้นส่วนขยับแล้วไม่ "ขาดออกจากกัน" ──
// ไม่ได้วาดเส้นขอบของแต่ละชิ้นแยกกัน (แบบนั้นพอแขนหมุน เส้นโคนแขนจะพาดกลางไหล่ให้เห็นรอยต่อ)
// แต่วาดเป็น "ชั้น" (layer): ลงเส้นขอบหนาของทุกชิ้นไว้ข้างใต้ก่อน → ลงสีเนื้อทุกชิ้นทับ → ค่อยลงลาย/ครีม/เงา
// เส้นขอบจึงเหลือเฉพาะรอบนอกของทั้งก้อน ชิ้นที่ซ้อนกันกลืนเป็นตัวเดียว ขยับยังไงก็ไม่เห็นรอยต่อ
// ตัว (หาง ขา ลำตัว แขน) เป็นชั้นหนึ่ง · หัว (หู + หัว) อีกชั้นทับข้างบน — มีเส้นคางคั่นตามแบบ
//
// สวิตช์ CAT2 เลือกว่าหน้าไหนใช้แบบใหม่ — ตอนนี้เปิดเฉพาะหน้าแรก หน้าอื่นยังเป็นแมวเดิม
// ─────────────────────────────────────────────────────────────
import FRONT_SVG from './cat2/cat-front.svg?raw';
import BACK_SVG from './cat2/cat-back.svg?raw';
import { IDLE_SHAPE } from './entities.js';

/** หน้าที่ใช้น้องแบบใหม่ — ปิด (false) = กลับไปใช้แมวเดิมทันที */
export const CAT2 = { home: true };

const TAU = Math.PI * 2;
/** เท้าของแบบอยู่ที่ y นี้ในไฟล์ออกแบบ (600×720) — ใช้วางน้องลงบนพื้น */
const FEET_Y = 648;
/** หน่วยในไฟล์ → หน่วยเกม ต่อ scale 1 (scale 2.6 = สูงราว 160 เท่าน้องเดิมบนหน้าแรก) */
const UNIT = 0.104;
/** เส้นขอบบางลงจากในไฟล์ ให้หนาเท่าเส้นของหน้าอื่นเมื่อย่อลงขนาดในเกม */
const LINE_K = 0.8;
/** ความหนาเส้นขอบรอบนอก (หน่วยในไฟล์) */
const LW = 5.5 * LINE_K;

// ── สีในไฟล์ → บทบาท ──
const ROLE = {
  '#FFB55E': 'cat', '#F48C3C': 'stripe', '#F99A46': 'shade', '#FFF8EC': 'cream',
  '#5A3420': 'line', '#FFB0A0': 'ear', '#FF9FA3': 'cheek', '#FF8C8C': 'nose',
};
/** จานสีของแบบ (น้องส้ม) — ใช้ตรง ๆ กับแมวส้ม */
const DESIGN = {
  cat: '#FFB55E', stripe: '#F48C3C', shade: '#F99A46', cream: '#FFF8EC',
  line: '#5A3420', ear: '#FFB0A0', cheek: '#FF9FA3', nose: '#FF8C8C', mouth: '#C2455A',
};

function mix(a, b, k) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a;
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
/** จานสีตามสกินของแมว — แมวส้มใช้สีของแบบ ตัวอื่นสลับตามช่องสีของสกิน */
const palCache = new WeakMap();
function paletteOf(s) {
  if (!s || s.id === 'orange') return DESIGN;
  let p = palCache.get(s);
  if (!p) {
    p = {
      cat: s.cat, stripe: s.dark, shade: mix(s.cat, s.dark, 0.35), cream: s.cream || '#FFF8EC',
      line: s.line || s.dark, ear: s.pink || DESIGN.ear, cheek: s.pink || DESIGN.cheek,
      nose: s.pink || DESIGN.nose, mouth: DESIGN.mouth,
    };
    palCache.set(s, p);
  }
  return p;
}

// ══ ดัดชิ้นส่วนทีละจุด (แบบกระดูกในเกมสามมิติ) ══
// หมุนชิ้นทั้งก้อน (ctx.rotate) แล้วขอบชิ้นจะเหลื่อมกับขอบตัวตรงรอยต่อ เห็นเป็นขั้นบันไดเล็ก ๆ
// จึงดัดทีละจุดแทน: จุดใกล้โคนแทบไม่ขยับ จุดไกลออกไปขยับเต็มที่ ไล่น้ำหนักนุ่ม ๆ
// ขอบชิ้นจึงต่อกับตัวเรียบเป็นเส้นเดียวตลอด เหมือนผิวที่ยืดตามกระดูก
// (ไฟล์จาก Figma ใช้แค่คำสั่งพิกัดจริง M C L H V Z — อ่านเองได้ไม่ต้องพึ่งไลบรารี)
function parseD(d) {
  const tk = d.match(/[MCLHVZ]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/gi) || [];
  const out = [];
  let i = 0, cmd = '', cx = 0, cy = 0;
  const num = () => +tk[i++];
  while (i < tk.length) {
    if (/[A-Za-z]/.test(tk[i])) cmd = tk[i++].toUpperCase();
    if (cmd === 'Z') { out.push(['Z']); continue; }
    if (cmd === 'M' || cmd === 'L') {
      cx = num(); cy = num();
      out.push([cmd, cx, cy]);
      if (cmd === 'M') cmd = 'L';
    } else if (cmd === 'H') { cx = num(); out.push(['L', cx, cy]); }
    else if (cmd === 'V') { cy = num(); out.push(['L', cx, cy]); }
    else if (cmd === 'C') {
      const a = [num(), num(), num(), num(), num(), num()];
      cx = a[4]; cy = a[5];
      out.push(['C', ...a]);
    } else i++;
  }
  return out;
}
function buildPath(cmds, f, into = new Path2D()) {
  for (const c of cmds) {
    if (c[0] === 'M') into.moveTo(...f(c[1], c[2]));
    else if (c[0] === 'L') into.lineTo(...f(c[1], c[2]));
    else if (c[0] === 'C') into.bezierCurveTo(...f(c[1], c[2]), ...f(c[3], c[4]), ...f(c[5], c[6]));
    else into.closePath();
  }
  return into;
}
function deformOps(ops, f) {
  return ops.map((op) => {
    if (op.kind === 'group') return { ...op, ops: deformOps(op.ops, f) };
    if (op.kind === 'clip') {
      const clip = new Path2D();
      for (const c of op.clipCmds) buildPath(c, f, clip);
      return { ...op, clip, ops: deformOps(op.ops, f) };
    }
    return op.cmds ? { ...op, path: buildPath(op.cmds, f) } : op;
  });
}
/** ชิ้นส่วนที่ดัดตามฟังก์ชันจุด f(x, y) → [x, y] */
function deformPart(part, f) {
  const sil = part.silCmds.map((c) => buildPath(c, f));
  const all = new Path2D();
  for (const p of sil) all.addPath(p);
  return { sil, all, det: deformOps(part.det, f) };
}
const rotPt = (c, a, x, y) => {
  const cs = Math.cos(a), sn = Math.sin(a), dx = x - c.x, dy = y - c.y;
  return [c.x + dx * cs - dy * sn, c.y + dx * sn + dy * cs];
};

// ══ อ่านไฟล์ออกแบบ → ชุดคำสั่งวาด ══
const MODELS = {};
/** 'front' = ด้านหน้า (cat-front.svg) · 'back' = ด้านหลัง (cat-back.svg) — ชื่อชิ้นและจุดหมุนชุดเดียวกัน */
function model(which = 'front') {
  if (MODELS[which]) return MODELS[which];
  const doc = new DOMParser().parseFromString(which === 'back' ? BACK_SVG : FRONT_SVG, 'image/svg+xml');
  const grads = {};
  for (const g of doc.querySelectorAll('radialGradient')) {
    let m = new DOMMatrix();
    const tr = g.getAttribute('gradientTransform') || '';
    for (const [, fn, args] of tr.matchAll(/(\w+)\(([^)]*)\)/g)) {
      const n = args.trim().split(/[\s,]+/).map(Number);
      if (fn === 'translate') m = m.translate(n[0], n[1] || 0);
      else if (fn === 'rotate') m = m.rotate(n[0]);
      else if (fn === 'scale') m = m.scale(n[0], n[1] ?? n[0]);
    }
    const stops = [...g.querySelectorAll('stop')].map((st) => [+(st.getAttribute('offset') || 0), st.getAttribute('stop-color')]);
    grads[g.id] = { m, stops };
  }
  const shapeOf = (el) => {
    if (el.tagName === 'ellipse') {
      const p = new Path2D();
      p.ellipse(+el.getAttribute('cx'), +el.getAttribute('cy'), +el.getAttribute('rx'), +el.getAttribute('ry'), 0, 0, TAU);
      return p;
    }
    return new Path2D(el.getAttribute('d'));
  };
  const groups = {};
  const compile = (el) => {
    const ops = [];
    for (const c of el.children) {
      const tag = c.tagName;
      if (tag === 'mask' || tag === 'defs') continue;
      if (tag === 'g') {
        const mk = c.getAttribute('mask');
        if (mk) {
          const mEl = doc.getElementById(mk.slice(5, -1));
          const clip = new Path2D();
          const clipCmds = [];
          for (const p of mEl.querySelectorAll('path')) {
            clip.addPath(shapeOf(p));
            clipCmds.push(parseD(p.getAttribute('d')));
          }
          ops.push({ kind: 'clip', clip, clipCmds, ops: compile(c) });
        } else {
          const g = { kind: 'group', id: c.id, ops: compile(c) };
          groups[c.id] = g.ops;
          ops.push(g);
        }
        continue;
      }
      if (tag !== 'path' && tag !== 'ellipse') continue;
      const fill = c.getAttribute('fill');
      const grad = fill && fill.startsWith('url(') ? grads[fill.slice(5, -1)] : null;
      ops.push({
        kind: 'shape', id: c.id, path: shapeOf(c),
        cmds: tag === 'path' ? parseD(c.getAttribute('d')) : null,
        fill: fill && fill !== 'none' && !grad ? fill.toUpperCase() : null, grad,
        fillAlpha: +(c.getAttribute('fill-opacity') || 1),
        stroke: c.getAttribute('stroke')?.toUpperCase() || null,
        width: +(c.getAttribute('stroke-width') || 1),
        cap: c.getAttribute('stroke-linecap') || 'butt',
        join: c.getAttribute('stroke-linejoin') || 'miter',
      });
    }
    return ops;
  };
  const root = doc.getElementById(`cat-${which}`);
  // แต่ละชิ้น: sil = รูปทรงเนื้อ (ใช้ทำเส้นรอบนอก+ลงสี) · det = รายละเอียดข้างใน (ลาย ครีม เงา ตา ...)
  // เส้นขอบเดิมของแต่ละชิ้น (id line*) ไม่ใช้ — เส้นรอบนอกมาจาก sil รวมทั้งชั้นแทน
  const parts = {};
  for (const c of root.children) {
    if (c.id === 'pivots') continue;
    const ops = compile(c.tagName === 'g' ? c : { children: [c] });
    const silOps = ops.filter((o) => o.kind === 'shape' && /^fill/.test(o.id));
    const sil = silOps.map((o) => o.path);
    const det = ops.filter((o) => !/^(fill|line)/.test(o.id || ''));
    const all = new Path2D();
    for (const p of sil) all.addPath(p);
    parts[c.id] = { sil, det, all, silCmds: silOps.map((o) => o.cmds) };
  }
  // จุดหมุน: วงกลมรัศมี 5 ที่เริ่มเส้นจากจุดล่างสุด → จุดกลาง = (x, y - 5)
  const piv = {};
  for (const p of root.querySelectorAll('#pivots path')) {
    const [x, y] = p.getAttribute('d').match(/-?[\d.]+/g).map(Number);
    piv[p.id.replace('pivot-', '')] = { x, y: y - 5 };
  }
  // จุดกลางตา (จากรูม่านตา)
  const eye = {};
  for (const side of ['left', 'right']) {
    const e = root.querySelector(`#eye-${side} ellipse`);
    if (e) eye[side] = { x: +e.getAttribute('cx'), y: +e.getAttribute('cy') };
  }
  MODELS[which] = { parts, groups, piv, eye };
  return MODELS[which];
}

// ══ วาดชุดคำสั่ง ══
function color(c, pal) {
  if (!c) return null;
  const r = ROLE[c];
  return r ? pal[r] : c;
}
/**
 * hooks[id](ctx, draw) — ครอบกลุ่ม/ชิ้นที่มี id นั้นด้วยการขยับของตัวเอง แล้วเรียก draw() วาดเนื้อใน
 * ไม่เรียก draw() = วาดอย่างอื่นแทน (เช่น ตาปิด)
 */
function drawOps(ctx, ops, pal, hooks, opt) {
  for (const op of ops) {
    if (op.kind === 'group') {
      if (opt.noStripes && /^stripes/.test(op.id)) continue;
      const h = hooks[op.id];
      if (h) h(ctx, () => drawOps(ctx, op.ops, pal, hooks, opt));
      else drawOps(ctx, op.ops, pal, hooks, opt);
    } else if (op.kind === 'clip') {
      ctx.save();
      ctx.clip(op.clip);
      drawOps(ctx, op.ops, pal, hooks, opt);
      ctx.restore();
    } else if (hooks[op.id] && !opt.inHook) {
      hooks[op.id](ctx, () => drawOps(ctx, [op], pal, hooks, { ...opt, inHook: true }));
    } else {
      if (opt.noStripes && op.stroke && ROLE[op.stroke] === 'stripe') continue;
      if (op.grad) {
        ctx.save();
        ctx.clip(op.path);
        const { m, stops } = op.grad;
        ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        for (const [o, c] of stops) g.addColorStop(o, c);
        ctx.fillStyle = g;
        ctx.fillRect(-1.5, -1.5, 3, 3);
        ctx.restore();
      } else if (op.fill) {
        ctx.globalAlpha = op.fillAlpha;
        ctx.fillStyle = color(op.fill, pal);
        ctx.fill(op.path);
        ctx.globalAlpha = 1;
      }
      if (op.stroke) {
        ctx.strokeStyle = color(op.stroke, pal);
        ctx.lineWidth = op.width * LINE_K;
        ctx.lineCap = op.cap;
        ctx.lineJoin = op.join;
        ctx.stroke(op.path);
      }
    }
  }
}

/**
 * วาดหนึ่งชั้น (หลายชิ้นที่ต้องกลืนเป็นก้อนเดียว)
 * items: [{ sil: Path2D[], all: Path2D, det: ops | (ctx) => void, xf: (ctx) => void }]
 */
function drawLayer(ctx, items, pal, hooks, opt) {
  // 1) เส้นรอบนอก: ทุกชิ้นลงเส้นหนาสองเท่าไว้ข้างใต้ (ครึ่งในจะถูกเนื้อทับ เหลือเส้นแค่รอบนอก)
  ctx.strokeStyle = pal.line;
  ctx.lineWidth = LW * 2;
  ctx.lineJoin = 'round';
  for (const it of items) {
    ctx.save();
    it.xf?.(ctx);
    for (const p of it.sil) ctx.stroke(p);
    ctx.restore();
  }
  // 2) เนื้อของทุกชิ้น — ทับเส้นที่อยู่ในรอยต่อจนหมด
  ctx.fillStyle = pal.cat;
  for (const it of items) {
    ctx.save();
    it.xf?.(ctx);
    for (const p of it.sil) ctx.fill(p);
    ctx.restore();
  }
  // 3) รายละเอียดของแต่ละชิ้น ตัดให้อยู่ในเนื้อของชิ้นตัวเอง (ลายไม่ล้นออกนอกเส้น)
  //    และเว้นบริเวณที่ชิ้นข้างหน้าบังอยู่ — ไม่งั้นลาย/เงาของหางจะโผล่ทับขา ดูเหมือนหางมาอยู่ข้างหน้า
  const m0 = ctx.getTransform();
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    ctx.save();
    for (let j = i + 1; j < items.length; j++) {
      if (!items[j].sil.length) continue;
      ctx.setTransform(m0);
      items[j].xf?.(ctx);
      const hole = new Path2D();
      hole.rect(-2000, -2000, 5000, 5000);
      hole.addPath(items[j].all);
      ctx.clip(hole, 'evenodd');
    }
    ctx.setTransform(m0);
    it.xf?.(ctx);
    // detClip: ขอบเขตลงรายละเอียดที่กว้างกว่าตัวชิ้น (เช่น เงาข้างตัวไหลลงต้นขา ไม่ขาดเป็นเส้นตรงตรงรอยต่อ)
    if (it.sil.length) ctx.clip(it.detClip || it.all);
    if (typeof it.det === 'function') it.det(ctx);
    else drawOps(ctx, it.det, pal, hooks, opt);
    ctx.restore();
  }
}

/** หมุนรอบจุด (หน่วยในไฟล์ออกแบบ) */
function rotAt(ctx, p, a) {
  if (!a) return;
  ctx.translate(p.x, p.y);
  ctx.rotate(a);
  ctx.translate(-p.x, -p.y);
}

// ══ หาง — วาดด้วยโค้ดในลายเส้นเดียวกับแบบ ══
/**
 * กระดูกสันหางเป็นข้อ ๆ ต่อกัน แต่ละข้อหักเพิ่มทีละนิดจนปลายม้วนขึ้น
 * การแกว่งเป็นคลื่นวิ่งจากโคนไปปลาย (ปลายแกว่งมากกว่าและตามหลังโคน) — หางจึงนุ่มไม่แข็งเป็นไม้
 * ผสมสองความถี่ ไม่ให้จังหวะซ้ำเป๊ะเหมือนเครื่องจักร · โคนซ่อนในตัว (ชั้นเดียวกับตัว จึงไม่มีรอยต่อ)
 */
/**
 * base = { x, y, a, curl } โคนหาง ทิศเริ่ม และทิศม้วน (+1 ม้วนตามเข็ม / -1 ทวน)
 * wagOff = มุมหางที่ท่าสั่ง (ค่าลบ = ชูหางขึ้น) · short = หางขดสั้นเข้าหาตัว
 */
function tailGeom(T, wag, base, wagOff = 0, short = 0) {
  const N = 16, seg = 18 * (1 - short * 0.35);
  let x = base.x, y = base.y, a = base.a - base.curl * wagOff * 0.35;
  const pts = [{ x, y, a }];
  for (let i = 1; i <= N; i++) {
    const f = i / N;
    const w1 = Math.sin(T * 2.3 - i * 0.42) * 0.055;
    const w2 = Math.sin(T * 0.9 - i * 0.25 + 1.7) * 0.03;
    a += base.curl * ((0.02 + 0.2 * f) * (1 + short * 1.4) + (w1 + w2) * f * wag);
    x += Math.cos(a) * seg;
    y += Math.sin(a) * seg;
    pts.push({ x, y, a });
  }
  const half = (i) => 19.5 - 5.5 * (i / N);
  const L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const p = pts[i], h = half(i), nx = -Math.sin(p.a), ny = Math.cos(p.a);
    L.push([p.x + nx * h, p.y + ny * h]);
    R.push([p.x - nx * h, p.y - ny * h]);
  }
  const tip = pts[N];
  const path = new Path2D();
  const smooth = (arr, first) => {
    if (first) path.moveTo(...arr[0]); else path.lineTo(...arr[0]);
    for (let i = 1; i < arr.length - 1; i++) {
      path.quadraticCurveTo(arr[i][0], arr[i][1], (arr[i][0] + arr[i + 1][0]) / 2, (arr[i][1] + arr[i + 1][1]) / 2);
    }
    path.lineTo(...arr[arr.length - 1]);
  };
  smooth(L, true);
  path.arc(tip.x, tip.y, half(N), tip.a + Math.PI / 2, tip.a - Math.PI / 2, true);
  smooth(R.slice().reverse(), false);
  path.closePath();
  return { path, pts, half, N };
}
function tailDetails(ctx, G, pal, noStripes) {
  const { pts, half, N } = G;
  // เงาด้านใต้หาง ให้ดูกลมเหมือนแขนขา
  ctx.strokeStyle = pal.shade;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const p = pts[i], h = half(i) - 3, nx = -Math.sin(p.a), ny = Math.cos(p.a);
    if (i) ctx.lineTo(p.x - nx * h, p.y - ny * h); else ctx.moveTo(p.x - nx * h, p.y - ny * h);
  }
  ctx.stroke();
  // ลายขวางเป็นปล้อง ๆ แบบลายแขนขาของแบบ
  if (!noStripes) {
    ctx.strokeStyle = pal.stripe;
    ctx.lineWidth = 5;
    for (const i of [7, 10, 13]) {
      const p = pts[i], h = half(i) + 2, nx = -Math.sin(p.a), ny = Math.cos(p.a);
      const bx = Math.cos(p.a) * 4, by = Math.sin(p.a) * 4;
      ctx.beginPath();
      ctx.moveTo(p.x + nx * h, p.y + ny * h);
      ctx.quadraticCurveTo(p.x + bx, p.y + by, p.x - nx * h * 0.55, p.y - ny * h * 0.55);
      ctx.stroke();
    }
  }
  // ปลายหางสีครีม เข้าชุดกับอุ้งเท้า
  const tip = pts[N];
  ctx.fillStyle = pal.cream;
  ctx.beginPath();
  ctx.arc(tip.x - Math.cos(tip.a) * 2, tip.y - Math.sin(tip.a) * 2, half(N) + 9, 0, TAU);
  ctx.fill();
}

// ══ ตา ══
/** ตาปิด: โค้งลง (กะพริบ/หลับ) · ^ (ดีใจ) · > < (เจ็บ) */
function closedEye(ctx, e, pal, kind, side) {
  ctx.strokeStyle = pal.line;
  ctx.lineWidth = 6 * LINE_K;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (kind === 'hurt') {
    const d = side === 'left' ? 1 : -1;   // ปลายแหลมชี้เข้าหาจมูก
    ctx.moveTo(e.x - 30 * d, e.y - 22);
    ctx.lineTo(e.x + 26 * d, e.y);
    ctx.lineTo(e.x - 30 * d, e.y + 22);
  } else if (kind === 'happy') {
    ctx.moveTo(e.x - 36, e.y + 12);
    ctx.quadraticCurveTo(e.x, e.y - 26, e.x + 36, e.y + 12);
  } else {
    ctx.moveTo(e.x - 40, e.y + 4);
    ctx.quadraticCurveTo(e.x, e.y + 20, e.x + 40, e.y + 4);
  }
  ctx.stroke();
}

// ══ จังหวะชีวิต (คิดจากเวลาอย่างเดียว ไม่เก็บสถานะ — เรียกซ้ำกี่รอบก็ได้ภาพเดิม) ══
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (u) => u * u * (3 - 2 * u);
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
/** จุดที่น้องมองไปเป็นช่วง ๆ (มองคนดูบ่อยสุด) */
const LOOKS = [[0, 0], [0, 0], [0, 0.05], [-1, 0.1], [1, 0.1], [-0.7, -0.5], [0.7, -0.45], [0.35, 0.45], [-0.35, 0.45]];
const LOOK_P = 2.6;
const lookOf = (n) => LOOKS[Math.floor(hash(n) * LOOKS.length)];
/** สายตา ณ เวลา T — เลื่อนไปจุดใหม่แบบนุ่ม ๆ ใช้เวลา 0.28 วินาที */
function gazeAt(T) {
  const n = Math.floor(T / LOOK_P);
  const a = lookOf(n - 1), b = lookOf(n);
  const u = ease(clamp01((T - n * LOOK_P) / 0.28));
  return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, since: T - n * LOOK_P, moved: a !== b };
}
/** กะพริบ: ทุก ~3.9 วินาที + ตอนเปลี่ยนจุดมอง (คนจริงกะพริบตอนกลอกตาไปที่ใหม่) + บางทีกะพริบสองที */
function blinkAt(T, g) {
  const one = (x) => (x >= 0 && x < 0.15 ? Math.sin((x / 0.15) * Math.PI) : 0);
  const n = Math.floor(T / 3.9);
  const x = T - n * 3.9;
  let b = Math.max(one(x), hash(n + 50) > 0.7 ? one(x - 0.24) : 0);
  if (g.moved) b = Math.max(b, one(g.since - 0.02));
  return b;
}

// ══ ท่าหมอบก้อนขนมปัง — ทรงตัวคนละแบบกับท่ายืน จึงวาดใหม่ทั้งตัว (หัว/หน้าใช้จากแบบเดิม) ══
// หัวโตวางพักบนตัวที่แผ่เป็นก้อนกว้าง · อุ้งเท้าหน้าสองก้อนโผล่ใต้คาง · อกสีครีมไหลต่อจากหน้า
// หางวนอ้อมข้างซ้ายมาไว้ข้างหน้า ปลายหางสีครีม (ตามภาพที่ออกแบบไว้)
const LOAF_HEAD = 182;   // หัวลดลงเท่านี้ (หน่วยในไฟล์) ตอนหมอบเต็มที่ — คางแตะอุ้งเท้า
const LOAF = (() => {
  // ฐานตัวใต้หัว: ส่วนใหญ่ซ่อนใต้หัว เห็นแค่ข้างขวาที่ป่องออกกับขอบล่างที่แตะพื้น (ซ้ายมีหางบัง)
  const base = new Path2D();
  base.moveTo(130, 648);
  base.lineTo(444, 648);
  base.bezierCurveTo(462, 640, 468, 610, 464, 584);
  base.bezierCurveTo(460, 558, 448, 540, 430, 526);
  base.lineTo(170, 526);
  // ข้างซ้ายกว้างไปอยู่หลังหาง — ในวงหางจึงเห็นตัว ไม่ทะลุเห็นฉาก
  base.bezierCurveTo(120, 532, 100, 572, 104, 610);
  base.bezierCurveTo(106, 634, 116, 648, 130, 648);
  base.closePath();
  // อกครีม: ไหลต่อจากหน้าลงมาระหว่างขาหน้าสองข้าง — ส่วนบนยื่นเข้าไปใต้หัว แล้วตัดตามขอบหัวตอนวาด
  // (ทับเฉพาะเส้นคางตรงกลาง ไม่ทับเนื้อหัว) จึงต่อกับเส้นคางพอดีทุกเฟรมแม้หัวจะขยับ
  const chest = new Path2D();
  chest.moveTo(262, 536);
  chest.bezierCurveTo(266, 594, 296, 596, 293, 648);
  chest.lineTo(307, 648);
  chest.bezierCurveTo(304, 596, 334, 594, 338, 536);
  chest.closePath();
  chest.closePath();
  // เส้นแบ่งขาหน้า: ขอบในของขาซ้าย/ขวา (ติดอกครีม) + ขอบนอกขาซ้าย (ติดหาง) — ขาขวากลืนกับข้างตัว
  // เส้นขาหน้าสองข้างอก: โค้งเดียวตั้งแต่ใต้หัวลงถึงพื้น (ตอนวาดตัดตามขอบหัว จึงต่อกับเส้นคางพอดีทุกเฟรม)
  // ไม่มีท่อนตรง — ตอนโยกตัว หัวเอียงไปมา ส่วนที่โผล่พ้นคางจึงยังเป็นโค้งสวยเสมอ
  const legs = new Path2D();
  legs.moveTo(262, 536);
  legs.bezierCurveTo(266, 594, 296, 596, 293, 648);
  legs.moveTo(338, 536);
  legs.bezierCurveTo(334, 594, 304, 596, 307, 648);
  return { base, chest, legs };
})();
function loafBaseDetails(c, pal, noStripes) {
  // เงาข้างขวาให้ก้อนดูกลม
  c.fillStyle = pal.shade;
  c.beginPath();
  c.ellipse(474, 604, 40, 76, 0, 0, TAU);
  c.fill();
  if (noStripes) return;
  c.strokeStyle = pal.stripe;
  c.lineWidth = 6;
  c.lineCap = 'round';
  // ลายบนขาหน้าขวาที่ต่อกับข้างตัว · ข้างตัวขวา · ขาหน้าซ้าย
  for (const [x0, y0, x1, y1] of [
    [394, 590, 374, 597], [410, 608, 388, 615], [424, 628, 402, 633],
    [458, 556, 442, 563], [463, 582, 447, 589],
    [234, 598, 250, 594], [222, 620, 240, 616],
  ]) {
    c.beginPath();
    c.moveTo(x0, y0);
    c.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 4, x1, y1);
    c.stroke();
  }
}
/** หางตอนหมอบ: หางใหญ่วนเป็นวงอ้อมข้างซ้ายลงมาข้างหน้า ปลายครีมก้อนโตข้างขาหน้าซ้าย */
function loafTailDetails(c, G, pal, noStripes) {
  const { pts, half, N } = G;
  if (!noStripes) {
    c.strokeStyle = pal.stripe;
    c.lineWidth = 6;
    c.lineCap = 'round';
    for (const i of [2, 4, 6, 8, 10, 12]) {
      const q = pts[i], h = half(i) + 2, nx = -Math.sin(q.a), ny = Math.cos(q.a);
      const bx = Math.cos(q.a) * 5, by = Math.sin(q.a) * 5;
      c.beginPath();
      c.moveTo(q.x + nx * h, q.y + ny * h);
      c.quadraticCurveTo(q.x + bx, q.y + by, q.x - nx * h * 0.35, q.y - ny * h * 0.35);
      c.stroke();
    }
  }
  const tip = pts[N];
  c.fillStyle = pal.cream;
  c.beginPath();
  c.arc(tip.x - Math.cos(tip.a) * 6, tip.y - Math.sin(tip.a) * 6, half(N) + 8, 0, TAU);
  c.fill();
}
/** เส้นหนาตามแนวกระดูก (หาง) จากจุดควบคุม — คืนรูปเดียวกับ tailGeom ใช้ tailDetails ร่วมกันได้ */
function spineBand(ctrl, N, half) {
  // Catmull-Rom ผ่านจุดควบคุม → จุดถี่ N+1 จุด
  const at = (u) => {
    const n = ctrl.length - 1, f = Math.min(n - 1e-6, u * n), i = Math.floor(f), tt = f - i;
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(n, i + 2)];
    const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * tt + (2 * a - 5 * b + 4 * c - d) * tt * tt + (-a + 3 * b - 3 * c + d) * tt * tt * tt);
    return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
  };
  const raw = [];
  for (let i = 0; i <= N; i++) raw.push(at(i / N));
  const pts = raw.map(([x, y], i) => {
    const a0 = raw[Math.max(0, i - 1)], a1 = raw[Math.min(N, i + 1)];
    return { x, y, a: Math.atan2(a1[1] - a0[1], a1[0] - a0[0]) };
  });
  const L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const q = pts[i], h = half(i), nx = -Math.sin(q.a), ny = Math.cos(q.a);
    L.push([q.x + nx * h, q.y + ny * h]);
    R.push([q.x - nx * h, q.y - ny * h]);
  }
  const tip = pts[N];
  const path = new Path2D();
  const smooth = (arr, first) => {
    if (first) path.moveTo(...arr[0]); else path.lineTo(...arr[0]);
    for (let i = 1; i < arr.length - 1; i++) {
      path.quadraticCurveTo(arr[i][0], arr[i][1], (arr[i][0] + arr[i + 1][0]) / 2, (arr[i][1] + arr[i + 1][1]) / 2);
    }
    path.lineTo(...arr[arr.length - 1]);
  };
  smooth(L, true);
  path.arc(tip.x, tip.y, half(N), tip.a + Math.PI / 2, tip.a - Math.PI / 2, true);
  smooth(R.slice().reverse(), false);
  path.closePath();
  return { path, pts, half, N };
}
/** หางตอนหมอบ: โคนซ่อนใต้หัว วนอ้อมข้างซ้ายลงมาข้างหน้า ปลายสะบัดเบา ๆ */
function loafTail(T, flick) {
  const f = Math.sin(T * 1.7) * 3 + flick * 8;
  return spineBand([[178, 520], [118, 534], [86, 584], [94, 628], [132, 644], [178 + f * 0.3, 632 - f]], 16, (i) => 19.5 - 5.5 * (i / 16));
}

// ══ ท่านั่ง — วาดใหม่ทั้งตัวตามภาพอ้างอิง (หัว/หน้าใช้จากแบบเดิม) ══
// ตัวทรงลูกแพร์ พุงครีมใหญ่ · ต้นขาหลังสองก้อนกลมอยู่หน้าตัว · เท้าหลังครีมมีเส้นนิ้ว
// แขนหน้าเป็นท่อนโค้งเดียวตั้งแต่ใต้หัวถึงอุ้งเท้า (โคนซ่อนใต้หัว ไหล่จึงไม่มีเส้นปิดโคนแขน)
// แขนวาดทับตัวด้วยเส้นของตัวเอง = แขนอยู่หน้าตัว · ขอบนอกแขนทับขอบตัวพอดี เลยเป็นเส้นรอบนอกเส้นเดียว
const SIT_HEAD = 48;   // หัวลดลงเท่านี้ตอนนั่ง (คอหดลงหาตัว)
/** เส้นด้านใน (ขอบแขน ขอบต้นขา อุ้งเท้า) หนาเท่าเส้นรอบนอกทุกเส้น */
const LW_IN = LW;
// วาดแบบเดียวกับภาพอ้างอิง: ตัว + แขนท่อนบน + แขนขวา + ต้นขา + หาง = เงาก้อนเดียว เส้นรอบนอกเส้นเดียว
// ข้างในมีแค่เส้นที่แบบมี: ขอบในแขนท่อนบนซ้าย · ขอบในแขนขวา · ขอบบนต้นขา · แขนท่อนล่างซ้ายที่พับมาหน้าพุง
const SIT = (() => {
  const torso = new Path2D();
  torso.moveTo(300, 428);
  torso.bezierCurveTo(236, 428, 194, 458, 184, 504);
  torso.bezierCurveTo(176, 552, 192, 606, 230, 638);
  torso.lineTo(370, 638);
  torso.bezierCurveTo(408, 606, 424, 552, 416, 504);
  torso.bezierCurveTo(406, 458, 364, 428, 300, 428);
  torso.closePath();
  const ell = (x, y, rx, ry) => {
    const q = new Path2D();
    q.ellipse(x, y, rx, ry, 0, 0, TAU);
    return q;
  };
  return {
    torso,
    haunchL: ell(204, 598, 55, 50), haunchR: ell(396, 598, 55, 50),
    footL: ell(216, 628, 37, 20), footR: ell(386, 628, 37, 20),
  };
})();
// แขน (จุดควบคุมพิกัดไฟล์ออกแบบ): ซ้ายจอ = ท่อนบน (ไหล่→ศอก) + ท่อนล่าง (ศอก→อุ้งเท้า) · ขวาจอ = ท่อนเดียว
const SIT_ARM = {
  leftRest: { up: [[248, 424], [220, 470], [212, 512]], lo: [[212, 512], [218, 542], [230, 564]] },
  leftScratch: { up: [[248, 424], [214, 470], [208, 516]], lo: [[208, 516], [240, 538], [270, 536]] },
  leftGroom: { up: [[250, 424], [216, 466], [210, 500]], lo: [[212, 506], [246, 484], [276, 452]] },
  right: [[354, 424], [394, 468], [404, 518], [394, 556], [374, 572]],
};
function mixPts(base, list) {
  return base.map((p, i) => {
    let x = p[0], y = p[1];
    for (const [pts, w] of list) {
      if (w <= 0) continue;
      x += (pts[i][0] - x) * w;
      y += (pts[i][1] - y) * w;
    }
    return [x, y];
  });
}
/** เส้นขอบด้านหนึ่งของแถบ (side = +1/-1) เป็นโค้งเรียบ */
function bandEdge(band, side, from = 0, to = band.N) {
  const q = new Path2D();
  const pt = (i) => {
    const r = band.pts[i], h = band.half(i) * side;
    return [r.x - Math.sin(r.a) * h, r.y + Math.cos(r.a) * h];
  };
  q.moveTo(...pt(from));
  for (let i = from + 1; i < to; i++) {
    const a = pt(i), b = pt(i + 1);
    q.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  q.lineTo(...pt(to));
  return q;
}
/** ด้านของแถบที่หันเข้ากลางตัว (x ใกล้ 300) */
function innerSide(band) {
  const r = band.pts[Math.floor(band.N / 2)];
  return Math.abs(r.x - Math.sin(r.a) * 10 - 300) < Math.abs(r.x + Math.sin(r.a) * 10 - 300) ? 1 : -1;
}
/**
 * อุ้งเท้า = ปลายแขนป่องออกนิด ๆ เป็นชิ้นเดียวกับแขน (ไม่ใช่วงรีแปะทับ)
 * คืน { blob, cream, det } — blob รวมเข้าเงาแขน · cream = ครีมเฉพาะส่วนปลาย · det วาดครีม + ร่องนิ้ว (อยู่ในเส้นรอบนอก)
 */
function pawOf(band, pal, rx, ry) {
  const tip = band.pts[band.N];
  const ca = Math.cos(tip.a), sa = Math.sin(tip.a);
  const cx = tip.x + ca * 2, cy = tip.y + sa * 2;
  const blob = new Path2D();
  blob.ellipse(cx, cy, rx, ry, tip.a, 0, TAU, true);   // ทวนเข็มเท่าแถบแขน — ส่วนซ้อนไม่หักล้างกัน
  // ครีม: ครึ่งปลายของอุ้งเท้า ตัดด้วยเส้นโค้งขวางแขน
  const cream = new Path2D();
  cream.ellipse(cx + ca * rx * 0.55, cy + sa * rx * 0.55, rx * 1.05, ry * 1.25, tip.a, 0, TAU);
  const det = (c, all) => {
    c.save();
    c.clip(all);
    c.fillStyle = pal.cream;
    c.fill(cream);
    // ร่องนิ้วสองร่องที่ปลาย (สั้น ๆ อยู่ในเนื้อ ไม่ทะลุเส้นรอบนอก)
    c.strokeStyle = pal.line;
    c.lineWidth = LW * 0.8;
    c.lineCap = 'round';
    for (const off of [-0.32, 0.32]) {
      const ex = cx + ca * rx - sa * ry * off, ey = cy + sa * rx + ca * ry * off;
      c.beginPath();
      c.moveTo(ex, ey);
      c.lineTo(ex - ca * 9, ey - sa * 9);
      c.stroke();
    }
    c.restore();
  };
  return { blob, det };
}
function sitStripes(c, pal, list) {
  c.strokeStyle = pal.stripe;
  c.lineWidth = 5;
  c.lineCap = 'round';
  for (const [x0, y0, x1, y1] of list) {
    c.beginPath();
    c.moveTo(x0, y0);
    c.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 4, x1, y1);
    c.stroke();
  }
}

// ══ ท่าถือหัวใจ/กอด (ยืน) — แขนวาดใหม่ตามภาพอ้างอิง ══
// แขนท่อนบนแนบข้างตัว (กลืนกับตัว มีแค่ขอบในเส้นเดียว) · ศอกอยู่ข้างเอว · แขนท่อนล่างพับขึ้นมาประคองหัวใจใต้คาง
// ท่าพักใช้แถบที่เลียนแขนในแบบ (กางออกข้าง) แล้วผสมจุดไปหาท่าถือ — ยกแขนขึ้นลื่น ๆ ไม่กระโดด
const HOLD_ARM = {
  // ตามแบบ: เห็นแค่แขนท่อนล่างเป็นท่ออ้วน ๆ จากศอกข้างตัวชี้ขึ้นไปหาคาง อุ้งเท้าครีมแตะใต้คาง (แขนอยู่หน้าหัว)
  // เริ่มยก = ห้อยลงหน้าตัว · ถือ = ชูขึ้นประคองหัวใจ
  // แขนโค้งออกนอกนิด ๆ (ไม่ใช่ท่อตรง) เหมือนแขนอวบ ๆ ที่งอขึ้นมา
  loRest: [[218, 440], [217, 470], [224, 498], [238, 518]],
  loHold: [[222, 476], [226, 448], [240, 424], [258, 408]],
};
const mirrorPts = (pts) => pts.map(([x, y]) => [600 - x, y]);
/** หัวใจเล็กลอยออกไปทางขวาตอนส่งหัวใจ (ตามแบบ) */
function drawFloatHearts(c, t, w, pal) {
  if (w < 0.05) return;
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.012 + i / 3) % 1;
    const x = 400 + ph * 110 + Math.sin(ph * 6 + i) * 8;
    const y = 470 - ph * 100 - i * 10;
    c.save();
    c.globalAlpha = Math.sin(ph * Math.PI) * w;
    drawHeart(c, x, y, 13 + i * 3 + ph * 4, pal);
    c.restore();
  }
}

// ══ แขนสองข้อ (ไหล่ + ศอก) แบบ IK ══
// ท่าบอกแค่ "อุ้งเท้าไปอยู่ตรงไหน" (เกาพุง ประกบอก แตะปาก) แล้วคำนวณมุมไหล่กับศอกเอง
// ข้อศอกพับลงล่างเสมอเหมือนแมวจริง · ผสมจากท่าพักไปท่าเป้าแบบนุ่ม ๆ ตามน้ำหนักของท่า
const ARM_REST = {
  left: { E0: { x: 160, y: 456 }, P0: { x: 113, y: 467 } },
  right: { E0: { x: 440, y: 456 }, P0: { x: 487, y: 467 } },
};
/** โคนแขน (ส่วนที่ฝังในตัว) — ตอนวาดแขนทับตัว เว้นตรงนี้ไว้ ไหล่จึงยังกลืนกับตัว ไม่มีเส้นปิดโคนแขน */
const ARM_ROOT = {
  left: [[192, 392], [232, 392], [232, 500], [188, 500]],
  right: [[408, 392], [368, 392], [368, 500], [412, 500]],
};
const wrapA = (a) => {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
};
function solveArm(S, E0, P0, T) {
  const L1 = Math.hypot(E0.x - S.x, E0.y - S.y);
  const L2 = Math.hypot(P0.x - E0.x, P0.y - E0.y);
  const dx = T.x - S.x, dy = T.y - S.y;
  const base = Math.atan2(dy, dx);
  const d = Math.min(L1 + L2 - 0.5, Math.max(Math.abs(L1 - L2) + 0.5, Math.hypot(dx, dy)));
  const A = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const ua = base + A, ub = base - A;
  const aU = Math.sin(ua) >= Math.sin(ub) ? ua : ub;   // ศอกอยู่ล่าง
  const ex = S.x + Math.cos(aU) * L1, ey = S.y + Math.sin(aU) * L1;
  const aF = Math.atan2(S.y + Math.sin(base) * d - ey, S.x + Math.cos(base) * d - ex);
  const t1 = wrapA(aU - Math.atan2(E0.y - S.y, E0.x - S.x));
  const t2 = wrapA(aF - Math.atan2(P0.y - E0.y, P0.x - E0.x) - t1);
  return { t1, t2 };
}
/** เป้าอุ้งเท้าเฉลี่ยตามน้ำหนักของแต่ละท่า → { x, y, w } */
function armTarget(list) {
  let w = 0, x = 0, y = 0;
  for (const [pt, wt] of list) {
    if (wt <= 0.001) continue;
    w += wt;
    x += pt[0] * wt;
    y += pt[1] * wt;
  }
  return w > 0 ? { x: x / w, y: y / w, w: Math.min(1, w) } : null;
}

/** หัวใจที่น้องประกบไว้ระหว่างอุ้งเท้า */
function heartPath(cx, cy, sz) {
  const p = new Path2D();
  p.moveTo(cx, cy + sz * 0.92);
  p.bezierCurveTo(cx - sz * 0.35, cy + sz * 0.62, cx - sz * 1.22, cy + sz * 0.22, cx - sz * 1.12, cy - sz * 0.36);
  p.bezierCurveTo(cx - sz * 1.02, cy - sz * 0.92, cx - sz * 0.3, cy - sz * 1.06, cx, cy - sz * 0.48);
  p.bezierCurveTo(cx + sz * 0.3, cy - sz * 1.06, cx + sz * 1.02, cy - sz * 0.92, cx + sz * 1.12, cy - sz * 0.36);
  p.bezierCurveTo(cx + sz * 1.22, cy + sz * 0.22, cx + sz * 0.35, cy + sz * 0.62, cx, cy + sz * 0.92);
  p.closePath();
  return p;
}
function drawHeart(c, cx, cy, sz, pal) {
  if (sz < 0.5) return;
  const p = heartPath(cx, cy, sz);
  c.save();
  c.fillStyle = '#FF6F98';
  c.fill(p);
  // เงา cel ระดับเดียว: ครึ่งล่างขวาเข้มขึ้นนิด (ตัดตามรูปหัวใจ)
  c.clip(p);
  c.fillStyle = '#E8507C';
  c.beginPath();
  c.ellipse(cx + sz * 0.55, cy + sz * 0.55, sz * 1.0, sz * 0.75, -0.5, 0, TAU);
  c.fill();
  c.fillStyle = '#FF6F98';
  c.beginPath();
  c.ellipse(cx + sz * 0.2, cy + sz * 0.05, sz * 0.95, sz * 0.72, -0.5, 0, TAU);
  c.fill();
  c.restore();
  c.strokeStyle = pal.line;
  c.lineWidth = LW * 0.8;
  c.lineJoin = 'round';
  c.stroke(p);
  // ไฮไลต์: วงรีโค้งตามพูซ้าย + จุดเล็ก
  c.fillStyle = 'rgba(255,255,255,.85)';
  c.beginPath();
  c.ellipse(cx - sz * 0.55, cy - sz * 0.42, sz * 0.24, sz * 0.13, -0.7, 0, TAU);
  c.fill();
  c.beginPath();
  c.arc(cx - sz * 0.25, cy - sz * 0.6, sz * 0.06, 0, TAU);
  c.fill();
}
/** ประกายสี่แฉกเล็ก ๆ รอบหัวใจ (กะพริบสลับกัน) */
function drawSparks(c, cx, cy, sz, t, w) {
  if (w < 0.05) return;
  const pts = [[-1.9, -0.9, 0], [1.8, -1.2, 1.7], [2.0, 0.6, 3.1]];
  c.save();
  c.fillStyle = '#FFF6C8';
  c.strokeStyle = 'rgba(255,190,120,.9)';
  c.lineWidth = 1.6;
  for (const [dx, dy, ph] of pts) {
    const k2 = Math.max(0, Math.sin(t * 0.09 + ph));
    if (k2 < 0.05) continue;
    const r = sz * 0.36 * k2;
    const x = cx + dx * sz, y = cy + dy * sz;
    c.globalAlpha = w * k2;
    c.beginPath();
    c.moveTo(x, y - r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.quadraticCurveTo(x, y, x, y + r);
    c.quadraticCurveTo(x, y, x - r, y);
    c.quadraticCurveTo(x, y, x, y - r);
    c.fill();
    c.stroke();
  }
  c.restore();
}

/**
 * วาดน้องแบบใหม่ ยืนเท้าแตะ feetY
 * @param idle { k, shape } ท่าตอบการแตะ (home-moves) หรือ { k, pose } ท่าว่าง (IDLE_SHAPE)
 *   รองรับทุกช่องของรูปร่าง: ลำตัว (sit crouch loaf roll sprawl puff) · แขน (wave knead clasp offer
 *   scratch reachL paw) · หัว (tilt ear gaze lick chirp mouth shut mood) · หาง (wag tailShort)
 *   · ทั้งตัว (lean sx sy dx turn) — lift ผู้เรียกยกเท้าให้เอง
 */
export function drawCat2(ctx, x, feetY, scale, s, t = 0, idle = null) {
  const pal = paletteOf(s);
  const opt = { noStripes: s && s.id !== 'orange' && s.stripes === false };
  const T = t / 60;   // homeTick เดินเฟรมละ 1 ที่ 60 fps → วินาที

  // ── ค่าจากท่า — คูณ k ให้ค่อย ๆ เข้า/ออกจากท่า ──
  const shape = idle?.shape || (idle?.pose ? IDLE_SHAPE[idle.pose] : null) || null;
  const k = idle ? clamp01(idle.k) : 0;
  const v = (key) => (shape?.[key] || 0) * k;
  const raw = (key) => shape?.[key] || 0;
  // หมอบ: บีบช่วงเปลี่ยนทรงให้สั้น (ลงนอน/ลุกเร็ว) ช่องโหว่ระหว่างทรงยืนกับก้อนขนมปังจึงเห็นแค่แว้บเดียว
  const sit = ease(clamp01((v('sit') - 0.3) / 0.4)), crouch = v('crouch'), loaf = ease(clamp01((v('loaf') - 0.3) / 0.4));
  const roll = v('roll'), sprawl = v('sprawl'), puff = v('puff');
  const wave = v('wave'), waveT = raw('waveT');
  const knead = v('knead'), kneadT = shape && 'kneadT' in shape ? raw('kneadT') : Math.sin(t * 0.3);
  const clasp = v('clasp'), offer = v('offer');
  const scratch = v('scratch'), scratchT = raw('scratchT');
  const reachL = v('reachL'), paw = v('paw');
  const lick = shape?.lick ? Math.max(0, Math.sin(t * 0.22)) * v('lick') : 0;
  const turn = raw('turn') * k;
  const tailShort = v('tailShort');
  // ปากขยับเอง (ไม่ได้เล่นท่าก็มีชีวิต): ทุก ~3.3 วินาที สุ่มว่าจะ "เมี้ยว" เบา ๆ หนึ่งที หรือ "งุบงิบ" สองที
  const mn = Math.floor((t / 60) / 3.3), mc = (t / 60) - mn * 3.3, mh = hash(mn + 21);
  const mew = mh > 0.5 && mc < 0.5 ? Math.sin((mc / 0.5) * Math.PI) * (0.4 + 0.3 * hash(mn + 5)) : 0;
  const smack = mh > 0.22 && mh <= 0.5 && mc < 0.7 ? Math.abs(Math.sin((mc / 0.7) * Math.PI * 2)) * 0.3 : 0;
  const chirp = Math.max(v('mouth'), shape?.chirp ? Math.max(0, Math.sin(t * 0.3)) * v('chirp') : 0, mew, smack);
  const yawn = Math.min(v('mouth'), v('shut'));        // ปากอ้า + หลับตาพร้อมกัน = หาว
  const mood = k > 0.35 ? shape?.mood || '' : '';
  const happy = mood === 'happy' || mood === 'starry';

  // ── จังหวะประจำตัว ──
  const breath = Math.sin(T * 2.1);                  // หายใจ ~3 วินาทีต่อรอบ
  const breathLag = Math.sin(T * 2.1 - 0.55);        // หัวขยับตามอกช้ากว่านิด (มีน้ำหนัก)
  // ถ่ายน้ำหนักซ้าย-ขวาช้า ๆ (ช่วงบนเอียง เท้าติดพื้น) — สองความถี่ผสมกันไม่ให้ดูเป็นลูกตุ้ม
  const sway = (Math.sin(T * 0.5) * 0.02 + Math.sin(T * 1.3 + 0.8) * 0.004) * (1 - k * 0.7);
  // สายตานำ หัวหันตามหลัง 0.12 วินาที (คนดูจะรู้สึกว่าน้อง "คิด" ก่อนหัน)
  const look = gazeAt(T), headLook = gazeAt(T - 0.12);
  const lookK = 1 - k;                                // ตอนเล่นท่า มองคนดูตรง ๆ
  const forced = shape?.gaze != null ? shape.gaze * k : null;
  const gx = forced ?? look.x * lookK, gy = forced != null ? 0 : look.y * lookK;
  const hx = forced != null ? forced * 0.6 : headLook.x * lookK, hy = forced != null ? 0 : headLook.y * lookK;
  const blink = blinkAt(T, look);
  const tiltOf = (tt) => Math.sin(tt * 0.6) * 0.03;
  // ประคองหัวใจ: เอียงหัวเบา ๆ ราว 4° (ท่าเดิมสั่งมาเกือบ 10° — มากไปสำหรับท่ามอบให้)
  const tiltK = clasp > 0.05 ? 1 - 0.55 * clamp01(clasp * 1.5) : 1;
  const tilt = tiltOf(T) * (1 - k * 0.6) + hx * 0.05 + v('tilt') * tiltK + lick * 0.07;
  const earLag = (tiltOf(T - 0.22) - tiltOf(T)) * 4;
  // หูกระดิก: ทุก ~2.4 วินาที (เว้นบ้างแบบสุ่ม) สะบัดไป-กลับเร็ว ๆ · บางทีสองทีติด · บางทีสองข้างพร้อมกัน
  const en = Math.floor(T / 2.4), ec = T - en * 2.4;
  const flickAt = (x) => (x >= 0 && x < 0.22 ? Math.sin((x / 0.22) * Math.PI * 2) : 0);
  const twitch = hash(en + 9) > 0.2
    ? (flickAt(ec) + (hash(en + 17) > 0.55 ? flickAt(ec - 0.26) * 0.8 : 0)) * (0.2 + 0.1 * hash(en + 4))
    : 0;
  const twitchSide = hash(en + 31) > 0.82 ? 'both' : hash(en + 3) > 0.5 ? 'left' : 'right';
  const hang = Math.sin(T * 0.5 - 0.7) * 0.025 * (1 - k * 0.5);
  const pop = k > 0 ? Math.sin(Math.min(1, k) * Math.PI) * 0.03 : 0;

  // ── ทรงตัว: นั่ง/ย่อ/หมอบ = ตัวช่วงบนลดลง ขาพับสั้นลงและกางออก ลำตัวยุบนิด ๆ ──
  const drop = 58 * sit + 24 * crouch + 74 * loaf;
  const legK = 1 - 0.5 * sit - 0.28 * crouch - 0.72 * loaf;
  const spread = 12 * sit + 6 * crouch + 12 * loaf;
  const SY = (1 + breath * 0.012) * (1 - 0.06 * sit - 0.14 * loaf);

  ctx.save();
  // dx = เลื่อนทั้งตัว (หน่วยตัวแมว) · lean = เอียงทั้งตัวรอบเท้า · puff = ขนพองทั้งตัว
  ctx.translate(x + v('dx') * scale, feetY);
  ctx.rotate(v('lean'));
  const sc = scale * UNIT * (1 + puff * 0.06);
  ctx.scale(sc * (1 + pop + v('sx')), sc * (1 - pop * 0.6 + v('sy')));
  ctx.translate(-300, -FEET_Y);
  if (roll) rotAt(ctx, { x: 300, y: 470 }, roll * 1.25);   // นอนตะแคง (ลอยฟ้า)
  // หมุนตัวรอบหนึ่ง: ตัวบีบแคบลง → พลิกเป็นด้านหลัง → บีบ → กลับด้านหน้า
  const cTurn = Math.cos(turn);
  if (turn) {
    ctx.translate(300, 0);
    ctx.scale(Math.max(0.06, Math.abs(cTurn)), 1);
    ctx.translate(-300, 0);
  }
  const back = cTurn < 0;
  const M = model(back ? 'back' : 'front');
  const P = M.parts;

  // ── ตัวแปลงพิกัดของแต่ละชิ้น (ดัดทีละจุด) ──
  const HIP = { x: 300, y: 600 };
  // ลำตัวช่วงบน: ลดระดับตามท่านั่งทั้งก้อน · ยืดตามลมหายใจ + เอียงถ่ายน้ำหนัก ไล่น้ำหนักจากสะโพก
  const upperPt = (x, y) => {
    const w = ease(clamp01((592 - y) / 55));
    const Y = 560 + (y - 560) * (1 + (SY - 1) * w) + drop;
    return rotPt(HIP, sway * w, x, Y);
  };
  const upper = (c) => {
    rotAt(c, HIP, sway);
    c.translate(0, drop);
    c.translate(300, 560);
    c.scale(1, SY);
    c.translate(-300, -560);
  };
  // ขา: พับสั้นลงรอบเท้า (เท้าติดพื้น) กางออกตอนนั่ง · เหยียดออกข้างตอนนอน
  const legPt = (side) => {
    const d = side === 'left' ? -1 : 1;
    const hip = M.piv[`hip-${side}`];
    const a = -d * 0.5 * sprawl;
    return (x, y) => {
      let X = x + d * spread, Y = FEET_Y - (FEET_Y - y) * legK;
      if (a) [X, Y] = rotPt(hip, a, X, Y);
      return [X, Y];
    };
  };
  // แขน: มุมไหล่ + ศอกจากเป้าอุ้งเท้าของท่า
  const armAngles = (side) => {
    const L = side === 'left';
    let t1 = hang + (L ? 1 : -1) * (breath * 0.018 + sprawl * 0.35), t2 = 0;
    if (back) return { t1, t2 };
    const list = L ? [
      [[262, 476 + kneadT * 10], knead * (1 - clasp)],          // นวด/กอดที่อก
      [[282, 478 + offer * 30], clasp],                          // ประคองหัวใจ
      [[281, 502], offer * (1 - clasp)],                         // ยื่นให้คนดู
      [[256 + scratchT * 7, 508 + scratchT * 8], scratch],       // เกาพุง
      [[100, 515], reachL],                                      // เอื้อมไปหาหาง
      [[283, 368 + lick * 8], paw],                              // ยกอุ้งเท้ามาเลีย
      [[232, 548], loaf],                                        // ซุกแขนตอนหมอบ
    ] : [
      [[338, 476 - kneadT * 10], knead * (1 - clasp)],
      [[318, 478 + offer * 30], clasp],
      [[319, 502], offer * (1 - clasp)],
      [[466 + waveT * 14, 366 + Math.abs(waveT) * 4], wave],     // โบกมือ
      [[368, 548], loaf],
    ];
    const tg = armTarget(list);
    if (tg) {
      const ik = solveArm(M.piv[`shoulder-${side}`], ARM_REST[side].E0, ARM_REST[side].P0, tg);
      t1 += (ik.t1 - t1) * tg.w;
      t2 += (ik.t2 - t2) * tg.w;
    }
    return { t1, t2 };
  };
  const armPt = (side, ang) => {
    const L = side === 'left';
    const S = M.piv[`shoulder-${side}`], E0 = ARM_REST[side].E0;
    return (x, y) => {
      // เริ่มงอเอียงตามขอบตัว (ใต้รักแร้ขอบกางกว่าบนไหล่) มุมโคนแขนจึงไม่ปลิ้น
      const x0 = 300 + (L ? -1 : 1) * (100 + (y - 446) * 0.2);
      const w1 = ease(clamp01((L ? x0 - x : x - x0) / 46));
      const w2 = ease(clamp01((L ? E0.x + 14 - x : x - (E0.x - 14)) / 28));
      let X = x, Y = y;
      if (w2 > 0 && ang.t2) [X, Y] = rotPt(E0, ang.t2 * w2, X, Y);
      if (w1 > 0) {
        [X, Y] = rotPt(S, ang.t1 * w1, X, Y);
        Y -= breath * 1.2 * w1;   // ไหล่ยกตอนหายใจเข้า
      }
      return upperPt(X, Y);
    };
  };
  // ทรงหมอบ: ตั้งแต่ loaf ครึ่งทางสลับเป็นตัวก้อนขนมปัง หัวลดลงต่อเนื่องจากท่ายืนจนพักบนตัว
  const loafMode = !back && loaf >= 0.5;
  const loafU = loafMode ? ease(clamp01((Math.min(loaf, 1) - 0.5) / 0.5)) : 0;
  // ขาลงหมอบ: หัวจมลงหาตัวเร็วกว่าตัว (ถึงครึ่งทางหัวลดไป 120) แล้วไหลต่อเข้าท่าหมอบไม่สะดุด
  const headStand = drop + loaf * 166 + crouch * 6;
  const sitMode = !back && !loafMode && sit >= 0.5;
  const sitU = sitMode ? ease(clamp01((Math.min(sit, 1) - 0.5) / 0.5)) : 0;
  const headDrop = loafMode ? 120 + (LOAF_HEAD - 120) * loafU
    : sitMode ? 29 + (SIT_HEAD - 29) * sitU + crouch * 6
    : headStand;
  const head = (c) => {
    rotAt(c, HIP, sway);
    c.translate(0, headDrop - breathLag * 2.2);
    rotAt(c, M.piv.neck, tilt);
    c.translate(hx * 3, hy * 2);
  };
  const earPt = (side) => {
    const d = side === 'left' ? 1 : -1;
    const a = earLag + d * v('ear') * 0.3 + (twitchSide === side || twitchSide === 'both' ? -d * twitch : 0);
    const piv = M.piv[`ear-${side}`];
    return (x, y) => {
      const w = ease(clamp01((212 - y) / 75));
      if (w <= 0) return [x, y];
      const [X, Y] = rotPt(piv, a * w, x, y);
      return [X - hx * 2.5 * w, Y - hy * 1.5 * w];
    };
  };
  const face = (c) => {
    head(c);
    c.translate(hx * 8, hy * 5);         // หน้าเลื่อนมากกว่าโครงหัว = หันหน้า
  };

  const hooks = {
    // เงาข้างลำตัวจากแบบถูกตัดด้วยขอบล่างของลำตัว (เส้นเฉียงตรงรอยต่อขา) — พอไม่มีเส้นในแล้วมันอ่านเป็นเส้นซ้อนข้างตัว
    // จึงไม่วาด · ความกลมของตัวได้จากเส้นรอบนอกกับลายแทน
    shade: () => {},
    // พุงครีม: ลงสีอย่างเดียว ไม่มีเส้นขอบตัดสี
    belly: (c) => {
      const op = P.belly?.det?.[0];
      if (!op) return;
      c.fillStyle = pal.cream;
      c.fill(op.path);
    },
    // ลวดลายบนหัวเลื่อนตามหน้า (ใกล้หน้ามากเลื่อนมาก) · เงาข้างหัวเลื่อนสวน
    cream: (c, draw) => { c.save(); c.translate(hx * 5, hy * 3); draw(); c.restore(); },
    stripes_6: (c, draw) => { c.save(); c.translate(hx * 5, hy * 2); draw(); c.restore(); },
    shade_2: (c, draw) => { c.save(); c.translate(-hx * 5, 0); draw(); c.restore(); },
    'whiskers-left': (c, draw) => { c.save(); rotAt(c, { x: 150, y: 265 }, Math.sin(T * 3.1) * 0.03); draw(); c.restore(); },
    'whiskers-right': (c, draw) => { c.save(); rotAt(c, { x: 450, y: 265 }, -Math.sin(T * 3.1 + 1) * 0.03); draw(); c.restore(); },
    mouth: (c, draw) => {
      if (loafMode) {
        // หมอบหลับ: ปากแมว ω ปิดสนิท (ตามแบบ) ไม่อ้าปาก — ขยับกว้าง-แคบเบา ๆ ตามลมหายใจ
        c.save();
        c.translate(300, 351);
        c.scale(1 + Math.sin(T * 1.4) * 0.05, 1);
        c.strokeStyle = pal.line;
        c.lineWidth = 4.2 * LINE_K;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.beginPath();
        c.moveTo(-17, -4);
        c.quadraticCurveTo(-14, 5, -7, 5);
        c.quadraticCurveTo(-1, 5, 0, -1);
        c.quadraticCurveTo(1, 5, 7, 5);
        c.quadraticCurveTo(14, 5, 17, -4);
        c.stroke();
        c.restore();
        return;
      }
      if (lick > 0.12) {
        // เลีย: ลิ้นชมพูแลบออกมาใต้ปาก
        draw();
        c.fillStyle = '#FF8FA6';
        c.strokeStyle = pal.line;
        c.lineWidth = 3.4 * LINE_K;
        c.beginPath();
        c.ellipse(300, 358 + lick * 3, 8, 4 + lick * 6, 0, 0, TAU);
        c.fill();
        c.stroke();
        return;
      }
      if (chirp < 0.15 && !happy) {
        // ปากปิด: มุมปากยิ้มกว้าง-แคบเบา ๆ ตามลมหายใจ
        c.save();
        c.translate(300, 352);
        c.scale(1 + Math.sin(T * 1.4) * 0.08 + chirp * 0.3, 1 + chirp * 0.6);
        c.translate(-300, -352);
        draw();
        c.restore();
        return;
      }
      const o = Math.max(chirp, happy ? 0.7 : 0);
      if (yawn > 0.3) {
        c.fillStyle = pal.mouth;
        c.strokeStyle = pal.line;
        c.lineWidth = 4.2 * LINE_K;
        c.beginPath();
        c.ellipse(300, 352 + o * 4 + yawn * 6, 13 + yawn * 7, 6 + o * 9 + yawn * 9, 0, 0, TAU);
        c.fill();
        c.stroke();
        return;
      }
      // ปากยิ้มอ้า: ขอบบนเป็นปากแมว ω (ต่อจากใต้จมูก) ขอบล่างโค้งมนลงตามความกว้างที่อ้า
      const w = 15 + o * 5, d = 8 + o * 18;
      const mp = new Path2D();
      mp.moveTo(300 - w, 346);
      mp.quadraticCurveTo(300 - w * 0.5, 354, 300, 347);
      mp.quadraticCurveTo(300 + w * 0.5, 354, 300 + w, 346);
      mp.bezierCurveTo(300 + w * 0.9, 346 + d, 300 + w * 0.4, 350 + d, 300, 350 + d);
      mp.bezierCurveTo(300 - w * 0.4, 350 + d, 300 - w * 0.9, 346 + d, 300 - w, 346);
      mp.closePath();
      c.fillStyle = pal.mouth;
      c.fill(mp);
      c.save();
      c.clip(mp);
      c.fillStyle = '#FF8FA6';
      c.beginPath();
      c.ellipse(300, 352 + d, w * 0.62, d * 0.5, 0, 0, TAU);
      c.fill();
      c.restore();
      c.strokeStyle = pal.line;
      c.lineWidth = 4.2 * LINE_K;
      c.lineJoin = 'round';
      c.lineCap = 'round';
      c.stroke(mp);
    },
  };
  for (const side of ['left', 'right']) {
    const e = M.eye[side];
    const ops = M.groups[`eye-${side}-open`];
    if (!e || !ops) continue;
    hooks[`eye-${side}-open`] = (c) => {
      if (loafMode) return closedEye(c, e, pal, 'blink');   // ลงมาหมอบแล้ว = หลับตาตลอด
      const eyesOpenHappy = happy && clasp > 0.3;   // ถือหัวใจ: ตาโตเป็นประกาย ไม่หยีตา
      if (happy && !eyesOpenHappy) return closedEye(c, e, pal, 'happy');
      if (eyesOpenHappy && v('shut') > 0.5) return closedEye(c, e, pal, 'happy');
      if (mood === 'hurt') return closedEye(c, e, pal, 'hurt', side);
      const lid = mood === 'tired' ? 0.5 : mood === 'smug' ? 0.4 : 0;
      const shut = Math.max(lid, blink, v('shut'));
      if (shut > 0.75) return closedEye(c, e, pal, 'blink');
      c.save();
      c.translate(e.x, e.y);
      c.scale(1, 1 - shut * 0.9);
      c.translate(-e.x, -e.y);
      // ตาขาว → ตาดำกลอกไปตามสายตา (ตัดอยู่ในตาขาว) → ขอบตาทับอีกรอบ
      const white = ops[0];
      drawOps(c, [white], pal, hooks, opt);
      c.save();
      c.clip(white.path);
      c.translate(gx * 9 - hx * 2, gy * 7);
      drawOps(c, ops.slice(1), pal, hooks, opt);
      c.restore();
      c.strokeStyle = pal.line;
      c.lineWidth = white.width * LINE_K;
      c.stroke(white.path);
      c.restore();
    };
  }

  const bent = (id, f, xf) => ({ ...deformPart(P[id], f), xf });

  if (loafMode) {
    // ตัวผุดเป็นก้อนรับหัวที่ลดลงมา (โตจากพื้นขึ้นไป) + หายใจเบา ๆ
    const grow = (c) => {
      c.translate(300, FEET_Y);
      // ตอนเพิ่งสลับ ตัวยังสูงรับคางพอดี (ไม่มีช่องว่าง) แล้วยุบลงเป็นก้อนตามหัว
      c.scale(0.92 + 0.08 * loafU, (1.18 - 0.18 * loafU) * (1 + breath * 0.015));
      c.translate(-300, -FEET_Y);
    };
    const flick = shape?.wag != null ? Math.sin(shape.wag * 1.5) * k : 0;
    const TL = loafTail(T, flick);
    // ฐานตัว → หาง → หัว → อกครีม + เส้นขาหน้า → หน้า
    drawLayer(ctx, [{ sil: [LOAF.base], all: LOAF.base, xf: grow, det: (c) => loafBaseDetails(c, pal, opt.noStripes) }], pal, hooks, opt);
    drawLayer(ctx, [{ sil: [TL.path], all: TL.path, xf: grow, det: (c) => loafTailDetails(c, TL, pal, opt.noStripes) }], pal, hooks, opt);
    drawLayer(ctx, [bent('ear-left', earPt('left'), head), bent('ear-right', earPt('right'), head), { ...P.head, xf: head }], pal, hooks, opt);
    ctx.save();
    // ตัดนอกเนื้อหัว: อกกับเส้นขาวาดได้ถึงขอบหัวพอดี ทับแถบเส้นคางแต่ไม่ล้ำเข้าไปในหัว
    const m0 = ctx.getTransform();
    head(ctx);
    const outHead = new Path2D();
    outHead.rect(-1000, -1000, 3000, 3000);
    outHead.addPath(P.head.all);
    ctx.clip(outHead, 'evenodd');
    ctx.setTransform(m0);
    grow(ctx);
    ctx.fillStyle = pal.cream;
    ctx.fill(LOAF.chest);
    ctx.restore();
    // รอยต่อครีมหน้ากับครีมอก: ลงครีมทับขอบหัวเฉพาะในเขตอก ไม่ให้เหลือเส้นขนแมวบาง ๆ จากขอบที่ตัด
    ctx.save();
    grow(ctx);
    ctx.clip(LOAF.chest);
    ctx.setTransform(m0);
    head(ctx);
    ctx.strokeStyle = pal.cream;
    ctx.lineWidth = 3;
    ctx.stroke(P.head.all);
    ctx.restore();
    // เส้นขาหน้า: ตัดนอกเนื้อหัวเหมือนอก ต่อกับเส้นคางพอดี
    ctx.save();
    head(ctx);
    ctx.clip(outHead, 'evenodd');
    ctx.setTransform(m0);
    grow(ctx);
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = LW;
    ctx.lineCap = 'round';
    ctx.stroke(LOAF.legs);
    ctx.restore();
    ctx.save();
    face(ctx);
    drawOps(ctx, P.face.det, pal, hooks, opt);
    ctx.restore();
    ctx.restore();
    return;
  }

  if (sitMode) {
    // ตัวนั่งผุดรับหัว (สูงนิดตอนเพิ่งสลับแล้วยุบเข้าที่) + หายใจเบา ๆ
    const grow = (c) => {
      c.translate(300, FEET_Y);
      c.scale(0.96 + 0.04 * sitU, (1.08 - 0.08 * sitU) * (1 + breath * 0.012));
      c.translate(-300, -FEET_Y);
    };
    // ── แขนซ้ายจอ: ห้อย → เกาพุง (ถูขึ้นลงตามจังหวะเกา) / ยกมาใต้คางให้เลีย ──
    const sc2 = clamp01(scratch * 1.2), gr = clamp01(paw * 1.2), rub = scratchT;
    const scr = {
      up: SIT_ARM.leftScratch.up,
      lo: SIT_ARM.leftScratch.lo.map(([x, y], i) => [x + (i ? rub * 4 : 0), y + (i ? rub * 8 : 0)]),
    };
    const grm = { up: SIT_ARM.leftGroom.up, lo: SIT_ARM.leftGroom.lo.map(([x, y], i) => [x, y + (i === 2 ? lick * 5 : 0)]) };
    const upL = mixPts(SIT_ARM.leftRest.up, [[scr.up, sc2], [grm.up, gr]]);
    const loL = mixPts(SIT_ARM.leftRest.lo, [[scr.lo, sc2], [grm.lo, gr]]);
    const bandUpL = spineBand(upL, 8, () => 26);
    const bandLoL = spineBand(loL, 8, (i) => 23 - 1.5 * (i / 8));
    const sway2 = hang * 6;
    const bandR = spineBand(SIT_ARM.right.map(([x, y], i) => [x + (i >= 2 ? sway2 : 0), y + breath * 1.2 * (i / 4)]), 12, (i) => 27 - 2 * (i / 12));
    const flick = shape?.wag != null ? Math.sin(shape.wag * 1.2) * k : 0;
    const tw = Math.sin(T * 1.6) * 3 + flick * 10;
    const TS = spineBand([[214, 612], [152, 614], [116, 562], [120, 502], [148 + tw * 0.4, 462], [186 + tw, 450 - tw * 0.3]], 16, (i) => 19.5 - 5.5 * (i / 16));
    const torsoDet = (c) => {
      c.fillStyle = pal.shade;
      c.beginPath();
      c.ellipse(422, 528, 26, 80, 0, 0, TAU);
      c.ellipse(180, 528, 24, 80, 0, 0, TAU);
      c.fill();
      c.fillStyle = pal.cream;
      c.beginPath();
      c.ellipse(298, 544, 72, 80, 0, 0, TAU);
      c.fill();
    };
    const haunchDet = (c) => {
      c.fillStyle = pal.shade;
      c.beginPath();
      c.ellipse(152, 602, 22, 52, 0, 0, TAU);
      c.ellipse(448, 602, 22, 52, 0, 0, TAU);
      c.fill();
      if (!opt.noStripes) {
        sitStripes(c, pal, [[160, 574, 182, 568], [154, 598, 178, 594], [158, 622, 180, 619],
          [440, 574, 418, 568], [446, 598, 422, 594], [442, 622, 420, 619]]);
      }
    };
    const armDet = (c) => {
      if (!opt.noStripes) sitStripes(c, pal, [[420, 486, 402, 492], [424, 510, 406, 515], [182, 474, 200, 479], [178, 496, 196, 500]]);
    };
    // ── เงาก้อนเดียว: หาง ตัว แขนท่อนบนซ้าย แขนขวา ต้นขา ──
    const bandItem = (b, det) => ({ sil: [b.path], all: b.path, xf: grow, det });
    drawLayer(ctx, [
      bandItem(TS, (c) => tailDetails(c, TS, pal, opt.noStripes)),
      { sil: [SIT.torso], all: SIT.torso, xf: grow, det: torsoDet },
      bandItem(bandUpL, armDet),
      bandItem(bandR, armDet),
      { sil: [SIT.haunchL], all: SIT.haunchL, xf: grow, det: haunchDet },
      { sil: [SIT.haunchR], all: SIT.haunchR, xf: grow, det: haunchDet },
    ], pal, hooks, opt);
    // ── เส้นด้านในตามแบบ (ตัดให้อยู่ในตัว ไม่ล้นเส้นรอบนอก) ──
    const body = new Path2D();
    for (const q of [SIT.torso, bandUpL.path, bandR.path, SIT.haunchL, SIT.haunchR]) body.addPath(q);
    ctx.save();
    grow(ctx);
    ctx.clip(body);
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = LW_IN;
    ctx.lineCap = 'round';
    // ขอบบนต้นขา: โค้งจากขอบตัวข้ามขึ้นมาแล้วลงหาเท้า
    ctx.beginPath();
    ctx.ellipse(204, 598, 55, 50, 0, Math.PI * 1.14, Math.PI * 2.18);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(396, 598, 55, 50, 0, Math.PI * 0.82, Math.PI * 1.86);
    ctx.stroke();
    ctx.restore();
    // ขอบในแขนท่อนบนซ้าย: หยุดตรงที่แขนท่อนล่างพับมาทับพอดี (ไม่ล้ำเข้าไปในแขนท่อนล่าง)
    {
      const m2 = ctx.getTransform();
      ctx.save();
      grow(ctx);
      ctx.clip(body);
      const notLo = new Path2D();
      notLo.rect(-600, -600, 1800, 2000);
      notLo.addPath(bandLoL.path);
      ctx.clip(notLo, 'evenodd');
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = LW_IN;
      ctx.lineCap = 'round';
      ctx.stroke(bandEdge(bandUpL, innerSide(bandUpL), 1, 8));
      ctx.setTransform(m2);
      ctx.restore();
    }
    // แขนขวาช่วงล่าง + อุ้งเท้า: อยู่หน้าพุง มีเส้นของตัวเอง — ตัดเฉพาะใต้ระดับศอก ข้างบนยังกลืนกับตัว
    {
      const pr = pawOf(bandR, pal, 30, 24);
      const allR = new Path2D();
      allR.addPath(bandR.path);
      allR.addPath(pr.blob);
      const m3 = ctx.getTransform();
      ctx.save();
      grow(ctx);
      const below = new Path2D();
      // เกือบทั้งแขน (เว้นโคนใต้หัว) — ขอบในแขนมาจากชั้นนี้เส้นเดียว ไม่ซ้อนกับเส้นอื่นจนหนาไม่เท่ากัน
      below.rect(300, bandR.pts[1].y, 300, 400);
      ctx.clip(below);
      ctx.setTransform(m3);
      drawLayer(ctx, [{ sil: [bandR.path, pr.blob], all: allR, xf: grow, det: (c) => {
        armDet(c);
        pr.det(c, allR);
      } }], pal, hooks, opt);
      ctx.restore();
    }
    // เท้าหลังครีม
    const feet = new Path2D();
    feet.addPath(SIT.footL);
    feet.addPath(SIT.footR);
    drawLayer(ctx, [{ sil: [SIT.footL, SIT.footR], all: feet, xf: grow, det: (c) => {
      c.fillStyle = pal.cream;
      c.fill(feet);
      c.strokeStyle = pal.line;
      c.lineWidth = LW * 0.8;
      c.lineCap = 'round';
      for (const cx of [216, 386]) for (const dx of [-11, 11]) {
        c.beginPath();
        c.moveTo(cx + dx, 637);
        c.lineTo(cx + dx, 647);
        c.stroke();
      }
    } }], pal, hooks, opt);
    // ── แขนท่อนล่างซ้าย: พับมาอยู่หน้าพุง มีเส้นของตัวเอง เว้นช่วงที่ซ้อนแขนท่อนบน (ศอกกลืนกัน) ──
    const outUp = new Path2D();
    outUp.rect(-600, -600, 1800, 2000);
    outUp.addPath(bandUpL.path);
    const m1 = ctx.getTransform();
    ctx.save();
    grow(ctx);
    ctx.clip(outUp, 'evenodd');
    ctx.setTransform(m1);
    const pl = pawOf(bandLoL, pal, 28, 22);
    const allL = new Path2D();
    allL.addPath(bandLoL.path);
    allL.addPath(pl.blob);
    drawLayer(ctx, [{ sil: [bandLoL.path, pl.blob], all: allL, xf: grow, det: (c) => {
      if (!opt.noStripes) {
        const q = bandLoL.pts[3], nx = -Math.sin(q.a), ny = Math.cos(q.a);
        sitStripes(c, pal, [[q.x + nx * 17, q.y + ny * 17, q.x + nx * 4, q.y + ny * 4]]);
      }
      pl.det(c, allL);
    } }], pal, hooks, opt);
    ctx.restore();
    ctx.save();
    grow(ctx);
    // รอยเกาบนพุง (ขีดสั้น ๆ ข้างอุ้งเท้าตอนกำลังเกา)
    if (sc2 > 0.5 && Math.abs(rub) > 0.25) {
      ctx.strokeStyle = pal.line;
      ctx.globalAlpha = Math.min(1, Math.abs(rub) * 1.4);
      ctx.lineWidth = 3 * LINE_K;
      ctx.lineCap = 'round';
      const t8 = bandLoL.pts[8];
      const sx0 = t8.x + 30, sy0 = t8.y - 4;
      for (const [dx, dy] of [[0, 0], [9, 6]]) {
        ctx.beginPath();
        ctx.moveTo(sx0 + dx, sy0 + dy);
        ctx.quadraticCurveTo(sx0 + dx + 6, sy0 + dy + 4, sx0 + dx + 5, sy0 + dy + 11);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    drawLayer(ctx, [bent('ear-left', earPt('left'), head), bent('ear-right', earPt('right'), head), { ...P.head, xf: head }], pal, hooks, opt);
    ctx.save();
    face(ctx);
    drawOps(ctx, P.face.det, pal, hooks, opt);
    ctx.restore();
    ctx.restore();
    return;
  }

  // ── ชิ้นส่วนเฟรมนี้ ──
  const wagOff = shape?.wag != null ? shape.wag * k : 0;
  const tailBase = back
    ? { x: 300, y: 548 + drop * 0.9, a: -1.2, curl: -1 }
    : { x: 252, y: 575 + drop * 0.9, a: Math.PI * 1.04 + sway * 2, curl: 1 };
  const TG = tailGeom(T, 1 - k * 0.5, tailBase, wagOff, tailShort);
  const tail = { sil: [TG.path], all: TG.path, det: (c) => tailDetails(c, TG, pal, opt.noStripes) };
  const fatX = 1 + 0.08 * (back ? 0 : ease(clamp01((knead - 0.4) / 0.6)));
  // ป้อมเฉพาะช่วงอก-พุง ไหล่ไม่ขยาย (มุมไหล่จะได้ไม่โผล่พ้นแขนท่อนบน)
  const torso = bent('torso', (x, y) => {
    const f = fatX - 1;            // 0 = ท่ายืนปกติ … 0.08 = ถือหัวใจเต็มที่
    const d = x - 300, ad = Math.abs(d);
    // ไหล่มน: มุมไหล่ดึงเข้าใน+ลงล่าง (โค้งรับหัว ไม่เป็นเหลี่ยม)
    const sh = ease(clamp01((446 - y) / 56)) * ease(clamp01((ad - 50) / 50)) * (f / 0.08);
    // ข้างตัวป่องช่วงอก-พุง
    // ป่องเฉพาะอก-พุง แล้วคืนทรงเดิมก่อนถึงสะโพก (ต่อกับขาพอดี เส้นข้างตัวไม่เหลื่อม)
    const belly = clamp01((y - 430) / 50) * (1 - clamp01((y - 492) / 40));
    const X = 300 + d * (1 + f * belly * 1.4) - Math.sign(d) * sh * 16;
    return upperPt(X, y - sh * 3);
  });
  const armL = bent('arm-left', armPt('left', armAngles('left')));
  const armR = bent('arm-right', armPt('right', armAngles('right')));
  // ถือหัวใจ/กอด: แขนเป็นแถบโค้ง (ท่อนบนกลืนกับตัว ท่อนล่างพับมาหน้าอก) แทนแขนจากไฟล์
  // ครึ่งแรกของการยกใช้แขนจากไฟล์ (พับเข้าหาอกอยู่แล้ว) แล้วสลับเป็นแขนพับตอนกำลังยกเร็ว ๆ
  const holdK = back ? 0 : clamp01(knead);
  const useHold = holdK > 0.4;
  let hold = null;
  if (useHold) {
    const u = ease(clamp01((holdK - 0.4) / 0.6));
    const lift = offer * 22;   // ยื่นหัวใจ: มือเลื่อนลงมาข้างหน้านิด
    const mk = (side) => {
      const m = side === 'right';
      const mp = (a) => (m ? mirrorPts(a) : a);
      const kn = (m ? -1 : 1) * kneadT * 4 * (1 - clasp);   // นวดสลับ (ท่ากอดไม่มีหัวใจ)
      const H = mp(HOLD_ARM.loHold).map(([x, y], i) => [x, y + (i ? lift * (i / 3) + kn : 0)]);
      const lo = mixPts(mp(HOLD_ARM.loRest), [[H, u]]).map(([x, y]) => upperPt(x, y));
      // ศอกอวบ เรียวลงหาข้อมือ แล้วอุ้งเท้าป่องนิด ๆ
      const bLo = spineBand(lo, 10, (i) => 29 - 7 * (i / 10));
      const pw = pawOf(bLo, pal, 25, 24);
      const cap = new Path2D();
      cap.arc(bLo.pts[0].x, bLo.pts[0].y, bLo.half(0), 0, TAU, true);
      const all = new Path2D();
      all.addPath(bLo.path);
      all.addPath(pw.blob);
      all.addPath(cap);
      return { bLo, pw, cap, all };
    };
    hold = { L: mk('left'), R: mk('right') };
  }
  const armItems = useHold
    ? [-1, 1].map((d) => {
      // ไหล่มน: แขนไม่ได้บังมุมไหล่แล้ว เติมก้อนกลมให้ไหล่โค้งแบบในแบบ (กลืนกับตัว)
      const sh = new Path2D();
      const [cx, cy] = upperPt(300 + d * 62, 428);
      sh.ellipse(cx, cy, 38, 36, 0, 0, TAU);
      return { sil: [sh], all: sh, det: () => {} };
    })
    : [armL, armR];
  const legL = bent('leg-left', legPt('left')), legR = bent('leg-right', legPt('right'));
  // เงาข้างตัวไหลต่อลงต้นขา (ตัดเฉพาะเหนือเท้า) — ไม่งั้นเงาถูกตัดเป็นเส้นเฉียงตรงรอยต่อตัว-ขา ดูเป็นเส้นซ้อน
  torso.detClip = new Path2D();
  torso.detClip.addPath(torso.all);
  for (const L of [legL, legR]) torso.detClip.addPath(L.all);
  const limbs = [legL, legR, torso, ...armItems];

  // ── ชั้นตัว (กลืนเป็นก้อนเดียว) — ด้านหน้าหางอยู่หลังสุด · ด้านหลังหางอยู่หน้าสุด ──
  drawLayer(ctx, back ? [...limbs, tail] : [tail, ...limbs], pal, hooks, opt);

  // แขนที่พับมาไว้หน้าตัว (เกาพุง ประกบอก) ต้องมีเส้นขอบของตัวเองทับตัว
  // วาดแขนซ้ำเป็นชั้นของมันเอง เว้นโคนแขนไว้ ไหล่จึงยังกลืนกับตัว
  const frontArm = (side, it) => {
    ctx.save();
    const hole = new Path2D();
    hole.rect(-600, -600, 1800, 2000);
    const poly = ARM_ROOT[side].map(([px, py]) => upperPt(px, py));
    hole.moveTo(...poly[0]);
    for (const q of poly.slice(1)) hole.lineTo(...q);
    hole.closePath();
    ctx.clip(hole, 'evenodd');
    drawLayer(ctx, [it], pal, hooks, opt);
    ctx.restore();
  };
  // แขนที่ยกขึ้นข้างหน้า (โบกมือ / ยกอุ้งเท้ามาเลีย) อยู่หน้าหัว วาดหลังหัว
  const raisedL = paw > 0.3, raisedR = wave > 0.3;

  if (!back) {
    ctx.save();
    upper(ctx);
    drawOps(ctx, P.belly.det, pal, hooks, opt);
    ctx.restore();
    if (useHold) {
      // (แขนกับหัวใจวาดหลังหน้า — อุ้งเท้าแตะใต้คาง ต้องอยู่หน้าหัว)
    } else {
      if (!raisedL) frontArm('left', armL);
      if (!raisedR) frontArm('right', armR);
    }
  }

  // ── ชั้นหัว: หู + หัว (เส้นคางคั่นกับตัวตามแบบ) แล้วหน้า/หนวด ──
  drawLayer(ctx, [bent('ear-left', earPt('left'), head), bent('ear-right', earPt('right'), head), { ...P.head, xf: head }], pal, hooks, opt);
  ctx.save();
  if (back) {
    head(ctx);
    drawOps(ctx, P.whiskers.det, pal, hooks, opt);
  } else {
    face(ctx);
    drawOps(ctx, P.face.det, pal, hooks, opt);
  }
  ctx.restore();

  if (!back && !useHold) {
    if (raisedL) frontArm('left', armL);
    if (raisedR) frontArm('right', armR);
  }
  if (useHold) {
    // หัวใจวาดก่อน อุ้งเท้าสองข้างทับขอบหัวใจ = ประคองไว้ ไม่ใช่ถือแปะหน้า
    const tl0 = hold.L.bLo.pts[10], tr0 = hold.R.bLo.pts[10];
    const hx0 = (tl0.x + tr0.x) / 2, hy0 = (tl0.y + tr0.y) / 2 + 50;
    const hs = 40 * ease(clamp01(clasp * 1.4)) * (1 + 0.25 * offer);
    // แขนสองข้างเป็นท่อเดียวต่อเส้น มีเส้นรอบครบ หนาเท่ากันตลอด · อุ้งเท้าครีมแตะใต้คาง
    for (const H of [hold.L, hold.R]) {
      drawLayer(ctx, [{ sil: [H.bLo.path, H.pw.blob, H.cap], all: H.all, det: (c) => {
        // เงา cel ใต้แขน (ด้านนอก) ให้แขนดูกลม — ระดับเดียว ไม่ไล่สี
        c.strokeStyle = pal.shade;
        c.lineWidth = 12;
        c.lineCap = 'round';
        c.stroke(bandEdge(H.bLo, -innerSide(H.bLo), 0, 8));
        if (!opt.noStripes) {
          const st = [];
          for (const i of [3, 5]) {
            const q = H.bLo.pts[i], nx = -Math.sin(q.a), ny = Math.cos(q.a);
            st.push([q.x + nx * 19, q.y + ny * 19, q.x + nx * 6, q.y + ny * 6]);
          }
          sitStripes(c, pal, st);
        }
        H.pw.det(c, H.all);
      } }], pal, hooks, opt);
    }
    if (clasp > 0.05) {
      // หัวใจอยู่หน้าอก ระหว่างแขน แล้วอุ้งเท้าสองข้างวาดทับขอบบนของหัวใจ = กำลังประคองไว้
      // หัวใจวาดทับแขน แต่เว้นตรงอุ้งเท้า (รวมเส้นขอบอุ้งเท้า) — อุ้งเท้าจึงอยู่หน้าหัวใจ
      ctx.save();
      const notPaw = new Path2D();
      notPaw.rect(-600, -600, 1800, 2000);
      for (const H of [hold.L, hold.R]) {
        const tp = H.bLo.pts[10];
        notPaw.ellipse(tp.x + Math.cos(tp.a) * 2, tp.y + Math.sin(tp.a) * 2, 25 + LW, 24 + LW, tp.a, 0, TAU);
      }
      ctx.clip(notPaw, 'evenodd');
      drawHeart(ctx, hx0, hy0, hs, pal);
      ctx.restore();
      drawSparks(ctx, hx0, hy0, 38, t, clamp01(clasp * 1.5));
    }
  }
  // หัวใจจิ๋วลอยออกไปทางขวาตอนส่งหัวใจ
  if (!back) {
    ctx.save();
    upper(ctx);
    drawFloatHearts(ctx, t, offer, pal);
    ctx.restore();
  }
  ctx.restore();
}
