// app.js - Giao diện Ngăn kéo đáy giữ trạng thái (Persistent Bottom Drawer) chuẩn công nghiệp
// Thay thế hoàn toàn modal che kín màn hình bằng ngăn kéo neo đáy, giữ nguyên RAM 0ms delay
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});
  if (SP.booted) return;
  SP.booted = true;

  const { h } = SP.ui;

  const CSS = `
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      pointer-events: none !important;
    }
    * { box-sizing: border-box; }

    /* Launcher nút bấm gắn đáy màn hình (khi chưa mở drawer) */
    .mini-launcher {
      pointer-events: auto !important;
      position: fixed; left: 16px; bottom: 8px; z-index: 2147483000;
      font: 500 12px inherit; background: #161b22; color: #c9d1d9;
      border: 1px solid #30363d; border-radius: 6px; padding: 4px 10px; cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 6px;
      transition: background 0.15s, border-color 0.15s;
    }
    .mini-launcher:hover { background: #21262d; border-color: #58a6ff; color: #fff; }

    /* Ngăn kéo cố định đáy màn hình (Bottom Drawer) */
    .drawer {
      pointer-events: auto !important;
      position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483000;
      background: #141414; color: #d9d9d9; border-top: 1px solid #303030;
      display: flex; flex-direction: column; font-size: 12px; line-height: 1.4;
      box-shadow: 0 -8px 24px rgba(0,0,0,0.65);
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), left 0.15s, right 0.15s;
    }
    .drawer.collapsed {
      display: none !important;
    }

    /* Chế độ Né góc công cụ CVAT (để lộ ô Point Size, Camera & Arrow Controls ở góc dưới phải) */
    .drawer.offset-mode {
      left: 12px !important;
      right: 360px !important;
      bottom: 8px !important;
      border-radius: 6px !important;
      border: 1px solid #303030 !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.7) !important;
    }

    /* Chế độ Toàn màn hình (Fullscreen Studio) để chỉnh chuỗi frame chi tiết không bị che */
    .drawer.fullscreen {
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      height: 100vh !important;
      max-height: 100vh !important;
      border-radius: 0 !important;
      border-top: none !important;
      border: none !important;
      z-index: 2147483015 !important;
      box-shadow: none !important;
    }
    .drawer.fullscreen .drawer-splitter {
      display: none !important;
    }

    /* Thanh kéo điều chỉnh độ cao (Splitter handle) */
    .drawer-splitter {
      height: 5px; width: 100%; cursor: ns-resize; background: transparent;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    .drawer-splitter::after {
      content: ''; width: 36px; height: 3px; border-radius: 2px; background: #303030;
    }
    .drawer-splitter:hover::after, .drawer-splitter.dragging::after {
      background: #177ddc;
    }

    /* Hệ thống Design Tokens chuẩn Ant Design Dark cho toàn bộ Control bên trong Drawer */
    button, select, input {
      font: inherit;
      color: #d9d9d9;
    }
    button {
      background: #262626;
      color: #d9d9d9;
      border: 1px solid #434343;
      border-radius: 3px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: background 0.12s, border-color 0.12s, color 0.12s;
    }
    button:hover:not(:disabled) {
      background: #303030;
      border-color: #177ddc;
      color: #ffffff;
    }
    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    button.primary, button.tool-btn.primary {
      background: #177ddc;
      border-color: #177ddc;
      color: #ffffff;
      font-weight: 500;
    }
    button.primary:hover:not(:disabled), button.tool-btn.primary:hover:not(:disabled) {
      background: #3c9ae8;
      border-color: #3c9ae8;
    }
    button.danger {
      background: rgba(255, 77, 79, 0.08);
      border-color: #5c2223;
      color: #ff7875;
    }
    button.danger:hover:not(:disabled) {
      background: #a61d24;
      border-color: #ff4d4f;
      color: #ffffff;
    }
    button.small {
      padding: 1px 6px;
      font-size: 11px;
    }
    select, input[type="number"], input[type="text"] {
      background: #141414;
      color: #d9d9d9;
      border: 1px solid #434343;
      border-radius: 3px;
      padding: 2px 6px;
      font-size: 11px;
      outline: none;
      transition: border-color 0.15s;
    }
    select:focus, input[type="number"]:focus, input[type="text"]:focus {
      border-color: #177ddc;
    }
    input[type="checkbox"] {
      accent-color: #177ddc;
      cursor: pointer;
      margin: 0;
    }
    input[type="range"] {
      accent-color: #177ddc;
      cursor: pointer;
      vertical-align: middle;
    }
    label {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: #d9d9d9;
    }
    .divider {
      width: 1px;
      height: 16px;
      background: #303030;
      margin: 0 2px;
      display: inline-block;
      flex-shrink: 0;
    }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #141414; }
    ::-webkit-scrollbar-thumb { background: #303030; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #434343; }

    /* Thanh điều khiển chính của Drawer (Top Bar / Status Bar) */
    .bar {
      display: flex; align-items: center; gap: 8px; padding: 4px 12px; background: #1f1f1f;
      border-bottom: 1px solid #303030; flex-wrap: wrap; flex-shrink: 0; min-height: 32px;
      user-select: none;
    }
    .title {
      font-weight: 600; color: #fff; display: flex; align-items: center; gap: 6px; font-size: 12px;
      cursor: pointer;
    }
    .badge {
      background: #262626; border: 1px solid #434343; color: #177ddc; font-size: 10px;
      padding: 0px 6px; border-radius: 3px; font-weight: 500;
    }
    .tab {
      background: transparent; border: 0; border-bottom: 2px solid transparent; border-radius: 0; color: #8c8c8c;
      padding: 4px 10px; font: inherit; font-size: 11px; font-weight: 600; cursor: pointer; transition: color 0.15s;
      display: inline-flex; align-items: center; gap: 5px;
    }
    .tab:hover:not(:disabled) { background: transparent; border-color: transparent; color: #d9d9d9; }
    .tab.active { color: #177ddc; border-bottom-color: #177ddc; }
    .grow { flex: 1; }
    .status { font-size: 11px; color: #8c8c8c; display: inline-flex; align-items: center; gap: 4px; }
    .status.ok { color: #73d13d; }
    .status.err { color: #ff7875; }

    /* Nút bấm giao diện chuẩn CAD */
    button.tool-btn {
      background: #262626; color: #d9d9d9; border: 1px solid #434343; border-radius: 3px;
      padding: 2px 8px; font: inherit; cursor: pointer; font-size: 11px; font-weight: 500;
      display: inline-flex; align-items: center; gap: 4px; transition: background 0.1s, color 0.1s;
    }
    button.tool-btn:hover:not(:disabled) { background: #303030; color: #fff; border-color: #177ddc; }

    /* Vùng chứa nội dung tab */
    .body { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; background: #141414; }

    /* Đồ thị vận tốc mini (Sparkline) */
    .sparkline-box {
      display: inline-flex; align-items: center; gap: 6px; background: #141414;
      border: 1px solid #303030; border-radius: 3px; padding: 2px 6px; font-size: 10px;
    }
    .sparkline-canvas { cursor: crosshair; vertical-align: middle; }

    /* Modal phóng to ảnh Camera & Khung 3D chi tiết (Big View) */
    .modal {
      pointer-events: auto !important;
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.82); backdrop-filter: blur(4px);
      z-index: 2147483030; display: flex; flex-direction: column; padding: 16px; gap: 8px;
      font: 12px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #d9d9d9;
      outline: none;
    }
    .modal > .bar { border-radius: 4px; border: 1px solid #303030; }
    .modal .imgs {
      flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 10px; overflow: auto; padding: 4px; align-content: start; align-items: start;
    }
    .imgbox {
      position: relative; margin: 0; border: 1px solid #303030; border-radius: 4px;
      overflow: hidden; background: #000; transition: border-color 0.15s;
    }
    .imgbox:hover { border-color: #177ddc; }
    .imgbox img { width: 100%; height: auto; display: block; cursor: zoom-in; }
    .imgbox figcaption { padding: 4px 8px; color: #d9d9d9; font-size: 11px; background: #1f1f1f; }
    .imgbox .max {
      position: absolute; top: 6px; right: 6px; opacity: 0; transition: opacity 0.15s;
      background: rgba(31, 31, 31, 0.9); color: #fff; border: 1px solid #434343;
    }
    .imgbox:hover .max { opacity: 1; }
    .viewer {
      position: relative; flex: 1; min-height: 0; background: #000; border: 1px solid #303030;
      border-radius: 4px; overflow: hidden; cursor: grab; touch-action: none;
    }
    .viewer.dragging { cursor: grabbing; }
    .viewer canvas { position: absolute; inset: 0; }
    .zoomlbl { min-width: 48px; text-align: center; color: #d9d9d9; font-variant-numeric: tabular-nums; }
    .help { color: #8c8c8c; font-size: 11px; }
  `;

  const app = {
    tabs: {},
    currentTab: null,
    mounted: null,
    store: null,
    frames: null,
    history: [],
    redoHistory: [],
    isCollapsed: false,
    isFullscreen: false,
    isOffsetMode: true,
    drawerHeight: 360,
    currentTrackId: null,
    settings: {
      sizeMode: 'bottom',
      allowTilt: false,
    },
  };
  SP.app = app;

  app.registerTab = (id, def) => { app.tabs[id] = def; };
  for (const [id, def] of SP.pendingTabs || []) app.registerTab(id, def);

  app.snapshot = (ids) => {
    if (!app.store) return;
    const list = Array.isArray(ids) ? ids : [ids];
    for (const id of list) {
      const t = app.store.track(id);
      if (t) t.snapshot();
    }
    app.history.push(list);
    app.redoHistory = [];
    app.changed();
  };

  app.dropLastSnapshot = () => {
    const ids = app.history.pop();
    if (!ids) return;
    for (const id of ids) {
      const t = app.store?.track(id);
      if (t) t.undoStack.pop();
    }
    app.changed();
  };

  app.undo = () => {
    const ids = app.history.pop();
    if (!ids) return false;
    for (const id of ids) {
      const t = app.store?.track(id);
      if (t) {
        t.undo();
        app.store?.syncTrackToCvat(t);
      }
    }
    app.redoHistory.push(ids);
    app.changed();
    setStatus('Đã hoàn tác (Undo)', 'ok');
    return true;
  };

  app.redo = () => {
    const ids = app.redoHistory.pop();
    if (!ids) return false;
    for (const id of ids) {
      const t = app.store?.track(id);
      if (t) {
        t.redo();
        app.store?.syncTrackToCvat(t);
      }
    }
    app.history.push(ids);
    app.changed();
    setStatus('Đã làm lại (Redo)', 'ok');
    return true;
  };

  app.getFrames = () => {
    if (!app.store || !app.store.meta) return null;
    if (app.frames && app.frames.store?.jid !== app.store.jid) {
      app.frames.dispose?.();
      app.frames = null;
    }
    if (!app.frames) app.frames = new SP.FrameData(app.store);
    app.frames.store = app.store;
    return app.frames;
  };

  let host, shadow, launcherBtn, drawerEl, splitterEl, statusEl, saveBtn, undoBtn, redoBtn, fullscreenBtn, layoutBtn, collapseBtn, bodyEl, sparklineCanvas, tabBtns = {};

  function setStatus(text, kind = '') {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = `status ${kind}`;
  }
  app.setStatus = setStatus;

  app.changed = () => {
    if (!app.store) return;
    const n = app.store.dirtyTracks().length;
    saveBtn.innerHTML = '';
    saveBtn.append(SP.icons.save(12), n ? `Lưu CVAT (${n})` : 'Lưu CVAT');
    saveBtn.disabled = !n;
    undoBtn.disabled = !app.history.length;
    redoBtn.disabled = !app.redoHistory.length;
    renderSpeedSparkline();
    app.mounted?.refresh?.();
  };

  function jobIdFromUrl() {
    const m = /\/jobs\/(\d+)/.exec(location.pathname);
    return m ? Number(m[1]) : null;
  }

  // ---------- Vẽ Biểu đồ Vận tốc Mini (Speed Sparkline) ----------
  function renderSpeedSparkline() {
    if (!sparklineCanvas || !app.store) return;
    const ctx = sparklineCanvas.getContext('2d');
    const w = sparklineCanvas.width;
    const h = sparklineCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const track = app.currentTrackId ? app.store.track(app.currentTrackId) : null;
    if (!track || track.shapes.length < 2) {
      ctx.fillStyle = '#484f58';
      ctx.font = '9px monospace';
      ctx.fillText('Chưa có track', 4, 14);
      return;
    }

    const speeds = [];
    const shapes = track.shapes;
    for (let i = 1; i < shapes.length; i++) {
      const p1 = shapes[i - 1].points;
      const p2 = shapes[i].points;
      const df = Math.max(1, shapes[i].frame - shapes[i - 1].frame);
      const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
      speeds.push({ frame: shapes[i].frame, speed: dist / df });
    }

    const maxSpeed = Math.max(1, ...speeds.map((s) => s.speed));
    ctx.beginPath();
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 1.5;

    speeds.forEach((s, idx) => {
      const x = (idx / (speeds.length - 1)) * (w - 8) + 4;
      const y = h - (s.speed / maxSpeed) * (h - 6) - 3;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Đánh dấu đỏ các điểm giật tốc độ (> 3m/frame)
    speeds.forEach((s, idx) => {
      if (s.speed > 3.0) {
        const x = (idx / (speeds.length - 1)) * (w - 8) + 4;
        const y = h - (s.speed / maxSpeed) * (h - 6) - 3;
        ctx.fillStyle = '#f85149';
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // ---------- Tự động hút đáy sát mặt đất (Snap to ground) ----------
  app.snapTrackToGround = async (trackId) => {
    const active = await SP.bridge.getActiveElement();
    if (!active || !active.state) return false;
    const { frame, state } = active;
    const box = SP.geom.pointsToBox(state.points);
    const frames = app.getFrames();
    if (!frames) return false;

    setStatus('Đang nạp point cloud để hút mặt đất…');
    const cloud = await frames.cloud(frame);
    if (!cloud || !cloud.xyz || !cloud.xyz.length) {
      setStatus('Không có dữ liệu point cloud ở frame này', 'err');
      return false;
    }

    const res = SP.geom.snapToGround(cloud.xyz, box);
    if (res && Math.abs(res.shift) > 1e-4) {
      await SP.bridge.snapActiveGround(trackId, frame, res.shift);
      if (app.store?.syncFromCvat) await app.store.syncFromCvat();
      setStatus(`Đã hút sát mặt đất: ΔZ = ${res.shift > 0 ? '+' : ''}${res.shift.toFixed(3)}m (${res.count} điểm)`, 'ok');
      return true;
    } else if (!res) {
      setStatus('Không đủ điểm laser dưới đáy xe để ước tính mặt đất', 'err');
    } else {
      setStatus('Đáy xe đã nằm khớp chính xác mặt đất', 'ok');
    }
    return false;
  };

  // ---------- Mở rộng / Thu nhỏ Drawer (Keep-Alive) ----------
  app.toggleDrawer = async () => {
    if (!drawerEl) {
      await app.openDrawer();
      return;
    }
    app.isCollapsed = !app.isCollapsed;
    drawerEl.classList.toggle('collapsed', app.isCollapsed);
    if (app.isCollapsed) {
      drawerEl.style.display = 'none';
      if (jobIdFromUrl()) launcherBtn.style.display = 'flex';
      if (app.isFullscreen) {
        drawerEl.classList.remove('fullscreen');
        app.isFullscreen = false;
        if (fullscreenBtn) {
          fullscreenBtn.innerHTML = '';
          fullscreenBtn.append(SP.icons.maximize(12));
          fullscreenBtn.title = 'Toàn màn hình (F11 / Double-click)';
        }
      }
      // Giải phóng hoàn toàn Canvas 3D của CVAT và khôi phục các tay nắm điều khiển để người dùng chỉnh tự do trên CVAT gốc
      SP.bridge?.call?.('releaseCanvasMode')?.catch?.(() => {});
    } else {
      drawerEl.style.display = 'flex';
      launcherBtn.style.display = 'none';
      // Đồng bộ lại các thay đổi từ RAM CVAT (nếu người dùng vừa sửa trên CVAT gốc trong lúc ẩn tool)
      if (app.store?.syncFromCvat) {
        await app.store.syncFromCvat();
        app.changed();
      }
    }
    updateToolbarButtonState();
  };

  // ---------- Toàn màn hình / Khôi phục kích thước cũ (Fullscreen Mode) ----------
  app.toggleFullscreen = () => {
    if (!drawerEl) return;
    app.isFullscreen = !app.isFullscreen;
    drawerEl.classList.toggle('fullscreen', app.isFullscreen);
    if (app.isFullscreen) {
      drawerEl.classList.remove('collapsed');
      drawerEl.style.display = 'flex';
      app.isCollapsed = false;
      launcherBtn.style.display = 'none';
    }
    if (fullscreenBtn) {
      fullscreenBtn.innerHTML = '';
      fullscreenBtn.append(app.isFullscreen ? SP.icons.restore(12) : SP.icons.maximize(12));
      fullscreenBtn.title = app.isFullscreen ? 'Thu nhỏ lại (F11 / Double-click)' : 'Toàn màn hình (F11 / Double-click)';
    }
    updateToolbarButtonState();
    app.mounted?.refresh?.();
  };

  // ---------- Né góc công cụ CVAT / Tràn viền màn hình (Offset Mode) ----------
  app.toggleOffsetMode = () => {
    if (!drawerEl) return;
    app.isOffsetMode = !app.isOffsetMode;
    drawerEl.classList.toggle('offset-mode', app.isOffsetMode);
    if (layoutBtn) {
      layoutBtn.title = app.isOffsetMode ? 'Đổi sang Tràn viền (100% chiều ngang)' : 'Đổi sang Né góc công cụ CVAT (để lộ ô Point Size)';
      layoutBtn.style.color = app.isOffsetMode ? '#177ddc' : '#d9d9d9';
    }
    app.mounted?.refresh?.();
  };

  // ---------- Nạp lại dữ liệu từ CVAT (Reload & Reset Cache) ----------
  async function reload() {
    const jid = jobIdFromUrl();
    if (!jid) return false;

    setStatus('Đang tải dữ liệu từ CVAT…');
    try {
      app.store = new SP.JobStore(jid);
      app.history = [];
      app.redoHistory = [];
      await app.store.load();
      setStatus(`LIVE · Sẵn sàng (${app.store.tracks.size} tracks)`, 'ok');
      app.changed();
      const targetTab = app.currentTab || Object.keys(app.tabs)[0];
      if (targetTab) switchTab(targetTab, app.currentTrackId);
      renderSpeedSparkline();
      return true;
    } catch (err) {
      setStatus(`Lỗi nạp CVAT: ${err.message} (Click để thử lại)`, 'err');
      app.store = null; // Giải phóng để lần sau thử lại, không kẹt cache
      return false;
    }
  }
  app.reload = reload;

  app.openDrawer = async ({ trackId = null, tab = null } = {}) => {
    const jid = jobIdFromUrl();
    if (!jid) return;

    ensureHost();
    drawerEl.style.display = 'flex';
    app.isCollapsed = false;
    drawerEl.classList.remove('collapsed');
    launcherBtn.style.display = 'none';
    updateToolbarButtonState();

    if (trackId !== null) app.currentTrackId = trackId;

    if (!app.store) {
      await reload();
    } else {
      if (app.store.syncFromCvat) {
        await app.store.syncFromCvat();
      }
      const targetTab = tab || app.currentTab || Object.keys(app.tabs)[0];
      if (targetTab) switchTab(targetTab, app.currentTrackId);
      app.changed();
    }
  };

  app.showHotkeysModal = () => {
    SP.hotkeys?.show();
  };

  // ---------- Modal xếp chồng & Trình xem ảnh Camera (Image Viewer) ----------
  const modalStack = [];
  function closeModal(entry) {
    const i = modalStack.indexOf(entry);
    if (i < 0) return;
    modalStack.splice(i, 1);
    entry.modal.remove();
    entry.opts?.onClose?.();
    if (modalStack.length) {
      modalStack[modalStack.length - 1].modal.focus({ preventScroll: true });
    }
  }
  function closeTopModal() {
    if (modalStack.length) closeModal(modalStack[modalStack.length - 1]);
  }

  app.openModal = (title, content, opts = {}) => {
    ensureHost();
    const titleEl = h('b', { style: { color: '#fff', fontSize: '12px' } }, title);
    const entry = { modal: null, opts, titleEl };
    const modal = h('div', {
      class: 'modal',
      tabindex: '-1',
      onclick: (e) => { if (e.target === modal) closeTopModal(); },
      onkeydown: (e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          closeModal(entry);
          return;
        }
        opts.onKey?.(e);
      }
    },
      h('div', { class: 'bar' },
        titleEl,
        ...(opts.tools || []),
        h('span', { class: 'grow' }),
        h('button', { class: 'danger small', onclick: () => closeModal(entry) }, 'Đóng (Esc)')
      ),
      content
    );
    entry.modal = modal;
    modalStack.push(entry);
    shadow.append(modal);
    modal.focus({ preventScroll: true });
    return {
      modal,
      setTitle: (t) => { titleEl.textContent = t; },
      close: () => closeModal(entry),
    };
  };

  app.openImageViewer = (list, start = 0) => {
    let index = start;
    let img = null;
    let s = 1, tx = 0, ty = 0, fitted = true;
    const canvas = h('canvas');
    const area = h('div', { class: 'viewer' }, canvas);
    const zoomLbl = h('span', { class: 'zoomlbl' });
    const ctx = canvas.getContext('2d');

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const W = area.clientWidth, H = area.clientHeight;
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        canvas.style.width = `${W}px`;
        canvas.style.height = `${H}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      if (!img) return;
      ctx.imageSmoothingEnabled = s < 3;
      ctx.drawImage(img, tx, ty, img.width * s, img.height * s);
      zoomLbl.textContent = `${Math.round(s * 100)}%`;
    }
    function fit() {
      if (!img) return;
      const W = area.clientWidth, H = area.clientHeight;
      s = Math.min(W / img.width, H / img.height);
      tx = (W - img.width * s) / 2;
      ty = (H - img.height * s) / 2;
      fitted = true;
      draw();
    }
    function zoomAt(k, mx, my) {
      const ns = Math.min(40, Math.max(0.05, s * k));
      k = ns / s;
      tx = mx - (mx - tx) * k;
      ty = my - (my - ty) * k;
      s = ns;
      fitted = false;
      draw();
    }
    function load(i) {
      index = (i + list.length) % list.length;
      ui.setTitle(`${list[index].title || list[index].name} · ${index + 1}/${list.length}`);
      const im = new Image();
      im.onload = () => { img = im; fit(); };
      im.src = list[index].url;
    }

    area.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = area.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    area.addEventListener('pointerdown', (e) => {
      area.setPointerCapture(e.pointerId);
      area.classList.add('dragging');
      let lx = e.clientX, ly = e.clientY;
      const move = (ev) => { tx += ev.clientX - lx; ty += ev.clientY - ly; lx = ev.clientX; ly = ev.clientY; fitted = false; draw(); };
      const up = () => { area.classList.remove('dragging'); area.removeEventListener('pointermove', move); area.removeEventListener('pointerup', up); };
      area.addEventListener('pointermove', move);
      area.addEventListener('pointerup', up);
    });
    area.addEventListener('dblclick', fit);
    const center = (k) => zoomAt(k, area.clientWidth / 2, area.clientHeight / 2);
    const tools = [
      h('button', { class: 'small', onclick: () => load(index - 1), title: 'Ảnh trước (←)' }, 'Trước'),
      h('button', { class: 'small', onclick: () => load(index + 1), title: 'Ảnh tiếp (→)' }, 'Tiếp'),
      h('span', { class: 'divider' }),
      h('button', { class: 'small', onclick: () => center(1 / 1.25), title: 'Thu nhỏ (-)' }, '−'),
      zoomLbl,
      h('button', { class: 'small', onclick: () => center(1.25), title: 'Phóng to (+)' }, '+'),
      h('button', { class: 'small', onclick: fit, title: 'Vừa khung (Double-click)' }, 'Vừa khung'),
      h('button', { class: 'small', onclick: () => { const W = area.clientWidth, H = area.clientHeight; s = 1; tx = (W - img.width) / 2; ty = (H - img.height) / 2; fitted = false; draw(); } }, '1:1'),
      h('span', { class: 'help' }, 'Cuộn: Zoom · Kéo: Di chuyển · Double-click: Vừa khung · ←/→: Đổi ảnh'),
    ];
    const ro = new ResizeObserver(() => (fitted ? fit() : draw()));
    const ui = app.openModal('', area, {
      tools,
      onKey: (e) => {
        if (e.key === 'ArrowLeft') load(index - 1);
        else if (e.key === 'ArrowRight') load(index + 1);
        else if (e.key === '+' || e.key === '=') center(1.25);
        else if (e.key === '-') center(1 / 1.25);
        else if (e.key === '0') fit();
      },
      onClose: () => ro.disconnect(),
    });
    ro.observe(area);
    load(index);
    return ui;
  };

  // Soi vệt di chuyển (Hộp 3D + Điểm LiDAR của 2 frame trước) trực tiếp trên Three.js Canvas chính của CVAT
  app.isPeekingGhost = false;
  app.peekMain3DGhost = async () => {
    app.isPeekingGhost = true;
    try {
      if (!app.store) {
        await reload();
        if (!app.isPeekingGhost) return;
      }

      const active = await SP.bridge.getActiveElement();
      if (!app.isPeekingGhost) return;
      if (!active || !active.activeId || active.frame === undefined) {
        app.setStatus('Chọn 1 cuboid trước khi giữ phím Alt+H để soi vệt di chuyển', 'err');
        return;
      }

      const { activeId, frame } = active;
      const track = app.store?.track(activeId);
      if (!track) return;

      const frameData = app.getFrames();
      const ghosts = [];

      // Soi 2 frame trước: t-1 (Xanh Cyan 0x00e5ff) và t-2 (Cam 0xff9100)
      const offsets = [
        { offset: 1, color: 0x00e5ff },
        { offset: 2, color: 0xff9100 },
      ];

      for (const { offset, color } of offsets) {
        const prevFrame = frame - offset;
        if (prevFrame < 0) continue;

        const pos = track.at(prevFrame);
        if (!pos || pos.outside) continue;

        const box = pos.box;
        const boxCorners = SP.geom.boxCorners(box);
        const ax = SP.geom.axes(box.r);
        const frontCenter = SP.geom.localToWorld([box.s[0] / 2, 0, 0], box.c, ax);
        const headingLine = [box.c, frontCenter];

        let points = [];
        const cloud = await frameData.cloud(prevFrame);
        if (!app.isPeekingGhost) return;
        if (cloud && cloud.xyz && cloud.xyz.length) {
          const inside = SP.geom.getPointsInsideBox(cloud.xyz, box);
          if (inside && inside.length) {
            points = Array.from(inside);
          }
        }

        ghosts.push({
          frame: prevFrame,
          color,
          boxCorners,
          headingLine,
          points,
        });
      }

      if (!app.isPeekingGhost) return;
      if (ghosts.length) {
        await SP.bridge.showGhostInMainScene(ghosts);
        if (!app.isPeekingGhost) {
          await SP.bridge.hideGhostInMainScene();
          return;
        }
        app.setStatus(`Soi vệt Track #${activeId}: Frame ${frame - 1} (Cyan) và Frame ${frame - 2} (Cam)`, 'info');
      } else {
        app.setStatus(`Track #${activeId}: Không có dữ liệu ở các frame trước`, 'err');
      }
    } catch (err) {
      console.warn('[CVAT Super Pro] Lỗi khi soi bóng ma trên 3D scene:', err);
    }
  };

  app.clearMain3DGhost = async () => {
    app.isPeekingGhost = false;
    try {
      await SP.bridge.hideGhostInMainScene();
      app.setStatus('', 'ok');
    } catch {}
  };

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

  function ensureHost() {
    if (host) return;
    host = h('div', { id: 'cvat-super-pro-root', style: { pointerEvents: 'none' } });
    shadow = host.attachShadow({ mode: 'closed' });
    shadow.append(h('style', {}, CSS));

    // Nút mở nhanh thanh Dock (chỉ hiện ở góc dưới trái khi đang mở Job và Drawer đang thu nhỏ)
    launcherBtn = h('button', {
      class: 'mini-launcher',
      style: { display: 'none' },
      onclick: () => app.openDrawer(),
      title: 'Mở ngăn kéo CVAT 3D Super Pro (Alt+Space / Ctrl+`)'
    },
      SP.icons.cube(14),
      h('span', {}, '3D Pro')
    );
    shadow.append(launcherBtn);

    // Cấu trúc ngăn kéo đáy (Bottom Drawer)
    drawerEl = h('div', {
      class: `drawer ${app.isOffsetMode ? 'offset-mode' : ''}`,
      style: { height: `${app.drawerHeight}px`, display: 'none' }
    });

    // Splitter kéo co giãn độ cao
    splitterEl = h('div', { class: 'drawer-splitter', title: 'Kéo để chỉnh độ cao ngăn kéo' });
    let isDragging = false, startY = 0, startH = 0;
    splitterEl.addEventListener('mousedown', (e) => {
      isDragging = true;
      startY = e.clientY;
      startH = drawerEl.offsetHeight;
      splitterEl.classList.add('dragging');
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const delta = startY - e.clientY;
      const newH = Math.max(160, Math.min(window.innerHeight * 0.82, startH + delta));
      app.drawerHeight = newH;
      drawerEl.style.height = `${newH}px`;
      app.mounted?.refresh?.();
    });
    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        splitterEl.classList.remove('dragging');
        app.mounted?.refresh?.();
      }
    });

    statusEl = h('span', {
      class: 'status',
      style: { cursor: 'pointer' },
      title: 'Click để nạp lại dữ liệu từ CVAT',
      onclick: () => app.reload()
    });
    const reloadBtn = h('button', {
      class: 'tool-btn',
      onclick: () => app.reload(),
      title: 'Đọc lại dữ liệu mới nhất từ RAM CVAT'
    }, SP.icons.refresh(12), 'Tải lại');
    saveBtn = h('button', { class: 'tool-btn primary', onclick: save, disabled: true }, SP.icons.save(12), 'Lưu CVAT');
    undoBtn = h('button', { class: 'tool-btn', onclick: () => app.undo(), disabled: true, title: 'Ctrl+Z' }, SP.icons.undo(12), 'Hoàn tác');
    redoBtn = h('button', { class: 'tool-btn', onclick: () => app.redo(), disabled: true, title: 'Ctrl+Y' }, SP.icons.redo(12), 'Làm lại');
    const helpBtn = h('button', { class: 'tool-btn', onclick: app.showHotkeysModal, title: 'Bảng phím tắt CAD (?)' }, SP.icons.keyboard(12), 'Phím tắt (?)');
    layoutBtn = h('button', {
      class: 'tool-btn',
      onclick: app.toggleOffsetMode,
      style: { color: app.isOffsetMode ? '#177ddc' : '#d9d9d9' },
      title: app.isOffsetMode ? 'Đổi sang Tràn viền (100% chiều ngang)' : 'Đổi sang Né góc công cụ CVAT (để lộ ô Point Size)'
    }, SP.icons.layout(12));
    fullscreenBtn = h('button', { class: 'tool-btn', onclick: app.toggleFullscreen, title: 'Toàn màn hình (F11 / Double-click)' }, SP.icons.maximize(12));
    collapseBtn = h('button', { class: 'tool-btn', onclick: app.toggleDrawer, title: 'Ẩn ngăn kéo (Alt+Space)' }, SP.icons.chevronDown(12));

    sparklineCanvas = h('canvas', { class: 'sparkline-canvas', width: '130', height: '18', title: 'Biểu đồ vận tốc: Click vào đỉnh đỏ để nhảy đến frame giật lỗi' });
    sparklineCanvas.onclick = (e) => {
      const rect = sparklineCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const track = app.currentTrackId ? app.store.track(app.currentTrackId) : null;
      if (track && track.shapes.length >= 2) {
        const idx = Math.round((x / rect.width) * (track.shapes.length - 1));
        const frame = track.shapes[idx]?.frame;
        if (frame !== undefined) SP.bridge.changeFrame(frame);
      }
    };

    bodyEl = h('div', { class: 'body' });
    tabBtns = {};

    const tabsEl = h('span', { style: { display: 'flex', gap: '4px' } },
      Object.entries(app.tabs).map(([id, def]) => {
        let icon = SP.icons.layers(12);
        if (id === 'case3') icon = SP.icons.overlap(12);
        else if (id === 'case1') icon = SP.icons.cube(12);
        tabBtns[id] = h('button', { class: 'tab', onclick: () => switchTab(id) }, icon, def.title);
        return tabBtns[id];
      })
    );

    const titleEl = h('span', { class: 'title', onclick: app.toggleDrawer },
      SP.icons.cube(14),
      '3D Super Pro',
      h('span', { class: 'badge' }, 'taquanglocit-tech')
    );

    const barEl = h('div', { class: 'bar' },
      titleEl,
      tabsEl,
      h('span', { class: 'sparkline-box' }, SP.icons.speed(11), sparklineCanvas),
      h('span', { class: 'grow' }),
      statusEl,
      reloadBtn,
      undoBtn, redoBtn,
      saveBtn,
      helpBtn,
      layoutBtn,
      fullscreenBtn,
      collapseBtn
    );

    // Double-click vào khoảng trống của thanh Bar để bật / tắt Toàn màn hình
    barEl.addEventListener('dblclick', (e) => {
      if (e.target.closest('button, input, select, canvas, a')) return;
      app.toggleFullscreen();
    });

    drawerEl.append(
      splitterEl,
      barEl,
      bodyEl
    );

    shadow.append(drawerEl);
    document.documentElement.append(host);

    // Phím tắt F11 hoặc Escape để bật/thoát chế độ Fullscreen
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F11' && drawerEl && drawerEl.style.display !== 'none' && !app.isCollapsed) {
        e.preventDefault();
        app.toggleFullscreen();
      } else if (e.key === 'Escape' && app.isFullscreen && !modalStack.length) {
        app.toggleFullscreen();
      }
    });
  }

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

  // Nút bấm trên thanh Header của CVAT: Thiết kế chuẩn 100% Ant Design của CVAT (Icon 20px ở trên + Chữ 10px ở dưới)
  let toolbarHost = null;
  function updateToolbarButtonState() {
    const isDrawerOpen = !!(drawerEl && drawerEl.style.display !== 'none' && !app.isCollapsed);
    if (toolbarHost) {
      toolbarHost.classList.toggle('cvat-button-active', isDrawerOpen);
    }
    if (launcherBtn) {
      const onJob = !!jobIdFromUrl();
      launcherBtn.style.display = (onJob && !isDrawerOpen) ? 'flex' : 'none';
    }
  }

  function makeToolbarButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ant-btn ant-btn-link cvat-annotation-header-button cvat-super-pro-header-button';
    btn.title = 'Bật / Tắt ngăn kéo 3D Super Pro (Alt+Space)';

    const iconSpan = document.createElement('span');
    iconSpan.setAttribute('role', 'img');
    iconSpan.className = 'anticon';
    iconSpan.innerHTML = `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;

    const textSpan = document.createElement('span');
    textSpan.textContent = '3D Pro';

    btn.append(iconSpan, textSpan);
    btn.addEventListener('click', () => {
      const isDrawerOpen = !!(drawerEl && drawerEl.style.display !== 'none' && !app.isCollapsed);
      if (isDrawerOpen) app.toggleDrawer();
      else app.openDrawer();
    });
    return btn;
  }

  function placeLauncher() {
    ensureHost();
    const onJob = !!jobIdFromUrl();
    const group = document.querySelector('.cvat-annotation-header-right-group');
    if (onJob && group) {
      toolbarHost ||= makeToolbarButton();
      if (group.firstChild !== toolbarHost) group.insertBefore(toolbarHost, group.firstChild);
      toolbarHost.style.display = '';
    } else {
      if (toolbarHost) toolbarHost.style.display = 'none';
    }
    updateToolbarButtonState();
  }

  // Tự động thử lại khi CVAT vừa tải xong (hết xoay vòng spinner)
  setInterval(async () => {
    if (drawerEl && drawerEl.style.display !== 'none' && !app.store && jobIdFromUrl()) {
      try {
        const isReady = await SP.bridge.isAvailable();
        if (isReady) {
          await app.reload();
        }
      } catch { /* tiếp tục chờ CVAT */ }
    }
  }, 1200);

  chrome.runtime.sendMessage({ type: 'getOrigins' }, (res) => {
    if (chrome.runtime.lastError) return;
    const origins = (res && res.origins) || [];
    if (!origins.includes(location.origin)) return;
    placeLauncher();
    setInterval(placeLauncher, 1000);
  });
})();
