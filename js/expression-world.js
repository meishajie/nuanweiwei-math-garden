import {ALBUM_COVERS,getAlbum} from './album-gallery.js?v=20261014-6';
import {icon} from './art.js?v=20261014-4';

export const WORLD_SLIDE_MS=1500;
export const WORLD_CHAPTERS=Object.freeze([
 {id:'joy',title:'快乐星球',line:'把开心，装进口袋。',albums:['nw-growth-10','nw-growth-02','nw-growth-06','nw-growth-09','nw-comedy-01','stinky-theater']},
 {id:'brave',title:'勇气工坊',line:'每一次试试，都有新发现。',albums:['nw-growth-03','nw-growth-05','nw-growth-08','little-grownup-at-work','nw-growth-11']},
 {id:'cozy',title:'暖心港湾',line:'累了也没关系，我们陪着你。',albums:['nw-growth-01','nw-growth-04','nw-growth-07','nw-growth-12','warm-cheers']},
 {id:'dream',title:'奇想舞台',line:'还有好多模样，等你发现。',albums:['everyday-parent-replies','home-together','little-flame-online','parent-talk-daily','pony-speaks-dynamic']}
].map(c=>Object.freeze({...c,albums:Object.freeze(c.albums)})));
export const WORLD_TOUR=Object.freeze(WORLD_CHAPTERS.flatMap((chapter,chapterIndex)=>chapter.albums.map(id=>Object.freeze({id,chapterIndex}))));
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createWorld(){return {index:0,slideElapsed:0,ready:false,failed:false,finished:false};}
export function worldScene(s){const stop=WORLD_TOUR[s.index]||WORLD_TOUR[0];return {...stop,album:getAlbum(stop.id),chapter:WORLD_CHAPTERS[stop.chapterIndex]};}
export function loadWorldImage(s,id,ok=true){
 if(s.finished||worldScene(s).id!==id)return false;
 const changed=s.ready!==ok||s.failed===ok;s.ready=ok;s.failed=!ok;return changed;
}
export function selectWorldImage(s,index){
 if(!Number.isInteger(index)||index<0||index>=WORLD_TOUR.length)return false;
 s.index=index;s.slideElapsed=0;s.ready=false;s.failed=false;s.finished=false;return true;
}
export function worldAction(s,action,id){
 if(action==='select')return selectWorldImage(s,WORLD_TOUR.findIndex(stop=>stop.id===id));
 if(action==='previous')return selectWorldImage(s,Math.max(0,s.index-1));
 if(action==='next'){
  if(s.index===WORLD_TOUR.length-1){s.finished=true;return true;}
  return selectWorldImage(s,s.index+1);
 }
 if(action==='retry'){s.ready=false;s.failed=false;return true;}
 return false;
}
// A full image must be visible before its viewing time starts. Never skip an unseen image.
export function advanceWorld(s,delta){
 if(!s.ready||s.finished||!Number.isFinite(delta)||delta<=0)return false;
 s.slideElapsed=Math.min(WORLD_SLIDE_MS,s.slideElapsed+delta);
 return s.slideElapsed>=WORLD_SLIDE_MS?worldAction(s,'next'):false;
}
export function worldMarkup(s,{paused=false,reduced=false}={}){
 const {album,chapter,chapterIndex}=worldScene(s),previous=WORLD_TOUR[(s.index-1+WORLD_TOUR.length)%WORLD_TOUR.length],next=WORLD_TOUR[s.index+1];
 const glimpse=(stop,side)=>`<div class="world-glimpse world-glimpse-${side}" data-world-card="${stop.id}" aria-hidden="true"><img src="${getAlbum(stop.id).full}" alt="" width="240" height="240" decoding="async"></div>`;
 return `<section class="expression-world ${paused?'paused':''} ${reduced?'world-still':''}" data-world-chapter="${chapter.id}" data-world-image="${album.id}" data-world-loaded="${s.failed?'error':s.ready?'ready':'loading'}" aria-labelledby="world-title" style="--world-progress:${s.slideElapsed/WORLD_SLIDE_MS}">
  <header class="world-heading"><p class="world-kicker">你打开了一个新世界</p><h1 id="world-title">暖尾尾的表情世界</h1><div class="world-chapter-label"><span>0${chapterIndex+1}</span><h2>${chapter.title}</h2><p>${chapter.line}</p></div></header>
  <div class="world-screen" aria-label="${escape(chapter.title)}，第${s.index+1}张，共${WORLD_TOUR.length}张">
   <div class="world-sky" aria-hidden="true"><i></i><i></i><i></i></div><div class="world-orbit" aria-hidden="true"></div>
   ${glimpse(previous,'left')}${glimpse(next||WORLD_TOUR[0],'right')}
   <button class="world-picture ${album.nativeOnly?'world-picture-native':''}" data-world-card="${album.id}" data-action="album-open" data-album="${album.id}" aria-label="暂停播放，仔细看${escape(album.title)}" style="--picture-native:${album.width}px">
    <img class="world-full-image" data-world-full="${album.id}" src="${album.full}" alt="${escape(album.title)}的表情代表图" width="${album.width}" height="${album.height}" decoding="async" fetchpriority="high">
    <span class="world-picture-look">${icon('frame')}点图，慢慢看</span>
   </button>
   <div class="world-loading" role="status">${s.failed?'这张图还没来，试试下一张吧。':'星光正在送来大图……'}</div>
   <button class="secondary world-retry" data-action="world-retry">再试一次</button>
   <div class="world-chapter-route" aria-label="四段表情旅行">${WORLD_CHAPTERS.map((c,i)=>`<span class="${i===chapterIndex?'current':i<chapterIndex?'visited':''}" aria-label="${c.title}${i===chapterIndex?'，正在这里':''}"><b>0${i+1}</b><i></i></span>`).join('')}</div>
  </div>
  <div class="world-caption" aria-live="off"><h3>${escape(album.title)}</h3><p>${escape(album.description)}</p></div>
  <div class="world-timeline" aria-hidden="true"><i></i></div>
  <div class="world-controls"><button class="secondary world-neighbor" data-action="world-previous" ${s.index===0?'disabled':''} aria-label="上一张图片">${icon('back')}</button><button class="primary world-play" data-action="world-pause" aria-pressed="${paused}">${icon(paused?'play':'pause')}${paused?'继续参观':'暂停一下'}</button><button class="secondary world-neighbor" data-action="world-next" aria-label="${next?'下一张图片':'看完了，收下纪念章'}">${icon('arrow')}</button></div>
  <footer class="world-footer"><p><span>${s.index+1} / ${ALBUM_COVERS.length}</span><span class="world-playback-note"> · ${paused?'已暂停，等你说继续':'会自动播放，点图片可以停下看'}</span></p><button class="text-button" data-action="treasure-skip">收好惊喜${icon('check')}</button></footer>
  ${next?`<img class="world-preload" src="${getAlbum(next.id).full}" alt="" aria-hidden="true" width="1" height="1" decoding="async">`:''}
 </section>`;
}
