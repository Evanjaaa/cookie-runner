// src/i18n.js
// ─────────────────────────────────────────────────────────────
// สลับภาษาทั้งเกม ไทย ↔ อังกฤษ
//
// ── ทำไมแปลจาก "ข้อความไทย" ไม่ใช่จาก "คีย์" ──
// วิธีมาตรฐานของงาน i18n คือเปลี่ยนข้อความทุกจุดในโค้ดให้เป็นคีย์ (t('shop.buy'))
// แล้วเก็บข้อความจริงไว้ในไฟล์ภาษา ซึ่งถูกต้องกว่าถ้าเริ่มทำตั้งแต่วันแรก
// แต่เกมนี้มีข้อความไทยกระจายอยู่ราว 900 จุด ทั้งใน HTML ตรง ๆ และในไฟล์ข้อมูล
// การไล่เปลี่ยนเป็นคีย์ทั้งหมดคือการแก้เกือบทุกไฟล์ในโปรเจค และระหว่างทาง
// ภาษาไทยซึ่งเป็นภาษาหลักจะอ่านไม่ออกจากโค้ดอีกเลย (เห็นแต่คีย์)
//
// ที่นี่จึงใช้ "ข้อความไทยเป็นคีย์" แทน: โค้ดเดิมไม่ต้องแก้สักบรรทัด ภาษาไทย
// ยังเป็นภาษาต้นทางที่อ่านออกจากโค้ดเหมือนเดิม และเพิ่มภาษาใหม่ = เพิ่มไฟล์
// พจนานุกรมอีกไฟล์เท่านั้น ข้อเสียคือถ้าคำไทยคำเดียวกันต้องแปลต่างกันสองที่
// จะแยกไม่ได้ — ตรวจแล้วในเกมนี้ไม่มีกรณีนั้น
//
// ── แล้วข้อความที่ต่อกันกลางอากาศล่ะ ──
// อย่าง 'ปลดล็อก ' + ชื่อแมว + ' แล้ว' พจนานุกรมแบบเทียบทั้งประโยคจับไม่ได้
// จึงมีชั้นที่สอง: กฎ regex ที่จับรูปประโยคแล้วแปลเฉพาะส่วนที่คงที่
// ส่วนที่จับมาได้ (ชื่อแมว) ถูกส่งกลับเข้า t() อีกรอบ ชื่อจึงถูกแปลตามไปด้วย
// ─────────────────────────────────────────────────────────────

import { loadPref, savePref } from './storage.js';
import { EN, EN_RULES } from './i18n-en.js';

const PREF = 'lang';
export const LANGS = ['th', 'en'];

let lang = LANGS.includes(loadPref(PREF, 'th')) ? loadPref(PREF, 'th') : 'th';

export function getLang() {
  return lang;
}

/**
 * แปลข้อความหนึ่งชิ้น
 * ภาษาไทยคืนค่าเดิมเสมอ (ไม่มีอะไรให้แปล) — ฟังก์ชันนี้จึงปลอดภัยที่จะเรียกทุกที่
 */
export function t(s) {
  if (lang === 'th' || typeof s !== 'string') return s;

  const raw = s.trim();
  if (!raw) return s;

  // ช่องว่างหน้า-หลังต้องรักษาไว้ ไม่งั้นข้อความที่ตั้งใจเว้นวรรคจะติดกัน
  const pre = s.slice(0, s.indexOf(raw[0]));
  const post = s.slice(pre.length + raw.length);

  const exact = EN[raw];
  if (exact !== undefined) return pre + exact + post;

  // ข้อความยาวใน HTML ถูกตัดบรรทัดตามความกว้างของโค้ด ตัวโหนดจริงจึงมีขึ้นบรรทัดใหม่
  // กับช่องว่างย่อหน้าปนอยู่กลางประโยค เทียบแบบยุบช่องว่างให้เหลือช่องเดียวก่อน
  // พจนานุกรมจึงเก็บประโยคเดียวไม่ต้องสนใจว่าโค้ดตัดบรรทัดตรงไหน
  const norm = raw.replace(/\s+/g, ' ');
  if (norm !== raw && EN[norm] !== undefined) return pre + EN[norm] + post;

  for (const rule of EN_RULES) {
    const m = raw.match(rule.re);
    if (!m) continue;
    // $1 $2 ... ในข้อความปลายทางรับค่าที่จับได้ โดยส่งเข้า t() ซ้ำอีกชั้น
    // ชื่อของ (ชื่อแมว ชื่อชุด) จึงถูกแปลตามไปด้วยโดยไม่ต้องเขียนกฎซ้ำทุกชื่อ
    const out = rule.en.replace(/\$(\d)/g, (_, i) => t(m[Number(i)] || ''));
    return pre + out + post;
  }

  return s;   // ยังไม่มีคำแปล = ปล่อยไทยไว้ ดีกว่าโชว์คีย์หรือช่องว่าง
}

// ── กวาดแปลทั้งหน้า ─────────────────────────────────────────
//
// เก็บ "ต้นฉบับภาษาไทย" ของทุกจุดที่แตะไว้ใน WeakMap เพื่อให้สลับกลับได้จริง
// ถ้าแปลทับไปเลยโดยไม่เก็บต้นฉบับ พอกดกลับเป็นไทยจะไม่เหลืออะไรให้กลับไปหา
// (WeakMap = โหนดถูกลบทิ้งเมื่อไหร่ ค่าที่จำไว้ก็หายตามเอง ไม่รั่ว)

const original = new WeakMap();
const ATTRS = ['aria-label', 'placeholder', 'title'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'CANVAS']);

function fixText(node) {
  let th = original.get(node);
  if (th === undefined) {
    th = node.data;
    original.set(node, th);
  }
  const next = lang === 'en' ? t(th) : th;
  if (node.data !== next) node.data = next;
}

function fixAttrs(el) {
  for (const name of ATTRS) {
    if (!el.hasAttribute(name)) continue;
    const key = el.__i18nAttr || (el.__i18nAttr = {});
    if (key[name] === undefined) key[name] = el.getAttribute(name);
    const next = lang === 'en' ? t(key[name]) : key[name];
    if (el.getAttribute(name) !== next) el.setAttribute(name, next);
  }
}

/** แปล (หรือคืนค่าเป็นไทย) ทุกอย่างในกิ่งที่ให้มา */
export function applyLang(root = document.body) {
  if (!root) return;

  if (root.nodeType === 3) {
    fixText(root);
    return;
  }
  if (root.nodeType !== 1) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(n) {
      if (n.nodeType === 1) {
        return SKIP.has(n.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
      return n.data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  if (root.nodeType === 1) fixAttrs(root);
  let n = walker.nextNode();
  while (n) {
    if (n.nodeType === 3) fixText(n);
    else fixAttrs(n);
    n = walker.nextNode();
  }
}

// ── ของที่วาดลง canvas ──────────────────────────────────────
// canvas ไม่มีโหนดข้อความให้กวาด จึงต้องวาดใหม่เอง ใครที่วาดตัวอักษรลงผ้าใบ
// มาสมัครไว้ที่นี่ แล้วจะถูกเรียกทุกครั้งที่ภาษาเปลี่ยน
const listeners = new Set();
export function onLang(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setLang(next) {
  if (!LANGS.includes(next) || next === lang) return;
  lang = next;
  savePref(PREF, lang);
  document.documentElement.lang = lang === 'en' ? 'en' : 'th';
  applyLang(document.body);
  for (const fn of listeners) {
    try {
      fn(lang);
    } catch {
      /* คนฟังคนหนึ่งพังห้ามลามไปหยุดคนอื่น */
    }
  }
}

/**
 * เฝ้าดูของที่ถูกสร้างใหม่ แล้วแปลให้เอง
 *
 * รายการเกือบทุกหน้าในเกมถูกสร้างใหม่ด้วย JS ตอนเปิดหน้า (การ์ดชุด ภารกิจ จดหมาย
 * รางวัลเลเวล ฯลฯ) ถ้าแปลแค่ตอนกดเปลี่ยนภาษา ของพวกนี้จะกลับเป็นไทยทันทีที่ถูกสร้างใหม่
 * ดักที่ "มีโหนดใหม่โผล่" จุดเดียวจึงครอบคลุมทุกหน้าโดยไม่ต้องไปแก้โค้ดที่สร้างมันเลย
 *
 * ทำงานเฉพาะตอนเป็นภาษาอื่นที่ไม่ใช่ไทย — เล่นภาษาไทยอยู่ไม่ต้องเสียแรงกวาดอะไรเลย
 */
export function watchLang(root) {
  if (!root) return;
  let queued = null;
  // ── ทำไมต้องกองไว้ในตะกร้าใบเดียว ──
  // เคยเขียนเป็น "ถ้าจองคิวไว้แล้วก็ข้าม" ซึ่งทิ้งของที่โผล่มาหลังจากนั้นทั้งหมด
  // รายการอย่างหน้ารางวัลเลเวลสร้าง 98 แถวเป็นหลายร้อยชุดในเฟรมเดียว
  // ผลคือแปลแค่ชุดแรกแล้วที่เหลือเป็นไทยค้างทั้งหน้า (วัดแล้ว: เหลือไทย 296 จุด)
  const pending = [];

  const obs = new MutationObserver((records) => {
    if (lang === 'th') return;
    for (const r of records) {
      if (r.type === 'characterData') pending.push(r.target);
      else for (const n of r.addedNodes) pending.push(n);
    }
    if (!pending.length || queued) return;

    // ── รวบแปลทีเดียวต่อเฟรม ไม่ใช่ทุกครั้งที่มีโหนดโผล่ ──
    // นัดสองทางแล้วใครถึงก่อนได้ทำ: rAF ให้ทันก่อนวาดจอถัดไป (ไม่เห็นไทยแวบ)
    // ส่วน setTimeout เป็นตาข่ายกัน — rAF ไม่ทำงานเลยถ้าแท็บถูกพักไว้ข้างหลัง
    // ซึ่งจะทำให้ของที่สร้างตอนนั้นค้างเป็นไทยจนกว่าจะกลับมาดูแท็บ
    queued = true;
    let done = false;
    const flush = () => {
      if (done) return;
      done = true;
      queued = null;
      const batch = pending.splice(0, pending.length);
      for (const n of batch) {
        // โหนดที่ถูกถอดออกไปแล้วระหว่างรอ ไม่ต้องเสียแรงแปล
        if (n.isConnected) applyLang(n);
      }
    };
    requestAnimationFrame(flush);
    setTimeout(flush, 60);
  });

  obs.observe(root, { subtree: true, childList: true, characterData: true });
}
