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


/** Old saves retain only a recent window; never infer first-try from independent. */
export function answerTotals(state) {
  const total = state?.completedQuestions || 0;
  const recent = Object.values(state?.stages || {}).flatMap(stage => stage.recent || []);
  const firstTry = recent.filter(r => r.attempts === 1).length;
  const retried = recent.filter(r => r.attempts > 1).length;
  const saved = state?.answerStats;
  if (saved && [saved.firstTry,saved.retried,saved.unknown].every(n=>Number.isSafeInteger(n)&&n>=0)
      && saved.firstTry+saved.retried+saved.unknown===total && saved.firstTry>=firstTry && saved.retried>=retried) {
    return {total,firstTry:saved.firstTry,retried:saved.retried,unknown:saved.unknown};
  }
  return {total,firstTry,retried,unknown:Math.max(0,total-firstTry-retried)};
}
function counts(summary) {
  return `<div class="round-summary-counts">
    <div class="round-summary-count round-summary-first" aria-label="一次答对 ${summary.firstTry} 题"><span class="summary-icon" aria-hidden="true">★</span><strong>${summary.firstTry}</strong><span class="summary-label">一次答对</span></div>
    <div class="round-summary-count round-summary-retry" aria-label="再试答对 ${summary.retried} 题"><span class="summary-icon" aria-hidden="true">↻</span><strong>${summary.retried}</strong><span class="summary-label">再试答对</span></div>
  </div>`;
}
export function roundSummaryMarkup(session) {
  const summary = roundSummary(session);
  if (!summary.total) return '';
  const markers = summary.answers.map(answer => `<li class="round-summary-answer round-summary-${answer.firstTry?'first':'retry'}" aria-label="第${answer.number}题：${answer.firstTry?'第一次答对':'第一次没答对，后来完成了'}"><span aria-hidden="true">${answer.firstTry?'★':'↻'}</span></li>`).join('');
  return `<section class="round-summary" aria-label="这一趟的答题统计"><header><h2>完成啦！</h2><span class="summary-total" aria-label="共完成 ${summary.total} 道题">${summary.total}<small>题</small></span></header><ol class="round-summary-answers">${markers}</ol>${counts(summary)}</section>`;
}
export function gardenSummaryMarkup(state) {
  if ((state?.cards?.length || 0)<10) return '';
  const summary=answerTotals(state);
  return `<section class="round-summary garden-summary" aria-label="当前年级十关累计答题统计"><header><h2>10 关啦！</h2><span class="summary-total" aria-label="累计完成 ${summary.total} 道题">${summary.total}<small>题</small></span></header><div class="garden-summary-badges" role="img" aria-label="十个地点都已完成">${Array.from({length:10},()=>'<span aria-hidden="true">✦</span>').join('')}</div>${counts(summary)}${summary.unknown?`<details class="summary-legacy"><summary>旧记录 ${summary.unknown} 题</summary><p>这些早期题目没有保存首次作答分类。上面的两组数量仅统计分类已知的题目，总题数包括全部记录。</p></details>`:''}<details class="summary-scope"><summary>给大人看</summary><p>当前年级累计，包含重玩及复习题。先用了帮助，但第一次提交就正确，也算一次答对。</p></details></section>`;
}
