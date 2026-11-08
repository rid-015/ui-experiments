// Mark maker
// A 3×3 grid of shape tiles that makes little logo marks. Click a tile to rotate it, or shuffle for a new mark.

const SHAPES = ['100% 0 0 0', '100% 0 100% 0', '50%', '0', '50% 50% 0 0', '0 100% 0 100%']; // as border-radius
const FILLS = ['#1a1a1a', '#1a1a1a', 'var(--acc-soft,#9fd8b8)', 'var(--acc-soft,#9fd8b8)', 'var(--acc,#2b7d52)', '#ffffff'];
const TILE_COUNT = 9;
const IDLE_DELAY = 4000;
const AUTO_ROTATE_EVERY = 900;

const CSS = `
  .mark { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px;
          background: var(--card2, #f5f5f5); }
  .mark-grid { display: grid; grid-template-columns: repeat(3, 44px); gap: 4px; }
  .mark-tile { width: 44px; height: 44px; padding: 0; border: 0; background: none; cursor: pointer; }
  .mark-shape { display: block; width: 100%; height: 100%;
                transition: transform .6s cubic-bezier(.3,1.4,.5,1), border-radius .5s, background .4s; }
  .mark-footer { display: flex; align-items: center; gap: 14px; font: 10.5px ui-monospace, Menlo, monospace; color: #858583; }
  .mark-shuffle { padding: 5px 10px; border: 0; border-radius: 999px; background: #fff; color: #1a1a1a; font: inherit; cursor: pointer; }
`;

export default function mount(element) {
  element.innerHTML = `
    <style>${CSS}</style>
    <div class="mark">
      <div class="mark-grid">
        ${`<button type="button" class="mark-tile" aria-label="Rotate tile"><span class="mark-shape"></span></button>`.repeat(TILE_COUNT)}
      </div>
      <div class="mark-footer">
        <span class="mark-seed"></span>
        <button type="button" class="mark-shuffle">shuffle</button>
      </div>
    </div>`;

  const shapes = [...element.querySelectorAll('.mark-shape')];
  const seedLabel = element.querySelector('.mark-seed');
  let tiles = randomTiles();
  let seed = randomSeed();
  let lastInteraction = 0;

  function render() {
    tiles.forEach((tile, i) => {
      const { style } = shapes[i];
      style.borderRadius = tile.shape;
      style.background = tile.fill;
      style.transform = `rotate(${tile.rotation}deg)`;
    });
    seedLabel.textContent = `mark · ${seed}`;
  }

  function rotate(i) {
    tiles[i].rotation += 90;
    render();
  }

  shapes.forEach((shape, i) => {
    shape.parentElement.addEventListener('click', () => {
      lastInteraction = Date.now();
      rotate(i);
    });
  });

  element.querySelector('.mark-shuffle').addEventListener('click', () => {
    lastInteraction = Date.now();
    tiles = randomTiles();
    seed = randomSeed();
    render();
  });

  // When nobody is playing with it, it keeps turning tiles on its own.
  const autoRotate = setInterval(() => {
    if (Date.now() - lastInteraction < IDLE_DELAY) return;
    rotate(Math.floor(Math.random() * TILE_COUNT));
  }, AUTO_ROTATE_EVERY);

  render();

  return () => clearInterval(autoRotate);
}

function randomTiles() {
  return Array.from({ length: TILE_COUNT }, () => ({
    shape: pick(SHAPES),
    fill: pick(FILLS),
    rotation: 90 * Math.floor(Math.random() * 4),
  }));
}

function randomSeed() {
  return 1000 + Math.floor(Math.random() * 8999);
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}
