// case3.js - Tab Case 3: Nhận diện Trùng lặp (Overlap Detection), Ma trận Heatmap & Bộ kiểm tra lỗi QA Toàn diện
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});
  const { h, fmt } = SP.ui;

  const CSS = `
    .c3-container { display: flex; flex-direction: column; height: 100%; overflow: hidden; background: #141414; color: #d9d9d9; }
    .c3-top { padding: 8px 16px; background: #1f1f1f; border-bottom: 1px solid #303030; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .c3-body { flex: 1; display: grid; grid-template-columns: 1.3fr 1fr; gap: 12px; padding: 12px; min-height: 0; overflow: hidden; }
    .c3-card { background: #1f1f1f; border: 1px solid #303030; border-radius: 4px; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
    .c3-card-head { padding: 8px 12px; background: #262626; border-bottom: 1px solid #303030; font-weight: 600; font-size: 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .c3-card-body { flex: 1; overflow: auto; padding: 10px; }
    .alert-item { background: #141414; border: 1px solid #303030; border-radius: 3px; padding: 8px 12px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px; transition: border-color 0.15s, background 0.15s; }
    .alert-item:hover { border-color: #177ddc; background: #1a1a1a; }
    .alert-item.active-alert { border-color: #177ddc; background: rgba(23, 125, 220, 0.1); }
    .alert-item.overlap { border-left: 3px solid #ff4d4f; }
    .alert-item.size { border-left: 3px solid #faad14; }
    .alert-item.speed { border-left: 3px solid #722ed1; }
    .alert-item.rotation { border-left: 3px solid #ff7a45; }
    .alert-item.distance { border-left: 3px solid #13c2c2; }
    .alert-badge { font-size: 11px; font-weight: 500; padding: 1px 6px; border-radius: 2px; white-space: nowrap; }
    .alert-badge.overlap { background: rgba(255, 77, 79, 0.2); color: #ff7875; border: 1px solid #ff4d4f; }
    .alert-badge.size { background: rgba(250, 173, 20, 0.2); color: #ffc53d; border: 1px solid #faad14; }
    .alert-badge.speed { background: rgba(114, 46, 209, 0.2); color: #b37feb; border: 1px solid #722ed1; }
    .alert-badge.rotation { background: rgba(255, 122, 69, 0.2); color: #ff9c6e; border: 1px solid #ff7a45; }
    .alert-badge.distance { background: rgba(19, 194, 194, 0.2); color: #36cfc9; border: 1px solid #13c2c2; }
    .matrix-table { border-collapse: collapse; font-size: 11px; text-align: center; }
    .matrix-table th, .matrix-table td { padding: 6px 8px; border: 1px solid #303030; min-width: 48px; font-variant-numeric: tabular-nums; }
    .matrix-table.compact th, .matrix-table.compact td { padding: 3px 5px; min-width: 32px; font-size: 10px; }
    .matrix-table thead th { background: #262626; color: #d9d9d9; position: sticky; top: 0; z-index: 2; font-weight: 600; }
    .matrix-table tbody th { background: #262626; color: #d9d9d9; position: sticky; left: 0; z-index: 1; font-weight: 600; text-align: left; white-space: nowrap; }
    .matrix-table thead th:first-child { left: 0; z-index: 3; }
    .matrix-cell { font-weight: 500; border-radius: 2px; cursor: default; transition: transform 0.1s, outline 0.1s; }
    .matrix-cell.safe { background: rgba(82, 196, 26, 0.08); color: #595959; }
    .matrix-cell.warn { background: rgba(250, 173, 20, 0.22); color: #ffc53d; cursor: pointer; }
    .matrix-cell.danger { background: rgba(255, 77, 79, 0.28); color: #ff7875; font-weight: 600; cursor: pointer; }
    .matrix-cell.warn:hover, .matrix-cell.danger:hover { outline: 1px solid #fff; z-index: 1; }
    .matrix-cell.focused { outline: 2px solid #40a9ff !important; box-shadow: inset 0 0 0 1px #40a9ff; }
    .filter-btn { background: #141414; border: 1px solid #434343; color: #8c8c8c; padding: 2px 8px; font-size: 11px; border-radius: 2px; cursor: pointer; }
    .filter-btn.active { background: #177ddc; color: #fff; border-color: #177ddc; }
    .matrix-mode-btn { background: #141414; border: 1px solid #434343; color: #8c8c8c; padding: 2px 8px; font-size: 11px; border-radius: 2px; cursor: pointer; }
    .matrix-mode-btn.active { background: #177ddc; color: #fff; border-color: #177ddc; font-weight: 600; }
    .matrix-multi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; width: 100%; align-items: start; }
    .matrix-mini-card { background: #141414; border: 1px solid #303030; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; transition: border-color 0.15s; }
    .matrix-mini-card:hover { border-color: #434343; }
    .matrix-mini-card.has-overlap { border-top: 2px solid #ff4d4f; }
    .matrix-mini-card.is-safe { border-top: 2px solid #52c41a; }
    .matrix-mini-head { padding: 5px 8px; background: #262626; border-bottom: 1px solid #303030; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    .matrix-mini-body { padding: 6px; overflow-x: auto; display: flex; justify-content: center; }

    /* Popover Cài đặt ngưỡng QA */
    .qa-btn { position: relative; display: inline-flex; align-items: center; gap: 5px; height: 24px; }
    .qa-btn .qa-dot { width: 6px; height: 6px; border-radius: 50%; background: #177ddc; display: none; }
    .qa-btn.customized .qa-dot { display: inline-block; }
    .qa-pop { position: fixed; z-index: 2147483040; width: 410px; max-width: calc(100vw - 20px); background: #1f1f1f; border: 1px solid #434343; border-radius: 4px; box-shadow: 0 12px 32px rgba(0,0,0,0.85); color: #d9d9d9; font-size: 11px; display: flex; flex-direction: column; box-sizing: border-box; overscroll-behavior: contain; }
    .qa-pop-head { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #262626; border-bottom: 1px solid #303030; border-radius: 4px 4px 0 0; font-weight: 600; color: #fff; font-size: 12px; }
    .qa-pop-body { flex: 1 1 auto; min-height: 0; padding: 8px 12px; overflow-y: auto; overscroll-behavior: contain; }
    .qa-pop-body::-webkit-scrollbar { width: 5px; }
    .qa-pop-body::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
    .qa-pop-body::-webkit-scrollbar-thumb:hover { background: #444; }
    .qa-section { margin: 4px 0 6px; color: #8c8c8c; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
    .qa-row { display: grid; grid-template-columns: 1fr 132px; gap: 8px; align-items: center; padding: 5px 0; border-bottom: 1px solid #262626; }
    .qa-row:last-child { border-bottom: 0; }
    .qa-row .qa-label { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .qa-row .qa-hint { color: #595959; font-size: 10px; }
    .qa-row .qa-err { color: #ff7875; font-size: 10px; min-height: 0; }
    .qa-field { display: inline-flex; align-items: center; gap: 4px; justify-content: flex-end; }
    .qa-field input { width: 56px; height: 24px; text-align: right; font-variant-numeric: tabular-nums; }
    .qa-field input.invalid { border-color: #ff4d4f; }
    .qa-field .qa-unit { width: 52px; color: #8c8c8c; font-size: 10px; text-align: left; white-space: nowrap; }
    .qa-adv > summary { cursor: pointer; color: #8c8c8c; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; padding: 6px 0; outline: none; user-select: none; }
    .qa-adv > summary:hover { color: #d9d9d9; }
    .qa-ov-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    .qa-ov-table th { color: #8c8c8c; font-weight: 500; font-size: 10px; text-align: right; padding: 2px 3px; }
    .qa-ov-table th:first-child, .qa-ov-table td:first-child { text-align: left; }
    .qa-ov-table td { padding: 2px 3px; text-align: right; }
    .qa-ov-table input { width: 44px; height: 22px; text-align: right; }
    .qa-pop-foot { flex-shrink: 0; display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: #141414; border-top: 1px solid #303030; border-radius: 0 0 4px 4px; }
  `;

  function mount(app, root, initialFrame = null) {
    const store = app.store;
    root.append(h('style', {}, CSS));

    if (!store || !store.meta || !store.frames?.length) {
      const waitBox = h('div', { class: 'bar', style: { color: '#8c8c8c', padding: '24px', textAlign: 'center' } },
        'Đang kết nối và tải dữ liệu từ CVAT, vui lòng chờ trong giây lát…'
      );
      root.append(waitBox);
      const unbind = store?.on?.('load', () => {
        root.replaceChildren();
        app.mounted = mount(app, root, initialFrame);
      });
      return {
        refresh() {
          if (app.store?.meta) {
            root.replaceChildren();
            app.mounted = mount(app, root, initialFrame);
          }
        },
        unmount() { unbind?.(); }
      };
    }

    let currentFrame = (typeof initialFrame === 'number' && !Number.isNaN(initialFrame))
      ? initialFrame
      : (store.frames[0] || 0);
    let allQAErrors = [];
    let currentFilter = 'all';
    let onlyOverlappingMatrix = true;
    let groupOverlapEpisodes = true;
    let focusedPair = null; // { frame, idA, idB }

    // ---------- Popover Cài đặt Ngưỡng QA ----------
    let activeQAPopoverClose = null;
    function bindQAPopoverDismiss(menu, onClosed) {
      if (activeQAPopoverClose) activeQAPopoverClose();
      menu.addEventListener('mousedown', (e) => e.stopPropagation());
      menu.addEventListener('pointerdown', (e) => e.stopPropagation());
      menu.addEventListener('click', (e) => e.stopPropagation());

      let closed = false;
      const rootNode = root.getRootNode();
      const close = () => {
        if (closed) return;
        closed = true;
        if (activeQAPopoverClose === close) activeQAPopoverClose = null;
        menu.remove();
        rootNode.removeEventListener('mousedown', onOutClick, false);
        document.removeEventListener('mousedown', onOutClick, false);
        onClosed?.();
      };
      const onOutClick = (e) => {
        if (menu.contains(e.target) || e.composedPath().includes(menu)) return;
        close();
      };
      activeQAPopoverClose = close;
      setTimeout(() => {
        if (!closed) {
          rootNode.addEventListener('mousedown', onOutClick, false);
          document.addEventListener('mousedown', onOutClick, false);
        }
      }, 20);
      return close;
    }

    function showQASettingsPopover(targetEl) {
      const rect = targetEl.getBoundingClientRect();
      const pos = SP.ui.getFloatingPosition(rect, 410, 560, { mode: 'dialog', margin: 10 });
      const pop = h('div', {
        class: 'qa-pop',
        style: {
          left: `${pos.left}px`,
          top: `${pos.top}px`,
          maxHeight: `${pos.maxHeight}px`,
        }
      });

      const updatePos = () => {
        const curRect = targetEl.getBoundingClientRect();
        const p = SP.ui.getFloatingPosition(curRect, 410, 560, { mode: 'dialog', margin: 10 });
        pop.style.left = `${p.left}px`;
        pop.style.top = `${p.top}px`;
        pop.style.maxHeight = `${p.maxHeight}px`;
      };
      window.addEventListener('resize', updatePos);
      const close = bindQAPopoverDismiss(pop, () => {
        window.removeEventListener('resize', updatePos);
      });

      const head = h('div', { class: 'qa-pop-head' },
        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } },
          SP.icons.sliders(14), 'Cấu hình Ngưỡng Kiểm Tra QA'
        ),
        h('button', {
          style: { background: 'transparent', border: 0, color: '#8c8c8c', cursor: 'pointer', padding: '0 4px', display: 'inline-flex', alignItems: 'center' },
          title: 'Đóng',
          onclick: close
        }, SP.icons.close(12))
      );

      const curGlobal = SP.qa.getGlobal();
      const inputs = {};
      const errs = {};

      function makeField(key, labelText, hintText) {
        const [min, max, unit] = SP.qa.RANGES[key];
        const inEl = h('input', {
          type: 'number',
          value: String(curGlobal[key]),
          step: key === 'speedPerFrame' ? '0.1' : '1',
          min: String(min),
          max: String(max),
        });
        const errEl = h('span', { class: 'qa-err' });
        inputs[key] = inEl;
        errs[key] = errEl;

        inEl.oninput = () => {
          const val = inEl.value.trim();
          const r = SP.qa.validate(key, val);
          if (!r.ok) {
            inEl.classList.add('invalid');
            errEl.textContent = r.error;
          } else {
            inEl.classList.remove('invalid');
            errEl.textContent = '';
          }
        };

        return h('div', { class: 'qa-row' },
          h('div', { class: 'qa-label' },
            h('span', { style: { color: '#fff', fontWeight: 500 } }, labelText),
            h('span', { class: 'qa-hint' }, hintText || `Gợi ý: ${min} – ${max} ${unit}`),
            errEl
          ),
          h('div', { class: 'qa-field' },
            inEl,
            h('span', { class: 'qa-unit' }, unit)
          )
        );
      }

      const secBasic = h('div', {},
        h('div', { class: 'qa-section' }, '1. Các ngưỡng cốt lõi (Guideline / QC)'),
        makeField('iouPct', 'Độ lồng nhau / IoU', 'Trùng lặp tối thiểu để kích hoạt cảnh báo (Mặc định: 25%)'),
        makeField('yawDeg', 'Giật góc quay Yaw', 'Độ lệch góc bất thường giữa 2 mốc ≤ 3 frame (Mặc định: 25°)'),
        makeField('speedPerFrame', 'Nhảy tốc độ đột ngột', 'Khoảng dịch chuyển tối đa cho phép / 1 frame (Mặc định: 3.0 m/f)'),
        makeField('sizeCm', 'Co giãn kích thước', 'Chênh lệch kích thước L, W, H tối đa cho phép (Mặc định: 8 cm)'),
        makeField('maxDistM', 'Khoảng cách tối đa', 'Khoảng cách từ gốc LiDAR tới tâm xe chưa gán Outside (Mặc định: 80 m)')
      );

      const secAdv = h('details', { class: 'qa-adv' },
        h('summary', {}, '▸ 2. Cài đặt nâng cao & Góc quay đặc thù'),
        h('div', { style: { padding: '4px 0 8px' } },
          makeField('flipMinDeg', 'Đảo đầu xe: Góc từ', 'Góc quay ngược tối thiểu coi là đảo đầu (Mặc định: 140°)'),
          makeField('flipMaxDeg', 'Đảo đầu xe: Góc đến', 'Góc quay ngược tối đa coi là đảo đầu (Mặc định: 220°)'),
          makeField('flipMaxFrames', 'Đảo đầu xe: Trong vòng', 'Số frame tối đa giữa 2 mốc đảo đầu (Mặc định: 10 frame)'),
          makeField('yawRateDegPerFrame', 'Tốc độ quay góc (°/f)', 'Áp dụng cho chuỗi dài > 3 frame (Mặc định: 15°/frame)'),
          makeField('rollDeg', 'Nghiêng sườn Roll', 'Góc lật nghiêng sườn tối đa cho phép (Mặc định: 20°)'),
          makeField('pitchDeg', 'Chúi dốc Pitch', 'Góc chúi đầu / ngửa đuôi tối đa cho phép (Mặc định: 25°)')
        )
      );

      // Bảng ghi đè theo loại đối tượng (Class Overrides)
      const secClass = h('details', { class: 'qa-adv' },
        h('summary', {}, '▸ 3. Ghi đè theo loại đối tượng (Pedestrian, Car...)'),
        h('div', { style: { padding: '6px 0 8px', fontSize: '10.5px', color: '#8c8c8c' } },
          'Tùy chỉnh riêng cho các đối tượng đặc thù (người xoay nhanh, xe chạy tốc độ cao...):'
        )
      );

      const classTable = h('table', { class: 'qa-ov-table' });
      classTable.append(
        h('thead', {},
          h('tr', {},
            h('th', {}, 'Class'),
            h('th', {}, 'Yaw (°)'),
            h('th', {}, 'Tốc độ (m/f)'),
            h('th', {}, 'KC (m)')
          )
        )
      );
      const classBody = h('tbody');
      const classInputs = {};
      const curOverrides = SP.qa.getOverrides();

      for (const [lblId, lbl] of store.labels.entries()) {
        const lName = lbl.name;
        const ov = curOverrides[lName] || {};
        const inYaw = h('input', { type: 'number', placeholder: 'Mặc định', value: ov.yawDeg != null ? String(ov.yawDeg) : '' });
        const inSpeed = h('input', { type: 'number', step: '0.1', placeholder: 'Mặc định', value: ov.speedPerFrame != null ? String(ov.speedPerFrame) : '' });
        const inDist = h('input', { type: 'number', placeholder: 'Mặc định', value: ov.maxDistM != null ? String(ov.maxDistM) : '' });
        classInputs[lName] = { inYaw, inSpeed, inDist };

        classBody.append(
          h('tr', {},
            h('td', { style: { color: lbl.color || '#fff', fontWeight: 500 } }, lName),
            h('td', {}, inYaw),
            h('td', {}, inSpeed),
            h('td', {}, inDist)
          )
        );
      }
      classTable.append(classBody);
      secClass.append(classTable);

      secAdv.ontoggle = updatePos;
      secClass.ontoggle = updatePos;

      const body = h('div', { class: 'qa-pop-body' }, secBasic, secAdv, secClass);

      const resetBtn = h('button', {
        class: 'small',
        style: { color: '#ff7875', borderColor: '#5c2223' },
        title: 'Khôi phục toàn bộ ngưỡng về mặc định ban đầu của dự án',
        onclick: () => {
          SP.qa.reset();
          close();
          app.setStatus('Đã khôi phục các ngưỡng QA về mặc định!', 'ok');
          startScan();
        }
      }, 'Mặc định');

      const applyBtn = h('button', {
        class: 'small primary',
        style: { marginLeft: 'auto', fontWeight: 600 },
        onclick: () => {
          const patch = {};
          for (const [k, inEl] of Object.entries(inputs)) {
            const v = inEl.value.trim();
            const r = SP.qa.validate(k, v);
            if (!r.ok) {
              inEl.classList.add('invalid');
              errs[k].textContent = r.error;
              inEl.focus();
              return;
            }
            patch[k] = r.value;
          }
          const res = SP.qa.set(patch);
          if (!res.ok) {
            alert(res.error);
            return;
          }

          // Lưu ghi đè class
          for (const [lName, fields] of Object.entries(classInputs)) {
            const lPatch = {};
            if (fields.inYaw.value.trim() !== '') lPatch.yawDeg = Number(fields.inYaw.value);
            if (fields.inSpeed.value.trim() !== '') lPatch.speedPerFrame = Number(fields.inSpeed.value);
            if (fields.inDist.value.trim() !== '') lPatch.maxDistM = Number(fields.inDist.value);
            SP.qa.setOverride(lName, lPatch);
          }

          close();
          app.setStatus('Đã lưu cấu hình ngưỡng QA thành công!', 'ok');
          startScan();
        }
      }, SP.icons.check(12), 'Lưu & Quét Lại');

      const foot = h('div', { class: 'qa-pop-foot' }, resetBtn, applyBtn);

      pop.append(head, body, foot);
      root.append(pop);
    }

    // Ngưỡng IoU lấy từ cấu hình QA dùng chung (SP.qa) nên được lưu bền và đồng bộ với popover "Ngưỡng QA"
    const iouThreshold = () => Math.max(0.01, SP.qa.getGlobal().iouPct / 100);

    const thresholdInput = h('input', {
      type: 'number',
      min: '1',
      max: '95',
      step: '1',
      value: String(SP.qa.getGlobal().iouPct),
      title: 'Ngưỡng cảnh báo độ lồng nhau / 3D IoU (%) - Mặc định 25%. Chỉnh đầy đủ các ngưỡng khác ở nút "Ngưỡng QA"',
      style: { width: '52px', background: '#141414', border: '1px solid #434343', color: '#fff', borderRadius: '3px', padding: '2px 4px', height: '24px', textAlign: 'right' },
      onchange: () => {
        const r = SP.qa.validate('iouPct', thresholdInput.value);
        if (!r.ok) {
          thresholdInput.style.borderColor = '#ff4d4f';
          thresholdInput.title = r.error;
          return;
        }
        thresholdInput.style.borderColor = '#434343';
        SP.qa.set({ iouPct: r.value });
      },
      onkeydown: (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') { thresholdInput.dispatchEvent(new Event('change')); startScan(); }
      }
    });

    const scanBtn = h('button', {
      class: 'primary',
      style: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '12px', fontWeight: 500 }
    }, SP.icons.overlap(12), 'Quét Lỗi & Trùng Lặp');

    const pBar = h('span', { style: { fontSize: '12px', color: '#8c8c8c' } });
    const frameInput = h('input', {
      type: 'number',
      value: currentFrame,
      min: store.frames[0],
      max: store.frames[store.frames.length - 1],
      style: { width: '62px', background: '#141414', border: '1px solid #434343', color: '#fff', borderRadius: '2px', padding: '2px 4px' },
      onkeydown: (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          const f = Number(frameInput.value) || store.frames[0];
          setMatrixMode('single');
          renderSingleMatrix(f);
          SP.bridge.changeFrame(f);
        }
      }
    });
    const viewMatrixBtn = h('button', {
      title: 'Xem Ma trận của Frame này và chuyển màn hình chính CVAT tới Frame này',
      onclick: () => {
        const f = Number(frameInput.value) || store.frames[0];
        setMatrixMode('single');
        renderSingleMatrix(f);
        SP.bridge.changeFrame(f);
      }
    }, 'Xem Frame Này');

    // Filter Buttons
    const filterAll = h('button', { class: 'filter-btn active', onclick: () => setFilter('all') }, 'Tất cả');
    const filterOverlap = h('button', { class: 'filter-btn', onclick: () => setFilter('overlap') }, 'Trùng lặp');
    const filterSize = h('button', { class: 'filter-btn', onclick: () => setFilter('size') }, 'Méo kích thước');
    const filterSpeed = h('button', { class: 'filter-btn', onclick: () => setFilter('speed') }, 'Nhảy tốc độ');
    const filterRot = h('button', { class: 'filter-btn', onclick: () => setFilter('rotation') }, 'Đổi góc / 180°');
    const filterDist = h('button', { class: 'filter-btn', onclick: () => setFilter('distance') }, `Xa >${SP.qa.getGlobal().maxDistM}m`);

    const updateDistFilterLabel = () => {
      const d = SP.qa.getGlobal().maxDistM;
      filterDist.textContent = `Xa >${d}m`;
    };

    const groupEpisodeChk = h('input', {
      type: 'checkbox',
      checked: groupOverlapEpisodes,
      onchange: () => {
        groupOverlapEpisodes = groupEpisodeChk.checked;
        renderAlerts();
      }
    });

    const onlyCollideChk = h('input', {
      type: 'checkbox',
      checked: onlyOverlappingMatrix,
      onchange: () => {
        onlyOverlappingMatrix = onlyCollideChk.checked;
        if (matrixMode === 'single') renderSingleMatrix(currentFrame);
        else renderMultiMatrix(multiFrom, multiTo);
      }
    });

    // Chế độ xem ma trận: 'single' (1 Bảng) hoặc 'multi' (Dải A -> B)
    let matrixMode = 'single';
    let multiFrom = store.frames[0] || 0;
    let multiTo = Math.min((store.frames[0] || 0) + 15, store.frames[store.frames.length - 1] || 0);
    let onlyCollidingFrames = true;

    const modeBtnSingle = h('button', {
      class: 'matrix-mode-btn active',
      onclick: () => setMatrixMode('single')
    }, '1 Bảng (Đơn)');

    const modeBtnMulti = h('button', {
      class: 'matrix-mode-btn',
      onclick: () => setMatrixMode('multi')
    }, 'Dải Frame (A → B)');

    const multiFromInput = h('input', {
      type: 'number',
      value: multiFrom,
      min: store.frames[0],
      max: store.frames[store.frames.length - 1],
      style: { width: '56px', background: '#141414', border: '1px solid #434343', color: '#fff', borderRadius: '2px', padding: '1px 4px', fontSize: '11px' },
      onchange: () => { multiFrom = Number(multiFromInput.value) || store.frames[0]; }
    });

    const multiToInput = h('input', {
      type: 'number',
      value: multiTo,
      min: store.frames[0],
      max: store.frames[store.frames.length - 1],
      style: { width: '56px', background: '#141414', border: '1px solid #434343', color: '#fff', borderRadius: '2px', padding: '1px 4px', fontSize: '11px' },
      onchange: () => { multiTo = Number(multiToInput.value) || store.frames[store.frames.length - 1]; }
    });

    const loadMultiBtn = h('button', {
      class: 'small primary',
      style: { display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', padding: '2px 8px' },
      onclick: () => {
        multiFrom = Number(multiFromInput.value) || store.frames[0];
        multiTo = Number(multiToInput.value) || store.frames[store.frames.length - 1];
        if (multiFrom > multiTo) {
          const tmp = multiFrom; multiFrom = multiTo; multiTo = tmp;
          multiFromInput.value = multiFrom; multiToInput.value = multiTo;
        }
        renderMultiMatrix(multiFrom, multiTo);
      }
    }, 'Nạp Dải');

    const onlyCollideFramesChk = h('input', {
      type: 'checkbox',
      checked: onlyCollidingFrames,
      onchange: () => {
        onlyCollidingFrames = onlyCollideFramesChk.checked;
        if (matrixMode === 'multi') renderMultiMatrix(multiFrom, multiTo);
      }
    });

    const singleControls = h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '8px' } },
      h('label', { style: { fontSize: '11px', fontWeight: 'normal', color: '#bfbfbf', cursor: 'pointer' }, title: 'Chỉ hiển thị những Track có giao cắt (> 0%) trong frame này để bảng gọn gàng' },
        onlyCollideChk, 'Chỉ hiện Track va chạm'
      )
    );

    const multiControls = h('div', { style: { display: 'none', alignItems: 'center', gap: '6px', flexWrap: 'wrap' } },
      h('span', { style: { fontSize: '11px', color: '#8c8c8c' } }, 'Từ:'),
      multiFromInput,
      h('span', { style: { fontSize: '11px', color: '#8c8c8c' } }, 'Đến:'),
      multiToInput,
      loadMultiBtn,
      h('label', { style: { fontSize: '11px', fontWeight: 'normal', color: '#bfbfbf', cursor: 'pointer', marginLeft: '6px' }, title: 'Chỉ hiện các frame có độ trùng lặp > 0%, bỏ qua các frame an toàn' },
        onlyCollideFramesChk, 'Chỉ hiện frame va chạm'
      ),
      h('label', { style: { fontSize: '11px', fontWeight: 'normal', color: '#bfbfbf', cursor: 'pointer' }, title: 'Thu gọn bảng trong từng frame, chỉ hiện những Track có va chạm' },
        onlyCollideChk, 'Thu gọn bảng'
      )
    );

    const qaSettingsBtn = h('button', {
      class: `tool-btn qa-btn ${SP.qa.isCustomized() ? 'customized' : ''}`,
      title: 'Tùy chỉnh toàn diện các ngưỡng kiểm tra QA (IoU, Yaw, Tốc độ, Kích thước, Khoảng cách...)',
      onclick: (e) => showQASettingsPopover(e.currentTarget)
    },
      SP.icons.sliders(12),
      'Ngưỡng QA',
      h('span', { class: 'qa-dot' })
    );

    const topBar = h('div', { class: 'c3-top' },
      h('span', { style: { fontWeight: 600, color: '#fff' } }, 'Ngưỡng Overlap/IoU:'),
      thresholdInput,
      h('span', { style: { fontSize: '11px', color: '#8c8c8c' } }, '%'),
      qaSettingsBtn,
      scanBtn,
      pBar,
      h('span', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' } },
        h('span', {}, 'Ma trận Frame:'),
        frameInput,
        viewMatrixBtn
      )
    );

    const alertListEl = h('div', { class: 'c3-card-body' });
    const matrixContainerEl = h('div', { class: 'c3-card-body', style: { display: 'flex', justifyContent: 'center', alignItems: 'flex-start' } });
    const matrixTitleEl = h('span', {}, `Ma trận Trùng lặp · Frame ${currentFrame}`);

    const leftCard = h('div', { class: 'c3-card' },
      h('div', { class: 'c3-card-head' },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
          h('span', {}, 'Danh sách Lỗi QA & Overlap'),
          h('div', { style: { display: 'flex', gap: '4px' } }, filterAll, filterOverlap, filterSize, filterSpeed, filterRot, filterDist),
          h('label', { style: { fontSize: '11px', fontWeight: 'normal', color: '#bfbfbf', cursor: 'pointer' }, title: 'Gộp các frame trùng lặp liên tiếp của cùng 1 cặp Track thành 1 dòng' },
            groupEpisodeChk, 'Gộp chuỗi'
          )
        ),
        h('span', { id: 'alert-count', style: { fontSize: '11px', color: '#8b949e' } }, 'Chưa quét')
      ),
      alertListEl
    );

    const rightCard = h('div', { class: 'c3-card' },
      h('div', { class: 'c3-card-head' },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
          matrixTitleEl,
          h('div', { style: { display: 'inline-flex', gap: '3px', marginLeft: '6px' } }, modeBtnSingle, modeBtnMulti)
        ),
        singleControls,
        multiControls
      ),
      matrixContainerEl
    );

    const bodyWrap = h('div', { class: 'c3-body' }, leftCard, rightCard);
    const container = h('div', { class: 'c3-container' }, topBar, bodyWrap);
    root.append(container);

    function setFilter(type) {
      currentFilter = type;
      [filterAll, filterOverlap, filterSize, filterSpeed, filterRot, filterDist].forEach((b) => b.classList.remove('active'));
      if (type === 'all') filterAll.classList.add('active');
      else if (type === 'overlap') filterOverlap.classList.add('active');
      else if (type === 'size') filterSize.classList.add('active');
      else if (type === 'speed') filterSpeed.classList.add('active');
      else if (type === 'rotation') filterRot.classList.add('active');
      else if (type === 'distance') filterDist.classList.add('active');
      renderAlerts();
    }

    // ---------- Điều khiển màn hình chính CVAT nhảy tới đúng Frame & tô sáng 2 Box bị trùng lặp ----------
    async function focusOverlapOnMainCvat(frame, trackA, trackB) {
      const posA = trackA?.at?.(frame);
      const posB = trackB?.at?.(frame);
      const boxA = posA?.box;
      const boxB = posB?.box;

      focusedPair = { frame, idA: trackA?.id, idB: trackB?.id };
      renderMatrix(frame);

      // Nếu ngăn kéo đang mở Toàn màn hình (Fullscreen), tự động thu về ngăn kéo đáy để người dùng nhìn thấy màn hình CVAT chính
      if (app.isFullscreen && typeof app.toggleFullscreen === 'function') {
        app.toggleFullscreen();
      }

      const highlightBoxes = [];
      if (boxA) {
        const axA = SP.geom.axes(boxA.r);
        highlightBoxes.push({
          frame,
          color: 0xff4d4f, // Đỏ tươi cho Track A
          boxCorners: SP.geom.boxCorners(boxA),
          headingLine: [boxA.c, SP.geom.localToWorld([boxA.s[0] / 2, 0, 0], boxA.c, axA)],
          points: [],
        });
      }
      if (boxB) {
        const axB = SP.geom.axes(boxB.r);
        highlightBoxes.push({
          frame,
          color: 0xffec3d, // Vàng sáng cho Track B
          boxCorners: SP.geom.boxCorners(boxB),
          headingLine: [boxB.c, SP.geom.localToWorld([boxB.s[0] / 2, 0, 0], boxB.c, axB)],
          points: [],
        });
      }

      const targetCenter = (boxA && boxB)
        ? [(boxA.c[0] + boxB.c[0]) / 2, (boxA.c[1] + boxB.c[1]) / 2, (boxA.c[2] + boxB.c[2]) / 2]
        : (boxA ? boxA.c.slice() : null);

      await SP.bridge.focusOverlapInMain({
        frame,
        clientIDA: trackA?.id,
        clientIDB: trackB?.id,
        targetCenter,
        highlightBoxes,
      });

      app.setStatus(
        `Frame ${frame}: Đang soi trùng lặp giữa Track #${trackA?.uiId} (Viền Đỏ) và Track #${trackB?.uiId} (Viền Vàng) trên CVAT`,
        'ok'
      );
    }

    function setMatrixMode(mode) {
      matrixMode = mode;
      if (mode === 'single') {
        modeBtnSingle.classList.add('active');
        modeBtnMulti.classList.remove('active');
        singleControls.style.display = 'inline-flex';
        multiControls.style.display = 'none';
        renderSingleMatrix(currentFrame);
      } else {
        modeBtnSingle.classList.remove('active');
        modeBtnMulti.classList.add('active');
        singleControls.style.display = 'none';
        multiControls.style.display = 'inline-flex';
        renderMultiMatrix(multiFrom, multiTo);
      }
    }

    function openRangeMatrix(from, to) {
      multiFrom = from;
      multiTo = to;
      multiFromInput.value = from;
      multiToInput.value = to;
      setMatrixMode('multi');
    }

    // ---------- 1. Hàm tạo bảng Ma trận Overlap cho 1 Frame ----------
    function buildMatrixTableData(frame, { onlyCollide = true, isCompact = false } = {}) {
      const { activeTracks, matrix, ratioMatrix, vIntersectMatrix, areaIntersectMatrix, hOverlapMatrix } = SP.iou3d.computeFrameOverlapMatrix(store, frame);

      if (activeTracks.length === 0) {
        return {
          empty: true,
          hasOverlap: false,
          maxOverlapPct: 0,
          element: h('div', { style: { padding: isCompact ? '16px' : '40px', color: '#8c8c8c', textAlign: 'center', fontSize: '11px' } },
            `Frame ${frame} chưa có vật thể nào xuất hiện.`
          )
        };
      }
      if (activeTracks.length === 1) {
        return {
          single: true,
          hasOverlap: false,
          maxOverlapPct: 0,
          element: h('div', { style: { padding: isCompact ? '16px' : '40px', color: '#8c8c8c', textAlign: 'center', fontSize: '11px' } },
            `Frame ${frame} chỉ có 1 vật thể (#${activeTracks[0].uiId} · ${activeTracks[0].labelName}), không có giao thoa.`
          )
        };
      }

      const thresh = Math.max(0.01, Number(thresholdInput.value) || 0.25);
      const threshPct = Math.round(thresh * 100);

      const hasOverlapIdx = new Set();
      let maxMetricOverall = 0;
      for (let i = 0; i < activeTracks.length; i++) {
        for (let j = i + 1; j < activeTracks.length; j++) {
          const maxVal = Math.max(matrix[i][j], ratioMatrix[i][j], ratioMatrix[j][i]);
          if (maxVal > maxMetricOverall) maxMetricOverall = maxVal;
          if (maxVal > 1e-4 || (vIntersectMatrix && vIntersectMatrix[i][j] > 1e-4)) {
            hasOverlapIdx.add(i);
            hasOverlapIdx.add(j);
          }
        }
      }

      const hasOverlap = hasOverlapIdx.size > 0;
      let indices = activeTracks.map((_, idx) => idx);
      if (onlyCollide) {
        if (hasOverlap) {
          indices = indices.filter((idx) => hasOverlapIdx.has(idx));
        } else {
          return {
            safe: true,
            hasOverlap: false,
            maxOverlapPct: 0,
            element: h('div', { style: { padding: isCompact ? '14px 8px' : '32px 16px', color: '#73d13d', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '11px' } },
              h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '4px' } }, SP.icons.check(12), `Frame ${frame} có ${activeTracks.length} vật thể nhưng không giao cắt nhau (0%).`)
            )
          };
        }
      }

      const table = h('table', { class: `matrix-table ${isCompact ? 'compact' : ''}` });
      const thead = h('thead');
      const tbody = h('tbody');

      const headRow = h('tr', {}, h('th', { title: 'Hàng: Track đang xét · Cột: Track giao cắt' }, 'Track'));
      for (const idx of indices) {
        const t = activeTracks[idx];
        headRow.append(h('th', {
          title: `#${t.uiId} · ${t.labelName} (Click để chọn trên CVAT)`,
          style: { cursor: 'pointer' },
          onclick: () => {
            SP.bridge.changeFrame(frame);
            SP.bridge.activateObject(t.id);
            app.setStatus(`Đã chọn Track #${t.uiId} (${t.labelName}) tại Frame ${frame}`, 'ok');
          }
        },
          h('span', { style: { display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: t.color, marginRight: '3px', verticalAlign: 'middle' } }),
          `#${t.uiId}`
        ));
      }
      thead.append(headRow);

      for (const i of indices) {
        const tRow = activeTracks[i];
        const tr = h('tr', {},
          h('th', {
            title: `#${tRow.uiId} · ${tRow.labelName} (Click để chọn trên CVAT)`,
            style: { cursor: 'pointer' },
            onclick: () => {
              SP.bridge.changeFrame(frame);
              SP.bridge.activateObject(tRow.id);
              app.setStatus(`Đã chọn Track #${tRow.uiId} (${tRow.labelName}) tại Frame ${frame}`, 'ok');
            }
          },
            h('span', { style: { display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: tRow.color, marginRight: '3px', verticalAlign: 'middle' } }),
            `#${tRow.uiId}`
          )
        );

        for (const j of indices) {
          const tCol = activeTracks[j];
          const iouVal = matrix[i][j];
          const rowOverlapRatio = ratioMatrix[i][j];
          const colOverlapRatio = ratioMatrix[j][i];
          const maxMetric = Math.max(iouVal, rowOverlapRatio, colOverlapRatio);
          const rawPct = Math.max(iouVal, rowOverlapRatio) * 100;
          let displayPct;
          if (i === j) {
            displayPct = '100';
          } else if (rawPct <= 0) {
            displayPct = '0%';
          } else if (rawPct < 0.1) {
            displayPct = '<0.1%';
          } else if (rawPct < 10) {
            displayPct = `${rawPct.toFixed(1)}%`;
          } else {
            displayPct = `${Math.round(rawPct)}%`;
          }

          const alertPct = maxMetric * 100;
          let cls = 'matrix-cell safe';
          if (i !== j) {
            if (alertPct >= threshPct) cls = 'matrix-cell danger';
            else if (alertPct > 1e-3) cls = 'matrix-cell warn';
          }

          const isFocused = focusedPair &&
            focusedPair.frame === frame &&
            ((focusedPair.idA === tRow.id && focusedPair.idB === tCol.id) ||
             (focusedPair.idA === tCol.id && focusedPair.idB === tRow.id));
          if (isFocused && i !== j) cls += ' focused';

          const vVol = vIntersectMatrix ? vIntersectMatrix[i][j] : 0;
          const aArea = areaIntersectMatrix ? areaIntersectMatrix[i][j] : 0;
          const hH = hOverlapMatrix ? hOverlapMatrix[i][j] : 0;

          const tipText = i === j
            ? `Track #${tRow.uiId} (${tRow.labelName})`
            : `Track #${tRow.uiId} bị #${tCol.uiId} lấn: ${(rowOverlapRatio * 100).toFixed(1)}% · Ngược lại: ${(colOverlapRatio * 100).toFixed(1)}% · 3D IoU: ${(iouVal * 100).toFixed(1)}%` +
              (vVol > 0 ? `\n• Thể tích lấn: ${vVol < 0.01 ? (vVol * 1000).toFixed(1) + ' dm³ (lít)' : vVol.toFixed(3) + ' m³'}` : '') +
              (aArea > 0 ? `\n• Diện tích đáy lấn: ${(aArea * 10000).toFixed(0)} cm² (${aArea.toFixed(3)} m²)` : '') +
              (hH > 0 ? `\n• Chiều cao giao nhau: ${(hH * 100).toFixed(0)} cm` : '') +
              `\n(Click để soi trên CVAT)`;

          const td = h('td', {
            class: cls,
            title: tipText
          }, i === j ? '—' : displayPct);

          if (i !== j && alertPct > 0) {
            td.onclick = () => {
              const trkA = store.track(tRow.id);
              const trkB = store.track(tCol.id);
              if (trkA && trkB) {
                focusOverlapOnMainCvat(frame, trkA, trkB);
              }
            };
          }
          tr.append(td);
        }
        tbody.append(tr);
      }

      table.append(thead, tbody);
      return {
        table,
        hasOverlap,
        maxOverlapPct: Math.round(maxMetricOverall * 100),
        element: table,
      };
    }

    // Render chế độ 1 Bảng (Đơn)
    function renderSingleMatrix(frame) {
      currentFrame = frame;
      frameInput.value = frame;
      matrixTitleEl.textContent = `Ma trận Trùng lặp · Frame ${frame}`;
      matrixContainerEl.replaceChildren();

      const data = buildMatrixTableData(frame, { onlyCollide: onlyOverlappingMatrix, isCompact: false });
      if (data.safe && onlyOverlappingMatrix) {
        const showAllBtn = h('button', {
          style: { marginTop: '8px' },
          onclick: () => {
            onlyOverlappingMatrix = false;
            onlyCollideChk.checked = false;
            renderSingleMatrix(frame);
          }
        }, 'Hiện toàn bộ bảng');
        data.element.append(showAllBtn);
      }
      matrixContainerEl.append(data.element);
    }

    // Render chế độ Dải Frame (Nhiều Bảng cùng lúc)
    function renderMultiMatrix(from, to) {
      multiFrom = from;
      multiTo = to;
      multiFromInput.value = from;
      multiToInput.value = to;
      matrixTitleEl.textContent = `Chuỗi Ma trận · Frame ${from} → ${to}`;
      matrixContainerEl.replaceChildren();

      const allFrames = store.frames.filter((f) => f >= from && f <= to);
      if (!allFrames.length) {
        matrixContainerEl.append(h('div', { style: { padding: '40px', color: '#8c8c8c', textAlign: 'center' } },
          `Không tìm thấy frame nào trong khoảng từ ${from} đến ${to}.`
        ));
        return;
      }

      const MAX_FRAMES = 50;
      let targetFrames = allFrames;
      let isTruncated = false;
      if (targetFrames.length > MAX_FRAMES) {
        targetFrames = targetFrames.slice(0, MAX_FRAMES);
        isTruncated = true;
      }

      const grid = h('div', { class: 'matrix-multi-grid' });
      let renderedCount = 0;
      let overlapCount = 0;

      for (const f of targetFrames) {
        const data = buildMatrixTableData(f, { onlyCollide: onlyOverlappingMatrix, isCompact: true });
        if (onlyCollidingFrames && !data.hasOverlap) {
          continue;
        }
        renderedCount++;
        if (data.hasOverlap) overlapCount++;

        const card = h('div', { class: `matrix-mini-card ${data.hasOverlap ? 'has-overlap' : 'is-safe'}` });
        const head = h('div', { class: 'matrix-mini-head' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
            h('span', { style: { color: '#fff', fontWeight: 600 } }, `f${f}`),
            data.hasOverlap
              ? h('span', { style: { background: 'rgba(255, 77, 79, 0.2)', color: '#ff7875', border: '1px solid #ff4d4f', padding: '0 4px', borderRadius: '2px', fontSize: '10px' } }, `Trùng ${data.maxOverlapPct}%`)
              : h('span', { style: { background: 'rgba(82, 196, 26, 0.16)', color: '#73d13d', border: '1px solid #52c41a', padding: '0 4px', borderRadius: '2px', fontSize: '10px' } }, '0% an toàn')
          ),
          h('button', {
            class: 'small',
            style: { padding: '1px 6px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px' },
            title: `Nhảy CVAT tới Frame ${f}`,
            onclick: () => {
              SP.bridge.changeFrame(f);
              app.setStatus(`Đã nhảy CVAT tới Frame ${f}`, 'ok');
            }
          }, SP.icons.eye(10), 'Soi 3D')
        );

        const body = h('div', { class: 'matrix-mini-body' }, data.element);
        card.append(head, body);
        grid.append(card);
      }

      if (renderedCount === 0) {
        const showSafeBtn = h('button', {
          class: 'primary small',
          style: { marginTop: '10px' },
          onclick: () => {
            onlyCollidingFrames = false;
            onlyCollideFramesChk.checked = false;
            renderMultiMatrix(from, to);
          }
        }, 'Hiện cả các Frame an toàn (0% va chạm)');

        matrixContainerEl.append(h('div', { style: { padding: '40px 16px', color: '#73d13d', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' } },
          h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' } }, SP.icons.check(14), `Tất cả ${allFrames.length} frame từ ${from} đến ${to} đều an toàn (0% va chạm).`),
          h('span', { style: { color: '#8c8c8c', fontSize: '11px', marginTop: '4px' } }, 'Đang bật tùy chọn "Chỉ hiện frame va chạm".'),
          showSafeBtn
        ));
        return;
      }

      const wrap = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' } });
      if (isTruncated) {
        wrap.append(h('div', { style: { padding: '4px 8px', background: 'rgba(250, 173, 20, 0.16)', border: '1px solid #faad14', borderRadius: '2px', color: '#ffc53d', fontSize: '11px' } },
          `Dải frame từ ${from} đến ${to} có ${allFrames.length} frame. Đang hiển thị 50 frame đầu tiên để tối ưu hiệu năng.`
        ));
      }
      wrap.append(grid);
      matrixContainerEl.append(wrap);
    }

    // Hàm điều hướng chung (giữ tương thích)
    function renderMatrix(frame) {
      if (matrixMode === 'single') {
        renderSingleMatrix(frame);
      } else {
        renderMultiMatrix(multiFrom, multiTo);
      }
    }

    // ---------- Gom nhóm các cảnh báo trùng lặp liên tiếp của cùng 1 cặp Track ----------
    function buildDisplayAlerts(rawList) {
      if (!groupOverlapEpisodes) return rawList;
      const out = [];
      const overlapGroups = new Map();

      for (const item of rawList) {
        if (item.type !== 'overlap') {
          out.push(item);
          continue;
        }
        const id1 = Math.min(item.trackA.uiId, item.trackB.uiId);
        const id2 = Math.max(item.trackA.uiId, item.trackB.uiId);
        const key = `${id1}_${id2}`;
        let list = overlapGroups.get(key);
        if (!list) {
          list = [];
          overlapGroups.set(key, list);
        }
        list.push(item);
      }

      for (const list of overlapGroups.values()) {
        list.sort((a, b) => a.frame - b.frame);
        let curEp = null;
        for (const item of list) {
          if (!curEp || item.frame - curEp.endFrame > 2) {
            if (curEp) out.push(curEp);
            curEp = {
              type: 'overlap',
              isEpisode: true,
              frame: item.frame, // Mặc định nhảy tới frame đỉnh hoặc frame đầu
              startFrame: item.frame,
              endFrame: item.frame,
              peakFrame: item.frame,
              count: 1,
              trackA: item.trackA,
              trackB: item.trackB,
              iou: item.iou,
              maxOverlapRatio: item.maxOverlapRatio,
              frames: [item.frame],
            };
          } else {
            curEp.endFrame = item.frame;
            curEp.count += 1;
            curEp.frames.push(item.frame);
            if (item.maxOverlapRatio > curEp.maxOverlapRatio) {
              curEp.maxOverlapRatio = item.maxOverlapRatio;
              curEp.iou = item.iou;
              curEp.peakFrame = item.frame;
              curEp.frame = item.frame;
            }
          }
        }
        if (curEp) out.push(curEp);
      }

      return out.sort((a, b) => (a.startFrame ?? a.frame) - (b.startFrame ?? b.frame));
    }

    // ---------- 2. Render Danh sách Cảnh báo QA ----------
    function renderAlerts() {
      alertListEl.replaceChildren();
      const filteredRaw = currentFilter === 'all'
        ? allQAErrors
        : allQAErrors.filter((e) => e.type === currentFilter);

      const displayList = buildDisplayAlerts(filteredRaw);

      const countEl = root.querySelector('#alert-count');
      if (countEl) {
        countEl.textContent = groupOverlapEpisodes && displayList.length !== filteredRaw.length
          ? `Hiển thị: ${displayList.length} cụm (${filteredRaw.length} lỗi)`
          : `Tìm thấy: ${filteredRaw.length}/${allQAErrors.length} lỗi`;
      }

      if (!displayList.length) {
        alertListEl.append(h('div', { style: { padding: '40px', textAlign: 'center', color: '#73d13d' } },
          allQAErrors.length ? 'Không có lỗi thuộc bộ lọc này.' : 'Không phát hiện lỗi hình học nào trên toàn Job.'
        ));
        return;
      }

      for (const item of displayList) {
        if (item.type === 'overlap') {
          const pct = Math.round(item.maxOverlapRatio * 100);
          const iouPct = Math.round(item.iou * 100);
          const isSingle = !item.isEpisode || item.count === 1;
          const badgeText = `Trùng ${pct}%`;
          const titleText = isSingle
            ? `Frame ${item.frame}: Track #${item.trackA.uiId} ⇄ Track #${item.trackB.uiId}`
            : `Frame ${item.startFrame} → ${item.endFrame} (${item.count}f): Track #${item.trackA.uiId} ⇄ Track #${item.trackB.uiId}`;
          const descText = isSingle
            ? `Độ lồng nhau: ${pct}% · 3D IoU: ${iouPct}% (${store.labelName(item.trackA.labelId)} ⇄ ${store.labelName(item.trackB.labelId)})`
            : `Đỉnh điểm: ${pct}% tại f${item.peakFrame} · 3D IoU: ${iouPct}% (${store.labelName(item.trackA.labelId)} ⇄ ${store.labelName(item.trackB.labelId)})`;

          const targetFrame = item.peakFrame ?? item.frame;

          // Nút chính: Đưa màn hình chính CVAT tới đúng frame và vị trí 2 box đè nhau
          const viewMainBtn = h('button', {
            class: 'primary small',
            style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
            title: `Đưa màn hình 3D chính của CVAT tới Frame ${targetFrame} và tô sáng cả 2 Box #${item.trackA.uiId} & #${item.trackB.uiId}`,
            onclick: (e) => {
              e.stopPropagation();
              focusOverlapOnMainCvat(targetFrame, item.trackA, item.trackB);
            }
          }, SP.icons.eye(12), `Xem trên CVAT (f${targetFrame})`);

          // Nút phụ chọn từng Track ngay trên CVAT để kiểm tra hoặc xóa nhanh
          const selABtn = h('button', {
            class: 'small',
            title: `Chọn Track #${item.trackA.uiId} trên màn hình chính CVAT (Frame ${targetFrame})`,
            onclick: async (e) => {
              e.stopPropagation();
              renderMatrix(targetFrame);
              await SP.bridge.changeFrame(targetFrame);
              await SP.bridge.activateObject(item.trackA.id);
              app.setStatus(`Frame ${targetFrame}: Đã chọn Track #${item.trackA.uiId} trên CVAT`, 'ok');
            }
          }, `Chọn #${item.trackA.uiId}`);

          const selBBtn = h('button', {
            class: 'small',
            title: `Chọn Track #${item.trackB.uiId} trên màn hình chính CVAT (Frame ${targetFrame})`,
            onclick: async (e) => {
              e.stopPropagation();
              renderMatrix(targetFrame);
              await SP.bridge.changeFrame(targetFrame);
              await SP.bridge.activateObject(item.trackB.id);
              app.setStatus(`Frame ${targetFrame}: Đã chọn Track #${item.trackB.uiId} trên CVAT`, 'ok');
            }
          }, `Chọn #${item.trackB.uiId}`);

          const editC2Btn = h('button', {
            class: 'small',
            title: `Mở trình sửa chuỗi Frame (Tab 2) cho Track #${item.trackA.uiId}`,
            onclick: (e) => {
              e.stopPropagation();
              app.switchTab('case2', item.trackA.id);
            }
          }, 'Sửa chuỗi →');

          let viewRangeBtn = null;
          if (!isSingle) {
            viewRangeBtn = h('button', {
              class: 'small',
              style: { display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#69c0ff', borderColor: 'rgba(23, 125, 220, 0.45)' },
              title: `Mở xem toàn bộ chuỗi ${item.count} bảng ma trận từ Frame ${item.startFrame} đến ${item.endFrame} ở khung bên phải`,
              onclick: (e) => {
                e.stopPropagation();
                openRangeMatrix(item.startFrame, item.endFrame);
              }
            }, SP.icons.list(11), `Dải ${item.count}f →`);
          }

          const card = h('div', {
            class: 'alert-item overlap',
            style: { cursor: 'pointer' },
            onclick: () => focusOverlapOnMainCvat(targetFrame, item.trackA, item.trackB),
          },
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
                h('span', { class: 'alert-badge overlap' }, badgeText),
                h('b', { style: { color: '#fff', fontSize: '12.5px' } }, titleText)
              ),
              h('div', { style: { fontSize: '11.5px', color: '#8b949e', marginTop: '4px' } }, descText)
            ),
            h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' } },
              viewMainBtn, viewRangeBtn, selABtn, selBBtn, editC2Btn
            )
          );
          alertListEl.append(card);
        } else {
          const isSize = item.type === 'size';
          const isDist = item.type === 'distance';
          const isRot = item.type === 'rotation';
          const badgeText = isSize ? 'Kích thước'
            : isDist ? `Xa >${item.maxDistM}m`
            : isRot ? (item.subType === 'flip180' ? `Đảo đầu ${Math.round(item.dYawDeg)}°` : item.subType === 'tilt_spike' ? 'Nghiêng dốc' : `Góc giật ${Math.round(item.dYawDeg)}°`)
            : 'Tốc độ';
          const badgeCls = isSize ? 'alert-badge size'
            : isDist ? 'alert-badge distance'
            : isRot ? 'alert-badge rotation'
            : 'alert-badge speed';
          const titleText = isSize
            ? `Track #${item.track.uiId} (${store.labelName(item.track.labelId)}): Kích thước biến dạng`
            : isDist
            ? `Track #${item.track.uiId} (${store.labelName(item.track.labelId)}): ${item.frames.length} frame vượt quá ${item.maxDistM}m chưa ẩn Outside`
            : isRot
            ? (item.subType === 'flip180'
                ? `Frame ${item.startFrame} → ${item.endFrame}: Track #${item.track.uiId} (${store.labelName(item.track.labelId)}) quay ngược chiều 180°`
                : item.subType === 'tilt_spike'
                ? `Frame ${item.frame}: Track #${item.track.uiId} (${store.labelName(item.track.labelId)}) bị nghiêng ngửa / chúi dốc quá mức`
                : `Frame ${item.startFrame} → ${item.endFrame}: Track #${item.track.uiId} (${store.labelName(item.track.labelId)}) đổi góc lái giật ${Math.round(item.dYawDeg)}°`)
            : `Frame ${item.frame}: Track #${item.track.uiId} nhảy toạ độ bất thường`;

          const viewCvatBtn = h('button', {
            class: 'small',
            title: `Nhảy màn hình chính CVAT tới Frame ${item.frame} và chọn Track #${item.track.uiId}`,
            onclick: async (e) => {
              e.stopPropagation();
              renderMatrix(item.frame);
              const pos = item.track.at(item.frame);
              await SP.bridge.focusTrackInMain({
                frame: item.frame,
                clientID: item.track.id,
                targetCenter: pos?.box?.c,
              });
              app.setStatus(`Frame ${item.frame}: Đã nhảy CVAT và khóa mục tiêu vào Track #${item.track.uiId}`, 'ok');
            }
          }, SP.icons.focusTarget(12), `Xem CVAT (f${item.frame})`);

          const actionBtns = [viewCvatBtn];

          if (isDist) {
            actionBtns.push(h('button', {
              class: 'small',
              style: { borderColor: '#da3633', color: '#ff7875' },
              title: `Tự động gán Outside = true cho toàn bộ ${item.frames.length} frame vượt ngưỡng >${item.maxDistM}m của Track #${item.track.uiId}`,
              onclick: async (e) => {
                e.stopPropagation();
                item.track.setOutsideBatch(item.frames, true);
                if (store.syncTrackToCvat) await store.syncTrackToCvat(item.track);
                allQAErrors = allQAErrors.filter((x) => x !== item);
                app.changed();
                renderAlerts();
                app.setStatus(`Đã gán Outside = true cho ${item.frames.length} frame (> ${item.maxDistM}m) của Track #${item.track.uiId}`, 'ok');
              }
            }, `Gán Outside (${item.frames.length}f)`));
          }

          if (isRot) {
            if (item.subType === 'flip180') {
              actionBtns.push(h('button', {
                class: 'small',
                style: { borderColor: '#ff7a45', color: '#ff9c6e', display: 'inline-flex', alignItems: 'center', gap: '3px' },
                title: `Tự động đảo chiều đầu xe 180° tại Frame ${item.frame} để hướng xe xuôi theo chiều di chuyển`,
                onclick: async (e) => {
                  e.stopPropagation();
                  const pos = item.track.at(item.frame);
                  if (pos && pos.box) {
                    item.track.setBox(item.frame, { ...pos.box, r: SP.geom.quickFlipHeading(pos.box.r) });
                    if (store.syncTrackToCvat) await store.syncTrackToCvat(item.track);
                    allQAErrors = allQAErrors.filter((x) => x !== item);
                    app.changed();
                    renderAlerts();
                    renderMatrix(item.frame);
                    app.setStatus(`Đã đảo chiều đầu xe 180° cho Track #${item.track.uiId} tại Frame ${item.frame}`, 'ok');
                  }
                }
              }, SP.icons.flip(10), 'Đảo lại đầu 180°'));
            } else if (item.subType === 'tilt_spike') {
              actionBtns.push(h('button', {
                class: 'small',
                style: { borderColor: '#faad14', color: '#ffc53d' },
                title: `Đặt góc nghiêng Roll = 0° và Pitch = 0° tại Frame ${item.frame} (giữ nguyên hướng lái Yaw)`,
                onclick: async (e) => {
                  e.stopPropagation();
                  const pos = item.track.at(item.frame);
                  if (pos && pos.box) {
                    item.track.setBox(item.frame, { ...pos.box, r: [0, 0, pos.box.r[2]] });
                    if (store.syncTrackToCvat) await store.syncTrackToCvat(item.track);
                    allQAErrors = allQAErrors.filter((x) => x !== item);
                    app.changed();
                    renderAlerts();
                    renderMatrix(item.frame);
                    app.setStatus(`Đã đặt lại cân bằng (Roll=0°, Pitch=0°) cho Track #${item.track.uiId} tại Frame ${item.frame}`, 'ok');
                  }
                }
              }, 'Đặt cân bằng 0°'));
            }
          }

          const fixBtn = h('button', {
            class: 'primary small',
            onclick: (e) => {
              e.stopPropagation();
              renderMatrix(item.frame);
              app.switchTab(isSize ? 'case1' : 'case2', item.track.id);
            }
          }, isSize ? 'Chuẩn hóa Size →' : 'Sửa chuỗi →');
          actionBtns.push(fixBtn);

          const card = h('div', { class: `alert-item ${item.type}` },
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                h('span', { class: badgeCls }, badgeText),
                h('b', { style: { color: '#fff', fontSize: '12.5px' } }, titleText)
              ),
              h('div', { style: { fontSize: '11.5px', color: '#8b949e', marginTop: '4px' } }, item.message)
            ),
            h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } }, ...actionBtns)
          );
          alertListEl.append(card);
        }
      }
    }

    // ---------- 3. Quét toàn diện Job (Overlaps + Size Inconsistency + Speed Spikes + Distance > Ngưỡng QA) ----------
    async function startScan() {
      scanBtn.disabled = true;
      pBar.textContent = 'Đang chuẩn bị quét toàn diện…';
      allQAErrors = [];
      const thresh = Math.max(0.01, (Number(thresholdInput.value) || SP.qa.getGlobal().iouPct) / 100);

      try {
        // 1. Quét Overlaps 3D
        const overlaps = await SP.iou3d.scanAllJobOverlaps(store, {
          threshold: thresh,
          onProgress: (p) => {
            pBar.textContent = `[1/5] Quét Overlap: ${p.current}/${p.total} frames (${Math.round(p.fraction * 100)}%)…`;
          }
        });
        overlaps.forEach((o) => { o.type = 'overlap'; allQAErrors.push(o); });

        // 2. Quét Kích thước Biến dạng (Size Inconsistency)
        pBar.textContent = '[2/5] Kiểm tra kích thước hình học…';
        for (const t of store.tracks.values()) {
          if (t.shapes.length < 2) continue;
          const cfg = SP.qa.get(store.labelName(t.labelId));
          const sizeLimitM = cfg.sizeCm / 100;
          const sizes = t.shapes.map((s) => s.points.slice(6, 9));
          const lo = [0, 1, 2].map((i) => Math.min(...sizes.map((s) => s[i])));
          const hi = [0, 1, 2].map((i) => Math.max(...sizes.map((s) => s[i])));
          const diffL = hi[0] - lo[0], diffW = hi[1] - lo[1], diffH = hi[2] - lo[2];
          const maxDiff = Math.max(diffL, diffW, diffH);
          if (maxDiff > sizeLimitM) {
            allQAErrors.push({
              type: 'size',
              track: t,
              frame: t.firstFrame,
              maxDiff,
              message: `Xe bị co giãn lệch tối đa ${Math.round(maxDiff * 100)}cm (vượt ngưỡng ${cfg.sizeCm}cm) — ΔL: ${diffL.toFixed(2)}m, ΔW: ${diffW.toFixed(2)}m, ΔH: ${diffH.toFixed(2)}m`,
            });
          }
        }

        // 3. Quét Tốc độ Nhảy cóc (Speed Spikes)
        pBar.textContent = '[3/5] Kiểm tra tính liên tục của quỹ đạo (Tốc độ)…';
        for (const t of store.tracks.values()) {
          const cfg = SP.qa.get(store.labelName(t.labelId));
          for (let i = 0; i < t.shapes.length - 1; i++) {
            const s1 = t.shapes[i];
            const s2 = t.shapes[i + 1];
            const df = s2.frame - s1.frame;
            if (df <= 0) continue;
            const dist = Math.hypot(s2.points[0] - s1.points[0], s2.points[1] - s1.points[1], s2.points[2] - s1.points[2]);
            const speedPerFrame = dist / df;
            if (speedPerFrame > cfg.speedPerFrame) {
              allQAErrors.push({
                type: 'speed',
                track: t,
                frame: s2.frame,
                speedPerFrame,
                message: `Vị trí dịch chuyển ${dist.toFixed(1)}m trong ${df} frame (~${speedPerFrame.toFixed(2)} m/f > ${cfg.speedPerFrame} m/f) - Nghi ngờ gán nhầm đối tượng.`,
              });
            }
          }
        }

        // 4. Quét Góc quay đột ngột & Đảo ngược đầu xe (Rotation / Yaw Spikes / Flip 180°)
        pBar.textContent = '[4/5] Kiểm tra góc xoay & đảo chiều đầu xe…';
        for (const t of store.tracks.values()) {
          if (t.shapes.length < 2) continue;
          const cfg = SP.qa.get(store.labelName(t.labelId));
          for (let i = 0; i < t.shapes.length - 1; i++) {
            const s1 = t.shapes[i];
            const s2 = t.shapes[i + 1];
            const f1 = s1.frame;
            const f2 = s2.frame;
            const df = f2 - f1;
            if (df <= 0) continue;

            const pos1 = t.at(f1);
            const pos2 = t.at(f2);
            if (!pos1 || !pos2 || pos1.outside || pos2.outside) continue;

            const yaw1 = pos1.box.r[2];
            const yaw2 = pos2.box.r[2];
            const dYawRad = Math.abs(SP.store.findAngleDiff(yaw2, yaw1));
            const dYawDeg = (dYawRad * 180) / Math.PI;
            const yawRate = df > 0 ? dYawDeg / df : dYawDeg;

            // 4.1. Lỗi nghiêm trọng: Đảo ngược đầu xe (~180°)
            if (dYawDeg >= cfg.flipMinDeg && dYawDeg <= cfg.flipMaxDeg && df <= cfg.flipMaxFrames) {
              allQAErrors.push({
                type: 'rotation',
                subType: 'flip180',
                track: t,
                frame: f2,
                startFrame: f1,
                endFrame: f2,
                dYawDeg,
                df,
                message: `Đầu xe bị quay ngược chiều ${Math.round(dYawDeg)}° giữa f${f1} → f${f2} (${df} frame trong ngưỡng ${cfg.flipMinDeg}°–${cfg.flipMaxDeg}°). Nghi ngờ gán ngược đầu xe.`,
              });
              continue;
            }

            // 4.2. Góc giật bất thường (Yaw Spike)
            if ((df <= 3 && dYawDeg > cfg.yawDeg) || (df > 3 && yawRate > cfg.yawRateDegPerFrame)) {
              allQAErrors.push({
                type: 'rotation',
                subType: 'yaw_spike',
                track: t,
                frame: f2,
                startFrame: f1,
                endFrame: f2,
                dYawDeg,
                yawRate,
                df,
                message: `Góc xoay hướng xe (Yaw) đổi đột ngột ${Math.round(dYawDeg)}° trong ${df} frame (~${Math.round(yawRate)}°/frame > ngưỡng ${cfg.yawDeg}°).`,
              });
              continue;
            }

            // 4.3. Nghiêng lệch ngửa / chúi dốc quá mức (Roll / Pitch Spike)
            const rollDeg = Math.abs((pos2.box.r[0] * 180) / Math.PI);
            const pitchDeg = Math.abs((pos2.box.r[1] * 180) / Math.PI);
            if (rollDeg > cfg.rollDeg || pitchDeg > cfg.pitchDeg) {
              allQAErrors.push({
                type: 'rotation',
                subType: 'tilt_spike',
                track: t,
                frame: f2,
                startFrame: f1,
                endFrame: f2,
                rollDeg,
                pitchDeg,
                message: `Xe bị nghiêng sườn/chúi dốc bất thường tại Frame ${f2} (Roll: ${rollDeg.toFixed(1)}° > ${cfg.rollDeg}°, Pitch: ${pitchDeg.toFixed(1)}° > ${cfg.pitchDeg}°).`,
              });
            }
          }
        }

        // 5. Quét Khoảng cách vượt ngưỡng Guideline (> maxDistM) nhưng chưa đánh dấu Outside
        pBar.textContent = `[5/5] Kiểm tra khoảng cách vượt ngưỡng (> ${SP.qa.getGlobal().maxDistM}m)…`;
        for (const t of store.tracks.values()) {
          const cfg = SP.qa.get(store.labelName(t.labelId));
          const maxDistM = cfg.maxDistM;
          const farFrames = [];
          let peakDist = 0;
          for (const f of store.frames) {
            if (f < t.firstFrame) continue;
            const pos = t.at(f);
            if (!pos || pos.outside) continue;
            const d = Math.hypot(pos.box.c[0], pos.box.c[1]);
            if (d > maxDistM) {
              farFrames.push(f);
              if (d > peakDist) peakDist = d;
            }
          }
          if (farFrames.length > 0) {
            allQAErrors.push({
              type: 'distance',
              track: t,
              frame: farFrames[0],
              frames: farFrames,
              maxDistM,
              message: `Khoảng cách tối đa ${peakDist.toFixed(1)}m (> ${maxDistM}m) tại f${farFrames[0]}→f${farFrames[farFrames.length - 1]} (${farFrames.length}f đang hiển thị chưa gán Outside).`,
            });
          }
        }

        allQAErrors.sort((a, b) => a.frame - b.frame || ((a.trackA || a.track)?.uiId || 0) - ((b.trackA || b.track)?.uiId || 0));
        pBar.textContent = `Hoàn tất quét! Phát hiện tổng cộng ${allQAErrors.length} lỗi QA.`;
        renderAlerts();
        if (allQAErrors.length) {
          renderMatrix(allQAErrors[0].frame);
        } else {
          renderMatrix(currentFrame);
        }
      } catch (err) {
        pBar.textContent = `Lỗi: ${err.message}`;
      } finally {
        scanBtn.disabled = false;
      }
    }

    scanBtn.onclick = startScan;

    renderMatrix(currentFrame);

    // Nếu không truyền initialFrame cụ thể, tự động lấy frame đang mở trên CVAT
    if (initialFrame === null || initialFrame === undefined) {
      SP.bridge.getActiveElement().then((act) => {
        if (act && typeof act.frame === 'number' && act.frame !== currentFrame) {
          renderMatrix(act.frame);
        }
      }).catch(() => {});
    }

    const unbindQA = SP.qa.onChange(() => {
      thresholdInput.value = String(SP.qa.getGlobal().iouPct);
      qaSettingsBtn.classList.toggle('customized', SP.qa.isCustomized());
      updateDistFilterLabel();
      renderMatrix(currentFrame);
    });

    return {
      refresh() { renderMatrix(currentFrame); },
      unmount() {
        if (activeQAPopoverClose) activeQAPopoverClose();
        unbindQA();
      }
    };
  }

  (SP.pendingTabs ||= []).push(['case3', { title: 'Kiểm tra Overlap & QA', mount }]);
})();
