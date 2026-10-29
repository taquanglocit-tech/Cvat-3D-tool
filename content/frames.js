// frames.js - Quản lý tải và bộ nhớ đệm đám mây điểm (PCD) và ảnh camera (Context Images)
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});

  const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', bmp: 'image/bmp', webp: 'image/webp' };
  const MAX_CACHED_CLOUDS = 240; // Giới hạn bộ đệm LRU tránh tràn RAM trên các Job dài
  const MAX_PREFETCH_CHUNKS = 15; // Số chunk tải trước tối đa mỗi đợt

  class FrameData {
    constructor(store, { quality = 'compressed' } = {}) {
      this.store = store;
      this.quality = quality;
      this.chunkSize = (store && store.meta && store.meta.chunk_size) || 1;
      this.chunks = new Map();   // chunk index -> Promise<void>
      this.clouds = new Map();   // frame -> CloudData { xyz: Float32Array, intensity: Float32Array }
      this.images = new Map();   // frame -> Promise<[{name, url, imgEl, width, height}]>
      this.resolvedImages = new Map(); // frame -> [{name, url, imgEl, width, height}] (Truy xuất 0ms đồng bộ từ RAM)
      this.hasContextImages = null; // null: chưa xác định, true: có ảnh 2D, false: Job PCD thuần (không có ảnh camera)
      this.urls = [];
    }

    _setCloud(frame, parsed) {
      if (this.clouds.has(frame)) this.clouds.delete(frame);
      this.clouds.set(frame, parsed);
      // Nếu vượt ngưỡng an toàn bộ nhớ, giải phóng các frame cũ nhất (LRU eviction)
      while (this.clouds.size > MAX_CACHED_CLOUDS) {
        const oldestFrame = this.clouds.keys().next().value;
        if (oldestFrame === undefined) break;
        this.clouds.delete(oldestFrame);
        try {
          const oldChunk = this.position(oldestFrame).chunk;
          this.chunks.delete(oldChunk);
        } catch {}
      }
    }

    position(frame) {
      const frames = this.store?.frames || [];
      const k = frames.indexOf(frame);
      if (k < 0) throw new Error(`Frame ${frame} không thuộc job`);
      return { chunk: Math.floor(k / this.chunkSize), offset: k % this.chunkSize };
    }

    loadChunk(index, onBytes) {
      if (!this.chunks.has(index)) {
        const p = (async () => {
          const buf = await SP.api.getChunk(this.store.jid, index, this.quality, onBytes);
          const entries = SP.zip.listEntries(buf);
          const base = index * this.chunkSize;
          await Promise.all(entries.map(async (entry, i) => {
            const frame = this.store.frames[base + i];
            if (frame === undefined) return;
            const parsed = SP.pcd.parse(await entry.read());
            this._setCloud(frame, parsed);
          }));
        })();
        p.catch(() => this.chunks.delete(index));
        this.chunks.set(index, p);
      }
      return this.chunks.get(index);
    }

    async cloud(frame) {
      if (this.clouds.has(frame)) {
        const val = this.clouds.get(frame);
        // Cập nhật vị trí LRU mới nhất
        this.clouds.delete(frame);
        this.clouds.set(frame, val);
        return val;
      }
      await this.loadChunk(this.position(frame).chunk);
      return this.clouds.get(frame) || { xyz: new Float32Array(0), intensity: new Float32Array(0), points: 0 };
    }

    async preload(frames, onProgress, concurrency = 6) {
      const needed = [...new Set(frames.map((f) => this.position(f).chunk))];
      const parts = new Map(needed.map((c) => [c, this.chunks.has(c) ? null : 0]));
      let done = 0;
      let loadedBytes = 0;
      const bytes = new Map();

      const report = (chunk = null) => {
        let partial = 0;
        for (const v of parts.values()) if (v) partial += v;
        onProgress?.({
          done, total: needed.length, loadedBytes, chunk,
          fraction: needed.length ? Math.min(1, (done + partial) / needed.length) : 1,
        });
      };
      report();

      const queue = needed.slice();
      const worker = async () => {
        while (queue.length) {
          const c = queue.shift();
          await this.loadChunk(c, (loaded, total) => {
            loadedBytes += loaded - (bytes.get(c) || 0);
            bytes.set(c, loaded);
            parts.set(c, total ? Math.min(0.99, loaded / total) : 0);
            report();
          });
          parts.set(c, null);
          done += 1;
          report(c);
        }
      };
      await Promise.all(Array.from({ length: Math.min(concurrency, needed.length) }, worker));
    }

    // Tải ngầm song song các chunk lân cận dưới nền (Background Prefetch có giới hạn an toàn)
    // Giúp người dùng khi lướt tới các frame kế tiếp không phải chờ tải lại mà không gây tràn RAM
    startBackgroundPrefetch(allFrames = null) {
      if (this._bgRunning) return;
      this._bgRunning = true;
      const frames = allFrames || this.store?.frames || [];
      const chunks = [...new Set(frames.map((f) => this.position(f).chunk))];
      const remaining = chunks.filter((c) => !this.chunks.has(c)).slice(0, MAX_PREFETCH_CHUNKS);

      const worker = async () => {
        while (remaining.length) {
          const c = remaining.shift();
          try {
            await this.loadChunk(c);
          } catch (err) {
            console.warn(`[CVAT Super Pro] Tải ngầm chunk ${c} thất bại:`, err);
          }
          // Tạm nghỉ 60ms giữa các chunk để nhường băng thông và CPU cho tương tác của người dùng
          await new Promise((r) => setTimeout(r, 60));
        }
        this._bgRunning = false;
      };

      // Chạy 2 luồng ngầm song song (vừa đủ nhanh mà không nghẽn mạng)
      const conc = Math.min(2, remaining.length);
      for (let i = 0; i < conc; i++) worker();
    }

    // Tải lại (Reload): Chỉ xóa cache khi người dùng chủ động bấm yêu cầu tải lại
    reload(frames = null) {
      if (Array.isArray(frames) && frames.length) {
        const chunks = new Set(frames.map((f) => this.position(f).chunk));
        for (const c of chunks) {
          this.chunks.delete(c);
          const base = c * this.chunkSize;
          for (let i = 0; i < this.chunkSize; i++) {
            const f = this.store.frames[base + i];
            if (f !== undefined) this.clouds.delete(f);
          }
        }
        return this.preload(frames);
      } else {
        this.chunks.clear();
        this.clouds.clear();
      }
    }

    chunkFrames(chunk) {
      return (this.store?.frames || []).slice(chunk * this.chunkSize, (chunk + 1) * this.chunkSize);
    }

    hasCachedImages(frame) {
      return this.resolvedImages.has(frame);
    }

    getCachedImagesSync(frame) {
      if (this.hasContextImages === false) return [];
      return this.resolvedImages.get(frame) || null;
    }

    async checkHasImages() {
      if (this.hasContextImages !== null) return this.hasContextImages;
      const firstFrame = this.store?.frames?.[0] ?? 0;
      const imgs = await this.contextImages(firstFrame);
      return (this.hasContextImages = Array.isArray(imgs) && imgs.length > 0);
    }

    contextImages(frame) {
      if (this.hasContextImages === false) {
        return Promise.resolve([]);
      }
      if (this.resolvedImages.has(frame)) {
        return Promise.resolve(this.resolvedImages.get(frame));
      }
      if (!this.images.has(frame)) {
        const p = (async () => {
          const meta = this.store?.meta?.frames?.[this.store?.frames?.indexOf(frame)] || this.store?.meta?.frames?.[0];
          if (meta && meta.related_files === 0) {
            this.hasContextImages = false;
            this.resolvedImages.set(frame, []);
            return [];
          }
          try {
            const buf = await SP.api.getContextImages(this.store.jid, frame);
            if (!buf || !buf.byteLength) {
              this.resolvedImages.set(frame, []);
              return [];
            }
            const entries = SP.zip.listEntries(buf);
            if (!entries.length) {
              this.resolvedImages.set(frame, []);
              return [];
            }
            const out = [];
            for (const entry of entries) {
              const ext = entry.name.split('.').pop().toLowerCase();
              const url = URL.createObjectURL(new Blob([await entry.read()], { type: MIME[ext] || 'application/octet-stream' }));
              this.urls.push(url);
              const imgEl = new Image();
              imgEl.src = url;
              try {
                if (typeof imgEl.decode === 'function') {
                  await imgEl.decode();
                } else {
                  await new Promise((res, rej) => { imgEl.onload = res; imgEl.onerror = rej; });
                }
              } catch { /* Bỏ qua lỗi decode lẻ */ }
              out.push({
                name: entry.name.split('/').pop(),
                url,
                imgEl,
                width: imgEl.naturalWidth || imgEl.width || 0,
                height: imgEl.naturalHeight || imgEl.height || 0,
              });
            }
            // Sắp xếp theo tên file để thứ tự Camera luôn đồng nhất giữa các frame
            out.sort((a, b) => a.name.localeCompare(b.name));
            this.hasContextImages = true;
            this.resolvedImages.set(frame, out);
            return out;
          } catch (err) {
            // Nếu API báo lỗi 404 / 400 (Job thuần PCD không có ảnh Context),
            // đánh dấu hasContextImages = false và lưu cache rỗng để triệt tiêu 100% spam request!
            const msg = String(err?.message || '');
            if (msg.includes('404') || msg.includes('400') || msg.includes('Not Found')) {
              this.hasContextImages = false;
            }
            this.resolvedImages.set(frame, []);
            return [];
          }
        })();
        this.images.set(frame, p);
      }
      return this.images.get(frame);
    }

    // Tải trước và giải mã sẵn vào RAM hàng loạt ảnh 2D của dải frame (chuyển ảnh 0ms như xem video)
    async preloadImages(frames, onProgress, concurrency = 6, shouldCancel = null) {
      if (this.hasContextImages === false) {
        onProgress?.({ done: 0, total: 0, cachedTotal: 0, fraction: 1 });
        return;
      }
      const list = Array.isArray(frames) ? frames : [];
      const total = list.length;
      if (!total) {
        onProgress?.({ done: 0, total: 0, cachedTotal: this.resolvedImages.size, fraction: 1 });
        return;
      }

      let done = 0;
      const queue = [];
      for (const f of list) {
        if (this.resolvedImages.has(f)) {
          done++;
        } else {
          queue.push(f);
        }
      }

      const report = (lastFrame = null) => {
        onProgress?.({
          done,
          total,
          lastFrame,
          cachedTotal: this.resolvedImages.size,
          fraction: total ? Math.min(1, done / total) : 1,
        });
      };
      report();

      if (!queue.length) return;

      const worker = async () => {
        while (queue.length) {
          if (shouldCancel?.()) break;
          const f = queue.shift();
          if (f === undefined) break;
          try {
            await this.contextImages(f);
          } catch (err) {
            console.warn(`[CVAT Super Pro] Không tải được ảnh 2D tại frame ${f}:`, err);
          }
          done++;
          report(f);
        }
      };

      await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
    }

    dispose() {
      for (const url of this.urls) URL.revokeObjectURL(url);
      this.urls = [];
      this.clouds.clear();
      this.chunks.clear();
      this.images.clear();
      this.resolvedImages.clear();
    }
  }

  SP.FrameData = FrameData;
})();
