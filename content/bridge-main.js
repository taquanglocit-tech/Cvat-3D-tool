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
      return [...tracks.values()].filter((t) => t.shapes.length);
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
        if (!state) throw new Error(`Không tìm thấy track ${clientID} ở frame ${frame}`);
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

    // Vẽ lại canvas CVAT mà không tải lại trang
    async refresh() {
      const { frame } = annotationState();
      await ctx.dispatch(ctx.actionCreators.changeFrameAsync(frame, undefined, undefined, true));
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
