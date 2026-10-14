// Low-res pixel drawing helpers. Everything is drawn with 1px fillRects on a
// 480x300 canvas so edges stay crisp when the canvas is scaled up.

export const W = 480;
export const H = 300;
const OX = 208;
const OY = 86;

export const OUT = "#2a1d33";

let ctx: CanvasRenderingContext2D;
export const setCtx = (c: CanvasRenderingContext2D) => (ctx = c);
export const getCtx = () => ctx;

export type P = [number, number];

/** Grid (gx, gy) + height z in px → screen pixel. Tiles are 32x16. */
export const iso = (gx: number, gy: number, z = 0): P => [OX + (gx - gy) * 16, OY + (gx + gy) * 8 - z];

/** Screen pixel → grid position on the floor. */
export const unIso = (x: number, y: number): P => {
  const a = (x - OX) / 16;
  const b = (y - OY) / 8;
  return [(a + b) / 2, (b - a) / 2];
};

export function rect(x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

export const px = (x: number, y: number, c: string) => rect(x, y, 1, 1, c);

/** Scanline fill of a convex polygon, one row at a time (no anti-aliasing). */
export function poly(pts: P[], c: string) {
  ctx.fillStyle = c;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of pts) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  for (let y = Math.floor(minY); y < Math.ceil(maxY); y++) {
    const yc = y + 0.5;
    let xs = Infinity;
    let xe = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      if (yc >= Math.min(y0, y1) && yc < Math.max(y0, y1)) {
        const x = x0 + ((yc - y0) * (x1 - x0)) / (y1 - y0);
        xs = Math.min(xs, x);
        xe = Math.max(xe, x);
      }
    }
    const a = Math.round(xs);
    const b = Math.round(xe);
    if (b > a) ctx.fillRect(a, y, b - a, 1);
  }
}

export function line(x0: number, y0: number, x1: number, y1: number, c: string) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  ctx.fillStyle = c;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

/** Filled ellipse, row by row. */
export function blob(cx: number, cy: number, rx: number, ry: number, c: string) {
  ctx.fillStyle = c;
  for (let y = -ry; y <= ry; y++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.01))));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
}

export function shadow(x: number, y: number, rx = 6) {
  blob(x, y, rx, 2, "rgba(30,15,45,0.28)");
}

/** Lighten (amt > 0) or darken (amt < 0) a #rrggbb color. */
export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `rgb(${r},${g},${b})`;
}

type BoxOpts = {
  gx: number;
  gy: number;
  w: number;
  d: number;
  h: number;
  z?: number;
  c: string;
  top?: string;
  edge?: string | false;
};

/** An isometric box: top face plus the two faces turned toward the viewer. */
export function box({ gx, gy, w, d, h, z = 0, c, top, edge = OUT }: BoxOpts) {
  const t = top ?? shade(c, 0.22);
  const right = shade(c, -0.2);
  const a = iso(gx, gy + d, z);
  const b = iso(gx + w, gy + d, z);
  const cR = iso(gx + w, gy, z);
  const A = iso(gx, gy + d, z + h);
  const B = iso(gx + w, gy + d, z + h);
  const C = iso(gx + w, gy, z + h);
  const D = iso(gx, gy, z + h);
  if (h > 0) {
    poly([a, b, B, A], c);
    poly([b, cR, C, B], right);
  }
  poly([D, C, B, A], t);
  if (edge) {
    line(A[0], A[1], D[0], D[1], edge);
    line(D[0], D[1], C[0], C[1], edge);
    if (h > 0) {
      line(A[0], A[1], a[0], a[1], edge);
      line(C[0], C[1], cR[0], cR[1], edge);
      line(a[0], a[1], b[0], b[1], edge);
      line(b[0], b[1], cR[0], cR[1], edge);
      line(B[0], B[1], b[0], b[1], shade(c, -0.35));
    } else {
      line(A[0], A[1], B[0], B[1], edge);
      line(B[0], B[1], C[0], C[1], edge);
    }
  }
}

/** Rectangle on the back-right wall (the gy = 0 plane). */
export const wallX = (u0: number, u1: number, z0: number, z1: number, c: string) =>
  poly([iso(u0, 0, z0), iso(u1, 0, z0), iso(u1, 0, z1), iso(u0, 0, z1)], c);

/** Rectangle on the back-left wall (the gx = 0 plane). */
export const wallY = (v0: number, v1: number, z0: number, z1: number, c: string) =>
  poly([iso(0, v0, z0), iso(0, v1, z0), iso(0, v1, z1), iso(0, v0, z1)], c);

// 3x5 pixel font for the neon sign.
const FONT: Record<string, string[]> = {
  P: ["111", "101", "111", "100", "100"],
  U: ["101", "101", "101", "101", "111"],
  M: ["101", "111", "111", "101", "101"],
};

/** Text painted on the gy = 0 wall: each screen column drops half a pixel. */
export function wallText(text: string, gx: number, z: number, c: string, glow: string) {
  const [x0, y0] = iso(gx, 0, z);
  let col = 0;
  for (const ch of text) {
    const g = FONT[ch];
    if (g) {
      for (let r = 0; r < 5; r++)
        for (let k = 0; k < 3; k++)
          if (g[r][k] === "1") {
            for (let sx = 0; sx < 2; sx++) {
              const cx = col + k * 2 + sx;
              const x = x0 + cx;
              const y = y0 + Math.floor(cx / 2) + r * 2;
              rect(x - 1, y - 1, 3, 4, glow);
            }
          }
      for (let r = 0; r < 5; r++)
        for (let k = 0; k < 3; k++)
          if (g[r][k] === "1")
            for (let sx = 0; sx < 2; sx++) {
              const cx = col + k * 2 + sx;
              rect(x0 + cx, y0 + Math.floor(cx / 2) + r * 2, 1, 2, c);
            }
    }
    col += 8;
  }
}
