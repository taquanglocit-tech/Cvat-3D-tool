// case2.js - Tab Case 2: Duyệt danh sách Frame, Thao tác hàng loạt (Batch Shift), Nội suy chọn lọc & Ghost Frames
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});
  const G = SP.geom;

  const CSS = `
    .c2-head, .c2-row { display: grid; grid-template-columns: 224px var(--img-col) 1fr 1fr 1fr; gap: 4px; }
    .no-cam-mode .c2-head, .no-cam-mode .c2-row { grid-template-columns: 224px 1fr 1fr 1fr !important; }
    .no-cam-mode .c2-img, .no-cam-mode .c2-head-cam { display: none !important; }
    .c2-head { padding: 6px 10px; background: #1f1f1f; border-bottom: 1px solid #303030; font-weight: 600; font-size: 11px; color: #8c8c8c; text-transform: uppercase; letter-spacing: 0.3px; }
    .c2-wrap { position: relative; flex: 1; min-height: 0; }
    .c2-scroll { position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden; padding: 6px; }
    .c2-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
    .c2-scroll::-webkit-scrollbar-track { background: transparent; }
    .c2-scroll::-webkit-scrollbar-thumb { background: #303030; border-radius: 3px; }
    .c2-scroll::-webkit-scrollbar-thumb:hover { background: #434343; }
    .c2-group { display: inline-flex; align-items: center; gap: 5px; padding: 2px 7px; background: #191919; border: 1px solid #2e2e2e; border-radius: 4px; flex-shrink: 0; }
    .c2-kbd { background: #262626; border: 1px solid #434343; border-radius: 2px; padding: 0 4px; font-size: 9px; line-height: 14px; color: #8c8c8c; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; font-weight: 500; display: inline-block; box-shadow: 0 1px 0 rgba(0,0,0,0.25); vertical-align: middle; margin-left: 3px; user-select: none; }
    .c2-row { height: var(--row-h); margin-bottom: 6px; }
    .c2-row.sel .c2-info { outline: 2px solid #177ddc; background: rgba(23, 125, 220, 0.12); border-color: #177ddc; }
    .c2-row.cvat-cur .c2-info { border-left: 3px solid #52c41a; }
    .c2-jump-btn { padding: 1px 5px; font-size: 11px; line-height: 14px; background: rgba(23, 125, 220, 0.15); border: 1px solid rgba(23, 125, 220, 0.45); color: #58a6ff; border-radius: 2px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
    .c2-jump-btn:hover { background: #177ddc; color: #fff; border-color: #177ddc; }
    .c2-info { background: #1f1f1f; border: 1px solid #303030; border-radius: 3px; padding: 8px; display: flex; flex-direction: column; gap: 4px; overflow: hidden; user-select: none; -webkit-user-select: none; }
    .c2-info .head { display: flex; align-items: center; justify-content: space-between; gap: 4px; flex-wrap: wrap; }
    .c2-info .grid { display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 3px 6px; align-items: center; font-size: 11px; font-variant-numeric: tabular-nums; }
    .c2-info input[type=number] { width: 100%; padding: 2px 4px; font-size: 11px; user-select: auto; -webkit-user-select: auto; }
    .c2-info .btns { display: flex; flex-wrap: wrap; gap: 4px; margin-top: auto; }
    .c2-img { background: #0d0d0d; border-radius: 3px; border: 1px solid #262626; overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: zoom-in; color: #595959; font-size: 11px; }
    .c2-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .c2-view { position: relative; border-radius: 3px; background: transparent; touch-action: none; user-select: none; outline: 1px solid #262626; }
    .c2-view:hover { outline-color: #177ddc; }
    .vtools { position: absolute; top: 4px; right: 4px; display: flex; gap: 2px; opacity: 0; transition: opacity .15s; z-index: 2; }
    .c2-view:hover .vtools { opacity: 1; }
    .vtools button { padding: 1px 5px; font-size: 11px; background: rgba(20, 20, 20, 0.9); color: #d9d9d9; border: 1px solid #434343; border-radius: 2px; line-height: 16px; display: inline-flex; align-items: center; justify-content: center; }
    .vtools button:hover { background: #177ddc; border-color: #177ddc; color: #fff; }
    .kf { font-size: 11px; font-weight: 500; padding: 1px 6px; border-radius: 2px; background: rgba(82, 196, 26, 0.16); color: #73d13d; border: 1px solid #52c41a; }
    .kf.interp { background: rgba(140, 140, 140, 0.12); color: #8c8c8c; border: 1px solid #434343; }
    .batch-bar { display: flex; align-items: center; gap: 6px; padding: 5px 12px; background: #141414; border-bottom: 1px solid #177ddc; font-size: 12px; color: #d9d9d9; flex-wrap: wrap; }
    .interp-modal { background: #1f1f1f; border: 1px solid #434343; border-radius: 4px; padding: 20px; width: 440px; box-shadow: 0 12px 32px rgba(0,0,0,0.7); color: #d9d9d9; }
    .interp-modal label { display: flex; align-items: center; gap: 8px; margin: 10px 0; font-size: 13px; color: #d9d9d9; cursor: pointer; }
    .prof-pill { font-size: 11px; font-weight: 500; padding: 1px 6px; border-radius: 2px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; border: 1px solid currentColor; line-height: 16px; user-select: none; transition: opacity 0.1s; }
    .prof-pill:hover { opacity: 0.85; }
    .prof-pill.empty { border: 1px dashed #595959; color: #8c8c8c; background: transparent; }
    .prof-pill.empty:hover { border-color: #177ddc; color: #177ddc; }
    .prof-modal { background: #1f1f1f; border: 1px solid #434343; border-radius: 4px; padding: 20px; width: 560px; max-width: 95vw; max-height: calc(100vh - 40px); overflow-y: auto; overscroll-behavior: contain; box-sizing: border-box; box-shadow: 0 16px 40px rgba(0,0,0,0.8); color: #d9d9d9; }
    .prof-row { display: grid; grid-template-columns: 12px 1fr 180px auto; gap: 8px; align-items: center; margin-bottom: 8px; padding: 8px 10px; background: #141414; border: 1px solid #303030; border-radius: 4px; }
    .c2-dropdown-menu { position: fixed; z-index: 2147483040; background: #1f1f1f; border: 1px solid #434343; border-radius: 4px; padding: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.85); display: flex; flex-direction: column; gap: 2px; font-family: inherit; font-size: 11px; color: #d9d9d9; max-height: calc(100vh - 24px); overflow-y: auto; overscroll-behavior: contain; box-sizing: border-box; }
    .c2-dropdown-menu::-webkit-scrollbar { width: 5px; }
    .c2-dropdown-menu::-webkit-scrollbar-thumb { background: #383838; border-radius: 2px; }
    .c2-dropdown-menu::-webkit-scrollbar-thumb:hover { background: #505050; }
    .c2-menu-header { font-size: 10px; font-weight: 600; color: #8c8c8c; text-transform: uppercase; letter-spacing: 0.3px; padding: 4px 6px 2px; }
    .c2-menu-item { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 5px 8px; border-radius: 3px; cursor: pointer; user-select: none; color: #d9d9d9; transition: background 0.1s; }
    .c2-menu-item:hover { background: #2a2a2a; color: #fff; }
    .c2-menu-divider { height: 1px; background: #303030; margin: 3px 0; }
    .c2-btn-dropdown { display: inline-flex; align-items: center; gap: 4px; background: #191919; border: 1px solid #303030; color: #d9d9d9; border-radius: 3px; padding: 2px 7px; font-size: 11px; font-weight: 500; cursor: pointer; white-space: nowrap; }
    .c2-btn-dropdown:hover { background: #262626; border-color: #177ddc; color: #fff; }
    .c2-fit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 3px 6px; }
    .c2-fit-btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; background: #141414; border: 1px solid #3d3d3d; color: #d9d9d9; border-radius: 3px; padding: 4px 6px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.12s; user-select: none; }
    .c2-fit-btn:hover { background: #222; border-color: #177ddc; color: #fff; }
  `;

  function mount(app, root, initialTrackId) {
    const { h, fmt } = SP.ui;
    const store = app.store;
    root.append(h('style', {}, CSS));

    if (!store || !store.meta || !store.frames?.length) {
      root.append(h('div', { class: 'bar', style: { color: '#8c8c8c', padding: '12px' } },
        'Đang kết nối và tải dữ liệu từ CVAT, vui lòng chờ trong giây lát…'
      ));
      const off = store ? store.on('load', () => {
        off();
        if (app.currentTab === 'case2') app.switchTab('case2', initialTrackId);
      }) : () => {};
      return { refresh() {}, unmount() { off(); } };
    }

    const S = (app.settings.case2 ||= {
      zoom: { top: 1, side: 1, front: 1 }, pointSize: 2.5, slab: 1, hideGround: false, allowTilt: true,
      context: true, syncSize: false, rowH: 220, showImage: true, camIdx: 0, minIntensity: 0.0,
      cropMargin: 0.0, colorByIntensity: false, maxDistM: 80, trackStates: {},
    });
    if (S.allowTilt === undefined) S.allowTilt = true;
    if (S.cropMargin === undefined) S.cropMargin = 0.0;
    if (S.colorByIntensity === undefined) S.colorByIntensity = false;
    if (S.maxDistM === undefined) S.maxDistM = 80;
    if (S.heatmapGain === undefined) S.heatmapGain = 1.2;
    if (S.colorMode === undefined) S.colorMode = S.colorByIntensity ? 'heat' : 'label';
    S.trackStates ||= {};

    const frameData = app.getFrames();
    const tracks = [...store.tracks.values()].sort((a, b) => a.uiId - b.uiId);
    if (!tracks.length) {
      root.append(h('div', { class: 'bar', style: { color: '#8c8c8c' } }, 'Job này không có track cuboid nào.'));
      return { unmount() {} };
    }

    let track = store.track(initialTrackId ?? app.currentTrackId) || tracks[0];
    let grid = null;
    let rows = new Map();
    let selectedFrames = new Set();
    let lastSelectedFrame = null;
    let isDragSelecting = false;
    let dragStartFrame = null;
    let dragAnchorSelection = new Set();
    let startDragBoxes = new Map();
    let selectKfBtn = null;
    let selectZeroPtsBtn = null;
    let selectFarBtn = null;
    let camCheckLabel = null;
    let track2dBtn = null;
    let currentCvatFrame = null;
    const settings = { ...S, refSize: [1, 1, 1], color: '#3fb950' };

    // ---------- Thanh công cụ trên ----------
    const trackSel = h('select', { onchange: () => openTrack(store.track(Number(trackSel.value))) },
      tracks.map((t) => h('option', { value: t.id }, `#${t.uiId} · ${store.labelName(t.labelId)} (f${t.firstFrame}–f${t.lastFrame})`)));
    const fromIn = h('input', { type: 'number', style: { width: '52px' }, onchange: () => saveTrackUiState() });
    const toIn = h('input', { type: 'number', style: { width: '52px' }, onchange: () => saveTrackUiState() });
    const camSel = h('select', {
      title: 'Chọn góc camera đối chiếu',
      onchange: () => { S.camIdx = Number(camSel.value); reloadVisibleImages(); }
    }, h('option', { value: 0 }, 'Cam #0'));

    const cropSel = h('select', {
      title: 'Giới hạn vùng hiển thị đám mây điểm 3D xung quanh hộp (loại bỏ cây cối/tường/xe khác ở xa)',
      onchange: () => {
        S.cropMargin = Number(cropSel.value);
        settings.cropMargin = S.cropMargin;
        renderAll();
      }
    },
      [
        { v: 0, label: 'Tất cả' },
        { v: 0.3, label: '+0.3m' },
        { v: 0.5, label: '+0.5m' },
        { v: 1.0, label: '+1.0m' },
        { v: 2.0, label: '+2.0m' },
        { v: 4.0, label: '+4.0m' },
      ].map((o) => h('option', { value: o.v, selected: Number(S.cropMargin) === o.v }, o.label))
    );

    const distThreshIn = h('input', {
      type: 'number',
      min: '1',
      max: '500',
      step: '5',
      value: String(S.maxDistM || 80),
      style: { width: '42px', padding: '2px 4px', textAlign: 'center' },
      title: 'Ngưỡng khoảng cách từ gốc LiDAR (0,0) tới tâm Cuboid (m) — Mặc định 80m theo Guideline',
      onchange: () => {
        S.maxDistM = Math.max(1, Number(distThreshIn.value) || 80);
        for (const r of rows.values()) r.refresh(false);
        updateSelectionUI();
      }
    });

    const ptSizeVal = h('span', { style: { fontSize: '11px', color: '#8c8c8c', minWidth: '18px', fontVariantNumeric: 'tabular-nums' } }, `${Number(S.pointSize || 2.5).toFixed(1)}`);
    const ptSizeIn = h('input', {
      type: 'range',
      min: '1.0',
      max: '7.0',
      step: '0.5',
      value: String(S.pointSize || 2.5),
      style: { width: '52px' },
      title: 'Điều chỉnh kích thước hạt điểm LiDAR (1.0 - 7.0 px). Tăng lên để hạt to, đậm, rõ nét hơn',
      oninput: (e) => {
        const v = Number(e.target.value);
        S.pointSize = v;
        settings.pointSize = v;
        ptSizeVal.textContent = v.toFixed(1);
        renderAll();
      }
    });

    const pfill = h('div', { style: { height: '100%', background: '#177ddc', width: '0%', transition: 'width 0.2s' } });
    const ptext = h('span', { style: { position: 'absolute', inset: 0, textAlign: 'center', fontSize: '11px', lineHeight: '18px', color: '#fff' } });
    const pbar = h('div', { style: { position: 'relative', width: '170px', height: '18px', background: '#141414', border: '1px solid #434343', borderRadius: '3px', overflow: 'hidden' }, hidden: true }, pfill, ptext);

    const check = (key, text, title, after) => h('label', { title, style: { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' } },
      h('input', { type: 'checkbox', checked: !!S[key], onchange: (e) => { S[key] = e.target.checked; settings[key] = S[key]; after?.(); renderAll(); } }), text);

    const batchBar = h('div', { class: 'batch-bar', hidden: true });
    const head = h('div', { class: 'c2-head' },
      h('span', {}, 'Thông tin Track & Frame'),
      h('span', { class: 'c2-head-cam' }, 'Camera'),
      h('span', { title: 'Nhấn giữ Chuột phải (hoặc Alt+Kéo chuột trái) để xoay góc nhìn 3D tạm thời!' }, 'Top View (Z) · Giữ chuột phải xoay 3D'),
      h('span', { title: 'Nhấn giữ Chuột phải (hoặc Alt+Kéo chuột trái) để xoay góc nhìn 3D tạm thời!' }, 'Side View (Y) · Giữ chuột phải xoay 3D'),
      h('span', { title: 'Nhấn giữ Chuột phải (hoặc Alt+Kéo chuột trái) để xoay góc nhìn 3D tạm thời!' }, 'Front View (X) · Giữ chuột phải xoay 3D')
    );
    const scroller = h('div', { class: 'c2-scroll' });
    scroller.addEventListener('scroll', () => {
      if (track && S.trackStates[track.id]) {
        S.trackStates[track.id].scrollTop = scroller.scrollTop;
      }
    }, { passive: true });
    const wrap = h('div', { class: 'c2-wrap' }, scroller);

    function saveTrackUiState() {
      if (!track) return;
      S.trackStates[track.id] = {
        from: Number(fromIn.value) || store.frames[0],
        to: Number(toIn.value) || store.frames[store.frames.length - 1],
        selected: [...selectedFrames],
        lastSelectedFrame,
        scrollTop: scroller.scrollTop,
      };
    }

    function applyLayout() {
      root.style.setProperty('--row-h', `${S.rowH}px`);
      const hasCam = frameData.hasContextImages !== false && S.showImage;
      root.style.setProperty('--img-col', hasCam ? '1.15fr' : '0px');
      root.classList.toggle('no-cam-mode', !hasCam);
      grid?.resize();
    }

    // Cụm 1: Điều hướng & Lọc Frame
    const groupNav = h('div', { class: 'c2-group', title: 'Cụm 1: Điều hướng Track & Lọc khoảng Frame' },
      h('label', { style: { fontWeight: 600, color: '#fff' } }, 'Track:', trackSel),
      h('span', { class: 'divider' }),
      h('label', {}, 'Frame:', fromIn, '→', toIn),
      h('button', {
        onclick: () => buildRows(false),
        title: 'Lọc danh sách theo khoảng Frame đã nhập',
        style: { display: 'inline-flex', alignItems: 'center', gap: '4px' }
      }, SP.icons.filterList(11), 'Lọc')
    );

    // Cụm 2: Dropdown Quy chuẩn Kích thước
    const sizeDropdownBtn = h('button', {
      class: 'c2-btn-dropdown',
      title: 'Quản lý Profile kích thước, Khóa L/W/H và Cho phép nghiêng Pitch/Roll',
      onclick: (e) => showSizeDropdown(e.currentTarget)
    }, SP.icons.cube(12), 'Kích thước ▾');

    // Cụm 3: Dropdown Chọn hàng loạt
    const selDropdownBtn = h('button', {
      class: 'c2-btn-dropdown',
      title: 'Chọn lọc nhanh: Keyframes, 0 điểm LiDAR, Khoảng cách xa...',
      onclick: (e) => showSelectionDropdown(e.currentTarget)
    }, SP.icons.selectBox ? SP.icons.selectBox(12) : SP.icons.check(12), 'Chọn lọc ▾');

    // Cụm 4: Dropdown Cấu hình Hiển thị 3D & Cam
    const viewDropdownBtn = h('button', {
      class: 'c2-btn-dropdown',
      title: 'Cắt 3D, Ẩn đất, Heatmap phản xạ, Cỡ hạt điểm, Lọc nhiễu, Camera...',
      onclick: (e) => showViewOptionsDropdown(e.currentTarget)
    }, SP.icons.sliders ? SP.icons.sliders(12) : SP.icons.gear(12), 'Hiển thị ▾');

    track2dBtn = h('button', {
      title: 'Mở trình Theo dõi Ảnh 2D liên tục qua các Frame & Dò Tách ID cho Track này',
      style: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 7px', fontSize: '11px' },
      onclick: () => {
        if (frameData.hasContextImages === false) {
          app.setStatus('Job này là dữ liệu LiDAR PCD thuần, không có ảnh Camera 2D', 'err');
        }
        app.switchTab('case4', { frame: track?.firstFrame ?? store.frames[0], trackId: track?.id });
      }
    }, SP.icons.camera(12), 'Theo dõi 2D');

    const reloadPcdBtn = h('button', {
      title: 'Xóa cache RAM và tải lại toàn bộ Point Cloud từ máy chủ CVAT',
      style: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 7px', fontSize: '11px' },
      onclick: () => {
        frameData.reload();
        buildRows(true);
        app.setStatus('Đang tải lại dữ liệu Point Cloud...', 'ok');
      }
    }, SP.icons.refresh(12), 'Tải lại PCD');

    root.append(
      h('div', { class: 'bar', style: { gap: '6px', alignItems: 'center', flexWrap: 'nowrap', overflow: 'visible' } },
        groupNav,
        sizeDropdownBtn,
        selDropdownBtn,
        viewDropdownBtn,
        track2dBtn,
        reloadPcdBtn,
        pbar
      ),
      batchBar,
      head,
      wrap
    );
    applyLayout();

    // Tự động nhận diện dataset PCD thuần để tối ưu không gian hiển thị LiDAR 100%
    frameData.checkHasImages().then((hasImgs) => {
      if (!hasImgs) {
        S.showImage = false;
        if (camCheckLabel) {
          camCheckLabel.style.opacity = '0.4';
          camCheckLabel.title = 'Job này là dữ liệu LiDAR PCD thuần, không có ảnh Camera 2D';
          const inEl = camCheckLabel.querySelector('input');
          if (inEl) inEl.disabled = true;
        }
        if (camSel) camSel.style.display = 'none';
        if (track2dBtn) {
          track2dBtn.style.opacity = '0.55';
          track2dBtn.title = 'Job này là dữ liệu LiDAR PCD thuần, không có ảnh Camera 2D (nhấn để xem chi tiết)';
        }
        applyLayout();
      }
    });

    function renderAll() {
      grid?.requestRender();
    }

    function refSizeOf(t) {
      const s = [0, 0, 0];
      for (const sh of t.shapes) for (let i = 0; i < 3; i++) s[i] = Math.max(s[i], sh.points[6 + i]);
      return s.map((v) => Math.max(v, 0.3));
    }

    function getCloud(frame) {
      const full = frameData.clouds.get(frame);
      if (!full || !full.xyz) return null;
      return full;
    }

    // ---------- 1. QUẢN LÝ CẤU HÌNH KÍCH THƯỚC (Named Size Profiles) ----------
    function openProfileManagerModal() {
      const pm = store.profileManager;
      if (!pm) return;
      const overlay = h('div', {
        style: {
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(3px)',
          zIndex: 2147483020,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }
      });
      const content = h('div', { class: 'prof-modal' });

      function renderProfiles() {
        content.replaceChildren();
        const profiles = pm.getProfiles(track.id);

        const title = h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #303030', paddingBottom: '8px' } },
          h('span', { style: { color: '#fff', fontSize: '14px', fontWeight: 600 } }, `Cấu hình Kích thước · Track #${track.uiId}`),
          h('button', {
            style: { background: 'transparent', border: 0, color: '#8c8c8c', cursor: 'pointer', padding: '0 4px', display: 'inline-flex', alignItems: 'center' },
            title: 'Đóng',
            onclick: () => overlay.remove()
          }, SP.icons.close(14))
        );

        const desc = h('div', { style: { fontSize: '12px', color: '#8c8c8c', marginBottom: '14px', lineHeight: '1.5' } },
          'Gán tên và kích thước chuẩn theo trạng thái (Đứng, Ngồi, Xe có thùng, Đầu kéo...). Khi chỉnh sửa kích thước 1 frame, các frame khác cùng cấu hình sẽ tự động đồng bộ theo.'
        );

        const listEl = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto', marginBottom: '14px' } });

        if (!profiles.length) {
          listEl.append(h('div', { style: { padding: '24px', textAlign: 'center', color: '#8c8c8c', fontSize: '12px', border: '1px dashed #303030', borderRadius: '4px' } },
            'Chưa có cấu hình nào. Bấm nút "+ Thêm Cấu hình Mới" để tạo cấu hình đầu tiên.'
          ));
        } else {
          for (const p of profiles) {
            const assignedCount = pm.getFramesWithProfile(track.id, p.id).length;

            const nameIn = h('input', {
              type: 'text',
              value: p.name,
              style: { width: '130px', padding: '4px 8px', background: '#1f1f1f', border: '1px solid #434343', borderRadius: '2px', color: '#fff', fontSize: '12px' }
            });
            nameIn.onchange = () => {
              pm.updateProfile(track.id, p.id, { name: nameIn.value.trim() || p.name });
              afterEdit(false);
            };

            const lIn = h('input', { type: 'number', step: '0.05', value: p.size[0].toFixed(2), style: { width: '50px', padding: '4px 6px', background: '#1f1f1f', border: '1px solid #434343', borderRadius: '2px', color: '#fff', fontSize: '12px', textAlign: 'center' }, title: 'Chiều dài (L)' });
            const wIn = h('input', { type: 'number', step: '0.05', value: p.size[1].toFixed(2), style: { width: '50px', padding: '4px 6px', background: '#1f1f1f', border: '1px solid #434343', borderRadius: '2px', color: '#fff', fontSize: '12px', textAlign: 'center' }, title: 'Chiều rộng (W)' });
            const hIn = h('input', { type: 'number', step: '0.05', value: p.size[2].toFixed(2), style: { width: '50px', padding: '4px 6px', background: '#1f1f1f', border: '1px solid #434343', borderRadius: '2px', color: '#fff', fontSize: '12px', textAlign: 'center' }, title: 'Chiều cao (H)' });

            const onSizeChange = () => {
              const newSize = [Number(lIn.value) || p.size[0], Number(wIn.value) || p.size[1], Number(hIn.value) || p.size[2]];
              pm.updateProfile(track.id, p.id, { size: newSize });
              const assigned = pm.getFramesWithProfile(track.id, p.id);
              if (assigned.length) {
                track.applyProfile(assigned, newSize);
                afterEdit();
              }
            };
            lIn.onchange = onSizeChange;
            wIn.onchange = onSizeChange;
            hIn.onchange = onSizeChange;

            const applyBtn = h('button', {
              style: { padding: '4px 8px', fontSize: '11px', background: '#262626', border: '1px solid #434343', borderRadius: '2px', color: '#d9d9d9', cursor: 'pointer' },
              title: `Áp dụng kích thước này cho ${assignedCount} frame đang theo cấu hình`,
              onclick: () => {
                const assigned = pm.getFramesWithProfile(track.id, p.id);
                if (assigned.length) {
                  track.applyProfile(assigned, p.size);
                  afterEdit();
                  app.setStatus(`Đã áp dụng kích thước cấu hình "${p.name}" cho ${assigned.length} frames`, 'ok');
                } else {
                  app.setStatus(`Chưa có frame nào gán cấu hình "${p.name}"`, 'err');
                }
              }
            }, `Áp dụng (${assignedCount}f)`);

            const delBtn = h('button', {
              style: { padding: '4px 8px', fontSize: '11px', color: '#ff7875', background: 'transparent', border: '1px solid #434343', borderRadius: '2px', cursor: 'pointer' },
              title: 'Xóa cấu hình này (các frame sẽ về mặc định)',
              onclick: () => {
                pm.deleteProfile(track.id, p.id);
                renderProfiles();
                afterEdit(false);
              }
            }, 'Xóa');

            const dot = h('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: p.color, display: 'inline-block' } });

            const row = h('div', { class: 'prof-row' },
              dot,
              nameIn,
              h('div', { style: { display: 'flex', gap: '3px', alignItems: 'center' } }, lIn, '×', wIn, '×', hIn),
              h('div', { style: { display: 'flex', gap: '4px' } }, applyBtn, delBtn)
            );
            listEl.append(row);
          }
        }

        const addBtn = h('button', {
          class: 'primary',
          style: { width: '100%', padding: '7px 12px', fontSize: '12px', background: '#177ddc', color: '#fff', border: 0, borderRadius: '2px', cursor: 'pointer', fontWeight: 500 },
          onclick: () => {
            const curPos = track.at(fromIn.value || track.firstFrame);
            const refS = curPos ? curPos.box.s : [1, 1, 1];
            pm.createProfile(track.id, `Cấu hình ${profiles.length + 1}`, refS);
            renderProfiles();
            afterEdit(false);
          }
        }, '+ Thêm Cấu hình Mới');

        content.append(title, desc, listEl, addBtn);
      }

      renderProfiles();
      overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
      overlay.append(content);
      root.append(overlay);
    }

    // ---------- LỚP 2: MODAL XÁC NHẬN CẤP BÁCH (Critical Danger Confirmation) ----------
    function openCriticalConfirmModal(parentOverlay, originalTracks, draftMap) {
      const confirmOverlay = h('div', {
        style: {
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(6px)',
          zIndex: 2147483030,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }
      });

      const confirmModal = h('div', {
        style: {
          background: '#1f1f1f',
          border: '1px solid #faad14',
          borderRadius: '6px',
          padding: '22px 26px',
          width: '520px',
          maxWidth: '92vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
          overscrollBehavior: 'contain',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.95)',
          color: '#d9d9d9',
          fontFamily: 'inherit',
          fontSize: '12px',
        }
      });

      // Lọc danh sách thay đổi
      const changes = originalTracks.filter((t) => draftMap.get(t.key) !== t.key);

      const header = h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
        h('span', {
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '34px',
            height: '34px',
            borderRadius: '4px',
            background: 'rgba(212, 136, 6, 0.15)',
            border: '1px solid #d48806',
            color: '#faad14',
            flexShrink: 0
          }
        }, SP.icons.warning(18)),
        h('div', {},
          h('div', { style: { color: '#faad14', fontSize: '14px', fontWeight: 600, letterSpacing: '0.3px' } }, 'XÁC NHẬN SỬA ĐỔI THỨ TỰ TRACK ID'),
          h('div', { style: { color: '#8c8c8c', fontSize: '11px', marginTop: '2px' } }, 'Thao tác cấp bách · Can thiệp trực tiếp bộ nhớ RAM CVAT')
        )
      );

      // Danh sách Diff tóm tắt
      const diffBox = h('div', {
        style: {
          background: '#141414',
          border: '1px solid #303030',
          borderRadius: '4px',
          padding: '10px 14px',
          maxHeight: '160px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: '11px',
          fontVariantNumeric: 'tabular-nums'
        }
      });

      changes.slice(0, 10).forEach((tr) => {
        const lName = store.labelName(tr.labelId);
        const lColor = store.labelColor(tr.labelId);
        const oldId = tr.key;
        const newId = draftMap.get(oldId);
        diffBox.append(
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            h('span', { style: { width: '6px', height: '6px', borderRadius: '50%', background: lColor } }),
            h('span', { style: { color: '#bfbfbf', minWidth: '85px', fontWeight: 500 } }, lName),
            h('span', {
              style: {
                background: '#1f1f1f',
                border: '1px solid #383838',
                borderRadius: '2px',
                padding: '0 6px',
                color: '#8c8c8c',
                fontSize: '10px'
              }
            }, `ID Hiện tại #${oldId}`),
            h('span', { style: { display: 'inline-flex', alignItems: 'center', color: '#177ddc' } }, SP.icons.arrowRight(12)),
            h('span', {
              style: {
                background: 'rgba(82, 196, 26, 0.15)',
                border: '1px solid rgba(82, 196, 26, 0.45)',
                borderRadius: '2px',
                padding: '0 6px',
                color: '#73d13d',
                fontWeight: 600,
                fontSize: '10px'
              }
            }, `ID MỚI #${newId}`)
          )
        );
      });

      if (changes.length > 10) {
        diffBox.append(
          h('div', { style: { color: '#8c8c8c', fontStyle: 'italic', paddingTop: '4px', fontSize: '10.5px' } },
            `... và ${changes.length - 10} track khác (Tổng cộng có ${changes.length} track sẽ đổi ID).`
          )
        );
      }

      const warningText = h('div', { style: { color: '#8c8c8c', fontSize: '11px', lineHeight: '1.5' } },
        'Sau khi xác nhận, toàn bộ định danh Track ID sẽ được ghi đè trực tiếp vào RAM của CVAT và dữ liệu sẽ chuyển sang trạng thái ',
        h('b', { style: { color: '#ff7875' } }, 'Chưa lưu (Dirty)'),
        '. Bạn cần bấm ',
        h('b', { style: { color: '#fff' } }, 'Lưu CVAT (Ctrl + S)'),
        ' để đồng bộ lên Server.'
      );

      // Checkbox cam kết an toàn
      const confirmChk = h('input', {
        type: 'checkbox',
        style: { cursor: 'pointer', accentColor: '#177ddc', width: '15px', height: '15px', margin: 0 }
      });
      const confirmLabel = h('label', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(212, 136, 6, 0.08)',
          border: '1px solid #594214',
          borderRadius: '4px',
          padding: '8px 10px',
          cursor: 'pointer',
          color: '#fff',
          fontWeight: 500,
          userSelect: 'none'
        }
      },
        confirmChk,
        h('span', {}, `Tôi đã kiểm tra kỹ và chắc chắn muốn đổi ID cho ${changes.length} track này`)
      );

      const footer = h('div', {
        style: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #303030', paddingTop: '12px' }
      });

      const backBtn = h('button', {
        style: { padding: '6px 14px', background: '#262626', border: '1px solid #434343', color: '#d9d9d9', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' },
        onclick: () => confirmOverlay.remove()
      }, 'Hủy bỏ');

      const applyBtn = h('button', {
        class: 'danger',
        style: {
          padding: '6px 16px',
          background: '#a61d24',
          border: '1px solid #ff4d4f',
          color: '#fff',
          fontWeight: 600,
          borderRadius: '3px',
          cursor: 'not-allowed',
          opacity: 0.4,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11px'
        },
        disabled: true,
        onclick: async () => {
          confirmOverlay.remove();
          parentOverlay.remove();

          app.setStatus(`Đang tái cấu trúc thứ tự ID cho ${changes.length} track trong RAM CVAT...`, 'info');
          const assignments = changes.map((t) => ({ oldId: t.key, newId: draftMap.get(t.key) }));

          try {
            await store.reassignTrackIDs(assignments);
            afterEdit();
            app.setStatus(`Đã cập nhật thứ tự ID thành công (${assignments.length} track)! Vui lòng bấm LƯU (Ctrl+S).`, 'ok');
          } catch (err) {
            console.error('[CVAT Super Pro] Sắp xếp ID thất bại:', err);
            app.setStatus(`Lỗi khi sắp xếp ID: ${err.message || err}`, 'err');
          }
        }
      }, SP.icons.shield(13), 'Xác nhận & Đồng bộ vào RAM');

      confirmChk.onchange = () => {
        applyBtn.disabled = !confirmChk.checked;
        applyBtn.style.opacity = confirmChk.checked ? '1' : '0.4';
        applyBtn.style.cursor = confirmChk.checked ? 'pointer' : 'not-allowed';
      };

      confirmOverlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          confirmOverlay.remove();
        }
      });

      footer.append(backBtn, applyBtn);
      confirmModal.append(header, diffBox, warningText, confirmLabel, footer);
      confirmOverlay.append(confirmModal);
      root.append(confirmOverlay);
    }

    // ---------- LỚP 1: BẢNG QUẢN LÝ THỨ TỰ TRACK ID (Re-order / Swap / Cascade Shift) ----------
    function openTrackIdManagerModal() {
      if (!store || !store.tracks) return;

      const overlay = h('div', {
        style: {
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(4px)',
          zIndex: 2147483020,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }
      });

      const modalEl = h('div', {
        style: {
          background: '#1f1f1f',
          border: '1px solid #434343',
          borderRadius: '6px',
          padding: '18px 22px',
          width: '680px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          boxSizing: 'border-box',
          overscrollBehavior: 'contain',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
          color: '#d9d9d9',
          fontFamily: 'inherit',
          fontSize: '12px',
        }
      });

      // Lấy danh sách track hiện tại sắp xếp theo key tăng dần
      const originalTracks = [...store.tracks.values()].sort((a, b) => a.key - b.key);
      if (!originalTracks.length) {
        app.setStatus('Không tìm thấy track nào để quản lý ID', 'warn');
        return;
      }

      // Bản nháp ID Map: Map<oldId, newId>
      const draftMap = new Map();
      for (const tr of originalTracks) {
        draftMap.set(tr.key, tr.key);
      }

      let searchQuery = '';
      let conflictTargetId = null;

      function renderContent() {
        modalEl.replaceChildren();

        // 1. Tiêu đề & Tag cảnh báo chuẩn Ant Design Dark
        const header = h('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #303030',
            paddingBottom: '10px'
          }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            SP.icons.cube(15),
            h('span', { style: { color: '#fff', fontSize: '13px', fontWeight: 600 } }, 'Quản lý & Sửa đổi Thứ tự Track ID'),
            h('span', {
              style: {
                background: 'rgba(212, 136, 6, 0.12)',
                border: '1px solid #594214',
                color: '#faad14',
                fontSize: '9px',
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: '2px',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }
            }, SP.icons.warning(10), 'CẤP BÁCH / GUIDELINE')
          ),
          h('button', {
            style: { background: 'transparent', border: 0, color: '#8c8c8c', cursor: 'pointer', padding: '2px 4px', display: 'inline-flex', alignItems: 'center' },
            title: 'Đóng (Hủy bỏ - Esc)',
            onclick: () => overlay.remove()
          }, SP.icons.close(14))
        );

        // 2. Banner hướng dẫn phong cách Alert kỹ thuật
        const banner = h('div', {
          style: {
            background: 'rgba(212, 136, 6, 0.08)',
            border: '1px solid #594214',
            borderRadius: '4px',
            padding: '8px 12px',
            fontSize: '11px',
            color: '#d9d9d9',
            lineHeight: '1.5',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }
        },
          h('span', { style: { color: '#faad14', flexShrink: 0, marginTop: '2px', display: 'flex' } }, SP.icons.warning(14)),
          h('div', {},
            h('b', { style: { color: '#faad14' } }, 'Lưu ý cấp bách: '),
            'Tính năng này can thiệp trực tiếp vào thứ tự định danh Track ID trong RAM CVAT để khôi phục các ID prelabel bị thiếu theo Guideline của dự án. Sau khi sắp xếp xong, bạn cần bấm lưu để ghi đè vào hệ thống.'
          )
        );

        // 3. Toolbar mini: Điền khuyết, Đánh số 1..N, Khôi phục (100% Monochrome Vector SVG)
        const toolsRow = h('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap'
          }
        });

        const autoFillGapsBtn = h('button', {
          class: 'c2-btn-dropdown',
          style: { background: '#1c2834', borderColor: '#177ddc', color: '#58a6ff', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '5px' },
          title: 'Tự động phát hiện các số ID bị thiếu trong chuỗi (ví dụ thiếu #3) và gán lấp vào từ các track mới ở cuối',
          onclick: () => {
            const currentDraftIds = new Set(draftMap.values());
            const maxId = Math.max(...currentDraftIds);
            const missing = [];
            for (let i = 1; i <= maxId; i++) {
              if (!currentDraftIds.has(i)) missing.push(i);
            }
            if (!missing.length) {
              app.setStatus('Không phát hiện số ID nào bị khuyết trong chuỗi hiện tại', 'ok');
              return;
            }
            const sortedByDraft = [...originalTracks].sort((a, b) => draftMap.get(b.key) - draftMap.get(a.key));
            let fillIdx = 0;
            for (const tr of sortedByDraft) {
              if (fillIdx >= missing.length) break;
              const curDraft = draftMap.get(tr.key);
              if (curDraft > missing[fillIdx]) {
                draftMap.set(tr.key, missing[fillIdx]);
                fillIdx++;
              }
            }
            conflictTargetId = null;
            renderContent();
            app.setStatus(`Đã tự động lấp ${fillIdx} số ID khuyết (${missing.slice(0, fillIdx).join(', ')})`, 'ok');
          }
        }, SP.icons.zap(12), 'Lấp ID khuyết (Fill Gaps)');

        const reindexBtn = h('button', {
          class: 'c2-btn-dropdown',
          style: { display: 'inline-flex', alignItems: 'center', gap: '5px' },
          title: 'Đánh lại số thứ tự từ 1 đến N theo thứ tự xuất hiện của frame (hoặc thứ tự hiện tại)',
          onclick: () => {
            const sortedByFrame = [...originalTracks].sort((a, b) => a.firstFrame - b.firstFrame || a.key - b.key);
            sortedByFrame.forEach((tr, idx) => {
              draftMap.set(tr.key, idx + 1);
            });
            conflictTargetId = null;
            renderContent();
            app.setStatus(`Đã đánh số liên tục từ 1 đến ${originalTracks.length}`, 'ok');
          }
        }, SP.icons.list(12), 'Đánh số 1..N (Reindex)');

        const resetBtn = h('button', {
          class: 'c2-btn-dropdown',
          style: { display: 'inline-flex', alignItems: 'center', gap: '5px' },
          title: 'Khôi phục lại toàn bộ ID về nguyên bản ban đầu',
          onclick: () => {
            for (const tr of originalTracks) draftMap.set(tr.key, tr.key);
            conflictTargetId = null;
            renderContent();
            app.setStatus('Đã khôi phục toàn bộ ID về ban đầu', 'ok');
          }
        }, SP.icons.rotateCcw(12), 'Khôi phục ban đầu');

        const searchIn = h('input', {
          type: 'text',
          placeholder: 'Tìm kiếm label/ID...',
          value: searchQuery,
          style: {
            width: '140px',
            padding: '3px 8px 3px 24px',
            background: '#141414',
            border: '1px solid #434343',
            borderRadius: '3px',
            color: '#fff',
            fontSize: '11px'
          },
          oninput: (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            renderTableBody();
          }
        });

        const searchBox = h('div', {
          style: { position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 'auto' }
        },
          h('span', { style: { position: 'absolute', left: '7px', color: '#595959', display: 'flex', pointerEvents: 'none' } }, SP.icons.search(11)),
          searchIn
        );

        toolsRow.append(autoFillGapsBtn, reindexBtn, resetBtn, searchBox);

        // 4. Bảng danh sách Track
        const tableContainer = h('div', {
          style: {
            flex: 1,
            minHeight: '120px',
            maxHeight: '360px',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            boxSizing: 'border-box',
            border: '1px solid #303030',
            borderRadius: '4px',
            background: '#141414'
          }
        });

        const table = h('table', {
          style: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }
        });

        const thead = h('thead', {
          style: {
            position: 'sticky',
            top: 0,
            background: '#1f1f1f',
            borderBottom: '1px solid #434343',
            color: '#8c8c8c',
            fontWeight: 600,
            zIndex: 1
          }
        },
          h('tr', {},
            h('th', { style: { padding: '8px 10px', width: '130px' } }, 'Phân loại Label'),
            h('th', { style: { padding: '8px 10px', width: '120px' } }, 'Khoảng Frame'),
            h('th', { style: { padding: '8px 10px', width: '90px', textAlign: 'center' } }, 'ID Hiện tại'),
            h('th', { style: { padding: '8px 10px', width: '100px', textAlign: 'center' } }, 'ID MỚI'),
            h('th', { style: { padding: '8px 10px' } }, 'Trạng thái')
          )
        );

        const tbody = h('tbody');
        table.append(thead, tbody);
        tableContainer.append(table);

        function validateDraft() {
          const countMap = new Map();
          let hasInvalid = false;
          for (const [oldId, newId] of draftMap.entries()) {
            if (!Number.isInteger(newId) || newId <= 0) {
              hasInvalid = true;
            }
            countMap.set(newId, (countMap.get(newId) || 0) + 1);
          }
          const duplicateIds = new Set();
          for (const [newId, cnt] of countMap.entries()) {
            if (cnt > 1) duplicateIds.add(newId);
          }
          return { hasInvalid, duplicateIds, hasDuplicates: duplicateIds.size > 0 };
        }

        function renderTableBody() {
          tbody.replaceChildren();
          const { duplicateIds } = validateDraft();

          const filteredTracks = originalTracks.filter((tr) => {
            if (!searchQuery) return true;
            const lName = store.labelName(tr.labelId).toLowerCase();
            const curIdStr = String(tr.key);
            const draftIdStr = String(draftMap.get(tr.key));
            return lName.includes(searchQuery) || curIdStr.includes(searchQuery) || draftIdStr.includes(searchQuery);
          });

          for (const tr of filteredTracks) {
            const oldId = tr.key;
            const newId = draftMap.get(oldId);
            const isChanged = (newId !== oldId);
            const isDup = duplicateIds.has(newId);

            const row = h('tr', {
              style: {
                borderBottom: '1px solid #262626',
                background: isDup ? 'rgba(255, 77, 79, 0.08)' : (isChanged ? 'rgba(23, 125, 220, 0.08)' : 'transparent'),
                transition: 'background 0.1s'
              }
            });

            const lColor = store.labelColor(tr.labelId);
            const lName = store.labelName(tr.labelId);
            const labelCell = h('td', { style: { padding: '6px 10px' } },
              h('span', {
                style: {
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 500,
                  color: '#fff'
                }
              },
                h('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: lColor } }),
                lName
              )
            );

            const rangeCell = h('td', { style: { padding: '6px 10px', color: '#8c8c8c', fontVariantNumeric: 'tabular-nums' } },
              `f${tr.firstFrame}→f${tr.lastFrame} (${tr.shapes.length}f)`
            );

            const curIdCell = h('td', { style: { padding: '6px 10px', textAlign: 'center', fontWeight: 600, color: '#8c8c8c' } },
              `#${oldId}`
            );

            const idInput = h('input', {
              type: 'number',
              min: '1',
              max: '99999',
              value: newId,
              style: {
                width: '56px',
                padding: '3px 6px',
                background: isDup ? '#2a1215' : (isChanged ? '#0c2135' : '#141414'),
                border: `1px solid ${isDup ? '#ff4d4f' : (isChanged ? '#177ddc' : '#434343')}`,
                borderRadius: '3px',
                color: isDup ? '#ff7875' : '#fff',
                fontWeight: 600,
                textAlign: 'center',
                fontVariantNumeric: 'tabular-nums'
              },
              oninput: (e) => {
                const parsed = parseInt(e.target.value, 10);
                if (!Number.isNaN(parsed) && parsed > 0) {
                  draftMap.set(oldId, parsed);
                  const othersWithSameId = originalTracks.filter((t) => t.key !== oldId && draftMap.get(t.key) === parsed);
                  if (othersWithSameId.length) {
                    conflictTargetId = parsed;
                  } else {
                    conflictTargetId = null;
                  }
                }
                updateUIState();
              },
              onkeydown: (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const allInputs = [...tbody.querySelectorAll('input[type="number"]')];
                  const idx = allInputs.indexOf(idInput);
                  if (idx >= 0 && idx < allInputs.length - 1) {
                    allInputs[idx + 1].focus();
                    allInputs[idx + 1].select();
                  }
                }
              }
            });
            const newIdCell = h('td', { style: { padding: '6px 10px', textAlign: 'center' } }, idInput);

            let statusBadge;
            if (isDup) {
              statusBadge = h('span', {
                style: {
                  background: 'rgba(255, 77, 79, 0.15)',
                  border: '1px solid rgba(255, 77, 79, 0.45)',
                  borderRadius: '2px',
                  padding: '1px 6px',
                  color: '#ff7875',
                  fontWeight: 500,
                  fontSize: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }
              }, SP.icons.warning(10), `Trùng ID #${newId}`);
            } else if (isChanged) {
              statusBadge = h('span', {
                style: {
                  background: 'rgba(23, 125, 220, 0.15)',
                  border: '1px solid rgba(23, 125, 220, 0.45)',
                  borderRadius: '2px',
                  padding: '1px 6px',
                  color: '#58a6ff',
                  fontWeight: 500,
                  fontSize: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }
              }, SP.icons.arrowRight(10), `Đổi thành #${newId}`);
            } else {
              statusBadge = h('span', { style: { color: '#595959', fontSize: '10px', padding: '1px 6px' } }, 'Giữ nguyên');
            }
            const statusCell = h('td', { style: { padding: '6px 10px' } }, statusBadge);

            row.append(labelCell, rangeCell, curIdCell, newIdCell, statusCell);
            tbody.append(row);
          }
        }

        renderTableBody();

        // 5. Khối trợ giúp Dồn toa khi có xung đột (Alert Style)
        const conflictBar = h('div', {
          style: {
            display: 'none',
            background: 'rgba(212, 136, 6, 0.1)',
            border: '1px solid #d48806',
            borderRadius: '4px',
            padding: '8px 12px',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            gap: '8px'
          }
        });

        // 6. Footer với Nút HỦY BỎ và Nút LƯU THỨ TỰ
        const footer = h('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #303030',
            paddingTop: '12px',
            marginTop: '4px'
          }
        });

        const validationMsg = h('span', { style: { fontSize: '11px', color: '#8c8c8c' } });
        const buttonsGroup = h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' } });

        const cancelBtn = h('button', {
          style: { padding: '6px 14px', background: '#262626', border: '1px solid #434343', color: '#d9d9d9', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' },
          onclick: () => overlay.remove()
        }, 'Hủy bỏ (Esc)');

        const saveDraftBtn = h('button', {
          class: 'primary',
          style: { padding: '6px 16px', background: '#177ddc', border: '1px solid #177ddc', color: '#fff', borderRadius: '3px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px' },
          disabled: true,
          onclick: () => {
            const { hasDuplicates, hasInvalid } = validateDraft();
            if (hasDuplicates || hasInvalid) return;
            openCriticalConfirmModal(overlay, originalTracks, draftMap);
          }
        }, SP.icons.check(12), 'LƯU THỨ TỰ MỚI...');

        buttonsGroup.append(cancelBtn, saveDraftBtn);
        footer.append(validationMsg, buttonsGroup);

        function updateUIState() {
          const { hasDuplicates, hasInvalid, duplicateIds } = validateDraft();
          renderTableBody();

          let changeCount = 0;
          for (const tr of originalTracks) {
            if (draftMap.get(tr.key) !== tr.key) changeCount++;
          }

          if (hasDuplicates) {
            saveDraftBtn.disabled = true;
            validationMsg.innerHTML = '';
            validationMsg.append(h('span', { style: { color: '#ff4d4f', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '5px' } },
              SP.icons.warning(12),
              `Không thể lưu: ID ${[...duplicateIds].map((id) => `#${id}`).join(', ')} bị trùng lặp giữa các track!`
            ));
          } else if (hasInvalid) {
            saveDraftBtn.disabled = true;
            validationMsg.innerHTML = '';
            validationMsg.append(h('span', { style: { color: '#ff4d4f', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '5px' } },
              SP.icons.warning(12),
              'Không thể lưu: Tất cả ID phải là số nguyên dương lớn hơn 0!'
            ));
          } else if (changeCount > 0) {
            saveDraftBtn.disabled = false;
            validationMsg.innerHTML = '';
            validationMsg.append(h('span', { style: { color: '#40a9ff', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '5px' } },
              SP.icons.check(12),
              `Đã thay đổi thứ tự cho ${changeCount} track. Bấm "Lưu thứ tự mới" để sang bước xác nhận.`
            ));
          } else {
            saveDraftBtn.disabled = true;
            validationMsg.innerHTML = '';
            validationMsg.append(h('span', { style: { color: '#8c8c8c' } }, 'Chưa có thay đổi nào so với ID hiện tại.'));
          }

          if (conflictTargetId != null && duplicateIds.has(conflictTargetId)) {
            conflictBar.style.display = 'flex';
            conflictBar.replaceChildren();

            const cText = h('span', { style: { color: '#faad14', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' } },
              SP.icons.warning(13),
              `Phát hiện xung đột: ID #${conflictTargetId} đang được gán cho nhiều track. Chọn cách giải quyết:`
            );

            const cActions = h('div', { style: { display: 'flex', gap: '6px' } });

            const swapBtn = h('button', {
              style: { padding: '3px 8px', background: '#262626', border: '1px solid #d48806', color: '#faad14', borderRadius: '2px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' },
              title: 'Hoán đổi ID giữa 2 track bị trùng (các track khác giữ nguyên)',
              onclick: () => {
                const originalOwner = originalTracks.find((t) => t.key === conflictTargetId);
                const usurper = originalTracks.find((t) => t.key !== conflictTargetId && draftMap.get(t.key) === conflictTargetId);
                if (originalOwner && usurper) {
                  const usurperOldId = usurper.key;
                  draftMap.set(originalOwner.key, usurperOldId);
                  conflictTargetId = null;
                  updateUIState();
                  app.setStatus(`Đã hoán đổi ID giữa Track #${originalOwner.key} và Track #${usurper.key}`, 'ok');
                }
              }
            }, SP.icons.transform(12), 'Đổi chỗ 2 track (Swap)');

            const shiftBtn = h('button', {
              style: { padding: '3px 8px', background: '#d48806', border: '1px solid #d48806', color: '#000', fontWeight: 600, borderRadius: '2px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' },
              title: 'Chèn ID này vào và tự động đẩy tất cả các track phía sau lùi 1 số (+1)',
              onclick: () => {
                const usurper = originalTracks.find((t) => draftMap.get(t.key) === conflictTargetId && t.key !== conflictTargetId);
                if (usurper) {
                  for (const tr of originalTracks) {
                    if (tr.key !== usurper.key && draftMap.get(tr.key) >= conflictTargetId) {
                      draftMap.set(tr.key, draftMap.get(tr.key) + 1);
                    }
                  }
                  conflictTargetId = null;
                  updateUIState();
                  app.setStatus(`Đã chèn và dồn toa (+1) cho các track từ #${conflictTargetId} trở đi`, 'ok');
                }
              }
            }, SP.icons.stepForward(12), 'Chèn & Dồn toa (+1)');

            cActions.append(swapBtn, shiftBtn);
            conflictBar.append(cText, cActions);
          } else {
            conflictBar.style.display = 'none';
          }
        }

        modalEl.append(header, banner, toolsRow, tableContainer, conflictBar, footer);
        updateUIState();
      }

      renderContent();
      overlay.tabIndex = -1;
      overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          overlay.remove();
        }
      });
      overlay.append(modalEl);
      root.append(overlay);
    }
    SP.openTrackIdManagerModal = openTrackIdManagerModal;

    let activePopoverClose = null;
    function bindPopoverDismiss(menu, onClosed) {
      if (activePopoverClose) activePopoverClose();
      // Chặn sự kiện chuột bên trong menu nổi bọt ra ngoài làm đóng nhầm menu
      menu.addEventListener('mousedown', (e) => e.stopPropagation());
      menu.addEventListener('pointerdown', (e) => e.stopPropagation());
      menu.addEventListener('click', (e) => e.stopPropagation());

      let closed = false;
      const rootNode = root.getRootNode();
      const close = () => {
        if (closed) return;
        closed = true;
        if (activePopoverClose === close) activePopoverClose = null;
        menu.remove();
        rootNode.removeEventListener('mousedown', onOutClick, false);
        document.removeEventListener('mousedown', onOutClick, false);
        onClosed?.();
      };
      const onOutClick = (e) => {
        if (menu.contains(e.target) || e.composedPath().includes(menu)) return;
        close();
      };
      activePopoverClose = close;
      setTimeout(() => {
        if (!closed) {
          rootNode.addEventListener('mousedown', onOutClick, false);
          document.addEventListener('mousedown', onOutClick, false);
        }
      }, 20);
      return close;
    }

    // ---------- Dropdown Menu: Chọn hàng loạt (Selection Menu) ----------
    function showSelectionDropdown(targetEl) {
      const rect = targetEl.getBoundingClientRect();
      const pos = SP.ui.getFloatingPosition(rect, 275, 360, { margin: 8 });
      const menu = h('div', {
        class: 'c2-dropdown-menu',
        style: {
          left: `${pos.left}px`,
          top: `${pos.top}px`,
          maxHeight: `${pos.maxHeight}px`,
          minWidth: '270px',
        }
      });
      const updatePos = () => {
        const curRect = targetEl.getBoundingClientRect();
        const p = SP.ui.getFloatingPosition(curRect, 275, 360, { margin: 8 });
        menu.style.left = `${p.left}px`;
        menu.style.top = `${p.top}px`;
        menu.style.maxHeight = `${p.maxHeight}px`;
      };
      window.addEventListener('resize', updatePos);
      const close = bindPopoverDismiss(menu, () => {
        window.removeEventListener('resize', updatePos);
      });

      if (S.selPointThresh === undefined) S.selPointThresh = 0;
      if (!S.selDistOp) S.selDistOp = '>';
      if (S.selDistThresh === undefined) {
        S.selDistThresh = SP.qa ? SP.qa.getGlobal().maxDistM : (S.maxDistM || 80);
      }

      const visibleFrames = [...rows.keys()];
      const visibleKf = visibleFrames.filter((f) => track?.at(f)?.keyframe);

      const calcMatches = () => {
        let pCount = 0;
        let dCount = 0;
        for (const [f, r] of rows.entries()) {
          const cnt = r.getPointCount ? r.getPointCount() : 0;
          if (cnt <= S.selPointThresh) pCount++;
          const pos = track?.at(f);
          if (pos) {
            const dist = Math.hypot(pos.box.c[0], pos.box.c[1]);
            const isMatch = (S.selDistOp === '>') ? (dist > S.selDistThresh) : (dist < S.selDistThresh);
            if (isMatch) dCount++;
          }
        }
        return { pCount, dCount };
      };

      let { pCount, dCount } = calcMatches();

      const ptInput = h('input', {
        type: 'number',
        min: '0',
        max: '9999',
        value: S.selPointThresh,
        style: { width: '42px', padding: '2px 4px', background: '#141414', border: '1px solid #434343', borderRadius: '2px', color: '#fff', fontSize: '11px', textAlign: 'center' },
        oninput: (e) => {
          S.selPointThresh = Math.max(0, parseInt(e.target.value, 10) || 0);
          const res = calcMatches();
          ptBtn.textContent = `Chọn (${res.pCount})`;
        }
      });
      const ptBtn = h('button', {
        class: 'c2-btn-dropdown',
        style: { background: '#177ddc', border: 0, color: '#fff', padding: '2px 8px' },
        onclick: () => { close(); selectPointsThreshold(S.selPointThresh); }
      }, `Chọn (${pCount})`);

      const distOpSel = h('select', {
        style: { padding: '2px 3px', background: '#141414', border: '1px solid #434343', borderRadius: '2px', color: '#fff', fontSize: '11px', cursor: 'pointer' },
        onchange: (e) => {
          S.selDistOp = e.target.value;
          const res = calcMatches();
          distBtn.textContent = `Chọn (${res.dCount})`;
        }
      },
        h('option', { value: '>', selected: S.selDistOp === '>' }, '>'),
        h('option', { value: '<', selected: S.selDistOp === '<' }, '<')
      );
      const distInput = h('input', {
        type: 'number',
        min: '1',
        max: '500',
        value: S.selDistThresh,
        style: { width: '42px', padding: '2px 4px', background: '#141414', border: '1px solid #434343', borderRadius: '2px', color: '#fff', fontSize: '11px', textAlign: 'center' },
        oninput: (e) => {
          S.selDistThresh = Math.max(1, parseInt(e.target.value, 10) || 80);
          const res = calcMatches();
          distBtn.textContent = `Chọn (${res.dCount})`;
        }
      });
      const distBtn = h('button', {
        class: 'c2-btn-dropdown',
        style: { background: '#177ddc', border: 0, color: '#fff', padding: '2px 8px' },
        onclick: () => { close(); selectDistanceThreshold(S.selDistOp, S.selDistThresh); }
      }, `Chọn (${dCount})`);

      menu.append(
        h('div', { class: 'c2-menu-header' }, 'Chọn hàng loạt'),
        h('div', {
          class: 'c2-menu-item',
          title: 'Chọn hoặc bỏ chọn tất cả các frame đang hiển thị trên bảng',
          onclick: () => { close(); toggleSelectAllVisibleFrames(); }
        },
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } }, SP.icons.check(12), `Chọn tất cả frame đang hiện (${visibleFrames.length})`)
        ),
        h('div', {
          class: 'c2-menu-item',
          title: 'Chọn hoặc bỏ chọn các keyframe trong phạm vi hiển thị',
          onclick: () => { close(); selectAllKeyframes(); }
        },
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } }, SP.icons.check(12), `Chọn Keyframes đang hiện (${visibleKf.length})`),
          h('span', { class: 'c2-kbd' }, 'K')
        ),
        h('div', { class: 'c2-menu-divider' }),
        h('div', { class: 'c2-menu-header' }, 'Lọc theo số điểm LiDAR'),
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 8px', gap: '6px' } },
          h('span', { style: { color: '#bfbfbf', whiteSpace: 'nowrap' } }, 'Số điểm ≤'),
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '4px' } }, ptInput, h('span', { style: { color: '#8c8c8c' } }, 'pts')),
          ptBtn
        ),
        h('div', { class: 'c2-menu-divider' }),
        h('div', { class: 'c2-menu-header' }, 'Lọc theo khoảng cách Ego'),
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 8px', gap: '6px' } },
          h('span', { style: { color: '#bfbfbf', whiteSpace: 'nowrap' } }, 'KC'),
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '3px' } }, distOpSel, distInput, h('span', { style: { color: '#8c8c8c' } }, 'm')),
          distBtn
        ),
        h('div', { class: 'c2-menu-divider' }),
        h('div', {
          class: 'c2-menu-item',
          style: { color: '#ff7875' },
          onclick: () => { close(); selectedFrames.clear(); lastSelectedFrame = null; updateSelectionUI(); }
        },
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } }, SP.icons.close(12), 'Bỏ chọn tất cả')
        )
      );
      root.append(menu);
    }

    // ---------- Dropdown Menu: Cấu hình Hiển thị 3D & Cam (View Options Menu) ----------
    function showViewOptionsDropdown(targetEl) {
      const rect = targetEl.getBoundingClientRect();
      const pos = SP.ui.getFloatingPosition(rect, 275, 400, { margin: 8 });
      const menu = h('div', {
        class: 'c2-dropdown-menu',
        style: {
          left: `${pos.left}px`,
          top: `${pos.top}px`,
          maxHeight: `${pos.maxHeight}px`,
          minWidth: '255px',
        }
      });
      const updatePos = () => {
        const curRect = targetEl.getBoundingClientRect();
        const p = SP.ui.getFloatingPosition(curRect, 275, 400, { margin: 8 });
        menu.style.left = `${p.left}px`;
        menu.style.top = `${p.top}px`;
        menu.style.maxHeight = `${p.maxHeight}px`;
      };
      window.addEventListener('resize', updatePos);
      const close = bindPopoverDismiss(menu, () => {
        window.removeEventListener('resize', updatePos);
      });

      const makeCheckboxItem = (label, key, tip, after) => {
        const chk = h('input', {
          type: 'checkbox',
          checked: !!S[key],
          style: { margin: 0, cursor: 'pointer', accentColor: '#177ddc' },
          onchange: (e) => {
            S[key] = e.target.checked;
            settings[key] = S[key];
            after?.();
            renderAll();
          }
        });
        return h('label', {
          class: 'c2-menu-item',
          title: tip || '',
          style: { cursor: 'pointer' }
        },
          h('span', {}, label),
          chk
        );
      };

      menu.append(
        h('div', { class: 'c2-menu-header' }, 'Cấu hình hiển thị 3D LiDAR'),
        h('div', { class: 'c2-menu-item', style: { cursor: 'default' }, title: 'Giới hạn đám mây điểm 3D xung quanh vỏ hộp' },
          h('span', {}, 'Cắt 3D xung quanh:'),
          cropSel
        ),
        makeCheckboxItem('Ẩn mặt đất dưới đáy hộp', 'hideGround', 'Ẩn các điểm mặt đất dưới đáy hộp'),
        (() => {
          const sampleCloud = frameData.clouds?.values?.().next?.()?.value;
          const hasRGB = sampleCloud ? sampleCloud.hasRGB !== false : false;
          const hasIntensity = sampleCloud ? sampleCloud.hasIntensity !== false : true;

          const curMode = S.colorMode || (S.colorByIntensity ? 'heat' : 'label');

          let heatControls = null;

          const modeDefs = [
            { id: 'label', label: 'Nhãn', tip: 'Tô màu theo nhãn đối tượng (xe màu nhãn, ngoài màu xám)' },
            { id: 'heat', label: 'Heatmap', tip: 'Tô màu theo dải nhiệt phản xạ LiDAR' },
            { id: 'rgb', label: 'Camera RGB', tip: hasRGB ? 'Màu thực tế từ ảnh Camera 2D (y hệt CVAT)' : 'Job này không có dữ liệu màu RGB từ camera', disabled: !hasRGB }
          ];

          const modeBtns = modeDefs.map((m) => {
            const btn = h('button', {
              class: `c2-seg-btn ${curMode === m.id ? 'active' : ''}`,
              title: m.tip,
              disabled: !!m.disabled,
              style: {
                flex: '1',
                padding: '2px 4px',
                fontSize: '11px',
                lineHeight: '16px',
                background: curMode === m.id ? '#177ddc' : 'transparent',
                color: m.disabled ? '#595959' : (curMode === m.id ? '#ffffff' : '#d9d9d9'),
                border: 'none',
                borderRadius: '2px',
                cursor: m.disabled ? 'not-allowed' : 'pointer',
                opacity: m.disabled ? '0.45' : '1',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s, color 0.15s'
              },
              onclick: () => {
                if (m.disabled) return;
                S.colorMode = m.id;
                S.colorByIntensity = (m.id === 'heat');
                settings.colorMode = m.id;
                settings.colorByIntensity = (m.id === 'heat');
                modeBtns.forEach((b) => {
                  const isActive = b.getAttribute('data-id') === m.id;
                  b.style.background = isActive ? '#177ddc' : 'transparent';
                  b.style.color = isActive ? '#ffffff' : '#d9d9d9';
                });
                if (heatControls) {
                  heatControls.style.display = (m.id === 'heat') ? 'flex' : 'none';
                }
                renderAll();
              }
            }, m.label);
            btn.setAttribute('data-id', m.id);
            return btn;
          });

          const segWrap = h('div', {
            style: {
              display: 'flex',
              background: '#141414',
              border: '1px solid #303030',
              borderRadius: '3px',
              padding: '2px',
              gap: '2px',
              width: '100%',
              marginTop: '4px'
            }
          }, ...modeBtns);

          // Controls cho Heatmap (Thanh Gain + Dải màu mẫu mini):
          const gainVal = h('span', { style: { fontSize: '10px', color: '#8c8c8c', minWidth: '24px', fontVariantNumeric: 'tabular-nums' } }, `${Number(S.heatmapGain || 1.2).toFixed(1)}x`);
          const slider = h('input', {
            type: 'range', min: '0.5', max: '4.0', step: '0.1', value: S.heatmapGain || 1.2, style: { width: '60px' },
            oninput: (e) => {
              const val = Number(e.target.value);
              S.heatmapGain = val;
              settings.heatmapGain = val;
              gainVal.textContent = `${val.toFixed(1)}x`;
              renderAll();
            }
          });
          const gradientBar = h('div', {
            style: {
              display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px',
              fontSize: '9px', color: '#8c8c8c', userSelect: 'none'
            },
            title: 'Dải màu Turbo-LiDAR: Mờ/yếu (Tím/Xanh ngọc) -> Trung bình (Xanh lá/Vàng) -> Rất mạnh (Đỏ cam/Trắng)'
          },
            h('span', {}, 'Mờ'),
            h('div', {
              style: {
                flex: '1', height: '4px', borderRadius: '2px',
                background: 'linear-gradient(to right, #1f0d73, #0d84ea, #19d45e, #fadc1a, #ff3814, #ffffff)',
                border: '1px solid rgba(255, 255, 255, 0.12)'
              }
            }),
            h('span', {}, 'Rõ')
          );

          heatControls = h('div', {
            style: {
              display: (curMode === 'heat') ? 'flex' : 'none',
              flexDirection: 'column',
              gap: '2px',
              marginTop: '4px',
              paddingTop: '4px',
              borderTop: '1px dashed #303030'
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' } },
              h('span', { style: { fontSize: '11px', color: '#bfbfbf' } }, 'Độ nhạy Heatmap:'),
              h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '4px' } }, slider, gainVal)
            ),
            gradientBar
          );

          return h('div', {
            class: 'c2-menu-item',
            style: { cursor: 'default', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '2px' }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
              h('span', {}, 'Chế độ màu điểm:'),
              !hasIntensity && !hasRGB ? h('span', { style: { fontSize: '10px', color: '#8c8c8c' } }, '(Chỉ có XYZ)') : null
            ),
            segWrap,
            heatControls
          );
        })(),
        h('div', { class: 'c2-menu-item', style: { cursor: 'default' } },
          h('span', {}, 'Cỡ hạt điểm:'),
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '4px' } }, ptSizeIn, ptSizeVal)
        ),
        h('div', { class: 'c2-menu-item', style: { cursor: 'default' } },
          h('span', {}, 'Lọc nhiễu LiDAR:'),
          h('input', {
            type: 'range', min: '0', max: '0.8', step: '0.02', value: S.minIntensity, style: { width: '60px' },
            oninput: (e) => { S.minIntensity = Number(e.target.value); settings.minIntensity = S.minIntensity; renderAll(); }
          })
        )
      );

      if (frameData.hasContextImages !== false) {
        menu.append(
          h('div', { class: 'c2-menu-divider' }),
          h('div', { class: 'c2-menu-header' }, 'Camera 2D đối chiếu'),
          makeCheckboxItem('Hiển thị cột ảnh Cam', 'showImage', 'Bật / tắt cột ảnh Camera 2D đối chiếu', applyLayout),
          h('div', { class: 'c2-menu-item', style: { cursor: 'default' } },
            h('span', {}, 'Góc Camera:'),
            camSel
          )
        );
      }

      root.append(menu);
    }

    // ---------- Tự động Fit kích thước theo điểm LiDAR (Anchor Edge Fit) ----------
    async function fitFaceForTarget(face) {
      const pm = store?.profileManager;
      const curFrame = (selectedFrames.size === 1) ? [...selectedFrames][0] : (lastSelectedFrame != null && rows.has(lastSelectedFrame) ? lastSelectedFrame : [...rows.keys()][0]);
      const curProf = (pm && curFrame != null) ? pm.getFrameProfile(track.id, curFrame) : null;

      let targetFrames = [];
      const onlyProfile = (S.fitProfileOnly !== false);
      if (curProf && onlyProfile) {
        targetFrames = pm.getFramesWithProfile(track.id, curProf.id);
      } else if (selectedFrames.size > 1) {
        targetFrames = [...selectedFrames];
      } else if (S.syncSize) {
        targetFrames = [];
        for (const f of track.frames()) {
          if (!curProf && pm?.getFrameProfileId(track.id, f)) continue;
          targetFrames.push(f);
        }
      } else {
        targetFrames = (curFrame != null) ? [curFrame] : [];
      }

      if (!targetFrames.length) {
        app.setStatus('Không có frame nào được chọn để fit', 'warn');
        return;
      }

      app.setStatus(`Đang quét điểm LiDAR trên ${targetFrames.length} frame...`, 'ok');

      const marginM = Math.max(0, Number(S.fitMarginCm ?? 3)) / 100;
      let maxDim = 0;
      let validCount = 0;

      for (const f of targetFrames) {
        const pos = track.at(f);
        if (!pos) continue;
        const cloud = await frameData.cloud(f);
        if (!cloud || !cloud.xyz || !cloud.xyz.length) continue;

        const ext = SP.geom.getBoxLocalExtents(cloud.xyz, pos.box, 0.15);
        if (!ext || ext.count < 3) continue;

        validCount++;
        const hx = pos.box.s[0] / 2;
        const hz = pos.box.s[2] / 2;

        if (face === 'top') {
          const d = (ext.max[2] - (-hz)) + marginM;
          if (d > maxDim) maxDim = d;
        } else if (face === 'front') {
          const d = (ext.max[0] - (-hx)) + marginM;
          if (d > maxDim) maxDim = d;
        } else if (face === 'back') {
          const d = (hx - ext.min[0]) + marginM;
          if (d > maxDim) maxDim = d;
        } else if (face === 'width') {
          const d = (ext.max[1] - ext.min[1]) + 2 * marginM;
          if (d > maxDim) maxDim = d;
        }
      }

      if (validCount === 0 || maxDim < 0.05) {
        app.setStatus('Không tìm thấy đủ điểm LiDAR tin cậy trong các frame mục tiêu để fit', 'warn');
        return;
      }

      maxDim = Number(maxDim.toFixed(3));

      if (app.snapshot) app.snapshot([track.id]);
      else track.snapshot();

      for (const f of targetFrames) {
        const pos = track.at(f);
        if (!pos) continue;
        const newBox = SP.geom.resizeKeepAnchor(pos.box, face, maxDim);
        track.setBox(f, newBox);
      }

      if (curProf) {
        const refBox = track.at(curFrame) || track.at(targetFrames[0]);
        const newSize = [...(curProf.size || refBox.box.s)];
        if (face === 'front' || face === 'back') newSize[0] = maxDim;
        else if (face === 'width') newSize[1] = maxDim;
        else if (face === 'top') newSize[2] = maxDim;
        curProf.size = newSize;
        pm.updateProfile(track.id, curProf.id, { size: newSize });
      }

      afterEdit();
      const faceTitle = (face === 'top') ? 'Nóc xe (H)' : (face === 'front') ? 'Mũi xe (L)' : (face === 'back') ? 'Đuôi xe (L)' : '2 Sườn xe (W)';
      app.setStatus(`Đã Fit ${faceTitle} = ${maxDim}m (lề +${Number(S.fitMarginCm ?? 3)}cm) cho ${targetFrames.length} frames`, 'ok');
    }

    // ---------- Dropdown Menu: Quy chuẩn Kích thước (Size Options Menu) ----------
    function showSizeDropdown(targetEl) {
      const rect = targetEl.getBoundingClientRect();
      const pos = SP.ui.getFloatingPosition(rect, 290, 480, { margin: 8 });
      const menu = h('div', {
        class: 'c2-dropdown-menu',
        style: {
          left: `${pos.left}px`,
          top: `${pos.top}px`,
          maxHeight: `${pos.maxHeight}px`,
          minWidth: '275px',
        }
      });
      const updatePos = () => {
        const curRect = targetEl.getBoundingClientRect();
        const p = SP.ui.getFloatingPosition(curRect, 290, 480, { margin: 8 });
        menu.style.left = `${p.left}px`;
        menu.style.top = `${p.top}px`;
        menu.style.maxHeight = `${p.maxHeight}px`;
      };
      window.addEventListener('resize', updatePos);
      const close = bindPopoverDismiss(menu, () => {
        window.removeEventListener('resize', updatePos);
      });

      const makeCheckboxItem = (label, key, tip, after) => {
        const chk = h('input', {
          type: 'checkbox',
          checked: !!S[key],
          style: { margin: 0, cursor: 'pointer', accentColor: '#177ddc' },
          onchange: (e) => {
            S[key] = e.target.checked;
            settings[key] = S[key];
            after?.();
            renderAll();
          }
        });
        return h('label', {
          class: 'c2-menu-item',
          title: tip || '',
          style: { cursor: 'pointer' }
        },
          h('span', {}, label),
          chk
        );
      };

      const pm = store?.profileManager;
      const curFrame = (selectedFrames.size === 1) ? [...selectedFrames][0] : (lastSelectedFrame != null && rows.has(lastSelectedFrame) ? lastSelectedFrame : [...rows.keys()][0]);
      const curProf = (pm && curFrame != null) ? pm.getFrameProfile(track.id, curFrame) : null;
      if (S.fitMarginCm === undefined) S.fitMarginCm = 3;
      if (S.fitProfileOnly === undefined) S.fitProfileOnly = true;

      const marginIn = h('input', {
        type: 'number', min: '0', max: '20', step: '0.5', value: S.fitMarginCm,
        style: { width: '42px', padding: '2px 4px', background: '#141414', border: '1px solid #434343', borderRadius: '2px', color: '#fff', fontSize: '11px', textAlign: 'center' },
        oninput: (e) => {
          S.fitMarginCm = Math.max(0, parseFloat(e.target.value) || 0);
        }
      });

      menu.append(
        h('div', { class: 'c2-menu-header' }, 'Kích thước & Size Profiles'),
        h('div', {
          class: 'c2-menu-item',
          onclick: () => { close(); openProfileManagerModal(); }
        },
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } }, SP.icons.cube(12), 'Quản lý Size Profiles...'),
          h('span', { style: { color: '#8c8c8c' } }, '▸')
        ),
        h('div', {
          class: 'c2-menu-item',
          title: 'Sắp xếp, khôi phục ID bị thiếu hoặc sửa thứ tự Track ID trong trường hợp cấp bách (Prelabel Guidelines)',
          onclick: () => { close(); openTrackIdManagerModal(); }
        },
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } }, SP.icons.cube(12), 'Quản lý Thứ tự ID...'),
          h('span', { style: { color: '#faad14', fontSize: '9px', border: '1px solid #594214', padding: '0 4px', borderRadius: '2px', fontWeight: 600 } }, 'Cấp bách')
        ),
        curProf ? h('div', { style: { padding: '2px 8px 4px', fontSize: '10px', color: '#177ddc', display: 'flex', alignItems: 'center', gap: '4px' } },
          h('span', {}, '• Đang gán:'),
          h('span', { style: { fontWeight: 600, color: '#69c0ff' } }, curProf.name),
          h('span', { style: { color: '#8c8c8c' } }, `(${pm.getFramesWithProfile(track.id, curProf.id).length} frames)`)
        ) : null,
        h('div', { class: 'c2-menu-divider' }),
        h('div', { class: 'c2-menu-header', title: 'Tự động quét cực trị các hạt LiDAR để kéo mép khít viền và bù tâm hộp' }, 'Tự động Fit theo hạt LiDAR'),
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 8px', gap: '6px' } },
          h('span', { title: 'Lề an toàn giữa hạt ngoại cùng và mặt phẳng hộp (Chuẩn: 2 - 5 cm)', style: { color: '#bfbfbf' } }, 'Lề khít (Margin):'),
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '4px' } },
            marginIn,
            h('span', { style: { color: '#8c8c8c' } }, 'cm')
          )
        ),
        curProf ? h('label', {
          class: 'c2-menu-item',
          style: { cursor: 'pointer', padding: '3px 8px' },
          title: `Chỉ quét điểm và áp dụng cho các frame thuộc Profile "${curProf.name}"`
        },
          h('span', { style: { color: '#69c0ff' } }, `Chỉ áp dụng Profile "${curProf.name}"`),
          h('input', {
            type: 'checkbox',
            checked: S.fitProfileOnly !== false,
            style: { margin: 0, cursor: 'pointer', accentColor: '#177ddc' },
            onchange: (e) => { S.fitProfileOnly = e.target.checked; }
          })
        ) : null,
        h('div', { class: 'c2-fit-grid' },
          h('button', {
            class: 'c2-fit-btn',
            title: 'Kéo mặt trên của hộp vừa khít hạt cao nhất trên nóc, giữ mép đáy sát đất cố định',
            onclick: () => { close(); fitFaceForTarget('top'); }
          }, '▲ Nóc (Giữ đáy)'),
          h('button', {
            class: 'c2-fit-btn',
            title: 'Kéo nở/co bề rộng W cân xứng 2 bên sườn xe theo đám mây điểm',
            onclick: () => { close(); fitFaceForTarget('width'); }
          }, '↔ 2 Sườn xe'),
          h('button', {
            class: 'c2-fit-btn',
            title: 'Kéo mũi xe vươn tới hạt laser phía trước, giữ cố định mép đuôi xe đã căn chuẩn',
            onclick: () => { close(); fitFaceForTarget('front'); }
          }, '▶ Mũi (Giữ đuôi)'),
          h('button', {
            class: 'c2-fit-btn',
            title: 'Kéo đuôi xe chạm hạt laser phía sau, giữ cố định mép mũi xe',
            onclick: () => { close(); fitFaceForTarget('back'); }
          }, '◀ Đuôi (Giữ mũi)')
        ),
        h('div', { class: 'c2-menu-divider' }),
        makeCheckboxItem('Khóa & Đồng bộ L/W/H', 'syncSize', 'Tự động đồng bộ kích thước sang các frame chưa gán cấu hình riêng'),
        makeCheckboxItem('Cho phép xoay Pitch/Roll', 'allowTilt', 'Cho phép xoay góc nghiêng Pitch (Side) và Roll (Front)')
      );
      root.append(menu);
    }

    // ---------- Dropdown Menu: Biến đổi hình học (Transform Menu) ----------
    function showTransformDropdown(targetEl, frames) {
      const rect = targetEl.getBoundingClientRect();
      const pos = SP.ui.getFloatingPosition(rect, 240, 320, { margin: 8 });
      const menu = h('div', {
        class: 'c2-dropdown-menu',
        style: {
          left: `${pos.left}px`,
          top: `${pos.top}px`,
          maxHeight: `${pos.maxHeight}px`,
          minWidth: '215px',
        }
      });
      const updatePos = () => {
        const curRect = targetEl.getBoundingClientRect();
        const p = SP.ui.getFloatingPosition(curRect, 240, 320, { margin: 8 });
        menu.style.left = `${p.left}px`;
        menu.style.top = `${p.top}px`;
        menu.style.maxHeight = `${p.maxHeight}px`;
      };
      window.addEventListener('resize', updatePos);
      const close = bindPopoverDismiss(menu, () => {
        window.removeEventListener('resize', updatePos);
      });
      const targetList = Array.isArray(frames) ? frames : [frames];

      const rotateBatchDeg = (deg) => {
        close();
        const rad = (deg * Math.PI) / 180;
        if (app.snapshot) app.snapshot([track.id]);
        else track.snapshot();
        for (const f of targetList) {
          const pos = track.at(f);
          if (!pos) continue;
          const b = G.cloneBox(pos.box);
          b.r = G.rotateLocal(b.r, 2, rad);
          track.setBox(f, b);
        }
        afterEdit();
        app.setStatus(`Đã xoay ${deg > 0 ? '+' : ''}${deg}° cho ${targetList.length} frames`, 'ok');
      };

      menu.append(
        h('div', { class: 'c2-menu-header' }, `Biến đổi (${targetList.length} frames)`),
        h('div', {
          class: 'c2-menu-item',
          onclick: () => {
            close();
            track.flipHeadingBatch(targetList);
            afterEdit();
            app.setStatus(`Đã đảo chiều đầu xe 180° cho ${targetList.length} frames`, 'ok');
          }
        },
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } }, SP.icons.flip(12), 'Đảo đầu xe 180°'),
          h('span', { class: 'c2-kbd' }, 'F')
        ),
        h('div', {
          class: 'c2-menu-item',
          onclick: async () => {
            close();
            for (const f of targetList) {
              const cloud = await frameData.cloud(f);
              const pos = track.at(f);
              if (pos) {
                const res = G.snapToGround(cloud.xyz, pos.box);
                if (res) track.setBox(f, res.box);
              }
            }
            afterEdit();
            app.setStatus(`Đã hút đáy chạm đất cho ${targetList.length} frames`, 'ok');
          }
        },
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } }, SP.icons.ground(12), 'Hút đáy sát mặt đất'),
          h('span', { class: 'c2-kbd' }, 'G')
        ),
        h('div', {
          class: 'c2-menu-item',
          onclick: () => {
            close();
            if (app.snapshot) app.snapshot([track.id]);
            else track.snapshot();
            for (const f of targetList) {
              const p = track.at(f);
              if (p) {
                const b = G.cloneBox(p.box);
                b.r[0] = 0;
                b.r[1] = 0;
                track.setBox(f, b);
              }
            }
            afterEdit();
            app.setStatus(`Đã đặt lại cân bằng (Roll=0°, Pitch=0°) cho ${targetList.length} frames`, 'ok');
          }
        },
          h('span', {}, 'Cân bằng Roll/Pitch 0°')
        ),
        h('div', {
          class: 'c2-menu-item',
          onclick: () => {
            close();
            const refPos = track.at(targetList[0]);
            if (!refPos) return;
            if (app.snapshot) app.snapshot([track.id]);
            else track.snapshot();
            for (const f of targetList) {
              const p = track.at(f);
              if (p) {
                const b = G.cloneBox(p.box);
                b.s = refPos.box.s.slice();
                track.setBox(f, b);
              }
            }
            afterEdit();
            app.setStatus(`Đã đồng bộ kích thước chuẩn cho ${targetList.length} frames`, 'ok');
          }
        },
          h('span', {}, 'Đồng bộ kích thước L/W/H')
        ),
        h('div', { class: 'c2-menu-divider' }),
        h('div', { class: 'c2-menu-header' }, 'Xoay góc Yaw'),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', padding: '2px 6px' } },
          h('button', { class: 'small', onclick: () => rotateBatchDeg(-5) }, '-5°'),
          h('button', { class: 'small', onclick: () => rotateBatchDeg(5) }, '+5°'),
          h('button', { class: 'small', onclick: () => rotateBatchDeg(-15) }, '-15°'),
          h('button', { class: 'small', onclick: () => rotateBatchDeg(15) }, '+15°')
        )
      );
      root.append(menu);
    }

    function showProfilePicker(targetEl, frameOrFrames, onDone) {
      const pm = store.profileManager;
      if (!pm) return;
      const isBatch = Array.isArray(frameOrFrames);
      const frames = isBatch ? frameOrFrames : [frameOrFrames];
      const curProfId = isBatch ? null : pm.getFrameProfileId(track.id, frames[0]);
      const profiles = pm.getProfiles(track.id);

      const rect = targetEl.getBoundingClientRect();
      const pos = SP.ui.getFloatingPosition(rect, 235, 280, { margin: 8 });
      const menu = h('div', {
        style: {
          position: 'fixed',
          left: `${pos.left}px`,
          top: `${pos.top}px`,
          maxHeight: `${pos.maxHeight}px`,
          overflowY: 'auto',
          boxSizing: 'border-box',
          overscrollBehavior: 'contain',
          zIndex: 2147483040,
          background: '#1f1f1f',
          border: '1px solid #434343',
          borderRadius: '4px',
          padding: '6px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.75)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          minWidth: '215px',
          fontFamily: 'inherit',
          fontSize: '11px',
          color: '#d9d9d9',
        }
      });

      const updatePos = () => {
        const curRect = targetEl.getBoundingClientRect();
        const p = SP.ui.getFloatingPosition(curRect, 235, 280, { margin: 8 });
        menu.style.left = `${p.left}px`;
        menu.style.top = `${p.top}px`;
        menu.style.maxHeight = `${p.maxHeight}px`;
      };
      window.addEventListener('resize', updatePos);
      const close = bindPopoverDismiss(menu, () => {
        window.removeEventListener('resize', updatePos);
      });

      menu.append(
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px', color: '#8c8c8c', fontWeight: 600, borderBottom: '1px solid #303030' } },
          h('span', {}, isBatch ? `Gán cấu hình (${frames.length} frames):` : `Gán cấu hình · Frame ${frames[0]}:`),
          h('button', {
            style: { background: 'transparent', border: 0, color: '#8c8c8c', cursor: 'pointer', padding: '0 4px', display: 'inline-flex', alignItems: 'center' },
            title: 'Đóng',
            onclick: close
          }, SP.icons.close(12))
        )
      );

      for (const p of profiles) {
        const isCur = curProfId === p.id;
        const rowWrap = h('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            borderRadius: '3px',
            background: isCur ? 'rgba(23, 125, 220, 0.2)' : 'transparent',
          }
        });
        const item = h('div', {
          style: {
            flex: 1,
            padding: '5px 8px',
            borderRadius: '3px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: isCur ? '#40a9ff' : '#d9d9d9',
          },
          onclick: () => {
            close();
            pm.assignFrames(track.id, frames, p.id);
            track.applyProfile(frames, p.size);
            afterEdit();
            app.setStatus(`Đã gán cấu hình "${p.name}" cho ${frames.length} frames`, 'ok');
            onDone?.();
          }
        },
          h('span', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
            h('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: p.color } }),
            p.name
          ),
          h('span', { style: { color: '#8c8c8c', fontSize: '10px' } }, p.size.map(v => v.toFixed(2)).join('×'))
        );

        // Nút lấy kích thước của frame hiện tại cập nhật vào Profile này và áp dụng đồng loạt
        const updateFromFrameBtn = h('button', {
          class: 'small',
          style: { padding: '2px 5px', fontSize: '10px', marginRight: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' },
          title: `Lấy kích thước của f${frames[0]} cập nhật cho cấu hình "${p.name}" và áp dụng cho ${frames.length} frames`,
          onclick: (ev) => {
            ev.stopPropagation();
            const basePos = track.at(frames[0]);
            if (!basePos) return;
            const newSize = basePos.box.s.map((v) => Number(v.toFixed(3)));
            pm.updateProfile(track.id, p.id, { size: newSize });
            pm.assignFrames(track.id, frames, p.id);
            const allLinked = pm.getFramesWithProfile(track.id, p.id);
            track.applyProfile(allLinked.length ? allLinked : frames, newSize);
            close();
            afterEdit();
            app.setStatus(`Đã cập nhật cấu hình "${p.name}" (${newSize.map(v => v.toFixed(2)).join('×')}m) & đồng bộ ${Math.max(allLinked.length, frames.length)} frames`, 'ok');
            onDone?.();
          }
        }, SP.icons.downloadCloud(10), 'Size');

        rowWrap.onmouseenter = () => { rowWrap.style.background = '#262626'; };
        rowWrap.onmouseleave = () => { rowWrap.style.background = isCur ? 'rgba(23, 125, 220, 0.2)' : 'transparent'; };
        rowWrap.append(item, updateFromFrameBtn);
        menu.append(rowWrap);
      }

      if (curProfId || isBatch) {
        const unassign = h('div', {
          style: { padding: '5px 8px', borderRadius: '3px', cursor: 'pointer', color: '#ff7875', borderTop: '1px solid #303030', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' },
          onclick: () => {
            close();
            pm.assignFrames(track.id, frames, null);
            afterEdit(false);
            app.setStatus(`Đã hủy gán cấu hình cho ${frames.length} frames`, 'ok');
            onDone?.();
          }
        }, SP.icons.close(10), 'Hủy gán (Về mặc định)');
        unassign.onmouseenter = () => { unassign.style.background = '#262626'; };
        unassign.onmouseleave = () => { unassign.style.background = 'transparent'; };
        menu.append(unassign);
      }

      const createWrap = h('div', { style: { borderTop: '1px solid #303030', marginTop: '2px', paddingTop: '2px' } });
      const createNew = h('div', {
        style: { padding: '5px 8px', borderRadius: '3px', cursor: 'pointer', color: '#73d13d' },
        onclick: (e) => {
          e.stopPropagation();
          createWrap.replaceChildren();
          const nameIn = h('input', {
            type: 'text',
            value: `Cấu hình ${profiles.length + 1}`,
            placeholder: 'Tên cấu hình...',
            style: { flex: 1, width: '120px', padding: '3px 6px', background: '#141414', border: '1px solid #177ddc', color: '#fff', borderRadius: '2px', fontSize: '11px' }
          });
          const doCreate = () => {
            const name = nameIn.value.trim();
            if (!name) return;
            close();
            const basePos = track.at(frames[0]);
            const s = basePos ? basePos.box.s : [1, 1, 1];
            const newP = pm.createProfile(track.id, name, s);
            pm.assignFrames(track.id, frames, newP.id);
            track.applyProfile(frames, newP.size);
            afterEdit();
            app.setStatus(`Đã tạo và gán cấu hình "${newP.name}" cho ${frames.length} frames`, 'ok');
            onDone?.();
          };
          nameIn.addEventListener('keydown', (ev) => {
            ev.stopPropagation();
            if (ev.key === 'Enter') { ev.preventDefault(); doCreate(); }
            else if (ev.key === 'Escape') { ev.preventDefault(); close(); }
          });
          const saveBtn = h('button', { class: 'primary small', onclick: (ev) => { ev.stopPropagation(); doCreate(); } }, 'Lưu');
          const row = h('div', { style: { display: 'flex', gap: '4px', padding: '3px 4px', alignItems: 'center' } }, nameIn, saveBtn);
          createWrap.append(row);
          requestAnimationFrame(() => { nameIn.focus(); nameIn.select(); });
        }
      }, `+ Tạo mới từ kích thước f${frames[0]}`);
      createNew.onmouseenter = () => { createNew.style.background = '#262626'; };
      createNew.onmouseleave = () => { createNew.style.background = 'transparent'; };
      createWrap.append(createNew);
      menu.append(createWrap);

      const manageItem = h('div', {
        style: { padding: '5px 8px', borderRadius: '3px', cursor: 'pointer', color: '#40a9ff', borderTop: '1px solid #303030', marginTop: '2px' },
        onclick: () => {
          close();
          openProfileManagerModal();
        }
      }, 'Quản lý cấu hình…');
      manageItem.onmouseenter = () => { manageItem.style.background = '#262626'; };
      manageItem.onmouseleave = () => { manageItem.style.background = 'transparent'; };
      menu.append(manageItem);

      root.append(menu);
    }

    // ---------- 1B. CHỈNH SỬA THUỘC TÍNH CLASS & TRẠNG THÁI (Attributes & Occluded/Outside Popover) ----------
    function showAttributePicker(targetEl, frameOrFrames, onDone) {
      const isBatch = Array.isArray(frameOrFrames);
      const frames = isBatch ? frameOrFrames : [frameOrFrames];
      if (!frames.length) return;

      const attrDefs = store.labelAttributes ? store.labelAttributes(track.labelId) : [];
      const posList = frames.map((f) => track.at(f)).filter(Boolean);
      const pos0 = posList[0];
      if (!pos0) return;

      const rect = targetEl.getBoundingClientRect();
      const pos = SP.ui.getFloatingPosition(rect, 280, 320, { margin: 8 });
      const menu = h('div', {
        style: {
          position: 'fixed',
          left: `${pos.left}px`,
          top: `${pos.top}px`,
          maxHeight: `${pos.maxHeight}px`,
          zIndex: 2147483040,
          background: '#1f1f1f',
          border: '1px solid #434343',
          borderRadius: '4px',
          padding: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          minWidth: '265px',
          maxWidth: '325px',
          overflowY: 'auto',
          boxSizing: 'border-box',
          overscrollBehavior: 'contain',
          fontFamily: 'inherit',
          fontSize: '11px',
          color: '#d9d9d9',
        }
      });

      const updatePos = () => {
        const curRect = targetEl.getBoundingClientRect();
        const p = SP.ui.getFloatingPosition(curRect, 280, 320, { margin: 8 });
        menu.style.left = `${p.left}px`;
        menu.style.top = `${p.top}px`;
        menu.style.maxHeight = `${p.maxHeight}px`;
      };
      window.addEventListener('resize', updatePos);
      const close = bindPopoverDismiss(menu, () => {
        window.removeEventListener('resize', updatePos);
      });

      const headTitle = isBatch
        ? `Thuộc tính (${frames.length}f đang chọn)`
        : `Thuộc tính · Frame ${frames[0]}`;

      const feedbackEl = h('span', {
        style: { color: '#73d13d', fontSize: '10px', fontWeight: 600, opacity: '0', transition: 'opacity 0.15s', display: 'inline-flex', alignItems: 'center', gap: '3px' }
      }, SP.icons.check(10), 'Đã lưu');
      let fbTimer = null;
      const flashFeedback = (msg) => {
        feedbackEl.innerHTML = '';
        feedbackEl.append(SP.icons.check(10), msg || 'Đã áp dụng');
        feedbackEl.style.opacity = '1';
        if (fbTimer) clearTimeout(fbTimer);
        fbTimer = setTimeout(() => { feedbackEl.style.opacity = '0'; }, 1800);
      };

      menu.append(
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', paddingBottom: '4px', borderBottom: '1px solid #303030' } },
          h('b', { style: { color: '#fff', fontSize: '12px' } }, headTitle),
          feedbackEl,
          h('span', { style: { marginLeft: 'auto', color: store.labelColor(track.labelId), fontWeight: 600 } }, store.labelName(track.labelId)),
          h('button', {
            style: { background: 'transparent', border: 0, color: '#8c8c8c', cursor: 'pointer', padding: '0 4px', display: 'inline-flex', alignItems: 'center' },
            title: 'Đóng bảng thuộc tính',
            onclick: close
          }, SP.icons.close(12))
        )
      );

      // Cờ trạng thái chuẩn CVAT: Occluded (Bị che khuất) & Outside (Ra khỏi vùng quét)
      const occMixed = posList.some((p) => !!p.occluded !== !!pos0.occluded);
      const outMixed = posList.some((p) => !!p.outside !== !!pos0.outside);

      const occChk = h('input', {
        type: 'checkbox',
        checked: !!pos0.occluded,
        onchange: () => {
          occChk.indeterminate = false;
          track.setOccludedBatch(frames, occChk.checked);
          afterEdit();
          flashFeedback(`Occluded = ${occChk.checked}`);
          app.setStatus(`Đã đặt Occluded = ${occChk.checked} cho ${frames.length} frames`, 'ok');
          onDone?.();
        }
      });
      if (occMixed) occChk.indeterminate = true;

      const outChk = h('input', {
        type: 'checkbox',
        checked: !!pos0.outside,
        onchange: () => {
          outChk.indeterminate = false;
          track.setOutsideBatch(frames, outChk.checked);
          afterEdit();
          flashFeedback(`Outside = ${outChk.checked}`);
          app.setStatus(`Đã đặt Outside = ${outChk.checked} cho ${frames.length} frames`, 'ok');
          onDone?.();
        }
      });
      if (outMixed) outChk.indeterminate = true;

      menu.append(
        h('div', { style: { display: 'flex', gap: '12px', padding: '5px 6px', background: '#141414', borderRadius: '3px', border: '1px solid #303030' } },
          h('label', { style: { cursor: 'pointer', flex: 1 } }, occChk, 'Occluded (Khuất)'),
          h('label', { style: { cursor: 'pointer', flex: 1 } }, outChk, 'Outside (Ẩn)')
        )
      );

      // Danh sách các Attribute của Class (Label) được định nghĩa trên CVAT
      if (!attrDefs.length) {
        menu.append(
          h('div', { style: { padding: '8px 4px', color: '#8c8c8c', textAlign: 'center', fontStyle: 'italic' } },
            'Class này không có thuộc tính (Attribute) riêng trên CVAT.'
          )
        );
      } else {
        for (const attr of attrDefs) {
          const isMutable = attr.mutable !== false;
          const fallbackVal = attr.default_value ?? (attr.values?.[0] ?? '');
          const frameVals = posList.map((p) => String(p.attributes?.[attr.id] ?? fallbackVal));
          const curVal = frameVals[0] ?? String(fallbackVal);
          const isMixed = isBatch && new Set(frameVals).size > 1;
          const inputType = (attr.input_type || 'select').toLowerCase();

          let controlEl;
          const applyVal = (newVal) => {
            track.setAttributeBatch(frames, attr.id, newVal, isMutable);
            afterEdit();
            flashFeedback(`${attr.name}: ${newVal}`);
            app.setStatus(
              `Đã gán "${attr.name}" = "${newVal}" (${isMutable ? `${frames.length} frames` : 'Toàn bộ Track'})`,
              'ok'
            );
            onDone?.();
          };

          if (inputType === 'checkbox') {
            const chk = h('input', {
              type: 'checkbox',
              checked: String(curVal).toLowerCase() === 'true',
              onchange: () => {
                chk.indeterminate = false;
                applyVal(chk.checked ? 'true' : 'false');
              },
            });
            if (isMixed) chk.indeterminate = true;
            const txtSpan = h('span', {}, isMixed ? 'Nhiều giá trị' : (chk.checked ? 'True' : 'False'));
            controlEl = h('label', { style: { cursor: 'pointer' } }, chk, txtSpan);
            chk.addEventListener('change', () => { txtSpan.textContent = chk.checked ? 'True' : 'False'; });
          } else if (inputType === 'select' || inputType === 'radio') {
            const vals = Array.isArray(attr.values) ? attr.values : [];
            const options = [];
            if (isMixed) {
              options.push(h('option', { value: '__mixed__', disabled: true, selected: true }, '-- Nhiều giá trị --'));
            }
            for (const v of vals) {
              options.push(h('option', { value: v, selected: !isMixed && String(v) === String(curVal) }, String(v)));
            }
            controlEl = h('select', {
              style: { width: '135px', padding: '2px 4px', cursor: 'pointer' },
              onchange: (ev) => {
                if (ev.target.value !== '__mixed__') applyVal(ev.target.value);
              },
            }, options);
          } else {
            const inp = h('input', {
              type: inputType === 'number' ? 'number' : 'text',
              value: isMixed ? '' : String(curVal),
              placeholder: isMixed ? 'Nhiều giá trị...' : '',
              style: { width: '98px', padding: '2px 4px' },
              onchange: () => {
                if (inp.value !== '') applyVal(inp.value);
              },
              onkeydown: (ev) => {
                ev.stopPropagation();
                if (ev.key === 'Enter') { ev.preventDefault(); applyVal(inp.value); }
              }
            });
            const setBtn = h('button', { class: 'small primary', onclick: () => applyVal(inp.value) }, 'OK');
            controlEl = h('span', { style: { display: 'inline-flex', gap: '3px', alignItems: 'center' } }, inp, setBtn);
          }

          const scopeBadge = h('span', {
            style: {
              fontSize: '9px',
              padding: '0 4px',
              borderRadius: '2px',
              background: isMutable ? 'rgba(23, 125, 220, 0.15)' : 'rgba(140, 140, 140, 0.15)',
              color: isMutable ? '#40a9ff' : '#8c8c8c',
              border: `1px solid ${isMutable ? 'rgba(23, 125, 220, 0.35)' : '#303030'}`,
            },
            title: isMutable ? 'Thuộc tính biến thiên theo từng Frame (Mutable)' : 'Thuộc tính cố định cho toàn bộ Track (Immutable)'
          }, isMutable ? 'Frame' : 'Track');

          menu.append(
            h('div', {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px',
                padding: '4px 6px',
                background: '#141414',
                border: '1px solid #262626',
                borderRadius: '3px',
              }
            },
              h('span', { style: { display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                scopeBadge,
                h('span', { title: attr.name, style: { fontWeight: 500, color: '#e6edf3' } }, attr.name)
              ),
              controlEl
            )
          );
        }
      }

      root.append(menu);
    }

    // ---------- 2. NỘI SUY CHỌN LỌC (Selective Interpolation Modal) ----------
    function openSelectiveInterpModal(minF, maxF) {
      const isSingle = minF === maxF;
      let leftKf = null;
      let rightKf = null;

      if (isSingle) {
        if (!track.neighbourKeyframes) {
          app.setStatus('Lỗi: không tìm thấy phương thức neighbourKeyframes trên track', 'err');
          return;
        }
        const neigh = track.neighbourKeyframes(minF);
        if (!neigh.left || !neigh.right) {
          app.setStatus(`Frame ${minF} không có đủ 2 Keyframe kề trước và kề sau để nội suy!`, 'err');
          return;
        }
        leftKf = neigh.left;
        rightKf = neigh.right;
      }

      // Tìm 2 keyframe kề cận bên ngoài dải [minF, maxF] (nếu có)
      const outerNeigh = (!isSingle && track.outerKeyframes) ? track.outerKeyframes(minF, maxF) : null;
      const hasOuterAnchors = outerNeigh && outerNeigh.left && outerNeigh.right;

      let selectedMode = 'inner'; // 'inner' (2 đầu vùng chọn) hoặc 'outer' (2 mốc ngoài dải lỗi)

      const overlay = h('div', {
        style: {
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(3px)',
          zIndex: 2147483020,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }
      });

      const modalClose = () => {
        overlay.remove();
        if (app.modalStack) {
          const idx = app.modalStack.indexOf(modalClose);
          if (idx >= 0) app.modalStack.splice(idx, 1);
        }
      };
      if (app.modalStack) app.modalStack.push(modalClose);

      const posCheck = h('input', { type: 'checkbox', checked: true, style: { accentColor: '#177ddc' } });
      const sizeLockCheck = h('input', { type: 'checkbox', checked: true, style: { accentColor: '#177ddc' } }); // Mặc định KHÓA kích thước
      const yawCheck = h('input', { type: 'checkbox', checked: true, style: { accentColor: '#177ddc' } });
      const tiltCheck = h('input', { type: 'checkbox', checked: false, style: { accentColor: '#177ddc' } }); // Mặc định KHÓA nghiêng Roll/Pitch

      // Bảng thông số Pre-flight Data
      const preflightBox = h('div', {
        style: {
          background: '#141414',
          border: '1px solid #303030',
          borderRadius: '3px',
          padding: '8px 10px',
          fontSize: '11px',
          fontFamily: 'monospace',
          marginBottom: '12px'
        }
      });

      function updatePreflight() {
        let aPos = null, bPos = null, aF = minF, bF = maxF;
        if (isSingle) {
          aPos = leftKf; bPos = rightKf; aF = leftKf.frame; bF = rightKf.frame;
        } else if (selectedMode === 'outer' && hasOuterAnchors) {
          aPos = outerNeigh.left; bPos = outerNeigh.right; aF = outerNeigh.left.frame; bF = outerNeigh.right.frame;
        } else {
          aPos = track.at(minF); bPos = track.at(maxF); aF = minF; bF = maxF;
        }

        if (!aPos || !bPos) {
          preflightBox.textContent = 'Không đủ dữ liệu tọa độ mốc để tính toán.';
          return;
        }

        const aPts = aPos.points, bPts = bPos.points;
        const dx = bPts[0] - aPts[0], dy = bPts[1] - aPts[1], dz = bPts[2] - aPts[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const yawA = (aPts[5] * 180 / Math.PI);
        const yawB = (bPts[5] * 180 / Math.PI);
        let diffYaw = ((yawB - yawA + 540) % 360) - 180;

        const isLargeRot = Math.abs(diffYaw) > 90;

        preflightBox.innerHTML = '';
        preflightBox.append(
          h('div', { style: { display: 'flex', justifyContent: 'space-between', color: '#8c8c8c', marginBottom: '4px' } },
            h('span', {}, `Mốc A (f${aF}): Yaw = ${yawA.toFixed(1)}° · Tâm [${aPts[0].toFixed(2)}, ${aPts[1].toFixed(2)}, ${aPts[2].toFixed(2)}]`),
            h('span', {}, `Size: ${aPts[6].toFixed(2)}×${aPts[7].toFixed(2)}×${aPts[8].toFixed(2)}m`)
          ),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', color: '#8c8c8c', marginBottom: '4px' } },
            h('span', {}, `Mốc B (f${bF}): Yaw = ${yawB.toFixed(1)}° · Tâm [${bPts[0].toFixed(2)}, ${bPts[1].toFixed(2)}, ${bPts[2].toFixed(2)}]`),
            h('span', {}, `Size: ${bPts[6].toFixed(2)}×${bPts[7].toFixed(2)}×${bPts[8].toFixed(2)}m`)
          ),
          h('div', { style: { borderTop: '1px dashed #303030', paddingTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
            h('span', { style: { color: '#d9d9d9' } }, `Quãng đường di chuyển: ΔD = ${dist.toFixed(2)}m · Độ xoay: ΔYaw = ${diffYaw > 0 ? '+' : ''}${diffYaw.toFixed(1)}°`),
            isLargeRot ? h('span', { style: { color: '#faad14', background: 'rgba(250,173,20,0.15)', padding: '1px 6px', borderRadius: '2px' } }, '⚠️ Chênh lệch Yaw > 90°') : null
          )
        );
      }
      updatePreflight();

      const applyBtn = h('button', {
        style: { padding: '6px 14px', background: '#177ddc', border: 0, borderRadius: '2px', color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: '12px' },
        onclick: () => {
          if (isSingle) {
            track.interpolateFrameBetween(minF, {
              interpPos: posCheck.checked,
              interpSize: !sizeLockCheck.checked,
              interpYaw: yawCheck.checked,
              allowTilt: tiltCheck.checked,
              lockSizeMode: 'keep-current',
            });
            modalClose();
            afterEdit();
            app.setStatus(`Đã nội suy Frame ${minF} giữa f${leftKf.frame} ⇄ f${rightKf.frame}`, 'ok');
          } else {
            track.interpolateRange(minF, maxF, {
              mode: selectedMode,
              interpPos: posCheck.checked,
              interpSize: !sizeLockCheck.checked,
              interpYaw: yawCheck.checked,
              allowTilt: tiltCheck.checked,
            });
            modalClose();
            afterEdit();
            const modeDesc = (selectedMode === 'outer' && hasOuterAnchors)
              ? `(dựa trên 2 mốc ngoài f${outerNeigh.left.frame} ⇄ f${outerNeigh.right.frame})`
              : `(giữa f${minF} ⇄ f${maxF})`;
            app.setStatus(`Đã nội suy đoạn f${minF} → f${maxF} ${modeDesc}`, 'ok');
          }
        }
      }, 'Thực Hiện Nội Suy');

      const closeBtn = h('button', {
        style: { padding: '6px 14px', background: '#262626', border: '1px solid #434343', borderRadius: '2px', color: '#d9d9d9', cursor: 'pointer', fontSize: '12px' },
        onclick: modalClose
      }, 'Hủy (Esc)');

      const titleText = isSingle
        ? `Nội suy chọn lọc · Frame ${minF} (giữa f${leftKf.frame} ⇄ f${rightKf.frame})`
        : `Nội suy chọn lọc · f${minF} → f${maxF}`;

      const title = h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #303030', paddingBottom: '8px' } },
        h('span', { style: { color: '#fff', fontSize: '14px', fontWeight: 600 } }, titleText),
        h('button', {
          style: { background: 'transparent', border: 0, color: '#8c8c8c', cursor: 'pointer', padding: '0 4px', display: 'inline-flex', alignItems: 'center' },
          title: 'Đóng',
          onclick: modalClose
        }, SP.icons.close(14))
      );

      // Chế độ Anchor (chỉ hiện khi multi-select)
      let anchorChoiceEl = null;
      if (!isSingle) {
        const radInner = h('input', { type: 'radio', name: 'sp_interp_mode', checked: selectedMode === 'inner', style: { accentColor: '#177ddc' } });
        const radOuter = h('input', { type: 'radio', name: 'sp_interp_mode', checked: selectedMode === 'outer', disabled: !hasOuterAnchors, style: { accentColor: '#177ddc' } });
        radInner.onchange = () => { if (radInner.checked) { selectedMode = 'inner'; updatePreflight(); } };
        radOuter.onchange = () => { if (radOuter.checked) { selectedMode = 'outer'; updatePreflight(); } };

        anchorChoiceEl = h('div', { style: { marginBottom: '12px', background: '#191919', padding: '8px 10px', borderRadius: '3px', border: '1px solid #262626' } },
          h('div', { style: { fontSize: '11px', color: '#8c8c8c', marginBottom: '6px', fontWeight: 600 } }, 'Chọn Mốc Mỏ Neo (Anchors):'),
          h('label', { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginBottom: '4px', cursor: 'pointer' } },
            radInner,
            h('span', {}, `Chế độ A: Nối giữa 2 đầu vùng chọn (f${minF} ⇄ f${maxF})`)
          ),
          h('label', { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: hasOuterAnchors ? 'pointer' : 'not-allowed', color: hasOuterAnchors ? '#d9d9d9' : '#595959' } },
            radOuter,
            h('span', {}, hasOuterAnchors
              ? `Chế độ B: Nối qua dải lỗi từ 2 Keyframe kề cận bên ngoài (f${outerNeigh.left.frame} ⇄ f${outerNeigh.right.frame})`
              : 'Chế độ B: Nối từ 2 Keyframe bên ngoài (Không khả dụng do thiếu keyframe kề cận)')
          )
        );
      }

      const modal = h('div', { class: 'interp-modal', style: { width: '480px', maxWidth: '95vw', background: '#1f1f1f', border: '1px solid #303030', borderRadius: '4px', padding: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.55)' } },
        title,
        anchorChoiceEl,
        preflightBox,
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' } },
          h('label', { style: { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' } }, posCheck, 'Nội suy quỹ đạo tọa độ tâm (X, Y, Z)'),
          h('label', { style: { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' } }, yawCheck, 'Nội suy góc quay hướng xe (Góc Yaw trục Z đường ngắn nhất)'),
          h('label', { style: { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' } }, tiltCheck, 'Cho phép xe nghiêng Roll/Pitch theo dốc (Tắt = Khóa thăng bằng mặt đường)'),
          h('label', { style: { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' } }, sizeLockCheck, h('span', { style: { color: '#177ddc', fontWeight: 500 } }, 'Khóa kích thước hộp (Giữ nguyên kích thước L, W, H chuẩn)'))
        ),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' } }, closeBtn, applyBtn)
      );

      overlay.onclick = (e) => { if (e.target === overlay) modalClose(); };
      overlay.append(modal);
      root.append(overlay);
    }

    // ---------- 2. THAO TÁC HÀNG LOẠT (Batch Operations Bar) ----------
    function updateBatchBar() {
      if (selectedFrames.size === 0) {
        batchBar.hidden = true;
        return;
      }
      batchBar.hidden = false;
      batchBar.replaceChildren();

      const sorted = [...selectedFrames].sort((a, b) => a - b);
      const isSingle = sorted.length === 1;
      const minF = sorted[0];
      const maxF = sorted[sorted.length - 1];

      // Khi chỉ chọn 1 frame đơn
      if (isSingle) {
        const curPos = track.at(minF);
        const isKf = !!curPos?.keyframe;

        const infoTag = h('span', { style: { fontWeight: 600, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '5px' } },
          `Frame ${minF}`,
          h('span', { class: isKf ? 'kf' : 'kf interp' }, isKf ? 'Keyframe' : 'Nội suy')
        );

        const interpBtn = h('button', {
          style: { background: '#1f6feb', color: '#fff', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' },
          title: 'Nội suy chọn lọc giữa 2 mốc keyframe kề cận (Phím I)',
          onclick: () => openSelectiveInterpModal(minF, minF)
        }, SP.icons.interpolate(12), 'Nội suy', h('span', { class: 'c2-kbd', style: { color: '#fff', borderColor: '#388bfd' } }, 'I'));

        const toggleKfBtn = h('button', {
          title: isKf ? 'Xóa keyframe để trở thành frame nội suy (Phím K)' : 'Chốt vị trí hiện tại thành keyframe cố định (Phím K)',
          style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
          onclick: () => {
            if (isKf) track.removeKeyframe(minF);
            else track.createKeyframe(minF);
            afterEdit();
            app.setStatus(isKf ? `Đã xóa Keyframe f${minF}` : `Đã chốt Keyframe f${minF}`, 'ok');
          }
        }, isKf ? SP.icons.close(12) : SP.icons.check(12), isKf ? 'Xóa KF' : 'Chốt KF', h('span', { class: 'c2-kbd' }, 'K'));

        const flipBtn = h('button', {
          style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
          title: 'Đảo đầu xe 180° tức thì (Phím F)',
          onclick: () => {
            track.flipHeadingBatch([minF]);
            afterEdit();
            app.setStatus(`Đã đảo chiều đầu xe 180° cho f${minF}`, 'ok');
          }
        }, SP.icons.flip(12), 'Đảo 180°', h('span', { class: 'c2-kbd' }, 'F'));

        const snapGroundBtn = h('button', {
          style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
          title: 'Hút đáy box sát đất theo laser LiDAR (Phím G)',
          onclick: async () => {
            const cloud = await frameData.cloud(minF);
            const pos = track.at(minF);
            if (pos) {
              const res = G.snapToGround(cloud.xyz, pos.box);
              if (res) track.setBox(minF, res.box);
              afterEdit();
              app.setStatus(`Đã hút đáy chạm đất cho f${minF}`, 'ok');
            }
          }
        }, SP.icons.ground(12), 'Hút đất', h('span', { class: 'c2-kbd' }, 'G'));

        const transformBtn = h('button', {
          class: 'c2-btn-dropdown',
          title: 'Xoay Yaw ±5°/±15°, Cân bằng Roll/Pitch 0°, Đổi kích thước...',
          onclick: (e) => showTransformDropdown(e.currentTarget, minF)
        }, SP.icons.transform ? SP.icons.transform(12) : SP.icons.rotateCw(12), 'Biến đổi ▾');

        const profileBtn = h('button', {
          class: 'c2-btn-dropdown',
          title: 'Gán cấu hình Profile kích thước cho frame này',
          onclick: (e) => showProfilePicker(e.currentTarget, minF, () => updateBatchBar())
        }, 'Profile ▾');

        const attrBtn = h('button', {
          class: 'c2-btn-dropdown',
          title: 'Sửa Attributes, Occluded (Khuất), Outside (Ẩn) cho frame này',
          onclick: (e) => showAttributePicker(e.currentTarget, minF, () => updateBatchBar())
        }, 'Attributes ▾');

        const isOutside = !!curPos?.outside;
        const outsideBtn = h('button', {
          title: isOutside ? 'Gỡ trạng thái Outside (O)' : 'Đánh dấu là Outside (Ẩn) (O)',
          style: { borderColor: isOutside ? '#52c41a' : 'rgba(218, 54, 51, 0.55)', color: isOutside ? '#73d13d' : '#ff7875', display: 'inline-flex', alignItems: 'center', gap: '3px' },
          onclick: () => {
            track.setOutsideBatch([minF], !isOutside);
            afterEdit();
            app.setStatus(`Đã đặt Outside = ${!isOutside} cho f${minF}`, 'ok');
          }
        }, isOutside ? 'Gỡ Outside' : 'Gán Outside', h('span', { class: 'c2-kbd', style: { color: isOutside ? '#73d13d' : '#ff7875', borderColor: isOutside ? '#237804' : '#5c2223' } }, 'O'));

        const isOcc = !!curPos?.occluded;
        const occBtn = h('button', {
          title: isOcc ? 'Gỡ trạng thái Khuất (U)' : 'Đánh dấu trạng thái Khuất (U)',
          style: { borderColor: 'rgba(250, 173, 20, 0.5)', color: '#ffc53d', display: 'inline-flex', alignItems: 'center', gap: '3px' },
          onclick: () => {
            track.setOccludedBatch([minF], !isOcc);
            afterEdit();
            app.setStatus(`Đã đặt Occluded = ${!isOcc} cho f${minF}`, 'ok');
          }
        }, isOcc ? 'Bỏ Khuất' : 'Đánh Khuất', h('span', { class: 'c2-kbd', style: { color: '#ffc53d', borderColor: '#594214' } }, 'U'));

        const deselectBtn = h('button', {
          style: { cursor: 'pointer', background: 'transparent', border: '1px solid #434343', color: '#ff7875', borderRadius: '2px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' },
          onclick: () => { selectedFrames.clear(); lastSelectedFrame = null; updateSelectionUI(); }
        }, SP.icons.close(10), 'Bỏ chọn');

        batchBar.append(
          infoTag,
          h('span', { class: 'divider' }),
          interpBtn,
          toggleKfBtn,
          flipBtn,
          snapGroundBtn,
          transformBtn,
          profileBtn,
          attrBtn,
          h('span', { class: 'divider' }),
          outsideBtn,
          occBtn,
          deselectBtn
        );
        return;
      }

      // Khi chọn nhiều frames (selectedFrames.size > 1)
      const dxIn = h('input', { type: 'number', step: '0.05', value: '0', style: { width: '45px' } });
      const dyIn = h('input', { type: 'number', step: '0.05', value: '0', style: { width: '45px' } });
      const dzIn = h('input', { type: 'number', step: '0.05', value: '0', style: { width: '45px' } });

      const applyShiftBtn = h('button', {
        class: 'primary small',
        onclick: () => {
          const dx = Number(dxIn.value) || 0, dy = Number(dyIn.value) || 0, dz = Number(dzIn.value) || 0;
          track.shiftBatch([...selectedFrames], [dx, dy, dz]);
          afterEdit();
          app.setStatus(`Đã tịnh tiến ${selectedFrames.size} frames lượng [${dx}, ${dy}, ${dz}]`, 'ok');
        }
      }, 'Dịch (Shift)');

      const interpBtn = h('button', {
        style: { background: '#1f6feb', color: '#fff', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' },
        title: 'Nội suy chọn lọc giữa 2 mốc keyframe đầu và cuối (Phím I)',
        onclick: () => openSelectiveInterpModal(minF, maxF)
      }, SP.icons.interpolate(12), 'Nội suy', h('span', { class: 'c2-kbd', style: { color: '#fff', borderColor: '#388bfd' } }, 'I'));

      const removeKfBtn = h('button', {
        title: 'Xóa keyframe của các frame đã chọn để tự động nội suy',
        style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
        onclick: () => {
          track.removeKeyframesBatch([...selectedFrames]);
          afterEdit();
          app.setStatus(`Đã xóa keyframe cho ${selectedFrames.size} frames`, 'ok');
        }
      }, SP.icons.close(12), 'Xóa KF');

      const makeKfBtn = h('button', {
        title: 'Chốt vị trí hiện tại thành keyframe cố định (Phím K)',
        style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
        onclick: () => {
          track.createKeyframesBatch([...selectedFrames]);
          afterEdit();
          app.setStatus(`Đã chốt keyframe cho ${selectedFrames.size} frames`, 'ok');
        }
      }, SP.icons.check(12), 'Chốt KF', h('span', { class: 'c2-kbd' }, 'K'));

      const flipBtn = h('button', {
        style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
        title: 'Đảo đầu xe 180° tức thì (Phím F)',
        onclick: () => {
          track.flipHeadingBatch([...selectedFrames]);
          afterEdit();
          app.setStatus(`Đã đảo chiều đầu xe 180° cho ${selectedFrames.size} frames`, 'ok');
        }
      }, SP.icons.flip(12), 'Đảo 180°', h('span', { class: 'c2-kbd' }, 'F'));

      const snapGroundBtn = h('button', {
        style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
        title: 'Hút đáy box sát đất theo laser LiDAR (Phím G)',
        onclick: async () => {
          for (const f of selectedFrames) {
            const cloud = await frameData.cloud(f);
            const pos = track.at(f);
            if (pos) {
              const res = G.snapToGround(cloud.xyz, pos.box);
              if (res) track.setBox(f, res.box);
            }
          }
          afterEdit();
          app.setStatus(`Đã hút đáy chạm đất cho ${selectedFrames.size} frames`, 'ok');
        }
      }, SP.icons.ground(12), 'Hút đất', h('span', { class: 'c2-kbd' }, 'G'));

      const transformBtn = h('button', {
        class: 'c2-btn-dropdown',
        title: 'Xoay Yaw ±5°/±15°, Cân bằng Roll/Pitch 0°, Đồng bộ Size L/W/H...',
        onclick: (e) => showTransformDropdown(e.currentTarget, [...selectedFrames])
      }, SP.icons.transform ? SP.icons.transform(12) : SP.icons.rotateCw(12), 'Biến đổi ▾');

      const assignProfileBtn = h('button', {
        title: 'Gán hoặc cập nhật cấu hình kích thước đồng bộ cho tất cả các frame đang chọn',
        style: { display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#262626', border: '1px solid #177ddc', color: '#40a9ff', fontWeight: 600 },
        onclick: (e) => {
          showProfilePicker(e.currentTarget, [...selectedFrames], () => updateBatchBar());
        }
      }, 'Cấu hình Profile ▾');

      const batchAttrBtn = h('button', {
        title: 'Chỉnh sửa thuộc tính (Attributes), Occluded & Outside cùng lúc cho toàn bộ các frame đang chọn',
        style: { display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#262626', border: '1px solid #177ddc', color: '#40a9ff', fontWeight: 600 },
        onclick: (e) => {
          showAttributePicker(e.currentTarget, [...selectedFrames], () => updateBatchBar());
        }
      }, 'Sửa Attributes ▾');

      const batchOutsideBtn = h('button', {
        title: 'Đánh dấu các frame đã chọn là Outside = true (Phím tắt: O)',
        style: { borderColor: 'rgba(218, 54, 51, 0.55)', color: '#ff7875', display: 'inline-flex', alignItems: 'center', gap: '3px' },
        onclick: () => {
          track.setOutsideBatch([...selectedFrames], true);
          afterEdit();
          app.setStatus(`Đã đặt Outside = true cho ${selectedFrames.size} frames`, 'ok');
        }
      }, 'Gán Outside', h('span', { class: 'c2-kbd', style: { color: '#ff7875', borderColor: '#5c2223' } }, 'O'));

      const batchClearOutsideBtn = h('button', {
        title: 'Gỡ trạng thái Outside (đặt Outside = false) cho các frame đã chọn',
        onclick: () => {
          track.setOutsideBatch([...selectedFrames], false);
          afterEdit();
          app.setStatus(`Đã gỡ Outside cho ${selectedFrames.size} frames`, 'ok');
        }
      }, 'Gỡ Outside');

      const batchOccludedBtn = h('button', {
        title: 'Đánh dấu/Gỡ trạng thái Khuất (Occluded) cho các frame đã chọn (Phím tắt: U)',
        style: { borderColor: 'rgba(250, 173, 20, 0.5)', color: '#ffc53d', display: 'inline-flex', alignItems: 'center', gap: '3px' },
        onclick: () => {
          const allOcc = [...selectedFrames].every((f) => track.at(f)?.occluded);
          track.setOccludedBatch([...selectedFrames], !allOcc);
          afterEdit();
          app.setStatus(`Đã đặt Occluded = ${!allOcc} cho ${selectedFrames.size} frames`, 'ok');
        }
      }, 'Đảo Khuất', h('span', { class: 'c2-kbd', style: { color: '#ffc53d', borderColor: '#594214' } }, 'U'));

      const deselectBtn = h('button', {
        style: { cursor: 'pointer', background: 'transparent', border: '1px solid #434343', color: '#ff7875', borderRadius: '2px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' },
        onclick: () => { selectedFrames.clear(); lastSelectedFrame = null; updateSelectionUI(); }
      }, SP.icons.close(10), 'Bỏ chọn');

      batchBar.append(
        h('span', { style: { fontWeight: 600, color: '#fff' } }, `Đang chọn ${selectedFrames.size}f (f${minF}→f${maxF})`),
        h('span', { class: 'divider' }),
        h('label', {}, 'ΔX:', dxIn),
        h('label', {}, 'ΔY:', dyIn),
        h('label', {}, 'ΔZ:', dzIn),
        applyShiftBtn,
        h('span', { class: 'divider' }),
        interpBtn,
        makeKfBtn,
        removeKfBtn,
        flipBtn,
        snapGroundBtn,
        transformBtn,
        h('span', { class: 'divider' }),
        assignProfileBtn,
        batchAttrBtn,
        batchOutsideBtn,
        batchClearOutsideBtn,
        batchOccludedBtn,
        deselectBtn
      );
    }

    function toggleSelectAllVisibleFrames() {
      const visibleFrames = [...rows.keys()];
      if (!visibleFrames.length) {
        app.setStatus('Không có frame nào trong phạm vi frame đang hiển thị', 'ok');
        return;
      }
      const allSelected = visibleFrames.every((f) => selectedFrames.has(f));
      if (allSelected) {
        for (const f of visibleFrames) selectedFrames.delete(f);
        lastSelectedFrame = null;
        app.setStatus(`Đã bỏ chọn ${visibleFrames.length} frame đang hiển thị`, 'ok');
      } else {
        for (const f of visibleFrames) selectedFrames.add(f);
        app.setStatus(`Đã chọn toàn bộ ${visibleFrames.length} frame đang hiển thị`, 'ok');
      }
      updateSelectionUI();
    }

    function selectAllKeyframes() {
      const visibleKfFrames = [];
      for (const f of rows.keys()) {
        if (track.at(f)?.keyframe) visibleKfFrames.push(f);
      }
      if (!visibleKfFrames.length) {
        app.setStatus('Không có keyframe nào trong phạm vi frame đang hiển thị', 'ok');
        return;
      }
      const allSelected = visibleKfFrames.every((f) => selectedFrames.has(f));
      if (allSelected) {
        for (const f of visibleKfFrames) selectedFrames.delete(f);
        lastSelectedFrame = null;
        app.setStatus(`Đã bỏ chọn ${visibleKfFrames.length} keyframe đang hiển thị`, 'ok');
      } else {
        for (const f of visibleKfFrames) selectedFrames.add(f);
        app.setStatus(`Đã chọn ${visibleKfFrames.length} keyframe trong phạm vi hiển thị`, 'ok');
      }
      updateSelectionUI();
    }

    function selectPointsThreshold(maxPoints = 0) {
      const matched = [];
      for (const [f, r] of rows.entries()) {
        const cnt = r.getPointCount ? r.getPointCount() : 0;
        if (cnt <= maxPoints) matched.push(f);
      }
      if (!matched.length) {
        app.setStatus(`Không có frame nào có số điểm ≤ ${maxPoints} trong danh sách hiện tại`, 'ok');
        return;
      }
      const allSelected = matched.every((f) => selectedFrames.has(f));
      if (allSelected) {
        for (const f of matched) selectedFrames.delete(f);
        lastSelectedFrame = null;
        app.setStatus(`Đã bỏ chọn ${matched.length} frame có số điểm ≤ ${maxPoints}`, 'ok');
      } else {
        for (const f of matched) selectedFrames.add(f);
        app.setStatus(`Đã chọn ${matched.length} frame có số điểm ≤ ${maxPoints}`, 'ok');
      }
      updateSelectionUI();
    }

    function selectDistanceThreshold(op = '>', thresh = 80) {
      const matched = [];
      for (const f of rows.keys()) {
        const pos = track.at(f);
        if (!pos) continue;
        const dist = Math.hypot(pos.box.c[0], pos.box.c[1]);
        const isMatch = (op === '>') ? (dist > thresh) : (dist < thresh);
        if (isMatch) matched.push(f);
      }
      if (!matched.length) {
        app.setStatus(`Không có frame nào có khoảng cách ${op} ${thresh}m trong danh sách hiện tại`, 'ok');
        return;
      }
      const allSelected = matched.every((f) => selectedFrames.has(f));
      if (allSelected) {
        for (const f of matched) selectedFrames.delete(f);
        lastSelectedFrame = null;
        app.setStatus(`Đã bỏ chọn ${matched.length} frame có khoảng cách ${op} ${thresh}m`, 'ok');
      } else {
        for (const f of matched) selectedFrames.add(f);
        app.setStatus(`Đã chọn ${matched.length} frame có khoảng cách ${op} ${thresh}m`, 'ok');
      }
      updateSelectionUI();
    }

    function selectZeroPointFrames() {
      selectPointsThreshold(S.selPointThresh ?? 0);
    }

    function selectFarFrames() {
      const thresh = SP.qa ? SP.qa.getGlobal().maxDistM : (S.maxDistM || 80);
      selectDistanceThreshold(S.selDistOp || '>', thresh);
    }

    // ---------- 3. RANGE SELECTION & DRAG SELECTION (Chuẩn Windows Explorer & CAD) ----------
    function selectFrameRange(targetFrame, { isShift = false, isCtrl = false } = {}) {
      const visibleList = [...rows.keys()];
      if (!visibleList.length) return;

      if (isShift && lastSelectedFrame !== null) {
        const idxA = visibleList.indexOf(lastSelectedFrame);
        const idxB = visibleList.indexOf(targetFrame);
        if (idxA >= 0 && idxB >= 0) {
          const start = Math.min(idxA, idxB);
          const end = Math.max(idxA, idxB);
          const range = visibleList.slice(start, end + 1);
          if (!isCtrl) {
            selectedFrames.clear();
          }
          for (const f of range) {
            selectedFrames.add(f);
          }
        } else {
          if (!isCtrl) selectedFrames.clear();
          selectedFrames.add(targetFrame);
          lastSelectedFrame = targetFrame;
        }
      } else if (isCtrl) {
        if (selectedFrames.has(targetFrame)) {
          selectedFrames.delete(targetFrame);
        } else {
          selectedFrames.add(targetFrame);
        }
        lastSelectedFrame = targetFrame;
      } else {
        selectedFrames.clear();
        selectedFrames.add(targetFrame);
        lastSelectedFrame = targetFrame;
      }
      updateSelectionUI();
    }

    function handleRowClick(frame, e) {
      if (e.target.closest('button, input, select, .c2-view, .c2-img, canvas, svg, .c2-info')) {
        return;
      }
      selectFrameRange(frame, { isShift: e.shiftKey, isCtrl: e.ctrlKey || e.metaKey });
    }

    function onInfoMouseDown(frame, e) {
      if (e.button !== 0) return; // Chỉ bắt chuột trái
      if (e.target.closest('button, a, input[type="number"], select, .c2-jump-btn')) return;

      window.getSelection()?.removeAllRanges();

      const isCheckbox = !!e.target.closest('input[type="checkbox"]');
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCheckbox && e.shiftKey) {
        e.preventDefault();
        selectFrameRange(frame, { isShift: true, isCtrl });
        return;
      }

      isDragSelecting = true;
      dragStartFrame = frame;
      dragAnchorSelection = isCtrl ? new Set(selectedFrames) : new Set();

      if (!isCheckbox) {
        e.preventDefault();
        selectFrameRange(frame, { isShift: e.shiftKey, isCtrl });
      } else {
        lastSelectedFrame = frame;
      }

      const prevUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = 'none';

      const onWindowMouseUp = () => {
        isDragSelecting = false;
        dragStartFrame = null;
        document.body.style.userSelect = prevUserSelect;
        window.removeEventListener('mouseup', onWindowMouseUp);
      };
      window.addEventListener('mouseup', onWindowMouseUp);
    }

    function onInfoMouseEnter(frame) {
      if (!isDragSelecting || dragStartFrame === null) return;
      const visibleList = [...rows.keys()];
      const idxA = visibleList.indexOf(dragStartFrame);
      const idxB = visibleList.indexOf(frame);
      if (idxA >= 0 && idxB >= 0) {
        const start = Math.min(idxA, idxB);
        const end = Math.max(idxA, idxB);
        const range = visibleList.slice(start, end + 1);
        selectedFrames = new Set(dragAnchorSelection);
        for (const f of range) {
          selectedFrames.add(f);
        }
        lastSelectedFrame = frame;
        updateSelectionUI();
      }
    }

    function updateSelectionUI() {
      for (const [f, r] of rows.entries()) {
        const isSel = selectedFrames.has(f);
        r.el.classList.toggle('sel', isSel);
        if (r.chk) r.chk.checked = isSel;
      }
      const visibleKfFrames = [];
      for (const f of rows.keys()) {
        if (track?.at(f)?.keyframe) visibleKfFrames.push(f);
      }
      const allKfSelected = visibleKfFrames.length > 0 && visibleKfFrames.every((f) => selectedFrames.has(f));
      if (selectKfBtn) {
        selectKfBtn.textContent = allKfSelected ? 'Bỏ chọn Keyframes' : 'Chọn Keyframes';
        selectKfBtn.style.background = allKfSelected ? '#177ddc' : '';
        selectKfBtn.style.color = allKfSelected ? '#fff' : '';
        selectKfBtn.style.borderColor = allKfSelected ? '#177ddc' : '';
      }
      if (selectZeroPtsBtn) {
        const zeroFrames = [];
        for (const [f, r] of rows.entries()) {
          if (r.getPointCount?.() === 0) zeroFrames.push(f);
        }
        const allZeroSelected = zeroFrames.length > 0 && zeroFrames.every((f) => selectedFrames.has(f));
        selectZeroPtsBtn.textContent = zeroFrames.length > 0
          ? (allZeroSelected ? `Bỏ chọn 0 pts (${zeroFrames.length})` : `Chọn 0 pts (${zeroFrames.length})`)
          : 'Chọn 0 pts';
        selectZeroPtsBtn.style.background = allZeroSelected ? '#da3633' : '';
        selectZeroPtsBtn.style.color = allZeroSelected ? '#fff' : (zeroFrames.length > 0 ? '#ff7875' : '');
        selectZeroPtsBtn.style.borderColor = allZeroSelected ? '#da3633' : (zeroFrames.length > 0 ? 'rgba(218, 54, 51, 0.55)' : '');
      }
      if (selectFarBtn) {
        const thresh = SP.qa ? SP.qa.getGlobal().maxDistM : (S.maxDistM || 80);
        const farFrames = [];
        for (const f of rows.keys()) {
          const pos = track?.at(f);
          if (pos && Math.hypot(pos.box.c[0], pos.box.c[1]) > thresh) {
            farFrames.push(f);
          }
        }
        const allFarSelected = farFrames.length > 0 && farFrames.every((f) => selectedFrames.has(f));
        selectFarBtn.textContent = farFrames.length > 0
          ? (allFarSelected ? `Bỏ chọn (${farFrames.length}) >` : `Chọn (${farFrames.length}) >`)
          : 'Chọn KC >';
        selectFarBtn.style.background = allFarSelected ? '#faad14' : '';
        selectFarBtn.style.color = allFarSelected ? '#141414' : (farFrames.length > 0 ? '#ffc53d' : '');
        selectFarBtn.style.borderColor = allFarSelected ? '#faad14' : (farFrames.length > 0 ? 'rgba(250, 173, 20, 0.55)' : '');
      }
      saveTrackUiState();
      updateBatchBar();
    }

    function afterEdit(sync = true) {
      for (const r of rows.values()) r.refresh(false);
      updateSelectionUI();
      renderAll();
      app.changed();
      if (sync && store && store.syncTrackToCvat) {
        store.syncTrackToCvat(track);
      }
    }

    // ---------- 4. TẢI ẢNH CAMERA & PHÓNG TO VIEW ----------
    const imgObserver = new IntersectionObserver((entries) => {
      for (const ent of entries) {
        if (!ent.isIntersecting) continue;
        const f = Number(ent.target.dataset.frame);
        const r = rows.get(f);
        if (r && !r.imgLoaded) {
          r.imgLoaded = true;
          loadImage(f, r.imgBox);
        }
      }
    }, { root: scroller, rootMargin: '250px' });

    let camNamesKnown = false;
    async function loadImage(frame, box) {
      if (!S.showImage || frameData.hasContextImages === false) { box.textContent = ''; return; }
      try {
        const imgs = await frameData.contextImages(frame);
        if (!imgs || !imgs.length) { box.textContent = 'Không có ảnh'; return; }
        if (!camNamesKnown) {
          camNamesKnown = true;
          camSel.replaceChildren(...imgs.map((im, i) =>
            h('option', { value: i, selected: i === S.camIdx }, `Cam #${i}: ${im.name.slice(0, 18)}`)));
        }
        const im = imgs[Math.min(S.camIdx || 0, imgs.length - 1)];
        const img = h('img', { src: im.url, alt: im.name });
        box.replaceChildren(img);
        box.onclick = (e) => {
          e.stopPropagation();
          showAllImages(frame);
        };
      } catch {
        box.textContent = 'Không có ảnh';
      }
    }

    function reloadVisibleImages() {
      if (frameData.hasContextImages === false || !S.showImage) return;
      for (const [f, r] of rows.entries()) {
        if (r.imgLoaded) loadImage(f, r.imgBox);
      }
    }

    async function showAllImages(frame) {
      if (frameData.hasContextImages === false) return;
      const imgs = await frameData.contextImages(frame);
      if (!imgs || !imgs.length) return;
      if (!app.openModal) return;
      const viewerList = imgs.map((im, idx) => ({ ...im, title: `#${idx} ${im.name} (f${frame})` }));
      const gridEl = h('div', {
        class: 'imgs',
        style: {
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(3, imgs.length)}, 1fr)`,
          gap: '8px',
          padding: '10px',
          overflow: 'auto',
          flex: '1',
        }
      });
      for (let i = 0; i < imgs.length; i++) {
        const im = imgs[i];
        gridEl.append(h('div', {
          class: 'imgbox',
          style: { display: 'flex', flexDirection: 'column', padding: '6px', cursor: 'zoom-in', background: '#141414', border: '1px solid #303030', borderRadius: '3px' },
          onclick: () => app.openImageViewer?.(viewerList, i),
          title: 'Bấm để phóng to ảnh (lăn chuột để zoom, kéo để di chuyển)',
        },
          h('div', { style: { fontSize: '11px', color: '#8c8c8c', marginBottom: '4px' } }, `#${i} ${im.name} · Bấm để zoom`),
          h('img', { src: im.url, style: { maxHeight: '38vh', width: '100%', objectFit: 'contain' } })
        ));
      }
      let modalRef = null;
      modalRef = app.openModal(`Tất cả ảnh Camera · Frame ${frame}`, gridEl, {
        tools: [
          h('span', { class: 'divider' }),
          h('button', {
            class: 'primary small',
            style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
            onclick: () => {
              modalRef?.close?.();
              app.switchTab('case4', { frame, trackId: track?.id });
            }
          }, SP.icons.camera(12), 'Theo dõi chuỗi Ảnh 2D từ Frame này'),
          h('span', { style: { color: '#8c8c8c', fontSize: '11px' } }, 'Bấm vào ảnh bất kỳ để mở trình phóng to (Cuộn chuột: Zoom, Kéo: Di chuyển)')
        ]
      });
    }

    function attachViewTools(viewEl, cell) {
      const bar = h('div', { class: 'vtools' },
        h('button', { title: 'Phóng to (+)', onclick: (e) => { e.stopPropagation(); grid.zoomCell(cell, 1.3); } }, '+'),
        h('button', { title: 'Thu nhỏ (−)', onclick: (e) => { e.stopPropagation(); grid.zoomCell(cell, 1 / 1.3); } }, '−'),
        h('button', { title: 'Về 1:1 (Double-click vùng trống)', onclick: (e) => { e.stopPropagation(); grid.resetCell(cell); } }, '1:1'),
        h('button', { title: 'Mở cửa sổ chỉnh sửa lớn', onclick: (e) => { e.stopPropagation(); openBigView(cell.frame, cell.view); } }, SP.icons.expandView(11))
      );
      bar.addEventListener('pointerdown', (e) => e.stopPropagation());
      viewEl.append(bar);
    }

    function openBigView(frame, initialView) {
      if (!app.openModal) return;
      let curView = initialView;
      const bWrap = h('div', { style: { position: 'relative', flex: 1, minHeight: 0, background: '#0a0d12', borderRadius: '4px', border: '1px solid #303030', overflow: 'hidden' } });
      const bScroller = h('div', { style: { position: 'absolute', inset: 0, display: 'flex' } });
      const bCellEl = h('div', { class: 'c2-view', style: { flex: 1, margin: '8px' } });
      bScroller.append(bCellEl);
      bWrap.append(bScroller);

      let bGrid = null;
      let bCell = null;

      const viewBtns = ['top', 'side', 'front'].map((v) =>
        h('button', {
          class: v === curView ? 'primary' : '',
          onclick: () => {
            curView = v;
            if (bCell) bCell.view = v;
            viewBtns.forEach((b, i) => b.classList.toggle('primary', ['top', 'side', 'front'][i] === v));
            bGrid?.requestRender();
          }
        }, v.toUpperCase())
      );

      const zoomLbl = h('span', { style: { color: '#8c8c8c', minWidth: '48px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' } }, '100%');

      app.openModal(`Track #${track.uiId} · Frame ${frame}`, bWrap, {
        tools: [
          h('span', { class: 'divider' }),
          ...viewBtns,
          h('span', { class: 'divider' }),
          h('button', { onclick: () => bGrid?.zoomCell(bCell, 1.3) }, '＋ Zoom'),
          h('button', { onclick: () => bGrid?.zoomCell(bCell, 1 / 1.3) }, '－ Zoom'),
          h('button', { onclick: () => bGrid?.resetCell(bCell) }, '1:1 Reset'),
          zoomLbl,
          h('span', { style: { color: '#8c8c8c', fontSize: '11px' } }, 'Lăn chuột: Zoom · Kéo nền: Pan · Kéo cạnh/góc: Sửa Box'),
        ],
        onClose: () => {
          bGrid?.destroy();
          bGrid = null;
        }
      });

      bGrid = new SP.GridView({
        wrap: bWrap,
        scroller: bScroller,
        settings: { ...settings, zoom: { top: 1, side: 1, front: 1 } },
        getCloud,
        getBox: (f) => track.at(f),
        onEditStart: () => {
          if (app.snapshot) app.snapshot([track.id]);
          else track.snapshot();
        },
        onEdit: (f, box) => {
          track.setBox(f, box);
          rows.get(f)?.refresh(true);
          renderAll();
        },
        onEditEnd: () => afterEdit(),
        onEditCancel: () => app.dropLastSnapshot?.(),
        onZoom: (c) => { zoomLbl.textContent = `${Math.round(c.zoom * 100)}%`; },
      });
      bCell = bGrid.addCell(bCellEl, frame, curView);
      requestAnimationFrame(() => bGrid?.resize());
    }

    // ---------- 5. DỰNG TỪNG DÒNG FRAME (Tối ưu cập nhật DOM tại chỗ) ----------
    function buildRow(frame) {
      const el = h('div', { class: `c2-row ${frame === currentCvatFrame ? 'cvat-cur' : ''}`, 'data-frame': frame });
      const info = h('div', { class: 'c2-info', style: { cursor: 'pointer' } });
      const imgBox = h('div', { class: 'c2-img' }, 'Đang tải ảnh…');
      const vTop = h('div', { class: 'c2-view' });
      const vSide = h('div', { class: 'c2-view' });
      const vFront = h('div', { class: 'c2-view' });

      el.append(info, imgBox, vTop, vSide, vFront);
      el.addEventListener('click', (e) => handleRowClick(frame, e));

      info.addEventListener('mousedown', (e) => onInfoMouseDown(frame, e));
      info.addEventListener('mouseenter', () => onInfoMouseEnter(frame));

      const chk = h('input', {
        type: 'checkbox',
        class: 'c2-frame-check',
        style: { cursor: 'pointer', margin: '0 4px 0 0', accentColor: '#177ddc', verticalAlign: 'middle' },
        checked: selectedFrames.has(frame),
        title: `Chọn frame ${frame} (Giữ Shift để chọn dải)`,
        onclick: (e) => {
          e.stopPropagation();
          if (e.shiftKey) {
            selectFrameRange(frame, { isShift: true, isCtrl: e.ctrlKey || e.metaKey });
          } else {
            selectFrameRange(frame, { isShift: false, isCtrl: true });
          }
        }
      });

      const jumpToCvat = async (e) => {
        e.stopPropagation();
        const pos = track.at(frame);
        const targetCenter = pos?.box?.c ? pos.box.c.slice() : null;
        currentCvatFrame = frame;
        for (const [f, r] of rows.entries()) {
          r.el.classList.toggle('cvat-cur', f === frame);
        }
        await SP.bridge.focusTrackInMain({
          frame,
          clientID: track.id,
          targetCenter,
        });
        app.setStatus(`Đã nhảy CVAT tới Frame ${frame} & khóa Camera 3D vào Track #${track.uiId}`, 'ok');
      };

      const frameLbl = h('b', {
        style: { color: '#fff', cursor: 'pointer', textDecoration: 'underline dotted #595959' },
        title: `Bấm để nhảy màn hình CVAT tới Frame ${frame} và lia Camera 3D vào Cuboid #${track.uiId}`,
        onclick: jumpToCvat,
      }, `f${frame}`);

      const jumpBtn = h('button', {
        class: 'c2-jump-btn',
        title: `Nhảy CVAT tới Frame ${frame}, chọn Cuboid #${track.uiId} & lia thẳng Camera 3D vào hộp`,
        onclick: jumpToCvat,
      }, SP.icons.focusTarget(12));

      const kfBadge = h('span', { class: 'kf' }, 'Keyframe');
      const ptsBadge = h('span', {
        style: {
          fontSize: '10px',
          fontWeight: 600,
          padding: '1px 5px',
          borderRadius: '2px',
          fontVariantNumeric: 'tabular-nums',
          border: '1px solid #303030',
          color: '#8c8c8c',
          background: '#141414',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px'
        },
        title: 'Đang chờ tải dữ liệu Point Cloud cho frame này…'
      }, '… pts');
      const distBadge = h('span', {
        style: {
          fontSize: '10px',
          fontWeight: 600,
          padding: '1px 5px',
          borderRadius: '2px',
          fontVariantNumeric: 'tabular-nums',
          border: '1px solid rgba(56, 139, 253, 0.3)',
          color: '#58a6ff',
          background: 'rgba(56, 139, 253, 0.1)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px'
        },
        onclick: (e) => {
          e.stopPropagation();
          selectFarFrames();
        }
      }, '0.0m');
      const profSlot = h('span', { style: { display: 'inline-flex' } });
      const overlapSlot = h('span', { style: { display: 'inline-flex' } });
      let lastCountSig = '';
      let cachedPtCount = null;

      const valX = h('span', { style: { color: '#fff' } }, '0.000');
      const valY = h('span', { style: { color: '#fff' } }, '0.000');
      const valZ = h('span', { style: { color: '#fff' } }, '0.000');
      const valL = h('span', { style: { color: '#fff' } }, '0.000');
      const valW = h('span', { style: { color: '#fff' } }, '0.000');
      const valH = h('span', { style: { color: '#fff' } }, '0.000');

      const flipBtn = h('button', {
        title: 'Đảo ngược đầu xe 180° tức thì (Phím F)',
        style: { display: 'inline-flex', alignItems: 'center', gap: '3px' },
        onclick: (e) => {
          e.stopPropagation();
          const pos = track.at(frame);
          if (!pos) return;
          if (app.snapshot) app.snapshot([track.id]);
          else track.snapshot();
          const b = G.cloneBox(pos.box);
          b.r = G.quickFlipHeading(b.r);
          track.setBox(frame, b);
          afterEdit();
        }
      }, '180°', h('span', { class: 'c2-kbd' }, 'F'));

      const snapBtn = h('button', {
        title: 'Hút đáy box chạm đất theo điểm laser LiDAR (Phím G)',
        style: { display: 'inline-flex', alignItems: 'center', gap: '3px' },
        onclick: async (e) => {
          e.stopPropagation();
          const pos = track.at(frame);
          if (!pos) return;
          const cloud = await frameData.cloud(frame);
          const res = G.snapToGround(cloud.xyz, pos.box);
          if (res) {
            if (app.snapshot) app.snapshot([track.id]);
            else track.snapshot();
            track.setBox(frame, res.box);
            afterEdit();
            app.setStatus(`f${frame}: Đã hút đáy box chạm mặt đất`, 'ok');
          } else {
            app.setStatus(`f${frame}: Không đủ điểm mặt đất`, 'err');
          }
        }
      }, 'Hút đất', h('span', { class: 'c2-kbd' }, 'G'));

      const profBtn = h('button', {
        style: { padding: '1px 5px', fontSize: '11px' },
        title: 'Đổi hoặc gán cấu hình kích thước (nếu đang chọn nhiều frame sẽ áp dụng cho toàn bộ các frame đã chọn)',
        onclick: (e) => {
          e.stopPropagation();
          const targets = (selectedFrames.has(frame) && selectedFrames.size > 1) ? [...selectedFrames] : frame;
          showProfilePicker(e.currentTarget, targets, () => afterEdit(false));
        }
      }, 'Profile');

      const attrBtn = h('button', {
        style: { padding: '1px 5px', fontSize: '11px' },
        title: 'Sửa thuộc tính Class (Attributes), Occluded & Outside (hỗ trợ sửa hàng loạt nếu đang chọn nhiều frame)',
        onclick: (e) => {
          e.stopPropagation();
          const targets = (selectedFrames.has(frame) && selectedFrames.size > 1) ? [...selectedFrames] : frame;
          showAttributePicker(e.currentTarget, targets, () => afterEdit(false));
        }
      }, 'Attrs');

      info.append(
        h('div', { class: 'head' },
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '3px' } }, chk, frameLbl, jumpBtn),
          kfBadge,
          ptsBadge,
          distBadge,
          profSlot,
          overlapSlot
        ),
        h('div', { class: 'grid' },
          h('span', { style: { color: '#8c8c8c' } }, 'X:'), valX,
          h('span', { style: { color: '#8c8c8c' } }, 'L:'), valL,
          h('span', { style: { color: '#8c8c8c' } }, 'Y:'), valY,
          h('span', { style: { color: '#8c8c8c' } }, 'W:'), valW,
          h('span', { style: { color: '#8c8c8c' } }, 'Z:'), valZ,
          h('span', { style: { color: '#8c8c8c' } }, 'H:'), valH
        ),
        h('div', { class: 'btns' }, flipBtn, snapBtn, profBtn, attrBtn)
      );

      function updatePointCount(pos) {
        if (!pos) pos = track.at(frame);
        if (!pos) return;
        const cloud = getCloud(frame);
        if (!cloud || !cloud.xyz) {
          if (lastCountSig !== 'unloaded') {
            lastCountSig = 'unloaded';
            cachedPtCount = null;
            ptsBadge.textContent = '… pts';
            ptsBadge.style.color = '#8c8c8c';
            ptsBadge.style.background = '#141414';
            ptsBadge.style.borderColor = '#303030';
            ptsBadge.title = 'Đang chờ tải dữ liệu Point Cloud cho frame này…';
          }
          return;
        }
        const b = pos.box;
        const sig = `${cloud.xyz.length}:${b.c[0].toFixed(3)},${b.c[1].toFixed(3)},${b.c[2].toFixed(3)},${b.s[0].toFixed(3)},${b.s[1].toFixed(3)},${b.s[2].toFixed(3)},${b.r[0].toFixed(3)},${b.r[1].toFixed(3)},${b.r[2].toFixed(3)}`;
        if (sig === lastCountSig) return;
        lastCountSig = sig;
        const count = G.countPointsInsideBox
          ? G.countPointsInsideBox(cloud.xyz, b, 0.02)
          : G.getPointsInsideBox(cloud.xyz, b, 0.02).length;
        cachedPtCount = count;
        if (count === 0) {
          ptsBadge.replaceChildren(SP.icons.warning(10), ' 0 pts');
          ptsBadge.style.color = '#ff7875';
          ptsBadge.style.background = 'rgba(218, 54, 51, 0.18)';
          ptsBadge.style.borderColor = 'rgba(218, 54, 51, 0.55)';
          ptsBadge.title = 'Box rỗng (0 điểm LiDAR bên trong) — Nên kiểm tra lại vị trí hoặc đánh dấu Khuất (Occluded) / Outside';
        } else if (count < 5) {
          ptsBadge.textContent = `${count} pts`;
          ptsBadge.style.color = '#ffc53d';
          ptsBadge.style.background = 'rgba(250, 173, 20, 0.16)';
          ptsBadge.style.borderColor = 'rgba(250, 173, 20, 0.5)';
          ptsBadge.title = `Có ${count} điểm LiDAR trong box (mật độ rất thưa < 5 điểm)`;
        } else {
          ptsBadge.textContent = `${count} pts`;
          ptsBadge.style.color = '#73d13d';
          ptsBadge.style.background = 'rgba(82, 196, 26, 0.14)';
          ptsBadge.style.borderColor = 'rgba(82, 196, 26, 0.45)';
          ptsBadge.title = `Có ${count} điểm LiDAR nằm trong box`;
        }
      }

      function refresh(fast = false) {
        const pos = track.at(frame);
        if (!pos) return;

        chk.checked = selectedFrames.has(frame);
        kfBadge.className = `kf ${pos.keyframe ? '' : 'interp'}`;
        kfBadge.textContent = pos.keyframe ? 'Keyframe' : 'Nội suy';

        valX.textContent = fmt(pos.box.c[0]);
        valY.textContent = fmt(pos.box.c[1]);
        valZ.textContent = fmt(pos.box.c[2]);
        valL.textContent = fmt(pos.box.s[0]);
        valW.textContent = fmt(pos.box.s[1]);
        valH.textContent = fmt(pos.box.s[2]);

        // Tính khoảng cách từ gốc LiDAR (0,0) tới tâm hộp D = sqrt(X^2 + Y^2)
        const distXY = Math.hypot(pos.box.c[0], pos.box.c[1]);
        const dist3D = Math.hypot(pos.box.c[0], pos.box.c[1], pos.box.c[2]);
        const thresh = S.maxDistM || 80;
        const isFar = distXY > thresh;
        if (isFar) {
          distBadge.replaceChildren(SP.icons.warning(10), ` ${distXY.toFixed(1)}m`);
        } else {
          distBadge.textContent = `${distXY.toFixed(1)}m`;
        }
        distBadge.style.color = isFar ? '#ffc53d' : '#58a6ff';
        distBadge.style.background = isFar ? 'rgba(250, 173, 20, 0.18)' : 'rgba(56, 139, 253, 0.10)';
        distBadge.style.borderColor = isFar ? 'rgba(250, 173, 20, 0.55)' : 'rgba(56, 139, 253, 0.30)';
        distBadge.title = isFar
          ? `Khoảng cách từ gốc LiDAR (0,0): ${distXY.toFixed(2)}m (> ${thresh}m theo Guideline) — Bấm để chọn tất cả các frame vượt ngưỡng!`
          : `Khoảng cách ngang từ gốc LiDAR (0,0): ${distXY.toFixed(2)}m (3D: ${dist3D.toFixed(2)}m)`;

        // Khi kéo 1 hoặc ít frame (<= 5), cập nhật số điểm real-time (< 0.15ms/frame nhờ lọc AABB)
        if (!fast || selectedFrames.size <= 5) {
          updatePointCount(pos);
        }

        if (fast) return;

        // Cập nhật nút Attrs (hiển thị tóm tắt nếu có Occluded hoặc Attributes)
        const attrDefs = store.labelAttributes ? store.labelAttributes(track.labelId) : [];
        const activeAttrVals = [];
        if (pos.occluded) activeAttrVals.push('Occluded');
        for (const a of attrDefs) {
          const v = pos.attributes?.[a.id];
          if (v !== undefined && v !== '') activeAttrVals.push(`${a.name}: ${v}`);
        }
        attrBtn.textContent = pos.occluded ? 'Attrs • Khuất' : (attrDefs.length ? `Attrs (${attrDefs.length})` : 'Attrs');
        attrBtn.style.borderColor = pos.occluded ? '#faad14' : '';
        attrBtn.style.color = pos.occluded ? '#ffc53d' : '';
        if (activeAttrVals.length) {
          attrBtn.title = `Thuộc tính hiện tại: ${activeAttrVals.join(' | ')} (Bấm để sửa)`;
        }

        // Cập nhật nhãn Profile (hỗ trợ sửa nhiều frame cùng lúc khi dòng đang được chọn)
        profSlot.replaceChildren();
        const pm = store.profileManager;
        const prof = pm?.getFrameProfile(track.id, frame);
        if (prof) {
          profSlot.append(h('span', {
            class: 'prof-pill',
            style: { color: prof.color, background: `${prof.color}18`, borderColor: `${prof.color}55` },
            title: `Cấu hình: ${prof.name} (${prof.size.map(v => v.toFixed(2)).join('×')}m). Bấm để đổi cấu hình`,
            onclick: (e) => {
              e.stopPropagation();
              const targets = (selectedFrames.has(frame) && selectedFrames.size > 1) ? [...selectedFrames] : frame;
              showProfilePicker(e.currentTarget, targets, () => afterEdit(false));
            }
          },
            h('span', { style: { width: '6px', height: '6px', borderRadius: '50%', background: prof.color, display: 'inline-block' } }),
            prof.name
          ));
        } else {
          profSlot.append(h('span', {
            class: 'prof-pill empty',
            title: 'Chưa gán cấu hình kích thước riêng. Bấm để gán hoặc tạo mới',
            onclick: (e) => {
              e.stopPropagation();
              const targets = (selectedFrames.has(frame) && selectedFrames.size > 1) ? [...selectedFrames] : frame;
              showProfilePicker(e.currentTarget, targets, () => afterEdit(false));
            }
          }, '+ Profile'));
        }

        // Cập nhật nhãn cảnh báo trùng lặp bằng hàm O(N) nhanh
        overlapSlot.replaceChildren();
        if (SP.iou3d?.findTrackOverlapsAtFrame) {
          const ovs = SP.iou3d.findTrackOverlapsAtFrame(store, track.id, frame, 0.25);
          if (ovs.length) {
            const other = ovs[0].trackB;
            const pct = Math.round(ovs[0].maxOverlapRatio * 100);
            overlapSlot.append(h('span', {
              style: { background: 'rgba(218, 54, 51, 0.2)', border: '1px solid #da3633', color: '#ff7875', fontSize: '10px', fontWeight: 600, padding: '1px 5px', borderRadius: '2px', cursor: 'pointer' },
              title: `Trùng ${pct}% với Track #${other.uiId} tại Frame ${frame}! Bấm để mở Ma trận Trùng lặp ở Frame ${frame}`,
              onclick: (e) => { e.stopPropagation(); app.switchTab('case3', frame); }
            }, `Đè #${other.uiId} (${pct}%)`));
          }
        }
      }

      refresh(false);
      return {
        el,
        chk,
        imgBox,
        imgLoaded: false,
        views: [vTop, vSide, vFront],
        refresh,
        refreshPointsOnly: () => updatePointCount(),
        getPointCount: () => cachedPtCount
      };
    }

    function buildRows(preserveSelection = false) {
      const from = Number(fromIn.value) || store.frames[0];
      const to = Number(toIn.value) || store.frames[store.frames.length - 1];
      const list = store.frames.filter((f) => f >= from && f <= to);
      const listSet = new Set(list);

      grid?.clearCells();
      imgObserver.disconnect();
      rows = new Map();
      if (!preserveSelection) {
        selectedFrames.clear();
        lastSelectedFrame = null;
      } else {
        for (const f of [...selectedFrames]) {
          if (!listSet.has(f)) selectedFrames.delete(f);
        }
        if (lastSelectedFrame !== null && !listSet.has(lastSelectedFrame)) {
          lastSelectedFrame = null;
        }
      }
      updateBatchBar();
      scroller.replaceChildren();

      for (const frame of list) {
        const r = buildRow(frame);
        rows.set(frame, r);
        scroller.append(r.el);
        imgObserver.observe(r.el);
        ['top', 'side', 'front'].forEach((v, i) => {
          const cell = grid.addCell(r.views[i], frame, v);
          attachViewTools(r.views[i], cell);
        });
      }
      updateSelectionUI();
      renderAll();

      pbar.hidden = false;
      frameData.preload(list, (p) => {
        pfill.style.width = `${Math.round(p.fraction * 100)}%`;
        ptext.textContent = `Tải point cloud ${Math.round(p.fraction * 100)}%…`;
        for (const r of rows.values()) {
          if (r.getPointCount() === null) r.refreshPointsOnly();
        }
        updateSelectionUI();
        if (p.done >= p.total) {
          setTimeout(() => { pbar.hidden = true; }, 500);
          frameData.startBackgroundPrefetch();
        }
        renderAll();
      }, 6);
    }

    function openTrack(t) {
      if (!t) return;
      if (track && rows.size) {
        saveTrackUiState();
      }
      track = t;
      app.currentTrackId = t.id;
      trackSel.value = String(t.id);
      settings.refSize = refSizeOf(t);
      settings.color = store.labelColor(t.labelId);

      const saved = S.trackStates[t.id];
      if (saved) {
        fromIn.value = saved.from ?? Math.max(t.firstFrame, store.frames[0]);
        toIn.value = saved.to ?? store.frames[store.frames.length - 1];
        selectedFrames = new Set(Array.isArray(saved.selected) ? saved.selected : []);
        lastSelectedFrame = saved.lastSelectedFrame ?? null;
      } else {
        fromIn.value = Math.max(t.firstFrame, store.frames[0]);
        toIn.value = store.frames[store.frames.length - 1];
        selectedFrames.clear();
        lastSelectedFrame = null;
      }

      grid?.destroy();
      grid = new SP.GridView({
        wrap,
        scroller,
        settings,
        getCloud,
        getBox: (frame) => track.at(frame),
        onEditStart: (frame) => {
          if (app.snapshot) app.snapshot([track.id]);
          else track.snapshot();
          startDragBoxes = new Map();
          if (selectedFrames.has(frame) && selectedFrames.size > 1) {
            for (const f of selectedFrames) {
              const p = track.at(f);
              if (p) startDragBoxes.set(f, G.cloneBox(p.box));
            }
          }
        },
        onEdit: (frame, box, editMeta) => {
          const pm = store.profileManager;
          if (selectedFrames.has(frame) && selectedFrames.size > 1 && startDragBoxes.has(frame)) {
            const originBox = startDragBoxes.get(frame);

            // 1. DỊCH CHUYỂN HỘP THEO HỆ TRỤC CỤC BỘ THÂN XE (Local Frame Transformation)
            // Thay vì dùng dx, dy, dz theo hệ tọa độ LiDAR (vốn thay đổi theo hướng xe Ego và không theo thân xe),
            // ta chiếu vector dịch chuyển vào 3 trục cục bộ (ex: chiều dài mũi xe, ey: gương chiếu hậu, ez: chiều cao) của originBox:
            const originAx = G.axes(originBox.r);
            const deltaWorld = [box.c[0] - originBox.c[0], box.c[1] - originBox.c[1], box.c[2] - originBox.c[2]];
            const du = G.dot(deltaWorld, originAx.ex); // Chiều dài xe (tiến / lùi)
            const dv = G.dot(deltaWorld, originAx.ey); // Chiều ngang xe (trái / phải)
            const dw = G.dot(deltaWorld, originAx.ez); // Chiều cao xe (lên / xuống)

            // 2. XOAY THEO GÓC XOAY THỰC TẾ TRÊN TRỤC CỤC BỘ (Không bị biến dạng góc Euler)
            const normDiff = (a, b) => {
              let d = a - b;
              while (d > Math.PI) d -= 2 * Math.PI;
              while (d < -Math.PI) d += 2 * Math.PI;
              return d;
            };

            const isRotateOp = editMeta?.kind === 'rotate' && typeof editMeta.angle === 'number';
            const rotateAxis = isRotateOp ? (editMeta.axis ?? 2) : 2;
            const rotateAngle = isRotateOp ? editMeta.angle : normDiff(box.r[2], originBox.r[2]);
            const dRoll = normDiff(box.r[0], originBox.r[0]);
            const dPitch = normDiff(box.r[1], originBox.r[1]);

            const sizeChanged = [0, 1, 2].some((i) => Math.abs(box.s[i] - originBox.s[i]) > 1e-4);

            // Nếu đang kéo chỉnh kích thước và frame có gắn Profile, cập nhật luôn kích thước mới vào Profile
            const prof = pm?.getFrameProfile(track.id, frame);
            if (sizeChanged && prof) {
              prof.size = [Number(box.s[0].toFixed(3)), Number(box.s[1].toFixed(3)), Number(box.s[2].toFixed(3))];
              pm.updateProfile(track.id, prof.id, { size: prof.size });
            }

            const targetSet = new Set(selectedFrames);
            if (sizeChanged && prof) {
              for (const lf of pm.getFramesWithProfile(track.id, prof.id)) targetSet.add(lf);
            }

            for (const f of targetSet) {
              if (f === frame) {
                track.setBox(frame, box);
                rows.get(frame)?.refresh(true);
                continue;
              }
              const orig = startDragBoxes.get(f) || track.at(f)?.box;
              if (!orig) continue;
              let b = G.cloneBox(orig);
              if (selectedFrames.has(f)) {
                // Di chuyển theo hệ trục thân xe của frame f:
                // Nếu ở Frame đang kéo bạn đẩy xe tiến lên mũi xe du mét, thì ở Frame f xe cũng tiến lên đúng du mét theo đầu xe của nó!
                const targetAx = G.axes(orig.r);
                b.c = G.add(orig.c, G.add(
                  G.scale(targetAx.ex, du),
                  G.add(G.scale(targetAx.ey, dv), G.scale(targetAx.ez, dw))
                ));

                // Xoay theo góc xoay cục bộ của chính frame f:
                if (isRotateOp) {
                  if (Math.abs(rotateAngle) > 1e-5) {
                    b.r = G.rotateLocal(orig.r, rotateAxis, rotateAngle);
                  }
                } else {
                  if (Math.abs(dRoll) > 1e-5) b.r = G.rotateLocal(b.r, 0, dRoll);
                  if (Math.abs(dPitch) > 1e-5) b.r = G.rotateLocal(b.r, 1, dPitch);
                  if (Math.abs(rotateAngle) > 1e-5) b.r = G.rotateLocal(b.r, 2, rotateAngle);
                }
              }
              if (sizeChanged) {
                b.s = box.s.slice();
              }
              track.setBox(f, b);
              rows.get(f)?.refresh(true);
            }
          } else {
            const prof = pm?.getFrameProfile(track.id, frame);

            if (prof) {
              prof.size = [Number(box.s[0].toFixed(3)), Number(box.s[1].toFixed(3)), Number(box.s[2].toFixed(3))];
              pm.updateProfile(track.id, prof.id, { size: prof.size });

              const linked = pm.getFramesWithProfile(track.id, prof.id);
              for (const f of linked) {
                if (f === frame) {
                  track.setBox(frame, box);
                } else {
                  const p = track.at(f);
                  if (p) {
                    const b = G.resizeKeepBottom(p.box, box.s);
                    track.setBox(f, b);
                    rows.get(f)?.refresh(true);
                  }
                }
              }
            } else {
              track.setBox(frame, box);
              if (S.syncSize) {
                for (const sh of track.shapes) {
                  const f = sh.frame;
                  if (f !== frame && !pm?.getFrameProfileId(track.id, f)) {
                    sh.points[6] = box.s[0];
                    sh.points[7] = box.s[1];
                    sh.points[8] = box.s[2];
                    rows.get(f)?.refresh(true);
                  }
                }
              }
            }
            rows.get(frame)?.refresh(true);
          }
          renderAll();
        },
        onEditEnd: () => {
          startDragBoxes.clear();
          afterEdit();
        },
        onEditCancel: () => {
          startDragBoxes.clear();
          app.dropLastSnapshot?.();
        },
      });
      buildRows(!!saved);
      if (saved && saved.scrollTop) {
        requestAnimationFrame(() => {
          scroller.scrollTop = saved.scrollTop;
          grid?.requestRender();
        });
      }
      app.changed?.();
    }

    openTrack(track);

    return {
      refresh() {
        if (track) {
          settings.refSize = refSizeOf(track);
          settings.color = store.labelColor(track.labelId);
        }
        for (const r of rows.values()) r.refresh(false);
        updateSelectionUI();
        grid?.resize();
        renderAll();
      },
      selectTrack(trackId) {
        const target = store.track(trackId);
        if (target && (!track || target.id !== track.id)) {
          openTrack(target);
        }
      },
      onCvatFrame(frame) {
        currentCvatFrame = frame;
        for (const [f, r] of rows.entries()) {
          r.el.classList.toggle('cvat-cur', f === frame);
        }
      },
      onCvatActiveTrack(trackId, frame) {
        if (frame !== undefined) {
          currentCvatFrame = frame;
          for (const [f, r] of rows.entries()) {
            r.el.classList.toggle('cvat-cur', f === frame);
          }
        }
        const target = store.track(trackId);
        if (target && (!track || target.id !== track.id)) {
          openTrack(target);
        }
      },
      onKey(e) {
        const k = e.key.toLowerCase();

        // 1. Phím Ctrl+A / Cmd+A: Chọn tất cả các frame đang hiển thị (hoặc toggle)
        if ((e.ctrlKey || e.metaKey) && k === 'a' && !e.altKey && !e.shiftKey) {
          toggleSelectAllVisibleFrames();
          return true;
        }

        // 2. Phím Escape: Hủy bỏ nhanh vùng chọn
        if (e.key === 'Escape') {
          if (selectedFrames.size > 0) {
            selectedFrames.clear();
            lastSelectedFrame = null;
            updateSelectionUI();
            app.setStatus('Đã bỏ chọn tất cả các frame (Esc)', 'ok');
            return true;
          }
          return false;
        }

        // 3. Phím Home / End: Nhảy về frame đầu tiên / cuối cùng trong phạm vi hiển thị
        const visibleList = [...rows.keys()];
        if (visibleList.length > 0) {
          if (e.key === 'Home') {
            const target = visibleList[0];
            selectFrameRange(target, { isShift: e.shiftKey, isCtrl: false });
            SP.bridge.changeFrame(target);
            const r = rows.get(target);
            r?.el?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
            app.setStatus(`Nhảy về Frame đầu tiên: f${target} (Home)`, 'ok');
            return true;
          }
          if (e.key === 'End') {
            const target = visibleList[visibleList.length - 1];
            selectFrameRange(target, { isShift: e.shiftKey, isCtrl: false });
            SP.bridge.changeFrame(target);
            const r = rows.get(target);
            r?.el?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
            app.setStatus(`Nhảy về Frame cuối cùng: f${target} (End)`, 'ok');
            return true;
          }

          // 4. Phím Mũi tên Lên / Xuống: Lùi / Tiến từng frame
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            const dir = (e.key === 'ArrowUp') ? -1 : 1;
            let curIdx = (lastSelectedFrame !== null) ? visibleList.indexOf(lastSelectedFrame) : -1;
            if (curIdx === -1 && currentCvatFrame !== null) {
              curIdx = visibleList.indexOf(currentCvatFrame);
            }
            if (curIdx === -1) {
              curIdx = (dir > 0 ? 0 : visibleList.length - 1);
            } else {
              curIdx = Math.max(0, Math.min(visibleList.length - 1, curIdx + dir));
            }

            const target = visibleList[curIdx];
            selectFrameRange(target, { isShift: e.shiftKey, isCtrl: false });
            SP.bridge.changeFrame(target);
            const r = rows.get(target);
            r?.el?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
            return true;
          }

          // 5. Phím PageUp / PageDown: Nhảy nhanh 5 frame
          if (e.key === 'PageUp' || e.key === 'PageDown') {
            const step = (e.key === 'PageUp') ? -5 : 5;
            let curIdx = (lastSelectedFrame !== null) ? visibleList.indexOf(lastSelectedFrame) : -1;
            if (curIdx === -1 && currentCvatFrame !== null) {
              curIdx = visibleList.indexOf(currentCvatFrame);
            }
            if (curIdx === -1) curIdx = 0;
            curIdx = Math.max(0, Math.min(visibleList.length - 1, curIdx + step));

            const target = visibleList[curIdx];
            selectFrameRange(target, { isShift: e.shiftKey, isCtrl: false });
            SP.bridge.changeFrame(target);
            const r = rows.get(target);
            r?.el?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
            return true;
          }
        }

        // Các thao tác bên dưới yêu cầu phải có ít nhất 1 frame được chọn
        if (!selectedFrames.size) return false;
        if (k === 'f' || k === 'r') {
          track.flipHeadingBatch([...selectedFrames]);
          afterEdit();
          app.setStatus(`Đã đảo chiều đầu xe 180° cho ${selectedFrames.size} frames (F)`, 'ok');
          return true;
        }
        if (k === 'g') {
          (async () => {
            if (app.snapshot) app.snapshot([track.id]);
            else track.snapshot();
            let count = 0;
            for (const f of selectedFrames) {
              const cloud = await frameData.cloud(f);
              const pos = track.at(f);
              if (pos && cloud && cloud.xyz) {
                const res = G.snapToGround(cloud.xyz, pos.box);
                if (res) {
                  track.setBox(f, res.box);
                  count++;
                }
              }
            }
            afterEdit();
            app.setStatus(`Đã hút đáy chạm đất cho ${count}/${selectedFrames.size} frames (G)`, 'ok');
          })();
          return true;
        }
        if (k === 'o') {
          const allOut = [...selectedFrames].every((f) => track.at(f)?.outside);
          track.setOutsideBatch([...selectedFrames], !allOut);
          afterEdit();
          app.setStatus(`Đã đặt Outside = ${!allOut} cho ${selectedFrames.size} frames (O)`, 'ok');
          return true;
        }
        if (k === 'u') {
          const allOcc = [...selectedFrames].every((f) => track.at(f)?.occluded);
          track.setOccludedBatch([...selectedFrames], !allOcc);
          afterEdit();
          app.setStatus(`Đã đặt Occluded = ${!allOcc} cho ${selectedFrames.size} frames (U)`, 'ok');
          return true;
        }
        if (k === 'k') {
          const anyInterp = [...selectedFrames].some((f) => !track.at(f)?.keyframe);
          if (anyInterp) {
            track.createKeyframesBatch([...selectedFrames]);
            afterEdit();
            app.setStatus(`Đã chốt Keyframe cho ${selectedFrames.size} frames (K)`, 'ok');
          } else {
            track.removeKeyframesBatch([...selectedFrames]);
            afterEdit();
            app.setStatus(`Đã xóa Keyframe cho ${selectedFrames.size} frames (K)`, 'ok');
          }
          return true;
        }
        if (k === 'i' && selectedFrames.size >= 1) {
          const sorted = [...selectedFrames].sort((a, b) => a - b);
          openSelectiveInterpModal(sorted[0], sorted[sorted.length - 1]);
          return true;
        }
        return false;
      },
      unmount() {
        saveTrackUiState();
        if (activePopoverClose) activePopoverClose();
        imgObserver.disconnect();
        grid?.destroy();
        grid = null;
      },
    };
  }

  (SP.pendingTabs ||= []).push(['case2', { title: 'Sửa chuỗi Frame', mount }]);
})();
