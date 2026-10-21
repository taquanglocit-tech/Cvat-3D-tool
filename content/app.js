// app.js - Giao diện chính của CVAT 3D Super Pro (Shadow DOM, Toolbar Button, Tab Manager)
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});
  if (SP.booted) return;
  SP.booted = true;

  const { h } = SP.ui;

  const CSS = `
    :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    * { box-sizing: border-box; }
    .fab {
      position: fixed; left: 16px; bottom: 16px; z-index: 2147483000;
      font: 600 13px inherit; background: #1f6feb; color: #fff;
      border: 0; border-radius: 24px; padding: 10px 16px; cursor: pointer;
      box-shadow: 0 4px 14px rgba(0,0,0,0.45); display: flex; align-items: center; gap: 8px;
      transition: transform 0.15s, background 0.15s;
    }
    .fab:hover { background: #388bfd; transform: translateY(-2px); }
    .overlay {
      position: fixed; inset: 0; z-index: 2147483000; background: #0b0d11; color: #c9d1d9;
      display: flex; flex-direction: column; font-size: 13px; line-height: 1.4;
    }
    .bar {
      display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: #161b22;
      border-bottom: 1px solid #30363d; flex-wrap: wrap; flex-shrink: 0;
    }
    .title {
      font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px;
    }
    .badge {
      background: #21262d; border: 1px solid #30363d; color: #58a6ff; font-size: 11px;
      padding: 2px 8px; border-radius: 12px; font-weight: 600;
    }
    .tab {
      background: transparent; border: 0; border-bottom: 2px solid transparent; color: #8b949e;
      padding: 6px 12px; font: inherit; font-weight: 600; cursor: pointer; transition: color 0.15s;
    }
    .tab:hover { color: #c9d1d9; }
    .tab.active { color: #58a6ff; border-bottom-color: #58a6ff; }
    .grow { flex: 1; }
    .status { font-size: 12px; color: #8b949e; }
    .status.ok { color: #3fb950; }
    .status.err { color: #f85149; }
    button {
      background: #21262d; color: #c9d1d9; border: 1px solid #30363d; border-radius: 6px;
      padding: 4px 10px; font: inherit; cursor: pointer; font-size: 12px; font-weight: 500;
    }
    button:hover:not(:disabled) { background: #30363d; color: #fff; }
    button:disabled { opacity: 0.45; cursor: not-allowed; }
    button.primary { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 600; }
    button.primary:hover:not(:disabled) { background: #388bfd; }
    .body { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; background: #0d1117; }
    .modal-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center;
      justify-content: center; z-index: 100;
    }
    .modal-card {
      background: #161b22; border: 1px solid #30363d; border-radius: 8px; width: 90%; max-width: 900px;
      max-height: 90%; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    }
    .modal-head {
      display: flex; align-items: center; justify-content: space-between; padding: 10px 16px;
      border-bottom: 1px solid #30363d; font-weight: 600; color: #fff;
    }
    .modal-body { flex: 1; overflow: auto; padding: 16px; }
  `;

  const app = {
    tabs: {},
    currentTab: null,
    mounted: null,
    store: null,
    frames: null,
    history: [],
    redoHistory: [],
    settings: {
      sizeMode: 'bottom',
      allowTilt: false,
    },
  };
  SP.app = app;

  app.registerTab = (id, def) => { app.tabs[id] = def; };
  for (const [id, def] of SP.pendingTabs || []) app.registerTab(id, def);

  app.undo = () => {
    const ids = app.history.pop();
    if (!ids) return false;
    for (const id of ids) app.store.track(id)?.undo();
    app.redoHistory.push(ids);
    app.changed();
    return true;
  };

  app.redo = () => {
    const ids = app.redoHistory.pop();
    if (!ids) return false;
    for (const id of ids) app.store.track(id)?.redo();
    app.history.push(ids);
    app.changed();
    return true;
  };

  app.getFrames = () => {
    if (app.frames && app.frames.store.jid !== app.store.jid) {
      app.frames.dispose();
      app.frames = null;
    }
    if (!app.frames) app.frames = new SP.FrameData(app.store);
    app.frames.store = app.store;
    return app.frames;
  };

  // ---------- Giao diện Host & Launcher ----------
  let host, shadow, fab, overlay, statusEl, saveBtn, undoBtn, redoBtn, bodyEl, tabBtns = {};

  function setStatus(text, kind = '') {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = `status ${kind}`;
  }
  app.setStatus = setStatus;

  app.changed = () => {
    if (!app.store) return;
    const n = app.store.dirtyTracks().length;
    saveBtn.textContent = n ? `Lưu vào CVAT (${n} track)` : 'Lưu vào CVAT';
    saveBtn.disabled = !n;
    undoBtn.disabled = !app.history.length;
    redoBtn.disabled = !app.redoHistory.length;
    app.mounted?.refresh?.();
  };

  function jobIdFromUrl() {
    const m = /\/jobs\/(\d+)/.exec(location.pathname);
    return m ? Number(m[1]) : null;
  }

  function ensureHost() {
    if (host) return;
    host = h('div', { id: 'cvat-super-pro-root' });
    shadow = host.attachShadow({ mode: 'closed' });
    shadow.append(h('style', {}, CSS));
    fab = h('button', { class: 'fab', onclick: open, title: 'CVAT 3D Super Pro - taquanglocit-tech' }, '🚀 3D Super Pro');
    shadow.append(fab);

    for (const type of ['keydown', 'keyup', 'keypress']) {
      host.addEventListener(type, (e) => {
        if (overlay && type === 'keydown') onKey(e);
        e.stopPropagation();
      });
    }
    document.documentElement.append(host);
  }

  function onKey(e) {
    const k = e.key.toLowerCase();
    const typing = e.composedPath()[0]?.tagName === 'INPUT';
    if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); save(); return; }
    if (!typing && (e.ctrlKey || e.metaKey) && k === 'z' && !e.shiftKey) { e.preventDefault(); app.undo(); return; }
    if (!typing && (e.ctrlKey || e.metaKey) && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); app.redo(); return; }
    if (k === 'escape') { close(); return; }
    app.mounted?.onKey?.(e);
  }

  async function open() {
    const jid = jobIdFromUrl();
    if (!jid || overlay) return;

    overlay = h('div', { class: 'overlay', tabindex: '-1' });
    statusEl = h('span', { class: 'status' });
    saveBtn = h('button', { class: 'primary', onclick: save, disabled: true }, 'Lưu vào CVAT');
    undoBtn = h('button', { onclick: () => app.undo(), disabled: true, title: 'Ctrl+Z' }, '↶ Hoàn tác');
    redoBtn = h('button', { onclick: () => app.redo(), disabled: true, title: 'Ctrl+Y' }, '↷ Làm lại');
    bodyEl = h('div', { class: 'body' });
    tabBtns = {};

    const tabsEl = h('span', {}, Object.entries(app.tabs).map(([id, def]) => {
      tabBtns[id] = h('button', { class: 'tab', onclick: () => switchTab(id) }, def.title);
      return tabBtns[id];
    }));

    overlay.append(
      h('div', { class: 'bar' },
        h('span', { class: 'title' }, '🚀 CVAT 3D Pro', h('span', { class: 'badge' }, 'taquanglocit-tech')),
        tabsEl,
        h('span', { class: 'grow' }),
        statusEl,
        undoBtn, redoBtn,
        h('button', { onclick: reload, title: 'Đọc lại dữ liệu mới nhất từ RAM CVAT' }, '⟳ Tải lại'),
        saveBtn,
        h('button', { onclick: close }, '✕ Đóng')
      ),
      bodyEl
    );

    shadow.append(overlay);
    overlay.focus();

    app.store = new SP.JobStore(jid);
    app.history = [];
    app.redoHistory = [];
    setStatus('Đang nạp dữ liệu từ CVAT…');

    try {
      await app.store.load();
      setStatus(`● LIVE · Sẵn sàng (${app.store.tracks.size} tracks)`, 'ok');
      const firstTab = Object.keys(app.tabs)[0];
      if (firstTab) switchTab(firstTab);
    } catch (err) {
      setStatus(`Lỗi kết nối CVAT: ${err.message}`, 'err');
    }
  }

  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    app.mounted?.unmount?.();
    app.mounted = null;
  }

  function switchTab(id, ...args) {
    if (!app.tabs[id]) return;
    app.currentTab = id;
    for (const [k, btn] of Object.entries(tabBtns)) {
      btn.classList.toggle('active', k === id);
    }
    bodyEl.replaceChildren();
    app.mounted?.unmount?.();
    app.mounted = app.tabs[id].mount(app, bodyEl, ...args);
  }
  app.switchTab = switchTab;

  async function save() {
    if (!app.store) return;
    saveBtn.disabled = true;
    setStatus('Đang ghi vào RAM & bấm Save của CVAT…');
    try {
      const res = await app.store.save();
      setStatus(`Đã lưu ${res.saved} track qua Save gốc CVAT lúc ${new Date().toLocaleTimeString()}`, 'ok');
      app.changed();
    } catch (err) {
      setStatus(`Lỗi khi lưu: ${err.message}`, 'err');
      saveBtn.disabled = false;
    }
  }

  async function reload() {
    if (!app.store) return;
    setStatus('Đang tải lại dữ liệu từ CVAT…');
    await app.store.load();
    app.changed();
    setStatus('Đã làm mới dữ liệu.', 'ok');
  }

  // Tích hợp nút bấm trực tiếp vào thanh công cụ Header của CVAT
  function makeToolbarButton() {
    const el = document.createElement('div');
    el.className = 'cvat-super-pro-toolbar-btn';
    el.style.cssText = 'display: inline-flex; align-items: center; margin-right: 8px;';
    const sr = el.attachShadow({ mode: 'closed' });
    sr.innerHTML = `
      <style>
        button {
          background: #1f6feb; color: #fff; border: 0; border-radius: 4px; padding: 4px 10px;
          font: 600 12px system-ui, sans-serif; cursor: pointer; display: flex; align-items: center; gap: 6px;
        }
        button:hover { background: #388bfd; }
      </style>
      <button title="Mở CVAT 3D Super Pro (taquanglocit-tech)">
        <span>🚀 3D Pro</span>
      </button>`;
    sr.querySelector('button').addEventListener('click', open);
    return el;
  }

  let toolbarHost = null;
  function placeLauncher() {
    ensureHost();
    const onJob = !!jobIdFromUrl() && !overlay;
    const group = document.querySelector('.cvat-annotation-header-right-group');
    if (onJob && group) {
      toolbarHost ||= makeToolbarButton();
      if (group.firstChild !== toolbarHost) group.insertBefore(toolbarHost, group.firstChild);
      toolbarHost.style.display = 'inline-flex';
      fab.style.display = 'none';
    } else {
      if (toolbarHost) toolbarHost.style.display = 'none';
      fab.style.display = onJob ? '' : 'none';
    }
  }

  chrome.runtime.sendMessage({ type: 'getOrigins' }, (res) => {
    if (chrome.runtime.lastError) return;
    const origins = (res && res.origins) || [];
    if (!origins.includes(location.origin)) return;
    placeLauncher();
    setInterval(placeLauncher, 800);
  });
})();
