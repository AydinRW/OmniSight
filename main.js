'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const {
  groupItemsByYear,
  groupSeriesByYear,
  mergeYearData,
  upsertRecord,
  normalizeItem,
  normalizeSeries
} = require('./renderer/storage-logic.js');

const DATA_DIR = app.isPackaged
  ? path.join(process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath), 'data')
  : path.join(app.getAppPath(), 'data');

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function yearFile(year) {
  return path.join(DATA_DIR, String(year), 'items.json');
}

function loadYearData(year) {
  try {
    const data = JSON.parse(fs.readFileSync(yearFile(year), 'utf8'));
    return { items: data.items || [], series: data.series || [] };
  } catch (_) {
    return { items: [], series: [] };
  }
}

function saveYearData(year, data) {
  const file = yearFile(year);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  try {
    fs.renameSync(tmp, file);
  } catch (_) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    try { fs.unlinkSync(tmp); } catch (__) { /* ignore */ }
  }
}

function allYearNumbers() {
  if (!fs.existsSync(DATA_DIR)) return [];
  return fs.readdirSync(DATA_DIR)
    .filter((n) => /^\d{4}$/.test(n))
    .map(Number)
    .sort((a, b) => a - b);
}

function assertYear(year) {
  if (!/^\d{4}$/.test(String(year))) throw new Error('invalid year: ' + year);
  return Number(year);
}

function assertISO(v, label) {
  if (typeof v !== 'string' || !ISO_RE.test(v)) throw new Error('invalid ' + label + ': ' + v);
  return v;
}

// 根据所有年份文件中的成员，刷新系列记录的开始/结束日期；成员清零时删除系列记录。
function refreshSeriesState() {
  const years = allYearNumbers();
  const files = new Map();
  for (const y of years) files.set(y, loadYearData(y));
  const seriesIds = new Set();
  for (const f of files.values()) {
    for (const s of f.series) seriesIds.add(s.id);
  }
  const dirty = new Set();
  for (const id of seriesIds) {
    let min = null;
    let max = null;
    for (const f of files.values()) {
      for (const it of f.items) {
        if (it.seriesId === id) {
          if (min === null || it.start < min) min = it.start;
          if (max === null || it.end > max) max = it.end;
        }
      }
    }
    for (const [y, f] of files) {
      const s = f.series.find((x) => x.id === id);
      if (!s) continue;
      if (min === null) {
        f.series = f.series.filter((x) => x.id !== id);
        dirty.add(y);
      } else if (s.start !== min || s.end !== max) {
        s.start = min;
        s.end = max;
        dirty.add(y);
      }
    }
  }
  for (const y of years) {
    if (dirty.has(y)) saveYearData(y, files.get(y));
  }
}

ipcMain.handle('calendar:getYear', (_e, year) => {
  const y = assertYear(year);
  return mergeYearData(y, loadYearData(y), loadYearData(y - 1));
});

ipcMain.handle('calendar:putItems', (_e, rawItems) => {
  if (!Array.isArray(rawItems)) throw new Error('items must be an array');
  const items = rawItems.map((r) => {
    const it = normalizeItem(r);
    assertISO(it.start, 'start');
    assertISO(it.end, 'end');
    if (it.end < it.start) throw new Error('end before start for item ' + it.id);
    return it;
  });
  const groups = groupItemsByYear(items);
  for (const [y, list] of groups) {
    const f = loadYearData(y);
    for (const it of list) upsertRecord(f.items, it);
    saveYearData(y, f);
  }
  const ids = new Set(items.map((i) => i.id));
  for (const y of allYearNumbers()) {
    if (groups.has(y)) continue;
    const f = loadYearData(y);
    const before = f.items.length;
    f.items = f.items.filter((i) => !ids.has(i.id));
    if (f.items.length !== before) saveYearData(y, f);
  }
  refreshSeriesState();
  return true;
});

ipcMain.handle('calendar:deleteItems', (_e, rawIds) => {
  const ids = new Set(Array.isArray(rawIds) ? rawIds.map(String) : []);
  if (!ids.size) return true;
  for (const y of allYearNumbers()) {
    const f = loadYearData(y);
    const before = f.items.length;
    f.items = f.items.filter((i) => !ids.has(i.id));
    if (f.items.length !== before) saveYearData(y, f);
  }
  refreshSeriesState();
  return true;
});

ipcMain.handle('calendar:putSeries', (_e, rawList) => {
  if (!Array.isArray(rawList)) throw new Error('series must be an array');
  const list = rawList.map((r) => {
    const s = normalizeSeries(r);
    assertISO(s.start, 'start');
    assertISO(s.end, 'end');
    if (s.end < s.start) throw new Error('end before start for series ' + s.id);
    return s;
  });
  const groups = groupSeriesByYear(list);
  for (const [y, arr] of groups) {
    const f = loadYearData(y);
    for (const s of arr) upsertRecord(f.series, s);
    saveYearData(y, f);
  }
  return true;
});

ipcMain.handle('calendar:deleteSeries', (_e, rawIds) => {
  const ids = new Set(Array.isArray(rawIds) ? rawIds.map(String) : []);
  for (const y of allYearNumbers()) {
    const f = loadYearData(y);
    const before = f.series.length;
    f.series = f.series.filter((s) => !ids.has(s.id));
    if (f.series.length !== before) saveYearData(y, f);
  }
  return true;
});

ipcMain.handle('calendar:deleteSeriesAndMembers', (_e, rawSeriesId) => {
  const seriesId = String(rawSeriesId);
  let removed = 0;
  for (const y of allYearNumbers()) {
    const f = loadYearData(y);
    const beforeItems = f.items.length;
    f.items = f.items.filter((i) => i.seriesId !== seriesId);
    removed += beforeItems - f.items.length;
    const beforeSeries = f.series.length;
    f.series = f.series.filter((s) => s.id !== seriesId);
    if (f.items.length !== beforeItems || f.series.length !== beforeSeries) {
      saveYearData(y, f);
    }
  }
  return removed;
});

ipcMain.handle('calendar:updateSeries', (_e, rawSeriesId, rawPatch) => {
  const seriesId = String(rawSeriesId);
  const patch = rawPatch || {};
  const name = String(patch.name == null ? '' : patch.name);
  const notes = String(patch.notes == null ? '' : patch.notes);
  const color = /^#[0-9a-fA-F]{6}$/.test(patch.color) ? patch.color : '#3b82f6';
  let memberCount = 0;
  for (const y of allYearNumbers()) {
    const f = loadYearData(y);
    let changed = false;
    for (const s of f.series) {
      if (s.id === seriesId) {
        s.name = name;
        s.notes = notes;
        s.color = color;
        changed = true;
      }
    }
    for (const it of f.items) {
      if (it.seriesId === seriesId) {
        it.name = name;
        it.notes = notes;
        it.color = color;
        memberCount++;
        changed = true;
      }
    }
    if (changed) saveYearData(y, f);
  }
  return memberCount;
});

ipcMain.handle('calendar:getDataDir', () => DATA_DIR);

const RECENT_FILE = path.join(DATA_DIR, 'recent-colors.json');

function normalizeRecent(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((c) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c))
    .slice(0, 5);
}

ipcMain.handle('calendar:getRecentColors', () => {
  try {
    return normalizeRecent(JSON.parse(fs.readFileSync(RECENT_FILE, 'utf8')));
  } catch (_) {
    return [];
  }
});

ipcMain.handle('calendar:setRecentColors', (_e, list) => {
  const arr = normalizeRecent(list);
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = RECENT_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(arr), 'utf8');
    try {
      fs.renameSync(tmp, RECENT_FILE);
    } catch (_) {
      fs.writeFileSync(RECENT_FILE, JSON.stringify(arr), 'utf8');
      try { fs.unlinkSync(tmp); } catch (__) { /* ignore */ }
    }
  } catch (_) { /* ignore */ }
  return arr;
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    title: '全局视野',
    backgroundColor: '#f5f5f4',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile('index.html', isSmoke ? { hash: 'smoke' } : {});
  return win;
}

const isSmoke = process.argv.includes('--smoke');
if (isSmoke) {
  const marker = path.join(app.getAppPath(), '.smoke-marker');
  try { fs.unlinkSync(marker); } catch (_) { /* ignore */ }
  let rendererError = false;
  const logs = [];
  app.on('web-contents-created', (_e, contents) => {
    contents.on('console-message', (_ev, level, message) => {
      logs.push(String(message));
      console.log('[renderer] ' + message);
      const lv = typeof level === 'string' ? level : Number(level);
      if (lv === 'error' || lv === 3) rendererError = true;
    });
    contents.on('render-process-gone', (_e, details) => {
      console.error('RENDER_GONE ' + JSON.stringify(details));
      logs.push('RENDER_GONE ' + JSON.stringify(details));
    });
    contents.on('did-finish-load', () => {
      const shotPath = path.join(app.getAppPath(), '.smoke-shot.png');
      try { fs.unlinkSync(shotPath); } catch (_) { /* ignore */ }
      setTimeout(() => {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
          win.webContents.capturePage().then((img) => {
            try { fs.writeFileSync(shotPath, img.toPNG()); } catch (_) { /* ignore */ }
          }).catch(() => { /* ignore */ });
        }
      }, 3000);
      setTimeout(() => {
        if (rendererError) {
          console.error('SMOKE_FAIL renderer error');
          try { fs.writeFileSync(marker, 'FAIL renderer error\n' + logs.join('\n'), 'utf8'); } catch (err) { console.error('MARKER_WRITE_FAIL ' + err.message); }
          app.exit(1);
        } else {
          console.log('SMOKE_OK');
          try { fs.writeFileSync(marker, 'OK\n' + logs.join('\n'), 'utf8'); } catch (err) { console.error('MARKER_WRITE_FAIL ' + err.message); }
          app.exit(0);
        }
      }, 4000);
    });
    contents.on('did-fail-load', (_ev, code, desc) => {
      console.error('SMOKE_FAIL ' + code + ' ' + desc);
      try { fs.writeFileSync(marker, 'FAIL load ' + code, 'utf8'); } catch (_) { /* ignore */ }
      app.exit(1);
    });
  });
}

app.whenReady().then(() => {
  createWindow();
  if (isSmoke) {
    setTimeout(() => {
      const marker = path.join(app.getAppPath(), '.smoke-marker');
      try { fs.writeFileSync(marker, 'FAIL timeout', 'utf8'); } catch (_) { /* ignore */ }
      console.error('SMOKE_FAIL timeout');
      app.exit(2);
    }, 20000);
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
