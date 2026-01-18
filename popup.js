// --- Constants & Utils ---

const AIRTABLE_REGEX = /airtable\.com\/(app\w+)?(?:.*?\/(tbl\w+))?(?:.*?\/(viw\w+))?(?:.*?(fld\w+))?(?:.*?(rec\w+))?/;

function parseAirtableUrl(url) {
  const match = url.match(AIRTABLE_REGEX);
  if (!match) return null;

  const ids = {
    "Base ID": match[1] || "",
    "Table ID": match[2] || "",
    "View ID": match[3] || "",
    "Field ID": match[4] || "",
    "Record ID": match[5] || ""
  };

  // Return null if no actual IDs found (e.g. just raw airtable.com)
  if (Object.values(ids).every(v => !v)) return null;

  return ids;
}

// --- Status Management ---

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initial Load
  initializePopup();

  // 2. Setup Listeners
  setupListeners();
});

function initializePopup() {
  // Load History from storage (Background is source of truth for history)
  chrome.storage.local.get("history", (result) => {
    renderHistory(result.history || []);
  });

  // Check Active Tab for "Current" content
  // We do NOT rely on storage for current page to avoid "stale" data
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (activeTab && activeTab.url) {
      handleUrl(activeTab.url, false); // false = isPaste
    } else {
      renderEmptyState();
    }
  });
}

function setupListeners() {
  // Paste Button
  const pasteBtn = document.getElementById("paste-btn");
  pasteBtn.addEventListener("click", handlePaste);

  // Click Delegation
  document.body.addEventListener("click", (e) => {
    // Copy Actions
    if (e.target.closest(".copy-trigger")) {
      const target = e.target.closest(".copy-trigger");
      const textToCopy = target.dataset.copy;
      if (textToCopy) copyToClipboard(textToCopy);
    }

    // History Restore actions
    if (e.target.closest(".history-item")) {
      const item = e.target.closest(".history-item");
      const ids = JSON.parse(decodeURIComponent(item.dataset.ids));
      renderCurrentIds(ids);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // Storage Listener (Only for History updates, don't override current view)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.history) {
      renderHistory(changes.history.newValue);
    }
  });
}

// --- Logic ---

function handleUrl(url, isPaste) {
  const ids = parseAirtableUrl(url);

  if (ids) {
    // 1. Render Immediate
    renderCurrentIds(ids);

    // 2. Sync to Background (updates history & badge)
    chrome.runtime.sendMessage({
      type: "newAirtableIds",
      data: ids,
      url: url
    });

    if (isPaste) {
      showToast("Link processed from clipboard!");
    }
  } else {
    if (isPaste) {
      showToast("No Airtable link found in clipboard.");
    } else {
      renderEmptyState();
    }
  }
}

async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText();
    if (text.includes("airtable.com")) {
      handleUrl(text, true);
    } else {
      showToast("Clipboard does not contain an Airtable link.");
    }
  } catch (err) {
    showToast("Clipboard access failed. Try again.");
  }
}

// --- Rendering ---

function renderEmptyState() {
  const container = document.getElementById("id-list");
  container.innerHTML = `<div class="empty-state">No Airtable IDs on this tab.<br/>Paste a URL or check History.</div>`;
}

function renderCurrentIds(ids) {
  const container = document.getElementById("id-list");
  container.innerHTML = "";

  const entries = Object.entries(ids || {}).filter(([_, val]) => !!val);

  if (entries.length === 0) {
    renderEmptyState();
    return;
  }

  entries.forEach(([key, value]) => {
    const row = document.createElement("div");
    row.className = "id-row";
    row.innerHTML = `
            <span class="id-label">${key}</span>
            <span class="id-value copy-trigger" data-copy="${value}" title="Click to copy">${value}</span>
            <button class="copy-btn copy-trigger" data-copy="${value}">Copy</button>
        `;
    container.appendChild(row);
  });
}

function renderHistory(history) {
  const container = document.getElementById("history-list");
  container.innerHTML = "";

  if (!history || history.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:#ccc; font-size:11px; padding:10px;">No recent history</div>`;
    return;
  }

  history.forEach(entry => {
    const ids = entry.ids;
    const names = entry.names || {};

    // Skip entry if no IDs found
    const validIds = Object.entries(ids).filter(([_, v]) => !!v);
    if (validIds.length === 0) return;

    const card = document.createElement("div");
    card.className = "history-card";

    // Header: Time + Base Name (if known)
    const timeString = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const baseTitle = names.baseName || "Base History";

    let html = `
            <div class="history-header">
                <span class="history-base-name" title="${baseTitle}">${baseTitle}</span>
                <span class="history-time">${timeString}</span>
            </div>
        `;

    // Rows for each ID type
    // 1. Base ID
    if (ids["Base ID"] || ids["App ID"]) {
      html += createHistoryRow("Base ID", ids["Base ID"] || ids["App ID"]);
    }

    // 2. Table ID
    if (ids["Table ID"]) {
      const label = names.tableName ? `Table: ${names.tableName}` : "Table ID";
      html += createHistoryRow(label, ids["Table ID"]);
    }

    // 3. View ID
    if (ids["View ID"]) {
      const label = names.viewName ? `View: ${names.viewName}` : "View ID";
      html += createHistoryRow(label, ids["View ID"]);
    }

    // 4. Field ID
    if (ids["Field ID"]) {
      html += createHistoryRow("Field ID", ids["Field ID"]);
    }

    // 5. Record ID
    if (ids["Record ID"]) {
      html += createHistoryRow("Record ID", ids["Record ID"]);
    }

    // Add a hidden data attribute for restoring if user clicks header? 
    // Or just let them copy individual fields. 
    // We'll add the dataset just in case we want to support 'click card to restore' later, 
    // but for now the rows handle the copying.
    card.innerHTML = html;
    container.appendChild(card);
  });
}

function createHistoryRow(label, value) {
  return `
        <div class="history-row">
            <span class="history-label" title="${label}">${label}</span>
            <span class="history-id-text copy-trigger" data-copy="${value}">${value}</span>
            <button class="copy-btn copy-trigger" data-copy="${value}">Copy</button>
        </div>
    `;
}

// --- Utilities ---

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast("Copied to clipboard!");
  });
}

let toastTimeout;
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}
