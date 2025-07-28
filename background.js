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

// 2. Listen for messages coming from other parts of our extension.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // If the content script is asking for the list of tabs...
  if (request.action === "getTabs") {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      sendResponse({ tabs: tabs });
    });
    return true;
  }
  
  // If the content script wants to switch to a specific tab...
  if (request.action === "switchToTab") {
    const tabId = request.tabId;
    chrome.tabs.update(tabId, { active: true });
    chrome.tabs.get(tabId, (tab) => {
        if(tab.windowId) {
            chrome.windows.update(tab.windowId, { focused: true });
        }
    });
  }

  // If the content script wants to close a tab...
  if (request.action === "closeTab") {
    chrome.tabs.remove(request.tabId);
  }

  // If the content script wants to pin or unpin a tab...
  if (request.action === "togglePin") {
    chrome.tabs.update(request.tabId, { pinned: request.pinnedState });
  }

  // If the content script wants the page's zoom factor...
  if (request.action === "getZoom") {
    // Make sure the message is coming from a tab before proceeding
    if (sender.tab && sender.tab.id) {
        chrome.tabs.getZoom(sender.tab.id, (zoomFactor) => {
            sendResponse({ zoomFactor: zoomFactor });
        });
        return true; // Required for async response
    }
  }
});