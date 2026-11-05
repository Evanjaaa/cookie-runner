import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/**
 * ตัดคอมเมนต์ HTML ออกตอน build — index.html มีคำอธิบายราว 90 KB (เกินหนึ่งในสามของไฟล์) ที่ผู้เล่นต้องโหลดทุกครั้งโดยไม่ได้ใช้
 * ลบแค่ตัวคอมเมนต์ ช่องว่างรอบ ๆ คงเดิม → หน้าจอเหมือนเดิมทุกพิกเซล (คอมเมนต์ไม่ถูกวาด และไม่มีโค้ดไหนไล่อ่านโหนดคอมเมนต์)
 * ไม่แตะเนื้อใน <script> <style> <pre> <textarea> · ไฟล์ต้นฉบับยังมีคอมเมนต์ครบ
 */
function stripHtmlComments() {
  return {
    name: 'strip-html-comments',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html) => html
        .split(/(<(script|style|pre|textarea)\b[\s\S]*?<\/\2>)/i)
        .map((part, i) => (i % 3 === 0 ? part.replace(/<!--(?!\[if)[\s\S]*?-->/g, '') : i % 3 === 1 ? part : ''))
        .join(''),
    },
  };
}

export default defineConfig({
  plugins: [stripHtmlComments()],
  base: './',        // ทำให้ build แล้วเปิดจากโฟลเดอร์ไหนก็ได้
  // host: true = เปิดให้เครื่องอื่นใน WiFi เดียวกันเข้าได้ ไว้ทดสอบบนมือถือ
  server: { open: true, host: true },
  build: {
    outDir: 'dist',
    // สามหน้าแยกกัน: เกม (index.html) / หน้าแอดมิน (admin.html)
    // / โต๊ะออกแบบด่าน (editor.html)
    // ต้องบอก rollup ทุกหน้า ไม่งั้น build จะได้แค่ index.html หน้าเดียว
    // แยกไฟล์กันแบบนี้ทำให้คนเล่นเกมไม่ต้องโหลดโค้ดแอดมินติดไปด้วยสักไบต์
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        editor: resolve(__dirname, 'editor.html'),
        // เมืองแมวเหมียว — หน้าทดลองแยก ยังไม่มีลิงก์จากเกม (GAME_PLAN.md ข้อ 11)
        town: resolve(__dirname, 'town.html'),
      },
    },
  },
});
