//Core background logic for the productivity Chrome extension (Manifest V3)

//-------------------- Defaults --------------------

// List of websites blocked by default
const DEFAULT_BLOCKED_SITES: string[] = [
  'youtube.com',
  'facebook.com',
  'instagram.com',
  'x.com'
];

//-------------------- Storage Helpers --------------------

//Retrieve the list of blocked sites from Chrome storage.
//If it is not set, return the default list.
async function getBlockedSites(): Promise<string[]> {
  const settings = await chrome.storage.sync.get({
    blockedSites: DEFAULT_BLOCKED_SITES
  }) as { blockedSites: string[] };

  return settings.blockedSites;
}

//Create regex patterns for a domain
function createBlockedSiteRegex(domains: string[]) {
  return domains.map(domain => ({
    domain,
    regex: `^https?://([^/]*\\.)?${domain.replace(/\./g, '\\.')}`
  }));
}

//-------------------- Declarative Blocking --------------------

//Apply or remove blocking rules
async function updateBlockingRules(blockSites: boolean): Promise<void> {
  //Retrieve all existing dynamic rules
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingRuleIds = existingRules.map(rule => rule.id);

  //Remove them before adding new ones
  if (existingRuleIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds
    });
  }

  //If blocking is disabled, stop here
  if (!blockSites) return;

  const sites = await getBlockedSites();
  const blockedPageUrl = chrome.runtime.getURL('pages/blocked.html');
  const blockedSitesWithRegex = createBlockedSiteRegex(sites);

  //Build new blocking rules
  const rules: chrome.declarativeNetRequest.Rule[] =
    blockedSitesWithRegex.map((site, index) => ({
      id: index + 1,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
        redirect: {
          url: `${blockedPageUrl}?url=${encodeURIComponent(site.domain)}`
        }
      },
      condition: {
        regexFilter: site.regex,
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.MAIN_FRAME
        ]
      }
    }));

  //Add the new rules
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rules
  });

  console.log(`Blocking rules updated (${rules.length} sites).`);
}

//-------------------- Navigation Fallback --------------------

//Event that triggers before any navigation occurs, allowing us to block sites that might not be caught by declarativeNetRequest
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  //Only block main frame navigation, not the iframes
  if (details.frameId !== 0) return;

  //Chrome storage values are typed as `unknown`, so we explicitly cast the result
  const settings = await chrome.storage.sync.get({
    blockSites: true
  }) as { blockSites: boolean };

  if (!settings.blockSites) return;

  const sites = await getBlockedSites();
  const blockedSitesWithRegex = createBlockedSiteRegex(sites);

  const matchedSite = blockedSitesWithRegex.find(site =>
    new RegExp(site.regex).test(details.url)
  );

  if (matchedSite) {
    const blockedPageUrl = chrome.runtime.getURL('pages/blocked.html');
    chrome.tabs.update(details.tabId, {
      url: `${blockedPageUrl}?url=${encodeURIComponent(details.url)}`
    });

    console.log('Blocked manually:', details.url);
  }
});

//-------------------- Lifecycle Events --------------------

//Initialize blocking rules on install or update
chrome.runtime.onInstalled.addListener(async () => {
  const settings = await chrome.storage.sync.get({
    blockSites: true
  }) as { blockSites: boolean };

  updateBlockingRules(settings.blockSites);
});

//Initialize blocking rules when Chrome starts
chrome.runtime.onStartup.addListener(async () => {
  const settings = await chrome.storage.sync.get({
    blockSites: true
  }) as { blockSites: boolean };

  updateBlockingRules(settings.blockSites);
});

//-------------------- Storage Change Listener --------------------

//React to changes made from the popup
chrome.storage.onChanged.addListener((changes, areaName) => {
  //Sync is the area where our settings are stored, so we ignore changes from other areas
  if (areaName !== 'sync') return;

  //Update blocking rules if blockSites setting changes
  if (changes.blockSites) {
    updateBlockingRules(changes.blockSites.newValue as boolean);
  }

  //If the list of blocked sites changes, we update the rules
  if (changes.blockedSites) {
    chrome.storage.sync.get({ blockSites: true }, (settings) => {
      updateBlockingRules(settings.blockSites as boolean);
    });
  }
});
