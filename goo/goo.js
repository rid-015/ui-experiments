// Halftone goo
// Metaball blobs drawn as a grid of halftone dots. Hover to join in, click to split off new blobs.

const COLORS = ['#c4b5f4', '#9fd8b8', '#f2b5cf', '#f6c9a8', '#a9d4f2', '#f1dc8e'].map(hexToRgb);
const POINTER_COLOR = [180, 163, 240];
const BACKGROUND_DOT = '#c9c9c4';
const GRID = 8;
const SPLIT_SPEED = 90;
const SPLIT_LIFETIME = 8;
const MAX_SPLITS = 10;

export default function mount(element) {
  element.innerHTML = `
    <div style="position:relative;height:100%;overflow:hidden;touch-action:none;cursor:crosshair;background:var(--card2,#f5f5f5)">
      <canvas style="position:absolute;inset:0;width:100%;height:100%"></canvas>
      <span style="position:absolute;left:14px;bottom:12px;font:9px ui-monospace,Menlo,monospace;color:var(--mute,#6f6f6c);pointer-events:none">
        hover to join · click to split
      </span>
    </div>`;

  const root = element.firstElementChild;
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const pointer = { inside: false, x: 0, y: 0 };
  let width = 0;
  let height = 0;
  let clock = 0;
  let lastTime = 0;
  let frame;

  // Blobs that wander forever along slow Lissajous paths.
  const drifters = COLORS.map((color, i) => ({
    color,
    phase: i * 1.7,
    speed: 0.11 + (i % 3) * 0.035,
    size: 0.13 + (i % 2) * 0.05,
  }));
  // Short-lived blobs made by clicking.
  let splits = [];

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  function split(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    for (const direction of [0, Math.PI]) {
      splits.push({
        x,
        y,
        vx: Math.cos(angle + direction) * SPLIT_SPEED,
        vy: Math.sin(angle + direction) * SPLIT_SPEED,
        color,
        born: clock,
      });
    }
    splits = splits.slice(-MAX_SPLITS);
  }

  // Where every blob is this frame, as { x, y, radius, color }.
  function currentBlobs(t, dt) {
    const unit = Math.min(width, height);
    const blobs = drifters.map(b => ({
      x: width * (0.5 + 0.38 * Math.sin(t * b.speed + b.phase)),
      y: height * (0.5 + 0.34 * Math.sin(t * b.speed * 1.31 + b.phase * 2.1)),
      radius: b.size * unit * (1 + 0.12 * Math.sin(t * 0.8 + b.phase)),
      color: b.color,
    }));

    splits = splits.filter(s => t - s.born < SPLIT_LIFETIME);
    for (const s of splits) {
      s.vx *= 0.985;
      s.vy *= 0.985;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.x < 0 || s.x > width) s.vx *= -1;
      if (s.y < 0 || s.y > height) s.vy *= -1;
      const age = t - s.born;
      const scale = smoothstep(0, 0.2, age) * (1 - smoothstep(4, SPLIT_LIFETIME, age));
      blobs.push({ x: s.x, y: s.y, radius: 0.085 * unit * scale, color: s.color });
    }

    if (pointer.inside) {
      blobs.push({ x: pointer.x, y: pointer.y, radius: 0.12 * unit, color: POINTER_COLOR });
    }
    return blobs;
  }

  function draw(t, dt) {
    const blobs = currentBlobs(t, dt);
    const faintDots = new Path2D();
    ctx.clearRect(0, 0, width, height);

    for (let y = GRID / 2; y < height; y += GRID) {
      for (let x = GRID / 2; x < width; x += GRID) {
        // Sum each blob's influence on this dot, and blend their colours by that influence.
        let field = 0;
        let r = 0;
        let g = 0;
        let b = 0;
        for (const blob of blobs) {
          const dx = x - blob.x;
          const dy = y - blob.y;
          const weight = (blob.radius * blob.radius) / (dx * dx + dy * dy + 1);
          field += weight;
          r += blob.color[0] * weight;
          g += blob.color[1] * weight;
          b += blob.color[2] * weight;
        }

        if (field < 0.5) {
          faintDots.moveTo(x + 0.75, y);
          faintDots.arc(x, y, 0.75, 0, Math.PI * 2);
          continue;
        }
        const dotRadius = GRID * 0.5 * clamp((field - 0.5) * 1.4 + 0.22, 0, 1);
        ctx.fillStyle = `rgb(${Math.round(r / field)},${Math.round(g / field)},${Math.round(b / field)})`;
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = BACKGROUND_DOT;
    ctx.fill(faintDots);
  }

  function loop(ms) {
    frame = requestAnimationFrame(loop);
    if (!width || !isOnScreen(canvas)) return;
    clock = ms / 1000;
    const dt = Math.min(0.05, clock - (lastTime || clock));
    lastTime = clock;
    draw(clock, dt);
  }
  frame = requestAnimationFrame(loop);

  const track = event => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.inside = true;
  };
  root.addEventListener('pointermove', track);
  root.addEventListener('pointerdown', event => {
    track(event);
    split(pointer.x, pointer.y);
  });
  root.addEventListener('pointerleave', () => { pointer.inside = false; });

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function hexToRgb(hex) {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
}

function isOnScreen(el) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
}
