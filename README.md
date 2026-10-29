<div align="center">

<img src="icon-128.png" width="80" alt="CookieMaster Pro">

<h1>CookieMaster Pro</h1>

<p>一款简单而强大的 Cookie 管理器 —— 在浏览器<strong>右侧边栏</strong>中查看、搜索、编辑与导入导出任意网站的 Cookie。</p>

<p>
  <a href="README_en.md"><img src="https://img.shields.io/badge/English-README_en.md-blue.svg" alt="English"></a>
  <a href="https://github.com/Black17999/Cookie-master-pro/releases"><img src="https://img.shields.io/badge/version-3.1.0-orange.svg" alt="Version"></a>
  <a href="https://www.google.com/chrome/"><img src="https://img.shields.io/badge/Chrome-114%2B-blue.svg" alt="Chrome 114+"></a>
  <a href="https://developer.chrome.com/docs/extensions/mv3/intro/"><img src="https://img.shields.io/badge/Manifest-V3-brightgreen.svg" alt="Manifest V3"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
</p>

</div>

---

## ✨ 主要更新

| 更新 | 说明 |
| --- | --- |
| 🪟 **右侧边栏** | 点击图标在浏览器右侧展开面板，高度占满整个侧边，跨标签页保持打开，宽度可自由拖拽 |
| 🌗 **深浅色一键循环** | 顶栏图标按钮一点即切：跟随系统 → 浅色 → 深色，图标实时反映当前模式 |
| 🔍 **跨站全局搜索** | 无需打开目标网站，即可搜索浏览器中**所有**网站的 Cookie |
| ☑️ **批量操作** | 多选后批量复制、批量导出、批量删除 |
| 💻 **请求代码生成** | 一键把 Cookie 转成 `cURL` / `fetch` / `Python requests` 代码 |
| 🔑 **JWT 解析** | 自动识别 JWT 并解出签发时间、过期时间、主体等信息；URL 编码的值可一键解码 |
| 🛡️ **安全审计** | 主动标出敏感 Cookie 未加 `Secure`、`SameSite=None` 无 `Secure`、长期不过期等风险 |
| 🔎 **作用域可见** | 卡片直接标出 `domain/path`，同名 Cookie 会高亮作用域——不再「和 F12 对不上」 |
| ↩️ **删除可撤销** | 删除后 6 秒内可一键恢复，误删不再不可逆 |
| 🌐 **中英双语** | 按浏览器语言自动切换界面语言 |
| ⌨️ **键盘操作** | `↑↓` 选择、`Enter` 编辑、`Delete` 删除、`Ctrl/Cmd+F` 搜索 |
| 🗂️ **域名分组** | 全局视图下按域名折叠 / 展开 |
| 🍪 **全新图标** | 矢量重绘，透明背景，在 16px 工具栏尺寸下依然清晰可辨 |

---

## 🌟 主要特性

### 浏览与检索

- **🪟 侧边栏常驻** — 一边浏览网页一边管理 Cookie，不受弹窗尺寸限制
- **🔍 全局搜索** — 跨站点检索任意网站的 Cookie，支持域名简写（输入 `github` 命中 `github.com`）
- **🗂️ 域名分组** — 全局视图下按域名折叠，域名多时依然清爽
- **🏷️ 敏感识别** — 自动标记 session、token、auth 等敏感 Cookie 并用颜色区分
- **📊 属性可视化** — HttpOnly / Secure / SameSite / 过期时间 / Partitioned 以徽章形式直观呈现
- **🔎 作用域标注** — 卡片标出 `domain/path`；同名 Cookie 会高亮作用域，避免拿错那一条

### 提取与流转

- **💻 代码生成** — 直接产出 `cURL` / `fetch` / `Python requests` 三种可运行代码
- **📤 多种导出格式** — Header String / JSON / Netscape，一键下载
- **☑️ 批量提取** — 多选后批量复制、批量导出
- **📥 智能导入** — 从文本或文件导入，自动识别 JSON、Header String、Netscape 三种格式
- **🌐 Cookie 同步** — 把当前列表 POST 到你自己的地址（仅 HTTPS，发送前二次确认）

### 分析与安全

- **🔑 JWT 解析** — 解出载荷中的签发时间、过期时间、主体等字段
- **🔤 编码解码** — URL 编码的值一键还原为可读文本
- **🛡️ 风险审计** — 提示敏感 Cookie 的安全配置缺陷，支持「仅看风险项」筛选

### 编辑与管理

- **✏️ 完整增删改查** — 创建、编辑、删除任意域名下的 Cookie，无需切换标签页
- **↩️ 撤销删除** — 误删后 6 秒内可恢复
- **⚡ 实时同步** — Cookie 变化时列表自动刷新（带渲染去重，不会闪烁跳动）
- **🧭 跟随标签页** — 侧边栏模式下切换标签页会自动跳到新网站

---

## 📦 安装方法

### 本地安装（推荐）

1. 打开 [Releases 页面](https://github.com/Black17999/Cookie-master-pro/releases)，下载最新的 `CookieMaster.Pro-x.x.zip`
2. 解压到一个**固定的文件夹**（别删，Chrome 会一直从这里加载）
3. 打开 Chrome，访问 `chrome://extensions/`
4. 开启右上角的 **开发者模式**
5. 点击 **加载已解压的扩展程序**，选择解压出来的文件夹

也可以用 git 克隆源码：

```bash
git clone https://github.com/Black17999/Cookie-master-pro.git
```

> **浏览器要求**：侧边栏模式需要 **Chrome 114 或更高版本**。
> 在更早的版本中，扩展会自动回退为传统的工具栏弹窗模式。

### 从 Chrome 网上应用店安装

> 🚧 **暂未上架。** 完成开发者账号验证后会上架，届时更新这里。

---

## 🚀 使用说明

### 打开面板

点击工具栏图标，面板从**浏览器右侧**展开。点击侧边栏顶部的图钉即可固定，切换标签页时保持打开。

### 切换数据范围

- **当前网站** — 当前标签页域名及其所有子域的 Cookie
- **全部 Cookie** — 浏览器中所有网站的 Cookie

### 搜索

搜索框对当前范围实时过滤：

| 输入 | 匹配结果 |
| --- | --- |
| `github.com` | 精确命中该域名及其子域 |
| `github` | 命中所有包含该关键词的域名 |
| `session` | 命中名称或值中包含该关键词的 Cookie |

结果按相关度排序，命中的文字会高亮显示。

### 批量操作

点击工具条上的「选择」进入多选模式：

1. 勾选需要的条目，或点「全选」
2. 底部切换为批量操作栏：**复制** / **导出** / **删除**
3. 点「退出」返回常规模式

### 生成请求代码

点击底部「生成代码」，选择 `cURL` / `fetch` / `Python` 标签页，代码会随选择实时生成，点「复制」即可使用。

### JWT 与编码值解析

点击条目中的 Cookie 值区域展开，如果该值是一个 JWT，会自动解析出载荷；如果包含 URL 编码，会同时给出解码后的明文。

### 安全风险提示

扩展会自动审计每条 Cookie 并标出风险，例如：

- 敏感 Cookie 未启用 `Secure`（可能在明文 HTTP 中被窃取）
- `SameSite=None` 但未启用 `Secure`（浏览器会拒绝写入）
- 高权限 Cookie 有效期超过 180 天，或没有设置过期时间
- 敏感 Cookie 未启用 `HttpOnly`（可被页面脚本读取）

点工具条上的「仅风险项」可以只看有问题的条目。

### 快捷键

| 按键 | 作用 |
| --- | --- |
| `Ctrl / Cmd + F` | 聚焦搜索框 |
| `↑` `↓` | 上下选择条目 |
| `Enter` | 编辑选中条目 |
| `Delete` | 删除选中条目 |
| `Esc` | 关闭弹窗 / 退出多选 |

### 外观模式

面板默认**跟随浏览器主题**。顶栏最左侧的图标按钮可以一键循环切换：**跟随系统 → 浅色 → 深色**，图标会实时反映当前模式（显示器 / 太阳 / 月亮）。设置面板里也有同一个入口。

### 作用域与「和 F12 看到的不一样」

每张卡片都会标出这条 Cookie 的作用域（`domain` + `path`）。如果同一个名字在列表里出现多条，作用域会高亮成强调色，鼠标悬停能看到完整说明。

这一步是为了避免一个常见的困惑：**同名 Cookie 可以存在多条，只是 path 或 domain 不同，值可能完全不一样**。Chrome DevTools 的 Application → Cookies 按 Domain / Path 分组显示，你对比时如果拿的是另一条，就会觉得「插件看到的值不对」。另外两种常见情况：

- 带 `Partitioned` 标记的分区 Cookie（CHIPS）：同名但在不同顶级站点下值不同，卡片上会显示 `Partitioned` 徽章；
- `HttpOnly` 的 Cookie 在控制台的 `document.cookie` 里根本看不到，只有在 DevTools 的 Application → Cookies 里查。

### Cookie 同步（远程 API）

点击右上角 ⚙️，填写地址并保存后，可以把当前列表推送到该地址（JSON POST），用来搬运登录态。

出于安全考虑：

- 只接受 `https://` 地址（本机 `localhost` / `127.0.0.1` 例外）；
- 输入框下方会实时显示「数据将发送到：xxx 主机」；
- 发送前会弹确认框，写清条数和目标主机；
- 提供「测试连接」按钮，发送一个 `HEAD` 请求探活。

---

## 🖼️ 界面预览

<div align="center">

<img src="screenshots/main-interface.png" alt="主界面（浅色）" width="420">
<br>
<sub>主界面 · 浅色模式</sub>

<br><br>

<img src="screenshots/dark-mode.png" alt="深色模式" width="420">
<br>
<sub>主界面 · 深色模式</sub>

<br><br>

<img src="screenshots/side-panel.png" alt="侧边栏宽屏" width="600">
<br>
<sub>拖宽侧边栏后自动切换为两列布局</sub>

<br><br>

<img src="screenshots/code.png" alt="生成请求代码" width="440">
<br>
<sub>一键生成 cURL / fetch / Python 请求代码</sub>

<br><br>

<img src="screenshots/settings.png" alt="设置面板" width="420">
<br>
<sub>设置 · 外观切换、Cookie 同步、危险操作</sub>

<br><br>

<img src="screenshots/edit-interface.png" alt="编辑界面" width="420">
<br>
<sub>编辑 Cookie</sub>

</div>

---

## 🔐 权限说明

| 权限 | 用途 |
| --- | --- |
| `cookies` | 读取和修改 Cookie |
| `tabs` | 获取当前标签页的地址，用于定位当前网站 |
| `clipboardWrite` | 复制 Cookie 到剪贴板 |
| `storage` | 保存外观偏好、远程 API 地址等设置 |
| `sidePanel` | 在浏览器右侧显示侧边栏面板 |
| `<all_urls>` | 访问任意网站的 Cookie（全局搜索与跨站管理所必需） |

---

## 🛡️ 隐私

**本扩展纯本地运行，不收集、不上传、不分享任何数据。**

Cookie 数据仅在面板打开时于内存中处理，关闭即释放。设置项通过 Chrome 官方的 `chrome.storage.sync` 保存在你自己的浏览器账号中。

唯一的对外请求是你在设置中**主动配置**的远程 API 地址。

完整说明请见 [隐私政策](PRIVACY.md)。

---

## 🗂️ 项目结构

```
CookieMaster Pro/
├── manifest.json            # 扩展清单（MV3）
├── background.js            # 后台服务，负责挂接侧边栏行为
├── popup.html               # 界面结构（侧边栏与弹窗共用）
├── popup.js                 # 界面逻辑（侧边栏与弹窗共用）
├── style.css                # 样式表（设计令牌 + 深浅色）
├── locales/
│   ├── zh-CN.js             # 界面中文文案
│   └── en.js                # 界面英文文案
├── _locales/                # 供 Chrome 商店展示的名称与描述
│   ├── zh_CN/messages.json
│   └── en/messages.json
├── icon.svg                 # 图标源文件（矢量）
├── icon-16/32/48/128.png    # 各尺寸图标（透明背景）
├── PRIVACY.md               # 隐私政策
└── screenshots/             # 文档截图
```

> 界面文件同时服务于侧边栏与弹窗两种宿主：运行时自动识别所在环境并适配宽度。

---

## 📄 许可证

本项目采用 MIT 许可证，详情请见 [LICENSE](LICENSE) 文件。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进本项目！

## 📧 联系方式

如有问题或建议，请提交 [Issue](https://github.com/Black17999/Cookie-master-pro/issues)。
