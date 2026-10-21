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
    const frames = store.frames;
    const range = { from: frames[0], to: frames[frames.length - 1] };
    const inputs = new Map();

    const modeSel = h('select', { onchange: () => { app.settings.sizeMode = modeSel.value; } },
      MODES.map(([v, t]) => h('option', { value: v, selected: app.settings.sizeMode === v }, t)));
    const fromIn = h('input', { type: 'number', value: range.from, min: frames[0], max: frames[frames.length - 1],
      onchange: () => { range.from = Number(fromIn.value); } });
    const toIn = h('input', { type: 'number', value: range.to, min: frames[0], max: frames[frames.length - 1],
      onchange: () => { range.to = Number(toIn.value); } });
    const progress = h('span', { class: 'status' });

    const tbody = h('tbody');
    const table = h('table', { style: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' } },
      h('thead', { style: { background: '#161b22', borderBottom: '1px solid #30363d' } },
        h('tr', {},
          ['ID', 'Nhãn', 'Dải Frame', 'Keyframes', 'L/W/H Trung vị', 'L mới', 'W mới', 'H mới', 'Lấy mẫu từ', 'Thao tác'].map((t) =>
            h('th', { style: { padding: '8px 10px', fontSize: '12px', color: '#8b949e' } }, t))
        )
      ),
      tbody
    );

    root.append(
      h('div', { class: 'bar', style: { gap: '12px' } },
        h('label', { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, 'Chế độ đổi kích thước:', modeSel),
        h('label', { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, 'Áp dụng từ frame:', fromIn, '→', toIn),
        progress
      ),
      h('div', { style: { padding: '6px 12px', background: '#161b22', borderBottom: '1px solid #30363d', fontSize: '12px', color: '#8b949e' } },
        '💡 Mẹo: Chọn "Giữ đáy box" để khi đổi chiều cao H bánh xe vẫn chạm sát mặt đường. Mọi thay đổi lưu vào RAM CVAT và lưu bằng nút Save gốc.'
      ),
      h('div', { style: { flex: 1, overflow: 'auto', padding: '10px' } }, table)
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

      track.snapshot();
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
      app.setStatus(`ID #${track.uiId}: Đã đồng bộ kích thước cho ${keyframes.length} keyframes`, failed ? 'err' : 'ok');
      app.changed();
    }

    async function snapOnly(track) {
      const keyframes = track.shapes.filter((s) => inRange(s.frame) && !s.outside);
      progress.textContent = 'Đang tải dữ liệu point cloud…';
      await app.getFrames().preload(keyframes.map((s) => s.frame));
      track.snapshot();
      let failed = 0;
      for (const shape of keyframes) {
        const cloud = await app.getFrames().cloud(shape.frame);
        const res = SP.geom.snapToGround(cloud.xyz, SP.geom.pointsToBox(shape.points));
        if (!res) { failed++; continue; }
        shape.points = SP.geom.boxToPoints(res.box, shape.points);
      }
      track.dirty = true;
      progress.textContent = '';
      app.setStatus(`ID #${track.uiId}: Đã hút đáy chạm đất ${keyframes.length - failed} keyframes`, failed ? 'err' : 'ok');
      app.changed();
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
          onclick: () => {
            const pos = t.at(Number(fromFrame.value));
            if (!pos) return;
            [state.L, state.W, state.H] = pos.box.s.map((v) => v.toFixed(3));
            L.value = state.L; W.value = state.W; H.value = state.H;
          }
        }, '⤵ Lấy');

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
        }, '⇩ Chạm đất');

        const openC2Btn = h('button', { onclick: () => app.switchTab('case2', t.id) }, 'Mở Case 2 →');

        tbody.append(h('tr', { style: { borderBottom: '1px solid #21262d' } },
          h('td', { style: { padding: '8px 10px', fontWeight: 600 } }, `#${t.uiId}`),
          h('td', { style: { padding: '8px 10px', color: store.labelColor(t.labelId) } }, store.labelName(t.labelId)),
          h('td', { style: { padding: '8px 10px' } }, `f${t.firstFrame} → f${t.lastFrame}`),
          h('td', { style: { padding: '8px 10px' } }, String(t.shapes.length)),
          h('td', { style: { padding: '8px 10px' } },
            med.map((v) => fmt(v)).join(' / '),
            varies ? h('span', { style: { marginLeft: '6px', color: '#e3b341', fontSize: '11px', background: '#3b2300', padding: '1px 5px', borderRadius: '4px' } }, '⚠️ lệch') : null
          ),
          h('td', { style: { padding: '8px 10px' } }, L),
          h('td', { style: { padding: '8px 10px' } }, W),
          h('td', { style: { padding: '8px 10px' } }, H),
          h('td', { style: { padding: '8px 10px' } }, fromFrame, ' ', pickBtn),
          h('td', { style: { padding: '8px 10px', display: 'flex', gap: '4px' } }, applyBtn, snapBtn, openC2Btn),
        ));
      }
    }

    render();
    return { refresh: render, unmount() {} };
  }

  (SP.pendingTabs ||= []).push(['case1', { title: 'Case 1 · Sửa L/W/H', mount }]);
})();
