// Realistická postava pro animace cviků.
//
// Kůže z BodyParts3D (models/figure.glb, viz tools/build_figure.py) se rozpohybuje
// kostrou postavenou z orientačních bodů skutečných kostí (js/landmarks.js).
// Váhy kůže se počítají při načtení podle vzdálenosti od kostí s plynulými
// přechody v kloubech. Oblečení, vlasy a obuv jsou barvy vrcholů.
// Rozhraní (apply, markerPos, minY, setFocus, joints, markers, root) odpovídá
// schematické figuríně v js/mannequin.js, takže animace jsou společné.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LM, SPINE, FINGERS } from './landmarks.js';

const D = THREE.MathUtils.degToRad;
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);
const qa = (axis, deg) => new THREE.Quaternion().setFromAxisAngle(axis, D(deg));
const SP = Object.fromEntries(SPINE);
const CUT_SEAMS = typeof window !== 'undefined' && window.CUT_SEAMS !== undefined ? window.CUT_SEAMS : true;
const _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _t = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const avg = (pts) => pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length, s[2] + p[2] / pts.length], [0, 0, 0]);

const COLORS = {
  skin: new THREE.Color(0xd9a27f), shirt: new THREE.Color(0x2a8c82), shorts: new THREE.Color(0x2b3a55),
  hair: new THREE.Color(0x3a2a1f), shoe: new THREE.Color(0x3d4650), sole: new THREE.Color(0xf2f2f2),
  lips: new THREE.Color(0xb3685f), eye: new THREE.Color(0xf4f1ec), iris: new THREE.Color(0x5a3d26), pupil: new THREE.Color(0x111111),
  focus: new THREE.Color(0xf05a3c),
};

// ---------------------------------------------------------------------------
// Kostra v klidové (vazební) poloze – souřadnice modelu
// ---------------------------------------------------------------------------
function skeletonDefs() {
  const hipC = lerp(LM.hip_left, LM.hip_right, 0.5);
  const torsoZ = 0.015;    // osa trupu pro výpočet vah
  const spineZ = -0.02;    // osa otáčení páteře
  const defs = [];
  const add = (name, parent, head, tail, r, opts = {}) => defs.push({ name, parent, head, tail, r, ...opts });

  add('pelvis', null, [0, hipC[1], spineZ], [0, SP.L5[1], spineZ], 0.14, { axis: [[0, hipC[1] - 0.02, torsoZ], [0, SP.L5[1], torsoZ]], zScale: 0.8, blendH: 0 });
  add('lumbar', 'pelvis', [0, SP.L5[1], spineZ], [0, SP.Th12[1], spineZ], 0.14, { axis: [[0, SP.L5[1], torsoZ], [0, SP.Th12[1], torsoZ]], zScale: 0.8, blendH: 0.05 });
  add('thoracic', 'lumbar', [0, SP.Th12[1], spineZ], [0, SP.C7[1], spineZ], 0.15, { axis: [[0, SP.Th12[1], torsoZ], [0, SP.C7[1] - 0.03, torsoZ]], zScale: 0.75, blendH: 0.06 });
  add('neck', 'thoracic', [0, SP.C7[1], SP.C7[2]], [0, SP.C1[1], SP.C1[2]], 0.055, { blendH: 0.03 });
  add('head', 'neck', [0, SP.C1[1], SP.C1[2]], [0, LM.head_top[1], 0.01], 0.1, { axis: [[0, SP.C1[1] + 0.03, 0.02], [0, LM.head_top[1] - 0.06, 0.005]], blendH: 0.025 });
  add('belly', 'lumbar', [0, SP.L5[1], spineZ], [0, SP.Th12[1], spineZ], 0.0, { virtual: true });

  for (const [p, side] of [['l', 'left'], ['r', 'right']]) {
    const L = (k) => LM[`${k}_${side}`];
    const F = FINGERS[side];
    const knuckles = avg(F.slice(1).map((f) => f.base));
    add(`${p}Scap`, 'thoracic', L('clavicle_med'), L('shoulder'), 0.05, { blendH: 0.04, axis: [lerp(L('clavicle_med'), L('shoulder'), 0.35), L('shoulder')] });
    add(`${p}UpperArm`, `${p}Scap`, L('shoulder'), L('elbow'), 0.046, { blendH: 0.045 });
    add(`${p}Forearm`, `${p}UpperArm`, L('elbow'), L('wrist'), 0.038, { blendH: 0.03 });
    add(`${p}Hand`, `${p}Forearm`, L('wrist'), knuckles, 0.03, { blendH: 0.02 });
    F.forEach((f, i) => {
      const mid = lerp(f.base, f.tip, 0.48);
      if (i === 0) {
        add(`${p}Thumb`, `${p}Hand`, lerp(L('wrist'), f.base, 0.45), f.tip, 0.011, { blendH: 0.012, finger: true });
      } else {
        add(`${p}Finger${i}a`, `${p}Hand`, f.base, mid, 0.0095, { blendH: 0.008, finger: true });
        add(`${p}Finger${i}b`, `${p}Finger${i}a`, mid, f.tip, 0.0085, { blendH: 0.007, finger: true });
      }
    });
    add(`${p}Thigh`, 'pelvis', L('hip'), L('knee'), 0.075, { blendH: 0.05, blendFront: 0.012 });
    add(`${p}Shin`, `${p}Thigh`, L('knee'), L('ankle'), 0.05, { blendH: 0.04 });
    add(`${p}Foot`, `${p}Shin`, L('ankle'), L('toe'), 0.042, { blendH: 0.025, axis: [[L('ankle')[0], 0.035, L('heel')[2]], L('toe')] });
  }
  return defs;
}

function segParam(p, a, b, zScale = 1) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...ab);
  let t = ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / (len * len);
  const s = t * len;
  t = Math.max(0, Math.min(1, t));
  const c = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
  const d = [p[0] - c[0], p[1] - c[1], (p[2] - c[2]) / zScale];
  return { dist: Math.hypot(...d), s, len, c };
}

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/** Leží vrchol uvnitř válce paže (pod podpažím)? Vrací 'arm', 'trunk' nebo null. */
function armpitSide(p) {
  if (p[1] < 0.98 || p[1] > LM.shoulder_left[1] - 0.085) return null;
  const sd = p[0] > 0 ? 'left' : 'right';
  const sh = LM[`shoulder_${sd}`], el = LM[`elbow_${sd}`];
  const sp = segParam(p, sh, el);
  if (sp.s < 0.02 || sp.s > sp.len) return null;
  if (Math.abs(p[0]) > Math.abs(sp.c[0]) + 0.01) return null;   // zevní strana paže – bez sporu paže
  return sp.dist < 0.047 ? 'arm' : sp.dist < 0.09 ? 'trunk' : null;
}

/** Váhy pro jeden vrchol: [[index kosti, váha], ...] */
function vertexWeights(p, defs, index, handNear, nrm) {
  let best = null;
  const ax = Math.abs(p[0]);
  // Paže přiléhá k boku trupu: rozhodne směr normály (vnitřní strana paže míří k ose těla).
  // V zóně dotyku paže a boku rozhoduje nejdřív směr normály: vnitřní plocha paže
  // míří k ose těla, boční stěna trupu od ní. Teprve nejasné plochy podle vzdálenosti.
  // Paže se v klidové poloze dotýká boku i stehna. Rozhodne, zda je plocha otočená
  // od osy paže (= povrch paže), nebo k ní (= povrch trupu/stehna, který se paže dotýká).
  let side = null;
  if (p[1] > 0.6 && p[1] < LM.shoulder_left[1] - 0.05 && ax > 0.09) {
    const sd = p[0] > 0 ? 'left' : 'right';
    const segs = [[LM[`shoulder_${sd}`], LM[`elbow_${sd}`], 0.046], [LM[`elbow_${sd}`], LM[`wrist_${sd}`], 0.038], [LM[`wrist_${sd}`], LM[`hand_${sd}`], 0.035],
      ...FINGERS[sd].map((f) => [f.base, f.tip, 0.012]), ...FINGERS[sd].map((f) => [LM[`wrist_${sd}`], f.base, 0.02])];
    let bestD = Infinity, dot = 0;
    for (const [a, b, r] of segs) {
      const sp = segParam(p, a, b);
      if (sp.dist / r < bestD) {
        bestD = sp.dist / r;
        const rv = [p[0] - sp.c[0], p[1] - sp.c[1], p[2] - sp.c[2]];
        const l = Math.hypot(...rv) || 1;
        dot = (rv[0] * nrm[0] + rv[1] * nrm[1] + rv[2] * nrm[2]) / l;
      }
    }
    if (bestD < 1.9) side = dot > 0 ? 'arm' : 'trunk';
    // stehno ani bok nesahají tak daleko do strany – tady je vždy ruka
    if (ax > 0.19 && p[1] < 1.0) side = 'arm';
  }
  for (const d of defs) {
    if (d.virtual || (d.finger && !handNear)) continue;
    // ruce visí u boků: oddělit je od trupu a stehen podle vzdálenosti od osy těla
    const trunk = d.name === 'pelvis' || d.name === 'lumbar' || d.name === 'thoracic';
    const arm = /Forearm|Hand|Thumb|Finger/.test(d.name);
    const leg = /Thigh|Shin|Foot/.test(d.name);
    const split = p[1] < 1.0 ? 0.205 : 0.178;   // hranice mezi rukou a bokem v klidové poloze
    const upper = /UpperArm|Scap/.test(d.name);
    if (side === 'arm' && !(arm || upper)) continue;
    if (side === 'trunk' && (arm || upper)) continue;
    if (!side && !handNear && p[1] < 1.15 && (((trunk || leg) && ax > split) || (arm && ax < split))) continue;
    // stehno začíná u hýžďové rýhy – pánev nesmí zasahovat do stehen
    if (d.name === 'pelvis' && p[1] < LM.hip_left[1] - 0.075 && ax > 0.05) continue;
    const [a, b] = d.axis || [d.head, d.tail];
    const sp = segParam(p, a, b, d.zScale || 1);
    const score = sp.dist / d.r;
    if (!best || score < best.score) best = { d, score, ...segParam(p, d.head, d.tail, d.zScale || 1) };
  }
  const w = new Map();
  const d = best.d;
  let wb = 1;
  if (d.parent && d.blendH > 0) {
    // přední strana kyčle: ostrý přechod (při ohnutí kyčle se kůže zalomí jako skutečná rýha)
    const bh = d.blendFront && p[2] > d.head[2] + 0.02 ? d.blendFront : d.blendH;
    wb = clamp01(0.5 + best.s / (2 * bh));
    if (wb < 1) w.set(index[d.parent], 1 - wb);
  }
  // přechod do jediného potomka (u konce kosti)
  const kids = defs.filter((k) => k.parent === d.name && !k.virtual && !k.finger);
  if (kids.length === 1 && kids[0].blendH > 0) {
    const wk = clamp01(0.5 - (best.len - best.s) / (2 * kids[0].blendH));
    if (wk > 0) { w.set(index[kids[0].name], (w.get(index[kids[0].name]) || 0) + wk * wb); wb *= 1 - wk; }
  }
  w.set(index[d.name], (w.get(index[d.name]) || 0) + wb);
  return { weights: w, best: d.name, s: best.s, len: best.len };
}

// ---------------------------------------------------------------------------
let figureData = null;

/** Načte síť postavy (jednou) a připraví geometrii s vahami a barvami. */
export function loadFigureData(url = 'models/figure.glb') {
  if (figureData) return figureData;
  figureData = new Promise((resolve, reject) => {
    new GLTFLoader().load(url, (gltf) => {
      gltf.scene.updateMatrixWorld(true);
      const parts = {};
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        const src = o.geometry.attributes.position;
        const arr = new Float32Array(src.count * 3);
        const v = new THREE.Vector3();
        for (let i = 0; i < src.count; i++) {
          v.fromBufferAttribute(src, i).applyMatrix4(o.matrixWorld);
          v.toArray(arr, i * 3);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
        g.setIndex(o.geometry.index.clone());
        const name = o.name || o.parent?.name;
        parts[name] = g;
      });
      resolve(prepareGeometry(parts));
    }, undefined, reject);
  });
  return figureData;
}

function prepareGeometry(parts) {
  const defs = skeletonDefs();
  const index = Object.fromEntries(defs.map((d, i) => [d.name, i]));
  const tag = (g, kind) => {
    const n = g.attributes.position.count;
    g.setAttribute('kind', new THREE.BufferAttribute(new Uint8Array(n).fill(kind), 1));
    return g;
  };
  const geo = mergeGeometries([tag(parts.skin, 0), tag(parts.eyes, 1), tag(parts.lips, 2)]);
  geo.deleteAttribute('kind');
  const kinds = new Uint8Array(geo.attributes.position.count);
  let off = 0;
  for (const [g, k] of [[parts.skin, 0], [parts.eyes, 1], [parts.lips, 2]]) {
    kinds.fill(k, off, off + g.attributes.position.count);
    off += g.attributes.position.count;
  }

  let pos = geo.attributes.position;
  let n = pos.count;
  let base = new Float32Array(n * 3);
  const boneWeights = []; // pro zvýraznění: Map index->váha
  const p = [0, 0, 0];
  const handCenters = ['left', 'right'].map((s) => lerp(LM[`wrist_${s}`], LM[`hand_${s}`], 0.5));
  const eyeFront = { left: -Infinity, right: -Infinity };
  for (let i = 0; i < n; i++) if (kinds[i] === 1) { const side = pos.getX(i) > 0 ? 'left' : 'right'; eyeFront[side] = Math.max(eyeFront[side], pos.getZ(i)); }
  const c = new THREE.Color();
  geo.computeVertexNormals();
  let restN = geo.attributes.normal.clone();
  let kindsArr = Array.from(kinds);
  const bestOf = new Array(n);
  const wMaps = new Array(n);

  for (let i = 0; i < n; i++) {
    p[0] = pos.getX(i); p[1] = pos.getY(i); p[2] = pos.getZ(i);
    const handNear = handCenters.some((h) => Math.hypot(p[0] - h[0], p[1] - h[1], p[2] - h[2]) < 0.12);
    let res;
    if (kinds[i] !== 0) res = { weights: new Map([[index.head, 1]]), best: 'head', s: 0, len: 1 };
    // rozkrok (mezi stehny): pevně s pánví, jinak se při ohnutí kyčlí roztrhá mezi obě stehna
    else if (Math.abs(p[0]) < 0.038 && p[1] > 0.72 && p[1] < 0.87 && p[2] > -0.05) res = { weights: new Map([[index.pelvis, 1]]), best: 'pelvis', s: 0, len: 1 };
    else res = vertexWeights(p, defs, index, handNear, [restN.getX(i), restN.getY(i), restN.getZ(i)]);
    const w = res.weights;
    // břicho: přední stěna břicha částečně na pomocnou kost (dýchání)
    if (kinds[i] === 0 && (res.best === 'lumbar' || res.best === 'pelvis' || res.best === 'thoracic') && p[2] > 0.03 && p[1] > 0.86 && p[1] < 1.2) {
      const f = clamp01((p[2] - 0.03) / 0.07) * Math.sin(Math.PI * clamp01((p[1] - 0.86) / 0.34)) * 0.85;
      for (const [k, v] of w) w.set(k, v * (1 - f));
      w.set(index.belly, (w.get(index.belly) || 0) + f);
    }
    wMaps[i] = w;

    // barvy: oblečení, vlasy, obuv
    const b = res.best;
    bestOf[i] = b;
    let col = COLORS.skin;
    if (kinds[i] === 1) {
      const side = p[0] > 0 ? 'left' : 'right';
      const dz = eyeFront[side] - p[2];
      col = dz < 0.0022 ? COLORS.pupil : dz < 0.0055 ? COLORS.iris : COLORS.eye;
    } else if (kinds[i] === 2) col = COLORS.lips;
    // oblečení, vlasy a obuv kreslí shader podle klidové polohy (ostré okraje)
    c.copy(col);
    c.toArray(base, i * 3);
  }

  // Odstranit trojúhelníky, které v klidové poloze propojují ruku se stehnem či trupem
  // (po zjednodušení sítě mohou vzniknout tenké „můstky“, které se při pohybu natahují).
  const group = (b) => {
    if (/^[lr](Forearm|Hand|Thumb|Finger)/.test(b)) return `arm${b[0]}`;
    if (/^[lr]UpperArm/.test(b)) return `ua${b[0]}`;
    if (/^[lr](Thigh|Shin|Foot)/.test(b)) return `leg${b[0]}`;
    if (b === 'pelvis' || b === 'lumbar' || b === 'belly') return 'low';
    return b;
  };
  const bad = (a, b) => {
    if (a === b) return false;
        const isArm = (g) => g.startsWith('arm'), isUa = (g) => g.startsWith('ua'), isLeg = (g) => g.startsWith('leg');
    if ((isArm(a) && (isLeg(b) || b === 'low' || b === 'thoracic' || b === 'head' || b === 'neck')) || (isArm(b) && (isLeg(a) || a === 'low' || a === 'thoracic' || a === 'head' || a === 'neck'))) return true;
    if ((isUa(a) && (isLeg(b) || b === 'low')) || (isUa(b) && (isLeg(a) || a === 'low'))) return true;
    if ((isArm(a) || isUa(a)) && (isArm(b) || isUa(b)) && a.slice(-1) !== b.slice(-1)) return true;
    return false;
  };
  const idx = geo.index.array;
  const keep = [];
  let cut = 0;
  const highY0 = (t) => Math.max(pos.getY(idx[t]), pos.getY(idx[t + 1]), pos.getY(idx[t + 2]));
  const groups = bestOf.map(group);
  for (let t = 0; t < idx.length; t += 3) {
    const g0 = groups[idx[t]], g1 = groups[idx[t + 1]], g2 = groups[idx[t + 2]];
    if (CUT_SEAMS && (bad(g0, g1) || bad(g1, g2) || bad(g0, g2))) { cut++; continue; }
    // šev mezi paží a bokem: trojúhelník, jehož vrcholy leží zčásti ve válci paže a zčásti mimo
    const sides = [idx[t], idx[t + 1], idx[t + 2]].map((v) => armpitSide([pos.getX(v), pos.getY(v), pos.getZ(v)]));
    if (CUT_SEAMS && highY0(t) < LM.shoulder_left[1] - 0.13 && sides.includes('arm') && sides.includes('trunk')) { cut++; continue; }
    // paže a trup se pod podpažím nesmí dotýkat (vnitřní strana paže u pasu)
    const tri = [g0, g1, g2];
    const lowY = Math.min(pos.getY(idx[t]), pos.getY(idx[t + 1]), pos.getY(idx[t + 2]));
    const highY = Math.max(pos.getY(idx[t]), pos.getY(idx[t + 1]), pos.getY(idx[t + 2]));
    if (CUT_SEAMS && highY < LM.shoulder_left[1] - 0.13 && tri.some((g) => g.startsWith('ua')) && tri.some((g) => g === 'thoracic' || g === 'low')) { cut++; continue; }
    keep.push(idx[t], idx[t + 1], idx[t + 2]);
  }
  if (typeof window !== 'undefined') window.__figureCut = cut;

  // Zalepit díry po řezu mezi paží a trupem (a po odstranění styčných ploch při převodu):
  // každou okrajovou smyčku zvlášť vějířem ze středu, ale jen když celá leží na jedné části těla,
  // jinak by vznikla blána mezi paží a bokem.
  {
    const sideOf = (g) => (g.startsWith('arm') || g.startsWith('ua') ? `A${g.slice(-1)}` : g.startsWith('leg') ? `L${g.slice(-1)}` : 'T');
    const ek = (a, b) => (a < b ? a * 65536 + b : b * 65536 + a);
    const cnt = new Map();
    for (let t = 0; t < keep.length; t += 3) for (let e = 0; e < 3; e++) { const k = ek(keep[t + e], keep[t + (e + 1) % 3]); cnt.set(k, (cnt.get(k) || 0) + 1); }
    const nxt = new Map();
    for (let t = 0; t < keep.length; t += 3) for (let e = 0; e < 3; e++) {
      const a = keep[t + e], b = keep[t + (e + 1) % 3];
      if (cnt.get(ek(a, b)) === 1) { if (!nxt.has(a)) nxt.set(a, []); nxt.get(a).push(b); }
    }
    const usedE = new Set();
    const loops = [];
    for (const [start, list] of nxt) for (const first of list) {
      if (usedE.has(start * 65536 + first)) continue;
      const loop = [start];
      let u = start, w = first, ok = true;
      for (;;) {
        usedE.add(u * 65536 + w);
        if (w === start) break;
        loop.push(w);
        const cand = (nxt.get(w) || []).filter((x) => !usedE.has(w * 65536 + x));
        if (!cand.length || loop.length > 400) { ok = false; break; }
        u = w; w = cand[0];
      }
      if (ok && loop.length >= 3) loops.push(loop);
    }
    const extraP = [], extraN = [];
    for (const loop of loops) {
      if (loop.some((v) => kinds[v] !== 0)) continue;
      const s0 = sideOf(groups[loop[0]]);
      if (!loop.every((v) => sideOf(groups[v]) === s0)) continue;
      const cpos = [0, 0, 0], cn = [0, 0, 0];
      const w = new Map();
      const votes = new Map();
      for (const v of loop) {
        cpos[0] += pos.getX(v) / loop.length; cpos[1] += pos.getY(v) / loop.length; cpos[2] += pos.getZ(v) / loop.length;
        cn[0] += restN.getX(v); cn[1] += restN.getY(v); cn[2] += restN.getZ(v);
        for (const [k, x] of wMaps[v]) w.set(k, (w.get(k) || 0) + x / loop.length);
        votes.set(bestOf[v], (votes.get(bestOf[v]) || 0) + 1);
      }
      const ci = n + extraP.length;
      extraP.push(cpos);
      const ln = Math.hypot(...cn) || 1;
      extraN.push(cn.map((x) => x / ln));
      wMaps[ci] = w;
      bestOf[ci] = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
      groups[ci] = group(bestOf[ci]);
      kindsArr[ci] = 0;
      for (let k = 0; k < loop.length; k++) keep.push(loop[(k + 1) % loop.length], loop[k], ci);
    }
    if (extraP.length) {
      const m = n + extraP.length;
      const P = new Float32Array(m * 3), N = new Float32Array(m * 3), B = new Float32Array(m * 3);
      P.set(pos.array.subarray(0, n * 3)); N.set(restN.array.subarray(0, n * 3)); B.set(base);
      extraP.forEach((q, i) => { P.set(q, (n + i) * 3); N.set(extraN[i], (n + i) * 3); COLORS.skin.toArray(B, (n + i) * 3); });
      geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
      restN = new THREE.BufferAttribute(N, 3);
      base = B;
      pos = geo.attributes.position;
      n = m;
    }
    if (typeof window !== 'undefined') window.__figureFilled = extraP.length;
  }
  geo.setIndex(keep);
  const skinIndex = new Uint16Array(n * 4);
  const skinWeight = new Float32Array(n * 4);

  // Vyhlazení vah po síti (odstraní skoky mezi kostmi a přehyby v kloubech)
  const nbr = Array.from({ length: n }, () => new Set());
  for (let t = 0; t < keep.length; t += 3) {
    const a = keep[t], b = keep[t + 1], c2 = keep[t + 2];
    nbr[a].add(b); nbr[a].add(c2); nbr[b].add(a); nbr[b].add(c2); nbr[c2].add(a); nbr[c2].add(b);
  }
  const hipY = LM.hip_left[1], hipZ = LM.hip_left[2];
  const armpit = (i) => { const y = pos.getY(i), a = Math.abs(pos.getX(i)); return y > 1.15 && y < 1.33 && a > 0.11 && a < 0.205 && restN.getY(i) < 0.3; };
  const frozen = (i) => kindsArr[i] !== 0 || /Finger|Thumb/.test(bestOf[i]) || (armpit(i) && pos.getY(i) < 1.17)
    || (/Thigh|pelvis/.test(bestOf[i]) && pos.getZ(i) > hipZ + 0.02 && Math.abs(pos.getY(i) - hipY) < 0.09);
  for (let it = 0; it < 4; it++) {
    const next = new Array(n);
    for (let i = 0; i < n; i++) {
      if (frozen(i) || nbr[i].size === 0) { next[i] = wMaps[i]; continue; }
      const acc = new Map();
      for (const [k, v] of wMaps[i]) acc.set(k, v * 0.5);
      const share = 0.5 / nbr[i].size;
      for (const j of nbr[i]) for (const [k, v] of wMaps[j]) acc.set(k, (acc.get(k) || 0) + v * share);
      next[i] = acc;
    }
    for (let i = 0; i < n; i++) wMaps[i] = next[i];
  }
  // ramena: delší vyhlazení, aby se kůže při upažení plynule natahovala
  const shoulders = ['left', 'right'].map((sd) => LM[`shoulder_${sd}`]);
  const nearShoulder = (i) => pos.getY(i) > shoulders[0][1] - 0.09 && shoulders.some((sh) => Math.hypot(pos.getX(i) - sh[0], pos.getY(i) - sh[1], pos.getZ(i) - sh[2]) < 0.12);
  const sh = [];
  for (let i = 0; i < n; i++) if (!frozen(i) && (nearShoulder(i) || (armpit(i) && pos.getY(i) >= 1.17))) sh.push(i);
  for (let it = 0; it < 16; it++) {
    const upd = new Map();
    for (const i of sh) {
      const acc = new Map();
      for (const [k, v] of wMaps[i]) acc.set(k, v * 0.4);
      const share = 0.6 / nbr[i].size;
      for (const j of nbr[i]) for (const [k, v] of wMaps[j]) acc.set(k, (acc.get(k) || 0) + v * share);
      upd.set(i, acc);
    }
    for (const [i, w] of upd) wMaps[i] = w;
  }
  // Podpaží: plynulý přechod hrudník → paže podle vzdálenosti od osy těla,
  // aby se kůže při upažení natahovala jako souvislá plocha.
  for (let i = 0; i < n; i++) {
    if (kindsArr[i] !== 0) continue;
    const y = pos.getY(i), ax = Math.abs(pos.getX(i)), z = pos.getZ(i);
    const sd = pos.getX(i) > 0 ? 'l' : 'r';
    const shY = LM.shoulder_left[1];
    if (y > shY - 0.17 && y < shY - 0.02 && ax > 0.1 && ax < 0.185 && z > -0.08 && z < 0.07) {
      const g = groups[i];
      if (!(g === 'thoracic' || g.startsWith('ua'))) continue;
      const tx = clamp01((ax - 0.115) / 0.06);               // 0 = hrudník, 1 = paže
      const ty = clamp01((y - (shY - 0.17)) / 0.15);         // výš = víc paže
      const wa = clamp01(tx * (0.55 + 0.45 * ty));
      const ua = index[`${sd}UpperArm`], th = index.thoracic, sc = index[`${sd}Scap`];
      wMaps[i] = new Map([[ua, wa * 0.85], [sc, wa * 0.15], [th, 1 - wa]]);
    }
  }
  for (let i = 0; i < n; i++) {
    const sorted = [...wMaps[i].entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const sum = sorted.reduce((sm, e) => sm + e[1], 0) || 1;
    sorted.forEach(([bi, bw], k) => { skinIndex[i * 4 + k] = bi; skinWeight[i * 4 + k] = bw / sum; });
    boneWeights.push(sorted.map(([bi, bw]) => [bi, bw / sum]));
  }

  // posun tak, aby pánevní kloub byl v počátku
  const pelvis = defs[index.pelvis].head;
  geo.translate(-pelvis[0], -pelvis[1], -pelvis[2]);
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(base.slice(), 3));
  // klidová poloha vrcholu (pro oblečení v shaderu), druh povrchu a zvýraznění
  const rest = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    rest[i * 3] = pos.getX(i) + pelvis[0]; rest[i * 3 + 1] = pos.getY(i) + pelvis[1]; rest[i * 3 + 2] = pos.getZ(i) + pelvis[2];
  }
  geo.setAttribute('restPos', new THREE.Float32BufferAttribute(rest, 3));
  geo.setAttribute('kind', new THREE.Float32BufferAttribute(Float32Array.from(kindsArr), 1));
  geo.setAttribute('focus', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
  // dýchání: posun přední stěny břicha a hrudníku dopředu (morph)
  const bellyIdx = index.belly;
  const morph = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let f = 0;
    for (let k = 0; k < 4; k++) if (skinIndex[i * 4 + k] === bellyIdx) f += skinWeight[i * 4 + k];
    const y = rest[i * 3 + 1], z = rest[i * 3 + 2];
    const chest = z > 0.04 && y > 1.15 && y < 1.33 && Math.abs(rest[i * 3]) < 0.15 ? 0.35 * Math.sin(Math.PI * (y - 1.15) / 0.18) : 0;
    morph[i * 3 + 2] = 0.03 * f + 0.012 * chest;
    morph[i * 3 + 1] = 0.006 * chest;
  }
  geo.morphAttributes.position = [new THREE.Float32BufferAttribute(morph, 3)];
  geo.morphTargetsRelative = true;
  geo.computeVertexNormals();
  // Rizikové trojúhelníky (vrcholy patří k různým kostem): při pohybu se kontroluje jejich natažení
  const tri = geo.index.array;
  const risky = [];
  const restLen = [];
  const top = (i) => skinIndex[i * 4];
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t], b = tri[t + 1], c3 = tri[t + 2];
    if (top(a) === top(b) && top(b) === top(c3) && Math.min(skinWeight[a * 4], skinWeight[b * 4], skinWeight[c3 * 4]) > 0.6) continue;
    // podpaží: kůže se má natáhnout jako blána, ne zmizet (jinak vznikne díra)
    const cy = (rest[a * 3 + 1] + rest[b * 3 + 1] + rest[c3 * 3 + 1]) / 3;
    const cx = Math.abs(rest[a * 3] + rest[b * 3] + rest[c3 * 3]) / 3;
    if (cy > LM.shoulder_left[1] - 0.16 && cy < LM.shoulder_left[1] + 0.02 && cx > 0.08 && cx < 0.21) continue;
    const L = (u, v) => Math.hypot(rest[u * 3] - rest[v * 3], rest[u * 3 + 1] - rest[v * 3 + 1], rest[u * 3 + 2] - rest[v * 3 + 2]);
    risky.push(t);
    restLen.push(Math.max(L(a, b), L(b, c3), L(a, c3)));
  }
  return { geo, defs, index, base, boneWeights, origin: pelvis, risky: Int32Array.from(risky), restLen: Float32Array.from(restLen) };
}

// ---------------------------------------------------------------------------
const FOCUS_BONES = {
  neck: ['neck'], head: ['head'], chest: ['thoracic', 'lScap', 'rScap'], abdomen: ['lumbar', 'belly'], pelvis: ['pelvis'],
};
for (const p of ['l', 'r']) {
  Object.assign(FOCUS_BONES, {
    [`${p}Shoulder`]: [`${p}Scap`, `${p}UpperArm`], [`${p}UpperArm`]: [`${p}UpperArm`], [`${p}Forearm`]: [`${p}Forearm`],
    [`${p}Hand`]: [`${p}Hand`, `${p}Thumb`, `${p}Finger1a`, `${p}Finger1b`, `${p}Finger2a`, `${p}Finger2b`, `${p}Finger3a`, `${p}Finger3b`, `${p}Finger4a`, `${p}Finger4b`],
    [`${p}Thigh`]: [`${p}Thigh`], [`${p}Shin`]: [`${p}Shin`], [`${p}Foot`]: [`${p}Foot`],
  });
}

export class Figure {
  constructor(data) {
    this.data = data;
    const { geo, defs, origin } = data;
    this.root = new THREE.Group();
    this.bones = defs.map((d) => {
      const b = new THREE.Bone();
      b.name = d.name;
      return b;
    });
    const byName = Object.fromEntries(defs.map((d, i) => [d.name, this.bones[i]]));
    this.byName = byName;
    defs.forEach((d, i) => {
      const b = this.bones[i];
      const head = V(d.head).sub(V(origin));
      if (d.parent) {
        const ph = V(defs[data.index[d.parent]].head).sub(V(origin));
        b.position.copy(head.sub(ph));
        byName[d.parent].add(b);
      } else b.position.copy(head);
      b.userData.rest = b.position.clone();
    });
    this.dqR = this.bones.map(() => new THREE.Vector4(0, 0, 0, 1));
    this.dqD = this.bones.map(() => new THREE.Vector4(0, 0, 0, 0));
    const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.62, sheen: 0.4, sheenRoughness: 0.6, clearcoat: 0.05, side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.cShirt = { value: COLORS.shirt };
      sh.uniforms.cShorts = { value: COLORS.shorts };
      sh.uniforms.cHair = { value: COLORS.hair };
      sh.uniforms.cShoe = { value: COLORS.shoe };
      sh.uniforms.cSole = { value: COLORS.sole };
      sh.uniforms.cFocus = { value: COLORS.focus };
      sh.uniforms.dqR = { value: this.dqR };
      sh.uniforms.dqD = { value: this.dqD };
      const NB = this.bones.length;
      sh.vertexShader = sh.vertexShader
        .replace('#include <skinning_pars_vertex>', `#include <skinning_pars_vertex>
          uniform vec4 dqR[${NB}]; uniform vec4 dqD[${NB}];
          vec3 qRot(vec4 q, vec3 v) { return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }`)
        .replace('#include <skinbase_vertex>', `
          vec4 r0 = dqR[int(skinIndex.x)], r1 = dqR[int(skinIndex.y)], r2 = dqR[int(skinIndex.z)], r3 = dqR[int(skinIndex.w)];
          vec4 d0 = dqD[int(skinIndex.x)], d1 = dqD[int(skinIndex.y)], d2 = dqD[int(skinIndex.z)], d3 = dqD[int(skinIndex.w)];
          float s1 = dot(r0, r1) < 0.0 ? -1.0 : 1.0, s2 = dot(r0, r2) < 0.0 ? -1.0 : 1.0, s3 = dot(r0, r3) < 0.0 ? -1.0 : 1.0;
          vec4 bR = skinWeight.x * r0 + skinWeight.y * s1 * r1 + skinWeight.z * s2 * r2 + skinWeight.w * s3 * r3;
          vec4 bD = skinWeight.x * d0 + skinWeight.y * s1 * d1 + skinWeight.z * s2 * d2 + skinWeight.w * s3 * d3;
          float bLen = length(bR); bR /= bLen; bD /= bLen;`)
        .replace('#include <skinnormal_vertex>', 'objectNormal = qRot(bR, objectNormal);')
        .replace('#include <skinning_vertex>', `
          vec3 dqT = 2.0 * (bR.w * bD.xyz - bD.w * bR.xyz + cross(bR.xyz, bD.xyz));
          transformed = qRot(bR, transformed) + dqT;`);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 restPos;\nattribute float kind;\nattribute float focus;\nvarying vec3 vRest;\nvarying float vKind;\nvarying float vFocus;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = restPos; vKind = kind; vFocus = focus;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vRest; varying float vKind; varying float vFocus;
          uniform vec3 cShirt; uniform vec3 cShorts; uniform vec3 cHair; uniform vec3 cShoe; uniform vec3 cSole; uniform vec3 cFocus;
          float band(float v, float a, float b) { return smoothstep(a - 0.002, a + 0.002, v) * (1.0 - smoothstep(b - 0.002, b + 0.002, v)); }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          if (vKind < 0.5) {
            vec3 r = vRest; float ax = abs(r.x);
            vec3 col = diffuseColor.rgb;
            float shorts = band(r.y, 0.585, 0.93) * (1.0 - smoothstep(0.188, 0.192, ax));
            float torso = band(r.y, 0.93, 1.43) * (1.0 - smoothstep(0.163, 0.167, ax));
            float sleeve = band(r.y, 1.25, 1.43) * (1.0 - smoothstep(0.232, 0.236, ax));
            float neck = max(smoothstep(1.333, 1.337, r.y) * smoothstep(-0.012, -0.008, r.z) * (1.0 - smoothstep(0.073, 0.077, ax)),
                             smoothstep(1.378, 1.382, r.y) * (1.0 - smoothstep(0.058, 0.062, ax)));
            float shirt = max(torso, sleeve) * (1.0 - neck);
            float hair = max(smoothstep(1.583, 1.587, r.y) * max(1.0 - smoothstep(0.043, 0.047, r.z), smoothstep(1.623, 1.627, r.y)),
                             smoothstep(1.498, 1.502, r.y) * (1.0 - smoothstep(-0.037, -0.033, r.z)) * (1.0 - smoothstep(0.088, 0.092, ax)));
            float shoe = 1.0 - smoothstep(0.093, 0.097, r.y);
            float sole = 1.0 - smoothstep(0.02, 0.024, r.y);
            col = mix(col, cShorts, shorts);
            col = mix(col, cShirt, shirt);
            col = mix(col, cHair, hair);
            col = mix(col, cShoe, shoe);
            col = mix(col, cSole, sole);
            diffuseColor.rgb = col;
          }
          diffuseColor.rgb = mix(diffuseColor.rgb, cFocus, clamp(vFocus, 0.0, 1.0) * 0.6);`);
    };
    this.mesh = new THREE.SkinnedMesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.add(byName.pelvis);
    this.mesh.bind(new THREE.Skeleton(this.bones));
    this.root.add(this.mesh);
    this.meshes = [this.mesh];

    // jména kloubů jako u figuríny
    this.joints = {
      lumbar: byName.lumbar, thoracic: byName.thoracic, neck: byName.neck, head: byName.head,
      lScap: byName.lScap, rScap: byName.rScap, lShoulder: byName.lUpperArm, rShoulder: byName.rUpperArm,
      lElbow: byName.lForearm, rElbow: byName.rForearm, lWrist: byName.lHand, rWrist: byName.rHand,
      lHip: byName.lThigh, rHip: byName.rThigh, lKnee: byName.lShin, rKnee: byName.rShin, lAnkle: byName.lFoot, rAnkle: byName.rFoot,
    };

    // značky pro kotvy a pomůcky
    this.markers = {};
    const mark = (name, bone, world) => {
      const o = new THREE.Object3D();
      const bw = this.boneWorldRest(bone);
      o.position.copy(V(world).sub(V(origin)).sub(bw));
      byName[bone].add(o);
      this.markers[name] = o;
    };
    mark('pelvis', 'pelvis', [0, LM.ischial_left[1] + 0.03, 0.0]);
    mark('sacrum', 'pelvis', [0, SP.S[1], SP.S[2] - 0.05]);
    mark('back', 'thoracic', [0, 1.22, -0.115]);
    mark('lowBack', 'lumbar', [0, 0.99, -0.1]);
    mark('scapulaL', 'thoracic', [0.075, 1.25, -0.112]);
    mark('head', 'head', LM.head_top);
    mark('headBack', 'head', [0, LM.occipital_protuberance[1], LM.occipital_protuberance[2] - 0.012]);
    mark('forehead', 'head', [0, 1.6, 0.095]);
    for (const [p, side] of [['l', 'left'], ['r', 'right']]) {
      const L = (k) => LM[`${k}_${side}`];
      mark(`${p}Elbow`, `${p}Forearm`, L('elbow'));
      mark(`${p}Hand`, `${p}Hand`, [L('palm')[0], L('palm')[1], L('palm')[2] + 0.012]);
      mark(`${p}Fingertips`, `${p}Finger2b`, FINGERS[side][2].tip);
      mark(`${p}Knee`, `${p}Shin`, [L('knee')[0], L('knee')[1], L('knee')[2] + 0.05]);
      mark(`${p}KneeIn`, `${p}Shin`, [L('knee')[0] - 0.048 * Math.sign(L('knee')[0]), L('knee')[1] + 0.02, L('knee')[2]]);
      mark(`${p}Foot`, `${p}Foot`, [L('ankle')[0], 0.0, lerp(L('heel'), L('toe'), 0.45)[2]]);
      mark(`${p}Heel`, `${p}Foot`, [L('heel')[0], 0.0, L('heel')[2] - 0.01]);
      mark(`${p}Toe`, `${p}Foot`, [L('toe')[0], 0.0, L('toe')[2]]);
    }
    // vzorek vrcholů pro výpočet nejnižšího bodu
    const n = geo.attributes.position.count;
    this.sample = [];
    for (let i = 0; i < n; i += 5) this.sample.push(i);
    this.root.updateMatrixWorld(true);
  }

  boneWorldRest(name) {
    const d = this.data.defs[this.data.index[name]];
    return V(d.head).sub(V(this.data.origin));
  }

  setFocus(segments = []) {
    const { boneWeights, index } = this.data;
    const ids = new Set(segments.flatMap((s) => FOCUS_BONES[s] || []).map((n) => index[n]));
    const fa = this.mesh.geometry.attributes.focus;
    for (let i = 0; i < boneWeights.length; i++) {
      let f = 0;
      for (const [bi, bw] of boneWeights[i]) if (ids.has(bi)) f += bw;
      fa.setX(i, f);
    }
    fa.needsUpdate = true;
  }

  apply(pose) {
    const J = this.joints;
    const B = this.byName;
    const g = (o, k) => o?.[k] ?? 0;
    this.root.position.set(...pose.root.pos);
    this.root.quaternion.setFromEuler(new THREE.Euler(D(pose.root.rot[0]), D(pose.root.rot[1]), D(pose.root.rot[2]), 'YXZ'));
    const spine = (name) => {
      const o = pose[name];
      J[name].quaternion.copy(qa(AY, g(o, 'rot'))).premultiply(qa(AX, g(o, 'flex'))).premultiply(qa(AZ, -g(o, 'lat')));
    };
    spine('lumbar'); spine('thoracic'); spine('neck'); spine('head');
    B.head.position.copy(B.head.userData.rest);
    B.head.position.z -= g(pose.head, 'shift');
    this.mesh.morphTargetInfluences[0] = pose.breath || 0;

    for (const [s, p] of [[1, 'l'], [-1, 'r']]) {
      const sc = pose[`${p}Scap`];
      J[`${p}Scap`].quaternion.copy(qa(AZ, 14 * g(sc, 'elev') * s)).premultiply(qa(AY, 16 * g(sc, 'retr') * s));
      const sh = pose[`${p}Shoulder`];
      J[`${p}Shoulder`].quaternion.copy(qa(AY, g(sh, 'rot') * s))
        .premultiply(qa(AX, -g(sh, 'flex')))
        .premultiply(qa(AZ, g(sh, 'abd') * s))
        .premultiply(qa(AY, -g(sh, 'hadd') * s));
      const el = pose[`${p}Elbow`];
      J[`${p}Elbow`].quaternion.copy(qa(AY, -g(el, 'sup') * s)).premultiply(qa(AX, -g(el, 'flex')));
      const wr = pose[`${p}Wrist`];
      J[`${p}Wrist`].quaternion.copy(qa(AZ, g(wr, 'dev') * s)).premultiply(qa(AX, -g(wr, 'flex')));
      // prsty: v klidové poloze modelu jsou mírně pokrčené, proto výchozí natažení −25°
      const fi = pose[`${p}Fingers`];
      const qm = qa(AX, -(g(fi, 'mcp') - 25)), qi = qa(AX, -(g(fi, 'ip') - 20));
      for (let i = 1; i <= 4; i++) {
        B[`${p}Finger${i}a`].quaternion.copy(qm);
        B[`${p}Finger${i}b`].quaternion.copy(qi);
      }
      B[`${p}Thumb`].quaternion.copy(qa(AX, -0.35 * g(fi, 'mcp'))).premultiply(qa(AY, -0.3 * g(fi, 'mcp') * s));
      const hp = pose[`${p}Hip`];
      J[`${p}Hip`].quaternion.copy(qa(AY, g(hp, 'rot') * s)).premultiply(qa(AX, -g(hp, 'flex'))).premultiply(qa(AZ, g(hp, 'abd') * s));
      J[`${p}Knee`].quaternion.copy(qa(AX, g(pose[`${p}Knee`], 'flex')));
      const an = pose[`${p}Ankle`];
      J[`${p}Ankle`].quaternion.copy(qa(AZ, -g(an, 'inv') * s)).premultiply(qa(AX, -g(an, 'dorsi')));
    }
    this.root.updateMatrixWorld(true);
    this.updateDQ();
    // kontrola natažených trojúhelníků je náročnější – stačí každý druhý snímek
    this._cullTick = ((this._cullTick || 0) + 1) % 2;
    if (this._cullTick === 0 || !this.fullIndex) this.cullStretched();
  }

  /** Skryje trojúhelníky, které se v aktuální póze extrémně natáhly (podpaží, třísla). */
  cullStretched() {
    const { risky, restLen } = this.data;
    const geo = this.mesh.geometry;
    if (!this.fullIndex) {
      this.fullIndex = geo.index.array.slice();
      this.riskySet = new Uint8Array(this.fullIndex.length / 3);
      for (const t of risky) this.riskySet[t / 3] = 1;
      this.vcache = new Float32Array(geo.attributes.position.count * 3);
      this.vstamp = new Int32Array(geo.attributes.position.count);
      this.frame = 0;
    }
    this.frame++;
    this.mesh.skeleton.update();
    const v = _t;
    const P = (i) => {
      if (this.vstamp[i] !== this.frame) {
        this.mesh.getVertexPosition(i, v);
        this.vcache[i * 3] = v.x; this.vcache[i * 3 + 1] = v.y; this.vcache[i * 3 + 2] = v.z;
        this.vstamp[i] = this.frame;
      }
      return i * 3;
    };
    const C = this.vcache;
    const d = (a, b) => Math.hypot(C[a] - C[b], C[a + 1] - C[b + 1], C[a + 2] - C[b + 2]);
    const hidden = new Set();
    for (let k = 0; k < risky.length; k++) {
      const t = risky[k];
      const a = P(this.fullIndex[t]), b = P(this.fullIndex[t + 1]), c = P(this.fullIndex[t + 2]);
      const m = Math.max(d(a, b), d(b, c), d(a, c));
      if (m > Math.max(0.025, restLen[k] * 2.2)) hidden.add(t);
    }
    const idx = geo.index.array;
    let w = 0;
    for (let t = 0; t < this.fullIndex.length; t += 3) {
      if (hidden.has(t)) continue;
      idx[w++] = this.fullIndex[t]; idx[w++] = this.fullIndex[t + 1]; idx[w++] = this.fullIndex[t + 2];
    }
    geo.setDrawRange(0, w);
    geo.index.needsUpdate = true;
  }

  /** Duální kvaterniony kostí (v prostoru meshe) pro skinování bez bortění kloubů. */
  updateDQ() {
    const sk = this.mesh.skeleton;
    const inv = _m1.copy(this.mesh.matrixWorld).invert();
    for (let i = 0; i < this.bones.length; i++) {
      _m2.multiplyMatrices(inv, this.bones[i].matrixWorld).multiply(sk.boneInverses[i]).multiply(this.mesh.bindMatrix);
      _m2.decompose(_t, _q, _s);
      this.dqR[i].set(_q.x, _q.y, _q.z, _q.w);
      // duální část = 0,5 · (t, 0) · q
      this.dqD[i].set(
        0.5 * (_t.x * _q.w + _t.y * _q.z - _t.z * _q.y),
        0.5 * (-_t.x * _q.z + _t.y * _q.w + _t.z * _q.x),
        0.5 * (_t.x * _q.y - _t.y * _q.x + _t.z * _q.w),
        -0.5 * (_t.x * _q.x + _t.y * _q.y + _t.z * _q.z),
      );
    }
  }

  markerPos(name, target = new THREE.Vector3()) {
    return this.markers[name].getWorldPosition(target);
  }

  /** Obálka kůže po deformaci (vzorek vrcholů). */
  bbox() {
    const v = new THREE.Vector3();
    const box = new THREE.Box3();
    this.mesh.skeleton.update();
    for (const i of this.sample) {
      this.mesh.getVertexPosition(i, v);
      box.expandByPoint(v.applyMatrix4(this.mesh.matrixWorld));
    }
    return box;
  }

  /** Nejnižší bod kůže po deformaci (vzorek vrcholů). */
  minY() {
    const v = new THREE.Vector3();
    let min = Infinity;
    this.mesh.skeleton.update();
    for (const i of this.sample) {
      this.mesh.getVertexPosition(i, v);
      v.applyMatrix4(this.mesh.matrixWorld);
      if (v.y < min) min = v.y;
    }
    return min;
  }
}
