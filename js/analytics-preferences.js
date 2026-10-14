export const GOOGLE_CONSENT_KEY='nuanweiwei.math-garden.google-analytics.v1';
export const GOOGLE_CONSENT_EVENT='garden:google-analytics-consent';
export function privacyBlocked(page){return ['1','yes'].includes(String(page.navigator?.doNotTrack??page.doNotTrack).toLowerCase())||page.navigator?.globalPrivacyControl===true;}
export function readGoogleConsent(page){try{return page.localStorage.getItem(GOOGLE_CONSENT_KEY)==='allow';}catch{return false;}}
export function writeGoogleConsent(allowed,page){
 try{page.localStorage.setItem(GOOGLE_CONSENT_KEY,allowed?'allow':'deny');page.dispatchEvent(new page.CustomEvent(GOOGLE_CONSENT_EVENT));return true;}catch{return false;}
}
export function googleConsentMarkup(page,message=''){
 const allowed=readGoogleConsent(page),blocked=privacyBlocked(page);
 return `<section class="analytics-settings" aria-label="访问统计选择"><h3>给家长：访问统计</h3><p>Umami提供不使用Cookie的基础访问量。您也可允许Google Analytics使用本游戏的第一方统计Cookie，查看访问量与设备等汇总数据；广告功能关闭，不发送题目、答案或存档。</p><button class="secondary" data-action="google-consent-toggle" aria-pressed="${allowed}">${allowed?'关闭Google访问统计':'允许Google访问统计'}</button><p class="analytics-status" role="status">${message||(blocked?'浏览器已要求不跟踪，当前不发送访问统计。':allowed?'已允许Google访问统计。关闭后立即停用，并移除本游戏的Google统计Cookie。':'Google访问统计尚未允许，不加载Google代码。不开启也能正常玩。')}</p></section>`;
}
