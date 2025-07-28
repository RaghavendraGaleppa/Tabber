let isNavigatorOpen = false;
let navigatorEl = null;
let currentTabs = [];
let currentPage = 0;
const TABS_PER_PAGE = 10;
const HINT_CHARS = '1234567890qwertyuiopasdfghjkl'.split('');

// This function handles all keyboard input when the navigator is open.
const handleKeyDown = (event) => {
    // If the navigator isn't open, do nothing.
    if (!isNavigatorOpen) return;

    // Prevent the key press from affecting the page underneath.
    event.preventDefault();
    event.stopPropagation();

    // Close the navigator if Escape is pressed.
    if (event.key === 'Escape') {
        closeNavigator();
        return;
    }
    
    // Handle pagination with Tab and Shift+Tab.
    if (event.key === 'Tab') {
        const totalPages = Math.ceil(currentTabs.length / TABS_PER_PAGE);
        if (event.shiftKey) {
            // Go to the previous page.
            currentPage = (currentPage - 1 + totalPages) % totalPages;
        } else {
            // Go to the next page.
            currentPage = (currentPage + 1) % totalPages;
        }
        renderNavigatorContent();
        return;
    }

    // Check if the pressed key is one of our hint characters.
    const hintIndex = HINT_CHARS.indexOf(event.key.toLowerCase());
    if (hintIndex >= 0 && hintIndex < TABS_PER_PAGE) {
        const tabIndexOnPage = hintIndex;
        const overallTabIndex = (currentPage * TABS_PER_PAGE) + tabIndexOnPage;

        // If that tab exists, switch to it.
        if (overallTabIndex < currentTabs.length) {
            chrome.runtime.sendMessage({ action: 'switchToTab', tabId: currentTabs[overallTabIndex].id });
            closeNavigator();
        }
    }
};

// This function draws the list of tabs inside the modal.
const renderNavigatorContent = () => {
    if (!navigatorEl) return;

    const listEl = navigatorEl.querySelector('ul');
    listEl.innerHTML = ''; // Clear the list before redrawing.

    const startIndex = currentPage * TABS_PER_PAGE;
    const endIndex = startIndex + TABS_PER_PAGE;
    const pageTabs = currentTabs.slice(startIndex, endIndex);

    // Create a list item for each tab on the current page.
    pageTabs.forEach((tab, index) => {
        const li = document.createElement('li');
        const hintChar = HINT_CHARS[index] || '';

        // Use a default icon if the tab's favicon is not available.
        const favIconUrl = tab.favIconUrl || chrome.runtime.getURL("icon128.png");

        li.innerHTML = `
            <span class="tab-hint">${hintChar.toUpperCase()}</span>
            <img class="tab-favicon" src="${favIconUrl}" />
            <span class="tab-title">${tab.title}</span>
        `;

        // Allow clicking on a tab as well.
        li.addEventListener('click', () => {
             chrome.runtime.sendMessage({ action: 'switchToTab', tabId: tab.id });
             closeNavigator();
        });

        listEl.appendChild(li);
    });
    
    // Update the page number in the footer.
    const footerEl = navigatorEl.querySelector('#tab-navigator-footer');
    const totalPages = Math.ceil(currentTabs.length / TABS_PER_PAGE);
    footerEl.innerHTML = `<span>Page ${currentPage + 1} of ${totalPages || 1}</span>`;
};

// This function creates and displays the main navigator modal.
const openNavigator = () => {
    if (isNavigatorOpen) return;
    
    // Ask the background script for the list of tabs.
    chrome.runtime.sendMessage({ action: 'getTabs' }, (response) => {
        if (!response || !response.tabs) {
            console.error("Tab Navigator: Could not get tabs from background script.");
            return;
        }

        currentTabs = response.tabs;
        currentPage = 0;
        isNavigatorOpen = true;

        // Create the modal element.
        navigatorEl = document.createElement('div');
        navigatorEl.id = 'tab-navigator-modal';
        navigatorEl.innerHTML = `
            <ul></ul>
            <div id="tab-navigator-footer"></div>
        `;
        document.body.appendChild(navigatorEl);
        
        // Draw the content inside the modal.
        renderNavigatorContent();

        // Start listening for keyboard events.
        document.addEventListener('keydown', handleKeyDown, true);
    });
};

// This function removes the modal and stops listening for events.
const closeNavigator = () => {
    if (!isNavigatorOpen) return;
    isNavigatorOpen = false;
    
    // Stop listening for keyboard events.
    document.removeEventListener('keydown', handleKeyDown, true);
    
    // Remove the modal from the page.
    if (navigatorEl) {
        navigatorEl.remove();
        navigatorEl = null;
    }
};

// Listen for the "toggle" message from the background script.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleNavigator') {
        // If the navigator is open, close it. Otherwise, open it.
        isNavigatorOpen ? closeNavigator() : openNavigator();
    }
});
