(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CalendarStore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function api() {
    if (!window.calendarAPI) throw new Error('calendarAPI 不可用：请通过 Electron 启动');
    return window.calendarAPI;
  }

  return {
    loadYear: (year) => api().getYear(year),
    putItems: (items) => api().putItems(items),
    deleteItems: (ids) => api().deleteItems(ids),
    putSeries: (list) => api().putSeries(list),
    deleteSeries: (ids) => api().deleteSeries(ids),
    deleteSeriesAndMembers: (seriesId) => api().deleteSeriesAndMembers(seriesId),
    updateSeries: (seriesId, patch) => api().updateSeries(seriesId, patch),
    getDataDir: () => api().getDataDir(),
    getRecentColors: () => api().getRecentColors(),
    setRecentColors: (list) => api().setRecentColors(list),
    getSettings: () => api().getSettings(),
    setSettings: (settings) => api().setSettings(settings)
  };
});
