// Particle type
// A word drawn with particles that scatter away from the pointer and spring back.

const WORD = 'hello';
const COLORS = ['#ff5f8f', '#ffe94d', '#4de0ff', '#b18cff', '#c6ff3d'];
const SPRING = 0.06;
const FRICTION = 0.82;
const REPEL_RADIUS = 55;
const REPEL_FORCE = 6;

export default function mount(element) {
  element.innerHTML = `
    <div style="position:relative;height:100%;overflow:hidden;touch-action:none;background:var(--card2,#f5f5f5)">
      <canvas style="position:absolute;inset:0;width:100%;height:100%"></canvas>
      <span style="position:absolute;inset:auto 0 14px;text-align:center;font:12px Helvetica,Arial,sans-serif;color:var(--mute,#6f6f6c);pointer-events:none">
        Sweep through the letters
      </span>
    </div>`;

  const root = element.firstElementChild;
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const pointer = { inside: false, x: 0, y: 0 };
  let width = 0;
  let height = 0;
  let particles = [];
  let frame;

  // Draw the word on a hidden canvas, then place a particle on every filled pixel of a grid.
  function build() {
    const stencil = document.createElement('canvas');
    stencil.width = width;
    stencil.height = height;
    const sctx = stencil.getContext('2d');
    const fontSize = Math.min(height * 0.5, width / 2.6);
    sctx.font = `700 ${fontSize}px Helvetica, Arial, sans-serif`;
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.fillText(WORD, width / 2, height * 0.44);

    const pixels = sctx.getImageData(0, 0, width, height).data;
    const step = width < 260 ? 4 : 5;
    const result = [];
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        if (pixels[(y * width + x) * 4 + 3] < 128) continue;
        result.push({
          homeX: x,
          homeY: y,
          x: Math.random() * width,
          y: Math.random() * height,
          vx: 0,
          vy: 0,
          color: COLORS[Math.floor((x / width) * COLORS.length)],
        });
      }
    }
    return result;
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === width && h === height) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    width = w;
    height = h;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles = build();
  }

  function update(p) {
    p.vx += (p.homeX - p.x) * SPRING;
    p.vy += (p.homeY - p.y) * SPRING;

    if (pointer.inside) {
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < REPEL_RADIUS ** 2) {
        const force = ((1 - distSq / REPEL_RADIUS ** 2) * REPEL_FORCE) / Math.sqrt(distSq + 1);
        p.vx += dx * force;
        p.vy += dy * force;
      }
    }

    p.vx *= FRICTION;
    p.vy *= FRICTION;
    p.x += p.vx;
    p.y += p.vy;
  }

  function loop() {
    frame = requestAnimationFrame(loop);
    if (!isOnScreen(canvas)) return;
    resize();
    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      update(p);
      const speed = Math.min(1, Math.hypot(p.vx, p.vy) / 6); // fast particles look bigger
      ctx.globalAlpha = 0.75 + speed * 0.25;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6 + speed * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
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
    root.setPointerCapture(event.pointerId);
    track(event);
  });
  root.addEventListener('pointerleave', () => { pointer.inside = false; });

  return () => cancelAnimationFrame(frame);
}

function isOnScreen(el) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
}
