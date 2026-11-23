// Přehrávač animací cviků – jedna sdílená 3D scéna, která se vkládá do otevřené karty cviku.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Mannequin, emptyPose, mergePose, lerpPose } from './mannequin.js';
import { Figure, loadFigureData } from './figure.js';
import { Avatar, loadAvatar } from './avatar.js';
import { ANIMS, BASES } from './exercise-anims.js';
import { EXERCISE_MUSCLES, DEEP_KIND, musclesFor } from './exercise-muscles.js';

export function hasAnimation(id) {
  return !!ANIMS[id];
}

const ease = (t) => t * t * (3 - 2 * t);
// body, jejichž dráhu ukazují šipky pohybu
const PATH_MARKERS = ['lHand', 'rHand', 'lFoot', 'rFoot', 'lKnee', 'rKnee', 'lElbow', 'rElbow', 'forehead', 'head', 'pelvis', 'back', 'lFingertips', 'lHeel', 'rHeel'];
const SIDE_CS = { l: 'levá', r: 'pravá' };

// souhrnná vzdálenost dvou póz (pro míru stahu svalů)
function poseDist(a, b) {
  let d = 0;
  for (const j of Object.keys(a)) {
    const x = a[j], y = b[j];
    if (typeof x === 'number') { d += Math.abs(x - (y || 0)) * 30; continue; }
    if (!x || typeof x !== 'object') continue;
    if (Array.isArray(x)) { x.forEach((v, i) => { d += Math.abs(v - (y?.[i] ?? 0)) * (j === 'root' ? 0 : 1); }); continue; }
    for (const k of Object.keys(x)) {
      const v = x[k];
      if (Array.isArray(v)) v.forEach((w, i) => { d += Math.abs(w - (y?.[k]?.[i] ?? 0)) * (k === 'rot' ? 1 : 0); });
      else if (typeof v === 'number') d += Math.abs(v - (y?.[k] ?? 0)) * (k === 'shift' ? 400 : k === 'elev' || k === 'retr' ? 20 : 1);
    }
  }
  return d;
}
const PROP_MAT = () => new THREE.MeshPhysicalMaterial({ color: 0xb48a62, roughness: 0.6, clearcoat: 0.2 });

export class ExercisePlayer {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'anim-canvas';
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf1f5f7);
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    const key = new THREE.DirectionalLight(0xfff3e8, 2.0);
    key.position.set(1.6, 4, 2.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 4;
    this.key = key;
    this.scene.add(key, key.target, new THREE.HemisphereLight(0xffffff, 0x9aa5ad, 0.55));
    const fill = new THREE.DirectionalLight(0xdde8ff, 0.5);
    fill.position.set(-2.5, 1.5, -1.5);
    this.scene.add(fill);
    this.camera = new THREE.PerspectiveCamera(32, 1.6, 0.05, 30);
    this.target = new THREE.Vector3();          // kamera je pevná – animace ukazuje cvik z nejlepšího úhlu
    this.muscleView = true;
    this.arrows = new THREE.Group();

    // podlaha s měkkým stínem
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(30,45,55,0.22)');
    grd.addColorStop(1, 'rgba(30,45,55,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    this.floor.rotation.x = -Math.PI / 2;
    this.scene.add(this.floor);
    // skutečný vržený stín na podlahu
    this.shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ color: 0x1e2d37, opacity: 0.22 }));
    this.shadowFloor.rotation.x = -Math.PI / 2;
    this.shadowFloor.position.y = 0.0005;
    this.shadowFloor.receiveShadow = true;
    this.scene.add(this.shadowFloor);
    this.groundExtras = [];
    this.reps = 0;

    this.man = null;            // postava se načte při prvním přehrání
    this.props = new THREE.Group();
    this.scene.add(this.props, this.arrows);
    this.attached = [];
    this.bands = [];
    this.playing = true;
    this.speed = 1;
    this.container = null;
    this._raf = null;
    this._tick = this._tick.bind(this);
  }

  // ------------------------------------------------------------------
  load(id) {
    const def = ANIMS[id];
    const base = BASES[def.base];
    this.def = def;
    this.anchorNames = def.anchor || base.anchor;
    const basePose = mergePose(emptyPose(), base.pose);
    this.poses = def.keys.map((k) => mergePose(basePose, k.p));
    // časová osa: výdrž klíče i → přechod do klíče i+1 (poslední se vrací do prvního)
    this.segments = [];
    let t = 0;
    def.keys.forEach((k, i) => {
      const next = (i + 1) % def.keys.length;
      const hold = k.h ?? 0.5;
      this.segments.push({ from: i, to: i, t0: t, t1: t + hold, label: k.label });
      t += hold;
      const d = def.keys[next].d ?? 1.2;
      this.segments.push({ from: i, to: next, t0: t, t1: t + d, label: def.keys[next].label });
      t += d;
    });
    this.duration = t;
    this.time = 0;

    // reference kotev a zemnění v první póze
    this.man.apply(this.poses[0]);
    this._ground();
    this.anchorRef = this._anchorMean();

    this.def.ownBreath = def.keys.some((k) => k.p.breath !== undefined);
    this.reps = 0;
    this.man.setFocus(def.focus || []);
    this.exId = id;
    this.hasMuscles = !!this.man.setActive && this.man.hasMuscles;
    this.man.setMuscleView?.(this.muscleView);
    this._phaseKey = undefined;
    // míra „stahu“ = jak daleko je póza od výchozí (0 = výchozí poloha, 1 = nejdál)
    this.maxDist = Math.max(1e-3, ...this.poses.map((p) => poseDist(p, this.poses[0])));
    this.man.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
    this._buildProps([...(base.props || []).filter((p) => !(def.props || []).some((q) => q.type === p.type)), ...(def.props || [])]);
    this._fitCamera(def.view || 'side');
    // stínová kamera kolem postavy
    const c = this.target;
    const sc = this.key.shadow.camera;
    Object.assign(sc, { left: -1.3, right: 1.3, top: 1.3, bottom: -1.3, near: 0.5, far: 10 });
    sc.updateProjectionMatrix();
    this.key.target.position.set(c.x, 0.4, c.z);
    this.key.position.set(c.x + 1.6, 4, c.z + 2.4);
    this.props.traverse((o) => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });
    this._buildTimeline();
    this._buildArrows();
    this._applyAt(0);
    this._updateMuscles(0, true);
    if (this.labelEl) this.labelEl.textContent = '';
  }

  // ------------------------------------------------------------------
  // svaly: zvýraznění podle fáze cviku a legenda
  _phaseFor(seg) {
    const ph = EXERCISE_MUSCLES[this.exId]?.phase;
    if (!ph) return null;
    if (ph[seg.to] !== undefined) return seg.to;
    if (ph[seg.from] !== undefined) return seg.from;
    return null;
  }

  _updateMuscles(segIndex, force = false) {
    if (!this.hasMuscles) { this._renderLegend(null); return; }
    const seg = this.segments[segIndex];
    const key = this._phaseFor(seg);
    if (!force && key === this._phaseKey) return;
    this._phaseKey = key;
    const m = musclesFor(this.exId, key);
    this.man.setActive(m.work, m.stretch, m.relax);
    this._renderLegend(m);
  }

  _renderLegend(m) {
    const el = this.legendEl;
    if (!el) return;
    el.innerHTML = '';
    if (!m || !this.muscleView) { el.hidden = true; return; }
    const names = (list) => {
      const by = new Map();
      for (const it of list) {
        const [k, s] = it.split('.');
        const nm = this.man.muscleName(k);
        if (!by.has(nm)) by.set(nm, new Set());
        by.get(nm).add(s || 'lr');
      }
      const one = (ss) => (ss.size === 1 && !ss.has('lr') ? [...ss][0] : null);
      const sides = [...by.values()].map(one);
      // všechny svaly na stejné straně → strana jednou na konci řádku
      if (sides.length && sides.every((x) => x && x === sides[0])) {
        const out = [...by.keys()];
        out[out.length - 1] += ` (${SIDE_CS[sides[0]]} strana)`;
        return out;
      }
      return [...by].map(([nm, ss]) => (one(ss) ? `${nm} (${SIDE_CS[one(ss)]})` : nm));
    };
    const rows = [
      ['work', 'Pracuje', names(m.work)], ['stretch', 'Protahuje se', names(m.stretch)], ['relax', 'Uvolňuje se', names(m.relax)],
    ];
    for (const [nm, kind] of m.deep) {
      const row = rows.find((r) => r[0] === kind);
      const txt = `${nm} – hluboko`;
      if (row) row[2].push(txt); else rows.push([kind, DEEP_KIND[kind][0].toUpperCase() + DEEP_KIND[kind].slice(1), [nm]]);
    }
    for (const [kind, title, list] of rows) {
      if (!list.length) continue;
      const r = document.createElement('div');
      r.className = `anim-leg anim-leg-${kind}`;
      r.innerHTML = `<i></i><b>${title}:</b> `;
      r.append(document.createTextNode(list.join(', ')));
      el.appendChild(r);
    }
    el.hidden = !el.childElementCount;
  }

  // ------------------------------------------------------------------
  // šipky pohybu: dráha nejvíc se pohybujících částí těla v každém přechodu
  _buildArrows() {
    for (const o of this.arrows.children) o.traverse((x) => { x.geometry?.dispose(); x.material?.dispose(); });
    this.arrows.clear();
    this.segArrows = this.segments.map(() => null);
    const names = PATH_MARKERS.filter((n) => this.man.markers?.[n]);
    if (!names.length) return;
    const tmp = new THREE.Vector3();
    const dist = this.camera.position.distanceTo(this.target);
    const rad = Math.max(0.004, dist * 0.0042);
    this.segments.forEach((sg, si) => {
      if (sg.from === sg.to) return;
      const N = 18;
      const paths = Object.fromEntries(names.map((n) => [n, []]));
      for (let i = 0; i <= N; i++) {
        this._applyAt(sg.t0 + (sg.t1 - sg.t0) * (i / N) - (i === N ? 1e-4 : 0), true);
        for (const n of names) paths[n].push(this.man.markerPos(n, tmp).clone());
      }
      const cand = names.map((n) => {
        const p = paths[n];
        return { n, p, d: p[0].distanceTo(p[p.length - 1]), len: p.reduce((a, v, i) => a + (i ? v.distanceTo(p[i - 1]) : 0), 0) };
      }).sort((a, b) => b.len - a.len);
      const best = cand[0];
      if (!best || best.len < 0.022) return;
      const pick = [];
      for (const c of cand) {
        if (c.len < Math.max(0.022, best.len * 0.55)) break;
        if (pick.some((q) => q.p[q.p.length - 1].distanceTo(c.p[c.p.length - 1]) < 0.22)) continue;
        pick.push(c);
        if (pick.length >= 2) break;
      }
      const g = new THREE.Group();
      const back = sg.to === 0 && this.segments.length > 2;          // návrat do výchozí polohy
      for (const c of pick) g.add(this._arrowMesh(c.p, rad, back));
      g.visible = false;
      this.arrows.add(g);
      this.segArrows[si] = g;
    });
    this._applyAt(0);
  }

  _arrowMesh(pts, rad, back) {
    // dráhu mírně vyhladit a odsadit konec, aby hrot nekončil uvnitř ruky / nohy
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const L = curve.getLength();
    const head = Math.min(L * 0.35, rad * 6);
    const end = 1 - Math.min(0.12, (rad * 2) / Math.max(L, 1e-3));
    const tubeEnd = Math.max(0.05, end - head / Math.max(L, 1e-3));
    const sub = [];
    for (let i = 0; i <= 24; i++) sub.push(curve.getPointAt(0.04 + (tubeEnd - 0.04) * (i / 24)));
    const g = new THREE.Group();
    const tip = curve.getPointAt(end);
    const dir = tip.clone().sub(curve.getPointAt(tubeEnd)).normalize();
    const tubeGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sub), 32, rad, 8, false);
    // tmavý obrys pod žlutou šipkou, aby byla vidět i přes červené svaly
    for (const [color, scale, opacity, order] of [[0x3d2a00, 1.7, back ? 0.25 : 0.45, 10], [back ? 0xb9c6cf : 0xffc61a, 1, back ? 0.6 : 1, 11]]) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false });
      const tube = new THREE.Mesh(scale === 1 ? tubeGeo : new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sub), 32, rad * scale, 8, false), mat);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.7 * (scale === 1 ? 1 : 1.25), head * (scale === 1 ? 1 : 1.15), 16), mat);
      cone.position.copy(tip).addScaledVector(dir, -head / 2);
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      for (const o of [tube, cone]) o.renderOrder = order;
      g.add(tube, cone);
    }
    return g;
  }

  _buildTimeline() {
    if (!this.track) return;
    this.track.querySelectorAll('.anim-tick').forEach((t) => t.remove());
    for (const sg of this.segments) {
      if (sg.from !== sg.to || sg.t1 - sg.t0 < 0.6) continue;   // výdrže
      const t = document.createElement('div');
      t.className = 'anim-tick';
      t.style.left = `${(sg.t0 / this.duration) * 100}%`;
      t.style.width = `${((sg.t1 - sg.t0) / this.duration) * 100}%`;
      this.track.appendChild(t);
    }
  }

  _updateBar() {
    if (this.fill) this.fill.style.width = `${(this.time / this.duration) * 100}%`;
    if (this.repEl) {
      const txt = this.reps > 0 ? `${this.reps + 1}. opakování` : '';
      if (this.repEl.textContent !== txt) this.repEl.textContent = txt;
    }
  }

  _anchorMean() {
    const v = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    for (const n of this.anchorNames) v.add(this.man.markerPos(n, tmp));
    return v.multiplyScalar(1 / this.anchorNames.length);
  }

  _ground() {
    let minY = this.man.minY();
    for (const f of this.groundExtras) minY = Math.min(minY, f());
    this.man.root.position.y -= minY;
    this.man.root.updateMatrixWorld(true);
  }

  _poseAt(t) {
    let si = this.segments.findIndex((s) => t >= s.t0 && t < s.t1);
    if (si < 0) si = this.segments.length - 1;
    const seg = this.segments[si];
    const k = seg.t1 > seg.t0 ? ease((t - seg.t0) / (seg.t1 - seg.t0)) : 1;
    return { pose: seg.from === seg.to ? this.poses[seg.from] : lerpPose(this.poses[seg.from], this.poses[seg.to], k), label: seg.label, si };
  }

  _applyAt(t, quiet = false) {
    const { pose, label, si } = this._poseAt(t);
    this.segIndex = si;
    if (!quiet && this.maxDist) this.man.setContract?.(Math.min(1, poseDist(pose, this.poses[0]) / this.maxDist));
    // klidné dýchání během cviku (pokud cvik dech sám neřídí)
    if (!this.def.ownBreath) pose.breath = 0.18 + 0.18 * Math.sin((performance.now() / 1000) * (Math.PI * 2 / 4.2));
    this.man.apply(pose);
    const cur = this._anchorMean();
    this.man.root.position.x += this.anchorRef.x - cur.x;
    this.man.root.position.z += this.anchorRef.z - cur.z;
    this.man.root.updateMatrixWorld(true);
    this._ground();
    for (const b of this.bands) b.update();
    for (const a of this.attached) a.update?.(pose);
    return label;
  }

  // ------------------------------------------------------------------
  _buildProps(list) {
    this.props.clear();
    this.groundExtras = [];
    for (const a of this.attached) a.obj.parent?.remove(a.obj);
    this.attached = [];
    this.bands = [];
    const M = (n) => this.man.markerPos(n, new THREE.Vector3());
    const box = this.man.bbox();
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.man.root.quaternion);
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-3) fwd.set(0, 0, 1);
    fwd.normalize();
    const add = (mesh) => { this.props.add(mesh); return mesh; };
    const boxMesh = (w, h, d, mat = PROP_MAT()) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

    for (const p of list) {
      switch (p.type) {
        case 'mat': {
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const m = add(boxMesh(Math.max(0.7, size.x + 0.2), 0.012, Math.max(0.7, size.z + 0.25), new THREE.MeshPhysicalMaterial({ color: 0x7fb7a8, roughness: 0.8 })));
          m.position.set(center.x, 0.006, center.z);
          break;
        }
        case 'chair': {
          const pel = M('pelvis');
          const seatY = pel.y - 0.045;
          const g = new THREE.Group();
          const seat = boxMesh(0.42, 0.035, 0.4);
          seat.position.y = seatY - 0.018;
          g.add(seat);
          if (!p.noBack) {
            const back = boxMesh(0.42, 0.42, 0.03);
            back.position.set(0, seatY + 0.2, -0.2);
            g.add(back);
          }
          for (const [x, z] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) {
            const leg = boxMesh(0.03, seatY, 0.03);
            leg.position.set(x, seatY / 2, z);
            g.add(leg);
          }
          g.position.set(pel.x, 0, pel.z + 0.06);
          g.rotation.y = Math.atan2(fwd.x, fwd.z);
          add(g);
          break;
        }
        case 'chairBack': {
          const h = M(p.at);
          const g = new THREE.Group();
          const back = boxMesh(0.42, 0.45, 0.03);
          back.position.set(0, h.y - 0.24, 0);
          g.add(back);
          const seat = boxMesh(0.42, 0.035, 0.4);
          seat.position.set(0, 0.45, 0.2);
          g.add(seat);
          for (const [x, z] of [[-0.19, 0], [0.19, 0], [-0.19, 0.38], [0.19, 0.38]]) {
            const leg = boxMesh(0.03, 0.45, 0.03);
            leg.position.set(x, 0.225, z);
            g.add(leg);
          }
          g.position.set(0, 0, h.z + 0.04);
          add(g);
          break;
        }
        case 'table': {
          const a = M(p.at);
          const top = a.y + (p.dy ?? -0.03);
          const g = new THREE.Group();
          const t = boxMesh(0.9, 0.03, p.depth ?? 0.6);
          t.position.y = top - 0.015;
          g.add(t);
          for (const [x, z] of [[-0.42, -0.26], [0.42, -0.26], [-0.42, 0.26], [0.42, 0.26]]) {
            const leg = boxMesh(0.035, top - 0.03, 0.035);
            leg.position.set(x, (top - 0.03) / 2, z * ((p.depth ?? 0.6) / 0.6));
            g.add(leg);
          }
          g.position.set(a.x, 0, a.z + (p.depth ?? 0.6) / 2 - 0.12);
          add(g);
          break;
        }
        case 'wall': {
          const a = p.at === 'back' ? M('back') : M(p.at);
          const w = add(boxMesh(0.9, 2.1, 0.04, new THREE.MeshPhysicalMaterial({ color: 0xdfe5ea, roughness: 0.9 })));
          const dir = p.side === 'back' ? -1 : 1;
          w.position.set(a.x, 1.05, a.z + (p.dz ?? 0) + dir * 0.02);
          break;
        }
        case 'door': {
          const l = M('lHand'), r = M('rHand');
          for (const h of [l, r]) {
            const post = add(boxMesh(0.06, 2.1, 0.12, PROP_MAT()));
            post.position.set(h.x + Math.sign(h.x) * 0.035, 1.05, h.z);
          }
          const lintel = add(boxMesh(Math.abs(l.x - r.x) + 0.2, 0.08, 0.12, PROP_MAT()));
          lintel.position.set((l.x + r.x) / 2, 2.1, l.z);
          break;
        }
        case 'step': {
          const f = M(p.at);
          const h = Math.max(0.05, f.y);
          const s = add(boxMesh(0.5, h, 0.32, new THREE.MeshPhysicalMaterial({ color: 0x9aa9b4, roughness: 0.7 })));
          s.position.set(f.x - 0.06, h / 2, f.z - 0.02);
          break;
        }
        case 'roll': {
          const k = M(p.at);
          const r = add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 24), new THREE.MeshPhysicalMaterial({ color: 0xe9c46a, roughness: 0.8 })));
          r.rotation.z = Math.PI / 2;
          r.position.set(k.x, 0.045, k.z);
          break;
        }
        case 'ball': {
          const geo = new THREE.SphereGeometry(p.r || 0.033, 24, 16);
          const mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: p.color ?? 0xc8e04a, roughness: 0.6, sheen: 0.8 }));
          if (p.fixed) {
            const f = M(p.at);
            mesh.position.set(f.x, p.r || 0.033, f.z);
            add(mesh);
          } else {
            const parent = this.man.markers[p.attach].parent;
            mesh.position.copy(this.man.markers[p.attach].position).add(new THREE.Vector3(...(p.offset || [0, 0, 0])));
            parent.add(mesh);
            const a = { obj: mesh };
            if (p.squeeze) {
              a.update = (pose) => {
                const s = 1 - Math.max(0, ((pose.lFingers?.mcp ?? 0) - 40) / 18) * 0.18;
                mesh.scale.set(1, 1, s);
              };
            }
            this.attached.push(a);
          }
          break;
        }
        case 'overball': {
          // měkký míč (Ø ~25 cm): mezi dvěma body těla (stlačuje se), nebo podložený pod tělem / u zdi
          const R = p.r || 0.12;
          const mat = new THREE.MeshPhysicalMaterial({ color: p.color ?? 0xb98ad9, roughness: 0.45, sheen: 0.9, sheenColor: new THREE.Color(0xffffff), clearcoat: 0.3 });
          const mesh = add(new THREE.Mesh(new THREE.SphereGeometry(R, 40, 28), mat));
          const A = new THREE.Vector3(), Bv = new THREE.Vector3(), dir = new THREE.Vector3(...(p.dir || [0, -1, 0])).normalize();
          const sq = p.squash ?? (p.dir && p.dir[1] < 0 ? 0.5 : 0.85);
          const up = new THREE.Vector3(0, 1, 0);
          const update = () => {
            if (p.between) {
              this.man.markerPos(p.between[0], A);
              this.man.markerPos(p.between[1], Bv);
              const ax = Bv.clone().sub(A);
              const d = ax.length();
              const k = Math.max(0.5, Math.min(1, d / (2 * R)));
              mesh.position.copy(A).addScaledVector(ax, 0.5);
              mesh.quaternion.setFromUnitVectors(up, ax.normalize());
              mesh.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k));
            } else {
              this.man.markerPos(p.at, A);
              mesh.position.copy(A).addScaledVector(dir, R * sq);
              mesh.quaternion.setFromUnitVectors(up, dir);
              mesh.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
            }
          };
          this.bands.push({ update });
          if (!p.between && dir.y < -0.5) this.groundExtras.push(() => this.man.markerPos(p.at, A).y - 2 * R * sq);
          update();
          if (p.wall) {
            const w = add(boxMesh(0.9, 2.1, 0.04, new THREE.MeshPhysicalMaterial({ color: 0xdfe5ea, roughness: 0.9 })));
            w.position.set(A.x, 1.05, A.z + dir.z * (2 * R * sq + 0.02));
          }
          break;
        }
        case 'bottle':
        case 'hammer': {
          const parent = this.man.markers[p.attach].parent;
          let mesh;
          if (p.type === 'bottle') {
            mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.2, 20), new THREE.MeshPhysicalMaterial({ color: 0x7cc4e8, roughness: 0.1, transmission: 0.3, transparent: true, opacity: 0.85 }));
            mesh.rotation.z = Math.PI / 2;
          } else {
            mesh = new THREE.Group();
            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 12), PROP_MAT());
            handle.rotation.z = Math.PI / 2;
            const headM = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.035), new THREE.MeshPhysicalMaterial({ color: 0x6b7680, metalness: 0.8, roughness: 0.3 }));
            headM.position.x = 0.14;
            mesh.add(handle, headM);
          }
          mesh.position.copy(this.man.markers[p.attach].position).add(new THREE.Vector3(0, -0.005, 0.01));
          parent.add(mesh);
          this.attached.push({ obj: mesh });
          break;
        }
        case 'band': {
          const mat = new THREE.MeshPhysicalMaterial({ color: p.color ?? 0xe5484d, roughness: 0.5 });
          const mesh = add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 8), mat));
          let fixed = null;
          if (typeof p.to === 'object' && p.to.marker) {
            const m = M(p.to.marker);
            fixed = new THREE.Vector3(m.x + (p.to.dx || 0), m.y + (p.to.dy || 0), m.z + (p.to.dz || 0));
            const post = add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, fixed.y, 12), PROP_MAT()));
            post.position.set(fixed.x, fixed.y / 2, fixed.z);
          }
          const a = new THREE.Vector3(), b = new THREE.Vector3();
          this.bands.push({
            update: () => {
              this.man.markerPos(p.from, a);
              if (fixed) b.copy(fixed); else this.man.markerPos(p.to, b);
              const d = b.clone().sub(a);
              mesh.position.copy(a).addScaledVector(d, 0.5);
              mesh.scale.set(1, d.length(), 1);
              mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
            },
          });
          break;
        }
        default:
          break;
      }
    }
    for (const b of this.bands) b.update();
  }

  _fitCamera(view) {
    // obálka přes všechny klíčové pózy
    const box = new THREE.Box3();
    for (let t = 0; t < this.duration; t += this.duration / 12) {
      this._applyAt(t, true);
      box.union(this.man.bbox());
    }
    this._applyAt(0, true);
    if (view === 'hand') {
      box.makeEmpty();
      const w = this.man.markerPos('lHand');
      box.setFromCenterAndSize(w, new THREE.Vector3(0.3, 0.3, 0.3));
    }
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const dirs = {
      side: [1, 0.18, 0.12], front: [0.12, 0.15, 1], back: [-0.1, 0.18, -1], three: [0.75, 0.3, 0.75],
      threeBack: [0.7, 0.3, -0.7], top: [0.35, 1.4, 0.75], hand: [1, 0.25, 0.45],
    };
    const dir = new THREE.Vector3(...(dirs[view] || dirs.side)).normalize();
    let dist;
    if (view === 'hand') {
      dist = (Math.max(size.x, size.y, size.z) * 0.5) / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 0.95;
    } else {
      // co nejtěsnější záběr: rozměry obálky promítnuté do roviny kamery
      const fwd = dir.clone().negate();
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
      const up = new THREE.Vector3().crossVectors(right, fwd);
      let hx = 0, hy = 0, hz = 0;
      for (let i = 0; i < 8; i++) {
        const c = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(center);
        hx = Math.max(hx, Math.abs(c.dot(right)));
        hy = Math.max(hy, Math.abs(c.dot(up)));
        hz = Math.max(hz, Math.abs(c.dot(fwd)));
      }
      const tv = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      const th = tv * this.camera.aspect;
      dist = Math.max(hx / th, hy / tv) * 1.12 + hz;
    }
    this.target.copy(center);
    this.camera.position.copy(center).addScaledVector(dir, dist);
    this.camera.near = Math.max(0.02, dist / 50);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.target);
  }

  // ------------------------------------------------------------------
  mount(container, id) {
    this.unmount();
    this.container = container;
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'anim-wrap';
    wrap.appendChild(this.canvas);
    this.labelEl = document.createElement('div');
    this.labelEl.className = 'anim-label';
    this.legendEl = document.createElement('div');
    this.legendEl.className = 'anim-legend';
    this.legendEl.hidden = true;
    this.repEl = document.createElement('div');
    this.repEl.className = 'anim-reps';
    // ovládací lišta: přehrát/pauza, znovu, rychlost, průběh s fázemi
    const bar = document.createElement('div');
    bar.className = 'anim-bar';
    const mk = (cls, label, text) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = cls;
      b.setAttribute('aria-label', label);
      b.textContent = text;
      return b;
    };
    const play = mk('anim-ctl', 'Pozastavit nebo přehrát', '❚❚');
    const restart = mk('anim-ctl', 'Od začátku', '↺');
    const speed = mk('anim-ctl anim-speed', 'Rychlost přehrávání', '1×');
    const view = mk('anim-ctl anim-view', 'Přepnout svaly / postavu v oblečení', this.muscleView ? 'Svaly' : 'Postava');
    view.title = 'Přepnout zobrazení svalů';
    view.addEventListener('click', (e) => {
      e.stopPropagation();
      this.muscleView = !this.muscleView;
      view.textContent = this.muscleView ? 'Svaly' : 'Postava';
      this.man?.setMuscleView?.(this.muscleView);
      if (this.hasMuscles) this._updateMuscles(this.segIndex || 0, true);
    });
    this.viewBtn = view;
    this.track = document.createElement('div');
    this.track.className = 'anim-track';
    this.fill = document.createElement('div');
    this.fill.className = 'anim-fill';
    this.track.appendChild(this.fill);
    play.addEventListener('click', (e) => { e.stopPropagation(); this.playing = !this.playing; play.textContent = this.playing ? '❚❚' : '▶'; });
    restart.addEventListener('click', (e) => { e.stopPropagation(); this.time = 0; this.reps = 0; this.playing = true; play.textContent = '❚❚'; });
    speed.addEventListener('click', (e) => { e.stopPropagation(); this.speed = this.speed === 1 ? 0.5 : 1; speed.textContent = this.speed === 1 ? '1×' : '½×'; });
    const seek = (ev) => {
      const r = this.track.getBoundingClientRect();
      this.time = Math.max(0, Math.min(0.999, (ev.clientX - r.left) / r.width)) * this.duration;
    };
    this.track.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); seek(ev); this.track.setPointerCapture(ev.pointerId); });
    this.track.addEventListener('pointermove', (ev) => { if (ev.buttons) seek(ev); });
    bar.append(play, restart, this.track, speed, view);
    this.speed = 1;
    wrap.append(this.labelEl, this.repEl, bar, this.legendEl);
    container.appendChild(wrap);
    this.playing = true;
    this.labelEl.textContent = 'Načítám postavu…';
    this._resize();
    const token = (this._token = (this._token || 0) + 1);
    return this._ensureFigure().then(() => {
      if (token !== this._token || this.container !== container) return;
      this.load(id);
      this.viewBtn.hidden = !this.hasMuscles;
      this._last = performance.now();
      this._raf = requestAnimationFrame(this._tick);
    });
  }

  _ensureFigure() {
    if (!this._figureReady) {
      this._figureReady = loadAvatar().then((gltf) => new Avatar(gltf))
        .catch((err) => {
          console.warn('Postavu pro animace se nepodařilo načíst, zkusím anatomickou.', err);
          return loadFigureData().then((data) => new Figure(data));
        })
        .catch((err) => {
          console.warn('Realistickou postavu se nepodařilo načíst, použije se figurína.', err);
          return new Mannequin();
        }).then((man) => {
        this.man = man;
        this.scene.add(man.root);
      });
    }
    return this._figureReady;
  }

  unmount() {
    this._token = (this._token || 0) + 1;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    if (this.container) this.container.innerHTML = '';
    this.container = null;
  }

  _resize() {
    const w = this.canvas.parentElement?.clientWidth || 320;
    const h = Math.round(w * 0.62);
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = '100%';
    this.canvas.style.height = `${h}px`;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _showArrows() {
    if (!this.segArrows) return;
    // šipka se ukazuje během pohybu a doznívá ve výdrži, která po něm následuje
    let si = this.segIndex;
    const seg = this.segments[si];
    if (seg.from === seg.to) si = seg.from === 0 ? -1 : si - 1;     // ve výchozí poloze bez šipky
    this.segArrows.forEach((g, i) => { if (g) g.visible = i === si; });
  }

  _tick(now) {
    if (!this.container || !this.container.isConnected) { this._raf = null; this.container = null; return; }
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    if (this.playing) {
      const nt = this.time + dt * this.speed;
      if (nt >= this.duration) this.reps++;
      this.time = nt % this.duration;
    }
    this._updateBar();
    const label = this._applyAt(this.time);
    if (this.hasMuscles) this._updateMuscles(this.segIndex);
    this._showArrows();
    if (this.labelEl && this.labelEl.textContent !== (label || '')) this.labelEl.textContent = label || '';
    if (this.canvas.parentElement && Math.abs(this.canvas.parentElement.clientWidth - this.canvas.width / this.renderer.getPixelRatio()) > 2) this._resize();
    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(this._tick);
  }
}
