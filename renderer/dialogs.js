(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CalendarDialogs = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULT_COLOR = '#3b82f6';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function openForm(title, fields, opts) {
    const o = opts || {};
    const okText = o.okText || '确定';
    const cancelText = o.cancelText || '取消';
    const validateFn = o.validate || function () { return ''; };
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const box = document.createElement('div');
      box.className = 'modal-box';
      let html = '<div class="modal-title">' + esc(title) + '</div><div class="modal-body">';
      for (const f of fields) {
        html += '<label class="field"><span class="field-label">' + esc(f.label) + (f.required ? ' <em>*</em>' : '') + '</span>';
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
        } else {
          html += '<input type="' + f.type + '" data-key="' + f.key + '" value="' + esc(f.value != null ? f.value : '') + '"'
            + (f.required ? ' required' : '')
            + (f.min != null ? ' min="' + f.min + '"' : '')
            + (f.max != null ? ' max="' + f.max + '"' : '')
            + ' placeholder="' + esc(f.placeholder || '') + '">';
        }
        html += '</label>';
      }
      html += '</div><p class="modal-error" hidden></p><div class="modal-actions">'
        + '<button type="button" class="btn" data-act="cancel">' + esc(cancelText) + '</button>'
        + '<button type="button" class="btn primary" data-act="ok">' + esc(okText) + '</button></div>';
      box.innerHTML = html;
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
    return openForm('添加事项（' + draftCount + ' 条草稿）', [
      { key: 'name', label: '事项名称', type: 'text', required: true, placeholder: '例如：项目周报' },
      { key: 'notes', label: '备注', type: 'textarea', value: '' },
      { key: 'color', label: '横条颜色', type: 'color', value: DEFAULT_COLOR }
    ], {
      okText: '确认添加',
      validate: (v) => (v.name ? '' : '请填写事项名称')
    });
  }

  function openNewItemDialog(defaults) {
    const d = defaults || {};
    return openForm('新建周期事项', [
      { key: 'name', label: '事项名称', type: 'text', required: true, value: d.name || '', placeholder: '例如：每日晨会' },
      { key: 'start', label: '起始年月日', type: 'date', required: true, value: d.start || '' },
      { key: 'end', label: '结束年月日', type: 'date', required: true, value: d.end || '' },
      { key: 'interval', label: '重复间隔天数', type: 'number', required: true, value: d.interval != null ? d.interval : 1, min: 1, placeholder: 'N' }
    ], {
      okText: '生成事项',
      validate: (v) => {
        if (!v.name) return '请填写事项名称';
        if (!v.start || !v.end) return '请填写起始/结束日期';
        if (v.end < v.start) return '结束日期不能早于起始日期';
        if (!/^\d+$/.test(v.interval) || Number(v.interval) < 1) return '重复间隔天数须为大于等于 1 的整数';
        return '';
      }
    });
  }

  function openEditDialog(item, isSeriesMember) {
    const fields = [
      { key: 'name', label: '事项名称', type: 'text', required: true, value: item.name },
      { key: 'notes', label: '备注', type: 'textarea', value: item.notes || '' },
      { key: 'color', label: '横条颜色', type: 'color', value: item.color || DEFAULT_COLOR }
    ];
    if (isSeriesMember) {
      fields.push({
        key: 'scope',
        label: '修改范围',
        type: 'radio',
        value: 'single',
        options: [
          { value: 'single', label: '仅此条' },
          { value: 'series', label: '整条周期序列' }
        ]
      });
    }
    return openForm('编辑事项', fields, {
      okText: '保存',
      validate: (v) => (v.name ? '' : '请填写事项名称')
    });
  }

  function confirmDialog(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const box = document.createElement('div');
      box.className = 'modal-box';
      box.innerHTML = '<div class="modal-title">确认操作</div>'
        + '<p style="line-height:1.7;margin-bottom:14px">' + esc(message) + '</p>'
        + '<div class="modal-actions"><button type="button" class="btn" data-act="cancel">取消</button>'
        + '<button type="button" class="btn danger-bg" data-act="ok">确定删除</button></div>';
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
    return p[0] + '年' + p[1] + '月' + p[2] + '日';
  }

  function fmtRange(start, end) {
    if (start === end) return fmtDate(start);
    const s = start.split('-').map(Number);
    const e = end.split('-').map(Number);
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
