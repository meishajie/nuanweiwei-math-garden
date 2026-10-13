import * as v1 from './course-questions-v1.js?v=20261013-2';
import {courseProfile,bankTopics,TOPICS} from './course-catalog.js?v=20261013-2';
import {decimal,number,operation,formatValue,expressionText,expressionSignature,calculate,valuesEqual} from './course-math.js?v=20261013-2';
export {makeCourseQuestion} from './course-questions-v1.js?v=20261013-2';
const cache=new Map(),templates=new Map(),scopeCache=new Map(),forms=['plain','right','left','story'];
function sourceQuestion(p,topic,serial){
 const t=TOPICS[topic],modes=p.difficulty==='easy'?['easy']:p.difficulty==='standard'?['easy','standard']:['easy','standard','challenge'];let mode=modes[(serial%7)%modes.length];
 if(p.difficulty==='easy'&&t.family==='addsub'&&t.max<=20)mode='standard';
 if(p.difficulty==='easy'&&(['remainder'].includes(t.family)||(t.family==='divide'&&(t.digits===1||t.noRegroup))||(t.family==='multiply'&&t.digits===1)))mode='standard';
 const base=v1.makeCourseQuestion({...p,difficulty:mode},1,topic,serial);if(!base)return null;let expression=base.expression;
 if(mode==='easy'&&t.family==='laws')expression=operation('*',number(10+serial%40),number(10*(1+Math.floor(serial/40)%4)));
 if(mode==='easy'&&t.family==='mixed'){
  const a=10+(serial*7)%70,b=1+(serial*11)%9,x=1+serial%9,y=1+Math.floor(serial/9)%9,kind=t.addSubOnly?serial%2:serial%4;
  expression=kind===0?operation('+',number(a),number(b)):kind===1?operation('-',number(a),number(b)):kind===2?operation('*',number(x),number(y)):operation('/',number(x*y),number(y));
 }
 if(['mixed','laws'].includes(t.family)&&!learnedExpression(p,expression))return null;
 const changed=expression!==base.expression;return {...base,profile:p,expression,...(changed?{resultValue:calculate(expression)}:{})};
}

function scope(p){const key=`${p.textbook}:${p.grade}:${p.phase}`;if(!scopeCache.has(key))scopeCache.set(key,bankTopics(p));return scopeCache.get(key);}
function knownDivision(p,n,d){return scope(p).some(id=>{const t=TOPICS[id];if(t.family!=='divide'||n.scale||d.scale||d.coefficient<=0||n.coefficient%d.coefficient)return false;const x=n.coefficient,y=d.coefficient;if(t.digits===1)return y<=Math.min(t.maxKnownFactor||9,9)&&x/y<=9;if(x>10**t.digits-1||y>(t.divisorDigits===2?99:9))return false;if(t.noRegroup&&String(x).split('').some(digit=>Number(digit)%y!==0))return false;return true;});}
function knownMultiplication(p,a,b){if(a.scale||b.scale)return false;return scope(p).some(id=>{const t=TOPICS[id];if(t.family!=='multiply')return false;const small=Math.min(a.coefficient,b.coefficient),large=Math.max(a.coefficient,b.coefficient);if(t.digits===1)return large<=9&&small<=(t.maxKnownFactor||9);if(large>10**t.digits-1||small>(t.factorDigits===2?99:9))return false;if(t.noCarry&&(large*small>t.maxResult||String(large).split('').some(d=>Number(d)*small>=10)))return false;return true;});}
function knownAddSub(p,a,b,op){if(a.scale||b.scale)return scope(p).some(id=>TOPICS[id].family==='decimal');return scope(p).some(id=>{const t=TOPICS[id];if(t.family!=='addsub'||(t.onlyOp&&t.onlyOp!==op))return false;const x=a.coefficient,y=b.coefficient,result=op==='+'?x+y:x-y;if(result<0||Math.max(x,y,result)>t.max)return false;if(t.oral&&!(Math.min(x,y)<=9||Math.min(x,y)%10===0))return false;return true;});}
export function learnedExpression(p,e){if(e.type==='number')return true;if(!learnedExpression(p,e.left)||!learnedExpression(p,e.right))return false;const a=calculate(e.left),b=calculate(e.right);return e.op==='*'?knownMultiplication(p,a,b):e.op==='/'?knownDivision(p,a,b):knownAddSub(p,a,b,e.op);}
function missingAllowed(q,side){const e=q.expression,p=q.profile,t=TOPICS[q.topicId];if(e.left.type!=='number'||e.right.type!=='number'||q.resultValue.kind==='remainder'||(t.oral&&side==='right'))return false;
 if(t.family==='decimalMultiply')return false;
 if(t.carryOnly&&!scope(p).some(id=>['borrow20','add20Minus','add20'].includes(id)))return false;
 if(e.op==='*')return knownDivision(p,q.resultValue,side==='right'?e.left.value:e.right.value);
 if(e.op==='/')return side==='right'?knownDivision(p,e.left.value,q.resultValue):knownMultiplication(p,q.resultValue,e.right.value);
 return ['+','-'].includes(e.op);
}
function storyFor(q){const e=q.expression;if(e.left.type==='number'&&e.right.type==='number'){
 const a=formatValue(e.left.value),b=formatValue(e.right.value),dec=e.left.value.scale||e.right.value.scale;
 if(e.op==='+')return dec?`两段小路长 ${a} 米和 ${b} 米，一共多长？`:`有 ${a} 颗星光，又找到 ${b} 颗。一共有多少颗？`;
 if(e.op==='-')return dec?`丝带长 ${a} 米，用去 ${b} 米。还剩多长？`:`有 ${a} 颗星光，送出 ${b} 颗。还剩多少颗？`;
 if(e.op==='*')return dec?`每米丝带要 ${a} 元，买 ${b} 米要多少元？`:`有 ${b} 队，每队 ${a} 颗星光。一共有多少颗？`;
 if(e.op==='/')return `把 ${a} 颗星光，每 ${b} 颗放一队。能放几队${q.resultValue.kind==='remainder'?'，还剩几颗':''}？`;
 }
 const a=e.left;
 if(e.op==='+'&&a.type==='operation'&&a.op==='*'&&a.left.type==='number'&&a.right.type==='number'&&e.right.type==='number')return `${formatValue(a.right.value)} 队各有 ${formatValue(a.left.value)} 颗星光，又添 ${formatValue(e.right.value)} 颗。一共多少颗？`;
 return '';
}
export function makeProgressionQuestion(profile,levelId,topicId,serial,form='plain'){
 if(!forms.includes(form)||!Number.isInteger(levelId)||levelId<1||levelId>10)return null;
 const p=courseProfile(profile.grade,profile),base=sourceQuestion(p,topicId,serial);return fromBase(base,levelId,serial,form);
}
function fromBase(base,levelId,serial,form){
 if(!base)return null;const p=base.profile,topicId=base.topicId;
 const q={...base,levelId,id:`c2:${p.textbook}:${p.grade}:${p.phase}:${p.difficulty}:${levelId}:${topicId}:${serial}:${form}`,blank:'result',presentation:form};
 if(['right','left'].includes(form)&&!missingAllowed(q,form))return null;
 if(form==='story'){q.story=storyFor(q);if(!q.story)return null;}
 const e=q.expression;let value=q.resultValue;if(['left','right'].includes(form)){q.blank=form;value=e[form].value;}
 const candidates=[value],limit=TOPICS[topicId].family==='addsub'?TOPICS[topicId].max:null;
 for(const offset of [1,-1,2,-2,10,-10]){const d=e.right.type==='number'?e.right.value.coefficient:0,next=value.kind==='remainder'?(candidates.length%2?{...value,remainder:((value.remainder+offset)%d+d)%d}:{...value,quotient:value.quotient+offset}):decimal(value.coefficient+offset,value.scale);if((next.kind==='remainder'?next.quotient>=0:next.coefficient>=0&&(limit===null||next.coefficient<=limit))&&!candidates.some(v=>valuesEqual(v,next)))candidates.push(next);if(candidates.length===4)break;}
 for(let n=0;candidates.length<4;n++){const next=value.kind==='remainder'?{...value,quotient:n}:decimal(n);if(!candidates.some(v=>valuesEqual(v,next)))candidates.push(next);}
 const position=(serial+levelId)%4;[candidates[0],candidates[position]]=[candidates[position],candidates[0]];
 q.answerValue=value;q.answer=position;q.choiceValues=candidates;q.choiceLabels=candidates.map(formatValue);
 q.text=q.blank==='result'?expressionText(e):`${q.blank==='left'?'?':expressionText(e.left)} ${ {'+':'+','-':'−','*':'×','/':'÷'}[e.op]} ${q.blank==='right'?'?':expressionText(e.right)} = ${formatValue(q.resultValue)}`;
 return q;
}
export function lookupCourseQuestion(id){if(String(id).startsWith('c1:'))return v1.lookupCourseQuestion(id);const parts=String(id).split(':');if(parts.length!==9||parts[0]!=='c2')return null;try{return makeProgressionQuestion({textbook:parts[1],grade:Number(parts[2]),phase:Number(parts[3]),difficulty:parts[4]},Number(parts[5]),parts[6],Number(parts[7]),parts[8]);}catch{return null;}}
export function courseBank(profile,levelId){
 const p=courseProfile(profile.grade,profile);if(!Number.isInteger(levelId)||levelId<1||levelId>10)throw new RangeError('Invalid station');const profileKey=JSON.stringify(p),key=JSON.stringify([p,levelId]);if(cache.has(key))return cache.get(key);
 if(!templates.has(profileKey)){
  const rows=[];for(const topic of scope(p))for(let i=0;i<800;i++){const base=sourceQuestion(p,topic,i);for(const form of forms){const q=fromBase(base,1,i,form);if(q)rows.push(q);}}
  if(templates.size>=2)templates.delete(templates.keys().next().value);templates.set(profileKey,rows);
 }
 const rows=templates.get(profileKey).map(q=>{const parts=q.id.split(':'),serial=Number(parts[7]),values=[...q.choiceValues];parts[5]=String(levelId);[values[0],values[q.answer]]=[values[q.answer],values[0]];const answer=(serial+levelId)%4;[values[0],values[answer]]=[values[answer],values[0]];return {...q,id:parts.join(':'),levelId,answer,choiceValues:values,choiceLabels:values.map(formatValue)};});
 if(cache.size>=2)cache.delete(cache.keys().next().value);cache.set(key,rows);return rows;
}

export function courseSignature(q){if(q.blank==='left'){
 const e=q.expression;if(e.op==='+')return v1.courseSignature({...q,blank:'right',expression:operation('+',e.right,e.left)});
 if(e.op==='-')return !e.left.value.scale&&!e.right.value.scale?`g${q.grade}:sub:${e.left.value.coefficient}:${e.right.value.coefficient}:a`:`g${q.grade}:course:left:${expressionSignature(e)}`;
 if(e.op==='*')return v1.courseSignature({...q,blank:'right',expression:operation('*',e.right,e.left)});
 return `g${q.grade}:course:left:${v1.courseSignature({...q,blank:'result'})}`;
 }return v1.courseSignature(q);}
export function courseExplanation(q){if(q.blank!=='left')return v1.courseExplanation(q);const e=q.expression,a=formatValue(q.resultValue),b=expressionText(e.right),op={'+':'−','-':'+','*':'÷','/':'×'}[e.op];return {headline:'找到整体和部分的关系',steps:[`${a} ${op} ${b} = ${formatValue(q.answerValue)}`,q.text.replace('?',formatValue(q.answerValue))],start:0,deltas:[],goal:q.answer,questionText:q.text};}
