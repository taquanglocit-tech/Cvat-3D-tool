// bridge-main.js - Plugin cầu nối chạy trong ngữ cảnh trang (world: MAIN)
// Đăng ký trực tiếp với window.cvatUI của CVAT để đọc/ghi annotation trong RAM mà không cần reload
// Tác giả: taquanglocit-tech

(() => {
  if (window.__cvatSuperProBridge) return;
  window.__cvatSuperProBridge = true;

  const REQ = 'cvat-super-pro:req';
  const RES = 'cvat-super-pro:res';
  let ctx = null; // { core, store, dispatch, actionCreators }

  function register() {
    if (ctx || !window.cvatUI || typeof window.cvatUI.registerComponent !== 'function') return !!ctx;
    window.cvatUI.registerComponent((args) => {
      ctx = args;
      return {
        name: 'CVAT 3D Super Pro - taquanglocit-tech',
        destructor: () => { ctx = null; }
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

    // Đảo đầu xe 180 độ tức thời trong RAM
    async flipActiveHeading({ clientID, frame, allFrames }) {
      const { job } = annotationState();
      const curFrame = frame !== undefined ? Number(frame) : ctx.store.getState().annotation.player.frame.number;
      if (!allFrames) {
        const states = await trackStatesAt(job, curFrame);
        const s = states.find((x) => x.clientID === Number(clientID));
        if (!s) return false;
        const pts = Array.from(s.points);
        let yaw = pts[5] + Math.PI;
        while (yaw > Math.PI) yaw -= 2 * Math.PI;
        while (yaw < -Math.PI) yaw += 2 * Math.PI;
        pts[5] = yaw;
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
            let yaw = pts[5] + Math.PI;
            while (yaw > Math.PI) yaw -= 2 * Math.PI;
            while (yaw < -Math.PI) yaw += 2 * Math.PI;
            pts[5] = yaw;
            s.points = pts;
            await s.save();
          }
        } catch { /* tiếp tục */ }
      }
      await methods.refresh();
      return true;
    },

    // Dịch tâm Z sát đất tức thời
    async snapActiveGround({ clientID, frame, offsetZ }) {
      const { job } = annotationState();
      const curFrame = frame !== undefined ? Number(frame) : ctx.store.getState().annotation.player.frame.number;
      const states = await trackStatesAt(job, curFrame);
      const s = states.find((x) => x.clientID === Number(clientID));
      if (!s) return false;
      const pts = Array.from(s.points);
      pts[2] += Number(offsetZ);
      s.points = pts;
      await s.save();
      await methods.refresh();
      return true;
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
              attributes: [],
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

    // Ghi các keyframe vào bộ nhớ RAM của CVAT qua ObjectState (tự tạo Undo history trên CVAT)
    async applyTrack({ clientID, shapes, current }) {
      const { job } = annotationState();
      const want = new Map(shapes.map((s) => [s.frame, s]));
      const have = new Map(current.map((s) => [s.frame, s]));
      const same = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
      let changed = 0;

      // Cập nhật hoặc thêm keyframe
      for (const [frame, s] of want) {
        const old = have.get(frame);
        if (old && same(old.points, s.points) && old.outside === s.outside) continue;
        const state = (await trackStatesAt(job, frame)).find((x) => x.clientID === clientID);
        if (!state) {
          console.warn(`[CVAT Super Pro] Bỏ qua: Không tìm thấy track ${clientID} ở frame ${frame}`);
          continue;
        }
        if (!old || !same(old.points, s.points)) state.points = s.points;
        if (!old || old.outside !== s.outside) state.outside = s.outside;
        await state.save();
        changed += 1;
      }

      // Xoá bớt keyframe nếu người dùng bỏ
      for (const frame of have.keys()) {
        if (want.has(frame)) continue;
        const state = (await trackStatesAt(job, frame)).find((x) => x.clientID === clientID);
        if (!state) continue;
        state.keyframe = false;
        await state.save();
        changed += 1;
      }
      return { changed };
    },

    // Vẽ lại canvas CVAT mà không tải lại trang và không bị treo loading spinner
    async refresh() {
      if (!ctx) return false;
      const st = ctx.store.getState().annotation;
      const job = st?.job?.instance;
      if (!job) return false;
      const frame = st.player.frame.number;

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
