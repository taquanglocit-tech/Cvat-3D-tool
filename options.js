// options.js - Quản lý cài đặt Origin máy chủ CVAT
// Tác giả: taquanglocit-tech

const $url = document.getElementById('url');
const $list = document.getElementById('list');
const $msg = document.getElementById('msg');
const $help = document.getElementById('help');

function showMessage(text, isOk = true) {
  $msg.textContent = text;
  $msg.className = isOk ? 'ok' : 'bad';
}

async function renderOrigins() {
  const origins = await getOrigins();
  $list.innerHTML = '';
  if (!origins.length) {
    $list.innerHTML = '<li style="color: #8b949e; justify-content: center;">Chưa có máy chủ CVAT nào. Vui lòng thêm URL ở trên.</li>';
    return;
  }

  for (const origin of origins) {
    const granted = await chrome.permissions.contains({ origins: [originToPermission(origin)] });
    const li = document.createElement('li');
    
    const label = document.createElement('span');
    label.innerHTML = `<b style="color: #58a6ff;">${origin}</b> <span style="margin-left: 10px; font-size: 13px;" class="${granted ? 'ok' : 'bad'}">${granted ? '✔ Tự động kích hoạt' : '● Cần bấm icon để bật'}</span>`;
    
    const actions = document.createElement('span');
    if (!granted) {
      const grantBtn = document.createElement('button');
      grantBtn.textContent = 'Cấp quyền tự động';
      grantBtn.style.marginRight = '8px';
      grantBtn.onclick = () => addOrigin(origin);
      actions.append(grantBtn);
    }

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Xoá';
    delBtn.style.color = '#f85149';
    delBtn.onclick = () => removeOrigin(origin);
    actions.append(delBtn);

    li.append(label, actions);
    $list.append(li);
  }
}

async function addOrigin(raw) {
  let origin;
  try {
    origin = normalizeOrigin(raw);
  } catch (e) {
    showMessage(`URL không hợp lệ: ${e.message}`, false);
    return;
  }

  let granted = false;
  try {
    granted = await chrome.permissions.request({ origins: [originToPermission(origin)] });
  } catch (e) {
    showMessage(`Chrome từ chối cấp quyền: ${e.message}`, false);
    $help.hidden = false;
    return;
  }

  const origins = await getOrigins();
  if (!origins.includes(origin)) origins.push(origin);
  await chrome.storage.local.set({ origins });
  await syncContentScripts();

  if (!granted) {
    showMessage(`Đã lưu ${origin}. Hãy mở trang CVAT và bấm icon extension để kích hoạt.`, false);
    $help.hidden = false;
  } else {
    $help.hidden = true;
    showMessage(`Đã cấu hình thành công: ${origin}. Mở hoặc tải lại trang CVAT để sử dụng!`);
  }

  $url.value = '';
  renderOrigins();
}

async function removeOrigin(origin) {
  const origins = (await getOrigins()).filter((o) => o !== origin);
  await chrome.storage.local.set({ origins });
  await chrome.permissions.remove({ origins: [originToPermission(origin)] }).catch(() => {});
  await syncContentScripts();
  showMessage(`Đã xoá ${origin}.`);
  renderOrigins();
}

document.getElementById('add').onclick = () => addOrigin($url.value);
$url.addEventListener('keydown', (e) => { if (e.key === 'Enter') addOrigin($url.value); });
renderOrigins();
