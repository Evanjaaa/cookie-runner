// src/town/main.js
// ─────────────────────────────────────────────────────────────
// เมืองแมวเหมียว (หน้าแยก town.html — ยังไม่รวมเข้าเกมจริง · GAME_PLAN.md ข้อ 11)
//
// ขั้น 1 (ตัดสินใจแล้ว): มุมข้าง เดินซ้าย–ขวาเส้นเดียว · ท่าเดิน = ท่าวิ่งสี่จังหวะของเกม (cat2-run) จังหวะช้าลง
//   หันซ้าย = กลับภาพ · ยืนนิ่ง = ท่ายืนหันตามทางที่เดิน · นั่งม้านั่ง = ท่านั่ง
// ขั้น 2: เมืองเดินคนเดียว — ร้าน 5 ร้าน (ข้อมูลร้านชุดเดียวกับร้านเหมียว src/shop.js) · ลานน้ำพุ + ม้านั่ง · ปราสาท (ยังปิด)
//   รอบ 2 (ผู้ใช้ส่งภาพแบบ): ร้านแต่ละร้านรูปทรงของตัวเอง · แม่น้ำ เกาะลอย เรือเหาะ แมว NPC — ภาพทั้งหมดอยู่ใน world.js
// ขั้น 3: ซื้อ/แลกผ่านเซิร์ฟเวอร์ (wallet.js + supabase/town.sql) — ยังไม่ติดตั้ง = โหมดทดลอง
//
// บังคับ (ผู้ใช้ 27 ต.ค.): กระโดดได้ กดกลางอากาศ = ชั้นสอง · 31 ต.ค. ผู้ใช้ให้แยกแรงกระโดดของเมืองเอง (JUMP ใน layout.js) ลอยนุ่ม สูงกว่าเกมวิ่ง
//   มือถือ: จอยซ้าย (ลากหมุนได้รอบวง ใช้แค่แกนซ้าย–ขวา) · ปุ่มกลาง = ใช้งาน · ขวา = ปุ่มท่าทาง + ปุ่มวิ่ง (สลับ) + ปุ่มกระโดด (ขวาสุด)
//   คอม: ไม่มีปุ่มบนจอ มีแถบบอกปุ่มแทน — ← → / A D เดิน · Shift กดสลับเดิน/วิ่ง (ผู้ใช้ 31 ต.ค. — ไม่ต้องกดค้าง) · Enter / Space / ↑ / W กระโดด · E ใช้งาน
//   ทั้งสองแบบ: แตะ/คลิกพื้น = เดินไปเอง (ขึ้นรอยอุ้งเท้าตรงจุดหมาย) · แตะร้าน = เดินไปหน้าประตูแล้วเข้า
//
// ขยายเมือง (ผู้ใช้ 31 ต.ค.): แม่น้ำ + สะพานไทยโค้ง (bridge.js) · เรือทางลัดระหว่างท่าเรือสองฝั่ง · ของเล่น (play.js)
//   ยืนบนของได้: ผิวทุกชิ้นอยู่ใน layout.js (SURFACES) — กระโดดทะลุขึ้นจากข้างล่าง ยืนบนผิว เดินตกขอบ = ร่วง
//   ลงจากที่สูง: ลากจอยลง / ↓ / S · พื้นสะพานโค้ง (groundY) เป็นพื้นแข็งเหมือนถนน
//   กล้องเลื่อนขึ้นตามเวลาน้องอยู่สูง (camY) — ฉากหลังเลื่อนน้อยกว่าตามความลึก
// ─────────────────────────────────────────────────────────────
import { H, GY, WORLD_W, START_X, PLACES, star, splashAt, drawSplashes, dustAt, drawDust, drawSky, drawFar, drawClouds, drawHills, drawMidTrees, drawBackRow, drawGround, drawStreet, drawFront, drawPrompt, clearCache } from './world.js';
import { SURFACES, surfY, groundY, placeById, JUMP, BOAT_STOPS, REALM, BRIDGE, WORLD_W as TOWN_W } from './layout.js';
import { drawRealmGround, drawRealm } from './castle.js';
import { riverGap, RIVER_SRC_P, drawRiverSource, drawRiverFar, drawBridgeWater, drawBridge, drawBridgeArch, drawBridgeFront } from './bridge.js';
import { stepPlay, swingFrame, bump, drawWater, drawPlay, drawPlayFront, drawBoat, drawBoatFront, boatSeat, mooredX, pierDir, ferryHead, setBoatLit, BOAT_Y as RIVER_BOAT_Y } from './play.js';
import { GW, G_PLACES, G_SURFACES, G_SPAWN, stepGarden, squish, drawGardenSky, drawGardenFar, drawGardenHillsFar, drawGardenHillsNear, drawGardenTrees, drawGardenWorld, drawGardenAirWorld, drawGardenFront, drawGardenOverlay, drawWarp, drawPhotoFrameOverlay, pickBurst } from './garden.js';
import { createRunAnim, stepRunAnim, drawCat2Run, RUN_K, RUN_TURN } from '../render/cat2-run.js';
import { drawCat2, drawTrail, CAT2_UNIT } from '../render/cat2.js';
import { getSkin, setSkin, skinById, SKINS, catSkin, catSkinId } from '../skins.js';
import { CUSTOM_ID } from '../paint.js';
import { grownCats } from '../cats.js';
import { OUTFITS, wearable, isOwned, getOutfit, setOutfit, RARITY, outfitById } from '../outfits.js';
import { CAT_LOOK, CAT_ANIM } from '../config.js';
import { drawItemIcon } from '../render/items.js';
import { SHOP_TABS, SHOP_ITEMS, EXCHANGE } from '../shop.js';
import { initWallet, wallet, catalogItem, buy, exchange } from './wallet.js';
import { drawInterior, clearInterior, keeperLook, KEEP_TOP } from './interior.js';
import { COUNTER } from './interior-art.js';
import { MeowSong } from './meow-audio.js';
import { DreamSong } from './garden-song.js';
import { randomFlower, drawHeldFlower, spawnMote, drawFlowerMotes } from './flower.js';
import { MAP_H, mapW, mapX, drawMapArt, drawMapLive, STOP_INFO } from './route-map.js';
import { TownSfx } from './town-sfx.js';
import { audioCtx, musicOut, sfxOut, unlockAudio, setTownAudio, getTownMix, setTownMix, } from '../audio.js';
import { HW, H_PLACES, H_SURFACES, H_SPAWN, H_STAIRS_X, H_FOUNT_X, setStairsCat, drawStairsFront, stairsTread, stairsProfilePath, drawHallBack, drawHallWorld, hallLightMap } from './castle-hall.js';
import { LW, L_PLACES, L_SURFACES, L_SPAWN, L_STAIRS_X, SNACK_POP, lampOn, toggleLamp, setLamp, setLoungeCat, condoBounce, drawLoungeBack, drawLoungeWorld, drawLoungeFront, loungeLightMap } from './castle-lounge.js';
import { SNACKS, startAct, stepAct, actPose, randomSnack, drawSnackFlight, burst, stepActFx, drawActFx } from './castle-acts.js';
import { openScope, scopeStep, scopeDrag, scopeZoom, drawScope, lensOf } from './castle-scope.js';
import { RW, R_PLACES, R_SURFACES, R_SPAWN, STAR_LINES, roofWish, roofWishSend, drawRoofBack, drawRoofWorld, roofLights } from './castle-roof.js';
import { drawLightFx, toggleLightFx, lightFxOn, lightFxLevel, setLightFxLevel } from './light-fx.js';
import { drawWithRim, rimOn, setRimOn, castOn, setCastOn } from './rim-light.js';
import { emoteList, emoteId, emotePeak, emoteHolds, startEmote, stopEmote, stepEmote, emotePose, emoteLift, emoteAnchors, drawEmoteFx, emoteAge, emoteShapeAt } from './emotes.js';
import { online, onlineRoom, onlineMember, onlineMe, onlineHandlers, joinCastle, leaveCastle, sendState, sendLook, sendSay, sendLamp } from './online.js';
import { initChat, chatReceive, chatSayNo, chatReset, bubbleOf, drawBubble, toggleChat, closeChat, chatOpen, paintChat, focusChat } from './chat.js';
import { sendReport } from '../net/cloud.js';
import {
  HOME_W, HOME_PLACES, HOME_SURFACES, HOME_SPAWN, HOME_BACK_X, NURSE_W, NURSE_PLACES, NURSE_SURFACES, NURSE_SPAWN,
  drawHomeBack, drawHomeWorld, drawNurseBack, drawNurseWorld, drawNurseFront, recordOn, toggleRecord, homeRug, NURSE_SPOTS,
  homeLightMap, nurseLightMap,
} from './home.js';
import { createKittens, stepKittens, drawKittens, drawKittenNames, drawBowlFood, callToBowl, callToTub, setKitSound, foamBurst, drawFoamBursts, drawShower, showerLevel, kitAt, grabKit, moveGrab, dropGrab, grabbing, petKit, drawGrab } from './home-cats.js';
import { openFeed, closeFeed } from './feed.js';
import { openBath, closeBath } from './bath.js';
import { initHudIcons } from './hud-icons.js';
import { getGems } from '../vault.js';

const cv = document.getElementById('town');
const ctx = cv.getContext('2d');
const $ = (id) => document.getElementById(id);

const WALK = 2.6;            // หน่วยโลกต่อเฟรม (60fps)
const RUN = 5.6;             // ตอนวิ่ง (ปุ่มวิ่ง / Shift)
const NEAR = 46;             // ยืนห่างประตูไม่เกินเท่านี้ = ใช้งานได้
const SC = CAT_LOOK * RUN_K; // ขนาดตัวน้องเท่าตอนวิ่งในเกม

/** จุดเริ่มยืนในเมือง — ?spot=castle (แผนที่/แตะปราสาทในหน้าแรกของเกม · ผู้ใช้ 3 พ.ย.) = หน้าปราสาท · ไม่ส่ง = ต้นเมือง */
function startX() {
  const spot = new URLSearchParams(location.search).get('spot');
  const cas = PLACES.find((p) => p.id === 'castle');
  if (spot === 'castle' && cas) return cas.door - 260;
  return START_X;
}
const cat = {
  x: startX(), dir: 1, moving: false, target: null, pending: null, sit: null,
  y: GY,                     // ระดับเท้า (หน่วยโลก) — บนถนน = GY · บนสะพาน/ของ = สูงขึ้น (น้อยกว่า)
  on: null,                  // ผิวที่ยืนอยู่ (SURFACES) · null = ถนน/พื้นสะพาน
  drop: null,                // ผิวที่กำลังลงผ่าน (ไม่ลงจอดบนผิวนี้จนกว่าจะพ้น)
  still: 0, face: 1,         // เฟรมที่ยืนนิ่ง · 1 = หันข้างตามทางเดิน → 0 = หันหน้าตรงมองผู้เล่น (ยืนนิ่งเกิน 5 วิ)
  A: createRunAnim(),
  P: { onGround: true, jumps: 0, vy: 0, runPhase: 0, squash: 0, sliding: false, y: GY, fainting: false },
};
const keys = { left: false, right: false };
let joyDir = 0;              // จอยมือถือ: -1 ซ้าย · 0 ปล่อย · 1 ขวา
let joyDown = false;         // จอยถูกลากลงอยู่ (ลงจากที่สูง)
let joyReset = () => {};     // ปล่อยจอยกลับกลาง (ตั้งในตัวจอยข้างล่าง) — เรียกทุกครั้งที่หยุดบังคับ (เข้าร้าน เปิดแผง ล่องเรือ ถ่ายรูป วาป)
let running = true;          // ปุ่มวิ่ง (สลับ) — เข้าเมืองทุกครั้งเริ่มที่วิ่ง (ผู้ใช้ 1 พ.ย.) ผู้เล่นกดเปลี่ยนเป็นเดินเอง
// คอม (มีเมาส์ชี้ได้) = ซ่อนปุ่มบนจอ โชว์แถบบอกปุ่มคีย์บอร์ดแทน · จอสัมผัส = จอย + ปุ่ม
const deskMq = matchMedia('(hover: hover) and (pointer: fine)');
let desk = deskMq.matches;
document.body.classList.toggle('desk', desk);
deskMq.addEventListener('change', (e) => { desk = e.matches; document.body.classList.toggle('desk', desk); });
let mark = null;             // รอยอุ้งเท้าตรงจุดที่แตะพื้น { x, t } — หายเมื่อถึง/เปลี่ยนใจ
let wantDrop = false;        // สั่งลงจากที่สูง (กด ↓ / ลากจอยลง — นับครั้งที่กด ไม่ใช่กดค้าง)
let ride = null;             // กำลังล่องเรือ { from, to, dir, ph: board|sail|land, u, bx, dur }
let k = 1, vw = 960, camX = 0, camY = 0, tick = 0, last = performance.now();
let paused = false;   // มีหน้าต่างเปิดอยู่ = ไม่รับปุ่มเดิน
let kd = null;   // ยกน้องในห้องเลี้ยง { kit, x0, y0, sx, sy, moved, id } — sx, sy = นิ้วบนจอ (หน่วยฉาก) · ดูหัวข้อ "ยก/ลาก/ลูบน้อง"
let scene = 'town';   // 'town' | 'shop' (ในร้าน — ดูหัวข้อร้านข้างล่าง) · ประกาศก่อน resize() ที่รันตอนโหลด
// โลกที่เดินอยู่ (ผู้ใช้ 31 ต.ค. — สวนดอกไม้ในฝัน garden.js): ผัง · ผิวที่ยืนได้ · พื้น · ความกว้าง — เดิน/กระโดด/นั่งใช้โค้ดชุดเดียวกัน
const TOWN = { id: 'town', w: WORLD_W, places: PLACES, surfaces: SURFACES, ground: groundY };
const GARDEN = { id: 'garden', w: GW, places: G_PLACES, surfaces: G_SURFACES, ground: () => GY };
// ปราสาทแมวเหมียว ชั้น 1 · โซนต้อนรับ (ผู้ใช้ 7 พ.ย. — castle-hall.js) · เข้าจากประตูปราสาทในเมือง หรือ ?spot=hall (แผนที่โลกเหมียว)
const HALL = { id: 'hall', w: HW, places: H_PLACES, surfaces: H_SURFACES, ground: () => GY };
// on the stairs = behind the railing; mid-air keeps the last value (no flicker while jumping on the stairs)
// แมวตัวอื่น (ออนไลน์) อยู่บนบันได = ราวก็วาดหน้าแมวเหมือนกัน
let myStairs = null;
const stairsPre = () => {
  if (cat.P.onGround) myStairs = cat.on && /stairs/.test(cat.on.id) ? cat.on.id : null;
  let id = myStairs;
  if (!id) for (const q of peers.values()) if (q.w === WD.id && !q.air && q.on && /stairs/.test(q.on.id)) { id = q.on.id; break; }
  setStairsCat(id);
};
HALL.pre = stairsPre;
HALL.front = (c) => drawStairsFront(c);
// ปราสาทชั้น 2 · Cozy Lounge (castle-lounge.js) · ขึ้นบันไดชั้น 1 / เคาน์เตอร์วาป / ?spot=lounge
const LOUNGE = { id: 'lounge', w: LW, places: L_PLACES, surfaces: L_SURFACES, ground: () => GY };
LOUNGE.front = (c, cx, w, t) => drawLoungeFront(c, cx, w, t, cat.sit?.kind === 'tent' ? cat.sit.id : null);   // น้องนอนในเต็นท์ = ผ้าเต็นท์หลังนั้นทับตัว
LOUNGE.pre = () => { setLoungeCat(cat.x, cat.y, cat.P.onGround ? cat.on?.id : null); stairsPre(); };   // ของเล่นคอนโดแมวแกว่งตอนน้องปัดผ่าน
// ปราสาทชั้น 3 · Starry Rooftop (castle-roof.js) · ขึ้นบันไดชั้น 2 / เคาน์เตอร์วาป / ?spot=roof
const ROOF = { id: 'roof', w: RW, places: R_PLACES, surfaces: R_SURFACES, ground: () => GY };
// บ้านของฉัน (ผู้ใช้ 14 พ.ย. — home.js): ห้องนอนของฉัน ↔ ห้องเลี้ยงน้องแมว · ห้องส่วนตัว ไม่ต่อห้องออนไลน์ของปราสาท
//   เปิดแยกหน้าก่อน: town.html?spot=home · ?spot=nursery (ห้องแมว: ?home=empty|starter|full ดูชุดของแต่ละแบบ)
const HOME = { id: 'home', w: HOME_W, places: HOME_PLACES, surfaces: HOME_SURFACES, ground: () => GY };
const NURSERY = { id: 'nursery', w: NURSE_W, places: NURSE_PLACES, surfaces: NURSE_SURFACES, ground: () => GY };
// น้องแมวเด็กในห้อง (home-cats.js): เดินเล่นเอง · ตัวที่อยู่หลังแนวเท้าผู้เล่นวาดก่อนตัวผู้เล่น ตัวที่อยู่หน้าวาดทีหลัง
let kits = null;
const kitsNow = () => (kits ??= createKittens(SC));
NURSERY.step = (dt) => { if (kd?.moved) moveGrab(kd.sx + camX, kd.sy - camY); stepKittens(kitsNow(), dt, cat.x, cat.y, tick); };
NURSERY.under = (c, cx, w) => { drawBowlFood(c, kitsNow(), tick); drawShower(c, tick); drawKittens(c, kitsNow(), tick, (q) => q.y <= cat.y, cat.x, cx, w, kitLit()); };   // อาหารในชาม (หน้าเทอาหาร feed.js) ก่อนตัวน้อง
NURSERY.front = (c, cx, w, t) => {
  drawKittens(c, kitsNow(), tick, (q) => q.y > cat.y, cat.x, cx, w, kitLit());
  drawNurseFront(c, cx, w, t, cat.sit?.id === 'nBox');   // มุดกล่องต้อนรับ = ผนังหน้ากล่องทับตัว
  drawFoamBursts(c, tick);   // ฟองกระเด็นตอนเหยียบอ่างอาบน้ำ (ทับตัวผู้เล่น)
  drawKittenNames(c, kitsNow(), cat.x);
  drawGrab(c, kitsNow(), tick, kitLit());   // น้องที่กำลังยก + จุดวาง (บนสุด) · แสงขอบ/เงาทอดแบบตัวอื่น
};
const IN_HOME = () => WD === HOME || WD === NURSERY;
/**
 * สร้างภาพแคชของทั้งชั้นปราสาทล่วงหน้า (ภาพนิ่ง + แสงเงาของแต่ละชิ้นทำครั้งเดียว)
 * เรียกตอนม่านวาปปิดจอเต็ม / ตอนเปิดหน้า / ตอนเปลี่ยนขนาดจอ — เดินไปเจอของใหม่จะไม่สะดุด
 * วาดลงผ้าใบจิ๋ว 4×4 ที่สเกลเดียวกับจอจริง (แคชผูกกับสเกล) — ภาพจริงไม่ได้ใช้
 */
const warmCv = document.createElement('canvas');
warmCv.width = warmCv.height = 4;
function warmFloor(back, world, W) {
  const g = warmCv.getContext('2d');
  for (let x = 0; x < W; x += vw * 0.9) { g.setTransform(k, 0, 0, k, -x * k, 0); back(g, x, vw, tick); world(g, x, vw, tick); }
}
HALL.warm = () => warmFloor(drawHallBack, drawHallWorld, HW);
LOUNGE.warm = () => warmFloor(drawLoungeBack, drawLoungeWorld, LW);
ROOF.warm = () => warmFloor(drawRoofBack, drawRoofWorld, RW);
HOME.warm = () => warmFloor(drawHomeBack, drawHomeWorld, HOME_W);
NURSERY.warm = () => warmFloor(drawNurseBack, drawNurseWorld, NURSE_W);
let WD = TOWN;
{
  const spot = new URLSearchParams(location.search).get('spot');
  if (spot === 'hall') { WD = HALL; cat.x = H_SPAWN; }
  else if (spot === 'lounge') { WD = LOUNGE; cat.x = L_SPAWN; }
  else if (spot === 'roof') { WD = ROOF; cat.x = R_SPAWN; }
  else if (spot === 'home') { WD = HOME; cat.x = HOME_SPAWN; }
  else if (spot === 'nursery') { WD = NURSERY; cat.x = NURSE_SPAWN; }
  else if (spot === 'garden') { WD = GARDEN; cat.x = G_SPAWN; }   // สวนดอกไม้ในฝัน (ทดสอบ — เดิมต้องเดินเข้าซุ้มสวน)
}
let photo = null;     // จุดถ่ายรูปในสวน { p, phase: pose|count|shoot|shot, t, pose, wait } — ดูหัวข้อจุดถ่ายรูป

// ── เสียง ─────────────────────────────────────────────────────
// เพลง "เจ้าเหมียววิ่งเร็ว" + เสียงเอฟเฟกต์ (meow-audio.js ไฟล์จากผู้ใช้ 28 ต.ค.) — สร้างสดด้วย Web Audio
// ใช้ AudioContext ตัวเดียวกับเกม · ระดับเสียงเป็นชุดของเมืองเอง (setTownAudio ใน audio.js) ตั้งในหน้าตั้งค่าของเมือง
//   ไม่แตะระดับเสียงของเกม · เสียงร้องของน้องตอนทำท่า (sfx ของเกม) ก็ไหลช่องเอฟเฟกต์ชุดเดียวกัน
// เบราว์เซอร์ให้เริ่มเสียงหลังผู้เล่นแตะ/กดปุ่มเท่านั้น · เพลงหรี่จน 0 = หยุดเพลงจริง (ไม่สร้างเสียงทิ้ง) · สลับแท็บ = พักเพลง
setTownAudio(true);
// เพลงตามโลกที่อยู่ (ผู้ใช้ 31 ต.ค.): เมือง = เพลงเมือง (MeowSong) · สวนดอกไม้ = เพลงฝัน (DreamSong ใน garden-song.js)
let song = null, gardenSong = null, sfxKit = null;
const musicWanted = () => getTownMix('music') > 0 && !document.hidden;
function wakeAudio() {
  unlockAudio();
  if (!song) {
    const a = audioCtx();
    song = new MeowSong(a, musicOut());
    gardenSong = new DreamSong(a, musicOut());
    sfxKit = new TownSfx(a, sfxOut());   // เสียงเกม + เสียงของเมือง (town-sfx.js)
  }
  syncMusic();
}
/** เล่นเพลงของโลกที่น้องอยู่ อีกเพลงพัก (เพลงเมืองเล่นต่อจากที่ค้าง) · หรี่เสียงเพลงจน 0 / สลับแท็บ = พักทั้งคู่ */
function syncMusic() {
  if (!song) return;
  const want = musicWanted(), cur = WD === GARDEN ? gardenSong : IN_HOME() ? (recordOn() ? gardenSong : null) : song;
  for (const s of [song, gardenSong]) if (s !== cur || !want) s.pause();
  if (want && cur) cur.start();
}
const sfx = (name, ...args) => { if (sfxKit) sfxKit.play(name, ...args); };
// เสียงกิจกรรมลูกแมวในห้องเลี้ยง (กระโดด กินข้าว อาบน้ำ) — เฉพาะตัวที่อยู่ในจอ
setKitSound((name, x, ...args) => { if (WD === NURSERY && x > camX - 40 && x < camX + vw + 40) sfx(name, ...args); });
// แผงปุ่มทดสอบ 🐞 ของบ้านของฉัน — เฉพาะ dev server (เว็บจริงตัดทิ้งตอน build) · ลบได้ทั้งบล็อก + ไฟล์ home-debug.js
if (import.meta.env.DEV) {
  import('./home-debug.js').then((m) => m.mountHomeDebug({
    visible: () => WD === HOME || WD === NURSERY,
    nursery: () => WD === NURSERY,
    kits: () => (WD === NURSERY ? kitsNow() : []),
    toast: (msg) => toast(msg),
    refreshHud: () => paintHud(),
  }));
  window.__nurse = { kits: () => kitsNow(), cam: () => camX, camY: () => camY, k: () => k, spots: NURSE_SPOTS };   // สคริปต์ทดสอบ (dev เท่านั้น)
}
window.addEventListener('pointerdown', wakeAudio, { capture: true });
window.addEventListener('keydown', wakeAudio, { capture: true });
document.addEventListener('visibilitychange', syncMusic);

// ── ชุดที่ใส่ในเมือง ───────────────────────────────────────────
// โหมดทดลอง (ไม่ได้เชื่อมเซิร์ฟเวอร์): ห้องแต่งตัวโชว์ทุกชุดในเกม — ชุดที่ยังไม่มีลองใส่ได้ในเมือง (tryOutfit) ไม่บันทึก
// ชุดที่มีอยู่แล้ว = ใส่จริง (setOutfit ตัวเดียวกับเกม) · ทุกที่ในเมืองอ่านสกินผ่าน townSkin() ที่เดียว
// หน้า "น้องแมว" (ผู้ใช้ 31 ต.ค.): ตัวที่มีจริง (น้องส้ม · น้องระบายสี · น้องจากกล่องที่โตแล้ว) = เปลี่ยนจริง (setSkin ตัวเดียวกับเกม)
//   โหมดทดลอง: มีทุกสีขนในเกมให้ลองเป็นในเมือง (tryCat) ไม่บันทึก
let tryOutfit = null, tryCat = null;
let skinMemo = { base: null, o: null, v: null };
let baseMemo = { real: null, c: null, v: null };
/** ตัวน้อง (ก่อนลองชุด): ตัวที่ใช้อยู่ในเกม หรือสีที่ลองเป็น (ใส่ชุดเดิมที่ใส่อยู่) */
function townBase() {
  const real = getSkin();
  if (!tryCat) return real;
  if (baseMemo.real !== real || baseMemo.c !== tryCat) baseMemo = { real, c: tryCat, v: { ...tryCat, outfit: real.outfit } };
  return baseMemo.v;
}
function townSkin() {
  const base = townBase();
  if (!tryOutfit) return base;
  if (skinMemo.base !== base || skinMemo.o !== tryOutfit) skinMemo = { base, o: tryOutfit, v: { ...base, outfit: tryOutfit } };
  return skinMemo.v;
}

// ── ขนาดจอ ────────────────────────────────────────────────────
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth, h = window.innerHeight;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  k = cv.height / H;
  vw = cv.width / k;
  clearCache();
  if (scene === 'shop') measureKeep();
  WD.warm?.();   // อยู่ในปราสาท: สร้างภาพทั้งชั้นใหม่ที่ขนาดจอใหม่ทีเดียว
}
window.addEventListener('resize', resize);
resize();

// ── ที่ที่ใช้งานได้ ────────────────────────────────────────────
/** ที่ที่ใช้งานได้ตอนนี้ — ต้องยืนบนพื้นระดับเดียวกับประตู (อยู่บนหลังคา/ของ = ใช้งานไม่ได้) */
/** ขอบจอในพิกัดโลกสำหรับป้าย "กด E" — เว้นขวาไว้ให้ปุ่มมุมขวาบน (ราว 84px จอ) ป้ายประตูปลายโลกจะไม่ตกขอบ/มุดใต้ปุ่ม */
function promptView() { const px = Math.min(2, window.devicePixelRatio || 1) / k; return [camX + 10 * px, camX + vw - 84 * px]; }

function nearPlace() {
  if (ride || !cat.P.onGround) return null;
  let best = null, bd = NEAR;
  for (const p of WD.places) {
    if (p.kind === 'deco' || p.tap || Math.abs(cat.y - (p.gy ?? GY)) > 3) continue;   // tap = แตะที่ตัวของเอง ไม่ขึ้นปุ่ม (โคมไฟชั้น 2)
    const d = Math.abs(cat.x - seatX(p, cat.x));
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
/**
 * จุดยืน/นั่งของที่นั้นที่ใกล้ x ที่สุด — ม้านั่งยาวในปราสาท (p.seats: หลายที่นั่ง ผู้ใช้ 7 พ.ย. นั่งด้วยกัน 3–4 คน)
 * เดินไปตรงไหนของม้านั่งก็นั่งช่องที่ใกล้สุด · ที่อื่น (ไม่มี seats) = ประตูจุดเดียวเหมือนเดิม
 * (ออนไลน์ทีหลัง: เซิร์ฟเวอร์จองช่องที่นั่ง ช่องที่มีคนนั่งแล้วข้ามไป)
 */
function seatX(p, x, taken = null) {
  const list = p.seats || [p.door];
  let best = null;
  for (const s of list) {
    if (taken?.some((t) => Math.abs(t - s) < 8)) continue;   // แมวตัวอื่นนั่งช่องนี้อยู่ (ออนไลน์)
    if (best == null || Math.abs(s - x) < Math.abs(best - x)) best = s;
  }
  return best;   // null = เต็มทุกช่อง
}
// ที่นั่งได้ (แตะซ้ำ = ลุก): ม้านั่ง/ตั่งในศาลา · ชิงช้า · กล่องกระดาษ
const SEAT = {
  bench: ['นั่งพัก', 'ลุกขึ้น'], swing: ['นั่งชิงช้า', 'ลงจากชิงช้า'], box: ['มุดกล่อง', 'ออกจากกล่อง'],
  cushion: ['นั่งเบาะ', 'ลุกขึ้น'], tent: ['นอนเล่นในเต็นท์', 'ออกจากเต็นท์'],   // ปราสาทชั้น 2
  bed: ['นอนบนเตียง', 'ลุกจากเตียง'],   // บ้านของฉัน
};
function actionLabel(p) {
  if (!p) return '';
  if (p.kind === 'shop') return 'เข้าร้าน';
  if (SEAT[p.kind]) return SEAT[p.kind][cat.sit === p ? 1 : 0];
  if (p.kind === 'lamp') return lampOn() ? 'ปิดไฟ' : 'เปิดไฟ';
  if (p.kind === 'record') return recordOn() ? 'หยุดเพลง' : 'เปิดเพลง';
  if (p.act) return p.act;   // ของในปราสาท (castle-hall.js) ตั้งคำบนปุ่มเอง
  if (p.kind === 'castle') return 'เข้าปราสาท';
  if (p.kind === 'pier') return boat.at === p.id ? 'ล่องเรือ' : boat.trip?.to === p ? 'เรือกำลังมา…' : 'เรียกเรือ';
  if (p.kind === 'gate') return p.to === 'garden' ? 'เข้าสวนดอกไม้' : 'กลับเมือง';
  if (p.kind === 'photo') return 'ถ่ายรูป';
  if (p.kind === 'pick') return heldFlower ? 'เปลี่ยนดอกไม้' : 'เก็บดอกไม้';
  return '';
}
function use(p) {
  if (!p) return;
  if (p.kind === 'shop') openShop(p);
  else if (SEAT[p.kind]) {
    if (cat.sit === p) cat.sit = null;
    else {
      const sx = seatX(p, cat.x, seatsTaken(p));
      if (sx == null) { toast('ที่นั่งตรงนี้มีเพื่อนนั่งเต็มแล้ว ไว้มาใหม่นะเหมียว'); return; }
      if (!cat.P.onGround) { cat.pending = p; return; }   // ลอยอยู่ = นั่งตอนลงถึงพื้น
      // นั่ง = เท้าอยู่ระดับพื้นของที่นั่งเสมอ (เดิมยืนบนเบาะ/เพิ่งลงจอดบนเบาะแล้วนั่ง = ลอยเหนือโซฟา)
      cat.y = cat.P.y = p.gy ?? GY; cat.on = null; cat.drop = null; cat.P.vy = 0; cat.P.jumps = 0;
      cat.sit = p; cat.x = sx; cat.target = null; stopEmote(true);
      if (softSeat(p)) softKick(9);   // นั่งลงบนเบาะนุ่มในปราสาท = ยุบลงแล้วเด้งดึ๋ง
      if (p.kind === 'box') { sfx('box'); setTimeout(() => sfx('purr'), 380); }
      else sfx('sit');
    }
  } else if (p.kind === 'castle') warp(HALL, H_SPAWN, 'ยินดีต้อนรับสู่ปราสาทแมวเหมียว · ชั้น 1 โซนต้อนรับ');
  else if (p.kind === 'pier') {
    if (boat.at === p.id) openRoute(p);
    else if (boat.trip?.to === p) toast('เรือกำลังพายมารับ รอแป๊บนะเหมียว');
    else callBoat(p);
  }
  else if (p.kind === 'gate') {
    if (p.to === 'garden') warp(GARDEN);
    else if (WD === HALL) warp(TOWN, placeById('castle').door, 'ออกมาหน้าปราสาทแมวเหมียว');
    else warp(TOWN);
  }
  else if (p.kind === 'counter') openMirror();   // เคาน์เตอร์ต้อนรับ = วาปไปที่ต่าง ๆ
  else if (p.kind === 'board') toast('ยินดีต้อนรับสู่ปราสาท! เร็ว ๆ นี้: เจอเพื่อนออนไลน์ · ห้องนั่งเล่นชั้น 2 · ดาดฟ้าชมดาวชั้น 3');
  else if (p.kind === 'mail') toast('ตู้จดหมายแมว · เร็ว ๆ นี้รับของขวัญและข้อความจากเพื่อนได้ที่นี่');
  else if (p.kind === 'members') toast('กระดานสมาชิกปราสาท · เร็ว ๆ นี้จะโชว์รายชื่อเพื่อนที่แวะมา');
  else if (p.kind === 'stairs') {
    if (p.to === 'lounge') warp(LOUNGE, L_SPAWN, 'ยินดีต้อนรับสู่ชั้น 2 · Cozy Lounge');
    else if (p.to === 'roof') warp(ROOF, R_SPAWN, 'ยินดีต้อนรับสู่ชั้น 3 · Starry Rooftop');
  }
  else if (p.kind === 'down') {
    if (WD === ROOF) warp(LOUNGE, L_STAIRS_X, 'ลงมาชั้น 2 · Cozy Lounge');
    else warp(HALL, H_STAIRS_X, 'ลงมาชั้น 1 · โถงต้อนรับ');
  }
  else if (p.kind === 'scope') startScope();
  else if (p.kind === 'wish') { if (wishBurstAt == null && wishToastAt == null) openWish(); }   // ดาวดวงก่อนยังลอยอยู่ = รอให้ถึงฟ้าก่อน
  else if (p.kind === 'photos') toast('กระดานภาพถ่าย · เร็ว ๆ นี้ติดรูปที่ถ่ายกับเพื่อนไว้ตรงนี้ได้');
  else if (p.kind === 'tea') beginAct('tea', p);
  else if (p.kind === 'snack') beginAct('snack', p);
  else if (p.kind === 'lamp') { const on = toggleLamp(tick); sfx(on ? 'lampOn' : 'lampOff'); sendLamp(on); }   // ออนไลน์: ทุกคนเห็น/ได้ยินด้วย
  else if (p.kind === 'photo') startPhoto(p);
  // บ้านของฉัน
  else if (p.kind === 'door') {
    if (p.to === 'nursery') warp(NURSERY, NURSE_SPAWN, 'ห้องเลี้ยงน้องแมวของฉัน');
    else if (p.to === 'home') warp(HOME, HOME_BACK_X, 'กลับมาห้องนอนของฉัน');
    else if (p.to === 'hall') warp(HALL, H_SPAWN, 'ออกมาโถงปราสาท · ชั้น 1');
  }
  else if (p.kind === 'ward') $('btnWard').click();   // ตู้เสื้อผ้า = ห้องแต่งตัวตัวเดียวกับปุ่มไม้แขวน
  else if (p.kind === 'record') { const on = toggleRecord(tick); sfx(on ? 'lampOn' : 'lampOff'); syncMusic(); }
  else if (p.kind === 'soon') toast(p.msg);
  else if (p.kind === 'feed') {   // มุมให้อาหาร ห้องเลี้ยงน้อง → หน้าเทอาหาร (ชาม 5 ใบ ใบละตัว · feed.js)
    paused = true;
    openFeed({ kits: kitsNow(), bowlCount: NURSE_SPOTS.bowls.length, toast, sfx, onPour: (id, food) => callToBowl(kitsNow(), id, food), onClose: () => { paused = false; } });
  }
  else if (p.kind === 'bath') {   // อ่างอาบน้ำ ห้องเลี้ยงน้อง → เลือกน้องที่จะพาไปอาบ (bath.js)
    paused = true;
    openBath({ kits: kitsNow(), toast, sfx, onBathe: (id) => callToTub(kitsNow(), id), onClose: () => { paused = false; } });
  }
  else if (p.kind === 'pick') pickFlower(p);
}

// ── ท่าใช้ของในปราสาทชั้น 2 (ผู้ใช้ 8 พ.ย. — castle-acts.js) ──
// จิบชา = ถือถ้วยจริง ยกจิบ หน้าอร่อย · ตู้ขนม = สุ่มขนมเด้งเข้ามือ กัดเคี้ยวน่ารัก · เดิน/กระโดด = เลิกท่าทันที
let act = null;
const U = 0.104 * SC;   // หน่วยไฟล์ออกแบบน้อง (cat2) → หน่วยโลก
function beginAct(kind, p) {
  if (act) return;
  stopEmote(true);
  cat.sit = null; cat.target = null; cat.pending = null; mark = null;
  cat.x = p.door; cat.still = 400; cat.face = 0;
  act = startAct(kind, kind === 'snack' ? randomSnack() : null);
  if (kind === 'tea') toast('จิบชานมอุ่น ๆ หอมกรุ่น ฟินจังเหมียว~');
  else { toast('ได้' + act.snack.name + '! น่ากินจังเลย'); sfx('pop'); }
}
/** จุดบนตัวน้อง (พิกัดโลก) — ปล่อยหัวใจ/ประกาย/เศษขนม */
const actAt = () => ({ top: { x: cat.x, y: cat.y - 600 * U }, head: { x: cat.x, y: cat.y - 390 * U }, mouth: { x: cat.x, y: cat.y - 312 * U }, chest: { x: cat.x, y: cat.y - 230 * U } });

// ── ขอพรกับดวงดาว ชั้น 3 (ผู้ใช้ 8 พ.ย.) ──
// แตะพระจันทร์ → หน้าต่างพิมพ์คำอธิษฐาน → ส่ง = ดาวพาคำอธิษฐานลอยขึ้นฟ้า แล้วฝนดาวตก (castle-roof.js) · ข้อความอยู่ในเครื่องนี้เท่านั้น ไม่ส่งไปไหน
const wishOv = $('wishOv'), wishText = $('wishText');
let wishBurstAt = null, wishToastAt = null;   // ดาวถึงฟ้า (เสียง) · ข้อความอวยพร (หลังประกายจางแล้ว ไม่ทับกัน)
function openWish() {
  paused = true;
  toggleEmotes(false); stopEmote(true);
  keys.left = keys.right = false; joyReset();
  wishText.value = '';
  paintWishCount();
  wishOv.classList.remove('hidden');
  sfx('click');
  if (desk) setTimeout(() => wishText.focus(), 60);
}
function closeWish() {
  if (wishOv.classList.contains('hidden')) return;
  wishOv.classList.add('hidden');
  wishText.blur();
  paused = false;
}
function paintWishCount() {
  const n = [...wishText.value].length;
  $('wishCount').textContent = n + '/60';
  $('wishSend').disabled = !wishText.value.trim();
}
function sendWish() {
  const text = wishText.value.trim();
  if (!text) return;
  closeWish();
  const rise = roofWishSend(text, tick);
  wishBurstAt = tick + rise;
  wishToastAt = tick + rise + 50;
  sfx('warp');   // ไม่ขึ้นข้อความตอนส่ง: ดาวพาคำอธิษฐานลอยขึ้นไปให้เห็นเองแล้ว (ข้อความด้านบนจะทับป้ายคำอธิษฐาน)
}
wishText.addEventListener('input', paintWishCount);
wishText.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendWish(); } });
$('wishSend').addEventListener('click', sendWish);
$('wishX').addEventListener('click', closeWish);
wishOv.addEventListener('click', (e) => { if (e.target === wishOv) closeWish(); });

// ── ส่องกล้องดูดาว ชั้น 3 (ผู้ใช้ 8 พ.ย. — castle-scope.js) ──
// ตัดฉากเข้าเลนส์กล้องรูปหัวแมว · ลาก/ลูกศรเลื่อนดู · ซูม (ล้อเมาส์ · ถ่างนิ้ว · ปุ่ม + −) · ปุ่มปิด / Esc = ออก
let scope = null;
const skeys = { left: false, right: false, up: false, down: false };
const scopePts = new Map();   // นิ้วที่แตะอยู่ (ถ่างนิ้วซูม)
function startScope() {
  if (scope) return;
  scope = openScope();
  paused = true;
  toggleEmotes(false); stopEmote(true);
  cat.target = null; cat.pending = null; mark = null;
  keys.left = keys.right = false; joyReset();
  document.body.classList.add('scope');
  $('scopeHint').textContent = desk ? 'ลากเมาส์หรือกดลูกศรเพื่อส่องไปรอบ ๆ · หมุนล้อเมาส์เพื่อซูม' : 'ลากนิ้วเพื่อส่องไปรอบ ๆ · ถ่างนิ้วหรือกด + − เพื่อซูม';
  $('scopeUi').classList.remove('hidden');
  sfx('scope');
}
function endScope() {
  if (!scope || scope.dir < 0) return;
  scope.dir = -1;
  scopePts.clear();
  $('scopeUi').classList.add('hidden');
  sfx('click');
}
$('scopeX').addEventListener('click', endScope);
$('scopeIn').addEventListener('click', () => { if (scope) { scopeZoom(scope, 1.25); sfx('click'); } });
$('scopeOut').addEventListener('click', () => { if (scope) { scopeZoom(scope, 1 / 1.25); sfx('click'); } });
const scopeXY = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * vw, ((e.clientY - r.top) / r.height) * H]; };
window.addEventListener('pointermove', (e) => {
  if (!scope || !scopePts.has(e.pointerId)) return;
  const [x, y] = scopeXY(e), [px, py] = scopePts.get(e.pointerId);
  if (scopePts.size >= 2) {
    const [a, b] = [...scopePts.entries()].filter(([id]) => id !== e.pointerId).map(([, v]) => v).concat([[px, py]]);
    const d0 = Math.hypot(b[0] - a[0], b[1] - a[1]), d1 = Math.hypot(x - a[0], y - a[1]);
    if (d0 > 10) scopeZoom(scope, d1 / d0);
  } else scopeDrag(scope, x - px, y - py);
  scopePts.set(e.pointerId, [x, y]);
});
const scopeUp = (e) => { scopePts.delete(e.pointerId); if (scope && !scopePts.size) scope.drag = null; };
window.addEventListener('pointerup', scopeUp);
window.addEventListener('pointercancel', scopeUp);
cv.addEventListener('wheel', (e) => { if (!scope) return; e.preventDefault(); scopeZoom(scope, e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });

// ── ดอกไม้ที่เก็บจากแปลงในสวน (ผู้ใช้ 31 ต.ค.) — flower.js ──
// สุ่มสี (ไม่ซ้ำดอกที่ถืออยู่) · ถือมือขวาจอ (คนละข้างกับคทาชุด S) · ถือออกไปเดินในเมืองได้
// เก็บไว้แค่ในหน้านี้ (ไม่บันทึก) — ออกจากหน้าเมืองแล้วเข้าใหม่ = มือว่าง · ดอกไม้โปรยกลีบ/ประกายร่วงเบา ๆ ค้างในฉาก
let heldFlower = null, moteT = -99;
function pickFlower(p) {
  heldFlower = randomFlower(heldFlower);
  pickBurst(p.door);
  sfx('pick', !!heldFlower.rare);
  toast('ได้ดอกไม้สี' + heldFlower.name + (heldFlower.rare ? ' หายากมาก!' : ''));
}
/** ช่องของที่ถือให้ตัววาดน้อง (drawCat2 idle.held) — ไม่ถืออะไร = ว่าง */
function heldOpt() {
  if (!heldFlower) return null;
  return { held: (c, k) => drawHeldFlower(c, k, heldFlower, tick, flowerEmit) };
}
/** หัวดอกอยู่ตรงไหนบนผ้าใบ (พิกเซล) → พิกัดโลก แล้วปล่อยกลีบ/ประกายทุก ~10 เฟรม (ไม่ถี่ ไม่รก) */
function flowerEmit(pt) {
  if (tick - moteT < 10 || paused) return;
  moteT = tick;
  spawnMote(pt.x / k + camX, pt.y / k - camY, heldFlower, tick);
}

// ── วาประหว่างเมือง ↔ สวนดอกไม้ ─────────────────────────────────
// ม่านแสงชมพูกลีบดอกหมุน (drawWarp) แทนม่านขาวของร้าน · ไปสวน = ยืนข้างซุ้มในสวน · กลับ = ยืนใต้ซุ้มในเมือง
let warping = false;
/** วาปไปโลก to · x = จุดยืนปลายทาง (ไม่ส่ง = สวน: ข้างซุ้ม · เมือง: ใต้ซุ้มสวน) · msg = ข้อความต้อนรับ */
function warp(to, x = null, msg = null) {
  if (fadeDir || (WD === to && x == null)) return;
  closeMirror(true);
  paused = true;
  warping = true;
  toggleEmotes(false);
  stopEmote(true);
  cat.sit = null; cat.target = null; cat.pending = null; mark = null; act = null;
  keys.left = keys.right = false;
  joyReset();
  sfx('warp');
  fadeDir = 1;
  fadeThen = () => {
    WD = to;
    document.body.dataset.w = to.id;
    if (to === HALL || to === LOUNGE || to === ROOF) myAura = performance.now();   // เข้าปราสาท/ขึ้นลงชั้น = ออร่า (คนอื่นเห็นจากเหตุการณ์ของห้อง)
    to.warm?.();   // ม่านปิดจอเต็มอยู่ — สร้างภาพทั้งชั้นตอนนี้ ไม่ให้สะดุดตอนเดิน
    const P = cat.P;
    cat.x = x ?? (to === GARDEN ? G_SPAWN : placeById('gardenGate').door);
    cat.y = GY; cat.on = null; cat.drop = null; cat.dir = 1;
    P.onGround = true; P.vy = 0; P.jumps = 0; P.y = GY;
    cat.A = createRunAnim();   // ประกายชุดของฉากเดิมไม่ตามข้ามโลก
    camX = Math.max(0, Math.min(WD.w - vw, cat.x - vw * 0.4));
    camY = 0;
    paused = false;
    fadeDir = -1;
    toast(msg ?? (to === GARDEN ? 'ยินดีต้อนรับสู่สวนดอกไม้ในฝัน' : 'กลับมาที่เมืองแมวเหมียว'));
    gardenSong?.stop();   // เข้าสวนทุกครั้งเริ่มเพลงฝันจากอินโทร
    syncMusic();
  };
}

// ── จุดถ่ายรูป (ซุ้มหัวใจในสวน) ───────────────────────────────────
// ผู้ใช้ 31 ต.ค.: ซ่อนปุ่มเกม → แถบถ่ายรูป (เลือกท่า · ตั้งเวลา ทันที/3/10 วิ · ปุ่มกล้อง) → นับถอยหลัง (ถ้าตั้ง)
//   → น้องเข้าท่าที่เลือก แฟลชตอนท่าเต็มที่ → กรอบรูปค้างให้แคปหน้าจอ · แตะ/กดปุ่ม = กลับมาเลือกใหม่ · ปุ่มปิด / Esc = ออก
const photoBar = $('photoBar');
let photoSec = 3;   // ตั้งเวลาที่เลือกไว้ล่าสุด (วินาที · 0 = ถ่ายทันที)
function startPhoto(p) {
  if (photo) return;
  photo = { p, phase: 'pose', t: 0, pose: emoteId(), wait: 0 };
  paused = true;
  toggleEmotes(false);
  cat.sit = null; cat.target = null; cat.pending = null; mark = null;
  keys.left = keys.right = false;
  joyReset();
  cat.x = p.door; cat.dir = 1;
  cat.still = 400;   // หันหน้าตรงมองกล้อง
  document.body.classList.add('photo');
  paintPhotoBar();
  photoBar.classList.remove('hidden', 'busy');
}
/** ชิปท่าทาง (ท่าเดียวกับแผงท่าทาง + "ยืนเฉย") · ตั้งเวลา */
function paintPhotoBar() {
  const box = $('phPoses');
  box.replaceChildren();
  for (const e of [{ id: '', name: 'ยืนเฉย', icon: '🐱' }, ...emoteList(townSkin().outfit)]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ph-pose' + ((photo.pose || '') === e.id ? ' on' : '');
    b.dataset.id = e.id;
    b.setAttribute('role', 'option');
    b.setAttribute('aria-selected', (photo.pose || '') === e.id ? 'true' : 'false');
    const i = document.createElement('i');
    i.textContent = e.icon;
    const n = document.createElement('span');
    n.textContent = e.kind === 'act' ? 'ท่าแอ็ค' : e.name;
    b.append(i, n);
    box.append(b);
  }
  for (const b of photoBar.querySelectorAll('.ph-timer button')) {
    const on = Number(b.dataset.sec) === photoSec;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  }
}
$('phPoses').addEventListener('click', (e) => {
  const b = e.target.closest('.ph-pose');
  if (!b || !photo || photo.phase !== 'pose') return;
  photo.pose = b.dataset.id || null;
  if (photo.pose) startEmote(photo.pose, townSkin().outfit, tick);   // ทำท่าให้ดูก่อนเลย
  else stopEmote();
  sfx('click');
  for (const x of $('phPoses').querySelectorAll('.ph-pose')) {
    const on = x === b;
    x.classList.toggle('on', on);
    x.setAttribute('aria-selected', on ? 'true' : 'false');
  }
});
for (const b of photoBar.querySelectorAll('.ph-timer button')) {
  b.addEventListener('click', () => { photoSec = Number(b.dataset.sec); sfx('click'); paintPhotoBar(); });
}
$('phCam').addEventListener('click', shutter);
$('photoX').addEventListener('click', endPhoto);
/** กดชัตเตอร์: ซ่อนแถบ → นับถอยหลัง (ถ้าตั้ง) → เข้าท่า → แฟลช */
function shutter() {
  if (!photo || photo.phase !== 'pose') return;
  photoBar.classList.add('busy');
  if (photoSec > 0) { photo.phase = 'count'; photo.t = 0; photo.lastS = 0; }
  else beginShoot();
}
function beginShoot() {
  photo.phase = 'shoot';
  photo.t = 0;
  const id = photo.pose;
  if (!id) { stopEmote(true); photo.wait = 4; return; }
  // ท่าค้างที่ทำอยู่แล้ว = ถ่ายได้เลย · ท่าขยับ = เริ่มใหม่ แฟลชตอนท่าเต็มที่
  if (emoteHolds(id) && emoteId() === id) photo.wait = 4;
  else { startEmote(id, townSkin().outfit, tick); photo.wait = emotePeak(id); }
}
function stepPhoto(dt) {
  photo.t += dt;
  if (photo.phase === 'count') {
    const s = Math.ceil((photoSec * 60 - photo.t) / 60);
    if (s !== photo.lastS && s > 0) { photo.lastS = s; sfx('tick'); }   // ติ๊ดทุกวินาทีที่นับ
    if (photo.t >= photoSec * 60) beginShoot();
  } else if (photo.phase === 'shoot' && photo.t >= photo.wait) {
    photo.phase = 'shot';
    photo.t = 0;
    sfx('shutter');
  }
}
/** หลังถ่าย: กลับมาหน้าเลือกท่า (ถ่ายใหม่ได้) */
function photoAgain() {
  photo.phase = 'pose';
  photo.t = 0;
  photoBar.classList.remove('busy');
  paintPhotoBar();
}
function endPhoto() {
  if (!photo) return;
  photo = null;
  paused = false;
  stopEmote();
  photoBar.classList.add('hidden');
  document.body.classList.remove('photo');
}
/** นับถอยหลัง · แฟลช · กรอบรูป · บอกวิธีถ่ายใหม่ (พิกัดจอ) */
function drawPhoto() {
  if (!photo) return;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  const t = photo.t;
  if (photo.phase === 'count') {
    const left = photoSec * 60 - t, n = Math.max(1, Math.ceil(left / 60)), u = 1 - ((left / 60) % 1 || 1);
    ctx.save();
    ctx.globalAlpha = 1 - u * 0.6;
    ctx.font = `700 ${Math.round(64 + (1 - u) * 18)}px Mali, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.strokeText(String(n), vw / 2, 70);
    ctx.fillStyle = '#FF7FAE';
    ctx.fillText(String(n), vw / 2, 70);
    ctx.restore();
    return;
  }
  if (photo.phase !== 'shot') return;
  drawPhotoFrameOverlay(ctx, vw, Math.min(1, t / 12));
  if (t < 24) { ctx.fillStyle = `rgba(255,255,255,${1 - t / 24})`; ctx.fillRect(0, 0, vw, H); }
  if (t > 90) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (t - 90) / 30) * (0.75 + 0.25 * Math.sin(tick * 0.08));
    ctx.font = '700 12px Mali, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(90,40,120,.55)';
    const msg = desk ? 'กดปุ่มใดก็ได้ เพื่อถ่ายใหม่' : 'แตะจอ เพื่อถ่ายใหม่';
    const w = ctx.measureText(msg).width + 24;
    ctx.beginPath(); ctx.roundRect(vw / 2 - w / 2, 26, w, 24, 12); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(msg, vw / 2, 38.5);
    ctx.restore();
  }
}

// ── ป้ายบอกเหนือหัว (วงรีขาว "นั่งพัก · กด E") ───────────────────────
// ผู้ใช้ 31 ต.ค.: นั่ง/ใช้อยู่แล้วไม่ขึ้น ("ลุกขึ้น" ดูที่ปุ่มชมพูพอ)
//   มือถือ: ขึ้นแค่ครั้งแรกที่เดินผ่านแต่ละที่ (จำในเครื่อง) — ต่อจากนั้นมีแค่ปุ่มชมพู · คอมขึ้นทุกครั้ง (บอกปุ่ม E)
const SEEN_KEY = 'meowTown.seenPrompts';
let seenPrompts = new Set();
try { seenPrompts = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { /* โหมดส่วนตัว */ }
let lastNear = null;
function markSeen(p) {
  if (seenPrompts.has(p.id)) return;
  seenPrompts.add(p.id);
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seenPrompts])); } catch { /* เก็บไม่ได้ก็แค่ขึ้นซ้ำ */ }
}
function bubbleFor(p) {
  if (!p || paused || cat.moving || cat.sit === p) return false;
  if (p.kind === 'wish' && (wishBurstAt != null || wishToastAt != null)) return false;   // ระหว่างดาวลอย: ไม่มีป้ายทับพระจันทร์
  return desk || !seenPrompts.has(p.id);
}

// ── เสียงชิงช้าตามจังหวะแกว่ง: ลมวูบตอนผ่านจุดต่ำสุด · เอี๊ยดเบา ๆ ตอนสุดทาง ──
let swPrev = 0, swPeak = 0, swUp = false;
function swingSound() {
  if (WD !== TOWN || cat.sit?.kind !== 'swing') { swPrev = 0; swPeak = 0; return; }
  const a = swingFrame().a, m = Math.abs(a);
  if (swPrev && Math.sign(a) !== Math.sign(swPrev) && swPeak > 0.05) { sfx('swing', Math.min(1, swPeak / 0.5)); swPeak = 0; }
  if (m > Math.abs(swPrev)) swUp = true;
  else if (swUp) { swUp = false; if (m > 0.1) sfx('squeak', Math.min(1, m / 0.5)); }
  swPeak = Math.max(swPeak, m);
  swPrev = a;
}

// ── เสียงน้ำพุ: ดังขึ้นตอนเดินเข้าใกล้ลานน้ำพุ เบาลงตอนเดินห่าง (ในร้าน/ในสวน = เงียบ) ──
const FOUNTAIN_X = placeById('fountain').door;
function fountainSound() {
  if (!sfxKit) return;
  const d = WD === TOWN && scene === 'town' ? Math.abs((ride ? ride.bx : cat.x) - FOUNTAIN_X)
    : WD === HALL && !scope ? Math.abs(cat.x - H_FOUNT_X) : 1e9;   // น้ำพุโถงปราสาทชั้น 1 (ผู้ใช้ 8 พ.ย.)
  sfxKit.play('fountain', Math.max(0, 1 - d / 560) ** 1.6);
  // ฝักบัวห้องเลี้ยง: ดังตามที่เปิดอยู่ × ระยะจากอ่าง (ไกลสุดยังได้ยินเบา ๆ)
  const T = NURSE_SPOTS.tub;
  sfxKit.play('shower', WD === NURSERY && T ? showerLevel() * (0.25 + 0.75 * Math.max(0, 1 - Math.abs(cat.x - T.x) / 700)) : 0);
}

// ── ยืนบนของ ──────────────────────────────────────────────────
const STEP = 10;   // ก้าวขึ้น/ลงต่างระดับไม่เกินเท่านี้ = เดินต่อ (ไม่ร่วง)
/** ผิวที่สูงที่สุดตรง x ที่อยู่ไม่เหนือเท้า (y) เกิน tol — ถนน/พื้นสะพานรองรับเสมอ */
function floorAt(x, y, tol) {
  return floorIn(WD, x, y, tol, cat.drop);
}
/**
 * เสียงเท้าตามพื้นที่ยืนอยู่ (ผู้ใช้ 8 พ.ย.): กระเบื้อง (โถงชั้น 1) · ไม้ (ชั้น 2 · สะพาน · ท่าเรือ · โต๊ะ/ตู้) · พรม (พรมใหญ่ชั้น 2)
 *   หิน (ดาดฟ้าชั้น 3 · ของหิน) · หญ้า (สวนดอกไม้) · นุ่ม (ม้านั่ง โซฟา เบาะ ชั้นคอนโด) · '' = เสียงเดิม (ถนนในเมือง)
 */
const PIERS = PLACES.filter((p) => p.kind === 'pier');
function stepKind() {
  const id = cat.on?.id || '';
  if (id) {
    if (/stairs/.test(id)) return 'rug';   // บันไดปูพรม
    if (/seat|back|cush|sofa|vb:|gazebo|condo|bench|swing|tulip|mush/.test(id)) return 'soft';
    if (/lTea|lSnack|sala|pier|crate|cart|box/.test(id)) return 'wood';
    return WD === TOWN || WD === GARDEN ? '' : 'stone';
  }
  if (WD === GARDEN) return 'grass';
  if (WD === HALL) return 'tile';
  if (WD === LOUNGE) return cat.x > 1192 && cat.x < 2030 ? 'rug' : 'wood';
  if (WD === ROOF) return 'stone';
  if (IN_HOME()) return homeRug(WD.id, cat.x) ? 'rug' : 'wood';
  if (cat.x > BRIDGE.x0 && cat.x < BRIDGE.x1) return 'wood';
  if (PIERS.some((p) => cat.x > p.x - 40 && cat.x < p.x + p.w + 40)) return 'wood';
  if (cat.x >= REALM.gate) return 'tile';   // ถนนหลวงปูกระเบื้องในดินแดนปราสาท
  if (Math.abs(cat.x - FOUNTAIN_X) < 262) return 'tile';
  return '';
}
let climbHint = false;
let wadeT = 0;   // นับเฟรมก้าวตอนเดินลุยน้ำในน้ำพุ
let stepT = 0, stepAlt = false;   // เสียงก้าวเท้าบนพื้น (ผู้ใช้ 1 พ.ย.) — นับเฟรม · เท้าซ้าย/ขวา

// ── ลูกแมวพายเรือคุยได้ (ผู้ใช้ 1 พ.ย.): ฟองก้อนเมฆเหนือหัวคนพาย ──
// เดินเข้าใกล้ท่าที่เรือจอด = ทักว่าพร้อมออกเรือ · ออกเรือ = พายโลด · ทางยาว = ใกล้ถึงแล้ว · ถึงที่ = บอกนัยของที่นั้น
// สุ่มจากหลายประโยค (ไม่ซ้ำประโยคล่าสุด) · ข้อความสั้นพอบรรทัดเดียว/สองบรรทัด (ตัดคำเองใน drawFerryTalk)
const FERRY_LINES = {
  greet: ['พร้อมออกเรือแล้วนะครับ~', 'จะไปไหนดีครับ กัปตันพร้อม!', 'ขึ้นเรือได้เลยครับ เหมียว~', 'วันนี้ลมดี ล่องเรือกันไหมครับ'],
  go: ['พายโลด~!', 'ออกเรือ! จับแน่น ๆ นะครับ', 'ฮุยเล ฮุยเล~', 'ไปกันเลยครับ!'],
  next: ['ไปต่อกันเลยครับ!', 'พายต่อ~ ฮึบ ๆ', 'จุดต่อไป ออกเรือ!'],
  near: ['อีกนิดเดียวก็ถึง{n}แล้วครับ', 'ใกล้ถึง{n}แล้วน้า~', 'เห็น{n}แล้วครับ!'],
  arrive: ['ถึงแล้วครับ ขอให้สนุกนะ~', 'มาส่งถึงที่แล้วครับ!'],
};
const FERRY_ARRIVE = {
  food: ['ร้านขนมหอมฟุ้งเลยครับ!', 'ซื้อขนมมาฝากผมด้วยน้า~'],
  care: ['ร้านยาครับ ดูแลน้อง ๆ ด้วยนะ', 'ระวังยาวิเศษ กินแล้วโตไวนะครับ'],
  home: ['โรงช่างครับ แต่งบ้านให้สวยเลย!', 'อยากได้คอนโดแมวสูง ๆ จังครับ'],
  pierA: ['ฝั่งร้านค้าครับ ช้อปให้สนุกนะ!', 'ถึงท่าเรือแล้วครับ ระวังก้าวนะ~'],
  fountain: ['ลานน้ำพุครับ ระวังเปียกนะ!', 'ไปเล่นน้ำพุกันเถอะครับ~'],
  swing: ['สนามเด็กเล่น! ชิงช้าสนุกมากครับ', 'ไปกระโดดแทรมโพลีนกันครับ!'],
  gardenGate: ['ซุ้มนี้พาไปสวนดอกไม้ในฝันครับ', 'สวนดอกไม้สวยมาก เก็บดอกไม้กันครับ'],
  toy: ['ร้านของเล่นครับ ของเล่นใหม่เพียบ!', 'ซื้อบอลมาเล่นด้วยกันนะครับ~'],
  exchange: ['ร้านแลกของรางวัลครับ ขอให้โชคดี!', 'เก็บค่าขนมเยอะ ๆ มาแลกนะครับ'],
  pierB: ['ฝั่งปราสาทครับ เที่ยวให้สนุกนะ!', 'ถึงท่าเรือแล้วครับ ปราสาทอยู่ทางขวา~'],
  castle: ['ปราสาทแมวเหมียวสวยมากเลยครับ', 'ระวังเจอเจ้าหญิงแมวนะครับ~'],
  sala: ['วิวบนศาลาสวยมากนะครับ', 'ขึ้นไปชมวิวบนหลังคาศาลาได้ด้วยนะ!'],
};
let ferryTalk = null;    // { text, t0, life }
let ferryLast = '';
let ferryNear = false;   // ยืนใกล้ท่าที่เรือจอดอยู่ (ทักครั้งเดียวต่อการเดินเข้ามา)
function pickLine(list) {
  const pool = list.length > 1 ? list.filter((s) => s !== ferryLast) : list;
  return (ferryLast = pool[Math.floor(Math.random() * pool.length)]);
}
function ferrySay(text, life = 230) { if (ferryTalkOn) ferryTalk = { text, t0: tick, life }; }
/** ทักตอนเดินเข้าใกล้เรือที่จอดรอ (เรียกทุกเฟรมจาก update) */
function ferryGreet() {
  // ใกล้ = ยืนแถวหน้าท่าที่เรือจอด หรือใกล้ตัวเรือ (เรือจอดเลยหัวท่าออกไป)
  const pier = boat.at && placeById(boat.at);
  const near = WD === TOWN && scene === 'town' && !ride && !!pier && (Math.abs(cat.x - pier.door) < 170 || Math.abs(cat.x - boat.x) < 190);
  if (near && !ferryNear) ferrySay(pickLine(FERRY_LINES.greet));
  ferryNear = near;
  if (ferryTalk && tick - ferryTalk.t0 > ferryTalk.life) ferryTalk = null;
}
/** ตัดเป็นสองบรรทัดที่ช่องว่าง (ความยาวใกล้กันที่สุด — ไม่ให้คำเดียวตกบรรทัด) ถ้าบรรทัดเดียวกว้างเกิน max */
function wrapTwo(c, text, max) {
  if (c.measureText(text).width <= max) return [text];
  let best = null;
  text.split(' ').forEach((_, i, w) => {
    if (i === 0) return;
    const a = w.slice(0, i).join(' '), b = w.slice(i).join(' ');
    const m = Math.max(c.measureText(a).width, c.measureText(b).width);
    if (!best || m < best.m) best = { m, l: [a, b] };
  });
  return best ? best.l : [text];
}
/** ฟองวงรีเหนือหัวคนพาย (ผู้ใช้ 1 พ.ย.: วงรีแทนก้อนเมฆ): ขอบม่วงพาสเทล ประกาย+หัวใจจิ๋ว · เด้งเข้า ลอยโยก จางหาย · หยดกลมสองดวงชี้ลงหาหัว */
function drawFerryTalk() {
  const ft = ferryTalk;
  if (!ft || WD !== TOWN || scene !== 'town') return;
  const age = tick - ft.t0, left = ft.life - age;
  if (left <= 0) return;
  const bx = ride ? ride.bx : boat.x, dir = ride ? ride.dir : boat.dir;
  const h = ferryHead(bx, dir, tick);
  if (h.x < camX - 200 || h.x > camX + vw + 200) return;
  const pop = age < 14 ? 0.6 + 0.4 * Math.sin((age / 14) * Math.PI * 0.62) / Math.sin(Math.PI * 0.62) * 1.0 : 1;
  const s = age < 14 ? pop + Math.sin((age / 14) * Math.PI) * 0.08 : 1;
  const a = Math.min(1, left / 20, age / 6);
  const c = ctx;
  c.setTransform(k, 0, 0, k, -camX * k, camY * k);
  c.save();
  c.font = '700 13px Mali, sans-serif';
  const lines = wrapTwo(c, ft.text, 170);
  const tw = Math.max(...lines.map((l) => c.measureText(l).width));
  const bw = tw * 1.12 + 32, bh = lines.length * 17 + 30;   // วงรีครอบมุมข้อความได้ (ปลายวงรีแคบ — กว้างกว่าข้อความ 12% + ขอบ)
  // ฟองอยู่ในจอเสมอ (เรือชิดขอบจอตอนส่งถึงที่) · หยดเมฆเล็กยังชี้ไปที่หัวคนพาย
  const cx = Math.max(camX + bw / 2 + 10, Math.min(camX + vw - bw / 2 - 10, h.x)), cy = h.y - 22 - bh / 2 + Math.sin(tick * 0.06) * 1.5;
  const tx = Math.max(-bw / 2 + 14, Math.min(bw / 2 - 14, h.x - cx));
  c.globalAlpha = a;
  c.translate(cx, cy + bh / 2);
  c.scale(s, s);
  c.translate(0, -bh / 2);
  // ฟองวงรี: เงานุ่ม → ขาว → ขอบม่วงพาสเทล · แสงวาวโค้งมุมบนซ้าย · ประกายกับหัวใจจิ๋วที่ขอบ
  const rx = bw / 2, ry = bh / 2;
  const oval = () => { c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); };
  c.save(); c.translate(0, 3); c.fillStyle = 'rgba(70,40,110,.16)'; oval(); c.fill(); c.restore();
  c.fillStyle = '#FFFFFF'; oval(); c.fill();
  c.strokeStyle = '#E3D2FA'; c.lineWidth = 2; oval(); c.stroke();
  c.strokeStyle = 'rgba(214,236,255,.9)'; c.lineWidth = 2.2; c.lineCap = 'round';
  c.beginPath(); c.ellipse(0, 0, rx - 6, ry - 5, 0, Math.PI * 1.08, Math.PI * 1.32); c.stroke();
  // หยดกลมสองดวงชี้ลงหาหัว (ขอบเดียวกับฟอง)
  for (const [px, py, r] of [[tx * 0.8, ry + 9, 5], [tx * 0.95, ry + 18, 3]]) {
    c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fillStyle = '#FFFFFF'; c.fill(); c.strokeStyle = '#E3D2FA'; c.lineWidth = 1.5; c.stroke();
  }
  // ประกายสี่แฉกทอง (มุมขวาบน กะพริบ) + หัวใจชมพูจิ๋ว (มุมซ้ายล่าง)
  const tw4 = 0.6 + 0.4 * Math.sin(tick * 0.12);
  const sx = rx * 0.78, sy = -ry * 0.78, sr = 5 * tw4;
  c.fillStyle = '#FFD45A';
  c.beginPath(); c.moveTo(sx, sy - sr); c.quadraticCurveTo(sx, sy, sx + sr, sy); c.quadraticCurveTo(sx, sy, sx, sy + sr); c.quadraticCurveTo(sx, sy, sx - sr, sy); c.quadraticCurveTo(sx, sy, sx, sy - sr); c.fill();
  const hx = -rx * 0.8, hy = ry * 0.62, hr = 3.6;
  c.fillStyle = '#FF9CC0';
  c.beginPath(); c.moveTo(hx, hy + hr * 0.9); c.bezierCurveTo(hx - hr * 1.45, hy - hr * 0.1, hx - hr * 0.65, hy - hr * 1.15, hx, hy - hr * 0.38); c.bezierCurveTo(hx + hr * 0.65, hy - hr * 1.15, hx + hr * 1.45, hy - hr * 0.1, hx, hy + hr * 0.9); c.fill();
  c.fillStyle = '#5A3E8A';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  lines.forEach((l, i) => c.fillText(l, 0, (i - (lines.length - 1) / 2) * 17 + 1));
  c.restore();
}
// เดินลอดซุ้มประตูเขตเข้าดินแดนปราสาท (ไปทางขวา) = ทักทาย · เว้น 1 นาทีกันขึ้นถี่ตอนเดินกลับไปมา
let realmX = null, realmT = -1e9;
function realmEnter() {
  const was = realmX;
  realmX = cat.x;
  if (was == null || ride || !(was < REALM.gate && cat.x >= REALM.gate) || tick - realmT < 3600) return;
  realmT = tick;
  toast('ยินดีต้อนรับสู่ดินแดนปราสาทแมวเหมียว');
  sfx('bell');
}
/** อ่างอาบน้ำห้องเลี้ยง (ผิว foam): ฟองใสกระเด็น + เสียงฟองแตกเบา ๆ คู่กับน้ำกระเซ็น */
function tubFoam(s, x, y, power) {
  if (!s?.foam) return;
  foamBurst(x, y, power, tick);
  setTimeout(() => sfx('bubblePop'), 70);
  if (power > 4) setTimeout(() => sfx('bubblePop'), 160);
}
function land(f) {
  const P = cat.P;
  cat.y = f.y;
  cat.drop = null;
  if (f.s?.bounce) {
    // แทรมโพลีน: เด้งขึ้นสูงทันที (กดกระโดดกลางอากาศต่อได้อีกครั้ง)
    P.vy = -f.s.bounce;
    P.jumps = 1;
    P.squash = CAT_ANIM.squash.jump;
    bump(f.s.id);
    sfx('trampoline');
    return;
  }
  const fall = P.vy;
  // ลงพื้นหลังกระโดดสองชั้น = ฝุ่นฟุ้งน่ารัก ๆ (ลงน้ำในน้ำพุมีน้ำกระเด็นแทน) · เสียงลงพื้นเดิม (ผู้ใช้ 31 ต.ค. ไม่เอาเสียงใหม่)
  if (P.jumps >= 2 && !f.s?.water) dustAt(cat.x, f.y, fall, tick);
  if (f.s?.squish) squish(f.s.id, fall);   // เห็ด/ทิวลิปนุ่มในสวน: ยุบแล้วเด้งดึ๋ง
  P.squash = CAT_ANIM.squash.land(P.vy);
  P.vy = 0;
  P.jumps = 0;
  P.onGround = true;
  cat.on = f.s;
  // เสียงลงจอด: เห็ด "บุ๋ง" · ทิวลิป "ปุ๊ง" · น้ำในน้ำพุ "จ๋อม" + น้ำกระเด็น · ที่อื่น "ตุ้บ"
  if (f.s?.soft) { condoBounce(f.s.id, fall); softKick(fall); sfx('mushroom', Math.max(3, fall * 0.7)); }   // คอนโด/เบาะ/โซฟานุ่ม: ยุบแล้วเด้ง "บุ๋ง"
  else if (f.s?.squish) sfx(f.s.id.startsWith('tulip') ? 'tulip' : 'mushroom', fall);
  else if (f.s?.water) { splashAt(cat.x, f.y, fall, tick); sfx('waterSplash', fall); tubFoam(f.s, cat.x, f.y, fall); }
  else sfx('land');
  if (f.s && !climbHint) {
    climbHint = true;
    toast(desk ? 'กด ↓ เพื่อลงจากที่สูง' : 'ลากจอยลง เพื่อลงจากที่สูง');
  }
}

// ── ล่องเรือ + จุดแวะ (ผู้ใช้ 31 ต.ค.) ─────────────────────────────
// ท่าเรือ → หน้าเลือกจุดแวะ (แตะเรียงตามลำดับ · BOAT_STOPS ใน layout.js) → กระโดดลงเรือ (board)
//   → แล่นไปทีละจุด (sail) → ถึงจุดแวะ: ระฆัง + ปุ่ม "ขึ้นฝั่งที่นี่ / ไปต่อ" (dock) · จุดสุดท้าย = ขึ้นฝั่งเลย (land)
//   เรือกลับลำได้ (จุดถัดไปอยู่อีกทาง) · กล้องตามเรือ · ระหว่างนั้นไม่รับปุ่มเดิน
const HOP = 26;   // เฟรมที่ใช้กระโดดลง/ขึ้นเรือ
const DOCK_GAP = 64;   // เรือจอดห่างจุดขึ้นฝั่งเท่านี้ (ฝั่งที่แล่นมา) — น้องกระโดดไปข้างหน้าขึ้นฝั่ง
// เรือลำเดียว: at = จอดอยู่ท่าไหน (null = กำลังพาย/มีคนนั่ง) · trip = พายเปล่าไปจอดท่า (เรียกเรือ / กลับท่าหลังส่งน้อง)
const boat = { at: 'pierA', x: mooredX(placeById('pierA')), dir: pierDir(placeById('pierA')), trip: null };
/** เรียกเรือมาท่านี้: เรือพายเปล่ามาจอด (เดินเล่นรอได้) */
function callBoat(p) {
  sailBoat(p);
  sfx('bell');
  toast('เรียกเรือแล้ว เรือกำลังพายมารับ');
}
/** wait = รอกี่เฟรมก่อนออก (ส่งน้องถึงที่แล้ว ค้างให้อ่านคำพูดลูกแมวก่อน — หันหัวเรือตอนออกจริง) */
function sailBoat(p, wait = 0) {
  const x1 = mooredX(p);
  boat.at = null;
  if (!wait) boat.dir = Math.sign(x1 - boat.x) || boat.dir;
  boat.trip = { to: p, x0: boat.x, x1, u: 0, wait, dur: Math.max(90, Math.abs(x1 - boat.x) / 9) };
}
/** เดินเรือเปล่า (ทุกเฟรม) — ถึงแล้วหันหัวเรือตามท่า */
function stepBoat(dt) {
  const tr = boat.trip;
  if (!tr) return;
  if (tr.wait > 0) {
    if ((tr.wait -= dt) <= 0) boat.dir = Math.sign(tr.x1 - boat.x) || boat.dir;
    return;
  }
  tr.u += dt;
  const k = Math.min(1, tr.u / tr.dur);
  boat.x = tr.x0 + (tr.x1 - tr.x0) * (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
  // เรือเปล่าพายมารับ: ได้ยินเสียงพายเมื่ออยู่ใกล้ (ดังตามระยะ)
  if ((tr.pt = (tr.pt || 0) + dt) >= 50) {
    tr.pt = 0;
    if (WD === TOWN && scene === 'town') sfx('paddle', 1 - Math.abs(boat.x - cat.x) / 700);
  }
  if (k >= 1) {
    boat.trip = null;
    boat.at = tr.to.id;
    boat.dir = pierDir(tr.to);
    if (WD === TOWN && Math.abs(boat.x - cat.x) < vw) sfx('bell');
  }
}
let routeFrom = null, routePick = [];
const routeOv = $('routeOv');
function openRoute(p) {
  if (fadeDir || ride) return;
  routeFrom = p;
  // เปิดใหม่ทุกครั้ง = ยังไม่เลือกจุดไหน (ผู้ใช้ 31 ต.ค. — ไม่เลือกท่าฝั่งตรงข้ามไว้ให้ก่อน) · ปุ่มออกเรือรอจนแตะเลือก
  routePick = [];
  paused = true;
  toggleEmotes(false);
  keys.left = keys.right = false;
  joyReset();
  rmFocus = BOAT_STOPS.find((s) => s.id === p.id) || null;
  routeOv.classList.remove('hidden');   // เปิดก่อน — วัดความสูงแผนที่ได้
  layoutRouteMap();
  paintRoute();
  const box = $('routeMap');
  box.scrollLeft = mapX(p.id) * rmScaleS - box.clientWidth / 2;   // เลื่อนให้ท่าที่ยืนอยู่อยู่กลาง
  rmEdges();
  if (!rmRaf) rmRaf = requestAnimationFrame(rmTick);
}
// ── แผนที่เมืองย่อส่วน (ผู้ใช้ 31 ต.ค. — แบบแผนที่สวนสนุก · route-map.js) ──
// ภาพนิ่งวาดครั้งเดียวต่อขนาด · ชั้นสด (เรือโยก เส้นทางเรือวิ่ง) วาดทุกเฟรมตอนเปิดอยู่ · ปุ่มจุดแวะเป็น HTML
// ท่าที่ยืนอยู่ = ป้ายฟ้า "อยู่ที่นี่" (เลือกไม่ได้) · แตะที่อื่น = เพิ่ม/เอาออกจากลำดับ + ช่องข้อมูลบอกว่าที่นั่นคือที่ไหน
let rmFocus = null, rmKey = 0, rmScaleS = 1, rmRaf = 0;
function layoutRouteMap() {
  const box = $('routeMap'), W = mapW();
  const s = Math.min(1.2, box.clientHeight / MAP_H), key = s * Math.min(2, window.devicePixelRatio || 1);
  rmScaleS = s;
  box.style.setProperty('--s', s);
  Object.assign($('rmSize').style, { width: W * s + 'px', height: MAP_H * s + 'px' });
  Object.assign($('rmInner').style, { width: W + 'px', height: MAP_H + 'px', transform: `scale(${s})` });
  if (!$('rmInner').querySelector('.rm-stop')) {
    for (const st of BOAT_STOPS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rm-stop';
      b.dataset.id = st.id;
      b.setAttribute('role', 'option');
      b.style.left = mapX(st.id) + 'px';
      const lab = document.createElement('span');
      lab.className = 'rm-lab';
      lab.textContent = st.name;
      b.append(lab);
      $('rmInner').append(b);
    }
  }
  if (Math.abs(key - rmKey) < 0.001) return;
  rmKey = key;
  for (const cv of [$('rmArt'), $('rmLive')]) {
    cv.width = Math.ceil(W * key); cv.height = Math.ceil(MAP_H * key);
    cv.style.width = W + 'px'; cv.style.height = MAP_H + 'px';
  }
  const g = $('rmArt').getContext('2d');
  g.setTransform(key, 0, 0, key, 0, 0);
  drawMapArt(g);
}
function rmTick(ts) {
  if (routeOv.classList.contains('hidden') || !routeFrom) { rmRaf = 0; return; }
  const g = $('rmLive').getContext('2d');
  g.setTransform(rmKey, 0, 0, rmKey, 0, 0);
  drawMapLive(g, routeFrom.id, routePick, ts);
  rmRaf = requestAnimationFrame(rmTick);
}
window.addEventListener('resize', () => { if (!routeOv.classList.contains('hidden')) { layoutRouteMap(); paintRoute(); } });
// คอม (ผู้ใช้ 31 ต.ค. "เลื่อนยาก"): ลูกกลิ้งเมาส์ = เลื่อนซ้าย-ขวา · คลิกค้างลาก · ปุ่มลูกศรขอบแผนที่ · ←/→ บนคีย์บอร์ด
// มือถือปัดนิ้วเหมือนเดิม (ลากด้วยนิ้วไม่ผ่านตัวนี้ — เบราว์เซอร์เลื่อนเอง)
/** ปุ่มลูกศรซ่อนเองเมื่อเลื่อนถึงสุดทาง */
function rmEdges() {
  const box = $('routeMap'), max = box.scrollWidth - box.clientWidth;
  $('rmLeft').classList.toggle('off', box.scrollLeft <= 2);
  $('rmRight').classList.toggle('off', box.scrollLeft >= max - 2);
}
/** เลื่อนแผนที่ไปทางซ้าย (−1) / ขวา (1) ทีละ 60% ของกรอบ */
function rmStep(d) { const box = $('routeMap'); box.scrollBy({ left: d * box.clientWidth * 0.6, behavior: 'smooth' }); }
{
  const box = $('routeMap');
  let drag = null, swallow = false;
  box.addEventListener('scroll', rmEdges, { passive: true });
  box.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;   // แทร็กแพดปัดแนวนอนเองอยู่แล้ว
    e.preventDefault();
    box.scrollLeft += e.deltaY * (e.deltaMode === 1 ? 32 : 1);
  }, { passive: false });
  box.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, s: box.scrollLeft, moved: false };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; box.classList.add('dragging'); }
    if (drag.moved) box.scrollLeft = drag.s - dx;
  });
  window.addEventListener('pointerup', () => {
    if (drag?.moved) swallow = true;   // ลากเสร็จ = ไม่นับเป็นการแตะเลือกจุดแวะ
    drag = null;
    box.classList.remove('dragging');
  });
  box.addEventListener('click', (e) => { if (swallow) { swallow = false; e.stopPropagation(); } }, true);
  $('rmLeft').addEventListener('click', () => rmStep(-1));
  $('rmRight').addEventListener('click', () => rmStep(1));
}
function paintRoute() {
  for (const b of $('rmInner').querySelectorAll('.rm-stop')) {
    const st = BOAT_STOPS.find((q) => q.id === b.dataset.id);
    const here = st.id === routeFrom.id, n = routePick.indexOf(st) + 1;
    b.classList.toggle('here', here);
    b.classList.toggle('on', !!n);
    b.disabled = false;
    b.setAttribute('aria-selected', n ? 'true' : 'false');
    b.setAttribute('aria-label', here ? 'อยู่ที่นี่ ' + st.name : st.name + (n ? ' ลำดับที่ ' + n : ''));
    let pin = b.querySelector('.rm-pin');
    if (n && !pin) { pin = document.createElement('span'); pin.className = 'rm-pin'; pin.append(document.createElement('b')); b.prepend(pin); }
    if (!n && pin) pin.remove();
    if (pin) pin.firstChild.textContent = n;
  }
  const f = rmFocus;
  $('rmIco').textContent = f ? f.icon : '🗺️';
  $('rmName').textContent = f ? (f.id === routeFrom.id ? 'อยู่ที่ ' : '') + f.name : 'แผนที่เมืองแมวเหมียว';
  $('rmDesc').textContent = f ? STOP_INFO[f.id] || '' : 'แตะสถานที่บนแผนที่เพื่อเลือกจุดแวะ';
  const last = routePick[routePick.length - 1];
  $('routeSum').textContent = routePick.length
    ? (routePick.length > 1 ? `แวะ ${routePick.length} จุด · จบที่ ${last.name}` : `ไป ${last.name}`)
    : 'แตะเลือกจุดที่อยากไปก่อนนะ';
  $('routeGo').disabled = !routePick.length;
}
$('routeMap').addEventListener('click', (e) => {
  const b = e.target.closest('.rm-stop');
  if (!b) return;
  const s = BOAT_STOPS.find((q) => q.id === b.dataset.id);
  rmFocus = s;
  if (s.id === routeFrom.id) { paintRoute(); return; }   // ท่าที่ยืนอยู่: ดูข้อมูลได้ เลือกไม่ได้
  const i = routePick.indexOf(s);
  if (i >= 0) routePick.splice(i, 1);   // แตะซ้ำ = เอาออก (ลำดับที่เหลือเลื่อนขึ้น)
  else routePick.push(s);
  sfx('click');
  paintRoute();
});
$('routeClear').addEventListener('click', () => { routePick = []; sfx('click'); paintRoute(); });
$('routeX').addEventListener('click', closeAll);
routeOv.addEventListener('click', (e) => { if (e.target === routeOv) closeAll(); });
$('routeGo').addEventListener('click', () => {
  if (!routePick.length) return;
  routeOv.classList.add('hidden');
  startRide(routeFrom, routePick.slice());
});
$('bsOff').addEventListener('click', () => dockChoice(false));
$('bsGo').addEventListener('click', () => dockChoice(true));

/** ตำแหน่งจอดเรือของจุดแวะ (ท่าเรือ = ข้างปลายท่า · ที่อื่น = ก่อนถึงจุดขึ้นฝั่งนิดหนึ่ง) */
function dockX(s, dir) {
  const x = s.pier ? mooredX(s.pier) : s.sides ? s.sides[dir > 0 ? 'L' : 'R'].dock : s.x - dir * DOCK_GAP;
  return Math.max(70, Math.min(TOWN_W - 70, x));
}
/** ออกแล่นไปจุดถัดไป (หันหัวเรือตามทาง) */
function legTo(r, s) {
  r.x0 = r.bx;
  r.dir = Math.sign(s.x - r.bx) || r.dir;
  r.x1 = dockX(s, r.dir);
  r.dur = Math.max(110, Math.abs(r.x1 - r.x0) / 13);
  r.u = 0;
  r.ph = 'sail';
  r.to = s.pier;
  r.side = r.dir > 0 ? 'L' : 'R';   // จุดแวะสองฝั่ง (ศาลาสะพาน): ขึ้นฝั่งด้านที่แล่นมา
  cat.dir = r.dir;
}
function startRide(from, route) {
  if (!route.length || fadeDir) return;
  const x0 = boat.x;
  boat.at = null;   // เรือลำเดียวออกไปพร้อมน้อง
  const dir = Math.sign(route[0].x - from.door) || 1;
  ride = { from, route, i: 0, to: null, dir, ph: 'board', u: 0, x0, x1: x0, bx: x0, dur: 1, pt: 0 };
  paused = true;
  toggleEmotes(false);
  stopEmote(true);
  cat.sit = null; cat.target = null; cat.pending = null; mark = null;
  keys.left = keys.right = false;
  joyReset();
  cat.dir = dir;
  document.body.classList.add('riding');
  sfx('jump');
  toast(route.length > 1 ? `ล่องเรือ แวะ ${route.length} จุด` : 'ล่องเรือไป' + route[0].name);
}
/** ถึงจุดแวะแล้วเลือก: ไปต่อ = จุดถัดไป · ไม่งั้นขึ้นฝั่งตรงนี้ */
function dockChoice(go) {
  const r = ride;
  if (!r || r.ph !== 'dock') return;
  $('boatStop').classList.add('hidden');
  if (go && r.i < r.route.length - 1) { r.i++; legTo(r, r.route[r.i]); sfx('splash'); ferrySay(pickLine(FERRY_LINES.next)); }
  else { r.ph = 'land'; r.u = 0; sfx('jump'); }
}
/** กระโดดเป็นโค้งจาก (ax,ay) ไป (bx,by) ตามสัดส่วน k — ใช้ท่ากระโดดของท่าวิ่ง */
function hop(ax, ay, bx, by, k) {
  cat.x = ax + (bx - ax) * k;
  cat.y = ay + (by - ay) * k - Math.sin(k * Math.PI) * 46;
  cat.P.onGround = false;
  cat.P.vy = k < 0.5 ? -6 : 6;
}
function stepRide(dt) {
  const r = ride, P = cat.P;
  r.u += dt;
  const seat = () => {
    const s = boatSeat(r.bx, r.dir);
    cat.x = s.x; cat.y = s.y;
    P.onGround = true; P.vy = 0;   // นั่งนิ่งในเรือ (ตัวคุมท่าไม่คิดว่ายังลอย/ร่วงอยู่)
  };
  if (r.ph === 'board') {
    const k = Math.min(1, r.u / HOP), s = boatSeat(r.x0, r.dir);
    hop(r.from.door, GY, s.x, s.y, k);
    if (k >= 1) { sfx('splash'); legTo(r, r.route[0]); ferrySay(pickLine(FERRY_LINES.go)); }
  } else if (r.ph === 'sail') {
    const k = Math.min(1, r.u / r.dur);
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    r.bx = r.x0 + (r.x1 - r.x0) * e;
    seat();
    if ((r.pt += dt) >= 50) { r.pt = 0; sfx('paddle'); }   // พายเป็นจังหวะ
    // ขาเดินทางยาว: กลางทางบอกว่าใกล้ถึงแล้ว (ถ้าคำพูดเดิมจบแล้ว)
    if (r.dur > 240 && !r.mid && k > 0.58 && !ferryTalk) { r.mid = true; ferrySay(pickLine(FERRY_LINES.near).replace('{n}', r.route[r.i].name)); }
    if (k >= 1) {
      const s = r.route[r.i];
      r.mid = false;
      ferrySay(pickLine(FERRY_ARRIVE[s.id] || FERRY_LINES.arrive), 300);
      if (r.i === r.route.length - 1) { r.ph = 'land'; r.u = 0; sfx('jump'); }
      else {
        r.ph = 'dock'; r.u = 0;
        sfx('bell');
        $('bsName').textContent = 'แวะ' + s.name;
        $('bsGo').textContent = 'ไปต่อ · ' + r.route[r.i + 1].name;
        $('boatStop').classList.remove('hidden');
      }
    }
  } else if (r.ph === 'dock') {
    seat();
  } else {
    const st = r.route[r.i], tx = st.pier ? st.pier.door : st.sides ? st.sides[r.side].land : st.x, ty = groundY(tx);
    const k = Math.min(1, r.u / HOP), s = boatSeat(r.bx, r.dir);
    hop(s.x, s.y, tx, ty, k);   // ขึ้นฝั่ง = พื้นจริงตรงนั้น (บนสะพาน = สูงตามเนิน)
    if (k >= 1) {
      ride = null;
      boat.x = r.bx; boat.dir = r.dir;
      if (st.pier) boat.at = st.pier.id;   // จอดค้างที่ท่านี้
      // ส่งถึงที่ (ไม่ใช่ท่าเรือ): ค้างอยู่ ~2.5 วิให้อ่านคำพูดลูกแมว (ผู้ใช้ 1 พ.ย.) แล้วค่อยพายกลับท่าใกล้สุด
      else sailBoat([placeById('pierA'), placeById('pierB')].sort((a, b) => Math.abs(mooredX(a) - r.bx) - Math.abs(mooredX(b) - r.bx))[0], 150);
      cat.x = tx; cat.y = ty; cat.on = null;
      P.onGround = true; P.vy = 0; P.jumps = 0; P.squash = CAT_ANIM.squash.land(6);
      sfx('land');
      paused = false;
      document.body.classList.remove('riding');
    }
  }
}
/** น้องนั่งในเรือ (พิกัดเรือ: กลางลำที่ระดับน้ำ) */
function drawPassenger(c) {
  c.save();
  if (ride.dir < 0) c.scale(-1, 1);
  const body = (g) => drawCat2(g, 14, -8, SC * 0.88, townSkin(), tick, { k: 1, shape: { sit: 1, turn: 0, noHang: 1 }, ...heldOpt() });
  // นั่งเรือ: แสงขอบ + เงาในตัว (ไม่มีเงาทอด — อยู่บนน้ำ) · ผู้ใช้ 16 พ.ย. "นั่งเรือแล้วแสงเงาหาย"
  const E = lightFxOn() ? sceneEnv() : null;
  if (E) drawWithRim(c, { x0: -90, x1: 120, y0: -130, y1: 8 }, body, { x: ride.bx + ride.dir * 14, y: RIVER_BOAT_Y - 40, lx: 14, ly: -40, neck: -42 }, { camX, camY, vw, H, ...E });
  else body(c);
  c.restore();
}
// คนพายเรือ (play.js): แสงขอบแบบเดียวกัน — ทั้งเรือที่จอดรอและเรือที่เรานั่ง
setBoatLit((c, fn, box, at) => {
  const E = lightFxOn() ? sceneEnv() : null;
  if (E) drawWithRim(c, box, fn, at, { camX, camY, vw, H, ...E }); else fn(c);
});

/** กระโดด — แรงของเมืองเอง (JUMP ใน layout.js) · ท่าตัวแบนจาก CAT_ANIM.squash · กดกลางอากาศได้อีกครั้ง = ชั้นสอง (ท่าตีลังกาของแต่ละน้องมาจากท่าวิ่ง) */
function jump() {
  if (paused) return;
  const P = cat.P;
  if (P.jumps >= 2) return;
  sfx(P.jumps === 0 ? 'jump' : 'doubleJump');
  P.vy = P.jumps === 0 ? JUMP.v1 : JUMP.v2;
  P.squash = P.jumps === 0 ? CAT_ANIM.squash.jump : CAT_ANIM.squash.double;
  P.jumps++;
  P.onGround = false;
  if (cat.on?.squish) squish(cat.on.id, 4);   // ดีดตัวจากของนุ่ม = ยุบนิดแล้วเด้งกลับ
  if (cat.on?.soft) { condoBounce(cat.on.id, 4); softKick(3); }
  if (cat.on?.water) { splashAt(cat.x, cat.y, 3, tick); sfx('waterStep'); tubFoam(cat.on, cat.x, cat.y, 3); }   // ถีบตัวขึ้นจากน้ำ = กระเซ็นเบา ๆ
  cat.on = null;
  cat.drop = null;
  cat.sit = null;
  act = null;
  stopEmote(true);
}

// ── อัปเดต ─────────────────────────────────────────────────────
function update(dt) {
  tick += dt;
  stepFade(dt);
  stepBoat(dt);
  fountainSound();
  ferryGreet();   // ลูกแมวพายเรือทัก/หมดเวลาฟองคำพูด
  if (ride) {
    stepRide(dt);
    cat.P.y = cat.y;   // จุดปล่อยประกายชุด S อิง P.y — ไม่ตั้ง = เม็ดเกิดค้างที่ท่าเรือ แล้ววาปตามมาตอนขึ้นฝั่ง
    cat.moving = false;
    stepPlay(dt, { x: cat.x, y: cat.y, dir: cat.dir, moving: false, speed: 0, onGround: false, swinging: false });
    follow(dt);
    return;
  }
  if (photo) stepPhoto(dt);
  if (scope && !scopeStep(scope, dt, skeys, lensOf(vw, H).R)) { scope = null; paused = false; document.body.classList.remove('scope'); }
  stepActFx(dt);
  stepSoft(dt);
  stepPeers(dt);   // แมวตัวอื่นในห้องออนไลน์เดินต่อแม้หน้าต่างเราเปิดอยู่
  if (wishBurstAt != null && tick >= wishBurstAt) { wishBurstAt = null; sfx('pick', true); }
  if (wishToastAt != null && tick >= wishToastAt) { wishToastAt = null; if (WD === ROOF) toast('🌠 ดาวตกรับคำอธิษฐานแล้ว ขอให้เป็นจริงนะเหมียว'); }
  let dir = 0;
  const xPrev = cat.x;   // ไล่ผิวทีละก้าวสั้นด้านล่าง
  if (!paused) {
    if (keys.left && !keys.right) dir = -1;
    else if (keys.right && !keys.left) dir = 1;
    else if (joyDir) dir = joyDir;
  }
  const sp = running ? RUN : WALK;
  if (dir) { cat.target = null; cat.pending = null; mark = null; }
  else if (cat.target != null) {
    const d = cat.target - cat.x;
    if (Math.abs(d) <= sp * dt) {
      cat.x = cat.target;
      cat.target = null;
      mark = null;
    } else dir = Math.sign(d);
  }
  // ถึงที่หมายแล้วค่อยใช้งาน — ยังลอยอยู่ (แตะที่นั่งระหว่างกระโดด) = รอจนเท้าแตะพื้นก่อน ไม่นั่งกลางอากาศ (ผู้ใช้ 15 พ.ย. 2026)
  if (!dir && cat.target == null && cat.pending && cat.P.onGround) { const p = cat.pending; cat.pending = null; use(p); }
  if (dir) {
    cat.sit = null;
    stopEmote(true);   // เดิน = เลิกทำท่า
    cat.dir = dir;
    cat.x = Math.max(40, Math.min(WD.w - 40, cat.x + dir * sp * dt));
    // จังหวะก้าวตามความเร็ว — วิ่งก้าวถี่ขึ้น (ท่าวิ่งสี่จังหวะของเกม)
    cat.P.runPhase += 0.408 * (sp / 6.8) * (sp === RUN ? 1.05 : 1.25) * dt;
  }
  cat.moving = !!dir;
  if (act && (dir || WD !== LOUNGE)) act = null;
  if (act && !stepAct(act, dt, { sfx, at: actAt })) act = null;
  // นอนในเต็นท์: zzz ลอยจากหัวทุก ~1.2 วิ
  if (lying(cat.sit) && Math.floor(tick / 72) !== Math.floor((tick - dt) / 72)) burst('z', cat.x + cat.dir * 70 * U, cat.y - (cat.sit.sitDy ?? 0) - 266 * U, 1);
  const P = cat.P;
  // ลงจากที่สูง (กด ↓ / ลากจอยลง) — ลงผ่านผิวที่ยืนอยู่ (ถนน/พื้นสะพานลงไม่ได้ · แทรมโพลีนไม่ต้อง)
  if (wantDrop) {
    wantDrop = false;
    if (P.onGround && cat.on && !paused) {
      cat.drop = cat.on;
      cat.on = null;
      cat.sit = null;
      stopEmote(true);
      P.onGround = false;
      P.vy = 1;
      P.jumps = 1;
    }
  }
  if (P.onGround) {
    // เดินตามผิว (เนินสะพาน / หลังคาเอียง / บันได) · เดินพ้นขอบ = ก้าวลงต่างระดับเล็ก ๆ หรือร่วง
    // ไล่ทีละไม่เกิน 4 หน่วย: เครื่องช้าเฟรมตก น้องก้าวไกลต่อเฟรม — ยังเกาะบันได/เนินได้ ไม่เดินลอดใต้บันได
    // ย้ายที่ไกล (วาร์ป/เข้าประตูกลางเฟรม) = ไม่ไล่ทีละก้าว
    const xEnd = cat.x, far = Math.abs(xEnd - xPrev) > 40, n = far ? 1 : Math.max(1, Math.ceil(Math.abs(xEnd - xPrev) / 4));
    for (let i = 1; i <= n && P.onGround; i++) {
      cat.x = far ? xEnd : xPrev + ((xEnd - xPrev) * i) / n;
      const y = cat.on ? surfY(cat.on, cat.x) : null;
      if (y != null) cat.y = y;
      else {
        const f = floorAt(cat.x, cat.y, STEP);
        if (f.y - cat.y <= STEP) { cat.y = f.y; cat.on = f.s; }
        else { P.onGround = false; P.vy = 0; P.jumps = 1; cat.on = null; cat.sit = null; }
      }
    }
    cat.x = xEnd;
  } else {
    // กระโดด/ร่วง: แรงโน้มถ่วงของเมือง · ผ่านผิวลงมา (ตอนตก) = ลงจอด ตัวแบนตามแรงตก
    const prevY = cat.y;
    P.vy += JUMP.gravity * dt;
    cat.y += P.vy * dt;
    if (cat.drop && cat.y > (surfY(cat.drop, cat.x) ?? -1e9) + 2) cat.drop = null;
    if (P.vy > 0) {
      const f = floorAt(cat.x, prevY, 0.5);
      if (cat.y >= f.y) land(f);
    }
  }
  P.squash += (0 - P.squash) * CAT_ANIM.squash.decay * dt;
  P.y = cat.y;
  WD.step?.(dt);   // ห้องแมว: น้องเดินเล่น
  if (WD === GARDEN) stepGarden(dt, cat);
  else {
    const ev = stepPlay(dt, { x: cat.x, y: cat.y, dir: cat.dir, moving: cat.moving, speed: sp, onGround: P.onGround, swinging: cat.sit?.kind === 'swing' });
    if (ev === 'kick') sfx('boop');
    swingSound();
    realmEnter();
  }
  // เดินลุยน้ำในอ่างน้ำพุ: กระเซ็นเบา ๆ ตามจังหวะก้าว
  if (cat.moving && P.onGround && cat.on?.water) {
    if ((wadeT += dt) >= 16) { wadeT = 0; splashAt(cat.x + cat.dir * 6, cat.y, 1.5, tick); sfx('waterStep'); tubFoam(cat.on, cat.x + cat.dir * 6, cat.y, 1.5); }
  } else wadeT = 12;   // เริ่มเดินในน้ำ = กระเซ็นก้าวแรกเร็ว
  // เสียงก้าวเท้าบนพื้น: ทุกครึ่งรอบก้าว (วิ่งถี่กว่าเดิน) สลับซ้ายขวา · ในน้ำใช้เสียงลุยน้ำข้างบนแทน
  if (cat.moving && P.onGround && !cat.on?.water && !ride && !paused) {
    if ((stepT += dt) >= (running ? 13 : 19)) { stepT = 0; stepAlt = !stepAlt; sfx('step', running, stepAlt, stepKind()); if (cat.on?.soft) softKick(running ? 0.9 : 0.6); }   // เดินบนเบาะนุ่ม = ยุบตามก้าว
  } else stepT = 12;   // เริ่มก้าว = ได้ยินก้าวแรกเร็ว
  // ยืนนิ่งเกิน 5 วิ = ค่อย ๆ หันหน้าตรงมองผู้เล่น (ผู้ใช้ 28 ต.ค.) · ขยับ/กระโดด = หันข้างตามทางเดินทันที
  // ผู้ใช้ 9 พ.ย.: ไม่หันหน้าตรงเองตอนยืนนิ่งแล้ว — หันข้างตามทางที่เดินค้างไว้ (ปุ่มหันหน้าตรงจะเพิ่มทีหลัง)
  //   หันตรงเฉพาะตอนที่ท่าต้องหันตรง (ถ่ายรูป / จิบชา / กินขนม / เพิ่งออกจากร้าน) แล้วค่อย ๆ กลับมาหันข้างเอง
  if (cat.moving || !P.onGround) { cat.still = 0; cat.face = 1; }
  else {
    cat.still += dt;
    cat.face += ((photo || act ? 0 : 1) - cat.face) * Math.min(1, 0.05 * dt);
  }
  // ท่าทาง (emotes.js): เดินท่า + เสียงร้อง + ของประกอบ ปล่อยจากตัวที่ยกขึ้นตามท่า
  const em = emotePose(tick);
  stepEmote(dt, emoteAnchors(cat.x, cat.y - emoteLift(em) * SC, SC));
  syncOnline();
  follow(dt);
}

/** กล้องตามตัว (น้องอยู่ราว 40% ของจอ · ตอนล่องเรือตามเรือ) เลื่อนนุ่ม · น้องขึ้นที่สูง = กล้องยกตามให้หัวยังอยู่ในจอ · ปุ่มใช้งาน */
function follow(dt) {
  // ยกน้องลากไปชิดขอบจอ = เลื่อนห้องตาม (ห้องเลี้ยงกว้างหลายจอ) · ระหว่างยก กล้องไม่ดึงกลับหาตัวเรา
  if (kd?.moved && WD === NURSERY) {
    const edge = 70, push = kd.sx < edge ? -(edge - kd.sx) : kd.sx > vw - edge ? kd.sx - (vw - edge) : 0;
    if (push) camX = Math.max(0, Math.min(WD.w - vw, camX + push * 0.15 * dt));
    return;
  }
  const fx = ride?.ph === 'sail' || ride?.ph === 'dock' ? ride.bx : cat.x;
  // ถ่ายรูป = จัดน้องกลางจอ (กลางซุ้มหัวใจ)
  const want = Math.max(0, Math.min(WD.w - vw, photo ? cat.x - vw / 2 : fx - vw * 0.4));
  camX += (want - camX) * Math.min(1, 0.12 * dt);
  const wantY = Math.max(0, 140 - cat.y);
  camY += (wantY - camY) * Math.min(1, 0.1 * dt);
  const p = nearPlace();
  if (lastNear && lastNear !== p) markSeen(lastNear);   // เดินพ้นที่นั้นแล้ว = เคยเห็นป้ายแล้ว
  lastNear = p;
  const act = $('btnAct');
  const lab = actionLabel(p);
  act.textContent = lab || 'ใช้งาน';
  act.classList.toggle('off', !lab || warping);   // กำลังวาป = ซ่อนปุ่มใช้งาน
}

// ── วาด ────────────────────────────────────────────────────────
/**
 * ประกาย/ของโปรยจากชุดระดับ S ค้างอยู่ในฉาก (ผู้ใช้ 28 ต.ค.: ไหลแล้วไหลเลย ไม่ตามน้องตอนกระโดด/หันกลับ)
 * ตัวคุมท่า (stepTrail ใน cat2-run.js) เก็บเม็ดเป็นพิกัด "สัมพัทธ์กับตัว" ในกรอบที่หันขวา — ในเกมฉากเลื่อนจึงลบความเร็วฉากออกเอง
 * ในเมืองตัวน้องเดินเองและกลับภาพตามทิศ: จำตำแหน่งโลก (wx) ของแต่ละเม็ดไว้ แล้วแปลงกลับเป็นพิกัดสัมพัทธ์ในกรอบปัจจุบันทุกเฟรม
 *   ก่อนเดินท่า: จำ x เดิม (_rx) · หลังเดินท่า: เม็ดใหม่ = ตั้ง wx จากตำแหน่งตัวตอนนี้ · เม็ดเก่า = บวกการลอยของเม็ดเอง · ตั้ง x ใหม่จาก wx
 */
function trailMark(A) {
  for (const p of A.parts || []) p._rx = p.x;
  for (const q of A.ribbon || []) q._rx = q[0];
}
function trailWorld(A, r, D, px = cat.x) {   // px = ตำแหน่งตัว (แมวตัวอื่นในห้องออนไลน์ส่งของตัวเอง)
  for (const p of A.parts || []) {
    if (p.wx == null) p.wx = px + D * p.x;
    else p.wx += D * (p.x - p._rx);
    p.x = (p.wx - px) * D;
  }
  for (const q of A.ribbon || []) {
    if (q.wx == null) q.wx = px + D * q[0];
    q[0] = (q.wx - px) * D;
  }
  if (r?.ribbon && A.ribbon) r.ribbon.pts = A.ribbon.map((q) => [q[0], q[1]]);
}

// ── ออนไลน์ในปราสาท (ผู้ใช้ 8 พ.ย. — online.js · เซิร์ฟเวอร์ realtime/) ──
// เห็นแมวของผู้เล่นคนอื่นในชั้นเดียวกัน: เดิน วิ่ง กระโดด นั่ง ทำท่า · ป้ายชื่อเหนือหัว
// ส่งเฉพาะตอนสถานะเปลี่ยน + ย้ำตำแหน่งทุก ~1.5 วิตอนเดิน/ลอย — เครื่องนี้เดินแมวตัวอื่นต่อเองด้วยความเร็ว/แรงโน้มถ่วง/ผิวพื้นชุดเดียวกับตัวเรา
// ได้ตำแหน่งใหม่ = เลื่อนเข้าหาเนียน ๆ (ox/oy ค่อย ๆ หด) ไม่วาร์ป
const peers = new Map();
const WORLD_OF = { hall: HALL, lounge: LOUNGE, roof: ROOF };
// ยังไม่ตั้งชื่อ = ชื่อชั่วคราว "เหมียว123" — จำไว้ในเครื่อง เปิดหน้าใหม่ชื่อเดิม (ไม่สุ่มใหม่ทุกครั้ง)
const guestName = (() => {
  const fresh = 'เหมียว' + (100 + Math.floor(Math.random() * 900));
  try {
    const n = localStorage.getItem('cookie-runner:guest-name');
    if (n) return n;
    localStorage.setItem('cookie-runner:guest-name', fresh);
  } catch { /* โหมดส่วนตัว */ }
  return fresh;
})();
function myName() { try { return localStorage.getItem('cookie-runner:name') || ''; } catch { return ''; } }
function netLook() {
  const s = townSkin();
  return { name: myName() || guestName, skin: s.id || 'orange', outfit: s.outfit?.id || 'none' };
}
function netState() {
  const P = cat.P;
  return {
    w: WD.id, x: Math.round(cat.x * 10) / 10, y: Math.round(cat.y * 10) / 10, dir: cat.dir,
    mv: cat.moving ? 1 : 0, run: running ? 1 : 0, air: P.onGround ? 0 : 1, vy: Math.round(P.vy * 100) / 100,
    on: cat.on?.id || '', sit: cat.sit?.id || '', em: emoteId() || '', ea: emoteAge(),
    j: P.onGround ? 0 : P.jumps, ac: myActivity(), aa: act ? Math.round(act.t) : 0,
  };
}
/** กิจกรรมตอนนี้ (คนอื่นเห็นป้ายเหนือหัว + ท่าจิบชา/กินขนมจริง) — snack ตามด้วยลำดับขนม คนอื่นเห็นขนมชิ้นเดียวกัน */
function myActivity() {
  if (act) return act.kind === 'snack' ? 'snack' + Math.max(0, SNACKS.indexOf(act.snack)) : 'tea';
  if (scope) return 'scope';
  if (!wishOv.classList.contains('hidden') || wishBurstAt != null) return 'wish';
  if (photo) return 'photo';
  if (chatOpen()) return 'chat';
  return '';
}
let netKey = '', netAt = -1e9, netDirty = false, lookKey = '', netLookAt = -1e9;
let myAura = WD === HALL || WD === LOUNGE || WD === ROOF ? performance.now() : 0;   // ออร่าของเราเอง (เข้าปราสาท/ขึ้นลงชั้น)
/** ทุกเฟรม: อยู่ในปราสาท = ต่อห้อง · สถานะเปลี่ยน = ส่ง (ห่างกันอย่างน้อย 3 เฟรม) · เดิน/ลอยอยู่ = ย้ำทุก 90 เฟรม */
function syncOnline() {
  if (!IN_CASTLE()) { leaveCastle(); paintOnline(); return; }
  joinCastle(() => ({ ...netLook(), ...netState() }));
  paintOnline();
  if (!online()) return;
  const P = cat.P;
  const key = [WD.id, cat.moving ? cat.dir : 0, cat.moving ? +running : 0, P.onGround ? 0 : 1, P.jumps, cat.on?.id || '', cat.sit?.id || '', emoteId() || '', myActivity()].join('|');
  if (key !== netKey) { netKey = key; netDirty = true; }
  if (!netDirty && (cat.moving || !P.onGround) && tick - netAt > 90) netDirty = true;
  if (netDirty && tick - netAt >= 3) { sendState(netState()); netAt = tick; netDirty = false; }
  if (tick - netLookAt > 60) {
    netLookAt = tick;
    const L = netLook(), lk = L.name + '|' + L.skin + '|' + L.outfit;
    if (lookKey && lk !== lookKey) sendLook(L);
    lookKey = lk;
  }
}
function newPeer(id) {
  return {
    id, name: 'เหมียว', skin: 'orange', outfit: 'none', skinObj: null, skinKey: '',
    w: 'hall', x: 0, y: GY, ox: 0, oy: 0, dir: 1, mv: 0, run: 0, air: false, vy: 0, on: null, sit: null,
    emId: null, emT0: 0, still: 0, face: 1, ac: '', act: null, aura: 0, tOff: peerTimeOffset(id),
    A: createRunAnim(), P: { onGround: true, jumps: 0, vy: 0, runPhase: 0, squash: 0, sliding: false, y: GY, fainting: false },
  };
}
/**
 * จังหวะท่าทางของแต่ละตัว (ผู้ใช้ 15 พ.ย. 2026: "ไม่ต้องขยับพร้อมกันทุกตัวในห้อง") — กะพริบตา อ้าปาก หูกระดิก หางแกว่ง
 * วาดด้วยนาฬิกา tick + ค่าเลื่อนของตัวนั้น (คิดจากรหัสผู้เล่น — ตัวเดิมได้ค่าเดิมเสมอ) · ตัวเราเลื่อน 0
 */
function peerTimeOffset(id) {
  let h = 2166136261;
  for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return 97 + ((h >>> 0) % 5000);
}
function setLook(q, l) { q.name = l.name || 'เหมียว'; q.skin = l.skin || 'orange'; q.outfit = l.outfit || 'none'; q.m = l.m ? 1 : 0; q.u = l.u || ''; }
function peerSkin(q) {
  const key = q.skin + '|' + q.outfit;
  if (q.skinKey !== key) { q.skinKey = key; q.skinObj = { ...skinById(q.skin), outfit: outfitById(q.outfit) }; }
  return q.skinObj;
}
function applyPeer(q, s, first = false) {
  const W = WORLD_OF[s.w] || HALL;
  const newFloor = !first && q.w !== s.w;
  // อยู่ชั้นเดิม เดินบนพื้นอยู่ = เก็บระยะต่างไว้เลื่อนเข้าหาเนียน ๆ · กระโดด/เปลี่ยนชั้น/ห่างมาก = ไปตำแหน่งใหม่เลย
  if (!first && !newFloor && !s.air && !q.air) { q.ox += q.x - s.x; q.oy += q.y - s.y; } else { q.ox = 0; q.oy = 0; }
  if (Math.abs(q.ox) > 160 || Math.abs(q.oy) > 160) { q.ox = 0; q.oy = 0; }
  if (newFloor) q.aura = performance.now();   // ขึ้น/ลงชั้นมาถึง = ออร่าเข้าห้อง
  const wasAir = q.air;
  q.w = s.w; q.x = s.x; q.y = s.y; q.dir = s.dir < 0 ? -1 : 1; q.mv = s.mv ? 1 : 0; q.run = s.run ? 1 : 0;
  q.air = !!s.air; q.vy = s.vy || 0;
  if (q.air && !wasAir) q.P.squash = CAT_ANIM.squash.jump;
  q.P.jumps = q.air ? Math.max(1, s.j || 1) : 0;   // 2 = กระโดดสองชั้น → ท่าวิ่งเล่นม้วนตัว/หมุนเองเหมือนเครื่องเขา
  q.on = s.on ? W.surfaces.find((o) => o.id === s.on) || null : null;
  q.sit = s.sit ? W.places.find((o) => o.id === s.sit) || null : null;
  // นั่งอยู่ = เท้าอยู่ระดับพื้นของที่นั่งเสมอ (ผู้ใช้ 15 พ.ย. 2026: เห็นเพื่อนนั่งลอยเหนือโซฟา — เครื่องเขาส่งความสูงตอนยังลอยอยู่)
  if (q.sit) { q.y = q.sit.gy ?? GY; q.oy = 0; q.air = false; q.vy = 0; q.on = null; }
  if (s.em) { if (q.emId !== s.em) { q.emId = s.em; q.emT0 = tick - (s.ea || 0); } } else q.emId = null;
  // กิจกรรม: จิบชา/กินขนม = เล่นท่าเดียวกันต่อจากจังหวะที่เขาอยู่ (aa เฟรม) · ขนมชิ้นเดียวกับของเขา
  const ac = s.ac || '';
  if (ac !== q.ac) {
    q.ac = ac;
    q.act = null;
    const m = /^(tea|snack)(\d*)$/.exec(ac);
    if (m) {
      q.act = startAct(m[1], m[1] === 'snack' ? SNACKS[+m[2]] || SNACKS[0] : null);
      for (const t = s.aa || 0; q.act.t < t;) stepAct(q.act, Math.min(4, t - q.act.t), FAR_ACT);
    }
  }
  q.P.onGround = !q.air; q.P.vy = q.vy;
}
const FAR = { x: -1e6, y: -1e6 };
const FAR_ACT = { sfx() {}, at: () => ({ top: FAR, head: FAR, mouth: FAR, chest: FAR }) };   // เดินท่าโดยไม่ปล่อยหัวใจ/ประกาย (แมวอยู่ชั้นอื่น / กรอท่าตามจังหวะ)
/** จุดบนตัวแมวตัวอื่น (พิกัดโลก) — หัวใจ/ประกาย/เศษขนมของท่าจิบชา/กินขนม */
const peerAt = (q) => { const x = q.x + q.ox, y = q.y + q.oy; return { top: { x, y: y - 600 * U }, head: { x, y: y - 390 * U }, mouth: { x, y: y - 312 * U }, chest: { x, y: y - 230 * U } }; };
/** ช่องที่แมวตัวอื่น (ชั้นนี้) นั่งอยู่ในที่ p — ให้ seatX ข้ามไป */
function seatsTaken(p) {
  let out = null;
  for (const q of peers.values()) if (q.w === WD.id && q.sit === p) (out ||= []).push(q.x);
  return out;
}
onlineHandlers({
  reset() { peers.clear(); chatReset(); paintChat(); },
  // แชต (chat.js): ข้อความที่ห้องส่งกลับมา — ของเราเองก็มาทางนี้ (ห้องไม่ให้ผ่าน = ไม่โผล่)
  say(m) {
    const me = onlineMe();
    if (me && m.id === me.id) chatReceive(m, { id: m.id, name: me.name || netLook().name, u: me.u, m: me.m, mine: true });
    else { const q = peers.get(m.id); if (q) chatReceive(m, { id: q.id, name: q.name, u: q.u, m: q.m }); }
  },
  sayno(why) { chatSayNo(why); },
  // ห้องบอกว่ามีคนนั่งช่องนี้ก่อน (กดพร้อมกัน) — ลุกขึ้นยืนหน้าที่นั่ง
  nosit(m) {
    if (cat.sit && cat.sit.id === m.sit && WD.id === m.w) { cat.sit = null; toast('เพื่อนนั่งช่องนี้ก่อนแล้ว ลองช่องอื่นนะเหมียว'); }
  },
  join(p, isNew) { const q = newPeer(p.id); setLook(q, p); applyPeer(q, p, true); if (isNew) q.aura = performance.now(); peers.set(p.id, q); },
  // โคมไฟชั้น 2 ของห้อง: เพิ่งเข้าห้อง = ตั้งเงียบ ๆ · มีคนกด = ไฟกะพริบ/หรี่ + เสียง (ถ้าเราอยู่ชั้น 2)
  room(r) { if (typeof r.lamp === 'boolean') setLamp(r.lamp); },
  full(c) { toast(`ห้อง ${c} เต็มแล้ว (20 ตัว) พาไปห้องสุ่มแทนนะเหมียว`); },
  lamp(m) { if (setLamp(m.on, tick) && WD === LOUNGE) sfx(m.on ? 'lampOn' : 'lampOff'); },
  state(id, st) { const q = peers.get(id); if (q) applyPeer(q, st); },
  look(id, l) { const q = peers.get(id); if (q) setLook(q, l); },
  leave(id) { peers.delete(id); },
});
/** พื้นใต้จุด x ในโลก W (สูตรเดียวกับ floorAt ของตัวเรา) */
function floorIn(W, x, y, tol, drop = null) {
  let best = null, by = W.ground(x);
  for (const s of W.surfaces) {
    if (s === drop || x < s.x0 || x > s.x1) continue;
    const sy = surfY(s, x);
    if (sy >= y - tol && sy < by) { by = sy; best = s; }
  }
  return { s: best, y: by };
}
/** เดินแมวตัวอื่นต่อเองทุกเฟรม — ความเร็วเดิน/วิ่ง แรงโน้มถ่วง ผิวพื้น ชุดเดียวกับตัวเรา */
function stepPeers(dt) {
  const fade = Math.pow(0.86, dt);
  for (const q of peers.values()) {
    const W = WORLD_OF[q.w];
    if (!W) continue;
    const P = q.P;
    if (!q.sit) {
      const sp = q.run ? RUN : WALK, x0 = q.x;
      const x1 = q.mv ? Math.max(40, Math.min(W.w - 40, q.x + q.dir * sp * dt)) : q.x;
      if (q.mv) P.runPhase += 0.408 * (sp / 6.8) * (sp === RUN ? 1.05 : 1.25) * dt;
      if (q.air) {
        q.x = x1;
        const prevY = q.y;
        q.vy += JUMP.gravity * dt;
        q.y += q.vy * dt;
        if (q.vy > 0) {
          const f = floorIn(W, q.x, prevY, 0.5);
          if (q.y >= f.y) { P.squash = CAT_ANIM.squash.land(q.vy); q.y = f.y; q.on = f.s; q.air = false; q.vy = 0; P.jumps = 0; }
        }
      } else {
        const n = Math.max(1, Math.ceil(Math.abs(x1 - x0) / 4));
        for (let i = 1; i <= n && !q.air; i++) {
          q.x = x0 + ((x1 - x0) * i) / n;
          const y = q.on ? surfY(q.on, q.x) : null;
          if (y != null) q.y = y;
          else {
            const f = floorIn(W, q.x, q.y, STEP);
            if (f.y - q.y <= STEP) { q.y = f.y; q.on = f.s; } else { q.air = true; q.vy = 0; q.on = null; P.jumps = 1; }
          }
        }
        q.x = x1;
      }
      P.onGround = !q.air; P.vy = q.vy;
    }
    // ท่าจิบชา/กินขนมของเขา — อยู่ชั้นเดียวกัน = ปล่อยหัวใจ/ประกาย/เศษขนมให้เห็นด้วย (ไม่มีเสียง ไม่รบกวนเรา)
    if (q.act && !stepAct(q.act, dt, q.w === WD.id ? { sfx() {}, at: () => peerAt(q) } : FAR_ACT)) q.act = null;
    P.squash += (0 - P.squash) * CAT_ANIM.squash.decay * dt;
    q.ox *= fade; q.oy *= fade;
    // ไม่หันหน้าตรงเอง (ผู้ใช้ 9 พ.ย.) — ท่าจิบชา/กินขนมหันตรง แล้วค่อย ๆ กลับมาหันข้าง
    if (q.mv || q.air) { q.still = 0; q.face = 1; }
    else { q.still += dt; q.face += ((q.act ? 0 : 1) - q.face) * Math.min(1, 0.05 * dt); }
  }
}
/**
 * แมวตัวอื่นที่อยู่ชั้นนี้ในจอ — ลำดับบังกันเหมือนกันทุกจอ (ผู้ใช้ 15 พ.ย. 2026: จอเราเห็นเราบังเพื่อน จอเพื่อนต้องเห็นแบบเดียวกัน)
 *   กติกาเดียวทุกเครื่อง: เท้าอยู่ลึกกว่า (y น้อย) อยู่หลัง · ระดับเดียวกัน = รหัสผู้เล่นน้อยกว่าอยู่หลัง
 *   front = false → ตัวที่อยู่หลังตัวเรา (วาดก่อนตัวเรา) · true → ตัวที่อยู่หน้าตัวเรา (วาดหลังตัวเรา) · ยังไม่ต่อห้อง = อยู่หลังทั้งหมดแบบเดิม
 */
function peerInFront(q) {
  const me = onlineMe()?.id;
  if (!me) return false;
  const qy = q.y + q.oy;
  if (Math.abs(qy - cat.y) > 2) return qy > cat.y;
  return q.id > me;
}
function drawPeers(c, front = false) {
  const list = [];
  for (const q of peers.values()) if (q.w === WD.id && peerInFront(q) === front) list.push(q);
  list.sort((a, b) => (a.y + a.oy) - (b.y + b.oy) || (a.id < b.id ? -1 : 1));
  for (const q of list) {
    const x = q.x + q.ox;
    if (x < camX - 90 || x > camX + vw + 90) continue;
    drawPeer(c, q);
  }
}
/** ตัวแมวผู้เล่นอื่น (ไม่รวมเงาพื้น/ป้าย) — คืนตำแหน่งหัวสำหรับป้ายชื่อ */
function peerBody(c, q, skin, P, x, y, D) {
  c.save();
  // บนบันได: ตัดตามโครงขั้นแบบตัวเรา (ขาไม่ทะลุขั้น)
  if (!q.air && q.on && /stairs/.test(q.on.id)) {
    const p = new Path2D(), xL = x - 90, xR = x + 90;
    p.moveTo(xL, y - 400); p.lineTo(xR, y - 400);
    stairsProfilePath(p, STAIRS_X0(q.on), xL, xR, 1.5);
    p.closePath();
    c.clip(p);
  }
  let head = y - 122;
  P.y = y;   // stepRunAnim ปล่อยเม็ดที่ P.y + ระยะจากตัว — ไม่ตั้ง = เม็ด/เส้นหางคทาของเพื่อนเกิดที่ระดับพื้นตอนเขากระโดด (ผู้ใช้ 15 พ.ย. 2026)
  const T = tick + q.tOff;   // จังหวะท่าของตัวนี้เอง
  // ประกาย/ของโปรยชุดระดับ S (TRAIL) แบบเดียวกับตัวเรา — ค้างในฉากตามจุดที่เขาเดินผ่าน
  if (q.mv || q.air || P.squash > 0.05) {
    trailMark(q.A);
    const r = stepRunAnim(q.A, P, { catId: skin.id, dt: 1, outfit: skin.outfit?.id, speed: 0, scale: SC, stand: !q.mv });
    trailWorld(q.A, r, D, x);
    if (D < 0) { c.translate(2 * x, 0); c.scale(-1, 1); }
    drawCat2Run(c, x, y, SC, skin, T, r, null);
  } else {
    let trail = null;
    if (q.A.parts?.length || q.A.ribbon?.length) {
      trailMark(q.A);
      trail = stepRunAnim(q.A, P, { catId: skin.id, dt: 1, outfit: skin.outfit?.id, speed: 0, scale: SC, dead: true });
      trailWorld(q.A, trail, D, x);
    } else q.A = createRunAnim();
    if (D < 0) { c.translate(2 * x, 0); c.scale(-1, 1); }
    if (trail && (trail.parts || trail.ribbon)) drawTrail(c, trail.parts, x, SC, trail.ribbon);
    const pose = q.emId && !q.sit && !q.act ? emoteShapeAt(q.emId, skin.outfit, tick - q.emT0, T) : null;
    if (q.sit) {
      const sy = y - (q.sit.sitDy ?? 22);
      head = sy - 104;
      drawCat2(c, x, sy, SC, skin, T, { k: 1, shape: q.sit.kind === 'tent' ? { loaf: 1, shut: 1, noHang: 1 } : { sit: 1, turn: 0, noHang: 1 } });
    } else if (q.act) {
      const ap = actPose(q.act, tick);   // จิบชา/กินขนม ท่าเดียวกับเครื่องเขา
      drawCat2(c, x, y, SC, skin, T, { k: ap.k, shape: ap.shape, holdDraw: ap.holdDraw, holdBehind: ap.holdBehind });
    } else if (pose) {
      const ly = emoteLift(pose) * SC;
      head -= ly;
      drawCat2(c, x, y - ly, SC, skin, T, { k: pose.k, shape: { ...pose.shape, noHang: 9 } });
    } else drawCat2(c, x, y, SC, skin, T, { k: 1, shape: { turn: RUN_TURN * 0.6 * q.face, noHang: 1, armFar: 1 } });
  }
  c.restore();
  return head;
}
function drawPeer(c, q) {
  const skin = peerSkin(q), P = q.P, W = WORLD_OF[q.w], x = q.x + q.ox, y = q.y + q.oy, D = q.dir < 0 ? -1 : 1;
  if (q.aura && !drawAura(c, x, y, q.aura)) q.aura = 0;   // เพิ่งเข้าปราสาท/ขึ้นลงชั้น (ชั้นหลัง)
  const floor = q.air ? floorIn(W, x, y, 0.5).y : y;
  const up = Math.min(1, Math.max(0, floor - y) / 160);
  // แสง/เงาของฉาก (rim-light.js): เงาทอดแบบใหม่เปิดอยู่ = ไม่วาดวงรีเดิม (ไม่ซ้อนกัน)
  const lit = lightFxOn() && q.sit?.kind !== 'tent' ? sceneEnv() : null;
  if (q.sit?.kind !== 'tent' && !(lit && castOn())) {
    c.save();
    c.globalAlpha = 0.22 * (1 - up * 0.6);
    c.fillStyle = '#4A2A5A';
    const sw = 1 - up * 0.45;
    c.beginPath(); c.ellipse(x, floor + 3, 26 * SC / 1.4 * sw, 5.5 * sw, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  let head;
  if (lit) {
    const box = { x0: x - 95 * SC, x1: x + 95 * SC, y0: y - 140 * SC, y1: y + 16 * SC };
    drawWithRim(c, box, (g) => { head = peerBody(g, q, skin, P, x, y, D); }, { x, y: y - 30 * SC, neck: y - 25 * SC, floor, feet: y, surf: surfClip(q.air ? floorIn(W, x, y, 0.5).s : q.on, floor, W.ground(x)) }, { camX, camY, vw, H, ...lit });
  } else head = peerBody(c, q, skin, P, x, y, D);
  if (q.aura) drawAura(c, x, y, q.aura, true);   // ออร่าชั้นหน้า: วงแสง + ดาวลอยรอบตัว
  if (q.act?.kind === 'snack' && q.w === 'lounge') drawSnackFlight(c, q.act, SNACK_POP, { x, y: y - 236 * U }, U * 1.3, tick);
  nameTag(c, x, head, q.name, q.m);
  // ป้ายกิจกรรมเหนือป้ายชื่อ (ผู้ใช้ 9 พ.ย.) · ฟองแชตอยู่เหนือสุด
  const st = peerStatus(q);
  let top = head - 13;
  if (st) { statusTag(c, x, head - 21, st); top = head - 33; }
  const b = bubbleOf(q.id);
  if (b) drawBubble(c, x, top, b);
}
const STATUS = { tea: 'กำลังจิบชา', snack: 'กำลังกินขนม', scope: 'กำลังส่องกล้องดูดาว', wish: 'กำลังขอพรดาวตก', photo: 'กำลังถ่ายรูป', chat: 'กำลังแชต' };
function peerStatus(q) {
  const k = (q.ac || '').replace(/\d+$/, '');
  if (STATUS[k]) return STATUS[k];
  if (q.sit?.kind === 'tent') return 'นอนพักในเต็นท์';
  return '';
}
/** ป้ายกิจกรรมเม็ดชมพูอ่อน จุดชมพูเต้น + จุดไข่ปลาวิ่ง "กำลังจิบชา..." */
function statusTag(c, x, y, text) {
  const now = performance.now(), dots = '.'.repeat(1 + (Math.floor(now / 420) % 3));
  c.save();
  c.font = '700 10px Mali, sans-serif';
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  const w = c.measureText(text + '...').width + 24;
  c.fillStyle = 'rgba(255,241,249,.94)';
  c.beginPath(); c.roundRect(x - w / 2, y - 8.5, w, 17, 8.5); c.fill();
  c.fillStyle = '#FF8FB8';
  c.beginPath(); c.arc(x - w / 2 + 9.5, y, 2.6 + Math.sin(now * 0.008) * 0.6, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#7A4BB8';
  c.fillText(text + dots, x - w / 2 + 16, y + 0.5);
  c.restore();
}
/**
 * ออร่าตอนเพิ่งเข้าปราสาท/ขึ้นลงชั้น (ผู้ใช้ 9 พ.ย.) ค้างราว 2.6 วิ
 *   ชั้นหลัง (front = false วาดก่อนตัว): แสงนวลทองชมพูรอบตัว + ลำแสงพุ่งขึ้นจากเท้า
 *   ชั้นหน้า (front = true วาดหลังตัว): วงแสงกระจายที่เท้า + ดาวระยิบลอยขึ้นรอบตัว
 *   คืน false = หมดเวลาแล้ว
 */
const AURA_MS = 2600;
function drawAura(c, x, y, t0, front = false) {
  const age = performance.now() - t0;
  if (age > AURA_MS) return false;
  const u = age / AURA_MS, a = Math.min(1, age / 220) * (1 - Math.max(0, (u - 0.6) / 0.4));
  c.save();
  if (!front) {
    const cy = y - 60, R = 92 + Math.sin(age * 0.006) * 5;
    const g = c.createRadialGradient(x, cy, 6, x, cy, R);
    g.addColorStop(0, `rgba(255,250,226,${(0.85 * a).toFixed(3)})`);
    g.addColorStop(0.4, `rgba(255,182,220,${(0.5 * a).toFixed(3)})`);
    g.addColorStop(1, 'rgba(196,160,255,0)');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(x, cy, R * 0.8, R, 0, 0, Math.PI * 2); c.fill();
    // ลำแสงพุ่งขึ้นจากเท้า (กว้างตรงเท้า จางขึ้นไปข้างบน)
    const h = 190 * Math.min(1, age / 500);
    const col = c.createLinearGradient(0, y, 0, y - h);
    col.addColorStop(0, `rgba(255,236,190,${(0.55 * a).toFixed(3)})`);
    col.addColorStop(1, 'rgba(255,214,240,0)');
    c.fillStyle = col;
    c.beginPath(); c.moveTo(x - 40, y + 2); c.lineTo(x - 22, y - h); c.lineTo(x + 22, y - h); c.lineTo(x + 40, y + 2); c.closePath(); c.fill();
  } else {
    if (age < 1100) {
      const v = age / 1100;
      c.globalAlpha = (1 - v) * 0.9;
      c.strokeStyle = '#FFE7A0';
      c.lineWidth = 3.4 * (1 - v) + 0.6;
      c.beginPath(); c.ellipse(x, y + 1, 18 + v * 70, 4.5 + v * 16, 0, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = '#FFB3D2';
      c.lineWidth = 2 * (1 - v) + 0.4;
      c.beginPath(); c.ellipse(x, y + 1, 10 + v * 46, 2.5 + v * 10, 0, 0, Math.PI * 2); c.stroke();
    }
    for (let i = 0; i < 14; i++) {
      const ph = (i * 0.29 + age / 1200) % 1;
      const side = i % 2 ? 1 : -1;
      const sx = x + side * (20 + (i % 4) * 9) + Math.sin(i * 2.1 + age * 0.003) * 6, sy = y - 8 - ph * 140;
      c.globalAlpha = a * Math.sin(ph * Math.PI);
      c.fillStyle = i % 3 === 0 ? '#FFFFFF' : i % 3 === 1 ? '#FFE48A' : '#FFB3D2';
      star(c, sx, sy, 3.2 + (i % 3) * 1.2, age * 0.004 + i); c.fill();
    }
  }
  c.restore();
  return true;
}
/** ฟองแชตของตัวเราเหนือหัว (ไม่มีป้ายชื่อ) */
function drawMyBubble(c) {
  const b = bubbleOf(onlineMe()?.id);
  if (!b) return;
  const top = cat.sit ? cat.y - (cat.sit.sitDy ?? 22) - 108 : cat.y - 124 - emoteLift(emotePose(tick)) * SC;
  drawBubble(c, cat.x, top, b);
}
/** ป้ายชื่อเหนือหัวแมวตัวอื่น — เม็ดโปร่ง ตัวหนังสือขาว (ไม่มีเส้นขอบ) · สมาชิกที่ห้องตรวจแล้ว = ม่วงเข้ม · ผู้มาเยือน = เทาม่วงอ่อน */
function nameTag(c, x, y, name, member = 0) {
  c.save();
  c.font = '700 10.5px Mali, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const w = c.measureText(name).width + 16;
  c.fillStyle = member ? 'rgba(74,42,120,.6)' : 'rgba(120,108,150,.42)';
  c.beginPath(); c.roundRect(x - w / 2, y - 9, w, 18, 9); c.fill();
  c.fillStyle = '#FFFFFF';
  c.fillText(name, x, y + 0.5);
  c.restore();
}
/** ป้าย "แมวในปราสาท N ตัว · ชั้นนี้ M" ใต้ป้ายโหมด (ต่อห้องได้เท่านั้น) */
let onlineTxt = null;
function paintOnline() {
  const on = online() && IN_CASTLE();
  paintMemBadge(on);
  $('cfTitle').textContent = 'แชตชั้นที่ ' + ({ hall: 1, lounge: 2, roof: 3 }[WD.id] || 1);
  let here = 1;
  if (on) for (const q of peers.values()) if (q.w === WD.id) here++;
  const rc = onlineRoom();
  const txt = on ? `${rc ? `ห้อง ${rc} · ` : ''}แมวในปราสาท ${peers.size + 1} ตัว · อยู่ชั้นนี้ ${here} ตัว` : '';
  if (txt === onlineTxt) return;
  onlineTxt = txt;
  $('onlineTag').classList.toggle('hidden', !on);
  $('onlineNum').textContent = txt;
  document.body.classList.toggle('chat-on', on);
  if (!on) closeChat();
  paintChat();
}
initChat({
  send: (k, v) => sendSay(k, v),
  canType: () => onlineMember(),
  floor: () => WD.id,
  toast: (t) => toast(t),
  desk: () => desk,
  report: (r) => sendReport({ ...r, device: navigator.userAgent.slice(0, 160) }),
});
// แชตเปิดอยู่ แตะฉาก = ปิดแชต (ไม่เดินไปตรงที่แตะ)
cv.addEventListener('pointerdown', (e) => { if (chatOpen()) { closeChat(); e.stopImmediatePropagation(); e.preventDefault(); } }, { capture: true });

// ── ตัวน้องบนเบาะนุ่ม / บนบันได (ผู้ใช้ 8 พ.ย.) ──
// เบาะ โซฟา ม้านั่งบุนวม คอนโด (พื้น soft) + นั่งบนเบาะในปราสาท: ลงพื้น/นั่ง/ก้าวเดิน = ตัวยุบลง (เตี้ยกว้าง) แล้วเด้งกลับแบบสปริง ยืนนิ่งจมเบาะนิดหน่อย
const soft = { dy: 0, v: 0 };
const IN_CASTLE = () => WD === HALL || WD === LOUNGE || WD === ROOF;
const softSeat = (p) => (IN_CASTLE() || IN_HOME()) && (p.kind === 'bench' || p.kind === 'cushion' || p.kind === 'tent' || p.kind === 'bed');
/** ท่านอนหมอบหลับ (เต็นท์ชั้น 2 · เตียงในบ้าน) */
function lying(p) { return p?.kind === 'tent' || p?.kind === 'bed'; }
function softKick(f) { soft.v += Math.min(3.4, 0.8 + Math.abs(f) * 0.3); }
function stepSoft(dt) {
  const on = (cat.P.onGround && cat.on?.soft) || (cat.sit && softSeat(cat.sit));
  if (!on) { soft.dy *= 0.6; soft.v = 0; if (Math.abs(soft.dy) < 0.05) soft.dy = 0; return; }
  soft.v += (-0.22 * (soft.dy - 1.4) - 0.15 * soft.v) * dt;
  soft.dy += soft.v * dt;
}
// บนบันได: ขั้นแคบกว่าระยะเท้าสองข้าง — ยืนนิ่ง = ตัวอยู่กลางระหว่างขั้นใต้เท้าสองข้าง ยกเท้าข้างขั้นบน เหยียดเท้าข้างขั้นล่าง ให้แตะผิวขั้นของตัวเองพอดี
//   ทุกท่าบนบันได (เดิน/ยืน/ทำท่า) ตัดภาพตามโครงขั้น: ส่วนที่จมใต้ผิวขั้นถูกซ่อน ขาไม่ทะลุพื้นขั้น
let stance = null;
const STAIRS_X0 = (s) => s.pts[0][0] + 14;   // จุดเริ่มขั้นแรก (stairsSurface เริ่มก่อนขั้นแรก 14)
function stairsStance(s) {
  const FU = SC * CAT2_UNIT, f = 80 * FU, x0 = STAIRS_X0(s);   // เท้าห่างกลางตัว ±85 หน่วยไฟล์ (หันเฉียงแคบลงนิด)
  const lo = stairsTread(x0, cat.x - f), hi = stairsTread(x0, cat.x + f);   // บันไดขึ้นทางขวาเสมอ
  if (lo - hi < 0.5) return null;
  const half = Math.min(52, (lo - hi) / 2 / FU);
  const up = cat.dir < 0 ? 'liftL' : 'liftR', dn = cat.dir < 0 ? 'liftR' : 'liftL';   // หันซ้าย = กลับภาพ เท้าซ้ายในไฟล์อยู่ขวาจอ
  return { y: (lo + hi) / 2, lift: { [up]: half, [dn]: -half } };
}
// ── เบาะ/โซฟายุบตามตัว (ผู้ใช้ 15 พ.ย. 2026 "กระโดดลงเบาะนุ่ม ๆ อยากให้พื้นเบาะยุบตามด้วย") ──
// ภาพเบาะวาดไว้นิ่ง (แคช) — ยุบด้วยการดัดภาพที่วาดแล้วตรงใต้ตัว: ตัดเป็นแถบแนวตั้งบาง ๆ แต่ละแถบดันผิวเบาะลงตามโค้ง cos² (ลึกสุดกลางตัว จางหายที่ขอบ)
//   ส่วนเหนือผิวเบาะ (พนักพิง/ผนัง) ยืดลงตามนิดเดียว · ส่วนใต้ผิวหดลง ขอบล่างเบาะอยู่ที่เดิม · ทำก่อนวาดตัวน้อง ตัวน้องเลยไม่ถูกดัด
// ลึก = soft.dy ตัวเดียวกับที่ตัวน้องจม (สปริงตอนลงจอด/นั่ง/ก้าว) · ชั้นคอนโดชั้น 2 ยุบเองอยู่แล้ว (condoBounce) ไม่ซ้ำ
let dentCv = null;
function dentSeat(c, foot, d) {
  if (d < 0.25) return;
  if (WD === LOUNGE && /^condo:/.test(cat.on?.id || '')) return;
  if (cat.sit?.kind === 'tent') return;   // นอนในเต็นท์: พื้นเต็นท์ไม่ใช่เบาะ
  const M = c.getTransform(), k = M.a;
  const R = 44 * SC / 1.4, UP = 26, DN = 16;   // ครึ่งความกว้างรอยยุบ · ส่วนเหนือ/ใต้ผิวเบาะที่ดัดตาม (หน่วยโลก)
  const cv = c.canvas;
  const x0 = Math.max(0, Math.floor(M.a * (cat.x - R) + M.e)), x1 = Math.min(cv.width, Math.ceil(M.a * (cat.x + R) + M.e));
  const yT = Math.max(0, Math.floor(M.d * (foot - UP) + M.f)), yB = Math.min(cv.height, Math.ceil(M.d * (foot + DN) + M.f));
  const yF = M.d * foot + M.f;
  const w = x1 - x0, h = yB - yT;
  if (w < 4 || h < 4 || yF <= yT || yF >= yB) return;
  dentCv ||= document.createElement('canvas');
  if (dentCv.width < w || dentCv.height < h) { dentCv.width = Math.max(dentCv.width, w); dentCv.height = Math.max(dentCv.height, h); }
  const g = dentCv.getContext('2d');
  g.clearRect(0, 0, w, h);
  g.drawImage(cv, x0, yT, w, h, 0, 0, w, h);
  const fy = yF - yT, cx = M.a * cat.x + M.e, Rd = R * k, SL = 3;
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  for (let sx = 0; sx < w; sx += SL) {
    const sw = Math.min(SL, w - sx);
    const t = (x0 + sx + sw / 2 - cx) / Rd;
    if (Math.abs(t) >= 1) continue;
    const dd = Math.min(fy * 0.5, (h - fy) * 0.6, 1.3 * d * k * Math.cos(t * Math.PI / 2) ** 2);   // ลึกกว่าตัวจมนิด เห็นรอยยุบชัด (กลางรอยตัวน้องบังอยู่)
    if (dd < 0.3) continue;
    c.drawImage(dentCv, sx, 0, sw, fy, x0 + sx, yT, sw, fy + dd);
    c.drawImage(dentCv, sx, fy, sw, h - fy, x0 + sx, yT + fy + dd, sw, h - fy - dd);
  }
  c.restore();
}
// ประกาย/ของโปรยจากชุด S ไหลออกแล้วไหลเลย (ผู้ใช้ 15 พ.ย.): ตอนตัวน้องยุบ-เด้งบนเบาะ เม็ดไม่ยุบ-เด้งตาม — วาดด้วยกรอบก่อนยุบ (trailM)
let trailM = null;
function paintTrail(c, r, x) {
  if (!r || !(r.parts || r.ribbon)) return;
  c.save();
  if (trailM) { c.setTransform(trailM); if (cat.dir < 0) { c.translate(2 * x, 0); c.scale(-1, 1); } }
  drawTrail(c, r.parts, x, SC, r.ribbon);
  c.restore();
}
function drawCat(c) {
  const st = cat.P.onGround && cat.on && /stairs/.test(cat.on.id) ? cat.on : null;
  stance = st && !cat.moving && !cat.sit && !act ? stairsStance(st) : null;
  const d = soft.dy;
  // รอยยุบเบาะ: ก๊อปพิกเซลฉากจากผืนที่วาดอยู่ — วาดผ่านแสงขอบ (ผืนแยกว่าง) ทำไม่ได้ → drawCatRim ทำบนฉากจริงก่อนแล้ว (noFloorShadow)
  if (!st && d && !noFloorShadow) dentSeat(c, cat.sit ? cat.y - (cat.sit.sitDy ?? 22) : cat.y, d);
  if (!st && !d) { drawCatBody(c); return; }
  c.save();
  if (st) {
    const p = new Path2D(), xL = cat.x - 90, xR = cat.x + 90;
    p.moveTo(xL, cat.y - 400); p.lineTo(xR, cat.y - 400);
    stairsProfilePath(p, STAIRS_X0(st), xL, xR, 1.5);
    p.closePath();
    c.clip(p);
  }
  if (d) {
    const foot = cat.sit ? cat.y - (cat.sit.sitDy ?? 22) : cat.y, q = d * 0.016;
    trailM = c.getTransform();
    c.translate(cat.x, foot + d); c.scale(1 + q * 0.55, 1 - q); c.translate(-cat.x, -foot);
  }
  drawCatBody(c);
  trailM = null;
  c.restore();
}
let noFloorShadow = false;   // วาดตัวลงผืนแยกเพื่อทำแสงขอบ (rim-light.js) = เงาพื้นวาดแยกบนฉากแล้ว ไม่ให้โดนแสงขอบ
function drawCatBody(c) {
  const skin = townSkin();
  const x = cat.x;
  const P = cat.P;
  // เงาตกบนผิวใต้ตัว (ถนน หลังคา ชั้นคอนโด ...) — ยิ่งลอยสูงยิ่งเล็กและจาง (กระโดด หรือท่าที่ลอยตัว)
  const floor = P.onGround ? cat.y : floorAt(x, cat.y, 0.5).y;
  const up = Math.min(1, (floor - cat.y + (cat.moving || cat.sit ? 0 : emoteLift(emotePose(tick)) * SC)) / 160);
  if (cat.sit?.kind !== 'swing' && !noFloorShadow) {
    c.save();
    c.globalAlpha = 0.22 * (1 - up * 0.6);
    c.fillStyle = '#4A2A5A';
    const sw = 1 - up * 0.45;
    c.beginPath(); c.ellipse(x, floor + 3, 26 * SC / 1.4 * sw, 5.5 * sw, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  // เดิน / ลอยกลางอากาศ / ยังตัวแบนจากการลงพื้น = ท่าวิ่งของเกม (มีท่าถีบ ลอย ร่วง ลงพื้นครบ)
  if (cat.moving || !P.onGround || P.squash > 0.05) {
    trailMark(cat.A);
    const r = stepRunAnim(cat.A, P, { catId: skin.id, dt: 1, outfit: skin.outfit?.id, speed: 0, scale: SC, stand: !cat.moving });
    trailWorld(cat.A, r, cat.dir < 0 ? -1 : 1);
    c.save();
    if (cat.dir < 0) { c.translate(2 * x, 0); c.scale(-1, 1); }   // หันซ้าย = กลับภาพท่าวิ่ง (ท่าวิ่งวาดหันขวา)
    // ประกาย/ของโปรยจากชุดระดับ S (TRAIL) — ค้างอยู่ในฉาก (trailWorld) น้องเดิน/กระโดดผ่านไป เม็ดไม่ตาม
    paintTrail(c, r, x);
    drawCat2Run(c, x, cat.y, SC, skin, tick, { ...r, parts: null, ribbon: null }, heldOpt());
    c.restore();
  } else {
    // หยุดแล้ว: ประกายชุดที่ปล่อยไว้ร่วงต่อจนหมด (dead = หยุดปล่อยเม็ดใหม่) แล้วค่อยล้างตัวคุมท่า — เริ่มเดินใหม่ท่าไม่ค้างกลางก้าว
    let trail = null;
    if (cat.A.parts?.length || cat.A.ribbon?.length) {
      trailMark(cat.A);
      trail = stepRunAnim(cat.A, P, { catId: skin.id, dt: 1, outfit: skin.outfit?.id, speed: 0, scale: SC, dead: true });
      trailWorld(cat.A, trail, cat.dir < 0 ? -1 : 1);
    }
    else cat.A = createRunAnim();
    // ชิงช้า: นั่งบนที่นั่งที่แกว่งตามมุม (หมุนทั้งตัวรอบจุดแขวน)
    if (cat.sit?.kind === 'swing') {
      const { px, py, a, v, amp, L } = swingFrame();
      c.save();
      c.translate(px, py);
      c.rotate(a);
      const fl = cat.dir < 0 ? -1 : 1;
      if (fl < 0) c.scale(-1, 1);
      // ผู้ใช้ 1 พ.ย.: หางห้อยลงจากที่นั่ง หมุนสวนมุมชิงช้า (ห้อยตามแรงโน้มถ่วง) + ปลายเหวี่ยงตามหลังความเร็ว
      // หน้ายิ้มตาปิดสุขใจ · หัวเอียงตามแรงเหวี่ยงช้ากว่าตัวนิด · หูลู่ลมตอนแกว่งแรง · ปลายสุดทางอ้าปากหัวเราะคิกเบา ๆ
      const peak = amp > 0.12 ? Math.max(0, Math.abs(a) / amp - 0.8) * 5 : 0;
      const shape = {
        sit: 1, turn: 0, noHang: 1,
        tailHang: 1, hangRot: -a * fl * 0.95, hangLag: -v * fl * 0.9,
        mood: 'happy', tilt: v * fl * 0.22, ear: Math.min(0.5, amp) * 0.6, mouth: peak * 0.55,
      };
      drawCat2(c, 0, L + 2, SC, skin, tick, { k: 1, shape, ...heldOpt() });
      c.restore();
      return;
    }
    // ท่าทางที่เลือกจากแผง (ท่าหน้าแรก / ท่าแอ็คสกิน S) — หันหน้าตรงแบบหน้าแรก · ท่าที่ลอยยกเท้าขึ้นทั้งตัว
    const em = cat.sit || act ? null : emotePose(tick);
    // ท่ายืนวาดหันขวา หางอยู่ซ้าย — หันซ้าย = กลับภาพทั้งตัว หางจึงอยู่ฝั่งตรงข้ามหน้าเสมอ (ผู้ใช้ 28 ต.ค.)
    // (เดิมใช้ turn ติดลบ หน้าหันซ้ายแต่หางค้างฝั่งซ้าย) · ท่าทางก็กลับภาพตาม ไม่สลับฝั่งหางตอนเริ่มท่า
    c.save();
    if (cat.dir < 0) { c.translate(2 * x, 0); c.scale(-1, 1); }
    paintTrail(c, trail, x);
    // noHang = ไม่มีของประกอบฉากห้อยด้านหลัง (พวงมาลัยยาวของชุดสไบไทย) — ค่าสูงไว้ให้ยังเกิน 0.5 ตอนท่าค่อย ๆ คลาย (คูณ k)
    if (act && !cat.sit) {
      const ap = actPose(act, tick);   // ถือถ้วยชา/ขนมสองมือ (castle-acts.js)
      drawCat2(c, x, cat.y, SC, skin, tick, { k: ap.k, shape: ap.shape, holdDraw: ap.holdDraw, holdBehind: ap.holdBehind });
    } else if (em) drawCat2(c, x, cat.y - emoteLift(em) * SC, SC, skin, tick, { k: em.k, shape: { ...em.shape, noHang: 9 }, ...heldOpt() });
    else {
      // armFar: หันเฉียงตอนยืนนิ่ง แขนฝั่งไกลไม่หดจนดูเหมือนข้อมือพับ (ผู้ใช้ 8 พ.ย.) · เต็นท์ชั้น 2 = หมอบหลับในเต็นท์
      const shape = lying(cat.sit) ? { loaf: 1, shut: 1, noHang: 1 }
        : cat.sit ? { sit: 1, turn: 0, noHang: 1 } : { turn: RUN_TURN * 0.6 * cat.face, noHang: 1, armFar: 1, ...stance?.lift };   // stance = ยืนคร่อมขั้นบันได
      // นั่งม้านั่ง = บนเบาะ · มุดกล่อง = นั่งจมลงในกล่อง (ผนังหน้ากล่องวาดทับทีหลัง)
      const y = !cat.sit ? (stance ? stance.y : cat.y) : cat.y - (cat.sit.sitDy ?? (cat.sit.kind === 'box' ? 2 : 22));   // sitDy = เบาะ/เต็นท์ในปราสาท
      drawCat2(c, x, y, SC, skin, tick, { k: 1, shape, ...heldOpt() });
    }
    c.restore();
  }
}

/** ลูกแมวในห้องเลี้ยงน้อง (home-cats.js): แสงขอบ + เงาทอดแบบเดียวกับตัวเรา — ตัวน้องสูงราว 330·k (หน่วยชีบิ) คางที่ −116·k */
function kitLit() {
  if (!lightFxOn()) return null;
  const E = sceneEnv();
  if (!E) return null;
  return {
    cast: castOn(),
    draw(c, k, ground, fn) {
      const s = k.k, box = { x0: k.x - 240 * s, x1: k.x + 240 * s, y0: k.y - 460 * s, y1: k.y + 40 * s };
      // เงาต้องตกบนของจริง (ผู้ใช้ 16 พ.ย.): นั่งบนที่นอน/คอนโด/ชั้น/ม้านั่ง = เงาอยู่แค่บนเบาะใต้ตัว (กว้างราวเบาะ 28 หน่วยต่อข้าง)
      //   กระโดดข้ามระหว่างที่สูง = ใต้ตัวไม่มีพื้น → ไม่มีเงาทอด · บนพื้นห้อง = ทอดยาวตามปกติ
      const high = ground < GY - 6;
      const floor = high && k.st === 'hop' ? null : ground;
      const surf = high && floor != null ? { pts: [[k.x - 28, ground], [k.x + 28, ground]], depth: 10 } : null;
      drawWithRim(c, box, fn, { x: k.x, y: k.y - 120 * s, neck: k.y - 116 * s, floor, feet: k.y, surf, gain: 1.6, tint: 0.55 }, { camX, camY, vw, H, ...E });   // ตัวเล็ก ขนอ่อน = แรงขึ้น + ย้อมสีแสง (ผู้ใช้ 16 พ.ย.)
    },
  };
}
/** น้องตัวหลัก: ฉากมีชั้นแสง + แสงไม่ปิด = แสงขอบ/เงาทอด (ชิงช้า = วาดปกติ) */
function drawMe(c) {
  if (lightFxOn() && sceneEnv() && cat.sit?.kind !== 'swing') drawCatRim(c);
  else drawCat(c);
}
/** น้องตัวหลัก + แสงขอบ (rim-light.js): เงาพื้นวาดบนฉากก่อน แล้วตัววาดลงผืนแยก ใส่ขอบสว่างฝั่งที่หันหาแสง */
/**
 * ผิวที่ยืนอยู่ → กรอบตัดเงาทอด (rim-light.js at.surf) — ยืนบนของ = เงาอยู่แค่บนชิ้นนั้น ไม่ลอยเลยขอบ (ผู้ใช้ 16 พ.ย.)
 * null = พื้นห้อง/ถนน (ไม่ตัด) · y1 = เงาเลื่อนลงหน้าชิ้นได้ไม่เกิน 14 หน่วย
 */
// ตัดตามเส้นผิวจริง (s.pts — หมวกเห็ดโค้ง บันไดลาด) ลงมาหนา 14 หน่วย · ผิวระดับพื้น (พรม) = ไม่ตัด
const surfClip = (s, floor, gy) => (s && s.pts && floor < gy - 4 ? { pts: s.pts.map(([x, y]) => [x, y + (s.dy || 0)]), depth: 14 } : null);
function drawCatRim(c) {
  const floor = cat.P.onGround ? cat.y : floorAt(cat.x, cat.y, 0.5).y;
  const surf = surfClip(cat.P.onGround ? cat.on : floorAt(cat.x, cat.y, 0.5).s, floor, WD.ground(cat.x));
  const up = Math.min(1, (floor - cat.y) / 160), sw = 1 - up * 0.45;
  // เบาะ/โซฟายุบตามตัว (ผู้ใช้ 16 พ.ย.: "โซฟากับเบาะไม่ยุบตาม") — ดัดพิกเซลฉากจริงก่อน (ลำดับเดิม: รอยยุบ → เงา → ตัว) แล้วค่อยวาดตัวลงผืนแยก
  const onStairs = cat.P.onGround && cat.on && /stairs/.test(cat.on.id);
  if (!onStairs && soft.dy) dentSeat(c, cat.sit ? cat.y - (cat.sit.sitDy ?? 22) : cat.y, soft.dy);
  if (!castOn()) {   // เงาแบบใหม่ปิดอยู่ = ใช้เงาวงรีเดิม · เปิด = เงาทอดจากรูปตัวแทน (ห้ามมีสองอันซ้อนกัน)
    c.save();
    c.globalAlpha = 0.22 * (1 - up * 0.6); c.fillStyle = '#4A2A5A';
    c.beginPath(); c.ellipse(cat.x, floor + 3, 26 * SC / 1.4 * sw, 5.5 * sw, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  // ตัวน้องสูงราว 60·SC (เท้า → ปลายหู) · กรอบเผื่อท่าลอย/ของบนหัว · คอ ≈ 25·SC เหนือเท้า (หัว = แถบแสงบางกว่า)
  const box = { x0: cat.x - 95 * SC, x1: cat.x + 95 * SC, y0: cat.y - 140 * SC, y1: cat.y + 16 * SC };
  noFloorShadow = true;
  try { drawWithRim(c, box, drawCat, { x: cat.x, y: cat.y - 30 * SC, neck: cat.y - 25 * SC, floor, feet: cat.y, surf }, { camX, camY, vw, H, ...sceneEnv() }); }
  finally { noFloorShadow = false; }
}

/** รอยอุ้งเท้าชมพูตรงจุดที่แตะ — เด้งเข้า โยกเบา ๆ วงคลื่นกระจายเป็นจังหวะ หัวใจดวงเล็กลอยขึ้น */
function drawMark(c) {
  if (!mark) return;
  const u = tick - mark.t;
  const pop = Math.min(1, u / 12);
  const s = pop < 1 ? 0.3 + 0.9 * Math.sin(pop * Math.PI * 0.62) : 1 + 0.06 * Math.sin(u * 0.15);
  const x = mark.x, y = WD.ground(mark.x) + 16;
  c.save();
  // วงคลื่นบนพื้น
  const r = (u % 40) / 40;
  c.globalAlpha = 0.6 * (1 - r);
  c.strokeStyle = '#FF8FB3';
  c.lineWidth = 2;
  c.beginPath(); c.ellipse(x, y + 4, 10 + r * 22, (10 + r * 22) * 0.32, 0, 0, Math.PI * 2); c.stroke();
  c.globalAlpha = 1;
  c.translate(x, y - 2);
  c.scale(s, s * 0.8);
  // ขอบขาว + อุ้งเท้าชมพู
  const paw = (grow, col) => {
    c.fillStyle = col;
    c.beginPath(); c.ellipse(0, 3, 9 + grow, 7.4 + grow, 0, 0, Math.PI * 2); c.fill();
    for (const [dx, dy] of [[-9, -6], [-3.4, -11], [3.4, -11], [9, -6]]) { c.beginPath(); c.ellipse(dx, dy, 3.4 + grow, 4 + grow, dx * 0.04, 0, Math.PI * 2); c.fill(); }
  };
  paw(2, '#FFFFFF');
  paw(0, '#FF8FB3');
  c.fillStyle = 'rgba(255,255,255,.55)';
  c.beginPath(); c.ellipse(-3, 0, 3, 1.8, -0.4, 0, Math.PI * 2); c.fill();
  c.restore();
  // หัวใจดวงเล็กลอยขึ้นแล้วจาง (วนทุก ~1 วิ)
  const h = (u % 60) / 60;
  c.save();
  c.globalAlpha = 1 - h;
  c.fillStyle = '#FF8FB3';
  const hx = x + 10 + Math.sin(u * 0.1) * 3, hy = y - 22 - h * 18, hr = 4;
  c.beginPath();
  c.moveTo(hx, hy + hr * 0.9);
  c.bezierCurveTo(hx - hr * 1.45, hy - hr * 0.1, hx - hr * 0.65, hy - hr * 1.15, hx, hy - hr * 0.38);
  c.bezierCurveTo(hx + hr * 0.65, hy - hr * 1.15, hx + hr * 1.45, hy - hr * 0.1, hx, hy + hr * 0.9);
  c.fill();
  c.restore();
}

function draw() {
  ctx.setTransform(k, 0, 0, k, 0, 0);
  if (scene === 'shop') {
    // ในร้าน: ภาพฉากในร้านจากแคช + ของขยับ (ไม่วาดเมือง)
    drawInterior(ctx, shopPlace.tab, vw, keepX, tick, shopView);
    drawFade();
    return;
  }
  // ฉากหลัง: แต่ละชั้นเลื่อนตามกล้องแนวตั้งน้อยกว่าตามความลึก (ชั้นไกลแทบไม่ขยับ)
  const lay = (par) => ctx.setTransform(k, 0, 0, k, 0, camY * par * k);
  if (WD === GARDEN) return drawGarden(lay);
  if (WD === HALL) return drawHall(lay);
  if (WD === LOUNGE) return drawHall(lay, drawLoungeBack, drawLoungeWorld);
  if (WD === ROOF) return drawHall(lay, drawRoofBack, drawRoofWorld);
  if (WD === HOME) return drawHall(lay, drawHomeBack, drawHomeWorld);
  if (WD === NURSERY) return drawHall(lay, drawNurseBack, drawNurseWorld);
  const gap = riverGap(camX, vw);
  drawSky(ctx, vw);
  // แม่น้ำ: น้ำตกเลื่อนเท่าต้นน้ำ (RIVER_SRC_P) · ลำน้ำวาดในพิกัดจอ (lay 0) แต่ละจุดเลื่อนตามความลึกของตัวเอง — ต่อกันตลอดตอนกล้องยกขึ้น
  lay(RIVER_SRC_P);
  drawRiverSource(ctx, camX, vw, tick);
  lay(0.06);
  drawFar(ctx, camX, vw, tick);
  drawClouds(ctx, camX, vw, tick);
  lay(0.2);
  drawHills(ctx, camX, vw, tick, gap);
  lay(0);
  drawRiverFar(ctx, camX, camY, vw, tick);
  lay(0.55);
  drawMidTrees(ctx, camX, vw, gap);
  lay(0.72);
  drawBackRow(ctx, camX, vw, gap);
  lay(0);
  drawRiverFar(ctx, camX, camY, vw, tick, true);
  ctx.setTransform(k, 0, 0, k, -camX * k, camY * k);
  drawGround(ctx, camX, vw, tick);
  drawRealmGround(ctx, camX, vw);   // ถนนหลวงปูกระเบื้อง + พรมหน้าประตูปราสาท
  // น้ำใต้สะพาน → ตัวสะพาน → เรือ/เป็ด → ซุ้มโค้ง+เสาตอม่อ (เรือลอดใต้) → ร้าน → ของเล่น
  drawBridgeWater(ctx, camX, vw, tick);
  drawBridge(ctx, camX, vw);
  drawWater(ctx, camX, vw, tick, ride ? null : boat);
  drawBridgeArch(ctx, camX, vw);
  drawRealm(ctx, camX, vw, tick);   // ซุ้มประตูเขต รั้ว สวนหลวง โคม ปราสาท (castle.js)
  drawStreet(ctx, camX, vw, tick);
  const inBox = cat.sit?.kind === 'box';
  drawPlay(ctx, camX, vw, tick, inBox);
  drawMark(ctx);
  const p = nearPlace();
  if (bubbleFor(p)) drawPrompt(ctx, p, actionLabel(p) + (desk ? ' · กด E' : ''), tick, promptView());
  if (!ride) drawMe(ctx);
  drawSplashes(ctx, tick);   // น้ำกระเด็นในน้ำพุ (ทับตัวน้อง)
  drawDust(ctx, tick);        // ฝุ่นฟุ้งตอนลงจากกระโดดสองชั้น
  drawFlowerMotes(ctx, tick); // กลีบ/ประกายร่วงจากดอกไม้ที่ถือ
  drawPlayFront(ctx, camX, vw, tick, inBox);
  drawBoatFront(ctx, camX, vw, tick, ride ? null : boat);   // เรือเปล่าในแม่น้ำหน้าเมือง ทับถนน/ลานน้ำพุ
  drawBridgeFront(ctx, camX, vw, tick);
  drawEmoteFx(ctx);
  // ชั้นหน้าสุด (ใกล้ตากว่าตัวน้อง) — เลื่อนเร็วกว่ากล้อง
  ctx.setTransform(k, 0, 0, k, 0, camY * 1.3 * k);
  drawFront(ctx, camX, vw, tick);
  if (ride) drawRide();
  ctx.setTransform(k, 0, 0, k, 0, 0);
  sceneLightFx();
  drawFerryTalk();
  drawFade();
}

/** ปราสาทชั้น 1 — โถง พื้น ของ วิวนอกหน้าต่าง (castle-hall.js) · ตัวน้อง/ป้าย/ท่าทางชุดเดียวกับเมือง */
const ROOF_LIGHTS = roofLights();
/**
 * แสงของฉากนี้สำหรับชั้นแสง/แสงขอบ/เงาทอด (light-fx.js · rim-light.js) — ผู้ใช้ 16 พ.ย. 2026 "ใส่แสงทุกฉาก"
 * { lights: ไฟ/โคม (พิกัดโลก), env } · env ดูคำอธิบายใน light-fx.js · null = ฉากนี้ไม่มีชั้นแสง
 *   เมือง/สวน: ฟ้าในฉากไม่เปลี่ยนตามเวลา → ใช้ฟ้าคงที่ + จุดดวงอาทิตย์ตรงที่วาดไว้ (world.js drawSky · garden.js drawGardenSky)
 *   ปราสาทชั้น 1–2 / ห้องนอน / ห้องเลี้ยงน้อง: ในร่ม แสงจากหน้าต่าง + โคม ตามเวลาจริง · ดาดฟ้า: ฟ้าจริง
 */
const TOWN_SKY = { day: 1, dusk: 0, night: 0, sunU: 0.8 }, GARDEN_SKY = { day: 0.55, dusk: 0.45, night: 0, sunU: 0.72 };
const LIGHT_MAPS = { hall: hallLightMap(), home: homeLightMap(), nursery: nurseLightMap() };
function sceneEnv() {
  if (WD === ROOF) return { lights: ROOF_LIGHTS };
  if (WD === TOWN) return { lights: [], env: { S: TOWN_SKY, pt: [vw * 0.8, 64] } };
  if (WD === GARDEN) return { lights: [], env: { S: GARDEN_SKY, pt: [vw * 0.72, 92] } };
  const m = WD === LOUNGE ? loungeLightMap(tick) : LIGHT_MAPS[WD.id];   // ชั้น 2: โคมตั้งพื้นเปิด/ปิดได้ — ถามใหม่ทุกครั้ง
  return m ? { lights: m.lights, env: { wins: m.wins, dark: m.dark || 0 } } : null;
}
/** ชั้นแสงทับทั้งจอ (เรียกตอนกรอบจอ ctx.setTransform(k,0,0,k,0,0)) */
function sceneLightFx() {
  const E = sceneEnv();
  if (E) drawLightFx(ctx, { camX, camY, vw, H, t: tick, ...E });
}
const sceneLights = () => sceneEnv();
function drawHall(lay, back = drawHallBack, world = drawHallWorld) {   // ใช้ทุกชั้นของปราสาท
  // ส่องกล้องดูดาว: ม่านปิดจอเต็มแล้ว = ไม่ต้องวาดฉากปราสาท (เบา)
  if (scope && scope.k >= 0.36) { ctx.setTransform(k, 0, 0, k, 0, 0); drawScope(ctx, vw, H, tick, scope); drawFade(); return; }
  ctx.setTransform(k, 0, 0, k, -camX * k, camY * k);
  WD.pre?.();
  back(ctx, camX, vw, tick);
  world(ctx, camX, vw, tick);
  drawMark(ctx);
  drawPeers(ctx, false);   // แมวผู้เล่นคนอื่น (ออนไลน์) ที่อยู่หลังตัวเรา — หลังของในฉาก
  const p = nearPlace();
  if (bubbleFor(p) && !act) drawPrompt(ctx, p, actionLabel(p) + (desk ? ' · กด E' : ''), tick, promptView());
  WD.under?.(ctx, camX, vw);   // ห้องแมว: น้องที่อยู่หลังตัวผู้เล่น
  if (myAura && !drawAura(ctx, cat.x, cat.y, myAura)) myAura = 0;   // ออร่าตอนเพิ่งเข้าปราสาท/ขึ้นลงชั้น (ข้างหลังตัว)
  drawMe(ctx);
  if (myAura) drawAura(ctx, cat.x, cat.y, myAura, true);
  drawPeers(ctx, true);   // แมวผู้เล่นคนอื่นที่อยู่หน้าตัวเรา (peerInFront — ลำดับเดียวกับจอของเขา)
  drawMyBubble(ctx);   // ฟองแชตของเรา (ออนไลน์)
  WD.front?.(ctx, camX, vw, tick);   // ชั้น 2: ผ้าหน้าเต็นท์ทับน้องที่นอนอยู่ข้างใน (ไม่บังใครที่อยู่ข้างนอก)
  drawSplashes(ctx, tick);   // น้ำกระเซ็นในน้ำพุโถงชั้น 1
  if (act) drawSnackFlight(ctx, act, SNACK_POP, { x: cat.x, y: cat.y - 236 * U }, U * 1.3, tick);
  drawActFx(ctx);
  drawDust(ctx, tick);
  drawFlowerMotes(ctx, tick);
  drawEmoteFx(ctx);
  ctx.setTransform(k, 0, 0, k, 0, 0);   // ไม่มีของหน้าสุด — ห้ามบังตัวละคร (สเปกปราสาท)
  // ชั้นแสง (light-fx.js · ผู้ใช้ 15–16 พ.ย. 2026) — ทุกชั้นของปราสาท + ห้องนอน/ห้องเลี้ยงน้อง · ระดับตามตั้งค่า "ภาพ"
  sceneLightFx();
  drawPhoto();
  if (scope) drawScope(ctx, vw, H, tick, scope);
  drawFade();
}

/** สวนดอกไม้ในฝัน — ชั้นภาพตาม garden.js · ตัวน้อง/ป้าย/ท่าทางชุดเดียวกับเมือง */
function drawGarden(lay) {
  drawGardenSky(ctx, vw, tick);
  lay(0.06);
  drawGardenFar(ctx, camX, vw, tick);
  lay(0.2);
  drawGardenHillsFar(ctx, camX, vw);
  lay(0.35);
  drawGardenHillsNear(ctx, camX, vw);
  lay(0.55);
  drawGardenTrees(ctx, camX, vw);
  ctx.setTransform(k, 0, 0, k, -camX * k, camY * k);
  drawGardenWorld(ctx, camX, vw, tick);
  drawMark(ctx);
  const p = nearPlace();
  if (bubbleFor(p)) drawPrompt(ctx, p, actionLabel(p) + (desk ? ' · กด E' : ''), tick, promptView());
  drawMe(ctx);
  drawDust(ctx, tick);
  drawFlowerMotes(ctx, tick);
  drawGardenAirWorld(ctx, camX, vw, tick);
  drawEmoteFx(ctx);
  ctx.setTransform(k, 0, 0, k, 0, camY * 1.3 * k);
  drawGardenFront(ctx, camX, vw, tick);
  ctx.setTransform(k, 0, 0, k, 0, 0);
  sceneLightFx();
  drawGardenOverlay(ctx, vw, tick);
  drawPhoto();
  drawFade();
}

/**
 * เรือที่น้องนั่ง + ตัวน้อง วาดทับทุกชั้น (ลานน้ำพุ กอหญ้าหน้าสุด ไม่บังน้องตอนล่องเรือ)
 * ยกเว้นซุ้มโค้ง/เสาตอม่อของสะพาน: วาดลงผืนแยกแล้วทาซุ้มทับเฉพาะพิกเซลเรือ (source-atop) — เรือยังลอดใต้สะพาน
 * แต่ของชั้นอื่นตรงนั้นไม่หายไปด้วย
 */
let rideCv = null;
/** ประกาย/ของโปรยชุดระดับ S ตอนนั่งเรือ: ปล่อยต่อเนื่องจากตัวน้อง ค้างในฉาก (trailWorld) เรือแล่นไป = ทางประกายตามหลังเรือ */
function drawRideTrail(c) {
  const skin = townSkin();
  trailMark(cat.A);
  const r = stepRunAnim(cat.A, cat.P, { catId: skin.id, dt: 1, outfit: skin.outfit?.id, speed: 0, scale: SC, stand: true });
  // หางแสงหัวคทา: เรือแล่นเร็ว หางที่ค้างในฉากจะยืดเป็นเส้นตรงยาวแบบเลเซอร์ — ตอนนั่งเรือไม่ต่อหางใหม่ หางเดิม (จากตอนกระโดดลง) หดหายจากปลาย
  if (cat.A.ribbon) { cat.A.ribbon.shift(); cat.A.ribbon.splice(-3); }
  trailWorld(cat.A, r, cat.dir < 0 ? -1 : 1);
  if (!(cat.A.ribbon?.length > 1)) r.ribbon = null;
  if (!r.parts && !r.ribbon) return;
  c.save();
  if (cat.dir < 0) { c.translate(2 * cat.x, 0); c.scale(-1, 1); }
  drawTrail(c, r.parts, cat.x, SC, r.ribbon);
  c.restore();
}
function drawRide() {
  if (!rideCv) rideCv = document.createElement('canvas');
  if (rideCv.width !== cv.width || rideCv.height !== cv.height) { rideCv.width = cv.width; rideCv.height = cv.height; }
  const g = rideCv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, rideCv.width, rideCv.height);
  g.setTransform(k, 0, 0, k, -camX * k, camY * k);
  const seated = ride.ph === 'sail' || ride.ph === 'dock';
  if (seated) drawRideTrail(g);
  drawBoat(g, ride.bx, ride.dir, tick, seated ? drawPassenger : null, ride.ph === 'sail');
  if (!seated) drawCat(g);
  // ลอดใต้ซุ้มเฉพาะตอนนั่งในเรือ · กระโดดขึ้น/ลงเรือ (เช่นขึ้นศาลาสะพาน) อยู่หน้าหน้าสะพาน ไม่โดนบัง
  if (seated) {
    g.globalCompositeOperation = 'source-atop';
    drawBridgeArch(g, camX, vw);
    g.globalCompositeOperation = 'source-over';
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(rideCv, 0, 0);
}

/** ม่านจางตอนเปลี่ยนฉาก (เมือง ↔ ในร้าน) */
function drawFade() {
  if (fade <= 0) return;
  if (warping) { ctx.setTransform(k, 0, 0, k, 0, 0); drawWarp(ctx, vw, fade, tick); return; }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = `rgba(255,246,251,${fade})`;
  ctx.fillRect(0, 0, cv.width, cv.height);
}

function loop(now) {
  const dt = Math.min(3, (now - last) / (1000 / 60));
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// ── บังคับ ─────────────────────────────────────────────────────
// จอย (มือถือ): ลากปุ่มกลมไปได้รอบวง · เลยระยะเผื่อ (dead zone) ทางซ้าย/ขวา = เดิน · ปล่อยนิ้ว = ปุ่มเด้งกลับกลาง
(() => {
  const base = $('joy'), knob = $('joyKnob');
  let id = null;
  const move = (e) => {
    const r = base.getBoundingClientRect();
    const R = r.width * 0.34;                         // ปุ่มไปได้ไกลสุดจากกลางวง
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    joyDir = Math.abs(dx) > R * 0.3 ? Math.sign(dx) : 0;
    sparkle(dx, dy, r.width);
    // ลากลงลึก (เกือบสุดวง) = ลงจากที่สูง — นับตอนลากเข้าโซนล่าง ครั้งเดียวต่อการลาก
    const down = dy > R * 0.7 && Math.abs(dx) < R * 0.75;
    if (down && !joyDown) wantDrop = true;
    joyDown = down;
    base.classList.toggle('l', joyDir < 0);
    base.classList.toggle('r', joyDir > 0);
  };
  let lastX = 0, lastY = 0;
  // ประกายวิ้ง (ผู้ใช้ 15 พ.ย. 2026 "ตอนเลื่อนไปมา ใส่เอฟเฟกต์วิ้งหน่อย ไม่ต้องเยอะ"): ลากไปเกินระยะหนึ่ง = ดาว/จุดแสงเล็กเด้งจากข้างอุ้งเท้าแล้วจาง
  let sparkAt = 0, sparkX = 0, sparkY = 0;
  const SPARK_COL = ['#FFF4B8', '#FFC4E1', '#D9C2FF', '#FFFFFF'];
  function sparkle(dx, dy, W) {
    const now = performance.now();
    if (now - sparkAt < 140 || Math.hypot(dx - sparkX, dy - sparkY) < W * 0.06) return;
    sparkAt = now; sparkX = dx; sparkY = dy;
    const el = document.createElement('i');
    el.className = 'joy-spark' + (Math.random() < 0.45 ? ' dot' : '');
    const a = Math.random() * Math.PI * 2, rr = W * (0.3 + Math.random() * 0.1);   // รอบขอบอุ้งเท้า (ปุ่มกว้าง 62% ของวง)
    el.style.left = `calc(50% + ${dx + Math.cos(a) * rr}px)`;
    el.style.top = `calc(50% + ${dy + Math.sin(a) * rr}px)`;
    el.style.setProperty('--c', SPARK_COL[Math.floor(Math.random() * SPARK_COL.length)]);
    el.style.setProperty('--s', (0.7 + Math.random() * 0.6).toFixed(2));
    base.append(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }
  const reset = () => {
    id = null;
    joyDir = 0;
    joyDown = false;
    knob.style.transform = '';
    base.classList.remove('on', 'l', 'r');
  };
  joyReset = reset;
  const end = (e) => { if (id !== null && e.pointerId === id) reset(); };
  base.addEventListener('pointerdown', (e) => {
    if (id !== null) return;
    e.preventDefault();
    id = e.pointerId;
    lastX = e.clientX; lastY = e.clientY;
    try { base.setPointerCapture(id); } catch {}
    base.classList.add('on');
    move(e);
  });
  base.addEventListener('pointermove', (e) => { if (e.pointerId === id) { lastX = e.clientX; lastY = e.clientY; move(e); } });
  base.addEventListener('pointerup', end);
  base.addEventListener('pointercancel', end);
  // จอยค้าง/เดินเอง (ผู้ใช้ 1 พ.ย.): iOS บางจังหวะไม่ส่ง pointerup ให้ปุ่ม (นิ้วลากหลุดขอบจอ · นิ้วที่สองแตะปุ่มอื่น · แจ้งเตือนเด้ง)
  // ทางสำรอง: เสีย capture · pointerup/cancel ที่หน้าต่าง · สลับแอป/หน้าต่างหลุดโฟกัส · ยกนิ้วแล้วไม่มีนิ้วไหนอยู่ใกล้จุดที่จอยถูกลากล่าสุด
  base.addEventListener('lostpointercapture', end);
  window.addEventListener('pointerup', end, true);
  window.addEventListener('pointercancel', end, true);
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  const touchGone = (e) => {
    if (id === null) return;
    const near = [...e.touches].some((tc) => Math.hypot(tc.clientX - lastX, tc.clientY - lastY) < 90);
    if (!near) reset();
  };
  window.addEventListener('touchend', touchGone, { capture: true, passive: true });
  window.addEventListener('touchcancel', touchGone, { capture: true, passive: true });
})();
// ปุ่มกระโดด: ขึ้นทันทีที่นิ้วแตะ (ไม่รอปล่อยนิ้ว) — กดอีกทีกลางอากาศ = ชั้นสอง
$('btnJump').addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });
/**
 * ปุ่มที่ต้องกดได้ระหว่างอีกนิ้วจับจอยอยู่ (ผู้ใช้ 28 ต.ค.: สลับเดิน/วิ่งขณะเคลื่อนที่)
 * มือถือส่ง click ให้เฉพาะนิ้วแรก — นิ้วที่สองแตะปุ่มจึงเงียบ · ใช้ pointerdown แทน (ทำงานทันทีที่แตะ)
 * click ที่ตามมาจากนิ้วเดียวกันถูกเมิน · click ที่ไม่ได้มาจากนิ้ว/เมาส์ (Enter/Space บนปุ่มที่โฟกัส) ยังใช้ได้
 */
function onTap(el, fn) {
  let fromPointer = false;
  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    e.preventDefault();
    fromPointer = true;
    fn();
  });
  el.addEventListener('click', (e) => {
    if (fromPointer || e.detail > 0) { fromPointer = false; return; }
    fn();
  });
}
onTap($('btnAct'), () => { if (!paused) use(nearPlace()); });

// ── วงล้อท่าทาง (ปุ่มข้างจอย / Q) ─────────────────────────────
// ผู้ใช้ 28 ต.ค.: กดแล้วเป็นวงล้อกลางจอ ท่าเรียงรอบวง (ท่าค้างโทนม่วง · ท่าเล่นโทนชมพู)
// กลางวง = ท่าแอ็คของชุดระดับ S ที่ใส่อยู่ · ชุดที่ไม่มีท่าแอ็ค = กลางวงเป็นปุ่มปิด
// สร้างใหม่ทุกครั้งที่เปิด (เปลี่ยนชุดแล้วกลางวงเปลี่ยนตาม) · กดท่าที่ทำค้างอยู่ซ้ำ = เลิกท่า · แตะนอกวง / Esc = ปิด
const emotePick = $('emotePick');
const emoteOpen = () => !emotePick.classList.contains('hidden');
const X_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
function paintEmotes() {
  const list = emoteList(townSkin().outfit);
  const on = emoteId();
  const ring = list.filter((d) => d.kind !== 'act');
  const act = list.find((d) => d.kind === 'act');
  const wheel = document.createElement('div');
  wheel.className = 'emowheel';
  ring.forEach((d, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'emo ' + d.kind + (on === d.id ? ' on' : '');
    b.dataset.id = d.id;
    b.setAttribute('role', 'menuitem');
    b.setAttribute('aria-label', d.name);
    b.style.setProperty('--a', (i / ring.length) * 360 + 'deg');   // เริ่มบนสุด วนตามเข็ม
    b.style.setProperty('--i', String(i));
    b.innerHTML = '<i aria-hidden="true"></i><span></span>';
    b.firstChild.textContent = d.icon;
    b.lastChild.textContent = d.name;
    wheel.append(b);
  });
  const core = document.createElement('button');
  core.type = 'button';
  if (act) {
    core.className = 'emocore s emo-act' + (on === 'act' ? ' on' : '');
    core.dataset.id = 'act';
    core.setAttribute('role', 'menuitem');
    core.setAttribute('aria-label', act.name);
    core.innerHTML = '<i aria-hidden="true">✨</i><b>ท่าแอ็ค</b><small></small>';
    core.querySelector('small').textContent = townSkin().outfit.name;
  } else {
    core.className = 'emocore x';
    core.setAttribute('aria-label', 'ปิด');
    core.innerHTML = X_ICON + '<small>ปิด</small>';
  }
  wheel.append(core);
  emotePick.replaceChildren(wheel);
}
function toggleEmotes(open = !emoteOpen()) {
  if (open && paused) return;
  if (open) paintEmotes();
  emotePick.classList.toggle('hidden', !open);
  $('btnEmote').setAttribute('aria-expanded', open ? 'true' : 'false');
  $('btnEmote').classList.toggle('on', open);
}
emotePick.addEventListener('click', (e) => {
  const b = e.target.closest('.emo, .emo-act');
  if (!b && e.target.closest('.emowheel') && !e.target.closest('.emocore')) return;   // แตะช่องว่างในวง = ไม่ปิด
  if (b) {
    if (emoteId() === b.dataset.id) stopEmote();
    else {
      // หยุดเดินไปจุดหมาย / ลุกจากม้านั่ง ก่อนทำท่า
      cat.target = null; cat.pending = null; mark = null; cat.sit = null;
      startEmote(b.dataset.id, townSkin().outfit, tick);
    }
  }
  toggleEmotes(false);   // เลือกแล้ว / กดปุ่มปิดกลางวง / แตะนอกวง = ปิด
});
onTap($('btnEmote'), () => toggleEmotes());

// ── ห้องแต่งตัว (ปุ่มไม้แขวนเสื้อขวาบน) ──────────────────────────
// ชุดที่มีอยู่ทั้งหมด (wearable) วาดเป็นรูปน้องตัวจริงใส่ชุดนั้น · แตะ = ใส่ทันที (setOutfit ตัวเดียวกับเกม จำไว้ในบัญชี)
// รูปชุดวาดครั้งเดียวต่อการเปิดห้อง (ไม่วาดทุกเฟรม) · เปลี่ยนชุดแล้วเลิกท่าทางที่ทำอยู่ (ท่าแอ็คเป็นของชุดเดิม)
const WARD_PX = 92;
let wardTab = 'outfit';   // 'outfit' | 'cat'
function paintWardrobe() {
  for (const t of document.querySelectorAll('.wtab')) {
    const on = t.dataset.tab === wardTab;
    t.classList.toggle('on', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
  }
  $('wardGrid').classList.toggle('cats', wardTab === 'cat');
  $('wardGrid').setAttribute('aria-label', wardTab === 'cat' ? 'น้องแมว' : 'ชุด');
  if (wardTab === 'cat') return paintCats();
  const grid = $('wardGrid');
  grid.replaceChildren();
  const base = townBase();
  const now = (tryOutfit || getOutfit()).id;
  const test = wallet().mode !== 'server';
  $('wardSub').textContent = test
    ? 'โหมดทดลอง: มีครบทุกชุด · ชุดที่ยังไม่มี = ลองใส่ในเมือง (ไม่บันทึก)'
    : 'แตะชุดเพื่อใส่ได้เลย · ได้ชุดเพิ่มจากตู้กาช่าในเกม';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  for (const o of test ? OUTFITS : wearable()) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ward' + (o.id === now ? ' on' : '');
    b.dataset.id = o.id;
    b.setAttribute('role', 'option');
    b.setAttribute('aria-selected', o.id === now ? 'true' : 'false');
    const pic = document.createElement('canvas');
    pic.width = pic.height = WARD_PX * dpr;
    const g = pic.getContext('2d');
    g.scale(dpr, dpr);
    // ตัวน้องสูงราว 110 หน่วยที่สเกล SC — ย่อให้สูง ~70% ของกรอบ เท้าชิดล่าง
    const sc = (WARD_PX * 0.7) * SC / 110;
    drawCat2(g, WARD_PX / 2, WARD_PX * 0.93, sc, { ...base, outfit: o }, 0, { k: 1, shape: { turn: 0, noHang: 1 } });
    const name = document.createElement('span');
    name.textContent = o.name;
    b.append(pic, name);
    if (o.rarity) {
      const tag = document.createElement('i');
      tag.className = 'wtag';
      tag.textContent = RARITY[o.rarity].short;
      tag.style.background = RARITY[o.rarity].color;
      b.append(tag);
    }
    if (!isOwned(o.id)) {
      b.classList.add('try');
      const t = document.createElement('i');
      t.className = 'wtry';
      t.textContent = 'ลองใส่';
      b.append(t);
    }
    grid.append(b);
  }
}
$('btnWard').addEventListener('click', () => {
  if (paused) return;
  toggleEmotes(false);
  paused = true;
  paintWardrobe();
  $('wardOv').classList.remove('hidden');
});
/** รายการน้องแมว: ตัวที่มีจริงก่อน · โหมดทดลองต่อด้วยทุกสีขน (ลองเป็น) */
function catWardList(test) {
  const out = [
    { id: 'orange', skin: skinById('orange'), sub: 'ตัวหลัก' },
    { id: CUSTOM_ID, skin: skinById(CUSTOM_ID), sub: 'ระบายสีเอง' },
    ...grownCats().map((c) => { const s = catSkin(c); return { id: catSkinId(c), skin: s, sub: s.breedName }; }),
  ];
  if (test) for (const s of SKINS) if (s.id !== 'orange' && s.id !== CUSTOM_ID) out.push({ id: 'try:' + s.id, skin: s, try: true });
  return out;
}
function paintCats() {
  const grid = $('wardGrid');
  grid.replaceChildren();
  const test = wallet().mode !== 'server';
  $('wardSub').textContent = test
    ? 'โหมดทดลอง: มีครบทุกสี · สีที่ยังไม่มี = ลองเป็นในเมือง (ไม่บันทึก)'
    : 'แตะน้องเพื่อเปลี่ยนตัว · น้องจากกล่องที่โตแล้วมาเดินเล่นได้';
  const now = tryCat ? 'try:' + tryCat.id : getSkin().id;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  for (const x of catWardList(test)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ward' + (x.id === now ? ' on' : '') + (x.try ? ' try' : '');
    b.dataset.id = x.id;
    b.setAttribute('role', 'option');
    b.setAttribute('aria-selected', x.id === now ? 'true' : 'false');
    const pic = document.createElement('canvas');
    pic.width = pic.height = WARD_PX * dpr;
    const g = pic.getContext('2d');
    g.scale(dpr, dpr);
    // ตัวเปล่าไม่ใส่ชุด ให้เห็นสีขนชัด ๆ (ขนาดเดียวกับรูปในหน้าชุด)
    const sc = (WARD_PX * 0.7) * SC / 110;
    drawCat2(g, WARD_PX / 2, WARD_PX * 0.93, sc, { ...x.skin, outfit: null }, 0, { k: 1, shape: { turn: 0 } });
    const name = document.createElement('span');
    name.textContent = x.skin.name;
    b.append(pic, name);
    if (x.sub) {
      const sub = document.createElement('small');
      sub.textContent = x.sub;
      b.append(sub);
    }
    if (x.try) {
      const t = document.createElement('i');
      t.className = 'wtry';
      t.textContent = 'ลองเป็น';
      b.append(t);
    }
    grid.append(b);
  }
}
for (const t of document.querySelectorAll('.wtab')) {
  t.addEventListener('click', () => {
    if (wardTab === t.dataset.tab) return;
    wardTab = t.dataset.tab;
    sfx('click');
    paintWardrobe();
    $('wardGrid').scrollTop = 0;
  });
}
$('wardX').addEventListener('click', closeAll);
$('wardOv').addEventListener('click', (e) => { if (e.target === $('wardOv')) closeAll(); });
$('wardGrid').addEventListener('click', (e) => {
  const b = e.target.closest('.ward');
  if (!b || b.classList.contains('on')) return;
  const id = b.dataset.id;
  if (wardTab === 'cat') {
    if (id.startsWith('try:')) tryCat = SKINS.find((s) => s.id === id.slice(4)) || null;
    else { setSkin(id); tryCat = null; }
  } else if (isOwned(id)) { setOutfit(id); tryOutfit = null; }
  else tryOutfit = OUTFITS.find((o) => o.id === id) || null;
  stopEmote(true);
  sfx('collect');
  for (const x of $('wardGrid').querySelectorAll('.ward')) {
    const on = x === b;
    x.classList.toggle('on', on);
    x.setAttribute('aria-selected', on ? 'true' : 'false');
  }
});

// ── ตั้งค่า (เฉพาะหน้าเมือง) ───────────────────────────────────
// หัวข้อเสียง: เพลง / เอฟเฟกต์ — เก็บระดับแยกจากเกม (setTownMix ใน audio.js) · เพลง 0% = หยุดเพลงจริง
function paintVol(id, ch) {
  const v = Math.round(getTownMix(ch) * 100);
  $(id).value = String(v);
  $(id + 'Out').textContent = v + '%';
  $(id).style.setProperty('--fill', v + '%');
}
function openSettings() {
  toggleEmotes(false);
  paused = true;
  paintVol('volMusic', 'music');
  paintVol('volSfx', 'sfx');
  paintMute('volMusic', 'music', 'เสียงเพลง');
  paintMute('volSfx', 'sfx', 'เสียงเอฟเฟกต์');
  paintLightSeg();
  $('setOv').classList.remove('hidden');
}
$('btnSet').addEventListener('click', openSettings);
$('setX').addEventListener('click', closeAll);
$('setOv').addEventListener('click', (e) => { if (e.target === $('setOv')) closeAll(); });
$('volMusic').addEventListener('input', () => {
  setTownMix('music', Number($('volMusic').value) / 100);
  paintVol('volMusic', 'music');
  paintMute('volMusic', 'music', 'เสียงเพลง');
  applyVol('music');
});
// ปุ่มลำโพง (เหมือนหน้าแรก): ดังอยู่ = คลื่นเสียง · เงียบ = กากบาทพื้นแดง · กดปิดแล้วเปิดคืน = กลับระดับเดิมของช่องนั้น
const volBeforeMute = { music: 0, sfx: 0 };
function paintMute(id, ch, name) {
  const b = $(id + 'Mute');
  const muted = getTownMix(ch) <= 0;
  b.classList.toggle('muted', muted);
  b.setAttribute('aria-pressed', String(muted));
  b.setAttribute('aria-label', (muted ? 'เปิด' : 'ปิด') + name);
}
function applyVol(ch) {
  wakeAudio();   // พัก/เล่นเพลงตามระดับใหม่ (syncMusic)
}
for (const [id, ch, name] of [['volMusic', 'music', 'เสียงเพลง'], ['volSfx', 'sfx', 'เสียงเอฟเฟกต์']]) {
  $(id + 'Mute').addEventListener('click', () => {
    if (getTownMix(ch) > 0) { volBeforeMute[ch] = getTownMix(ch); setTownMix(ch, 0); }
    else setTownMix(ch, volBeforeMute[ch] > 0 ? volBeforeMute[ch] : 0.8);
    paintVol(id, ch);
    paintMute(id, ch, name);
    applyVol(ch);
    if (ch === 'sfx' && getTownMix('sfx') > 0) sfx('jump');
  });
}

// แตะพื้นเพื่อเดิน (ผู้ใช้ 28 ต.ค.: ค่าเริ่มต้น = ปิด) — ปิด: แตะพื้นไม่เดิน · แตะร้านเข้าได้เฉพาะตอนยืนหน้าประตู
const TAP_KEY = 'cookie-runner:town:tapMove';
let tapMove = false;
try { tapMove = localStorage.getItem(TAP_KEY) === '1'; } catch { /* ใช้ค่าเริ่มต้น */ }
function paintTapMove() {
  $('tapMove').setAttribute('aria-checked', String(tapMove));
  document.body.classList.toggle('tapmove', tapMove);
}
$('tapMove').addEventListener('click', () => {
  tapMove = !tapMove;
  try { localStorage.setItem(TAP_KEY, tapMove ? '1' : '0'); } catch { /* รอบนี้ยังใช้ได้ */ }
  if (!tapMove) { cat.target = null; cat.pending = null; mark = null; }
  paintTapMove();
});
paintTapMove();

// แสงและเงา: ผู้เล่นเลือกเอง ปิด/อ่อน/กลาง/เข้ม (ผู้ใช้ 16 พ.ย. 2026) · จำไว้ในเครื่องนี้ (light-fx.js) · ค่าเริ่มต้น = กลาง
function paintLightSeg() {
  for (const b of $('lightSeg').querySelectorAll('button')) b.setAttribute('aria-checked', String(Number(b.dataset.lv) === lightFxLevel()));
  $('rimSw').setAttribute('aria-checked', String(rimOn()));
  $('rimSw').closest('.setrow').classList.toggle('dim', !lightFxLevel());
  $('castSw').setAttribute('aria-checked', String(castOn()));
  $('castSw').closest('.setrow').classList.toggle('dim', !lightFxLevel());   // แสงปิดอยู่ = สวิตช์นี้ไม่มีผล (จางลง)
}
// เส้นแสงรอบตัว (rim-light.js · ผู้ใช้ 16 พ.ย.) — เปิด/ปิดแยกจากระดับแสง · จำในเครื่อง
$('rimSw').addEventListener('click', () => { setRimOn(!rimOn()); paintLightSeg(); sfx('click'); });
$('castSw').addEventListener('click', () => { setCastOn(!castOn()); paintLightSeg(); sfx('click'); });
$('lightSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  setLightFxLevel(Number(b.dataset.lv));
  paintLightSeg();
  sfx('click');
});
paintLightSeg();

// คำพูดลูกแมวพายเรือ: เปิด/ปิดในตั้งค่า (ผู้ใช้ 1 พ.ย.) · จำไว้ในเครื่องนี้ (ค่าเริ่มต้น = เปิด)
const FERRY_TALK_KEY = 'cookie-runner:town:ferryTalk';
let ferryTalkOn = true;
try { ferryTalkOn = localStorage.getItem(FERRY_TALK_KEY) !== '0'; } catch { /* ใช้ค่าเริ่มต้น */ }
function paintFerryTalk() { $('ferryTalkSw').setAttribute('aria-checked', String(ferryTalkOn)); }
$('ferryTalkSw').addEventListener('click', () => {
  ferryTalkOn = !ferryTalkOn;
  try { localStorage.setItem(FERRY_TALK_KEY, ferryTalkOn ? '1' : '0'); } catch { /* รอบนี้ยังใช้ได้ */ }
  if (!ferryTalkOn) ferryTalk = null;   // ปิด = ฟองที่ค้างอยู่หายทันที
  paintFerryTalk();
});
paintFerryTalk();

// แถบสอนปุ่มด้านล่าง (คอม): ผู้เล่นซ่อนได้ (ผู้ใช้ 31 ต.ค.) — กด H หรือสวิตช์ในตั้งค่า · จำไว้ในเครื่องนี้ (ค่าเริ่มต้น = แสดง)
const KEYHINT_KEY = 'cookie-runner:town:keyHint';
let keyHint = true;
try { keyHint = localStorage.getItem(KEYHINT_KEY) !== '0'; } catch { /* ใช้ค่าเริ่มต้น */ }
function paintKeyHint() {
  $('keyHintSw').setAttribute('aria-checked', String(keyHint));
  document.body.classList.toggle('hide-keyhint', !keyHint);
  // ปุ่มแยกมุมขวาล่าง (ผู้ใช้ 31 ต.ค.): บอกว่ากดแล้วจะเกิดอะไร — ซ่อนอยู่ = "แสดงปุ่มสอน"
  $('khToggleText').textContent = keyHint ? 'ซ่อนปุ่มสอน' : 'แสดงปุ่มสอน';
  $('khToggle').setAttribute('aria-pressed', String(!keyHint));
}
function setKeyHint(on) {
  keyHint = on;
  try { localStorage.setItem(KEYHINT_KEY, on ? '1' : '0'); } catch { /* รอบนี้ยังใช้ได้ */ }
  paintKeyHint();
}
$('keyHintSw').addEventListener('click', () => setKeyHint(!keyHint));
$('khToggle').addEventListener('click', (e) => { setKeyHint(!keyHint); e.currentTarget.blur(); sfx('click'); });
paintKeyHint();

let sfxPreviewAt = 0;
$('volSfx').addEventListener('input', () => {
  setTownMix('sfx', Number($('volSfx').value) / 100);
  paintVol('volSfx', 'sfx');
  paintMute('volSfx', 'sfx', 'เสียงเอฟเฟกต์');
  wakeAudio();
  // ฟังตัวอย่างตอนเลื่อน (เว้นช่วงกันเสียงรัว)
  const now = performance.now();
  if (now - sfxPreviewAt > 220) { sfxPreviewAt = now; sfx('jump'); }
});
function paintRun() {
  const b = $('btnRun');
  b.classList.toggle('on', running);
  b.setAttribute('aria-pressed', running ? 'true' : 'false');
  $('runLab').textContent = running ? 'วิ่ง!' : 'เดิน';
}
onTap($('btnRun'), () => { running = !running; paintRun(); });
paintRun();

// อ่านปุ่มจากตำแหน่งบนแป้น (e.code) ไม่ใช่ตัวอักษร — แป้นภาษาไทยกด E ได้ "ำ" กด Q ได้ "ๆ"
const keyOf = (e) => ({ KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyS: 'down', ArrowDown: 'down',
  KeyW: 'jump', ArrowUp: 'jump', Space: 'jump', Enter: 'jump', NumpadEnter: 'jump', KeyE: 'use', KeyQ: 'emote',
  ShiftLeft: 'shift', ShiftRight: 'shift', Escape: 'esc' })[e.code]
  || ({ Enter: 'jump', ' ': 'jump', Shift: 'shift', Escape: 'esc' })[e.key];
const SCOPE_KEY = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };
window.addEventListener('keydown', (e) => {
  // พิมพ์ในช่องข้อความ (ขอพร) = ไม่ใช่ปุ่มเดิน/กระโดด · Esc = ปิดหน้าต่าง
  if (e.target?.matches?.('textarea, input')) { if (e.code === 'Escape') { closeWish(); closeChat(); } return; }
  // แชต (ออนไลน์ในปราสาท): T เปิด/ปิดแผง · Esc ปิด
  if (e.code === 'KeyT' && online() && !e.repeat && (chatOpen() || !paused)) { e.preventDefault(); toggleChat(); return; }
  if (e.code === 'Escape' && chatOpen()) { closeChat(); return; }
  if ((e.code === 'Enter' || e.code === 'NumpadEnter') && chatOpen() && onlineMember()) { e.preventDefault(); focusChat(); return; }
  if (scope) {
    // ส่องกล้องอยู่: ลูกศร/WASD เลื่อน · + − ซูม · Esc / E ออก (e.code — แป้นไทยก็กดได้)
    const m = SCOPE_KEY[e.code];
    if (m) { e.preventDefault(); skeys[m] = true; }
    else if (!e.repeat && (e.code === 'Escape' || e.code === 'KeyE')) endScope();
    else if (e.code === 'Equal' || e.code === 'NumpadAdd') scopeZoom(scope, 1.12);
    else if (e.code === 'Minus' || e.code === 'NumpadSubtract') scopeZoom(scope, 1 / 1.12);
    return;
  }
  if (ride?.ph === 'dock' && !e.repeat) {
    if (e.code === 'KeyE') { dockChoice(false); return; }
    if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') { e.preventDefault(); dockChoice(true); return; }
  }
  if (photo) {
    // ถ่ายรูปอยู่: Esc = ออก · ถ่ายเสร็จแล้ว ปุ่มใดก็ได้ = ถ่ายใหม่ · หน้าเลือกท่า Enter/Space = กดชัตเตอร์
    if (e.repeat) return;
    if (e.key === 'Escape') endPhoto();
    else if (photo.phase === 'shot') { e.preventDefault(); photoAgain(); }
    else if (photo.phase === 'pose' && (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter')) {
      if (e.target !== document.body && e.target.matches?.(':focus-visible')) return;   // ปุ่มที่เลือกด้วย Tab = กดปุ่มนั้น
      e.preventDefault(); shutter();
    }
    return;
  }
  const k = keyOf(e);
  if (!routeOv.classList.contains('hidden') && (k === 'left' || k === 'right')) {   // หน้าแผนที่ล่องเรือ: ←/→ เลื่อนแผนที่
    e.preventDefault();
    if (!e.repeat) rmStep(k === 'left' ? -1 : 1);
    return;
  }
  if (k === 'shift') { if (!e.repeat && !paused) { running = !running; paintRun(); toast(running ? 'วิ่ง' : 'เดิน'); } }   // สลับเหมือนปุ่มวิ่งบนมือถือ
  else if (k === 'left') keys.left = true;
  else if (k === 'right') keys.right = true;
  else if (k === 'down' && !paused) {
    e.preventDefault();
    if (!e.repeat) wantDrop = true;
  }
  else if (k === 'jump' && !paused) {
    // ปุ่มที่เลือกด้วย Tab อยู่ (กรอบโฟกัสขึ้น) = ให้ Enter/Space กดปุ่มนั้นตามปกติ ไม่กระโดด
    if (e.target !== document.body && e.target.matches?.(':focus-visible')) return;
    e.preventDefault();
    if (!e.repeat) jump();   // กดค้างไม่เด้งรัว
  }
  else if (k === 'use' && !paused && !e.repeat) use(nearPlace());
  else if (k === 'emote' && !paused && !e.repeat) toggleEmotes();
  else if (k === 'esc') closeAll();
  else if (e.code === 'KeyH' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) setKeyHint(!keyHint);   // e.code: แป้นไทยก็กดได้
});
window.addEventListener('keyup', (e) => {
  if (SCOPE_KEY[e.code]) skeys[SCOPE_KEY[e.code]] = false;
  const k = keyOf(e);
  if (k === 'left') keys.left = false;
  else if (k === 'right') keys.right = false;
});

// แตะในฉาก: โดนร้าน/ม้านั่ง/ปราสาท = เดินไปหน้าประตูแล้วใช้งาน · โดนที่อื่น = เดินไปตรงนั้น
// ถ่ายรูปอยู่: แตะตรงไหนก็ได้ = กลับ (จับก่อนปุ่มอื่น ๆ — ปุ่มซ่อนอยู่แล้ว)
window.addEventListener('pointerdown', (e) => { if (photo?.phase === 'shot') { e.stopPropagation(); e.preventDefault(); photoAgain(); } }, { capture: true });
cv.addEventListener('pointerdown', (e) => {
  if (scope) {
    if (scope.dir > 0) { scopePts.set(e.pointerId, scopeXY(e)); scope.drag = true; }
    return;
  }
  if (paused) return;
  const r = cv.getBoundingClientRect();
  const sx = ((e.clientX - r.left) / r.width) * cv.width / k;
  const sy = ((e.clientY - r.top) / r.height) * cv.height / k;
  const wx = sx + camX, wy = sy - camY;
  // แตะตัวตึก (เหนือเส้นถนน) = ไปเข้าร้าน · แตะถนนหน้าร้าน = แค่เดินไปตรงนั้น (ไม่เปิดร้านเอง)
  const hit = WD.places.find((p) => {
    const gy = p.gy ?? GY;
    return p.kind !== 'deco' && wx >= p.x && wx <= p.x + p.w && wy >= gy - p.h - 20 && wy <= gy - 4;
  });
  if (hit) {
    mark = null;
    if (hit.tap) use(hit);   // โคมไฟ: แตะแล้วเปิด/ปิดทันที ไม่ต้องเดินไป
    else if (nearPlace() === hit) use(hit);
    else if (tapMove) { cat.target = (SEAT[hit.kind] && seatX(hit, wx, seatsTaken(hit))) ?? seatX(hit, wx); cat.pending = hit; }   // แตะที่นั่ง = เดินไปช่องว่างที่ใกล้สุด
  } else if (tapMove) {
    cat.target = Math.max(40, Math.min(WD.w - 40, wx));
    cat.pending = null;
    mark = { x: cat.target, t: tick };   // รอยอุ้งเท้าตรงจุดหมาย
  }
});

// ── ยก/ลาก/ลูบน้องในห้องเลี้ยง (ผู้ใช้ 15 พ.ย. 2026 — home-cats.js grabKit/dropGrab/petKit) ──
// นิ้วลงบนตัวน้อง = จับไว้ก่อน (ไม่สั่งตัวเราเดิน) · ลากเกิน 8 จุด = ยกขึ้น · ไม่ขยับแล้วปล่อย = ลูบ
function nurseXY(e) {
  const r = cv.getBoundingClientRect();
  const sx = ((e.clientX - r.left) / r.width) * cv.width / k, sy = ((e.clientY - r.top) / r.height) * cv.height / k;
  return { sx, sy, wx: sx + camX, wy: sy - camY };
}
cv.addEventListener('pointerdown', (e) => {
  if (WD !== NURSERY || paused || scope || photo || kd) return;
  const p = nurseXY(e), kit = kitAt(kitsNow(), p.wx, p.wy);
  if (!kit) return;
  e.stopImmediatePropagation(); e.preventDefault();
  kd = { kit, x0: p.sx, y0: p.sy, sx: p.sx, sy: p.sy, moved: false, id: e.pointerId };
  try { cv.setPointerCapture(e.pointerId); } catch { /* บางเครื่องไม่รองรับ — ยังลากได้ผ่าน window */ }
}, { capture: true });
window.addEventListener('pointermove', (e) => {
  if (!kd || e.pointerId !== kd.id) return;
  const p = nurseXY(e);
  kd.sx = p.sx; kd.sy = p.sy;
  if (!kd.moved && Math.hypot(p.sx - kd.x0, p.sy - kd.y0) > 8) { kd.moved = true; grabKit(kitsNow(), kd.kit, p.wx, p.wy); }
});
function kitRelease(e) {
  if (!kd || e.pointerId !== kd.id) return;
  if (kd.moved) { const what = dropGrab(kitsNow()); if (what) toast(`${kd.kit.name} · ${what}`); }
  else if (e.type === 'pointerup') petKit(kitsNow(), kd.kit);
  kd = null;
}
window.addEventListener('pointerup', kitRelease);
window.addEventListener('pointercancel', kitRelease);

// ปุ่ม L = เปิด/ปิดชั้นแสง (ทุกฉากที่มีแสง) — e.code (แป้นไทยกด L ได้ "ส")
window.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyL' || e.repeat || e.target?.matches?.('textarea, input')) return;
  if (scene === 'shop' || !sceneEnv()) return;
  toast(toggleLightFx() ? '✨ เอฟเฟกต์แสง: เปิด' : 'เอฟเฟกต์แสง: ปิด');
});
if (import.meta.env.DEV) window.__lightfx = { on: lightFxOn, toggle: toggleLightFx };
if (import.meta.env.DEV) window.__addPeer = (dx = 120, look = {}) => { const q = newPeer('t' + Math.random().toString(36).slice(2, 6)); Object.assign(q, { w: WD.id, x: cat.x + dx, y: WD.ground(cat.x + dx), name: 'เพื่อนทดสอบ' }, look); q.P.y = q.y; peers.set(q.id, q); return q.id; };   // ทดสอบแสง/เงากับแมวตัวอื่น (dev)
if (import.meta.env.DEV) window.__ride = () => { const from = PIERS.find((p) => p.id === boat.at) || PIERS[0]; startRide(from, [PIERS.find((p) => p !== from)]); return from.id; };   // ทดสอบ: ล่องเรือทันที (dev)
if (import.meta.env.DEV) window.__lamp = () => toggleLamp(tick);   // ทดสอบ: เปิด/ปิดโคมชั้น 2 (dev)
if (import.meta.env.DEV) window.__tp = (x, y = null) => { cat.x = x; cat.y = y ?? WD.ground(x); cat.target = null; if (y != null) { cat.P.onGround = false; cat.P.vy = 0; cat.on = null; } return x; };   // ทดสอบ: วาร์ปไปจุด x (y = ปล่อยตกจากความสูงนั้น) (dev)
if (import.meta.env.DEV) window.__catScr = () => { const r = cv.getBoundingClientRect(); return { x: r.left + (cat.x - camX) * k * r.width / cv.width, y: r.top + (cat.y + camY) * k * r.height / cv.height }; };   // ทดสอบแสงขอบ: จุดเท้าน้องบนจอ
// แผงทดลองแสง (ความแรง + เวลา) บนดาดฟ้า — dev server หรือ ?fxpanel
if (import.meta.env.DEV || new URLSearchParams(location.search).has('fxpanel')) import('./light-fx-panel.js').then((m) => m.mountLightPanel({ visible: () => scene !== 'shop' && WD !== TOWN && WD !== GARDEN && !!sceneEnv() }));   // เมือง/สวน: ฟ้าคงที่ ปุ่มเวลาไม่มีผล

// ── HUD ทอง + โหมด ─────────────────────────────────────────────
const fmt = (n) => Math.floor(n).toLocaleString('en-US');
function paintHud() {
  const W = wallet();
  $('goldNum').textContent = fmt(W.gold);
  $('gemNum').textContent = fmt(getGems());   // เพชรชมพู (ของเกม — เมืองยังไม่มีที่ใช้เพชร)
  const m = $('modeTag');
  m.textContent = W.mode === 'server' ? 'เชื่อมเซิร์ฟเวอร์ · ใช้ทองจริงของบัญชี' : 'โหมดทดลอง · ' + W.reason + ' (ทองทดลอง ไม่แตะทองจริง)';
  m.classList.toggle('demo', W.mode !== 'server');
}

let toastT = 0;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('on'), 2200);
}

// ── ร้าน: ฉากในร้าน (canvas เดิม — interior.js) + แผงสินค้า (HTML ชุดเดียวทุกร้าน สีตาม data-shop) ──
// เข้าร้าน: ม่านจางขาว ~14 เฟรม → สลับฉากเป็นในร้าน → ม่านจางออก + แผงเลื่อนเข้า · ออกจากร้าน: กลับทางเดิม
// ในร้านไม่วาดเมือง (วาดแค่ภาพฉากในร้านจากแคช + ของขยับไม่กี่ชิ้น) · ลูปเดิมลูปเดียว
// แผง: สร้างการ์ดครั้งเดียวต่อการเข้าร้าน · ซื้อแล้วอัปเดตแค่สถานะ (refreshShop) · ไอคอนวาดครั้งเดียวเก็บเป็นภาพ (iconSrc)
// คลิกการ์ดใช้ตัวรับตัวเดียวทั้งตาราง (ไม่ผูก listener ต่อการ์ด)
const SAY = {
  food: ['ยินดีต้อนรับสู่ร้านขนมเหมียว! วันนี้อบสด ๆ เลยนะ', 'ขอบคุณที่อุดหนุนนะเหมียว อร่อยแน่นอน!'],
  care: ['เข้ามาเลยเหมียว ยาดี ๆ ปรุงใหม่ทุกวัน', 'รับไปแล้วนะ ดูแลน้องดี ๆ น้า'],
  home: ['โรงช่างเหมียวยินดีต้อนรับ! อยากอัปเกรดอะไรดี?', 'เรียบร้อย! แข็งแรงทนทานแน่นอนเหมียว'],
  toy: ['ว้าว มีลูกค้า! ของเล่นใหม่เพียบเลยเหมียว', 'ขอให้สนุกกับของเล่นนะเหมียว!'],
  exchange: ['ร้านแลกของรางวัลยินดีต้อนรับเหมียว', 'แลกสำเร็จ! เก็บทองไว้ดี ๆ นะ'],
};
const FACT = {
  food: 'ใช้ป้อนน้องในบ้านลูกเหมียว',
  toy: 'ซื้อครั้งเดียว เล่นได้ตลอด',
  care: 'ใช้กับน้องในบ้านลูกเหมียว',
  home: 'อัปเกรดถาวร · ซื้อได้ครั้งเดียว',
};
let shopPlace = null, exStep = 1, selId = null;
let fade = 0, fadeDir = 0, fadeThen = null;
let keepX = 220;               // กึ่งกลางเจ้าของร้าน (หน่วยโลก) — ซ้ายของแผงสินค้า
const shopOv = $('shopOv');

let shopView = { s: 1, oy: 0 };   // ฉากในร้าน: ย่อ s เท่า เลื่อนลง oy (หน่วยโลก) — จอแนวตั้ง
/**
 * วางเจ้าของร้านในพื้นที่ที่แผงไม่บัง + ฟองคำพูดเหนือหัว
 * จอแนวนอน: น้องกลางพื้นที่ซ้ายของแผง (เคาน์เตอร์ล้นขอบได้ แต่ตัวน้องต้องพ้นแผง — จอ iPad แคบกว่าคอม)
 * จอแนวตั้ง (แผงอยู่ล่าง): ย่อฉากให้ช่วงเหนือหัวน้อง..ขอบเคาน์เตอร์ พอดีพื้นที่เหนือแผง
 */
function measureKeep() {
  // ตำแหน่งแผงจริง (offset ไม่นับ transform — ตอนเปิดร้านแผงยังเลื่อนเข้าอยู่ 40px)
  const sp = shopOv.querySelector('.sp');
  const r = { left: sp.offsetLeft, top: sp.offsetTop };
  const W = window.innerWidth, Hc = window.innerHeight, px = H / Hc;   // css → หน่วยโลก
  if (Hc >= W) {
    const Hv = r.top * px, y0 = KEEP_TOP - 60, y1 = COUNTER + 26;   // เว้นเหนือหัวไว้ให้ฟองคำพูดสองบรรทัด
    const s = Math.min(1, Hv / (y1 - y0));
    shopView = { s, oy: Hv - y1 * s };
    keepX = vw / s / 2;
  } else {
    shopView = { s: 1, oy: 0 };
    const free = (r.left > 120 ? r.left : W) * px;
    keepX = Math.max(Math.min(170, free - 80), free / 2, 80);
  }
  // ปลายฟองชี้ลงเหนือหัวน้องพอดี (ยึดขอบล่าง — ข้อความกี่บรรทัดก็ไม่ทับหัว)
  const { s, oy } = shopView;
  sayGeo = { kx: keepX * s / px, free: Hc >= W ? W : (r.left > 120 ? r.left : W) };
  const el = $('shopSay');
  el.style.maxWidth = '';
  const cssMax = parseFloat(getComputedStyle(el).maxWidth) || 300;
  el.style.maxWidth = Math.min(cssMax, sayGeo.free - 24) + 'px';
  el.style.top = 'auto';
  el.style.bottom = (Hc - (oy + KEEP_TOP * s) / px + 4) + 'px';
  placeSay();
  fitShopNames();
}
/**
 * ชื่อของบรรทัดเดียว (ผู้ใช้ 1 พ.ย.: iPad ชื่อตกสองบรรทัด) — ชื่อยาวเกินช่อง = ย่อตัวอักษรลงพอดีช่อง
 * ย่อได้ถึง 72% ของขนาดเดิม · ยังไม่พอจริง ๆ ค่อยตัดเป็นสองบรรทัด (text-wrap: balance เดิม)
 */
function fitOneLine(el, minK = 0.72) {
  if (!el || !el.isConnected) return;
  el.style.fontSize = '';
  const have = el.clientWidth;
  if (!have) return;
  const base = parseFloat(getComputedStyle(el).fontSize);
  el.style.whiteSpace = 'nowrap';   // วัดความยาว/ความสูงบรรทัดเดียวจริง (คืนค่าเดิมทันที)
  const need = el.scrollWidth, one = el.offsetHeight;
  el.style.whiteSpace = '';
  const single = (f) => el.offsetHeight <= one * (f / base) + 1.5;
  if (single(base)) return;
  // ความกว้างวัดได้ปัดเศษพิกเซล — เผื่อ 3px แล้วเช็คความสูงจริง ยังสองบรรทัด = ย่ออีกทีละ 5%
  let f = Math.max(base * minK, (base * (have - 3)) / need);
  for (let i = 0; i < 5; i++) {
    el.style.fontSize = f.toFixed(2) + 'px';
    if (single(f) || f <= base * minK) break;
    f = Math.max(base * minK, f * 0.95);
  }
}
function fitShopNames() {
  if (scene !== 'shop') return;
  for (const el of shopOv.querySelectorAll('.sc-name, .pr-name, .sd-name')) fitOneLine(el);
}
document.fonts?.ready.then(() => fitShopNames());   // ฟอนต์มาทีหลัง = ความกว้างเปลี่ยน
/** ฟองคำพูดอยู่ในพื้นที่ว่างซ้ายของแผงเสมอ — ถ้าต้องเลื่อนตัวฟอง ปลายฟอง (--tail) ยังชี้หัวน้อง */
let sayGeo = { kx: 0, free: 0 };
function placeSay() {
  const el = $('shopSay');
  const w = el.offsetWidth || 200, { kx, free } = sayGeo;
  const left = Math.max(w / 2 + 8, Math.min(kx, free - w / 2 - 8));
  const tail = Math.max(-(w / 2 - 18), Math.min(w / 2 - 18, kx - left));
  el.style.left = left + 'px';
  el.style.setProperty('--tail', tail + 'px');
}
// แม่ค้ามองตามผู้เล่น: คอม = เมาส์ขยับ (มองค้าง 4 วิหลังหยุด) · จิ้ม/คลิกเลือกของ = มองจุดนั้น 2.5 วิ
// พิกัดจอ → หน่วยโลก: canvas เต็มจอ สเกลเท่ากันสองแกน (H / ความสูงจอ)
const lookAt = (e, hold) => { if (scene === 'shop') keeperLook(e.clientX * H / window.innerHeight, e.clientY * H / window.innerHeight, hold); };
window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') lookAt(e, 240); }, { passive: true });
window.addEventListener('pointerdown', (e) => lookAt(e, e.pointerType === 'mouse' ? 240 : 150), { passive: true, capture: true });
function say(text) {
  const el = $('shopSay');
  el.textContent = text;
  placeSay();
  el.classList.remove('pop');
  void el.offsetWidth;   // เล่นแอนิเมชันเด้งซ้ำ
  el.classList.add('pop');
}

function openShop(p) {
  if (fadeDir) return;
  shopPlace = p;
  paused = true;
  sfx('meow');      // เจ้าของร้านทักตอนเข้าร้าน
  toggleEmotes(false);
  stopEmote(true);
  keys.left = keys.right = false;
  joyReset();
  mark = null;
  fadeDir = 1;
  fadeThen = () => {
    scene = 'shop';
    document.body.classList.add('in-shop');
    shopOv.dataset.shop = p.tab;
    shopOv.classList.remove('hidden', 'closing');
    buildShop();
    measureKeep();
    say(SAY[p.tab][0]);
    fadeDir = -1;
  };
}
function leaveShop() {
  if (fadeDir || scene !== 'shop') return;
  shopOv.classList.add('closing');
  fadeDir = 1;
  fadeThen = () => {
    scene = 'town';
    shopOv.classList.add('hidden');
    document.body.classList.remove('in-shop');
    clearInterval(promo.timer);
    clearInterior();
    paused = false;
    fadeDir = -1;
  };
}
/** ม่านจาง (เรียกจาก update) */
function stepFade(dt) {
  if (!fadeDir) return;
  fade = Math.max(0, Math.min(1, fade + fadeDir * dt / (warping ? 30 : 14)));
  if (fadeDir > 0 && fade >= 1) { const f = fadeThen; fadeThen = null; f?.(); }
  else if (fadeDir < 0 && fade <= 0) { fadeDir = 0; warping = false; }
}
function closeAll() {
  if (emoteOpen()) { toggleEmotes(false); return; }
  if (closeFeed() || closeBath()) return;
  if (!$('wardOv').classList.contains('hidden')) { $('wardOv').classList.add('hidden'); if (scene !== 'shop') paused = false; return; }
  if (!$('setOv').classList.contains('hidden')) { $('setOv').classList.add('hidden'); if (scene !== 'shop') paused = false; return; }
  if (!$('bagOv').classList.contains('hidden')) { $('bagOv').classList.add('hidden'); if (scene !== 'shop') paused = false; return; }
  if (!$('memOv').classList.contains('hidden')) { $('memOv').classList.add('hidden'); if (scene !== 'shop') paused = false; return; }
  if (!routeOv.classList.contains('hidden')) { routeOv.classList.add('hidden'); paused = false; return; }
  if (!mirrorOv.classList.contains('hidden')) { closeMirror(); return; }
  if (!wishOv.classList.contains('hidden')) { closeWish(); return; }
  if (scene === 'shop') leaveShop();
}
// ── เคาน์เตอร์ต้อนรับ (ปราสาทชั้น 1) วาปไปที่ต่าง ๆ — เลือกปลายทาง: ชั้นในปราสาท · หน้าแรก · ห้องน้อง · เมือง ──
// หน้าแรก/ห้องน้อง = กลับเข้าเกม (index.html?from=town · go=room เปิดบ้านน้องให้เลย) · ชั้น 2/3 ยังสร้างอยู่ (กดไม่ได้)
const mirrorOv = $('mirrorOv');
function openMirror() {
  toggleEmotes(false);
  paused = true;
  keys.left = keys.right = false;
  joyReset();
  sfx('warp');
  mirrorOv.classList.remove('hidden');
}
function closeMirror(silent = false) {
  if (mirrorOv.classList.contains('hidden')) return;
  mirrorOv.classList.add('hidden');
  if (!silent) paused = false;
}
$('mirrorX').addEventListener('click', () => closeMirror());
mirrorOv.addEventListener('click', (e) => {
  if (e.target === mirrorOv) { closeMirror(); return; }
  const b = e.target.closest('.mw-go');
  if (!b || b.disabled) return;
  const to = b.dataset.to;
  sfx('click');
  if (to === 'room') {
    closeMirror(true);
    paused = false;
    warp(NURSERY, NURSE_SPAWN, 'ห้องเลี้ยงน้องแมวของฉัน');   // บ้านลูกเหมียวแบบใหม่ (home.js)
  } else if (to === 'home') {
    closeMirror(true);
    fadeDir = 1;
    fadeThen = () => { location.href = './index.html?from=town'; };
  } else if (to === 'f2' || to === 'f3') {
    closeMirror(true);
    paused = false;
    if (to === 'f2') warp(LOUNGE, L_SPAWN, 'วาปมาชั้น 2 · Cozy Lounge แล้ว');
    else warp(ROOF, R_SPAWN, 'วาปมาชั้น 3 · Starry Rooftop แล้ว');
  } else if (to === 'town') {
    closeMirror(true);
    paused = false;
    warp(TOWN, FOUNTAIN_X + 120, 'วาปมาที่ลานน้ำพุกลางเมืองแล้ว');
  }
});
$('shopX').addEventListener('click', leaveShop);
$('bagX').addEventListener('click', closeAll);
$('btnBag').addEventListener('click', () => { toggleEmotes(false); paused = true; paintBag(); $('bagOv').classList.remove('hidden'); });

// ── ไอคอนสินค้า: วาดครั้งเดียว เก็บเป็นภาพ ──
const iconCache = new Map();
function iconSrc(icon) {
  if (!/^[a-z]+$/.test(icon)) return null;
  let u = iconCache.get(icon);
  if (!u) {
    const c = document.createElement('canvas');
    c.width = c.height = 120;
    const g = c.getContext('2d');
    g.scale(3, 3);
    drawItemIcon(g, icon);
    u = c.toDataURL();
    iconCache.set(icon, u);
  }
  return u;
}
function iconEl(it, cls) {
  const d = document.createElement('div');
  d.className = cls;
  const src = iconSrc(it.icon);
  if (src) { const im = new Image(); im.src = src; im.alt = ''; d.appendChild(im); }
  else d.textContent = it.icon;
  if (it.pack) { const b = document.createElement('i'); b.className = 'pack'; b.textContent = '×' + it.pack[0]; d.appendChild(b); }
  return d;
}

/** สถานะของสินค้าตอนนี้ (ราคาตามเซิร์ฟเวอร์ถ้าเชื่อมอยู่) */
function itemState(it) {
  const W = wallet();
  const c = catalogItem(it.id);
  const price = c ? c.price : it.price;
  const have = c ? (W.bag[c.gives] || 0) : 0;
  const maxed = !!(c?.max_own && have >= c.max_own);
  return { price, have, maxed, poor: !maxed && W.gold < price };
}
const shopItems = () => SHOP_ITEMS[shopPlace?.tab] || [];

function buildShop() {
  const p = shopPlace;
  const tab = SHOP_TABS.find((x) => x.id === p.tab);
  $('shopName').textContent = p.name;
  $('shopSub').textContent = tab ? tab.title : '';
  const ex = p.tab === 'exchange';
  $('shopGrid').classList.toggle('hidden', ex);
  $('shopDetail').classList.toggle('hidden', ex);
  $('shopEx').classList.toggle('hidden', !ex);
  $('shopPop').classList.remove('on');
  buildPromo(ex);
  if (ex) { paintExchange(); refreshShop(); return; }
  const grid = $('shopGrid');
  grid.replaceChildren();
  for (const it of shopItems()) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sp-card';
    b.dataset.id = it.id;
    b.setAttribute('role', 'option');
    b.appendChild(iconEl(it, 'sc-ico'));
    if (it.tag) { const t = document.createElement('b'); t.className = 'sc-tag'; t.dataset.kind = TAG_KIND[it.tag] || 'hot'; t.textContent = it.tag; b.appendChild(t); }
    const nm = document.createElement('span'); nm.className = 'sc-name'; nm.textContent = it.name;
    const pr = document.createElement('span'); pr.className = 'sc-price';
    b.append(nm, pr);
    grid.appendChild(b);
  }
  selId = shopItems()[0]?.id || null;
  refreshShop();
}

// ── โซนโปรโมชั่น (ผู้ใช้ 1 พ.ย.): ป้ายสไลด์ของเด่นประจำร้านบนสุดของแผง ──
// ของเด่น = ของที่มีป้าย (โปรวันนี้ / คุ้ม / ใหม่) หรือแพ็ก · ร้านที่ไม่มี = ชิ้นแรก "แม่ค้าแนะนำ"
// ข้อความในป้ายเป็นตัวเลขจริงเท่านั้น: แพ็ก = ราคาปกติ (ราคาชิ้นเดี่ยว × จำนวน) ขีดฆ่า + ประหยัดกี่ทอง
// ไม่มีนับถอยหลัง/ลดราคาปลอม (กฎ Play · ผู้เล่นเด็ก) · แตะป้าย = เลือกของชิ้นนั้นในแผง
const TAG_KIND = { 'โปรวันนี้': 'hot', 'คุ้ม': 'deal', 'ใหม่': 'new' };
const PROMO_MS = 4500;
let promo = { list: [], at: 0, timer: 0 };
function promoInfo(it) {
  const st = itemState(it);
  let kicker = 'แม่ค้าแนะนำ', kind = 'rec', deal = it.desc, was = 0;
  if (it.pack) {
    kicker = 'แพ็กสุดคุ้ม'; kind = 'deal';
    const base = shopItems().find((x) => x.icon === it.icon && !x.pack);
    const full = base ? itemState(base).price * it.pack[0] : 0;
    if (full > st.price) { was = full; deal = `${it.pack[0]} ชิ้น ประหยัด ${fmt(full - st.price)} ทอง`; }
  } else if (it.tag) { kicker = it.tag === 'ใหม่' ? 'มาใหม่!' : it.tag; kind = TAG_KIND[it.tag] || 'hot'; }
  return { st, kicker, kind, deal, was };
}
function buildPromo(ex) {
  clearInterval(promo.timer);
  const box = $('shopPromo');
  box.replaceChildren();
  const tagged = ex ? [] : shopItems().filter((it) => it.tag || it.pack);
  const list = ex ? [] : tagged.length ? tagged : shopItems().slice(0, 1);
  promo = { list, at: 0, timer: 0 };
  box.classList.toggle('hidden', !list.length);
  box.parentElement.classList.toggle('has-promo', list.length > 0);
  if (!list.length) return;
  const dots = document.createElement('div');
  dots.className = 'pr-dots';
  list.forEach((it, i) => {
    const info = promoInfo(it);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pr-slide';
    b.dataset.id = it.id;
    b.dataset.kind = info.kind;
    b.innerHTML = '<span class="pr-burst"><i class="pr-ear l"></i><i class="pr-ear r"></i><span class="pr-ray"></span></span>'
      + '<span class="pr-txt"><span class="pr-kick"></span><b class="pr-name"></b><small class="pr-deal"></small></span>'
      + '<span class="pr-cost"><s class="pr-was"></s><span class="pr-price"></span></span>'
      + '<i class="pr-spark a">✦</i><i class="pr-spark b">✦</i><i class="pr-spark c">✦</i>';
    b.querySelector('.pr-burst').appendChild(iconEl(it, 'pr-ico'));
    b.querySelector('.pr-kick').textContent = info.kicker;
    b.querySelector('.pr-name').textContent = it.name;
    b.querySelector('.pr-deal').textContent = info.deal;
    b.setAttribute('aria-label', `${info.kicker}: ${it.name}`);
    box.appendChild(b);
    if (list.length > 1) {
      const d = document.createElement('button');
      d.type = 'button';
      d.setAttribute('aria-label', `โปร ${i + 1}`);
      d.addEventListener('click', (e) => { e.stopPropagation(); showPromo(i, true); });
      dots.appendChild(d);
    }
  });
  if (list.length > 1) box.appendChild(dots);
  showPromo(0, true);
}
/** แสดงป้ายที่ i (restart = เริ่มนับเวลาเลื่อนใหม่ — ผู้เล่นเพิ่งแตะเอง) */
function showPromo(i, restart) {
  const box = $('shopPromo');
  const n = promo.list.length;
  if (!n) return;
  promo.at = ((i % n) + n) % n;
  box.querySelectorAll('.pr-slide').forEach((s, k) => s.classList.toggle('on', k === promo.at));
  box.querySelectorAll('.pr-dots button').forEach((d, k) => d.classList.toggle('on', k === promo.at));
  if (restart && n > 1) {
    clearInterval(promo.timer);
    promo.timer = setInterval(() => { if (scene === 'shop' && !document.hidden) showPromo(promo.at + 1); }, PROMO_MS);
  }
}
/** ราคา/สถานะบนป้าย (ซื้อแล้ว · ทองเปลี่ยน) — เรียกจาก refreshShop */
function refreshPromo() {
  for (const s of $('shopPromo').querySelectorAll('.pr-slide')) {
    const it = shopItems().find((x) => x.id === s.dataset.id);
    if (!it) continue;
    const info = promoInfo(it);
    s.querySelector('.pr-was').textContent = info.was && !info.st.maxed ? fmt(info.was) : '';
    s.querySelector('.pr-price').innerHTML = info.st.maxed ? 'มีแล้ว' : `<i class="coin"></i>${fmt(info.st.price)}`;
    s.classList.toggle('owned', info.st.maxed);
    s.classList.toggle('sel', it.id === selId);
  }
}
$('shopPromo').addEventListener('click', (e) => {
  const s = e.target.closest('.pr-slide');
  if (!s) return;
  selId = s.dataset.id;
  refreshShop();
  $('shopGrid').querySelector(`.sp-card[data-id="${selId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  showPromo(promo.at, true);   // แตะแล้วค้างป้ายนี้ไว้อีกรอบเต็ม
});

// ตัวรับคลิกตัวเดียวทั้งตาราง
$('shopGrid').addEventListener('click', (e) => {
  const b = e.target.closest('.sp-card');
  if (!b) return;
  selId = b.dataset.id;
  refreshShop();
});

/** อัปเดตสถานะ (ไม่สร้างการ์ดใหม่): ทอง · ราคา/ป้ายบนการ์ด · ช่องรายละเอียด */
function refreshShop() {
  const W = wallet();
  $('shopGold').textContent = fmt(W.gold);
  if (shopPlace?.tab === 'exchange') return;
  refreshPromo();
  for (const b of $('shopGrid').children) {
    const it = shopItems().find((x) => x.id === b.dataset.id);
    const st = itemState(it);
    b.classList.toggle('sel', b.dataset.id === selId);
    b.setAttribute('aria-selected', b.dataset.id === selId ? 'true' : 'false');
    b.classList.toggle('owned', st.maxed);
    b.classList.toggle('poor', st.poor);
    b.querySelector('.sc-price').innerHTML = st.maxed ? 'มีแล้ว' : `<i class="coin"></i>${fmt(st.price)}`;
  }
  const it = shopItems().find((x) => x.id === selId);
  if (!it) return;
  const st = itemState(it);
  const ico = $('sdIco');
  ico.replaceChildren(...iconEl(it, 'sd-ico-in').childNodes);
  $('sdName').textContent = it.name;
  fitOneLine($('sdName'));
  const tag = $('sdTag');
  tag.textContent = it.tag || '';
  tag.dataset.kind = TAG_KIND[it.tag] || 'hot';
  tag.classList.toggle('hidden', !it.tag);
  $('sdDesc').textContent = it.desc;
  const facts = [
    it.pack ? `ได้รับ ×${it.pack[0]} ชิ้น (ลด ${it.pack[1]}%)` : 'ได้รับ 1 ชิ้น',
    FACT[shopPlace.tab],
    `มีในกระเป๋า ${fmt(st.have)} ชิ้น`,
  ];
  if (!st.maxed && !st.poor) facts.push(`ทองหลังซื้อ ${fmt(W.gold - st.price)}`);
  $('sdFacts').replaceChildren(...facts.map((f) => { const li = document.createElement('li'); li.textContent = f; return li; }));
  $('sdPrice').textContent = fmt(st.price);
  const state = $('sdState');
  const btn = $('sdBtn');
  state.className = 'sd-state';
  if (st.maxed) {
    state.textContent = shopPlace.tab === 'home' ? 'อัปเกรดแล้ว (ระดับสูงสุด)' : 'มีของชิ้นนี้แล้ว';
    state.classList.add('ok');
    btn.disabled = true;
    btn.textContent = shopPlace.tab === 'home' ? 'สูงสุดแล้ว' : 'มีแล้ว';
  } else if (st.poor) {
    state.textContent = `ทองไม่พอ · ขาดอีก ${fmt(st.price - W.gold)} ทอง`;
    state.classList.add('bad');
    btn.disabled = true;
    btn.textContent = 'ทองไม่พอ';
  } else {
    state.textContent = '';
    btn.disabled = false;
    btn.textContent = 'ซื้อเลย';
  }
}

$('sdBtn').addEventListener('click', async () => {
  const it = shopItems().find((x) => x.id === selId);
  if (!it) return;
  const btn = $('sdBtn');
  btn.disabled = true;
  btn.textContent = 'กำลังซื้อ…';
  const res = await buy(it.id);
  if (res.ok) {
    popDone(`ซื้อ "${it.name}" แล้ว!`);
    say(SAY[shopPlace.tab][1]);
  } else {
    say(res.msg === 'ทองไม่พอ' ? 'อ๊ะ ทองยังไม่พอนะเหมียว' : res.msg);
    const st = $('sdState');
    st.textContent = res.msg;
    st.className = 'sd-state bad shake';
  }
  paintHud();
  refreshShop();
});

/** ป้ายสำเร็จกลางแผง + เหรียญเด้ง (องค์ประกอบเดียวใช้ซ้ำ) */
let popT = 0;
function popDone(text) {
  sfx('collect');   // ซื้อ/แลกสำเร็จ "ติ๊ง-ติ๊ง"
  const el = $('shopPop');
  el.textContent = text;
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
  clearTimeout(popT);
  popT = setTimeout(() => el.classList.remove('on'), 1600);
}

/** ร้านแลกของรางวัล: แลกค่าขนมเป็นทอง (ใช้ wallet.exchange — กติกาเดิม) */
function paintExchange() {
  const W = wallet();
  const { got, used, cap } = W.today;
  const left = Math.max(0, got - used);
  const per = EXCHANGE.treats / EXCHANGE.gold;
  const pick = Math.floor((left * exStep) / per) * per;
  const box = $('shopEx');
  box.innerHTML = `
    <div class="ex">
      <div class="exrow"><span>ค่าขนมที่เก็บได้วันนี้</span><b>${fmt(got)} / ${fmt(cap)}</b></div>
      <div class="bar"><i style="width:${Math.min(100, (got / cap) * 100)}%"></i></div>
      <div class="exrow small"><span>แลกไปแล้ว ${fmt(used)}</span><span>ยังแลกได้ ${fmt(left)}</span></div>
      <div class="rate"><span class="chip t">${fmt(EXCHANGE.treats)} ค่าขนม</span><span>➜</span><span class="chip g"><i class="coin"></i>${fmt(EXCHANGE.gold)}</span></div>
      <div class="exrow"><span>จำนวนที่จะแลก</span><span class="steps"></span></div>
      <div class="exrow small"><span>แลก ${fmt(pick)} ค่าขนม</span><span>ได้ ${fmt(pick / per)} ทอง</span></div>
    </div>`;
  const ex = box.firstElementChild;
  const steps = ex.querySelector('.steps');
  for (const s of EXCHANGE.steps) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'step' + (s === exStep ? ' on' : '');
    b.textContent = s === 1 ? 'ทั้งหมด' : s === 0.5 ? '½' : '¼';
    b.addEventListener('click', () => { exStep = s; paintExchange(); });
    steps.appendChild(b);
  }
  const go = document.createElement('button');
  go.type = 'button';
  go.className = 'sd-btn';
  go.textContent = pick < per ? 'ค่าขนมยังไม่พอแลก' : 'แลกเลย';
  go.disabled = pick < per;
  go.addEventListener('click', async () => {
    go.disabled = true;
    go.textContent = 'กำลังแลก…';
    const res = await exchange(pick);
    if (res.ok) { popDone(`แลกสำเร็จ! ได้ ${fmt(res.gold)} ทอง`); say(SAY.exchange[1]); }
    else say(res.msg);
    paintHud();
    refreshShop();
    paintExchange();
  });
  ex.appendChild(go);
}

// ── กระเป๋า ────────────────────────────────────────────────────
const ITEM_NAME = {};
for (const list of Object.values(SHOP_ITEMS)) for (const it of list) if (!it.pack) ITEM_NAME[it.id] = it;
function paintBag() {
  const W = wallet();
  const list = $('bagList');
  list.replaceChildren();
  const ids = Object.keys(W.bag).filter((id) => W.bag[id] > 0);
  $('bagEmpty').classList.toggle('hidden', ids.length > 0);
  for (const id of ids) {
    const it = ITEM_NAME[id] || { icon: id, name: id };
    const row = document.createElement('div');
    row.className = 'bagrow';
    const ico = document.createElement('div');
    ico.className = 'ico';
    if (/^[a-z]+$/.test(it.icon)) {
      const ic = document.createElement('canvas');
      ic.width = 80; ic.height = 80;
      const g = ic.getContext('2d');
      g.scale(2, 2);
      drawItemIcon(g, it.icon);
      ico.appendChild(ic);
    } else ico.textContent = it.icon;
    const nm = document.createElement('b'); nm.textContent = it.name;
    const q = document.createElement('span'); q.className = 'qty'; q.textContent = '×' + W.bag[id];
    row.append(ico, nm, q);
    list.appendChild(row);
  }
}

// ── เริ่ม ──────────────────────────────────────────────────────
(async () => {
  paintHud();
  requestAnimationFrame(loop);
  await initWallet();
  paintHud();
  // ฟอนต์ป้ายร้าน (Mali) โหลดเสร็จหลังวาดแคชไปแล้ว — วาดใหม่ให้ป้ายเป็นฟอนต์จริง
  document.fonts?.ready.then(() => clearCache());
})();

// ── UI รอบจอแบบใหม่ (ผู้ใช้ 15 พ.ย. 2026 ส่งแบบ) ─────────────────────
// ไอคอนวุ้น (hud-icons.js) · แผนที่ปราสาท · กล้องถ่ายรูปได้ทุกจุด · รายชื่อสมาชิก (หัวแมว) · กล่องแชตชั้นนี้พับเก็บได้
initHudIcons();
document.body.dataset.w = WD.id;
// แผนที่ปราสาท 3 ชั้น — หน้าแผนที่ + ลิฟต์ส่วนตัวจะออกแบบทีหลัง (ผู้ใช้) · ตอนนี้ในปราสาท = เปิดหน้าวาปไปชั้นต่าง ๆ ที่มีอยู่แล้ว
$('btnMap').addEventListener('click', () => {
  if (paused) return;
  if (IN_CASTLE() || IN_HOME()) { toggleEmotes(false); openMirror(); }
  else toast('แผนที่ปราสาท 3 ชั้น + ลิฟต์ส่วนตัว · เร็ว ๆ นี้ (เข้าปราสาทแล้วกดใหม่เพื่อวาปไปแต่ละชั้น)');
});
// กล้อง = ถ่ายรูปตรงที่ยืนอยู่ (ใช้โหมดถ่ายรูปเดียวกับซุ้มหัวใจในสวน)
$('btnCam').addEventListener('click', () => {
  if (paused || photo || ride || !cat.P.onGround) return;
  cat.sit = null;
  startPhoto({ id: 'free', door: cat.x });
});
// รายชื่อสมาชิกในปราสาท: เรา + แมวทุกตัวในห้องเดียวกัน (อยู่ชั้นไหน) · นอกปราสาท = มีแค่เรา
const FLOOR_NAME = { hall: 'ชั้น 1', lounge: 'ชั้น 2', roof: 'ชั้น 3' };
const ROOM_MAX = 20;
function paintMemBadge(on) {
  const b = $('memNum');
  b.classList.toggle('hidden', !on);
  if (on) b.textContent = `${peers.size + 1}/20`;   // ห้องละไม่เกิน 20 (ROOM_MAX — เขียนตรงนี้เพราะ paintOnline เรียกก่อนบรรทัดประกาศ)
}
function memDot(skinId) {
  const s = skinById(skinId) || SKINS[0];
  const c = s?.pal?.fur || s?.body || s?.fur || '#FFC48A';
  return typeof c === 'string' ? c : '#FFC48A';
}
function paintMembers() {
  const list = $('memList');
  list.replaceChildren();
  const on = online() && IN_CASTLE();
  const rows = [{ name: netLook().name, skin: netLook().skin, w: WD.id, me: true, m: onlineMember() }];
  if (on) for (const q of peers.values()) rows.push({ name: q.name, skin: q.skin, w: q.w, m: q.m });
  $('memSub').textContent = on ? `อยู่ในห้องนี้ ${rows.length}/${ROOM_MAX} ตัว${onlineRoom() ? ` · ห้อง ${onlineRoom()}` : ''}` : 'เข้าปราสาทออนไลน์แล้วจะเห็นเพื่อน ๆ ที่อยู่ห้องเดียวกันตรงนี้';
  for (const r of rows) {
    const li = document.createElement('li');
    if (r.me) li.className = 'me';
    const dot = document.createElement('i'); dot.className = 'm-dot'; dot.style.background = memDot(r.skin);
    const nm = document.createElement('span'); nm.className = 'm-name'; nm.textContent = r.name + (r.me ? ' (เรา)' : '');
    const fl = document.createElement('span'); fl.className = 'm-floor'; fl.textContent = FLOOR_NAME[r.w] || '';
    li.append(dot, nm, fl);
    if (!r.m) { const tg = document.createElement('span'); tg.className = 'm-tag'; tg.textContent = 'ผู้มาเยือน'; li.append(tg); }
    list.append(li);
  }
}
$('btnMembers').addEventListener('click', () => {
  if (paused) return;
  toggleEmotes(false);
  paused = true;
  paintMembers();
  $('memOv').classList.remove('hidden');
});
$('memX').addEventListener('click', () => { $('memOv').classList.add('hidden'); if (scene !== 'shop') paused = false; });
// กล่องแชตชั้นนี้: ข้อความล่าสุด 3 แถวจากแผงแชต (chat.js #chatLog) · ปุ่มมุมขวาล่าง = พับเก็บ/กาง (จำไว้ในเครื่อง)
const FEED_N = 3;
function paintFeed() {
  const ol = $('cfLog');
  ol.replaceChildren();
  const rows = [...$('chatLog').querySelectorAll('li.chat-row')].slice(-FEED_N);
  if (!rows.length) {
    const li = document.createElement('li'); li.className = 'cf-empty';
    li.textContent = 'ยังไม่มีใครคุยในชั้นนี้ ทักทายเพื่อน ๆ ได้เลย';
    ol.append(li);
    return;
  }
  for (const r of rows) {
    const li = document.createElement('li');
    const b = document.createElement('b'); b.textContent = (r.querySelector('.who')?.textContent || '') + ' : ';
    const msg = r.querySelector('.msg');
    li.append(b, msg?.querySelector('canvas') ? 'ส่งสติกเกอร์' : (msg?.textContent || ''));
    ol.append(li);
  }
}
new MutationObserver(paintFeed).observe($('chatLog'), { childList: true });
paintFeed();
const FOLD_KEY = 'meowTown.chatFeedFold';
function setFold(on) {
  $('chatFeed').classList.toggle('fold', on);
  $('cfFold').setAttribute('aria-expanded', String(!on));
  $('cfFold').setAttribute('aria-label', on ? 'กางกล่องแชต' : 'พับเก็บกล่องแชต');
  try { localStorage.setItem(FOLD_KEY, on ? '1' : '0'); } catch { /* โหมดส่วนตัว */ }
}
try { setFold(localStorage.getItem(FOLD_KEY) === '1'); } catch { setFold(false); }
$('cfFold').addEventListener('click', () => setFold(!$('chatFeed').classList.contains('fold')));
// แผงแชตใหญ่เปิดอยู่ = กล่องแชตเล็กซ่อน (ข้อความโชว์ในแผงใหญ่แทน — ผู้ใช้ 15 พ.ย.)
new MutationObserver(() => document.body.classList.toggle('chat-open', !$('chatPanel').classList.contains('hidden'))).observe($('chatPanel'), { attributes: true, attributeFilter: ['class'] });
// ปุ่มบวกเพชร/ทอง (แบบหน้าแรก) — ที่หาเพิ่มอยู่ในเกมหลัก
$('gemPlus').addEventListener('click', () => toast('หาเพชรเพิ่มได้จากภารกิจในหน้ากิจกรรมของหน้าแรก'));
$('goldPlus').addEventListener('click', () => toast(WD === TOWN ? 'แลกทองเพิ่มได้ที่ร้านแลกของในเมือง หรือร้านเหมียวในหน้าแรก' : 'แลกทองเพิ่มได้ที่ร้านเหมียวในหน้าแรก หรือร้านแลกของในเมือง'));

if (import.meta.env.DEV) window.__town = { kits: () => kits, cat, wallet, PLACES, song: () => song, gardenSong: () => gardenSong, emote: () => emoteId(), ride: () => ride, cam: () => ({ camX, camY }), use: (id) => use(WD.places.find((p) => p.id === id) || placeById(id) || G_PLACES.find((p) => p.id === id)), world: () => WD.id, photo: () => photo };
