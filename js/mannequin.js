// Kloubová figurína pro animace cviků.
//
// Póza = úhly kloubů ve stupních (pojmenované stupně volnosti):
//   lumbar/thoracic/neck/head: { flex, lat, rot }   flex + = předklon, lat + = úklon doleva, rot + = otočení doleva
//   head: navíc shift (posun dozadu v m, pro „zasunutí brady“)
//   lScap/rScap:  { elev, retr }   zvednutí a stažení lopatky (0..1)
//   lShoulder:    { flex, abd, rot, hadd }  předpažení, upažení, zevní rotace, horizontální addukce (k ose těla)
//   lElbow:       { flex, sup }    ohnutí, supinace (0 = dlaň vpřed, 90 = palcem vpřed, 180 = dlaň vzad)
//   lWrist:       { flex, dev }    ohnutí dlaňově, úklon k palci
//   lFingers:     { mcp, ip }      ohnutí v kloubech prstů
//   lHip:         { flex, abd, rot }
//   lKnee:        { flex }
//   lAnkle:       { dorsi, inv }   + = špička nahoru, inverze
//   root:         { pos: [x,y,z], rot: [x,y,z] }  poloha a natočení pánve (stupně)
//   breath:       0..1  nádech (zvětšení hrudníku a břicha)
import * as THREE from 'three';

const D = THREE.MathUtils.degToRad;

export const DIM = {
  hipX: 0.085, hipY: -0.045, thigh: 0.43, shin: 0.4, ankleH: 0.075,
  lumbar: 0.17, thoracic: 0.27, neck: 0.085, shoulderX: 0.185, shoulderY: 0.215,
  upperArm: 0.29, forearm: 0.25, palm: 0.1, finger: 0.085,
};

export const JOINTS = ['lumbar', 'thoracic', 'neck', 'head', 'lScap', 'rScap', 'lShoulder', 'rShoulder', 'lElbow', 'rElbow',
  'lWrist', 'rWrist', 'lFingers', 'rFingers', 'lHip', 'rHip', 'lKnee', 'rKnee', 'lAnkle', 'rAnkle'];

export function emptyPose() {
  const p = { root: { pos: [0, 0, 0], rot: [0, 0, 0] }, breath: 0 };
  for (const j of JOINTS) p[j] = {};
  return p;
}

/** Hluboké sloučení pózy (přepisuje jen uvedené hodnoty). */
export function mergePose(base, over) {
  const out = JSON.parse(JSON.stringify(base));
  if (!over) return out;
  for (const [k, v] of Object.entries(over)) {
    if (k === 'root') {
      out.root = { pos: v.pos ? [...v.pos] : out.root.pos, rot: v.rot ? [...v.rot] : out.root.rot };
    } else if (typeof v === 'number') out[k] = v;
    else out[k] = { ...(out[k] || {}), ...v };
  }
  return out;
}

/** Interpolace dvou póz (číselně po stupních volnosti). */
export function lerpPose(a, b, t) {
  const out = emptyPose();
  out.root.pos = a.root.pos.map((v, i) => v + (b.root.pos[i] - v) * t);
  out.root.rot = a.root.rot.map((v, i) => v + (b.root.rot[i] - v) * t);
  out.breath = (a.breath || 0) + ((b.breath || 0) - (a.breath || 0)) * t;
  for (const j of JOINTS) {
    const keys = new Set([...Object.keys(a[j] || {}), ...Object.keys(b[j] || {})]);
    for (const k of keys) {
      const va = a[j]?.[k] ?? 0, vb = b[j]?.[k] ?? 0;
      out[j][k] = va + (vb - va) * t;
    }
  }
  return out;
}

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);
const qa = (axis, deg) => new THREE.Quaternion().setFromAxisAngle(axis, D(deg));

export class Mannequin {
  constructor() {
    this.root = new THREE.Group();
    this.joints = {};
    this.markers = {};
    this.meshes = [];
    this.segments = {};       // jméno segmentu -> mesh (pro zvýraznění)
    this.mat = new THREE.MeshPhysicalMaterial({ color: 0xd5dce2, roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.3, sheen: 0.3 });
    this.jointMat = new THREE.MeshPhysicalMaterial({ color: 0xaab6c0, roughness: 0.4, clearcoat: 0.4 });
    this.focusMat = new THREE.MeshPhysicalMaterial({ color: 0xee7d63, roughness: 0.45, clearcoat: 0.35, sheen: 0.3, emissive: 0x3a0e05 });
    this.build();
  }

  group(name, parent, pos = [0, 0, 0]) {
    const g = new THREE.Group();
    g.position.set(...pos);
    g.name = name;
    parent.add(g);
    this.joints[name] = g;
    return g;
  }

  marker(name, parent, pos) {
    const o = new THREE.Object3D();
    o.position.set(...pos);
    parent.add(o);
    this.markers[name] = o;
  }

  ell(parent, seg, c, r, mat = this.mat) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), mat);
    m.position.set(...c);
    m.scale.set(...r);
    parent.add(m);
    this.meshes.push(m);
    if (seg) (this.segments[seg] ||= []).push(m);
    return m;
  }

  cap(parent, seg, len, r, dir = -1, r2 = r) {
    // kapsle podél osy y od kloubu (dir = -1 dolů, +1 nahoru); r2 = poloměr na konci (zúžení)
    const geo = new THREE.CapsuleGeometry((r + r2) / 2, Math.max(0.001, len - (r + r2)), 8, 18);
    const m = new THREE.Mesh(geo, this.mat);
    m.position.y = (dir * len) / 2;
    m.scale.x = 1; m.scale.z = 1;
    parent.add(m);
    this.meshes.push(m);
    if (seg) (this.segments[seg] ||= []).push(m);
    return m;
  }

  joint(parent, r) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), this.jointMat);
    parent.add(m);
    this.meshes.push(m);
    return m;
  }

  build() {
    const R = this.root;
    // pánev
    this.ell(R, 'pelvis', [0, -0.01, 0], [0.145, 0.095, 0.1]);
    this.marker('pelvis', R, [0, -0.06, 0]);
    this.marker('sacrum', R, [0, -0.02, -0.1]);
    // páteř
    const lumbar = this.group('lumbar', R, [0, 0.05, 0]);
    this.abdomen = this.ell(lumbar, 'abdomen', [0, 0.085, 0.005], [0.125, 0.105, 0.088]);
    const thor = this.group('thoracic', lumbar, [0, DIM.lumbar, 0]);
    this.chest = this.ell(thor, 'chest', [0, 0.13, 0.0], [0.155, 0.155, 0.098]);
    this.marker('back', thor, [0, 0.12, -0.1]);
    this.marker('lowBack', lumbar, [0, 0.07, -0.095]);
    this.marker('scapulaL', thor, [0.08, 0.15, -0.1]);
    const neck = this.group('neck', thor, [0, DIM.thoracic, -0.01]);
    this.cap(neck, 'neck', DIM.neck + 0.02, 0.045, 1);
    const head = this.group('head', neck, [0, DIM.neck, 0.0]);
    this.ell(head, 'head', [0, 0.1, 0.01], [0.083, 0.108, 0.095]);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.035, 12), this.mat);
    nose.position.set(0, 0.095, 0.105);
    nose.rotation.x = Math.PI / 2;
    head.add(nose);
    this.meshes.push(nose);
    this.marker('head', head, [0, 0.21, 0]);
    this.marker('headBack', head, [0, 0.09, -0.095]);
    this.marker('forehead', head, [0, 0.13, 0.095]);

    for (const [s, p] of [[1, 'l'], [-1, 'r']]) {
      // rameno a paže
      const scap = this.group(`${p}Scap`, thor, [DIM.shoulderX * s, DIM.shoulderY, -0.005]);
      this.ell(scap, `${p}Shoulder`, [-0.02 * s, 0.0, 0], [0.06, 0.05, 0.06]);
      const sh = this.group(`${p}Shoulder`, scap);
      this.cap(sh, `${p}UpperArm`, DIM.upperArm, 0.043, -1, 0.036);
      const el = this.group(`${p}Elbow`, sh, [0, -DIM.upperArm, 0]);
      this.joint(el, 0.036);
      this.marker(`${p}Elbow`, el, [0, 0, 0]);
      this.cap(el, `${p}Forearm`, DIM.forearm, 0.035, -1, 0.026);
      const wr = this.group(`${p}Wrist`, el, [0, -DIM.forearm, 0]);
      this.ell(wr, `${p}Hand`, [0, -0.048, 0], [0.042, 0.054, 0.017]);
      this.marker(`${p}Hand`, wr, [0, -0.06, 0.015]);
      const thumb = new THREE.Group();
      thumb.position.set(0.035 * s, -0.025, 0.01);
      thumb.rotation.set(0.3, 0, 0.5 * s);
      wr.add(thumb);
      this.cap(thumb, `${p}Hand`, 0.06, 0.012, -1);
      // čtyři prsty, každý se dvěma články (kořenový kloub = mcp, mezičlánkový = ip)
      this.fingerRoots = this.fingerRoots || {};
      this.fingerTips = this.fingerTips || {};
      this.fingerRoots[p] = [];
      this.fingerTips[p] = [];
      [[-0.027, 0.04], [-0.009, 0.046], [0.009, 0.044], [0.027, 0.038]].forEach(([fx, len], i) => {
        const root = new THREE.Group();
        root.position.set(fx * s * -1, -DIM.palm + 0.006, 0);
        wr.add(root);
        this.cap(root, `${p}Hand`, len, 0.0095, -1, 0.0085);
        const mid = new THREE.Group();
        mid.position.y = -len;
        root.add(mid);
        this.cap(mid, `${p}Hand`, len * 0.85, 0.0085, -1, 0.0075);
        this.fingerRoots[p].push(root);
        this.fingerTips[p].push(mid);
        if (i === 1) this.marker(`${p}Fingertips`, mid, [0, -len * 0.85, 0]);
      });
      // kyčel a noha
      const hip = this.group(`${p}Hip`, R, [DIM.hipX * s, DIM.hipY, 0]);
      this.cap(hip, `${p}Thigh`, DIM.thigh, 0.068, -1, 0.05);
      const kn = this.group(`${p}Knee`, hip, [0, -DIM.thigh, 0]);
      this.joint(kn, 0.05);
      this.marker(`${p}Knee`, kn, [0, 0, 0.04]);
      this.marker(`${p}KneeIn`, kn, [-0.045 * s, 0.02, 0]);
      this.cap(kn, `${p}Shin`, DIM.shin, 0.05, -1, 0.034);
      const an = this.group(`${p}Ankle`, kn, [0, -DIM.shin, 0]);
      this.ell(an, `${p}Foot`, [0, -0.04, 0.065], [0.045, 0.036, 0.13]);
      this.marker(`${p}Foot`, an, [0, -DIM.ankleH, 0.05]);
      this.marker(`${p}Heel`, an, [0, -DIM.ankleH, -0.05]);
      this.marker(`${p}Toe`, an, [0, -DIM.ankleH + 0.01, 0.18]);
    }
  }

  setFocus(segments = []) {
    const set = new Set(segments);
    for (const [name, list] of Object.entries(this.segments)) {
      for (const m of list) m.material = set.has(name) ? this.focusMat : this.mat;
    }
  }

  /** Nastaví pózu (bez zemnění). */
  apply(pose) {
    const J = this.joints;
    const g = (o, k) => o?.[k] ?? 0;
    this.root.position.set(...pose.root.pos);
    _e.set(D(pose.root.rot[0]), D(pose.root.rot[1]), D(pose.root.rot[2]), 'YXZ');
    this.root.quaternion.setFromEuler(_e);

    const spine = (name) => {
      const o = pose[name];
      J[name].quaternion.copy(qa(AY, g(o, 'rot'))).premultiply(qa(AX, g(o, 'flex'))).premultiply(qa(AZ, -g(o, 'lat')));
    };
    spine('lumbar'); spine('thoracic'); spine('neck'); spine('head');
    J.head.position.z = -g(pose.head, 'shift');

    const br = pose.breath || 0;
    this.chest.scale.set(0.155 * (1 + 0.05 * br), 0.155 * (1 + 0.02 * br), 0.098 * (1 + 0.1 * br));
    this.abdomen.scale.set(0.125 * (1 + 0.04 * br), 0.105, 0.088 * (1 + 0.22 * br));

    for (const [s, p] of [[1, 'l'], [-1, 'r']]) {
      const sc = pose[`${p}Scap`];
      J[`${p}Scap`].position.set(DIM.shoulderX * s - 0.015 * s * g(sc, 'retr'), DIM.shoulderY + 0.035 * g(sc, 'elev'), -0.005 - 0.03 * g(sc, 'retr'));
      const sh = pose[`${p}Shoulder`];
      J[`${p}Shoulder`].quaternion.copy(qa(AY, g(sh, 'rot') * s))
        .premultiply(qa(AX, -g(sh, 'flex')))
        .premultiply(qa(AZ, g(sh, 'abd') * s))
        .premultiply(qa(AY, -g(sh, 'hadd') * s));
      const el = pose[`${p}Elbow`];
      J[`${p}Elbow`].quaternion.copy(qa(AY, -g(el, 'sup') * s)).premultiply(qa(AX, -g(el, 'flex')));
      const wr = pose[`${p}Wrist`];
      J[`${p}Wrist`].quaternion.copy(qa(AZ, g(wr, 'dev') * s)).premultiply(qa(AX, -g(wr, 'flex')));
      const fi = pose[`${p}Fingers`];
      const qm = qa(AX, -g(fi, 'mcp')), qi = qa(AX, -g(fi, 'ip'));
      this.fingerRoots[p].forEach((r) => r.quaternion.copy(qm));
      this.fingerTips[p].forEach((r) => r.quaternion.copy(qi));
      const hp = pose[`${p}Hip`];
      J[`${p}Hip`].quaternion.copy(qa(AY, g(hp, 'rot') * s)).premultiply(qa(AX, -g(hp, 'flex'))).premultiply(qa(AZ, g(hp, 'abd') * s));
      J[`${p}Knee`].quaternion.copy(qa(AX, g(pose[`${p}Knee`], 'flex')));
      const an = pose[`${p}Ankle`];
      J[`${p}Ankle`].quaternion.copy(qa(AZ, -g(an, 'inv') * s)).premultiply(qa(AX, -g(an, 'dorsi')));
    }
    this.root.updateMatrixWorld(true);
  }

  markerPos(name, target = new THREE.Vector3()) {
    return this.markers[name].getWorldPosition(target);
  }

  bbox() {
    return new THREE.Box3().setFromObject(this.root, true);
  }

  /** Nejnižší bod figuríny (přes obálky segmentů). */
  minY() {
    let min = Infinity;
    const box = new THREE.Box3();
    for (const m of this.meshes) {
      box.setFromObject(m, true);
      if (box.min.y < min) min = box.min.y;
    }
    return min;
  }
}
