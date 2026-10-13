// Fullscreen must be requested in the original click handler. These functions
// invoke the browser API synchronously, then resolve to a non-throwing status.
function platform() {
  const navigator = globalThis.navigator || {};
  const agent = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/i.test(agent) || (/Macintosh/i.test(agent) && navigator.maxTouchPoints > 1)) return 'ios';
  return /Android/i.test(agent) ? 'android' : 'desktop';
}

function standaloneQuery() {
  return globalThis.window?.matchMedia?.('(display-mode: standalone)') || null;
}

export function getImmersiveStatus() {
  const document = globalThis.document;
  const root = document?.documentElement;
  const fullscreen = Boolean(document?.fullscreenElement || document?.webkitFullscreenElement);
  const standalone = globalThis.navigator?.standalone === true || Boolean(standaloneQuery()?.matches);
  const supported = Boolean(
    (root?.requestFullscreen && document?.fullscreenEnabled !== false) ||
    (root?.webkitRequestFullscreen && document?.webkitFullscreenEnabled !== false)
  );
  return {fullscreen, standalone, supported, platform: platform(), immersive: fullscreen || standalone};
}

export function getInstallHint() {
  const status = getImmersiveStatus();
  if (status.standalone) return '已从主屏幕进入，和暖尾尾一起沉浸试玩。';
  if (status.platform === 'ios') return 'iPhone 上的 Safari 或 Chrome 若不支持网页直接全屏：点地址栏旁的「分享」→「添加到主屏幕」。如有「作为网页 App 打开」选项，请开启。以后从花园图标进入，可隐藏浏览器地址栏。';
  if (status.platform === 'android') return '想从桌面进入：在浏览器菜单找「添加到主屏幕」。是否提供该选项取决于浏览器；也可以点游戏内的全屏按钮。';
  return '点全屏按钮进入沉浸模式；手机和 iPad 也可以添加主屏幕入口。';
}

function settled(request) {
  return Promise.resolve(request).then(getImmersiveStatus, getImmersiveStatus);
}

export function requestImmersive() {
  const document = globalThis.document;
  const root = document?.documentElement;
  const status = getImmersiveStatus();
  if (!root || status.fullscreen) return Promise.resolve(status);
  try {
    // Do not move this call behind an await, timer, animation, or render promise.
    if (root.requestFullscreen && document.fullscreenEnabled !== false) return settled(root.requestFullscreen({navigationUI: 'hide'}));
    if (root.webkitRequestFullscreen && document.webkitFullscreenEnabled !== false) return settled(root.webkitRequestFullscreen());
  } catch {
    // Older WebKit can expose a prefixed API while the standard call throws.
    try {
      if (root.webkitRequestFullscreen && document.webkitFullscreenEnabled !== false) return settled(root.webkitRequestFullscreen());
    } catch { /* Immersive page layout remains playable without native fullscreen. */ }
  }
  return Promise.resolve(getImmersiveStatus());
}

export function toggleFullscreen() {
  const document = globalThis.document;
  if (!getImmersiveStatus().fullscreen) return requestImmersive();
  try {
    if (document.exitFullscreen) return settled(document.exitFullscreen());
    if (document.webkitExitFullscreen) return settled(document.webkitExitFullscreen());
  } catch {
    try {
      if (document.webkitExitFullscreen) return settled(document.webkitExitFullscreen());
    } catch { /* A rejected fullscreen operation must never interrupt the game. */ }
  }
  return Promise.resolve(getImmersiveStatus());
}

export function initImmersive() {
  const document = globalThis.document;
  const window = globalThis.window;
  const root = document?.documentElement;
  if (!root || !window) return () => {};
  const query = standaloneQuery();
  let lastStatus = '';
  const sync = () => {
    const status = getImmersiveStatus();
    root.classList.toggle('is-fullscreen', status.fullscreen);
    root.classList.toggle('is-standalone', status.standalone);
    root.classList.toggle('is-immersive', status.immersive);
    root.dataset.immersive = String(status.immersive);
    const viewport=window.visualViewport,height=viewport?.height||window.innerHeight,width=viewport?.width||window.innerWidth;
    if(Number.isFinite(height)&&height>0){root.style.setProperty('--app-height', `${Math.floor(height)}px`);root.dataset.viewportShort=String(height<=380);}
    if(Number.isFinite(width)&&width>0)root.style.setProperty('--app-width', `${Math.floor(width)}px`);
    root.style.setProperty('--app-top', `${Math.max(0,viewport?.offsetTop||0)}px`);
    root.style.setProperty('--app-left', `${Math.max(0,viewport?.offsetLeft||0)}px`);
    const key = JSON.stringify(status);
    if (lastStatus !== key) {
      lastStatus = key;
      document.dispatchEvent(new CustomEvent('immersivechange', {detail: status}));
    }
  };
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', sync);
  window.visualViewport?.addEventListener('resize', sync);
  window.visualViewport?.addEventListener('scroll', sync);
  if (query?.addEventListener) query.addEventListener('change', sync);
  else query?.addListener?.(sync);
  sync();
  return () => {
    document.removeEventListener('fullscreenchange', sync);
    document.removeEventListener('webkitfullscreenchange', sync);
    window.removeEventListener('resize', sync);
    window.removeEventListener('orientationchange', sync);
    window.visualViewport?.removeEventListener('resize', sync);
    window.visualViewport?.removeEventListener('scroll', sync);
    if (query?.removeEventListener) query.removeEventListener('change', sync);
    else query?.removeListener?.(sync);
  };
}
