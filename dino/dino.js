// Voxel dino
// A CSS 3D voxel dinosaur bouncing above a loading bar. Hover to turn it.

// '#' is body, 'e' is the eye, '.' is empty.
const SPRITE = [
  '.....####.',
  '.....#e###',
  '.....#####',
  '.....###..',
  '#...####..',
  '##.#####..',
  '.#######..',
  '..##.##...',
  '..#...#...',
];
const DEPTH = 3;
const VOXEL = 10;
const EYE_COLOR = '#1b1916';
const SHADES = {
  top: 'oklch(.88 .14 150)',
  front: 'oklch(.76 .15 150)',
  side: 'oklch(.64 .14 150)',
  bottom: 'oklch(.5 .1 150)',
};
const FACES = [
  { dir: [0, 0, 1], turn: 'rotateY(0deg)', shade: 'front' },
  { dir: [0, 0, -1], turn: 'rotateY(180deg)', shade: 'front' },
  { dir: [1, 0, 0], turn: 'rotateY(90deg)', shade: 'side' },
  { dir: [-1, 0, 0], turn: 'rotateY(-90deg)', shade: 'side' },
  { dir: [0, -1, 0], turn: 'rotateX(90deg)', shade: 'top' },
  { dir: [0, 1, 0], turn: 'rotateX(-90deg)', shade: 'bottom' },
];
const LOAD_TIME = 6400;
const PAUSE_TIME = 1400;
const RESTING_TILT = -16;

const CSS = `
  .dino { position: relative; height: 100%; overflow: hidden; touch-action: none; cursor: grab;
          background: var(--card2, #f5f5f5); font: 12px Helvetica, Arial, sans-serif; }
  .dino-status { position: absolute; inset: 14px 16px auto; display: flex; justify-content: space-between;
                 color: var(--mute, #6f6f6c); font-variant-numeric: tabular-nums; }
  .dino-shadow { position: absolute; left: 50%; top: 72%; width: 110px; height: 22px; margin-left: -55px;
                 border-radius: 50%; background: radial-gradient(closest-side, rgba(0,0,0,.55), transparent); }
  .dino-stage { position: absolute; left: 50%; top: 48%; perspective: 700px; }
  .dino-model { transform-style: preserve-3d; }
  .dino-face { position: absolute; left: ${-VOXEL / 2}px; top: ${-VOXEL / 2}px; width: ${VOXEL}px; height: ${VOXEL}px;
               box-shadow: inset 0 0 0 .5px rgba(0,0,0,.12); backface-visibility: hidden; }
  .dino-track { position: absolute; inset: auto 16px 14px; height: 3px; border-radius: 2px; overflow: hidden;
                background: var(--line2, #dcdcd8); }
  .dino-bar { display: block; height: 100%; background: var(--ink, #1a1a1a); transform-origin: left; transform: scaleX(0); }
`;

export default function mount(element) {
  element.innerHTML = `
    <style>${CSS}</style>
    <div class="dino">
      <div class="dino-status"><span data-label>Loading</span><span data-percent>0%</span></div>
      <span class="dino-shadow"></span>
      <div class="dino-stage"><div class="dino-model">${buildVoxels()}</div></div>
      <div class="dino-track"><span class="dino-bar"></span></div>
    </div>`;

  const root = element.querySelector('.dino');
  const model = root.querySelector('.dino-model');
  const shadow = root.querySelector('.dino-shadow');
  const bar = root.querySelector('.dino-bar');
  const label = root.querySelector('[data-label]');
  const percent = root.querySelector('[data-percent]');
  const start = performance.now();
  const view = { angle: 0, target: null, base: 0, tilt: RESTING_TILT };
  let frame;

  function tick() {
    frame = requestAnimationFrame(tick);
    if (!isOnScreen(root)) return;
    const now = performance.now();

    // Spin slowly on its own, or ease towards where the pointer is pointing.
    view.angle += view.target === null ? 0.7 : (view.target - view.angle) * 0.12;

    const bounce = Math.abs(Math.sin(now / 260));
    model.style.transform =
      `translateY(${(-bounce * 14).toFixed(1)}px) rotateX(${view.tilt.toFixed(1)}deg) rotateY(${view.angle.toFixed(1)}deg)`;
    shadow.style.transform = `scale(${(1 - bounce * 0.25).toFixed(3)})`;
    shadow.style.opacity = (1 - bounce * 0.4).toFixed(2);

    const elapsed = ((now - start) % (LOAD_TIME + PAUSE_TIME)) / LOAD_TIME;
    const progress = 1 - Math.pow(1 - Math.min(1, elapsed), 2.2); // ease out
    bar.style.transform = `scaleX(${progress.toFixed(3)})`;
    percent.textContent = `${Math.round(progress * 100)}%`;

    const text = progress >= 1 ? 'Ready' : 'Loading' + '.'.repeat(1 + (Math.floor(now / 400) % 3));
    if (label.textContent !== text) label.textContent = text;
  }
  frame = requestAnimationFrame(tick);

  root.addEventListener('pointermove', event => {
    const rect = root.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    // Turn relative to the nearest full spin, so it never whips all the way round.
    if (view.target === null) view.base = Math.round(view.angle / 360) * 360;
    view.target = view.base + x * 220;
    view.tilt = RESTING_TILT - y * 40;
  });
  root.addEventListener('pointerleave', () => {
    view.target = null;
    view.tilt = RESTING_TILT;
  });

  return () => cancelAnimationFrame(frame);
}

// Only faces that touch empty space are drawn, so the model stays light.
function buildVoxels() {
  const width = SPRITE[0].length;
  const height = SPRITE.length;
  const filled = (x, y, z) => z >= 0 && z < DEPTH && SPRITE[y]?.[x] !== undefined && SPRITE[y][x] !== '.';
  let html = '';

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < DEPTH; z++) {
        if (!filled(x, y, z)) continue;
        const cx = (x - width / 2 + 0.5) * VOXEL;
        const cy = (y - height / 2 + 0.5) * VOXEL;
        const cz = (z - DEPTH / 2 + 0.5) * VOXEL;
        const isEye = SPRITE[y][x] === 'e';

        for (const { dir: [dx, dy, dz], turn, shade } of FACES) {
          if (filled(x + dx, y + dy, z + dz)) continue;
          const color = isEye && shade === 'front' ? EYE_COLOR : SHADES[shade];
          const transform = `translate3d(${cx}px,${cy}px,${cz}px) ${turn} translateZ(${VOXEL / 2}px)`;
          html += `<span class="dino-face" style="background:${color};transform:${transform}"></span>`;
        }
      }
    }
  }
  return html;
}

function isOnScreen(el) {
  const r = el.getBoundingClientRect();
  return r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
}
