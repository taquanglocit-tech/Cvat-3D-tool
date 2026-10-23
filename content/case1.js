// case1.js - Tab Case 1: Quản lý và Đồng bộ Kích thước L/W/H hàng loạt
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});

  const MODES = [
    ['bottom', 'Giữ đáy box cố định (Chuẩn xe tự lái)'],
    ['center', 'Giữ tâm box (CVAT mặc định)'],
    ['ground', 'Bám mặt đất tự động theo LiDAR'],
  ];

  function median(values) {
    const s = values.slice().sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : NaN;
  }

  function mount(app, root) {
    const { h, fmt } = SP.ui;
    const store = app.store;
    if (!store || !store.meta || !store.frames?.length) {
      root.append(h('div', { class: 'bar', style: { color: '#8c8c8c', padding: '12px' } },
        'Đang kết nối và tải dữ liệu từ CVAT, vui lòng chờ trong giây lát…'
      ));
      const off = store ? store.on('load', () => {
        off();
        if (app.activeTab === 'case1') app.switchTab('case1');
      }) : () => {};
      return { refresh() {}, unmount() { off(); } };
    }
    const frames = store.frames;
    const range = { from: frames[0], to: frames[frames.length - 1] };
    const inputs = new Map();

    const modeSel = h('select', { onchange: () => { app.settings.sizeMode = modeSel.value; } },
      MODES.map(([v, t]) => h('option', { value: v, selected: app.settings.sizeMode === v }, t)));
    const fromIn = h('input', { type: 'number', value: range.from, min: frames[0], max: frames[frames.length - 1],
      onchange: () => { range.from = Number(fromIn.value); } });
    const toIn = h('input', { type: 'number', value: range.to, min: frames[0], max: frames[frames.length - 1],
      onchange: () => { range.to = Number(toIn.value); } });
    const progress = h('span', { class: 'status', style: { color: '#40a9ff', fontSize: '12px' } });

    const tbody = h('tbody');
    const table = h('table', { style: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' } },
      h('thead', { style: { background: '#1f1f1f', borderBottom: '1px solid #303030', position: 'sticky', top: '0', zIndex: '1' } },
        h('tr', {},
          ['ID', 'Nhãn (Label)', 'Dải Frame', 'Keyframes', 'L / W / H Trung vị', 'L mới', 'W mới', 'H mới', 'Lấy mẫu từ Frame', 'Thao tác'].map((t) =>
            h('th', { style: { padding: '8px 10px', fontSize: '11px', fontWeight: '600', color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: '0.3px' } }, t))
        )
      ),
      tbody
    );

    root.append(
      h('div', { class: 'bar', style: { gap: '10px' } },
        h('label', {}, 'Chế độ chuẩn hóa:', modeSel),
        h('span', { class: 'divider' }),
        h('label', {}, 'Phạm vi frame:', fromIn, '→', toIn),
        h('span', { class: 'divider' }),
        h('span', { style: { color: '#8c8c8c', fontSize: '12px' } },
          'Mẹo: Chọn "Giữ đáy box cố định" để khi đổi chiều cao H bánh xe vẫn chạm sát mặt đường.'
        ),
        progress
      ),
      h('div', { style: { flex: 1, overflow: 'auto', padding: '8px 12px' } }, table)
    );

    function inRange(f) {
      return f >= Math.min(range.from, range.to) && f <= Math.max(range.from, range.to);
    }

    async function apply(track, size) {
      const keyframes = track.shapes.filter((s) => inRange(s.frame));
      if (!keyframes.length) { app.setStatus('Không có keyframe nào trong dải frame chỉ định.', 'err'); return; }
      const mode = app.settings.sizeMode;
      if (mode === 'ground') {
        await app.getFrames().preload(keyframes.map((s) => s.frame),
          (p) => { progress.textContent = `Tải point cloud ${Math.round(p.fraction * 100)}%…`; });
      }

      if (app.snapshot) app.snapshot([track.id]);
      else track.snapshot();
      let failed = 0;
      for (const shape of keyframes) {
        const box = SP.geom.pointsToBox(shape.points);
        let newBox = box;
        if (mode === 'bottom') {
          newBox = SP.geom.resizeKeepBottom(box, size);
        } else if (mode === 'center') {
          newBox = { ...SP.geom.cloneBox(box), s: size.slice() };
        } else if (mode === 'ground') {
          const kept = SP.geom.resizeKeepBottom(box, size);
          const cloud = await app.getFrames().cloud(shape.frame);
          const snapped = SP.geom.snapToGround(cloud.xyz, kept);
          newBox = snapped ? snapped.box : kept;
          if (!snapped) failed++;
        }
        shape.points = SP.geom.boxToPoints(newBox, shape.points);
      }
      track.dirty = true;
      progress.textContent = '';
      app.changed();
      await store.syncTrackToCvat(track);
      app.setStatus(`ID #${track.uiId}: Đã đồng bộ kích thước & cập nhật trực tiếp lên CVAT`, failed ? 'err' : 'ok');
    }

    async function snapOnly(track) {
      const keyframes = track.shapes.filter((s) => inRange(s.frame) && !s.outside);
      progress.textContent = 'Đang tải dữ liệu point cloud…';
      await app.getFrames().preload(keyframes.map((s) => s.frame));
      if (app.snapshot) app.snapshot([track.id]);
      else track.snapshot();
      let failed = 0;
      for (const shape of keyframes) {
        const cloud = await app.getFrames().cloud(shape.frame);
        const res = SP.geom.snapToGround(cloud.xyz, SP.geom.pointsToBox(shape.points));
        if (!res) { failed++; continue; }
        shape.points = SP.geom.boxToPoints(res.box, shape.points);
      }
      track.dirty = true;
      progress.textContent = '';
      app.changed();
      await store.syncTrackToCvat(track);
      app.setStatus(`ID #${track.uiId}: Đã hút đáy chạm đất & cập nhật trực tiếp lên CVAT`, failed ? 'err' : 'ok');
    }

    function render() {
      tbody.replaceChildren();
      const tracks = [...store.tracks.values()].sort((a, b) => a.uiId - b.uiId);
      if (!tracks.length) {
        tbody.append(h('tr', {}, h('td', { colSpan: 10, style: { padding: '20px', textAlign: 'center', color: '#8b949e' } }, 'Job này không có track cuboid 3D nào.')));
        return;
      }

      for (const t of tracks) {
        const sizes = t.shapes.map((s) => s.points.slice(6, 9));
        const med = [0, 1, 2].map((i) => median(sizes.map((s) => s[i])));
        const lo = [0, 1, 2].map((i) => Math.min(...sizes.map((s) => s[i])));
        const hi = [0, 1, 2].map((i) => Math.max(...sizes.map((s) => s[i])));
        const varies = [0, 1, 2].some((i) => hi[i] - lo[i] > 0.008);

        const state = inputs.get(t.id) || { L: '', W: '', H: '', from: t.firstFrame };
        inputs.set(t.id, state);

        const mk = (key) => h('input', {
          type: 'number', step: '0.01', min: '0.05', value: state[key], style: { width: '65px', padding: '2px 4px' },
          placeholder: fmt(med['LWH'.indexOf(key)]),
          oninput: (e) => { state[key] = e.target.value; }
        });

        const L = mk('L'), W = mk('W'), H = mk('H');
        const fromFrame = h('input', {
          type: 'number', value: state.from, min: t.firstFrame, max: t.lastFrame, style: { width: '60px', padding: '2px 4px' },
          oninput: (e) => { state.from = Number(e.target.value); }
        });

        const pickBtn = h('button', {
          title: 'Lấy kích thước L/W/H từ frame này làm mẫu',
          onclick: () => {
            const pos = t.at(Number(fromFrame.value));
            if (!pos) return;
            [state.L, state.W, state.H] = pos.box.s.map((v) => v.toFixed(3));
            L.value = state.L; W.value = state.W; H.value = state.H;
          }
        }, 'Lấy mẫu');

        const applyBtn = h('button', {
          class: 'primary',
          onclick: async () => {
            const size = [L, W, H].map((el, i) => (el.value === '' ? med[i] : Number(el.value)));
            if (size.some((v) => !Number.isFinite(v) || v <= 0)) { app.setStatus('Kích thước L/W/H không hợp lệ', 'err'); return; }
            applyBtn.disabled = true;
            try { await apply(t, size); } finally { applyBtn.disabled = false; }
          }
        }, 'Áp dụng');

        const snapBtn = h('button', {
          onclick: () => snapOnly(t).catch((err) => app.setStatus(`Lỗi: ${err.message}`, 'err')),
          title: 'Hút đáy box xuống mặt đất theo LiDAR'
        }, 'Hút đất');

        const openC2Btn = h('button', { onclick: () => app.switchTab('case2', t.id) }, 'Sửa chuỗi →');

        tbody.append(h('tr', {
          style: { borderBottom: '1px solid #262626', transition: 'background 0.1s' },
          onmouseenter: (e) => { e.currentTarget.style.background = '#1f1f1f'; },
          onmouseleave: (e) => { e.currentTarget.style.background = 'transparent'; },
        },
          h('td', { style: { padding: '7px 10px', fontWeight: 600, color: '#fff' } }, `#${t.uiId}`),
          h('td', { style: { padding: '7px 10px', color: store.labelColor(t.labelId), fontWeight: 500 } }, store.labelName(t.labelId)),
          h('td', { style: { padding: '7px 10px', fontVariantNumeric: 'tabular-nums', color: '#bfbfbf' } }, `f${t.firstFrame} → f${t.lastFrame}`),
          h('td', { style: { padding: '7px 10px', fontVariantNumeric: 'tabular-nums' } }, String(t.shapes.length)),
          h('td', { style: { padding: '7px 10px', fontVariantNumeric: 'tabular-nums' } },
            med.map((v) => fmt(v)).join(' × '),
            varies ? h('span', { style: { marginLeft: '6px', color: '#faad14', fontSize: '10px', background: 'rgba(250, 173, 20, 0.12)', border: '1px solid rgba(250, 173, 20, 0.4)', padding: '1px 5px', borderRadius: '2px' } }, 'Biến thiên') : null
          ),
          h('td', { style: { padding: '7px 10px' } }, L),
          h('td', { style: { padding: '7px 10px' } }, W),
          h('td', { style: { padding: '7px 10px' } }, H),
          h('td', { style: { padding: '7px 10px', display: 'flex', alignItems: 'center', gap: '4px' } }, fromFrame, pickBtn),
          h('td', { style: { padding: '7px 10px' } }, h('div', { style: { display: 'flex', gap: '4px' } }, applyBtn, snapBtn, openC2Btn)),
        ));
      }
    }

    render();
    return { refresh: render, unmount() {} };
  }

  (SP.pendingTabs ||= []).push(['case1', { title: 'Chuẩn hóa Size L/W/H', mount }]);
})();
