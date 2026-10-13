// Revision evidence is maintained in docs/CURRICULUM-SOURCES.json.
export const TEXTBOOKS=Object.freeze([{id:'bnu',label:'北师版'},{id:'pep',label:'人教版'},{id:'su',label:'苏教版'}]);
export const PHASES=Object.freeze(['上册 · 学到一半','上册 · 学完了','下册 · 学到一半','下册 · 学完了']);
export const TOPICS=Object.freeze({
 add20Plus:{label:'20以内加法',family:'addsub',max:20,onlyOp:'+'},add20Minus:{label:'20以内减法',family:'addsub',max:20,onlyOp:'-'},div22:{label:'两位数除以两位数',family:'divide',digits:2,divisorDigits:2},add9:{label:'9以内加减',family:'addsub',max:9},carry20:{label:'20以内进位加法',family:'addsub',max:20,onlyOp:'+',carryOnly:true},borrow20:{label:'20以内退位减法',family:'addsub',max:20,onlyOp:'-',borrowOnly:true},oral100:{label:'两位数加减整十、一位数',family:'addsub',max:99,oral:true},tables5:{label:'乘法口诀（一）',family:'multiply',digits:1,maxKnownFactor:5},tables6:{label:'1—6表内乘法',family:'multiply',digits:1,maxKnownFactor:6},division6:{label:'1—6表内除法',family:'divide',digits:1,maxKnownFactor:6},oralMul21:{label:'两位数乘一位数口算',family:'multiply',digits:2,noCarry:true,maxResult:99},oralDiv21:{label:'两位数除以一位数口算',family:'divide',digits:2,noRegroup:true},mixedAddSub:{label:'加减混合运算',family:'mixed',digits:1,addSubOnly:true},add5:{label:'5以内加减',family:'addsub',max:5},add10:{label:'10以内加减',family:'addsub',max:10},add20:{label:'20以内加减',family:'addsub',max:20},add100:{label:'100以内加减',family:'addsub',max:100},add1000:{label:'三位数加减',family:'addsub',max:999},add10000:{label:'万以内加减',family:'addsub',max:9999},
 tables:{label:'表内乘法',family:'multiply',digits:1},division:{label:'表内除法',family:'divide',digits:1},remainder:{label:'有余数除法',family:'remainder',digits:1},mixed2:{label:'两步混合运算',family:'mixed',digits:1},mul21:{label:'两位数乘一位数',family:'multiply',digits:2},mul31:{label:'三位数乘一位数',family:'multiply',digits:3},mul22:{label:'两位数乘两位数',family:'multiply',digits:2,factorDigits:2},div21:{label:'两位数除以一位数',family:'divide',digits:2},div31:{label:'三位数除以一位数',family:'divide',digits:3},mul32:{label:'三位数乘两位数',family:'multiply',digits:3,factorDigits:2},div32:{label:'三位数除以两位数',family:'divide',digits:3,divisorDigits:2},mixed4:{label:'四则与括号',family:'mixed',digits:2},laws:{label:'运算律',family:'laws'},decimal1:{label:'一位小数加减',family:'decimal',scale:1},decimal2:{label:'小数加减',family:'decimal',scale:2},decimalMul:{label:'小数乘法',family:'decimalMultiply',scale:2}
});
// Cumulative four-phase arrays. Mapped from the 24 verified official directories on 2026-10-13.
export const COURSE_MAP={
 "bnu": {
  "1": [
   [
    "add5"
   ],
   [
    "add10"
   ],
   [
    "add20Plus",
    "add20Minus"
   ],
   [
    "oral100"
   ]
  ],
  "2": [
   [
    "add100",
    "tables5"
   ],
   [
    "tables",
    "division"
   ],
   [
    "mixedAddSub",
    "remainder"
   ],
   [
    "add1000"
   ]
  ],
  "3": [
   [
    "mixed2",
    "add10000"
   ],
   [],
   [
    "mul21",
    "mul31",
    "div21",
    "div31"
   ],
   []
  ],
  "4": [
   [
    "mul22"
   ],
   [
    "laws",
    "mixed4"
   ],
   [
    "decimal2",
    "decimalMul"
   ],
   []
  ]
 },
 "pep": {
  "1": [
   [
    "add5",
    "add10"
   ],
   [
    "carry20"
   ],
   [
    "borrow20"
   ],
   [
    "oral100",
    "add100"
   ]
  ],
  "2": [
   [
    "tables6",
    "division6"
   ],
   [
    "tables",
    "division"
   ],
   [
    "remainder"
   ],
   [
    "add10000"
   ]
  ],
  "3": [
   [
    "mixed2"
   ],
   [
    "mul21",
    "mul31"
   ],
   [
    "div21",
    "div31"
   ],
   []
  ],
  "4": [
   [
    "mul22",
    "mul32"
   ],
   [],
   [
    "mixed4",
    "laws"
   ],
   [
    "decimal2"
   ]
  ]
 },
 "su": {
  "1": [
   [
    "add5",
    "add9"
   ],
   [
    "add10"
   ],
   [
    "carry20",
    "borrow20"
   ],
   [
    "oral100"
   ]
  ],
  "2": [
   [
    "tables",
    "division"
   ],
   [
    "add100",
    "remainder"
   ],
   [
    "oralMul21",
    "oralDiv21"
   ],
   [
    "add1000"
   ]
  ],
  "3": [
   [
    "mixed2",
    "mul21",
    "mul31"
   ],
   [
    "div21",
    "div31"
   ],
   [
    "mul22"
   ],
   []
  ],
  "4": [
   [
    "div22",
    "div32"
   ],
   [
    "mixed4",
    "add10000"
   ],
   [
    "mul32"
   ],
   [
    "laws",
    "decimal2"
   ]
  ]
 }
};
export function courseProfile(grade,settings={}) {
  if(![1,2,3,4].includes(grade))throw new RangeError('Unknown grade');
  const textbook=settings.textbook??'bnu',phase=Number(settings.phase??1),difficulty=settings.difficulty??'standard';
  if(!TEXTBOOKS.some(t=>t.id===textbook)||![1,2,3,4].includes(phase)||!['easy','standard','challenge'].includes(difficulty))throw new RangeError('Invalid course settings');
  return {textbook,grade,phase,difficulty};
}
export function availableTopics(profile) {
  const p=courseProfile(profile.grade,profile),topics=COURSE_MAP[p.textbook][p.grade].slice(0,p.phase).flat();
  return [...new Set(topics)];
}
export const phaseSummary=p=>availableTopics(p).map(id=>TOPICS[id].label).slice(-3).join('、');

export function priorTopics(p){return [...new Set(Array.from({length:p.grade-1},(_,i)=>COURSE_MAP[p.textbook][i+1].flat()).flat())];}
export function bankTopics(p){return [...new Set([...availableTopics(p),...priorTopics(p)])];}
