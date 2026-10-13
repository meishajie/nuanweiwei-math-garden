import { icon, emblem } from './art.js?v=20261013-1';
import { PLAY_DURATION_MS } from './play-rewards.js?v=20261013-1';

const safeCount = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const sourceCharacter = './assets/nuanweiwei-happy-safari.png';
export const starPlayTime = (play, now) => Math.max(0, Math.min(PLAY_DURATION_MS, play.expiresAt - now));

export function playRewardMarkup(rewards) {
  const available = rewards.ticket === 1 && !rewards.active;
  const progress = rewards.progress || [];
  return `<section class="star-play-invitation" aria-labelledby="star-play-invitation-title"><div><span class="star-play-kicker">百宝箱里的小游戏</span><h2 id="star-play-invitation-title">帮暖尾尾接星光</h2><p>${available ? '点一点亮亮的星星，送到暖尾尾的花园里。只玩一分钟，时间到就收好。' : '再完成三个不同花园地点的数学旅程，就能回来玩一分钟。'}</p><div class="star-play-stamps" aria-label="${progress.length} 个不同地点，集齐三个可再玩一分钟">${Array.from({ length: 3 }, (_, i) => `<span class="star-play-stamp ${progress[i] ? 'star-play-stamp-lit' : ''}">${progress[i] ? emblem(progress[i].levelId) : icon('leaf')}</span>`).join('')}<span>${progress.length} / 3</span></div></div>${available ? `<button class="star-play-button star-play-primary" data-action="star-play-start">${icon('play')}玩 1 分钟</button>` : `<button class="star-play-button" data-action="nav" data-view="home">回花园探一站${icon('arrow')}</button>`}</section>`;
}

export function starPlayMarkup(play, { now = Date.now() } = {}) {
  const seconds = Math.ceil(starPlayTime(play, now) / 1000);
  return `<section id="mini-play" class="star-play-scene" aria-labelledby="star-play-title"><div class="star-play-heading"><div><p class="star-play-kicker">送给魔法伙伴的一分钟</p><h1 id="star-play-title">帮暖尾尾接星光</h1></div><div class="star-play-time" role="timer" aria-label="小游戏剩余时间"><span data-star-seconds>${seconds}</span><small>秒后收好</small></div></div><div class="star-play-stage"><div class="star-play-character"><img src="${sourceCharacter}" alt="暖尾尾开心地等着你送来的星光" width="318" height="240"><p>点亮的星星，送给我吧！</p></div><div class="star-play-board" role="group" aria-label="点亮星星，帮助暖尾尾收集星光">${Array.from({ length: 6 }, (_, index) => `<button class="star-play-target ${index % 2 ? 'star-play-sleeping' : ''}" data-star-slot="${index}" ${index % 2 ? 'disabled' : ''} aria-label="接住这颗星星" style="--star-delay:${index * .17}s">${icon('star')}<span class="star-play-touch-glow"></span></button>`).join('')}</div><div class="star-play-light-jar" aria-label="已经送给暖尾尾的星光"><span>${icon('spark')}<b data-star-count>${safeCount(play.caught)}</b></span><p>谢谢你带来的光！</p></div></div><div class="star-play-bottom"><div class="star-play-time-track" aria-hidden="true"><span data-star-time-fill style="width:${starPlayTime(play, now) / PLAY_DURATION_MS * 100}%"></span></div><p data-star-status role="status">用小手点亮星星，花园就会收到光。</p><button class="star-play-button" data-action="star-play-exit">${icon('moon')}提前收好，歇一歇</button></div></section>`;
}

export function starPlayEndMarkup(lastPlay) {
  const caught = safeCount(lastPlay?.caught);
  return `<section class="star-play-end"><div class="star-play-end-art"><img src="${sourceCharacter}" alt="暖尾尾为你收好的星光开心" width="318" height="240">${icon('spark')}</div><p class="star-play-kicker">星光已经收好啦</p><h1>谢谢你，我的魔法伙伴！</h1><p>${caught ? `你给暖尾尾送来了 ${caught} 束星光。` : '我们一起在星光花园待了一会儿。'}<br>现在让小手和眼睛歇一歇吧。</p><div class="star-play-end-actions"><button class="star-play-button star-play-primary" data-action="nav" data-view="home">回数学花园${icon('leaf')}</button><button class="star-play-button" data-action="rest">${icon('moon')}歇一歇</button></div><p class="star-play-end-note">以后再完成三个不同地点的数学旅程，可以重新获得一次机会。</p></section>`;
}

// The caller persists the consumed ticket BEFORE attaching this controller.
// Callbacks: onCatch({playId,caught,at}); onFinish({playId,caught,at,reason}).
export function createStarPlayController(element, { play, now = () => Date.now(), clock = globalThis, settings = {}, onCatch = () => {}, onFinish = () => {} } = {}) {
  if (!element || !play || !Number.isSafeInteger(play.id) || play.id <= 0 || !Number.isSafeInteger(play.startedAt) || play.startedAt < 0 || !Number.isSafeInteger(play.expiresAt) || play.expiresAt !== play.startedAt + PLAY_DURATION_MS) throw new TypeError('A saved one-minute play and its root element are required.');
  const document = element.ownerDocument;
  const slots = [...element.querySelectorAll('[data-star-slot]')];
  const timers = new Set();
  let caught = safeCount(play.caught), stopped = false, finished = false, appPaused = false, cursor = 1;
  const timerLabel = element.querySelector('[data-star-seconds]');
  const counter = element.querySelector('[data-star-count]');
  const timeFill = element.querySelector('[data-star-time-fill]');
  const status = element.querySelector('[data-star-status]');
  const isHidden = () => document?.hidden === true;
  const isPaused = () => appPaused || isHidden();
  const pausedUI = () => { element.classList.toggle('star-play-paused', isPaused()); if (status && !finished) status.textContent = isPaused() ? '星光先停一停，一分钟仍会按时收好。' : '用小手点亮星星，花园就会收到光。'; };
  function disableAll() { for (const button of slots) button.disabled = true; }
  function cleanup() { clock.clearInterval(interval); for (const timer of timers) clock.clearTimeout(timer); timers.clear(); element.removeEventListener('click', click); document?.removeEventListener('visibilitychange', visibility); }
  function finish() {
    if (finished || stopped) return;
    finished = true; stopped = true; cleanup(); disableAll(); element.classList.add('star-play-finished');
    if (timerLabel) timerLabel.textContent = '0';
    if (timeFill) timeFill.style.width = '0%';
    if (status) status.textContent = '一分钟到啦，星光已经收好。';
    onFinish({ playId: play.id, caught, at: now(), reason: 'complete' });
  }
  function tick() {
    if (stopped) return;
    const remaining = starPlayTime(play, now());
    if (timerLabel) timerLabel.textContent = String(Math.ceil(remaining / 1000));
    if (timeFill) timeFill.style.width = `${remaining / PLAY_DURATION_MS * 100}%`;
    if (remaining <= 0) finish();
  }
  function click(event) {
    const target = event.target.closest?.('[data-star-slot]');
    if (!target || !element.contains(target) || stopped || isPaused() || target.disabled) return;
    const at = now();
    if (at >= play.expiresAt) { finish(); return; }
    target.disabled = true; target.classList.add('star-play-caught');
    caught += 1; if (counter) counter.textContent = String(caught);
    onCatch({ playId: play.id, caught, at });
    const reduced = (typeof settings === 'function' ? settings() : settings)?.motion === 'reduce' || element.closest?.('[data-motion="reduce"]');
    const timer = clock.setTimeout(() => {
      timers.delete(timer);
      if (stopped) return;
      if (now() >= play.expiresAt) { finish(); return; }
      target.classList.remove('star-play-caught'); target.classList.add('star-play-sleeping');
      let replacement = null;
      for (let attempt = 0; attempt < slots.length; attempt += 1) {
        const candidate = slots[(cursor + attempt) % slots.length];
        if (candidate.classList.contains('star-play-sleeping') && !candidate.classList.contains('star-play-caught')) { replacement = candidate; cursor = (cursor + attempt + 1) % slots.length; break; }
      }
      if (replacement) { replacement.classList.remove('star-play-sleeping'); replacement.disabled = false; }
    }, reduced ? 140 : 340);
    timers.add(timer);
  }
  function visibility() { pausedUI(); tick(); }
  element.addEventListener('click', click); document?.addEventListener('visibilitychange', visibility);
  const interval = clock.setInterval(tick, 200);
  pausedUI(); tick();
  return {
    tick,
    pause() { if (!stopped) { appPaused = true; pausedUI(); tick(); } },
    resume() { if (!stopped) { appPaused = false; pausedUI(); tick(); } },
    stop() { if (!stopped) { stopped = true; cleanup(); disableAll(); element.classList.add('star-play-stopped'); } },
    destroy() { this.stop(); },
  };
}
