(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StorageLogic = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function startYearOf(dateStr) {
    return parseInt(String(dateStr).slice(0, 4), 10);
  }

  function itemStartYear(item) {
    return startYearOf(item.start);
  }

  function seriesStartYear(series) {
    return startYearOf(series.start);
  }

  function overlapYear(item, year) {
    const y0 = parseInt(String(item.start).slice(0, 4), 10);
    const y1 = parseInt(String(item.end).slice(0, 4), 10);
    return y0 <= year && year <= y1;
  }

  function groupByYear(records, yearFn) {
    const map = new Map();
    for (const r of records) {
      const y = yearFn(r);
      if (!map.has(y)) map.set(y, []);
      map.get(y).push(r);
    }
    return map;
  }

  function groupItemsByYear(items) {
    return groupByYear(items, itemStartYear);
  }

  function groupSeriesByYear(series) {
    return groupByYear(series, seriesStartYear);
  }

  function mergeYearData(year, current, prev) {
    const items = [];
    for (const it of current.items || []) {
      if (overlapYear(it, year)) items.push(it);
    }
    for (const it of prev.items || []) {
      if (overlapYear(it, year)) items.push(it);
    }
    const memberSeriesIds = new Set();
    for (const it of items) {
      if (it.seriesId) memberSeriesIds.add(it.seriesId);
    }
    const series = [];
    for (const s of current.series || []) series.push(s);
    for (const s of prev.series || []) {
      if (memberSeriesIds.has(s.id)) series.push(s);
    }
    return { items, series };
  }

  function upsertRecord(list, record) {
    const idx = list.findIndex((r) => r.id === record.id);
    if (idx >= 0) list[idx] = record;
    else list.push(record);
  }

  function normalizeItem(raw) {
    return {
      id: String(raw.id),
      name: String(raw.name == null ? '' : raw.name),
      notes: String(raw.notes == null ? '' : raw.notes),
      color: /^#[0-9a-fA-F]{6}$/.test(raw.color) ? raw.color : '#3b82f6',
      start: String(raw.start),
      end: String(raw.end),
      seriesId: raw.seriesId ? String(raw.seriesId) : null
    };
  }

  function normalizeSeries(raw) {
    return {
      id: String(raw.id),
      name: String(raw.name == null ? '' : raw.name),
      notes: String(raw.notes == null ? '' : raw.notes),
      color: /^#[0-9a-fA-F]{6}$/.test(raw.color) ? raw.color : '#3b82f6',
      start: String(raw.start),
      end: String(raw.end),
      intervalDays: Number(raw.intervalDays) || 1
    };
  }

  return {
    startYearOf,
    itemStartYear,
    seriesStartYear,
    overlapYear,
    groupItemsByYear,
    groupSeriesByYear,
    mergeYearData,
    upsertRecord,
    normalizeItem,
    normalizeSeries
  };
});
