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
export function loadAvatar(url = 'models/avatar.glb') {
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

    const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.6, sheen: 0.45, sheenRoughness: 0.55, clearcoat: 0.04 });
    mat.onBeforeCompile = (sh) => {
      for (const [k, c] of Object.entries(CLOTH)) sh.uniforms[`c_${k}`] = { value: c };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 _cloth;\nattribute float focus;\nvarying vec4 vCloth;\nvarying float vFocus;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCloth = _cloth; vFocus = focus;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec4 vCloth; varying float vFocus;
          uniform vec3 c_shirt; uniform vec3 c_shorts; uniform vec3 c_shoe; uniform vec3 c_hair; uniform vec3 c_focus;
          float edge(float f) { float w = max(fwidth(f), 1e-4); return smoothstep(-w, w, f); }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec3 col = diffuseColor.rgb;
          bool sole = col.r > 0.8 && col.g > 0.8;
          col = mix(col, c_shorts, edge(vCloth.y));
          col = mix(col, c_shirt, edge(vCloth.x));
          if (!sole) col = mix(col, c_shoe, edge(vCloth.z));
          col = mix(col, c_hair, edge(vCloth.w));
          diffuseColor.rgb = mix(col, c_focus, clamp(vFocus, 0.0, 1.0) * 0.6);`);
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
