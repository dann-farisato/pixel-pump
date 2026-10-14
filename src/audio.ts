// Tiny square-wave synth. The context is created on the first user gesture.
let ac: AudioContext | null = null;
let muted = false;
try {
  muted = localStorage.getItem("pixelpump:muted") === "1";
} catch {}

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem("pixelpump:muted", m ? "1" : "0");
  } catch {}
}

export function unlockAudio() {
  if (!ac) ac = new AudioContext();
  if (ac.state === "suspended") void ac.resume();
}

function tone(freq: number, dur = 0.08, type: OscillatorType = "square", vol = 0.05, delay = 0, slide = 0) {
  if (muted || !ac) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  tick: (f: number) => tone(f, 0.04, "square", 0.025),
  good: () => {
    tone(660, 0.07);
    tone(990, 0.09, "square", 0.05, 0.06);
  },
  perfect: () => {
    tone(784, 0.06);
    tone(1046, 0.06, "square", 0.05, 0.05);
    tone(1568, 0.12, "square", 0.04, 0.1);
  },
  miss: () => tone(180, 0.16, "sawtooth", 0.04, 0, -90),
  punch: () => tone(120, 0.07, "triangle", 0.12, 0, -60),
  ui: () => tone(520, 0.05, "square", 0.03),
  start: () => [440, 554, 659].forEach((f, i) => tone(f, 0.08, "square", 0.04, i * 0.07)),
  finish: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.12, "square", 0.045, i * 0.09)),
};
