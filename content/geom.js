// geom.js - Thư viện toán hình học 3D cho Cuboid & LiDAR
// Hỗ trợ Euler XYZ, giữ đáy, bám mặt đất và biến đổi hệ toạ độ tương đối (Ghost Frames)
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});

  function pointsToBox(points) {
    return {
      c: [points[0], points[1], points[2]],
      r: [points[3], points[4], points[5]],
      s: [points[6], points[7], points[8]],
    };
  }

  function boxToPoints(box, basePoints) {
    const out = basePoints ? basePoints.slice() : new Array(16).fill(0);
    while (out.length < 16) out.push(0);
    out[0] = box.c[0]; out[1] = box.c[1]; out[2] = box.c[2];
    out[3] = box.r[0]; out[4] = box.r[1]; out[5] = box.r[2];
    out[6] = box.s[0]; out[7] = box.s[1]; out[8] = box.s[2];
    return out;
  }

  function cloneBox(box) {
    return { c: box.c.slice(), r: box.r.slice(), s: box.s.slice() };
  }

  // 3 trục cục bộ (Local axes) trong toạ độ thế giới (Euler XYZ của Three.js)
  function axes(r) {
    const a = Math.cos(r[0]), b = Math.sin(r[0]);
    const c = Math.cos(r[1]), d = Math.sin(r[1]);
    const e = Math.cos(r[2]), f = Math.sin(r[2]);
    const ae = a * e, af = a * f, be = b * e, bf = b * f;
    return {
      ex: [c * e, af + be * d, bf - ae * d],
      ey: [-c * f, ae - bf * d, be + af * d],
      ez: [d, -b * c, a * c],
    };
  }

  function axesToEuler(ax) {
    const m11 = ax.ex[0], m12 = ax.ey[0], m13 = ax.ez[0];
    const m22 = ax.ey[1], m23 = ax.ez[1];
    const m32 = ax.ey[2], m33 = ax.ez[2];
    const y = Math.asin(Math.min(1, Math.max(-1, m13)));
    if (Math.abs(m13) < 0.9999999) {
      return [Math.atan2(-m23, m33), y, Math.atan2(-m12, m11)];
    }
    return [Math.atan2(m32, m22), y, 0];
  }

  function rotateLocal(r, axis, angle) {
    const ax = axes(r);
    const keys = ['ex', 'ey', 'ez'];
    const j = keys[(axis + 1) % 3], k = keys[(axis + 2) % 3];
    const c = Math.cos(angle), s = Math.sin(angle);
    const ej = ax[j], ek = ax[k];
    const out = { ...ax };
    out[j] = [0, 1, 2].map((i) => c * ej[i] + s * ek[i]);
    out[k] = [0, 1, 2].map((i) => -s * ej[i] + c * ek[i]);
    return axesToEuler(out);
  }

  // Đảo chiều hướng đầu xe 180 độ quanh trục thẳng đứng ez
  function quickFlipHeading(r) {
    return rotateLocal(r, 2, Math.PI);
  }

  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const add = (u, v) => [u[0] + v[0], u[1] + v[1], u[2] + v[2]];
  const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
  const scale = (u, k) => [u[0] * k, u[1] * k, u[2] * k];

  function worldToLocal(p, c, ax) {
    const v = sub(p, c);
    return [dot(v, ax.ex), dot(v, ax.ey), dot(v, ax.ez)];
  }

  function localToWorld(q, c, ax) {
    return add(c, add(scale(ax.ex, q[0]), add(scale(ax.ey, q[1]), scale(ax.ez, q[2]))));
  }

  function boxCorners(box) {
    const ax = axes(box.r);
    const [hx, hy, hz] = box.s.map((v) => v / 2);
    const out = [];
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        for (const sz of [-1, 1]) {
          out.push(localToWorld([sx * hx, sy * hy, sz * hz], box.c, ax));
        }
      }
    }
    return out;
  }

  const BOX_EDGES = [
    [0, 1], [2, 3], [4, 5], [6, 7], // dọc z
    [0, 2], [1, 3], [4, 6], [5, 7], // dọc y
    [0, 4], [1, 5], [2, 6], [3, 7], // dọc x
  ];

  // Đổi kích thước giữ đáy box (-z) cố định
  function resizeKeepBottom(box, newSize) {
    const out = cloneBox(box);
    const ax = axes(box.r);
    const dh = (newSize[2] - box.s[2]) / 2;
    out.c = add(box.c, scale(ax.ez, dh));
    out.s = newSize.slice();
    return out;
  }

  function percentile(sorted, p) {
    if (!sorted.length) return NaN;
    const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
    return sorted[i];
  }

  // Ước lượng cao độ mặt đất từ đám mây điểm quanh box
  function estimateGround(xyz, box, opts = {}) {
    const margin = opts.margin ?? 1.0;
    const below = opts.below ?? 1.0;
    const above = opts.above ?? 0.6;
    const minPoints = opts.minPoints ?? 15;
    const ax = axes(box.r);
    const ix = box.s[0] / 2, iy = box.s[1] / 2;
    const hx = ix + margin, hy = iy + margin;
    const bottom = -box.s[2] / 2;
    const ring = [], inner = [];
    const c = box.c;

    for (let i = 0; i < xyz.length; i += 3) {
      const vx = xyz[i] - c[0], vy = xyz[i + 1] - c[1], vz = xyz[i + 2] - c[2];
      const qx = vx * ax.ex[0] + vy * ax.ex[1] + vz * ax.ex[2];
      if (qx < -hx || qx > hx) continue;
      const qy = vx * ax.ey[0] + vy * ax.ey[1] + vz * ax.ey[2];
      if (qy < -hy || qy > hy) continue;
      const qz = vx * ax.ez[0] + vy * ax.ez[1] + vz * ax.ez[2];
      if (qz < bottom - below || qz > bottom + above) continue;
      if (Math.abs(qx) > ix || Math.abs(qy) > iy) ring.push(qz);
      else inner.push(qz);
    }

    if (ring.length >= minPoints) {
      const bin = 0.02;
      const lo = bottom - below;
      const bins = new Float64Array(Math.ceil((below + above) / bin) + 1);
      for (const z of ring) bins[Math.min(bins.length - 1, Math.floor((z - lo) / bin))] += 1;
      let best = 0, bestScore = -1;
      for (let i = 0; i < bins.length; i++) {
        const score = bins[i] + 0.5 * ((bins[i - 1] || 0) + (bins[i + 1] || 0));
        if (score > bestScore) { bestScore = score; best = i; }
      }
      const peak = lo + (best + 0.5) * bin;
      const near = ring.filter((z) => Math.abs(z - peak) <= 0.05).sort((p, q) => p - q);
      if (near.length >= minPoints) return { localZ: percentile(near, 0.5), count: near.length };
    }

    const all = ring.concat(inner).sort((p, q) => p - q);
    if (all.length < minPoints) return null;
    return { localZ: percentile(all, 0.05), count: all.length };
  }

  // Tự động hút đáy box chạm mặt đất
  function snapToGround(xyz, box, opts) {
    const g = estimateGround(xyz, box, opts);
    if (!g) return null;
    const ax = axes(box.r);
    const shift = g.localZ + box.s[2] / 2;
    const out = cloneBox(box);
    out.c = add(box.c, scale(ax.ez, shift));
    return { box: out, shift, count: g.count };
  }

  // Lọc các điểm LiDAR nằm bên trong một Bounding Box
  function getPointsInsideBox(xyz, box, margin = 0.05) {
    if (!xyz || !xyz.length) return new Float32Array(0);
    const ax = axes(box.r);
    const hx = box.s[0] / 2 + margin;
    const hy = box.s[1] / 2 + margin;
    const hz = box.s[2] / 2 + margin;
    const c = box.c;
    const inside = [];

    for (let i = 0; i < xyz.length; i += 3) {
      const vx = xyz[i] - c[0], vy = xyz[i + 1] - c[1], vz = xyz[i + 2] - c[2];
      const qx = vx * ax.ex[0] + vy * ax.ex[1] + vz * ax.ex[2];
      if (Math.abs(qx) > hx) continue;
      const qy = vx * ax.ey[0] + vy * ax.ey[1] + vz * ax.ey[2];
      if (Math.abs(qy) > hy) continue;
      const qz = vx * ax.ez[0] + vy * ax.ez[1] + vz * ax.ez[2];
      if (Math.abs(qz) > hz) continue;
      inside.push(xyz[i], xyz[i + 1], xyz[i + 2]);
    }
    return new Float32Array(inside);
  }

  // Biến đổi các điểm laser từ srcBox sang hệ toạ độ của dstBox (Dành riêng cho Ghost Frames)
  function transformPointsBetweenBoxes(pointsXYZ, srcBox, dstBox) {
    const srcAx = axes(srcBox.r);
    const dstAx = axes(dstBox.r);
    const out = new Float32Array(pointsXYZ.length);
    for (let i = 0; i < pointsXYZ.length; i += 3) {
      const p = [pointsXYZ[i], pointsXYZ[i + 1], pointsXYZ[i + 2]];
      const local = worldToLocal(p, srcBox.c, srcAx);
      const world = localToWorld(local, dstBox.c, dstAx);
      out[i] = world[0];
      out[i + 1] = world[1];
      out[i + 2] = world[2];
    }
    return out;
  }

  SP.geom = {
    pointsToBox, boxToPoints, cloneBox, axes, axesToEuler, rotateLocal, quickFlipHeading,
    dot, add, sub, scale, worldToLocal, localToWorld, boxCorners, BOX_EDGES,
    resizeKeepBottom, estimateGround, snapToGround, getPointsInsideBox, transformPointsBetweenBoxes,
  };
})();
