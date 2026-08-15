// src/skins.js
// ─────────────────────────────────────────────────────────────
// ชุดสีของแมวแต่ละตัว — ตัวละครวาดด้วยโค้ดชุดเดียวกันทั้งหมด
// เปลี่ยนแค่จานสีกับสวิตช์ลาย/แก้ม ไม่ได้วาดตัวใหม่แยกไฟล์
// อยากเพิ่มแมวตัวที่สาม แค่เพิ่มอ็อบเจกต์ในอาเรย์นี้ เมนูจะขึ้นให้เอง
//
// ทุกสีต้องอ่านออกบนพื้นหลังม่วงเข้ม (#3A1D50) เป็นข้อบังคับ
// นั่นคือเหตุผลที่แมวขาวใช้ #F6F1FA ไม่ใช่ขาวล้วน และขาใช้เทาอมม่วง
// ไม่ใช่เทากลาง ๆ ซึ่งจะจมหายไปกับฉากหลัง
// ─────────────────────────────────────────────────────────────
import { loadSkin, saveSkin } from './storage.js';

export const SKINS = [
  {
    id: 'orange',
    name: 'ส้มน้อย',
    note: 'จอมซนขนส้ม',
    cat: '#F2913D',
    dark: '#C96A1E',
    cream: '#FFE7C4',
    pink: '#FF9BB0',
    ink: '#3A1B08',
    whisker: 'rgba(255,243,226,.72)',
    stripes: true,    // ลายบนหลังกับหน้าผาก
    blush: false,
  },
  {
    id: 'snow',
    name: 'ขาวมุก',
    note: 'ขนปุยนุ่มนิ่ม',
    cat: '#F6F1FA',
    dark: '#B7A8CE',
    cream: '#FFFFFF',
    pink: '#FFA8C0',
    ink: '#3B2B52',
    // ม่วงกลาง ๆ — เข้มพอให้เห็นบนหน้าขาว และสว่างพอให้เห็นบนฉากม่วงเข้ม
    whisker: 'rgba(142,123,174,.9)',
    // ไม่มีลาย แต่มีแก้มชมพูแทน — ทำให้แยกออกจากตัวส้มได้ทันที
    // แม้ตอนวิ่งเร็ว ๆ ที่มองเห็นแค่เงาร่าง
    stripes: false,
    blush: true,
  },
];

export function skinById(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0];
}

let current = skinById(loadSkin());

export function getSkin() {
  return current;
}

export function setSkin(id) {
  current = skinById(id);
  saveSkin(current.id);
  return current;
}
