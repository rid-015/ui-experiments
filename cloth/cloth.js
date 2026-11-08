// Cloth
// A Verlet cloth pinned along its top edge. Push it with the pointer, or press and hold to grab it.

const COLORS = ['#b18cff', '#ff5f8f'];
const COLS = 16;
const ROWS = 10;
const GRAVITY = 0.25;
const DAMPING = 0.985;
const STIFFNESS_PASSES = 4;
const PUSH_RADIUS = 40;
const GRAB_RADIUS = 30;

export default function mount(element) {
  element.innerHTML = `
    <div style="position:relative;height:100%;overflow:hidden;touch-action:none;background:var(--card2,#f5f5f5)">
      <canvas style="position:absolute;inset:0;width:100%;height:100%"></canvas>
      <span style="position:absolute;inset:auto 0 14px;text-align:center;font:12px Helvetica,Arial,sans-serif;color:var(--mute,#6f6f6c);pointer-events:none">
        Push it · hold to grab
      </span>
    </div>`;

  const root = element.firstElementChild;
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const pointer = { inside: false, down: false, x: 0, y: 0 };
  let width = 0;
  let height = 0;
  let cloth = null;
  let grabbed = null;
  let frame;

  function build() {
    const gapX = (width - 40) / (COLS - 1);
    const gapY = (height * 0.72) / (ROWS - 1);
    const points = [];
    const links = [];

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = 20 + col * gapX;
        const y = 16 + row * gapY;
        const point = { x, y, prevX: x, prevY: y, pinned: row === 0 };
        if (col > 0) links.push([points[points.length - 1], point, gapX]);
        if (row > 0) links.push([points[points.length - COLS], point, gapY]);
        points.push(point);
      }
    }
    return { points, links, cellArea: gapX * gapY };
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
    cloth = build();
    grabbed = null;
  }

  function nearestFreePoint() {
    let best = null;
    let bestDist = GRAB_RADIUS ** 2;
    for (const p of cloth.points) {
      const dist = (p.x - pointer.x) ** 2 + (p.y - pointer.y) ** 2;
      if (!p.pinned && dist < bestDist) {
        best = p;
        bestDist = dist;
      }
    }
    return best;
  }

  function simulate(time) {
    const { points, links } = cloth;

    if (!pointer.down) grabbed = null;
    else if (!grabbed) grabbed = nearestFreePoint();

    points.forEach((p, i) => {
      if (p.pinned) return;
      const vx = (p.x - p.prevX) * DAMPING;
      const vy = (p.y - p.prevY) * DAMPING;
      p.prevX = p.x;
      p.prevY = p.y;
      p.x += vx + Math.sin(time * 0.0012 + i * 0.3) * 0.02; // a light breeze
      p.y += vy + GRAVITY;

      if (pointer.inside && !pointer.down) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < PUSH_RADIUS) {
          const push = ((PUSH_RADIUS - dist) * 0.25) / (dist || 1);
          p.x += dx * push;
          p.y += dy * push;
        }
      }
    });

    if (grabbed) {
      grabbed.x = pointer.x;
      grabbed.y = pointer.y;
    }

    for (let pass = 0; pass < STIFFNESS_PASSES; pass++) {
      for (const [a, b, length] of links) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const pull = ((dist - length) / dist) * 0.5;
        if (!a.pinned) { a.x += dx * pull; a.y += dy * pull; }
        if (!b.pinned) { b.x -= dx * pull; b.y -= dy * pull; }
      }
    }
  }

  function draw() {
    const { points, cellArea } = cloth;
    ctx.clearRect(0, 0, width, height);

    for (let row = 0; row < ROWS - 1; row++) {
      for (let col = 0; col < COLS - 1; col++) {
        const i = row * COLS + col;
        const a = points[i];
        const b = points[i + 1];
        const c = points[i + COLS + 1];
        const d = points[i + COLS];
        // Squashed cells get darker, stretched cells get lighter.
        const area = Math.abs((b.x - a.x) * (d.y - a.y) - (b.y - a.y) * (d.x - a.x));
        const shade = Math.max(0.35, Math.min(1, area / cellArea));

        ctx.globalAlpha = 0.25 + shade * 0.6;
        ctx.fillStyle = COLORS[(row + col) % 2];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(c.x, c.y);
        ctx.lineTo(d.x, d.y);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1a1a1a';
    for (const pin of points.slice(0, COLS)) {
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop(time) {
    frame = requestAnimationFrame(loop);
    if (!isOnScreen(canvas)) return;
    resize();
    simulate(time);
    draw();
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
    pointer.down = true;
  });
  root.addEventListener('pointerup', () => { pointer.down = false; });
  root.addEventListener('pointerleave', () => { pointer.inside = pointer.down = false; });

  return () => cancelAnimationFrame(frame);
}

function isOnScreen(el) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
}
