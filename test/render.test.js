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

test('non-overlapping single-day items on different dates share slot 0', () => {
  const bars = [
    { id: 'a', start: '2026-04-06', end: '2026-04-06' },
    { id: 'b', start: '2026-04-10', end: '2026-04-10' }
  ];
  const slots = assignSlots(bars, '2026-04-01', '2026-04-30');
  assert.equal(slots.get('a'), 0);
  assert.equal(slots.get('b'), 0);
});

test('lane is reused after a bar ends', () => {
  const bars = [
    { id: 'a', start: '2026-04-01', end: '2026-04-03' },
    { id: 'b', start: '2026-04-04', end: '2026-04-06' },
    { id: 'c', start: '2026-04-07', end: '2026-04-09' }
  ];
  const slots = assignSlots(bars, '2026-04-01', '2026-04-30');
  assert.deepStrictEqual([slots.get('a'), slots.get('b'), slots.get('c')], [0, 0, 0]);
});

test('multi-day bar keeps one lane across its whole span when not overlapped', () => {
  const bars = [
    { id: 'm', start: '2026-04-06', end: '2026-04-09' },
    { id: 'x', start: '2026-04-04', end: '2026-04-05' },
    { id: 'y', start: '2026-04-10', end: '2026-04-11' }
  ];
  const slots = assignSlots(bars, '2026-04-01', '2026-04-30');
  assert.deepStrictEqual([slots.get('x'), slots.get('m'), slots.get('y')], [0, 0, 0]);
});

test('overlapping bars stack into separate lanes', () => {
  const bars = [
    { id: 'multi', start: '2026-04-05', end: '2026-04-08' },
    { id: 'single', start: '2026-04-06', end: '2026-04-06' }
  ];
  const slots = assignSlots(bars, '2026-04-01', '2026-04-30');
  assert.equal(slots.get('multi'), 0);
  assert.equal(slots.get('single'), 1);
});

test('isLightColor picks black text on light bars and white on dark bars', () => {
  assert.equal(CalendarRenderer.isLightColor('#ffffff'), true);
  assert.equal(CalendarRenderer.isLightColor('#f5d442'), true);
  assert.equal(CalendarRenderer.isLightColor('#000000'), false);
  assert.equal(CalendarRenderer.isLightColor('#3b82f6'), false);
  assert.equal(CalendarRenderer.isLightColor('#9c5b4e'), false);
});
