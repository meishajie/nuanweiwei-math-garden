import {TOPICS} from './course-catalog.js?v=20261014-2';
import {number,operation,calculate,formatValue,expressionSteps,expressionText,symbol,decimal} from './course-math.js?v=20261014-2';
import {explain} from './engine.js?v=20261014-2';
const places=['个位','十位','百位','千位','万位'];
function exprOf(q){if(q.expression)return q.expression;if(q.kind==='cards')return null;if(q.kind==='chain')return operation(q.ops[1],operation(q.ops[0],number(q.terms[0]),number(q.terms[1])),number(q.terms[2]));return operation(q.op,number(q.a),number(q.b));}
const step=(prompt,answer,note='')=>({prompt,answer:String(answer),note});
export function hintModel(q){
 const e=exprOf(q),grade=q.grade||1;if(!e)return {direction:'先找一张卡，再想还差多少。',activity:{kind:'cards',deck:q.deck,target:q.target},steps:[step(`目标是 ${q.target}，先试着找伙伴。`,q.target)],full:explain(q).steps};
 const scalar=e.left.type==='number'&&e.right.type==='number',a=scalar?e.left.value:null,b=scalar?e.right.value:null,steps=[],full=q.format==='course-v1'?explain(q).steps:explain(q).steps;
 let direction='先看清数字与符号，一次只算一步。',activity=null;
 if(q.blank&&q.blank!=='result'){direction=['*','/'].includes(e.op)?'乘法和除法是一对帮手，用已经会的关系找问号。':'整体和已知部分是什么？先找它们的关系。';steps.push(step('用已知的关系，问号里应放哪个数？',q.format==='course-v1'?formatValue(q.answerValue):q.answer,'把找到的数放回原式检查。'));}
 else if(q.topicId==='laws'&&!scalar){const a=e.left.left.value.coefficient,b=e.left.right.value.coefficient,c=e.right.right.value.coefficient;direction='两项里有相同的因数，把另外两个数先合起来。';steps.push(step(`${b} + ${c} = ?`,b+c));steps.push(step(`${a} × ${b+c} = ?`,a*(b+c)));}
 else if(!scalar){direction='先找括号里的计算，再看乘除和加减。';const walk=n=>{if(n.type==='number')return;walk(n.left);walk(n.right);steps.push(step(`${formatValue(calculate(n.left))} ${symbol(n.op)} ${formatValue(calculate(n.right))} = ?`,formatValue(calculate(n))));};walk(e);}
 else if(grade===1&&a.scale===0&&b.scale===0&&Math.max(a.coefficient,b.coefficient)<=20){
   const target=calculate(e).coefficient;direction=e.op==='+'?'先摆已有的，再添上新来的。':'先摆原来的，再拿走一些。';activity={kind:'frame',a:a.coefficient,b:b.coefficient,op:e.op,total:Math.max(a.coefficient,target),target};steps.push(step('数一数，一共有多少颗？',target));
 }else if(grade<=2&&['*','/'].includes(e.op)&&a.scale===0&&b.scale===0&&b.coefficient<=9&&a.coefficient<=99){
   direction=e.op==='*'?'每队一样多，看看一共有几队。':'每队一样多，看看能分几队，还有没有剩下。';activity=e.op==='*'?{kind:'groups',groups:b.coefficient,each:a.coefficient,total:a.coefficient*b.coefficient}:{kind:'divide',groups:b.coefficient,total:a.coefficient};
   if(e.op==='*')steps.push(step(`${b.coefficient} 队，每队 ${a.coefficient} 颗，一共多少？`,a.coefficient*b.coefficient));
   else {steps.push(step('每队分到多少颗？',Math.floor(a.coefficient/b.coefficient)));if(q.answerValue?.kind==='remainder')steps.push(step('还有几颗不能平均分？',a.coefficient%b.coefficient,'余数要比队数小。'));}
 }else if(a.scale||b.scale){
   if(e.op==='*'){direction='先按整数计算，再看一共有几位小数。';steps.push(step(`${a.coefficient} × ${b.coefficient} = ?`,a.coefficient*b.coefficient));steps.push(step('两个数一共有几位小数？',a.scale+b.scale));}
   else {direction='把小数点对齐，相同数位才能一起计算。';const scale=Math.max(a.scale,b.scale);steps.push(step('先补齐：这道题对齐到几位小数？',scale));steps.push(step(`${a.coefficient*10**(scale-a.scale)} ${symbol(e.op)} ${b.coefficient*10**(scale-b.scale)} = ?`,calculate(e).coefficient*10**(scale-calculate(e).scale),'这些单位是同样大小的小份。'));}
   steps.push(step('把小数点放回去，结果是多少？',formatValue(calculate(e))));
 }else if(e.op==='*'){
   direction='把数拆成不同数位，从个位开始乘。';
   if(b.coefficient<10){let carry=0;for(let i=0;i<String(a.coefficient).length;i++){const digit=Math.floor(a.coefficient/10**i)%10,total=digit*b.coefficient+carry;steps.push(step(`${places[i]}：${digit} × ${b.coefficient}${carry?` + ${carry}（进位）`:''} = ?`,total,`写 ${total%10}${total>=10?`，向前进 ${Math.floor(total/10)}`:''}。`));carry=Math.floor(total/10);}if(carry)steps.push(step(`最后把进位写在${places[String(a.coefficient).length]}：`,carry));}
   else {const tens=Math.floor(b.coefficient/10)*10,ones=b.coefficient%10;steps.push(step(`${a.coefficient} × ${ones} = ?`,a.coefficient*ones));steps.push(step(`${a.coefficient} × ${tens} = ?`,a.coefficient*tens,'整十数的部分积要对齐十位。'));steps.push(step('把两个部分积加起来。',a.coefficient*b.coefficient));}
 }else if(e.op==='/'){
   direction='从高位开始：试商、乘回去、相减，再落下一位。';let remainder=0,started=false;const digits=String(a.coefficient).split('').map(Number);
   for(let i=0;i<digits.length;i++){const current=remainder*10+digits[i],quotient=Math.floor(current/b.coefficient);if(!started&&quotient===0){remainder=current;continue;}started=true;steps.push(step(`这一位：${current} ÷ ${b.coefficient}，商几？`,quotient));steps.push(step(`乘回去：${quotient} × ${b.coefficient} = ?`,quotient*b.coefficient));remainder=current-quotient*b.coefficient;steps.push(step(`相减：${current} − ${quotient*b.coefficient} = ?`,remainder,i<digits.length-1?`再落下下一位 ${digits[i+1]}。`:'检查余数小于除数。'));}
 }else {
   direction=e.op==='+'?'相同数位对齐，从个位开始，注意进位。':'相同数位对齐，不够减时先换一个十。';if(grade===1){direction='把数拆成几个十和几个一；不够减时，换一个十试试。';activity={kind:'place',a:a.coefficient};}
   const width=Math.max(String(a.coefficient).length,String(b.coefficient).length),digits=String(a.coefficient).padStart(width,'0').split('').reverse().map(Number);let carry=0;
   for(let i=0;i<width;i++){const x=digits[i],y=Math.floor(b.coefficient/10**i)%10;if(e.op==='+'){const total=x+y+carry;steps.push(step(`${places[i]}：${x} + ${y}${carry?' + 1（进位）':''} = ?`,total,`写 ${total%10}${total>=10?'，向前进 1':''}。`));carry=Math.floor(total/10);}else {if(digits[i]<y){let lender=i+1;while(digits[lender]===0)lender++;digits[lender]--;for(let j=lender-1;j>i;j--)digits[j]=9;digits[i]+=10;}steps.push(step(`${places[i]}：${digits[i]} − ${y} = ?`,digits[i]-y));}}
   if(e.op==='+'&&carry)steps.push(step(`最后把进位写在${places[width]}：`,carry));
 }
 if(scalar&&grade>=2&&!activity){
  const fixed=v=>{const scale=e.op==='+'||e.op==='-'?Math.max(a.scale,b.scale):v.scale;let text=formatValue(v);if(scale){if(!text.includes('.'))text+='.';text=text.padEnd(text.indexOf('.')+1+scale,'0');}return text;};
  activity={kind:e.op==='/'?'longDivision':'column',a:fixed(a),b:fixed(b),op:symbol(e.op)};
 }
 return {direction,activity,steps,full:[...steps.map(s=>s.prompt.replace('?',s.answer)+(s.note?' '+s.note:'')),...full]};
}
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function hintState(session,q){if(!session.hintState||session.hintState.questionId!==q.id)session.hintState={questionId:q.id,tier:1,step:0,marks:[],rounds:0,notice:''};return session.hintState;}
function choices(answer,limit=null){const n=Number(answer),scale=String(answer).includes('.')?String(answer).split('.')[1].length:0,unit=10**-scale;const values=[String(answer)];for(const offset of [1,-1,2,-2,10]){const value=String(Number((n+offset*unit).toFixed(scale)));if(n+offset*unit>=0&&(limit===null||n+offset*unit<=limit)&&!values.includes(value))values.push(value);if(values.length===4)break;}for(let x=0;values.length<4;x++){if(!values.includes(String(x)))values.push(String(x));}const shift=Math.abs(Math.round(n))%4;return [...values.slice(shift),...values.slice(0,shift)];}
export function hintMarkup(session,q){
 const h=hintState(session,q),model=hintModel(q),current=model.steps[h.step];
 let content=`<p class="hint-direction">${safe(model.direction)}</p>`;
 if(h.tier===1)content+=`<button class="primary" data-action="hint-tier" data-value="2">动手试一试</button>`;
 if(h.tier===2){const a=model.activity;
  if(a?.kind==='place'){h.placeTens??=Math.floor(a.a/10);h.placeOnes??=a.a%10;content+=`<div class="work-place" role="img" aria-label="${h.placeTens}个十和${h.placeOnes}个一"><div>${Array.from({length:h.placeTens},()=>'<i class="work-rod"></i>').join('')}</div><div>${Array.from({length:h.placeOnes},()=>'<i class="work-one"></i>').join('')}</div></div><p>${h.placeTens} 个十，${h.placeOnes} 个一</p><div class="work-answers"><button class="secondary" data-action="hint-unbundle" ${h.placeTens===0||h.placeOnes>9?'disabled':''}>换成十个一</button><button class="secondary" data-action="hint-bundle" ${h.placeOnes<10?'disabled':''}>合成一个十</button></div>`;}
  if(a?.kind==='column')content+=`<div class="hint-column" role="img" aria-label="${safe(a.a)} ${safe(a.op)} ${safe(a.b)} 的分步竖式"><span>${safe(a.a)}</span><span class="hint-column-bottom">${safe(a.op)} ${safe(a.b)}</span><span class="hint-column-result">?</span></div>`;
  if(a?.kind==='longDivision')content+=`<div class="long-work" role="img" aria-label="${safe(a.a)} 除以 ${safe(a.b)}，逐位试商"><span class="long-quotient">?</span><span>${safe(a.b)}</span><span class="long-dividend">${safe(a.a)}</span></div>`;
  if(a?.kind==='frame')content+=`<p>点小格子摆一摆；再点可以拿走。</p><div class="work-frame" role="group" aria-label="可操作十格框">${Array.from({length:Math.min(TOPICS[q.topicId]?.max||20,a.total<=5?5:Math.max(10,Math.ceil(a.total/10)*10))},(_,i)=>`<button data-action="hint-mark" data-value="${i}" aria-label="第${i+1}格${h.marks.includes(i)?'，已有星光':''}" aria-pressed="${h.marks.includes(i)}">${h.marks.includes(i)?'●':'·'}</button>`).join('')}</div>`;
  if(a&&['groups','divide'].includes(a.kind)){const each=a.kind==='groups'?a.each:h.rounds;content+=`<div class="work-groups" role="img" aria-label="${a.groups}队，每队${each}颗">${Array.from({length:a.groups},(_,i)=>`<span>${Array.from({length:Math.min(9,a.kind==='groups'&&i>=h.rounds?0:each)},()=>'<i>●</i>').join('')||'○'}${each>9?` ${each}颗`:''}</span>`).join('')}</div><p>${a.kind==='groups'?`已经摆了 ${Math.min(h.rounds,a.groups)} 队`:`已经平均分了 ${Math.min(h.rounds*a.groups,a.total)} 颗`}</p><button class="secondary" data-action="hint-distribute" ${h.rounds>=(a.kind==='groups'?a.groups:Math.floor(a.total/a.groups))?'disabled':''}>${a.kind==='groups'?'摆一队':'每队分一颗'}</button>`;}
  if(current)content+=`<h3>${safe(current.prompt)}</h3><div class="work-answers">${choices(current.answer,(q.grade||1)===1?(TOPICS[q.topicId]?.max??(Math.max(q.a||0,q.b||0,q.result||0)<=5&&q.levelId===1?5:Math.max(q.a||0,q.b||0,q.result||0)<=10?10:Math.max(q.a||0,q.b||0,q.result||0)<=20?20:100)):null).map(value=>`<button class="secondary" data-action="hint-answer" data-value="${safe(value)}">${safe(value)}</button>`).join('')}</div>`;
  else content+='<p>这些步骤都完成啦！回到原题，把你的答案告诉暖尾尾。</p>';
  content+=`<p class="hint-notice" role="status">${safe(h.notice)}</p><button class="text-button" data-action="hint-tier" data-value="3">一起看完整方法</button>`;
 }
 if(h.tier===3)content+=`<ol class="worked-steps">${model.full.map(line=>`<li>${safe(line)}</li>`).join('')}</ol>`;
 return `<div class="guided-help"><div class="help-original">${safe(q.format==='course-v1'?q.text:q.kind==='cards'?`选${q.pickCount}张卡凑出${q.target}`:q.kind==='chain'?q.terms.map((n,i)=>(i?symbol(q.ops[i-1])+' ':'')+n).join(' '):`${q.blank==='a'?'?':q.a} ${symbol(q.op)} ${q.blank==='b'?'?':q.b} = ${q.blank==='result'?'?':q.result}`)}</div><div class="help-content">${content}</div></div>`;
}
export function handleHint(session,q,action,value){const h=hintState(session,q),m=hintModel(q);if(action==='hint-tier'){h.tier=[1,2,3].includes(Number(value))?Number(value):h.tier;h.notice='';}if(action==='hint-mark'){const i=Number(value);if(Number.isInteger(i)&&i>=0&&i<20)h.marks=h.marks.includes(i)?h.marks.filter(v=>v!==i):[...h.marks,i];}if(action==='hint-distribute'){const a=m.activity,limit=a?.kind==='groups'?a.groups:a?.kind==='divide'?Math.floor(a.total/a.groups):0;h.rounds=Math.min(h.rounds+1,limit);}if(action==='hint-unbundle'&&m.activity?.kind==='place'&&h.placeTens>0&&h.placeOnes<=9){h.placeTens--;h.placeOnes+=10;}if(action==='hint-bundle'&&m.activity?.kind==='place'&&h.placeOnes>=10){h.placeTens++;h.placeOnes-=10;}if(action==='hint-answer'&&h.tier===2&&m.steps[h.step]){if(Number(value)===Number(m.steps[h.step].answer)){h.notice=m.steps[h.step].note||'这一步完成啦！';h.step++;}else h.notice='再看看这一小步。';}return h;}
