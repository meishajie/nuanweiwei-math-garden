import {decimal,calculate,formatValue,valuesEqual} from './course-math.js?v=20261016-3';
import {bankTopics,TOPICS} from './course-catalog.js?v=20261016-3';

// Choice generation is versioned by the C3 question ID. C1/C2 retain their
// original values and order so that a paused journey can be restored exactly.
const scalar=e=>e?.type==='number';
const gcd=(a,b)=>b?gcd(b,a%b):a;
const mod=(n,d)=>(n%d+d)%d;
function seedOf(q,includeStation=false){const parts=q.id.split(':');if(!includeStation)parts[5]='1';let seed=2166136261;for(const c of parts.join(':'))seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;return seed;}
function expressionScale(e){return scalar(e)?e.value.scale:e.op==='*'?expressionScale(e.left)+expressionScale(e.right):Math.max(expressionScale(e.left),expressionScale(e.right));}
function fixed(value,scale){
 const coefficient=value.coefficient*10**(scale-value.scale),digits=String(coefficient).padStart(scale+1,'0');
 return scale?`${digits.slice(0,-scale)}.${digits.slice(-scale)}`:digits;
}
export function choiceDisplayScale(q){
 if(q.answerValue.kind==='remainder')return 0;
 // All options share the precision implied by the problem, including 10.0.
 return Math.max(q.answerValue.scale,expressionScale(q.expression));
}
export function choiceLabels(q,values){return values.map(v=>v.kind==='remainder'?formatValue(v):fixed(v,choiceDisplayScale(q)));}
const limitCache=new Map();
function knownLimits(q){
 const key=`${q.profile.textbook}:${q.profile.grade}:${q.profile.phase}`;if(limitCache.has(key))return limitCache.get(key);
 const topics=bankTopics(q.profile).map(id=>TOPICS[id]);
 const limits={dividend:Math.max(9,...topics.filter(t=>t.family==='divide').map(t=>t.digits===1?81:10**t.digits-1)),
  divisor:Math.max(9,...topics.filter(t=>t.family==='divide').map(t=>t.divisorDigits===2?99:9)),
  sum:Math.max(20,...topics.filter(t=>t.family==='addsub').map(t=>t.max))};
 limitCache.set(key,limits);return limits;
}
function domain(q,t,scale){
 const factor=10**scale,e=q.expression,c=q.answerValue.coefficient*10**(scale-q.answerValue.scale),limits=knownLimits(q);
 let low=q.answerValue.coefficient===0?0:1,high=Math.max(c*2,c+30*factor),step=1,divisors=null;
 if(t.family==='addsub')high=t.max*factor;
 if(q.blank==='result'){
  if(t.family==='multiply')high=(t.maxResult||(10**t.digits-1)*(t.factorDigits===2?99:Math.min(t.maxKnownFactor||9,9)))*factor;
  if(t.family==='divide'){
   const quotientLimit=t.digits===1?9:Math.floor((10**t.digits-1)/e.right.value.coefficient);
   // A wrong quotient may be a little too large for this dividend. Keeping the
   // exact source-bank quotient ceiling would reveal 10 in 990 ÷ 99, because
   // every other option would have one digit. These remain learned numerals.
   high=(t.digits===1?quotientLimit:Math.max(quotientLimit,q.answerValue.coefficient+10))*factor;
  }
  if(t.family==='decimal'||t.family==='decimalMultiply')high=Math.max(c*2,c+30);
  if(t.family==='mixed'&&['+','-'].includes(e.op))high=limits.sum*factor;
 }
 if(q.blank!=='result'&&scalar(e.left)&&scalar(e.right)){
  if(e.op==='-'){
   if(q.blank==='right')high=Math.min(high,e.left.value.coefficient*10**(scale-e.left.value.scale));
   else low=Math.max(low,e.right.value.coefficient*10**(scale-e.right.value.scale));
  }
  if(e.op==='*'&&t.family==='multiply')high=(q.blank==='left'?10**t.digits-1:t.factorDigits===2?99:9)*factor;
  if(e.op==='/'){
   if(q.blank==='right'){
    const n=e.left.value.coefficient,limit=t.family==='divide'?(t.divisorDigits===2?99:Math.min(t.maxKnownFactor||9,9)):limits.divisor;
    // A non-divisor would advertise itself without finding the quotient.
    divisors=[];for(let d=1;d<=Math.min(n,limit);d++)if(n%d===0)divisors.push(d*factor);
    high=limit*factor;
   }else{
    high=(t.family==='divide'?(t.digits===1?e.right.value.coefficient*9:10**t.digits-1):limits.dividend)*factor;
    step=e.right.value.coefficient*factor;
   }
  }
 }
 return {low,high,step,divisors};
}
function mistakeValues(q){
 const e=q.expression,values=[],push=n=>{if(Number.isSafeInteger(n.coefficient)&&n.coefficient>=0)values.push(n);};
 if(!scalar(e.left)||!scalar(e.right)){
  // Common errors in two-step work: forgetting the last operation or applying
  // the last operation to only the nearest term inside the brackets.
  if(e.left.type==='operation'){
   try{push(calculate(e.left));}catch{}
   const a=e.left;
   if(['+','-'].includes(a.op)&&e.op==='*')try{push(calculate({type:'operation',op:a.op,left:a.left,right:{type:'operation',op:'*',left:a.right,right:e.right}}));}catch{}
   if(a.op==='*'&&['+','-'].includes(e.op))try{push(calculate({type:'operation',op:'*',left:a.left,right:{type:'operation',op:e.op,left:a.right,right:e.right}}));}catch{}
  }
  return values;
 }
 const a=e.left.value,b=e.right.value;
 if(q.blank==='result'){
  if(e.op==='*'){
   for(const delta of [-1,1]){
    push(decimal((a.coefficient+delta*10**a.scale)*b.coefficient,a.scale+b.scale));
    push(decimal(a.coefficient*(b.coefficient+delta*10**b.scale),a.scale+b.scale));
   }
   if(!a.scale&&!b.scale&&b.coefficient>=10)push(decimal(a.coefficient*(b.coefficient%10)));
  }
  if(['+','-'].includes(e.op))try{push(calculate({...e,op:e.op==='+'?'-':'+'}));}catch{}
 }
 return values;
}
function remainderValues(q){
 const value=q.answerValue,d=q.expression.right.value.coefficient,t=TOPICS[q.topicId],seed=seedOf(q);
 if(d<2)return null;
 const max=t.digits===1?9:Math.floor((10**t.digits-1)/d),period=10/gcd(d,10),direction=seed%2?1:-1,alternatives=[];
 for(const distance of [period,2*period,1,2,3,4,5,6,7,8,9])for(const sign of [direction,-direction]){const n=value.quotient+distance*sign;if(n>=1&&n<=Math.max(max,value.quotient)&&!alternatives.includes(n))alternatives.push(n);}
 if(!alternatives.length)return null;
 const congruentQuotient=alternatives.find(n=>mod((n-value.quotient)*d,10)===0);
 let quotient=value.quotient>=10||congruentQuotient!==undefined&&Math.abs(congruentQuotient-value.quotient)<=Math.max(1,value.quotient*.6)?congruentQuotient:undefined,remainder;
 if(quotient!==undefined)remainder=(value.remainder+1+seed%(d-1))%d;
 else{
  // In a small table-fact range there may be no second quotient ten-equivalent
  // to this one. A diagonal corner can still share the dividend's final digit.
  const dividend=d*value.quotient+value.remainder;
  for(const n of [...alternatives].sort((a,b)=>Math.abs(a-value.quotient)-Math.abs(b-value.quotient))){const residue=mod(dividend-d*n,10),candidates=[];for(let r=residue;r<d;r+=10)if(r!==value.remainder)candidates.push(r);if(candidates.length){quotient=n;remainder=candidates.sort((a,b)=>Math.abs(a-value.remainder)-Math.abs(b-value.remainder))[0];break;}}
  if(quotient===undefined){quotient=congruentQuotient??alternatives[0];remainder=(value.remainder+1+seed%(d-1))%d;}
 }
 // A two-by-two set makes both fields necessary. Every remainder is legal;
 // neither the correct quotient nor the correct remainder is unique.
 return [value,{kind:'remainder',quotient,remainder:value.remainder},{kind:'remainder',quotient:value.quotient,remainder},{kind:'remainder',quotient,remainder}];
}
function shape(n,scale){return String(Math.floor(n/10**scale)).length;}
export function buildAnswerChoices(q){
 if(q.answerValue.kind==='remainder')return remainderValues(q);
 const t=TOPICS[q.topicId],scale=choiceDisplayScale(q),factor=10**scale,c=q.answerValue.coefficient*10**(scale-q.answerValue.scale),bounds=domain(q,t,scale),seed=seedOf(q),pool=new Map();
 const add=(n,priority=0)=>{
  if(!Number.isSafeInteger(n)||n<bounds.low||n>bounds.high||n%bounds.step!==0||bounds.divisors&&!bounds.divisors.includes(n))return;
  if(!pool.has(n)||pool.get(n)<priority)pool.set(n,priority);
 };
 add(c,100);
 if(bounds.divisors)for(const n of bounds.divisors)add(n,3);
 for(const v of mistakeValues(q)){const n=v.coefficient*10**(scale-v.scale);add(n,3);}
 const e=q.expression,missingMultiply=q.blank!=='result'&&e.op==='*'&&scalar(e.left)&&scalar(e.right)&&!e.left.value.scale&&!e.right.value.scale;
 const missingDivisor=q.blank==='right'&&e.op==='/'&&scalar(e.left)&&scalar(e.right)&&!q.resultValue.scale;
 const productBlank=missingMultiply||missingDivisor,known=missingMultiply?e[q.blank==='left'?'right':'left'].value.coefficient:missingDivisor?q.resultValue.coefficient:1;
 const product=missingDivisor?e.left.value.coefficient:q.resultValue.coefficient,productModulus=productBlank?10**Math.max(1,String(Math.abs(product)).length-2):10;
 // For a missing factor, match the product's last digit; for a normal answer,
 // match the answer's last digit. Formatting zeros alone must not select it.
 // Once the result has four or more written digits, preserve more than its
 // units digit. E.g. 825 × 6 should not be identifiable from 25 × 6 alone.
 const period=productBlank?productModulus/gcd(known,productModulus)*factor:10**Math.max(1,String(Math.abs(c)).length-2);
 for(let k=1;k<=12;k++)for(const sign of [-1,1]){
  add(c+sign*k*period,2);
  add(c+sign*k*bounds.step,1);
 }
 for(let place=10;place<=Math.max(100,c);place*=10)for(const sign of [-1,1])add(c+sign*place,2);
 if(pool.size<4)for(let n=bounds.low;n<=bounds.high&&pool.size<4;n++)add(n,0);
 if(pool.size<4)return null;
 // Large distractors are useful only when they model a real error. Keep the
 // ordinary choices close enough that an estimate leaves genuine work to do.
 const delta=Math.max(period,Math.ceil(c*.6),3*bounds.step),near=[...pool.keys()].filter(n=>Math.abs(n-c)<=delta),sameShape=n=>shape(n,scale)===shape(c,scale);
 const fingerprint=n=>productBlank?mod(n*known,productModulus*factor):mod(n,period);
 let shared=near.filter(n=>fingerprint(n)===fingerprint(c)&&sameShape(n));
 // Small one-digit table facts cannot have four nearby answers with the same
 // last digit. Do not invent out-of-range products merely to force that rule.
 if(c<10&&!productBlank)shared=[c];
 let picked;
 if(shared.length>=4){
  const lower=shared.filter(n=>n<c).sort((a,b)=>b-a),upper=shared.filter(n=>n>c).sort((a,b)=>a-b);
  let below=Math.min(seed%4,lower.length);below=Math.max(below,3-upper.length);
  picked=[c,...lower.slice(0,below),...upper.slice(0,3-below)];
 }else{
  picked=[c];
  const protectedPool=near.filter(n=>n!==c&&fingerprint(n)===fingerprint(c));
  if(c>=10||productBlank){protectedPool.sort((a,b)=>Number(sameShape(b))-Number(sameShape(a))||Math.abs(a-c)-Math.abs(b-c)||((a^seed)>>>0)-((b^seed)>>>0));if(protectedPool.length)picked.push(protectedPool[0]);}
  const score=n=>(pool.get(n)||0)*2+Number(sameShape(n))*4-Math.abs(n-c)/Math.max(1,c*.15)+((Math.imul(n+seed,2654435761)>>>0)%100)/100;
  const remaining=[...new Set([...near,...pool.keys()])].filter(n=>!picked.includes(n)).sort((a,b)=>score(b)-score(a));
  for(const n of remaining){picked.push(n);if(picked.length===4)break;}
  // Correct magnitude must not be the only option with that number of digits.
  if(picked.filter(sameShape).length===1){const replacement=remaining.find(n=>sameShape(n)&&!picked.includes(n));if(replacement!==undefined)picked[3]=replacement;}
 }
 // For example, ? ÷ 8 = 1 has only one one-digit multiple of eight.
 // Keep its direct fact, but do not offer this revealing missing-number form.
 if(q.blank!=='result'&&picked.filter(sameShape).length===1)return null;
 return picked.map(n=>decimal(n,scale));
}

export function validChoiceSet(q,values){return values?.length===4&&values.filter(v=>valuesEqual(v,q.answerValue)).length===1&&new Set(values.map(formatValue)).size===4;}

export function shuffleAnswerChoices(q,values){
 // Begin with value order so a cached station and a direct ID lookup agree.
 // Shuffle every candidate, including all wrong answers: swapping only the
 // correct corner of a remainder grid would reveal its position.
 const result=[...values].sort((a,b)=>{if(a.kind==='remainder')return a.quotient-b.quotient||a.remainder-b.remainder;const scale=Math.max(a.scale,b.scale);return a.coefficient*10**(scale-a.scale)-b.coefficient*10**(scale-b.scale);});
 let seed=seedOf(q,true)||1;
 for(let i=result.length-1;i>0;i--){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const j=(seed>>>0)%(i+1);[result[i],result[j]]=[result[j],result[i]];}
 return result;
}
