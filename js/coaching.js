import {difficultySuggestion,dismissSuggestion} from './engine.js?v=20261014-6';

const difficulties=['easy','standard','challenge'];
const labels={easy:'轻松',standard:'标准',challenge:'挑战'};
const context=state=>({grade:state.grade,round:state.rounds,textbook:state.courseSettings?.textbook,phase:state.courseSettings?.phase});
function currentReceipt(state,receipt){
 return receipt&&difficulties.includes(receipt.from)&&difficulties.includes(receipt.to)
  &&Object.entries(context(state)).every(([key,value])=>receipt[key]===value)
  &&(state.difficulty||'standard')===(receipt.undone?receipt.from:receipt.to);
}

export function acceptDifficultySuggestion(state,target){
 if(!target||target!==difficultySuggestion(state))return null;
 const receipt={...context(state),from:state.difficulty||'standard',to:target,undone:false};
 state.difficulty=target;dismissSuggestion(state);return receipt;
}
export function undoDifficultySuggestion(state,receipt){
 if(!currentReceipt(state,receipt)||receipt.undone)return null;
 state.difficulty=receipt.from;return {...receipt,undone:true};
}
export function difficultyCoachingMarkup(state,receipt){
 const current=state.difficulty||'standard';
 if(currentReceipt(state,receipt)){
  const title=receipt.undone?`已恢复${labels[current]}`:`已改为${labels[current]} · 下一趟开始`;
  const note=receipt.saved===false?'这次已切换，但暂时无法保存；关闭后可能无法保留。':`之后本年级沿用${labels[current]}，可在学习设置改回。`;
  return `<section class="coaching coaching-receipt" aria-label="难度调整结果"><div class="coaching-message" role="status" aria-live="polite" tabindex="-1"><strong>${title}</strong><p>${note}</p></div>${receipt.undone?'':`<button class="secondary" data-action="coaching-undo">撤销，保持${labels[receipt.from]}</button>`}</section>`;
 }
 const target=difficultySuggestion(state);if(!target)return '';
 const increasing=difficulties.indexOf(target)>difficulties.indexOf(current);
 return `<section class="coaching coaching-suggestion" aria-label="下一趟难度建议"><div class="coaching-message"><strong>${increasing?`这两趟很顺利，下一趟试试${labels[target]}？`:`下一趟用${labels[target]}，慢慢练也很好。`}</strong><p>只调整本年级难度，教材和学习进度不变；之后会沿用。</p></div><div class="coaching-actions"><button class="secondary" data-action="coaching-accept" data-value="${target}">下一趟用${labels[target]}</button><button class="text-button" data-action="coaching-dismiss">保持${labels[current]}</button></div></section>`;
}
