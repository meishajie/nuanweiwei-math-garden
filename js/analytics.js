import {ANALYTICS_CONFIG} from './analytics-config.js?v=20261014-12';
import {startGoogleAnalytics} from './google-analytics.js?v=20261014-12';

export const UMAMI_ENDPOINT='https://gateway.umami.is/api/send';
const HOST='meishajie.github.io',PATH='/nuanweiwei-math-garden/';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// An allowlist prevents URL queries, game state, answers or user identifiers
// from entering the request. Browser type is derived by Umami from User-Agent.
export function pageviewPayload({websiteId,hostname,pathname,doNotTrack,globalPrivacyControl}={}){
 if(!UUID.test(websiteId||'')||hostname!==HOST||![PATH,`${PATH}index.html`].includes(pathname))return null;
 if(['1','yes'].includes(String(doNotTrack).toLowerCase())||globalPrivacyControl===true)return null;
 return {type:'event',payload:{website:websiteId,hostname:HOST,url:PATH,title:'暖尾尾的数字魔法花园'}};
}

// One pageview per loaded game document, not per question, view or UI redraw.
// Analytics has no dependency on the game engine and never blocks rendering.
export function startPageview(config,page){
 const body=()=>pageviewPayload({websiteId:config?.websiteId,hostname:page.location?.hostname,pathname:page.location?.pathname,doNotTrack:page.navigator?.doNotTrack??page.doNotTrack,globalPrivacyControl:page.navigator?.globalPrivacyControl});
 if(!body()||typeof page.fetch!=='function')return ()=>{};
 let stopped=false,sent=false,pending=null,idle=false,controller=null,deadline=null;
 const removeListeners=()=>{page.removeEventListener('load',schedule);page.document.removeEventListener('visibilitychange',schedule);};
 const send=()=>{
  pending=null;
  if(stopped||sent||page.document.visibilityState!=='visible')return;
  const payload=body();if(!payload){removeListeners();return;}
  sent=true;removeListeners();
  controller=new page.AbortController();deadline=page.setTimeout(()=>controller.abort(),4000);
  try{
   Promise.resolve(page.fetch(UMAMI_ENDPOINT,{method:'POST',mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal}))
    .catch(()=>{}).finally(()=>page.clearTimeout(deadline));
  }catch{page.clearTimeout(deadline);}
 };
 function schedule(){
  if(stopped||sent||pending!==null||page.document.readyState!=='complete'||page.document.visibilityState!=='visible')return;
  idle=typeof page.requestIdleCallback==='function';pending=idle?page.requestIdleCallback(send,{timeout:2000}):page.setTimeout(send,0);
 }
 page.addEventListener('load',schedule);page.document.addEventListener('visibilitychange',schedule);schedule();
 return ()=>{stopped=true;removeListeners();if(pending!==null){if(idle)page.cancelIdleCallback(pending);else page.clearTimeout(pending);}if(deadline!==null)page.clearTimeout(deadline);controller?.abort();};
}

if(typeof window!=='undefined'){
 try{startPageview(ANALYTICS_CONFIG,window);}catch{/* Analytics failure must not affect the game. */}
 try{startGoogleAnalytics(ANALYTICS_CONFIG,window);}catch{/* Google never blocks Umami or the game. */}
}
