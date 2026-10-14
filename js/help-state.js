// A scratchpad is recoverable independently from the saved journey.
export const MAX_HELP_MARKS=100;
const count=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
export function validHelpState(h,questionId){
 if(h?.version!==undefined&&h.version!==2)return false;
 if(!h||h.questionId!==questionId||![1,2,3].includes(h.tier)||!count(h.step,64)||!Array.isArray(h.marks)||h.marks.length>MAX_HELP_MARKS||new Set(h.marks).size!==h.marks.length||!h.marks.every(n=>count(n,MAX_HELP_MARKS-1))||!count(h.rounds,100)||typeof h.notice!=='string'||h.notice.length>300)return false;
 for(const [key,max] of [['placeTens',10],['placeOnes',19],['moved',100],['cardMask',255],['orderReady',64],['trial',100]])if(h[key]!==undefined&&!count(h[key],max))return false;
 if(h.movedMarks!==undefined&&(!Array.isArray(h.movedMarks)||h.movedMarks.length>100||new Set(h.movedMarks).size!==h.movedMarks.length||!h.movedMarks.every(n=>count(n,99))))return false;
 if(h.manual!==undefined&&typeof h.manual!=='boolean')return false;
 return h.answers===undefined||(Array.isArray(h.answers)&&h.answers.length<=64&&h.answers.every(v=>typeof v==='string'&&v.length<=60));
}
export function newHelpState(q){return {version:2,questionId:q.id,tier:1,step:0,marks:[],rounds:0,notice:''};}
