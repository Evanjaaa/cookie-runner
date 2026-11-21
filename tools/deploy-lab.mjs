// tools/deploy-lab.mjs — npm run deploy:lab (เจ้าของโปรเจกต์รันเอง)
// ─────────────────────────────────────────────────────────────
// ขึ้นเว็บห้องทดสอบให้นักออกแบบเปิดดู: https://meowzing-lab.vercel.app
//   หน้าแรก = รายการลิงก์ · /cat-lab.html · /run-lab.html · /monster-lab.html
//
// ไม่แตะเกมจริงเลย: เป็นโปรเจกต์ Vercel แยกชื่อ "meowzing-lab" (สร้างเองตอนรันครั้งแรก)
//   ข้างในมีแค่ 3 หน้านี้ ไม่มีตัวเกม ไม่มีหน้าแอดมิน ไม่ต่อฐานข้อมูล
// ขึ้นแบบ --prod ของโปรเจกต์แยกนี้ → เปิดได้โดยไม่ต้องล็อกอิน Vercel
//   (ลิงก์ Preview ต้องล็อกอิน นักออกแบบเลยเปิดไม่ได้ — จึงไม่ใช้วิธีเดียวกับ deploy:test)
//
// ⚠ ครั้งแรก vercel อาจถามยืนยันการสร้างโปรเจกต์/ชื่อ — ตอบตามค่าที่เสนอ (ชื่อ meowzing-lab)
// ⚠ ถ้าชื่อ meowzing-lab.vercel.app ถูกคนอื่นใช้แล้ว Vercel จะตั้งชื่อใกล้เคียงให้ ดูลิงก์จริงท้ายผลลัพธ์
// ─────────────────────────────────────────────────────────────
import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync, cpSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, '.lab-build/meowzing-lab');
const SCOPE = 'evanjaaas-projects';

function run(cmd, cwd, keep = false) {
  const r = spawnSync(cmd, { cwd, encoding: 'utf8', shell: true, stdio: ['inherit', keep ? 'pipe' : 'inherit', 'inherit'] });
  if (keep && r.stdout) process.stdout.write(r.stdout);
  if (r.status !== 0) { console.error(`\n✗ ไม่ผ่าน: ${cmd}`); process.exit(1); }
  return r.stdout || '';
}

// build ล้างโฟลเดอร์ทั้งหมด (emptyOutDir) — เก็บลิงก์โปรเจกต์ Vercel (.vercel) ไว้ก่อน แล้วคืนหลัง build
// ไม่งั้นรอบถัดไป vercel จะถามสร้าง/ผูกโปรเจกต์ใหม่ทุกครั้ง
const LINK = resolve(OUT, '.vercel'), KEEP = resolve(ROOT, '.lab-build/.vercel-keep');
if (existsSync(LINK)) cpSync(LINK, KEEP, { recursive: true });
console.log('▶ build เฉพาะห้องทดสอบ (cat-lab · run-lab · monster-lab · gameplay-lab)…');
run('npx vite build --config vite.lab.config.js', ROOT);
if (existsSync(KEEP)) { cpSync(KEEP, LINK, { recursive: true }); rmSync(KEEP, { recursive: true, force: true }); }
if (!existsSync(resolve(OUT, 'cat-lab.html'))) { console.error('✗ build ไม่มี cat-lab.html'); process.exit(1); }

// หน้าแรกของเว็บห้องทดสอบ = รายการลิงก์
writeFileSync(resolve(OUT, 'index.html'), `<!DOCTYPE html>
<html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>MeowZing Lab — ห้องทดสอบ</title>
<link href="https://fonts.googleapis.com/css2?family=Mitr:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; text-wrap: balance;
    font: 400 15px Mitr, sans-serif; color: #FFF4DC;
    background: radial-gradient(60vw 50vh at 10% -10%, rgba(255,159,196,.18), transparent 70%), #150B21; }
  main { width: min(520px, 100%); }
  h1 { margin: 0 0 4px; font-size: 22px; font-weight: 600; }
  p { margin: 0 0 18px; color: rgba(255,244,220,.6); }
  a { display: flex; gap: 12px; align-items: center; padding: 14px 16px; margin-bottom: 10px; border-radius: 16px;
    color: inherit; text-decoration: none; background: rgba(255,244,220,.06); border: 1px solid rgba(255,244,220,.12); }
  a:hover { background: rgba(255,159,196,.16); border-color: rgba(255,159,196,.5); }
  a i { font-style: normal; font-size: 26px; }
  a small { display: block; color: rgba(255,244,220,.6); font-size: 13px; }
</style></head><body><main>
  <h1>🐾 MeowZing Lab</h1>
  <p>ห้องทดสอบตัวละครของเกม สำหรับทีมออกแบบ</p>
  <a href="./cat-lab.html"><i>🐱</i><span>Cat Lab<small>น้องแมวทุกตัว ท่าทาง สีหน้า ชุด หมุนดูได้</small></span></a>
  <a href="./run-lab.html"><i>🏃</i><span>Run Lab<small>ท่าวิ่ง กระโดด บนฉากด่านจริง</small></span></a>
  <a href="./gameplay-lab.html"><i>🎮</i><span>Gameplay Lab<small>ลองเล่น: ด่านวิ่ง → สู้ภูตตอไม้ → ช่วยน้อง</small></span></a>
  <a href="./monster-lab.html"><i>👾</i><span>Monster Lab<small>บอส: ท่าลอย เตรียมโจมตี เหนื่อย แพ้</small></span></a>
</main></body></html>
`);

console.log('\n▶ ขึ้นเว็บห้องทดสอบ (โปรเจกต์แยก meowzing-lab — เกมจริงไม่เปลี่ยน)…');
const out = run(`vercel deploy --prod --yes --scope ${SCOPE}`, OUT, true);
const url = (out.match(/https:\/\/[\w.-]+\.vercel\.app/g) || []).pop();
console.log(`\n✓ เสร็จแล้ว${url ? ` — ${url}` : ''}`);
console.log('  ลิงก์ถาวร: https://meowzing-lab.vercel.app  (ถ้า Vercel ตั้งชื่ออื่น ดูในหน้า Vercel → meowzing-lab → Domains)');
console.log('  เกมจริง https://meowzing.vercel.app ไม่ถูกแตะ');
