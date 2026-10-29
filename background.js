// background.js - Service worker quản lý vòng đời và cấp quyền truy cập CVAT
// Tác giả: taquanglocit-tech

importScripts('register.js');

chrome.runtime.onInstalled.addListener(() => { syncContentScripts(); });
chrome.runtime.onStartup.addListener(() => { syncContentScripts(); });
chrome.permissions.onRemoved.addListener(() => { syncContentScripts(); });

async function updateTabBadge(tabId, url) {
  if (!tabId || !url) return;
  let origin = null;
  try { origin = new URL(url).origin; } catch { return; }
  const origins = await getOrigins();
  const active = origins.includes(origin) && await chrome.permissions.contains({ origins: [originToPermission(origin)] });
  if (active) {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#177ddc' }).catch(() => {});
    await chrome.action.setBadgeText({ tabId, text: 'PRO' }).catch(() => {});
  } else {
    await chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab?.url) {
    updateTabBadge(tabId, tab.url);
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'getOrigins') {
    getOrigins().then((origins) => sendResponse({ origins }));
    return true;
  }
  return false;
});
