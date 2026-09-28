// src/report.js
// หน้าแจ้งปัญหา (ตั้งค่า → ช่วยเหลือ → แจ้งปัญหา)
// เลือกหมวด + เล่าปัญหา + แนบรูปได้ไม่เกิน 2 รูป แล้วส่งขึ้น bug_reports (supabase/reports.sql)
// แอดมินอ่านได้จาก admin.html แท็บ "แจ้งปัญหา"

import { sendReport } from './net/cloud.js';

export const REPORT_MAX_IMAGES = 2;
const BODY_MAX = 1000;
// ย่อรูปในเครื่องก่อนส่ง — ภาพแคปจอมือถือเต็มขนาดหลายเมกะไบต์ ส่งช้าและเกินเพดาน 3 MB ของที่เก็บ
const IMG_EDGE = 1600;

/** ย่อรูปให้ด้านยาวไม่เกิน IMG_EDGE แล้วเข้ารหัสเป็น jpg (รูปเล็กอยู่แล้วก็ยังแปลง ได้ชนิดไฟล์เดียวกันหมด) */
async function shrink(file) {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error('bad_image');
  const k = Math.min(1, IMG_EDGE / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas');
  cv.width = Math.round(bmp.width * k);
  cv.height = Math.round(bmp.height * k);
  const c = cv.getContext('2d');
  c.fillStyle = '#fff';            // png ใสแปลงเป็น jpg แล้วพื้นจะดำ — ปูขาวไว้ก่อน
  c.fillRect(0, 0, cv.width, cv.height);
  c.drawImage(bmp, 0, 0, cv.width, cv.height);
  bmp.close?.();
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', 0.85));
}

/** เครื่อง/เบราว์เซอร์/จอ ตอนส่ง — ช่วยตามบั๊กที่เกิดเฉพาะบางเครื่อง */
function deviceInfo() {
  const s = window.screen || {};
  return [
    navigator.userAgent,
    `screen ${s.width}x${s.height}@${window.devicePixelRatio || 1}`,
    `view ${window.innerWidth}x${window.innerHeight}`,
    navigator.language,
  ].join(' · ').slice(0, 500);
}

const SENT_MSG = 'ส่งเรื่องแล้ว ขอบคุณมากนะเหมียว ทีมงานจะรีบดูให้';
const FAIL_MSG = {
  offline: 'ยังต่อเซิร์ฟเวอร์ไม่ได้ ลองเช็คเน็ตแล้วส่งใหม่อีกครั้งนะ',
  limit: 'วันนี้ส่งครบ 5 เรื่องแล้ว พรุ่งนี้ค่อยส่งเพิ่มได้นะ',
  schema: 'ระบบแจ้งปัญหายังไม่เปิดใช้งาน ลองใหม่ภายหลังนะ',
  error: 'ส่งไม่สำเร็จ ลองใหม่อีกครั้งนะ',
};

/**
 * ผูกหน้าแจ้งปัญหา
 * @param {{ open: () => void, close: () => void, sfx: object, unlockAudio: () => void }} h
 *   open/close = สลับแผงไปมาระหว่างหน้าตั้งค่ากับหน้านี้ (main.js เป็นเจ้าของระบบแผง)
 * @returns {() => void} เรียกเพื่อเปิดหน้า (ล้างฟอร์มทุกครั้งที่เข้ามาใหม่หลังส่งสำเร็จ)
 */
export function setupReport({ open, close, sfx, unlockAudio }) {
  const $ = (id) => document.getElementById(id);
  const body = $('reportBody');
  const count = $('reportCount');
  const pics = $('reportPics');
  const file = $('reportFile');
  const send = $('reportSend');
  const msg = $('reportMsg');
  const cats = [...$('reportCats').querySelectorAll('[data-cat]')];

  let category = cats[0].dataset.cat;
  /** @type {{blob: Blob, url: string}[]} */
  let images = [];
  let busy = false;
  let sentOk = false;

  const say = (text, kind = '') => {
    msg.textContent = text;
    msg.className = 'form-msg' + (kind ? ' ' + kind : '');
  };

  const paint = () => {
    const n = Array.from(body.value).length;
    count.textContent = `${n}/${BODY_MAX}`;
    send.disabled = busy || !body.value.trim();
    send.textContent = busy ? 'กำลังส่ง…' : 'ส่งเรื่อง';

    pics.innerHTML = '';
    images.forEach((im, i) => {
      const cell = document.createElement('div');
      cell.className = 'report-pic';
      cell.innerHTML = `<img alt="รูปที่ ${i + 1}">
        <button type="button" class="report-pic-x" aria-label="เอารูปออก">×</button>`;
      cell.querySelector('img').src = im.url;
      cell.querySelector('button').addEventListener('click', () => {
        URL.revokeObjectURL(im.url);
        images.splice(i, 1);
        sfx.fish();
        paint();
      });
      pics.appendChild(cell);
    });
    if (images.length < REPORT_MAX_IMAGES) {
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'report-add';
      add.innerHTML = `<span aria-hidden="true">＋</span><small>แนบรูป ${images.length}/${REPORT_MAX_IMAGES}</small>`;
      add.addEventListener('click', () => { unlockAudio(); file.click(); });
      pics.appendChild(add);
    }
  };

  const reset = () => {
    images.forEach((im) => URL.revokeObjectURL(im.url));
    images = [];
    body.value = '';
    category = cats[0].dataset.cat;
    cats.forEach((b, i) => b.classList.toggle('on', i === 0));
    say('');
    paint();
  };

  cats.forEach((b) => b.addEventListener('click', () => {
    unlockAudio(); sfx.fish();
    category = b.dataset.cat;
    cats.forEach((x) => x.classList.toggle('on', x === b));
  }));

  body.addEventListener('input', () => {
    if (sentOk) { sentOk = false; say(''); }
    paint();
  });

  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    file.value = '';
    if (!f || images.length >= REPORT_MAX_IMAGES) return;
    if (!f.type.startsWith('image/')) return say('แนบได้เฉพาะไฟล์รูปนะ', 'bad');
    try {
      const blob = await shrink(f);
      images.push({ blob, url: URL.createObjectURL(blob) });
      say('');
      paint();
    } catch {
      say('เปิดรูปนี้ไม่ได้ ลองรูปอื่นนะ', 'bad');
    }
  });

  send.addEventListener('click', async () => {
    if (busy || !body.value.trim()) return;
    unlockAudio();
    busy = true;
    say('');
    paint();
    const r = await sendReport({
      category,
      body: Array.from(body.value.trim()).slice(0, BODY_MAX).join(''),
      images: images.map((im) => im.blob),
      device: deviceInfo(),
    });
    busy = false;
    if (r.ok) {
      sfx.potion?.();
      reset();
      sentOk = true;
      say(SENT_MSG, 'good');
    } else {
      say(FAIL_MSG[r.reason] || FAIL_MSG.error, 'bad');
      paint();
    }
  });

  $('reportBack').addEventListener('click', () => {
    unlockAudio();
    close();
  });

  paint();
  return () => {
    // ส่งสำเร็จไปแล้วกลับมาใหม่ = เริ่มฟอร์มว่าง ไม่ค้างข้อความขอบคุณของรอบก่อน
    if (sentOk) { sentOk = false; say(''); }
    open();
    paint();
  };
}
