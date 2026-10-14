# Pixel Pump

**A tiny gym. Six machines. One sweaty sunset.**

A cozy isometric pixel-art gym you can walk around. Head to any machine and train: each one is its own mini-game, scored with up to three stars. Fill your workout card to finish the session and set a personal best.

## The workouts

| Machine | Mini-game | How |
| --- | --- | --- |
| Treadmill | Sprint | Alternate ← / → as fast as you can. Same key twice and you stumble. |
| Spin Bike | Cadence | Hold to pedal and keep the needle inside a moving green zone. |
| Power Rack | Overhead Press | Press when the marker is in the zone. The zone shrinks every rep. |
| Heavy Bag | Combo | Hit four-arrow combos in order. A wrong key resets the combo. |
| Pull-up Bar | Pull-ups | Mash to pull yourself up before you sink back down. |
| Yoga Mat | Balance | Fight the wind with ← / → to stay centered. |

## Controls

- **Walk:** WASD or arrow keys, or tap/click the floor
- **Train:** E / Space near a machine, or tap the machine
- Every mini-game has on-screen buttons, so it plays on a phone too

## How it's built

- **No sprites, no assets.** Every pixel (the room, the sunset window, the neon sign, the equipment and the people) is drawn in code on a 480×300 canvas and scaled up with `image-rendering: pixelated`.
- **Crisp isometric renderer:** a small scanline polygon filler and Bresenham lines instead of canvas paths, so there is no anti-aliasing blur at any scale.
- **Characters** are assembled from body parts per pose (run, press, hang, punch, tree pose…) with a single outline pass, in several skin tones and outfits.
- **Depth-sorted scene**, BFS tap-to-walk pathfinding, tile collision, and a static room pre-rendered once to an offscreen canvas.
- WebAudio square-wave sound effects (with mute), best score saved in `localStorage`, and support for `prefers-reduced-motion`.

Vite + TypeScript, zero runtime dependencies.

```bash
npm install
npm run dev
```
