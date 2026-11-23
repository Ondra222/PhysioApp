// Které svaly se při cviku zapojují – pro zvýraznění na svalové postavě v animaci.
//
// work    = pracující svaly (červeně, při pohybu se stahují)
// stretch = protahované svaly (modře)
// relax   = svaly, které se mají uvolnit (zeleně)
// Klíče odpovídají povrchovým svalům postavy (tools/build_avatar.py, MUSCLES); přípona .l / .r
// omezí zvýraznění na levou / pravou stranu. Bez přípony platí pro obě strany.
// deep    = hluboké svaly nebo nervy, které na povrchu postavy nejsou vidět – jen v legendě
//           [název, druh] kde druh je 'work' | 'stretch' | 'relax' | 'nerve'.
// phase   = jiné zapojení během přechodu do klíčové pózy s daným indexem a výdrže v ní
//           (např. střídání stran u ptáčka – psa).

export const MUSCLE_KEYS = [
  'pec', 'rectus', 'oblique', 'serratus', 'trapUp', 'trapMid', 'lat', 'infra', 'erector', 'gluteMax', 'gluteMed', 'tfl',
  'scm', 'levator', 'deltA', 'deltL', 'deltP', 'biceps', 'triceps', 'brachialis', 'brachiorad', 'flexors', 'extensors',
  'rectFem', 'vastLat', 'vastMed', 'adductors', 'sartorius', 'bicFem', 'semi', 'tibAnt', 'peroneus', 'gastroc', 'soleus',
];

const QUADS = ['rectFem', 'vastLat', 'vastMed'];
const HAMS = ['bicFem', 'semi'];
const side = (list, s) => list.map((k) => `${k}.${s}`);

export const EXERCISE_MUSCLES = {
  'chin-tuck': { deep: [['hluboké ohýbače krku', 'work'], ['podhlavové svaly', 'stretch']] },
  suboccipital: { relax: ['trapUp'], deep: [['podhlavové svaly', 'relax']] },
  'upper-trap': { stretch: ['trapUp.l', 'levator.l'] },
  levator: { stretch: ['levator.l', 'trapUp.l'] },
  'neck-iso': {
    work: ['scm', 'levator', 'trapUp'],
    deep: [['hluboké svaly krku', 'work']],
    phase: { 1: { work: ['scm', 'deltA.r', 'pec.r'] }, 3: { work: ['scm.r', 'levator.r', 'trapUp.r', 'deltL.r'] } },
  },
  'median-glide': { deep: [['středový nerv (n. medianus)', 'nerve']] },
  'ulnar-glide': { deep: [['loketní nerv (n. ulnaris)', 'nerve']] },
  breathing: {
    relax: ['trapUp', 'scm', 'pec'],
    deep: [['bránice', 'work']],
    phase: { 2: { relax: ['trapUp', 'scm', 'pec', 'rectus'] } },
  },
  pendulum: { relax: ['deltA.l', 'deltL.l', 'deltP.l', 'trapUp.l'], work: ['erector'] },
  'ext-rot': { work: ['infra.l', 'deltP.l'], deep: [['malý oblý sval', 'work']] },
  'scap-squeeze': { work: ['trapMid'], stretch: ['pec'], deep: [['rombické svaly', 'work']] },
  'cross-body': { stretch: ['deltP.l', 'infra.l', 'trapMid.l'] },
  'wall-slide': { work: ['serratus', 'trapMid', 'deltA', 'deltL'] },
  'doorway-pec': { stretch: ['pec', 'deltA', 'biceps'] },
  'open-book': { stretch: ['pec.l', 'deltA.l'], work: ['oblique'] },
  'cat-cow': {
    work: ['rectus', 'erector'],
    phase: { 1: { work: ['rectus', 'oblique'], stretch: ['erector', 'trapMid'] }, 2: { work: ['erector'], stretch: ['rectus'] } },
  },
  'thoracic-ext': { work: ['erector', 'trapMid'], stretch: ['rectus', 'pec'] },
  'ball-release': { relax: ['trapMid.l', 'infra.l', 'lat.l'] },
  'pelvic-tilt': { work: ['rectus', 'oblique', 'gluteMax'], stretch: ['erector'] },
  'knees-chest': { stretch: ['erector', 'gluteMax'], work: ['biceps'] },
  mckenzie: { work: ['triceps'], stretch: ['rectus'], relax: ['erector', 'gluteMax'] },
  'bird-dog': {
    work: ['erector', 'gluteMax', 'deltA', 'rectus'],
    phase: {
      1: { work: ['erector', 'gluteMax.r', 'bicFem.r', 'semi.r', 'deltA.l', 'trapMid.l', 'rectus', 'oblique'] },
      3: { work: ['erector', 'gluteMax.l', 'bicFem.l', 'semi.l', 'deltA.r', 'trapMid.r', 'rectus', 'oblique'] },
    },
  },
  bridge: { work: ['gluteMax', ...HAMS, 'erector'], stretch: ['rectFem'] },
  'child-pose': { stretch: ['erector', 'lat', 'gluteMax'], relax: ['trapUp'] },
  'sciatic-floss': { stretch: side(HAMS, 'l'), deep: [['sedací nerv (n. ischiadicus)', 'nerve']] },
  'eccentric-wrist': { work: ['extensors.l'], deep: [['šlacha natahovačů zápěstí', 'work']] },
  'ext-stretch': { stretch: ['extensors.l', 'brachiorad.l'] },
  'flex-stretch': { stretch: ['flexors.l'] },
  pronation: { work: ['brachiorad.l', 'flexors.l', 'extensors.l', 'biceps.l'], deep: [['oblý a čtyřhranný pronátor', 'work']] },
  'tendon-glide': { work: ['flexors.l', 'extensors.l'], deep: [['šlachy ohýbačů prstů', 'nerve']] },
  'wrist-circles': { work: ['flexors', 'extensors', 'brachiorad'] },
  'ball-squeeze': { work: ['flexors.l', 'brachiorad.l'] },
  'hip-flexor': { stretch: ['rectFem.r', 'sartorius.r', 'tfl.r'], work: ['gluteMax.r', 'rectus'], deep: [['bedrokyčlostehenní sval', 'stretch']] },
  clamshell: { work: ['gluteMed.l', 'gluteMax.l'], deep: [['malý hýžďový sval', 'work']] },
  'figure-four': { stretch: ['gluteMax.l', 'gluteMed.l'], deep: [['hruškovitý sval', 'stretch']] },
  'quad-set': { work: side(QUADS, 'l'), stretch: [] },
  slr: { work: [...side(QUADS, 'l'), 'sartorius.l', 'tfl.l', 'rectus'], deep: [['bedrokyčlostehenní sval', 'work']] },
  'heel-slide': { work: side(HAMS, 'l'), stretch: side(QUADS, 'l') },
  'mini-squat': { work: [...QUADS, 'gluteMax', 'erector'], },
  'step-up': { work: [...side(QUADS, 'l'), 'gluteMax.l', 'gluteMed.l', 'gastroc.l'] },
  hamstring: { stretch: [...side(HAMS, 'l'), 'gastroc.l'] },
  'ankle-alphabet': { work: side(['tibAnt', 'peroneus', 'gastroc', 'soleus'], 'l') },
  'ankle-pump': { work: ['tibAnt', 'gastroc', 'soleus'] },
  'calf-raise': { work: ['gastroc', 'soleus', 'peroneus'] },
  'calf-stretch': { stretch: ['gastroc.r', 'soleus.r'] },
  'foot-roll': { deep: [['plantární fascie a svaly chodidla', 'relax']] },
  'single-leg': { work: ['gluteMed.r', 'peroneus.r', 'tibAnt.r', 'gastroc.r', 'soleus.r', ...side(QUADS, 'r')] },
  'ob-chin-nod': { deep: [['hluboké ohýbače krku', 'work'], ['podhlavové svaly', 'stretch']] },
  'ob-thoracic': { stretch: ['rectus', 'pec'], work: ['erector'] },
  'ob-palm-press': { work: ['pec', 'deltA', 'serratus', 'flexors'] },
  'ob-wall-circles': { work: ['deltA.l', 'deltL.l', 'infra.l', 'serratus.l', 'trapMid.l'] },
  'ob-pelvic-tilt': { work: ['rectus', 'oblique'], relax: ['erector'] },
  'ob-knee-squeeze': { work: ['adductors', 'rectus'], deep: [['pánevní dno', 'work']] },
  'ob-bridge': { work: ['gluteMax', ...HAMS, 'adductors'] },
  'ob-wall-squat': { work: [...QUADS, 'gluteMax'] },
  'ob-crunch': { work: ['rectus', 'oblique'] },
};

export const DEEP_KIND = { work: 'pracuje', stretch: 'protahuje se', relax: 'uvolňuje se', nerve: 'klouže' };

// zapojení pro daný klíč (fáze) cviku
export function musclesFor(id, keyIndex = null) {
  const m = EXERCISE_MUSCLES[id];
  if (!m) return { work: [], stretch: [], relax: [], deep: [] };
  const ph = keyIndex !== null && m.phase ? m.phase[keyIndex] : null;
  return {
    work: (ph?.work ?? m.work) || [],
    stretch: (ph?.stretch ?? m.stretch) || [],
    relax: (ph?.relax ?? m.relax) || [],
    deep: m.deep || [],
  };
}
