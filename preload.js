'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('calendarAPI', {
  getYear: (year) => ipcRenderer.invoke('calendar:getYear', year),
  putItems: (items) => ipcRenderer.invoke('calendar:putItems', items),
  deleteItems: (ids) => ipcRenderer.invoke('calendar:deleteItems', ids),
  putSeries: (list) => ipcRenderer.invoke('calendar:putSeries', list),
  deleteSeries: (ids) => ipcRenderer.invoke('calendar:deleteSeries', ids),
  deleteSeriesAndMembers: (seriesId) => ipcRenderer.invoke('calendar:deleteSeriesAndMembers', seriesId),
  updateSeries: (seriesId, patch) => ipcRenderer.invoke('calendar:updateSeries', seriesId, patch),
  getDataDir: () => ipcRenderer.invoke('calendar:getDataDir')
});
