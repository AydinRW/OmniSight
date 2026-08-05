'use strict';

const test = require('node:test');
const assert = require('node:assert');
const u = require('../renderer/date-utils.js');

test('weekday labels start with Monday', () => {
  assert.deepStrictEqual(u.WEEKDAY_LABELS.slice(0, 3), ['周一', '周二', '周三']);
});

test('TOTAL_COLS is 37 (five full weeks plus Mon/Tue)', () => {
  assert.equal(u.TOTAL_COLS, 37);
});

test('fixed 37-column grid fits every month of any year', () => {
  for (const year of [2024, 2026, 2028, 2031]) {
    for (let m = 1; m <= 12; m++) {
      const days = u.daysInMonth(year, m);
      const first = new Date(year, m - 1, 1);
      const last = new Date(year, m - 1, days);
      const firstCol = u.columnForDate(first);
      const lastCol = u.columnForDate(last);
      assert.ok(firstCol >= 0 && firstCol <= 6, year + '-' + m + ' first col');
      assert.ok(lastCol >= 0 && lastCol <= 36, year + '-' + m + ' last col ' + lastCol);
    }
  }
});

test('column weekday matches the fixed header cycle', () => {
  for (const d of [new Date(2026, 0, 1), new Date(2026, 7, 1), new Date(2026, 11, 31)]) {
    assert.equal(u.columnForDate(d) % 7, u.weekdayIndexMon(d));
  }
});

test('monthDateAt round-trips with columnForDate', () => {
  const d = new Date(2026, 7, 15);
  const col = u.columnForDate(d);
  assert.equal(u.formatISO(u.monthDateAt(2026, 8, col)), '2026-08-15');
});

test('recurringDates includes boundaries and honors interval', () => {
  assert.deepStrictEqual(
    u.recurringDates('2026-01-01', '2026-01-10', 3),
    ['2026-01-01', '2026-01-04', '2026-01-07', '2026-01-10']
  );
  assert.equal(u.recurringDates('2026-02-01', '2026-02-28', 1).length, 28);
});

test('recurringDates crosses year boundary', () => {
  assert.deepStrictEqual(
    u.recurringDates('2025-12-28', '2026-01-05', 7),
    ['2025-12-28', '2026-01-04']
  );
});

test('addDays and diffDays handle leap day', () => {
  assert.equal(u.addDaysISO('2024-02-28', 1), '2024-02-29');
  assert.equal(u.diffDays('2024-02-28', '2024-03-01'), 2);
  assert.equal(u.diffDays('2024-03-01', '2024-02-28'), -2);
});

test('daysInMonth and isLeapYear', () => {
  assert.equal(u.daysInMonth(2024, 2), 29);
  assert.equal(u.daysInMonth(2026, 2), 28);
  assert.equal(u.isLeapYear(2024), true);
  assert.equal(u.isLeapYear(2026), false);
});

test('parseISO / formatISO round-trip and invalid dates rejected', () => {
  assert.equal(u.formatISO(u.parseISO('2026-08-05')), '2026-08-05');
  assert.throws(() => u.parseISO('2026-13-01'));
  assert.throws(() => u.parseISO('2026-02-30'));
});
