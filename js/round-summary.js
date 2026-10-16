import {summaryFromRecord,validSessionTiming,journeySummary} from './journey-records.js?v=20261016-3';
export {answerTotals,journeySummary} from './journey-records.js?v=20261016-3';

/** attempts already includes carriedAttempts; help does not change first-try accuracy. */
export function roundSummary(session){
 const results=Array.isArray(session?.results)?session.results:[],answers=results.map((r,i)=>({number:i+1,firstTry:r.attempts===1,retried:r.attempts>1,assisted:r.assisted===true,errors:Number.isInteger(r.attempts)&&r.attempts>=1?r.attempts-1:null}));
 if(!answers.length)return {total:0,firstTry:0,retried:0,assisted:0,answers:[]};
 const byErrors=[0];let unknownErrors=0;for(const r of answers){if(r.errors===null||r.errors>63)unknownErrors++;else{while(byErrors.length<=r.errors)byErrors.push(0);byErrors[r.errors]++;}}
 const timed=validSessionTiming(session.practiceTiming,session),times=timed?session.practiceTiming.resultTimes:answers.map(()=>({ms:0,complete:false}));
 return {...summaryFromRecord({total:answers.length,byErrors,retriedKnown:answers.filter(r=>r.retried).length,unknownErrors,elapsedMs:timed?session.practiceTiming.elapsedMs:0,unknownTiming:times.filter(r=>!r.complete).length}),assisted:answers.filter(r=>r.assisted).length,answers};
}
export function formatPracticeDuration(ms){const seconds=Math.floor(Math.max(0,ms)/1000);if(!seconds)return '不到1秒';if(seconds<60)return `${seconds}秒`;const minutes=Math.floor(seconds/60),rest=seconds%60;return `${minutes}分${rest?`${rest}秒`:''}`;}
function distributionMarkup(summary){
 return `<div class="journey-distribution" aria-label="一次答对 ${summary.firstTry} 题，再试答对 ${summary.retried} 题">${summary.distribution.map(r=>`<div class="journey-distribution-item${r.errors===0?' journey-distribution-first':''}" aria-label="${r.label} ${r.count} 题"><strong>${r.count}</strong><span>${r.label}</span></div>`).join('')}</div>`;
}
function timeMarkup(summary){
 const measured=summary.elapsedMs>0||summary.timingComplete,text=measured?`${summary.timingComplete?'练习用时':'已记录用时'} <strong>${formatPracticeDuration(summary.elapsedMs)}</strong>`:'<strong>用时尚未记录</strong>';
 return `<p class="journey-time">${text}</p>${summary.unknownTiming?`<p class="journey-unknown">此前 ${summary.unknownTiming} 题用时未记录</p>`:''}`;
}
export function journeySummaryMarkup(summary,{compact=false}={}){
 if(!summary?.total)return '';
 return `<section class="journey-summary${summary.perfect?' journey-summary-perfect':''}${compact?' journey-summary-compact':''}" aria-label="这一程的答题统计"><header><h2>这一程 · ${summary.total}题</h2></header>${distributionMarkup(summary)}${summary.unknownErrors?`<p class="journey-unknown">旧记录 ${summary.unknownErrors} 题 · 错几次未记录</p>`:''}${timeMarkup(summary)}<p class="journey-scope">含重玩与复习${summary.legacy?' · 旧版累计记录':''}</p></section>`;
}
export function roundSummaryMarkup(session){
 const summary=roundSummary(session);if(!summary.total)return '';
 const markers=summary.answers.map(r=>`<li class="round-summary-answer round-summary-${r.firstTry?'first':'retry'}" aria-label="第${r.number}题：${r.firstTry?'第一次答对':'第一次没答对，后来完成了'}"><span aria-hidden="true">${r.firstTry?'★':'↻'}</span></li>`).join('');
 return `<section class="round-summary${summary.perfect?' round-summary-perfect':''}" aria-label="这一趟的答题统计"><header><h2>${summary.perfect?'一次答对每一道！':'完成啦！'}</h2><span class="summary-total" aria-label="共完成 ${summary.total} 道题">${summary.total}<small>题</small></span></header><ol class="round-summary-answers">${markers}</ol>${distributionMarkup(summary)}${summary.unknownErrors?`<p class="journey-unknown">错几次未记录：${summary.unknownErrors}题</p>`:''}${timeMarkup(summary)}</section>`;
}
export function gardenSummaryMarkup(state){
 if((state?.cards?.length||0)<10)return '';
 const summary=journeySummary(state);
 return `<section class="round-summary garden-summary" aria-label="当前年级十关答题统计"><header><h2>10 关啦！</h2><span class="summary-total" aria-label="累计完成 ${summary.total} 道题">${summary.total}<small>题</small></span></header><div class="garden-summary-badges" role="img" aria-label="十个地点都已完成">${Array.from({length:10},()=>'<span aria-hidden="true">✦</span>').join('')}</div>${journeySummaryMarkup(summary)}<details class="summary-scope"><summary>给大人看</summary><p>首次集齐十张卡时保存这一程，含此前重玩及复习。先用帮助但第一次提交正确，也算一次答对。只累计前台思考与帮助时间，暂停、设置、后台及庆祝不计时；旧版缺失记录保留未知。</p></details></section>`;
}
