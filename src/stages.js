// src/stages.js
// ─────────────────────────────────────────────────────────────
// ทะเบียนด่าน — แต่ละด่านคือ "จานสี + หน้าตาสิ่งกีดขวาง + ลำดับท่อน"
//
// ข้อบังคับสำคัญ: ทุกด่านใช้ PATTERNS ชุดเดียวกัน และรูปทรงการชนของ
// สิ่งกีดขวางต้องเท่ากันเป๊ะทุกด่าน เปลี่ยนได้แค่ "ภาพ" ที่วาดทับลงไป
// เพราะระยะกระโดด ตำแหน่งอาหาร และค่าผ่อนผันทั้งหมดคำนวณจากรูปทรงพวกนั้น
// ถ้าด่านใหม่เปลี่ยนขนาดกล่องหรือความสูงคาน ด่านนั้นจะเล่นไม่ได้ทันที
//
// อยากเพิ่มด่านที่สาม: เพิ่มอ็อบเจกต์ในอาเรย์นี้ เมนูเลือกด่านขึ้นให้เอง
// ─────────────────────────────────────────────────────────────
import { loadStage, saveStage } from './storage.js';

export const STAGES = [
  {
    id: 'night',
    name: 'ครัวกลางคืน',
    note: 'เตาอบยามดึก',
    theme: 'bakery',        // ชุดภาพสิ่งกีดขวาง: หนาม / คาน / กล่องลัง
    bonusTrack: 'skyNight', // เพลงตอนลอยบนฟ้า — กล่อมนอน ชวนฝัน
    palette: {
      sky: ['#1B0F2B', '#3A1D50', '#7A3563'],
      glow: 'rgba(255,166,87,.42)',
      speck: 'rgba(255,243,226,.55)',
      hills: ['#4E2A63', '#6B3560', '#93445F'],
      ground: '#8E4A2C', crust: '#C9743E', crustTop: '#EFA657',
      crumb: 'rgba(91,48,24,.5)',
      pitEdge: 'rgba(27,15,43,.45)',
      pitFill: 'rgba(18,9,30,.72)', pitDeep: 'rgba(10,5,18,.95)',
      // สีตัวอักษรบน HUD — ฟ้าคนละโทนกันทำให้ครีมอ่านออกหรือไม่ออกต่างกันมาก
      ink: '#FFF3E2', inkSoft: '#D9C4EC', accent: '#B4F7F0',
      rail: 'rgba(255,243,226,.14)', railBack: 'rgba(27,15,43,.55)',
      noticeBg: 'rgba(27,15,43,.72)',
      cloud: '#EFE2FA', cloudSoft: '#C6AFE0',
    },
    // ลำดับที่อนุมัติแล้ว — อุ่นเครื่อง → ไต่ระดับ → พีคท่อน 11 → พัก
    route: [
      { p: 0 },
      { p: 9, kibble: 'alternate', letter: true },
      { p: 1 },
      { p: 10, kibble: 'cluster', nip: true },
      { p: 3, shield: true },
      { p: 12, kibble: 'alternate', letter: true },
      { p: 2 },
      { p: 6, shrimp: true },
      { p: 11, nip: true },
      { p: 7, letter: true },
      { p: 13, kibble: 'alternate', magnet: true },
      { p: 4, shield: true },
      { p: 8, shrimp: true },
      { p: 5, letter: true },
      { p: 9, kibble: 'cluster' },
    ],
  },

  {
    id: 'garden',
    name: 'สวนกลางวัน',
    note: 'แดดจ้าลมโชย',
    theme: 'garden',        // กระบองเพชร / ซุ้มดอกไม้ / กล่องของขวัญ
    bonusTrack: 'skyDay',   // เพลงตอนลอยบนฟ้า — หวานโปร่งเหมือนอยู่บนสวรรค์
    palette: {
      sky: ['#7FC9F0', '#B6E5F7', '#FFE0B0'],
      glow: 'rgba(255,214,120,.55)',
      speck: 'rgba(255,255,255,.85)',   // ละอองเกสรแทนเกล็ดน้ำตาล
      // เนินไล่จากอ่อนไปเข้ม เนินใกล้ต้องเข้มพอให้ปลาสีมิ้นต์ลอยเด่นขึ้นมา
      // เคยใช้เขียวอ่อนทั้งสามชั้นแล้วปลาจมหายไปกับพื้นหลังจนหาไม่เจอ
      hills: ['#7CC08B', '#4E9E68', '#2F7C4E'],
      // พื้นดินสีน้ำตาลอุ่น ผิวบนเป็นหญ้าสองชั้น
      ground: '#B97C44', crust: '#4E9E5A', crustTop: '#79C96C',
      crumb: 'rgba(40,105,55,.45)',
      pitEdge: 'rgba(38,72,44,.42)',
      pitFill: 'rgba(28,48,32,.7)', pitDeep: 'rgba(12,22,15,.95)',
      // ฟ้าสว่างทำให้ตัวอักษรครีมอ่านไม่ออก ต้องสลับเป็นหมึกเข้ม
      ink: '#22402F', inkSoft: '#3E6B4F', accent: '#0E7A5F',
      rail: 'rgba(34,64,47,.18)', railBack: 'rgba(255,255,255,.55)',
      noticeBg: 'rgba(255,255,255,.85)',
      cloud: '#FFFFFF', cloudSoft: '#E8F4FF',
    },
    // จังหวะคนละแบบกับด่านแรก: เจอสิ่งกีดขวางเร็วกว่า พีคอยู่ท่อน 12
    route: [
      { p: 0 },
      { p: 10, kibble: 'cluster', letter: true },
      { p: 8 },
      { p: 9, kibble: 'alternate', nip: true },
      { p: 6, shield: true },
      { p: 12, kibble: 'alternate', magnet: true },
      { p: 2, letter: true },
      { p: 5 },
      { p: 11, shrimp: true },
      { p: 7, letter: true },
      { p: 4, shield: true },
      { p: 13, kibble: 'cluster', nip: true },
      { p: 3 },
      { p: 1, shrimp: true, letter: true },
      { p: 9, kibble: 'alternate' },
    ],
  },
];

export function stageById(id) {
  return STAGES.find((s) => s.id === id) || STAGES[0];
}

let current = stageById(loadStage());

export function getStage() {
  return current;
}

export function setStage(id) {
  current = stageById(id);
  saveStage(current.id);
  return current;
}
