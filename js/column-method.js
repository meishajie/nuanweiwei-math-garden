// Decimal columns are shown only after the learner requests the method.
export function columnMethod(q) {
  if (!q || q.kind === 'cards' || q.kind === 'chain') return null;
  let a=q.a,b=q.b,op=q.op;
  if(q.blank==='a') {a=q.result;b=q.b;op=q.op==='+'?'-':'+';}
  if(q.blank==='b') {a=q.op==='+'?q.result:q.a;b=q.op==='+'?q.a:q.result;op='-';}
  const result=op==='+'?a+b:a-b;
  if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<0||b<0||result<0)return null;
  const names=['个位','十位','百位','千位','万位'];
  const places=Math.max(2,String(a).length,String(b).length,String(result).length);
  const steps=[];
  if(op==='+') {
    let carry=0;
    for(let i=0;i<places;i++) {
      const x=Math.floor(a/10**i)%10,y=Math.floor(b/10**i)%10,total=x+y+carry;
      steps.push(`${names[i]}：${x} + ${y}${carry?' + 1（进位）':''} = ${total}，写 ${total%10}${total>=10?'，向前进 1':''}。`);
      carry=Math.floor(total/10);
    }
  } else {
    const digits=String(a).padStart(places,'0').split('').reverse().map(Number);
    for(let i=0;i<places;i++) {
      const y=Math.floor(b/10**i)%10;
      if(digits[i]<y) {
        let lender=i+1;
        while(lender<places&&digits[lender]===0)lender++;
        if(lender===places)return null;
        digits[lender]--;
        for(let j=lender-1;j>i;j--)digits[j]=9;
        digits[i]+=10;
        steps.push(`${names[i]}不够减，从${names[lender]}借 1${lender>i+1?'，经过的 0 变成 9':''}。`);
      }
      steps.push(`${names[i]}：${digits[i]} − ${y} = ${digits[i]-y}。`);
    }
  }
  return {a,b,op,result,steps};
}
