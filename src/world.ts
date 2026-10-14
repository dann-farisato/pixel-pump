import { OUT, blob, box, iso, line, poly, rect, shade, shadow, wallText, wallX, wallY } from "./art";
import { type Look, type Pose, bubble, drawPerson, rope } from "./people";

export const COLS = 14;
export const ROWS = 10;
const WALL = 74;

export type StationId = "treadmill" | "bike" | "press" | "bag" | "pullup" | "yoga";

export type Station = {
  id: StationId;
  name: string;
  verb: string;
  access: [number, number]; // where the player stands to start
  spot: [number, number, number]; // where the player trains (gx, gy, z)
  hit: [number, number]; // tap target center (grid)
};

export const STATIONS: Station[] = [
  { id: "treadmill", name: "Treadmill", verb: "Sprint", access: [4.6, 3.35], spot: [4.6, 1.6, 6], hit: [4.6, 1.5] },
  { id: "bike", name: "Spin Bike", verb: "Cadence", access: [7.8, 2.8], spot: [7.8, 1.55, 9], hit: [7.8, 1.5] },
  { id: "press", name: "Power Rack", verb: "Overhead Press", access: [2.4, 4.0], spot: [1.25, 4.0, 0], hit: [1.2, 4.0] },
  { id: "bag", name: "Heavy Bag", verb: "Combo", access: [5.9, 6.45], spot: [6.0, 6.05, 0], hit: [6.5, 5.5] },
  { id: "pullup", name: "Pull-up Bar", verb: "Pull-ups", access: [9.55, 4.6], spot: [9.55, 4.55, 29], hit: [9.55, 4.55] },
  { id: "yoga", name: "Yoga Mat", verb: "Balance", access: [10.8, 7.3], spot: [10.8, 7.3, 1], hit: [10.8, 7.3] },
];

/** Live state the scene reads while drawing (set by the game loop). */
export const scene = {
  t: 0,
  active: null as StationId | null,
  beltSpeed: 0, // treadmill belt animation speed
  wheel: 0, // bike flywheel phase
  bagSwing: 0, // punching bag offset in px
};

// ---------- the room (pre-rendered once) ----------

const isWood = (i: number, j: number) => i >= 10 && j >= 6;

export function drawRoom() {
  // Floor tiles.
  for (let j = 0; j < ROWS; j++)
    for (let i = 0; i < COLS; i++) {
      const pts = [iso(i, j), iso(i + 1, j), iso(i + 1, j + 1), iso(i, j + 1)];
      if (isWood(i, j)) {
        for (let s = 0; s < 4; s++) {
          const a = j + s / 4;
          const b = j + (s + 1) / 4;
          poly([iso(i, a), iso(i + 1, a), iso(i + 1, b), iso(i, b)], ["#d99a5b", "#cf8e4e", "#dda262", "#c98848"][(s + i) % 4]);
        }
      } else {
        poly(pts, (i + j) % 2 ? "#5b6a8f" : "#566489");
        const [x, y] = iso(i + 0.5, j + 0.5);
        if ((i * 7 + j * 3) % 5 === 0) rect(x, y, 1, 1, "#6a7aa1");
      }
    }
  // Tile grout lines on the rubber floor.
  for (let i = 0; i <= COLS; i++) {
    const a = iso(i, 0);
    const b = iso(i, ROWS);
    line(a[0], a[1], b[0], b[1], "rgba(40,48,72,0.35)");
  }
  for (let j = 0; j <= ROWS; j++) {
    const a = iso(0, j);
    const b = iso(COLS, j);
    line(a[0], a[1], b[0], b[1], "rgba(40,48,72,0.35)");
  }
  // Running lane by the windows.
  poly([iso(3.6, 3.7), iso(11, 3.7), iso(11, 4.0), iso(3.6, 4.0)], "#e0574f");
  for (let k = 4; k < 11; k += 1.2) poly([iso(k, 3.8), iso(k + 0.5, 3.8), iso(k + 0.5, 3.9), iso(k, 3.9)], "#f6d7c3");

  // Back-right wall (gy = 0) and back-left wall (gx = 0).
  wallX(0, COLS, 0, WALL, "#f3e4c9");
  wallY(0, ROWS, 0, WALL, "#e8d4b3");
  wallX(0, COLS, 0, 16, "#2f9c8f");
  wallY(0, ROWS, 0, 16, "#278577");
  wallX(0, COLS, 15, 17, "#f8f0de");
  wallY(0, ROWS, 15, 17, "#efe2c8");
  const corner = [iso(0, 0, 0), iso(0, 0, WALL)];
  line(corner[0][0], corner[0][1], corner[1][0], corner[1][1], "#cdb791");
  // Wall top caps.
  poly([iso(0, 0, WALL), iso(COLS, 0, WALL), iso(COLS, -0.25, WALL), iso(-0.25, -0.25, WALL)], "#4a3a5a");
  poly([iso(0, 0, WALL), iso(0, ROWS, WALL), iso(-0.25, ROWS, WALL), iso(-0.25, -0.25, WALL)], "#3d304c");

  // Mirrors along the left wall.
  wallY(2.4, 8.9, 19, 66, OUT);
  wallY(2.5, 8.8, 20, 65, "#a9d6ea");
  for (let k = 2.9; k < 8.6; k += 1.4) {
    poly([iso(0, k, 26), iso(0, k + 0.25, 26), iso(0, k + 0.8, 58), iso(0, k + 0.55, 58)], "#d4eef8");
  }
  for (const k of [4.6, 6.7]) wallY(k, k + 0.06, 20, 65, OUT);

  // Posters and a clock on the right wall.
  wallX(0.6, 2.4, 26, 56, OUT);
  wallX(0.7, 2.3, 27, 55, "#ff6b4a");
  wallX(0.9, 2.1, 42, 52, "#ffd25e");
  wallX(0.9, 1.6, 31, 38, "#fff2d6");
  const [cx, cy] = iso(2.95, 0, 58);
  blob(cx, cy, 5, 5, OUT);
  blob(cx, cy, 4, 4, "#fffaf0");
  line(cx, cy, cx, cy - 3, OUT);
  line(cx, cy, cx + 2, cy + 1, OUT);
  // Small poster on the left wall.
  wallY(9.1, 9.8, 26, 50, OUT);
  wallY(9.2, 9.7, 27, 49, "#7b5cff");
  wallY(9.3, 9.6, 38, 46, "#b6f35c");
}

/** Window with a live sunset. Drawn each frame for drifting clouds. */
export function drawWindow(t: number) {
  const g0 = 3.6;
  const g1 = 11;
  const z0 = 23;
  const z1 = 66;
  wallX(g0 - 0.1, g1 + 0.1, z0 - 2, z1 + 2, OUT);
  const bands = ["#ffd88a", "#ffbb73", "#ff9a6a", "#f07b7f", "#c96a95", "#8e5d9c", "#5f4f8f"];
  const step = (z1 - z0) / bands.length;
  bands.forEach((c, i) => wallX(g0, g1, z0 + i * step, z0 + (i + 1) * step + 0.5, c));
  // Sun.
  const [sx, sy] = iso(8.2, 0, z0 + 8);
  blob(sx, sy, 7, 7, "#fff1b8");
  blob(sx, sy, 5, 5, "#fffbe6");
  // Clouds drift slowly and wrap inside the window.
  for (let k = 0; k < 3; k++) {
    const span = g1 - g0 - 1.2;
    const u = g0 + 0.3 + ((k * 2.6 + t * 0.08) % span);
    const z = z0 + 26 + k * 6;
    const [x, y] = iso(u, 0, z);
    blob(x, y, 7, 2, "#ffd1d1");
    blob(x + 4, y + 1, 5, 2, "#ffe4e0");
  }
  // City skyline.
  const heights = [10, 16, 8, 20, 12, 7, 18, 11, 14, 9, 17, 10, 13, 8];
  let u = g0;
  heights.forEach((h, i) => {
    const w = 0.45 + (i % 3) * 0.12;
    const u1 = Math.min(g1, u + w);
    wallX(u, u1, z0, z0 + h, i % 2 ? "#3d2c5c" : "#4a3569");
    for (let wz = z0 + 3; wz < z0 + h - 2; wz += 4)
      if ((i + wz) % 3) {
        const [x, y] = iso(u + 0.15, 0, wz);
        rect(x, y, 1, 1, "#ffd27a");
      }
    u = u1;
  });
  // Mullions and sill.
  for (const m of [5.45, 7.3, 9.15]) wallX(m - 0.05, m + 0.05, z0, z1, "#2c2140");
  wallX(g0, g1, z0 + 20, z0 + 21, "#2c2140");
  wallX(g0 - 0.15, g1 + 0.15, z0 - 3, z0, "#fff6e3");
  // Neon sign right of the window.
  const flicker = Math.sin(t * 7) > -0.95;
  wallX(11.4, 13.6, 36, 54, "#2c2140");
  if (flicker) wallText("PUMP", 11.75, 50, "#fff0f7", "rgba(255,79,163,0.55)");
  else wallText("PUMP", 11.75, 50, "#a06080", "rgba(0,0,0,0)");
}

// ---------- objects & people ----------

type Thing = { depth: number; draw: () => void };

type Npc = { gx: number; gy: number; look: Look; anim: (t: number) => { pose: Pose; frame: number; z?: number; flip?: boolean }; extra?: (x: number, y: number, t: number) => void };

const look = (o: Partial<Look> & Pick<Look, "skin" | "shirt">): Look => ({ hair: "#2b1d1a", style: "short", pants: "#33395a", shoes: "#f4f1ea", ...o });

const SKIN = ["#f6c9a5", "#e0a77f", "#c6865b", "#9b6141", "#6e4430"];

export const PLAYER_LOOK: Look = look({ skin: SKIN[1], shirt: "#b6f35c", pants: "#2a2f4a", style: "cap", cap: "#ff4fa3", hair: "#3a2416" });

export const NPCS: Npc[] = [
  { gx: 6.0, gy: 1.6, look: look({ skin: SKIN[3], shirt: "#ff8a1f", style: "curly", hair: "#1e1410" }), anim: (t) => ({ pose: "run", frame: Math.floor(t * 8) % 2, z: 6 }) },
  { gx: 9.2, gy: 1.55, look: look({ skin: SKIN[0], shirt: "#3fa9f5", style: "long", hair: "#c9782b" }), anim: (t) => ({ pose: "bike", frame: Math.floor(t * 5) % 2, z: 9 }) },
  { gx: 2.1, gy: 7.2, look: look({ skin: SKIN[4], shirt: "#e2483d", style: "bald", pants: "#1f2236" }), anim: (t) => ({ pose: Math.floor(t * 1.6) % 2 ? "curlUp" : "curlDown", frame: 0 }) },
  { gx: 7.8, gy: 8.4, look: look({ skin: SKIN[2], shirt: "#7b5cff", style: "bun", hair: "#2b1d1a" }), anim: (t) => ({ pose: "jump", frame: Math.floor(t * 4) % 2 }), extra: (x, y, t) => rope(x, y - (Math.floor(t * 4) % 2 ? 3 : 0), Math.floor(t * 4) % 2 === 1) },
  { gx: 12.4, gy: 7.3, look: look({ skin: SKIN[1], shirt: "#2fbf9f", style: "long", hair: "#1b1b2a", pants: "#7b5cff" }), anim: (t) => ({ pose: "stretch", frame: Math.floor(t * 0.7) % 2, z: 1 }) },
  { gx: 12.4, gy: 4.25, look: look({ skin: SKIN[2], shirt: "#ffd25e", style: "short", hair: "#3a2416" }), anim: (t) => ({ pose: "stand", frame: 0, flip: Math.floor(t * 0.4) % 2 === 0 }) },
  { gx: 12.5, gy: 0.75, look: look({ skin: SKIN[0], shirt: "#ff4fa3", style: "bun", hair: "#6b3b1f" }), anim: () => ({ pose: "stand", frame: 0 }) },
];

/** Tiles that people can't walk through. */
export const blocked: boolean[][] = Array.from({ length: COLS }, () => Array(ROWS).fill(false));
function block(gx: number, gy: number, w: number, d: number) {
  for (let i = Math.floor(gx); i < Math.ceil(gx + w); i++)
    for (let j = Math.floor(gy); j < Math.ceil(gy + d); j++) if (i >= 0 && j >= 0 && i < COLS && j < ROWS) blocked[i][j] = true;
}
[
  [4.2, 0.6, 0.8, 1.8],
  [5.6, 0.6, 0.8, 1.8],
  [7.4, 1.0, 0.8, 1.0],
  [8.8, 1.0, 0.8, 1.0],
  [0.6, 3.2, 1.2, 1.6],
  [0.4, 6.0, 0.9, 2.0],
  [6.2, 5.2, 0.6, 0.6],
  [9.0, 5.0, 0.2, 0.2],
  [10.0, 4.0, 0.2, 0.2],
  [11.5, 1.2, 2.0, 1.0],
  [13.0, 3.4, 0.5, 0.5],
  [0.2, 0.2, 0.7, 0.7],
  [5.0, 9.2, 0.6, 0.6],
  [0.3, 9.1, 0.6, 0.6],
  [9.0, 8.4, 0.5, 0.5],
  [3.1, 8.1, 0.6, 0.5],
  [12.0, 0.0, 1.5, 1.2],
].forEach(([a, b, c, d]) => block(a, b, c, d));
for (const n of NPCS) block(n.gx - 0.2, n.gy - 0.2, 0.4, 0.4);

export const isFree = (gx: number, gy: number) => {
  const i = Math.floor(gx);
  const j = Math.floor(gy);
  return i >= 0 && j >= 0 && i < COLS && j < ROWS && !blocked[i][j];
};

function plant(gx: number, gy: number, big: boolean) {
  box({ gx, gy, w: 0.6, d: 0.6, h: 8, c: "#c8643b" });
  const [x, y] = iso(gx + 0.3, gy + 0.3, 8);
  const greens = ["#2f8f4e", "#3fae5c", "#57c96b", "#86e07a"];
  const leaves = big
    ? [[-7, -10, 6, 4], [6, -12, 6, 4], [-2, -20, 5, 5], [-9, -22, 5, 3], [8, -24, 5, 3], [1, -30, 4, 4], [-4, -14, 5, 4], [4, -18, 5, 4]]
    : [[-4, -6, 4, 3], [4, -7, 4, 3], [0, -12, 4, 4], [0, -4, 4, 2]];
  leaves.forEach(([dx, dy, rx, ry], k) => blob(x + dx, y + dy, rx + 1, ry + 1, OUT));
  leaves.forEach(([dx, dy, rx, ry], k) => {
    blob(x + dx, y + dy, rx, ry, greens[k % 3]);
    blob(x + dx - 1, y + dy - 1, Math.max(1, rx - 2), Math.max(1, ry - 2), greens[(k % 3) + 1]);
  });
}

function treadmill(gx: number, gy: number, speed: number) {
  box({ gx, gy, w: 0.8, d: 1.8, h: 5, c: "#3a3d52" });
  // Belt.
  const belt = [iso(gx + 0.12, gy + 0.3, 5.1), iso(gx + 0.68, gy + 0.3, 5.1), iso(gx + 0.68, gy + 1.75, 5.1), iso(gx + 0.12, gy + 1.75, 5.1)];
  poly(belt, "#24263a");
  const off = (scene.t * speed * 0.6) % 0.4;
  for (let k = 0.3 + off; k < 1.75; k += 0.4) {
    const a = iso(gx + 0.12, gy + k, 5.1);
    const b = iso(gx + 0.68, gy + k, 5.1);
    line(a[0], a[1], b[0], b[1], "#3c4060");
  }
  // Console posts and screen.
  box({ gx: gx + 0.05, gy: gy + 0.05, w: 0.1, d: 0.1, h: 26, z: 5, c: "#9aa3b5", edge: false });
  box({ gx: gx + 0.65, gy: gy + 0.05, w: 0.1, d: 0.1, h: 26, z: 5, c: "#9aa3b5", edge: false });
  box({ gx, gy, w: 0.8, d: 0.3, h: 5, z: 28, c: "#2f9c8f" });
  const [sx, sy] = iso(gx + 0.4, gy + 0.3, 31);
  rect(sx - 3, sy - 1, 5, 2, speed > 0 ? "#b6f35c" : "#1d5c55");
}

function bike(gx: number, gy: number, phase: number) {
  box({ gx: gx + 0.1, gy: gy + 0.1, w: 0.6, d: 0.8, h: 3, c: "#2d2f3a" });
  // Flywheel: a disc drawn on the side.
  const [fx, fy] = iso(gx + 0.75, gy + 0.3, 12);
  blob(fx, fy, 6, 6, OUT);
  blob(fx, fy, 5, 5, "#e2483d");
  const a = phase;
  line(fx, fy, fx + Math.cos(a) * 4, fy + Math.sin(a) * 4, "#ffe0d6");
  line(fx, fy, fx - Math.cos(a) * 4, fy - Math.sin(a) * 4, "#ffe0d6");
  box({ gx: gx + 0.35, gy: gy + 0.5, w: 0.12, d: 0.12, h: 12, z: 3, c: "#9aa3b5", edge: false });
  box({ gx: gx + 0.22, gy: gy + 0.42, w: 0.38, d: 0.3, h: 2, z: 14, c: "#1d1e2a" });
  box({ gx: gx + 0.35, gy: gy + 0.05, w: 0.12, d: 0.12, h: 20, z: 3, c: "#9aa3b5", edge: false });
  box({ gx: gx + 0.1, gy: gy + 0.02, w: 0.6, d: 0.12, h: 2, z: 22, c: "#1d1e2a" });
}

export function buildThings(player: { draw: () => void; depth: number }): Thing[] {
  const t = scene.t;
  const things: Thing[] = [];
  const add = (depth: number, draw: () => void) => things.push({ depth, draw });

  // Treadmills and bikes by the window.
  add(4.6 + 1.5, () => treadmill(4.2, 0.6, scene.active === "treadmill" ? scene.beltSpeed : 0));
  add(6.0 + 1.5, () => treadmill(5.6, 0.6, 9));
  add(7.8 + 1.5, () => bike(7.4, 1.0, scene.active === "bike" ? scene.wheel : 0));
  add(9.2 + 1.5, () => bike(8.8, 1.0, t * 6));

  // Power rack against the left wall.
  add(1.2 + 4.0, () => {
    const posts: [number, number][] = [[0.6, 3.2], [1.7, 3.2], [0.6, 4.7], [1.7, 4.7]];
    box({ gx: 0.5, gy: 3.1, w: 1.4, d: 1.8, h: 1, c: "#3a3d52" });
    for (const [a, b] of posts) box({ gx: a, gy: b, w: 0.12, d: 0.12, h: 50, c: "#e2483d", edge: false });
    box({ gx: 0.6, gy: 3.2, w: 1.22, d: 0.12, h: 3, z: 48, c: "#e2483d", edge: false });
    box({ gx: 0.6, gy: 4.7, w: 1.22, d: 0.12, h: 3, z: 48, c: "#e2483d", edge: false });
    if (scene.active !== "press") {
      const a = iso(1.2, 3.0, 30);
      const b = iso(1.2, 5.0, 30);
      line(a[0], a[1], b[0], b[1], "#9aa3b5");
      for (const [px0, py0] of [a, b]) rect(px0 - 1, py0 - 4, 3, 8, "#2d2f3a");
    }
  });

  // Dumbbell rack.
  add(0.85 + 7.0, () => {
    box({ gx: 0.4, gy: 6.0, w: 0.9, d: 2.0, h: 6, c: "#4a3a5a" });
    box({ gx: 0.4, gy: 6.0, w: 0.6, d: 2.0, h: 4, z: 14, c: "#4a3a5a" });
    const colors = ["#e2483d", "#ff8a1f", "#ffd25e", "#3fa9f5", "#7b5cff"];
    for (let k = 0; k < 5; k++) {
      const [x, y] = iso(1.05, 6.25 + k * 0.38, 7);
      rect(x - 2, y - 2, 5, 3, OUT);
      rect(x - 1, y - 1, 3, 1, colors[k]);
      const [x2, y2] = iso(0.75, 6.25 + k * 0.38, 19);
      rect(x2 - 2, y2 - 2, 5, 3, OUT);
      rect(x2 - 1, y2 - 1, 3, 1, colors[4 - k]);
    }
  });

  // Heavy bag hanging from the ceiling.
  add(6.5 + 5.5, () => {
    const sw = scene.bagSwing;
    const top = iso(6.5, 5.5, 72);
    const [bx, by] = iso(6.5, 5.5, 44);
    shadow(...(iso(6.5, 5.5) as [number, number]), 7);
    line(top[0], top[1], bx + sw * 0.4, by, "#6b6f80");
    rect(bx - 6 + sw, by - 1, 13, 30, OUT);
    rect(bx - 5 + sw, by, 11, 28, "#b8322d");
    rect(bx + 2 + sw, by, 4, 28, "#8e2522");
    rect(bx - 4 + sw, by + 1, 2, 25, "#e0574f");
    rect(bx - 5 + sw, by + 4, 11, 2, "#1d1e2a");
    rect(bx - 5 + sw, by + 22, 11, 2, "#1d1e2a");
  });

  // Pull-up station: two posts and a bar facing the viewer.
  add(9.55 + 4.55, () => {
    for (const [a, b] of [[9.0, 5.0], [10.0, 4.0]] as [number, number][]) {
      box({ gx: a - 0.15, gy: b - 0.15, w: 0.4, d: 0.4, h: 2, c: "#3a3d52" });
      box({ gx: a, gy: b, w: 0.12, d: 0.12, h: 54, z: 2, c: "#2f9c8f", edge: false });
    }
    const L = iso(9.05, 5.05, 54);
    const R = iso(10.05, 4.05, 54);
    rect(L[0], L[1] - 1, R[0] - L[0] + 2, 3, OUT);
    rect(L[0], L[1], R[0] - L[0] + 1, 1, "#d7dbe6");
  });

  // Yoga mats on the wooden floor.
  add(10.8 + 7.3 - 1, () => {
    box({ gx: 10.4, gy: 6.4, w: 0.8, d: 1.8, h: 1, c: "#7b5cff", edge: "#4b3699" });
    box({ gx: 12.0, gy: 6.4, w: 0.8, d: 1.8, h: 1, c: "#2fbf9f", edge: "#1d7a66" });
  });
  // Rolled mats + exercise ball + kettlebells.
  add(13.0 + 5.4, () => {
    for (let k = 0; k < 3; k++) {
      const [x, y] = iso(13.3, 5.2 + k * 0.35, 3);
      blob(x, y, 4, 3, OUT);
      blob(x, y, 3, 2, ["#ff4fa3", "#ffd25e", "#3fa9f5"][k]);
      rect(x - 1, y - 1, 2, 1, "rgba(255,255,255,0.5)");
    }
  });
  add(9.25 + 8.65, () => {
    const [x, y] = iso(9.25, 8.65, 0);
    shadow(x, y, 8);
    blob(x, y - 8, 9, 8, OUT);
    blob(x, y - 8, 8, 7, "#3fa9f5");
    blob(x - 3, y - 11, 3, 2, "#a7dcff");
  });
  add(3.4 + 8.35, () => {
    for (const [a, b, c] of [[3.25, 8.3, "#2d2f3a"], [3.6, 8.45, "#e2483d"], [3.3, 8.6, "#2d2f3a"]] as [number, number, string][]) {
      const [x, y] = iso(a, b);
      shadow(x, y, 4);
      blob(x, y - 3, 4, 3, OUT);
      blob(x, y - 3, 3, 2, c);
      rect(x - 2, y - 8, 5, 1, OUT);
      rect(x - 2, y - 8, 1, 3, OUT);
      rect(x + 2, y - 8, 1, 3, OUT);
    }
  });

  // Front desk, water cooler and plants.
  add(12.5 + 1.7, () => {
    box({ gx: 11.5, gy: 1.2, w: 2.0, d: 1.0, h: 18, c: "#b9733f" });
    box({ gx: 11.4, gy: 1.1, w: 2.2, d: 1.2, h: 2, z: 18, c: "#fff2d6" });
    box({ gx: 12.6, gy: 1.4, w: 0.5, d: 0.15, h: 8, z: 20, c: "#2d2f3a" });
    const [x, y] = iso(11.8, 1.6, 20);
    blob(x, y - 3, 3, 3, OUT);
    blob(x, y - 3, 2, 2, "#3fae5c");
  });
  add(13.25 + 3.65, () => {
    box({ gx: 13.0, gy: 3.4, w: 0.5, d: 0.5, h: 16, c: "#eef1f6" });
    box({ gx: 13.08, gy: 3.48, w: 0.34, d: 0.34, h: 11, z: 16, c: "#7cc7f2", top: "#b8e4ff" });
    if (Math.floor(t * 2) % 3 === 0) {
      const [x, y] = iso(13.25, 3.65, 20 + ((t * 20) % 6));
      rect(x, y, 1, 1, "#ffffff");
    }
  });
  add(0.55 + 0.55, () => plant(0.25, 0.25, true));
  add(5.3 + 9.45, () => plant(5.0, 9.2, true));
  add(0.6 + 9.4, () => plant(0.3, 9.1, false));

  // NPCs.
  NPCS.forEach((n, i) => {
    add(n.gx + n.gy + 0.05, () => {
      const a = n.anim(t + i * 0.37);
      const [x, y] = iso(n.gx, n.gy, a.z ?? 0);
      drawPerson(x, y, n.look, a.pose, a.frame, a.flip, (a.z ?? 0) < 2);
      n.extra?.(x, y, t);
      // Each NPC pops a bubble now and then.
      const cycle = (t + i * 2.3) % 9;
      if (cycle < 1.6) bubble(x, y - 27 - (a.pose === "stretch" ? 4 : 0), (["drop", "heart", "note", "star", "bang", "note", "heart"] as const)[i]);
    });
  });

  things.push(player);
  things.sort((a, b) => a.depth - b.depth);
  return things;
}

/** Tile path between two floor positions (4-neighbour BFS). */
export function findPath(from: [number, number], to: [number, number]): [number, number][] | null {
  const s = [Math.floor(from[0]), Math.floor(from[1])];
  const g = [Math.floor(to[0]), Math.floor(to[1])];
  if (!isFree(to[0], to[1])) return null;
  const key = (i: number, j: number) => i * 100 + j;
  const prev = new Map<number, number>();
  const q: [number, number][] = [[s[0], s[1]]];
  prev.set(key(s[0], s[1]), -1);
  while (q.length) {
    const [i, j] = q.shift()!;
    if (i === g[0] && j === g[1]) {
      const path: [number, number][] = [to];
      let k = prev.get(key(i, j))!;
      while (k !== -1 && k !== undefined) {
        const pi = Math.floor(k / 100);
        const pj = k % 100;
        if (pi === s[0] && pj === s[1]) break;
        path.unshift([pi + 0.5, pj + 0.5]);
        k = prev.get(k)!;
      }
      return path;
    }
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= COLS || nj >= ROWS || blocked[ni][nj] || prev.has(key(ni, nj))) continue;
      prev.set(key(ni, nj), key(i, j));
      q.push([ni, nj]);
    }
  }
  return null;
}

export { shade };
