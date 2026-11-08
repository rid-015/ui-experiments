// Hold to publish
// Press and hold to fill the button. When it fills, it shrinks to a tick and bursts into dots.

const HOLD_TIME = 750;
const RESET_TIME = 1500;
const DOT_COLORS = [
  'var(--acc,#2b7d52)', 'var(--acc-soft,#9fd8b8)', '#f2b5cf', '#c4b5f4', '#f6c9a8',
  '#a9d4f2', 'var(--acc-soft,#9fd8b8)', '#f1dc8e', '#1a1a1a', '#c4b5f4',
];
const HINTS = { idle: 'press & hold', holding: 'keep holding…', done: 'published' };

const CSS = `
  .hold { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px;
          background: var(--card2, #f5f5f5); font: 13.5px Helvetica, Arial, sans-serif; user-select: none; }
  .hold-stage { position: relative; display: grid; place-items: center; width: 200px; height: 48px; }
  .hold-dot { position: absolute; left: 50%; top: 50%; width: 6px; height: 6px; margin: -3px; border-radius: 50%; }
  .hold-button { position: relative; overflow: hidden; height: 48px; padding: 0; border: 1px solid #e2e2de;
                 border-radius: 999px; background: #fff; color: #1a1a1a; font: inherit; cursor: pointer; touch-action: none;
                 transition: width .5s cubic-bezier(.3,1.3,.5,1), transform .3s cubic-bezier(.3,1.6,.5,1); }
  .hold-fill { position: absolute; inset: 0; background: var(--acc-soft, #9fd8b8); transform-origin: left; }
  .hold-label { position: relative; white-space: nowrap; transition: opacity .2s; }
  .hold-check { position: absolute; inset: 0; display: grid; place-items: center; transition: opacity .25s .15s; }
  .hold-hint { font: 10.5px ui-monospace, Menlo, monospace; color: #858583; }
`;

export default function mount(element) {
  element.innerHTML = `
    <style>${CSS}</style>
    <div class="hold">
      <div class="hold-stage">
        ${DOT_COLORS.map(color => `<span class="hold-dot" style="background:${color}"></span>`).join('')}
        <button type="button" class="hold-button">
          <span class="hold-fill"></span>
          <span class="hold-label">Hold to publish</span>
          <span class="hold-check">
            <svg width="16" height="13" viewBox="0 0 16 13" fill="none" stroke="#1a1a1a" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round"><path d="M2 7 L6 11 L14 2"/></svg>
          </span>
        </button>
      </div>
      <span class="hold-hint"></span>
    </div>`;

  const button = element.querySelector('.hold-button');
  const fill = element.querySelector('.hold-fill');
  const label = element.querySelector('.hold-label');
  const check = element.querySelector('.hold-check');
  const hint = element.querySelector('.hold-hint');
  const dots = [...element.querySelectorAll('.hold-dot')];
  let state = 'idle';
  let holdTimer;
  let resetTimer;

  function setState(next) {
    state = next;
    const done = state === 'done';

    button.style.width = done ? '48px' : '190px';
    button.style.transform = state === 'holding' ? 'scale(.97)' : 'none';
    fill.style.transform = `scaleX(${state === 'idle' ? 0 : 1})`;
    fill.style.transition = state === 'holding'
      ? `transform ${HOLD_TIME}ms linear`
      : 'transform .35s cubic-bezier(.4,0,.2,1)';
    label.style.opacity = done ? 0 : 1;
    check.style.opacity = done ? 1 : 0;
    hint.textContent = HINTS[state];

    // Dots sit hidden behind the button, then fly out in a ring when it's done.
    dots.forEach((dot, i) => {
      const angle = (i / dots.length) * Math.PI * 2;
      const distance = done ? 46 + (i % 2) * 12 : 0;
      dot.style.transition = done ? 'transform .7s cubic-bezier(.2,.8,.3,1), opacity .35s .4s' : 'none';
      dot.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
      dot.style.opacity = done ? 0 : 1;
    });
  }

  function cancel() {
    if (state !== 'holding') return;
    clearTimeout(holdTimer);
    setState('idle');
  }

  button.addEventListener('pointerdown', () => {
    if (state !== 'idle') return;
    setState('holding');
    holdTimer = setTimeout(() => {
      setState('done');
      resetTimer = setTimeout(() => setState('idle'), RESET_TIME);
    }, HOLD_TIME);
  });
  button.addEventListener('pointerup', cancel);
  button.addEventListener('pointerleave', cancel);
  button.addEventListener('contextmenu', event => event.preventDefault());

  setState('idle');

  return () => {
    clearTimeout(holdTimer);
    clearTimeout(resetTimer);
  };
}
