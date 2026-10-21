// store.js - Quản lý trạng thái Annotation, Lịch sử Undo/Redo & Thuật toán Nội suy
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});
  const G = SP.geom;

  const deepClone = (v) => JSON.parse(JSON.stringify(v));

  function findAngleDiff(rightAngle, leftAngle) {
    let angleDiff = rightAngle - leftAngle;
    angleDiff = ((angleDiff + 180) % 360) - 180;
    if (Math.abs(angleDiff) >= 180) {
      angleDiff = 360 - Math.abs(angleDiff) * Math.sign(angleDiff) * -1;
    }
    return angleDiff;
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

    // 2. Nội suy góc quay (Euler XYZ, đặc biệt là góc Yaw trục Z)
    if (interpYaw) {
      const angles = left.slice(3, 6).concat(right.slice(3, 6))
        .map((a) => (a < 0 ? a + Math.PI * 2 : a))
        .map((a) => a * (180 / Math.PI));
      for (let i = 0; i < 3; i++) {
        let angle = (angles[i] + findAngleDiff(angles[i + 3], angles[i]) * offset) * (Math.PI / 180);
        if (angle > Math.PI) angle -= Math.PI * 2;
        out[3 + i] = angle;
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

    // Tịnh tiến hàng loạt đa frame (Batch Shift)
    shiftBatch(frames, [dx, dy, dz], dYaw = 0) {
      this.snapshot();
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
      this.snapshot();
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
      this.snapshot();
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
      this.snapshot();
      const frameSet = new Set(frames);
      const first = this.shapes[0]?.frame;
      this.shapes = this.shapes.filter((s) => !frameSet.has(s.frame) || s.frame === first);
      this.dirty = true;
    }

    // Chốt keyframe hàng loạt (biến các frame nội suy thành keyframe cố định)
    createKeyframesBatch(frames) {
      this.snapshot();
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
      this.snapshot();
      for (const f of frames) {
        this.setOutside(f, outside);
      }
      this.dirty = true;
    }

    toServer() {
      const t = deepClone(this.server);
      t.shapes = deepClone(this.shapes);
      return t;
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
      for (const t of list) {
        const serverTrack = { id: t.serverID, label_id: t.labelId, frame: t.shapes[0].frame, shapes: t.shapes };
        this.tracks.set(t.clientID, new TrackState(serverTrack, t.clientID, t.clientID));
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

    track(id) { return this.tracks.get(id); }
    labelName(labelId) { return this.labels.get(labelId)?.name ?? `label ${labelId}`; }
    labelColor(labelId) { return this.labels.get(labelId)?.color || '#5ad17a'; }
    dirtyTracks() { return [...this.tracks.values()].filter((t) => t.dirty); }

    // Lưu các track đã sửa thẳng vào RAM của CVAT qua ObjectState và kích hoạt nút Save gốc
    async save() {
      const dirty = this.dirtyTracks();
      if (!dirty.length) return { saved: 0 };

      let changed = 0;
      for (const t of dirty) {
        const res = await SP.bridge.call('applyTrack', {
          clientID: t.key,
          shapes: t.shapes,
          current: t.serverShapesSorted(),
        });
        changed += res.changed;
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
      }

      this.emit('saved');
      return { saved: dirty.length, changed, live: true };
    }
  }

  SP.JobStore = JobStore;
  SP.store = { interpolatePointsSelective, findAngleDiff, deepClone };
})();
