// Receipt toast
// A receipt prints out of a little printer. Pull it down to tear it off, and a new one prints.

const PAPER_HEIGHT = 176;
const ITEMS = [
  ['curiosity', '×1'],
  ['late nights', '×7'],
  ['oat lattes', '×3'],
  ['pixels pushed', '∞'],
];
const BARCODE = [1, 2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1, 2, 1, 3, 1, 1, 2, 1, 2, 1, 3, 1, 1, 2, 1, 1, 3, 2, 1];
const TEAR_DISTANCE = 60;
const DRAG_RESISTANCE = 0.45;
const HINTS = { printing: 'printing…', ready: 'pull it down to tear', dragging: 'a little more', falling: 'riiip' };

const CSS = `
  .receipt { position: relative; height: 100%; overflow: hidden; touch-action: none; user-select: none;
             background: var(--card2, #f5f5f5); font-family: ui-monospace, Menlo, monospace; }
  .receipt-printer { position: absolute; z-index: 2; left: 50%; top: 24px; width: 184px; height: 13px; margin-left: -92px;
                     border-radius: 7px; background: #1a1a1a; }
  .receipt-printer::after { content: ''; position: absolute; inset: 6px 14px auto; height: 1.5px; border-radius: 2px;
                            background: #4a4a48; }
  .receipt-paper { position: absolute; z-index: 1; left: 50%; top: 31px; width: 150px; margin-left: -75px; }
  .receipt-roll { position: relative; height: 0; overflow: hidden; clip-path: ${zigzagEdges()}; }
  .receipt-body { position: absolute; inset: auto 0 0; height: ${PAPER_HEIGHT}px; box-sizing: border-box;
                  display: flex; flex-direction: column; gap: 5px; padding: 16px 12px 14px;
                  background: #fff; color: #1a1a1a; font-size: 8.5px; }
  .receipt-title { text-align: center; letter-spacing: 1.5px; }
  .receipt-date { text-align: center; color: #858583; }
  .receipt-rule { margin: 3px 0; border-top: 1px dashed #cfcfcb; }
  .receipt-row { display: flex; justify-content: space-between; }
  .receipt-total { font-size: 10px; }
  .receipt-total span:last-child { color: var(--acc, #2b7d52); }
  .receipt-barcode { display: flex; justify-content: center; gap: 1px; height: 16px; margin-top: 4px; }
  .receipt-barcode span { background: #1a1a1a; }
  .receipt-hint { position: absolute; inset: auto 0 16px; text-align: center; font-size: 10.5px; color: #858583; }
`;

export default function mount(element) {
  element.innerHTML = `
    <style>${CSS}</style>
    <div class="receipt">
      <div class="receipt-printer"></div>
      <div class="receipt-paper">
        <div class="receipt-roll">
          <div class="receipt-body">
            <div class="receipt-title">PLAYGROUND CO.</div>
            <div class="receipt-date">${today()}</div>
            <div class="receipt-rule"></div>
            ${ITEMS.map(([name, qty]) => `<div class="receipt-row"><span>${name}</span><span>${qty}</span></div>`).join('')}
            <div class="receipt-rule"></div>
            <div class="receipt-row receipt-total"><span>TOTAL</span><span>free</span></div>
            <div class="receipt-barcode">${BARCODE.map(w => `<span style="width:${w}px"></span>`).join('')}</div>
          </div>
        </div>
      </div>
      <span class="receipt-hint"></span>
    </div>`;

  const root = element.querySelector('.receipt');
  const printer = root.querySelector('.receipt-printer');
  const paper = root.querySelector('.receipt-paper');
  const roll = root.querySelector('.receipt-roll');
  const hint = root.querySelector('.receipt-hint');

  const state = { mode: 'printing', printed: 0, shake: 0, drag: 0, fall: { x: 0, y: 0, angle: 0 } };
  let dragStartY = 0;
  let printTimer;
  let restartTimer;
  let frame;

  function render() {
    const { mode, printed, shake, drag, fall } = state;
    printer.style.transform = `translateX(${shake}px)`;
    roll.style.height = `${printed}px`;
    paper.style.cursor = mode === 'ready' || mode === 'dragging' ? 'grab' : 'default';
    paper.style.transition = mode === 'ready' ? 'transform .45s cubic-bezier(.3,1.7,.5,1)' : 'none';
    paper.style.transform =
      mode === 'falling' ? `translate(${fall.x}px, ${fall.y}px) rotate(${fall.angle}deg)`
      : mode === 'dragging' ? `translateY(${drag * DRAG_RESISTANCE}px)`
      : 'none';
    hint.textContent = HINTS[mode];
  }

  function update(changes) {
    Object.assign(state, changes);
    render();
  }

  function print() {
    update({ mode: 'printing', printed: 0, drag: 0, fall: { x: 0, y: 0, angle: 0 } });
    clearInterval(printTimer);
    printTimer = setInterval(() => {
      // Every so often the printer pauses, which makes it feel mechanical.
      if (Math.random() < 0.14) return update({ shake: 0 });
      const printed = Math.min(PAPER_HEIGHT, state.printed + 6);
      update({ printed, shake: (Math.random() - 0.5) * 1.2 });
      if (printed >= PAPER_HEIGHT) {
        clearInterval(printTimer);
        update({ mode: 'ready', shake: 0 });
      }
    }, 38);
  }

  function tear() {
    const body = {
      x: 0,
      y: state.drag * DRAG_RESISTANCE,
      angle: 0,
      vx: (Math.random() - 0.5) * 90,
      vy: 40,
      spin: (Math.random() - 0.5) * 120,
    };
    let last = performance.now();
    update({ mode: 'falling' });

    const fall = now => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      body.vy += 1100 * dt; // gravity
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.angle += body.spin * dt;
      update({ fall: { x: body.x, y: body.y, angle: body.angle } });

      if (body.y < 420) frame = requestAnimationFrame(fall);
      else restartTimer = setTimeout(print, 350);
    };
    frame = requestAnimationFrame(fall);
  }

  paper.addEventListener('pointerdown', event => {
    if (state.mode !== 'ready') return;
    dragStartY = event.clientY;
    update({ mode: 'dragging', drag: 0 });
  });
  root.addEventListener('pointermove', event => {
    if (state.mode !== 'dragging') return;
    update({ drag: Math.max(0, event.clientY - dragStartY) });
    if (state.drag > TEAR_DISTANCE) tear();
  });
  const release = () => {
    if (state.mode === 'dragging') update({ mode: 'ready', drag: 0 });
  };
  root.addEventListener('pointerup', release);
  root.addEventListener('pointerleave', release);

  render();
  restartTimer = setTimeout(print, 500);

  return () => {
    clearInterval(printTimer);
    clearTimeout(restartTimer);
    cancelAnimationFrame(frame);
  };
}

function today() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())} · ${pad(d.getMonth() + 1)} · ${d.getFullYear()}`;
}

// A clip-path polygon with small zigzag teeth along the top and bottom edges.
function zigzagEdges() {
  const stops = Array.from({ length: 21 }, (_, i) => i * 5);
  const top = stops.map((x, i) => `${x}% ${i % 2 ? '0' : '4px'}`);
  const bottom = stops.reverse().map((x, i) => `${x}% ${i % 2 ? '100%' : 'calc(100% - 4px)'}`);
  return `polygon(${[...top, ...bottom].join(', ')})`;
}
