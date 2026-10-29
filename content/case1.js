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

  // Thuật toán quét và gom cụm các dải frame liên tiếp có cùng kích thước
  function computeSizeSegments(track) {
    if (!track || !track.shapes || !track.shapes.length) return [];
    const segments = [];
    let currentSeg = null;

    for (const shape of track.shapes) {
      if (shape.outside) continue;
      const size = [shape.points[6], shape.points[7], shape.points[8]];
      if (!currentSeg) {
        currentSeg = {
          startFrame: shape.frame,
          endFrame: shape.frame,
          count: 1,
          size: size.slice(),
          keyframes: [shape.frame]
        };
      } else {
        const isSame = [0, 1, 2].every((i) => Math.abs(size[i] - currentSeg.size[i]) <= 0.008);
        if (isSame) {
          currentSeg.endFrame = shape.frame;
          currentSeg.count++;
          currentSeg.keyframes.push(shape.frame);
        } else {
          segments.push(currentSeg);
          currentSeg = {
            startFrame: shape.frame,
            endFrame: shape.frame,
            count: 1,
            size: size.slice(),
            keyframes: [shape.frame]
          };
        }
      }
    }
    if (currentSeg) segments.push(currentSeg);

    const totalCount = segments.reduce((acc, s) => acc + s.count, 0);
    let maxCount = -1;
    let majorityIdx = -1;
    segments.forEach((seg, idx) => {
      seg.percent = totalCount > 0 ? Math.round((seg.count / totalCount) * 100) : 0;
      if (seg.count > maxCount) {
        maxCount = seg.count;
        majorityIdx = idx;
      }
    });
    if (majorityIdx >= 0) {
      segments[majorityIdx].isMajority = true;
    }
    return segments;
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
        if (app.currentTab === 'case1') app.switchTab('case1');
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

    function openSizeBreakdownModal(track, segments, onPick, onApplyMajority) {
      const overlay = h('div', {
        style: {
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(3px)', zIndex: 2147483020,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
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

      const title = h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #303030', paddingBottom: '8px' } },
        h('span', { style: { color: '#fff', fontSize: '13px', fontWeight: 600 } }, `Phân đoạn biến thiên kích thước · Track #${track.uiId}`),
        h('button', {
          style: { background: 'transparent', border: 0, color: '#8c8c8c', cursor: 'pointer', padding: '0 4px', display: 'inline-flex', alignItems: 'center' },
          title: 'Đóng', onclick: modalClose
        }, SP.icons.close(14))
      );

      const majoritySeg = segments.find((s) => s.isMajority) || segments[0];

      const rowsEl = segments.map((seg, idx) => {
        const isMaj = !!seg.isMajority;
        const diffL = seg.size[0] - majoritySeg.size[0];
        const diffW = seg.size[1] - majoritySeg.size[1];
        const diffH = seg.size[2] - majoritySeg.size[2];

        const pickThisBtn = h('button', {
          class: 'small',
          style: { padding: '2px 8px', fontSize: '11px' },
          onclick: () => {
            onPick(seg.size);
            modalClose();
            app.setStatus(`Đã chọn kích thước đoạn f${seg.startFrame}→f${seg.endFrame} cho Track #${track.uiId}`, 'ok');
          }
        }, 'Lấy mẫu này');

        const jumpBtn = h('button', {
          class: 'small',
          style: { padding: '2px 6px', fontSize: '11px', color: '#8c8c8c' },
          title: `Nhảy tới Frame ${seg.startFrame} trên CVAT`,
          onclick: () => {
            SP.bridge.changeFrame(seg.startFrame);
          }
        }, `Nhảy f${seg.startFrame}`);

        return h('div', {
          style: {
            background: isMaj ? 'rgba(82, 196, 26, 0.08)' : '#141414',
            border: isMaj ? '1px solid #274916' : '1px solid #262626',
            borderRadius: '3px',
            padding: '8px 10px',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }
        },
          h('div', {},
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' } },
              h('span', { style: { fontWeight: 600, color: '#fff', fontSize: '12px' } }, `Đoạn ${idx + 1}: f${seg.startFrame} → f${seg.endFrame}`),
              h('span', { style: { fontSize: '11px', color: '#8c8c8c' } }, `(${seg.count} keyframes · ${seg.percent}%)`),
              isMaj
                ? h('span', { style: { color: '#52c41a', background: 'rgba(82,196,26,0.15)', border: '1px solid rgba(82,196,26,0.3)', padding: '0 5px', borderRadius: '2px', fontSize: '10px', fontWeight: 600 } }, 'ĐA SỐ · KHUYÊN DÙNG')
                : h('span', { style: { color: '#faad14', fontSize: '10px' } }, `Lệch: ${diffL >= 0 ? '+' : ''}${diffL.toFixed(2)}m / ${diffW >= 0 ? '+' : ''}${diffW.toFixed(2)}m / ${diffH >= 0 ? '+' : ''}${diffH.toFixed(2)}m`)
            ),
            h('div', { style: { fontFamily: 'monospace', fontSize: '11px', color: '#bfbfbf' } },
              `Kích thước: ${seg.size[0].toFixed(3)} × ${seg.size[1].toFixed(3)} × ${seg.size[2].toFixed(3)} m (D × R × C)`
            )
          ),
          h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
            jumpBtn,
            pickThisBtn
          )
        );
      });

      const applyMajBtn = h('button', {
        class: 'primary',
        style: { padding: '6px 14px', fontSize: '12px' },
        onclick: async () => {
          modalClose();
          await onApplyMajority(majoritySeg.size);
        }
      }, `Đồng bộ toàn bộ Track về kích thước Đa số (${majoritySeg.size.map(v => v.toFixed(2)).join('×')}m)`);

      const modal = h('div', {
        style: {
          width: '560px', maxWidth: '95vw', background: '#1f1f1f', border: '1px solid #303030',
          borderRadius: '4px', padding: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.55)'
        }
      },
        title,
        h('div', { style: { fontSize: '12px', color: '#8c8c8c', marginBottom: '12px' } },
          `Track #${track.uiId} phát hiện có ${segments.length} phân đoạn kích thước khác nhau. Chi tiết các dải frame:`
        ),
        h('div', { style: { maxHeight: '320px', overflowY: 'auto', marginBottom: '14px' } }, rowsEl),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #303030', paddingTop: '12px' } },
          h('button', { style: { padding: '6px 12px', fontSize: '12px' }, onclick: modalClose }, 'Đóng (Esc)'),
          applyMajBtn
        )
      );

      overlay.onclick = (e) => { if (e.target === overlay) modalClose(); };
      overlay.append(modal);
      root.append(overlay);
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
            varies ? h('button', {
              class: 'small',
              style: {
                marginLeft: '6px',
                color: '#faad14',
                fontSize: '10px',
                background: 'rgba(250, 173, 20, 0.12)',
                border: '1px solid rgba(250, 173, 20, 0.4)',
                padding: '1px 5px',
                borderRadius: '2px',
                cursor: 'pointer'
              },
              title: 'Bấm để xem chi tiết từ frame nào đến frame nào có kích thước A, B và đồng bộ 1-click',
              onclick: () => {
                const segs = computeSizeSegments(t);
                openSizeBreakdownModal(t, segs, (pickedSize) => {
                  [state.L, state.W, state.H] = pickedSize.map((v) => v.toFixed(3));
                  L.value = state.L; W.value = state.W; H.value = state.H;
                }, async (majoritySize) => {
                  [state.L, state.W, state.H] = majoritySize.map((v) => v.toFixed(3));
                  L.value = state.L; W.value = state.W; H.value = state.H;
                  applyBtn.disabled = true;
                  try { await apply(t, majoritySize); } finally { applyBtn.disabled = false; }
                });
              }
            }, 'Biến thiên ℹ') : null
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
