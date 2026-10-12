// Copy is isolated from navigation and mathematics so another locale can be added.
export const locale = 'zh-CN';
export const messages = {
  'zh-CN': {
    title: '暖尾尾的数字魔法花园', shortTitle: '数字魔法花园',
    nav: { home: '花园地图', vault: '魔法宝藏', grownups: '陪伴手册' },
    heroEyebrow: '暖尾尾的奇妙邀请', heroLine1: '把小小数字，', heroLine2: '变成大大魔法。',
    heroBody: '数一数，想一想。和暖尾尾一起，\n让沉睡的花园慢慢亮起来。',
    start: '出发，点亮花园', resume: '接着上次玩', choose: '自己选一站',
    calm: '不用赶时间 · 随时可以休息', homeLead: '跟着好奇心出发',
    homeSubtitle: '一趟 6 个小任务。你可以按顺序走，也可以自己选。',
    optional: '云端探险 · 自选挑战', optionalBody: '想试试更大的数字时再来。主线 8 站也能看见完整大魔法。',
    status: { new: '去探索', practicing: '一起练过', ready: '能独立试试', steady: '隔一会也会' },
    pause: '先休息', back: '回花园', begin: '开始这趟旅程',
    help: '摆一摆', numberline: '走数轴', next: '下一颗小光点', finish: '收好魔法卡',
    correct: '想出来啦！', retry: '还差一点，我们一起看看。',
    independent: '这一次，你自己找到了答案。', supported: '借助小工具，也能把道理想明白。',
    readyPrompt: '点一个答案。可以慢慢想，也可以摆一摆。',
    hintCaption: '小工具是帮手，用过它也会得到魔法卡。',
    review: '回头看一看', target: '探索新办法',
    saved: '进度只保存在这台设备的这个浏览器里',
    saveError: '这次仍然可以玩，但浏览器没能保存进度。关页后可能需要重新开始。',
    repaired: '上次的进度格式无法识别，已安全回到新的花园。',
    soundOff: '声音关', soundOn: '声音开', settings: '小设置',
    vaultTitle: '每张卡，都藏着一种魔法。', vaultBody: '收集一张，就能召唤一次。喜欢的魔法，可以看很多遍。',
    vaultEmpty: '第一点星光，正等你带回来。', vaultEmptyBody: '完成任意一站，就有一张属于你的魔法卡。',
    finale: '花园醒来了', finaleBody: '收齐主线 8 张卡，让花园一起发光。',
    cast: '召唤魔法', replay: '再看一遍', stop: '暂停', continueMagic: '继续',
    magicEnd: '这份魔法，会一直在你的宝藏里。',
    reducedScene: '安静观赏 · 已为你展开完整画面',
    restTitle: '歇一歇，花园会等你。', restBody: '伸伸手，看看远处。准备好了，再来找暖尾尾。',
  }
};
export const t = messages[locale];
