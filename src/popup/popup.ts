//Manages the popup UI of the productivity extension: toggles features, manages blocked sites, and theme.

//-------------------- DOM Elements --------------------
const toggleShorts = document.querySelector<HTMLInputElement>('#toggleShorts');
const toggleSidebar = document.querySelector<HTMLInputElement>('#toggleSidebar');
const toggleSites = document.querySelector<HTMLInputElement>('#toggleSites');
const sitesManager = document.querySelector<HTMLDivElement>('#sitesManager');
const siteList = document.querySelector<HTMLDivElement>('#siteList');
const newSiteInput = document.querySelector<HTMLInputElement>('#newSite');
const addSiteButton = document.querySelector<HTMLButtonElement>('#addSite');
const themeToggle = document.querySelector<HTMLButtonElement>('#themeToggle');
const themeIcon = document.querySelector<HTMLImageElement>('#themeIcon');

//Default blocked sites if user hasn't added any
const DEFAULT_SITES = ['youtube.com', 'facebook.com', 'instagram.com', 'x.com'];

//-------------------- Types --------------------
interface PopupSettings {
  blockShorts: boolean;
  blockSidebar: boolean;
  blockSites: boolean;
  blockedSites: string[];
  theme: 'light' | 'dark';
}

//-------------------- Helpers --------------------

//Return the list of blocked sites from storage
async function getPopupBlockedSites(): Promise<string[]> {
  const res = await chrome.storage.sync.get({ blockedSites: DEFAULT_SITES }) as { blockedSites: string[] };
  return res.blockedSites;
}

//Save the list of blocked sites to storage
async function setBlockedSites(sites: string[]): Promise<void> {
  await chrome.storage.sync.set({ blockedSites: sites });
}

//Update theme icon based on current theme
function updateThemeIcon() {
  if (!themeIcon) return;
  const isLight = document.body.classList.contains('light-theme');
  themeIcon.src = chrome.runtime.getURL(isLight ? 'icons/sun.png' : 'icons/moon.png');
}

//-------------------- Initialization --------------------
async function initPopup() {
  if (!toggleShorts || !toggleSidebar || !toggleSites || !sitesManager || !siteList || !newSiteInput || !addSiteButton || !themeToggle) {
    console.error('Popup elements not found.');
    return;
  }

  //Load theme preference
  const themeRes = await chrome.storage.sync.get({ theme: 'dark' }) as { theme: 'light' | 'dark' };
  const isLight = themeRes.theme === 'light';
  document.body.classList.toggle('light-theme', isLight);
  updateThemeIcon();

  //Load toggles and blocked sites
  const settings = await chrome.storage.sync.get({
    blockShorts: true,
    blockSidebar: true,
    blockSites: true,
    blockedSites: DEFAULT_SITES
  }) as PopupSettings;

  toggleShorts.checked = settings.blockShorts;
  toggleSidebar.checked = settings.blockSidebar;
  toggleSites.checked = settings.blockSites;
  sitesManager.style.display = settings.blockSites ? 'block' : 'none';
  await renderSiteList(settings.blockedSites);

  //-------------------- Toggle Update --------------------

  themeToggle.addEventListener('click', async () => {
    document.body.classList.toggle('light-theme');
    const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
    await chrome.storage.sync.set({ theme });
    updateThemeIcon();
  });

  toggleShorts.addEventListener('change', async () => {
    await chrome.storage.sync.set({ blockShorts: toggleShorts.checked });
  });

  toggleSidebar.addEventListener('change', async () => {
    await chrome.storage.sync.set({ blockSidebar: toggleSidebar.checked });
  });

  toggleSites.addEventListener('change', async () => {
    await chrome.storage.sync.set({ blockSites: toggleSites.checked });
    sitesManager.style.display = toggleSites.checked ? 'block' : 'none';
  });

  //-------------------- Blocked Sites Management --------------------

  addSiteButton.addEventListener('click', async () => {
    const site = newSiteInput.value.trim().toLowerCase();
    if (!site) return;
    const cleanSite = site.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

    const blockedSites = await getPopupBlockedSites();
    if (!blockedSites.includes(cleanSite)) {
      const updatedSites = [...blockedSites, cleanSite];
      await setBlockedSites(updatedSites);
      await renderSiteList(updatedSites);
      newSiteInput.value = '';
    }
  });

  newSiteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addSiteButton.click();
  });
}

//-------------------- Render Blocked Sites --------------------
async function renderSiteList(sites: string[]) {
  if (!siteList) return;

  siteList.innerHTML = '';
  for (const site of sites) {
    const item = document.createElement('div');
    item.className = 'site-item';
    item.innerHTML = `
      <span>${site}</span>
      <button data-site="${site}">Remove</button>
    `;

    const removeBtn = item.querySelector('button');
    removeBtn?.addEventListener('click', async () => {
      const blockedSites = await getPopupBlockedSites();
      const updatedSites = blockedSites.filter(s => s !== site);
      await setBlockedSites(updatedSites);
      await renderSiteList(updatedSites);
    });

    siteList.appendChild(item);
  }
}

//-------------------- Run --------------------
initPopup();
