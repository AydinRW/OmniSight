(function () {
  'use strict';

  window.addEventListener('error', (e) => {
    console.error('GLOBAL_ERROR', e.error && e.error.stack ? e.error.stack : e.message);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    console.error('UNHANDLED_REJECTION', r && r.stack ? r.stack : String(r));
  });

  function debounce(fn, ms) {
    let t = null;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    const u = window.DateUtils;
    const store = window.CalendarStore;
    const dialogs = window.CalendarDialogs;
    const CalendarRenderer = window.CalendarRenderer;

    const state = {
      year: new Date().getFullYear(),
      data: { items: [], series: [] },
      drafts: [],
      moving: null
    };

    const scrollBody = document.getElementById('scroll-body');
    const renderer = new CalendarRenderer(scrollBody, { utils: u, state });

    const yearLabel = document.getElementById('year-label');
    const prevBtn = document.getElementById('prev-year');
    const nextBtn = document.getElementById('next-year');
    const addBtn = document.getElementById('add-btn');
    const newBtn = document.getElementById('new-item-btn');
    const dataDirEl = document.getElementById('data-dir');

    function updateAddBtn() {
      addBtn.disabled = state.drafts.length === 0;
    }

    function notifyError(err) {
      try {
        window.alert('操作失败：' + (err && err.message ? err.message : String(err)));
      } catch (_) { /* ignore */ }
    }

    async function loadYear() {
      state.data = await store.loadYear(state.year);
      state.drafts = [];
      state.moving = null;
      renderer.render(state.year);
      yearLabel.textContent = String(state.year);
      scrollBody.scrollTop = 0;
      scrollBody.scrollLeft = 0;
      updateAddBtn();
    }

    async function onDataChanged() {
      await loadYear();
    }

    prevBtn.addEventListener('click', () => {
      state.year -= 1;
      loadYear();
    });
    nextBtn.addEventListener('click', () => {
      state.year += 1;
      loadYear();
    });

    addBtn.addEventListener('click', async () => {
      if (!state.drafts.length) return;
      const res = await dialogs.openAddDialog(state.drafts.length);
      if (!res) return;
      const items = state.drafts.map((d) => ({
        id: u.makeId(),
        name: res.name,
        notes: res.notes || '',
        color: res.color,
        start: d.start,
        end: d.end,
        seriesId: null
      }));
      try {
        await store.putItems(items);
        state.drafts = [];
        await onDataChanged();
      } catch (err) {
        notifyError(err);
      }
    });

    newBtn.addEventListener('click', async () => {
      const today = u.todayISO();
      const res = await dialogs.openNewItemDialog({
        start: today,
        end: u.addDaysISO(today, 30),
        interval: 1
      });
      if (!res) return;
      const dates = u.recurringDates(res.start, res.end, Number(res.interval));
      const seriesId = u.makeId();
      const series = {
        id: seriesId,
        name: res.name,
        notes: '',
        color: dialogs.DEFAULT_COLOR,
        start: res.start,
        end: res.end,
        intervalDays: Number(res.interval)
      };
      const items = dates.map((d) => ({
        id: u.makeId(),
        name: res.name,
        notes: '',
        color: dialogs.DEFAULT_COLOR,
        start: d,
        end: d,
        seriesId
      }));
      try {
        await store.putSeries([series]);
        await store.putItems(items);
        await onDataChanged();
      } catch (err) {
        notifyError(err);
      }
    });

    try {
      const dir = await store.getDataDir();
      dataDirEl.textContent = '数据目录：\n' + dir;
    } catch (_) { /* ignore */ }

    window.CalendarInteractions.init({
      renderer,
      store,
      dialogs,
      state,
      utils: u,
      onDataChanged,
      onDraftsChange: updateAddBtn,
      onError: notifyError
    });

    window.addEventListener('resize', debounce(() => renderer.refresh(), 120));

    if (window.location.hash === '#smoke') {
      try {
        await store.putItems([{
          id: 'smoke-fixture',
          name: '单日测试',
          notes: '',
          color: '#3b82f6',
          start: '2026-02-01',
          end: '2026-02-01',
          seriesId: null
        }]);
      } catch (err) {
        console.error('SMOKE_FIXTURE_ERROR ' + (err && err.message ? err.message : String(err)));
      }
    }

    await loadYear();
    console.log('APP_READY year=' + state.year + ' items=' + state.data.items.length);

    if (window.location.hash === '#smoke') {
      runStorageSmoke();
      runInteractionSmoke();
    }
  }

  async function runStorageSmoke() {
    const store = window.CalendarStore;
    try {
      const testItem = {
        id: 'smoke-test-item',
        name: '冒烟事项',
        notes: 'note',
        color: '#3b82f6',
        start: '2026-01-01',
        end: '2026-01-03',
        seriesId: null
      };
      await store.putItems([testItem]);
      const data = await store.loadYear(2026);
      const found = data.items.find((i) => i.id === 'smoke-test-item');
      console.log('SMOKE_PUT_GET ' + (found && found.name === '冒烟事项' && found.start === '2026-01-01' ? 'ok' : 'FAIL'));
      await store.deleteItems(['smoke-test-item']);
      const after = await store.loadYear(2026);
      console.log('SMOKE_DELETE ' + (after.items.some((i) => i.id === 'smoke-test-item') ? 'FAIL' : 'ok'));
      console.log('SMOKE_STORAGE_DONE');
    } catch (err) {
      console.error('SMOKE_STORAGE_ERROR ' + (err && err.message ? err.message : String(err)));
    }
  }

  function runInteractionSmoke() {
    try {
      const headerCells = document.querySelectorAll('.header-cell').length;
      const rowCells = document.querySelectorAll('.month-row .row-grid')[0].querySelectorAll('.cell').length;
      const sb = document.getElementById('scroll-body');
      console.log('SMOKE_LAYOUT header=' + headerCells + ' rowCells=' + rowCells
        + ' scrollW=' + sb.scrollWidth + ' clientW=' + sb.clientWidth
        + ' hasHScroll=' + (sb.scrollWidth > sb.clientWidth));

      const singleBar = Array.from(document.querySelectorAll('.bar')).find((b) => b.dataset.barKey && b.dataset.barKey.indexOf('smoke-fixture') === 0);
      const barText = singleBar ? singleBar.querySelector('.bar-text') : null;
      console.log('SMOKE_SINGLE_BAR_TEXT ' + (barText && barText.textContent === '单日测试' ? 'ok' : 'FAIL(text=' + (barText ? barText.textContent : 'none') + ')'));

      const cell = document.querySelector('.cell.valid[data-date="2026-01-01"]');
      if (!cell) {
        console.error('SMOKE_NO_CELL');
        return;
      }
      const clickAt = (el, opts) => {
        const r = el.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const o = Object.assign({ bubbles: true, button: 0, clientX: x, clientY: y }, opts || {});
        el.dispatchEvent(new PointerEvent('pointerdown', o));
        el.dispatchEvent(new PointerEvent('pointerup', o));
        el.dispatchEvent(new MouseEvent('click', o));
      };

      clickAt(cell, { pointerId: 1 });
      let bars = document.querySelectorAll('.bar.draft');
      console.log('SMOKE_CLICK_DRAFT ' + (bars.length === 1 ? 'ok' : 'FAIL(' + bars.length + ')' + (bars[0] ? ' class=' + bars[0].className : '')));

      const clickXY = (el, x, y, opts) => {
        const o = Object.assign({ bubbles: true, button: 0, clientX: x, clientY: y }, opts || {});
        el.dispatchEvent(new PointerEvent('pointerdown', o));
        el.dispatchEvent(new PointerEvent('pointerup', o));
        el.dispatchEvent(new MouseEvent('click', o));
      };

      // 先清空草稿：点击一个灰色无效格
      const invalidCell = document.querySelector('.cell.invalid');
      const iv = invalidCell.getBoundingClientRect();
      invalidCell.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: iv.left + 4, clientY: iv.top + 4 }));
      bars = document.querySelectorAll('.bar.draft');
      console.log('SMOKE_CLEAR_BY_INVALID ' + (bars.length === 0 ? 'ok' : 'FAIL(' + bars.length + ')'));

      // 复现修复的 bug：点击无草稿的新格子上方（草稿条渲染位置），草稿必须保留。
      const freshCell = document.querySelector('.cell.valid[data-date="2026-01-02"]');
      const freshRect = freshCell.getBoundingClientRect();
      const upperX = freshRect.left + freshRect.width / 2;
      clickXY(freshCell, upperX, freshRect.top + 25, { pointerId: 3 });
      bars = document.querySelectorAll('.bar.draft');
      console.log('SMOKE_UPPER_CLICK_KEEP ' + (bars.length === 1 ? 'ok' : 'FAIL(' + bars.length + ')'));

      clickXY(freshCell, upperX, freshRect.top + 55, { pointerId: 4 });
      bars = document.querySelectorAll('.bar.draft');
      console.log('SMOKE_LOWER_CLICK_KEEP ' + (bars.length === 1 ? 'ok' : 'FAIL(' + bars.length + ')'));

      const cell2 = document.querySelector('.cell.valid[data-date="2026-01-03"]');
      clickAt(cell2, { pointerId: 2, ctrlKey: true });
      bars = document.querySelectorAll('.bar.draft');
      console.log('SMOKE_CTRL_MULTI ' + (bars.length === 2 ? 'ok' : 'FAIL(' + bars.length + ')'));

      const header = document.querySelector('.grid-header .header-cell');
      const hr = header.getBoundingClientRect();
      header.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: hr.left + 4, clientY: hr.top + 4 }));
      bars = document.querySelectorAll('.bar.draft');
      console.log('SMOKE_CLICK_CLEAR ' + (bars.length === 0 ? 'ok' : 'FAIL(' + bars.length + ')'));
      console.log('SMOKE_INTERACTION_DONE');
    } catch (err) {
      console.error('SMOKE_INTERACTION_ERROR ' + (err && err.message ? err.message : String(err)));
    }
  }
})();
