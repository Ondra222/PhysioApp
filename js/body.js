// Anatomický 3D model těla rozdělený do vrstev.
//
// Kůže, svaly, kosti, cévy trupu a mozek pocházejí z databáze BodyParts3D
// (© The Database Center for Life Science, licence CC BY-SA 2.1 Japan),
// převedené nástrojem tools/build_models.py do models/*.glb.
// Periferní nervy, mícha a cévy končetin v BodyParts3D nejsou, proto jsou
// dokreslené zde podle orientačních bodů kostry (js/landmarks.js).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LM } from './landmarks.js';
import { buildNerves, NERVE_INFO, segmentInfo } from './nerves.js';

export const LAYER_DEFS = {
  skin: { name: 'Kůže', color: '#d9a07e' },
  muscles: { name: 'Svaly', color: '#a3302a' },
  bones: { name: 'Kosti', color: '#e6dcc4' },
  vessels: { name: 'Cévy', color: '#c0141c' },
  nerves: { name: 'Nervy a mozek', color: '#efc94c' },
};

const MODEL_URL = (layer) => `models/${layer}.glb`;

// ---------------------------------------------------------------------------
// Materiály
// ---------------------------------------------------------------------------
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

const TENDON_RE = /šlacha|vaz\b|vaz |aponeuróza|pruh|čára|poutač|oblouk/i;

function makeMaterial(layer, meta, id) {
  const j = hash(id) - 0.5; // -0.5 .. 0.5 pro jemné odlišení sousedních struktur
  switch (layer) {
    case 'skin':
      if (meta.g === 'eye') return new THREE.MeshPhysicalMaterial({ color: 0xf4f1ec, roughness: 0.15, clearcoat: 1 });
      if (meta.g === 'lips') return new THREE.MeshPhysicalMaterial({ color: 0xb8706a, roughness: 0.45, sheen: 0.4 });
      return new THREE.MeshPhysicalMaterial({
        color: 0xc88a68, roughness: 0.52, sheen: 0.35, sheenRoughness: 0.45, sheenColor: new THREE.Color(0xffbfa0),
        clearcoat: 0.06, clearcoatRoughness: 0.5, transparent: true, opacity: 0.3, depthWrite: false,
      });
    case 'muscles': {
      if (TENDON_RE.test(meta.n) || meta.g === 'linea' || meta.g === 'retinac' || meta.g === 'ligament') {
        return new THREE.MeshPhysicalMaterial({ color: 0xe8dcc8, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0.3 });
      }
      const c = new THREE.Color().setHSL(0.0 + j * 0.02, 0.68 + j * 0.1, 0.27 + j * 0.06);
      return new THREE.MeshPhysicalMaterial({
        color: c, roughness: 0.48, clearcoat: 0.22, clearcoatRoughness: 0.4, sheen: 0.18, sheenRoughness: 0.5,
        sheenColor: new THREE.Color(0xff7060),
      });
    }
    case 'bones':
      if (meta.g === 'disc' || meta.g === 'cartilage' || meta.g === 'larynx' || meta.g === 'nose') {
        return new THREE.MeshPhysicalMaterial({ color: 0xc9dbe0, roughness: 0.3, clearcoat: 0.5, transmission: 0 });
      }
      if (meta.g === 'membrane') return new THREE.MeshPhysicalMaterial({ color: 0xd8ccb4, roughness: 0.5, transparent: true, opacity: 0.7 });
      return new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setHSL(0.1, 0.32, 0.76 + j * 0.05), roughness: 0.7, clearcoat: 0.05 });
    case 'vessels':
      if (meta.g === 'heart') return new THREE.MeshPhysicalMaterial({ color: 0x8c1d1d, roughness: 0.4, clearcoat: 0.6, sheen: 0.4 });
      if (meta.g === 'vein' || /žíl/i.test(meta.n)) return new THREE.MeshPhysicalMaterial({ color: 0x2a4aa8, roughness: 0.35, clearcoat: 0.6 });
      return new THREE.MeshPhysicalMaterial({ color: 0xb4141c, roughness: 0.35, clearcoat: 0.6 });
    case 'nerves':
      if (meta.g === 'nerve') return new THREE.MeshPhysicalMaterial({ color: 0xf1cf5b, roughness: 0.4, clearcoat: 0.4, sheen: 0.5, emissive: 0x2a1e00 });
      return new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setHSL(0.0, 0.38, 0.78 + j * 0.05), roughness: 0.55, clearcoat: 0.3, sheen: 0.4 });
    default:
      return new THREE.MeshStandardMaterial({ color: 0x999999 });
  }
}

// ---------------------------------------------------------------------------
// Dokreslené struktury: cévy končetin a nervová soustava
// ---------------------------------------------------------------------------
const EXTRA_INFO = {
  axillaryA: ['Podpažní a pažní tepna', 'A. axillaris, a. brachialis', 'artery', 'Hlavní tepna paže, na pažní tepně se měří krevní tlak.'],
  radialA: ['Vřetenní tepna', 'A. radialis', 'artery', 'Tepna na straně palce, na zápěstí se na ní měří tep.'],
  ulnarA: ['Loketní tepna', 'A. ulnaris', 'artery', 'Tepna na straně malíku, zásobuje ruku.'],
  femoralA: ['Stehenní tepna', 'A. femoralis', 'artery', 'Hlavní tepna stehna. Její tep je hmatný v třísle.'],
  poplitealA: ['Podkolenní tepna', 'A. poplitea', 'artery', 'Prochází v podkolenní jamce za kolenem.'],
  postTibialA: ['Zadní holenní tepna', 'A. tibialis posterior', 'artery', 'Zásobuje lýtko a chodidlo, tep je hmatný za vnitřním kotníkem.'],
  antTibialA: ['Přední holenní tepna', 'A. tibialis anterior, a. dorsalis pedis', 'artery', 'Zásobuje přední stranu bérce a nárt, kde je hmatný její tep.'],
  axillaryV: ['Podpažní a pažní žíla', 'V. axillaris, vv. brachiales', 'vein', 'Hluboké žíly paže, odvádějí krev z horní končetiny.'],
  cephalic: ['Hlavová žíla', 'V. cephalica', 'vein', 'Povrchová žíla na vnější straně paže.'],
  basilic: ['Královská žíla', 'V. basilica', 'vein', 'Povrchová žíla na vnitřní straně paže; v loketní jamce se z jejích spojek často odebírá krev.'],
  femoralV: ['Stehenní a podkolenní žíla', 'V. femoralis, v. poplitea', 'vein', 'Hluboké žíly nohy. Trombóza hlubokých žil se projevuje otokem, bolestí a teplem končetiny.'],
  saphena: ['Velká skrytá žíla', 'V. saphena magna', 'vein', 'Nejdelší žíla těla na vnitřní straně nohy. Při oslabení jejích chlopní vznikají křečové žíly.'],
};

const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

function buildExtras(register) {
  const arteryMat = () => makeMaterial('vessels', { g: 'artery', n: '' }, 'a');
  const veinMat = () => makeMaterial('vessels', { g: 'vein', n: 'žíla' }, 'v');

  function tube(key, pts, r, side, layer, mat) {
    const curve = new THREE.CatmullRomCurve3(pts.map(V3), false, 'centripetal');
    const len = curve.getLength();
    const geo = new THREE.TubeGeometry(curve, Math.max(16, Math.round(len * 160)), r, 10, false);
    const [n, la, g, d] = EXTRA_INFO[key];
    register(new THREE.Mesh(geo, mat), layer, { n, la, g, d, s: side });
  }

  for (const [s, sn] of [[1, 'left'], [-1, 'right']]) {
    const side = s > 0 ? 'leva' : 'prava';
    const L = (k) => LM[`${k}_${sn}`];
    // posun: dx kladně = do strany (laterálně), dz kladně = dopředu
    const P = (b, dx = 0, dy = 0, dz = 0) => [b[0] + dx * s, b[1] + dy, b[2] + dz];
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const S = L('shoulder'), E = L('elbow'), W = L('wrist'), palm = L('palm');
    const Hp = L('hip'), K = L('knee'), A = L('ankle'), toe = L('toe'), heel = L('heel');
    const AX = P(lerp(S, E, 0.13), -0.032, 0, 0.004);           // podpaží
    const clavMid = lerp(L('clavicle_med'), L('clavicle_lat'), 0.6);
    const CUB = P(E, -0.006, 0.012, 0.022);                       // loketní jamka
    const POP = P(K, 0, 0.05, -0.035);                            // podkolenní jamka

    // --- Ruka: cévy ---
    const brachEnd = CUB;
    tube('axillaryA', [L('subclavian_a_end'), P(clavMid, 0, -0.022, -0.006), P(AX, 0, 0, 0.008), P(lerp(S, E, 0.5), -0.016, 0, 0.016), brachEnd], 0.0035, side, 'vessels', arteryMat());
    tube('radialA', [brachEnd, P(lerp(E, W, 0.5), 0.01, 0, 0.018), P(L('wrist_rad'), 0, 0.004, 0.009), P(palm, 0.008, 0.01, 0.012)], 0.0024, side, 'vessels', arteryMat());
    tube('ulnarA', [brachEnd, P(lerp(E, W, 0.4), -0.012, 0, 0.015), P(L('wrist_uln'), 0.002, 0.004, 0.011), P(palm, -0.006, 0.0, 0.014)], 0.0024, side, 'vessels', arteryMat());
    tube('axillaryV', [L('subclavian_v_end'), P(clavMid, 0, -0.024, 0.0), P(AX, -0.004, -0.005, 0.014), P(lerp(S, E, 0.55), -0.02, 0, 0.018), P(CUB, -0.004, 0, 0.004)], 0.0035, side, 'vessels', veinMat());
    tube('cephalic', [P(clavMid, 0.02, -0.03, 0.028), P(lerp(S, E, 0.3), 0.018, 0, 0.032), P(lerp(S, E, 0.75), 0.022, 0, 0.024), P(E, 0.024, 0, 0.026), P(lerp(E, W, 0.5), 0.02, 0, 0.02), P(L('wrist_rad'), 0.006, 0, 0.012)], 0.0022, side, 'vessels', veinMat());
    tube('basilic', [P(AX, 0, -0.04, 0.008), P(lerp(S, E, 0.7), -0.026, 0, 0.012), P(L('epicondyle_med'), -0.004, 0, 0.02), P(lerp(E, W, 0.5), -0.019, 0, 0.012), P(L('wrist_uln'), -0.004, 0, 0.012)], 0.0022, side, 'vessels', veinMat());

    // --- Noha: cévy ---
    const fa0 = L('ext_iliac_a_end');
    tube('femoralA', [fa0, P(lerp(Hp, K, 0.25), -0.012, 0, 0.032), P(lerp(Hp, K, 0.6), -0.026, 0, 0.004), POP], 0.0042, side, 'vessels', arteryMat());
    tube('poplitealA', [POP, P(K, 0, -0.03, -0.032)], 0.0038, side, 'vessels', arteryMat());
    tube('postTibialA', [P(K, 0, -0.03, -0.032), P(lerp(K, A, 0.5), -0.006, 0, -0.026), P(L('malleolus_med'), -0.006, 0.012, -0.013), P(lerp(heel, toe, 0.5), -0.004, 0.012, 0)], 0.0028, side, 'vessels', arteryMat());
    tube('antTibialA', [P(K, 0.006, -0.04, -0.02), P(lerp(K, A, 0.25), 0.012, 0, 0.012), P(lerp(K, A, 0.7), 0.008, 0, 0.022), P(A, 0.002, 0.012, 0.034), P(lerp(A, toe, 0.6), 0, 0.016, 0)], 0.0026, side, 'vessels', arteryMat());
    tube('femoralV', [L('ext_iliac_v_end'), P(lerp(Hp, K, 0.25), -0.022, 0, 0.03), P(lerp(Hp, K, 0.6), -0.032, 0, 0.0), P(POP, -0.008, 0, 0.002), P(K, -0.006, -0.03, -0.028)], 0.0045, side, 'vessels', veinMat());
    tube('saphena', [P(L('ext_iliac_v_end'), -0.004, -0.03, 0.006), P(lerp(Hp, K, 0.5), -0.05, 0, 0.012), P(K, -0.042, 0, -0.012), P(lerp(K, A, 0.5), -0.03, 0, -0.004), P(L('malleolus_med'), -0.006, 0.004, 0.022), P(lerp(A, toe, 0.5), -0.022, 0.016, 0)], 0.0024, side, 'vessels', veinMat());
  }

  // --- Nervová soustava (js/nerves.js) ---
  const beadGeo = new THREE.SphereGeometry(1, 12, 8);
  const nerveTube = (spec, pts, r, side, extra = {}) => {
    const key = typeof spec === 'string' ? spec : spec.key;
    const seg = extra.seg || spec.seg || null;
    let n, la, roots, d;
    if (key === 'spinal') {
      n = `Míšní nerv ${seg}`; la = `N. spinalis ${seg}`; roots = seg; d = segmentInfo(seg);
    } else {
      [n, la, roots, d] = NERVE_INFO[key];
      if (key === 'intercostal' && seg) n = `${seg.slice(2)}. mezižeberní nerv`;
      if (seg) roots = seg;
    }
    const curve = new THREE.CatmullRomCurve3(pts.map(V3), false, 'centripetal');
    const geo = new THREE.TubeGeometry(curve, Math.max(12, Math.round(curve.getLength() * 160)), r, 8, false);
    const mat = makeMaterial('nerves', { g: 'nerve' }, key);
    register(new THREE.Mesh(geo, mat), 'nerves', { n, la, g: 'nerve', d, s: side }, { nerveKey: key, seg, roots });
  };
  const bead = (key, p, r, side) => {
    const m = new THREE.Mesh(beadGeo, makeMaterial('nerves', { g: 'nerve' }, key));
    m.position.set(p[0], p[1], p[2]);
    m.scale.setScalar(r);
    const [n, la, roots, d] = NERVE_INFO[key];
    register(m, 'nerves', { n: `${n} – uzlina`, la, g: 'nerve', d, s: side }, { nerveKey: key, roots });
  };
  buildNerves(nerveTube, bead);
}

// ---------------------------------------------------------------------------
// Tělo
// ---------------------------------------------------------------------------
export class Body {
  constructor() {
    this.root = new THREE.Group();
    this.layers = {};
    this.pickables = [];
    this.loaded = {};
    this.pending = {};
    this.meta = null;
    this.onLayerLoaded = null;
    for (const key of Object.keys(LAYER_DEFS)) {
      const g = new THREE.Group();
      g.name = key;
      this.layers[key] = g;
      this.root.add(g);
    }
    this.loader = new GLTFLoader();
  }

  register(mesh, layer, meta, id = null, extra = {}) {
    mesh.userData = {
      layer, id, name: meta.n, latin: meta.la, group: meta.g, side: meta.s || null,
      desc: meta.d ?? this.meta?.groups?.[meta.g] ?? '', ...extra,
    };
    if (layer === 'skin') mesh.renderOrder = 2;
    this.layers[layer].add(mesh);
    this.pickables.push(mesh);
  }

  async init() {
    const res = await fetch('models/parts.json');
    this.meta = await res.json();
    buildExtras((mesh, layer, meta, extra) => this.register(mesh, layer, meta, null, extra));
  }

  /** Duhovka a zornice na přední ploše očních koulí. */
  addIrises() {
    const iris = new THREE.MeshPhysicalMaterial({ color: 0x5a3f2a, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
    const pupil = new THREE.MeshBasicMaterial({ color: 0x0b0b0b });
    const eyes = this.layers.skin.children.filter((m) => m.userData.group === 'eye');
    // Oční koule jsou v jednom meshi – rozdělit vrcholy na levé a pravé oko.
    const boxes = [new THREE.Box3(), new THREE.Box3()];
    const v = new THREE.Vector3();
    for (const eye of eyes) {
      eye.updateMatrixWorld(true);
      const pos = eye.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(eye.matrixWorld);
        boxes[v.x < 0 ? 0 : 1].expandByPoint(v);
      }
    }
    for (const box of boxes) {
      if (box.isEmpty()) continue;
      const c = box.getCenter(new THREE.Vector3());
      const r = (box.max.x - box.min.x) / 2;
      const disk = new THREE.Mesh(new THREE.CircleGeometry(r * 0.48, 32), iris);
      disk.position.set(c.x, c.y, box.max.z + 0.0004);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(r * 0.2, 24), pupil);
      dot.position.z = 0.0003;
      disk.add(dot);
      disk.raycast = () => {};
      dot.raycast = () => {};
      this.layers.skin.add(disk);
    }
  }

  /** Načte vrstvu (pokud ještě není). onProgress(0..1) */
  ensureLayer(layer, onProgress) {
    if (this.loaded[layer]) return Promise.resolve();
    if (this.pending[layer]) return this.pending[layer];
    this.pending[layer] = new Promise((resolve, reject) => {
      this.loader.load(MODEL_URL(layer), (gltf) => {
        const meshes = [];
        gltf.scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
        for (const o of meshes) {
          const id = o.parent && o.parent.name && !o.name ? o.parent.name : o.name;
          const meta = this.meta.parts[id] || { n: id, la: '', g: 'ligament' };
          o.geometry.computeVertexNormals();
          o.geometry.computeBoundingSphere();
          o.material = makeMaterial(layer, meta, id);
          // zachovat transformaci uzlu (kvantizace) a přenést mesh do vrstvy
          o.updateWorldMatrix(true, false);
          o.matrixWorld.decompose(o.position, o.quaternion, o.scale);
          this.register(o, layer, meta, id);
        }
        if (layer === 'skin') this.addIrises();
        this.loaded[layer] = true;
        delete this.pending[layer];
        this.onLayerLoaded?.(layer);
        resolve();
      }, (e) => { if (e.total) onProgress?.(e.loaded / e.total); }, (err) => {
        delete this.pending[layer];
        reject(err);
      });
    });
    return this.pending[layer];
  }
}
