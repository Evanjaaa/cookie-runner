import { defineConfig } from 'vite';

export default defineConfig({
  base: './',        // ทำให้ build แล้วเปิดจากโฟลเดอร์ไหนก็ได้
  server: { open: true },
  build: { outDir: 'dist' },
});
