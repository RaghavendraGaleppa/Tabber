let isNavigatorOpen = false;
let navigatorEl = null;
let currentTabs = [];
let currentPage = 0;
const TABS_PER_PAGE = 10;
const HINT_CHARS = '1234567890qwertyuiopasdfghjkl'.split('');

// This function handles all keyboard input when the navigator is open.
const handleKeyDown = (event) => {
    if (!isNavigatorOpen) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.key === 'Escape') {
        closeNavigator();
        return;
    }
    
    if (event.key === 'Tab') {
        const totalPages = Math.ceil(currentTabs.length / TABS_PER_PAGE);
        if (event.shiftKey) {
            currentPage = (currentPage - 1 + totalPages) % totalPages;
        } else {
            currentPage = (currentPage + 1) % totalPages;
        }
        renderNavigatorContent();
        return;
    }

    // This part is tricky: we need to find which hint character was pressed.
    // The 'q' key could be a hint, but so could 'Q' if Caps Lock is on.
    const keyAsHint = event.key.toLowerCase();
    const hintIndex = HINT_CHARS.indexOf(keyAsHint);

    // We only care about hints that are on the CURRENT page.
    // For page 1 (currentPage=0), this is hints 0-9.
    // For page 2 (currentPage=1), this is hints 10-19.
    const pageStartIndex = currentPage * TABS_PER_PAGE;
    const pageEndIndex = pageStartIndex + TABS_PER_PAGE;

    if (hintIndex >= pageStartIndex && hintIndex < pageEndIndex) {
        // Find the overall tab index from the hint index.
        const overallTabIndex = hintIndex;
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
    listEl.innerHTML = '';

    const startIndex = currentPage * TABS_PER_PAGE;
    const endIndex = startIndex + TABS_PER_PAGE;
    const pageTabs = currentTabs.slice(startIndex, endIndex);

    pageTabs.forEach((tab, index) => {
        const li = document.createElement('li');
        
        // --- THIS IS THE FIX ---
        // Calculate the correct index into the HINT_CHARS array.
        const hintCharIndex = (currentPage * TABS_PER_PAGE) + index;
        const hintChar = HINT_CHARS[hintCharIndex] || '';
        // --- END OF FIX ---

        const favIconUrl = tab.favIconUrl || chrome.runtime.getURL("icon128.png");

        li.innerHTML = `
            <span class="tab-hint">${hintChar.toUpperCase()}</span>
            <img class="tab-favicon" src="${favIconUrl}" />
            <span class="tab-title">${tab.title}</span>
        `;

        li.addEventListener('click', () => {
             chrome.runtime.sendMessage({ action: 'switchToTab', tabId: tab.id });
             closeNavigator();
        });

        listEl.appendChild(li);
    });
    
    const footerEl = navigatorEl.querySelector('#tab-navigator-footer');
    const totalPages = Math.ceil(currentTabs.length / TABS_PER_PAGE);
    footerEl.innerHTML = `<span>Page ${currentPage + 1} of ${totalPages || 1}</span>`;
};

// This function creates and displays the main navigator modal.
const openNavigator = () => {
    if (isNavigatorOpen) return;
    
    chrome.runtime.sendMessage({ action: 'getTabs' }, (response) => {
        if (!response || !response.tabs) {
            console.error("Tab Navigator: Could not get tabs from background script.");
            return;
        }
        currentTabs = response.tabs;
        currentPage = 0;
        isNavigatorOpen = true;
        navigatorEl = document.createElement('div');
        navigatorEl.id = 'tab-navigator-modal';
        navigatorEl.innerHTML = `<ul></ul><div id="tab-navigator-footer"></div>`;
        document.body.appendChild(navigatorEl);
        renderNavigatorContent();
        document.addEventListener('keydown', handleKeyDown, true);
    });
};

// This function removes the modal and stops listening for events.
const closeNavigator = () => {
    if (!isNavigatorOpen) return;
    isNavigatorOpen = false;
    document.removeEventListener('keydown', handleKeyDown, true);
    if (navigatorEl) {
        navigatorEl.remove();
        navigatorEl = null;
    }
};

// Listen for the "toggle" message from the background script.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleNavigator') {
        isNavigatorOpen ? closeNavigator() : openNavigator();
    }
});
