// Spuštění: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectRegion, REGIONS } from '../js/regions.js';
import { EXERCISES, SYMPTOMS, selectExercises, redFlags } from '../js/exercises.js';

const cases = [
  [[0, 1.68, 0.1], 'hlava'],
  [[0, 1.5, -0.05], 'krk'],
  [[0.08, 1.43, -0.06], 'krk'],
  [[0.2, 1.42, 0.03], 'rameno'],
  [[-0.23, 1.28, 0.04], 'rameno'],
  [[0.26, 1.12, -0.04], 'loket'],
  [[0.3, 0.9, 0.02], 'zapesti'],
  [[0.33, 0.78, 0.01], 'zapesti'],
  [[0.06, 1.3, 0.1], 'hrudnik'],
  [[0.05, 1.28, -0.1], 'horni_zada'],
  [[0.03, 1.05, -0.09], 'bedra'],
  [[0.0, 0.95, -0.11], 'bedra'],
  [[0.03, 1.05, 0.09], 'bricho'],
  [[0.08, 0.9, -0.11], 'kycel'],
  [[0.15, 0.93, 0.0], 'kycel'],
  [[0.1, 0.52, 0.06], 'koleno'],
  [[0.1, 0.65, 0.07], 'koleno'],
  [[0.1, 0.3, -0.05], 'kotnik'],
  [[0.11, 0.03, 0.12], 'kotnik'],
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
