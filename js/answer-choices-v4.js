import {decimal,calculate} from './course-math.js?v=20261016-3';
import {TOPICS,bankTopics} from './course-catalog.js?v=20261016-3';
import {choiceDisplayScale,choiceLabels,shuffleAnswerChoices} from './answer-choices.js?v=20261016-3';
export {choiceLabels,shuffleAnswerChoices};

const scalar=e=>e?.type==='number',mod=(n,d)=>(n%d+d)%d,gcd=(a,b)=>b?gcd(b,a%b):a;
const limitsCache=new Map(),modelCache=new Map();
function seedFor(q){const parts=q.id.split(':');parts[5]='1';let s=2166136261;for(const c of parts.join(':'))s=Math.imul(s^c.charCodeAt(0),16777619)>>>0;return s||1;}
function random(seed){return ()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};}
const at=(v,scale)=>v.coefficient*10**(scale-v.scale);
const width=(n,scale)=>String(Math.floor(n/10**scale)).length;
function limits(q){const p=q.profile,key=`${p.textbook}:${p.grade}:${p.phase}`;if(limitsCache.has(key))return limitsCache.get(key);const ts=bankTopics(p).map(id=>TOPICS[id]),v={sum:Math.max(20,...ts.filter(t=>t.family==='addsub').map(t=>t.max)),dividend:Math.max(81,...ts.filter(t=>t.family==='divide').map(t=>t.digits===1?81:10**t.digits-1)),divisor:Math.max(9,...ts.filter(t=>t.family==='divide').map(t=>t.divisorDigits===2?99:9))};limitsCache.set(key,v);return v;}
function domain(q,t,scale){
 const f=10**scale,e=q.expression,c=at(q.answerValue,scale),known=limits(q);let low=0,high=Math.max(c*2,c+30*f),step=1,allowed=null;
 if(t.family==='addsub')high=t.max*f;
 if(q.blank==='result'){
  if(t.family==='multiply'){low=1;high=(t.maxResult||(10**t.digits-1)*(t.factorDigits===2?99:Math.min(t.maxKnownFactor||9,9)))*f;}
  if(t.family==='divide'){low=1;high=(t.digits===1?9:Math.max(Math.floor((10**t.digits-1)/e.right.value.coefficient),q.answerValue.coefficient+10))*f;}
  if(['decimal','decimalMultiply'].includes(t.family))high=Math.max(c*2,c+30);
  if(t.family==='mixed'&&['+','-'].includes(e.op))high=known.sum*f;
 }
 if(q.blank!=='result'&&scalar(e.left)&&scalar(e.right)){
  if(e.op==='-'){if(q.blank==='right')high=Math.min(high,at(e.left.value,scale));else low=Math.max(low,at(e.right.value,scale));}
  if(e.op==='*'&&t.family==='multiply'){low=1;high=(q.blank==='left'?10**t.digits-1:t.factorDigits===2?99:9)*f;}
  if(e.op==='/'){
   low=1;
   if(q.blank==='right'){const n=e.left.value.coefficient,max=t.family==='divide'?(t.divisorDigits===2?99:Math.min(t.maxKnownFactor||9,9)):known.divisor;allowed=[];for(let d=1;d<=Math.min(n,max);d++)if(n%d===0)allowed.push(d*f);high=max*f;}
   else{high=(t.family==='divide'?(t.digits===1?e.right.value.coefficient*9:10**t.digits-1):known.dividend)*f;step=e.right.value.coefficient*f;}
  }
 }
 return {low,high,step,allowed};
}
function scalarErrors(q,scale,add){
 const e=q.expression,c=at(q.answerValue,scale),f=10**scale;
 if(!scalar(e.left)||!scalar(e.right))return;
 const a=e.left.value,b=e.right.value,x=at(a,scale),y=at(b,scale),push=(v,source,weight=4)=>add(at(v,scale),source,weight);
 if(q.blank!=='result'){
  const k=e[q.blank==='left'?'right':'left'].value,r=q.resultValue;
  if(!r.kind){const z=at(r,scale),known=at(k,scale);add(z+known,'wrong-inverse',4);add(Math.abs(z-known),'wrong-inverse',4);add(z,'confuse-known-value',3);add(known,'confuse-known-value',3);}
  return;
 }
 if(['+','-'].includes(e.op)){
  add(e.op==='+'?Math.abs(x-y):x+y,'wrong-operation',4);
  add(x,'omit-operand',3);add(y,'omit-operand',3);
  add(e.op==='+'?x+2*y:x-2*y,'repeat-operand',4);
  const places=Math.max(String(Math.abs(x)).length,String(Math.abs(y)).length);
  let borrow=0,absolute=0;
  for(let i=0;i<places;i++){
   const p=10**i,dx=Math.floor(x/p)%10,dy=Math.floor(y/p)%10;
   absolute+=Math.abs(dx-dy)*p;
   if(e.op==='-'){
    const next=dx-borrow<dy;if(next){add(c+10*p,'forgot-borrow-decrement',5);add(c-10*p,'borrow-twice',4);}borrow=Number(next);
   }else if(dx+dy>=10){add(c-10*p,'omit-carry',5);add(c+10*p,'carry-twice',4);}
   if(i<places-1){if(dx)add(c-dx*p,'omit-place',4);if(dy)add(e.op==='+'?c-dy*p:c+dy*p,'omit-place',4);}
  }
  if(e.op==='-')add(absolute,'subtract-digits-without-borrow',5);
  // A mistaken tens digit is distinct from a one-step counting slip.
  for(const p of [10,100,1000])if(p<=Math.max(x,y)*2){add(c-p,'place-value',3);add(c+p,'place-value',3);}
  if(a.scale!==b.scale){add(a.coefficient+(e.op==='+'?b.coefficient:-b.coefficient),'decimal-alignment',5);}
 }
 if(e.op==='*'){
  const product=a.coefficient*b.coefficient,ps=a.scale+b.scale;
  for(const sign of [-1,1]){
   push(decimal((a.coefficient+sign)*b.coefficient,ps),'adjacent-fact',4);
   push(decimal(a.coefficient*(b.coefficient+sign),ps),'adjacent-fact',4);
   if(a.scale)push(decimal((a.coefficient+sign*10**a.scale)*b.coefficient,ps),'extra-or-missing-group',4);
   if(b.scale)push(decimal(a.coefficient*(b.coefficient+sign*10**b.scale),ps),'extra-or-missing-group',4);
  }
  push(decimal(a.coefficient+b.coefficient,Math.max(a.scale,b.scale)),'add-instead-of-multiply',3);
  const digits=String(a.coefficient).split('').reverse().map(Number),small=b.coefficient%10;let carry=0;
  for(let i=0;i<digits.length;i++){if(carry){push(decimal(product-carry*10**i,ps),'omit-product-carry',5);push(decimal(product+carry*10**i,ps),'duplicate-product-carry',4);}carry=Math.floor((digits[i]*small+carry)/10);}
  if(b.coefficient>=10){const tens=Math.floor(b.coefficient/10),ones=b.coefficient%10;push(decimal(a.coefficient*ones,ps),'omit-partial-product',5);push(decimal(a.coefficient*tens+a.coefficient*ones,ps),'partial-product-not-shifted',5);}
  if(a.coefficient>=10){push(decimal(Math.floor(a.coefficient/10)*10*b.coefficient,ps),'omit-ones-product',4);push(decimal((a.coefficient%10)*b.coefficient,ps),'omit-leading-product',4);}
  if(ps){push(decimal(product,ps-1),'decimal-point',4);push(decimal(product,ps+1),'decimal-point',4);}
  if(c>=10)for(const p of [10,100,1000])if(p<=c){add(c-p,'product-place-value',3);add(c+p,'product-place-value',3);}
 }
 if(e.op==='/'){
  add(x,'omit-division',2);add(x-y,'subtract-once',3);
  const d=b.coefficient,n=a.coefficient;let digitwise=0;
  for(let i=0;i<String(n).length;i++)digitwise+=Math.floor(Math.floor(n/10**i)%10/d)*10**i;
  add(digitwise*f,'ignore-division-remainder',5);
  for(const sign of [-1,1]){if(d+sign>0)add(Math.floor(n/(d+sign))*f,'confuse-divisor',3);}
  const s=String(q.answerValue.coefficient);if(s.length>1)add(Number(s.split('').reverse().join(''))*f,'quotient-place-value',4);
  if(s.includes('0'))add(Number(s.replaceAll('0',''))*f,'omit-quotient-zero',5);
  for(const p of [10,100,1000])if(p<=Math.max(c,10)){add(c-p,'quotient-place-value',4);add(c+p,'quotient-place-value',4);}
 }
}
function mixedErrors(q,scale,add){
 const e=q.expression;if(scalar(e.left)&&scalar(e.right))return;
 const put=(expr,source)=>{try{add(at(calculate(expr),scale),source,5);}catch{}};
 if(e.left.type==='operation'){
  const a=e.left;put(a,'omit-last-operation');
  if(['+','-'].includes(a.op)&&e.op==='*')put({type:'operation',op:a.op,left:a.left,right:{type:'operation',op:'*',left:a.right,right:e.right}},'ignore-brackets');
  if(a.op==='*'&&['+','-'].includes(e.op))put({type:'operation',op:'*',left:a.left,right:{type:'operation',op:e.op,left:a.right,right:e.right}},'wrong-operation-order');
  if(e.op==='-'&&a.op==='+')put({type:'operation',op:'+',left:a.left,right:{type:'operation',op:'-',left:e.right,right:a.right}},'wrong-subtraction-order');
 }
 if(e.left.type==='operation'&&e.right.type==='operation'){put(e.left,'omit-second-part');put(e.right,'omit-first-part');}
}
function fingerprints(q,scale,c){
 const e=q.expression,multiply=q.blank!=='result'&&e.op==='*'&&scalar(e.left)&&scalar(e.right)&&!e.left.value.scale&&!e.right.value.scale,divisor=q.blank==='right'&&e.op==='/'&&scalar(e.left)&&scalar(e.right)&&!q.resultValue.scale;
 const known=multiply?e[q.blank==='left'?'right':'left'].value.coefficient:divisor?q.resultValue.coefficient:1,f=10**scale;
 const product=divisor?e.left.value.coefficient:multiply?q.resultValue.coefficient:c,strong=10**Math.max(1,String(Math.abs(product)).length-2);
 return {weak:n=>mod(n*known,10*(multiply||divisor?f:1)),strong:n=>mod(n*known,strong*(multiply||divisor?f:1)),period:multiply||divisor?strong/gcd(known,strong)*f:strong,productBlank:multiply||divisor};
}
function poolFor(q){
 const p=q.profile,key=`${p.textbook}:${p.grade}:${p.phase}:${p.difficulty}:${q.topicId}:${q.blank}:${JSON.stringify(q.expression)}`;if(modelCache.has(key))return modelCache.get(key);
 const t=TOPICS[q.topicId],scale=choiceDisplayScale(q),c=at(q.answerValue,scale),bounds=domain(q,t,scale),pool=new Map(),fp=fingerprints(q,scale,c);
 const add=(n,source,weight=2)=>{if(!Number.isSafeInteger(n)||n===c||n<bounds.low||n>bounds.high||n%bounds.step||bounds.allowed&&!bounds.allowed.includes(n)||source==='small-range-count'&&Math.abs(n-c)>Math.max(4*bounds.step,c*.4))return;const existing=pool.get(n);if(existing){existing.sources.add(source);existing.weight=Math.max(existing.weight,weight);}else pool.set(n,{n,sources:new Set([source]),weight});};
 scalarErrors(q,scale,add);mixedErrors(q,scale,add);
 if(bounds.allowed)for(const n of bounds.allowed)add(n,'alternative-divisor',3);
 const stride=bounds.step;
 for(const k of [1,2,3,4])for(const sign of [-1,1])add(c+sign*k*stride,'count-or-group-slip',k<=3?2:1);
 // Suffix protection supplies a competitor; it never dictates all four values.
 if(c>=10||fp.productBlank)for(const k of [1,2,3,5])for(const sign of [-1,1]){const n=c+sign*k*fp.period;if(Math.abs(n-c)<=Math.max(c*.55,fp.period*1.5,3*stride))add(n,'place-value-slip',2);}
 if(pool.size<8&&bounds.high-bounds.low<=30)for(let n=bounds.low;n<=bounds.high;n++)add(n,'small-range-count',1);
 const model={t,scale,c,bounds,pool:[...pool.values()],fp};if(modelCache.size>=512)modelCache.delete(modelCache.keys().next().value);modelCache.set(key,model);return model;
}
const arithmetic=values=>{const v=[...values].sort((a,b)=>a-b);return v[1]-v[0]===v[2]-v[1]&&v[2]-v[1]===v[3]-v[2];};
function selectNumeric(q){
 const model=poolFor(q),{scale,c,bounds,fp}=model,rand=random(seedFor(q)),sameShape=n=>width(n,scale)===width(c,scale),all=model.pool;
 if(all.length<3)return {values:null,reason:'fewer-than-four-legal-values',model};
 const protectedAll=all.filter(v=>fp.weak(v.n)===fp.weak(c)&&(c>=10||v.weight>=4||fp.productBlank)),strongAll=protectedAll.filter(v=>fp.strong(v.n)===fp.strong(c)&&Math.abs(v.n-c)<=Math.max(c*.2,fp.period*3,4*bounds.step)),strongNumbers=new Set(strongAll.map(v=>v.n)),shapePossible=all.some(v=>sameShape(v.n)),parityPossible=all.some(v=>v.n%2===c%2),e=q.expression;
 const plausible=n=>q.blank==='result'&&scalar(e.left)&&scalar(e.right)&&e.op==='-'?n<=at(e.left.value,scale):q.blank==='result'&&scalar(e.left)&&scalar(e.right)&&e.op==='+'?n>=Math.max(at(e.left.value,scale),at(e.right.value,scale)):true;
 const plausibleRequired=Math.min(3,1+all.filter(v=>plausible(v.n)).length),near=Math.max(3*bounds.step,c*.22),nearPossible=all.some(v=>Math.abs(v.n-c)<=near);
 const ranked=all.map(v=>({...v,jitter:rand()})).sort((a,b)=>(b.weight+b.jitter*2)-(a.weight+a.jitter*2));
 // Preserve a spread of sources and signs in a bounded working pool.
 const working=ranked.slice(0,18);for(const list of [protectedAll,strongAll,ranked.filter(v=>v.n<c),ranked.filter(v=>v.n>c),ranked.filter(v=>sameShape(v.n)&&Math.abs(v.n-c)<=near)])for(const v of list.slice(0,3))if(!working.some(w=>w.n===v.n))working.push(v);
 const targetRank=Math.floor(rand()*4),protect=protectedAll.length>0;
 const quality=items=>{
  const ns=items.map(v=>v.n),set=new Set(ns);if(set.size!==3)return -1e9;
  let hard=0;if(protect&&!ns.some(n=>fp.weak(n)===fp.weak(c)))hard++;
  if(strongNumbers.size&&!ns.some(n=>strongNumbers.has(n)))hard++;
  if(shapePossible&&!ns.some(sameShape))hard++;
  if(parityPossible&&!ns.some(n=>n%2===c%2))hard++;
  if(nearPossible&&!ns.some(n=>Math.abs(n-c)<=near))hard++;
  if(1+ns.filter(plausible).length<plausibleRequired)hard++;
  const ap=arithmetic([c,...ns]),sources=new Set(items.flatMap(v=>[...v.sources])),rank=ns.filter(n=>n<c).length;
  const distance=ns.reduce((s,n)=>s+Math.abs(n-c)/Math.max(5,c),0),strong=ns.some(n=>fp.strong(n)===fp.strong(c));
  return -hard*1e6-Number(ap)*1e4+Math.min(sources.size,5)*6+items.reduce((s,v)=>s+v.weight,0)*2-18*Math.abs(rank-targetRank)-distance*4+Number(strong)*2+items.reduce((s,v)=>s+(v.jitter||0),0);
 };
 let best=null,score=-Infinity;
 const consider=items=>{const value=quality(items);if(value>score){score=value;best=items;}};
 for(let trial=0;trial<14;trial++){
  const items=[];
  if(protect){const protectedRanked=working.filter(v=>fp.weak(v.n)===fp.weak(c));if(protectedRanked.length)items.push(protectedRanked[Math.floor(rand()*protectedRanked.length)]);}
  for(let tries=0;items.length<3&&tries<16;tries++){const v=working[Math.floor(rand()*working.length)];if(!items.some(x=>x.n===v.n))items.push(v);}
  if(items.length===3)consider(items);
 }
 if(best&&score<0)for(let pass=0;pass<3&&score<0;pass++){const before=score;for(let i=0;i<3;i++)for(const v of working)consider(best.map((old,j)=>i===j?v:old));if(score===before)break;}
 if(!best)return {values:null,reason:'no-legal-combination',model};
 const values=[c,...best.map(v=>v.n)],ap=arithmetic(values),violations=score< -5e5;
 if(q.blank!=='result'&&shapePossible===false)return {values:null,reason:'missing-number-has-unique-width',model};
 return {values:values.map(n=>decimal(n,scale)),selected:best,arithmetic:ap,reason:violations?'restricted-domain-protection':ap?'restricted-domain-arithmetic':null,model};
}
function selectRemainder(q){
 const v=q.answerValue,d=q.expression.right.value.coefficient,t=TOPICS[q.topicId],rand=random(seedFor(q)),max=t.digits===1?9:Math.floor((10**t.digits-1)/d),period=10/gcd(d,10),pairs=[];
 const qs=new Set();for(const distance of [1,2,3,period,2*period,3*period,10])for(const sign of [-1,1]){const n=v.quotient+distance*sign;if(n>=1&&n<=Math.max(max,v.quotient))qs.add(n);}
 for(const quotient of qs){
  const rs=new Set([v.remainder-1,v.remainder+1,d-v.remainder,0,(v.remainder+2)%d]);
  const residue=mod(d*v.quotient+v.remainder-d*quotient,10);for(let r=residue;r<d;r+=10)rs.add(r);
  for(const remainder of rs)if(remainder>=0&&remainder<d&&remainder!==v.remainder){const values=[v,{kind:'remainder',quotient,remainder:v.remainder},{kind:'remainder',quotient:v.quotient,remainder},{kind:'remainder',quotient,remainder}],n=d*v.quotient+v.remainder,tail=values.filter(a=>mod(d*a.quotient+a.remainder,10)===mod(n,10)).length>=2,dist=Math.abs(quotient-v.quotient)/Math.max(2,v.quotient),score=Number(tail)*100-dist*8+rand()*5+Number(remainder===d-v.remainder);pairs.push({values,tail,score,quotient,remainder});}
 }
 if(!pairs.length)return {values:null,reason:'fewer-than-two-legal-quotients'};
 const eligible=pairs.some(p=>p.tail)?pairs.filter(p=>p.tail):pairs;eligible.sort((a,b)=>b.score-a.score);const best=eligible[0];
 return {...best,reason:best.tail?null:'single-digit-remainder-domain',sources:['quotient-group-or-place-error',best.remainder===d-v.remainder?'reverse-remainder-subtraction':'remainder-count-error'],rectangularRequired:'Four unique choices with two occurrences of both correct fields require a 2 × 2 set; adding a third field value would expose the only repeated correct field.'};
}
export function buildAnswerChoicesV4(q){return q.answerValue.kind==='remainder'?selectRemainder(q).values:selectNumeric(q).values;}
export function auditAnswerChoicesV4(q){
 const result=q.answerValue.kind==='remainder'?selectRemainder(q):selectNumeric(q);
 if(q.answerValue.kind==='remainder')return {values:result.values,exception:result.reason,sources:result.sources||[],rectangularRequired:result.rectangularRequired,tailPartner:result.tail};
 return {values:result.values,exception:result.reason,arithmetic:result.arithmetic,selected:result.selected?.map(v=>({value:decimal(v.n,result.model.scale),sources:[...v.sources]}))||[],pool:result.model.pool.map(v=>({value:decimal(v.n,result.model.scale),sources:[...v.sources]})),domain:result.model.bounds};
}
