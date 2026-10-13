import * as old from './engine-legacy.js?v=20261013-1';
import {courseProfile,availableTopics,priorTopics,bankTopics} from './course-catalog.js?v=20261013-1';
import {courseBank,courseSignature,lookupCourseQuestion,courseExplanation} from './course-questions.js?v=20261013-1';
import {answerTotals} from './round-summary.js?v=20261013-1';
export {QuestionPoolExhaustedError,markHint,currentQuestion} from './engine-legacy.js?v=20261013-1';
const equalTree=(a,b)=>a===b||(a&&b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&equalTree(a[k],b[k])));
const clone=x=>JSON.parse(JSON.stringify(x)),isCourse=q=>q?.format==='course-v1',lookup=id=>lookupCourseQuestion(id)||old.legacyLookup(id);
export function stageStatus(state,id){return state.courseSettings?(state.stages[id]?.visits?'practicing':'new'):old.stageStatus(state,id);}
export const questionKey=q=>isCourse(q)?courseSignature(q):old.questionKey(q);
export const questionSignature=q=>isCourse(q)?courseSignature(q):old.questionSignature(q);
export const isCorrectAnswer=(q,choice)=>isCourse(q)?Number.isInteger(choice)&&choice===q.answer:old.isCorrectAnswer(q,choice);
export const explain=(q,choice)=>isCourse(q)?courseExplanation(q):old.explain(q,choice);
export function createState(grade=1){return grade<4?old.createState(grade):{version:1,grade,completedQuestions:0,rounds:0,cards:[],stages:{},settings:{sound:false,motion:'system'},session:null};}
const stage=()=>({independent:0,supported:0,completedRounds:0,visits:0,reviewCursor:0,ready:false,steady:false,needReview:false,readyAt:null,readyRound:null,readyQuestionKeys:[],lastSeenAt:null,lastRound:null,lastQuestionId:null,recent:[]});
function shuffle(rows,rng){const out=[...rows];for(let i=out.length-1;i>0;i--){const n=rng();if(!Number.isFinite(n)||n<0||n>=1)throw new RangeError('Invalid rng');const j=Math.floor(n*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
export function beginSession(state,id,options={}){
 if(!options.course&&!state.courseSettings&&state.grade!==4)return old.beginSession(state,id,options);
 if(!Number.isInteger(id)||id<1||id>10)throw new RangeError('Invalid level');
 const profile=courseProfile(state.grade,{...(options.course||state.courseSettings||{}),difficulty:options.difficulty||state.difficulty||'standard'}),bank=courseBank(profile,id),topics=availableTopics(profile),focus=topics[(id-1)%topics.length],rng=options.rng||Math.random;
 const seen=new Set([...(state.seenQuestionSignatures||[]),...(!state.courseVersion&&state.grade<4?old.legacySeen(state):[])]),selected=[],used=new Set();
 const take=pool=>{const unique=new Map();for(const q of pool){const sig=questionSignature(q);if(!seen.has(sig)&&!used.has(sig))unique.set(sig,q);}const picked=shuffle([...unique.values()],rng)[0];if(picked){used.add(questionSignature(picked));selected.push(clone(picked));}return picked;};
 for(let i=0;i<4;i++)take(bank.filter(q=>q.topicId===focus));
 if(selected.length===4)take(bank.filter(q=>priorTopics(profile).includes(q.topicId)));
 while(selected.length<5)if(!take(bank))throw new old.QuestionPoolExhaustedError();
 // One spaced review, at least three completed problems after its anchor.
 const observations=Object.values(state.topicRecords||{}).filter(r=>r.textbook===profile.textbook&&r.grade===profile.grade&&bankTopics(profile).includes(r.topicId)&&r.needReview&&state.completedQuestions-r.lastSeenAt>=3);
 let review=null,reviewQuestion=null;for(const r of observations){const picked=take(bank.filter(q=>q.topicId===r.topicId));if(picked){review=r;reviewQuestion=picked;break;}}
 if(!review&&!take(bank))throw new old.QuestionPoolExhaustedError();
 const questions=shuffle(selected,rng);questions[3].review=true;
 if(review){const reviewIndex=questions.findIndex(q=>q.id===reviewQuestion.id);if(reviewIndex>=0){[questions[3],questions[reviewIndex]]=[questions[reviewIndex],questions[3]];questions.forEach((q,i)=>q.review=i===3);}}
 state.courseVersion=1;state.courseSettings={textbook:profile.textbook,phase:profile.phase};state.difficulty=profile.difficulty;state.rounds++;
 const s=state.stages[id]||(state.stages[id]=stage());s.visits++;
 state.session={mode:'course-v1',grade:state.grade,levelId:id,roundId:state.rounds,profile,index:0,questions,results:[],assisted:false,attempts:0,carriedAttempts:0,wrongChoices:[],feedback:null,completed:false,reviewEvidence:review?{topicId:review.topicId,anchorAt:review.lastSeenAt,anchorRound:review.lastRound}:null,hintState:null};
 state.seenQuestionSignatures=[...new Set([...seen,...questions.map(questionSignature)])];return state.session;
}
export function submitAnswer(state,choice){
 const s=state.session,q=old.currentQuestion(state);if(!isCourse(q))return old.submitAnswer(state,choice);
 if(!q||s.feedback?.correct||!Number.isInteger(choice)||!q.choices.includes(choice)||s.wrongChoices.includes(choice))return {correct:!!s.feedback?.correct,ignored:true};
 s.attempts++;if(!isCorrectAnswer(q,choice)){s.wrongChoices.push(choice);old.markHint(state);s.feedback={correct:false};return {correct:false};}
 s.feedback={correct:true};const totals=answerTotals(state);state.answerStats={firstTry:totals.firstTry,retried:totals.retried,unknown:totals.unknown};state.answerStats[s.attempts===1?'firstTry':'retried']++;state.completedQuestions++;
 const result={questionId:q.id,levelId:q.levelId,review:q.review,correct:true,choice,independent:!s.assisted&&s.attempts===1,assisted:s.assisted,attempts:s.attempts,sequence:state.completedQuestions,roundId:s.roundId};s.results.push(result);
 const st=state.stages[q.levelId];st[result.independent?'independent':'supported']++;st.needReview=!result.independent;st.steady=false;st.lastSeenAt=result.sequence;st.lastRound=s.roundId;st.lastQuestionId=q.id;st.recent.push(result);st.recent=st.recent.slice(-12);
 state.topicRecords||={};const key=`${q.profile.textbook}:${q.grade}:${q.topicId}`,record=state.topicRecords[key]||{textbook:q.profile.textbook,grade:q.grade,topicId:q.topicId,independent:0,supported:0};record[result.independent?'independent':'supported']++;record.needReview=!result.independent;record.lastSeenAt=result.sequence;record.lastRound=s.roundId;state.topicRecords[key]=record;return {correct:true};
}
export function advance(state){
 if(state.session?.mode!=='course-v1')return old.advance(state);
 const s=state.session;if(s.completed)return {completed:true,newCard:false};if(!s.feedback?.correct)return {completed:false,newCard:false};
 if(s.index<5){s.index++;s.assisted=false;s.attempts=0;s.carriedAttempts=0;s.wrongChoices=[];s.feedback=null;s.hintState=null;return {completed:false,newCard:false};}
 s.completed=true;state.stages[s.levelId].completedRounds++;const newCard=!state.cards.includes(s.levelId);if(newCard)state.cards.push(s.levelId);state.cards.sort((a,b)=>a-b);
 state.coaching||={rounds:[],completedCount:0,lastSuggestedAt:0};const c=state.coaching;c.completedCount=(c.completedCount||0)+1;c.rounds.push({independent:s.results.filter(r=>r.independent).length,supported:s.results.filter(r=>!r.independent).length,difficulty:s.profile.difficulty,textbook:s.profile.textbook,phase:s.profile.phase});c.rounds=c.rounds.slice(-2);return {completed:true,newCard};
}
export function difficultySuggestion(state){
 const c=state.coaching;if(!c||c.rounds.length<2||c.completedCount-(c.lastSuggestedAt||0)<2)return null;
 const current=state.difficulty||'standard',r=c.rounds;if(r.some(v=>v.difficulty!==current||v.textbook!==state.courseSettings?.textbook||v.phase!==state.courseSettings?.phase))return null;
 const ds=['easy','standard','challenge'],index=ds.indexOf(current);
 if(index<2&&r.every(v=>v.independent>=5))return ds[index+1];if(index>0&&r.every(v=>v.supported>=3))return ds[index-1];return null;
}
export function dismissSuggestion(state){if(state.coaching)state.coaching.lastSuggestedAt=state.coaching.completedCount||0;}
export function resetQuestionCycle(state){if(!state.courseVersion)return old.resetQuestionCycle(state);state.questionCycle=(state.questionCycle||0)+1;state.seenQuestionSignatures=(state.session?.questions||[]).map(questionSignature);}
export function hydrate(input,options={}){
 const grade=options.grade??1;let raw;try{if(typeof input==='string'&&input.length>4000000)throw Error();raw=typeof input==='string'?JSON.parse(input):input;}catch{return createState(grade);}
 if(!raw?.courseVersion){const state=grade<4?old.hydrate(raw,options):createState(grade);try{if(raw?.courseSettings){const p=courseProfile(grade,raw.courseSettings);state.courseSettings={textbook:p.textbook,phase:p.phase};}}catch{}return state;}
 try{
  const check=b=>{if(!b)throw Error('Invalid course save');};const counter=v=>Number.isSafeInteger(v)&&v>=0&&v<=1000000000;check(raw.courseVersion===1&&raw.version===1&&raw.grade===grade&&[1,2,3,4].includes(grade));
  const p=courseProfile(grade,{...raw.courseSettings,difficulty:raw.difficulty}),state=clone(raw);check(Number.isSafeInteger(raw.completedQuestions)&&raw.completedQuestions>=0&&Number.isSafeInteger(raw.rounds)&&raw.rounds>=0);check(raw.settings&&typeof raw.settings.sound==='boolean'&&['system','reduce','full'].includes(raw.settings.motion));check(raw.stages&&Object.keys(raw.stages).length<=10&&Array.isArray(raw.cards)&&new Set(raw.cards).size===raw.cards.length);
  let completed=0,visits=0;
  for(const [key,st] of Object.entries(state.stages)){check(/^(10|[1-9])$/.test(key));for(const k of ['independent','supported','completedRounds','visits'])check(Number.isSafeInteger(st[k])&&st[k]>=0);completed+=st.independent+st.supported;visits+=st.visits;check(st.completedRounds<=st.visits&&st.visits<=state.rounds&&st.completedRounds*5<=st.independent+st.supported);for(const k of ['ready','steady','needReview'])check(typeof st[k]==='boolean');check(Array.isArray(st.readyQuestionKeys));check(Array.isArray(st.recent)&&st.recent.length<=12);for(const record of st.recent){const q=lookup(record.questionId);check(q&&(q.grade??1)===grade&&q.levelId===Number(key)&&isCorrectAnswer(q,record.choice)&&record.correct===true&&Number.isInteger(record.choice)&&typeof record.independent==='boolean'&&typeof record.assisted==='boolean'&&Number.isInteger(record.attempts)&&record.attempts>=1&&record.attempts<=24&&counter(record.sequence)&&record.sequence>0&&record.sequence<=state.completedQuestions&&counter(record.roundId)&&record.roundId>0&&record.roundId<=state.rounds&&record.independent===(!record.assisted&&record.attempts===1));}}
  check(completed===state.completedQuestions&&visits===state.rounds&&raw.cards.every(id=>id>=1&&id<=10&&state.stages[id]?.completedRounds>0));check(Array.isArray(raw.seenQuestionSignatures)&&raw.seenQuestionSignatures.length<=150000&&raw.seenQuestionSignatures.every(k=>typeof k==='string'&&k.length<500));
  const s=state.session;check(s&&typeof s.assisted==='boolean'&&typeof s.completed==='boolean'&&(s.feedback===null||typeof s.feedback?.correct==='boolean')&&Number.isInteger(s.index)&&s.mode==='course-v1'&&s.grade===grade&&s.roundId===state.rounds&&s.index>=0&&s.index<=5&&s.questions.length===6&&s.results.length===s.index+(s.feedback?.correct?1:0));courseProfile(grade,s.profile);
  s.questions=s.questions.map((saved,i)=>{const q=lookupCourseQuestion(saved.id);check(q&&q.grade===grade&&q.levelId===s.levelId&&equalTree(q.profile,s.profile)&&equalTree({...saved,review:false},q));return {...q,review:i===3};});
  check(new Set(s.questions.map(questionSignature)).size===6&&Array.isArray(s.wrongChoices)&&new Set(s.wrongChoices).size===s.wrongChoices.length&&s.wrongChoices.every(v=>s.questions[s.index].choices.includes(v)&&!isCorrectAnswer(s.questions[s.index],v))&&s.attempts===s.wrongChoices.length+(s.feedback?.correct?1:0)&&(!s.wrongChoices.length||s.assisted));
  for(let i=0;i<s.results.length;i++){const r=s.results[i];check(r.questionId===s.questions[i].id&&isCorrectAnswer(s.questions[i],r.choice)&&state.stages[r.levelId].recent.some(v=>equalTree(v,r)));}
  if(s.hintState){const h=s.hintState;check(h.questionId===s.questions[s.index].id&&[1,2,3].includes(h.tier)&&counter(h.step)&&h.step<=30&&Array.isArray(h.marks)&&h.marks.length<=20&&new Set(h.marks).size===h.marks.length&&h.marks.every(n=>Number.isInteger(n)&&n>=0&&n<20)&&counter(h.rounds)&&h.rounds<=100&&typeof h.notice==='string'&&h.notice.length<=200&&(h.placeTens===undefined||(counter(h.placeTens)&&h.placeTens<=10))&&(h.placeOnes===undefined||(counter(h.placeOnes)&&h.placeOnes<=19)));}
  if(state.topicRecords){check(typeof state.topicRecords==='object'&&!Array.isArray(state.topicRecords)&&Object.keys(state.topicRecords).length<=150);for(const [key,r] of Object.entries(state.topicRecords)){check(key===`${r.textbook}:${grade}:${r.topicId}`&&r.grade===grade&&['bnu','pep','su'].includes(r.textbook)&&counter(r.independent)&&counter(r.supported)&&r.independent+r.supported<=state.completedQuestions&&typeof r.needReview==='boolean'&&counter(r.lastSeenAt)&&r.lastSeenAt<=state.completedQuestions&&counter(r.lastRound)&&r.lastRound<=state.rounds);}}
  if(state.coaching){const c=state.coaching;check(counter(c.completedCount)&&c.completedCount<=state.rounds&&counter(c.lastSuggestedAt)&&c.lastSuggestedAt<=c.completedCount&&Array.isArray(c.rounds)&&c.rounds.length<=2);for(const r of c.rounds){courseProfile(grade,r);check(counter(r.independent)&&counter(r.supported)&&r.independent+r.supported===6);}}
  check(!s.completed||(s.index===5&&s.feedback?.correct&&s.results.length===6));state.courseSettings={textbook:p.textbook,phase:p.phase};return state;
 }catch{return createState(grade);}
}
