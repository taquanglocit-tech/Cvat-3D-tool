// views.js - Trình dựng hình WebGL2 cho Đám mây điểm LiDAR (hỗ trợ Intensity, Dim/Bright, Lọc nhiễu)
// và Canvas 2D vẽ Bounding Box, Handles, Ghost Frames (Onion Skinning)
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});
  const G = SP.geom;

  const VIEWS = {
    top: { u: 'ex', v: 'ey', d: 'ez', ui: 0, vi: 1, di: 2 },
    side: { u: 'ex', v: 'ez', d: 'ey', ui: 0, vi: 2, di: 1 },
    front: { u: 'ey', v: 'ez', d: 'ex', ui: 1, vi: 2, di: 0 },
  };

  const VS = `#version 300 es
    in vec3 aPos;
    in float aIntensity;
    uniform vec3 uC, uU, uV, uD;
    uniform vec2 uScale, uDepth, uPan;
    uniform float uPointSize, uMinIntensity;
    uniform vec3 uBC, uBx, uBy, uBz, uBHalf;
    uniform vec3 uColIn, uColOut;
    out vec3 vCol;
    out float vAlpha;

    void main() {
      if (aIntensity < uMinIntensity) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        gl_PointSize = 0.0;
        return;
      }

      vec3 w = aPos - uC;
      float d = dot(w, uD);
      if (d < uDepth.x || d > uDepth.y) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        gl_PointSize = 0.0;
        return;
      }

      gl_Position = vec4(dot(w, uU) * uScale.x + uPan.x, dot(w, uV) * uScale.y + uPan.y, 0.0, 1.0);
      gl_PointSize = uPointSize;

      vec3 b = aPos - uBC;
      vec3 q = vec3(dot(b, uBx), dot(b, uBy), dot(b, uBz));
      bool inside = all(lessThanEqual(abs(q), uBHalf));

      // Ánh xạ độ sáng theo cường độ phản xạ LiDAR Intensity
      float brightness = clamp(0.3 + 0.7 * aIntensity, 0.3, 1.0);
      vCol = (inside ? uColIn : uColOut) * brightness;
      vAlpha = inside ? 1.0 : clamp(0.4 + 0.6 * aIntensity, 0.4, 0.95);
    }`;

  const FS = `#version 300 es
    precision mediump float;
    in vec3 vCol;
    in float vAlpha;
    out vec4 outColor;
    void main() {
      outColor = vec4(vCol, vAlpha);
    }`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex || '');
    return m ? [1, 2, 3].map((i) => parseInt(m[i], 16) / 255) : [0.35, 0.82, 0.48];
  }

  function distSeg(px, py, p1, p2) {
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    const l2 = dx * dx + dy * dy;
    if (!l2) return Math.hypot(px - p1[0], py - p1[1]);
    const t = Math.max(0, Math.min(1, ((px - p1[0]) * dx + (py - p1[1]) * dy) / l2));
    return Math.hypot(px - (p1[0] + t * dx), py - (p1[1] + t * dy));
  }

  const HANDLE_R = 7;
  const activeGrids = new Set();

  class GridView {
    constructor(opts) {
      Object.assign(this, opts);
      activeGrids.add(this);
      this.cells = new Set();
      this.buffers = new Map(); // frame -> { posBuf, intBuf, count }
      this.drag = null;
      this.pending = false;

      this.glCanvas = document.createElement('canvas');
      this.uiCanvas = document.createElement('canvas');

      for (const c of [this.uiCanvas, this.glCanvas]) {
        Object.assign(c.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none' });
        this.wrap.insertBefore(c, this.wrap.firstChild);
      }
      if (getComputedStyle(this.scroller).position === 'static') this.scroller.style.position = 'relative';
      this.scroller.style.zIndex = '1';

      const gl = this.glCanvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
      if (!gl) throw new Error('Trình duyệt không hỗ trợ WebGL2');
      this.gl = gl;
      this.ctx = this.uiCanvas.getContext('2d');

      // Bật Alpha Blending để hiển thị mờ/đậm tự nhiên
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      this.prog = prog;

      this.loc = {};
      const uniforms = ['uC', 'uU', 'uV', 'uD', 'uScale', 'uDepth', 'uPan', 'uPointSize', 'uMinIntensity',
                        'uBC', 'uBx', 'uBy', 'uBz', 'uBHalf', 'uColIn', 'uColOut'];
      for (const n of uniforms) this.loc[n] = gl.getUniformLocation(prog, n);

      this.aPos = gl.getAttribLocation(prog, 'aPos');
      this.aIntensity = gl.getAttribLocation(prog, 'aIntensity');
      this.vao = gl.createVertexArray();

      this.onScroll = () => this.requestRender();
      this.scroller.addEventListener('scroll', this.onScroll, { passive: true });
      this.resizeObs = new ResizeObserver(() => this.resize());
      this.resizeObs.observe(this.wrap);
      this.resize();
    }

    destroy() {
      activeGrids.delete(this);
      this.scroller.removeEventListener('scroll', this.onScroll);
      this.resizeObs.disconnect();
      for (const b of this.buffers.values()) {
        this.gl.deleteBuffer(b.posBuf);
        this.gl.deleteBuffer(b.intBuf);
      }
      this.buffers.clear();
      if (this.prog) this.gl.deleteProgram(this.prog);
      if (this.vao) this.gl.deleteVertexArray(this.vao);
      this.gl.getExtension('WEBGL_lose_context')?.loseContext();
      this.glCanvas.remove();
      this.uiCanvas.remove();
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = this.wrap.clientWidth, h = this.wrap.clientHeight;
      this.dpr = dpr;
      for (const c of [this.glCanvas, this.uiCanvas]) {
        c.width = Math.max(1, Math.round(w * dpr));
        c.height = Math.max(1, Math.round(h * dpr));
        c.style.width = `${w}px`;
        c.style.height = `${h}px`;
      }
      this.requestRender();
    }

    addCell(el, frame, view) {
      const cell = { el, frame, view, zoom: 1, pan: [0, 0] };
      this.cells.add(cell);
      el.addEventListener('pointerdown', (e) => this.pointerDown(e, cell));
      el.addEventListener('pointermove', (e) => this.pointerHover(e, cell));
      el.addEventListener('wheel', (e) => this.wheel(e, cell), { passive: false });
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      el.addEventListener('dblclick', (e) => {
        const r = el.getBoundingClientRect();
        if (!this.hit(cell, e.clientX - r.left, e.clientY - r.top)) this.resetCell(cell);
      });
      return cell;
    }

    removeCell(cell) {
      this.cells.delete(cell);
      this.requestRender();
    }

    zoomCell(cell, k, mx, my) {
      const rect = this.cellRect(cell);
      if (mx === undefined) { mx = rect.w / 2; my = rect.h / 2; }
      const nz = Math.min(30, Math.max(0.1, cell.zoom * k));
      k = nz / cell.zoom;
      cell.pan[0] = mx - rect.w / 2 - (mx - rect.w / 2 - cell.pan[0]) * k;
      cell.pan[1] = my - rect.h / 2 - (my - rect.h / 2 - cell.pan[1]) * k;
      cell.zoom = nz;
      this.onZoom?.(cell);
      this.requestRender();
    }

    resetCell(cell) {
      cell.zoom = 1;
      cell.pan = [0, 0];
      this.onZoom?.(cell);
      this.requestRender();
    }

    clearCells() {
      this.cells.clear();
    }

    invalidateCloud(frame) {
      const b = this.buffers.get(frame);
      if (b) {
        this.gl.deleteBuffer(b.posBuf);
        this.gl.deleteBuffer(b.intBuf);
        this.buffers.delete(frame);
      }
      this.requestRender();
    }

    requestRender() {
      if (this.pending) return;
      this.pending = true;
      requestAnimationFrame(() => {
        this.pending = false;
        this.render();
      });
    }

    cellRect(cell) {
      const wr = this.wrap.getBoundingClientRect();
      const cr = cell.el.getBoundingClientRect();
      return { x: cr.left - wr.left, y: cr.top - wr.top, w: cr.width, h: cr.height };
    }

    visibleRect() {
      const wr = this.wrap.getBoundingClientRect();
      const sr = this.scroller.getBoundingClientRect();
      return {
        x: Math.max(0, sr.left - wr.left),
        y: Math.max(0, sr.top - wr.top),
        w: sr.width,
        h: sr.height,
      };
    }

    ppm(cell, w, h) {
      const ref = this.settings.refSize || [1, 1, 1];
      const V = VIEWS[cell.view];
      const span = Math.max(ref[V.ui], ref[V.vi]) * 1.45;
      const base = Math.min(w, h) / span;
      const typeZoom = (this.settings.zoom && this.settings.zoom[cell.view]) || 1;
      return base * typeZoom * cell.zoom;
    }

    camera(cell, pos) {
      const V = VIEWS[cell.view];
      const box = pos.box;
      const bax = G.axes(box.r);
      const ax = this.settings.allowTilt ? bax : {
        ex: [Math.cos(box.r[2]), Math.sin(box.r[2]), 0],
        ey: [-Math.sin(box.r[2]), Math.cos(box.r[2]), 0],
        ez: [0, 0, 1],
      };
      return { c: box.c, ax, pan: cell.pan, half: box.s.map((v) => v / 2) };
    }

    project(worldP, cam, view, rect, ppm) {
      const V = VIEWS[view];
      const w = G.sub(worldP, cam.c);
      const u = G.dot(w, cam.ax[V.u]);
      const v = G.dot(w, cam.ax[V.v]);
      return [rect.w / 2 + u * ppm + cam.pan[0], rect.h / 2 - v * ppm + cam.pan[1]];
    }

    unproject(screenX, screenY, cam, view, rect, ppm, depthLocal = 0) {
      const V = VIEWS[view];
      const u = (screenX - rect.w / 2 - cam.pan[0]) / ppm;
      const v = -(screenY - rect.h / 2 - cam.pan[1]) / ppm;
      const q = [0, 0, 0];
      q[V.ui] = u;
      q[V.vi] = v;
      q[V.di] = depthLocal;
      return G.localToWorld(q, cam.c, cam.ax);
    }

    uploadCloud(frame) {
      const cloud = this.getCloud(frame);
      if (!cloud || !cloud.xyz || !cloud.xyz.length) return null;
      let b = this.buffers.get(frame);
      if (b && b.xyzRef === cloud.xyz) return b;

      const gl = this.gl;
      if (b) {
        gl.deleteBuffer(b.posBuf);
        gl.deleteBuffer(b.intBuf);
      }

      const posBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, cloud.xyz, gl.STATIC_DRAW);

      const intBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, intBuf);
      gl.bufferData(gl.ARRAY_BUFFER, cloud.intensity || new Float32Array(cloud.xyz.length / 3).fill(1.0), gl.STATIC_DRAW);

      b = { xyzRef: cloud.xyz, posBuf, intBuf, count: cloud.xyz.length / 3 };
      this.buffers.set(frame, b);
      return b;
    }

    render() {
      const gl = this.gl, ctx = this.ctx, dpr = this.dpr;
      const H = this.glCanvas.height;
      const vis = this.visibleRect();
      const S = this.settings;
      const colIn = hexToRgb(S.color);
      const colOut = [0.82, 0.82, 0.85];

      gl.disable(gl.SCISSOR_TEST);
      gl.viewport(0, 0, this.glCanvas.width, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      gl.useProgram(this.prog);
      gl.bindVertexArray(this.vao);
      gl.enable(gl.SCISSOR_TEST);

      for (const cell of this.cells) {
        const r = this.cellRect(cell);
        const x0 = Math.max(r.x, vis.x), y0 = Math.max(r.y, vis.y);
        const x1 = Math.min(r.x + r.w, vis.x + vis.w), y1 = Math.min(r.y + r.h, vis.y + vis.h);
        if (x1 <= x0 || y1 <= y0) continue;

        const pos = this.getBox(cell.frame);
        gl.scissor(Math.round(x0 * dpr), Math.round(H - y1 * dpr), Math.round((x1 - x0) * dpr), Math.round((y1 - y0) * dpr));
        gl.viewport(Math.round(r.x * dpr), Math.round(H - (r.y + r.h) * dpr), Math.round(r.w * dpr), Math.round(r.h * dpr));
        gl.clearColor(0.04, 0.05, 0.07, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (!pos) continue;

        const V = VIEWS[cell.view];
        const cam = this.camera(cell, pos);
        const ppm = this.ppm(cell, r.w, r.h);
        const buf = this.uploadCloud(cell.frame);

        if (buf && buf.count) {
          const slab = S.slab || 1.0;
          const hd = cam.half[V.di];
          let depth;
          if (cell.view === 'top') {
            if (S.topAll || S.context) depth = [S.hideGround ? -cam.half[2] + 0.12 : -1e6, 1e6];
            else depth = [S.hideGround ? -cam.half[2] + 0.12 : -cam.half[2] - 1.5, cam.half[2] + 0.5];
          } else {
            depth = [-hd - slab, hd + slab];
          }
          const bax = G.axes(pos.box.r);
          const l = this.loc;
          gl.uniform3fv(l.uC, cam.c);
          gl.uniform3fv(l.uU, cam.ax[V.u]);
          gl.uniform3fv(l.uV, cam.ax[V.v]);
          gl.uniform3fv(l.uD, cam.ax[V.d]);
          gl.uniform2f(l.uScale, (2 * ppm) / r.w, (2 * ppm) / r.h);
          gl.uniform2f(l.uPan, (2 * cam.pan[0]) / r.w, (-2 * cam.pan[1]) / r.h);
          gl.uniform2f(l.uDepth, depth[0], depth[1]);
          gl.uniform1f(l.uPointSize, (S.pointSize || 2) * dpr);
          gl.uniform1f(l.uMinIntensity, S.minIntensity || 0.0);
          gl.uniform3fv(l.uBC, pos.box.c);
          gl.uniform3fv(l.uBx, bax.ex);
          gl.uniform3fv(l.uBy, bax.ey);
          gl.uniform3fv(l.uBz, bax.ez);
          gl.uniform3fv(l.uBHalf, pos.box.s.map((v) => v / 2 + 0.02));
          gl.uniform3fv(l.uColIn, colIn);
          gl.uniform3fv(l.uColOut, colOut);

          // Gán thuộc tính vị trí aPos
          gl.bindBuffer(gl.ARRAY_BUFFER, buf.posBuf);
          gl.enableVertexAttribArray(this.aPos);
          gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);

          // Gán thuộc tính cường độ aIntensity
          gl.bindBuffer(gl.ARRAY_BUFFER, buf.intBuf);
          gl.enableVertexAttribArray(this.aIntensity);
          gl.vertexAttribPointer(this.aIntensity, 1, gl.FLOAT, false, 0, 0);

          gl.drawArrays(gl.POINTS, 0, buf.count);
        }

        // Vẽ Bounding Box & Ghost Frames lên 2D Canvas
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0, y0, x1 - x0, y1 - y0);
        ctx.clip();
        ctx.translate(r.x, r.y);
        this.drawBox(ctx, cell, pos, cam, r, ppm, !buf);
        ctx.restore();
      }
      gl.disable(gl.SCISSOR_TEST);
    }

    handles(cell, pos, cam, rect, ppm) {
      const V = VIEWS[cell.view];
      const box = pos.box;
      const ax = G.axes(box.r);
      const h = box.s.map((v) => v / 2);
      const P = (a, b) => {
        const q = [0, 0, 0];
        q[V.ui] = a * h[V.ui];
        q[V.vi] = b * h[V.vi];
        return this.project(G.localToWorld(q, box.c, ax), cam, cell.view, rect, ppm);
      };
      const list = [];
      for (const a of [-1, 0, 1]) {
        for (const b of [-1, 0, 1]) {
          if (a === 0 && b === 0) continue;
          list.push({ kind: 'resize', a, b, p: P(a, b) });
        }
      }
      const center = P(0, 0);
      const top = P(0, 1);
      const dx = top[0] - center[0], dy = top[1] - center[1];
      const len = Math.hypot(dx, dy) || 1;
      const rot = [top[0] + (dx / len) * 22, top[1] + (dy / len) * 22];
      return { list, center, top, rot, P };
    }

    drawBox(ctx, cell, pos, cam, rect, ppm, noPoints) {
      const V = VIEWS[cell.view];
      const box = pos.box;
      const corners = G.boxCorners(box);
      const pts = corners.map((p) => this.project(p, cam, cell.view, rect, ppm));

      // 1. Vẽ các cạnh của Cuboid hiện tại
      ctx.lineWidth = pos.keyframe ? 1.8 : 1.3;
      ctx.strokeStyle = pos.outside ? '#da3633' : (this.settings.color || '#3fb950');
      ctx.setLineDash(pos.keyframe ? [] : [4, 4]);

      for (const [i, j] of G.BOX_EDGES) {
        ctx.beginPath();
        ctx.moveTo(pts[i][0], pts[i][1]);
        ctx.lineTo(pts[j][0], pts[j][1]);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 2. Mũi tên chỉ hướng đầu xe (Heading Arrow) trên Top View
      if (cell.view === 'top') {
        const ax = G.axes(box.r);
        const frontCenter = this.project(G.localToWorld([box.s[0] / 2, 0, 0], box.c, ax), cam, cell.view, rect, ppm);
        const center = this.project(box.c, cam, cell.view, rect, ppm);
        ctx.strokeStyle = '#f0883e';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(center[0], center[1]);
        ctx.lineTo(frontCenter[0], frontCenter[1]);
        ctx.stroke();
      }

      // 3. Vẽ các tay nắm điều khiển (Handles)
      const H = this.handles(cell, pos, cam, rect, ppm);
      const isLocked = SP.app?.isSizeLocked || this.settings?.isSizeLocked;
      if (!isLocked) {
        for (const h of H.list) {
          const isCorner = h.a !== 0 && h.b !== 0;
          ctx.fillStyle = isCorner ? '#da3633' : '#ffffff';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          if (isCorner) {
            ctx.arc(h.p[0], h.p[1], 3.8, 0, Math.PI * 2);
          } else {
            ctx.rect(h.p[0] - 3.2, h.p[1] - 3.2, 6.4, 6.4);
          }
          ctx.fill();
          ctx.stroke();
        }
      }

      // 4. Nút xoay (chấm cam)
      if (cell.view === 'top' || this.settings.allowTilt) {
        ctx.strokeStyle = '#f0883e';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(H.top[0], H.top[1]);
        ctx.lineTo(H.rot[0], H.rot[1]);
        ctx.stroke();

        ctx.fillStyle = '#f0883e';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(H.rot[0], H.rot[1], 4.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // 5. Nhãn góc nhìn (TOP / SIDE / FRONT), trạng thái OUTSIDE & tải Point Cloud
      ctx.font = '600 10px SFMono-Regular, Consolas, monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText(cell.view.toUpperCase(), 6, 13);
      if (pos.outside) {
        ctx.fillStyle = '#da3633';
        ctx.fillText('OUTSIDE', rect.w - 54, 13);
      }
      if (noPoints) {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillText('đang tải cloud…', 6, rect.h - 6);
      }
    }

    hit(cell, x, y) {
      const pos = this.getBox(cell.frame);
      if (!pos) return null;
      const rect = this.cellRect(cell);
      const ppm = this.ppm(cell, rect.w, rect.h);
      const cam = this.camera(cell, pos);
      const H = this.handles(cell, pos, cam, rect, ppm);

      if (cell.view === 'top' || this.settings.allowTilt) {
        if (Math.hypot(x - H.rot[0], y - H.rot[1]) <= HANDLE_R + 3) {
          return { kind: 'rotate', center: H.center };
        }
      }

      // Khóa kích thước: nếu người dùng đang khóa size thì bỏ qua nhận diện resize ở 4 mép hộp
      const isLocked = SP.app?.isSizeLocked || this.settings?.isSizeLocked;
      if (!isLocked) {
        for (const h of H.list) {
          if (Math.hypot(x - h.p[0], y - h.p[1]) <= HANDLE_R) {
            return { kind: 'resize', a: h.a, b: h.b };
          }
        }
        const edges = [
          { a: 0, b: -1, p1: H.P(-1, -1), p2: H.P(1, -1) },
          { a: 1, b: 0, p1: H.P(1, -1), p2: H.P(1, 1) },
          { a: 0, b: 1, p1: H.P(1, 1), p2: H.P(-1, 1) },
          { a: -1, b: 0, p1: H.P(-1, 1), p2: H.P(-1, -1) },
        ];
        for (const ed of edges) {
          if (distSeg(x, y, ed.p1, ed.p2) <= 5) {
            return { kind: 'resize', a: ed.a, b: ed.b };
          }
        }
      }
      const pLocal = G.worldToLocal(this.unproject(x, y, cam, cell.view, rect, ppm), pos.box.c, G.axes(pos.box.r));
      const V = VIEWS[cell.view];
      const hx = pos.box.s[V.ui] / 2, hy = pos.box.s[V.vi] / 2;
      if (Math.abs(pLocal[V.ui]) <= hx && Math.abs(pLocal[V.vi]) <= hy) {
        return { kind: 'move', depthLocal: pLocal[V.di] };
      }
      return null;
    }

    pointerDown(e, cell) {
      if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
      const r = cell.el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const h = this.hit(cell, x, y);

      if (e.button === 0 && h) {
        cell.el.setPointerCapture(e.pointerId);
        const pos = this.getBox(cell.frame);
        const rect = this.cellRect(cell);
        const cam = this.camera(cell, pos);
        const ppm = this.ppm(cell, rect.w, rect.h);

        this.drag = {
          cell, target: h, startBox: G.cloneBox(pos.box),
          startX: x, startY: y, cam, ppm, rect, moved: false,
        };
        this.onEditStart?.(cell.frame);
      } else {
        cell.el.setPointerCapture(e.pointerId);
        this.drag = { cell, target: { kind: 'pan' }, startX: x, startY: y, startPan: cell.pan.slice(), moved: false };
      }
    }

    pointerHover(e, cell) {
      if (!this.drag) {
        const r = cell.el.getBoundingClientRect();
        const h = this.hit(cell, e.clientX - r.left, e.clientY - r.top);
        cell.el.style.cursor = h ? (h.kind === 'move' ? 'move' : h.kind === 'rotate' ? 'crosshair' : 'nwse-resize') : 'grab';
        return;
      }
      const d = this.drag;
      const r = d.cell.el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const dx = x - d.startX, dy = y - d.startY;

      if (d.target.kind === 'pan') {
        d.cell.pan[0] = d.startPan[0] + dx;
        d.cell.pan[1] = d.startPan[1] + dy;
        this.onZoom?.(d.cell);
        this.requestRender();
        return;
      }

      if (!d.moved && Math.hypot(dx, dy) < 1.5) return;
      d.moved = true;

      const V = VIEWS[d.cell.view];
      const start = d.startBox;
      const cur = G.cloneBox(start);
      const ax = G.axes(start.r);

      if (d.target.kind === 'move') {
        const du = dx / d.ppm, dv = -dy / d.ppm;
        cur.c = G.add(start.c, G.add(G.scale(d.cam.ax[V.u], du), G.scale(d.cam.ax[V.v], dv)));
      } else if (d.target.kind === 'resize') {
        const isLocked = SP.app?.isSizeLocked || this.settings?.isSizeLocked;
        if (isLocked) return;
        const du = dx / d.ppm, dv = -dy / d.ppm;
        const ui = V.ui, vi = V.vi;
        if (d.target.a !== 0) {
          cur.s[ui] = Math.max(0.1, start.s[ui] + d.target.a * du);
          cur.c = G.add(cur.c, G.scale(ax[V.u], (d.target.a * du) / 2));
        }
        if (d.target.b !== 0) {
          cur.s[vi] = Math.max(0.1, start.s[vi] + d.target.b * dv);
          cur.c = G.add(cur.c, G.scale(ax[V.v], (d.target.b * dv) / 2));
        }
      } else if (d.target.kind === 'rotate') {
        const cx = d.target.center[0], cy = d.target.center[1];
        const a1 = Math.atan2(d.startY - cy, d.startX - cx);
        const a2 = Math.atan2(y - cy, x - cx);
        let da = a2 - a1;
        if (e.shiftKey) da = Math.round(da / (Math.PI / 36)) * (Math.PI / 36);
        const axis = V.di;
        const sign = d.cell.view === 'side' ? 1 : -1;
        cur.r = G.rotateLocal(start.r, axis, sign * da);
      }

      this.onEdit?.(d.cell.frame, cur);
      this.requestRender();
    }

    pointerUp(e) {
      if (!this.drag) return;
      if (this.drag.target.kind !== 'pan') {
        if (this.drag.moved) {
          const pos = this.getBox(this.drag.cell.frame);
          this.onEditEnd?.(this.drag.cell.frame, this.drag.startBox, pos ? pos.box : this.drag.startBox);
        } else {
          this.onEditCancel?.(this.drag.cell.frame);
        }
      }
      this.drag = null;
    }

    wheel(e, cell) {
      e.preventDefault();
      const k = e.deltaY < 0 ? 1.15 : 0.87;
      if (e.shiftKey) {
        this.settings.zoom ||= { top: 1, side: 1, front: 1 };
        this.settings.zoom[cell.view] = Math.min(20, Math.max(0.1, (this.settings.zoom[cell.view] || 1) * k));
        this.requestRender();
      } else {
        const r = cell.el.getBoundingClientRect();
        this.zoomCell(cell, k, e.clientX - r.left, e.clientY - r.top);
      }
    }
  }

  window.addEventListener('pointerup', (e) => {
    for (const grid of activeGrids) {
      grid.pointerUp(e);
    }
  });

  window.addEventListener('pointercancel', (e) => {
    for (const grid of activeGrids) {
      grid.pointerUp(e);
    }
  });

  SP.GridView = GridView;
  SP.VIEWS = VIEWS;
})();
