// src/render/catroom.js
// ─────────────────────────────────────────────────────────────
// "บ้านน้องแมว" — ห้องนอนแมวในปราสาท วาดด้วยโค้ดทั้งหมด (ไม่มีไฟล์ภาพ)
//
// ── หน้าตา ──
// อิงภาพต้นแบบที่ตกลงกันไว้: ห้องหินโทนครีม คานไม้ พรมแดงขอบทอง แสงโคมอุ่น ๆ
// เรียงมุมจากซ้ายไปขวา: ที่ให้อาหาร → เตียงหลังคา → อ่างอาบน้ำ → หีบของเล่น →
// โต๊ะแต่งตัว + ตู้โบว์ → ม้านั่งริมหน้าต่าง (กลางห้อง) → คอนโดแมว → ชั้นนอนบนผนัง →
// กล่องกระดาษต้อนรับ → ประตู   ผนังมีกรอบรูปความทรงจำ และภาพน้องส้มสวมมงกุฎ
//
// ── ขนาด ──
// กว้าง 2 จอ (CATROOM_W) สูงเท่าจอเกม ใช้พิกัดชุดเดียวกับเกม (หน่วยเดียวกับ VIEW)
// ผู้เล่นปัดเลื่อนซ้ายขวาได้ ตัวควบคุมกล้องอยู่ใน src/catroom.js
//
// ── แบ่งเป็นสามชั้น ──
//   หลัง   ผนัง พื้น เฟอร์นิเจอร์ — ของนิ่งทั้งหมด วาดครั้งเดียวเก็บเป็นภาพแคช
//          (ห้องกว้างสองจอมีชิ้นส่วนหลายร้อยเส้น วาดใหม่ทุกเฟรมบนมือถือไม่ไหว)
//   สด     ฟ้านอกหน้าต่าง เปลวโคม ฟองในอ่าง ฝุ่นในแสงแดด อาหารในชาม — วาดทุกเฟรม
//   หน้า   ม่านกับต้นไม้ที่ขอบห้อง เลื่อนเร็วกว่ากล้อง (พารัลแลกซ์) น้องเดินลอดหลังได้
//
// ── กลางวัน / กลางคืน ──
// ใช้ภาพแคชชุดเดียวกัน กลางคืนแค่หรี่ทั้งห้องแล้วให้โคมกับเทียนเรืองขึ้น
// ฟ้านอกหน้าต่างเปลี่ยนเป็นพระจันทร์กับดาว
// ─────────────────────────────────────────────────────────────
import { VIEW } from '../config.js';

const { H } = VIEW;

/**
 * ความกว้างห้อง — ราวสองจอกว่า ๆ
 * เดิมกว้างสองจอพอดี แล้วเฟอร์นิเจอร์เบียดจนทับกัน (ม้านั่งริมหน้าต่างบังตู้เสื้อผ้า)
 * ขยายแล้วจัดใหม่ให้ทุกชิ้นมีช่องว่างระหว่างกัน ดูตำแหน่งทั้งหมดใน L ข้างล่าง
 */
export const CATROOM_W = 2560;

/**
 * ตำแหน่ง (กึ่งกลาง x) ของเฟอร์นิเจอร์ทุกชิ้น — ที่เดียว จะได้เห็นระยะห่างทั้งห้องในทีเดียว
 * เรียงซ้ายไปขวาตามภาพต้นแบบ ทุกคู่ที่อยู่ติดกันเว้นช่องไว้อย่างน้อย 30 หน่วย
 */
const L = {
  cabinet: 150,     // ตู้อาหาร 52-248
  bed: 506,         // เตียงหลังคานอนได้สามตัว (ขยาย 1.22 เท่า) ~368-644
  tub: 790,         // อ่าง 736-844
  towel: 880,
  chest: 1000,      // หีบของเล่น 958-1042 (ไม้ตกแมวยื่นถึง ~1050)
  vanity: 1150,     // โต๊ะแต่งตัว 1100-1200
  wardrobe: 1290,   // ตู้เสื้อผ้า 1254-1326
  window: 1560,     // หน้าต่าง + ม้านั่ง 1456-1664 (ม่าน ~1437-1683)
  tree: 1890,       // คอนโดแมว 1820-1960
  shelves: 2030,    // ชั้นนอนบนผนัง
  portrait: 2150,   // ภาพน้องส้ม
  box: 2290,        // กล่องต้อนรับ
  plant: 2380,
  door: 2470,       // ประตู 2408-2532
};

/** เตียงขยายจากแบบเดิม ให้นอนได้สบาย ๆ หนึ่งตัวเต็มฟูก */
const BED_S = 1.22;
const BED_BASE = 356;
/** พรมยาวพาดทั้งห้อง — ทางเดินของน้อง (ขอบบนอยู่หน้าฐานเฟอร์นิเจอร์ทุกชิ้น) */
const RUG = { x0: 300, x1: 2390, y0: 372, y1: 418 };
/** เส้นแบ่งผนังกับพื้น */
export const FLOOR_Y = 292;
/**
 * แนวเท้าปกติของน้องบนพื้น — อยู่บนพรม หน้าฐานเฟอร์นิเจอร์ทุกชิ้น (ฐานลึกสุด ~366)
 * เดิมอยู่ที่ 356 ซึ่งตรงกับระดับฐานหีบ/โต๊ะ น้องจึงดูเหมือนเดินเหยียบของ
 */
export const LANE_Y = 392;

/**
 * จุดกิจกรรม — ตัวควบคุมพาน้องเดินไปที่นี่ (x = กลางจุด, y = ระดับเท้า)
 * ชามสามใบ = น้องสามตัว (ห้องรับได้ 3 ตัวพอดี)
 */
export const SPOTS = {
  // ชามสามใบ + ชามน้ำ เรียงแนวเดียวกันระยะเท่ากัน (เดิมสูงต่ำไม่เท่ากันทีละ 2 หน่วย ดูเบี้ยว)
  bowls: [{ x: 120, y: 364 }, { x: 176, y: 364 }, { x: 232, y: 364 }],
  water: { x: 288, y: 364 },
  // จุดขึ้นไปนั่ง/นอน: y = ระดับผิวเบาะจริง น้องจะนั่งอยู่บนเบาะ ไม่ร่วงลงมาข้างล่าง
  // เตียงนอนได้สามตัว — ตรงหมอนแต่ละใบ (ดู BED_PILLOWS) บนผิวฟูก
  beds: [-56, 0, 56].map((dx) => ({ x: L.bed + dx * BED_S, y: BED_BASE - 52 * BED_S })),
  // ม้านั่งริมหน้าต่างนั่งได้สามตัว — เบาะแยกสามใบ (ดู windowSeat) น้องทั้งห้องนั่งเรียงกันได้
  seats: [-64, 0, 64].map((dx) => ({ x: L.window + dx, y: 288 })),
  hammock: { x: L.tree - 5, y: 322 },              // ในเปล (ผ้าเปลทับตัวช่วงล่าง ดู drawHammockFront)
  // คอนโดแมว: แท่นล่าง / หลังคาบ้าน / แท่นบนสุด — ปีนขึ้นไปเป็นลำดับ (ดู TREE_ROUTES ใน catroom.js)
  treeLow: { x: L.tree - 62, y: 246 },
  // หลังคาบ้านกล่อง (ขอบบนกล่องอยู่ที่ y 130) — เดิม 138 ขาน้องจมลงไปใต้หลังคา ดูห้อยลอยอยู่ข้างกล่อง
  treeMid: { x: L.tree + 52, y: 130 },
  treeTop: { x: L.tree - 20, y: 112 },
  treeHouse: { x: L.tree + 52, y: 186 },   // ในบ้านกล่อง (พื้นบ้าน)
  // ชั้นนอนบนผนังสองชั้น — กระโดดต่อจากคอนโดขึ้นไปนั่งได้
  shelfLow: { x: L.shelves + 30, y: 210 },
  shelfHigh: { x: L.shelves - 10, y: 134 },
  tub: { x: L.tub, y: 324 },   // เท้าลอยเหนือก้นอ่าง ให้หัวกับไหล่พ้นขอบอ่าง
  toys: { x: L.chest, y: LANE_Y },
  vanity: { x: L.vanity, y: LANE_Y },
  box: { x: L.box, y: 368 },
  door: { x: L.door, y: LANE_Y },
  /**
   * ช่วงที่เดินเล่นแล้วหยุดพักได้ — เริ่มหลังที่ให้อาหาร (ชามอยู่ที่ x 90-310)
   * น้องจะไม่ไปนั่งพักหน้าชามจนดูเหมือนนั่งทับชามข้าว (เข้าโซนชามเฉพาะตอนมากิน)
   */
  roam: [370, 2400],
  /** ลานเล่นกลางพรม (มินิเกม / ไล่ของเล่น) */
  play: [900, 1400],
};

/** โคมบนผนัง — ใช้ทั้งวาดตัวโคมในภาพแคชและวาดแสงสดทุกเฟรม */
const LANTERNS = [
  { x: 54, y: 128 }, { x: 790, y: 92 }, { x: 1220, y: 92 },
  { x: 1800, y: 128 }, { x: 2340, y: 128 },
];

const P = {
  wall: '#F1E2C8', wallBlock: '#E7D5B6', wallLine: '#D3BC98', wallDeep: '#E2CCA8',
  beam: '#C08A54', beamDark: '#8F5F33', beamLight: '#DCA86E',
  floor: '#E6D1B1', floorTile: '#EEDDC2', floorLine: '#CDB28C',
  wood: '#C4894F', woodLight: '#DDAC70', woodDark: '#9A6636', woodDeep: '#6E4523',
  gold: '#EBB94C', goldLight: '#FCE08F', goldDark: '#B7832A',
  red: '#B4373E', redDark: '#86242C', redLight: '#DA5F68',
  pink: '#F3A3BF', pinkLight: '#FCD3E1', lilac: '#C9A6E8', lilacLight: '#E7D6FA', mint: '#A8DCC8',
  cream: '#FFF7E8', porcelain: '#F6F8FC', porcelainShade: '#C9D2E4',
  card: '#D8A564', cardDark: '#B07D42', cardLight: '#EBC488',
  leaf: '#72B062', leafDark: '#4D8945', pot: '#EFE7DA', potShade: '#CFC2AE',
  glass: '#F3E6C9',
  line: '#5C3B26',
};

// ─────────────────────────────────────────────────────────────
// เครื่องมือวาด
// ─────────────────────────────────────────────────────────────

/**
 * ตัวคูณความหนาเส้นขอบทั้งห้อง — ผู้ใช้ขอให้เส้นบางลง (ฉากเส้นหนาไปจนแย่งซีนตัวน้อง)
 * ปรับที่นี่ที่เดียว: ทุกเส้นในฉากห้องคูณค่านี้ (ตัวน้องวาดด้วยตัววาดของเกมหลัก ไม่โดน)
 */
const LINE_K = 0.7;

function pen(ctx, w = 2.2) {
  ctx.strokeStyle = P.line;
  ctx.lineWidth = w * LINE_K;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** เติมสีแล้วตีเส้นขอบ — ท่าที่ใช้กับเกือบทุกชิ้น */
function fs(ctx, fill, w = 2.2) {
  ctx.fillStyle = fill;
  ctx.fill();
  pen(ctx, w);
  ctx.stroke();
}

function paw(ctx, x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.25, r, r * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(x + (i - 1) * r * 0.86, y - r * 0.72, r * 0.34, r * 0.44, (i - 1) * 0.34, 0, Math.PI * 2);
    ctx.fill();
  }
}

function heart(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.2, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
  ctx.closePath();
}

function crown(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w / 2, y - h * 0.55);
  ctx.lineTo(x - w / 4, y - h * 0.25);
  ctx.lineTo(x, y - h);
  ctx.lineTo(x + w / 4, y - h * 0.25);
  ctx.lineTo(x + w / 2, y - h * 0.55);
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
  fs(ctx, P.gold, 1.6);
}

function hash(n) {
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

// ─────────────────────────────────────────────────────────────
// ผนัง พื้น คาน
// ─────────────────────────────────────────────────────────────

function wall(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
  g.addColorStop(0, P.wallDeep);
  g.addColorStop(0.45, P.wall);
  g.addColorStop(1, P.wall);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CATROOM_W, FLOOR_Y);

  // ก้อนหินจาง ๆ — เรียงอิฐสลับแถว ไม่ตีเส้นทุกก้อน (ทั้งผนังเป็นเส้นจะรกจนแย่งสายตาจากน้อง)
  ctx.strokeStyle = P.wallLine;
  ctx.lineWidth = 1.2 * LINE_K;
  ctx.globalAlpha = 0.55;
  const rowH = 30;
  for (let r = 0; r * rowH < FLOOR_Y; r++) {
    const y = 24 + r * rowH;
    const off = r % 2 ? 46 : 0;
    for (let x = -off; x < CATROOM_W; x += 92) {
      if (hash(r * 97 + x) < 0.45) continue;
      ctx.fillStyle = P.wallBlock;
      rr(ctx, x + 4, y + 3, 84, rowH - 6, 6);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

/** คานไม้ข้างบนกับเสาโค้ง — กรอบห้องให้รู้สึกว่าอยู่ในปราสาท ไม่ใช่ผนังโล่งยาว ๆ */
function beams(ctx) {
  // คานยาวพาดเพดาน
  ctx.fillStyle = P.beam;
  ctx.fillRect(0, 0, CATROOM_W, 20);
  ctx.fillStyle = P.beamDark;
  ctx.fillRect(0, 20, CATROOM_W, 5);
  pen(ctx, 2);
  ctx.beginPath(); ctx.moveTo(0, 25); ctx.lineTo(CATROOM_W, 25); ctx.stroke();

  // เสาไม้กับค้ำโค้งสี่ต้น — แบ่งห้องเป็นช่อง ๆ ตามมุมกิจกรรม
  for (const x of [8, 670, 1740, CATROOM_W - 8]) {
    ctx.fillStyle = P.beam;
    ctx.fillRect(x - 9, 20, 18, FLOOR_Y - 20);
    ctx.fillStyle = P.beamLight;
    ctx.fillRect(x - 9, 20, 5, FLOOR_Y - 20);
    pen(ctx, 2);
    ctx.strokeRect(x - 9, 20, 18, FLOOR_Y - 20);
    for (const side of [-1, 1]) {
      if ((x < 20 && side < 0) || (x > CATROOM_W - 20 && side > 0)) continue;
      ctx.beginPath();
      ctx.moveTo(x + side * 9, 70);
      ctx.quadraticCurveTo(x + side * 12, 30, x + side * 60, 25);
      ctx.lineTo(x + side * 60, 33);
      ctx.quadraticCurveTo(x + side * 20, 38, x + side * 9, 84);
      ctx.closePath();
      fs(ctx, P.beam, 1.8);
    }
  }
}

function floor(ctx) {
  const g = ctx.createLinearGradient(0, FLOOR_Y, 0, H);
  g.addColorStop(0, '#D8C09D');
  g.addColorStop(0.25, P.floor);
  g.addColorStop(1, P.floorTile);
  ctx.fillStyle = g;
  ctx.fillRect(0, FLOOR_Y, CATROOM_W, H - FLOOR_Y);

  // บัวผนัง
  ctx.fillStyle = P.woodLight;
  ctx.fillRect(0, FLOOR_Y - 8, CATROOM_W, 8);
  pen(ctx, 2);
  ctx.beginPath(); ctx.moveTo(0, FLOOR_Y - 8); ctx.lineTo(CATROOM_W, FLOOR_Y - 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, FLOOR_Y); ctx.lineTo(CATROOM_W, FLOOR_Y); ctx.stroke();

  // แผ่นหินปูพื้น — เส้นนอนถี่ขึ้นตามระยะ เส้นตั้งเอียงออกจากกลางจอ ให้พื้นมีความลึก
  ctx.strokeStyle = P.floorLine;
  ctx.lineWidth = 1.2 * LINE_K;
  ctx.globalAlpha = 0.6;
  for (const y of [312, 338, 370, 408]) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CATROOM_W, y); ctx.stroke();
  }
  for (let x = -40; x < CATROOM_W + 80; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, FLOOR_Y);
    ctx.lineTo(x + (x - CATROOM_W / 2) * 0.12, H);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * พรมยาวพาดทั้งห้อง — แดงขอบทอง มีรอยเท้าแมวเรียงเป็นระยะ
 * เป็น "ทางเดิน" ของน้อง: ขอบบนของพรมอยู่หน้าฐานเฟอร์นิเจอร์ทุกชิ้น
 * น้องที่เดินบนพรมจึงอยู่หน้าของทุกอย่างเสมอ ไม่มีจังหวะที่ดูเหมือนเหยียบของ
 */
function longRug(ctx) {
  const { x0, x1, y0, y1 } = RUG;
  ctx.beginPath();
  ctx.moveTo(x0 + 24, y0);
  ctx.lineTo(x1 - 24, y0);
  ctx.lineTo(x1 + 6, y1 + 2);
  ctx.lineTo(x0 - 6, y1 + 2);
  ctx.closePath();
  fs(ctx, P.red, 2.4);

  // ขอบทองด้านใน
  ctx.beginPath();
  ctx.moveTo(x0 + 36, y0 + 7);
  ctx.lineTo(x1 - 36, y0 + 7);
  ctx.lineTo(x1 - 10, y1 - 6);
  ctx.lineTo(x0 + 10, y1 - 6);
  ctx.closePath();
  ctx.strokeStyle = P.gold;
  ctx.lineWidth = 3 * LINE_K;
  ctx.stroke();

  // รอยเท้าแมวเรียงตามทาง — เหมือนน้องเคยเดินผ่าน
  for (let x = x0 + 140; x < x1 - 100; x += 210) {
    paw(ctx, x, 394 + ((x / 210) % 2 ? -3 : 3), 8, 'rgba(235,185,76,.75)');
  }
}

// ─────────────────────────────────────────────────────────────
// ของบนผนัง
// ─────────────────────────────────────────────────────────────

/** ธงแดงรอยเท้าแมวห้อยจากคาน */
function banner(ctx, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = P.goldDark;
  ctx.fillRect(-26, -4, 52, 6);
  ctx.beginPath();
  ctx.moveTo(-22, 2);
  ctx.lineTo(22, 2);
  ctx.lineTo(22, 96);
  ctx.lineTo(0, 80);
  ctx.lineTo(-22, 96);
  ctx.closePath();
  fs(ctx, P.red, 2);
  ctx.strokeStyle = P.gold;
  ctx.lineWidth = 2 * LINE_K;
  ctx.beginPath();
  ctx.moveTo(-16, 8); ctx.lineTo(16, 8); ctx.lineTo(16, 84); ctx.lineTo(0, 72); ctx.lineTo(-16, 84); ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = P.cream;
  ctx.beginPath(); ctx.arc(0, 38, 13, 0, Math.PI * 2); ctx.fill();
  paw(ctx, 0, 39, 6.5, P.red);
  ctx.restore();
}

/** ตัวโคม (ไม่รวมเปลวไฟกับแสง — สองอย่างนั้นวาดสดทุกเฟรมใน drawCatRoomLive) */
function lanternBody(ctx, x, y) {
  pen(ctx, 2);
  ctx.beginPath(); ctx.moveTo(x - 14, y - 26); ctx.lineTo(x - 4, y - 26); ctx.lineTo(x - 4, y - 18); ctx.stroke();
  ctx.fillStyle = P.goldDark;
  rr(ctx, x - 18, y - 30, 8, 8, 2); ctx.fill(); ctx.stroke();
  // ฝาโคม
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 14); ctx.lineTo(x, y - 24); ctx.lineTo(x + 12, y - 14); ctx.closePath();
  fs(ctx, P.gold, 1.8);
  // กระจก
  rr(ctx, x - 10, y - 14, 20, 26, 4);
  fs(ctx, 'rgba(255,236,190,.55)', 1.8);
  ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x, y + 12); ctx.stroke();
  // ฐาน
  rr(ctx, x - 12, y + 12, 24, 6, 2);
  fs(ctx, P.gold, 1.8);
}

/** กรอบรูปความทรงจำ — ข้างในเป็นรอยเท้า/หัวใจ/หน้าแมวลายเส้น */
function frame(ctx, x, y, w, h, kind, oval = false) {
  ctx.beginPath();
  if (oval) ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
  else rr(ctx, x - w / 2, y - h / 2, w, h, 3);
  fs(ctx, P.gold, 2);
  ctx.beginPath();
  if (oval) ctx.ellipse(x, y, w / 2 - 5, h / 2 - 5, 0, 0, Math.PI * 2);
  else rr(ctx, x - w / 2 + 5, y - h / 2 + 5, w - 10, h - 10, 2);
  fs(ctx, P.glass, 1.4);
  const r = Math.min(w, h) * 0.18;
  if (kind === 'paw') paw(ctx, x, y + 1, r, '#C9A77E');
  else if (kind === 'heart') { heart(ctx, x, y, r * 1.1); ctx.fillStyle = '#E49AAE'; ctx.fill(); }
  else {
    // หน้าแมวลายเส้น
    ctx.strokeStyle = '#A88663';
    ctx.lineWidth = 1.6 * LINE_K;
    ctx.beginPath();
    ctx.moveTo(x - r * 1.2, y + r * 0.9);
    ctx.lineTo(x - r * 1.2, y - r * 0.6); ctx.lineTo(x - r * 0.6, y - r * 0.1);
    ctx.lineTo(x + r * 0.6, y - r * 0.1); ctx.lineTo(x + r * 1.2, y - r * 0.6);
    ctx.lineTo(x + r * 1.2, y + r * 0.9);
    ctx.closePath();
    ctx.stroke();
  }
}

function memoryWall(ctx) {
  // เลื่อนกลุ่มกรอบรูปไปซ้ายนิดหนึ่ง ให้พ้นม่านเตียงที่ขยายใหญ่ขึ้น
  ctx.save();
  ctx.translate(-44, 0);
  frame(ctx, 236, 74, 34, 40, 'paw');
  frame(ctx, 286, 62, 30, 34, 'face');
  frame(ctx, 336, 58, 30, 38, 'heart');
  frame(ctx, 384, 70, 34, 42, 'paw', true);
  frame(ctx, 252, 124, 30, 34, 'heart', true);
  frame(ctx, 302, 112, 34, 38, 'paw');
  frame(ctx, 350, 118, 30, 34, 'face');
  frame(ctx, 276, 166, 34, 34, 'paw', true);
  frame(ctx, 328, 170, 30, 36, 'heart');
  frame(ctx, 380, 160, 34, 40, 'face');
  ctx.restore();
}

/** ภาพน้องส้มสวมมงกุฎ — พี่เลี้ยงของบ้าน วาดจากจานสีน้องส้มตรง ๆ ไม่ผ่านตัววาดแมว (เป็นภาพเขียน) */
function mentorPortrait(ctx, x, y) {
  rr(ctx, x - 44, y - 54, 88, 108, 6);
  fs(ctx, P.gold, 2.4);
  rr(ctx, x - 36, y - 46, 72, 92, 4);
  fs(ctx, '#7A4E7E', 1.6);
  crown(ctx, x, y - 54, 34, 22);

  // ไหล่สวมเสื้อคลุมแดงขอบขาว
  ctx.beginPath();
  ctx.moveTo(x - 32, y + 46);
  ctx.quadraticCurveTo(x - 30, y + 14, x, y + 12);
  ctx.quadraticCurveTo(x + 30, y + 14, x + 32, y + 46);
  ctx.closePath();
  fs(ctx, P.red, 1.6);
  ctx.fillStyle = P.cream;
  ctx.beginPath(); ctx.ellipse(x, y + 18, 18, 6, 0, 0, Math.PI * 2); ctx.fill();

  // หัวแมวส้ม
  ctx.beginPath();
  ctx.moveTo(x - 20, y - 14);
  ctx.lineTo(x - 18, y - 34); ctx.lineTo(x - 8, y - 22);
  ctx.lineTo(x + 8, y - 22); ctx.lineTo(x + 18, y - 34); ctx.lineTo(x + 20, y - 14);
  ctx.quadraticCurveTo(x + 22, y + 10, x, y + 12);
  ctx.quadraticCurveTo(x - 22, y + 10, x - 20, y - 14);
  ctx.closePath();
  fs(ctx, '#FF9538', 1.8);
  ctx.fillStyle = '#FFF1D4';
  ctx.beginPath(); ctx.ellipse(x, y + 4, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3E1C06';
  ctx.beginPath(); ctx.arc(x - 8, y - 6, 2.4, 0, Math.PI * 2); ctx.arc(x + 8, y - 6, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FF8FAE';
  ctx.beginPath(); ctx.arc(x, y + 1, 1.8, 0, Math.PI * 2); ctx.fill();
  // มงกุฎเล็กบนหัว
  crown(ctx, x, y - 24, 14, 10);
}

/** ชั้นติดผนังพร้อมเบาะ — น้องกระโดดขึ้นไปนอนได้ */
function wallBedShelf(ctx, x, y, w) {
  rr(ctx, x - w / 2, y, w, 9, 3);
  fs(ctx, P.woodLight, 2);
  for (const sx of [-w / 2 + 12, w / 2 - 12]) {
    ctx.beginPath();
    ctx.moveTo(sx, y + 9); ctx.lineTo(sx, y + 22); ctx.lineTo(sx + (sx < 0 ? 12 : -12), y + 9);
    ctx.closePath();
    fs(ctx, P.wood, 1.6);
  }
  rr(ctx, x - w / 2 + 6, y - 9, w - 12, 11, 5);
  fs(ctx, P.lilacLight, 1.8);
}

/** ชั้นเล็กมีกระถางต้นไม้กับกรอบรูป */
function smallShelf(ctx, x, y) {
  rr(ctx, x - 40, y, 80, 7, 2);
  fs(ctx, P.woodLight, 2);
  rr(ctx, x - 30, y - 18, 16, 18, 3); fs(ctx, P.pot, 1.6);
  ctx.fillStyle = P.leaf;
  for (const [dx, dy] of [[-26, -24], [-18, -28], [-22, -32]]) {
    ctx.beginPath(); ctx.ellipse(x + dx, y + dy, 6, 4, dx * 0.05, 0, Math.PI * 2); ctx.fill();
  }
  frame(ctx, x + 14, y - 16, 22, 28, 'paw');
}

// ─────────────────────────────────────────────────────────────
// หน้าต่าง (กรอบอยู่ในภาพแคช — ฟ้าข้างในวาดสด)
// ─────────────────────────────────────────────────────────────

const WIN = { x: L.window, top: 40, w: 150, bottom: 252 };

function windowArch(ctx, inset = 0, fresh = true) {
  const { x, top, w, bottom } = WIN;
  const hw = w / 2 - inset;
  if (fresh) ctx.beginPath();
  ctx.moveTo(x - hw, bottom - inset);
  ctx.lineTo(x - hw, top + hw + inset);
  ctx.arc(x, top + hw + inset, hw, Math.PI, 0);
  ctx.lineTo(x + hw, bottom - inset);
  ctx.closePath();
}

/** กรอบหน้าต่างด้านนอก — วาดในแคช ช่องกระจกปล่อยโปร่งให้ฟ้าสดลอดขึ้นมา */
function windowFrame(ctx) {
  // วงกรอบ = โค้งนอกลบโค้งใน (สองรูปในเส้นทางเดียว เติมแบบ evenodd)
  ctx.save();
  windowArch(ctx, -12);
  windowArch(ctx, 0, false);
  ctx.fillStyle = P.woodLight;
  ctx.fill('evenodd');
  ctx.restore();
  pen(ctx, 2.4);
  windowArch(ctx, -12); ctx.stroke();
  windowArch(ctx, 0); ctx.stroke();
  // ขอบหน้าต่างล่าง (ม้านั่งอยู่ข้างใต้)
  rr(ctx, WIN.x - WIN.w / 2 - 22, WIN.bottom - 4, WIN.w + 44, 12, 3);
  fs(ctx, P.woodLight, 2);
}

/** ม้านั่งริมหน้าต่างพร้อมหมอน */
function windowSeat(ctx) {
  const x = WIN.x, y = 300;
  rr(ctx, x - 100, y, 200, 38, 6);
  fs(ctx, P.wood, 2.2);
  rr(ctx, x - 92, y + 8, 184, 22, 4);
  fs(ctx, P.woodDark, 1.6);
  // ── เบาะนั่งสามใบ ── แยกกันเป็นที่นั่งของใครของมัน (ดู SPOTS.seats)
  // เดิมเป็นเบาะยาวผืนเดียวกับหมอนกองสองข้าง อ่านเป็น "ที่นอน" และนั่งได้แค่ตรงกลาง
  // หมอนพิงเล็ก ๆ หลังเบาะแต่ละใบ บอกว่า "นั่งตรงนี้ได้" ทีละที่
  const backs = [P.pink, P.cream, P.lilac];
  [-64, 0, 64].forEach((dx, i) => {
    ctx.save();
    ctx.translate(x + dx, y - 24);
    ctx.rotate((i - 1) * 0.06);
    rr(ctx, -16, -12, 32, 22, 7);
    fs(ctx, backs[i], 1.8);
    ctx.restore();
    rr(ctx, x + dx - 31, y - 14, 62, 18, 8);
    fs(ctx, P.red, 2.2);
    ctx.strokeStyle = P.gold; ctx.lineWidth = 2 * LINE_K;
    ctx.beginPath(); ctx.moveTo(x + dx - 24, y - 2); ctx.lineTo(x + dx + 24, y - 2); ctx.stroke();
  });
  crown(ctx, x, y - 4, 14, 9);
}

// ─────────────────────────────────────────────────────────────
// เฟอร์นิเจอร์
// ─────────────────────────────────────────────────────────────

/** ตู้เก็บอาหารพร้อมโหลขนมด้านบน */
function foodCabinet(ctx) {
  const x = 150, y = 228, w = 196, h = 70;
  rr(ctx, x - w / 2, y, w, h, 5);
  fs(ctx, P.wood, 2.4);
  rr(ctx, x - w / 2 - 6, y - 8, w + 12, 10, 3);
  fs(ctx, P.woodLight, 2.2);
  // ลิ้นชักสามช่อง
  for (let i = 0; i < 3; i++) {
    const dx = x - w / 2 + 10 + i * 60;
    rr(ctx, dx, y + 10, 54, 22, 3); fs(ctx, P.woodLight, 1.6);
    rr(ctx, dx, y + 38, 54, 22, 3); fs(ctx, P.woodLight, 1.6);
    ctx.fillStyle = P.gold;
    ctx.beginPath(); ctx.arc(dx + 27, y + 21, 3, 0, Math.PI * 2); ctx.arc(dx + 27, y + 49, 3, 0, Math.PI * 2); ctx.fill();
  }
  // โหลขนม
  const jars = [[-70, 30, '#F6C063'], [-36, 36, '#F5A3C0'], [0, 30, '#9ED7B4']];
  for (const [dx, jh, c] of jars) {
    const jx = x + dx;
    rr(ctx, jx - 13, y - 8 - jh, 26, jh, 6);
    fs(ctx, 'rgba(240,248,255,.72)', 1.8);
    ctx.fillStyle = c;
    rr(ctx, jx - 10, y - 8 - jh * 0.62, 20, jh * 0.6 - 2, 4);
    ctx.fill();
    rr(ctx, jx - 11, y - 14 - jh, 22, 7, 2);
    fs(ctx, P.woodLight, 1.6);
  }
  // กระถางดอกไม้
  rr(ctx, x + 40, y - 26, 26, 18, 4); fs(ctx, P.pot, 1.8);
  for (const [dx, dy, c] of [[44, -36, '#FFE3EE'], [54, -42, '#FFFFFF'], [62, -34, '#FFD27A']]) {
    ctx.fillStyle = P.leaf;
    ctx.beginPath(); ctx.ellipse(x + dx, y + dy + 6, 6, 3, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(x + dx, y + dy, 5, 0, Math.PI * 2); ctx.fill();
    pen(ctx, 1.2); ctx.stroke();
  }
}

/** ชามบนพื้น (อาหารข้างในวาดสด ระดับตามที่ตัวควบคุมบอก) */
function bowl(ctx, x, y, water = false) {
  ctx.beginPath();
  ctx.ellipse(x, y - 4, 24, 7, 0, 0, Math.PI * 2);
  fs(ctx, water ? '#8FD0F0' : '#8A5A2E', 1.8);
  ctx.beginPath();
  ctx.moveTo(x - 24, y - 4);
  ctx.quadraticCurveTo(x - 22, y + 8, x - 14, y + 9);
  ctx.lineTo(x + 14, y + 9);
  ctx.quadraticCurveTo(x + 22, y + 8, x + 24, y - 4);
  ctx.ellipse(x, y - 4, 24, 7, 0, 0, Math.PI, false);
  ctx.closePath();
  fs(ctx, P.gold, 2);
  ctx.strokeStyle = P.goldLight; ctx.lineWidth = 1.5 * LINE_K;
  ctx.beginPath(); ctx.ellipse(x, y - 4, 20, 5, 0, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
}

/**
 * พรมประจำโซน — แต่ละมุมกิจกรรมมีพรมสีของตัวเองพร้อมไอคอนปักไว้ตรงกลาง
 * มองปุ๊บรู้ว่าตรงนี้ใช้ทำอะไร (ให้อาหาร / อาบน้ำ / นอน / เล่น / คอนโด / ต้อนรับ)
 * วาดก่อนพรมทางเดิน ขอบล่างของพรมโซนจึงมุดลงใต้พรมทางเดินพอดี
 */
function zoneRug(ctx, x, rx, fill, rim, icon) {
  const y = 360;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, 15, 0, 0, Math.PI * 2);
  fs(ctx, fill, 2);
  ctx.strokeStyle = rim;
  ctx.lineWidth = 2.4 * LINE_K;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.ellipse(x, y, rx - 9, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  if (icon) icon(x + rx - 26, y - 1);
}

function zoneRugs(ctx) {
  // อาบน้ำ: ฟ้า มีฟองสบู่
  zoneRug(ctx, L.tub, 82, '#A8D8F0', '#E9F7FF', (ix, iy) => {
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.6 * LINE_K;
    for (const [dx, dy, r] of [[0, 0, 4], [7, -3, 3], [4, 4, 2.4]]) { ctx.beginPath(); ctx.arc(ix + dx, iy + dy, r, 0, Math.PI * 2); ctx.stroke(); }
  });
  // เล่น: เหลืองมีจุดสี
  zoneRug(ctx, L.chest, 86, '#FBE08F', '#FFF4CC', (ix, iy) => {
    for (const [dx, c] of [[-6, '#7FB6E8'], [2, '#F3A3BF'], [10, '#9ED7B4']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(ix + dx, iy, 3.4, 0, Math.PI * 2); ctx.fill(); }
  });
  // ต้อนรับ: ครีม มีหัวใจ
  zoneRug(ctx, L.box, 70, '#FBE4EC', '#FFFFFF', (ix, iy) => {
    ctx.save(); ctx.translate(ix, iy);
    ctx.beginPath(); ctx.moveTo(0, 5); ctx.bezierCurveTo(-7, 0, -5, -6, 0, -2.5); ctx.bezierCurveTo(5, -6, 7, 0, 0, 5);
    ctx.fillStyle = '#FF8FB8'; ctx.fill(); ctx.restore();
  });
}

function feedingMat(ctx) {
  ctx.beginPath();
  ctx.ellipse(204, 362, 140, 16, 0, 0, Math.PI * 2);
  fs(ctx, '#E9A7B8', 2);
  ctx.strokeStyle = '#F7D2DC'; ctx.lineWidth = 2.4 * LINE_K;
  ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.ellipse(204, 362, 130, 11, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * เตียงหลังคาผ้าม่านแดง — นอนได้สามตัว (หมอนคนละใบ ตรงกับห้องที่มีน้องได้สามตัว)
 *
 * ── สัดส่วน ──
 * ทุกชิ้นวัดจากความกว้างหลังคา (C) ตัวเดียว ม่าน ระบาย และตัวเตียงจึงเข้ารูปกันเสมอ
 *
 * ── ลำดับการวาด = ลำดับความลึก ──
 * ม่านหลัง → ม่านสองข้าง → หลังคา → ระบายทอง → ตัวเตียง
 * ม่านต้องวาด "ก่อน" หลังคากับระบาย หัวม่านจึงซ่อนอยู่ใต้ระบาย ดูห้อยออกมาจากใต้หลังคา
 * (เดิมวาดม่านทีหลัง หัวม่านเลยทับระบายอยู่ข้างหน้า ดูลอยแปะ)
 */
const BED_C = 98;                        // ครึ่งความกว้างหลังคา
const BED_PILLOWS = [-56, 0, 56];        // ตำแหน่งหมอน = ที่นอนของน้องแต่ละตัว

function canopyBed(ctx) {
  const x = L.bed, base = BED_BASE;
  const C = BED_C;
  const top = 150;         // ขอบล่างของหลังคา
  const tie = 250;         // ระดับที่รวบม่าน
  // วาดตามแบบแล้วขยายรอบฐานเตียง — ฐานยังแตะพื้นที่เดิม ตัวเตียงโตขึ้นไปข้างบน
  ctx.save();
  ctx.translate(x, base);
  ctx.scale(BED_S, BED_S);
  ctx.translate(-x, -base);

  // ผ้าม่านด้านหลัง (ลึกสุด)
  rr(ctx, x - C + 8, top - 4, (C - 8) * 2, base - 34 - top, 6);
  fs(ctx, P.redDark, 2);

  // ม่านสองข้าง — หัวม่านเริ่มเหนือขอบหลังคา (ระบายจะทับปิด) รวบเอวด้วยแถบทอง แล้วบานถึงพื้น
  for (const side of [-1, 1]) {
    const o = (d) => x + side * d;
    ctx.beginPath();
    ctx.moveTo(o(C - 16), top - 8);
    ctx.quadraticCurveTo(o(C - 26), tie - 40, o(C - 10), tie);
    ctx.quadraticCurveTo(o(C - 2), tie + 50, o(C - 2), base - 4);
    ctx.lineTo(o(C + 14), base - 4);
    ctx.quadraticCurveTo(o(C + 10), tie + 40, o(C + 4), tie);
    ctx.quadraticCurveTo(o(C + 6), tie - 50, o(C + 2), top - 8);
    ctx.closePath();
    fs(ctx, P.red, 2);
    // จีบผ้า
    ctx.strokeStyle = P.redDark;
    ctx.lineWidth = 1.6 * LINE_K;
    ctx.beginPath();
    ctx.moveTo(o(C - 3), tie + 12);
    ctx.quadraticCurveTo(o(C + 3), tie + 60, o(C + 4), base - 10);
    ctx.stroke();
    // แถบรวบม่าน + พู่
    rr(ctx, Math.min(o(C - 12), o(C + 6)), tie - 4, 18, 8, 3);
    fs(ctx, P.gold, 1.4);
    ctx.strokeStyle = P.goldDark;
    ctx.lineWidth = 1.6 * LINE_K;
    ctx.beginPath(); ctx.moveTo(o(C - 3), tie + 4); ctx.lineTo(o(C - 3), tie + 14); ctx.stroke();
    ctx.fillStyle = P.gold;
    ctx.beginPath(); ctx.ellipse(o(C - 3), tie + 18, 3.2, 5, 0, 0, Math.PI * 2); ctx.fill();
  }

  // หลังคาทรงโดม
  ctx.beginPath();
  ctx.moveTo(x - C - 4, top + 4);
  ctx.quadraticCurveTo(x - C + 4, top - 52, x, top - 62);
  ctx.quadraticCurveTo(x + C - 4, top - 52, x + C + 4, top + 4);
  ctx.closePath();
  fs(ctx, P.red, 2.4);
  ctx.fillStyle = P.goldLight;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.arc(x - 52 + i * 26, top - 26, 3.4, 0, Math.PI * 2); ctx.fill();
  }
  crown(ctx, x, top - 60, 28, 24);

  // ระบายขอบทอง — แบ่งเท่า ๆ กันพอดีความกว้างหลังคา ไม่ยื่นเกินมุม และทับหัวม่านไว้
  const n = 10;
  const w = ((C + 4) * 2) / n;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const px = x - C - 4 + i * w;
    ctx.moveTo(px, top + 2);
    ctx.arc(px + w / 2, top + 2, w / 2, Math.PI, 0, true);
  }
  ctx.fillStyle = P.gold;
  ctx.fill();
  pen(ctx, 1.6);
  ctx.stroke();

  // พนักหัวเตียงโค้ง บุนวมชมพู กระดุมทอง
  const hw = C - 20;
  ctx.beginPath();
  ctx.moveTo(x - hw, base - 36);
  ctx.lineTo(x - hw, base - 80);
  ctx.quadraticCurveTo(x - hw, base - 110, x, base - 112);
  ctx.quadraticCurveTo(x + hw, base - 110, x + hw, base - 80);
  ctx.lineTo(x + hw, base - 36);
  ctx.closePath();
  fs(ctx, P.pink, 2.2);
  ctx.strokeStyle = P.gold;
  ctx.lineWidth = 2.4 * LINE_K;
  ctx.beginPath();
  ctx.moveTo(x - hw + 8, base - 40);
  ctx.lineTo(x - hw + 8, base - 80);
  ctx.quadraticCurveTo(x - hw + 8, base - 102, x, base - 104);
  ctx.quadraticCurveTo(x + hw - 8, base - 102, x + hw - 8, base - 80);
  ctx.lineTo(x + hw - 8, base - 40);
  ctx.stroke();
  ctx.fillStyle = P.goldDark;
  for (const dx of [-48, -24, 0, 24, 48]) {
    ctx.beginPath(); ctx.arc(x + dx, base - (dx ? 82 : 90) + Math.abs(dx) * 0.06, 2.2, 0, Math.PI * 2); ctx.fill();
  }

  // โครงเตียง + ขาทอง
  for (const dx of [-C + 16, C - 16]) {
    rr(ctx, x + dx - 5, base - 10, 10, 10, 3);
    fs(ctx, P.gold, 1.4);
  }
  rr(ctx, x - C + 6, base - 40, (C - 6) * 2, 32, 10);
  fs(ctx, P.red, 2.4);
  ctx.strokeStyle = P.gold;
  ctx.lineWidth = 2 * LINE_K;
  ctx.beginPath(); ctx.moveTo(x - C + 14, base - 18); ctx.lineTo(x + C - 14, base - 18); ctx.stroke();
  for (const dx of BED_PILLOWS) paw(ctx, x + dx, base - 27, 4.2, P.gold);

  // ฟูก
  rr(ctx, x - C + 12, base - 56, (C - 12) * 2, 20, 9);
  fs(ctx, P.cream, 2);
  // หมอนสามใบ = ที่นอนสามที่
  const pc = [P.pinkLight, P.cream, P.lilacLight];
  BED_PILLOWS.forEach((dx, i) => {
    rr(ctx, x + dx - 24, base - 72, 48, 20, 9);
    fs(ctx, pc[i], 1.8);
  });
  // ผ้าห่มพับครึ่งฟูกด้านหน้า
  rr(ctx, x - C + 12, base - 48, (C - 12) * 2, 14, 7);
  fs(ctx, P.pink, 1.8);
  rr(ctx, x - C + 12, base - 50, (C - 12) * 2, 5, 2.5);
  fs(ctx, P.pinkLight, 1.4);

  ctx.restore();
}

/** อ่างอาบน้ำขาวขาทอง (ฟองข้างบนวาดสด) */
function tubBody(ctx) {
  const x = L.tub, y = 340;
  ctx.beginPath();
  ctx.moveTo(x - 50, y - 26);
  ctx.quadraticCurveTo(x - 52, y + 4, x - 30, y + 8);
  ctx.lineTo(x + 30, y + 8);
  ctx.quadraticCurveTo(x + 52, y + 4, x + 50, y - 26);
  ctx.closePath();
  fs(ctx, P.porcelain, 2.4);
  ctx.fillStyle = P.porcelainShade;
  ctx.beginPath(); ctx.ellipse(x + 10, y + 2, 34, 4, 0, 0, Math.PI * 2); ctx.fill();
  rr(ctx, x - 54, y - 32, 108, 9, 4);
  fs(ctx, P.porcelain, 2.2);
  // ขาทอง
  for (const dx of [-34, 34]) {
    ctx.beginPath();
    ctx.moveTo(x + dx - 5, y + 6);
    ctx.quadraticCurveTo(x + dx - 8, y + 16, x + dx - 2, y + 18);
    ctx.lineTo(x + dx + 4, y + 18);
    ctx.quadraticCurveTo(x + dx + 6, y + 12, x + dx + 5, y + 6);
    ctx.closePath();
    fs(ctx, P.gold, 1.6);
  }
  // ก๊อกน้ำ
  pen(ctx, 2.4);
  ctx.strokeStyle = P.goldDark;
  ctx.beginPath(); ctx.moveTo(x - 46, y - 32); ctx.lineTo(x - 46, y - 48); ctx.quadraticCurveTo(x - 46, y - 56, x - 36, y - 54); ctx.stroke();
}

/** ขอบหน้าอ่าง — วาดทับตัวน้องที่กำลังอาบน้ำ น้องจึงดูนั่งอยู่ "ใน" อ่าง */
export function drawTubFront(ctx) {
  const x = L.tub, y = 340;
  ctx.beginPath();
  ctx.moveTo(x - 50, y - 26);
  ctx.quadraticCurveTo(x - 52, y + 4, x - 30, y + 8);
  ctx.lineTo(x + 30, y + 8);
  ctx.quadraticCurveTo(x + 52, y + 4, x + 50, y - 26);
  ctx.closePath();
  fs(ctx, P.porcelain, 2.4);
  ctx.fillStyle = P.porcelainShade;
  ctx.beginPath(); ctx.ellipse(x + 10, y + 2, 34, 4, 0, 0, Math.PI * 2); ctx.fill();
  rr(ctx, x - 54, y - 32, 108, 9, 4);
  fs(ctx, P.porcelain, 2.2);
}

function towelStand(ctx) {
  const x = L.towel, y = 352;
  pen(ctx, 3);
  ctx.strokeStyle = P.goldDark;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 92); ctx.moveTo(x - 14, y); ctx.lineTo(x + 14, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 16, y - 88); ctx.lineTo(x + 6, y - 88); ctx.stroke();
  rr(ctx, x - 16, y - 90, 18, 52, 3);
  fs(ctx, P.pinkLight, 1.8);
  paw(ctx, x - 7, y - 52, 4, P.pink);
}

/** หีบของเล่นฝาเปิด */
function toyChest(ctx) {
  const x = L.chest, y = 360;
  // ฝาเปิดพิงอยู่ข้างหลัง
  ctx.beginPath();
  ctx.moveTo(x - 40, y - 44);
  ctx.lineTo(x - 36, y - 78);
  ctx.quadraticCurveTo(x, y - 90, x + 36, y - 78);
  ctx.lineTo(x + 40, y - 44);
  ctx.closePath();
  fs(ctx, P.woodDark, 2);
  // ของในหีบ
  for (const [dx, dy, c] of [[-20, -46, '#7FB6E8'], [0, -50, '#F3A3BF'], [20, -46, '#F6C063']]) {
    ctx.beginPath(); ctx.arc(x + dx, y + dy, 11, 0, Math.PI * 2);
    fs(ctx, c, 1.8);
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.4 * LINE_K;
    ctx.beginPath(); ctx.arc(x + dx, y + dy, 6, 0.4, 2.6); ctx.stroke();
  }
  // ไม้ตกแมวโผล่
  pen(ctx, 2);
  ctx.beginPath(); ctx.moveTo(x + 26, y - 40); ctx.lineTo(x + 46, y - 84); ctx.stroke();
  ctx.fillStyle = '#9B7BF0';
  ctx.beginPath(); ctx.ellipse(x + 48, y - 90, 4, 10, 0.4, 0, Math.PI * 2); ctx.fill();
  // ตัวหีบ
  rr(ctx, x - 42, y - 44, 84, 44, 5);
  fs(ctx, P.wood, 2.4);
  ctx.fillStyle = P.gold;
  ctx.fillRect(x - 42, y - 30, 84, 6);
  ctx.fillRect(x - 6, y - 44, 12, 44);
  pen(ctx, 1.6);
  ctx.strokeRect(x - 42, y - 30, 84, 6);
  ctx.strokeRect(x - 6, y - 44, 12, 44);
}

/** โต๊ะแต่งตัว กระจกกลมกรอบทอง กับเก้าอี้เล็ก */
function vanity(ctx) {
  const x = L.vanity, y = 362;
  // กระจก
  ctx.beginPath(); ctx.ellipse(x, y - 132, 30, 38, 0, 0, Math.PI * 2);
  fs(ctx, P.gold, 2.4);
  ctx.beginPath(); ctx.ellipse(x, y - 132, 23, 31, 0, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(x - 20, y - 160, x + 20, y - 104);
  g.addColorStop(0, '#E6F4FB'); g.addColorStop(1, '#B9D7EA');
  ctx.fillStyle = g; ctx.fill(); pen(ctx, 1.6); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3 * LINE_K;
  ctx.beginPath(); ctx.moveTo(x - 10, y - 150); ctx.lineTo(x + 2, y - 158); ctx.stroke();
  crown(ctx, x, y - 168, 18, 12);
  // โต๊ะ
  rr(ctx, x - 50, y - 92, 100, 12, 3);
  fs(ctx, P.woodLight, 2.2);
  rr(ctx, x - 44, y - 80, 88, 26, 3);
  fs(ctx, P.wood, 2);
  ctx.fillStyle = P.gold;
  ctx.beginPath(); ctx.arc(x, y - 67, 3, 0, Math.PI * 2); ctx.fill();
  pen(ctx, 3);
  ctx.strokeStyle = P.woodDark;
  for (const dx of [-40, 40]) { ctx.beginPath(); ctx.moveTo(x + dx, y - 54); ctx.lineTo(x + dx, y); ctx.stroke(); }
  // แจกันดอกไม้
  rr(ctx, x - 40, y - 108, 14, 16, 4); fs(ctx, P.lilacLight, 1.6);
  ctx.fillStyle = P.pink;
  ctx.beginPath(); ctx.arc(x - 36, y - 114, 5, 0, Math.PI * 2); ctx.arc(x - 28, y - 118, 4, 0, Math.PI * 2); ctx.fill();
  // เก้าอี้กลม
  rr(ctx, x - 22, y - 30, 44, 10, 5);
  fs(ctx, P.red, 2);
  pen(ctx, 2.6); ctx.strokeStyle = P.woodDark;
  ctx.beginPath(); ctx.moveTo(x - 14, y - 20); ctx.lineTo(x - 16, y); ctx.moveTo(x + 14, y - 20); ctx.lineTo(x + 16, y); ctx.stroke();
}

/** ตู้เสื้อผ้าเล็กมีโบว์ห้อย */
function wardrobe(ctx) {
  const x = L.wardrobe, y = 362, w = 72, h = 150;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w / 2, y - h);
  ctx.quadraticCurveTo(x, y - h - 22, x + w / 2, y - h);
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
  fs(ctx, P.wood, 2.4);
  crown(ctx, x, y - h - 10, 18, 12);
  for (const side of [-1, 1]) {
    rr(ctx, x + (side < 0 ? -w / 2 + 6 : 2), y - h + 8, w / 2 - 8, h - 22, 4);
    fs(ctx, P.woodLight, 1.6);
  }
  // โบว์สามสี
  const bows = [[-16, -112, P.pink], [16, -112, '#9AC7F0'], [-16, -78, P.lilac], [16, -78, P.pink], [0, -44, '#F6C063']];
  for (const [dx, dy, c] of bows) {
    const bx = x + dx, by = y + dy;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(bx, by); ctx.lineTo(bx - 9, by - 6); ctx.lineTo(bx - 9, by + 6); ctx.closePath();
    ctx.moveTo(bx, by); ctx.lineTo(bx + 9, by - 6); ctx.lineTo(bx + 9, by + 6); ctx.closePath();
    ctx.fill(); pen(ctx, 1.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, by, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = P.wood;
  ctx.fillRect(x - w / 2 - 2, y - 6, w + 4, 6);
}

/**
 * คอนโดแมว — กว้างขึ้น เสาพันเชือกสามต้น แท่นสามระดับ บ้านกล่อง และเปลผ้าผืนใหญ่
 *   แท่นล่าง (treeLow) → หลังคาบ้าน (treeMid) / แท่นบนสุด (treeTop) → ชั้นบนผนัง
 * ลูกบอลห้อยวาดสด (แกว่งเมื่อถูกตะปบ ดู TREE_BALL) จึงไม่อยู่ในภาพนิ่งนี้
 * เปลวาดสองชั้น: ตัวเปลอยู่ที่นี่ / ขอบผ้าด้านหน้าวาดทับตัวน้องที่นอนอยู่ (drawHammockFront)
 */
// ห้อยจาก "ใต้" แท่นบนสุด (ขอบล่างแท่นอยู่ที่ 130) เชือกจึงไม่พาดทับหน้าไม้
export const TREE_BALL = { x: L.tree - 44, y: 131, len: 36 };

function catTree(ctx) {
  const x = L.tree, base = 366;
  const post = (px, top, bottom) => {
    rr(ctx, px - 9, top, 18, bottom - top, 4);
    fs(ctx, '#E2C69A', 2);
    ctx.strokeStyle = '#C6A675'; ctx.lineWidth = 1.2 * LINE_K;
    for (let y = top + 6; y < bottom - 3; y += 6) {
      ctx.beginPath(); ctx.moveTo(px - 8, y); ctx.lineTo(px + 8, y + 2); ctx.stroke();
    }
  };
  // แท่นไม้ + เบาะขนนุ่มวางอยู่บนแท่น — กึ่งกลางเดียวกัน เบาะแคบกว่าแท่นข้างละ 4 หน่วยเท่ากัน
  // (เดิมเบาะจมลงไปในขอบแท่นครึ่งหนึ่ง เส้นขอบสองชั้นซ้อนกันจนดูเบี้ยว)
  const pad = (px, py, w) => {
    rr(ctx, px - w / 2, py, w, 12, 5);
    fs(ctx, '#D9B784', 2);
    rr(ctx, px - w / 2 + 4, py - 7, w - 8, 9, 4.5);
    fs(ctx, '#F0DDB8', 1.8);
  };
  // ฐานกว้าง
  rr(ctx, x - 100, base - 12, 200, 16, 6);
  fs(ctx, '#D9B784', 2.2);
  post(x - 62, 256, base - 12);
  post(x + 52, 192, base - 12);
  post(x - 20, 124, 256);

  // เปลผ้า — แขวนระหว่างเสาสองต้น ผืนกว้างพอให้น้องนอนขดได้ทั้งตัว
  ctx.strokeStyle = P.woodDark;
  ctx.lineWidth = 2 * LINE_K;
  ctx.beginPath(); ctx.moveTo(x - 54, 286); ctx.lineTo(x - 48, 300); ctx.moveTo(x + 44, 286); ctx.lineTo(x + 38, 300); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 50, 298);
  ctx.quadraticCurveTo(x - 5, 352, x + 40, 298);
  ctx.quadraticCurveTo(x - 5, 318, x - 50, 298);
  ctx.closePath();
  fs(ctx, '#E9A0BA', 1.8);
  ctx.beginPath();
  ctx.moveTo(x - 50, 298);
  ctx.quadraticCurveTo(x - 5, 340, x + 40, 298);
  ctx.strokeStyle = '#F7C9D8'; ctx.lineWidth = 2 * LINE_K; ctx.stroke();

  // แท่นล่างยื่นไปรองโคนเสากลาง (x-20) ทั้งต้น — เดิมแท่นสั้น เสาโผล่เลยขอบแท่นครึ่งต้น ดูเหมือนแท่นจะหัก
  pad(x - 56, 252, 100);
  pad(x - 20, 118, 66);
  // บ้านกล่องบนแท่นกลาง — รูใหญ่พอให้น้องเข้าไปนอนโผล่หน้า (ดู TREE_HOLE / drawHoleFront)
  pad(x + 52, 188, 80);
  rr(ctx, x + 18, 130, 68, 58, 7);
  fs(ctx, '#E2C69A', 2.2);
  ctx.fillStyle = '#6E4E30';
  ctx.beginPath();
  ctx.ellipse(TREE_HOLE.x, TREE_HOLE.y, TREE_HOLE.rx, TREE_HOLE.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  pen(ctx, 1.4); ctx.stroke();
  // ป้ายรอยเท้าเหนือรู
  paw(ctx, x + 52, 138, 3.6, '#C6A675');
}

/** รูบ้านบนคอนโด — น้องที่อยู่ในบ้านวาดตัดตามรูนี้ เห็นแค่หน้าโผล่ออกมา */
export const TREE_HOLE = { x: L.tree + 52, y: 164, rx: 21, ry: 22 };

/** ขอบรูบ้านวาดทับหน้าน้องที่อยู่ในบ้าน ขอบไม้จึงอยู่หน้าหน้าน้อง ไม่ใช่หน้าแปะบนรู */
export function drawHoleFront(ctx) {
  const { x, y, rx, ry } = TREE_HOLE;
  ctx.save();
  ctx.lineWidth = 4 * LINE_K;
  ctx.strokeStyle = '#E2C69A';
  ctx.beginPath(); ctx.ellipse(x, y, rx + 1, ry + 1, 0, 0, Math.PI * 2); ctx.stroke();
  pen(ctx, 1.6);
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/**
 * ขอบผ้าด้านหน้าของเปล — วาดทับน้องที่นอนอยู่ในเปล ตัวน้องจึงจมลงไปในผ้า ไม่ลอยอยู่เหนือเปล
 */
export function drawHammockFront(ctx) {
  const x = L.tree;
  ctx.beginPath();
  ctx.moveTo(x - 48, 304);
  ctx.quadraticCurveTo(x - 5, 356, x + 38, 304);
  ctx.quadraticCurveTo(x - 5, 336, x - 48, 304);
  ctx.closePath();
  fs(ctx, '#E9A0BA', 1.8);
  ctx.beginPath();
  ctx.moveTo(x - 44, 308);
  ctx.quadraticCurveTo(x - 5, 344, x + 34, 308);
  ctx.strokeStyle = '#F7C9D8'; ctx.lineWidth = 2 * LINE_K; ctx.stroke();
}

/** ลูกบอลห้อยบนคอนโด — ang = มุมแกว่ง (เรเดียน) มาจากตัวควบคุมห้อง */
export function drawTreeBall(ctx, ang) {
  const { x, y, len } = TREE_BALL;
  const bx = x + Math.sin(ang) * len;
  const by = y + Math.cos(ang) * len;
  ctx.strokeStyle = P.line;
  ctx.lineWidth = 1.4 * LINE_K;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(bx, by); ctx.stroke();
  ctx.beginPath(); ctx.arc(bx, by + 5, 6.5, 0, Math.PI * 2);
  fs(ctx, '#E5795E', 1.6);
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.2 * LINE_K;
  ctx.beginPath(); ctx.arc(bx, by + 5, 3.5, 0.4, 2.4); ctx.stroke();
}

/**
 * กล่องกระดาษต้อนรับ — กล่องเปิดฝา มองเฉียงจากด้านหน้านิด ๆ
 * แบ่งสองชั้นเพื่อให้น้องที่รออยู่นั่ง "ใน" กล่อง:
 *   หลัง  ฝาหลังตั้งชัน + ปากกล่อง (เห็นด้านในเข้ม) + ผ้าห่มที่ขอบใน
 *   หน้า  ผนังกล่องด้านหน้า + ฝาข้างกางออกสองข้าง + ฝาหน้าพับห้อย + ป้ายหัวใจ (drawBoxFront)
 */
const BOX = { w: 92, h: 40, lip: 12 };

function welcomeBoxBack(ctx) {
  const { x, y } = SPOTS.box;
  const hw = BOX.w / 2;
  const top = y - BOX.h;           // ขอบบนผนังหน้า
  const back = top - BOX.lip;      // ขอบบนผนังหลัง (สูงกว่าเพราะมองเฉียงลงมา)
  // ฝาหลังตั้งชัน เอียงไปข้างหลังนิดหนึ่ง
  ctx.beginPath();
  ctx.moveTo(x - hw + 6, back);
  ctx.lineTo(x - hw + 12, back - 30);
  ctx.lineTo(x + hw - 12, back - 30);
  ctx.lineTo(x + hw - 6, back);
  ctx.closePath();
  fs(ctx, P.cardLight, 2);
  ctx.strokeStyle = P.cardDark; ctx.lineWidth = 1.2 * LINE_K;
  ctx.beginPath(); ctx.moveTo(x - hw + 14, back - 8); ctx.lineTo(x + hw - 14, back - 8); ctx.stroke();
  // ปากกล่อง (ด้านในเข้ม) — ทรงสี่เหลี่ยมคางหมู ขอบหลังแคบกว่าขอบหน้า
  ctx.beginPath();
  ctx.moveTo(x - hw, top);
  ctx.lineTo(x - hw + 6, back);
  ctx.lineTo(x + hw - 6, back);
  ctx.lineTo(x + hw, top);
  ctx.closePath();
  fs(ctx, '#8C6136', 2);
  // ผ้าห่มชมพูพาดขอบในด้านหลัง
  ctx.beginPath();
  ctx.moveTo(x - hw + 8, back + 2);
  ctx.quadraticCurveTo(x - 16, back - 6, x, back + 3);
  ctx.quadraticCurveTo(x + 18, back - 5, x + hw - 8, back + 2);
  ctx.lineTo(x + hw - 4, top);
  ctx.lineTo(x - hw + 4, top);
  ctx.closePath();
  fs(ctx, P.pinkLight, 1.4);
}

/** ด้านหน้าของกล่องต้อนรับ — วาดทับน้องที่นั่งรออยู่ในกล่อง */
export function drawBoxFront(ctx) {
  const { x, y } = SPOTS.box;
  const hw = BOX.w / 2;
  const top = y - BOX.h;
  // ฝาข้างกางออกสองข้าง
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * hw, top);
    ctx.lineTo(x + side * (hw + 18), top - 16);
    ctx.lineTo(x + side * (hw + 14), top - 26);
    ctx.lineTo(x + side * (hw - 4), top - BOX.lip);
    ctx.closePath();
    fs(ctx, P.cardLight, 1.8);
  }
  // ผนังหน้า
  rr(ctx, x - hw, top, BOX.w, BOX.h, 3);
  fs(ctx, P.card, 2.4);
  // ฝาหน้าพับลงมาห้อยทับผนัง
  ctx.beginPath();
  ctx.moveTo(x - hw + 2, top);
  ctx.lineTo(x + hw - 2, top);
  ctx.lineTo(x + hw - 6, top + 13);
  ctx.lineTo(x - hw + 6, top + 13);
  ctx.closePath();
  fs(ctx, P.cardLight, 1.8);
  // เทปกาวกลางกล่อง
  ctx.fillStyle = 'rgba(255,240,205,.7)';
  ctx.fillRect(x - 7, top + 13, 14, BOX.h - 15);
  // ป้ายหัวใจ "ยินดีต้อนรับ" ห้อยหน้ากล่อง
  ctx.save();
  ctx.translate(x - 22, top + 26);
  ctx.beginPath();
  ctx.moveTo(0, 7);
  ctx.bezierCurveTo(-9, 1, -7, -7, 0, -3);
  ctx.bezierCurveTo(7, -7, 9, 1, 0, 7);
  ctx.closePath();
  fs(ctx, '#FF8FB8', 1.6);
  ctx.restore();
  paw(ctx, x + 24, top + 26, 5.5, P.cardDark);
}

function plant(ctx, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-18, -34); ctx.lineTo(18, -34); ctx.lineTo(13, 0); ctx.lineTo(-13, 0); ctx.closePath();
  fs(ctx, P.pot, 2);
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.28;
    const len = 40 + (i % 3) * 14;
    ctx.save();
    ctx.translate(0, -36);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(0, -len / 2, 7, len / 2, 0, 0, Math.PI * 2);
    fs(ctx, i % 2 ? P.leaf : P.leafDark, 1.4);
    ctx.restore();
  }
  ctx.restore();
}

function door(ctx) {
  const x = L.door, y = 292, w = 96, h = 196;
  // ซุ้มหิน
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 14, y);
  ctx.lineTo(x - w / 2 - 14, y - h + w / 2);
  ctx.arc(x, y - h + w / 2, w / 2 + 14, Math.PI, 0);
  ctx.lineTo(x + w / 2 + 14, y);
  ctx.closePath();
  fs(ctx, '#DCC6A2', 2.2);
  // บานประตู
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w / 2, y - h + w / 2);
  ctx.arc(x, y - h + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
  fs(ctx, P.wood, 2.4);
  ctx.strokeStyle = P.woodDark; ctx.lineWidth = 1.6 * LINE_K;
  for (let dx = -32; dx <= 32; dx += 16) {
    ctx.beginPath(); ctx.moveTo(x + dx, y - 4); ctx.lineTo(x + dx, y - h + 44 + Math.abs(dx) * 0.3); ctx.stroke();
  }
  ctx.fillStyle = P.goldDark;
  ctx.fillRect(x - w / 2, y - 150, w, 8);
  ctx.fillRect(x - w / 2, y - 50, w, 8);
  ctx.beginPath(); ctx.arc(x + 28, y - 96, 9, 0, Math.PI * 2);
  ctx.strokeStyle = P.goldDark; ctx.lineWidth = 3 * LINE_K; ctx.stroke();
}

function doorMat(ctx) {
  ctx.beginPath();
  ctx.ellipse(L.door, 396, 56, 12, 0, 0, Math.PI * 2);
  fs(ctx, P.red, 2);
  ctx.strokeStyle = P.gold; ctx.lineWidth = 1.6 * LINE_K;
  ctx.beginPath(); ctx.ellipse(L.door, 396, 46, 8, 0, 0, Math.PI * 2); ctx.stroke();
}

// ─────────────────────────────────────────────────────────────
// ภาพแคชของชั้นหลัง
// ─────────────────────────────────────────────────────────────

let cache = null;   // { canvas, scale }

/** วาดชั้นหลังทั้งห้องลงผ้าใบ (เรียกครั้งเดียวต่อความละเอียด) */
function paintBack(ctx) {
  wall(ctx);
  memoryWall(ctx);
  banner(ctx, 125, 34, 0.95);
  banner(ctx, 1000, 34, 0.9);
  banner(ctx, 1380, 34, 0.9);
  banner(ctx, 2250, 34, 0.95);
  for (const l of LANTERNS) lanternBody(ctx, l.x, l.y);
  smallShelf(ctx, 1000, 186);
  mentorPortrait(ctx, L.portrait, 112);
  wallBedShelf(ctx, L.shelves - 10, 142, 78);
  wallBedShelf(ctx, L.shelves + 30, 218, 78);
  // เจาะช่องกระจกให้โปร่ง ฟ้าที่วาดสดข้างใต้จะได้ลอดขึ้นมา (ภาพแคชทึบทั้งผืน)
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  windowArch(ctx, 0);
  ctx.fill();
  ctx.restore();
  windowFrame(ctx);
  beams(ctx);

  floor(ctx);
  zoneRugs(ctx);
  feedingMat(ctx);
  longRug(ctx);
  foodCabinet(ctx);
  canopyBed(ctx);
  tubBody(ctx);
  towelStand(ctx);
  toyChest(ctx);
  vanity(ctx);
  wardrobe(ctx);
  windowSeat(ctx);
  catTree(ctx);
  door(ctx);
  doorMat(ctx);
  plant(ctx, L.plant, 352, 1.1);
  welcomeBoxBack(ctx);
  SPOTS.bowls.forEach((b) => bowl(ctx, b.x, b.y));
  bowl(ctx, SPOTS.water.x, SPOTS.water.y, true);
}

function backLayer(scale) {
  const s = Math.max(1, Math.min(2, scale));
  if (cache && cache.scale === s) return cache.canvas;
  const c = document.createElement('canvas');
  c.width = Math.ceil(CATROOM_W * s);
  c.height = Math.ceil(H * s);
  const g = c.getContext('2d');
  g.scale(s, s);
  paintBack(g);
  cache = { canvas: c, scale: s };
  return c;
}

// ─────────────────────────────────────────────────────────────
// ของสด
// ─────────────────────────────────────────────────────────────

/** ฟ้านอกหน้าต่าง — ปราสาทไกล ๆ เมฆลอย / พระจันทร์กับดาว */
function windowSky(ctx, t, night) {
  ctx.save();
  windowArch(ctx, 0);
  ctx.clip();
  const g = ctx.createLinearGradient(0, WIN.top, 0, WIN.bottom);
  if (night) { g.addColorStop(0, '#1C1546'); g.addColorStop(1, '#45337F'); }
  else { g.addColorStop(0, '#7DBEF0'); g.addColorStop(1, '#D4ECFB'); }
  ctx.fillStyle = g;
  ctx.fillRect(WIN.x - 80, WIN.top, 160, WIN.bottom - WIN.top);

  if (night) {
    for (let i = 0; i < 14; i++) {
      const sx = WIN.x - 70 + hash(i) * 140;
      const sy = WIN.top + 10 + hash(i + 40) * 120;
      ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(t * 0.03 + i));
      ctx.fillStyle = '#FFF6D8';
      ctx.beginPath(); ctx.arc(sx, sy, 1.4 + hash(i + 7), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFF2C4';
    ctx.beginPath(); ctx.arc(WIN.x - 26, WIN.top + 58, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2A2060';
    ctx.beginPath(); ctx.arc(WIN.x - 19, WIN.top + 53, 14, 0, Math.PI * 2); ctx.fill();
  } else {
    // เมฆสองก้อนลอยช้า ๆ
    for (let i = 0; i < 2; i++) {
      const cx = WIN.x - 90 + ((t * 0.12 + i * 110) % 200);
      const cy = WIN.top + 46 + i * 34;
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.arc(cx + 14, cy - 6, 14, 0, Math.PI * 2);
      ctx.arc(cx + 30, cy, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ทิวไม้กับปราสาทไกล ๆ
  const tower = night ? '#3D3470' : '#E6A9C8';
  const roof = night ? '#2B2458' : '#B66CA6';
  for (const [dx, h, w] of [[-26, 70, 18], [0, 100, 22], [26, 64, 18]]) {
    const bx = WIN.x + dx;
    ctx.fillStyle = tower;
    ctx.fillRect(bx - w / 2, WIN.bottom - 30 - h, w, h);
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(bx - w / 2 - 4, WIN.bottom - 30 - h);
    ctx.lineTo(bx, WIN.bottom - 60 - h);
    ctx.lineTo(bx + w / 2 + 4, WIN.bottom - 30 - h);
    ctx.fill();
    if (night) {
      ctx.fillStyle = '#FFD98A';
      ctx.fillRect(bx - 3, WIN.bottom - 10 - h * 0.6, 6, 8);
    }
  }
  ctx.fillStyle = tower;
  ctx.fillRect(WIN.x - 40, WIN.bottom - 60, 80, 60);
  // ── ทิวไม้ "หน้า" ปราสาท ── เดิมวาดไม้ก่อนปราสาท ปราสาทจึงลอยทับยอดพุ่มไม้
  // วาดทีหลังแล้วให้พุ่มสูงขึ้นมาคลุมฐานปราสาท ปราสาทจึงตั้งอยู่หลังแนวต้นไม้จริง ๆ
  ctx.fillStyle = night ? '#1E2A50' : '#7DBB74';
  ctx.beginPath();
  ctx.moveTo(WIN.x - 80, WIN.bottom);
  for (let i = 0; i <= 7; i++) ctx.arc(WIN.x - 74 + i * 21, WIN.bottom - 44, 15, Math.PI, 0);
  ctx.lineTo(WIN.x + 80, WIN.bottom);
  ctx.fill();
  ctx.fillStyle = night ? '#24305A' : '#8CC481';
  ctx.beginPath();
  ctx.moveTo(WIN.x - 80, WIN.bottom);
  for (let i = 0; i <= 8; i++) ctx.arc(WIN.x - 80 + i * 20, WIN.bottom - 30, 14, Math.PI, 0);
  ctx.lineTo(WIN.x + 80, WIN.bottom);
  ctx.fill();
  ctx.restore();

  // กรอบกระจกแบ่งช่อง
  pen(ctx, 3);
  ctx.strokeStyle = P.woodLight;
  ctx.beginPath();
  ctx.moveTo(WIN.x, WIN.top + 4); ctx.lineTo(WIN.x, WIN.bottom);
  ctx.moveTo(WIN.x - 75, WIN.top + 130); ctx.lineTo(WIN.x + 75, WIN.top + 130);
  ctx.stroke();
}

/** ม่านหน้าต่างพลิ้วเบา ๆ ผูกโบว์แดง */
function windowCurtains(ctx, t) {
  for (const side of [-1, 1]) {
    const sway = Math.sin(t * 0.02 + side) * 3;
    const x0 = WIN.x + side * (WIN.w / 2 + 18);
    ctx.beginPath();
    ctx.moveTo(x0 - side * 30, WIN.top - 8);
    ctx.lineTo(x0 + side * 14, WIN.top - 8);
    ctx.quadraticCurveTo(x0 + side * 12 + sway, 200, x0 + side * 8 + sway, 296);
    ctx.lineTo(x0 - side * 16 + sway, 296);
    ctx.quadraticCurveTo(x0 - side * 6, 170, x0 - side * 4, 150);
    ctx.quadraticCurveTo(x0 - side * 26, 100, x0 - side * 30, WIN.top - 8);
    ctx.closePath();
    fs(ctx, P.cream, 2);
    ctx.strokeStyle = '#EAD9BA'; ctx.lineWidth = 1.4 * LINE_K;
    ctx.beginPath(); ctx.moveTo(x0, WIN.top); ctx.quadraticCurveTo(x0 + sway, 220, x0 - side * 2 + sway, 294); ctx.stroke();
    // โบว์
    const bx = x0 - side * 6, by = 152;
    ctx.fillStyle = P.red;
    ctx.beginPath();
    ctx.moveTo(bx, by); ctx.lineTo(bx - 11, by - 8); ctx.lineTo(bx - 11, by + 8); ctx.closePath();
    ctx.moveTo(bx, by); ctx.lineTo(bx + 11, by - 8); ctx.lineTo(bx + 11, by + 8); ctx.closePath();
    ctx.fill(); pen(ctx, 1.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  // ราวม่าน
  pen(ctx, 3); ctx.strokeStyle = P.goldDark;
  ctx.beginPath(); ctx.moveTo(WIN.x - 120, WIN.top - 10); ctx.lineTo(WIN.x + 120, WIN.top - 10); ctx.stroke();
  ctx.fillStyle = P.gold;
  for (const dx of [-122, 122]) { ctx.beginPath(); ctx.arc(WIN.x + dx, WIN.top - 10, 5, 0, Math.PI * 2); ctx.fill(); }
}

/** แสงแดดลอดหน้าต่างลงพื้น + ฝุ่นลอย (กลางวัน) / แสงจันทร์ (กลางคืน) */
function windowLight(ctx, t, night) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const c = night ? 'rgba(150,170,255,' : 'rgba(255,232,170,';
  const g = ctx.createLinearGradient(0, WIN.bottom, 0, H);
  g.addColorStop(0, c + (night ? '.10)' : '.20)'));
  g.addColorStop(1, c + '0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(WIN.x - 70, WIN.bottom);
  ctx.lineTo(WIN.x + 70, WIN.bottom);
  ctx.lineTo(WIN.x + 190, H);
  ctx.lineTo(WIN.x - 10, H);
  ctx.closePath();
  ctx.fill();
  if (!night) {
    ctx.fillStyle = 'rgba(255,240,200,.55)';
    for (let i = 0; i < 12; i++) {
      const ph = (t * 0.004 + hash(i)) % 1;
      const x = WIN.x - 30 + hash(i + 3) * 160 + ph * 40;
      const y = WIN.bottom + 10 + ((hash(i + 9) * 150 + t * 0.15) % 150);
      ctx.beginPath(); ctx.arc(x, y, 1.2 + hash(i + 2), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

/** เปลวไฟในโคม + แสงรอบโคม (กลางคืนเรืองแรงกว่า) */
function lanternLights(ctx, t, night) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  LANTERNS.forEach((l, i) => {
    const flick = 1 + Math.sin(t * 0.21 + i * 2.1) * 0.06 + Math.sin(t * 0.53 + i) * 0.04;
    const r = (night ? 120 : 60) * flick;
    const g = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, r);
    g.addColorStop(0, night ? 'rgba(255,200,120,.55)' : 'rgba(255,214,150,.30)');
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(l.x - r, l.y - r, r * 2, r * 2);
  });
  ctx.restore();
  LANTERNS.forEach((l, i) => {
    const h = 8 + Math.sin(t * 0.3 + i * 1.7) * 1.4;
    ctx.fillStyle = '#FFB547';
    ctx.beginPath();
    ctx.moveTo(l.x, l.y - h);
    ctx.quadraticCurveTo(l.x + 5, l.y + 2, l.x, l.y + 4);
    ctx.quadraticCurveTo(l.x - 5, l.y + 2, l.x, l.y - h);
    ctx.fill();
    ctx.fillStyle = '#FFF2C0';
    ctx.beginPath(); ctx.ellipse(l.x, l.y, 1.8, 3, 0, 0, Math.PI * 2); ctx.fill();
  });
}

/** ฟองสบู่ในอ่าง — ลอยขึ้นแตกเป็นระยะ ยิ่งมีน้องอาบน้ำอยู่ยิ่งฟองเยอะ */
function tubBubbles(ctx, t, busy) {
  const x = L.tub, y = 310;
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  for (let i = 0; i < 9; i++) {
    ctx.beginPath(); ctx.arc(x - 40 + i * 10, y + Math.sin(i * 1.3) * 3, 7 + (i % 3) * 2, 0, Math.PI * 2); ctx.fill();
  }
  const n = busy ? 8 : 3;
  for (let i = 0; i < n; i++) {
    const ph = ((t * (busy ? 0.012 : 0.006)) + hash(i)) % 1;
    const bx = x - 34 + hash(i + 5) * 68 + Math.sin(t * 0.05 + i) * 4;
    const by = y - 6 - ph * 60;
    ctx.globalAlpha = 1 - ph;
    ctx.strokeStyle = 'rgba(160,200,235,.9)';
    ctx.lineWidth = 1.4 * LINE_K;
    ctx.beginPath(); ctx.arc(bx, by, 3 + hash(i + 1) * 4, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** อาหารในชาม — fill 0-1 ต่อชาม (ตัวควบคุมลดลงตามที่น้องกิน) */
function bowlFood(ctx, fills, kinds) {
  SPOTS.bowls.forEach((b, i) => {
    const f = fills[i] || 0;
    if (f <= 0.02) return;
    const kind = kinds[i] || 'kibble';
    const c = kind === 'salmon' ? '#F49A7C' : kind === 'fish' ? '#C9D3DE' : '#B5763C';
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y - 5 - f * 3, 18 * (0.5 + f * 0.5), 4 + f * 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (let k = 0; k < 4 * f; k++) {
      ctx.beginPath(); ctx.arc(b.x - 8 + k * 5, b.y - 7 - f * 3, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  });
}

/**
 * ชามหนึ่งใบพร้อมอาหาร วาดทับตัวน้องที่กำลังกิน
 * น้องยืนหลังชาม ถ้าไม่วาดชามซ้ำทับ ตัวน้องจะบังชามจนไม่เห็นว่ากินอะไรอยู่
 */
export function drawBowlFront(ctx, i, fill, kind) {
  const b = SPOTS.bowls[i];
  if (!b) return;
  bowl(ctx, b.x, b.y);
  const fills = [];
  const kinds = [];
  fills[i] = fill;
  kinds[i] = kind;
  bowlFood(ctx, fills, kinds);
}

/** ชามน้ำ — วาดทับตัวน้องที่กำลังดื่ม (ripple 0-1 = วงน้ำกระเพื่อมตอนลิ้นแตะน้ำ) */
export function drawWaterFront(ctx, ripple = 0) {
  const { x, y } = SPOTS.water;
  bowl(ctx, x, y, true);
  if (ripple > 0) {
    ctx.save();
    ctx.globalAlpha = 1 - ripple;
    ctx.strokeStyle = '#E9F7FF';
    ctx.lineWidth = 1.6 * LINE_K;
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 4 + ripple * 15, 1.4 + ripple * 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * วาดห้องทั้งหมดยกเว้นตัวน้องและของชั้นหน้า
 * @param cam   ตำแหน่งกล้อง (ขอบซ้ายของจอในพิกัดห้อง)
 * @param scale สเกลจริงของผ้าใบ ใช้สร้างภาพแคชให้คมเท่าจอ
 * @param live  { fills, kinds, bathing } สถานะของสดจากตัวควบคุม
 */
export function drawCatRoomBack(ctx, cam, t, night, scale, live = {}) {
  ctx.save();
  ctx.translate(-cam, 0);
  windowSky(ctx, t, night);
  ctx.restore();

  const img = backLayer(scale);
  const s = img.width / CATROOM_W;
  ctx.drawImage(img, cam * s, 0, VIEW.W * s, H * s, 0, 0, VIEW.W, H);

  ctx.save();
  ctx.translate(-cam, 0);
  windowCurtains(ctx, t);
  bowlFood(ctx, live.fills || [], live.kinds || []);
  tubBubbles(ctx, t, live.bathing);
  // ── แสงวาดก่อนตัวน้อง ──
  // แสงพวกนี้ผสมแบบ "เพิ่มความสว่าง" ถ้าวาดทับตัวน้อง ตัวที่นั่งในลำแสงจะซีดจนดูโปร่ง
  // เห็นสีผนังทะลุหัว (เจอจริงที่ม้านั่งริมหน้าต่าง) — วาดไว้ข้างหลังแทน แสงตกบนห้อง ไม่ทาบตัวน้อง
  windowLight(ctx, t, night);
  if (!night) lanternLights(ctx, t, night);
  ctx.restore();
}

/** ความมืดของกลางคืน + โคมเรืองตอนกลางคืน + ขอบมืดรอบภาพ (วาดหลังตัวน้อง) */
export function drawCatRoomLight(ctx, cam, t, night) {
  if (night) {
    ctx.fillStyle = 'rgba(22,14,58,.40)';
    ctx.fillRect(0, 0, VIEW.W, H);
  }
  // กลางคืน: โคมต้องเรืองทับความมืด จึงวาดหลังความมืด (กลางวันวาดไปแล้วข้างหลังตัวน้อง)
  if (night) {
    ctx.save();
    ctx.translate(-cam, 0);
    lanternLights(ctx, t, night);
    ctx.restore();
  }

  // ขอบมืดรอบภาพ ดันสายตาเข้ากลางจอ
  const edge = ctx.createRadialGradient(VIEW.W / 2, H * 0.5, H * 0.4, VIEW.W / 2, H * 0.5, H * 1.15);
  edge.addColorStop(0, 'rgba(58,34,20,0)');
  edge.addColorStop(1, night ? 'rgba(20,10,40,.5)' : 'rgba(58,34,20,.32)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, VIEW.W, H);
}

/** อัตราเลื่อนของชั้นหน้า — เร็วกว่ากล้อง ของจึงดูอยู่ใกล้ตากว่าตัวห้อง */
export const FRONT_PARALLAX = 1.25;

/** ชั้นหน้า: ม่านแดงกับต้นไม้ใหญ่ที่สองปลายห้อง */
export function drawCatRoomFront(ctx, cam, t) {
  const off = cam * FRONT_PARALLAX;
  const right = (CATROOM_W - VIEW.W) * FRONT_PARALLAX + VIEW.W;
  ctx.save();
  ctx.translate(-off, 0);

  // ม่านซ้าย
  const sway = Math.sin(t * 0.018) * 4;
  ctx.beginPath();
  ctx.moveTo(-10, -10);
  ctx.lineTo(70, -10);
  ctx.quadraticCurveTo(30 + sway, 120, 46 + sway, 200);
  ctx.quadraticCurveTo(60 + sway, 300, 30, H + 10);
  ctx.lineTo(-10, H + 10);
  ctx.closePath();
  fs(ctx, P.redDark, 3);
  ctx.strokeStyle = P.red; ctx.lineWidth = 6 * LINE_K;
  ctx.beginPath(); ctx.moveTo(20, 0); ctx.quadraticCurveTo(10 + sway, 200, 16, H); ctx.stroke();
  // ต้นไม้ชิดขอบ ไม่ยื่นมาบังที่ให้อาหาร (ชามอยู่ที่ x 100-300)
  plant(ctx, 6, H + 30, 1.25);

  // ม่านขวา + ต้นไม้
  ctx.beginPath();
  ctx.moveTo(right + 10, -10);
  ctx.lineTo(right - 70, -10);
  ctx.quadraticCurveTo(right - 30 - sway, 120, right - 46 - sway, 200);
  ctx.quadraticCurveTo(right - 60 - sway, 300, right - 30, H + 10);
  ctx.lineTo(right + 10, H + 10);
  ctx.closePath();
  fs(ctx, P.redDark, 3);
  plant(ctx, right - 54, H + 24, 1.5);
  ctx.restore();
}

/** ล้างภาพแคช (เช่นตอนเปลี่ยนระดับกราฟิก) */
export function resetCatRoomCache() {
  cache = null;
}
