// Spuštění: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectRegion, REGIONS } from '../js/regions.js';
import { EXERCISES, SYMPTOMS, selectExercises, redFlags } from '../js/exercises.js';

const cases = [
  [[0, 1.6, 0.08], 'hlava'],
  [[0, 1.42, -0.05], 'krk'],
  [[0.07, 1.36, -0.07], 'krk'],
  [[0.19, 1.36, 0.0], 'rameno'],
  [[-0.2, 1.2, 0.03], 'rameno'],
  [[0.21, 1.06, -0.05], 'loket'],
  [[0.25, 0.82, 0.04], 'zapesti'],
  [[0.27, 0.72, 0.08], 'zapesti'],
  [[0.06, 1.22, 0.12], 'hrudnik'],
  [[0.05, 1.2, -0.11], 'horni_zada'],
  [[0.03, 0.98, -0.08], 'bedra'],
  [[0.0, 0.88, -0.1], 'bedra'],
  [[0.03, 1.0, 0.13], 'bricho'],
  [[0.08, 0.82, -0.12], 'kycel'],
  [[0.15, 0.82, 0.0], 'kycel'],
  [[0.075, 0.43, 0.06], 'koleno'],
  [[0.08, 0.6, 0.07], 'koleno'],
  [[0.075, 0.25, -0.06], 'kotnik'],
  [[0.08, 0.03, 0.1], 'kotnik'],
];

test('detectRegion určí správné oblasti', () => {
  for (const [p, expected] of cases) {
    assert.equal(detectRegion(p).region, expected, `bod ${p.join(', ')}`);
  }
});

test('detectRegion určí stranu', () => {
  assert.equal(detectRegion([0.2, 1.42, 0]).side, 'leva');
  assert.equal(detectRegion([-0.2, 1.42, 0]).side, 'prava');
  assert.equal(detectRegion([0, 1.1, -0.1]).side, 'stred');
  assert.equal(detectRegion([-0.08, 0.6, 0.07]).side, 'prava');
});

test('každá oblast má cviky pro bolest i tlak', () => {
  for (const r of Object.keys(REGIONS)) {
    assert.ok(selectExercises(r, 'bolest', 3).length > 0, `${r} bolest`);
    assert.ok(selectExercises(r, 'tlak', 3).length > 0, `${r} tlak`);
  }
});

test('brnění u končetin a páteře má nervové cviky', () => {
  for (const r of ['krk', 'loket', 'zapesti', 'bedra', 'kycel', 'koleno', 'kotnik']) {
    assert.ok(selectExercises(r, 'brneni', 3).length > 0, r);
  }
});

test('silná bolest vrací jen šetrné cviky', () => {
  for (const r of Object.keys(REGIONS)) {
    for (const s of Object.keys(SYMPTOMS)) {
      assert.ok(selectExercises(r, s, 9).every((e) => e.gentle));
    }
  }
});

test('data cviků jsou úplná a ID unikátní', () => {
  const ids = new Set();
  for (const e of EXERCISES) {
    assert.ok(!ids.has(e.id), `duplicitní ${e.id}`);
    ids.add(e.id);
    assert.ok(e.name && e.dose && e.steps.length >= 2, e.id);
    for (const r of e.regions) assert.ok(REGIONS[r], `${e.id}: neznámá oblast ${r}`);
    for (const s of e.symptoms) assert.ok(SYMPTOMS[s], `${e.id}: neznámý symptom ${s}`);
  }
});

test('red flags existují pro každou oblast', () => {
  for (const r of Object.keys(REGIONS)) assert.ok(redFlags(r).length >= 4);
});
