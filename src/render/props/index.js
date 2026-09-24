// src/render/props/index.js
// รวมตัววาดสิ่งกีดขวางชุดใหม่ทุกด่าน: id (ตรงกับ PROP_OBSTACLES ใน src/obstacles.js) → ฟังก์ชันวาด
// ฟังก์ชันวาดรับ (ctx, x, y, w, h) = กล่องชนในพิกัดจอ แล้ววาดให้พอดีกล่องนั้น
// เพิ่มชิ้นใหม่: ใส่ชื่อ/ขนาดในทะเบียน src/obstacles.js แล้วเพิ่มตัววาดในไฟล์ของด่านนั้น
import kitchen from './kitchen.js';
import garden from './garden.js';
import cave from './cave.js';
import beach from './beach.js';
import space from './space.js';
import snow from './snow.js';

export const PROP_ART = {
  ...kitchen,
  ...garden,
  ...cave,
  ...beach,
  ...space,
  ...snow,
};
