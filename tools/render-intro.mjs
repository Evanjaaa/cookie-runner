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
// ใช้:  node tools/render-intro.mjs sweet            (ทุกขนาดใน OD_VIDEOS.sweet.sizes)
//       node tools/render-intro.mjs sweet 1440x1080  (ขนาดเดียว)
// ชุดใหม่: เพิ่มใน OD_VIDEOS (src/od-stage.js) ก่อน แล้วรันสคริปต์นี้
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const id = process.argv[2] || 'sweet';
const only = process.argv[3];
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
  return v && { sizes: v.sizes, skin: v.skin, dur: c2.cat2Intro('${id}').dur, level: g.gfxLevel() };
})()`);
if (!info) throw new Error(`ชุด ${id} ไม่มีใน OD_VIDEOS (src/od-stage.js)`);
console.log(`ชุด ${id} · ท่าเปิดตัว ${info.dur} เฟรม · กราฟิก ${info.level} · ตัว ${info.skin}`);

const FF = ffmpegPath();
mkdirSync('public/video', { recursive: true });
const sizes = only ? [only.split('x').map(Number)] : info.sizes;

for (const [W, H] of sizes) {
  const out = `public/video/intro-${id}-${W}x${H}.mp4`;
  console.log(`→ ${out}`);
  // เฟรม PNG ไหลเข้า ffmpeg ทาง stdin — ไม่ต้องเขียนไฟล์ภาพลงดิสก์
  const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '60', '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '5.1',
    '-movflags', '+faststart', '-an', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  // crf 22: เทียบภาพแล้วดูไม่ต่างจาก 17 แต่ไฟล์เล็กลงครึ่งหนึ่ง (~6MB ต่อ 9 วิ ที่ 1440x1080)
  const done = new Promise((r, j) => ff.on('close', (code) => (code ? j(new Error('ffmpeg ' + code)) : r())));
  await ev(`(async () => {
    const st = await import('/src/od-stage.js');
    const sk = await import('/src/skins.js');
    const of = await import('/src/outfits.js');
    const o = of.outfitById('${id}');
    window.__rv = { st, skin: { ...sk.skinById('${info.skin}'), outfit: o }, high: o.rarity === 'high' };
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
      return R.cv.toDataURL('image/png');
    })()`);
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 60 === 0) console.log(`  เฟรม ${f}/${info.dur}`);
  }
  ff.stdin.end();
  await done;
}
console.log('เสร็จ');
process.exit(0);
