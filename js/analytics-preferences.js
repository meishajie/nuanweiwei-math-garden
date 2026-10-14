export const GOOGLE_CONSENT_KEY='nuanweiwei.math-garden.google-analytics.v1';
export const GOOGLE_CONSENT_EVENT='garden:google-analytics-consent';
export function privacyBlocked(page){return ['1','yes'].includes(String(page.navigator?.doNotTrack??page.doNotTrack).toLowerCase())||page.navigator?.globalPrivacyControl===true;}
// Keep the original preference key: an earlier explicit denial remains a denial.
// A missing preference uses the owner's default-on policy; unreadable storage
// and unknown values stay disabled rather than overwriting a possible opt-out.
export function readGoogleConsent(page){try{const choice=page.localStorage.getItem(GOOGLE_CONSENT_KEY);return choice===null||choice==='allow';}catch{return false;}}
export function writeGoogleConsent(allowed,page){
 try{page.localStorage.setItem(GOOGLE_CONSENT_KEY,allowed?'allow':'deny');page.dispatchEvent(new page.CustomEvent(GOOGLE_CONSENT_EVENT));return true;}catch{return false;}
}
export function googleConsentMarkup(page,message=''){
 const allowed=readGoogleConsent(page),blocked=privacyBlocked(page);
 return `<section class="analytics-settings" aria-label="访问统计选择"><h3>给家长：访问统计</h3><p>基础访问统计默认开启。Umami不使用Cookie；Google Analytics使用本游戏的第一方统计Cookie，保存1天，统计访问量、停留时间和设备等汇总信息。广告关闭，不发送题目、答案或存档。您可随时关闭Google统计。</p><button class="secondary" data-action="google-consent-toggle" aria-pressed="${allowed}">${allowed?'关闭Google访问统计':'开启Google访问统计'}</button><p class="analytics-status" role="status">${message||(blocked?'浏览器已要求不跟踪，当前不发送访问统计。':allowed?'Google访问统计已开启。关闭后立即停用，并移除本游戏的Google统计Cookie。':'Google访问统计已关闭。关闭不影响游戏和奖励。')}</p></section>`;
}
