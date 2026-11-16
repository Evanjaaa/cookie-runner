// src/town/rim-light.js
// ─────────────────────────────────────────────────────────────
// แสงขอบรอบตัว (rim light) — ทดลองกับน้องส้มตัวหลักตัวเดียวที่ดาดฟ้าชั้น 3 (ผู้ใช้ 16 พ.ย. 2026)
//
// วิธี: วาดตัวน้องลงผืนแยก (O) แล้วหา "ขอบฝั่งที่หันหาแสง" จากรูปเงาของตัวเอง
//   ขอบสว่าง = เนื้อตัว − เนื้อตัวที่เลื่อนไปทางแหล่งแสงนิดเดียว → เหลือแถบบาง ๆ เฉพาะขอบด้านที่โดนแสง
//   ย้อมสีแสง (แดดกลางวันครีม · แดดเย็นส้มทอง · กลางคืนแสงจันทร์ฟ้าม่วง · ใกล้โคม = ส้มอุ่น) แล้วแปะแบบ screen
//   ทำที่ความละเอียดครึ่งหนึ่งแล้วขยายกลับ = ขอบนุ่มฟุ้งออกนิด ๆ (ไม่ใช้ ctx.filter — Safari ไม่รองรับ)
//   ฝั่งตรงข้ามแสง: เงาในตัวจาง ๆ (multiply ภายในเนื้อตัวเท่านั้น ไม่ลามออกนอกตัว = ไม่เป็นเส้นขอบ)
// ความแรงตามระดับแสงในตั้งค่า (light-fx.js) · ปิด = วาดตัวตามปกติ ไม่เสียแรงเครื่องเลย
// ─────────────────────────────────────────────────────────────
import { lightFxLevel, lightSources } from './light-fx.js';

// เส้นแสงรอบตัว เปิด/ปิดแยกได้ในตั้งค่า (ผู้ใช้ 16 พ.ย.) · จำในเครื่อง · ค่าเริ่มต้น = เปิด
// ปิดแล้วยังมีเงาในตัว + เงาทอดบนพื้น ตามระดับ "แสงและเงา"
const RIM_KEY = 'cookie-runner:town:rim';
let RIM = true;
try { RIM = localStorage.getItem(RIM_KEY) !== '0'; } catch { /* ค่าเริ่มต้น */ }
export const rimOn = () => RIM;
export function setRimOn(v) { RIM = !!v; try { localStorage.setItem(RIM_KEY, RIM ? '1' : '0'); } catch { /* รอบนี้ยังใช้ได้ */ } }
// เงาตัวบนพื้นแบบใหม่ (รูปตัวจริงทอดตามแสง) เปิด/ปิดในตั้งค่า (ผู้ใช้ 16 พ.ย.) · เปิด = ไม่วาดเงาวงรีใต้ตัวแบบเดิม (ห้ามซ้อนกัน)
const CAST_KEY = 'cookie-runner:town:castShadow';
let CAST = true;
try { CAST = localStorage.getItem(CAST_KEY) !== '0'; } catch { /* ค่าเริ่มต้น */ }
export const castOn = () => CAST;
export function setCastOn(v) { CAST = !!v; try { localStorage.setItem(CAST_KEY, CAST ? '1' : '0'); } catch { /* รอบนี้ยังใช้ได้ */ } }

const BUF = {};
function buf(name, w, h) {
  let c = BUF[name];
  if (!c) { c = BUF[name] = document.createElement('canvas'); c.getContext('2d'); }
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return c;
}

/**
 * วาดตัวละครพร้อมแสงขอบ
 * c: ctx หลัก (ตั้งกรอบโลกมาแล้ว) · box: {x0,y0,x1,y1} พิกัดโลกที่ครอบตัวทั้งหมด (เผื่อกว้าง — นอกกรอบจะโดนตัด)
 * draw(g): วาดตัวลง g ด้วยพิกัดโลกเดิม · at: {x,y} จุดกลางตัว (พิกัดโลก) ใช้หาทิศแสง · scene: {camX,camY,vw,H,lights}
 */
export function drawWithRim(c, box, draw, at, scene) {
  const LV = lightFxLevel();
  if (!LV || (import.meta.env.DEV && window.__rimOff)) { draw(c); return; }
  const m = c.getTransform();
  // กรอบกลับซ้าย-ขวาได้ (เรือหันซ้าย = scale −1) — ใช้ขนาดสเกลแบบไม่ติดลบ · พิกัดใน box/at.neck/at.cx = พิกัดของกรอบที่ส่งมา
  // at.x/at.y = พิกัดฉาก (หาทิศแสง) · at.lx/at.ly = จุดกลางตัวในพิกัดกรอบ (ไม่ส่ง = ใช้ at.x/at.y)
  const SX = Math.abs(m.a);
  const xa = m.a * box.x0 + m.e, xb = m.a * box.x1 + m.e;
  const dx0 = Math.floor(Math.min(xa, xb)), dy0 = Math.floor(m.d * box.y0 + m.f);
  const W = Math.ceil(Math.abs(xb - xa)) + 2, Hh = Math.ceil(m.d * (box.y1 - box.y0)) + 2;
  if (W < 4 || Hh < 4) { draw(c); return; }

  // ── ตัวน้องลงผืนแยก ──
  const O = buf('o', W, Hh), og = O.getContext('2d');
  og.setTransform(1, 0, 0, 1, 0, 0); og.globalCompositeOperation = 'source-over'; og.globalAlpha = 1;
  og.clearRect(0, 0, W, Hh);
  og.setTransform(m.a, m.b, m.c, m.d, m.e - dx0, m.f - dy0);
  draw(og);
  og.setTransform(1, 0, 0, 1, 0, 0);

  // รูปเงาความละเอียดครึ่งหนึ่ง (ขอบนุ่ม + เบาเครื่อง)
  const w2 = Math.ceil(W / 2), h2 = Math.ceil(Hh / 2);
  const Mk = buf('m', w2, h2), mg = Mk.getContext('2d');
  mg.clearRect(0, 0, w2, h2); mg.drawImage(O, 0, 0, w2, h2);
  const R = buf('r', w2, h2), rg = R.getContext('2d');
  const px = SX / 2;   // หน่วยโลก 1 = กี่พิกเซลบนผืนครึ่ง
  // แถบขอบ: จุดที่ยังอยู่ในตัวเมื่อขยับไปทางแสง ol หน่วย แต่หลุดออกนอกตัวเมื่อขยับ ol+thick
  // = แถบที่เริ่มถัดจากเส้นขอบเข้ามา (เส้นขอบน้ำตาลไม่โดนแสงทับจนซีด · หนวดเส้นบาง ๆ ไม่ติดแสง)
  // full = ทำที่ความละเอียดเต็ม (แถบบางคม ไม่ฟุ้งไปทับเส้นขอบ) · ไม่ full = ครึ่งความละเอียด (แถบกว้างนุ่ม)
  const OL = 2.2;
  const band = (thick, ux, uy, col, a, full) => {
    const src = full ? O : Mk, D = full ? buf('rf', W, Hh) : R, dg = D.getContext('2d'), q = full ? SX : px;
    dg.globalCompositeOperation = 'source-over'; dg.globalAlpha = 1;
    dg.clearRect(0, 0, D.width, D.height);
    dg.drawImage(src, -ux * OL * q, -uy * OL * q);
    dg.globalCompositeOperation = 'destination-out';
    dg.drawImage(src, -ux * (OL + thick) * q, -uy * (OL + thick) * q);
    dg.globalCompositeOperation = 'source-in';
    dg.fillStyle = `rgba(${col},${Math.min(1, a)})`; dg.fillRect(0, 0, D.width, D.height);
    return D;
  };

  const src = lightSources(at.x, at.y, scene);
  // ทดสอบทีละชั้น (dev): 1 เงาในตัว · 2 ขอบสว่าง · 4 เงาทอดบนพื้น · 8 แสงตกบนพื้น
  let RM = (import.meta.env.DEV && window.__rimMask != null) ? window.__rimMask : 15;
  if (!RIM) RM &= ~2;
  if (!CAST) RM &= ~12;   // ปิดเงาแบบใหม่ = ไม่มีทั้งเงาทอดและแสงบนพื้น (ใช้วงรีเดิมแทน — main.js)
  const K = [0, 0.65, 1, 1.4][LV] * (at.gain ?? 1);   // gain = ตัวเล็ก/ขนสีอ่อน ขอแรงขึ้น (ลูกแมวห้องเลี้ยง)

  // ── เงาทอดบนพื้น + แสงตกบนพื้น (ผู้ใช้ 16 พ.ย.: "เงาของที่ทอดตามทิศแสง" จากภาพตัวอย่าง) ──
  // เงา = รูปตัวจริงของน้อง พับลงพื้นแล้วเอียงไปฝั่งตรงข้ามแสง: แดดต่ำ (เย็น) ยาว · เที่ยงสั้น · ใกล้โคม = ทอดออกจากโคม
  // โคนเงาเข้มตรงเท้า ปลายจางลง · เบลอนิด ๆ ด้วยการแปะซ้ำเยื้อง · กระโดดสูง = เงาจางลง
  if (at.floor != null && src[0]) {
    const Fy = m.d * at.floor + m.f, fx = m.a * at.x + m.e;
    const Fd = m.d * (at.feet ?? at.floor) + m.f;   // เท้าตอนนี้ (กระโดด = สูงกว่าพื้น)
    const up = Math.max(0, Math.min(1, (at.floor - (at.feet ?? at.floor)) / 160));   // อัตราเดียวกับเงาวงรีเดิม (main.js)
    if (RM & 4) {
      const Sh = buf('sh', W, Hh), sg = Sh.getContext('2d');
      sg.globalCompositeOperation = 'source-over'; sg.globalAlpha = 1;
      sg.clearRect(0, 0, W, Hh); sg.drawImage(O, 0, 0);
      sg.globalCompositeOperation = 'source-in';
      const fy = Fy - dy0, gr = sg.createLinearGradient(0, fy, 0, 0);
      for (const L of src.slice(0, 1)) {
        gr.addColorStop(0, `rgba(${L.shade},1)`); gr.addColorStop(0.55, `rgba(${L.shade},.55)`); gr.addColorStop(1, `rgba(${L.shade},.12)`);
      }
      sg.fillStyle = gr; sg.fillRect(0, 0, W, Hh);
      c.save();
      for (const L of src) {
        // ความยาวเงา ∝ มุมแสง (แนวนอน / แนวตั้ง) · แสงอยู่ต่ำกว่าตัว = ถือว่าเอียงสุดเท่านั้น
        // พับลงพื้นด้านหน้า (เข้าหาคนดู) — พื้นดาดฟ้าเป็นแถบหน้าราวกันตก เงาทอดไปด้านหลังจะไปทับโซฟา/ราว
        const kx = Math.max(-1.5, Math.min(1.5, -L.ux / Math.max(0.32, -L.uy) * 0.42));
        const q = 0.3;   // แบนเหลือ 30%
        const a = Math.min(0.6, 0.42 * L.a * K) * (1 - up * 0.6);
        if (a < 0.01) continue;
        // พับรอบเท้า: x' = x + kx·(Fd − y) · y' = Fd + q·(Fd − y) แล้วเลื่อนลงไปวางบนพื้น (Fy − Fd)
        // = กระโดดแล้วเงายังติดพื้น รูปร่างเท่าเดิม แค่จางลงตามความสูง
        c.setTransform(1, 0, -kx, -q, kx * Fd, Fd * (1 + q) + (Fy - Fd));
        c.globalCompositeOperation = 'multiply';
        // เบลอ: แปะซ้ำ 9 จุดรอบวง (แนวตั้งกว้างกว่า เพราะโดนพับแบนลง) — ขอบเงานุ่ม ไม่เป็นเส้นซ้อน
        const bl = 1.8 * SX;
        for (let i = 0; i < 9; i++) {
          const an = i * Math.PI / 4, rr = i === 8 ? 0 : (i % 2 ? 1 : 0.6);
          c.globalAlpha = a * (i === 8 ? 0.3 : 0.14);
          c.drawImage(Sh, dx0 + Math.cos(an) * rr * bl, dy0 + Math.sin(an) * rr * bl * 2.5);
        }
      }
      c.restore();
    }
    // แสงตกบนพื้นฝั่งที่หันหาแสง (วงรีแบนอุ่น ๆ ใต้เท้า) — แหล่งหลักเท่านั้น
    if ((RM & 8) && src[0]) {
      const L = src[0], rx = W * 0.42, ry = rx * 0.16;
      const cx = fx + Math.sign(L.ux || 1) * rx * 0.45 * Math.min(1, Math.abs(L.ux) * 1.6 + 0.2);
      c.save();
      c.setTransform(1, 0, 0, ry / rx, 0, Fy + 2 * m.d - (Fy + 2 * m.d) * ry / rx);
      c.globalCompositeOperation = 'overlay';   // พื้นสีอ่อน: screen แทบไม่เห็น → overlay ย้อมอุ่นให้เห็น
      c.globalAlpha = Math.min(0.7, 0.45 * L.a * K) * (1 - up * 0.6);
      const g = c.createRadialGradient(cx, Fy + 2 * m.d, 0, cx, Fy + 2 * m.d, rx);
      g.addColorStop(0, `rgba(${L.col},1)`); g.addColorStop(0.5, `rgba(${L.col},.35)`); g.addColorStop(1, `rgba(${L.col},0)`);
      c.fillStyle = g; c.fillRect(cx - rx, Fy + 2 * m.d - rx, rx * 2, rx * 2);
      c.restore();
    }
  }

  // ── เงาในตัวฝั่งตรงข้ามแสงหลัก: ไล่สีเนียนข้ามตัว (ฝั่งแสงใส → ฝั่งไกลเข้มนิด) ทาเฉพาะในเนื้อตัว ──
  // (เดิมทำเป็นแถบตามขอบ = เป็นปื้นด่างบนหน้า — ผู้ใช้ไม่ได้เห็น แก้ก่อนส่ง)
  if (src[0] && (RM & 1)) {
    // คูณ (multiply) = แค่เข้มลง สีส้มไม่ซีดเป็นม่วงเทา · ไล่จากขาว (ไม่เปลี่ยน) ฝั่งแสง → สีเงาฝั่งไกล · ตัดให้อยู่ในเนื้อตัว
    const s = src[0];
    const cx = m.a * (at.lx ?? at.x) + m.e - dx0, cy = m.d * (at.ly ?? at.y) + m.f - dy0, r = (box.x1 - box.x0) * 0.2 * SX;
    const f = Math.min(0.6, 0.38 * s.a * K);   // ผู้ใช้ 16 พ.ย.: "ยังไม่ค่อยชัด" → เงาฝั่งหลังเข้มขึ้น
    const dark = s.shade.split(',').map((v) => Math.round(255 - (255 - v) * f)).join(',');
    const G = buf('g', W, Hh), gg = G.getContext('2d');
    gg.globalCompositeOperation = 'source-over';
    const g = gg.createLinearGradient(cx + s.ux * r, cy + s.uy * r, cx - s.ux * r, cy - s.uy * r);
    g.addColorStop(0, 'rgb(255,255,255)'); g.addColorStop(1, `rgb(${dark})`);
    gg.fillStyle = g; gg.fillRect(0, 0, W, Hh);
    gg.globalCompositeOperation = 'destination-in'; gg.drawImage(O, 0, 0);
    og.globalCompositeOperation = 'multiply'; og.drawImage(G, 0, 0);
    og.globalCompositeOperation = 'source-over';
  }
  // ── ขอบสว่างฝั่งที่โดนแสง (แต่ละแหล่ง) — แถบบาง + แถบกว้างจาง = ขอบคมตรงริมแล้วฟุ้งเข้าในตัว ──
  // รวมทุกแถบลงชั้นเดียว แล้วตัดด้วยรูปตัว (destination-in) = แสงไม่ล้นออกนอกเส้นตัวน้อง (ผู้ใช้ 16 พ.ย.: "เส้นแสงเกินออกมา")
  const Lr = buf('lr', W, Hh), lg = Lr.getContext('2d');
  lg.globalCompositeOperation = 'source-over'; lg.globalAlpha = 1;
  lg.clearRect(0, 0, W, Hh);
  if (RM & 2) {
    lg.globalCompositeOperation = 'lighter';
    // หัวใช้แถบบางกว่าตัว (ผู้ใช้ 16 พ.ย.): ตาอยู่ชิดขอบหัว แถบหนา = แสงทับตา · ตัด/แขน/ขา/หาง คงความหนาเดิม
    const ny = at.neck != null ? Math.round(m.d * at.neck + m.f - dy0) : -1;
    // เบลอเส้นแสงนิด ๆ (ผู้ใช้ 16 พ.ย.: "ชัดไปหน่อย ใส่ความเบลอนิดนึง") — แปะซ้ำเยื้องรอบตัว 2 วง (9 ครั้ง) แทน ctx.filter (Safari ไม่มี)
    // ยังตัดด้วยรูปตัวทีหลัง = เบลอแค่ด้านใน ไม่ฟุ้งออกนอกตัว · BLUR = รัศมีหน่วยโลก (dev: window.__rimBlur)
    const BLUR = (import.meta.env.DEV && window.__rimBlur != null) ? window.__rimBlur : 1.3;
    const TAPS = [[0, 0, 0.2]];
    for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4, rr = i % 2 ? 1 : 0.55; TAPS.push([Math.cos(an) * rr, Math.sin(an) * rr, 0.1]); }
    const soft = (D, rad) => {
      if (rad <= 0) { lg.drawImage(D, 0, 0); return; }
      const q = rad * SX;
      for (const [ox, oy, w] of TAPS) { lg.globalAlpha = w; lg.drawImage(D, ox * q, oy * q); }
      lg.globalAlpha = 1;
    };
    const part = (y0, y1, t1, t2, s) => {
      if (y1 <= y0) return;
      lg.save(); lg.beginPath(); lg.rect(0, y0, W, y1 - y0); lg.clip();
      soft(band(t1, s.ux, s.uy, s.col, 1.0 * s.a * K, true), BLUR * (t1 < 2 ? 0.75 : 1));
      lg.drawImage(band(t2, s.ux, s.uy, s.col, 0.26 * s.a * K, false), 0, 0, W, Hh);
      lg.restore();
    };
    for (const s of src) {
      part(0, Math.max(0, ny), 1.5, 3.2, s);   // หัว
      part(Math.max(0, ny), Hh, 3, 7, s);      // ตัว
    }
    lg.globalCompositeOperation = 'destination-in';
    lg.drawImage(O, 0, 0);
  }
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(O, dx0, dy0);
  // แปะแบบ overlay: ขน/สีสว่างสว่างขึ้นอิ่มขึ้น · สีเข้ม (ตาดำ เส้นขอบ) ยังเข้มอยู่ = ตาที่อยู่ชิดขอบหัวไม่ซีดเป็นฝ้า
  // แปะสองรอบ = แรงพอ ๆ กับ screen ตรงขน แต่ไม่ล้างตา (dev: window.__rimOp ลองโหมดอื่น)
  c.globalCompositeOperation = (import.meta.env.DEV && window.__rimOp) || 'overlay';
  if (RM & 2) { c.drawImage(Lr, dx0, dy0); if (c.globalCompositeOperation === 'overlay') c.drawImage(Lr, dx0, dy0); }
  // ย้อมสีแสงทับอีกชั้น (multiply) — ขนขาว/ครีม overlay แทบไม่เปลี่ยน แสงเลยมองไม่เห็น (ผู้ใช้ 16 พ.ย.: ลูกแมวแสงน้อยไป)
  if ((RM & 2) && at.tint) { c.globalCompositeOperation = 'multiply'; c.globalAlpha = at.tint; c.drawImage(Lr, dx0, dy0); c.globalAlpha = 1; }
  c.restore();
}
