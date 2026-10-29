// bridge.js - Phía client (isolated world) gửi lệnh sang bridge-main.js qua CustomEvent
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});

  const REQ = 'cvat-super-pro:req';
  const RES = 'cvat-super-pro:res';
  const EVT = 'cvat-super-pro:evt';
  let nextId = 1;
  const pending = new Map();
  const eventListeners = new Set();

  document.addEventListener(RES, (e) => {
    let msg;
    try { msg = JSON.parse(e.detail); } catch { return; }
    if (!msg || !msg.id) return;
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.ok) p.resolve(msg.result);
    else p.reject(new Error(msg.error || 'Lỗi cầu nối không xác định'));
  });

  document.addEventListener(EVT, (e) => {
    let data;
    try { data = JSON.parse(e.detail); } catch { return; }
    if (!data) return;
    for (const cb of eventListeners) {
      try { cb(data); } catch (err) { console.warn('[CVAT Super Pro] Lỗi xử lý sự kiện cầu nối:', err); }
    }
  });

  SP.bridge = {
    onEvent(cb) {
      eventListeners.add(cb);
      return () => eventListeners.delete(cb);
    },

    call(method, args = {}, timeoutMs = 15000) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Cầu nối CVAT hết thời gian phản hồi: ${method} (${timeoutMs}ms)`));
        }, timeoutMs);

        pending.set(id, {
          resolve: (val) => { clearTimeout(timer); resolve(val); },
          reject: (err) => { clearTimeout(timer); reject(err); },
        });

        document.dispatchEvent(new CustomEvent(REQ, {
          detail: JSON.stringify({ id, method, args }),
        }));
      });
    },

    async isAvailable() {
      try {
        const res = await this.call('status', {}, 1500);
        return !!(res && res.ready);
      } catch {
        return false;
      }
    },

    getActiveElement() {
      return this.call('getActiveElement', {}, 2000).catch(() => null);
    },

    activateObject(clientID) {
      return this.call('activateObject', { clientID }, 2000).catch(() => false);
    },

    changeFrame(frame) {
      return this.call('changeFrame', { frame }, 4000).catch(() => false);
    },

    flipActiveHeading(clientID, frame, allFrames = false) {
      return this.call('flipActiveHeading', { clientID, frame, allFrames }, 4000);
    },

    snapActiveGround(clientID, frame, offsetZ) {
      return this.call('snapActiveGround', { clientID, frame, offsetZ }, 4000);
    },

    showGhostInMainScene(ghosts) {
      return this.call('showGhostInMainScene', { ghosts }, 4000).catch(() => false);
    },

    hideGhostInMainScene() {
      return this.call('hideGhostInMainScene', {}, 4000).catch(() => false);
    },

    focusOverlapInMain(args) {
      return this.call('focusOverlapInMain', args, 6000).catch(() => false);
    },

    focusTrackInMain(args) {
      return this.call('focusTrackInMain', args, 6000).catch(() => false);
    },
  };
})();
