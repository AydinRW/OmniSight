(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DateUtils = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  // 固定列数：五个完整星期（35 列）+ 周一、周二（2 列）= 37 列，12 个月复用同一组列。
  const TOTAL_COLS = 37;
  const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

  function parseISO(iso) {
    const m = ISO_RE.exec(String(iso));
    if (!m) throw new Error('Invalid date: ' + iso);
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const date = new Date(y, mo - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) {
      throw new Error('Invalid date: ' + iso);
    }
    return date;
  }

  function formatISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function addDays(date, n) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() + n);
    return d;
  }

  function addDaysISO(iso, n) {
    return formatISO(addDays(parseISO(iso), n));
  }

  function diffDays(aISO, bISO) {
    return Math.round((parseISO(bISO) - parseISO(aISO)) / 86400000);
  }

  function isLeapYear(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  }

  function daysInMonth(y, m) {
    return new Date(y, m, 0).getDate();
  }

  // 0 = 周一 ... 6 = 周日
  function weekdayIndexMon(date) {
    return (date.getDay() + 6) % 7;
  }

  // 固定 37 列布局：列号 = 当月 1 日所在列 + (日 - 1)，范围恒在 0..36。
  function columnForDate(date) {
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    return weekdayIndexMon(first) + date.getDate() - 1;
  }

  // 给定年份、月份和列号，返回该格子的日期（可能落在月外，由调用方判断有效性）。
  function monthDateAt(year, month, col) {
    const first = new Date(year, month - 1, 1);
    return new Date(year, month - 1, col - weekdayIndexMon(first) + 1);
  }

  function recurringDates(startISO, endISO, interval) {
    const out = [];
    const end = parseISO(endISO);
    let d = parseISO(startISO);
    while (d <= end) {
      out.push(formatISO(d));
      d = addDays(d, interval);
    }
    return out;
  }

  function todayISO() {
    return formatISO(new Date());
  }

  function makeId() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  return {
    WEEKDAY_LABELS,
    MONTH_LABELS,
    TOTAL_COLS,
    parseISO,
    formatISO,
    addDays,
    addDaysISO,
    diffDays,
    isLeapYear,
    daysInMonth,
    weekdayIndexMon,
    columnForDate,
    monthDateAt,
    recurringDates,
    todayISO,
    makeId
  };
});
