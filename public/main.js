import { Sky } from "/sky.js";
import { beginStar, setStarState } from "/counter.js";
import { loadConfig, applyTheme } from "/config.js";

const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cfg = await loadConfig();
await applyTheme(cfg);
document.body.classList.remove("loading");
const { text: TEXT, colors, timing, look } = cfg;
document.querySelectorAll(".logo").forEach((img) => {
  img.onerror = () => (img.hidden = true);
  if (look.logoUrl) { img.src = look.logoUrl; img.hidden = false; }
});
const starColor = colors.starSameAsPaper ? colors.paper : colors.star;
const RECT = "polygon(50% 0, 100% 0, 100% 35%, 100% 57%, 100% 100%, 50% 100%, 0 100%, 0 57%, 0 35%, 0 0)";
const STAR = "polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

const PAPER_FADE_MS = 900; // ต้องตรงกับ PAPER_FADE ใน sky.js
// ตอนดาวพุ่ง: จอสั่นนิดหน่อย + (หน้า /letters) กล้องตามดาวขึ้นไป = ภาพพื้นหลังเลื่อนลงจนถึงขอบบนของภาพ ค้างไว้
const impact = () => {
  document.documentElement.animate(
    [...Array(7)].map((_, i) => ({ transform: `translate(${(Math.random() - 0.5) * 8 * (1 - i / 7)}px, ${(Math.random() - 0.5) * 8 * (1 - i / 7)}px)` })).concat({ transform: "none" }),
    { duration: 400 }
  );
  const cam = $("#cam");
  if (cam) {
    // เลื่อนภาพลงตรงๆ จนโลโก้ (กลางโลโก้อยู่ที่ 25.5% ของภาพ) มาอยู่ที่ 35% ของจอ แต่ไม่เกินขอบบนของภาพ
    const r = cam.getBoundingClientRect();
    const dy = Math.min(-r.top, innerHeight * 0.35 - (r.top + 0.255 * r.height));
    cam.animate([{ transform: "none" }, { transform: `translate(0, ${dy}px)` }], { duration: 1400, easing: "cubic-bezier(.3,0,.2,1)", fill: "forwards" });
  }
};
const sky = new Sky($("#sky"));
sky.accent = colors.accent;
const lettersMode = document.body.dataset.mode === "letters"; // หน้า /letters: ตัวอักษรเด้งไปรวมเป็นดาว
const fx = lettersMode ? new Sky($("#fx"), { bg: false }) : sky; // canvas หน้าสุดสำหรับตัวอักษร ลม พลุ
fx.accent = colors.accent;
const paper = $("#paper");
const msg = $("#msg");
const handle = $("#handle");
const REST = { y: 0, s: 1, r: -1.2 };
let cur = { ...REST };
let state = "write"; // write | launching | finish
let drag = null;

const setT = (y, s, r) => {
  cur = { y, s, r };
  paper.style.transform = `translateY(${y}px) scale(${s}) rotate(${r}deg)`;
};
const show = (id) => document.querySelectorAll(".stage").forEach((s) => s.classList.toggle("on", s.id === "st-" + id));

/* ---------------- เขียน ---------------- */
$("#writeTitle").textContent = TEXT.title;
$("#hint").textContent = TEXT.swipeHint;
msg.placeholder = TEXT.placeholder;
msg.maxLength = cfg.limits.maxLength;
updateCount();
paper.animate(
  [
    { transform: "translateY(70px) scale(.96) rotate(5deg)", opacity: 0 },
    { transform: `translateY(0) scale(1) rotate(${REST.r}deg)`, opacity: 1 },
  ],
  { duration: 800, easing: "cubic-bezier(.2,.9,.3,1.15)" }
);

function updateCount() {
  $("#count").textContent = `${msg.value.length}/${msg.maxLength}`;
  paper.classList.toggle("empty", !msg.value.trim());
}
msg.addEventListener("input", updateCount);

function flashEmpty() {
  $("#hint").textContent = TEXT.emptyHint;
  paper.classList.add("hintflash");
  paper.classList.remove("shake");
  void paper.offsetWidth;
  paper.classList.add("shake");
  msg.focus({ preventScroll: true });
  setTimeout(() => {
    $("#hint").textContent = TEXT.swipeHint;
    paper.classList.remove("hintflash");
  }, 1800);
}

/* ---------------- swipe ขึ้น ---------------- */
const THRESH = () => Math.min(110, innerHeight * 0.14);
const MAX_DRAG = () => THRESH() * 1.1; // กระดาษขึ้นได้ไม่สูงกว่านี้

handle.addEventListener("pointerdown", (e) => {
  if (state !== "write") return;
  if (!msg.value.trim()) return flashEmpty();
  drag = { id: e.pointerId, y0: e.clientY, dy: 0, moved: false, samples: [[performance.now(), e.clientY]] };
  handle.setPointerCapture(e.pointerId);
  paper.style.transition = "none";
});
handle.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dy = Math.max(-MAX_DRAG(), Math.min(0, e.clientY - drag.y0)); // จำกัดระยะลาก กระดาษไม่หลุดจอ
  drag.dy = dy;
  if (dy < -4) drag.moved = true;
  const p = Math.min(1, -dy / THRESH());
  paper.style.setProperty("--p", p.toFixed(3));
  setT(dy, 1 - p * 0.08, REST.r + p * 2.5);
  const now = performance.now();
  drag.samples.push([now, e.clientY]);
  while (drag.samples.length > 2 && now - drag.samples[0][0] > 130) drag.samples.shift();
});
function endDrag(e, cancelled) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag;
  drag = null;
  const [t0, y0] = d.samples[0];
  const [t1, y1] = d.samples[d.samples.length - 1];
  const v = t1 > t0 ? (y0 - y1) / (t1 - t0) : 0; // px/ms ขึ้นบน = บวก
  if (!cancelled && (-d.dy >= THRESH() || (v > 0.8 && -d.dy > 30))) return launch();
  springBack();
  if (!cancelled && !d.moved) bounceHint();
}
handle.addEventListener("pointerup", (e) => endDrag(e, false));
handle.addEventListener("pointercancel", (e) => endDrag(e, true));
// กด Enter/Space (คีย์บอร์ด) = ส่งเลย
handle.addEventListener("click", (e) => {
  if (e.detail === 0 && state === "write") msg.value.trim() ? launch() : flashEmpty();
});

function springBack() {
  paper.style.transition = "transform .5s cubic-bezier(.2,1.4,.4,1)";
  paper.style.setProperty("--p", 0);
  setT(REST.y, REST.s, REST.r);
}
function bounceHint() {
  paper.style.transition = "transform .25s ease-out";
  setT(-26, 1, REST.r);
  setTimeout(springBack, 220);
}

/* ---------------- กระดาษ → ดาวน่ารัก → พุ่งขึ้นฟ้า ---------------- */
async function launch() {
  state = "launching";
  navigator.vibrate?.(18);
  msg.blur();
  const star = beginStar(lettersMode ? "letters" : "classic", cfg.limits.maxCount).catch(() => null);
  const track = (state) => star.then((ref) => setStarState(ref, state));
  if (lettersMode) return launchLetters(track);

  const rect = paper.getBoundingClientRect();
  const { y, s, r } = cur;
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2 - y; // ดาวโผล่ที่จุดวางของกระดาษ ไม่ใช่จุดที่ลากค้าง
  const [sx, sy] = [timing.starSize / paper.offsetWidth, timing.starSize / paper.offsetHeight]; // ชดเชยกล่องที่ไม่จัตุรัส ให้ดาวไม่เบี้ยว
  const from = getComputedStyle(paper).backgroundColor;

  paper.style.transition = "none";
  paper.classList.add("folding");
  $("#st-write").classList.add("leaving");
  paper.animate(
    [
      { transform: `translateY(${y}px) scale(${s}) rotate(${r}deg)`, clipPath: RECT, backgroundColor: from },
      { transform: `scale(${sx * 1.3}, ${sy * 1.3}) rotate(-10deg)`, clipPath: STAR, backgroundColor: starColor, offset: 0.6 },
      { transform: `scale(${sx}, ${sy}) rotate(0deg)`, clipPath: STAR, backgroundColor: starColor },
    ],
    { duration: timing.foldMs, easing: "ease-in-out", fill: "forwards" }
  );
  await sleep(timing.foldMs);

  // สลับเป็นดาวน่ารักบน canvas (กระดาษหายไป)
  paper.style.visibility = "hidden";
  $("#waitText").textContent = TEXT.waitText;
  show("wait");
  track("star");
  fx.launchStar({
    x: cx, y: cy, R: timing.starSize / 2.1, hold: timing.holdSec, color: starColor, face: look.starFace,
    onLaunch: () => track("rising"), // จังหวะดาวพุ่ง = จังหวะสั่งพลุจริง
    onImpact: impact,
    onDone: async () => {
      track("gone");
      fx.burst(innerWidth / 2, innerHeight * 0.28, cfg.fireworks);
      await sleep(2600);
      enterFinish();
    },
  });
}

/* ---------------- หน้า /letters: ตัวอักษรเด้งออกจากกระดาษ → รวมเป็นรูปดาว → พุ่ง ---------------- */
// ตำแหน่งตัวอักษรแต่ละตัวในช่องพิมพ์ (วัดจากสำเนาที่จัดเรียงเหมือนกัน)
function measureGlyphs() {
  const cs = getComputedStyle(msg), box = msg.getBoundingClientRect();
  const ghost = document.createElement("div");
  Object.assign(ghost.style, {
    position: "fixed", left: box.left + "px", top: box.top - msg.scrollTop + "px", width: box.width + "px",
    padding: cs.padding, font: cs.font, lineHeight: cs.lineHeight, whiteSpace: "pre-wrap", overflowWrap: "break-word", visibility: "hidden",
  });
  for (const { segment } of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(msg.value)) {
    ghost.append(Object.assign(document.createElement("span"), { textContent: segment }));
  }
  document.body.append(ghost);
  const glyphs = [...ghost.children].map((s) => {
    const r = s.getBoundingClientRect();
    return { ch: s.textContent, x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }).filter((g) => g.ch.trim());
  ghost.remove();
  return glyphs;
}

async function launchLetters(track) {
  const glyphs = measureGlyphs();
  const cx = innerWidth / 2, cy = innerHeight / 2; // ดาวตัวอักษรอยู่กลางจอ ไม่ใช่ตำแหน่งกระดาษ

  paper.style.transition = "none";
  paper.classList.add("lettering");
  $("#st-write").classList.add("leaving");
  paper.animate([{ opacity: 1 }, { opacity: 0 }], { duration: PAPER_FADE_MS, fill: "forwards" }); // กระดาษค่อยๆ จาง ตัวอักษรอยู่ที่เดิม
  fx.launchLetters({
    glyphs, cx, cy, R: timing.starSize * 0.5, srcSize: cfg.font.body, font: `"${cfg.font.family}"`,
    ink: colors.ink, tint: starColor, hold: timing.holdSec, onImpact: impact,
    onState: track, // gather → star → rising → gone
    onDone: async () => {
      fx.burst(innerWidth / 2, innerHeight * 0.28, cfg.fireworks);
      await sleep(2600);
      enterFinish();
    },
  });
  setTimeout(() => {
    $("#waitText").textContent = TEXT.waitText;
    show("wait");
  }, fx.rocket.pre * 1000);
}

/* ---------------- จบ ---------------- */
const wordSeg = Intl.Segmenter ? new Intl.Segmenter("th", { granularity: "word" }) : null;
const graphemes = Intl.Segmenter ? new Intl.Segmenter("th", { granularity: "grapheme" }) : null;

function buildChars(el, text, start) {
  let i = start;
  const words = wordSeg ? [...wordSeg.segment(text)].map((s) => s.segment) : text.split(/(\s+)/);
  for (const w of words) {
    if (/^\s+$/.test(w)) { el.append(" "); continue; }
    const wrap = document.createElement("span");
    wrap.className = "word";
    // แยกทีละกลุ่มตัวอักษร (พยัญชนะ+สระ+วรรณยุกต์ติดกัน) ไม่งั้นไม้เอก/สระลอยหาย
    for (const g of graphemes ? [...graphemes.segment(w)].map((s) => s.segment) : Array.from(w)) {
      const c = document.createElement("span");
      c.className = "ch";
      c.textContent = g;
      c.style.setProperty("--i", i++);
      wrap.append(c);
    }
    el.append(wrap);
  }
  return i;
}

function enterFinish() {
  state = "finish";
  let i = 0;
  TEXT.finishText.split("\n").forEach((line) => {
    const d = document.createElement("span");
    d.className = "fl";
    $("#finishText").append(d);
    i = buildChars(d, line.trim(), i);
  });

  // ย่อฟอนต์ให้แต่ละบรรทัดพอดีหน้าจอ (ไม่ตกบรรทัด) — มือถือจึงได้ตามจำนวนบรรทัดที่ตั้งไว้
  const box = $("#finishText"), avail = innerWidth * 0.92;
  let size = Math.min(cfg.font.finish, innerWidth * 0.11);
  box.style.fontSize = size + "px";
  const widest = Math.max(...[...box.children].map((l) => l.scrollWidth));
  if (widest > avail) box.style.fontSize = (size * avail) / widest + "px";
  show("finish");
}
