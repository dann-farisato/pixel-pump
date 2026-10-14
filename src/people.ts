import { OUT, line, rect, shade, shadow } from "./art";

export type Look = {
  skin: string;
  hair: string;
  style: "short" | "long" | "bun" | "cap" | "curly" | "bald";
  shirt: string;
  pants: string;
  shoes: string;
  cap?: string;
};

export type Pose =
  | "stand"
  | "walk"
  | "run"
  | "pressDown"
  | "pressUp"
  | "hang"
  | "pull"
  | "bike"
  | "punch"
  | "guard"
  | "yoga"
  | "curlUp"
  | "curlDown"
  | "jump"
  | "stretch"
  | "sit";

type Part = { x: number; y: number; w: number; h: number; kind: "arm" | "leg" | "torso" | "head" | "extra"; sh?: "top" | "bottom" | "left" | "right"; c?: string };

const arm = (x: number, y: number, w: number, h: number, sh: Part["sh"] = "top"): Part => ({ x, y, w, h, kind: "arm", sh });
const leg = (x: number, y: number, w: number, h: number): Part => ({ x, y, w, h, kind: "leg" });

/** Builds the body parts (relative to the feet) for a pose and animation frame. */
function build(pose: Pose, f: number): { parts: Part[]; dy: number; props: Part[] } {
  const torso: Part = { x: -4, y: -15, w: 8, h: 8, kind: "torso" };
  const head: Part = { x: -3, y: -22, w: 6, h: 6, kind: "head" };
  let legs = [leg(-4, -7, 3, 7), leg(1, -7, 3, 7)];
  let arms = [arm(-6, -15, 2, 7), arm(4, -15, 2, 7)];
  let dy = 0;
  const props: Part[] = [];
  const bar = (y: number) => {
    props.push({ x: -12, y, w: 24, h: 1, kind: "extra", c: "#9aa3b5" });
    props.push({ x: -14, y: y - 3, w: 2, h: 7, kind: "extra", c: "#2d2f3a" });
    props.push({ x: 12, y: y - 3, w: 2, h: 7, kind: "extra", c: "#2d2f3a" });
  };

  switch (pose) {
    case "walk":
      legs = f ? [leg(-4, -7, 3, 7), leg(1, -7, 3, 6)] : [leg(-4, -7, 3, 6), leg(1, -7, 3, 7)];
      arms = f ? [arm(-6, -15, 2, 6), arm(4, -14, 2, 7)] : [arm(-6, -14, 2, 7), arm(4, -15, 2, 6)];
      break;
    case "run":
      dy = f ? -1 : 0;
      legs = f ? [leg(-5, -7, 3, 7), leg(1, -6, 3, 4)] : [leg(-4, -6, 3, 4), leg(2, -7, 3, 7)];
      arms = f ? [arm(-6, -16, 2, 5), arm(4, -14, 2, 5)] : [arm(-6, -14, 2, 5), arm(4, -16, 2, 5)];
      break;
    case "pressDown":
      arms = [arm(-6, -19, 2, 5, "bottom"), arm(4, -19, 2, 5, "bottom")];
      bar(-20);
      break;
    case "pressUp":
      arms = [arm(-6, -28, 2, 13, "bottom"), arm(4, -28, 2, 13, "bottom")];
      bar(-29);
      break;
    case "hang":
      legs = [leg(-3, -7, 3, 7), leg(0, -7, 3, 7)];
      arms = [arm(-6, -25, 2, 10, "bottom"), arm(4, -25, 2, 10, "bottom")];
      break;
    case "pull":
      dy = -6;
      legs = [leg(-3, -7, 3, 6), leg(0, -7, 3, 6)];
      arms = [arm(-6, -19, 2, 4, "bottom"), arm(4, -19, 2, 4, "bottom")];
      break;
    case "bike":
      legs = f ? [leg(-4, -7, 3, 4), leg(1, -7, 3, 7)] : [leg(-4, -7, 3, 7), leg(1, -7, 3, 4)];
      arms = [arm(-6, -15, 2, 6), arm(4, -15, 2, 6)];
      break;
    case "sit":
      legs = [leg(-4, -7, 3, 4), leg(1, -7, 3, 4)];
      dy = 3;
      break;
    case "punch":
      arms = [arm(-6, -18, 2, 5, "bottom"), arm(4, -14, 8, 2, "left")];
      props.push({ x: 11, y: -15, w: 3, h: 4, kind: "extra", c: "#e2483d" });
      props.push({ x: -7, y: -21, w: 4, h: 3, kind: "extra", c: "#e2483d" });
      break;
    case "guard":
      arms = [arm(-6, -18, 2, 5, "bottom"), arm(4, -18, 2, 5, "bottom")];
      props.push({ x: -7, y: -21, w: 4, h: 3, kind: "extra", c: "#e2483d" });
      props.push({ x: 3, y: -21, w: 4, h: 3, kind: "extra", c: "#e2483d" });
      break;
    case "yoga":
      legs = [leg(-4, -7, 3, 7), leg(0, -11, 5, 3)];
      arms = [arm(-4, -30, 2, 15, "bottom"), arm(2, -30, 2, 15, "bottom")];
      break;
    case "stretch":
      arms = f ? [arm(-6, -27, 2, 12, "bottom"), arm(4, -15, 2, 7)] : [arm(-6, -15, 2, 7), arm(4, -27, 2, 12, "bottom")];
      legs = [leg(-5, -7, 3, 7), leg(2, -7, 3, 7)];
      break;
    case "curlUp":
    case "curlDown": {
      const up = pose === "curlUp";
      arms = up ? [arm(-6, -18, 2, 5, "bottom"), arm(4, -18, 2, 5, "bottom")] : [arm(-6, -15, 2, 7), arm(4, -15, 2, 7)];
      const y = up ? -20 : -9;
      for (const x of [-8, 3])
        props.push({ x, y, w: 5, h: 1, kind: "extra", c: "#40435a" }, { x, y: y - 1, w: 1, h: 3, kind: "extra", c: "#2d2f3a" }, { x: x + 4, y: y - 1, w: 1, h: 3, kind: "extra", c: "#2d2f3a" });
      break;
    }
    case "jump":
      dy = f ? -3 : 0;
      arms = [arm(-6, -15, 2, 6), arm(4, -15, 2, 6)];
      break;
  }
  return { parts: [head, torso, ...arms, ...legs], dy, props };
}

/** Draws a front-facing person whose feet sit at (x, y). */
export function drawPerson(x: number, y: number, look: Look, pose: Pose, frame: number, flip = false, withShadow = true) {
  x = Math.round(x);
  y = Math.round(y);
  const { parts, dy, props } = build(pose, frame);
  const fx = (p: { x: number; w: number }) => (flip ? -p.x - p.w : p.x);
  if (withShadow) shadow(x, y, 6);
  const by = y + dy;

  // Hair pieces that stick out of the head get outlined with the body.
  const extras: Part[] = [];
  if (look.style === "bun") extras.push({ x: -1, y: -25, w: 3, h: 3, kind: "extra", c: look.hair });
  if (look.style === "curly") extras.push({ x: -4, y: -23, w: 8, h: 3, kind: "extra", c: look.hair });
  if (look.style === "long") extras.push({ x: -4, y: -21, w: 1, h: 8, kind: "extra", c: look.hair }, { x: 3, y: -21, w: 1, h: 8, kind: "extra", c: look.hair });

  // Outline pass, then fill pass, so the silhouette gets one clean outline.
  for (const p of [...parts, ...extras]) rect(x + fx(p) - 1, by + p.y - 1, p.w + 2, p.h + 2, OUT);
  for (const p of props) rect(x + fx(p) - 1, by + p.y - 1, p.w + 2, p.h + 2, OUT);

  for (const p of extras) rect(x + fx(p), by + p.y, p.w, p.h, p.c!);
  for (const p of parts) {
    const X = x + fx(p);
    const Y = by + p.y;
    if (p.kind === "torso") {
      rect(X, Y, p.w, p.h, look.shirt);
      rect(flip ? X : X + p.w - 2, Y, 2, p.h, shade(look.shirt, -0.22));
      rect(X + 2, Y, 4, 1, shade(look.shirt, 0.2));
    } else if (p.kind === "head") {
      rect(X, Y, p.w, p.h, look.skin);
      rect(X + p.w - 1, Y + 1, 1, p.h - 1, shade(look.skin, -0.18));
      rect(X + 2, Y + p.h, 2, 1, shade(look.skin, -0.25)); // neck
      drawHair(X, Y, look);
      px2(X + 1, Y + 3, OUT);
      px2(X + 4, Y + 3, OUT);
      px2(X + 1, Y + 4, shade(look.skin, -0.12));
      px2(X + 4, Y + 4, shade(look.skin, -0.12));
    } else if (p.kind === "leg") {
      rect(X, Y, p.w, p.h, look.pants);
      if (p.h >= p.w) rect(X, Y + p.h - 2, p.w, 2, look.shoes);
      else rect(flip ? X : X + p.w - 1, Y, 1, p.h, look.shoes);
    } else if (p.kind === "arm") {
      rect(X, Y, p.w, p.h, look.skin);
      const s = look.shirt;
      const sh = flip && (p.sh === "left" || p.sh === "right") ? (p.sh === "left" ? "right" : "left") : p.sh;
      if (sh === "top") rect(X, Y, p.w, 2, s);
      if (sh === "bottom") rect(X, Y + p.h - 2, p.w, 2, s);
      if (sh === "left") rect(X, Y, 2, p.h, s);
      if (sh === "right") rect(X + p.w - 2, Y, 2, p.h, s);
    }
  }
  for (const p of props) rect(x + fx(p), by + p.y, p.w, p.h, p.c!);
}

const px2 = (x: number, y: number, c: string) => rect(x, y, 1, 1, c);

function drawHair(X: number, Y: number, look: Look) {
  const h = look.hair;
  switch (look.style) {
    case "short":
    case "long":
    case "bun":
      rect(X, Y, 6, 2, h);
      rect(X, Y + 2, 1, 2, h);
      rect(X + 5, Y + 2, 1, 1, h);
      rect(X + 1, Y, 2, 1, shade(h, 0.25));
      break;
    case "curly":
      rect(X, Y, 6, 2, h);
      rect(X, Y + 2, 1, 2, h);
      rect(X + 5, Y + 2, 1, 2, h);
      rect(X + 1, Y - 1, 1, 1, shade(h, 0.25));
      rect(X + 4, Y - 1, 1, 1, shade(h, 0.25));
      break;
    case "cap": {
      const c = look.cap ?? "#e2483d";
      rect(X, Y - 1, 6, 3, c);
      rect(X + 1, Y - 1, 2, 1, shade(c, 0.3));
      rect(X - 1, Y + 2, 7, 1, shade(c, -0.25));
      rect(X, Y + 3, 1, 1, h);
      break;
    }
    case "bald":
      rect(X + 1, Y, 2, 1, shade(look.skin, 0.35));
      break;
  }
}

/** Small speech bubble with a pixel icon above a head. */
export function bubble(x: number, y: number, icon: "heart" | "drop" | "note" | "bang" | "star") {
  x = Math.round(x);
  y = Math.round(y);
  rect(x - 6, y - 10, 13, 10, OUT);
  rect(x - 5, y - 9, 11, 8, "#fffaf0");
  rect(x - 1, y, 3, 1, OUT);
  rect(x, y - 1, 1, 2, "#fffaf0");
  const c = { heart: "#ff4f7b", drop: "#3fa9f5", note: "#7b5cff", bang: "#ff8a1f", star: "#f5b81c" }[icon];
  const draw = (rows: string[]) =>
    rows.forEach((r, j) => [...r].forEach((ch, i) => ch === "1" && rect(x - 3 + i, y - 8 + j, 1, 1, c)));
  if (icon === "heart") draw(["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"]);
  if (icon === "drop") draw(["0001000", "0011100", "0011100", "0111110", "0111110", "0011100"]);
  if (icon === "note") draw(["0001111", "0001001", "0001001", "0111001", "1111111", "0110110"]);
  if (icon === "bang") draw(["0011100", "0011100", "0011100", "0001000", "0000000", "0011100"]);
  if (icon === "star") draw(["0001000", "0011100", "1111111", "0111110", "0110110", "0100010"]);
}

export function rope(x: number, y: number, up: boolean) {
  if (up) {
    line(x - 7, y - 14, x - 5, y - 27, "#c9407a");
    line(x - 5, y - 27, x + 5, y - 27, "#c9407a");
    line(x + 5, y - 27, x + 7, y - 14, "#c9407a");
  } else {
    line(x - 7, y - 10, x - 6, y + 1, "#c9407a");
    line(x - 6, y + 1, x + 6, y + 1, "#c9407a");
    line(x + 6, y + 1, x + 7, y - 10, "#c9407a");
  }
}
