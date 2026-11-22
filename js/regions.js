// Tělesné oblasti a jejich určení z bodu na postavě.
// Modul je záměrně bez závislosti na Three.js, aby šel testovat v Node.

// Klouby levé strany postavy (x > 0). Pravá strana = zrcadlení přes x.
// Jednotky ~ metry, postava je vysoká cca 1,78 m, chodidla na y = 0,
// postava je otočená obličejem ke kladné ose z.
export const SKELETON = {
  shoulder: [0.19, 1.42, 0],
  elbow: [0.26, 1.13, -0.01],
  wrist: [0.31, 0.87, 0.01],
  hand: [0.335, 0.75, 0.015],
  hip: [0.09, 0.93, 0],
  knee: [0.1, 0.51, 0.01],
  ankle: [0.105, 0.08, -0.01],
  toe: [0.11, 0.015, 0.15],
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

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

// Vzdálenost bodu od úsečky (s volitelným zploštěním v ose z) a parametr t.
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
  const side = Math.abs(x) < 0.03 ? 'stred' : x < 0 ? 'prava' : 'leva';

  if (y > 1.555) return { region: 'hlava', side };

  const segs = [
    { id: 'arm_upper', a: joint('shoulder', s), b: joint('elbow', s), r: 0.05 },
    { id: 'arm_fore', a: joint('elbow', s), b: joint('wrist', s), r: 0.04 },
    { id: 'hand', a: joint('wrist', s), b: joint('hand', s), r: 0.035 },
    { id: 'thigh', a: joint('hip', s), b: joint('knee', s), r: 0.08 },
    { id: 'shin', a: joint('knee', s), b: joint('ankle', s), r: 0.055 },
    { id: 'foot', a: joint('ankle', s), b: joint('toe', s), r: 0.045 },
    { id: 'torso', a: [0, 0.9, 0], b: [0, 1.44, 0], r: 0.17, zScale: 0.62 },
    { id: 'neck', a: [0, 1.44, 0], b: [0, 1.56, 0], r: 0.06 },
  ];

  let best = null;
  for (const sg of segs) {
    const info = segInfo(p, sg.a, sg.b, sg.zScale || 1);
    const score = info.dist / sg.r;
    if (!best || score < best.score) best = { ...sg, ...info, score };
  }

  const ax = Math.abs(x);
  let region;
  switch (best.id) {
    case 'arm_upper': region = best.t < 0.8 ? 'rameno' : 'loket'; break;
    case 'arm_fore': region = best.t < 0.55 ? 'loket' : 'zapesti'; break;
    case 'hand': region = 'zapesti'; break;
    case 'thigh': region = best.t < 0.4 ? 'kycel' : 'koleno'; break;
    case 'shin': region = best.t < 0.3 ? 'koleno' : 'kotnik'; break;
    case 'foot': region = 'kotnik'; break;
    case 'neck': region = 'krk'; break;
    case 'torso': {
      if (y > 1.34 && ax > 0.13) region = 'rameno';
      else if (y > 1.4) region = 'krk';
      else if (z < 0) {
        if (y > 1.13) region = 'horni_zada';
        else if (y < 0.98 && ax > 0.06) region = 'kycel';
        else region = 'bedra';
      } else {
        if (y > 1.12) region = 'hrudnik';
        else if (y < 0.98 && ax > 0.07) region = 'kycel';
        else region = 'bricho';
      }
      break;
    }
    default: region = 'bedra';
  }
  return { region, side };
}
