// hotkeys.js - Quản lý phím tắt phong cách CAD/Blender và Bảng tra cứu phím tắt (Cheatsheet)
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});
  const { h } = SP.ui;

  let modalEl = null;
  let isHoldingGhost = false;

  function showHotkeysModal() {
    if (modalEl) { modalEl.remove(); modalEl = null; return; }

    modalEl = h('div', {
      class: 'cvat-super-pro-hotkeys-modal',
      style: {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483020',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      },
      onclick: (e) => { if (e.target === modalEl) { modalEl.remove(); modalEl = null; } }
    });

    const card = h('div', {
      style: {
        background: '#1f1f1f',
        border: '1px solid #303030',
        borderRadius: '6px',
        width: '540px',
        maxWidth: '92%',
        maxHeight: '85vh',
        boxSizing: 'border-box',
        boxShadow: '0 12px 32px rgba(0,0,0,0.8)',
        color: '#d9d9d9',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }
    });

    const head = h('div', {
      style: {
        flexShrink: '0',
        padding: '12px 16px',
        background: '#262626',
        borderBottom: '1px solid #303030',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontWeight: '600',
        color: '#fff',
        fontSize: '13px',
      }
    },
      h('span', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        SP.icons.keyboard(16),
        'Bảng phím tắt chuyên nghiệp (CAD Shortcuts)'
      ),
      h('button', {
        style: {
          background: 'transparent', border: '0', color: '#8c8c8c', cursor: 'pointer', padding: '4px'
        },
        onclick: () => { modalEl.remove(); modalEl = null; }
      }, SP.icons.close(16))
    );

    const rows = [
      { key: 'Giữ Chuột phải / Alt + Kéo trái', desc: 'Xoay xem 3D tạm thời quanh hộp (Hold-to-Orbit 3D, thả chuột về 2D)' },
      { key: 'F  /  Alt + F', desc: 'Đảo đầu xe 180° (Frame hiện tại hoặc các frame đang chọn)' },
      { key: 'Shift + F', desc: 'Đảo đầu xe 180° (Toàn bộ các frame của track)' },
      { key: 'G  /  Alt + G', desc: 'Hút đáy box sát mặt đất (Auto Ground Snap)' },
      { key: 'Ctrl + A (Case 2)', desc: 'Chọn toàn bộ (hoặc bỏ chọn) tất cả các frame đang hiển thị' },
      { key: 'Esc (Case 2)', desc: 'Hủy bỏ vùng chọn các frame (Bỏ chọn nhanh)' },
      { key: 'Home / End (Case 2)', desc: 'Nhảy tức thì tới frame đầu tiên / frame cuối cùng đang hiển thị' },
      { key: '↑ / ↓ (Case 2)', desc: 'Lùi / Tiến 1 frame liền kề trong danh sách hiển thị' },
      { key: 'Shift + ↑ / ↓ (Case 2)', desc: 'Mở rộng dải chọn frame liên tiếp bằng bàn phím (Range Selection)' },
      { key: 'PageUp / PageDn (Case 2)', desc: 'Nhảy nhanh lướt 5 frame trong danh sách hiển thị' },
      { key: 'O (Case 2)', desc: 'Bật / Tắt trạng thái Outside cho các frame đang chọn' },
      { key: 'U (Case 2)', desc: 'Bật / Tắt trạng thái Khuất (Occluded) cho các frame đang chọn' },
      { key: 'K (Case 2)', desc: 'Chốt Keyframe / Xóa Keyframe cho các frame đang chọn' },
      { key: 'I (Case 2)', desc: 'Mở hộp thoại Nội suy chọn lọc: ≥ 2 frame = giữa 2 mốc đầu/cuối; 1 frame = dựa trên 2 keyframe kề trước và sau' },
      { key: 'Focus Target / Click f...', desc: 'Nhảy CVAT tới frame đó & lia thẳng Camera 3D vào Cuboid' },
      { key: 'Giữ phím Alt + H', desc: 'Soi vệt di chuyển & điểm laser 2 frame trước trên màn hình 3D' },
      { key: 'Ctrl + `  /  Alt + Space', desc: 'Mở rộng / Thu nhỏ ngăn kéo đáy (Toggle Drawer)' },
      { key: 'F11', desc: 'Phóng to / Thu nhỏ ngăn kéo toàn màn hình (Fullscreen Studio)' },
      { key: 'Shift + Click', desc: 'Chọn dải nhiều frame liên tiếp trong danh sách' },
      { key: 'Ctrl + Z', desc: 'Hoàn tác thao tác sửa (Undo) & đồng bộ CVAT' },
      { key: 'Ctrl + Y', desc: 'Làm lại thao tác vừa hoàn tác (Redo) & đồng bộ CVAT' },
      { key: 'Ctrl + S', desc: 'Lưu thay đổi vào RAM và bấm Save của CVAT' },
      { key: 'Nút ⋯ (Sidebar / HUD)', desc: 'Mở công cụ 3D Helper tích hợp trong menu Cuboid của CVAT' },
      { key: '?', desc: 'Bật / Tắt bảng hướng dẫn phím tắt này' },
    ];

    const body = h('div', { style: { flex: '1 1 auto', minHeight: '0', padding: '12px 16px', overflowY: 'auto' } },
      h('table', {
        style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' }
      },
        h('thead', {},
          h('tr', { style: { borderBottom: '1px solid #303030', color: '#8c8c8c', textAlign: 'left' } },
            h('th', { style: { padding: '6px 8px', width: '185px' } }, 'Phím tắt'),
            h('th', { style: { padding: '6px 8px' } }, 'Chức năng thao tác')
          )
        ),
        h('tbody', {},
          rows.map((r) => h('tr', {
            style: { borderBottom: '1px solid #262626', transition: 'background 0.1s' },
            onmouseenter: (e) => { e.currentTarget.style.background = '#262626'; },
            onmouseleave: (e) => { e.currentTarget.style.background = 'transparent'; },
          },
            h('td', { style: { padding: '8px' } },
              h('kbd', {
                style: {
                  background: '#141414',
                  border: '1px solid #434343',
                  borderRadius: '3px',
                  padding: '2px 6px',
                  fontSize: '11px',
                  color: '#40a9ff',
                  fontFamily: 'SFMono-Regular, Consolas, monospace',
                  boxShadow: '0 1px 0 rgba(0,0,0,0.2)',
                }
              }, r.key)
            ),
            h('td', { style: { padding: '8px', color: '#d9d9d9' } }, r.desc)
          ))
        )
      )
    );

    const foot = h('div', {
      style: {
        padding: '8px 16px',
        background: '#141414',
        borderTop: '1px solid #303030',
        fontSize: '11px',
        color: '#8c8c8c',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }
    },
      'Nhấn Esc để đóng bảng hướng dẫn',
      h('span', { style: { color: '#177ddc', fontWeight: '500' } }, 'taquanglocit-tech')
    );

    card.append(head, body, foot);
    modalEl.append(card);
    document.body.append(modalEl);
  }

  function isInputActive() {
    let el = document.activeElement;
    if (el && el.shadowRoot && el.shadowRoot.activeElement) {
      el = el.shadowRoot.activeElement;
    } else if (SP.app?.shadow?.activeElement) {
      el = SP.app.shadow.activeElement;
    }
    if (!el) return false;
    const tag = el.tagName ? el.tagName.toLowerCase() : '';
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable ||
           el.closest?.('.ant-select') !== null ||
           el.closest?.('.ant-input-number') !== null ||
           el.closest?.('.ant-modal') !== null;
  }

  window.addEventListener('keydown', async (e) => {
    // 0. Nếu đang gõ trong ô input/textarea/select
    if (isInputActive()) {
      if (e.key === 'Escape') {
        const activeEl = document.activeElement || SP.app?.shadow?.activeElement;
        activeEl?.blur?.();
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
      }
      return;
    }

    // 0.1. Chặn phím Delete / Backspace khi thao tác trong Extension hoặc vừa thoát Fullscreen
    // để ngăn tuyệt đối không kích hoạt popup xóa track của CVAT gốc
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const path = e.composedPath?.() || [];
      const isInside = path.some(el => el.id === 'cvat-super-pro-root' || el.classList?.contains?.('drawer'));
      if (SP.app?._justExitedFullscreen || (isInside && !isInputActive())) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        return;
      }
    }

    const key = e.key.toLowerCase();

    // Phím ?: mở bảng tra phím tắt
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      e.stopPropagation();
      showHotkeysModal();
      return;
    }

    // Máy trạng thái phân tầng cho phím Escape (Modal -> Bỏ chọn Frame -> Thoát Fullscreen)
    if (e.key === 'Escape') {
      // Tầng 1: Đóng Modal đang mở
      if (modalEl) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        modalEl.remove();
        modalEl = null;
        return;
      }
      if (SP.app?.modalStack && SP.app.modalStack.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        SP.app.popModal();
        return;
      }

      // Tầng 2: Nếu đang ở Case 2 và có frame đang chọn -> Hủy chọn
      if (SP.app && !SP.app.isCollapsed && SP.app.currentTab === 'case2') {
        if (SP.app.mounted?.onKey?.(e)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          return;
        }
      }

      // Tầng 3: Nếu Extension đang Fullscreen -> Thoát Fullscreen
      if (SP.app?.isFullscreen) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        SP.app.toggleFullscreen();
        SP.app._justExitedFullscreen = true;
        setTimeout(() => { SP.app._justExitedFullscreen = false; }, 300);
        return;
      }

      // Tầng 4: Nếu đang mở Extension nhưng không có gì để đóng, nuốt phím để không lọt xuống CVAT
      const path = e.composedPath?.() || [];
      const isInside = path.some(el => el.id === 'cvat-super-pro-root' || el.classList?.contains?.('drawer'));
      if (isInside || SP.app?._justExitedFullscreen) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        return;
      }
    }

    // Chuyển tiếp các phím thao tác và điều hướng cho Case 2 khi Drawer đang mở
    if (SP.app && !SP.app.isCollapsed && SP.app.currentTab === 'case2') {
      // 1. Phím Ctrl+A / Cmd+A: Chọn tất cả frame đang hiển thị
      if ((e.ctrlKey || e.metaKey) && key === 'a' && !e.altKey && !e.shiftKey) {
        if (SP.app.mounted?.onKey?.(e)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // 2. Phím Home / End: Nhảy về đầu / cuối danh sách hiển thị
      if ((e.key === 'Home' || e.key === 'End') && !e.ctrlKey && !e.altKey) {
        if (SP.app.mounted?.onKey?.(e)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // 3. Phím Mũi tên Lên / Xuống / PageUp / PageDown: Điều hướng frame
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(e.key) && !e.ctrlKey && !e.altKey) {
        if (SP.app.mounted?.onKey?.(e)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // 4. Chuyển tiếp các phím thao tác nhanh O, U, K, I
      if (['o', 'u', 'k', 'i'].includes(key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (SP.app.mounted?.onKey?.(e)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
    }

    // Giữ phím Alt+H: Soi vệt di chuyển 2 frame trước trên màn hình 3D chính (không dùng V vì trùng phím bước nhảy của CVAT)
    const isGhostKey = (key === 'h' && e.altKey && !e.ctrlKey && !e.metaKey);

    if (isGhostKey && !isHoldingGhost) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      isHoldingGhost = true;
      SP.app?.peekMain3DGhost?.();
      return;
    }

    // Phím F: Đảo chiều 180 độ
    if (key === 'f' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (SP.app && !SP.app.isCollapsed && SP.app.currentTab === 'case2' && SP.app.mounted?.onKey?.(e)) {
        return;
      }
      const active = await SP.bridge.getActiveElement();
      if (active && active.activeId) {
        if (SP.app?.store?.track(active.activeId)) SP.app.snapshot([active.activeId]);
        await SP.bridge.flipActiveHeading(active.activeId, active.frame, e.shiftKey);
        if (SP.app?.store) {
          await SP.app.store.syncFromCvat();
          SP.app.changed?.();
        }
        SP.hud?.update?.(true);
      }
      return;
    }

    // Phím G: Hút đáy mặt đất
    if (key === 'g' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (SP.app && !SP.app.isCollapsed && SP.app.currentTab === 'case2' && SP.app.mounted?.onKey?.(e)) {
        return;
      }
      const active = await SP.bridge.getActiveElement();
      if (active && active.activeId) {
        if (SP.app?.store?.track(active.activeId)) SP.app.snapshot([active.activeId]);
        await SP.app.snapTrackToGround(active.activeId);
        SP.hud?.update?.(true);
      }
      return;
    }

    // Phím Ctrl + ` hoặc Alt + Space : Thu nhỏ / Mở rộng ngăn kéo đáy (Không chặn Space đơn để nhường cho CVAT Play/Pause)
    if ((e.ctrlKey && e.key === '`') || (e.altKey && (e.key === ' ' || key === 'd'))) {
      if (SP.app?.toggleDrawer) {
        e.preventDefault();
        SP.app.toggleDrawer();
      }
      return;
    }

    // Phím Ctrl + S: Lưu thay đổi trong Store và kích hoạt Save của CVAT
    if ((e.ctrlKey || e.metaKey) && key === 's' && !e.shiftKey) {
      if (SP.app?.store?.hasPendingSave?.()) {
        e.preventDefault();
        SP.app.save?.();
      }
      return;
    }

    // Hoàn tác (Undo: Ctrl+Z) và Làm lại (Redo: Ctrl+Y hoặc Ctrl+Shift+Z)
    // Chỉ chặn sự kiện khi Drawer đang mở và có lịch sử để không làm kẹt Undo gốc của CVAT
    if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) {
      if (SP.app && !SP.app.isCollapsed && SP.app.history?.length) {
        e.preventDefault();
        SP.app.undo?.();
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (key === 'y' || (key === 'z' && e.shiftKey))) {
      if (SP.app && !SP.app.isCollapsed && SP.app.redoHistory?.length) {
        e.preventDefault();
        SP.app.redo?.();
      }
      return;
    }
  }, true);

  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'h' && isHoldingGhost) {
      isHoldingGhost = false;
      SP.app?.clearMain3DGhost?.();
    }
  });

  window.addEventListener('blur', () => {
    if (isHoldingGhost) {
      isHoldingGhost = false;
      SP.app?.clearMain3DGhost?.();
    }
  });

  SP.hotkeys = { show: showHotkeysModal };
})();
