// อัดท่าเปิดตัวของชุดระดับ S เป็นวิดีโอ (.mp4 H.264 60fps) → public/video/intro-<ชุด>-<กว้าง>x<สูง>.mp4
//
// ทำไม: ท่าเปิดตัววาดสดกระตุกบนเครื่องอ่อน (ผู้ใช้ทัก 15 ต.ค.) หน้ารายละเอียดชุดจึงเล่นวิดีโอแทน
// วาดทีละเฟรมด้วยตัววาดเดียวกับเกม (src/od-stage.js drawOdScene) — ตำแหน่ง/ขนาด/กล้องตรงกับที่เกมวาดต่อหลังวิดีโอจบ
//
// ต้องมี:
//   1. dev server:   npx vite --port 5173
//   2. Chrome เปิดพอร์ตดีบัก:  chrome --headless=new --remote-debugging-port=9223 --user-data-dir=<โฟลเดอร์ชั่วคราว>
//   3. ffmpeg (มี libx264) — ตั้ง FFMPEG=<path> หรือ pip install imageio-ffmpeg (สคริปต์หาให้เอง)
//
// ใช้:  node tools/render-intro.mjs sweet                   (ทุกพรีเซนเตอร์ × ทุกขนาดใน OD_VIDEOS.sweet)
//       node tools/render-intro.mjs sweet 1440x1080         (ขนาดเดียว ทุกพรีเซนเตอร์)
//       node tools/render-intro.mjs sweet all pearl         (พรีเซนเตอร์เดียว ทุกขนาด)
// ชุดใหม่: เพิ่มใน OD_VIDEOS (src/od-stage.js) ก่อน แล้วรันสคริปต์นี้
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, renameSync, copyFileSync, unlinkSync, existsSync } from 'node:fs';

const id = process.argv[2] || 'sweet';
const only = process.argv[3] && process.argv[3] !== 'all' ? process.argv[3] : null;
const onlyCast = process.argv[4] || null;
const PORT = +(process.env.CDP_PORT || 9223);
const ORIGIN = process.env.DEV_ORIGIN || 'http://localhost:5173';

function ffmpegPath() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try {
    return execFileSync('python', ['-X', 'utf8', '-c', 'import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())'], { encoding: 'utf8' }).trim();
  } catch { return 'ffmpeg'; }
}

// ── คุยกับ Chrome ผ่าน DevTools Protocol (Node มี WebSocket ในตัว) ──
const list = await (await fetch(`http://localhost:${PORT}/json/list`)).json();
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
let seq = 0;
const wait = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } };
await new Promise((r) => (ws.onopen = r));
const send = (method, params = {}) => new Promise((res) => { const i = ++seq; wait.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'evaluate failed');
  return r.result?.result?.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// หน้าเปล่าบนต้นทางเดียวกับ dev server (import โมดูลของเกมได้ ไม่มีลูปเกมแย่งเครื่อง)
await send('Page.enable');
await send('Page.navigate', { url: ORIGIN + '/favicon.ico' });
await sleep(1500);

const info = await ev(`(async () => {
  const st = await import('/src/od-stage.js');
  const c2 = await import('/src/render/cat2.js');
  const g = await import('/src/graphics.js');
  g.setGfxLevel('high');   // อัดที่ความสวยเต็ม (ชุดขนมหวานลดเอฟเฟกต์ตอนประหยัดกราฟิก)
  const v = st.OD_VIDEOS['${id}'];
  return v && { sizes: v.sizes, casts: v.casts.map((k) => [k, st.OD_CASTS[k].skin, st.odVideoSrc('${id}', [1, 1], k)]), dur: c2.cat2Intro('${id}').dur, level: g.gfxLevel() };
})()`);
if (!info) throw new Error(`ชุด ${id} ไม่มีใน OD_VIDEOS (src/od-stage.js)`);
console.log(`ชุด ${id} · ท่าเปิดตัว ${info.dur} เฟรม · กราฟิก ${info.level} · พรีเซนเตอร์ ${info.casts.map((c) => c[0]).join(', ')}`);

const FF = ffmpegPath();
mkdirSync('public/video', { recursive: true });
const sizes = only ? [only.split('x').map(Number)] : info.sizes;

// ทดลองตั้งค่าบีบ (ไม่ต้องใช้ตอนอัดจริง): REF=<ไฟล์> = อัดแบบไม่สูญเสีย (crf 0) ไว้เป็นต้นฉบับเทียบคุณภาพ · FRAMES=a-b = อัดเฉพาะช่วงนี้
//   (ยังวาดทุกเฟรมเรียงจาก 0 — ทางประกายในท่าเปิดตัวจำตำแหน่งคทาจากเฟรมก่อน ๆ)
const REF = process.env.REF;
const [FA, FB] = process.env.FRAMES ? process.env.FRAMES.split('-').map(Number) : [NaN, NaN];   // ไม่ตั้ง = ทุกเฟรม
const casts = info.casts.filter(([k]) => !onlyCast || k === onlyCast);
if (!casts.length) throw new Error(`ชุด ${id} ไม่มีพรีเซนเตอร์ ${onlyCast}`);
for (const [cast, skinId, src1] of casts) for (const [W, H] of sizes) {
  const out = REF || 'public/' + src1.replace('1x1', `${W}x${H}`);
  console.log(`→ ${out}`);
  // เฟรม PNG ไหลเข้า ffmpeg ทาง stdin — ไม่ต้องเขียนไฟล์ภาพลงดิสก์
  // ── สีตรงกับเกม (ผู้ใช้ทัก 18 ต.ค.: "สีในคลิปดรอปจากชุดที่เป็นโค้ด ยิ่งสีชุดชัด") ──
  //   เดิมปล่อย ffmpeg แปลง RGB→YUV ด้วยสูตร BT.601 แต่ไม่ติดป้าย → เบราว์เซอร์ถอดวิดีโอ HD ด้วยสูตร BT.709 → ชมพูอมเขียว/หม่น
  //   ตอนนี้แปลงด้วย BT.709 (ช่วงสี tv) + ติดป้ายครบ + ย่อสีแบบละเอียด — วัดใน Chrome: สีสดเพี้ยนเหลือราวครึ่ง ไม่มีสีอมเขียว
  // ── ขนาด (ผู้ใช้: ลดขนาด คุณภาพลดน้อยที่สุด) ── veryslow + tune animation + crf 25 + aq-mode 3 + chroma-qp-offset −5
  //   วัดเทียบต้นฉบับ RGB ไม่สูญเสีย 180 เฟรม (sweet 1440x1080): ชุดเดิม 2774KB PSNR 32.0 สีสดเพี้ยน 8.36
  //   → ใหม่ 2124KB (−23%) PSNR 33.9 สีสดเพี้ยน 4.76 (ทดลองค่าบีบ: REF/FRAMES ข้างบน แล้วเทียบ RGB ด้วย python)
  const enc = REF ? ['-c:v', 'libx264rgb', '-preset', 'ultrafast', '-qp', '0', '-pix_fmt', 'rgb24']   // ต้นฉบับไม่สูญเสีย (RGB ล้วน ไม่ย่อสี)
    : ['-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'veryslow', '-tune', 'animation', '-crf', '25', '-x264-params', 'aq-mode=3:chroma-qp-offset=-5',
      '-profile:v', 'high', '-level', '5.1',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-movflags', '+faststart'];
  const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '60', '-c:v', 'png', '-i', '-',
    ...enc, '-an', REF ? out : out + '.part.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
  // อัดลงไฟล์ชั่วคราวก่อน แล้วค่อยย้ายทับตอนเสร็จ — ไฟล์เดิมอาจถูกเซิร์ฟเวอร์เปิดค้าง (กำลังส่งให้เบราว์เซอร์) เขียนทับตรง ๆ ไม่ได้บน Windows
  const done = new Promise((r, j) => ff.on('close', (code) => (code ? j(new Error('ffmpeg ' + code)) : r())));
  await ev(`(async () => {
    const st = await import('/src/od-stage.js');
    const sk = await import('/src/skins.js');
    const of = await import('/src/outfits.js');
    const o = of.outfitById('${id}');
    window.__rv = { st, skin: { ...sk.skinById('${skinId}'), outfit: o }, high: o.rarity === 'high' };
    const cv = document.createElement('canvas'); cv.width = ${W}; cv.height = ${H};
    window.__rv.cv = cv;
    return 1;
  })()`);
  // เฟรม 0..dur (รวมเฟรมสุดท้าย = ภาพที่เกมวาดต่อเป็นท่าแอ็ค)
  for (let f = 0; f <= info.dur; f++) {
    const url = await ev(`(() => {
      const R = window.__rv, c = R.cv.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, ${W}, ${H});
      R.st.drawOdScene(c, ${W}, ${H}, { id: '${id}', skin: R.skin, high: R.high, mode: 'intro', f: ${f}, tBase: 600, from: null });
      return ${FA >= 0 ? `${f} >= ${FA} && ${f} <= ${FB}` : 'true'} ? R.cv.toDataURL('image/png') : '';
    })()`);
    if (!url) continue;
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 60 === 0) console.log(`  เฟรม ${f}/${info.dur}`);
  }
  ff.stdin.end();
  await done;
  if (!REF) {
    const part = out + '.part.mp4';
    for (let i = 0; ; i++) {
      try { if (existsSync(out)) unlinkSync(out); renameSync(part, out); break; }
      catch (e) {
        if (i >= 20) { copyFileSync(part, out); unlinkSync(part); break; }   // ยังถูกเปิดค้าง: คัดลอกทับแทน
        await sleep(1500);
      }
    }
  }
}
console.log('เสร็จ');
process.exit(0);
