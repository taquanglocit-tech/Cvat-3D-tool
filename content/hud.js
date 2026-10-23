// hud.js - Thanh công cụ nổi mini (Floating Mini-HUD) trên màn hình 3D của CVAT
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});
  const { h } = SP.ui;

  let hudEl = null;
  let currentActiveId = null;
  let isLockedSize = false;
  let isDraggingHud = false;
  let isHoldingGhostBtn = false;
  let activeMenuEl = null;
  let lastHudSig = '';

  function loadHudPosition() {
    try {
      const saved = JSON.parse(localStorage.getItem('cvat_super_pro_hud_pos'));
      if (saved && typeof saved.left === 'number' && typeof saved.top === 'number') {
        return {
          left: Math.max(10, Math.min(window.innerWidth - 320, saved.left)),
          top: Math.max(10, Math.min(window.innerHeight - 60, saved.top)),
        };
      }
    } catch {}
    return null;
  }

  function saveHudPosition(left, top) {
    try {
      localStorage.setItem('cvat_super_pro_hud_pos', JSON.stringify({ left, top }));
    } catch {}
  }

  function ensureHud() {
    if (hudEl) return hudEl;

    const savedPos = loadHudPosition();

    hudEl = h('div', {
      class: 'cvat-super-pro-hud',
      style: {
        position: 'fixed',
        top: savedPos ? `${savedPos.top}px` : '108px',
        left: savedPos ? `${savedPos.left}px` : '50%',
        transform: savedPos ? 'none' : 'translateX(-50%)',
        zIndex: '2147483005',
        background: 'rgba(30, 30, 30, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #434343',
        borderRadius: '4px',
        padding: '3px 8px',
        display: 'none',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.45)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: '12px',
        color: '#d9d9d9',
        userSelect: 'none',
        transition: 'opacity 0.15s',
      }
    });

    // Kéo thả thanh HUD (Draggable)
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
    hudEl.addEventListener('mousedown', (e) => {
      // Bỏ qua nếu click vào nút bấm
      if (e.target.closest('button')) return;
      isDraggingHud = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = hudEl.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      hudEl.style.transform = 'none';
      hudEl.style.cursor = 'grabbing';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDraggingHud) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newLeft = Math.max(8, Math.min(window.innerWidth - hudEl.offsetWidth - 8, initialLeft + dx));
      const newTop = Math.max(8, Math.min(window.innerHeight - hudEl.offsetHeight - 8, initialTop + dy));
      hudEl.style.left = `${newLeft}px`;
      hudEl.style.top = `${newTop}px`;
    });

    window.addEventListener('mouseup', () => {
      if (isDraggingHud) {
        isDraggingHud = false;
        hudEl.style.cursor = 'default';
        const rect = hudEl.getBoundingClientRect();
        saveHudPosition(rect.left, rect.top);
      }
    });

    document.body.append(hudEl);
    return hudEl;
  }

  function btn(iconNode, text, title, onClick) {
    const b = h('button', {
      style: {
        background: '#1f1f1f',
        border: '1px solid #434343',
        borderRadius: '3px',
        padding: text ? '2px 8px' : '2px 6px',
        color: '#d9d9d9',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        font: 'inherit',
        fontSize: '12px',
        fontWeight: '400',
        transition: 'all 0.15s cubic-bezier(0.645, 0.045, 0.355, 1)',
      },
      title,
      onclick: async (e) => {
        e.stopPropagation();
        await onClick(e);
      }
    },
      iconNode,
      text ? h('span', {}, text) : null
    );
    b.onmouseenter = () => { b.style.borderColor = '#177ddc'; b.style.color = '#177ddc'; b.style.background = '#262626'; };
    b.onmouseleave = () => { b.style.borderColor = '#434343'; b.style.color = '#d9d9d9'; b.style.background = '#1f1f1f'; };
    return b;
  }

  function showQuickProfileMenu(targetEl, activeId, frame, profiles, curProf) {
    if (activeMenuEl) { activeMenuEl.remove(); activeMenuEl = null; }
    const rect = targetEl.getBoundingClientRect();
    const menu = h('div', {
      style: {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.bottom + 6}px`,
        zIndex: '2147483030',
        background: '#1f1f1f',
        border: '1px solid #434343',
        borderRadius: '4px',
        padding: '4px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        minWidth: '160px',
        fontFamily: 'inherit',
        fontSize: '11px',
        color: '#d9d9d9',
      }
    });

    const close = () => { if (activeMenuEl) { activeMenuEl.remove(); activeMenuEl = null; } };
    const onDocClick = (e) => { if (!menu.contains(e.target)) { close(); document.removeEventListener('click', onDocClick); } };
    setTimeout(() => document.addEventListener('click', onDocClick), 10);

    const titleEl = h('div', { style: { padding: '4px 8px', color: '#8c8c8c', fontWeight: 600, borderBottom: '1px solid #303030' } }, `Cấu hình cho f${frame}:`);
    menu.append(titleEl);

    for (const p of profiles) {
      const isCur = curProf?.id === p.id;
      const item = h('div', {
        style: {
          padding: '5px 8px',
          borderRadius: '3px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isCur ? 'rgba(23, 125, 220, 0.2)' : 'transparent',
          color: isCur ? '#40a9ff' : '#d9d9d9',
        },
        onclick: async () => {
          close();
          const pm = SP.app?.store?.profileManager;
          const t = SP.app?.store?.track(activeId);
          if (t && pm) {
            pm.assignFrames(activeId, [frame], p.id);
            t.applyProfile([frame], p.size);
            if (SP.app.store.syncTrackToCvat) await SP.app.store.syncTrackToCvat(t);
            SP.app.setStatus(`f${frame}: Đã gán cấu hình "${p.name}"`, 'ok');
            updateHud(true);
          }
        }
      },
        h('span', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
          h('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: p.color } }),
          p.name
        ),
        h('span', { style: { color: '#8c8c8c', fontSize: '10px' } }, `${p.size.map(v => v.toFixed(1)).join('×')}`)
      );
      item.onmouseenter = () => { item.style.background = '#262626'; };
      item.onmouseleave = () => { item.style.background = isCur ? 'rgba(23, 125, 220, 0.2)' : 'transparent'; };
      menu.append(item);
    }

    if (curProf) {
      const unassign = h('div', {
        style: { padding: '5px 8px', borderRadius: '3px', cursor: 'pointer', color: '#ff7875', borderTop: '1px solid #303030', marginTop: '2px' },
        onclick: () => {
          close();
          const pm = SP.app?.store?.profileManager;
          pm?.assignFrames(activeId, [frame], null);
          SP.app.setStatus(`f${frame}: Đã hủy gán cấu hình`, 'ok');
          updateHud(true);
        }
      }, '✕ Hủy gán (Về mặc định)');
      unassign.onmouseenter = () => { unassign.style.background = '#262626'; };
      unassign.onmouseleave = () => { unassign.style.background = 'transparent'; };
      menu.append(unassign);
    }

    const addBtn = h('div', {
      style: { padding: '5px 8px', borderRadius: '3px', cursor: 'pointer', color: '#73d13d', borderTop: '1px solid #303030', marginTop: '2px' },
      onclick: () => {
        close();
        const name = prompt('Đặt tên cho cấu hình mới:');
        if (name && name.trim()) {
          const pm = SP.app?.store?.profileManager;
          const pos = SP.app?.store?.track(activeId)?.at(frame);
          if (pos && pm) {
            const newP = pm.createProfile(activeId, name.trim(), pos.box.s);
            pm.assignFrames(activeId, [frame], newP.id);
            updateHud(true);
          }
        }
      }
    }, '+ Tạo cấu hình mới từ box này');
    addBtn.onmouseenter = () => { addBtn.style.background = '#262626'; };
    addBtn.onmouseleave = () => { addBtn.style.background = 'transparent'; };
    menu.append(addBtn);

    document.body.append(menu);
    activeMenuEl = menu;
  }

  async function updateHud(force = false) {
    if (!force && (isDraggingHud || isHoldingGhostBtn || activeMenuEl)) return;

    const hud = ensureHud();
    if (!SP.app?.store) {
      lastHudSig = '';
      hud.style.display = 'none';
      return;
    }

    let active;
    try {
      active = await SP.bridge.getActiveElement();
    } catch {
      lastHudSig = '';
      hud.style.display = 'none';
      return;
    }

    if (!active || !active.activeId || !active.state) {
      currentActiveId = null;
      lastHudSig = '';
      hud.style.display = 'none';
      return;
    }

    const { activeId, frame, state } = active;
    const pm = SP.app?.store?.profileManager;
    const profiles = pm?.getProfiles(activeId) || [];
    const curProf = pm?.getFrameProfile(activeId, frame);
    const cloud = SP.app?.getFrames?.()?.clouds?.get(frame);
    const ptsKey = Array.isArray(state.points) ? state.points.map((v) => Number(v).toFixed(3)).join(',') : '';
    const profSig = `${profiles.length}:${curProf?.id || ''}:${curProf?.name || ''}`;
    const sig = `${activeId}|${frame}|${ptsKey}|${isLockedSize ? 1 : 0}|${profSig}|${cloud?.xyz?.length || 0}`;

    if (!force && sig === lastHudSig && hud.style.display === 'flex') {
      return;
    }
    lastHudSig = sig;
    currentActiveId = activeId;
    hud.style.display = 'flex';

    hud.replaceChildren();

    const dot = h('span', {
      style: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: state.label?.color || '#58a6ff',
        display: 'inline-block',
      }
    });

    const title = h('span', {
      style: { fontWeight: '600', color: '#fff' }
    }, `Track #${activeId}`);

    // Đếm số điểm LiDAR bên trong box hiện tại (chỉ tính lại khi state/frame thay đổi)
    let ptCountText = '– pts';
    let isZeroPoints = false;
    const box = SP.geom.pointsToBox(state.points);
    if (cloud && cloud.xyz) {
      const inside = SP.geom.getPointsInsideBox(cloud.xyz, box);
      const count = inside.length / 3;
      ptCountText = `${count} pts`;
      if (count === 0) isZeroPoints = true;
    }

    const badgePts = h('span', {
      style: {
        padding: '1px 5px',
        borderRadius: '3px',
        fontSize: '11px',
        fontVariantNumeric: 'tabular-nums',
        background: isZeroPoints ? 'rgba(255, 77, 79, 0.15)' : 'rgba(82, 196, 26, 0.12)',
        border: `1px solid ${isZeroPoints ? '#ff4d4f' : '#52c41a'}`,
        color: isZeroPoints ? '#ff7875' : '#73d13d',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'default',
      },
      title: isZeroPoints ? 'Cảnh báo: Box này không chứa điểm LiDAR nào!' : 'Số điểm LiDAR trong box'
    },
      h('span', {
        style: {
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: isZeroPoints ? '#ff4d4f' : '#52c41a',
          display: 'inline-block',
        }
      }),
      ptCountText
    );

    const flipBtn = btn(SP.icons.flip(12), '180°', 'Đảo hướng 180 độ (Phím F)', async () => {
      await SP.bridge.flipActiveHeading(activeId, frame, false);
      if (SP.app?.store) await SP.app.store.syncFromCvat();
      updateHud(true);
    });

    const groundBtn = btn(SP.icons.ground(12), 'Hút đất', 'Hút đáy box sát đất (Phím G)', async () => {
      await SP.app.snapTrackToGround(activeId);
      updateHud(true);
    });

    const lockBtn = btn(
      isLockedSize ? SP.icons.lock(12) : SP.icons.unlock(12),
      isLockedSize ? 'Đã khóa' : 'Khóa size',
      'Khóa kích thước hộp: Không cho chuột kéo méo kích thước box',
      () => {
        isLockedSize = !isLockedSize;
        SP.app.isSizeLocked = isLockedSize;
        updateHud(true);
      }
    );
    if (isLockedSize) {
      lockBtn.style.background = '#177ddc';
      lockBtn.style.color = '#fff';
      lockBtn.style.borderColor = '#177ddc';
    }

    let profileBtn = null;
    if (profiles.length > 0) {
      const profColor = curProf?.color || '#8c8c8c';
      profileBtn = btn(
        h('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: profColor, display: 'inline-block' } }),
        curProf ? curProf.name : 'Profile',
        `Cấu hình kích thước: ${curProf ? curProf.name + ' (' + curProf.size.map(v => v.toFixed(2)).join('×') + 'm)' : 'Chưa gán'}. Click để đổi`,
        async (e) => {
          const t = SP.app?.store?.track(activeId);
          if (!t) return;
          if (profiles.length === 2 && curProf) {
            const nextProf = profiles.find((p) => p.id !== curProf.id) || profiles[0];
            pm.assignFrames(activeId, [frame], nextProf.id);
            t.applyProfile([frame], nextProf.size);
            if (SP.app.store.syncTrackToCvat) await SP.app.store.syncTrackToCvat(t);
            SP.app.setStatus(`f${frame}: Đã chuyển sang cấu hình "${nextProf.name}"`, 'ok');
            updateHud(true);
          } else {
            showQuickProfileMenu(e.currentTarget, activeId, frame, profiles, curProf);
          }
        }
      );
      if (curProf) {
        profileBtn.style.borderColor = curProf.color;
        profileBtn.style.background = 'rgba(255,255,255,0.06)';
      }
    } else {
      profileBtn = btn(
        null,
        '+ Profile',
        'Lưu kích thước box frame này thành Cấu hình đặt tên (Đứng, Ngồi, Xe có thùng...)',
        () => {
          const name = prompt('Đặt tên cho cấu hình mới (ví dụ: Đứng, Ngồi, Xe có thùng, v.v.):', 'Cấu hình 1');
          if (name && name.trim()) {
            const curSize = [state.points[6], state.points[7], state.points[8]];
            const newP = pm?.createProfile(activeId, name.trim(), curSize);
            pm?.assignFrames(activeId, [frame], newP.id);
            SP.app.setStatus(`Đã tạo và gán cấu hình "${newP.name}" cho f${frame}`, 'ok');
            updateHud(true);
          }
        }
      );
    }

    const dragHandle = h('span', {
      style: {
        cursor: 'grab',
        display: 'inline-flex',
        alignItems: 'center',
        color: '#6e7681',
        padding: '0 2px',
        marginRight: '-2px',
      },
      title: 'Nhấn giữ chuột để kéo thanh công cụ này đến vị trí mong muốn'
    }, SP.icons.dragHandle ? SP.icons.dragHandle(12) : '⋮');

    const ghostBtn = btn(
      SP.icons.trail ? SP.icons.trail(12) : null,
      'Soi vệt (Alt+H)',
      'Nhấn giữ nút này (hoặc giữ phím Alt+H) để soi vệt di chuyển & điểm laser 2 frame trước trên màn hình 3D',
      () => {}
    );
    ghostBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      isHoldingGhostBtn = true;
      SP.app?.peekMain3DGhost?.();
    });
    ghostBtn.addEventListener('mouseup', (e) => {
      e.stopPropagation();
      isHoldingGhostBtn = false;
      SP.app?.clearMain3DGhost?.();
    });
    ghostBtn.addEventListener('mouseleave', () => {
      if (isHoldingGhostBtn) {
        isHoldingGhostBtn = false;
        SP.app?.clearMain3DGhost?.();
      }
    });

    const drawerBtn = btn(SP.icons.layers(12), 'Sửa chuỗi', 'Mở ngăn kéo chỉnh sửa nhiều frame', () => {
      SP.app.openDrawer({ trackId: activeId, tab: 'case2' });
    });

    const moreBtn = btn(SP.icons.more(12), '', 'Menu thao tác & cài đặt cuboid', (e) => {
      const sidebarMenuBtn = document.querySelector(`#cvat-objects-sidebar-state-item-${activeId} .cvat-object-item-menu-button`);
      if (sidebarMenuBtn) {
        sidebarMenuBtn.click();
      } else {
        const rect = moreBtn.getBoundingClientRect();
        SP.contextMenu.show(rect.left, rect.bottom + 6, activeId, {
          labelName: state.label?.name,
          labelColor: state.label?.color,
        });
      }
    });

    const items = [dragHandle, dot, title, badgePts, flipBtn, groundBtn, lockBtn, ghostBtn];
    if (profileBtn) items.push(profileBtn);
    items.push(drawerBtn, moreBtn);

    hud.append(...items);
  }

  setInterval(updateHud, 400);

  SP.hud = { update: updateHud };
})();
