import {courseProfile,availableTopics,bankTopics,TOPICS} from './course-catalog.js?v=20261016-1';
import {number,decimal,operation,calculate,expressionText,expressionSteps,expressionSignature,formatValue,valuesEqual,symbol} from './course-math.js?v=20261016-1';
const cache=new Map();
function random(seed){let x=(Math.imul(seed+41,2654435761)>>>0)||1;return (min,max)=>{x^=x<<13;x^=x>>>17;x^=x<<5;return min+((x>>>0)%(max-min+1));};}
export function makeCourseQuestion(profile,levelId,topicId,serial) {
 const p=courseProfile(profile.grade,profile),topic=TOPICS[topicId];
 if(!topic||!bankTopics(p).includes(topicId)||!Number.isInteger(serial)||serial<0||serial>799||!Number.isInteger(levelId)||levelId<1||levelId>10)throw new RangeError('Unknown course question');
 const r=random(serial+levelId*811+p.grade*103),easy=p.difficulty==='easy',hard=p.difficulty==='challenge';let expr,value;
 const factorMax=easy?5:9;
 if(topic.family==='addsub'){
   const max=topic.carryOnly||topic.borrowOnly?20:easy?Math.max(5,Math.floor(topic.max/2)):topic.max;
   let a=max<=20?1+serial%max:r(1,max),b=max<=20?1+Math.floor(serial/max)%max:r(1,max),add=topic.onlyOp?topic.onlyOp==='+':max<=20?Math.floor(serial/(max*max))%2===0:serial%2===0;
   if(topic.oral){a=r(10,max);b=serial%3?r(1,9):r(1,9)*10;}
   if(topic.carryOnly){a=r(1,9);b=r(1,9);if(a+b<=10)return null;}
   if(topic.borrowOnly){a=r(11,19);b=r(1,9);if(a%10>=b)return null;}
   if(topic.oral&&!add&&a<b)return null;
   if(add&&a+b>max)return null;
   const x=add?a:Math.max(a,b),y=add?b:Math.min(a,b);
   if(easy&&max>20){let carry=0,count=0;for(let z=0;z<String(x).length;z++){const u=Math.floor(x/10**z)%10,v=Math.floor(y/10**z)%10;const next=add?u+v+carry>=10:u-carry<v;if(next)count++;carry=Number(next);}if(count>1)return null;}
   expr=operation(add?'+':'-',number(x),number(y));
 }else if(topic.family==='multiply'){
   const digits=topic.digits,lower=digits===1?1:10**(digits-1),upper=digits===1?Math.min(factorMax,topic.maxKnownFactor||9):10**digits-1;
   let a=r(hard?Math.max(lower,Math.ceil(upper*.55)):lower,easy?Math.min(upper,lower*4):hard?upper:digits===1?upper:Math.floor(upper*.75)),b=topic.factorDigits===2?r(hard?50:10,easy?30:hard?99:69):r(hard?6:1,factorMax);
   if(topic.noCarry){a=r(10,easy?40:hard?49:29);b=r(1,easy?3:hard?4:3);}
   if(digits===1&&topic.maxKnownFactor&&hard)a=r(Math.max(1,Math.ceil(topic.maxKnownFactor/2)),topic.maxKnownFactor);
   if(easy&&digits>1)a=Math.max(lower,Math.floor(a/10)*10);
   if(topic.maxResult&&a*b>topic.maxResult)return null;
   if(topic.noCarry&&String(a).split('').some(d=>Number(d)*b>=10))return null;
   expr=operation('*',number(a),number(b));
 }else if(['divide','remainder'].includes(topic.family)){
   const d=topic.divisorDigits===2?r(10,easy?30:99):r(hard?Math.max(2,Math.ceil((topic.maxKnownFactor||9)/2)):2,Math.min(factorMax,topic.maxKnownFactor||9)),max=topic.digits===1?d*factorMax:10**topic.digits-1,min=topic.digits===1?d:10**(topic.digits-1),lo=Math.max(1,Math.ceil(min/d)),hi=Math.floor(max/d);
   if(lo>hi)return null;
   const quotient=r(hard?Math.max(lo,Math.ceil(hi*.55)):lo,hi),allowRemainder=topic.family==='remainder'||(topic.digits>=2&&!topic.noRegroup&&!easy&&serial%5===0&&bankTopics(p).includes('remainder')),remainder=allowRemainder?r(1,Math.min(d-1,Math.max(1,max-d*quotient))):0;
   if(d*quotient+remainder>max)return null;
   if(topic.noRegroup&&String(d*quotient).split('').some(n=>Number(n)%d!==0))return null;
   expr=operation('/',number(d*quotient+remainder),number(d));
   if(remainder)value={kind:'remainder',quotient,remainder};
 }else if(topic.family==='decimal'||topic.family==='decimalMultiply'){
   const scale=easy?1:topic.scale,a=topic.family==='decimalMultiply'?decimal(r(1,easy?19:hard?999:99),hard?2:1):decimal(r(1,easy?49:999),scale),b=topic.family==='decimalMultiply'?decimal(r(1,easy?5:99),easy?0:1):decimal(r(1,easy?29:499),scale);
   if(topic.family==='decimalMultiply')expr=operation('*',number(a),number(b));
   else {const subtract=serial%2===1,greater=calculate(operation('-',number(a),number(b))).coefficient>=0;expr=operation(subtract?'-':'+',number(subtract&&!greater?b:a),number(subtract&&!greater?a:b));}
 }else if(topic.family==='laws'){
   const a=r(2,factorMax),b=r(10,99),c=100-b;
   expr=easy?operation('*',number(a),number(100)):operation('+',operation('*',number(a),number(b)),operation('*',number(a),number(c)));
 }else {
   const a=r(2,factorMax),b=r(2,factorMax),c=r(1,easy?9:30),topics=availableTopics(p),canMultiply=!topic.addSubOnly&&bankTopics(p).some(k=>TOPICS[k].family==='multiply');
   if(!canMultiply)expr=operation('-',operation('+',number(a+c),number(b)),number(c));
   else if(serial%4===0)expr=operation('+',operation('/',number(a*b),number(b)),number(c));
   else if(serial%4===1)expr=operation('-',operation('*',number(a),number(b)),number(Math.min(c,a*b)));
   else if(serial%4===2)expr=operation('*',operation('+',number(a),number(c)),number(b));
   else expr=operation('+',operation('*',number(a),number(b)),number(c));
   if(easy)expr=canMultiply?operation('*',number(a),number(b)):operation('+',number(a),number(b));
   if(topicId==='mixed4'&&!easy){
     const hasThreeDigits=bankTopics(p).includes('mul32'),left=hasThreeDigits?a*10:Math.min(a*10,80),right=hasThreeDigits?b*10:Math.min(b*10,90-left),factor=Math.min(c,9);
     expr=operation('*',operation('+',number(left),number(right)),number(factor));
     if(hard)expr=operation('-',expr,number(Math.min(c,left+right)));
   }
 }
 const isRemainder=value?.kind==='remainder',result=isRemainder?value:calculate(expr);
 const knownDivision=(n,d)=>bankTopics(p).some(id=>{const t=TOPICS[id];if(t.family!=='divide'||n.scale||d.scale||d.coefficient<=0||n.coefficient%d.coefficient)return false;const x=n.coefficient,y=d.coefficient;if(t.digits===1)return y<=Math.min(t.maxKnownFactor||9,9)&&x/y<=9;if(x>10**t.digits-1||y>(t.divisorDigits===2?99:9))return false;if(t.noRegroup&&String(x).split('').some(digit=>Number(digit)%y!==0))return false;return true;});
 let missing=hard&&!isRemainder&&expr.left.type==='number'&&expr.right.type==='number'&&serial%4===0&&!topic.oral&&topic.family!=='decimalMultiply';
 if(missing&&expr.op==='*')missing=knownDivision(result,expr.left.value);
 if(missing&&expr.op==='/')missing=knownDivision(expr.left.value,result);
 if(missing&&topic.carryOnly)missing=bankTopics(p).some(id=>['borrow20','add20Minus','add20'].includes(id));
 value=missing?expr.right.value:result;
 const candidates=[value];
 for(const offset of [1,-1,2,-2,10,-10]){
   const next=value.kind==='remainder'?(candidates.length%2?{kind:'remainder',quotient:value.quotient,remainder:((value.remainder+offset)%expr.right.value.coefficient+expr.right.value.coefficient)%expr.right.value.coefficient}:{kind:'remainder',quotient:value.quotient+offset,remainder:value.remainder}):decimal(value.coefficient+offset,value.scale);
   if((next.kind==='remainder'?next.quotient>=0&&next.remainder>=0&&next.remainder<expr.right.value.coefficient:next.coefficient>=0&&(topic.family!=='addsub'||next.coefficient<=topic.max))&&!candidates.some(v=>valuesEqual(v,next)))candidates.push(next);
   if(candidates.length===4)break;
 }
 for(let n=0;candidates.length<4;n++){const next=value.kind==='remainder'?{kind:'remainder',quotient:n,remainder:value.remainder}:decimal(n);if(!candidates.some(v=>valuesEqual(v,next)))candidates.push(next);}
 const position=serial%4;candidates.splice(position,0,candidates.shift());
 const text=missing?`${expressionText(expr.left)} ${symbol(expr.op)} ? = ${formatValue(result)}`:expressionText(expr);
 const id=`c1:${p.textbook}:${p.grade}:${p.phase}:${p.difficulty}:${levelId}:${topicId}:${serial}`;
 return {id,format:'course-v1',grade:p.grade,levelId,kind:'course',topicId,profile:p,expression:expr,blank:missing?'right':'result',resultValue:result,answerValue:value,answer:position,choices:[0,1,2,3],choiceValues:candidates,choiceLabels:candidates.map(formatValue),text,review:false};
}
export function lookupCourseQuestion(id){
 const parts=String(id).split(':');if(parts.length!==8||parts[0]!=='c1')return null;
 try{return makeCourseQuestion({textbook:parts[1],grade:Number(parts[2]),phase:Number(parts[3]),difficulty:parts[4]},Number(parts[5]),parts[6],Number(parts[7]));}catch{return null;}
}
export function courseBank(profile,levelId){
 const p=courseProfile(profile.grade,profile),key=JSON.stringify([p,levelId]);if(cache.has(key))return cache.get(key);
 const rows=[];for(const topic of bankTopics(p))for(let i=0;i<800;i++){const q=makeCourseQuestion(p,levelId,topic,i);if(q)rows.push(q);}
 if(cache.size>=2)cache.delete(cache.keys().next().value);
 cache.set(key,rows);return rows;
}
export function courseSignature(q){
 const e=q.expression,prefix=`g${q.grade}:`,scalar=e.left.type==='number'&&e.right.type==='number'&&!e.left.value.scale&&!e.right.value.scale;
 if(scalar&&['+','-'].includes(e.op)){const a=e.left.value.coefficient,b=e.right.value.coefficient,blank=q.blank==='right'?'b':'result';if(e.op==='+')return blank==='result'?`${prefix}add:${[a,b].sort((x,y)=>x-y).join(',')}:result`:`${prefix}add:missing:${a}:${q.resultValue.coefficient}`;return `${prefix}sub:${a}:${b}:${blank}`;}
 if(q.blank==='result'&&['+','-'].includes(e.op)&&e.right.type==='number'&&!e.right.value.scale&&e.left.type==='operation'&&['+','-'].includes(e.left.op)&&e.left.left.type==='number'&&e.left.right.type==='number'&&!e.left.left.value.scale&&!e.left.right.value.scale){const terms=[e.left.left.value.coefficient,e.left.right.value.coefficient,e.right.value.coefficient];return e.op==='+'&&e.left.op==='+'?`${prefix}chain:add:${terms.sort((a,b)=>a-b).join(',')}`:`${prefix}chain:${terms[0]}${e.left.op}${terms[1]}${e.op}${terms[2]}`;}
 return `${prefix}course:${q.blank}:${expressionSignature(e)}`;
}
export function courseExplanation(q){
 if(q.topicId==='laws'&&q.expression.left.type==='operation'){const a=q.expression.left.left.value.coefficient,b=q.expression.left.right.value.coefficient,c=q.expression.right.right.value.coefficient;return {headline:'把相同的因数提出来',steps:[`${a} × ${b} + ${a} × ${c} = ${a} × (${b} + ${c})`,`${b} + ${c} = ${b+c}`,`${a} × ${b+c} = ${a*(b+c)}`],start:0,deltas:[],goal:q.answer};}
 const steps=q.answerValue.kind==='remainder'?[`${expressionText(q.expression.left)} ÷ ${expressionText(q.expression.right)} = ${formatValue(q.answerValue)}`,`除数 × 商 + 余数 = 被除数；余数小于除数。`]:q.blank==='right'?[`${q.expression.op==='+'||q.expression.op==='*'?formatValue(q.resultValue):formatValue(q.expression.left.value)} ${['*','/'].includes(q.expression.op)?'÷':'−'} ${q.expression.op==='+'||q.expression.op==='*'?formatValue(q.expression.left.value):formatValue(q.resultValue)} = ${formatValue(q.answerValue)}`,`${q.text.replace('?',formatValue(q.answerValue))}`]:expressionSteps(q.expression);
 return {headline:TOPICS[q.topicId].label,steps,start:0,deltas:[],goal:q.answer,questionText:q.text};
}
