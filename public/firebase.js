import { firebaseConfig } from "/firebase-config.js";

export const online = !firebaseConfig.apiKey.startsWith("YOUR_");

const V = "https://www.gstatic.com/firebasejs/10.14.1/";
let loaded;

// โหลด Firebase ตอนใช้ครั้งแรกครั้งเดียว: { db, auth, doc, getDoc, setDoc, ... }
export const getFb = () => (loaded ??= (async () => {
  const [{ initializeApp }, fs, auth] = await Promise.all([
    import(V + "firebase-app.js"),
    import(V + "firebase-firestore.js"),
    import(V + "firebase-auth.js"),
  ]);
  const app = initializeApp(firebaseConfig);
  return { ...fs, ...auth, db: fs.getFirestore(app), auth: auth.getAuth(app) };
})());
