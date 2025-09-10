chrome.runtime.onInstalled.addListener(() => {
  console.log("Cookie Exporter 插件已安装");
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ADD_COOKIE") {
    const { cookie, url } = message.payload;
    
    // 构造cookie设置参数
    const cookieParams = {
      url: url,
      name: cookie.name,
      value: cookie.value,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      secure: cookie.secure
    };
    
    // 如果有过期时间，添加到参数中
    if (cookie.expirationDate) {
      cookieParams.expirationDate = cookie.expirationDate;
    }
    
    // 设置cookie
    chrome.cookies.set(cookieParams, (result) => {
      if (chrome.runtime.lastError) {
        console.error("设置Cookie失败:", chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log("Cookie设置成功:", result);
        sendResponse({ success: true, cookie: result });
      }
    });
    
    // 返回true表示异步响应
    return true;
  }
});
