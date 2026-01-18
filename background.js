// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["airtableIds", "history"], (result) => {
    if (!result.airtableIds) chrome.storage.local.set({ airtableIds: {} });
    if (!result.history) chrome.storage.local.set({ history: [] });
  });
});

// Helper to check if two ID sets are identical
function isSameIds(a, b) {
  if (!a || !b) return false;
  return (a["Base ID"] || a["App ID"]) === (b["Base ID"] || b["App ID"]) &&
    a["Table ID"] === b["Table ID"] &&
    a["View ID"] === b["View ID"] &&
    a["Record ID"] === b["Record ID"];
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Update Badge
  if (message.type === "updateBadge" && typeof message.count === "number") {
    chrome.action.setBadgeText({ text: message.count.toString() });
  }

  // Handle New IDs (Update Current & History)
  if (message.type === "newAirtableIds") {
    const newEntry = {
      ids: message.data,
      names: message.names || {},
      url: message.url,
      timestamp: Date.now()
    };

    chrome.storage.local.get(["history", "airtableIds"], (result) => {
      let history = result.history || [];
      const currentIds = result.airtableIds || {};

      // 1. Update 'Current' IDs logic
      chrome.storage.local.set({ airtableIds: message.data });

      // 2. History Management
      const lastEntry = history[0];

      // Helper to check if names have meaningful content
      const hasNames = (n) => n && (n.baseName || n.tableName || n.viewName);

      if (!lastEntry || !isSameIds(lastEntry.ids, message.data)) {
        // A. New State: Prepend new entry
        history.unshift(newEntry);
        if (history.length > 5) history = history.slice(0, 5);
        chrome.storage.local.set({ history });

      } else {
        // B. Same State: Check if we have new names to enrich the existing entry
        // (This happens when the page title loads a split second after the URL)
        if (hasNames(message.names) && !hasNames(lastEntry.names)) {
          // Update the existing latest entry with these new names
          lastEntry.names = message.names;
          // Also update timestamp to keep it "fresh"? Maybe not needed.
          chrome.storage.local.set({ history });
        }
      }
    });
  }
});