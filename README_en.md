# CookieMaster Pro 🍪

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-brightgreen.svg)](https://chrome.google.com/webstore)

A simple yet powerful Cookie editor that quickly retrieves, views, and exports all cookies from the current domain. Supports exporting in multiple formats (Header String, JSON, Netscape), can push directly to remote APIs, and allows you to quickly create, edit, or delete cookies without leaving your current tab. Perfectly enhances cookie management efficiency, making development and debugging more intuitive and convenient.

## 🌟 Key Features

- **Cookie Retrieval**: Automatically fetches all cookies from the current site and related domains
- **Multiple Export Formats**: Supports exporting as Header String, JSON, and Netscape formats
- **Remote Push**: Directly push cookie data to a specified remote API
- **Cookie Management**: Supports creating, editing, and deleting cookies
- **Sensitive Detection**: Automatically identifies and highlights sensitive cookies (such as session, token, etc.)
- **Import Functionality**: Supports importing cookies from text or files
- **Real-time Sync**: Automatically refreshes display when cookies change

## 📦 Installation

### Install from Chrome Web Store (Recommended)

1. Visit [Chrome Web Store]()
2. Search for "CookieMaster Pro"
3. Click the "Add to Chrome" button

### Local Installation (Developer Mode)

1. Clone or download this repository
2. Open Chrome browser and visit `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select this project folder

## 🚀 Usage

1. Click the CookieMaster Pro icon in the browser toolbar
2. The extension will automatically load cookie information for the current site
3. Use the following functions:
   - **Copy Header**: Copy all cookies in Header format
   - **Export**: Choose different formats to export cookie data
   - **Upload to Remote API**: Send cookie data to a specified API
   - **Add Cookie**: Create a new cookie
   - **Import Cookie**: Import cookies from text or file
   - **Edit/Delete**: Click on a cookie item to edit or delete it

## 🖼️ Screenshots

<div style="text-align: center;">
  <figure>
    <img src="https://tc.1717.qzz.io/file/AgACAgUAAyEGAASl4l5eAAMIaMF9RHA6YL3AP-ADiG5-_wABG-UlAAIoyDEbI3kIViDgmGREsra8AQADAgADeAADNgQ.png" alt="CookieMaster Pro Main Interface" style="width: 100%; max-width: 600px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-radius: 8px;">
    <figcaption>CookieMaster Pro Main Interface</figcaption>
  </figure>
  
  <figure>
    <img src="https://tc.1717.qzz.io/file/AgACAgUAAyEGAASl4l5eAAMJaMF9VsNAlao6BG45_-LUneE6pMkAAinIMRsjeQhWuaGP54rywKQBAAMCAAN4AAM2BA.png" alt="CookieMaster Pro Edit Interface" style="width: 100%; max-width: 600px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-radius: 8px;">
    <figcaption>CookieMaster Pro Edit Interface</figcaption>
  </figure>
</div>

## 🔐 Permissions

- `cookies`: Read and modify cookies
- `tabs`: Get current tab information
- `clipboardWrite`: Copy content to clipboard
- `storage`: Save extension settings
- `<all_urls>`: Access all websites to get cookies

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Issues and Pull Requests are welcome to improve this project!

## 📧 Contact

If you have any questions or suggestions, please contact us through:

- Submit an [Issue](https://github.com/your-username/cookie-exporter/issues)