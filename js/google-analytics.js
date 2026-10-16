import {GOOGLE_CONSENT_KEY,GOOGLE_CONSENT_EVENT,readGoogleConsent,privacyBlocked} from './analytics-preferences.js?v=20261016-3';

const HOST='meishajie.github.io',PATH='/nuanweiwei-math-garden/';
export function googleAnalyticsConfig(id){
 if(!/^G-[A-Z0-9]{6,20}$/.test(id||''))return null;
 return {send_page_view:false,page_location:`https://${HOST}${PATH}`,page_path:PATH,page_title:'暖尾尾的数字魔法花园',page_referrer:'',ignore_referrer:true,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_domain:HOST,cookie_path:PATH,cookie_prefix:'nww_math',cookie_expires:86400,cookie_update:false,cookie_flags:'SameSite=Lax;Secure'};
}
export function clearGoogleAnalyticsCookies(id,page){
 if(!googleAnalyticsConfig(id))return;
 for(const name of ['nww_math_ga',`nww_math_ga_${id.slice(2)}`])for(const domain of ['',`; domain=${HOST}`]){
  try{page.document.cookie=`${name}=; Max-Age=0; path=${PATH}${domain}; SameSite=Lax; Secure`;}catch{/* Blocked cookies stay blocked. */}
 }
}
export function startGoogleAnalytics(config,page){
 const id=config?.googleMeasurementId,settings=googleAnalyticsConfig(id);
 if(!settings||page.location?.hostname!==HOST||![PATH,`${PATH}index.html`].includes(page.location?.pathname))return ()=>{};
 let stopped=false,loaded=false,counted=false,active=false,pending=null;
 const disable=()=>{page[`ga-disable-${id}`]=true;if(active){active=false;page.gtag?.('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});}clearGoogleAnalyticsCookies(id,page);};
 const send=()=>{
  pending=null;if(stopped)return;
  if(!readGoogleConsent(page)||privacyBlocked(page)){disable();return;}
  if(page.document.visibilityState!=='visible')return;
  if(active)return;page[`ga-disable-${id}`]=false;active=true;
  if(!loaded){
   loaded=true;page.dataLayer=page.dataLayer||[];
   page.gtag=page.gtag||function(){page.dataLayer.push(arguments);};
   page.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
   page.gtag('set','ads_data_redaction',true);page.gtag('set','url_passthrough',false);
   page.gtag('js',new Date());page.gtag('consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
   page.gtag('config',id,settings);
   const script=page.document.createElement('script');script.async=true;script.referrerPolicy='no-referrer';script.src=`https://www.googletagmanager.com/gtag/js?id=${id}`;script.dataset.gardenAnalytics='google';script.onerror=()=>{};page.document.head.append(script);
  }else page.gtag('consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  if(!counted){counted=true;page.gtag('event','page_view',{send_to:id,page_location:settings.page_location,page_path:PATH,page_title:settings.page_title,page_referrer:''});}
 };
 const schedule=()=>{
  if(stopped)return;
  if(!readGoogleConsent(page)||privacyBlocked(page)){disable();return;}
  if(active||pending!==null||page.document.readyState!=='complete'||page.document.visibilityState!=='visible')return;
  pending=page.setTimeout(send,0);
 };
 const onStorage=event=>{if(event.key===GOOGLE_CONSENT_KEY||event.key===null)schedule();};
 page.addEventListener('load',schedule);page.addEventListener(GOOGLE_CONSENT_EVENT,schedule);page.addEventListener('storage',onStorage);page.document.addEventListener('visibilitychange',schedule);schedule();
 return ()=>{stopped=true;if(pending!==null)page.clearTimeout(pending);disable();page.removeEventListener('load',schedule);page.removeEventListener(GOOGLE_CONSENT_EVENT,schedule);page.removeEventListener('storage',onStorage);page.document.removeEventListener('visibilitychange',schedule);};
}
