/* Articulated game presentation of the approved B1 art, not a new IP master. */
const SOURCE = './assets/nuanweiwei-happy-cutout-v2.png';
const MODES = new Set(['idle', 'correct', 'retry']);
const KINDS = new Set(['lesson', 'hero', 'reward', 'mini']);
const LABELS = {
  idle: '暖尾尾陪你一起想',
  correct: '暖尾尾开心地举手欢呼',
  retry: '暖尾尾想一想，鼓励你再试一次'
};
let sequence = 0;
const modeOf = mode => MODES.has(mode) ? mode : 'idle';
const isReduced = motion => {
  const value = typeof motion === 'function' ? motion() : motion;
  return value === 'reduce' || value === true;
};

/** Use mode for the current static state; call react only for a NEW answer event. */
export function companionMarkup({mode = 'idle', kind = 'lesson', motion = 'full'} = {}) {
  const state = modeOf(mode);
  const size = KINDS.has(kind) ? kind : 'lesson';
  const id = `cr-${++sequence}`;
  const image = clip => `<image href="${SOURCE}" width="1444" height="1089" clip-path="url(#${id}-${clip})"/>`;
  const skin = `<rect x="613" y="378" width="72" height="65" rx="30"/><rect x="722" y="315" width="83" height="98" rx="30"/><rect x="660" y="436" width="121" height="88" rx="30"/>`;
  const face = (name, strokes, mouth = '') => `<g class="cr-expression cr-expression-${name}"><g fill="#fdedd5">${skin}</g><g fill="url(#${id}-skin)">${skin}</g><g class="cr-face-lines">${strokes}${mouth}</g></g>`;
  return `<span class="character-companion" data-companion data-kind="${size}" data-mode="${state}" data-phase="rest" data-motion="${isReduced(motion)?'reduce':'full'}" role="img" aria-label="${LABELS[state]}">
    <svg class="cr-stage" viewBox="-50 -130 1544 1230" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="${id}-left-pony"><path d="M0 0H640L603 229L522 295L460 323L434 399L320 530H0Z"/></clipPath>
        <clipPath id="${id}-right-pony"><path d="M810 0H1444V439H1180L1110 380L1060 314L990 275L917 250L876 244Z"/></clipPath>
        <clipPath id="${id}-head"><path d="M491 301C495 208 607 166 716 177C833 165 906 250 911 397C932 509 874 566 779 580C699 612 578 571 520 520C476 475 464 381 491 301Z"/></clipPath>
        <clipPath id="${id}-dress"><path d="M665 550L848 524L945 642L1038 683L990 749L860 831L724 883L630 894L653 758L670 636Z"/></clipPath>
        <pattern id="${id}-skin" width="48" height="30" patternUnits="userSpaceOnUse"><image href="${SOURCE}" x="-678" y="-405" width="1444" height="1089"/></pattern>
      </defs>
      <ellipse class="cr-shadow" cx="763" cy="1028" rx="227" ry="27"/>
      <g class="cr-wishes"><path class="cr-wish cr-wish-one" d="m324 338 20 48 52 18-52 18-20 48-19-48-52-18 52-18Z"/><path class="cr-wish cr-wish-two" d="m1145 539 15 38 40 15-40 15-15 38-15-38-40-15 40-15Z"/><path class="cr-wish cr-wish-three" d="m996 153 10 27 30 10-30 10-10 27-10-27-30-10 30-10Z"/></g>
      <g class="cr-actor">
        <g transform="translate(748 855)"><g class="cr-leg cr-leg-left"><path d="M0 0Q3 43 19 100"/><g class="cr-foot-left" transform="translate(15 124)"><ellipse cx="0" cy="0" rx="39" ry="23" transform="rotate(-18)"/></g></g></g>
        <g transform="translate(956 758)"><g class="cr-leg cr-leg-right"><path d="M0 0Q52 34 109 56"/><g class="cr-foot-right" transform="translate(132 55)"><ellipse cx="0" cy="0" rx="34" ry="24" transform="rotate(-50)"/></g></g></g>
        <g transform="translate(694 568)"><g class="cr-arm cr-arm-left"><path d="M0 0Q-66-6-138-20"/><g transform="translate(-138 -20)"><g class="cr-forearm cr-forearm-left"><path d="M0 0Q-78-21-123-66"/><circle class="cr-hand" cx="-132" cy="-75" r="25"/></g></g></g></g>
        <g class="cr-dress">${image('dress')}</g>
        <g class="cr-head">
          <g class="cr-pony cr-pony-left">${image('left-pony')}</g>
          <g class="cr-pony cr-pony-right">${image('right-pony')}</g>
          ${image('head')}
          ${face('idle', '<path class="cr-eye cr-eye-left" d="M629 418Q643 386 662 413"/><path class="cr-eye cr-eye-right" d="M746 385Q752 361 769 368M752 368l-2-18m10 18 8-15m-1 24 14-7"/>', '<path d="M686 466Q714 511 752 453"/>')}
          ${face('correct', '<path d="M627 420Q642 385 665 411M738 375Q750 340 772 357"/>', '<path class="cr-happy-mouth" d="M684 463Q714 479 754 448Q747 500 716 502Q695 501 684 463Z"/><path class="cr-tongue" d="M708 492Q723 476 739 487"/>')}
          ${face('think', '<path class="cr-look" d="M638 407v9M767 357v9"/><path class="cr-brow" d="M624 387q14-10 30-3M748 338q13-12 28-7"/>', '<path d="M701 477Q721 479 736 466"/>')}
          ${face('encourage', '<path d="M627 420Q642 385 665 411M743 379Q753 345 773 359"/>', '<path d="M687 468Q716 510 751 451"/>')}
          <g class="cr-blink"><g fill="#fdedd5"><rect x="722" y="315" width="83" height="98" rx="30"/></g><g fill="url(#${id}-skin)"><rect x="722" y="315" width="83" height="98" rx="30"/></g><path class="cr-face-lines" d="M737 370Q752 380 770 360"/></g>
        </g>
        <g transform="translate(834 553)"><g class="cr-arm cr-arm-right"><path d="M0 0Q50-34 84-72"/><g transform="translate(84 -72)"><g class="cr-forearm cr-forearm-right"><path d="M0 0Q55-55 87-120"/><circle class="cr-hand" cx="95" cy="-134" r="25"/></g></g></g></g>
      </g>
    </svg>
  </span>`;
}

/** No frame loop: bounded response timers plus CSS idle motions. */
export function createCharacterReactions(element, {motion = 'full', clock = globalThis} = {}) {
  if (!element) return {react(){return false;}, pause(){}, resume(){}, setMotion(){}, destroy(){}};
  const doc = element.ownerDocument;
  let stopped = false;
  let paused = false;
  let manuallyPaused = false;
  let reduced = isReduced(motion);
  let lastKey;
  let hasKey = false;
  let state = modeOf(element.dataset?.mode);
  const timers = new Set();
  const clearTimers = () => {
    for (const timer of timers) clock.clearTimeout(timer);
    timers.clear();
  };
  const later = (fn, ms) => {
    let timer;
    timer = clock.setTimeout(() => {timers.delete(timer); if (!stopped && !paused) fn();}, ms);
    timers.add(timer);
  };
  const phase = value => element.setAttribute('data-phase', value);
  const settle = () => {clearTimers(); element.classList.remove('cr-playing'); phase('rest');};
  const updateMotion = () => {
    reduced = isReduced(motion);
    element.setAttribute('data-motion', reduced ? 'reduce' : 'full');
    if (reduced) settle();
  };
  const pauseVisual = () => {
    if (stopped) return;
    paused = true;
    settle();
    element.classList.add('cr-paused');
  };
  const pause = () => {manuallyPaused = true; pauseVisual();};
  const resume = () => {
    if (stopped) return;
    manuallyPaused = false;
    if (doc?.hidden) {pauseVisual(); return;}
    paused = false;
    element.classList.remove('cr-paused');
    updateMotion();
  };
  const onVisibility = () => {if (doc.hidden) pauseVisual(); else if (!manuallyPaused) resume();};
  updateMotion();
  doc?.addEventListener?.('visibilitychange', onVisibility);
  if (doc?.hidden) pauseVisual();
  return {
    react(next, {key} = {}) {
      if (stopped) return false;
      const value = modeOf(next);
      if (key !== undefined && hasKey && key === lastKey) return false;
      if (key !== undefined) {lastKey = key; hasKey = true;}
      state = value;
      settle();
      updateMotion();
      element.setAttribute('data-mode', state);
      element.setAttribute('aria-label', LABELS[state]);
      if (reduced || paused || state === 'idle') return true;
      phase(state === 'retry' ? 'think' : 'celebrate');
      // Removing and re-adding the class must also restart consecutive answers.
      element.getBoundingClientRect?.();
      element.classList.add('cr-playing');
      if (state === 'retry') later(() => phase('encourage'), 1050);
      later(settle, state === 'retry' ? 2700 : 1950);
      return true;
    },
    pause,
    resume,
    setMotion(next) {if (stopped) return; motion = next; updateMotion();},
    destroy() {
      if (stopped) return;
      stopped = true;
      settle();
      doc?.removeEventListener?.('visibilitychange', onVisibility);
      element.classList.remove('cr-paused');
      element.setAttribute('data-motion', 'reduce');
    }
  };
}
