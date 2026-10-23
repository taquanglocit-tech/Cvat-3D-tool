// store.js - Quản lý trạng thái Annotation, Lịch sử Undo/Redo & Thuật toán Nội suy
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});
  const G = SP.geom;

  const deepClone = (v) => JSON.parse(JSON.stringify(v));

  function normalizeAngleRad(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }

  function findAngleDiffRad(toAngle, fromAngle) {
    let diff = (toAngle - fromAngle) % (2 * Math.PI);
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;
    return diff;
  }

  // Thuật toán nội suy chọn lọc (Selective Interpolation)
  function interpolatePointsSelective(left, right, offset, opts = {}) {
    const interpPos = opts.interpPos !== false;
    const interpYaw = opts.interpYaw !== false;
    const interpSize = opts.interpSize === true; // Mặc định KHÓA kích thước (Rigid body)

    const out = left.slice();

    // 1. Nội suy toạ độ vị trí (x, y, z)
    if (interpPos) {
      for (let i = 0; i < 3; i++) {
        out[i] = left[i] + (right[i] - left[i]) * offset;
      }
    }

    // 2. Nội suy góc quay (Euler XYZ, đặc biệt là góc Yaw trục Z theo đường ngắn nhất)
    if (interpYaw) {
      for (let i = 0; i < 3; i++) {
        const fromA = normalizeAngleRad(left[3 + i]);
        const toA = normalizeAngleRad(right[3 + i]);
        const diff = findAngleDiffRad(toA, fromA);
        out[3 + i] = normalizeAngleRad(fromA + diff * offset);
      }
    }

    // 3. Nội suy kích thước (L, W, H) - chỉ khi người dùng cho phép
    if (interpSize) {
      for (let i = 6; i < 9; i++) {
        out[i] = left[i] + (right[i] - left[i]) * offset;
      }
    } else {
      // Giữ nguyên kích thước của keyframe trái
      out[6] = left[6];
      out[7] = left[7];
      out[8] = left[8];
    }

    return out;
  }

  class TrackState {
    constructor(serverTrack, uiId, key) {
      this.uiId = uiId;
      this.key = key;
      this.load(serverTrack);
    }

    load(serverTrack) {
      this.server = deepClone(serverTrack);
      this.shapes = deepClone(serverTrack.shapes).sort((a, b) => a.frame - b.frame);
      this.appliedShapes = deepClone(this.shapes);
      this.undoStack = [];
      this.redoStack = [];
      this.dirty = false;
    }

    get id() { return this.key; }
    get serverId() { return this.server.id ?? null; }
    get labelId() { return this.server.label_id; }
    get firstFrame() { return this.shapes.length ? this.shapes[0].frame : this.server.frame; }
    get lastFrame() { return this.shapes.length ? this.shapes[this.shapes.length - 1].frame : this.server.frame; }

    keyframeIndex(frame) {
      return this.shapes.findIndex((s) => s.frame === frame);
    }

    // Lấy toạ độ box tại một frame bất kỳ (kèm nội suy nếu là frame giữa)
    at(frame, interpOpts = {}) {
      let left = null, right = null;
      for (const s of this.shapes) {
        if (s.frame <= frame) left = s;
        else { right = s; break; }
      }
      if (left && left.frame === frame) {
        return { points: left.points.slice(), box: G.pointsToBox(left.points), keyframe: true, outside: left.outside, left };
      }
      if (left && right) {
        const offset = (frame - left.frame) / (right.frame - left.frame);
        const points = interpolatePointsSelective(left.points, right.points, offset, interpOpts);
        return { points, box: G.pointsToBox(points), keyframe: false, outside: left.outside, left };
      }
      const single = left || right;
      if (!single) return null;
      return {
        points: single.points.slice(),
        box: G.pointsToBox(single.points),
        keyframe: single.frame === frame,
        outside: single === right ? true : single.outside,
        left: single,
      };
    }

    snapshot() {
      this.undoStack.push(deepClone(this.shapes));
      if (this.undoStack.length > 200) this.undoStack.shift();
      this.redoStack = [];
    }

    undo() {
      if (!this.undoStack.length) return false;
      this.redoStack.push(deepClone(this.shapes));
      this.shapes = this.undoStack.pop();
      this.dirty = JSON.stringify(this.shapes) !== JSON.stringify(this.serverShapesSorted());
      return true;
    }

    redo() {
      if (!this.redoStack.length) return false;
      this.undoStack.push(deepClone(this.shapes));
      this.shapes = this.redoStack.pop();
      this.dirty = true;
      return true;
    }

    serverShapesSorted() {
      return deepClone(this.server.shapes).sort((a, b) => a.frame - b.frame);
    }

    setBox(frame, box) {
      const idx = this.keyframeIndex(frame);
      if (idx >= 0) {
        this.shapes[idx].points = G.boxToPoints(box, this.shapes[idx].points);
      } else {
        const pos = this.at(frame);
        const base = pos ? pos.left : this.shapes[0];
        const shape = {
          type: 'cuboid',
          frame,
          points: G.boxToPoints(box, pos ? pos.points : base.points),
          outside: false,
          occluded: base ? base.occluded : false,
          z_order: base ? base.z_order : 0,
          rotation: 0,
          attributes: base ? deepClone(base.attributes || []) : [],
        };
        this.shapes.push(shape);
        this.shapes.sort((a, b) => a.frame - b.frame);
      }
      this.dirty = true;
    }

    setOutside(frame, outside) {
      const idx = this.keyframeIndex(frame);
      if (idx >= 0) {
        this.shapes[idx].outside = outside;
      } else {
        const pos = this.at(frame);
        if (!pos) return;
        const base = pos.left;
        this.shapes.push({
          type: 'cuboid',
          frame,
          points: pos.points.slice(),
          outside,
          occluded: base.occluded,
          z_order: base.z_order,
          rotation: 0,
          attributes: deepClone(base.attributes || []),
        });
        this.shapes.sort((a, b) => a.frame - b.frame);
      }
      this.dirty = true;
    }

    recordUndo() {
      if (SP.app && typeof SP.app.snapshot === 'function') {
        SP.app.snapshot([this.id]);
      } else {
        this.snapshot();
      }
    }

    // Tịnh tiến hàng loạt đa frame (Batch Shift)
    shiftBatch(frames, [dx, dy, dz], dYaw = 0) {
      this.recordUndo();
      for (const f of frames) {
        const pos = this.at(f);
        if (!pos) continue;
        const box = G.cloneBox(pos.box);
        box.c[0] += dx;
        box.c[1] += dy;
        box.c[2] += dz;
        if (dYaw !== 0) {
          box.r = G.rotateLocal(box.r, 2, dYaw);
        }
        this.setBox(f, box);
      }
      this.dirty = true;
    }

    // Đảo chiều hướng đầu xe 180 độ tại các frames chỉ định
    flipHeadingBatch(frames) {
      this.recordUndo();
      for (const f of frames) {
        const pos = this.at(f);
        if (!pos) continue;
        const box = G.cloneBox(pos.box);
        box.r = G.quickFlipHeading(box.r);
        this.setBox(f, box);
      }
      this.dirty = true;
    }

    // Nội suy chọn lọc một dải frame từ fromFrame đến toFrame
    interpolateRange(fromFrame, toFrame, opts = {}) {
      this.recordUndo();
      const minF = Math.min(fromFrame, toFrame);
      const maxF = Math.max(fromFrame, toFrame);
      if (minF >= maxF) return;

      const leftPos = this.at(minF);
      const rightPos = this.at(maxF);
      if (!leftPos || !rightPos) return;

      for (let f = minF + 1; f < maxF; f++) {
        const offset = (f - minF) / (maxF - minF);
        const pts = interpolatePointsSelective(leftPos.points, rightPos.points, offset, opts);
        const box = G.pointsToBox(pts);
        this.setBox(f, box);
      }
      this.dirty = true;
    }

    // Xoá keyframe hàng loạt (để các frame này tự động nội suy)
    removeKeyframesBatch(frames) {
      this.recordUndo();
      const frameSet = new Set(frames);
      const first = this.shapes[0]?.frame;
      this.shapes = this.shapes.filter((s) => !frameSet.has(s.frame) || s.frame === first);
      this.dirty = true;
    }

    // Chốt keyframe hàng loạt (biến các frame nội suy thành keyframe cố định)
    createKeyframesBatch(frames) {
      this.recordUndo();
      for (const f of frames) {
        const pos = this.at(f);
        if (pos && !pos.keyframe) {
          this.setBox(f, pos.box);
        }
      }
      this.dirty = true;
    }

    // Đặt trạng thái outside hàng loạt
    setOutsideBatch(frames, outside) {
      this.recordUndo();
      for (const f of frames) {
        this.setOutside(f, outside);
      }
      this.dirty = true;
    }

    // Đồng bộ kích thước của 1 box sang tất cả các frame của track
    syncSizeToAll(newSize) {
      if (!newSize || newSize.length < 3) return;
      this.recordUndo();
      for (const sh of this.shapes) {
        sh.points[6] = newSize[0];
        sh.points[7] = newSize[1];
        sh.points[8] = newSize[2];
      }
      this.dirty = true;
    }

    // Áp dụng kích thước của profile cho danh sách frames, tự động neo đáy tiếp xúc mặt đất
    applyProfile(frames, targetSize) {
      if (!targetSize || targetSize.length < 3) return;
      this.recordUndo();
      const [newL, newW, newH] = targetSize;
      for (const f of frames) {
        const pos = this.at(f);
        if (!pos) continue;
        const b = G.cloneBox(pos.box);
        const oldH = b.s[2];
        b.c[2] += (newH - oldH) / 2; // Giữ nguyên đáy tiếp xúc đất
        b.s = [newL, newW, newH];
        this.setBox(f, b);
      }
      this.dirty = true;
    }

    toServer() {
      const t = deepClone(this.server);
      t.shapes = deepClone(this.shapes);
      return t;
    }
  }

  // Quản lý các cấu hình kích thước đặt tên (Named Size Profiles) lưu trữ qua Side-Channel (localStorage)
  // Đảm bảo TUYỆT ĐỐI không chèn thuộc tính lạ vào shapes hay server format của CVAT
  class ProfileManager {
    constructor(jid) {
      this.jid = jid;
      this.storageKey = `cvat_super_pro_profiles_jid_${jid}`;
      this.data = this.load();
    }

    load() {
      try {
        const raw = localStorage.getItem(this.storageKey);
        return raw ? JSON.parse(raw) : { tracks: {} };
      } catch {
        return { tracks: {} };
      }
    }

    save() {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
      } catch (e) {
        console.warn('[CVAT Super Pro] Lưu Profile thất bại:', e);
      }
    }

    getTrackData(trackId) {
      this.data.tracks ||= {};
      const tid = String(trackId);
      this.data.tracks[tid] ||= { profiles: {}, assignments: {} };
      return this.data.tracks[tid];
    }

    getProfiles(trackId) {
      const td = this.getTrackData(trackId);
      return Object.values(td.profiles);
    }

    getProfile(trackId, profileId) {
      const td = this.getTrackData(trackId);
      return td.profiles[profileId] || null;
    }

    createProfile(trackId, name, size, color = null) {
      const td = this.getTrackData(trackId);
      const id = 'prof_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
      const palette = ['#58a6ff', '#bc8cff', '#3fb950', '#f0883e', '#d29922', '#f778ba', '#39c5bb'];
      const chosenColor = color || palette[Object.keys(td.profiles).length % palette.length];
      const profile = {
        id,
        name: name || `Cấu hình ${Object.keys(td.profiles).length + 1}`,
        size: [Number(size[0].toFixed(3)), Number(size[1].toFixed(3)), Number(size[2].toFixed(3))],
        color: chosenColor,
      };
      td.profiles[id] = profile;
      this.save();
      return profile;
    }

    updateProfile(trackId, profileId, updates) {
      const td = this.getTrackData(trackId);
      if (!td.profiles[profileId]) return null;
      Object.assign(td.profiles[profileId], updates);
      this.save();
      return td.profiles[profileId];
    }

    deleteProfile(trackId, profileId) {
      const td = this.getTrackData(trackId);
      delete td.profiles[profileId];
      for (const [frame, pid] of Object.entries(td.assignments)) {
        if (pid === profileId) delete td.assignments[frame];
      }
      this.save();
    }

    getFrameProfileId(trackId, frame) {
      const td = this.getTrackData(trackId);
      return td.assignments[String(frame)] || null;
    }

    getFrameProfile(trackId, frame) {
      const pid = this.getFrameProfileId(trackId, frame);
      return pid ? this.getProfile(trackId, pid) : null;
    }

    assignFrames(trackId, frames, profileId) {
      const td = this.getTrackData(trackId);
      for (const f of frames) {
        const k = String(f);
        if (profileId) {
          td.assignments[k] = profileId;
        } else {
          delete td.assignments[k];
        }
      }
      this.save();
    }

    getFramesWithProfile(trackId, profileId) {
      const td = this.getTrackData(trackId);
      const out = [];
      for (const [frame, pid] of Object.entries(td.assignments)) {
        if (pid === profileId) out.push(Number(frame));
      }
      return out.sort((a, b) => a - b);
    }
  }

  class JobStore {
    constructor(jid) {
      this.jid = jid;
      this.listeners = new Set();
      this.tracks = new Map();
      this.labels = new Map();
      this.frames = [];
      this.mode = 'live';
      this.profileManager = new ProfileManager(jid);
    }

    on(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
    emit(what) { for (const cb of this.listeners) cb(what); }

    async load() {
      const [job, meta, labels] = await Promise.all([
        SP.api.getJob(this.jid),
        SP.api.getMeta(this.jid),
        SP.api.getLabels(this.jid),
      ]);
      this.job = job;
      this.meta = meta;
      this.labels = new Map(labels.map((l) => [l.id, l]));
      this.frames = this.computeFrames();

      // Kết nối trực tiếp RAM qua Bridge
      const liveTracks = await SP.bridge.call('readTracks', { frames: this.frames });
      this.setLiveTracks(liveTracks);
      this.emit('load');
    }

    setLiveTracks(list) {
      this.tracks = new Map();
      // Luôn sắp xếp theo clientID tăng dần để đồng bộ 100% với thứ tự CVAT UI & tool QA/QC
      const sorted = (list || []).slice().sort((a, b) => a.clientID - b.clientID);
      for (const t of sorted) {
        const serverTrack = { id: t.serverID, label_id: t.labelId, frame: t.shapes[0].frame, shapes: t.shapes };
        this.tracks.set(t.clientID, new TrackState(serverTrack, t.clientID, t.clientID));
      }
    }

    // Đồng bộ ngược lại từ RAM của CVAT vào Store (khi người dùng vừa chỉnh sửa trực tiếp trên CVAT gốc)
    async syncFromCvat() {
      if (!this.frames || !this.frames.length) return false;
      try {
        const liveTracks = await SP.bridge.call('readTracks', { frames: this.frames });
        if (!Array.isArray(liveTracks)) return false;
        const sorted = liveTracks.slice().sort((a, b) => a.clientID - b.clientID);
        const seen = new Set();
        for (const t of sorted) {
          seen.add(t.clientID);
          const existing = this.tracks.get(t.clientID);
          if (!existing) {
            const serverTrack = { id: t.serverID, label_id: t.labelId, frame: t.shapes[0].frame, shapes: t.shapes };
            this.tracks.set(t.clientID, new TrackState(serverTrack, t.clientID, t.clientID));
          } else {
            const newShapes = deepClone(t.shapes).sort((a, b) => a.frame - b.frame);
            if (JSON.stringify(existing.shapes) !== JSON.stringify(newShapes)) {
              existing.shapes = newShapes;
              existing.appliedShapes = deepClone(newShapes);
            }
          }
        }
        for (const k of this.tracks.keys()) {
          if (!seen.has(k)) this.tracks.delete(k);
        }
        return true;
      } catch (err) {
        console.warn('[CVAT Super Pro] Không thể đồng bộ ngược từ CVAT RAM:', err);
        return false;
      }
    }

    computeFrames() {
      const m = this.meta;
      if (Array.isArray(m.included_frames) && m.included_frames.length) {
        return m.included_frames.slice().sort((a, b) => a - b);
      }
      const stepMatch = /step\s*=\s*(\d+)/.exec(m.frame_filter || '');
      const step = stepMatch ? Number(stepMatch[1]) : 1;
      const out = [];
      for (let f = m.start_frame; f <= m.stop_frame; f += step) out.push(f);
      return out;
    }

    // Tra cứu track linh hoạt: hỗ trợ cả clientID (giao diện) lẫn serverId (database của CVAT)
    track(id) {
      const num = Number(id);
      return this.tracks.get(num) || [...this.tracks.values()].find((t) => t.serverId === num) || null;
    }
    labelName(labelId) { return this.labels.get(labelId)?.name ?? `label ${labelId}`; }
    labelColor(labelId) { return this.labels.get(labelId)?.color || '#5ad17a'; }
    dirtyTracks() { return [...this.tracks.values()].filter((t) => t.dirty); }

    // Đồng bộ tức thời toạ độ track vào RAM của CVAT và ép 3D canvas vẽ lại ngay lập tức
    async syncTrackToCvat(track) {
      if (!track) return;
      try {
        const current = track.appliedShapes || track.serverShapesSorted();
        const res = await SP.bridge.call('applyTrack', {
          clientID: track.key,
          shapes: track.shapes,
          current,
        });
        track.appliedShapes = deepClone(track.shapes);
        await SP.bridge.call('refresh');
        this.emit('synced', { trackId: track.id, changed: res?.changed });
        return res;
      } catch (err) {
        console.warn('[CVAT Super Pro] Đồng bộ tức thời sang CVAT RAM thất bại:', err);
      }
    }

    // Lưu các track đã sửa thẳng vào RAM của CVAT qua ObjectState và kích hoạt nút Save gốc
    async save() {
      const dirty = this.dirtyTracks();
      if (!dirty.length) return { saved: 0 };

      let changed = 0;
      for (const t of dirty) {
        const current = t.appliedShapes || t.serverShapesSorted();
        const res = await SP.bridge.call('applyTrack', {
          clientID: t.key,
          shapes: t.shapes,
          current,
        });
        t.appliedShapes = deepClone(t.shapes);
        changed += (res?.changed || 0);
      }

      // Kích hoạt lưu chính thức của CVAT
      await SP.bridge.call('saveCvat');

      // Đọc lại trạng thái mới nhất từ RAM
      const fresh = new Map((await SP.bridge.call('readTracks', { frames: this.frames })).map((t) => [t.clientID, t]));
      for (const t of dirty) {
        const f = fresh.get(t.key);
        if (!f) continue;
        const undo = t.undoStack, redo = t.redoStack;
        t.load({ ...t.server, id: f.serverID, shapes: f.shapes });
        t.undoStack = undo;
        t.redoStack = redo;
        t.appliedShapes = deepClone(f.shapes);
      }

      this.emit('saved');
      return { saved: dirty.length, changed, live: true };
    }
  }

  SP.JobStore = JobStore;
  SP.ProfileManager = ProfileManager;
  SP.store = { interpolatePointsSelective, findAngleDiff: findAngleDiffRad, findAngleDiffRad, normalizeAngleRad, deepClone };
})();
