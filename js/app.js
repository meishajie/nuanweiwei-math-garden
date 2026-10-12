import { getLevels, getQuestionBank } from './curriculum.js';
import {createRewards, hydrateRewards, unlockForCards, creditCompletion, startPlay, getPlayStatus, recordCatch, finishPlay} from './play-rewards.js';
import {playRewardMarkup, starPlayMarkup, starPlayEndMarkup, createStarPlayController} from './star-play.js';
import {createProfiles, hydrateProfiles, syncSettings, selectGrade} from './profiles.js?v=20261012-3';
import { createState, hydrate, beginSession, currentQuestion, markHint, submitAnswer, advance, stageStatus, explain } from './engine.js?v=20261012-3';
import {columnMethod} from './column-method.js';
import { t, locale } from './i18n.js';
import { icon, emblem, magicArt } from './art.js';
import { MISSIONS, treasureMarkup, treasureTeaserMarkup } from './adventure.js';
import { getAlbum, albumDetailMarkup } from './album-gallery.js';
import { createEffects } from './effects.js';
import { createSoundPlayer } from './sounds.js?v=20261012-2';
import {roundSummaryMarkup,gardenSummaryMarkup} from './round-summary.js?v=20261012-3';
import {companionMarkup, createCharacterReactions} from './character-reactions.js';
import { requestImmersive, toggleFullscreen, getInstallHint, getImmersiveStatus, initImmersive } from './immersive.js?v=20261012-2';

const STORAGE_KEY = 'nuanweiwei.math-garden.v1';
const PROFILE_KEY = 'nuanweiwei.math-garden.profiles.v2';
const REWARD_KEY = 'nuanweiwei.star-play.v1';
const app = document.querySelector('#app');
const safe = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let storageIssue = '';
let profiles = createProfiles();
try {profiles=hydrateProfiles(localStorage.getItem(PROFILE_KEY),localStorage.getItem(STORAGE_KEY));}
catch {storageIssue=t.saveError;}
let state=profiles.grades[profiles.selectedGrade];
let rewards=createRewards(profiles.grades);
try {rewards=hydrateRewards(localStorage.getItem(REWARD_KEY),profiles.grades);}catch {storageIssue=t.saveError;}
let miniController=null;
const levels=()=>getLevels(state.grade||profiles.selectedGrade);
let view = 'home';
let selectedLevel = 1;
let hintMode = '';
let hintClosed = false;
let modal = '';
let modalReturnFocus = null;
let toastTimer;
let selectedAlbum = '';
let albumReturnId = '';
let cardSelection = 0;
let cardOrder=[];
let cardVisualKey='';
let cardVisualOrder=[];
let soundUnavailable = false;
let treasure = {opened:false,finished:false,paused:false,theme:'starlight',elapsed:0,last:0,frame:0};
let magic = {id:1,finale:false,paused:false,finished:false,elapsed:0,last:0,frame:0};
let characterController=null;
let characterQuestionKey='';
let pendingCharacterReaction=null;
const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
const reduceMotion = () => state.settings.motion === 'reduce' || (state.settings.motion === 'system' && systemMotion.matches);
const level = id => levels().find(item => item.id === Number(id)) || levels()[0];
const hasFinale = () => levels().filter(l => !l.optional).every(l => state.cards.includes(l.id));
const suggested = () => levels().find(l => !l.optional && !state.cards.includes(l.id))?.id || levels().find(l => !l.optional && state.stages[l.id]?.needReview)?.id || 1;
const hasPaused = () => state.session && !state.session.completed;
const hasTreasure = () => levels().every(l => state.cards.includes(l.id));
const effectsCanvas = document.createElement('canvas');
effectsCanvas.id='celebration-canvas'; effectsCanvas.setAttribute('aria-hidden','true');
document.body.append(effectsCanvas);
const effects = createEffects(effectsCanvas,{reducedMotion:reduceMotion});
const sounds = createSoundPlayer({enabled:()=>state.settings.sound,onUnavailable:()=>{
  if(!soundUnavailable)notify('点一下音乐按钮，再试着打开声音。');
  soundUnavailable=true;updateAudioDisplay();
}});
initImmersive();

function audioMessage(){
  const status=sounds.getStatus();
  if(!state.settings.sound)return '音乐已关闭，点“开启”可以听见花园。';
  if(!status.supported)return '这个浏览器暂时无法播放声音。';
  if(status.musicPlaying)return '轻柔的背景音乐正在播放。';
  if(status.needsGesture)return '点一下音乐按钮或“出发”，启动手机声音。';
  return '音乐已开启，回到旅程会继续播放。';
}
function updateAudioDisplay(){
  const target=document.querySelector('.audio-status');if(target)target.textContent=audioMessage();
}
function maintainMusic(){
  sounds.setEnabled(state.settings.sound,{unlock:false});
  if(!state.settings.sound)return;
  const paused=document.hidden||view==='rest'||(view==='magic'&&magic.paused)||(view==='treasure'&&treasure.paused);
  if(paused){sounds.pause();return;}
  sounds.resume({unlock:false});sounds.setMusicLevel(['reward','magic','treasure'].includes(view) ? 0.4 : modal ? 0.6 : 1);
  void sounds.startMusic({unlock:false}).then(updateAudioDisplay);
}
// AudioContext creation/resume runs in the trusted click, before async work.
document.addEventListener('click',event=>{
  if(!event.isTrusted||!state.settings.sound||!event.target.closest('button'))return;
  sounds.resume();
  void sounds.unlock();
  if(view!=='rest'&&!(view==='magic'&&magic.paused)&&!(view==='treasure'&&treasure.paused))void sounds.startMusic().then(updateAudioDisplay);
},{capture:true});

function save() {
  syncSettings(profiles,state.settings);profiles.grades[profiles.selectedGrade]=state;
  try {localStorage.setItem(REWARD_KEY,JSON.stringify(rewards));localStorage.setItem(PROFILE_KEY,JSON.stringify(profiles));localStorage.setItem(STORAGE_KEY,JSON.stringify(profiles.grades[1]));return true;}
  catch {storageIssue=t.saveError;return false;}
}
function applyMotion() { document.documentElement.dataset.motion = reduceMotion() ? 'reduce' : 'full'; }
function questionCharacterKey(){const q=currentQuestion(state);return view==='lesson'&&q?`${state.grade}:${state.session.roundId}:${state.session.index}:${q.id}`:'';}
function stopCharacter(){characterController?.destroy();characterController=null;characterQuestionKey='';}
function queueCharacterReaction(result){if(result.ignored)return;pendingCharacterReaction={mode:result.correct?'correct':'retry',key:`${questionCharacterKey()}:${state.session.wrongChoices.length}:${state.session.results.length}`};}
function installCharacter(key,oldElement){
  const host=document.querySelector('.question-companion');if(!host||!key)return;
  if(oldElement)host.replaceChildren(oldElement);
  const element=host.querySelector('[data-companion]');if(!element)return;
  if(!characterController)characterController=createCharacterReactions(element,{motion:()=>reduceMotion()?'reduce':'full'});
  characterQuestionKey=key;characterController.setMotion(()=>reduceMotion()?'reduce':'full');
  if(pendingCharacterReaction){characterController.react(pendingCharacterReaction.mode,{key:pendingCharacterReaction.key});pendingCharacterReaction=null;}
  if(modal||document.hidden)characterController.pause();else characterController.resume();
}
function stopMagic() { cancelAnimationFrame(magic.frame); magic.frame = 0; }
function stopTreasure() { cancelAnimationFrame(treasure.frame); treasure.frame=0; }
function go(next) {
  if(view==='mini'&&next!=='mini'){stopMini();rewards=finishPlay(rewards,Date.now(),'left');save();}
  stopMagic(); stopTreasure(); effects.stop(); sounds.stopEffects(); sounds.resume({unlock:false});effects.resume(); modal = ''; view = next;
  render({preserveScroll:false}); window.scrollTo({top:0,behavior:'instant'});
  document.querySelector('#main')?.focus({preventScroll:true});
}
function stopMini(){miniController?.destroy();miniController=null;sounds.stopEffects();effects.stop();}
function creditRound(){if(getPlayStatus(rewards).needsFinish){stopMini();rewards=finishPlay(rewards);save();}rewards=creditCompletion(rewards,{gradeId:state.grade||1,levelId:state.session.levelId,completedRound:state.stages[state.session.levelId].completedRounds});rewards=unlockForCards(rewards,state.grade||1,state.cards);}
function practiceStage(){const remaining=levels().filter(l=>!l.optional&&!rewards.progress.some(p=>p.gradeId===String(state.grade||1)&&p.levelId===l.id));return remaining.find(l=>state.stages[l.id]?.needReview)?.id||remaining.find(l=>!state.cards.includes(l.id))?.id||remaining[0]?.id||suggested();}
function miniShortcut(){if(!rewards.unlockedGrades.length)return '';const status=getPlayStatus(rewards);return `<button class="play-reward-shortcut" data-action="star-play-menu">${icon('spark')}<span>${status.status==='running'?'继续星光':status.canStart?'玩 1 分钟':'星光休息'}</span>${!status.canStart&&status.status!=='running'?`<span class="practice-progress" aria-label="三个不同地点已完成 ${rewards.progress.length}">${Array.from({length:3},(_,i)=>`<span class="practice-dot ${i<rewards.progress.length?'filled':''}">${icon('leaf')}</span>`).join('')}</span>`:''}</button>`;}
function miniMenu(){const status=getPlayStatus(rewards);if(status.status==='running')return `<section class="star-play-end"><h1>星光还在等你</h1><p>还剩 ${status.secondsLeft} 秒</p><button class="star-play-button star-play-primary" data-action="star-play-resume">接着玩${icon('play')}</button></section>`;if(!rewards.unlockedGrades.length)return `<section class="star-play-end"><h1>十张卡后的惊喜</h1><p>集齐十张魔法卡，就能帮暖尾尾接星光。</p><button class="star-play-button star-play-primary" data-action="nav" data-view="home">回花园${icon('arrow')}</button></section>`;return playRewardMarkup(rewards);}
function launchMini(){const prior=rewards;const next=startPlay(rewards,Date.now());if(next===rewards||!next.active)return;rewards=next;try{localStorage.setItem(REWARD_KEY,JSON.stringify(rewards));}catch{rewards=prior;notify('这里暂时保存不了小游戏次数，先回数学花园吧。');return;}save();void requestImmersive();go('mini');}
function installMini(){const el=document.querySelector('#mini-play');if(!el||!rewards.active)return;miniController=createStarPlayController(el,{play:rewards.active,settings:()=>({motion:reduceMotion()?'reduce':'full'}),onCatch:event=>{if(rewards.active?.id!==event.playId)return;rewards=recordCatch(rewards,event.playId,event.at);save();sounds.resume({unlock:false});effects.resume();void chime('correct');effects.burst('correct',{origin:document.querySelector('.star-play-character')});},onFinish:event=>{if(rewards.active?.id!==event.playId)return;stopMini();rewards=finishPlay(rewards,event.at);save();go('mini-end');}});if(modal)miniController.pause();}
function notify(message) {
  clearTimeout(toastTimer); document.querySelector('.toast')?.remove();
  const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role','status'); el.textContent = message;
  document.body.append(el); toastTimer = setTimeout(()=>el.remove(),3800);
}

function header() {
  if(view==='lesson')return '';
  const current = ['intro','lesson','reward','rest'].includes(view) ? 'home' : ['magic','treasure'].includes(view) ? 'vault' : view;
  return `<header class="site-header"><button class="brand" data-action="nav" data-view="home" aria-label="暖尾尾的数字魔法花园，回到首页"><span class="brand-mark">${icon('leaf')}</span><span class="brand-name">${t.shortTitle}<span class="brand-note">NUANWEIWEI’S LITTLE GARDEN</span></span></button>
  <nav class="main-nav" aria-label="主要导航">${[['home','map'],['vault','chest'],['grownups','book']].map(([name,symbol])=>`<button data-action="nav" data-view="${name}" ${current===name?'aria-current="page" class="active"':''}>${icon(symbol)}${t.nav[name]}${name==='vault'&&state.cards.length?` <span class="sr-only">已有 ${state.cards.length} 张</span>`:''}</button>`).join('')}</nav>
  <div class="header-tools"><button class="tool-button fullscreen-tool" data-action="fullscreen" aria-label="切换全屏">${icon('frame')}</button><button class="tool-button wide music-toggle" data-action="sound" aria-label="${state.settings.sound?t.soundOn+'，点击关闭':t.soundOff+'，点击开启'}" aria-pressed="${state.settings.sound}">${icon(state.settings.sound?'sound':'mute')}<span>${state.settings.sound?'音乐开':'音乐关'}</span></button><button class="tool-button" data-action="settings" aria-label="${t.settings}">${icon('settings')}</button></div></header>`;
}
function footer() {
  return `<footer class="footer"><span>${icon('leaf')}暖尾尾陪你慢慢想 · 不比较，不赶时间</span><button data-action="nav" data-view="grownups">${t.saved} ${icon('arrow')}</button></footer>`;
}
function cardButton(l, bonus=false) {
  const status = stageStatus(state,l.id); const owned = state.cards.includes(l.id); const rec = suggested()===l.id;
  return `<button class="level-card ${rec&&!bonus?'recommended':''}" style="--card-bg:${l.color}44" data-action="intro" data-level="${l.id}" aria-label="第 ${l.id} 站 ${l.title}，${l.skill}，${t.status[status]}${l.optional?'，自选挑战':''}"><div class="level-top"><span class="level-number">${String(l.id).padStart(2,'0')}</span>${!bonus?(owned?`<span class="mini-check">${icon('check')}</span>`:rec?'<span class="rec-label">从这里开始</span>':''):''}</div>${emblem(l.id)}<h3>${l.title}</h3><p class="level-mission">${safe(MISSIONS[l.id].goal)}</p><div class="level-bottom"><span>${owned?'已一起修复':l.range}</span>${icon('arrow')}</div></button>`;
}
function home() {
  const next=rewards.unlockedGrades.length&&!rewards.ticket?practiceStage():suggested();
  return `<section class="home-stage ${rewards.unlockedGrades.length?'has-play-reward':''}"><div class="home-welcome"><img src="./assets/nuanweiwei-happy-cutout-v2.png" alt="暖尾尾邀请你冒险" width="318" height="240"><div><h1>一起点亮花园</h1><p>魔法卡 ${state.cards.length} / 10</p></div></div><div class="grade-picker" role="group" aria-label="选择练习年级">${[1,2,3].map(grade=>`<button class="grade-choice" data-action="grade" data-grade="${grade}" aria-pressed="${profiles.selectedGrade===grade}"><b>${grade}</b><span>年级</span></button>`).join('')}</div><div class="home-actions"><button class="primary" data-action="${hasPaused()?'resume':'intro'}" ${hasPaused()?'':`data-level="${next}"`}>${hasPaused()?'接着玩':rewards.unlockedGrades.length?'新探险':'开始冒险'}${icon('arrow')}</button><button class="secondary" data-action="nav" data-view="vault" aria-label="魔法宝藏，已有 ${state.cards.length} 张卡">${icon('chest')}魔法宝藏</button></div>${miniShortcut()}<section class="compact-map" id="garden-map" aria-label="选择花园关卡">${levels().map(l=>`<button class="focus-level ${state.cards.includes(l.id)?'level-lit':''}" data-action="intro" data-level="${l.id}" aria-label="第 ${l.id} 站 ${l.title}${l.optional?'，自选挑战':''}${state.cards.includes(l.id)?'，已点亮':''}"><span class="focus-level-number">${String(l.id).padStart(2,'0')}</span>${emblem(l.id)}<span class="focus-level-copy"><strong>${l.title}</strong><small>${state.cards.includes(l.id)?'已点亮':l.optional?'自选挑战':l.range}</small></span></button>`).join('')}</section></section>`;
}
function spellCard(l, interactive=true) {
  const owned = state.cards.includes(l.id);
  const tag = interactive&&owned?'button':'article';
  return `<${tag} class="spell-card ${owned?'owned':'unowned'}" ${interactive&&owned?`data-action="cast" data-level="${l.id}" aria-label="召唤${l.cardName}魔法"`:''}><span class="card-index">NO. ${String(l.id).padStart(2,'0')}</span>${emblem(l.id)}<h3>${l.cardName}</h3><p>${owned?'来自 · '+l.title:'完成「'+l.title+'」收集'}</p><span class="card-action">${icon(owned?'spark':'lock')}${owned?'召唤魔法':'等你来探索'}</span></${tag}>`;
}
function vault() {
  return `<section class="vault-stage"><div class="vault-heading"><h1>魔法宝藏</h1><p>${state.cards.length} / 10</p></div><div class="vault-actions">${hasFinale()?`<button class="primary" data-action="finale">点亮整座花园${icon('spark')}</button>`:`<button class="primary" data-action="intro" data-level="${suggested()}">继续冒险${icon('arrow')}</button>`}${hasTreasure()?`<button class="secondary" data-action="treasure">打开百宝箱${icon('chest')}</button>`:''}</div>${miniShortcut()}<section class="vault-grid" aria-label="魔法卡收藏">${levels().map(l=>spellCard(l)).join('')}</section></section>`;
}
const taskLabels = {
  1:'小光点，一共有几个？',2:'把花朵放在一起',3:'飞走一些，还剩多少？',4:'找到凑成十的伙伴',5:'一个十，再看几个一',6:'先搭一座通往十的桥',7:'经过十，再往回走',8:'找回藏起来的数字',9:'数数整十和个位',10:'跨过整十的小山丘'
};
function equation(q, solved=false) {
  if(q.kind==='chain') {
    const pieces=q.terms.map((n,i)=>`${i?`<span class="symbol">${q.ops[i-1]==='+'?'+':'−'}</span>`:''}<span>${n}</span>`).join('');
    const label=q.terms.map((n,i)=>`${i?(q.ops[i-1]==='+'?' 加 ':' 减 '):''}${n}`).join('');
    return `<div class="equation chain-equation" aria-label="${label} 等于 ${solved?q.answer:'多少'}">${pieces}<span class="symbol">=</span><span class="blank ${solved?'solved':''}">${solved?q.answer:'?'}</span></div>`;
  }
  const part = key => q.blank===key ? `<span class="blank ${solved?'solved':''}">${solved?q.answer:'?'}</span>` : `<span>${q[key]}</span>`;
  return `<div class="equation ${Math.max(q.a,q.b,q.result)>=100?'large-equation':''}" aria-label="${q.blank==='a'?(solved?q.answer:'空格'):q.a} ${q.op==='+'?'加':'减'} ${q.blank==='b'?(solved?q.answer:'空格'):q.b} 等于 ${q.blank==='result'?(solved?q.answer:'多少'):q.result}">${part('a')}<span class="symbol">${q.op==='+'?'+':'−'}</span>${part('b')}<span class="symbol">=</span>${part('result')}</div>`;
}
function intro() {
  const l=level(selectedLevel),q=getQuestionBank(state.grade||1,l.id).find(q=>q.kind==='equation')||getQuestionBank(state.grade||1,l.id)[0];
  const sample=`${q.blank==='a'?'□':q.a} ${q.op==='+'?'+':'−'} ${q.blank==='b'?'□':q.b} = ${q.blank==='result'?'?':q.result}`;
  return `<section class="intro-stage"><div class="intro-heading"><p>${state.grade||1} 年级 · 第 ${l.id} 关${l.optional?' · 自选挑战':''}</p><h1>${l.title}</h1><p>${safe(MISSIONS[l.id].mission)}</p></div><div class="intro-scene"><img src="./assets/nuanweiwei-happy-cutout-v2.png" alt="暖尾尾准备与你一起出发" width="318" height="240"><div class="intro-sample" aria-label="示例题">${sample}</div></div><div class="intro-actions"><button class="primary" data-action="begin" data-level="${l.id}">出发${icon('arrow')}</button><button class="secondary" data-action="nav" data-view="home">回花园</button></div></section>`;
}
function selectedCardCount(mask) { return mask.toString(2).replaceAll('0','').length; }
function cardIndices(q){
  const key=`${state.grade}:${state.session.roundId}:${state.session.index}:${q.id}`;
  if(key!==cardVisualKey){
    cardVisualKey=key;cardVisualOrder=q.deck.map((_,i)=>i);
    for(let i=cardVisualOrder.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cardVisualOrder[i],cardVisualOrder[j]]=[cardVisualOrder[j],cardVisualOrder[i]];}
  }
  return cardVisualOrder;
}
function cardPuzzle(q,s,solved) {
  const selected=solved?s.results.at(-1).choice:cardSelection;
  const wrongSelection=!solved&&s.wrongChoices.includes(selected);
  const ordered=cardOrder.filter(index=>selected&(1<<index));
  q.deck.forEach((_,index)=>{if((selected&(1<<index))&&!ordered.includes(index))ordered.push(index);});
  const slots=Array.from({length:q.pickCount},(_,slot)=>{const index=ordered[slot],filled=index!==undefined;return `${slot?'<span class="slot-operator" aria-hidden="true">+</span>':''}${filled?`<button class="number-slot filled" data-action="card-remove" data-card="${index}" data-digits="${String(q.deck[index]).length}" aria-label="把数字卡 ${q.deck[index]} 放回去" ${solved?'disabled':''}><span>${q.deck[index]}</span></button>`:`<span class="number-slot empty ${slot===ordered.length?'next-empty':''}" role="img" aria-label="第 ${slot+1} 个空框"></span>`}`;}).join('');
  return `<section class="card-puzzle" aria-label="选 ${q.pickCount} 张卡凑出 ${q.target}"><div class="slot-sum" style="--slot-count:${q.pickCount}"><div class="slot-team" aria-label="${q.pickCount} 个数字卡位置">${slots}</div><span class="slot-operator" aria-label="${wrongSelection?'还不等于':'等于'}">${wrongSelection?'≠':'='}</span><strong class="slot-goal ${solved?'goal-lit':''}" data-digits="${String(q.target).length}" aria-label="目标数 ${q.target}">${q.target}</strong></div><div class="number-card-deck" role="group" aria-label="选择数字卡">${cardIndices(q).map((i,position)=>{const n=q.deck[i],chosen=Boolean(selected&(1<<i));return `<button class="number-card ${chosen?'selected':''}" data-action="card-select" data-card="${i}" data-digits="${String(n).length}" aria-label="第 ${position+1} 张数字卡 ${n}${chosen?'，已选择':''}" aria-pressed="${chosen}" ${solved||(!chosen&&ordered.length>=q.pickCount)?'disabled':''}><span>${n}</span></button>`;}).join('')}</div><p class="sr-only card-selection-note" aria-live="polite">已选 ${ordered.length} / ${q.pickCount} 张</p></section>`;
}
function answerMarkup(q,s,solved) {
  if(q.kind==='cards')return cardPuzzle(q,s,solved);
  return `${q.story?`<p class="story-question">${safe(q.story)}</p>`:equation(q,solved)}<div class="answers" role="group" aria-label="选择答案">${q.choices.map(n=>`<button data-digits="${String(n).length}" class="answer ${s.wrongChoices.includes(n)?'wrong':''} ${solved&&n===q.answer?'right chosen':''}" data-action="answer" data-value="${n}" aria-label="答案 ${n}${s.wrongChoices.includes(n)?'，再试一个':''}" ${solved||s.wrongChoices.includes(n)?'disabled':''}>${n}${solved&&n===q.answer?icon('check'):''}</button>`).join('')}</div>`;
}
function questionTitle(q) {
  if(q.story)return q.story;
  if(q.kind==='cards')return `选 ${q.pickCount} 张数字卡，凑出一束星光`;
  if(q.kind==='chain')return '三个数字，一起施魔法';
  return q.blank==='result'?(q.levelId===1&&q.op==='-'?'拿走一些，还剩几个？':taskLabels[q.levelId]):'问号里，藏着哪个数？';
}
function placeValueHint(n,steps) {
  const thousands=Math.floor(n/1000),hundreds=Math.floor(n%1000/100),tens=Math.floor(n%100/10),ones=n%10;
  return `<h2>${n} 是 ${thousands?`${thousands} 个千、`:''}${hundreds?`${hundreds} 个百、`:''}${tens} 个十和 ${ones} 个一</h2><div class="place-value-groups" role="img" aria-label="${thousands} 个千块、${hundreds} 个百块、${tens} 根十棒和 ${ones} 个个位方块">${thousands?`<div class="place-value-group">${Array.from({length:thousands},()=>'<span class="thousand-block">1000</span>').join('')}</div>`:''}${hundreds?`<div class="place-value-group">${Array.from({length:hundreds},()=>'<span class="hundred-block">100</span>').join('')}</div>`:''}<div class="place-value-group">${Array.from({length:tens},()=>'<div class="ten-rod">'+Array.from({length:10},()=>'<i></i>').join('')+'</div>').join('')}</div><div class="place-value-group">${Array.from({length:ones},()=>'<span class="one-block"></span>').join('')}</div></div><p>${thousands?'立体方块代表 1000，':''}大方块代表 100，长棒代表 10，小块代表 1。<br>${steps.join(' ')}</p>`;
}
function frameHint(q) {
  const exp=explain(q,state.session?.feedback?.correct?state.session.results.at(-1)?.choice:q.answer);
  if(q.kind==='cards')return `<h2>让数字卡结成小队</h2><p>每张卡可以用一次。先找两张的伙伴，再看是否需要第三张。</p><div class="card-hint-steps">${exp.steps.map(step=>`<span>${safe(step)}</span>`).join('')}</div>`;
  if(q.kind==='chain')return `<h2>${safe(exp.headline)}</h2>${Math.max(...q.terms,q.result)>20?placeValueHint(q.terms[0],exp.steps):`<div class="card-hint-steps">${exp.steps.map(step=>`<span>${safe(step)}</span>`).join('')}</div>`}`;

  const isMissing=q.blank!=='result';
  if(Math.max(q.a,q.b,q.result)>20)return placeValueHint(q.a,exp.steps);
  let total=q.op==='+'?q.result:q.a;
  let known=isMissing?(q.op==='+'?(q.blank==='a'?q.b:q.a):q.result):q.a;
  let caption;
  if(isMissing){caption=q.op==='+'?`一共 ${q.result} 个，已知 ${known} 个。条纹格是要找的部分。`:q.blank==='a'?`剩下 ${q.result} 个，把拿走的 ${q.b} 个放回去，找原来的数。`:`原来 ${q.a} 个，剩下 ${q.result} 个。条纹格是拿走的部分。`;}
  else caption=q.op==='+'?`${q.a} 个原有的点，加上 ${q.b} 个金色点。合起来数一数。`:`原来 ${q.a} 个，划去 ${q.b} 个，再数没划去的。`;
  const frames=Math.max(1,Math.ceil(total/10));
  return `<h2>${isMissing?'用整体和部分想一想':q.op==='+'?'合在一起，一共多少？':'拿走一些，再看看'}</h2><div class="ten-frames ${frames===1?'single':''}" role="img" aria-label="${safe(caption)}">${Array.from({length:frames},(_,f)=>`<div class="ten-frame">${Array.from({length:10},(_,i)=>{const pos=f*10+i;let cls='';let unknown=false;if(pos<total){if(isMissing){unknown=!(q.blank==='a'&&q.op==='-')&&pos>=known;cls=q.blank==='a'&&q.op==='-'&&pos>=q.result?'added':'';}else cls=q.op==='+'?(pos>=q.a?'added':''):(pos>=q.result?'removed':'');}return `<span class="cell ${unknown?'unknown':''}">${pos<total&&!unknown?`<span class="dot ${cls}"></span>`:''}</span>`;}).join('')}</div>`).join('')}</div><p>${caption}</p>${isMissing?`<p>${explain(q).steps.join(' ')}</p>`:''}`;
}
function columnHint(q) {
  const worked=columnMethod(q);if(!worked)return frameHint(q);
  return `<div class="column-method"><h2>个位对齐，从右往左算</h2><div class="column-formula" role="img" aria-label="${worked.a} ${worked.op==='+'?'加':'减'} ${worked.b} 等于 ${worked.result}"><span>${worked.a}</span><span class="column-bottom">${worked.op==='+'?'+':'−'} ${worked.b}</span><span class="column-result">${worked.result}</span></div><ol class="column-steps">${worked.steps.map(step=>`<li>${safe(step)}</li>`).join('')}</ol></div>`;
}
function lineHint(q) {
  const exp=explain(q,state.session?.feedback?.correct?state.session.results.at(-1)?.choice:q.answer); const points=[exp.start];exp.deltas.forEach(d=>points.push(points.at(-1)+d));
  const margin=Math.max(...points)>100?10:1;
  let min=Math.max(0,Math.min(...points)-margin),max=Math.max(...points)+margin;
  if(max-min<5)max=min+5;
  const x = n=>28+(n-min)/(max-min)*444;
  const step=max-min>120?50:max-min>50?10:max-min>25?5:1;
  const tickValues=[...new Set([min,max,...points,...Array.from({length:Math.floor((max-min)/step)+1},(_,i)=>min+i*step)])].sort((a,b)=>a-b);
  const ticks=tickValues.map(n=>{const show=max-min<=12||points.includes(n)||n%step===0;return `<g><path d="M${x(n)} 74v8" stroke="#9B9E89" stroke-width="1.5"/>${show?`<text x="${x(n)}" y="107" text-anchor="middle" fill="${points.includes(n)?'#6F557F':'#7C806E'}" font-weight="${points.includes(n)?700:400}">${n}</text>`:''}</g>`;}).join('');
  const arcs=exp.deltas.map((d,i)=>{const a=x(points[i]),b=x(points[i+1]);if(d===0)return `<text x="${a}" y="38" text-anchor="middle" fill="#806293">原地不动</text>`;return `<path d="M${a} 71Q${(a+b)/2} ${7-i*10} ${b} 71" fill="none" stroke="${i?'#A78B53':'#8C71A1'}" stroke-width="2.5"/><path d="M${b+(d>0?-6:6)} 61 ${b} 71 ${b+(d>0?3:-3)} 62" fill="none" stroke="${i?'#A78B53':'#8C71A1'}" stroke-width="2.3"/><text x="${(a+b)/2}" y="29" text-anchor="middle" fill="#715384">${d>0?'+':''}${d}</text>`;}).join('');
  return `<h2>${exp.headline}</h2><svg class="number-line" viewBox="0 0 500 116" role="img" aria-label="从 ${exp.start} 出发，${exp.deltas.map(d=>d>=0?'向右 '+d+' 格':'向左 '+(-d)+' 格').join('，')}，到 ${points.at(-1)}"><path d="M16 77h468" stroke="#AFB29B" stroke-width="2"/>${ticks}${arcs}<circle cx="${x(exp.start)}" cy="77" r="5" fill="#9F88B0"/><circle cx="${x(points.at(-1))}" cy="77" r="5" fill="#A5AF7F"/></svg><div class="line-detail">${exp.steps.map(s=>`<span>${s}</span>`).join('')}</div>`;
}

function lesson() {
  const s=state.session,q=currentQuestion(state);if(!q)return reward();
  const l=level(s.levelId),solved=Boolean(s.feedback?.correct),earned=s.index+(solved?1:0);
  const helper=solved?'看看方法':s.feedback?'要帮忙吗？':'帮我想想';
  const primary=solved?`<button class="primary" data-action="next">${s.index===5?'收下魔法卡':'下一题'}${icon(s.index===5?'chest':'arrow')}</button>`:q.kind==='cards'?`<button class="primary card-submit" data-action="card-submit" ${selectedCardCount(cardSelection)!==q.pickCount?'disabled':''}>确定${icon('check')}</button>`:'';
  const companion=`<div class="question-companion">${companionMarkup({mode:solved?'correct':s.feedback?'retry':'idle',kind:'lesson',motion:reduceMotion()?'reduce':'full'})}</div>`;
  return `<div class="lesson-head"><button class="focus-tool" data-action="pause" aria-label="休息一下">${icon('back')}</button><div class="lesson-progress"><img class="lesson-avatar" src="./assets/nuanweiwei-happy-cutout-v2.png" alt="暖尾尾和你一起玩" width="318" height="240"><span class="lesson-place">${l.title}</span><span class="companion-energy-target" role="progressbar" aria-label="送给暖尾尾的星光" aria-valuemin="0" aria-valuemax="6" aria-valuenow="${earned}">${icon('spark')}<b>${earned} / 6</b></span></div><div class="lesson-tools"><button class="focus-tool music-toggle" data-action="sound" aria-label="${state.settings.sound?'关闭声音':'打开声音'}" aria-pressed="${state.settings.sound}">${icon(state.settings.sound?'sound':'mute')}<span>${state.settings.sound?'音乐开':'音乐关'}</span></button><button class="focus-tool" data-action="settings" aria-label="小设置">${icon('settings')}</button></div></div><section class="problem-card ${q.kind==='cards'?'has-card-puzzle':''} ${solved?'is-correct':s.feedback?'is-retry':''}" aria-labelledby="problem-title"><h1 class="sr-only" id="problem-title">${questionTitle(q)}</h1><div class="problem-content">${companion}${answerMarkup(q,s,solved)}</div><footer class="lesson-actions"><div class="feedback ${solved?'correct':s.feedback?'retry':''}" role="status" aria-live="polite" tabindex="-1">${solved?`${icon('check')}答对啦！`:s.feedback?`${icon('reset')}${q.kind==='cards'?'换一张，再试试':'再想想，再试试'}`:''}</div><div class="lesson-action-buttons"><button class="${primary?'secondary':'text-button'}" data-action="help" aria-expanded="${modal==='hint'}" aria-controls="hint-dialog">${icon('frame')}${helper}</button>${primary}</div></footer></section>`;
}
function reward() {
  const s=state.session;if(!s?.completed)return home();const l=level(s.levelId);
  return `<section class="reward-stage"><div class="reward-halo" aria-hidden="true"></div><div class="reward-heading"><h1>点亮${l.title}！</h1><p>魔法卡 ${state.cards.length} / 10</p></div><div class="reward-display"><img class="reward-dancer" src="./assets/nuanweiwei-happy-cutout-v2.png" alt="暖尾尾跃起庆祝" width="318" height="240">${spellCard(l,false)}</div>${roundSummaryMarkup(s)}<div class="reward-actions"><button class="primary" data-action="cast" data-level="${l.id}">施放魔法${icon('spark')}</button>${hasTreasure()?`<button class="secondary" data-action="treasure">百宝箱${icon('chest')}</button>`:''}<button class="secondary" data-action="rest">休息${icon('moon')}</button></div></section>`;
}
function rest() {
  return `<section class="rest-card">${icon('moon')}<h1>${t.restTitle}</h1><p>${t.restBody}<br>已经走过的路，会留在这里。</p>${hasPaused()?`<button class="primary" data-action="resume">${t.resume}${icon('arrow')}</button>`:''}<button class="${hasPaused()?'secondary':'primary'}" data-action="nav" data-view="home">回花园看看${icon('leaf')}</button></section>`;
}
function grownups() {
  return `<div class="page-head"><p class="eyebrow">${icon('book')}给陪伴者的小手册</p><h1>让“想明白”，比“答得快”更重要。</h1><p>可以一起看、一起摆，也可以让孩子按自己的节奏探索。</p></div><div class="guide-grid"><section class="guide-panel"><h2>一个有余地的小花园</h2><p>首页可以自由选择 1、2、3 年级的练习档，每档 10 站，进度分别保存。一年级主线练 20 以内加减和逆运算，后两站可挑战 100 以内；二年级重点练两位数进退位；三年级练三位数进退位、跨零、连算和小情境。年级是练习梯度，具体教材和学习进度会有差异。任何地点都能直接探索，按孩子实际能力选择即可。</p><p>一趟 6 题：5 题当前目标，另 1 题轻量复习。没有旧记录时，这题是当前知识的迁移。每一题先自己试试，需要时主动打开小工具。</p><p>答错或借助工具后，仍然能收集魔法卡。用手指、纸笔、积木帮忙也很好；屏幕只能知道是否点击提示，无法知道孩子实际用了什么办法。</p><p>数学答题没有倒计时，每趟结束可以歇一歇；没有排行榜、广告、签到或付费内容。8 张主线卡已经能看见完整的组合魔法。10 张全齐额外打开星光百宝箱，观看暖尾尾的庆祝舞和三种秘密魔法。不需要追求所有题独立完成，也不消耗卡片。每档首次集齐 10 张卡，还会获得一次 60 秒的接星光小游戏；以后完成 3 个不同数学地点，可以再获得一次。次数不累积，刷新和切到后台不会延长时间，提前退出也不返还。</p></section><section class="guide-panel"><h2>这些记录说明什么？</h2><p><b>一起练过：</b>接触过这个办法。<br><b>能独立试试：</b>某一趟的 5 道目标题中，至少 4 题无提示首答正确。<br><b>隔一会也会：</b>之后另一趟，至少隔 3 题，用不同的题再次无提示首答正确。</p><p>这些只是轻量的游戏内练习信号。选择题也可能猜中，6 题不能证明真实掌握，更不代表学习诊断或成绩。鼓励孩子用自己的话或实物解释，再在别的时间试试。</p><p>遇到需要帮助的知识会进入后续复习，每趟最多 1 题。间隔按做过的题和旅程计算，不要求连续几天来玩。</p></section></div>
  <section class="guide-panel"><h2>${state.grade||1} 年级 · 探索记录</h2><table class="skill-table"><thead><tr><th scope="col">地点</th><th scope="col">独立 / 一起完成</th><th scope="col">练习信号</th></tr></thead><tbody>${levels().map(l=>`<tr><td>${String(l.id).padStart(2,'0')} ${l.title}${l.optional?' · 自选':''}</td><td>${state.stages[l.id]?.independent||0} / ${state.stages[l.id]?.supported||0}</td><td class="status-label">${t.status[stageStatus(state,l.id)]}</td></tr>`).join('')}</tbody></table></section>
  <div class="guide-grid" style="margin-top:23px"><section class="guide-panel"><h2>只留在这里的小脚印</h2><p>无需账号，不输入孩子姓名或其他个人信息。没有外部统计或追踪。题目、插画和字体由游戏网站提供，音效在设备上合成。托管服务 GitHub Pages 会为安全目的记录访问者 IP。</p><p>进度只保存在<b>当前设备、当前浏览器、当前网址</b>里。电脑、手机、iPad 上界面都会适配，但<b>进度不会自动同步</b>。清除浏览器网站数据、隐私浏览结束或更换端口可能失去进度。</p><p>公开网址可直接分享给家长，无需电脑保持开机。没有自动跨设备同步。</p></section><section class="guide-panel"><h2>舒适地玩</h2><p>保留当前设备的声音开关，新设备默认关闭。开启声音后，旅程中会播放轻柔的花园背景音乐。答对有星光短音，过关有庆祝乐句，施法和百宝箱有不同配乐。首次点击开启或进入游戏会启动手机音频；关掉后立即停止。请同时使用设备系统音量；浏览器无法可靠识别 iPad/iPhone 的硬件静音拨片。</p><div class="setting-row"><label for="guide-motion">画面动态</label>${motionSelect('guide-motion')}</div><p>减少动态会直接展示每种魔法的完整画面，奖励内容一样多。</p><p>中文为首个语言版本；代码预留语言字典。真实儿童试玩、实际 iPad/手机和声音听感尚未验证。</p></section></div><section class="reset-panel"><div><h3>重新开始一个花园</h3><p>会清除本游戏在这个浏览器里所有年级的卡片、练习记录和小游戏机会。不会影响其他网站。</p></div><button class="secondary danger" data-action="reset-dialog">${icon('reset')}重置本地进度</button></section>`;
}
function motionSelect(id) {
  return `<select id="${id}" data-setting="motion" aria-label="画面动态">${[['system','跟随设备设置'],['reduce','减少动态'],['full','完整动态']].map(([v,name])=>`<option value="${v}" ${state.settings.motion===v?'selected':''}>${name}</option>`).join('')}</select>`;
}
function nextMagicAction() {
  if(magic.finale||magic.id===10){
    if(hasTreasure())return `<button class="primary magic-next" data-action="treasure">百宝箱${icon('chest')}</button>`;
    const next=levels().find(l=>l.optional&&!state.cards.includes(l.id));
    return next?`<button class="primary magic-next" data-action="intro" data-level="${next.id}" aria-label="进入下一关 · ${next.title}">下一关${icon('arrow')}</button>`:`<button class="primary magic-next" data-action="nav" data-view="home">回花园${icon('leaf')}</button>`;
  }
  const next=level(magic.id+1);
  return `<button class="primary magic-next" data-action="intro" data-level="${next.id}" aria-label="进入下一关 · ${next.title}">下一关${icon('arrow')}</button>${magic.id===8&&hasFinale()?`<button class="secondary" data-action="finale" aria-label="一起点亮整座花园">大魔法${icon('spark')}</button>`:''}`;
}
function soundInvitation() {
  return state.settings.sound?'':`<button class="text-button sound-invitation" data-action="sound">${icon('sound')}打开魔法音效，听听我们的庆祝乐</button>`;
}
function magicPage() {
  const l=level(magic.id),name=magic.finale?t.finale:l.cardName;
  return `<div class="magic-header"><h1>${name}</h1><button class="text-button" data-action="nav" data-view="vault">${icon('back')}回宝藏库</button></div><section class="magic-view ${magic.paused||modal?'paused':''} ${reduceMotion()||magic.finished?'still':''}" data-phase="${magic.finished?'complete':'gather'}" aria-label="${name}魔法场景"><img class="magic-backdrop" src="./assets/magic-garden-v2.webp" alt="月夜魔法花园">${magicArt(magic.id,magic.finale)}<div class="casting-ring" aria-hidden="true"><div class="casting-orbit">${Array.from({length:8},(_,i)=>`<span style="--glyph:${i}">${emblem(magic.finale?i+1:magic.id)}</span>`).join('')}</div></div><div class="spell-focus" aria-hidden="true">${emblem(magic.id,true)}</div><img class="casting-character" src="./assets/nuanweiwei-happy-cutout-v2.png" alt="暖尾尾施放你们的魔法" width="318" height="240"><p class="magic-story" aria-live="polite">${magic.finished?'我们点亮花园啦！':magic.paused?'等你准备好':'星光集合……'}</p></section><div class="magic-controls">${nextMagicAction()}${magic.finished?'':`<button class="secondary" data-action="magic-pause">${icon(magic.paused?'play':'pause')}${magic.paused?'继续':'暂停'}</button>`}<button class="secondary" data-action="magic-replay">${icon('reset')}再看一次</button></div>`;
}
function treasurePage() {
  return treasureMarkup({...treasure,paused:treasure.paused||Boolean(modal)}).replace('<div class="treasure-controls">',`${gardenSummaryMarkup(state)}<div class="treasure-controls">`);
}
function modalView() {
  if(!modal)return '';
  if(modal==='album')return albumDetailMarkup(selectedAlbum);
  let content='';
  if(modal==='hint'){const q=currentQuestion(state);if(!q)return '';content=`<h2 id="dialog-title">一起想一想</h2><div class="hint-tabs" role="group" aria-label="选择小工具"><button class="secondary" data-action="hint" data-kind="frames" aria-pressed="${hintMode==='frames'}">${icon('frame')}摆一摆</button><button class="secondary" data-action="hint" data-kind="line" aria-pressed="${hintMode==='line'}">${icon('line')}走数轴</button>${(state.grade||1)>=2&&q.kind!=='cards'&&q.kind!=='chain'?`<button class="secondary" data-action="hint" data-kind="column" aria-pressed="${hintMode==='column'}">${icon('frame')}列竖式</button>`:''}</div><div class="hint-panel" id="hint-panel">${hintMode==='line'?lineHint(q):hintMode==='column'?columnHint(q):frameHint(q)}</div><div class="modal-actions"><button class="primary" data-action="close-dialog">回到题目${icon('arrow')}</button></div>`;}
  if(modal==='settings')content=`<h2 id="dialog-title">小设置</h2><div class="setting-row"><span class="modal-label">声音</span><button class="secondary" data-action="sound" aria-pressed="${state.settings.sound}">${icon(state.settings.sound?'sound':'mute')}${state.settings.sound?'开启':'关闭'}</button></div><div class="setting-row"><label class="modal-label" for="modal-motion">动画</label>${motionSelect('modal-motion')}</div><div class="settings-links"><button class="text-button" data-action="fullscreen">${icon('frame')}切换全屏</button><button class="text-button" data-action="app-help">${icon('leaf')}添加主屏幕</button><button class="text-button" data-action="nav" data-view="grownups">${icon('book')}给大人看</button></div><p class="audio-status" role="status">${safe(audioMessage())}</p><div class="modal-actions"><button class="primary" data-action="close-dialog">好了${icon('check')}</button></div>`;
  if(modal==='app-help')content=`<h2 id="dialog-title">把花园放到主屏幕</h2><p>${safe(getInstallHint())}</p><p>从主屏幕图标进入可获得更沉浸的界面，效果由浏览器决定。公网版本不需要电脑开机或连接同一 Wi-Fi。浏览器支持时可以直接全屏；iPhone Safari 如不能直接全屏，请从主屏幕图标打开。进度保存在当前网址与浏览器，主屏幕入口的存档可能与 Safari 标签页分开。</p><div class="modal-actions"><button class="primary" data-action="close-dialog">知道啦</button></div>`;
  if(modal==='replace-session')content=`<h2 id="dialog-title">还有一趟没走完呢。</h2><p>「${level(state.session.levelId).title}」停在第 ${state.session.index+1} 个小任务。可以接着走，也可以开始新地点并换一组随机题。已经收藏的卡片都会保留。</p><div class="modal-actions"><button class="primary" data-action="resume">接着上次玩${icon('arrow')}</button><button class="secondary" data-action="begin-confirm" data-level="${selectedLevel}">开始「${level(selectedLevel).title}」</button><button class="text-button" data-action="close-dialog">先不换</button></div>`;
  if(modal==='reset')content=`<h2 id="dialog-title">要重新种下花园吗？</h2><p>这会删除这个浏览器里所有年级的卡片、练习记录和小游戏机会，无法撤销。</p><div class="modal-actions"><button class="primary" data-action="close-dialog">保留我的花园</button><button class="secondary danger" data-action="reset-confirm">确认重置本地进度</button></div>`;
  return `<div class="modal-backdrop"><section class="modal ${modal==='hint'?'lesson-help':modal==='settings'?'settings-dialog':''}" ${modal==='hint'?'id="hint-dialog"':''} role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button class="modal-close" data-action="close-dialog" aria-label="关闭窗口">${icon('close')}</button>${content}</section></div>`;
}
function render({preserveMagic=true,preserveScroll=preserveMagic,focusModal=false}={}) {
  if(getPlayStatus(rewards).needsFinish){stopMini();rewards=finishPlay(rewards);save();if(view==='mini')view='mini-end';}
  if(view==='mini'){miniController?.destroy();miniController=null;}
  const characterKey=questionCharacterKey();
  const oldCharacter=characterKey&&characterQuestionKey===characterKey?document.querySelector('.question-companion [data-companion]'):null;
  if(!oldCharacter)stopCharacter();
  const keepScroll=preserveScroll&&document.body.dataset.view===view;
  const mainScroll=keepScroll?(document.querySelector('#main')?.scrollTop||0):0;
  const problemScroll=keepScroll?(document.querySelector('.problem-card')?.scrollTop||0):0;
  // Settings update the DOM. Preserve the visual timeline independently of
  // that render, including while a child has explicitly paused the scene.
  const oldScene=preserveMagic&&['magic','treasure'].includes(view)?document.querySelector(view==='magic'?'.magic-view':'.treasure-view'):null;
  const times=oldScene?.getAnimations?.({subtree:true}).map(a=>a.currentTime) || [];
  applyMotion(); document.documentElement.lang=locale;
  document.body.dataset.view=view;
  const pages={home,vault,intro,lesson,reward,rest,grownups,magic:magicPage,treasure:treasurePage,'mini-menu':miniMenu,mini:()=>starPlayMarkup(rewards.active),'mini-end':()=>starPlayEndMarkup(rewards.lastPlay)};
  app.innerHTML=`<div class="shell">${header()}${storageIssue?`<div class="storage-warning" role="status">${storageIssue}</div>`:''}<main id="main" tabindex="-1">${(pages[view]||home)()}</main>${footer()}</div>${modalView()}`;
  if(times.length)document.querySelector(view==='magic'?'.magic-view':'.treasure-view')?.getAnimations?.({subtree:true}).forEach((animation,i)=>{if(times[i]!==undefined&&times[i]!==null)animation.currentTime=times[i];});
  if(keepScroll){document.querySelector('#main').scrollTop=mainScroll;const problem=document.querySelector('.problem-card');if(problem)problem.scrollTop=problemScroll;}
  if(view==='mini')installMini();
  if(view==='lesson')installCharacter(characterKey,oldCharacter);
  if(modal){document.querySelector('.shell')?.setAttribute('inert','');if(focusModal)queueMicrotask(()=>document.querySelector('.modal button')?.focus());}
  maintainMusic();
}
function openModal(name) {sounds.stopEffects();effects.pause();miniController?.pause();if(!modal)modalReturnFocus=document.activeElement?.getAttribute('data-action');modal=name;render({focusModal:true});}
function closeModal() {miniController?.resume();const wasAlbum=modal==='album';modal='';if(!((view==='magic'&&magic.paused)||(view==='treasure'&&treasure.paused))){pauseScene(false);}render();if(wasAlbum)document.querySelector(`[data-action="album-open"][data-album="${albumReturnId||selectedAlbum}"]`)?.focus();else (document.querySelector(`[data-action="${modalReturnFocus}"]`)||document.querySelector('[data-action="settings"]'))?.focus();}
function startLevel(id) {cardSelection=0;cardOrder=[];void requestImmersive();sounds.resume({unlock:false});effects.resume();beginSession(state,Number(id));hintMode='';hintClosed=false;save();go('lesson');}
function startMagic(id,finale=false) {
  if(finale?!hasFinale():!state.cards.includes(Number(id)))return;
  void requestImmersive();stopMagic();stopTreasure();effects.stop();sounds.stopEffects();effects.resume();sounds.resume({unlock:false});magic={id:Number(id),finale,paused:false,finished:reduceMotion(),elapsed:0,last:0,frame:0};view='magic';modal='';render({preserveMagic:false});window.scrollTo({top:0,behavior:'instant'});
  if(!reduceMotion())magic.frame=requestAnimationFrame(magicTick);
  void chime('magic');effects.celebrate('magic',{origin:document.querySelector('.casting-character'),target:document.querySelector('.spell-focus')});
}
function magicTick(now) {
  if(view!=='magic'||reduceMotion()){stopMagic();return;}
  if(!magic.last)magic.last=now;
  if(!magic.paused&&!document.hidden&&!modal)magic.elapsed+=Math.min(now-magic.last,150);
  magic.last=now;
  const story=document.querySelector('.magic-story');
  if(!magic.paused&&story){const phrase=magic.elapsed<2500?'星光集合……':magic.elapsed<5500?'魔法准备好了！':magic.elapsed<9500?'我们点亮花园啦！':t.magicEnd;document.querySelector('.magic-view')?.setAttribute('data-phase',magic.elapsed<2500?'gather':magic.elapsed<5500?'charge':'release');if(story.textContent!==phrase)story.textContent=phrase;}
  if(magic.elapsed>=12000){magic.finished=true;render();return;}
  magic.frame=requestAnimationFrame(magicTick);
}
function updateMagicPause() {
  const scene=document.querySelector('.magic-view');scene?.classList.toggle('paused',magic.paused);
  const button=document.querySelector('[data-action="magic-pause"]');
  if(button)button.innerHTML=`${icon(magic.paused?'play':'pause')}${magic.paused?t.continueMagic:t.stop}`;
  const story=document.querySelector('.magic-story');if(story)story.textContent=magic.paused?'等你准备好':'你带来的魔法，让花园亮起来了。';
}
function showRetryFeedback() {
  const problem=document.querySelector('.problem-card');
  problem?.classList.add('retry-feedback');
  void chime('retry');
  document.querySelector('.feedback')?.focus({preventScroll:true});
}
async function chime(kind='correct') {
  return sounds.play(kind);
}
async function toggleSound() {
  const refocusSound=document.activeElement?.getAttribute('data-action')==='sound';
  state.settings.sound=!state.settings.sound;save();sounds.setEnabled(state.settings.sound);
  if(state.settings.sound){sounds.resume();void sounds.unlock();soundUnavailable=false;maintainMusic();}
  if(state.settings.sound&&!((view==='magic'&&magic.paused)||(view==='treasure'&&treasure.paused)||modal)){sounds.resume({unlock:false});if(view==='magic'&&!magic.finished)void sounds.play('magic',{offset:magic.elapsed/1000});else if(view==='treasure'&&treasure.opened&&!treasure.finished)void sounds.play('treasure',{offset:treasure.elapsed/1000});else void chime(view==='reward'?'reward':'correct');}
  render();if(refocusSound)(document.querySelector('.modal [data-action="sound"]')||document.querySelector('[data-action="sound"]'))?.focus({preventScroll:true});
}
function startTreasure() {
  if(!hasTreasure())return;
  void requestImmersive();stopMagic();stopTreasure();effects.stop();sounds.stopEffects();
  treasure={opened:false,finished:false,paused:false,theme:'starlight',elapsed:0,last:0,frame:0};go('treasure');
}
function openTreasure() {
  if(!hasTreasure()||treasure.opened)return;
  void requestImmersive();treasure.opened=true;treasure.finished=reduceMotion();treasure.paused=false;
  treasure.elapsed=0;treasure.last=0;effects.resume();sounds.resume({unlock:false});render({preserveMagic:false});
  void chime('treasure');effects.celebrate('treasure',{origins:[...document.querySelectorAll('.treasure-flying-card')],target:document.querySelector('.treasure-dancer')});
  if(!reduceMotion())treasure.frame=requestAnimationFrame(treasureTick);
}
function treasureTick(now) {
  if(view!=='treasure'||reduceMotion()){stopTreasure();return;}
  if(!treasure.last)treasure.last=now;
  if(!treasure.paused&&!document.hidden&&!modal)treasure.elapsed+=Math.min(now-treasure.last,150);
  treasure.last=now;
  if(treasure.elapsed>=10000){treasure.finished=true;stopTreasure();render();return;}
  treasure.frame=requestAnimationFrame(treasureTick);
}
function pauseScene(paused) {
  if(paused){effects.pause();sounds.pause();}else{effects.resume();sounds.resume({unlock:false});if(view==='magic'&&!magic.finished)void sounds.play('magic',{offset:magic.elapsed/1000});if(view==='treasure'&&treasure.opened&&!treasure.finished)void sounds.play('treasure',{offset:treasure.elapsed/1000});}
}

app.addEventListener('click',event=>{
  const button=event.target.closest('button[data-action]');if(!button||button.disabled)return;
  const action=button.dataset.action,id=Number(button.dataset.level);
  if(action==='star-play-menu'){go('mini-menu');return;}
  if(action==='star-play-start'){launchMini();return;}
  if(action==='star-play-resume'){if(getPlayStatus(rewards).status==='running')go('mini');else go('mini-end');return;}
  if(action==='star-play-exit'){stopMini();rewards=finishPlay(rewards,Date.now(),'left');save();go('mini-end');return;}
  if(action==='grade'){const grade=Number(button.dataset.grade);if(![1,2,3].includes(grade)||grade===profiles.selectedGrade)return;save();selectGrade(profiles,grade);state=profiles.grades[grade];cardSelection=0;cardOrder=[];hintMode='';hintClosed=false;save();go('home');return;}
  if(action==='nav'){go(button.dataset.view);return;}
  if(action==='intro'){selectedLevel=id;go('intro');return;}
  if(action==='begin'){if(hasPaused()){selectedLevel=id;openModal('replace-session');}else startLevel(id);return;}
  if(action==='begin-confirm'){startLevel(id);return;}
  if(action==='resume'){if(state.session?.feedback?.correct&&currentQuestion(state)?.kind==='cards'&&new Set(currentQuestion(state).deck).size!==currentQuestion(state).deck.length){const moved=advance(state);if(moved.completed){creditRound();save();go('reward');return;}}void requestImmersive();hintMode='';hintClosed=false;go('lesson');return;}
  if(action==='pause'){save();go('rest');return;}
  if(action==='rest'){go('rest');return;}
  if(action==='map'){document.querySelector('#garden-map')?.scrollIntoView({behavior:reduceMotion()?'instant':'smooth',block:'start'});document.querySelector('#garden-map button')?.focus({preventScroll:true});return;}
  if(action==='fullscreen'){void toggleFullscreen().then(status=>{if(!status.fullscreen&&!status.standalone){if(status.platform==='ios')openModal('app-help');else notify(getInstallHint());}});return;}
  if(action==='app-help'){openModal('app-help');return;}
  if(action==='settings'){openModal('settings');return;}
  if(action==='album-open'){if(view!=='treasure'||!treasure.opened||!hasTreasure()||!getAlbum(button.dataset.album))return;if(modal!=='album')albumReturnId=button.dataset.album;selectedAlbum=button.dataset.album;openModal('album');return;}
  if(action==='close-dialog'){closeModal();return;}
  if(action==='sound'){void toggleSound();return;}
  if(action==='card-remove'){const q=currentQuestion(state),index=Number(button.dataset.card);if(q?.kind!=='cards'||state.session.feedback?.correct)return;cardSelection&=~(1<<index);cardOrder=cardOrder.filter(i=>i!==index);render();document.querySelector(`[data-action="card-select"][data-card="${index}"]`)?.focus({preventScroll:true});return;}
  if(action==='card-select') {
    const q=currentQuestion(state),index=Number(button.dataset.card);
    if(q?.kind!=='cards'||state.session.feedback?.correct||!Number.isInteger(index)||index<0||index>=q.deck.length)return;
    const bit=1<<index;
    if(!(cardSelection&bit)&&selectedCardCount(cardSelection)>=q.pickCount)return;
    if(cardSelection&bit)cardOrder=cardOrder.filter(i=>i!==index);else cardOrder.push(index);
    cardSelection^=bit;render();document.querySelector(`[data-action="card-select"][data-card="${index}"]`)?.focus({preventScroll:true});return;
  }
  if(action==='card-submit') {
    const q=currentQuestion(state);if(q?.kind!=='cards'||selectedCardCount(cardSelection)!==q.pickCount)return;
    sounds.resume({unlock:false});effects.resume();const rect=button.getBoundingClientRect(),origin={x:rect.left+rect.width/2,y:rect.top+rect.height/2};
    const result=submitAnswer(state,cardSelection);
    if(result.ignored){notify('这组已经试过啦，换一张卡再试试。');return;}
    queueCharacterReaction(result);save();render();
    if(result.correct){effects.burst('correct',{origin,target:document.querySelector('.companion-energy-target')});void chime();document.querySelector('[data-action="next"]')?.focus({preventScroll:true});}
    else showRetryFeedback();return;
  }
  if(action==='answer'){
    sounds.resume({unlock:false});effects.resume();
    const rect=button.getBoundingClientRect(),origin={x:rect.left+rect.width/2,y:rect.top+rect.height/2};
    const result=submitAnswer(state,Number(button.dataset.value));if(result.ignored)return;queueCharacterReaction(result);
    save();render();
    if(result.correct){effects.burst('correct',{origin,target:document.querySelector('.companion-energy-target')||document.querySelector('.story-energy')});void chime();document.querySelector('[data-action="next"]')?.focus({preventScroll:true});}
    else showRetryFeedback();return;
  }
  if(action==='help'){markHint(state);hintMode='frames';save();openModal('hint');return;}
  if(action==='hint'){markHint(state);hintMode=button.dataset.kind;hintClosed=false;save();render();document.querySelector(`[data-action="hint"][data-kind="${button.dataset.kind}"]`)?.focus({preventScroll:true});return;}
  if(action==='next'){cardSelection=0;cardOrder=[];const result=advance(state);hintMode='';hintClosed=false;save();if(result.completed){creditRound();save();go('reward');void chime('reward');effects.celebrate('reward',{target:document.querySelector('.reward-dancer')});}else{render({preserveScroll:false});document.querySelector('#problem-title')?.setAttribute('tabindex','-1');document.querySelector('#problem-title')?.focus({preventScroll:true});}return;}
  if(action==='cast'){startMagic(id);return;}
  if(action==='finale'){startMagic(8,true);return;}
  if(action==='magic-pause'){magic.paused=!magic.paused;pauseScene(magic.paused);updateMagicPause();return;}
  if(action==='magic-replay'){startMagic(magic.id,magic.finale);return;}
  if(action==='treasure'){startTreasure();return;}
  if(action==='treasure-open'){openTreasure();return;}
  if(action==='treasure-pause'){
    treasure.paused=!treasure.paused;pauseScene(treasure.paused);
    document.querySelector('.treasure-view')?.classList.toggle('paused',treasure.paused);
    button.innerHTML=`${icon(treasure.paused?'play':'pause')}${treasure.paused?'继续星光舞':'暂停一下'}`;button.setAttribute('aria-pressed',String(treasure.paused));const status=document.querySelector('.treasure-status');if(status)status.textContent=treasure.paused?'星光舞停在这里，等你准备好。':'十种魔法正在汇合。暖尾尾和你，一起点亮花园。';return;
  }
  if(action==='treasure-replay'){
    stopTreasure();effects.stop();sounds.stopEffects();treasure.opened=false;openTreasure();return;
  }
  if(action==='treasure-theme'){
    if(!treasure.opened||!['starlight','blossom','aurora'].includes(button.dataset.theme))return;
    treasure.theme=button.dataset.theme;render();
    if(!treasure.paused){effects.burst('correct',{origin:document.querySelector('.treasure-dancer')});if(treasure.finished)void chime('correct');}return;
  }
  if(action==='reset-dialog'){openModal('reset');return;}
  if(action==='reset-confirm'){
    stopMagic();stopTreasure();effects.stop();sounds.setEnabled(false);sounds.stop();profiles=createProfiles();state=profiles.grades[1];rewards=createRewards(profiles.grades);stopMini();cardSelection=0;cardOrder=[];hintMode='';storageIssue='';save();go('home');notify('新的花园，准备好了。');return;
  }
});
app.addEventListener('change',event=>{
  if(event.target.dataset.setting==='motion'){
    state.settings.motion=event.target.value;save();applyMotion();const focused=event.target.id;
    if(reduceMotion()){effects.stop();if(view==='treasure'){stopTreasure();treasure.finished=treasure.opened;}}
    if(view==='magic'){if(reduceMotion()){stopMagic();magic.finished=true;}else if(!magic.finished&&!magic.frame)magic.frame=requestAnimationFrame(magicTick);}
    render();document.getElementById(focused)?.focus();
  }
});
document.addEventListener('keydown',event=>{
  if(!modal)return;
  if(event.key==='Escape'){event.preventDefault();closeModal();return;}
  if(event.key==='Tab'){
    const items=[...document.querySelectorAll('.modal button:not(:disabled), .modal select, .modal a[href]')];const first=items[0],last=items.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){characterController?.pause();effects.pause();sounds.pause();if(view==='treasure'&&treasure.opened&&!treasure.finished){treasure.paused=true;document.querySelector('.treasure-view')?.classList.add('paused');const b=document.querySelector('[data-action="treasure-pause"]');if(b)b.innerHTML=icon('play')+'继续星光舞';}if(view==='magic'&&!magic.finished){magic.paused=true;updateMagicPause();}}else{if(!modal)characterController?.resume();maintainMusic();}
});
window.addEventListener('pageshow',event=>{if(event.persisted){render({preserveMagic:false});}});
window.addEventListener('pagehide',()=>{stopCharacter();miniController?.destroy();miniController=null;save();effects.stop();sounds.stop();});
systemMotion.addEventListener('change',()=>{applyMotion();characterController?.setMotion(()=>reduceMotion()?'reduce':'full');if(reduceMotion()){effects.stop();if(view==='treasure'&&treasure.opened){stopTreasure();treasure.finished=true;render();}}if(view==='magic'&&reduceMotion()){stopMagic();magic.finished=true;render();}});
save();
render();
