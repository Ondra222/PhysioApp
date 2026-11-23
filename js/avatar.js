// Postava určená pro animace (models/avatar.glb, viz tools/build_avatar.py).
//
// Jedna hladká uzavřená síť s kostrou a vahami kůže připravenými při převodu.
// Klidová poloha je A-póza (paže odtažené od těla), proto se paže a trup nikde
// nedotýkají a při pohybu nevznikají trhliny. Úhly póz jsou stejné jako u ostatních
// postav (js/mannequin.js) – odchylku A-pózy kompenzuje apply().
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const D = THREE.MathUtils.degToRad;
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);
const qa = (axis, deg) => new THREE.Quaternion().setFromAxisAngle(axis, D(deg));

const CLOTH = {
  shirt: new THREE.Color(0x2a8c82), shorts: new THREE.Color(0x2b3a55), shoe: new THREE.Color(0x3d4650),
  hair: new THREE.Color(0x3a2a1f), focus: new THREE.Color(0xf05a3c),
};

const FOCUS_BONES = { neck: ['neck'], head: ['head'], chest: ['thoracic', 'lScap', 'rScap'], abdomen: ['lumbar'], pelvis: ['pelvis'] };
for (const p of ['l', 'r']) {
  Object.assign(FOCUS_BONES, {
    [`${p}Shoulder`]: [`${p}Scap`, `${p}UpperArm`], [`${p}UpperArm`]: [`${p}UpperArm`], [`${p}Forearm`]: [`${p}Forearm`],
    [`${p}Hand`]: [`${p}Hand`, `${p}Thumb`, ...[1, 2, 3, 4].flatMap((i) => [`${p}Finger${i}a`, `${p}Finger${i}b`])],
    [`${p}Thigh`]: [`${p}Thigh`], [`${p}Shin`]: [`${p}Shin`], [`${p}Foot`]: [`${p}Foot`],
  });
}

let avatarData = null;
export function loadAvatar(url = 'models/avatar.glb?v=2') {
  if (!avatarData) {
    avatarData = new Promise((resolve, reject) => new GLTFLoader().load(url, resolve, undefined, reject));
  }
  return avatarData;
}

export class Avatar {
  constructor(gltf) {
    const extras = gltf.parser.json.asset.extras;
    this.aPose = extras.aPose;
    this.legAbd = extras.legAbd;
    // vlastní kopie scény (přehrávač má jednu postavu, ale ať je třída znovupoužitelná)
    const src = gltf.scene;
    let mesh = null;
    src.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });
    this.mesh = mesh;
    this.root = new THREE.Group();
    this.root.add(src);
    mesh.frustumCulled = false;
    const geo = mesh.geometry;
    geo.computeVertexNormals();
    geo.setAttribute('focus', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count), 1));

    const n0 = geo.attributes.position.count;
    geo.setAttribute('act', new THREE.Float32BufferAttribute(new Float32Array(n0 * 3).fill(-1), 3));
    this.hasMuscles = !!geo.attributes._musk;
    this.muscles = extras.muscles || [];
    this.uniforms = {
      u_muscle: { value: this.hasMuscles ? 1 : 0 }, u_contract: { value: 0 }, u_hasAct: { value: 0 },
    };
    const U = this.uniforms;

    const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.6, sheen: 0.45, sheenRoughness: 0.55, clearcoat: 0.04 });
    mat.onBeforeCompile = (sh) => {
      for (const [k, c] of Object.entries(CLOTH)) sh.uniforms[`c_${k}`] = { value: c };
      Object.assign(sh.uniforms, U);
      const musAttr = this.hasMuscles ? 'attribute vec4 _musk;\nattribute float _fiber;\n' : 'const vec4 _musk = vec4(1.0);\nconst float _fiber = 0.0;\n';
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
          attribute vec4 _cloth; attribute float focus; attribute vec3 act;
          ${musAttr}
          uniform float u_muscle; uniform float u_contract;
          varying vec4 vCloth; varying float vFocus; varying vec4 vMusK; varying float vFiber; varying vec3 vAct;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vCloth = _cloth; vFocus = focus; vMusK = _musk * 9.0; vFiber = _fiber; vAct = act;
          // pracující sval se při stahu mírně vyklene
          transformed += objectNormal * (u_muscle * clamp(act.x * 3.0, 0.0, 1.0) * u_contract * 0.0045);`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec4 vCloth; varying float vFocus; varying vec4 vMusK; varying float vFiber; varying vec3 vAct;
          uniform vec3 c_shirt; uniform vec3 c_shorts; uniform vec3 c_shoe; uniform vec3 c_hair; uniform vec3 c_focus;
          uniform float u_muscle; uniform float u_contract; uniform float u_hasAct;
          float edge(float f) { float w = max(fwidth(f), 1e-4); return smoothstep(-w, w, f); }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec3 col = diffuseColor.rgb;
          bool sole = col.r > 0.8 && col.g > 0.8;
          if (u_muscle < 0.5) {
            col = mix(col, c_shorts, edge(vCloth.y));
            col = mix(col, c_shirt, edge(vCloth.x));
            if (!sole) col = mix(col, c_shoe, edge(vCloth.z));
            col = mix(col, c_hair, edge(vCloth.w));
            diffuseColor.rgb = mix(col, c_focus, clamp(vFocus, 0.0, 1.0) * 0.6);
          } else {
            // svalová postava: bříška svalů s vlákny, rýhy mezi svaly, šlachy a povázky světlé
            float k1 = vMusK.x, k2 = vMusK.y;
            float sep = min(k2 - k1, 1.0 - k1);
            float fw = max(fwidth(sep), 1e-4);
            float inside = smoothstep(-fw, fw, sep);
            float groove = 1.0 - smoothstep(0.0, 0.09 + 1.5 * fw, sep);
            float fu = vFiber * 260.0;
            float ffw = fwidth(fu);
            float stripe = (0.5 + 0.5 * sin(fu * 6.2832)) * (1.0 - smoothstep(0.25, 0.6, ffw));
            vec3 red = vec3(0.40, 0.065, 0.055);
            vec3 work = vec3(0.82, 0.05, 0.025);
            vec3 stretch = vec3(0.13, 0.40, 0.86);
            float wx = max(fwidth(vAct.x), 1e-4), wy = max(fwidth(vAct.y), 1e-4), wz = max(fwidth(vAct.z), 1e-4);
            float aw = smoothstep(-wx, wx, vAct.x);
            float as_ = smoothstep(-wy, wy, vAct.y);
            float ar = smoothstep(-wz, wz, vAct.z);
            vec3 m = red;
            if (u_hasAct > 0.5) m = mix(vec3(0.56, 0.36, 0.33), red, 0.25);   // ostatní svaly ztlumené
            m = mix(m, work * (0.85 + 0.35 * u_contract), aw);
            m = mix(m, stretch * (0.8 + 0.3 * u_contract), as_ * (1.0 - aw));
            m = mix(m, vec3(0.16, 0.58, 0.32), ar * (1.0 - aw) * (1.0 - as_));
            m *= 0.86 + 0.2 * stripe;
            m = mix(m, m * 0.35, groove);
            vec3 fascia = vec3(0.80, 0.72, 0.62);
            vec3 skin = col;
            float bare = smoothstep(3.0, 6.0, k1);          // hlava, ruce, chodidla
            vec3 base = mix(fascia, skin, bare);
            if (!sole) base = mix(base, c_hair, edge(vCloth.w));
            diffuseColor.rgb = mix(base, m, inside);
          }`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          if (u_muscle > 0.5) {
            float wx2 = max(fwidth(vAct.x), 1e-4);
            float aw2 = smoothstep(-wx2, wx2, vAct.x) * step(vMusK.x, 1.0);
            totalEmissiveRadiance += vec3(0.5, 0.02, 0.0) * aw2 * u_contract * 0.3;
          }`);
    };
    mesh.material = mat;
    this.meshes = [mesh];

    // kosti podle jmen
    this.byName = {};
    for (const b of mesh.skeleton.bones) this.byName[b.name] = b;
    this.boneIndex = Object.fromEntries(mesh.skeleton.bones.map((b, i) => [b.name, i]));
    const B = this.byName;
    for (const b of Object.values(B)) b.userData.rest = b.position.clone();
    this.joints = {
      lumbar: B.lumbar, thoracic: B.thoracic, neck: B.neck, head: B.head, lScap: B.lScap, rScap: B.rScap,
      lShoulder: B.lUpperArm, rShoulder: B.rUpperArm, lElbow: B.lForearm, rElbow: B.rForearm, lWrist: B.lHand, rWrist: B.rHand,
      lHip: B.lThigh, rHip: B.rThigh, lKnee: B.lShin, rKnee: B.rShin, lAnkle: B.lFoot, rAnkle: B.rFoot,
    };
    // značky (v klidové póze mají kosti nulovou rotaci, takže lokální poloha = světová − hlava kosti)
    const heads = Object.fromEntries(extras.bones.map((b) => [b.name, new THREE.Vector3(...b.head)]));
    this.markers = {};
    for (const [name, [bone, world]] of Object.entries(extras.markers)) {
      const o = new THREE.Object3D();
      o.position.copy(new THREE.Vector3(...world).sub(heads[bone]));
      B[bone].add(o);
      this.markers[name] = o;
    }
    const n = geo.attributes.position.count;
    this.sample = [];
    for (let i = 0; i < n; i += 4) this.sample.push(i);
    this.root.updateMatrixWorld(true);
  }

  setFocus(segments = []) {
    const geo = this.mesh.geometry;
    const ids = new Set(segments.flatMap((s) => FOCUS_BONES[s] || []).map((nm) => this.boneIndex[nm]));
    const si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, fa = geo.attributes.focus;
    for (let i = 0; i < fa.count; i++) {
      let f = 0;
      for (let k = 0; k < 4; k++) if (ids.has(si.getComponent(i, k))) f += sw.getComponent(i, k);
      fa.setX(i, f);
    }
    fa.needsUpdate = true;
  }

  setMuscleView(on) {
    this.uniforms.u_muscle.value = on && this.hasMuscles ? 1 : 0;
  }

  setContract(x) {
    this.uniforms.u_contract.value = x;
  }

  // Zvýraznění svalů: work = pracující (červeně), stretch = protahované (modře).
  // Položky jsou klíče svalů (viz extras.muscles), volitelně s příponou stranou ".l" / ".r".
  setActive(work = [], stretch = [], relax = []) {
    const geo = this.mesh.geometry;
    const act = geo.attributes.act;
    this.uniforms.u_hasAct.value = work.length || stretch.length || relax.length ? 1 : 0;
    if (!this.hasMuscles) return;
    const keys = this.muscles.map((m) => m.key);
    const idSet = (list) => {
      const s = new Set();
      for (const it of list) {
        const [k, side] = it.split('.');
        keys.forEach((kk, j) => {
          if (kk !== k) return;                    // jeden sval může mít víc částí (např. přímý břišní)
          if (side !== 'r') s.add(2 * j);
          if (side !== 'l') s.add(2 * j + 1);
        });
      }
      return s;
    };
    const ids = geo.attributes._musid, ks = geo.attributes._musk;
    const field = (S, i) => {
      if (!S.size) return -1;
      let kin = 99, kout = 99;
      for (let c = 0; c < 4; c++) {
        const id = ids.getComponent(i, c) - 1, k = ks.getComponent(i, c) * 9;
        if (id < 0) continue;
        if (S.has(id)) kin = Math.min(kin, k); else kout = Math.min(kout, k);
      }
      if (kin > 90) return -1;
      return Math.min(kout - kin, 1 - kin);
    };
    const W = idSet(work), Sx = idSet(stretch), Rx = idSet(relax);
    for (let i = 0; i < act.count; i++) act.setXYZ(i, field(W, i), field(Sx, i), field(Rx, i));
    act.needsUpdate = true;
  }

  muscleName(key) {
    return this.muscles.find((m) => m.key === key)?.name || key;
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
    if (this.mesh.morphTargetInfluences) this.mesh.morphTargetInfluences[0] = pose.breath || 0;

    for (const [s, p] of [[1, 'l'], [-1, 'r']]) {
      const sc = pose[`${p}Scap`];
      J[`${p}Scap`].quaternion.copy(qa(AZ, 14 * g(sc, 'elev') * s)).premultiply(qa(AY, 16 * g(sc, 'retr') * s));
      const sh = pose[`${p}Shoulder`];
      J[`${p}Shoulder`].quaternion.copy(qa(AY, g(sh, 'rot') * s))
        .premultiply(qa(AX, -g(sh, 'flex')))
        .premultiply(qa(AZ, g(sh, 'abd') * s))
        .premultiply(qa(AY, -g(sh, 'hadd') * s))
        .multiply(qa(AZ, -this.aPose * s));            // zrušit A-pózu
      const el = pose[`${p}Elbow`];
      J[`${p}Elbow`].quaternion.copy(qa(AY, -g(el, 'sup') * s)).premultiply(qa(AX, -g(el, 'flex')));
      const wr = pose[`${p}Wrist`];
      J[`${p}Wrist`].quaternion.copy(qa(AZ, g(wr, 'dev') * s)).premultiply(qa(AX, -g(wr, 'flex')));
      const fi = pose[`${p}Fingers`];
      const qm = qa(AX, -(g(fi, 'mcp') - 25)), qi = qa(AX, -(g(fi, 'ip') - 20));
      for (let i = 1; i <= 4; i++) {
        B[`${p}Finger${i}a`].quaternion.copy(qm);
        B[`${p}Finger${i}b`].quaternion.copy(qi);
      }
      B[`${p}Thumb`].quaternion.copy(qa(AX, -0.35 * g(fi, 'mcp'))).premultiply(qa(AY, -0.3 * g(fi, 'mcp') * s));
      const hp = pose[`${p}Hip`];
      J[`${p}Hip`].quaternion.copy(qa(AY, g(hp, 'rot') * s)).premultiply(qa(AX, -g(hp, 'flex'))).premultiply(qa(AZ, g(hp, 'abd') * s))
        .multiply(qa(AZ, -this.legAbd * s));
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
    const v = new THREE.Vector3();
    const box = new THREE.Box3();
    this.mesh.skeleton.update();
    for (const i of this.sample) {
      this.mesh.getVertexPosition(i, v);
      box.expandByPoint(v.applyMatrix4(this.mesh.matrixWorld));
    }
    return box;
  }

  minY() {
    return this.bbox().min.y;
  }
}
