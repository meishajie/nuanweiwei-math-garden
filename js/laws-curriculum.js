import {courseProfile,bankTopics,TOPICS} from './course-catalog.js?v=20261016-3';
import {number,operation,calculate,expressionText,expressionSteps,valuesEqual} from './course-math.js?v=20261016-3';

const n=number,op=operation,isNumber=e=>e?.type==='number';
const menus={
 easy:['add-associate','multiply-associate','factor-sum','distribute-sum'],
 standard:['add-associate','multiply-associate','factor-sum','distribute-sum','factor-difference','near-round-product'],
 challenge:['factor-sum','factor-difference','distribute-sum','distribute-difference','multiply-associate','add-associate','near-round-product']
};
function random(seed){let s=(Math.imul(seed+83,2654435761)>>>0)||1;return (min,max)=>{s^=s<<13;s^=s>>>17;s^=s<<5;return min+(s>>>0)%(max-min+1);};}
function product(a,b,orientation){return orientation?op('*',n(b),n(a)):op('*',n(a),n(b));}

// These bands vary recognition and the number of equivalent transformations,
// while the caller checks every original and rewritten operation against the
// already-open curriculum. They are game design bands, not ability scores.
export function lawSource(profile,serial){
 const p=courseProfile(profile.grade,profile);if(!Number.isInteger(serial)||serial<0||serial>799||!bankTopics(p).includes('laws'))throw new RangeError('Unknown law question');
 const easy=p.difficulty==='easy',hard=p.difficulty==='challenge',wide=bankTopics(p).some(id=>TOPICS[id].family==='multiply'&&TOPICS[id].digits===3&&TOPICS[id].factorDigits===2),menu=menus[p.difficulty],kind=menu[serial%menu.length],r=random(serial+{bnu:701,pep:1409,su:2111}[p.textbook]),pick=values=>values[r(0,values.length-1)],orientation=easy?0:Math.floor(serial/menu.length)%3;
 let expression,lawAnchor;
 if(kind==='add-associate'){
  const target=pick(easy?[20,30,40,50,60,80,100]:hard?[300,350,450,500,650,750,800,1000]:[50,100,150,200,250]),a=r(2,target-2),c=target-a,b=r(easy?2:hard?127:12,easy?25:hard?499:90);
  expression=op('+',op('+',n(a),n(b)),n(c));
 }else if(kind==='multiply-associate'){
  const [a,c]=pick(easy?[[2,5],[2,10],[4,5],[2,20],[5,10]]:[[2,25],[4,25],[5,20],[2,50],[8,5],[4,15]]),b=r(easy?2:hard?6:2,easy?5:wide?(hard?35:19):9);
  expression=op('*',op('*',n(a),n(b)),n(c));
 }else if(kind==='factor-sum'){
  const target=pick(easy?[10,20,30,40,50,60]:hard?(wide?[70,85,100,120,125,137,146,150,157,169,180,187,199,213,220,237,240,263,275,289,300,317]:[37,46,58,67,74,83,91,96,100]):[40,50,60,75,80,90,100,120].filter(v=>wide||v<=100));
  const a=!wide&&target>=100?r(3,9):r(easy?2:hard?12:3,easy?9:hard?(wide?29:39):19),b=r(2,target-2),c=target-b;
  expression=op('+',product(a,b,orientation===1),product(a,c,orientation!==0));
 }else if(kind==='factor-difference'){
  const target=pick(hard?(wide?[57,83,125,147,175,213,257]:[17,28,35,46,59,67,74,83]):[20,30,40,45,50]),a=r(hard?12:3,hard?(wide?29:49):15),c=r(2,Math.min((wide&&hard?999:99)-target,Math.floor(9999/a)-target,hard?120:60)),b=target+c;
  expression=op('-',product(a,b,orientation===1),product(a,c,orientation!==0));
 }else if(kind==='distribute-sum'||kind==='distribute-difference'){
  const difference=kind==='distribute-difference',a=r(easy?2:hard?12:3,easy?9:hard?(wide?29:39):19),b=pick(easy?[10,20,30]:hard?(wide?(difference?[100,150,200,250,300]:[80,100,120,150,200]):difference?[30,40,50,60,80,90]:[10,20,30,40,50,60,70]):[10,20,30,40,50,60,70]),c=r(2,9),parts=op(difference?'-':'+',n(b),n(c));
  expression=orientation===1?op('*',parts,n(a)):op('*',n(a),parts);
 }else{
  const a=r(hard?12:3,hard?(wide?29:49):9),base=pick(hard?(wide?[100,150,200,250,300]:[20,30,40,50,60,70,80,90]):[20,30,40,50]),delta=r(1,hard?(wide?9:4):1)*(r(0,1)?1:-1);
  lawAnchor=base;expression=op('*',n(a),n(base+delta));
 }
 return {expression,lawKind:kind,...(lawAnchor?{lawAnchor}:{})};
}

function commonFactor(e){
 if(!['+','-'].includes(e.op)||e.left?.op!=='*'||e.right?.op!=='*')return null;
 for(const [a,b] of [[e.left.left,e.left.right],[e.left.right,e.left.left]])for(const [c,d] of [[e.right.left,e.right.right],[e.right.right,e.right.left]])if(isNumber(a)&&isNumber(b)&&isNumber(c)&&isNumber(d)&&valuesEqual(a.value,c.value))return {a,b,c:d};
 return null;
}
export function lawHintPlan(q){
 if(q?.topicId!=='laws'||!String(q.id).startsWith('c5:')||q.blank!=='result')return null;
 const e=q.expression,kind=q.lawKind;let name,direction,transformations=[],recognition=0;
 if(kind==='add-associate'&&e.op==='+'&&e.left?.op==='+'&&isNumber(e.left.left)&&isNumber(e.left.right)&&isNumber(e.right)){
  name='加法交换律和结合律';direction='先找能方便合在一起的两个加数，再加另一个数。';transformations=[op('+',op('+',e.left.left,e.right),e.left.right)];recognition=.5;
 }else if(kind==='multiply-associate'&&e.op==='*'&&e.left?.op==='*'&&isNumber(e.left.left)&&isNumber(e.left.right)&&isNumber(e.right)){
  name='乘法交换律和结合律';direction='先找相乘比较方便的两个数，换位置、换括号，积不变。';transformations=[op('*',op('*',e.left.left,e.right),e.left.right)];recognition=.8;
 }else if(['factor-sum','factor-difference'].includes(kind)){
  const parts=commonFactor(e);if(!parts)return null;
  name='乘法分配律：合起来';direction=e.op==='+'?'找两项共有的因数，把另外两部分相加。':'找两项共有的因数，把另外两部分相减；减号要保留。';transformations=[op('*',parts.a,op(e.op,parts.b,parts.c))];recognition=e.op==='-'?1.4:1;
 }else if(['distribute-sum','distribute-difference'].includes(kind)&&e.op==='*'){
  const [a,b]=isNumber(e.left)?[e.left,e.right]:[e.right,e.left];if(!isNumber(a)||!['+','-'].includes(b.op)||!isNumber(b.left)||!isNumber(b.right))return null;
  name='乘法分配律：分开算';direction=b.op==='+'?'括号里的两部分分别乘同一个数，再相加。':'括号里的两部分分别乘同一个数，再相减；减号要保留。';transformations=[op(b.op,op('*',a,b.left),op('*',a,b.right))];recognition=b.op==='-'?1.3:.9;
 }else if(kind==='near-round-product'&&e.op==='*'&&isNumber(e.left)&&isNumber(e.right)&&Number.isInteger(q.lawAnchor)&&q.lawAnchor>0){
  const value=e.right.value.coefficient,delta=value-q.lawAnchor;if(!delta||e.right.value.scale)return null;
  const sign=delta>0?'+':'-',base=n(q.lawAnchor),change=n(Math.abs(delta));name='先拆数，再用乘法分配律';direction=delta>0?'把接近整十的因数拆成整十数加几，分别乘，再相加。':'把接近整十的因数拆成整十数减几，分别乘，再相减。';transformations=[op('*',e.left,op(sign,base,change)),op(sign,op('*',e.left,base),op('*',e.left,change))];recognition=1.8;
 }else return null;
 const result=calculate(e);if(transformations.some(t=>!valuesEqual(calculate(t),result)))return null;
 return {name,direction,transformations,strategy:transformations.at(-1),recognition};
}
export function lawExplanation(q){
 const plan=lawHintPlan(q);if(!plan)return null;let previous=q.expression;
 const steps=plan.transformations.map(expression=>{const line=`${expressionText(previous)} = ${expressionText(expression)}`;previous=expression;return line;});
 return {headline:plan.name,steps:[...steps,...expressionSteps(plan.strategy)],start:0,deltas:[],goal:q.answer,questionText:q.text};
}
