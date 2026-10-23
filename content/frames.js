// frames.js - Quản lý tải và bộ nhớ đệm đám mây điểm (PCD) và ảnh camera (Context Images)
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});

  const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', bmp: 'image/bmp', webp: 'image/webp' };

  class FrameData {
    constructor(store, { quality = 'compressed' } = {}) {
      this.store = store;
      this.quality = quality;
      this.chunkSize = (store && store.meta && store.meta.chunk_size) || 1;
      this.chunks = new Map();   // chunk index -> Promise<void>
      this.clouds = new Map();   // frame -> CloudData { xyz: Float32Array, intensity: Float32Array }
      this.images = new Map();   // frame -> Promise<[{name, url}]>
      this.urls = [];
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
            this.clouds.set(frame, parsed);
          }));
        })();
        p.catch(() => this.chunks.delete(index));
        this.chunks.set(index, p);
      }
      return this.chunks.get(index);
    }

    async cloud(frame) {
      if (this.clouds.has(frame)) return this.clouds.get(frame);
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

    // Tải ngầm song song các chunk còn lại của job dưới nền (Background Prefetch)
    // Giúp người dùng khi lướt tới các frame xa không phải chờ tải lại
    startBackgroundPrefetch(allFrames = null) {
      if (this._bgRunning) return;
      this._bgRunning = true;
      const frames = allFrames || this.store?.frames || [];
      const chunks = [...new Set(frames.map((f) => this.position(f).chunk))];
      const remaining = chunks.filter((c) => !this.chunks.has(c));

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

    contextImages(frame) {
      if (!this.images.has(frame)) {
        const p = (async () => {
          const meta = this.store?.meta?.frames?.[this.store?.frames?.indexOf(frame)] || this.store?.meta?.frames?.[0];
          if (meta && meta.related_files === 0) return [];
          const buf = await SP.api.getContextImages(this.store.jid, frame);
          const entries = SP.zip.listEntries(buf);
          const out = [];
          for (const entry of entries) {
            const ext = entry.name.split('.').pop().toLowerCase();
            const url = URL.createObjectURL(new Blob([await entry.read()], { type: MIME[ext] || 'application/octet-stream' }));
            this.urls.push(url);
            out.push({ name: entry.name.split('/').pop(), url });
          }
          return out;
        })();
        p.catch(() => this.images.delete(frame));
        this.images.set(frame, p);
      }
      return this.images.get(frame);
    }

    dispose() {
      for (const url of this.urls) URL.revokeObjectURL(url);
      this.urls = [];
      this.clouds.clear();
      this.chunks.clear();
      this.images.clear();
    }
  }

  SP.FrameData = FrameData;
})();
