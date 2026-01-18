# Airtable ID Extractor

<p align="center">
  <img src="icon.png" alt="Airtable ID Extractor Icon" width="128"/>
</p>

A powerful Chrome extension for developers and power users who work with the Airtable API. This tool automatically extracts **Base**, **Table**, **View**, **Field**, and **Record IDs** directly from your browser's URL bar or from pasted links.

## 🚀 Features

*   **Instant Extraction**: Automatically detects and displays IDs when you visit any Airtable page.
*   **Detailed ID Support**: Extracts:
    *   **Base ID** (`app...`)
    *   **Table ID** (`tbl...`)
    *   **View ID** (`viw...`)
    *   **Field ID** (`fld...` - often hidden in URL queries)
    *   **Record ID** (`rec...` - from expanded records)
*   **Clipboard Paster**: Paste any Airtable URL directly into the extension to extract IDs without needing to visit the page.
*   **Smart History**: Keeps a local history of your recently visited bases and views, including their names (parsed from the page title).
*   **One-Click Copy**: Copy any ID instantly with a single click.
*   **Zero-Config**: Works immediately upon installation.

## 📦 Installation

Since this is a developer extension, you can install it manually in Chrome:

1.  Clone or download this repository.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the folder containing this extension's files.

## 🛠 Usage

### On an Airtable Page
1.  Navigate to any Airtable base or view.
2.  Click the extension icon in your browser toolbar.
3.  The relevant IDs for the current view will be listed immediately.
4.  Click the **Copy** button next to any ID to use it.

### Using the Clipboard
1.  Copy an Airtable URL from anywhere (Slack, Email, Docs).
2.  Open the extension popup.
3.  Click the **Paste URL** button.
4.  The extension will parse the IDs from the clipboard link and display them.

### History
The extension automatically saves a local history of IDs you've encountered. Scroll down in the popup to see previous bases and views you've visited, along with their names.

## 🔒 Privacy & Permissions

This extension is designed with privacy in mind.

*   **`https://airtable.com/*`**: Required to read the URL and page title of Airtable tabs to extract IDs and Names.
*   **`clipboardRead`**: Required to allow you to paste URLs into the extension.
*   **`clipboardWrite`**: Required to copy IDs to your clipboard.
*   **`storage`**: Used to save your ID history locally on your device.

**No data is ever sent to external servers.** All processing happens locally in your browser.

## 📝 License

[MIT](LICENSE)
