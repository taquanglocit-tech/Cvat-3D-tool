// ui.js - Thư viện giao diện DOM & tiện ích hiển thị chuẩn Ant Design Dark
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

  // Huy hiệu phím tắt (Keyboard Shortcut Badge) phong cách phím cơ Ant Design Dark
  function kbd(keyText, extraClass = '') {
    return h('kbd', {
      class: `c-kbd ${extraClass}`.trim(),
      style: {
        background: '#262626',
        border: '1px solid #434343',
        borderRadius: '2px',
        padding: '0 4px',
        fontSize: '9px',
        lineHeight: '14px',
        color: '#8c8c8c',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace',
        fontWeight: '500',
        display: 'inline-block',
        boxShadow: '0 1px 0 rgba(0,0,0,0.25)',
        verticalAlign: 'middle',
        marginLeft: '4px',
        userSelect: 'none',
      }
    }, keyText);
  }

  const fmt = (v, n = 2) => (Number.isFinite(v) ? v.toFixed(n) : '–');
  const deg = (rad) => (rad * 180) / Math.PI;
  const rad = (deg) => (deg * Math.PI) / 180;

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex || '');
    return m ? [1, 2, 3].map((i) => parseInt(m[i], 16) / 255) : [0.35, 0.82, 0.48];
  }

  // Thuật toán định vị nổi thông minh (Smart Floating Clamping & Auto-Flip)
  // Đảm bảo mọi Menu / Popover không bao giờ bị tràn khỏi màn hình, hỗ trợ hoàn hảo chế độ nửa cửa sổ
  function getFloatingPosition(target, width, estHeight = 320, opts = {}) {
    const margin = opts.margin ?? 10;
    const gap = opts.gap ?? 4;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const rect = (target && typeof target === 'object' && 'left' in target)
      ? target
      : (typeof target === 'number'
          ? { left: target, right: target, top: opts.y ?? target, bottom: opts.y ?? target, width: 0, height: 0 }
          : { left: margin, right: margin, top: margin, bottom: margin, width: 0, height: 0 });

    // 1. Trục ngang: Giữ nguyên trong khung màn hình
    let left = rect.left;
    if (opts.align === 'end') left = rect.right - width;
    else if (opts.align === 'center') left = rect.left + (rect.width || 0) / 2 - width / 2;
    left = Math.max(margin, Math.min(vw - width - margin, left));

    // 2. Trục dọc:
    const spaceBelow = vh - rect.bottom - gap - margin;
    const spaceAbove = rect.top - gap - margin;

    let top;
    let maxHeight;
    let placement = 'bottom';

    if (opts.mode === 'dialog' || estHeight >= vh - margin * 2) {
      // Chế độ hộp thoại lớn (như QA Settings): Căn chỉnh để tận dụng tối đa chiều cao màn hình
      const desiredH = Math.min(estHeight, vh - margin * 2);
      top = Math.max(margin, Math.min(rect.bottom + gap, vh - desiredH - margin));
      if (top + desiredH > vh - margin) {
        top = Math.max(margin, vh - desiredH - margin);
      }
      maxHeight = vh - top - margin;
      placement = 'clamped';
    } else if (opts.preferFlip !== false && spaceBelow < Math.min(estHeight, 280) && spaceAbove > spaceBelow) {
      // Lật ngược lên trên nút bấm nếu bên dưới không đủ chỗ và bên trên thoáng hơn
      placement = 'top';
      maxHeight = Math.min(estHeight, Math.max(100, spaceAbove));
      top = Math.max(margin, rect.top - gap - maxHeight);
    } else {
      // Mở xuôi xuống dưới nút bấm
      placement = 'bottom';
      top = Math.max(margin, rect.bottom + gap);
      maxHeight = Math.min(estHeight, Math.max(100, vh - top - margin));
    }

    return {
      left: Math.round(left),
      top: Math.round(top),
      maxHeight: Math.round(maxHeight),
      placement,
    };
  }

  SP.ui = { h, kbd, fmt, deg, rad, hexToRgb, getFloatingPosition };
})();
