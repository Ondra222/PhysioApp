// Přehrávač animací cviků – jedna sdílená 3D scéna, která se vkládá do otevřené karty cviku.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Mannequin, emptyPose, mergePose, lerpPose } from './mannequin.js';
import { ANIMS, BASES } from './exercise-anims.js';

export function hasAnimation(id) {
  return !!ANIMS[id];
}

const ease = (t) => t * t * (3 - 2 * t);
const PROP_MAT = () => new THREE.MeshPhysicalMaterial({ color: 0xb48a62, roughness: 0.6, clearcoat: 0.2 });

export class ExercisePlayer {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'anim-canvas';
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf1f5f7);
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(2, 4, 3);
    this.scene.add(key, new THREE.HemisphereLight(0xffffff, 0x9aa5ad, 0.5));
    this.camera = new THREE.PerspectiveCamera(32, 1.6, 0.05, 30);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 0.4;
    this.controls.maxDistance = 6;

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

    this.man = new Mannequin();
    this.scene.add(this.man.root);
    this.props = new THREE.Group();
    this.scene.add(this.props);
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

    this.man.setFocus(def.focus || []);
    this._buildProps([...(base.props || []).filter((p) => !(def.props || []).some((q) => q.type === p.type)), ...(def.props || [])]);
    this._fitCamera(def.view || 'side');
    if (this.labelEl) this.labelEl.textContent = '';
  }

  _anchorMean() {
    const v = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    for (const n of this.anchorNames) v.add(this.man.markerPos(n, tmp));
    return v.multiplyScalar(1 / this.anchorNames.length);
  }

  _ground() {
    const minY = this.man.minY();
    this.man.root.position.y -= minY;
    this.man.root.updateMatrixWorld(true);
  }

  _poseAt(t) {
    const seg = this.segments.find((s) => t >= s.t0 && t < s.t1) || this.segments[this.segments.length - 1];
    const k = seg.t1 > seg.t0 ? ease((t - seg.t0) / (seg.t1 - seg.t0)) : 1;
    return { pose: seg.from === seg.to ? this.poses[seg.from] : lerpPose(this.poses[seg.from], this.poses[seg.to], k), label: seg.label };
  }

  _applyAt(t) {
    const { pose, label } = this._poseAt(t);
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
    for (const a of this.attached) a.obj.parent?.remove(a.obj);
    this.attached = [];
    this.bands = [];
    const M = (n) => this.man.markerPos(n, new THREE.Vector3());
    const box = new THREE.Box3().setFromObject(this.man.root);
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
          const w = add(boxMesh(1.6, 2.1, 0.04, new THREE.MeshPhysicalMaterial({ color: 0xdfe5ea, roughness: 0.9 })));
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
      this._applyAt(t);
      box.union(new THREE.Box3().setFromObject(this.man.root));
    }
    this._applyAt(0);
    if (view === 'hand') {
      box.makeEmpty();
      box.expandByObject(this.man.joints.lWrist);
      box.expandByScalar(0.025);
    }
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const dirs = {
      side: [1, 0.18, 0.12], front: [0.12, 0.15, 1], back: [-0.1, 0.18, -1], three: [0.75, 0.3, 0.75],
      threeBack: [0.7, 0.3, -0.7], top: [0.35, 1.4, 0.75], hand: [1, 0.25, 0.45],
    };
    const dir = new THREE.Vector3(...(dirs[view] || dirs.side)).normalize();
    const radius = view === 'hand' ? Math.max(size.x, size.y, size.z) * 0.5 : Math.max(size.x, size.y, size.z) * 0.6 + 0.05;
    const dist = radius / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 0.95;
    this.controls.minDistance = Math.min(0.4, dist * 0.6);
    this.controls.target.copy(center);
    this.camera.position.copy(center).addScaledVector(dir, dist);
    this.camera.near = Math.max(0.02, dist / 50);
    this.camera.updateProjectionMatrix();
    this.controls.update();
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
    const btn = document.createElement('button');
    btn.className = 'anim-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Pozastavit nebo přehrát');
    btn.textContent = '❚❚';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.playing = !this.playing;
      btn.textContent = this.playing ? '❚❚' : '▶';
    });
    const hint = document.createElement('div');
    hint.className = 'anim-hint';
    hint.textContent = 'táhnutím otočíte';
    wrap.append(this.labelEl, btn, hint);
    container.appendChild(wrap);
    this.playing = true;
    this.load(id);
    this._resize();
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._tick);
  }

  unmount() {
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

  _tick(now) {
    if (!this.container || !this.container.isConnected) { this._raf = null; this.container = null; return; }
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    if (this.playing) this.time = (this.time + dt * this.speed) % this.duration;
    const label = this._applyAt(this.time);
    if (this.labelEl && this.labelEl.textContent !== (label || '')) this.labelEl.textContent = label || '';
    if (this.canvas.parentElement && Math.abs(this.canvas.parentElement.clientWidth - this.canvas.width / this.renderer.getPixelRatio()) > 2) this._resize();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(this._tick);
  }
}
