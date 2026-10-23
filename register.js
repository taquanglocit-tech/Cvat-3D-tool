// register.js - Bộ điều phối đăng ký Content Scripts linh hoạt theo Origin của CVAT
// Tác giả: taquanglocit-tech

const CONTENT_SCRIPT_ID = 'cvat-3d-super-pro';
const BRIDGE_SCRIPT_ID = 'cvat-3d-super-pro-bridge';

const CONTENT_SCRIPT_FILES = [
  'content/icons.js',
  'content/ui.js',
  'content/geom.js',
  'content/iou3d.js',
  'content/api.js',
  'content/bridge.js',
  'content/zip.js',
  'content/pcd.js',
  'content/store.js',
  'content/frames.js',
  'content/views.js',
  'content/case1.js',
  'content/case2.js',
  'content/case3.js',
  'content/context-menu.js',
  'content/hud.js',
  'content/hotkeys.js',
  'content/app.js',
];

function normalizeOrigin(raw) {
  const url = new URL(String(raw).trim());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Chỉ hỗ trợ giao thức http:// hoặc https://');
  }
  return url.origin;
}

function originToPermission(origin) {
  return `${origin}/*`;
}

async function getOrigins() {
  const { origins } = await chrome.storage.local.get('origins');
  return Array.isArray(origins) ? origins : [];
}

async function syncContentScripts() {
  const origins = await getOrigins();
  const granted = [];
  for (const origin of origins) {
    if (await chrome.permissions.contains({ origins: [originToPermission(origin)] })) {
      granted.push(origin);
    }
  }

  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [CONTENT_SCRIPT_ID, BRIDGE_SCRIPT_ID] });
  if (existing.length) {
    await chrome.scripting.unregisterContentScripts({ ids: existing.map((s) => s.id) });
  }
  if (!granted.length) return granted;

  const matches = [...new Set(granted.map(originToPermission))];
  await chrome.scripting.registerContentScripts([
    {
      id: CONTENT_SCRIPT_ID,
      matches,
      js: CONTENT_SCRIPT_FILES,
      runAt: 'document_idle',
      persistAcrossSessions: true,
    },
    {
      // Chạy trong ngữ cảnh trang (world: MAIN) để kết nối trực tiếp với window.cvatUI
      id: BRIDGE_SCRIPT_ID,
      matches,
      js: ['content/bridge-main.js'],
      world: 'MAIN',
      runAt: 'document_idle',
      persistAcrossSessions: true,
    },
  ]);
  return granted;
}
