// tools/deploy-test.mjs — npm run deploy:test (เจ้าของโปรเจกต์รันเอง)
// ─────────────────────────────────────────────────────────────
// ขึ้นเวอร์ชันทดสอบบนลิงก์แยก โดยไม่แตะเกมที่ผู้เล่นเห็น
//
// 1) vercel deploy แบบ Preview (ไม่ใส่ --prod) — ลิงก์หลัก meowzing.vercel.app ยังเป็นเวอร์ชันเดิม
// 2) ผูกชื่อคงที่ meowzing-test.vercel.app ให้ชี้เวอร์ชันล่าสุด — เปิดลิงก์เดิมบน iPad ได้ทุกรอบ
//    ไม่ต้องเปิดคอมค้างเซิร์ฟเวอร์ไว้ (สั่ง deploy เสร็จปิดคอมได้เลย)
//
// พอใจแล้วขึ้นจริง: npm run deploy (แบบเดิม) หรือกด "Promote to Production" ในหน้า Vercel
//
// ⚠ ลิงก์ Preview ต้องล็อกอิน Vercel ก่อนเปิด (Deployment Protection ค่าตั้งต้น)
// ⚠ ใช้ฐานข้อมูล Supabase ตัวเดียวกับเกมจริง — คะแนน/การเปิดกาช่าตอนทดสอบบันทึกเป็นข้อมูลจริง
// ⚠ ระบบออนไลน์ต้องติ๊กช่อง Preview ของ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
//   ใน Vercel → Settings → Environment Variables (ไม่ติ๊ก = เล่นได้ แต่ล็อกอิน/คะแนน/กาช่าใช้ไม่ได้)
// ─────────────────────────────────────────────────────────────
import { spawnSync } from 'node:child_process';

const SCOPE = 'evanjaaas-projects';
const ALIAS = 'meowzing-test.vercel.app';

/** เรียก vercel CLI — ความคืบหน้าขึ้นจอตามปกติ เก็บเฉพาะผลลัพธ์ (stdout) ไว้อ่านลิงก์ */
function vercel(args) {
  const r = spawnSync(`vercel ${args.join(' ')} --scope ${SCOPE}`, {
    encoding: 'utf8', shell: true, stdio: ['inherit', 'pipe', 'inherit'],
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.status !== 0) {
    console.error(`\n✗ vercel ${args[0]} ไม่ผ่าน (${r.error ? r.error.message : 'รหัส ' + r.status})`);
    process.exit(1);
  }
  return r.stdout || '';
}

console.log('▶ deploy แบบ Preview (ลิงก์หลักของเกมไม่เปลี่ยน)…');
const url = (vercel(['deploy']).match(/https:\/\/[\w.-]+\.vercel\.app/g) || []).pop();
if (!url) {
  console.error('✗ ไม่เจอลิงก์ของ deploy นี้ในผลลัพธ์ — ดูลิงก์ในหน้า Vercel → Deployments แทน');
  process.exit(1);
}

console.log(`\n▶ ผูกลิงก์ทดสอบ ${ALIAS} → ${url}`);
vercel(['alias', 'set', url, ALIAS]);

console.log(`\n✓ เสร็จแล้ว — ทดสอบได้ที่ https://${ALIAS}`);
console.log('  เกมจริง https://meowzing.vercel.app ยังเป็นเวอร์ชันเดิม');
