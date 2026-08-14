import { defineConfig } from 'vite';

export default defineConfig({
  base: './',        // ทำให้ build แล้วเปิดจากโฟลเดอร์ไหนก็ได้
  // host: true = เปิดให้เครื่องอื่นใน WiFi เดียวกันเข้าได้ ไว้ทดสอบบนมือถือ
  server: { open: true, host: true },
  build: { outDir: 'dist' },
});
