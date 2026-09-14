// src/intro-video.js
//
// ══ คลิปเปิดเกม ═════════════════════════════════════════════════
//
// เล่นเต็มจอครั้งหนึ่งหลังเข้าสู่ระบบเสร็จ ก่อนถึงล็อบบี้
//   แตะตรงไหนก็ได้ = ข้าม / คลิปจบเอง = ไปต่อ / ติ๊ก "ไม่ต้องแสดงอีก" = ครั้งหน้าข้ามไปล็อบบี้เลย
//
// ── ทำไมวางล็อบบี้ไว้ข้างหลังตั้งแต่ก่อนเล่น ──
// ผู้เรียกพาไปล็อบบี้ก่อน แล้วคลิปคลุมทับอยู่ข้างบน พอปิดคลิปจึงแค่จางออก
// ถ้ารอให้คลิปจบก่อนแล้วค่อยสร้างล็อบบี้ จะมีจังหวะจอว่างแว้บหนึ่งระหว่างสองอย่าง
//
// ── เสียงของคลิป ──
// เบราว์เซอร์ยอมให้เล่นแบบมีเสียงเฉพาะหลังผู้เล่นแตะจอแล้ว ซึ่งทางเข้าที่นี่มาจากการกดปุ่มเสมอ
// แต่ iPhone บางรุ่นยังปฏิเสธได้ — ถ้าโดนปฏิเสธจะเล่นแบบเงียบแทน ดีกว่าจอดำค้างรอให้กด

import { loadPref, savePref } from './storage.js';

const PREF = 'introVideo';     // true = แสดง (ค่าเริ่มต้น) / false = ผู้เล่นขอไม่ดูอีก
const SRC = import.meta.env.BASE_URL + 'opengame.mp4';
const HINT_DELAY = 700;        // ข้อความ "แตะเพื่อข้าม" โผล่หลังคลิปเริ่มนิดหนึ่ง ไม่ทับเฟรมแรก
const FADE_MS = 320;           // ต้องตรงกับ transition ของ .intro-video ใน style.css

export function introVideoEnabled() {
  return loadPref(PREF, true) !== false;
}

export function setIntroVideoEnabled(on) {
  savePref(PREF, !!on);
}

let els = null;

function dom() {
  if (els) return els;
  els = {
    root: document.getElementById('introVideo'),
    video: document.getElementById('introClip'),
    box: document.getElementById('ivOptBox'),
    opt: document.getElementById('ivOptOut'),
    hint: document.getElementById('ivHint'),
  };
  return els;
}

/**
 * โหลดคลิปรอไว้ล่วงหน้า — เรียกตอนเปิดเกม
 * ไฟล์ใหญ่ ถ้าไปเริ่มโหลดตอนกดเข้าเกม บนเน็ตมือถือจะเห็นจอดำรอหลายวินาที
 * คนที่ขอไม่ดูคลิปแล้วไม่ต้องเสียเน็ตโหลดทิ้ง
 */
export function preloadIntroVideo() {
  if (!introVideoEnabled()) return;
  const { video } = dom();
  if (!video.getAttribute('src')) {
    video.preload = 'auto';
    video.src = SRC;
  }
}

/** กำลังเปิดคลิปอยู่ไหม — ให้ปุ่มคีย์บอร์ดของเกมรู้ว่าต้องหยุดฟัง */
export function introVideoOpen() {
  const { root } = dom();
  return !!root && !root.classList.contains('off');
}

/**
 * เล่นคลิป แล้วเรียก onDone ตอนปิด (ข้าม / จบ / เล่นไม่ได้)
 * ถ้าผู้เล่นขอไม่ดูไว้แล้ว เรียก onDone ทันทีโดยไม่โชว์อะไรเลย
 */
export function playIntroVideo({ onOpen = () => {}, onDone = () => {} } = {}) {
  if (!introVideoEnabled()) {
    onDone();
    return;
  }
  const { root, video, box, opt, hint } = dom();
  preloadIntroVideo();

  let closed = false;
  const listeners = [];
  const on = (el, type, fn, opts) => {
    el.addEventListener(type, fn, opts);
    listeners.push(() => el.removeEventListener(type, fn, opts));
  };

  function close() {
    if (closed) return;
    closed = true;
    listeners.forEach((off) => off());
    clearTimeout(hintTimer);
    root.classList.add('closing');
    video.pause();
    onDone();
    // จางออกก่อนแล้วค่อยซ่อนจริง — ล็อบบี้อยู่ข้างหลังพร้อมแล้ว จึงเห็นเป็นคลิปละลายเข้าหน้าแรก
    setTimeout(() => {
      root.classList.add('off');
      root.classList.remove('closing', 'playing', 'hinted');
    }, FADE_MS);
  }

  // ── เปิด ──
  box.checked = false;
  root.classList.remove('off', 'closing', 'playing', 'hinted');
  onOpen();
  try { video.currentTime = 0; } catch { /* ยังไม่มีข้อมูลคลิป ข้ามไป */ }
  video.muted = false;

  const hintTimer = setTimeout(() => root.classList.add('hinted'), HINT_DELAY);

  // เล่นมีเสียงก่อน โดนปฏิเสธค่อยลองแบบเงียบ ถ้ายังไม่ได้อีกก็ปิดไปล็อบบี้เลย
  video.play().catch(() => {
    video.muted = true;
    return video.play();
  }).catch(close);

  // เฟรมแรกขึ้นจริงแล้วค่อยจางคลิปเข้ามา — ช่วงรอโหลดเห็นเป็นพื้นดำนิ่ง ๆ ไม่ใช่กรอบกระตุก
  on(video, 'playing', () => root.classList.add('playing'), { once: true });
  on(video, 'ended', close);
  on(video, 'error', close);

  // ── ข้าม: แตะตรงไหนก็ได้ ยกเว้นช่องติ๊ก ──
  // ใช้ pointerup ไม่ใช่ pointerdown — นิ้วที่แตะปุ่ม "เข้าเกม" แล้วยังไม่ยก
  // จะไปกดข้ามคลิปที่เพิ่งเปิดทันทีโดยไม่ได้ตั้งใจ
  on(root, 'pointerup', (e) => {
    if (opt.contains(e.target)) return;
    close();
  });
  on(window, 'keydown', (e) => {
    if (['Space', 'Enter', 'Escape', 'NumpadEnter'].includes(e.code)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
    }
  }, { capture: true });

  // ── ติ๊ก "ไม่ต้องแสดงอีก" — บันทึกทันที ไม่ต้องรอปิดคลิป ──
  on(box, 'change', () => setIntroVideoEnabled(!box.checked));
  // กันการแตะช่องติ๊กไหลไปถึงตัวคลิปแล้วนับเป็นข้าม
  on(opt, 'pointerup', (e) => e.stopPropagation());
  on(opt, 'click', (e) => e.stopPropagation());
}
