import { icon, emblem } from './art.js';
import { LEVELS } from './curriculum.js';
import { galleryMarkup } from './album-gallery.js';

// Narrative is derived from earned cards. It never changes the learning state.
export const MISSIONS = Object.freeze({
  1: Object.freeze({ mission: '帮暖尾尾找回萤火星', goal: '把散落的星光送回草地，照亮我们的第一条小路。', completion: '是你帮我找回了萤火星！我们的夜路亮起来啦。' }),
  2: Object.freeze({ mission: '让沉睡的花朵醒来', goal: '一起收集开花魔力，让花朵小径重新绽放。', completion: '看！你带来的魔力，让我的花朵小径开满花啦。' }),
  3: Object.freeze({ mission: '把月光送回池塘', goal: '找到数字里的小秘密，帮池塘找回温柔的月光。', completion: '你把月光送回了池塘。今晚，花园又有一面小镜子啦。' }),
  4: Object.freeze({ mission: '接好通往花园的彩虹桥', goal: '帮数字找到伙伴，一起连起彩虹的两端。', completion: '彩虹桥连起来啦！是你帮我走到了花园的另一边。' }),
  5: Object.freeze({ mission: '唤醒温室里的小藤蔓', goal: '用一个十和几个一的魔力，让藤蔓爬上温室。', completion: '你让藤蔓伸出了新叶子！我们的温室又绿起来啦。' }),
  6: Object.freeze({ mission: '给花园风车装上魔力', goal: '先搭一座通往十的桥，让风车带着花瓣转起来。', completion: '风车转起来啦！你送来的魔力，吹到了每一朵花身边。' }),
  7: Object.freeze({ mission: '点亮山洞里的水晶', goal: '经过十，再往回走，一起找到水晶的光。', completion: '水晶被你点亮啦！我也能看清山洞里的路了。' }),
  8: Object.freeze({ mission: '唤醒我们的星光树屋', goal: '找回藏起来的数字，把前面的小发现送给星光树。', completion: '是你陪我完成了整座花园！星光树屋为我们亮起来啦。' }),
  9: Object.freeze({ mission: '一起乘上云朵船', goal: '想继续探险时，就帮暖尾尾把云朵船送上天空。', completion: '云朵船起航啦！谢谢你陪我看见更远的花田。' }),
  10: Object.freeze({ mission: '在山丘上拉开极光幕', goal: '跨过整十的小山丘，一起把最后一道极光送回天空。', completion: '极光亮起来啦！十张卡，记着我们一起完成的每一件事。' }),
});

export const TREASURE_THEMES = Object.freeze({
  starlight: Object.freeze({ name: '星光剧场', note: '你带回来的光，变成了满天星。', icon: 'star' }),
  blossom: Object.freeze({ name: '花瓣仙境', note: '每一朵花，都记着你帮过的忙。', icon: 'leaf' }),
  aurora: Object.freeze({ name: '极光秘境', note: '我们的魔法，已经飞到了天空。', icon: 'spark' }),
});

const clamp = (value, max) => Math.max(0, Math.min(max, Number(value) || 0));
const companionAsset = './assets/nuanweiwei-happy-safari.png';

export function companionMarkup(id = 1, { earned = 0, total = 6, solved = 0, variant = 'lesson' } = {}) {
  const mission = MISSIONS[id] || MISSIONS[1];
  const cards = clamp(earned, 10);
  const steps = Math.max(1, Math.min(6, Number(total) || 6));
  const gathered = clamp(solved, steps);
  if (variant === 'hero') {
    return `<aside class="story-companion story-hero" aria-label="你和暖尾尾的花园任务">
      <div class="story-portrait"><img src="${companionAsset}" alt="" width="318" height="240"></div>
      <div class="story-bubble"><span class="story-name">暖尾尾的邀请</span><strong>你来解开数字，我来让魔法发生！</strong><p>${cards ? `你已经让 ${cards} 个地方亮起来了。这里，也是你的花园。` : '花园的光散落了。你愿意陪我，一点点找回来吗？'}</p></div>
    </aside>`;
  }
  return `<aside class="story-companion ${gathered ? 'story-has-light' : ''}" aria-label="帮助暖尾尾完成这一站的任务">
    <div class="story-portrait"><img src="${companionAsset}" alt="" width="318" height="240"><span class="story-portrait-glow"></span></div>
    <div class="story-bubble"><span class="story-name">暖尾尾正在和你一起施法</span><strong>${mission.mission}</strong><p>${gathered === steps ? mission.completion : gathered ? '收到你的魔力啦！我们离点亮这里又近了一点。' : mission.goal}</p>
      <div class="story-energy"><span class="story-energy-label">送给暖尾尾的魔力 <b>${gathered} / ${steps}</b></span><div class="story-energy-pips companion-energy-target" role="img" aria-label="已经收集 ${gathered} 束魔力，共 ${steps} 束">${Array.from({ length: steps }, (_, i) => `<span class="story-energy-pip ${i < gathered ? 'story-lit' : ''}">${icon('spark')}</span>`).join('')}</div></div>
    </div>
  </aside>`;
}

export function treasureTeaserMarkup(earned = 0) {
  const count = clamp(earned, 10);
  const unlocked = count === 10;
  return `<section class="treasure-teaser ${unlocked ? 'treasure-ready' : ''}" aria-label="十张魔法卡的额外惊喜">
    <div class="treasure-teaser-icon">${icon('chest')}${icon('spark', 'treasure-teaser-spark')}</div>
    <div class="treasure-teaser-copy"><span class="treasure-kicker">和暖尾尾一起创造的惊喜</span><h2>${unlocked ? '秘密百宝箱，为你打开！' : '十张卡，藏着一个大惊喜'}</h2><p>${unlocked ? '你帮暖尾尾完成的每一件事，都会在这里闪闪发光。' : '8 张主线卡会点亮完整花园；想继续探险时，10 张卡还能打开百宝箱。'}</p><span class="treasure-teaser-count">${count} / 10 张魔法卡</span></div>
    ${unlocked ? `<button class="treasure-button treasure-primary" data-action="treasure">去开百宝箱${icon('arrow')}</button>` : '<span class="treasure-teaser-promise">星光舞 · 秘密展厅 · 守护者纪念章</span>'}
  </section>`;
}

const cardPositions = [
  [12, 48, -13], [16, 27, -9], [29, 15, -5], [42, 11, -2], [58, 11, 2],
  [71, 15, 5], [84, 27, 9], [88, 48, 13], [21, 70, -10], [79, 70, 10],
];

function treasureCards() {
  return LEVELS.map((l, i) => {
    const [x, y, tilt] = cardPositions[i];
    return `<div class="treasure-flying-card" style="--card-left:${x}%;--card-top:${y}%;--card-tilt:${tilt}deg;--flight-delay:${(0.18 + i * .12).toFixed(2)}s" aria-hidden="true">${emblem(l.id)}<span>${String(l.id).padStart(2, '0')}</span></div>`;
  }).join('');
}

function treasureParticles(theme) {
  return Array.from({ length: 26 }, (_, i) => {
    const x = 5 + (i * 17) % 90;
    const y = 8 + (i * 23) % 68;
    const kind = theme === 'blossom' && i % 5 === 0 ? emblem(2) : i % 4 === 0 ? icon('spark') : '';
    return `<i class="treasure-particle ${kind ? 'treasure-particle-symbol' : ''}" style="--particle-x:${x}%;--particle-y:${y}%;--particle-size:${4 + i % 4 * 2}px;--particle-drift:${i % 2 ? -20 : 20}px;--particle-turn:${i % 2 ? -22 : 22}deg">${kind}</i>`;
  }).join('');
}

export function guardianBadgeMarkup() {
  return `<div class="treasure-badge" role="img" aria-label="花园守护者纪念章：你和暖尾尾共同找回十种魔法">
    <span class="treasure-badge-ribbon treasure-badge-ribbon-left"></span><span class="treasure-badge-ribbon treasure-badge-ribbon-right"></span>
    <span class="treasure-badge-medal">${emblem(8)}<span>一起创造</span></span>
  </div>`;
}

export function treasureMarkup({ opened = false, finished = false, paused = false, theme = 'starlight', replay = false } = {}) {
  const selected = Object.hasOwn(TREASURE_THEMES, theme) ? theme : 'starlight';
  const current = TREASURE_THEMES[selected];
  const classes = ['treasure-view', `treasure-theme-${selected}`, opened ? 'opened' : '', finished ? 'finished' : '', paused ? 'paused' : '', replay ? 'treasure-replaying' : ''].filter(Boolean).join(' ');
  return `<section class="${classes}" aria-labelledby="treasure-title">
    <div class="treasure-heading"><div><p class="treasure-kicker">10 张魔法卡 · 你和暖尾尾一起创造</p><h1 id="treasure-title">${opened ? '我们的星光庆典' : '你的秘密百宝箱'}</h1><p>${opened ? '每一张卡，都记着你帮她完成的一件事。' : '你带回的十种魔法，藏着暖尾尾准备的惊喜。'}</p></div><button class="treasure-button treasure-back" data-action="nav" data-view="vault">${icon('back')}回宝藏库</button></div>
    <div class="treasure-stage" role="img" aria-label="${opened ? `十张魔法卡汇成${current.name}，暖尾尾为魔法伙伴表演星光舞` : '十张魔法卡已经集齐，秘密百宝箱正在等你亲手打开'}">
      <div class="treasure-backdrop" aria-hidden="true"></div><div class="treasure-moon" aria-hidden="true"></div>
      <div class="treasure-beams" aria-hidden="true"><span></span><span></span><span></span></div>
      <div class="treasure-constellation" aria-hidden="true">${treasureCards()}</div>
      <div class="treasure-floor" aria-hidden="true"><span></span><span></span><span></span></div>
      <div class="treasure-particles" aria-hidden="true">${treasureParticles(selected)}</div>
      <div class="treasure-chest" aria-hidden="true"><div class="treasure-chest-light"></div><div class="treasure-chest-lid"><span>${icon('spark')}</span></div><div class="treasure-chest-body"><span class="treasure-chest-lock">${icon(opened ? 'spark' : 'lock')}</span></div></div>
      <div class="treasure-dancer" aria-hidden="true"><img src="${companionAsset}" alt="" width="318" height="240"></div>
      <div class="treasure-dance-note" aria-hidden="true"><span class="treasure-note-start">十张卡，都是你带回来的光！</span><span class="treasure-note-dance">这段星光舞，跳给我的魔法伙伴！</span><span class="treasure-note-end">我们让整个花园亮起来啦！</span></div>
      ${!opened ? '<div class="treasure-chest-caption"><strong>是你帮我找回了十种魔法。</strong><span>现在，轮到我送你一份惊喜啦！</span></div>' : ''}
    </div>
    <div class="treasure-controls">${!opened ? `<button class="treasure-button treasure-primary treasure-open-button" data-action="treasure-open">亲手打开百宝箱${icon('chest')}</button>` : `<button class="treasure-button treasure-primary" data-action="treasure-pause" ${finished ? 'hidden' : ''} aria-pressed="${paused}">${icon(paused ? 'play' : 'pause')}${paused ? '继续星光舞' : '暂停一下'}</button><button class="treasure-button treasure-secondary" data-action="treasure-replay">${icon('reset')}再跳一次</button>`}</div>
    <p class="treasure-status" role="status">${!opened ? '宝箱准备好啦，点一下，让魔法开始。' : paused ? '星光舞停在这里，等你准备好。' : finished ? '庆典收好啦。你可以重看，也可以去秘密展厅。' : '十种魔法正在汇合。暖尾尾和你，一起点亮花园。'}</p>
    ${opened ? galleryMarkup() : ''}
    <section class="treasure-gallery" aria-labelledby="treasure-gallery-title"><div class="treasure-gallery-copy"><p class="treasure-kicker">百宝箱里的礼物</p><h2 id="treasure-gallery-title">你的秘密魔法展厅</h2><p>选一片天空，把我们的花园变成你喜欢的样子。</p><div class="treasure-theme-options" role="group" aria-label="选择秘密展厅的魔法场景">${Object.entries(TREASURE_THEMES).map(([key, item]) => `<button class="treasure-button treasure-theme-button ${key === selected ? 'treasure-theme-selected' : ''}" data-action="treasure-theme" data-theme="${key}" aria-pressed="${key === selected}">${icon(item.icon)}${item.name}</button>`).join('')}</div><p class="treasure-theme-note">${current.note}</p></div><div class="treasure-guardian">${guardianBadgeMarkup()}<h3>花园守护者</h3><p>这枚纪念章，属于你和暖尾尾。<br>谢谢你送回每一束光。</p><span class="treasure-guardian-label">十种魔法 · 一座共同的花园</span></div></section>
  </section>`;
}
