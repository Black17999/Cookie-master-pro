<div align="center">

<img src="icon-128.png" width="80" alt="CookieMaster Pro">

<h1>CookieMaster Pro</h1>

<p>A simple yet powerful cookie manager that lives in your browser's <strong>side panel</strong>. View, search, edit, import and export cookies from any website — with batch operations, request code generation, JWT decoding and security auditing.</p>

<p>
  <a href="README.md"><img src="https://img.shields.io/badge/中文-README.md-blue.svg" alt="中文"></a>
  <a href="https://github.com/Black17999/Cookie-master-pro/releases"><img src="https://img.shields.io/badge/version-3.1.0-orange.svg" alt="Version"></a>
  <a href="https://www.google.com/chrome/"><img src="https://img.shields.io/badge/Chrome-114%2B-blue.svg" alt="Chrome 114+"></a>
  <a href="https://developer.chrome.com/docs/extensions/mv3/intro/"><img src="https://img.shields.io/badge/Manifest-V3-brightgreen.svg" alt="Manifest V3"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
</p>

</div>

---

## ✨ Highlights

| Update | Description |
| --- | --- |
| 🪟 **Side Panel** | Opens on the right of the browser, full height, persists across tab switches, freely resizable |
| 🌗 **One-Click Theme Cycle** | Header button cycles Auto → Light → Dark; the icon always shows the current mode |
| 🔍 **Cross-Site Search** | Search cookies from **any** website without opening it first |
| ☑️ **Batch Operations** | Multi-select to copy, export or delete in bulk |
| 💻 **Code Generation** | Turn cookies into runnable `cURL` / `fetch` / `Python requests` code |
| 🔑 **JWT Decoding** | Detects JWTs and reveals issued/expiry/subject; URL-encoded values decode in one click |
| 🛡️ **Security Audit** | Flags sensitive cookies without `Secure`, `SameSite=None` without `Secure`, over-long lifetimes and more |
| 🔎 **Visible Scope** | Every card shows its `domain/path`; same-named cookies highlight their scope — no more "differs from F12" |
| ↩️ **Undo Delete** | Restore within 6 seconds — deletions are no longer irreversible |
| 🌐 **Bilingual UI** | Interface language follows your browser (Chinese / English) |
| ⌨️ **Keyboard Control** | `↑↓` navigate, `Enter` edit, `Delete` remove, `Ctrl/Cmd+F` search |
| 🗂️ **Domain Grouping** | Collapse/expand by domain in the global view |
| 🍪 **New Icon** | Vector redrawn with a transparent background — crisp at 16px |

---

## 🌟 Key Features

### Browsing & retrieval

- **🪟 Persistent Side Panel** — Manage cookies side by side with the page
- **🔍 Global Search** — Search across every site; partial domains work too (`github` matches `github.com`)
- **🗂️ Domain Grouping** — Collapse by domain when there are many
- **🏷️ Sensitivity Detection** — Highlights session, token and auth cookies
- **📊 Attribute Badges** — HttpOnly / Secure / SameSite / expiry / Partitioned at a glance
- **🔎 Scope Labels** — Each card shows `domain/path`; same-named cookies highlight their scope so you never compare the wrong one

### Extraction & workflow

- **💻 Code Generation** — Produces `cURL` / `fetch` / `Python requests` snippets
- **📤 Multiple Export Formats** — Header String / JSON / Netscape
- **☑️ Batch Export** — Select many, copy or export at once
- **📥 Smart Import** — Auto-detects JSON, Header String and Netscape formats
- **🌐 Cookie Sync** — POST the current list to your own endpoint (HTTPS only, with a confirmation step)

### Analysis & security

- **🔑 JWT Decoding** — Extracts issued-at, expiry, subject and the full payload
- **🔤 URL Decoding** — One-click decode of percent-encoded values
- **🛡️ Risk Audit** — Flags misconfigured sensitive cookies, with a "risky only" filter

### Editing & management

- **✏️ Full CRUD** — Create, edit and delete cookies of any domain without switching tabs
- **↩️ Undo** — Recover accidental deletions within 6 seconds
- **⚡ Live Sync** — Auto-refresh on cookie changes (deduplicated rendering, no flicker)
- **🧭 Follows the Active Tab** — In side panel mode it jumps to the new site automatically

---

## 📦 Installation

### Local install (Recommended)

1. Open the [Releases page](https://github.com/Black17999/Cookie-master-pro/releases) and download the latest `CookieMaster.Pro-x.x.zip`
2. Extract it to a **permanent folder** (don't delete it — Chrome loads the extension from there every time)
3. Open Chrome and go to `chrome://extensions/`
4. Enable **Developer mode** in the top right corner
5. Click **Load unpacked** and select the extracted folder

You can also clone the source instead:

```bash
git clone https://github.com/Black17999/Cookie-master-pro.git
```

> **Requirement**: Side panel mode requires **Chrome 114 or later**.
> On older versions the extension falls back to the classic toolbar popup.

### From the Chrome Web Store

> 🚧 **Not published yet.** It will be listed here once developer account verification is complete.

---

## 🚀 Usage

### Opening the panel

Click the toolbar icon — the panel slides in from the **right side**. Pin it from the panel header to keep it open while switching tabs.

### Switching scope

- **Current Site** — the current tab's domain and all its subdomains
- **All Cookies** — every cookie stored in the browser

### Searching

| Input | Matches |
| --- | --- |
| `github.com` | That exact domain and its subdomains |
| `github` | Any domain containing the keyword |
| `session` | Cookies whose name or value contains it |

Results are ranked by relevance and matched text is highlighted.

### Batch operations

Click **Select** in the toolbar to enter multi-select mode:

1. Tick the rows you want, or press **Select all**
2. The bottom bar switches to **Copy** / **Export** / **Delete**
3. Press **Exit** to return to normal mode

### Code generation

Click **Code** at the bottom, pick the `cURL` / `fetch` / `Python` tab — the snippet regenerates instantly. Press **Copy** to use it.

### JWT & encoded values

Click a cookie's value to expand it. JWTs are decoded into their payload automatically; percent-encoded values get a decoded preview alongside.

### Security audit

The extension audits every cookie and flags issues such as:

- Sensitive cookie without `Secure` (can leak over plain HTTP)
- `SameSite=None` without `Secure` (browsers will reject it)
- High-privilege cookie valid over 180 days, or with no expiry
- Sensitive cookie without `HttpOnly` (readable by page scripts)

Use **Risky only** in the toolbar to show just those.

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Ctrl / Cmd + F` | Focus search |
| `↑` `↓` | Move selection |
| `Enter` | Edit the focused cookie |
| `Delete` | Delete the focused cookie |
| `Esc` | Close dialog / exit multi-select |

### Appearance

The panel follows your browser theme by default. The leftmost icon in the header cycles **Auto → Light → Dark** in one click, and the icon always reflects the current mode (monitor / sun / moon). The same switch also lives in Settings.

### Scope, and "why does it differ from F12?"

Every card shows the cookie's scope (`domain` + `path`). If the same name appears more than once, the scope is highlighted in the accent colour and the tooltip spells it out.

This exists to kill a common confusion: **several cookies can share a name and differ only by path or domain — and their values can be completely different.** DevTools' Application → Cookies panel groups by Domain / Path, so comparing against the wrong row makes the extension look wrong. Two more cases:

- Partitioned cookies (CHIPS) reuse the name but hold different values per top-level site; they carry a `Partitioned` badge;
- `HttpOnly` cookies never appear in `document.cookie` — only DevTools → Application → Cookies lists them.

### Cookie sync (remote API)

Open ⚙️, enter and save an endpoint, then push the current list to it as a JSON POST — handy for moving a signed-in session around.

Safety rails:

- HTTPS only (`localhost` / `127.0.0.1` excepted);
- A live "Data will be sent to: <host>" line under the input;
- A confirmation dialog naming the cookie count and target host before anything leaves;
- A "Test connection" button that probes with a `HEAD` request.

---

## 🖼️ Screenshots

<div align="center">

<img src="screenshots/main-interface.png" alt="Main interface (light)" width="420">
<br>
<sub>Main interface · light mode</sub>

<br><br>

<img src="screenshots/dark-mode.png" alt="Dark mode" width="420">
<br>
<sub>Main interface · dark mode</sub>

<br><br>

<img src="screenshots/side-panel.png" alt="Wide side panel" width="600">
<br>
<sub>Widen the panel and it switches to a two-column layout</sub>

<br><br>

<img src="screenshots/code.png" alt="Generate request code" width="440">
<br>
<sub>Generate cURL / fetch / Python request code</sub>

<br><br>

<img src="screenshots/settings.png" alt="Settings" width="420">
<br>
<sub>Settings · appearance, cookie sync and danger zone</sub>

<br><br>

<img src="screenshots/edit-interface.png" alt="Edit dialog" width="420">
<br>
<sub>Editing a cookie</sub>

</div>

---

## 🔐 Permissions

| Permission | Purpose |
| --- | --- |
| `cookies` | Read and modify cookies |
| `tabs` | Read the active tab's URL to identify the site |
| `clipboardWrite` | Copy cookies to the clipboard |
| `storage` | Store settings such as the remote API URL |
| `sidePanel` | Display the side panel on the right of the browser |
| `<all_urls>` | Access cookies of any website (required for global search and cross-site management) |

---

## 🛡️ Privacy

**This extension runs entirely locally. It does not collect, upload or share any data.**

Cookie data is processed in memory only while the panel is open. Settings are stored via Chrome's official `chrome.storage.sync` in your own browser profile.

The only outbound request is the remote API you configure yourself.

See the full [Privacy Policy](PRIVACY.md).

---

## 🗂️ Project Structure

```
CookieMaster Pro/
├── manifest.json            # Extension manifest (MV3)
├── background.js            # Service worker, wires up the side panel behaviour
├── popup.html               # UI markup (shared by side panel and popup)
├── popup.js                 # UI logic (shared by side panel and popup)
├── style.css                # Stylesheet (design tokens + light/dark)
├── locales/
│   ├── zh-CN.js             # Chinese UI strings
│   └── en.js                # English UI strings
├── _locales/                # Name & description shown on the Chrome Web Store
│   ├── zh_CN/messages.json
│   └── en/messages.json
├── icon.svg                 # Icon source (vector)
├── icon-16/32/48/128.png    # Rendered icons (transparent background)
├── PRIVACY.md               # Privacy policy
└── screenshots/             # Documentation screenshots
```

> The UI files serve both the side panel and the popup — the runtime detects the host and adapts the width.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Issues and Pull Requests are welcome!

## 📧 Contact

If you have any questions or suggestions, please submit an [Issue](https://github.com/Black17999/Cookie-master-pro/issues).
