// background.js - Service worker quản lý vòng đời và cấp quyền truy cập CVAT
// Tác giả: taquanglocit-tech

importScripts('register.js');

chrome.runtime.onInstalled.addListener(() => { syncContentScripts(); });
chrome.runtime.onStartup.addListener(() => { syncContentScripts(); });
chrome.permissions.onRemoved.addListener(() => { syncContentScripts(); });

async function injectInto(tabId) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content/bridge-main.js'], world: 'MAIN' });
  await chrome.scripting.executeScript({ target: { tabId }, files: CONTENT_SCRIPT_FILES });
  await chrome.action.setBadgeBackgroundColor({ tabId, color: '#1f6feb' });
  await chrome.action.setBadgeText({ tabId, text: 'PRO' });
}

chrome.action.onClicked.addListener(async (tab) => {
  let origin = null;
  try { origin = new URL(tab.url).origin; } catch { /* Bỏ qua url không phải http/https */ }
  const origins = await getOrigins();
  const auto = origin && await chrome.permissions.contains({ origins: [originToPermission(origin)] });
  if (!origin || !origins.includes(origin) || auto) {
    chrome.runtime.openOptionsPage();
    return;
  }
  try {
    await injectInto(tab.id);
  } catch (e) {
    console.error('[CVAT Super Pro] Không kích hoạt được trên tab này:', e);
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'getOrigins') {
    getOrigins().then((origins) => sendResponse({ origins }));
    return true;
  }
  return false;
});
