// icons.js - Bộ biểu tượng vector SVG kỹ thuật chuyên nghiệp (chuẩn CAD/Figma)
// Thay thế hoàn toàn các emoji lòe loẹt, đảm bảo tính thẩm mỹ công nghiệp tối giản
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});

  function svg(pathContent, size = 14, extraAttrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('viewBox', '0 0 24 24');
    el.setAttribute('width', String(size));
    el.setAttribute('height', String(size));
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke', 'currentColor');
    el.setAttribute('stroke-width', '1.75');
    el.setAttribute('stroke-linecap', 'round');
    el.setAttribute('stroke-linejoin', 'round');
    el.style.display = 'inline-block';
    el.style.verticalAlign = 'middle';
    el.style.flexShrink = '0';
    for (const [k, v] of Object.entries(extraAttrs)) {
      el.setAttribute(k, v);
    }
    el.innerHTML = pathContent;
    return el;
  }

  const icons = {
    // Đảo đầu 180 độ (hai mũi tên xoay tròn đối xứng)
    flip: (s = 14) => svg(`
      <path d="M4 12a8 8 0 0 1 14.93-4"/>
      <polyline points="19 4 19 8 15 8"/>
      <path d="M20 12a8 8 0 0 1-14.93 4"/>
      <polyline points="5 20 5 16 9 16"/>
    `, s),

    // Hút mặt đất (mũi tên đè xuống sàn phẳng)
    ground: (s = 14) => svg(`
      <line x1="12" y1="3" x2="12" y2="15"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="3" y1="21" x2="21" y2="21"/>
      <line x1="5" y1="18" x2="19" y2="18" stroke-dasharray="2 2"/>
    `, s),

    // Khóa kích thước
    lock: (s = 14) => svg(`
      <rect x="5" y="11" width="14" height="10" rx="2"/>
      <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
    `, s),

    // Mở khóa kích thước
    unlock: (s = 14) => svg(`
      <rect x="5" y="11" width="14" height="10" rx="2"/>
      <path d="M8 11V7a4 4 0 0 1 7.5-2"/>
    `, s),

    // Nội suy quỹ đạo (đường cong spline đi qua các điểm neo)
    interpolate: (s = 14) => svg(`
      <path d="M3 19c4-14 8-14 12 0s6 0 6 0"/>
      <circle cx="3" cy="19" r="2" fill="currentColor"/>
      <circle cx="9" cy="8" r="2" fill="currentColor"/>
      <circle cx="15" cy="19" r="2" fill="currentColor"/>
    `, s),

    // Cảnh báo va chạm / Overlap (hai hình hộp giao nhau)
    overlap: (s = 14) => svg(`
      <rect x="3" y="3" width="11" height="11" rx="1.5"/>
      <rect x="10" y="10" width="11" height="11" rx="1.5" stroke-dasharray="2 2"/>
    `, s),

    // Điểm bóng ma / Ghost frame (khung dây nét đứt)
    ghost: (s = 14) => svg(`
      <rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="3 3"/>
      <circle cx="9" cy="9" r="1" fill="currentColor"/>
      <circle cx="15" cy="9" r="1" fill="currentColor"/>
      <circle cx="12" cy="15" r="1" fill="currentColor"/>
    `, s),

    // Vệt quỹ đạo chuyển động (motion trail polyline)
    trail: (s = 14) => svg(`
      <polyline points="3 17 9 11 13 15 21 7"/>
      <circle cx="21" cy="7" r="2" fill="currentColor"/>
      <line x1="3" y1="21" x2="21" y2="21" stroke-opacity="0.3"/>
    `, s),

    // Biểu đồ tốc độ / Sparkline
    speed: (s = 14) => svg(`
      <polyline points="2 12 7 12 10 5 14 19 17 12 22 12"/>
    `, s),

    // Khối hộp 3D (Cuboid)
    cube: (s = 14) => svg(`
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    `, s),

    // Các lớp / Sửa chuỗi frame (layers)
    layers: (s = 14) => svg(`
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    `, s),

    // Hoàn tác (Undo)
    undo: (s = 14) => svg(`
      <path d="M3 7v6h6"/>
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
    `, s),

    // Làm lại (Redo)
    redo: (s = 14) => svg(`
      <path d="M21 7v6h-6"/>
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
    `, s),

    // Lưu đĩa (Save)
    save: (s = 14) => svg(`
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    `, s),

    // Tải lại (Refresh)
    refresh: (s = 14) => svg(`
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    `, s),

    // Bàn phím / Phím tắt
    keyboard: (s = 14) => svg(`
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <line x1="6" y1="8" x2="6.01" y2="8"/>
      <line x1="10" y1="8" x2="10.01" y2="8"/>
      <line x1="14" y1="8" x2="14.01" y2="8"/>
      <line x1="18" y1="8" x2="18.01" y2="8"/>
      <line x1="6" y1="12" x2="6.01" y2="12"/>
      <line x1="10" y1="12" x2="10.01" y2="12"/>
      <line x1="14" y1="12" x2="14.01" y2="12"/>
      <line x1="18" y1="12" x2="18.01" y2="12"/>
      <line x1="7" y1="16" x2="17" y2="16"/>
    `, s),

    // Dấu tích xanh (Check)
    check: (s = 14) => svg(`
      <polyline points="20 6 9 17 4 12"/>
    `, s),

    // Cảnh báo (Warning)
    warning: (s = 14) => svg(`
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    `, s),

    // Đóng (Close)
    close: (s = 14) => svg(`
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    `, s),

    // Thu nhỏ / Đóng ngăn kéo (Chevron Down)
    chevronDown: (s = 14) => svg(`
      <polyline points="6 9 12 15 18 9"/>
    `, s),

    // Mở rộng ngăn kéo (Chevron Up)
    chevronUp: (s = 14) => svg(`
      <polyline points="18 15 12 9 6 15"/>
    `, s),

    // Tối thiểu hóa (Minimize)
    minus: (s = 14) => svg(`
      <line x1="5" y1="12" x2="19" y2="12"/>
    `, s),

    // Phóng to / Cửa sổ đầy đủ (Maximize)
    maximize: (s = 14) => svg(`
      <polyline points="15 3 21 3 21 9"/>
      <polyline points="9 21 3 21 3 15"/>
      <line x1="21" y1="3" x2="14" y2="10"/>
      <line x1="3" y1="21" x2="10" y2="14"/>
    `, s),

    // Thu nhỏ lại kích thước cũ (Restore)
    restore: (s = 14) => svg(`
      <polyline points="4 14 10 14 10 20"/>
      <polyline points="20 10 14 10 14 4"/>
      <line x1="14" y1="10" x2="21" y2="3"/>
      <line x1="3" y1="21" x2="10" y2="14"/>
    `, s),

    // Tay cầm kéo thả (Drag Handle)
    dragHandle: (s = 14) => svg(`
      <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
      <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
      <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
    `, s),

    // Nút 3 chấm cài đặt (More Options)
    more: (s = 14) => svg(`
      <circle cx="12" cy="12" r="1.5"/>
      <circle cx="19" cy="12" r="1.5"/>
      <circle cx="5" cy="12" r="1.5"/>
    `, s),

    // Chuyển đổi né góc công cụ CVAT (Layout Offset)
    layout: (s = 14) => svg(`
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="15" y1="3" x2="15" y2="21"/>
    `, s),
  };

  SP.icons = icons;
})();
