import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',        // ทำให้ build แล้วเปิดจากโฟลเดอร์ไหนก็ได้
  // host: true = เปิดให้เครื่องอื่นใน WiFi เดียวกันเข้าได้ ไว้ทดสอบบนมือถือ
  server: { open: true, host: true },
  build: {
    outDir: 'dist',
    // สองหน้าแยกกัน: เกม (index.html) กับหน้าแอดมิน (admin.html)
    // ต้องบอก rollup ทั้งคู่ ไม่งั้น build จะได้แค่ index.html หน้าเดียว
    // แยกไฟล์กันแบบนี้ทำให้คนเล่นเกมไม่ต้องโหลดโค้ดแอดมินติดไปด้วยสักไบต์
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
});
