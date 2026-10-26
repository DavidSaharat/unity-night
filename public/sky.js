// Canvas ท้องฟ้า: ดาวพื้นหลัง ดาวตก และดาวน่ารักที่พุ่งขึ้นฟ้า
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) ** 2);
const DASH = 0.6; // วินาที: ช่วงพุ่งไวทะลุจอ
const DRIFT = 70; // px: ระยะที่ดาวลอยขึ้นช้าๆ ก่อนพุ่ง
const SWAY = 36; // px: ดาวเลี้ยวซ้ายแล้วขวาระหว่างลอยช้า (กลับมาตรงกลางก่อนพุ่ง)
// p 0→1: ซ้าย → ขวา → กลับกลาง พร้อมเอียงตัวตามทิศที่เลี้ยว
const sway = (p) => [-Math.sin(p * TAU) * SWAY, -Math.cos(p * TAU) * 0.22 * Math.sin(p * Math.PI)];
const PAPER_FADE = 0.9; // วินาที: กระดาษค่อยๆ จาง ตัวอักษรอยู่ที่เดิม
const GATHER = 0.8; // วินาที: ตัวอักษรรวมเป็นดาวพร้อมกัน
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v) => Math.min(1, Math.max(0, v));
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const easeOutBack = (p) => 1 + 2.7 * (p - 1) ** 3 + 1.7 * (p - 1) ** 2;

// n จุดเรียงเท่าๆ กันตามเส้นขอบดาว รัศมี R
function starRing(R, n) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? R * 0.382 : R;
    return [r * Math.cos(a), r * Math.sin(a)];
  });
  const edges = pts.map((p, i) => [p, pts[(i + 1) % 10]]);
  const lens = edges.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]));
  const total = lens.reduce((a, b) => a + b);
  return Array.from({ length: n }, (_, k) => {
    let d = ((k + 0.5) / n) * total, i = 0;
    while (d > lens[i]) d -= lens[i++];
    const [a, b] = edges[i], t = d / lens[i];
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  });
}

export class Sky {
  constructor(canvas, { bg = true } = {}) {
    this.showBg = bg;
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.bg = [];
    this.parts = [];
    this.accent = "#ffd86b";
    this.rocket = null;
    this.timers = [];
    this.flash = 0;
    this.wind = 0;
    this.dist = 0;
    this.lines = Array.from({ length: 40 }, () => ({ x: Math.random(), o: Math.random(), len: rand(80, 240) }));
    this.shoot = null;
    this.nextShoot = 4;
    this.time = 0;
    this.resize();
    addEventListener("resize", () => this.resize());
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = innerWidth;
    this.h = innerHeight;
    this.c.width = this.w * dpr;
    this.c.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round((this.w * this.h) / 7000);
    this.bg = Array.from({ length: n }, () => ({
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      r: rand(0.4, 1.7),
      ph: rand(0, TAU),
      sp: rand(0.6, 2.2),
    }));
  }

  // ดาวน่ารักโผล่ที่ (x,y) อยู่เฉยๆ hold วินาที แล้วพุ่งทะลุจอ
  launchStar({ x, y, R, hold, color, face, onLaunch, onImpact, onDone }) {
    this.rocket = { x, y, x0: x, y0: y, R, hold, color, face, t: 0, launched: false, onLaunch, onImpact, onDone };
  }

  // กระดาษจาง ตัวอักษรอยู่ที่เดิม แล้วรวมเป็นรูปดาวกลางจอพร้อมกัน จากนั้นดาวตัวอักษรลอยขึ้นฟ้า
  // glyphs: [{ch,x,y}] ตำแหน่งตัวอักษรบนกระดาษ (พิกัดหน้าจอ)
  launchLetters({ glyphs, cx, cy, R, srcSize, font, ink, tint, hold, onLaunch, onImpact, onState, onDone }) {
    const n = Math.max(70, glyphs.length), outer = Math.round(n * 0.62);
    const targets = [...starRing(R, outer), ...starRing(R * 0.52, n - outer)];
    const size = Math.min(R * 0.2, (R * 11.1) / n / 0.75);
    const letters = targets.map(([tx, ty], i) => ({
      ...glyphs[i % glyphs.length],
      tx: cx + tx, ty: cy + ty, delay: (i / n) * 0.15, rot: rand(-0.5, 0.5), dup: i >= glyphs.length,
    }));
    this.rocket = { x: cx, y: cy, x0: cx, y0: cy, R, hold, endY: -R * 0.7 - 20, t: 0, launched: false, seen: {}, onLaunch, onImpact, onState, onDone, letters, font, srcSize, scale: size / srcSize, ink: rgb(ink), tint: rgb(tint), tFloat: PAPER_FADE, pre: PAPER_FADE + 0.15 + GATHER + 0.1 };
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.ctx.clearRect(0, 0, this.w, this.h);
    if (this.showBg) this.drawBg(dt);
    this.drawWind(dt);
    if (this.rocket) this.rocket.letters ? this.updateLetters(dt) : this.updateRocket(dt);
    this.runTimers();
    this.updateParts(dt);
    this.drawFlash(dt);
    requestAnimationFrame((t) => this.loop(t));
  }

  drawBg(dt) {
    const ctx = this.ctx;
    ctx.fillStyle = "#fff";
    for (const s of this.bg) {
      ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.time * s.sp + s.ph));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // ดาวตกเป็นครั้งคราว
    this.nextShoot -= dt;
    if (this.nextShoot <= 0 && !this.shoot) {
      this.shoot = { x: rand(this.w * 0.4, this.w), y: rand(0, this.h * 0.35), t: 0 };
      this.nextShoot = rand(5, 10);
    }
    if (this.shoot) {
      const s = this.shoot;
      s.t += dt;
      const p = s.t / 0.9;
      const x = s.x - p * this.w * 0.35;
      const y = s.y + p * this.w * 0.2;
      const g = ctx.createLinearGradient(x, y, x + 70, y - 40);
      g.addColorStop(0, `rgba(255,255,255,${1 - p})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 70, y - 40);
      ctx.stroke();
      if (p >= 1) this.shoot = null;
    }
  }

  // เส้นลมไหลลงเร็วๆ ตอนดาวพุ่ง
  drawWind(dt) {
    if (!this.wind) return;
    const ctx = this.ctx, span = this.h + 300;
    ctx.strokeStyle = `rgba(255,255,255,${0.55 * this.wind})`;
    ctx.lineWidth = 1.5;
    for (const l of this.lines) {
      const y = ((l.o * span + this.dist) % span) - 150;
      ctx.beginPath();
      ctx.moveTo(l.x * this.w, y);
      ctx.lineTo(l.x * this.w, y + l.len * (0.3 + this.wind));
      ctx.stroke();
    }
    if (!this.rocket) this.wind = Math.max(0, this.wind - dt * 3.5);
  }

  // ดาวลอยขึ้นช้าๆ hold วินาที → พุ่งไวทะลุจอ (จอสั่นนิดหน่อย มีเส้นลมบางๆ)
  updateRocket(dt) {
    const r = this.rocket, ctx = this.ctx;
    const charge = 0.15, dash = DASH, tDash = r.hold + charge;
    const t = (r.t += dt);
    let sx = 1, sy = 1, rot = 0;
    r.dx = 0;

    if (t < r.hold) {
      const p = t / r.hold;
      r.y = r.y0 - DRIFT * p;
      [r.dx, rot] = sway(p);
      sx = sy = easeOutBack(Math.min(1, t / 0.3)) * (1 + 0.03 * Math.sin(t * 5));
    } else if (t < tDash) {
      sx = sy = 1 - 0.12 * easeInOut((t - r.hold) / charge);
    } else {
      if (!r.launched) { r.launched = true; r.yDash = r.y; r.onLaunch?.(); r.onImpact?.(); }
      const p = Math.min(1, (t - tDash) / dash), e = p;
      r.y = r.yDash - e * (r.yDash + r.R * 4);
      sy = 1 + 0.4 * p;
      sx = 1 / Math.sqrt(sy);
      this.wind = 0.45 * p;
      this.dist += dt * 2500 * (0.2 + p);
      if (p >= 1) { this.rocket = null; r.onDone?.(); return; }
    }

    ctx.save();
    ctx.translate(r.x + r.dx, r.y);
    ctx.rotate(rot);
    ctx.scale(sx, sy);
    this.drawStar(0, 0, r.R, 0, r.color, r.face);
    ctx.restore();
  }

  // ดาวตัวอักษรลอยขึ้นช้าๆ hold วินาที → พุ่งไวทะลุจอ (จอสั่นนิดหน่อย มีเส้นลมบางๆ)
  updateLetters(dt) {
    const r = this.rocket, u = (r.t += dt);
    const mark = (name, at) => { if (u >= at && !r.seen[name]) { r.seen[name] = 1; r.onState?.(name); } };
    const tDash = r.pre + r.hold;
    mark("gather", r.tFloat);
    mark("star", r.pre);

    let k = 1, sy = 1, rot = 0;
    if (u < tDash) {
      const p = clamp((u - r.pre) / r.hold);
      r.y = r.y0 - DRIFT * p;
      [r.dx, rot] = sway(p);
      r.x = r.x0 + r.dx;
    } else {
      r.x = r.x0;
      mark("rising", tDash);
      if (!r.launched) { r.launched = true; r.yDash = r.y; r.onLaunch?.(); r.onImpact?.(); }
      const p = Math.min(1, (u - tDash) / DASH), e = p;
      r.y = lerp(r.yDash, r.endY, e);
      k = 1 - 0.3 * e;
      sy = 1 + 0.3 * p;
      this.wind = 0.45 * p;
      this.dist += dt * 2500 * (0.2 + p);
      if (p >= 1) { mark("gone", 0); this.rocket = null; r.onDone?.(); return; }
    }
    this.drawLetters(r, k, 1, sy, rot);
  }

  drawLetters(r, k = 1, alpha = 1, sy = 1, rot = 0) {
    const ctx = this.ctx, u = r.t;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(r.x, r.y);
    ctx.rotate(rot);
    ctx.scale(k / Math.sqrt(sy), k * sy);
    ctx.translate(-r.x0, -r.y0);
    const glow = clamp((u - r.tFloat - 0.4) / 0.6);
    if (glow) {
      const g = ctx.createRadialGradient(r.x0, r.y0, 0, r.x0, r.y0, r.R * 1.8);
      g.addColorStop(0, this.accent + Math.round(glow * 110).toString(16).padStart(2, "0"));
      g.addColorStop(1, this.accent + "00");
      ctx.fillStyle = g;
      ctx.fillRect(r.x0 - r.R * 2, r.y0 - r.R * 2, r.R * 4, r.R * 4);
    }
    ctx.font = `${r.srcSize}px ${r.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = this.accent;
    r.letters.forEach((L, i) => {
      let x = L.x, y = L.y, rot = 0, sc = 1, mix = 0.2;
      const tg = r.tFloat + L.delay, tone = clamp(u / PAPER_FADE);
      if (L.dup && u < tg) return; // ตัวซ้ำ (เพิ่มให้ดาวเต็ม) โผล่ตอนเริ่มรวมเท่านั้น
      if (u >= tg) {
        const e = easeInOut(clamp((u - tg) / GATHER));
        x = lerp(L.x, L.tx, e); y = lerp(L.y, L.ty, e) - 25 * Math.sin(Math.PI * e);
        rot = L.rot * Math.sin(Math.PI * e); sc = lerp(1, r.scale, e); mix = e;
        if (u >= r.pre) y += Math.sin(this.time * 3 + i * 0.5) * 1.5;
      }
      ctx.shadowBlur = mix * 10;
      ctx.fillStyle = `rgb(${r.ink.map((c, j) => Math.round(lerp(c, r.tint[j], tone)))})`;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(sc, sc);
      ctx.fillText(L.ch, 0, 0);
      ctx.restore();
    });
    ctx.restore();
  }

  after(sec, fn) {
    this.timers.push({ at: this.time + sec, fn });
  }

  runTimers() {
    this.timers = this.timers.filter((t) => this.time < t.at || (t.fn(), false));
  }

  drawFlash(dt) {
    if (this.flash < 0.01) return;
    const ctx = this.ctx, y = this.h * 0.28;
    const g = ctx.createRadialGradient(this.w / 2, y, 0, this.w / 2, y, Math.max(this.w, this.h) * 0.7);
    g.addColorStop(0, `rgba(255,255,255,${this.flash * 0.55})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
    this.flash *= 0.9 ** (dt * 60);
  }

  // พลุระเบิดกลางจอ 1 ลูกใหญ่ + 3 ลูกเล็กตามมา
  burst(x, y, colors) {
    this.flash = 1;
    const pick = (i) => colors[i % colors.length];
    const shell = (cx, cy, scale, off) => {
      const n = Math.round(110 * scale);
      for (let i = 0; i < n; i++) {
        const a = (TAU * i) / n + rand(-0.03, 0.03), sp = rand(3.6, 4.8) * scale;
        this.addPart(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp, pick(i + off), "spark", rand(1.4, 2.4), rand(0.009, 0.014));
      }
      for (let i = 0; i < 40 * scale; i++) {
        const a = rand(0, TAU), sp = rand(0.4, 5) * scale;
        this.addPart(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp, "#fff", "glitter", rand(0.8, 1.6), rand(0.006, 0.012));
      }
    };
    shell(x, y, 1, 0);
    this.after(0.45, () => { this.flash = 0.5; shell(x - this.w * 0.22, y + this.h * 0.06, 0.62, 1); });
    this.after(0.85, () => { this.flash = 0.5; shell(x + this.w * 0.24, y + this.h * 0.03, 0.62, 3); });
    this.after(1.3, () => { this.flash = 0.35; shell(x + this.w * 0.04, y - this.h * 0.08, 0.5, 2); });
  }

  addPart(x, y, vx, vy, color, shape, size, decay) {
    if (this.parts.length > 1800) return;
    this.parts.push({ x, y, vx, vy, color, shape, size, decay, life: 1, trail: [], rot: rand(0, TAU) });
  }

  updateParts(dt) {
    const ctx = this.ctx, k = dt * 60;
    ctx.globalCompositeOperation = "lighter";
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      const dust = p.shape === "dust", drag = dust ? 1 : 0.975 ** k;
      p.vx *= drag;
      p.vy = p.vy * drag + (dust ? 0 : 0.045 * k);
      if (p.shape === "spark") {
        p.trail.push(p.x, p.y);
        if (p.trail.length > 10) p.trail.splice(0, 2);
      }
      p.x += p.vx * k;
      p.y += p.vy * k;
      p.life -= p.decay * k;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      ctx.globalAlpha = p.shape === "glitter" ? p.life * (0.4 + 0.6 * Math.abs(Math.sin(this.time * 18 + p.rot))) : p.life;
      ctx.fillStyle = ctx.strokeStyle = p.color;
      if (p.shape === "spark") {
        ctx.lineWidth = p.size;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.trail[0] ?? p.x, p.trail[1] ?? p.y);
        for (let j = 2; j < p.trail.length; j += 2) ctx.lineTo(p.trail[j], p.trail[j + 1]);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else if (p.shape === "star") {
        this.starPath(p.x, p.y, p.size, p.rot + this.time * 2, 0.45);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  starPath(x, y, R, rot, inner) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? R * inner : R;
      const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  }

  drawFace(x, y, R) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "#6b4a1e";
    ctx.beginPath();
    ctx.arc(x - R * 0.26, y - R * 0.02, R * 0.08, 0, TAU);
    ctx.arc(x + R * 0.26, y - R * 0.02, R * 0.08, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#6b4a1e";
    ctx.lineWidth = R * 0.06;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(x, y + R * 0.1, R * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,120,150,.55)";
    ctx.beginPath();
    ctx.arc(x - R * 0.42, y + R * 0.14, R * 0.09, 0, TAU);
    ctx.arc(x + R * 0.42, y + R * 0.14, R * 0.09, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // ดาวหน้าตาน่ารัก (ตา 2 ข้าง + ยิ้ม + แก้มชมพู)
  drawStar(x, y, R, rot, color, face) {
    const ctx = this.ctx;
    ctx.save();
    const g = ctx.createRadialGradient(x, y, R * 0.2, x, y, R * 3.2);
    g.addColorStop(0, this.accent + "8c");
    g.addColorStop(1, this.accent + "00");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, R * 3.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = ctx.strokeStyle = color;
    ctx.lineJoin = "round";
    ctx.lineWidth = R * 0.4;
    this.starPath(x, y, R * 0.85, Math.sin(this.time * 2) * 0.12 + rot, 0.5);
    ctx.fill();
    ctx.stroke();
    if (face) this.drawFace(x, y, R);
    ctx.restore();
  }
}
