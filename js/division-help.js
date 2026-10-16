// Division is explained in quantities first, then one quotient place at a time.
// The model is independent of the main answer and of saved question versions.
export const DIVISION_HELP_REVISION=3;
const names=['个位','十位','百位','千位','万位','十万位'];
const units=['一','十','百','千','万','十万'];
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const step=(prompt,answer,note='',extra={})=>({prompt,answer:String(answer),note,...extra});
const card=(title,body)=>({title,body});
const unitCount=(n,place)=>`${n} 个${units[place]}`;
const verification=(total,divisor,quotient,remainder)=>remainder?`${divisor} × ${quotient} + ${remainder} = ${total}；余下 ${remainder}，比 ${divisor} 小。`:`${divisor} × ${quotient} = ${total}，刚好。`;
function finish(model,total,divisor,quotient,remainder){
 const check=verification(total,divisor,quotient,remainder);
 return {...model,divisionHelp:true,check,full:[...model.fullCards.map(c=>`${c.title}：${c.body}`),`检查：${check}`]};
}
export function divisionHintModel(total,divisor,grade=3){
 if(!Number.isSafeInteger(total)||total<0||!Number.isSafeInteger(divisor)||divisor<1)throw new RangeError('Invalid whole-number division');
 const quotient=Math.floor(total/divisor),remainder=total%divisor;
 if(grade<=2&&divisor<=9&&total<=99){
  if(quotient>9){
   const tens=Math.floor(total/10)*10,batch=tens%divisor===0?tens:Math.floor(quotient/10)*10*divisor,rest=total-batch,first=batch/divisor,second=Math.floor(rest/divisor);
   const steps=[step(`${batch} ÷ ${divisor} = ?`,first,'大的一份分好了。',{guide:`把 ${total} 拆成 ${batch} 和 ${rest}，两份都除以 ${divisor}。`}),step(`${rest} ÷ ${divisor}，商几？`,second,remainder?`余下 ${remainder}，不够再分一轮。`:'小的一份也分好了。'),step(`${first} + ${second} = ?`,quotient,'两份的商合起来。')];
   if(remainder)steps.push(step('还剩几颗？',remainder,`余下 ${remainder}，比 ${divisor} 少。`));
   return finish({direction:`把 ${total} 拆成好分的两份。分别除以 ${divisor}，再把得到的数加起来。`,activity:{kind:'divide',strategy:'partition',groups:divisor,total,batch,rest},steps,fullCards:[card('拆开分',`${total} = ${batch} + ${rest}。${batch} ÷ ${divisor} = ${first}。`),card('再分另一份',`${rest} ÷ ${divisor} = ${second}${remainder?` 余 ${remainder}`:''}。`),card('合起来',`${first} + ${second} = ${quotient}${remainder?`，还剩 ${remainder} 颗`:''}。`)]},total,divisor,quotient,remainder);
  }
  if(total<=20&&divisor<=4&&remainder===0){
   return finish({direction:`把 ${total} 颗平均分给 ${divisor} 队。每队要一样多。`,activity:{kind:'divide',strategy:'share',groups:divisor,total},steps:[step('每队分到多少颗？',quotient,'每队一样多，所有圆点刚好分完。',{guide:'点一次，给每队各分一颗；也可以点“全部分好”。'})],fullCards:[card('平均分',`${total} 颗分给 ${divisor} 队，每队 ${quotient} 颗。`),card('读算式',`${total} ÷ ${divisor} = ${quotient}。`)]},total,divisor,quotient,remainder);
  }
  return finish({direction:`每 ${divisor} 颗装一包。用乘法想一想，最多能装几包？`,activity:{kind:'divide',strategy:'group',groups:divisor,each:divisor,total},steps:[step(`每 ${divisor} 颗一包，最多装几包？`,quotient,'包数找到了，接着数整包用了多少颗。',{guide:remainder?`想 ${divisor} × 几最接近 ${total}，又不超过 ${total}。`:`想：${divisor} × 几 = ${total}？`}),step(`${divisor} × ${quotient} = ?`,divisor*quotient,'这是整包装走的数量。'),step(`${total} − ${divisor*quotient} = ?`,remainder,remainder?`余下 ${remainder}，不够再装一包。`:'刚好装完。')],fullCards:[card('想乘法',`${divisor} × ${quotient} = ${divisor*quotient}，能装 ${quotient} 包。`),card('看剩余',`${total} − ${divisor*quotient} = ${remainder}。${remainder?`余下 ${remainder}，不够 ${divisor} 颗。`:'没有剩余。'}`),card('读算式',`${total} ÷ ${divisor} = ${quotient}${remainder?` 余 ${remainder}`:''}。`)]},total,divisor,quotient,remainder);
 }
 const digits=String(total).split('').map(Number),steps=[];let rest=0,started=false;
 for(let column=0;column<digits.length;column++){
  const current=rest*10+digits[column],digit=Math.floor(current/divisor),place=digits.length-column-1;
  if(!started&&digit===0&&column<digits.length-1){rest=current;continue;}
  const previous=steps.at(-1),product=digit*divisor,remainderHere=current-product;
  let guide;
  if(!started&&column>0)guide=`先看前${column===1?'一':column===2?'两':column}位 ${String(total).slice(0,column)}，不够除以 ${divisor}；合看 ${String(total).slice(0,column+1)}。商从${names[place]}写起。`;
  else if(previous)guide=previous.remainder?`余下 ${unitCount(previous.remainder,place+1)}，换成 ${unitCount(previous.remainder*10,place)}；加上 ${unitCount(digits[column],place)}，共 ${unitCount(current,place)}。`:`接着看${names[place]}的 ${digits[column]}。`;
  else guide=`先看${names[place]}，把 ${unitCount(current,place)}平均分成 ${divisor} 份。`;
  if(divisor>=10)guide+=`想 ${divisor} × 几最接近 ${current}，又不超过它。`;
  const note=digit===0?`${names[place]}不够分，商写 0 占位${remainderHere?`，余下 ${unitCount(remainderHere,place)}`:''}。`:`${names[place]}写 ${digit}。${current} − ${product} = ${remainderHere}${remainderHere?`，余下 ${unitCount(remainderHere,place)}`:''}。`;
  steps.push(step(`${names[place]}：${current} ÷ ${divisor}，商几？`,digit,note,{division:'商',column,place,current,product,remainder:remainderHere,guide,unit:units[place],fullText:`${guide} ${current} ÷ ${divisor} = ${digit}${remainderHere?` 余 ${remainderHere}`:''}，${names[place]}写 ${digit}${digit===0?' 占位':''}。`}));
  rest=remainderHere;started=true;
 }
 const fullCards=steps.map(s=>card(s.place===0&&Number(s.answer)===0?'个位写 0':names[s.place],s.fullText));
 return finish({direction:'从高位开始，每次只算一个数位。算好一位，再看下一位。',activity:{kind:'longDivision',a:String(total),b:String(divisor),op:'÷'},steps,fullCards},total,divisor,quotient,remainder);
}

// Each grid cell is one decimal place. Products and remainders end directly
// below the dividend digit that was used, including a zero quotient place.
export function longDivisionMarkup(activity,steps,completed,{full=false}={}){
 const width=activity.a.length,done=full?steps:steps.slice(0,completed),digits=String(activity.a).split(''),all=done.length===steps.length,quotient=Array.from({length:width},(_,i)=>done.find(s=>s.column===i)?.answer??'');
 const row=(values,kind,label='',end=width-1)=>`<div class="division-grid-row ${kind}" role="row" aria-label="${safe(label)}"><span class="division-side" role="cell">${kind==='division-dividend'?safe(activity.b):kind==='division-product'?'−':''}</span>${Array.from({length:width},(_,i)=>`<span class="division-digit ${kind==='division-dividend'?'division-bracket ':''}${kind==='division-product'&&i<=end&&i>end-String(values.filter(v=>v!=='').join('')).length?'division-underlined':''}" role="cell" data-column="${i}">${safe(values[i]??'')}</span>`).join('')}</div>`;
 const aligned=(value,end)=>{const out=Array(width).fill('');String(value).split('').reverse().forEach((d,i)=>{if(end-i>=0)out[end-i]=d;});return out;};
 let html=row(digits.map((_,i)=>names[width-i-1]),'division-places','数位')+row(quotient,'division-quotient',`已写出的商 ${quotient.join('')||'还没写'}`)+row(digits,'division-dividend',`${activity.a} 除以 ${activity.b}`);
 for(const s of done){html+=row(aligned(s.product,s.column),'division-product',`${s.current} 减 ${s.product}`,s.column);const next=steps[steps.indexOf(s)+1],values=s.remainder===0&&next?Array(width).fill(''):aligned(s.remainder,s.column);if(next)values[next.column]=digits[next.column];html+=row(values,'division-remainder',next?`余下 ${s.remainder}，接着看下一位 ${digits[next.column]}`:`最后余下 ${s.remainder}`);}
 return `<div class="division-board" role="table" aria-label="按数位对齐的除法竖式" style="--division-digits:${width}">${html}</div>${all?`<p class="division-result">${safe(activity.a)} ÷ ${safe(activity.b)} = ${quotient.join('')||0}${done.at(-1)?.remainder?` 余 ${done.at(-1).remainder}`:''}</p>`:''}`;
}
export function divisionFullMarkup(model){
 const visual=model.activity.kind==='longDivision'?longDivisionMarkup(model.activity,model.steps,model.steps.length,{full:true}):'';
 return `<div class="division-complete"><ol class="worked-steps division-cards">${model.fullCards.map(c=>`<li><h3>${safe(c.title)}</h3><p>${safe(c.body)}</p></li>`).join('')}</ol><p class="division-check"><strong>检查</strong> ${safe(model.check)}</p>${visual?`<details class="division-full-column"><summary>看看竖式</summary>${visual}</details>`:''}</div>`;
}
