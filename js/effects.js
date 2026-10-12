const COLORS = ['#ffc960', '#ff7fbb', '#62d2ed', '#ab88fb', '#8bdfa8'];
const LIMIT = 180;
const random = (low, high) => low + Math.random() * (high - low);
const ease = value => 1 - (1 - value) ** 3;

// origin / target accept a DOM element or viewport { x, y } coordinates.
export function createEffects(canvas, { reducedMotion = () => false } = {}) {
  const doc = canvas.ownerDocument || globalThis.document;
  const browser = doc?.defaultView || globalThis.window || globalThis;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { burst: () => false, celebrate: () => false, stop() {}, pause() {}, resume() {}, destroy() {} };
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '110' });
  const sprites = new Map();
  let particles = [], rings = [], events = [], frame = 0, time = 0, last = null, paused = false, disposed = false;
  let bounds, width = 1, height = 1, dpr = 1;
  const reduced = () => typeof reducedMotion === 'function' ? reducedMotion() : Boolean(reducedMotion);
  const active = () => !disposed && !paused && !doc?.hidden && !reduced();
  function resize() {
    bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width || browser.innerWidth || 1);
    height = Math.max(1, bounds.height || browser.innerHeight || 1);
    dpr = Math.min(2, Math.max(1, browser.devicePixelRatio || 1));
    canvas.width = Math.ceil(width * dpr); canvas.height = Math.ceil(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function position(value, fallback) {
    if (value?.getBoundingClientRect) {
      const rect = value.getBoundingClientRect();
      return { x: rect.left + rect.width / 2 - bounds.left, y: rect.top + rect.height / 2 - bounds.top };
    }
    if (value && Number.isFinite(value.x) && Number.isFinite(value.y)) return { x: value.x - bounds.left, y: value.y - bounds.top };
    return fallback;
  }
  function sprite(color) {
    if (sprites.has(color)) return sprites.get(color);
    const image = doc.createElement('canvas'); image.width = 64; image.height = 64;
    const paint = image.getContext('2d'), glow = paint.createRadialGradient(32, 32, 1, 32, 32, 31);
    glow.addColorStop(0, '#ffffff'); glow.addColorStop(.15, color); glow.addColorStop(.45, `${color}70`); glow.addColorStop(1, `${color}00`);
    paint.fillStyle = glow; paint.fillRect(0, 0, 64, 64);
    paint.beginPath(); paint.moveTo(32, 14); paint.lineTo(36, 28); paint.lineTo(50, 32); paint.lineTo(36, 36);
    paint.lineTo(32, 50); paint.lineTo(28, 36); paint.lineTo(14, 32); paint.lineTo(28, 28); paint.closePath();
    paint.fillStyle = color; paint.fill();
    paint.fillStyle = '#fff6df'; paint.beginPath(); paint.arc(32, 32, 2, 0, Math.PI * 2); paint.fill();
    sprites.set(color, image); return image;
  }
  function add(particle) {
    if (particles.length >= LIMIT) particles.shift();
    particles.push({ born: time, color: COLORS[Math.floor(random(0, COLORS.length))], rotation: random(0, Math.PI), spin: random(-1.2, 1.2), ...particle });
  }
  function ring(point, radius = 90, life = .9, color = '#ffe2a3') {
    if (rings.length >= 12) rings.shift();
    rings.push({ ...point, born: time, life, radius, color });
  }
  function shower(point, count, force = 110, life = 1.2) {
    for (let i = 0; i < count; i += 1) {
      const angle = random(0, Math.PI * 2), speed = random(force * .35, force);
      add({ type: 'mote', ...point, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - force * .25,
        size: random(10, 23), life: random(life * .6, life), gravity: 38 });
    }
    ring(point, force * .78, Math.min(life, 1.1));
  }
  function schedule(delay, spawn) {
    events.push({ at: time + delay, spawn });
    events.sort((a, b) => a.at - b.at);
  }
  function travel(from, to, { delay = 0, life = .72, size = 22, color = '#ffe9a1' } = {}) {
    schedule(delay, () => add({ type: 'travel', from, to, x: from.x, y: from.y,
      bend: Math.min(100, Math.abs(from.x - to.x) * .2 + 26), size, color, life }));
  }
  function draw(now) {
    frame = 0;
    if (!active()) { if (reduced()) stop(); else pause(); return; }
    const delta = last === null ? 0 : Math.min(.06, Math.max(0, (now - last) / 1000));
    last = now; time += delta;
    while (events[0]?.at <= time) events.shift().spawn();
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
    particles = particles.filter(p => time - p.born < p.life);
    for (const p of particles) {
      const age = time - p.born, t = Math.min(1, age / p.life);
      let x, y, alpha;
      if (p.type === 'travel') {
        const f = ease(t); x = p.from.x + (p.to.x - p.from.x) * f;
        y = p.from.y + (p.to.y - p.from.y) * f - Math.sin(f * Math.PI) * p.bend;
        alpha = Math.min(1, t * 7) * (1 - Math.max(0, (t - .8) * 5));
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x - (p.to.x - p.from.x) * .04 * (1 - t), y - (p.to.y - p.from.y) * .04 * (1 - t));
        ctx.lineWidth = 2; ctx.strokeStyle = p.color; ctx.globalAlpha = alpha * .45; ctx.stroke();
      } else {
        x = p.x + p.vx * age; y = p.y + p.vy * age + p.gravity * age ** 2 / 2;
        alpha = Math.min(1, (1 - t) * 1.5);
      }
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.rotation + p.spin * age);
      ctx.globalAlpha = alpha; ctx.drawImage(sprite(p.color), -p.size / 2, -p.size / 2, p.size, p.size); ctx.restore();
    }
    rings = rings.filter(r => time - r.born < r.life);
    for (const r of rings) {
      const t = (time - r.born) / r.life;
      ctx.globalAlpha = (1 - t) * .38; ctx.strokeStyle = r.color; ctx.lineWidth = 2.5 * (1 - t) + .4;
      ctx.beginPath(); ctx.arc(r.x, r.y, 8 + ease(t) * r.radius, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (events.length || particles.length || rings.length) frame = browser.requestAnimationFrame(draw);
    else { last = null; time = 0; }
  }
  function begin() {
    if (!active()) return false;
    if (!frame) { last = null; frame = browser.requestAnimationFrame(draw); }
    return true;
  }
  function burst(kind = 'correct', options = {}) {
    if (!active()) return false;
    resize();
    const from = position(options.origin, { x: width * .5, y: height * .5 });
    const to = position(options.target, { x: width * .27, y: height * .48 });
    if (kind === 'correct') {
      shower(from, 14, 78, .8);
      for (let i = 0; i < 7; i += 1) travel({ x: from.x + random(-15, 15), y: from.y + random(-10, 10) }, to,
        { delay: i * .035, life: .64, size: random(18, 28), color: COLORS[i % COLORS.length] });
      schedule(.76, () => shower(to, 16, 65, .62));
    } else shower(from, kind === 'reward' ? 65 : 90, Math.min(width * .27, 210), 1.8);
    return begin();
  }
  function celebrate(kind = 'reward', options = {}) {
    if (!active()) return false;
    stop(); resize();
    const center = position(options.target || options.origin, { x: width * .5, y: height * .42 });
    const force = Math.min(width * .32, 240);
    if (kind === 'reward') {
      [0, .38, 1.05, 1.8].forEach((at, i) => schedule(at, () => shower({ x: center.x + (i ? random(-width * .2, width * .2) : 0), y: center.y + random(-height * .12, height * .06) }, i ? 32 : 68, force, 1.4)));
      schedule(.2, () => ring(center, Math.min(width * .4, 300), 2.6, '#cbb8ff'));
    } else if (kind === 'treasure') {
      const origins = options.origins || [];
      for (let i = 0; i < 10; i += 1) {
        const angle = i / 10 * Math.PI * 2, radius = Math.min(width * .35, height * .33);
        travel(position(origins[i], { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }), center,
          { delay: i * .052, life: 1.1, size: 34, color: COLORS[i % COLORS.length] });
      }
      schedule(1.55, () => shower(center, 92, force * 1.18, 2));
      schedule(1.6, () => ring(center, Math.min(width * .48, 360), 2.2, '#cbb8ff'));
      for (let i = 0; i < 11; i += 1) schedule(2.2 + i * .6, () => shower({ x: center.x + random(-width * .32, width * .32), y: random(height * .15, height * .5) }, 23, force * .45, 1.5));
      schedule(8.4, () => shower(center, 48, force * .75, 1.6));
    } else {
      schedule(0, () => ring(center, Math.min(width * .43, 310), 2.2, '#a7e9fc'));
      for (let i = 0; i < 16; i += 1) schedule(i * .66, () => {
        const source = { x: center.x + random(-width * .3, width * .3), y: height * .66 };
        shower(source, 15, force * .5, Math.min(1.8, 12 - i * .66));
      });
    }
    return begin();
  }
  function stop() {
    if (frame) browser.cancelAnimationFrame(frame); frame = 0; last = null; time = 0;
    particles = []; rings = []; events = []; ctx.clearRect(0, 0, width, height);
  }
  function pause() { paused = true; if (frame) browser.cancelAnimationFrame(frame); frame = 0; last = null; }
  function resume() { if (disposed || doc?.hidden || reduced()) return; paused = false; if (events.length || particles.length || rings.length) begin(); }
  function visibility() { if (doc.hidden) pause(); }
  function motionChanged() { if (reduced()) stop(); }
  const media = browser.matchMedia?.('(prefers-reduced-motion: reduce)');
  function destroy() {
    disposed = true; stop(); sprites.clear();
    browser.removeEventListener('resize', resize); doc?.removeEventListener('visibilitychange', visibility);
    media?.removeEventListener?.('change', motionChanged);
  }
  resize(); browser.addEventListener('resize', resize); doc?.addEventListener('visibilitychange', visibility);
  media?.addEventListener?.('change', motionChanged);
  return { burst, celebrate, stop, pause, resume, destroy };
}
