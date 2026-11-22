// Dermatomy (oblasti kůže zásobené jedním míšním kořenem) a kožní nervy.
// Zjednodušená mapa podle běžně používaných schémat – hranice dermatomů se
// mezi lidmi liší a překrývají, slouží jen pro orientaci.
// Bez závislosti na Three.js (testovatelné v Node).
import { LM, FINGERS, TOES } from './landmarks.js';

export const DERMATOME_ORDER = [
  'V1', 'V2', 'V3', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8',
  'Th9', 'Th10', 'Th11', 'Th12', 'L1', 'L2', 'L3', 'L4', 'L5', 'S1', 'S2', 'S3',
];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function seg(p, a, b) {
  const ab = sub(b, a);
  let t = dot(sub(p, a), ab) / dot(ab, ab);
  t = Math.max(0, Math.min(1, t));
  const c = lerp(a, b, t);
  return { t, c, dist: Math.hypot(...sub(p, c)) };
}

const J = (k) => LM[`${k}_left`];

function interp(y, table) {
  // table: [[y, value], ...] sestupně podle y
  if (y >= table[0][0]) return table[0][1];
  for (let i = 0; i < table.length - 1; i++) {
    const [y0, v0] = table[i], [y1, v1] = table[i + 1];
    if (y <= y0 && y >= y1) return v0 + (v1 - v0) * ((y0 - y) / (y0 - y1));
  }
  return table[table.length - 1][1];
}

/**
 * Dermatom a kožní nerv pro bod na povrchu těla.
 * @returns {{seg: string, nerve: string|null}}  nerve = klíč z NERVE_INFO
 */
export function dermatomeAt(p) {
  const q = [Math.abs(p[0]), p[1], p[2]]; // vše počítáme na levé straně
  const [x, y, z] = q;

  // --- Hlava ---
  if (y > 1.5 || (y > 1.44 && z > 0.06)) {
    if (x > 0.058 && z < 0.03 && y < 1.6) return { seg: 'C3', nerve: 'auricular' };
    if (z < -0.015 || (y > 1.63 && z < 0.03)) return { seg: 'C2', nerve: 'occipitalMaj' };
    const orbitY = J('orbit')[1];
    if (y > orbitY + 0.012) return { seg: 'V1', nerve: 'trigemV1' };
    if (y > J('mental')[1] + 0.028) return { seg: 'V2', nerve: 'trigemV2' };
    return { seg: 'V3', nerve: 'trigemV3' };
  }

  // --- Nejbližší segment těla ---
  const parts = [
    { id: 'armU', ...seg(q, J('shoulder'), J('elbow')), r: 0.045 },
    { id: 'armF', ...seg(q, J('elbow'), J('wrist')), r: 0.037 },
    { id: 'hand', ...seg(q, J('wrist'), J('hand')), r: 0.035 },
    { id: 'thigh', ...seg(q, J('hip'), J('knee')), r: 0.075 },
    { id: 'shin', ...seg(q, J('knee'), J('ankle')), r: 0.05 },
    { id: 'foot', ...seg(q, J('ankle'), lerp(TOES.left[1].base, TOES.left[2].base, 0.5)), r: 0.045 },
    { id: 'torso', ...seg([x, y, z * 1.25], [0, 0.8, 0.015], [0, 1.36, 0]), r: 0.15 },
    { id: 'neck', ...seg(q, [0, 1.36, 0], [0, 1.5, 0]), r: 0.06 },
  ];
  // prsty mají přednost v okolí ruky
  for (let i = 0; i < 5; i++) {
    const f = FINGERS.left[i];
    parts.push({ id: `finger${i}`, ...seg(q, f.base, f.tip), r: 0.012 });
  }
  for (let i = 0; i < 5; i++) {
    const tt = TOES.left[i];
    parts.push({ id: `toe${i}`, ...seg(q, tt.base, tt.tip), r: 0.012 });
  }
  let best = parts[0];
  for (const pt of parts) if (pt.dist / pt.r < best.dist / best.r) best = pt;
  const lat = x - best.c[0];          // + = zevní (laterální) strana, − = vnitřní (mediální)
  const back = z - best.c[2] < -best.r * 0.3;
  const front = z - best.c[2] > best.r * 0.3;

  switch (best.id) {
    case 'neck':
      return { seg: 'C3', nerve: null };
    case 'torso': {
      if (y > 1.335) return { seg: 'C4', nerve: null };
      if (y > 1.27 && x > 0.12) return { seg: y > J('shoulder')[1] - 0.01 ? 'C4' : 'C5', nerve: 'axillaryN' };
      const isBack = z < 0.005;
      if (isBack && y < 0.9 && x > 0.035) return { seg: y > 0.85 ? 'L2' : 'S3', nerve: null };
      if (isBack && y < 0.88) return { seg: 'S3', nerve: null };
      // na zádech jsou dermatomy posunuté výš – plynulý přechod podle hloubky
      const backness = Math.max(0, Math.min(1, (0.03 - z) / 0.1));
      const yy = y - 0.09 * backness;
      const th = Math.round(interp(yy, [[1.335, 2], [1.22, 4], [1.15, 6], [1.07, 8], [0.99, 10], [0.92, 12], [0.87, 13], [0.84, 14]]));
      // na zádech kůži zásobují zadní větve míšních nervů, ne mezižeberní nervy
      const nerve = backness > 0.5 ? null : th <= 11 ? 'intercostal' : th === 12 ? 'subcostal' : null;
      if (th >= 13) return { seg: th >= 14 ? 'L2' : 'L1', nerve };
      return { seg: `Th${th}`, nerve };
    }
    case 'armU':
      if (best.t < 0.2 && y > J('shoulder')[1] - 0.005) return { seg: 'C4', nerve: null };
      if (lat > -best.r * 0.2) return { seg: 'C5', nerve: best.t < 0.55 ? 'axillaryN' : 'radialN' };
      return { seg: best.t < 0.45 ? 'Th2' : 'Th1', nerve: null };
    case 'armF':
      if (lat > best.r * 0.15) return { seg: 'C6', nerve: 'musculocutN' };
      if (lat < -best.r * 0.15) return { seg: 'C8', nerve: null };
      return { seg: back ? 'C7' : 'C6', nerve: back ? 'radialN' : 'musculocutN' };
    case 'hand': {
      // poměr mezi loketní (0) a vřetenní (1) stranou zápěstí
      const u = J('wrist_uln')[0], rr = J('wrist_rad')[0];
      const k = (x - u) / (rr - u);
      const palm = z - best.c[2] > -0.004;
      if (k > 0.62) return { seg: 'C6', nerve: palm ? 'median' : 'radialN' };
      if (k > 0.3) return { seg: 'C7', nerve: palm ? 'median' : 'radialN' };
      return { seg: 'C8', nerve: 'ulnarN' };
    }
    case 'thigh':
      if (back) return { seg: best.t < 0.15 ? 'S3' : 'S2', nerve: null };
      if (best.t < 0.3) return { seg: lat < -best.r * 0.2 ? 'L1' : 'L2', nerve: lat > best.r * 0.4 ? 'latFemCut' : 'femoralN' };
      if (best.t < 0.75) {
        if (lat > best.r * 0.35) return { seg: 'L2', nerve: 'latFemCut' };
        if (lat < -best.r * 0.35) return { seg: 'L3', nerve: 'obturator' };
        return { seg: best.t < 0.5 ? 'L2' : 'L3', nerve: 'femoralN' };
      }
      return { seg: lat < -best.r * 0.2 ? 'L4' : 'L3', nerve: lat < -best.r * 0.2 ? 'saphenousN' : 'femoralN' };
    case 'shin':
      if (best.t < 0.12) return back ? { seg: 'S2', nerve: null } : { seg: lat < 0 ? 'L4' : 'L3', nerve: lat < 0 ? 'saphenousN' : 'femoralN' };
      if (back) return lat >= 0 ? { seg: 'S1', nerve: 'sural' } : { seg: 'S2', nerve: null };
      if (lat < -best.r * 0.1) return { seg: 'L4', nerve: 'saphenousN' };
      return { seg: 'L5', nerve: best.t < 0.3 ? 'peroneal' : 'supPeroneal' };
    case 'foot': {
      const sole = y - best.c[1] < -best.r * 0.35;
      if (best.t < 0.2 && z < J('ankle')[2]) return { seg: 'S1', nerve: 'tibialN' };    // pata
      if (lat > best.r * 0.45) return { seg: 'S1', nerve: 'sural' };                      // zevní hrana
      if (sole) return lat < 0 ? { seg: 'L5', nerve: 'plantarMed' } : { seg: 'S1', nerve: 'plantarLat' };
      if (lat < -best.r * 0.55 && best.t < 0.5) return { seg: 'L4', nerve: 'saphenousN' }; // vnitřní hrana
      return { seg: 'L5', nerve: 'supPeroneal' };
    }
    default: {
      if (best.id.startsWith('finger')) {
        const i = +best.id.slice(6);
        const palm = z - best.c[2] > -0.003;
        const segName = ['C6', 'C6', 'C7', 'C8', 'C8'][i];
        const nerve = i >= 3 ? 'ulnarN' : palm ? 'median' : (i === 0 || i === 1 ? 'radialN' : 'median');
        return { seg: segName, nerve };
      }
      if (best.id.startsWith('toe')) {
        const i = +best.id.slice(3);
        const sole = y - best.c[1] < -0.004;
        if (i === 4) return { seg: 'S1', nerve: sole ? 'plantarLat' : 'sural' };
        if (sole) return { seg: i === 3 ? 'S1' : 'L5', nerve: i === 3 ? 'plantarLat' : 'plantarMed' };
        return { seg: 'L5', nerve: i === 0 ? 'deepPeroneal' : 'supPeroneal' };
      }
      return { seg: 'Th10', nerve: null };
    }
  }
}

/** Barva dermatomu (hex) pro vizualizaci. */
export function dermatomeColor(seg) {
  const i = DERMATOME_ORDER.indexOf(seg);
  if (i < 0) return '#cccccc';
  // zlatý úhel – sousední segmenty dostanou výrazně odlišné odstíny
  const hue = (i * 137.508 + 20) % 360;
  const light = i % 3 === 0 ? 56 : i % 3 === 1 ? 66 : 74;
  return `hsl(${hue.toFixed(0)}, 60%, ${light}%)`;
}
