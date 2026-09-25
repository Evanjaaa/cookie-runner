// src/main.js
import './style.css';
import { VIEW, SCORING, REVIVE, BODY } from './config.js';
import { Game, STATE, LOVE_BTN, CAT_TAP } from './game.js';
import { setupInput } from './input.js';
import { unlockAudio, getMix, setMix, gameMuted, sfx, killSfx } from './audio.js';
import { startMusic, stopMusic, primeMusicFile } from './music.js';
import { SKINS, getSkin, setSkin, ownsSkin, unlockSkin, skinById } from './skins.js';
import {
  CUSTOM_ID, REGIONS, SWATCHES, BLANK, palette, paint, setPalette,
  pickSkin, regionAt, toSkin,
  stroke as strokeLayer, erase as eraseLayer, clearLayers, saveLayers,
  snapshotLayers, restoreLayers, LAYER,
} from './paint.js';
import { STAGES, getStage, setStage, journeyOf } from './stages.js';
import {
  RARITY, OUTFITS, outfitById, wearable, setOutfit, pullPool, ownedCount, isOwned, OUTFIT_COST,
  ownedOrder as outfitOrder,
} from './outfits.js';
import { getGold, addGold, pull, MULTI_PULLS, GOLD_RATE, DUPE_REFUND } from './gacha.js';
import { loadBest, loadPref, savePref, loadSkinsOwned } from './storage.js';
import { getFace, hasFace, saveFace, clearFace, setDraft, FACE_SIZE } from './face.js';
import { levelFromXp, loadXp, awardRun, LEVEL_CAP } from './progress.js';
import {
  FIRST_REWARD_LEVEL, rewardFor, isClaimed, canClaim, claim as claimLevel,
  claimableCount as lvClaimableCount, claimAll as claimAllLevels, TALENT_AT,
} from './level-rewards.js';
import { CYCLE, rewardOfDay, dayState, claimToday as claimDaily } from './daily.js';
import { getLang, setLang, applyLang, watchLang, onLang } from './i18n.js';
import { quality, gfxLevel, setGfxLevel, onQuality, LEVEL_IDS } from './graphics.js';
import {
  getGems, addGems, ownsTreasure, treasureLevel, ownedCount as treasureCount,
  pullTreasure, upgradeTreasure, getEquipped, isEquipped, toggleEquip,
  ownedOrder as treasureOrder,
} from './vault.js';
import {
  TREASURES, treasureById, T_RARITY, UPGRADE, GACHA as T_GACHA, SLOTS,
  effectText, triggerText,
} from './treasures.js';
// นำเข้าแบบธรรมดาได้ ไม่ลาก SDK ของ Supabase ตามมา — cloud.js เองก็ import
// ตัว SDK แบบไดนามิกอยู่ข้างใน มันจึงถูกแยกเป็นไฟล์ต่างหากไม่ว่าใครจะเรียกยังไง
import {
  cloudReady, userId, currentAccount, pushName, fetchLeaderboard,
  sendLoginCode, verifyLoginCode, sendLinkCode, verifyLinkCode, signOut,
  fetchMyFriendCode, fetchProfileByCode, claimName,
  friendStatus, sendFriendRequest, respondFriendRequest, cancelFriendRequest, removeFriend,
  fetchFriends, fetchFriendRequests, countFriendRequests, searchPlayers,
} from './net/cloud.js';
import { drawCatPose, drawCatFace, drawObstacles } from './render/entities.js';
import { drawSky, drawHills, drawGround, GROUND_ART } from './render/background.js';
import { drawChest, CHEST } from './render/chest.js';
import {
  loadInbox, mailById, badgeCount, markRead, claimMail, claimAll, clearReadMail, syncMail,
} from './mail.js';
import { recordRun, recordPulls, recordUpgrade, loadStats } from './stats.js';
import { loadStatus, saveStatus, statusWords, cleanStatus, STATUS_WORDS } from './profile.js';
import {
  startPresence, publishProfile, onlineInfo, normalizeCode, reasonText, FRIEND_CODE_LEN,
} from './friends.js';
import { QUESTS, questList, questState, claimQuest, claimableCount, seasonText } from './quests.js';
import { canPet, markPetted, rollPetGift, petLeftMs, petLeftText } from './pet.js';
import { setupTalentUI, RANKS as T_RANKS } from './talent-ui.js';
import { talentById, TALENTS, isUnlocked as talentUnlocked } from './talents.js';
import { SKILLS, isSkillUnlocked } from './skills.js';
import { registerFresh, isFresh, hasFresh, markSeen, onFresh, setDot } from './fresh.js';
import { setupSkillUI } from './skill-ui.js';
import { HOME_MOVES } from './home-moves.js';
import {
  playIntroVideo, preloadIntroVideo, introVideoOpen, introVideoEnabled, setIntroVideoEnabled, introCovering,
  introSoundEnabled, setIntroSoundEnabled,
} from './intro-video.js';   // หน้าพรสวรรค์ (ข้อมูลใน talents.js ผลตอนวิ่งใน talent-run.js)
import { setupDebug, TESTER_CODES } from './debug.js';   // แผงปุ่มทดสอบชั่วคราว ลบได้ทั้งบรรทัด

const { W, H } = VIEW;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

/**
 * ตั้งความละเอียดจริงของ canvas ให้เท่ากับจำนวนพิกเซลที่จอมีให้ตรงนั้น
 *
 * เดิมคูณด้วย DPR อย่างเดียว ซึ่งพลาดตอนกรอบเกมถูกขยายให้ใหญ่กว่า 960 จริง ๆ
 * เช่นจอ 1080p (DPR 1) ที่กรอบกว้าง 1560px — คูณ DPR ได้บัฟเฟอร์แค่ 960
 * แล้วโดนยืดขึ้นมา 1.6 เท่า = ภาพแตกทั้งที่จอไม่ได้ความละเอียดสูงด้วยซ้ำ
 *
 * คิดจากความกว้างที่โชว์จริงคูณ DPR แทน จึงพอดีกับจอเสมอไม่ว่ากรอบจะใหญ่แค่ไหน
 * เพดาน 2 เท่ายังอยู่ เพราะเอฟเฟกต์แสงฟุ้งทำงานกับทั้งเฟรมทุกเฟรม
 * ปล่อยให้โตเกินนั้นเฟรมจะตกบนเครื่องที่ไม่แรง
 */
function fitDPR() {
  const dpr = window.devicePixelRatio || 1;
  const shown = canvas.clientWidth || W;   // 0 ได้ตอน CSS ยังไม่ทันมา
  // เพดานมาจากระดับกราฟิกที่ผู้เล่นเลือก (ดู src/graphics.js) — ตัวที่กินแรงเครื่องที่สุด
  const scale = Math.min(quality().scale, Math.max(1, (shown * dpr) / W));

  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}
fitDPR();

// resize อย่างเดียวไม่พอ — กรอบเกมเปลี่ยนขนาดได้จากหลายทางที่ไม่ยิง resize
// เช่นเข้า/ออกเต็มจอ หรือแถบที่อยู่ของเบราว์เซอร์มือถือหด แล้ว dvh ขยับ
new ResizeObserver(fitDPR).observe(canvas);
// เปลี่ยนระดับกราฟิกแล้วต้องตั้งขนาดผ้าใบใหม่ทันที ไม่ต้องรอ resize หรือรีโหลด
onQuality(fitDPR);

const startPanel = document.getElementById('startPanel');
const overPanel = document.getElementById('overPanel');
const pausePanel = document.getElementById('pausePanel');
const stagePanel = document.getElementById('stagePanel');
const stageInfoPanel = document.getElementById('stageInfoPanel');
// ── คลังน้อง ──
// ชุดกับสมบัติอยู่ในแผงเดียวกันแล้ว สองชื่อนี้จึงชี้ที่เดียวกันโดยตั้งใจ
//
// หน้ารายละเอียด (odPanel / tDetailPanel) ใช้ตัวแปรพวกนี้เป็น "แผงที่ต้องกลับไป"
// อยู่แล้ว การให้ชี้คลังน้องทั้งคู่จึงทำให้ปุ่มกลับพากลับถูกที่เองโดยไม่ต้องแก้
// เส้นทางไหนเพิ่มเลย และชื่อเดิมยังบอกได้ว่าโค้ดตรงนั้นทำงานกับหมวดไหนอยู่
const stashPanel = document.getElementById('stashPanel');
const outfitPanel = stashPanel;
const gachaPanel = document.getElementById('gachaPanel');
const rankPanel = document.getElementById('rankPanel');
const settingsPanel = document.getElementById('settingsPanel');
const introPanel = document.getElementById('introPanel');
const titlePanel = document.getElementById('titlePanel');
const authPanel = document.getElementById('authPanel');
const namePanel = document.getElementById('namePanel');
const mailPanel = document.getElementById('mailPanel');
const pauseBtn = document.getElementById('btnPause');

const game = new Game({ onGameOver: showGameOver, onPitFall: askRevive });

// ── ตัวเลขไล่ขึ้นในหน้าสรุป ──────────────────────────────────
//
// ตัวเลขที่โผล่มาเป็นค่าสุดท้ายเลยจะถูกอ่านผ่านในเสี้ยววินาทีแล้วจบ
// พอมันไล่ขึ้น ตาจะอยู่กับมันจนสุด — ซึ่งเป็นช่วงเดียวที่หน้าสรุปมีอะไรให้ดู
//
// รุ่นของการนับ (countGen) กันตัวเลขของตาเก่าไล่ค้างมาทับตาใหม่
// เกิดได้จริงตอน ตาย → วิ่งอีกรอบ → ตายอีกเร็ว ๆ ก่อนรอบก่อนจะไล่จบ
//
// ประกาศไว้บนสุดคู่กับ game เพราะ closeAllPanels() แตะตัวแปรนี้ และมันถูกเรียก
// จากหลายที่ตั้งแต่ตอนเปิดเกม ถ้าประกาศไว้ล่างไฟล์จะติด TDZ ตอนบูตทันทีที่มี
// ใครสักคนเรียกมันก่อนบรรทัดประกาศ
let countGen = 0;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// ── หน้าแรกกับการเลือกตัวละคร ──────────────────────────────

/**
 * ติดคลาส .scrolls ให้ช่องที่เนื้อหาล้นจริงเท่านั้น
 *
 * CSS มองไม่เห็นว่ามีอะไรล้นหรือเปล่า เลยต้องให้ JS บอก — ไม่งั้นเงาจางที่ขอบล่าง
 * จะไปกินตัวหนังสือของแถวสุดท้ายในหน้าที่ของน้อยจนไม่ต้องเลื่อนเลย
 *
 * เรียกหลังใส่การ์ดครบแล้ว และต้องรอให้เบราว์เซอร์จัดหน้าเสร็จก่อนถึงจะวัดได้
 */
function markScrollable(el) {
  if (!el) return;

  // ── เลขลำดับของการ์ดแต่ละใบ ──
  // ใช้หน่วงแอนิเมชัน "ไล่กันโผล่" ตอนเปิดหน้า (ดู .just-open ใน style.css)
  // ทำที่นี่ที่เดียวเพราะทุกหน้าที่มีกริดเรียกฟังก์ชันนี้อยู่แล้วหลังสร้างการ์ดเสร็จ
  // ตัดที่ 14 ใบ ใบท้าย ๆ จะได้ไม่ต้องรอนานจนดูเหมือนหน้าค้าง
  const kids = el.children;
  for (let i = 0; i < kids.length; i++) kids[i].style.setProperty('--i', Math.min(i, 14));

  requestAnimationFrame(() => {
    el.classList.toggle('scrolls', el.scrollHeight > el.clientHeight + 2);
  });
}

/**
 * วาดลงแคนวาสเล็กในเมนู
 * ต้องคูณ DPR เอง เพราะ fitDPR() ดูแลเฉพาะจอเกมหลัก
 * ขนาดที่แสดงจริงคุมด้วย CSS ส่วนตรงนี้คุมแค่ความละเอียด
 */
function paintMini(canvas, logical, draw) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = logical * dpr;
  canvas.height = logical * dpr;
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, logical, logical);
  draw(c);
}

/**
 * รูปประจำระดับชุด — ไฟล์จริงใน public/ ไม่ได้วาดด้วยโค้ดเหมือนของอย่างอื่นในเกม
 *
 * ── ทำไมแยกเป็นตารางแทนที่จะต่อสตริงเอาตอนใช้ ──
 * ชื่อไฟล์เป็นข้อมูล ไม่ใช่กฎ ระดับใหม่ในอนาคตอาจใช้ชื่ออื่นที่ไม่เข้าแพตเทิร์น
 * ตารางบอกได้ทันทีว่ามีรูปของระดับไหนบ้าง โดยไม่ต้องไปไล่ดูในโฟลเดอร์
 *
 * ── ทำไมเป็น .png ทั้งที่ต้นฉบับเป็น .svg ──
 * ไฟล์ svg ที่ได้มาเป็นภาพ raster ฝัง base64 อยู่ข้างใน ขนาดรวมกัน 59MB
 * ตัดขอบแล้วย่อเป็น png ได้ภาพเดิมเป๊ะที่ 176KB
 *
 * ── ทำไมประกาศไว้บนสุดของไฟล์ ──
 * ถูกใช้ทั้งในหน้าเลือกชุด หน้ารายละเอียด และการ์ดผลสุ่มในตู้กาช่า
 * ประกาศไว้ใกล้ที่ใช้ที่ใดที่หนึ่งจะกลายเป็น "ของของหน้านั้น" ทั้งที่ใช้ร่วมกันสามที่
 */
const TIER_ART = {
  // ระดับของ "ชุด"
  high:   { sign: 'sign-s.png', cat: 'cat-gold.png' },
  normal: { sign: 'sign-a.png', cat: 'cat-silver.png' },
  // ระดับของ "สมบัติ" — คนละสเกลกับชุด แต่ใช้ตารางเดียวกันได้
  // เพราะชื่อระดับไม่ชนกันเลย (high/normal กับ legend/epic/rare)
  legend: { sign: 'sign-l.png' },
  epic:   { sign: 'sign-e.png' },
  rare:   { sign: 'sign-r.png' },
};

/**
 * ป้ายระดับ — รูปตราจริง (S/A ของชุด, L/E/R ของสมบัติ) ไม่ใช่แคปซูลตัวหนังสือ
 *
 * คืน null สำหรับของที่ไม่มีระดับ ("ขนล้วน") ผู้เรียกจึงเช็คค่าเดียวจบ
 * ไม่ต้องรู้ว่าระดับไหนมีรูปบ้าง
 *
 * ── ทำไมเป็นฟังก์ชันกลาง ไม่ใช่ก๊อปโค้ดไปทีละที่ ──
 * ป้ายนี้โผล่เจ็ดที่ (เลือกชุด / เลือกสมบัติ / รายละเอียดสมบัติ / ผลสุ่มสองแบบ /
 * ตัวอย่างในตู้กาช่า / หน้าสะสม) เคยเป็นแคปซูลตัวหนังสือที่เขียนแยกกันทุกที่
 * พอเปลี่ยนเป็นรูปจึงต้องไล่แก้ครบ รวมไว้ที่เดียวแล้วรอบหน้าแก้ที่นี่ที่เดียวจบ
 *
 * ชื่อระดับอ่านจากตารางของฝั่งที่ตรงกับ rarity นั้น — ไม่ก้าวก่ายกันเพราะชื่อไม่ชน
 */
function tierSign(rarity) {
  const art = TIER_ART[rarity];
  if (!art) return null;
  const img = document.createElement('img');
  img.className = 'tier-sign';
  img.src = import.meta.env.BASE_URL + art.sign;
  img.alt = (RARITY[rarity] || T_RARITY[rarity]).name;
  return img;
}

/** หากล่องที่พิกเซลทึบกินจริงในผ้าใบ — คืน null ถ้าวาดแล้วว่างเปล่า */
function alphaBounds(c, w, h) {
  const d = c.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // ข้ามพิกเซลจาง ๆ (เงาฟุ้ง ขอบ antialias) ไม่งั้นกล่องจะกว้างกว่าตัวรูปจริง
      // แล้วรูปที่ขยายออกมาจะเล็กกว่าที่ควรเป็น
      if (d[(y * w + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * วาดไอคอนให้เต็มกรอบ โดยวัด "กล่องที่รูปกินจริง" เอาเองจากพิกเซล
 *
 * ไอคอนแต่ละใบตั้งสเกลตายตัวไว้คนละที คนละเวลา บางใบจึงเหลือขอบว่างรอบรูป
 * เยอะกว่าเพื่อนมาก (ไอคอนชุดเหลือเกือบครึ่งกรอบ ส่วนสมบัติเต็มพอดีเพราะใบนั้น
 * วัดกล่องของหีบไว้เองด้วยมือ) แทนที่จะไล่จูนตัวเลขทีละใบ — ซึ่งจะเพี้ยนอีกทันที
 * ที่มีใครแก้รูป — ให้มันวัดเองแล้วขยายจนเต็มกรอบเท่ากันทุกใบ
 *
 * วาดสองรอบ: รอบแรกลงผ้าใบชั่วคราวเพื่อวัดขอบ รอบสองวาดจริงตามสเกลที่ได้
 * ทำเฉพาะตอนรีเฟรชล็อบบี้ ไม่ได้อยู่ในลูปเกม จึงไม่ต้องห่วงเรื่องความเร็ว
 *
 * @param fill สัดส่วนของกรอบที่ยอมให้รูปกิน เว้นขอบไว้นิดหน่อยกันดูอึดอัด
 */
function paintFitted(canvas, logical, fill, draw) {
  const probe = document.createElement('canvas');
  probe.width = logical;
  probe.height = logical;
  const pc = probe.getContext('2d', { willReadFrequently: true });
  draw(pc);
  const box = alphaBounds(pc, logical, logical);

  paintMini(canvas, logical, (c) => {
    if (!box) return draw(c);   // ไม่มีพิกเซลให้วัด วาดตามเดิมไปก่อน
    const k = Math.min((logical * fill) / box.w, (logical * fill) / box.h);
    c.translate(
      (logical - box.w * k) / 2 - box.x * k,
      (logical - box.h * k) / 2 - box.y * k,
    );
    c.scale(k, k);
    draw(c);
  });
}

/**
 * ภาพตัวอย่างด่าน — ใช้ฟังก์ชันวาดฉากตัวจริงย่อส่วนลงมา ไม่ได้วาดภาพจำลองใหม่
 * ที่ทำแบบนี้เพราะภาพจำลองจะเพี้ยนจากของจริงทันทีที่มีคนแก้สีในด่าน
 * ฟังก์ชันพวกนี้อ้างขนาด 960x420 ตายตัว จึงต้อง scale เอาที่ ctx
 */
function paintStageScene(canvas, stage, logicalW) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const logicalH = Math.round((logicalW * 420) / 960);
  canvas.width = logicalW * dpr;
  canvas.height = logicalH * dpr;

  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.scale(logicalW / 960, logicalH / 420);

  drawSky(c, 0, stage.palette);
  drawHills(c, 0, stage.palette);
  drawGround(c, [], 0, stage.palette, GROUND_ART[stage.backdrop]);
  // วางสิ่งกีดขวางสองชิ้นให้เห็นว่าธีมนี้หน้าตาแบบไหน
  drawObstacles(c, [
    { x: 300, y: 320 - 38, w: 32, h: 38, kind: 'spike' },
    { x: 600, y: 320 - 88, w: 46, h: 88, rows: 2, kind: 'crate' },
  ], 0, stage.theme);
}

// หูแมวบนป้ายชื่อเกมวาดด้วย CSS ล้วน (.plate-ear ใน style.css)
// จึงไม่มีอะไรต้องวาดจากฝั่ง JS เลย — ไม่มี canvas ไม่มีการวาดซ้ำทุกครั้งที่รีเฟรชหน้า

/**
 * รูปโปรไฟล์บนการ์ดบัญชี
 *
 * ตอนนี้ผูกกับสีขนที่เลือกอยู่ เปลี่ยนแมวปุ๊บรูปเปลี่ยนตามทันที
 * วันหลังถ้าอยากให้เลือกรูปได้เอง แก้แค่ฟังก์ชันนี้ที่เดียว — ที่เหลือทั้งการ์ด
 * ไม่รู้เลยว่ารูปมาจากไหน
 */
function paintAvatar() {
  paintMini(document.getElementById('pfAvatar'), 96,
    (c) => drawCatFace(c, 48, 56, 2.5, getSkin()));
}

/**
 * ไอคอนปุ่มสมบัติในล็อบบี้ — โชว์สมบัติที่ติดตั้งอยู่ ไม่ใช่รูปนิ่ง
 *
 * ยังไม่ได้ติดตั้งอะไรเลยจะขึ้นเป็นหีบเปล่า พอติดตั้งแล้วเห็นของที่พกไปทันที
 * ตั้งแต่หน้าล็อบบี้โดยไม่ต้องกดเข้าไปดู
 */
/**
 * ไอคอนปุ่มสมบัติ — หีบสมบัติใบเดียวกับที่อยู่ในตู้สุ่ม
 *
 * เดิมเป็นกล่องของขวัญตอนยังไม่ติดตั้ง แล้วสลับเป็นอิโมจิของที่ติดตั้งอยู่
 * ซึ่งอ่านไม่ออกว่าปุ่มนี้คือ "สมบัติ" ถ้ายังไม่เคยกดเข้าไปดู
 * (และกล่องของขวัญตอนนี้ถูกยกไปเป็นไอคอนปุ่มกิจกรรมแล้ว)
 *
 * ฝาเปิดเมื่อมีของติดตั้งอยู่ ปิดเมื่อยังไม่ได้ติดตั้ง — บอกสถานะด้วยท่าของหีบเอง
 * โดยไม่ต้องมีป้ายตัวเลขมาเบียดในกรอบ 76px
 */
/**
 * ไอคอนปุ่มคลังน้อง — หีบสมบัติกับน้องแมวใส่ชุดอยู่ในกรอบเดียว
 *
 * ปุ่มเดียวแทนสองปุ่มเดิม ไอคอนจึงต้องบอกให้ได้ว่าข้างในมีทั้งสองอย่าง
 * ใช้ของจริงจากทั้งสองหมวดมาซ้อนกัน ไม่ใช่วาดไอคอนกล่องกลาง ๆ ขึ้นมาใหม่
 * — น้องที่โผล่มาคือน้องที่ใส่ชุดอยู่จริง เปลี่ยนชุดแล้วไอคอนเปลี่ยนตาม
 *
 * หีบอยู่หลังขวาและเล็กกว่า น้องอยู่หน้าซ้าย จึงอ่านเป็น "น้องกับคลังของน้อง"
 * ไม่ใช่ของสองชิ้นวางเรียงกันเฉย ๆ
 */
function paintStashIcon() {
  const equipped = getEquipped().filter(Boolean).length;
  const s = getSkin();
  paintBox(document.getElementById('stashIcon'), 76, 76, (c) => {
    // หีบวาดในกรอบ 200x184 แต่ตัวหีบจริงกินแค่ราว x 22-178 y 38-170
    // ย่อจาก "ขนาดของหีบ" ไม่ใช่ขนาดกรอบ ไม่งั้นจะได้หีบจิ๋วลอยกลางที่ว่าง
    // หีบกินครึ่งขวาล่างของกรอบ ใหญ่พอให้อ่านออกว่าเป็นหีบ ไม่ใช่ก้อนสีน้ำตาล
    const box = { x: 22, y: 38, w: 156, h: 132 };
    const k = 45 / box.w;
    c.save();
    c.translate(31 - box.x * k, 33 - box.y * k);
    c.scale(k, k);
    drawChest(c, equipped ? 1 : 0, chestTick);
    c.restore();

    // น้องยืนหน้าหีบชิดซ้าย วาดทีหลังจึงบังหีบ = อ่านเป็นความลึก ไม่ใช่ของทับกัน
    c.save();
    drawCatPose(c, 27, 72, 0.98, s, 60);
    c.restore();
  });
}

/** การ์ดบัญชีมุมซ้ายบน — ชื่อ รูป เลเวล และหลอดความคืบหน้า */
function refreshProfile() {
  const st = levelFromXp(loadXp());
  paintAvatar();
  document.getElementById('pfName').textContent = localName() || 'แมวนิรนาม';
  document.getElementById('pfLv').textContent = st.level;
  document.getElementById('pfFill').style.width = Math.round(st.ratio * 100) + '%';
  document.getElementById('pfXp').textContent = st.maxed
    ? 'เลเวลสูงสุดแล้ว'
    : st.into.toLocaleString('en-US') + ' / ' + st.need.toLocaleString('en-US');
}

// ── ของใหม่ (จุดแดง) ─────────────────────────────────────────
// แต่ละหมวดบอก fresh.js ว่า "ตอนนี้มีอะไรบ้าง" — ของที่มีแต่ยังไม่เคยแตะดู = ของใหม่
// ต้องลงทะเบียนก่อนใครจะถาม isFresh ครั้งแรก เพราะครั้งแรกของแต่ละหมวดคือการตั้งฐาน
// (ของที่มีอยู่แล้วทั้งหมดถือว่าดูแล้ว) ถ้าถามก่อนลงทะเบียน ฐานจะว่างแล้วของเก่าทั้งหมดกลายเป็นของใหม่
registerFresh('skill', () => SKILLS.filter(isSkillUnlocked).map((x) => x.id));
registerFresh('talent', () => TALENTS.filter(talentUnlocked).map((x) => x.id));
registerFresh('skin', () => SKINS.filter((x) => ownsSkin(x.id)).map((x) => x.id));
registerFresh('outfit', () => OUTFITS.filter((x) => isOwned(x.id)).map((x) => x.id));
registerFresh('treasure', () => TREASURES.filter((x) => ownsTreasure(x.id)).map((x) => x.id));

/** จุดแดงบนปุ่มล็อบบี้กับแท็บหมวดในคลังน้อง — เรียกทุกครั้งที่อาจมีของใหม่หรือเพิ่งดูของไป */
function refreshFreshDots() {
  document.getElementById('cardDot').classList.toggle('hidden', !hasFresh('skill', 'talent'));
  document.getElementById('stashDot').classList.toggle('hidden', !hasFresh('skin', 'outfit', 'treasure'));
  setDot(document.getElementById('tabStashSkin'), hasFresh('skin'));
  setDot(document.getElementById('tabStashOutfit'), hasFresh('outfit'));
  setDot(document.getElementById('tabStashTreasure'), hasFresh('treasure'));
}
onFresh(refreshFreshDots);

function refreshHome() {
  refreshMailDot();   // จุดแดงต้องตรงกับของจริงทุกครั้งที่กลับมาล็อบบี้
  refreshFreshDots();
  const st = getStage();
  refreshProfile();
  // ปุ่มล็อบบี้เหลือแค่ไอคอนกับชื่อ ไม่มีบรรทัดคำอธิบายให้เขียนแล้ว
  // (ชื่อสกิน/ชุด/ด่าน ยังโชว์อยู่บนการ์ดที่เลือกอยู่ตอนเปิดแผงนั้น)
  // ── ไอคอนพวกนี้ขยายให้เต็มกรอบเท่ากันหมดด้วย paintFitted ──
  // ยกเว้นสมบัติ (วัดกล่องหีบไว้เองอยู่แล้ว) กับด่าน (เป็นภาพฉากเต็มกรอบ ไม่ใช่ไอคอน)
  // พรสวรรค์เป็นไพ่สองใบ ไม่มีตัวน้องอยู่ในรูป — ปุ่มคลังน้องกับปุ่มสร้างสรรค์มีน้องอยู่แล้ว
  // ถ้าอันนี้มีน้องด้วยอีกใบ สามปุ่มจะหน้าตาคล้ายกันจนแยกไม่ออกว่ากดอันไหนได้อะไร
  paintFitted(document.getElementById('talentIcon'), 76, 0.96, drawTalentCards);
  paintStageScene(document.getElementById('stageIcon'), st, 210);
  paintStashIcon();
  paintQuestIcon();
  refreshCreateIcon();
  refreshQuestDot();
  refreshLvDot();
  refreshDailyDot();
  // เสียงถูกหรี่ไว้ตั้งแต่รอบก่อนก็ต้องเห็นตั้งแต่เข้าล็อบบี้ ไม่ใช่เห็นตอนเปิดหน้าตั้งค่า
  paintMuteBadge();
  refreshEquipCount();
  paintFitted(document.getElementById('rankIcon'), 76, 0.96, drawTrophy);
  paintFitted(document.getElementById('gachaIcon'), 76, 0.96, (c) => {
    c.save(); c.scale(76 / 150, 76 / 170); drawGachaMachine(c); c.restore();
  });
  // ความคืบหน้ากาช่าเคยโชว์ตรงนี้ ย้ายไปดูในแผงกาช่าอย่างเดียวแล้ว (.gacha-owned)
  refreshGold();
  refreshLove();   // คูลดาวน์อาจหมดไปแล้วระหว่างที่เปิดแผงอื่นค้างไว้
}

/**
 * แถบทองมุมขวาบน
 *
 * เคยมีตัวเลขทองซ้ำอีกที่ในหน้ากาช่า ซึ่งบอกเรื่องเดียวกันสองรอบในจอเดียว
 * เหลือที่เดียวแล้ว แถบบนโชว์อยู่ตลอดตอนเปิดพาเนลอยู่แล้ว (ดู .hud-top ใน style.css)
 */
function refreshGold() {
  const gold = getGold().toLocaleString('en-US');
  const gems = getGems().toLocaleString('en-US');
  document.getElementById('goldTop').textContent = gold;
  // เพชรชมพูอยู่แถบเดียวกัน อัปเดตพร้อมกันเสมอ จะได้ไม่มีทางที่ตัวเลขสองช่องหลุดจากกัน
  document.getElementById('gemTop').textContent = gems;
  // แถบบนซ่อนตัวเองตอนมีแผงย่อยเปิด (ดูกฎที่ .hud-top) หน้าตู้กาช่าจึงมีกระเป๋า
  // ของตัวเองอีกชุด — เขียนพร้อมกันตรงนี้ที่เดียว ไม่งั้นสองที่จะหลุดจากกันแน่นอน
  document.getElementById('goldGacha').textContent = gold;
  document.getElementById('gemGacha').textContent = gems;
  // หน้าตีบวกก็ต้องเห็นทองด้วย เพราะมันคือหน้าที่จ่ายทองถี่ที่สุดในเกม
  // (ใช้ทองอย่างเดียว จึงไม่มีช่องเพชรให้เขียน)
  document.getElementById('goldUp').textContent = gold;
}

// ── ตู้กาช่า ───────────────────────────────────────────────

/** เหมือน paintMini แต่ไม่บังคับสี่เหลี่ยมจัตุรัส ตู้กาช่าเป็นทรงสูง */
function paintBox(canvas, w, h, draw) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  draw(c);
}

const CAPSULE_COLORS = ['#FF7FAE', '#FFC93C', '#8FE8FF', '#9DE86F', '#C77DFF', '#FF8A5C'];

// ตู้วาดในพิกัด 150x170 เสมอ แล้วค่อยขยายที่ ctx
// พิกัดทุกจุดในฟังก์ชันวาดจึงไม่ต้องแก้ตามขนาดที่แสดงจริง
const MACHINE_W = 200;
const MACHINE_H = 226;

// ── สถานะแอนิเมชันเปิดกาช่า ────────────────────────────────
// pullProgress เดินจาก 0 ถึง 1 ตลอดช่วงเปิด แล้วค้างที่ 0 ตอนไม่ได้สุ่ม
// เก็บผลไว้ใน pending ก่อน ค่อยโชว์ตอนแคปซูลแตก — ไม่งั้นเห็นของก่อนเปิด
// ซึ่งทำให้แอนิเมชันไม่มีความหมาย
const PULL_FRAMES = 62;
let gachaShake = 0;
let pullProgress = 0;
let pullPending = null;
let spinT = 0;

/**
 * ตู้กาช่าหน้าตาแมว ๆ วาดในกรอบ 150x170
 * shake 0-1 = แรงสั่นตอนเพิ่งกดสุ่ม ลดลงเองทุกเฟรม
 */
function drawGachaMachine(c, t = 0, shake = 0, anim = 0) {
  const cx = 75;
  c.save();
  if (shake > 0) {
    c.translate((Math.random() - 0.5) * shake * 8, (Math.random() - 0.5) * shake * 6);
  }

  // หูแมวบนโดม วาดก่อนโดมเพื่อให้โคนหูถูกกลบ
  for (const dir of [-1, 1]) {
    c.fillStyle = '#F2913D';
    c.beginPath();
    c.moveTo(cx + dir * 20, 34); c.lineTo(cx + dir * 34, 6); c.lineTo(cx + dir * 41, 36);
    c.closePath(); c.fill();
    c.fillStyle = '#FF9BB0';
    c.beginPath();
    c.moveTo(cx + dir * 25, 31); c.lineTo(cx + dir * 33, 15); c.lineTo(cx + dir * 36.5, 32);
    c.closePath(); c.fill();
  }

  // โดมแก้ว
  c.fillStyle = 'rgba(190,235,255,.25)';
  c.beginPath(); c.arc(cx, 62, 44, 0, Math.PI * 2); c.fill();

  // แคปซูลข้างใน ลอยหมุนช้า ๆ
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + t * 0.014;
    const rad = 11 + (i % 3) * 11;
    const bx = cx + Math.cos(a) * rad;
    const by = 62 + Math.sin(a) * rad * 0.82 + Math.sin(t * 0.05 + i) * 2;
    c.fillStyle = CAPSULE_COLORS[i % CAPSULE_COLORS.length];
    c.beginPath(); c.arc(bx, by, 7.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)';
    c.beginPath(); c.arc(bx - 2.4, by - 2.7, 2.2, 0, Math.PI * 2); c.fill();
  }

  // ขอบโดมกับแสงสะท้อน วาดทับแคปซูลให้ดูเหมือนอยู่หลังกระจก
  c.strokeStyle = 'rgba(255,243,226,.5)';
  c.lineWidth = 2.5;
  c.beginPath(); c.arc(cx, 62, 44, 0, Math.PI * 2); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.2)';
  c.beginPath(); c.ellipse(cx - 17, 45, 11, 18, -0.5, 0, Math.PI * 2); c.fill();

  // ตัวตู้
  c.fillStyle = '#E8637F';
  c.beginPath(); c.roundRect(cx - 46, 99, 92, 64, 14); c.fill();
  c.fillStyle = 'rgba(255,255,255,.16)';
  c.beginPath(); c.roundRect(cx - 46, 99, 92, 8, 6); c.fill();

  // ช่องรับของ
  c.fillStyle = '#5A1B2E';
  c.beginPath(); c.roundRect(cx - 20, 132, 40, 24, 8); c.fill();

  // ปุ่มหมุน เข็มหมุนตามเวลาและสะบัดแรงตอนสั่น
  c.fillStyle = '#FFD97A';
  c.beginPath(); c.arc(cx, 118, 10.5, 0, Math.PI * 2); c.fill();
  c.save();
  c.translate(cx, 118);
  c.rotate(t * 0.02 + shake * 7);
  c.strokeStyle = '#A9701A';
  c.lineWidth = 3.4;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); c.stroke();
  c.restore();

  // หัวใจสองข้าง
  c.fillStyle = 'rgba(255,255,255,.45)';
  for (const dx of [-33, 33]) {
    c.beginPath();
    c.arc(cx + dx - 2.7, 116, 2.9, 0, Math.PI * 2);
    c.arc(cx + dx + 2.7, 116, 2.9, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(cx + dx - 5.4, 117.6); c.lineTo(cx + dx, 124); c.lineTo(cx + dx + 5.4, 117.6);
    c.closePath(); c.fill();
  }

  if (anim > 0) drawCapsuleDrop(c, cx, anim);

  c.restore();
}

/** แคปซูลหนึ่งลูก split 0 = ปิดสนิท 1 = สองซีกแยกจากกันสุด */
function drawCapsule(c, x, y, r, split) {
  const gap = split * 10;
  c.fillStyle = '#FFC93C';
  c.beginPath(); c.arc(x, y - gap, r, Math.PI, 0); c.fill();
  c.fillStyle = '#FF7FAE';
  c.beginPath(); c.arc(x, y + gap, r, 0, Math.PI); c.fill();
  if (split < 0.25) {
    c.fillStyle = 'rgba(255,255,255,.6)';
    c.beginPath(); c.arc(x - r * 0.32, y - r * 0.38, r * 0.28, 0, Math.PI * 2); c.fill();
  }
}

/**
 * ไทม์ไลน์การเปิด p = 0 ถึง 1
 *   0.00-0.34 ยังไม่โผล่ ตู้กำลังหมุนปั่นแคปซูลอยู่ข้างบน
 *   0.34-0.70 แคปซูลหล่นลงช่อง เร่งความเร็วแบบของตกจริง (k กำลังสอง)
 *   0.70-1.00 ฝาแยกออก พร้อมวงแสงระเบิดกับประกายกระจาย
 */
function drawCapsuleDrop(c, cx, p) {
  if (p < 0.34) return;

  if (p < 0.7) {
    const k = (p - 0.34) / 0.36;
    drawCapsule(c, cx, 96 + k * k * 48, 9, 0);
    return;
  }

  const k = (p - 0.7) / 0.3;
  drawCapsule(c, cx, 144, 9, k);

  c.save();
  c.globalAlpha = (1 - k) * 0.9;
  c.strokeStyle = '#FFF6D8';
  c.lineWidth = 3.5 * (1 - k) + 1;
  c.beginPath(); c.arc(cx, 144, 9 + k * 42, 0, Math.PI * 2); c.stroke();

  c.fillStyle = '#FFE9A8';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    const rad = 10 + k * 34;
    const sr = (1 - k) * 3.2;
    c.beginPath();
    c.arc(cx + Math.cos(a) * rad, 144 + Math.sin(a) * rad * 0.7, sr, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

const pct = (n) => Math.round(n * 100) + '%';

// ── ตู้กาช่า — ตู้เดียวสองช่อง ──────────────────────────────
//
// จุดประสงค์ของหน้านี้คือ "ตัดสินใจว่าจะสุ่มไหม" ไม่ใช่ "ดูของทั้งตู้"
// จึงโชว์ทีละชิ้นตัวใหญ่ ๆ ให้เห็นชัดว่ากำลังลุ้นอะไรอยู่ ส่วนกระดานรวมว่า
// ตู้นี้มีอะไรบ้างแยกไปหน้ารายการ (#gListPanel) ซึ่งเข้าจากปุ่ม "ดูอื่นๆ"
//
// สองช่องใช้ทั้งกรอบส่อง ปุ่มสุ่ม ตารางอัตรา และกล่องผลร่วมกันหมด
// ต่างกันแค่ "แหล่งข้อมูล" กับ "กระเป๋าเงิน" — ทุกฟังก์ชันในบล็อกนี้จึงอ่าน gTab
// แล้วแตกสองทางในที่เดียว ไม่ใช่ก๊อปหน้าทั้งหน้าไปเป็นชุดที่สอง

let gTab = 'treasure';   // ช่องที่เปิดอยู่: 'treasure' | 'skin'
let heroId = null;       // ชุดที่กำลังส่อง (ช่องสกิน)
let tHeroId = null;      // สมบัติที่กำลังส่อง (ช่องสมบัติ)

/**
 * ทับสิ่งที่วาดไปแล้วให้กลายเป็นเงาทึบ
 *
 * ใช้ source-atop แทน ctx.filter เพราะ filter ยังไม่มีใน Safari รุ่นก่อน 16.4
 * ซึ่งถ้าไม่รองรับมันจะ "เงียบ ๆ ไม่ทำอะไร" แปลว่าชุดที่ยังไม่ได้จะโชว์เต็มสี
 * บนเครื่องพวกนั้น — เฉลยของที่ควรปิดไว้ทั้งหมดโดยไม่มีใครรู้ตัว
 * ส่วน source-atop เป็นของพื้นฐานที่มีมาตั้งแต่ต้น และให้เงาที่คมกว่าด้วย
 */
function silhouette(c, w, h) {
  c.save();
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = 'rgba(24,10,38,.93)';
  c.fillRect(0, 0, w, h);
  c.restore();
}

// ── ข้อมูลของช่องที่เปิดอยู่ ──
// ทุกที่ที่ต้อง "รู้ว่าตอนนี้กำลังพูดถึงสมบัติหรือชุด" ให้ผ่านตัวช่วยพวกนี้เท่านั้น
// ถ้าปล่อยให้แต่ละฟังก์ชันเช็ค gTab เองแล้วไปเรียกของโมดูลตรง ๆ
// วันที่เพิ่มช่องที่สามจะต้องไล่แก้ทุกจุดในไฟล์แทนที่จะแก้แค่ตรงนี้
const gIsT = () => gTab === 'treasure';
const gPool = () => (gIsT() ? TREASURES : pullPool());
const gGot = (id) => (gIsT() ? ownsTreasure(id) : isOwned(id));
const gHeroId = () => (gIsT() ? tHeroId : heroId);

function setHeroId(id) {
  if (gIsT()) tHeroId = id;
  else heroId = id;
}

/** ราคาต่อครั้ง จำนวนครั้งของปุ่มใบที่สอง และกระเป๋าที่จ่าย — คนละช่องคนละกระเป๋า */
const gCost = () => (gIsT() ? T_GACHA.cost : OUTFIT_COST);
const gMulti = () => (gIsT() ? T_GACHA.multi : MULTI_PULLS);
const gWallet = () => (gIsT() ? getGems() : getGold());

/** วาดของชิ้นที่กำลังส่องลงกรอบซ้าย ทีละชิ้นเท่านั้น */
function drawShow() {
  const pool = gPool();
  if (!pool.length) return;

  const item = pool.find((x) => x.id === gHeroId()) || pool[0];
  setHeroId(item.id);

  const got = gGot(item.id);
  const badge = document.getElementById('showTier');
  const cat = document.getElementById('showCat');
  const emoji = document.getElementById('showEmoji');
  const bonus = document.getElementById('showBonus');

  // ชื่อกับคำอธิบายโชว์แม้ยังไม่ได้ — เป็นข้อมูลที่คนยังไม่มีต้องใช้ตัดสินใจ
  // ว่าจะลุ้นต่อไหม ส่วนที่ปิดไว้คือ "ได้แล้วหรือยัง" ซึ่งบอกด้วยความจางของรูป
  document.getElementById('showName').textContent = item.name;
  document.getElementById('showNote').textContent = item.note;

  cat.classList.toggle('hidden', gIsT());
  emoji.classList.toggle('hidden', !gIsT());
  // กรอบรูปเปลี่ยนสีตามระดับ ผู้เล่นจึงรู้ว่ากำลังส่องของหายากแค่ไหนตั้งแต่ยังไม่อ่านป้าย
  document.querySelector('.show-face').className =
    'show-face ' + (item.rarity || '') + (got ? '' : ' locked');

  if (gIsT()) {
    emoji.textContent = item.emoji;

    // ป้ายสมบัติเป็นรูปตราเหมือนการ์ดในหน้าสมบัติ สายตาจึงหาที่เดิมได้
    // ใช้ element เดียวกับสาขาชุดข้างล่าง แค่ยัดรูปคนละใบ
    badge.className = 'tier-badge as-sign ' + item.rarity;
    badge.replaceChildren(tierSign(item.rarity));
    badge.style.display = '';

    // ฤทธิ์คิดจากขั้นที่ตีบวกไว้จริง ไม่ใช่ขั้น 0 ตายตัว
    // ไม่งั้นคนที่ตีบวกไปแล้วจะเห็นตัวเลขต่ำกว่าที่ตัวเองได้จริง
    bonus.textContent = effectText(item, treasureLevel(item.id));
    bonus.style.display = '';
  } else {
    startShowAnim();

    // ป้ายของชุดเป็น "รูปตรา" ส่วนป้ายของสมบัติ (อีกสาขาของ if ข้างบน) ยังเป็นตัวย่อ
    // ใช้ element เดียวกันได้เพราะสองสาขาเขียนทับลูกของมันคนละแบบเสมอ
    // (สาขาสมบัติใช้ textContent ซึ่งล้างลูกเดิมให้อยู่แล้ว)
    // .as-sign ถอดทรงแคปซูลทิ้ง เหลือแค่รูปลอย
    const sign = tierSign(item.rarity);
    badge.className = 'tier-badge as-sign ' + (item.rarity || '');
    badge.replaceChildren(...(sign ? [sign] : []));
    badge.style.display = sign ? '' : 'none';

    // ค่าที่ชุดให้จริง ๆ — อ่านจาก foodBonus ของชุดตรง ๆ ไม่ได้เขียนค้างไว้
    // ตัวเลขนี้คือเหตุผลเดียวที่ระดับสูงมีค่ากว่าระดับกลาง จึงต้องเห็นตั้งแต่ก่อนสุ่ม
    bonus.textContent = item.foodBonus > 0
      ? '+' + item.foodBonus.toLocaleString('en-US') + ' ต่อของกิน 1 ชิ้น'
      : '';
    bonus.style.display = item.foodBonus > 0 ? '' : 'none';
  }
}

// ── น้องในกรอบส่องชุดขยับได้ ──────────────────────────────────
//
// เดิมวาดครั้งเดียวเป็นรูปยืนนิ่ง ตอนนี้วาดใหม่ทุกเฟรมตอนหน้ากาช่าช่องสกินเปิดอยู่:
// หายใจ หางแกว่ง กะพริบตาตลอด แล้วทุก ~3 วินาทีเล่นท่าหนึ่งจากชุดท่าหน้าแรก
// (src/home-moves.js — ท่าเดียวกับตอนแตะน้อง จึงไม่มีท่าชุดที่สองให้ดูแล)
// ชุดที่ใส่ตามท่าไปเองเพราะวาดด้วยตัววาดตัวเดียวกัน
//
// ตัดท่านอนลอยออก — มันลอยพ้นกรอบ 150px ไปครึ่งตัว
// ลูปหยุดเองทันทีที่หน้าปิดหรือสลับไปช่องสมบัติ ไม่มีงานวาดค้างอยู่เบื้องหลัง
const SHOW_MOVES = HOME_MOVES.filter((m) => m.id !== 'float');
const SHOW_SIZE = 150;
let showAnim = null;

function startShowAnim() {
  if (showAnim) return;
  const cat = document.getElementById('showCat');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cat.width = SHOW_SIZE * dpr;
  cat.height = SHOW_SIZE * dpr;
  showAnim = { t: 60, move: null, mt: 0, wait: 70, last: null, prev: performance.now(), dpr, raf: 0 };
  showAnim.raf = requestAnimationFrame(stepShowAnim);
}

function stepShowAnim(now) {
  const A = showAnim;
  if (!A) return;
  if (gachaPanel.classList.contains('hidden') || gIsT()) {
    showAnim = null;
    return;
  }
  // เวลาเป็นเฟรมที่ 60fps เหมือนหน้าแรก — จอ 120Hz จึงไม่เร่งท่าเป็นสองเท่า
  const dt = Math.min(3, (now - A.prev) / (1000 / 60));
  A.prev = now;
  A.t += dt;
  if (A.move) {
    A.mt += dt;
    if (A.mt >= A.move.dur) {
      A.last = A.move.id;
      A.move = null;
      A.wait = 150 + Math.random() * 90;
    }
  } else if ((A.wait -= dt) <= 0) {
    const pool = SHOW_MOVES.filter((m) => m.id !== A.last);
    A.move = pool[Math.floor(Math.random() * pool.length)];
    A.mt = 0;
  }

  const item = gPool().find((x) => x.id === gHeroId());
  if (item) {
    const cat = document.getElementById('showCat');
    const c = cat.getContext('2d');
    c.setTransform(A.dpr, 0, 0, A.dpr, 0, 0);
    c.clearRect(0, 0, SHOW_SIZE, SHOW_SIZE);
    const S = 2.05;
    const shape = A.move ? A.move.shape(A.mt) : null;
    const lift = (shape?.lift || 0) * S;
    drawCatPose(c, 75, 138 - lift, S, { ...getSkin(), outfit: item }, A.t,
      shape ? { pose: A.move.id, k: 1, shape } : null);
    if (!gGot(item.id)) silhouette(c, SHOW_SIZE, SHOW_SIZE);
  }
  A.raf = requestAnimationFrame(stepShowAnim);
}

/**
 * ตารางอัตราออกใต้ปุ่ม ! — สร้างจากค่าจริงของช่องที่เปิดอยู่เสมอ
 *
 * เดิมอัตราของตู้สมบัติกางเป็นชิปอยู่กลางหน้าตลอดเวลา ซึ่งเป็นข้อมูลที่ดูครั้งเดียว
 * แล้วจำได้ ไม่ควรกินที่ถาวรแข่งกับของที่ผู้เล่นมาดูจริง ๆ คือของกับปุ่มสุ่ม
 * ย้ายมาซ่อนใต้ปุ่ม ! ท่าเดียวกับตู้ชุด สองช่องจึงหาอัตราได้จากที่เดียวกัน
 */
function buildOdds() {
  const row = (cls, label, value) =>
    '<div class="odds-row ' + cls + '"><i></i><span>' + label + '</span><b>' + value + '</b></div>';

  document.getElementById('gachaOdds').innerHTML = gIsT()
    ? Object.values(T_RARITY).map((r) => row(r.key, r.name, pct(r.rate))).join('')
      + '<div class="odds-note">ได้ซ้ำ คืนเพชร ' + T_GACHA.dupeGems + '</div>'
    : row('high', 'ระดับสูง', pct(RARITY.high.rate))
      + row('normal', 'ระดับกลาง', pct(RARITY.normal.rate))
      + row('gold', 'เหรียญทอง', pct(GOLD_RATE))
      + '<div class="odds-note">ได้ชุดซ้ำ คืนทอง '
      + DUPE_REFUND.toLocaleString('en-US') + '</div>';
}

function refreshGacha() {
  refreshGold();

  const t = gIsT();
  document.getElementById('tabTreasure').classList.toggle('on', t);
  document.getElementById('tabSkin').classList.toggle('on', !t);
  document.getElementById('gachaMore').textContent = t ? 'ดูสมบัติอื่นๆ' : 'ดูสกินอื่นๆ';
  document.getElementById('gachaHint').textContent =
    t ? 'เปิดหีบด้วยเพชรชมพู' : 'หมุนตู้ด้วยเหรียญทอง';

  // หีบกับตู้หมุนอยู่ในกรอบเดียวกัน โผล่ทีละอันตามช่องที่เลือก
  document.getElementById('tgChest').classList.toggle('hidden', !t);
  document.getElementById('gachaMachine').classList.toggle('hidden', t);

  document.getElementById('ownedCount').textContent = t ? treasureCount() : ownedCount();
  document.getElementById('totalCount').textContent = gPool().length;

  // ราคากับสกุลเงินบนปุ่มมาจากค่าจริง ไม่ได้พิมพ์ค้างไว้ใน HTML
  const cost = gCost();
  const multi = gMulti();
  const money = gWallet();
  const p1 = document.getElementById('pull1');
  const p5 = document.getElementById('pull5');

  for (const btn of [p1, p5]) btn.querySelector('.cur').className = 'cur ' + (t ? 'gem' : 'coin');
  p1.querySelector('b').textContent = cost.toLocaleString('en-US');
  p5.querySelector('b').textContent = (cost * multi).toLocaleString('en-US');
  p5.querySelector('small').textContent = multi + ' ครั้ง!';
  p1.disabled = money < cost;
  p5.disabled = money < cost * multi;

  buildOdds();
  drawShow();
}

// ── กล่องผลสุ่ม ──
// ใช้ร่วมกันทั้งสองช่อง คลุมทั้งการ์ดไว้ จึงต้องมีทางปิดของตัวเองเสมอ

function closeResult() {
  document.getElementById('gachaResult').classList.add('hidden');
  document.getElementById('gotRow').innerHTML = '';
  // ริบบิ้นต้องล้างด้วย ไม่งั้นชิ้นที่ยังตกไม่จบจะค้างอยู่ในกล่องที่ปิดไปแล้ว
  // แล้วโผล่ค้างกลางอากาศตอนเปิดกล่องรอบหน้า
  document.getElementById('gotConfetti').innerHTML = '';
}

/** ใส่การ์ดลงกล่องผล เหลื่อมกันทีละใบให้ใบหายากมีจังหวะให้สังเกตว่าเรืองแสง */
function pushGotCard(box, cls, html, fill) {
  const card = document.createElement('div');
  card.className = 'got-card ' + cls;
  card.innerHTML = html;
  fill(card);
  card.style.setProperty('--d', (box.children.length * 0.11).toFixed(2) + 's');
  box.appendChild(card);
}

// สีริบบิ้น — ชุดเดียวกับแคปซูลในตู้กาช่า กล่องผลจึงดูเป็นของที่ออกมาจากตู้ใบนั้นจริง ๆ
const CONFETTI = ['#FFC93C', '#FF8FB0', '#8DF3EA', '#C77DFF', '#9DE86F', '#FF8A5C'];

/**
 * โปรยริบบิ้นฉลองหนึ่งชุด
 *
 * สร้างชิ้นใหม่ทุกครั้งแทนการรีสตาร์ตแอนิเมชันของชิ้นเดิม เพราะการรีสตาร์ต
 * ต้องถอดคลาสแล้วบังคับ reflow แล้วใส่กลับ ซึ่งพลาดง่ายและได้ผลไม่เหมือนกันทุกเบราว์เซอร์
 * ส่วนนี่ทิ้งของเก่าแล้วขึ้นใหม่หมด จึงเริ่มจากศูนย์เสมอแน่นอน
 *
 * ค่าสุ่มทุกตัวส่งผ่าน custom property ให้ CSS เป็นคนใช้ ตัว JS จึงไม่ต้องรู้จัก
 * ท่าแอนิเมชันเลย อยากเปลี่ยนทางตกหรือความเร็วก็แก้ที่ @keyframes ที่เดียว
 */
function burstConfetti(boxId = 'gotConfetti') {
  const box = document.getElementById(boxId);
  box.innerHTML = '';

  for (let i = 0; i < 26; i++) {
    const bit = document.createElement('i');
    bit.style.background = CONFETTI[i % CONFETTI.length];
    bit.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
    bit.style.setProperty('--sx', (Math.random() * 60 - 30).toFixed(0) + 'px');
    bit.style.setProperty('--r', Math.floor(Math.random() * 360) + 'deg');
    // หน่วงไม่เท่ากันเป็นเหตุผลเดียวที่มันดูเป็นการโปรย ไม่ใช่แถบสีที่ร่วงพร้อมกันทั้งแถว
    bit.style.setProperty('--d', (Math.random() * 0.55).toFixed(2) + 's');
    bit.style.setProperty('--t', (1.4 + Math.random() * 1.1).toFixed(2) + 's');
    bit.style.setProperty('--w', (5 + Math.random() * 5).toFixed(1) + 'px');
    bit.style.setProperty('--h', (9 + Math.random() * 8).toFixed(1) + 'px');
    box.appendChild(bit);
  }
}

/** หัวเรื่องบอกผลรวมในบรรทัดเดียว ผู้เล่นจึงรู้ทันทีว่ารอบนี้คุ้มไหมก่อนไล่ดูทีละใบ */
function openResult(fresh, word) {
  const box = document.getElementById('gotRow');
  box.innerHTML = '';
  document.getElementById('gotTitle').textContent =
    fresh > 0 ? 'ได้' + word + 'ใหม่ ' + fresh + ' ชิ้น!' : 'ได้รับ!';
  document.getElementById('gachaResult').classList.remove('hidden');
  burstConfetti();
  // เสียงดีใจมาคู่กับริบบิ้นเสมอ ทั้งสองอย่างคือ "การฉลอง" ก้อนเดียวกัน
  //
  // หน่วงไว้นิดเพราะผู้เรียกเพิ่งยิงเสียงบอกระดับของที่ได้ (bonus/kibble) ไปหมาด ๆ
  // ถ้าออกพร้อมกันจะกลายเป็นเสียงก้อนเดียวที่ฟังไม่ออกว่าเป็นอะไร
  // เว้นให้หัวเสียงแรกผ่านไปก่อน แล้วเสียงแมวจึงอ่านเป็น "ปฏิกิริยาดีใจ" ต่อจากนั้น
  setTimeout(() => sfx.cheer(), 200);
  return box;
}

function showOutfitResults(results) {
  const box = openResult(results.filter((r) => r.kind === 'outfit' && r.isNew).length, 'ชุด');

  for (const r of results) {
    if (r.kind === 'gold') {
      pushGotCard(box, 'gold',
        '<span class="coin big" aria-hidden="true"></span><b></b><small>เหรียญทอง</small>',
        (card) => {
          card.querySelector('b').textContent = '+' + r.gold.toLocaleString('en-US');
        });
      continue;
    }

    const o = r.outfit;
    const tier = RARITY[o.rarity];
    pushGotCard(box, o.rarity + (r.isNew ? '' : ' dupe'),
      '<canvas width="72" height="72"></canvas><b></b><small></small>',
      (card) => {
        // ป้ายระดับติดมุมบนเหมือนการ์ดในหน้าเลือกชุด สายตาจึงหาที่เดิมได้
        const sign = tierSign(o.rarity);
        if (sign) card.appendChild(sign);

        card.querySelector('b').textContent = o.name;
        const tag = card.querySelector('small');
        tag.textContent = r.isNew ? 'ใหม่!' : 'ซ้ำ +' + DUPE_REFUND.toLocaleString('en-US');
        tag.style.color = r.isNew ? tier.color : '#B99BD4';

        paintMini(card.querySelector('canvas'), 72,
          (c) => drawCatPose(c, 38, 66, 1.05, { ...getSkin(), outfit: o }, 60));
      });
  }
}

function showTreasureResults(results) {
  const box = openResult(results.filter((r) => r.isNew).length, 'สมบัติ');

  for (const g of results) {
    const t = g.treasure;
    pushGotCard(box, t.rarity + (g.isNew ? '' : ' dupe'),
      '<span class="t-emoji big"></span><b></b><small></small>',
      (card) => {
        card.appendChild(tierSign(t.rarity));
        card.querySelector('.t-emoji').textContent = t.emoji;
        card.querySelector('b').textContent = t.name;
        card.querySelector('small').textContent = g.isNew ? 'ใหม่!' : '+' + g.gems + ' เพชร';
      });
  }
}

// ── หีบสมบัติ ──
// ฝาค่อย ๆ เปิดก่อน แล้วการ์ดค่อยโผล่ ไม่งั้นแอนิเมชันเปิดฝาไม่มีใครได้เห็นสักเฟรม
// ทั้งที่มันคือเหตุผลเดียวที่หีบมีอยู่ — ต้องรู้สึกว่า "เปิดหีบ" ไม่ใช่ "กดปุ่มแล้วมีของ"
const CHEST_OPEN_MS = 430;
let chestTick = 0;
let chestOpen = 0;      // 0 = ปิด, 1 = เปิดสุด
let chestTarget = 0;
let chestTimer = 0;     // จับเวลาช่วง "ฝากำลังเปิด" ก่อนการ์ดจะโผล่

/** สุ่มสมบัติด้วยเพชร */
function doTPull(times) {
  // ฝายังเปิดอยู่ = ยังไม่จบรอบก่อน กดซ้ำตอนนี้จะหักเพชรสองรอบแต่เห็นผลรอบเดียว
  if (chestTimer) return;

  const msg = document.getElementById('gachaMsg');
  const r = pullTreasure(times);
  if (!r.ok) {
    setMsg(msg, 'เพชรไม่พอ ขาดอีก ' + r.need.toLocaleString('en-US'), true);
    return;
  }
  recordPulls(times);   // นับหลังหักเพชรสำเร็จ ไม่ใช่ตอนกด — กดแล้วเพชรไม่พอไม่นับ

  unlockAudio();
  sfx.potion();
  setMsg(msg, r.back ? 'ได้ซ้ำ คืนเพชร ' + r.back.toLocaleString('en-US') : '');
  closeResult();

  // ปิดปุ่มไว้ระหว่างฝากำลังเปิด แล้วให้ refreshGacha() ตอนจบเป็นคนตัดสินใหม่
  // ว่าเปิดปุ่มไหนได้บ้างตามเพชรที่เหลือจริง
  document.getElementById('pull1').disabled = true;
  document.getElementById('pull5').disabled = true;

  chestTarget = 1;
  clearTimeout(chestTimer);
  chestTimer = setTimeout(() => {
    chestTimer = 0;
    chestTarget = 0;   // ฝาปิดกลับเอง พร้อมรับรอบถัดไปโดยไม่ต้องออกจากหน้า

    if (r.results.some((x) => x.isNew && x.treasure.rarity === 'legend')) sfx.bonus();
    else sfx.kibble();

    // ได้ของใหม่ก็เด้งกรอบส่องไปที่ชิ้นล่าสุด ผู้เล่นจะได้เห็นเต็มตาทันที
    const fresh = r.results.filter((x) => x.isNew).pop();
    if (fresh) tHeroId = fresh.treasure.id;

    showTreasureResults(r.results);
    refreshGacha();
    refreshHome();
  }, CHEST_OPEN_MS);
}

/** สุ่มชุดด้วยเหรียญทอง — ผลรอจนแคปซูลแตกถึงจะโผล่ (ดู revealPull) */
function doOPull(times) {
  if (pullProgress > 0) return;   // กันกดรัวระหว่างแอนิเมชันยังไม่จบ

  const res = pull(times);
  if (!res.ok) {
    setMsg(document.getElementById('gachaMsg'),
      'ทองไม่พอ ขาดอีก ' + res.need.toLocaleString('en-US'), true);
    return;
  }
  recordPulls(times);

  unlockAudio();
  sfx.potion();                   // เสียงตอนหมุนตู้ เสียงของรางวัลมาทีหลัง
  setMsg(document.getElementById('gachaMsg'), '');
  gachaShake = 1;
  pullProgress = 0.0001;          // ต้องมากกว่า 0 ให้ลูปรู้ว่ากำลังเปิดอยู่
  pullPending = res.results;

  closeResult();
  refreshGacha();
  refreshHome();
}

function doPull(times) {
  if (gIsT()) doTPull(times);
  else doOPull(times);
}

/** เรียกตอนแคปซูลแตกพอดี — เสียงกับการ์ดจึงมาพร้อมกับภาพ */
function revealPull() {
  const results = pullPending;
  pullPending = null;
  if (!results) return;

  // ได้ของระดับสูงอย่างน้อยหนึ่งชิ้น = เสียงใหญ่ ไม่งั้นเสียงเก็บของธรรมดา
  if (results.some((r) => r.kind === 'outfit' && r.outfit.rarity === 'high')) sfx.bonus();
  else sfx.kibble();

  // ได้ของใหม่ก็เด้งกรอบส่องไปที่ตัวล่าสุดเลย ผู้เล่นจะได้เห็นเต็มตัวทันที
  // ว่าที่เพิ่งปลดล็อกไปหน้าตาเป็นยังไง ไม่ต้องไปไล่หาเองในหน้ารายการ
  const fresh = results.filter((r) => r.kind === 'outfit' && r.isNew).pop();
  if (fresh) heroId = fresh.outfit.id;

  showOutfitResults(results);
  // เก็บประวัติขึ้นคลาวด์ถ้าต่ออยู่ — ล้มเหลวก็ไม่กระทบการเล่น
  import('./net/sync.js').then((m) => m.recordPulls(results)).catch(() => {});
  // ทองที่เพิ่งได้ต้องขึ้นแถบบนทันทีพร้อมการ์ด ไม่ใช่รอเปิดพาเนลใหม่
  refreshGacha();
  refreshHome();
}

/** เลิกทุกอย่างที่ค้างอยู่กลางคัน — ใช้ทั้งตอนสลับช่องและตอนปิดหน้า */
function resetGachaAnim() {
  pullProgress = 0;
  pullPending = null;
  gachaShake = 0;
  clearTimeout(chestTimer);
  chestTimer = 0;
  chestOpen = 0;
  chestTarget = 0;
  closeResult();
  document.getElementById('oddsPop').classList.add('hidden');
}

function setTab(tab) {
  if (gTab === tab) return;
  gTab = tab;
  // ของที่ค้างจากช่องก่อนต้องไม่ตามข้ามมา ไม่งั้นแคปซูลจะไปแตกอยู่บนหีบ
  resetGachaAnim();
  setMsg(document.getElementById('gachaMsg'), '');
  refreshGacha();
}

/** ชิ้นที่เปิดมาแล้วควรส่องก่อน คือชิ้นที่ยังไม่ได้ — นั่นคือของที่ยังต้องลุ้น */
function pickFirstHero(tab) {
  const keep = gTab;
  gTab = tab;
  if (gHeroId() === null) {
    const pool = gPool();
    setHeroId((pool.find((x) => !gGot(x.id)) || pool[0] || {}).id ?? null);
  }
  gTab = keep;
}

function showGacha(on, tab) {
  gachaPanel.classList.toggle('hidden', !on);
  startPanel.classList.toggle('hidden', on);
  if (on) {
    if (tab) gTab = tab;
    resetGachaAnim();
    setMsg(document.getElementById('gachaMsg'), '');
    pickFirstHero('treasure');
    pickFirstHero('skin');
    refreshGacha();
  } else {
    // ปิดพาเนลกลางแอนิเมชัน: ล้างสถานะทิ้ง ไม่งั้นเปิดกลับมาเจอผลเก่าเด้งขึ้นเอง
    // ของที่สุ่มได้ถูกบันทึกไปตั้งแต่ตอนกดแล้ว จึงไม่มีอะไรหาย
    resetGachaAnim();
  }
}

// ── หน้ารายการของทั้งตู้ ────────────────────────────────────
//
// ตอบคำถาม "ตู้นี้มีอะไรบ้าง" ซึ่งกรอบส่องทีละชิ้นตอบไม่ได้
// ที่ยังไม่ได้โชว์เป็นเงา/ขาวดำ ไม่ใช่ซ่อนทิ้ง — ถ้าซ่อน ผู้เล่นจะไม่มีทางรู้ว่า
// ยังเหลืออะไรให้ลุ้น ซึ่งเป็นเหตุผลเดียวที่จะกดสุ่มต่อ

const gListPanel = document.getElementById('gListPanel');

function buildGList() {
  const grid = document.getElementById('glGrid');
  grid.innerHTML = '';

  const t = gIsT();
  document.getElementById('glTitle').textContent = t ? 'สมบัติในตู้นี้' : 'สกินในตู้นี้';
  document.getElementById('glOwned').textContent = t ? treasureCount() : ownedCount();
  document.getElementById('glTotal').textContent = gPool().length;

  for (const item of gPool()) {
    const got = gGot(item.id);
    const card = document.createElement('button');
    card.className = 'skin-card ' + (got ? '' : 'locked ')
      + (item.id === gHeroId() ? 'on ' : '')
      + (t ? 't-card ' + item.rarity : 'outfit-card' + (item.rarity === 'high' ? ' high' : ''));

    if (t) {
      card.innerHTML = '<span class="t-emoji"></span><b></b>';
      card.querySelector('.t-emoji').textContent = item.emoji;
      card.appendChild(tierSign(item.rarity));
    } else {
      card.innerHTML = '<canvas width="96" height="96"></canvas><b></b>';
      // "ขนล้วน" ไม่มีระดับ tierSign() จึงคืน null แล้วการ์ดใบนั้นไม่มีป้าย
      const sign = tierSign(item.rarity);
      if (sign) card.appendChild(sign);
      // วาดแมวตัวที่เลือกอยู่ใส่ชุดใบนี้จริง ๆ ไม่ใช่หุ่นกลาง
      paintMini(card.querySelector('canvas'), 96,
        (c) => drawCatPose(c, 55, 88, 1.5, { ...getSkin(), outfit: item }, 60));
    }
    card.querySelector('b').textContent = item.name;

    // แตะแล้วพากลับไปส่องใบนั้นในหน้าตู้ทันที — หน้านี้มีไว้ "เลือกดู" อย่างเดียว
    // ส่วนติดตั้งสมบัติกับใส่ชุด ยังอยู่ในหน้าสมบัติกับหน้าชุดเหมือนเดิม
    card.addEventListener('click', () => {
      unlockAudio();
      sfx.fish();
      setHeroId(item.id);
      showGList(false);
    });

    grid.appendChild(card);
  }
  markScrollable(grid);
}

function showGList(on) {
  if (on) {
    buildGList();
    swapPanel(gachaPanel, gListPanel);
  } else {
    swapPanel(gListPanel, gachaPanel);
    refreshGacha();
  }
}

/** ถ้วยรางวัลบนแท่นสามขั้น ใช้เป็นไอคอนปุ่มอันดับ */
/**
 * ไอคอนพรสวรรค์ — ไพ่สองใบซ้อนเอียง ใบหน้ามีรอยเท้าแมว มีประกายดาวลอยข้าง ๆ
 *
 * วาดในกรอบ 76 แล้วให้ paintFitted ขยายเต็มกรอบเอง เหมือนไอคอนอื่นในแถว
 * ใบหลังม่วง ใบหน้าชมพู — สองสีจึงอ่านเป็น "ไพ่หลายใบ" ไม่ใช่ป้ายแผ่นเดียว
 */
function drawTalentCards(c) {
  // วาดตัวไพ่แล้วค้างพิกัดที่หมุนไว้ ให้คนเรียกวาดลายบนหน้าไพ่ต่อ แล้ว restore เอง
  const card = (cx, cy, rot, top, bottom) => {
    c.save();
    c.translate(cx, cy);
    c.rotate(rot);
    const g = c.createLinearGradient(0, -24, 0, 24);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    c.fillStyle = g;
    c.strokeStyle = '#FFE49B';
    c.lineWidth = 2.6;
    c.beginPath();
    c.roundRect(-16, -23, 32, 46, 6);
    c.fill();
    c.stroke();
    // เส้นขอบในบาง ๆ ให้ดูเป็นไพ่ที่พิมพ์กรอบไว้ ไม่ใช่กระดาษเปล่า
    c.strokeStyle = 'rgba(255,255,255,.45)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.roundRect(-11.5, -18.5, 23, 37, 3.5);
    c.stroke();
  };

  // ใบหลัง
  card(29, 40, -0.26, '#B78CFF', '#6A3FC4');
  c.fillStyle = 'rgba(255,255,255,.55)';
  c.beginPath();
  c.arc(0, 0, 4.2, 0, Math.PI * 2);
  c.fill();
  c.restore();

  // ใบหน้า: รอยเท้าแมว อุ้งใหญ่หนึ่ง นิ้วเล็กสี่
  card(45, 38, 0.2, '#FFB3D9', '#FF6FAE');
  c.fillStyle = '#FFFFFF';
  c.beginPath();
  c.ellipse(0, 4, 6.2, 5.2, 0, 0, Math.PI * 2);
  c.fill();
  for (const [x, y] of [[-7, -3], [-2.6, -7.4], [2.6, -7.4], [7, -3]]) {
    c.beginPath();
    c.ellipse(x, y, 2.3, 2.8, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();

  // ประกายดาวสองดวง ลอยนอกไพ่ = "พลังพิเศษ"
  const star = (x, y, r) => {
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const k = i % 2 ? r * 0.38 : r;
      c.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
    }
    c.closePath();
    c.fill();
  };
  c.fillStyle = '#FFE49B';
  star(62, 14, 6.5);
  c.fillStyle = 'rgba(255,243,226,.85)';
  star(14, 62, 4.2);
}

function drawTrophy(c) {
  c.fillStyle = '#FFC93C';
  // ตัวถ้วย
  c.beginPath();
  c.moveTo(26, 16);
  c.lineTo(50, 16);
  c.quadraticCurveTo(48, 42, 38, 44);
  c.quadraticCurveTo(28, 42, 26, 16);
  c.fill();
  // หูจับสองข้าง
  c.strokeStyle = '#FFC93C';
  c.lineWidth = 3.4;
  c.beginPath(); c.arc(24, 23, 7, Math.PI * 0.55, Math.PI * 1.5); c.stroke();
  c.beginPath(); c.arc(52, 23, 7, Math.PI * 1.5, Math.PI * 0.45); c.stroke();
  // ก้านกับฐาน
  c.fillStyle = '#E0A82A';
  c.fillRect(35, 43, 6, 8);
  c.beginPath(); c.roundRect(28, 50, 20, 5, 2); c.fill();
  // แท่นสามขั้น บอกว่าเป็นเรื่องอันดับไม่ใช่แค่รางวัล
  c.fillStyle = 'rgba(255,243,226,.5)';
  c.beginPath(); c.roundRect(12, 62, 16, 8, 2); c.fill();
  c.fillStyle = 'rgba(255,243,226,.8)';
  c.beginPath(); c.roundRect(30, 57, 16, 13, 2); c.fill();
  c.fillStyle = 'rgba(255,243,226,.35)';
  c.beginPath(); c.roundRect(48, 65, 16, 5, 2); c.fill();
}

// ── กระดานคะแนน ────────────────────────────────────────────

function rankNote(html) {
  document.getElementById('rankList').innerHTML =
    '<p class="rank-note">' + html + '</p>';
}

async function buildRank() {
  const st = getStage();
  document.getElementById('rankStage').textContent = st.name;
  rankNote('กำลังโหลด…');

  if (!cloudReady) {
    rankNote('ยังไม่ได้ต่อฐานข้อมูล<br>สถิติเก็บอยู่ในเครื่องนี้เท่านั้น');
    return;
  }

  const rows = await fetchLeaderboard(st.id, 20);
  if (!rows.length) {
    rankNote('ยังไม่มีใครทำคะแนนในด่านนี้<br>ไปเป็นคนแรกกันเถอะ!');
    return;
  }

  const list = document.getElementById('rankList');
  list.innerHTML = '';
  const me = userId();
  rows.forEach((r, i) => {
    // แถวที่มี id (มาจาก leaderboard_profiles) แตะแล้วส่องโปรไฟล์ได้ — เป็นปุ่ม
    const tappable = Boolean(r.id);
    const row = document.createElement(tappable ? 'button' : 'div');
    if (tappable) row.type = 'button';
    row.className = 'rank-row' + (i < 3 ? ' top' + (i + 1) : '')
      + (tappable ? ' tap' : '') + (me && r.id === me ? ' me' : '');
    row.innerHTML = '<span class="no"></span><canvas class="rank-face" width="96" height="96" aria-hidden="true"></canvas>'
      + '<span class="who"></span><span class="pts"></span>';
    // สามอันดับแรกเป็นเหรียญ ที่เหลือเป็นตัวเลข
    row.querySelector('.no').textContent = i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1;
    row.querySelector('.who').textContent = r.name || 'แมวนิรนาม';
    row.querySelector('.pts').textContent = Number(r.score).toLocaleString('en-US');
    // หน้าน้องของคนนั้นจริง ๆ (สกิน + ชุดจากโปรไฟล์สาธารณะ) — ไม่มีข้อมูลก็เป็นน้องส้มตั้งต้น
    const skin = r.public_profile ? remoteProfile(r).skin : othersSkin(SKINS[0], r.id);
    paintMini(row.querySelector('.rank-face'), 96, (c) => drawCatFace(c, 48, 56, 2.5, skin));
    if (tappable) {
      row.addEventListener('click', () => { unlockAudio(); openRankProfile(r); });
    }
    list.appendChild(row);
  });
  markScrollable(list);
}

const NAME_KEY = 'cookie-runner:name';

/** ชื่อที่โชว์บนกระดาน เก็บสำเนาไว้ในเครื่องด้วย จะได้เติมช่องได้ทันทีไม่ต้องรอเน็ต */
function localName() {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * เก็บชื่อลงเครื่องก่อนเสมอ แล้วค่อยส่งขึ้นคลาวด์
 * ใช้ร่วมกันระหว่างหน้าตั้งชื่อตอนสมัครกับช่องแก้ชื่อในหน้าอันดับ
 * ส่งไม่สำเร็จก็ไม่เป็นไร ชื่อในเครื่องยังอยู่ เดี๋ยวรอบหน้าค่อยส่งใหม่
 */
async function storeName(name) {
  // ── ชื่อต้องไม่ซ้ำใคร ──
  // เข้าสู่ระบบอยู่ = ให้ฐานข้อมูลตรวจและเปลี่ยนชื่อในคำสั่งเดียว (claim_name)
  // ผ่านแล้วค่อยเก็บลงเครื่อง ไม่งั้นเครื่องจะโชว์ชื่อที่จริง ๆ ไม่ได้เป็นของเรา
  if (cloudReady && userId()) {
    const r = await claimName(name);
    if (!r.ok && r.reason !== 'schema') return r;
    // ยังไม่ได้รัน names.sql — ตรวจซ้ำไม่ได้ ใช้ทางเดิมไปก่อน (เกมยังเล่นได้)
    if (!r.ok) await pushName(name).catch(() => {});
  }
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* เซฟในเครื่องไม่ได้ก็ไม่เป็นไร ชื่อบนคลาวด์เปลี่ยนแล้ว */
  }
  return { ok: true };
}

/** ชื่อยาวได้กี่ตัวอักษร — ต้องตรงกับ claim_name ใน supabase/names.sql */
const NAME_MAX = 10;

/** ตัดชื่อให้อยู่ในกติกา (นับเป็นตัวอักษรจริง อีโมจิหนึ่งตัวนับหนึ่ง) */
function cleanName(raw) {
  return Array.from(String(raw || '').trim()).slice(0, NAME_MAX).join('');
}

/**
 * ตั้งชื่อไม่สำเร็จ → กล่องเตือนพร้อมปุ่มตกลง
 * ชื่อซ้ำต้องเด้งเป็นกล่องให้เห็นชัด ไม่ใช่ข้อความเล็ก ๆ ที่มองข้ามได้
 */
async function warnName(name, reason) {
  const text = {
    taken: { title: 'ชื่อนี้มีคนใช้แล้ว', body: `“${name}” มีผู้เล่นคนอื่นใช้อยู่ ลองตั้งชื่ออื่นนะ` },
    invalid: { title: 'ตั้งชื่อไม่ได้', body: `ชื่อต้องมี 1–${NAME_MAX} ตัวอักษร` },
    offline: { title: 'ตั้งชื่อไม่ได้', body: 'ต้องเข้าสู่ระบบและต่อเน็ตก่อน ถึงจะตั้งชื่อได้' },
  }[reason] || { title: 'ตั้งชื่อไม่ได้', body: 'ต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง' };
  await confirmBox({ ...text, okText: 'ตกลง', alertOnly: true });
}

// ── ลำดับหน้าเข้าเกม ───────────────────────────────────────
//
//   ชื่อเกม → เข้าสู่ระบบ → ตั้งชื่อตัวละคร → ล็อบบี้
//
// สองหน้ากลางโผล่เฉพาะคนที่ยังไม่มีบัญชี ใครเคยเข้าแล้วกด "เข้าเกม" ทีเดียว
// ถึงล็อบบี้เลย — การถามซ้ำทุกครั้งที่เปิดเกมคือด่านที่ทำให้คนเลิกเล่นก่อนได้เล่น
//
// การสร้างบัญชีเกิดตอนกดปุ่มเท่านั้น ไม่ใช่ตอนเปิดหน้า (ดูเหตุผลใน cloud.js)

/** ค่าเริ่มต้นจากฐานข้อมูล — ไม่ใช่ชื่อที่ผู้เล่นตั้งเอง จึงยังต้องผ่านหน้าตั้งชื่อ */
const DEFAULT_NAME = 'แมวนิรนาม';

function chosenName() {
  const n = localName();
  return n && n !== DEFAULT_NAME ? n : '';
}

/**
 * มีบัญชีแล้วหรือยัง
 *
 * ต่อคลาวด์ได้ → ยึด user id เป็นคำตอบ
 * ไม่ได้ตั้งคีย์ → ไม่มี id ให้ยึด ใช้ "เคยตั้งชื่อรึยัง" แทน เพราะหน้าตั้งชื่อ
 *                 คือขั้นสุดท้ายของการสมัคร มีชื่อ = ผ่านมาครบแล้ว
 */
function hasAccount() {
  return cloudReady ? Boolean(userId()) : Boolean(chosenName());
}

/** ข้อความสถานะใต้ฟอร์ม — เปลี่ยนเป็นสีเตือนเมื่อเป็นความผิดพลาด */
function setMsg(el, text, bad = false) {
  el.textContent = text || '';
  el.classList.toggle('bad', Boolean(bad));
}

/** โชว์แผงเดียว ปิดที่เหลือทั้งหมด */
function showPanel(panel) {
  closeAllPanels();
  panel.classList.remove('hidden');
}

/**
 * รายชื่อแผงที่โชว์อยู่ตอนนี้ เรียงตามลำดับใน DOM
 *
 * ใช้เป็น "ภาพถ่ายสถานะจอ" ก่อนงานที่ต้อง await แล้วค่อยเปลี่ยนหน้า
 * เทียบก่อน-หลังแล้วรู้ได้ว่าผู้เล่นเดินไปไหนต่อระหว่างที่รอเน็ตหรือเปล่า
 */
function visiblePanels() {
  return [...document.querySelectorAll('.stage .panel')]
    .filter((p) => !p.classList.contains('hidden'))
    .map((p) => p.id)
    .join(',');
}

function enterGame() {
  // แตะปุ่มนี้คือ gesture แรกของผู้เล่น เพลงกับเสียงจึงเริ่มได้ตั้งแต่ตรงนี้
  unlockAudio();
  startMusic();
  if (!hasAccount()) return showAuth();
  if (!chosenName()) return showNameStep();
  enterLobby();
}

/**
 * ด่านสุดท้ายของการเข้าเกม — เข้าสู่ระบบครบแล้ว พาไปล็อบบี้พร้อมคลิปเปิดเกม
 *
 * แยกจาก goHome() เพราะ goHome ถูกเรียกจากทางอื่นด้วย (กลับหน้าแรกหลังจบตา)
 * คลิปต้องโผล่เฉพาะตอน "เพิ่งเข้าเกม" ไม่ใช่ทุกครั้งที่กลับล็อบบี้
 *
 * สร้างล็อบบี้ไว้ข้างหลังก่อนเสมอ คลิปคลุมทับอยู่ พอปิดคลิปจึงเห็นล็อบบี้ทันทีไม่มีจอว่าง
 */
function enterLobby() {
  goHome();
  playIntroVideo({
    // เพลงหน้าแรกเงียบระหว่างคลิป ไม่งั้นเสียงคลิปกับเพลงตีกัน
    onOpen: () => stopMusic(),
    onDone: () => { unlockAudio(); startMusic(); maybePopDaily(); },
  });
}

function showAuth() {
  setMsg(document.getElementById('authMsg'), '');
  document.getElementById('guestBtn').disabled = false;
  // เขียนลง <span> ข้างใน ไม่ใช่ตัว <p> — ตัว <p> มีปุ่ม ! เป็นลูกอยู่ด้วย
  // เขียนทับที่ <p> เมื่อไหร่ ปุ่มหายทันที (ดูคอมเมนต์ที่ #authLead ใน index.html)
  document.getElementById('authLeadText').textContent = cloudReady
    ? 'เล่นได้เลยไม่ต้องกรอกอะไร ค่อยผูกอีเมลทีหลังก็ได้'
    : 'ยังไม่ได้ต่อฐานข้อมูล เล่นได้ปกติแต่ข้อมูลจะอยู่ในเครื่องนี้เท่านั้น';
  showPanel(authPanel);
}

/** warn = คำเตือนที่ตามมาจากหน้าก่อน เช่นสร้างบัญชีไม่สำเร็จแต่ยังให้เล่นต่อ */
function showNameStep(warn = '') {
  document.getElementById('nameInput').value = chosenName();
  // โชว์แมวตัวที่เลือกอยู่จริง ๆ ให้เห็นว่ากำลังตั้งชื่อให้ใคร
  paintMini(document.getElementById('nameCat'), 120,
    (c) => drawCatPose(c, 60, 110, 1.85, getSkin(), 60));
  setMsg(document.getElementById('nameMsg'), warn, Boolean(warn));
  showPanel(namePanel);
}

async function doGuest() {
  const btn = document.getElementById('guestBtn');
  const msg = document.getElementById('authMsg');
  btn.disabled = true;
  unlockAudio();
  sfx.potion();

  let warn = 'ยังไม่ได้ตั้งค่าฐานข้อมูล — ข้อมูลจะอยู่ในเครื่องนี้เท่านั้น';
  if (cloudReady) {
    setMsg(msg, 'กำลังสร้างบัญชี…');
    try {
      const { startGuest } = await import('./net/sync.js');
      const r = await startGuest();
      warn = r.ok ? '' : r.error + ' — เล่นต่อได้ แต่ข้อมูลจะอยู่ในเครื่องนี้เท่านั้น';
    } catch {
      warn = 'ต่อฐานข้อมูลไม่ได้ — เล่นต่อได้ แต่ข้อมูลจะอยู่ในเครื่องนี้เท่านั้น';
    }
  }

  btn.disabled = false;
  setMsg(msg, '');
  // ต่อคลาวด์ไม่ได้ก็ต้องเล่นได้อยู่ดี คำเตือนจึงตามไปโชว์ที่หน้าตั้งชื่อ
  // ไม่ใช่ค้างผู้เล่นไว้ที่หน้านี้จนไปต่อไม่ได้
  showNameStep(warn);
}

async function saveCharacterName() {
  const msg = document.getElementById('nameMsg');
  const name = cleanName(document.getElementById('nameInput').value);
  if (!name) return setMsg(msg, 'ตั้งชื่อก่อนนะ', true);

  const btn = document.getElementById('nameSave');
  btn.disabled = true;

  // จำไว้ว่าตอนเริ่มยิงคลาวด์ จอโชว์อะไรอยู่
  const before = visiblePanels();

  const r = await storeName(name);
  btn.disabled = false;
  if (!r.ok) {
    setMsg(msg, r.reason === 'taken' ? 'ชื่อนี้มีคนใช้แล้ว' : '', true);
    await warnName(name, r.reason);
    return;
  }
  unlockAudio();
  sfx.potion();

  // ── กันคลาวด์ตอบช้าแล้วมาปิดหน้าที่ผู้เล่นเปิดอยู่ ──
  // storeName() ยิงขึ้นคลาวด์ ซึ่งบนเน็ตช้ากินเวลาได้หลายวินาที
  // goHome() ข้างล่างเรียก closeAllPanels() ซึ่งปิดทุกแผงทิ้งหมด
  // ถ้าระหว่างรอมีแผงอื่นถูกเปิดขึ้นมา การเด้งกลับล็อบบี้ตอนนั้นคือการ
  // ลากผู้เล่นออกจากหน้าที่เขากำลังดูอยู่โดยที่เขาไม่ได้กดอะไรเลย
  //
  // ตามทางกดปกติเข้าเงื่อนไขนี้ไม่ได้ เพราะแผงตั้งชื่อคลุมเต็มจอและปุ่มถูกปิดไว้
  // แต่กันไว้เพราะมันคือกฎที่ควรใช้กับทุกงานที่ "await แล้วค่อยไปเปลี่ยนหน้า"
  // ไม่ใช่เฉพาะที่นี่ — และเสียแค่บรรทัดเดียว
  if (visiblePanels() !== before) return;
  enterLobby();
}

// ── อีเมล: เข้าสู่ระบบ / ผูกกับบัญชีที่เล่นอยู่ ──────────────
//
// ทั้งสองงานมีขั้นตอนเดียวกันเป๊ะ (กรอกอีเมล → รับรหัส 6 หลัก → ยืนยัน)
// ต่างแค่ API ที่เรียกกับข้อความ จึงใช้แผงเดียวกันแล้วสลับโหมดเอา
//
// ใช้รหัส 6 หลักไม่ใช่ลิงก์ในเมล เพราะบนมือถือลิงก์จะเปิดในเบราว์เซอร์ของ
// แอปเมล ซึ่งเป็นคนละที่กับแท็บที่เปิดเกมค้างไว้ แล้ว session จะไปลงผิดที่

let mailMode = 'login';   // 'login' = เข้าด้วยอีเมล | 'link' = ผูกกับบัญชีที่เล่นอยู่
let mailFrom = null;      // แผงต้นทาง กดกลับแล้วคืนที่เดิม
let mailAddr = '';        // อีเมลที่ส่งรหัสไป ตอนยืนยันต้องส่งตัวเดิมกลับไปด้วย

const MAIL_TEXT = {
  login: {
    title: 'เข้าด้วยอีเมล',
    lead: 'กรอกอีเมลที่เคยผูกไว้ เดี๋ยวส่งรหัส 6 หลักไปให้ — '
        + 'ข้อมูลของผู้มาเยือนในเครื่องนี้จะถูกแทนที่ด้วยข้อมูลของบัญชีนั้น '
        + 'ถ้าอยากเก็บของที่เล่นมา ให้ใช้ "เชื่อมอีเมล" ในหน้าตั้งค่าแทน',
  },
  link: {
    title: 'เชื่อมอีเมล',
    lead: 'ผูกอีเมลไว้กันข้อมูลหาย ทอง ชุด และสถิติอยู่ครบเหมือนเดิมทุกอย่าง '
        + 'เพราะยังเป็นบัญชีเดิม แค่กู้คืนได้เวลาเปลี่ยนเครื่องหรือล้างเบราว์เซอร์',
  },
};

function showMail(mode, from) {
  mailMode = mode;
  mailFrom = from;
  mailAddr = '';
  document.getElementById('mailTitle').textContent = MAIL_TEXT[mode].title;
  document.getElementById('mailLead').textContent = MAIL_TEXT[mode].lead;
  document.getElementById('mailInput').value = '';
  document.getElementById('codeInput').value = '';
  document.getElementById('mailStep2').classList.add('hidden');
  setMsg(document.getElementById('mailMsg'), '');

  // สลับเองทีละใบ ไม่ใช้ showPanel() — closeAllPanels() ข้างในจะล้าง settingsFrom
  // ทิ้ง แล้วปุ่มกลับของหน้าตั้งค่าจะพากลับไปที่ "ไม่มีแผงไหนเปิดเลย"
  from.classList.add('hidden');
  mailPanel.classList.remove('hidden');
}

function closeMail() {
  mailPanel.classList.add('hidden');
  (mailFrom || authPanel).classList.remove('hidden');
  mailFrom = null;
}

async function sendCode() {
  const msg = document.getElementById('mailMsg');
  const email = document.getElementById('mailInput').value.trim();
  if (!email) return setMsg(msg, 'กรอกอีเมลก่อนนะ', true);

  const btn = document.getElementById('mailSend');
  btn.disabled = true;
  setMsg(msg, 'กำลังส่งรหัส…');

  const r = mailMode === 'link' ? await sendLinkCode(email) : await sendLoginCode(email);
  btn.disabled = false;
  if (!r.ok) return setMsg(msg, r.error, true);

  mailAddr = email;
  document.getElementById('mailStep2').classList.remove('hidden');
  setMsg(msg, 'ส่งรหัสไปที่ ' + email + ' แล้ว เช็คโฟลเดอร์สแปมด้วยนะ');
}

async function verifyCode() {
  const msg = document.getElementById('mailMsg');
  const token = document.getElementById('codeInput').value.trim();
  if (token.length < 6) return setMsg(msg, 'กรอกรหัส 6 หลักให้ครบ', true);

  const btn = document.getElementById('codeVerify');
  btn.disabled = true;
  setMsg(msg, 'กำลังตรวจรหัส…');

  const r = mailMode === 'link'
    ? await verifyLinkCode(mailAddr, token)
    : await verifyLoginCode(mailAddr, token);
  btn.disabled = false;
  if (!r.ok) return setMsg(msg, r.error, true);

  if (mailMode === 'link') {
    // บัญชีเดิม user id เดิม ของในเครื่องยังตรงอยู่ทุกอย่าง ไม่ต้องโหลดหน้าใหม่
    setMsg(msg, 'ผูกอีเมลเรียบร้อย! ล้างเบราว์เซอร์แล้วก็กู้คืนได้แล้ว');
    document.getElementById('mailStep2').classList.add('hidden');
    refreshAccount();
    return;
  }

  // เข้าด้วยอีเมล = สลับไปอีกบัญชี ของในเครื่องเป็นของบัญชีเก่าทั้งหมด ต้องล้างก่อน
  // แล้วโหลดหน้าใหม่ ให้ boot.js ดึงของบัญชีนี้ลงมาก่อนโมดูลเกมจะอ่าน localStorage
  setMsg(msg, 'เข้าสู่ระบบแล้ว กำลังโหลดข้อมูล…');
  const { clearLocalProgress } = await import('./net/sync.js');
  clearLocalProgress();
  location.reload();
}

// ── แถวบัญชีในหน้าตั้งค่า ───────────────────────────────────

// ออกจากระบบต้องกดสองครั้ง — พลาดทีเดียวคือหลุดออกจากบัญชีกลางเกม
let signOutArmed = false;

/** สองสถานะที่ผู้เล่นต้องแยกออก: ผูกอีเมลแล้ว (กู้คืนได้) กับยังไม่ผูก (หายแล้วหายเลย) */
function refreshAccount() {
  const state = document.getElementById('accState');
  const btn = document.getElementById('accBtn');
  setMsg(document.getElementById('accMsg'), '');
  signOutArmed = false;

  if (!cloudReady) {
    state.textContent = 'เก็บในเครื่องนี้';
    btn.textContent = 'เชื่อมอีเมล';
    btn.disabled = true;
    return;
  }

  btn.disabled = false;
  const acc = currentAccount();
  if (!acc) {
    state.textContent = 'ยังไม่ได้เข้าสู่ระบบ';
    btn.textContent = 'เข้าสู่ระบบ';
  } else if (acc.email) {
    state.textContent = acc.email;
    btn.textContent = 'ออกจากระบบ';
  } else {
    state.textContent = 'ผู้มาเยือน';
    btn.textContent = 'เชื่อมอีเมล';
  }
}

async function accountAction() {
  const acc = cloudReady ? currentAccount() : null;
  if (!acc) return showMail('login', settingsPanel);
  if (!acc.email) return showMail('link', settingsPanel);

  const btn = document.getElementById('accBtn');
  if (!signOutArmed) {
    signOutArmed = true;
    btn.textContent = 'กดอีกครั้งเพื่อยืนยัน';
    setMsg(document.getElementById('accMsg'),
      'ข้อมูลอยู่บนคลาวด์ครบ กลับเข้ามาด้วยอีเมลเดิมได้เสมอ');
    return;
  }

  btn.disabled = true;
  await signOut();
  // ของในเครื่องเป็นของบัญชีที่เพิ่งออกไป ถ้าไม่ล้าง คนถัดไปที่กดเล่นแบบ
  // ผู้มาเยือนจะได้ทองกับชุดของเจ้าของเครื่องติดไปด้วย
  const { clearLocalProgress } = await import('./net/sync.js');
  clearLocalProgress();
  location.reload();
}

// ── ผูกปุ่มของทั้งสี่หน้า ────────────────────────────────────

/**
 * ช่องกรอกทุกช่องต้องกันอีเวนต์ไม่ให้ทะลุขึ้นไปถึง window
 * ไม่งั้นการเคาะ Space ตอนพิมพ์ชื่อจะกลายเป็นสั่งกระโดด (input.js ดัก keydown ที่ window)
 */
function typable(id, onEnter) {
  document.getElementById(id).addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') onEnter();
  });
}

typable('nameInput', saveCharacterName);
typable('mailInput', sendCode);
typable('codeInput', verifyCode);

document.getElementById('enterBtn').addEventListener('click', enterGame);

// โหลดคลิปเปิดเกมรอไว้ตั้งแต่เปิดหน้า ไฟล์ใหญ่ ไปเริ่มโหลดตอนกดเข้าเกมจะเห็นจอดำรอ
preloadIntroVideo();

// ── ตั้งค่า: เปิด/ปิดคลิปเปิดเกม และเสียงของคลิป ──
function paintIntroSetting() {
  const on = introVideoEnabled();
  document.getElementById('introState').textContent = on ? 'แสดง' : 'ไม่แสดง';
  document.getElementById('introToggle').textContent = on ? 'ปิดคลิป' : 'เปิดคลิป';

  // ปุ่มลำโพงบอกสถานะ "ตอนนี้" ไม่ใช่บอกว่ากดแล้วจะเกิดอะไร — กติกาเดียวกับสองแถวบน
  // ปิดคลิปไปแล้วก็ไม่มีเสียงคลิปให้ตั้ง ปิดปุ่มไว้ดีกว่าปล่อยให้กดแล้วไม่มีผลอะไร
  const snd = introSoundEnabled();
  const mute = document.getElementById('introMute');
  mute.classList.toggle('muted', !snd);
  mute.disabled = !on;
  mute.setAttribute('aria-label', (snd ? 'ปิด' : 'เปิด') + 'เสียงคลิปเปิดเกม');
  mute.setAttribute('aria-pressed', String(!snd));
}
document.getElementById('introToggle').addEventListener('click', () => {
  unlockAudio();
  sfx.fish();
  setIntroVideoEnabled(!introVideoEnabled());
  paintIntroSetting();
});
document.getElementById('introMute').addEventListener('click', () => {
  unlockAudio();
  sfx.fish();
  setIntroSoundEnabled(!introSoundEnabled());
  paintIntroSetting();
});
paintIntroSetting();
document.getElementById('authBack').addEventListener('click', () => showPanel(titlePanel));
document.getElementById('guestBtn').addEventListener('click', doGuest);
document.getElementById('loginMailBtn').addEventListener('click', () => showMail('login', authPanel));
document.getElementById('nameSave').addEventListener('click', saveCharacterName);
document.getElementById('mailSend').addEventListener('click', sendCode);
document.getElementById('codeVerify').addEventListener('click', verifyCode);
document.getElementById('mailBack').addEventListener('click', closeMail);
document.getElementById('accBtn').addEventListener('click', accountAction);

// ป้ายใต้ปุ่มบอกล่วงหน้าว่าข้อมูลจะไปเก็บที่ไหน ดีกว่าปล่อยให้ไปเจอเอาตอนเล่นไปแล้ว
document.getElementById('titleNote').textContent = cloudReady
  ? '' : 'ยังไม่ได้ต่อฐานข้อมูล — เล่นได้ปกติ แต่ข้อมูลอยู่ในเครื่องนี้เท่านั้น';

// ── ตั้งค่า ────────────────────────────────────────────────

const VOL_STEP = 0.1;

// ระดับก่อนกดปิดเสียง เอาไว้คืนให้ตอนกดเปิดกลับ
// เก็บในตัวแปรเฉย ๆ ไม่ต้องเซฟลงเครื่อง — ถ้าปิดเสียงค้างไว้แล้วปิดเกมไป
// รอบหน้ากดเปิดจะได้ค่าเริ่มต้นแทน ซึ่งดีกว่าเงียบต่อโดยไม่รู้ว่าทำไม
/** ระดับของแต่ละช่องก่อนกดปิดเสียง เก็บทีละช่องเพื่อคืนค่าเดิมได้ตรง */
let volBeforeMute = {};

/** ช่องเสียงทั้งหมดที่ปรับได้ — เพิ่มช่องใหม่ก็เติมที่นี่ที่เดียว หน้าจอสร้างจากตัวนี้ */
/** ช่องเสียงทั้งหมดที่ปรับได้ — เพิ่มช่องใหม่ก็เติมที่นี่ที่เดียว หน้าจอสร้างจากตัวนี้ */
const MIX_ROWS = [
  { ch: 'music', name: 'เพลง', bar: 'musicBar', num: 'musicNum',
    down: 'musicDown', up: 'musicUp', mute: 'musicMute' },
  { ch: 'sfx', name: 'เอฟเฟกต์', bar: 'sfxBar', num: 'sfxNum',
    down: 'sfxDown', up: 'sfxUp', mute: 'sfxMute' },
];

/** วาดแถวเดียว — สิบขีดแทนสิบระดับ อ่านออกเร็วกว่าตัวเลขตอนกดปุ่มรัว ๆ */
function drawMixRow(row) {
  const v = getMix(row.ch);
  const lit = Math.round(v * 10);

  const bar = document.getElementById(row.bar);
  if (bar.children.length !== 10) bar.innerHTML = '<i></i>'.repeat(10);
  [...bar.children].forEach((el, i) => el.classList.toggle('on', i < lit));

  document.getElementById(row.num).textContent = Math.round(v * 100) + '%';
  // ปิดปุ่มที่กดไปก็ไม่มีอะไรเกิดขึ้น ดีกว่าปล่อยให้กดแล้วเงียบไม่รู้ว่าสุดแล้ว
  document.getElementById(row.down).disabled = v <= 0;
  document.getElementById(row.up).disabled = v >= 1;

  // ปุ่มลำโพงบอกสถานะ "ตอนนี้" ไม่ใช่บอกว่ากดแล้วจะเกิดอะไร
  // เงียบอยู่ = ลำโพงมีกากบาท, ดังอยู่ = ลำโพงมีคลื่นเสียง
  const mute = document.getElementById(row.mute);
  const muted = v <= 0;
  mute.classList.toggle('muted', muted);
  mute.setAttribute('aria-label', (muted ? 'เปิดเสียง' : 'ปิดเสียง') + row.name);
  mute.setAttribute('aria-pressed', String(muted));
}

function drawVolume() {
  MIX_ROWS.forEach(drawMixRow);
  paintMuteBadge();
}

/**
 * ป้ายลำโพงขีดฆ่าบนปุ่มตั้งค่า — โผล่เมื่อเสียงเกมถูกหรี่เป็นศูนย์ทั้งสองช่อง
 *
 * ปุ่มตั้งค่าคือทางเดียวที่แก้เรื่องนี้ได้ ป้ายจึงอยู่บนปุ่มนั้นเลย ไม่ใช่ลอยอยู่ที่อื่น
 * "เกมเงียบ" เป็นสถานะที่ผู้เล่นตั้งเองได้ ไม่ใช่ความผิดพลาด ป้ายจึงเป็นสีเทาเงียบ ๆ
 * ไม่ใช่จุดแดงเตือนภัยแบบป้ายจดหมาย
 */
function paintMuteBadge() {
  const btn = document.getElementById('btnSettings');
  if (!btn) return;
  const off = gameMuted();
  btn.classList.toggle('muted-hint', off);
  btn.setAttribute('aria-label', off ? 'ตั้งค่า (เสียงเกมปิดอยู่)' : 'ตั้งค่า');
}

function stepMix(ch, dir) {
  setMix(ch, getMix(ch) + dir * VOL_STEP);
  drawVolume();
  // ให้ได้ยินระดับใหม่ทันทีตอนกด ไม่ต้องออกไปลองในเกมแล้วค่อยกลับมาปรับ
  //
  // ── ทำไมช่องเพลงไม่ต้องเล่นอะไรตอนกด ──
  // เพลงเล่นค้างอยู่แล้ว การหรี่จึงได้ยินผลทันทีจากเพลงที่กำลังเล่น
  // ถ้ายิงเสียงเอฟเฟกต์ออกมาด้วย มันจะกลายเป็นการฟังระดับของ "อีกช่องหนึ่ง"
  if (ch === 'sfx') sfx.fish();
}

/**
 * ปิด/เปิดเสียงของช่องเดียว
 *
 * ── ทำไมจำระดับเดิมแยกทีละช่อง ──
 * ถ้าเก็บเป็นตัวเลขเดียว คนที่ตั้งเพลงไว้ 30% กับเอฟเฟกต์ 90% แล้วกดปิดทั้งคู่
 * จะได้ระดับเท่ากันทั้งสองช่องตอนเปิดกลับ ซึ่งไม่ใช่ค่าที่เขาตั้งไว้สักช่อง
 */
function toggleMute(ch) {
  if (getMix(ch) > 0) {
    volBeforeMute[ch] = getMix(ch);
    setMix(ch, 0);
    drawVolume();
    return;   // ปิดเสียงแล้วไม่ต้องเล่นเสียงยืนยัน มันจะไม่ได้ยินอยู่ดี
  }
  setMix(ch, volBeforeMute[ch] > 0 ? volBeforeMute[ch] : 0.8);
  drawVolume();
  // ดังขึ้นมาแล้ว ให้ได้ยินทันทีว่าดังแค่ไหน — เฉพาะช่องเอฟเฟกต์
  // เพราะเพลงเล่นค้างอยู่แล้ว จึงได้ยินผลจากเพลงที่กำลังเล่นทันทีอยู่ดี
  if (ch === 'sfx') sfx.fish();
}

// จำว่าเปิดมาจากแผงไหน แล้วคืนกลับไปที่เดิมตอนกดกลับ
// เข้าได้ทั้งจากหน้าแรกและจากหน้าหยุดชั่วคราวกลางรอบเล่น ซึ่งคนละที่กัน
let settingsFrom = [];

function showSettings(on) {
  if (on) {
    settingsFrom = [...document.querySelectorAll('.panel:not(.hidden)')];
    settingsFrom.forEach((p) => p.classList.add('hidden'));
    settingsPanel.classList.remove('hidden');
    drawVolume();
    refreshAccount();
    paintIntroSetting();
  } else {
    settingsPanel.classList.add('hidden');
    settingsFrom.forEach((p) => p.classList.remove('hidden'));
    settingsFrom = [];
  }
}

function showRank(on) {
  rankPanel.classList.toggle('hidden', !on);
  startPanel.classList.toggle('hidden', on);
  if (on) {
    buildRank();
  }
}

function buildStageGrid() {
  const grid = document.getElementById('stageGrid');
  grid.innerHTML = '';

  for (const st of STAGES) {
    const on = st.id === getStage().id;

    const card = document.createElement('button');
    card.className = 'stage-card' + (on ? ' on' : '');
    card.innerHTML =
      '<canvas></canvas>' +
      '<span class="row"><b></b><small></small></span>' +
      '<span class="best">สถิติ <b></b></span>' +
      '<i class="stage-info" role="button" tabindex="0" aria-label="รายละเอียดด่าน">i</i>';
    card.querySelector('b').textContent = st.name;
    card.querySelector('small').textContent = on ? 'กำลังเล่น' : st.note;
    card.querySelector('.best b').textContent = loadBest(st.id).toLocaleString('en-US');
    paintStageScene(card.querySelector('canvas'), st, 232);

    card.addEventListener('click', () => {
      if (st.id === getStage().id) return showStages(false);
      setStage(st.id);
      unlockAudio();
      sfx.potion();
      game.reset();     // โหลดจานสีกับเส้นทางของด่านใหม่ ฉากหน้าแรกเปลี่ยนตามทันที
      buildStageGrid();
      refreshHome();
    });

    // ปุ่ม ⓘ ซ้อนอยู่บนการ์ดซึ่งเป็นปุ่มอยู่แล้ว ต้องกัน event ไม่ให้ทะลุขึ้นไป
    // ไม่งั้นกดดูรายละเอียดแล้วจะกลายเป็นเลือกด่านนั้นไปด้วย
    const info = card.querySelector('.stage-info');
    const openInfo = (e) => {
      e.stopPropagation();
      e.preventDefault();
      unlockAudio(); sfx.fish();
      showStageInfo(st);
    };
    info.addEventListener('click', openInfo);
    info.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') openInfo(e);
    });

    grid.appendChild(card);
  }
  markScrollable(grid);
}

function showStages(on) {
  stagePanel.classList.toggle('hidden', !on);
  startPanel.classList.toggle('hidden', on);
}

// ── รายละเอียดด่าน ─────────────────────────────────────────
//
// หนึ่งตาไม่ได้อยู่ฉากเดียวอีกแล้ว หน้านี้จึงมีไว้ตอบคำถามเดียว:
// "เลือกด่านนี้แล้วจะได้เจออะไรบ้าง" — เรียงตามลำดับที่จะเจอจริง

/** ชื่อสิ่งกีดขวางของแต่ละธีม ใช้บอกว่าฉากนั้นหน้าตาอุปสรรคเป็นแบบไหน */
const THEME_OBSTACLES = {
  bakery: 'หนามน้ำตาล · คานเตาอบ · กล่องลัง',
  garden: 'กระบองเพชร · ซุ้มดอกไม้ · กล่องของขวัญ',
  cavern: 'หินงอก · เพดานหินย้อย · กองคริสตัล',
  beach: 'ปะการัง · ผ้าใบร่มชายหาด · ปราสาททราย',
  space: 'สะเก็ดดาว · แผงโซลาร์ · ลังขนส่ง',
  snow: 'แท่งน้ำแข็ง · กิ่งไผ่มีหิมะ · ก้อนน้ำแข็ง',
};

function showStageInfo(stage) {
  document.getElementById('siTitle').textContent = stage.name;
  document.getElementById('siLead').textContent =
    'เริ่มจากฉากนี้ แล้วไล่ไปฉากถัดไปทุก 1 นาที · จบแต่ละฉากได้ขวดพลังใหญ่';

  const list = document.getElementById('siList');
  list.innerHTML = '';
  journeyOf(stage.id).forEach((sc, i) => {
    const row = document.createElement('div');
    row.className = 'scene-row' + (i === 0 ? ' first' : '');
    row.innerHTML =
      '<span class="scene-no"></span>'
      + '<canvas class="scene-pic"></canvas>'
      + '<span class="scene-main"><b></b><small></small></span>';
    row.querySelector('.scene-no').textContent = i + 1;
    row.querySelector('b').textContent = sc.name;
    row.querySelector('small').textContent = THEME_OBSTACLES[sc.theme] || sc.note;
    paintStageScene(row.querySelector('.scene-pic'), sc, 150);
    list.appendChild(row);
  });
  markScrollable(list);

  swapPanel(stagePanel, stageInfoPanel);
}

// ── แถบเรียง/กรองการ์ด ─────────────────────────────────────
//
// ตัวเดียวใช้ได้ทั้งหน้าสมบัติและหน้าชุด เพราะสองหน้าต่างกันแค่
// "มีตัวเลือกเรียงกี่แบบ" กับ "อะไรนับว่ามีแล้ว" ที่เหลือเหมือนกันหมด
//
// เลือกไว้แบบไหนจำข้ามรอบ — คนที่ชอบเรียงตามความหายากมักชอบทุกครั้ง
// ไม่ใช่ครั้งเดียว การให้มารีเซ็ตเป็นค่าตั้งต้นทุกครั้งที่เข้าหน้าคือความรำคาญ

/** ยิ่งหายากยิ่งขึ้นก่อน — เลขน้อยมาก่อน */
const T_RANK = { legend: 0, epic: 1, rare: 2 };
const O_RANK = { high: 0, normal: 1 };

/**
 * @param opts.key    ชื่อที่ใช้จำค่าใน localStorage
 * @param opts.bar    id ของแถบกรอง
 * @param opts.box    id ของช่องติ๊ก
 * @param opts.redraw ฟังก์ชันวาดกริดใหม่
 */
function setupFilterBar({ key, bar, box, redraw }) {
  const el = document.getElementById(bar);
  const chips = [...el.querySelectorAll('.fchip')];
  const only = document.getElementById(box);

  // ค่าที่จำไว้อาจเป็นชื่อการเรียงที่ถูกถอดออกไปแล้ว ต้องเช็คว่ายังมีปุ่มนั้นอยู่จริง
  const saved = loadPref(key + '-sort', null);
  const valid = chips.some((c) => c.dataset.sort === saved);
  filterState[key] = {
    sort: valid ? saved : chips[0].dataset.sort,
    only: loadPref(key + '-only', false) === true,
  };

  const paint = () => {
    for (const c of chips) c.classList.toggle('on', c.dataset.sort === filterState[key].sort);
    only.checked = filterState[key].only;
  };

  for (const c of chips) {
    c.addEventListener('click', () => {
      if (filterState[key].sort === c.dataset.sort) return;   // กดอันเดิมซ้ำ ไม่ต้องวาดใหม่
      filterState[key].sort = c.dataset.sort;
      savePref(key + '-sort', c.dataset.sort);
      unlockAudio();
      sfx.fish();
      paint();
      redraw();
    });
  }

  only.addEventListener('change', () => {
    filterState[key].only = only.checked;
    savePref(key + '-only', only.checked);
    unlockAudio();
    sfx.fish();
    redraw();
  });

  paint();
}

const filterState = {};

/**
 * เรียงและกรองรายการตามที่แถบกรองตั้งไว้
 *
 * รับ owned/rank/order มาเป็นฟังก์ชัน เพื่อให้ใช้ได้กับทั้งสมบัติและชุด
 * โดยไม่ต้องรู้ว่าของสองอย่างนี้เก็บสถานะกันคนละแบบ
 */
function applyFilter(key, list, { owned, rank, order, level }) {
  const st = filterState[key];
  const items = st.only ? list.filter((x) => owned(x)) : list.slice();

  // ลำดับเดิมในตาราง ใช้เป็นตัวตัดสินสุดท้ายเสมอ ผลจึงคงที่ ไม่สลับไปมาเอง
  const base = new Map(list.map((x, i) => [x.id, i]));
  const gotAt = new Map(order().map((id, i) => [id, i]));

  const cmp = {
    // ได้มาล่าสุดขึ้นก่อน ของที่ยังไม่มีไปต่อท้าย (ไม่มีวันได้มา จึงไม่มีลำดับ)
    recent: (a, b) => {
      const ga = gotAt.has(a.id), gb = gotAt.has(b.id);
      if (ga !== gb) return ga ? -1 : 1;
      if (ga && gb) return gotAt.get(b.id) - gotAt.get(a.id);
      return base.get(a.id) - base.get(b.id);
    },
    rarity: (a, b) => (rank(a) - rank(b)) || (base.get(a.id) - base.get(b.id)),
    // ตัวที่ยังไม่ได้ขึ้นก่อน แล้วเรียงตาม rank (ของแมวคือราคา) — ตัวที่ใกล้ได้ที่สุดอยู่หน้าสุด
    locked: (a, b) => (Number(owned(a)) - Number(owned(b)))
      || (rank(a) - rank(b)) || (base.get(a.id) - base.get(b.id)),
    level: (a, b) => (level(b) - level(a)) || (rank(a) - rank(b)) || (base.get(a.id) - base.get(b.id)),
  };

  return items.sort(cmp[st.sort] || cmp.recent);
}

/** ข้อความแทนกริดว่าง บอกเหตุผลว่าทำไมไม่มีอะไรให้ดู */
function emptyNote(grid, text) {
  const p = document.createElement('p');
  p.className = 'grid-empty';
  p.textContent = text;
  grid.appendChild(p);
}

/**
 * กริดหมวดแมวน้อยในคลังน้อง
 *
 * ท่าเดียวกับกริดชุด: แตะการ์ด = เลือกขึ้นไปโชว์ในช่องซ้าย ไม่ใช่สวม/ซื้อทันที
 * หน้าแมวน้อยเดิมแตะทีเดียวเปลี่ยนตัวเลย แต่พอมาอยู่ข้างช่องพรีวิวแล้ว
 * คนจะแตะเพื่อ "ดู" ก่อน การเปลี่ยนตัวจึงย้ายไปอยู่ที่ปุ่ม "เลือกสีนี้" แทน
 */
function buildSkinStashGrid() {
  const grid = document.getElementById('skinStashGrid');
  grid.innerHTML = '';

  // ลำดับ "ได้มา" ของแมวคือลำดับที่ซื้อ ตัวฟรีไม่เคยถูกบันทึก จึงต่อท้ายตามลำดับในตาราง
  const list = applyFilter('skin', SKINS, {
    owned: (x) => ownsSkin(x.id),
    rank: (x) => x.cost || 0,
    order: () => loadSkinsOwned(),
    level: () => 0,
  });

  if (!list.length) {
    emptyNote(grid, 'ยังไม่มีแมวน้อยให้ดูในตัวกรองนี้');
    markScrollable(grid);
    return;
  }

  const using = getSkin().id;
  for (const x of list) {
    const got = ownsSkin(x.id);
    const on = got && x.id === using;

    const card = document.createElement('button');
    card.className = 'skin-card outfit-card' + (on ? ' on' : '') + (got ? '' : ' locked');
    card.innerHTML = '<canvas width="96" height="96"></canvas><b></b>';
    card.querySelector('b').textContent = x.name;

    if (!got) {
      const lock = document.createElement('span');
      lock.className = 'lock-badge';
      lock.textContent = '🔒';
      card.appendChild(lock);
    }

    // t=60 ไม่ใช่ 0 เพราะที่ t=0 แมวกำลังหลับตาพอดี รูปตัวอย่างจะดูเหมือนหลับ
    paintMini(card.querySelector('canvas'), 96, (c) => drawCatPose(c, 55, 88, 1.5, x, 60));

    if (x.id === stashSel.skin) card.classList.add('sel');
    setDot(card, got && isFresh('skin', x.id));
    card.addEventListener('click', () => {
      unlockAudio();
      sfx.fish();
      selectStash('skin', x.id);
    });

    grid.appendChild(card);
  }
  markScrollable(grid);
}

/**
 * กล่องยืนยันแบบใช้ซ้ำได้ คืน Promise<boolean>
 *
 * ── ทำไมไม่ใช้ confirm() ของเบราว์เซอร์ ──
 * มันบล็อกทั้งหน้า หน้าตาไม่เข้ากับเกม และบนมือถือบางตัวขึ้นชื่อโดเมนกำกับ
 * ซึ่งทำให้ดูเหมือนป๊อปอัปแปลกปลอมจนคนกดยกเลิกทิ้งทั้งที่ตั้งใจจะซื้อ
 *
 * เปิดซ้อนบนแผงที่เปิดค้างอยู่ ไม่ได้ปิดแผงเดิม ผู้เล่นจึงยังเห็นว่ายืนยันจากหน้าไหน
 *
 * @param opts.art  ฟังก์ชันวาดรูปตัวอย่างลงบน canvas ถ้าไม่ส่งมาจะซ่อนช่องรูป
 * @param opts.cost ราคา ถ้าไม่ส่งมาจะซ่อนแถบราคา (ใช้กับกล่องยืนยันที่ไม่ใช่การซื้อได้)
 */
let cancelConfirm = null;

function confirmBox(opts) {
  // ปิดกล่องเก่าที่ยังค้างอยู่ก่อนเสมอ
  // ถ้าไม่ทำ listener ของรอบเก่าจะยังเกาะปุ่มเดิมอยู่ พอกดยืนยันรอบใหม่
  // handler ทั้งสองรอบจะทำงานพร้อมกัน = จ่ายเงินซ้ำสองครั้งจากการกดครั้งเดียว
  if (cancelConfirm) cancelConfirm();

  const panel = document.getElementById('confirmPanel');
  const art = document.getElementById('confirmArt');
  const cost = document.getElementById('confirmCost');

  // look: 'card' = หน้าตาชุดเดียวกับหน้าสรุปคะแนน (ดู .confirm-pop.card ใน style.css)
  panel.querySelector('.confirm-pop').classList.toggle('card', opts.look === 'card');
  document.getElementById('confirmTitle').textContent = opts.title || '';
  document.getElementById('confirmBody').textContent = opts.body || '';
  document.getElementById('confirmYes').textContent = opts.okText || 'ยืนยัน';
  document.getElementById('confirmNo').textContent = opts.cancelText || 'ยกเลิก';
  // alertOnly = กล่องแจ้งเตือนปุ่มเดียว (เช่นชื่อซ้ำ) ไม่มีอะไรให้ยกเลิก
  // ใช้ style ไม่ใช่ hidden — .btn ตั้ง display เองซึ่งชนะแอตทริบิวต์ hidden
  document.getElementById('confirmNo').style.display = opts.alertOnly ? 'none' : '';

  cost.classList.toggle('hidden', !opts.cost);
  if (opts.cost) {
    document.getElementById('confirmPrice').textContent = opts.cost.toLocaleString('en-US');
  }

  const after = document.getElementById('confirmAfter');
  after.textContent = opts.after || '';
  after.classList.toggle('bad', Boolean(opts.afterBad));

  art.hidden = !opts.art;
  if (opts.art) paintMini(art, 96, opts.art);

  panel.classList.remove('hidden');

  return new Promise((resolve) => {
    const done = (ok) => {
      cancelConfirm = null;
      panel.classList.add('hidden');
      // ต้องถอด listener ทุกครั้ง ไม่งั้นเปิดกล่องรอบหน้าจะมีตัวเก่าค้างอยู่
      // แล้ว resolve ของรอบเก่าจะยิงซ้ำ (Promise ที่ resolve แล้วเงียบ แต่ handler ยังทำงาน)
      yes.removeEventListener('click', onYes);
      no.removeEventListener('click', onNo);
      panel.removeEventListener('click', onBackdrop);
      resolve(ok);
    };
    const onYes = () => { unlockAudio(); sfx.fish(); done(true); };
    const onNo = () => { unlockAudio(); sfx.fish(); done(false); };
    // กดพื้นหลังนอกกล่อง = ยกเลิก ทางออกที่คนคาดหวังจากกล่องแบบนี้
    const onBackdrop = (e) => { if (e.target === panel) onNo(); };

    const yes = document.getElementById('confirmYes');
    const no = document.getElementById('confirmNo');
    yes.addEventListener('click', onYes);
    no.addEventListener('click', onNo);
    panel.addEventListener('click', onBackdrop);

    // ปิดจากทางอื่น (กดเล่น กดกลับหน้าแรก) ต้องนับเป็น "ยกเลิก" ไม่ใช่ค้างไว้เฉย ๆ
    cancelConfirm = () => done(false);
  });
}

/**
 * การ์ดฉลองของแมวที่เพิ่งปลดล็อก
 *
 * ทรงเดียวกับการ์ดชุดในผลสุ่มตู้กาช่าเป๊ะ ๆ ทั้งขนาดผ้าใบและท่าที่น้องยืน
 * ของที่ได้มาใหม่จึงหน้าตาเหมือนกันหมดไม่ว่าจะมาจากตู้สุ่ม จดหมาย หรือซื้อเอง
 *
 * วาดจาก getSkin() ไม่ใช่จากตัวสกินเปล่า ๆ — ตอนนี้น้องใส่ชุดที่สวมอยู่จริง
 * การ์ดจึงเป็นรูป "น้องของเราตอนนี้" ไม่ใช่รูปตัวอย่างในแค็ตตาล็อก
 */
function skinGotCard(s) {
  const card = document.createElement('div');
  card.className = 'got-card legend';
  card.innerHTML = '<canvas width="72" height="72"></canvas><b></b><small>แมวใหม่!</small>';
  card.querySelector('b').textContent = s.name;
  paintMini(card.querySelector('canvas'), 72, (c) => drawCatPose(c, 38, 66, 1.05, getSkin(), 60));
  return card;
}

/**
 * ซื้อแมวที่ยังล็อกอยู่
 *
 * หักทองก่อนแล้วค่อยปลดล็อก ลำดับนี้สำคัญ — ถ้าปลดล็อกก่อนแล้วหักทองพลาด
 * ผู้เล่นจะได้ของฟรี ส่วนลำดับนี้กรณีแย่สุดคือเสียทองแล้วไม่ได้ของ
 * ซึ่งกู้คืนได้เพราะรู้ยอดที่หักไป
 *
 * ซื้อแล้วสวมให้เลย ไม่ต้องกดอีกที — คนกดซื้อคือคนที่อยากใส่อยู่แล้ว
 */
async function buySkin(s) {
  const msg = document.getElementById('outfitMsg');
  const gold = getGold();

  if (gold < s.cost) {
    sfx.upFail();
    setMsg(msg, 'ทองไม่พอ ขาดอีก ' + (s.cost - gold).toLocaleString('en-US'), true);
    return;
  }

  const ok = await confirmBox({
    title: 'ปลดล็อก ' + s.name + '?',
    body: s.note,
    cost: s.cost,
    after: 'ทองคงเหลือหลังซื้อ ' + (gold - s.cost).toLocaleString('en-US'),
    okText: 'ซื้อเลย',
    art: (c) => drawCatPose(c, 55, 88, 1.5, s, 60),
  });
  if (!ok) return;

  // อ่านยอดใหม่หลังกล่องปิด เผื่อมีอย่างอื่นหักทองไประหว่างที่กล่องเปิดค้างอยู่
  // (เช่นซิงก์จากเครื่องอื่น) ถ้าเชื่อยอดที่อ่านไว้ตอนแรกจะติดลบได้
  if (getGold() < s.cost) {
    sfx.upFail();
    setMsg(msg, 'ทองไม่พอแล้ว ลองใหม่อีกครั้ง', true);
    return;
  }

  addGold(-s.cost);
  unlockSkin(s.id);
  setSkin(s.id);
  refreshHome();
  refreshStash();
  setMsg(msg, 'ปลดล็อก ' + s.name + ' แล้ว ใส่ให้เรียบร้อย');

  // ── ฉลองเหมือนตอนได้ของขวัญ ──
  // ใช้กล่องใบเดียวกับจดหมายและกิจกรรม (ริบบิ้นโปรย + เสียงเย้ มาพร้อมกล่อง)
  // ไม่ได้ทำกล่องใหม่ เพราะ "ได้ของใหม่" ควรรู้สึกเหมือนกันทุกทางที่ได้มา
  // กล่องนี้เป็น .panel จึงซ้อนทับหน้าคลังน้องที่เปิดค้างอยู่ได้เลย ไม่ต้องปิดหน้าเดิม
  //
  // เสียง upWin ของการซื้อถูกถอดออก — กล่องยิง bonus ตามด้วย cheer อยู่แล้ว
  // สามเสียงซ้อนในครึ่งวินาทีฟังออกเป็นเสียงเดียวที่รกกว่าเดิม
  showReward('ได้น้องใหม่!', {}, { cards: [skinGotCard(s)] });
}

function buildOutfitGrid() {
  const grid = document.getElementById('outfitGrid');
  grid.innerHTML = '';

  const s = getSkin();

  // โชว์ทุกชุดไม่ใช่เฉพาะที่ปลดล็อก ชุดที่ยังไม่ได้เป็นขาวดำ
  // คนเล่นจึงเห็นว่ามีอะไรให้ตามเก็บ ซึ่งเป็นเหตุผลที่จะกดตู้กาช่าต่อ
  // ติ๊ก "ดูเฉพาะสิ่งที่มี" เมื่อไหร่ก็กลับไปเห็นแค่ของตัวเองเหมือนเดิม
  const list = applyFilter('outfit', OUTFITS, {
    owned: (o) => isOwned(o.id),
    rank: (o) => (o.rarity ? O_RANK[o.rarity] : 9),
    order: outfitOrder,
    level: () => 0,
  });

  if (!list.length) {
    emptyNote(grid, 'ยังไม่มีชุดเลย ไปสุ่มที่ตู้กาช่าก่อนนะ');
    markScrollable(grid);
    return;
  }

  for (const o of list) {
    const got = isOwned(o.id);
    const on = got && o.id === s.outfit.id;

    const card = document.createElement('button');
    card.className =
      'skin-card outfit-card' + (on ? ' on' : '') + (got ? '' : ' locked')
      + (o.rarity === 'high' ? ' high' : '');
    // เหลือแค่รูปกับชื่อ — ป้ายโบนัสกับบรรทัดคำอธิบายย้ายไปหน้ารายละเอียด
    // การ์ดจึงเตี้ยลงมาก และกริดโชว์ชุดได้มากกว่าเดิมเกือบเท่าตัวในที่เท่าเดิม
    card.innerHTML = '<canvas width="96" height="96"></canvas><b></b>';
    card.querySelector('b').textContent = o.name;

    // "ขนล้วน" ไม่มีระดับ tierSign() จึงคืน null แล้วการ์ดใบนั้นไม่มีป้าย
    const sign = tierSign(o.rarity);
    if (sign) card.appendChild(sign);

    // วาดแมวตัวที่เลือกอยู่ใส่ชุดใบนี้จริง ๆ ไม่ใช่หุ่นกลาง
    paintMini(card.querySelector('canvas'), 96,
      (c) => drawCatPose(c, 55, 88, 1.5, { ...s, outfit: o }, 60));

    // แตะแล้ว "เลือก" ขึ้นมาโชว์ในช่องซ้าย ไม่ใช่เด้งไปหน้ารายละเอียดทันที
    // ผู้เล่นจึงกวาดดูเทียบหลายชุดรวดเดียวได้ ปุ่ม "ดูเพิ่มเติม" ในช่องซ้าย
    // คือทางไปหน้ารายละเอียดสำหรับคนที่อยากอ่านตัวเลขเต็ม ๆ ของชิ้นนั้น
    if (o.id === stashSel.outfit) card.classList.add('sel');
    setDot(card, got && isFresh('outfit', o.id));
    card.addEventListener('click', () => {
      unlockAudio();
      sfx.fish();
      selectStash('outfit', o.id);
    });

    grid.appendChild(card);
  }
  markScrollable(grid);
}

// ── กล่องจดหมาย ────────────────────────────────────────────
//
// สองหน้า: รายการ → อ่านทีละฉบับ กดรับของขวัญได้จากทั้งสองหน้า
// ของขวัญจ่ายผ่านระบบเจ้าของเงินเสมอ (addGold ของ gacha.js / addGems ของ vault.js)
// ห้ามเขียน localStorage ตรง ๆ ไม่งั้นตัวเลขบนจอไม่ขยับและรอบหน้าโดนเขียนทับ

const inboxPanel = document.getElementById('inboxPanel');
const mailReadPanel = document.getElementById('mailReadPanel');
let mrCurrent = null;

/** จุดแดงบนไอคอน — โผล่เมื่อยังไม่อ่าน หรือยังมีของค้างรับ */
function refreshMailDot() {
  const n = badgeCount();
  const dot = document.getElementById('mailDot');
  // โชว์จำนวนฉบับที่ค้างอยู่ ไม่ใช่จุดเปล่า — "มีของค้าง 1 ฉบับ" กับ "ค้าง 8 ฉบับ"
  // เป็นคนละเรื่องกันสำหรับคนตัดสินใจว่าจะเปิดดูตอนนี้หรือไว้ทีหลัง
  // ไม่มีของค้าง = ไม่ใส่ตัวหนังสือเลย ไม่ใช่ใส่ "0" แล้วค่อยซ่อนด้วยคลาส
  // ป้ายจึงว่างจริง ๆ ถ้าวันหลังกฎซ่อนพลาดไป อย่างมากก็เห็นจุดเปล่า ไม่ใช่เลข 0
  // เกิน 9 ใส่ 9+ แทนเลขจริง ไม่งั้นป้ายจะยืดจนล้นออกนอกปุ่ม (กฎเดียวกับปุ่มกิจกรรม)
  dot.textContent = n === 0 ? '' : n > 9 ? '9+' : n;
  dot.classList.toggle('hidden', n === 0);
}

/** แถวของขวัญ ใช้ทั้งในรายการและหน้าอ่าน */
function rewardChips(reward) {
  if (!reward) return '';
  const out = [];
  if (reward.gold) {
    out.push(`<span class="mail-reward"><span class="coin" aria-hidden="true"></span>`
      + `${reward.gold.toLocaleString('en-US')}</span>`);
  }
  if (reward.gems) {
    out.push(`<span class="mail-reward"><span class="gem" aria-hidden="true"></span>`
      + `${reward.gems.toLocaleString('en-US')}</span>`);
  }
  return out.join('');
}

/** จ่ายของขวัญจริง — ที่เดียวที่แตะเงิน จะได้ไม่ลืมเส้นทางไหน */
function payReward(reward) {
  if (!reward) return;
  if (reward.gold) addGold(reward.gold);
  if (reward.gems) addGems(reward.gems);
  refreshGold();
  refreshProfile();
}

// ── กล่องฉลองตอนได้ของ ──────────────────────────────────────
//
// ใช้ร่วมกันระหว่างกล่องจดหมายกับหน้ากิจกรรม (ตู้กาช่ามีของตัวเองอยู่ในการ์ด
// เพราะมันต้องเล่นต่อจากแอนิเมชันเปิดหีบ/แคปซูลในกรอบเดียวกัน)
//
// เปิดทับแผงที่ค้างอยู่ข้างหลัง ไม่ได้สลับแผง — คนกดรับของยังอยู่ที่หน้าเดิม
// พอปิดกล่องจึงกลับมาเจอรายการที่ค้างไว้ทันที ไม่ต้องกดกลับเข้าไปใหม่

const rewardPanel = document.getElementById('rewardPanel');

/** การ์ดของรางวัลหนึ่งใบ — ทองกับเพชรใช้ทรงเดียวกับการ์ดผลสุ่มในตู้กาช่า */
function rewardCard(kind, amount, label) {
  const isGold = kind === 'gold';
  const card = document.createElement('div');
  // ── ทำไมการ์ดเพชรใช้คลาส 'gems' ไม่ใช่ 'gem' ──
  // '.gem' คือคลาสของ "ไอคอนเพชร" ซึ่งวาดรูปทรงด้วย width/height 19px
  // บวก clip-path ข้าวหลามตัด ถ้าเอาชื่อเดียวกันมาใส่ที่ตัวการ์ดด้วย การ์ดจะโดน
  // กฎนั้นบีบเหลือสูง 19px แล้วถูก clip เป็นข้าวหลามตัดจนไอคอน ตัวเลข และป้าย
  // ข้างในหายไปทั้งใบ — เห็นเป็นขีดแบน ๆ แทนที่จะเป็นการ์ดรางวัล
  // ฝั่งทองไม่โดนเพราะคลาสการ์ดคือ 'gold' ส่วนคลาสไอคอนคือ 'coin' คนละชื่อกันอยู่แล้ว
  card.className = 'got-card ' + (isGold ? 'gold' : 'gems');
  card.innerHTML = `<span class="${isGold ? 'coin' : 'gem'} big" aria-hidden="true"></span>`
    + '<b></b><small></small>';
  card.querySelector('b').textContent = '+' + amount.toLocaleString('en-US');
  card.querySelector('small').textContent = label;
  return card;
}

/**
 * โชว์กล่องฉลองพร้อมริบบิ้นกับเสียง
 * @param title       หัวเรื่อง เช่น "รับของขวัญแล้ว!"
 * @param reward      { gold, gems } — ช่องที่เป็นศูนย์จะไม่ขึ้นการ์ด
 * @param opts.note   บรรทัดใต้การ์ด ใช้ตอนผลลัพธ์ไม่มีการ์ดให้โชว์
 * @param opts.cards  การ์ดที่ผู้เรียกทำมาเอง วางก่อนการ์ดทองกับเพชร
 *                    (ของที่ไม่ใช่สกุลเงิน เช่นแมวที่เพิ่งปลดล็อก ต้องวาดรูปเอง)
 * @param opts.quiet  ไม่ต้องริบบิ้นกับเสียงเฉลิมฉลอง
 *
 * ── ทำไมมีโหมดเงียบ ──
 * กล่องนี้ใช้กับผลลัพธ์ที่ "ไม่ได้ของ" ด้วย (ให้หัวใจแล้วน้องแค่มอง ดู src/pet.js)
 * ริบบิ้นกับเสียงเย้ในจังหวะนั้นจะอ่านเป็นเสียดสี ไม่ใช่การฉลอง
 */
function showReward(title, reward, opts = {}) {
  const row = document.getElementById('rewardRow');
  row.innerHTML = '';
  document.getElementById('rewardTitle').textContent = title;

  const note = document.getElementById('rewardNote');
  note.textContent = opts.note || '';
  note.classList.toggle('hidden', !opts.note);

  const cards = opts.cards ? [...opts.cards] : [];
  if (reward.gems) cards.push(rewardCard('gem', reward.gems, 'เพชรชมพู'));
  if (reward.gold) cards.push(rewardCard('gold', reward.gold, 'เหรียญทอง'));
  cards.forEach((card, i) => {
    card.style.setProperty('--d', (i * 0.12).toFixed(2) + 's');
    row.appendChild(card);
  });

  rewardPanel.classList.remove('hidden');
  unlockAudio();
  if (opts.quiet) {
    sfx.fish();
    return;
  }
  burstConfetti('rewardConfetti');
  sfx.bonus();
  setTimeout(() => sfx.cheer(), 220);
}

function closeReward() {
  rewardPanel.classList.add('hidden');
  document.getElementById('rewardRow').innerHTML = '';
  // ริบบิ้นที่ยังตกไม่จบต้องล้างด้วย ไม่งั้นค้างกลางอากาศตอนเปิดกล่องรอบหน้า
  document.getElementById('rewardConfetti').innerHTML = '';
}

document.getElementById('rewardClose').addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  closeReward();
});
// กล่องคลุมทั้งจอ กดตรงไหนก็ปิดได้ เผื่อแตะมั่วก่อนหาปุ่มเจอ
rewardPanel.addEventListener('click', (e) => {
  if (e.target === rewardPanel) closeReward();
});

// ── ให้หัวใจน้อง ───────────────────────────────────────────
//
// ปุ่มหัวใจข้างหัวน้องในล็อบบี้ กดแล้วน้องดีใจแล้วให้ของขวัญ เว้นสองชั่วโมงต่อครั้ง
//
// หน้าที่แบ่งกันสามส่วน:
//   src/pet.js   ตารางของขวัญ ระยะคูลดาวน์ และการจำเวลาที่กดล่าสุด
//   src/game.js  แอนิเมชันบน canvas (หัวใจลอยไปหาน้อง แล้วน้องดีใจ)
//   ที่นี่        ตัวปุ่ม ป้ายเวลา และการจ่ายของจริง

const loveBtn = document.getElementById('btnLove');
const loveTag = document.getElementById('loveTag');

/**
 * ของขวัญที่สุ่มได้แล้วแต่ยังไม่ได้จ่าย
 *
 * ── ทำไมต้องพักไว้ ไม่จ่ายทันทีตอนกด ──
 * ตัวเลขทองมุมขวาบนโชว์อยู่ตลอด ถ้าจ่ายตอนกด ตัวเลขจะกระโดดขึ้นก่อนที่หัวใจ
 * จะลอยไปถึงตัวน้องด้วยซ้ำ ผู้เล่นจึงรู้ผลก่อนดูแอนิเมชันจบ ซึ่งฆ่าการลุ้นทิ้งทั้งหมด
 *
 * ── แล้วถ้ากดเล่นระหว่างแอนิเมชันล่ะ ──
 * ของไม่หาย showIntro() เรียก settleLove(false) ให้ก่อนทุกครั้ง — จ่ายเงียบ ๆ
 * โดยไม่เปิดกล่อง คูลดาวน์ถูกตั้งไปตั้งแต่ตอนกดแล้ว จึงไม่มีทางกดซ้ำเอาของสองรอบ
 */
let pendingGift = null;

/**
 * จ่ายของขวัญที่ค้างอยู่
 * @param show เปิดกล่องฉลองด้วยไหม (false = จ่ายเงียบ ๆ ตอนถูกขัดจังหวะ)
 */
function settleLove(show) {
  if (!pendingGift) return;
  const gift = pendingGift;
  pendingGift = null;

  if (gift.gold > 0) {
    payReward({ gold: gift.gold });
    if (show) showReward('น้องให้ของขวัญ!', { gold: gift.gold });
    return;
  }

  // รอบที่ไม่ได้ทอง — ยังต้องมีกล่องสรุป ไม่งั้นคนกดจะไม่รู้ว่าจบแล้วหรือค้างอยู่
  // แต่ปิดริบบิ้นกับเสียงเย้ทิ้ง เพราะไม่มีอะไรให้ฉลอง (ดูโหมดเงียบใน showReward)
  if (show) {
    showReward('น้องมองคุณตาแป๋ว', {}, {
      quiet: true,
      note: 'รอบนี้น้องไม่ได้ให้ของขวัญ แต่ดีใจมากที่คุณมาหา — อีก 2 ชั่วโมงมาเล่นกับน้องอีกนะ',
    });
  }
}

/** เขียนหน้าตาปุ่มให้ตรงกับคูลดาวน์ตอนนี้ */
function refreshLove() {
  const left = petLeftMs();
  const ready = left === 0;
  loveBtn.disabled = !ready;
  loveTag.textContent = ready ? 'ให้หัวใจ' : petLeftText(left);
  // ป้ายเป็น aria-hidden (มันคือของประดับตัวปุ่ม) ข้อความสำหรับโปรแกรมอ่านจอ
  // จึงต้องอยู่ที่ตัวปุ่มเอง ไม่งั้นคนที่ใช้เสียงอ่านจะได้ยินแค่ "ให้หัวใจน้อง"
  // ตลอดเวลา โดยไม่มีทางรู้เลยว่าตอนนี้กดไม่ได้เพราะอะไร
  loveBtn.setAttribute('aria-label',
    ready ? 'ให้หัวใจน้อง' : 'ให้หัวใจน้องได้อีกครั้งในอีก ' + petLeftText(left));
}

function doLove() {
  if (!canPet() || game.love) return;

  // ตั้งคูลดาวน์ก่อนเล่นแอนิเมชัน ไม่ใช่หลัง — ระหว่างสองวินาทีกว่าที่หัวใจลอยอยู่
  // ปุ่มยังกดได้อยู่ถ้าไม่ตั้งตรงนี้ กดรัวก็จะได้ของหลายรอบจากคูลดาวน์เดียว
  markPetted();
  refreshLove();

  pendingGift = rollPetGift();
  unlockAudio();
  sfx.love();
  game.startLove(() => settleLove(true));
}

loveBtn.addEventListener('click', doLove);

// ── แตะตัวน้อง ──
// กดแล้วน้องทำท่าน่ารักท่าหนึ่งใน 5 ท่า วนไปเรื่อย ๆ (ตารางท่าอยู่ใน game.js)
//
// ที่นี่ทำแค่สองอย่าง: ปลดล็อกเสียง (ต้องเกิดในจังหวะที่ผู้ใช้กดจริง ไม่งั้น
// เบราว์เซอร์บล็อก) แล้วส่งต่อให้เกม ส่วนจะเล่นท่าไหน เสียงอะไร แตะซ้ำแล้วยังไง
// เป็นเรื่องของเกมทั้งหมด — หน้าจอไม่ควรรู้ว่าน้องมีกี่ท่า
document.getElementById('btnPet').addEventListener('click', () => {
  unlockAudio();
  game.tapCat();
});

// ── ตำแหน่งปุ่ม ──
// ตัวเลขจริงอยู่ที่ LOVE_BTN ใน game.js ที่เดียว เพราะหัวใจที่ลอยออกจากปุ่ม
// วาดบน canvas และต้องออกจากจุดเดียวกับที่ CSS วางปุ่มไว้เป๊ะ ๆ
// เวทีเป็นอัตราส่วน 960:420 ตายตัว เปอร์เซ็นต์จึงหารตรงจากพิกัดฉากได้เลย
startPanel.style.setProperty('--love-x', ((LOVE_BTN.x / VIEW.W) * 100).toFixed(3) + '%');
startPanel.style.setProperty('--love-y', ((LOVE_BTN.y / VIEW.H) * 100).toFixed(3) + '%');
startPanel.style.setProperty('--cat-x', ((CAT_TAP.x / VIEW.W) * 100).toFixed(3) + '%');
startPanel.style.setProperty('--cat-y', ((CAT_TAP.y / VIEW.H) * 100).toFixed(3) + '%');
startPanel.style.setProperty('--cat-w', ((CAT_TAP.w / VIEW.W) * 100).toFixed(3) + '%');
startPanel.style.setProperty('--cat-h', ((CAT_TAP.h / VIEW.H) * 100).toFixed(3) + '%');

// เดินป้ายเวลาทุกวินาที — เขียนข้อความสองช่องต่อวินาที ถูกกว่าการไปผูกกับลูปเกม
// ซึ่งจะกลายเป็นงานที่ต้องทำ 60 ครั้งต่อวินาทีเพื่อผลลัพธ์ที่เปลี่ยนวินาทีละครั้ง
setInterval(refreshLove, 1000);
refreshLove();

function buildMailList() {
  const list = document.getElementById('mailList');
  list.innerHTML = '';
  const mails = loadInbox();

  if (!mails.length) {
    emptyNote(list, 'ยังไม่มีจดหมายเลย');
  }

  for (const m of mails) {
    const waiting = Boolean(m.reward) && !m.claimed;
    const item = document.createElement('button');
    item.className = 'mail-item' + (m.read && !waiting ? ' read' : '');
    item.innerHTML =
      `<span class="mail-icon">${waiting ? '🎁' : m.read ? '📭' : '✉️'}</span>`
      + '<span class="mail-main"><b class="mail-title"></b><small class="mail-sub"></small></span>'
      + (waiting ? '<span class="mail-tag gift">มีของขวัญ</span>'
        : m.reward ? '<span class="mail-tag done">รับแล้ว</span>' : '');
    item.querySelector('.mail-title').textContent = m.title;
    item.querySelector('.mail-sub').textContent = m.from + (m.at ? ' · ' + m.at : '');
    item.addEventListener('click', () => {
      unlockAudio();
      sfx.fish();
      openMail(m.id);
    });
    list.appendChild(item);
  }

  const anyLeft = mails.some((m) => m.reward && !m.claimed);
  const all = document.getElementById('mailClaimAll');
  all.disabled = !anyLeft;
  all.textContent = anyLeft ? 'รับของขวัญทั้งหมด' : 'รับของขวัญครบแล้ว';
  markScrollable(list);
  refreshMailDot();
}

function paintMailRead() {
  const m = mailById(mrCurrent);
  if (!m) return;
  document.getElementById('mrTitle').textContent = m.title;
  document.getElementById('mrMeta').textContent = 'จาก ' + m.from + (m.at ? ' · ' + m.at : '');
  document.getElementById('mrBody').textContent = m.body;

  const gift = document.getElementById('mrGift');
  gift.classList.toggle('hidden', !m.reward);
  if (m.reward) document.getElementById('mrRewards').innerHTML = rewardChips(m.reward);

  const claim = document.getElementById('mrClaim');
  claim.classList.toggle('hidden', !m.reward);
  claim.disabled = !m.reward || m.claimed;
  claim.textContent = !m.reward ? '' : m.claimed ? 'รับไปแล้ว' : 'รับของขวัญ';
}

function openMail(id) {
  mrCurrent = id;
  markRead(id);            // เปิดอ่านแล้วจุดแดงต้องหาย ไม่ต้องรอให้กดรับของ
  setMsg(document.getElementById('mrMsg'), '');
  paintMailRead();
  swapPanel(inboxPanel, mailReadPanel);
  refreshMailDot();
}

function showInbox(on) {
  if (on) {
    setMsg(document.getElementById('inboxMsg'), '');
    buildMailList();
    showPanel(inboxPanel);
  } else {
    inboxPanel.classList.add('hidden');
    startPanel.classList.remove('hidden');
  }
}

document.getElementById('btnMail').addEventListener('click', async () => {
  unlockAudio(); startMusic();
  sfx.fish();
  // เปิดกล่องด้วยของที่มีอยู่ก่อนเลย ไม่ต้องรอเน็ต
  // แล้วค่อยเติมฉบับใหม่จากคลาวด์เข้ามาทีหลังถ้ามี
  // ถ้ารอให้ดึงเสร็จก่อนค่อยเปิด คนที่เน็ตช้าจะกดแล้วเหมือนปุ่มไม่ทำงาน
  showInbox(true);
  const added = await syncMail();
  if (!added) return;
  // ผู้เล่นอาจกดออกจากกล่องไปแล้วระหว่างรอเน็ต อย่าวาดทับหน้าที่เขาอยู่ตอนนี้
  if (!inboxPanel.classList.contains('hidden')) buildMailList();
  refreshMailDot();
});
document.getElementById('inboxBack').addEventListener('click', () => {
  unlockAudio();
  showInbox(false);
});
document.getElementById('mrBack').addEventListener('click', () => {
  unlockAudio();
  sfx.fish();
  swapPanel(mailReadPanel, inboxPanel);
  buildMailList();
});

document.getElementById('mrClaim').addEventListener('click', async () => {
  // ฉบับจากคลาวด์ต้องรอเซิร์ฟเวอร์ตอบ ระหว่างนั้นต้องกันกดซ้ำ
  // ไม่งั้นกดรัว ๆ จะยิงคำขอซ้อนกันหลายอัน แล้วขึ้นกล่องรางวัลซ้อนกันหลายใบ
  const btn = document.getElementById('mrClaim');
  if (btn.disabled) return;
  btn.disabled = true;
  const r = await claimMail(mrCurrent);
  btn.disabled = false;
  unlockAudio();
  if (!r.ok) {
    sfx.shieldBreak();
    return setMsg(document.getElementById('mrMsg'), r.reason, true);
  }
  payReward(r.reward);
  paintMailRead();
  refreshMailDot();
  setMsg(document.getElementById('mrMsg'), '');
  showReward('รับของขวัญแล้ว!', r.reward);
});

document.getElementById('mailClaimAll').addEventListener('click', async () => {
  const btn = document.getElementById('mailClaimAll');
  if (btn.disabled) return;
  btn.disabled = true;
  const r = await claimAll();
  btn.disabled = false;
  unlockAudio();
  if (!r.count) {
    sfx.shieldBreak();
    return setMsg(document.getElementById('inboxMsg'), 'ไม่มีของขวัญค้างอยู่แล้ว', true);
  }
  payReward({ gold: r.gold, gems: r.gems });
  buildMailList();
  setMsg(document.getElementById('inboxMsg'), '');
  showReward(`รับของขวัญครบ ${r.count} ฉบับ!`, { gold: r.gold, gems: r.gems });
});

// ── ล้างจดหมาย ──
// ลบเฉพาะฉบับที่อ่านแล้วและไม่มีของค้าง กติกาอยู่ใน clearReadMail()
document.getElementById('mailClear').addEventListener('click', () => {
  unlockAudio();
  const removed = clearReadMail();
  if (!removed) {
    sfx.shieldBreak();
    return setMsg(document.getElementById('inboxMsg'),
      'ยังไม่มีฉบับไหนที่ล้างได้ (ต้องอ่านแล้วและไม่มีของค้างรับ)', true);
  }
  sfx.fish();
  buildMailList();
  setMsg(document.getElementById('inboxMsg'), `ล้างไป ${removed} ฉบับแล้ว`);
});

// ── หน้ากิจกรรม ────────────────────────────────────────────
//
// รายการสร้างจาก QUESTS ตรง ๆ เพิ่มภารกิจใหม่ = เติมอ็อบเจกต์ใน quests.js พอ
// ไฟล์นี้ไม่รู้จักภารกิจข้อไหนเป็นการเฉพาะเลยสักข้อ

// ── ภาษา ───────────────────────────────────────────────────
//
// ตัวระบบอยู่ใน src/i18n.js (กวาดแปลทั้ง DOM) และ src/i18n-en.js (พจนานุกรม)
// ที่นี่มีแค่สองอย่าง: ปุ่มในหน้าตั้งค่า กับการบอกให้ของที่วาดบน canvas วาดใหม่

function paintLangPick() {
  const cur = getLang();
  for (const [id, code] of [['langTh', 'th'], ['langEn', 'en']]) {
    const b = document.getElementById(id);
    b.classList.toggle('on', cur === code);
    b.setAttribute('aria-pressed', String(cur === code));
  }
}

for (const [id, code] of [['langTh', 'th'], ['langEn', 'en']]) {
  document.getElementById(id).addEventListener('click', () => {
    unlockAudio();
    sfx.fish();
    setLang(code);
    paintLangPick();
  });
}

// ของที่วาดด้วย canvas ไม่มีโหนดข้อความให้กวาด ต้องสั่งวาดใหม่เองเมื่อภาษาเปลี่ยน
// (ไอคอนปุ่มล็อบบี้ การ์ดโปรไฟล์ และหน้าที่เปิดค้างอยู่ตอนกดเปลี่ยนภาษา)
onLang(() => {
  paintLangPick();
  refreshHome();
  // หน้าสกิล/พรสวรรค์สร้างการ์ดใหม่ทุกครั้งที่เปิด สั่งเปิดซ้ำ (หมวดเดิม) จึงเท่ากับวาดใหม่ทั้งหน้า
  if (!talentPanel.classList.contains('hidden')) skillUI.open();
  // วันที่กิจกรรมเขียนตามภาษา (พ.ศ./ค.ศ.) ไม่ได้ผ่านพจนานุกรม
  document.getElementById('questWhen').textContent = seasonText(getLang());
});

// แปลรอบแรกตอนเปิดเกม แล้วเฝ้าดูของที่ถูกสร้างใหม่ตลอดอายุการเล่น
document.documentElement.lang = getLang() === 'en' ? 'en' : 'th';
applyLang(document.body);
watchLang(document.querySelector('.shell') || document.body);
paintLangPick();

// ── เช็คอินรายวัน ──────────────────────────────────────────
//
// src/daily.js  ตารางของเจ็ดวัน และจำว่ารับถึงวันไหนแล้ว
// ไฟล์นี้        วาดปฏิทิน จ่ายของ และเปิดหน้าให้เองตอนเข้าล็อบบี้วันแรกของวัน

const dailyPanel = document.getElementById('dailyPanel');

/** จุดแดงบนปุ่มเช็คอิน — วันนี้ยังไม่ได้รับก็ขึ้นจุด (ไม่ต้องมีตัวเลข มีได้วันละชิ้นเดียว) */
function refreshDailyDot() {
  const dot = document.getElementById('dailyDot');
  dot.textContent = '';
  dot.classList.toggle('hidden', !dayState().ready);
}

/** ของรางวัลหนึ่งวันเขียนเป็นชิปสั้น ๆ */
function dailyPrizeHtml(reward) {
  const bits = [];
  if (reward.gold) bits.push('<span class="coin" aria-hidden="true"></span>' + reward.gold.toLocaleString('en-US'));
  if (reward.gems) bits.push('<span class="gem" aria-hidden="true"></span>' + reward.gems.toLocaleString('en-US'));
  return bits.join('');
}

/**
 * ปฏิทินเจ็ดช่อง — แตะช่องของวันนี้เพื่อรับของเลย ไม่มีปุ่มรับแยก
 *
 * ทุกช่องเป็นปุ่มจริง ไม่ใช่เฉพาะช่องที่กดรับได้ เพราะช่องอื่นก็ต้องตอบคนที่แตะมัน
 * ให้รู้ว่า "ทำไมช่องนี้ยังกดไม่ได้" — เงียบเฉย ๆ อ่านเป็นปุ่มเสีย
 *
 * ใบที่ผ่านไปแล้วยังอยู่ครบ ไม่ได้ซ่อนทิ้ง — ปฏิทินที่เหลือแต่วันข้างหน้า
 * ไม่ได้ให้ความรู้สึกว่า "มาต่อเนื่องมาหลายวันแล้ว" ซึ่งเป็นความรู้สึกเดียว
 * ที่ทำให้คนอยากกลับมาพรุ่งนี้
 */
function buildDailyGrid() {
  const grid = document.getElementById('dlGrid');
  const st = dayState();
  grid.innerHTML = '';

  for (let n = 1; n <= CYCLE; n++) {
    const reward = rewardOfDay(n);
    const done = n <= st.day;
    const today = st.ready && n === st.next;

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'dl-card'
      + (reward.big ? ' big' : '')
      + (done ? ' done' : today ? ' today' : n > st.next ? ' soon' : '');
    card.innerHTML = '<span class="dl-day"></span><span class="dl-prize"></span>'
      + (today ? '<span class="dl-tap">แตะเพื่อรับ</span>' : '');
    card.querySelector('.dl-day').textContent = today ? 'วันนี้' : 'วันที่ ' + n;
    card.querySelector('.dl-prize').innerHTML = dailyPrizeHtml(reward);
    card.addEventListener('click', () => {
      unlockAudio();
      if (today) { doClaimDaily(); return; }
      sfx.fish();
      setMsg(document.getElementById('dlMsg'), done
        ? 'ช่องนี้รับไปแล้ว'
        : st.ready
          ? 'ต้องรับของวันที่ ' + st.next + ' ก่อนนะ'
          : 'วันนี้รับไปแล้ว พรุ่งนี้มาเปิดช่องนี้ต่อได้เลย');
    });
    grid.appendChild(card);
  }

  markScrollable(grid);
  document.getElementById('dlCycle').textContent = st.cycles + 1;

  document.getElementById('dlLead').textContent = st.ready
    ? 'แวะมาทักน้องทุกวันนะ มีของฝากให้ทุกวันเลย'
    : 'วันนี้รับไปแล้ว พรุ่งนี้มาใหม่นะ น้องรออยู่';
  paintDailyCat();
  refreshDailyDot();
}

// ── น้องนั่งรออยู่ข้างปฏิทิน ──
// ใช้สีขนที่ผู้เล่นใส่อยู่จริง (ไม่ใช่ตัวส้มตายตัว) หน้านี้จึงเป็นน้องของเราเอง
// ท่านั่งกับตาประกายมาจากชุดท่าเดียวกับที่ใช้ตอนน้องนั่งรอในล็อบบี้
let dlTick = 0;
let dlRAF = 0;

/**
 * เบาะกลมสีฟ้าที่น้องนั่งอยู่ — วงรีสามชั้น: ขอบล่างเข้ม หน้าเบาะ แล้วแสงบนขอบบน
 * วาดด้วยโค้ดเหมือนของทุกชิ้นในเกม ไม่ใช้ไฟล์รูป
 */
function drawCushion(c, x, y, w) {
  const h = w * 0.34;
  c.save();
  c.fillStyle = '#1668CE';
  c.beginPath(); c.ellipse(x, y + h * 0.26, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#2E90F0';
  c.beginPath(); c.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 0.34;
  c.fillStyle = '#B4E0FF';
  c.beginPath(); c.ellipse(x, y - h * 0.14, w * 0.41, h * 0.3, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}

/**
 * น้องนั่งบนเบาะ ตาประกาย — ท่า "ดีใจสุด ๆ" ชุดเดียวกับตอนอยู่บนฟ้าในโบนัส
 * (mood: 'starry' = ตาแป๊วมีประกาย ปากอ้ายิ้ม)
 */
function paintDailyCat() {
  paintMini(document.getElementById('dlCat'), 240, (c) => {
    drawCushion(c, 120, 220, 172);
    drawCatPose(c, 120, 213, 3.35, getSkin(), dlTick, { pose: 'sit', k: 1, mood: 'starry' });
  });
}

function dailyCatLoop() {
  if (dailyPanel.classList.contains('hidden')) { dlRAF = 0; return; }
  dlTick++;
  paintDailyCat();
  dlRAF = requestAnimationFrame(dailyCatLoop);
}

function doClaimDaily() {
  const got = claimDaily();
  if (!got) return;
  payReward(got.reward);
  buildDailyGrid();
  showReward(
    got.finishedCycle ? 'ครบเจ็ดวันแล้ว!' : 'เช็คอินวันที่ ' + got.n + '!',
    got.reward,
    got.reward.note ? { note: got.reward.note } : {},
  );
}

function showDaily(on) {
  dailyPanel.classList.toggle('hidden', !on);
  startPanel.classList.toggle('hidden', on);
  if (on) {
    setMsg(document.getElementById('dlMsg'), '');
    refreshGold();
    buildDailyGrid();
    if (!dlRAF) dlRAF = requestAnimationFrame(dailyCatLoop);
  }
}

document.getElementById('btnDaily').addEventListener('click', () => {
  unlockAudio(); startMusic();
  sfx.fish();
  showDaily(true);
});
document.getElementById('dlBack').addEventListener('click', () => showDaily(false));

/**
 * เปิดหน้าเช็คอินให้เองตอนเข้าล็อบบี้ ถ้าวันนี้ยังไม่ได้รับ
 *
 * ── ทำไมต้องเด้งเอง ──
 * ของชิ้นนี้คือ "รางวัลของการเข้ามา" ถ้ารอให้กดปุ่มเอง คนที่ไม่เคยสังเกตปุ่ม
 * จะไม่ได้รับเลยสักวัน ทั้งที่เข้ามาทุกวัน ซึ่งกลับหัวกับจุดประสงค์ของระบบ
 *
 * เด้งครั้งเดียวต่อการเปิดเกมหนึ่งครั้ง (ไม่ใช่ทุกครั้งที่กลับหน้าแรก) และ
 * รอให้คลิปเปิดเกมจบก่อนเสมอ — เด้งทับคลิปคือการขัดจังหวะ ไม่ใช่ของขวัญ
 */
let dailyPopped = false;
function maybePopDaily() {
  if (dailyPopped || !dayState().ready) return;
  dailyPopped = true;
  setTimeout(() => {
    // ระหว่างรอ ผู้เล่นอาจกดเข้าหน้าอื่นหรือกดเล่นไปแล้ว — เด้งทับถือว่าแย่งมือ
    if (startPanel.classList.contains('hidden')) return;
    showDaily(true);
  }, 650);
}

// ── รางวัลเลเวล ────────────────────────────────────────────
//
// หน้าที่แบ่งกันสองส่วนเหมือนระบบอื่นในเกม:
//   src/level-rewards.js  ตารางของรางวัล และจำว่ากดรับเลเวลไหนไปแล้ว
//   ไฟล์นี้                วาดหน้าจอ จ่ายของจริง และเล่นเสียง
// ไฟล์นี้จึงไม่รู้ว่าเลเวลไหนได้อะไร และไฟล์นั้นก็ไม่รู้จักหน้าจอเลย

const lvPanel = document.getElementById('lvPanel');

/** เลเวลตอนนี้ — อ่านสด ๆ ทุกครั้ง เพราะ XP ขึ้นได้ระหว่างเปิดหน้าอื่นค้างอยู่ */
function curLevel() {
  return levelFromXp(loadXp()).level;
}

/** ป้ายแดงบนปุ่มรางวัลเลเวล — กติกาเดียวกับปุ่มกิจกรรม */
function refreshLvDot() {
  const n = lvClaimableCount(curLevel());
  const dot = document.getElementById('lvDot');
  dot.textContent = n === 0 ? '' : n > 9 ? '9+' : n;
  dot.classList.toggle('hidden', n === 0);
}

/** แถบสรุปบนสุด: เลเวลปัจจุบันกับความคืบหน้าไปเลเวลถัดไป */
function paintLvNow() {
  const st = levelFromXp(loadXp());
  document.getElementById('lvNowBadge').textContent = st.level;
  document.getElementById('lvNowText').textContent =
    st.maxed ? 'เลเวล ' + st.level + ' · สูงสุดแล้ว' : 'เลเวล ' + st.level;
  // XP ตอนนี้ ▶ XP ที่ต้องใช้ถึงเลเวลหน้า (ตันแล้วโชว์ตัวเลขเดียวกันทั้งคู่)
  document.getElementById('lvNowInto').textContent = st.into.toLocaleString('en-US');
  document.getElementById('lvNowNeed').textContent = st.maxed ? '—' : st.need.toLocaleString('en-US');
  document.getElementById('lvNowFill').style.width = (st.maxed ? 100 : Math.round(st.ratio * 100)) + '%';

  // ── รางวัลใหญ่ถัดไป ── การ์ดพรสวรรค์ใบต่อไปที่ยังไปไม่ถึง (เป้าหมายระยะกลาง)
  const next = document.getElementById('lvNext');
  const nextLv = Object.keys(TALENT_AT).map(Number).sort((a, b) => a - b).find((lv) => lv > st.level);
  next.classList.toggle('hidden', !nextLv);
  if (nextLv) {
    const t = talentById(TALENT_AT[nextLv]);
    next.className = 'lv-next rank-' + t.rank.toLowerCase();
    next.replaceChildren();
    const lead = document.createElement('small');
    lead.textContent = 'รางวัลใหญ่ถัดไป';
    const ico = document.createElement('span');
    ico.className = 'lv-next-ico';
    ico.textContent = t.icon;
    const name = document.createElement('b');
    name.textContent = t.name;
    const when = document.createElement('small');
    when.className = 'lv-next-when';
    when.textContent = `เลเวล ${nextLv} · อีก ${nextLv - st.level} เลเวล`;
    next.append(lead, ico, name, when);
  }
}

/** รูปตราระดับของการ์ดพรสวรรค์ (A / S / SS) — ใช้ในแถวรางวัลเลเวลกับกล่องฉลอง */
function talentSign(rank, cls) {
  const img = document.createElement('img');
  img.className = cls;
  img.src = import.meta.env.BASE_URL + T_RANKS[rank].sign;
  img.alt = 'ระดับ ' + T_RANKS[rank].label;
  return img;
}

/**
 * ของรางวัลของเลเวลหนึ่งเป็น "ไทล์" แยกชิ้น — เห็นทันทีว่าเลเวลนี้ได้อะไรบ้าง
 * การ์ดพรสวรรค์เป็นไทล์ใหญ่ (รูป + ป้าย "การ์ดพรสวรรค์" + ชื่อ + ตราระดับ) ขึ้นก่อนเสมอ
 */
function lvPrizeTiles(reward) {
  const box = document.createElement('span');
  box.className = 'lv-items';
  if (!reward) {
    box.textContent = 'ยังไม่ประกาศของรางวัล';
    return box;
  }
  const t = reward.talent && talentById(reward.talent);
  if (t) {
    const tile = document.createElement('span');
    tile.className = 'lv-item talent rank-' + t.rank.toLowerCase();
    const ico = document.createElement('span');
    ico.className = 'lv-t-ico';
    ico.textContent = t.icon;
    const txt = document.createElement('span');
    txt.className = 'lv-t-txt';
    const kind = document.createElement('small');
    kind.textContent = 'การ์ดพรสวรรค์';
    const name = document.createElement('b');
    name.textContent = t.name;
    txt.append(kind, name);
    tile.append(ico, txt, talentSign(t.rank, 'lv-t-sign'));
    box.appendChild(tile);
  }
  const money = (cls, icon, amount) => {
    const tile = document.createElement('span');
    tile.className = 'lv-item ' + cls;
    const i = document.createElement('span');
    i.className = icon;
    i.setAttribute('aria-hidden', 'true');
    const b = document.createElement('b');
    b.textContent = amount.toLocaleString('en-US');
    tile.append(i, b);
    box.appendChild(tile);
  };
  if (reward.gems) money('gems', 'gem', reward.gems);
  if (reward.gold) money('gold', 'coin', reward.gold);
  return box;
}


/**
 * รายการรางวัลทุกเลเวล
 *
 * สร้างครบทุกเลเวลตั้งแต่ 2 ถึงเลเวลสูงสุด ไม่ตัดเฉพาะที่ถึงแล้ว —
 * ครึ่งหนึ่งของคุณค่าหน้านี้คือ "รู้ว่าข้างหน้ามีอะไรรออยู่" ถ้าโชว์แต่ที่ได้แล้ว
 * มันจะกลายเป็นใบเสร็จ ไม่ใช่เป้าหมาย
 */
function buildLvList() {
  const list = document.getElementById('lvList');
  const st = levelFromXp(loadXp());
  const level = st.level;
  list.innerHTML = '';

  // กล่องในสุดสูงเท่าเนื้อหาจริง — รางกับหมุดจึงอ้างอิงความสูงเดียวกันได้
  const inner = document.createElement('div');
  inner.className = 'lv-inner';
  const track = document.createElement('i');
  track.className = 'lv-track';
  track.setAttribute('aria-hidden', 'true');
  track.innerHTML = '<b></b>';
  inner.appendChild(track);

  let firstReady = null;
  let hereRow = null;

  for (let lv = FIRST_REWARD_LEVEL; lv <= LEVEL_CAP; lv++) {
    // หมุด "ตอนนี้อยู่ตรงนี้" แทรกก่อนเลเวลแรกที่ยังไปไม่ถึง
    if (!hereRow && lv > level) {
      hereRow = document.createElement('div');
      hereRow.className = 'lv-here';
      // ช่องซ้ายเว้นว่างให้รางผ่าน ส่วนข้อความกับหน้าน้องอยู่ช่องขวาเรียงกัน (ตามแบบ)
      hereRow.innerHTML = '<span aria-hidden="true"></span>'
        + '<span class="lv-here-info"><b></b>'
        + '<canvas class="lv-here-cat" width="96" height="96" aria-hidden="true"></canvas></span>';
      paintMini(hereRow.querySelector('.lv-here-cat'), 96, (c) => drawCatFace(c, 48, 56, 2.5, getSkin()));
      hereRow.querySelector('.lv-here-info b').textContent = st.into.toLocaleString('en-US') + ' XP';
      inner.appendChild(hereRow);
    }

    const reward = rewardFor(lv);
    const reached = lv <= level;
    const claimed = isClaimed(lv);
    const ready = canClaim(lv, level);

    const row = document.createElement('div');
    row.className = 'lv-row' + (ready ? ' ready' : claimed ? ' done' : reached ? '' : ' locked');
    row.innerHTML = '<span class="lv-node" aria-hidden="true">'
      + '<span class="lg-box"><i class="lg-lid"></i><i class="lg-band"></i><i class="lg-bow"></i></span></span>'
      + '<button type="button" class="lv-card">'
      + '<span class="lv-when"></span><span class="lv-what"></span></button>';

    row.querySelector('.lv-when').textContent = 'เลเวล ' + lv;
    const what = row.querySelector('.lv-what');
    what.appendChild(lvPrizeTiles(reward));
    // เลเวลที่ได้การ์ด = แถวพิเศษ (กรอบสีตามระดับ + ริบบิ้น "การ์ดใหม่!") เป็นหมุดหมายระหว่างทาง
    if (reward?.talent) {
      row.classList.add('has-talent', 'rank-' + talentById(reward.talent).rank.toLowerCase());
      const rib = document.createElement('span');
      rib.className = 'lv-ribbon';
      rib.textContent = 'การ์ดใหม่!';
      what.appendChild(rib);
    } else if (reward?.gems) {
      row.classList.add('has-gems');
    }
    // ท้ายแถว: สถานะเป็นชิป — รับ! (เด้ง ทองเรือง) / ✓ รับแล้ว / 🔒 ยังไปไม่ถึง
    const chip = document.createElement('span');
    chip.className = 'lv-claim';
    chip.textContent = ready ? 'รับ!' : claimed ? '✓' : '🔒';
    what.appendChild(chip);

    row.querySelector('.lv-card').addEventListener('click', () => {
      unlockAudio();
      if (ready) { doClaimLv(lv); return; }
      sfx.fish();
      setMsg(document.getElementById('lvMsg'), claimed
        ? 'รางวัลเลเวล ' + lv + ' รับไปแล้ว'
        : !reached
          ? 'ถึงเลเวล ' + lv + ' แล้วกดรับได้เลย'
          : 'เลเวลนี้ยังไม่ได้ใส่ของรางวัล');
    });

    if (ready && firstReady === null) firstReady = row;
    inner.appendChild(row);
  }

  list.appendChild(inner);
  paintLvNow();
  paintLvCount(level);
  refreshLvDot();

  // ── ความยาวของหลอด ──
  // ปลายหลอดต้องอยู่กึ่งกลางแถว "ตอนนี้อยู่ตรงนี้" พอดี เลข XP กับหน้าน้องจึงอยู่บรรทัดเดียวกับปลายหลอด
  //
  // ── ทำไมวัดครั้งเดียวไม่พอ ──
  // ฟอนต์ Mitr โหลดเสร็จทีหลัง พอสลับฟอนต์ ความสูงของทุกแถวข้างบนเปลี่ยน
  // ค่าที่วัดไว้ตอนแรกจึงเตี้ยกว่าจุดจริงอยู่หลายสิบพิกเซล (เห็นเป็นหลอดจบก่อนถึงหน้าน้อง)
  // วัดซ้ำเมื่อฟอนต์พร้อม และเมื่อความสูงของรายการเปลี่ยนด้วย (หมุนจอ/ย่อขยายหน้าต่าง)
  const fillTo = hereRow || inner.lastElementChild;
  const bar = track.querySelector('b');
  const syncFill = () => {
    if (!fillTo.isConnected) return;
    const y = fillTo.offsetTop + fillTo.offsetHeight / 2;
    bar.style.setProperty('--fill', Math.round(y) + 'px');
  };
  requestAnimationFrame(syncFill);
  if (document.fonts?.ready) document.fonts.ready.then(() => requestAnimationFrame(syncFill));
  if (window.ResizeObserver) {
    // ตัวสังเกตตายไปพร้อมรายการที่ถูกทิ้งตอนสร้างใหม่ (inner ถูกแทนที่ทั้งก้อน)
    new ResizeObserver(syncFill).observe(inner);
  }

  // เปิดหน้ามาแล้วเลื่อนไปที่ของที่กดรับได้ทันที ถ้าไม่มีก็ไปที่จุดที่ยืนอยู่ตอนนี้
  // ไม่งั้นคนเลเวล 40 ต้องเลื่อนผ่านแถวที่รับไปแล้วสี่สิบแถวกว่าจะเจอของจริง
  const target = firstReady || hereRow;
  if (target) {
    requestAnimationFrame(() => {
      list.scrollTop = Math.max(0, target.offsetTop - list.clientHeight * 0.35);
    });
  }
}

/** ป้ายจำนวนข้างหัวเรื่อง: รับได้ตอนนี้กี่ใบ จากทั้งหมดกี่ใบ */
function paintLvCount(level) {
  document.getElementById('lvReady').textContent = lvClaimableCount(level);
  document.getElementById('lvTotal').textContent = LEVEL_CAP - FIRST_REWARD_LEVEL + 1;
  document.getElementById('lvClaimAll').disabled = lvClaimableCount(level) === 0;
}

/**
 * การ์ดพรสวรรค์ในกล่องฉลอง — ทรงเดียวกับการ์ดทอง/เพชร (got-card) ขอบตามระดับการ์ด
 * กดรับแล้วการ์ดปลดทันที (isUnlocked อ่านจากรายการเลเวลที่รับแล้ว) ไม่มีขั้นจ่ายของแยก
 */
function talentGotCard(t) {
  const card = document.createElement('div');
  card.className = 'got-card talent rank-' + t.rank.toLowerCase();
  // ป้ายมุมซ้ายบนบอกชนิดของ (การ์ดพรสวรรค์) / ตราระดับมุมขวาบน / ล่างเป็นชื่อกับระดับ
  card.innerHTML = '<span class="got-kind"></span><span class="got-talent-ico" aria-hidden="true"></span><b></b><small></small>';
  card.querySelector('.got-kind').textContent = 'การ์ดพรสวรรค์';
  card.querySelector('.got-talent-ico').textContent = t.icon;
  card.querySelector('b').textContent = t.name;
  card.querySelector('small').textContent = 'ระดับ ' + T_RANKS[t.rank].label;
  card.appendChild(talentSign(t.rank, 'got-sign'));
  return card;
}

function talentNote(ids) {
  return ids.length ? 'ติดตั้งได้ที่ปุ่มสกิล › แท็บพรสวรรค์' : '';
}

function doClaimLv(lv) {
  const reward = claimLevel(lv, curLevel());
  if (!reward) return;   // กดซ้ำเร็ว ๆ หรือยังไม่ถึง — ไม่มีอะไรเกิดขึ้น
  payReward(reward);
  buildLvList();
  const ids = reward.talent ? [reward.talent] : [];
  const note = reward.note || talentNote(ids);
  showReward('รางวัลเลเวล ' + lv + '!', reward, {
    ...(note ? { note } : {}),
    cards: ids.map((id) => talentGotCard(talentById(id))),
  });
}

function doClaimAllLv() {
  const got = claimAllLevels(curLevel());
  if (!got.count) return;
  payReward(got);
  buildLvList();
  const note = talentNote(got.talents);
  showReward('รับรางวัลครบ ' + got.count + ' เลเวล!', got, {
    ...(note ? { note } : {}),
    cards: got.talents.map((id) => talentGotCard(talentById(id))),
  });
}

function showLvPanel(on) {
  lvPanel.classList.toggle('hidden', !on);
  startPanel.classList.toggle('hidden', on);
  if (on) {
    setMsg(document.getElementById('lvMsg'), '');
    refreshGold();
    buildLvList();
  }
}

document.getElementById('btnLvGift').addEventListener('click', () => {
  unlockAudio(); startMusic();
  sfx.fish();
  showLvPanel(true);
});
document.getElementById('lvBack').addEventListener('click', () => showLvPanel(false));
document.getElementById('lvClaimAll').addEventListener('click', () => {
  unlockAudio();
  doClaimAllLv();
});

const questPanel = document.getElementById('questPanel');

/**
 * ป้ายแดงบนปุ่มกิจกรรม — บอกจำนวนข้อที่ทำครบแล้วแต่ยังไม่ได้กดรับ
 *
 * ใส่ตัวเลขไปเลย ไม่ใช่จุดเปล่าแบบกล่องจดหมาย เพราะกิจกรรมเสร็จพร้อมกันได้หลายข้อ
 * "มีของค้าง" กับ "มีของค้างหกข้อ" ต่างกันตรงที่อย่างหลังบอกว่าคุ้มที่จะกดเข้าไปแค่ไหน
 */
function refreshQuestDot() {
  const n = claimableCount();
  const dot = document.getElementById('questDot');
  // ไม่มีอะไรให้กดรับ = ไม่ใส่ตัวหนังสือเลย (เหตุผลเดียวกับ refreshMailDot)
  // เกิน 9 ใส่ 9+ แทนตัวเลขจริง ไม่งั้นป้ายจะยืดจนเบียดชื่อปุ่ม
  dot.textContent = n === 0 ? '' : n > 9 ? '9+' : n;
  dot.classList.toggle('hidden', n === 0);
}

/** ไอคอนปุ่มกิจกรรม — กล่องของขวัญ ตัวเดิมที่เคยอยู่บนปุ่มสมบัติ */
function paintQuestIcon() {
  paintFitted(document.getElementById('questIcon'), 76, 0.96, (c) => {
    c.font = '46px serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('🎁', 38, 42);
  });
}

function buildQuestList() {
  const list = document.getElementById('questList');
  list.innerHTML = '';

  for (const { q, st } of questList()) {
    const row = document.createElement('div');
    row.className = 'quest-row' + (st.claimed ? ' done' : st.done ? ' ready' : '');
    row.innerHTML =
      '<span class="quest-ico"></span>'
      + '<div class="quest-info">'
      + '<b class="quest-name"></b>'
      + '<small class="quest-note"></small>'
      + '<span class="quest-bar"><i></i></span>'
      + '</div>'
      + '<div class="quest-side">'
      + '<span class="quest-prize"></span>'
      + '<button type="button" class="btn quest-get"></button>'
      + '</div>';

    row.querySelector('.quest-ico').textContent = q.icon;
    row.querySelector('.quest-name').textContent = q.name;

    // ความคืบหน้าเขียนด้วยหน่วยที่คนอ่านรู้เรื่อง (วินาที → นาที) ไม่ใช่ค่าดิบ
    const shown = q.show ? q.show(st.cur) : st.cur;
    const goal = q.show ? q.show(q.goal) : q.goal;
    row.querySelector('.quest-note').textContent =
      q.note + ' · ' + shown.toLocaleString('en-US') + '/' + goal.toLocaleString('en-US')
      + (q.unit ? ' ' + q.unit : '');
    row.querySelector('.quest-bar i').style.width = Math.round(st.ratio * 100) + '%';

    const bits = [];
    if (q.reward.gems) bits.push('<span class="gem" aria-hidden="true"></span>' + q.reward.gems.toLocaleString('en-US'));
    if (q.reward.gold) bits.push('<span class="coin" aria-hidden="true"></span>' + q.reward.gold.toLocaleString('en-US'));
    row.querySelector('.quest-prize').innerHTML = bits.join('');

    const get = row.querySelector('.quest-get');
    get.textContent = st.claimed ? 'รับแล้ว' : st.done ? 'รับรางวัล' : 'ยังไม่ครบ';
    get.disabled = !st.done || st.claimed;
    get.addEventListener('click', () => doClaimQuest(q.id));

    list.appendChild(row);
  }
  markScrollable(list);
  refreshQuestDot();
  document.getElementById('questClaimAll').disabled = claimableCount() === 0;
  document.getElementById('questWhen').textContent = seasonText(getLang());
}

/** รับทุกข้อที่ทำครบแล้วรวดเดียว — จ่ายรวมก้อนเดียว กล่องฉลองขึ้นครั้งเดียว (ไม่เด้งทีละข้อ) */
function doClaimAllQuests() {
  unlockAudio();
  const got = { gold: 0, gems: 0 };
  let n = 0;
  for (const q of QUESTS) {
    const r = claimQuest(q.id);
    if (!r.ok) continue;
    got.gold += r.reward.gold || 0;
    got.gems += r.reward.gems || 0;
    n++;
  }
  if (!n) return;
  payReward(got);
  setMsg(document.getElementById('questMsg'), '');
  buildQuestList();
  showReward('รับรางวัลครบ ' + n + ' ภารกิจ!', got);
}
document.getElementById('questClaimAll').addEventListener('click', doClaimAllQuests);

function doClaimQuest(id) {
  const r = claimQuest(id);
  unlockAudio();
  if (!r.ok) {
    sfx.shieldBreak();
    return setMsg(document.getElementById('questMsg'), r.reason, true);
  }
  payReward(r.reward);
  setMsg(document.getElementById('questMsg'), '');
  buildQuestList();
  showReward('สำเร็จ: ' + r.quest.name, r.reward);
}

// ── หน้าโปรไฟล์ ────────────────────────────────────────────
//
// หน้าเดียวใช้สองแบบ:
//   โปรไฟล์ของเรา   ข้อมูลในเครื่อง / ปุ่ม "แก้ไข" เปิดดินสอสามจุด (สเตตัส · ชื่อ · ด่านที่อวดสถิติ)
//   ส่องโปรไฟล์คนอื่น ภาพรวมที่เจ้าของส่งขึ้นคลาวด์ (ดู friends.js) / ปุ่ม "เพิ่มเพื่อน"
//
// ทั้งสองแบบแปลงเป็น "ก้อนข้อมูลโปรไฟล์" ก้อนเดียวกันก่อน (ownProfile / remoteProfile)
// แล้ววาดด้วย renderProfile ตัวเดียว หน้าตาของสองแบบจึงไม่มีวันเพี้ยนจากกัน
//
// ── ทำไมไม่เอาเหรียญทองกับเพชรมาโชว์ด้วย ──
// สองอย่างนั้นอยู่บนแถบบนของจอตลอดเวลาอยู่แล้ว และไม่ควรให้คนอื่นส่องเห็น

const profilePanel = document.getElementById('profilePanel');
const pfPop = document.getElementById('pfPop');

/**
 * แยก "ตัวเลข" กับ "หน่วย" ออกจากกัน
 * การ์ดวางตัวเลขใหญ่คู่กับหน่วยตัวเล็ก (54 ตา / 24 นาที / 4.9 กม.)
 * เวลาเกินชั่วโมงเหลือแค่หน่วยชั่วโมง ("3.2 ชม.") ช่องแคบ ๆ ใส่สองหน่วยไม่พอ
 */
function splitUnit(text) {
  const i = String(text).indexOf(' ');
  return i < 0 ? [String(text), ''] : [text.slice(0, i), text.slice(i + 1)];
}
function timeParts(sec) {
  const m = Math.floor(sec / 60);
  if (m < 60) return [String(m), 'นาที'];
  const h = (m / 60).toFixed(1);
  return [h.endsWith('.0') ? h.slice(0, -2) : h, 'ชม.'];
}

/** เมตรดิบ → กิโลเมตรเมื่อเกินพัน ตัวเลขหกหลักอ่านไม่ทันในช่องแคบ ๆ */
function distText(m) {
  if (m < 1000) return Math.round(m).toLocaleString('en-US') + ' ม.';
  const km = (m / 1000).toFixed(1);
  return (km.endsWith('.0') ? km.slice(0, -2) : km) + ' กม.';
}

/** สถิติที่ดีที่สุดของทุกด่านรวมกัน คืนทั้งคะแนนและด่านที่ทำไว้ */
function bestRun() {
  let top = 0;
  let stage = null;
  for (const st of STAGES) {
    const b = loadBest(st.id);
    if (b > top) { top = b; stage = st; }
  }
  return { top, stage };
}

/**
 * ด่านที่ผู้เล่นเลือกอวดสถิติ (ดินสอข้างสถิติสูงสุด)
 * 'auto' = ด่านที่คะแนนสูงสุด — ค่าเริ่มต้น และเป็นค่าที่ถูกเสมอแม้ยังไม่เคยเลือก
 */
const PF_BEST_KEY = 'pfBestStage';

function chosenBest() {
  const pick = loadPref(PF_BEST_KEY, 'auto');
  const st = pick !== 'auto' && STAGES.find((s) => s.id === pick);
  if (st) return { stage: st, score: loadBest(st.id) };
  const b = bestRun();
  return { stage: b.stage, score: b.top };
}

/** ชื่อสีขนกับชื่อชุดที่ใส่อยู่ */
function skinText(s) {
  const bits = [s.name || 'น้องของเรา'];
  if (s.outfit?.name) bits.push(s.outfit.name);
  return bits.join(' - ');
}

/** ก้อนข้อมูลโปรไฟล์ของเรา — อ่านสดจากเครื่องทุกครั้ง */
function ownProfile() {
  const st = levelFromXp(loadXp());
  const s = loadStats();
  const skin = getSkin();
  const best = chosenBest();
  const net = navigator.onLine !== false;
  return {
    mine: true,
    name: localName() || 'แมวนิรนาม',
    level: st.level,
    status: loadStatus(),
    skin,
    skinLabel: skinText(skin),
    online: !net ? { on: false, text: 'ออฟไลน์' }
      : cloudReady ? { on: true, text: 'ใช้งานอยู่' }
        : { on: false, local: true, text: 'เล่นในเครื่อง' },
    stats: { score: s.score, runs: s.runs, seconds: s.seconds, meters: s.meters },
    best: { stageId: best.stage ? best.stage.id : null, stageName: best.stage ? best.stage.name : '', score: best.score },
    counts: {
      cats: [SKINS.filter((x) => ownsSkin(x.id)).length, SKINS.length],
      outfits: [ownedCount(), OUTFITS.length],
      treasures: [treasureCount(), TREASURES.length],
    },
  };
}

/**
 * ภาพรวมที่ส่งขึ้นคลาวด์ให้คนอื่นส่อง — เฉพาะของที่หน้าโปรไฟล์โชว์อยู่แล้วเท่านั้น
 * ทอง เพชร และของในกระเป๋าไม่อยู่ในนี้โดยตั้งใจ
 */
function profileSnapshot(p) {
  return {
    v: 1,
    level: p.level,
    status: p.status,
    skin: p.skin.id,
    outfit: p.skin.outfit ? p.skin.outfit.id : null,
    skinLabel: p.skinLabel,
    stats: p.stats,
    best: { stage: p.best.stageId, score: p.best.score },
    counts: p.counts,
  };
}

/**
 * น้องของคนอื่นห้ามมีรูปหน้าของเรา
 *
 * รูปหน้าที่อัปโหลดเก็บในเครื่องอย่างเดียว ไม่ขึ้นคลาวด์ (ดู face.js) แต่ตัววาดแมวหยิบรูปนั้น
 * มาแปะให้ "ทุกตัวที่วาด" เว้นแต่สกินจะบอก noPhoto — เคยพลาดมาแล้ว: กระดานคะแนน หน้าเพื่อน
 * และหน้าส่องโปรไฟล์ ขึ้นหน้าเราติดไปบนน้องของทุกคน
 * แถวที่เป็นของเราเอง (id ตรงกัน) ยังได้รูป เหมือนน้องของเราในหน้าอื่น
 */
function othersSkin(skin, id) {
  const me = userId();
  return { ...skin, noPhoto: !(me && id === me) };
}

/** แถวจาก public_profiles → ก้อนข้อมูลโปรไฟล์ชุดเดียวกับของเรา */
function remoteProfile(row) {
  const snap = row.public_profile || {};
  const skin = othersSkin({ ...skinById(snap.skin), outfit: outfitById(snap.outfit || 'none') }, row.id);
  const stage = snap.best && STAGES.find((s) => s.id === snap.best.stage);
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const pair = (v) => (Array.isArray(v) ? [num(v[0]), num(v[1])] : [0, 0]);
  return {
    mine: false,
    id: row.id,
    code: row.friend_code,
    name: row.name || 'แมวนิรนาม',
    level: num(snap.level) || 1,
    status: typeof snap.status === 'string' ? cleanStatus(snap.status) : '',
    skin,
    skinLabel: snap.skinLabel || skinText(skin),
    online: onlineInfo(row.last_seen),
    stats: {
      score: num(snap.stats?.score), runs: num(snap.stats?.runs),
      seconds: num(snap.stats?.seconds), meters: num(snap.stats?.meters),
    },
    best: { stageId: stage ? stage.id : null, stageName: stage ? stage.name : '', score: num(snap.best?.score) },
    counts: { cats: pair(snap.counts?.cats), outfits: pair(snap.counts?.outfits), treasures: pair(snap.counts?.treasures) },
    rel: 'none',             // friends / sent / received / none — เติมทีหลังจากเซิร์ฟเวอร์
  };
}

let pfView = null;          // ก้อนข้อมูลที่กำลังโชว์
let pfFrom = null;          // 'friends' = เปิดมาจากหน้าเพื่อนแมว ปิดแล้วต้องกลับไปที่นั่น

// ทางเชื่อมคลาวด์ของระบบเพื่อนทั้งหมด (โปรไฟล์ + หน้าเพื่อนแมว) รวมไว้ก้อนเดียว
// ตอนพัฒนาสลับเป็นข้อมูลปลอมได้ผ่าน window.__fr โดยไม่ต้องมีบัญชีจริงหลายบัญชี
let frApi = {
  friendStatus, sendFriendRequest, respondFriendRequest, cancelFriendRequest, removeFriend,
  fetchFriends, fetchFriendRequests, countFriendRequests, searchPlayers,
};
let pfMyCode = '';          // รหัสเพื่อนของเรา (โหลดครั้งเดียวต่อการเปิดเกม)

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

function renderProfile(p) {
  pfView = p;
  pfPop.classList.toggle('other', !p.mine);
  if (!p.mine) pfPop.classList.remove('editing');

  const on = document.getElementById('pfOnline');
  on.classList.toggle('off', !p.online.on && !p.online.local);
  on.classList.toggle('local', Boolean(p.online.local));
  setText('pfOnlineText', p.online.text);

  const status = document.getElementById('pfStatusText');
  // ว่าง = เส้นประตามแบบ (อ่านได้ทุกภาษา ไม่ต้องแปล)
  status.textContent = p.status || '- - - - - -';
  status.classList.toggle('empty', !p.status);

  setText('pfShowSub', p.skinLabel);
  setText('pfShowName', p.name);
  setText('pfBigLv', 'Lv ' + p.level);

  setText('pfScore', p.stats.score.toLocaleString('en-US'));
  setText('pfRuns', p.stats.runs.toLocaleString('en-US'));
  setText('pfRunsUnit', 'ตา');
  const [tNum, tUnit] = timeParts(p.stats.seconds);
  setText('pfTime', tNum);
  setText('pfTimeUnit', tUnit);
  const [dNum, dUnit] = splitUnit(distText(p.stats.meters));
  setText('pfDist', dNum);
  setText('pfDistUnit', dUnit);

  setText('pfBestWhere', p.best.score > 0 ? p.best.stageName : '');
  // "ยังไม่มีสถิติ" ไม่ใช่ "ยังไม่มี" เฉย ๆ — คำหลังแปลเป็นอังกฤษแล้วกลายเป็น "ไม่ได้เป็นเจ้าของ"
  setText('pfBestScore', p.best.score > 0 ? p.best.score.toLocaleString('en-US') : 'ยังไม่มีสถิติ');
  document.getElementById('pfBestScore').classList.toggle('none', !(p.best.score > 0));

  const count = ([have, all]) => `${have}/${all}`;
  setText('pfCats', count(p.counts.cats));
  setText('pfOutfits', count(p.counts.outfits));
  setText('pfTreasures', count(p.counts.treasures));

  paintActionButton();
  paintPfCat();
}

function paintActionButton() {
  const btn = document.getElementById('pfAction');
  const p = pfView;
  if (!p) return;
  btn.disabled = false;
  if (p.mine) {
    setText('pfActionText', pfPop.classList.contains('editing') ? 'เสร็จแล้ว' : 'แก้ไข');
  } else if (p.adding) {
    setText('pfActionText', 'กำลังส่ง…');
    btn.disabled = true;
  } else if (p.rel === 'friends') {
    setText('pfActionText', 'เป็นเพื่อนแล้ว');
    btn.disabled = true;
  } else if (p.rel === 'sent') {
    setText('pfActionText', 'ส่งคำขอแล้ว');
    btn.disabled = true;
  } else if (p.rel === 'received') {
    setText('pfActionText', 'ตอบรับเพื่อน');
  } else {
    setText('pfActionText', 'เพิ่มเพื่อน');
  }
}

let pfMsgTimer = 0;
function pfSay(text, bad = false) {
  const el = document.getElementById('pfMsg');
  el.textContent = text || '';
  el.classList.toggle('bad', bad);
  clearTimeout(pfMsgTimer);
  if (text) pfMsgTimer = setTimeout(() => { el.textContent = ''; }, 4000);
}

// ── น้องยืนโชว์ตัว ──
// ลูปของตัวเอง หยุดเองที่หัวลูปเมื่อหน้าถูกปิด (หน้านี้ออกได้หลายทาง ไล่ปิดทีละทางพลาดง่าย)
let pfTick = 0;
let pfRAF = 0;

function paintPfCat() {
  const skin = pfView ? pfView.skin : getSkin();
  paintMini(document.getElementById('pfShow'), 240,
    (c) => drawCatPose(c, 112, 220, 2.75, skin, pfTick));
}

function pfLoop() {
  if (profilePanel.classList.contains('hidden')) { pfRAF = 0; return; }
  pfTick++;
  paintPfCat();
  pfRAF = requestAnimationFrame(pfLoop);
}

// ── โหมดแก้ไข ────────────────────────────────────────────────
function closeEditors() {
  document.getElementById('pfStatusEdit').classList.add('hidden');
  document.getElementById('pfNameEdit').classList.add('hidden');
  document.getElementById('pfBestPick').classList.add('hidden');
}

function setEditing(on) {
  pfPop.classList.toggle('editing', on && Boolean(pfView?.mine));
  if (!on) closeEditors();
  paintActionButton();
}

function openStatusEditor() {
  if (!pfPop.classList.contains('editing')) return;
  closeEditors();
  document.getElementById('pfStatusEdit').classList.remove('hidden');
  const input = document.getElementById('pfStatusInput');
  input.value = loadStatus();
  refreshCount();
  input.focus();
}

function refreshCount() {
  const input = document.getElementById('pfStatusInput');
  let n = statusWords(input.value);
  // พิมพ์/วางเกิน 20 คำ = ตัดส่วนเกินทิ้งทันที ผู้เล่นเห็นเลยว่าเกินตรงไหน
  if (n > STATUS_WORDS) {
    input.value = cleanStatus(input.value);
    n = statusWords(input.value);
  }
  const el = document.getElementById('pfCount');
  el.textContent = n + ' / ' + STATUS_WORDS + ' คำ';
  el.classList.toggle('full', n >= STATUS_WORDS);
}

function openNameEditor() {
  closeEditors();
  document.getElementById('pfNameEdit').classList.remove('hidden');
  const input = document.getElementById('pfNameInput');
  input.value = localName();
  input.focus();
  input.select();
}

function openBestPicker() {
  closeEditors();
  const box = document.getElementById('pfBestPick');
  const pick = loadPref(PF_BEST_KEY, 'auto');
  const rows = [{ id: 'auto', name: 'สถิติสูงสุดทุกด่าน', score: bestRun().top }]
    .concat(STAGES.map((s) => ({ id: s.id, name: s.name, score: loadBest(s.id) })));
  box.innerHTML = '';
  for (const r of rows) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = r.id === pick ? 'on' : '';
    b.innerHTML = '<span></span><b></b>';
    b.querySelector('span').textContent = r.name;
    b.querySelector('b').textContent = r.score > 0 ? r.score.toLocaleString('en-US') : '—';
    b.addEventListener('click', () => {
      sfx.fish();
      savePref(PF_BEST_KEY, r.id);
      box.classList.add('hidden');
      showOwnProfile();
    });
    box.appendChild(b);
  }
  box.classList.remove('hidden');
}

// ── ข้อมูลเพื่อน ─────────────────────────────────────────────
async function loadMyCode() {
  // รหัสเดียวกันโชว์สองที่: หน้าโปรไฟล์ กับหน้าคำขอเป็นเพื่อน
  const put = (text) => {
    document.getElementById('pfCodeText').textContent = text;
    document.getElementById('frMyCode').textContent = text;
  };
  if (pfMyCode) { put(pfMyCode); return; }
  if (!cloudReady || !userId()) { put('— — —'); return; }
  const r = await fetchMyFriendCode();
  if (r.ok) {
    pfMyCode = r.code;
    put(r.code);
  } else {
    put('— — —');
  }
}

/** เปิดโปรไฟล์ของเรา + ส่งภาพรวมขึ้นคลาวด์ให้คนอื่นเห็นของล่าสุด */
function showOwnProfile() {
  const p = ownProfile();
  renderProfile(p);
  loadMyCode();
  publishProfile(profileSnapshot(p));
}

async function showRemoteProfile(row) {
  setEditing(false);
  const p = remoteProfile(row);
  renderProfile(p);
  document.getElementById('pfBody').scrollTop = 0;
  const f = await frApi.friendStatus(p.id);
  if (pfView === p && f.ok) {
    p.rel = f.status;
    paintActionButton();
  }
}

async function lookupProfile(code) {
  const msg = document.getElementById('pfLookupMsg');
  if (code.length < FRIEND_CODE_LEN) { msg.textContent = reasonText('short'); return; }
  if (pfMyCode && code === pfMyCode) { msg.textContent = reasonText('self'); return; }
  msg.textContent = 'กำลังค้นหา…';
  const r = await fetchProfileByCode(code);
  if (!r.ok) { msg.textContent = reasonText(r.reason); return; }
  if (r.profile.id === userId()) { msg.textContent = reasonText('self'); return; }
  msg.textContent = '';
  document.getElementById('pfLookup').classList.add('hidden');
  sfx.fish();
  showRemoteProfile(r.profile);
}

async function addViewedFriend() {
  const p = pfView;
  if (!p || p.mine || p.rel === 'friends' || p.rel === 'sent' || p.adding) return;
  p.adding = true;
  paintActionButton();
  // เขาขอเรามาก่อน = ตอบรับ / ยังไม่มีใครขอ = ส่งคำขอ (ต้องรอเขาตอบรับก่อนถึงเป็นเพื่อน)
  const r = p.rel === 'received'
    ? await frApi.respondFriendRequest(p.id, true)
    : await frApi.sendFriendRequest(p.id);
  p.adding = false;
  if (r.ok) {
    const now = r.result === 'accepted' || r.result === 'friends';
    p.rel = now ? 'friends' : 'sent';
    if (now) {
      sfx.bonus();
      pfSay(`${p.name} เป็นเพื่อนกับเราแล้ว`);
    } else {
      pfSay(`ส่งคำขอเป็นเพื่อนถึง ${p.name} แล้ว`);
    }
    refreshFriendsBadge();
  } else {
    pfSay(reasonText(r.reason), true);
  }
  if (pfView === p) paintActionButton();
}

function showProfile(on) {
  profilePanel.classList.toggle('hidden', !on);
  startPanel.classList.toggle('hidden', on);
  if (!on) return;
  pfFrom = null;
  setEditing(false);
  document.getElementById('pfLookup').classList.add('hidden');
  document.getElementById('pfBody').scrollTop = 0;
  pfSay('');
  showOwnProfile();
  if (!pfRAF) pfRAF = requestAnimationFrame(pfLoop);
}

document.getElementById('profileCard').addEventListener('click', () => {
  unlockAudio(); startMusic();
  sfx.fish();
  showProfile(true);
});

// ปิด: ถ้ากำลังส่องคนอื่นอยู่ กลับมาโปรไฟล์ของเราก่อน ไม่ใช่เด้งออกไปล็อบบี้ทันที
document.getElementById('pfBack').addEventListener('click', () => {
  sfx.fish();
  if (pfFrom === 'friends') {
    pfFrom = null;
    profilePanel.classList.add('hidden');
    friendsPanel.classList.remove('hidden');
    loadFriendsData();        // อาจเพิ่ง "ตอบรับเพื่อน" จากในโปรไฟล์ รายการต้องตามทัน
    return;
  }
  if (pfFrom === 'rank') {
    pfFrom = null;
    profilePanel.classList.add('hidden');
    rankPanel.classList.remove('hidden');
    return;
  }
  if (pfView && !pfView.mine) {
    showOwnProfile();
    return;
  }
  showProfile(false);
});

document.getElementById('pfAction').addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  if (!pfView) return;
  if (pfView.mine) setEditing(!pfPop.classList.contains('editing'));
  else addViewedFriend();
});

document.getElementById('pfEdit').addEventListener('click', () => { sfx.fish(); openStatusEditor(); });
document.getElementById('pfPenStatus').addEventListener('click', () => { sfx.fish(); openStatusEditor(); });
document.getElementById('pfCancel').addEventListener('click', () => {
  sfx.fish();
  document.getElementById('pfStatusEdit').classList.add('hidden');
});
document.getElementById('pfSave').addEventListener('click', () => {
  sfx.fish();
  saveStatus(document.getElementById('pfStatusInput').value);
  document.getElementById('pfStatusEdit').classList.add('hidden');
  showOwnProfile();
});
document.getElementById('pfStatusInput').addEventListener('input', refreshCount);

document.getElementById('pfPenName').addEventListener('click', () => { sfx.fish(); openNameEditor(); });
document.getElementById('pfNameCancel').addEventListener('click', () => {
  sfx.fish();
  document.getElementById('pfNameEdit').classList.add('hidden');
});
document.getElementById('pfNameEdit').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = cleanName(document.getElementById('pfNameInput').value);
  if (!name) return;
  sfx.fish();
  const r = await storeName(name);
  if (!r.ok) {
    await warnName(name, r.reason);
    document.getElementById('pfNameInput').focus();
    return;
  }
  document.getElementById('pfNameEdit').classList.add('hidden');
  refreshProfile();           // การ์ดบัญชีในล็อบบี้ต้องได้ชื่อใหม่ด้วย
  showOwnProfile();
});

document.getElementById('pfPenBest').addEventListener('click', () => {
  sfx.fish();
  const box = document.getElementById('pfBestPick');
  if (box.classList.contains('hidden')) openBestPicker();
  else box.classList.add('hidden');
});

document.getElementById('pfCode').addEventListener('click', async () => {
  sfx.fish();
  if (!pfMyCode) { pfSay(reasonText(cloudReady && userId() ? 'schema' : 'offline'), true); return; }
  const btn = document.getElementById('pfCode');
  if (await copyText(pfMyCode)) {
    pfSay('คัดลอกรหัสแมวน้อยแล้ว');
    btn.classList.add('done');
    setTimeout(() => btn.classList.remove('done'), 1600);
  } else {
    // คัดลอกไม่ได้ทั้งสองทาง — โชว์รหัสให้จดเองแทน
    pfSay('รหัสแมวน้อยของเรา: ' + pfMyCode);
  }
});

/**
 * คัดลอกข้อความลงคลิปบอร์ด — คืน true ถ้าสำเร็จ
 *
 * navigator.clipboard ใช้ได้เฉพาะหน้าเว็บที่ปลอดภัย (https / localhost)
 * เปิดเกมผ่านลิงก์ในวง Wi-Fi (http://192.168...) บนมือถือ ตัวนี้จะไม่มีให้ใช้เลย
 * จึงถอยไปใช้วิธีเก่า: กล่องข้อความซ่อน + execCommand('copy') ซึ่งยังใช้ได้ทุกเบราว์เซอร์
 */
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* ลองวิธีเก่าต่อ */ }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);   // iOS ไม่เลือกด้วย select() อย่างเดียว
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

document.getElementById('pfFind').addEventListener('click', () => {
  sfx.fish();
  closeEditors();
  const input = document.getElementById('pfLookupInput');
  input.value = '';
  document.getElementById('pfLookupMsg').textContent =
    cloudReady && userId() ? '' : reasonText('offline');
  document.getElementById('pfLookup').classList.remove('hidden');
  input.focus();
});
document.getElementById('pfLookupInput').addEventListener('input', (e) => {
  const v = normalizeCode(e.target.value);
  if (e.target.value !== v) e.target.value = v;
});
document.getElementById('pfLookupCancel').addEventListener('click', () => {
  sfx.fish();
  document.getElementById('pfLookup').classList.add('hidden');
});
document.getElementById('pfLookupForm').addEventListener('submit', (e) => {
  e.preventDefault();
  lookupProfile(normalizeCode(document.getElementById('pfLookupInput').value));
});

// มือถือ: ลูกศรใต้หน้าแรก เลื่อนไปหน้าล่าง
document.getElementById('pfMore').addEventListener('click', () => {
  const body = document.getElementById('pfBody');
  body.scrollTo({ top: body.clientHeight, behavior: 'smooth' });
});

// เน็ตหลุด/กลับมาระหว่างเปิดหน้าอยู่ ป้ายของเราต้องเปลี่ยนตามทันที
for (const ev of ['online', 'offline']) {
  window.addEventListener(ev, () => {
    if (!profilePanel.classList.contains('hidden') && pfView?.mine) showOwnProfile();
  });
}

// เริ่มส่งสถานะออนไลน์ (เช็คเองว่าเข้าสู่ระบบหรือยัง)
startPresence();

// ══ เพื่อนแมว ═══════════════════════════════════════════════════
//
// ปุ่มหัวแมวบนแถบขวาบน → แผงสองแท็บ: รายชื่อเพื่อน / คำขอเป็นเพื่อน (+ ช่องค้นหา)
// ข้อมูลทั้งหน้ามาจากคลาวด์ก้อนเดียว (frData) โหลดใหม่ทุกครั้งที่เปิดหรือหลังกดอะไรสำเร็จ
// แล้ววาดทั้งสองแท็บจากก้อนนั้น — สถานะปุ่มในผลค้นหาจึงตรงกับรายการคำขอเสมอ
// โดยไม่ต้องถามเซิร์ฟเวอร์ทีละคน

const friendsPanel = document.getElementById('friendsPanel');
let frData = null;          // { friends, incoming, outgoing } | { reason } | null = กำลังโหลด
let frGen = 0;              // กันผลโหลดรอบเก่ามาวาดทับรอบใหม่
let frFound = null;         // ผลค้นหาล่าสุด { query, players } | null = ยังไม่ได้ค้น
const frBusy = new Set();   // id ที่กำลังรอเซิร์ฟเวอร์ตอบ — ปุ่มของแถวนั้นกดซ้ำไม่ได้

function frSay(text, bad = false) {
  setMsg(document.getElementById('frMsg'), text, bad);
}

/** ป้ายแดงบนปุ่มหัวแมว + ตัวเลขบนแท็บคำขอ (กฎเดียวกับป้ายจดหมาย: เกิน 9 = 9+) */
function setFriendsBadge(n) {
  const dot = document.getElementById('friendsDot');
  dot.textContent = !n ? '' : n > 9 ? '9+' : n;
  dot.classList.toggle('hidden', !n);
  const tab = document.getElementById('frReqCount');
  tab.textContent = n ? String(n) : '';
  tab.classList.toggle('hidden', !n);
}

async function refreshFriendsBadge() {
  const r = await frApi.countFriendRequests();
  if (r.ok) setFriendsBadge(r.count);
}

async function loadFriendsData() {
  const gen = ++frGen;
  const [f, q] = await Promise.all([frApi.fetchFriends(), frApi.fetchFriendRequests()]);
  if (gen !== frGen) return;
  frData = !f.ok ? { reason: f.reason }
    : !q.ok ? { reason: q.reason }
      : { friends: f.friends, incoming: q.incoming, outgoing: q.outgoing };
  if (frData.incoming) setFriendsBadge(frData.incoming.length);
  paintFriends();
}

/** ความสัมพันธ์กับคนนี้ อ่านจากก้อนข้อมูลที่โหลดไว้: friends / received / sent / none */
function relationOf(id) {
  if (!frData || !frData.friends) return 'none';
  if (frData.friends.some((r) => r.id === id)) return 'friends';
  if (frData.incoming.some((r) => r.id === id)) return 'received';
  if (frData.outgoing.some((r) => r.id === id)) return 'sent';
  return 'none';
}

function frHead(list, text) {
  const h = document.createElement('p');
  h.className = 'fr-head';
  h.textContent = text;
  list.appendChild(h);
}

/**
 * แถวผู้เล่นหนึ่งคน — หน้าน้อง ชื่อ เลเวล สถานะออนไลน์ + ปุ่มท้ายแถว
 * แตะตัวแถว (นอกปุ่ม) = ส่องโปรไฟล์
 */
function friendRow(list, row, { sub, acts = [] } = {}) {
  const p = remoteProfile(row);
  const item = document.createElement('div');
  item.className = 'mail-item fr-row tap';
  item.setAttribute('role', 'button');
  item.tabIndex = 0;

  const face = document.createElement('canvas');
  face.className = 'fr-face';
  paintMini(face, 96, (c) => drawCatFace(c, 48, 56, 2.5, p.skin));

  const main = document.createElement('span');
  main.className = 'mail-main';
  const title = document.createElement('b');
  title.className = 'mail-title';
  title.textContent = p.name;
  const small = document.createElement('small');
  small.className = 'mail-sub fr-sub' + (!sub && p.online.on ? ' on' : '');
  small.textContent = sub || `Lv ${p.level} · ${p.online.text}`;
  main.append(title, small);

  const box = document.createElement('span');
  box.className = 'fr-acts';
  for (const a of acts) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn tiny' + (a.ghost ? ' ghost' : '');
    b.textContent = a.text;
    b.disabled = Boolean(a.disabled) || frBusy.has(row.id);
    if (a.run) {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        unlockAudio(); sfx.fish();
        a.run(row, p);
      });
    }
    box.appendChild(b);
  }

  item.append(face, main, box);
  const open = () => { unlockAudio(); openFriendProfile(row); };
  item.addEventListener('click', open);
  item.addEventListener('keydown', (e) => {
    if (e.target === item && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); }
  });
  list.appendChild(item);
}

/** ปุ่มท้ายแถวตามความสัมพันธ์ — ใช้กับผลค้นหา */
function relationActs(id) {
  switch (relationOf(id)) {
    case 'friends': return [{ text: 'เป็นเพื่อนแล้ว', disabled: true }];
    case 'sent': return [{ text: 'ยกเลิกคำขอ', ghost: true, run: frCancel }];
    case 'received': return [{ text: 'ตอบรับ', run: (r, p) => frRespond(r, p, true) }];
    default: return [{ text: 'เพิ่มเพื่อน', run: frSend }];
  }
}

function paintFriends() {
  const d = frData;
  document.getElementById('frCount').textContent = d && d.friends && d.friends.length ? String(d.friends.length) : '';

  // ── แท็บรายชื่อเพื่อน ──
  const list = document.getElementById('frListPage');
  list.innerHTML = '';
  if (!d) emptyNote(list, 'กำลังโหลด…');
  else if (d.reason) emptyNote(list, reasonText(d.reason));
  else if (!d.friends.length) emptyNote(list, 'ยังไม่มีเพื่อนแมว ไปที่แท็บ “คำขอเป็นเพื่อน” แล้วค้นหาเพื่อนได้เลย');
  else {
    for (const row of d.friends) {
      friendRow(list, row, { acts: [{ text: 'ลบเพื่อน', ghost: true, run: frRemove }] });
    }
  }
  markScrollable(list);

  // ── แท็บคำขอ ──
  const req = document.getElementById('frReqList');
  req.innerHTML = '';
  if (frFound) {
    frHead(req, 'ผลการค้นหา');
    if (!frFound.players.length) emptyNote(req, `ไม่พบผู้เล่นที่ตรงกับ “${frFound.query}”`);
    for (const row of frFound.players) friendRow(req, row, { acts: relationActs(row.id) });
  }
  if (!d) emptyNote(req, 'กำลังโหลด…');
  else if (d.reason) emptyNote(req, reasonText(d.reason));
  else {
    frHead(req, 'คำขอที่ส่งมาหาเรา');
    if (!d.incoming.length) emptyNote(req, 'ยังไม่มีคำขอเป็นเพื่อนใหม่');
    for (const row of d.incoming) {
      friendRow(req, row, {
        acts: [
          { text: 'ตอบรับ', run: (r, p) => frRespond(r, p, true) },
          { text: 'ปฏิเสธ', ghost: true, run: (r, p) => frRespond(r, p, false) },
        ],
      });
    }
    if (d.outgoing.length) {
      frHead(req, 'คำขอที่เราส่งไป');
      for (const row of d.outgoing) {
        friendRow(req, row, { sub: 'รอตอบรับ', acts: [{ text: 'ยกเลิกคำขอ', ghost: true, run: frCancel }] });
      }
    }
  }
  markScrollable(req);
}

function setFrTab(tab) {
  const onList = tab === 'list';
  document.getElementById('frTabList').classList.toggle('on', onList);
  document.getElementById('frTabReq').classList.toggle('on', !onList);
  document.getElementById('frTabList').setAttribute('aria-selected', String(onList));
  document.getElementById('frTabReq').setAttribute('aria-selected', String(!onList));
  document.getElementById('frListPage').classList.toggle('hidden', !onList);
  document.getElementById('frReqPage').classList.toggle('hidden', onList);
}

/** ครอบงานที่ต้องรอเซิร์ฟเวอร์: ล็อกปุ่มแถวนั้น → ทำ → บอกผล → โหลดข้อมูลใหม่ */
async function frDo(row, work) {
  if (frBusy.has(row.id)) return;
  frBusy.add(row.id);
  paintFriends();
  let r;
  try { r = await work(); } finally { frBusy.delete(row.id); }
  if (!r.ok) {
    sfx.shieldBreak();
    frSay(reasonText(r.reason), true);
    paintFriends();
    return r;
  }
  await loadFriendsData();
  return r;
}

async function frSend(row, p) {
  const r = await frDo(row, () => frApi.sendFriendRequest(row.id));
  if (!r?.ok) return;
  if (r.result === 'accepted' || r.result === 'friends') {
    sfx.bonus();
    frSay(`${p.name} เป็นเพื่อนกับเราแล้ว`);
  } else {
    frSay(`ส่งคำขอเป็นเพื่อนถึง ${p.name} แล้ว`);
  }
}

async function frRespond(row, p, accept) {
  const r = await frDo(row, () => frApi.respondFriendRequest(row.id, accept));
  if (!r?.ok) return;
  if (accept) {
    sfx.bonus();
    frSay(`${p.name} เป็นเพื่อนกับเราแล้ว`);
  } else {
    frSay(`ปฏิเสธคำขอของ ${p.name} แล้ว`);
  }
}

async function frCancel(row, p) {
  const r = await frDo(row, () => frApi.cancelFriendRequest(row.id));
  if (r?.ok) frSay(`ยกเลิกคำขอถึง ${p.name} แล้ว`);
}

async function frRemove(row, p) {
  const ok = await confirmBox({
    title: 'ลบเพื่อน',
    body: `ลบ “${p.name}” ออกจากเพื่อนแมวใช่ไหม ถ้าอยากเป็นเพื่อนกันอีกต้องส่งคำขอใหม่`,
    okText: 'ลบเพื่อน',
  });
  if (!ok) return;
  const r = await frDo(row, () => frApi.removeFriend(row.id));
  if (r?.ok) frSay(`ลบ ${p.name} ออกจากเพื่อนแล้ว`);
}

async function frSearchNow() {
  const input = document.getElementById('frSearchInput');
  const query = input.value.trim();
  if (!query) { input.focus(); return; }
  // พิมพ์เป็นรหัส (ตัวอักษร/ตัวเลข 8 ตัว มีช่องว่างหรือขีดคั่นได้) ค้นทั้งรหัสและชื่อ
  // ชื่อที่บังเอิญยาว 8 ตัวจึงยังเจอด้วย ไม่ถูกตีความเป็นรหัสอย่างเดียว
  const code = normalizeCode(query);
  const asCode = code.length === FRIEND_CODE_LEN && /^[A-Za-z0-9\s-]+$/.test(query) ? code : '';
  if (asCode && pfMyCode && asCode === pfMyCode) { frSay(reasonText('self'), true); return; }
  const btn = document.getElementById('frSearchGo');
  btn.disabled = true;
  frSay('กำลังค้นหา…');
  const r = await frApi.searchPlayers(query, asCode);
  btn.disabled = false;
  if (!r.ok) { frSay(reasonText(r.reason), true); return; }
  frSay('');
  frFound = { query, players: r.players };
  paintFriends();
  document.getElementById('frReqList').scrollTop = 0;
}

function showFriends(on, tab) {
  if (!on) {
    friendsPanel.classList.add('hidden');
    startPanel.classList.remove('hidden');
    return;
  }
  showPanel(friendsPanel);
  frSay('');
  setFrTab(tab || 'list');
  paintFriends();
  loadMyCode();
  // บัตรของเรา: หน้าน้องตัวที่ใช้อยู่ (สกิน + ชุด) — แบบเดียวกับหน้าเพื่อนในการ์ดเพื่อน
  paintMini(document.getElementById('frMeFace'), 96, (c) => drawCatFace(c, 48, 56, 2.5, getSkin()));
  loadFriendsData();
}

/**
 * ส่องโปรไฟล์จากหน้าอันดับ — ปิดโปรไฟล์แล้วกลับมาที่หน้าอันดับ
 * แตะแถวของตัวเอง = เปิดโปรไฟล์ของเรา (แก้ไขได้) ไม่ใช่ส่องตัวเองแบบคนอื่น
 */
function openRankProfile(row) {
  sfx.fish();
  rankPanel.classList.add('hidden');
  profilePanel.classList.remove('hidden');
  pfFrom = 'rank';
  setEditing(false);
  document.getElementById('pfLookup').classList.add('hidden');
  pfSay('');
  if (row.id === userId()) showOwnProfile();
  else showRemoteProfile(row);
  if (!pfRAF) pfRAF = requestAnimationFrame(pfLoop);
}

/** ส่องโปรไฟล์จากหน้าเพื่อน — ปิดโปรไฟล์แล้วกลับมาที่หน้าเพื่อน ไม่ใช่ล็อบบี้ */
function openFriendProfile(row) {
  sfx.fish();
  friendsPanel.classList.add('hidden');
  profilePanel.classList.remove('hidden');
  pfFrom = 'friends';
  setEditing(false);
  document.getElementById('pfLookup').classList.add('hidden');
  pfSay('');
  showRemoteProfile(row);
  if (!pfRAF) pfRAF = requestAnimationFrame(pfLoop);
}

document.getElementById('btnFriends').addEventListener('click', () => {
  unlockAudio(); startMusic();
  sfx.fish();
  // มีคำขอค้างอยู่ = เปิดที่แท็บคำขอเลย เพราะป้ายแดงคือสิ่งที่ทำให้กดเข้ามา
  const waiting = document.getElementById('friendsDot').textContent !== '';
  frFound = null;
  document.getElementById('frSearchInput').value = '';
  showFriends(true, waiting ? 'req' : 'list');
});
document.getElementById('friendsBack').addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  showFriends(false);
});
document.getElementById('frTabList').addEventListener('click', () => { sfx.fish(); setFrTab('list'); });
document.getElementById('frTabReq').addEventListener('click', () => { sfx.fish(); setFrTab('req'); });
document.getElementById('frSearch').addEventListener('submit', (e) => {
  e.preventDefault();
  unlockAudio(); sfx.fish();
  frSearchNow();
});
document.getElementById('frCopy').addEventListener('click', async () => {
  sfx.fish();
  if (!pfMyCode) { frSay(reasonText(cloudReady && userId() ? 'schema' : 'offline'), true); return; }
  frSay(await copyText(pfMyCode) ? 'คัดลอกรหัสแมวน้อยแล้ว' : 'รหัสแมวน้อยของเรา: ' + pfMyCode);
});

// ป้ายคำขอใหม่: เช็คตอนเปิดเกม (รอเข้าสู่ระบบเสร็จก่อน) ทุกสองนาที และตอนกลับมาที่แท็บ
setTimeout(refreshFriendsBadge, 4500);
setInterval(() => { if (!document.hidden) refreshFriendsBadge(); }, 2 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshFriendsBadge(); });

// ช่องทดสอบตอนพัฒนา: เปิดโปรไฟล์คนอื่นจากข้อมูลปลอมได้โดยไม่ต้องมีเพื่อนจริงในฐานข้อมูล
if (import.meta.env.DEV) {
  window.__pf = {
    showRemoteProfile, showOwnProfile, setEditing,
    // ตั้งรหัสของเราเองโดยไม่ต้องล็อกอิน — ไว้ลองปุ่มคัดลอก
    setMyCode: (c) => { pfMyCode = c; loadMyCode(); },
    warnName,   // ลองกล่องเตือนชื่อซ้ำโดยไม่ต้องมีผู้เล่นชื่อซ้ำจริง
  };
  // หน้าเพื่อนแมวด้วยข้อมูลปลอม: __fr.mock(data) แทนที่ทางเชื่อมคลาวด์ทั้งก้อน
  window.__fr = {
    mock(api) { frApi = { ...frApi, ...api }; },
    showFriends, setFrTab, refreshFriendsBadge, loadFriendsData,
  };
}

function showQuests(on) {
  questPanel.classList.toggle('hidden', !on);
  startPanel.classList.toggle('hidden', on);
  if (on) {
    setMsg(document.getElementById('questMsg'), '');
    refreshGold();
    buildQuestList();
  }
}

document.getElementById('btnQuests').addEventListener('click', () => {
  unlockAudio(); startMusic();
  sfx.fish();
  showQuests(true);
});
document.getElementById('questBack').addEventListener('click', () => showQuests(false));

// ── หน้ารายละเอียดชุด ──────────────────────────────────────
//
// น้องแมวใส่ชุดนี้ยืนอยู่จริงและขยับ — หายใจกับกะพริบตาเท่านั้น
// ไม่เอาคิวท่าว่างแบบหน้าแรก (นั่ง เลียขน) เพราะที่นี่คนมาดู "ชุด"
// ท่าที่ตัวหมุนไปมาจะบังเสื้อผ้าซึ่งเป็นสิ่งเดียวที่ต้องดูให้ชัด
// drawCatPose() ที่ไม่ส่ง idle เข้าไปให้พอดีแบบนั้นอยู่แล้ว

const odPanel = document.getElementById('odPanel');
let odCurrent = null;
let odTick = 0;
let odRAF = 0;

function paintOdCat() {
  const o = outfitById(odCurrent);
  if (!o) return;
  const s = getSkin();
  paintMini(document.getElementById('odCat'), 200,
    (c) => drawCatPose(c, 100, 176, 3, { ...s, outfit: o }, odTick));
}

function odLoop() {
  odTick++;
  paintOdCat();
  odRAF = requestAnimationFrame(odLoop);
}

// วาดเฉพาะตอนแผงเปิด ปิดแล้วหยุดทันที ไม่แย่งเฟรมกับตัวเกม
function stopOdCat() {
  cancelAnimationFrame(odRAF);
  odRAF = 0;
}

/**
 * รายการ "ของที่ได้จากชุดนี้" — อ่านจากตัวชุดจริง ไม่ได้เขียนข้อความค้างไว้ทีละชุด
 *
 * ชุดระดับสูงทุกตัวมีครบสามอย่าง (rain / bonus / trail) จึงได้สามบรรทัดเสมอ
 * ชุดระดับกลางไม่มีเอฟเฟกต์อะไรเลย เหลือแค่ตัวชุดกับโบนัสคะแนน = สองบรรทัด
 * เพิ่มเอฟเฟกต์ใหม่ให้ชุดไหนในอนาคต บรรทัดก็โผล่มาเองโดยไม่ต้องมาแก้ที่นี่
 */
function outfitPerks(o) {
  const list = [];
  if (o.rain || o.rainShape) list.push('เอฟเฟคเม็ดโปรยประจำชุด');
  if (o.bonus) list.push('ฉากโบนัสไทม์ประจำชุด');
  if (o.trail) list.push('เอฟเฟคประกายโปรยตามตัว');
  // ชุดที่ไม่มีเอฟเฟกต์ ต้องมีบรรทัดแรกเป็นของตัวเอง
  // ห้ามใช้ o.note ซ้ำ เพราะมันไปเป็นป้ายชื่อเล่นด้านบนอยู่แล้ว อ่านแล้วเหมือนพูดซ้ำ
  if (!list.length && o.rarity) list.push('ชุดพิเศษที่ลุ้นได้จากตู้กาช่า');
  if (o.foodBonus > 0) list.push('ค่าขนมเปียกเพิ่มขึ้น');
  // ชุดพื้นฐานคืนรายการว่าง ตั้งใจ — มันไม่มีอะไรให้ลิสต์ และย่อหน้าข้างบน
  // ก็บอกไปแล้วว่า "ชุดติดตัวมาแต่แรก ใส่ได้ตลอดโดยไม่ต้องสุ่ม"
  // ใส่บรรทัดซ้ำลงไปอีกจะกลายเป็นข้อความลอย ๆ ที่ไม่มีหัวแมวนำหน้าด้วย
  return list;
}

function paintOutfitDetail() {
  const o = outfitById(odCurrent);
  if (!o) return;
  const got = isOwned(o.id);
  const on = got && o.id === getSkin().outfit.id;
  const tier = o.rarity ? RARITY[o.rarity] : null;
  const art = TIER_ART[o.rarity];

  document.getElementById('odName').textContent = o.name;

  // ป้ายระดับเป็นรูปจริง ชุดพื้นฐานไม่มีระดับจึงไม่มีป้าย (ซ่อนทั้งอัน)
  const sign = document.getElementById('odSign');
  sign.hidden = !art;
  if (art) {
    sign.src = import.meta.env.BASE_URL + art.sign;
    sign.alt = tier.name;
  }

  // ป้ายชื่อเล่นของชุด — ชื่อชุดจริงอยู่บนหัวเรื่องแล้ว ตรงนี้จึงเป็นคำบรรยายสั้น ๆ
  const tag = document.getElementById('odTag');
  tag.textContent = o.note || (tier ? tier.name : 'ชุดพื้นฐาน');

  const perks = document.getElementById('odPerks');
  perks.innerHTML = '';
  for (const text of outfitPerks(o)) {
    const li = document.createElement('li');
    if (art) {
      const icon = document.createElement('img');
      icon.src = import.meta.env.BASE_URL + art.cat;
      icon.alt = '';
      li.appendChild(icon);
    }
    const span = document.createElement('span');
    span.textContent = text;
    li.appendChild(span);
    perks.appendChild(li);
  }

  // บอกทั้ง "ต่อชิ้นเท่าไหร่" และ "แปลว่าอะไรเมื่อเทียบกับของที่เก็บได้จริง"
  //
  // ตั้งใจเทียบกับค่าปลาซึ่งเป็นของกินที่เจอบ่อยที่สุด แทนที่จะเดาว่าตาหนึ่ง
  // เก็บได้กี่ชิ้น — ตัวเลขนั้นแกว่งตามฝีมือคนเล่นกับด่านที่เลือก เขียนตายตัวลงไป
  // ก็เป็นได้แค่ตัวเลขลอย ๆ ที่ไม่มีอะไรรับประกัน
  // ส่วนค่าปลาอ่านจาก SCORING ตรง ๆ แก้สมดุลที่ config แล้วบรรทัดนี้เปลี่ยนตามเอง
  const bonus = document.getElementById('odBonus');
  const sub = document.getElementById('odSub');
  if (o.foodBonus > 0) {
    const base = SCORING.pointsPerFish;
    bonus.textContent = '+' + o.foodBonus.toLocaleString('en-US') + ' คะแนน / ของกิน 1 ชิ้น';
    sub.textContent = 'ปลา 1 ตัวปกติได้ ' + base.toLocaleString('en-US')
      + ' คะแนน ใส่ชุดนี้เป็น ' + (base + o.foodBonus).toLocaleString('en-US')
      + ' (+' + Math.round((o.foodBonus / base) * 100) + '%) และบวกให้ของกินทุกชนิด';
  } else {
    bonus.textContent = 'ไม่มีโบนัสคะแนน';
    sub.textContent = 'ชุดติดตัวมาแต่แรก ใส่ได้ตลอดโดยไม่ต้องสุ่ม';
  }

  odPanel.classList.toggle('locked', !got);

  // ยังไม่มีชุดนี้ = ปุ่มไม่ได้ตายแล้วบอกว่า "ยังไม่มีชุดนี้" เฉย ๆ อีกต่อไป
  //
  // การบอกว่ากดไม่ได้ไม่ได้ช่วยอะไรเลย เพราะคนที่เปิดหน้านี้เห็นชุดขาวดำอยู่แล้ว
  // รู้อยู่แล้วว่ายังไม่มี สิ่งที่เขาต้องการคือ "แล้วจะได้มายังไง" ปุ่มจึงกลายเป็น
  // ทางลัดไปตู้กาช่าแทน (ดู odWear ข้างล่าง) — จุดที่ตอบคำถามนั้นได้จริง
  const wear = document.getElementById('odWear');
  wear.disabled = on;
  wear.textContent = !got ? 'ไปสุ่มกาช่ากัน!' : on ? 'กำลังใส่อยู่' : 'ใส่ชุดนี้';
  wear.classList.toggle('ghost', on);

  setMsg(document.getElementById('odMsg'),
    got ? '' : 'ชุดนี้ลุ้นได้ที่ตู้กาช่า');
  paintOdCat();
}

function openOutfitDetail(id) {
  odCurrent = id;
  odTick = 0;
  paintOutfitDetail();
  swapPanel(outfitPanel, odPanel);
  if (!odRAF) odLoop();
}

function closeOutfitDetail() {
  stopOdCat();
  swapPanel(odPanel, stashPanel);
  refreshStash();
}

document.getElementById('odBack').addEventListener('click', () => {
  unlockAudio();
  sfx.fish();
  closeOutfitDetail();
});

document.getElementById('odWear').addEventListener('click', () => {
  const o = outfitById(odCurrent);
  if (!o) return;
  unlockAudio();

  // ยังไม่มีชุดนี้: พาไปตู้กาช่าช่องสุ่มสกินเลย ไม่ใช่กดแล้วเงียบ
  // ปิดหน้ารายละเอียดเองแทนการเรียก closeOutfitDetail() เพราะอันนั้นพากลับไป
  // หน้ารายการชุด ซึ่งจะโผล่ค้างอยู่ใต้หน้าตู้กาช่าที่กำลังจะเปิด
  if (!isOwned(o.id)) {
    sfx.fish();
    stopOdCat();
    odPanel.classList.add('hidden');
    showGacha(true, 'skin');
    return;
  }

  setOutfit(o.id);
  sfx.potion();
  paintOutfitDetail();
  refreshHome();
});

// ── คลังน้อง: สลับหมวด เลือกของ และช่องพรีวิว ─────────────
//
// สองหมวดใช้กริดกับแถบกรองคนละชุด (ดูเหตุผลใน index.html) ที่นี่จึงทำแค่
// ซ่อน/โชว์ให้ถูกอัน แล้วเรียกตัวสร้างกริดเดิมของหมวดนั้นตามปกติ

let stashTab = 'skin';                         // หมวดที่เปิดอยู่
const stashSel = { skin: null, outfit: null, treasure: null };   // ของที่เลือกไว้ในแต่ละหมวด

// หัวเรื่อง / แถบกรอง / กริด ของแต่ละหมวด — สลับหมวดคือซ่อนทุกอันแล้วโชว์ของหมวดนั้น
const STASH_TABS = {
  skin: { title: 'เลือกแมวน้อย', tab: 'tabStashSkin', filter: 'skinFilter', grid: 'skinStashGrid' },
  outfit: { title: 'เลือกชุด', tab: 'tabStashOutfit', filter: 'outfitFilter', grid: 'outfitGrid' },
  treasure: { title: 'สมบัติ', tab: 'tabStashTreasure', filter: 'treasureFilter', grid: 'treasureGrid' },
};

function showStash(on, tab = stashTab) {
  stashPanel.classList.toggle('hidden', !on);
  startPanel.classList.toggle('hidden', on);
  if (on) setStashTab(tab);
}

// ชื่อเดิมสองตัวนี้ยังมีที่เรียกอยู่หลายจุด เก็บไว้เป็นทางเข้าแบบระบุหมวด
function showOutfits(on) { showStash(on, 'outfit'); }
function showTreasures(on) { showStash(on, 'treasure'); }

function setStashTab(tab) {
  stashTab = tab;

  for (const [key, t] of Object.entries(STASH_TABS)) {
    const on = key === tab;
    document.getElementById(t.tab).classList.toggle('on', on);
    document.getElementById(t.filter).classList.toggle('hidden', !on);
    document.getElementById(t.grid).classList.toggle('hidden', !on);
  }
  document.getElementById('stashTitle').textContent = STASH_TABS[tab].title;
  paintStashCount(tab);
  setMsg(document.getElementById('outfitMsg'), '');

  refreshStash();
}

/**
 * ป้าย "มีแล้วกี่ชิ้นจากทั้งหมด" ข้างหัวเรื่อง — ท่าเดียวกับหน้าพรสวรรค์
 *
 * ตอบคำถามที่คนเปิดคลังมาถามก่อนเสมอว่า "เก็บไปได้เท่าไหร่แล้ว"
 * ซึ่งเดิมต้องนับการ์ดในกริดเอาเอง และนับไม่ได้เลยถ้ากริดยาวจนต้องเลื่อน
 */
function paintStashCount(tab) {
  const got = tab === 'skin' ? SKINS.filter((x) => ownsSkin(x.id)).length
    : tab === 'outfit' ? OUTFITS.filter((o) => isOwned(o.id)).length
    : TREASURES.filter((t) => ownsTreasure(t.id)).length;
  const all = tab === 'skin' ? SKINS.length : tab === 'outfit' ? OUTFITS.length : TREASURES.length;
  document.getElementById('stashGot').textContent = got;
  document.getElementById('stashAll').textContent = all;
}

/** สร้างกริดของหมวดที่เปิดอยู่ใหม่ แล้ววาดช่องพรีวิวให้ตรงกัน */
function refreshStash() {
  // ต้องรู้ว่าเลือกชิ้นไหนอยู่ "ก่อน" สร้างกริด เพราะตัวสร้างการ์ดเป็นคนติดคลาส
  // .sel ให้ใบที่ถูกเลือก ถ้าปล่อยให้ไปตั้งค่าทีหลังในช่องพรีวิว รอบแรกที่เปิดหน้ามา
  // จะไม่มีการ์ดใบไหนถูกไฮไลต์เลย ทั้งที่ช่องซ้ายโชว์ของอยู่
  if (!stashSel[stashTab]) stashSel[stashTab] = stashDefault(stashTab);
  if (stashTab === 'skin') buildSkinStashGrid();
  else if (stashTab === 'outfit') buildOutfitGrid();
  else buildTreasureGrid();
  paintStashCount(stashTab);
  paintStashShow();
}

/**
 * ของที่ควรถูกเลือกไว้ตอนเปิดหน้ามาครั้งแรก
 *
 * เลือก "ของที่ใส่อยู่ตอนนี้" เป็นค่าเริ่มต้น ไม่ใช่ชิ้นแรกของรายการ
 * เพราะคำถามแรกที่คนเปิดคลังมาถามคือ "ตอนนี้ใส่อะไรอยู่" ไม่ใช่ "มีอะไรบ้าง"
 */
function stashDefault(tab) {
  if (tab === 'skin') return getSkin().id;
  if (tab === 'outfit') return getSkin().outfit.id;
  const eq = getEquipped().filter(Boolean);
  return eq[0] || TREASURES[0].id;
}

function selectStash(tab, id) {
  stashSel[tab] = id;
  // แตะดูแล้ว = ไม่ใช่ของใหม่อีกต่อไป (หมวดในคลังน้องชื่อเดียวกับหมวดใน fresh.js)
  markSeen(tab, id);
  refreshStash();
}

let stashTick = 0;
let stashRAF = 0;

/** วาดเฉพาะตัวแมวในช่องพรีวิว — เรียกทุกเฟรมตอนอยู่หมวดแมวน้อยหรือหมวดชุด */
function paintStashCat() {
  if (stashTab === 'skin') {
    // โชว์สีขนล้วน ๆ ไม่ใส่ชุด — หมวดนี้เลือก "สี" ชุดจะบังสีจนเทียบกันไม่ออก
    const x = skinById(stashSel.skin);
    paintMini(document.getElementById('stashCat'), 190,
      (c) => drawCatPose(c, 95, 167, 2.85, x, stashTick));
    return;
  }
  const o = outfitById(stashSel.outfit);
  if (!o) return;
  paintMini(document.getElementById('stashCat'), 190,
    (c) => drawCatPose(c, 95, 167, 2.85, { ...getSkin(), outfit: o }, stashTick));
}

/**
 * ลูปวาดน้องในช่องพรีวิว
 *
 * เช็คเงื่อนไขหยุดที่หัวลูปเอง แทนการไล่เรียก stop ทุกทางออกของหน้า
 * — หน้านี้ออกได้หลายทาง (ปุ่มกลับ / กดเล่น / สลับหมวด / เข้าหน้ารายละเอียด /
 * ทางลัดไปตู้กาช่า) การไล่ปิดทีละทางพลาดง่ายมากเมื่อมีทางออกใหม่เพิ่มทีหลัง
 * แล้วลูปที่ค้างอยู่จะแย่งเฟรมกับตัวเกมโดยไม่มีใครสังเกต
 */
function stashLoop() {
  if (stashPanel.classList.contains('hidden') || stashTab === 'treasure') {
    stashRAF = 0;
    return;
  }
  stashTick++;
  paintStashCat();
  stashRAF = requestAnimationFrame(stashLoop);
}

function paintStashShow() {
  const face = stashPanel.querySelector('.stash-face');
  const cat = document.getElementById('stashCat');
  const emo = document.getElementById('stashEmoji');
  const badge = document.getElementById('stashTier');
  const name = document.getElementById('stashName');
  const use = document.getElementById('stashUse');

  if (!stashSel[stashTab]) stashSel[stashTab] = stashDefault(stashTab);

  // ปุ่ม "ดูเพิ่มเติม" มีเฉพาะชุดกับสมบัติ แมวไม่มีหน้ารายละเอียด ช่องซ้ายจึงเหลือปุ่มเดียว
  document.getElementById('stashMore').hidden = stashTab === 'skin';
  // ปุ่มทองมีแค่ตอนซื้อแมว ล้างทิ้งก่อนทุกครั้ง ไม่งั้นสลับไปหมวดอื่นแล้วปุ่มยังเป็นสีทองค้าง
  use.classList.remove('buy');
  use.removeAttribute('aria-label');

  if (stashTab === 'skin') {
    const x = skinById(stashSel.skin);
    stashSel.skin = x.id;
    const got = ownsSkin(x.id);
    const on = got && x.id === getSkin().id;

    face.className = 'stash-face normal' + (got ? '' : ' locked');
    cat.classList.remove('hidden');
    emo.classList.add('hidden');
    badge.replaceChildren();
    badge.classList.add('hidden');
    paintStashCat();
    if (!stashRAF) stashLoop();

    name.textContent = x.name;
    // ตัวที่ยังไม่ได้บอกราคาบนปุ่มเลย คนจะได้รู้ก่อนกดว่ากดแล้วต้องจ่าย
    // (กดแล้วยังมีกล่องยืนยันอีกชั้น ไม่มีทางจ่ายโดยไม่ตั้งใจ)
    // ปุ่มซื้อเป็นสีทองมีเหรียญ ต่างจากปุ่มเขียวของ "เลือกสีนี้" — ดูปุ่มก็รู้ว่ากดแล้วเสียเงิน
    if (got) {
      use.textContent = on ? 'กำลังใช้อยู่' : 'เลือกสีนี้';
    } else {
      use.classList.add('buy');
      use.replaceChildren('ปลดล็อก');
      const coin = document.createElement('span');
      coin.className = 'coin';
      coin.setAttribute('aria-hidden', 'true');
      const price = document.createElement('b');
      price.textContent = x.cost.toLocaleString('en-US');
      use.append(coin, price);
      use.setAttribute('aria-label', 'ปลดล็อก ' + x.cost.toLocaleString('en-US') + ' ทอง');
    }
    use.disabled = on;
    use.classList.toggle('ghost', on);
  } else if (stashTab === 'outfit') {
    const o = outfitById(stashSel.outfit) || OUTFITS[0];
    stashSel.outfit = o.id;
    const got = isOwned(o.id);
    const on = got && o.id === getSkin().outfit.id;

    face.className = 'stash-face ' + (o.rarity || 'normal') + (got ? '' : ' locked');
    cat.classList.remove('hidden');
    emo.classList.add('hidden');
    paintStashCat();
    if (!stashRAF) stashLoop();   // เริ่มลูปถ้ายังไม่เดิน (ลูปหยุดตัวเองตอนออกจากหมวด)

    // "ขนล้วน" ไม่มีระดับ tierSign() คืน null ป้ายจึงว่างไปเลยไม่ใช่ป้ายเปล่า ๆ
    const sign = tierSign(o.rarity);
    badge.className = 'tier-badge as-sign ' + (o.rarity || '');
    badge.replaceChildren(...(sign ? [sign] : []));
    badge.classList.toggle('hidden', !sign);

    name.textContent = o.name;
    use.textContent = !got ? 'ไปสุ่มกาช่ากัน!' : on ? 'กำลังใส่อยู่' : 'ใส่ชุดนี้';
    use.disabled = on;
    use.classList.toggle('ghost', on);
  } else {
    const t = treasureById(stashSel.treasure) || TREASURES[0];
    stashSel.treasure = t.id;
    const got = ownsTreasure(t.id);

    face.className = 'stash-face ' + t.rarity + (got ? '' : ' locked');
    cat.classList.add('hidden');
    emo.classList.remove('hidden');
    emo.textContent = t.emoji;

    badge.className = 'tier-badge as-sign ' + t.rarity;
    badge.replaceChildren(tierSign(t.rarity));
    badge.classList.remove('hidden');

    name.textContent = t.name;
    use.textContent = !got ? 'ไปสุ่มกาช่ากัน!' : isEquipped(t.id) ? 'ถอดออก' : 'ติดตั้ง';
    use.disabled = false;
    use.classList.toggle('ghost', got && isEquipped(t.id));
  }
}

// ── ระบบสมบัติ ─────────────────────────────────────────────
//
// สี่หน้าต่อกันเป็นสาย: รายการ → รายละเอียด → ตีบวก / รายการ → ตู้สุ่ม
// เก็บ "มาจากหน้าไหน" ไว้ใน tFrom เพื่อให้ปุ่มกลับพากลับที่เดิมได้เสมอ
// ไม่ใช่เดาจากลำดับ ซึ่งจะพังทันทีที่มีทางเข้าหน้าเดียวกันมากกว่าหนึ่งทาง
// (หน้าติดตั้งเข้าได้จากหน้าเลือกด่าน ส่วนรายละเอียดเข้าได้จากรายการ)

const treasurePanel = stashPanel;   // ดูเหตุผลที่ตอนประกาศ stashPanel
const tDetailPanel = document.getElementById('tDetailPanel');
const upPanel = document.getElementById('upPanel');
const loadoutPanel = document.getElementById('loadoutPanel');

let tCurrent = null;   // id ของสมบัติที่กำลังดูรายละเอียด/ตีบวกอยู่
let tFrom = null;      // แผงที่เปิดหน้านี้มา

/** สลับแผงแบบจำทางกลับ — ไม่ใช้ showPanel() เพราะอันนั้นล้างที่มาทิ้ง */
function swapPanel(from, to) {
  from.classList.add('hidden');
  to.classList.remove('hidden');
}

/**
 * ตัวเลข "กี่ชิ้น/3" ที่โผล่สองที่ — ปุ่มในหน้าเลือกด่าน กับหัวหน้าติดตั้ง
 *
 * ต้องเรียกทุกครั้งที่จำนวนที่ติดตั้งเปลี่ยน ไม่ว่าจะเปลี่ยนจากหน้าไหน
 * เคยอัปเดตแค่ใน refreshHome() กับ paintSlots() แล้วพบว่าติดตั้งจากหน้ารายละเอียด
 * ตัวเลขบนปุ่มหน้าเลือกด่านค้างเป็นค่าเก่าจนกว่าจะกลับไปล็อบบี้
 */
function refreshEquipCount() {
  document.getElementById('loadoutCount').textContent =
    getEquipped().filter(Boolean).length + '/' + SLOTS;
}

/** ดาวบอกขั้นตีบวก — เต็มเท่าขั้นที่ได้ ที่เหลือเป็นดวงจาง */
function starRow(level) {
  let s = '';
  for (let i = 0; i < UPGRADE.maxLevel; i++) {
    s += `<i class="${i < level ? 'on' : ''}"></i>`;
  }
  return s;
}

function buildTreasureGrid() {
  const grid = document.getElementById('treasureGrid');
  grid.innerHTML = '';

  const list = applyFilter('treasure', TREASURES, {
    owned: (t) => ownsTreasure(t.id),
    rank: (t) => T_RANK[t.rarity],
    order: treasureOrder,
    level: (t) => treasureLevel(t.id),
  });

  if (!list.length) {
    emptyNote(grid, 'ยังไม่มีสมบัติเลย ไปสุ่มที่ตู้กาช่าก่อนนะ');
    markScrollable(grid);
    return;
  }

  for (const t of list) {
    const got = ownsTreasure(t.id);
    const lv = treasureLevel(t.id);
    const card = document.createElement('button');
    card.className = 'skin-card t-card ' + t.rarity + (got ? '' : ' locked')
      + (isEquipped(t.id) ? ' on' : '');
    // ไม่มีป้ายบอกคะแนนบนการ์ดแล้ว — หน้านี้คือ "ตู้โชว์ของที่มี" ไม่ใช่หน้าเทียบสเปก
    // ตัวเลขฤทธิ์เต็ม ๆ อยู่ในหน้ารายละเอียดซึ่งห่างไปแค่แตะเดียว
    // เอาป้ายออกแล้วการ์ดเตี้ยลงเห็น ๆ และดูเป็นช่องเก็บของมากกว่าเป็นแถวข้อมูล
    card.innerHTML =
      '<span class="t-emoji"></span><b></b>'
      + '<span class="t-stars"></span>';
    card.appendChild(tierSign(t.rarity));

    // ยังไม่ได้ก็เห็นว่าเป็นชิ้นไหน แค่เป็นขาวดำ (ดู .t-card.locked ใน style.css)
    // เดิมซ่อนเป็น ❓/??? ไว้ให้ลุ้น แต่ผลคือไม่รู้ว่ามีอะไรให้ตามเก็บบ้าง
    card.querySelector('.t-emoji').textContent = t.emoji;
    card.querySelector('b').textContent = t.name;
    card.querySelector('.t-stars').innerHTML = got ? starRow(lv) : '';

    // แตะแล้วเลือกขึ้นมาโชว์ในช่องซ้าย เหตุผลเดียวกับการ์ดชุด
    if (t.id === stashSel.treasure) card.classList.add('sel');
    setDot(card, got && isFresh('treasure', t.id));
    card.addEventListener('click', () => {
      unlockAudio();
      sfx.fish();
      selectStash('treasure', t.id);
    });

    grid.appendChild(card);
  }
  markScrollable(grid);
}



// ── หน้ารายละเอียด ──────────────────────────────────────────

function paintDetail() {
  const t = treasureById(tCurrent);
  if (!t) return;
  const lv = treasureLevel(t.id);
  document.getElementById('tdEmoji').textContent = t.emoji;
  // ป้ายเป็นรูปตรา element เดิมทำหน้าที่เป็นแค่กรอบอุ้มรูป (.as-sign ถอดทรงแคปซูล)
  const badge = document.getElementById('tdTier');
  badge.className = 'tier-badge as-sign ' + t.rarity;
  badge.replaceChildren(tierSign(t.rarity));
  document.getElementById('tdName').textContent = t.name;
  document.getElementById('tdStars').innerHTML = starRow(lv);
  document.getElementById('tdEffect').textContent = effectText(t, lv);
  document.getElementById('tdWhen').textContent = 'เงื่อนไข: ' + triggerText(t);
  document.getElementById('tdText').textContent = t.detail;

  // เข้าหน้านี้ได้ทั้งที่มีและยังไม่มี — ที่ยังไม่มีให้ดูได้ว่าทำอะไรได้บ้าง
  // แต่ติดตั้งกับตีบวกไม่ได้ ปิดปุ่มไปเลยดีกว่าปล่อยให้กดแล้วเด้งข้อความปฏิเสธ
  const got = ownsTreasure(t.id);
  document.getElementById('tDetailPanel').classList.toggle('locked', !got);

  const eq = document.getElementById('tdEquip');
  eq.disabled = !got;
  eq.textContent = !got ? 'ยังไม่มีชิ้นนี้' : isEquipped(t.id) ? 'ถอดออก' : 'ติดตั้ง';
  eq.classList.toggle('ghost', got && isEquipped(t.id));

  // ยังไม่มีชิ้นนี้ = ปุ่มยังกดได้ แต่เปลี่ยนหน้าที่เป็นทางลัดไปตู้สุ่มสมบัติ
  // ท่าเดียวกับปุ่มในหน้ารายละเอียดชุด — ปุ่มที่บอกว่า "ไปสุ่มก่อน" แล้วกดไม่ได้
  // คือการบอกทางแล้วปิดทางในประโยคเดียวกัน
  const up = document.getElementById('tdUpgrade');
  up.disabled = got && lv >= UPGRADE.maxLevel;
  up.textContent = !got ? 'ไปสุ่มก่อน'
    : lv >= UPGRADE.maxLevel ? 'ตีบวกสูงสุดแล้ว' : 'อัพเกรด';
}

function openDetail(id, from) {
  tCurrent = id;
  tFrom = from;
  setMsg(document.getElementById('tdMsg'), '');
  paintDetail();
  swapPanel(from, tDetailPanel);
}

// ── หน้าตีบวก ───────────────────────────────────────────────

function paintUpgrade() {
  const t = treasureById(tCurrent);
  if (!t) return;
  const lv = treasureLevel(t.id);
  const maxed = lv >= UPGRADE.maxLevel;

  document.getElementById('upEmoji').textContent = t.emoji;
  document.getElementById('upName').textContent = t.name;
  document.getElementById('upStep').innerHTML = starRow(lv);
  document.getElementById('upCost').textContent = UPGRADE.cost.toLocaleString('en-US');

  // โชว์ว่าตีสำเร็จแล้วฤทธิ์จะขึ้นจากเท่าไหร่เป็นเท่าไหร่ ไม่ใช่แค่บอกว่า +10%
  document.getElementById('upArrow').innerHTML = maxed
    ? `<b>${effectText(t, lv)}</b>`
    : `<span>${effectText(t, lv)}</span><i>→</i><b>${effectText(t, lv + 1)}</b>`;

  document.getElementById('upOdds').innerHTML = maxed
    ? 'ตีบวกถึงขั้นสูงสุดแล้ว'
    : `โอกาสสำเร็จ <b>${Math.round(UPGRADE.chance * 100)}%</b> · ล้มเหลวเสียแต่ทอง ขั้นไม่ลด`;

  // ระหว่างตีรัวอยู่ ปุ่มตีทีละครั้งต้องกดไม่ได้ ไม่งั้นทองจะถูกหักซ้อนกันสองทาง
  document.getElementById('upGo').disabled = maxed || autoOn;
  document.getElementById('upGoLabel').textContent = maxed ? 'ตันแล้ว' : 'ตีบวก';
  // ตันแล้วก็ไม่มีอะไรให้ตีรัวต่อ แต่ตอนกำลังรัวอยู่ปุ่มต้องกดได้ เพราะมันคือปุ่ม "หยุด"
  document.getElementById('upAuto').disabled = maxed && !autoOn;
  paintAutoBtn();
}

function openUpgrade() {
  document.getElementById('upResult').classList.add('hidden');
  stopAuto();
  resetUpgradeAnim();
  refreshGold();   // ยอดเหรียญบนหัวหน้านี้ต้องตรงตั้งแต่วินาทีที่เปิด ไม่ใช่รอกดตีบวกก่อน
  paintUpgrade();
  swapPanel(tDetailPanel, upPanel);
}

// ── จังหวะของการตีบวก ──
//
// ผลออกมาแล้วตั้งแต่วินาทีที่กด (upgradeTreasure สุ่มทันที) แต่ยังไม่บอก
// เว้นช่วงชาร์จพลังไว้ก่อนเกือบวินาที เพราะการลุ้นคือทั้งหมดที่ระบบนี้ขายอยู่
// ถ้าเฉลยทันทีที่กด มันจะเหลือแค่ "กดแล้วตัวเลขเปลี่ยน" ซึ่งไม่มีใครอยากกดซ้ำ
const CHARGE_MS = 900;

let upBusy = false;
let upTimer = 0;

/** ประกายกระเด็นออกจากกลางเวที — ชิ้นส่วนสร้างใหม่ทุกครั้งด้วยเหตุผลเดียวกับริบบิ้นกาช่า */
function burstSparks(win) {
  const box = document.getElementById('upSpark');
  box.innerHTML = '';

  // สำเร็จโปรยเยอะและไกลกว่า ความต่างของ "ปริมาณ" อ่านออกก่อนอ่านสีด้วยซ้ำ
  const count = win ? 18 : 10;
  for (let i = 0; i < count; i++) {
    const bit = document.createElement('i');
    bit.style.setProperty('--a', Math.round((i / count) * 360 + Math.random() * 16) + 'deg');
    bit.style.setProperty('--r', Math.round((win ? 52 : 34) + Math.random() * 44) + 'px');
    bit.style.setProperty('--d', (Math.random() * 0.1).toFixed(2) + 's');
    box.appendChild(bit);
  }
}

/** ล้างสถานะแอนิเมชันทิ้ง ใช้ทั้งตอนเปิดหน้าใหม่และตอนออกกลางคัน */
function resetUpgradeAnim() {
  clearTimeout(upTimer);
  upTimer = 0;
  upBusy = false;
  document.getElementById('upBox').classList.remove('charging', 'win', 'fail');
  document.getElementById('upSpark').innerHTML = '';
}

// ── ตีบวกรัวจนตัน ──────────────────────────────────────────
//
// ตีซ้ำให้เองจนขั้นเต็มหรือทองไม่พอ ระหว่างนั้นกดปุ่มเดิมซ้ำเพื่อหยุดได้ตลอด
//
// เร็วกว่าการตีทีละครั้ง (900ms) แต่ต้องช้าพอให้ตาอ่านทัน
// เคยตั้งไว้ 260ms ซึ่งเร็วจนดาวกับตัวเลขกระพริบผ่านไปเฉย ๆ อ่านไม่ทันสักครั้ง
// ผลคือเห็นแค่ผลสรุปตอนจบ ซึ่งเสียอรรถรสของการดูมันไล่ขึ้นทีละขั้นไปหมด
const AUTO_MS = 720;

let autoOn = false;
let autoTimer = 0;
let autoTries = 0;
let autoSpent = 0;

function paintAutoBtn() {
  const btn = document.getElementById('upAuto');
  btn.classList.toggle('stopping', autoOn);
  btn.querySelector('.up-auto-ico').textContent = autoOn ? '■' : '⚡';
  document.getElementById('upAutoLabel').textContent = autoOn ? 'หยุด' : 'ตีจนกว่าจะตัน';
}

/** หยุดรอบตีรัว — เรียกได้ตลอด ปลอดภัยแม้ตอนไม่ได้รัวอยู่ */
function stopAuto() {
  autoOn = false;
  clearTimeout(autoTimer);
  autoTimer = 0;
  paintAutoBtn();
}

/** สรุปผลตอนจบรอบ แล้วคืนปุ่มให้กดได้ตามปกติ */
function finishAuto(head, note, win) {
  stopAuto();
  const box = document.getElementById('upResult');
  box.classList.remove('hidden');
  box.className = 'up-result ' + (win ? 'win' : 'fail');
  box.innerHTML = `<b>${head}</b><small>${note}</small>`;
  if (win) setTimeout(() => sfx.cheer(), 200);
  paintUpgrade();
  refreshGold();
}

function autoStep() {
  if (!autoOn) return;

  const r = upgradeTreasure(tCurrent);
  if (!r.ok) {
    // ยังไม่ได้ตีสักครั้ง = กดมาแล้วติดตั้งแต่แรก บอกเหตุผลตรง ๆ ดีกว่าสรุปยอดศูนย์
    if (!autoTries) {
      return finishAuto(r.reason,
        r.need ? `ขาดอีก ${r.need.toLocaleString('en-US')} ทอง` : 'ไม่มีอะไรให้ตีต่อแล้ว', false);
    }
    return finishAuto('😿 ทองหมดก่อน',
      `ตีไป ${autoTries} ครั้ง · ${autoSpent.toLocaleString('en-US')} ทอง · หยุดที่ขั้น ${treasureLevel(tCurrent)}/${UPGRADE.maxLevel}`,
      false);
  }

  autoTries++;
  autoSpent += r.spent;
  if (r.win) { recordUpgrade(); sfx.upWin(); } else { sfx.upFail(); }

  // เล่นแอนิเมชันเวทีซ้ำได้ทุกครั้ง ต้องถอดคลาสแล้วบังคับ reflow ก่อนใส่กลับ
  // ไม่งั้นเบราว์เซอร์มองว่าคลาสไม่เปลี่ยน แล้วแอนิเมชันจะเล่นแค่ครั้งแรกครั้งเดียว
  const stage = document.getElementById('upBox');
  stage.classList.remove('win', 'fail');
  void stage.offsetWidth;
  stage.classList.add(r.win ? 'win' : 'fail');
  burstSparks(r.win);

  const lv = treasureLevel(tCurrent);
  const box = document.getElementById('upResult');
  box.classList.remove('hidden');
  box.className = 'up-result ' + (r.win ? 'win' : 'fail');
  box.innerHTML = `<b>${r.win ? '✨ สำเร็จ!' : '😿 ไม่สำเร็จ'}</b>`
    + `<small>ครั้งที่ ${autoTries} · ขั้น ${lv}/${UPGRADE.maxLevel}`
    + ` · ใช้ไป ${autoSpent.toLocaleString('en-US')} ทอง</small>`;

  paintUpgrade();
  refreshGold();

  if (r.win) {
    const stars = document.querySelectorAll('#upStep i.on');
    if (stars.length) stars[stars.length - 1].classList.add('just');
  }

  if (lv >= UPGRADE.maxLevel) {
    return finishAuto('🏆 ตีบวกจนตันแล้ว!',
      `ใช้ไป ${autoTries} ครั้ง · ${autoSpent.toLocaleString('en-US')} ทอง`, true);
  }
  autoTimer = setTimeout(autoStep, AUTO_MS);
}

function toggleAuto() {
  // กดซ้ำระหว่างรัว = หยุด ปุ่มเดียวทำสองหน้าที่ จะได้ไม่ต้องหาปุ่มหยุดที่อื่น
  if (autoOn) {
    stopAuto();
    return finishAuto('หยุดแล้ว',
      autoTries
        ? `ตีไป ${autoTries} ครั้ง · ${autoSpent.toLocaleString('en-US')} ทอง · ขั้น ${treasureLevel(tCurrent)}/${UPGRADE.maxLevel}`
        : 'ยังไม่ได้ตีสักครั้ง',
      false);
  }
  // ตีทีละครั้งค้างอยู่ ต้องรอให้รอบนั้นเฉลยก่อน ไม่งั้นผลสองรอบจะทับกัน
  if (upBusy) return;

  unlockAudio();
  autoOn = true;
  autoTries = 0;
  autoSpent = 0;
  paintUpgrade();
  autoStep();
}

function doUpgrade() {
  // กดรัวระหว่างยังชาร์จอยู่ = หักทองหลายรอบแต่เห็นผลรอบเดียว
  if (upBusy || autoOn) return;

  const r = upgradeTreasure(tCurrent);
  const box = document.getElementById('upResult');
  const stage = document.getElementById('upBox');

  // ทองไม่พอหรือตันแล้ว ไม่ใช่ผลของการตีบวก จึงไม่ต้องเล่นแอนิเมชันให้รอเก้อ
  if (!r.ok) {
    box.classList.remove('hidden');
    box.className = 'up-result fail';
    box.innerHTML = `<b>${r.reason}</b>`
      + (r.need ? `<small>ขาดอีก ${r.need.toLocaleString('en-US')} ทอง</small>` : '');
    return;
  }

  unlockAudio();
  upBusy = true;
  box.classList.add('hidden');           // ผลรอบก่อนต้องหายไปก่อน ไม่ใช่ค้างอยู่ระหว่างลุ้นรอบใหม่
  document.getElementById('upGo').disabled = true;
  stage.classList.remove('win', 'fail');
  stage.classList.add('charging');
  sfx.forge();

  upTimer = setTimeout(() => {
    upTimer = 0;
    upBusy = false;
    stage.classList.remove('charging');
    stage.classList.add(r.win ? 'win' : 'fail');
    burstSparks(r.win);

    box.classList.remove('hidden');
    if (r.win) {
      recordUpgrade();
      sfx.upWin();
      setTimeout(() => sfx.cheer(), 300);   // แมวดีใจตามหลังระฆัง ไม่ใช่พร้อมกันจนฟังไม่ออก
      box.className = 'up-result win';
      box.innerHTML = `<b>✨ สำเร็จ!</b><small>ขั้น ${r.from} → ${r.to}</small>`;
    } else {
      // บอกแค่ว่าไม่สำเร็จกับเสียอะไรไป ไม่ต้องถามว่าจะลองอีกไหม
      // ปุ่มตีบวกยังอยู่ตรงนั้นให้กดต่อได้เลยอยู่แล้ว การถามซ้ำเป็นการทวงให้จ่ายอีก
      // ซึ่งอ่านไม่น่ารักเท่าปล่อยให้ตัดสินใจเอง
      sfx.upFail();
      box.className = 'up-result fail';
      box.innerHTML = `<b>😿 ไม่สำเร็จ</b>`
        + `<small>เสียไป ${r.spent.toLocaleString('en-US')} ทอง · ขั้นยังเท่าเดิม</small>`;
    }

    paintUpgrade();
    refreshGold();

    // ดาวดวงที่เพิ่งได้มาต้องเด้งให้เห็น ไม่งั้นมันโผล่เพิ่มมาเงียบ ๆ
    // ทั้งที่เป็นสิ่งเดียวที่ผู้เล่นจ่ายทองไปเพื่อมัน
    if (r.win) {
      const stars = document.querySelectorAll('#upStep i.on');
      if (stars.length) stars[stars.length - 1].classList.add('just');
    }
  }, CHARGE_MS);
}
// ── หน้าติดตั้ง ─────────────────────────────────────────────

function paintSlots() {
  const row = document.getElementById('slotRow');
  row.innerHTML = '';
  for (const id of getEquipped()) {
    const t = id ? treasureById(id) : null;
    const cell = document.createElement('button');
    cell.className = 'slot' + (t ? ' filled ' + t.rarity : ' empty');
    cell.innerHTML = t
      ? `<span class="t-emoji"></span><small></small>`
      : '<span class="slot-plus">+</span>';
    if (t) {
      cell.querySelector('.t-emoji').textContent = t.emoji;
      cell.querySelector('small').textContent = t.name;
      cell.addEventListener('click', () => {
        unlockAudio(); sfx.fish();
        toggleEquip(t.id);
        paintLoadout();
      });
    }
    row.appendChild(cell);
  }
  refreshEquipCount();
}

function paintLoadout() {
  paintSlots();
  const grid = document.getElementById('loadoutGrid');
  grid.innerHTML = '';

  const mine = TREASURES.filter((t) => ownsTreasure(t.id));
  if (!mine.length) {
    setMsg(document.getElementById('loadMsg'), 'ยังไม่มีสมบัติเลย ไปสุ่มที่หน้าสมบัติก่อนนะ');
  }

  for (const t of mine) {
    const on = isEquipped(t.id);
    const lv = treasureLevel(t.id);
    const card = document.createElement('button');
    card.className = 'skin-card t-card ' + t.rarity + (on ? ' on' : '');
    // ไม่มีป้ายคะแนนเหมือนกับหน้ารายการ ทั้งสองหน้าใช้การ์ดใบเดียวกัน
    // ถ้าหน้าหนึ่งมีป้ายอีกหน้าไม่มี การ์ดจะสูงไม่เท่ากันทั้งที่หน้าตาเหมือนกัน
    card.innerHTML = '<span class="t-emoji"></span><b></b><span class="t-stars"></span>';
    card.querySelector('.t-emoji').textContent = t.emoji;
    card.querySelector('b').textContent = t.name;
    card.querySelector('.t-stars').innerHTML = starRow(lv);

    card.addEventListener('click', () => {
      unlockAudio();
      const r = toggleEquip(t.id);
      if (!r.ok) {
        sfx.shieldBreak();
        setMsg(document.getElementById('loadMsg'), r.reason, true);
        return;
      }
      sfx.fish();
      setMsg(document.getElementById('loadMsg'), '');
      paintLoadout();
    });
    grid.appendChild(card);
  }
  markScrollable(grid);
}

function showLoadout(on) {
  if (on) {
    setMsg(document.getElementById('loadMsg'), '');
    paintLoadout();
    swapPanel(stagePanel, loadoutPanel);
  } else {
    swapPanel(loadoutPanel, stagePanel);
    paintSlots();   // ตัวเลข 0/3 บนปุ่มในหน้าเลือกด่านต้องตรงกับที่เพิ่งจัดไป
  }
}

function goHome() {
  clearTimeout(introTimer);   // เผลอกดกลับกลางฉากห้อง เกมต้องไม่เริ่มเองทีหลัง
  game.inRoom = false;
  game.reset();   // กลับสู่สถานะ READY ฉากหน้าแรกจึงถูกวาดแทนฉากเล่น
  // ไล่ปิดจาก DOM ไม่ใช่ไล่ชื่อตัวแปร แผงที่เพิ่มทีหลังจึงถูกปิดเองอัตโนมัติ
  closeAllPanels();
  startPanel.classList.remove('hidden');
  // คืนปุ่มบนแถบในจอให้ตรงกับสถานะจริง ไม่งั้นถ้าเลิกเล่นตอนหยุดอยู่
  // ปุ่มจะค้างเป็นสามเหลี่ยม "เล่นต่อ" ทั้งที่ไม่มีรอบเล่นให้เล่นต่อแล้ว
  pauseBtn.classList.remove('playing');
  pauseBtn.setAttribute('aria-label', 'หยุดชั่วคราว');
  refreshHome();
}

// ── พรสวรรค์ ──
// ตัวหน้าจออยู่ใน talent-ui.js ทั้งหมด ที่นี่แค่ส่งของที่มันต้องใช้ให้ แล้วสลับแผงกับล็อบบี้
// ติดตั้งแล้วบันทึกทันที และมีผลตอนเริ่มวิ่งตาถัดไป (game.reset อ่านใบที่ติดตั้งใหม่ทุกตา)
const talentPanel = document.getElementById('talentPanel');
const talentUI = setupTalentUI({
  panel: talentPanel,
  sfx,
  unlockAudio,
  markScrollable,
  onBack: () => {
    talentPanel.classList.add('hidden');
    startPanel.classList.remove('hidden');
    refreshHome();
  },
});
// หมวดสกิลอยู่ในแผงเดียวกัน (แท็บบนหัว) — skill-ui.js ดูแลการสลับหมวด
const skillUI = setupSkillUI({ panel: talentPanel, talentUI, sfx, unlockAudio, markScrollable });
document.getElementById('btnTalent').addEventListener('click', () => {
  // แตะเมนูก็นับเป็น gesture แล้ว เพลงหน้าแรกจึงเริ่มได้โดยไม่ต้องกดเริ่มวิ่งก่อน
  unlockAudio(); startMusic(); sfx.fish();
  startPanel.classList.add('hidden');
  // ปุ่มล็อบบี้ชื่อ "สกิล" เปิดมาเจอหมวดสกิลเสมอ
  skillUI.open('skill');
});
document.getElementById('btnStages').addEventListener('click', () => {
  unlockAudio(); startMusic();
  buildStageGrid();
  showStages(true);
});
document.getElementById('stageBack').addEventListener('click', () => showStages(false));
document.getElementById('siBack').addEventListener('click', () => {
  swapPanel(stageInfoPanel, stagePanel);
});
document.getElementById('btnStash').addEventListener('click', () => {
  unlockAudio(); startMusic();
  // เปิดจากล็อบบี้ต้องเจอแมวน้อยก่อนเสมอ ไม่ใช่หมวดที่ค้างไว้รอบก่อน
  showStash(true, 'skin');
});
document.getElementById('stashBack').addEventListener('click', () => showStash(false));

// ── ปุ่มสองใบในช่องพรีวิว ──
document.getElementById('stashUse').addEventListener('click', () => {
  unlockAudio();
  if (stashTab === 'skin') {
    const x = skinById(stashSel.skin);
    if (!ownsSkin(x.id)) { buySkin(x); return; }
    setSkin(x.id);
    sfx.potion();
    refreshHome();
    refreshStash();
    return;
  }
  if (stashTab === 'outfit') {
    const o = outfitById(stashSel.outfit);
    if (!o) return;
    // ยังไม่มีชุดนี้ = ปุ่มเปลี่ยนหน้าที่เป็นทางลัดไปตู้กาช่า ไม่ใช่กดแล้วเงียบ
    // (ท่าเดียวกับปุ่มในหน้ารายละเอียด — บอกทางแทนที่จะปิดทาง)
    if (!isOwned(o.id)) {
      sfx.fish();
      stashPanel.classList.add('hidden');
      showGacha(true, 'skin');
      return;
    }
    setOutfit(o.id);
    sfx.potion();
    refreshHome();
    refreshStash();
    return;
  }

  const t = treasureById(stashSel.treasure);
  if (!t) return;
  if (!ownsTreasure(t.id)) {
    sfx.fish();
    stashPanel.classList.add('hidden');
    showGacha(true, 'treasure');
    return;
  }
  const r = toggleEquip(t.id);
  if (!r.ok) {
    sfx.shieldBreak();
    setMsg(document.getElementById('outfitMsg'), r.reason, true);
    return;
  }
  sfx.potion();
  setMsg(document.getElementById('outfitMsg'), '');
  refreshEquipCount();
  paintStashIcon();
  refreshStash();
});

document.getElementById('stashMore').addEventListener('click', () => {
  unlockAudio();
  sfx.fish();
  if (stashTab === 'outfit') openOutfitDetail(stashSel.outfit);
  else openDetail(stashSel.treasure, stashPanel);
});

document.getElementById('tabStashSkin').addEventListener('click', () => {
  unlockAudio(); sfx.fish(); setStashTab('skin');
});
document.getElementById('tabStashOutfit').addEventListener('click', () => {
  unlockAudio(); sfx.fish(); setStashTab('outfit');
});
document.getElementById('tabStashTreasure').addEventListener('click', () => {
  unlockAudio(); sfx.fish(); setStashTab('treasure');
});

// ══ ใส่รูปเป็นหน้าน้องแมว (Game Face) ══════════════════════
//
// ── ทำไมตัดรูปเก็บไว้ แทนที่จะเก็บรูปเต็มแล้วค่อยตัดตอนวาด ──
// หัวแมวในเกมกว้างแค่ 26px และถูกวาดใหม่ทุกเฟรม ถ้าเก็บรูปจากมือถือขนาด
// 4000x3000 ไว้ทั้งใบ เบราว์เซอร์ต้องย่อภาพนั้นลง 150 เท่าทุกเฟรมทุกที่ที่มีแมว
// ตัดเหลือ 256x256 ครั้งเดียวตอนบันทึก ที่เหลือคือการวาดสี่เหลี่ยมเล็ก ๆ
//
// ── ทำไมเก็บตำแหน่งเป็น "จุดบนรูปที่อยู่กึ่งกลางวง" ไม่ใช่มุมซ้ายบน ──
// เก็บเป็นมุมซ้ายบนก็ได้ แต่พอซูมแล้วสิ่งที่ผู้เล่นเล็งไว้จะเลื่อนหนีออกจากวง
// เพราะการซูมขยายออกจากมุม เก็บเป็นจุดกึ่งกลางแล้วซูมเข้า-ออกรอบจุดเดิมได้เลย

const createPanel = document.getElementById('createPanel');
const faceCropBox = document.getElementById('faceCrop');
const faceCanvas = document.getElementById('faceCanvas');
const faceZoom = document.getElementById('faceZoom');
const faceSaveBtn = document.getElementById('faceSave');

/** รูปต้นฉบับที่ผู้เล่นเพิ่งเลือก (ยังไม่ได้ตัด) */
let faceSrc = null;
/** จุดบนรูปต้นฉบับที่อยู่กึ่งกลางวงกลม หน่วยเป็นพิกเซลของรูปต้นฉบับ */
let faceCx = 0;
let faceCy = 0;
/** ตัวคูณซูม 1 = ด้านสั้นของรูปพอดีวงกลม */
let faceK = 1;
/** มุมเอียงของรูป (เรเดียน) — รูปจากมือถือที่ถ่ายตะแคงมาต้องหมุนกลับได้ */
let faceRot = 0;
const faceRotEl = document.getElementById('faceRot');

/** ผ้าใบที่ถือรูปตัดแล้ว ใช้ทั้งเป็นตัวอย่างสด ๆ และเป็นตัวที่จะบันทึกลงเครื่อง */
const faceOut = document.createElement('canvas');
faceOut.width = FACE_SIZE;
faceOut.height = FACE_SIZE;

/**
 * กันรูปเลื่อนจนหลุดออกนอกวง — ผู้เล่นจึงไม่มีทางตัดติดพื้นที่ว่างเปล่ามาได้
 * คิดทุกอย่างเป็นพิกเซลของรูปต้นฉบับ เพราะ faceCx/faceCy อยู่ในหน่วยนั้น
 */
function clampFace() {
  if (!faceSrc) return;
  const short = Math.min(faceSrc.naturalWidth, faceSrc.naturalHeight);
  // ── ทำไมต้องคูณด้วย |cos|+|sin| ──
  // กรอบที่ตัดเป็นสี่เหลี่ยม พอหมุนแล้วมุมทั้งสี่กวาดออกไปไกลกว่าตอนไม่หมุน
  // (ที่ 45 องศาไกลสุด = √2 เท่า) ถ้าไม่เผื่อ มุมรูปจะโผล่เป็นสามเหลี่ยมโปร่งใส
  const spread = Math.abs(Math.cos(faceRot)) + Math.abs(Math.sin(faceRot));
  const half = (short / faceK / 2) * spread;
  faceCx = Math.max(half, Math.min(faceSrc.naturalWidth - half, faceCx));
  faceCy = Math.max(half, Math.min(faceSrc.naturalHeight - half, faceCy));
}

/** วาดรูปที่ตัดแล้ว แล้วสะท้อนไปทั้งกรอบตัด ตัวอย่าง และตัวน้องทุกที่ในเกม */
function paintFace() {
  const c = faceOut.getContext('2d');
  c.clearRect(0, 0, FACE_SIZE, FACE_SIZE);
  if (faceSrc) {
    clampFace();
    const short = Math.min(faceSrc.naturalWidth, faceSrc.naturalHeight);
    const src = short / faceK;
    // ── ทำไมใช้ transform แทน drawImage แบบตัดชิ้น ──
    // drawImage เก้าอาร์กิวเมนต์ตัดได้แค่สี่เหลี่ยมที่ตรงกับแกน หมุนไม่ได้
    // ตั้ง transform ให้ "จุดที่ผู้เล่นเล็งไว้" ไปอยู่กลางผ้าใบผลลัพธ์พอดี
    // แล้ววาดรูปทั้งใบลงไป ส่วนที่เกินกรอบถูกตัดทิ้งเองโดยขอบผ้าใบ
    const k = FACE_SIZE / src;
    c.save();
    c.translate(FACE_SIZE / 2, FACE_SIZE / 2);
    c.rotate(faceRot);
    c.scale(k, k);
    c.translate(-faceCx, -faceCy);
    c.drawImage(faceSrc, 0, 0);
    c.restore();
  }

  const cc = faceCanvas.getContext('2d');
  cc.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
  if (faceSrc) cc.drawImage(faceOut, 0, 0, faceCanvas.width, faceCanvas.height);

  // ให้น้องทุกที่ในเกมลองใส่รูปนี้ให้ดูทันที โดยยังไม่บันทึกลงเครื่อง
  setDraft(faceSrc ? faceOut : null);

  paintMini(document.getElementById('facePreview'), 132,
    (x) => drawCatPose(x, 66, 116, 2, getSkin(), 60));
  refreshCreateIcon();

  faceCropBox.classList.toggle('has-img', Boolean(faceSrc));
  faceSaveBtn.disabled = !faceSrc;
  faceZoom.disabled = !faceSrc;
  faceRotEl.disabled = !faceSrc;
}

function refreshCreateIcon() {
  paintFitted(document.getElementById('createIcon'), 76, 0.96,
    (c) => drawCatFace(c, 38, 44, 1.8, getSkin()));
}

/** โหลดไฟล์ที่เลือก แล้วตั้งค่าเริ่มต้นเป็น "เต็มวง จัดกลาง" */
function loadFaceFile(file) {
  const msg = document.getElementById('faceMsg');
  if (!file) return;
  if (!/^image\//.test(file.type)) {
    setMsg(msg, 'ไฟล์นี้ไม่ใช่รูปภาพ', true);
    return;
  }
  setMsg(msg, 'กำลังเปิดรูป...');
  const url = URL.createObjectURL(file);
  const el = new Image();
  el.onload = () => {
    // ปล่อย URL ทันทีที่รูปเข้าหน่วยความจำแล้ว ไม่งั้นทุกรูปที่ลองจะค้างอยู่หมด
    URL.revokeObjectURL(url);
    faceSrc = el;
    faceK = 1;
    faceRot = 0;
    faceRotEl.value = '0';
    faceCx = el.naturalWidth / 2;
    faceCy = el.naturalHeight / 2;
    faceZoom.value = '100';
    setMsg(msg, 'ลากรูปเพื่อเลื่อน เลื่อนแถบเพื่อซูม แล้วกด "ใช้รูปนี้"');
    paintFace();
  };
  el.onerror = () => {
    URL.revokeObjectURL(url);
    setMsg(msg, 'เปิดรูปนี้ไม่ได้ ลองรูปอื่นดูนะ', true);
  };
  el.src = url;
}

// ── ลากเพื่อเลื่อนรูป ──
// pointer event ตัวเดียวคุมทั้งเมาส์และนิ้ว ไม่ต้องเขียนสองชุด
let faceDrag = null;
faceCropBox.addEventListener('pointerdown', (e) => {
  if (!faceSrc) return;
  faceCropBox.setPointerCapture(e.pointerId);
  faceCropBox.classList.add('dragging');
  faceDrag = { x: e.clientX, y: e.clientY };
});
faceCropBox.addEventListener('pointermove', (e) => {
  if (!faceDrag || !faceSrc) return;
  // แปลงระยะที่นิ้วลากบนจอ เป็นระยะบนรูปต้นฉบับ
  // ตัวคูณคือ "กี่พิกเซลจอต่อหนึ่งพิกเซลรูป" ซึ่งเปลี่ยนตามทั้งซูมและขนาดกรอบจริง
  const short = Math.min(faceSrc.naturalWidth, faceSrc.naturalHeight);
  const perPx = faceCropBox.clientWidth / (short / faceK);
  // ── ทำไมต้องหมุนทิศที่ลากด้วย ──
  // รูปถูกหมุนก่อนแสดง การลากขึ้นบนบนหน้าจอจึงไม่ได้แปลว่า "ขึ้นบน" ของรูปต้นฉบับ
  // ต้องหมุนเวกเตอร์การลากกลับด้วยมุมเดียวกัน ไม่งั้นลากซ้ายแล้วรูปเลื่อนเฉียง
  const dx = (e.clientX - faceDrag.x) / perPx;
  const dy = (e.clientY - faceDrag.y) / perPx;
  const cs = Math.cos(faceRot), sn = Math.sin(faceRot);
  faceCx -= dx * cs + dy * sn;
  faceCy -= -dx * sn + dy * cs;
  faceDrag = { x: e.clientX, y: e.clientY };
  paintFace();
});
for (const ev of ['pointerup', 'pointercancel']) {
  faceCropBox.addEventListener(ev, () => {
    faceDrag = null;
    faceCropBox.classList.remove('dragging');
  });
}

/**
 * ซูมต่ำสุดที่ยังไม่เห็นมุมโหว่ ณ มุมเอียงปัจจุบัน
 *
 * กรอบตัดเป็นสี่เหลี่ยม พอหมุนแล้วมันกวาดพื้นที่กว้างกว่าเดิม (|cos|+|sin| เท่า,
 * สูงสุด √2 ที่ 45 องศา) ถ้าซูมยังเป็น 1 อยู่ กรอบจะเลยขอบรูปไปทั้งสี่มุม
 * แล้วได้สามเหลี่ยมโปร่งใสติดมาด้วย — วัดแล้วที่ 45 องศาโหว่ไป 29,874 พิกเซล
 *
 * บังคับซูมขึ้นให้พอดีแทนที่จะปล่อยให้โหว่ เป็นท่าเดียวกับแอปตัดรูปทั่วไป
 */
function minZoom() {
  return Math.abs(Math.cos(faceRot)) + Math.abs(Math.sin(faceRot));
}

/** ตั้งซูมโดยไม่ให้ต่ำกว่าที่มุมเอียงตอนนี้ต้องการ แล้วซิงก์แถบเลื่อนให้ตรง */
function setZoom(k) {
  faceK = Math.max(minZoom(), k);
  faceZoom.value = String(Math.round(faceK * 100));
}

faceZoom.addEventListener('input', () => {
  setZoom(Number(faceZoom.value) / 100);
  paintFace();
});

faceRotEl.addEventListener('input', () => {
  faceRot = Number(faceRotEl.value) * Math.PI / 180;
  setZoom(faceK);   // เอียงมากขึ้นแล้วซูมเดิมอาจไม่พอ ดันขึ้นให้อัตโนมัติ
  paintFace();
});

document.getElementById('faceOpen').addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  document.getElementById('facePick').click();
});
document.getElementById('facePick').addEventListener('change', (e) => {
  loadFaceFile(e.target.files[0]);
  // ล้างค่าไว้ ไม่งั้นเลือกไฟล์ชื่อเดิมซ้ำอีกรอบจะไม่ยิง change ให้
  e.target.value = '';
});

document.getElementById('faceSave').addEventListener('click', () => {
  const msg = document.getElementById('faceMsg');
  if (!faceSrc) return;
  unlockAudio(); sfx.fish();
  // JPEG ไม่ใช่ PNG — รูปถ่ายเป็นภาพต่อเนื่อง PNG จะใหญ่กว่าราว 8-10 เท่า
  // โดยได้ช่องโปร่งใสมาซึ่งเราไม่ใช้ (ตัดเป็นวงกลมตอนวาดอยู่แล้ว)
  const url = faceOut.toDataURL('image/jpeg', 0.86);
  if (saveFace(url)) {
    setDraft(null);   // ของจริงถูกบันทึกแล้ว ตัวอย่างไม่ต้องค้างทับอีก
    sfx.upWin();
    setMsg(msg, 'ใส่รูปให้น้องเรียบร้อย!');
  } else {
    sfx.upFail();
    setMsg(msg, 'ที่เก็บในเครื่องเต็ม ลองล้างข้อมูลเว็บก่อนนะ', true);
  }
  paintFace();
  refreshHome();
});

document.getElementById('faceOff').addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  faceSrc = null;
  setDraft(null);
  clearFace();
  faceZoom.value = '100';
  faceRot = 0;
  faceRotEl.value = '0';
  setMsg(document.getElementById('faceMsg'), 'เอารูปออกแล้ว น้องกลับมาหน้าเดิม');
  paintFace();
  refreshHome();
});

/**
 * เปิด/ปิดหน้าใส่รูป
 *
 * ปิดเมื่อไหร่ต้องล้างตัวอย่างที่ยังไม่บันทึกทุกครั้ง ไม่งั้นน้องจะค้างรูปที่
 * ผู้เล่นเลือกแล้วเปลี่ยนใจ แล้วรูปนั้นจะหายไปเองตอนรีเฟรชหน้าเพราะไม่ได้ถูกเก็บ
 * ซึ่งอ่านเป็นบั๊คมากกว่าเป็นการยกเลิก
 */
function showFace(on) {
  faceSrc = null;
  faceRot = 0;
  faceRotEl.value = '0';
  // สลับกับหน้าล็อบบี้โดยตรง ใช้ท่าเดียวกับหน้าสมบัติ/ชุด
  //
  // เคยใช้ showPanel() ซึ่งเรียก closeAllPanels() ที่ปิด "ทุกแผงรวมทั้งล็อบบี้"
  // ตอนเปิดจึงไม่มีปัญหา แต่ตอนกดกลับมันแค่ซ่อนหน้านี้ ไม่มีใครเปิดล็อบบี้คืนให้
  // ผลคือเหลือแต่ฉากหน้าแรกเปล่า ๆ ไม่มีปุ่มอะไรเลย และปุ่มหยุดก็กดไม่ติด
  // เพราะเกมยังเป็นสถานะ READY ซึ่งไม่มีรอบเล่นให้หยุด
  if (!on) setDraft(null);
  // ปิดแผงแล้วต้องคืนจากโหมดเต็มจอเสมอ ไม่งั้นเปิดกลับมาครั้งหน้าจะค้างอยู่โหมดนั้น
  // ทั้งที่ผู้เล่นตั้งใจกดเข้ามาดูหน้าปกติ
  if (!on) createPanel.classList.remove('paint-full');
  createPanel.classList.toggle('hidden', !on);
  startPanel.classList.toggle('hidden', on);

  if (on) {
    faceZoom.value = '100';
    setMsg(document.getElementById('faceMsg'),
      hasFace() ? 'ตอนนี้น้องใส่รูปอยู่ เลือกรูปใหม่เพื่อเปลี่ยนได้เลย' : '');
    paintFace();
    // เปิดมาเจอโหมดระบายสีก่อนเสมอ เพราะเป็นของใหม่และเป็นเหตุผลหลักที่แผงนี้มีอยู่
    buildSwatches();
    setCreateTab('paint');
    refreshCreate();
  } else {
    paintFace();
    refreshHome();
  }
}

document.getElementById('btnCreate').addEventListener('click', () => {
  unlockAudio(); sfx.fish(); startMusic();
  showFace(true);
});
document.getElementById('createBack').addEventListener('click', () => {
  unlockAudio(); sfx.fish(); showFace(false);
});

// ─────────────────────────────────────────────────────────────
// ระบายสีน้อง
//
// ── ตรวจว่านิ้วแตะโดนส่วนไหน ──
// วาดน้องอีกรอบลงผ้าใบที่ซ่อนไว้ ด้วยฟังก์ชันวาดตัวเดียวกับที่วาดน้องจริง
// แต่ส่งจานสี "รหัสสี" เข้าไปแทนจานสีจริง แล้วอ่านพิกเซลตรงจุดที่แตะ
//
// ทำแบบนี้เพราะขอบเขตของแต่ละส่วนจะตรงกับรูปที่เห็นเป๊ะเสมอ ถ้าไปเขียนโค้ด
// คำนวณขอบเขตเอง (วงกลมหัวรัศมีเท่านี้ วงรีตัวเท่านั้น) วันที่มีคนแก้ท่าน้อง
// ขอบเขตจะเพี้ยนจากรูปทันทีโดยไม่มีใครรู้ตัว
// ─────────────────────────────────────────────────────────────
const paintCat = document.getElementById('paintCat');
const paintHint = document.getElementById('paintHint');
// ผ้าใบรหัสสี ไม่ได้ใส่ลง DOM — ไม่มีใครต้องเห็นมัน
const pickCv = document.createElement('canvas');
pickCv.width = paintCat.width;
pickCv.height = paintCat.height;

let paintTool = 'brush';
let paintColor = SWATCHES[3];
let paintPart = null;        // ส่วนที่เลือกจากรายชื่อ null = เล็งเอาจากที่แตะ
// 'part' = ลงเฉพาะส่วนที่แตะ / 'all' = แตะทีเดียวลงทั้งแปดส่วนพร้อมกัน
let paintScope = 'part';

// ── ทำไมน้องอยู่นิ่งในหน้านี้ที่เดียวในเกม ──
// ตอนแรกให้หายใจกับกระดิกหางเหมือนหน้าอื่น แล้วเทสจริงพบว่าแตะจมูกกับตาไม่โดน
// เพราะสองส่วนนั้นกว้างไม่กี่พิกเซล พอตัวขยับระหว่างที่นิ้วกำลังลง จุดที่แตะ
// ก็เลื่อนไปโดนส่วนข้าง ๆ แทน — ระบายสีบนของที่ขยับอยู่มันทำไม่ได้จริง ๆ
// เลขนี้คือเฟรมที่น้องลืมตาอยู่ (ที่ 0 น้องกำลังกะพริบตาพอดี)
const PAINT_POSE = 60;
// เก็บจานสีก่อนหน้าไว้ย้อนกลับ จำกัดไว้ 30 ขั้นก็พอสำหรับงานระบายสี
const paintHistory = [];

// ── จัดน้องให้อยู่กลางกรอบพอดีและใหญ่ที่สุดเท่าที่กรอบให้ ──
//
// ── ทำไมต้องวัดเอา ไม่ตั้งตัวเลขไว้ตายตัว ──
// ท่าน้องประกอบจากหลายส่วน (หู หาง แขน) ที่ยื่นออกไปคนละระยะ และเคยถูกแก้มาแล้ว
// หลายรอบในเกมนี้ ตัวเลขที่ตั้งไว้วันนี้จะเพี้ยนทันทีที่มีใครขยับหางหรือหู
// วัดกล่องที่พิกเซลทึบกินจริง แล้วขยับ/ย่อให้พอดีกรอบ = ถูกเสมอไม่ว่าท่าจะเปลี่ยนยังไง
//
// ── ทำไมเป็น transform ครอบ ไม่ใช่แก้อาร์กิวเมนต์ของ drawCatPose ──
// ผ้าใบรหัสสีต้องวางน้องไว้ที่เดียวกับผ้าใบที่เห็น "เป๊ะทุกพิกเซล" ไม่งั้นแตะแล้วโดนผิดส่วน
// ครอบ transform ไว้ที่ paintPose ที่เดียว ทั้งสองผ้าใบจึงใช้ค่าเดียวกันโดยอัตโนมัติ
const PAINT_FILL = 0.9;   // ให้ตัวน้องกินกี่ส่วนของด้านกรอบ
let paintFit = null;      // { k, tx, ty } — คำนวณครั้งเดียวตอนเปิดแผง

/** ตำแหน่งฐานก่อนจัด — ค่าอะไรก็ได้ที่วาดน้องออกมาครบตัว เดี๋ยววัดแล้วขยับให้เอง */
function paintBase(ctx, skin) {
  const w = paintCat.width;
  drawCatPose(ctx, w / 2, w * 0.86, w / 118, skin, PAINT_POSE);
}

function computePaintFit() {
  const w = paintCat.width;
  const probe = document.createElement('canvas');
  probe.width = w;
  probe.height = w;
  const pc = probe.getContext('2d', { willReadFrequently: true });
  paintBase(pc, toSkin(palette()));
  const box = alphaBounds(pc, w, w);
  if (!box) { paintFit = { k: 1, tx: 0, ty: 0 }; return; }

  const k = (w * PAINT_FILL) / Math.max(box.w, box.h);
  // ย้ายจุดกึ่งกลางของกล่องที่วัดได้ ไปไว้กลางผ้าใบพอดีหลังย่อ/ขยายแล้ว
  paintFit = {
    k,
    tx: w / 2 - (box.x + box.w / 2) * k,
    ty: w / 2 - (box.y + box.h / 2) * k,
  };
}

/** ท่าที่ใช้วาดน้องในหน้านี้ — ต้องเหมือนกันเป๊ะทั้งผ้าใบที่เห็นและผ้าใบรหัสสี */
function paintPose(ctx, skin) {
  if (!paintFit) computePaintFit();
  ctx.save();
  ctx.translate(paintFit.tx, paintFit.ty);
  ctx.scale(paintFit.k, paintFit.k);
  paintBase(ctx, skin);
  ctx.restore();
}

function drawPaintCat() {
  const c = paintCat.getContext('2d');
  c.clearRect(0, 0, paintCat.width, paintCat.height);
  paintPose(c, toSkin(palette()));
}

/**
 * ผ้าใบรหัสสี — ท่าน้องนิ่ง จึงวาดครั้งเดียวตอนเปิดแผงก็พอ
 * ไม่ต้องวาดใหม่ตอนระบาย เพราะการเปลี่ยนสีไม่ได้ทำให้รูปร่างขยับ
 */
function drawPickMap() {
  const c = pickCv.getContext('2d');
  c.clearRect(0, 0, pickCv.width, pickCv.height);
  paintPose(c, pickSkin());
}

// ── พิกัดท้องถิ่นของตัวละคร ───────────────────────────────
// รอยแปรงถูกเก็บในหน่วยเดียวกับที่ drawCatStand ใช้วาด (ไม่ใช่พิกเซลหน้าจอ)
// ภาพเดียวจึงใช้ได้ทุกขนาดที่เกมวาดน้อง ตั้งแต่ไอคอนเล็ก ๆ ไปจนถึงตัวใหญ่ในหน้านี้
//
// ที่นี่ต้องถอด transform สองชั้นกลับ: ชั้นจัดกลาง (paintFit) กับชั้นของ drawCatPose
// ตัวเลขต้องตรงกับ paintBase() เป๊ะ ถ้าแก้ที่นั่นต้องแก้ที่นี่ด้วย
const HEAD_AT = { x: 1, y: -12 };   // ตำแหน่งหัวในท่ายืน (hx/hy ใน drawCatStand)
const HEAD_R = 13;
const BODY_AT = { x: 0, y: 6, rx: 14, ry: 13 };

/** พิกัดท้องถิ่นของจุดที่นิ้วแตะ */
function localAt(ev) {
  if (!paintFit) computePaintFit();
  const r = paintCat.getBoundingClientRect();
  const pt = ev.touches?.[0] || ev.changedTouches?.[0] || ev;
  // หน้าจอ → พิกเซลบนผ้าใบ
  const cx = (pt.clientX - r.left) / r.width * paintCat.width;
  const cy = (pt.clientY - r.top) / r.height * paintCat.height;
  // ถอดชั้นจัดกลาง
  const fx = (cx - paintFit.tx) / paintFit.k;
  const fy = (cy - paintFit.ty) / paintFit.k;
  // ถอด transform ของ drawCatPose (ต้องตรงกับ paintBase)
  const w = paintCat.width;
  const scale = w / 118;
  const breath = Math.sin(PAINT_POSE * 0.045) * 1.8;
  return {
    x: (fx - w / 2) / scale,
    y: (fy - (w * 0.86 - (BODY.standH / 2) * scale + breath)) / scale,
  };
}

// ── หน้ากากของแต่ละส่วน ในพิกัดของชั้นรอยแปรง ──────────────
//
// หัวแปรงเป็นวงกลม กว้างกว่าของที่จะทาเกือบทุกครั้ง ทาพุงจึงล้นออกนอกวงพุง
// ทาหนวดก็ได้ก้อนสีกลางหน้า หน้ากากคือสิ่งที่บังคับให้สีติดเฉพาะในรูปร่างของส่วนนั้น
//
// ── ทำไมวาดน้องใหม่ในพิกัดของชั้น แทนที่จะย่อ/ขยายผ้าใบรหัสสีที่มีอยู่แล้ว ──
// ผ้าใบรหัสสี (pickCv) อยู่ในพิกเซลของหน้าจอ ส่วนชั้นรอยแปรงอยู่ในพิกัดตัวละคร
// การแปลงระหว่างสองอย่างต้องถอด transform สามชั้นซ้อนกัน ซึ่งจะเพี้ยนเงียบ ๆ
// ทันทีที่ใครขยับตัวเลขใน paintBase — วาดใหม่ด้วยฟังก์ชันวาดตัวเดิมแต่ตั้ง
// transform ให้ตรงกับที่ paintOver ใช้ตอนแปะชั้นกลับลงตัว จึงตรงกันโดยนิยาม
//
// ── ทำไมเก็บแคช ──
// ท่าน้องในหน้านี้นิ่งสนิท (ดู PAINT_POSE) หน้ากากจึงไม่มีวันเปลี่ยน
// สร้างครั้งเดียวต่อส่วนต่อชั้น แล้วใช้ตลอดอายุหน้า
const maskCache = new Map();
const pickData = {};

/** ภาพรหัสสีของชิ้นหนึ่ง วาดในพิกัดพิกเซลของชั้นนั้นเป๊ะ ๆ */
function layerPick(k) {
  if (pickData[k]) return pickData[k];
  const box = LAYER[k];
  const w = Math.round(box.w * LAYER.ppu);
  const h = Math.round(box.h * LAYER.ppu);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d', { willReadFrequently: true });

  // ชั้นหัวเก็บพิกัดเทียบกับ "จุดกลางหัว" ไม่ใช่จุดกลางตัว (ดู layerAt)
  const off = k === 'head' ? HEAD_AT : { x: 0, y: 0 };
  g.setTransform(LAYER.ppu, 0, 0, LAYER.ppu,
    (-box.x - off.x) * LAYER.ppu, (-box.y - off.y) * LAYER.ppu);

  // ตั้ง feetY ให้ transform ภายในของ drawCatPose หักล้างกันพอดีเป็นศูนย์
  // พิกัดที่วาดออกมาจึงเป็นพิกัดตัวละครดิบ ๆ ตรงกับที่ชั้นรอยแปรงใช้
  const breath = Math.sin(PAINT_POSE * 0.045) * 1.8;
  drawCatPose(g, 0, BODY.standH / 2 - breath, 1, pickSkin(), PAINT_POSE);

  pickData[k] = g.getImageData(0, 0, w, h);
  return pickData[k];
}

/**
 * สร้างหน้ากากของส่วนหนึ่งไว้ล่วงหน้าทั้งสองชั้น
 *
 * การสร้างต้องวาดน้องใหม่แล้วไล่อ่านทีละพิกเซลราวสองแสนจุด ซึ่งกินเวลาพอที่จะ
 * เห็นสะดุดถ้าไปเกิดตอนนิ้วเริ่มลาก เรียกตอน "กดเลือกส่วน" แทน ซึ่งเป็นจังหวะ
 * ที่มือหยุดอยู่แล้ว งานเท่าเดิมแต่ไปตกในวินาทีที่ไม่มีใครรอ
 */
function warmMask(key) {
  for (const k of ['body', 'head']) regionMask(k, key);
}

/**
 * หน้ากากของส่วนหนึ่งบนชั้นหนึ่ง
 * @param key ชื่อส่วน หรือ '^ชื่อส่วน' = ทุกที่ "ยกเว้น" ส่วนนั้น
 */
function regionMask(k, key) {
  const id = k + '|' + key;
  const got = maskCache.get(id);
  if (got) return got;

  const src = layerPick(k);
  const cv = document.createElement('canvas');
  cv.width = src.width;
  cv.height = src.height;
  const g = cv.getContext('2d');
  const out = g.createImageData(src.width, src.height);
  const a = src.data, b = out.data;
  const flip = key.startsWith('^');
  const want = flip ? key.slice(1) : key;
  for (let i = 0; i < a.length; i += 4) {
    const reg = regionAt(a[i], a[i + 1], a[i + 2], a[i + 3]);
    const inside = !!reg && reg.key === want;
    // แบบ "ยกเว้น" ต้องทึบนอกตัวน้องด้วย ไม่ใช่แค่ในตัว — มันคือหน้ากากที่มีไว้
    // เจาะรูตรงส่วนเดียว ส่วนที่เหลือต้องปล่อยผ่านหมดเหมือนไม่มีหน้ากาก
    if (flip ? inside : !inside) continue;
    b[i] = b[i + 1] = b[i + 2] = b[i + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  maskCache.set(id, cv);
  return cv;
}

/**
 * รอยแปรงลงชิ้นไหน — หัวมาก่อนลำตัวเพราะหัวทับลำตัวอยู่ตรงคอ
 * คืน null ถ้าอยู่นอกทั้งสองชิ้น (แปรงจะไม่ทิ้งรอยลอยอยู่ข้างตัว)
 */
function layerAt(pt) {
  const hx = pt.x - HEAD_AT.x, hy = pt.y - HEAD_AT.y;
  const d2 = hx * hx + hy * hy;

  // ── ทำไมไม่เผื่อรัศมีรอบหัวเป็นวงกลมแล้ว ──
  // ของเดิมยกวงรัศมี 21 รอบหัวให้เป็นชั้นหัวทั้งหมด เพื่อจะได้ทาหูติด
  // แต่ชั้นหัว "แสดงผล" แค่ในวงรัศมี 13 กับรูปสามเหลี่ยมหูเท่านั้น
  // ช่วงระหว่าง 13 ถึง 21 จึงเป็นเขตตาย — รอยแปรงถูกเก็บลงชั้นหัวจริง
  // แต่ไม่มีวันถูกวาดออกมา และวงนั้นแผ่ลงล่างไปคลุมพุงพอดี
  // ผลคือมีแถบขาวใต้คางที่ "ทาเท่าไหร่ก็ไม่ติด" ทั้งที่ผู้เล่นลากผ่านแล้ว
  //
  // เผื่อเฉพาะด้านบนซึ่งเป็นที่อยู่ของหูจริง ๆ ด้านล่างไม่เผื่อเลย
  // จุดใต้คางจึงตกไปเป็นของชั้นลำตัว ซึ่งเป็นชั้นที่วาดพุงออกมาจริง
  if (d2 <= HEAD_R * HEAD_R) return { key: 'head', x: hx, y: hy };
  const hb = LAYER.head;
  if (hy < 0 && hx >= hb.x && hx <= hb.x + hb.w && hy >= hb.y) {
    return { key: 'head', x: hx, y: hy };
  }
  // ── ทำไมไม่เช็ควงรีลำตัวแล้ว ──
  // ของเดิมรับเฉพาะในวงรี ทำให้ระบาย หาง ขา อุ้งเท้า ไม่ติดเลยสักจุด
  // ตอนนี้รับทั้งกรอบของชั้นลำตัว แล้วปล่อยให้ตอนวาดเป็นคนตัดสินว่าสีไปโผล่ตรงไหน
  // (paintOver ตัดตามทรงลำตัว ส่วน paintStroke ทาตามเส้นหางกับขา)
  const b = LAYER.body;
  if (pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h) {
    return { key: 'body', x: pt.x, y: pt.y };
  }
  return null;
}

/** ส่วนที่อยู่ใต้จุดที่แตะ — คืน null ถ้าแตะนอกตัวน้อง */
function regionUnder(ev) {
  const r = paintCat.getBoundingClientRect();
  const pt = ev.touches?.[0] || ev.changedTouches?.[0] || ev;
  const x = Math.round((pt.clientX - r.left) / r.width * pickCv.width);
  const y = Math.round((pt.clientY - r.top) / r.height * pickCv.height);
  if (x < 0 || y < 0 || x >= pickCv.width || y >= pickCv.height) return null;
  const d = pickCv.getContext('2d', { willReadFrequently: true })
    .getImageData(x, y, 1, 1).data;
  return regionAt(d[0], d[1], d[2], d[3]);
}

function pushHistory() {
  // เก็บทั้งจานสีและรอยแปรง เพราะ "ย้อนกลับ" ต้องย้อนได้ทั้งสองแบบ
  // ไม่งั้นกดย้อนหลังจากลากพู่กันแล้วสีส่วนกลับ แต่รอยแปรงยังอยู่ ซึ่งงงมาก
  paintHistory.push({ pal: { ...palette() }, layers: snapshotLayers() });
  if (paintHistory.length > 30) paintHistory.shift();
}

/**
 * ลงสีหนึ่งครั้ง
 * แต่ละเครื่องมือต่างกันแค่ "ลงกี่ส่วน" กับ "ลงสีอะไร" ไม่ได้ต่างกันที่วิธีวาด
 */
function applyPaint(region, snap) {
  if (!region) return false;
  const pal = palette();

  if (paintTool === 'dropper') {
    // ดูดสีจากส่วนที่แตะมาเป็นสีปัจจุบัน แล้วเด้งกลับไปเป็นพู่กันให้เลย
    // ไม่งั้นต้องกดสลับเครื่องมือเองทุกครั้งซึ่งน่ารำคาญ
    paintColor = pal[region.key];
    document.getElementById('paintFree').value = paintColor;
    setTool('brush');
    refreshSwatches();
    return false;
  }

  const want = paintTool === 'eraser' ? BLANK[region.key] : paintColor;

  // ── ลงทั้งตัว ──
  // ดักไว้ตรงนี้จุดเดียว เครื่องมือทุกตัวจึงได้พฤติกรรมนี้เหมือนกันหมด
  // (ยางลบในโหมดนี้ = ล้างทั้งตัวกลับเป็นน้องโล้น ซึ่งตรงกับที่คนคาดหวัง)
  if (paintScope === 'all') {
    const same = REGIONS.every((r) => pal[r.key] === (paintTool === 'eraser' ? BLANK[r.key] : want));
    if (same) return false;
    if (snap) pushHistory();
    for (const r of REGIONS) paint(r.key, paintTool === 'eraser' ? BLANK[r.key] : want);
    return true;
  }

  // ── ถังสี = เทลงเฉพาะส่วนที่เล็งไว้ส่วนเดียว ──
  //
  // ของเดิมเทลงทุกส่วนที่ "บังเอิญสีเดียวกับส่วนที่แตะ" พร้อมกัน ซึ่งพังตรงที่
  // น้องโล้นตั้งแก้มกับหูในไว้สีเดียวกันพอดี (#F6DCDC ทั้งคู่) เทแก้มทีเดียว
  // หูในจึงเปลี่ยนตามไปด้วยทุกครั้ง — เป็นอาการที่ทักมา
  //
  // และไม่ใช่แค่สองช่องนั้น กฎเดิมผูกส่วนที่ไม่เกี่ยวกันเข้าด้วยกันเองทุกครั้ง
  // ที่ผู้เล่นบังเอิญเลือกสีซ้ำกัน โดยไม่มีอะไรบอกล่วงหน้าว่าจะโดนส่วนไหนบ้าง
  // ถังสีเลยกลายเป็นเครื่องมือที่เดาผลไม่ได้ ทั้งที่งานของมันคือ "เทให้เต็มส่วน"
  // ซึ่งต่างจากพู่กันที่ทาเฉพาะตรงที่ลากอยู่แล้ว ไม่ต้องพ่วงส่วนอื่นมาให้ด้วย
  if (pal[region.key] === want) return false;
  if (snap) pushHistory();
  paint(region.key, want);
  return true;
}

function paintAt(ev, snap) {
  // เลือกส่วนจากรายชื่อไว้แล้วก็ใช้ส่วนนั้นเลย ไม่ต้องเล็งให้ตรง
  const region = paintPart || regionUnder(ev);
  if (applyPaint(region, snap)) {
    drawPaintCat();
    refreshParts();
    refreshHome();
  }
}

// ── พู่กัน: ลากเส้นจริงลงชั้นรอยแปรง ─────────────────────
// ต่างจากถังสีตรงที่ลงเฉพาะตรงที่นิ้วผ่านจริง ไม่ได้เททั้งส่วน
// จุดก่อนหน้าเก็บไว้เพื่อลากเป็นเส้นต่อกัน ไม่งั้นลากเร็ว ๆ จะได้รอยขาดเป็นจุด ๆ
let brushPrev = null;

// ── ขนาดหัวแปรง ──
// เก็บเป็น "หน่วยพิกัดตัวละคร" ไม่ใช่พิกเซลหน้าจอ ขนาดที่เลือกไว้จึงให้ผลเท่าเดิม
// ไม่ว่าจะระบายบนคอมจอใหญ่หรือมือถือจอเล็ก (ลำตัวกว้าง 28 หน่วย หัวกว้าง 26)
//
// จำแยกกันสองค่า — คนตั้งพู่กันเล็กไว้เก็บรายละเอียด พอสลับไปยางลบมักอยากได้อันใหญ่
// ใช้ค่าเดียวกันจะต้องมานั่งปรับกลับไปกลับมาทุกครั้งที่สลับเครื่องมือ
const SIZE_STEP = 10;   // ค่าบนแถบเลื่อนหารด้วยเท่านี้ = รัศมีจริง
const brushSize = { brush: 1.5, eraser: 2.2 };

/** รัศมีหัวแปรงของเครื่องมือที่ใช้อยู่ */
function toolRadius() {
  return brushSize[paintTool === 'eraser' ? 'eraser' : 'brush'];
}

// ส่วนที่ล็อกไว้ระหว่างลากหนึ่งเส้นในโหมดทีละส่วน
// ล็อกจากจุดที่เริ่มลาก ไม่ใช่เช็คใหม่ทุกจุด ไม่งั้นลากออกนอกส่วนแล้ววกกลับ
// มันจะเปลี่ยนเป้าหมายกลางคันโดยที่ผู้เล่นไม่ได้ตั้งใจ
let strokeRegion = null;

function brushAt(ev, first) {
  // ── โหมดทีละส่วน: ล็อกส่วนเป้าหมายไว้ตั้งแต่จุดแรกที่แตะโดนส่วนใดส่วนหนึ่ง ──
  // ล็อกไว้ ไม่ได้เช็คใหม่ทุกจุด ไม่งั้นลากออกนอกส่วนแล้ววกกลับ มันจะเปลี่ยน
  // เป้าหมายกลางคันโดยที่ผู้เล่นไม่ได้ตั้งใจ
  if (paintScope === 'part' && !strokeRegion) {
    strokeRegion = paintPart || regionUnder(ev);
  }

  // ── ตากับจมูก: ลงทั้งส่วนรวดเดียว ไม่ใช่ลากทีละรอย ──
  // สองอย่างนี้ถูกวาดทับ "หลัง" ชั้นรอยแปรง รอยที่ลากลงไปจึงไม่มีวันโผล่ออกมา
  // (ดูเหตุผลที่ flat ใน REGIONS) ถ้าปล่อยให้ลากไปเฉย ๆ คนเลือกแล้วลากจะไม่เห็น
  // อะไรเกิดขึ้นเลย ซึ่งแย่กว่าตอนที่สีล้นเสียอีก
  //
  // เช็คก่อนหาว่าลงชิ้นไหน เพราะการลงทั้งส่วนไม่ต้องเล็งให้ตรง — กติกาเดียวกับ
  // ถังสีตอนเลือกส่วนไว้แล้ว (applyPaint จะคืน false เองถ้าสีตรงกันอยู่แล้ว
  // การลากยาว ๆ จึงเทสีแค่ครั้งเดียว ไม่ได้เทซ้ำทุกเฟรม)
  if (paintScope === 'part' && strokeRegion?.flat) {
    brushPrev = null;
    if (applyPaint(strokeRegion, false)) {
      drawPaintCat();
      refreshParts();
      refreshHome();
    }
    return;
  }

  const pt = localAt(ev);
  const hit = layerAt(pt);
  // ออกนอกตัวแล้วตัดเส้น ไม่ใช่ลากข้ามอากาศไปโผล่อีกฝั่ง
  if (!hit) { brushPrev = null; return; }

  // ── สีติดได้เฉพาะในรูปร่างของส่วนเป้าหมาย ──
  //
  // บังคับด้วยหน้ากาก ไม่ใช่ด้วยการเช็คว่าปลายนิ้วอยู่ในส่วนไหน
  // การเช็คปลายนิ้วบอกได้แค่ตำแหน่ง "จุดกึ่งกลางหัวแปรง" แต่หัวแปรงเป็นวงกลม
  // ที่กว้างกว่านั้นมาก สีจึงล้นออกนอกส่วนไปเสมอ — ซึ่งคืออาการที่ทักมา
  //
  // ผลพลอยได้: ลากผ่านส่วนอื่นแล้ววกกลับมาได้โดยเส้นไม่ขาด เพราะช่วงที่อยู่
  // นอกส่วนถูกหน้ากากกินทิ้งไปเอง ไม่ต้องตัดเส้นทิ้งเหมือนเดิม
  let mask = null;
  if (paintScope === 'part') {
    if (!strokeRegion) { brushPrev = null; return; }
    mask = regionMask(hit.key, strokeRegion.key);
  } else if (hit.key === 'head') {
    // ── ลงสีทั้งตัว: ละเลงข้ามส่วนได้อิสระ ยกเว้นหนวด ──
    // หนวดเป็นเส้นบางที่วาดทับหน้าอยู่ ถ้าโดนละเลงไปด้วย มันจะกลายเป็นสีเดียว
    // กับหน้าแล้วหายไปทั้งชุด เหลือแมวหน้าเกลี้ยงที่อ่านไม่ออกว่าเป็นแมว
    // เจาะรูไว้เฉพาะเส้นหนวด ที่เหลือปล่อยผ่านหมดเหมือนไม่มีหน้ากาก
    mask = regionMask('head', '^whisker');
  }
  // ชั้นลำตัวไม่มีหนวด จึงไม่ต้องใส่หน้ากากเลย

  // ข้ามชิ้นกันไม่ได้ ต้องเริ่มเส้นใหม่ ไม่งั้นเส้นจะพุ่งข้ามจากหัวไปตัวเป็นทางยาว
  if (brushPrev && brushPrev.key !== hit.key) brushPrev = null;

  const from = brushPrev || hit;
  const rad = toolRadius();
  if (paintTool === 'eraser') eraseLayer(hit.key, from.x, from.y, hit.x, hit.y, rad, mask);
  else strokeLayer(hit.key, from.x, from.y, hit.x, hit.y, paintColor, rad, mask);
  brushPrev = hit;

  drawPaintCat();
  if (first) refreshHome();
}

let painting = false;
paintCat.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  // ไม่มีเสียงตรงนี้ต่างจากปุ่มอื่นในหน้า — การระบายเป็นการลาก ไม่ใช่การกดปุ่ม
  // ถ้าดังทุกครั้งที่แตะจะรัวเป็นชุดจนน่ารำคาญ
  unlockAudio();
  painting = true;
  // ลงสีก่อน ค่อยจับตัวชี้ทีหลัง และต้องครอบ try ไว้ด้วย
  //
  // setPointerCapture โยน NotFoundError ได้ถ้า id ของตัวชี้ไม่ใช่ตัวที่กดอยู่จริง
  // ซึ่ง ?. กันไม่ได้เลย มันกันแค่กรณี "ไม่มีเมธอดนี้" ไม่ได้กันการโยน
  // ตอนอยู่บรรทัดบน ข้อผิดพลาดตรงนี้ทำให้ไม่ได้ลงสีเลยสักครั้งโดยไม่มีอะไรฟ้อง
  pushHistory();
  brushPrev = null;
  // ── สองโหมดนี้ต่างกันที่ "ขอบเขตของพู่กัน" ไม่ใช่ที่ "เทหรือทา" ──
  // ทั้งคู่ใช้พู่กันลากเหมือนกัน ต่างกันตรงโหมดทีละส่วนจะทาไม่ข้ามออกนอกส่วนที่เล็งไว้
  // ส่วนโหมดทั้งตัวละเลงข้ามส่วนได้อิสระ — ถังสียังอยู่ที่ปุ่มถังสีเหมือนเดิม
  strokeRegion = null;
  if (paintTool === 'brush' || paintTool === 'eraser') brushAt(e, true);
  else paintAt(e, false);
  try { paintCat.setPointerCapture(e.pointerId); } catch { /* ลากต่อไม่ได้ก็ยังแตะได้ */ }
});
paintCat.addEventListener('pointermove', (e) => {
  // ลากได้เฉพาะพู่กันกับยางลบ ถังสี/หลอดดูดเป็นการกดทีละครั้ง
  if (painting && (paintTool === 'brush' || paintTool === 'eraser')) brushAt(e, false);
});
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
  paintCat.addEventListener(ev, () => {
    strokeRegion = null;
    if (painting && (paintTool === 'brush' || paintTool === 'eraser')) {
      // บันทึกตอนปล่อยนิ้วครั้งเดียว ไม่ใช่ทุกจุดที่ลาก — toDataURL หนักพอที่จะ
      // ทำให้การลากกระตุกถ้าเรียกทุกเฟรม (ดูคอมเมนต์ saveLayers ใน paint.js)
      saveLayers();
      refreshHome();
    }
    painting = false;
    brushPrev = null;
  });
}

/**
 * ปรับหน้าตาแถบขนาดให้ตรงกับเครื่องมือที่ใช้อยู่
 *
 * ซ่อนทั้งแถบตอนใช้ถังสี/หลอดดูด เพราะสองอันนั้นไม่มี "หัวแปรง" ให้ปรับ
 * แถบที่ปรับแล้วไม่มีอะไรเกิดขึ้นสร้างความสับสนมากกว่าไม่มีแถบเลย
 */
function refreshSize() {
  const row = document.getElementById('paintSizeRow');
  const on = paintTool === 'brush' || paintTool === 'eraser';
  row.style.display = on ? '' : 'none';
  if (!on) return;

  const r = toolRadius();
  document.getElementById('paintSize').value = String(Math.round(r * SIZE_STEP));
  const dot = document.getElementById('paintSizeDot');
  // จุดตัวอย่างโตตามค่าจริง แต่มีเพดานไม่ให้ล้นวงกรอบ
  dot.style.setProperty('--dot', Math.min(26, 4 + r * 4.4).toFixed(1) + 'px');
  dot.style.setProperty('--dotc', paintTool === 'eraser' ? 'rgba(255,246,230,.55)' : paintColor);
}

document.getElementById('paintSize').addEventListener('input', (e) => {
  brushSize[paintTool === 'eraser' ? 'eraser' : 'brush'] = Number(e.target.value) / SIZE_STEP;
  refreshSize();
});

// คำใบ้ต้องบอกทั้งเครื่องมือและขอบเขต ไม่งั้นคนกด "ลงสีทั้งตัว" แล้วไม่รู้ว่าเปลี่ยนอะไรไป
function refreshHint() {
  if (paintScope === 'all' && (paintTool === 'brush' || paintTool === 'eraser')) {
    paintHint.textContent = paintTool === 'eraser'
      ? 'ลากลบได้ทั่วตัวน้อง ไม่จำกัดส่วน' : 'ลากระบายได้ทั่วตัวน้อง ไม่จำกัดส่วน';
    return;
  }
  if (paintScope === 'part' && (paintTool === 'brush' || paintTool === 'eraser')) {
    // ── บอกชื่อของทุกชิ้นที่ส่วนนี้คุมอยู่ ──
    // ชื่อบนปุ่มสั้นเพราะช่องแคบ ที่ว่างใต้ผ้าใบยาวพอจะกางรายการเต็มได้
    // ไม่งั้นคนเลือก "ขา+แขน" ก็ยังไม่รู้ว่ามันคือขาสองข้างหรือสี่ข้าง
    if (paintPart?.flat) {
      paintHint.textContent = 'แตะเพื่อลงสี ' + paintPart.hint.split(' —')[0] + ' ทั้งส่วน';
      return;
    }
    if (paintPart) {
      paintHint.textContent = (paintTool === 'eraser' ? 'ลากลบได้เฉพาะ ' : 'ลากระบายได้เฉพาะ ')
        + paintPart.hint;
      return;
    }
    paintHint.textContent = paintTool === 'eraser'
      ? 'ลากลบ เฉพาะในส่วนที่เริ่มลาก' : 'ลากระบาย สีจะติดเฉพาะในส่วนที่เริ่มลาก';
    return;
  }
  paintHint.textContent = paintTool === 'dropper' ? 'แตะส่วนที่อยากดูดสี'
    : paintTool === 'eraser' ? 'ลากเพื่อลบรอยพู่กันที่ระบายไว้'
    : paintTool === 'bucket' ? 'แตะเพื่อเทสีลงทั้งส่วนนั้น'
    : 'ลากบนตัวน้องเพื่อระบายสีตามรอยพู่กัน';
}

function setTool(name) {
  paintTool = name;
  for (const b of document.querySelectorAll('#paintTools .ptool')) {
    b.classList.toggle('on', b.dataset.tool === name);
  }
  refreshHint();
  refreshSize();
}
function setScope(name) {
  paintScope = name;
  for (const b of document.querySelectorAll('#paintModes .pmode')) {
    b.classList.toggle('on', b.dataset.mode === name);
  }
  // เลือกส่วนไว้แล้วสั่งทาทั้งตัวมันขัดกันเอง ปลดล็อกให้เลย
  if (name === 'all') { paintPart = null; refreshParts(); }
  strokeRegion = null;
  refreshHint();
}
document.getElementById('paintModes').addEventListener('click', (e) => {
  const b = e.target.closest('.pmode');
  if (b) { unlockAudio(); sfx.fish(); setScope(b.dataset.mode); }
});

document.getElementById('paintTools').addEventListener('click', (e) => {
  const b = e.target.closest('.ptool');
  if (b) { unlockAudio(); sfx.fish(); setTool(b.dataset.tool); }
});

function refreshSwatches() {
  for (const b of document.querySelectorAll('#paintSwatches .pswatch')) {
    b.classList.toggle('on', b.dataset.color.toLowerCase() === paintColor.toLowerCase());
  }
  refreshSize();   // จุดตัวอย่างขนาดหัวแปรงใช้สีปัจจุบัน ต้องเปลี่ยนตามด้วย
}

function buildSwatches() {
  const box = document.getElementById('paintSwatches');
  box.innerHTML = '';
  for (const hex of SWATCHES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pswatch';
    b.dataset.color = hex;
    b.style.background = hex;
    b.setAttribute('aria-label', 'สี ' + hex);
    b.addEventListener('click', () => {
      unlockAudio(); sfx.fish();
      paintColor = hex;
      document.getElementById('paintFree').value = hex;
      // หยิบสีแล้วต้องกลับมาเป็นพู่กัน ไม่งั้นเลือกสีทั้งทีแต่ยังค้างที่ยางลบอยู่
      if (paintTool === 'eraser' || paintTool === 'dropper') setTool('brush');
      refreshSwatches();
    });
    box.appendChild(b);
  }
  refreshSwatches();
}

document.getElementById('paintFree').addEventListener('input', (e) => {
  paintColor = e.target.value;
  if (paintTool === 'eraser' || paintTool === 'dropper') setTool('brush');
  refreshSwatches();
});

/** รายชื่อส่วน พร้อมสีปัจจุบันของแต่ละส่วน — กดเพื่อล็อกเป้าไว้ */
function refreshParts() {
  const box = document.getElementById('paintParts');
  const pal = palette();
  if (box.children.length !== REGIONS.length) {
    box.innerHTML = '';
    for (const r of REGIONS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ppart';
      b.dataset.key = r.key;
      b.innerHTML = '<i></i><span></span>';
      b.querySelector('span').textContent = r.name;
      b.title = r.hint;
      b.addEventListener('click', () => {
        unlockAudio(); sfx.fish();
        // กดซ้ำที่เดิม = ปลดล็อก กลับไปเล็งเอาจากที่แตะบนตัวน้อง
        paintPart = paintPart && paintPart.key === r.key ? null : r;
        // เลือกส่วนเจาะจง = ตั้งใจลงทีละส่วน เด้งออกจากโหมดทั้งตัวให้เลย
        if (paintPart && paintScope === 'all') setScope('part');
        // ส่วนที่ค้างจากการลากรอบก่อนต้องทิ้ง ไม่งั้นการลากครั้งถัดไปยังเล็ง
        // ส่วนเดิมอยู่ ทั้งที่เพิ่งกดเลือกส่วนใหม่ไปหมาด ๆ
        strokeRegion = null;
        // ส่วนแบนลงทั้งส่วนอยู่แล้ว ไม่ต้องใช้หน้ากาก
        if (paintPart && !paintPart.flat) warmMask(paintPart.key);
        refreshParts();
        refreshHint();
      });
      box.appendChild(b);
    }
  }
  for (const b of box.children) {
    const key = b.dataset.key;
    b.querySelector('i').style.background = pal[key];
    b.classList.toggle('on', !!paintPart && paintPart.key === key);
  }
}

document.getElementById('paintUndo').addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  const prev = paintHistory.pop();
  if (!prev) return;
  // ย้อนทั้งสองอย่างพร้อมกัน — จานสีกับรอยแปรงถูกเก็บคู่กันไว้ใน pushHistory()
  setPalette(prev.pal);
  restoreLayers(prev.layers);
  drawPaintCat();
  refreshParts();
  refreshHome();
});

document.getElementById('paintRandom').addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  pushHistory();
  // สุ่มจากแม่สีที่ให้ไว้ ไม่ได้สุ่มจากทั้งวงล้อสี เพราะสุ่มอิสระแล้วได้แมวสีมั่ว
  // เกือบทุกครั้ง ส่วนแม่สีชุดนี้ผสมกันยังไงก็ยังอ่านเป็นแมวอยู่
  const pick = () => SWATCHES[Math.floor(Math.random() * SWATCHES.length)];
  const next = {};
  for (const r of REGIONS) next[r.key] = pick();
  setPalette(next);
  drawPaintCat();
  refreshParts();
  refreshHome();
});

document.getElementById('paintClear').addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  pushHistory();
  setPalette(BLANK);
  // "ล้างสี" ต้องล้างรอยพู่กันด้วย ไม่งั้นกดล้างแล้วยังเหลือรอยเปื้อนอยู่เต็มตัว
  clearLayers();
  drawPaintCat();
  refreshParts();
  refreshHome();
});

document.getElementById('paintUse').addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  setSkin(CUSTOM_ID);
  sfx.fish();
  refreshHome();
  refreshCreate();
});

/** ปุ่ม "ใช้น้องตัวนี้" ต้องบอกได้ว่าตอนนี้ใช้อยู่แล้วหรือยัง */
function refreshCreate() {
  const using = getSkin().id === CUSTOM_ID;
  const btn = document.getElementById('paintUse');
  btn.textContent = using ? 'กำลังใช้น้องตัวนี้อยู่' : 'ใช้น้องตัวนี้';
  btn.disabled = using;
  refreshParts();
  refreshSwatches();
  drawPaintCat();
  drawPickMap();
}

// ── สลับสองโหมด ──
function setCreateTab(which) {
  const onPaint = which === 'paint';
  // โหมดเต็มจอทำไว้ให้ผ้าใบระบายสีโดยเฉพาะ ไปแท็บรูปเมื่อไหร่ต้องย่อกลับก่อน
  if (!onPaint) createPanel.classList.remove('paint-full');
  document.getElementById('paintWrap').classList.toggle('hidden', !onPaint);
  document.getElementById('faceWrap').classList.toggle('hidden', onPaint);
  document.getElementById('tabPaint').classList.toggle('on', onPaint);
  document.getElementById('tabFace').classList.toggle('on', !onPaint);
  document.getElementById('createTitle').textContent = onPaint ? 'ระบายสีน้อง' : 'หน้าน้องแมว';
  if (onPaint) { drawPaintCat(); drawPickMap(); }
}
/** ไอคอนกากบาท — เส้นหนาปลายมนชุดเดียวกับลูกศรย้อนกลับใน index.html */
const CLOSE_ICON = '<svg viewBox="0 0 24 24" width="60%" height="60%" aria-hidden="true">'
  + '<path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" fill="none" stroke="currentColor"'
  + ' stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// ── ขยายเต็มจอ ──
// แค่ติดคลาสที่แผง ที่เหลือเป็นเรื่องของ CSS ล้วน ๆ ไม่ได้ย้าย DOM หรือสร้างหน้าใหม่
// เครื่องมือทุกตัวจึงยังต่อสายเดิมอยู่ ไม่ต้องผูก event ซ้ำและไม่มีสถานะให้หลุด
//
// ต้องวาดผ้าใบใหม่หลังสลับ เพราะขนาดที่แสดงเปลี่ยนไป และผ้าใบรหัสสีที่ใช้ตรวจ
// ว่านิ้วแตะโดนส่วนไหนต้องตรงกับที่ตาเห็นเสมอ ไม่งั้นจะแตะเหลื่อม
function setPaintMax(on) {
  createPanel.classList.toggle('paint-full', on);
  // ปุ่มย่อมีเฉพาะโหมดเต็มจอ ออกจากโหมดนี้แล้วต้องคืนแถบให้เสมอ
  // ไม่งั้นจะค้างสถานะย่อโดยที่ไม่มีปุ่มให้กดกางกลับ — เครื่องมือหายไปทั้งแถบ
  if (!on) setFold(false);
  const b = document.getElementById('paintMax');
  // ในโหมดเต็มจอปุ่มนี้ทำหน้าที่ "ปิด" ตามแบบที่วางไว้ ไม่ใช่ "ย่อ"
  // เพราะโหมดเต็มจอซ่อนปุ่มกลับไปแล้ว มันจึงเป็นทางออกทางเดียวของหน้านี้
  // ── ทำไมตอนเต็มจอเป็น SVG ไม่ใช่ตัวอักษร ──
  // ปุ่มนี้ตอนเต็มจอใช้เทมเพลตเดียวกับปุ่มย้อนกลับ ซึ่งวาดไอคอนด้วยเส้น SVG
  // หนา 3 หน่วย ปลายมน ตัวอักษร ✕ ของฟอนต์เส้นบางกว่าและปลายตัด
  // วางคู่กันแล้วจะเห็นว่าเป็นไอคอนคนละชุด ทั้งที่ปุ่มหน้าตาเหมือนกันเป๊ะ
  b.innerHTML = on ? CLOSE_ICON : '⛶';
  b.setAttribute('aria-label', on ? 'ปิดโหมดเต็มจอ' : 'ขยายเต็มจอ');
  b.title = b.getAttribute('aria-label');
  requestAnimationFrame(() => { drawPaintCat(); drawPickMap(); });
}
document.getElementById('paintMax').addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  setPaintMax(!createPanel.classList.contains('paint-full'));
});

// ── ย่อแถบข้าง ──
// ทำงานทั้งโหมดธรรมดาและโหมดเต็มจอ เพราะคลาสติดที่แผง ไม่ได้อิงโหมด
//
// ปุ่มเดียวยุบทั้งสองคอลัมน์ — เคยแยกสองปุ่มแล้วกลายเป็นสิบหกกรณี
// (สองสถานะ × สองโหมด × สองช่วงจอ) ซึ่งคุมตำแหน่งปุ่มให้ถูกทุกกรณีไม่ไหว
//
// ต้องวาดใหม่หลังสลับ ด้วยเหตุผลเดียวกับ setPaintMax: ขนาดที่แสดงเปลี่ยน
// และผ้าใบรหัสสีที่ใช้ตรวจว่านิ้วแตะส่วนไหนต้องตรงกับที่ตาเห็นเสมอ
function setFold(on) {
  const btn = document.getElementById('foldSide');
  createPanel.classList.toggle('fold-side', on);
  btn.setAttribute('aria-expanded', String(!on));
  btn.setAttribute('aria-label', on
    ? 'กางแถบเครื่องมือกับจานสี'
    : 'ย่อแถบเครื่องมือกับจานสี');
  requestAnimationFrame(() => { drawPaintCat(); drawPickMap(); });
}

document.getElementById('foldSide').addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  setFold(!createPanel.classList.contains('fold-side'));
});

document.getElementById('faceRotReset').addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  const r = document.getElementById('faceRot');
  r.value = '0';
  r.dispatchEvent(new Event('input', { bubbles: true }));
});

document.getElementById('tabPaint').addEventListener('click', () => {
  unlockAudio(); sfx.fish(); setCreateTab('paint');
});
document.getElementById('tabFace').addEventListener('click', () => {
  unlockAudio(); sfx.fish(); setCreateTab('face');
});

// ── ปุ่มของระบบสมบัติ ──────────────────────────────────────

document.getElementById('tdBack').addEventListener('click', () => {
  swapPanel(tDetailPanel, tFrom || stashPanel);
  if (tFrom === stashPanel) refreshStash();
  else paintLoadout();
});
document.getElementById('tdEquip').addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  const r = toggleEquip(tCurrent);
  if (!r.ok) {
    sfx.shieldBreak();
    setMsg(document.getElementById('tdMsg'), r.reason, true);
    return;
  }
  sfx.fish();
  setMsg(document.getElementById('tdMsg'), r.equipped ? 'ติดตั้งแล้ว' : 'ถอดออกแล้ว');
  paintDetail();
  // ตัวเลขบนปุ่มหน้าเลือกด่านกับไอคอนในล็อบบี้ต้องตามทันที
  // ไม่ใช่รอจนกลับไปล็อบบี้แล้วค่อยอัปเดต
  refreshEquipCount();
  paintStashIcon();
});
document.getElementById('tdUpgrade').addEventListener('click', () => {
  unlockAudio(); sfx.fish();

  // ยังไม่มีชิ้นนี้: พาไปตู้กาช่าช่องสุ่มสมบัติเลย
  // ปิดหน้ารายละเอียดเองแทน swapPanel เพราะหน้าที่เปิดมันมา (รายการสมบัติ
  // หรือหน้าติดตั้ง) จะโผล่ค้างอยู่ใต้หน้าตู้กาช่าที่กำลังจะเปิด
  if (!ownsTreasure(tCurrent)) {
    tDetailPanel.classList.add('hidden');
    showGacha(true, 'treasure');
    return;
  }

  openUpgrade();
});

document.getElementById('upBack').addEventListener('click', () => {
  // ออกกลางช่วงชาร์จ: ต้องยกเลิกคิวด้วย ไม่งั้นผลจะไปเด้งในแผงที่ปิดไปแล้ว
  // แล้วค้างรออยู่อย่างนั้นจนกว่าจะเข้ามาใหม่ (ทองหักไปแล้วตั้งแต่ตอนกด ไม่มีอะไรหาย)
  // รอบตีรัวต้องหยุดด้วยเหตุผลเดียวกัน แต่หนักกว่า — มันจะหักทองต่อไปเรื่อย ๆ
  // ทั้งที่ผู้เล่นออกจากหน้าไปแล้วและมองไม่เห็นว่ากำลังเสียทองอยู่
  stopAuto();
  resetUpgradeAnim();
  swapPanel(upPanel, tDetailPanel);
  paintDetail();   // ขั้นอาจเพิ่งขึ้น ต้องวาดใหม่ ไม่ใช่โชว์ค่าเก่า
});
document.getElementById('upGo').addEventListener('click', doUpgrade);
document.getElementById('upAuto').addEventListener('click', toggleAuto);

document.getElementById('loadoutOpen').addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  showLoadout(true);
});
document.getElementById('loadBack').addEventListener('click', () => showLoadout(false));
document.getElementById('btnGacha').addEventListener('click', () => {
  unlockAudio(); startMusic();
  showGacha(true);
});
document.getElementById('gachaBack').addEventListener('click', () => showGacha(false));

// ── สลับช่องสมบัติ/สกิน ──
document.getElementById('tabTreasure').addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  setTab('treasure');
});
document.getElementById('tabSkin').addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  setTab('skin');
});

// หน้ารายการของทั้งตู้ — เข้าจากปุ่ม "ดูอื่นๆ" มุมขวาบนของกรอบตู้
document.getElementById('gachaMore').addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  showGList(true);
});
document.getElementById('glBack').addEventListener('click', () => showGList(false));

// อัตราการสุ่มซ่อนอยู่ใต้ปุ่ม ! — เปิดค้างไว้ไม่ได้ เพราะมันบังปุ่มสุ่มข้างใต้
const oddsPop = document.getElementById('oddsPop');
const showOdds = (on) => oddsPop.classList.toggle('hidden', !on);
document.getElementById('oddsBtn').addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  sfx.fish();
  showOdds(oddsPop.classList.contains('hidden'));
});
document.getElementById('oddsClose').addEventListener('click', () => showOdds(false));

// กล่องผลสุ่มคลุมทั้งการ์ดไว้ ปิดไม่ได้ = ค้างจนต้องรีเฟรชหน้า
// จึงรับทั้งปุ่ม "ตกลง" และการแตะที่ไหนก็ได้บนกล่อง เผื่อผู้เล่นแตะมั่ว ๆ ก่อน
const gotBox = document.getElementById('gachaResult');
gotBox.addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  sfx.fish();
  closeResult();
});
document.getElementById('btnRank').addEventListener('click', () => {
  unlockAudio(); startMusic();
  showRank(true);
});
document.getElementById('rankBack').addEventListener('click', () => showRank(false));
// จำนวนครั้งของปุ่มใบที่สองต่างกันคนละช่อง (สมบัติ 3 / ชุด 5) จึงถามจากช่องที่เปิดอยู่
document.getElementById('pull1').addEventListener('click', () => doPull(1));
document.getElementById('pull5').addEventListener('click', () => doPull(gMulti()));
document.getElementById('homeBtn').addEventListener('click', () => { sfx.quit(); goHome(); });

// ── เลิกเล่น = จบตานั้นจริง ๆ ไม่ใช่ทิ้ง ──
//
// เดิมกดแล้วเด้งกลับหน้าแรกเลย ตาที่เพิ่งเล่นจึงหายไปเงียบ ๆ ทั้งที่เล่นจบแล้ว
// ไม่ได้ XP ไม่ได้นับสถิติ และไม่มีหน้าสรุปให้ดูว่าทำได้เท่าไหร่
//
// ตอนนี้เดินทางเดียวกับตอนตาย: ปิดหน้าหยุด → ปิดรอบเล่น → เปิดหน้าสรุป
// ซึ่ง showGameOver() เป็นคนนับ XP กับสถิติให้เองอยู่แล้ว
//
// ต่างจากปุ่ม "เริ่มใหม่" ที่ยังไม่ตายแล้วกดทิ้งตานั้น — อันนั้นไม่ผ่านหน้านี้
// จึงไม่นับ ตามที่ตั้งใจ
document.getElementById('quitBtn').addEventListener('click', () => {
  sfx.quit();
  game.bankBest();
  pausePanel.classList.add('hidden');
  // ปุ่มบนแถบในจอต้องกลับเป็นรูปหยุด ไม่งั้นค้างเป็นสามเหลี่ยม "เล่นต่อ"
  // ทั้งที่ไม่มีรอบเล่นให้เล่นต่อแล้ว
  pauseBtn.classList.remove('playing');
  pauseBtn.setAttribute('aria-label', 'หยุดชั่วคราว');
  // ปิดรอบเล่นให้เรียบร้อยก่อนสรุป ไม่งั้นเกมยังค้างสถานะ "หยุดอยู่"
  // แล้วกด Space ในหน้าสรุปจะไปสั่งเล่นต่อรอบที่จบไปแล้ว
  game.state = STATE.DEAD;
  showGameOver(true);
});

refreshHome();

function countUp(el, target, ms, suffix = '') {
  const show = (n) => { el.textContent = n.toLocaleString('en-US') + suffix; };
  if (reduceMotion.matches || target <= 0) return show(target);

  const gen = countGen;
  const t0 = performance.now();
  const step = (now) => {
    if (gen !== countGen) return;   // มีหน้าสรุปรอบใหม่มาแล้ว รอบนี้ทิ้ง
    const p = Math.min(1, (now - t0) / ms);
    // ช้าลงตอนท้าย ตัวเลขจึงดู "ไต่เข้าหาค่าจริง" ไม่ใช่วิ่งเท่ากันหมดแล้วหยุดกึก
    show(Math.round(target * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * @param quit true = มาจากปุ่ม "เลิกเล่น" (เลือกจบเอง)
 *             false/ไม่ส่ง = ตายคาสนาม — onGameOver ของ game เรียกแบบไม่ส่งอาร์กิวเมนต์
 *             จึงตกมาที่ค่าปริยายนี้เอง
 */
/**
 * น้องตกหลุม — ถามก่อนว่าจ่ายทองดึงขึ้นมาไหม
 *
 * ── ทำไมทองไม่พอแล้วข้ามไปเลย ไม่ขึ้นกล่องให้ดู ──
 * กล่องที่กดยืนยันไม่ได้คือทางตัน ผู้เล่นที่เพิ่งตายต้องกดปิดอีกทีเปล่า ๆ
 * ก่อนจะได้เห็นหน้าสรุป ยอดทองอยู่บนหน้าแรกอยู่แล้ว ไม่ต้องมาบอกซ้ำตอนนี้
 *
 * ── ทำไมต้องอ่านยอดทองใหม่หลังกล่องปิด ──
 * เหตุผลเดียวกับ buySkin() — ระหว่างกล่องเปิดค้าง การซิงก์จากเครื่องอื่น
 * อาจหักทองไปแล้ว ถ้าเชื่อยอดที่อ่านไว้ตอนแรกจะหักจนติดลบได้
 */
async function askRevive() {
  // ราคาไต่ขึ้นทุกครั้งในตาเดียวกัน (ดู Game.reviveCost) จึงต้องอ่านจากเกม
  // ไม่ใช่จาก REVIVE.cost ตรง ๆ ซึ่งเป็นแค่ราคาฐานของครั้งแรก
  const cost = game.reviveCost;
  if (getGold() < cost) return showGameOver();

  // บอกว่าเป็นครั้งที่เท่าไหร่ตั้งแต่ครั้งที่สองเป็นต้นไป
  // ไม่งั้นผู้เล่นจะเห็นแค่ราคาที่แพงขึ้นเฉย ๆ แล้วอ่านเป็นบั๊คมากกว่าเป็นกติกา
  const nth = game.revives + 1;
  const ok = await confirmBox({
    title: 'น้องตกหลุม!',
    body: 'ดึงน้องขึ้นมาวิ่งต่อจากตรงนี้ไหม คะแนน ระยะทาง และของที่เก็บไว้ยังอยู่ครบ'
      + (nth > 1 ? ' — ครั้งที่ ' + nth + ' ของตานี้ ราคาขึ้นทุกครั้งที่ดึง' : ''),
    cost,
    after: 'ทองคงเหลือหลังใช้ ' + (getGold() - cost).toLocaleString('en-US'),
    okText: 'ดึงน้องขึ้นมา',
    cancelText: 'ไม่ดีกว่าเเง้',
    // จังหวะนี้เป็นจังหวะใหญ่ของตา ไม่ใช่กล่องยืนยันทั่วไป จึงใช้หน้าตาชุดเดียวกับหน้าจบรอบ
    look: 'card',
    // ไม่ส่ง art มาโดยตั้งใจ — รูปแมวตรงนี้เป็นตัวเดียวกับที่ผู้เล่นเพิ่งเห็นวิ่งอยู่
    // มันไม่ได้บอกอะไรที่ยังไม่รู้ มีแต่ดันราคากับปุ่มให้เลื่อนต่ำลงไปอีก
    // ต่างจากกล่องซื้อสกินที่รูปคือ "ของที่กำลังจะซื้อ" ซึ่งจำเป็นต้องเห็นก่อนจ่าย
  });
  // เช็คว่ายังตายอยู่จริงก่อนเปิดหน้าสรุป
  // startRun() สั่ง game.start() ก่อนแล้วค่อย closeAllPanels() ซึ่งไปยกเลิกกล่องนี้
  // ถ้าไม่กัน คนที่กดเล่นใหม่ระหว่างกล่องเปิดค้างจะได้หน้าสรุปทับตาที่เพิ่งเริ่ม
  if (!ok) {
    if (game.state === STATE.DEAD) showGameOver();
    return;
  }

  if (getGold() < cost) {
    if (game.state === STATE.DEAD) showGameOver();
    return;
  }

  addGold(-cost);
  refreshProfile();   // ยอดทองบนการ์ดล็อบบี้ต้องตรงตั้งแต่ตอนนี้ ไม่ใช่รอจบตา
  // revive() คืน false ถ้าไม่ได้อยู่ในสถานะตายแล้ว (เช่นกดเริ่มใหม่ระหว่างกล่องเปิดค้าง)
  // กรณีนั้นทองถูกหักไปแล้วแต่ไม่มีตาให้ต่อ จึงต้องคืนให้
  // ต้องคืนด้วย cost ตัวเดียวกับที่หัก ไม่ใช่ game.reviveCost ที่อ่านใหม่
  // เพราะถ้า revive() สำเร็จไปแล้วบางส่วน ตัวนับอาจขยับจนราคาไม่ตรงกับที่จ่ายไป
  if (!game.revive()) {
    addGold(cost);
    refreshProfile();
    return;
  }
  sfx.upWin();
}

// ── ปุ่ม ! ท้ายคำนำหน้าเข้าสู่ระบบ ──
// เด้งป๊อปอัพเล็กบอกอายุข้อมูลของการเล่นแบบผู้มาเยือน
// aria-expanded เป็นแหล่งความจริงอันเดียว ทั้ง CSS และโปรแกรมอ่านจออ่านจากที่เดียวกัน
function showGuestNote(on) {
  document.getElementById('guestInfo').setAttribute('aria-expanded', on ? 'true' : 'false');
  document.getElementById('guestNote').classList.toggle('hidden', !on);
}

document.getElementById('guestInfo').addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  // กดปุ่มเดิมซ้ำตอนเปิดอยู่ = ปิด คนที่กดผิดจึงกดที่เดิมเพื่อถอยได้
  showGuestNote(document.getElementById('guestInfo').getAttribute('aria-expanded') !== 'true');
});
document.getElementById('guestNoteOk').addEventListener('click', () => {
  unlockAudio(); sfx.fish();
  showGuestNote(false);
});
// กดพื้นหลังนอกฟองก็ปิด — ทางออกที่คนคาดหวังจากกล่องลอยแบบนี้
// เทียบ target กับ currentTarget เพื่อไม่ให้การกดในฟองไหลออกมาปิดตัวเอง
document.getElementById('guestNote').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) showGuestNote(false);
});

function showGameOver(quit = false) {
  // มาจากปุ่ม "เลิกเล่น" ในหน้าหยุด = เพลงถูกหยุดไว้ตอนกดหยุด (ดู setPaused)
  // ต้องเปิดคืนตรงนี้ ไม่งั้นหน้าสรุปเงียบสนิททั้งหน้า
  // ทางที่มาจากการตายเพลงยังเล่นอยู่ startMusic() จึงไม่ทำอะไร เรียกซ้ำได้อยู่แล้ว
  startMusic();

  const dist = Math.floor(game.distance / SCORING.pxPerMeter);
  const isBest = game.score >= game.best && game.score > 0;

  // ริบบิ้นโปรยทุกตา ไม่ใช่เฉพาะตาที่ทำสถิติใหม่ — จบหนึ่งตาคือเรื่องที่ควรฉลองเสมอ
  // (ตาที่ได้สถิติใหม่โปรยซ้ำอีกชุดตอนป้ายแดงหล่นลงมา จึงยังต่างกันอยู่)
  burstConfetti('overConfetti');

  countGen++;   // ยกเลิกการนับของตาก่อนหน้าที่อาจยังไล่ค้างอยู่
  countUp(document.getElementById('finalScore'), game.score, 900);
  countUp(document.getElementById('finalDist'), dist, 700, ' ม.');
  // ตาที่ทำสถิติใหม่โชว์ "สถิติเดิม" (ค่าก่อนตานี้) — ถ้าโชว์สถิติสูงสุดจะได้เลขเดียว
  // กับคะแนนที่เพิ่งทำ ซึ่งไม่บอกอะไรเลยว่าดีขึ้นแค่ไหน
  document.getElementById('bestLabel').textContent = isBest ? 'สถิติเดิม' : 'สถิติสูงสุด';
  countUp(document.getElementById('bestScore'), isBest ? game.prevBest : game.best, 1100);

  // หัวเรื่องบอกแค่ว่าจบยังไง ส่วน "ทำสถิติใหม่" เป็นหน้าที่ของป้ายแดงที่ห้อยลงมา
  document.getElementById('overTitle').textContent = quit ? 'จบรอบแล้ว' : 'หมดแรงแล้ว';

  // ป้ายสถิติใหม่หล่นลงมาตามหลังตัวเลขที่ไล่จบ ไม่ใช่ขึ้นมาพร้อมกันตั้งแต่แรก
  // ถ้าขึ้นพร้อมกัน มันจะเฉลยผลก่อนที่ตัวเลขจะไล่ถึง แล้วการไล่ก็ไม่เหลือความหมาย
  const badge = document.getElementById('bestBadge');
  badge.classList.add('hidden');
  if (isBest) {
    setTimeout(() => {
      badge.classList.remove('hidden');
      burstConfetti('overConfetti');
      sfx.cheer();
    }, reduceMotion.matches ? 0 : 950);
  }

  // บวก XP ตรงนี้ที่เดียว — เป็นจุดเดียวที่การันตีว่า "หนึ่งตาจบแล้วจริง"
  // ถ้าไปบวกใน die() จะโดนนับซ้ำได้ เพราะ die() ถูกเรียกจากหลายทาง
  // บันทึกสถิติสะสมที่จุดเดียวกับที่บวก XP — จุดเดียวที่การันตีว่าตาหนึ่งจบแล้วจริง
  // (die() ถูกเรียกจากหลายทาง ถ้าไปนับตรงนั้นจะโดนนับซ้ำ)
  recordRun({
    clears: game.clears,
    seconds: game.tick / 60,
    meters: game.distance / SCORING.pxPerMeter,
    score: game.score,
  });

  const run = awardRun(game.score);
  const box = document.getElementById('xpGain');
  box.classList.toggle('up', run.leveledUp);
  box.innerHTML = run.leveledUp
    ? `<b>เลเวลอัพ!</b> ${run.before} → <b>${run.after}</b>`
      + (run.after >= LEVEL_CAP ? ' · สูงสุดแล้ว' : ` · +${run.gained.toLocaleString('en-US')} XP`)
    : `ได้รับ <b>+${run.gained.toLocaleString('en-US')} XP</b>`;
  // ตาที่ไม่ได้ XP เลย (ตายทันทีจนคะแนนไม่ถึงพัน) ไม่ต้องโชว์อะไร
  box.classList.toggle('hidden', run.gained <= 0 && !run.leveledUp);

  // การ์ดในล็อบบี้ต้องอัปเดตด้วย ไม่งั้นกดกลับหน้าแรกแล้วเลเวลยังเป็นของเก่า
  refreshProfile();
  // เลเวลขึ้น = อาจมีกล่องใหม่ให้กดรับ ป้ายแดงต้องรู้ตั้งแต่ยังอยู่หน้าสรุป
  refreshLvDot();

  // ── เสียงของหน้านี้ เรียงตามสิ่งที่ตาเห็น ──
  //
  // เปิดหน้าช้ากว่าภาพเล็กน้อยทั้งสองทาง เพราะมีเสียงมาก่อนหน้าเสมอและต้องปล่อยให้จบก่อน:
  //   ตายคาสนาม  sfx.die() ยาวราว 1.1 วิ แต่หน้าสรุปเด้งที่ 750ms (ดู die() ใน game.js)
  //   กดเลิกเล่น  sfx.quit() ยาวราว 0.5 วิ และเด้งทันที
  // ถ้าไม่หน่วง ระฆังเปิดหน้าจะไปทับหางเสียงน้องพอดีจนฟังเป็นเสียงเดียวที่รกหู
  const openAt = quit ? 260 : 420;
  const landAt = reduceMotion.matches ? 0 : 900;   // ตรงกับเวลาไล่ตัวเลขของ countUp
  const gen = countGen;
  const alive = () => gen === countGen;            // กดเล่นใหม่ไปแล้ว เสียงที่ค้างต้องไม่ตามมา

  setTimeout(() => { if (alive()) sfx.summary(); }, openAt);
  // ตาที่ทำสถิติใหม่มี cheer กับริบบิ้นรออยู่ที่ 950ms อยู่แล้ว เสียงเคาะจะชนกันพอดี
  // ตานั้นจึงข้ามไป ปล่อยให้ cheer เป็นตัวปิดตัวเลขแทน ซึ่งทำหน้าที่นั้นได้ดีกว่า
  if (!isBest) setTimeout(() => { if (alive()) sfx.tally(); }, landAt);
  // เลเวลอัพมาท้ายสุดเสมอ และถอยให้ cheer จบก่อนถ้ามีทั้งคู่ในตาเดียวกัน
  if (run.leveledUp) setTimeout(() => { if (alive()) sfx.levelUp(); }, landAt + (isBest ? 800 : 400));

  overPanel.classList.remove('hidden');
}

// ── ฉากห้องก่อนเริ่มวิ่ง ────────────────────────────────────
//
// กดเล่นแล้วไม่เข้าเกมทันที — น้องยืนพูดอะไรสักอย่างในห้องก่อนสามวินาที
// แล้วค่อยเริ่มวิ่ง เหมือนจังหวะก่อนออกตัวของเกมวิ่งทั่วไป
const INTRO_MS = 3000;

/** คำพูดของน้อง สุ่มมาตาละประโยค */
const INTRO_LINES = [
  'หนูหิวเเล้ว...เก็บค่าเปียกให้หนูเยอะๆนะ >.<',
  'อาหารเม็ดก็อร่อยนะเเต่เปียกอร่อยกว่าง่ะ',
  'ทำไมมนุดต้องทำให้เเมวอย่างพวกเราอ้วนด้วยนะ',
  'อยากกินปลาจางง่ะ นุดดด',
  'อยากจกพุงเรามั้ยนุด',
  'วันนี้หนูยังไม่ได้กินขนมเลยนะ...หรือว่ากินไปแล้วหว่าา',
  'หนูไม่ได้อ้วนซะหน่อย...แค่ขนฟูไปนิดเดียวเองงง >w<',
  'นุดรักหนูที่สุดใช่ม้ายย ถ้ารักก็เอาเปียกมาเลยยย!',
];

// จำประโยคล่าสุดไว้ เพื่อไม่ให้สุ่มได้ตัวเดิมซ้ำติดกัน
// สุ่มล้วน ๆ มีโอกาส 1 ใน 8 ที่จะซ้ำ ซึ่งพอเจอจริงจะรู้สึกเหมือนระบบสุ่มเสีย
let lastLine = -1;
let introTimer = null;

function pickLine() {
  let i = Math.floor(Math.random() * INTRO_LINES.length);
  if (i === lastLine) i = (i + 1) % INTRO_LINES.length;
  lastLine = i;
  return INTRO_LINES[i];
}

function showIntro() {
  // ของขวัญที่ยังค้างอยู่ต้องจ่ายก่อน game.reset() ข้างล่างจะล้างแอนิเมชันทิ้ง
  // ไม่งั้นคนที่กดเล่นระหว่างหัวใจยังลอยอยู่จะเสียของรอบนั้นไปฟรี ๆ
  settleLove(false);

  unlockAudio();   // ต้องเรียกตอนผู้ใช้กดปุ่ม ไม่งั้นเบราว์เซอร์บล็อกเสียง
  startMusic();    // ต้องอยู่หลัง unlockAudio เพราะ context ยังถูกระงับอยู่ก่อนหน้านั้น

  closeAllPanels();
  game.reset();          // กลับไปสถานะ READY ตัวแมวจะได้ยืนรอไม่ใช่วิ่งอยู่
  game.inRoom = true;
  // ต้องเรียกซ้ำหลังตั้ง inRoom — reset() ข้างบนรันตอนที่ยังเป็น false อยู่
  // จึงไปสั่งเพลงหน้าแรกมา ทั้งที่ฉากนี้ต้องเงียบ
  game.syncMusic();

  introPanel.classList.remove('hidden');
  document.getElementById('introLine').textContent = pickLine();
  sfx.jump();            // เสียงร้องทักทายให้รู้ว่าน้องกำลังพูด

  clearTimeout(introTimer);
  introTimer = setTimeout(startRun, INTRO_MS);
}

/** ข้ามฉากห้องไปเริ่มวิ่งเลย — คนเล่นซ้ำ ๆ ไม่ต้องรอสามวินาทีทุกรอบ */
function skipIntro() {
  if (introPanel.classList.contains('hidden')) return;
  clearTimeout(introTimer);
  startRun();
}

/**
 * ปิดแผงทุกอันในเวที
 *
 * ไล่จาก DOM ไม่ใช่ไล่ชื่อตัวแปร — แผงที่เพิ่มทีหลังจึงถูกปิดด้วยเองอัตโนมัติ
 * ของเดิมเขียนรายชื่อไว้สามที่ในไฟล์ ทุกครั้งที่เพิ่มแผงต้องไปเติมให้ครบทั้งสาม
 */
function closeAllPanels() {
  // ยกเลิกก่อนซ่อน ไม่งั้นกล่องยืนยันจะหายไปจากจอโดยที่ Promise ยังค้าง
  // แล้ว listener ของมันจะเกาะปุ่มอยู่ข้ามรอบ
  if (cancelConfirm) cancelConfirm();
  // รูปที่เลือกไว้แต่ยังไม่ได้กดบันทึก ต้องไม่ติดหน้าน้องข้ามหน้าไป
  // (showFace(false) ล้างให้อยู่แล้ว แต่ยังออกจากหน้านี้ได้ทางอื่น เช่นกดปุ่มเล่น)
  setDraft(null);
  document.querySelectorAll('.stage .panel').forEach((el) => el.classList.add('hidden'));
  // รอบตีบวกรัวเป็นลูปที่ "หักทองเอง" ทุก ๆ ไม่กี่ร้อยมิลลิวินาที ปิดแค่แผงไม่พอ
  // ถ้าไม่หยุดตรงนี้ด้วย ผู้เล่นที่กดกลับหน้าแรกหรือกดเล่นกลางคันจะเสียทองต่อไป
  // เรื่อย ๆ ทั้งที่มองไม่เห็นหน้านั้นแล้ว
  stopAuto();
  // ริบบิ้นที่ยังตกไม่จบต้องล้างด้วย ไม่งั้นชิ้นที่ค้างอยู่จะโผล่กลางอากาศ
  // ตอนเปิดหน้าสรุปรอบหน้า (กฎเดียวกับกล่องรางวัลกับตู้กาช่า)
  document.getElementById('overConfetti').innerHTML = '';
  countGen++;   // หยุดตัวเลขที่กำลังไล่อยู่ ไม่ให้ไล่ต่อในหน้าที่ปิดไปแล้ว
  settingsFrom = [];
}

function startRun() {
  clearTimeout(introTimer);
  game.inRoom = false;
  unlockAudio(); sfx.fish();
  startMusic();
  game.start();
  closeAllPanels();
  pauseBtn.classList.remove('playing');
}

// ── หยุด / เล่นต่อ ─────────────────────────────────────────

function setPaused(on) {
  // pause()/resume() คืน false ถ้าสถานะไม่เข้าเงื่อนไข เช่นกด Esc ตอนตายอยู่
  // เช็คก่อนแตะ UI ไม่งั้นพาเนลกับสถานะเกมจะหลุดจากกัน
  if (on ? !game.pause() : !game.resume()) return;

  // ── หยุดเกมแล้วต้องเงียบไปด้วยทั้งเพลงและเอฟเฟกต์ ──
  //
  // ตัดเสียงเอฟเฟกต์ก่อนเพลง เพราะตอนกดหยุดมักมีเสียงค้างอยู่กลางทาง
  // (เสียงร้องยาวได้ถึง 0.9 วินาที และหลายเสียงเป็นชุดที่ทยอยออกทีละส่วน)
  // ถ้าไม่ตัด เสียงพวกนั้นจะดังต่อในหน้าที่เกมหยุดไปแล้ว ซึ่งอ่านเป็นเกมค้าง
  //
  // ตัด "ก่อน" เสียงปุ่มของตัวเองด้วย เสียงปุ่มหยุดจึงยังดังอยู่ — มันออกหลัง
  // การตัด และเป็นสิ่งเดียวที่ยืนยันว่ากดติดแล้ว ถ้าเงียบด้วยปุ่มจะเหมือนเสีย
  //
  // ทางออกอื่นจากหน้าหยุดเปิดเพลงคืนเองอยู่แล้ว — เริ่มใหม่ผ่าน showIntro()
  // และเลิกเล่นผ่าน showGameOver() ทั้งคู่เรียก startMusic() ในตัว
  if (on) { killSfx(); stopMusic(); }
  // หลังด่านกันสถานะแล้วเท่านั้น กดตอนที่กดไม่ได้จริง ๆ จึงต้องเงียบ
  // ไม่งั้นเสียงจะบอกว่า "กดติด" ทั้งที่เกมไม่ได้เปลี่ยนอะไรเลย
  sfx[on ? 'pause' : 'resume']();
  if (!on) startMusic();
  pausePanel.classList.toggle('hidden', !on);
  pauseBtn.classList.toggle('playing', on);
  pauseBtn.setAttribute('aria-label', on ? 'เล่นต่อ' : 'หยุดชั่วคราว');
}

pauseBtn.addEventListener('click', () => setPaused(game.state === STATE.RUN));
document.getElementById('resumeBtn').addEventListener('click', () => setPaused(false));
document.getElementById('restartBtn').addEventListener('click', () => { sfx.restart(); showIntro(); });

// สลับแท็บหรือสลับแอปแล้วหยุดให้เอง จะได้ไม่กลับมาเจอว่าตายไปแล้ว
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    setPaused(true);
    return;
  }
  // ── กลับเข้ามาแล้วต้องปลุกเสียงใหม่ ──
  // iOS ตัดระบบเสียงทิ้งตอนมีสายเข้า ล็อกจอ หรือสลับไปแอปอื่น (state = interrupted)
  // แล้วไม่ตื่นเองเมื่อกลับมา ถ้าไม่ปลุกตรงนี้ เกมจะเงียบไปทั้งรอบโดยไม่มีอะไรบอก
  unlockAudio();
  paintMuteBadge();
});

// ── ปลุกเสียงจากการแตะครั้งแรก ไม่ว่าจะแตะตรงไหน ──
//
// เดิมเสียงถูกปลุกเฉพาะตอนกดปุ่มที่ต่อสายไว้ให้ ซึ่งครอบคลุมเส้นทางปกติ
// แต่บนมือถือการแตะครั้งแรกมักไปตกที่อื่น (แตะข้ามคลิปเปิดเกม แตะพื้นหลัง
// ปัดหน้าจอ) แล้วเสียงจะยังไม่ตื่นจนกว่าจะบังเอิญกดปุ่มที่ถูกต้อง
//
// ดักที่ระดับเอกสารในชั้น capture จึงได้ทุกการแตะเสมอ ไม่ว่าใครจะกันเหตุการณ์ไว้หรือไม่
// ทำงานครั้งเดียวแล้วถอดตัวเองออก (once) — ตื่นแล้วไม่ต้องดักอีก
for (const ev of ['pointerdown', 'touchend', 'keydown']) {
  document.addEventListener(ev, () => {
    unlockAudio();
    // จุดติดไฟล์เพลงไปพร้อมกัน — iOS ปลดล็อกไฟล์เสียงทีละไฟล์ และปลดได้เฉพาะ
    // ในจังหวะที่ผู้ใช้แตะจอเท่านั้น (ดู primeMusicFile ใน music.js)
    primeMusicFile();
  }, { capture: true, once: true, passive: true });
}

// ปุ่มเดียวทำได้ 3 อย่าง ขึ้นกับสถานะเกม
function confirm() {
  // คลิปเปิดเกมกำลังเล่น: ปุ่มกระโดด (ลูกศรขึ้น / W) ต้องไม่ทะลุไปเริ่มฉากห้องข้างหลัง
  if (introVideoOpen()) return;
  if (game.state === STATE.RUN) return game.jump();
  // อยู่ในฉากห้อง: กดอะไรก็ข้ามไปเริ่มวิ่ง ไม่ใช่สั่งเริ่มซ้อนอีกรอบ
  if (!introPanel.classList.contains('hidden')) return skipIntro();

  // มีแผงเมนูเปิดค้างอยู่: กด Space ต้องไม่ทะลุไปสั่งเริ่มเกม
  // ไล่จาก DOM เหมือน closeAllPanels() แผงที่เพิ่มทีหลังจึงกันตัวเองอัตโนมัติ
  // ยกเว้นหน้าจบรอบ ที่ตั้งใจให้กดปุ่มเดียวแล้ววิ่งรอบใหม่ได้เลย
  if (document.querySelector('.stage .panel:not(.home):not(.hidden):not(#overPanel)')) return;

  if (game.state === STATE.READY) showIntro();
  else if (!overPanel.classList.contains('hidden')) showIntro();
}

setupInput(document.getElementById('stage'), {
  onConfirm: confirm,
  onSlideStart: () => game.setSlide(true),
  onSlideEnd: () => game.setSlide(false),
  onTogglePause: () => setPaused(game.state === STATE.RUN),
  onJumpEnd: () => game.jumpRelease(),
  onSkill: () => { unlockAudio(); game.useTalent(); },
});

// ── แผงที่ "เพิ่งเปิด" ──────────────────────────────────────
//
// ติดคลาส just-open ให้แผงตอนเปลี่ยนจากซ่อนเป็นโชว์ แล้วถอดออกเองใน 0.6 วินาที
// CSS เล่นแอนิเมชันไล่การ์ดเฉพาะช่วงนั้น
//
// ── ทำไมต้องแยกว่า "เพิ่งเปิด" ──
// หน้าอย่างคลังน้องสร้างกริดใหม่ทุกครั้งที่กดเลือกของสักชิ้น ถ้าเล่นแอนิเมชันทุกครั้งที่สร้าง
// การ์ดทั้งหน้าจะกระพริบใหม่ทุกคลิก ซึ่งน่ารำคาญกว่าไม่มีแอนิเมชันเลย
//
// ── ทำไมใช้ MutationObserver ──
// แผงถูกเปิดจากหลายสิบที่ (showPanel / swapPanel / showStash / ปุ่มกลับ ฯลฯ)
// ดักที่ "คลาสของแผงเปลี่ยน" จุดเดียวจึงครอบคลุมทุกทางโดยไม่ต้องไปแก้ทุกจุดที่เปิดแผง
const panelShown = new WeakSet();
const panelTimer = new WeakMap();
new MutationObserver((records) => {
  for (const r of records) {
    const el = r.target;
    if (!el.classList || !el.classList.contains('panel')) continue;
    if (el.classList.contains('hidden')) {
      panelShown.delete(el);
      continue;
    }
    // เห็นว่าโผล่อยู่แล้วก็ข้าม — ไม่งั้นตอนเราถอด just-open ออกเองจะวนเรียกตัวเองไม่จบ
    if (panelShown.has(el)) continue;
    panelShown.add(el);
    // จุดแดงของใหม่ต้องตรงกับของจริงทุกครั้งที่แผงไหนโผล่ (รวมล็อบบี้) — ของใหม่มาได้จากหลายทาง
    // (จบตา กาช่า รางวัลเลเวล จดหมาย) ดักที่นี่ที่เดียวจึงไม่ต้องไล่ใส่ทุกทางที่ได้ของ
    refreshFreshDots();
    el.classList.add('just-open');
    clearTimeout(panelTimer.get(el));
    panelTimer.set(el, setTimeout(() => el.classList.remove('just-open'), 620));
  }
}).observe(document.getElementById('stage'), {
  subtree: true, attributes: true, attributeFilter: ['class'],
});

// ── ปุ่มท่าพิเศษของพรสวรรค์ ──
//
// อัปเดตจากลูปวาด แต่เขียน DOM เฉพาะตอนค่าที่เห็นเปลี่ยนจริง
// เขียน style ทุกเฟรมโดยไม่เช็คจะบังคับให้เบราว์เซอร์คำนวณสไตล์ใหม่ 60 ครั้งต่อวินาทีเปล่า ๆ
const skillPad = document.getElementById('skillPad');
const skillBtn = document.getElementById('btnSkill');
const skillShown = { on: null, id: null, state: null, pct: -1 };

function updateSkillPad() {
  const g = game.talents.gauge();
  const on = !!g && game.state === STATE.RUN && game.bonus <= 0;
  if (on !== skillShown.on) {
    skillShown.on = on;
    skillPad.classList.toggle('off', !on);
  }
  if (!on) return;

  if (g.t.id !== skillShown.id) {
    skillShown.id = g.t.id;
    document.getElementById('skIco').textContent = g.t.icon;
    // ใบที่ทำงานเอง (แมวสะท้อน) ไม่มีอะไรให้กด ป้ายจึงบอกสถานะแทนชื่อท่า
    document.getElementById('skLabel').textContent = g.t.button || 'สะท้อน';
    skillBtn.classList.toggle('passive', g.t.type !== 'active');
    skillBtn.setAttribute('aria-label', g.t.type === 'active' ? 'ใช้ท่า ' + g.t.name : g.t.name);
  }
  if (g.state !== skillShown.state) {
    skillShown.state = g.state;
    skillBtn.dataset.state = g.state;
  }
  const pct = Math.round(g.ratio * 100);
  if (pct !== skillShown.pct) {
    skillShown.pct = pct;
    skillBtn.style.setProperty('--p', pct + '%');
  }
}

const root = document.documentElement;

// ── เต็มจอ + ล็อกแนวนอนอัตโนมัติ ─────────────────────────────
//
// ปุ่มเต็มจอถูกถอดออกแล้ว เกมพาตัวเองเข้าเต็มจอให้เลย แต่เบราว์เซอร์ทุกตัว
// ยอมให้สั่งเต็มจอได้เฉพาะในจังหวะที่ผู้เล่นเพิ่งแตะจอเท่านั้น สั่งตอนโหลดหน้า
// จะถูกปฏิเสธทุกครั้ง จึงต้องผูกไว้กับการแตะแทน
//
// ไม่ตั้งธง "ทำไปแล้ว" ค้างไว้ เพราะครั้งแรกอาจไม่สำเร็จ (ผู้ใช้กดปฏิเสธ หรือ
// แตะโดนตรงที่เบราว์เซอร์ไม่นับเป็น gesture) ปล่อยให้ลองใหม่ทุกครั้งที่ยังไม่
// เต็มจอ ซึ่งราคาถูกมากเพราะ isFull() ตัดจบให้ตั้งแต่บรรทัดแรก
const coarse = window.matchMedia('(hover: none) and (pointer: coarse)');
const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

async function goImmersive() {
  if (!coarse.matches) return;   // บนคอมย่อ/ขยายหน้าต่างเองได้อยู่แล้ว

  if (!isFull()) {
    // Safari รุ่นเก่ายังใช้ชื่อแบบมี webkit นำหน้า
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    if (req) {
      try {
        await req.call(root);
      } catch {
        /* ไม่ได้ก็ไม่เป็นไร ยังลองล็อกแนวจอต่อได้ บางเบราว์เซอร์ยอมโดยไม่ต้องเต็มจอ */
      }
    }
  }

  // ล็อกเป็น 'landscape' เฉย ๆ ไม่ใช่ landscape-primary — ผู้เล่นจึงยังพลิกเครื่อง
  // กลับหัวไปมาระหว่างแนวนอนสองทางได้ ติดแค่แนวตั้งที่ถูกกันไว้
  //
  // เครื่องที่กดปฏิเสธหรือไม่รองรับ (iPhone ทุกรุ่น) ป้ายขอให้หมุนจอรับช่วงต่อ
  // และเพราะไม่ได้ตั้งธง "ทำไปแล้ว" ค้างไว้ การแตะครั้งถัดไปก็จะลองใหม่เองเรื่อย ๆ
  try {
    await screen.orientation?.lock?.('landscape');
  } catch {
    /* ไม่รองรับ / เครื่องล็อกแนวจอไว้เอง */
  }
}

document.addEventListener('pointerdown', goImmersive);

// ── ปลุกเสียงจากการแตะทุกครั้ง ──
// บางเบราว์เซอร์ (ซาฟารีบน iPhone เป็นหลัก) ระงับเสียงคืนเองได้หลายจังหวะ
// เช่นสลับแอปกลับมา หรือปฏิเสธ resume ครั้งแรกเพราะจังหวะยังไม่นับเป็นการกดของผู้ใช้
// การกดครั้งไหนก็ได้จึงควรได้ลองปลุกซ้ำ — เรียกซ้ำไม่มีผลข้างเคียงถ้าตื่นอยู่แล้ว
document.addEventListener('pointerdown', () => unlockAudio(), { passive: true });

document.getElementById('startBtn').addEventListener('click', showIntro);
document.getElementById('retryBtn').addEventListener('click', () => { sfx.restart(); showIntro(); });

// แตะที่ไหนก็ได้ตอนอยู่ในห้อง = ข้ามไปเริ่มวิ่งเลย
// ผูกที่ตัวแผงเอง ไม่ใช่ทั้งจอ จะได้ไม่ไปกินการแตะของหน้าอื่น
introPanel.addEventListener('pointerdown', skipIntro);

// ปุ่มปิด/เปิดเสียง
document.getElementById('btnSettings').addEventListener('click', () => {
  unlockAudio(); startMusic();
  showSettings(true);
});
document.getElementById('settingsBack').addEventListener('click', () => showSettings(false));

// ── หมวดในหน้าตั้งค่า ── (ทั่วไป / เสียง / การแสดงผล) สลับด้วยแถบซ้าย ทีละหมวด
const setTabs = [...document.querySelectorAll('#settingsPanel .set-tabs .stab')];
function showSetTab(key) {
  for (const b of setTabs) {
    const on = b.dataset.set === key;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', String(on));
  }
  for (const sec of document.querySelectorAll('#settingsPanel .set-sec')) {
    sec.classList.toggle('hidden', sec.dataset.set !== key);
  }
}
for (const b of setTabs) {
  b.addEventListener('click', () => {
    unlockAudio();
    sfx.fish();
    showSetTab(b.dataset.set);
  });
}

// ── ระดับกราฟิก ──
// ปุ่มสามใบใช้ทรงเดียวกับตัวเลือกภาษา กดแล้วมีผลทันที (ดู onQuality ข้างบน)
const GFX_BTN = { high: 'gfxHigh', mid: 'gfxMid', save: 'gfxSave' };
function paintGfxPick() {
  const now = gfxLevel();
  for (const id of LEVEL_IDS) {
    document.getElementById(GFX_BTN[id]).classList.toggle('on', id === now);
  }
}
for (const id of LEVEL_IDS) {
  document.getElementById(GFX_BTN[id]).addEventListener('click', () => {
    unlockAudio(); sfx.fish();
    setGfxLevel(id);
    paintGfxPick();
  });
}
paintGfxPick();
for (const r of MIX_ROWS) {
  document.getElementById(r.down).addEventListener('click', () => stepMix(r.ch, -1));
  document.getElementById(r.up).addEventListener('click', () => stepMix(r.ch, 1));
  document.getElementById(r.mute).addEventListener('click', () => {
    unlockAudio();
    toggleMute(r.ch);
  });
}

// ── ลูปหลัก ────────────────────────────────────────────────
//
// ── งบพลังงานของเครื่อง ──
// การวาดฉากหนึ่งเฟรมคือของที่แพงที่สุดในเกม (ผ้าใบเต็มจอ + แสงฟุ้งทั้งเฟรม)
// สามกฎข้างล่างตัดงานที่ "วาดไปก็ไม่มีใครเห็นต่าง" ทิ้ง โดยภาพที่ตาเห็นเหมือนเดิมทุกอย่าง:
//
//   1. เพดาน 60 เฟรมต่อวินาที  จอ 120Hz ทำงานสองเท่าโดยเกมไม่ได้ลื่นขึ้นเท่าตัว
//                             (ทุกอย่างในเกมคิดจาก dt เป็นวินาทีจริงอยู่แล้ว ความเร็วจึงไม่เปลี่ยน)
//   2. มีแผงเมนูคลุมอยู่ = 10  ฉากข้างหลังถูกม่านทับเกือบหมด เห็นแค่ริม ๆ การ์ด
//
// ── ห้ามลดเฟรมของหน้าที่ยังเห็นฉากเต็ม ๆ ──
// เคยลดหน้าชื่อเกมกับห้องก่อนวิ่งเหลือ 10 เฟรม (เพราะมันมี .panel เปิดอยู่เหมือนเมนู)
// สองหน้านั้นฉากเลื่อนอยู่ตลอด ภาพเลยกระตุกจนดูเหมือนเกมค้าง — แผงพวกนี้ติด .see-scene ไว้
// และล็อบบี้ก็เคยลดเหลือ 30 ซึ่งกระตุกด้วยเหตุผลเดียวกัน ตอนนี้ทุกหน้าที่เห็นฉากวาดเต็มเฟรมหมด
// (คนที่อยากประหยัดจริง ๆ เลือก "ประหยัดแบต" ในหน้าตั้งค่าได้ ซึ่งลดทั้งเกมเหลือ 30)
//
// อัปเดตเกม (game.update) ยังเดินทุกเฟรมเหมือนเดิม — มันถูกกว่าการวาดมาก
// และถ้าข้ามด้วย จังหวะการเล่นจะเพี้ยน
//   4. ระดับกราฟิก           "ประหยัดแบต" ลดเพดานเหลือ 30 เฟรม (ดู src/graphics.js)
const MENU_MS = 1000 / 10;

let last = performance.now();
let lastDraw = 0;
let menuSeen = 0;      // เช็คว่ามีแผงเปิดอยู่ไหมทุก ๆ 120 มิลลิวินาที ไม่ใช่ทุกเฟรม
let menuOpen = false;

/** มีแผงเมนูทึบคลุมฉากอยู่หรือเปล่า (ล็อบบี้กับแผงโปร่งไม่นับ) */
function menuCovers(now) {
  if (now - menuSeen >= 120) {
    menuSeen = now;
    menuOpen = Boolean(
      document.querySelector('.stage .panel:not(.home):not(.see-scene):not(.hidden)'),
    );
  }
  return menuOpen;
}

function loop(now) {
  // ── เพดาน 60 เฟรมต่อวินาที ──
  // ปล่อยผ่านเฉพาะเฟรมที่ห่างจากเฟรมก่อนพอ จอ 120Hz จึงทำงานเท่าจอ 60Hz พอดี
  // (ต้องตัดตั้งแต่ก่อนคิด dt ไม่งั้นเวลาที่ข้ามไปจะหายไปจากนาฬิกาของเกม)
  // ลบ 1.5 เผื่อไว้ ไม่งั้นจะพลาดจังหวะของจอแล้วเหลือครึ่งเดียวของเพดานที่ตั้งไว้
  if (now - last < 1000 / quality().fps - 1.5) {
    requestAnimationFrame(loop);
    return;
  }

  // แปลงเวลาจริงเป็น "จำนวนเฟรมที่ 60fps"
  // เพื่อให้เกมเร็วเท่ากันทั้งจอ 60Hz และ 144Hz
  let dt = (now - last) / 16.667;
  last = now;
  dt = Math.min(dt, 3);   // กันการกระโดดข้ามเวลาตอนสลับแท็บ

  // คลิปเปิดเกมคลุมจอทึบอยู่ = ไม่มีใครเห็นหน้าแรกข้างใต้ พักทั้งอัปเดตและวาด
  // ให้คลิปได้เครื่องไปทั้งเครื่อง (ดู introCovering ใน intro-video.js)
  if (introCovering()) {
    requestAnimationFrame(loop);
    return;
  }

  game.update(dt);

  // วาดเมื่อถึงรอบของสถานะนั้น ๆ เท่านั้น — เฟรมที่ข้ามไปผ้าใบยังค้างภาพเดิมอยู่
  // จึงไม่มีอะไรกะพริบหรือหายไป
  if (now - lastDraw >= (menuCovers(now) ? MENU_MS : 0)) {
    lastDraw = now;
    game.draw(ctx);
  }
  updateSkillPad();

  // ตู้กาช่าวาดใหม่เฉพาะตอนเปิดพาเนลอยู่ ไม่ต้องเสียเฟรมทิ้งตอนเล่นเกม
  // หีบกับตู้หมุนวาดคนละช่อง จึงเสียเฟรมให้ตัวที่โผล่อยู่ตัวเดียว
  //
  // เดิมหีบมีลูป requestAnimationFrame ของตัวเองอีกอัน ซึ่งต้องคอยสั่งเริ่ม/หยุด
  // ให้ตรงกับจังหวะเปิดปิดพาเนลเอง พอย้ายมาอยู่ในลูปเดียวกันนี้ เงื่อนไข
  // "พาเนลเปิดอยู่ไหม" ก็ตอบให้ทั้งสองตัวพร้อมกัน ไม่มีทางค้างวิ่งทิ้งไว้อีก
  if (!gachaPanel.classList.contains('hidden')) {
    if (gIsT()) {
      chestTick += dt;
      // ไล่เข้าหาเป้าหมายแบบนุ่ม ๆ แทนการสลับค่าทันที ฝาจึงค่อย ๆ เปิด
      chestOpen += (chestTarget - chestOpen) * Math.min(1, 0.13 * dt);
      paintBox(document.getElementById('tgChest'), CHEST.W, CHEST.H,
        (c) => drawChest(c, chestOpen, chestTick));
    } else {
      // เร่งการหมุนตอนกำลังเปิด แต่สะสมต่อจากค่าเดิม ไม่ใช่คูณเวลาจริง
      // ไม่งั้นเฟสจะกระโดดตอนเริ่มและจบแอนิเมชัน
      spinT += dt * (pullProgress > 0 ? 4.5 : 1);
      gachaShake = Math.max(0, gachaShake - 0.05 * dt);

      if (pullProgress > 0) {
        pullProgress += dt / PULL_FRAMES;
        // แตกที่ 0.7 ตรงกับจังหวะฝาแยกใน drawCapsuleDrop
        if (pullPending && pullProgress >= 0.7) revealPull();
        if (pullProgress >= 1) pullProgress = 0;
      }

      paintBox(document.getElementById('gachaMachine'), MACHINE_W, MACHINE_H, (c) => {
        c.scale(MACHINE_W / 150, MACHINE_H / 170);
        drawGachaMachine(c, spinT, gachaShake, pullProgress);
      });
    }
  }

  requestAnimationFrame(loop);
}

// ช่องสำหรับเครื่องมือตอนพัฒนา เช่นสคริปต์วาดแผนที่ด่านทั้งด่าน
// แถบเรียง/กรองของสองหน้า ต้องผูกหลังจากประกาศฟังก์ชันวาดกริดครบแล้ว
// (setupFilterBar เรียก redraw ทันทีไม่ได้ แต่ตัวมันเองอ้างถึงฟังก์ชันนั้นไว้)
// redraw ชี้ที่ refreshStash ไม่ใช่ตัวสร้างกริดตรง ๆ เพราะเปลี่ยนตัวกรองแล้ว
// ของที่เลือกไว้อาจหลุดออกจากรายการ ช่องพรีวิวจึงต้องวาดใหม่ตามไปด้วย
setupFilterBar({
  key: 'treasure', bar: 'treasureFilter', box: 'treasureOnly', redraw: refreshStash,
});
setupFilterBar({
  key: 'outfit', bar: 'outfitFilter', box: 'outfitOnly', redraw: refreshStash,
});
setupFilterBar({
  key: 'skin', bar: 'skinFilter', box: 'skinOnly', redraw: refreshStash,
});

// Vite ตัดทิ้งทั้งบรรทัดตอน build จริง ไม่หลุดไปอยู่ใน bundle
if (import.meta.env.DEV) {
  window.__game = game;
  // เปิดหน้าสรุปผลด้วยตัวเลขที่ตั้งเองได้ ไม่ต้องเล่นจนตายทุกครั้งที่จะดูหน้านี้
  window.__showGameOver = showGameOver;
  window.__askRevive = askRevive;     // กล่อง "น้องตกหลุม" โดยไม่ต้องรอตกหลุมจริง
}

// แผงปุ่มทดสอบชั่วคราว ลบได้ทั้งบรรทัด
// ปุ่มเสกเพชรต้องวาดแถบบนใหม่เอง และถ้าตู้สุ่มเปิดค้างอยู่ก็ต้องปลดล็อกปุ่มสุ่มด้วย
// ไม่งั้นเพชรเข้าแล้วแต่ปุ่มยังเทาอยู่จนกว่าจะออกไปเข้าใหม่
const debugHooks = {
  refreshCurrency: () => {
    if (!gachaPanel.classList.contains('hidden')) refreshGacha();
    else refreshGold();
  },
  // เลเวลเพิ่งถูกดัน — แถบเลเวลในล็อบบี้ ป้ายแดงรางวัล และหน้ารางวัลที่อาจเปิดค้างอยู่
  refreshLevel: () => {
    refreshHome();
    refreshLvDot();
    if (!lvPanel.classList.contains('hidden')) buildLvList();
  },
  // หน้าสกิลเปิดค้างอยู่ตอนกดปลด — วาดการ์ดใหม่ให้เห็นว่าปลดแล้วทันที
  refreshSkills: () => {
    if (!talentPanel.classList.contains('hidden')) skillUI.open();
  },
};
setupDebug(game, debugHooks);

// ── แผงทดสอบสำหรับไอดีผู้ทดสอบบนเว็บจริง ──
// เข้าสู่ระบบเสร็จเมื่อไหร่ไม่แน่นอน (กู้เซสชันเป็น async / ล็อกอินทีหลังได้) จึงเช็คเป็นระยะ
// ต่อหนึ่งบัญชีถามรหัสจากคลาวด์ครั้งเดียว — บัญชีเปลี่ยนค่อยถามใหม่ ไม่ได้ยิงถี่ ๆ
// รหัสตรงกับ TESTER_CODES (debug.js) = โผล่แผงทดสอบเหมือนตอนรันในเครื่อง
let testerCheckedFor = null;
setInterval(async () => {
  const uid = cloudReady && userId();
  if (!uid || uid === testerCheckedFor) return;
  testerCheckedFor = uid;
  const r = await fetchMyFriendCode().catch(() => ({ ok: false }));
  if (!r.ok) return;
  if (!pfMyCode) pfMyCode = r.code;
  if (TESTER_CODES.includes(r.code)) setupDebug(game, debugHooks, { force: true });
}, 4000);

requestAnimationFrame(loop);
game.draw(ctx);
