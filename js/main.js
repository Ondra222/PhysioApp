import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Body, LAYER_DEFS } from './body.js';
import { detectRegion, REGIONS, SIDES } from './regions.js';
import { SYMPTOMS, SYMPTOM_ADVICE, selectExercises, redFlags } from './exercises.js';

// ---------------------------------------------------------------------------
// Stav a ukládání
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'physioapp.v2';
const LARGE_SCREEN = window.matchMedia('(min-width: 821px) and (pointer: fine)').matches;
const state = {
  hq: LARGE_SCREEN,
  mode: 'explore',
  symptom: 'bolest',
  layers: { skin: true, muscles: true, bones: false, vessels: false, nerves: false },
  skinOpacity: 0.3,
  complaints: [],
  activeComplaint: null,
};

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved) {
      Object.assign(state.layers, saved.layers || {});
      if (typeof saved.skinOpacity === 'number') state.skinOpacity = saved.skinOpacity;
      if (typeof saved.hq === 'boolean') state.hq = saved.hq;
      if (Array.isArray(saved.complaints)) state.complaints = saved.complaints;
    }
  } catch { /* úložiště nemusí být dostupné */ }
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      layers: state.layers, skinOpacity: state.skinOpacity, complaints: state.complaints, hq: state.hq,
    }));
  } catch { /* ignorovat */ }
}

// ---------------------------------------------------------------------------
// Scéna
// ---------------------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
const viewport = $('#viewport');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe7ecef);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;

const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
camera.position.set(0, 0.95, 3.4);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.85, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.35;
controls.maxDistance = 6;
controls.screenSpacePanning = true;
controls.update();

scene.add(new THREE.HemisphereLight(0xffffff, 0x8f9ba4, 0.4));
const key = new THREE.DirectionalLight(0xfff1e4, 2.4);
key.position.set(1.4, 3.2, 2.6);
key.target.position.set(0, 0.85, 0);
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -0.6, right: 0.6, top: 1.0, bottom: -1.0, near: 1, far: 8 });
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.012;
key.shadow.radius = 3;
scene.add(key, key.target);
const fill = new THREE.DirectionalLight(0xe6eeff, 0.6);
fill.position.set(-2.5, 1.5, 1.5);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xdfeaff, 0.8);
rim.position.set(-2, 2, -3);
scene.add(rim);

// Měkký stín pod postavou
const floorTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(40,55,65,0.35)');
  grd.addColorStop(1, 'rgba(40,55,65,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(0.9, 0.9),
  new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0.001;
scene.add(floor);

const body = new Body();
scene.add(body.root);

const markerGroup = new THREE.Group();
scene.add(markerGroup);

// Vysoká kvalita: vržené stíny (struktury si navzájem stíní, model působí plastičtěji)
function applyQuality() {
  renderer.shadowMap.enabled = state.hq;
  key.castShadow = state.hq;
  body.root.traverse((o) => {
    if (o.isMesh) {
      const translucentSkin = o.userData.layer === 'skin' && state.skinOpacity < 1;
      o.castShadow = state.hq && !translucentSkin;
      o.receiveShadow = state.hq;
    }
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, state.hq ? 2 : 1.5));
  resize();
  scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
}

function resize() {
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport);
resize();

// ---------------------------------------------------------------------------
// Vrstvy
// ---------------------------------------------------------------------------
function applyLayers() {
  // Neprůhledná kůže zakrývá vše uvnitř – vnitřní vrstvy pak nekreslíme
  // (šetří výkon a nepřečnívají drobné nepřesnosti modelu skrz kůži).
  const skinCovers = state.layers.skin && body.loaded.skin && state.skinOpacity >= 0.98;
  for (const [k, g] of Object.entries(body.layers)) {
    g.visible = !!state.layers[k] && !!body.loaded[k] && (k === 'skin' || !skinCovers);
  }
  body.layers.skin.traverse((o) => {
    if (o.isMesh) {
      o.material.opacity = state.skinOpacity;
      o.material.transparent = state.skinOpacity < 1;
      o.material.depthWrite = state.skinOpacity >= 1;
    }
  });
}

function renderLayerList() {
  const list = $('#layer-list');
  list.innerHTML = '';
  for (const [k, def] of Object.entries(LAYER_DEFS)) {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" ${state.layers[k] ? 'checked' : ''}/>
      <span class="dot" style="background:${def.color}"></span><span class="lname">${def.name}</span>
      <small class="lstatus" data-layer="${k}"></small>`;
    label.querySelector('input').addEventListener('change', (e) => {
      state.layers[k] = e.target.checked;
      if (e.target.checked) loadLayer(k);
      applyLayers();
      save();
    });
    list.appendChild(label);
  }
  const hq = $('#hq-toggle');
  hq.checked = state.hq;
  hq.addEventListener('change', () => {
    state.hq = hq.checked;
    applyQuality();
    save();
  });
  const slider = $('#skin-opacity');
  slider.value = state.skinOpacity;
  slider.addEventListener('input', () => {
    const wasOpaque = state.skinOpacity >= 1;
    state.skinOpacity = parseFloat(slider.value);
    applyLayers();
    if (wasOpaque !== (state.skinOpacity >= 1)) applyQuality();
    save();
  });
}

// ---------------------------------------------------------------------------
// Kamera
// ---------------------------------------------------------------------------
let tween = null;
// Přelet kamery po kouli kolem cíle (ne napříč tělem).
function flyTo(target, camPos, duration = 700) {
  const from = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  const to = new THREE.Spherical().setFromVector3(camPos.clone().sub(target));
  let dTheta = to.theta - from.theta;
  if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
  if (dTheta < -Math.PI) dTheta += 2 * Math.PI;
  tween = {
    t0: performance.now(), duration,
    fromT: controls.target.clone(), toT: target.clone(), from, to, dTheta,
  };
}
const VIEWS = {
  front: [0, 0.95, 3.4], back: [0, 0.95, -3.4], left: [3.4, 0.95, 0], right: [-3.4, 0.95, 0],
};
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  const v = VIEWS[b.dataset.view];
  flyTo(new THREE.Vector3(0, 0.85, 0), new THREE.Vector3(...v));
}));

function focusPoint(p) {
  const target = new THREE.Vector3(...p);
  const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
  // Pokud je bod na odvrácené straně, otočíme kameru k němu.
  const outward = new THREE.Vector3(p[0], 0, p[2]);
  if (outward.lengthSq() > 1e-4) {
    outward.normalize();
    if (dir.dot(outward) < 0) dir.copy(outward).setY(0.15).normalize();
  }
  flyTo(target, target.clone().addScaledVector(dir, 1.1));
}

// ---------------------------------------------------------------------------
// Výběr (raycasting)
// ---------------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function rayFromEvent(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
}

function visiblePickables() {
  return body.pickables.filter((m) => body.layers[m.userData.layer].visible);
}

function hitsAt(e) {
  rayFromEvent(e);
  return raycaster.intersectObjects(visiblePickables(), false);
}

/** Struktura, kterou uživatel „vidí“ – průhlednou kůži přeskočí. */
function pickStructure(hits) {
  if (!hits.length) return null;
  const skinSeeThrough = state.skinOpacity < 0.6;
  return hits.find((h) => !(skinSeeThrough && h.object.userData.layer === 'skin')) || hits[0];
}

function markerAt(e) {
  rayFromEvent(e);
  const hit = raycaster.intersectObjects(markerGroup.children, false)[0];
  return hit ? hit.object.userData.complaintId : null;
}

let selectedMesh = null;
function highlight(mesh) {
  if (selectedMesh && selectedMesh.material.emissive) {
    selectedMesh.material.emissive.setHex(selectedMesh.userData.baseEmissive ?? 0);
  }
  selectedMesh = mesh;
  if (mesh && mesh.userData.layer !== 'skin' && mesh.material.emissive) {
    if (mesh.userData.baseEmissive === undefined) mesh.userData.baseEmissive = mesh.material.emissive.getHex();
    mesh.material.emissive.setHex(0x2f6f62);
  }
}

function displayName(ud) {
  const side = ud.side ? ` (${SIDES[ud.side]})` : '';
  return `${ud.name}${side}`;
}

// Kliknutí vs. otáčení
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY, t: performance.now() };
  tween = null;
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  const dt = performance.now() - down.t;
  down = null;
  if (moved < 6 && dt < 700) handleClick(e);
});

function handleClick(e) {
  const mid = markerAt(e);
  if (mid) { openComplaint(mid); return; }

  const hits = hitsAt(e);
  if (!hits.length) {
    if (state.mode === 'explore') closeInfo();
    return;
  }
  if (state.mode === 'mark') {
    createComplaint(hits[0].point, hits);
  } else {
    const h = pickStructure(hits);
    highlight(h.object);
    showStructure(h.object.userData, h.point, hits);
  }
}

// Tooltip při najetí myší
const tooltip = $('#tooltip');
let hoverEvent = null;
let lastHover = 0;
renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.buttons) { tooltip.hidden = true; return; }
  hoverEvent = e;
});
renderer.domElement.addEventListener('pointerleave', () => { hoverEvent = null; tooltip.hidden = true; });

function updateHover(now) {
  if (!hoverEvent || now - lastHover < 90) return;
  lastHover = now;
  const e = hoverEvent;
  hoverEvent = null;
  const mid = markerAt(e);
  let text = null;
  if (mid) {
    const c = state.complaints.find((x) => x.id === mid);
    if (c) text = `${SYMPTOMS[c.symptom].name} – ${REGIONS[c.region].name}`;
  } else {
    const h = pickStructure(hitsAt(e));
    if (h) text = displayName(h.object.userData);
  }
  if (!text) { tooltip.hidden = true; return; }
  const r = viewport.getBoundingClientRect();
  tooltip.textContent = text;
  tooltip.style.left = `${e.clientX - r.left}px`;
  tooltip.style.top = `${e.clientY - r.top}px`;
  tooltip.hidden = false;
}

// ---------------------------------------------------------------------------
// Potíže (značky)
// ---------------------------------------------------------------------------
const markerGeo = new THREE.SphereGeometry(0.013, 20, 14);
const haloGeo = new THREE.SphereGeometry(0.026, 20, 14);

function rebuildMarkers() {
  markerGroup.clear();
  for (const c of state.complaints) {
    const color = new THREE.Color(SYMPTOMS[c.symptom].color);
    const dot = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color }));
    dot.position.set(...c.point);
    dot.renderOrder = 20;
    dot.userData.complaintId = c.id;
    const halo = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.3, depthWrite: false,
    }));
    halo.renderOrder = 19;
    halo.raycast = () => {};
    halo.userData.isHalo = true;
    halo.userData.complaintId = c.id;
    dot.add(halo);
    markerGroup.add(dot);
  }
}

function structuresAlong(hits, maxDepth = 0.06) {
  const names = [];
  const d0 = hits.length ? hits[0].distance : 0;
  for (const h of hits) {
    if (h.distance - d0 > maxDepth) break;
    const ud = h.object.userData;
    if (ud.layer === 'skin') continue;
    const n = ud.name;
    if (!names.includes(n)) names.push(n);
    if (names.length >= 4) break;
  }
  return names;
}

function createComplaint(point, hits) {
  // Značku mírně vysuneme po normále povrchu, aby nebyla zapuštěná.
  const pos = point.clone();
  const h0 = hits[0];
  if (h0?.face) pos.addScaledVector(h0.face.normal.clone().transformDirection(h0.object.matrixWorld), 0.006);
  const p = [pos.x, pos.y, pos.z].map((v) => Math.round(v * 1000) / 1000);
  const { region, side } = detectRegion(p);
  const c = {
    id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    point: p, region, side, symptom: state.symptom, intensity: 5,
    structures: structuresAlong(hits), created: Date.now(),
  };
  state.complaints.push(c);
  save();
  rebuildMarkers();
  renderComplaintList();
  openComplaint(c.id);
}

function deleteComplaint(id) {
  state.complaints = state.complaints.filter((c) => c.id !== id);
  if (state.activeComplaint === id) { state.activeComplaint = null; closeInfo(); }
  save();
  rebuildMarkers();
  renderComplaintList();
}

function complaintTitle(c) {
  const side = c.side && c.side !== 'stred' ? `, ${SIDES[c.side]}` : '';
  return `${REGIONS[c.region].name}${side}`;
}

function renderComplaintList() {
  const ul = $('#complaint-list');
  ul.innerHTML = '';
  $('#no-complaints').hidden = state.complaints.length > 0;
  for (const c of state.complaints) {
    const li = document.createElement('li');
    if (c.id === state.activeComplaint) li.classList.add('active');
    li.innerHTML = `<span class="dot" style="background:${SYMPTOMS[c.symptom].color}"></span>
      <span class="meta">${SYMPTOMS[c.symptom].name} · ${c.intensity}/10<small>${complaintTitle(c)}</small></span>
      <button class="del" title="Smazat" aria-label="Smazat">✕</button>`;
    li.addEventListener('click', (e) => {
      if (e.target.closest('.del')) { deleteComplaint(c.id); return; }
      openComplaint(c.id);
      focusPoint(c.point);
      document.body.classList.remove('panel-open');
    });
    ul.appendChild(li);
  }
}

// ---------------------------------------------------------------------------
// Info panel
// ---------------------------------------------------------------------------
const infoPanel = $('#info-panel');
const infoContent = $('#info-content');

function openInfo(html) {
  infoContent.innerHTML = html;
  infoPanel.hidden = false;
  infoPanel.scrollTop = 0;
  document.body.classList.add('info-open');
}
function closeInfo() {
  infoPanel.hidden = true;
  document.body.classList.remove('info-open');
  highlight(null);
  state.activeComplaint = null;
  renderComplaintList();
}
$('#close-info').addEventListener('click', closeInfo);

function showStructure(ud, point, hits) {
  state.activeComplaint = null;
  renderComplaintList();
  const def = LAYER_DEFS[ud.layer];
  const { region } = detectRegion([point.x, point.y, point.z]);
  const under = ud.layer === 'skin' ? structuresAlong(hits) : [];
  openInfo(`
    <div class="badge"><span class="dot" style="background:${def.color}"></span>${def.name}</div>
    <h2 class="info-title">${displayName(ud)}</h2>
    ${ud.latin ? `<p class="latin">${ud.latin}</p>` : ''}
    <p class="desc">${ud.desc}</p>
    <p class="kv">Oblast: <b>${REGIONS[region].name}</b></p>
    ${under.length ? `<p class="kv">Pod kůží: <b>${under.join(', ')}</b></p>` : ''}
    <button class="btn" id="mark-here">📍 Mám tady potíže</button>
  `);
  $('#mark-here').addEventListener('click', () => {
    setMode('mark');
    createComplaint(point, hits);
  });
}

function exerciseCard(ex) {
  return `<details class="exercise">
    <summary><span><span class="t">${ex.name}</span>${ex.gentle ? '<span class="tag-gentle">šetrné</span>' : ''}
      <span class="d">${ex.dose}</span></span></summary>
    <ol>${ex.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
    ${ex.caution ? `<p class="caution">⚠️ ${ex.caution}</p>` : ''}
  </details>`;
}

function openComplaint(id) {
  const c = state.complaints.find((x) => x.id === id);
  if (!c) return;
  state.activeComplaint = id;
  highlight(null);
  renderComplaintList();
  renderComplaint(c);
}

function renderComplaint(c) {
  const sym = SYMPTOMS[c.symptom];
  const list = selectExercises(c.region, c.symptom, c.intensity);
  const strong = c.intensity >= 7;
  const flags = redFlags(c.region);

  openInfo(`
    <div class="badge"><span class="dot" style="background:${sym.color}"></span>${sym.name}</div>
    <h2 class="info-title">${complaintTitle(c)}</h2>
    ${c.structures?.length ? `<p class="kv">V tomto místě: <b>${c.structures.join(', ')}</b></p>` : ''}

    <div class="symptom-switch">
      ${Object.entries(SYMPTOMS).map(([k, s]) => `<button class="chip ${k === c.symptom ? 'active' : ''}" data-sym="${k}">
        <i style="background:${s.color}"></i>${s.name}</button>`).join('')}
    </div>
    <div class="intensity">
      <span>Intenzita</span>
      <input type="range" min="1" max="10" step="1" value="${c.intensity}" id="intensity" />
      <output id="intensity-out">${c.intensity}/10</output>
    </div>

    ${strong ? `<div class="warn"><b>Silné potíže.</b> Při intenzitě 7/10 a více doporučujeme nejdřív konzultaci s lékařem
      nebo fyzioterapeutem. Níže jsou jen nejšetrnější cviky.</div>` : ''}
    <div class="advice">${SYMPTOM_ADVICE[c.symptom]}</div>

    <details class="flags">
      <summary>⚠️ Kdy nečekat a jít k lékaři</summary>
      <ul>${flags.map((f) => `<li>${f}</li>`).join('')}</ul>
    </details>

    <h3 class="small muted">DOPORUČENÁ CVIČENÍ (${list.length})</h3>
    ${list.length ? list.map(exerciseCard).join('') : '<p class="muted">Pro tuto kombinaci zatím nemáme vhodné cvičení. Obraťte se prosím na odborníka.</p>'}
    <p class="muted small">Cvičte pravidelně, pomalu a bez ostré bolesti. Pokud se potíže do 2–3 týdnů nezlepší, vyhledejte odborníka.</p>
    <button class="btn ghost" id="del-complaint">Smazat tuto potíž</button>
  `);

  const slider = $('#intensity');
  slider.addEventListener('input', () => { $('#intensity-out').textContent = `${slider.value}/10`; });
  slider.addEventListener('change', () => {
    c.intensity = parseInt(slider.value, 10);
    save();
    renderComplaintList();
    const scroll = infoPanel.scrollTop;
    renderComplaint(c);
    infoPanel.scrollTop = scroll;
  });
  infoContent.querySelectorAll('[data-sym]').forEach((b) => b.addEventListener('click', () => {
    c.symptom = b.dataset.sym;
    save();
    rebuildMarkers();
    renderComplaintList();
    renderComplaint(c);
  }));
  $('#del-complaint').addEventListener('click', () => deleteComplaint(c.id));
}

// ---------------------------------------------------------------------------
// Režimy a lišta
// ---------------------------------------------------------------------------
const HINTS = {
  explore: 'Táhnutím otáčejte, kolečkem nebo dvěma prsty přibližujte. Klepnutím na část těla zobrazíte popis.',
  mark: (s) => `Klepněte na místo, kde cítíte: ${SYMPTOMS[s].name.toLowerCase()}.`,
};
function updateHint() {
  $('#hint').textContent = state.mode === 'explore' ? HINTS.explore : HINTS.mark(state.symptom);
}

function setMode(mode) {
  state.mode = mode;
  document.body.dataset.mode = mode;
  document.querySelectorAll('[data-mode]').forEach((b) => {
    if (b.tagName === 'BUTTON') b.classList.toggle('active', b.dataset.mode === mode);
  });
  updateHint();
}
document.querySelectorAll('button[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

document.querySelectorAll('#symptom-picker [data-symptom]').forEach((b) => b.addEventListener('click', () => {
  state.symptom = b.dataset.symptom;
  document.querySelectorAll('#symptom-picker [data-symptom]').forEach((x) => x.classList.toggle('active', x === b));
  updateHint();
}));

$('#toggle-panel').addEventListener('click', () => document.body.classList.toggle('panel-open'));

// ---------------------------------------------------------------------------
// Smyčka
// ---------------------------------------------------------------------------
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

function animate(now) {
  if (tween) {
    const k = Math.min(1, (now - tween.t0) / tween.duration);
    const e = easeInOut(k);
    controls.target.lerpVectors(tween.fromT, tween.toT, e);
    const sph = new THREE.Spherical(
      tween.from.radius + (tween.to.radius - tween.from.radius) * e,
      tween.from.phi + (tween.to.phi - tween.from.phi) * e,
      tween.from.theta + tween.dTheta * e,
    );
    camera.position.setFromSpherical(sph).add(controls.target);
    if (k >= 1) tween = null;
  }
  controls.update();
  updateHover(now);

  const pulse = 1 + 0.25 * Math.sin(now / 280);
  for (const m of markerGroup.children) {
    const halo = m.children[0];
    const active = m.userData.complaintId === state.activeComplaint;
    halo.scale.setScalar(active ? pulse * 1.25 : 1);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Načítání modelu
// ---------------------------------------------------------------------------
const loadingEl = $('#loading');
function setLayerStatus(layer, text) {
  const el = document.querySelector(`.lstatus[data-layer="${layer}"]`);
  if (el) el.textContent = text;
}
async function loadLayer(layer, onProgress) {
  if (body.loaded[layer]) return;
  setLayerStatus(layer, 'načítám…');
  try {
    await body.ensureLayer(layer, (p) => {
      setLayerStatus(layer, `${Math.round(p * 100)} %`);
      onProgress?.(p);
    });
    setLayerStatus(layer, '');
    applyQuality();
  } catch (err) {
    console.error(err);
    setLayerStatus(layer, 'chyba');
  }
  applyLayers();
}

async function start() {
  load();
  renderLayerList();
  rebuildMarkers();
  renderComplaintList();
  setMode('explore');
  requestAnimationFrame(animate);

  await body.init();
  applyLayers();
  // Nejdřív viditelné vrstvy (s ukazatelem průběhu), ostatní se načtou až při zapnutí.
  const visible = Object.keys(LAYER_DEFS).filter((k) => state.layers[k]);
  const progress = Object.fromEntries(visible.map((k) => [k, 0]));
  const update = () => {
    const p = Object.values(progress).reduce((a, b) => a + b, 0) / Math.max(1, visible.length);
    loadingEl.textContent = `Načítám anatomický model… ${Math.round(p * 100)} %`;
  };
  update();
  await Promise.all(visible.map((k) => loadLayer(k, (p) => { progress[k] = p; update(); })));
  loadingEl.remove();
}
start();

// Pro ladění a testy
window.physio = { state, body, camera, controls, scene, renderer, flyTo, THREE };
