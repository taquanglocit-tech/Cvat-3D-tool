// case3.js - Tab Case 3: Nhận diện Trùng lặp (Overlap Detection), Ma trận Heatmap & Bộ kiểm tra lỗi QA Toàn diện
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});
  const { h, fmt } = SP.ui;

  const CSS = `
    .c3-container { display: flex; flex-direction: column; height: 100%; overflow: hidden; background: #141414; color: #d9d9d9; }
    .c3-top { padding: 8px 16px; background: #1f1f1f; border-bottom: 1px solid #303030; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .c3-body { flex: 1; display: grid; grid-template-columns: 1.25fr 1fr; gap: 12px; padding: 12px; min-height: 0; overflow: hidden; }
    .c3-card { background: #1f1f1f; border: 1px solid #303030; border-radius: 4px; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
    .c3-card-head { padding: 8px 12px; background: #262626; border-bottom: 1px solid #303030; font-weight: 600; font-size: 12px; display: flex; align-items: center; justify-content: space-between; }
    .c3-card-body { flex: 1; overflow-y: auto; padding: 10px; }
    .alert-item { background: #141414; border: 1px solid #303030; border-radius: 3px; padding: 8px 12px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px; transition: border-color 0.15s; }
    .alert-item:hover { border-color: #177ddc; }
    .alert-item.overlap { border-left: 3px solid #ff4d4f; }
    .alert-item.size { border-left: 3px solid #faad14; }
    .alert-item.speed { border-left: 3px solid #722ed1; }
    .alert-badge { font-size: 11px; font-weight: 500; padding: 1px 6px; border-radius: 2px; }
    .alert-badge.overlap { background: rgba(255, 77, 79, 0.2); color: #ff7875; border: 1px solid #ff4d4f; }
    .alert-badge.size { background: rgba(250, 173, 20, 0.2); color: #ffc53d; border: 1px solid #faad14; }
    .alert-badge.speed { background: rgba(114, 46, 209, 0.2); color: #b37feb; border: 1px solid #722ed1; }
    .matrix-table { border-collapse: collapse; font-size: 11px; text-align: center; }
    .matrix-table th, .matrix-table td { padding: 6px 8px; border: 1px solid #303030; min-width: 45px; }
    .matrix-table th { background: #262626; color: #8c8c8c; position: sticky; top: 0; font-weight: 500; }
    .matrix-cell { font-weight: 500; border-radius: 2px; cursor: default; }
    .matrix-cell.safe { background: rgba(82, 196, 26, 0.15); color: #73d13d; }
    .matrix-cell.warn { background: rgba(250, 173, 20, 0.2); color: #ffc53d; }
    .matrix-cell.danger { background: rgba(255, 77, 79, 0.25); color: #ff7875; font-weight: 600; }
    .filter-btn { background: #141414; border: 1px solid #434343; color: #8c8c8c; padding: 2px 8px; font-size: 11px; border-radius: 2px; cursor: pointer; }
    .filter-btn.active { background: #177ddc; color: #fff; border-color: #177ddc; }
  `;

  function mount(app, root) {
    const store = app.store;
    root.append(h('style', {}, CSS));

    if (!store || !store.meta || !store.frames?.length) {
      const waitBox = h('div', { class: 'bar', style: { color: '#8c8c8c', padding: '24px', textAlign: 'center' } },
        'Đang kết nối và tải dữ liệu từ CVAT, vui lòng chờ trong giây lát…'
      );
      root.append(waitBox);
      const unbind = store?.on?.('load', () => {
        root.replaceChildren();
        app.mounted = mount(app, root);
      });
      return {
        refresh() {
          if (app.store?.meta) {
            root.replaceChildren();
            app.mounted = mount(app, root);
          }
        },
        unmount() { unbind?.(); }
      };
    }

    let currentFrame = store.frames[0] || 0;
    let allQAErrors = [];
    let currentFilter = 'all';

    const thresholdInput = h('input', { type: 'number', min: '0.05', max: '0.9', step: '0.05', value: '0.25', style: { width: '50px', background: '#141414', border: '1px solid #434343', color: '#fff', borderRadius: '2px', padding: '2px 4px' } });
    const scanBtn = h('button', {
      style: { display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#177ddc', color: '#fff', border: 0, borderRadius: '2px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }
    }, SP.icons.overlap(12), 'Quét Lỗi & Trùng Lặp');
    const pBar = h('span', { style: { fontSize: '12px', color: '#8c8c8c' } });
    const frameInput = h('input', { type: 'number', value: currentFrame, min: store.frames[0], max: store.frames[store.frames.length - 1], style: { width: '60px', background: '#141414', border: '1px solid #434343', color: '#fff', borderRadius: '2px', padding: '2px 4px' } });
    const viewMatrixBtn = h('button', {
      style: { background: '#262626', border: '1px solid #434343', color: '#d9d9d9', borderRadius: '2px', padding: '3px 8px', cursor: 'pointer', fontSize: '12px' }
    }, 'Xem Frame Này');

    // Filter Buttons
    const filterAll = h('button', { class: 'filter-btn active', onclick: () => setFilter('all') }, 'Tất cả');
    const filterOverlap = h('button', { class: 'filter-btn', onclick: () => setFilter('overlap') }, 'Trùng lặp');
    const filterSize = h('button', { class: 'filter-btn', onclick: () => setFilter('size') }, 'Méo kích thước');
    const filterSpeed = h('button', { class: 'filter-btn', onclick: () => setFilter('speed') }, 'Nhảy tốc độ');

    const topBar = h('div', { class: 'c3-top' },
      h('span', { style: { fontWeight: 600, color: '#fff' } }, 'Ngưỡng IoU:'),
      thresholdInput,
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

    const leftCard = h('div', { class: 'c3-card' },
      h('div', { class: 'c3-card-head' },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
          h('span', {}, 'Danh sách Lỗi QA & Duplicate Boxes'),
          h('div', { style: { display: 'flex', gap: '4px' } }, filterAll, filterOverlap, filterSize, filterSpeed)
        ),
        h('span', { id: 'alert-count', style: { fontSize: '11px', color: '#8b949e' } }, 'Chưa quét')
      ),
      alertListEl
    );

    const rightCard = h('div', { class: 'c3-card' },
      h('div', { class: 'c3-card-head' },
        h('span', {}, `Ma trận Trùng lặp (Heatmap Matrix) · Frame ${currentFrame}`),
        h('span', { style: { fontSize: '11px', color: '#8b949e' } }, 'Tỷ lệ % diện tích lồng nhau')
      ),
      matrixContainerEl
    );

    const bodyWrap = h('div', { class: 'c3-body' }, leftCard, rightCard);
    const container = h('div', { class: 'c3-container' }, topBar, bodyWrap);
    root.append(container);

    function setFilter(type) {
      currentFilter = type;
      [filterAll, filterOverlap, filterSize, filterSpeed].forEach((b) => b.classList.remove('active'));
      if (type === 'all') filterAll.classList.add('active');
      else if (type === 'overlap') filterOverlap.classList.add('active');
      else if (type === 'size') filterSize.classList.add('active');
      else if (type === 'speed') filterSpeed.classList.add('active');
      renderAlerts();
    }

    // ---------- 1. Render Ma trận Overlap của Frame ----------
    function renderMatrix(frame) {
      currentFrame = frame;
      frameInput.value = frame;
      rightCard.querySelector('.c3-card-head span').textContent = `Ma trận Trùng lặp (Heatmap Matrix) · Frame ${frame}`;
      matrixContainerEl.replaceChildren();

      const { activeTracks, matrix } = SP.iou3d.computeFrameOverlapMatrix(store, frame);

      if (activeTracks.length === 0) {
        matrixContainerEl.append(h('div', { style: { padding: '40px', color: '#8c8c8c', textAlign: 'center' } },
          `Frame ${frame} chưa có vật thể nào xuất hiện.`
        ));
        return;
      }
      if (activeTracks.length === 1) {
        matrixContainerEl.append(h('div', { style: { padding: '40px', color: '#8c8c8c', textAlign: 'center' } },
          `Frame ${frame} chỉ có 1 vật thể (#${activeTracks[0].uiId} · ${activeTracks[0].labelName}), không có giao thoa trùng lặp.`
        ));
        return;
      }

      const table = h('table', { class: 'matrix-table' });
      const thead = h('thead');
      const tbody = h('tbody');

      const headRow = h('tr', {}, h('th', {}, 'Track'));
      for (const t of activeTracks) headRow.append(h('th', { title: `#${t.uiId} · ${t.labelName}` }, `#${t.uiId}`));
      thead.append(headRow);

      for (let i = 0; i < activeTracks.length; i++) {
        const tRow = activeTracks[i];
        const tr = h('tr', {}, h('th', { title: `#${tRow.uiId} · ${tRow.labelName}` }, `#${tRow.uiId}`));

        for (let j = 0; j < activeTracks.length; j++) {
          const val = matrix[i][j];
          const pct = Math.round(val * 100);
          let cls = 'matrix-cell safe';
          if (i !== j) {
            if (pct >= 40) cls = 'matrix-cell danger';
            else if (pct >= 15) cls = 'matrix-cell warn';
          }

          const td = h('td', {
            class: cls,
            title: i === j ? 'Chính nó' : `IoU 3D giữa #${activeTracks[i].uiId} và #${activeTracks[j].uiId}: ${pct}%`
          }, i === j ? '—' : `${pct}%`);

          if (i !== j && pct >= 15) {
            td.style.cursor = 'pointer';
            td.onclick = () => app.switchTab('case2', activeTracks[i].id);
          }
          tr.append(td);
        }
        tbody.append(tr);
      }

      table.append(thead, tbody);
      matrixContainerEl.append(table);
    }

    // ---------- 2. Render Danh sách Cảnh báo QA ----------
    function renderAlerts() {
      alertListEl.replaceChildren();
      const filtered = currentFilter === 'all'
        ? allQAErrors
        : allQAErrors.filter((e) => e.type === currentFilter);

      const countEl = root.querySelector('#alert-count');
      if (countEl) countEl.textContent = `Tìm thấy: ${filtered.length}/${allQAErrors.length} lỗi`;

      if (!filtered.length) {
        alertListEl.append(h('div', { style: { padding: '40px', textAlign: 'center', color: '#73d13d' } },
          allQAErrors.length ? 'Không có lỗi thuộc bộ lọc này.' : 'Không phát hiện lỗi hình học nào trên toàn Job.'
        ));
        return;
      }

      for (const item of filtered) {
        let badgeText = 'Trùng lặp';
        let badgeCls = 'alert-badge overlap';
        let titleText = '';
        let descText = '';

        if (item.type === 'overlap') {
          const pct = Math.round(item.maxOverlapRatio * 100);
          badgeText = `Trùng ${pct}%`;
          badgeCls = 'alert-badge overlap';
          titleText = `Frame ${item.frame}: Track #${item.trackA.uiId} lồng Track #${item.trackB.uiId}`;
          descText = `Độ lồng nhau: ${pct}% · 3D IoU: ${Math.round(item.iou * 100)}% (${store.labelName(item.trackA.labelId)} ⇄ ${store.labelName(item.trackB.labelId)})`;
        } else if (item.type === 'size') {
          badgeText = 'Kích thước';
          badgeCls = 'alert-badge size';
          titleText = `Track #${item.track.uiId} (${store.labelName(item.track.labelId)}): Kích thước biến dạng`;
          descText = item.message;
        } else if (item.type === 'speed') {
          badgeText = 'Tốc độ';
          badgeCls = 'alert-badge speed';
          titleText = `Frame ${item.frame}: Track #${item.track.uiId} nhảy toạ độ bất thường`;
          descText = item.message;
        }

        const jumpBtn = h('button', {
          style: { padding: '3px 8px', background: '#262626', border: '1px solid #434343', borderRadius: '2px', color: '#d9d9d9', cursor: 'pointer', fontSize: '11px' },
          onclick: () => {
            renderMatrix(item.frame);
            app.switchTab('case2', item.trackA ? item.trackA.id : item.track.id);
          }
        }, 'Xem Frame');

        const card = h('div', { class: `alert-item ${item.type}` },
          h('div', {},
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
              h('span', { class: badgeCls }, badgeText),
              h('b', { style: { color: '#fff', fontSize: '13px' } }, titleText)
            ),
            h('div', { style: { fontSize: '12px', color: '#8b949e', marginTop: '4px' } }, descText)
          ),
          h('div', { style: { display: 'flex', gap: '6px' } }, jumpBtn)
        );
        alertListEl.append(card);
      }
    }

    // ---------- 3. Quét toàn diện Job (Overlaps + Size Inconsistency + Speed Spikes) ----------
    async function startScan() {
      scanBtn.disabled = true;
      pBar.textContent = 'Đang chuẩn bị quét toàn diện…';
      allQAErrors = [];
      const thresh = Number(thresholdInput.value) || 0.25;

      try {
        // 1. Quét Overlaps 3D
        const overlaps = await SP.iou3d.scanAllJobOverlaps(store, {
          threshold: thresh,
          onProgress: (p) => {
            pBar.textContent = `[1/3] Quét Overlap: ${p.current}/${p.total} frames (${Math.round(p.fraction * 100)}%)…`;
          }
        });
        overlaps.forEach((o) => { o.type = 'overlap'; allQAErrors.push(o); });

        // 2. Quét Kích thước Biến dạng (Size Inconsistency)
        pBar.textContent = '[2/3] Kiểm tra kích thước hình học…';
        for (const t of store.tracks.values()) {
          if (t.shapes.length < 2) continue;
          const sizes = t.shapes.map((s) => s.points.slice(6, 9));
          const lo = [0, 1, 2].map((i) => Math.min(...sizes.map((s) => s[i])));
          const hi = [0, 1, 2].map((i) => Math.max(...sizes.map((s) => s[i])));
          const diffL = hi[0] - lo[0], diffW = hi[1] - lo[1], diffH = hi[2] - lo[2];
          const maxDiff = Math.max(diffL, diffW, diffH);
          if (maxDiff > 0.08) {
            allQAErrors.push({
              type: 'size',
              track: t,
              frame: t.firstFrame,
              maxDiff,
              message: `Xe bị co giãn lệch tối đa ${Math.round(maxDiff * 100)}cm (ΔL: ${diffL.toFixed(2)}m, ΔW: ${diffW.toFixed(2)}m, ΔH: ${diffH.toFixed(2)}m)`,
            });
          }
        }

        // 3. Quét Tốc độ Nhảy cóc (Speed Spikes)
        pBar.textContent = '[3/3] Kiểm tra tính liên tục của quỹ đạo…';
        for (const t of store.tracks.values()) {
          for (let i = 0; i < t.shapes.length - 1; i++) {
            const s1 = t.shapes[i];
            const s2 = t.shapes[i + 1];
            const df = s2.frame - s1.frame;
            if (df <= 0) continue;
            const dist = Math.hypot(s2.points[0] - s1.points[0], s2.points[1] - s1.points[1], s2.points[2] - s1.points[2]);
            const speedPerFrame = dist / df;
            if (speedPerFrame > 3.0) {
              allQAErrors.push({
                type: 'speed',
                track: t,
                frame: s2.frame,
                speedPerFrame,
                message: `Vị trí dịch chuyển ${dist.toFixed(1)}m trong ${df} frame (~${Math.round(speedPerFrame * 10 * 3.6)} km/h) - Nghi ngờ gán nhầm đối tượng.`,
              });
            }
          }
        }

        allQAErrors.sort((a, b) => a.frame - b.frame || ((a.trackA || a.track)?.uiId || 0) - ((b.trackA || b.track)?.uiId || 0));
        pBar.textContent = `Hoàn tất quét! Phát hiện tổng cộng ${allQAErrors.length} lỗi QA.`;
        renderAlerts();
        if (allQAErrors.length) {
          renderMatrix(allQAErrors[0].frame);
        }
      } catch (err) {
        pBar.textContent = `Lỗi: ${err.message}`;
      } finally {
        scanBtn.disabled = false;
      }
    }

    scanBtn.onclick = startScan;
    viewMatrixBtn.onclick = () => renderMatrix(Number(frameInput.value) || store.frames[0]);
    frameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') renderMatrix(Number(frameInput.value) || store.frames[0]);
    });

    renderMatrix(currentFrame);

    // Tự động nhận diện frame đang xem trên CVAT khi mở tab Case 3
    SP.bridge.getActiveElement().then((act) => {
      if (act && typeof act.frame === 'number' && act.frame !== currentFrame) {
        renderMatrix(act.frame);
      }
    }).catch(() => {});

    return {
      refresh() { renderMatrix(currentFrame); },
      unmount() {}
    };
  }

  (SP.pendingTabs ||= []).push(['case3', { title: 'Kiểm tra Overlap & QA', mount }]);
})();
