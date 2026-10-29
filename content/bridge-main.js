// bridge-main.js - Plugin cầu nối chạy trong ngữ cảnh trang (world: MAIN)
// Đăng ký trực tiếp với window.cvatUI của CVAT để đọc/ghi annotation trong RAM mà không cần reload
// Tác giả: taquanglocit-tech

(() => {
  if (window.__cvatSuperProBridge) return;
  window.__cvatSuperProBridge = true;

  const REQ = 'cvat-super-pro:req';
  const RES = 'cvat-super-pro:res';
  const EVT = 'cvat-super-pro:evt';
  let ctx = null; // { core, store, dispatch, actionCreators }
  let internalOpDepth = 0;
  let lastInternalOpTs = 0;
  let storeUnsubscribe = null;

  function beginInternalOp() {
    internalOpDepth += 1;
    lastInternalOpTs = Date.now();
  }

  function endInternalOp() {
    internalOpDepth = Math.max(0, internalOpDepth - 1);
    lastInternalOpTs = Date.now();
  }

  function emitEvt(payload) {
    document.dispatchEvent(new CustomEvent(EVT, { detail: JSON.stringify(payload) }));
  }

  // Phát sự kiện "đã lưu" (chống phát trùng khi cả Redux lẫn DOM cùng báo trong vài trăm ms)
  let lastSavedEmitTs = 0;
  function emitSaved(source) {
    const now = Date.now();
    if (now - lastSavedEmitTs < 1200) return;
    lastSavedEmitTs = now;
    emitEvt({ type: 'cvat-saved', source, unsaved: false });
  }

  function readUnsaved() {
    try {
      const job = ctx?.store?.getState?.()?.annotation?.job?.instance;
      return job ? !!job.annotations.hasUnsavedChanges() : false;
    } catch {
      return false;
    }
  }

  // Dự phòng DOM: theo dõi nút Save gốc của CVAT. Khi class "cvat-annotation-disabled-header-button"
  // (chỉ bật trong lúc đang lưu) biến mất mà CVAT không còn thay đổi chưa lưu thì coi như lưu xong.
  let saveBtnObserver = null;
  let saveBtnWatched = null;
  let saveBtnTimer = null;
  function watchSaveButtonDom() {
    if (saveBtnTimer) return;
    const SAVE_SEL = '.cvat-annotation-header-save-button';
    const DISABLED = 'cvat-annotation-disabled-header-button';
    saveBtnTimer = setInterval(() => {
      const btn = document.querySelector(SAVE_SEL);
      if (!btn || btn === saveBtnWatched) return;
      saveBtnObserver?.disconnect();
      saveBtnWatched = btn;
      let wasSaving = btn.classList.contains(DISABLED);
      saveBtnObserver = new MutationObserver(() => {
        const nowSaving = btn.classList.contains(DISABLED);
        if (wasSaving && !nowSaving) {
          // Đợi CVAT kịp xóa cờ unsaved rồi mới kiểm tra
          setTimeout(() => { if (!readUnsaved()) emitSaved('dom'); }, 250);
        }
        wasSaving = nowSaving;
      });
      saveBtnObserver.observe(btn, { attributes: true, attributeFilter: ['class'] });
    }, 1000);
  }

  function stopSaveButtonDomWatch() {
    if (saveBtnTimer) { clearInterval(saveBtnTimer); saveBtnTimer = null; }
    saveBtnObserver?.disconnect();
    saveBtnObserver = null;
    saveBtnWatched = null;
  }

  function setupStoreWatcher() {
    if (!ctx || !ctx.store || typeof ctx.store.subscribe !== 'function') return;
    if (storeUnsubscribe) {
      try { storeUnsubscribe(); } catch {}
      storeUnsubscribe = null;
    }
    watchSaveButtonDom();

    let lastFrame = null;
    let lastActiveId = null;
    let lastFrameSig = '';
    let lastHistSig = '';
    let lastSaving = false;
    let lastUnsaved = null;
    let notifyTimer = null;
    let pendingAnnotationsChanged = false;
    let pendingFrameChanged = false;
    let pendingActiveChanged = false;

    const histKey = (a) => (Array.isArray(a) ? `${a[0]}@${a[1]}` : '');

    // Hai chữ ký tách riêng:
    //  - histSig : lịch sử Undo/Redo của CVAT, KHÔNG phụ thuộc frame (bắt được cả Undo/Redo nhảy frame)
    //  - frameSig: trạng thái các cuboid track ở frame hiện tại, chỉ so sánh khi frame không đổi
    //    (vì bước sang frame khác thì điểm nội suy đổi theo, không phải do người dùng sửa)
    const computeSnapshot = () => {
      const st = ctx?.store?.getState?.()?.annotation;
      if (!st || !st.job?.instance || !st.player) return null;
      const frame = st.player.frame?.number ?? 0;
      const rawActive = st.annotations?.activatedStateID ?? st.canvas?.activeElement?.clientID ?? null;
      const activeId = rawActive !== null && rawActive !== undefined ? Number(rawActive) : null;
      const states = Array.isArray(st.annotations?.states) ? st.annotations.states : [];
      const undo = st.annotations?.history?.undo || [];
      const redo = st.annotations?.history?.redo || [];
      const histSig = `${undo.length}|${redo.length}|${histKey(undo[undo.length - 1])}|${histKey(redo[redo.length - 1])}`;
      const frameSig = states
        .filter((s) => s && s.objectType === 'track' && s.shapeType === 'cuboid')
        .map((s) => `${s.clientID}:${s.updated || 0}:${s.keyframe ? 1 : 0}:${s.outside ? 1 : 0}:${s.occluded ? 1 : 0}:${Array.isArray(s.points) ? s.points.map((v) => Number(v).toFixed(3)).join(',') : ''}`)
        .join('|');
      const saving = !!st.annotations?.saving?.uploading;
      return { frame, activeId, histSig, frameSig, saving };
    };

    const initSnap = computeSnapshot();
    if (initSnap) {
      lastFrame = initSnap.frame;
      lastActiveId = initSnap.activeId;
      lastFrameSig = initSnap.frameSig;
      lastHistSig = initSnap.histSig;
      lastSaving = initSnap.saving;
      lastUnsaved = readUnsaved();
    }

    storeUnsubscribe = ctx.store.subscribe(() => {
      const snap = computeSnapshot();
      if (!snap) return;

      // 1. Sự kiện LƯU: uploading true -> false và CVAT không còn thay đổi chưa lưu
      //    (Nút Save gốc và phím Ctrl+S cùng đi qua saveAnnotationsAsync nên cùng bị bắt ở đây)
      const justFinishedSaving = lastSaving && !snap.saving;
      lastSaving = snap.saving;
      const unsaved = readUnsaved();
      const unsavedChanged = unsaved !== lastUnsaved;
      lastUnsaved = unsaved;
      if (justFinishedSaving) {
        if (!unsaved) emitSaved('redux');
        else emitEvt({ type: 'cvat-save-failed', unsaved: true });
      } else if (unsavedChanged) {
        // Trạng thái "chưa lưu" gốc của CVAT thay đổi (kể cả do Tool ghi xuống) để Tool cập nhật nút Lưu
        emitEvt({ type: 'cvat-unsaved', unsaved });
      }

      // 2. Thay đổi frame / track được chọn / dữ liệu annotation
      const frameChanged = snap.frame !== lastFrame;
      const activeChanged = snap.activeId !== lastActiveId;
      const histChanged = snap.histSig !== lastHistSig;
      const frameSigChanged = snap.frameSig !== lastFrameSig;
      // Đổi frame đơn thuần làm frameSig đổi theo nên KHÔNG tính là sửa dữ liệu
      const annotationsChanged = histChanged || (!frameChanged && frameSigChanged);

      lastFrame = snap.frame;
      lastActiveId = snap.activeId;
      lastFrameSig = snap.frameSig;
      lastHistSig = snap.histSig;

      if (!frameChanged && !activeChanged && !annotationsChanged) return;

      // Bỏ qua các thay đổi dữ liệu do chính Tool vừa ghi xuống CVAT để tránh vòng lặp đồng bộ thừa
      const internal = internalOpDepth > 0 || (Date.now() - lastInternalOpTs < 140 && !activeChanged && !frameChanged);
      if (internal && !frameChanged && !activeChanged) return;

      if (annotationsChanged && !internal) pendingAnnotationsChanged = true;
      if (frameChanged) pendingFrameChanged = true;
      if (activeChanged) pendingActiveChanged = true;
      if (!pendingAnnotationsChanged && !pendingFrameChanged && !pendingActiveChanged) return;

      if (notifyTimer) clearTimeout(notifyTimer);
      notifyTimer = setTimeout(() => {
        notifyTimer = null;
        const payload = {
          type: 'cvat-updated',
          frame: lastFrame,
          activeId: lastActiveId,
          annotationsChanged: pendingAnnotationsChanged,
          frameChanged: pendingFrameChanged,
          activeChanged: pendingActiveChanged,
          unsaved: readUnsaved(),
        };
        pendingAnnotationsChanged = false;
        pendingFrameChanged = false;
        pendingActiveChanged = false;
        emitEvt(payload);
      }, pendingAnnotationsChanged && !pendingFrameChanged ? 150 : 60);
    });
  }

  function register() {
    if (ctx || !window.cvatUI || typeof window.cvatUI.registerComponent !== 'function') return !!ctx;
    window.cvatUI.registerComponent((args) => {
      ctx = args;
      setupStoreWatcher();
      return {
        name: 'CVAT 3D Super Pro - taquanglocit-tech',
        destructor: () => {
          if (storeUnsubscribe) {
            try { storeUnsubscribe(); } catch {}
            storeUnsubscribe = null;
          }
          stopSaveButtonDomWatch();
          ctx = null;
        }
      };
    });
    return !!ctx;
  }

  // Chờ đợi window.cvatUI sẵn sàng sau khi React mount
  if (!register()) {
    document.addEventListener('plugins.ready', register);
    let tries = 0;
    const timer = setInterval(() => {
      if (register() || ++tries > 120) clearInterval(timer);
    }, 500);
  }

  function annotationState() {
    if (!ctx) throw new Error('Chưa kết nối được với plugin CVAT');
    const st = ctx.store.getState().annotation;
    const job = st && st.job && st.job.instance;
    if (!job) throw new Error('Chưa mở job trên CVAT');
    return { job, frame: st.player.frame.number };
  }

  function trackStatesAt(job, frame) {
    return job.annotations.get(frame, true, [])
      .then((states) => states.filter((s) => s.objectType === 'track' && s.shapeType === 'cuboid'));
  }

  // Xoay 180 độ quanh trục thẳng đứng cục bộ ez của Cuboid (giữ đúng độ nghiêng mặt dốc Roll/Pitch)
  function flipEulerLocalZ(r) {
    const a = Math.cos(r[0]), b = Math.sin(r[0]);
    const c = Math.cos(r[1]), d = Math.sin(r[1]);
    const e = Math.cos(r[2]), f = Math.sin(r[2]);
    const ae = a * e, af = a * f, be = b * e, bf = b * f;
    const ex = [-c * e, -(af + be * d), -(bf - ae * d)];
    const ey = [c * f, -(ae - bf * d), -(be + af * d)];
    const ez = [d, -b * c, a * c];
    const y = Math.asin(Math.min(1, Math.max(-1, ez[0])));
    if (Math.abs(ez[0]) < 0.9999999) {
      return [Math.atan2(-ez[1], ez[2]), y, Math.atan2(-ey[0], ex[0])];
    }
    return [Math.atan2(ey[2], ey[1]), y, 0];
  }

  const methods = {
    async status() {
      if (!ctx) return { ready: false };
      const st = ctx.store.getState().annotation;
      const job = st && st.job && st.job.instance;
      return {
        ready: !!job,
        jobId: job ? job.id : null,
        dimension: job ? job.dimension : null,
        unsaved: job ? job.annotations.hasUnsavedChanges() : false,
      };
    },

    // Lấy thông tin đối tượng đang được chọn/active trên giao diện CVAT
    async getActiveElement() {
      if (!ctx) return null;
      const st = ctx.store.getState().annotation;
      if (!st || !st.player) return null;
      const frame = st.player.frame.number;
      const activeId = st.annotations?.activatedStateID ?? st.canvas?.activeElement?.clientID ?? null;
      if (!activeId) return { activeId: null, frame };
      const { job } = annotationState();
      try {
        const states = await trackStatesAt(job, frame);
        const s = states.find((x) => x.clientID === Number(activeId));
        if (!s) return { activeId: Number(activeId), frame, state: null };
        return {
          activeId: Number(activeId),
          frame,
          state: {
            clientID: s.clientID,
            serverID: s.serverID ?? null,
            label: { id: s.label.id, name: s.label.name, color: s.label.color },
            points: Array.from(s.points),
            keyframe: s.keyframe,
            outside: s.outside,
            occluded: s.occluded,
            attributes: s.attributes && typeof s.attributes === 'object' ? { ...s.attributes } : {},
          }
        };
      } catch {
        return { activeId: Number(activeId), frame, state: null };
      }
    },

    // Kích hoạt một track trên màn hình CVAT
    async activateObject({ clientID }) {
      if (!ctx || !ctx.actionCreators?.activateObject) return false;
      ctx.dispatch(ctx.actionCreators.activateObject(Number(clientID), null, null));
      const canvasInstance = ctx.store?.getState()?.annotation?.canvas?.instance;
      if (canvasInstance && typeof canvasInstance.activate === 'function') {
        canvasInstance.activate(Number(clientID), null);
      }
      return true;
    },

    // Nhảy tới một frame cụ thể trên CVAT
    async changeFrame({ frame }) {
      if (!ctx || !ctx.actionCreators?.changeFrameAsync) return false;
      const targetFrame = Number(frame);
      const curFrame = ctx.store?.getState()?.annotation?.player?.frame?.number;
      // Nếu nhảy tới đúng frame hiện tại, chỉ cần refresh dữ liệu chứ không tải lại PCD để tránh kẹt spinner
      if (curFrame === targetFrame) {
        return methods.refresh();
      }
      await ctx.dispatch(ctx.actionCreators.changeFrameAsync(targetFrame, undefined, undefined, true));
      return true;
    },

    // Đảo đầu xe 180 độ tức thời trong RAM (xoay chuẩn theo trục ez cục bộ của box)
    async flipActiveHeading({ clientID, frame, allFrames }) {
      const { job } = annotationState();
      const curFrame = frame !== undefined ? Number(frame) : ctx.store.getState().annotation.player.frame.number;
      if (!allFrames) {
        const states = await trackStatesAt(job, curFrame);
        const s = states.find((x) => x.clientID === Number(clientID));
        if (!s) return false;
        const pts = Array.from(s.points);
        const [rx, ry, rz] = flipEulerLocalZ([pts[3], pts[4], pts[5]]);
        pts[3] = rx; pts[4] = ry; pts[5] = rz;
        s.points = pts;
        await s.save();
        await methods.refresh();
        return true;
      }
      const { startFrame, stopFrame } = job;
      for (let f = startFrame; f <= stopFrame; f++) {
        try {
          const states = await trackStatesAt(job, f);
          const s = states.find((x) => x.clientID === Number(clientID));
          if (s && s.keyframe) {
            const pts = Array.from(s.points);
            const [rx, ry, rz] = flipEulerLocalZ([pts[3], pts[4], pts[5]]);
            pts[3] = rx; pts[4] = ry; pts[5] = rz;
            s.points = pts;
            await s.save();
          }
        } catch { /* tiếp tục */ }
      }
      await methods.refresh();
      return true;
    },

    // Dịch tâm theo trục ez cục bộ của box để đáy chạm mặt đất tức thời
    async snapActiveGround({ clientID, frame, offsetZ }) {
      const { job } = annotationState();
      const curFrame = frame !== undefined ? Number(frame) : ctx.store.getState().annotation.player.frame.number;
      const states = await trackStatesAt(job, curFrame);
      const s = states.find((x) => x.clientID === Number(clientID));
      if (!s) return false;
      const pts = Array.from(s.points);
      const a = Math.cos(pts[3]), b = Math.sin(pts[3]);
      const c = Math.cos(pts[4]), d = Math.sin(pts[4]);
      const shift = Number(offsetZ);
      pts[0] += d * shift;
      pts[1] += (-b * c) * shift;
      pts[2] += (a * c) * shift;
      s.points = pts;
      await s.save();
      await methods.refresh();
      return true;
    },

    // Lấy danh sách Labels kèm định nghĩa Attributes trực tiếp từ RAM của CVAT (luôn đồng bộ 100%)
    async readLabels() {
      const { job } = annotationState();
      const st = ctx.store.getState().annotation;
      const rawLabels = job.labels || st?.job?.labels || [];
      return rawLabels.map((l) => ({
        id: l.id,
        name: l.name,
        color: l.color,
        attributes: Array.isArray(l.attributes) ? l.attributes.map((a) => ({
          id: a.id,
          name: a.name,
          mutable: a.mutable !== false,
          input_type: (a.inputType || a.input_type || 'select').toLowerCase(),
          default_value: a.defaultValue ?? a.default_value ?? '',
          values: Array.isArray(a.values) ? [...a.values] : (typeof a.values === 'string' ? a.values.split(/\r?\n/) : []),
        })) : [],
      }));
    },

    // Lấy toạ độ cuboid của tất cả các track ở dải frames từ RAM của CVAT
    async readTracks({ frames }) {
      const { job } = annotationState();
      const tracks = new Map();
      for (const frame of frames) {
        let states;
        try { states = await trackStatesAt(job, frame); } catch { continue; }
        for (const s of states) {
          let t = tracks.get(s.clientID);
          if (!t) {
            t = { clientID: s.clientID, serverID: s.serverID ?? null, labelId: s.label.id, shapes: [] };
            tracks.set(s.clientID, t);
          }
          if (s.keyframe) {
            t.shapes.push({
              type: 'cuboid',
              frame,
              points: Array.from(s.points),
              outside: !!s.outside,
              occluded: !!s.occluded,
              z_order: s.zOrder || 0,
              rotation: 0,
              attributes: s.attributes && typeof s.attributes === 'object' && !Array.isArray(s.attributes)
                ? { ...s.attributes }
                : {},
            });
          }
        }
      }
      return [...tracks.values()].filter((t) => t.shapes.length).sort((a, b) => a.clientID - b.clientID);
    },

    // Lấy nhanh toạ độ của 1 track tại một frame cụ thể (cho tính năng Ghost Frames / Onion Skinning)
    async getTrackAtFrame({ clientID, frame }) {
      const { job } = annotationState();
      const states = await trackStatesAt(job, frame);
      const state = states.find((s) => s.clientID === clientID);
      if (!state) return null;
      return {
        clientID: state.clientID,
        frame,
        keyframe: state.keyframe,
        outside: state.outside,
        points: Array.from(state.points),
      };
    },

    // Ghi các keyframe và attributes vào bộ nhớ RAM của CVAT qua ObjectState (tự tạo Undo history trên CVAT)
    async applyTrack({ clientID, shapes, current }) {
      beginInternalOp();
      try {
        const { job } = annotationState();
        const want = new Map(shapes.map((s) => [s.frame, s]));
        const have = new Map(current.map((s) => [s.frame, s]));
        const same = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
        const sameAttrs = (a, b) => {
          const objA = a && typeof a === 'object' && !Array.isArray(a) ? a : {};
          const objB = b && typeof b === 'object' && !Array.isArray(b) ? b : {};
          const keysA = Object.keys(objA);
          const keysB = Object.keys(objB);
          if (keysA.length !== keysB.length) return false;
          return keysA.every((k) => (k in objB) && String(objA[k]) === String(objB[k]));
        };
        let changed = 0;

        // Cập nhật hoặc thêm keyframe
        for (const [frame, s] of want) {
          const old = have.get(frame);
          const state = (await trackStatesAt(job, frame)).find((x) => x.clientID === clientID);
          if (!state) {
            console.warn(`[CVAT Super Pro] Bỏ qua: Không tìm thấy track ${clientID} ở frame ${frame}`);
            continue;
          }
          const wasKf = !!state.keyframe;
          if (wasKf && old && same(old.points, s.points) && old.outside === s.outside && !!old.occluded === !!s.occluded && sameAttrs(old.attributes, s.attributes)) {
            continue;
          }
          // Đảm bảo nếu frame nằm trong danh sách keyframe của Tool nhưng trên CVAT đang là frame nội suy (keyframe == false)
          // thì luôn bật state.keyframe = true trước khi lưu
          if (!wasKf) state.keyframe = true;
          if (!old || !wasKf || !same(old.points, s.points)) state.points = s.points;
          if (!old || !wasKf || old.outside !== s.outside) state.outside = !!s.outside;
          if (!old || !wasKf || !!old.occluded !== !!s.occluded) state.occluded = !!s.occluded;
          if (!old || !wasKf || !sameAttrs(old.attributes, s.attributes)) {
            if (s.attributes && typeof s.attributes === 'object' && !Array.isArray(s.attributes)) {
              const nextAttrs = { ...(state.attributes || {}) };
              for (const [k, v] of Object.entries(s.attributes)) {
                const numK = Number(k);
                nextAttrs[Number.isNaN(numK) ? k : numK] = String(v);
              }
              state.attributes = nextAttrs;
            }
          }
          await state.save();
          changed += 1;
        }

        // Xoá bớt keyframe nếu người dùng bỏ
        for (const frame of have.keys()) {
          if (want.has(frame)) continue;
          const state = (await trackStatesAt(job, frame)).find((x) => x.clientID === clientID);
          if (!state || !state.keyframe) continue;
          state.keyframe = false;
          await state.save();
          changed += 1;
        }
        return { changed };
      } finally {
        endInternalOp();
      }
    },

    // Nhảy màn hình chính CVAT tới đúng Frame, kích hoạt Cuboid và lia Camera 3D nhìn thẳng vào tọa độ (X, Y, Z) của Cuboid
    async focusTrackInMain({ frame, clientID, targetCenter }) {
      if (!ctx) return false;
      const targetFrame = Number(frame);
      const curFrame = ctx.store?.getState()?.annotation?.player?.frame?.number;
      await methods.changeFrame({ frame: targetFrame });

      if (curFrame !== targetFrame) {
        await new Promise((r) => setTimeout(r, 110));
      }

      if (clientID !== undefined && clientID !== null) {
        await methods.activateObject({ clientID: Number(clientID) });
        const sideItem = document.getElementById(`cvat-objects-sidebar-state-item-${clientID}`);
        if (sideItem && typeof sideItem.scrollIntoView === 'function') {
          sideItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      // Lia Camera 3D của CVAT nhìn thẳng vào Cuboid
      try {
        const canvasInstance = ctx.store?.getState()?.annotation?.canvas?.instance;
        if (canvasInstance) {
          if (clientID !== undefined && clientID !== null && typeof canvasInstance.focus === 'function') {
            canvasInstance.focus(Number(clientID));
          }
          if (Array.isArray(targetCenter) && targetCenter.length === 3) {
            const [cx, cy, cz] = targetCenter;
            const ctrl =
              canvasInstance.view?.views?.perspective?.controls ||
              canvasInstance.controller?.perspective?.controls ||
              canvasInstance.model?.data?.views?.perspective?.controls ||
              null;
            if (ctrl) {
              if (typeof ctrl.setTarget === 'function') {
                ctrl.setTarget(cx, cy, cz, true);
              } else if (ctrl.target && typeof ctrl.target.set === 'function') {
                ctrl.target.set(cx, cy, cz);
                ctrl.update?.();
              }
            }
          }
          canvasInstance.render?.();
        }
      } catch { /* Bỏ qua nếu phiên bản CVAT đóng gói controls khác */ }

      return true;
    },

    // Đưa màn hình chính CVAT tới đúng Frame & vị trí 2 box bị trùng lặp (Overlap) để người dùng trực tiếp quan sát
    async focusOverlapInMain({ frame, clientIDA, clientIDB, targetCenter, highlightBoxes }) {
      if (!ctx) return false;
      const targetFrame = Number(frame);
      await methods.changeFrame({ frame: targetFrame });

      // Đợi ngắn nếu CVAT vừa chuyển frame để Three.js kịp nạp xong cuboid của frame mới
      await new Promise((r) => setTimeout(r, 120));

      if (clientIDA !== undefined && clientIDA !== null) {
        await methods.activateObject({ clientID: Number(clientIDA) });
        const sideItem = document.getElementById(`cvat-objects-sidebar-state-item-${clientIDA}`);
        if (sideItem && typeof sideItem.scrollIntoView === 'function') {
          sideItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      // Lia tâm xoay Camera 3D của CVAT về đúng trung điểm 2 box bị trùng lặp (nếu truy cập được controls)
      try {
        const canvasInstance = ctx.store?.getState()?.annotation?.canvas?.instance;
        if (canvasInstance && Array.isArray(targetCenter) && targetCenter.length === 3) {
          const [cx, cy, cz] = targetCenter;
          const ctrl =
            canvasInstance.controller?.perspective?.controls ||
            canvasInstance.view?.views?.perspective?.controls ||
            canvasInstance.model?.data?.views?.perspective?.controls ||
            null;
          if (ctrl && ctrl.target && typeof ctrl.target.set === 'function') {
            ctrl.target.set(cx, cy, cz);
            ctrl.update?.();
          }
        }
      } catch { /* Bỏ qua nếu phiên bản CVAT đóng gói controls khác */ }

      // Vẽ viền sáng nổi bật cho cả 2 box A và B trên màn hình 3D chính để nhìn thấy ngay sự chồng lấn
      if (Array.isArray(highlightBoxes) && highlightBoxes.length) {
        await methods.showGhostInMainScene({ ghosts: highlightBoxes });
        if (window.__cvatSuperProOverlapTimer) clearTimeout(window.__cvatSuperProOverlapTimer);
        window.__cvatSuperProOverlapTimer = setTimeout(() => {
          methods.hideGhostInMainScene().catch(() => {});
        }, 6000);
      }
      return true;
    },

    // Vẽ lại canvas CVAT mà không tải lại trang và không bị treo loading spinner
    async refresh() {
      if (!ctx) return false;
      const st = ctx.store.getState().annotation;
      const job = st?.job?.instance;
      if (!job) return false;
      const frame = st.player.frame.number;

      beginInternalOp();
      try {
        await methods.hideGhostInMainScene();
        // 1. Đọc danh sách states và history mới nhất từ Job trong RAM
        const filters = st.annotations?.filters || [];
        const states = await job.annotations.get(frame, true, filters);
        let history = {};
        if (job.actions && typeof job.actions.get === 'function') {
          history = await job.actions.get();
        }

        // 2. Dispatch FETCH_ANNOTATIONS_SUCCESS để Redux cập nhật sidebar và Three.js Canvas
        ctx.dispatch({
          type: 'FETCH_ANNOTATIONS_SUCCESS',
          payload: {
            states,
            intervals: [],
            history,
          },
        });

        // 3. Giải phóng spinner nếu canvas.ready đang bị kẹt ở trạng thái false
        if (!ctx.store.getState().annotation.canvas.ready) {
          ctx.dispatch({
            type: 'CONFIRM_CANVAS_READY',
            payload: {},
          });
        }

        // 4. Đồng bộ trực tiếp Three.js Canvas3D ngay lập tức (nếu instance khả dụng)
        const canvasInstance = ctx.store.getState().annotation.canvas.instance;
        const frameData = ctx.store.getState().annotation.player.frame.data;
        if (canvasInstance && typeof canvasInstance.setup === 'function' && frameData) {
          const hiddenZLayers = st.annotations?.zLayer?.hiddenByFrame?.get(frame) || new Set();
          canvasInstance.setup(
            frameData,
            states.filter((s) => s.objectType !== 'tag' && !hiddenZLayers.has(s.zOrder))
          );

          // Khôi phục Canvas về IDLE và tái kích hoạt cuboid đang chọn để dựng lại tay nắm điều khiển (resize/rotate gizmo)
          const activeId = st.annotations?.activatedStateID ?? st.canvas?.activeElement?.clientID ?? null;
          if (typeof canvasInstance.cancel === 'function') {
            canvasInstance.cancel();
          }
          if (typeof canvasInstance.activate === 'function' && activeId !== null) {
            canvasInstance.activate(Number(activeId), null);
          }
          canvasInstance.render?.();
        }
      } catch (err) {
        console.warn('[CVAT Super Pro] Lỗi khi làm mới canvas qua Redux:', err);
      } finally {
        endInternalOp();
      }

      return true;
    },

    // Giải phóng chế độ Canvas 3D để người dùng có thể thao tác bình thường trên CVAT gốc khi tạm ẩn tool
    async releaseCanvasMode() {
      if (!ctx) return false;
      const st = ctx.store.getState().annotation;
      const canvasInstance = st?.canvas?.instance;
      const activeId = st?.annotations?.activatedStateID ?? st?.canvas?.activeElement?.clientID ?? null;

      try {
        // 1. Tắt bỏ bóng ma ghost nếu đang soi vệt
        await methods.hideGhostInMainScene();

        // 2. Gọi cancel() trên canvasInstance để reset mode về Mode.IDLE
        if (canvasInstance && typeof canvasInstance.cancel === 'function') {
          canvasInstance.cancel();
        }

        // 3. Nếu có activeId, kích hoạt lại trên canvas để tạo lại các tay nắm resize/rotate trên Top/Side/Front views
        if (canvasInstance && typeof canvasInstance.activate === 'function' && activeId !== null) {
          canvasInstance.activate(Number(activeId), null);
        }

        // 4. Đồng bộ lại Redux action activateObject để sidebar và canvas cùng nhận biết
        if (ctx.actionCreators?.activateObject && activeId !== null) {
          ctx.dispatch(ctx.actionCreators.activateObject(Number(activeId), null, null));
        }

        // 5. Yêu cầu Three.js render lại 4 khung nhìn
        canvasInstance?.render?.();
      } catch (err) {
        console.warn('[CVAT Super Pro] Lỗi khi giải phóng canvas mode:', err);
      }
      return true;
    },

    // Bấm nút Save gốc của CVAT (kích hoạt quy trình lưu chính thống của CVAT)
    async saveCvat() {
      const { job } = annotationState();
      const btn = document.querySelector('.cvat-annotation-header-save-button');
      if (btn && !btn.classList.contains('cvat-annotation-disabled-header-button')) {
        btn.click();
        for (let i = 0; i < 600; i++) {
          await new Promise((r) => setTimeout(r, 100));
          if (!job.annotations.hasUnsavedChanges()) return { saved: true, via: 'button' };
        }
        throw new Error('CVAT lưu quá lâu (60s) - vui lòng kiểm tra kết nối mạng');
      }
      await job.annotations.save();
      await methods.refresh();
      return { saved: true, via: 'core' };
    },

    // Hiển thị bóng ma (Hộp 3D + Điểm LiDAR quá khứ) trực tiếp lên Three.js Scene chính của CVAT
    async showGhostInMainScene({ ghosts }) {
      if (!ctx || !Array.isArray(ghosts) || !ghosts.length) return false;
      const canvasInstance = ctx.store?.getState()?.annotation?.canvas?.instance;
      if (!canvasInstance || typeof canvasInstance.html !== 'function') return false;

      const doms = canvasInstance.html();
      const scene = doms?.perspective?.scene;
      if (!scene) return false;

      // Xóa bóng ma cũ nếu còn tồn tại
      await methods.hideGhostInMainScene();

      // Trích xuất các hàm khởi tạo Three.js từ đối tượng trong scene
      let BufferGeometry, BufferAttribute, LineSegments, LineBasicMaterial, Points, PointsMaterial, Object3D;

      if (window.THREE) {
        ({ BufferGeometry, BufferAttribute, LineSegments, LineBasicMaterial, Points, PointsMaterial, Object3D } = window.THREE);
      } else {
        scene.traverse((obj) => {
          if (obj.isPoints && !Points) {
            Points = obj.constructor;
            if (obj.material) PointsMaterial = obj.material.constructor;
            if (obj.geometry) {
              BufferGeometry = obj.geometry.constructor;
              if (obj.geometry.attributes?.position) {
                BufferAttribute = obj.geometry.attributes.position.constructor;
              }
            }
          }
          if (obj.isLineSegments && !LineSegments) {
            LineSegments = obj.constructor;
            if (obj.material) LineBasicMaterial = obj.material.constructor;
          }
        });

        // Nếu chưa tìm thấy LineSegments qua traverse, kiểm tra các con trực tiếp
        if (!LineSegments && scene.children) {
          const helper = scene.children.find((c) => c && c.isLineSegments);
          if (helper) {
            LineSegments = helper.constructor;
            if (helper.material) LineBasicMaterial = helper.material.constructor;
          }
        }

        Object3D = (scene.children[0] && scene.children[0].constructor?.__proto__) || scene.constructor?.__proto__ || scene.constructor;
      }

      if (!BufferGeometry || !BufferAttribute) {
        console.warn('[CVAT Super Pro] Không thể khởi tạo Three.js BufferGeometry');
        return false;
      }

      const BOX_EDGES = [
        [0, 1], [2, 3], [4, 5], [6, 7],
        [0, 2], [1, 3], [4, 6], [5, 7],
        [0, 4], [1, 5], [2, 6], [3, 7],
      ];

      const ghostGroup = new (Object3D || scene.constructor)();
      ghostGroup.name = 'cvat_super_pro_ghost_group';

      for (const g of ghosts) {
        const color = g.color || 0x00e5ff;

        // 1. Dựng khung viền hộp 3D (Wireframe Box)
        if (Array.isArray(g.boxCorners) && g.boxCorners.length === 8 && LineSegments && LineBasicMaterial) {
          const hasHeading = Array.isArray(g.headingLine) && g.headingLine.length === 2;
          const totalEdges = BOX_EDGES.length + (hasHeading ? 1 : 0);
          const linePos = new Float32Array(totalEdges * 2 * 3);
          let ptr = 0;

          for (const [i, j] of BOX_EDGES) {
            const p1 = g.boxCorners[i], p2 = g.boxCorners[j];
            linePos[ptr++] = p1[0]; linePos[ptr++] = p1[1]; linePos[ptr++] = p1[2];
            linePos[ptr++] = p2[0]; linePos[ptr++] = p2[1]; linePos[ptr++] = p2[2];
          }

          if (hasHeading) {
            const p1 = g.headingLine[0], p2 = g.headingLine[1];
            linePos[ptr++] = p1[0]; linePos[ptr++] = p1[1]; linePos[ptr++] = p1[2];
            linePos[ptr++] = p2[0]; linePos[ptr++] = p2[1]; linePos[ptr++] = p2[2];
          }

          const boxGeom = new BufferGeometry();
          boxGeom.setAttribute('position', new BufferAttribute(linePos, 3));
          const boxMat = new LineBasicMaterial({
            color,
            linewidth: 2,
            transparent: true,
            opacity: 0.9,
            depthTest: true,
          });
          const wireframe = new LineSegments(boxGeom, boxMat);
          wireframe.renderOrder = 999;
          ghostGroup.add(wireframe);
        }

        // 2. Dựng chùm điểm laser của vật thể tại frame quá khứ
        if (g.points && g.points.length && Points && PointsMaterial) {
          const ptsArray = g.points instanceof Float32Array ? g.points : new Float32Array(g.points);
          const ptsGeom = new BufferGeometry();
          ptsGeom.setAttribute('position', new BufferAttribute(ptsArray, 3));
          const ptsMat = new PointsMaterial({
            color,
            size: 0.055,
            transparent: true,
            opacity: 0.95,
            depthTest: true,
          });
          const pointsObj = new Points(ptsGeom, ptsMat);
          pointsObj.renderOrder = 999;
          ghostGroup.add(pointsObj);
        }
      }

      scene.add(ghostGroup);
      canvasInstance.render?.();
      return true;
    },

    // Gỡ bỏ bóng ma và giải phóng bộ nhớ đồ họa ngay khi người dùng nhả phím H
    async hideGhostInMainScene() {
      if (!ctx) return false;
      const canvasInstance = ctx.store?.getState()?.annotation?.canvas?.instance;
      if (!canvasInstance || typeof canvasInstance.html !== 'function') return false;

      const doms = canvasInstance.html();
      const scene = doms?.perspective?.scene;
      if (!scene) return false;

      const existing = scene.getObjectByName('cvat_super_pro_ghost_group');
      if (existing) {
        scene.remove(existing);
        existing.traverse((obj) => {
          if (obj.geometry && typeof obj.geometry.dispose === 'function') obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m?.dispose?.());
            else obj.material?.dispose?.();
          }
        });
        canvasInstance.render?.();
      }
      return true;
    },

    // Sắp xếp và đổi thứ tự Track ID trong RAM CVAT (Khôi phục đúng thứ tự ID Prelabel theo Guideline)
    async reassignTrackIDs({ assignments }) {
      if (!ctx) throw new Error('Chưa kết nối được với plugin CVAT');
      const { job } = annotationState();
      if (!job || !job.annotations) throw new Error('Không tìm thấy job annotations trên CVAT');
      if (!Array.isArray(assignments) || !assignments.length) return { ok: true, changed: 0 };

      beginInternalOp();
      try {
        const exported = await job.annotations.export();
        if (!exported || !Array.isArray(exported.tracks) || !exported.tracks.length) {
          throw new Error('Không tìm thấy tracks nào trong CVAT để sắp xếp ID');
        }

        const idMap = new Map();
        for (const item of assignments) {
          idMap.set(Number(item.oldId), Number(item.newId));
        }

        // Gán targetID cho từng track
        const tracksWithTarget = exported.tracks.map((t) => ({
          track: t,
          targetId: idMap.has(Number(t.clientID)) ? idMap.get(Number(t.clientID)) : Number(t.clientID),
        }));

        // Kiểm tra trùng lặp
        const seenTargetIds = new Set();
        for (const item of tracksWithTarget) {
          if (seenTargetIds.has(item.targetId)) {
            throw new Error(`Phát hiện trùng lặp Target ID #${item.targetId}`);
          }
          seenTargetIds.add(item.targetId);
        }

        const maxTargetId = Math.max(...tracksWithTarget.map((x) => x.targetId));
        const finalOrderedTracks = [];
        const trackByTarget = new Map(tracksWithTarget.map((x) => [x.targetId, x.track]));

        for (let id = 1; id <= maxTargetId; id++) {
          if (trackByTarget.has(id)) {
            finalOrderedTracks.push(trackByTarget.get(id));
          } else {
            // Placeholder rỗng: trackFactory của CVAT Core sẽ trả về null khi shapes rỗng
            // giúp clientID counter nhảy qua số này mà không sinh rác
            finalOrderedTracks.push({
              frame: 0,
              label_id: exported.tracks[0].label_id,
              shapes: [],
              attributes: [],
            });
          }
        }

        // Xóa collection trong RAM
        await job.annotations.clear();

        // Reset bộ đếm clientID về 0 để track đầu tiên nhận ID 1
        if (ctx.core?.config) {
          ctx.core.config.globalObjectsCounter = 0;
        }

        // Nạp lại toàn bộ dữ liệu đã sắp xếp đúng thứ tự ID mới
        await job.annotations.import({
          ...exported,
          tracks: finalOrderedTracks,
        });

        // Refresh Redux & Canvas3D
        await methods.refresh();
        emitEvt({ type: 'cvat-annotations-changed', source: 'reassign-ids' });

        return { ok: true, changed: assignments.length };
      } finally {
        endInternalOp();
      }
    },
  };

  document.addEventListener(REQ, async (e) => {
    let msg;
    try { msg = JSON.parse(e.detail); } catch { return; }
    if (!msg || !methods[msg.method]) return;
    let reply;
    try {
      reply = { id: msg.id, ok: true, result: await methods[msg.method](msg.args || {}) };
    } catch (err) {
      reply = { id: msg.id, ok: false, error: String((err && err.message) || err) };
    }
    document.dispatchEvent(new CustomEvent(RES, { detail: JSON.stringify(reply) }));
  });
})();
