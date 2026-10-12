// Legacy authored facts retain their IDs, answers and choice order for v1 saves.
// Tuple: [a, operation, b, optional blank]. The fourth slot of each group is
// a transfer fallback; the engine may replace it with a spaced review.
const metadata = [
  [1, '萤火草地', '5 以内数量合分', 5, '萤火星', 'fireflies', '#DDB65D', false],
  [2, '花朵小径', '从较大数接着数', 10, '开花术', 'flowers', '#DE96A6', false],
  [3, '月亮池塘', '拿走多少，还剩多少', 10, '月光波', 'ripples', '#91B4D1', false],
  [4, '十格小桥', '找到补成 10 的伙伴', 10, '彩虹桥', 'rainbow', '#B798D0', false],
  [5, '双十温室', '一个十和几个一', 20, '藤蔓术', 'vines', '#83AA90', false],
  [6, '凑十风车', '先凑成十，再加剩下的', 20, '旋风花', 'wind', '#DAAE71', false],
  [7, '拆十山洞', '先减到十，再减剩下的', 20, '水晶光', 'crystals', '#A099CC', false],
  [8, '回声树屋', '用加减关系找到缺少的数', 20, '星光树', 'star-tree', '#8BA990', false],
  [9, '云端花田', '50 以内不进位、不退位', 50, '云朵船', 'cloud-boat', '#94B7D1', true],
  [10, '极光山丘', '50 以内跨过整十数', 50, '极光幕', 'aurora', '#A1BFB5', true],
];

export const LEVELS = Object.freeze(metadata.map(([id, title, skill, baseMaxValue, cardName, spell, color, optional]) =>
  Object.freeze({ id, title, skill, range: id >= 9 ? '50 以内 · 三位数挑战' : `${baseMaxValue} 以内`,
    maxValue: id >= 9 ? 500 : baseMaxValue, baseMaxValue, cardName, spell, color, optional })));

const facts = {
  1: [
    [[1, '+', 1], [2, '+', 1], [3, '-', 1], [4, '-', 2], [2, '+', 2], [5, '-', 1]],
    [[1, '+', 3], [4, '-', 1], [2, '+', 3], [5, '-', 2], [0, '+', 4], [3, '-', 3]],
    [[0, '+', 2], [1, '+', 4], [5, '-', 3], [4, '-', 4], [3, '+', 2], [5, '-', 0]],
  ],
  2: [
    [[4, '+', 2], [5, '+', 3], [6, '+', 1], [2, '+', 5], [3, '+', 6], [7, '+', 0]],
    [[3, '+', 4], [2, '+', 6], [5, '+', 4], [4, '+', 5], [1, '+', 8], [0, '+', 9]],
    [[6, '+', 3], [2, '+', 8], [7, '+', 1], [1, '+', 9], [4, '+', 4], [9, '+', 0]],
  ],
  3: [
    [[7, '-', 2], [6, '-', 2], [8, '-', 1], [5, '-', 2], [9, '-', 9], [10, '-', 0]],
    [[6, '-', 4], [8, '-', 5], [9, '-', 6], [7, '-', 4], [10, '-', 10], [4, '-', 0]],
    [[10, '-', 2], [9, '-', 2], [8, '-', 2], [7, '-', 7], [6, '-', 0], [5, '-', 5]],
  ],
  4: [
    [[6, '+', 4, 'b'], [7, '+', 3, 'b'], [8, '+', 2, 'b'], [4, '+', 6, 'b'], [5, '+', 5, 'b'], [3, '+', 7, 'b']],
    [[2, '+', 8, 'a'], [7, '+', 3, 'a'], [4, '+', 6, 'a'], [6, '+', 4, 'a'], [3, '+', 7, 'a'], [5, '+', 5, 'a']],
    [[2, '+', 8, 'b'], [1, '+', 9, 'b'], [9, '+', 1, 'b'], [8, '+', 2, 'a'], [10, '+', 0, 'b'], [10, '+', 0, 'a']],
  ],
  5: [
    [[12, '+', 3], [14, '+', 2], [17, '-', 4], [11, '+', 5], [18, '-', 6], [16, '-', 3]],
    [[13, '+', 4], [11, '+', 6], [19, '-', 5], [12, '+', 6], [15, '-', 2], [18, '-', 3]],
    [[10, '+', 8], [16, '+', 3], [19, '-', 8], [14, '+', 5], [20, '-', 10], [20, '+', 0]],
  ],
  6: [
    [[8, '+', 5], [7, '+', 4], [9, '+', 3], [6, '+', 5], [8, '+', 6], [7, '+', 5]],
    [[9, '+', 4], [6, '+', 6], [8, '+', 7], [5, '+', 6], [9, '+', 5], [7, '+', 6]],
    [[6, '+', 8], [5, '+', 8], [9, '+', 6], [4, '+', 7], [7, '+', 8], [8, '+', 9]],
  ],
  7: [
    [[13, '-', 5], [12, '-', 7], [14, '-', 8], [11, '-', 4], [15, '-', 6], [16, '-', 9]],
    [[11, '-', 6], [15, '-', 8], [13, '-', 9], [12, '-', 6], [17, '-', 9], [14, '-', 7]],
    [[12, '-', 9], [16, '-', 8], [11, '-', 8], [13, '-', 6], [14, '-', 9], [15, '-', 9]],
  ],
  8: [
    [[8, '+', 6, 'a'], [14, '-', 6, 'b'], [7, '+', 5, 'b'], [12, '-', 5, 'a'], [9, '+', 4, 'a'], [16, '-', 7, 'b']],
    [[6, '+', 7, 'b'], [15, '-', 8, 'a'], [8, '+', 9, 'a'], [17, '-', 9, 'b'], [5, '+', 8, 'b'], [18, '-', 9, 'a']],
    [[9, '+', 7, 'b'], [13, '-', 5, 'a'], [7, '+', 8, 'a'], [19, '-', 6, 'b'], [4, '+', 9, 'a'], [12, '-', 3, 'b']],
  ],
  9: [
    [[32, '+', 5], [46, '-', 3], [21, '+', 6], [34, '-', 2], [40, '+', 8], [28, '-', 4]],
    [[23, '+', 5], [37, '-', 6], [41, '+', 7], [45, '-', 4], [30, '+', 9], [49, '-', 8]],
    [[33, '+', 4], [48, '-', 6], [22, '+', 7], [36, '-', 5], [50, '-', 10], [40, '+', 10]],
  ],
  10: [
    [[28, '+', 7], [42, '-', 6], [36, '+', 8], [31, '-', 5], [27, '+', 6], [45, '-', 8]],
    [[19, '+', 6], [34, '-', 7], [38, '+', 5], [41, '-', 9], [26, '+', 8], [43, '-', 5]],
    [[29, '+', 8], [32, '-', 6], [37, '+', 9], [40, '-', 7], [18, '+', 7], [50, '-', 8]],
  ],
};

function choicesFor(answer, limit, ordinal) {
  const distractors = [answer + 1, answer - 1, answer + 2, answer - 2, answer + 10, answer - 10, 0, limit];
  const unique = [];
  for (const n of distractors) {
    if (n >= 0 && n <= limit && n !== answer && !unique.includes(n)) unique.push(n);
    if (unique.length === 3) break;
  }
  // Adjacent small numbers provide enough candidates even at either boundary.
  for (let n = 0; unique.length < 3; n += 1) if (n !== answer && !unique.includes(n)) unique.push(n);
  // Correct positions rotate independently of answer magnitude, and each group
  // distributes all four positions. There is no Math.random or hidden lottery.
  unique.splice(ordinal % 4, 0, answer);
  return Object.freeze(unique);
}

export const QUESTIONS = Object.freeze(Object.fromEntries(LEVELS.map(level => [level.id,
  Object.freeze(facts[level.id].map((group, groupIndex) => Object.freeze(group.map(([a, op, b, blank = 'result'], index) => {
    const result = op === '+' ? a + b : a - b;
    const answer = { a, b, result }[blank];
    return Object.freeze({
      id: `l${level.id}-g${groupIndex + 1}-q${index + 1}`,
      levelId: level.id, a, b, result, op, blank, answer,
      choices: choicesFor(answer, level.baseMaxValue, (level.id - 1) * 18 + groupIndex * 6 + index),
      review: index === 3,
    });
  }))))
])));

// A finite, deterministic v2 bank is rebuilt from these rules. Runtime sessions
// randomly sample known IDs; saved input cannot introduce an unknown problem.
function spread(rows, maximum) {
  if (rows.length <= maximum) return rows;
  return Array.from({length: maximum}, (_, index) => rows[Math.floor(index * rows.length / maximum)]);
}

function equationRows(level) {
  const rows = [], limit = level.baseMaxValue;
  for (let a = 0; a <= limit; a += 1) for (let b = 0; b <= limit; b += 1) for (const op of ['+', '-']) {
    const result = op === '+' ? a + b : a - b;
    if (result < 0 || result > limit) continue;
    let blanks = ['result'];
    switch (level.id) {
      case 2: if (op !== '+') continue; break;
      case 3: if (op !== '-') continue; break;
      case 4: if (op !== '+' || result !== 10) continue; blanks = ['a', 'b']; break;
      case 5:
        if (a < 10 || b > 10 || (op === '+' ? a % 10 + b % 10 >= 10 : a % 10 < b % 10)) continue;
        break;
      case 6: if (op !== '+' || a < 1 || a > 9 || b < 1 || b > 9 || result <= 10) continue; break;
      case 7: if (op !== '-' || a <= 10 || a >= 20 || b < 1 || b > 9 || a % 10 >= b) continue; break;
      case 8: blanks = ['a', 'b']; break;
      case 9:
        if (a < 10 || b < 1 || b > 9 || (op === '+' ? a % 10 + b >= 10 : a % 10 < b)) continue;
        break;
      case 10:
        if (a < 10 || b < 1 || b > 9 || (op === '+' ? a % 10 + b < 10 : a % 10 >= b)) continue;
        break;
    }
    blanks.forEach(blank => rows.push([a, op, b, blank, false]));
  }
  return spread(rows, 144);
}

function wideRows(level) {
  if (level.id < 9) return [];
  const rows = [], parts = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300];
  for (let a = 100; a <= 500; a += 10) for (const b of parts) for (const op of ['+', '-']) {
    const result = op === '+' ? a + b : a - b;
    if (result < 100 || result > 500) continue;
    if (level.id === 9 && (op === '+' ? a % 100 + b % 100 >= 100 : a % 100 < b % 100)) continue;
    rows.push([a, op, b, 'result', true]);
  }
  return spread(rows, 64);
}

function wideChoices(answer, ordinal) {
  const candidates = [answer + 10, answer - 10, answer + 100, answer - 100, 100, 200, 300, 400, 500];
  const values = [];
  for (const n of candidates) {
    if (n >= 100 && n <= 500 && n !== answer && !values.includes(n)) values.push(n);
    if (values.length === 3) break;
  }
  values.splice(ordinal % 4, 0, answer);
  return Object.freeze(values);
}

function equation(level, row, ordinal) {
  const [a, op, b, blank, extension] = row;
  const result = op === '+' ? a + b : a - b;
  const answer = {a, b, result}[blank];
  return Object.freeze({id: `r2-l${level.id}-e-${a}-${op === '+' ? 'add' : 'sub'}-${b}-${blank}${extension ? '-wide' : ''}`,
    levelId: level.id, kind: 'equation', a, op, b, blank, result, answer, extension,
    choices: extension ? wideChoices(answer, ordinal) : choicesFor(answer, level.baseMaxValue, ordinal), review: false});
}

function masksFor(count, length = 6) {
  const masks = [];
  for (let mask = 1; mask < 2 ** length; mask += 1) {
    let bits = mask, selected = 0;
    while (bits) { selected += bits & 1; bits >>>= 1; }
    if (selected === count) masks.push(mask);
  }
  return Object.freeze(masks);
}

const TWO_MASKS = masksFor(2), THREE_MASKS = masksFor(3);
function cardProblem(level, parts, variant = 0) {
  const pickCount = parts.length;
  const deck = pickCount === 2
    ? [parts[0], parts[1], parts[0], parts[1], (parts[0] + variant + 1) % level.baseMaxValue + 1, (parts[1] + variant + 2) % level.baseMaxValue + 1]
    : [...parts, ...parts];
  const target = parts.reduce((sum, n) => sum + n, 0);
  const choices = pickCount === 2 ? TWO_MASKS : THREE_MASKS;
  const solutions = choices.filter(mask => deck.reduce((sum, n, index) => sum + ((mask & (1 << index)) ? n : 0), 0) === target);
  return Object.freeze({id: `r2-l${level.id}-c-${pickCount}-${parts.join('-')}-${variant}`,
    levelId: level.id, kind: 'cards', deck: Object.freeze(deck), pickCount, target, result: target,
    solutions: Object.freeze(solutions), answer: solutions[0], choices, blank: 'result', review: false});
}

function cardBank(level) {
  const pairs = [], triples = [], limit = level.baseMaxValue;
  for (let a = 1; a < limit; a += 1) for (let b = a; a + b <= limit; b += 1) pairs.push([a, b]);
  if (level.id >= 5) for (let a = 1; a < limit; a += 1) for (let b = a; a + b < limit; b += 1) {
    for (let c = b; a + b + c <= limit; c += 1) triples.push([a, b, c]);
  }
  return [
    ...spread(pairs, 24).flatMap(parts => [0, 1, 2].map(variant => cardProblem(level, parts, variant))),
    ...spread(triples, 64).map(parts => cardProblem(level, parts)),
  ];
}

function chainBank(level) {
  if (level.id < 5) return [];
  const rows = [], limit = level.baseMaxValue;
  for (let a = 0; a <= limit; a += 1) for (let b = 1; b <= 9; b += 1) for (let c = 1; c <= 9; c += 1) {
    for (const first of ['+', '-']) for (const second of ['+', '-']) {
      const middle = first === '+' ? a + b : a - b;
      const result = second === '+' ? middle + c : middle - c;
      if (middle >= 0 && middle <= limit && result >= 0 && result <= limit) rows.push([a, first, b, second, c]);
    }
  }
  return spread(rows, 72).map(([a, first, b, second, c], ordinal) => {
    const middle = first === '+' ? a + b : a - b;
    const result = second === '+' ? middle + c : middle - c;
    return Object.freeze({id: `r2-l${level.id}-chain-${a}-${first === '+' ? 'add' : 'sub'}-${b}-${second === '+' ? 'add' : 'sub'}-${c}`,
      levelId: level.id, kind: 'chain', terms: Object.freeze([a, b, c]), ops: Object.freeze([first, second]),
      result, answer: result, blank: 'result', choices: choicesFor(result, limit, ordinal), review: false});
  });
}

export const LEGACY_GENERATED_QUESTIONS = Object.freeze(Object.fromEntries(LEVELS.map(level => [level.id,
  Object.freeze([
    ...equationRows(level).map((row, index) => equation(level, row, index)),
    ...wideRows(level).map((row, index) => equation(level, row, index)),
    ...cardBank(level), ...chainBank(level),
  ])
])));

const gradeSkills = {
  1: ['5 以内数量合分', '10 以内加法', '10 以内减法', '补成 10 的伙伴', '20 以内不进位、不退位', '20 以内凑十加法', '20 以内退位减法', '20 以内缺项', '50 以内组合挑战', '100 以内组合挑战'],
  2: ['两位数不进位加法', '两位数进位加法', '两位数不退位减法', '两位数退位减法', '100 以内连加', '100 以内连减', '100 以内缺项', '生活中的一步问题', '生活中的两步问题', '整百数衔接挑战'],
  3: ['三位数不进位加法', '三位数单次进位', '三位数连续进位', '三位数不退位减法', '三位数单次退位', '连续退位与跨 0', '三位数混合运算', '三位数缺项关系', '生活中的多步问题', '千以内及衔接挑战'],
};

export const GRADE_LEVELS = Object.freeze(Object.fromEntries([1, 2, 3].map(grade => [grade,
  Object.freeze(LEVELS.map(old => {
    const maximum = grade === 1 ? (old.id === 10 ? 100 : old.baseMaxValue)
      : grade === 2 ? (old.id === 10 ? 500 : 100) : (old.id >= 9 ? 1999 : 999);
    return Object.freeze({...old, grade, skill: gradeSkills[grade][old.id - 1],
      maxValue: maximum, baseMaxValue: maximum,
      range: grade === 2 && old.id === 10 ? '整百数 · 500 以内' : `${maximum} 以内`});
  }))
])));

export function getLevels(grade = 1) {
  if (![1, 2, 3].includes(grade)) throw new RangeError('Unknown grade');
  return GRADE_LEVELS[grade];
}

export function carryCount(a, b) {
  let carry = 0, count = 0;
  while (a || b || carry) {
    carry = a % 10 + b % 10 + carry >= 10 ? 1 : 0;
    count += carry; a = Math.floor(a / 10); b = Math.floor(b / 10);
  }
  return count;
}

export function borrowCount(a, b) {
  let borrow = 0, count = 0;
  while (a || b) {
    borrow = a % 10 - borrow - b % 10 < 0 ? 1 : 0;
    count += borrow; a = Math.floor(a / 10); b = Math.floor(b / 10);
  }
  return count;
}

function mix(index, salt) {
  let value = (index + Math.imul(salt, 2654435761)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 2246822507) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 3266489909) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function gradedRows(grade, level) {
  if (grade === 1) return spread(equationRows(level), 80);
  const rows = [], used = new Set(), id = level.id;
  for (let index = 0; index < 4096 && rows.length < 80; index += 1) {
    const x = mix(index * 2, grade * 100 + id), y = mix(index * 2 + 1, grade * 100 + id);
    let a, b, op, blanks = ['result'];
    if (grade === 2) {
      a = 10 + x % 90; b = 10 + y % 90;
      op = id <= 2 ? '+' : id <= 4 ? '-' : index % 2 ? '+' : '-';
      if (id === 10) { a = (1 + x % 5) * 100; b = (1 + y % 4) * 100; }
      if (id === 7) blanks = ['a', 'b'];
    } else {
      const maximum = id >= 9 ? 1499 : 999;
      a = 100 + x % (maximum - 99); b = 100 + y % (Math.min(maximum, 899) - 99);
      op = id <= 3 ? '+' : id <= 6 ? '-' : index % 2 ? '+' : '-';
      if (id === 6 && index % 2 === 0) a = (1 + x % 9) * 100 + y % 9;
      if (id === 8) blanks = ['a', 'b'];
    }
    const result = op === '+' ? a + b : a - b;
    if (result < 0 || result > level.maxValue) continue;
    const carries = carryCount(a, b), borrows = borrowCount(a, b);
    if (grade === 2 && ((id === 1 && carries) || (id === 2 && !carries) || (id === 3 && borrows) || (id === 4 && !borrows))) continue;
    if (grade === 3 && ((id === 1 && carries) || (id === 2 && carries !== 1) || (id === 3 && carries < 2)
      || (id === 4 && borrows) || (id === 5 && borrows !== 1) || (id === 6 && borrows < 2))) continue;
    for (const blank of blanks) {
      const key = `${a}:${op}:${b}:${blank}`;
      if (used.has(key)) continue;
      used.add(key); rows.push([a, op, b, blank]);
    }
  }
  return rows.slice(0, 80);
}

function activeChoices(answer, level, ordinal) {
  if (level.grade !== 2 || level.id !== 10) return choicesFor(answer, level.maxValue, ordinal);
  return Object.freeze(choicesFor(answer / 100, 5, ordinal).map(n => n * 100));
}

function activeEquation(grade, level, row, ordinal) {
  const [a, op, b, blank] = row, result = op === '+' ? a + b : a - b;
  const answer = {a, b, result}[blank];
  return Object.freeze({id: `g${grade}-r3-l${level.id}-e-${a}-${op === '+' ? 'add' : 'sub'}-${b}-${blank}`,
    grade, levelId: level.id, kind: 'equation', a, b, op, blank, result, answer,
    choices: activeChoices(answer, level, ordinal), review: false});
}

function uniqueDeck(target, pickCount, variant, maximum) {
  let parts;
  if (pickCount === 2) {
    const a = Math.min(Math.floor((target - 1) / 2), Math.floor(target / (3 + variant % 2)));
    parts = [a, target - a];
  } else {
    const a = Math.floor(target / 5) + variant % 3;
    const b = Math.floor(target / 3) + variant % 2;
    const c = target - a - b;
    parts = a < b && b < c ? [a, b, c] : [0, 1, target - 1];
  }
  const deck = [...parts];
  const start = Math.floor(target / (pickCount + 1)) + variant * 7;
  // At most six collisions: this is bounded even for the 1999-value profile.
  for (let index = 0; index < 12 && deck.length < 6; index += 1) {
    const number = (start + index) % (maximum + 1);
    if (!deck.includes(number)) deck.push(number);
  }
  const offset = variant % 6;
  return [...deck.slice(offset), ...deck.slice(0, offset)];
}

function uniqueCardBank(grade, level) {
  const unit = grade === 2 && level.id === 10 ? 100 : 1;
  const maximum = level.maxValue, units = maximum / unit, targets = unit === 100 ? [100, 200, 300, 400, 500] : grade === 1
    ? Array.from({length: maximum}, (_, index) => index + 1)
    : Array.from({length: 28}, (_, index) => Math.max(3, Math.floor((index + 1) * maximum / 29)));
  const rows = [];
  for (const target of [...new Set(targets)]) for (const pickCount of level.id >= 5 ? [2, 3] : [2]) {
    if (pickCount === 3 && target < 3 * unit) continue;
    const variants = units === 5 ? 6 : pickCount === 2 ? 2 : 1;
    for (let variant = 0; variant < variants; variant += 1) {
      const deck = uniqueDeck(target / unit, pickCount, variant, units).map(n => n * unit);
      const choices = pickCount === 2 ? TWO_MASKS : THREE_MASKS;
      const solutions = choices.filter(mask => deck.reduce((sum, n, index) => sum + ((mask & (1 << index)) ? n : 0), 0) === target);
      if (deck.length !== 6 || new Set(deck).size !== 6 || !solutions.length) throw new Error('Invalid unique card candidate');
      rows.push(Object.freeze({id: `g${grade}-r3-l${level.id}-c-${pickCount}-t${target}-v${variant}`,
        grade, levelId: level.id, kind: 'cards', deck: Object.freeze(deck), pickCount, target, result: target,
        solutions: Object.freeze(solutions), answer: solutions[0], choices, blank: 'result', review: false}));
    }
  }
  return rows;
}

function activeChainBank(grade, level) {
  if (level.id < 5) return [];
  const rows = [], used = new Set(), maximum = level.maxValue;
  for (let index = 0; index < 2048 && rows.length < 48; index += 1) {
    const x = mix(index * 3, grade * 500 + level.id), y = mix(index * 3 + 1, grade * 500 + level.id), z = mix(index * 3 + 2, grade * 500 + level.id);
    let a = grade === 3 ? 100 + x % (maximum - 99) : x % (maximum + 1);
    let b = 1 + y % (grade === 3 ? 399 : Math.min(30, maximum)), c = 1 + z % (grade === 3 ? 399 : Math.min(30, maximum));
    let first = index % 2 ? '+' : '-', second = index % 3 ? '-' : '+';
    if (grade === 2 && level.id === 5) first = second = '+';
    if (grade === 2 && level.id === 6) first = second = '-';
    if (grade === 2 && level.id === 10) { a = (1 + x % 5) * 100; b = (1 + y % 2) * 100; c = (1 + z % 2) * 100; }
    const middle = first === '+' ? a + b : a - b, result = second === '+' ? middle + c : middle - c;
    if (middle < 0 || middle > maximum || result < 0 || result > maximum) continue;
    const key = `${a}:${first}:${b}:${second}:${c}`;
    if (used.has(key)) continue;
    used.add(key);
    rows.push(Object.freeze({id: `g${grade}-r3-l${level.id}-chain-${a}-${first === '+' ? 'add' : 'sub'}-${b}-${second === '+' ? 'add' : 'sub'}-${c}`,
      grade, levelId: level.id, kind: 'chain', terms: Object.freeze([a, b, c]), ops: Object.freeze([first, second]),
      result, answer: result, blank: 'result', choices: activeChoices(result, level, rows.length), review: false}));
  }
  return rows;
}

function storyBank(grade, level, equations, chains) {
  if (grade === 1 || level.id < (grade === 2 ? 8 : 9)) return [];
  const sources = level.id >= 9 ? chains : equations.filter(q => q.blank === 'result');
  return sources.filter(q => !(q.kind === 'chain' ? q.terms : [q.a, q.b]).includes(q.answer)).slice(0, 12).map(q => {
    const story = q.kind === 'chain'
      ? `暖尾尾先收集 ${q.terms[0]} 颗星光，${q.ops[0] === '+' ? '又找到' : '送出'} ${q.terms[1]} 颗，接着${q.ops[1] === '+' ? '又找到' : '送出'} ${q.terms[2]} 颗。现在有多少颗？`
      : `暖尾尾有 ${q.a} 颗星光，${q.op === '+' ? '又收集' : '送出'} ${q.b} 颗。现在有多少颗？`;
    return Object.freeze({...q, id: `${q.id}-story`, story});
  });
}

export const GRADE_QUESTIONS = Object.freeze(Object.fromEntries([1, 2, 3].map(grade => [grade,
  Object.freeze(Object.fromEntries(getLevels(grade).map(level => {
    const equations = gradedRows(grade, level).map((row, ordinal) => activeEquation(grade, level, row, ordinal));
    const chains = activeChainBank(grade, level);
    if (equations.length < 8 || (level.id >= 5 && chains.length < 4)) throw new Error('Insufficient bounded grade bank');
    return [level.id, Object.freeze([...equations, ...uniqueCardBank(grade, level), ...chains, ...storyBank(grade, level, equations, chains)])];
  })))
])));

export const GENERATED_QUESTIONS = GRADE_QUESTIONS[1];
export function getQuestionBank(grade = 1, levelId = 1) {
  getLevels(grade);
  if (!GRADE_QUESTIONS[grade][levelId]) throw new RangeError('Unknown level');
  return GRADE_QUESTIONS[grade][levelId];
}
