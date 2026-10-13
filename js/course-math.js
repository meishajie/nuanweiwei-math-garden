// Exact base-ten values: arithmetic never uses binary fractions or eval.
export function decimal(coefficient, scale=0) {
  if(!Number.isSafeInteger(coefficient)||!Number.isInteger(scale)||scale<0||scale>6)throw new RangeError('Invalid decimal');
  while(scale&&coefficient%10===0){coefficient/=10;scale--;}
  return {coefficient,scale};
}
export const number = value => ({type:'number',value:typeof value==='number'?decimal(value):decimal(value.coefficient,value.scale)});
export const operation = (op,left,right) => ({type:'operation',op,left,right});
export function calculate(expr) {
  if(expr.type==='number')return decimal(expr.value.coefficient,expr.value.scale);
  const a=calculate(expr.left),b=calculate(expr.right),s=Math.max(a.scale,b.scale),x=a.coefficient*10**(s-a.scale),y=b.coefficient*10**(s-b.scale);
  if(expr.op==='+')return decimal(x+y,s);
  if(expr.op==='-')return decimal(x-y,s);
  if(expr.op==='*')return decimal(a.coefficient*b.coefficient,a.scale+b.scale);
  if(expr.op==='/'){
    if(y===0||x%y!==0)throw new RangeError('Only exact integer division is supported');
    return decimal(x/y);
  }
  throw new RangeError('Unknown operation');
}
export function formatValue(value) {
  if(value.kind==='remainder')return `${value.quotient} 余 ${value.remainder}`;
  const v=decimal(value.coefficient,value.scale),negative=v.coefficient<0,digits=String(Math.abs(v.coefficient)).padStart(v.scale+1,'0');
  return (negative?'-':'')+(v.scale?`${digits.slice(0,-v.scale)}.${digits.slice(-v.scale)}`:digits);
}
export const symbol = op => ({'+':'+','-':'−','*':'×','/':'÷'})[op];
export function expressionText(expr) {
  if(expr.type==='number')return formatValue(expr.value);
  const child=e=>e.type==='number'?expressionText(e):`(${expressionText(e)})`;
  return `${child(expr.left)} ${symbol(expr.op)} ${child(expr.right)}`;
}
export function expressionSteps(expr) {
  if(expr.type==='number')return [];
  return [...expressionSteps(expr.left),...expressionSteps(expr.right),`${formatValue(calculate(expr.left))} ${symbol(expr.op)} ${formatValue(calculate(expr.right))} = ${formatValue(calculate(expr))}`];
}
export function expressionSignature(expr) {
  if(expr.type==='number'){const v=decimal(expr.value.coefficient,expr.value.scale);return `${v.coefficient}@${v.scale}`;}
  const children=[expressionSignature(expr.left),expressionSignature(expr.right)];
  if(['+','*'].includes(expr.op))children.sort();
  return `${expr.op}[${children.join('|')}]`;
}
export const valuesEqual=(a,b)=>a?.kind==='remainder'||b?.kind==='remainder'?a?.kind===b?.kind&&a.quotient===b.quotient&&a.remainder===b.remainder:!!a&&!!b&&decimal(a.coefficient,a.scale).coefficient===decimal(b.coefficient,b.scale).coefficient&&decimal(a.coefficient,a.scale).scale===decimal(b.coefficient,b.scale).scale;
