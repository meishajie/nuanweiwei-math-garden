import {answerTotals} from './round-summary.js?v=20261016-3';
import { LEVELS, QUESTIONS, LEGACY_GENERATED_QUESTIONS, GRADE_QUESTIONS, getLevels, DIFFICULTIES, DIFFICULTY_QUESTIONS, getDifficultyBank } from './curriculum-legacy.js?v=20261016-3';

// No browser APIs, dates or storage. Random sampling is injected at session start.
const VERSION = 1;
const RECENT_LIMIT = 12;
const MAX_COUNT = 1_000_000_000;
const LEVEL_IDS = LEVELS.map(level => level.id);
const ALL_QUESTIONS = Object.fromEntries([1, 2, 3].map(grade => [grade, Object.fromEntries(LEVEL_IDS.map(id => [id,
  [...(grade === 1 ? [...QUESTIONS[id].flat(), ...LEGACY_GENERATED_QUESTIONS[id]] : []), ...GRADE_QUESTIONS[grade][id], ...DIFFICULTIES.flatMap(d => DIFFICULTY_QUESTIONS[grade][d][id])]
]))]));
const BANK = new Map([1, 2, 3].flatMap(grade => LEVEL_IDS.flatMap(id => ALL_QUESTIONS[grade][id])).map(q => [q.id, q]));
const ACTIVE_IDS = Object.fromEntries([1, 2, 3].map(grade => [grade, Object.fromEntries(LEVEL_IDS.map(id => [id, new Set(ALL_QUESTIONS[grade][id].filter(q => q.id.startsWith(`g${grade}-`)).map(q => q.id))]))]));
const R2_IDS = Object.fromEntries(LEVEL_IDS.map(id => [id, new Set(LEGACY_GENERATED_QUESTIONS[id].map(q => q.id))]));
const gradeOf = q => q.grade ?? 1;
export function questionKey(q) {
  const prefix = gradeOf(q) === 1 ? '' : `g${q.grade}:`;
  if (q.kind === 'cards') return `${prefix}cards:${q.pickCount}:${q.target}:${q.deck.join(',')}`;
  if (q.kind === 'chain') return `${prefix}chain:${q.terms[0]}${q.ops[0]}${q.terms[1]}${q.ops[1]}${q.terms[2]}`;
  return `${prefix}${q.a}${q.op}${q.b}:${q.blank}`;
}
// Semantic identity ignores choice order, decks, story wording and level.
export function questionSignature(q) {
  const prefix = `g${gradeOf(q)}:`;
  if (q.kind === 'cards') return `${prefix}cards:${q.pickCount}:${q.target}`;
  if (q.kind === 'chain') {
    if (q.ops.every(op => op === '+')) return `${prefix}chain:add:${[...q.terms].sort((a,b) => a-b).join(',')}`;
    return `${prefix}chain:${q.terms[0]}${q.ops[0]}${q.terms[1]}${q.ops[1]}${q.terms[2]}`;
  }
  const blank = q.blank ?? 'result';
  if (q.op === '+') {
    if (blank === 'result') return `${prefix}add:${[q.a,q.b].sort((a,b)=>a-b).join(',')}:result`;
    return `${prefix}add:missing:${blank === 'a' ? q.b : q.a}:${q.result}`;
  }
  return `${prefix}sub:${q.a}:${q.b}:${blank}`;
}
const KEY_SIGNATURES = Object.fromEntries([1,2,3].map(grade => [grade,Object.fromEntries(LEVEL_IDS.map(id => [id,new Map(ALL_QUESTIONS[grade][id].map(q => [questionKey(q), questionSignature(q)]))]))]));
const ALL_SIGNATURES = Object.fromEntries([1,2,3].map(grade => [grade,new Set(LEVEL_IDS.flatMap(id => ALL_QUESTIONS[grade][id]).map(questionSignature))]));
function seenQuestions(state) {
  const seen = new Set(state.seenQuestionSignatures ?? []);
  for (const [id, stage] of state.questionCycle ? [] : Object.entries(state.stages)) {
    for (const r of stage.recent) { const q = BANK.get(r.questionId); if (q) seen.add(questionSignature(q)); }
    for (const key of stage.readyQuestionKeys) {
      const signature = KEY_SIGNATURES[state.grade ?? 1][id].get(key);
      if (signature) seen.add(signature);
    }
  }
  for (const q of state.session?.questions ?? []) seen.add(questionSignature(q));
  return seen;
}
export class QuestionPoolExhaustedError extends Error {
  constructor() { super('这一档的新题已练完，请选择其他难度或明确开始新一轮。'); this.name='QuestionPoolExhaustedError'; this.code='QUESTION_POOL_EXHAUSTED'; }
}
// Explicit user action only; retain rewards, totals and current journey.
export function resetQuestionCycle(state) {
  state.seenQuestionSignatures = (state.session?.questions ?? []).map(questionSignature);
  state.questionCycle = (state.questionCycle ?? 0) + 1;
}
const KNOWN_KEYS = Object.fromEntries([1, 2, 3].map(grade => [grade, Object.fromEntries(LEVEL_IDS.map(id => [id, new Set(ALL_QUESTIONS[grade][id].map(questionKey))]))]));
const copyQuestion = (q, review = q.review) => {
  const copy = {...q, review};
  for (const key of ['choices', 'deck', 'solutions', 'terms', 'ops']) if (q[key]) copy[key] = [...q[key]];
  return copy;
};
export const isCorrectAnswer = (q, choice) => Boolean(q && Number.isInteger(choice)
  && (q.kind === 'cards' ? q.solutions.includes(choice) : choice === q.answer));
const maxAttempts = q => q.choices.filter(choice => !isCorrectAnswer(q, choice)).length + 1;
const increment = n => Math.min(n + 1, MAX_COUNT);

export function createState(grade = 1) {
  getLevels(grade);
  return { version: VERSION, grade, completedQuestions: 0, rounds: 0, cards: [], stages: {},
    settings: { sound: false, motion: 'system' }, session: null };
}

function createStage() {
  return { independent: 0, supported: 0, completedRounds: 0, visits: 0, reviewCursor: 0,
    ready: false, steady: false, needReview: false, readyAt: null, readyRound: null,
    readyQuestionKeys: [], lastSeenAt: null, lastRound: null, lastQuestionId: null, recent: [] };
}

export function stageStatus(state, id) {
  const stage = state?.stages?.[id];
  if (!stage) return 'new';
  if (stage.steady) return 'steady';
  if (stage.ready) return 'ready';
  return stage.visits > 0 || stage.independent + stage.supported > 0 ? 'practicing' : 'new';
}

function reviewFor(state, levelId, roundId, group, avoid = new Set()) {
  const groupKeys = new Set([...group.map(questionKey), ...avoid]);
  const candidates = LEVEL_IDS.filter(id => id <= levelId).filter(id => {
    const stage = state.stages[id];
    return stage && stage.lastSeenAt !== null && stage.lastRound < roundId
      && state.completedQuestions + 3 - stage.lastSeenAt >= 3;
  }).sort((a, b) => {
    const x = state.stages[a]; const y = state.stages[b];
    const priority = s => s.needReview ? 0 : s.ready && !s.steady ? 1 : 2;
    return priority(x) - priority(y) || x.lastSeenAt - y.lastSeenAt || a - b;
  });
  for (const id of candidates) {
    const stage = state.stages[id];
    const recentKeys = new Set(stage.recent.slice(-3).map(r => questionKey(BANK.get(r.questionId))));
    const available = getDifficultyBank(state.grade ?? 1, id, state.difficulty ?? 'standard').filter(q => !q.story && (q.kind !== 'equation' || (q.a > 0 && q.b > 0)) && !groupKeys.has(questionKey(q))
      && !avoid.has(questionSignature(q))
      && !stage.readyQuestionKeys.includes(questionKey(q))
      && !recentKeys.has(questionKey(q)));
    if (!available.length) continue;
    const q = available[stage.reviewCursor % available.length];
    stage.reviewCursor = increment(stage.reviewCursor);
    return { question: copyQuestion(q, true), evidence: {
      levelId: id, anchorAt: stage.lastSeenAt, anchorRound: stage.lastRound,
      questionKey: questionKey(q),
    } };
  }
  return { question: copyQuestion(group[3], true), evidence: null };
}

function shuffle(values, rng) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}

export function beginSession(state, id, options = {}) {
  const grade = state.grade ?? 1;
  getLevels(grade);
  if (!LEVEL_IDS.includes(id)) throw new RangeError('Unknown level');
  const supplied = typeof options === 'function' ? options : options?.rng ?? Math.random;
  if (typeof supplied !== 'function') throw new TypeError('rng must be a function');
  const rng = () => {
    const value = supplied();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('rng must return a number in [0, 1)');
    return value;
  };
  const stage = state.stages[id] ?? createStage();
  const difficulty = options?.difficulty ?? state.difficulty ?? 'standard';
  if (!DIFFICULTIES.includes(difficulty)) throw new RangeError('Unknown difficulty');
  const groupIndex = stage.visits % QUESTIONS[id].length;
  const previous = seenQuestions(state);
  const used = new Set(), targets = [];
  const take = (pool, count = 1, optional = false) => {
    const distinct = new Map();
    for (const q of pool) if (!used.has(questionSignature(q)) && !previous.has(questionSignature(q))) distinct.set(questionSignature(q), q);
    const picked = shuffle([...distinct.values()], rng).slice(0, count);
    if (picked.length !== count && !optional) throw new QuestionPoolExhaustedError();
    picked.forEach(q => { used.add(questionSignature(q)); targets.push(q); });
    return picked;
  };
  const bank = getDifficultyBank(grade, id, difficulty).filter(q => q.kind !== 'equation' || (q.a > 0 && q.b > 0));
  // Add/subtract always appear, including levels whose original focus was one operation.
  const operationPool = op => {
    const native = bank.filter(q => q.kind === 'equation' && !q.story && q.op === op && !q.id.includes('-r4-'));
    return difficulty === 'standard' && native.some(q => !previous.has(questionSignature(q))) ? native : bank.filter(q => q.kind === 'equation' && !q.story && q.op === op);
  };
  take(operationPool('+'));
  take(operationPool('-'));
  take(bank.filter(q => q.kind === 'cards' && q.pickCount === 2), 1, true);
  if (difficulty !== 'easy') {
    take(bank.filter(q => q.story), 1, true);
    if (id >= 5 && !targets.some(q => q.kind === 'chain')) take(bank.filter(q => q.kind === 'chain' && !q.story), 1, true);
    if (id >= 5 && targets.length < 5 && rng() < 0.5) take(bank.filter(q => q.kind === 'cards' && q.pickCount === 3), 1, true);
  }
  const equations = bank.filter(q => q.kind === 'equation' && !q.story);
  const nativeEquations = equations.filter(q => !q.id.includes('-r4-'));
  const nativeFresh = new Set(nativeEquations.filter(q => !used.has(questionSignature(q)) && !previous.has(questionSignature(q))).map(questionSignature));
  const missing = 6 - targets.length;
  take(difficulty === 'standard' && nativeFresh.size >= missing ? nativeEquations : equations, missing);
  const fallback = targets.pop();
  const ordered = shuffle(targets, rng).map(q => {
    const copy = copyQuestion(q, false);
    if (copy.kind !== 'cards') copy.choices = shuffle(copy.choices, rng);
    return copy;
  });
  const reviewChoiceOrder = shuffle([0, 1, 2, 3], rng);
  const group = [ordered[0], ordered[1], ordered[2], fallback, ordered[3], ordered[4]];
  state.stages[id] = stage;
  state.grade = grade;
  state.rounds = increment(state.rounds);
  state.difficulty = difficulty;
  const review = reviewFor(state, id, state.rounds, group, new Set([...previous, ...used]));
  if (review.question.kind !== 'cards') review.question.choices = reviewChoiceOrder.map(index => review.question.choices[index]);
  stage.visits = increment(stage.visits);
  state.session = { grade, levelId: id, roundId: state.rounds, mode: 'random-v4', difficulty, fallbackId: fallback.id, groupIndex, index: 0,
    questions: group.map((q, index) => index === 3 ? review.question : q),
    results: [], assisted: false, attempts: 0, carriedAttempts: 0, wrongChoices: [], feedback: null,
    completed: false, reviewEvidence: review.evidence };
  state.seenQuestionSignatures = [...new Set([...previous, ...state.session.questions.map(questionSignature)])];
  return state.session;
}

export function currentQuestion(state) {
  const session = state?.session;
  return session && !session.completed ? session.questions[session.index] : null;
}

export function markHint(state) {
  const session = state?.session;
  if (session && !session.completed && !session.feedback?.correct) {
    session.assisted = true;
    const stage = state.stages[session.questions[session.index].levelId];
    stage.needReview = true;
    stage.steady = false;
  }
}

function isSpacedIndependentReview(state, q, result, stage) {
  const evidence = state.session.reviewEvidence;
  return q.review && result.independent && evidence && evidence.levelId === q.levelId
    && evidence.questionKey === questionKey(q)
    && evidence.anchorRound < result.roundId
    && result.sequence - evidence.anchorAt - 1 >= 3
    && stage.ready && stage.readyRound < result.roundId
    && result.sequence - stage.readyAt - 1 >= 3
    && !stage.readyQuestionKeys.includes(questionKey(q));
}

export function submitAnswer(state, choice) {
  const session = state?.session;
  const q = currentQuestion(state);
  if (!q || session.feedback?.correct || !Number.isInteger(choice)
    || !q.choices.includes(choice) || session.wrongChoices.includes(choice)) {
    return { correct: Boolean(session?.feedback?.correct), ignored: true };
  }
  session.attempts += 1;
  if (!isCorrectAnswer(q, choice)) {
    session.wrongChoices.push(choice);
    // The UI exposes an explanation after an error; retries cannot become
    // independent evidence, including after a page reload.
    markHint(state);
    session.feedback = { correct: false };
    return { correct: false };
  }
  session.feedback = { correct: true };
  const totals=answerTotals(state);
  state.answerStats={firstTry:totals.firstTry,retried:totals.retried,unknown:totals.unknown};
  state.answerStats[session.attempts+(session.carriedAttempts||0)===1?'firstTry':'retried']+=1;
  state.completedQuestions = increment(state.completedQuestions);
  const result = { questionId: q.id, levelId: q.levelId, review: q.review, correct: true,
    choice, independent: !session.assisted && session.attempts + (session.carriedAttempts || 0) === 1,
    assisted: session.assisted, attempts: session.attempts + (session.carriedAttempts || 0),
    sequence: state.completedQuestions, roundId: session.roundId };
  if (session.carriedAttempts) result.carriedAttempts = session.carriedAttempts;
  session.results.push(result);
  const stage = state.stages[q.levelId] ?? (state.stages[q.levelId] = createStage());
  if (result.independent) stage.independent = increment(stage.independent);
  else {
    stage.supported = increment(stage.supported);
    stage.needReview = true;
    stage.steady = false;
  }
  if (isSpacedIndependentReview(state, q, result, stage)) {
    stage.steady = true;
    stage.needReview = false;
  } else if (q.review && result.independent && session.reviewEvidence
      && result.sequence - session.reviewEvidence.anchorAt - 1 >= 3) {
    stage.needReview = false;
  }
  stage.lastSeenAt = result.sequence;
  stage.lastRound = result.roundId;
  stage.lastQuestionId = q.id;
  stage.recent.push({ ...result });
  if (stage.recent.length > RECENT_LIMIT) stage.recent.splice(0, stage.recent.length - RECENT_LIMIT);
  return { correct: true };
}

export function advance(state) {
  const session = state?.session;
  if (!session) return { completed: false, newCard: false };
  if (session.completed) return { completed: true, newCard: false };
  if (!session.feedback?.correct) return { completed: false, newCard: false };
  if (session.index < session.questions.length - 1) {
    session.index += 1;
    session.assisted = false;
    session.attempts = 0;
    if ('carriedAttempts' in session) session.carriedAttempts = 0;
    session.wrongChoices = [];
    session.feedback = null;
    return { completed: false, newCard: false };
  }
  session.completed = true;
  const stage = state.stages[session.levelId];
  stage.completedRounds = increment(stage.completedRounds);
  const targets = session.results.filter(r => !r.review && r.levelId === session.levelId);
  if (!stage.ready && targets.length === 5 && targets.filter(r => r.independent).length >= 4) {
    stage.ready = true;
    stage.readyAt = state.completedQuestions;
    stage.readyRound = session.roundId;
    stage.readyQuestionKeys = targets.map(r => questionKey(BANK.get(r.questionId)));
  }
  const newCard = !state.cards.includes(session.levelId);
  if (newCard) state.cards.push(session.levelId);
  state.cards.sort((a, b) => a - b);
  return { completed: true, newCard };
}

function route(start, delta) {
  if (delta > 0) {
    const bridge = 10 - start % 10;
    if (bridge < delta && bridge < 10) return { start, deltas: [bridge, delta - bridge] };
  }
  if (delta < 0) {
    const ones = start % 10;
    if (ones > 0 && -delta > ones) return { start, deltas: [-ones, delta + ones] };
  }
  return { start, deltas: [delta] };
}

// These concise templates can be moved into a locale dictionary without
// changing question data. Every number line ends at the missing value.
export function explain(q, choice = q.answer) {
  if (q.kind === 'cards') {
    const mask = isCorrectAnswer(q, choice) ? choice : q.answer;
    const selected = q.deck.filter((n, index) => mask & (1 << index));
    return {headline: `选 ${q.pickCount} 张数字卡，合成 ${q.target}`,
      steps: ['每张卡只选一次，先找能搭成目标的小伙伴。', `${selected.join(' + ')} = ${q.target}。`, '能合成目标的合法组合都算。'],
      start: 0, deltas: selected, goal: q.target};
  }
  if (q.kind === 'chain') {
    const [a, b, c] = q.terms, [first, second] = q.ops;
    const middle = first === '+' ? a + b : a - b;
    return {headline: '从左到右，一步一步算',
      steps: [`${a} ${first === '-' ? '−' : '+'} ${b} = ${middle}。`, `${middle} ${second === '-' ? '−' : '+'} ${c} = ${q.result}。`],
      start: a, deltas: [first === '-' ? -b : b, second === '-' ? -c : c], goal: q.answer};
  }
  const symbol = q.op === '-' ? '−' : '+';
  const verify = `放回去看看：${q.a} ${symbol} ${q.b} = ${q.result}。`;
  if (q.blank !== 'result') {
    if (q.op === '+') {
      const known = q.blank === 'a' ? q.b : q.a;
      return { headline: '用整体找缺少的部分',
        steps: [`一共是 ${q.result}，知道的一部分是 ${known}。`, `${q.result} − ${known} = ${q.answer}。`, verify],
        ...route(q.result, -known) };
    }
    if (q.blank === 'a') return { headline: '把拿走的放回去',
      steps: [`还剩 ${q.result}，刚才拿走了 ${q.b}。`, `${q.result} + ${q.b} = ${q.answer}。`, verify],
      ...route(q.result, q.b) };
    return { headline: '用原来的数减去剩下的',
      steps: [`原来有 ${q.a}，现在还剩 ${q.result}。`, `${q.a} − ${q.result} = ${q.answer}。`, verify],
      ...route(q.a, -q.result) };
  }
  if (q.op === '+') {
    const base = Math.max(q.a, q.b); const add = Math.min(q.a, q.b);
    const line = route(base, add);
    if (add === 0) return { headline: '加 0，数量不变', steps: [`没有再放进来，还是 ${base}。`, `${base} + 0 = ${q.result}。`], ...line };
    if (line.deltas.length === 2) {
      const [first, rest] = line.deltas; const ten = base + first;
      return { headline: `先凑成 ${ten}，再加剩下的`,
        steps: [`把 ${add} 分成 ${first} 和 ${rest}。`, `${base} + ${first} = ${ten}。`, `${ten} + ${rest} = ${q.result}。`], ...line };
    }
    return { headline: '从较大的数接着数',
      steps: [`从 ${base} 出发，再向右走 ${add} 格。`, `${q.a} + ${q.b} = ${q.result}。`], ...line };
  }
  const line = route(q.a, -q.b);
  if (q.b === 0) return { headline: '减 0，数量不变', steps: [`没有拿走，还是 ${q.a}。`, `${q.a} − 0 = ${q.result}。`], ...line };
  if (q.a === q.b) return { headline: '全部拿走，还剩 0', steps: [`${q.a} 个全部拿走了。`, `${q.a} − ${q.b} = 0。`], ...line };
  if (line.deltas.length === 2) {
    const [first, rest] = line.deltas; const ten = q.a + first;
    return { headline: `先减到 ${ten}，再减剩下的`,
      steps: [`把 ${q.b} 分成 ${-first} 和 ${-rest}。`, `${q.a} − ${-first} = ${ten}。`, `${ten} − ${-rest} = ${q.result}。`], ...line };
  }
  return { headline: '看清拿走的，还剩多少',
    steps: [`从 ${q.a} 出发，向左走 ${q.b} 格。`, `${q.a} − ${q.b} = ${q.result}。`], ...line };
}

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const count = value => Number.isSafeInteger(value) && value >= 0 && value <= MAX_COUNT;
const requireValid = condition => { if (!condition) throw new Error('Invalid saved progress'); };
const boolean = value => typeof value === 'boolean';

function restoreResult(raw, completedQuestions, rounds, grade) {
  requireValid(isObject(raw));
  const q = BANK.get(raw.questionId);
  const carried = raw.carriedAttempts ?? 0;
  requireValid(q && gradeOf(q) === grade && raw.levelId === q.levelId && raw.correct === true && isCorrectAnswer(q, raw.choice)
    && boolean(raw.review) && boolean(raw.independent) && boolean(raw.assisted)
    && count(carried) && carried <= 19 && (!carried || (grade === 1 && raw.assisted))
    && Number.isInteger(raw.attempts) && raw.attempts >= carried + 1 && raw.attempts <= maxAttempts(q) + carried
    && raw.independent === (!raw.assisted && raw.attempts === 1)
    && (raw.attempts === 1 || raw.assisted)
    && count(raw.sequence) && raw.sequence > 0 && raw.sequence <= completedQuestions
    && count(raw.roundId) && raw.roundId > 0 && raw.roundId <= rounds);
  return { questionId: q.id, levelId: q.levelId, review: raw.review, correct: true, choice: raw.choice,
    ...(carried ? {carriedAttempts: carried} : {}),
    independent: raw.independent, assisted: raw.assisted, attempts: raw.attempts,
    sequence: raw.sequence, roundId: raw.roundId };
}

function restoreStage(raw, id, state) {
  requireValid(isObject(raw));
  const stage = createStage();
  for (const key of ['independent', 'supported', 'completedRounds', 'visits', 'reviewCursor']) {
    requireValid(count(raw[key])); stage[key] = raw[key];
  }
  for (const key of ['ready', 'steady', 'needReview']) {
    requireValid(boolean(raw[key])); stage[key] = raw[key];
  }
  requireValid(stage.visits > 0 && stage.completedRounds <= stage.visits && stage.visits <= state.rounds
    && stage.independent + stage.supported <= state.completedQuestions
    && stage.completedRounds * 5 <= stage.independent + stage.supported
    && (!stage.steady || (stage.ready && !stage.needReview)));
  requireValid(Array.isArray(raw.readyQuestionKeys) && raw.readyQuestionKeys.length === (stage.ready ? 5 : 0)
    && new Set(raw.readyQuestionKeys).size === raw.readyQuestionKeys.length
    && raw.readyQuestionKeys.every(key => KNOWN_KEYS[state.grade][id].has(key)));
  stage.readyQuestionKeys = [...raw.readyQuestionKeys];
  if (stage.ready) {
    requireValid(stage.completedRounds > 0 && stage.independent >= 4 && count(raw.readyAt) && raw.readyAt > 0 && raw.readyAt <= state.completedQuestions
      && count(raw.readyRound) && raw.readyRound > 0 && raw.readyRound <= state.rounds);
    stage.readyAt = raw.readyAt; stage.readyRound = raw.readyRound;
  } else requireValid(raw.readyAt === null && raw.readyRound === null);
  requireValid(Array.isArray(raw.recent) && raw.recent.length === Math.min(stage.independent + stage.supported, RECENT_LIMIT));
  stage.recent = raw.recent.map(result => restoreResult(result, state.completedQuestions, state.rounds, state.grade));
  requireValid(stage.recent.every((r, index) => r.levelId === id && (!index || r.sequence > stage.recent[index - 1].sequence))
    && stage.recent.filter(r => r.independent).length <= stage.independent
    && stage.recent.filter(r => !r.independent).length <= stage.supported);
  const last = stage.recent.at(-1);
  if (last) {
    requireValid(raw.lastSeenAt === last.sequence && raw.lastRound === last.roundId && raw.lastQuestionId === last.questionId);
    stage.lastSeenAt = last.sequence; stage.lastRound = last.roundId; stage.lastQuestionId = last.questionId;
  } else requireValid(raw.lastSeenAt === null && raw.lastRound === null && raw.lastQuestionId === null);
  return stage;
}

function restoreSession(raw, state) {
  const newest = raw?.mode === 'random-v4';
  const modern = raw?.mode === 'random-v3' || newest;
  const random = raw?.mode === 'random-v2' || modern;
  const migrated = modern && raw?.migration === 'unique-cards-v3';
  requireValid(isObject(raw) && LEVEL_IDS.includes(raw.levelId) && state.stages[raw.levelId]
    && (raw.mode === undefined || random)
    && (modern ? raw.grade === state.grade : state.grade === 1)
    && (raw.migration === undefined || migrated)
    && (!migrated || (state.grade === 1 && raw.legacyMode === 'random-v2'))
    && count(raw.roundId) && raw.roundId === state.rounds && raw.roundId > 0
    && Number.isInteger(raw.groupIndex) && raw.groupIndex >= 0 && raw.groupIndex < QUESTIONS[raw.levelId].length
    && raw.groupIndex === (state.stages[raw.levelId].visits - 1) % QUESTIONS[raw.levelId].length
    && Number.isInteger(raw.index) && raw.index >= 0 && raw.index < 6
    && boolean(raw.completed) && boolean(raw.assisted));
  requireValid(Array.isArray(raw.questions) && raw.questions.length === 6);
  const group = QUESTIONS[raw.levelId][raw.groupIndex];
  const questions = raw.questions.map((saved, index) => {
    requireValid(isObject(saved));
    const q = BANK.get(saved.id);
    const active = q && ACTIVE_IDS[state.grade][q.levelId].has(q.id);
    const legacy = q && state.grade === 1 && (R2_IDS[q.levelId].has(q.id) || QUESTIONS[q.levelId].flat().some(old => old.id === q.id));
    requireValid(q && gradeOf(q) === state.grade && saved.levelId === q.levelId && saved.review === (index === 3)
      && ['grade', 'story', 'kind', 'a', 'b', 'result', 'op', 'blank', 'answer', 'pickCount', 'target', 'extension'].every(key => saved[key] === q[key])
      && ['deck', 'solutions', 'terms', 'ops'].every(key => q[key] === undefined
        ? saved[key] === undefined : Array.isArray(saved[key]) && saved[key].length === q[key].length && saved[key].every((value, offset) => value === q[key][offset]))
      && Array.isArray(saved.choices) && saved.choices.length === q.choices.length
      && new Set(saved.choices).size === saved.choices.length
      && saved.choices.every((n, choiceIndex) => random && q.kind !== 'cards' ? q.choices.includes(n) : n === q.choices[choiceIndex])
      && (index === 3 ? q.levelId <= raw.levelId && (modern ? active || (migrated && legacy) : legacy) : random
        ? q.levelId === raw.levelId && (modern ? active || (migrated && R2_IDS[q.levelId].has(q.id)) : R2_IDS[q.levelId].has(q.id)) : q.id === group[index].id));
    const copy = copyQuestion(q, index === 3);
    copy.choices = [...saved.choices];
    return copy;
  });
  requireValid(new Set(questions.map(q => q.id)).size === 6 && new Set(questions.map(questionKey)).size === 6);
  if (random) {
    const targets = questions.filter(q => !q.review);
    const fallback = BANK.get(raw.fallbackId);
    requireValid(fallback && gradeOf(fallback) === state.grade && fallback.levelId === raw.levelId
      && (modern ? ACTIVE_IDS[state.grade][raw.levelId].has(fallback.id) || (migrated && R2_IDS[raw.levelId].has(fallback.id)) : R2_IDS[raw.levelId].has(fallback.id))
      && fallback.kind === 'equation' && !fallback.story && (modern || !fallback.extension)
      && (newest || targets.some(q => q.kind === 'cards' && q.pickCount === 2))
      && (newest || raw.levelId < 5 || targets.some(q => q.kind === 'chain'))
      && (modern || raw.levelId < 9 || targets.filter(q => q.extension).length === 1));
    if (modern) requireValid(questions.every((q, index) => index < raw.results.length || q.kind !== 'cards' || new Set(q.deck).size === 6));
  }
  let reviewEvidence = null;
  if (raw.reviewEvidence !== null) {
    const e = raw.reviewEvidence; const q = questions[3];
    requireValid(isObject(e) && e.levelId === q.levelId && state.stages[e.levelId]
      && count(e.anchorAt) && e.anchorAt > 0 && e.anchorAt <= state.completedQuestions
      && count(e.anchorRound) && e.anchorRound > 0 && e.anchorRound < raw.roundId
      && e.questionKey === questionKey(q));
    reviewEvidence = { levelId: e.levelId, anchorAt: e.anchorAt, anchorRound: e.anchorRound, questionKey: e.questionKey };
  } else requireValid(questions[3].id === (random ? raw.fallbackId : group[3].id));
  requireValid(Array.isArray(raw.results) && raw.results.length <= 6);
  const results = raw.results.map(r => restoreResult(r, state.completedQuestions, state.rounds, state.grade));
  requireValid(results.every((r, i) => r.questionId === questions[i].id && r.review === questions[i].review && r.roundId === raw.roundId
    && (!i || r.sequence === results[i - 1].sequence + 1)));
  requireValid(results.every(r => {
    const observation = state.stages[r.levelId]?.recent.find(saved => saved.sequence === r.sequence);
    return observation && Object.keys(r).every(key => observation[key] === r[key]);
  }));
  if (reviewEvidence) {
    const evidence = reviewEvidence;
    const beforeSession = state.completedQuestions - results.length;
    const anchor = state.stages[evidence.levelId].recent.filter(r => r.sequence <= beforeSession).at(-1);
    requireValid(anchor && anchor.sequence === evidence.anchorAt && anchor.roundId === evidence.anchorRound
      && evidence.anchorAt <= state.completedQuestions - results.length
      && questionKey(BANK.get(anchor.questionId)) !== evidence.questionKey);
  }
  const q = questions[raw.index];
  const carried = raw.carriedAttempts ?? 0;
  requireValid(count(carried) && carried <= 19 && (!carried || (modern && raw.assisted && migrated)));
  requireValid(Array.isArray(raw.wrongChoices) && raw.wrongChoices.length < maxAttempts(q)
    && new Set(raw.wrongChoices).size === raw.wrongChoices.length
    && raw.wrongChoices.every(n => Number.isInteger(n) && q.choices.includes(n) && !isCorrectAnswer(q, n)));
  const feedback = raw.feedback === null ? null : (() => {
    requireValid(isObject(raw.feedback) && boolean(raw.feedback.correct));
    return { correct: raw.feedback.correct };
  })();
  requireValid(raw.attempts === raw.wrongChoices.length + (feedback?.correct ? 1 : 0)
    && (raw.wrongChoices.length === 0 || raw.assisted)
    && (feedback !== null || raw.wrongChoices.length === 0)
    && (feedback?.correct !== false || raw.wrongChoices.length > 0)
    && results.length === raw.index + (feedback?.correct ? 1 : 0)
    && (!raw.completed || (raw.index === 5 && feedback?.correct && results.length === 6))
    && (!results.length || results.at(-1).sequence === state.completedQuestions));
  if (feedback?.correct) {
    const last = results.at(-1);
    requireValid(last.attempts === raw.attempts + carried && (last.carriedAttempts ?? 0) === carried && last.assisted === raw.assisted);
  }
  if (newest) requireValid(DIFFICULTIES.includes(raw.difficulty) && new Set(questions.map(questionSignature)).size === 6);
  return { ...(modern ? {grade: state.grade} : {}), ...(newest ? {difficulty:raw.difficulty} : {}), levelId: raw.levelId, roundId: raw.roundId,
    ...(random ? {mode: raw.mode, fallbackId: raw.fallbackId} : {}),
    ...(migrated ? {migration: 'unique-cards-v3', legacyMode: 'random-v2'} : {}), groupIndex: raw.groupIndex, index: raw.index,
    questions, results, assisted: raw.assisted, attempts: raw.attempts, ...(modern ? {carriedAttempts: carried} : {}), wrongChoices: [...raw.wrongChoices],
    feedback, completed: raw.completed, reviewEvidence };
}

function migratePendingCards(state) {
  const session = state.session;
  if (!session || session.completed) return state;
  let changed = false;
  const used = new Set(session.questions.map(questionKey));
  for (let index = Math.max(session.index, session.results.length); index < session.questions.length; index += 1) {
    const old = session.questions[index];
    if (old.kind !== 'cards' || new Set(old.deck).size === 6) continue;
    const candidates = GRADE_QUESTIONS[state.grade][old.levelId].filter(q => q.kind === 'cards' && q.pickCount === old.pickCount && !used.has(questionKey(q)));
    candidates.sort((a, b) => Math.abs(a.target - old.target) - Math.abs(b.target - old.target) || a.id.localeCompare(b.id));
    const replacement = candidates[0];
    if (!replacement) throw new Error('No safe unique-card replacement');
    const next = copyQuestion(replacement, old.review);
    session.questions[index] = next;
    used.add(questionKey(next));
    if (index === 3 && session.reviewEvidence) session.reviewEvidence.questionKey = questionKey(next);
    if (session.fallbackId === old.id) session.fallbackId = next.id;
    if (index === session.index) {
      session.carriedAttempts = (session.carriedAttempts || 0) + session.attempts;
      session.assisted = session.assisted || session.carriedAttempts > 0;
      session.attempts = 0; session.wrongChoices = []; session.feedback = null;
    }
    changed = true;
  }
  if (changed) {
    session.grade = state.grade;
    session.legacyMode = session.mode;
    session.mode = 'random-v3';
    session.migration = 'unique-cards-v3';
    session.carriedAttempts ??= 0;
  }
  return state;
}

export function hydrate(input, options = {}) {
  const grade = options?.grade ?? 1;
  getLevels(grade);
  try {
    // Reject unusually large inputs before parsing. Semantic history is finite;
    // completed observations still retain at most 12 entries per skill.
    if (typeof input === 'string' && input.length > 2_000_000) return createState(grade);
    const raw = typeof input === 'string' ? JSON.parse(input) : input;
    requireValid(isObject(raw) && raw.version === VERSION && (raw.grade ?? 1) === grade
      && (raw.grade !== undefined || grade === 1) && count(raw.completedQuestions) && count(raw.rounds));
    const state = createState(grade);
    state.completedQuestions = raw.completedQuestions; state.rounds = raw.rounds;
    requireValid(isObject(raw.settings) && boolean(raw.settings.sound)
      && ['system', 'reduce', 'full'].includes(raw.settings.motion));
    state.settings = { sound: raw.settings.sound, motion: raw.settings.motion };
    requireValid(isObject(raw.stages) && Object.keys(raw.stages).length <= 10);
    for (const key of Object.keys(raw.stages)) {
      const id = Number(key);
      requireValid(LEVEL_IDS.includes(id) && key === String(id));
      state.stages[id] = restoreStage(raw.stages[key], id, state);
    }
    const stages = Object.values(state.stages);
    requireValid(stages.reduce((sum, s) => sum + s.independent + s.supported, 0) === state.completedQuestions
      && stages.reduce((sum, s) => sum + s.visits, 0) === state.rounds);
    const recent = stages.flatMap(s => s.recent);
    requireValid(new Set(recent.map(r => r.sequence)).size === recent.length);
    requireValid(Array.isArray(raw.cards) && raw.cards.length <= 10 && new Set(raw.cards).size === raw.cards.length
      && raw.cards.every(id => LEVEL_IDS.includes(id) && state.stages[id]?.completedRounds > 0)
      && LEVEL_IDS.every(id => !state.stages[id]?.completedRounds || raw.cards.includes(id)));
    state.cards = [...raw.cards].sort((a, b) => a - b);
    state.session = raw.session === null ? null : restoreSession(raw.session, state);
    if (Object.hasOwn(raw,'answerStats')) {
      const totals=answerTotals({...state,answerStats:raw.answerStats});
      state.answerStats={firstTry:totals.firstTry,retried:totals.retried,unknown:totals.unknown};
    }
    if (raw.difficulty !== undefined) { requireValid(DIFFICULTIES.includes(raw.difficulty)); state.difficulty=raw.difficulty; }
    if (raw.questionCycle !== undefined) { requireValid(count(raw.questionCycle)); state.questionCycle=raw.questionCycle; }
    if (raw.seenQuestionSignatures !== undefined) {
      requireValid(Array.isArray(raw.seenQuestionSignatures) && raw.seenQuestionSignatures.length <= ALL_SIGNATURES[grade].size
        && new Set(raw.seenQuestionSignatures).size === raw.seenQuestionSignatures.length
        && raw.seenQuestionSignatures.every(key => ALL_SIGNATURES[grade].has(key)));
      state.seenQuestionSignatures=[...raw.seenQuestionSignatures];
    }
    // No object from the caller is retained; unknown fields are intentionally
    // absent. This is input validation, not anti-cheat or a learning diagnosis.
    return options?.preserveQuestions ? state : migratePendingCards(state);
  } catch {
    return createState(grade);
  }
}

export const legacyLookup = id => BANK.get(id);

export const legacySeen = state => [...seenQuestions(state)];
