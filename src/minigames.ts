import type { Pose } from "./people";
import type { StationId } from "./world";
import { scene } from "./world";
import { sfx } from "./audio";

export type Key = "left" | "right" | "up" | "down" | "action";

export interface Game {
  how: string;
  buttons: { key: Key; label: string; wide?: boolean }[];
  mount(root: HTMLElement): void;
  update(dt: number, held: Set<Key>): void;
  press(k: Key): void;
  render(): void;
  status(): string;
  pose(): { pose: Pose; frame: number };
  done: boolean;
  score: number; // 0..100
}

const el = (tag: string, cls: string, parent: HTMLElement, html = "") => {
  const e = document.createElement(tag);
  e.className = cls;
  e.innerHTML = html;
  parent.appendChild(e);
  return e;
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** A horizontal meter with an optional highlighted zone and a needle. */
function meter(root: HTMLElement, label: string) {
  const wrap = el("div", "meter", root);
  el("div", "meter-label", wrap, label);
  const track = el("div", "meter-track", wrap);
  const zone = el("div", "meter-zone", track);
  const fill = el("div", "meter-fill", track);
  const needle = el("div", "meter-needle", track);
  return {
    fill: (p: number) => (fill.style.width = `${clamp(p, 0, 100)}%`),
    zone: (a: number, b: number) => {
      zone.style.left = `${a}%`;
      zone.style.width = `${b - a}%`;
    },
    needle: (p: number) => (needle.style.left = `${clamp(p, 0, 100)}%`),
    hideNeedle: () => (needle.style.display = "none"),
    hideZone: () => (zone.style.display = "none"),
    flash: (cls: string) => {
      track.classList.remove("good", "bad", "perfect");
      void track.offsetWidth;
      track.classList.add(cls);
    },
  };
}

// ---------- Treadmill: alternate left / right to sprint ----------
class Sprint implements Game {
  how = "Alternate ← and → as fast as you can. Same key twice and you stumble.";
  buttons = [
    { key: "left" as Key, label: "◀ L" },
    { key: "right" as Key, label: "R ▶" },
  ];
  time = 12;
  speed = 0;
  dist = 0;
  last: Key | null = null;
  phase = 0;
  done = false;
  score = 0;
  m!: ReturnType<typeof meter>;
  d!: ReturnType<typeof meter>;
  mount(root: HTMLElement) {
    this.d = meter(root, "Distance · goal 300 m");
    this.m = meter(root, "Speed");
    this.d.hideZone();
    this.d.hideNeedle();
    this.m.hideNeedle();
    this.m.zone(70, 100);
  }
  press(k: Key) {
    if (k !== "left" && k !== "right") return;
    if (k === this.last) {
      this.speed *= 0.55;
      this.m.flash("bad");
      sfx.miss();
    } else {
      this.speed = Math.min(12, this.speed + 1.25);
      sfx.tick(300 + this.speed * 40);
    }
    this.last = k;
  }
  update(dt: number) {
    this.time -= dt;
    this.speed = Math.max(0, this.speed - 2.6 * dt);
    this.dist += this.speed * dt * 3.2;
    this.phase += this.speed * dt * 1.4;
    scene.beltSpeed = this.speed;
    this.score = clamp((this.dist / 300) * 100, 0, 100);
    if (this.time <= 0 || this.dist >= 300) this.done = true;
  }
  render() {
    this.d.fill(this.score);
    this.m.fill((this.speed / 12) * 100);
  }
  status = () => `${Math.max(0, this.time).toFixed(1)}s · ${Math.floor(this.dist)} m`;
  pose = () => ({ pose: (this.speed > 0.3 ? "run" : "stand") as Pose, frame: Math.floor(this.phase) % 2 });
}

// ---------- Spin bike: hold to pedal, keep the needle in the zone ----------
class Cadence implements Game {
  how = "Hold to pedal, let go to ease off. Keep the needle inside the green zone.";
  buttons = [{ key: "action" as Key, label: "HOLD · PEDAL", wide: true }];
  time = 12;
  rpm = 0;
  inZone = 0;
  zoneCenter = 70;
  target = 70;
  retarget = 0;
  phase = 0;
  done = false;
  score = 0;
  m!: ReturnType<typeof meter>;
  mount(root: HTMLElement) {
    this.m = meter(root, "Cadence");
  }
  press() {}
  update(dt: number, held: Set<Key>) {
    this.time -= dt;
    this.rpm = clamp(this.rpm + (held.has("action") ? 80 : -60) * dt, 0, 120);
    this.retarget -= dt;
    if (this.retarget <= 0) {
      this.target = 50 + Math.random() * 45;
      this.retarget = 3;
    }
    this.zoneCenter += (this.target - this.zoneCenter) * Math.min(1, dt * 1.5);
    const pct = (this.rpm / 120) * 100;
    if (Math.abs(pct - this.zoneCenter) < 11) this.inZone += dt;
    this.phase += (this.rpm / 60) * dt * 4;
    scene.wheel = this.phase * 1.6;
    this.score = clamp((this.inZone / 12) * 115, 0, 100);
    if (this.time <= 0) this.done = true;
  }
  render() {
    this.m.zone(this.zoneCenter - 11, this.zoneCenter + 11);
    this.m.needle((this.rpm / 120) * 100);
    this.m.fill(0);
  }
  status = () => `${Math.max(0, this.time).toFixed(1)}s · in zone ${this.inZone.toFixed(1)}s`;
  pose = () => ({ pose: "bike" as Pose, frame: Math.floor(this.phase) % 2 });
}

// ---------- Power rack: timing presses ----------
class Press implements Game {
  how = "Press when the marker is inside the zone. Six reps, and the zone shrinks every rep.";
  buttons = [{ key: "action" as Key, label: "PRESS", wide: true }];
  reps = 0;
  pos = 0;
  dir = 1;
  center = 50;
  pts = 0;
  up = 0;
  done = false;
  score = 0;
  m!: ReturnType<typeof meter>;
  mount(root: HTMLElement) {
    this.m = meter(root, "Timing");
    this.m.fill(0);
    this.center = 30 + Math.random() * 40;
  }
  width = () => 24 - this.reps * 2.6;
  press(k: Key) {
    if (k !== "action" || this.up > 0 || this.done) return;
    const off = Math.abs(this.pos - this.center);
    const w = this.width() / 2;
    if (off < w / 2) {
      this.pts += 20;
      this.m.flash("perfect");
      sfx.perfect();
      this.up = 0.55;
    } else if (off < w) {
      this.pts += 12;
      this.m.flash("good");
      sfx.good();
      this.up = 0.55;
    } else {
      this.m.flash("bad");
      sfx.miss();
      this.up = 0.25;
    }
    this.reps++;
    this.center = 25 + Math.random() * 50;
    this.score = clamp((this.pts / 120) * 100, 0, 100);
    if (this.reps >= 6) this.done = true;
  }
  update(dt: number) {
    this.up = Math.max(0, this.up - dt);
    const speed = 70 + this.reps * 18;
    this.pos += this.dir * speed * dt;
    if (this.pos > 100) {
      this.pos = 100;
      this.dir = -1;
    }
    if (this.pos < 0) {
      this.pos = 0;
      this.dir = 1;
    }
  }
  render() {
    const w = this.width() / 2;
    this.m.zone(this.center - w, this.center + w);
    this.m.needle(this.pos);
  }
  status = () => `Rep ${Math.min(this.reps + 1, 6)} / 6`;
  pose = () => ({ pose: (this.up > 0.2 ? "pressUp" : "pressDown") as Pose, frame: 0 });
}

// ---------- Heavy bag: arrow combos ----------
const ARROWS: Record<string, string> = { left: "←", up: "↑", right: "→", down: "↓" };
class Combo implements Game {
  how = "Hit the arrows in order. A wrong key resets the combo. Land six combos.";
  buttons = (["left", "up", "down", "right"] as Key[]).map((key) => ({ key, label: ARROWS[key] }));
  time = 14;
  seq: Key[] = [];
  idx = 0;
  combos = 0;
  punch = 0;
  flip = false;
  done = false;
  score = 0;
  row!: HTMLElement;
  m!: ReturnType<typeof meter>;
  mount(root: HTMLElement) {
    this.row = el("div", "combo", root);
    this.m = meter(root, "Combos · goal 6");
    this.m.hideNeedle();
    this.m.hideZone();
    this.next();
  }
  next() {
    const keys: Key[] = ["left", "up", "right", "down"];
    this.seq = Array.from({ length: 4 }, () => keys[Math.floor(Math.random() * 4)]);
    this.idx = 0;
  }
  press(k: Key) {
    if (k === "action" || this.done) return;
    if (k === this.seq[this.idx]) {
      this.idx++;
      this.punch = 0.18;
      scene.bagSwing = 4;
      sfx.punch();
      if (this.idx >= 4) {
        this.combos++;
        sfx.good();
        this.score = clamp((this.combos / 6) * 100, 0, 100);
        if (this.combos >= 6) this.done = true;
        this.next();
      }
    } else {
      this.idx = 0;
      this.m.flash("bad");
      sfx.miss();
    }
  }
  update(dt: number) {
    this.time -= dt;
    this.punch = Math.max(0, this.punch - dt);
    scene.bagSwing *= Math.pow(0.02, dt);
    if (this.time <= 0) this.done = true;
  }
  render() {
    this.row.innerHTML = this.seq.map((k, i) => `<span class="${i < this.idx ? "hit" : i === this.idx ? "now" : ""}">${ARROWS[k]}</span>`).join("");
    this.m.fill(this.score);
  }
  status = () => `${Math.max(0, this.time).toFixed(1)}s · ${this.combos} combos`;
  pose = () => ({ pose: (this.punch > 0 ? "punch" : "guard") as Pose, frame: 0 });
}

// ---------- Pull-up bar: mash to pull ----------
class Pullups implements Game {
  how = "Mash to pull yourself up. Stop and you sink back down. Goal: 8 reps.";
  buttons = [{ key: "action" as Key, label: "PULL", wide: true }];
  time = 12;
  power = 0;
  reps = 0;
  top = 0;
  done = false;
  score = 0;
  m!: ReturnType<typeof meter>;
  mount(root: HTMLElement) {
    this.m = meter(root, "Pull");
    this.m.hideNeedle();
    this.m.zone(85, 100);
  }
  press(k: Key) {
    if (k !== "action" && k !== "up") return;
    if (this.done) return;
    this.power += 13;
    sfx.tick(260 + this.power * 4);
    if (this.power >= 100) {
      this.power = 0;
      this.reps++;
      this.top = 0.4;
      sfx.good();
      this.score = clamp((this.reps / 8) * 100, 0, 100);
      if (this.reps >= 8) this.done = true;
    }
  }
  update(dt: number) {
    this.time -= dt;
    this.top = Math.max(0, this.top - dt);
    this.power = Math.max(0, this.power - 34 * dt);
    if (this.time <= 0) this.done = true;
  }
  render() {
    this.m.fill(this.power);
  }
  status = () => `${Math.max(0, this.time).toFixed(1)}s · ${this.reps} / 8 reps`;
  pose = () => ({ pose: (this.top > 0 || this.power > 70 ? "pull" : "hang") as Pose, frame: 0 });
}

// ---------- Yoga mat: hold the balance ----------
class Balance implements Game {
  how = "The wind pushes you around. Hold ← or → to stay centered in the zone.";
  buttons = [
    { key: "left" as Key, label: "◀ LEAN" },
    { key: "right" as Key, label: "LEAN ▶" },
  ];
  time = 12;
  x = 0;
  v = 0;
  wind = 0;
  inZone = 0;
  done = false;
  score = 0;
  m!: ReturnType<typeof meter>;
  mount(root: HTMLElement) {
    this.m = meter(root, "Balance");
    this.m.zone(36, 64);
    this.m.fill(0);
  }
  press() {}
  update(dt: number, held: Set<Key>) {
    this.time -= dt;
    this.wind += (Math.random() - 0.5) * 6 * dt;
    this.wind = clamp(this.wind * 0.995, -1.4, 1.4);
    const push = (held.has("left") ? -2.2 : 0) + (held.has("right") ? 2.2 : 0);
    this.v += (this.wind + push + this.x * 0.9) * dt;
    this.v *= Math.pow(0.35, dt);
    this.x += this.v * dt;
    if (Math.abs(this.x) > 1) {
      this.x = Math.sign(this.x);
      this.v = 0;
    }
    if (Math.abs(this.x) < 0.28) this.inZone += dt;
    this.score = clamp((this.inZone / 12) * 112, 0, 100);
    if (this.time <= 0) this.done = true;
  }
  render() {
    this.m.needle(50 + this.x * 50);
  }
  status = () => `${Math.max(0, this.time).toFixed(1)}s · centered ${this.inZone.toFixed(1)}s`;
  pose = () => ({ pose: "yoga" as Pose, frame: 0 });
  lean = () => Math.round(this.x * 3);
}

export function makeGame(id: StationId): Game {
  return { treadmill: new Sprint(), bike: new Cadence(), press: new Press(), bag: new Combo(), pullup: new Pullups(), yoga: new Balance() }[id];
}

export const starsFor = (score: number) => (score >= 85 ? 3 : score >= 60 ? 2 : score >= 30 ? 1 : 0);
