/** Completed answers in this trip only. Engine attempts already includes carriedAttempts. */
export function roundSummary(session) {
  const results = Array.isArray(session?.results) ? session.results : [];
  const answers = results.map((result, index) => ({
    number: index + 1,
    firstTry: result.attempts === 1,
    retried: result.attempts > 1,
    assisted: result.assisted === true,
  }));
  return {
    total: answers.length,
    firstTry: answers.filter(answer => answer.firstTry).length,
    retried: answers.filter(answer => answer.retried).length,
    assisted: answers.filter(answer => answer.assisted).length,
    answers,
  };
}

export function roundSummaryMarkup(session) {
  const summary = roundSummary(session);
  if (!summary.total) return '';
  const markers = summary.answers.map(answer => {
    const label = answer.firstTry ? '第一次答对' : answer.retried ? '第一次没答对，后来完成了' : '已完成';
    const kind = answer.firstTry ? 'first' : answer.retried ? 'retry' : 'complete';
    return `<li class="round-summary-answer round-summary-${kind}" aria-label="第${answer.number}题：${label}${answer.assisted ? '；得到帮助或提示' : ''}"><span class="round-summary-symbol" aria-hidden="true">${answer.firstTry ? '★' : '✿'}</span><span class="round-summary-number">第${answer.number}题</span></li>`;
  }).join('');
  return `<section class="round-summary" aria-label="这一趟的答题统计">
    <h2>这一趟的小收获</h2>
    <p class="round-summary-total">完成了 <strong>${summary.total}</strong> 道题</p>
    <ol class="round-summary-answers">${markers}</ol>
    <div class="round-summary-counts">
      <p class="round-summary-count round-summary-first"><span aria-hidden="true">★</span><span>第一次答对</span><strong>${summary.firstTry}<small> 题</small></strong></p>
      <p class="round-summary-count round-summary-retry"><span aria-hidden="true">✿</span><span>第一次没答对<br><small>再试后完成</small></span><strong>${summary.retried}<small> 题</small></strong></p>
    </div>
    <p class="round-summary-help">其中 ${summary.assisted} 题得到帮助或提示。第一次答对的题也可能用过帮助。</p>
    <p class="round-summary-encourage">${summary.retried ? '认真再试，也是一份小收获。暖尾尾和你一起完成啦！' : '每一道题都是小收获，暖尾尾和你一起完成啦！'}</p>
  </section>`;
}
