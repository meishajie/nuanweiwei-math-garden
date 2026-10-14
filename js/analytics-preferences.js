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
