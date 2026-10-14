import {TOPICS} from './course-catalog.js?v=20261014-4';
import {number,operation,calculate,formatValue,expressionText,symbol} from './course-math.js?v=20261014-4';
import {validHelpState,newHelpState,MAX_HELP_MARKS} from './help-state.js?v=20261014-6';
const places=['个位','十位','百位','千位','万位','十万位'];
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const step=(prompt,answer,note='',extra={})=>({prompt,answer:String(answer),note,...extra});
const solvedStep=s=>s.prompt.includes('?')?s.prompt.replace('?',s.answer):`${s.prompt} ${s.answer}`;
function exprOf(q){if(q.expression)return q.expression;if(q.kind==='cards')return null;if(q.kind==='chain')return operation(q.ops[1],operation(q.ops[0],number(q.terms[0]),number(q.terms[1])),number(q.terms[2]));return operation(q.op,number(q.a),number(q.b));}
const scalar=e=>e?.left?.type==='number'&&e?.right?.type==='number';
const fixed=(v,scale)=>{let s=formatValue(v);if(scale){if(!s.includes('.'))s+='.';s=s.padEnd(s.indexOf('.')+scale+1,'0');}return s;};
function cardSolution(q){for(let m=1;m<2**q.deck.length;m++){const chosen=q.deck.filter((_,i)=>m&(1<<i));if(chosen.length===q.pickCount&&chosen.reduce((a,b)=>a+b,0)===q.target)return chosen;}return [];}
function mixedSteps(e){const out=[];const walk=(n,path='r')=>{if(n.type==='number')return;walk(n.left,path+'L');walk(n.right,path+'R');out.push(step(`${formatValue(calculate(n.left))} ${symbol(n.op)} ${formatValue(calculate(n.right))} = ?`,formatValue(calculate(n)),'把这一步的结果放回算式。',{operationId:path}));};walk(e);return out;}
function columnSteps(a,b,op){
 const out=[],width=Math.max(String(a).length,String(b).length),digits=String(a).padStart(width,'0').split('').reverse().map(Number);let carry=0;
 for(let i=0;i<width;i++){const x=digits[i],y=Math.floor(b/10**i)%10;
  if(op==='+'){const n=x+y+carry;out.push(step(`${places[i]}：${x} + ${y}${carry?' + 1（进位）':''} = ?`,n,`写 ${n%10}${n>=10?'，向前进 1':''}。`,{place:i,written:n%10,carry:Math.floor(n/10)}));carry=Math.floor(n/10);}
  else {let borrowed=false;if(digits[i]<y){let lender=i+1;while(digits[lender]===0)lender++;digits[lender]--;for(let j=lender-1;j>i;j--)digits[j]=9;digits[i]+=10;borrowed=true;}out.push(step(`${places[i]}：${digits[i]} − ${y} = ?`,digits[i]-y,borrowed?'借来一个高位单位，换成十个当前单位。':'这一位算好了。',{place:i,written:digits[i]-y,borrowed,topDigits:[...digits]}));}
 }
 if(op==='+'&&carry)out.push(step(`最后把进位写在${places[width]}：`,carry,'',{place:width,written:carry}));return out;
}
export function hintModel(q){
 const e=exprOf(q),grade=q.grade||1;
 if(!e){const chosen=cardSolution(q);return {direction:`每张卡只能用一次。选 ${q.pickCount} 张，看看离 ${q.target} 还差多少。`,activity:{kind:'cards',deck:q.deck,target:q.target,pickCount:q.pickCount},steps:[],full:[`可以试试 ${chosen.join(' + ')} = ${q.target}。`,'也可能有别的搭配，放回原题试一试。']};}
 if(q.blank&&q.blank!=='result'){
  const left=['a','left'].includes(q.blank),total=calculate(e),known=left?e.right:e.left;
  const inverse=e.op==='+'?operation('-',number(total),known):e.op==='-'?(left?operation('+',number(total),known):operation('-',known,number(total))):e.op==='*'?operation('/',number(total),known):(left?operation('*',number(total),known):operation('/',known,number(total)));
  const m=hintModel({...q,expression:inverse,blank:'result'}),relation=`${expressionText(inverse)} = ?`;
  return {...m,direction:`${['*','/'].includes(e.op)?'乘除互相帮忙':'整体与部分互相帮忙'}。先用已知的数找问号，再放回原题检查。`,relation,full:[`换个想法：${relation}`,...m.full,'把找到的数放回原题，检查两边是否一样。']};
 }
 if(q.topicId==='laws'&&e.op==='+'&&e.left.type==='operation'&&e.left.op==='*'&&e.right.type==='operation'&&e.right.op==='*'&&JSON.stringify(e.left.left)===JSON.stringify(e.right.left)){
  const strategy=operation('*',e.left.left,operation('+',e.left.right,e.right.right)),steps=mixedSteps(strategy);
  return {direction:'找相同的因数，另外两部分先合起来。试试乘法分配律。',relation:`${expressionText(e)} = ${expressionText(strategy)}`,activity:{kind:'order',expression:strategy},steps,full:[`相同的因数保留：${expressionText(e)} = ${expressionText(strategy)}`,...steps.map(s=>solvedStep(s))]};
 }
 if(!scalar(e)){
  const steps=mixedSteps(e),hasBrackets=/[（(]/.test(q.text||expressionText(e));
  return {direction:hasBrackets?'先看括号，按算式结构一步步算。点选这次先算的部分。':'先乘除，后加减；同级从左往右。点选这次先算的部分。',activity:{kind:'order',expression:e},steps,full:[...steps.map(s=>solvedStep(s)),'每次只替换刚算好的部分，最后验算。']};
 }
 const a=e.left.value,b=e.right.value,x=a.coefficient,y=b.coefficient,steps=[];let activity=null,direction='先看清数字与符号，一次只算一步。';
 if(grade===1&&!a.scale&&!b.scale&&Math.max(x,y)<=20){
  const target=e.op==='+'?x+y:x-y;
  direction=e.op==='+'?'紫色是原来的，金色是新来的。把两组放在一起数一数。':'先看原来的数量，拿走的留下划线，再数还剩多少。';
  activity={kind:'frame',a:x,b:y,op:e.op,total:e.op==='+'?target:x,target,capacity:Math.min(MAX_HELP_MARKS,Math.ceil(Math.max(1,e.op==='+'?target:x)/10)*10)};
  steps.push(step(e.op==='+'?'合在一起，一共有多少颗？':'拿走以后，还剩多少颗？',target));
 }else if(grade<=2&&['*','/'].includes(e.op)&&!a.scale&&!b.scale&&y<=9&&x<=99){
  if(e.op==='*'){
   direction='每队一样多。每摆好一队，就多了同样多的数量。';activity={kind:'groups',groups:y,each:x,total:x*y};steps.push(step(`${y} 队，每队 ${x} 颗，一共多少？`,x*y));
  }else {
   const quotient=Math.floor(x/y),remainder=x%y;
   if(quotient>9){
    const tens=Math.floor(x/10)*10,batch=tens%y===0?tens:Math.floor(quotient/10)*10*y,rest=x-batch;
    direction='先拆成能整除的大份，再处理剩下的。把两次的商合起来。';
    activity={kind:'divide',strategy:'partition',groups:y,total:x,batch,rest};
    steps.push(step(`${batch} ÷ ${y} = ?`,batch/y,'先算大的一份。'));
    steps.push(step(`${rest} ÷ ${y}，商几？`,Math.floor(rest/y),'再算剩下的一份。'));
    steps.push(step(`${batch/y} + ${Math.floor(rest/y)} = ?`,quotient,'两份的商合起来。'));
    if(remainder)steps.push(step(`还剩几颗？`,remainder,'余数比除数小。'));
   }else if(x<=20&&y<=4&&remainder===0){
    direction=`一共有 ${x} 颗，平均分给 ${y} 队。点一次，就给每队同时分一颗。`;
    activity={kind:'divide',strategy:'share',groups:y,total:x};steps.push(step('每队分到多少颗？',quotient));
   }else {
    direction=`${q.story?'换个角度看算式：':''}每 ${y} 颗装一包。想一想 ${y} 的乘法，怎样装得最多，又不会超过 ${x} 颗？包数就是商，剩下的是余数。`;
    activity={kind:'divide',strategy:'group',groups:y,each:y,total:x};
    steps.push(step(`每 ${y} 颗装一包，最多能装几包？`,quotient,'用乘法找不超过总数的最大整组。'));
    steps.push(step(`${y} × ${quotient} = ?`,y*quotient,'这是所有整包的数量。'));
    steps.push(step(`${x} − ${y*quotient} = ?`,remainder,remainder?`剩下 ${remainder} 颗，不够再装一包。`:'刚好装完，没有余数。'));
   }
  }
 }else if(a.scale||b.scale){
  const scale=Math.max(a.scale,b.scale);
  if(e.op==='*'){direction='先按整数乘，再数两个因数一共有几位小数。';steps.push(step(`${x} × ${y} = ?`,x*y,'先得到整数部分积。',{partial:true}));steps.push(step('两个数一共有几位小数？',a.scale+b.scale,'从积的右边数出相应的小数位。'));}
  else {direction='小数点对齐；十分位对十分位，百分位对百分位。空位补零，再逐列计算。';steps.push(step('先补齐：这道题对齐到几位小数？',scale,'小数末尾补零，数的大小不变。'));const n=calculate(e);steps.push(step(`${x*10**(scale-a.scale)} ${symbol(e.op)} ${y*10**(scale-b.scale)} = ?`,n.coefficient*10**(scale-n.scale),'现在每个单位都是同样大小的小份。',{partial:true}));}
  steps.push(step('把小数点放回去，结果是多少？',formatValue(calculate(e)),'用估算再检查一次。',{final:true}));
  activity={kind:'column',a:fixed(a,e.op==='*'?a.scale:scale),b:fixed(b,e.op==='*'?b.scale:scale),op:symbol(e.op),decimal:true,scale:e.op==='*'?a.scale+b.scale:scale};
 }else if(e.op==='*'){
  direction=y<10?'从个位开始乘，满十向前进。每算好一位，就把这一位写下来。':'把乘数拆成整十和个位，分别算部分积，再相加。';
  if(y<10){let carry=0;for(let i=0;i<String(x).length;i++){const digit=Math.floor(x/10**i)%10,n=digit*y+carry;steps.push(step(`${places[i]}：${digit} × ${y}${carry?` + ${carry}（进位）`:''} = ?`,n,`写 ${n%10}${n>=10?`，向前进 ${Math.floor(n/10)}`:''}。`,{place:i,written:n%10,carry:Math.floor(n/10)}));carry=Math.floor(n/10);}if(carry)steps.push(step(`最后把进位写在${places[String(x).length]}：`,carry,'',{place:String(x).length,written:carry}));}
  else {const tens=Math.floor(y/10)*10,ones=y%10;steps.push(step(`${x} × ${ones} = ?`,x*ones,'先用个位相乘。',{partial:true}));steps.push(step(`${x} × ${tens} = ?`,x*tens,'整十的部分积从十位写起。',{partial:true}));steps.push(step('把两个部分积加起来。',x*y,'用较接近的整十数估一估。',{final:true}));}
 }else if(e.op==='/'){
  direction=y>=10?'先估一估商几，用商乘回除数；大了调小，再相减、落下一位。':'从高位开始：商、乘、减、落。不够商一时，商零占位。';
  let remainder=0,started=false;const digits=String(x).split('').map(Number);
  for(let i=0;i<digits.length;i++){const current=remainder*10+digits[i],quotient=Math.floor(current/y);if(!started&&quotient===0&&i<digits.length-1){remainder=current;continue;}started=true;steps.push(step(`这一位：${current} ÷ ${y}，商几？`,quotient,`${y} × 商不能超过 ${current}。`,{division:'商',column:i,current}));steps.push(step(`乘回去：${quotient} × ${y} = ?`,quotient*y,'',{division:'乘',column:i}));remainder=current-quotient*y;steps.push(step(`相减：${current} − ${quotient*y} = ?`,remainder,i<digits.length-1?`落下下一位 ${digits[i+1]}，与余下的数合起来。`:`余下 ${remainder}，小于除数 ${y}。`,{division:'减',column:i}));if(i<digits.length-1)steps.push(step(`落下 ${digits[i+1]}：${remainder} 个十和 ${digits[i+1]} 个一，合起来是？`,remainder*10+digits[i+1],'接着用这个数试商。',{division:'落',column:i+1}));}
 }else {
  direction=e.op==='+'?'相同数位对齐，从个位开始，注意进位。':'从个位开始，不够减时向前借；遇到零，要继续向前借。';
  if(grade===1){direction=e.op==='+'?'先看几个十和几个一。把同样大小的单位放在一起。':'先看个位够不够减。不够时，把一根十棒换成十个一。';activity={kind:'place',a:x,b:y,op:e.op};}
  steps.push(...columnSteps(x,y,e.op));
 }
 if(!activity)activity={kind:e.op==='/'?'longDivision':'column',a:String(x),b:String(y),op:symbol(e.op)};
 const check=e.op==='/'?`${y} × ${Math.floor(x/y)} + ${x%y} = ${x}，检查余数小于除数。`:e.op==='*'?'可以交换两个因数，再检查一次。':'可以用相反的运算，放回原数检查。';
 return {direction,activity,steps,full:[...steps.map(s=>solvedStep(s)+(s.note?' '+s.note:'')),check]};
}
export function hintState(session,q){if(!validHelpState(session.hintState,q.id))session.hintState=newHelpState(q);else if(session.hintState.version!==2)session.hintState={...newHelpState(q),tier:session.hintState.tier};return session.hintState;}
function choices(answer,limit=null){const n=Number(answer),scale=String(answer).split('.')[1]?.length||0,unit=10**-scale,values=[String(answer)];for(const offset of [1,-1,2,-2,10]){const v=Number((n+offset*unit).toFixed(scale));if(v>=0&&(limit===null||v<=limit)&&!values.includes(String(v)))values.push(String(v));if(values.length===4)break;}for(let v=0;values.length<4;v++)if(!values.includes(String(v))&&(limit===null||v<=limit))values.push(String(v));const shift=Math.abs(Math.round(n))%4;return [...values.slice(shift),...values.slice(0,shift)];}
// Every dot is counted. Larger quantities use labelled tens instead of clipping dots.
function quantity(n,color='purple'){return n<=20?`<span class="quantity-dots ${color}" aria-label="${n} 颗">${Array.from({length:n},()=>'<i aria-hidden="true">●</i>').join('')||'<small>还没有</small>'}</span>`:`<span class="quantity-bundles ${color}" aria-label="${Math.floor(n/10)} 个十和 ${n%10} 个一">${Array.from({length:Math.floor(n/10)},()=>'<b>10</b>').join('')}${Array.from({length:n%10},()=>'<i>●</i>').join('')}</span>`;}
function frameMarkup(a,h){
 if(h.manual)return `<p>自己摆：先摆 ${a.a} 颗${a.op==='+'?`，再摆 ${a.b} 颗`:`，然后拿走 ${a.b} 颗`}。点格子放入，再点拿走。</p><div class="work-frame" role="group" aria-label="自己摆的小格子，共${a.capacity}格">${Array.from({length:a.capacity},(_,i)=>`<button class="${i<a.a?'purple':'gold'}" data-action="hint-mark" data-value="${i}" aria-label="第${i+1}格${h.marks.includes(i)?'，已有圆点':''}" aria-pressed="${h.marks.includes(i)}">${h.marks.includes(i)?'●':'·'}</button>`).join('')}</div><button class="text-button" data-action="hint-manual">回到两组圆点</button>`;
 if(a.op==='+'){
  const moved=h.moved=Math.min(a.b,h.moved||0),movedMarks=h.movedMarks||Array.from({length:moved},(_,i)=>i);
  return `<div class="quantity-pair"><section class="quantity-tray"><h3>原来的 ${a.a} 颗 · 紫色</h3>${quantity(a.a)}${moved?quantity(moved,'gold'):''}</section><section class="quantity-tray incoming"><h3>添上 ${a.b} 颗 · 金色</h3><div class="move-dots">${Array.from({length:a.b},(_,i)=>`<button data-action="hint-move" data-value="${i}" aria-label="${movedMarks.includes(i)?'这颗已经移过去':'把一颗金色圆点移过去'}" ${movedMarks.includes(i)?'disabled':''}>${movedMarks.includes(i)?'✓':'●'}</button>`).join('')}</div></section></div><p>金色圆点移到紫色旁边，数量没有变。${moved===a.b?'两组已经合在一起，自己数一数。':''}</p><div class="helper-tools"><button class="secondary" data-action="hint-all" ${moved===a.b?'disabled':''}>一次摆好</button><button class="text-button" data-action="hint-reset">重新摆</button><button class="text-button" data-action="hint-manual">自己摆</button></div>`;
 }
 return `<section class="quantity-tray"><h3>原来 ${a.a} 颗 · 要拿走 ${a.b} 颗</h3><div class="subtract-dots">${Array.from({length:a.a},(_,i)=>`<button class="${h.marks.includes(i)?'removed':''}" data-action="hint-remove" data-value="${i}" aria-pressed="${h.marks.includes(i)}" aria-label="${h.marks.includes(i)?'放回':'拿走'}第${i+1}颗">●${h.marks.includes(i)?'<span>×</span>':''}</button>`).join('')}</div></section><p>已经拿走 ${h.marks.length} 颗。数一数没有划掉的，还剩多少？</p><div class="helper-tools"><button class="secondary" data-action="hint-all" ${h.marks.length===a.b?'disabled':''}>拿走 ${a.b} 颗</button><button class="text-button" data-action="hint-reset">放回来</button></div>`;
}
function groupMarkup(a,h){
 h.rounds=Math.min(h.rounds,a.kind==='groups'?a.groups:Math.floor(a.total/a.groups));
 const multiply=a.kind==='groups',each=multiply?a.each:h.rounds,limit=multiply?a.groups:Math.floor(a.total/a.groups),rest=multiply?0:a.total-h.rounds*a.groups;
 return `<p>${multiply?`摆 ${a.groups} 队，每队 ${a.each} 颗。已经摆好 ${h.rounds} 队。`:`共有 ${a.total} 颗，平均分给 ${a.groups} 队。`}</p><div class="helper-tools group-tools"><button class="secondary" data-action="hint-distribute" ${h.rounds>=limit?'disabled':''}>${multiply?'摆一队':'每队分一颗'}</button><button class="secondary" data-action="hint-all" ${h.rounds>=limit?'disabled':''}>${multiply?'全部摆好':'全部分好'}</button><button class="text-button" data-action="hint-reset">再试一次</button></div>${!multiply?`<section class="quantity-tray remainder-tray"><h3>${h.rounds===limit?'剩余':'还没分'} · ${rest} 颗</h3>${quantity(rest,'gold')}${h.rounds===limit?`<p>${rest?`剩下的不足 ${a.groups} 颗，不能再每队分一颗。`:'刚好分完，没有剩余。'}</p>`:''}</section>`:''}<div class="work-groups ${a.groups>=5?'dense-groups':''}" role="group" aria-label="${a.groups}队，每队${each}颗">${Array.from({length:a.groups},(_,i)=>`<section><h4>第 ${i+1} 队</h4>${quantity(multiply&&i>=h.rounds?0:each)}<small>${multiply&&i>=h.rounds?'等着摆好':`每队 ${each} 颗`}</small></section>`).join('')}</div>`;
}
function divisionGroupMarkup(a,h,m){
 if(a.strategy==='partition')return `<div class="division-split"><div><small>一共有</small><strong>${a.total}</strong></div><span>拆成</span><div><strong>${a.batch}</strong><small>先除以 ${a.groups}</small></div><span>和</span><div><strong>${a.rest}</strong><small>再除以 ${a.groups}</small></div></div><div class="division-facts">${m.steps.slice(0,h.step).map(s=>`<p>${safe(solvedStep(s))}</p>`).join('')}</div>`;
 const quotient=Math.floor(a.total/a.each),trial=h.trial||0,used=trial*a.each,rest=a.total-used,options=quotient>=9?[7,8,9]:[Math.max(1,quotient-1),quotient,quotient+1].filter((n,i,all)=>all.indexOf(n)===i),rotate=quotient%options.length,candidates=[...options.slice(rotate),...options.slice(0,rotate)];
 return `<div class="division-total">一共有 <strong>${a.total}</strong> 颗<span>每包 ${a.each} 颗</span></div><p class="division-trial-label">用乘法试一试，选一个包数：</p><div class="division-trials">${candidates.map(n=>`<button class="secondary" data-action="hint-trial" data-value="${n}" aria-pressed="${trial===n}" ${h.step>0?'disabled':''}>${n} 包</button>`).join('')}</div>${trial?`<div class="division-trial-result ${rest<0?'trial-too-many':''}"><strong>${a.each} × ${trial} = ${used}</strong><p>${rest<0?`超过 ${a.total} 了，少装一包试试。`:rest>=a.each?`还剩 ${rest} 颗，还能再装一包，试试多一点。`:`${rest?`还剩 ${rest} 颗，不够再装一包。`:'刚好装完。'}找到了，最多 ${trial} 包。`}</p></div>${rest>=0?`<div class="filled-packs" aria-label="${trial}个完整包，每包${a.each}颗">${Array.from({length:trial},(_,i)=>`<div class="filled-pack"><span class="pack-dots" aria-hidden="true">${Array.from({length:a.each},()=>'<i>●</i>').join('')}</span><small>第 ${i+1} 包 · ${a.each} 颗</small></div>`).join('')}</div><section class="quantity-tray remainder-tray"><h3>${rest<a.each?'余下':'还没装'} · ${rest} 颗</h3>${quantity(rest,'gold')}</section>`:''}`:'<p class="division-empty-note">不用一颗颗分，先想想乘法口诀。</p>'}<button class="text-button" data-action="hint-reset">重新试一试</button>`;
}
function columnMarkup(a,h,m){
 const done=m.steps.slice(0,h.step),numeric=done.filter(s=>s.place!==undefined),width=Math.max(a.a.replace('.','').length,a.b.replace('.','').length),digits=Array.from({length:Math.max(width,...numeric.map(s=>s.place+1))},(_,i)=>numeric.find(s=>s.place===i)?.written??'·').reverse().join(''),last=done.at(-1),complete=h.step>=m.steps.length;
 if(a.kind==='longDivision')return `<div class="long-work" aria-label="商随步骤写出"><span class="long-quotient">${done.filter(s=>s.division==='商').map(s=>safe(s.answer)).join('')||'?'}</span><span>${safe(a.b)}</span><span class="long-dividend">${safe(a.a)}</span><div class="division-lines">${done.map(s=>`<div class="division-line division-${s.division}"><small>${s.division}</small><span>${s.division==='乘'?'− ':s.division==='落'?'↓ ':''}${safe(s.answer)}</span></div>`).join('')}</div></div><div class="division-route">${['商','乘','减','落'].map(w=>`<span class="${m.steps[h.step]?.division===w?'current':''}">${w}</span>`).join('')}</div>${last?.division==='减'?`<p class="place-note">${safe(last.note)}</p>`:''}`;
 let shown=numeric.length?digits:'?';if(a.decimal)shown=complete?m.steps.at(-1).answer:'?';else if(done.some(s=>s.final))shown=done.find(s=>s.final).answer;
 return `<div class="hint-column" aria-label="随步骤填写的竖式"><span class="column-annotation">${last?.borrowed?last.topDigits.slice().reverse().join(' '):last?.carry?`进 ${last.carry} ↙`:''}</span><span>${safe(a.a)}</span><span class="hint-column-bottom">${safe(a.op)} ${safe(a.b)}</span>${done.filter(s=>s.partial).map(s=>`<span class="partial-product">${safe(s.answer)}</span>`).join('')}<span class="hint-column-result">${safe(shown)}</span></div>${a.decimal?`<p class="place-note">${a.op==='×'?`积有 ${complete?a.scale:'?'} 位小数`:'小数点对齐，末尾补零'}</p>`:''}${last?.carry?`<p class="place-note">写 ${last.written}，向${places[last.place+1]}进 ${last.carry}</p>`:''}${last?.borrowed?'<p class="place-note">借位后，上面这一列变成 '+last.topDigits[last.place]+'。</p>':''}`;
}
function simplifiedTree(e,done,path='r'){if(e.type==='number')return e;if(done.some(s=>s.operationId===path))return number(calculate(e));return {...e,left:simplifiedTree(e.left,done,path+'L'),right:simplifiedTree(e.right,done,path+'R')};}
function orderMarkup(a,h,m){const root=simplifiedTree(a.expression,m.steps.slice(0,h.step)),current=m.steps[h.step];const draw=(n,path='r')=>n.type==='number'?safe(formatValue(n.value)):scalar(n)?`<button class="order-piece ${path===current?.operationId?'next-operation':''}" data-action="hint-order" data-value="${path}" aria-pressed="${h.orderReady===h.step+1&&path===current?.operationId}">${safe(expressionText(n))}</button>`:`<span class="order-expression">(${draw(n.left,path+'L')} ${symbol(n.op)} ${draw(n.right,path+'R')})</span>`;return `<div class="order-work" aria-label="选择先计算的部分">${draw(root)}</div>${current?'<p>点一下高亮部分，再算这一小步。</p>':'<p>每一步的结果都放回去了。</p>'}`;}
function activityMarkup(a,h,m){
 if(a.kind==='frame')return frameMarkup(a,h);
 if(a.kind==='divide'&&a.strategy!=='share')return divisionGroupMarkup(a,h,m);
 if(['groups','divide'].includes(a.kind))return groupMarkup(a,h);
 if(a.kind==='order')return orderMarkup(a,h,m);
 if(a.kind==='cards'){const chosen=a.deck.filter((_,i)=>(h.cardMask||0)&(1<<i)),sum=chosen.reduce((x,y)=>x+y,0);return `<div class="helper-card-goal">目标 ${a.target} · 选 ${a.pickCount} 张</div><div class="helper-card-deck">${a.deck.map((n,i)=>`<button class="secondary" data-action="hint-card" data-value="${i}" aria-pressed="${Boolean((h.cardMask||0)&(1<<i))}">${n}</button>`).join('')}</div><p>${chosen.length?`${chosen.join(' + ')} = ${sum}；${sum>a.target?'有点多了，换一张试试':sum===a.target?'和目标一样多了':`还差 ${a.target-sum}`}。`:'先选一张卡，看看还差多少。'}</p><p>${chosen.length===a.pickCount&&sum===a.target?'找到了！回到原题，自己选卡再提交。':'这里摆卡，不会改变原题里的卡槽。'}</p>`;}
 if(a.kind==='place'){
  h.placeTens??=Math.floor(a.a/10);h.placeOnes??=a.a%10;
  return `<div class="quantity-pair"><section class="quantity-tray"><h3>原来 ${a.a}</h3><div class="work-place" role="img" aria-label="${h.placeTens}个十和${h.placeOnes}个一"><div>${Array.from({length:h.placeTens},()=>'<i class="work-rod"></i>').join('')}</div><div>${Array.from({length:h.placeOnes},()=>'<i class="work-one"></i>').join('')}</div></div><p>${h.placeTens} 个十，${h.placeOnes} 个一</p></section><section class="quantity-tray incoming"><h3>${a.op==='+'?'添上':'拿走'} ${a.b}</h3>${quantity(a.b,'gold')}</section></div><div class="helper-tools"><button class="secondary" data-action="hint-unbundle" ${h.placeTens===0||h.placeOnes>9?'disabled':''}>换成十个一</button><button class="secondary" data-action="hint-bundle" ${h.placeOnes<10?'disabled':''}>合成一个十</button></div>${columnMarkup({kind:'column',a:String(a.a),b:String(a.b),op:symbol(a.op)},h,m)}`;
 }
 return columnMarkup(a,h,m);
}
export function hintMarkup(session,q){
 const h=hintState(session,q),model=hintModel(q),current=model.steps[h.step];
 let content=`<p class="hint-direction">${safe(model.direction)}</p>${model.relation?`<p class="inverse-relation">换个想法：${safe(model.relation)}</p>`:''}`;
 if(h.tier===1)content+='<button class="primary" data-action="hint-tier" data-value="2">动手试一试</button>';
 if(h.tier===2){content+=activityMarkup(model.activity,h,model);
  if(current){const limit=(q.grade||1)===1?(TOPICS[q.topicId]?.max??(Math.max(Number(current.answer),q.a||0,q.b||0,q.result||0)<=5&&q.levelId===1?5:Math.max(Number(current.answer),q.a||0,q.b||0,q.result||0)<=10?10:Math.max(Number(current.answer),q.a||0,q.b||0,q.result||0)<=20?20:100)):null;
   content+=`<div class="helper-step"><p class="helper-step-count">第 ${h.step+1} / ${model.steps.length} 步</p><h3>${safe(current.prompt)}</h3><div class="work-answers">${model.activity.kind==='divide'&&model.activity.strategy==='group'&&h.step===0?'':choices(current.answer,limit).map(v=>`<button class="secondary" data-action="hint-answer" data-value="${safe(v)}" ${model.activity.kind==='order'&&h.orderReady!==h.step+1?'disabled':''}>${safe(v)}</button>`).join('')}</div></div>`;
  }else if(model.activity.kind!=='cards')content+='<p class="helper-finished">这些步骤完成啦！回到原题，把你的答案告诉暖尾尾。</p>';
  content+=`<p class="hint-notice" role="status">${safe(h.notice)}</p>${h.step?`<details class="helper-history"><summary>刚才算过的 ${h.step} 步</summary><ol>${model.steps.slice(0,h.step).map(s=>`<li>${safe(solvedStep(s))} ${safe(s.note)}</li>`).join('')}</ol></details>`:''}<button class="text-button" data-action="hint-tier" data-value="3">一起看完整方法</button>`;
 }
 if(h.tier===3)content+=`<ol class="worked-steps">${model.full.map(line=>`<li>${safe(line)}</li>`).join('')}</ol><button class="secondary" data-action="hint-tier" data-value="2">回到动手试</button>`;
 const original=q.format==='course-v1'?q.text:q.kind==='cards'?`选 ${q.pickCount} 张卡，凑出 ${q.target}`:q.kind==='chain'?q.terms.map((n,i)=>(i?symbol(q.ops[i-1])+' ':'')+n).join(' '):`${q.blank==='a'?'?':q.a} ${symbol(q.op)} ${q.blank==='b'?'?':q.b} = ${q.blank==='result'?'?':q.result}`;
 return `<div class="guided-help"><div class="help-original"><small>原题</small>${q.story?`<span class="help-story">${safe(q.story)}</span>`:''}<strong>${safe(original)}</strong><p>这里动手练，回原题再提交。</p></div><div class="help-content" tabindex="-1">${content}</div></div>`;
}
export function handleHint(session,q,action,value){
 const h=hintState(session,q),m=hintModel(q),a=m.activity,i=Number(value),limit=a.kind==='groups'?a.groups:a.kind==='divide'?Math.floor(a.total/a.groups):0;
 if(action==='hint-tier'){if([1,2,3].includes(i))h.tier=i;h.notice='';}
 if(action==='hint-mark'&&a.kind==='frame'&&Number.isInteger(i)&&i>=0&&i<a.capacity)h.marks=h.marks.includes(i)?h.marks.filter(v=>v!==i):[...h.marks,i];
 if(action==='hint-manual'&&a.kind==='frame'){h.manual=!h.manual;h.marks=[];}
 if(action==='hint-move'&&a.kind==='frame'&&a.op==='+'&&Number.isInteger(i)&&i>=0&&i<a.b){h.movedMarks||=Array.from({length:h.moved||0},(_,n)=>n);if(!h.movedMarks.includes(i))h.movedMarks.push(i);h.moved=h.movedMarks.length;}
 if(action==='hint-remove'&&a.kind==='frame'&&a.op==='-'&&Number.isInteger(i)&&i>=0&&i<a.a){if(h.marks.includes(i))h.marks=h.marks.filter(v=>v!==i);else if(h.marks.length<a.b)h.marks.push(i);else h.notice=`已经拿走 ${a.b} 颗，看看还剩多少。`;}
 if(action==='hint-distribute')h.rounds=Math.min(h.rounds+1,limit);
 if(action==='hint-all'){if(a.kind==='frame'){if(a.op==='+'){h.moved=a.b;h.movedMarks=Array.from({length:a.b},(_,n)=>n);}else h.marks=Array.from({length:a.b},(_,n)=>a.a-1-n);}else {h.rounds=limit;if(a.kind==='divide')h.trial=limit;}}
 if(action==='hint-reset'){h.rounds=0;h.moved=0;h.movedMarks=[];h.marks=[];h.step=0;h.answers=[];h.orderReady=0;h.trial=0;h.notice='';}
 if(action==='hint-unbundle'&&a.kind==='place'){h.placeTens??=Math.floor(a.a/10);h.placeOnes??=a.a%10;if(h.placeTens>0&&h.placeOnes<=9){h.placeTens--;h.placeOnes+=10;}}
 if(action==='hint-bundle'&&a.kind==='place'&&h.placeOnes>=10){h.placeTens++;h.placeOnes-=10;}
 if(action==='hint-trial'&&a.kind==='divide'&&a.strategy==='group'&&h.step===0&&Number.isInteger(i)&&i>=1&&i<=100){h.trial=i;const rest=a.total-i*a.each;if(rest>=0&&rest<a.each){h.rounds=i;h.answers=[m.steps[0].answer];h.step=1;h.notice=m.steps[0].note;}else h.notice=rest<0?'有点多了，试小一点。':'还可以多装一包。';}
 if(action==='hint-card'&&a.kind==='cards'&&Number.isInteger(i)&&i>=0&&i<a.deck.length){const mask=h.cardMask||0,bit=1<<i;if((mask&bit)||mask.toString(2).replaceAll('0','').length<a.pickCount)h.cardMask=mask^bit;}
 if(action==='hint-order'&&a.kind==='order'&&m.steps[h.step]){if(value===m.steps[h.step].operationId){h.orderReady=h.step+1;h.notice='选好了，现在算这一小步。';}else h.notice='这次先沿着高亮的一步来。';}
 if(action==='hint-answer'&&h.tier===2&&m.steps[h.step]&&(a.kind!=='order'||h.orderReady===h.step+1)){if(Number(value)===Number(m.steps[h.step].answer)){if(a.kind==='divide'&&a.strategy==='group'&&h.step===0){h.trial=Number(value);h.rounds=Number(value);}h.notice=m.steps[h.step].note||'这一步完成啦！';h.answers=m.steps.slice(0,h.step+1).map(s=>s.answer);h.step++;}else h.notice='再看看这一小步。';}
 return h;
}
