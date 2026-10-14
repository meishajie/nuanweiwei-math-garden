import {icon,emblem} from './art.js?v=20261014-1';
import {companionMarkup} from './character-reactions.js?v=20261014-1';
import {guardianBadgeMarkup,TREASURE_THEMES} from './adventure.js?v=20261014-1';
import {galleryMarkup} from './album-gallery.js?v=20261014-1';

export const CONGRATS_MS=5500,OPENING_MS=1500,DANCE_MS=30000;
export const celebrationActive=s=>['congrats','opening','dance'].includes(s.phase);
export function createCelebration(){return {phase:'congrats',phaseElapsed:0,elapsed:0,opened:false,finished:false,paused:false,theme:'starlight',collection:false,last:0,frame:0};}
export function celebrationAction(s,action,{reduced=false}={}){
 if(action==='reveal'&&s.phase==='congrats'){s.phase='chest';s.phaseElapsed=0;s.paused=false;return true;}
 if((action==='open'&&s.phase==='chest')||(action==='replay'&&s.phase==='keepsake')){
  s.opened=true;s.finished=reduced;s.phase=reduced?'keepsake':'opening';s.phaseElapsed=0;s.elapsed=0;s.paused=false;s.collection=false;s.last=0;return true;
 }
 if(action==='skip'&&['opening','dance'].includes(s.phase)){s.phase='keepsake';s.finished=true;s.paused=false;s.phaseElapsed=0;s.collection=false;return true;}
 return false;
}
// Only active foreground time advances. The unopened chest is an explicit gate.
export function advanceCelebration(s,delta){
 if(s.paused||!celebrationActive(s)||!Number.isFinite(delta)||delta<=0)return false;
 const before=s.phase;s.phaseElapsed+=delta;
 if(before==='congrats'){
  if(s.phaseElapsed>=CONGRATS_MS){s.phase='chest';s.phaseElapsed=0;}
 }else{
  s.elapsed=Math.min(OPENING_MS+DANCE_MS,s.elapsed+delta);
  if(s.elapsed>=OPENING_MS+DANCE_MS){s.phase='keepsake';s.phaseElapsed=0;s.finished=true;}
  else if(s.elapsed>=OPENING_MS){s.phase='dance';s.phaseElapsed=s.elapsed-OPENING_MS;}
 }
 return s.phase!==before;
}

// Four musical bars: step, wave, clap, star jump, heel step, wave, bow, finish.
// Each row is a different articulated pose, not a translation of one picture.
const rows=[
 [0,0,-3,8,-10,-6,0,0,-13,-3,0,0,0],
 [-38,6,-6,-16,15,16,-18,-10,9,4,-4,9,-9],
 [-55,-15,1,15,-22,-25,12,12,-28,-5,5,-9,8],
 [0,6,4,-28,24,24,-28,-5,18,6,-5,10,-8],
 [42,-18,-3,8,-30,-17,12,14,-22,-5,4,-8,10],
 [12,0,0,-39.28,-162.71,51.33,151.6,-8,16,1,-3,5,-6],
 [0,-12,3,-64.2,-158.17,75.48,147.33,5,-8,-4,4,-5,7],
 [0,24,0,-20,-15,20,-12,-4,20,6,-5,8,-8],
 [0,-95,-3,25,-18,-32,16,22,-40,-6,8,-11,13],
 [22,2,3,-10,8,15,-20,-12,15,5,-5,10,-9],
 [-35,-8,-4,-25,12,55,-36,12,-18,-3,5,-6,8],
 [35,-12,3,20,-26,-8,20,-10,4,5,-3,9,-9],
 [0,-6,-2,6,-18,-28,18,8,-28,-5,5,-8,11],
 [0,12,6,-30,-10,38,-12,-6,20,12,-4,5,-5],
 [0,18,9,-38,14,45,-24,0,8,15,-6,4,-4],
 [0,-8,0,18,-20,-20,10,10,-22,-5,5,-8,8],
 [0,0,-3,8,-10,-6,0,0,-13,-3,0,0,0]
];
export function dancePose(ms){
 const beat=((Math.max(0,Number.isFinite(ms)?ms:0)/500)%16),index=Math.floor(beat),mix=(1-Math.cos((beat-index)*Math.PI))/2;
 const values=rows[index].map((v,i)=>v+(rows[index+1][i]-v)*mix);
 return {values,face:index>=5&&index<=6?'wink':'smile',move:['step','wave','clap','jump','step','wave','bow','cheer'][Math.floor(index/2)]};
}
export function applyDancePose(container,ms,{cheer=false,still=false}={}){
 const actor=container?.querySelector('[data-companion]');if(!actor)return;
 const pose=dancePose(still?0:cheer?ms%2200:ms),[x,y,tilt,la,lf,ra,rf,ll,rl,head,dress,lp,rp]=pose.values;
 const put=(name,value)=>{const n=actor.querySelector(name);if(n)n.style.transform=value;};
 put('.cr-actor',`translate(${x}px,${y}px) rotate(${tilt}deg)`);
 for(const [name,value] of [['arm-left',la],['forearm-left',lf],['arm-right',ra],['forearm-right',rf],['leg-left',ll],['leg-right',rl],['head',head],['dress',dress],['pony-left',lp],['pony-right',rp]])put('.cr-'+name,`rotate(${value}deg)`);
 put('.cr-shadow',`scaleX(${1+Math.min(0,y)/500})`);
 actor.dataset.danceFace=pose.face;actor.dataset.danceMove=pose.move;
}
const dancer=()=>`<div class="curtain-dancer">${companionMarkup({mode:'correct',kind:'reward',motion:'full',expression:'original'}).replace('viewBox="-50 -130 1544 1230"','viewBox="-150 -180 1744 1350"')}</div>`;
const sparks=()=>Array.from({length:18},(_,i)=>`<i style="--i:${i};--x:${5+i*37%90}%;--y:${8+i*19%74}%;--delay:${(i%6)*.18}s" aria-hidden="true">${i%3?'✦':'✧'}</i>`).join('');
const chest=()=>`<div class="curtain-chest" aria-hidden="true"><div class="curtain-chest-halo"></div><div class="curtain-chest-lid">${icon('spark')}</div><div class="curtain-chest-base"><span>${icon('star')}</span></div><div class="curtain-chest-light"></div></div>`;
export function celebrationMarkup(s,{statistics='',mini='',reduced=false}={}){
 const phase=s.phase||'congrats',done=phase==='keepsake',active=phase==='dance'||phase==='opening';
 const theme=Object.hasOwn(TREASURE_THEMES,s.theme)?s.theme:'starlight';
 const title=phase==='congrats'?'10关全通关啦！':phase==='chest'?'有个惊喜送给你':phase==='opening'?'惊喜，打开啦！':phase==='dance'?'这支舞，送给你！':'花园守护者，就是你！';
 const subtitle=phase==='congrats'?'看，我们的花园全亮啦！':phase==='chest'?'谢谢你，一次次认真想办法。':phase==='opening'?'星光正在变成舞台……':phase==='dance'?'暖尾尾和你一起庆祝。':'10张卡，记着你每一次努力。';
 return `<section class="curtain curtain-${theme} ${s.paused?'paused':''}" data-celebration-phase="${phase}" aria-labelledby="curtain-title">
  <header class="curtain-heading"><p class="curtain-kicker">${done?'属于你们的礼物':'你和暖尾尾的闪亮时刻'}</p><h1 id="curtain-title">${title}</h1><p>${subtitle}</p></header>
  <div class="curtain-stage ${reduced?'curtain-still':''}" aria-label="${done?'暖尾尾送给你的花园守护者纪念章':active?'暖尾尾挥手、拍手、踏步、跳跃和鞠躬的星光舞台':phase==='congrats'?'十张魔法卡汇成星光，庆祝你点亮花园':'等待你亲手打开的百宝箱'}">
   <div class="curtain-aurora-rays" aria-hidden="true"></div><div class="curtain-sparks" aria-hidden="true">${sparks()}</div><div class="curtain-floor" aria-hidden="true"></div>
   ${phase==='congrats'?`<div class="curtain-card-ring" aria-hidden="true">${Array.from({length:10},(_,i)=>`<span style="--card:${i}">${emblem(i+1)}</span>`).join('')}</div><div class="curtain-success" aria-hidden="true">10 <span>✓</span></div>${dancer()}`:done?`<div class="curtain-keepsake">${guardianBadgeMarkup()}<p>谢谢你，魔法伙伴！</p></div>`:phase==='chest'?`${chest()}<p class="curtain-chest-whisper">里面会是什么呢？</p>`:`${chest()}${dancer()}<div class="curtain-notes" aria-hidden="true"><span>♫</span><span>♪</span></div>`}
  </div>
  <div class="curtain-controls">${phase==='congrats'?`<button class="primary" data-action="treasure-reveal">看看惊喜${icon('arrow')}</button>`:phase==='chest'?`<button class="primary curtain-open" data-action="treasure-open">打开百宝箱${icon('chest')}</button>`:active?`<button class="secondary" data-action="treasure-pause" aria-pressed="${s.paused}">${icon(s.paused?'play':'pause')}${s.paused?'接着跳':'暂停一下'}</button><button class="primary" data-action="treasure-skip">收好惊喜${icon('check')}</button>`:`<button class="primary" data-action="treasure-collection" aria-expanded="${s.collection}">${s.collection?'收起收藏':'看看我的收藏'}${icon('chest')}</button><button class="secondary" data-action="nav" data-view="home">回花园${icon('leaf')}</button>`}</div>
  ${!done?`<p class="curtain-caption">${phase==='congrats'?'你做到了！为自己拍拍手吧。':phase==='chest'?'准备好了，就亲手打开吧。':s.paused?'停在这里，等你准备好。':'可以随时收好，惊喜都会留下。'}</p><button class="text-button curtain-leave" data-action="nav" data-view="home">回花园</button>`:`<details class="curtain-more"><summary>更多惊喜</summary><button class="text-button" data-action="treasure-replay">${icon('play')}再看一次星光舞</button><div class="curtain-themes" role="group" aria-label="换一片天空">${Object.entries(TREASURE_THEMES).map(([key,item])=>`<button class="secondary" data-action="treasure-theme" data-theme="${key}" aria-pressed="${key===theme}">${item.name}</button>`).join('')}</div>${mini}<details class="curtain-records"><summary>看看这一程的小脚印</summary>${statistics}</details></details>${s.collection?galleryMarkup():''}`}
 </section>`;
}
