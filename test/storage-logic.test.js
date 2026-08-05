'use strict';

const test = require('node:test');
const assert = require('node:assert');
const s = require('../renderer/storage-logic.js');

test('overlapYear checks start/end year range', () => {
  assert.equal(s.overlapYear({ start: '2026-01-01', end: '2026-12-31' }, 2026), true);
  assert.equal(s.overlapYear({ start: '2025-12-30', end: '2026-01-05' }, 2026), true);
  assert.equal(s.overlapYear({ start: '2025-12-01', end: '2025-12-31' }, 2026), false);
  assert.equal(s.overlapYear({ start: '2026-12-30', end: '2027-01-03' }, 2027), true);
});

test('groupItemsByYear splits by start year', () => {
  const groups = s.groupItemsByYear([
    { id: 'a', start: '2026-01-01', end: '2026-01-02' },
    { id: 'b', start: '2025-12-30', end: '2026-01-05' },
    { id: 'c', start: '2026-12-31', end: '2027-01-02' }
  ]);
  assert.deepStrictEqual(Array.from(groups.keys()).sort(), [2025, 2026]);
  assert.deepStrictEqual(groups.get(2025).map((i) => i.id), ['b']);
  assert.deepStrictEqual(groups.get(2026).map((i) => i.id), ['a', 'c']);
});

test('mergeYearData includes cross-year tail and its series only when members present', () => {
  const current = { items: [{ id: 'a', start: '2026-01-01', end: '2026-12-31', seriesId: null }], series: [] };
  const prev = {
    items: [
      { id: 'x', start: '2025-12-30', end: '2026-01-05', seriesId: 'sx' },
      { id: 'y', start: '2025-12-01', end: '2025-12-31', seriesId: null }
    ],
    series: [
      { id: 'sx', start: '2025-12-30', end: '2026-01-05', intervalDays: 7 },
      { id: 'unused', start: '2025-01-01', end: '2025-12-31', intervalDays: 1 }
    ]
  };
  const merged = s.mergeYearData(2026, current, prev);
  assert.equal(merged.items.length, 2);
  assert.ok(merged.items.some((i) => i.id === 'x'));
  assert.ok(!merged.items.some((i) => i.id === 'y'));
  assert.deepStrictEqual(merged.series.map((x) => x.id), ['sx']);
});

test('normalizeItem fills defaults and keeps seriesId', () => {
  const it = s.normalizeItem({ id: 'i1', name: '晨会', start: '2026-01-01', end: '2026-01-01' });
  assert.equal(it.notes, '');
  assert.equal(it.color, '#3b82f6');
  assert.equal(it.seriesId, null);
  const it2 = s.normalizeItem({ id: 'i2', name: 'x', notes: 'n', color: '#ff0000', start: '2026-01-01', end: '2026-01-02', seriesId: 's1' });
  assert.equal(it2.color, '#ff0000');
  assert.equal(it2.seriesId, 's1');
});
