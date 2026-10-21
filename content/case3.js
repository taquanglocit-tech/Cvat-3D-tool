// case3.js - Tab Case 3: Nhận diện Trùng lặp (Overlap Detection), Ma trận Heatmap & Bộ kiểm tra lỗi QA Toàn diện
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});
  const { h, fmt } = SP.ui;

  const CSS = `
    .c3-container { display: flex; flex-direction: column; height: 100%; overflow: hidden; background: #0d1117; color: #c9d1d9; }
    .c3-top { padding: 10px 16px; background: #161b22; border-bottom: 1px solid #30363d; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .c3-body { flex: 1; display: grid; grid-template-columns: 1.25fr 1fr; gap: 12px; padding: 14px; min-height: 0; overflow: hidden; }
    .c3-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
    .c3-card-head { padding: 10px 14px; background: #21262d; border-bottom: 1px solid #30363d; font-weight: 600; font-size: 13px; display: flex; align-items: center; justify-content: space-between; }
    .c3-card-body { flex: 1; overflow-y: auto; padding: 12px; }
    .alert-item { background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px; transition: border-color 0.15s; }
    .alert-item:hover { border-color: #58a6ff; }
    .alert-item.overlap { border-left: 4px solid #da3633; }
    .alert-item.size { border-left: 4px solid #d29922; }
    .alert-item.speed { border-left: 4px solid #a371f7; }
    .alert-badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
    .alert-badge.overlap { background: #da3633; color: #fff; }
    .alert-badge.size { background: #d29922; color: #fff; }
    .alert-badge.speed { background: #8957e5; color: #fff; }
    .matrix-table { border-collapse: collapse; font-size: 11px; text-align: center; }
    .matrix-table th, .matrix-table td { padding: 6px 8px; border: 1px solid #30363d; min-width: 45px; }
    .matrix-table th { background: #21262d; color: #8b949e; position: sticky; top: 0; }
    .matrix-cell { font-weight: 600; border-radius: 3px; cursor: default; }
    .matrix-cell.safe { background: rgba(35, 134, 54, 0.15); color: #3fb950; }
    .matrix-cell.warn { background: rgba(210, 153, 34, 0.25); color: #e3b341; }
    .matrix-cell.danger { background: rgba(218, 54, 51, 0.35); color: #f85149; font-weight: 700; }
    .filter-btn { background: #21262d; border: 1px solid #30363d; color: #8b949e; padding: 3px 8px; font-size: 11px; border-radius: 4px; cursor: pointer; }
    .filter-btn.active { background: #1f6feb; color: #fff; border-color: #1f6feb; }
  `;

  function mount(app, root) {
    const store = app.store;
    root.append(h('style', {}, CSS));

    let currentFrame = store.frames[0] || 0;
    let allQAErrors = [];
    let currentFilter = 'all';

    const thresholdInput = h('input', { type: 'number', min: '0.05', max: '0.9', step: '0.05', value: '0.25', style: { width: '50px' } });
    const scanBtn = h('button', { class: 'primary' }, '🔍 Quét Lỗi & Trùng Lặp Toàn Job');
    const pBar = h('span', { style: { fontSize: '12px', color: '#8b949e' } });
    const frameInput = h('input', { type: 'number', value: currentFrame, min: store.frames[0], max: store.frames[store.frames.length - 1], style: { width: '60px' } });
    const viewMatrixBtn = h('button', {}, 'Xem Frame Này');

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

      if (activeTracks.length < 2) {
        matrixContainerEl.append(h('div', { style: { padding: '40px', color: '#8b949e', textAlign: 'center' } },
          `Frame ${frame} chỉ có ${activeTracks.length} vật thể, không có giao thoa trùng lặp.`
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
        alertListEl.append(h('div', { style: { padding: '40px', textAlign: 'center', color: '#3fb950' } },
          allQAErrors.length ? 'Không có lỗi thuộc bộ lọc này.' : '🎉 Tuyệt vời! Chưa phát hiện lỗi hình học nào trên toàn Job.'
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
          class: 'primary small',
          onclick: () => {
            renderMatrix(item.frame);
            app.switchTab('case2', item.trackA ? item.trackA.id : item.track.id);
          }
        }, '👉 Nhảy tới Frame');

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
                message: `Toạ độ nhảy vọt ${dist.toFixed(1)}m trong ${df} frame (~${Math.round(speedPerFrame * 10 * 3.6)} km/h)! Nghi ngờ AI gán nhầm xe.`,
              });
            }
          }
        }

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

    return {
      refresh() { renderMatrix(currentFrame); },
      unmount() {}
    };
  }

  (SP.pendingTabs ||= []).push(['case3', { title: 'Case 3 · Overlap & QA Inspector', mount }]);
})();
