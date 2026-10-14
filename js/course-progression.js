import {COURSE_MAP,TOPICS,courseProfile,availableTopics,priorTopics,bankTopics} from './course-catalog.js?v=20261014-4';
import {calculate} from './course-math.js?v=20261014-4';

// Progress belongs to the chosen curriculum. A later station never unlocks a new unit.
export function focusTopics(profile){
 const p=courseProfile(profile.grade,profile),phases=COURSE_MAP[p.textbook][p.grade];
 for(let i=p.phase-1;i>=0;i--)if(phases[i].length)return [...phases[i]];
 return availableTopics(p);
}
export function foundationTopics(profile){
 const focus=new Set(focusTopics(profile));
 return [...availableTopics(profile).filter(id=>!focus.has(id)).reverse(),...priorTopics(profile).reverse()];
}
export function levelPlan(profile,levelId){
 const p=courseProfile(profile.grade,profile);if(!Number.isInteger(levelId)||levelId<1||levelId>10)throw new RangeError('Invalid station');
 const knownMax=Math.max(0,...bankTopics(p).filter(id=>TOPICS[id].family==='addsub').map(id=>TOPICS[id].max)),numberFloor=levelId>=7&&p.grade===1&&knownMax>=20?11:levelId>=5&&knownMax>5?6:0;
 const progress=(levelId-1)/9,easy=p.difficulty==='easy',hard=p.difficulty==='challenge';
 const floor=(easy?.01:hard?.1:.04)+progress*(easy?.42:hard?.6:.55);
 const missing=easy?0:hard?(levelId>=9?3:levelId>=6?2:levelId>=3?1:0):(levelId>=9?2:levelId>=6?1:0);
 const regroupCount=easy?(levelId>=8?1:0):hard?(levelId>=9?4:levelId>=7?3:levelId>=5?2:levelId>=3?1:0):(levelId>=9?3:levelId>=7?2:levelId>=5?1:0);
 const forms=['plain','plain','plain','plain',missing?'right':'plain',missing>=3?'left':'plain'];
 if(missing>=2)forms[2]='left';
 if(levelId>=(easy?6:4))forms[1]='story';
 const focus=focusTopics(p),end=Math.min(focus.length,Math.max(1,Math.ceil(focus.length*(.5+.5*progress)))),core=focus.slice(0,end);
 const labels=['先算一算','熟悉方法','换个数试试','换种问法','把数拆开想','灵活用方法','多想一步','花园小任务','检查再作答','花园综合练习'];
 const label=easy&&levelId===6?'熟练算一算':labels[levelId-1];
 return {levelId,label,focus:core,missing,regroupCount,slots:[
  {role:'warmup',form:'plain',floor:Math.max(0,floor-.12),ceiling:Math.min(1,floor+.22)},
  {role:'practice',form:forms[1],regroup:regroupCount>=4,floor,ceiling:Math.min(1,floor+.23)},
  {role:'practice',form:forms[2],regroup:regroupCount>=3,floor:Math.min(1,floor+.02),ceiling:Math.min(1,floor+.27)},
  {role:'review',form:'plain',floor:Math.max(0,floor-.1),ceiling:Math.min(1,floor+.25)},
  {role:'transfer',form:forms[4],regroup:regroupCount>=2,floor:Math.min(1,floor+.08),ceiling:Math.min(1,floor+.32)},
  {role:'checkpoint',form:forms[5],regroup:regroupCount>=1,floor:Math.min(1,floor+.14),ceiling:Math.min(1,floor+.4)}
 ].map(slot=>({...slot,numberFloor}))};
}
function transfers(a,b,subtract=false){let carry=0,count=0;for(let i=0;i<Math.max(String(a).length,String(b).length);i++){const x=Math.floor(a/10**i)%10,y=Math.floor(b/10**i)%10;carry=Number(subtract?x-y-carry<0:x+y+carry>=10);count+=carry;}return count;}
function multiplicationCarries(a,b){let count=0;for(const multiplier of String(b)){let carry=0;for(const digit of String(a).split('').reverse()){const value=Number(digit)*Number(multiplier)+carry;carry=Math.floor(value/10);if(carry)count++;}}return count;}
// Engineering demand measure: number size, regrouping, place value and operation count.
// It controls the random pool; it is not a score of a child's ability.
export function questionDemand(q){
 const walk=e=>{if(e.type==='number')return 0;const a=calculate(e.left),b=calculate(e.right),scale=Math.max(a.scale,b.scale),x=a.coefficient*10**(scale-a.scale),y=b.coefficient*10**(scale-b.scale),m=Math.max(x,y),n=Math.min(x,y),size=Math.log10(m+1);
 let work;
 if(['+','-'].includes(e.op))work=size+.25*Math.log10(n+1)+1.7*transfers(x,y,e.op==='-')+.35*scale-(e.op==='-'&&x===y?1:0);
 if(e.op==='*')work=.75*Math.log10(a.coefficient+1)+Math.log10(b.coefficient+1)+.55*multiplicationCarries(a.coefficient,b.coefficient)+.5*(String(b.coefficient).length-1)+.35*(a.scale+b.scale)-(Math.min(a.coefficient,b.coefficient)===1?2:0)-.9*((String(a.coefficient).match(/0+$/)?.[0].length||0)+(String(b.coefficient).match(/0+$/)?.[0].length||0));
 if(e.op==='/'){let remainder=0,regroups=0,zeros=0;for(const digit of String(x)){const current=remainder*10+Number(digit);if(remainder)regroups++;if(current<y)zeros++;remainder=current%y;}work=size+.45*Math.log10(y+1)+.45*regroups+.2*zeros+(x%y?.65:0)-(y===1?2:0);}
 return work+walk(e.left)+walk(e.right)+(e.left.type==='operation'||e.right.type==='operation'?1.2:0);
 };
 return Math.round(walk(q.expression)*1000)/1000;
}
export function questionRanks(bank){
 const ranks=new Map(),groups=new Map(),demands=new Map();for(const q of bank){const demand=questionDemand(q),group=groups.get(q.topicId)||{values:new Set(),rows:[]};group.values.add(demand);group.rows.push(q);groups.set(q.topicId,group);demands.set(q.id,demand);}
 for(const group of groups.values()){const sorted=[...group.values].sort((a,b)=>a-b),lookup=new Map(sorted.map((v,i)=>[v,sorted.length===1?1:i/(sorted.length-1)]));for(const q of group.rows)ranks.set(q.id,lookup.get(demands.get(q.id)));}
 return ranks;
}

export function passesSlot(q,slot){
 const e=q.expression,scalar=e.left.type==='number'&&e.right.type==='number';
 if(!scalar)return true;
 const t=TOPICS[q.topicId],a=e.left.value,b=e.right.value;
 if(t.family==='addsub'&&!a.scale&&!b.scale&&slot.numberFloor){const result=e.op==='+'?a.coefficient+b.coefficient:a.coefficient-b.coefficient;if(Math.max(a.coefficient,b.coefficient,result)<slot.numberFloor)return false;if(!['warmup','review'].includes(slot.role)&&e.op==='-'&&result<=2)return false;}
 if(q.profile.grade===1&&t.family==='addsub'&&t.max===20&&!['warmup','review'].includes(slot.role)){
  if(e.op==='-'&&(q.profile.difficulty!=='easy'||q.levelId>=5)&&(a.coefficient>19||b.coefficient>9))return false;
  if(slot.regroup&&q.profile.difficulty==='challenge'&&q.levelId>=7){if(Math.min(a.coefficient,b.coefficient)<3)return false;if(e.op==='+'&&(a.coefficient>9||b.coefficient>9))return false;}
 }

 if(!['warmup','review'].includes(slot.role)&&t.family==='addsub'&&t.max>10&&q.profile.difficulty!=='easy'){
  const bound=t.max<=20?11:t.max<=100?20:t.max<=999?100:1000,result=e.op==='+'?a.coefficient+b.coefficient:a.coefficient-b.coefficient;
  if(Math.max(a.coefficient,b.coefficient,result)<bound)return false;
 }
 if(e.op==='-'&&a.coefficient===b.coefficient&&a.scale===b.scale)return false;
 if(!slot.regroup)return true;
 if(['addsub','decimal'].includes(t.family)){
  // A 10-within unit or an easy 20-within pool has no new regrouping requirement.
  if(t.family==='addsub'&&(t.max<=10||(q.profile.difficulty==='easy'&&t.max<=20)))return true;
  const scale=Math.max(a.scale,b.scale),x=a.coefficient*10**(scale-a.scale),y=b.coefficient*10**(scale-b.scale);return transfers(x,y,e.op==='-')>0;
 }
 if(t.family==='multiply'&&!t.noCarry&&t.digits>=2)return multiplicationCarries(a.coefficient,b.coefficient)>0;
 if(t.family==='divide'&&!t.noRegroup&&t.digits>=2){let rest=0,count=0;for(const digit of String(a.coefficient)){if(rest)count++;rest=(rest*10+Number(digit))%b.coefficient;}return count>0;}
 return true;
}
