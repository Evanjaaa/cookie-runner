// tools/perf/lib/server.mjs
// เปิด Vite (dev หรือ preview ของ build จริง) สำหรับวัด — ปิดการเปิดเบราว์เซอร์เอง (vite.config.js ตั้ง open: true)
// และฟังแค่ 127.0.0.1 (config จริงเปิด host: true ให้มือถือใน WiFi เข้าได้ — ตอนวัดไม่ต้อง)
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export async function startServer({ mode = 'dev', port = 5199 } = {}) {
  const vite = await import('vite');
  if (mode === 'dev') {
    const server = await vite.createServer({
      root: ROOT, logLevel: 'error', clearScreen: false,
      server: { open: false, host: '127.0.0.1', port, strictPort: true },
    });
    await server.listen();
    return { url: `http://127.0.0.1:${port}/`, close: () => server.close() };
  }
  const server = await vite.preview({
    root: ROOT, logLevel: 'error',
    preview: { open: false, host: '127.0.0.1', port, strictPort: true },
  });
  return { url: `http://127.0.0.1:${port}/`, close: () => new Promise((r) => server.httpServer.close(r)) };
}
