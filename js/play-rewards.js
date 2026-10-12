// Entertainment rewards have their own state. No math cards are consumed.
export const PLAY_DURATION_MS = 60_000;
const MAX = Number.MAX_SAFE_INTEGER;
const number = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const gradeKey = value => /^[a-z0-9][a-z0-9_-]{0,63}$/.test(String(value)) ? String(value) : null;
const levelKey = value => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 10 ? String(Number(value)) : null;
const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const time = value => Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
const empty = () => ({ version: 1, ticket: 0, unlockedGrades: [], highWater: {}, progress: [], playSequence: 0, active: null, lastPlay: null });
const copy = state => ({ ...state, unlockedGrades: [...state.unlockedGrades], highWater: Object.fromEntries(Object.entries(state.highWater).map(([id, levels]) => [id, { ...levels }])), progress: state.progress.map(item => ({ ...item })), active: state.active ? { ...state.active } : null, lastPlay: state.lastPlay ? { ...state.lastPlay } : null });

function hasTenCards(cards) {
  const owned = new Set(Array.isArray(cards) ? cards.map(Number) : []);
  return Array.from({ length: 10 }, (_, index) => index + 1).every(id => owned.has(id));
}

function baseline(state, snapshots) {
  for (const [id, math] of Object.entries(snapshots || {})) {
    const grade = gradeKey(id);
    if (!grade || owns(state.highWater, grade)) continue;
    const rounds = {};
    for (let level = 1; level <= 10; level += 1) rounds[level] = number(math?.stages?.[level]?.completedRounds);
    Object.defineProperty(state.highWater, grade, { value: rounds, enumerable: true, configurable: true, writable: true });
  }
  return state;
}

export function createRewards(gradeSnapshots = {}) {
  let state = baseline(empty(), gradeSnapshots);
  for (const [grade, math] of Object.entries(gradeSnapshots || {})) state = unlockForCards(state, grade, math?.cards);
  return state;
}

function validPlay(raw) {
  if (!raw || !Number.isSafeInteger(raw.id) || raw.id <= 0 || !Number.isSafeInteger(raw.startedAt) || raw.startedAt < 0 || !Number.isSafeInteger(raw.expiresAt) || raw.expiresAt !== raw.startedAt + PLAY_DURATION_MS) return null;
  return { id: raw.id, startedAt: raw.startedAt, expiresAt: raw.expiresAt, caught: number(raw.caught) };
}

export function hydrateRewards(raw, gradeSnapshots = {}) {
  let parsed = raw;
  if (typeof raw === 'string') { try { parsed = JSON.parse(raw); } catch { parsed = null; } }
  if (!parsed || parsed.version !== 1) return createRewards(gradeSnapshots);
  const state = empty();
  state.ticket = parsed.ticket === 1 ? 1 : 0;
  state.unlockedGrades = [...new Set((Array.isArray(parsed.unlockedGrades) ? parsed.unlockedGrades : []).map(gradeKey).filter(Boolean))];
  for (const [key, values] of Object.entries(parsed.highWater || {})) {
    const grade = gradeKey(key);
    if (!grade || !values || typeof values !== 'object' || Array.isArray(values)) continue;
    const rounds = {};
    for (let level = 1; level <= 10; level += 1) rounds[level] = number(values[level]);
    Object.defineProperty(state.highWater, grade, { value: rounds, enumerable: true, configurable: true, writable: true });
  }
  state.active = validPlay(parsed.active);
  const ended = validPlay(parsed.lastPlay);
  if (ended) state.lastPlay = { ...ended, finishedAt: time(parsed.lastPlay.finishedAt), reason: parsed.lastPlay.reason === 'left' ? 'left' : 'complete' };
  state.playSequence = Math.max(number(parsed.playSequence), state.active?.id || 0, state.lastPlay?.id || 0);
  if (state.active) state.ticket = 0;
  if (!state.active && !state.ticket && state.unlockedGrades.length) {
    for (const item of Array.isArray(parsed.progress) ? parsed.progress : []) {
      const gradeId = gradeKey(item?.gradeId), levelId = levelKey(item?.levelId);
      if (gradeId && levelId && !state.progress.some(point => point.gradeId === gradeId && point.levelId === Number(levelId)) && state.progress.length < 2) state.progress.push({ gradeId, levelId: Number(levelId) });
    }
  }
  baseline(state, gradeSnapshots);
  let next = state;
  for (const [grade, math] of Object.entries(gradeSnapshots || {})) next = unlockForCards(next, grade, math?.cards);
  return next;
}

export function unlockForCards(rewards, gradeId, cards) {
  const grade = gradeKey(gradeId);
  if (!grade || !hasTenCards(cards) || rewards.unlockedGrades.includes(grade)) return rewards;
  const next = copy(rewards);
  next.unlockedGrades.push(grade);
  // The first gift is acknowledged even when a ticket is already held or a
  // round is running. It never creates a queued reward or a second ticket.
  if (!next.active && next.ticket === 0) { next.ticket = 1; next.progress = []; }
  return next;
}

export function creditCompletion(rewards, { gradeId, levelId, completedRound } = {}) {
  const grade = gradeKey(gradeId), level = levelKey(levelId), round = number(completedRound);
  if (!grade || !level || !round || round <= (owns(rewards.highWater, grade) ? rewards.highWater[grade][level] || 0 : 0)) return rewards;
  const next = copy(rewards);
  if (!owns(next.highWater, grade)) Object.defineProperty(next.highWater, grade, { value: {}, enumerable: true, configurable: true, writable: true });
  next.highWater[grade][level] = round;
  // Record the high-water mark even while rewards cannot be earned. Replaying
  // this completion later must not turn it into a new stamp or a refund.
  if (!next.unlockedGrades.length || next.ticket || next.active || next.progress.some(item => item.gradeId === grade && item.levelId === Number(level))) return next;
  next.progress.push({ gradeId: grade, levelId: Number(level) });
  if (next.progress.length === 3) { next.ticket = 1; next.progress = []; }
  return next;
}

export function startPlay(rewards, now = Date.now()) {
  if (rewards.ticket !== 1 || rewards.active || !rewards.unlockedGrades.length || rewards.playSequence >= MAX) return rewards;
  const startedAt = time(now);
  if (startedAt > MAX - PLAY_DURATION_MS) return rewards;
  const next = copy(rewards);
  next.ticket = 0; next.progress = []; next.playSequence += 1;
  next.active = { id: next.playSequence, startedAt, expiresAt: startedAt + PLAY_DURATION_MS, caught: 0 };
  return next;
}

export function getPlayStatus(rewards, now = Date.now()) {
  const remainingMs = rewards.active ? Math.max(0, Math.min(PLAY_DURATION_MS, rewards.active.expiresAt - time(now))) : 0;
  const canStart = rewards.ticket === 1 && !rewards.active && rewards.unlockedGrades.length > 0;
  return { status: rewards.active ? remainingMs > 0 ? 'running' : 'expired' : canStart ? 'ready' : 'locked', canStart, remainingMs, secondsLeft: Math.ceil(remainingMs / 1000), needsFinish: !!rewards.active && remainingMs === 0 };
}

export function recordCatch(rewards, playId, now = Date.now()) {
  if (rewards.active?.id !== playId || getPlayStatus(rewards, now).status !== 'running') return rewards;
  const next = copy(rewards);
  next.active.caught = Math.min(MAX, next.active.caught + 1);
  return next;
}

export function finishPlay(rewards, now = Date.now(), reason = 'complete') {
  if (!rewards.active || (reason !== 'left' && getPlayStatus(rewards, now).status !== 'expired')) return rewards;
  const next = copy(rewards);
  next.lastPlay = { ...next.active, finishedAt: Math.min(next.active.expiresAt, Math.max(next.active.startedAt, time(now))), reason: reason === 'left' ? 'left' : 'complete' };
  next.active = null; next.ticket = 0;
  return next;
}
