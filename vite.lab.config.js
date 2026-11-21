// vite.lab.config.js — เว็บห้องทดสอบแยก ให้นักออกแบบเปิดดูน้องแมว/บอสบนเว็บ (ผู้ใช้สั่ง 20 พ.ย. 2026)
// ─────────────────────────────────────────────────────────────
// build เฉพาะหน้าห้องทดสอบ: cat-lab · run-lab · monster-lab · gameplay-lab (เพิ่ม 21 พ.ย.) → .lab-build/meowzing-lab/
// ไม่มีตัวเกม ไม่มีหน้าแอดมิน ไม่แตะ meowzing.vercel.app (ขึ้นเป็นโปรเจกต์ Vercel แยก ดู tools/deploy-lab.mjs)
// publicDir ปิด: ทั้งสามหน้าไม่ได้โหลดไฟล์จาก public/ (ตรวจแล้ว 20 พ.ย.) — เว็บเล็ก ไม่ต้องอัปโหลดเสียง/ภาพเกม 98 MB
// รูปแบบอ้างอิง (ref/ · docs/boss-stump/) เข้า build เองผ่าน <img src> และ new URL(..., import.meta.url)
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    outDir: '.lab-build/meowzing-lab',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: {
        catLab: resolve(__dirname, 'cat-lab.html'),
        runLab: resolve(__dirname, 'run-lab.html'),
        monsterLab: resolve(__dirname, 'monster-lab.html'),
        gameplayLab: resolve(__dirname, 'gameplay-lab.html'),
      },
    },
  },
});
