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

// ---------------------------------------------------------------------------
// Dermatomy a nervy
// ---------------------------------------------------------------------------
import { dermatomeAt, DERMATOME_ORDER } from '../js/dermatomes.js';
import { FINGERS, TOES, LM } from '../js/landmarks.js';
import { NERVE_INFO, spinalLevels } from '../js/nerves.js';

test('dermatomy typických míst', () => {
  const tip = (f) => f.tip;
  assert.equal(dermatomeAt(tip(FINGERS.left[0])).seg, 'C6');      // palec
  assert.equal(dermatomeAt(tip(FINGERS.left[2])).seg, 'C7');      // prostředník
  assert.equal(dermatomeAt(tip(FINGERS.right[4])).seg, 'C8');     // malík pravé ruky
  assert.equal(dermatomeAt([0.03, 0.99, 0.13]).seg, 'Th10');       // pupek
  assert.equal(dermatomeAt([0.0, 1.22, 0.13]).seg, 'Th4');         // výška bradavek
  const t2 = TOES.left[2];
  assert.equal(dermatomeAt([t2.base[0], t2.base[1] + 0.012, t2.base[2]]).seg, 'L5');  // nárt
  const malLat = LM.malleolus_lat_left;
  assert.equal(dermatomeAt([malLat[0] + 0.03, 0.03, malLat[2] + 0.05]).seg, 'S1');  // zevní hrana nohy
  assert.equal(dermatomeAt([0.03, 0.25, 0.0]).seg, 'L4');          // vnitřní strana bérce
  assert.equal(dermatomeAt([0.14, 0.62, 0.02]).nerve, 'latFemCut'); // zevní strana stehna
});

test('dermatom každého bodu je ze známého seznamu a nerv existuje', () => {
  for (let y = 0.02; y < 1.65; y += 0.03) {
    for (let x = -0.3; x <= 0.3; x += 0.05) {
      for (const z of [-0.1, 0, 0.1]) {
        const d = dermatomeAt([x, y, z]);
        assert.ok(DERMATOME_ORDER.includes(d.seg), `${d.seg} @ ${x},${y},${z}`);
        if (d.nerve) assert.ok(NERVE_INFO[d.nerve], d.nerve);
      }
    }
  }
});

test('míšní nervy C1–S4 (29 párů) seřazené shora dolů', () => {
  const lv = spinalLevels();
  assert.equal(lv.length, 8 + 12 + 5 + 4);
  for (let i = 1; i < lv.length; i++) assert.ok(lv[i].y < lv[i - 1].y, `${lv[i].seg} pod ${lv[i - 1].seg}`);
});

// ---------------------------------------------------------------------------
// Animace cviků
// ---------------------------------------------------------------------------
import { ANIMS, BASES } from '../js/exercise-anims.js';

const POSE_KEYS = new Set(['root', 'breath', 'lumbar', 'thoracic', 'neck', 'head', 'lScap', 'rScap', 'lShoulder', 'rShoulder',
  'lElbow', 'rElbow', 'lWrist', 'rWrist', 'lFingers', 'rFingers', 'lHip', 'rHip', 'lKnee', 'rKnee', 'lAnkle', 'rAnkle']);

test('každý cvik má animaci se známou výchozí polohou a klouby', () => {
  for (const e of EXERCISES) {
    const a = ANIMS[e.id];
    assert.ok(a, `chybí animace ${e.id}`);
    assert.ok(BASES[a.base], `${e.id}: neznámá poloha ${a.base}`);
    assert.ok(a.keys.length >= 2, `${e.id}: málo klíčových póz`);
    for (const k of a.keys) for (const j of Object.keys(k.p)) assert.ok(POSE_KEYS.has(j), `${e.id}: neznámý kloub ${j}`);
  }
});
