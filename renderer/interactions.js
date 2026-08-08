(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CalendarInteractions = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DRAG_THRESHOLD = 4;

  function tt(key, params) {
    return (typeof window !== 'undefined' && window.I18n && window.I18n.t) ? window.I18n.t(key, params) : '';
  }

  function init(opts) {
    const renderer = opts.renderer;
    const store = opts.store;
    const dialogs = opts.dialogs;
    const state = opts.state;
    const u = opts.utils;
    const onDataChanged = opts.onDataChanged || function () {};
    const onDraftsChange = opts.onDraftsChange || function () {};
    const onCommitDrafts = opts.onCommitDrafts || function () {};
    const onError = opts.onError || function (err) { console.error(err); };
    const onStampChange = opts.onStampChange || function () {};
    const scrollBody = renderer.scrollBody;

    let drag = null;
    let suppressClear = false;

    function updateBars() {
      renderer.renderBars();
    }

    function clearDrafts() {
      state.drafts = [];
      updateBars();
      onDraftsChange();
    }

    function startDraw(e, cell) {
      const dateISO = cell.dataset.date;
      if (!e.ctrlKey) state.drafts = [];
      state.drafts.push({ start: dateISO, end: dateISO });
      const draftIndex = state.drafts.length - 1;
      drag = {
        mode: 'draw',
        draftIndex,
        anchorISO: dateISO,
        lastValid: dateISO,
        started: false,
        startX: e.clientX,
        startY: e.clientY
      };
      updateBars();
      onDraftsChange();
    }

    function startMove(e, barEl) {
      const key = barEl.dataset.barKey;
      const bar = renderer.barData.get(key);
      if (!bar || !bar.item) return;
      const item = bar.item;
      const anchor = renderer.pointToCell(e.clientX, e.clientY);
      if (!anchor || !anchor.valid) return;
      drag = {
        mode: 'move',
        itemId: item.id,
        origStart: item.start,
        origEnd: item.end,
        anchorDate: anchor.dateISO,
        started: false,
        startX: e.clientX,
        startY: e.clientY,
        lastMoving: null
      };
    }

    // 批量选择模式：单击事项横条切换选中状态。
    function toggleSelect(barEl) {
      const bar = renderer.barData.get(barEl.dataset.barKey);
      if (!bar || !bar.item || bar.draft || bar.preview) return;
      const id = bar.item.id;
      if (state.batch.ids.has(id)) state.batch.ids.delete(id);
      else state.batch.ids.add(id);
      updateBars();
    }

    function matchesStampTemplate(item) {
      const tpl = state.stamp.template;
      if (!item || !tpl) return false;
      const days = u.diffDays(item.start, item.end) + 1;
      return item.name === tpl.name
        && (item.notes || '') === (tpl.notes || '')
        && item.color === tpl.color
        && days === tpl.days;
    }

    function stampAt(dateISO) {
      const tpl = state.stamp.template;
      if (!tpl) return;
      const item = {
        id: u.makeId(),
        name: tpl.name,
        notes: tpl.notes || '',
        color: tpl.color,
        start: dateISO,
        end: u.addDaysISO(dateISO, tpl.days - 1),
        seriesId: null,
        stamped: true
      };
      store.putItems([item]).then(onDataChanged).catch(onError);
    }

    function loadStampTemplate(item) {
      state.stamp.template = {
        name: item.name,
        notes: item.notes || '',
        color: item.color,
        days: u.diffDays(item.start, item.end) + 1
      };
      state.stamp.active = true;
      onStampChange();
      // 印台吞入模板：原事项条从日历中移除
      store.deleteItems([item.id]).then(onDataChanged).catch(onError);
    }

    function contrastColor(hex) {
      const m = /^#([0-9a-fA-F]{6})$/.exec(String(hex || ''));
      if (!m) return '#f9f2dd';
      const n = parseInt(m[1], 16);
      const r = (n >> 16) & 255;
      const g = (n >> 8) & 255;
      const b = n & 255;
      return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#000000' : '#f9f2dd';
    }

    function setPadOver(isOver) {
      const pad = document.getElementById('stamp-pad');
      if (!pad) return;
      pad.classList.toggle('over', isOver);
      const mini = pad.querySelector('.stamp-mini');
      if (!mini) return;
      if (isOver && drag && drag.mode === 'move') {
        const item = state.data.items.find((i) => i.id === drag.itemId);
        if (item) {
          mini.style.background = item.color;
          mini.style.color = contrastColor(item.color);
          mini.textContent = '…';
          mini.hidden = false;
        }
      } else {
        mini.hidden = true;
        mini.textContent = '';
      }
    }

    function onPointerMove(e) {
      if (!drag) return;
      if (drag.mode === 'draw') {
        const dx = Math.abs(e.clientX - drag.startX);
        const dy = Math.abs(e.clientY - drag.startY);
        if (!drag.started && Math.max(dx, dy) < DRAG_THRESHOLD) return;
        drag.started = true;
        const hit = renderer.pointToCell(e.clientX, e.clientY);
        const endISO = hit && hit.valid ? hit.dateISO : drag.lastValid;
        if (endISO !== drag.lastValid) drag.lastValid = endISO;
        const a = drag.anchorISO;
        const b = endISO;
        state.drafts[drag.draftIndex].start = a <= b ? a : b;
        state.drafts[drag.draftIndex].end = a <= b ? b : a;
        updateBars();
      } else if (drag.mode === 'move') {
        const padEl = document.getElementById('stamp-pad');
        const padRect = padEl ? padEl.getBoundingClientRect() : null;
        const overPad = padRect && e.clientX >= padRect.left && e.clientX <= padRect.right
          && e.clientY >= padRect.top && e.clientY <= padRect.bottom;
        setPadOver(overPad);
        if (overPad) {
          // 移入印台：日历内不显示悬浮虚影（原条在拖拽期间整体隐藏），预览仅由印台展示
          const mv = drag.lastMoving || { newStart: drag.origStart, newEnd: drag.origEnd };
          state.moving = { itemId: drag.itemId, newStart: mv.newStart, newEnd: mv.newEnd, hidden: true };
          updateBars();
          return;
        }
        const hit = renderer.pointToCell(e.clientX, e.clientY);
        if (!hit || !hit.valid) return;
        const delta = u.diffDays(drag.anchorDate, hit.dateISO);
        drag.lastMoving = { newStart: u.addDaysISO(drag.origStart, delta), newEnd: u.addDaysISO(drag.origEnd, delta) };
        state.moving = {
          itemId: drag.itemId,
          newStart: drag.lastMoving.newStart,
          newEnd: drag.lastMoving.newEnd,
          hidden: false
        };
        updateBars();
      }
    }

    function onPointerUp(e) {
      if (!drag) return;
      if (drag.mode === 'move') {
        const padEl = document.getElementById('stamp-pad');
        const padRect = padEl ? padEl.getBoundingClientRect() : null;
        const overPad = padRect && e.clientX >= padRect.left && e.clientX <= padRect.right
          && e.clientY >= padRect.top && e.clientY <= padRect.bottom;
        if (overPad) {
          const item = state.data.items.find((i) => i.id === drag.itemId);
          if (item) loadStampTemplate(item);
        } else if (state.moving) {
          const item = state.data.items.find((i) => i.id === drag.itemId);
          const changed = item && (state.moving.newStart !== item.start || state.moving.newEnd !== item.end);
          if (item && changed) {
            item.start = state.moving.newStart;
            item.end = state.moving.newEnd;
            store.putItems([item]).then(onDataChanged).catch(onError);
          }
        }
      }
      setPadOver(false);
      suppressClear = drag.started;
      drag = null;
      state.moving = null;
      updateBars();
      onDraftsChange();
      detachDragListeners();
    }

    function attachDragListeners() {
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }

    function detachDragListeners() {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    }

    scrollBody.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (state.stamp && state.stamp.active) return; // 盖章模式：禁用拖拽/绘制
      suppressClear = false;
      const barEl = e.target.closest('.bar');
      if (barEl) {
        if (!(state.batch && state.batch.active)) startMove(e, barEl);
        if (drag) attachDragListeners();
        return;
      }
      const cell = e.target.closest('.cell.valid');
      if (cell) {
        startDraw(e, cell);
        if (drag) attachDragListeners();
      }
    });

    scrollBody.addEventListener('click', (e) => {
      if (suppressClear) {
        suppressClear = false;
        return;
      }
      if (state.stamp && state.stamp.active) {
        const barEl = e.target.closest('.bar');
        if (barEl) {
          const bar = renderer.barData.get(barEl.dataset.barKey);
          if (bar && bar.item && matchesStampTemplate(bar.item)) {
            store.deleteItems([bar.item.id]).then(onDataChanged).catch(onError);
          }
          return;
        }
        const hit = renderer.pointToCell(e.clientX, e.clientY);
        if (hit && hit.valid) stampAt(hit.dateISO);
        return;
      }
      if (state.batch && state.batch.active) {
        const barEl = e.target.closest('.bar');
        if (barEl) {
          toggleSelect(barEl);
          return;
        }
      }
      // 草稿条可能恰好渲染在鼠标下方，导致 click 目标被解析为容器元素；
      // 这里用坐标判断是否落在有效日期格内，落在格内一律不清空草稿。
      const hit = renderer.pointToCell(e.clientX, e.clientY);
      if (hit && hit.valid) return;
      if (e.target.closest('.cell.valid') || e.target.closest('.bar')) return;
      clearDrafts();
    });

    scrollBody.addEventListener('dblclick', (e) => {
      if (state.stamp && state.stamp.active) return;
      if (state.batch && state.batch.active) return;
      const barEl = e.target.closest('.bar');
      if (!barEl) return;
      const bar = renderer.barData.get(barEl.dataset.barKey);
      if (!bar || bar.preview) return;
      if (bar.draft) {
        // 双击虚线草稿条 = 点击侧边【添加】按钮，直接弹出新建日程弹窗。
        onCommitDrafts();
        return;
      }
      openEditFlow(bar.item);
    });

    scrollBody.addEventListener('contextmenu', (e) => {
      if (state.stamp && state.stamp.active) return;
      if (state.batch && state.batch.active) return;
      const barEl = e.target.closest('.bar');
      if (!barEl) return;
      e.preventDefault();
      const bar = renderer.barData.get(barEl.dataset.barKey);
      if (!bar || bar.draft) return;
      openItemMenu(bar.item, e.clientX, e.clientY);
    });

    scrollBody.addEventListener('mouseover', (e) => {
      const barEl = e.target.closest('.bar');
      if (!barEl) return;
      const bar = renderer.barData.get(barEl.dataset.barKey);
      if (!bar || bar.draft || drag) return;
      dialogs.showTooltip(bar, e.clientX, e.clientY);
    });

    scrollBody.addEventListener('mousemove', (e) => {
      if (dialogs.isTooltipVisible()) dialogs.moveTooltip(e.clientX, e.clientY);
    });

    scrollBody.addEventListener('mouseout', (e) => {
      const t = e.target;
      if (t.closest && t.closest('.bar')) {
        const rel = e.relatedTarget;
        if (!(rel && rel.closest && rel.closest('.bar'))) dialogs.hideTooltip();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        state.drafts = [];
        state.moving = null;
        drag = null;
        detachDragListeners();
        dialogs.closeAll();
        updateBars();
        onDraftsChange();
      }
    });

    async function openEditFlow(item) {
      const isSeries = !!item.seriesId;
      const result = await dialogs.openEditDialog(item, isSeries);
      if (!result) return;
      try {
        if (isSeries && result.scope === 'series') {
          await store.updateSeries(item.seriesId, { name: result.name, notes: result.notes, color: result.color });
        } else {
          item.name = result.name;
          item.notes = result.notes;
          item.color = result.color;
          if (result.days) {
            item.end = u.addDaysISO(item.start, result.days - 1);
          }
          await store.putItems([item]);
        }
        const nextRecent = dialogs.recordRecentColor(result.color);
        if (nextRecent) store.setRecentColors(nextRecent).catch(onError);
        await onDataChanged();
      } catch (err) {
        onError(err);
      }
    }

    async function deleteFlow(item, scope) {
      try {
        if (scope === 'series') {
          const ok = await dialogs.confirmDialog(tt('deleteSeriesConfirm'));
          if (!ok) return;
          await store.deleteSeriesAndMembers(item.seriesId);
        } else {
          await store.deleteItems([item.id]);
        }
        await onDataChanged();
      } catch (err) {
        onError(err);
      }
    }

    function openItemMenu(item, x, y) {
      const actions = [{ label: tt('ctxEdit'), onClick: () => openEditFlow(item) }];
      if (item.seriesId) {
        actions.push({ label: tt('ctxDeleteThis'), danger: true, onClick: () => deleteFlow(item, 'single') });
        actions.push({ label: tt('ctxDeleteSeries'), danger: true, onClick: () => deleteFlow(item, 'series') });
      } else {
        actions.push({
          label: item.start === item.end ? tt('ctxDelete') : tt('ctxDeleteItem'),
          danger: true,
          onClick: () => deleteFlow(item, 'single')
        });
      }
      dialogs.showContextMenu(x, y, actions);
    }
  }

  return { init };
});
