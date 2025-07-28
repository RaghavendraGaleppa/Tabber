let isNavigatorOpen = false;
let navigatorEl = null;
let currentTabs = [];
let currentPage = 0;
const TABS_PER_PAGE = 10;
const HINT_CHARS = '1234567890qwertyuiopasdfghjkl'.split('');

// A single, robust handler for all keyboard input when the navigator is open.
const handleKeyDown = (event) => {
    if (!isNavigatorOpen) return;

    event.preventDefault();
    event.stopImmediatePropagation();

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

    const keyAsHint = event.key.toLowerCase();
    const hintIndex = HINT_CHARS.indexOf(keyAsHint);
    
    const pageStartIndex = currentPage * TABS_PER_PAGE;
    const pageEndIndex = pageStartIndex + TABS_PER_PAGE;

    if (hintIndex >= pageStartIndex && hintIndex < pageEndIndex) {
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
        
        const hintCharIndex = (currentPage * TABS_PER_PAGE) + index;
        const hintChar = HINT_CHARS[hintCharIndex] || '';

        const favIconUrl = tab.favIconUrl || chrome.runtime.getURL("icon128.png");

        // --- CHANGE --- Add the close button to the HTML structure
        li.innerHTML = `
            <span class="tab-hint">${hintChar.toUpperCase()}</span>
            <img class="tab-favicon" src="${favIconUrl}" />
            <span class="tab-title">${tab.title}</span>
            <button class="close-tab-btn" data-tab-id="${tab.id}">&times;</button>
        `;
        // --- END CHANGE ---

        // Main click listener for the row (to switch tabs)
        li.addEventListener('click', (e) => {
             // Only switch if the click was not on the close button
             if (e.target.className !== 'close-tab-btn') {
                chrome.runtime.sendMessage({ action: 'switchToTab', tabId: tab.id });
                closeNavigator();
             }
        });

        listEl.appendChild(li);
    });
    
    // --- NEW --- Add event listeners for all close buttons after they are created
    listEl.querySelectorAll('.close-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the li click event from firing
            const tabIdToClose = parseInt(e.target.dataset.tabId);
            chrome.runtime.sendMessage({ action: 'closeTab', tabId: tabIdToClose });
            
            // To refresh the list, we simply re-open the navigator
            closeNavigator();
            setTimeout(openNavigator, 50); // A small delay to allow the tab to close
        });
    });
    // --- END NEW ---

    const footerEl = navigatorEl.querySelector('#tab-navigator-footer');
    const totalPages = Math.ceil(currentTabs.length / TABS_PER_PAGE);
    footerEl.innerHTML = `
        <button id="prev-page-btn" class="page-button">&lt; Prev</button>
        <span class="page-info">Page ${currentPage + 1} of ${totalPages || 1}</span>
        <button id="next-page-btn" class="page-button">Next &gt;</button>
    `;

    footerEl.querySelector('#prev-page-btn').addEventListener('click', () => {
        currentPage = (currentPage - 1 + totalPages) % totalPages;
        renderNavigatorContent();
    });

    footerEl.querySelector('#next-page-btn').addEventListener('click', () => {
        currentPage = (currentPage + 1) % totalPages;
        renderNavigatorContent();
    });
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