// eOffice Suite — Chrome Extension Background Service Worker

const APP_PAGES = {
  edocs: 'apps/edocs.html',
  enotes: 'apps/enotes.html',
  esheets: 'apps/esheets.html',
  eslides: 'apps/eslides.html',
  email: 'apps/email.html',
  edb: 'apps/edb.html',
  edrive: 'apps/edrive.html',
  econnect: 'apps/econnect.html',
  eforms: 'apps/eforms.html',
  esway: 'apps/esway.html',
  eplanner: 'apps/eplanner.html',
  'eosim-play': 'apps/eosim-play.html',
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'eoffice-root',
    title: 'eOffice Suite',
    contexts: ['page', 'selection'],
  });

  const quickApps = [
    { id: 'ctx-edocs', title: '📝 New Document', app: 'edocs' },
    { id: 'ctx-enotes', title: '📒 New Note', app: 'enotes' },
    { id: 'ctx-email', title: '✉️ Open eMail', app: 'email' },
    { id: 'ctx-esheets', title: '📊 New Spreadsheet', app: 'esheets' },
  ];

  quickApps.forEach((item) => {
    chrome.contextMenus.create({
      id: item.id,
      parentId: 'eoffice-root',
      title: item.title,
      contexts: ['page', 'selection'],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  const appMap = {
    'ctx-edocs': 'edocs',
    'ctx-enotes': 'enotes',
    'ctx-email': 'email',
    'ctx-esheets': 'esheets',
  };
  const appId = appMap[info.menuItemId];
  if (appId) {
    openAppTab(appId);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'openApp') {
    openAppTab(message.app);
    sendResponse({ ok: true });
  } else if (message.type === 'updateRecent') {
    updateRecent(message.app);
    sendResponse({ ok: true });
  }
  return true;
});

function openAppTab(appId) {
  const page = APP_PAGES[appId];
  if (page) {
    chrome.tabs.create({ url: chrome.runtime.getURL(page) });
  }
}

async function updateRecent(appId) {
  try {
    const data = await chrome.storage.local.get('recentApps');
    const recent = data.recentApps || [];
    const filtered = recent.filter((id) => id !== appId);
    filtered.unshift(appId);
    await chrome.storage.local.set({
      recentApps: filtered.slice(0, 5),
    });
  } catch (e) {
    console.warn('Failed to update recent apps:', e);
  }
}
