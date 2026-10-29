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

  // Chuẩn hóa danh sách shape để so sánh "dữ liệu Tool có khớp CVAT không" mà không bị nhiễu
  // bởi thứ tự khóa JSON, sai số số thực rất nhỏ hoặc kiểu dữ liệu của attribute (số / chuỗi)
  function canonShapes(shapes) {
    return (shapes || []).slice().sort((a, b) => a.frame - b.frame).map((s) => {
      const attrs = s.attributes && typeof s.attributes === 'object' && !Array.isArray(s.attributes) ? s.attributes : {};
      return [
        s.frame,
        (s.points || []).map((v) => Math.round(Number(v) * 1e6) / 1e6),
        s.outside ? 1 : 0,
        s.occluded ? 1 : 0,
        Object.keys(attrs).sort().map((k) => `${k}=${String(attrs[k])}`),
      ];
    });
  }

  function sameShapes(a, b) {
    return JSON.stringify(canonShapes(a)) === JSON.stringify(canonShapes(b));
  }

  // Thuật toán nội suy chọn lọc (Selective Interpolation)
  function interpolatePointsSelective(left, right, offset, opts = {}, basePoints = null) {
    const interpPos = opts.interpPos !== false;
    const interpYaw = opts.interpYaw !== false;
    const interpSize = opts.interpSize === true; // Mặc định KHÓA kích thước (Rigid body)
    const allowTilt = opts.allowTilt === true; // Nếu false: ép Roll và Pitch = 0 để xe không bị lảo đảo

    // Lấy tọa độ hiện tại của chính frame đó làm nền (nếu có), để thành phần nào không nội suy thì giữ nguyên
    const base = basePoints || left;
    const out = base.slice();

    // 1. Nội suy toạ độ vị trí (x, y, z)
    if (interpPos) {
      for (let i = 0; i < 3; i++) {
        out[i] = left[i] + (right[i] - left[i]) * offset;
      }
    }

    // 2. Nội suy góc quay (Euler XYZ, đặc biệt là góc Yaw trục Z theo đường ngắn nhất)
    if (interpYaw) {
      for (let i = 0; i < 3; i++) {
        if (!allowTilt && (i === 0 || i === 1)) {
          out[3 + i] = 0; // Khóa Roll và Pitch phẳng trên mặt phẳng đất
          continue;
        }
        const fromA = normalizeAngleRad(left[3 + i]);
        const toA = normalizeAngleRad(right[3 + i]);
        const diff = findAngleDiffRad(toA, fromA);
        out[3 + i] = normalizeAngleRad(fromA + diff * offset);
      }
    } else if (!allowTilt) {
      out[3] = 0;
      out[4] = 0;
    }

    // 3. Nội suy kích thước (L, W, H) - chỉ khi người dùng tắt "Khóa kích thước"
    const oldH = base[8];
    if (interpSize) {
      for (let i = 6; i < 9; i++) {
        out[i] = left[i] + (right[i] - left[i]) * offset;
      }
    } else if (opts.lockSizeMode === 'keep-current') {
      // Nội suy lại 1 frame đơn: "Khóa" nghĩa là giữ nguyên kích thước đang có của chính frame đó
      out[6] = base[6];
      out[7] = base[7];
      out[8] = base[8];
    } else {
      // Giữ nguyên kích thước chuẩn của keyframe đầu (left)
      out[6] = left[6];
      out[7] = left[7];
      out[8] = left[8];
    }

    // Nếu không nội suy vị trí (giữ nguyên vị trí cũ của frame) nhưng chiều cao H thay đổi,
    // tự động neo đáy Z cố định để bánh xe không bị lún hoặc bay khỏi mặt đường
    if (!interpPos && Number.isFinite(oldH) && Math.abs(out[8] - oldH) > 1e-5) {
      out[2] = base[2] + (out[8] - oldH) * 0.5;
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

    // Lấy toạ độ box và thuộc tính tại một frame bất kỳ (kèm nội suy nếu là frame giữa)
    at(frame, interpOpts = {}) {
      let left = null, right = null;
      for (const s of this.shapes) {
        if (s.frame <= frame) left = s;
        else { right = s; break; }
      }
      if (left && left.frame === frame) {
        return {
          points: left.points.slice(),
          box: G.pointsToBox(left.points),
          keyframe: true,
          outside: !!left.outside,
          occluded: !!left.occluded,
          attributes: deepClone(left.attributes && typeof left.attributes === 'object' && !Array.isArray(left.attributes) ? left.attributes : {}),
          left,
        };
      }
      if (left && right) {
        const offset = (frame - left.frame) / (right.frame - left.frame);
        // Khớp 100% với CVAT: cuboid-track.ts nội suy tuyến tính cả kích thước (L, W, H) và cung ngắn nhất cho góc
        const points = interpolatePointsSelective(left.points, right.points, offset, { interpSize: true, ...interpOpts });
        return {
          points,
          box: G.pointsToBox(points),
          keyframe: false,
          outside: !!left.outside,
          occluded: !!left.occluded,
          attributes: deepClone(left.attributes && typeof left.attributes === 'object' && !Array.isArray(left.attributes) ? left.attributes : {}),
          left,
        };
      }
      const single = left || right;
      if (!single) return null;
      return {
        points: single.points.slice(),
        box: G.pointsToBox(single.points),
        keyframe: single.frame === frame,
        outside: single === right ? true : !!single.outside,
        occluded: !!single.occluded,
        attributes: deepClone(single.attributes && typeof single.attributes === 'object' && !Array.isArray(single.attributes) ? single.attributes : {}),
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
      this.dirty = !sameShapes(this.shapes, this.server.shapes);
      return true;
    }

    redo() {
      if (!this.redoStack.length) return false;
      this.undoStack.push(deepClone(this.shapes));
      this.shapes = this.redoStack.pop();
      this.dirty = !sameShapes(this.shapes, this.server.shapes);
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
          occluded: base ? !!base.occluded : false,
          z_order: base ? base.z_order : 0,
          rotation: 0,
          attributes: base && base.attributes && typeof base.attributes === 'object' && !Array.isArray(base.attributes)
            ? deepClone(base.attributes)
            : {},
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
          occluded: !!base.occluded,
          z_order: base.z_order,
          rotation: 0,
          attributes: base.attributes && typeof base.attributes === 'object' && !Array.isArray(base.attributes)
            ? deepClone(base.attributes)
            : {},
        });
        this.shapes.sort((a, b) => a.frame - b.frame);
      }
      this.dirty = true;
    }

    setOccluded(frame, occluded) {
      const idx = this.keyframeIndex(frame);
      if (idx >= 0) {
        this.shapes[idx].occluded = !!occluded;
      } else {
        const pos = this.at(frame);
        if (!pos) return;
        const base = pos.left;
        this.shapes.push({
          type: 'cuboid',
          frame,
          points: pos.points.slice(),
          outside: !!pos.outside,
          occluded: !!occluded,
          z_order: base.z_order,
          rotation: 0,
          attributes: base.attributes && typeof base.attributes === 'object' && !Array.isArray(base.attributes)
            ? deepClone(base.attributes)
            : {},
        });
        this.shapes.sort((a, b) => a.frame - b.frame);
      }
      this.dirty = true;
    }

    setOccludedBatch(frames, occluded) {
      this.recordUndo();
      for (const f of frames) {
        this.setOccluded(f, occluded);
      }
      this.dirty = true;
    }

    // Cập nhật 1 thuộc tính (Attribute) cho danh sách frames (hỗ trợ cả mutable theo frame và immutable toàn track)
    setAttributeBatch(frames, attrId, value, isMutable = true) {
      this.recordUndo();
      const key = String(attrId);
      const valStr = String(value);
      if (!isMutable) {
        // Thuộc tính cấp Track (immutable): áp dụng cho tất cả shapes của track
        for (const sh of this.shapes) {
          if (!sh.attributes || Array.isArray(sh.attributes)) sh.attributes = {};
          sh.attributes[key] = valStr;
        }
      } else {
        for (const f of frames) {
          const idx = this.keyframeIndex(f);
          if (idx >= 0) {
            if (!this.shapes[idx].attributes || Array.isArray(this.shapes[idx].attributes)) {
              this.shapes[idx].attributes = {};
            }
            this.shapes[idx].attributes[key] = valStr;
          } else {
            const pos = this.at(f);
            if (!pos) continue;
            const base = pos.left;
            const attrs = base.attributes && typeof base.attributes === 'object' && !Array.isArray(base.attributes)
              ? deepClone(base.attributes)
              : {};
            attrs[key] = valStr;
            this.shapes.push({
              type: 'cuboid',
              frame: f,
              points: pos.points.slice(),
              outside: !!pos.outside,
              occluded: !!pos.occluded,
              z_order: base.z_order,
              rotation: 0,
              attributes: attrs,
            });
            this.shapes.sort((a, b) => a.frame - b.frame);
          }
        }
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

    // Tìm 2 keyframe kề cận BÊN NGOÀI dải [fromFrame, toFrame]
    outerKeyframes(fromFrame, toFrame) {
      const minF = Math.min(fromFrame, toFrame);
      const maxF = Math.max(fromFrame, toFrame);
      let left = null;
      let right = null;
      for (const s of this.shapes) {
        if (s.frame < minF) left = s;
        else if (s.frame > maxF) { right = s; break; }
      }
      return { left, right };
    }

    // Nội suy chọn lọc một dải frame từ fromFrame đến toFrame
    // Hỗ trợ 2 chế độ:
    // - opts.mode = 'inner' (mặc định): Nối giữa 2 frame đầu và cuối vùng chọn (minF <-> maxF)
    // - opts.mode = 'outer': Nối đè qua dải lỗi từ 2 keyframe kề cận bên ngoài
    interpolateRange(fromFrame, toFrame, opts = {}) {
      this.recordUndo();
      const minF = Math.min(fromFrame, toFrame);
      const maxF = Math.max(fromFrame, toFrame);
      if (minF > maxF) return;

      let leftPos = null;
      let rightPos = null;
      let startF = minF + 1;
      let endF = maxF - 1;
      let spanStartF = minF;
      let spanEndF = maxF;

      if (opts.mode === 'outer') {
        const outer = this.outerKeyframes(minF, maxF);
        if (!outer.left || !outer.right) return;
        leftPos = outer.left;
        rightPos = outer.right;
        spanStartF = outer.left.frame;
        spanEndF = outer.right.frame;
        startF = minF; // Ghi đè cả minF
        endF = maxF;   // Ghi đè cả maxF
      } else {
        leftPos = this.at(minF);
        rightPos = this.at(maxF);
        if (!leftPos || !rightPos) return;
        startF = minF + 1;
        endF = maxF - 1;
        spanStartF = minF;
        spanEndF = maxF;
      }

      if (spanEndF <= spanStartF) return;

      // Chụp lại tọa độ hiện tại của từng frame TRƯỚC khi ghi đè keyframe mới
      const currentSnapshots = new Map();
      for (let f = startF; f <= endF; f++) {
        const cur = this.at(f);
        if (cur) currentSnapshots.set(f, cur.points.slice());
      }

      for (let f = startF; f <= endF; f++) {
        const offset = (f - spanStartF) / (spanEndF - spanStartF);
        const basePts = currentSnapshots.get(f) || leftPos.points;
        const pts = interpolatePointsSelective(leftPos.points, rightPos.points, offset, opts, basePts);
        const box = G.pointsToBox(pts);
        this.setBox(f, box);
      }
      this.dirty = true;
    }

    // Tìm keyframe kề trái / kề phải NGHIÊM NGẶT của một frame (đúng cả khi frame đó là keyframe lẫn khi là frame nội suy)
    neighbourKeyframes(frame) {
      let left = null;
      let right = null;
      for (const s of this.shapes) {
        if (s.frame < frame) left = s;
        else if (s.frame > frame) { right = s; break; }
      }
      return { left, right };
    }

    // Nội suy lại ĐÚNG 1 frame dựa trên 2 keyframe kề trước / kề sau của nó.
    // Trục nào không được chọn (opts.interpPos / interpYaw / interpSize) thì giữ nguyên giá trị hiện có của frame.
    // Trả về { ok, reason?, left?, right?, offset? } để giao diện báo lỗi rõ ràng, không ném exception.
    interpolateFrameBetween(frame, opts = {}) {
      const { left, right } = this.neighbourKeyframes(frame);
      if (!left || !right) {
        return { ok: false, reason: !left && !right ? 'no-neighbour' : (!left ? 'no-left' : 'no-right') };
      }
      const cur = this.at(frame);
      if (!cur) return { ok: false, reason: 'no-data' };

      this.recordUndo();
      const offset = (frame - left.frame) / (right.frame - left.frame);
      const pts = interpolatePointsSelective(left.points, right.points, offset, { ...opts, lockSizeMode: 'keep-current' }, cur.points.slice());
      this.setBox(frame, G.pointsToBox(pts));
      // Ghi trực tiếp mảng points để không mất độ chính xác qua vòng đổi Box <-> Points
      const idx = this.keyframeIndex(frame);
      if (idx >= 0) {
        this.shapes[idx].points = pts;
        // Frame nội suy kế thừa trạng thái outside của keyframe trái; giữ nguyên khi chốt thành keyframe
        this.shapes[idx].outside = !!cur.outside;
      }
      this.dirty = true;
      return { ok: true, left, right, offset };
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

    // Áp dụng kích thước của profile cho danh sách frames, tự động neo đáy tiếp xúc mặt đất (kể cả khi mặt đường nghiêng)
    applyProfile(frames, targetSize) {
      if (!targetSize || targetSize.length < 3) return;
      this.recordUndo();
      for (const f of frames) {
        const pos = this.at(f);
        if (!pos) continue;
        const b = G.resizeKeepBottom(pos.box, targetSize);
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

    // Di chuyển dữ liệu profile sang các Track ID mới khi sắp xếp lại ID
    remapTrackIds(idMap) {
      this.data.tracks ||= {};
      const newTracks = {};
      for (const [tid, tdata] of Object.entries(this.data.tracks)) {
        const numId = Number(tid);
        const targetId = idMap.has(numId) ? String(idMap.get(numId)) : tid;
        newTracks[targetId] = tdata;
      }
      this.data.tracks = newTracks;
      this.save();
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
      // Trạng thái "chưa lưu" gốc của CVAT (job.annotations.hasUnsavedChanges), cập nhật qua sự kiện từ bridge-main
      this.cvatUnsaved = false;
      // Hàng đợi ghi tuần tự xuống CVAT: tránh nhiều applyTrack/refresh chạy chồng làm lệch RAM
      this._syncChain = Promise.resolve();
      this._syncQueued = new Map();
    }

    // on('sự-kiện', cb) chỉ nhận đúng sự kiện đó (cb nhận payload); on(cb) nhận mọi sự kiện (cb nhận tên, payload)
    on(nameOrCb, maybeCb) {
      const entry = typeof nameOrCb === 'function'
        ? { name: null, cb: nameOrCb }
        : { name: nameOrCb, cb: maybeCb };
      this.listeners.add(entry);
      return () => this.listeners.delete(entry);
    }
    emit(name, payload) {
      for (const e of [...this.listeners]) {
        if (e.name && e.name !== name) continue;
        try {
          if (e.name) e.cb(payload);
          else e.cb(name, payload);
        } catch (err) {
          console.warn(`[CVAT Super Pro] Lỗi xử lý sự kiện store "${name}":`, err);
        }
      }
    }

    async load() {
      const [job, meta, apiLabels, ramLabels] = await Promise.all([
        SP.api.getJob(this.jid),
        SP.api.getMeta(this.jid),
        SP.api.getLabels(this.jid).catch(() => []),
        SP.bridge.call('readLabels').catch(() => []),
      ]);
      this.job = job;
      this.meta = meta;
      this.labels = new Map();
      const normalizeAttrs = (attrs) => Array.isArray(attrs) ? attrs.map((a) => ({
        id: a.id,
        name: a.name || `Attr #${a.id}`,
        mutable: a.mutable !== false,
        input_type: (a.input_type || a.inputType || 'select').toLowerCase(),
        default_value: a.default_value ?? a.defaultValue ?? '',
        values: Array.isArray(a.values) ? [...a.values] : (typeof a.values === 'string' ? a.values.split(/\r?\n/) : []),
      })) : [];

      for (const l of (apiLabels || [])) {
        this.labels.set(l.id, { ...l, attributes: normalizeAttrs(l.attributes) });
      }
      for (const rl of (ramLabels || [])) {
        const cur = this.labels.get(rl.id);
        const normRamAttrs = normalizeAttrs(rl.attributes);
        if (!cur) {
          this.labels.set(rl.id, { ...rl, attributes: normRamAttrs });
        } else if (!cur.attributes?.length && normRamAttrs.length) {
          cur.attributes = normRamAttrs;
        }
      }
      this.frames = this.computeFrames();

      // Kết nối trực tiếp RAM qua Bridge
      const liveTracks = await SP.bridge.call('readTracks', { frames: this.frames });
      this.setLiveTracks(liveTracks);
      try {
        const st = await SP.bridge.call('status', {}, 2000);
        this.cvatUnsaved = !!(st && st.unsaved);
      } catch { /* giữ nguyên giá trị mặc định */ }
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
    // opts.external = true: thay đổi đến từ CVAT (Undo/Redo gốc, sửa tay, xóa/thêm track...) -
    //   lịch sử Undo/Redo của Tool cho các track bị đổi không còn đúng nên phải xóa để tránh ghi đè ngược.
    async syncFromCvat(opts = {}) {
      if (!this.frames || !this.frames.length) return false;
      try {
        // Chờ các lệnh Tool đang ghi xuống CVAT chạy xong, tránh đọc dữ liệu cũ rồi ghi đè lại thay đổi mới của Tool
        await this._syncChain;
        const liveTracks = await SP.bridge.call('readTracks', { frames: this.frames });
        if (!Array.isArray(liveTracks)) return false;
        const sorted = liveTracks.slice().sort((a, b) => a.clientID - b.clientID);
        const seen = new Set();
        const added = [];
        const removed = [];
        const changedIds = [];
        for (const t of sorted) {
          seen.add(t.clientID);
          const existing = this.tracks.get(t.clientID);
          if (!existing) {
            const serverTrack = { id: t.serverID, label_id: t.labelId, frame: t.shapes[0].frame, shapes: t.shapes };
            this.tracks.set(t.clientID, new TrackState(serverTrack, t.clientID, t.clientID));
            // Track mới tạo trên CVAT: chưa có bản lưu trên server nên coi là chưa lưu
            added.push(t.clientID);
          } else {
            const newShapes = deepClone(t.shapes).sort((a, b) => a.frame - b.frame);
            let changed = false;
            if (!sameShapes(existing.shapes, newShapes)) {
              existing.shapes = newShapes;
              changed = true;
            }
            existing.appliedShapes = deepClone(newShapes);
            // serverID có thể vừa được cấp sau khi lưu
            if (t.serverID != null && existing.server.id !== t.serverID) existing.server.id = t.serverID;
            if (t.labelId !== undefined && existing.server.label_id !== t.labelId) {
              existing.server.label_id = t.labelId;
              changed = true;
            }
            if (changed) {
              existing.dirty = !sameShapes(existing.shapes, existing.server.shapes);
              if (opts.external) {
                existing.undoStack = [];
                existing.redoStack = [];
              }
              changedIds.push(t.clientID);
            }
          }
        }
        for (const k of [...this.tracks.keys()]) {
          if (!seen.has(k)) {
            this.tracks.delete(k);
            removed.push(k);
          }
        }
        const anyChanged = !!(added.length || removed.length || changedIds.length);
        if (anyChanged) {
          this.emit('sync', {
            anyChanged,
            added,
            removed,
            changedIds,
            external: !!opts.external,
          });
        }
        return anyChanged;
      } catch (err) {
        console.warn('[CVAT Super Pro] Không thể đồng bộ ngược từ CVAT RAM:', err);
        return false;
      }
    }

    // CVAT vừa lưu xong (Save gốc / Ctrl+S / nút Lưu của Tool): đặt lại "bản chụp gốc" của mọi track
    // bằng đúng dữ liệu hiện có trong RAM CVAT, nhờ đó dirty tự tắt. Không đụng vào Undo/Redo của Tool.
    markSaved(liveTracks) {
      let cleaned = 0;
      for (const t of (liveTracks || [])) {
        const tr = this.tracks.get(t.clientID);
        if (!tr) continue;
        const liveShapes = deepClone(t.shapes).sort((a, b) => a.frame - b.frame);
        tr.server = { ...tr.server, id: t.serverID ?? tr.server.id, label_id: t.labelId ?? tr.server.label_id, shapes: liveShapes };
        tr.appliedShapes = deepClone(liveShapes);
        // Nếu Tool vẫn còn thay đổi chưa kịp ghi xuống CVAT lúc bấm lưu thì track đó phải giữ trạng thái dirty
        const stillDirty = !sameShapes(tr.shapes, liveShapes);
        if (tr.dirty && !stillDirty) cleaned += 1;
        tr.dirty = stillDirty;
      }
      this.cvatUnsaved = false;
      return cleaned;
    }

    // Đọc lại RAM CVAT rồi markSaved (dùng khi nhận sự kiện "đã lưu" từ bridge)
    async refreshAfterSave() {
      await this._syncChain;
      const live = await SP.bridge.call('readTracks', { frames: this.frames });
      const cleaned = this.markSaved(Array.isArray(live) ? live : []);
      // Đồng thời kéo luôn track mới / track bị xóa nếu có
      await this.syncFromCvat();
      this.emit('saved', { cleaned, source: 'cvat' });
      return cleaned;
    }

    // Cần lưu = Tool còn track dirty HOẶC CVAT báo còn thay đổi chưa lưu (ví dụ sửa attribute thẳng trên CVAT)
    hasPendingSave() { return this.dirtyTracks().length > 0 || !!this.cvatUnsaved; }

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
    labelAttributes(labelId) { return this.labels.get(labelId)?.attributes || []; }
    dirtyTracks() { return [...this.tracks.values()].filter((t) => t.dirty); }

    // Đồng bộ tức thời toạ độ track vào RAM của CVAT và ép 3D canvas vẽ lại ngay lập tức.
    // Các lệnh được xếp hàng tuần tự; nếu cùng 1 track đã đang xếp hàng (chưa chạy) thì dùng chung 1 lượt ghi
    // vì lúc chạy sẽ đọc track.shapes mới nhất.
    syncTrackToCvat(track) {
      if (!track) return Promise.resolve();
      const queued = this._syncQueued.get(track.key);
      if (queued) return queued;
      const run = this._syncChain.catch(() => {}).then(async () => {
        this._syncQueued.delete(track.key);
        return this._doSyncTrack(track);
      });
      this._syncQueued.set(track.key, run);
      this._syncChain = run.catch(() => {});
      return run;
    }

    async _doSyncTrack(track) {
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

    // Chờ mọi lệnh ghi đang xếp hàng hoàn tất
    async flushSync() {
      await this._syncChain;
    }

    // Lưu các track đã sửa thẳng vào RAM của CVAT qua ObjectState và kích hoạt nút Save gốc
    async save() {
      await this.flushSync();
      const dirty = this.dirtyTracks();
      // Không có gì để lưu ở cả Tool lẫn CVAT thì thoát sớm
      if (!dirty.length && !this.cvatUnsaved) return { saved: 0 };

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

      // Đọc lại trạng thái mới nhất từ RAM và đặt lại bản chụp gốc cho TẤT CẢ track
      const fresh = await SP.bridge.call('readTracks', { frames: this.frames });
      this.markSaved(Array.isArray(fresh) ? fresh : []);

      this.emit('saved', { source: 'tool' });
      return { saved: dirty.length, changed, live: true };
    }

    // Sắp xếp và đổi thứ tự Track ID trong RAM (Khôi phục ID Prelabel bị thiếu hoặc dồn toa)
    async reassignTrackIDs(assignments) {
      if (!Array.isArray(assignments) || !assignments.length) return false;
      await this.flushSync();
      const res = await SP.bridge.call('reassignTrackIDs', { assignments });
      if (!res || !res.ok) throw new Error(res?.error || 'Sắp xếp Track ID thất bại');

      const idMap = new Map();
      for (const item of assignments) {
        idMap.set(Number(item.oldId), Number(item.newId));
      }

      // 1. Cập nhật ProfileManager
      if (this.profileManager) {
        this.profileManager.remapTrackIds(idMap);
      }

      // 2. Cập nhật Map this.tracks
      const newTracksMap = new Map();
      for (const [oldId, tr] of this.tracks.entries()) {
        const newId = idMap.has(oldId) ? idMap.get(oldId) : oldId;
        tr.key = newId;
        tr.uiId = newId;
        newTracksMap.set(newId, tr);
      }
      this.tracks = newTracksMap;

      this.cvatUnsaved = true;
      this.emit('tracks-reordered', { idMap, assignments });
      this.emit('changed');
      return true;
    }
  }

  // ---------- Cấu hình ngưỡng cảnh báo QA (một nguồn sự thật duy nhất) ----------
  // Mọi nơi cần ngưỡng (Case 2 chọn KC, Case 3 quét lỗi, sparkline, HUD) đều đọc qua SP.qa.get()
  // thay vì dùng số cứng. Lưu bền trong localStorage để dùng lại giữa các job cùng guideline.
  const QA_STORAGE_KEY = 'cvat_super_pro_qa_v1';
  const QA_DEFAULTS = Object.freeze({
    iouPct: 25,              // Ngưỡng Overlap/IoU (%)
    yawDeg: 25,              // Ngưỡng giật góc quay Yaw (độ) khi 2 mốc cách nhau ≤ 3 frame
    flipMinDeg: 140,         // Ngưỡng đảo chiều đầu xe: từ (độ)
    flipMaxDeg: 220,         // Ngưỡng đảo chiều đầu xe: đến (độ)
    speedPerFrame: 3.0,      // Ngưỡng nhảy tốc độ (m/frame)
    sizeCm: 8,               // Ngưỡng co giãn kích thước (cm)
    maxDistM: 80,            // Ngưỡng khoảng cách tối đa tới gốc LiDAR (m)
    // Nhóm nâng cao (trước đây cũng là số cứng trong case3.js)
    yawRateDegPerFrame: 15,  // Giật góc Yaw tính theo tốc độ (°/frame) khi 2 mốc cách nhau > 3 frame
    flipMaxFrames: 10,       // Đảo đầu xe chỉ xét khi 2 mốc cách nhau không quá số frame này
    rollDeg: 20,             // Ngưỡng nghiêng sườn Roll (độ)
    pitchDeg: 25,            // Ngưỡng chúi dốc Pitch (độ)
  });
  // [min, max, đơn vị, số chữ số thập phân]
  const QA_RANGES = Object.freeze({
    iouPct: [1, 95, '%', 0],
    yawDeg: [10, 60, '°', 0],
    flipMinDeg: [90, 179, '°', 0],
    flipMaxDeg: [181, 270, '°', 0],
    speedPerFrame: [0.1, 50, 'm/frame', 1],
    sizeCm: [1, 100, 'cm', 0],
    maxDistM: [5, 500, 'm', 0],
    yawRateDegPerFrame: [1, 90, '°/frame', 0],
    flipMaxFrames: [1, 50, 'frame', 0],
    rollDeg: [1, 90, '°', 0],
    pitchDeg: [1, 90, '°', 0],
  });

  const qaListeners = new Set();
  let qaState = { global: {}, byLabel: {} };

  function qaLoad() {
    try {
      const raw = localStorage.getItem(QA_STORAGE_KEY);
      const obj = raw ? JSON.parse(raw) : null;
      if (obj && typeof obj === 'object') {
        qaState = { global: {}, byLabel: {} };
        for (const k of Object.keys(QA_DEFAULTS)) {
          const v = obj.global?.[k];
          if (Number.isFinite(v)) qaState.global[k] = v;
        }
        for (const [label, patch] of Object.entries(obj.byLabel || {})) {
          const clean = {};
          for (const k of Object.keys(QA_DEFAULTS)) {
            if (Number.isFinite(patch?.[k])) clean[k] = patch[k];
          }
          if (Object.keys(clean).length) qaState.byLabel[label] = clean;
        }
      }
    } catch { /* dữ liệu hỏng thì dùng mặc định */ }
  }

  function qaSave() {
    try {
      localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(qaState));
    } catch (e) {
      console.warn('[CVAT Super Pro] Lưu cấu hình QA thất bại:', e);
    }
  }

  function qaEmit() {
    for (const cb of qaListeners) {
      try { cb(); } catch (e) { console.warn('[CVAT Super Pro] Lỗi lắng nghe cấu hình QA:', e); }
    }
  }

  // Kiểm tra 1 giá trị theo khoảng cho phép: trả { ok, value, error }
  function qaValidate(key, raw) {
    const range = QA_RANGES[key];
    if (!range) return { ok: false, error: 'Tham số không hợp lệ' };
    const v = Number(raw);
    if (raw === '' || raw === null || raw === undefined || !Number.isFinite(v)) {
      return { ok: false, error: 'Phải là số' };
    }
    const [min, max, unit, digits] = range;
    if (v < min || v > max) return { ok: false, error: `Cho phép ${min} – ${max} ${unit}` };
    const f = 10 ** digits;
    return { ok: true, value: Math.round(v * f) / f };
  }

  // Kiểm tra ràng buộc chéo giữa nhiều tham số (ví dụ khoảng đảo đầu xe phải có min < max)
  function qaCrossCheck(cfg) {
    if (cfg.flipMinDeg >= cfg.flipMaxDeg) return 'Ngưỡng đảo đầu xe: "từ" phải nhỏ hơn "đến"';
    return null;
  }

  qaLoad();

  SP.qa = {
    DEFAULTS: QA_DEFAULTS,
    RANGES: QA_RANGES,
    validate: qaValidate,
    crossCheck: qaCrossCheck,

    // Cấu hình hiệu lực = mặc định < cấu hình toàn cục < ghi đè theo tên class (nếu truyền labelName)
    get(labelName) {
      const out = { ...QA_DEFAULTS, ...qaState.global };
      if (labelName && qaState.byLabel[labelName]) Object.assign(out, qaState.byLabel[labelName]);
      return out;
    },
    getGlobal() { return { ...QA_DEFAULTS, ...qaState.global }; },
    getOverrides() { return deepClone(qaState.byLabel); },

    // Đặt nhiều tham số toàn cục cùng lúc (đã validate sẵn ở giao diện); trả về lỗi đầu tiên nếu có
    set(patch) {
      const next = { ...qaState.global };
      for (const [k, raw] of Object.entries(patch || {})) {
        const r = qaValidate(k, raw);
        if (!r.ok) return { ok: false, key: k, error: r.error };
        next[k] = r.value;
      }
      const cross = qaCrossCheck({ ...QA_DEFAULTS, ...next });
      if (cross) return { ok: false, error: cross };
      qaState.global = next;
      qaSave();
      qaEmit();
      return { ok: true };
    },

    // Ghi đè ngưỡng cho 1 class (patch = null hoặc rỗng thì xóa ghi đè của class đó)
    setOverride(labelName, patch) {
      if (!labelName) return { ok: false, error: 'Thiếu tên class' };
      const clean = {};
      for (const [k, raw] of Object.entries(patch || {})) {
        if (raw === '' || raw === null || raw === undefined) continue;
        const r = qaValidate(k, raw);
        if (!r.ok) return { ok: false, key: k, error: r.error };
        clean[k] = r.value;
      }
      if (Object.keys(clean).length) {
        const cross = qaCrossCheck({ ...QA_DEFAULTS, ...qaState.global, ...clean });
        if (cross) return { ok: false, error: cross };
        qaState.byLabel[labelName] = clean;
      } else {
        delete qaState.byLabel[labelName];
      }
      qaSave();
      qaEmit();
      return { ok: true };
    },

    reset() {
      qaState = { global: {}, byLabel: {} };
      qaSave();
      qaEmit();
    },

    // Có khác mặc định không (để hiển thị chấm "đã tùy biến")
    isCustomized() {
      return Object.keys(qaState.global).some((k) => qaState.global[k] !== QA_DEFAULTS[k]) ||
        Object.keys(qaState.byLabel).length > 0;
    },

    onChange(cb) { qaListeners.add(cb); return () => qaListeners.delete(cb); },

    exportJSON() { return JSON.stringify({ version: 1, ...qaState }, null, 2); },
    importJSON(text) {
      let obj;
      try { obj = JSON.parse(text); } catch { return { ok: false, error: 'Tệp JSON không hợp lệ' }; }
      const backup = qaState;
      qaState = { global: {}, byLabel: {} };
      for (const k of Object.keys(QA_DEFAULTS)) {
        const r = obj?.global && k in obj.global ? qaValidate(k, obj.global[k]) : null;
        if (r && r.ok) qaState.global[k] = r.value;
      }
      for (const [label, patch] of Object.entries(obj?.byLabel || {})) {
        const clean = {};
        for (const k of Object.keys(QA_DEFAULTS)) {
          const r = patch && k in patch ? qaValidate(k, patch[k]) : null;
          if (r && r.ok) clean[k] = r.value;
        }
        if (Object.keys(clean).length) qaState.byLabel[label] = clean;
      }
      const cross = qaCrossCheck({ ...QA_DEFAULTS, ...qaState.global });
      if (cross) {
        qaState = backup;
        return { ok: false, error: cross };
      }
      qaSave();
      qaEmit();
      return { ok: true };
    },
  };

  SP.JobStore = JobStore;
  SP.ProfileManager = ProfileManager;
  SP.store = { interpolatePointsSelective, findAngleDiff: findAngleDiffRad, findAngleDiffRad, normalizeAngleRad, deepClone, sameShapes };
})();
