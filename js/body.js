// Procedurální 3D model lidského těla rozdělený do vrstev.
// Zjednodušený (stylizovaný) model – každou strukturu lze později
// nahradit přesným anatomickým modelem (glTF) se stejnými userData.
import * as THREE from 'three';
import { joint } from './regions.js';

export const LAYER_DEFS = {
  skin: { name: 'Kůže', color: '#e8b896' },
  muscles: { name: 'Svaly', color: '#b5403a' },
  bones: { name: 'Kosti', color: '#ece4d0' },
  vessels: { name: 'Cévy', color: '#d8232a' },
  nerves: { name: 'Nervy', color: '#f2c94c' },
};

// ---------------------------------------------------------------------------
// Popisky struktur
// ---------------------------------------------------------------------------
const INFO = {
  skin: ['Kůže', 'Cutis', 'Největší orgán těla. Chrání před vnějším prostředím, reguluje teplotu a obsahuje receptory pro dotek, tlak, teplotu i bolest.'],

  deltoid: ['Deltový sval', 'M. deltoideus', 'Tvoří obrys ramene a zvedá paži do upažení, předpažení i zapažení. Častý zdroj bolesti při přetížení ramene.'],
  pec: ['Velký prsní sval', 'M. pectoralis major', 'Přitahuje paži k tělu a stáčí ji dovnitř. Při sedavém životě se zkracuje a táhne ramena dopředu.'],
  biceps: ['Dvojhlavý sval pažní', 'M. biceps brachii', 'Ohýbá loket a otáčí předloktí dlaní nahoru. Jeho dlouhá šlacha prochází ramenním kloubem.'],
  triceps: ['Trojhlavý sval pažní', 'M. triceps brachii', 'Natahuje loket. Je hlavním svalem při kliku a odtlačování.'],
  flexors: ['Ohýbače zápěstí a prstů', 'Mm. flexores antebrachii', 'Svaly na vnitřní straně předloktí. Ohýbají zápěstí a prsty; jejich přetížení vede ke „golfovému lokti“.'],
  extensors: ['Natahovače zápěstí a prstů', 'Mm. extensores antebrachii', 'Svaly na hřbetní straně předloktí. Přetížení při práci s myší či nářadím způsobuje „tenisový loket“.'],
  rectus: ['Přímý sval břišní', 'M. rectus abdominis', 'Ohýbá trup vpřed a spolu s ostatními břišními svaly stabilizuje páteř.'],
  obliques: ['Šikmé břišní svaly', 'Mm. obliqui abdominis', 'Otáčejí a uklánějí trup, podílejí se na stabilitě bederní páteře a na dýchání.'],
  trap: ['Trapézový sval', 'M. trapezius', 'Velký plochý sval šíje a horní části zad. Hýbe lopatkou a drží ramena.'],
  trapUpper: ['Trapézový sval – horní část', 'M. trapezius, pars descendens', 'Zvedá ramena. Při stresu a práci u počítače bývá ztuhlý a bolestivý a často stojí za tenzní bolestí hlavy.'],
  rhomboid: ['Rombické svaly', 'Mm. rhomboidei', 'Přitahují lopatky k páteři. Jejich oslabení přispívá ke „kulatým zádům“.'],
  lat: ['Široký sval zádový', 'M. latissimus dorsi', 'Největší sval zad. Přitahuje paži k tělu a dozadu, např. při shybu nebo veslování.'],
  erector: ['Vzpřimovač páteře', 'M. erector spinae', 'Dlouhé svaly podél páteře, které ji vzpřimují a drží. Při přetížení se stahují a bolí v bedrech.'],
  scm: ['Zdvihač hlavy', 'M. sternocleidomastoideus', 'Otáčí a uklání hlavu. Při předsunutém držení hlavy bývá přetížený.'],
  rotator: ['Rotátorová manžeta (nadhřebenový sval)', 'M. supraspinatus', 'Skupina malých svalů, které drží hlavici ramenního kloubu. Častý zdroj bolesti při zvedání paže.'],
  gluteMax: ['Velký sval hýžďový', 'M. gluteus maximus', 'Nejsilnější sval těla. Natahuje kyčel – při chůzi do schodů, vstávání či běhu.'],
  gluteMed: ['Střední sval hýžďový', 'M. gluteus medius', 'Stabilizuje pánev při stoji na jedné noze. Jeho slabost přispívá k bolesti kyčle, kolena i beder.'],
  quad: ['Čtyřhlavý sval stehenní', 'M. quadriceps femoris', 'Natahuje koleno a chrání ho. Po zranění kolena rychle ochabuje.'],
  ham: ['Hamstringy (zadní stehenní svaly)', 'M. biceps femoris, m. semitendinosus, m. semimembranosus', 'Ohýbají koleno a natahují kyčel. Zkrácené hamstringy omezují předklon.'],
  adductor: ['Přitahovače stehna', 'Mm. adductores', 'Přitahují nohu k ose těla. Natažení třísel je častým sportovním zraněním.'],
  gastro: ['Dvojhlavý sval lýtkový', 'M. gastrocnemius', 'Zvedá patu (výpon) a pomáhá ohýbat koleno. Přechází v Achillovu šlachu.'],
  tibAnt: ['Přední sval holenní', 'M. tibialis anterior', 'Zvedá špičku nohy. Přetížení způsobuje bolest na přední straně bérce.'],
  achilles: ['Achillova šlacha', 'Tendo calcaneus', 'Nejsilnější šlacha těla, spojuje lýtkové svaly s patní kostí.'],

  skull: ['Lebka', 'Cranium', 'Chrání mozek a smyslové orgány.'],
  mandible: ['Dolní čelist', 'Mandibula', 'Jediná pohyblivá kost lebky. Napětí žvýkacích svalů může souviset s bolestí hlavy a krku.'],
  vertC: ['Krční obratel', 'Vertebra cervicalis', 'Sedm krčních obratlů nese hlavu a umožňuje velký rozsah pohybu krku.'],
  vertTh: ['Hrudní obratel', 'Vertebra thoracica', 'Dvanáct hrudních obratlů, ke kterým se připojují žebra.'],
  vertL: ['Bederní obratel', 'Vertebra lumbalis', 'Pět největších obratlů nese váhu horní části těla. Mezi nimi jsou ploténky, jejichž výhřez může způsobit bolest vystřelující do nohy.'],
  sacrum: ['Kost křížová', 'Os sacrum', 'Spojuje páteř s pánví prostřednictvím křížokyčelních kloubů.'],
  rib: ['Žebro', 'Costa', '12 párů žeber tvoří hrudní koš, chrání srdce a plíce a pohybuje se při dýchání.'],
  sternum: ['Hrudní kost', 'Sternum', 'Plochá kost uprostřed hrudníku, ke které se připojují žebra a klíční kosti.'],
  clavicle: ['Klíční kost', 'Clavicula', 'Spojuje hrudní kost s lopatkou. Patří mezi nejčastěji zlomené kosti.'],
  scapula: ['Lopatka', 'Scapula', 'Plochá kost na zádech, kloubně spojená s kostí pažní. Její postavení ovlivňuje funkci ramene.'],
  ilium: ['Kost kyčelní', 'Os ilium', 'Tvoří lopatu pánve, upínají se na ni hýžďové a břišní svaly.'],
  pelvicRing: ['Kost stydká a sedací', 'Os pubis, os ischii', 'Spodní část pánve. Na sedací hrboly se upínají hamstringy.'],
  humerus: ['Kost pažní', 'Humerus', 'Dlouhá kost paže. Její hlavice tvoří ramenní kloub, dolní konec loketní kloub.'],
  radius: ['Kost vřetenní', 'Radius', 'Kost předloktí na straně palce. Otáčí se kolem kosti loketní.'],
  ulna: ['Kost loketní', 'Ulna', 'Kost předloktí na straně malíčku, tvoří hrot lokte.'],
  handBones: ['Kosti ruky', 'Ossa manus', '27 kostí: zápěstní kůstky, záprstní kosti a články prstů.'],
  femur: ['Kost stehenní', 'Femur', 'Nejdelší a nejsilnější kost těla. Její hlavice tvoří kyčelní kloub.'],
  patella: ['Čéška', 'Patella', 'Kost ve šlaše čtyřhlavého svalu, zlepšuje páku při natažení kolena.'],
  tibia: ['Kost holenní', 'Tibia', 'Hlavní nosná kost bérce, na přední straně hmatná pod kůží.'],
  fibula: ['Kost lýtková', 'Fibula', 'Tenká kost na vnější straně bérce, tvoří zevní kotník.'],
  footBones: ['Kosti nohy', 'Ossa pedis', '26 kostí tvořících klenbu nohy, včetně kosti patní a hlezenní.'],

  heart: ['Srdce', 'Cor', 'Svalová pumpa, která v klidu přečerpá zhruba 5 litrů krve za minutu.'],
  aorta: ['Srdečnice (aorta)', 'Aorta', 'Největší tepna těla, vede okysličenou krev ze srdce do celého těla.'],
  carotid: ['Společná krkavice', 'A. carotis communis', 'Zásobuje krví hlavu a mozek. Na krku je hmatný její tep.'],
  subclavian: ['Podklíčková tepna', 'A. subclavia', 'Vede krev do horní končetiny. Prochází úzkým prostorem mezi klíční kostí a prvním žebrem.'],
  brachialA: ['Pažní tepna', 'A. brachialis', 'Hlavní tepna paže, měří se na ní krevní tlak.'],
  radialA: ['Vřetenní tepna', 'A. radialis', 'Tepna na straně palce, na zápěstí se na ní měří tep.'],
  ulnarA: ['Loketní tepna', 'A. ulnaris', 'Tepna na straně malíčku, zásobuje ruku.'],
  iliacA: ['Společná kyčelní tepna', 'A. iliaca communis', 'Vzniká rozdělením aorty a vede krev do pánve a dolní končetiny.'],
  femoralA: ['Stehenní tepna', 'A. femoralis', 'Hlavní tepna stehna. Její tep je hmatný v třísle.'],
  poplitealA: ['Podkolenní tepna', 'A. poplitea', 'Prochází v podkolenní jamce za kolenem.'],
  tibialA: ['Zadní holenní tepna', 'A. tibialis posterior', 'Zásobuje lýtko a chodidlo, tep je hmatný za vnitřním kotníkem.'],
  cava: ['Dutá žíla', 'V. cava superior et inferior', 'Největší žíly těla, přivádějí odkysličenou krev zpět do srdce.'],
  jugular: ['Vnitřní hrdelní žíla', 'V. jugularis interna', 'Odvádí krev z mozku a hlavy.'],
  cephalic: ['Hlavová žíla', 'V. cephalica', 'Povrchová žíla na vnější straně paže.'],
  saphena: ['Velká skrytá žíla', 'V. saphena magna', 'Nejdelší žíla těla na vnitřní straně nohy. Při oslabení jejích chlopní vznikají křečové žíly.'],
  femoralV: ['Stehenní žíla', 'V. femoralis', 'Hluboká žíla stehna. Trombóza hlubokých žil se projevuje otokem, bolestí a teplem končetiny.'],

  brain: ['Mozek', 'Encephalon', 'Řídicí centrum nervové soustavy. Teprve zde vzniká vědomé vnímání bolesti.'],
  spinalCord: ['Mícha', 'Medulla spinalis', 'Vede signály mezi mozkem a tělem. Mezi obratli z ní vystupují míšní nervy.'],
  plexus: ['Pažní pleteň', 'Plexus brachialis', 'Svazek nervů z krční páteře do paže. Útlak v oblasti krku či ramene může vyvolat brnění ruky.'],
  median: ['Středový nerv', 'N. medianus', 'Prochází karpálním tunelem v zápěstí. Jeho útlak (syndrom karpálního tunelu) způsobuje brnění palce, ukazováku a prostředníku.'],
  ulnarN: ['Loketní nerv', 'N. ulnaris', 'Prochází za vnitřní stranou lokte („brňavka“). Útlak vyvolává brnění malíčku a prsteníku.'],
  radialN: ['Vřetenní nerv', 'N. radialis', 'Obtáčí kost pažní a ovládá natahovače zápěstí a prstů.'],
  sciatic: ['Sedací nerv', 'N. ischiadicus', 'Nejsilnější nerv těla. Jeho podráždění (ischias) způsobuje bolest a brnění vystřelující z hýždě do nohy.'],
  tibialN: ['Holenní nerv', 'N. tibialis', 'Pokračování sedacího nervu v lýtku, ovládá lýtkové svaly a zajišťuje citlivost chodidla.'],
  peroneal: ['Společný lýtkový nerv', 'N. fibularis communis', 'Obtáčí hlavici kosti lýtkové těsně pod kůží – při útlaku (např. přehozením nohy přes nohu) vzniká brnění nártu.'],
  femoralN: ['Stehenní nerv', 'N. femoralis', 'Ovládá čtyřhlavý sval stehna a zajišťuje citlivost přední strany stehna.'],
};

// ---------------------------------------------------------------------------
// Geometrické pomocníky
// ---------------------------------------------------------------------------
const UP = new THREE.Vector3(0, 1, 0);
const V = (a) => (a instanceof THREE.Vector3 ? a.clone() : new THREE.Vector3(a[0], a[1], a[2]));
const SPHERE = new THREE.SphereGeometry(1, 28, 18);

function orient(mesh, a, b) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  return len;
}

function ellipsoidBetween(a, b, r, mat, rz = r) {
  const m = new THREE.Mesh(SPHERE, mat);
  const len = orient(m, V(a), V(b));
  m.scale.set(r, len / 2, rz);
  return m;
}

function ellipsoidAt(c, rx, ry, rz, mat, rot = [0, 0, 0]) {
  const m = new THREE.Mesh(SPHERE, mat);
  m.position.copy(V(c));
  m.scale.set(rx, ry, rz);
  m.rotation.set(rot[0], rot[1], rot[2]);
  return m;
}

function taper(a, b, rA, rB, mat) {
  const A = V(a), B = V(b);
  const len = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rB, rA, len, 28, 1, true), mat);
  orient(m, A, B);
  return m;
}

function capsule(a, b, r, mat) {
  const A = V(a), B = V(b);
  const len = Math.max(0.001, A.distanceTo(B) - 2 * r);
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), mat);
  orient(m, A, B);
  return m;
}

function tube(points, r, mat, seg = 64) {
  const curve = new THREE.CatmullRomCurve3(points.map(V));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, 10, false), mat);
}

const add3 = (p, d) => [p[0] + d[0], p[1] + d[1], p[2] + d[2]];
const mx = (p, s) => [p[0] * s, p[1], p[2]]; // zrcadlení podle strany

// ---------------------------------------------------------------------------
// Stavba těla
// ---------------------------------------------------------------------------
export function buildBody() {
  const root = new THREE.Group();
  const layers = {};
  for (const key of Object.keys(LAYER_DEFS)) {
    const g = new THREE.Group();
    g.name = key;
    layers[key] = g;
    root.add(g);
  }
  const pickables = [];

  const M = {
    skin: new THREE.MeshStandardMaterial({
      color: 0xe8b896, roughness: 0.75, metalness: 0, transparent: true, opacity: 0.3, depthWrite: false,
    }),
    muscle: new THREE.MeshStandardMaterial({ color: 0xb5403a, roughness: 0.55 }),
    tendon: new THREE.MeshStandardMaterial({ color: 0xe9dcc4, roughness: 0.5 }),
    bone: new THREE.MeshStandardMaterial({ color: 0xeee6d2, roughness: 0.8 }),
    artery: new THREE.MeshStandardMaterial({ color: 0xd8232a, roughness: 0.4 }),
    vein: new THREE.MeshStandardMaterial({ color: 0x2f5fd0, roughness: 0.4 }),
    heart: new THREE.MeshStandardMaterial({ color: 0xa3141b, roughness: 0.45 }),
    nerve: new THREE.MeshStandardMaterial({ color: 0xf2c94c, roughness: 0.4, emissive: 0x3a2a00 }),
    brain: new THREE.MeshStandardMaterial({ color: 0xe9a3b0, roughness: 0.6 }),
  };

  /** Zaregistruje mesh do vrstvy s popiskem. */
  function reg(mesh, layer, key, side = null, extra = {}) {
    const [name, latin, desc] = INFO[key];
    mesh.material = mesh.material.clone();
    mesh.userData = { layer, key, name, latin, desc, side, ...extra };
    if (layer === 'skin') mesh.renderOrder = 2;
    layers[layer].add(mesh);
    pickables.push(mesh);
    return mesh;
  }

  const sides = [1, -1];
  const sideName = (s) => (s < 0 ? 'prava' : 'leva');

  // ---------------- KŮŽE ----------------
  reg(ellipsoidAt([0, 1.655, 0.005], 0.085, 0.115, 0.1, M.skin), 'skin', 'skin');
  {
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.035, 12), M.skin);
    nose.position.set(0, 1.645, 0.105);
    nose.rotation.x = Math.PI / 2.4;
    reg(nose, 'skin', 'skin');
  }
  reg(taper([0, 1.4, -0.005], [0, 1.58, -0.005], 0.058, 0.058, M.skin), 'skin', 'skin');
  {
    const profile = [
      [0.001, 0.86], [0.12, 0.87], [0.17, 0.9], [0.185, 0.95], [0.175, 1.01], [0.155, 1.07], [0.152, 1.12],
      [0.165, 1.2], [0.18, 1.28], [0.188, 1.35], [0.185, 1.4], [0.16, 1.435], [0.1, 1.455], [0.06, 1.46], [0.001, 1.46],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const geo = new THREE.LatheGeometry(profile, 56);
    geo.scale(1, 1, 0.62);
    reg(new THREE.Mesh(geo, M.skin), 'skin', 'skin');
  }
  {
    const sh = ellipsoidBetween([-0.19, 1.425, -0.005], [0.19, 1.425, -0.005], 0.055, M.skin, 0.05);
    reg(sh, 'skin', 'skin');
  }
  for (const s of sides) {
    const S = joint('shoulder', s), E = joint('elbow', s), W = joint('wrist', s), H = joint('hand', s);
    const Hp = joint('hip', s), K = joint('knee', s), A = joint('ankle', s);
    const sd = sideName(s);
    reg(ellipsoidAt(mx([0.072, 0.91, -0.05], s), 0.078, 0.082, 0.066, M.skin), 'skin', 'skin', sd);
    reg(ellipsoidAt(S, 0.055, 0.055, 0.055, M.skin), 'skin', 'skin', sd);
    reg(taper(S, E, 0.053, 0.042, M.skin), 'skin', 'skin', sd);
    reg(ellipsoidAt(E, 0.0414, 0.0414, 0.0414, M.skin), 'skin', 'skin', sd);
    reg(taper(E, W, 0.042, 0.029, M.skin), 'skin', 'skin', sd);
    reg(ellipsoidBetween(add3(W, [0, 0.015, 0]), add3(H, [0.004 * s, -0.03, 0]), 0.034, M.skin, 0.016), 'skin', 'skin', sd);
    reg(ellipsoidAt(Hp, 0.085, 0.085, 0.08, M.skin), 'skin', 'skin', sd);
    reg(taper(Hp, K, 0.086, 0.058, M.skin), 'skin', 'skin', sd);
    reg(ellipsoidAt(K, 0.0572, 0.0572, 0.0572, M.skin), 'skin', 'skin', sd);
    reg(taper(K, A, 0.058, 0.036, M.skin), 'skin', 'skin', sd);
    reg(ellipsoidAt(A, 0.0354, 0.0354, 0.0354, M.skin), 'skin', 'skin', sd);
    {
      const foot = ellipsoidBetween(mx([0.105, 0.034, -0.05], s), mx([0.112, 0.026, 0.165], s), 0.044, M.skin, 0.03);
      reg(foot, 'skin', 'skin', sd);
    }
    reg(ellipsoidAt(mx([0.086, 1.655, -0.005], s), 0.012, 0.03, 0.02, M.skin), 'skin', 'skin', sd);
  }

  // ---------------- SVALY ----------------
  for (const s of sides) {
    const sd = sideName(s);
    const P = (p) => mx(p, s);
    reg(ellipsoidAt(P([0.195, 1.395, 0.0]), 0.04, 0.072, 0.048, M.muscle, [0, 0, s * 0.25]), 'muscles', 'deltoid', sd);
    reg(ellipsoidAt(P([0.075, 1.33, 0.058]), 0.072, 0.052, 0.026, M.muscle, [0, 0, s * -0.2]), 'muscles', 'pec', sd);
    reg(ellipsoidBetween(P([0.212, 1.34, 0.012]), P([0.252, 1.165, 0.014]), 0.022, M.muscle), 'muscles', 'biceps', sd);
    reg(ellipsoidBetween(P([0.203, 1.35, -0.016]), P([0.25, 1.16, -0.022]), 0.023, M.muscle), 'muscles', 'triceps', sd);
    reg(ellipsoidBetween(P([0.262, 1.1, 0.012]), P([0.302, 0.915, 0.014]), 0.02, M.muscle), 'muscles', 'flexors', sd);
    reg(ellipsoidBetween(P([0.272, 1.1, -0.02]), P([0.307, 0.915, -0.008]), 0.019, M.muscle), 'muscles', 'extensors', sd);
    reg(ellipsoidAt(P([0.033, 1.13, 0.07]), 0.032, 0.15, 0.018, M.muscle), 'muscles', 'rectus', sd);
    reg(ellipsoidAt(P([0.105, 1.1, 0.03]), 0.03, 0.09, 0.03, M.muscle), 'muscles', 'obliques', sd);
    reg(ellipsoidAt(P([0.06, 1.33, -0.064]), 0.072, 0.1, 0.022, M.muscle), 'muscles', 'trap', sd);
    reg(ellipsoidBetween(P([0.035, 1.47, -0.03]), P([0.14, 1.428, -0.022]), 0.014, M.muscle), 'muscles', 'trapUpper', sd);
    reg(ellipsoidAt(P([0.055, 1.3, -0.072]), 0.032, 0.05, 0.011, M.muscle), 'muscles', 'rhomboid', sd);
    reg(ellipsoidAt(P([0.08, 1.2, -0.048]), 0.045, 0.1, 0.018, M.muscle, [0, 0, s * 0.15]), 'muscles', 'lat', sd);
    reg(ellipsoidBetween(P([0.028, 0.98, -0.064]), P([0.028, 1.36, -0.074]), 0.017, M.muscle), 'muscles', 'erector', sd);
    reg(ellipsoidBetween(P([0.022, 1.425, 0.043]), P([0.055, 1.565, -0.01]), 0.012, M.muscle), 'muscles', 'scm', sd);
    reg(ellipsoidBetween(P([0.06, 1.42, -0.05]), P([0.165, 1.435, -0.008]), 0.011, M.muscle), 'muscles', 'rotator', sd);
    reg(ellipsoidAt(P([0.07, 0.915, -0.064]), 0.064, 0.07, 0.04, M.muscle), 'muscles', 'gluteMax', sd);
    reg(ellipsoidAt(P([0.125, 0.975, -0.025]), 0.033, 0.05, 0.042, M.muscle), 'muscles', 'gluteMed', sd);
    reg(ellipsoidBetween(P([0.098, 0.88, 0.025]), P([0.1, 0.56, 0.035]), 0.04, M.muscle), 'muscles', 'quad', sd);
    reg(ellipsoidBetween(P([0.09, 0.85, -0.028]), P([0.1, 0.57, -0.022]), 0.036, M.muscle), 'muscles', 'ham', sd);
    reg(ellipsoidBetween(P([0.045, 0.86, 0.005]), P([0.085, 0.62, 0.0]), 0.028, M.muscle), 'muscles', 'adductor', sd);
    reg(ellipsoidBetween(P([0.1, 0.47, -0.015]), P([0.105, 0.23, -0.015]), 0.03, M.muscle), 'muscles', 'gastro', sd);
    reg(ellipsoidBetween(P([0.112, 0.45, 0.022]), P([0.103, 0.14, 0.02]), 0.014, M.muscle), 'muscles', 'tibAnt', sd);
    reg(capsule(P([0.105, 0.24, -0.028]), P([0.105, 0.04, -0.038]), 0.007, M.tendon), 'muscles', 'achilles', sd);
  }

  // ---------------- KOSTI ----------------
  reg(ellipsoidAt([0, 1.665, 0], 0.075, 0.095, 0.09, M.bone), 'bones', 'skull');
  reg(ellipsoidAt([0, 1.585, 0.035], 0.05, 0.025, 0.05, M.bone), 'bones', 'mandible');

  // Páteř
  const spineCurve = new THREE.CatmullRomCurve3(
    [[0, 0.99, -0.056], [0, 1.08, -0.05], [0, 1.18, -0.065], [0, 1.3, -0.075], [0, 1.4, -0.06], [0, 1.47, -0.035], [0, 1.56, -0.03]].map(V),
  );
  const VERT_COUNT = 24;
  for (let i = 0; i < VERT_COUNT; i++) {
    const t = (i + 0.5) / VERT_COUNT;
    const p = spineCurve.getPointAt(t);
    const tan = spineCurve.getTangentAt(t);
    let key, label, r, h;
    if (i < 5) { key = 'vertL'; label = `L${5 - i}`; r = 0.021; h = 0.017; }
    else if (i < 17) { key = 'vertTh'; label = `Th${17 - i}`; r = 0.016; h = 0.016; }
    else { key = 'vertC'; label = `C${24 - i}`; r = 0.012; h = 0.014; }
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), M.bone);
    body.position.copy(p);
    body.quaternion.setFromUnitVectors(UP, tan);
    const extra = { label };
    reg(body, 'bones', key, null, extra);
    const proc = capsule([0, p.y, p.z - r * 0.6], [0, p.y - h * 0.6, p.z - r - 0.018], 0.004, M.bone);
    reg(proc, 'bones', key, null, extra);
  }
  reg(ellipsoidAt([0, 0.94, -0.07], 0.035, 0.055, 0.016, M.bone, [-0.35, 0, 0]), 'bones', 'sacrum');

  // Hrudní koš
  const ribW = [0.09, 0.11, 0.125, 0.135, 0.14, 0.145, 0.145, 0.14, 0.135, 0.13, 0.12, 0.11];
  for (const s of sides) {
    const sd = sideName(s);
    for (let k = 0; k < 12; k++) {
      const y0 = 1.395 - k * 0.022;
      const w = ribW[k];
      const pts = [
        [0.015, y0, -0.068],
        [w * 0.6, y0 + 0.004, -0.085],
        [w, y0 - 0.02, -0.03],
        [w * 0.9, y0 - 0.045, 0.045],
      ];
      if (k < 7) pts.push([w * 0.5, y0 - 0.06, 0.088], [0.018, y0 - 0.055 - k * 0.004, 0.095]);
      else if (k < 10) pts.push([w * 0.55, y0 - 0.075, 0.08]);
      const rib = tube(pts.map((p) => mx(p, s)), 0.0055, M.bone, 48);
      reg(rib, 'bones', 'rib', sd, { label: `${k + 1}. žebro` });
    }
    reg(tube([[0.02, 1.425, 0.085], [0.09, 1.435, 0.075], [0.175, 1.445, 0.0]].map((p) => mx(p, s)), 0.007, M.bone, 24), 'bones', 'clavicle', sd);
    reg(ellipsoidAt(mx([0.105, 1.33, -0.083], s), 0.048, 0.065, 0.01, M.bone, [0, s * -0.35, 0]), 'bones', 'scapula', sd);
    reg(ellipsoidAt(mx([0.1, 0.99, -0.015], s), 0.055, 0.058, 0.012, M.bone, [0, s * 0.7, s * -0.25]), 'bones', 'ilium', sd);
  }
  reg(ellipsoidBetween([0, 1.4, 0.094], [0, 1.24, 0.097], 0.013, M.bone, 0.006), 'bones', 'sternum');
  {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.013, 10, 40), M.bone);
    ring.position.set(0, 0.905, -0.005);
    ring.rotation.x = Math.PI / 2 - 0.35;
    ring.scale.set(1, 0.75, 1);
    reg(ring, 'bones', 'pelvicRing');
  }
  for (const s of sides) {
    const sd = sideName(s);
    const S = joint('shoulder', s), E = joint('elbow', s), W = joint('wrist', s), H = joint('hand', s);
    const Hp = joint('hip', s), K = joint('knee', s), A = joint('ankle', s);
    reg(ellipsoidAt(add3(S, [-0.008 * s, -0.005, 0]), 0.022, 0.022, 0.022, M.bone), 'bones', 'humerus', sd);
    reg(capsule(S, E, 0.012, M.bone), 'bones', 'humerus', sd);
    reg(capsule(add3(E, [0.008 * s, -0.01, 0.006]), add3(W, [0.01 * s, 0, 0.005]), 0.008, M.bone), 'bones', 'radius', sd);
    reg(capsule(add3(E, [-0.006 * s, 0.005, -0.012]), add3(W, [-0.008 * s, 0, -0.003]), 0.008, M.bone), 'bones', 'ulna', sd);
    reg(ellipsoidBetween(add3(W, [0, 0.005, 0]), add3(H, [0.004 * s, -0.03, 0]), 0.026, M.bone, 0.008), 'bones', 'handBones', sd);
    reg(ellipsoidAt(Hp, 0.023, 0.023, 0.023, M.bone), 'bones', 'femur', sd);
    reg(capsule(add3(Hp, [0.004 * s, -0.01, 0]), K, 0.016, M.bone), 'bones', 'femur', sd);
    reg(ellipsoidAt(add3(K, [0, 0.008, 0.045]), 0.02, 0.025, 0.01, M.bone), 'bones', 'patella', sd);
    reg(capsule(add3(K, [0, -0.005, 0]), A, 0.014, M.bone), 'bones', 'tibia', sd);
    reg(capsule(add3(K, [0.024 * s, -0.03, -0.012]), add3(A, [0.022 * s, -0.005, -0.008]), 0.006, M.bone), 'bones', 'fibula', sd);
    reg(ellipsoidBetween(mx([0.105, 0.035, -0.04], s), mx([0.111, 0.02, 0.15], s), 0.032, M.bone, 0.016), 'bones', 'footBones', sd);
  }

  // ---------------- CÉVY ----------------
  reg(ellipsoidAt([0.025, 1.27, 0.035], 0.045, 0.055, 0.04, M.heart, [0, 0, -0.5]), 'vessels', 'heart');
  reg(tube([[0.02, 1.29, 0.04], [0.01, 1.355, 0.03], [-0.01, 1.365, -0.005], [0.0, 1.3, -0.035], [0.008, 1.15, -0.035], [0.005, 1.0, -0.03]], 0.0105, M.artery), 'vessels', 'aorta');
  reg(tube([[-0.005, 1.4, 0.022], [-0.012, 1.32, 0.04], [-0.015, 1.27, 0.03], [-0.016, 1.12, -0.022], [-0.016, 1.0, -0.025]], 0.009, M.vein), 'vessels', 'cava');
  for (const s of sides) {
    const sd = sideName(s);
    const P = (arr) => arr.map((p) => mx(p, s));
    reg(tube(P([[0.012, 1.36, 0.025], [0.028, 1.45, 0.03], [0.034, 1.55, 0.012], [0.04, 1.62, 0.0]]), 0.005, M.artery), 'vessels', 'carotid', sd);
    reg(tube(P([[0.045, 1.61, -0.005], [0.046, 1.5, 0.028], [0.026, 1.41, 0.03]]), 0.005, M.vein), 'vessels', 'jugular', sd);
    reg(tube(P([[0.01, 1.36, 0.02], [0.1, 1.415, 0.02], [0.185, 1.38, 0.0]]), 0.005, M.artery), 'vessels', 'subclavian', sd);
    reg(tube(P([[0.185, 1.38, 0.0], [0.232, 1.25, 0.022], [0.256, 1.135, 0.026]]), 0.0045, M.artery), 'vessels', 'brachialA', sd);
    reg(tube(P([[0.256, 1.135, 0.026], [0.288, 1.0, 0.03], [0.316, 0.885, 0.024]]), 0.0035, M.artery), 'vessels', 'radialA', sd);
    reg(tube(P([[0.256, 1.135, 0.022], [0.276, 1.0, 0.018], [0.298, 0.885, 0.018]]), 0.0035, M.artery), 'vessels', 'ulnarA', sd);
    reg(tube(P([[0.175, 1.405, 0.045], [0.235, 1.26, 0.038], [0.272, 1.1, 0.033], [0.31, 0.92, 0.026]]), 0.0035, M.vein), 'vessels', 'cephalic', sd);
    reg(tube(P([[0.004, 1.0, -0.028], [0.04, 0.96, -0.005], [0.07, 0.92, 0.02]]), 0.0065, M.artery), 'vessels', 'iliacA', sd);
    reg(tube(P([[0.07, 0.92, 0.02], [0.088, 0.86, 0.04], [0.083, 0.7, 0.025], [0.092, 0.58, -0.025]]), 0.0055, M.artery), 'vessels', 'femoralA', sd);
    reg(tube(P([[0.092, 0.58, -0.025], [0.1, 0.51, -0.035], [0.098, 0.44, -0.03]]), 0.005, M.artery), 'vessels', 'poplitealA', sd);
    reg(tube(P([[0.098, 0.44, -0.03], [0.095, 0.3, -0.028], [0.092, 0.1, -0.03], [0.1, 0.03, 0.04]]), 0.004, M.artery), 'vessels', 'tibialA', sd);
    reg(tube(P([[0.06, 0.92, 0.025], [0.078, 0.86, 0.042], [0.072, 0.7, 0.02], [0.085, 0.58, -0.03]]), 0.0055, M.vein), 'vessels', 'femoralV', sd);
    reg(tube(P([[0.065, 0.885, 0.05], [0.05, 0.7, 0.01], [0.07, 0.5, -0.02], [0.08, 0.3, 0.005], [0.086, 0.09, 0.028]]), 0.0035, M.vein), 'vessels', 'saphena', sd);
  }

  // ---------------- NERVY ----------------
  reg(ellipsoidAt([0, 1.675, -0.005], 0.068, 0.07, 0.085, M.brain), 'nerves', 'brain');
  {
    const cordPts = [];
    for (let i = 0; i <= 20; i++) {
      const p = spineCurve.getPointAt(i / 20);
      cordPts.push([0, p.y, p.z - 0.012]);
    }
    cordPts.push([0, 1.61, -0.01]);
    reg(tube(cordPts, 0.0055, M.nerve, 80), 'nerves', 'spinalCord');
  }
  for (const s of sides) {
    const sd = sideName(s);
    const P = (arr) => arr.map((p) => mx(p, s));
    reg(tube(P([[0.012, 1.48, -0.04], [0.08, 1.43, -0.005], [0.17, 1.375, -0.005]]), 0.005, M.nerve), 'nerves', 'plexus', sd);
    reg(tube(P([[0.17, 1.375, 0.0], [0.234, 1.25, 0.025], [0.257, 1.13, 0.031], [0.29, 0.98, 0.028], [0.316, 0.87, 0.022], [0.33, 0.8, 0.02]]), 0.0032, M.nerve), 'nerves', 'median', sd);
    reg(tube(P([[0.17, 1.375, -0.008], [0.222, 1.25, -0.012], [0.243, 1.13, -0.03], [0.275, 1.0, -0.004], [0.3, 0.87, 0.012], [0.31, 0.8, 0.012]]), 0.0032, M.nerve), 'nerves', 'ulnarN', sd);
    reg(tube(P([[0.17, 1.375, -0.015], [0.215, 1.28, -0.038], [0.268, 1.17, 0.002], [0.298, 1.0, 0.0], [0.323, 0.88, -0.004]]), 0.0032, M.nerve), 'nerves', 'radialN', sd);
    reg(tube(P([[0.015, 0.96, -0.07], [0.068, 0.88, -0.08], [0.09, 0.72, -0.05], [0.1, 0.56, -0.038]]), 0.0058, M.nerve), 'nerves', 'sciatic', sd);
    reg(tube(P([[0.1, 0.56, -0.038], [0.1, 0.4, -0.036], [0.1, 0.15, -0.032], [0.1, 0.06, -0.022], [0.105, 0.02, 0.05]]), 0.0038, M.nerve), 'nerves', 'tibialN', sd);
    reg(tube(P([[0.1, 0.56, -0.038], [0.126, 0.48, -0.012], [0.122, 0.4, 0.022], [0.112, 0.15, 0.028], [0.11, 0.04, 0.08]]), 0.0032, M.nerve), 'nerves', 'peroneal', sd);
    reg(tube(P([[0.028, 1.02, -0.035], [0.068, 0.93, 0.03], [0.083, 0.85, 0.05], [0.09, 0.74, 0.048]]), 0.0038, M.nerve), 'nerves', 'femoralN', sd);
  }

  return { root, layers, pickables, materials: M };
}
