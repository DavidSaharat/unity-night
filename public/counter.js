import { online, getFb } from "/firebase.js";

const post = (path) => fetch(path, { method: "POST" });
const countRef = ({ db, doc }) => doc(db, "stats", "count");

// เริ่มดาวดวงใหม่: นับ +1 (ไม่เกิน max) แล้วสร้างบันทึกสถานะ คืน ref ไว้ใช้อัปเดตสถานะต่อ
export async function beginStar(mode, max) {
  if (!online) { post("/api/swipe"); return null; }
  const fb = await getFb();
  const ref = countRef(fb);
  let n = 0;
  await fb.runTransaction(fb.db, async (tx) => {
    const snap = await tx.get(ref);
    n = Math.min(max, (snap.exists() ? snap.data().n : 0) + 1);
    tx.set(ref, { n });
  });
  return fb.addDoc(fb.collection(fb.db, "stars"), { n, mode, state: "start", at: { start: fb.serverTimestamp() } });
}

// สถานะ: start → water → gather → star → rising → gone
export async function setStarState(ref, state) {
  if (!ref) return;
  const fb = await getFb();
  return fb.updateDoc(ref, { state, ["at." + state]: fb.serverTimestamp() }).catch(() => {});
}

export async function resetCount() {
  if (!online) return post("/api/reset");
  const fb = await getFb();
  return fb.setDoc(countRef(fb), { n: 0 });
}

// cb(count) ถูกเรียกทุกครั้งที่ตัวเลขเปลี่ยน
export async function watchCount(cb) {
  if (!online) return (new EventSource("/api/events").onmessage = (e) => cb(JSON.parse(e.data).count));
  const fb = await getFb();
  fb.onSnapshot(countRef(fb), (snap) => cb(snap.data()?.n || 0));
}

// cb([{id,n,mode,state,at}]) ดาว 40 ดวงล่าสุด
export async function watchStars(cb) {
  if (!online) return;
  const fb = await getFb();
  const q = fb.query(fb.collection(fb.db, "stars"), fb.orderBy("at.start", "desc"), fb.limit(40));
  fb.onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }))));
}
