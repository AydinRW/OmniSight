(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CalendarDialogs = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULT_COLOR = '#3b82f6';

  const PRESET_GROUPS = [
    ['#d1e2d6', '#b8d2bf', '#9cb8a3', '#7a9e86', '#5e8069'],
    ['#f0d9dd', '#e2c4ca', '#d1a8b0', '#bc8a96', '#9e6d79'],
    ['#d6e0e8', '#b8c9d8', '#97afc2', '#7898af', '#5e7c94'],
    ['#e9d9cc', '#d9c2ad', '#c8a88e', '#b08e70', '#8f7057'],
    ['#e2dce7', '#d1c5db', '#b8a7c8', '#9e8bb8', '#826ea0']
  ];
  const PRESET_COLORS = [].concat.apply([], PRESET_GROUPS);
  let recentCache = [];

  function getRecentColors() {
    return recentCache.slice();
  }

  // 由外部（app.js）从本地存储加载后注入。
  function setRecentColors(list) {
    recentCache = (Array.isArray(list) ? list : [])
      .filter((c) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c))
      .slice(0, 5);
  }

  // 记录“最近使用颜色”：仅记录非预设的自定义颜色，最多 5 个，去重且最新在前。
  // 返回更新后的列表（供外部持久化）；若颜色无效或属于预设则返回 null。
  function recordRecentColor(hex) {
    const c = String(hex || '').toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(c)) return null;
    if (PRESET_COLORS.indexOf(c) >= 0) return null;
    const list = recentCache.filter((x) => x !== c);
    list.unshift(c);
    recentCache = list.slice(0, 5);
    return recentCache.slice();
  }

  function hexToRgb(hex) {
    const m = /^#([0-9a-fA-F]{6})$/.exec(String(hex || ''));
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex(r, g, b) {
    const to = (x) => String(Math.max(0, Math.min(255, Math.round(x))).toString(16)).padStart(2, '0');
    return '#' + to(r) + to(g) + to(b);
  }

  function rgbToHsv(r, g, b) {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === rn) h = ((gn - bn) / d) % 6;
      else if (max === gn) h = (bn - rn) / d + 2;
      else h = (rn - gn) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h, s: max === 0 ? 0 : d / max, v: max };
  }

  function hsvToRgb(h, s, v) {
    h = ((h % 360) + 360) % 360;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function tt(key, params) {
    return (typeof window !== 'undefined' && window.I18n && window.I18n.t) ? window.I18n.t(key, params) : '';
  }

  function lang() {
    return (typeof window !== 'undefined' && window.I18n && window.I18n.getLang) ? window.I18n.getLang() : 'zh';
  }

  function openForm(title, fields, opts) {
    const o = opts || {};
    const okText = o.okText || tt('ok');
    const cancelText = o.cancelText || tt('cancel');
    const validateFn = o.validate || function () { return ''; };
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const box = document.createElement('div');
      box.className = 'modal-box';
      let html = '<div class="modal-title">' + esc(title) + '</div><div class="modal-body">';
      for (const f of fields) {
        html += '<div class="field"><span class="field-label">' + esc(f.label) + (f.required ? ' <em>*</em>' : '') + '</span>';
        if (f.type === 'textarea') {
          html += '<textarea data-key="' + f.key + '" rows="3">' + esc(f.value || '') + '</textarea>';
        } else if (f.type === 'radio') {
          html += '<span class="radio-group">';
          const def = f.value != null ? f.value : (f.options[0] || {}).value;
          for (const oo of f.options) {
            const checked = String(oo.value) === String(def) ? ' checked' : '';
            html += '<label class="radio"><input type="radio" name="' + f.key + '" value="' + esc(oo.value) + '"' + checked + '>' + esc(oo.label) + '</label>';
          }
          html += '</span>';
        } else if (f.type === 'colors') {
          const cur = f.value != null ? f.value : DEFAULT_COLOR;
          html += '<div class="color-widget">';
          html += '<button type="button" class="color-toggle" style="background:' + esc(cur) + '" title="选择颜色"></button>';
          html += '<input type="hidden" data-key="' + f.key + '" value="' + esc(cur) + '">';
          const recent = getRecentColors();
          if (recent.length) {
            html += '<div class="color-recent-label">' + esc(tt('recentLabel')) + '</div><div class="color-swatches">';
            for (const c of recent) {
              html += '<button type="button" class="swatch recent" data-color="' + esc(c) + '" style="background:' + esc(c) + '" title="' + esc(c) + '"></button>';
            }
            html += '</div>';
          }
          for (const group of PRESET_GROUPS) {
            html += '<div class="color-swatches">';
            for (const c of group) {
              html += '<button type="button" class="swatch preset" data-color="' + esc(c) + '" style="background:' + esc(c) + '" title="' + esc(c) + '"></button>';
            }
            html += '</div>';
          }
          html += '<div class="color-panel" hidden>'
            + '<div class="cp-sv"><div class="cp-cursor"></div></div>'
            + '<input type="range" class="cp-hue" min="0" max="360" step="1" value="0">'
            + '<div class="cp-foot"><input type="text" class="cp-hex" maxlength="7" value="' + esc(cur) + '">'
            + '<button type="button" class="cp-close btn">确定</button></div>'
            + '</div>';
          html += '</div>';
        } else {
          html += '<input type="' + f.type + '" data-key="' + f.key + '" value="' + esc(f.value != null ? f.value : '') + '"'
            + (f.required ? ' required' : '')
            + (f.min != null ? ' min="' + f.min + '"' : '')
            + (f.max != null ? ' max="' + f.max + '"' : '')
            + ' placeholder="' + esc(f.placeholder || '') + '">';
        }
        html += '</div>';
      }
      html += '</div><p class="modal-error" hidden></p><div class="modal-actions">'
        + '<button type="button" class="btn" data-act="cancel">' + esc(cancelText) + '</button>'
        + '<button type="button" class="btn primary" data-act="ok">' + esc(okText) + '</button></div>';
      box.innerHTML = html;
      // 颜色控件：色块/光谱面板写入隐藏输入框；面板仅由颜色按钮开合，点击其他区域自动关闭。
      const colorWidgets = box.querySelectorAll('.color-widget');

      function setColorValue(widget, hex) {
        const input = widget.querySelector('input[data-key]');
        if (!input || !/^#[0-9a-fA-F]{6}$/.test(String(hex))) return;
        const low = hex.toLowerCase();
        input.value = low;
        const toggle = widget.querySelector('.color-toggle');
        if (toggle) toggle.style.background = low;
        for (const s of widget.querySelectorAll('.swatch')) {
          s.classList.toggle('selected', s.dataset.color === low);
        }
      }

      function refreshPanel(widget) {
        const panel = widget.querySelector('.color-panel');
        if (!panel || panel.hidden) return;
        const input = widget.querySelector('input[data-key]');
        const hue = panel.querySelector('.cp-hue');
        const sv = panel.querySelector('.cp-sv');
        const cursor = panel.querySelector('.cp-cursor');
        const hexInput = panel.querySelector('.cp-hex');
        const rgb = hexToRgb(input.value);
        if (!rgb) return;
        const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        hue.value = String(Math.round(hsv.h));
        sv.style.background = 'linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, hsl(' + hue.value + ',100%,50%))';
        cursor.style.left = (hsv.s * 100) + '%';
        cursor.style.top = ((1 - hsv.v) * 100) + '%';
        hexInput.value = input.value;
      }

      for (const widget of colorWidgets) {
        const panel = widget.querySelector('.color-panel');
        const input = widget.querySelector('input[data-key]');
        const toggle = widget.querySelector('.color-toggle');
        const sv = panel.querySelector('.cp-sv');
        const cursor = panel.querySelector('.cp-cursor');
        const hue = panel.querySelector('.cp-hue');
        const hexInput = panel.querySelector('.cp-hex');

        setColorValue(widget, input.value);

        for (const sw of widget.querySelectorAll('.swatch')) {
          sw.addEventListener('click', () => {
            setColorValue(widget, sw.dataset.color);
            refreshPanel(widget);
          });
        }

        function pickSv(clientX, clientY) {
          const rect = sv.getBoundingClientRect();
          const s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
          const v = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
          const rgb = hsvToRgb(Number(hue.value), s, v);
          setColorValue(widget, rgbToHex(rgb.r, rgb.g, rgb.b));
          cursor.style.left = (s * 100) + '%';
          cursor.style.top = ((1 - v) * 100) + '%';
        }
        function onSvMove(e) { pickSv(e.clientX, e.clientY); }
        function onSvUp() {
          window.removeEventListener('pointermove', onSvMove);
          window.removeEventListener('pointerup', onSvUp);
        }
        sv.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          pickSv(e.clientX, e.clientY);
          window.addEventListener('pointermove', onSvMove);
          window.addEventListener('pointerup', onSvUp);
        });

        hue.addEventListener('input', () => {
          const hsv = rgbToHsv(hexToRgb(input.value).r, hexToRgb(input.value).g, hexToRgb(input.value).b);
          const rgb = hsvToRgb(Number(hue.value), hsv.s, hsv.v);
          setColorValue(widget, rgbToHex(rgb.r, rgb.g, rgb.b));
          sv.style.background = 'linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, hsl(' + hue.value + ',100%,50%))';
          cursor.style.left = (hsv.s * 100) + '%';
          cursor.style.top = ((1 - hsv.v) * 100) + '%';
        });

        hexInput.addEventListener('change', () => {
          const v = hexInput.value.trim();
          if (/^#[0-9a-fA-F]{6}$/.test(v)) {
            setColorValue(widget, v);
            refreshPanel(widget);
          } else {
            hexInput.value = input.value;
          }
        });

        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          for (const w of colorWidgets) {
            w.querySelector('.color-panel').hidden = true;
          }
          panel.hidden = !panel.hidden;
          if (!panel.hidden) refreshPanel(widget);
        });

        panel.querySelector('.cp-close').addEventListener('click', (e) => {
          e.stopPropagation();
          panel.hidden = true;
        });
      }

      // 点击颜色控件以外的任意区域，自动收起已打开的光谱面板。
      function onDocMousedown(e) {
        if (!e.target.closest || !e.target.closest('.color-widget')) {
          for (const w of colorWidgets) {
            w.querySelector('.color-panel').hidden = true;
          }
        }
      }
      document.addEventListener('mousedown', onDocMousedown, true);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      const errorEl = box.querySelector('.modal-error');

      function collect() {
        const out = {};
        for (const f of fields) {
          if (f.type === 'radio') {
            const checked = box.querySelector('input[name="' + f.key + '"]:checked');
            out[f.key] = checked ? checked.value : '';
          } else {
            const el = box.querySelector('[data-key="' + f.key + '"]');
            out[f.key] = el ? el.value.trim() : '';
          }
        }
        return out;
      }

      function cleanup() {
        document.body.removeChild(overlay);
        document.removeEventListener('keydown', onKey, true);
        document.removeEventListener('mousedown', onDocMousedown, true);
      }

      function ok() {
        const vals = collect();
        const err = validateFn(vals);
        if (err) {
          errorEl.textContent = err;
          errorEl.hidden = false;
          return;
        }
        cleanup();
        resolve(vals);
      }

      function onKey(e) {
        if (e.key === 'Escape') {
          e.stopPropagation();
          cleanup();
          resolve(null);
        } else if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
          e.preventDefault();
          ok();
        }
      }

      box.querySelector('[data-act="ok"]').addEventListener('click', ok);
      box.querySelector('[data-act="cancel"]').addEventListener('click', () => { cleanup(); resolve(null); });
      overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(null);
        }
      });
      document.addEventListener('keydown', onKey, true);
      const first = box.querySelector('input, textarea');
      if (first) first.focus();
    });
  }

  function openAddDialog(draftCount) {
    return openForm(tt('addTitle', { n: draftCount }), [
      { key: 'name', label: tt('fieldName'), type: 'text', required: true, placeholder: tt('namePlaceholderAdd') },
      { key: 'notes', label: tt('fieldNotes'), type: 'textarea', value: '' },
      { key: 'color', label: tt('fieldColor'), type: 'colors', value: DEFAULT_COLOR }
    ], {
      okText: tt('confirmAdd'),
      validate: (v) => (v.name ? '' : tt('nameRequired'))
    });
  }

  function openNewItemDialog(defaults) {
    const d = defaults || {};
    return openForm(tt('newItemTitle'), [
      { key: 'name', label: tt('fieldName'), type: 'text', required: true, value: d.name || '', placeholder: tt('namePlaceholderNew') },
      { key: 'start', label: tt('fieldStart'), type: 'date', required: true, value: d.start || '' },
      { key: 'end', label: tt('fieldEnd'), type: 'date', required: true, value: d.end || '' },
      { key: 'interval', label: tt('fieldInterval'), type: 'number', required: true, value: d.interval != null ? d.interval : 1, min: 1, placeholder: 'N' },
      { key: 'color', label: tt('fieldColor'), type: 'colors', value: d.color || DEFAULT_COLOR }
    ], {
      okText: tt('generate'),
      validate: (v) => {
        if (!v.name) return tt('nameRequired');
        if (!v.start || !v.end) return tt('dateRequired');
        if (v.end < v.start) return tt('endBeforeStart');
        if (!/^\d+$/.test(v.interval) || Number(v.interval) < 1) return tt('intervalInvalid');
        return '';
      }
    });
  }

  function openEditDialog(item, isSeriesMember) {
    const fields = [
      { key: 'name', label: tt('fieldName'), type: 'text', required: true, value: item.name },
      { key: 'notes', label: tt('fieldNotes'), type: 'textarea', value: item.notes || '' },
      { key: 'color', label: tt('fieldColor'), type: 'colors', value: item.color || DEFAULT_COLOR }
    ];
    if (isSeriesMember) {
      fields.push({
        key: 'scope',
        label: tt('scope'),
        type: 'radio',
        value: 'single',
        options: [
          { value: 'single', label: tt('scopeSingle') },
          { value: 'series', label: tt('scopeSeries') }
        ]
      });
    }
    return openForm(tt('editTitle'), fields, {
      okText: tt('save'),
      validate: (v) => (v.name ? '' : tt('nameRequired'))
    });
  }

  function confirmDialog(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const box = document.createElement('div');
      box.className = 'modal-box';
      box.innerHTML = '<div class="modal-title">' + esc(tt('confirmTitle')) + '</div>'
        + '<p style="line-height:1.7;margin-bottom:14px">' + esc(message) + '</p>'
        + '<div class="modal-actions"><button type="button" class="btn" data-act="cancel">' + esc(tt('cancel')) + '</button>'
        + '<button type="button" class="btn danger-bg" data-act="ok">' + esc(tt('okDelete')) + '</button></div>';
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      function done(v) {
        document.body.removeChild(overlay);
        document.removeEventListener('keydown', onKey, true);
        resolve(v);
      }

      function onKey(e) {
        if (e.key === 'Escape') {
          e.stopPropagation();
          done(false);
        }
      }

      box.querySelector('[data-act="ok"]').addEventListener('click', () => done(true));
      box.querySelector('[data-act="cancel"]').addEventListener('click', () => done(false));
      overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) done(false);
      });
      document.addEventListener('keydown', onKey, true);
    });
  }

  let tooltipEl = null;

  function ensureTooltip() {
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'tooltip';
      tooltipEl.style.display = 'none';
      document.body.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  function fmtDate(iso) {
    const p = iso.split('-').map(Number);
    if (lang() === 'en') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months[p[1] - 1] + ' ' + p[2] + ', ' + p[0];
    }
    return p[0] + '年' + p[1] + '月' + p[2] + '日';
  }

  function fmtRange(start, end) {
    if (start === end) return fmtDate(start);
    const s = start.split('-').map(Number);
    const e = end.split('-').map(Number);
    if (lang() === 'en') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const ms = months[s[1] - 1];
      const me = months[e[1] - 1];
      if (s[0] === e[0] && s[1] === e[1]) return ms + ' ' + s[2] + ' – ' + e[2] + ', ' + s[0];
      if (s[0] === e[0]) return ms + ' ' + s[2] + ' – ' + me + ' ' + e[2] + ', ' + s[0];
      return ms + ' ' + s[2] + ', ' + s[0] + ' – ' + me + ' ' + e[2] + ', ' + e[0];
    }
    if (s[0] === e[0] && s[1] === e[1]) return s[0] + '年' + s[1] + '月' + s[2] + '日 – ' + e[2] + '日';
    if (s[0] === e[0]) return s[0] + '年' + s[1] + '月' + s[2] + '日 – ' + e[1] + '月' + e[2] + '日';
    return fmtDate(start) + ' – ' + fmtDate(end);
  }

  function showTooltip(bar, x, y) {
    const el = ensureTooltip();
    let html = '<div class="tt-name">' + esc(bar.name || '（未命名）') + '</div>';
    if (bar.notes) html += '<div class="tt-notes">' + esc(bar.notes) + '</div>';
    html += '<div class="tt-dates">' + fmtRange(bar.start, bar.end) + '</div>';
    el.innerHTML = html;
    el.style.display = 'block';
    moveTooltip(x, y);
  }

  function moveTooltip(x, y) {
    const el = ensureTooltip();
    if (el.style.display === 'none') return;
    const r = el.getBoundingClientRect();
    let left = x + 14;
    let top = y + 16;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > window.innerHeight - 8) top = y - r.height - 12;
    el.style.left = Math.max(8, left) + 'px';
    el.style.top = Math.max(8, top) + 'px';
  }

  function hideTooltip() {
    if (tooltipEl) tooltipEl.style.display = 'none';
  }

  function isTooltipVisible() {
    return !!tooltipEl && tooltipEl.style.display !== 'none';
  }

  let menuEl = null;

  function closeContextMenu() {
    if (menuEl) {
      menuEl.remove();
      menuEl = null;
    }
    document.removeEventListener('mousedown', onMenuOutside, true);
    document.removeEventListener('keydown', onMenuKey, true);
  }

  function onMenuOutside(e) {
    if (menuEl && !menuEl.contains(e.target)) closeContextMenu();
  }

  function onMenuKey(e) {
    if (e.key === 'Escape') closeContextMenu();
  }

  function showContextMenu(x, y, actions) {
    closeContextMenu();
    menuEl = document.createElement('div');
    menuEl.className = 'context-menu';
    for (const a of actions) {
      const item = document.createElement('div');
      item.className = 'context-item' + (a.danger ? ' danger' : '');
      item.textContent = a.label;
      item.addEventListener('click', () => {
        closeContextMenu();
        a.onClick();
      });
      menuEl.appendChild(item);
    }
    document.body.appendChild(menuEl);
    const r = menuEl.getBoundingClientRect();
    menuEl.style.left = Math.min(x, Math.max(8, window.innerWidth - r.width - 8)) + 'px';
    menuEl.style.top = Math.min(y, Math.max(8, window.innerHeight - r.height - 8)) + 'px';
    setTimeout(() => {
      document.addEventListener('mousedown', onMenuOutside, true);
      document.addEventListener('keydown', onMenuKey, true);
    }, 0);
  }

  function closeAll() {
    closeContextMenu();
    hideTooltip();
  }

  return {
    DEFAULT_COLOR,
    PRESET_COLORS,
    getRecentColors,
    setRecentColors,
    recordRecentColor,
    openAddDialog,
    openNewItemDialog,
    openEditDialog,
    confirmDialog,
    showTooltip,
    moveTooltip,
    hideTooltip,
    isTooltipVisible,
    showContextMenu,
    closeAll
  };
});
