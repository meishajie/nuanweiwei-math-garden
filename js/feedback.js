import {icon} from './art.js?v=20261016-1';

// Created by the user in Tencent's console on 2026-10-14.
export const FEEDBACK_PROJECT_ID = 802218;
export const FEEDBACK_URL = FEEDBACK_PROJECT_ID ? `https://support.qq.com/product/${FEEDBACK_PROJECT_ID}` : '';

export function feedbackButtonMarkup({compact=false}={}) {
  return `<button class="${compact?'feedback-shortcut':'secondary feedback-entry'}" data-action="feedback" aria-label="反馈与建议">${icon('chat')}${compact?'反馈':'反馈与建议'}</button>`;
}

export function feedbackDialogMarkup({embedded=true}={}) {
  const launch=`<a class="feedback-external ${embedded?'':'feedback-launch'}" href="${FEEDBACK_URL}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${embedded?'单独打开反馈页':'打开反馈页面'} ${icon('arrow')}</a>`;
  const service=FEEDBACK_URL
    ? `${embedded?'':`<div class="feedback-welcome">${icon('chat')}<h3>听听你的想法</h3><p>游戏建议、题目疑问、遇到的问题，<br>都可以告诉我们。</p></div>`}<div class="feedback-intro"><p>请家长帮忙留言，不要填写孩子的姓名、学校或电话。</p>${launch}</div>${embedded?`<iframe class="feedback-frame" src="${FEEDBACK_URL}" title="暖尾尾数学花园 · 腾讯兔小巢反馈" referrerpolicy="no-referrer" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox" allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'"></iframe>`:''}`
    : '<p>反馈小屋正在准备，请稍后再来。</p>';
  return `<div class="modal-backdrop"><section class="modal feedback-dialog ${embedded?'':'feedback-compact'}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header class="modal-header"><h2 id="dialog-title">反馈与建议</h2><button class="modal-close" data-action="close-dialog" aria-label="关闭窗口">${icon('close')}</button></header><div class="modal-content feedback-content"><p class="feedback-service-note">由腾讯兔小巢提供 · 反馈页面会访问腾讯服务</p>${service}</div><footer class="modal-actions"><button class="primary" data-action="close-dialog">回到游戏 ${icon('back')}</button></footer></section></div>`;
}
