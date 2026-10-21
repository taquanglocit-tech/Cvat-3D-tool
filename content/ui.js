// ui.js - Thư viện giao diện DOM & tiện ích hiển thị
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});

  // Tạo phần tử DOM nhanh chóng dạng khai báo (declarative)
  function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === 'class') {
        el.className = v;
      } else if (k === 'style' && typeof v === 'object') {
        Object.assign(el.style, v);
      } else if (k in el && typeof v !== 'string') {
        el[k] = v;
      } else {
        el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of children.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  const fmt = (v, n = 2) => (Number.isFinite(v) ? v.toFixed(n) : '–');
  const deg = (rad) => (rad * 180) / Math.PI;
  const rad = (deg) => (deg * Math.PI) / 180;

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex || '');
    return m ? [1, 2, 3].map((i) => parseInt(m[i], 16) / 255) : [0.35, 0.82, 0.48];
  }

  SP.ui = { h, fmt, deg, rad, hexToRgb };
})();
