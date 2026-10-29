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
      font: 500 12px inherit; background: #1f1f1f; color: #d9d9d9;
      border: 1px solid #303030; border-radius: 4px; padding: 4px 10px; cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 6px;
      transition: background 0.15s, border-color 0.15s;
    }
    .mini-launcher:hover { background: #262626; border-color: #177ddc; color: #fff; }

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
      right: min(350px, 24vw) !important;
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
    kbd, .c-kbd {
      background: #262626;
      border: 1px solid #434343;
      border-radius: 2px;
      padding: 0 4px;
      font-size: 9px;
      line-height: 14px;
      color: #8c8c8c;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      font-weight: 500;
      display: inline-block;
      box-shadow: 0 1px 0 rgba(0,0,0,0.25);
      vertical-align: middle;
      user-select: none;
    }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
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
    /* Status Chip cố định 78px, không xô lệch layout */
    .status-chip {
      width: 78px; height: 20px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
      gap: 4px; font-size: 10px; font-weight: 600; border-radius: 10px; background: #141414; border: 1px solid #303030;
      color: #8c8c8c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;
      transition: border-color 0.15s, color 0.15s, background 0.15s; user-select: none;
    }
    .status-chip:hover { border-color: #177ddc; color: #d9d9d9; background: #1a1a1a; }
    .status-chip .dot { width: 6px; height: 6px; border-radius: 50%; background: #52c41a; display: inline-block; flex-shrink: 0; }
    .status-chip.ok .dot { background: #52c41a; }
    .status-chip.err { border-color: #5c2223; color: #ff7875; }
    .status-chip.err .dot { background: #f5222d; }
    .status-chip.loading .dot { background: #1890ff; }
    .status-chip.warn { border-color: #d4b106; color: #faad14; }
    .status-chip.warn .dot { background: #faad14; }

    /* Toast Notification nổi ở đỉnh Drawer */
    .sp-toast-container {
      position: absolute; top: 38px; left: 50%; transform: translateX(-50%); z-index: 9999;
      pointer-events: none; display: flex; flex-direction: column; align-items: center; gap: 6px;
    }
    .sp-toast {
      background: #1f1f1f; border: 1px solid #303030; border-radius: 3px; padding: 5px 12px;
      font-size: 11px; font-weight: 500; color: #d9d9d9; display: inline-flex; align-items: center; gap: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45); pointer-events: auto;
      animation: spToastSlide 0.2s cubic-bezier(0.2, 0, 0, 1);
      transition: opacity 0.25s, transform 0.25s;
    }
    @keyframes spToastSlide {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .sp-toast.ok { border-color: #274916; color: #a0d911; }
    .sp-toast.ok svg { stroke: #52c41a; }
    .sp-toast.err { border-color: #5c2223; color: #ff7875; }
    .sp-toast.err svg { stroke: #f5222d; }
    .sp-toast.info { border-color: #113556; color: #40a9ff; }
    .sp-toast.info svg { stroke: #1890ff; }

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

  app.undo = async () => {
    const ids = app.history.pop();
    if (!ids) return false;
    for (const id of ids) {
      const t = app.store?.track(id);
      if (t) {
        t.undo();
        await app.store?.syncTrackToCvat(t);
      }
    }
    app.redoHistory.push(ids);
    app.changed();
    SP.hud?.update?.(true);
    setStatus('Đã hoàn tác (Undo) & đồng bộ CVAT', 'ok');
    return true;
  };

  app.redo = async () => {
    const ids = app.redoHistory.pop();
    if (!ids) return false;
    for (const id of ids) {
      const t = app.store?.track(id);
      if (t) {
        t.redo();
        await app.store?.syncTrackToCvat(t);
      }
    }
    app.history.push(ids);
    app.changed();
    SP.hud?.update?.(true);
    setStatus('Đã làm lại (Redo) & đồng bộ CVAT', 'ok');
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

  let host, shadow, launcherBtn, drawerEl, splitterEl, statusEl, toastContainer, saveBtn, undoBtn, redoBtn, fullscreenBtn, layoutBtn, collapseBtn, bodyEl, sparklineCanvas, tabBtns = {};

  // Hiển thị thông báo nổi Toast Ant Design
  function showToast(text, kind = 'info', durationMs = 2500) {
    if (!drawerEl) return;
    if (!toastContainer) {
      toastContainer = h('div', { class: 'sp-toast-container' });
      drawerEl.append(toastContainer);
    }
    let iconSvg = SP.icons.check(12);
    if (kind === 'err') iconSvg = SP.icons.close(12);
    else if (kind === 'warn') iconSvg = SP.icons.speed(12);
    else if (kind === 'info') iconSvg = SP.icons.cube(12);

    const toast = h('div', { class: `sp-toast ${kind}` },
      iconSvg,
      h('span', {}, text)
    );
    toastContainer.append(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-6px)';
      setTimeout(() => toast.remove(), 250);
    }, durationMs);
  }
  app.showToast = showToast;

  function updateStatusChip(text, kind = '') {
    if (!statusEl) return;
    const trackCount = app.store?.tracks?.size ?? 0;
    let label = 'LIVE';
    if (kind === 'loading' || (text && text.includes('Đang'))) {
      label = 'Tải…';
    } else if (kind === 'err') {
      label = 'Lỗi';
    } else if (trackCount > 0) {
      label = `● ${trackCount} trk`;
    } else {
      label = '● LIVE';
    }

    statusEl.className = `status-chip ${kind}`;
    statusEl.title = text ? `${text} (Click để nạp lại)` : `Trạng thái: LIVE (${trackCount} tracks) - Click để nạp lại`;
    statusEl.innerHTML = '';
    const dot = h('span', { class: 'dot' });
    statusEl.append(dot, document.createTextNode(' ' + label.replace(/^●\s*/, '')));
  }

  function setStatus(text, kind = '') {
    if (!text && !kind) return;
    // Nếu text là một thông báo hành động (bắt đầu bằng Đã..., Lỗi..., Đang..., CVAT... hoặc có kind rõ ràng)
    const isActionMessage = kind === 'ok' || kind === 'err' || kind === 'warn' ||
      (text && (text.startsWith('Đã ') || text.startsWith('Lỗi') || text.startsWith('Không ') || text.startsWith('CVAT ')));
    if (isActionMessage) {
      showToast(text, kind || 'info');
    }
    updateStatusChip(text, kind);
  }
  app.setStatus = setStatus;

  app.changed = () => {
    if (!app.store || !saveBtn) return;
    const n = app.store.dirtyTracks().length;
    const cvatOnly = !n && !!app.store.cvatUnsaved;
    saveBtn.innerHTML = '';
    saveBtn.append(SP.icons.save(12), n ? `Lưu CVAT (${n})` : (cvatOnly ? 'Lưu CVAT (•)' : 'Lưu CVAT'), SP.ui.kbd('Ctrl+S'));
    // Sáng khi Tool còn track dirty HOẶC CVAT báo còn thay đổi chưa lưu (vd sửa attribute trực tiếp trên CVAT)
    saveBtn.disabled = !app.store.hasPendingSave();
    saveBtn.title = cvatOnly
      ? 'CVAT còn thay đổi chưa lưu (từ giao diện CVAT gốc) - bấm để lưu (Ctrl+S)'
      : 'Lưu thay đổi vào RAM CVAT (Ctrl+S)';
    undoBtn.disabled = !app.history.length;
    redoBtn.disabled = !app.redoHistory.length;
    renderSpeedSparkline();
    app.mounted?.refresh?.();
  };

  // Quên lịch sử Undo/Redo của Tool cho các track vừa bị đổi từ phía CVAT (Undo/Redo gốc, sửa tay...)
  // để tránh Undo của Tool ghi đè ngược thay đổi mới hơn của CVAT
  app.forgetHistoryFor = (ids) => {
    if (!ids || !ids.length) return;
    const drop = new Set(ids);
    const clean = (list) => list
      .map((entry) => entry.filter((id) => !drop.has(id)))
      .filter((entry) => entry.length);
    app.history = clean(app.history);
    app.redoHistory = clean(app.redoHistory);
  };

  function jobIdFromUrl() {
    const m = /\/jobs\/(\d+)/.exec(location.pathname);
    return m ? Number(m[1]) : null;
  }

  // ---------- Vẽ Biểu đồ Vận tốc Mini (Speed Sparkline - hỗ trợ màn hình HiDPI/Retina) ----------
  function renderSpeedSparkline() {
    if (!sparklineCanvas || !app.store) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = 136;
    const cssH = 18;
    if (sparklineCanvas.width !== Math.round(cssW * dpr) || sparklineCanvas.height !== Math.round(cssH * dpr)) {
      sparklineCanvas.width = Math.round(cssW * dpr);
      sparklineCanvas.height = Math.round(cssH * dpr);
      sparklineCanvas.style.width = `${cssW}px`;
      sparklineCanvas.style.height = `${cssH}px`;
    }

    const ctx = sparklineCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const track = app.currentTrackId ? app.store.track(app.currentTrackId) : null;
    if (!track || track.shapes.length < 2) {
      sparklineCanvas._speeds = null;
      ctx.fillStyle = '#8c8c8c';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", monospace';
      ctx.fillText('Chưa chọn track', 8, 12.5);
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
    sparklineCanvas._speeds = speeds;

    const maxSpeed = Math.max(1, ...speeds.map((s) => s.speed));
    ctx.beginPath();
    ctx.strokeStyle = '#177ddc';
    ctx.lineWidth = 1.4;

    const denom = Math.max(1, speeds.length - 1);
    speeds.forEach((s, idx) => {
      const x = (idx / denom) * (cssW - 8) + 4;
      const y = cssH - (s.speed / maxSpeed) * (cssH - 6) - 3;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Đánh dấu đỏ các điểm giật tốc độ (vượt ngưỡng cấu hình trong Cài đặt QA, mặc định 3 m/frame)
    const speedLimit = SP.qa.get(app.store.labelName(track.labelId)).speedPerFrame;
    sparklineCanvas._speedLimit = speedLimit;
    speeds.forEach((s, idx) => {
      if (s.speed > speedLimit) {
        const x = (idx / denom) * (cssW - 8) + 4;
        const y = cssH - (s.speed / maxSpeed) * (cssH - 6) - 3;
        ctx.fillStyle = '#ff4d4f';
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
      app.store.on('sync', (what) => {
        // Khi dữ liệu đổi từ phía CVAT: bỏ lịch sử Undo/Redo của các track bị đổi, chọn lại track nếu track hiện tại đã bị xóa
        if (what && what.external && Array.isArray(what.changedIds)) app.forgetHistoryFor(what.changedIds);
        if (what && Array.isArray(what.removed) && what.removed.length) {
          app.forgetHistoryFor(what.removed);
          if (app.currentTrackId != null && !app.store.track(app.currentTrackId)) {
            const first = [...app.store.tracks.values()][0];
            app.currentTrackId = first ? first.id : null;
          }
        }
      });
      await app.store.load();
      setStatus(`LIVE · Sẵn sàng (${app.store.tracks.size} tracks)`, 'ok');
      app.changed();
      app.updateTabBadges?.();
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

    const prevTrackId = app.currentTrackId;
    if (trackId !== null) app.currentTrackId = trackId;

    if (!app.store) {
      await reload();
    } else {
      if (app.store.syncFromCvat) {
        await app.store.syncFromCvat();
      }
      const targetTab = tab || app.currentTab || Object.keys(app.tabs)[0];
      if (!app.mounted || targetTab !== app.currentTab) {
        switchTab(targetTab, app.currentTrackId);
      } else if (trackId !== null && trackId !== prevTrackId && typeof app.mounted.selectTrack === 'function') {
        app.mounted.selectTrack(trackId);
      } else {
        app.mounted?.refresh?.();
      }
      app.changed();
      requestAnimationFrame(() => app.mounted?.refresh?.());
    }
  };

  // Lắng nghe thay đổi trực tiếp từ màn hình CVAT (Redux store subscriber trong bridge-main)
  // để đồng bộ ngược tức thời vào Tool mà không cần bấm "Tải lại"
  //
  // Nguyên tắc: sự kiện đến lúc đang đồng bộ KHÔNG bị bỏ - chỉ gom lại (pending) và chạy lại đúng 1 lần sau khi xong,
  // nhờ đó RAM của Tool luôn bắt kịp CVAT.
  let isSyncingFromEvent = false;
  let pendingEvt = null;

  function mergeEvt(a, b) {
    if (!a) return { ...b };
    return {
      ...b,
      annotationsChanged: !!(a.annotationsChanged || b.annotationsChanged),
      frameChanged: !!(a.frameChanged || b.frameChanged),
      activeChanged: !!(a.activeChanged || b.activeChanged),
      saved: !!(a.saved || b.saved),
      // activeId/frame luôn lấy giá trị mới nhất (b); nếu b không đổi active thì giữ active đổi gần nhất của a
      activeId: b.activeChanged ? b.activeId : (a.activeChanged ? a.activeId : b.activeId),
    };
  }

  async function handleCvatEvent(evt) {
    const store = app.store;
    if (!store) return;
    let needsRefresh = false;

    // 1. CVAT vừa lưu xong (Save gốc / Ctrl+S): đặt lại bản chụp gốc để tắt trạng thái "chưa lưu"
    if (evt.saved) {
      const cleaned = await store.refreshAfterSave();
      needsRefresh = true;
      setStatus(`CVAT đã lưu${cleaned ? ` (${cleaned} track)` : ''} lúc ${new Date().toLocaleTimeString()}`, 'ok');
    }

    // 2. Dữ liệu annotation đổi từ phía CVAT (Undo/Redo gốc, xóa/thêm track, sửa tay...)
    if (evt.annotationsChanged && !evt.saved && store.syncFromCvat) {
      const changed = await store.syncFromCvat({ external: true });
      if (changed) needsRefresh = true;
    }

    if (evt.activeChanged && evt.activeId != null) {
      const tr = store.track(evt.activeId);
      if (tr) {
        app.currentTrackId = tr.id;
        renderSpeedSparkline();
        if (!app.isCollapsed && typeof app.mounted?.onCvatActiveTrack === 'function') {
          app.mounted.onCvatActiveTrack(tr.id, evt.frame);
        }
      }
    }
    if (evt.frameChanged && !app.isCollapsed && typeof app.mounted?.onCvatFrame === 'function') {
      app.mounted.onCvatFrame(evt.frame);
    }
    if (needsRefresh || evt.unsavedChanged) {
      if (!app.isCollapsed) app.changed();
      else {
        renderSpeedSparkline();
        updateSaveButtonOnly();
      }
    }
    SP.hud?.update?.(true);
  }

  // Cập nhật riêng nút Lưu khi Drawer đang thu nhỏ (không cần dựng lại tab)
  function updateSaveButtonOnly() {
    if (!app.store || !saveBtn) return;
    const n = app.store.dirtyTracks().length;
    saveBtn.disabled = !app.store.hasPendingSave();
    saveBtn.innerHTML = '';
    saveBtn.append(SP.icons.save(12), n ? `Lưu CVAT (${n})` : (app.store.cvatUnsaved ? 'Lưu CVAT (•)' : 'Lưu CVAT'), SP.ui.kbd('Ctrl+S'));
  }

  async function pumpCvatEvents(first) {
    isSyncingFromEvent = true;
    try {
      let evt = first;
      while (evt) {
        pendingEvt = null;
        try {
          await handleCvatEvent(evt);
        } catch (err) {
          console.warn('[CVAT Super Pro] Lỗi đồng bộ từ sự kiện CVAT:', err);
        }
        evt = pendingEvt;
      }
    } finally {
      isSyncingFromEvent = false;
    }
  }

  SP.bridge?.onEvent?.((evt) => {
    if (!evt || !app.store) return;
    let norm = null;
    if (evt.type === 'cvat-updated') {
      if (typeof evt.unsaved === 'boolean') {
        norm = { ...evt, unsavedChanged: app.store.cvatUnsaved !== evt.unsaved };
        app.store.cvatUnsaved = evt.unsaved;
      } else {
        norm = { ...evt };
      }
    } else if (evt.type === 'cvat-saved') {
      app.store.cvatUnsaved = false;
      norm = { saved: true, annotationsChanged: false, frameChanged: false, activeChanged: false, unsavedChanged: true };
    } else if (evt.type === 'cvat-unsaved') {
      const changed = app.store.cvatUnsaved !== !!evt.unsaved;
      app.store.cvatUnsaved = !!evt.unsaved;
      if (!changed) return;
      norm = { unsavedChanged: true, annotationsChanged: false, frameChanged: false, activeChanged: false };
    } else if (evt.type === 'cvat-save-failed') {
      app.store.cvatUnsaved = true;
      setStatus('CVAT lưu thất bại - dữ liệu vẫn chưa được lưu', 'err');
      norm = { unsavedChanged: true, annotationsChanged: false, frameChanged: false, activeChanged: false };
    } else {
      return;
    }
    if (isSyncingFromEvent) {
      pendingEvt = mergeEvt(pendingEvt, norm);
      return;
    }
    pumpCvatEvents(norm);
  });

  // Đổi ngưỡng QA (vd tốc độ) thì vẽ lại sparkline ngay
  SP.qa?.onChange?.(() => { renderSpeedSparkline(); SP.hud?.update?.(true); });

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
    shadow = host.attachShadow({ mode: 'open' });
    app.shadow = shadow;
    shadow.append(h('style', {}, CSS));

    // Chốt chặn sự kiện bàn phím tại ranh giới Shadow DOM:
    // Ngăn chặn tuyệt đối phím Backspace / Delete / Phím tắt khi đang gõ trong ô <input>, <textarea>, <select>
    // bị nổi bọt (bubble) ra ngoài khiến CVAT hiểu nhầm là lệnh Xóa Track hoặc chuyển Frame!
    for (const evtType of ['keydown', 'keyup', 'keypress']) {
      shadow.addEventListener(evtType, (e) => {
        const el = e.target;
        if (!el) return;
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) {
          if (e.key !== 'F11') {
            e.stopPropagation();
          }
        }
      }, false);
    }

    // Nút mở nhanh thanh Dock (chỉ hiện ở góc dưới trái khi đang mở Job và Drawer đang thu nhỏ)
    launcherBtn = h('button', {
      class: 'mini-launcher',
      style: { display: 'none' },
      onclick: () => app.openDrawer(),
      title: 'Mở ngăn kéo CVAT 3D Super Pro (Alt+Space / Ctrl+`)'
    },
      SP.icons.cube(14),
      h('span', {}, '3D Pro'),
      SP.ui.kbd('Alt+Space')
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
      class: 'status-chip',
      style: { cursor: 'pointer' },
      title: 'Click để nạp lại dữ liệu từ CVAT',
      onclick: () => app.reload()
    });
    updateStatusChip();
    const reloadBtn = h('button', {
      class: 'tool-btn',
      onclick: () => app.reload(),
      title: 'Đọc lại dữ liệu mới nhất từ RAM CVAT'
    }, SP.icons.refresh(12), 'Tải lại');
    saveBtn = h('button', { class: 'tool-btn primary', onclick: save, disabled: true, title: 'Lưu thay đổi vào RAM CVAT (Ctrl+S)' }, SP.icons.save(12), 'Lưu CVAT', SP.ui.kbd('Ctrl+S'));
    undoBtn = h('button', { class: 'tool-btn', onclick: () => app.undo(), disabled: true, title: 'Hoàn tác (Ctrl+Z)' }, SP.icons.undo(12), 'Hoàn tác', SP.ui.kbd('Ctrl+Z'));
    redoBtn = h('button', { class: 'tool-btn', onclick: () => app.redo(), disabled: true, title: 'Làm lại (Ctrl+Y)' }, SP.icons.redo(12), 'Làm lại', SP.ui.kbd('Ctrl+Y'));
    const idMgrBtn = h('button', {
      class: 'tool-btn',
      onclick: () => {
        if (typeof SP.openTrackIdManagerModal === 'function') {
          SP.openTrackIdManagerModal();
        } else {
          app.switchTab('case2');
          setTimeout(() => SP.openTrackIdManagerModal?.(), 100);
        }
      },
      title: 'Quản lý & Sắp xếp Thứ tự Track ID trong trường hợp cấp bách (Prelabel Guidelines)'
    }, SP.icons.cube(12), 'Thứ tự ID');
    const helpBtn = h('button', { class: 'tool-btn', onclick: app.showHotkeysModal, title: 'Bảng phím tắt CAD (?)' }, SP.icons.keyboard(12), 'Phím tắt', SP.ui.kbd('?'));
    layoutBtn = h('button', {
      class: 'tool-btn',
      onclick: app.toggleOffsetMode,
      style: { color: app.isOffsetMode ? '#177ddc' : '#d9d9d9' },
      title: app.isOffsetMode ? 'Đổi sang Tràn viền (100% chiều ngang)' : 'Đổi sang Né góc công cụ CVAT (để lộ ô Point Size)'
    }, SP.icons.layout(12));
    fullscreenBtn = h('button', { class: 'tool-btn', onclick: app.toggleFullscreen, title: 'Toàn màn hình (F11 / Double-click)' }, SP.icons.maximize(12));
    collapseBtn = h('button', { class: 'tool-btn', onclick: app.toggleDrawer, title: 'Ẩn ngăn kéo (Alt+Space)' }, SP.icons.chevronDown(12));

    sparklineCanvas = h('canvas', { class: 'sparkline-canvas', width: '136', height: '18', style: { width: '136px', height: '18px' }, title: 'Biểu đồ vận tốc: Rê chuột để xem frame, Click để nhảy tới frame đó' });
    sparklineCanvas.onmousemove = (e) => {
      const speeds = sparklineCanvas._speeds;
      if (!speeds || !speeds.length) return;
      const rect = sparklineCanvas.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
      const idx = Math.round(ratio * (speeds.length - 1));
      const item = speeds[idx];
      if (item) {
        const limit = sparklineCanvas._speedLimit ?? SP.qa.get().speedPerFrame;
        sparklineCanvas.title = `Frame ${item.frame} · Δd = ${item.speed.toFixed(2)} m/frame${item.speed > limit ? ` (! Vượt ngưỡng ${limit} m/frame)` : ''} — Click để nhảy tới Frame ${item.frame}`;
      }
    };
    sparklineCanvas.onclick = (e) => {
      const speeds = sparklineCanvas._speeds;
      if (speeds && speeds.length) {
        const rect = sparklineCanvas.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
        const idx = Math.round(ratio * (speeds.length - 1));
        const frame = speeds[idx]?.frame;
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
        else if (id === 'case4') icon = SP.icons.camera ? SP.icons.camera(12) : SP.icons.layers(12);
        tabBtns[id] = h('button', { class: 'tab', onclick: () => switchTab(id) }, icon, def.title);
        return tabBtns[id];
      })
    );

    app.updateTabBadges = () => {
      if (!tabBtns['case4']) return;
      const frameData = app.getFrames?.();
      if (!frameData) return;
      frameData.checkHasImages?.().then((hasImgs) => {
        if (!hasImgs && tabBtns['case4']) {
          if (!tabBtns['case4'].querySelector('.no-cam-badge')) {
            const b = h('span', {
              class: 'no-cam-badge',
              style: {
                background: '#262626',
                border: '1px solid #434343',
                color: '#8c8c8c',
                fontSize: '9px',
                padding: '0 4px',
                borderRadius: '2px',
                marginLeft: '3px',
                fontWeight: 'normal',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }
            }, SP.icons.noCamera ? SP.icons.noCamera(10) : null, 'No Cam');
            tabBtns['case4'].append(b);
            tabBtns['case4'].title = 'Job này là dữ liệu LiDAR PCD thuần, không có ảnh Camera 2D (bấm để xem chi tiết)';
          }
        }
      });
    };
    app.updateTabBadges();

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
      idMgrBtn,
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

    toastContainer = h('div', { class: 'sp-toast-container' });
    drawerEl.append(
      splitterEl,
      barEl,
      bodyEl,
      toastContainer
    );

    shadow.append(drawerEl);
    document.documentElement.append(host);

    // Phím tắt F11 hoặc Escape để bật/thoát chế độ Fullscreen
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F11' && drawerEl && drawerEl.style.display !== 'none' && !app.isCollapsed) {
        e.preventDefault();
        e.stopPropagation();
        app.toggleFullscreen();
      } else if (e.key === 'Escape' && app.isFullscreen && !modalStack.length) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        app.toggleFullscreen();
        app._justExitedFullscreen = true;
        setTimeout(() => { app._justExitedFullscreen = false; }, 300);
      }
    }, true);
  }

  async function save() {
    if (!app.store) return;
    saveBtn.disabled = true;
    setStatus('Đang ghi vào RAM & bấm Save của CVAT…');
    try {
      const res = await app.store.save();
      setStatus(res.saved
        ? `Đã lưu ${res.saved} track qua Save gốc CVAT lúc ${new Date().toLocaleTimeString()}`
        : (res.live ? `Đã lưu thay đổi còn lại của CVAT lúc ${new Date().toLocaleTimeString()}` : 'Không có thay đổi nào cần lưu'), 'ok');
      app.changed();
    } catch (err) {
      setStatus(`Lỗi khi lưu: ${err.message}`, 'err');
      saveBtn.disabled = false;
    }
  }
  app.save = save;

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
