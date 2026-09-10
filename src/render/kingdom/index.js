// src/render/kingdom/index.js
// ─────────────────────────────────────────────────────────────
// "อาณาจักรแมวขนมหวาน" — ฉากหลังที่วาดด้วยโค้ดทั้งหมด ไม่มีไฟล์ภาพเลย
//
// ── ทำไมถึงคุ้มที่จะเลิกใช้ไฟล์ภาพ ──
// ภาพเดิม home-bg.jpg หนัก 576 KB และเป็นภาพนิ่งใบเดียว จะขยับอะไรก็ไม่ได้
// ฉากที่วาดด้วยโค้ดหนักไม่กี่กิโลไบต์ เลื่อนได้ เปลี่ยนสีตามธีมได้
// และชิ้นส่วนทุกชิ้นเอาไปวางในด่านจริงได้ทันทีเพราะใช้พิกัดชุดเดียวกับตัวเกม
//
// ── หน้าตาของ API ──
//     drawKingdom(ctx, tick)                     วาดทั้งฉาก (ใช้ในหน้าแรก)
//     drawKingdom(ctx, tick, { speed, worldX })  คุมความเร็ว/ตำแหน่งเองตอนเอาไปใช้ในด่าน
//
// จงใจไม่มี requestAnimationFrame อยู่ในไฟล์นี้ — เกมมีลูปของตัวเองอยู่แล้วหนึ่งลูป
// การเปิดลูปที่สองขึ้นมาแข่งกันคือทางที่ทำให้เฟรมตกโดยไม่มีใครรู้สาเหตุ
// ─────────────────────────────────────────────────────────────
import { VIEW } from '../../config.js';
import { KINGDOM } from './palette.js';
import { PROPS } from './props.js';
import {
  KINGDOM_LAYERS,
  drawKingdomSky,
  drawKingdomGround,
  drawKingdomBack,
  drawKingdomFront,
} from './layers.js';

export { KINGDOM } from './palette.js';
export { PROPS } from './props.js';
export { KINGDOM_LAYERS } from './layers.js';

/**
 * ความเร็วเลื่อนฉาก หน่วยเป็นพิกเซลต่อเฟรม
 *
 * ── ทำไมหน้าแรกเป็นศูนย์ ──
 * เคยตั้งไว้ให้ไหลช้า ๆ เพื่อให้ภาพดูมีชีวิต แต่ผลจริงคือฉากไหลไปเรื่อย ๆ
 * ไม่มีวันหยุด ซึ่งกวนสายตาบนหน้าที่ผู้เล่นค้างอยู่นานที่สุด
 * และทำให้จัดองค์ประกอบไม่ได้เลย เพราะของทุกชิ้นเลื่อนผ่านตำแหน่งที่จัดไว้
 *
 * ความรู้สึกว่า "ภาพมีชีวิต" ไม่ได้มาจากการเลื่อนฉาก แต่มาจากของในฉากที่ขยับ
 * อยู่กับที่ — หนูกระโดด ไหมพรมโยก น้ำตกไหล ธงสะบัด
 * ระบบเลื่อนยังอยู่ครบ แค่หน้าแรกไม่ใช้ ตอนเอาไปทำด่านจริงส่งค่า run เข้าไปได้เลย
 */
export const KINGDOM_SPEED = {
  lobby: 0,
  run: 6,
};

/**
 * วาดฉากทั้งหมดลงบน ctx ขนาด 960x420 ของเกม
 *
 * @param ctx   ผ้าใบของเกม
 * @param tick  เลขเฟรมที่เดินขึ้นเรื่อย ๆ ใช้ทั้งกับแอนิเมชันและระยะเลื่อน
 * @param opts.speed         พิกเซลต่อเฟรมของชั้นที่ depth = 1
 * @param opts.worldX        ระยะเลื่อนเอง (ถ้าส่งมา จะไม่คิดจาก tick)
 * @param opts.palette       จานสีชุดอื่น เช่นธีมกลางคืน
 * @param opts.noForeground  ปิดชั้นหน้าสุด ตอนที่ต้องเห็นตัวละครเต็มตัว
 */
export function drawKingdom(ctx, tick, opts = {}) {
  const p = opts.palette || KINGDOM;
  const speed = opts.speed ?? KINGDOM_SPEED.lobby;
  const worldX = opts.worldX ?? tick * speed;

  ctx.save();
  // ตัดทุกอย่างให้อยู่ในกรอบฉาก ของที่ยื่นออกนอกขอบจะไม่ไปโผล่ทับอย่างอื่น
  ctx.beginPath();
  ctx.rect(0, 0, VIEW.W, VIEW.H);
  ctx.clip();

  drawKingdomSky(ctx, p);
  drawKingdomBack(ctx, worldX, p, tick);
  drawKingdomGround(ctx, worldX, p, tick);
  drawKingdomFront(ctx, worldX, p, tick, opts);

  ctx.restore();
}

/**
 * ห่อชิ้นส่วนหนึ่งชิ้นให้กลายเป็น "วัตถุในเกม"
 *
 * ── ทำไมเป็นแค่ตัวห่อบาง ๆ ไม่ใช่คลาสใหญ่ ──
 * เกมนี้มีระบบวัตถุของตัวเองอยู่แล้ว (ดู src/level.js กับ src/treasures.js)
 * การสร้างระบบวัตถุชุดที่สองขึ้นมาขนานกันจะได้โค้ดที่ไม่มีใครใช้
 * แล้วสองระบบจะเริ่มไม่ตรงกันภายในไม่กี่เดือน
 *
 * ตัวนี้จึงทำหน้าที่เดียว: แปลงชิ้นส่วนในฉากให้มีหน้าตา update/draw
 * เพื่อเอาไปเสียบกับระบบเดิมได้เลยตอนอยากให้ของในฉากเก็บได้หรือชนได้
 *
 *     const lamp = spawnProp('lantern', 600, GROUND_Y);
 *     lamp.update(worldX);
 *     lamp.draw(ctx, tick);
 */
export function spawnProp(art, x, y, opts = {}) {
  if (!PROPS[art]) throw new Error('ไม่รู้จักชิ้นส่วนชื่อ ' + art);
  return {
    art,
    x, y,
    scale: opts.scale ?? 1,
    seed: opts.seed ?? Math.floor(Math.random() * 1e4),
    depth: opts.depth ?? 1,
    type: opts.type ?? 'decoration',   // decoration | collectible | obstacle
    width: opts.width ?? 32,
    height: opts.height ?? 32,
    alive: true,

    /** เลื่อนตามโลก — รับตำแหน่งกล้องมา ไม่ได้เก็บความเร็วไว้เอง
     *  (ความเร็วเป็นของเกม ไม่ใช่ของวัตถุ วัตถุที่จำความเร็วเองจะหลุดจังหวะกันเมื่อเกมเร่ง) */
    update(worldX) {
      this.screenX = this.x - worldX * this.depth;
      if (this.screenX < -200) this.alive = false;
    },

    draw(ctx, tick, palette = KINGDOM) {
      PROPS[this.art](ctx, this.screenX ?? this.x, this.y, this.scale, palette, tick, this.seed);
    },

    /** กรอบชนสำหรับตอนเอาไปทำของเก็บหรือสิ่งกีดขวาง */
    get box() {
      const sx = this.screenX ?? this.x;
      return {
        x: sx - (this.width * this.scale) / 2,
        y: this.y - this.height * this.scale,
        w: this.width * this.scale,
        h: this.height * this.scale,
      };
    },
  };
}

/** รายชื่อชิ้นส่วนทั้งหมดที่มี — ใช้ตอนอยากไล่ดูว่ามีอะไรให้หยิบใช้บ้าง */
export function propNames() {
  return Object.keys(PROPS);
}

/** ชื่อชั้นทั้งหมดพร้อมความเร็ว — ใช้ตอนจูนความลึกของฉาก */
export function layerInfo() {
  return KINGDOM_LAYERS.map((l) => ({ name: l.name, depth: l.depth, tile: l.tile, items: l.items.length }));
}
