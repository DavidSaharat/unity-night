import { online, getFb } from "/firebase.js";
import { watchCount, watchStars, resetCount } from "/counter.js";
import { DEFAULT, SCHEMA, FONTS, getPath, setPath, loadConfig, saveConfig } from "/config.js";

const $ = (id) => document.getElementById(id);
const show = (el, on) => (el.hidden = !on);
let cfg = structuredClone(DEFAULT);

/* ---------------- ตัวนับ (ทุกคนดูได้) ---------------- */
const renderCount = (n) => {
  $("count").textContent = n;
  $("max").textContent = cfg.limits.maxCount;
  $("bar").style.width = `${Math.min(100, (n / cfg.limits.maxCount) * 100)}%`;
};
let last = 0;
watchCount((n) => renderCount((last = n)));

/* ---------------- มอนิเตอร์สถานะดาว ---------------- */
const ORDER = ["start", "gather", "star", "rising", "gone"];
const LABEL = {
  letters: { start: "กำลังกระจายตัวอักษร", gather: "กำลังรวมเป็นดาว", star: "ดาวลอยช้าๆ", rising: "กำลังพุ่งทะลุจอ", gone: "ทะลุจอแล้ว" },
  classic: { start: "กำลังเปลี่ยนเป็นดาว", star: "ดาวลอยช้าๆ", rising: "กำลังพุ่งทะลุจอ", gone: "ทะลุจอแล้ว" },
};
const MODE = { letters: "หน้า /letters", classic: "หน้าหลัก" };
const STALE_SEC = 90; // อยู่สถานะเดิมนานเกินนี้โดยยังไม่ทะลุจอ = น่าจะปิดหน้าไปแล้ว
let stars = [];
const ms = (v) => v?.toMillis?.() ?? Date.now();
const fmt = (sec) => (sec < 60 ? sec.toFixed(1) + " วิ" : Math.floor(sec / 60) + " น. " + Math.round(sec % 60) + " วิ");

function renderStars() {
  const now = Date.now(), counts = {};
  const rows = stars.map((s) => {
    const label = LABEL[s.mode] ?? LABEL.letters, at = s.at ?? {};
    const times = ORDER.filter((k) => at[k] && label[k]).map((k) => [k, ms(at[k])]);
    const cur = ms(at[s.state]), stale = s.state !== "gone" && (now - cur) / 1000 > STALE_SEC;
    const key = stale ? "stale" : s.state;
    counts[key] = (counts[key] || 0) + 1;
    const parts = times.slice(0, -1).map(([k, t], i) => `${label[k]} <b>${fmt((times[i + 1][1] - t) / 1000)}</b>`);
    const total = s.state === "gone" ? ` · รวม <b>${fmt((cur - times[0][1]) / 1000)}</b>` : "";
    const badge = stale ? "ไม่ทราบสถานะ (ปิดหน้าไป?)" : label[s.state] ?? s.state;
    const live = s.state === "gone" ? "" : ` · ${fmt((now - cur) / 1000)}`;
    return `<div class="star ${key}"><span class="n">#${s.n}</span><span class="badge ${key}">${badge}${live}</span><span class="mode">${MODE[s.mode] ?? ""}</span><div class="parts">${parts.join(" → ")}${total}</div></div>`;
  });
  const chip = (k, t) => `<span class="chip ${k}">${t} <b>${counts[k] || 0}</b></span>`;
  $("summary").innerHTML = chip("gather", "กำลังรวมเป็นดาว") + chip("star", "ลอยช้าๆ") + chip("rising", "กำลังพุ่ง") + chip("gone", "ทะลุจอแล้ว");
  $("stars").innerHTML = rows.join("") || '<p class="empty">ยังไม่มีดาว</p>';
}
if (online) {
  show($("monitor"), true);
  watchStars((list) => { stars = list; renderStars(); });
  setInterval(renderStars, 500);
}

/* ---------------- ฟอร์ม config ---------------- */
function input([path, label, type, min, max, step]) {
  const val = getPath(cfg, path);
  const set = (v) => setPath(cfg, path, v);
  const el = Object.assign(document.createElement(type === "area" ? "textarea" : type === "font" ? "select" : "input"), {});
  if (type === "text" || type === "area") { el.value = val; el.oninput = () => set(el.value); if (type === "text") el.type = "text"; }
  if (type === "color") { el.type = "color"; el.value = val; el.oninput = () => set(el.value); }
  if (type === "bool") { el.type = "checkbox"; el.checked = val; el.onchange = () => set(el.checked); }
  if (type === "num") { Object.assign(el, { type: "number", min, max, step: step || 1, value: val }); el.oninput = () => el.value !== "" && set(+el.value); }
  if (type === "font") {
    el.innerHTML = FONTS.map((f) => `<option${f === val ? " selected" : ""}>${f}</option>`).join("");
    el.onchange = () => set(el.value);
  }
  return el;
}

function colorList(path) {
  const box = document.createElement("div");
  box.className = "swatches";
  const draw = () => {
    const list = getPath(cfg, path);
    box.innerHTML = "";
    list.forEach((c, i) => {
      const wrap = document.createElement("span");
      const pick = Object.assign(document.createElement("input"), { type: "color", value: c });
      pick.oninput = () => (list[i] = pick.value);
      wrap.append(pick);
      if (list.length > 1) {
        const x = Object.assign(document.createElement("button"), { type: "button", textContent: "×", onclick: () => { list.splice(i, 1); draw(); } });
        wrap.append(x);
      }
      box.append(wrap);
    });
    if (list.length < 8) box.append(Object.assign(document.createElement("button"), { type: "button", className: "btn", textContent: "+ เพิ่มสี", onclick: () => { list.push("#ffffff"); draw(); } }));
  };
  draw();
  return box;
}

function renderForm() {
  $("form").innerHTML = "";
  for (const sec of SCHEMA) {
    const card = Object.assign(document.createElement("section"), { className: "card" });
    card.append(Object.assign(document.createElement("h2"), { textContent: sec.title }));
    for (const f of sec.fields) {
      const row = Object.assign(document.createElement("label"), { className: "field" + (f[2] === "area" || f[2] === "colors" ? " stack" : "") });
      row.append(Object.assign(document.createElement("span"), { textContent: f[1] }), f[2] === "colors" ? colorList(f[0]) : input(f));
      card.append(row);
    }
    $("form").append(card);
  }
}

/* ---------------- สิทธิ์แอดมิน ---------------- */
function gate(msg, { form = false, claim = false } = {}) {
  show($("gate"), true);
  $("gateMsg").textContent = msg;
  show($("login"), form);
  show($("claim"), claim);
  show($("editor"), false);
  show($("bar-actions"), false);
}

async function openEditor() {
  cfg = await loadConfig();
  renderForm();
  renderCount(last);
  show($("gate"), false);
  show($("editor"), true);
  show($("bar-actions"), true);
}

async function onUser(user) {
  show($("logout"), !!user);
  $("who").textContent = user?.email ?? "";
  if (!user) return gate("เข้าสู่ระบบเพื่อแก้ไขการตั้งค่า", { form: true });
  const { db, doc, getDoc } = await getFb();
  const mine = await getDoc(doc(db, "admins", user.uid));
  if (mine.exists()) return openEditor();
  gate("บัญชีนี้ยังไม่มีสิทธิ์แอดมิน ถ้ายังไม่เคยมีใครตั้งแอดมิน กดปุ่มด้านล่างเพื่อตั้งตัวเอง", { claim: true });
}

async function main() {
  if (!online) return gate("ยังไม่ได้ตั้งค่า Firebase (ดูได้เฉพาะตัวนับในเครื่อง)");
  loadConfig().then((c) => { cfg = c; renderCount(last); });
  gate("เข้าสู่ระบบเพื่อแก้ไขการตั้งค่า", { form: true }); // แสดงฟอร์มไว้ก่อน ไม่ต้องรอเช็กสถานะล็อกอิน
  const fb = await getFb();
  fb.onAuthStateChanged(fb.auth, onUser);

  const authAction = (fn) => async (e) => {
    e?.preventDefault?.();
    try { await fn(fb.auth, $("email").value, $("pass").value); } catch (err) { $("gateMsg").textContent = "ไม่สำเร็จ: " + err.code; }
  };
  $("login").onsubmit = authAction(fb.signInWithEmailAndPassword);
  $("signup").onclick = authAction(fb.createUserWithEmailAndPassword);
  $("logout").onclick = () => fb.signOut(fb.auth);
  $("claim").onclick = async () => {
    try {
      const batch = fb.writeBatch(fb.db);
      batch.set(fb.doc(fb.db, "admins", fb.auth.currentUser.uid), {});
      batch.set(fb.doc(fb.db, "meta", "admin"), {});
      await batch.commit();
      openEditor();
    } catch { $("gateMsg").textContent = "มีแอดมินอยู่แล้ว ให้แอดมินเดิมเพิ่มสิทธิ์ให้"; }
  };
}

/* ---------------- ปุ่มด้านล่าง ---------------- */
const toast = (msg) => { $("toast").textContent = msg; setTimeout(() => ($("toast").textContent = ""), 2500); };

$("save").onclick = async () => {
  try { await saveConfig(cfg); toast("บันทึกแล้ว ✓ หน้าเว็บจะใช้ค่าใหม่ตอนเปิดครั้งถัดไป"); renderCount(last); }
  catch { toast("บันทึกไม่สำเร็จ (ไม่มีสิทธิ์?)"); }
};
$("defaults").onclick = () => { cfg = structuredClone(DEFAULT); renderForm(); toast("โหลดค่าเริ่มต้นแล้ว กดบันทึกเพื่อใช้จริง"); };
$("reset").onclick = () => confirm("รีเซ็ตตัวนับเป็น 0?") && resetCount().catch(() => toast("ไม่มีสิทธิ์"));

main();
