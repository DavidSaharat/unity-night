import { online, getFb } from "/firebase.js";

export const FONTS = ["Mali", "Sarabun", "Kanit", "Prompt", "Itim", "Pridi", "Mitr", "Sriracha", "Pattaya", "Charmonman", "K2D", "Niramit"];

export const DEFAULT = {
  text: {
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
  look: { starFace: false, logoUrl: "/logo.png", logoWidth: 340 },
  fireworks: ["#ffffff", "#cfe3ff", "#8fb8ff", "#ffe9a8", "#b8a6ff"],
  font: { family: "Mali", title: 22, body: 21, wait: 19, finish: 56 },
  limits: { maxLength: 120, maxCount: 80 },
  timing: { holdSec: 1.5, foldMs: 950, starSize: 170 },
};

// ฟอร์มหน้า admin สร้างจากรายการนี้ — เพิ่มช่องใหม่ได้ที่นี่ที่เดียว
// type: text | area | color | bool | num | font | colors
export const SCHEMA = [
  { title: "ข้อความ", fields: [
    ["text.title", "หัวข้อเหนือกระดาษ", "text"],
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
    ["look.starFace", "ดาวมีหน้ายิ้ม", "bool"],
  ] },
  { title: "พลุ", fields: [["fireworks", "สีพลุ", "colors"]] },
  { title: "ฟอนต์และขนาดตัวอักษร (px)", fields: [
    ["font.family", "ฟอนต์", "font"],
    ["font.title", "หัวข้อ", "num", 12, 60],
    ["font.body", "ข้อความในกระดาษ", "num", 12, 40],
    ["font.wait", "ข้อความตอนรอ", "num", 12, 40],
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

export async function loadConfig() {
  if (!online) return structuredClone(DEFAULT);
  try {
    const { db, doc, getDoc } = await getFb();
    const snap = await Promise.race([getDoc(doc(db, "site", "config")), new Promise((r) => setTimeout(r, 3000))]);
    return merge(DEFAULT, snap?.data?.());
  } catch (e) {
    console.warn("โหลด config ไม่ได้ ใช้ค่า default", e);
    return structuredClone(DEFAULT);
  }
}

export async function saveConfig(cfg) {
  const { db, doc, setDoc } = await getFb();
  return setDoc(doc(db, "site", "config"), cfg);
}

export async function applyTheme({ colors: c, font: f, look }) {
  const vars = { "sky-top": c.skyTop, "sky-bottom": c.skyBottom, paper: c.paper, ink: c.ink, accent: c.accent, text: c.text, font: `"${f.family}"`, "logo-w": look.logoWidth + "px", "title-size": f.title, "body-size": f.body, "wait-size": f.wait, "finish-size": f.finish };
  for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty("--" + k, v);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", c.skyTop);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${f.family.replace(/ /g, "+")}:wght@400;600;700&display=swap`;
  document.head.append(link);
  await Promise.race([document.fonts.load(`16px "${f.family}"`), new Promise((r) => setTimeout(r, 1500))]);
}
