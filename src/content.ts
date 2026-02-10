//Removes YouTube Shorts and sidebar recommendations

//-------------------- Functions --------------------

//Remove all YouTube Shorts from the feed
function removeShorts(): void {
  const removeElements = (): void => {
    //Select all <a> links containing "/shorts/" in their href
    //Then remove the closest video container (<ytd-rich-item-renderer>)
    document.querySelectorAll('a[href*="/shorts/"]').forEach((el) => {
      const parent = el.closest('ytd-rich-item-renderer');
      if (parent) {
        parent.remove();
      }
    });
    console.log('[Content Script] Shorts removed');
  };

  removeElements();

  //Observe DOM changes for dynamically loaded Shorts (scrolling), YouTube uses SPA navigation
  const observer: MutationObserver = new MutationObserver(removeElements);
  observer.observe(document.body, { childList: true, subtree: true });
}

//Remove YouTube sidebar recommendations
function removeSidebar(): void {
  const removeElements = (): void => {
    //Select the sidebar element (ytd-watch-next-secondary-results-renderer elements where id=#related)
    const sidebar = document.querySelector(
      '#related, ytd-watch-next-secondary-results-renderer'
    );
    if (sidebar) {
      sidebar.remove();
    }
    console.log('[Content Script] Sidebar removed');
  };

  removeElements();

  //Observe DOM changes for dynamically loaded sidebar (the user clicks on a video)
  const observer: MutationObserver = new MutationObserver(removeElements);
  observer.observe(document.body, { childList: true, subtree: true });
}

//-------------------- Lifecycle Events --------------------

//Get user settings from Chrome storage and apply the removals if enabled
chrome.storage.sync.get(
  { blockShorts: true, blockSidebar: true },
  (settings: { blockShorts: boolean; blockSidebar: boolean }) => {
    if (settings.blockShorts) removeShorts();
    if (settings.blockSidebar) removeSidebar();
    console.log('[Content Script] Settings applied:', settings);
  }
);
