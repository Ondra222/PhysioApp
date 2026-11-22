// Tělesné oblasti a jejich určení z bodu na postavě.
// Bez závislosti na Three.js, aby šel modul testovat v Node.
//
// Souřadnice: metry, chodidla na y = 0, obličej ke +z, pravá strana těla = -x.
// Klouby vycházejí z kostí anatomického modelu (js/landmarks.js).
import { LM } from './landmarks.js';

const J = (name) => LM[`${name}_left`];

// Klouby levé strany (x > 0); pravá strana se získá zrcadlením přes x.
export const SKELETON = {
  shoulder: J('shoulder'),
  elbow: J('elbow'),
  wrist: J('wrist'),
  hand: J('hand'),
  hip: J('hip'),
  knee: J('knee'),
  ankle: J('ankle'),
  toe: J('toe'),
};

export function joint(name, s = 1) {
  const j = SKELETON[name];
  return [j[0] * s, j[1], j[2]];
}

export const REGIONS = {
  hlava: { name: 'Hlava' },
  krk: { name: 'Krk a šíje' },
  rameno: { name: 'Rameno a paže' },
  hrudnik: { name: 'Hrudník' },
  horni_zada: { name: 'Horní záda (hrudní páteř)' },
  bricho: { name: 'Břicho' },
  bedra: { name: 'Bedra (bederní páteř)' },
  loket: { name: 'Loket a předloktí' },
  zapesti: { name: 'Zápěstí a ruka' },
  kycel: { name: 'Kyčel a hýždě' },
  koleno: { name: 'Koleno a stehno' },
  kotnik: { name: 'Bérec, kotník a chodidlo' },
};

export const SIDES = { leva: 'levá strana', prava: 'pravá strana', stred: 'střed' };

// Výškové hranice oblastí trupu (m)
export const LEVELS = {
  head: 1.5,        // nad bradou / C1
  neckBase: 1.335,  // kořen krku (šíje)
  shoulder: 1.27,   // spodní hranice ramene
  thoracic: 1.09,   // přechod hrudní/bederní páteře (Th12)
  pelvis: 0.875,    // hýždě / třísla
};

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

function segInfo(p, a, b, zScale = 1) {
  const ab = sub(b, a);
  const ap = sub(p, a);
  let t = dot(ap, ab) / dot(ab, ab);
  t = Math.max(0, Math.min(1, t));
  const c = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
  const d = sub(p, c);
  d[2] /= zScale;
  return { t, dist: Math.hypot(d[0], d[1], d[2]) };
}

/**
 * Určí tělesnou oblast a stranu z bodu [x, y, z] na povrchu postavy.
 * @returns {{region: string, side: 'leva'|'prava'|'stred'}}
 */
export function detectRegion(p) {
  const [x, y, z] = p;
  const s = x < 0 ? -1 : 1;
  const side = Math.abs(x) < 0.025 ? 'stred' : x < 0 ? 'prava' : 'leva';

  if (y > LEVELS.head || (y > 1.44 && z > 0.06)) return { region: 'hlava', side };

  const segs = [
    { id: 'arm_upper', a: joint('shoulder', s), b: joint('elbow', s), r: 0.045 },
    { id: 'arm_fore', a: joint('elbow', s), b: joint('wrist', s), r: 0.037 },
    { id: 'hand', a: joint('wrist', s), b: joint('hand', s), r: 0.035 },
    { id: 'thigh', a: joint('hip', s), b: joint('knee', s), r: 0.075 },
    { id: 'shin', a: joint('knee', s), b: joint('ankle', s), r: 0.05 },
    { id: 'foot', a: joint('ankle', s), b: joint('toe', s), r: 0.045 },
    { id: 'torso', a: [0, 0.8, 0.015], b: [0, 1.36, 0], r: 0.15, zScale: 0.8 },
    { id: 'neck', a: [0, 1.36, 0], b: [0, 1.5, 0], r: 0.06 },
  ];

  let best = null;
  for (const sg of segs) {
    const info = segInfo(p, sg.a, sg.b, sg.zScale || 1);
    const score = info.dist / sg.r;
    if (!best || score < best.score) best = { ...sg, ...info, score };
  }

  const ax = Math.abs(x);
  const back = z < 0.005;
  let region;
  switch (best.id) {
    case 'arm_upper': region = best.t < 0.8 ? 'rameno' : 'loket'; break;
    case 'arm_fore': region = best.t < 0.5 ? 'loket' : 'zapesti'; break;
    case 'hand': region = 'zapesti'; break;
    case 'thigh': region = best.t < 0.35 ? 'kycel' : 'koleno'; break;
    case 'shin': region = best.t < 0.25 ? 'koleno' : 'kotnik'; break;
    case 'foot': region = 'kotnik'; break;
    case 'neck': region = 'krk'; break;
    case 'torso': {
      if (y > LEVELS.shoulder && ax > 0.11) region = 'rameno';
      else if (y > LEVELS.neckBase && (back || y > 1.37)) region = 'krk';
      else if (back) {
        if (y > LEVELS.thoracic) region = 'horni_zada';
        else if (y < LEVELS.pelvis && ax > 0.05) region = 'kycel';
        else region = 'bedra';
      } else if (y > LEVELS.thoracic) region = 'hrudnik';
      else if (y < LEVELS.pelvis && ax > 0.06) region = 'kycel';
      else region = 'bricho';
      break;
    }
    default: region = 'bedra';
  }
  return { region, side };
}
