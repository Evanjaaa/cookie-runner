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
//
// ── คลิปมีสองแบบ ──
//   'anim'  วาดด้วยโค้ด (intro-anim.js) — คม ไม่ต้องโหลดไฟล์ จบด้วยแสงขาวแล้วหน้าแรกจางออกจากสีขาว
//   'video' ไฟล์ opengame.mp4 — แบบเดิม เก็บไว้เป็นทางสำรอง เปลี่ยน CLIP บรรทัดเดียวก็กลับไปใช้ได้
// ปุ่มข้าม ช่องติ๊ก "ไม่ต้องแสดงอีก" และสวิตช์ในหน้าตั้งค่า ใช้ร่วมกันทั้งสองแบบ

import { loadPref, savePref } from './storage.js';
import { playIntroAnim, introSoundEnabled, setIntroSoundEnabled, prepareIntroSound } from './intro-anim.js';
import { whenAudioAwake } from './audio.js';

// ส่งต่อให้หน้าตั้งค่า — ค่าตัวจริงอยู่กับตัวคลิป (intro-anim.js) ซึ่งเป็นคนใช้มัน
// แต่ทุกอย่างของ "คลิปเปิดเกม" ควรเรียกผ่านประตูเดียวกัน ไม่ต้องรู้ว่าข้างในแบ่งไฟล์ยังไง
export { introSoundEnabled, setIntroSoundEnabled };

const CLIP = 'anim';
const PREF = 'introVideo';     // true = แสดง (ค่าเริ่มต้น) / false = ผู้เล่นขอไม่ดูอีก
const SRC = import.meta.env.BASE_URL + 'opengame.mp4';
const HINT_DELAY = 700;        // ข้อความ "แตะเพื่อข้าม" โผล่หลังคลิปเริ่มนิดหนึ่ง ไม่ทับเฟรมแรก
const FADE_MS = 320;           // ต้องตรงกับ transition ของ .intro-video ใน style.css
// จบคลิปโค้ดเองจนสุด = จอขาวล้วน แล้วจางออกช้ากว่าตอนกดข้ามเกือบสามเท่า
// ช้าพอให้อ่านเป็น "แสงค่อย ๆ จางเผยหน้าแรก" ไม่ใช่จอกระพริบ (ต้องตรงกับ .closing-white)
const FADE_WHITE_MS = 900;

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
    anim: document.getElementById('introAnim'),
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
  // คลิปโค้ดไม่มีไฟล์วิดีโอให้โหลด มีแต่ไฟล์เสียงสองตัว (รวมไม่ถึง 0.7 MB)
  // โหลดรอไว้ด้วยตัวเล่นจริงเลย เพลงจะได้ดังพร้อมเฟรมแรกของคลิป (ดู prepareIntroSound)
  if (CLIP === 'anim') {
    // ── ห้ามเตรียมก่อนผู้ใช้แตะจอ ──
    // การเตรียมคือการต่อไฟล์เสียงเข้ากราฟเสียง ซึ่ง iOS ถือว่าเป็นการเริ่มใช้ระบบเสียง
    // ทำตั้งแต่ตอนเปิดหน้า = ทั้งเกมเงียบสนิทบน iPhone (ดู whenAudioAwake ใน audio.js)
    // ฝากไว้ให้ทำทันทีที่เสียงตื่น ซึ่งยังเร็วกว่าตอนคลิปเริ่มเล่นอยู่มาก
    whenAudioAwake(prepareIntroSound);
    return;
  }
  const { video } = dom();
  if (!video.getAttribute('src')) {
    video.preload = 'auto';
    video.src = SRC;
  }
}

/**
 * คลิปคลุมจอทึบอยู่ไหม — ให้ลูปเกมพักวาดหน้าแรกข้างใต้
 *
 * ── ทำไมต้องพัก ──
 * ชั้นคลิปทึบทั้งจอ แต่เกมยังวาดหน้าแรกเต็มความละเอียดอยู่ข้างใต้ทุกเฟรม
 * วัดในหน้าเกมจริงแล้วคลิปโค้ดเหลือ 20 fps ทั้งที่เล่นเดี่ยว ๆ ได้ 57 fps
 * เพราะสองงานวาดแย่งเครื่องกันโดยที่งานหนึ่งไม่มีใครเห็นเลย
 *
 * ตอนกำลังจางออก (closing) ต้องตอบ false — หน้าแรกกำลังโผล่ขึ้นมาให้เห็น
 * ถ้ายังพักอยู่ จะเห็นหน้าแรกเป็นภาพนิ่งค้างแล้วค่อยกระตุกขยับทีหลัง
 */
export function introCovering() {
  const { root } = dom();
  return !!root && !root.classList.contains('off')
    && !root.classList.contains('closing') && !root.classList.contains('closing-white');
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
  const { root, video, box, opt, hint, anim } = dom();
  preloadIntroVideo();

  let closed = false;
  let stopAnim = null;
  const listeners = [];
  const on = (el, type, fn, opts) => {
    el.addEventListener(type, fn, opts);
    listeners.push(() => el.removeEventListener(type, fn, opts));
  };

  /** white = คลิปโค้ดเล่นจนจบ (จอขาวอยู่แล้ว) — จางออกช้า ๆ ให้หน้าแรกค่อย ๆ โผล่จากแสงขาว */
  function close(white = false) {
    if (closed) return;
    closed = true;
    listeners.forEach((off) => off());
    clearTimeout(hintTimer);
    stopAnim?.();
    root.classList.add(white === true ? 'closing-white' : 'closing');
    video.pause();
    onDone();
    // จางออกก่อนแล้วค่อยซ่อนจริง — ล็อบบี้อยู่ข้างหลังพร้อมแล้ว จึงเห็นเป็นคลิปละลายเข้าหน้าแรก
    setTimeout(() => {
      root.classList.add('off');
      root.classList.remove('closing', 'closing-white', 'playing', 'hinted', 'anim', 'ending');
    }, white === true ? FADE_WHITE_MS : FADE_MS);
  }

  // ── เปิด ──
  box.checked = false;
  root.classList.remove('off', 'closing', 'closing-white', 'playing', 'hinted', 'anim', 'ending');
  onOpen();

  const hintTimer = setTimeout(() => root.classList.add('hinted'), HINT_DELAY);

  if (CLIP === 'anim') {
    root.classList.add('anim', 'playing');
    // คลิปโค้ดเริ่มจากจอดำแล้วจางเข้าเองในตัว ไม่ต้องรอเฟรมแรกเหมือนวิดีโอ
    try {
      stopAnim = playIntroAnim(anim, {
        // แสงขาวเริ่มบาน = ซ่อนป้ายที่ลอยทับคลิป ไม่ให้ค้างลอยอยู่บนจอขาวตอนส่งเข้าหน้าแรก
        onShine: () => root.classList.add('ending'),
        onDone: () => close(true),
      });
    } catch (err) {
      // วาดไม่ได้ด้วยเหตุผลใดก็ตาม ต้องไม่ค้างจอดำ — ไปหน้าแรกเลย
      console.error('intro anim', err);
      close();
    }
  } else {
    try { video.currentTime = 0; } catch { /* ยังไม่มีข้อมูลคลิป ข้ามไป */ }
    video.muted = false;

    // เล่นมีเสียงก่อน โดนปฏิเสธค่อยลองแบบเงียบ ถ้ายังไม่ได้อีกก็ปิดไปล็อบบี้เลย
    video.play().catch(() => {
      video.muted = true;
      return video.play();
    }).catch(close);

    // เฟรมแรกขึ้นจริงแล้วค่อยจางคลิปเข้ามา — ช่วงรอโหลดเห็นเป็นพื้นดำนิ่ง ๆ ไม่ใช่กรอบกระตุก
    on(video, 'playing', () => root.classList.add('playing'), { once: true });
    on(video, 'ended', close);
    on(video, 'error', close);
  }

  // ── ข้าม: แตะตรงไหนก็ได้ ยกเว้นช่องติ๊ก ──
  // ใช้ pointerup ไม่ใช่ pointerdown — นิ้วที่แตะปุ่ม "เข้าเกม" แล้วยังไม่ยก
  // จะไปกดข้ามคลิปที่เพิ่งเปิดทันทีโดยไม่ได้ตั้งใจ
  on(root, 'pointerup', (e) => {
    if (opt.contains(e.target)) return;
    close(false);
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
