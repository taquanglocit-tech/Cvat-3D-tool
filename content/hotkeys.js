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
        background: '#161b22',
        border: '1px solid #30363d',
        borderRadius: '8px',
        width: '540px',
        maxWidth: '92%',
        boxShadow: '0 12px 32px rgba(0,0,0,0.8)',
        color: '#c9d1d9',
        overflow: 'hidden',
      }
    });

    const head = h('div', {
      style: {
        padding: '12px 16px',
        borderBottom: '1px solid #30363d',
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
          background: 'transparent', border: '0', color: '#8b949e', cursor: 'pointer', padding: '4px'
        },
        onclick: () => { modalEl.remove(); modalEl = null; }
      }, SP.icons.close(16))
    );

    const rows = [
      { key: 'F  /  Alt + F', desc: 'Đảo đầu xe 180° (Frame hiện tại)' },
      { key: 'Shift + F', desc: 'Đảo đầu xe 180° (Toàn bộ các frame của track)' },
      { key: 'G  /  Alt + G', desc: 'Hút đáy box sát mặt đất (Auto Ground Snap)' },
      { key: 'Giữ phím Alt + H', desc: 'Soi vệt di chuyển & điểm laser 2 frame trước trên màn hình 3D' },
      { key: 'Ctrl + `  /  Alt + Space', desc: 'Mở rộng / Thu nhỏ ngăn kéo đáy (Toggle Drawer)' },
      { key: 'Shift + Click', desc: 'Chọn dải nhiều frame liên tiếp trong danh sách' },
      { key: 'Ctrl + Z', desc: 'Hoàn tác thao tác sửa (Undo)' },
      { key: 'Ctrl + Y', desc: 'Làm lại thao tác vừa hoàn tác (Redo)' },
      { key: 'Ctrl + S', desc: 'Lưu thay đổi vào RAM và bấm Save của CVAT' },
      { key: 'Chuột phải', desc: 'Bật Menu ngữ cảnh nhanh trên 3D Canvas hoặc Sidebar' },
      { key: '?', desc: 'Bật / Tắt bảng hướng dẫn phím tắt này' },
    ];

    const body = h('div', { style: { padding: '12px 16px', maxHeight: '420px', overflowY: 'auto' } },
      h('table', {
        style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' }
      },
        h('thead', {},
          h('tr', { style: { borderBottom: '1px solid #21262d', color: '#8b949e', textAlign: 'left' } },
            h('th', { style: { padding: '6px 8px', width: '180px' } }, 'Phím tắt'),
            h('th', { style: { padding: '6px 8px' } }, 'Chức năng thao tác')
          )
        ),
        h('tbody', {},
          rows.map((r) => h('tr', {
            style: { borderBottom: '1px solid #21262d', transition: 'background 0.1s' },
            onmouseenter: (e) => { e.currentTarget.style.background = '#21262d'; },
            onmouseleave: (e) => { e.currentTarget.style.background = 'transparent'; },
          },
            h('td', { style: { padding: '8px' } },
              h('kbd', {
                style: {
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '11px',
                  color: '#58a6ff',
                  fontFamily: 'SFMono-Regular, Consolas, monospace',
                  boxShadow: '0 1px 0 rgba(0,0,0,0.2)',
                }
              }, r.key)
            ),
            h('td', { style: { padding: '8px', color: '#c9d1d9' } }, r.desc)
          ))
        )
      )
    );

    const foot = h('div', {
      style: {
        padding: '8px 16px',
        background: '#0d1117',
        borderTop: '1px solid #21262d',
        fontSize: '11px',
        color: '#8b949e',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }
    },
      'Nhấn Esc để đóng bảng hướng dẫn',
      h('span', { style: { color: '#58a6ff' } }, 'taquanglocit-tech')
    );

    card.append(head, body, foot);
    modalEl.append(card);
    document.body.append(modalEl);
  }

  function isInputActive() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || el.isContentEditable ||
           el.closest('.ant-select') !== null ||
           el.closest('.ant-input-number') !== null ||
           el.closest('.ant-modal') !== null;
  }

  window.addEventListener('keydown', async (e) => {
    if (isInputActive()) return;

    const key = e.key.toLowerCase();

    // Phím ?: mở bảng tra phím tắt
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      showHotkeysModal();
      return;
    }

    if (e.key === 'Escape') {
      if (modalEl) { modalEl.remove(); modalEl = null; return; }
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
      const active = await SP.bridge.getActiveElement();
      if (active && active.activeId) {
        await SP.bridge.flipActiveHeading(active.activeId, active.frame, e.shiftKey);
        if (SP.app?.store) await SP.app.store.syncFromCvat();
      }
      return;
    }

    // Phím G: Hút đáy mặt đất
    if (key === 'g' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const active = await SP.bridge.getActiveElement();
      if (active && active.activeId) {
        await SP.app.snapTrackToGround(active.activeId);
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

    // Hoàn tác (Undo: Ctrl+Z) và Làm lại (Redo: Ctrl+Y hoặc Ctrl+Shift+Z)
    if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) {
      e.preventDefault();
      SP.app?.undo?.();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (key === 'y' || (key === 'z' && e.shiftKey))) {
      e.preventDefault();
      SP.app?.redo?.();
      return;
    }
  });

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
