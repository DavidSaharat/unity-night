import { online, getFb } from "/firebase.js";

export const FONTS = ["PSL036pro", "Mali", "Sarabun", "Kanit", "Prompt", "Itim", "Pridi", "Mitr", "Sriracha", "Pattaya", "Charmonman", "K2D", "Niramit"];

export const DEFAULT = {
  text: {
    welcomeText: "Welcome\nRoV Unity Night",
    title: "เขียนความรู้สึกสั้นๆ ของคุณลงบนกระดาษ",
    placeholder: "วันนี้รู้สึกยังไงบ้างนะ...",
    swipeHint: "เลื่อนขึ้นเพื่อส่งขึ้นฟ้า",
    emptyHint: "เขียนอะไรสักหน่อยก่อนนะ",
    waitText: "ความรู้สึกของคุณกำลังเดินทางขึ้นไปบนฟ้า",
    finishText: "ขอบคุณที่อยู่ด้วยกัน\nและไปกันต่ออออออ!",
  },
  colors: {
    skyTop: "#150f3d",
    skyBottom: "#6a4c93",
    paper: "#fff8e7",
    ink: "#3a2d5c",
    accent: "#ffd86b",
    text: "#ffffff",
    starSameAsPaper: true,
    star: "#fff8e7",
  },
  look: { starFace: false, logoUrl: "/logo.png", logoWidth: 340, bgUrl: "/bg-night.jpg?v=8", bgRatio: 1.4766, bgX: 0.289, bgY: 0.689 },
  fireworks: ["#ffffff", "#cfe3ff", "#8fb8ff", "#ffe9a8", "#b8a6ff"],
  font: { family: "PSL036pro", title: 22, body: 21, wait: 19, hint: 15, finish: 56, welcome: 56 },
  limits: { maxLength: 120, maxCount: 80 },
  timing: { holdSec: 1.5, foldMs: 950, starSize: 170 },
};

// ฟอร์มหน้า admin สร้างจากรายการนี้ — เพิ่มช่องใหม่ได้ที่นี่ที่เดียว
// type: text | area | color | bool | num | font | colors
export const SCHEMA = [
  { title: "ข้อความ", fields: [
    ["text.title", "หัวข้อเหนือกระดาษ", "text"],
    ["text.welcomeText", "ข้อความต้อนรับ (ขึ้นบรรทัดใหม่ได้)", "area"],
    ["text.placeholder", "ข้อความจางในช่องพิมพ์", "text"],
    ["text.swipeHint", "ข้อความที่แถบเลื่อน", "text"],
    ["text.emptyHint", "ข้อความเตือนตอนยังไม่พิมพ์", "text"],
    ["text.waitText", "ข้อความตอนดาวรอพุ่ง", "text"],
    ["text.finishText", "ข้อความจบ (ขึ้นบรรทัดใหม่ได้)", "area"],
  ] },
  { title: "สี", fields: [
    ["colors.skyTop", "ท้องฟ้า: ด้านบน", "color"],
    ["colors.skyBottom", "ท้องฟ้า: ด้านล่าง", "color"],
    ["colors.paper", "กระดาษ", "color"],
    ["colors.ink", "ตัวอักษรบนกระดาษ", "color"],
    ["colors.accent", "สีเน้น (เทป แสงเรือง จุดรอ ปุ่ม)", "color"],
    ["colors.text", "ตัวอักษรบนท้องฟ้า", "color"],
    ["colors.starSameAsPaper", "ดาวใช้สีเดียวกับกระดาษ", "bool"],
    ["colors.star", "สีดาว (ใช้เมื่อปิดข้อบน)", "color"],
  ] },
  { title: "โลโก้และดาว", fields: [
    ["look.logoUrl", "ลิงก์ไฟล์โลโก้ (เว้นว่าง = ไม่แสดง)", "text"],
    ["look.logoWidth", "ความกว้างโลโก้ (px)", "num", 80, 700, 10],
    ["look.bgUpload", "อัปโหลดรูปพื้นหลัง /letters", "image"],
    ["look.bgUrl", "ลิงก์รูปพื้นหลัง (firestore = รูปที่อัปโหลด)", "text"],
    ["look.bgRatio", "พื้นหลัง: ความสูง ÷ ความกว้างของรูป", "num", 0.5, 4, 0.01],
    ["look.bgX", "พื้นหลัง: ตำแหน่งกลางโลโก้ในรูป แนวนอน (0–1)", "num", 0, 1, 0.01],
    ["look.bgY", "พื้นหลัง: ตำแหน่งยอดวัดในรูป แนวตั้ง (0–1 จากบน)", "num", 0, 1, 0.01],
    ["look.starFace", "ดาวมีหน้ายิ้ม", "bool"],
  ] },
  { title: "พลุ", fields: [["fireworks", "สีพลุ", "colors"]] },
  { title: "ฟอนต์และขนาดตัวอักษร (px)", fields: [
    ["font.family", "ฟอนต์", "font"],
    ["font.title", "หัวข้อเหนือกระดาษ", "num", 12, 80],
    ["font.body", "ข้อความในกระดาษ", "num", 12, 40],
    ["font.wait", "ข้อความตอนรอ", "num", 12, 40],
    ["font.hint", "ข้อความที่แถบเลื่อน", "num", 10, 40],
    ["font.welcome", "ข้อความต้อนรับ", "num", 20, 120],
    ["font.finish", "ข้อความจบ", "num", 20, 120],
  ] },
  { title: "ตัวเลขและเวลา", fields: [
    ["limits.maxLength", "พิมพ์ได้สูงสุด (ตัวอักษร)", "num", 10, 500],
    ["limits.maxCount", "เป้าหมายจำนวนดาว", "num", 1, 10000],
    ["timing.holdSec", "ดาวลอยช้าๆ ก่อนพุ่งทะลุจอ (วินาที)", "num", 0, 10, 0.1],
    ["timing.foldMs", "เวลากระดาษกลายเป็นดาว (มิลลิวินาที)", "num", 300, 3000, 50],
    ["timing.starSize", "ขนาดดาว (px)", "num", 80, 400],
  ] },
];

export const getPath = (o, path) => path.split(".").reduce((v, k) => v?.[k], o);
export function setPath(o, path, val) {
  const keys = path.split(".");
  const last = keys.pop();
  keys.reduce((v, k) => v[k], o)[last] = val;
}

// รวมค่าที่ admin ตั้งไว้เข้ากับ default (ช่องที่ขาดใช้ default)
function merge(base, over) {
  if (Array.isArray(base)) return Array.isArray(over) && over.length ? over : base;
  if (base && typeof base === "object") return Object.fromEntries(Object.keys(base).map((k) => [k, merge(base[k], over?.[k])]));
  return over ?? base;
}

const CACHE = "unity-config";
const cached = () => { try { return merge(DEFAULT, JSON.parse(localStorage.getItem(CACHE))); } catch { return structuredClone(DEFAULT); } };

// เน็ตมือถือช้าจน Firestore ไม่ตอบใน 3 วิ → ใช้ค่าที่เคยโหลดไว้ (ไม่ใช่ default) เพื่อให้ฟอนต์/ข้อความตรงกับที่ตั้งไว้
export async function loadConfig(resolve = true) {
  if (!online) return structuredClone(DEFAULT);
  try {
    const { db, doc, getDoc } = await getFb();
    const snap = await Promise.race([getDoc(doc(db, "site", "config")), new Promise((r) => setTimeout(r, 3000))]);
    if (!snap) throw new Error("timeout");
    const raw = snap.data?.();
    try { localStorage.setItem(CACHE, JSON.stringify(raw)); } catch {}
    const cfg = merge(DEFAULT, raw);
    if (resolve && cfg.look.bgUrl === "firestore") {
      const bg = await Promise.race([getDoc(doc(db, "site", "bg")), new Promise((r) => setTimeout(r, 4000))]);
      cfg.look.bgUrl = bg?.data?.()?.data || DEFAULT.look.bgUrl;
    }
    return cfg;
  } catch (e) {
    console.warn("โหลด config ไม่ได้ ใช้ค่าที่เคยโหลดไว้/default", e);
    return cached();
  }
}

export async function saveConfig(cfg) {
  if (!online) throw new Error("ยังไม่ได้ตั้งค่า Firebase");
  const { db, doc, setDoc } = await getFb();
  return setDoc(doc(db, "site", "config"), cfg);
}

// ย่อรูปแล้วเก็บเป็น data URL ใน site/bg (Firestore จำกัด 1MB ต่อเอกสาร) คืนสัดส่วนสูง÷กว้าง
export async function uploadBg(file) {
  const img = await createImageBitmap(file);
  const w = Math.min(1200, img.width), h = Math.round((img.height * w) / img.width);
  const cv = Object.assign(document.createElement("canvas"), { width: w, height: h });
  cv.getContext("2d").drawImage(img, 0, 0, w, h);
  let q = 0.9, data;
  do { data = cv.toDataURL("image/jpeg", q); q -= 0.1; } while (data.length > 850000 && q > 0.3);
  if (data.length > 850000) throw new Error("รูปใหญ่เกินไป");
  const { db, doc, setDoc } = await getFb();
  await setDoc(doc(db, "site", "bg"), { data });
  return h / w;
}

export async function applyTheme({ colors: c, font: f, look }) {
  const vars = { "sky-top": c.skyTop, "sky-bottom": c.skyBottom, paper: c.paper, ink: c.ink, accent: c.accent, text: c.text, font: `"${f.family}"`, "logo-w": look.logoWidth + "px", bg: `url("${look.bgUrl}")`, "bg-ratio": look.bgRatio, "bg-x": look.bgX, "bg-y": look.bgY, "title-size": f.title, "body-size": f.body, "wait-size": f.wait, "hint-size": f.hint, "finish-size": f.finish };
  for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty("--" + k, v);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", c.skyTop);
  if (f.family !== "PSL036pro") {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${f.family.replace(/ /g, "+")}:wght@400;600;700&display=swap`;
    document.head.append(link);
  }
  await Promise.race([document.fonts.load(`16px "${f.family}"`), new Promise((r) => setTimeout(r, 1500))]);
}
