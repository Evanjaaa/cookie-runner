// src/news.js
// ข่าวสาร (ปุ่มโทรโข่งหน้าแรก) — ดึงจากตาราง news, จำว่าอ่านข่าวไหนไปแล้ว, วาดหน้าข่าว
// แอดมินเพิ่ม/แก้ข่าวจาก admin.html แท็บ "ข่าวสาร" ฝั่งเกมอ่านอย่างเดียว

import { fetchNews } from './net/cloud.js';
import { loadPref, savePref } from './storage.js';

// เก็บข่าวชุดล่าสุดไว้ในเครื่อง — เปิดหน้าข่าวตอนออฟไลน์/เน็ตช้ายังเห็นของเดิมทันที
// เขียน localStorage ตรง ไม่ผ่าน savePref เพราะเป็นแค่สำเนาจากคลาวด์ ไม่ใช่ความคืบหน้า
// (savePref ปลุกชั้นซิงก์ให้ดันขึ้นคลาวด์ ซึ่งไม่มีประโยชน์กับของชิ้นนี้)
const CACHE_KEY = 'cookie-runner:news-cache';
const SEEN_KEY = 'newsSeen';
// ดึงใหม่ไม่ถี่กว่านี้ตอนแค่กลับมาหน้าแรก (กดเปิดหน้าข่าวเองจะดึงเสมอ)
const REFRESH_MS = 60_000;

let list = (() => {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
    return Array.isArray(c) ? c : [];
  } catch { return []; }
})();
let lastFetch = 0;

const seen = () => new Set(loadPref(SEEN_KEY, []));

export const newsList = () => list;

/** จำนวนข่าวที่ยังไม่เคยเปิดอ่าน */
export function newsUnread() {
  const s = seen();
  return list.filter((n) => !s.has(n.id)).length;
}

export function markNewsSeen(id) {
  const s = seen();
  if (s.has(id)) return;
  s.add(id);
  // เก็บเฉพาะ id ที่ยังมีข่าวอยู่ รายการจำจะได้ไม่บวมไปเรื่อย ๆ
  const live = new Set(list.map((n) => n.id));
  savePref(SEEN_KEY, [...s].filter((x) => live.has(x)));
}

/**
 * ดึงข่าวจากคลาวด์ — คืน true เมื่อรายการเปลี่ยน
 * อ่านไม่ได้ (null) = คงของเดิมไว้ ไม่ล้างทิ้ง
 */
export async function syncNews(force = false) {
  if (!force && Date.now() - lastFetch < REFRESH_MS) return false;
  lastFetch = Date.now();
  const got = await fetchNews();
  if (!got) return false;
  const changed = JSON.stringify(got) !== JSON.stringify(list);
  list = got;
  if (changed) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(got)); } catch {} }
  return changed;
}

// ── วาด ────────────────────────────────────────────────────

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** "28 ก.ย. 2569" — ปีพุทธศักราชตามที่คนไทยคุ้น */
export function newsDate(d) {
  const t = new Date(d + 'T00:00:00');
  if (Number.isNaN(t.getTime())) return '';
  return t.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** เนื้อข่าว: เว้นบรรทัดว่าง = ย่อหน้าใหม่, ขึ้นบรรทัดเดียว = <br> */
function bodyHTML(text) {
  return String(text || '').trim().split(/\n\s*\n/)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
}

// ภาพแทนตอนข่าวไม่มีรูป / รูปโหลดไม่ขึ้น — โทรโข่งตัวใหญ่บนพื้นไล่สี ไม่ใช่กรอบว่าง
const NO_IMAGE = `<div class="news-noimg" aria-hidden="true">
  <svg viewBox="0 0 24 24"><path d="M3.4 9.6v4.8a1.4 1.4 0 0 0 1.4 1.4h2.4l7.6 4.2a.9.9 0 0 0 1.3-.8V4.8a.9.9 0 0 0-1.3-.8L7.2 8.2H4.8a1.4 1.4 0 0 0-1.4 1.4Z" fill="currentColor"/><path d="M7.4 15.9 8.6 20.6M19.2 9.2a3.6 3.6 0 0 1 0 5.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
</div>`;

/**
 * วาดหน้าข่าว: รายการหัวข้อ (ซ้าย) + ข่าวที่เลือก (ขวา)
 * คืน id ข่าวที่กำลังโชว์ (null = ไม่มีข่าว) ให้คนเรียกไปนับว่าอ่านแล้ว
 */
export function renderNews(listEl, viewEl, pickId, onPick) {
  if (!list.length) {
    listEl.innerHTML = '';
    listEl.classList.add('hidden');
    viewEl.innerHTML = `<div class="news-empty">${NO_IMAGE}
      <b>ยังไม่มีข่าวใหม่</b><span>มีประกาศหรือกิจกรรมเมื่อไหร่ จะมาบอกตรงนี้นะเหมียว</span></div>`;
    return null;
  }
  listEl.classList.remove('hidden');
  const cur = list.find((n) => n.id === pickId) || list[0];
  const s = seen();

  // ── ตามแบบที่วางไว้ (ของตกแต่งอยู่ใน public/news-deco/ — ตัดมาจากไฟล์ SVG ที่ออกแบบใน Canva) ──
  // รายการ: รูปย่อใหญ่ซ้าย + ป้าย/หัวข้อ/วันที่ขวา · ข่าวปักหมุด = หมุดแดงปักมุมขวาบนของการ์ด (แทนป้ายคำว่าปักหมุด)
  listEl.innerHTML = list.map((n) => `
    <button type="button" class="news-item${n.id === cur.id ? ' on' : ''}${n.pinned ? ' pinned' : ''}" data-id="${esc(n.id)}">
      ${n.image ? `<img class="news-thumb" src="${esc(n.image)}" alt="" loading="lazy">` : `<span class="news-thumb blank"></span>`}
      <span class="news-item-txt">
        <span class="news-item-meta"><span class="news-tag">${esc(n.tag)}</span></span>
        <b>${esc(n.title)}</b>
        <small>${newsDate(n.date)}</small>
      </span>
      ${n.pinned ? '<img class="news-pinimg" src="/news-deco/pin.png" alt="ปักหมุด">' : ''}
      ${s.has(n.id) || n.id === cur.id ? '' : '<i class="news-new" aria-label="ใหม่"></i>'}
    </button>`).join('');

  // ฝั่งอ่าน: รอยเท้าแมวชมพู-ม่วงมุมซ้ายบน · ป้าย+วันที่ชิดขวาบน · รูปในกรอบม่วงอ่อน
  // · หัวข้อมีเส้นขีดใต้ · เนื้อข่าว · เส้นประรอยเท้ามุมขวาล่าง (พื้นหลังของกรอบ ดู .news-view)
  viewEl.innerHTML = `
    <div class="news-top">
      <img class="news-paws" src="/news-deco/paws.webp" alt="" aria-hidden="true">
      <div class="news-meta"><span class="news-tag">${esc(cur.tag)}</span><time>${newsDate(cur.date)}</time></div>
    </div>
    <div class="news-hero">${cur.image
      ? `<img src="${esc(cur.image)}" alt="${esc(cur.title)}">`
      : NO_IMAGE}</div>
    <h3 class="news-title"><span>${esc(cur.title)}</span></h3>
    <div class="news-body">${bodyHTML(cur.body)}</div>`;
  viewEl.scrollTop = 0;

  // รูปเสีย/ลิงก์ตาย → เปลี่ยนเป็นภาพแทน ไม่ปล่อยไอคอนรูปแตกไว้กลางหน้า
  const hero = viewEl.querySelector('.news-hero img');
  if (hero) hero.addEventListener('error', () => { hero.parentElement.innerHTML = NO_IMAGE; }, { once: true });
  listEl.querySelectorAll('img.news-thumb').forEach((img) =>
    img.addEventListener('error', () => img.replaceWith(Object.assign(document.createElement('span'), { className: 'news-thumb blank' })), { once: true }));

  listEl.querySelectorAll('.news-item').forEach((b) =>
    b.addEventListener('click', () => onPick(b.dataset.id)));
  return cur.id;
}
