/* CookieMaster Pro — 后台服务（service worker）
   主要职责：把工具栏图标的点击行为接到 Chrome 侧边栏上。 */

// Chrome 114+ 提供 sidePanel API。
// 设置成功后，点击扩展图标会直接打开右侧边栏，而不是弹出小窗口。
// 若浏览器版本过低，这里会被跳过，此时点击图标仍回退到 action.default_popup。
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(error => {
      console.warn('[CookieMaster Pro] 无法启用「点击图标打开侧边栏」：', error);
    });
}

chrome.runtime.onInstalled.addListener(details => {
  const reason = details && details.reason ? details.reason : 'unknown';
  console.log(`[CookieMaster Pro] 已就绪（${reason}）`);
});
