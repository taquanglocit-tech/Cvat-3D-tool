// icons.js - Bộ biểu tượng vector SVG kỹ thuật chuyên nghiệp (chuẩn CAD/Ant Design / Lucide)
// Thay thế hoàn toàn 100% emoji nghiệp dư bằng các vector stroke 1.5px đơn sắc sắc nét
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
    el.setAttribute('stroke-width', '1.6');
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
    // 1. Đảo đầu 180 độ (hai mũi tên xoay tròn đối xứng)
    flip: (s = 14) => svg(`
      <path d="M4 12a8 8 0 0 1 14.93-4"/>
      <polyline points="19 4 19 8 15 8"/>
      <path d="M20 12a8 8 0 0 1-14.93 4"/>
      <polyline points="5 20 5 16 9 16"/>
    `, s),

    // 2. Hút mặt đất (mũi tên đè xuống sàn phẳng)
    ground: (s = 14) => svg(`
      <line x1="12" y1="3" x2="12" y2="15"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="3" y1="21" x2="21" y2="21"/>
      <line x1="5" y1="18" x2="19" y2="18" stroke-dasharray="2 2"/>
    `, s),

    // 3. Khóa kích thước
    lock: (s = 14) => svg(`
      <rect x="5" y="11" width="14" height="10" rx="2"/>
      <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
    `, s),

    // 4. Mở khóa kích thước
    unlock: (s = 14) => svg(`
      <rect x="5" y="11" width="14" height="10" rx="2"/>
      <path d="M8 11V7a4 4 0 0 1 7.5-2"/>
    `, s),

    // 5. Nội suy quỹ đạo (đường cong spline đi qua các điểm neo)
    interpolate: (s = 14) => svg(`
      <path d="M3 19c4-14 8-14 12 0s6 0 6 0"/>
      <circle cx="3" cy="19" r="1.5" fill="currentColor"/>
      <circle cx="9" cy="8" r="1.5" fill="currentColor"/>
      <circle cx="15" cy="19" r="1.5" fill="currentColor"/>
    `, s),

    // 6. Cảnh báo va chạm / Overlap (hai hình hộp giao nhau)
    overlap: (s = 14) => svg(`
      <rect x="3" y="3" width="11" height="11" rx="1.5"/>
      <rect x="10" y="10" width="11" height="11" rx="1.5" stroke-dasharray="2 2"/>
    `, s),

    // 7. Điểm bóng ma / Ghost frame (khung dây nét đứt)
    ghost: (s = 14) => svg(`
      <rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="3 3"/>
      <circle cx="9" cy="9" r="1" fill="currentColor"/>
      <circle cx="15" cy="9" r="1" fill="currentColor"/>
      <circle cx="12" cy="15" r="1" fill="currentColor"/>
    `, s),

    // 8. Vệt quỹ đạo chuyển động (motion trail polyline)
    trail: (s = 14) => svg(`
      <polyline points="3 17 9 11 13 15 21 7"/>
      <circle cx="21" cy="7" r="2" fill="currentColor"/>
      <line x1="3" y1="21" x2="21" y2="21" stroke-opacity="0.3"/>
    `, s),

    // 9. Biểu đồ tốc độ / Sparkline
    speed: (s = 14) => svg(`
      <polyline points="2 12 7 12 10 5 14 19 17 12 22 12"/>
    `, s),

    // 10. Khối hộp 3D (Cuboid)
    cube: (s = 14) => svg(`
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    `, s),

    // 11. Các lớp / Sửa chuỗi frame (layers)
    layers: (s = 14) => svg(`
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    `, s),

    // 12. Hoàn tác (Undo)
    undo: (s = 14) => svg(`
      <path d="M3 7v6h6"/>
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
    `, s),

    // 13. Làm lại (Redo)
    redo: (s = 14) => svg(`
      <path d="M21 7v6h-6"/>
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
    `, s),

    // 14. Lưu đĩa (Save)
    save: (s = 14) => svg(`
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    `, s),

    // 15. Tải lại (Refresh)
    refresh: (s = 14) => svg(`
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    `, s),

    // 16. Bàn phím / Phím tắt
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

    // 17. Dấu tích xanh (Check)
    check: (s = 14) => svg(`
      <polyline points="20 6 9 17 4 12"/>
    `, s),

    // 18. Cảnh báo (Warning)
    warning: (s = 14) => svg(`
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    `, s),

    // 19. Đóng (Close)
    close: (s = 14) => svg(`
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    `, s),

    // 20. Thu nhỏ (Chevron Down)
    chevronDown: (s = 14) => svg(`
      <polyline points="6 9 12 15 18 9"/>
    `, s),

    // 21. Mở rộng (Chevron Up)
    chevronUp: (s = 14) => svg(`
      <polyline points="18 15 12 9 6 15"/>
    `, s),

    // 22. Tối thiểu hóa (Minus)
    minus: (s = 14) => svg(`
      <line x1="5" y1="12" x2="19" y2="12"/>
    `, s),

    // 23. Phóng to (Maximize)
    maximize: (s = 14) => svg(`
      <polyline points="15 3 21 3 21 9"/>
      <polyline points="9 21 3 21 3 15"/>
      <line x1="21" y1="3" x2="14" y2="10"/>
      <line x1="3" y1="21" x2="10" y2="14"/>
    `, s),

    // 24. Thu nhỏ lại kích thước cũ (Restore)
    restore: (s = 14) => svg(`
      <polyline points="4 14 10 14 10 20"/>
      <polyline points="20 10 14 10 14 4"/>
      <line x1="14" y1="10" x2="21" y2="3"/>
      <line x1="3" y1="21" x2="10" y2="14"/>
    `, s),

    // 25. Tay cầm kéo thả (Drag Handle)
    dragHandle: (s = 14) => svg(`
      <circle cx="9" cy="6" r="1.3" fill="currentColor"/>
      <circle cx="15" cy="6" r="1.3" fill="currentColor"/>
      <circle cx="9" cy="12" r="1.3" fill="currentColor"/>
      <circle cx="15" cy="12" r="1.3" fill="currentColor"/>
      <circle cx="9" cy="18" r="1.3" fill="currentColor"/>
      <circle cx="15" cy="18" r="1.3" fill="currentColor"/>
    `, s),

    // 26. Nút 3 chấm cài đặt (More Options)
    more: (s = 14) => svg(`
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
      <circle cx="19" cy="12" r="1.5" fill="currentColor"/>
      <circle cx="5" cy="12" r="1.5" fill="currentColor"/>
    `, s),

    // 27. Layout Offset mode
    layout: (s = 14) => svg(`
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="15" y1="3" x2="15" y2="21"/>
    `, s),

    // 28. Camera
    camera: (s = 14) => svg(`
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    `, s),

    // 29. Camera gạch chéo (No Camera cho dataset LiDAR thuần)
    noCamera: (s = 14) => svg(`
      <line x1="2" y1="2" x2="22" y2="22"/>
      <path d="M7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 1.41-.59"/>
      <path d="M10.5 4h3l2 3h3.5a2 2 0 0 1 2 2v7.5"/>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
    `, s),

    // 30. Phát tự động (Play)
    play: (s = 14) => svg(`
      <polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none"/>
    `, s),

    // 31. Dừng phát (Pause)
    pause: (s = 14) => svg(`
      <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/>
      <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/>
    `, s),

    // 32. Lùi 1 frame (Step Backward)
    stepBackward: (s = 14) => svg(`
      <polygon points="19 20 9 12 19 4 19 20" fill="currentColor"/>
      <line x1="5" y1="19" x2="5" y2="5"/>
    `, s),

    // 33. Tiến 1 frame (Step Forward)
    stepForward: (s = 14) => svg(`
      <polygon points="5 4 15 12 5 20 5 4" fill="currentColor"/>
      <line x1="19" y1="5" x2="19" y2="19"/>
    `, s),

    // 34. Lùi nhanh 5 frame (Fast Backward)
    fastBackward: (s = 14) => svg(`
      <polygon points="11 19 2 12 11 5 11 19" fill="currentColor"/>
      <polygon points="22 19 13 12 22 5 22 19" fill="currentColor"/>
    `, s),

    // 35. Tiến nhanh 5 frame (Fast Forward)
    fastForward: (s = 14) => svg(`
      <polygon points="13 19 22 12 13 5 13 19" fill="currentColor"/>
      <polygon points="2 19 11 12 2 5 2 19" fill="currentColor"/>
    `, s),

    // 36. Dừng hoàn toàn (Stop)
    stop: (s = 14) => svg(`
      <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor"/>
    `, s),

    // 37. Hồng tâm ngắm / Nhảy tới tâm đối tượng (Focus Target / Crosshair)
    focusTarget: (s = 14) => svg(`
      <circle cx="12" cy="12" r="7"/>
      <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
      <line x1="12" y1="1" x2="12" y2="4"/>
      <line x1="12" y1="20" x2="12" y2="23"/>
      <line x1="1" y1="12" x2="4" y2="12"/>
      <line x1="20" y1="12" x2="23" y2="12"/>
    `, s),

    // 38. Dò tách nhánh ID (Split Branch)
    splitBranch: (s = 14) => svg(`
      <line x1="6" y1="3" x2="6" y2="15"/>
      <circle cx="18" cy="6" r="3"/>
      <circle cx="6" cy="18" r="3"/>
      <path d="M18 9a9 9 0 0 1-9 9"/>
    `, s),

    // 39. Nối gộp 2 ID thành một (Merge Track)
    merge: (s = 14) => svg(`
      <circle cx="18" cy="18" r="3"/>
      <circle cx="6" cy="6" r="3"/>
      <circle cx="6" cy="18" r="3"/>
      <path d="M6 6v12"/>
      <path d="M18 18a9 9 0 0 1-9-9"/>
    `, s),

    // 40. Bộ nhớ RAM / Vi mạch nạp đệm (RAM Memory Chip)
    ramMemory: (s = 14) => svg(`
      <rect x="5" y="5" width="14" height="14" rx="2"/>
      <rect x="9" y="9" width="6" height="6" rx="1"/>
      <line x1="2" y1="9" x2="5" y2="9"/>
      <line x1="2" y1="15" x2="5" y2="15"/>
      <line x1="19" y1="9" x2="22" y2="9"/>
      <line x1="19" y1="15" x2="22" y2="15"/>
      <line x1="9" y1="2" x2="9" y2="5"/>
      <line x1="15" y1="2" x2="15" y2="5"/>
      <line x1="9" y1="19" x2="9" y2="22"/>
      <line x1="15" y1="19" x2="15" y2="22"/>
    `, s),

    // 41. Tải về từ máy chủ / Nạp RAM (Download Cloud)
    downloadCloud: (s = 14) => svg(`
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
      <path d="M12 12v8"/>
      <polyline points="8 16 12 20 16 16"/>
    `, s),

    // 42. Bộ lọc (Filter List)
    filterList: (s = 14) => svg(`
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    `, s),

    // 43. Thước đo khoảng cách (Ruler / Distance)
    rulerDistance: (s = 14) => svg(`
      <path d="M21.3 15.3 8.7 2.7a2.41 2.41 0 0 0-3.4 0L2.7 5.3a2.41 2.41 0 0 0 0 3.4l12.6 12.6a2.41 2.41 0 0 0 3.4 0l2.6-2.6a2.41 2.41 0 0 0 0-3.4Z"/>
      <line x1="14.5" y1="5.5" x2="12.5" y2="7.5"/>
      <line x1="11.5" y1="8.5" x2="8.5" y2="11.5"/>
      <line x1="8.5" y1="11.5" x2="6.5" y2="13.5"/>
    `, s),

    // 44. Kính lúp tìm kiếm (Search)
    search: (s = 14) => svg(`
      <circle cx="11" cy="11" r="7"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    `, s),

    // 45. Mắt soi (Eye)
    eye: (s = 14) => svg(`
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    `, s),

    // 46. Mắt gạch chéo (Eye Off / Ẩn)
    eyeOff: (s = 14) => svg(`
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    `, s),

    // 47. Quả địa cầu / Toàn bộ Job (Globe)
    globe: (s = 14) => svg(`
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    `, s),

    // 48. Tia chớp nạp nhanh (Zap / Fast)
    zap: (s = 14) => svg(`
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor"/>
    `, s),

    // 49. Danh sách (List)
    list: (s = 14) => svg(`
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    `, s),

    // 50. Chấm tròn đặc (Status Dot)
    dot: (s = 8) => svg(`
      <circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/>
    `, s),

    // 51. Chấm tròn rỗng (Status Ring)
    dotRing: (s = 8) => svg(`
      <circle cx="12" cy="12" r="6" stroke="currentColor"/>
    `, s),

    // 52. Khiên bảo mật (Shield)
    shield: (s = 14) => svg(`
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    `, s),

    // 53. Tên lửa tăng tốc (Rocket)
    rocket: (s = 14) => svg(`
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    `, s),

    // 54. Xoay ngược chiều kim đồng hồ (Rotate CCW)
    rotateCcw: (s = 14) => svg(`
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
    `, s),

    // 55. Xoay cùng chiều kim đồng hồ (Rotate CW)
    rotateCw: (s = 14) => svg(`
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    `, s),

    // 56. Phóng to cửa sổ xem chi tiết (Expand View)
    expandView: (s = 14) => svg(`
      <polyline points="15 3 21 3 21 9"/>
      <polyline points="9 21 3 21 3 15"/>
      <line x1="21" y1="3" x2="14" y2="10"/>
      <line x1="3" y1="21" x2="10" y2="14"/>
    `, s),

    // 57. Mũi tên phải kỹ thuật (Arrow Right)
    arrowRight: (s = 14) => svg(`
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    `, s),

    // 58. Thanh trượt cấu hình (Sliders) - dùng cho Cài đặt ngưỡng QA
    sliders: (s = 14) => svg(`
      <line x1="4" y1="21" x2="4" y2="14"/>
      <line x1="4" y1="10" x2="4" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12" y2="3"/>
      <line x1="20" y1="21" x2="20" y2="16"/>
      <line x1="20" y1="12" x2="20" y2="3"/>
      <line x1="1" y1="14" x2="7" y2="14"/>
      <line x1="9" y1="8" x2="15" y2="8"/>
      <line x1="17" y1="16" x2="23" y2="16"/>
    `, s),

    // 59. Biến đổi (Transform: bốn mũi tên di chuyển)
    transform: (s = 14) => svg(`
      <polyline points="5 9 2 12 5 15"/>
      <polyline points="9 5 12 2 15 5"/>
      <polyline points="15 19 12 22 9 19"/>
      <polyline points="19 9 22 12 19 15"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <line x1="12" y1="2" x2="12" y2="22"/>
    `, s),

    // 60. Chọn hàng loạt (khung chọn nét đứt)
    selectBox: (s = 14) => svg(`
      <path d="M5 3a2 2 0 0 0-2 2"/>
      <path d="M19 3a2 2 0 0 1 2 2"/>
      <path d="M21 19a2 2 0 0 1-2 2"/>
      <path d="M5 21a2 2 0 0 1-2-2"/>
      <path d="M9 3h1"/>
      <path d="M9 21h1"/>
      <path d="M14 3h1"/>
      <path d="M14 21h1"/>
      <path d="M3 9v1"/>
      <path d="M21 9v1"/>
      <path d="M3 14v1"/>
      <path d="M21 14v1"/>
    `, s),
  };

  SP.icons = icons;
})();
