// Animace cviků pro figurínu (js/mannequin.js).
//
// base:   výchozí poloha (stand, sit, supine, hook, prone, quad, side, sideHook, kneel, longSit)
// keys:   klíčové pózy { p: změny oproti výchozí poloze, d: přechod (s), h: výdrž (s), label }
// view:   side (z levého boku), front, back, three (šikmo zepředu), top, threeBack
// anchor: body, které zůstávají na místě (např. chodidla); figurína se navíc vždy postaví na zem
// props:  pomůcky (chair, table, wall, ball, band, roll, step, door, bottle, hammer, mat, towel)
// focus:  zvýrazněné části těla (cílová oblast)

const ARMS_DOWN = { lShoulder: { abd: 6 }, rShoulder: { abd: 6 }, lElbow: { sup: 90, flex: 8 }, rElbow: { sup: 90, flex: 8 }, lFingers: { mcp: 12, ip: 12 }, rFingers: { mcp: 12, ip: 12 } };
const HANDS_ON_THIGHS = { lShoulder: { flex: 14, abd: 8 }, rShoulder: { flex: 14, abd: 8 }, lElbow: { flex: 62, sup: 90 }, rElbow: { flex: 62, sup: 90 }, lWrist: { flex: -10 }, rWrist: { flex: -10 } };
const both = (j, v) => ({ [`l${j}`]: v, [`r${j}`]: v });

export const BASES = {
  stand: { pose: { ...ARMS_DOWN }, anchor: ['lFoot', 'rFoot'] },
  sit: { pose: { ...HANDS_ON_THIGHS, ...both('Hip', { flex: 90, abd: 4 }), ...both('Knee', { flex: 88 }), lFingers: { mcp: 15, ip: 15 }, rFingers: { mcp: 15, ip: 15 } }, anchor: ['pelvis'], props: [{ type: 'chair' }] },
  supine: { pose: { root: { rot: [-90, 0, 0] }, ...ARMS_DOWN, ...both('Ankle', { dorsi: -20 }) }, anchor: ['pelvis'], props: [{ type: 'mat' }] },
  hook: { pose: { root: { rot: [-90, 0, 0] }, ...ARMS_DOWN, ...both('Hip', { flex: 50 }), ...both('Knee', { flex: 100 }), ...both('Ankle', { dorsi: 5 }) }, anchor: ['pelvis'], props: [{ type: 'mat' }] },
  prone: { pose: { root: { rot: [90, 0, 0] }, ...ARMS_DOWN, ...both('Ankle', { dorsi: -40 }), head: { flex: -10 } }, anchor: ['pelvis'], props: [{ type: 'mat' }] },
  quad: { pose: { root: { rot: [90, 0, 0] }, ...both('Shoulder', { flex: 88 }), ...both('Elbow', { sup: 90 }), ...both('Wrist', { flex: -80 }), ...both('Hip', { flex: 88 }), ...both('Knee', { flex: 92 }), ...both('Ankle', { dorsi: -40 }), neck: { flex: -12 } }, anchor: ['lHand', 'rHand', 'lKnee', 'rKnee'], props: [{ type: 'mat' }] },
  side: { pose: { root: { rot: [0, 0, 90] }, ...ARMS_DOWN, neck: { lat: 15 } }, anchor: ['pelvis'], props: [{ type: 'mat' }] },
  sideHook: { pose: { root: { rot: [0, 0, 90] }, ...both('Hip', { flex: 50 }), ...both('Knee', { flex: 95 }), ...both('Shoulder', { flex: 85 }), ...both('Elbow', { sup: 90, flex: 10 }), neck: { lat: 18 } }, anchor: ['pelvis'], props: [{ type: 'mat' }] },
  kneel: { pose: { ...ARMS_DOWN, lHip: { flex: 85 }, lKnee: { flex: 88 }, rHip: { flex: -8 }, rKnee: { flex: 95 }, rAnkle: { dorsi: -35 }, lShoulder: { flex: 20, abd: 6 }, lElbow: { flex: 60, sup: 90 }, rElbow: { sup: 90, flex: 8 } }, anchor: ['lFoot', 'rKnee'], props: [{ type: 'mat' }] },
  longSit: { pose: { ...both('Hip', { flex: 88 }), ...both('Shoulder', { abd: 12, flex: 10 }), ...both('Elbow', { sup: 90 }), ...both('Ankle', { dorsi: -15 }) }, anchor: ['pelvis'], props: [{ type: 'mat' }] },
};

export const ANIMS = {
  // ---------------- Krk a hlava ----------------
  'chin-tuck': {
    base: 'sit', view: 'side', focus: ['neck'],
    keys: [{ p: {}, h: 0.6 }, { p: { head: { shift: 0.028, flex: 10 }, neck: { flex: -6 } }, d: 1, h: 1.6, label: 'výdrž 5 s' }],
  },
  suboccipital: {
    base: 'hook', view: 'side', focus: ['neck', 'head'], props: [{ type: 'ball', attach: 'headBack', r: 0.033, offset: [0.025, 0, 0] }, { type: 'ball', attach: 'headBack', r: 0.033, offset: [-0.025, 0, 0] }],
    keys: [{ p: {}, h: 0.3 }, { p: { head: { flex: 8 } }, d: 0.8, h: 0.2 }, { p: { head: { flex: -4 } }, d: 0.8, h: 0.2 }],
  },
  'upper-trap': {
    base: 'sit', view: 'front', focus: ['neck', 'lShoulder'],
    keys: [
      { p: { lShoulder: { flex: 5, abd: 12 }, lElbow: { flex: 5 } }, h: 0.5 },
      { p: { lShoulder: { flex: 5, abd: 12 }, lElbow: { flex: 5 }, lScap: { elev: -0.6 }, neck: { lat: -28 }, head: { lat: -12 }, rShoulder: { flex: 110, abd: 70, hadd: 30 }, rElbow: { flex: 125, sup: 30 } }, d: 1.4, h: 2, label: 'výdrž 30 s' },
    ],
  },
  levator: {
    base: 'sit', view: 'three', focus: ['neck', 'lShoulder'],
    keys: [
      { p: { lShoulder: { abd: 12 } }, h: 0.5 },
      { p: { lShoulder: { abd: 12 }, lScap: { elev: -0.6 }, neck: { rot: -35, flex: 22 }, head: { flex: 20 }, rShoulder: { flex: 120, abd: 40, hadd: 20 }, rElbow: { flex: 120, sup: 40 } }, d: 1.4, h: 2, label: 'výdrž 30 s' },
    ],
  },
  'neck-iso': {
    base: 'sit', view: 'three', focus: ['neck'],
    keys: [
      { p: {}, h: 0.4 },
      { p: { rShoulder: { flex: 115, hadd: 30 }, rElbow: { flex: 125, sup: 180 }, rWrist: { flex: -20 } }, d: 1, h: 1.6, label: 'tlak do dlaně 5–8 s' },
      { p: {}, d: 0.8, h: 0.3 },
      { p: { rShoulder: { flex: 60, abd: 85, hadd: 10 }, rElbow: { flex: 140, sup: 90 }, rWrist: { flex: -10 } }, d: 1, h: 1.6, label: 'tlak do strany' },
    ],
  },
  'median-glide': {
    base: 'stand', view: 'front', focus: ['lUpperArm', 'lForearm', 'lHand'],
    keys: [
      { p: { lShoulder: { abd: 88 }, lElbow: { flex: 35, sup: 0 }, lWrist: { flex: 0 }, neck: { lat: -15 } }, h: 0.3 },
      { p: { lShoulder: { abd: 88 }, lElbow: { flex: 0, sup: 0 }, lWrist: { flex: -60 }, lFingers: { mcp: -10 }, neck: { lat: 22 } }, d: 1.4, h: 0.3 },
    ],
  },
  'ulnar-glide': {
    base: 'stand', view: 'front', focus: ['lUpperArm', 'lForearm', 'lHand'],
    keys: [
      { p: { lShoulder: { abd: 85 }, lElbow: { flex: 0, sup: 180 }, lWrist: { flex: 0 } }, h: 0.3 },
      { p: { lShoulder: { abd: 95, rot: 30 }, lElbow: { flex: 125, sup: 180 }, lWrist: { flex: -70 } }, d: 1.5, h: 0.6 },
    ],
  },
  breathing: {
    base: 'hook', view: 'three', focus: ['abdomen'],
    keys: [
      { p: { lShoulder: { flex: 12, abd: 16, rot: -88 }, lElbow: { flex: 78 }, rShoulder: { flex: 6, abd: 14, rot: -88 }, rElbow: { flex: 72 }, breath: 0 }, h: 0.3 },
      { p: { lShoulder: { flex: 12, abd: 16, rot: -88 }, lElbow: { flex: 78 }, rShoulder: { flex: 6, abd: 14, rot: -88 }, rElbow: { flex: 72 }, breath: 1 }, d: 2.2, h: 0.4, label: 'nádech nosem' },
      { p: { lShoulder: { flex: 12, abd: 16, rot: -88 }, lElbow: { flex: 78 }, rShoulder: { flex: 6, abd: 14, rot: -88 }, rElbow: { flex: 72 }, breath: 0 }, d: 3, h: 0.3, label: 'pomalý výdech' },
    ],
  },

  // ---------------- Rameno ----------------
  pendulum: {
    base: 'stand', view: 'three', focus: ['lUpperArm', 'lShoulder'], props: [{ type: 'table', at: 'rHand', dy: -0.015 }],
    keys: [
      { p: { lumbar: { flex: 30 }, thoracic: { flex: 30 }, ...both('Hip', { flex: 15 }), ...both('Knee', { flex: 12 }), rShoulder: { flex: 60, abd: 10 }, rElbow: { flex: 5, sup: 180 }, rWrist: { flex: -70 }, lShoulder: { flex: 72, hadd: 0 }, lElbow: { flex: 5 } }, h: 0.1 },
      { p: { lumbar: { flex: 30 }, thoracic: { flex: 30 }, ...both('Hip', { flex: 15 }), ...both('Knee', { flex: 12 }), rShoulder: { flex: 60, abd: 10 }, rElbow: { flex: 5, sup: 180 }, rWrist: { flex: -70 }, lShoulder: { flex: 88, hadd: 15 }, lElbow: { flex: 5 } }, d: 0.8, h: 0 },
      { p: { lumbar: { flex: 30 }, thoracic: { flex: 30 }, ...both('Hip', { flex: 15 }), ...both('Knee', { flex: 12 }), rShoulder: { flex: 60, abd: 10 }, rElbow: { flex: 5, sup: 180 }, rWrist: { flex: -70 }, lShoulder: { flex: 72, hadd: -18, abd: 12 }, lElbow: { flex: 5 } }, d: 0.8, h: 0 },
      { p: { lumbar: { flex: 30 }, thoracic: { flex: 30 }, ...both('Hip', { flex: 15 }), ...both('Knee', { flex: 12 }), rShoulder: { flex: 60, abd: 10 }, rElbow: { flex: 5, sup: 180 }, rWrist: { flex: -70 }, lShoulder: { flex: 55, hadd: 0 }, lElbow: { flex: 5 } }, d: 0.8, h: 0 },
    ],
  },
  'ext-rot': {
    base: 'stand', view: 'top', focus: ['lShoulder', 'lUpperArm'], props: [{ type: 'band', from: 'lHand', to: { marker: 'lHand', dx: -0.45, dz: 0.25 } }],
    keys: [
      { p: { lShoulder: { abd: 4, rot: -10 }, lElbow: { flex: 90, sup: 90 }, lFingers: { mcp: 70, ip: 80 } }, h: 0.4 },
      { p: { lShoulder: { abd: 4, rot: 55 }, lElbow: { flex: 90, sup: 90 }, lFingers: { mcp: 70, ip: 80 } }, d: 1.4, h: 0.4 },
    ],
  },
  'scap-squeeze': {
    base: 'sit', view: 'back', focus: ['chest'], props: [{ type: 'chair', noBack: true }],
    keys: [
      { p: {}, h: 0.5 },
      { p: { lScap: { retr: 1, elev: -0.3 }, rScap: { retr: 1, elev: -0.3 }, lShoulder: { flex: 10, abd: 14 }, rShoulder: { flex: 10, abd: 14 }, thoracic: { flex: -4 } }, d: 1, h: 1.5, label: 'výdrž 5 s' },
    ],
  },
  'cross-body': {
    base: 'stand', view: 'front', focus: ['lShoulder', 'lUpperArm'],
    keys: [
      { p: { lShoulder: { flex: 88 }, lElbow: { flex: 5, sup: 90 } }, h: 0.3 },
      { p: { lShoulder: { flex: 88, hadd: 45 }, lElbow: { flex: 5, sup: 90 }, rShoulder: { flex: 75, hadd: 35 }, rElbow: { flex: 70, sup: 180 }, neck: { rot: -15 } }, d: 1.3, h: 2, label: 'výdrž 30 s' },
    ],
  },
  'wall-slide': {
    base: 'stand', view: 'side', focus: ['lShoulder', 'rShoulder'], props: [{ type: 'wall', at: 'lHand', side: 'front', dz: 0.035 }],
    keys: [
      { p: { ...both('Shoulder', { flex: 85, abd: 25 }), ...both('Elbow', { flex: 90, sup: 0 }) }, h: 0.4 },
      { p: { ...both('Shoulder', { flex: 160, abd: 22 }), ...both('Elbow', { flex: 25, sup: 0 }) }, d: 1.8, h: 0.4 },
    ],
  },
  'doorway-pec': {
    base: 'stand', view: 'top', focus: ['chest'], anchor: ['lHand', 'rHand'], props: [{ type: 'door' }],
    keys: [
      { p: { ...both('Shoulder', { abd: 88, rot: 85 }), ...both('Elbow', { flex: 90, sup: 0 }), lHip: { flex: 0 } }, h: 0.4 },
      { p: { ...both('Shoulder', { abd: 88, rot: 85, hadd: -25 }), ...both('Elbow', { flex: 90, sup: 0 }), lHip: { flex: 22 }, lKnee: { flex: 15 } }, d: 1.5, h: 2, label: 'výdrž 30 s' },
    ],
  },

  // ---------------- Horní záda ----------------
  'open-book': {
    base: 'sideHook', view: 'top', focus: ['chest'],
    keys: [
      { p: {}, h: 0.5 },
      { p: { lShoulder: { flex: 80, hadd: -150 }, thoracic: { rot: 55 }, lumbar: { rot: 10 }, neck: { rot: 40, lat: 5 } }, d: 2, h: 1, label: 'výdech' },
    ],
  },
  'cat-cow': {
    base: 'quad', view: 'side', focus: ['chest', 'abdomen'],
    keys: [
      { p: {}, h: 0.2 },
      { p: { root: { rot: [82, 0, 0] }, lumbar: { flex: 13 }, thoracic: { flex: 13 }, ...both('Hip', { flex: 80 }), ...both('Shoulder', { flex: 104 }), neck: { flex: 26 }, head: { flex: 12 } }, d: 1.5, h: 0.4, label: 'výdech – vyhrbit' },
      { p: { root: { rot: [98, 0, 0] }, lumbar: { flex: -14 }, thoracic: { flex: -10 }, ...both('Hip', { flex: 96 }), ...both('Shoulder', { flex: 72 }), neck: { flex: -26 } }, d: 1.8, h: 0.4, label: 'nádech – prohnout' },
    ],
  },
  'thoracic-ext': {
    base: 'sit', view: 'side', focus: ['chest'],
    keys: [
      { p: { ...both('Shoulder', { flex: 140, abd: 55 }), ...both('Elbow', { flex: 140, sup: 90 }) }, h: 0.4 },
      { p: { ...both('Shoulder', { flex: 140, abd: 55 }), ...both('Elbow', { flex: 140, sup: 90 }), thoracic: { flex: -25 }, neck: { flex: -10 } }, d: 1.4, h: 0.8, label: 'výdrž 3 s' },
    ],
  },
  'ball-release': {
    base: 'stand', view: 'side', focus: ['chest'], props: [{ type: 'wall', at: 'back', side: 'back', dz: -0.04 }, { type: 'ball', attach: 'scapulaL', r: 0.033, offset: [0, 0, -0.03] }],
    keys: [
      { p: { lumbar: { flex: -3 } }, h: 0.3 },
      { p: { lumbar: { flex: -3 }, ...both('Hip', { flex: 22 }), ...both('Knee', { flex: 38 }), ...both('Ankle', { dorsi: 18 }) }, d: 1.6, h: 0.3 },
    ],
  },

  // ---------------- Bedra a břicho ----------------
  'pelvic-tilt': {
    base: 'hook', view: 'side', focus: ['abdomen', 'pelvis'],
    keys: [
      { p: { lumbar: { flex: -8 } }, h: 0.4 },
      { p: { lumbar: { flex: 10 }, root: { rot: [-96, 0, 0] } }, d: 1.2, h: 0.8, label: 'výdech – bedra k podložce' },
    ],
  },
  'knees-chest': {
    base: 'hook', view: 'side', focus: ['abdomen', 'pelvis'],
    keys: [
      { p: {}, h: 0.4 },
      { p: { ...both('Hip', { flex: 122 }), ...both('Knee', { flex: 125 }), ...both('Shoulder', { flex: 42, abd: 12 }), ...both('Elbow', { flex: 30, sup: 90 }), lumbar: { flex: 10 }, neck: { flex: 10 } }, d: 1.6, h: 2, label: 'výdrž 20–30 s' },
    ],
  },
  mckenzie: {
    base: 'prone', view: 'side', focus: ['abdomen', 'pelvis'], anchor: ['pelvis'],
    keys: [
      { p: { ...both('Shoulder', { flex: -30, abd: 70 }), ...both('Elbow', { flex: 130, sup: 180 }), ...both('Wrist', { flex: -60 }) }, h: 0.5 },
      { p: { lumbar: { flex: -32 }, thoracic: { flex: -14 }, ...both('Shoulder', { flex: -5, abd: 35 }), ...both('Elbow', { flex: 20, sup: 180 }), ...both('Wrist', { flex: -75 }), neck: { flex: 5 } }, d: 1.6, h: 0.8, label: 'krátká výdrž nahoře' },
    ],
  },
  'bird-dog': {
    base: 'quad', view: 'side', focus: ['abdomen', 'pelvis', 'lUpperArm', 'rThigh'],
    keys: [
      { p: {}, h: 0.4 },
      { p: { lShoulder: { flex: 170 }, lWrist: { flex: 0 }, rHip: { flex: 0 }, rKnee: { flex: 5 }, rAnkle: { dorsi: 0 } }, d: 1.4, h: 1.4, label: 'výdrž 5 s' },
      { p: {}, d: 1.2, h: 0.3 },
      { p: { rShoulder: { flex: 170 }, rWrist: { flex: 0 }, lHip: { flex: 0 }, lKnee: { flex: 5 }, lAnkle: { dorsi: 0 } }, d: 1.4, h: 1.4, label: 'výdrž 5 s' },
    ],
  },
  bridge: {
    base: 'hook', view: 'side', focus: ['pelvis', 'lThigh', 'rThigh'], anchor: ['lFoot', 'rFoot'],
    keys: [
      { p: {}, h: 0.4 },
      { p: { root: { rot: [-118, 0, 0] }, ...both('Hip', { flex: 2 }), ...both('Knee', { flex: 88 }), ...both('Ankle', { dorsi: 8 }), ...both('Shoulder', { flex: -24, abd: 8 }), neck: { flex: 28 } }, d: 1.5, h: 1, label: 'výdrž 2 s' },
    ],
  },
  'child-pose': {
    base: 'quad', view: 'side', focus: ['abdomen', 'chest'], anchor: ['lKnee', 'rKnee'],
    keys: [
      { p: {}, h: 0.4 },
      { p: { root: { rot: [100, 0, 0] }, ...both('Hip', { flex: 150 }), ...both('Knee', { flex: 140 }), ...both('Shoulder', { flex: 180 }), ...both('Wrist', { flex: -10 }), lumbar: { flex: 4 }, thoracic: { flex: 2 }, neck: { flex: 8 } }, d: 2, h: 2, label: 'výdrž 30–60 s' },
    ],
  },
  'sciatic-floss': {
    base: 'sit', view: 'side', focus: ['lThigh', 'lShin'],
    keys: [
      { p: { thoracic: { flex: 18 }, lumbar: { flex: 8 }, neck: { flex: 30 }, head: { flex: 12 } }, h: 0.2 },
      { p: { thoracic: { flex: 18 }, lumbar: { flex: 8 }, neck: { flex: -22 }, head: { flex: -10 }, lKnee: { flex: 12 }, lAnkle: { dorsi: 15 } }, d: 1.5, h: 0.2 },
    ],
  },

  // ---------------- Loket a zápěstí ----------------
  'eccentric-wrist': {
    base: 'sit', view: 'side', focus: ['lForearm'], props: [{ type: 'table', at: 'lElbow', dy: -0.04, depth: 0.5 }, { type: 'bottle', attach: 'lHand' }],
    keys: [
      { p: { lShoulder: { flex: 22, abd: 6 }, lElbow: { flex: 72, sup: 180 }, lWrist: { flex: -45 }, lFingers: { mcp: 70, ip: 80 } }, h: 0.4, label: 'druhá ruka pomůže nahoru' },
      { p: { lShoulder: { flex: 22, abd: 6 }, lElbow: { flex: 72, sup: 180 }, lWrist: { flex: 50 }, lFingers: { mcp: 70, ip: 80 } }, d: 3.2, h: 0.4, label: 'pomalu dolů (3–4 s)' },
    ],
  },
  'ext-stretch': {
    base: 'stand', view: 'three', focus: ['lForearm'],
    keys: [
      { p: { lShoulder: { flex: 88 }, lElbow: { flex: 0, sup: 180 }, lWrist: { flex: 0 } }, h: 0.3 },
      { p: { lShoulder: { flex: 88 }, lElbow: { flex: 0, sup: 180 }, lWrist: { flex: 70 }, lFingers: { mcp: 30, ip: 20 }, rShoulder: { flex: 72, hadd: 28 }, rElbow: { flex: 35, sup: 180 }, rWrist: { flex: 10 } }, d: 1.3, h: 2, label: 'výdrž 30 s' },
    ],
  },
  'flex-stretch': {
    base: 'stand', view: 'three', focus: ['lForearm'],
    keys: [
      { p: { lShoulder: { flex: 88 }, lElbow: { flex: 0, sup: 0 }, lWrist: { flex: 0 } }, h: 0.3 },
      { p: { lShoulder: { flex: 88 }, lElbow: { flex: 0, sup: 0 }, lWrist: { flex: -70 }, lFingers: { mcp: -15 }, rShoulder: { flex: 70, hadd: 30 }, rElbow: { flex: 40, sup: 0 }, rWrist: { flex: -20 } }, d: 1.3, h: 2, label: 'výdrž 30 s' },
    ],
  },
  pronation: {
    base: 'sit', view: 'front', focus: ['lForearm'], props: [{ type: 'table', at: 'lElbow', dy: -0.04, depth: 0.5 }, { type: 'hammer', attach: 'lHand' }],
    keys: [
      { p: { lShoulder: { flex: 25, abd: 6 }, lElbow: { flex: 72, sup: 90 }, lFingers: { mcp: 75, ip: 85 } }, h: 0.3 },
      { p: { lShoulder: { flex: 25, abd: 6 }, lElbow: { flex: 72, sup: 0 }, lFingers: { mcp: 75, ip: 85 } }, d: 1.2, h: 0.2 },
      { p: { lShoulder: { flex: 25, abd: 6 }, lElbow: { flex: 72, sup: 180 }, lFingers: { mcp: 75, ip: 85 } }, d: 1.8, h: 0.2 },
    ],
  },
  'tendon-glide': {
    base: 'sit', view: 'hand', focus: ['lHand'],
    keys: [
      { p: { lShoulder: { flex: 25, abd: 25, rot: -20 }, lElbow: { flex: 115, sup: 20 }, lFingers: { mcp: 0, ip: 0 } }, h: 0.5, label: 'natažené prsty' },
      { p: { lShoulder: { flex: 25, abd: 25, rot: -20 }, lElbow: { flex: 115, sup: 20 }, lFingers: { mcp: 0, ip: 95 } }, d: 0.8, h: 0.8, label: 'háček' },
      { p: { lShoulder: { flex: 25, abd: 25, rot: -20 }, lElbow: { flex: 115, sup: 20 }, lFingers: { mcp: 90, ip: 100 } }, d: 0.8, h: 0.8, label: 'pěst' },
      { p: { lShoulder: { flex: 25, abd: 25, rot: -20 }, lElbow: { flex: 115, sup: 20 }, lFingers: { mcp: 0, ip: 0 } }, d: 0.8, h: 0.4 },
      { p: { lShoulder: { flex: 25, abd: 25, rot: -20 }, lElbow: { flex: 115, sup: 20 }, lFingers: { mcp: 90, ip: 0 } }, d: 0.8, h: 0.8, label: 'stolek' },
    ],
  },
  'wrist-circles': {
    base: 'sit', view: 'three', focus: ['lHand', 'rHand'],
    keys: [
      { p: { ...both('Shoulder', { flex: 45, abd: 10 }), ...both('Elbow', { flex: 70, sup: 180 }), ...both('Wrist', { flex: 40 }) }, h: 0 },
      { p: { ...both('Shoulder', { flex: 45, abd: 10 }), ...both('Elbow', { flex: 70, sup: 180 }), ...both('Wrist', { flex: 0, dev: 25 }) }, d: 0.7, h: 0 },
      { p: { ...both('Shoulder', { flex: 45, abd: 10 }), ...both('Elbow', { flex: 70, sup: 180 }), ...both('Wrist', { flex: -50 }) }, d: 0.7, h: 0 },
      { p: { ...both('Shoulder', { flex: 45, abd: 10 }), ...both('Elbow', { flex: 70, sup: 180 }), ...both('Wrist', { flex: 0, dev: -30 }) }, d: 0.7, h: 0 },
    ],
  },
  'ball-squeeze': {
    base: 'sit', view: 'hand', focus: ['lHand'], props: [{ type: 'ball', attach: 'lHand', r: 0.036, offset: [0, -0.01, 0.035], squeeze: true, color: 0xf2994a }],
    keys: [
      { p: { lShoulder: { flex: 25, abd: 25, rot: -20 }, lElbow: { flex: 115, sup: 20 }, lFingers: { mcp: 40, ip: 50 } }, h: 0.4 },
      { p: { lShoulder: { flex: 25, abd: 25, rot: -20 }, lElbow: { flex: 115, sup: 20 }, lFingers: { mcp: 58, ip: 75 } }, d: 0.6, h: 1.2, label: 'stisk 3 s' },
    ],
  },

  // ---------------- Kyčel ----------------
  'hip-flexor': {
    base: 'kneel', view: 'side', focus: ['rThigh', 'pelvis'],
    keys: [
      { p: {}, h: 0.4 },
      { p: { lKnee: { flex: 110 }, lHip: { flex: 72 }, lAnkle: { dorsi: 22 }, rHip: { flex: -28 }, rKnee: { flex: 92 }, lumbar: { flex: 3 } }, d: 1.6, h: 2, label: 'výdrž 30 s' },
    ],
  },
  clamshell: {
    base: 'sideHook', view: 'front', focus: ['lThigh', 'pelvis'],
    keys: [
      { p: { ...both('Hip', { flex: 45 }), ...both('Knee', { flex: 90 }), lShoulder: { flex: 0, abd: 6 }, lElbow: { flex: 10 } }, h: 0.4 },
      { p: { ...both('Hip', { flex: 45 }), ...both('Knee', { flex: 90 }), lHip: { flex: 45, abd: 30, rot: 25 }, lShoulder: { flex: 0, abd: 6 }, lElbow: { flex: 10 } }, d: 1.2, h: 0.6 },
    ],
  },
  'figure-four': {
    base: 'hook', view: 'three', focus: ['lThigh', 'pelvis'], anchor: ['pelvis'],
    keys: [
      { p: { lHip: { flex: 70, abd: 35, rot: 60 }, lKnee: { flex: 95 } }, h: 0.6 },
      { p: { lHip: { flex: 95, abd: 30, rot: 60 }, lKnee: { flex: 95 }, rHip: { flex: 95 }, rKnee: { flex: 95 }, ...both('Shoulder', { flex: 70, hadd: 10 }), ...both('Elbow', { flex: 60, sup: 90 }), neck: { flex: 10 } }, d: 1.6, h: 2, label: 'výdrž 30 s' },
    ],
  },

  // ---------------- Koleno ----------------
  'quad-set': {
    base: 'supine', view: 'side', focus: ['lThigh'], props: [{ type: 'roll', at: 'lKnee' }],
    keys: [
      { p: { lKnee: { flex: 12 }, lHip: { flex: 6 }, lAnkle: { dorsi: -20 } }, h: 0.6 },
      { p: { lKnee: { flex: 0 }, lHip: { flex: 6 }, lAnkle: { dorsi: 18 } }, d: 0.8, h: 1.6, label: 'výdrž 5 s' },
    ],
  },
  slr: {
    base: 'supine', view: 'side', focus: ['lThigh'],
    keys: [
      { p: { rHip: { flex: 50 }, rKnee: { flex: 100 }, rAnkle: { dorsi: 5 }, lAnkle: { dorsi: 10 } }, h: 0.4 },
      { p: { rHip: { flex: 50 }, rKnee: { flex: 100 }, rAnkle: { dorsi: 5 }, lAnkle: { dorsi: 10 }, lHip: { flex: 45 } }, d: 1.5, h: 0.6 },
    ],
  },
  'heel-slide': {
    base: 'supine', view: 'side', focus: ['lThigh', 'lShin'],
    keys: [
      { p: { lAnkle: { dorsi: 0 } }, h: 0.3 },
      { p: { lHip: { flex: 55 }, lKnee: { flex: 105 }, lAnkle: { dorsi: 10 } }, d: 2, h: 0.4 },
    ],
  },
  'mini-squat': {
    base: 'stand', view: 'side', focus: ['lThigh', 'rThigh'], props: [{ type: 'chairBack', at: 'lHand' }],
    keys: [
      { p: { lShoulder: { flex: 48, abd: 12 }, lElbow: { flex: 20, sup: 180 }, rShoulder: { flex: 48, abd: 12 }, rElbow: { flex: 20, sup: 180 } }, h: 0.4 },
      { p: { lShoulder: { flex: 80, abd: 12 }, lElbow: { flex: 5, sup: 180 }, rShoulder: { flex: 80, abd: 12 }, rElbow: { flex: 5, sup: 180 }, ...both('Hip', { flex: 50 }), ...both('Knee', { flex: 62 }), ...both('Ankle', { dorsi: 18 }), lumbar: { flex: 18 }, thoracic: { flex: 4 } }, d: 1.6, h: 0.4 },
    ],
  },
  'step-up': {
    base: 'stand', view: 'side', focus: ['lThigh'], anchor: ['lFoot'], props: [{ type: 'step', at: 'lFoot' }],
    keys: [
      { p: { lHip: { flex: 48 }, lKnee: { flex: 70 }, lAnkle: { dorsi: 15 }, lumbar: { flex: 8 } }, h: 0.4 },
      { p: { lHip: { flex: 2 }, lKnee: { flex: 3 }, rHip: { flex: -5 }, rKnee: { flex: 25 }, rAnkle: { dorsi: -20 } }, d: 1.6, h: 0.5 },
    ],
  },
  hamstring: {
    base: 'supine', view: 'side', focus: ['lThigh'], props: [{ type: 'band', from: 'lHand', to: 'lFoot', color: 0x7a9cc6 }, { type: 'band', from: 'rHand', to: 'lFoot', color: 0x7a9cc6 }],
    keys: [
      { p: { lHip: { flex: 25 }, ...both('Shoulder', { flex: 40, abd: 5 }), ...both('Elbow', { flex: 30, sup: 90 }) }, h: 0.4 },
      { p: { lHip: { flex: 75 }, lAnkle: { dorsi: 5 }, ...both('Shoulder', { flex: 85, abd: 5, hadd: 5 }), ...both('Elbow', { flex: 20, sup: 90 }), neck: { flex: 5 } }, d: 1.8, h: 2, label: 'výdrž 30 s' },
    ],
  },

  // ---------------- Kotník a chodidlo ----------------
  'ankle-alphabet': {
    base: 'sit', view: 'three', focus: ['lFoot', 'lShin'],
    keys: [
      { p: { lKnee: { flex: 25 }, lHip: { flex: 95 }, lAnkle: { dorsi: 15 } }, h: 0 },
      { p: { lKnee: { flex: 25 }, lHip: { flex: 95 }, lAnkle: { dorsi: -25, inv: 20 } }, d: 0.7, h: 0 },
      { p: { lKnee: { flex: 25 }, lHip: { flex: 95 }, lAnkle: { dorsi: 5, inv: -15 } }, d: 0.6, h: 0 },
      { p: { lKnee: { flex: 25 }, lHip: { flex: 95 }, lAnkle: { dorsi: -30, inv: 0 } }, d: 0.6, h: 0 },
    ],
  },
  'ankle-pump': {
    base: 'supine', view: 'side', focus: ['lShin', 'rShin', 'lFoot', 'rFoot'],
    keys: [
      { p: { ...both('Ankle', { dorsi: 18 }) }, h: 0.2 },
      { p: { ...both('Ankle', { dorsi: -38 }) }, d: 0.8, h: 0.2 },
    ],
  },
  'calf-raise': {
    base: 'stand', view: 'side', focus: ['lShin', 'rShin'], anchor: ['lToe', 'rToe'], props: [{ type: 'wall', at: 'lHand', side: 'front', dz: 0.03 }],
    keys: [
      { p: { ...both('Shoulder', { flex: 75, abd: 12 }), ...both('Elbow', { flex: 35, sup: 0 }), ...both('Wrist', { flex: -70 }) }, h: 0.4 },
      { p: { ...both('Shoulder', { flex: 72, abd: 12 }), ...both('Elbow', { flex: 40, sup: 0 }), ...both('Wrist', { flex: -70 }), ...both('Ankle', { dorsi: -32 }) }, d: 1, h: 0.5, label: 'pomalu dolů 3 s' },
    ],
  },
  'calf-stretch': {
    base: 'stand', view: 'side', focus: ['rShin'], anchor: ['lFoot', 'rFoot'], props: [{ type: 'wall', at: 'lHand', side: 'front', dz: 0.03 }],
    keys: [
      { p: { lHip: { flex: 22 }, lKnee: { flex: 20 }, rHip: { flex: -12 }, rAnkle: { dorsi: 5 }, ...both('Shoulder', { flex: 80, abd: 15 }), ...both('Elbow', { flex: 30, sup: 0 }), ...both('Wrist', { flex: -70 }) }, h: 0.4 },
      { p: { lHip: { flex: 40 }, lKnee: { flex: 45 }, lAnkle: { dorsi: 15 }, rHip: { flex: -22 }, rAnkle: { dorsi: 22 }, ...both('Shoulder', { flex: 85, abd: 15 }), ...both('Elbow', { flex: 55, sup: 0 }), ...both('Wrist', { flex: -75 }) }, d: 1.6, h: 2, label: 'výdrž 30 s' },
    ],
  },
  'foot-roll': {
    base: 'sit', view: 'side', focus: ['lFoot'], anchor: ['pelvis'], props: [{ type: 'ball', fixed: true, at: 'lFoot', r: 0.033, color: 0xc8e04a }],
    keys: [
      { p: { lKnee: { flex: 75 }, lAnkle: { dorsi: -8 } }, h: 0.1 },
      { p: { lKnee: { flex: 102 }, lAnkle: { dorsi: 12 } }, d: 1.2, h: 0.1 },
    ],
  },
  'single-leg': {
    base: 'stand', view: 'front', focus: ['rShin', 'rThigh'], anchor: ['rFoot'],
    keys: [
      { p: {}, h: 0.4 },
      { p: { lHip: { flex: 35 }, lKnee: { flex: 70 }, rKnee: { flex: 8 }, ...both('Shoulder', { abd: 25 }) }, d: 1, h: 2.2, label: 'výdrž 30 s' },
    ],
  },

  // ---------------- Overball ----------------
  'ob-chin-nod': {
    base: 'hook', view: 'side', focus: ['neck'], props: [{ type: 'overball', at: 'headBack', dir: [0, -1, 0], squash: 0.45 }],
    keys: [{ p: { neck: { flex: -6 } }, h: 0.4 }, { p: { head: { flex: 14 }, neck: { flex: 2 } }, d: 1, h: 1.2, label: 'výdrž 3 s' }],
  },
  'ob-thoracic': {
    base: 'hook', view: 'side', focus: ['chest'], props: [{ type: 'overball', at: 'back', dir: [0, -1, 0], squash: 0.5 }],
    keys: [
      { p: { ...both('Shoulder', { flex: 150, abd: 50 }), ...both('Elbow', { flex: 140, sup: 90 }), thoracic: { flex: 12 }, neck: { flex: 15 } }, h: 0.4 },
      { p: { ...both('Shoulder', { flex: 150, abd: 50 }), ...both('Elbow', { flex: 140, sup: 90 }), thoracic: { flex: -20 }, neck: { flex: -4 } }, d: 2, h: 0.8, label: 'výdech – záklon přes míč' },
    ],
  },
  'ob-palm-press': {
    base: 'sit', view: 'three', focus: ['chest', 'lShoulder', 'rShoulder'], props: [{ type: 'overball', between: ['lHand', 'rHand'], r: 0.12 }],
    keys: [
      { p: { ...both('Shoulder', { flex: 38, hadd: 8 }), ...both('Elbow', { flex: 78, sup: 90 }), ...both('Wrist', { flex: -25 }), ...both('Fingers', { mcp: 10, ip: 10 }) }, h: 0.5 },
      { p: { ...both('Shoulder', { flex: 38, hadd: 10.5 }), ...both('Elbow', { flex: 78, sup: 90 }), ...both('Wrist', { flex: -25 }), ...both('Fingers', { mcp: 10, ip: 10 }) }, d: 0.8, h: 1.6, label: 'stisk 5 s' },
    ],
  },
  'ob-wall-circles': {
    base: 'stand', view: 'side', focus: ['lShoulder', 'lUpperArm'], props: [{ type: 'overball', at: 'lHand', dir: [0, 0, 1], squash: 0.85, wall: true }],
    keys: [
      { p: { lShoulder: { flex: 84 }, lElbow: { flex: 5, sup: 0 }, lWrist: { flex: -60 } }, h: 0 },
      { p: { lShoulder: { flex: 88, abd: 6 }, lElbow: { flex: 5, sup: 0 }, lWrist: { flex: -60 } }, d: 0.6, h: 0 },
      { p: { lShoulder: { flex: 93 }, lElbow: { flex: 5, sup: 0 }, lWrist: { flex: -60 } }, d: 0.6, h: 0 },
      { p: { lShoulder: { flex: 88, abd: -5 }, lElbow: { flex: 5, sup: 0 }, lWrist: { flex: -60 } }, d: 0.6, h: 0 },
    ],
  },
  'ob-pelvic-tilt': {
    base: 'hook', view: 'side', focus: ['pelvis', 'abdomen'], props: [{ type: 'overball', at: 'sacrum', dir: [0, -1, 0], squash: 0.45 }],
    keys: [{ p: { lumbar: { flex: -8 } }, h: 0.3 }, { p: { lumbar: { flex: 10 }, root: { rot: [-97, 0, 0] } }, d: 1.3, h: 0.5, label: 'podsadit pánev' }],
  },
  'ob-knee-squeeze': {
    base: 'hook', view: 'front', focus: ['lThigh', 'rThigh', 'pelvis'], props: [{ type: 'overball', between: ['lKneeIn', 'rKneeIn'] }],
    keys: [
      { p: { ...both('Hip', { flex: 50, abd: 14 }) }, h: 0.4 },
      { p: { ...both('Hip', { flex: 50, abd: 8 }) }, d: 0.8, h: 1.6, label: 'stisk 5 s' },
    ],
  },
  'ob-bridge': {
    base: 'hook', view: 'side', focus: ['pelvis', 'lThigh', 'rThigh'], anchor: ['lFoot', 'rFoot'], props: [{ type: 'overball', between: ['lKneeIn', 'rKneeIn'] }],
    keys: [
      { p: { ...both('Hip', { flex: 50, abd: 9 }) }, h: 0.4 },
      { p: { root: { rot: [-118, 0, 0] }, ...both('Hip', { flex: 2, abd: 9 }), ...both('Knee', { flex: 88 }), ...both('Ankle', { dorsi: 8 }), ...both('Shoulder', { flex: -24, abd: 8 }), neck: { flex: 28 } }, d: 1.5, h: 1, label: 'výdrž 2 s' },
    ],
  },
  'ob-wall-squat': {
    base: 'stand', view: 'side', focus: ['lThigh', 'rThigh'], anchor: ['lFoot', 'rFoot'], props: [{ type: 'overball', at: 'lowBack', dir: [0, 0, -1], squash: 0.8, wall: true }],
    keys: [
      { p: { ...both('Hip', { flex: 10 }), ...both('Knee', { flex: 10 }) }, h: 0.4 },
      { p: { ...both('Hip', { flex: 72 }), ...both('Knee', { flex: 80 }), ...both('Ankle', { dorsi: 12 }), lumbar: { flex: -2 }, ...both('Shoulder', { flex: 20 }) }, d: 1.8, h: 0.6 },
    ],
  },
  'ob-crunch': {
    base: 'hook', view: 'side', focus: ['abdomen'], props: [{ type: 'overball', at: 'lowBack', dir: [0, -1, 0], squash: 0.45 }],
    keys: [
      { p: { ...both('Shoulder', { flex: 8, abd: 8 }), ...both('Elbow', { flex: 5, sup: 90 }) }, h: 0.4 },
      { p: { thoracic: { flex: 28 }, lumbar: { flex: 6 }, neck: { flex: 20 }, ...both('Shoulder', { flex: 62, abd: 8 }), ...both('Elbow', { flex: 5, sup: 90 }) }, d: 1.2, h: 0.5, label: 'výdech nahoru' },
    ],
  },
};
