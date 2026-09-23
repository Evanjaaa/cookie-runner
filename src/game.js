// src/game.js
import {
  VIEW, GROUND_Y, PLAYER_X, SPEED, SCORING, SHIELD, HEALTH, POTION, SHRIMP, MAGNET, BODY,
  LEVEL, LETTER, WORD, BONUS, SKILL, SPEEDUP, BIGCAN, BONUS_MAGNET, BONUS_PULL, PHYSICS, SCENE, FALLER, HAZARD, REVIVE,
  CAT_LOOK,
} from './config.js';
import { rectHit, seek } from './utils.js';
import { Player } from './player.js';
import { Level } from './level.js';
import { Particles } from './particles.js';
import { loadBest, saveBest } from './storage.js';
import { sfx } from './audio.js';
import { setMusicTrack, SILENT } from './music.js';
import { drawSky, drawHills, drawGround, drawProps, BACKDROPS, GROUND_ART } from './render/background.js';
import { drawPlats } from './render/platforms.js';
import {
  drawObstacles, drawTreats, drawPlayer, drawShields, drawShieldRing, drawPotions,
  drawCatPose, drawFish, drawKibble, drawMagnets, drawSuction, drawLetters, drawClouds,
  drawBigFish,
  drawBonusSparkle,
  drawRain, drawSkillGauge, drawNips, drawCans, drawFallers, drawHazards,
  drawHeart, poseMouthOpen, poseSpeaks,
} from './render/entities.js';
import { getSkin } from './skins.js';
import { getStage, sceneAt } from './stages.js';
import { mixPalette } from './render/palette.js';
import { TreasureRun, catAnchor } from './treasure-run.js';
import { drawTreasureShows, drawScorePops, drawMilkBubble } from './render/treasure-fx.js';
import { drawTreasureSlots } from './render/treasure-hud.js';
import { TalentRun } from './talent-run.js';
import { getEquippedSkill } from './skills.js';
import { drawSkillBack, drawSkillWorld, drawSkillScreen, skillLift } from './render/skill-fx.js';
import { drawTalentBack, drawTalentFront, drawTalentScreen } from './render/talent-fx.js';
import { drawHUD } from './render/hud.js';
import { drawWarpBack, drawWarpFront, drawWarpArrive } from './render/warp.js';
import { postProcess } from './render/post.js';
import { drawOutlined } from './render/outline.js';
import { GateRun } from './gate-run.js';
import { gateFor, GATE_LIST } from './gates.js';
import { drawGateBack, drawGateFront, warmGateArt } from './render/gates/index.js';

/** แยกเม็ดปลาธรรมดา (ไม่มีเส้นขอบ) ออกจากของกินเด่น (มีเส้นขอบ) — ดู Game.draw */
function splitFish(list) {
  const plain = [];
  const rare = [];
  for (const t of list) (t.kind === 'shrimp' || t.kind === 'kibble' ? rare : plain).push(t);
  return [plain, rare];
}
import { drawKingdom } from './render/kingdom/index.js';
import { drawRoomScene } from './render/room/index.js';

/* จอสัมผัสหรือเปล่า — ใช้เกณฑ์เดียวกับ input.js กับ main.js และตรงกับ
   @media (pointer: coarse) ใน style.css ที่บีบปุ่มล็อบบี้เข้ามาจากขอบจอ
   พอที่ว่างกลางจอกว้างขึ้น น้องขนาดเดิมเลยดูเล็กไปเมื่อเทียบกับของรอบตัว */
const coarsePointer = window.matchMedia('(hover: none) and (pointer: coarse)');

export const STATE = { READY: 0, RUN: 1, DEAD: 2, PAUSE: 3 };

/**
 * ปูของกินบนฟ้าสำหรับโหมดโบนัส
 *
 * สามเลนสลับกันเป็นเกลียว ผู้เล่นจึงต้องขยับขึ้นลงตลอด ไม่ใช่ลอยนิ่งรอเก็บ
 * ระยะห่าง 50px เลือกมาจากงบคะแนน: ทั้งโบนัสให้ราวสองถึงสามเท่าของรอบเล่นปกติ
 * ถ้าถี่กว่านี้คะแนนจากโบนัสจะกลบคะแนนจากการเล่นจริงจนสถิติไม่มีความหมาย
 */
function buildBonusField(startX, span) {
  const out = [];
  let i = 0;

  for (let x = startX; x < startX + span; x += BONUS.colGap, i++) {
    // เติมครบทั้งสามเลนทุกคอลัมน์ ไม่ใช่สลับกันทีละเลน — ของจึงแน่นเต็มฟ้า
    // แต่ละเลนแกว่งคนละเฟส เลนจึงไขว้กันไปมา ผู้เล่นต้องขยับหาจุดที่คุ้มที่สุด
    // ไม่ใช่เลือกเลนเดียวแล้วลอยนิ่งยาว ๆ
    for (let lane = 0; lane < 3; lane++) {
      const y = 118 + lane * BONUS.laneGap
        + Math.sin(x / 250 + lane * 2.1) * BONUS.waveAmp * 0.5;

      // ให้ปลาเป็นส่วนใหญ่ เม็ดกลมรองลงมา กุ้งนาน ๆ ที
      // ถ้าเทเม็ดแพงลงมาหมด คะแนนโบนัสจะกลบคะแนนจากการเล่นจริงจนสถิติไม่มีความหมาย
      const n = i * 3 + lane;
      const kind = n % 17 === 8 ? 'shrimp' : (n % 4 === 2 ? 'kibble' : 'fish');
      out.push({ x, y, r: LEVEL.fishR, got: false, kind });
    }
  }
  return out;
}

/**
 * โปรยแม่เหล็กทั่วสนามโบนัส
 * catX = ตำแหน่งตัวแมวในพิกัดโลก ณ วินาทีที่เริ่มโบนัส
 */
export function buildBonusMagnets(catX, span, speed) {
  const lanes = [118, 186, 254];   // ระดับเดียวกับสามเลนของแนวอาหาร

  // ลูกแรกอยู่ถัดจากจุดเริ่มลอยเล็กน้อย ไม่ใช่ระหว่างช่วงทะยานขึ้นแล้ว
  // คำนวณจากค่าใน BONUS ตรง ๆ เผื่อมีคนไปปรับจังหวะฉากแล้วลืมแก้ตรงนี้
  const firstAt = (BONUS.catchFrames + BONUS.riseFrames) * speed + BONUS_MAGNET.afterFly;
  const out = [{ x: catX + firstAt, y: lanes[1], r: BONUS_MAGNET.r, got: false }];

  let i = 0;
  const from = catX + firstAt + BONUS_MAGNET.gap;
  for (let x = from; x < catX + span; x += BONUS_MAGNET.gap, i++) {
    out.push({ x, y: lanes[i % 3], r: BONUS_MAGNET.r, got: false });
  }
  return out;
}

/**
 * ท่าว่างของแมวหน้าแรก — ยืนเฉย ๆ ครบ IDLE_GAP แล้วทำท่าหนึ่งท่า วนไปเรื่อย ๆ
 *
 * เรียงตามลำดับ ไม่สุ่ม เพราะสุ่มแล้วมีโอกาสออกท่าเดิมซ้ำติดกัน
 * ซึ่งอ่านเป็น "ค้าง" ไม่ใช่ "ทำท่า" ส่วนการวนตามลำดับรับประกันว่าเห็นครบทุกท่า
 *
 * hold นับรวมช่วงเปลี่ยนท่าเข้า-ออกด้วย จึงต้องมากกว่า IDLE_EASE * 2 เสมอ
 * ไม่งั้นท่าจะยังไม่ทันเข้าเต็มที่ก็ต้องคลายกลับแล้ว
 */
const IDLE_GAP = 180;    // 3 วินาทีที่ยืนเฉย ๆ ก่อนจะทำท่าถัดไป
const IDLE_EASE = 26;    // เฟรมที่ใช้ค่อย ๆ เข้าและออกจากท่า
const IDLE_HOLD = 300;   // ค้างท่าละ 5 วินาที (รวมช่วงเข้า-ออกแล้ว)
const IDLE_ACTS = [
  // หาวสั้นกว่าท่าอื่น — ปากอ้าค้างนานกว่านี้อ่านเป็นภาพค้าง ไม่ใช่การหาว
  // ส่วนท่าอื่นเป็นท่าพักอยู่แล้ว ค้างนานเท่าไหร่ก็ยังดูเป็นธรรมชาติ
  { pose: 'yawn', hold: 180, voice: 'yawn' },            // หาว 3 วินาที
  { pose: 'sit', hold: IDLE_HOLD, voice: 'mew' },        // นั่ง
  { pose: 'groom', hold: IDLE_HOLD, voice: 'purr' },     // นั่งเลียอุ้งเท้า
  { pose: 'loaf', hold: IDLE_HOLD, voice: 'snooze' },    // หมอบเป็นก้อนขนมปัง
];

/**
 * ท่าตอบตอนผู้เล่นแตะตัวน้องบนหน้าแรก
 *
 * ── ทำไมไม่เอาไปรวมกับ IDLE_ACTS ──
 * สองชุดนี้ตอบคนละคำถาม ท่าว่างตอบว่า "น้องทำอะไรอยู่ตอนไม่มีใครยุ่ง"
 * จึงต้องเป็นท่าพักที่ค้างนาน ๆ แล้วยังดูเป็นธรรมชาติ ส่วนชุดนี้ตอบว่า
 * "น้องตอบสนองคุณยังไง" จึงต้องมีการเคลื่อนไหวในตัวเองทุกท่า และต้องจบไว
 * เพื่อให้แตะรัว ๆ ได้ ถ้ารวมกันจะได้ชุดที่ผิดทั้งสองงาน
 *
 * เรียงตามลำดับ ไม่สุ่ม ด้วยเหตุผลเดียวกับ IDLE_ACTS — สุ่มแล้วมีโอกาสออกท่าเดิม
 * ซ้ำติดกัน ซึ่งอ่านเป็น "แตะแล้วไม่มีอะไรเกิดขึ้น" ทั้งที่ท่ามันเล่นอยู่จริง ๆ
 *
 * hold นับรวมช่วงเข้า-ออกแล้ว จึงต้องมากกว่า REACT_EASE * 2 เสมอ
 * ท่าที่มีจังหวะซ้ำ ๆ ในตัว (นวดแป้ง ส่ายก้น) ตั้งยาวกว่า เพราะต้องเห็นอย่างน้อย
 * สามรอบถึงจะอ่านออกว่ามันเป็นจังหวะ ไม่ใช่การกระตุกครั้งเดียว
 */
const REACT_EASE = 18;
const REACT_ACTS = [
  // โบกอุ้งเท้าทักทาย ตาเป็นประกาย ร้องทัก — ปากขยับ เสียงจึงตามปากทุกครั้งที่อ้า
  { pose: 'wave', hold: 118, voice: 'trill' },
  // นวดแป้งหน้าอก หลับตาเคลิ้ม — ท่าที่แมวทำตอนสบายใจที่สุด
  { pose: 'knead', hold: 160, voice: 'purr' },
  // ย่อตัวส่ายก้นเล็งเป้า หูลู่ — ท่าก่อนพุ่งตะครุบ
  { pose: 'wiggle', hold: 132, voice: 'chirp' },
  // ล้มตัวลงนอนตะแคงชูอุ้งเท้า = ยอมให้ลูบพุง ซึ่งแมวทำเฉพาะกับคนที่ไว้ใจ
  { pose: 'roll', hold: 168, voice: 'flop' },
  // ขนพองฟูทั้งตัวเพราะตกใจที่โดนแตะ แล้วค่อย ๆ ยุบ
  { pose: 'puff', hold: 112, voice: 'startle' },
];

/**
 * ท่าดีใจตอนได้หัวใจ — ไม่ได้อยู่ในตารางไหนเพราะเล่นได้ทางเดียวคือกดปุ่มหัวใจ
 * แต่ต้องมีช่อง voice เหมือนท่าอื่น ฝั่งเสียงจะได้ไม่ต้องรู้ว่าท่าไหนมาจากตารางไหน
 */
const LOVE_ACT = { pose: 'love', voice: 'mew' };

/**
 * น้ำหนักของท่า 0→1→0 ตามเวลาที่อยู่ในท่านั้น
 *
 * ใช้ร่วมกันระหว่างท่าว่างกับท่าตอบการแตะ เพราะสองชุดต้องเข้า-ออกเหมือนกันเป๊ะ
 * เคยเขียนสูตรนี้ซ้ำสองที่ ซึ่งแปลว่าวันที่ใครไปจูนความนุ่มข้างเดียว
 * ท่าสองชุดจะเข้าออกคนละแบบโดยไม่มีใครสังเกต
 *
 * smoothstep ท้ายสุดสำคัญ — เข้า-ออกแบบเส้นตรงจะเห็นหัวท้ายกระตุกเป็นจังหวะ
 */
function poseWeight(t, hold, ease) {
  const k = Math.min(1, t / ease, (hold - t) / ease);
  const e = Math.max(0, Math.min(1, k));
  return e * e * (3 - 2 * e);
}

/**
 * กรอบที่ถือว่า "แตะโดนตัวน้อง" ในพิกัดฉาก วัดจากจุดกึ่งกลางกรอบ
 * กว้างพอคลุมทั้งหางด้านซ้ายและแขนที่ยกโบกด้านขวา ตอนน้องตัวโตสุด (สเกล 3)
 * main.js เอาไปทำเป็นปุ่มใส ๆ ทับบน canvas — เหตุผลเดียวกับปุ่มหัวใจ
 */
export const CAT_TAP = { x: 480, y: 242, w: 124, h: 180 };

/**
 * ตำแหน่งปุ่มหัวใจในพิกัดฉาก 960x420 — จุดกึ่งกลางปุ่ม
 *
 * ── ทำไมตัวเลขต้องอยู่ที่นี่ ไม่ใช่ใน CSS ที่เดียว ──
 * ปุ่มเป็น HTML (จะได้กดด้วยคีย์บอร์ด มีป้ายเวลา และหรี่ตัวเองตอนคูลดาวน์ได้ฟรี)
 * แต่หัวใจที่ลอยออกจากปุ่มวาดบน canvas เพราะปลายทางคือหัวน้องซึ่งอยู่บน canvas
 * ถ้าสองฝั่งถือตัวเลขคนละชุด หัวใจจะออกจากจุดที่ไม่ใช่ตัวปุ่มทันทีที่ใครแก้ข้างเดียว
 *
 * CSS อ่านค่านี้ผ่านตัวแปร --love-x / --love-y ที่ main.js เขียนลงไปตอนเริ่ม
 * เวทีมีอัตราส่วน 960:420 ตายตัว เปอร์เซ็นต์จึงตรงกับพิกัดฉากแบบหารตรง ๆ ได้เลย
 *
 * ── ทำไมเยื้องขึ้นไปเสมอหัว ไม่ใช่ระดับกลางหัวพอดี ──
 * ระดับกลางหัวคือระดับหนวด ซึ่งยื่นออกมาทางขวาไกลกว่าที่คิด และยื่นไกลขึ้นอีก
 * บนจอสัมผัสที่น้องตัวโตกว่า (สเกล 3 แทน 2.6) ปุ่มจึงไปคาบเส้นหนวดพอดีบนมือถือ
 * ทั้งที่บนคอมดูห่างดี เยื้องขึ้นมาระดับปลายหูแล้วพ้นทั้งสองขนาด
 */
export const LOVE_BTN = { x: 585, y: 182 };

/**
 * ลำดับเวลาของการให้หัวใจ หน่วยเป็นเฟรมที่ 60fps
 *
 * hold นับรวมช่วงเข้า-ออกจากท่าแล้ว เหมือนกติกาของ IDLE_ACTS ข้างบน
 */
const LOVE = {
  fly: 32,     // หัวใจลอยจากปุ่มไปถึงหัวน้อง
  ease: 20,    // เข้า/ออกจากท่าดีใจ
  hold: 112,   // ช่วงที่น้องนั่งร้องเมี้ยว
  jump: 26,    // กระโดดดีใจหนึ่งครั้งตอนหัวใจถึงตัว
};
const LOVE_TOTAL = LOVE.fly + LOVE.hold;

/** ของกินตกแต่งบนหน้าแรก พิกัดวัดจากเท้าตัวละคร (dx ไปขวา, dy ขึ้นบนเป็นลบ) */
const HOME_DECO = [
  { dx: -180, dy: -62 },
  { dx: -152, dy: -156, kibble: true },
  { dx: -92, dy: -238 },
  { dx: 104, dy: -206, kibble: true },
  { dx: 152, dy: -104 },
];

/**
 * แต่งแสงฉากหลังหน้าแรก
 *
 * เรียกก่อนวาดตัวละคร ทุกอย่างในนี้จึงลงบน "ฉากหลัง" อย่างเดียว
 * ตัวน้องแมวที่วาดทีหลังยังสว่างเต็มที่เสมอ
 *
 * ครั้งแรกเคยไล่สีให้ขอบซ้าย-ขวา-บนมืด แล้วมันอ่านเป็นคราบดำฟุ้งทับรูป เลยถอดออกไป
 * รอบนี้กลับมาใหม่แต่คนละทรง — ถ่วงน้ำหนักไปทางล่างแทนที่จะมืดเท่ากันทุกด้าน
 * ซึ่งเป็นทิศทางที่ตาคนอ่านว่า "แสงมาจากข้างบน" ไม่ใช่ "รูปเปื้อน"
 * และช่วยให้ปุ่มเล่นกับปุ่มกระโดด/หมอบที่ลอยอยู่มุมล่างมีพื้นเข้มรองรับ
 */
/**
 * หรี่ฉากหลังให้ UI อ่านออก
 *
 * @param k ความแรง 1 = เต็มที่ (ใช้กับภาพถ่าย)
 *
 * ── ทำไมต้องมีตัวคูณ ──
 * ค่าเดิมถูกจูนไว้สำหรับ "ภาพถ่าย" ซึ่งคุมคอนทราสต์เองไม่ได้เลย จึงต้องกดแรง
 * ฉากที่วาดด้วยโค้ดคุมได้ตั้งแต่ต้นทาง กดแรงเท่าเดิมแล้วสีจะจมหมด
 * (วัดด้วยตาแล้ว: ขอบมืด 46% ทำให้พื้นทรายสีครีมกลายเป็นน้ำตาลโคลน)
 */
function dimForUi(ctx, k = 1) {
  const { W, H } = VIEW;
  const INK = '18,7,30';
  const a = (v) => (v * k).toFixed(3);

  // 1) หรี่เรียบบาง ๆ ทั้งผืน แค่พอกลบความจัดของสีให้เข้ากับโทนม่วงของเกม
  ctx.fillStyle = `rgba(${INK},${a(0.08)})`;
  ctx.fillRect(0, 0, W, H);

  // 2) ขอบมืดนุ่ม — ยกจุดศูนย์กลางขึ้นไปเหนือกลางจอ (0.34H)
  //    ขอบล่างจึงอยู่ไกลจากศูนย์กลางกว่าขอบบน แล้วมืดกว่าเองโดยไม่ต้องวาดแยก
  const edge = ctx.createRadialGradient(W / 2, H * 0.34, H * 0.30, W / 2, H * 0.34, H * 1.15);
  edge.addColorStop(0, `rgba(${INK},0)`);
  edge.addColorStop(0.62, `rgba(${INK},${a(0.10)})`);
  edge.addColorStop(1, `rgba(${INK},${a(0.46)})`);
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, W, H);

  // 3) แถบล่างอีกชั้น เริ่มจากครึ่งจอลงไป ให้พื้นจมหายเข้าไปในกรอบแทนที่จะโดนตัดห้วน ๆ
  const floor = ctx.createLinearGradient(0, H * 0.52, 0, H);
  floor.addColorStop(0, `rgba(${INK},0)`);
  floor.addColorStop(1, `rgba(${INK},${a(0.42)})`);
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, W, H);
}

export class Game {
  constructor({ onGameOver, onPitFall } = {}) {
    this.player = new Player();
    this.level = new Level();
    this.particles = new Particles();
    this.treasures = new TreasureRun();
    // พรสวรรค์ — เปลี่ยน "วิธีเคลื่อนที่" ของตัวน้อง คนละหน้าที่กับสมบัติ (ดู talent-run.js)
    this.talents = new TalentRun();
    this.onGameOver = onGameOver || (() => {});
    // ตกหลุมแล้วมีคนรับช่วงต่อไหม — ผู้เรียกจะถามผู้เล่นว่าจ่ายทองดึงขึ้นมาไหม
    // แล้วตัดสินใจเองว่าจะเรียก revive() หรือ onGameOver()
    // Game ไม่รู้จักทองและไม่รู้จักกล่องยืนยัน มันแค่บอกว่า "ตายด้วยการตกหลุมนะ"
    this.onPitFall = onPitFall || null;
    this.stage = getStage();
    this.best = loadBest(this.stage.id);
    this.reset();
    // นาฬิกาของหน้าแรกโดยเฉพาะ แยกจาก tick ของรอบเล่น
    // เพราะ tick หยุดเดินตอนไม่ได้อยู่ในสถานะ RUN แต่แมวหน้าแรกต้องขยับตลอด
    this.homeTick = 0;

    // คิวท่าว่าง — อยู่ในตัว Game ไม่ใช่ในฟังก์ชันวาด เพราะมันคือ "สถานะ"
    // ที่ต้องเดินต่อทุกเฟรม ส่วนฟังก์ชันวาดควรอ่านอย่างเดียวไม่จำอะไร
    this.idleAt = 0;      // ท่าถัดไปในตาราง
    this.idleWait = 0;    // ยืนเฉย ๆ มากี่เฟรมแล้ว
    this.idleT = -1;      // เฟรมในท่าปัจจุบัน (-1 = ยังไม่ได้ทำท่าอะไร)

    // ท่าตอบตอนถูกแตะ — ตัวชี้ท่าถัดไปอยู่นอก this.react เพราะมันต้องจำข้าม
    // การแตะแต่ละครั้ง ส่วน react เกิดใหม่ทุกครั้งที่แตะ
    this.reactAt = 0;
    // เฟรมก่อนปากอ้าอยู่ไหม — ใช้หาจังหวะที่ปากเพิ่งเปิด ซึ่งคือจังหวะที่ต้องออกเสียง
    this.mouthWas = false;

    // ฉากห้องก่อนเริ่มวิ่ง — เป็นแค่ "โหมดวาด" ไม่ใช่สถานะเกม
    // สถานะยังเป็น READY อยู่ ระบบหยุด/นับคะแนน/อินพุตจึงไม่ต้องรู้จักมันเลย
    this.inRoom = false;
  }

  /**
   * ตัวอักษรถัดไปที่ต้องเก็บ — null = ไม่ต้องวางแล้ว
   * Level เรียกฟังก์ชันนี้ตอนสร้างท่อน จึงวางเฉพาะตัวที่ผู้เล่นยังขาดจริง ๆ
   */
  nextLetterIndex() {
    if (this.bonus > 0 || this.letters >= WORD.length) return null;
    return this.letters;
  }

  /**
   * แตะสิ่งกีดขวางและหลุมไม่ได้ทั้งช่วงออกฤทธิ์และช่วงกะพริบ
   * ถ้าตัดฤทธิ์พร้อมกับที่เริ่มกะพริบ ผู้เล่นจะโดนชนตรงเฟรมที่เพิ่งเห็นสัญญาณ
   * ซึ่งรู้สึกเหมือนโดนโกง — สัญญาณเตือนต้องมาก่อนผลจริงเสมอ
   */
  get skillOn() {
    return this.skill > 0 || this.skillBlink > 0;
  }

  /**
   * กำลัง "พุ่ง" อยู่ไหม — โลกเร็วขึ้น และชนของแล้วของกระเด็นแตก
   *
   * เดิมมีแหล่งเดียวคือต้นหญ้าแมว (boost) ตอนนี้สกิลฮีโร่ก็พุ่งได้ด้วย
   * รวมเป็นคำถามเดียว ทุกจุดที่เคยถาม boost (ความเร็วโลก ชนกระเด็น ของร่วงแตก
   * ผึ้งกระเด็น) จึงรองรับสกิลพุ่งเองโดยไม่ต้องรู้ว่ามีสกิลอยู่ในเกม
   * ติดสปีดพร้อมใช้สกิลพุ่ง = เร็วเท่าเดิม ไม่คูณซ้อนกัน (เป็นสถานะ ไม่ใช่ตัวคูณ)
   */
  get dashing() {
    return this.boost > 0 || (this.skill > 0 && this.skillDef.tune.dash);
  }

  /**
   * กำลังบินด้วยสกิลอยู่ไหม — เฉพาะช่วงออกฤทธิ์ ไม่รวมช่วงกะพริบ
   * ช่วงกะพริบคืนแรงโน้มถ่วงให้ร่วงลงมาเองแบบฟิสิกส์ปกติ (หลุมยังแข็งอยู่เพราะ skillOn)
   * จะได้ลงบนเนิน/พื้นลอยตรงนั้นได้ถูก ไม่ใช่ไหลลงไปหาพื้นราบที่อาจจมอยู่ในเนิน
   */
  get skillFlying() {
    return this.skill > 0 && !!this.skillDef.tune.fly && this.bonus <= 0;
  }

  /** ระยะเก็บของกินที่สกิลบวกให้ (บอลหิมะ: โตจาก grab[0] ไป grab[1] ตามเวลาที่ผ่านไป) */
  get skillGrab() {
    const g = this.skill > 0 && this.skillDef.tune.grab;
    if (!g) return 0;
    const p = 1 - this.skill / this.skillDef.tune.active;
    return g[0] + (g[1] - g[0]) * p;
  }

  /** ตัวคูณคะแนนของกินจากสกิล (อุ้งเท้าทองคำ = 2) — นอกช่วงออกฤทธิ์เป็น 1 */
  get skillTreatMult() {
    return this.skill > 0 ? this.skillDef.tune.treatMult || 1 : 1;
  }

  /** สกิลที่กำลังออกฤทธิ์อยู่ดูดของรอบตัวไหม (เต้น = ดูด / ฮีโร่ = ไม่ดูด ต้องพุ่งผ่านเอง) */
  get skillMagnet() {
    return this.skill > 0 && this.skillDef.tune.magnet;
  }

  /**
   * ตอนนี้เหยียบหลุมได้เหมือนพื้นแข็งรึยัง
   *
   * มีสองอย่างที่ทำให้หลุมหาย: ความสามารถประจำตัว กับไอเทมสปีด
   * รวมไว้ที่เดียวเพื่อให้ player.js ถามคำถามเดียว ไม่ต้องไล่เช็คทีละแหล่ง
   * เพิ่มของใหม่ที่ทำให้ข้ามหลุมได้ในอนาคต ก็มาต่อเงื่อนไขที่นี่ที่เดียว
   */
  /**
   * กำลังอยู่ในฉากฟ้าหรือยัง — ของที่ปูไว้บนฟ้าวาดได้เฉพาะตอนนี้เท่านั้น
   * ช่วงปลารับตัวกับพาลงเป็นฉากพื้น ถ้าเผลอวาดของบนฟ้าตอนนั้นจะทับกันสองชั้น
   */
  get skyScene() {
    return this.bonusPhase === 'fly';
  }

  get pitsSolid() {
    // แมวลอยไม่เคยแตะพื้น หลุมจึงไม่มีความหมายสำหรับมัน
    return this.skillOn || this.boost > 0 || this.big > 0 || this.talents.floating;
  }

  /**
   * ตัวคูณขนาดตัวตอนนี้ — 1 = ปกติ, สูงสุด BIGCAN.scale ตอนโตเต็มที่
   *
   * ทุกอย่างที่เกาะตัวแมว (วงโล่ คลื่นดูด หลอดความสามารถ ฤทธิ์สมบัติ) ต้องอ่านค่านี้
   * ไม่งั้นมันจะยึดกล่องชนซึ่งไม่โตตามตัว แล้วไปโผล่ผ่ากลางตัวแมวตอนตัวใหญ่
   */
  get catScale() {
    // ปกติเริ่มที่ CAT_LOOK แต่ตอนโตเต็มที่ยังจบที่ BIGCAN.scale เท่าเดิม
    // ไม่คูณทับกัน — คูณแล้วได้ 2.65 ซึ่งเลยเพดานที่หัวเริ่มชนแถบ HUD ตอนกระโดดสูงสุด
    return CAT_LOOK + (BIGCAN.scale - CAT_LOOK) * this.bigK;
  }

  /**
   * ความ "โตเต็มที่" ตอนนี้ 0-1 — ใช้ทั้งขนาดตัวและจังหวะขา
   *
   * ค่อย ๆ ขยายตอนกินและค่อย ๆ ยุบก่อนหมดฤทธิ์ ไม่ใช่สลับขนาดทันที
   * ช่วงยุบสำคัญกว่าช่วงขยาย เพราะมันคือสัญญาณเดียวที่บอกว่า "กำลังจะหมดแล้ว"
   * ถ้าหดวูบตอนหมดพอดี ผู้เล่นที่กำลังพุ่งใส่สิ่งกีดขวางจะตายโดยไม่ทันตั้งตัว
   */
  get bigK() {
    if (this.big <= 0) return 0;
    const g = BIGCAN.grow;
    // ── ขาขยายนับจาก "เวลาที่โตมาแล้ว" ไม่ใช่จาก (frames - big) ──
    // สูตรเดิมอ่านความคืบหน้าจากตัวจับเวลาที่เหลือ พอเก็บกระป๋องซ้ำตอนยังโตอยู่
    // big ถูกตั้งกลับเป็นเต็ม ค่าที่คำนวณได้จึงเด้งกลับไปเป็น 0 = ตัวยุบเล็กวูบ
    // แล้วค่อยขยายใหม่ ทั้งที่ควรจะโตค้างไว้เฉย ๆ แล้วแค่ต่อเวลา
    // (กระป๋องเกิดห่างกันน้อยสุด 3.7 วินาที ส่วนฤทธิ์อยู่ 5 วินาที จึงเจอได้จริง)
    return Math.max(0, Math.min(1, this.bigGrow / g, this.big / g));
  }

  /**
   * จุดตัดสินใจเดียวว่าตอนนี้ควรเล่นเพลงอะไร
   *
   * เดิมสั่ง setMusicTrack กระจายอยู่หลายจุด ซึ่งชนกันแน่เมื่อสถานะซ้อนกัน
   * เช่นความสามารถกำลังทำงานอยู่แล้วเข้าโบนัสบนฟ้าพอดี — ใครสั่งทีหลังชนะ
   * ตอนนี้ทุกที่เรียก syncMusic() แล้วให้ฟังก์ชันนี้ตัดสินจากสถานะจริงแทน
   * ลำดับความสำคัญ: บนฟ้า > ความสามารถ > ปกติ
   */
  syncMusic() {
    if (this.state === STATE.READY) {
      // ฉากห้องก่อนเริ่มวิ่งต้องเงียบสนิท เหลือแค่เสียงน้องแมวร้องตอนพูด
      // เพลงหน้าแรกดังทับเสียงร้องจนฟังไม่ออกว่าน้องส่งเสียงอะไร
      setMusicTrack(this.inRoom ? SILENT : 'home');
    } else if (this.bonus > 0) setMusicTrack(this.scene.bonusTrack);
    else if (this.skill > 0) setMusicTrack(this.skillDef.tune.music);
    // เพลงประจำแมพ — ด่านที่ยังไม่ได้ประกาศ track ไว้ใช้เพลงกลางเหมือนเดิม
    // ปล่อยให้ตกกลับไป 'main' แทนที่จะบังคับให้ทุกด่านต้องมีเพลงของตัวเอง
    else setMusicTrack(this.scene.track || 'main');
  }

  reset() {
    // อ่านด่านใหม่ทุกครั้งที่รีเซ็ต ผู้เล่นอาจเพิ่งเลือกด่านอื่นจากหน้าแรก
    // ด่านที่เลือกจากหน้าแรก = "ฉากเริ่มต้น" ของตานี้ ไม่ใช่ฉากเดียวทั้งตา
    // ครบเวลาแล้วจะไล่ไปฉากถัดไปเอง (ดู updateScene)
    this.stage = getStage();
    this.sceneIndex = 0;
    this.scene = this.stage;          // ฉากที่กำลังวิ่งอยู่จริง
    this.nextScene = null;            // ฉากปลายทางระหว่างไล่สี (null = ไม่ได้กำลังเปลี่ยน)
    this.fade = 0;                    // เฟรมที่ไล่สีไปแล้ว
    this.nextSceneAt = SCENE.frames;  // ครบเมื่อไหร่ถึงเปลี่ยนฉาก
    // ทางเชื่อมระหว่างฉาก — ตั้งเป็น -Infinity แปลว่า "ตอนนี้ไม่ได้อยู่บนทางเชื่อม"
    // ใช้ค่านี้แทน null เพราะ onBridge เทียบด้วย < ตรง ๆ ได้เลยโดยไม่ต้องเช็ค null ก่อน
    this.bridgeAt = -Infinity;
    this.bridgeEnd = -Infinity;
    this.gate = null;   // ทางเข้าด่านที่กำลังวิ่งผ่าน (GateRun) — null = ไม่ได้อยู่ในทางเข้า
    // ภาพทางเข้าบางแบบมีชั้นแคชขนาดใหญ่ (พุ่มดอกไม้) — สร้างตอนเริ่มรอบซึ่งยังไม่มีอะไรให้หลบ
    // ดีกว่าไปสร้างตอนตัดสินใจเปลี่ยนฉาก ซึ่งผู้เล่นอาจกำลังกระโดดข้ามของอยู่
    for (const def of GATE_LIST) warmGateArt(def, this.renderScale);
    this.clearedScenes = 0;           // ผ่านด่านย่อยไปกี่ฉากแล้วในตานี้
    // ผ่านด่านไหนไปกี่ครั้งในตานี้ { space: 1, ... } — จบตาแล้วส่งเข้า stats.js
    // ภารกิจปลดสกิลประจำด่านนับจากตรงนี้ (ดู skills.js)
    this.clears = {};

    this.pal = this.stage.palette;
    this.best = loadBest(this.stage.id);
    // สถิติก่อนตานี้ — หน้าสรุปเอาไปโชว์เป็น "สถิติเดิม" ตอนทำสถิติใหม่ได้
    // ต้องเก็บแยกไว้ เพราะ this.best ถูกทับด้วยคะแนนใหม่ตั้งแต่ตอนตาย
    this.prevBest = this.best;
    this.level.reset(Level.routeFor(this.stage), this.stage.theme, Level.loops(this.stage));
    this.armSceneClock(this.stage);
    this.level.nextLetter = () => this.nextLetterIndex();

    this.state = STATE.READY;

    // ลำดับ "ให้หัวใจ" ที่กำลังเล่นอยู่ — null คือไม่ได้เล่นอยู่
    // ล้างที่นี่ด้วย เพราะคนกดเล่นระหว่างแอนิเมชันยังเล่นไม่จบได้เสมอ
    // ถ้าไม่ล้าง หัวใจจะค้างลอยทับฉากด่านจริง แล้วท่านั่งจะทับท่าวิ่ง
    // ส่วนของขวัญที่ค้างอยู่ไม่หาย — main.js จ่ายให้เองตอนเริ่มรอบ (ดู settleLove)
    this.love = null;
    // ท่าตอบตอนถูกแตะก็ต้องล้างด้วยเหตุผลเดียวกัน — ท่านอนตะแคงที่ค้างอยู่
    // จะกลายเป็นน้องวิ่งตะแคงข้างไปทั้งด่าน
    this.react = null;
    // ตัวจำสถานะปากต้องล้างด้วย ไม่งั้นรอบหน้าที่กลับมาล็อบบี้ จะค้างว่าปากยังอ้าอยู่
    // แล้วกลืนเสียงแรกของท่าถัดไปหนึ่งครั้ง
    this.mouthWas = false;

    this.camera = 0;
    this.speed = SPEED.run;   // คงที่ตลอดรอบ ระยะกระโดดจึงเท่าเดิมเสมอ
    this.distance = 0;
    // สะสมคะแนนตรง ๆ ไม่นับจำนวนเม็ด เพราะของเก็บมีหลายราคาแล้ว
    this.treat = 0;
    this.score = 0;
    this.shake = 0;
    this.tick = 0;
    this.shielded = false;
    this.magnet = 0;      // เฟรมที่แม่เหล็กยังทำงานเหลืออยู่
    this.letters = 0;     // เก็บตัวอักษร SPEEDCAT ได้กี่ตัวแล้ว
    this.bonus = 0;       // เฟรมที่เหลือของโหมดโบนัส (0 = ไม่ได้อยู่ในโบนัส)
    this.bonusPhase = '';
    // กล้องของ "ฉากฟ้า" ระหว่างโบนัส — เดินหน้าแทน this.camera ซึ่งถูกแช่ไว้ทั้งช่วง
    // ด่านข้างล่างจึงค้างอยู่ที่เดิม แล้วปลาพาลงมาส่งจุดเดิมที่ขึ้นไปพอดี
    this.bonusCam = 0;
    this.catMood = '';
    this.bonusTreats = [];
    this.bonusMagnets = [];
    // ตำแหน่งปลาเก็บเป็นพิกัดจอ ไม่ใช่พิกัดโลก เพราะมันเกาะอยู่กับตัวแมว
    // ซึ่งตรึงอยู่ที่ PLAYER_X ตลอด ไม่ต้องแปลงกลับไปกลับมาให้ยุ่ง
    this.fishX = VIEW.W + 140;
    this.fishY = GROUND_Y - 60;
    this.fishDir = -1;
    this.flash = 0;        // ความเข้มแสงวาบตอนสลับฉาก 0-1
    this.flashInk = false; // true = วาบดำ (ขากลับ) / false = วาบขาว (ขาขึ้น)

    // ความสามารถประจำตัว (สกิล): ชาร์จ → ออกฤทธิ์ → กะพริบ → ชาร์จใหม่
    // อ่านสกิลที่ติดตั้งใหม่ทุกตา เหมือนพรสวรรค์ — เปลี่ยนในเมนูแล้วมีผลตาถัดไป
    this.skillDef = getEquippedSkill();
    this.charge = 0;       // เฟรมที่ชาร์จไปแล้ว
    this.skill = 0;        // เฟรมที่เหลือของช่วงออกฤทธิ์
    this.skillBlink = 0;   // เฟรมที่เหลือของช่วงกะพริบ (ยังอมตะ)
    this.rain = [];        // เม็ดที่โปรยลงมา
    this.skyLane = 1;      // ระดับบินของสกิลบิน (ดัชนีใน tune.lanes) — เริ่มกลาง
    this.skyTrain = 0;     // เฟรมสะสมก่อนปล่อยขบวนขนมถัดไป (สกิลบิน)
    this.skyMods = false;  // สกิลบินกำลังยืม mods ของตัวละครอยู่ไหม (ต้องคืนตอนเลิก)
    this.pulseT = 0;       // เฟรมสะสมก่อนคลื่นเสียงลูกถัดไป (สกิลคริสตัล)
    this.pulseR = -1;      // รัศมีคลื่นที่กำลังวิ่งอยู่ (px) — ติดลบ = ไม่มีคลื่น
    this.boost = 0;        // เฟรมที่เหลือของสปีดจากต้นหญ้าแมว
    this.big = 0;          // เฟรมที่เหลือของช่วงตัวโตจากอาหารกระป๋อง
    this.revives = 0;      // ดึงขึ้นจากหลุมไปแล้วกี่ครั้งในตานี้ — คุมราคาครั้งถัดไป
    this.bigGrow = 0;      // โตมาแล้วกี่เฟรม ใช้คุมขาขยาย (ดู bigK)
    this.stepAcc = 0;      // เศษเวลาที่ยังไม่ครบหนึ่งก้าวฟิสิกส์
    this.syncMusic();      // เผื่อรอบก่อนจบตอนกำลังออกฤทธิ์หรืออยู่บนฟ้า
    this.invuln = 0;
    this.hp = HEALTH.max;
    this.dying = 0;   // นับเฟรมที่พลังแตะศูนย์แล้วแต่ยังไม่ตาย
    this.hurtFlash = 0;
    this.notice = 0;                          // เฟรมที่เหลือของข้อความแจ้งเตือน
    this.noticeText = '';                     // ข้อความที่จะโชว์ (ขวดพลัง / ผ่านด่าน)
    this.nextFallerAt = FALLER.everyFrames;   // ของร่วงชิ้นแรกของฉาก
    this.nextHazardAt = HAZARD.everyFrames;   // อันตรายที่ขยับได้ชิ้นแรก
    // เข้าหน้าแรกใหม่ให้ยืนตั้งหลักก่อนเสมอ ไม่ใช่โผล่มากลางท่าที่ค้างจากรอบก่อน
    this.idleWait = 0;
    this.idleT = -1;

    this.player.reset();
    this.particles.clear();
    // อ่านสมบัติที่ติดตั้งไว้ใหม่ทุกตา ผู้เล่นอาจเพิ่งสลับชุดจากหน้าเลือกด่าน
    this.treasures.reset();
    // พรสวรรค์ก็อ่านใหม่ทุกตาด้วยเหตุผลเดียวกัน แล้วผูกตัวปรับการเคลื่อนที่เข้ากับตัวละครทันที
    this.talents.reset(this.player);
    this.level.ensureAhead(this.camera);
  }

  start() {
    this.reset();
    this.state = STATE.RUN;
    // ต้องเรียกซ้ำหลังตั้ง RUN — reset() รันตอน state ยังเป็น READY
    // ถ้าไม่เรียก เพลงหน้าแรกจะค้างเล่นต่อไปทั้งที่เริ่มวิ่งแล้ว
    this.syncMusic();
  }

  // ── อินพุต ─────────────────────────────────────────────────

  jump() {
    if (this.state !== STATE.RUN) return;

    // ระหว่างโบนัส ปุ่มเดียวกันเปลี่ยนหน้าที่เป็น "ตีปีก" ไม่ใช่กระโดด
    // คุมได้เฉพาะช่วงลอยอยู่แล้ว ช่วงทะยานขึ้นกับร่อนลงเป็นแอนิเมชันล้วน
    if (this.bonus > 0) {
      if (this.bonusPhase !== 'fly') return;
      this.player.vy = BONUS.flapV;
      this.particles.dust(PLAYER_X + this.camera, this.player.y + 16, 4);
      sfx.jump();
      return;
    }

    // สกิลบิน: ปุ่มกระโดด = ขึ้นหนึ่งระดับ (มาก่อนพรสวรรค์ — ระหว่างบินสกิลเป็นเจ้าของตัว)
    if (this.skillFlying) {
      this.shiftSkyLane(+1);
      return;
    }

    // พรสวรรค์บางใบยืมปุ่มกระโดดไปทำอย่างอื่น (แมวลอยใช้เปลี่ยนระดับ)
    if (this.talents.onJumpPress(this)) return;

    const kind = this.player.jump();
    if (kind === 'extra') {
      // จังหวะที่เพิ่มมาจากพรสวรรค์ — ประกายสีทองคนละสีกับชั้นสอง ให้รู้ว่าเป็นของพิเศษ
      const b = this.player.box;
      this.particles.burst(b.x + this.camera + b.w / 2, this.player.y - 10, 12, 'letter', 4.5);
      sfx.double();
    } else if (kind === 'single') {
      this.particles.dust(PLAYER_X + 12 + this.camera, GROUND_Y, 6);
      sfx.jump();
    } else if (kind === 'double') {
      this.particles.burst(PLAYER_X + 20 + this.camera, this.player.y - 10, 8, 'mint', 3);
      sfx.double();
    } else if (this.treasures.tryExtraJump(this)) {
      // กระโดดหมดสิทธิ์แล้ว แต่ลูกโป่งพร้อมใช้ — ยกให้อีกครั้ง
      // ทำที่นี่ไม่ใช่ใน player.js เพื่อให้ตัวละครไม่ต้องรู้จักระบบสมบัติเลย
      this.player.vy = PHYSICS.doubleJumpV;
      this.particles.burst(PLAYER_X + 20 + this.camera, this.player.y - 10, 10, 'letter', 4);
      sfx.double();
    }
  }

  setSlide(on) {
    if (this.state !== STATE.RUN) return;
    // สกิลบิน: กดหมอบ = ลงหนึ่งระดับ ปล่อยปุ่มไม่ทำอะไร (ไม่ส่งต่อให้ตัวละครหมอบกลางฟ้า)
    if (this.skillFlying) {
      if (on) this.shiftSkyLane(-1);
      return;
    }
    // แมวลอย: กดหมอบตอนอยู่สูง = ลดระดับ ไม่ใช่หมอบ
    if (this.talents.onSlide(this, on)) return;
    this.player.setSlide(on);
  }

  /** เปลี่ยนระดับบินของสกิลบิน — ชนเพดาน/พื้นแล้วไม่ทำอะไร (ไม่มีเสียงผิดให้รำคาญระหว่างบินรัว ๆ) */
  shiftSkyLane(dir) {
    const lanes = this.skillDef.tune.lanes;
    const to = Math.max(0, Math.min(lanes.length - 1, this.skyLane + dir));
    if (to === this.skyLane) return;
    this.skyLane = to;
    const b = this.player.box;
    this.particles.burst(b.x + this.camera + b.w / 2, b.y + b.h / 2, 6, 'mint', 3);
    sfx.jump();
  }

  /**
   * สกิลบินยืมโหมดลอยของตัวละคร (mods.laneY ตัวเดียวกับพรสวรรค์แมวลอย)
   * เรียกทุกเฟรมหลังพรสวรรค์เขียน mods ของมันเสร็จ สกิลจึงทับได้ชั่วคราวโดยไม่แก้ talent-run.js
   * เลิกบินแล้วให้พรสวรรค์เขียน mods ของมันคืนหนึ่งครั้ง — ไม่ติดพรสวรรค์ก็ได้ค่าปกติ
   * (ตอนไม่ติดพรสวรรค์ talent-run ไม่เขียน mods ทุกเฟรม ถ้าไม่คืนเอง ตัวจะลอยค้าง)
   */
  applySkyMods() {
    const m = this.player.mods;
    if (this.skillFlying) {
      const tn = this.skillDef.tune;
      m.laneY = tn.lanes[this.skyLane];
      m.laneEase = tn.flyEase;
      this.player.slideHeld = false;
      this.skyMods = true;
    } else if (this.skyMods) {
      this.skyMods = false;
      this.talents.writeMods(this.player, this.bonus > 0);
    }
  }

  /** ปล่อยปุ่มกระโดด — ใช้กับพรสวรรค์ที่ต้องกดค้าง (ร่อน / บังคับกลางอากาศ) */
  jumpRelease() {
    this.talents.onJumpRelease();
  }

  /** ปุ่มท่าพิเศษของพรสวรรค์ */
  useTalent() {
    if (this.state !== STATE.RUN) return false;
    return this.talents.useSkill(this);
  }

  // ── หยุด/เล่นต่อ ───────────────────────────────────────────
  // update() มี `if (this.state !== STATE.RUN) return` อยู่แล้ว
  // แค่เปลี่ยน state เกมก็หยุดเอง ส่วน draw() ยังวาดเฟรมค้างไว้ตามปกติ

  pause() {
    if (this.state !== STATE.RUN) return false;
    this.state = STATE.PAUSE;
    return true;
  }

  resume() {
    if (this.state !== STATE.PAUSE) return false;
    this.state = STATE.RUN;
    // ปล่อยหมอบทิ้ง เพราะถ้าปล่อยนิ้ว/คีย์ตอนหยุดอยู่ setSlide จะถูกบล็อก
    // ไม่งั้นกลับมาเล่นต่อแล้วแมวหมอบค้างโดยไม่ได้กดอะไร
    this.player.setSlide(false);
    this.talents.onJumpRelease();
    this.talents.slideHeld = false;
    return true;
  }

  // ── ลูปอัปเดต ──────────────────────────────────────────────

  update(dt) {
    if (this.state === STATE.DEAD) {
      this.player.updateDead(dt);
      this.shake *= 0.88;
      this.hurtFlash = Math.max(0, this.hurtFlash - 0.06 * dt);
      this.particles.update(dt);
      return;
    }
    if (this.state === STATE.READY) {
      this.homeTick += dt;
      this.stepLove(dt);
      this.stepReact(dt);
      this.stepIdle(dt);
      this.stepVoice();
    }
    if (this.state !== STATE.RUN) return;

    this.tick += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.notice > 0) this.notice -= dt;
    this.hurtFlash = Math.max(0, this.hurtFlash - 0.06 * dt);
    this.flash = Math.max(0, this.flash - BONUS.flashFade * dt);

    // เร่งเวลาเฉพาะ "โลก" ไม่ใช่ตัวจับเวลา
    // ตัวจับเวลาทุกตัว (พลัง ความสามารถ แม่เหล็ก โบนัส สปีด) ยังเดินด้วย dt จริง
    // ไม่งั้นของดีที่เก็บมาจะหมดอายุเร็วขึ้นตามไปด้วย กลายเป็นโทษแทนรางวัล
    if (this.boost > 0) this.boost -= dt;
    if (this.big > 0) {
      this.big -= dt;
      this.bigGrow = Math.min(BIGCAN.grow, this.bigGrow + dt);
    }
    // พรสวรรค์คูณเวลาโลกเพิ่มอีกชั้น (พุ่ง = เร็วขึ้นช่วงสั้น / หยุดจังหวะ = ช้าลง)
    // ใช้กลไกเดียวกับสปีดจากต้นหญ้าแมว ตัวจับเวลาทุกตัวจึงยังเดินด้วยเวลาจริงเหมือนเดิม
    const gdt = dt * (this.dashing ? SPEEDUP.mult : 1) * this.talents.timeK;

    if (this.bonus > 0) return this.updateBonus(dt, gdt);

    // พลังไหลลงตลอด ไม่ว่าจะหลบเก่งแค่ไหน — นี่คือตัวกำหนดความยาวของรอบ
    //
    // ยิ่งฉากลึก ยิ่งไหลเร็ว (ดูเหตุผลใน HEALTH) ฉากแรกไหลน้อยกว่าที่ขวดฟื้นให้
    // ผู้เล่นจึงมีพลังเหลือไว้พลาดได้บ้างตอนต้น แล้วโดนบีบขึ้นเรื่อย ๆ ตอนท้าย
    //
    // หารด้วย SCENE.frames ตรงนี้ ค่าที่ตั้งไว้จึงเป็น "พลังต่อฉาก" เสมอ
    // เปลี่ยนความยาวฉากเมื่อไหร่ สมดุลก็ยังเท่าเดิมโดยไม่ต้องแก้ตัวเลขตาม
    const perScene = HEALTH.drainFirstScene + HEALTH.drainPerScene * this.sceneIndex;
    this.hp -= (perScene / SCENE.frames) * dt;
    if (this.hp <= 0) {
      this.hp = 0;
      // ── ยังไม่ตายทันที ──
      // ปล่อยให้เฟรมนี้เดินต่อจนจบก่อน เพราะการเก็บตัวอักษร (ซึ่งเป็นตัวจุดโบนัส)
      // อยู่ "ท้ายเฟรม" หลังจุดนี้ ถ้าคืนค่าออกไปเลย คนที่กำลังจะแตะตัวที่ 8 พอดี
      // จะตายทั้งที่โบนัสควรมารับไปแล้ว
      this.dying += dt;
      if (this.dying > HEALTH.graceFrames) return this.die();
    } else {
      this.dying = 0;
    }

    // เดินโลกด้วยก้าวขนาด 1 เฟรมอ้างอิงเป๊ะ ๆ เศษที่เหลือเก็บไว้เฟรมถัดไป
    //
    // ห้ามส่ง gdt ก้อนเดียวเข้า player.update เด็ดขาด เกมอินทิเกรตแบบ Euler
    // ซึ่งมีค่าคลาดเคลื่อนแปรตามขนาดก้าว (y เพี้ยนไป g·t·h/2)
    // ก้าว 1.4 เท่าทำให้แมวตกต่ำกว่าเส้นอ้างอิง ~3px ที่ยอดโค้ง
    // ขณะที่กล่องซ้อนสามชั้นมีระยะเผื่อแค่ 2.3px → ชนทั้งที่กดถูกจังหวะ
    // (ซอยเป็น 1.0+0.4 ก็ยังไม่พอ ขนาดก้าวไม่เท่าเดิมก็เพี้ยนคนละทิศแทน)
    //
    // ก้าวคงที่ = 1 เท่านั้น เส้นทางในพิกัดโลกจึงตรงกับ jumpPath() ใน level.js
    // ที่ใช้วางอาหารทุกเม็ด ไม่ว่าจะติดสปีดอยู่หรือเฟรมจะตกแค่ไหน
    // ท่าเดินช้าลงตอนร่างยักษ์ หางต้องแกว่งช้าลงตามด้วย ไม่งั้นหางจะสะบัดถี่
    // อยู่คนละจังหวะกับขาที่ค่อย ๆ ก้าว
    this.player.gaitK = 1 + (BIGCAN.gait - 1) * this.bigK;

    // เดินพรสวรรค์ก่อนก้าวฟิสิกส์ ตัวปรับการเคลื่อนที่ของเฟรมนี้จึงมีผลทันเฟรมนี้เลย
    this.talents.update(dt, this);
    this.applySkyMods();

    let justLanded = false, justSlid = false, fellOut = false;
    for (this.stepAcc += gdt; this.stepAcc >= 1; this.stepAcc -= 1) {
      this.camera += this.speed;
      this.distance += this.speed;
      const r = this.player.update(1, this);
      justLanded = justLanded || r.justLanded;
      justSlid = justSlid || r.justSlid;
      fellOut = fellOut || r.fellOut;
    }
    if (justLanded) {
      this.particles.dust(PLAYER_X + this.player.ox + this.camera, GROUND_Y, 5);
      sfx.land();
      // แมวหนัก: ลงพื้นทีจอสั่นนิด ๆ กับฝุ่นฟุ้งเพิ่ม — ความหนักต้อง "รู้สึก" ได้ ไม่ใช่แค่ตกเร็ว
      if (this.talents.landShake) {
        this.shake = Math.max(this.shake, this.talents.landShake);
        this.particles.dust(PLAYER_X + this.player.ox + this.camera, GROUND_Y, 7);
      }
    }
    if (justSlid) {
      this.particles.dust(PLAYER_X + this.camera, GROUND_Y, 4);
      sfx.slide();
    }
    if (fellOut) return this.die('fall');

    const b = this.player.box;
    const bx = b.x + this.camera;

    // ชิ้นที่ถูกชนไปแล้ว: ปลิวตามแรงที่ได้รับ หมุนไปด้วย แล้วจางหาย
    // อัปเดตก่อนเช็คชน จะได้ไม่มีเฟรมไหนที่มันยังอยู่ที่เดิมแต่ชนไม่ได้
    for (const o of this.level.obstacles) {
      if (!o.smashed) continue;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.vy += SPEEDUP.smash.gravity * dt;
      o.rot += o.spin * dt;
      o.life -= dt;
    }

    // ชนสิ่งกีดขวาง
    for (const o of this.level.obstacles) {
      // ต้องข้ามก่อนบรรทัด break ข้างล่าง ชิ้นที่ปลิวไปข้างหน้าจะได้ไม่ไปตัดลูป
      // ทิ้งทั้งที่ยังมีสิ่งกีดขวางจริงรออยู่ถัดไป
      if (o.smashed) continue;
      if (o.x + o.w < this.camera - 60) continue;
      if (o.x > this.camera + VIEW.W) break;
      if (rectHit(bx, b.y, b.w, b.h, o.x, o.y, o.w, o.h)) {
        // ติดสปีด หรือตัวโตจากกระป๋อง = พุ่งชนกระเด็น ไม่ใช่ทะลุผ่านเฉย ๆ
        //
        // ── ทำไมตัวโตต้องชนให้กระเด็น ไม่ใช่ผ่านทะลุ ──
        // ทะลุผ่านแบบไม่มีอะไรเกิดขึ้นเลยอ่านเป็น "ชนไม่โดน" ซึ่งดูเหมือนบั๊ค
        // มากกว่าดูเหมือนพลัง ทั้งที่ภาพบนจอคือแมวตัวเท่าบ้านเดินชนหนามอยู่
        // ให้ของกระเด็นออกไปแทน ภาพกับความรู้สึกจึงตรงกัน และได้คะแนนพุ่งชนด้วย
        if (this.dashing || this.big > 0) {
          this.smashObstacle(o);
          continue;
        }
        if (this.skillOn) break;               // ความสามารถทำงาน ทะลุผ่านได้เลย
        if (this.talents.phasing) break;       // พรสวรรค์แมวเงา ทะลุผ่านได้
        if (this.invuln > 0) break;            // กำลังอมตะ ผ่านได้
        if (this.shielded) {                   // มีโล่ → โล่แตกแทนที่จะตาย
          this.shielded = false;
          this.invuln = SHIELD.invulnFrames;
          this.shake = 10;
          this.particles.burst(bx + b.w / 2, b.y + b.h / 2, 16, 'dust', 6);
          sfx.shieldBreak();
          break;
        }
        // แมวสะท้อน: เด้งกลับแทนการเจ็บ (มาหลังโล่ ของที่เก็บได้ในด่านจึงถูกใช้ก่อนเสมอ)
        if (this.talents.tryReflect(this, bx + b.w / 2, b.y + b.h / 2)) break;
        this.takeHit(bx + b.w / 2, b.y + b.h / 2);
        break;
      }
    }

    // takeHit อาจทำให้พลังหมดแล้วตายไปแล้ว ต้องหยุดก่อนไปเก็บของ
    if (this.state !== STATE.RUN) return;

    const cx = bx + b.w / 2;
    const cy = b.y + b.h / 2;

    this.updateSkill(dt, cx, cy);

    // แม่เหล็กทำงาน: ลากของกินที่อยู่ในรัศมีเข้าหาปากแมว
    // ต้องทำก่อนลูปเก็บ ของที่ถูกลากมาจนถึงตัวจะได้ถูกเก็บในเฟรมเดียวกันเลย
    if (this.magnet > 0) this.magnet -= dt;

    // ดูดของในแมพเข้าหาตัว — เกิดได้สองทาง: เก็บไอเทมแม่เหล็ก
    // หรือกำลังใช้ความสามารถประจำตัว (ซึ่งมีแม่เหล็กติดตัวอยู่ในนั้น)
    // ระยะของความสามารถแคบกว่าไอเทมนิดหน่อย ไอเทมที่ต้องออกแรงเก็บจึงยังคุ้มกว่า
    // แรงแม่เหล็กติดตัวจากสมบัติ (ดอกไม้ม่วง) — อ่อนกว่าไอเทมเสมอ
    // ใช้เฉพาะตอนไม่มีไอเทมและไม่ได้ใช้ความสามารถ ของแรงกว่าจึงชนะเสมอ
    // ไม่ได้บวกทับกัน ไม่งั้นคนที่พกดอกไม้จะได้แม่เหล็กแรงกว่าคนที่เก็บไอเทมมาได้
    const petal = this.treasures.magnetPull;
    if (this.magnet > 0 || this.skillMagnet || petal > 0) {
      // ── ตัวคูณความอ่อนของแม่เหล็กดอกไม้ ──
      //
      // แยกตัวคูณ "ระยะ" ออกจาก "ความเร็ว" เพราะสองอย่างนี้มีข้อจำกัดคนละแบบ:
      //
      //   ความเร็ว มีพื้นตายตัวที่ 6.8 (ความเร็วกล้อง) ต่ำกว่านั้นของที่อยู่ข้างหลัง
      //            ไม่มีวันตามทัน = ดูดไม่ได้สักชิ้น จึงลดได้แค่ในกรอบแคบ ๆ
      //   ระยะ     ไม่มีพื้น ลดได้เต็มที่ตามต้องการ
      //
      // เดิมใช้ตัวคูณเดียวกันทั้งคู่ (0.45 + petal x 0.55) ซึ่งถูกพื้นของความเร็ว
      // ดึงให้ระยะลดตามไม่ได้ — ลด pull จาก 0.26 ลงไปถึง 0.08 ระยะขยับแค่ 249->207px
      // แยกออกจากกันแล้วจึงลดพลังได้จริงโดยที่ยังดูดของเข้ามาได้อยู่
      const weak = this.magnet > 0 || this.skillMagnet ? 1 : 0.5 + petal * 0.55;
      const reach = this.magnet > 0 || this.skillMagnet ? 1 : 0.3 + petal * 0.6;
      const range = this.magnet > 0 ? MAGNET.range
        : this.skillMagnet ? SKILL.magnetRange
        : MAGNET.range * reach;
      // สร้างครั้งเดียวนอกลูป ของในระยะมีได้หลายสิบชิ้นต่อเฟรม
      const cfg = {
        range,
        base: MAGNET.minPull * weak,
        rush: MAGNET.rush * weak,
        turn: MAGNET.turn,
        ease: MAGNET.ease,
        swirl: MAGNET.swirl,
        vary: MAGNET.vary,
      };
      // ── ใครดูดอะไรได้บ้าง ──
      // ความสามารถประจำตัว กับ ดอกไม้ม่วง = ดูดได้ทุกอย่างในสนาม ทั้งไอเทมสปีด
      // แม่เหล็ก โล่ ขวดยา อาหารกระป๋อง และของชนิดใหม่ที่จะเพิ่มทีหลัง
      // (ดู Level.pullables — เพิ่มของใหม่ที่นั่นที่เดียว ที่นี่ตามไปเอง)
      //
      // ส่วนไอเทมแม่เหล็กที่เก็บได้ในด่านดูดแค่ของกินกับตัวอักษร ตั้งใจให้ต่างกัน:
      // มันแลกด้วยระยะที่กว้างเกือบครึ่งจอ ส่วนดอกไม้แลกด้วยระยะที่แคบกว่าครึ่ง
      // สองอย่างจึงไม่ใช่ของชิ้นเดียวกันที่แรงไม่เท่ากัน แต่เป็นคนละเครื่องมือ
      const lists = this.skillMagnet || petal > 0
        ? this.level.pullables
        : [this.level.fishes, this.level.letters];

      // รอบนี้ทำหน้าที่เดียว: ตัดสินว่าชิ้นไหน "เข้าเขตดูด" แล้วบ้าง
      // ไม่ได้ขยับของเอง การขยับไปอยู่ในรอบดึงเข้าตัวข้างล่างทั้งหมด
      for (const list of lists) {
        for (const f of list) {
          // mvx มีค่าแล้ว = เคยถูกจับไปแล้ว ไม่ต้องจับซ้ำและห้ามรีเซ็ตความเร็วมัน
          if (f.got || f.mvx !== undefined) continue;
          const d = Math.hypot(cx - f.x, cy - f.y);
          if (d > range || d < 1) continue;
          // dt = 0 คือ "ตั้งค่าเริ่มต้นโดยไม่ขยับ" — seek() ตั้ง mvx/mvy/msw/mrnd
          // ให้ในบล็อกแรก แล้วส่วนที่เหลือคูณด้วย dt จึงไม่มีผลอะไร
          seek(f, cx, cy, d, cfg, 0);
        }
      }
    }

    // ── ของที่ถูกจับแล้วต้องเข้าตัวเสมอ ──
    //
    // รอบนี้เดินทุกเฟรมไม่ว่าแม่เหล็กจะยังทำงานอยู่หรือไม่ และไม่สนระยะทางเลย
    //
    // เดิมการดูดอยู่ในเงื่อนไข "แม่เหล็กติดอยู่ และ ของอยู่ในรัศมี" ผลคือของที่
    // กำลังบินตามหลังอยู่จะค้างกลางอากาศทันทีที่แม่เหล็กหมดอายุ หรือทันทีที่มัน
    // ถูกทิ้งจนหลุดรัศมี — ซึ่งเกิดตลอดตอนติดสปีด เพราะกล้องวิ่งเร็วขึ้น 1.8 เท่า
    // แต่แรงดูดเท่าเดิม ของจึงตามไม่ทันแล้วหลุดขอบไปนิ่งอยู่กลางจอ
    //
    // แก้ด้วยการทำให้ "การถูกจับ" เป็นประตูทางเดียว: เข้าเขตดูดเมื่อไหร่ก็ถือว่า
    // เป็นของผู้เล่นแล้ว ที่เหลือคือเดินทางมาให้ถึงเท่านั้น
    //
    // แรงในรอบนี้ใช้ของแม่เหล็กเต็มกำลังเสมอ ไม่ว่าจะถูกจับมาด้วยอะไร
    // ความอ่อนของดอกไม้จึงไปแสดงออกที่ "รัศมีที่จับได้" อย่างเดียว ไม่ใช่ที่
    // ความเร็วตอนบินเข้า — ซึ่งตรงกับที่ควรเป็น เพราะของที่ดูดติดแล้ว
    // ไม่มีเหตุผลอะไรให้บินช้าจนผู้เล่นต้องมองมันไล่ตามอยู่ครึ่งจอ
    const worldMult = this.dashing ? SPEEDUP.mult : 1;
    const reel = {
      range: MAGNET.range,
      // คูณเฉพาะ "ความเร็วพื้น" ด้วยความเร็วโลกตอนติดสปีด ของที่อยู่ข้างหลัง
      // จึงไล่ทันเท่าเดิมเสมอ (ตัวจับเวลาเดินด้วย dt จริง แต่กล้องเดินด้วย gdt)
      base: MAGNET.minPull * worldMult,
      // ── ทำไม rush ไม่คูณตาม ──
      // rush คือแรงที่เพิ่มตอนจ่อตัว ซึ่งเป็นระยะที่ไล่ทันไปแล้ว ไม่ต้องเร่งอีก
      // และถ้าคูณด้วย ความเร็วสูงสุดจะพุ่งเป็น 68 px/เฟรม ซึ่งชนเพดาน
      // "พุ่งข้ามระยะเก็บในเฟรมเดียว" พอดี (ระยะเก็บปลา 33px ทั้งสองฝั่ง = 66)
      // ที่โค้ดเดิมจงใจกันไว้ตอนตั้งค่าชุดนี้ — ไม่คูณแล้วพีคอยู่ที่ 51.6 ยังปลอดภัย
      rush: MAGNET.rush,
      // ล็อกเป้าแล้วเข้าเลย ไม่ไต่แรงตามระยะเหมือนตอนกำลังจับ (ดู MAGNET.reel)
      turn: MAGNET.reel.turn,
      ease: MAGNET.reel.ease,
      swirl: MAGNET.swirl,
      vary: MAGNET.vary,
    };
    for (const list of this.level.pullables) {
      for (const f of list) {
        if (f.got || f.mvx === undefined) continue;
        const d = Math.hypot(cx - f.x, cy - f.y);
        if (d < 1) continue;

        // ── กันพุ่งข้ามตัวแมวไปในเฟรมเดียว ──
        // เพดานความเร็วข้างบนคิดจาก dt = 1 แต่เครื่องที่เฟรมตกจะได้ dt โตกว่านั้น
        // ก้าวเดียวอาจข้ามจากนอกระยะเก็บฝั่งหนึ่งไปนอกระยะอีกฝั่ง แล้วเด้งวนอยู่
        // รอบตัวแมวโดยไม่ถูกเก็บสักที — ซึ่งเป็นอาการเดียวกับที่กำลังแก้อยู่นี่เอง
        // ถ้าก้าวนี้จะเลยเป้าอยู่แล้ว วางลงบนตัวแมวเลย รอบเก็บของข้างล่างรับต่อเอง
        if (Math.hypot(f.mvx, f.mvy) * dt >= d) {
          f.x = cx;
          f.y = cy;
          f.mvx = 0;
          f.mvy = 0;
          continue;
        }
        seek(f, cx, cy, d, reel, dt);
      }
    }

    // เก็บของกิน — คะแนนล้วน ไม่ฟื้นพลัง พลังมาจากขวดยาอย่างเดียว
    this.pickTreats(cx, cy, !this.player.onGround);
    // แมวสองโลก: ร่างเงาเก็บของพร้อมกับตัวจริงด้วยกติกาเดียวกันทุกข้อ (คะแนน สมบัติ เสียง)
    // นับเป็น "เก็บกลางอากาศ" เสมอ เพราะร่างเงาไม่เคยแตะพื้น
    if (this.talents.twinCollects) {
      const tc = this.talents.twinCenter;
      this.pickTreats(tc.x + this.camera, tc.y, true);
    }

    // เก็บขวดพลัง
    for (const p of this.level.potions) {
      if (p.got || p.x < this.camera - 40) continue;
      if (Math.hypot(cx - p.x, cy - p.y) < POTION.pickR) {
        p.got = true;
        this.hp = Math.min(HEALTH.max, this.hp + POTION.heal);
        this.particles.burst(p.x, p.y, 20, 'crumb', 6);
        this.notice = 0;   // เก็บได้แล้ว ข้อความเตือนไม่ต้องค้างต่อ
        sfx.potion();
      }
    }

    // เก็บแม่เหล็ก — เก็บซ้ำระหว่างที่ยังมีผลอยู่ = ต่อเวลาใหม่เต็ม ไม่ใช่สะสม
    for (const m of this.level.magnets) {
      if (m.got || m.x < this.camera - 40) continue;
      if (Math.hypot(cx - m.x, cy - m.y) < MAGNET.pickR) {
        m.got = true;
        this.magnet = MAGNET.frames;
        this.particles.burst(m.x, m.y, 16, 'mint', 5);
        sfx.magnet();
      }
    }

    // เก็บต้นหญ้าแมว — เก็บซ้ำระหว่างที่ยังติดอยู่ = ต่อเวลาใหม่เต็ม
    // และซ้อนกับแม่เหล็ก ความสามารถ หรือโบนัสได้หมด เพราะเป็นคนละตัวจับเวลากัน
    for (const n of this.level.nips) {
      if (n.got || n.x < this.camera - 40) continue;
      if (Math.hypot(cx - n.x, cy - n.y) < SPEEDUP.pickR) {
        n.got = true;
        this.boost = SPEEDUP.frames;
        this.particles.burst(n.x, n.y, 18, 'nip', 6);
        sfx.nip();
      }
    }

    // เก็บอาหารกระป๋อง — เก็บซ้ำระหว่างที่ยังโตอยู่ = ต่อเวลาใหม่เต็ม
    // ซ้อนกับสปีดหรือความสามารถได้ เพราะเป็นคนละตัวจับเวลากัน
    for (const k of this.level.cans) {
      if (k.got || k.x < this.camera - 40) continue;
      if (Math.hypot(cx - k.x, cy - k.y) < BIGCAN.pickR) {
        k.got = true;
        // เก็บซ้ำตอนยังโตอยู่ = ต่อเวลาเฉย ๆ ไม่ต้องเริ่มขาขยายใหม่
        // ถ้ารีเซ็ต bigGrow ทุกครั้ง ตัวจะยุบวูบแล้วโตใหม่ทั้งที่ควรโตค้างไว้
        if (this.big <= 0) this.bigGrow = 0;
        this.big = BIGCAN.frames;
        this.particles.burst(k.x, k.y, 18, 'dust', 6);
        sfx.nip();
      }
    }

    // ฝุ่นใต้เท้าตอนตัวโตเหยียบพื้น — ตัวใหญ่ต้องรู้สึกหนัก ไม่ใช่แค่ภาพใหญ่ขึ้น
    if (this.big > 0 && this.player.onGround
        && Math.floor(this.tick) % BIGCAN.trailEvery === 0) {
      this.particles.dust(PLAYER_X + this.camera, GROUND_Y, 2);
    }

    // ประกายเขียวตามหลังตอนติดสปีด ปล่อยจากด้านหลังตัวเพื่อให้อ่านเป็น "เส้นทางที่ผ่านมา"
    if (this.boost > 0 && Math.floor(this.tick) % SPEEDUP.trailEvery === 0) {
      this.particles.burst(bx + 4, b.y + b.h * 0.7, 3, 'nip', 3);
    }

    // วิ่งข้ามปากหลุมอยู่: โปรยประกายใต้เท้าตรงที่ควรจะไม่มีพื้น
    // ถ้าไม่มีสัญญาณอะไรเลย ภาพที่เห็นคือแมวลอยอยู่เหนือช่องว่าง
    // ซึ่งอ่านเป็นบั๊กมากกว่าอ่านเป็น "เร็วจนไม่ตก"
    if (this.boost > 0 && this.player.onGround
      && this.level.isOverPit(bx + b.w / 2)) {
      this.particles.burst(bx + b.w / 2, GROUND_Y - 2, 3, 'nip', 4);
    }

    // เก็บตัวอักษร SPEEDCAT
    for (const l of this.level.letters) {
      if (l.got || l.x < this.camera - 40) continue;
      if (Math.hypot(cx - l.x, cy - l.y) < LETTER.pickR) {
        l.got = true;
        this.letters = Math.min(WORD.length, this.letters + 1);
        this.treat += SCORING.pointsPerLetter;
        this.particles.burst(l.x, l.y, 16, 'letter', 5);
        sfx.letter(this.letters);
        if (this.letters >= WORD.length) this.startBonus();
      }
    }

    // เก็บโล่
    for (const s of this.level.shields) {
      if (s.got || s.x < this.camera - 40) continue;
      if (Math.hypot(cx - s.x, cy - s.y) < s.r + 24) {
        s.got = true;
        this.shielded = true;
        this.particles.burst(s.x, s.y, 12, 'dust', 5);
        sfx.shield();
      }
    }

    this.level.cull(this.camera);
    this.level.ensureAhead(this.camera);

    // ต้องอยู่หลัง ensureAhead เสมอ เพราะ spawnPotion อ่านหนาม/หลุมข้างหน้า
    // เพื่อหาจุดโล่ง ถ้าเรียกก่อนจะได้จุด "โล่ง" ปลอมที่พอวิ่งถึงจริงกลับมีหนามอยู่
    this.updateScene(dt);
    this.updateFallers(dt, cx, cy);
    this.updateHazards(dt, cx, cy);

    // เดินเวลาของสมบัติหลังเก็บของครบแล้ว ตัวนับในเฟรมนี้จึงถูกนับก่อนเช็คเงื่อนไข
    this.treasures.update(dt, this);

    this.score =
      Math.floor(this.distance / SCORING.pxPerScorePoint) + this.treat;

    this.emitTrail(dt);
    this.particles.update(dt);
    this.shake *= 0.9;
  }

  /**
   * เก็บของกินรอบจุดหนึ่ง (พิกัดโลก)
   *
   * แยกออกมาจาก update() เพื่อให้ร่างเงาของแมวสองโลกเรียกใช้ซ้ำได้
   * ถ้าก๊อปลูปไปอีกชุด วันหนึ่งจะมีคนแก้คะแนนหรือตัวคูณสมบัติที่เดียวแล้วอีกตัวไม่ตาม
   */
  pickTreats(cx, cy, midAir) {
    for (const f of this.level.fishes) {
      if (f.got || f.x < this.camera - 40) continue;
      // กุ้งตัวใหญ่กว่า ระยะเก็บเลยกว้างกว่าให้สมกับที่ตาเห็น
      const pad = (f.kind === 'shrimp' ? SHRIMP.pickPad : 22) + this.skillGrab;
      if (Math.hypot(cx - f.x, cy - f.y) < f.r + pad) {
        f.got = true;
        // อุ้งเท้าแมวคูณคะแนนของกินทุกชิ้น คูณหลังบวกโบนัสชุดแล้ว
        // ทั้งสองอย่างจึงทบกันได้จริงตามที่ตั้งใจ
        const m = this.treasures.treatMult * this.skillTreatMult;
        // อุ้งเท้าทองคำ: ประกายทองเพิ่มตอนเก็บ ให้รู้ว่าชิ้นนี้ได้คะแนนคูณ
        if (this.skillTreatMult > 1) this.particles.burst(f.x, f.y, 8, 'letter', 4);
        if (f.kind === 'shrimp') {
          this.treat += Math.round((SCORING.pointsPerShrimp + this.foodBonus) * m);
          this.particles.burst(f.x, f.y, 22, 'shrimp', 7);
          sfx.shrimp();
        } else if (f.kind === 'kibble') {
          this.treat += Math.round((SCORING.pointsPerKibble + this.foodBonus) * m);
          this.particles.burst(f.x, f.y, 10, 'kibble');
          sfx.kibble();
        } else {
          this.treat += Math.round((SCORING.pointsPerFish + this.foodBonus) * m);
          this.particles.burst(f.x, f.y, 7, 'mint');
          sfx.fish();
        }
        // นับให้สมบัติที่ผูกกับการเก็บของ — midAir ตัดสินจากเท้าลอยพ้นพื้นจริง ๆ
        this.treasures.onTreat(this, midAir);
      }
    }
  }

  /**
   * หางเม็ดประจำชุด — ชุดที่ไม่ได้ประกาศ trail ไว้จะไม่มีอะไรเกิดขึ้นเลย
   *
   * ปล่อยจากท้ายตัวแมว ไม่ใช่กลางตัว เม็ดจะได้โผล่จาก "ข้างหลัง" ตั้งแต่เฟรมแรก
   * ไม่ใช่โผล่ทับตัวแล้วค่อยไหลออกมา ซึ่งจะเห็นเป็นเม็ดผุดกลางตัวละคร
   */
  emitTrail(dt) {
    const cfg = getSkin().outfit?.trail;
    if (!cfg) return;

    this.trailTick = (this.trailTick || 0) + dt;
    if (this.trailTick < cfg.every) return;
    this.trailTick = 0;

    const b = this.player.box;
    this.particles.trail(b.x + this.camera + b.w * 0.25, b.y + b.h * 0.55, cfg);
  }

  /**
   * พุ่งชนสิ่งกีดขวางตอนติดสปีด — ไม่เจ็บ ได้คะแนน แล้วชิ้นนั้นปลิวออกไป
   * สุ่มแรงในช่วงที่ตั้งไว้ ชิ้นที่โดนชนติด ๆ กันจึงไม่ปลิวทางเดียวกันเป๊ะ
   */
  smashObstacle(o) {
    this.knockAway(o);
    this.treat += SCORING.pointsPerSmash;
    this.shake = 9;
    this.particles.burst(o.x + o.w / 2, o.y + o.h / 2, 18, 'nip', 7);
    sfx.smash();
  }

  /**
   * ใส่แรงกระเด็นให้ของชิ้นหนึ่ง — ใช้ได้กับทั้งสิ่งกีดขวางและของอันตราย
   *
   * แยกออกมาจาก smashObstacle เพราะของอันตราย (ผึ้ง/ลูกบอล/ไฟ) ต้องกระเด็น
   * ด้วยกติกาเดียวกันเป๊ะ ถ้าเขียนแยกกัน วันหนึ่งจะปรับแรงที่เดียวแล้วอีกฝั่งไม่ตาม
   * แล้วผู้เล่นจะรู้สึกว่า "ชนของสองชนิดนี้ให้ผลไม่เหมือนกัน" โดยบอกไม่ถูกว่าทำไม
   */
  knockAway(o) {
    const s = SPEEDUP.smash;
    const rnd = (a, b) => a + Math.random() * (b - a);

    o.smashed = true;
    o.vx = rnd(s.vx[0], s.vx[1]);
    o.vy = rnd(s.vy[0], s.vy[1]);
    o.rot = 0;
    // สุ่มทิศหมุน แต่บังคับความเร็วขั้นต่ำไว้ 35% ของเพดาน
    // ถ้าปล่อยให้สุ่มได้ทั้งช่วง บางชิ้นจะได้ค่าใกล้ศูนย์แล้วปลิวไปแบบไม่หมุนเลย
    // ซึ่งดูเหมือนของค้างกลางอากาศมากกว่าของที่เพิ่งโดนชน
    o.spin = (Math.random() < 0.5 ? -1 : 1) * rnd(s.spin * 0.35, s.spin);
    o.life = s.life;
  }

  /**
   * พุ่งชนของอันตรายตอนติดสปีดหรือตัวโต
   *
   * ── ทำไมต้องมี ──
   * ของกีดขวางธรรมดาชนแล้วกระเด็นแตกมาตั้งแต่แรก (ดูเหตุผลที่ smashObstacle)
   * แต่ของอันตรายกลับ "ทะลุผ่านเงียบ ๆ" ไม่มีอะไรเกิดขึ้นเลยสักอย่าง
   * ซึ่งเป็นอาการเดียวกับที่คอมเมนต์ตรงนั้นบอกว่าอ่านเป็นบั๊คมากกว่าอ่านเป็นพลัง
   * กติกาถูกเขียนไว้แล้วแต่ไม่เคยถูกเอามาใช้กับของกลุ่มนี้
   */
  smashHazard(h) {
    if (h.smashed) return;
    const cx = h.x + h.w / 2;
    const cy = h.y + h.h / 2;
    this.knockAway(h);

    this.treat += SCORING.pointsPerSmash;
    this.shake = 9;
    this.particles.burst(cx, cy, 18, 'nip', 7);
    sfx.smash();
  }

  /** ชนแล้วเจ็บ ไม่ตายทันที — ตายก็ต่อเมื่อพลังหมดเกลี้ยง */
  takeHit(x, y) {
    // นมวิเศษรับไว้ให้ครั้งแรกของตา — ไม่เสียพลังเลย แถมได้โล่ต่อ
    // เช็คก่อนหักพลังเสมอ ไม่งั้นจะเจ็บไปแล้วค่อยรู้ว่ากันได้
    if (this.treasures.onHit(this)) {
      this.invuln = HEALTH.invulnAfterHit;
      this.shake = 8;
      this.particles.burst(x, y, 14, 'dust', 6);
      sfx.shield();
      return;
    }

    this.hp -= HEALTH.hitDamage;
    this.invuln = HEALTH.invulnAfterHit;
    this.shake = 12;
    this.hurtFlash = 1;
    this.particles.burst(x, y, 14, 'crumb', 6);
    sfx.hurt();

    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
  }

  /**
   * ของประกอบฉากของแมพที่กำลังวิ่งอยู่
   *
   * ระหว่างเปลี่ยนฉาก จานสีไล่ทีละเฟรมอยู่แล้ว แต่ของประกอบฉากเป็นรูปทรงคนละชุด
   * ไล่สีให้ไม่ได้ — ถ้าสลับดื้อ ๆ ตอนไล่สีจบ หินย้อยทั้งจอจะโผล่พรึบในเฟรมเดียว
   * จึงค่อย ๆ จางของเก่าออกพร้อมจางของใหม่เข้า ใช้ตัวเดียวกับที่คุมการไล่สี
   */
  /**
   * ของประดับฉากหลัง ระหว่างเปลี่ยนฉากต้อง "ผลัดกัน" ไม่ใช่ "ทับกัน"
   *
   * ── ทำไมจางไขว้พร้อมกันไม่ได้ ──
   * เดิมวาดฉากเก่าที่ alpha 1-t และฉากใหม่ที่ alpha t พร้อมกัน
   * ตรงกลางทางจึงเป็นของสองชุดซ้อนกันชุดละครึ่งจาง มองทะลุกันไปมา
   * ชั้นวางกับเตาอบของครัวลอยทับก้อนเมฆกับต้นไม้ของสวน อ่านไม่ออกว่าอะไรเป็นอะไร
   *
   * ปัญหาไม่ได้อยู่ที่ค่า alpha แต่อยู่ที่ "ของทึบสองชิ้นอยู่ที่เดียวกันพร้อมกัน"
   * ลดความจางแค่ไหนก็ยังซ้อนอยู่ดี ต้องไม่ให้มันอยู่พร้อมกันตั้งแต่แรก
   *
   * ครึ่งแรกจึงจางฉากเก่าออกจนหมดก่อน แล้วครึ่งหลังค่อยจางฉากใหม่เข้ามา
   * ช่วงรอยต่อจะเหลือแค่ฟ้ากับเนินเขา ซึ่งยังไล่สีต่อเนื่องอยู่ตลอดผ่าน mixPalette
   * ภาพที่ได้จึงเป็น "ที่เดิมสลายไป แล้วที่ใหม่ก่อตัวขึ้น" ไม่ใช่ภาพซ้อน
   */
  /**
   * เริ่มทางเข้าด่าน — ต่อท่อนของทางเข้าไว้หน้าเส้นทางของฉากใหม่
   *
   * เส้นทางของฉากใหม่ต้องใส่ "ตอนนี้" ไม่ใช่ตอนสลับฉาก เพราะ Level ปูท่อนล่วงหน้าเกือบสองจอ
   * ท่อนแรกหลังทางเข้าจะถูกปูตั้งแต่แมวยังอยู่ในร้าน (ท่อนนั้นเป็นท่อนปลอดภัยเสมอ ดู composeRoute)
   * nextChunkX ตอนนี้ = จุดต่อจากของฉากเก่าที่ปูไว้แล้ว ทางเข้าจึงเริ่มหลังของเดิมพอดี
   */
  beginGate(def, next) {
    this.level.switchRoute([{ fn: def.chunk }, ...Level.routeFor(next)], next.theme, Level.loops(next));
    this.placeGate(def, next, this.level.nextChunkX);
    this.noticeText = 'ผ่านด่าน! กำลังเข้า' + next.name;
    this.notice = SCENE.noticeFrames;
    sfx.bonus();
  }

  placeGate(def, next, x0) {
    this.gate = new GateRun(def, x0, next);
    // ใช้ช่วงเดียวกับทางเชื่อมเดิม — ของประจำแมพ (ผึ้ง/ของร่วง) จึงไม่โผล่ในทางเข้า (ดู onBridge)
    this.bridgeAt = x0;
    this.bridgeEnd = x0 + def.layout.length;
    // สร้างสไปรต์ของอาคารไว้ก่อน — ตอนนี้อาคารยังอยู่นอกจอไกลอย่างน้อยหนึ่งจอ
    // (ปกติสร้างเสร็จแล้วตั้งแต่เริ่มรอบ ตรงนี้เป็นประกันกรณีสเกลจอเปลี่ยนระหว่างเล่น)
    warmGateArt(def, this.renderScale);
  }

  updateGate(dt) {
    const g = this.gate;
    if (g.update(this.camera, dt)) this.activateGate();
    if (g.activated && g.isDone(this.camera)) this.gate = null;
  }

  /** สลับฉากจริง — เรียกเฉพาะตอนอาคารปิดจอเต็ม ผู้เล่นจึงไม่เห็นฉากเปลี่ยนต่อหน้า */
  activateGate() {
    const g = this.gate;
    this.scene = g.to;
    this.pal = g.to.palette;
    this.armSceneClock(g.to);
    this.syncMusic();
  }

  /**
   * ฟ้า + เนิน + ของประกอบฉาก
   *
   * ด่านที่ประกาศ backdrop ไว้ (เช่นชายหาดยามเย็น) ใช้ภาพฉากหลังของตัวเองแทนฟ้ากับเนิน
   * เพื่อให้ต่อกับทางเข้าด่านได้สนิท (ดู BACKDROPS ใน render/background.js)
   *
   * ── ระหว่างไล่สีไปฉากถัดไป ──
   * ฉากหลังพิเศษไม่ได้คุมด้วยจานสี ถ้าปล่อยไว้เฉย ๆ มันจะดับวูบตอนสลับฉากจริง
   * จึงค่อย ๆ เอาฟ้า/เนินของจานสีผสมมาทับตามความคืบหน้าของการไล่สี — ได้รอยต่อนุ่มเหมือนด่านอื่น
   */
  drawBackdrop(ctx) {
    const paint = BACKDROPS[this.scene.backdrop];
    if (!paint) {
      drawSky(ctx, this.camera, this.pal);
      this.drawProps(ctx, 'far');
      drawHills(ctx, this.camera, this.pal);
      this.drawProps(ctx, 'near');
      return;
    }
    paint(ctx, this.camera, this.tick);
    const t = this.nextScene ? Math.min(1, this.fade / SCENE.fadeFrames) : 0;
    if (t > 0) {
      ctx.save();
      ctx.globalAlpha = t;
      drawSky(ctx, this.camera, this.pal);
      drawHills(ctx, this.camera, this.pal);
      ctx.restore();
    }
    this.drawProps(ctx, 'far');
    this.drawProps(ctx, 'near');
  }

  drawProps(ctx, band) {
    const t = this.nextScene ? Math.min(1, this.fade / SCENE.fadeFrames) : 0;

    // ครึ่งแรก: 1 -> 0   ครึ่งหลัง: 0 ตลอด
    const oldA = Math.max(0, 1 - t / 0.5);
    // ครึ่งแรก: 0 ตลอด   ครึ่งหลัง: 0 -> 1
    const newA = Math.max(0, (t - 0.5) / 0.5);

    if (oldA > 0 && this.scene.layers) {
      ctx.save();
      ctx.globalAlpha = oldA;
      drawProps(ctx, this.camera, this.scene.layers, band, this.pal, this.tick);
      ctx.restore();
    }
    if (newA > 0 && this.nextScene?.layers) {
      ctx.save();
      ctx.globalAlpha = newA;
      drawProps(ctx, this.camera, this.nextScene.layers, band, this.pal, this.tick);
      ctx.restore();
    }
  }

  // ── ของร่วงจากเพดาน ────────────────────────────────────────

  /**
   * เดินของร่วง แล้วเช็คว่าโดนแมวไหม
   *
   * ฉากที่ไม่ได้ประกาศ faller ไว้จะไม่มีอะไรเกิดขึ้นเลย — ของชิ้นนี้เป็น
   * "ของประจำแมพ" ไม่ใช่ของกลางที่ทุกแมพต้องเจอ
   *
   * กติกาการโดนใช้ชุดเดียวกับสิ่งกีดขวางทุกข้อ (สปีด/สกิล/อมตะ/โล่)
   * ไม่ได้เขียนกฎใหม่ ผู้เล่นจึงไม่ต้องเรียนรู้ข้อยกเว้นเพิ่ม
   */
  updateFallers(dt, cx, cy) {
    const cfg = this.scene.faller;
    // ฉากที่ไม่ได้ประกาศ faller ยังต้องเดินของร่วงที่ "ท่อน" วางมาเองด้วย
    // ไม่งั้นของที่คนออกแบบวางไว้จะค้างอยู่บนเพดาน ไม่ร่วง ไม่ชน ไม่หายไปไหน
    if (!cfg && !this.level.fallers.length) return;

    if (cfg && this.tick >= this.nextFallerAt) {
      // กติกาเดียวกับของประจำแมพชนิดอื่น — ทางเชื่อมต้องโล่งจริง (ดู updateHazards)
      if (!this.onBridge) this.level.spawnFaller(this.camera + VIEW.W + 80, FALLER.warnFrames);
      this.nextFallerAt = this.tick + (cfg.every || FALLER.everyFrames);
    }

    const hdt = dt * Math.min(1, this.talents.timeK);
    if (this.level.updateFallers(hdt, this.camera)) this.shake = Math.max(this.shake, 5);

    const b = this.player.box;   // getter ไม่ใช่เมธอด
    const bx = b.x + this.camera;
    for (const f of this.level.fallers) {
      if (f.warn > 0) continue;                   // ยังไม่ร่วง ยังไม่อันตราย
      if (!rectHit(bx, b.y, b.w, b.h, f.x, f.y, f.w, f.h)) continue;

      if (this.skillOn || this.talents.phasing || this.invuln > 0) break;
      // ของร่วงเป็นก้อนแข็งเหมือนสิ่งกีดขวาง ตัวโตจึงต้องทุบแตกด้วยกติกาเดียวกัน
      if (this.dashing || this.big > 0) { f.dead = true; break; }
      if (this.shielded) {
        this.shielded = false;
        this.invuln = SHIELD.invulnFrames;
        this.shake = 10;
        f.dead = true;
        sfx.shieldBreak();
        break;
      }
      if (this.talents.tryReflect(this, cx, cy)) { f.dead = true; break; }
      f.dead = true;
      this.takeHit(cx, cy);
      break;
    }
  }

  /**
   * เดินอันตรายที่ขยับได้ แล้วเช็คว่าโดนแมวไหม
   *
   * ฉากที่ไม่ได้ประกาศ hazard ไว้จะไม่มีอะไรเกิดขึ้นเลย — เป็นของประจำแมพ
   * กติกาการโดนใช้ชุดเดียวกับสิ่งกีดขวางทุกข้อ (สปีด/สกิล/อมตะ/โล่)
   * ผู้เล่นจึงไม่ต้องเรียนรู้ข้อยกเว้นใหม่
   */
  updateHazards(dt, cx, cy) {
    const cfg = this.scene.hazard;
    // เหตุผลเดียวกับของร่วง — ท่อนวางผึ้ง/ลูกบอลเองได้แม้ฉากไม่ได้ประกาศไว้
    if (!cfg && !this.level.hazards.length) return;

    if (cfg && this.tick >= this.nextHazardAt) {
      // ทางเชื่อมต้องโล่งจริง — เลื่อนนัดหน้าออกไปแทนที่จะปล่อยของ
      // ถ้าแค่ข้ามเฉย ๆ นัดจะค้างอยู่ในอดีต แล้วพอพ้นทางเชื่อมจะโผล่รัวติดกันทันที
      if (this.onBridge) {
        this.nextHazardAt = this.tick + (cfg.every || HAZARD.everyFrames);
      } else {
        this.level.spawnHazard(cfg.kind, this.camera + VIEW.W + 90, this.camera);
        this.nextHazardAt = this.tick + (cfg.every || HAZARD.everyFrames);
      }
    }

    this.level.updateHazards(dt * Math.min(1, this.talents.timeK), this.camera);

    // ชิ้นที่โดนชนไปแล้ว ปลิวตามแรงที่ได้รับเหมือนสิ่งกีดขวางทุกประการ
    for (const h of this.level.hazards) {
      if (!h.smashed) continue;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.vy += SPEEDUP.smash.gravity * dt;
      h.rot += h.spin * dt;
      h.life -= dt;
    }

    const b = this.player.box;
    const bx = b.x + this.camera;
    for (const h of this.level.hazards) {
      const box = this.level.hazardBox(h);
      if (!box) continue;                        // ไฟกำลังดับ หรือโดนชนไปแล้ว
      if (!rectHit(bx, b.y, b.w, b.h, box.x, box.y, box.w, box.h)) continue;

      // ตัวโตจากกระป๋องหรือติดสปีด = พุ่งชนให้กระเด็น ไม่ใช่ทะลุผ่านเฉย ๆ
      // เงื่อนไขและผลลัพธ์ชุดเดียวกับสิ่งกีดขวาง ผู้เล่นจึงไม่ต้องเรียนรู้ข้อยกเว้นใหม่
      if (this.dashing || this.big > 0) {
        this.smashHazard(h);
        continue;
      }
      if (this.skillOn || this.talents.phasing || this.invuln > 0) break;
      if (this.shielded) {
        this.shielded = false;
        this.invuln = SHIELD.invulnFrames;
        this.shake = 10;
        // เดิมไม่มีเม็ดฝุ่นตรงนี้ ทั้งที่ตอนโล่แตกกับสิ่งกีดขวางมี
        // โล่แตกสองแบบจึงให้ภาพไม่เท่ากันโดยไม่มีเหตุผล
        this.particles.burst(bx + b.w / 2, b.y + b.h / 2, 16, 'dust', 6);
        sfx.shieldBreak();
        break;
      }
      if (this.talents.tryReflect(this, cx, cy)) break;
      this.takeHit(cx, cy);
      break;
    }
  }

  // ── ด่านย่อย ───────────────────────────────────────────────

  /**
   * เดินเวลาของฉาก แล้วสลับไปฉากถัดไปเมื่อครบเวลา
   *
   * ── ลำดับที่เกิดขึ้นตอนครบเวลาหนึ่งฉาก ──
   *   1. ปล่อยขวดพลังใหญ่ไว้ข้างหน้า = รางวัลผ่านด่าน (ที่เดียวที่ขวดโผล่แล้ว)
   *   2. สลับลำดับท่อนกับธีมภาพเป็นของฉากถัดไป — ท่อนที่วางไว้แล้วยังเป็นของเดิม
   *   3. เริ่มไล่สีจานสีเก่าไปใหม่ ใช้เวลา SCENE.fadeFrames
   *
   * จานสีถูกคำนวณใหม่ทุกเฟรมระหว่างไล่สีเท่านั้น จบแล้วชี้ไปที่จานสีจริงของฉาก
   * ไม่ต้องผสมทิ้งทุกเฟรมตลอดทั้งตา
   */
  /**
   * กำลังวิ่งอยู่บนทางโล่งที่คั่นระหว่างฉากหรือเปล่า
   *
   * ช่วงนี้ต้องไม่มีของประจำแมพโผล่ (ดู updateFallers / updateHazards)
   * ไม่งั้นทางเชื่อมที่ตั้งใจให้เป็นจังหวะพักจะกลายเป็นด่านอีกด่านหนึ่ง
   */
  get onBridge() {
    return this.camera + PLAYER_X < this.bridgeEnd;
  }

  /**
   * ตั้งเส้นตายของฉากใหม่
   *
   * ด่านที่วิ่งวนไม่รู้จบใช้เวลาเป็นตัวจบฉากเหมือนเดิม (SCENE.frames = หนึ่งนาที)
   * ด่านที่เขียนลำดับท่อนเองจบด้วย "ท่อนสุดท้าย" แทน จึงต้องดันเส้นตายออกไปไกล ๆ
   * ไม่งั้นนาฬิกาจะตัดจบกลางลำดับที่ออกแบบไว้ — ครัวกลางคืนยาวกว่าหนึ่งนาทีพอสมควร
   *
   * ดันออกไปเฉย ๆ ไม่ได้ตั้งเป็น Infinity เพราะปุ่ม "ข้ามฉาก" ในหน้าดีบั๊กสั่งข้าม
   * ด้วยการดันนาฬิกาให้ถึงเส้นตาย ถ้าเป็น Infinity ปุ่มนั้นจะพัง
   */
  armSceneClock(stage) {
    this.nextSceneAt = this.tick + (Level.loops(stage) ? SCENE.frames : SCENE.frames * 100);
  }

  /**
   * ความคืบหน้าของฉากนี้ 0 → 1 (หลอดระยะบน HUD อ่านค่านี้)
   * ด่านที่จบตามลำดับท่อนวัดด้วย "ระยะที่วิ่งไปแล้ว" ส่วนด่านที่วิ่งวนวัดด้วยเวลาเหมือนเดิม
   */
  get sceneProgress() {
    // กำลังเปลี่ยนฉากอยู่ (ไล่สีอยู่ หรือเดินอยู่ในทางเข้าด่าน) = ด่านนี้จบแล้ว หลอดเต็ม
    if (this.nextScene || this.gate) return 1;
    const span = this.level.routeSpan;
    // ── ทำไมเส้นชัยไม่ใช่ปลายท่อนสุดท้าย ──
    // ฉากเปลี่ยนตั้งแต่ "ปูท่อนสุดท้ายเสร็จ" ซึ่งตอนนั้นแมวยังตามอยู่ข้างหลังราวจอครึ่ง
    // บวกอีกท่อน (ดู Level.ensureAhead) ถ้าวัดถึงปลายจริง หลอดจะค้างอยู่ราว 80%
    // แล้วกระโดดเป็นเต็มตอนเข้าทางเข้า — หักระยะล่วงหน้าออกไปเลย หลอดจึงเต็มพอดีจังหวะ
    const goal = span ? span.to - (VIEW.W + LEVEL.chunkW) : 0;
    const k = span && goal > span.from
      ? (this.camera + PLAYER_X - span.from) / (goal - span.from)
      : 1 - (this.nextSceneAt - this.tick) / SCENE.frames;
    return Math.max(0, Math.min(1, k));
  }

  updateScene(dt) {
    // ── อยู่ในทางเข้าด่าน ──
    // สลับฉากเกิดข้างใน updateGate ตอนจอถูกอาคารปิดเต็ม ไม่มีการไล่สีแบบทางเชื่อมเดิม
    if (this.gate) {
      this.updateGate(dt);
      return;
    }

    if (this.nextScene) {
      // ยังวิ่งไม่ถึงทางเชื่อม = ยังไม่เริ่มไล่สี
      // ผู้เล่นจะได้อยู่กับฉากเก่าจนวิ่งพ้นของที่วางไว้แล้วจริง ๆ
      // ถ้าไล่สีทันทีตอนครบเวลา ฉากจะเปลี่ยนตั้งแต่ยังหลบหนามของฉากเดิมอยู่
      if (this.camera + PLAYER_X < this.bridgeAt) return;

      this.fade += dt;
      const t = Math.min(1, this.fade / SCENE.fadeFrames);
      this.pal = mixPalette(this.scene.palette, this.nextScene.palette, t);
      if (t >= 1) {
        // ถึงปลายทางแล้ว เลิกผสมสีทุกเฟรม กลับไปใช้จานสีจริงของฉากใหม่
        this.scene = this.nextScene;
        this.pal = this.scene.palette;
        this.nextScene = null;
        this.fade = 0;
        this.syncMusic();                       // เพลงประจำแมพใหม่เริ่มตรงนี้
        this.armSceneClock(this.scene);
      }
      return;   // ระหว่างไล่สียังไม่เริ่มนับเวลาฉากใหม่ กันเปลี่ยนซ้อนกัน
    }

    // ── ถึงเวลาเปลี่ยนฉากหรือยัง ──
    // ด่านที่วิ่งวน: ครบนาที
    // ด่านที่เขียนลำดับท่อนเอง: ปูท่อนสุดท้ายเสร็จแล้ว (ตอนนั้นผู้เล่นยังวิ่งตามอยู่ข้างหลัง
    //   ราวสองท่อน ทางเข้าด่านถัดไปจึงถูกวางต่อท้ายท่อนสุดท้ายพอดี วิ่งถึงแล้วเข้าได้เลย)
    // นาฬิกายังมีผลอยู่ทั้งสองแบบ ปุ่ม "ข้ามฉาก" ในหน้าดีบั๊กจึงยังใช้ได้เหมือนเดิม
    if (this.tick < this.nextSceneAt && !this.level.routeDone) return;

    this.sceneIndex++;
    this.clearedScenes++;
    // ฉากที่เพิ่งวิ่งจบคือ this.scene (ยังไม่ได้สลับ — สลับตอนไล่สี/ในทางเข้า)
    this.clears[this.scene.id] = (this.clears[this.scene.id] || 0) + 1;
    const next = sceneAt(this.stage.id, this.sceneIndex);

    // ฉากที่มีทางเข้าของตัวเอง — วิ่งทะลุสถานที่จริงแทนทางเชื่อมไล่สี (gates.js)
    const gate = gateFor(next);
    if (gate) {
      this.beginGate(gate, next);
      return;
    }

    // ── ต่อทางโล่งคั่นก่อนเข้าฉากใหม่ ──
    // ท่อนที่ 0 คือทางเรียบล้วน ไม่มีหนามไม่มีหลุม มีแต่ปลาให้เก็บ
    // ต่อไว้หน้าเส้นทางของฉากใหม่ ผู้เล่นจึงวิ่งยาว ๆ เก็บขวดได้ก่อนเจอของจริง
    const bridge = Array.from({ length: SCENE.bridgeChunks }, () => ({ p: 0 }));
    this.level.switchRoute([...bridge, ...Level.routeFor(next)], next.theme, Level.loops(next));

    // nextChunkX คือจุดที่ท่อนถัดไปจะไปวาง = จุดเริ่มของทางเชื่อมพอดี
    // ของที่วางไว้ล่วงหน้าแล้วยังเป็นของฉากเก่า ทางเชื่อมจึงเริ่มหลังจากนั้น
    this.bridgeAt = this.level.nextChunkX;
    this.bridgeEnd = this.bridgeAt + SCENE.bridgeChunks * LEVEL.chunkW;

    // รางวัลผ่านด่าน — วางไว้ "ในทางเชื่อม" ไม่ใช่ที่ระยะคงที่หน้าจอแบบเดิม
    // เดิมวางที่ camera+VIEW.W+120 ซึ่งตกอยู่กลางของฉากเก่าที่ยังมีหนามอยู่
    this.level.spawnPotion(this.bridgeAt + 240);

    this.noticeText = 'ผ่านด่าน! กำลังเข้า' + next.name;
    this.notice = SCENE.noticeFrames;
    sfx.bonus();

    this.nextScene = next;
    this.fade = 0;
  }

  // ── ความสามารถประจำตัว ─────────────────────────────────────

  /**
   * เดินสถานะความสามารถ แล้วจัดการเม็ดที่โปรยลงมา
   * เรียกทุกเฟรมของช่วงวิ่งปกติเท่านั้น — ระหว่างโบนัสไม่ชาร์จและไม่โปรย
   * เพราะโบนัสเป็นรางวัลอยู่แล้ว ถ้าซ้อนกันอีกจะกลายเป็นคะแนนฟรีจนไม่มีความหมาย
   */
  updateSkill(dt, cx, cy) {
    if (this.skill > 0) {
      this.skill -= dt;

      const tn = this.skillDef.tune;
      if (tn.rain === 'sky') this.spawnSkyTrain(dt, tn);
      if (tn.pulse) this.updatePulse(dt, tn.pulse, cx);
      // โปรยเม็ดใหม่จากเหนือจอเป็นจังหวะ กระจายทั่วความกว้างจอ
      this.rainTick = (this.rainTick || 0) + dt;
      const every = tn.rainEvery || SKILL.rainEvery;
      while (tn.rain !== 'sky' && this.rainTick >= every) {
        this.rainTick -= every;
        this.rain.push({
          x: this.camera + 120 + Math.random() * (VIEW.W - 140),
          y: -20 - Math.random() * 90,
          vy: SKILL.fallV * (0.8 + Math.random() * 0.5),
          // เลขประจำเม็ด สุ่มครั้งเดียวตอนเกิดแล้วไม่เปลี่ยนอีกเลย
          // ใช้เลือกว่าเม็ดนี้เป็นผลไม้ชนิดไหน / หยดน้ำสีอะไร (ดู drawRain)
          // ห้ามคำนวณจากตำแหน่ง เพราะตำแหน่งขยับทุกเฟรมทั้งจากกล้องและจากแรงดูด
          seed: Math.random(),
          got: false,
        });
      }

      if (this.skill <= 0) {
        this.skill = 0;
        this.pulseR = -1;
        this.skillBlink = SKILL.blinkFrames;
      }
    } else if (this.skillBlink > 0) {
      this.skillBlink = Math.max(0, this.skillBlink - dt);
      // คืนเพลงหลักตอนกะพริบจบ ไม่ใช่ตอนฤทธิ์หมด
      // จะได้ยังรู้สึกว่าอยู่ในช่วงพิเศษจนกว่าจะกลับปกติจริง ๆ
      if (this.skillBlink === 0) this.syncMusic();
    } else {
      // ชาร์จเฉพาะตอนไม่ได้ออกฤทธิ์ เต็มเมื่อไหร่ติดเมื่อนั้น ไม่ต้องกดอะไร
      this.charge += dt;
      if (this.charge >= SKILL.chargeFrames) {
        this.charge = 0;
        this.skill = this.skillDef.tune.active;
        this.rainTick = 0;
        this.skyTrain = this.skillDef.tune.trainEvery || 0;   // ขบวนแรกมาทันที ไม่ต้องรอ
        this.skyLane = 1;
        this.pulseT = this.skillDef.tune.pulse ? this.skillDef.tune.pulse.every : 0;   // ร้องทันทีที่ติด
        sfx.skill();
        this.syncMusic();
      }
    }

    // เม็ดที่โปรยแล้ว: ร่วงลงมาก่อน พอเข้าระยะก็พุ่งเข้าตัวเอง
    const pullRange = this.skillDef.tune.pull || SKILL.pullRange;
    const rainCfg = {
      range: pullRange,
      base: SKILL.minPull,
      rush: SKILL.rush,
      turn: SKILL.turn,
      ease: SKILL.ease,
    };
    for (const d of this.rain) {
      if (d.got) continue;
      const dx = cx - d.x;
      const dy = cy - d.y;
      const dist = Math.hypot(dx, dy);

      if (dist < pullRange && dist > 1) {
        // สืบทอดความเร็วที่กำลังร่วงอยู่มาเป็นความเร็วตั้งต้น
        // เม็ดจึงโค้งจากแนวดิ่งเข้าหาตัว แทนที่จะหักศอกทันทีที่เข้าระยะ
        if (d.mvx === undefined) {
          d.mvx = 0;
          d.mvy = d.vy;
        }
        seek(d, cx, cy, dist, rainCfg, dt);
      } else {
        d.y += d.vy * dt;
      }

      if (dist < SKILL.pickR) {
        d.got = true;
        this.treat += Math.round((SCORING.pointsPerRain + this.foodBonus) * this.skillTreatMult);
        this.particles.burst(d.x, d.y, 9, 'kibble');
        sfx.kibble();
      }
    }

    // ทิ้งเม็ดที่เก็บแล้วหรือหลุดจอ ไม่งั้น array โตไม่หยุด
    this.rain = this.rain.filter(
      (d) => !d.got && d.y < VIEW.H + 60 && d.x > this.camera - 120
    );
  }

  /**
   * คลื่นเสียงของสกิลคริสตัล — วงแหวนขยายจากตัวออกไปข้างหน้า
   *
   * ทุบของตอนขอบคลื่นไปถึงจริง ไม่ใช่ทุบทั้งจอพร้อมกันตอนร้อง ภาพวงแหวนกับของที่แตกจึงตรงกัน
   * ใช้ smashObstacle / smashHazard ตัวเดียวกับพุ่งชน คะแนนกับท่ากระเด็นจึงเหมือนกันทุกประการ
   * ของที่อยู่ข้างหลังตัวเกิน 60px ไม่นับ (ผ่านไปแล้ว ทุบไปก็ไม่มีใครเห็น)
   */
  updatePulse(dt, pu, cx) {
    this.pulseT += dt;
    if (this.pulseT >= pu.every) {
      this.pulseT -= pu.every;
      this.pulseR = 0;
      sfx.double();
    }
    if (this.pulseR < 0) return;
    this.pulseR += pu.speed * dt;
    const back = cx - 60;
    const edge = cx + this.pulseR;
    for (const o of this.level.obstacles) {
      if (o.x > edge) break;
      if (o.smashed || o.x + o.w < back) continue;
      this.smashObstacle(o);
      this.spawnGems(o.x + o.w / 2, o.y + o.h / 2, pu.gems);
    }
    for (const h of this.level.hazards) {
      if (h.smashed || h.x > edge || h.x + h.w < back) continue;
      this.smashHazard(h);
      this.spawnGems(h.x + h.w / 2, h.y + h.h / 2, pu.gems);
    }
    for (const f of this.level.fallers) {
      if (f.dead || f.warn > 0 || f.x > edge || f.x + f.w < back) continue;
      f.dead = true;
      this.particles.burst(f.x + f.w / 2, f.y + f.h / 2, 14, 'nip', 6);
      this.spawnGems(f.x + f.w / 2, f.y + f.h / 2, pu.gems);
    }
    if (this.pulseR > pu.reach) this.pulseR = -1;
  }

  /** เม็ดคริสตัลจากของที่แตก — ใส่ array ฝนเดิม ร่วงช้า ๆ แล้วถูกดูดเข้าตัวด้วยโค้ดชุดเดียวกับฝน */
  spawnGems(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.rain.push({
        x: x + (i - (n - 1) / 2) * 22,
        y: Math.min(y, GROUND_Y - 30) - i * 10,
        vy: 1.1,
        seed: Math.random(),
        got: false,
      });
    }
  }

  /**
   * ขบวนขนมของสกิลบิน — แถวเม็ดเรียงแนวนอนลอยนิ่งอยู่บนฟ้า เกิดที่ขอบจอขวา
   * ใช้ array ฝนเดิม (vy = 0 คือไม่ร่วง) การดูด/เก็บ/ทิ้งจึงเป็นโค้ดชุดเดียวกับเต้นทั้งหมด
   * สุ่มระดับแต่ไม่ซ้ำขบวนก่อน ผู้เล่นจึงต้องขยับทุกขบวน ไม่ใช่นิ่งอยู่ระดับเดียวแล้วได้หมด
   */
  spawnSkyTrain(dt, tn) {
    this.skyTrain += dt;
    if (this.skyTrain < tn.trainEvery) return;
    this.skyTrain -= tn.trainEvery;
    // ขบวนที่ลอยมาไม่ถึงตัวก่อนหมดฤทธิ์ไม่ต้องปล่อย — ตอนนั้นน้องร่วงลงพื้นแล้ว
    // ถ้าปล่อยไปจะเห็นขนมลอยค้างบนฟ้าผ่านหัวไปทั้งแถว อ่านเป็น "พลาด" ทั้งที่ไม่มีทางเก็บทัน
    if (this.skill < (VIEW.W + 30 - PLAYER_X) / Math.max(1, this.speed)) return;
    const n = tn.lanes.length;
    let lane = Math.floor(Math.random() * n);
    if (lane === this.lastSkyLane) lane = (lane + 1 + Math.floor(Math.random() * (n - 1))) % n;
    this.lastSkyLane = lane;
    // กลางตัวแมวตอนบินระดับนั้น = เท้า − ครึ่งความสูงตัว
    const y = tn.lanes[lane] - BODY.standH / 2;
    const x0 = this.camera + VIEW.W + 30;
    for (let i = 0; i < tn.trainLen; i++) {
      this.rain.push({
        x: x0 + i * 36,
        // โค้งขึ้นลงนิดหนึ่งตามแถว อ่านเป็น "ขบวน" ไม่ใช่เส้นตรงแข็ง ๆ
        y: y + Math.sin(i * 0.9) * 8,
        vy: 0,
        seed: Math.random(),
        got: false,
      });
    }
  }

  // ── โหมดโบนัส ──────────────────────────────────────────────

  /**
   * เริ่มโบนัส — ไม่แตะ state ของด่านเลย แค่ "หยุดใช้มัน" ชั่วคราว
   *
   * ระหว่างโบนัส this.camera ไม่ขยับเลย ทั้งด่าน หลอดระยะ และระยะทางสะสม
   * จึงค้างอยู่ที่เดิมทั้งหมด ฉากฟ้าเลื่อนด้วยกล้องของตัวเอง (bonusCam)
   * พอปลาพาลงมาส่ง แมวจึงกลับมายืนจุดเดิมที่ถูกช้อนขึ้นไป ไม่ใช่จุดใหม่ที่ไกลออกไป
   */
  startBonus() {
    // เข้าโบนัสได้ทั้งที่พลังแตะศูนย์ไปแล้ว = โบนัสมารับทันพอดี
    // ต้องคืนพลังให้ด้วย ไม่งั้นพอจบโบนัสก็ตายทันทีในเฟรมแรก การรอดจะไม่มีความหมาย
    // คืนไม่เต็มหลอด เพราะเป็นการรอดแบบเฉียดฉิว ไม่ใช่รางวัล
    if (this.dying > 0) {
      this.hp = HEALTH.max * 0.4;
      this.dying = 0;
    }
    this.bonus = BONUS.frames;
    this.bonusPhase = 'catch';
    this.bonusCam = this.camera;   // ฉากฟ้าเริ่มเลื่อนจากจุดที่ยืนอยู่ตอนนี้
    // ท่าพิเศษที่กำลังออกฤทธิ์จบทันที โบนัสคุมตัวน้องด้วยกติกาของมันเอง
    this.talents.onBonusStart(this);
    this.syncMusic();      // เพลงบนฟ้าต้องมาแทนเพลงเต้นทันที ถ้าความสามารถกำลังทำงานอยู่
    this.letters = 0;              // เริ่มสะสมคำใหม่หลังจบโบนัส

    // ยังไม่วาบตอนนี้ — ฉากยังเป็นพื้นอยู่ ปลาต้องว่ายเข้ามาให้เห็นก่อน
    // แสงวาบจะมาตอนตัดเข้าฉากฟ้าจริง ๆ ท้ายช่วง rise
    this.player.sliding = false;
    this.player.slideHeld = false;
    this.player.vy = 0;
    this.riseFrom = GROUND_Y;

    this.fishX = VIEW.W + 140;     // เริ่มนอกจอฝั่งขวา
    this.fishY = GROUND_Y - 74;
    this.fishDir = -1;             // หันซ้าย เพราะกำลังว่ายเข้าหาแมว

    const span = this.speed * BONUS.frames + VIEW.W;
    // แนวอาหารเริ่มหลังจบช่วงทะยาน ไม่งั้นของแถวแรกจะไหลผ่านไปตอนยังอยู่ฉากพื้น
    //
    // นับเฉพาะ riseFrames — ช่วง catch กล้องไม่เลื่อนแล้ว (ดู worldMoves ใน updateBonus)
    // ถ้ายังบวก catchFrames อยู่ ของแถวแรกจะถูกวางล้ำไปข้างหน้าเกินจริง
    // แล้วผู้เล่นจะบินผ่านที่ว่างอยู่พักหนึ่งก่อนเจอของชิ้นแรก
    const flyFrom = BONUS.riseFrames * this.speed;
    this.bonusTreats = buildBonusField(this.bonusCam + flyFrom + 200, span);
    this.bonusMagnets = buildBonusMagnets(this.bonusCam + PLAYER_X, span, this.speed);
    sfx.bonus();
  }

  /**
   * ความคืบหน้าของเวทวาร์ป คิดจากเวลาของโบนัสตรง ๆ ไม่ต้องเก็บตัวจับเวลาแยก
   *   rise   0→1 ตลอดช่วงทะยานขึ้น (0 = ยังไม่ถึงช่วงนี้)
   *   arrive 0→1 ครึ่งวินาทีแรกหลังโผล่บนฟ้า (-1 = พ้นช่วงนั้นไปแล้ว)
   */
  warpAt() {
    const elapsed = BONUS.frames - this.bonus;
    const rise = (elapsed - BONUS.catchFrames) / BONUS.riseFrames;
    const after = elapsed - BONUS.catchFrames - BONUS.riseFrames;
    return {
      rise: this.bonusPhase === 'rise' ? Math.max(0, Math.min(1, rise)) : 0,
      arrive: this.bonusPhase === 'fly' && after < BONUS.arriveFrames ? after / BONUS.arriveFrames : -1,
    };
  }

  /**
   * จุดลงของปลา — จุดเดิมที่ช้อนขึ้นไป ถ้าตรงนั้นยืนไม่ได้ค่อยเลื่อนไปข้างหน้าทีละนิด
   *
   * ปกติแล้วจุดเดิมโล่งอยู่แล้ว (แมววิ่งผ่านมาได้) กล้องจึงไม่ขยับเลยสักพิกเซล
   * ที่ต้องเลื่อนมีสองกรณี: เข้าโบนัสตอนลอยข้ามหลุมอยู่ กับมีของจ่อข้างหน้าใกล้เกินจะหลบทัน
   */
  landingX() {
    const b = this.player.box;
    for (let i = 0; i <= 40; i++) {
      const x = this.camera + i * BONUS.landStep;
      this.level.ensureAhead(x);
      if (!this.level.hasSolid(x + b.x, BONUS.landRunway)) return x;
    }
    return this.camera;
  }

  /**
   * ปลาไล่ตามความสูงเป้าหมายแบบหน่วง แล้วบีบไม่ให้ห่างเกิน 9px
   * หน่วงอย่างเดียวไม่พอ ตอนผู้เล่นตีปีกรัว ๆ แมวขึ้นเร็วกว่าปลาไล่ทัน
   * วัดจริงแล้วห่างได้ถึง 12.6px ซึ่งเห็นชัดว่าแมวลอยหลุดจากหลัง
   */
  followFish(ideal, dt) {
    const y = this.fishY + (ideal - this.fishY) * Math.min(1, 0.3 * dt);
    return Math.max(ideal - 9, Math.min(ideal + 9, y));
  }

  /** หันหัวปลาทีละนิด ค่ากลางระหว่าง -1 กับ 1 จะเห็นเป็นปลากำลังหมุนตัวกลับ */
  turnFish(to, dt) {
    this.fishDir += (to - this.fishDir) * Math.min(1, 0.14 * dt);
  }

  /** งานที่ทำครั้งเดียวตอนเปลี่ยนช่วงฉาก */
  enterBonusPhase(to) {
    // เวทวาร์ปเริ่มพร้อมช่วงทะยานขึ้น เสียงยาวเท่าช่วงพอดี จบลงตรงที่แสงวาบขาว
    if (to === 'rise') sfx.warp();

    // ขาววาบตอนตัดขึ้นฟ้า ดำวาบตอนปิดฉากกลับลงพื้น
    if (to === 'fly' || to === 'fall') {
      this.flash = 1;
      this.flashInk = to === 'fall';
    }

    if (to === 'fall') {
      // ทิ้งของบนฟ้าให้หมดก่อนฉากพื้นจะกลับมา
      //
      // สนามโบนัสถูกปูไว้ยาวกว่าที่กล้องวิ่งจริงในช่วงลอย ของแถวท้าย ๆ
      // จึงยังค้างอยู่ข้างหน้าตอนเริ่มร่อนลง ถ้าไม่ทิ้ง มันจะถูกวาดทับ
      // ซ้อนกับด่านจริงเป็นภาพสองชั้น — เก็บก็ไม่ได้เพราะพ้นช่วง fly แล้ว
      this.bonusTreats = [];
      this.bonusMagnets = [];

      // ไม่ต้องปูทางใหม่รอ — กล้องด่านไม่ได้ขยับไปไหนตลอดช่วงโบนัส
      // ฉากพื้นที่โผล่กลับมาจึงเป็นภาพเดียวกับตอนที่ปลาช้อนแมวขึ้นไปเป๊ะ
      // (ของกับสิ่งกีดขวางก็หยุดตามไปด้วย เพราะ update ของด่านไม่ถูกเรียกในช่วงนี้)
      // เหลืออย่างเดียวคือเช็คว่าจุดเดิมยืนได้จริงไหม เผื่อขึ้นไปตอนกระโดดข้ามหลุมอยู่
      this.camera = this.landingX();
      this.level.ensureAhead(this.camera);
    }
  }

  updateBonus(dt, gdt = dt) {
    this.bonus -= dt;

    const p = this.player;
    const elapsed = BONUS.frames - this.bonus;
    const carry = BONUS.carryUp;
    const restX = PLAYER_X - 6;      // ตำแหน่งจอที่ปลาลอยอยู่ใต้เท้าแมว

    // เลือกช่วงฉากจากเวลา แล้วค่อยยิงงาน "ตอนเข้าช่วง" ทีหลัง
    // แยกสองขั้นแบบนี้เพื่อให้แสงวาบกับการไล่สร้างด่านเกิดครั้งเดียวจริง ๆ
    const prev = this.bonusPhase;
    let phase;
    if (elapsed < BONUS.catchFrames) phase = 'catch';
    else if (elapsed < BONUS.catchFrames + BONUS.riseFrames) phase = 'rise';
    else if (this.bonus < BONUS.leaveFrames) phase = 'leave';
    else if (this.bonus < BONUS.leaveFrames + BONUS.fallFrames) phase = 'fall';
    else phase = 'fly';
    this.bonusPhase = phase;
    if (prev !== phase) this.enterBonusPhase(phase);

    // ── โลกหยุดนิ่งในสามช่วงที่ผู้เล่นทำอะไรไม่ได้ ──
    // catch = ปลากำลังว่ายเข้ามารับ / fall = ปลากำลังพาร่อนลง / leave = ปลาวางแล้วว่ายจากไป
    //
    // เดิมกล้องเลื่อนตลอดทุกช่วง ภาพที่ได้คือฉากไหลผ่านไปเรื่อย ๆ ทั้งที่แมว
    // ไม่ได้วิ่งเอง กำลังยืนรอปลาอยู่ ซึ่งอ่านไม่ออกว่าเป็นคัตซีนหรือยังเล่นอยู่
    // หยุดกล้องแล้วจังหวะจะชัดขึ้นมาก: หยุด -> ดูปลามารับ -> ขึ้นฟ้า -> ลง -> วิ่งต่อ
    const worldMoves = phase === 'rise' || phase === 'fly';
    if (worldMoves) this.bonusCam += this.speed * gdt;

    // ── หลอดระยะของฉากต้องนิ่งด้วย ──
    // หลอดนั้นอ่านจาก nextSceneAt - tick (เวลาเดินตลอด แม้ตอนอยู่บนฟ้า)
    // ถ้าไม่เลื่อนเส้นตายตามไปด้วย หลอดจะเดินต่อทั้งที่ด่านข้างล่างหยุดสนิท
    this.nextSceneAt += dt;

    // ── อารมณ์บนหน้าแมวตลอดช่วงโบนัส ──
    // ไล่เป็นเรื่องเดียวกันสามจังหวะ: ดีใจตอนปลามารับ -> ตาเป็นประกายตอนลอยอยู่บนฟ้า
    // ที่มีของกินเต็มไปหมด -> เศร้าตอนต้องกลับลงพื้น
    //
    // ช่วง rise กับ fly เคยเป็นหน้าเปล่า ซึ่งเป็นช่วงที่ยาวที่สุดและเป็นช่วงเดียว
    // ที่ผู้เล่นได้มองหน้าแมวนาน ๆ เพราะไม่มีอะไรให้หลบ
    this.catMood = phase === 'catch' ? 'happy'
      : (phase === 'rise' || phase === 'fly') ? 'starry'
      : (phase === 'fall' || phase === 'leave') ? 'sad'
      : '';

    if (phase === 'catch') {
      // ปลาว่ายเข้ามาจากขอบขวา ชะลอตอนใกล้ถึงตัว (ease-out กำลังสาม)
      const k = Math.min(1, elapsed / BONUS.catchFrames);
      const e = 1 - Math.pow(1 - k, 3);
      this.fishX = (VIEW.W + 140) + (restX - (VIEW.W + 140)) * e;
      this.fishY = (GROUND_Y - 74) + (GROUND_Y - 18 - (GROUND_Y - 74)) * e;
      this.turnFish(-1, dt);

      // ช้อนขึ้นเฉพาะ 30% สุดท้าย ก่อนหน้านั้นแมวยืนรออยู่กับที่
      const lift = Math.max(0, (k - 0.7) / 0.3);
      const smooth = lift * lift * (3 - 2 * lift);
      // กระโดดดีใจอยู่กับที่ระหว่างรอ แล้วจางหายไปตอนถูกช้อนขึ้น
      // ใช้ค่าสัมบูรณ์ของ sin เพราะอยากได้ "เด้งขึ้นแล้วแตะพื้น" ซ้ำ ๆ
      // ถ้าใช้ sin ตรง ๆ แมวจะจมลงไปใต้พื้นครึ่งรอบ
      const hop = Math.abs(Math.sin(elapsed * 0.26)) * 15 * (1 - smooth);
      p.y = GROUND_Y - hop + ((this.fishY - carry) - GROUND_Y) * smooth;
      p.vy = 0;
      if (k > 0.7 && elapsed % 3 < dt) {
        this.particles.burst(PLAYER_X + this.camera, GROUND_Y, 3, 'mint', 3);
      }
    } else if (phase === 'rise') {
      // ทะยานขึ้น — คุมไม่ได้ ให้ดูเป็นการ "ถูกปลาพาขึ้นฟ้า"
      const t = Math.min(1, (elapsed - BONUS.catchFrames) / BONUS.riseFrames);
      const e = 1 - (1 - t) * (1 - t);
      const from = GROUND_Y - 18;
      this.fishX += (restX - this.fishX) * Math.min(1, 0.2 * dt);
      this.fishY = from + (BONUS.flyY + carry - from) * e;
      p.y = this.fishY - carry;
      p.vy = 0;
      this.turnFish(1, dt);   // หมุนตัวกลับไปหันทางที่วิ่ง
      if (elapsed % 4 < dt) {
        this.particles.burst(PLAYER_X + this.bonusCam, p.y + 30, 4, 'mint', 3);
      }
    } else if (phase === 'fly') {
      p.vy += BONUS.gravity * dt;
      p.y += p.vy * dt;
      if (p.y < BONUS.topY) { p.y = BONUS.topY; p.vy = 0; }
      if (p.y > BONUS.floorY) { p.y = BONUS.floorY; p.vy = 0; }
      // ปลาตามช้ากว่าแมวนิดหน่อย ได้ความรู้สึกว่ามีน้ำหนักจริง ไม่ใช่ติดกาว
      // แต่ต้องคุมเพดานความห่างไว้ ไม่งั้นตอนตีปีกรัว ๆ แมวจะลอยหลุดจากหลังปลา
      this.fishY = this.followFish(p.y + carry, dt);
      this.fishX += (restX - this.fishX) * Math.min(1, 0.2 * dt);
      this.turnFish(1, dt);
    } else if (phase === 'fall') {
      // ร่อนลง — เข้าหาพื้นแบบ ease ไม่ต้องจำตำแหน่งตั้งต้น
      p.y += (GROUND_Y - p.y) * Math.min(1, 0.085 * dt);
      p.vy = 0;
      this.fishY = this.followFish(p.y + carry, dt);
      this.fishX += (restX - this.fishX) * Math.min(1, 0.2 * dt);
      this.turnFish(1, dt);
    } else {
      // ปล่อยแมวลงจุดเดิม แล้วว่ายออกไปทางซ้าย
      p.y = GROUND_Y;
      p.vy = 0;
      this.turnFish(-1, dt);
      // ถอยลงนิดหน่อยก่อนเร่งออก ให้เห็นจังหวะ "วางแล้วค่อยไป"
      const gone = 1 - this.bonus / BONUS.leaveFrames;
      this.fishX -= BONUS.leaveSpeed * gone * dt;
      this.fishY += ((GROUND_Y - 52) - this.fishY) * Math.min(1, 0.08 * dt);
    }

    // แมวยืนบนหลังปลาตลอด ท่าวิ่งจึงถูกกว่าท่าลอยกลางอากาศ
    p.onGround = true;
    // ขาสับเฉพาะตอนโลกยังเลื่อนอยู่ — ช่วงที่หยุดนิ่งแล้วขายังสับ
    // จะอ่านเป็นแมววิ่งอยู่กับที่ ซึ่งขัดกับภาพที่ฉากหลังหยุดสนิท
    if (worldMoves) p.runPhase += this.speed * dt * 0.06;

    // ── รูปทรงตัวต้องคลายกลับเป็นปกติก่อนปลามาถึง ──
    //
    // squash คือสปริง "ยืด/แบน" ที่ jump() กับจังหวะลงพื้นเป็นคนตั้งค่า
    // และ Player.update เป็นคนคลายกลับทุกเฟรม — แต่ช่วงโบนัสไม่ได้เรียก Player.update
    // ค่าที่ค้างอยู่ ณ วินาทีที่เข้าโบนัส จึงถูกแช่ไว้ยาวสิบเจ็ดวินาทีของช่วงโบนัส
    //
    // วัดจริงแล้ว: เข้าโบนัสตอนเพิ่งลงพื้น (+0.85) ตัวกว้าง 1.22 เท่า สูง 0.75 เท่า = บวม
    //           เข้าตอนเพิ่งถีบขึ้น (-0.90) ตัวกว้าง 0.77 เท่า สูง 1.27 เท่า = หดยืด
    //
    // คลายด้วยสปริงตัวเดียวกันกับตอนวิ่ง จึงดูเป็นการตั้งหลักกลับ ไม่ใช่รูปกระตุกกลับ
    // ที่อัตรานี้เหลือไม่ถึง 0.4% ภายใน 32 เฟรม ซึ่งคือจังหวะที่ปลาเริ่มช้อนตัวขึ้นหลังพอดี
    // แมวจึงกลับเป็นทรงปกติเสร็จก่อนปลามาถึงเสมอ ไม่ว่าจะเข้าโบนัสตอนอยู่ท่าไหน
    p.squash += (0 - p.squash) * 0.16 * dt;

    // หางก็ถูกแช่ด้วยเหตุผลเดียวกัน ค้างเอียงอยู่มุมเดิมทั้งช่วง
    // แมวยืนบนหลังปลา (p.onGround = true ข้างบน) จึงใช้เป้าหมายชุดเดียวกับท่าวิ่ง
    const tailTarget = Math.sin(p.runPhase * p.gaitK * 2 + 0.9);
    p.tailLag += (tailTarget - p.tailLag) * 0.2 * dt;

    // ฉากพื้นถูกวาดในทุกช่วงยกเว้นตอนลอย จึงต้องมีด่านรออยู่จริง
    if (phase !== 'fly') this.level.ensureAhead(this.camera);

    const b = p.box;
    // ของบนฟ้าปูไว้ในพิกัดของ bonusCam จึงต้องเทียบกับกล้องตัวนั้น ไม่ใช่กล้องด่านที่ถูกแช่ไว้
    const cx = b.x + this.bonusCam + b.w / 2;
    const cy = b.y + b.h / 2;

    // เก็บของได้เฉพาะตอนอยู่ฉากฟ้า ช่วงเปิดกับปิดแมวอยู่ในมือปลา
    // ตอนนี้ของบนฟ้าทุกชิ้นก็อยู่ในช่วงนี้ทั้งหมดแล้ว จึงไม่มีอะไรตกหล่น
    const collecting = phase === 'fly';

    // เก็บแม่เหล็กก่อนดูด ลูกที่เพิ่งแตะจะได้ออกฤทธิ์ในเฟรมเดียวกันเลย
    if (collecting) for (const m of this.bonusMagnets) {
      if (m.got) continue;
      if (Math.hypot(cx - m.x, cy - m.y) < BONUS_MAGNET.pickR) {
        m.got = true;
        this.magnet = MAGNET.frames;
        this.particles.burst(m.x, m.y, 16, 'mint', 5);
        sfx.magnet();
      }
    }

    // ตัวจับเวลาแม่เหล็กต้องเดินตอนอยู่บนฟ้าด้วย ไม่งั้นลูกที่เก็บมาก่อนเข้าโบนัส
    // จะค้างเวลาไว้แล้วไปหมดอายุทีเดียวตอนกลับลงพื้น
    if (this.magnet > 0) this.magnet -= dt;

    if (this.magnet > 0 && collecting) {
      for (const f of this.bonusTreats) {
        if (f.got) continue;
        const dx = cx - f.x;
        const dy = cy - f.y;
        const d = Math.hypot(dx, dy);
        if (d > BONUS_PULL.range || d < 1) continue;
        seek(f, cx, cy, d, BONUS_PULL, dt);
      }
    }

    if (collecting) for (const f of this.bonusTreats) {
      if (f.got) continue;
      if (Math.hypot(cx - f.x, cy - f.y) < f.r + 24) {
        f.got = true;
        const b0 = this.foodBonus;
        if (f.kind === 'shrimp') { this.treat += SCORING.pointsPerShrimp + b0; sfx.shrimp(); }
        else if (f.kind === 'kibble') { this.treat += SCORING.pointsPerKibble + b0; sfx.kibble(); }
        else { this.treat += SCORING.pointsPerFish + b0; sfx.fish(); }
        this.particles.burst(f.x, f.y, 8, f.kind === 'kibble' ? 'kibble' : 'mint');
      }
    }

    this.score = Math.floor(this.distance / SCORING.pxPerScorePoint) + this.treat;
    this.particles.update(dt);
    this.shake *= 0.9;

    if (this.bonus <= 0) {
      // ไม่ต้องวาบตรงนี้แล้ว ฉากพื้นโผล่มาตั้งแต่ช่วง fall
      // ตอนนี้แค่คืนการควบคุมให้ผู้เล่นเงียบ ๆ ปลาว่ายพ้นจอไปแล้ว
      this.bonus = 0;
      this.bonusPhase = '';
      this.catMood = '';
      this.bonusTreats = [];
      this.bonusMagnets = [];
      this.syncMusic();    // กลับไปเพลงเต้นถ้าความสามารถยังเหลือเวลา ไม่งั้นเพลงหลัก
      // อมตะสั้น ๆ ตอนคืนการควบคุม — ของที่ขยับได้ถูกแช่ค้างไว้ตั้งแต่ตอนเข้าโบนัส
      // ถ้ามันบังเอิญค้างอยู่ตรงตัวแมวพอดี ผู้เล่นจะโดนชนทันทีในเฟรมแรกโดยไม่มีทางเลี่ยง
      this.invuln = Math.max(this.invuln, BONUS.landGrace);
      p.y = GROUND_Y;
      p.vy = 0;
      p.onGround = true;
      p.jumps = 0;
      this.level.cull(this.camera);
      this.level.ensureAhead(this.camera);
    }
  }

  /** โบนัสคะแนนต่ออาหารหนึ่งเม็ด มาจากระดับของชุดที่ใส่อยู่ */
  get foodBonus() {
    return getSkin().outfit.foodBonus || 0;
  }

  /**
   * ฉากโบนัส — มีสองหน้าตา สลับกันด้วยแสงวาบขาว
   *   ช่วง fly        = ฟ้าเปิดโล่ง ไม่มีพื้นไม่มีสิ่งกีดขวาง
   *   ช่วงอื่นทั้งหมด = ฉากพื้นปกติ เพราะปลากำลังรับ/ส่งแมวอยู่ที่ระดับพื้น
   */
  drawBonus(ctx) {
    const skin = getSkin();
    const sky = this.skyScene;

    if (sky) {
      // ชุดระดับสูงเปลี่ยนสีฟ้าโบนัสได้ — ผสมทับจานสีของด่านเฉพาะคีย์ที่ชุดกำหนด
      // ไม่ได้แทนทั้งจาน เพราะยังต้องใช้สี HUD กับสีของกินจากด่านเดิม
      const pal = skin.outfit.bonus ? { ...this.pal, ...skin.outfit.bonus } : this.pal;
      drawSky(ctx, this.bonusCam, pal, true);
      drawClouds(ctx, this.bonusCam, pal);
      if (skin.outfit.bonus?.sparkle) {
        drawBonusSparkle(ctx, this.tick, skin.outfit.bonus.sparkle);
      }
    } else {
      this.drawBackdrop(ctx);
      drawGround(ctx, this.level.pits, this.camera, this.pal, GROUND_ART[this.scene.backdrop]);
      drawPlats(ctx, this.level.plats, this.camera, this.pal);
      const [plainFish, rareTreats] = splitFish(this.level.fishes);
      drawOutlined(ctx, (c) => {
        drawObstacles(c, this.level.obstacles, this.camera, this.scene.theme);
        drawFallers(c, this.level.fallers, this.camera, this.scene.theme);
        drawHazards(c, this.level.hazards, this.camera, this.tick, this.pal);
        drawTreats(c, rareTreats, this.camera, this.tick);
      });
      drawTreats(ctx, plainFish, this.camera, this.tick);
    }

    // ของบนฟ้าทั้งหมดวาดเฉพาะตอนอยู่ฉากฟ้าเท่านั้น
    //
    // แนวเริ่มที่ราว 1,356px จากจุดเข้าโบนัส แต่จอกว้าง 960px ขอบขวาของจอ
    // จึงไปถึงแนวตั้งแต่เฟรมที่ 58 ซึ่งยังอยู่ช่วงปลาว่ายเข้ามารับด้วยซ้ำ
    // ถ้าไม่กันไว้ จะเห็นกำแพงปลาลอยทับฉากพื้นก่อนจะขึ้นฟ้าจริง
    //
    // ไม่ต้องกลัวว่ามันจะโผล่มาแบบกะทันหันตอนเข้าฉากฟ้า เพราะจังหวะนั้น
    // แสงขาววาบเต็มจอกลบรอยต่อให้อยู่แล้ว
    if (sky) {
      const [plainFish, rareTreats] = splitFish(this.bonusTreats);
      drawOutlined(ctx, (c) => {
        drawMagnets(c, this.bonusMagnets, this.bonusCam, this.tick);
        drawTreats(c, rareTreats, this.bonusCam, this.tick);
      });
      drawTreats(ctx, plainFish, this.bonusCam, this.tick);
    }

    // อนุภาคของช่วงลอยเกิดในพิกัดฉากฟ้า ส่วนช่วงรับ/ส่งเกิดในพิกัดด่าน
    // สองช่วงนี้คั่นด้วยแสงวาบเต็มจอเสมอ จึงไม่มีจังหวะที่เห็นทั้งสองชุดพร้อมกัน
    this.particles.draw(ctx, sky ? this.bonusCam : this.camera);

    // ── เวทวาร์ปขึ้นฟ้า ──
    // ด่านข้างล่างหยุดนิ่งตลอดโบนัส ช่วงทะยานขึ้นจึงไม่มีฉากไหลผ่านให้รู้สึกว่ากำลังไปไหน
    // วงเวทกับประกายเป็นตัวเล่าแทน แล้วส่งต่อให้แสงขาวที่วาบตอนตัดเข้าฉากฟ้า
    const warp = this.warpAt();
    const b = this.player.box;
    const wx = b.x + b.w / 2;
    const wy = b.y + b.h / 2;
    if (warp.rise > 0) drawWarpBack(ctx, wx, wy, warp.rise, this.tick);

    // ปลาก่อนแมว แมวจึงนั่งทับอยู่บนหลังปลาไม่ใช่จมอยู่ข้างใน
    // ปลาทองตัวใหญ่ไม่ผ่านชั้นเส้นขอบ — มีวงออร่าโปร่งกว้างรอบตัวที่วาดรวมอยู่ในตัว
    // ถ้าเข้าชั้นเส้นขอบ วงออร่ากลายเป็นเงาทึบสีเข้มทั้งวง (ดู render/outline.js)
    drawBigFish(ctx, this.fishX, this.fishY, BONUS.fishR, this.fishDir, this.tick);
    // ต้องส่ง catMood ตรงนี้ด้วย — นี่คือเส้นทางวาดของ "ตอนอยู่ในโบนัส" ซึ่งเป็น
    // ช่วงเดียวที่อารมณ์ถูกใช้จริง (ดีใจตอนปลามารับ เศร้าตอนกลับลงพื้น)
    // เส้นทางวาดตอนวิ่งปกติเป็นคนละบรรทัดกัน แก้ที่นั่นอย่างเดียวจึงไม่มีผลอะไรเลย
    drawPlayer(ctx, this.player, false, skin, this.magnet > 0, 0, this.catMood, CAT_LOOK);
    if (this.magnet > 0) drawSuction(ctx, this.player, this.tick, CAT_LOOK);
    if (warp.rise > 0) drawWarpFront(ctx, wx, wy, warp.rise, this.tick);
    if (warp.arrive >= 0) drawWarpArrive(ctx, wx, wy, warp.arrive);

    postProcess(ctx);
    drawHUD(ctx, this);
    this.drawFlash(ctx);
  }

  /** แสงวาบเต็มจอ วาดท้ายสุดให้ทับ HUD ด้วย ไม่งั้นรอยต่อยังโผล่ให้เห็น */
  drawFlash(ctx) {
    if (this.flash <= 0) return;
    ctx.fillStyle = this.flashInk
      ? `rgba(8,3,16,${this.flash})`
      : `rgba(255,255,255,${this.flash})`;
    ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  }

  /**
   * เก็บสถิติไว้ก่อนทิ้งรอบเล่นกลางคัน — ใช้ตอนกด "เลิกเล่น"
   * ถ้าไม่เรียก คนที่ทำคะแนนสูงสุดแล้วกดเลิกจะเสียสถิตินั้นไปเฉย ๆ
   * ซึ่งดูเหมือนบั๊กมากกว่าดูเหมือนกติกา
   */
  bankBest() {
    this.prevBest = this.best;
    if (this.score > this.best) {
      this.best = this.score;
      saveBest(this.stage.id, this.best, Math.floor(this.distance / SCORING.pxPerMeter));
    }
  }

  /**
   * cause 'faint' = พลังหมด ล้มพับนอนกับพื้นตรงนั้น
   * cause 'fall'  = ตกหลุม ปลิวหมุนตกจอไปตามเดิม
   */
  die(cause = 'faint') {
    if (this.state === STATE.DEAD) return;
    this.state = STATE.DEAD;
    this.talents.onDeath();

    if (cause === 'faint') {
      this.shake = 8;   // เบากว่าตกหลุม เพราะเป็นการทรุดลง ไม่ใช่กระแทก
      this.player.faint();
      this.particles.dust(PLAYER_X + this.camera, GROUND_Y, 9);
    } else {
      this.shake = 16;
      this.player.vy = -9;
      this.particles.burst(PLAYER_X + 20 + this.camera, this.player.y - 20, 18, 'crumb', 7);
    }

    sfx.die();

    this.prevBest = this.best;
    this.best = Math.max(this.best, this.score);
    saveBest(this.stage.id, this.best, Math.floor(this.distance / SCORING.pxPerMeter));

    // ตกหลุมยังมีทางกลับ — ส่งต่อให้ผู้เรียกถามก่อนว่าจะจ่ายทองดึงขึ้นมาไหม
    // ถ้าไม่มีใครรับช่วง (เช่นในเทสต์) ก็ตกไปทางเดิมคือจบตาเลย
    //
    // หน่วงเท่ากันทั้งสองทาง เพราะ 750ms คือเวลาที่แอนิเมชันตกใช้จริง
    // ถ้าถามเร็วกว่านั้น กล่องจะเด้งทับภาพน้องที่ยังร่วงไม่พ้นจอ
    setTimeout(() => (cause === 'fall' && this.onPitFall ? this.onPitFall() : this.onGameOver()), 750);
  }

  /**
   * ราคาดึงขึ้นครั้งถัดไปของตานี้ — แพงขึ้นเรื่อย ๆ ครั้งละหนึ่งเท่าของราคาฐาน
   *
   *   ครั้งที่ 1 = 2,000   ครั้งที่ 2 = 4,000   ครั้งที่ 3 = 6,000 ...
   *
   * ── ทำไมต้องแพงขึ้น ──
   * ราคาคงที่ทำให้ทองกลายเป็น "ปุ่มไม่ตาย" ที่กดได้ไม่จำกัดถ้ามีทองพอ
   * คะแนนของรอบจึงวัดว่าใครมีทองเยอะ ไม่ได้วัดว่าใครเล่นเก่ง
   * ราคาที่ไต่ขึ้นทำให้ทุกตามีจุดที่ "ไม่คุ้มจะต่อแล้ว" เสมอ ไม่ว่าจะรวยแค่ไหน
   *
   * นับรีเซ็ตทุกตา (อยู่ใน reset()) ตาใหม่จึงเริ่มที่ราคาฐานเสมอ
   */
  get reviveCost() {
    return REVIVE.cost * (this.revives + 1);
  }

  /**
   * กล้องที่ควรกลับมายืน หลังถูกดึงขึ้นจากหลุม
   *
   * ── ทำไมไม่ใช้กล้องตอนตายตรง ๆ ──
   * น้องตายตอน "ร่วงพ้นจอ" ไม่ใช่ตอนตกลงหลุม ระหว่างนั้นโลกเลื่อนต่ออีกราว 143px
   * ใช้กล้องตอนนั้นเลยจะโผล่เลยหลุมไปอีกฝั่ง เหมือนวาร์ปข้ามหลุมให้ฟรี
   *
   * จึงหา "หลุมที่เพิ่งตก" (หลุมสุดท้ายที่ปากอยู่ไม่เกินตัวน้อง) แล้วยืนก่อนปากหลุมนิดเดียว
   * ระยะทางกับคะแนนไม่ถูกแตะ เพราะสองตัวนั้นสะสมแยก ไม่ได้อ่านจากกล้อง (ดู update)
   *
   * ถ้าหาหลุมไม่เจอ (ตายด้วยเหตุอื่น) ก็อยู่ที่เดิม ไม่ขยับอะไรเลย
   */
  reviveCam() {
    const catX = this.camera + PLAYER_X;
    // หลุมที่เพิ่งตก = หลุมสุดท้ายที่ปากอยู่ไม่เกินตัวน้อง
    let pit = null;
    for (const p of this.level.pits) {
      if (p.x <= catX && (!pit || p.x > pit.x)) pit = p;
    }
    if (!pit) return this.camera;

    let cam = pit.x - REVIVE.standBack - PLAYER_X;
    // จุดที่ได้อาจไปตรงกับปากหลุมอีกหลุมพอดี (หลุมติดกันสองหลุมมีจริงในหลายท่อน)
    // ถอยเพิ่มทีละนิดจนยืนได้จริง — สิ่งกีดขวางไม่ต้องเลี่ยง เพราะกลับมาแล้วอมตะ 1.5 วิ
    const steps = Math.floor(REVIVE.maxBack / REVIVE.backStep);
    for (let i = 0; i < steps && this.level.isOverPit(cam + PLAYER_X); i++) {
      cam -= REVIVE.backStep;
    }
    // ถอยได้อย่างเดียว และไม่เกินเพดานที่ตั้งไว้
    return Math.max(this.camera - REVIVE.maxBack, Math.min(this.camera, cam));
  }

  /**
   * ดึงน้องขึ้นมาจากหลุมแล้ววิ่งต่อ — คะแนน ระยะทาง สมบัติ ตัวอักษร คงเดิมทั้งหมด
   *
   * ผู้เรียกต้องหักทองมาก่อนแล้ว ที่นี่ไม่ยุ่งกับกระเป๋าเงินเลย
   * เรียกได้เฉพาะตอนตายอยู่จริง ๆ กันกดซ้ำจากกล่องที่ค้างอยู่
   */
  revive() {
    if (this.state !== STATE.DEAD) return false;

    // นับก่อนทำอย่างอื่น ครั้งถัดไปจะได้แพงขึ้นทันทีแม้ผู้เล่นตกซ้ำในวินาทีเดียวกัน
    this.revives++;

    // ── กลับไปยืนที่เดิม โดยไม่แตะด่านเลยสักชิ้น ──
    // เดิมตรงนี้ปูด่านใหม่ทั้งผืน (ทางเรียบหนึ่งท่อน + ท่อนที่เหลือ) ซึ่งแก้ปัญหา
    // "ร่วงซ้ำทันที" ได้จริง แต่ทำให้หลุมที่เพิ่งตกกับของรอบตัวหายไปหมด
    // ผู้เล่นจึงอ่านว่า "ถูกย้ายไปที่อื่น" ทั้งที่กล้องถอยกลับมาแล้ว
    //
    // ตอนนี้ถอยกล้องไปยืนก่อนปากหลุมแทน — ด่านยังเป็นผืนเดิมทุกอย่าง
    // หลุมนั้นยังอยู่ข้างหน้าให้ลองใหม่ และภาพรอบตัวเหมือนตอนก่อนตกเป๊ะ
    this.camera = this.reviveCam();
    this.level.ensureAhead(this.camera);

    this.player.reset();
    // reset() ล้างระยะเลื่อนกับท่า แต่พรสวรรค์ยังเป็นใบเดิม — ผูกตัวปรับกลับเข้าไปใหม่
    this.talents.attach(this.player);
    this.state = STATE.RUN;
    this.dying = 0;
    this.invuln = REVIVE.invulnFrames;
    this.hp = Math.max(this.hp, HEALTH.max * REVIVE.hpFloor);
    this.shake = 0;
    this.hurtFlash = 0;
    this.notice = 90;
    this.noticeText = 'ดึงน้องขึ้นมาแล้ว!';

    this.particles.dust(PLAYER_X + this.camera, GROUND_Y, 12);
    sfx.land();
    this.syncMusic();   // เพลงหยุดไปตอนตาย ต้องสั่งเล่นใหม่เอง
    return true;
  }

  // ── ลูปวาด ─────────────────────────────────────────────────

  draw(ctx) {
    // สเกลจริงของผ้าใบ — ภาพทางเข้าที่มีชั้นแคชใช้สร้างแคชให้คมเท่าจอ
    // อ่านก่อนแยกไปวาดหน้าแรก ตอนกดเริ่มเล่น (reset) จะได้รู้สเกลแล้ว สร้างแคชถูกขนาดตั้งแต่แรก
    const tf = ctx.getTransform();
    this.renderScale = Math.hypot(tf.a, tf.b);

    if (this.state === STATE.READY) return this.inRoom ? this.drawRoom(ctx) : this.drawHome(ctx);
    if (this.bonus > 0) return this.drawBonus(ctx);

    ctx.save();
    if (this.shake > 0.4) {
      ctx.translate(
        (Math.random() - 0.5) * this.shake,
        (Math.random() - 0.5) * this.shake
      );
    }

    this.drawBackdrop(ctx);
    drawGround(ctx, this.level.pits, this.camera, this.pal, GROUND_ART[this.scene.backdrop]);
    // พื้นเหยียบได้ วาดต่อจากพื้นทันที เป็นส่วนหนึ่งของภูมิประเทศ ไม่ใช่ของวางบนด่าน
    drawPlats(ctx, this.level.plats, this.camera, this.pal);
    // ทางเข้าด่าน ชั้นหลัง: ชานร้าน ข้างในร้าน ผนังหน้าร้าน — อยู่หลังของกินและตัวแมว
    const gateView = this.gate && this.gate.view(this.camera, this.tick);
    if (gateView) drawGateBack(ctx, this.gate.def, gateView);
    // ของทุกชิ้นในด่านวาดเป็นชั้นเดียวพร้อมเส้นขอบ (ดู render/outline.js)
    // ของใหม่ที่เพิ่มในอนาคตให้วาดในบล็อกนี้ จะได้เส้นขอบเหมือนชิ้นอื่นเอง
    // ยกเว้นเม็ดอาหารรูปปลา — ขึ้นเรียงเป็นแถวยาวเต็มจอ มีเส้นแล้วดูรกและหนักตา
    // จึงวาดแยกนอกชั้นเส้นขอบ (ข้างล่าง) ส่วนเม็ดกลมกับกุ้งทองยังมีเส้นเพราะเป็นของเด่น
    const [plainFish, rareTreats] = splitFish(this.level.fishes);
    drawOutlined(ctx, (c) => {
      drawObstacles(c, this.level.obstacles, this.camera, this.scene.theme);
      drawFallers(c, this.level.fallers, this.camera, this.scene.theme);
      drawHazards(c, this.level.hazards, this.camera, this.tick, this.pal);
      drawTreats(c, rareTreats, this.camera, this.tick);
      drawPotions(c, this.level.potions, this.camera, this.tick);
      drawMagnets(c, this.level.magnets, this.camera, this.tick);
      drawLetters(c, this.level.letters, this.camera, this.tick);
      drawNips(c, this.level.nips, this.camera, this.tick);
      drawCans(c, this.level.cans, this.camera, this.tick);
      drawShields(c, this.level.shields, this.camera);
    });
    drawTreats(ctx, plainFish, this.camera, this.tick);
    this.particles.draw(ctx, this.camera);
    // สีฉากช่วงสกิล (เต้น = ปาร์ตี้แดงจาง ๆ) — ทับฉากและของ แต่อยู่ใต้ขนมโปรยกับตัวน้อง
    drawSkillWorld(ctx, this);

    // กะพริบตอนอมตะหลังโดนชน ให้เห็นชัดว่าช่วงนี้ยังชนไม่ได้
    // เช็ค RUN ด้วย ไม่งั้นตอนตาย tick หยุดเดิน แล้วตัวละครอาจค้างสถานะซ่อน
    const blinking =
      this.state === STATE.RUN && this.invuln > 0 && Math.floor(this.tick / 4) % 2 === 0;
    drawRain(ctx, this.rain, this.camera, getSkin(), this.tick, this.skillDef.tune.look);

    // อ้าปากกับคลื่นดูดโผล่ทั้งตอนมีไอเทมแม่เหล็กและตอนใช้ความสามารถ
    // เพราะทั้งสองกรณีคือ "กำลังดูดของเข้าตัว" เหมือนกัน ต้องอ่านออกเหมือนกัน
    const sucking = this.state === STATE.RUN && (this.magnet > 0 || this.skillMagnet);
    // กะพริบสองกรณี: หลังโดนชน กับตอนความสามารถใกล้หมดฤทธิ์
    const skillFlicker = this.skillBlink > 0 && Math.floor(this.tick / 5) % 2 === 0;
    const catS = this.catScale;

    // ── วงโล่วาดก่อนตัว ──
    // ตอนขนาดปกติวงกว้างกว่าตัวทุกด้านอยู่แล้ว วาดหน้าหรือหลังจึงเห็นเหมือนกันเป๊ะ
    // แต่ตอนตัวใหญ่ ชุดระดับสูงมีผ้าคลุมกับเอฟเฟกต์ยื่นออกนอกกล่องชน
    // วางไว้ข้างหลังจึงการันตีว่าวงจะไม่มีวันพาดทับหน้าหรือชุดของน้อง
    if (this.state !== STATE.DEAD && this.shielded) {
      drawShieldRing(ctx, this.player, this.tick, catS);
    }

    // เอฟเฟกต์พรสวรรค์ชั้นหลังตัว (เมฆใต้ตัว ปีกร่อน เส้นพุ่ง ออร่าเงา)
    if (this.state !== STATE.DEAD) drawTalentBack(ctx, this);
    // เอฟเฟกต์สกิลชั้นหลังตัว (ฮีโร่: หางแสง + เส้นความเร็ว)
    if (this.state !== STATE.DEAD) drawSkillBack(ctx, this);

    // แมวเงา: ตัวโปร่ง และกะพริบถี่ช่วงใกล้หมดฤทธิ์ ผู้เล่นจะได้ไม่พุ่งใส่ของตอนฤทธิ์หมดพอดี
    const shadowFlicker = this.talents.shadowEnding && Math.floor(this.tick / 4) % 2 === 0;
    const catAlpha = this.talents.phasing ? (shadowFlicker ? 0.8 : 0.5) : 1;

    // บอลหิมะยกตัวน้องขึ้น — หลอดบนหัวต้องยกตามด้วย ไม่งั้นไปจมกลางหน้า
    const liftY = this.state === STATE.DEAD ? 0 : skillLift(this);
    if (!blinking && !skillFlicker) {
      ctx.globalAlpha = catAlpha;
      // ตัวโตอยู่ = ยิ้มสะใจ ทับอารมณ์อื่นที่อาจตั้งค้างไว้จากโบนัส
      // เพราะตอนนั้นแมวกำลังเดินทับทุกอย่างโดยไม่เจ็บ ซึ่งเป็นจังหวะที่สะใจที่สุดในเกม
      // เหนื่อยเริ่มตั้งแต่แตะเส้นเตือน (HEALTH.lowAt) แล้วไล่แรงขึ้นจนถึงศูนย์
      // ใช้เส้นเดียวกับที่หลอดพลังเปลี่ยนเป็นแดง ตัวละครกับ HUD จึงเตือนพร้อมกัน
      // ไม่ใช่คนละจังหวะจนผู้เล่นสับสนว่าอันไหนคือสัญญาณจริง
      const lowK = Math.max(0, 1 - (this.hp / HEALTH.max) / HEALTH.lowAt);
      // ── ท่าของสกิล ──
      // เต้น = ส่ายตัวเด้งบนท่าวิ่งเดิม (ส่ง tick เป็นจังหวะเต้น)
      // ฮีโร่ = เอนพุ่ง ยืดตัว ยื่นอุ้งเท้าไปข้างหน้า (fx.hero) — ทั้งคู่บิดท่าวิ่งเดิม
      // ไม่ได้วาดตัวใหม่ จึงใส่ได้ทุกสกินทุกชุดโดยไม่ต้องเตรียมภาพแยก
      // บิน = ปีกผีเสื้อวาดใน skill-fx.js ตัวใช้ท่ากลางอากาศเดิม (ขาห้อย หางถ่วง) / ทอง = ชูอุ้งเท้าโบก
      // คริสตัล = อ้าปากร้องตอนคลื่นเพิ่งออก / บอลหิมะ = ยกทั้งตัวขึ้นไปวิ่งบนลูกบอล (ภาพล้วน กล่องชนอยู่ที่เดิม)
      const pose = this.skill > 0 ? this.skillDef.tune.pose : '';
      const hero = pose === 'hero';
      const gold = pose === 'gold';
      const shout = pose === 'shout' && this.pulseR >= 0 && this.pulseR < 260;
      ctx.save();
      ctx.translate(0, -liftY);
      drawPlayer(ctx, this.player, this.state === STATE.DEAD, getSkin(), sucking || shout,
        pose === 'dance' ? this.tick : 0,
        this.big > 0 || hero || gold || pose === 'shout' ? 'smug' : pose === 'fly' || pose === 'ball' ? 'happy' : this.catMood,
        catS, 1 + (BIGCAN.gait - 1) * this.bigK,
        { tired: this.big > 0 || pose ? 0 : lowK, hurt: this.hurtFlash, hero: hero ? 1 : 0,
          wave: gold ? 1 : 0, waveT: Math.sin(this.tick * 0.18) });
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    if (sucking) drawSuction(ctx, this.player, this.tick, catS);
    if (this.state !== STATE.DEAD) drawTalentFront(ctx, this);
    // ทางเข้าด่าน ชั้นหน้า: เสาประตู บานสวิง โคมไฟ — แมววิ่งลอดอยู่ข้างหลังจริง
    if (gateView) drawGateFront(ctx, this.gate.def, gateView);

    // หลอดความสามารถ ซ่อนตอนตายเพราะไม่มีความหมายแล้ว
    if (this.state !== STATE.DEAD) {
      ctx.save();
      ctx.translate(0, -liftY);
      drawSkillGauge(ctx, this.player, this.charge / SKILL.chargeFrames, this.skillOn, this.tick, catS);
      ctx.restore();
    }

    // ── ฤทธิ์สมบัติ ──
    // วาดหลังตัวละครเพื่อให้เอฟเฟกต์ครอบทับตัวได้ (ฟองนม วงประกาย)
    // แต่ยังอยู่ใน ctx.save() ของการสั่นจอ จะได้สั่นไปพร้อมกับฉาก
    const anchor = catAnchor(this);
    if (this.treasures.shielded) drawMilkBubble(ctx, anchor, this.tick);
    drawTreasureShows(ctx, this.treasures.shows, anchor);
    drawScorePops(ctx, this.treasures.pops, anchor);

    ctx.restore();
    postProcess(ctx);
    // ฟิลเตอร์เต็มจอของพรสวรรค์ (โลกช้า / โหมดเงา) อยู่ใต้ HUD ตัวเลขจึงยังอ่านชัด
    drawTalentScreen(ctx, this);
    // ขอบจอเรือง/หัวใจลอยของช่วงสกิล — ใต้ HUD เหมือนฟิลเตอร์พรสวรรค์ ตัวเลขยังอ่านชัด
    drawSkillScreen(ctx, this);
    drawHUD(ctx, this);

    // ช่องสมบัติอยู่นอก ctx.save() ของการสั่นจอโดยตั้งใจ — ตัวเลขนับถอยหลัง
    // ที่สั่นตามจอตอนโดนชนอ่านไม่ทันพอดีในจังหวะที่ต้องการอ่านที่สุด
    // ซ่อนตอนตายเพราะไม่มีอะไรให้รอแล้ว เหมือนหลอดความสามารถ
    if (this.state !== STATE.DEAD) {
      drawTreasureSlots(ctx, this.treasures.gauges(), this.tick);
    }

    this.drawFlash(ctx);
  }

  /**
   * ฉากหน้าแรก — ไม่มี HUD ไม่มีด่าน มีแค่แมวตัวที่เลือกไว้ยืนรออยู่
   * ตัวละครวางไว้ราว 31% จากซ้าย เพื่อเปิดครึ่งขวาให้แผงเมนู HTML ที่ทับอยู่
   */
  /**
   * เดินคิวท่าว่างไปทีละเฟรม
   * แยกจาก drawHome() เพราะการวาดอาจถูกข้ามได้ (เฟรมตก) แต่เวลาต้องเดินตรงเสมอ
   */
  stepIdle(dt) {
    // ระหว่างให้หัวใจหรือกำลังตอบการแตะ คิวท่าว่างต้องหยุดสนิท
    // ไม่ใช่แค่ถูกท่าอื่นทับตอนวาด ถ้าปล่อยให้เดินต่อ พอท่านั้นเล่นจบ
    // น้องจะโผล่กลางท่าหาวหรือท่าเลียทันที เหมือนภาพกระโดดข้ามไปครึ่งท่า
    if (this.love || this.react) return;

    if (this.idleT < 0) {
      this.idleWait += dt;
      if (this.idleWait >= IDLE_GAP) {
        this.idleWait = 0;
        this.idleT = 0;
        this.idleAt = (this.idleAt + 1) % IDLE_ACTS.length;
        this.speakStart(IDLE_ACTS[this.idleAt]);
      }
      return;
    }

    this.idleT += dt;
    if (this.idleT >= IDLE_ACTS[this.idleAt].hold) this.idleT = -1;   // กลับไปยืนเฉย ๆ
  }

  /**
   * ท่าที่ต้องวาดตอนนี้ — null = ยืนปกติ
   * k คือน้ำหนักของท่า 0→1→0 ทำให้เข้าและออกจากท่าแบบค่อยเป็นค่อยไป
   */
  /**
   * ท่าที่กำลังเล่นอยู่ พร้อมข้อมูลของท่าเอง (ชื่อท่า ความยาว เสียงประจำท่า)
   * null = ยืนเฉย ๆ ไม่ได้ทำท่าอะไร
   *
   * แยกจาก idlePose เพราะฝั่งเสียงต้องรู้ว่า "ท่าไหน" ไม่ใช่แค่ "รูปร่างไหน"
   * ส่วนฝั่งวาดไม่ต้องรู้จักเสียงเลย
   */
  get activePose() {
    if (this.love) {
      const k = this.love.k;
      return k > 0.001 ? { act: LOVE_ACT, k } : null;
    }
    if (this.react) {
      const act = REACT_ACTS[this.react.at];
      return { act, k: poseWeight(this.react.t, act.hold, REACT_EASE) };
    }
    if (this.idleT < 0) return null;
    const act = IDLE_ACTS[this.idleAt];
    return { act, k: poseWeight(this.idleT, act.hold, IDLE_EASE) };
  }

  get idlePose() {
    const a = this.activePose;
    return a ? { pose: a.act.pose, k: a.k } : null;
  }

  // ── เสียงพูดของน้อง ─────────────────────────────
  //
  // ทุกท่ามีเสียงประจำท่า อยู่ที่ช่อง voice ของตารางท่า
  //
  // ── ทำไมเสียงถึงต้องผูกกับปาก ไม่ใช่เล่นตอนเริ่มท่าเฉย ๆ ──
  // ท่าที่ปากขยับเป็นจังหวะ (โบกอุ้งเท้า ดีใจตอนได้หัวใจ) อ้าปากหลายครั้งต่อหนึ่งท่า
  // ถ้าเล่นเสียงครั้งเดียวตอนเริ่ม ปากที่อ้าอีกสองสามครั้งจะเงียบสนิท
  // ซึ่งอ่านออกทันทีว่าเสียงไม่ได้มาจากตัวน้อง

  /** เสียงตอนเริ่มท่า — เฉพาะท่าที่ปากไม่ขยับ ที่เหลือ stepVoice ดูแลให้ */
  speakStart(act) {
    if (act?.voice && !poseSpeaks(act.pose)) sfx[act.voice]?.();
  }

  /**
   * เดินเสียงไปทีละเฟรม — ร้องทุกครั้งที่ปากเปลี่ยนจากหุบเป็นอ้า
   *
   * ถามฝั่งวาดว่าตอนนี้ปากอ้าอยู่ไหม ไม่ได้นับเวลาเอง
   * ถ้านับเอง สองฝั่งจะเพี้ยนจากกันทันทีที่มีคนไปจูนจังหวะปากข้างเดียว
   */
  stepVoice() {
    const a = this.activePose;
    const open = !!a && poseMouthOpen(a.act.pose, this.homeTick, a.k);
    if (open && !this.mouthWas && a.act.voice) sfx[a.act.voice]?.();
    this.mouthWas = open;
  }


  // ── แตะตัวน้อง ──────────────────────────────────────────────

  /**
   * ผู้เล่นแตะตัวน้อง — เล่นท่าถัดไปในตาราง แล้วเลื่อนตัวชี้ไปท่าต่อไป
   *
   * ── แตะซ้ำระหว่างท่ายังไม่จบ ──
   * ไม่ตัดภาพไปท่าใหม่ทันที แต่จองท่าถัดไปไว้แล้วเร่งท่าปัจจุบันเข้าสู่ช่วงคลายออก
   * น้องจึงกลับมายืนก่อนแล้วค่อยเข้าท่าใหม่ ซึ่งอ่านเป็น "เลิกทำอันเก่า
   * ไปทำอันใหม่" ส่วนการตัดภาพจะเห็นตัวเปลี่ยนรูปกลางอากาศ
   *
   * เมินการแตะตอนหัวใจกำลังเล่น — ท่านั้นมีของขวัญผูกอยู่ท้ายแอนิเมชัน
   * ถ้าตัดทิ้งกลางคัน กล่องของขวัญจะไม่มีวันเปิด (ดู settleLove ใน main.js)
   *
   * @returns true ถ้ารับการแตะไว้ (ใช้บอก UI ว่าควรตอบสนองไหม)
   */
  tapCat() {
    if (this.state !== STATE.READY || this.inRoom || this.love) return false;

    if (this.react) {
      if (this.react.next != null) return false;   // จองไว้แล้ว รอท่าที่จองก่อน
      this.react.next = this.reactAt;
      this.reactAt = (this.reactAt + 1) % REACT_ACTS.length;
      const out = REACT_ACTS[this.react.at].hold - REACT_EASE;
      if (this.react.t < out) this.react.t = out;
      return true;
    }

    this.startReact(this.reactAt);
    this.reactAt = (this.reactAt + 1) % REACT_ACTS.length;
    return true;
  }

  /** เข้าท่าที่ i ทันที พร้อมเสียงประจำท่า */
  startReact(i) {
    // ตัดท่าว่างที่ค้างอยู่ทิ้ง คนเพิ่งแตะต้องเห็นน้องตอบในเฟรมถัดไป
    // ไม่ใช่รอครึ่งวินาทีให้ท่าหมอบคลายออกก่อน (เหตุผลเดียวกับ startLove)
    this.idleT = -1;
    this.idleWait = 0;
    this.react = { at: i, t: 0, next: null };
    this.speakStart(REACT_ACTS[i]);
  }

  /** เดินท่าตอบการแตะไปทีละเฟรม — แยกจากการวาดด้วยเหตุผลเดียวกับ stepIdle() */
  stepReact(dt) {
    const R = this.react;
    if (!R) return;
    R.t += dt;
    if (R.t < REACT_ACTS[R.at].hold) return;
    if (R.next != null) this.startReact(R.next);
    else this.react = null;
  }

  // ── ให้หัวใจน้อง ────────────────────────────────────────────
  //
  // กติกา (ของขวัญ/คูลดาวน์) อยู่ใน src/pet.js ส่วนปุ่มอยู่ใน main.js
  // ที่นี่รับผิดชอบอย่างเดียวคือ "ภาพที่เห็น" — หัวใจลอยไปหาน้อง แล้วน้องดีใจ

  /**
   * ตำแหน่งหัวน้องบนหน้าแรก ในพิกัดฉาก
   *
   * คำนวณจากตัวเลขชุดเดียวกับที่ drawHome() ใช้วางตัวละคร (จุดยืน + ครึ่งความสูง
   * ตัวคูณสเกล + จุดหัวในพิกัดตัวแมวที่ -12) ถ้าวันหลังย้ายน้อง ต้องแก้ที่นี่ด้วย
   * — ปลายทางของหัวใจจึงตามไปเอง ไม่ต้องจูนตัวเลขซ้ำอีกที่
   */
  homeHead() {
    const scale = this.catScaleHome;
    return {
      x: VIEW.W * 0.5 + 1 * scale,
      y: GROUND_Y - (BODY.standH / 2) * scale - 12 * scale,
      r: 13 * scale,
    };
  }

  /** ตัวคูณขนาดแมวบนหน้าแรก — จอสัมผัสกว้างกว่าเพราะปุ่มเมนูถูกบีบเข้ามาจากขอบ */
  get catScaleHome() {
    return coarsePointer.matches ? 3 : 2.6;
  }

  /**
   * เริ่มลำดับให้หัวใจ
   * @param onDone เรียกตอนแอนิเมชันจบ — ผู้เรียกค่อยเปิดกล่องของขวัญตรงนั้น
   *               (Game ไม่รู้จักทองและไม่รู้จักกล่องของขวัญ เหมือนกรณีตกหลุม)
   */
  startLove(onDone = () => {}) {
    if (this.love) return false;
    // ท่าตอบการแตะที่ค้างอยู่ต้องหยุด — หัวใจเป็นท่าที่มีของขวัญผูกอยู่ท้าย
    // จึงต้องได้เล่นจนจบเสมอ ปล่อยให้สองท่าแย่งตัวน้องกันไม่ได้
    this.react = null;
    // ตัดท่าว่างที่ค้างอยู่ทิ้งทันที ไม่ปล่อยให้คลายออกเอง — คนเพิ่งกดปุ่ม
    // ต้องเห็นน้องตอบสนองในเฟรมถัดไป ไม่ใช่รอครึ่งวินาทีให้ท่าหมอบคลายก่อน
    this.idleT = -1;
    this.idleWait = 0;
    this.love = { t: 0, k: 0, hop: 0, hearts: [], burst: false, done: onDone };
    return true;
  }

  /** เดินลำดับให้หัวใจไปทีละเฟรม — แยกจากการวาดด้วยเหตุผลเดียวกับ stepIdle() */
  stepLove(dt) {
    const L = this.love;
    if (!L) return;

    L.t += dt;
    const r = L.t - LOVE.fly;   // เวลาหลังหัวใจถึงตัวน้อง ติดลบ = ยังลอยอยู่

    // น้ำหนักท่าดีใจ 0→1→0 สูตรเดียวกับ idlePose เป๊ะ ๆ จะได้นุ่มเท่ากัน
    const raw = r < 0 ? 0 : Math.min(1, r / LOVE.ease, (LOVE.hold - r) / LOVE.ease);
    const e = Math.max(0, Math.min(1, raw));
    L.k = e * e * (3 - 2 * e);

    // กระโดดดีใจหนึ่งครั้งตอนหัวใจถึงตัว แล้วค่อยทรุดลงนั่ง
    // ครึ่งคลื่นไซน์เดียว ขึ้นแล้วลงจบในตัว ไม่ต้องมีตัวหน่วงแยก
    L.hop = r >= 0 && r < LOVE.jump ? Math.sin((r / LOVE.jump) * Math.PI) * 15 : 0;

    // หัวใจแตกกระจายตอนถึงตัว ครั้งเดียวต่อการกดหนึ่งครั้ง
    if (!L.burst && r >= 0) {
      L.burst = true;
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i / 8 - 0.5) * 2.4;
        L.hearts.push({
          x: 0, y: 0, vx: Math.cos(a) * (1.6 + Math.random() * 1.5),
          vy: Math.sin(a) * (1.7 + Math.random() * 1.4),
          r: 4 + Math.random() * 3.5, life: 40 + Math.random() * 22, age: 0,
        });
      }
    }

    // หัวใจดวงเล็กผุดขึ้นเรื่อย ๆ ระหว่างน้องดีใจ — หยุดก่อนท่าคลายออก
    // ไม่งั้นจะยังมีหัวใจลอยอยู่ตอนน้องกลับไปยืนเฉย ซึ่งอ่านเป็นค้าง
    if (r >= 0 && r < LOVE.hold - LOVE.ease && Math.floor(L.t) % 11 === 0) {
      L.hearts.push({
        x: (Math.random() - 0.5) * 26, y: 0,
        vx: (Math.random() - 0.5) * 0.7, vy: -1.1 - Math.random() * 0.6,
        r: 3.5 + Math.random() * 3, life: 52 + Math.random() * 20, age: 0,
      });
    }

    for (const h of L.hearts) {
      h.age += dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.vy += 0.028 * dt;    // ลอยขึ้นแล้วช้าลง ไม่ใช่พุ่งขึ้นเป็นเส้นตรงตลอด
      h.vx *= 0.985;
    }
    L.hearts = L.hearts.filter((h) => h.age < h.life);

    if (L.t >= LOVE_TOTAL) {
      this.love = null;
      L.done();
    }
  }

  /**
   * วาดหัวใจที่กำลังลอยไปหาน้อง กับหัวใจที่ผุดรอบตัว
   * เรียกจาก drawHome() หลังวาดตัวละคร หัวใจจึงลอยอยู่หน้าตัวเสมอ
   */
  drawLove(ctx) {
    const L = this.love;
    if (!L) return;
    const head = this.homeHead();

    // ── หัวใจดวงเล็กรอบหัว ──
    // พิกัดของแต่ละดวงวัดจากหัว ไม่ใช่จากขอบจอ ย้ายน้องแล้วหัวใจตามไปเอง
    for (const h of L.hearts) {
      const k = 1 - h.age / h.life;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 2.2);
      drawHeart(ctx, head.x + h.x, head.y - head.r * 0.5 + h.y, h.r * (0.55 + k * 0.45));
      ctx.restore();
    }

    if (L.t >= LOVE.fly) return;

    // ── ดวงใหญ่ที่ลอยจากปุ่มมาหาน้อง ──
    // โค้งขึ้นก่อนแล้วค่อยลง ไม่ใช่เส้นตรง — เส้นตรงอ่านเป็น "ของถูกลาก"
    // ส่วนเส้นโค้งอ่านเป็น "ของถูกโยน" ซึ่งคือสิ่งที่กำลังเกิดขึ้นจริง
    const p = L.t / LOVE.fly;
    const ease = 1 - (1 - p) * (1 - p);          // ออกตัวเร็ว เข้าเป้าช้า
    const x = LOVE_BTN.x + (head.x - LOVE_BTN.x) * ease;
    const y = LOVE_BTN.y + (head.y - LOVE_BTN.y) * ease - Math.sin(p * Math.PI) * 46;

    // เต้นเป็นจังหวะหัวใจระหว่างทาง แล้วพองขึ้นอีกทีตอนใกล้ถึง
    const beat = 1 + Math.sin(L.t * 0.42) * 0.12 + p * p * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = 'rgba(255,120,170,.3)';
    ctx.beginPath();
    ctx.arc(x, y, 15 * beat, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawHeart(ctx, x, y, 11 * beat);
  }

  /**
   * ฉากห้องก่อนเริ่มวิ่ง — น้องยืนอยู่กลางห้องรอพูดจบ
   *
   * ── ฉากห้องวาดด้วยโค้ดแล้ว ไม่ใช่ไฟล์ภาพ ──
   * ของเดิมเป็น room-bg.jpg (589 KB) แปะเป็น background ของ .stage แล้วตรงนี้
   * ล้าง canvas ให้โปร่งเพื่อให้ภาพทะลุขึ้นมา ตอนนี้วาดเองทั้งห้อง
   *
   * ห้องนี้เป็นภาพนิ่งทั้งฉาก ต่างจากหน้าแรกที่ของในฉากขยับอยู่กับที่
   * เพราะหน้านี้มีอยู่เพื่อให้อ่านคำพูดของน้องแล้วกดเริ่ม ของที่ขยับจะแย่งสายตา
   * ไปจากสองอย่างนั้น (ดูเหตุผลเต็มใน render/room/index.js)
   *
   * ไม่มีท่าว่างเหมือนหน้าแรก — ฉากนี้สั้น ถ้าใส่ท่าว่างจะได้แค่ท่าที่ค้างครึ่งเดียว
   */
  drawRoom(ctx) {
    const t = this.homeTick;
    const x = VIEW.W * 0.5;

    drawRoomScene(ctx);

    // หรี่บาง ๆ ให้กล่องคำพูดสีครีมกับตัวแมวเด้งออกจากห้องที่สีอุ่นใกล้กัน
    ctx.fillStyle = 'rgba(24,10,38,.14)';
    ctx.fillRect(0, 0, VIEW.W, VIEW.H);

    // สปอตไลต์ใต้เท้า ดันตัวละครให้เด่นออกจากพรม
    const glow = ctx.createRadialGradient(x, GROUND_Y - 40, 10, x, GROUND_Y - 40, 165);
    glow.addColorStop(0, 'rgba(255,214,150,.26)');
    glow.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 180, GROUND_Y - 215, 360, 275);

    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, GROUND_Y + 5, 44 - Math.sin(t * 0.045) * 2.5, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawCatPose(ctx, x, GROUND_Y, 2.6, getSkin(), t);
    postProcess(ctx, { edges: false });
  }

  drawHome(ctx) {
    const t = this.homeTick;
    // ตรงกลางเป๊ะ ๆ เพราะฉากหลังมีเก้าอี้อยู่กลางภาพ และน้องต้องยืนอยู่บนเบาะพอดี
    // (เคยเยื้องซ้ายไป 0.47 เพื่อถ่วงกับปุ่มเล่นมุมขวาล่าง แต่การยืนตรงกับเก้าอี้สำคัญกว่า)
    // ถ้าเปลี่ยนฉากหลังใหม่ ต้องปรับ $FOCUS ใน tools/render-bg.ps1 ให้เบาะมาอยู่ที่ GROUND_Y ด้วย
    const x = VIEW.W * 0.5;

    // ── ฉากหลังวาดด้วยโค้ด ไม่ใช่ไฟล์ภาพแล้ว ──
    // ของเดิมเป็น home-bg.jpg (576 KB) แปะเป็น background ของ .stage แล้วตรงนี้
    // ล้าง canvas ให้โปร่งเพื่อให้ภาพทะลุขึ้นมา ข้อเสียคือมันเป็นภาพนิ่งใบเดียว
    // ขยับไม่ได้ เปลี่ยนธีมไม่ได้ และชิ้นส่วนในภาพเอาไปใช้ในด่านไม่ได้เลย
    //
    // ตอนนี้วาดเองทั้งฉาก ใช้พิกัดชุดเดียวกับตัวเกม (960x420 พื้นอยู่ที่ GROUND_Y)
    // น้องจึงยืนบนพื้นของฉากพอดีโดยไม่ต้องจูนตำแหน่งใหม่
    drawKingdom(ctx, t);
    dimForUi(ctx, 0.45);

    // สปอตไลต์นุ่ม ๆ ดันตัวละครให้เด่นออกจากฉากหลัง
    const glow = ctx.createRadialGradient(x, GROUND_Y - 60, 10, x, GROUND_Y - 60, 175);
    glow.addColorStop(0, 'rgba(255,214,150,.22)');
    glow.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 190, GROUND_Y - 245, 380, 305);

    // ของกินลอยรอบตัว — กันฝั่งซ้ายโล่ง และบอกใบ้ว่าเกมนี้ต้องเก็บอะไร
    // ตำแหน่งวัดจากตัวละคร ทุกจุดอยู่ซ้ายของแผงเมนูจึงไม่มีอะไรถูกบัง
    HOME_DECO.forEach((d, i) => {
      const y = GROUND_Y + d.dy + Math.sin(t * 0.03 + i * 1.7) * 5;
      if (d.kibble) drawKibble(ctx, x + d.dx, y, 11);
      else drawFish(ctx, x + d.dx, y, 11);
    });

    // เงาใต้เท้าหดขยายสวนจังหวะหายใจ ทำให้ตัวละครดูมีน้ำหนัก
    /* น้องยืนบนเบาะพอดีเพราะ drawCatPose วัดจาก "ตำแหน่งเท้า" ไม่ใช่กลางตัว
       ตัวโตขึ้นจึงงอกขึ้นข้างบนอย่างเดียว เท้ายังอยู่ที่ GROUND_Y เท่าเดิม
       ไม่ต้องไปยุ่งกับ $FOCUS ใน tools/render-bg.ps1 */
    const catScale = this.catScaleHome;
    const shadowK = catScale / 2.6;   // เงาต้องโตตามตัว ไม่งั้นน้องจะดูลอยเหนือพื้น

    // กระโดดดีใจตอนได้หัวใจ — ยกทั้งตัวขึ้นจากพื้น ไม่ใช่บิดท่า
    // จึงบวกที่ "ระดับเท้า" ที่ส่งให้ drawCatPose ไม่ใช่ไปยุ่งกับตาราง IDLE_SHAPE
    const hop = this.love?.hop || 0;

    ctx.save();
    // เงาหดลงตอนตัวลอย = สัญญาณเดียวที่บอกความสูงได้ในมุมมองหน้าตรง
    // ถ้าเงาคงเดิม การกระโดดจะอ่านเป็น "ตัวยืดขึ้น" แทนที่จะเป็น "ตัวลอยขึ้น"
    const hopK = 1 - Math.min(0.42, hop / 40);
    ctx.globalAlpha = 0.3 * hopK;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, GROUND_Y + 5, (44 - Math.sin(t * 0.045) * 2.5) * shadowK * hopK,
                8.5 * shadowK * hopK, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawCatPose(ctx, x, GROUND_Y - hop, catScale, getSkin(), t, this.idlePose);
    this.drawLove(ctx);
    postProcess(ctx, { edges: false });
  }
}
