# CookieMaster Pro 🍪

[![中文](https://img.shields.io/badge/中文-README.md-blue.svg)](README.md)
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

> **Note**: To properly display screenshots on GitHub, please download the following images and save them to the `screenshots` directory in the project. If you don't have screenshots, you can delete this section or replace with actual screenshot links.
>
> 1. Create a `screenshots` directory: `mkdir screenshots`
> 2. Save the following images to the `screenshots` directory
> 3. Update image links to relative paths

<div style="text-align: center;">
  <figure>
    <img src="screenshots/main-interface.png" alt="CookieMaster Pro Main Interface" style="width: 100%; max-width: 600px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-radius: 8px;">
    <figcaption>CookieMaster Pro Main Interface</figcaption>
  </figure>
  
  <figure>
    <img src="screenshots/edit-interface.png" alt="CookieMaster Pro Edit Interface" style="width: 100%; max-width: 600px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-radius: 8px;">
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