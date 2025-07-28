// --- Event Listeners ---

// 1. Listen for the keyboard shortcut we defined in manifest.json.
chrome.commands.onCommand.addListener((command) => {
  // Check if it's our command.
  if (command === "toggle-navigator") {
    // Find the currently active tab.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        // Send a message to the content.js script on that page.
        // This is like saying, "Hey, time to show the menu!"
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggleNavigator" });
      }
    });
  }
});

// 2. Listen for messages coming from other parts of our extension (mainly content.js).
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // If the content script is asking for the list of tabs...
  if (request.action === "getTabs") {
    // Get all tabs in the current window. The default order is the visual tab order.
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      // Send the tabs array directly back to the content script.
      sendResponse({ tabs: tabs });
    });
    return true; // Important: tells Chrome we will send a response later.
  }
  
  // If the content script wants to switch to a specific tab...
  if (request.action === "switchToTab") {
    // Get the tab's ID from the request.
    const tabId = request.tabId;
    // Tell the browser to make that tab active.
    chrome.tabs.update(tabId, { active: true });
    // Also focus the window that the tab is in.
    chrome.tabs.get(tabId, (tab) => {
        if(tab.windowId) {
            chrome.windows.update(tab.windowId, { focused: true });
        }
    });
  }

  // --- NEW --- If the content script wants to close a tab...
  if (request.action === "closeTab") {
    chrome.tabs.remove(request.tabId);
  }
  // --- END NEW ---
});