// case2.js - Tab Case 2: Duyệt danh sách Frame, Thao tác hàng loạt (Batch Shift), Nội suy chọn lọc & Ghost Frames
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});
  const G = SP.geom;

  const CSS = `
    .c2-head, .c2-row { display: grid; grid-template-columns: 220px var(--img-col) 1fr 1fr 1fr; gap: 4px; }
    .c2-head { padding: 6px 10px; background: #161b22; border-bottom: 1px solid #30363d; font-weight: 600; font-size: 12px; }
    .c2-wrap { position: relative; flex: 1; min-height: 0; }
    .c2-scroll { position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden; padding: 6px; }
    .c2-row { height: var(--row-h); margin-bottom: 6px; }
    .c2-row.sel .c2-info { outline: 2px solid #1f6feb; background: #1a2332; }
    .c2-info { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 8px; display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
    .c2-info .head { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    .c2-info .grid { display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 3px 6px; align-items: center; font-size: 11px; }
    .c2-info input[type=number] { width: 100%; padding: 2px 4px; font-size: 11px; }
    .c2-info .btns { display: flex; flex-wrap: wrap; gap: 4px; margin-top: auto; }
    .c2-img { background: #000; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: zoom-in; color: #666; font-size: 11px; }
    .c2-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .c2-view { position: relative; border-radius: 4px; background: transparent; touch-action: none; user-select: none; outline: 1px solid #21262d; }
    .c2-view:hover { outline-color: #388bfd; }
    .vtools { position: absolute; top: 4px; right: 4px; display: flex; gap: 3px; opacity: 0; transition: opacity .15s; }
    .c2-view:hover .vtools { opacity: 1; }
    .vtools button { padding: 2px 6px; font-size: 11px; background: rgba(33, 38, 45, 0.9); color: #c9d1d9; border: 1px solid #30363d; border-radius: 4px; }
    .vtools button:hover { background: #388bfd; color: #fff; }
    .kf { font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 10px; background: #238636; color: #fff; }
    .kf.interp { background: #30363d; color: #8b949e; }
    .batch-bar { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: #1c2738; border-bottom: 1px solid #388bfd; font-size: 12px; color: #58a6ff; flex-wrap: wrap; }
    .interp-modal { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; width: 340px; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
    .interp-modal label { display: flex; align-items: center; gap: 8px; margin: 8px 0; font-size: 13px; color: #c9d1d9; cursor: pointer; }
  `;

  function mount(app, root, initialTrackId) {
    const { h, fmt } = SP.ui;
    const store = app.store;
    const frameData = app.getFrames();
    const tracks = [...store.tracks.values()].sort((a, b) => a.uiId - b.uiId);

    const S = (app.settings.case2 ||= {
      zoom: { top: 1, side: 1, front: 1 }, pointSize: 2, slab: 1, hideGround: false, allowTilt: false,
      context: true, syncSize: false, rowH: 220, showImage: true, minIntensity: 0.0, ghost: false, densify: false,
    });

    root.append(h('style', {}, CSS));
    if (!tracks.length) {
      root.append(h('div', { class: 'bar', style: { color: '#8b949e' } }, 'Job này không có track cuboid nào.'));
      return { unmount() {} };
    }

    let track = store.track(initialTrackId) || tracks[0];
    let grid = null;
    let rows = new Map();
    let selectedFrames = new Set();
    let lastSelectedFrame = null;
    let startDragBoxes = new Map();
    const settings = { ...S, refSize: [1, 1, 1], color: '#3fb950' };

    // ---------- Thanh công cụ trên ----------
    const trackSel = h('select', { onchange: () => openTrack(store.track(Number(trackSel.value))) },
      tracks.map((t) => h('option', { value: t.id }, `#${t.uiId} · ${store.labelName(t.labelId)} (f${t.firstFrame}–f${t.lastFrame})`)));
    const fromIn = h('input', { type: 'number', style: { width: '55px' } });
    const toIn = h('input', { type: 'number', style: { width: '55px' } });

    const pfill = h('div', { style: { height: '100%', background: '#238636', width: '0%', transition: 'width 0.2s' } });
    const ptext = h('span', { style: { position: 'absolute', inset: 0, textAlign: 'center', fontSize: '11px', lineHeight: '18px', color: '#fff' } });
    const pbar = h('div', { style: { position: 'relative', width: '200px', height: '18px', background: '#21262d', border: '1px solid #30363d', borderRadius: '9px', overflow: 'hidden' }, hidden: true }, pfill, ptext);

    const check = (key, text, title, after) => h('label', { title, style: { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' } },
      h('input', { type: 'checkbox', checked: !!S[key], onchange: (e) => { S[key] = e.target.checked; settings[key] = S[key]; after?.(); renderAll(); } }), text);

    const batchBar = h('div', { class: 'batch-bar', hidden: true });
    const head = h('div', { class: 'c2-head' }, h('span', {}, 'Thông tin Track & Frame'), h('span', {}, 'Camera'), h('span', {}, 'Top View'), h('span', {}, 'Side View'), h('span', {}, 'Front View'));
    const scroller = h('div', { class: 'c2-scroll' });
    const wrap = h('div', { class: 'c2-wrap' }, scroller);

    function applyLayout() {
      root.style.setProperty('--row-h', `${S.rowH}px`);
      root.style.setProperty('--img-col', S.showImage ? '1.15fr' : '0px');
      grid?.resize();
    }

    root.append(
      h('div', { class: 'bar', style: { gap: '10px' } },
        h('label', { style: { fontWeight: 600 } }, 'ID:', trackSel),
        h('label', {}, 'Frame:', fromIn, '→', toIn),
        h('button', { onclick: () => buildRows() }, 'Lọc'),
        check('ghost', '👻 Ghost Frames (G)', 'Xem bóng ma và điểm laser frame liền kề để so khớp', () => { grid.ghostFrames = S.ghost; }),
        check('densify', '✨ Gom Điểm (D)', 'Gom điểm laser qua các frame lân cận để thấy rõ dáng xe', () => { grid.densify = S.densify; }),
        check('syncSize', 'Khóa & Đồng bộ L/W/H', 'Giữ nguyên kích thước chuẩn xe không đổi khi điều chỉnh'),
        h('label', { title: 'Lọc các điểm có cường độ phản xạ thấp' }, 'Lọc nhiễu:',
          h('input', { type: 'range', min: '0', max: '0.8', step: '0.05', value: S.minIntensity,
            oninput: (e) => { S.minIntensity = Number(e.target.value); settings.minIntensity = S.minIntensity; renderAll(); } })),
        h('button', { onclick: selectAllKeyframes, title: 'Chọn nhanh tất cả keyframe của track' }, 'Chọn Keyframes'),
        pbar
      ),
      batchBar,
      head,
      wrap
    );
    applyLayout();

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

    const ghostCache = new Map();
    function getGhostData(frame) {
      if (!S.ghost) return null;
      const curPos = track.at(frame);
      if (!curPos) return null;

      const cacheKey = `${track.id}:${frame}:${curPos.box.c.join(',')}`;
      if (ghostCache.has(cacheKey)) return ghostCache.get(cacheKey);

      const res = { prev: null, next: null };

      // Frame t - 1
      const prevPos = track.at(frame - 1);
      if (prevPos) {
        res.prev = { box: prevPos.box, points: null };
        const cloudPrev = frameData.clouds.get(frame - 1);
        if (cloudPrev && cloudPrev.xyz) {
          const inside = G.getPointsInsideBox(cloudPrev.xyz, prevPos.box);
          if (inside.length) {
            res.prev.points = G.transformPointsBetweenBoxes(inside, prevPos.box, curPos.box);
          }
        }
      }

      // Frame t + 1
      const nextPos = track.at(frame + 1);
      if (nextPos) {
        res.next = { box: nextPos.box, points: null };
        const cloudNext = frameData.clouds.get(frame + 1);
        if (cloudNext && cloudNext.xyz) {
          const inside = G.getPointsInsideBox(cloudNext.xyz, nextPos.box);
          if (inside.length) {
            res.next.points = G.transformPointsBetweenBoxes(inside, nextPos.box, curPos.box);
          }
        }
      }

      ghostCache.set(cacheKey, res);
      return res;
    }

    const densifyCache = new Map();
    function getDensifiedPoints(frame) {
      if (!S.densify) return null;
      const curPos = track.at(frame);
      if (!curPos) return null;

      const cacheKey = `${track.id}:${frame}:${curPos.box.c.join(',')}`;
      if (densifyCache.has(cacheKey)) return densifyCache.get(cacheKey);

      const allDense = [];
      const windowRadius = 3; // Gom qua 7 frames: t-3 đến t+3
      for (let f = frame - windowRadius; f <= frame + windowRadius; f++) {
        if (f === frame) continue;
        const otherPos = track.at(f);
        const otherCloud = frameData.clouds.get(f);
        if (otherPos && otherCloud && otherCloud.xyz) {
          const inside = G.getPointsInsideBox(otherCloud.xyz, otherPos.box);
          if (inside.length) {
            const transformed = G.transformPointsBetweenBoxes(inside, otherPos.box, curPos.box);
            for (let i = 0; i < transformed.length; i++) allDense.push(transformed[i]);
          }
        }
      }
      const arr = new Float32Array(allDense);
      densifyCache.set(cacheKey, arr);
      return arr;
    }

    // ---------- 1. NỘI SUY CHỌN LỌC (Selective Interpolation Modal) ----------
    function openSelectiveInterpModal(minF, maxF) {
      const overlay = h('div', { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' } });
      const posCheck = h('input', { type: 'checkbox', checked: true });
      const sizeLockCheck = h('input', { type: 'checkbox', checked: true }); // Mặc định KHÓA kích thước
      const yawCheck = h('input', { type: 'checkbox', checked: true });

      const applyBtn = h('button', {
        class: 'primary',
        onclick: () => {
          track.interpolateRange(minF, maxF, {
            interpPos: posCheck.checked,
            interpSize: !sizeLockCheck.checked, // nếu khóa thì không nội suy kích thước
            interpYaw: yawCheck.checked,
          });
          overlay.remove();
          afterEdit();
          app.setStatus(`Đã nội suy chọn lọc đoạn f${minF} → f${maxF} (Khóa Size: ${sizeLockCheck.checked ? 'BẬT' : 'TẮT'})`, 'ok');
        }
      }, 'Thực Hiện Nội Suy');

      const closeBtn = h('button', { onclick: () => overlay.remove() }, 'Hủy');

      const modal = h('div', { class: 'interp-modal' },
        h('div', { style: { fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '12px' } }, `⚡ Nội suy chọn lọc: f${minF} → f${maxF}`),
        h('div', { style: { fontSize: '12px', color: '#8b949e', marginBottom: '10px' } }, 'Chọn các thành phần bạn muốn nội suy lại giữa 2 mốc keyframe đầu và cuối:'),
        h('label', {}, posCheck, 'Nội suy Quỹ đạo Vị trí (X, Y, Z) mượt mà'),
        h('label', {}, sizeLockCheck, h('b', { style: { color: '#58a6ff' } }, '🔒 Khóa cứng Kích thước (L, W, H) - Xe không méo')),
        h('label', {}, yawCheck, 'Nội suy Góc quay Yaw (Đường ngắn nhất)'),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' } }, closeBtn, applyBtn)
      );

      overlay.append(modal);
      document.body.append(overlay);
    }

    // ---------- 2. THAO TÁC HÀNG LOẠT (Batch Operations Bar) ----------
    function updateBatchBar() {
      if (selectedFrames.size <= 1) {
        batchBar.hidden = true;
        return;
      }
      batchBar.hidden = false;
      batchBar.replaceChildren();

      const sorted = [...selectedFrames].sort((a, b) => a - b);
      const minF = sorted[0];
      const maxF = sorted[sorted.length - 1];

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
        style: { background: '#1f6feb', color: '#fff', fontWeight: 600 },
        onclick: () => openSelectiveInterpModal(minF, maxF)
      }, '⚡ Nội suy đoạn này');

      const removeKfBtn = h('button', {
        title: 'Xóa keyframe của các frame đã chọn để tự động nội suy',
        onclick: () => {
          track.removeKeyframesBatch([...selectedFrames]);
          afterEdit();
          app.setStatus(`Đã xóa keyframe cho ${selectedFrames.size} frames`, 'ok');
        }
      }, '🗑 Xóa Keyframe');

      const makeKfBtn = h('button', {
        title: 'Chốt vị trí hiện tại thành keyframe cố định',
        onclick: () => {
          track.createKeyframesBatch([...selectedFrames]);
          afterEdit();
          app.setStatus(`Đã chốt keyframe cho ${selectedFrames.size} frames`, 'ok');
        }
      }, '⭐ Chốt Keyframe');

      const flipBtn = h('button', {
        onclick: () => {
          track.flipHeadingBatch([...selectedFrames]);
          afterEdit();
          app.setStatus(`Đã đảo chiều đầu xe 180° cho ${selectedFrames.size} frames`, 'ok');
        }
      }, '🔄 Đảo 180° (R)');

      const snapGroundBtn = h('button', {
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
      }, '⇩ Đất (F)');

      batchBar.append(
        h('span', { style: { fontWeight: 700 } }, `Đang chọn ${selectedFrames.size} frames (f${minF} → f${maxF}):`),
        h('label', {}, 'ΔX:', dxIn),
        h('label', {}, 'ΔY:', dyIn),
        h('label', {}, 'ΔZ:', dzIn),
        applyShiftBtn,
        interpBtn,
        makeKfBtn,
        removeKfBtn,
        snapGroundBtn,
        flipBtn,
        h('button', { onclick: () => { selectedFrames.clear(); lastSelectedFrame = null; updateSelectionUI(); } }, '✕ Bỏ chọn')
      );
    }

    function selectAllKeyframes() {
      selectedFrames.clear();
      for (const sh of track.shapes) {
        selectedFrames.add(sh.frame);
      }
      updateSelectionUI();
    }

    // ---------- 3. RANGE SELECTION (Shift+Click như Excel/Explorer) ----------
    function handleRowClick(frame, e) {
      const from = Number(fromIn.value) || store.frames[0];
      const to = Number(toIn.value) || store.frames[store.frames.length - 1];
      const list = store.frames.filter((f) => f >= from && f <= to);

      if (e.shiftKey && lastSelectedFrame !== null) {
        const idxA = list.indexOf(lastSelectedFrame);
        const idxB = list.indexOf(frame);
        if (idxA >= 0 && idxB >= 0) {
          const start = Math.min(idxA, idxB);
          const end = Math.max(idxA, idxB);
          for (let i = start; i <= end; i++) {
            selectedFrames.add(list[i]);
          }
        }
      } else if (e.ctrlKey || e.metaKey) {
        if (selectedFrames.has(frame)) selectedFrames.delete(frame);
        else selectedFrames.add(frame);
        lastSelectedFrame = frame;
      } else {
        selectedFrames.clear();
        selectedFrames.add(frame);
        lastSelectedFrame = frame;
      }
      updateSelectionUI();
    }

    function updateSelectionUI() {
      for (const [f, r] of rows.entries()) {
        r.el.classList.toggle('sel', selectedFrames.has(f));
      }
      updateBatchBar();
    }

    function afterEdit() {
      for (const r of rows.values()) r.refresh();
      renderAll();
      app.changed();
    }

    // ---------- 4. DỰNG TỪNG DÒNG FRAME ----------
    function buildRow(frame) {
      const el = h('div', { class: 'c2-row', 'data-frame': frame });
      const info = h('div', { class: 'c2-info' });
      const imgBox = h('div', { class: 'c2-img' }, 'Đang tải ảnh…');
      const vTop = h('div', { class: 'c2-view' });
      const vSide = h('div', { class: 'c2-view' });
      const vFront = h('div', { class: 'c2-view' });

      el.append(info, imgBox, vTop, vSide, vFront);
      el.addEventListener('click', (e) => handleRowClick(frame, e));

      function refresh() {
        info.replaceChildren();
        const pos = track.at(frame);
        if (!pos) return;

        const kfBadge = h('span', { class: `kf ${pos.keyframe ? '' : 'interp'}` }, pos.keyframe ? 'Keyframe' : 'Nội suy');

        let overlapBadge = null;
        if (SP.iou3d) {
          const ovs = SP.iou3d.findFrameOverlaps(store, frame, 0.25)
            .filter((o) => o.trackA.id === track.id || o.trackB.id === track.id);
          if (ovs.length) {
            const other = ovs[0].trackA.id === track.id ? ovs[0].trackB : ovs[0].trackA;
            const pct = Math.round(ovs[0].maxOverlapRatio * 100);
            overlapBadge = h('span', {
              style: { background: '#da3633', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', cursor: 'pointer' },
              title: `Trùng ${pct}% với Track #${other.uiId}! Bấm để mở tab Overlap Inspector`,
              onclick: (e) => { e.stopPropagation(); app.switchTab('case3'); }
            }, `⚠️ Đè #${other.uiId} (${pct}%)`);
          }
        }

        const flipBtn = h('button', {
          title: 'Đảo ngược đầu xe 180° tức thì (Phím R)',
          onclick: (e) => {
            e.stopPropagation();
            track.snapshot();
            const b = G.cloneBox(pos.box);
            b.r = G.quickFlipHeading(b.r);
            track.setBox(frame, b);
            afterEdit();
          }
        }, '🔄 180°');

        const snapBtn = h('button', {
          title: 'Hút đáy box chạm đất (Phím F)',
          onclick: async (e) => {
            e.stopPropagation();
            const cloud = await frameData.cloud(frame);
            const res = G.snapToGround(cloud.xyz, pos.box);
            if (res) {
              track.snapshot();
              track.setBox(frame, res.box);
              afterEdit();
              app.setStatus(`f${frame}: Đã hút đáy box chạm mặt đất`, 'ok');
            } else {
              app.setStatus(`f${frame}: Không đủ điểm mặt đất`, 'err');
            }
          }
        }, '⇩ Đất');

        info.append(
          h('div', { class: 'head' }, h('b', {}, `Frame ${frame}`), kfBadge, overlapBadge),
          h('div', { class: 'grid' },
            h('span', {}, 'X:'), h('span', {}, fmt(pos.box.c[0])),
            h('span', {}, 'L:'), h('span', {}, fmt(pos.box.s[0])),
            h('span', {}, 'Y:'), h('span', {}, fmt(pos.box.c[1])),
            h('span', {}, 'W:'), h('span', {}, fmt(pos.box.s[1])),
            h('span', {}, 'Z:'), h('span', {}, fmt(pos.box.c[2])),
            h('span', {}, 'H:'), h('span', {}, fmt(pos.box.s[2]))
          ),
          h('div', { class: 'btns' }, flipBtn, snapBtn)
        );
      }

      refresh();
      return { el, views: [vTop, vSide, vFront], refresh };
    }

    function buildRows() {
      const from = Number(fromIn.value) || store.frames[0];
      const to = Number(toIn.value) || store.frames[store.frames.length - 1];
      grid?.clearCells();
      rows = new Map();
      selectedFrames.clear();
      lastSelectedFrame = null;
      updateBatchBar();
      scroller.replaceChildren();

      const list = store.frames.filter((f) => f >= from && f <= to);
      for (const frame of list) {
        const r = buildRow(frame);
        rows.set(frame, r);
        scroller.append(r.el);
        ['top', 'side', 'front'].forEach((v, i) => grid.addCell(r.views[i], frame, v));
      }
      renderAll();

      pbar.hidden = false;
      frameData.preload(list, (p) => {
        pfill.style.width = `${Math.round(p.fraction * 100)}%`;
        ptext.textContent = `Tải point cloud ${Math.round(p.fraction * 100)}%…`;
        if (p.done >= p.total) setTimeout(() => { pbar.hidden = true; }, 500);
        renderAll();
      });
    }

    function openTrack(t) {
      track = t;
      trackSel.value = String(t.id);
      settings.refSize = refSizeOf(t);
      settings.color = store.labelColor(t.labelId);
      fromIn.value = Math.max(t.firstFrame, store.frames[0]);
      toIn.value = store.frames[store.frames.length - 1];

      grid?.destroy();
      grid = new SP.GridView({
        wrap,
        scroller,
        settings,
        getCloud,
        getBox: (frame) => track.at(frame),
        getGhostData,
        getDensifiedPoints,
        onEditStart: (frame) => {
          track.snapshot();
          startDragBoxes = new Map();
          if (selectedFrames.has(frame) && selectedFrames.size > 1) {
            for (const f of selectedFrames) {
              const p = track.at(f);
              if (p) startDragBoxes.set(f, G.cloneBox(p.box));
            }
          }
        },
        // Kéo chuột tịnh tiến hàng loạt (Real-Time Batch Drag) khi đang chọn nhiều frame!
        onEdit: (frame, box) => {
          if (selectedFrames.has(frame) && selectedFrames.size > 1 && startDragBoxes.has(frame)) {
            const originBox = startDragBoxes.get(frame);
            const dx = box.c[0] - originBox.c[0];
            const dy = box.c[1] - originBox.c[1];
            const dz = box.c[2] - originBox.c[2];

            for (const f of selectedFrames) {
              const orig = startDragBoxes.get(f);
              if (!orig) continue;
              const b = G.cloneBox(orig);
              b.c[0] += dx;
              b.c[1] += dy;
              b.c[2] += dz;
              // Nếu đang chỉnh kích thước thì đồng bộ kích thước
              b.s = box.s.slice();
              track.setBox(f, b);
              rows.get(f)?.refresh();
            }
          } else {
            track.setBox(frame, box);
            rows.get(frame)?.refresh();
          }
          renderAll();
        },
        onEditEnd: () => {
          startDragBoxes.clear();
          afterEdit();
        },
      });
      grid.ghostFrames = S.ghost;
      grid.densify = S.densify;
      buildRows();
    }

    openTrack(track);

    return {
      refresh() {
        for (const r of rows.values()) r.refresh();
        renderAll();
      },
      onKey(e) {
        const k = e.key.toLowerCase();
        if (k === 'g') {
          S.ghost = !S.ghost;
          grid.ghostFrames = S.ghost;
          renderAll();
          app.setStatus(`Ghost Frames: ${S.ghost ? 'BẬT' : 'TẮT'}`, 'ok');
        } else if (k === 'd') {
          S.densify = !S.densify;
          grid.densify = S.densify;
          renderAll();
          app.setStatus(`Gom điểm đa frame: ${S.densify ? 'BẬT' : 'TẮT'}`, 'ok');
        } else if (k === 'r' && selectedFrames.size) {
          track.flipHeadingBatch([...selectedFrames]);
          afterEdit();
          app.setStatus(`Đã đảo chiều đầu xe 180° cho ${selectedFrames.size} frames`, 'ok');
        } else if (k === 'f' && selectedFrames.size) {
          (async () => {
            for (const f of selectedFrames) {
              const cloud = await frameData.cloud(f);
              const pos = track.at(f);
              if (pos) {
                const res = G.snapToGround(cloud.xyz, pos.box);
                if (res) track.setBox(f, res.box);
              }
            }
            afterEdit();
            app.setStatus(`Đã hút đáy chạm đất cho các frame đã chọn`, 'ok');
          })();
        }
      },
      unmount() {
        grid?.destroy();
        grid = null;
      },
    };
  }

  (SP.pendingTabs ||= []).push(['case2', { title: 'Case 2 · Duyệt Frame & Batch Shift', mount }]);
})();
