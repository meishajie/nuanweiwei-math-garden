const count=n=>Number.isSafeInteger(n)&&n>=0&&n<=1_000_000_000;
export const duration=n=>Number.isSafeInteger(n)&&n>=0&&n<=1_000_000_000_000;
const clone=v=>JSON.parse(JSON.stringify(v));
export function answerTotals(state){
 const total=state?.completedQuestions||0,recent=Object.values(state?.stages||{}).flatMap(s=>s.recent||[]),firstTry=recent.filter(r=>r.attempts===1).length,retried=recent.filter(r=>r.attempts>1).length,saved=state?.answerStats;
 if(saved&&[saved.firstTry,saved.retried,saved.unknown].every(count)&&saved.firstTry+saved.retried+saved.unknown===total&&saved.firstTry>=firstTry&&saved.retried>=retried)return {total,firstTry:saved.firstTry,retried:saved.retried,unknown:saved.unknown};
 return {total,firstTry,retried,unknown:Math.max(0,total-firstTry-retried)};
}
function trim(values){while(values.length>1&&values.at(-1)===0)values.pop();return values;}
function validRecord(r,total){return r?.version===1&&r.total===total&&count(r.total)&&Array.isArray(r.byErrors)&&r.byErrors.length>=1&&r.byErrors.length<=64&&r.byErrors.every(count)&&count(r.retriedKnown)&&r.retriedKnown>=r.byErrors.slice(1).reduce((a,b)=>a+b,0)&&(r.byErrors[0]||0)+r.retriedKnown<=total&&count(r.unknownErrors)&&r.byErrors.reduce((a,b)=>a+b,0)+r.unknownErrors===total&&duration(r.elapsedMs)&&count(r.unknownTiming)&&r.unknownTiming<=total;}
function recentMinimums(state,through=state.completedQuestions){
 const byErrors=[0],seen=new Set();for(const r of Object.values(state.stages||{}).flatMap(s=>s.recent||[])){if(seen.has(r.sequence)||r.sequence>through||!Number.isInteger(r.attempts)||r.attempts<1||r.attempts>64)continue;seen.add(r.sequence);const k=r.attempts-1;while(byErrors.length<=k)byErrors.push(0);byErrors[k]++;}return byErrors;
}
function validForState(r,state){
 if(!validRecord(r,state.completedQuestions))return false;const totals=answerTotals(state);
 return r.byErrors[0]>=totals.firstTry&&r.retriedKnown>=totals.retried&&recentMinimums(state).every((n,i)=>n<=(r.byErrors[i]||0));
}
function historyRecord(state){
 const totals=answerTotals(state),byErrors=[totals.firstTry],seen=new Set();
 for(const r of Object.values(state?.stages||{}).flatMap(s=>s.recent||[])){if(seen.has(r.sequence)||!Number.isInteger(r.attempts)||r.attempts<2||r.attempts>64)continue;seen.add(r.sequence);const k=r.attempts-1;while(byErrors.length<=k)byErrors.push(0);byErrors[k]++;}
 const known=byErrors.reduce((a,b)=>a+b,0);
 return {version:1,total:totals.total,byErrors:trim(byErrors),retriedKnown:totals.retried,unknownErrors:Math.max(0,totals.total-known),elapsedMs:0,unknownTiming:totals.total};
}
export function readJourneyRecord(state){return state&&validForState(state.journeyStats,state)?state.journeyStats:historyRecord(state);}
export function ensureJourneyRecord(state){if(!validForState(state.journeyStats,state))state.journeyStats=historyRecord(state);return state.journeyStats;}
export function validSessionTiming(t,s){
 return t?.version===1&&Array.isArray(s?.results)&&duration(t.elapsedMs)&&duration(t.questionMs)&&t.questionIndex===s.index&&typeof t.questionComplete==='boolean'&&typeof t.questionTracked==='boolean'&&Array.isArray(t.resultTimes)&&t.resultTimes.length===s.results.length&&t.resultTimes.every(r=>duration(r.ms)&&typeof r.complete==='boolean')&&t.resultTimes.reduce((sum,r)=>sum+r.ms,0)+t.questionMs===t.elapsedMs&&(!s.feedback?.correct||t.questionMs===0);
}
export function ensureSessionTiming(state,{fresh=false}={}){
 const s=state?.session;if(!s)return null;
 if(!validSessionTiming(s.practiceTiming,s))s.practiceTiming={version:1,elapsedMs:0,questionMs:0,questionIndex:s.index,questionComplete:fresh,questionTracked:false,resultTimes:s.results.map(()=>({ms:0,complete:false}))};
 return s.practiceTiming;
}
export function ensureFinishSnapshot(state,{legacy=true}={}){
 if((state?.cards?.length||0)<10||state.finishStats)return state?.finishStats||null;
 const record=ensureJourneyRecord(state);state.finishStats={...clone(record),grade:state.grade||1,cardCount:10,legacy};return state.finishStats;
}
export function prepareAnswerTracking(state){ensureFinishSnapshot(state);ensureJourneyRecord(state);ensureSessionTiming(state);}
export function startRoundTracking(state){ensureFinishSnapshot(state);ensureJourneyRecord(state);ensureSessionTiming(state,{fresh:true});}
export function recordCompletedAnswer(state,result,time){
 const r=state.journeyStats;
 if(!r||r.total!==state.completedQuestions-1){state.journeyStats=historyRecord(state);return;}
 const errors=Number.isInteger(result.attempts)&&result.attempts>=1&&result.attempts<=64?result.attempts-1:null;
 if(errors===null)r.unknownErrors++;else{while(r.byErrors.length<=errors)r.byErrors.push(0);r.byErrors[errors]++;if(errors>0)r.retriedKnown++;}
 r.total++;if(!time?.complete)r.unknownTiming++;
}
export function nextQuestionTracking(state){const t=state.session?.practiceTiming;if(t){t.questionIndex=state.session.index;t.questionMs=0;t.questionComplete=true;t.questionTracked=false;}}
export function restoreOptionalTracking(state,raw){
 if(raw?.journeyStats&&validForState(raw.journeyStats,state))state.journeyStats=clone(raw.journeyStats);else delete state.journeyStats;
 if(state.session){const t=raw?.session?.practiceTiming,r=state.journeyStats;if(r&&validSessionTiming(t,state.session)&&t.elapsedMs<=r.elapsedMs&&t.resultTimes.filter(v=>!v.complete).length<=r.unknownTiming)state.session.practiceTiming=clone(t);else delete state.session.practiceTiming;}
 const f=raw?.finishStats,r=state.journeyStats;
 if(f&&r&&(state.cards?.length||0)===10&&f.grade===(state.grade||1)&&f.cardCount===10&&typeof f.legacy==='boolean'&&count(f.total)&&f.total<=state.completedQuestions&&validRecord(f,f.total)&&f.elapsedMs<=r.elapsedMs&&f.unknownErrors<=r.unknownErrors&&f.unknownTiming<=r.unknownTiming&&f.retriedKnown<=r.retriedKnown&&f.byErrors.every((n,i)=>n<=(r.byErrors[i]||0))&&recentMinimums(state,f.total).every((n,i)=>n<=(f.byErrors[i]||0)))state.finishStats=clone(f);else delete state.finishStats;
 return state;
}
export function summaryFromRecord(record,{frozen=false,legacy=false}={}){
 const distribution=record.byErrors.map((n,errors)=>({errors,count:n,label:errors===0?'一次答对':`错${errors}次后答对`})).filter(r=>r.count>0),firstTry=record.byErrors[0]||0,retried=record.retriedKnown;
 return {total:record.total,firstTry,retried,distribution,unknownErrors:record.unknownErrors,elapsedMs:record.elapsedMs,unknownTiming:record.unknownTiming,timingComplete:record.unknownTiming===0,perfect:record.total>0&&record.unknownErrors===0&&firstTry===record.total,frozen,legacy};
}
export function journeySummary(state){
 const snapshot=state?.finishStats;
 if(snapshot&&validRecord(snapshot,snapshot.total))return summaryFromRecord(snapshot,{frozen:true,legacy:snapshot.legacy});
 const completed=(state?.cards?.length||0)===10;return summaryFromRecord(readJourneyRecord(state),{frozen:completed,legacy:completed});
}
