import {duration,ensureJourneyRecord,ensureSessionTiming,ensureFinishSnapshot} from './journey-records.js?v=20261016-3';
const anchors=new WeakMap();
export const MAX_CONFIRMED_GAP_MS=20_000;
const defaultNow=()=>globalThis.performance?.now?.()??0;
function flush(state,anchor){
 if(!anchor?.active)return 0;const now=anchor.now(),delta=Math.floor(now-anchor.last);anchor.last=now;
 if(!Number.isFinite(now)||delta<0)return 0;
 const t=anchor.session?.practiceTiming;if(delta>MAX_CONFIRMED_GAP_MS){if(t)t.questionComplete=false;return 0;}
 const r=ensureJourneyRecord(state);if(!t||!duration(delta)||!duration(t.elapsedMs+delta)||!duration(r.elapsedMs+delta))return 0;
 t.elapsedMs+=delta;t.questionMs+=delta;r.elapsedMs+=delta;return delta;
}
export function checkpointPracticeTime(state){return flush(state,anchors.get(state));}
export function pausePracticeTime(state){const a=anchors.get(state);const elapsed=flush(state,a);if(a)a.active=false;return elapsed;}
export function completeQuestionTiming(state){
 const a=anchors.get(state);if(a)a.active=false;
 const t=state.session?.practiceTiming,time=t?{ms:t.questionMs,complete:t.questionComplete&&t.questionTracked}:{ms:0,complete:false};
 if(t){t.resultTimes.push(time);t.questionMs=0;t.questionTracked=false;}return time;
}
export function createPracticeClock({now=defaultNow}={}){
 let current=null;
 const pause=state=>pausePracticeTime(state||current);
 return {
  sync(state,active){
   if(current&&current!==state)pausePracticeTime(current);current=state;
   if(!state)return 0;
   const s=state.session,allowed=!!active&&s&&!s.completed&&!s.feedback?.correct;
   if(!allowed)return pausePracticeTime(state);
   let a=anchors.get(state);if(a&&a.session!==s){pausePracticeTime(state);a=null;}
   if(a?.active)flush(state,a);
   ensureFinishSnapshot(state);ensureJourneyRecord(state);const t=ensureSessionTiming(state);t.questionTracked=true;
   if(!a){a={session:s,active:false,last:0,now};anchors.set(state,a);}a.now=now;a.session=s;a.last=now();a.active=true;return 0;
  },
  checkpoint(state=current){return state?checkpointPracticeTime(state):0;},
  pause,
  isActive(state=current){return !!state&&anchors.get(state)?.active===true;},
 };
}
