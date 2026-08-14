// src/storage.js
const KEY = 'cookie-runner:best';

// ห่อ try/catch เพราะ localStorage ใช้ไม่ได้ในโหมดส่วนตัวของบางเบราว์เซอร์
// เซฟไม่ได้ก็ควรแค่ "ไม่เซฟ" ไม่ใช่ทำเกมพัง

export function loadBest() {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(value) {
  try {
    localStorage.setItem(KEY, String(value));
  } catch {
    /* ไม่ทำอะไร */
  }
}
