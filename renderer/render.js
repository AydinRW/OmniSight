(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CalendarRenderer = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DATE_AREA = 18;
  const BAR_HEIGHT = 18;
  const BAR_SLOT = 20; // 横条加高后，条与条之间的空隙仍保持 2px（20 - 18）
  // 单元格最小高度：恰好容纳 3 根横条（0-3 条时保持此高度，不收缩）。
  const MIN_ROW_HEIGHT = DATE_AREA + 3 * BAR_SLOT + 4; // 70
  const LABEL_WIDTH = 64;
  const HEADER_HEIGHT = 26;
  // 横条宽度达到该值才显示名称文字：单日横条宽度约 20~46px，
  // 只要空间能容纳至少一个字符就显示（不足则截断为省略号）。
  const TEXT_MIN_WIDTH = 24;

  // 根据横条底色亮度选择文字颜色：底色偏深用白色，偏浅用黑色。
  function isLightColor(hex) {
    const m = /^#([0-9a-fA-F]{6})$/.exec(String(hex || ''));
    if (!m) return false;
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
  }

  // 每个月份行内，把与行有交集的事项条分配到“泳道”（垂直槽位）：
  // 按 (开始日期, id) 顺序贪心分配最低可用泳道；不重叠的事项可复用同一泳道，
  // 因此不同日期的单日事项都从第 1 格开始堆叠，不会互相抬高月份行。
  // 同一事项条在所有覆盖的格子里保持同一泳道，保证跨天条视觉连续。
  function assignSlots(bars, rowStartISO, rowEndISO) {
    const intersecting = bars
      .filter((b) => b.start <= rowEndISO && b.end >= rowStartISO)
      .slice()
      .sort((a, b) => {
        if (a.start < b.start) return -1;
        if (a.start > b.start) return 1;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
    const slots = new Map();
    const laneEnds = []; // 每条泳道最近一次占用事件的结束日期（ISO 字符串可直接比较）
    for (const b of intersecting) {
      let lane = -1;
      for (let i = 0; i < laneEnds.length; i++) {
        if (laneEnds[i] < b.start) {
          lane = i;
          break;
        }
      }
      if (lane < 0) {
        lane = laneEnds.length;
        laneEnds.push(b.end);
      } else {
        laneEnds[lane] = b.end;
      }
      slots.set(b.id, lane);
    }
    return slots;
  }

  class CalendarRenderer {
    constructor(scrollBody, options) {
      const opts = options || {};
      this.scrollBody = scrollBody;
      this.u = opts.utils;
      this.state = opts.state;
      this.labelWidth = opts.labelWidth != null ? opts.labelWidth : LABEL_WIDTH;
      this.headerHeight = opts.headerHeight != null ? opts.headerHeight : HEADER_HEIGHT;
      this.year = null;
      this.totalCols = 0;
      this.rowEls = [];
      this.headerGrid = null;
      this.colWidth = 0;
      this.rowDateRanges = [];
      this.barElements = new Map();
      this.barData = new Map();
    }

    refresh() {
      this.applyWidth();
      this.renderBars();
    }

    render(year) {
      this.year = year;
      const u = this.u;
      this.totalCols = u.TOTAL_COLS;
      this.rowDateRanges = [];
      for (let m = 1; m <= 12; m++) {
        const start = new Date(year, m - 1, 1);
        const end = new Date(year, m - 1, u.daysInMonth(year, m));
        this.rowDateRanges.push([u.formatISO(start), u.formatISO(end)]);
      }

      this.scrollBody.innerHTML = '';
      this.barElements.clear();
      this.barData.clear();
      this.rowEls = [];
      this.headerGrid = null;

      const header = document.createElement('div');
      header.className = 'grid-header';
      header.style.paddingLeft = this.labelWidth + 'px';
      header.style.height = this.headerHeight + 'px';
      this.headerGrid = document.createElement('div');
      this.headerGrid.className = 'header-grid';
      header.appendChild(this.headerGrid);
      this.scrollBody.appendChild(header);

      const totalCols = this.totalCols;
      for (let c = 0; c < totalCols; c++) {
        const hc = document.createElement('div');
        hc.className = 'header-cell';
        hc.textContent = (window.I18n && window.I18n.t)
          ? window.I18n.t('weekday')[c % 7]
          : u.WEEKDAY_LABELS[c % 7];
        this.headerGrid.appendChild(hc);
      }

      for (let m = 0; m < 12; m++) {
        const month = m + 1;
        const row = document.createElement('div');
        row.className = 'month-row';
        const label = document.createElement('div');
        label.className = 'month-label';
        label.textContent = (window.I18n && window.I18n.t)
          ? window.I18n.t('month')[m]
          : (month + '月');
        const gridEl = document.createElement('div');
        gridEl.className = 'row-grid q' + (Math.floor(m / 3) + 1);
        const layer = document.createElement('div');
        layer.className = 'bar-layer';
        gridEl.appendChild(layer);
        row.appendChild(label);
        row.appendChild(gridEl);
        this.scrollBody.appendChild(row);
        this.rowEls.push({ row, grid: gridEl, layer, month, cells: [] });
      }

      const today = u.todayISO();
      for (let m = 0; m < 12; m++) {
        const { grid: gridEl, month } = this.rowEls[m];
        for (let c = 0; c < totalCols; c++) {
          const date = u.monthDateAt(year, month, c);
          const valid = date.getMonth() + 1 === month;
          const cell = document.createElement('div');
          cell.className = 'cell' + (valid ? ' valid' : ' invalid');
          if (valid) {
            const iso = u.formatISO(date);
            cell.dataset.date = iso;
            cell.textContent = String(date.getDate());
            const wd = u.weekdayIndexMon(date);
            if (wd === 5 || wd === 6) cell.classList.add('weekend');
            if (iso === today) cell.classList.add('today');
          }
          gridEl.appendChild(cell);
          this.rowEls[m].cells.push(cell);
        }
      }

      this.applyWidth();
      this.renderBars();
    }

    applyWidth() {
      if (!this.totalCols || !this.headerGrid) return;
      const available = this.scrollBody.clientWidth - this.labelWidth;
      this.colWidth = Math.max(1, available / this.totalCols);
      const template = 'repeat(' + this.totalCols + ', ' + this.colWidth + 'px)';
      this.headerGrid.style.gridTemplateColumns = template;
      for (const r of this.rowEls) r.grid.style.gridTemplateColumns = template;
    }

    renderBars() {
      if (!this.totalCols) return;
      const u = this.u;
      const { data, drafts, moving } = this.state;
      const items = data ? data.items || [] : [];
      const bars = [];
      const excluded = new Set();
      if (moving) excluded.add(moving.itemId);
      for (const it of items) {
        if (excluded.has(it.id)) {
          bars.push({
            id: it.id,
            start: moving.newStart,
            end: moving.newEnd,
            name: it.name,
            notes: it.notes,
            color: it.color,
            seriesId: it.seriesId,
            item: it,
            preview: true
          });
        } else {
          bars.push({
            id: it.id,
            start: it.start,
            end: it.end,
            name: it.name,
            notes: it.notes,
            color: it.color,
            seriesId: it.seriesId,
            item: it
          });
        }
      }
      (drafts || []).forEach((d, i) => {
        bars.push({ id: 'draft-' + i, start: d.start, end: d.end, draft: true });
      });

      const newKeys = new Set();
      const maxSlotByRow = new Array(12).fill(-1);
      const segsByRow = [];
      for (let r = 0; r < 12; r++) segsByRow.push([]);

      for (let r = 0; r < 12; r++) {
        const rowStart = this.rowDateRanges[r][0];
        const rowEnd = this.rowDateRanges[r][1];
        const slots = assignSlots(bars, rowStart, rowEnd);
        for (const b of bars) {
          const slot = slots.get(b.id);
          if (slot === undefined) continue;
          const segStart = b.start < rowStart ? rowStart : b.start;
          const segEnd = b.end > rowEnd ? rowEnd : b.end;
          const colStart = this.columnOfDate(u.parseISO(segStart));
          const colEnd = this.columnOfDate(u.parseISO(segEnd));
          if (colStart < 0 || colEnd < 0) continue;
          segsByRow[r].push({ b, slot, colStart, colEnd, segStart, segEnd });
          if (slot > maxSlotByRow[r]) maxSlotByRow[r] = slot;
        }
      }

      for (let r = 0; r < 12; r++) {
        const rowHeight = Math.max(MIN_ROW_HEIGHT, DATE_AREA + (maxSlotByRow[r] + 1) * BAR_SLOT + 4);
        this.rowEls[r].row.style.height = rowHeight + 'px';
        this.rowEls[r].grid.style.height = rowHeight + 'px';
      }

      for (let r = 0; r < 12; r++) {
        for (const seg of segsByRow[r]) {
          const { b, slot, colStart, colEnd } = seg;
          const key = b.id + ':' + r;
          newKeys.add(key);
          const left = colStart * this.colWidth;
          const width = (colEnd - colStart + 1) * this.colWidth - 2;
          const top = DATE_AREA + slot * BAR_SLOT;
          let el = this.barElements.get(key);
          if (!el) {
            el = document.createElement('div');
            el.dataset.barKey = key;
            this.barElements.set(key, el);
            this.rowEls[r].layer.appendChild(el);
          }
          el.className = 'bar' + (b.draft ? ' draft' : '') + (b.preview ? ' preview' : '');
          if (!b.draft && this.state.batch && this.state.batch.ids.has(b.id)) {
            el.classList.add('selected');
          }
          el.style.left = left + 'px';
          el.style.top = top + 'px';
          el.style.width = width + 'px';
          el.style.height = BAR_HEIGHT + 'px';
          el.style.background = b.draft ? '' : b.color;
          el.style.color = b.draft ? '' : (isLightColor(b.color) ? '#000000' : '#ffffff');
          if (width >= TEXT_MIN_WIDTH && !b.draft) {
            let span = el.querySelector('.bar-text');
            if (!span) {
              span = document.createElement('span');
              span.className = 'bar-text';
              el.appendChild(span);
            }
            span.textContent = b.name || '';
          } else {
            const span = el.querySelector('.bar-text');
            if (span) span.remove();
          }
          // 天数标注：草稿≥2天、正式事项≥5天，在长条最右端最后一格居中显示；草稿保留到提交。
          const days = u.diffDays(b.start, b.end) + 1;
          const showDays = ((b.draft && days >= 2) || (!b.draft && days >= 5)) && seg.segEnd === b.end;
          let daysEl = el.querySelector('.bar-days');
          if (showDays) {
            if (!daysEl) {
              daysEl = document.createElement('span');
              daysEl.className = 'bar-days';
              el.appendChild(daysEl);
            }
            daysEl.textContent = String(days);
            // span 是长条的子元素，left 相对长条自身：最后一格中心 = (colEnd - colStart + 0.5) * colWidth
            daysEl.style.left = ((colEnd - colStart + 0.5) * this.colWidth) + 'px';
          } else if (daysEl) {
            daysEl.remove();
          }
          this.barData.set(key, {
            item: b.item || null,
            draft: !!b.draft,
            preview: !!b.preview,
            name: b.name || '',
            notes: b.notes || '',
            start: b.start,
            end: b.end
          });
        }
      }

      for (const [key, el] of this.barElements) {
        if (!newKeys.has(key)) {
          el.remove();
          this.barElements.delete(key);
          this.barData.delete(key);
        }
      }
    }

    columnOfDate(date) {
      return this.u.columnForDate(date);
    }

    pointToCell(clientX, clientY) {
      for (let r = 0; r < 12; r++) {
        const rect = this.rowEls[r].grid.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
          const col = Math.floor((clientX - rect.left) / this.colWidth);
          if (col < 0 || col >= this.totalCols) return null;
          const date = this.u.monthDateAt(this.year, this.rowEls[r].month, col);
          const month = this.rowEls[r].month;
          return {
            dateISO: this.u.formatISO(date),
            valid: date.getMonth() + 1 === month,
            month
          };
        }
      }
      return null;
    }
  }

  CalendarRenderer.assignSlots = assignSlots;
  CalendarRenderer.isLightColor = isLightColor;
  CalendarRenderer.CONSTANTS = { DATE_AREA, BAR_HEIGHT, BAR_SLOT, MIN_ROW_HEIGHT, LABEL_WIDTH, HEADER_HEIGHT };
  return CalendarRenderer;
});
