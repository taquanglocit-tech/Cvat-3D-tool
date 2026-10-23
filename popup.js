// popup.js - Quản lý popup 1-chạm bật/tắt tiện ích trên domain hiện tại
// Tác giả: taquanglocit-tech

document.addEventListener('DOMContentLoaded', async () => {
  const originText = document.getElementById('originText');
  const statusBadge = document.getElementById('statusBadge');
  const toggleBtn = document.getElementById('toggleBtn');
  const injectBtn = document.getElementById('injectBtn');
  const openOptionsLink = document.getElementById('openOptionsLink');

  openOptionsLink.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) {
    originText.textContent = 'Không nhận diện được tab';
    toggleBtn.disabled = true;
    return;
  }

  let origin = null;
  try {
    const url = new URL(tab.url);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      origin = url.origin;
    }
  } catch { /* không hợp lệ */ }

  if (!origin) {
    originText.textContent = 'Trang này không hỗ trợ (chỉ http/https)';
    statusBadge.textContent = 'Không hỗ trợ';
    toggleBtn.disabled = true;
    return;
  }

  originText.textContent = origin;

  async function checkActive() {
    const origins = await getOrigins();
    const hasInStorage = origins.includes(origin);
    const hasPermission = await chrome.permissions.contains({ origins: [originToPermission(origin)] });
    return hasInStorage && hasPermission;
  }

  async function updateUI() {
    const isActive = await checkActive();
    if (isActive) {
      statusBadge.textContent = '● Đang hoạt động';
      statusBadge.className = 'status-badge active';
      toggleBtn.textContent = 'Tắt trên domain này';
      toggleBtn.className = '';
      injectBtn.style.display = 'inline-flex';
    } else {
      statusBadge.textContent = '○ Chưa kích hoạt';
      statusBadge.className = 'status-badge inactive';
      toggleBtn.textContent = 'Kích hoạt trên domain này';
      toggleBtn.className = 'primary';
      injectBtn.style.display = 'none';
    }
  }

  await updateUI();

  toggleBtn.addEventListener('click', async () => {
    const isActive = await checkActive();
    toggleBtn.disabled = true;

    try {
      if (!isActive) {
        // Yêu cầu cấp quyền cho domain hiện tại
        const granted = await chrome.permissions.request({ origins: [originToPermission(origin)] });
        if (!granted) {
          alert('Cần cấp quyền truy cập để tool có thể giao tiếp với trang CVAT này');
          toggleBtn.disabled = false;
          return;
        }

        const origins = await getOrigins();
        if (!origins.includes(origin)) {
          origins.push(origin);
          await chrome.storage.local.set({ origins });
        }
        await syncContentScripts();

        // Kích hoạt ngay vào tab hiện tại mà không cần F5
        try {
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/bridge-main.js'], world: 'MAIN' });
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: CONTENT_SCRIPT_FILES });
        } catch (e) {
          console.warn('[Popup] Kích hoạt trực tiếp:', e);
        }
      } else {
        // Tắt trên domain này
        let origins = await getOrigins();
        origins = origins.filter((o) => o !== origin);
        await chrome.storage.local.set({ origins });
        await syncContentScripts();
      }
    } finally {
      toggleBtn.disabled = false;
      await updateUI();
    }
  });

  injectBtn.addEventListener('click', async () => {
    injectBtn.disabled = true;
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/bridge-main.js'], world: 'MAIN' });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: CONTENT_SCRIPT_FILES });
      injectBtn.textContent = '✓ Đã kích hoạt lại!';
      setTimeout(() => { injectBtn.textContent = 'Tải lại / Kích hoạt lại ngay'; }, 1500);
    } catch (err) {
      alert(`Lỗi kích hoạt: ${err.message}`);
    } finally {
      injectBtn.disabled = false;
    }
  });
});
