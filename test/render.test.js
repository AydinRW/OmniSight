'use strict';

const test = require('node:test');
const assert = require('node:assert');
const CalendarRenderer = require('../renderer/render.js');
const assignSlots = CalendarRenderer.assignSlots;

test('slots ordered by start then id within a row', () => {
  const bars = [
    { id: 'b', start: '2026-01-05', end: '2026-01-15' },
    { id: 'a', start: '2026-01-01', end: '2026-01-10' }
  ];
  const slots = assignSlots(bars, '2026-01-01', '2026-01-31');
  assert.equal(slots.get('a'), 0);
  assert.equal(slots.get('b'), 1);
});

test('bar outside the row gets no slot', () => {
  const slots = assignSlots([{ id: 'x', start: '2026-02-01', end: '2026-02-05' }], '2026-01-01', '2026-01-31');
  assert.equal(slots.has('x'), false);
});

test('cross-month bar gets a slot in both rows', () => {
  const bars = [{ id: 'm', start: '2026-01-30', end: '2026-02-03' }];
  assert.equal(assignSlots(bars, '2026-01-01', '2026-01-31').get('m'), 0);
  assert.equal(assignSlots(bars, '2026-02-01', '2026-02-28').get('m'), 0);
});

test('same-row continuity: overlapping bars keep consistent order', () => {
  const bars = [
    { id: 'a', start: '2026-01-01', end: '2026-01-10' },
    { id: 'b', start: '2026-01-05', end: '2026-01-20' },
    { id: 'c', start: '2026-01-08', end: '2026-01-25' }
  ];
  const slots = assignSlots(bars, '2026-01-01', '2026-01-31');
  assert.deepStrictEqual([slots.get('a'), slots.get('b'), slots.get('c')], [0, 1, 2]);
});
