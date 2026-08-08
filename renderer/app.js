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
      moving: null,
      batch: { active: false, ids: new Set() }
    };

    const scrollBody = document.getElementById('scroll-body');
    const renderer = new CalendarRenderer(scrollBody, { utils: u, state });

    const yearLabel = document.getElementById('year-label');
    const prevBtn = document.getElementById('prev-year');
    const nextBtn = document.getElementById('next-year');
    const addBtn = document.getElementById('add-btn');
    const newBtn = document.getElementById('new-item-btn');
    const batchDeleteBtn = document.getElementById('batch-delete-btn');
    const batchActions = document.getElementById('batch-actions');
    const batchDoneBtn = document.getElementById('batch-done-btn');
    const batchCancelBtn = document.getElementById('batch-cancel-btn');
    const dataDirEl = document.getElementById('data-dir');
    const appTitleEl = document.getElementById('app-title');
    const statusbarHintEl = document.getElementById('statusbar-hint');
    const menuBar = document.getElementById('menubar');
    const menuDropdown = document.getElementById('menu-dropdown');
    let dataDirPath = '';

    function updateAddBtn() {
      addBtn.disabled = state.drafts.length === 0;
    }

    function notifyError(err) {
      try {
        window.alert(window.I18n.t('opFail') + (err && err.message ? err.message : String(err)));
      } catch (_) { /* ignore */ }
    }

    function applyLanguage() {
      const L = window.I18n;
      addBtn.textContent = L.t('add');
      newBtn.textContent = L.t('newItem');
      batchDeleteBtn.textContent = L.t('batchDelete');
      batchDoneBtn.textContent = L.t('done');
      batchCancelBtn.textContent = L.t('cancel');
      appTitleEl.textContent = L.t('appTitle');
      statusbarHintEl.textContent = L.t('hint');
      if (dataDirPath) dataDirEl.textContent = L.t('dataDirPrefix') + dataDirPath;
      menuBar.querySelector('[data-menu="options"]').textContent = L.t('menuOptions');
      menuBar.querySelector('[data-menu="settings"]').textContent = L.t('menuSettings');
      menuBar.querySelector('[data-menu="help"]').textContent = L.t('menuHelp');
      if (!menuDropdown.hidden) openMenu(menuDropdown.dataset.menu);
    }

    async function loadYear() {
      state.data = await store.loadYear(state.year);
      state.drafts = [];
      state.moving = null;
      state.batch.active = false;
      state.batch.ids.clear();
      batchDeleteBtn.hidden = false;
      batchActions.hidden = true;
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

    async function commitDrafts() {
      if (!state.drafts.length) return;
      const res = await dialogs.openAddDialog(state.drafts.length);
      if (!res) return;
      const nextRecent = dialogs.recordRecentColor(res.color);
      if (nextRecent) store.setRecentColors(nextRecent).catch((err) => console.error(err));
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
    }

    addBtn.addEventListener('click', commitDrafts);

    function setBatchMode(active) {
      state.batch.active = active;
      if (!active) state.batch.ids.clear();
      batchDeleteBtn.hidden = active;
      batchActions.hidden = !active;
      renderer.renderBars();
    }

    batchDeleteBtn.addEventListener('click', () => setBatchMode(true));

    batchCancelBtn.addEventListener('click', () => setBatchMode(false));

    batchDoneBtn.addEventListener('click', async () => {
      const ids = Array.from(state.batch.ids);
      setBatchMode(false);
      if (!ids.length) return;
      try {
        await store.deleteItems(ids);
        await onDataChanged();
      } catch (err) {
        notifyError(err);
      }
    });

    function closeMenu() {
      menuDropdown.hidden = true;
    }

    function switchLang(lang) {
      window.I18n.setLang(lang);
      store.setSettings({ lang }).catch((err) => console.error(err));
      applyLanguage();
      renderer.render(state.year);
    }

    function openMenu(key) {
      const item = menuBar.querySelector('[data-menu="' + key + '"]');
      const rect = item.getBoundingClientRect();
      menuDropdown.innerHTML = '';
      const L = window.I18n;
      let items = [];
      if (key === 'settings') {
        items = [
          { type: 'lang', lang: 'zh', label: L.t('langZh') },
          { type: 'lang', lang: 'en', label: L.t('langEn') }
        ];
      } else if (key === 'options') {
        items = [{ type: 'disabled', label: L.t('menuComingSoon') }];
      } else if (key === 'help') {
        items = [{ type: 'action', action: 'about', label: L.t('menuAbout') }];
      }
      for (const it of items) {
        const el = document.createElement('div');
        el.className = 'menu-drop-item' + (it.type === 'disabled' ? ' disabled' : '');
        if (it.type === 'lang') {
          el.classList.add('lang-item');
          el.dataset.lang = it.lang;
          if (window.I18n.getLang() === it.lang) el.classList.add('checked');
        }
        el.textContent = it.label;
        el.addEventListener('click', () => {
          if (it.type === 'disabled') return;
          closeMenu();
          if (it.type === 'lang') switchLang(it.lang);
          else if (it.action === 'about') dialogs.infoDialog(L.t('menuAbout'), L.t('aboutText'));
        });
        menuDropdown.appendChild(el);
      }
      menuDropdown.dataset.menu = key;
      menuDropdown.style.left = rect.left + 'px';
      menuDropdown.style.top = (rect.bottom + 2) + 'px';
      menuDropdown.hidden = false;
    }

    menuBar.addEventListener('click', (e) => {
      const item = e.target.closest('.menu-item');
      if (!item) return;
      const key = item.dataset.menu;
      const isOpen = !menuDropdown.hidden && menuDropdown.dataset.menu === key;
      closeMenu();
      if (!isOpen) openMenu(key);
    });

    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest || (!e.target.closest('#menubar') && !e.target.closest('#menu-dropdown'))) {
        closeMenu();
      }
    }, true);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });

    newBtn.addEventListener('click', async () => {
      const today = u.todayISO();
      const res = await dialogs.openNewItemDialog({
        start: today,
        end: u.addDaysISO(today, 30),
        interval: 1
      });
      if (!res) return;
      const nextRecent = dialogs.recordRecentColor(res.color);
      if (nextRecent) store.setRecentColors(nextRecent).catch((err) => console.error(err));
      const dates = u.recurringDates(res.start, res.end, Number(res.interval));
      const seriesId = u.makeId();
      const series = {
        id: seriesId,
        name: res.name,
        notes: res.notes || '',
        color: res.color,
        start: res.start,
        end: res.end,
        intervalDays: Number(res.interval)
      };
      const items = dates.map((d) => ({
        id: u.makeId(),
        name: res.name,
        notes: res.notes || '',
        color: res.color,
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
      dataDirPath = dir;
      dataDirEl.textContent = window.I18n.t('dataDirPrefix') + dir;
    } catch (_) { /* ignore */ }

    window.CalendarInteractions.init({
      renderer,
      store,
      dialogs,
      state,
      utils: u,
      onDataChanged,
      onDraftsChange: updateAddBtn,
      onCommitDrafts: commitDrafts,
      onError: notifyError
    });

    window.addEventListener('resize', debounce(() => renderer.refresh(), 120));

    try {
      const settings = await store.getSettings();
      window.I18n.setLang(settings.lang);
    } catch (_) { /* ignore */ }

    if (window.location.hash === '#smoke') {
      try {
        await store.setSettings({ lang: 'zh' });
        window.I18n.setLang('zh');
      } catch (_) { /* ignore */ }
    }

    try {
      dialogs.setRecentColors(await store.getRecentColors());
    } catch (_) { /* ignore */ }

    if (window.location.hash === '#smoke') {
      try {
        await store.putItems([
          {
            id: 'smoke-fixture',
            name: '单日测试',
            notes: '',
            color: '#3b82f6',
            start: '2026-02-01',
            end: '2026-02-01',
            seriesId: null
          },
          {
            id: 'smoke-long',
            name: 'Long Event',
            notes: '',
            color: '#3b82f6',
            start: '2026-04-01',
            end: '2026-04-10',
            seriesId: null
          },
          {
            id: 'smoke-short',
            name: 'Short Event',
            notes: '',
            color: '#3b82f6',
            start: '2026-05-01',
            end: '2026-05-03',
            seriesId: null
          }
        ]);
      } catch (err) {
        console.error('SMOKE_FIXTURE_ERROR ' + (err && err.message ? err.message : String(err)));
      }
    }

    await loadYear();
    applyLanguage();
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
      console.log('SMOKE_LAYOUT_TOPBAR ' + (document.getElementById('sidebar') === null && document.querySelector('#topbar #add-btn') && document.querySelector('#topbar #new-item-btn') ? 'ok' : 'FAIL'));
      const repoLink = document.querySelector('#scroll-body .repo-footer a');
      console.log('SMOKE_REPO_FOOTER ' + (repoLink && repoLink.getAttribute('href') === 'https://github.com/AydinRW/OmniSight-Calendar' && sb.lastElementChild && sb.lastElementChild.classList.contains('repo-footer') ? 'ok' : 'FAIL'));
      const hcStyle = getComputedStyle(document.querySelector('.header-cell'));
      const mlStyle = getComputedStyle(document.querySelector('.month-label'));
      const bg = 'rgb(249, 242, 221)'; // #f9f2dd 页面底色
      const ink = 'rgb(104, 20, 20)'; // #681414 文字色
      const okHeader = hcStyle.backgroundColor === bg && hcStyle.color === ink && hcStyle.fontWeight === '700';
      const okLabel = mlStyle.backgroundColor === bg && mlStyle.color === ink && mlStyle.fontWeight === '700';
      const dateCell = getComputedStyle(document.querySelector('.cell.valid'));
      const okDateText = dateCell.color === ink;
      const okCellFlat = dateCell.borderTopLeftRadius === '0px' && dateCell.borderRightColor === bg;
      const invalidStyle = getComputedStyle(document.querySelector('.cell.invalid'));
      const okInvalid = invalidStyle.backgroundColor === bg;
      const cornerCell = getComputedStyle(document.querySelector('.grid-header + .month-row .cell:nth-child(2)'));
      const okCorners = cornerCell.borderTopLeftRadius === '0px';
      const janRow = getComputedStyle(document.querySelector('#scroll-body > .month-row:nth-child(2) > .row-grid'));
      const aprRow = getComputedStyle(document.querySelector('#scroll-body > .month-row:nth-child(5) > .row-grid'));
      const julRow = getComputedStyle(document.querySelector('#scroll-body > .month-row:nth-child(8) > .row-grid'));
      const octRow = getComputedStyle(document.querySelector('#scroll-body > .month-row:nth-child(11) > .row-grid'));
      const qAB = 'rgb(235, 220, 196)'; // #ebdcc4
      const qBB = 'rgb(242, 230, 204)'; // #f2e6cc
      const okMonthBgs = janRow.backgroundColor === qAB && aprRow.backgroundColor === qBB
        && julRow.backgroundColor === qAB && octRow.backgroundColor === qBB;
      const wk = getComputedStyle(document.querySelector('#scroll-body > .month-row:nth-child(2) .cell.weekend'));
      const okWeekend = wk.backgroundColor === 'rgb(225, 208, 178)'; // #e1d0b2
      const today = getComputedStyle(document.querySelector('.cell.today'));
      const okToday = today.backgroundColor === 'rgb(156, 91, 78)' && today.color === bg
        && today.borderRightColor === 'rgb(156, 91, 78)'; // #9c5b4e / #f9f2dd
      const btnStyle = getComputedStyle(document.querySelector('#new-item-btn'));
      const okButtons = btnStyle.backgroundColor === 'rgb(156, 91, 78)' && btnStyle.color === bg && btnStyle.fontWeight === '700';
      const addDisabled = getComputedStyle(document.querySelector('#add-btn'));
      const okAddDisabled = addDisabled.backgroundColor === 'rgb(58, 90, 64)' && addDisabled.color === bg; // #3a5a40
      const sub = document.querySelector('.app-subtitle');
      const okSub = !!sub && sub.textContent === 'by Aydin' && getComputedStyle(sub).textAlign === 'right';
      const fontOk = getComputedStyle(document.body).fontFamily.indexOf('YaHei') >= 0;
      const okAll = okHeader && okLabel && okDateText && okCellFlat && okInvalid && okCorners && okMonthBgs && okWeekend && okToday && okButtons && okAddDisabled && okSub && fontOk;
      console.log('SMOKE_STYLE_V3 ' + (okAll ? 'ok' : 'FAIL h=' + okHeader + ' l=' + okLabel + ' d=' + okDateText + ' f=' + okCellFlat + ' i=' + okInvalid + ' c=' + okCorners + ' m=' + okMonthBgs + ' w=' + okWeekend + ' t=' + okToday + ' b=' + okButtons + ' ad=' + okAddDisabled + ' s=' + okSub + ' z=' + fontOk));

      const singleBar = Array.from(document.querySelectorAll('.bar')).find((b) => b.dataset.barKey && b.dataset.barKey.indexOf('smoke-fixture') === 0);
      const barText = singleBar ? singleBar.querySelector('.bar-text') : null;
      console.log('SMOKE_SINGLE_BAR_TEXT ' + (barText && barText.textContent === '单日测试' ? 'ok' : 'FAIL(text=' + (barText ? barText.textContent : 'none') + ')'));
      const barTextColor = singleBar ? getComputedStyle(singleBar).color : null;
      console.log('SMOKE_BAR_TEXT_COLOR ' + (barTextColor === 'rgb(255, 255, 255)' ? 'ok' : 'FAIL(' + barTextColor + ')'));
      const barStyle = singleBar ? getComputedStyle(singleBar) : null;
      console.log('SMOKE_BAR_SIZE ' + (singleBar && singleBar.style.height === '18px' && barStyle && barStyle.fontSize === '12px' ? 'ok' : 'FAIL(h=' + (singleBar ? singleBar.style.height : 'none') + ' f=' + (barStyle ? barStyle.fontSize : 'none') + ')'));
      const longBar = Array.from(document.querySelectorAll('.bar')).find((b) => b.dataset.barKey && b.dataset.barKey.indexOf('smoke-long') === 0);
      const longDaysEl = longBar ? longBar.querySelector('.bar-days') : null;
      const longDaysStyle = longDaysEl ? getComputedStyle(longDaysEl) : null;
      const longRect = longBar ? longBar.getBoundingClientRect() : null;
      const daysRect = longDaysEl ? longDaysEl.getBoundingClientRect() : null;
      const daysInside = longRect && daysRect && daysRect.left >= longRect.left && daysRect.right <= longRect.right + 1;
      const longTextSpan = longBar ? longBar.querySelector('.bar-text') : null;
      const spanRect = longTextSpan ? longTextSpan.getBoundingClientRect() : null;
      const noOverlap = spanRect && daysRect && spanRect.right <= daysRect.left + 1;
      const limited = longTextSpan && longRect && parseFloat(getComputedStyle(longTextSpan).maxWidth) < longRect.width;
      console.log('SMOKE_SOLID_DAYS ' + (longDaysEl && longDaysEl.textContent === '10' && longDaysStyle.color === 'rgb(249, 242, 221)' && daysInside && noOverlap && limited ? 'ok' : 'FAIL(inside=' + !!daysInside + ' noOverlap=' + !!noOverlap + ' limited=' + !!limited + ')'));
      const shortBar = Array.from(document.querySelectorAll('.bar')).find((b) => b.dataset.barKey && b.dataset.barKey.indexOf('smoke-short') === 0);
      console.log('SMOKE_SHORT_NO_DAYS ' + (shortBar && !shortBar.querySelector('.bar-days') ? 'ok' : 'FAIL'));

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
      const addEnabled = getComputedStyle(document.querySelector('#add-btn'));
      console.log('SMOKE_BUTTONS_ADD ' + (addEnabled.backgroundColor === 'rgb(100, 140, 105)' && addEnabled.color === 'rgb(249, 242, 221)' && addEnabled.fontWeight === '700' ? 'ok' : 'FAIL'));
      const dbStyle = bars[0] ? getComputedStyle(bars[0]) : null;
      console.log('SMOKE_DRAFT_COLOR ' + (dbStyle && dbStyle.borderTopColor === 'rgb(156, 91, 78)' && dbStyle.backgroundColor === 'rgba(156, 91, 78, 0.16)' ? 'ok' : 'FAIL'));

      // 拖拽草稿天数：≥2天在右端最后一格居中显示，松开后保留至提交；单日不显示
      const mar1 = document.querySelector('.cell.valid[data-date="2026-03-01"]');
      const mar5 = document.querySelector('.cell.valid[data-date="2026-03-05"]');
      const mr1 = mar1.getBoundingClientRect();
      const mr5 = mar5.getBoundingClientRect();
      const mx1 = mr1.left + mr1.width / 2, my1 = mr1.top + mr1.height / 2;
      const mx5 = mr5.left + mr5.width / 2, my5 = mr5.top + mr5.height / 2;
      mar1.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 7, clientX: mx1, clientY: my1 }));
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 7, clientX: mx5, clientY: my5 }));
      const dragDaysEl = document.querySelector('.bar.draft .bar-days');
      const dragBarEl = document.querySelector('.bar.draft');
      const dragRect = dragBarEl ? dragBarEl.getBoundingClientRect() : null;
      const dragDaysRect = dragDaysEl ? dragDaysEl.getBoundingClientRect() : null;
      const dragInside = dragRect && dragDaysRect && dragDaysRect.left >= dragRect.left && dragDaysRect.right <= dragRect.right + 1;
      console.log('SMOKE_DRAG_DAYS ' + (dragDaysEl && dragDaysEl.textContent === '5' && getComputedStyle(dragDaysEl).color === 'rgb(104, 20, 20)' && dragInside ? 'ok' : 'FAIL(' + (dragDaysEl ? dragDaysEl.textContent : 'none') + ' inside=' + !!dragInside + ')'));
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7, clientX: mx5, clientY: my5 }));
      const dragDaysKeep = document.querySelector('.bar.draft .bar-days');
      console.log('SMOKE_DRAG_DAYS_KEEP ' + (dragDaysKeep && dragDaysKeep.textContent === '5' ? 'ok' : 'FAIL'));
      const clickAt3 = (el, opts) => {
        const r = el.getBoundingClientRect();
        const o = Object.assign({ bubbles: true, button: 0, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }, opts || {});
        el.dispatchEvent(new PointerEvent('pointerdown', o));
        el.dispatchEvent(new PointerEvent('pointerup', o));
        el.dispatchEvent(new MouseEvent('click', o));
      };
      clickAt3(mar1, { pointerId: 8 });
      console.log('SMOKE_SINGLE_NO_DAYS ' + (document.querySelector('.bar.draft .bar-days') === null ? 'ok' : 'FAIL'));
      // 连续多步拖动探针：逐步从3月1日拖到3月5日
      const probeSteps = [];
      mar1.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 9, clientX: mx1, clientY: my1 }));
      for (let d = 2; d <= 5; d++) {
        const cell = document.querySelector('.cell.valid[data-date="2026-03-0' + d + '"]');
        const r = cell.getBoundingClientRect();
        window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 9, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
        const pb = document.querySelector('.bar.draft .bar-days');
        probeSteps.push(pb ? pb.textContent : '-');
      }
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 9, clientX: mx5, clientY: my5 }));
      console.log('SMOKE_DRAG_STEPS ' + probeSteps.join(','));

      // 最近使用颜色：自定义颜色计入，预设颜色不计入。
      console.log('SMOKE_RECENT_BEGIN');
      const dlgApi = window.CalendarDialogs;
      dlgApi.recordRecentColor('#123456');
      console.log('SMOKE_RECENT_COLOR ' + (dlgApi.getRecentColors()[0] === '#123456' ? 'ok' : 'FAIL'));
      dlgApi.recordRecentColor('#d1e2d6'); // 预设色
      console.log('SMOKE_RECENT_PRESET ' + (dlgApi.getRecentColors().length === 1 ? 'ok' : 'FAIL(' + dlgApi.getRecentColors().length + ')'));
      window.CalendarStore.setRecentColors(dlgApi.getRecentColors()).then(() => window.CalendarStore.getRecentColors()).then((loaded) => {
        console.log('SMOKE_RECENT_IPC ' + (loaded.length === 1 && loaded[0] === '#123456' ? 'ok' : 'FAIL'));
      }).catch((err) => console.error('SMOKE_RECENT_IPC_ERR ' + (err && err.message ? err.message : String(err))));

      // 双击草稿条应直接弹出【添加事项】弹窗；取消后草稿保留。
      const draftBar = document.querySelector('.bar.draft');
      if (draftBar) {
        const dr = draftBar.getBoundingClientRect();
        draftBar.dispatchEvent(new MouseEvent('dblclick', {
          bubbles: true,
          clientX: dr.left + dr.width / 2,
          clientY: dr.top + dr.height / 2
        }));
      }
      const modal = document.querySelector('.modal-overlay');
      const modalBox = modal ? modal.querySelector('.modal-box') : null;
      const modalStyle = modalBox ? getComputedStyle(modalBox) : null;
      console.log('SMOKE_DBLCLICK_DRAFT_DIALOG ' + (modal && modal.textContent.indexOf('添加事项') >= 0 && modalStyle
        && modalStyle.backgroundColor === 'rgb(249, 242, 221)' && modalStyle.fontFamily.indexOf('YaHei') >= 0 ? 'ok' : 'FAIL(no-modal)'));
      const formCols = modalBox ? modalBox.querySelectorAll('.form-col') : [];
      const colorInRightCol = modalBox && modalBox.querySelector('.form-col:last-child .color-widget');
      const notesInLeftCol = modalBox && modalBox.querySelector('.form-col:first-child textarea');
      console.log('SMOKE_DIALOG_2COL ' + (formCols.length === 2 && colorInRightCol && notesInLeftCol ? 'ok' : 'FAIL(' + formCols.length + ')'));
      const leftColW = modalBox && formCols[0] ? formCols[0].getBoundingClientRect().width : 0;
      const rightColW = modalBox && formCols[1] ? formCols[1].getBoundingClientRect().width : 0;
      console.log('SMOKE_COLOR_COMPACT ' + (rightColW > 0 && rightColW < leftColW ? 'ok' : 'FAIL(' + rightColW + ' vs ' + leftColW + ')'));
      console.log('SMOKE_ADD_NO_STEPPER ' + (modalBox && !modalBox.querySelector('.days-stepper') ? 'ok' : 'FAIL'));
      const notesTa = modalBox ? modalBox.querySelector('.form-col:first-child textarea') : null;
      const notesTaStyle = notesTa ? getComputedStyle(notesTa) : null;
      const notesRect = notesTa ? notesTa.getBoundingClientRect() : null;
      const leftColRect = formCols[0] ? formCols[0].getBoundingClientRect() : null;
      const fillsCol = notesRect && leftColRect && Math.abs(notesRect.bottom - leftColRect.bottom) < 8;
      console.log('SMOKE_NOTES_FILL ' + (notesTaStyle && notesTaStyle.resize === 'none' && fillsCol ? 'ok' : 'FAIL(resize=' + (notesTaStyle ? notesTaStyle.resize : 'none') + ' fill=' + !!fillsCol + ')'));
      const presetSwatches = modalBox ? modalBox.querySelectorAll('.swatch.preset') : [];
      const recentSwatches = modalBox ? modalBox.querySelectorAll('.swatch.recent') : [];
      console.log('SMOKE_COLOR_PRESETS ' + (presetSwatches.length === 25 ? 'ok' : 'FAIL(' + presetSwatches.length + ')'));
      console.log('SMOKE_COLOR_RECENT ' + (recentSwatches.length >= 1 ? 'ok' : 'FAIL(' + recentSwatches.length + ')'));
      const firstPreset = presetSwatches[0];
      const colorInput = modalBox ? modalBox.querySelector('[data-key="color"]') : null;
      if (firstPreset) firstPreset.click();
      console.log('SMOKE_SWATCH_SELECT ' + (colorInput && colorInput.value === firstPreset.dataset.color ? 'ok' : 'FAIL'));
      const colorToggle = modalBox ? modalBox.querySelector('.color-toggle') : null;
      const colorPanel = modalBox ? modalBox.querySelector('.color-panel') : null;
      if (colorToggle) colorToggle.click();
      console.log('SMOKE_COLOR_PANEL_OPEN ' + (colorPanel && !colorPanel.hidden ? 'ok' : 'FAIL'));
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      console.log('SMOKE_COLOR_PANEL_CLOSE ' + (colorPanel && colorPanel.hidden ? 'ok' : 'FAIL'));
      const cancelBtn = modal ? modal.querySelector('[data-act="cancel"]') : null;
      if (cancelBtn) cancelBtn.click();
      bars = document.querySelectorAll('.bar.draft');
      console.log('SMOKE_DRAFT_KEEP_AFTER_CANCEL ' + (bars.length === 1 ? 'ok' : 'FAIL(' + bars.length + ')'));

      const cell2 = document.querySelector('.cell.valid[data-date="2026-01-03"]');
      clickAt(cell2, { pointerId: 2, ctrlKey: true });
      bars = document.querySelectorAll('.bar.draft');
      console.log('SMOKE_CTRL_MULTI ' + (bars.length === 2 ? 'ok' : 'FAIL(' + bars.length + ')'));

      const header = document.querySelector('.grid-header .header-cell');
      const hr = header.getBoundingClientRect();
      header.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: hr.left + 4, clientY: hr.top + 4 }));
      bars = document.querySelectorAll('.bar.draft');
      console.log('SMOKE_CLICK_CLEAR ' + (bars.length === 0 ? 'ok' : 'FAIL(' + bars.length + ')'));

      // 批量删除模式
      const batchDelBtn = document.getElementById('batch-delete-btn');
      const batchActionsEl = document.getElementById('batch-actions');
      batchDelBtn.click();
      console.log('SMOKE_BATCH_ENTER ' + (batchDelBtn.hidden && !batchActionsEl.hidden ? 'ok' : 'FAIL'));
      const fixtureBar2 = Array.from(document.querySelectorAll('.bar')).find((b) => b.dataset.barKey && b.dataset.barKey.indexOf('smoke-fixture') === 0);
      if (fixtureBar2) fixtureBar2.click();
      console.log('SMOKE_BATCH_SELECT ' + (fixtureBar2 && fixtureBar2.classList.contains('selected') ? 'ok' : 'FAIL'));
      if (fixtureBar2) fixtureBar2.click();
      console.log('SMOKE_BATCH_UNSELECT ' + (fixtureBar2 && !fixtureBar2.classList.contains('selected') ? 'ok' : 'FAIL'));
      if (fixtureBar2) fixtureBar2.click(); // 重新选中
      document.getElementById('batch-done-btn').click();
      window.CalendarStore.loadYear(2026).then((data) => {
        const gone = !data.items.some((i) => i.id === 'smoke-fixture');
        const restored = !batchDelBtn.hidden && batchActionsEl.hidden;
        console.log('SMOKE_BATCH_DELETE ' + (gone && restored ? 'ok' : 'FAIL'));
      }).catch((err) => console.error('SMOKE_BATCH_ERR ' + (err && err.message ? err.message : String(err))));

      window.CalendarDialogs.openNewItemDialog({});
      const newModal = document.querySelector('.modal-overlay');
      const newModalColor = newModal ? newModal.querySelector('.color-widget') : null;
      console.log('SMOKE_NEWITEM_COLOR ' + (newModalColor ? 'ok' : 'FAIL'));
      const recCols = newModal ? newModal.querySelectorAll('.form-col') : [];
      const recNotes = newModal && newModal.querySelector('.form-col:first-child textarea');
      console.log('SMOKE_RECURRING_2COL ' + (recCols.length === 2 && recNotes ? 'ok' : 'FAIL(' + recCols.length + ')'));
      const recNotesRect = recNotes ? recNotes.getBoundingClientRect() : null;
      const recColorWidget = newModal ? newModal.querySelector('.form-col:last-child .color-widget') : null;
      const recColorRect = recColorWidget ? recColorWidget.getBoundingClientRect() : null;
      const recAligned = recNotesRect && recColorRect && Math.abs(recNotesRect.bottom - recColorRect.bottom) < 20;
      console.log('SMOKE_RECURRING_ALIGN ' + (recAligned ? 'ok' : 'FAIL(d=' + (recNotesRect && recColorRect ? Math.abs(recNotesRect.bottom - recColorRect.bottom) : 'n/a') + ')'));
      const cancelNew = newModal ? newModal.querySelector('[data-act="cancel"]') : null;
      if (cancelNew) cancelNew.click();

      // 编辑弹窗天数步进器
      const longBarEdit = Array.from(document.querySelectorAll('.bar')).find((b) => b.dataset.barKey && b.dataset.barKey.indexOf('smoke-long') === 0);
      const lbe = longBarEdit ? longBarEdit.getBoundingClientRect() : null;
      if (lbe) {
        longBarEdit.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: lbe.left + lbe.width / 2, clientY: lbe.top + lbe.height / 2 }));
      }
      const editModal = document.querySelector('.modal-overlay');
      const editBox = editModal ? editModal.querySelector('.modal-box') : null;
      const stepper = editBox ? editBox.querySelector('.days-stepper') : null;
      const daysVal = editBox ? editBox.querySelector('.days-value') : null;
      const daysMinus = editBox ? editBox.querySelector('.days-minus') : null;
      const daysPlus = editBox ? editBox.querySelector('.days-plus') : null;
      console.log('SMOKE_EDIT_STEPPER ' + (stepper && daysVal && daysVal.textContent === '10' && daysMinus && daysPlus ? 'ok' : 'FAIL'));
      if (daysMinus) {
        for (let i = 0; i < 9; i++) daysMinus.click();
      }
      console.log('SMOKE_STEPPER_MIN ' + (daysVal && daysVal.textContent === '1' && daysMinus.disabled ? 'ok' : 'FAIL(' + (daysVal ? daysVal.textContent : 'none') + ')'));
      if (daysPlus) daysPlus.click();
      console.log('SMOKE_STEPPER_PLUS ' + (daysVal && daysVal.textContent === '2' && !daysMinus.disabled ? 'ok' : 'FAIL(' + (daysVal ? daysVal.textContent : 'none') + ')'));
      const editCancel = editBox ? editBox.querySelector('[data-act="cancel"]') : null;
      if (editCancel) editCancel.click();

      // 菜单栏与中英文切换
      const menuSettingsEl = document.querySelector('[data-menu="settings"]');
      const langBtnGone = document.getElementById('lang-btn') === null;
      console.log('SMOKE_MENU_BAR ' + (langBtnGone && menuSettingsEl && document.querySelector('[data-menu="options"]') && document.querySelector('[data-menu="help"]') && menuSettingsEl.textContent === '设置' ? 'ok' : 'FAIL'));
      const addBtnEl = document.getElementById('add-btn');
      const newItemBtnEl = document.getElementById('new-item-btn');
      const zhBtnH = getComputedStyle(newItemBtnEl).height;
      menuSettingsEl.click();
      const engItem = Array.from(document.querySelectorAll('#menu-dropdown .lang-item')).find((el) => el.dataset.lang === 'en');
      engItem.click();
      const headerFirst = document.querySelector('.header-cell').textContent;
      const janLabelEl = document.querySelector('#scroll-body > .month-row:nth-child(2) > .month-label').textContent;
      const btnH = getComputedStyle(newItemBtnEl).height;
      console.log('SMOKE_LANG_EN ' + (addBtnEl.textContent === 'Add' && newItemBtnEl.textContent === 'New Event' && headerFirst === 'Mon' && janLabelEl === 'Jan' ? 'ok' : 'FAIL(' + addBtnEl.textContent + ',' + headerFirst + ',' + janLabelEl + ')'));
      console.log('SMOKE_BTN_HEIGHT ' + (btnH === zhBtnH && Math.abs(parseFloat(btnH) - 32) < 0.5 ? 'ok' : 'FAIL(' + btnH + ' vs ' + zhBtnH + ')'));
      window.CalendarStore.getSettings().then((s) => {
        console.log('SMOKE_LANG_SHAPE ' + (s && (s.lang === 'zh' || s.lang === 'en') ? 'ok' : 'FAIL'));
      }).catch((err) => console.error('SMOKE_LANG_ERR ' + (err && err.message ? err.message : String(err))));
      menuSettingsEl.click();
      const zhItem = Array.from(document.querySelectorAll('#menu-dropdown .lang-item')).find((el) => el.dataset.lang === 'zh');
      zhItem.click();
      console.log('SMOKE_LANG_ZH ' + (addBtnEl.textContent === '添加' && document.querySelector('.header-cell').textContent === '周一' ? 'ok' : 'FAIL'));

      console.log('SMOKE_INTERACTION_DONE');
    } catch (err) {
      console.error('SMOKE_INTERACTION_ERROR ' + (err && err.message ? err.message : String(err)));
    }
  }
})();
