/**
 * แมวจิบิวัยเด็ก — วาดตามชีทของผู้ใช้ (ref/chibi-sheet.jpg · 12 พ.ย. 2026)
 * 5 มุม: นั่ง (sit) · หน้า (front) · เฉียง (q) · ข้าง (side) · หลัง (back)
 *
 * ตอนนี้อยู่แค่หน้าทดลอง cat-lab (แท็บ 🍼 จิบิ) ยังไม่เข้าเกม
 *
 * หน่วยวาด = พิกเซลของชีทแบบ · เท้าอยู่ที่ y = 0 (ชีท y 860) · กลางตัว x = 0
 * กลางตัวในชีท: นั่ง 200 · หน้า 482 · เฉียง 768 · ข้าง 1062 · หลัง 1350
 * จุดทุกจุดวัดจากชีทด้วยตาราง 10 หน่วย (พิกัดในไฟล์ = พิกัดชีทเทียบกลางตัว/พื้น โดยตรง)
 * เทียบกับแบบได้ในแท็บจิบิ ปุ่ม "ภาพแบบ: ซ้อน"
 *
 * วาดแบบชั้น (เหมือน drawLayer ของ cat2): ลงเส้นหนาของทุกชิ้นในชั้นก่อน แล้วลงสีทับ
 * → ชิ้นในชั้นเดียวกันกลืนเป็นก้อนเดียว เส้นเหลือแค่รอบนอก ไม่มีรอยต่อ
 * ชั้น (ล่าง → บน): หาง → ตัว (+แขนขา) → หู → หัว → หน้า
 * หูอยู่หลังหัว: เส้นหัวลากผ่านโคนหูเป็นเส้นเชื่อมตามแบบ (ผู้ใช้เคยให้เอาออก แล้วขอคืน 12 พ.ย.) · มุมหลัง: หางอยู่บนสุด (ทับคาง)
 */

const INK = '#5A3420';   // สีเส้นของแบบ — ห้ามเปลี่ยน
const LW = 4.6;          // ความหนาเส้น (หน่วยชีท) เส้นทุกเส้นหนาเท่ากัน
const TAIL_W = 9;        // เนื้อหาง (ไม่รวมเส้น) — รวมเส้นสองข้าง = กว้าง ~18 ตามแบบ
const TAIL_BACK_W = 15;  // มุมหลัง หางชี้เข้าหาคน ดูอ้วนกว่า (รวมเส้น ~24 ตามแบบ)

export const CHIBI_VIEWS = ['sit', 'front', 'q', 'side', 'back'];
export const CHIBI_POSES = ['idle', 'tpose'];

/** สีตัว · sketch = ขาวตามแบบลายเส้น · soft = ขาวนวล หูในชมพู แก้มชมพูจาง ๆ */
export const CHIBI_LOOKS = {
  sketch: { fur: '#FFFFFF', shade: null, earIn: null, blush: null, nose: '#FFFFFF', eye: '#5A3218', eyeTop: '#3E1F0C' },
  soft: { fur: '#FFFBF6', shade: 'rgba(214,170,150,.22)', earIn: '#FFD3DA', blush: 'rgba(255,150,165,.30)', nose: '#F6A7AE', eye: '#5E3419', eyeTop: '#3A1C0B' },
};

// ── เส้นโค้งผ่านจุด (Catmull-Rom → Bezier) ──
function spline(path, pts, closed) {
  const n = pts.length;
  const P = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  path.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    path.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
      p2[0], p2[1],
    );
  }
  if (closed) path.closePath();
  return path;
}
/**
 * หดรูปทรงเข้าด้านในครึ่งเส้น: เส้นรอบนอกของ layer() อยู่นอกรูปทรงทั้งเส้น
 * จุดในไฟล์วัดที่ "กลางเส้น" ของแบบ → หดเข้าครึ่งเส้น เส้นที่วาดจึงทับกลางเส้นแบบพอดี
 */
function inset(pts, d) {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n]; area += x1 * y2 - x2 * y1; }
  const sg = area > 0 ? 1 : -1;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [p[0] - (sg * dy / l) * d, p[1] + (sg * dx / l) * d];
  });
}
const shape = (pts) => spline(new Path2D(), inset(pts, LW / 2), true);
const curve = (pts) => spline(new Path2D(), pts, false);
const mirror = (pts) => pts.map(([x, y]) => [-x, y]).reverse();
const shift = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);

/** หมุนจุดรอบ (cx, cy) */
const rot = (pts, a, cx, cy) => {
  const c = Math.cos(a), s = Math.sin(a);
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
};

/**
 * หัวหน้าตรง: ครึ่งบนกลม (วงรีธรรมดา) · ครึ่งล่างกลมป่องนิด ๆ (superellipse n=2.15) แก้มอิ่ม ไม่เหลี่ยม
 * แก้มกว้างสุดต่ำกว่ากลางหัวนิด (ตามแบบ: กว้างสุดที่ ~13 หน่วยใต้กลางหัว)
 */
function headPts(cx, cy, rx, ry) {
  const out = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const s = Math.sin(a), c = Math.cos(a);
    const n = s > 0 ? 2.15 : 2;   // ครึ่งล่างกลมเกือบเท่าครึ่งบน (ผู้ใช้ 12 พ.ย.: 2.8 ดูเหลี่ยม)
    const x = rx * Math.sign(c) * Math.abs(c) ** (2 / n) * (1 + 0.02 * Math.sin(a + 0.4));
    const y = ry * Math.sign(s) * Math.abs(s) ** (2 / n);
    out.push([cx + x, cy + y]);
  }
  return out;
}

// ════════════════ แบบของแต่ละมุม (พิกัดชีทเทียบกลางตัว · พื้น y = 0) ════════════════

// ── หน้าตรง ──
const FRONT_HEAD = { x: 0, y: -203.5, rx: 110.5, ry: 93.5 };
// หูซ้าย (เทียบกลางหัว): ขอบนอกเกือบตั้งตรง ยอดมนสูงเหนือหัว ขอบในลาดลงหาหน้าผาก · โคนจมหลังหัว (เส้นหัวพาดโคนหู)
const EAR_F = [[-104, -20], [-103, -45], [-97, -78], [-90, -102], [-84, -112], [-76, -113], [-64, -106], [-46, -96], [-33, -88], [-26, -74], [-40, -56], [-80, -30]];
// เส้นคู่ในหู ขนานขอบนอก (ปลายล่างหายหลังเส้นหัวเอง)
const EAR_F_IN = [[-96, -36], [-93, -64], [-87, -88], [-79, -101]];

// ท่ากางแขน (T) ตามชีท — เก็บไว้ใช้กับท่าอื่น (opt.pose = 'tpose') · แขนกางตรงปลายมน · ลำตัวข้างตรง · ช่องขาเป็นซุ้มเรียบ (ไม่มีขั้นนิ้วเท้า — ผู้ใช้ให้ขาเรียบ ขยับง่าย)
const BODY_FRONT_T = [
  [0, -128], [-40, -124], [-55, -113], [-80, -112], [-100, -112], [-106, -105], [-107, -95], [-103, -85],
  [-95, -81], [-75, -79], [-61, -76], [-60, -55], [-60, -30], [-57, -14], [-52, -3], [-45, 0], [-30, 0],
  [-17, 0], [-13, -10], [-9, -24], [-5, -33], [0, -36], [5, -33], [9, -24], [13, -10],
  [17, 0], [30, 0], [45, 0], [52, -3], [57, -14], [60, -30], [60, -55], [61, -76], [75, -79], [95, -81],
  [103, -85], [107, -95], [106, -105], [100, -112], [80, -112], [55, -113], [40, -124],
];

// ── นั่ง ── (หัวเหมือนหน้าตรง ต่ำลง 2)
const SIT_HEAD = { x: 0, y: -201.5, rx: 110.5, ry: 93.5 };
// ก้อนตัวบานกว้างจากใต้คาง ฐานมน ก้นสองข้างมาบรรจบกลางเป็นรอยบุ๋ม
const BODY_SIT = [
  [0, -120], [-40, -116], [-50, -108], [-62, -96], [-73, -82], [-83, -66], [-87, -50], [-84, -34], [-74, -20],
  [-58, -10], [-36, -3], [-16, 0], [-6, -1], [0, -7], [6, -1], [16, 0], [36, -3], [60, -11], [73, -21],
  [84, -34], [88, -50], [84, -66], [72, -86], [60, -98], [50, -108], [40, -116],
];
const SIT_THIGH_L = [[-47, -108], [-50, -90], [-56, -72], [-60, -50], [-57, -30], [-46, -15], [-30, -6]];
const SIT_THIGH_R = [[47, -108], [52, -88], [58, -66], [60, -44], [56, -26], [42, -13], [28, -6]];
// อุ้งเท้าหน้าคู่กลางตัว: สองแขนงปลายงอนออก มาบรรจบเป็นตัว Y แล้วลงไปที่รอยบุ๋ม
const SIT_PAW_L = [[-20, -37], [-17, -33], [-15, -26], [-9, -20], [-2, -17]];
const SIT_PAW_STEM = [[0, -17], [0, -7]];

// ── เฉียง 3/4 (หันไปทางซ้ายของภาพ) ──
const Q_HEAD_C = { x: 0, y: -207 };
// หัว + หูขวา (ใกล้) เป็นเส้นรอบนอกเส้นเดียว โค้งต่อกันเนียน (ไม่มีรอยหยัก — ผู้ใช้ไม่เอารอย)
const Q_HEAD = [
  [-116, -168], [-118, -192], [-115, -210], [-110, -228], [-100, -248], [-87, -262], [-63, -285], [-30, -302],
  [0, -307], [26, -312], [50, -322], [62, -319], [78, -302], [92, -276], [104, -246],
  [113, -216], [117, -190], [115, -168], [109, -150], [96, -133], [76, -119], [46, -109], [0, -104], [-46, -108],
  [-80, -121], [-102, -142],
];
// หูซ้าย (ไกล) อยู่หลังหัว (เส้นหัวพาดโคนหู)
const Q_EAR_L = [[-53, -322], [-45, -318], [-36, -308], [-29, -297], [-25, -283], [-40, -266], [-90, -232], [-108, -236], [-104, -254], [-95, -276], [-80, -300], [-63, -318]];
const Q_EAR_L_IN = [[-100, -250], [-91, -275], [-75, -299], [-58, -313]];
// เส้นคู่ในหูขวา ลากจากใต้ยอดหูลงมาในหัว
const Q_EAR_R_LINES = [[[52, -308], [55, -268], [58, -228]], [[62, -302], [66, -265], [70, -228]]];
// ตัวท่ากางแขน: แขนซ้ายกาง · แขนขวาโผล่ทั้งท่อนชี้ขวาลง · ช่องขาแคบเยื้องซ้าย
const BODY_Q_T = [
  [0, -125], [-45, -118], [-56, -110], [-76, -110], [-88, -109], [-94, -102], [-93, -90], [-86, -80], [-70, -77],
  [-56, -77], [-51, -70], [-50, -40], [-46, -20], [-40, -6], [-32, 0], [-18, 0], [-12, 0], [-10, -12],
  [-7, -24], [-3, -32], [0, -31], [3, -23], [5, -12], [7, 0], [20, 0], [38, 0], [45, -6],
  [49, -18], [52, -35], [53, -60], [54, -71], [62, -74], [80, -77], [92, -82], [100, -92], [99, -103], [86, -108],
  [66, -113], [50, -118],
];

// ── ท่ายืนนิ่ง (ตั้งต้นทุกมุม · ผู้ใช้ 12 พ.ย.: ไม่ต้องกางแขนแบบ T ให้ยืนเฉย ๆ แบบน้องตัวโต) ──
// แขนห้อยเฉียงลง ~35° ปลายมน · ขายืนป้อม ช่องขาเป็นซุ้มเตี้ยกว้าง (ไม่สูงแหลมแบบท่า T)
const BODY_FRONT = [
  [0, -128], [-40, -124], [-55, -114], [-70, -106], [-85, -94], [-95, -82], [-100, -71], [-98, -61], [-90, -57],
  [-80, -62], [-69, -71], [-61, -72], [-60, -50], [-60, -30], [-57, -13], [-52, -3], [-44, 0], [-28, 0],
  [-18, 0], [-12, -6], [-6, -14], [0, -17], [6, -14], [12, -6], [18, 0], [28, 0], [44, 0], [52, -3],
  [57, -13], [60, -30], [60, -50], [61, -72], [69, -71], [80, -62], [90, -57], [98, -61], [100, -71],
  [95, -82], [85, -94], [70, -106], [55, -114], [40, -124],
];
// หลัง = ทรงเดียวกับหน้า (มองจากหลังแขนห้อยเหมือนกัน)
const BODY_BACK = BODY_FRONT;
// เฉียง: แขนซ้ายห้อยเฉียงลง · แขนขวาห้อยโผล่จากหลังตัวนิดเดียว · ช่องขาเตี้ยเยื้องซ้าย
const BODY_Q = [
  [0, -125], [-45, -118], [-57, -110], [-71, -102], [-84, -90], [-92, -78], [-95, -68], [-91, -59], [-82, -57],
  [-73, -63], [-62, -71], [-54, -72], [-51, -55], [-50, -38], [-46, -19], [-40, -6], [-32, 0], [-18, 0],
  [-13, -6], [-7, -13], [-1, -15], [5, -12], [10, -5], [14, 0], [26, 0], [40, 0], [46, -6], [50, -18],
  [52, -35], [53, -56], [56, -66], [65, -62], [74, -60], [80, -66], [80, -77], [72, -90], [62, -102], [50, -116],
];

// ── ข้าง (หันซ้าย) ──
const SIDE_HEAD_C = { x: 5, y: -216 };
// หัวโตกลม หน้าผากเรียบ ปลายจมูกนูนเล็ก ยอดหัวมีจุกหูเล็ก ๆ
const SIDE_HEAD = [
  [-20, -311], [-10, -320], [-1, -312], [9, -323], [21, -318], [40, -308], [77, -285], [100, -252], [113, -218], [117, -188], [112, -162],
  [100, -142], [77, -125], [43, -115], [0, -113], [-47, -110], [-80, -113], [-97, -125], [-106, -140],
  [-112, -150], [-117, -157], [-114, -164], [-106, -168], [-101, -176], [-98, -195], [-97, -218], [-90, -248],
  [-70, -275], [-43, -295], [-24, -306],
];
// หูมุมข้าง (ตามแบบ): เส้นในหูเริ่มที่รอยเว้าและยอดหู ลากลงมาโค้งนิด ๆ + เส้นขอบหลังหูแตกจากเส้นหัวเป็นโค้งยาว
const SIDE_EAR_LINES = [
  [[-1, -310], [3, -298], [6, -282], [7.5, -262], [8, -244], [8, -228]],
  [[8, -320], [10.5, -306], [12.5, -288], [13.5, -268], [14, -248], [14, -233]],
  [[38, -306], [52, -294], [62, -280], [70, -265], [76, -248], [79, -228]],
];
const SIDE_MOUTH = [[-108, -146], [-102, -136], [-96, -133], [-91, -139]];
// ตัว: อกโค้งลงอุ้งเท้าหน้าเรียบ ๆ (ไม่มีรอยงอ) → ท้องเรียบ → ก้นป่องโค้งขึ้นไปโคนหาง
const BODY_SIDE = [
  [0, -125], [-38, -112], [-46, -100], [-51, -85], [-53, -62], [-49, -42], [-38, -30], [-27, -21], [-24, -10],
  [-19, -1], [-5, 0], [8, -2], [18, -12], [35, -21], [52, -34], [61, -52], [61, -75],
  [53, -93], [40, -110], [20, -122],
];
// แขนข้างลำตัว: ตัว C เปิดไปทางหลัง
const SIDE_ARM = [[3, -98], [-8, -106], [-19, -99], [-18, -86], [-8, -77], [3, -73]];

// ── หลัง ──
const BACK_HEAD_C = { x: 0, y: -210 };
// หัวทรงหัวแมว: ยอดหูมนสองมุม ขอบบนเว้าแบน ข้างตรงแล้วโค้งมนลงคาง
const BACK_HEAD = [
  [-80, -316], [-62, -312], [-47, -305], [-20, -297], [0, -296], [20, -297], [47, -305], [62, -312], [78, -316],
  [88, -302], [97, -268], [103, -225], [110, -188], [104, -162], [90, -138], [70, -122], [40, -113], [0, -110],
  [-40, -112], [-77, -125], [-97, -142], [-107, -162], [-112, -185], [-105, -225], [-100, -268], [-92, -302],
];
// ตัวหลังท่ากางแขน: เหมือนตัวหน้าแต่ลำตัวแคบลงนิด ช่องขาแคบสูง
const BODY_BACK_T = [
  [0, -128], [-40, -124], [-55, -112], [-80, -111], [-100, -111], [-106, -104], [-107, -94], [-103, -85],
  [-95, -81], [-75, -78], [-58, -76], [-57, -55], [-57, -30], [-55, -14], [-51, -3], [-45, 0], [-30, 0],
  [-12, 0], [-9, -12], [-7, -28], [-4, -37], [0, -40], [4, -37], [7, -28], [9, -12], [12, 0], [30, 0], [45, 0],
  [51, -3], [55, -14], [57, -30], [57, -55], [58, -76], [75, -78], [95, -81], [103, -85], [107, -94], [106, -104],
  [100, -111], [80, -111], [55, -112], [40, -124],
];

/**
 * หาง: แกนหาง (จุดจากโคนไปปลาย) แต่ละมุม
 * ทรง "?" — ออกจากก้นแนวนอน โค้งขึ้น แล้วปลายม้วนกลับมาทางหัวนิด ๆ (หางแมวจริง ไม่ใช่ไม้ตรง)
 * ตอนขยับ: คลื่นวิ่งจากโคนไปปลาย (ดู tailWave)
 */
const TAIL = {
  q: [[60, -63], [90, -66], [110, -77], [121, -95], [125, -115], [121, -130], [113, -137], [107, -132]],
  side: [[58, -50], [86, -54], [106, -65], [118, -83], [123, -104], [121, -122], [113, -132], [106, -128]],
  sit: [[86, -56], [99, -40], [101, -20], [93, -2], [72, 10], [40, 19], [16, 24], [3, 22], [-4, 15]],
};

/** ลงชั้น: เส้นหนาใต้ทุกชิ้นก่อน แล้วลงสีทับ — ชิ้นในชั้นเดียวกันจึงต่อกันเนียน */
function layer(ctx, items, fur) {
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const it of items) {
    ctx.lineWidth = (it.tube || 0) + LW * 2;
    ctx.stroke(it.path);
  }
  for (const it of items) {
    if (it.tube) { ctx.strokeStyle = fur; ctx.lineWidth = it.tube; ctx.stroke(it.path); ctx.strokeStyle = INK; }
    else { ctx.fillStyle = fur; ctx.fill(it.path); }
  }
}

/** เส้นรายละเอียดข้างใน (หนาเท่าเส้นรอบนอกทุกเส้น) */
function line(ctx, p) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = LW;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(p);
}

/** เงาพ่นจาง ๆ ตามขอบล่างของชิ้น (เฉพาะแบบ soft) */
function shadeIn(ctx, path, look, y0, y1) {
  if (!look.shade) return;
  ctx.save();
  ctx.clip(path);
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, look.shade);
  ctx.fillStyle = g;
  ctx.fillRect(-200, y0, 400, y1 - y0);
  ctx.restore();
}

/**
 * ตาโตเกือบกลม (ตามแบบ): ขอบตาเข้ม → ข้างในน้ำตาลเข้มเต็มดวง เหลือเสี้ยวขาวบาง ๆ
 * + ขนตาบนหนาตามขอบบน ปลายยื่นเป็นปีกหมวกออกหางตา + ขีดเล็กใต้หางตา
 * k = เปิดตา 0..1 · out = ทางหางตา (-1 ซ้าย / 1 ขวา)
 * mx, my = ทางเสี้ยวขาว (มุมหน้า: ด้านนอก-ล่าง · มุมข้าง: ด้านล่าง)
 */
function eye(ctx, x, y, rx, ry, k, out, look, mx = out, my = 1) {
  if (k < 0.14) {
    // หลับ: โค้งยิ้มคว่ำเส้นเดียว + ปีกหางตา
    line(ctx, curve([[x - rx * 0.92, y], [x - rx * 0.45, y + ry * 0.3], [x + rx * 0.45, y + ry * 0.3], [x + rx * 0.92, y]]));
    line(ctx, curve([[x + out * rx * 0.9, y], [x + out * (rx + 9), y - 4]]));
    return;
  }
  const h = ry * k;
  ctx.save();
  ctx.translate(x, y + ry * (1 - k) * 0.6);
  const E = new Path2D();
  E.ellipse(0, 0, rx, h, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill(E);
  ctx.save();
  ctx.clip(E);
  // ตาดำเต็มดวง เลื่อนหนีทางเสี้ยว → เหลือเสี้ยวขาวบาง ๆ
  ctx.fillStyle = look.eye;
  ctx.beginPath();
  ctx.ellipse(-mx * rx * 0.1, -my * h * 0.09, rx * 0.97, h * 0.97, 0, 0, Math.PI * 2);
  ctx.fill();
  // ใต้ขนตาบนเข้มขึ้นนิดเดียว (แบบเป็นสีเต็มดวง — มากกว่านี้จะเป็นแถบเหมือนแว่นกันแดด)
  const g = ctx.createLinearGradient(0, -h, 0, -h * 0.35);
  g.addColorStop(0, look.eyeTop);
  g.addColorStop(1, look.eye);
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -h, rx * 2, h * 0.65);
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = LW;
  ctx.stroke(E);
  // ขนตาบน: ทับขอบบน แล้วยื่นเป็นปีกสั้น ๆ ออกหางตา (แนวนอน ปลายห้อยนิด)
  const top = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 1.12 + (i / 10) * Math.PI * 0.76;
    top.push([Math.cos(a) * rx, Math.sin(a) * h]);
  }
  const wing = [[out * (rx + 5), -h * 0.54], [out * (rx + 12), -h * 0.48]];
  if (out > 0) top.push(...wing); else top.unshift(...wing.reverse());
  line(ctx, curve(top));
  // ขีดเล็กใต้หางตา (แตะขอบตา)
  line(ctx, curve([[out * rx * 0.78, h * 0.7], [out * rx * 0.86, h * 0.93]]));
  ctx.restore();
}

/** จมูกวงเล็กกลวง */
function nose(ctx, x, y, look) {
  ctx.fillStyle = look.nose;
  ctx.beginPath();
  ctx.ellipse(x, y, 5.4, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = LW;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

/** ปากคลื่นเล็ก ‿‿ (แบนตามแบบ) · (x, y) = กลางปาก · w = ครึ่งความกว้าง */
function mouth(ctx, x, y, w = 16) {
  const k = w / 16;
  line(ctx, curve([[-16, 0], [-11, 3.3], [-6, 4.4], [-2, 2.2], [0, 0], [2, 2.2], [6, 4.4], [11, 3.3], [16, 0]].map(([px, py]) => [x + px * k, y + py])));
}

function blush(ctx, x, y, look, rx = 15) {
  if (!look.blush) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, look.blush);
  g.addColorStop(1, 'rgba(255,150,165,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, rx * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** แบ่งแกนหางเป็นท่อนถี่ ๆ ตามเส้นโค้ง Catmull-Rom (ข้อต่อเยอะ = งอได้เนียน ไม่หักเป็นท่อน) */
function resample(pts, per = 4) {
  const n = pts.length, out = [];
  const P = (i) => pts[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(pts[n - 1]);
  return out;
}

/**
 * หางขยับแบบลื่น ๆ: งอทีละข้อสะสมจากโคนไปปลาย
 * - คลื่นช้าวิ่งจากโคนไปปลาย (ปลายตามหลังโคน = ดูมีน้ำหนัก ไม่แกว่งทั้งเส้นพร้อมกันแบบไม้)
 * - คลื่นเร็วเบา ๆ เฉพาะช่วงปลาย (ปลายหางกระดิก)
 * - ปลายม้วนเข้าออกช้า ๆ
 * k = ความแรง (หางวางพื้นตอนนั่ง = เบา ขยับแค่ช่วงปลาย)
 */
function tailWave(pts, t, k = 1, tipOnly = false) {
  const P = resample(pts);
  const n = P.length;
  const out = [P[0]];
  let acc = 0;
  const w1 = (t / 150) * Math.PI * 2, w2 = (t / 58) * Math.PI * 2, w3 = (t / 230) * Math.PI * 2;
  for (let i = 1; i < n; i++) {
    const u = i / (n - 1);
    const reach = tipOnly ? u * u * u : 0.35 + 0.65 * u;
    acc += k * reach * (0.024 * Math.sin(w1 - u * 2.6) + 0.013 * u * Math.sin(w2 - u * 3.4)) * (12 / n)
      + k * 0.05 * u ** 4 * Math.sin(w3) * (12 / n);
    const [px, py] = out[i - 1];
    const dx = P[i][0] - P[i - 1][0], dy = P[i][1] - P[i - 1][1];
    const c = Math.cos(acc), s = Math.sin(acc);
    out.push([px + dx * c - dy * s, py + dx * s + dy * c]);
  }
  return out;
}

/** จังหวะชีวิตจากเวลาอย่างเดียว (ลากหลอดเวลากลับมาได้ภาพเดิม) · t = เฟรม 60fps · t = 0 = ท่าตรงตามแบบเป๊ะ */
function life(t) {
  const breathe = Math.sin((t / 150) * Math.PI * 2);
  // กะพริบทุก ~4 วิ (บางรอบกะพริบสองที)
  const ph = t % 250;
  const blinkAt = (p) => { const d = Math.abs(ph - p); return d < 7 ? 1 - d / 7 : 0; };
  const blink = Math.max(blinkAt(232), Math.floor(t / 250) % 3 === 1 ? blinkAt(214) : 0);
  // หูกระดิกเป็นพัก ๆ
  const ep = t % 420;
  const ear = ep < 18 ? Math.sin((ep / 18) * Math.PI) * 0.1 : 0;
  return {
    breathe,
    open: 1 - blink,
    ear,
    tilt: Math.sin((t / 330) * Math.PI * 2) * 0.02,
  };
}

/**
 * วาดน้องจิบิ · (x, y) = จุดกลางเท้าบนพื้น · s = ขนาด (หน่วยชีท → หน่วยของ ctx)
 * opt: { view, t, look, pose } · pose: 'idle' (ตั้งต้น ยืนนิ่งแขนห้อย) | 'tpose' (กางแขนตามชีท)
 */
export function drawChibi(ctx, x, y, s, opt = {}) {
  const view = opt.view || 'front';
  const look = CHIBI_LOOKS[opt.look] || CHIBI_LOOKS.sketch;
  const L = life(opt.t || 0);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  // หายใจ: ตัวยืดยุบนิด ๆ ที่พื้น หัวขยับตาม
  const sy = 1 + L.breathe * 0.01;

  // ── หาง (อยู่หลังตัว ยกเว้นมองหลัง) ──
  const t = opt.t || 0;
  if (TAIL[view]) layer(ctx, [{ path: curve(tailWave(TAIL[view], t, view === 'sit' ? 1.6 : 1, view === 'sit')), tube: TAIL_W }], look.fur);

  // ── ตัว ──
  ctx.save();
  ctx.scale(1, sy);
  const T = opt.pose === 'tpose';
  const bodyPts = { front: T ? BODY_FRONT_T : BODY_FRONT, back: T ? BODY_BACK_T : BODY_BACK, sit: BODY_SIT, side: BODY_SIDE, q: T ? BODY_Q_T : BODY_Q }[view];
  const body = shape(bodyPts);
  layer(ctx, [{ path: body }], look.fur);
  shadeIn(ctx, body, look, -60, 0);
  bodyDetails(ctx, view, opt.pose);
  ctx.restore();

  // ── หัว (หมุนเอียงนิด ๆ รอบกลางหัว + ลอยตามลมหายใจ) ──
  const hc = { front: FRONT_HEAD, sit: SIT_HEAD, q: Q_HEAD_C, side: SIDE_HEAD_C, back: BACK_HEAD_C }[view];
  ctx.save();
  ctx.translate(hc.x, hc.y * sy - L.breathe * 1.4);
  ctx.rotate(L.tilt);
  ctx.translate(-hc.x, -hc.y);
  drawHead(ctx, view, look, L);
  ctx.restore();

  // มุมหลัง: หางชี้ขึ้นกลางหลัง ปลายทับคาง วงกลมที่ปลาย = ปลายหางงอเข้าหาคน — ส่ายซ้ายขวาเบา ๆ
  if (view === 'back') {
    const p = [0, 1, 2, 3, 4].map((i) => {
      const u = i / 4;
      const sw = 7 * u * Math.sin((t / 150) * Math.PI * 2 - u * 1.6) + 2 * u * u * Math.sin((t / 58) * Math.PI * 2 - u * 2.4);
      return [sw, (-55 - 67 * u) * sy];
    });
    layer(ctx, [{ path: curve(p), tube: TAIL_BACK_W }], look.fur);
    const ring = new Path2D();
    ring.arc(p[4][0], p[4][1], 7, 0, Math.PI * 2);
    line(ctx, ring);
  }

  ctx.restore();
}

/** เส้นข้างในตัว (หนาเท่าเส้นรอบนอก) */
function bodyDetails(ctx, view, pose) {
  if (view === 'sit') {
    line(ctx, curve(SIT_THIGH_L));
    line(ctx, curve(SIT_THIGH_R));
    line(ctx, curve(SIT_PAW_L));
    line(ctx, curve(mirror(SIT_PAW_L)));
    line(ctx, curve(SIT_PAW_STEM));
  } else if (view === 'side') {
    line(ctx, curve(SIDE_ARM));
  } else if (view === 'back') {
    // × ที่ก้น + เส้นก้นสองข้างเหนือช่องขา (ท่ายืนนิ่งช่องขาเตี้ย → เลื่อนลงตาม)
    const dy = pose === 'tpose' ? 0 : 15;
    line(ctx, curve([[-3.5, -41.5 + dy], [3.5, -34.5 + dy]]));
    line(ctx, curve([[3.5, -41.5 + dy], [-3.5, -34.5 + dy]]));
    line(ctx, curve([[-42, -30 + dy], [-30, -31 + dy], [-15, -35 + dy]]));
    line(ctx, curve([[42, -30 + dy], [30, -31 + dy], [15, -35 + dy]]));
  }
}

/** หัว + หู + หน้า (พิกัดตัว) */
function drawHead(ctx, view, look, L) {
  const earA = L.ear;
  if (view === 'front' || view === 'sit') {
    const H = view === 'sit' ? SIT_HEAD : FRONT_HEAD;
    const hp = shape(headPts(H.x, H.y, H.rx, H.ry));
    const ex = view === 'sit' ? 0.9 : 1;   // ท่านั่งในแบบ หูชิดเข้าหากลางหัวกว่าหน้าตรงนิด
    const at = (pts) => shift(pts.map(([px, py]) => [px * ex, py]), H.x, H.y);
    const earL = rot(at(EAR_F), -earA, H.x - 85, H.y - 60), earR = rot(at(mirror(EAR_F)), earA * 0.4, H.x + 85, H.y - 60);
    // หูอยู่หลังหัว → เส้นหัวพาดโคนหูเป็นเส้นเชื่อม · เส้นในหูวาดก่อนหัว ปลายล่างหายหลังหัวเอง
    layer(ctx, [{ path: shape(earL) }, { path: shape(earR) }], look.fur);
    innerEar(ctx, rot(at(EAR_F_IN), -earA, H.x - 85, H.y - 60), look);
    innerEar(ctx, rot(at(mirror(EAR_F_IN)), earA * 0.4, H.x + 85, H.y - 60), look);
    layer(ctx, [{ path: hp }], look.fur);
    shadeIn(ctx, hp, look, H.y + 30, H.y + H.ry);
    blush(ctx, H.x - 72, H.y + 52, look);
    blush(ctx, H.x + 72, H.y + 52, look);
    eye(ctx, H.x - 46, H.y + 16.5, 34, 30, L.open, -1, look);
    eye(ctx, H.x + 46, H.y + 16.5, 34, 30, L.open, 1, look);
    nose(ctx, H.x, H.y + 50.5, look);
    mouth(ctx, H.x, H.y + 70.5);
  } else if (view === 'q') {
    const c = Q_HEAD_C;
    const earL = rot(Q_EAR_L, -earA, -70, -260);
    const hp = shape(Q_HEAD);
    layer(ctx, [{ path: shape(earL) }], look.fur);
    innerEar(ctx, rot(Q_EAR_L_IN, -earA, -70, -260), look);
    layer(ctx, [{ path: hp }], look.fur);
    for (const l of Q_EAR_R_LINES) line(ctx, curve(l));
    shadeIn(ctx, hp, look, c.y + 30, -108);
    blush(ctx, -100, -150, look, 10);
    blush(ctx, 30, -148, look);
    eye(ctx, -75, -189, 23, 31, L.open, -1, look);
    eye(ctx, -5, -187, 28, 33, L.open, 1, look);
    nose(ctx, -45, -153, look);
    mouth(ctx, -43, -133, 10);
  } else if (view === 'side') {
    const hp = shape(SIDE_HEAD);
    layer(ctx, [{ path: hp }], look.fur);
    for (const l of SIDE_EAR_LINES) line(ctx, curve(rot(l, earA, 8, -300)));
    shadeIn(ctx, hp, look, -186, -110);
    blush(ctx, -78, -150, look, 12);
    // ตามุมข้าง: รีตั้ง เสี้ยวขาวอยู่ด้านล่าง ปีกขนตาไปทางหลัง (ขวา)
    eye(ctx, -67, -188, 19.5, 31.5, L.open, 1, look, 0, 1.4);
    line(ctx, curve(SIDE_MOUTH));
  } else if (view === 'back') {
    const hp = shape(BACK_HEAD);
    layer(ctx, [{ path: hp }], look.fur);
    shadeIn(ctx, hp, look, -180, -110);
  }
}

/** เส้นในหู (ตามแบบ: เส้นคู่ขนานขอบหูด้านนอก) + สีชมพูในหูถ้ามี */
function innerEar(ctx, pts, look) {
  if (look.earIn) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.strokeStyle = look.earIn;
    ctx.stroke(curve(pts));
    ctx.restore();
  }
  line(ctx, curve(pts));
}
