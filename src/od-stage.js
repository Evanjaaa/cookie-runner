// ══ เวทีหน้ารายละเอียดชุด ══════════════════════════════════════
//
// วาดฉาก + น้องใส่ชุด (ท่าเปิดตัว / ท่าแอ็ค / ยืนเฉย) ลงผ้าใบขนาด W×H — ใช้สองที่:
//   1. หน้ารายละเอียดชุดในเกม (main.js odFrame) วาดสดทุกเฟรม
//   2. สคริปต์อัดวิดีโอท่าเปิดตัว (tools/render-intro.mjs) วาดทีละเฟรมแล้วต่อเป็น .mp4
// ทั้งสองที่ต้องใช้สูตรนี้ตัวเดียว — วิดีโอจบแล้วเกมวาดท่าแอ็คต่อ ภาพต้องต่อกันเป๊ะไม่กระโดด
//
// สูตรกล้อง/ขนาด/ฉาก/เงา ยกมาจาก cat-lab.html (render / camMatrix) ให้ตรงกับที่ผู้ใช้ตรวจในหน้าทดสอบ

import { drawCat2, drawCatAuto, cat2Backdrop, drawCat2Backdrop, cat2Intro, cat2Act } from './render/cat2.js';
import { E, mixShape } from './home-moves.js';

export const OD_SCALE = 2.6;   // ขนาดน้องเดียวกับหน้าทดสอบ (SCALE ใน cat-lab.html)
export const OD_SKIP = 20;     // เฟรมที่ใช้ไหลจากท่าเปิดตัวเข้าท่าแอ็ค (SKIP_F ในหน้าทดสอบ)

/**
 * พรีเซนเตอร์ในวิดีโอท่าเปิดตัว — key → { skin: id สำหรับ skinById, tag: ต่อท้ายชื่อไฟล์ }
 *   orange = น้องส้มตัวหลัก (เปิดจากคลังน้องด้วยแมวส้ม)
 *   pearl  = น้องไข่มุก ตัวเมีย — พรีเซนเตอร์ตอนเปิดดูจากตู้กาช่า ทุกคนเห็นตัวนี้ (ผู้ใช้ 18 ต.ค.: เข้ากับชุดชมพู/ฟ้า)
 */
export const OD_CASTS = {
  orange: { skin: 'orange', tag: '' },
  pearl: { skin: 'cat:pearl', tag: '-pearl' },
};
/** พรีเซนเตอร์ของหน้ารายละเอียดชุดที่เปิดจากตู้กาช่า (ป้ายโปรโมท / สกินในตู้นี้) */
export const OD_SHOP_CAST = 'pearl';
/** ชุดที่พรีเซนเตอร์ประจำร้านต่างจากค่ากลาง — หนุ่มไทยโจงกระเบน = น้องส้ม (ตัวชายในท่าเปิดตัวคู่ · ผู้ใช้ 24 ต.ค.) */
const OD_SHOP_CAST_BY = { jong: 'orange' };
export const odShopCast = (id) => OD_SHOP_CAST_BY[id] || OD_SHOP_CAST;
/**
 * วิดีโอท่าเปิดตัวที่อัดไว้ (ผู้ใช้ขอ 15 ต.ค. — วาดสดกระตุกบนเครื่องอ่อน)
 * casts = พรีเซนเตอร์ที่อัดไว้ (OD_CASTS) — แมวตัวอื่น เกมวาดสดแทน
 * sizes = ขนาดที่อัดไว้ (กว้าง×สูง) หลายสัดส่วน — เลือกอันที่สัดส่วนใกล้การ์ดจริง (ดู odVideoPick)
 * อัด/อัดใหม่: node tools/render-intro.mjs <ชุด> [ขนาด|all] [พรีเซนเตอร์]
 */
export const OD_VIDEOS = {
  sweet: { casts: ['orange', 'pearl'], sizes: [[1440, 1080], [1920, 1080], [2340, 1080]] },
  princess: { casts: ['orange', 'pearl'], sizes: [[1440, 1080], [1920, 1080], [2340, 1080]] },
};
export const odVideoSrc = (id, [w, h], cast = 'orange') => `video/intro-${id}${OD_CASTS[cast].tag}-${w}x${h}.mp4`;
/** พรีเซนเตอร์ที่มีวิดีโอของชุด id ตรงกับแมว skinId — null = ไม่มี (วาดสด) */
export const odVideoCast = (id, skinId) => (OD_VIDEOS[id]?.casts || []).find((k) => OD_CASTS[k].skin === skinId) || null;

/**
 * เลือกขนาดวิดีโอให้การ์ด W×H — เอาอันที่กว้างที่สุดแต่ไม่กว้างกว่าการ์ด
 * วิดีโอปู object-fit: cover จะโดนตัดแค่บน-ล่างนิดหน่อย ขอบซ้าย-ขวาครบ
 * (ท่าเปิดตัวขนมหวานน้องแอบมองจากขอบซ้าย — ถ้าตัดข้าง น้องจะโผล่จากนอกจอ)
 */
export function odVideoPick(id, W, H) {
  const v = OD_VIDEOS[id];
  if (!v) return null;
  const a = W / H;
  const fit = v.sizes.filter(([w, h]) => w / h <= a + 0.01);
  return fit.length ? fit[fit.length - 1] : v.sizes[0];
}

/** หน่วยเกม → พิกเซล ของเวที W×H: น้องทั้งตัวพอดีความสูง (ใหญ่กว่าหน้าทดสอบนิดตามแบบ) เท้าค่อนล่าง */
export function odGeo(W, H) {
  return { u: (H / 250) * 1.08, cx: W / 2, gy: H * 0.8 };
}

/** ตำแหน่งเวทีในการ์ด W×H เมื่อวิดีโอขนาด [vw, vh] ปูแบบ cover — วาดสดทับวิดีโอแล้วตรงกันพอดี */
export function odGeoCover(W, H, [vw, vh]) {
  const s = Math.max(W / vw, H / vh);
  const g = odGeo(vw, vh);
  return { u: g.u * s, cx: W / 2 + (g.cx - vw / 2) * s, gy: (H - vh * s) / 2 + g.gy * s };
}

/** พื้นหลังของชุดที่ไม่มีฉากประจำสกิน — ห้องชมพูลาเวนเดอร์ + พื้นไม้ แบบหน้าทดสอบ (wide = กล้องขยับ ปูกว้างเกินจอ) */
function odRoom(ctx, w, h, wide, high) {
  const [x0, y0, W, H] = wide ? [-w * 1.5, -h * 1.5, w * 4, h * 4] : [0, 0, w, h];
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, high ? '#FBD9F0' : '#F6D9F2');
  g.addColorStop(0.72, '#EBD6FA');
  g.addColorStop(0.72, '#E9C9A4');
  g.addColorStop(1, '#DDB58C');
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, W, H);
  // แสงนวลหลังตัวน้อง ให้ตัวเด่นจากฉาก
  const r = ctx.createRadialGradient(w / 2, h * 0.5, 8, w / 2, h * 0.5, h * 0.55);
  r.addColorStop(0, high ? 'rgba(255,250,255,.8)' : 'rgba(255,250,255,.55)');
  r.addColorStop(1, 'rgba(255,250,255,0)');
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, w, h * 0.72);
}

/**
 * วาดเวทีหนึ่งเฟรม
 * st = { id, skin (ใส่ชุดแล้ว), high, mode: 'intro'|'act'|'idle', f, tBase, from }
 *   f = เฟรมในท่า · tBase = เวลาชีวิตตอนเริ่มท่า (หายใจ กะพริบ ต่อเนื่องข้ามท่า) · from = ท่าเปิดตัว ณ จุดที่ออก
 * geo = ตำแหน่งเวที (odGeo / odGeoCover)
 */
export function drawOdScene(ctx, W, H, st, geo = odGeo(W, H)) {
  const { id, skin } = st;
  const it = cat2Intro(id), act = cat2Act(id);
  const { u, cx, gy } = geo;
  const edgeL = -cx / u;   // ขอบซ้ายของเวที (พิกัดเกม) — ท่าแอบมองจากขอบใช้
  const mixing = st.mode === 'act' && st.from && st.f < OD_SKIP;
  const skip = mixing ? E.io(st.f / OD_SKIP) : 0;

  // กล้องของท่าเปิดตัว — ใส่ให้ทั้งฉาก · ช่วงไหลเข้าท่าแอ็คกล้องค่อย ๆ คืนที่
  let cam = new DOMMatrix();
  const camF = st.mode === 'intro' ? Math.min(st.f, it.dur) : mixing ? st.from.f + st.f : null;
  if (it?.cam && camF != null) {
    const k = u * OD_SCALE * 0.104;
    const c = it.cam(camF, skip, { edge: 300 + edgeL / (OD_SCALE * 0.104) });
    const px = cx + (c.fx - 300) * k, py = gy + (c.fy - 648) * k;
    cam = new DOMMatrix().translate(px, py).rotate((c.rot * 180) / Math.PI).scale(c.z)
      .translate(-px, -py).translate(c.dx * k, c.dy * k);
  }
  const base = ctx.getTransform();
  ctx.setTransform(base.multiply(cam));
  const hasBd = !!cat2Backdrop(id);
  if (!hasBd) odRoom(ctx, W, H, !cam.isIdentity, st.high);
  ctx.setTransform(base.multiply(cam).multiply(new DOMMatrix([u, 0, 0, u, cx, gy])));
  if (hasBd) drawCat2Backdrop(ctx, 0, 0, OD_SCALE, id, { res: u });

  let shape = null, idleArg = null, t = st.tBase + st.f;
  if (st.mode === 'intro') {
    const f = Math.min(st.f, it.dur);
    shape = it.shape(f, 600 + f);
    idleArg = { k: 1, shape, pose: 'intro', intro: f, edgeL };
    t = 600 + f;
  } else if (st.mode === 'act') {
    shape = act.shape(t);
    if (mixing) shape = mixShape(st.from.shape, shape, skip);
    idleArg = { k: 1, shape, pose: 'act' };
    if (mixing) idleArg = { ...idleArg, intro: st.from.f + st.f, skip, edgeL };
  }

  // เงาใต้เท้า หดตอนลอย · ท่าเปิดตัว: ก่อนน้องปรากฏยังไม่มีเงา
  const lift = (shape?.lift || 0) * OD_SCALE;
  const hopK = 1 - Math.min(0.42, lift / 40);
  const appear = st.mode === 'intro' ? Math.max(0, Math.min(1, (st.f - (it.appear || 0)) / 14)) : 1;
  ctx.globalAlpha = 0.28 * hopK * appear;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse((shape?.dx || 0) * OD_SCALE, 5, 44 * hopK, 8.5 * hopK, 0, 0, Math.PI * 2);   // ตัวเลื่อน (dx) เงาเลื่อนตาม (แบบหน้าทดสอบ)
  ctx.fill();
  ctx.globalAlpha = 1;
  if (st.mode === 'idle') drawCatAuto(ctx, 0, 0, OD_SCALE, skin, t, null, { fit: 1 });
  else drawCat2(ctx, 0, -lift, OD_SCALE, skin, t, idleArg);
  ctx.setTransform(base);
}

/** ท่าเปิดตัว ณ เฟรม fs (ไว้ผสมเข้าท่าแอ็ค) */
export function odIntroAt(id, fs) {
  const it = cat2Intro(id);
  const f = Math.min(fs, it.dur);
  return { shape: it.shape(f, 600 + f), f };
}
