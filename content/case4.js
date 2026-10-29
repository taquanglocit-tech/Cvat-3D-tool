// case4.js - Tab Case 4: Trình Theo Dõi Ảnh 2D Liên Tục (0ms RAM Cache) & Dò Tìm Tách ID (Split ID Detector)
// Giúp nạp sẵn ảnh 2D vào RAM, giữ cố định vùng Zoom/Pan qua các frame để theo dõi người/xe và phát hiện đứt/tách Track ID
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});
  const { h, fmt } = SP.ui;
  const G = SP.geom;

  const CSS = `
    .c4-wrap {
      display: grid;
      grid-template-columns: 1.55fr 1fr;
      gap: 10px;
      padding: 8px 10px;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      background: #141414;
      color: #d9d9d9;
    }
    .c4-left, .c4-right {
      display: flex;
      flex-direction: column;
      min-height: 0;
      background: #1f1f1f;
      border: 1px solid #303030;
      border-radius: 4px;
      overflow: hidden;
    }
    .c4-subbar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      background: #262626;
      border-bottom: 1px solid #303030;
      flex-wrap: wrap;
      font-size: 11px;
    }
    .c4-group {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 7px;
      background: #191919;
      border: 1px solid #2e2e2e;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .c4-playback-group {
      display: inline-flex;
      align-items: center;
      background: #141414;
      border: 1px solid #383838;
      border-radius: 4px;
      padding: 1px;
      gap: 1px;
      flex-shrink: 0;
    }
    .c4-playback-group button {
      background: transparent;
      border: none;
      border-radius: 2px;
      padding: 2px 8px;
      font-size: 11px;
      color: #d9d9d9;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .c4-playback-group button:hover:not(:disabled) {
      background: #2a2a2a;
      color: #fff;
    }
    .c4-playback-group button.primary {
      background: #177ddc;
      color: #fff;
    }
    .c4-playback-group button.primary:hover:not(:disabled) {
      background: #3c9ae8;
    }
    .c4-kbd {
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
      margin-left: 3px;
      user-select: none;
    }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #303030; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #434343; }
    .c4-stage {
      position: relative;
      flex: 1;
      min-height: 140px;
      background: #090b0e;
      overflow: hidden;
      cursor: grab;
      user-select: none;
      touch-action: none;
    }
    .c4-stage.dragging {
      cursor: grabbing;
    }
    .c4-stage canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }
    .c4-hud-top {
      position: absolute;
      top: 8px;
      left: 8px;
      right: 8px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      pointer-events: none;
      gap: 8px;
      z-index: 2;
    }
    .c4-pill {
      background: rgba(20, 20, 20, 0.86);
      border: 1px solid #434343;
      border-radius: 3px;
      padding: 3px 8px;
      font-size: 11px;
      color: #fff;
      backdrop-filter: blur(4px);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .c4-filmstrip {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      padding: 5px 6px;
      background: #141414;
      border-top: 1px solid #303030;
      height: 74px;
      flex-shrink: 0;
    }
    .c4-thumb {
      position: relative;
      background: #050709;
      border: 1px solid #303030;
      border-radius: 3px;
      overflow: hidden;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .c4-thumb:hover {
      border-color: #177ddc;
    }
    .c4-thumb.active {
      border: 2px solid #40a9ff;
      box-shadow: 0 0 8px rgba(23, 125, 220, 0.45);
    }
    .c4-thumb canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
    .c4-thumb-lbl {
      position: absolute;
      bottom: 2px;
      left: 3px;
      right: 3px;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      font-weight: 600;
      color: #fff;
      background: rgba(0, 0, 0, 0.68);
      padding: 0 4px;
      border-radius: 2px;
      pointer-events: none;
      font-variant-numeric: tabular-nums;
    }
    .c4-controls {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: #1f1f1f;
      border-top: 1px solid #303030;
      flex-wrap: wrap;
    }
    .c4-scrubber-wrap {
      position: relative;
      flex: 1;
      min-width: 140px;
      display: flex;
       flex-direction: column;
      gap: 2px;
    }
    .c4-cache-bar {
      width: 100%;
      height: 5px;
      border-radius: 2px;
      background: #141414;
      border: 1px solid #303030;
      overflow: hidden;
      display: block;
    }
    .c4-right-body {
      flex: 1;
      overflow: auto;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .c4-card {
      background: #141414;
      border: 1px solid #303030;
      border-left: 3px solid #faad14;
      border-radius: 3px;
      padding: 7px 9px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      transition: border-color 0.15s, background 0.15s;
    }
    .c4-card:hover {
      border-color: #177ddc;
      background: #1a1d21;
    }
    .c4-card.selected {
      border-color: #40a9ff;
      border-left: 3px solid #40a9ff;
      background: rgba(23, 125, 220, 0.12);
    }
    .c4-card.high-prob {
      border-left-color: #ff4d4f;
    }
    .c4-tab-btn {
      background: #141414;
      border: 1px solid #434343;
      color: #8c8c8c;
      padding: 2px 8px;
      font-size: 11px;
      border-radius: 3px;
      cursor: pointer;
    }
    .c4-tab-btn.active {
      background: #177ddc;
      color: #fff;
      border-color: #177ddc;
    }
  `;

  const S = {
    camIdx: 0,
    multiCam: false,
    fps: 5,
    syncCvatFrame: false,
    showFilmstrip: true,
    maxGapFrames: 25,
    maxDistM: 6.0,
    sameClassOnly: false,
  };

  // Phân tích các đoạn xuất hiện thực tế của 1 Track để phát hiện điểm bắt đầu & kết thúc
  function getTrackEndpoints(track, allFrames) {
    const shapes = track.shapes || [];
    if (!shapes.length) return [];

    const segments = [];
    let segStart = null;
    let lastActiveFrame = null;

    for (const f of allFrames) {
      if (f < track.firstFrame) continue;
      const pos = track.at(f);
      if (!pos || pos.outside) {
        if (segStart !== null && lastActiveFrame !== null) {
          segments.push({ startFrame: segStart, endFrame: lastActiveFrame, reason: 'outside' });
          segStart = null;
          lastActiveFrame = null;
        }
      } else {
        if (segStart === null) segStart = f;
        lastActiveFrame = f;
      }
    }

    // Nếu tới cuối Job mà vẫn chưa đánh dấu Outside:
    // Kiểm tra xem keyframe thật cuối cùng nằm ở đâu (phòng trường hợp người gán quên bấm Outside ở cuối track)
    const nonOutsideKfs = shapes.filter((s) => !s.outside);
    const lastRealKf = nonOutsideKfs.length ? nonOutsideKfs[nonOutsideKfs.length - 1].frame : track.lastFrame;

    if (segStart !== null && lastActiveFrame !== null) {
      segments.push({
        startFrame: segStart,
        endFrame: lastRealKf,
        tailFrame: lastActiveFrame,
        reason: lastRealKf < allFrames[allFrames.length - 1] ? 'unclosed_kf' : 'job_end',
      });
    }

    return segments;
  }

  // Tính vận tốc trung bình (m/frame) ở cuối đoạn Track A để dự đoán vị trí tiếp theo
  function estimateEndVelocity(track, endFrame, allFrames) {
    const idx = allFrames.indexOf(endFrame);
    if (idx <= 0) return [0, 0, 0];
    const prevIdx = Math.max(0, idx - 3);
    const fPrev = allFrames[prevIdx];
    const dt = endFrame - fPrev;
    if (dt <= 0) return [0, 0, 0];
    const p1 = track.at(fPrev)?.box?.c;
    const p2 = track.at(endFrame)?.box?.c;
    if (!p1 || !p2) return [0, 0, 0];
    return [(p2[0] - p1[0]) / dt, (p2[1] - p1[1]) / dt, (p2[2] - p1[2]) / dt];
  }

  // Quét toàn bộ Job tìm các cặp Track (A -> B) nghi vấn là cùng 1 người/xe bị tách ID
  function findSplitIdCandidates(store, { maxGapFrames = 25, maxDistM = 6.0, sameClassOnly = false } = {}) {
    const allFrames = store.frames || [];
    if (!allFrames.length) return [];
    const tracks = [...store.tracks.values()].sort((a, b) => a.uiId - b.uiId);
    const endpointsByTrack = new Map();
    for (const t of tracks) {
      endpointsByTrack.set(t.id, getTrackEndpoints(t, allFrames));
    }

    const candidates = [];

    for (let i = 0; i < tracks.length; i++) {
      const tA = tracks[i];
      const segsA = endpointsByTrack.get(tA.id) || [];
      if (!segsA.length) continue;

      for (let j = 0; j < tracks.length; j++) {
        if (i === j) continue;
        const tB = tracks[j];
        if (sameClassOnly && tA.labelId !== tB.labelId) continue;

        const segsB = endpointsByTrack.get(tB.id) || [];
        if (!segsB.length) continue;

        for (const sA of segsA) {
          for (const sB of segsB) {
            const endA = sA.endFrame;
            const startB = sB.startFrame;
            // Tránh bắt cặp khi cả 2 cùng xuất phát từ đầu job
            if (startB <= sA.startFrame) continue;

            const gap = startB - endA;
            // Cho phép chồng lấn nhẹ (-5 frame) hoặc ngắt quãng tới maxGapFrames
            if (gap < -5 || gap > maxGapFrames) continue;

            const posA = tA.at(endA);
            const posB = tB.at(startB);
            if (!posA || !posB) continue;

            const cA = posA.box.c;
            const cB = posB.box.c;
            const rawDist = Math.hypot(cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]);

            const velA = estimateEndVelocity(tA, endA, allFrames);
            const predDt = Math.max(0, Math.min(gap, 12));
            const predPos = [
              cA[0] + velA[0] * predDt,
              cA[1] + velA[1] * predDt,
              cA[2] + velA[2] * predDt,
            ];
            const predDist = Math.hypot(cB[0] - predPos[0], cB[1] - predPos[1], cB[2] - predPos[2]);
            const bestDist = Math.min(rawDist, predDist);

            if (bestDist <= maxDistM) {
              const sameClass = tA.labelId === tB.labelId;
              // Điểm ưu tiên càng nhỏ càng đáng ngờ
              const score = bestDist + Math.abs(gap) * 0.18 + (sameClass ? 0 : 1.5);
              candidates.push({
                trackA: tA,
                trackB: tB,
                endFrameA: endA,
                startFrameB: startB,
                gapFrames: gap,
                rawDist,
                predDist,
                bestDist,
                sameClass,
                reasonA: sA.reason,
                score,
              });
            }
          }
        }
      }
    }

    candidates.sort((a, b) => a.score - b.score);
    return candidates;
  }

  function renderNoCamState(root, app) {
    root.replaceChildren();
    root.append(
      h('div', {
        style: {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          background: '#141414',
          color: '#d9d9d9',
          textAlign: 'center',
        }
      },
        h('div', {
          style: {
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'rgba(250, 173, 20, 0.1)',
            border: '1px solid rgba(250, 173, 20, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: '#faad14',
          }
        }, SP.icons.noCamera ? SP.icons.noCamera(32) : null),
        h('h3', { style: { fontSize: '16px', fontWeight: 600, color: '#fff', margin: '0 0 10px 0' } },
          'Dữ liệu LiDAR PCD thuần (Không có ảnh Camera 2D)'
        ),
        h('p', { style: { maxWidth: '580px', color: '#8c8c8c', fontSize: '13px', lineHeight: '1.6', margin: '0 0 24px 0' } },
          'Job này chỉ chứa đám mây điểm 3D (.pcd/.bin) và không có ảnh chụp bối cảnh từ camera (context images). ' +
          'Tab "Theo dõi 2D & Dò Tách ID" cần ảnh camera 2D để đối chiếu thực tế. ' +
          'Bạn hãy chuyển sang Tab 2 (Sửa Chuỗi 3D) để gắn nhãn trên 3 góc chiếu Top / Side / Front kèm tính năng xoay Orbit 3D, ' +
          'hoặc Tab 3 để kiểm tra va chạm (Overlap).'
        ),
        h('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' } },
          h('button', {
            class: 'primary',
            style: { padding: '7px 18px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' },
            onclick: () => app.switchTab('case2')
          }, SP.icons.layers(14), 'Chuyển sang Tab 2: Sửa Chuỗi 3D'),
          h('button', {
            style: { padding: '7px 18px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' },
            onclick: () => app.switchTab('case3')
          }, SP.icons.overlap(14), 'Chuyển sang Tab 3: Kiểm Tra 3D (QA)')
        )
      )
    );
  }

  function mount(app, root, initialArg = null) {
    const store = app.store;
    root.append(h('style', {}, CSS));

    if (!store || !store.meta || !store.frames?.length) {
      root.append(h('div', { class: 'bar', style: { color: '#8c8c8c', padding: '20px' } },
        'Đang kết nối dữ liệu từ CVAT, vui lòng chờ giây lát…'
      ));
      const off = store?.on?.('load', () => {
        off();
        if (app.currentTab === 'case4') app.switchTab('case4', initialArg);
      });
      return { refresh() {}, unmount() { off?.(); } };
    }

    const frameData = app.getFrames();
    if (frameData.hasContextImages === false) {
      renderNoCamState(root, app);
      return { refresh() {}, unmount() {} };
    }

    frameData.checkHasImages().then((hasImgs) => {
      if (!hasImgs && app.currentTab === 'case4') {
        renderNoCamState(root, app);
      }
    });

    const allFrames = store.frames;
    let currentFrame = allFrames[0] || 0;
    let focusedTrackA = null;
    let focusedTrackB = null;
    let rightTab = 'split'; // 'split' | 'tracks'
    let playTimer = null;
    let cancelPreloadFlag = false;
    let isPreloading = false;

    // Khởi tạo từ tham số truyền vào (có thể là số frame hoặc object { frame, trackId })
    if (typeof initialArg === 'number' && allFrames.includes(initialArg)) {
      currentFrame = initialArg;
    } else if (initialArg && typeof initialArg === 'object') {
      if (typeof initialArg.frame === 'number') currentFrame = initialArg.frame;
      if (initialArg.trackId) focusedTrackA = store.track(initialArg.trackId);
    } else if (app.currentTrackId) {
      focusedTrackA = store.track(app.currentTrackId);
      if (focusedTrackA) currentFrame = focusedTrackA.firstFrame;
    }

    // Trạng thái Zoom & Pan cố định xuyên suốt các frame
    let zoom = 1;
    let tx = 0;
    let ty = 0;
    let fitted = true;
    let camNamesKnown = false;

    // ---------- 1. Thanh công cụ nạp đệm RAM (Preload Bar) ----------
    const fromIn = h('input', {
      type: 'number',
      value: Math.max(allFrames[0], currentFrame - 15),
      min: allFrames[0],
      max: allFrames[allFrames.length - 1],
      style: { width: '58px' }
    });
    const toIn = h('input', {
      type: 'number',
      value: Math.min(allFrames[allFrames.length - 1], currentFrame + 35),
      min: allFrames[0],
      max: allFrames[allFrames.length - 1],
      style: { width: '58px' }
    });

    const camSel = h('select', {
      title: 'Chọn góc Camera để theo dõi liên tục qua các frame',
      onchange: () => {
        S.camIdx = Number(camSel.value);
        fitted = true;
        renderCurrentFrame();
      }
    }, h('option', { value: 0 }, 'Cam #0'));

    const multiCamChk = h('input', {
      type: 'checkbox',
      checked: S.multiCam,
      onchange: () => {
        S.multiCam = multiCamChk.checked;
        camSel.disabled = S.multiCam;
        fitted = true;
        renderCurrentFrame();
      }
    });

    const preloadBtn = h('button', {
      class: 'primary',
      style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
      title: 'Tải sẵn ảnh 2D của dải frame này vào RAM để lướt qua lại 0ms không cần chờ',
      onclick: () => {
        if (isPreloading) {
          cancelPreloadFlag = true;
          return;
        }
        const f1 = Number(fromIn.value) || allFrames[0];
        const f2 = Number(toIn.value) || allFrames[allFrames.length - 1];
        const lo = Math.min(f1, f2);
        const hi = Math.max(f1, f2);
        startPreloadRange(allFrames.filter((f) => f >= lo && f <= hi));
      }
    }, SP.icons.downloadCloud(12), 'Nạp dải RAM');

    const preloadAroundBtn = h('button', {
      style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
      title: 'Tải nhanh ±25 frame quanh frame đang xem vào RAM',
      onclick: () => {
        const lo = Math.max(allFrames[0], currentFrame - 25);
        const hi = Math.min(allFrames[allFrames.length - 1], currentFrame + 25);
        fromIn.value = lo;
        toIn.value = hi;
        startPreloadRange(allFrames.filter((f) => f >= lo && f <= hi));
      }
    }, SP.icons.zap(12), '±25f');

    const preloadAllBtn = h('button', {
      style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
      title: 'Nạp toàn bộ ảnh 2D của tất cả các frame trong Job vào RAM',
      onclick: () => {
        fromIn.value = allFrames[0];
        toIn.value = allFrames[allFrames.length - 1];
        startPreloadRange(allFrames);
      }
    }, SP.icons.globe(12), `Cả Job (${allFrames.length}f)`);

    const cacheStatEl = h('span', {
      style: { marginLeft: 'auto', fontSize: '11px', color: '#73d13d', fontWeight: 500, fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: '4px' }
    });

    const leftTopBar = h('div', { class: 'c4-subbar' },
      h('div', { class: 'c4-group' },
        h('label', { style: { fontWeight: 600, color: '#fff' } }, 'Góc Cam:', camSel),
        h('label', { title: 'Hiển thị tất cả các góc Camera cùng lúc trên 1 màn hình' }, multiCamChk, 'Tất cả Cam')
      ),
      h('div', { class: 'c4-group' },
        h('label', {}, 'Dải nạp RAM:', fromIn, '→', toIn),
        preloadBtn,
        preloadAroundBtn,
        preloadAllBtn
      ),
      cacheStatEl
    );

    // ---------- 2. Khung vẽ Ảnh 2D chính (Giữ nguyên Zoom/Pan khi đổi Frame) ----------
    const mainCanvas = h('canvas');
    const mainCtx = mainCanvas.getContext('2d');
    const hudLeftPill = h('div', { class: 'c4-pill' }, 'Frame 0');
    const hudRightPill = h('div', { class: 'c4-pill', style: { color: '#ffc53d' }, hidden: true });
    const stageEl = h('div', { class: 'c4-stage' },
      mainCanvas,
      h('div', { class: 'c4-hud-top' }, hudLeftPill, hudRightPill)
    );

    // Dải băng hình 7 Frame liên tiếp (Filmstrip)
    const filmstripEl = h('div', { class: 'c4-filmstrip' });
    const thumbOffsets = [-3, -2, -1, 0, 1, 2, 3];
    const thumbCells = thumbOffsets.map((off) => {
      const c = h('canvas', { width: 160, height: 96 });
      const lbl = h('div', { class: 'c4-thumb-lbl' }, h('span', {}, ''), h('span', {}, ''));
      const box = h('div', {
        class: `c4-thumb ${off === 0 ? 'active' : ''}`,
        onclick: () => {
          const idx = allFrames.indexOf(currentFrame);
          const targetIdx = Math.max(0, Math.min(allFrames.length - 1, idx + off));
          goToFrame(allFrames[targetIdx]);
        }
      }, c, lbl);
      filmstripEl.append(box);
      return { off, box, canvas: c, ctx: c.getContext('2d'), lbl };
    });

    // ---------- 3. Thanh điều khiển Tua Phim (Scrubber & Playback Controls) ----------
    const playBtn = h('button', {
      class: 'primary',
      style: { minWidth: '78px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' },
      title: 'Phát / Dừng tự động chuỗi ảnh 2D (Phím Space)',
      onclick: () => togglePlay()
    }, SP.icons.play(11), 'Phát', h('span', { class: 'c4-kbd', style: { color: '#fff', borderColor: '#388bfd' } }, 'Space'));

    const stepBtn = (delta, iconNode, text, kbdText, title) => h('button', {
      title,
      style: { display: 'inline-flex', alignItems: 'center', gap: '3px' },
      onclick: () => {
        stopPlay();
        stepFrame(delta);
      }
    }, iconNode, text, kbdText ? h('span', { class: 'c4-kbd' }, kbdText) : null);

    const frameSlider = h('input', {
      type: 'range',
      min: 0,
      max: Math.max(0, allFrames.length - 1),
      value: Math.max(0, allFrames.indexOf(currentFrame)),
      style: { width: '100%', margin: 0 },
      oninput: (e) => {
        stopPlay();
        const idx = Number(e.target.value);
        if (allFrames[idx] !== undefined) goToFrame(allFrames[idx]);
      }
    });

    const cacheBarCanvas = h('canvas', { class: 'c4-cache-bar', width: 300, height: 5, title: 'Vạch xanh lá: Frame đã lưu sẵn trong RAM (chuyển ảnh 0ms)' });
    const cacheBarCtx = cacheBarCanvas.getContext('2d');

    const fpsSel = h('select', {
      title: 'Tốc độ phát ảnh tự động (Số frame / giây)',
      onchange: () => {
        S.fps = Number(fpsSel.value);
        if (playTimer) {
          stopPlay();
          startPlay();
        }
      }
    },
      [2, 5, 8, 12, 20].map((v) => h('option', { value: v, selected: v === S.fps }, `${v} fps`))
    );

    const syncCvatChk = h('input', {
      type: 'checkbox',
      checked: S.syncCvatFrame,
      onchange: () => {
        S.syncCvatFrame = syncCvatChk.checked;
        if (S.syncCvatFrame) SP.bridge.changeFrame(currentFrame);
      }
    });

    const jumpCvatBtn = h('button', {
      title: 'Đưa màn hình 3D chính của CVAT nhảy tới đúng Frame đang xem trên ảnh 2D',
      style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
      onclick: () => {
        SP.bridge.changeFrame(currentFrame);
        app.setStatus(`Đã chuyển màn hình CVAT tới Frame ${currentFrame}`, 'ok');
      }
    }, SP.icons.eye(12), 'Nhảy CVAT');

    const resetZoomBtn = h('button', {
      title: 'Đặt lại khung nhìn vừa khít màn hình (Double-click vào ảnh)',
      style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
      onclick: () => {
        fitted = true;
        renderCurrentFrame();
      }
    }, SP.icons.restore(12), 'Vừa khung');

    const playbackGroup = h('div', { class: 'c4-playback-group' },
      stepBtn(-5, SP.icons.fastBackward(11), '-5', null, 'Lùi 5 frame (Shift + ←)'),
      stepBtn(-1, SP.icons.stepBackward(11), 'Trước', '←', 'Frame trước (Phím ←)'),
      playBtn,
      stepBtn(1, SP.icons.stepForward(11), 'Tiếp', '→', 'Frame tiếp theo (Phím →)'),
      stepBtn(5, SP.icons.fastForward(11), '+5', null, 'Tiến 5 frame (Shift + →)')
    );

    const controlsBar = h('div', { class: 'c4-controls' },
      playbackGroup,
      h('div', { class: 'c4-scrubber-wrap' }, frameSlider, cacheBarCanvas),
      h('div', { class: 'c4-group' },
        h('label', {}, 'Tốc độ:', fpsSel),
        resetZoomBtn,
        jumpCvatBtn,
        h('label', { title: 'Tự động chuyển Frame trên màn hình 3D của CVAT theo ảnh 2D (tắt để lướt ảnh 2D nhanh 0ms)' }, syncCvatChk, 'Đồng bộ CVAT')
      )
    );

    const leftPanel = h('div', { class: 'c4-left' }, leftTopBar, stageEl, filmstripEl, controlsBar);

    // ---------- 4. Cột Bên Phải: Bộ Dò Tách ID (Split ID Detector) & Tra cứu Track ----------
    const tabSplitBtn = h('button', {
      class: 'c4-tab-btn active',
      style: { display: 'inline-flex', alignItems: 'center', gap: '5px' },
      onclick: () => switchRightTab('split')
    }, SP.icons.splitBranch(12), 'Dò Nghi Vấn Tách ID');

    const tabTrackBtn = h('button', {
      class: 'c4-tab-btn',
      style: { display: 'inline-flex', alignItems: 'center', gap: '5px' },
      onclick: () => switchRightTab('tracks')
    }, SP.icons.list(12), 'Theo Dõi Track / Frame');

    const rightFilterBar = h('div', { class: 'c4-subbar', style: { background: '#1a1a1a' } });
    const rightListEl = h('div', { class: 'c4-right-body' });

    const rightPanel = h('div', { class: 'c4-right' },
      h('div', { class: 'c4-subbar' },
        tabSplitBtn,
        tabTrackBtn,
        h('span', { style: { marginLeft: 'auto', fontSize: '10px', color: '#8c8c8c' } }, 'Cuộn: Zoom · Kéo: Pan giữ góc')
      ),
      rightFilterBar,
      rightListEl
    );

    const wrap = h('div', { class: 'c4-wrap', tabindex: '-1' }, leftPanel, rightPanel);
    root.append(wrap);

    // ---------- 5. Tương tác Zoom & Pan giữ cố định góc nhìn trên Canvas 2D ----------
    function zoomAt(factor, mx, my) {
      const nextZoom = Math.min(25, Math.max(0.1, zoom * factor));
      const k = nextZoom / zoom;
      tx = mx - (mx - tx) * k;
      ty = my - (my - ty) * k;
      zoom = nextZoom;
      fitted = false;
      drawStageAndFilmstrip();
    }

    stageEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = stageEl.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.22 : 1 / 1.22, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    stageEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      stageEl.setPointerCapture(e.pointerId);
      stageEl.classList.add('dragging');
      let lx = e.clientX;
      let ly = e.clientY;
      const move = (ev) => {
        tx += ev.clientX - lx;
        ty += ev.clientY - ly;
        lx = ev.clientX;
        ly = ev.clientY;
        fitted = false;
        drawStageAndFilmstrip();
      };
      const up = () => {
        stageEl.classList.remove('dragging');
        stageEl.removeEventListener('pointermove', move);
        stageEl.removeEventListener('pointerup', up);
      };
      stageEl.addEventListener('pointermove', move);
      stageEl.addEventListener('pointerup', up);
    });

    stageEl.addEventListener('dblclick', () => {
      fitted = true;
      renderCurrentFrame();
    });

    // Phím tắt điều khiển nhanh khi đang ở trong Tab 4
    wrap.addEventListener('keydown', (e) => {
      if (e.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        stopPlay();
        stepFrame(e.shiftKey ? -5 : -1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        stopPlay();
        stepFrame(e.shiftKey ? 5 : 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        togglePlay();
      }
    });

    // ---------- 6. Logic Nạp RAM & Vẽ Ảnh 2D 0ms Delay ----------
    function updateCacheStatus() {
      const cachedCount = frameData.resolvedImages ? frameData.resolvedImages.size : 0;
      cacheStatEl.textContent = `RAM Cache: ${cachedCount}/${allFrames.length} frame`;

      // Vẽ thanh biểu đồ các frame đã có sẵn trong RAM
      const W = cacheBarCanvas.width;
      const H = cacheBarCanvas.height;
      cacheBarCtx.fillStyle = '#141414';
      cacheBarCtx.fillRect(0, 0, W, H);
      if (!allFrames.length) return;

      const stepW = Math.max(1.5, W / allFrames.length);
      for (let i = 0; i < allFrames.length; i++) {
        const f = allFrames[i];
        if (frameData.hasCachedImages?.(f)) {
          cacheBarCtx.fillStyle = '#52c41a';
          cacheBarCtx.fillRect((i / allFrames.length) * W, 0, stepW, H);
        }
      }
      // Đánh dấu vị trí frame hiện tại
      const curIdx = allFrames.indexOf(currentFrame);
      if (curIdx >= 0) {
        cacheBarCtx.fillStyle = '#40a9ff';
        cacheBarCtx.fillRect((curIdx / allFrames.length) * W - 1, 0, 3, H);
      }
    }

    async function startPreloadRange(framesList) {
      if (!framesList.length) return;
      if (isPreloading) {
        cancelPreloadFlag = true;
        await new Promise((r) => setTimeout(r, 80));
      }
      isPreloading = true;
      cancelPreloadFlag = false;
      preloadBtn.replaceChildren(SP.icons.stop(11), ' Dừng nạp');
      preloadBtn.classList.remove('primary');
      preloadBtn.classList.add('danger');

      try {
        await frameData.preloadImages(
          framesList,
          (p) => {
            const pct = Math.round(p.fraction * 100);
            cacheStatEl.textContent = `Đang nạp RAM: ${p.done}/${p.total} (${pct}%) · Tổng cache: ${p.cachedTotal}f`;
            updateCacheStatus();
            if (p.lastFrame !== null && Math.abs(p.lastFrame - currentFrame) <= 3) {
              renderCurrentFrame();
            }
          },
          6,
          () => cancelPreloadFlag
        );
        app.setStatus(`Đã lưu sẵn ${frameData.resolvedImages.size} frame ảnh 2D vào RAM (lướt ảnh 0ms)`, 'ok');
      } finally {
        isPreloading = false;
        cancelPreloadFlag = false;
        preloadBtn.replaceChildren(SP.icons.downloadCloud(12), ' Nạp dải RAM');
        preloadBtn.classList.remove('danger');
        preloadBtn.classList.add('primary');
        updateCacheStatus();
        renderCurrentFrame();
      }
    }

    function populateCameraSelect(imgs) {
      if (camNamesKnown || !imgs || !imgs.length) return;
      camNamesKnown = true;
      camSel.replaceChildren(...imgs.map((im, i) =>
        h('option', { value: i, selected: i === S.camIdx }, `Cam #${i}: ${im.name.slice(0, 22)}`)
      ));
    }

    // Vẽ đồng bộ cả khung chính và 7 ô Filmstrip theo đúng vùng Zoom/Pan hiện tại
    function drawStageAndFilmstrip() {
      const dpr = window.devicePixelRatio || 1;
      const W = stageEl.clientWidth || 400;
      const H = stageEl.clientHeight || 240;
      if (mainCanvas.width !== Math.round(W * dpr) || mainCanvas.height !== Math.round(H * dpr)) {
        mainCanvas.width = Math.round(W * dpr);
        mainCanvas.height = Math.round(H * dpr);
      }
      mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mainCtx.fillStyle = '#090b0e';
      mainCtx.fillRect(0, 0, W, H);

      const imgs = frameData.getCachedImagesSync?.(currentFrame);
      const isCached = !!(imgs && imgs.length);

      const curIdx = allFrames.indexOf(currentFrame);
      hudLeftPill.replaceChildren(
        h('b', { style: { color: '#40a9ff' } }, `Frame ${currentFrame}`),
        h('span', { style: { color: '#8c8c8c' } }, `(${curIdx + 1}/${allFrames.length})`),
        h('span', {
          style: {
            color: isCached ? '#73d13d' : '#faad14',
            fontSize: '10px',
            borderLeft: '1px solid #434343',
            paddingLeft: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px'
          }
        }, isCached ? SP.icons.ramMemory(10) : SP.icons.refresh(10), isCached ? 'RAM 0ms' : 'Đang tải…'),
        !fitted ? h('span', { style: { color: '#ffc53d', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px' } }, SP.icons.lock(10), `Khóa Zoom ${Math.round(zoom * 100)}%`) : null
      );

      // Hiển thị trạng thái của cặp Track đang theo dõi trên HUD phải
      updateTrackingHudBanner();

      if (!imgs || !imgs.length) {
        mainCtx.fillStyle = '#8c8c8c';
        mainCtx.font = '12px sans-serif';
        mainCtx.textAlign = 'center';
        mainCtx.fillText(
          imgs ? 'Frame này không có ảnh Camera (Context Image)' : `Đang tải ảnh Frame ${currentFrame}…`,
          W / 2,
          H / 2
        );
      } else if (S.multiCam && imgs.length > 1) {
        // Vẽ lưới tất cả các Camera cùng lúc
        const cols = Math.min(3, Math.ceil(Math.sqrt(imgs.length)));
        const rowsCount = Math.ceil(imgs.length / cols);
        const cellW = W / cols;
        const cellH = H / rowsCount;

        if (fitted) {
          zoom = 1;
          tx = 0;
          ty = 0;
        }

        mainCtx.save();
        mainCtx.translate(tx, ty);
        mainCtx.scale(zoom, zoom);

        imgs.forEach((im, idx) => {
          const el = im.imgEl;
          if (!el || !el.width) return;
          const c = idx % cols;
          const r = Math.floor(idx / cols);
          const x0 = c * cellW;
          const y0 = r * cellH;
          const scale = Math.min((cellW - 4) / el.width, (cellH - 18) / el.height);
          const dw = el.width * scale;
          const dh = el.height * scale;
          const dx = x0 + (cellW - dw) / 2;
          const dy = y0 + (cellH - dh) / 2 + 6;
          mainCtx.drawImage(el, dx, dy, dw, dh);
          mainCtx.fillStyle = 'rgba(0,0,0,0.7)';
          mainCtx.fillRect(x0 + 4, y0 + 4, Math.min(cellW - 8, 145), 16);
          mainCtx.fillStyle = '#d9d9d9';
          mainCtx.font = '10px sans-serif';
          mainCtx.textAlign = 'left';
          mainCtx.fillText(`#${idx} ${im.name.slice(0, 18)}`, x0 + 8, y0 + 15);
        });
        mainCtx.restore();
      } else {
        // Vẽ 1 Camera đã chọn với khóa Zoom/Pan cố định
        const camIdx = Math.min(S.camIdx || 0, imgs.length - 1);
        const im = imgs[camIdx];
        const el = im?.imgEl;
        if (el && el.width) {
          if (fitted) {
            zoom = Math.min(W / el.width, H / el.height);
            tx = (W - el.width * zoom) / 2;
            ty = (H - el.height * zoom) / 2;
          }
          mainCtx.imageSmoothingEnabled = zoom < 3.5;
          mainCtx.drawImage(el, tx, ty, el.width * zoom, el.height * zoom);
        }
      }

      // Vẽ 7 ô Filmstrip (Nếu đang Zoom vào 1 vị trí, Filmstrip cũng tự động cắt đúng vùng Zoom đó qua 7 frame!)
      drawFilmstrip(W, H);
    }

    function drawFilmstrip(stageW, stageH) {
      const curIdx = allFrames.indexOf(currentFrame);
      for (const cell of thumbCells) {
        const idx = curIdx + cell.off;
        const f = allFrames[idx];
        const cw = cell.canvas.width;
        const ch = cell.canvas.height;
        cell.ctx.fillStyle = '#050709';
        cell.ctx.fillRect(0, 0, cw, ch);

        if (f === undefined) {
          cell.box.style.visibility = 'hidden';
          continue;
        }
        cell.box.style.visibility = 'visible';
        const imgs = frameData.getCachedImagesSync?.(f);
        const spans = cell.lbl.querySelectorAll('span');
        spans[0].textContent = `f${f}`;

        // Đánh dấu nếu Track đang soi bắt đầu hoặc kết thúc ở frame này
        let tag = '';
        if (focusedTrackA) {
          const pA = focusedTrackA.at(f);
          if (pA && !pA.outside) tag += `#${focusedTrackA.uiId} `;
        }
        if (focusedTrackB) {
          const pB = focusedTrackB.at(f);
          if (pB && !pB.outside) tag += `#${focusedTrackB.uiId}`;
        }
        spans[1].innerHTML = '';
        if (tag.trim()) {
          spans[1].textContent = tag.trim();
        } else if (imgs) {
          spans[1].append(SP.icons.zap(10));
        } else {
          spans[1].textContent = '…';
        }
        spans[1].style.color = tag ? '#ffc53d' : (imgs ? '#73d13d' : '#8c8c8c');

        if (!imgs || !imgs.length) {
          // Kích hoạt tải ngầm nhẹ cho các frame trong filmstrip
          frameData.contextImages(f).then(() => {
            updateCacheStatus();
            if (Math.abs(allFrames.indexOf(f) - allFrames.indexOf(currentFrame)) <= 3) {
              drawFilmstrip(stageEl.clientWidth || 400, stageEl.clientHeight || 240);
            }
          }).catch(() => {});
          continue;
        }

        const camIdx = Math.min(S.camIdx || 0, imgs.length - 1);
        const el = imgs[camIdx]?.imgEl;
        if (!el || !el.width) continue;

        if (!fitted && !S.multiCam && stageW > 0 && stageH > 0) {
          // Đồng bộ vùng cắt (Crop) theo đúng vùng người dùng đang Zoom trên màn hình chính!
          const sx = Math.max(0, (0 - tx) / zoom);
          const sy = Math.max(0, (0 - ty) / zoom);
          const sw = Math.min(el.width - sx, stageW / zoom);
          const sh = Math.min(el.height - sy, stageH / zoom);
          if (sw > 8 && sh > 8) {
            cell.ctx.drawImage(el, sx, sy, sw, sh, 0, 0, cw, ch);
            continue;
          }
        }
        const s = Math.min(cw / el.width, ch / el.height);
        const dw = el.width * s;
        const dh = el.height * s;
        cell.ctx.drawImage(el, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      }
    }

    function updateTrackingHudBanner() {
      if (!focusedTrackA && !focusedTrackB) {
        hudRightPill.hidden = true;
        return;
      }
      hudRightPill.hidden = false;
      hudRightPill.replaceChildren();

      if (focusedTrackA) {
        const pA = focusedTrackA.at(currentFrame);
        const activeA = pA && !pA.outside;
        const iconA = activeA ? SP.icons.dot(7) : SP.icons.dotRing(7);
        if (activeA) iconA.style.color = '#52c41a';
        else iconA.style.color = '#8c8c8c';
        hudRightPill.append(
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '3px' } },
            iconA,
            `#${focusedTrackA.uiId} (${store.labelName(focusedTrackA.labelId)}): ${activeA ? 'Đang hiện' : 'Ẩn/Ngoài'}`
          )
        );
      }
      if (focusedTrackB) {
        if (focusedTrackA) {
          const arrowEl = SP.icons.arrowRight(11);
          arrowEl.style.margin = '0 5px';
          arrowEl.style.opacity = '0.7';
          hudRightPill.append(arrowEl);
        }
        const pB = focusedTrackB.at(currentFrame);
        const activeB = pB && !pB.outside;
        const iconB = activeB ? SP.icons.dot(7) : SP.icons.dotRing(7);
        if (activeB) iconB.style.color = '#faad14';
        else iconB.style.color = '#8c8c8c';
        hudRightPill.append(
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '3px' } },
            iconB,
            `#${focusedTrackB.uiId} (${store.labelName(focusedTrackB.labelId)}): ${activeB ? 'Đang hiện' : 'Chưa/Ẩn'}`
          )
        );
      }
    }

    async function renderCurrentFrame() {
      const idx = allFrames.indexOf(currentFrame);
      if (idx >= 0) frameSlider.value = idx;
      updateCacheStatus();
      drawStageAndFilmstrip();

      // Nếu frame hiện tại chưa có trong RAM, tải ngay lập tức rồi vẽ lại
      if (!frameData.hasCachedImages(currentFrame)) {
        try {
          const imgs = await frameData.contextImages(currentFrame);
          populateCameraSelect(imgs);
          updateCacheStatus();
          drawStageAndFilmstrip();
        } catch {}
      } else {
        populateCameraSelect(frameData.getCachedImagesSync(currentFrame));
      }

      if (rightTab === 'tracks') {
        renderTrackInspector();
      }
    }

    function goToFrame(f) {
      if (f === undefined || f === null) return;
      currentFrame = f;
      renderCurrentFrame();
      if (S.syncCvatFrame) {
        SP.bridge.changeFrame(currentFrame);
      }
    }

    function stepFrame(delta) {
      const idx = allFrames.indexOf(currentFrame);
      if (idx < 0) return;
      const nextIdx = Math.max(0, Math.min(allFrames.length - 1, idx + delta));
      goToFrame(allFrames[nextIdx]);
    }

    function startPlay() {
      if (playTimer) return;
      playBtn.replaceChildren(SP.icons.pause(11), ' Dừng', h('span', { class: 'c4-kbd', style: { color: '#ff7875', borderColor: '#5c2223' } }, 'Space'));
      playBtn.classList.remove('primary');
      playBtn.classList.add('danger');
      playTimer = setInterval(() => {
        const idx = allFrames.indexOf(currentFrame);
        if (idx >= allFrames.length - 1) {
          // Quay vòng về đầu dải đang nạp (fromIn) hoặc dừng
          const loopStart = Number(fromIn.value) || allFrames[0];
          goToFrame(allFrames.includes(loopStart) ? loopStart : allFrames[0]);
        } else {
          goToFrame(allFrames[idx + 1]);
        }
      }, Math.round(1000 / Math.max(1, S.fps)));
    }

    function stopPlay() {
      if (!playTimer) return;
      clearInterval(playTimer);
      playTimer = null;
      playBtn.replaceChildren(SP.icons.play(11), ' Phát', h('span', { class: 'c4-kbd', style: { color: '#fff', borderColor: '#388bfd' } }, 'Space'));
      playBtn.classList.remove('danger');
      playBtn.classList.add('primary');
    }

    function togglePlay() {
      if (playTimer) stopPlay();
      else startPlay();
    }

    // ---------- 7. Chức năng Soi 2 Track nghi vấn Tách ID trên CVAT 3D & Gộp ID ----------
    async function focusPairInMain3D(trackA, endFrameA, trackB, startFrameB) {
      const posA = trackA?.at?.(endFrameA);
      const posB = trackB?.at?.(startFrameB);
      const boxA = posA?.box;
      const boxB = posB?.box;

      if (app.isFullscreen && typeof app.toggleFullscreen === 'function') {
        app.toggleFullscreen();
      }

      const highlightBoxes = [];
      if (boxA) {
        const axA = G.axes(boxA.r);
        highlightBoxes.push({
          frame: endFrameA,
          color: 0xff4d4f, // Đỏ: Vị trí kết thúc của ID cũ (#A)
          boxCorners: G.boxCorners(boxA),
          headingLine: [boxA.c, G.localToWorld([boxA.s[0] / 2, 0, 0], boxA.c, axA)],
          points: [],
        });
      }
      if (boxB) {
        const axB = G.axes(boxB.r);
        highlightBoxes.push({
          frame: startFrameB,
          color: 0xffec3d, // Vàng: Vị trí bắt đầu của ID mới (#B)
          boxCorners: G.boxCorners(boxB),
          headingLine: [boxB.c, G.localToWorld([boxB.s[0] / 2, 0, 0], boxB.c, axB)],
          points: [],
        });
      }

      const targetCenter = (boxA && boxB)
        ? [(boxA.c[0] + boxB.c[0]) / 2, (boxA.c[1] + boxB.c[1]) / 2, (boxA.c[2] + boxB.c[2]) / 2]
        : (boxA ? boxA.c.slice() : null);

      await SP.bridge.focusOverlapInMain({
        frame: currentFrame,
        clientIDA: trackA?.id,
        clientIDB: trackB?.id,
        targetCenter,
        highlightBoxes,
      });

      app.setStatus(
        `Đang hiển thị vị trí cuối của #${trackA.uiId} (f${endFrameA} - Đỏ) và vị trí đầu của #${trackB.uiId} (f${startFrameB} - Vàng) trên CVAT 3D`,
        'ok'
      );
    }

    // Nối toàn bộ Keyframe của Track #B sang Track #A (hỗ trợ Ctrl+Z hoàn tác)
    async function mergeTrackBIntoA(trackA, endFrameA, trackB, startFrameB) {
      if (!trackA || !trackB) return;
      if (app.snapshot) app.snapshot([trackA.id, trackB.id]);
      else {
        trackA.snapshot();
        trackB.snapshot();
      }

      // 1. Gỡ bỏ đánh dấu Outside của Track A trong khoảng chuyển giao (từ endFrameA tới cuối)
      for (const sh of trackA.shapes) {
        if (sh.frame >= endFrameA && sh.frame <= startFrameB && sh.outside) {
          sh.outside = false;
        }
      }

      // 2. Chép các Keyframe từ startFrameB trở đi của Track B sang Track A
      const bShapes = trackB.shapes.filter((s) => s.frame >= startFrameB);
      for (const bSh of bShapes) {
        const existingIdx = trackA.shapes.findIndex((s) => s.frame === bSh.frame);
        const cloned = SP.store.deepClone(bSh);
        // Giữ nguyên kích thước chuẩn của Track A nếu cùng class để tránh nhảy size
        if (trackA.labelId === trackB.labelId && trackA.shapes.length) {
          const refPos = trackA.at(endFrameA);
          if (refPos) {
            const boxB = G.pointsToBox(cloned.points);
            const resized = G.resizeKeepBottom(boxB, refPos.box.s);
            cloned.points = G.boxToPoints(resized, cloned.points);
          }
        }
        if (existingIdx >= 0) {
          trackA.shapes[existingIdx] = cloned;
        } else {
          trackA.shapes.push(cloned);
        }
      }
      trackA.shapes.sort((a, b) => a.frame - b.frame);
      trackA.dirty = true;

      // 3. Đánh dấu Outside cho phần đã gộp của Track B để không bị trùng lặp 2 box
      for (const bSh of trackB.shapes) {
        if (bSh.frame >= startFrameB) {
          bSh.outside = true;
        }
      }
      trackB.dirty = true;

      app.changed();
      await store.syncTrackToCvat(trackA);
      await store.syncTrackToCvat(trackB);
      renderRightPanel();
      renderCurrentFrame();
      app.setStatus(`Đã nối hành trình của #${trackB.uiId} (từ f${startFrameB}) vào #${trackA.uiId}! (Bấm Ctrl+Z nếu muốn hoàn tác)`, 'ok');
    }

    // ---------- 8. Hiển thị Cột Bên Phải (Tab Dò Tách ID & Tab Theo Dõi Track) ----------
    function switchRightTab(tab) {
      rightTab = tab;
      tabSplitBtn.classList.toggle('active', tab === 'split');
      tabTrackBtn.classList.toggle('active', tab === 'tracks');
      renderRightPanel();
    }

    function renderRightPanel() {
      if (rightTab === 'split') renderSplitDetector();
      else renderTrackInspector();
    }

    function renderSplitDetector() {
      rightFilterBar.replaceChildren();
      rightListEl.replaceChildren();

      const gapIn = h('input', {
        type: 'number',
        min: 1,
        max: 100,
        value: S.maxGapFrames,
        style: { width: '46px' },
        onchange: () => { S.maxGapFrames = Math.max(1, Number(gapIn.value) || 25); renderSplitDetector(); }
      });
      const distIn = h('input', {
        type: 'number',
        min: 0.5,
        max: 30,
        step: 0.5,
        value: S.maxDistM,
        style: { width: '48px' },
        onchange: () => { S.maxDistM = Math.max(0.5, Number(distIn.value) || 6.0); renderSplitDetector(); }
      });
      const sameClsChk = h('input', {
        type: 'checkbox',
        checked: S.sameClassOnly,
        onchange: () => { S.sameClassOnly = sameClsChk.checked; renderSplitDetector(); }
      });

      rightFilterBar.append(
        h('label', { title: 'Số frame ngắt quãng tối đa giữa lúc ID cũ biến mất và ID mới xuất hiện' }, 'Cách ≤', gapIn, 'f'),
        h('label', { title: 'Khoảng cách 3D tối đa giữa vị trí cuối của ID cũ và vị trí đầu của ID mới' }, 'Lệch ≤', distIn, 'm'),
        h('label', { title: 'Chỉ tìm các cặp cùng nhãn (Label)' }, sameClsChk, 'Cùng Class')
      );

      const list = findSplitIdCandidates(store, {
        maxGapFrames: S.maxGapFrames,
        maxDistM: S.maxDistM,
        sameClassOnly: S.sameClassOnly,
      });

      if (!list.length) {
        rightListEl.append(h('div', { style: { padding: '24px 12px', textAlign: 'center', color: '#8c8c8c' } },
          'Không phát hiện cặp Track nào đứt quãng / tách ID trong ngưỡng lọc hiện tại. Bạn có thể tăng "Cách ≤ f" hoặc "Lệch ≤ m" để mở rộng phạm vi dò.'
        ));
        return;
      }

      rightListEl.append(h('div', { style: { fontSize: '11px', color: '#bfbfbf', marginBottom: '2px' } },
        `Phát hiện ${list.length} cặp nghi vấn tách ID (Bấm vào thẻ để tự động nạp ảnh 2D đoạn chuyển giao và kiểm tra):`
      ));

      for (const item of list) {
        const { trackA, trackB, endFrameA, startFrameB, gapFrames, bestDist, sameClass, reasonA } = item;
        const isSelected = focusedTrackA?.id === trackA.id && focusedTrackB?.id === trackB.id;
        const isHighProb = bestDist <= 2.2 && Math.abs(gapFrames) <= 6 && sameClass;

        const gapText = gapFrames === 0
          ? 'Chuyển giao liền kề (0f)'
          : (gapFrames > 0 ? `Cách ${gapFrames} frame` : `Chồng lấn ${Math.abs(gapFrames)} frame`);

        const reasonBadge = reasonA === 'unclosed_kf'
          ? h('span', { style: { color: '#ffc53d', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px' }, title: 'Track cũ hết keyframe nhưng chưa tích Outside' }, SP.icons.warning(10), 'Quên tích Outside cuối')
          : null;

        const card = h('div', {
          class: `c4-card ${isHighProb ? 'high-prob' : ''} ${isSelected ? 'selected' : ''}`,
          onclick: () => {
            focusedTrackA = trackA;
            focusedTrackB = trackB;
            // Tự động nạp vào RAM đoạn frame quanh vị trí đứt ID (từ endFrameA - 8 đến startFrameB + 8)
            const lo = Math.max(allFrames[0], Math.min(endFrameA, startFrameB) - 8);
            const hi = Math.min(allFrames[allFrames.length - 1], Math.max(endFrameA, startFrameB) + 8);
            fromIn.value = lo;
            toIn.value = hi;
            goToFrame(endFrameA);
            renderSplitDetector();
            startPreloadRange(allFrames.filter((f) => f >= lo && f <= hi));
          }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' } },
            h('span', { style: { fontWeight: 600, color: '#fff', fontSize: '12px', display: 'inline-flex', alignItems: 'center' } },
              `#${trackA.uiId} `,
              h('span', { style: { color: store.labelColor(trackA.labelId), fontWeight: 500, margin: '0 4px' } }, `(${store.labelName(trackA.labelId)})`),
              h('span', { style: { display: 'inline-flex', alignItems: 'center', margin: '0 4px', opacity: 0.65 } }, SP.icons.arrowRight(11)),
              ` #${trackB.uiId} `,
              h('span', { style: { color: store.labelColor(trackB.labelId), fontWeight: 500, margin: '0 4px' } }, `(${store.labelName(trackB.labelId)})`)
            ),
            h('span', {
              style: {
                background: isHighProb ? 'rgba(255, 77, 79, 0.2)' : 'rgba(250, 173, 20, 0.16)',
                border: `1px solid ${isHighProb ? '#ff4d4f' : '#faad14'}`,
                color: isHighProb ? '#ff7875' : '#ffc53d',
                padding: '0 5px',
                borderRadius: '2px',
                fontSize: '10px',
                fontWeight: 600
              }
            }, `Lệch ${bestDist.toFixed(2)}m · ${gapText}`)
          ),
          h('div', { style: { fontSize: '11px', color: '#bfbfbf', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' } },
            h('span', {}, `#${trackA.uiId} kết thúc tại f${endFrameA}  →  #${trackB.uiId} bắt đầu tại f${startFrameB}`),
            reasonBadge
          ),
          h('div', { style: { display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' } },
            h('button', {
              class: 'small',
              title: 'Xem ảnh 2D tại frame cuối của ID cũ',
              onclick: (e) => {
                e.stopPropagation();
                focusedTrackA = trackA;
                focusedTrackB = trackB;
                goToFrame(endFrameA);
              }
            }, `Xem f${endFrameA} (#${trackA.uiId})`),
            h('button', {
              class: 'small',
              title: 'Xem ảnh 2D tại frame đầu của ID mới',
              onclick: (e) => {
                e.stopPropagation();
                focusedTrackA = trackA;
                focusedTrackB = trackB;
                goToFrame(startFrameB);
              }
            }, `Xem f${startFrameB} (#${trackB.uiId})`),
            h('button', {
              class: 'small primary',
              style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
              title: 'Nhảy màn hình 3D của CVAT tới đây và tô sáng cả 2 Box (#A Đỏ, #B Vàng) để đối chiếu',
              onclick: (e) => {
                e.stopPropagation();
                focusedTrackA = trackA;
                focusedTrackB = trackB;
                focusPairInMain3D(trackA, endFrameA, trackB, startFrameB);
              }
            }, SP.icons.eye(12), 'Soi 2 Box trên 3D'),
            h('button', {
              class: 'small',
              onclick: (e) => { e.stopPropagation(); app.switchTab('case2', trackA.id); }
            }, `Sửa #${trackA.uiId}`),
            h('button', {
              class: 'small',
              onclick: (e) => { e.stopPropagation(); app.switchTab('case2', trackB.id); }
            }, `Sửa #${trackB.uiId}`)
          )
        );
        rightListEl.append(card);
      }
    }

    function renderTrackInspector() {
      rightFilterBar.replaceChildren();
      rightListEl.replaceChildren();

      const tracks = [...store.tracks.values()].sort((a, b) => a.uiId - b.uiId);
      const trackSel = h('select', {
        style: { flex: 1 },
        onchange: () => {
          const t = store.track(Number(trackSel.value));
          focusedTrackA = t;
          focusedTrackB = null;
          if (t) {
            const segs = getTrackEndpoints(t, allFrames);
            const endF = segs.length ? segs[segs.length - 1].endFrame : t.lastFrame;
            fromIn.value = t.firstFrame;
            toIn.value = endF;
          }
          renderCurrentFrame();
        }
      },
        h('option', { value: '' }, '— Chọn Track để theo dõi hành trình —'),
        ...tracks.map((t) => {
          const segs = getTrackEndpoints(t, allFrames);
          const endF = segs.length ? segs[segs.length - 1].endFrame : t.lastFrame;
          return h('option', {
            value: t.id,
            selected: focusedTrackA?.id === t.id
          }, `#${t.uiId} · ${store.labelName(t.labelId)} (f${t.firstFrame}→f${endF})`);
        })
      );

      rightFilterBar.append(
        h('span', { style: { fontWeight: 600, color: '#fff' } }, 'Track:'),
        trackSel
      );

      if (focusedTrackA) {
        const t = focusedTrackA;
        const segs = getTrackEndpoints(t, allFrames);
        const endF = segs.length ? segs[segs.length - 1].endFrame : t.lastFrame;

        rightListEl.append(h('div', { class: 'c4-card selected' },
          h('div', { style: { fontWeight: 600, color: '#fff', display: 'flex', justifyContent: 'space-between' } },
            h('span', {}, `Đang theo dõi Track #${t.uiId} (${store.labelName(t.labelId)})`),
            h('span', { style: { color: '#40a9ff' } }, `f${t.firstFrame} → f${endF}`)
          ),
          h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' } },
            h('button', {
              class: 'small primary',
              style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
              onclick: () => {
                fromIn.value = t.firstFrame;
                toIn.value = endF;
                goToFrame(t.firstFrame);
                startPreloadRange(allFrames.filter((f) => f >= t.firstFrame && f <= endF));
              }
            }, SP.icons.downloadCloud(12), `Nạp ảnh cả hành trình #${t.uiId} (f${t.firstFrame}–f${endF})`),
            h('button', { class: 'small', onclick: () => goToFrame(t.firstFrame) }, `Đầu (f${t.firstFrame})`),
            h('button', { class: 'small', onclick: () => goToFrame(endF) }, `Cuối (f${endF})`),
            h('button', { class: 'small', onclick: () => app.switchTab('case2', t.id) }, 'Mở Sửa chuỗi →')
          )
        ));
      }

      // Danh sách tất cả các Track đang xuất hiện tại Frame hiện tại
      const activeHere = tracks.filter((t) => {
        const p = t.at(currentFrame);
        return p && !p.outside;
      });

      rightListEl.append(h('div', { style: { fontSize: '11px', fontWeight: 600, color: '#bfbfbf', marginTop: '4px' } },
        `Các Track có mặt tại Frame ${currentFrame} (${activeHere.length} đối tượng):`
      ));

      for (const t of activeHere) {
        const p = t.at(currentFrame);
        const segs = getTrackEndpoints(t, allFrames);
        const endF = segs.length ? segs[segs.length - 1].endFrame : t.lastFrame;
        const isStart = t.firstFrame === currentFrame;
        const isEnd = endF === currentFrame;

        rightListEl.append(h('div', {
          class: `c4-card ${focusedTrackA?.id === t.id ? 'selected' : ''}`,
          style: { borderLeftColor: store.labelColor(t.labelId), padding: '5px 8px' },
          onclick: () => {
            focusedTrackA = t;
            renderCurrentFrame();
          }
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            h('span', { style: { fontWeight: 600, color: '#fff' } },
              `#${t.uiId} · `,
              h('span', { style: { color: store.labelColor(t.labelId) } }, store.labelName(t.labelId)),
              isStart ? h('span', { style: { marginLeft: '6px', background: '#177ddc', color: '#fff', padding: '0 4px', borderRadius: '2px', fontSize: '10px' } }, 'Mới bắt đầu') : null,
              isEnd ? h('span', { style: { marginLeft: '6px', background: '#da3633', color: '#fff', padding: '0 4px', borderRadius: '2px', fontSize: '10px' } }, 'Sắp kết thúc') : null
            ),
            h('span', { style: { fontSize: '10px', color: '#8c8c8c', fontVariantNumeric: 'tabular-nums' } },
              `f${t.firstFrame}→f${endF} · X:${fmt(p.box.c[0])} Y:${fmt(p.box.c[1])}`
            )
          )
        ));
      }
    }

    const ro = new ResizeObserver(() => drawStageAndFilmstrip());
    ro.observe(stageEl);

    renderRightPanel();
    renderCurrentFrame();

    // Tự động nạp nhẹ 15 frame xung quanh frame hiện tại khi vừa mở tab để người dùng lướt mượt ngay
    const initNear = allFrames.filter((f) => Math.abs(f - currentFrame) <= 7);
    frameData.preloadImages(initNear, () => {
      updateCacheStatus();
      drawStageAndFilmstrip();
    }, 4);

    return {
      refresh() {
        renderRightPanel();
        renderCurrentFrame();
      },
      unmount() {
        stopPlay();
        cancelPreloadFlag = true;
        ro.disconnect();
      }
    };
  }

  (SP.pendingTabs ||= []).push(['case4', { title: 'Theo dõi Ảnh 2D & Tách ID', mount }]);
  SP.app?.registerTab?.('case4', { title: 'Theo dõi Ảnh 2D & Tách ID', mount });
})();
