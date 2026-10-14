import "./style.css";
import { H, W, iso, rect, setCtx, unIso, OUT } from "./art";
import { drawPerson } from "./people";
import { type Game, type Key, makeGame, starsFor } from "./minigames";
import { sfx, isMuted, setMuted, unlockAudio } from "./audio";
import { PLAYER_LOOK, STATIONS, type Station, type StationId, buildThings, drawRoom, drawWindow, findPath, isFree, scene } from "./world";

const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
const canvas = $<HTMLCanvasElement>("#game");
const stage = $<HTMLDivElement>("#stage");
const promptEl = $<HTMLButtonElement>("#prompt");
const panel = $<HTMLDivElement>("#panel");
const cardEl = $<HTMLDivElement>("#card-list");
const finale = $<HTMLDivElement>("#finale");

canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext("2d")!;
ctx.imageSmoothingEnabled = false;
setCtx(ctx);

// The room never changes, so render it once into an offscreen canvas.
const roomCanvas = document.createElement("canvas");
roomCanvas.width = W;
roomCanvas.height = H;
setCtx(roomCanvas.getContext("2d")!);
drawRoom();
setCtx(ctx);

// ---------- state ----------
const BEST_KEY = "pixelpump:best";
const player = { gx: 6.5, gy: 8.3, path: [] as [number, number][], goal: null as Station | null, walking: false, phase: 0, flip: false };
let session: { station: Station; game: Game; phase: "intro" | "play" | "result" } | null = null;
const results: Partial<Record<StationId, number>> = {};
let workoutStart = 0;
let finished = false;
const held = new Set<Key>();
let scale = 2;

// ---------- layout ----------
function resize() {
  const avail = stage.clientWidth;
  const s = avail / W;
  scale = s >= 2 ? Math.floor(s) : s;
  canvas.style.width = `${W * scale}px`;
  canvas.style.height = `${H * scale}px`;
}
new ResizeObserver(resize).observe(stage);

// ---------- input ----------
const KEYMAP: Record<string, Key> = {
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  Space: "action", Enter: "action", KeyE: "action",
};

addEventListener("keydown", (e) => {
  const k = KEYMAP[e.code];
  if (!k) return;
  if ((e.target as HTMLElement).closest?.("button") && (e.code === "Space" || e.code === "Enter")) return;
  e.preventDefault();
  unlockAudio();
  if (!held.has(k) || !e.repeat) input(k);
  held.add(k);
});
addEventListener("keyup", (e) => {
  const k = KEYMAP[e.code];
  if (k) held.delete(k);
});
addEventListener("blur", () => held.clear());

function input(k: Key) {
  if (!finale.hidden) return;
  if (session) {
    if (session.phase === "intro" && k === "action") beginPlay();
    else if (session.phase === "play") session.game.press(k);
    else if (session.phase === "result" && k === "action") closeSession();
    return;
  }
  if (k === "action") {
    const s = nearStation();
    if (s) openSession(s);
  } else {
    player.path = [];
    player.goal = null;
  }
}

canvas.addEventListener("pointerdown", (e) => {
  unlockAudio();
  if (session || !finale.hidden) return;
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * W;
  const y = ((e.clientY - r.top) / r.height) * H;
  // Tapping equipment walks there and starts the workout.
  for (const s of STATIONS) {
    const [sx, sy] = iso(s.hit[0], s.hit[1], 14);
    if (Math.hypot(sx - x, sy - y) < 20) return walkTo(s.access, s);
  }
  const [gx, gy] = unIso(x, y);
  if (isFree(gx, gy)) walkTo([gx, gy], null);
});

function walkTo(to: [number, number], goal: Station | null) {
  const path = findPath([player.gx, player.gy], to);
  if (!path) return;
  player.path = path;
  player.goal = goal;
}

promptEl.addEventListener("click", () => {
  const s = nearStation();
  if (s) openSession(s);
});

const muteBtn = $<HTMLButtonElement>("#mute");
const syncMute = () => {
  muteBtn.textContent = isMuted() ? "Sound: off" : "Sound: on";
  muteBtn.setAttribute("aria-pressed", String(!isMuted()));
};
muteBtn.addEventListener("click", () => {
  unlockAudio();
  setMuted(!isMuted());
  syncMute();
});
syncMute();

// ---------- workout sessions ----------
function nearStation() {
  return STATIONS.find((s) => Math.hypot(s.access[0] - player.gx, s.access[1] - player.gy) < 0.75) ?? null;
}

function openSession(station: Station) {
  if (!workoutStart) workoutStart = performance.now();
  player.path = [];
  player.goal = null;
  const game = makeGame(station.id);
  session = { station, game, phase: "intro" };
  scene.active = station.id;
  sfx.ui();
  panel.innerHTML = `
    <div class="win-bar"><span></span><span class="win-btns"><i></i><i></i><button class="win-x" aria-label="Close">×</button></span></div>
    <div class="win-body">
      <p class="how">${game.how}</p>
      <div class="game-ui" hidden></div>
      <div class="status" hidden></div>
      <div class="controls" hidden></div>
      <div class="actions"><button class="btn primary start">Start <kbd>Space</kbd></button></div>
    </div>`;
  panel.querySelector(".win-bar span")!.textContent = `${station.name} — ${station.verb}`;
  panel.hidden = false;
  panel.querySelector<HTMLButtonElement>(".win-x")!.onclick = () => closeSession();
  panel.querySelector<HTMLButtonElement>(".start")!.onclick = () => beginPlay();
  panel.querySelector<HTMLButtonElement>(".start")!.focus();
}

function beginPlay() {
  if (!session) return;
  session.phase = "play";
  sfx.start();
  const body = panel.querySelector<HTMLDivElement>(".win-body")!;
  body.querySelector(".actions")!.innerHTML = "";
  const ui = body.querySelector<HTMLDivElement>(".game-ui")!;
  ui.hidden = false;
  (body.querySelector(".status") as HTMLElement).hidden = false;
  session.game.mount(ui);
  const controls = body.querySelector<HTMLDivElement>(".controls")!;
  controls.hidden = false;
  for (const b of session.game.buttons) {
    const btn = document.createElement("button");
    btn.className = `pad${b.wide ? " wide" : ""}`;
    btn.textContent = b.label;
    btn.setAttribute("aria-label", b.key);
    const down = (e: Event) => {
      e.preventDefault();
      unlockAudio();
      held.add(b.key);
      session?.phase === "play" && session.game.press(b.key);
      btn.classList.add("down");
    };
    const up = () => {
      held.delete(b.key);
      btn.classList.remove("down");
    };
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointerleave", up);
    btn.addEventListener("pointercancel", up);
    controls.appendChild(btn);
  }
}

function showResult() {
  if (!session) return;
  session.phase = "result";
  held.clear();
  const { station, game } = session;
  const score = Math.round(game.score);
  const stars = starsFor(score);
  results[station.id] = Math.max(results[station.id] ?? 0, score);
  stars > 0 ? sfx.finish() : sfx.miss();
  const body = panel.querySelector<HTMLDivElement>(".win-body")!;
  body.innerHTML = `
    <div class="result">
      <div class="stars">${"★".repeat(stars)}<span>${"★".repeat(3 - stars)}</span></div>
      <div class="score">${score}<small>/100</small></div>
      <p>${["Shake it off and try again.", "Solid set. You'll feel that tomorrow.", "Strong work! Almost perfect.", "Flawless. The whole gym is watching."][stars]}</p>
    </div>
    <div class="actions">
      <button class="btn again">Again</button>
      <button class="btn primary done">Done <kbd>Space</kbd></button>
    </div>`;
  body.querySelector<HTMLButtonElement>(".again")!.onclick = () => openSession(station);
  body.querySelector<HTMLButtonElement>(".done")!.onclick = () => closeSession();
  body.querySelector<HTMLButtonElement>(".done")!.focus();
  renderCard();
}

function closeSession() {
  if (!session) return;
  const s = session.station;
  session = null;
  scene.active = null;
  scene.beltSpeed = 0;
  scene.bagSwing = 0;
  panel.hidden = true;
  player.gx = s.access[0];
  player.gy = s.access[1];
  canvas.focus();
  if (!finished && STATIONS.every((st) => starsFor(results[st.id] ?? 0) > 0)) showFinale();
}

// ---------- card & finale ----------
function totalStars() {
  return STATIONS.reduce((n, s) => n + starsFor(results[s.id] ?? 0), 0);
}

function renderCard() {
  cardEl.innerHTML = STATIONS.map((s) => {
    const st = results[s.id] === undefined ? -1 : starsFor(results[s.id]!);
    const stars = st < 0 ? `<span class="todo">to do</span>` : `${"★".repeat(st)}<span class="off">${"★".repeat(3 - st)}</span>`;
    return `<li class="${st > 0 ? "done" : ""}"><span class="name">${s.name}<small>${s.verb}</small></span><span class="st">${stars}</span></li>`;
  }).join("");
  const done = STATIONS.filter((s) => starsFor(results[s.id] ?? 0) > 0).length;
  $("#card-progress").textContent = `${done} / 6 stations`;
  $("#card-fill").style.width = `${(done / 6) * 100}%`;
  let best = 0;
  try {
    best = Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {}
  $("#card-best").textContent = best ? `Best workout: ${best} ★` : "Finish all six to set a best";
}

function showFinale() {
  finished = true;
  const total = totalStars();
  const secs = Math.round((performance.now() - workoutStart) / 1000);
  let best = 0;
  try {
    best = Number(localStorage.getItem(BEST_KEY)) || 0;
    if (total > best) localStorage.setItem(BEST_KEY, String(total));
  } catch {}
  sfx.finish();
  finale.querySelector(".f-stars")!.textContent = `${total} / 18 ★`;
  finale.querySelector(".f-time")!.textContent = `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, "0")}s`;
  finale.querySelector(".f-note")!.textContent = total > best ? "New personal best!" : `Personal best: ${best} ★`;
  finale.hidden = false;
  finale.querySelector<HTMLButtonElement>(".f-again")!.focus();
  renderCard();
}

finale.querySelector<HTMLButtonElement>(".f-again")!.onclick = () => {
  for (const s of STATIONS) delete results[s.id];
  finished = false;
  workoutStart = 0;
  finale.hidden = true;
  renderCard();
};
finale.querySelector<HTMLButtonElement>(".f-close")!.onclick = () => (finale.hidden = true);

// ---------- loop ----------
const DIRS: Record<string, [number, number]> = { up: [-1, -1], down: [1, 1], left: [-1, 1], right: [1, -1] };
const R = 0.2;
const free = (x: number, y: number) => isFree(x - R, y - R) && isFree(x + R, y - R) && isFree(x - R, y + R) && isFree(x + R, y + R);

function movePlayer(dt: number) {
  let vx = 0;
  let vy = 0;
  for (const k of ["up", "down", "left", "right"]) if (held.has(k as Key)) {
    vx += DIRS[k][0];
    vy += DIRS[k][1];
  }
  if (vx || vy) {
    player.path = [];
    player.goal = null;
  } else if (player.path.length) {
    const [tx, ty] = player.path[0];
    vx = tx - player.gx;
    vy = ty - player.gy;
    if (Math.hypot(vx, vy) < 0.08) {
      player.path.shift();
      vx = vy = 0;
      if (!player.path.length && player.goal) {
        const g = player.goal;
        player.goal = null;
        openSession(g);
      }
    }
  }
  const len = Math.hypot(vx, vy);
  player.walking = len > 0;
  if (!len) return;
  const sp = 3.4 * dt;
  const step = Math.min(sp, player.path.length ? len : sp);
  const dx = (vx / len) * step;
  const dy = (vy / len) * step;
  if (free(player.gx + dx, player.gy)) player.gx += dx;
  if (free(player.gx, player.gy + dy)) player.gy += dy;
  player.phase += dt * 8;
  const sdx = dx - dy;
  if (Math.abs(sdx) > 0.001) player.flip = sdx < 0;
}

function drawPlayer() {
  if (session) {
    const { station, game } = session;
    const [gx, gy, z] = station.spot;
    const { pose, frame } = game.pose();
    const lean = "lean" in game ? (game as unknown as { lean: () => number }).lean() : 0;
    const [x, y] = iso(gx, gy, z);
    drawPerson(x + lean, y, PLAYER_LOOK, pose, frame, false, z < 2);
    return;
  }
  const [x, y] = iso(player.gx, player.gy);
  drawPerson(x, y, PLAYER_LOOK, player.walking ? "walk" : "stand", Math.floor(player.phase) % 2, player.flip);
  // "You" marker.
  const bob = Math.round(Math.sin(scene.t * 4));
  rect(x - 3, y - 33 + bob, 7, 1, OUT);
  rect(x - 2, y - 32 + bob, 5, 1, OUT);
  rect(x - 1, y - 31 + bob, 3, 1, OUT);
  rect(x - 2, y - 33 + bob, 5, 1, "#b6f35c");
  rect(x - 1, y - 32 + bob, 3, 1, "#b6f35c");
  rect(x, y - 31 + bob, 1, 1, "#b6f35c");
}

function updatePrompt() {
  const s = !session && finale.hidden && !player.walking ? nearStation() : null;
  if (!s) {
    promptEl.hidden = true;
    return;
  }
  const [x, y] = iso(s.access[0], s.access[1]);
  promptEl.hidden = false;
  promptEl.innerHTML = `<kbd>E</kbd> ${s.verb}`;
  promptEl.style.left = `${x * scale}px`;
  promptEl.style.top = `${(y - 40) * scale}px`;
}

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  scene.t += dt;
  if (!session) movePlayer(dt);
  else if (session.phase === "play") {
    session.game.update(dt, held);
    session.game.render();
    panel.querySelector(".status")!.textContent = session.game.status();
    if (session.game.done) showResult();
  }

  ctx.drawImage(roomCanvas, 0, 0);
  drawWindow(scene.t);
  const depth = session ? session.station.spot[0] + session.station.spot[1] + 0.02 : player.gx + player.gy;
  for (const t of buildThings({ depth, draw: drawPlayer })) t.draw();
  updatePrompt();
  requestAnimationFrame(frame);
}

resize();
renderCard();
requestAnimationFrame(frame);

// Dev-only hooks for automated testing (e.g. stepping frames when rAF is paused).
if (import.meta.env.DEV)
  Object.assign(window, {
    __pp: {
      player,
      results,
      held,
      input,
      get session() {
        return session;
      },
      step(frames = 1) {
        for (let i = 0; i < frames; i++) frame(last + 1000 / 60);
      },
    },
  });
