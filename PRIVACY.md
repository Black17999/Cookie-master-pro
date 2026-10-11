# 隐私政策 / Privacy Policy

**CookieMaster Pro** · 最后更新：2026-10-11

---

## 中文

### 摘要

CookieMaster Pro 是一款**纯本地运行**的浏览器扩展。它不会收集、上传或分享你的任何数据。

### 我们处理哪些数据

为了提供 Cookie 管理功能，扩展会在你的浏览器内读取：

- **网站的 Cookie**（名称、值、域名、路径、过期时间、HttpOnly / Secure / SameSite 等属性）
- **当前标签页的网址**（用于判断"当前网站"是哪一个域名）
- **你主动填写的设置项**（外观模式偏好、远程 API 地址）

### 这些数据存放在哪里

- Cookie 数据与标签页网址：**仅在你打开扩展面板时于内存中处理**，关闭面板即释放，不写入任何存储。
- 设置项（外观偏好、远程 API 地址）：通过 Chrome 官方的 `chrome.storage.sync` 保存在**你自己的浏览器账号**中。开发者无法访问。

### 数据会被发送到哪里

**不会发送到任何开发者控制的服务器。** 唯一的例外是你**主动使用**的功能：

- **「上传到 API」**：只有当你自己填写了 API 地址并点击该按钮时，当前列表的 Cookie 才会以 JSON 形式 POST 到**你自己指定的地址**。开发者无法得知该地址，也接触不到这份数据。
- **「在 GitHub 上查看源码」**：仅打开一个公开网页链接，不携带任何数据。

### 权限用途说明

| 权限 | 用途 |
| --- | --- |
| `cookies` | 读取、创建、修改、删除 Cookie —— 扩展的核心功能 |
| `tabs` | 读取当前标签页地址，用于确定"当前网站" |
| `clipboardWrite` | 将 Cookie 复制到剪贴板 |
| `storage` | 保存外观偏好与远程 API 地址 |
| `sidePanel` | 在浏览器右侧显示侧边栏面板 |
| `<all_urls>` | 访问任意网站的 Cookie。**这是"跨站点搜索与批量管理"能力所必需的** —— 浏览器不提供更细粒度的替代权限 |

### 关于 `<all_urls>` 的必要性说明

Chrome 的 Cookie API 要求扩展声明可访问的目标站点范围。由于本扩展的核心价值在于**跨站点检索与管理 Cookie**（例如不打开某网站也能查到它的 Cookie），必须声明对所有站点的访问权限。扩展**只**在你打开其面板时读取 Cookie，不会在后台浏览网页内容，也不会读取页面正文、表单输入或密码。

### 儿童隐私

本扩展不面向儿童，也不会有意收集儿童的个人信息。

### 政策变更

如本政策发生变更，我们会更新本文件并修改顶部的"最后更新"日期。

### 联系方式

如有隐私相关问题，请通过 [GitHub Issues](https://github.com/Black17999/Cookie-master-pro/issues) 联系我们。

---

## English

### Summary

CookieMaster Pro is a **fully local** browser extension. It does not collect, upload, or share any of your data.

### What data is processed

To provide cookie management, the extension reads the following **inside your browser**:

- **Website cookies** (name, value, domain, path, expiry, HttpOnly / Secure / SameSite attributes)
- **The current tab's URL** (to determine which site is "current")
- **Settings you enter yourself** (appearance preference, remote API URL)

### Where this data lives

- Cookie data and tab URLs are **processed in memory only while the panel is open** and are released when it closes. Nothing is written to storage.
- Settings are stored via Chrome's official `chrome.storage.sync` in **your own browser profile**. The developer cannot access them.

### Where data is sent

**Nowhere controlled by the developer.** The only exceptions are features you invoke yourself:

- **"Upload to API"**: only when you enter an API URL and click the button, the current cookie list is POSTed as JSON to **the endpoint you specified**. The developer has no knowledge of it and no access to that data.
- **"View source on GitHub"**: merely opens a public web page; no data is attached.

### Permission usage

| Permission | Purpose |
| --- | --- |
| `cookies` | Read, create, modify and delete cookies — the core function |
| `tabs` | Read the active tab's URL to identify the current site |
| `clipboardWrite` | Copy cookies to the clipboard |
| `storage` | Persist appearance preference and remote API URL |
| `sidePanel` | Render the panel on the right side of the browser |
| `<all_urls>` | Access cookies of any site. **Required for cross-site search and management** — the browser offers no finer-grained alternative |

### Why `<all_urls>` is necessary

Chrome's Cookie API requires an extension to declare which sites it may access. Because the core value of this extension is **cross-site cookie retrieval and management** (e.g. inspecting a site's cookies without opening it), broad host access is unavoidable. The extension reads cookies **only** while its panel is open; it never browses page content in the background and never reads page text, form input, or passwords.

### Children's privacy

This extension is not directed at children and does not knowingly collect any personal information from them.

### Changes to this policy

If this policy changes, we will update this document and revise the "last updated" date above.

### Contact

For privacy questions, reach us via [GitHub Issues](https://github.com/Black17999/Cookie-master-pro/issues).
