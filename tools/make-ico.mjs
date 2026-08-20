// tools/make-ico.mjs
// ห่อ favicon-32.png ให้เป็น .ico
//
// เบราว์เซอร์สมัยใหม่ใช้ <link rel="icon"> ที่ประกาศไว้ใน index.html อยู่แล้ว
// ไฟล์นี้มีไว้กัน 404 จากตัวที่ยังยิงหา /favicon.ico ตรง ๆ โดยไม่อ่าน HTML
// (บอต, ตัวดึงลิงก์พรีวิว, เบราว์เซอร์เก่า)
//
// รูปแบบ ICO ตั้งแต่ Vista รับข้อมูล PNG ทั้งก้อนได้เลย ไม่ต้องแปลงเป็น BMP
// จึงเหลือแค่ประกอบหัวไฟล์ 22 ไบต์แล้วต่อ PNG เดิมท้ายเข้าไป
import { readFileSync, writeFileSync } from 'fs';

const png = readFileSync(new URL('../public/favicon-32.png', import.meta.url));

const head = Buffer.alloc(22);
head.writeUInt16LE(0, 0);            // สงวนไว้ ต้องเป็นศูนย์
head.writeUInt16LE(1, 2);            // 1 = ไอคอน (2 = เคอร์เซอร์)
head.writeUInt16LE(1, 4);            // มีภาพเดียวในไฟล์
head.writeUInt8(32, 6);              // กว้าง
head.writeUInt8(32, 7);              // สูง
head.writeUInt8(0, 8);               // จำนวนสีในจานสี 0 = ไม่ใช้จานสี
head.writeUInt8(0, 9);               // สงวนไว้
head.writeUInt16LE(1, 10);           // color plane
head.writeUInt16LE(32, 12);          // บิตต่อพิกเซล
head.writeUInt32LE(png.length, 14);  // ขนาดข้อมูลภาพ
head.writeUInt32LE(22, 18);          // ออฟเซ็ตที่ข้อมูลภาพเริ่ม = ขนาดหัวไฟล์

writeFileSync(new URL('../public/favicon.ico', import.meta.url), Buffer.concat([head, png]));
console.log('เขียน public/favicon.ico แล้ว (' + (22 + png.length) + ' ไบต์)');
