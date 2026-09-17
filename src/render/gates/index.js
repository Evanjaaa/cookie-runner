// src/render/gates/index.js
// ─────────────────────────────────────────────────────────────
// ทะเบียนภาพทางเข้าด่าน — GATES[id].art ชี้มาที่นี่
// ทางเข้าใหม่: เขียนไฟล์ภาพ (back/front/warm) แล้วเติมหนึ่งแถว
// ─────────────────────────────────────────────────────────────
import { drawKitchenBack, drawKitchenFront, warmKitchenArt } from './kitchen.js';
import { drawGardenBack, drawGardenFront, warmGardenArt } from './garden.js';

export const GATE_ART = {
  kitchen: { back: drawKitchenBack, front: drawKitchenFront, warm: warmKitchenArt },
  garden: { back: drawGardenBack, front: drawGardenFront, warm: warmGardenArt },
};

/** ชั้นหลัง — วาดหลังพื้น ก่อนของกินและตัวละคร */
export function drawGateBack(ctx, def, view) {
  const art = GATE_ART[def.art];
  if (art) art.back(ctx, view);
}

/** ชั้นหน้า — วาดหลังตัวละคร (เสาประตู โคมไฟ) */
export function drawGateFront(ctx, def, view) {
  const art = GATE_ART[def.art];
  if (art) art.front(ctx, view);
}

/**
 * สร้างสไปรต์/ชั้นแคชของทางเข้าไว้ก่อนตัวอาคารโผล่เข้าจอ
 * scale = สเกลจริงของผ้าใบเกม ชั้นแคชจะได้คมเท่าจอ (ดู garden.js)
 */
export function warmGateArt(def, scale = 1) {
  const art = GATE_ART[def.art];
  if (art && art.warm) art.warm(document.createElement('canvas').getContext('2d'), def.layout, scale);
}
