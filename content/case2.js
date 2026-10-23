// case2.js - Tab Case 2: Duyệt danh sách Frame, Thao tác hàng loạt (Batch Shift), Nội suy chọn lọc & Ghost Frames
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});
  const G = SP.geom;

  const CSS = `
    .c2-head, .c2-row { display: grid; grid-template-columns: 224px var(--img-col) 1fr 1fr 1fr; gap: 4px; }
    .c2-head { padding: 6px 10px; background: #1f1f1f; border-bottom: 1px solid #303030; font-weight: 600; font-size: 11px; color: #8c8c8c; text-transform: uppercase; letter-spacing: 0.3px; }
    .c2-wrap { position: relative; flex: 1; min-height: 0; }
    .c2-scroll { position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden; padding: 6px; }
    .c2-row { height: var(--row-h); margin-bottom: 6px; }
    .c2-row.sel .c2-info { outline: 2px solid #177ddc; background: rgba(23, 125, 220, 0.12); border-color: #177ddc; }
    .c2-info { background: #1f1f1f; border: 1px solid #303030; border-radius: 3px; padding: 8px; display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
    .c2-info .head { display: flex; align-items: center; justify-content: space-between; gap: 4px; flex-wrap: wrap; }
    .c2-info .grid { display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 3px 6px; align-items: center; font-size: 11px; font-variant-numeric: tabular-nums; }
    .c2-info input[type=number] { width: 100%; padding: 2px 4px; font-size: 11px; }
    .c2-info .btns { display: flex; flex-wrap: wrap; gap: 4px; margin-top: auto; }
    .c2-img { background: #0d0d0d; border-radius: 3px; border: 1px solid #262626; overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: zoom-in; color: #595959; font-size: 11px; }
    .c2-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .c2-view { position: relative; border-radius: 3px; background: transparent; touch-action: none; user-select: none; outline: 1px solid #262626; }
    .c2-view:hover { outline-color: #177ddc; }
    .vtools { position: absolute; top: 4px; right: 4px; display: flex; gap: 2px; opacity: 0; transition: opacity .15s; z-index: 2; }
    .c2-view:hover .vtools { opacity: 1; }
    .vtools button { padding: 1px 5px; font-size: 11px; background: rgba(20, 20, 20, 0.9); color: #d9d9d9; border: 1px solid #434343; border-radius: 2px; line-height: 16px; }
    .vtools button:hover { background: #177ddc; border-color: #177ddc; color: #fff; }
    .kf { font-size: 11px; font-weight: 500; padding: 1px 6px; border-radius: 2px; background: rgba(82, 196, 26, 0.16); color: #73d13d; border: 1px solid #52c41a; }
    .kf.interp { background: rgba(140, 140, 140, 0.12); color: #8c8c8c; border: 1px solid #434343; }
    .batch-bar { display: flex; align-items: center; gap: 6px; padding: 5px 12px; background: #141414; border-bottom: 1px solid #177ddc; font-size: 12px; color: #d9d9d9; flex-wrap: wrap; }
    .interp-modal { background: #1f1f1f; border: 1px solid #434343; border-radius: 4px; padding: 20px; width: 440px; box-shadow: 0 12px 32px rgba(0,0,0,0.7); color: #d9d9d9; }
    .interp-modal label { display: flex; align-items: center; gap: 8px; margin: 10px 0; font-size: 13px; color: #d9d9d9; cursor: pointer; }
    .prof-pill { font-size: 11px; font-weight: 500; padding: 1px 6px; border-radius: 2px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; border: 1px solid currentColor; line-height: 16px; user-select: none; transition: opacity 0.1s; }
    .prof-pill:hover { opacity: 0.85; }
    .prof-pill.empty { border: 1px dashed #595959; color: #8c8c8c; background: transparent; }
    .prof-pill.empty:hover { border-color: #177ddc; color: #177ddc; }
    .prof-modal { background: #1f1f1f; border: 1px solid #434343; border-radius: 4px; padding: 20px; width: 560px; max-width: 95vw; box-shadow: 0 16px 40px rgba(0,0,0,0.8); color: #d9d9d9; }
    .prof-row { display: grid; grid-template-columns: 12px 1fr 180px auto; gap: 8px; align-items: center; margin-bottom: 8px; padding: 8px 10px; background: #141414; border: 1px solid #303030; border-radius: 4px; }
  `;

  function mount(app, root, initialTrackId) {
    const { h, fmt } = SP.ui;
    const store = app.store;
    root.append(h('style', {}, CSS));

    if (!store || !store.meta || !store.frames?.length) {
      root.append(h('div', { class: 'bar', style: { color: '#8c8c8c', padding: '12px' } },
        'Đang kết nối và tải dữ liệu từ CVAT, vui lòng chờ trong giây lát…'
      ));
      const off = store ? store.on('load', () => {
        off();
        if (app.activeTab === 'case2') app.switchTab('case2', initialTrackId);
      }) : () => {};
      return { refresh() {}, unmount() { off(); } };
    }

    const S = (app.settings.case2 ||= {
      zoom: { top: 1, side: 1, front: 1 }, pointSize: 2, slab: 1, hideGround: false, allowTilt: false,
      context: true, syncSize: false, rowH: 220, showImage: true, camIdx: 0, minIntensity: 0.0,
    });

    const frameData = app.getFrames();
    const tracks = [...store.tracks.values()].sort((a, b) => a.uiId - b.uiId);
    if (!tracks.length) {
      root.append(h('div', { class: 'bar', style: { color: '#8c8c8c' } }, 'Job này không có track cuboid nào.'));
      return { unmount() {} };
    }

    let track = store.track(initialTrackId) || tracks[0];
    let grid = null;
    let rows = new Map();
    let selectedFrames = new Set();
    let lastSelectedFrame = null;
    let startDragBoxes = new Map();
    let selectKfBtn = null;
    const settings = { ...S, refSize: [1, 1, 1], color: '#3fb950' };

    // ---------- Thanh công cụ trên ----------
    const trackSel = h('select', { onchange: () => openTrack(store.track(Number(trackSel.value))) },
      tracks.map((t) => h('option', { value: t.id }, `#${t.uiId} · ${store.labelName(t.labelId)} (f${t.firstFrame}–f${t.lastFrame})`)));
    const fromIn = h('input', { type: 'number', style: { width: '55px' } });
    const toIn = h('input', { type: 'number', style: { width: '55px' } });
    const camSel = h('select', {
      title: 'Chọn góc camera đối chiếu',
      onchange: () => { S.camIdx = Number(camSel.value); reloadVisibleImages(); }
    }, h('option', { value: 0 }, 'Cam #0'));

    const pfill = h('div', { style: { height: '100%', background: '#177ddc', width: '0%', transition: 'width 0.2s' } });
    const ptext = h('span', { style: { position: 'absolute', inset: 0, textAlign: 'center', fontSize: '11px', lineHeight: '18px', color: '#fff' } });
    const pbar = h('div', { style: { position: 'relative', width: '170px', height: '18px', background: '#141414', border: '1px solid #434343', borderRadius: '3px', overflow: 'hidden' }, hidden: true }, pfill, ptext);

    const check = (key, text, title, after) => h('label', { title, style: { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' } },
      h('input', { type: 'checkbox', checked: !!S[key], onchange: (e) => { S[key] = e.target.checked; settings[key] = S[key]; after?.(); renderAll(); } }), text);

    const batchBar = h('div', { class: 'batch-bar', hidden: true });
    const head = h('div', { class: 'c2-head' }, h('span', {}, 'Thông tin Track & Frame'), h('span', {}, 'Camera'), h('span', {}, 'Top View (Z)'), h('span', {}, 'Side View (Y)'), h('span', {}, 'Front View (X)'));
    const scroller = h('div', { class: 'c2-scroll' });
    const wrap = h('div', { class: 'c2-wrap' }, scroller);

    function applyLayout() {
      root.style.setProperty('--row-h', `${S.rowH}px`);
      root.style.setProperty('--img-col', S.showImage ? '1.15fr' : '0px');
      grid?.resize();
    }

    root.append(
      h('div', { class: 'bar', style: { gap: '8px' } },
        h('label', { style: { fontWeight: 600, color: '#fff' } }, 'Track:', trackSel),
        h('label', {}, 'Frame:', fromIn, '→', toIn),
        h('button', { onclick: () => buildRows() }, 'Lọc'),
        h('span', { class: 'divider' }),
        h('button', {
          title: 'Quản lý các cấu hình kích thước đặt tên (Đứng, Ngồi, Xe có thùng, Đầu kéo...)',
          style: { display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 },
          onclick: () => openProfileManagerModal()
        }, SP.icons.cube(12), 'Cấu hình Size'),
        check('syncSize', 'Khóa & Đồng bộ L/W/H', 'Tự động đồng bộ kích thước sang các frame chưa gán cấu hình riêng'),
        selectKfBtn = h('button', { onclick: selectAllKeyframes, title: 'Chọn hoặc bỏ chọn nhanh tất cả keyframe của track' }, 'Chọn Keyframes'),
        h('span', { class: 'divider' }),
        check('showImage', 'Ảnh Cam', 'Hiện hoặc ẩn cột ảnh Camera đối chiếu', applyLayout),
        camSel,
        h('label', { title: 'Lọc các điểm có cường độ phản xạ thấp' }, 'Lọc nhiễu:',
          h('input', { type: 'range', min: '0', max: '0.8', step: '0.05', value: S.minIntensity, style: { width: '64px' },
            oninput: (e) => { S.minIntensity = Number(e.target.value); settings.minIntensity = S.minIntensity; renderAll(); } })),
        h('button', {
          title: 'Xóa cache RAM và tải lại toàn bộ Point Cloud từ máy chủ CVAT',
          style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
          onclick: () => {
            frameData.reload();
            buildRows();
            app.setStatus('Đang tải lại dữ liệu Point Cloud...', 'ok');
          }
        }, SP.icons.refresh(12), 'Tải lại PCD'),
        pbar
      ),
      batchBar,
      head,
      wrap
    );
    applyLayout();

    function renderAll() {
      grid?.requestRender();
    }

    function refSizeOf(t) {
      const s = [0, 0, 0];
      for (const sh of t.shapes) for (let i = 0; i < 3; i++) s[i] = Math.max(s[i], sh.points[6 + i]);
      return s.map((v) => Math.max(v, 0.3));
    }

    function getCloud(frame) {
      const full = frameData.clouds.get(frame);
      if (!full || !full.xyz) return null;
      return full;
    }

    // ---------- 1. QUẢN LÝ CẤU HÌNH KÍCH THƯỚC (Named Size Profiles) ----------
    function openProfileManagerModal() {
      const pm = store.profileManager;
      if (!pm) return;
      const overlay = h('div', {
        style: {
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(3px)',
          zIndex: 2147483020,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }
      });
      const content = h('div', { class: 'prof-modal' });

      function renderProfiles() {
        content.replaceChildren();
        const profiles = pm.getProfiles(track.id);

        const title = h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #303030', paddingBottom: '8px' } },
          h('span', { style: { color: '#fff', fontSize: '14px', fontWeight: 600 } }, `Cấu hình Kích thước · Track #${track.uiId}`),
          h('button', {
            style: { background: 'transparent', border: 0, color: '#8c8c8c', cursor: 'pointer', fontSize: '16px', padding: '0 4px' },
            onclick: () => overlay.remove()
          }, '✕')
        );

        const desc = h('div', { style: { fontSize: '12px', color: '#8c8c8c', marginBottom: '14px', lineHeight: '1.5' } },
          'Gán tên và kích thước chuẩn theo trạng thái (Đứng, Ngồi, Xe có thùng, Đầu kéo...). Khi chỉnh sửa kích thước 1 frame, các frame khác cùng cấu hình sẽ tự động đồng bộ theo.'
        );

        const listEl = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto', marginBottom: '14px' } });

        if (!profiles.length) {
          listEl.append(h('div', { style: { padding: '24px', textAlign: 'center', color: '#8c8c8c', fontSize: '12px', border: '1px dashed #303030', borderRadius: '4px' } },
            'Chưa có cấu hình nào. Bấm nút "+ Thêm Cấu hình Mới" để tạo cấu hình đầu tiên.'
          ));
        } else {
          for (const p of profiles) {
            const assignedCount = pm.getFramesWithProfile(track.id, p.id).length;

            const nameIn = h('input', {
              type: 'text',
              value: p.name,
              style: { width: '130px', padding: '4px 8px', background: '#1f1f1f', border: '1px solid #434343', borderRadius: '2px', color: '#fff', fontSize: '12px' }
            });
            nameIn.onchange = () => {
              pm.updateProfile(track.id, p.id, { name: nameIn.value.trim() || p.name });
              afterEdit(false);
            };

            const lIn = h('input', { type: 'number', step: '0.05', value: p.size[0].toFixed(2), style: { width: '50px', padding: '4px 6px', background: '#1f1f1f', border: '1px solid #434343', borderRadius: '2px', color: '#fff', fontSize: '12px', textAlign: 'center' }, title: 'Chiều dài (L)' });
            const wIn = h('input', { type: 'number', step: '0.05', value: p.size[1].toFixed(2), style: { width: '50px', padding: '4px 6px', background: '#1f1f1f', border: '1px solid #434343', borderRadius: '2px', color: '#fff', fontSize: '12px', textAlign: 'center' }, title: 'Chiều rộng (W)' });
            const hIn = h('input', { type: 'number', step: '0.05', value: p.size[2].toFixed(2), style: { width: '50px', padding: '4px 6px', background: '#1f1f1f', border: '1px solid #434343', borderRadius: '2px', color: '#fff', fontSize: '12px', textAlign: 'center' }, title: 'Chiều cao (H)' });

            const onSizeChange = () => {
              const newSize = [Number(lIn.value) || p.size[0], Number(wIn.value) || p.size[1], Number(hIn.value) || p.size[2]];
              pm.updateProfile(track.id, p.id, { size: newSize });
              const assigned = pm.getFramesWithProfile(track.id, p.id);
              if (assigned.length) {
                track.applyProfile(assigned, newSize);
                afterEdit();
              }
            };
            lIn.onchange = onSizeChange;
            wIn.onchange = onSizeChange;
            hIn.onchange = onSizeChange;

            const applyBtn = h('button', {
              style: { padding: '4px 8px', fontSize: '11px', background: '#262626', border: '1px solid #434343', borderRadius: '2px', color: '#d9d9d9', cursor: 'pointer' },
              title: `Áp dụng kích thước này cho ${assignedCount} frame đang theo cấu hình`,
              onclick: () => {
                const assigned = pm.getFramesWithProfile(track.id, p.id);
                if (assigned.length) {
                  track.applyProfile(assigned, p.size);
                  afterEdit();
                  app.setStatus(`Đã áp dụng kích thước cấu hình "${p.name}" cho ${assigned.length} frames`, 'ok');
                } else {
                  app.setStatus(`Chưa có frame nào gán cấu hình "${p.name}"`, 'err');
                }
              }
            }, `Áp dụng (${assignedCount}f)`);

            const delBtn = h('button', {
              style: { padding: '4px 8px', fontSize: '11px', color: '#ff7875', background: 'transparent', border: '1px solid #434343', borderRadius: '2px', cursor: 'pointer' },
              title: 'Xóa cấu hình này (các frame sẽ về mặc định)',
              onclick: () => {
                pm.deleteProfile(track.id, p.id);
                renderProfiles();
                afterEdit(false);
              }
            }, 'Xóa');

            const dot = h('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: p.color, display: 'inline-block' } });

            const row = h('div', { class: 'prof-row' },
              dot,
              nameIn,
              h('div', { style: { display: 'flex', gap: '3px', alignItems: 'center' } }, lIn, '×', wIn, '×', hIn),
              h('div', { style: { display: 'flex', gap: '4px' } }, applyBtn, delBtn)
            );
            listEl.append(row);
          }
        }

        const addBtn = h('button', {
          class: 'primary',
          style: { width: '100%', padding: '7px 12px', fontSize: '12px', background: '#177ddc', color: '#fff', border: 0, borderRadius: '2px', cursor: 'pointer', fontWeight: 500 },
          onclick: () => {
            const curPos = track.at(fromIn.value || track.firstFrame);
            const refS = curPos ? curPos.box.s : [1, 1, 1];
            pm.createProfile(track.id, `Cấu hình ${profiles.length + 1}`, refS);
            renderProfiles();
            afterEdit(false);
          }
        }, '+ Thêm Cấu hình Mới');

        content.append(title, desc, listEl, addBtn);
      }

      renderProfiles();
      overlay.append(content);
      document.body.append(overlay);
    }

    function showProfilePicker(targetEl, frameOrFrames, onDone) {
      const pm = store.profileManager;
      if (!pm) return;
      const isBatch = Array.isArray(frameOrFrames);
      const frames = isBatch ? frameOrFrames : [frameOrFrames];
      const curProfId = isBatch ? null : pm.getFrameProfileId(track.id, frames[0]);
      const profiles = pm.getProfiles(track.id);

      const rect = targetEl.getBoundingClientRect();
      const menu = h('div', {
        style: {
          position: 'fixed',
          left: `${Math.min(window.innerWidth - 220, rect.left)}px`,
          top: `${Math.min(window.innerHeight - 220, rect.bottom + 4)}px`,
          zIndex: 2147483040,
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '6px',
          padding: '6px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          minWidth: '200px',
          fontFamily: 'inherit',
          fontSize: '11px',
        }
      });

      const close = () => menu.remove();
      const onDocClick = (e) => { if (!menu.contains(e.target)) { close(); document.removeEventListener('click', onDocClick); } };
      setTimeout(() => document.addEventListener('click', onDocClick), 10);

      menu.append(h('div', { style: { padding: '4px 6px', color: '#8b949e', fontWeight: 600, borderBottom: '1px solid #21262d' } },
        isBatch ? `Gán cấu hình cho ${frames.length} frames:` : `Gán cấu hình cho Frame ${frames[0]}:`
      ));

      for (const p of profiles) {
        const isCur = curProfId === p.id;
        const item = h('div', {
          style: {
            padding: '5px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isCur ? '#1f6feb22' : 'transparent',
            color: isCur ? '#58a6ff' : '#c9d1d9',
          },
          onclick: () => {
            close();
            pm.assignFrames(track.id, frames, p.id);
            track.applyProfile(frames, p.size);
            afterEdit();
            app.setStatus(`Đã gán cấu hình "${p.name}" cho ${frames.length} frames`, 'ok');
            onDone?.();
          }
        },
          h('span', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
            h('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: p.color } }),
            p.name
          ),
          h('span', { style: { color: '#8b949e', fontSize: '10px' } }, p.size.map(v => v.toFixed(1)).join('×'))
        );
        item.onmouseenter = () => { item.style.background = '#21262d'; };
        item.onmouseleave = () => { item.style.background = isCur ? '#1f6feb22' : 'transparent'; };
        menu.append(item);
      }

      if (curProfId || isBatch) {
        const unassign = h('div', {
          style: { padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', color: '#f85149', borderTop: '1px solid #21262d', marginTop: '2px' },
          onclick: () => {
            close();
            pm.assignFrames(track.id, frames, null);
            afterEdit(false);
            app.setStatus(`Đã hủy gán cấu hình cho ${frames.length} frames`, 'ok');
            onDone?.();
          }
        }, '✕ Hủy gán (Về mặc định)');
        unassign.onmouseenter = () => { unassign.style.background = '#21262d'; };
        unassign.onmouseleave = () => { unassign.style.background = 'transparent'; };
        menu.append(unassign);
      }

      const createNew = h('div', {
        style: { padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', color: '#3fb950', borderTop: '1px solid #21262d', marginTop: '2px' },
        onclick: () => {
          close();
          const name = prompt('Đặt tên cấu hình mới (ví dụ: Có kéo thùng, Đầu kéo đơn, Đứng, Ngồi):');
          if (name && name.trim()) {
            const basePos = track.at(frames[0]);
            const s = basePos ? basePos.box.s : [1, 1, 1];
            const newP = pm.createProfile(track.id, name.trim(), s);
            pm.assignFrames(track.id, frames, newP.id);
            afterEdit();
            app.setStatus(`Đã tạo và gán cấu hình "${newP.name}" cho ${frames.length} frames`, 'ok');
            onDone?.();
          }
        }
      }, `+ Tạo mới từ kích thước f${frames[0]}`);
      createNew.onmouseenter = () => { createNew.style.background = '#21262d'; };
      createNew.onmouseleave = () => { createNew.style.background = 'transparent'; };
      menu.append(createNew);

      const manageItem = h('div', {
        style: { padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', color: '#58a6ff', borderTop: '1px solid #21262d', marginTop: '2px' },
        onclick: () => {
          close();
          openProfileManagerModal();
        }
      }, 'Quản lý cấu hình…');
      manageItem.onmouseenter = () => { manageItem.style.background = '#21262d'; };
      manageItem.onmouseleave = () => { manageItem.style.background = 'transparent'; };
      menu.append(manageItem);

      document.body.append(menu);
    }

    // ---------- 2. NỘI SUY CHỌN LỌC (Selective Interpolation Modal) ----------
    function openSelectiveInterpModal(minF, maxF) {
      const overlay = h('div', {
        style: {
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(3px)',
          zIndex: 2147483020,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }
      });
      const posCheck = h('input', { type: 'checkbox', checked: true, style: { accentColor: '#177ddc' } });
      const sizeLockCheck = h('input', { type: 'checkbox', checked: true, style: { accentColor: '#177ddc' } }); // Mặc định KHÓA kích thước
      const yawCheck = h('input', { type: 'checkbox', checked: true, style: { accentColor: '#177ddc' } });

      const applyBtn = h('button', {
        style: { padding: '6px 14px', background: '#177ddc', border: 0, borderRadius: '2px', color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: '12px' },
        onclick: () => {
          track.interpolateRange(minF, maxF, {
            interpPos: posCheck.checked,
            interpSize: !sizeLockCheck.checked, // nếu khóa thì không nội suy kích thước
            interpYaw: yawCheck.checked,
          });
          overlay.remove();
          afterEdit();
          app.setStatus(`Đã nội suy đoạn f${minF} → f${maxF} (Khóa Size: ${sizeLockCheck.checked ? 'BẬT' : 'TẮT'})`, 'ok');
        }
      }, 'Thực Hiện Nội Suy');

      const closeBtn = h('button', {
        style: { padding: '6px 14px', background: '#262626', border: '1px solid #434343', borderRadius: '2px', color: '#d9d9d9', cursor: 'pointer', fontSize: '12px' },
        onclick: () => overlay.remove()
      }, 'Hủy');

      const title = h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #303030', paddingBottom: '8px' } },
        h('span', { style: { color: '#fff', fontSize: '14px', fontWeight: 600 } }, `Nội suy chọn lọc · f${minF} → f${maxF}`),
        h('button', {
          style: { background: 'transparent', border: 0, color: '#8c8c8c', cursor: 'pointer', fontSize: '16px', padding: '0 4px' },
          onclick: () => overlay.remove()
        }, '✕')
      );

      const modal = h('div', { class: 'interp-modal' },
        title,
        h('div', { style: { fontSize: '12px', color: '#8c8c8c', marginBottom: '12px' } }, 'Chọn các thành phần hình học cần nội suy lại giữa 2 mốc keyframe đầu và cuối:'),
        h('label', {}, posCheck, 'Nội suy quỹ đạo tọa độ (X, Y, Z) mượt mà'),
        h('label', {}, sizeLockCheck, h('span', { style: { color: '#177ddc', fontWeight: 500 } }, 'Khóa kích thước hộp (Giữ nguyên kích thước L, W, H chuẩn)')),
        h('label', {}, yawCheck, 'Nội suy góc quay hướng xe (Góc Yaw đường ngắn nhất)'),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' } }, closeBtn, applyBtn)
      );

      overlay.append(modal);
      document.body.append(overlay);
    }

    // ---------- 2. THAO TÁC HÀNG LOẠT (Batch Operations Bar) ----------
    function updateBatchBar() {
      if (selectedFrames.size <= 1) {
        batchBar.hidden = true;
        return;
      }
      batchBar.hidden = false;
      batchBar.replaceChildren();

      const sorted = [...selectedFrames].sort((a, b) => a - b);
      const minF = sorted[0];
      const maxF = sorted[sorted.length - 1];

      const dxIn = h('input', { type: 'number', step: '0.05', value: '0', style: { width: '45px' } });
      const dyIn = h('input', { type: 'number', step: '0.05', value: '0', style: { width: '45px' } });
      const dzIn = h('input', { type: 'number', step: '0.05', value: '0', style: { width: '45px' } });

      const applyShiftBtn = h('button', {
        class: 'primary small',
        onclick: () => {
          const dx = Number(dxIn.value) || 0, dy = Number(dyIn.value) || 0, dz = Number(dzIn.value) || 0;
          track.shiftBatch([...selectedFrames], [dx, dy, dz]);
          afterEdit();
          app.setStatus(`Đã tịnh tiến ${selectedFrames.size} frames lượng [${dx}, ${dy}, ${dz}]`, 'ok');
        }
      }, 'Dịch (Shift)');

      const interpBtn = h('button', {
        style: { background: '#1f6feb', color: '#fff', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' },
        onclick: () => openSelectiveInterpModal(minF, maxF)
      }, SP.icons.interpolate(12), 'Nội suy chọn lọc');

      const removeKfBtn = h('button', {
        title: 'Xóa keyframe của các frame đã chọn để tự động nội suy',
        style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
        onclick: () => {
          track.removeKeyframesBatch([...selectedFrames]);
          afterEdit();
          app.setStatus(`Đã xóa keyframe cho ${selectedFrames.size} frames`, 'ok');
        }
      }, SP.icons.close(12), 'Xóa Keyframe');

      const makeKfBtn = h('button', {
        title: 'Chốt vị trí hiện tại thành keyframe cố định',
        style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
        onclick: () => {
          track.createKeyframesBatch([...selectedFrames]);
          afterEdit();
          app.setStatus(`Đã chốt keyframe cho ${selectedFrames.size} frames`, 'ok');
        }
      }, SP.icons.check(12), 'Chốt Keyframe');

      const flipBtn = h('button', {
        style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
        onclick: () => {
          track.flipHeadingBatch([...selectedFrames]);
          afterEdit();
          app.setStatus(`Đã đảo chiều đầu xe 180° cho ${selectedFrames.size} frames`, 'ok');
        }
      }, SP.icons.flip(12), 'Đảo 180° (F)');

      const snapGroundBtn = h('button', {
        style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
        onclick: async () => {
          for (const f of selectedFrames) {
            const cloud = await frameData.cloud(f);
            const pos = track.at(f);
            if (pos) {
              const res = G.snapToGround(cloud.xyz, pos.box);
              if (res) track.setBox(f, res.box);
            }
          }
          afterEdit();
          app.setStatus(`Đã hút đáy chạm đất cho ${selectedFrames.size} frames`, 'ok');
        }
      }, SP.icons.ground(12), 'Hút đất (G)');

      // Xoay Yaw hàng loạt cho các frame đã chọn
      function rotateBatch(deg) {
        const rad = (deg * Math.PI) / 180;
        if (app.snapshot) app.snapshot([track.id]);
        else track.snapshot();
        for (const f of selectedFrames) {
          const pos = track.at(f);
          if (!pos) continue;
          const b = G.cloneBox(pos.box);
          b.r = G.rotateLocal(b.r, 2, rad);
          track.setBox(f, b);
        }
        afterEdit();
        app.setStatus(`Đã xoay ${deg > 0 ? '+' : ''}${deg}° cho ${selectedFrames.size} frames`, 'ok');
      }

      const rotNeg5 = h('button', { onclick: () => rotateBatch(-5), title: 'Xoay ngược chiều 5°' }, '⟲ -5°');
      const rotPos5 = h('button', { onclick: () => rotateBatch(5), title: 'Xoay cùng chiều 5°' }, '⟳ +5°');
      const rotNeg15 = h('button', { onclick: () => rotateBatch(-15), title: 'Xoay ngược chiều 15°' }, '⟲ -15°');
      const rotPos15 = h('button', { onclick: () => rotateBatch(15), title: 'Xoay cùng chiều 15°' }, '⟳ +15°');

      // Đồng bộ kích thước chuẩn sang toàn bộ frame đã chọn
      const syncBatchSizeBtn = h('button', {
        title: 'Lấy kích thước chuẩn (L, W, H) của frame đầu tiên áp dụng cho toàn bộ các frame đang chọn',
        onclick: () => {
          const refPos = track.at(minF);
          if (!refPos) return;
          if (app.snapshot) app.snapshot([track.id]);
          else track.snapshot();
          for (const f of selectedFrames) {
            const p = track.at(f);
            if (p) {
              const b = G.cloneBox(p.box);
              b.s = refPos.box.s.slice();
              track.setBox(f, b);
            }
          }
          afterEdit();
          app.setStatus(`Đã đồng bộ kích thước [${refPos.box.s.map(v => v.toFixed(2)).join(' x ')}] cho ${selectedFrames.size} frames`, 'ok');
        }
      }, 'Đồng bộ Size L/W/H');

      // Gán cấu hình kích thước hàng loạt
      const assignProfileBtn = h('button', {
        title: 'Gán cấu hình kích thước đồng bộ cho tất cả các frame đang chọn (neo chân/đáy chạm đất)',
        style: { display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#21262d', border: '1px solid #30363d', color: '#177ddc', fontWeight: 600 },
        onclick: (e) => {
          showProfilePicker(e.currentTarget, [...selectedFrames], () => updateBatchBar());
        }
      }, 'Gán Cấu hình ▾');

      // Đặt Outside hàng loạt
      const batchOutsideBtn = h('button', {
        title: 'Đánh dấu các frame đã chọn là Outside (vật thể bị khuất hoặc đi ra khỏi tầm quét)',
        onclick: () => {
          track.setOutsideBatch([...selectedFrames], true);
          afterEdit();
          app.setStatus(`Đã đặt Outside = true cho ${selectedFrames.size} frames`, 'ok');
        }
      }, 'Gán Outside');

      batchBar.append(
        h('span', { style: { fontWeight: 600, color: '#fff' } }, `Đang chọn ${selectedFrames.size}f (f${minF}→f${maxF})`),
        h('span', { class: 'divider' }),
        h('label', {}, 'ΔX:', dxIn),
        h('label', {}, 'ΔY:', dyIn),
        h('label', {}, 'ΔZ:', dzIn),
        applyShiftBtn,
        h('span', { class: 'divider' }),
        rotNeg5, rotPos5, rotNeg15, rotPos15,
        h('span', { class: 'divider' }),
        assignProfileBtn,
        syncBatchSizeBtn,
        batchOutsideBtn,
        h('span', { class: 'divider' }),
        interpBtn,
        makeKfBtn,
        removeKfBtn,
        snapGroundBtn,
        flipBtn,
        h('span', { class: 'divider' }),
        h('button', {
          style: { cursor: 'pointer', background: 'transparent', border: '1px solid #434343', color: '#ff7875', borderRadius: '2px', padding: '2px 8px' },
          onclick: () => { selectedFrames.clear(); lastSelectedFrame = null; updateSelectionUI(); }
        }, '✕ Bỏ chọn')
      );
    }

    function selectAllKeyframes() {
      const kfFrames = track.shapes.map((s) => s.frame);
      const allSelected = kfFrames.length > 0 && kfFrames.every((f) => selectedFrames.has(f));
      if (allSelected) {
        selectedFrames.clear();
        lastSelectedFrame = null;
      } else {
        selectedFrames.clear();
        for (const f of kfFrames) selectedFrames.add(f);
      }
      updateSelectionUI();
    }

    // ---------- 3. RANGE SELECTION (Shift+Click như Excel/Explorer) ----------
    function handleRowClick(frame, e) {
      if (e.target.closest('button, input, select, .c2-view, .c2-img, canvas, svg')) {
        return;
      }

      const from = Number(fromIn.value) || store.frames[0];
      const to = Number(toIn.value) || store.frames[store.frames.length - 1];
      const list = store.frames.filter((f) => f >= from && f <= to);

      if (e.shiftKey && lastSelectedFrame !== null) {
        const idxA = list.indexOf(lastSelectedFrame);
        const idxB = list.indexOf(frame);
        if (idxA >= 0 && idxB >= 0) {
          const start = Math.min(idxA, idxB);
          const end = Math.max(idxA, idxB);
          for (let i = start; i <= end; i++) {
            selectedFrames.add(list[i]);
          }
        }
      } else if (e.ctrlKey || e.metaKey) {
        if (selectedFrames.has(frame)) selectedFrames.delete(frame);
        else selectedFrames.add(frame);
        lastSelectedFrame = frame;
      } else {
        selectedFrames.clear();
        selectedFrames.add(frame);
        lastSelectedFrame = frame;
      }
      updateSelectionUI();
    }

    function updateSelectionUI() {
      for (const [f, r] of rows.entries()) {
        const isSel = selectedFrames.has(f);
        r.el.classList.toggle('sel', isSel);
        if (r.chk) r.chk.checked = isSel;
      }
      const kfFrames = track?.shapes?.map((s) => s.frame) || [];
      const allKfSelected = kfFrames.length > 0 && kfFrames.every((f) => selectedFrames.has(f));
      if (selectKfBtn) {
        selectKfBtn.textContent = allKfSelected ? 'Bỏ chọn Keyframes' : 'Chọn Keyframes';
        selectKfBtn.style.background = allKfSelected ? '#177ddc' : '';
        selectKfBtn.style.color = allKfSelected ? '#fff' : '';
        selectKfBtn.style.borderColor = allKfSelected ? '#177ddc' : '';
      }
      updateBatchBar();
    }

    function afterEdit(sync = true) {
      for (const r of rows.values()) r.refresh(false);
      updateSelectionUI();
      renderAll();
      app.changed();
      if (sync && store && store.syncTrackToCvat) {
        store.syncTrackToCvat(track);
      }
    }

    // ---------- 4. TẢI ẢNH CAMERA & PHÓNG TO VIEW ----------
    const imgObserver = new IntersectionObserver((entries) => {
      for (const ent of entries) {
        if (!ent.isIntersecting) continue;
        const f = Number(ent.target.dataset.frame);
        const r = rows.get(f);
        if (r && !r.imgLoaded) {
          r.imgLoaded = true;
          loadImage(f, r.imgBox);
        }
      }
    }, { root: scroller, rootMargin: '250px' });

    let camNamesKnown = false;
    async function loadImage(frame, box) {
      if (!S.showImage) { box.textContent = ''; return; }
      try {
        const imgs = await frameData.contextImages(frame);
        if (!imgs || !imgs.length) { box.textContent = 'Không có ảnh'; return; }
        if (!camNamesKnown) {
          camNamesKnown = true;
          camSel.replaceChildren(...imgs.map((im, i) =>
            h('option', { value: i, selected: i === S.camIdx }, `Cam #${i}: ${im.name.slice(0, 18)}`)));
        }
        const im = imgs[Math.min(S.camIdx || 0, imgs.length - 1)];
        const img = h('img', { src: im.url, alt: im.name });
        box.replaceChildren(img);
        box.onclick = (e) => {
          e.stopPropagation();
          showAllImages(frame);
        };
      } catch {
        box.textContent = 'Không có ảnh';
      }
    }

    function reloadVisibleImages() {
      for (const [f, r] of rows.entries()) {
        if (r.imgLoaded) loadImage(f, r.imgBox);
      }
    }

    async function showAllImages(frame) {
      const imgs = await frameData.contextImages(frame);
      if (!imgs || !imgs.length) return;
      if (!app.openModal) return;
      app.openModal((card) => {
        const gridEl = h('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(3, imgs.length)}, 1fr)`,
            gap: '8px',
            padding: '10px',
            overflow: 'auto',
          }
        });
        for (let i = 0; i < imgs.length; i++) {
          const im = imgs[i];
          gridEl.append(h('div', {
            class: 'imgbox',
            style: { flexDirection: 'column', padding: '6px', cursor: 'zoom-in', background: '#141414', border: '1px solid #303030', borderRadius: '3px' },
            onclick: () => app.openImageViewer?.(im.url, `#${i} ${im.name} (f${frame})`),
            title: 'Bấm để phóng to ảnh (lăn chuột để zoom, kéo để di chuyển)',
          },
            h('div', { style: { fontSize: '11px', color: '#8c8c8c', marginBottom: '4px' } }, `#${i} ${im.name} · Bấm để zoom`),
            h('img', { src: im.url, style: { maxHeight: '36vh', maxWidth: '28vw', objectFit: 'contain' } })
          ));
        }
        card.append(
          h('div', { class: 'bar' },
            h('strong', { style: { color: '#fff' } }, `Tất cả ảnh Camera · Frame ${frame}`),
            h('span', { style: { color: '#8c8c8c' } }, 'Bấm vào ảnh bất kỳ để mở trình phóng to'),
            h('span', { style: { flex: 1 } }),
            h('button', { onclick: () => card.parentElement.remove() }, '✕ Đóng (Esc)')
          ),
          gridEl
        );
      });
    }

    function attachViewTools(viewEl, cell) {
      const bar = h('div', { class: 'vtools' },
        h('button', { title: 'Phóng to (+)', onclick: (e) => { e.stopPropagation(); grid.zoomCell(cell, 1.3); } }, '+'),
        h('button', { title: 'Thu nhỏ (−)', onclick: (e) => { e.stopPropagation(); grid.zoomCell(cell, 1 / 1.3); } }, '−'),
        h('button', { title: 'Về 1:1 (Double-click vùng trống)', onclick: (e) => { e.stopPropagation(); grid.resetCell(cell); } }, '1:1'),
        h('button', { title: 'Mở cửa sổ chỉnh sửa lớn', onclick: (e) => { e.stopPropagation(); openBigView(cell.frame, cell.view); } }, '⛶')
      );
      bar.addEventListener('pointerdown', (e) => e.stopPropagation());
      viewEl.append(bar);
    }

    function openBigView(frame, initialView) {
      if (!app.openModal) return;
      let curView = initialView;
      app.openModal((card, close) => {
        Object.assign(card.style, { width: '82vw', height: '80vh' });
        const bWrap = h('div', { style: { position: 'relative', flex: 1, minHeight: 0 } });
        const bScroller = h('div', { style: { position: 'absolute', inset: 0, display: 'flex' } });
        const bCellEl = h('div', { class: 'c2-view', style: { flex: 1, margin: '8px' } });
        bScroller.append(bCellEl);
        bWrap.append(bScroller);

        const viewBtns = ['top', 'side', 'front'].map((v) =>
          h('button', {
            class: v === curView ? 'primary' : '',
            onclick: () => {
              curView = v;
              bCell.view = v;
              viewBtns.forEach((b, i) => b.classList.toggle('primary', ['top', 'side', 'front'][i] === v));
              bGrid.requestRender();
            }
          }, v.toUpperCase())
        );

        const zoomLbl = h('span', { style: { color: '#8c8c8c', minWidth: '55px', fontVariantNumeric: 'tabular-nums' } }, '100%');
        card.append(
          h('div', { class: 'bar' },
            h('strong', { style: { color: '#fff' } }, `Track #${track.uiId} · Frame ${frame}`),
            h('span', { class: 'divider' }),
            ...viewBtns,
            h('span', { class: 'divider' }),
            h('button', { onclick: () => bGrid.zoomCell(bCell, 1.3) }, '＋ Zoom'),
            h('button', { onclick: () => bGrid.zoomCell(bCell, 1 / 1.3) }, '－ Zoom'),
            h('button', { onclick: () => bGrid.resetCell(bCell) }, '1:1 Reset'),
            zoomLbl,
            h('span', { style: { color: '#8c8c8c', fontSize: '11px' } }, 'Lăn chuột: Zoom · Kéo nền: Pan · Kéo cạnh/góc: Sửa Box'),
            h('span', { style: { flex: 1 } }),
            h('button', { onclick: () => { bGrid.destroy(); close(); } }, '✕ Đóng (Esc)')
          ),
          bWrap
        );

        const bGrid = new SP.GridView({
          wrap: bWrap,
          scroller: bScroller,
          settings: { ...settings, zoom: { top: 1, side: 1, front: 1 } },
          getCloud,
          getBox: (f) => track.at(f),
          onEditStart: () => {
            if (app.snapshot) app.snapshot([track.id]);
            else track.snapshot();
          },
          onEdit: (f, box) => {
            track.setBox(f, box);
            rows.get(f)?.refresh(true);
            renderAll();
          },
          onEditEnd: () => afterEdit(),
          onEditCancel: () => app.dropLastSnapshot?.(),
          onZoom: (c) => { zoomLbl.textContent = `${Math.round(c.zoom * 100)}%`; },
        });
        const bCell = bGrid.addCell(bCellEl, frame, curView);
        requestAnimationFrame(() => bGrid.resize());
      });
    }

    // ---------- 5. DỰNG TỪNG DÒNG FRAME (Tối ưu cập nhật DOM tại chỗ) ----------
    function buildRow(frame) {
      const el = h('div', { class: 'c2-row', 'data-frame': frame });
      const info = h('div', { class: 'c2-info' });
      const imgBox = h('div', { class: 'c2-img' }, 'Đang tải ảnh…');
      const vTop = h('div', { class: 'c2-view' });
      const vSide = h('div', { class: 'c2-view' });
      const vFront = h('div', { class: 'c2-view' });

      el.append(info, imgBox, vTop, vSide, vFront);
      el.addEventListener('click', (e) => handleRowClick(frame, e));

      const chk = h('input', {
        type: 'checkbox',
        class: 'c2-frame-check',
        style: { cursor: 'pointer', margin: '0 4px 0 0', accentColor: '#177ddc', verticalAlign: 'middle' },
        checked: selectedFrames.has(frame),
        title: `Chọn frame ${frame}`,
        onclick: (e) => {
          e.stopPropagation();
          if (e.target.checked) selectedFrames.add(frame);
          else selectedFrames.delete(frame);
          lastSelectedFrame = frame;
          updateSelectionUI();
        }
      });

      const kfBadge = h('span', { class: 'kf' }, 'Keyframe');
      const profSlot = h('span', { style: { display: 'inline-flex' } });
      const overlapSlot = h('span', { style: { display: 'inline-flex' } });

      const valX = h('span', { style: { color: '#fff' } }, '0.000');
      const valY = h('span', { style: { color: '#fff' } }, '0.000');
      const valZ = h('span', { style: { color: '#fff' } }, '0.000');
      const valL = h('span', { style: { color: '#fff' } }, '0.000');
      const valW = h('span', { style: { color: '#fff' } }, '0.000');
      const valH = h('span', { style: { color: '#fff' } }, '0.000');

      const flipBtn = h('button', {
        title: 'Đảo ngược đầu xe 180° tức thì (Phím F)',
        onclick: (e) => {
          e.stopPropagation();
          const pos = track.at(frame);
          if (!pos) return;
          if (app.snapshot) app.snapshot([track.id]);
          else track.snapshot();
          const b = G.cloneBox(pos.box);
          b.r = G.quickFlipHeading(b.r);
          track.setBox(frame, b);
          afterEdit();
        }
      }, '180°');

      const snapBtn = h('button', {
        title: 'Hút đáy box chạm đất (Phím G)',
        onclick: async (e) => {
          e.stopPropagation();
          const pos = track.at(frame);
          if (!pos) return;
          const cloud = await frameData.cloud(frame);
          const res = G.snapToGround(cloud.xyz, pos.box);
          if (res) {
            if (app.snapshot) app.snapshot([track.id]);
            else track.snapshot();
            track.setBox(frame, res.box);
            afterEdit();
            app.setStatus(`f${frame}: Đã hút đáy box chạm mặt đất`, 'ok');
          } else {
            app.setStatus(`f${frame}: Không đủ điểm mặt đất`, 'err');
          }
        }
      }, 'Hút đất');

      const profBtn = h('button', {
        style: { padding: '1px 5px', fontSize: '11px' },
        title: 'Đổi hoặc gán cấu hình kích thước cho frame này',
        onclick: (e) => {
          e.stopPropagation();
          showProfilePicker(e.currentTarget, frame, () => refresh(false));
        }
      }, 'Profile');

      info.append(
        h('div', { class: 'head' },
          h('span', { style: { display: 'inline-flex', alignItems: 'center' } }, chk, h('b', { style: { color: '#fff' } }, `f${frame}`)),
          kfBadge,
          profSlot,
          overlapSlot
        ),
        h('div', { class: 'grid' },
          h('span', { style: { color: '#8c8c8c' } }, 'X:'), valX,
          h('span', { style: { color: '#8c8c8c' } }, 'L:'), valL,
          h('span', { style: { color: '#8c8c8c' } }, 'Y:'), valY,
          h('span', { style: { color: '#8c8c8c' } }, 'W:'), valW,
          h('span', { style: { color: '#8c8c8c' } }, 'Z:'), valZ,
          h('span', { style: { color: '#8c8c8c' } }, 'H:'), valH
        ),
        h('div', { class: 'btns' }, flipBtn, snapBtn, profBtn)
      );

      function refresh(fast = false) {
        const pos = track.at(frame);
        if (!pos) return;

        chk.checked = selectedFrames.has(frame);
        kfBadge.className = `kf ${pos.keyframe ? '' : 'interp'}`;
        kfBadge.textContent = pos.keyframe ? 'Keyframe' : 'Nội suy';

        valX.textContent = fmt(pos.box.c[0]);
        valY.textContent = fmt(pos.box.c[1]);
        valZ.textContent = fmt(pos.box.c[2]);
        valL.textContent = fmt(pos.box.s[0]);
        valW.textContent = fmt(pos.box.s[1]);
        valH.textContent = fmt(pos.box.s[2]);

        if (fast) return;

        // Cập nhật nhãn Profile
        profSlot.replaceChildren();
        const pm = store.profileManager;
        const prof = pm?.getFrameProfile(track.id, frame);
        if (prof) {
          profSlot.append(h('span', {
            class: 'prof-pill',
            style: { color: prof.color, background: `${prof.color}18`, borderColor: `${prof.color}55` },
            title: `Cấu hình: ${prof.name} (${prof.size.map(v => v.toFixed(2)).join('×')}m). Bấm để đổi cấu hình`,
            onclick: (e) => {
              e.stopPropagation();
              showProfilePicker(e.currentTarget, frame, () => refresh(false));
            }
          },
            h('span', { style: { width: '6px', height: '6px', borderRadius: '50%', background: prof.color, display: 'inline-block' } }),
            prof.name
          ));
        } else {
          profSlot.append(h('span', {
            class: 'prof-pill empty',
            title: 'Chưa gán cấu hình kích thước riêng. Bấm để gán hoặc tạo mới',
            onclick: (e) => {
              e.stopPropagation();
              showProfilePicker(e.currentTarget, frame, () => refresh(false));
            }
          }, '+ Profile'));
        }

        // Cập nhật nhãn cảnh báo trùng lặp bằng hàm O(N) nhanh
        overlapSlot.replaceChildren();
        if (SP.iou3d?.findTrackOverlapsAtFrame) {
          const ovs = SP.iou3d.findTrackOverlapsAtFrame(store, track.id, frame, 0.25);
          if (ovs.length) {
            const other = ovs[0].trackB;
            const pct = Math.round(ovs[0].maxOverlapRatio * 100);
            overlapSlot.append(h('span', {
              style: { background: 'rgba(218, 54, 51, 0.2)', border: '1px solid #da3633', color: '#ff7875', fontSize: '10px', fontWeight: 600, padding: '1px 5px', borderRadius: '2px', cursor: 'pointer' },
              title: `Trùng ${pct}% với Track #${other.uiId}! Bấm để mở tab Kiểm tra Trùng lặp`,
              onclick: (e) => { e.stopPropagation(); app.switchTab('case3'); }
            }, `Đè #${other.uiId} (${pct}%)`));
          }
        }
      }

      refresh(false);
      return { el, chk, imgBox, imgLoaded: false, views: [vTop, vSide, vFront], refresh };
    }

    function buildRows() {
      const from = Number(fromIn.value) || store.frames[0];
      const to = Number(toIn.value) || store.frames[store.frames.length - 1];
      grid?.clearCells();
      imgObserver.disconnect();
      rows = new Map();
      selectedFrames.clear();
      lastSelectedFrame = null;
      updateBatchBar();
      scroller.replaceChildren();

      const list = store.frames.filter((f) => f >= from && f <= to);
      for (const frame of list) {
        const r = buildRow(frame);
        rows.set(frame, r);
        scroller.append(r.el);
        imgObserver.observe(r.el);
        ['top', 'side', 'front'].forEach((v, i) => {
          const cell = grid.addCell(r.views[i], frame, v);
          attachViewTools(r.views[i], cell);
        });
      }
      renderAll();

      pbar.hidden = false;
      frameData.preload(list, (p) => {
        pfill.style.width = `${Math.round(p.fraction * 100)}%`;
        ptext.textContent = `Tải point cloud ${Math.round(p.fraction * 100)}%…`;
        if (p.done >= p.total) {
          setTimeout(() => { pbar.hidden = true; }, 500);
          frameData.startBackgroundPrefetch();
        }
        renderAll();
      }, 6);
    }

    function openTrack(t) {
      track = t;
      trackSel.value = String(t.id);
      settings.refSize = refSizeOf(t);
      settings.color = store.labelColor(t.labelId);
      fromIn.value = Math.max(t.firstFrame, store.frames[0]);
      toIn.value = store.frames[store.frames.length - 1];

      grid?.destroy();
      grid = new SP.GridView({
        wrap,
        scroller,
        settings,
        getCloud,
        getBox: (frame) => track.at(frame),
        onEditStart: (frame) => {
          if (app.snapshot) app.snapshot([track.id]);
          else track.snapshot();
          startDragBoxes = new Map();
          if (selectedFrames.has(frame) && selectedFrames.size > 1) {
            for (const f of selectedFrames) {
              const p = track.at(f);
              if (p) startDragBoxes.set(f, G.cloneBox(p.box));
            }
          }
        },
        onEdit: (frame, box) => {
          if (selectedFrames.has(frame) && selectedFrames.size > 1 && startDragBoxes.has(frame)) {
            const originBox = startDragBoxes.get(frame);
            const dx = box.c[0] - originBox.c[0];
            const dy = box.c[1] - originBox.c[1];
            const dz = box.c[2] - originBox.c[2];

            let dYaw = box.r[2] - originBox.r[2];
            while (dYaw > Math.PI) dYaw -= 2 * Math.PI;
            while (dYaw < -Math.PI) dYaw += 2 * Math.PI;

            for (const f of selectedFrames) {
              const orig = startDragBoxes.get(f);
              if (!orig) continue;
              const b = G.cloneBox(orig);
              b.c[0] += dx;
              b.c[1] += dy;
              b.c[2] += dz;
              if (Math.abs(dYaw) > 1e-5) {
                b.r = G.rotateLocal(orig.r, 2, dYaw);
              }
              b.s = box.s.slice();
              track.setBox(f, b);
              rows.get(f)?.refresh(true);
            }
          } else {
            const pm = store.profileManager;
            const prof = pm?.getFrameProfile(track.id, frame);

            if (prof) {
              prof.size = [Number(box.s[0].toFixed(3)), Number(box.s[1].toFixed(3)), Number(box.s[2].toFixed(3))];
              pm.updateProfile(track.id, prof.id, { size: prof.size });

              const linked = pm.getFramesWithProfile(track.id, prof.id);
              for (const f of linked) {
                if (f === frame) {
                  track.setBox(frame, box);
                } else {
                  const p = track.at(f);
                  if (p) {
                    const b = G.cloneBox(p.box);
                    const oldH = b.s[2];
                    const newH = box.s[2];
                    b.c[2] += (newH - oldH) / 2;
                    b.s = box.s.slice();
                    track.setBox(f, b);
                    rows.get(f)?.refresh(true);
                  }
                }
              }
            } else {
              track.setBox(frame, box);
              if (S.syncSize) {
                for (const sh of track.shapes) {
                  const f = sh.frame;
                  if (f !== frame && !pm?.getFrameProfileId(track.id, f)) {
                    sh.points[6] = box.s[0];
                    sh.points[7] = box.s[1];
                    sh.points[8] = box.s[2];
                    rows.get(f)?.refresh(true);
                  }
                }
              }
            }
            rows.get(frame)?.refresh(true);
          }
          renderAll();
        },
        onEditEnd: () => {
          startDragBoxes.clear();
          afterEdit();
        },
        onEditCancel: () => {
          startDragBoxes.clear();
          app.dropLastSnapshot?.();
        },
      });
      buildRows();
    }

    openTrack(track);

    return {
      refresh() {
        for (const r of rows.values()) r.refresh(false);
        renderAll();
      },
      onKey(e) {
        const k = e.key.toLowerCase();
        if ((k === 'f' || k === 'r') && selectedFrames.size) {
          track.flipHeadingBatch([...selectedFrames]);
          afterEdit();
          app.setStatus(`Đã đảo chiều đầu xe 180° cho ${selectedFrames.size} frames (F)`, 'ok');
        } else if (k === 'g' && selectedFrames.size) {
          (async () => {
            let count = 0;
            for (const f of selectedFrames) {
              const cloud = await frameData.cloud(f);
              const pos = track.at(f);
              if (pos && cloud && cloud.xyz) {
                const res = G.snapToGround(cloud.xyz, pos.box);
                if (res) {
                  track.setBox(f, res.box);
                  count++;
                }
              }
            }
            afterEdit();
            app.setStatus(`Đã hút đáy chạm đất cho ${count}/${selectedFrames.size} frames (G)`, 'ok');
          })();
        }
      },
      unmount() {
        imgObserver.disconnect();
        grid?.destroy();
        grid = null;
      },
    };
  }

  (SP.pendingTabs ||= []).push(['case2', { title: 'Sửa chuỗi Frame', mount }]);
})();
