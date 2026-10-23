// iou3d.js - Module tính toán 3D IoU & Phát hiện Trùng lặp (Overlap Detection) cho Cuboid 3D
// Sử dụng thuật toán cắt đa giác lồi Sutherland-Hodgman trên mặt phẳng BEV + Giao cắt trục Z
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});
  const G = SP.geom;

  // Tính 4 đỉnh 2D của đáy box trên mặt phẳng Bird's Eye View (BEV: X, Y)
  function getBox2DVertices(box) {
    const ax = G.axes(box.r);
    const hx = box.s[0] / 2;
    const hy = box.s[1] / 2;
    const corners2D = [
      [hx, hy],
      [-hx, hy],
      [-hx, -hy],
      [hx, -hy]
    ];
    return corners2D.map(([lx, ly]) => {
      const p = G.localToWorld([lx, ly, 0], box.c, ax);
      return [p[0], p[1]];
    });
  }

  // Tính diện tích đa giác bằng công thức Shoelace (Gauss)
  function polygonArea(poly) {
    const n = poly.length;
    if (n < 3) return 0;
    let area = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += poly[i][0] * poly[j][1] - poly[j][0] * poly[i][1];
    }
    return area / 2;
  }

  function ensureCCW(poly) {
    if (polygonArea(poly) < 0) {
      return poly.slice().reverse();
    }
    return poly;
  }

  function lineIntersection(p1, p2, c1, c2) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const dcx = c2[0] - c1[0];
    const dcy = c2[1] - c1[1];
    const denom = dx * dcy - dy * dcx;
    if (Math.abs(denom) < 1e-9) return null;
    const t = ((c1[0] - p1[0]) * dcy - (c1[1] - p1[1]) * dcx) / denom;
    return [p1[0] + t * dx, p1[1] + t * dy];
  }

  function isInside(p, c1, c2) {
    return (c2[0] - c1[0]) * (p[1] - c1[1]) - (c2[1] - c1[1]) * (p[0] - c1[0]) >= -1e-9;
  }

  // Thuật toán cắt đa giác Sutherland-Hodgman
  function clipPolygon(subjectPoly, clipPoly) {
    let outputList = ensureCCW(subjectPoly);
    const clip = ensureCCW(clipPoly);

    for (let i = 0; i < clip.length; i++) {
      const c1 = clip[i];
      const c2 = clip[(i + 1) % clip.length];
      const inputList = outputList;
      outputList = [];
      if (!inputList.length) break;

      let s = inputList[inputList.length - 1];
      for (let j = 0; j < inputList.length; j++) {
        const e = inputList[j];
        if (isInside(e, c1, c2)) {
          if (!isInside(s, c1, c2)) {
            const inter = lineIntersection(s, e, c1, c2);
            if (inter) outputList.push(inter);
          }
          outputList.push(e);
        } else if (isInside(s, c1, c2)) {
          const inter = lineIntersection(s, e, c1, c2);
          if (inter) outputList.push(inter);
        }
        s = e;
      }
    }
    return outputList;
  }

  // Tính thể tích giao nhau và 3D IoU giữa 2 Cuboid OBB
  function compute3DIoU(boxA, boxB) {
    // 1. Giao cắt đáy đa giác BEV
    const polyA = getBox2DVertices(boxA);
    const polyB = getBox2DVertices(boxB);
    const clipped = clipPolygon(polyA, polyB);
    const areaIntersect = Math.max(0, Math.abs(polygonArea(clipped)));

    // 2. Giao cắt độ cao Z
    const hzA = boxA.s[2] / 2, hzB = boxB.s[2] / 2;
    const zMinA = boxA.c[2] - hzA, zMaxA = boxA.c[2] + hzA;
    const zMinB = boxB.c[2] - hzB, zMaxB = boxB.c[2] + hzB;
    const hOverlap = Math.max(0, Math.min(zMaxA, zMaxB) - Math.max(zMinA, zMinB));

    // 3. Thể tích và tỷ lệ
    const vIntersect = areaIntersect * hOverlap;
    const vA = boxA.s[0] * boxA.s[1] * boxA.s[2];
    const vB = boxB.s[0] * boxB.s[1] * boxB.s[2];

    const vUnion = vA + vB - vIntersect;
    const iou = vUnion > 0 ? vIntersect / vUnion : 0;
    const ratioA = vA > 0 ? vIntersect / vA : 0;
    const ratioB = vB > 0 ? vIntersect / vB : 0;
    const maxOverlapRatio = Math.max(ratioA, ratioB);

    return {
      iou,
      maxOverlapRatio,
      ratioA,
      ratioB,
      vIntersect,
      areaIntersect,
      hOverlap,
    };
  }

  // Tìm các cặp track bị trùng lặp tại 1 frame cụ thể
  function findFrameOverlaps(store, frame, threshold = 0.25) {
    const activeTracks = [];
    for (const t of store.tracks.values()) {
      const pos = t.at(frame);
      if (pos && !pos.outside) {
        activeTracks.push({ track: t, box: pos.box, keyframe: pos.keyframe });
      }
    }

    const overlaps = [];
    for (let i = 0; i < activeTracks.length; i++) {
      for (let j = i + 1; j < activeTracks.length; j++) {
        const a = activeTracks[i];
        const b = activeTracks[j];

        // Lọc thô bằng khoảng cách tâm trước (Bouding Sphere / Distance Check)
        const distSq = (a.box.c[0] - b.box.c[0]) ** 2 + (a.box.c[1] - b.box.c[1]) ** 2 + (a.box.c[2] - b.box.c[2]) ** 2;
        const maxDimA = Math.hypot(a.box.s[0], a.box.s[1], a.box.s[2]) / 2;
        const maxDimB = Math.hypot(b.box.s[0], b.box.s[1], b.box.s[2]) / 2;
        if (distSq > (maxDimA + maxDimB) ** 2) continue; // Ở quá xa, không thể giao nhau

        // Tính toán chi tiết
        const res = compute3DIoU(a.box, b.box);
        if (res.iou >= threshold || res.maxOverlapRatio >= threshold) {
          overlaps.push({
            frame,
            trackA: a.track,
            trackB: b.track,
            boxA: a.box,
            boxB: b.box,
            iou: res.iou,
            maxOverlapRatio: res.maxOverlapRatio,
            ratioA: res.ratioA,
            ratioB: res.ratioB,
          });
        }
      }
    }
    return overlaps;
  }

  // Quét toàn bộ Job để phát hiện tất cả các frame có box đè nhau
  async function scanAllJobOverlaps(store, opts = {}) {
    const threshold = opts.threshold ?? 0.25;
    const onProgress = opts.onProgress;
    const frames = store.frames;
    const allOverlaps = [];

    const total = frames.length;
    for (let i = 0; i < total; i++) {
      const f = frames[i];
      const list = findFrameOverlaps(store, f, threshold);
      if (list.length) allOverlaps.push(...list);

      if (i % 10 === 0 && onProgress) {
        onProgress({ current: i + 1, total, fraction: (i + 1) / total, found: allOverlaps.length });
        await new Promise((r) => setTimeout(r, 0)); // Nhường luồng cho UI vẽ
      }
    }
    if (onProgress) onProgress({ current: total, total, fraction: 1, found: allOverlaps.length });
    return allOverlaps;
  }

  // Xây dựng ma trận Overlap dạng bảng vuông giữa các track trong 1 frame
  function computeFrameOverlapMatrix(store, frame) {
    const active = [];
    for (const t of store.tracks.values()) {
      const pos = t.at(frame);
      if (pos && !pos.outside) {
        active.push({ id: t.id, uiId: t.uiId, labelName: store.labelName(t.labelId), color: store.labelColor(t.labelId), box: pos.box });
      }
    }
    // Sắp xếp active tracks theo uiId tăng dần đồng bộ tuyệt đối với CVAT UI
    active.sort((a, b) => a.uiId - b.uiId);

    const n = active.length;
    const matrix = Array.from({ length: n }, () => new Float32Array(n));
    const ratioMatrix = Array.from({ length: n }, () => new Float32Array(n));

    for (let i = 0; i < n; i++) {
      matrix[i][i] = 1.0;
      ratioMatrix[i][i] = 1.0;
      for (let j = i + 1; j < n; j++) {
        const res = compute3DIoU(active[i].box, active[j].box);
        matrix[i][j] = res.iou;
        matrix[j][i] = res.iou;
        ratioMatrix[i][j] = res.ratioA;
        ratioMatrix[j][i] = res.ratioB;
      }
    }

    return {
      activeTracks: active,
      matrix,
      ratioMatrix,
    };
  }

  // Tìm các track bị trùng lặp với 1 track cụ thể tại 1 frame (Độ phức tạp O(N) thay vì O(N^2))
  function findTrackOverlapsAtFrame(store, trackId, frame, threshold = 0.25) {
    const targetTrack = store?.track?.(trackId);
    if (!targetTrack) return [];
    const posA = targetTrack.at(frame);
    if (!posA || posA.outside) return [];

    const boxA = posA.box;
    const maxDimA = Math.hypot(boxA.s[0], boxA.s[1], boxA.s[2]) / 2;
    const overlaps = [];

    for (const t of store.tracks.values()) {
      if (t.id === targetTrack.id) continue;
      const posB = t.at(frame);
      if (!posB || posB.outside) continue;

      const boxB = posB.box;
      const distSq = (boxA.c[0] - boxB.c[0]) ** 2 + (boxA.c[1] - boxB.c[1]) ** 2 + (boxA.c[2] - boxB.c[2]) ** 2;
      const maxDimB = Math.hypot(boxB.s[0], boxB.s[1], boxB.s[2]) / 2;
      if (distSq > (maxDimA + maxDimB) ** 2) continue;

      const res = compute3DIoU(boxA, boxB);
      if (res.iou >= threshold || res.maxOverlapRatio >= threshold) {
        overlaps.push({
          frame,
          trackA: targetTrack,
          trackB: t,
          boxA,
          boxB,
          iou: res.iou,
          maxOverlapRatio: res.maxOverlapRatio,
          ratioA: res.ratioA,
          ratioB: res.ratioB,
        });
      }
    }
    return overlaps;
  }

  SP.iou3d = {
    getBox2DVertices,
    polygonArea,
    clipPolygon,
    compute3DIoU,
    findFrameOverlaps,
    findTrackOverlapsAtFrame,
    scanAllJobOverlaps,
    computeFrameOverlapMatrix,
  };
})();
