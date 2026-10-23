// context-menu.js - Menu ngữ cảnh kỹ thuật khi nhấp chuột phải trên 3D Canvas và Sidebar của CVAT
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});
  const { h } = SP.ui;

  let menuEl = null;

  function closeMenu() {
    if (menuEl) {
      menuEl.remove();
      menuEl = null;
    }
  }

  document.addEventListener('click', (e) => {
    if (menuEl && !menuEl.contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  async function showContextMenu(x, y, clientID, info = {}) {
    closeMenu();

    const labelName = info.labelName || 'Cuboid';
    const labelColor = info.labelColor || '#58a6ff';

    menuEl = h('div', {
      class: 'cvat-super-pro-context-menu',
      style: {
        position: 'fixed',
        left: `${Math.min(x, window.innerWidth - 240)}px`,
        top: `${Math.min(y, window.innerHeight - 260)}px`,
        zIndex: '2147483010',
        background: '#161b22',
        border: '1px solid #30363d',
        borderRadius: '6px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.65)',
        color: '#c9d1d9',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '12px',
        padding: '4px',
        minWidth: '220px',
        userSelect: 'none',
      }
    });

    const head = h('div', {
      style: {
        padding: '6px 10px',
        fontSize: '11px',
        fontWeight: '600',
        color: '#8b949e',
        borderBottom: '1px solid #21262d',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }
    },
      h('span', {
        style: {
          width: '8px', height: '8px', borderRadius: '50%', background: labelColor, display: 'inline-block'
        }
      }),
      `Track #${clientID} · ${labelName}`
    );

    function item(iconNode, label, shortcut, onClick) {
      const row = h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 10px',
          borderRadius: '4px',
          cursor: 'pointer',
          color: '#e6edf3',
          transition: 'background 0.1s',
        },
        onmouseenter: () => { row.style.background = '#1f6feb'; },
        onmouseleave: () => { row.style.background = 'transparent'; },
        onclick: async (e) => {
          e.stopPropagation();
          closeMenu();
          await onClick();
        }
      },
        iconNode,
        h('span', { style: { flex: '1' } }, label),
        shortcut ? h('span', { style: { fontSize: '10px', color: '#8b949e' } }, shortcut) : null
      );
      return row;
    }

    const divider = () => h('div', { style: { height: '1px', background: '#30363d', margin: '4px 0' } });

    menuEl.append(
      head,
      item(SP.icons.layers(14), 'Sửa chuỗi frame (Mở Drawer)', 'Alt+Space', () => {
        SP.app.openDrawer({ trackId: clientID, tab: 'case2' });
      }),
      item(SP.icons.flip(14), 'Đảo đầu 180° (Frame này)', 'F', async () => {
        await SP.bridge.flipActiveHeading(clientID, undefined, false);
      }),
      item(SP.icons.flip(14), 'Đảo đầu 180° (Toàn bộ track)', 'Shift+F', async () => {
        await SP.bridge.flipActiveHeading(clientID, undefined, true);
      }),
      item(SP.icons.ground(14), 'Hút đáy sát mặt đất', 'G', async () => {
        await SP.app.snapTrackToGround(clientID);
      }),
      divider(),
      item(SP.icons.overlap(14), 'Kiểm tra va chạm & Lỗi QA', '', () => {
        SP.app.openDrawer({ tab: 'case3' });
      }),
      item(SP.icons.keyboard(14), 'Bảng phím tắt CAD', '?', () => {
        SP.app.showHotkeysModal();
      })
    );

    document.body.append(menuEl);
  }

  // Lắng nghe sự kiện click vào nút 3 chấm trên Sidebar để ghi nhớ track đang tương tác
  let lastClickedTrackId = null;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.cvat-object-item-menu-button');
    if (btn) {
      const sidebarItem = btn.closest('[id^="cvat-objects-sidebar-state-item-"]');
      if (sidebarItem) {
        const match = /cvat-objects-sidebar-state-item-(\d+)/.exec(sidebarItem.id);
        if (match) lastClickedTrackId = Number(match[1]);
      }
    }
  }, true);

  // Tự động chèn các tính năng 3D Helper vào Menu Ant Design của nút 3 chấm gốc của CVAT
  // Đảm bảo thừa hưởng màu sắc và giao diện chuẩn của CVAT (hỗ trợ cả Light & Dark theme, không bị chữ trắng nền trắng)
  function injectSuperProItems(menuList, clientID) {
    if (!menuList || menuList.querySelector('.cvat-super-pro-injected')) return;
    const trackId = clientID || SP.app?.currentTrackId;
    if (!trackId) return;

    const divider = document.createElement('li');
    divider.className = 'cvat-super-pro-injected ant-dropdown-menu-item-divider';
    divider.style.cssText = 'height: 1px; margin: 4px 0; overflow: hidden;';

    const titleLi = document.createElement('li');
    titleLi.className = 'cvat-super-pro-injected ant-dropdown-menu-item-group-title';
    titleLi.style.cssText = 'padding: 6px 12px 2px 12px; font-size: 11px; font-weight: 600; color: rgba(128, 128, 128, 0.85); text-transform: uppercase; letter-spacing: 0.5px; user-select: none;';
    titleLi.textContent = `3D Helper (#${trackId})`;

    function makeItem(iconNode, text, onClick) {
      const li = document.createElement('li');
      li.className = 'cvat-super-pro-injected ant-dropdown-menu-item';
      li.style.cssText = 'padding: 0; margin: 0;';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ant-btn ant-btn-link';
      btn.style.cssText = 'width: 100%; text-align: left; display: flex; align-items: center; gap: 8px; padding: 5px 12px; font-size: 13px; color: inherit; height: auto; border: 0; background: transparent; cursor: pointer;';

      if (iconNode) {
        iconNode.style.display = 'inline-flex';
        iconNode.style.alignItems = 'center';
        iconNode.style.fontSize = '14px';
        iconNode.style.color = 'inherit';
        iconNode.style.opacity = '0.75';
      }

      const span = document.createElement('span');
      span.textContent = text;
      span.style.color = 'inherit';

      btn.append(iconNode, span);
      li.append(btn);

      li.onclick = async (ev) => {
        ev.stopPropagation();
        const drop = menuList.closest('.ant-dropdown');
        if (drop) drop.style.display = 'none';
        await onClick();
      };
      return li;
    }

    menuList.append(
      divider,
      titleLi,
      makeItem(SP.icons.layers(14), 'Sửa chuỗi frame (Mở Drawer)', () => {
        SP.app.openDrawer({ trackId, tab: 'case2' });
      }),
      makeItem(SP.icons.flip(14), 'Đảo đầu 180° (Frame này)', async () => {
        await SP.bridge.flipActiveHeading(trackId, undefined, false);
      }),
      makeItem(SP.icons.flip(14), 'Đảo đầu 180° (Toàn bộ track)', async () => {
        await SP.bridge.flipActiveHeading(trackId, undefined, true);
      }),
      makeItem(SP.icons.ground(14), 'Hút đáy sát mặt đất (G)', async () => {
        await SP.app.snapTrackToGround(trackId);
      }),
      makeItem(SP.icons.overlap(14), 'Kiểm tra va chạm Overlap', () => {
        SP.app.openDrawer({ tab: 'case3' });
      })
    );
  }

  // Tự động tìm và chèn tính năng vào Dropdown menu của CVAT khi người dùng mở nút 3 chấm
  const menuObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const menu = node.classList?.contains('cvat-object-item-menu')
          ? node
          : node.querySelector?.('.cvat-object-item-menu');
        if (menu) {
          injectSuperProItems(menu, lastClickedTrackId);
        }
      }
    }
  });
  menuObserver.observe(document.body, { childList: true, subtree: true });

  SP.contextMenu = { show: showContextMenu, close: closeMenu };
})();
