// Helper to parse the document title for names
function parseNames() {
  const title = document.title;
  // Common Formats:
  // "View Name - Table Name - Base Name - Airtable"
  // "Base Name: Table Name - Airtable" (Often used in shared views or some locales)

  if (!title || title === "Airtable") return {};

  let cleanTitle = title;
  // Remove " - Airtable" suffix if present
  if (cleanTitle.endsWith(" - Airtable")) {
    cleanTitle = cleanTitle.substring(0, cleanTitle.length - 11);
  }

  // Strategy 1: "Base Name: Table Name" (separator is ": ")
  if (cleanTitle.includes(": ")) {
    const parts = cleanTitle.split(": ");
    // Heuristic: If 2 parts, likely [Base, Table] or [Base + Table, View]
    // Let's assume [Base Name, Table Name]
    if (parts.length === 2) {
      // Check if the second part has a hyphen (Table - View)
      if (parts[1].includes(" - ")) {
        const subParts = parts[1].split(" - ");
        return {
          baseName: parts[0],
          tableName: subParts[0],
          viewName: subParts.slice(1).join(" - ")
        };
      }
      return {
        baseName: parts[0],
        tableName: parts[1]
      };
    }
  }

  // Strategy 2: Standard Hyphen Separation
  // "View - Table - Base"
  const parts = cleanTitle.split(" - ");

  if (parts.length >= 3) {
    return {
      viewName: parts[0],
      tableName: parts[1],
      baseName: parts.slice(2).join(" - ")
    };
  } else if (parts.length === 2) {
    // Ambiguous: Could be "Table - Base" or "View - Table"
    // Usually "Table - Base" is the standard fallback
    return {
      tableName: parts[0],
      baseName: parts[1]
    };
  } else if (parts.length === 1) {
    return { baseName: parts[0] };
  }
  return {};
}

// Helper to safely send messages (avoids "Extension context invalidated" errors)
// Helper to safely send messages (avoids "Extension context invalidated" errors)
function safeSendMessage(message) {
  try {
    if (chrome.runtime && !!chrome.runtime.getManifest()) {
      chrome.runtime.sendMessage(message).catch(err => {
        // Ignore errors about closed connection which happen during reload
      });
    }
  } catch (e) {
    // Context invalidated - fail silently
    // This happens when the extension is reloaded but the old content script is still running
  }
}

function extractAndStoreIds(url) {
  const match = url.match(/airtable\.com\/(app\w+)?(?:.*?\/(tbl\w+))?(?:.*?\/(viw\w+))?(?:.*?(fld\w+))?(?:.*?(rec\w+))?/);
  if (match) {
    const ids = {
      "Base ID": match[1] || "",
      "Table ID": match[2] || "",
      "View ID": match[3] || "",
      "Field ID": match[4] || "",
      "Record ID": match[5] || ""
    };

    // Check if we actually found anything meaningful
    const count = Object.values(ids).filter(Boolean).length;
    if (count > 0) {
      const names = parseNames();

      // Send to background to handle storage and history
      safeSendMessage({
        type: "newAirtableIds",
        data: ids,
        names: names,
        url: url
      });

      // Update badge
      safeSendMessage({ type: "updateBadge", count });
    }
  }
}

// 1. Initial Extraction
let lastUrl = location.href;
extractAndStoreIds(lastUrl);

// 2. Observe URL changes (SPA navigation)
// We use a combination of MutationObserver on body (legacy fallback) and standard methods
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    extractAndStoreIds(url);
  }
}).observe(document, { subtree: true, childList: true });

// 3. Observe Title Changes
// (Important: Titles often load *after* the URL change in Airtable)
const titleObserver = new MutationObserver(() => {
  // When title changes, re-run extraction for the current URL
  // This allows us to "backfill" the names if they weren't ready on initial load
  extractAndStoreIds(location.href);
});
if (document.querySelector('title')) {
  titleObserver.observe(document.querySelector('title'), { childList: true });
} else {
  // Fallback if <title> node doesn't exist yet (rare)
  const docObserver = new MutationObserver((mutations) => {
    const title = document.querySelector('title');
    if (title) {
      titleObserver.observe(title, { childList: true });
      docObserver.disconnect();
    }
  });
  docObserver.observe(document, { childList: true, subtree: true });
}

// 4. History API Interceptors
const pushState = history.pushState;
history.pushState = function () {
  pushState.apply(history, arguments);
  window.dispatchEvent(new Event('locationchange'));
};
const replaceState = history.replaceState;
history.replaceState = function () {
  replaceState.apply(history, arguments);
  window.dispatchEvent(new Event('locationchange'));
};
window.addEventListener('popstate', () => window.dispatchEvent(new Event('locationchange')));
window.addEventListener('locationchange', () => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    extractAndStoreIds(url);
  }
});