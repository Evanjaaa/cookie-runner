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
      noticeBg: 'rgba(27,15,43,.72)',
      cloud: '#EFE2FA', cloudSoft: '#C6AFE0',
    },
    // ลำดับที่อนุมัติแล้ว — อุ่นเครื่อง → ไต่ระดับ → พีคท่อน 11 → พัก
    route: [
      { p: 0 },
      { p: 9, kibble: 'alternate', letter: true },
      { p: 1 },
      { p: 10, kibble: 'cluster', nip: true },
      { p: 14, shield: true },
      { p: 3 },
      { p: 12, kibble: 'alternate', letter: true },
      { p: 2 },
      { p: 15, nip: true },
      { p: 6, shrimp: true },
      { p: 11, letter: true },
      { p: 16, magnet: true },
      { p: 7, letter: true },
      { p: 13, kibble: 'alternate', shield: true },
      { p: 17 },
      { p: 4 },
      { p: 8, shrimp: true },
      { p: 18, nip: true },
      { p: 5, letter: true },
      { p: 9, kibble: 'cluster', magnet: true },
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
      noticeBg: 'rgba(255,255,255,.85)',
      cloud: '#FFFFFF', cloudSoft: '#E8F4FF',
    },
    // จังหวะคนละแบบกับด่านแรก: เจอสิ่งกีดขวางเร็วกว่า พีคอยู่ท่อน 12
    route: [
      { p: 0 },
      { p: 10, kibble: 'cluster', letter: true },
      { p: 8 },
      { p: 16, nip: true },
      { p: 9, kibble: 'alternate', shield: true },
      { p: 6 },
      { p: 12, kibble: 'alternate', magnet: true },
      { p: 2, letter: true },
      { p: 14 },
      { p: 5 },
      { p: 11, shrimp: true },
      { p: 18, letter: true },
      { p: 7, letter: true },
      { p: 4, shield: true },
      { p: 15, nip: true },
      { p: 13, kibble: 'cluster', magnet: true },
      { p: 3 },
      { p: 17, shrimp: true },
      { p: 1, letter: true },
      { p: 9, kibble: 'alternate', nip: true },
    ],
  },

  {
    id: 'cavern',
    name: 'ถ้ำคริสตัล',
    note: 'ลึกใต้ดิน',
    theme: 'cavern',        // หินงอก / เพดานหินย้อย / กองคริสตัล
    bonusTrack: 'skyNight', // ใต้ดินมืด ใช้เพลงชุดกลางคืนให้เข้าโทน
    palette: {
      // ฟ้าถูกแทนด้วย "เพดานถ้ำ" — เข้มที่สุดด้านบน สว่างขึ้นตรงแนวสายตา
      sky: ['#0E1430', '#1E2450', '#3A3670'],
      glow: 'rgba(127,232,255,.34)',    // แสงเรืองจากสายแร่ ไม่ใช่ไฟเตาอบหรือแดด
      speck: 'rgba(190,240,255,.6)',    // ละอองแร่วาววับแทนเกล็ดน้ำตาล
      // ชั้นหินไล่จากไกลไปใกล้ ใกล้สุดต้องเข้มพอให้ปลาสีมิ้นต์ลอยเด่น
      hills: ['#3A3260', '#2C2650', '#221C40'],
      ground: '#4A3B60', crust: '#6E5A87', crustTop: '#8E79A8',
      crumb: 'rgba(30,20,50,.5)',
      pitEdge: 'rgba(14,20,48,.45)',
      pitFill: 'rgba(10,14,34,.74)', pitDeep: 'rgba(5,7,20,.95)',
      // เพดานถ้ำเข้ม ตัวอักษรครีมอ่านออกอยู่แล้ว ไม่ต้องสลับเป็นหมึกเข้มแบบสวนกลางวัน
      ink: '#EAF6FF', inkSoft: '#A9C4DE', accent: '#7FE8FF',
      noticeBg: 'rgba(14,20,48,.78)',
      cloud: '#C9DFF0', cloudSoft: '#94B4CE',
    },
    // จังหวะแน่นกว่าสองด่านแรก เจอของเร็วตั้งแต่ต้นแล้วพักยาวช่วงท้าย
    // (ด่านนี้มาเป็นฉากที่สามของตา ผู้เล่นอุ่นเครื่องมาแล้วจากสองฉากก่อน)
    route: [
      { p: 2 },
      { p: 11, kibble: 'cluster', letter: true },
      { p: 15, nip: true },
      { p: 7 },
      { p: 13, kibble: 'alternate', shield: true },
      { p: 4, letter: true },
      { p: 17, magnet: true },
      { p: 9 },
      { p: 12, kibble: 'cluster', nip: true },
      { p: 5, shrimp: true },
      { p: 18, letter: true },
      { p: 1 },
      { p: 14, kibble: 'alternate', shield: true },
      { p: 8, letter: true },
      { p: 16, nip: true },
      { p: 3 },
      { p: 10, shrimp: true },
      { p: 6, magnet: true },
      { p: 0, letter: true },
      { p: 12, kibble: 'cluster' },
    ],
  },
];

/**
 * ลำดับด่านย่อยของหนึ่งตา — เริ่มจากด่านที่ผู้เล่นเลือก แล้วไล่วนไปจนครบทุกด่าน
 *
 * วนกลับมาที่ด่านแรกเมื่อครบ เพื่อให้ยังเป็น endless runner เหมือนเดิม
 * คนที่วิ่งเก่งจนผ่านครบทุกฉากจึงยังวิ่งต่อได้ ไม่ใช่จบเกมกลางคัน
 */
export function sceneAt(startId, index) {
  const start = STAGES.findIndex((s) => s.id === startId);
  return STAGES[((start < 0 ? 0 : start) + index) % STAGES.length];
}

/** รายชื่อด่านย่อยเรียงตามที่จะเจอจริง ใช้โชว์ในหน้ารายละเอียดด่าน */
export function journeyOf(startId) {
  return STAGES.map((_, i) => sceneAt(startId, i));
}

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
