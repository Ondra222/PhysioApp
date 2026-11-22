// Sestavení cvičebního plánu z kombinace označených potíží.
//
// Místní plánovač (funguje vždy, bez internetu) a volitelně AI (Claude API
// s vlastním klíčem uživatele), která vybírá jen z cviků této aplikace.
// Bez závislosti na Three.js – testovatelné v Node.
import { EXERCISES, SYMPTOMS, redFlags } from './exercises.js';
import { REGIONS, SIDES } from './regions.js';

// Druh cviku (pro pořadí v jednotce a vyvážení plánu) a odhad času v minutách
export const CATEGORY = {
  breathing: 'relax', suboccipital: 'relax', 'ball-release': 'relax', 'foot-roll': 'relax', 'ob-pelvic-tilt': 'mobility',
  'chin-tuck': 'mobility', pendulum: 'mobility', 'cat-cow': 'mobility', 'open-book': 'mobility', 'thoracic-ext': 'mobility',
  'pelvic-tilt': 'mobility', 'knees-chest': 'mobility', 'wrist-circles': 'mobility', 'ankle-alphabet': 'mobility',
  'ankle-pump': 'mobility', 'heel-slide': 'mobility', 'wall-slide': 'mobility', mckenzie: 'mobility', 'tendon-glide': 'mobility',
  'ob-thoracic': 'mobility', 'ob-chin-nod': 'mobility',
  'neck-iso': 'strength', 'ext-rot': 'strength', 'scap-squeeze': 'strength', 'bird-dog': 'strength', bridge: 'strength',
  'eccentric-wrist': 'strength', pronation: 'strength', 'ball-squeeze': 'strength', clamshell: 'strength', 'quad-set': 'strength',
  slr: 'strength', 'mini-squat': 'strength', 'step-up': 'strength', 'calf-raise': 'strength', 'single-leg': 'strength',
  'ob-palm-press': 'strength', 'ob-wall-circles': 'strength', 'ob-knee-squeeze': 'strength', 'ob-bridge': 'strength',
  'ob-wall-squat': 'strength', 'ob-crunch': 'strength',
  'upper-trap': 'stretch', levator: 'stretch', 'cross-body': 'stretch', 'doorway-pec': 'stretch', 'child-pose': 'stretch',
  'ext-stretch': 'stretch', 'flex-stretch': 'stretch', 'hip-flexor': 'stretch', 'figure-four': 'stretch', hamstring: 'stretch',
  'calf-stretch': 'stretch',
  'median-glide': 'nerve', 'ulnar-glide': 'nerve', 'sciatic-floss': 'nerve',
};
export const CATEGORY_NAMES = { mobility: 'Rozhýbání', nerve: 'Klouzání nervů', strength: 'Posílení', stretch: 'Protažení', relax: 'Uvolnění' };
const ORDER = ['mobility', 'nerve', 'strength', 'stretch', 'relax'];
const MINUTES = { relax: 3, mobility: 2, nerve: 2, strength: 3, stretch: 2.5 };

export const categoryOf = (id) => CATEGORY[id] || 'mobility';
export const minutesOf = (id) => MINUTES[categoryOf(id)];
const byId = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

function complaintLabel(c) {
  const side = c.side && c.side !== 'stred' ? ` (${SIDES[c.side]})` : '';
  return `${SYMPTOMS[c.symptom].name} – ${REGIONS[c.region].name}${side}`;
}

/** Cviky vhodné pro jednu potíž (podle oblasti, typu, intenzity a vybavení). */
export function candidatesFor(c, opts = {}) {
  const strong = c.intensity >= 7;
  const equip = opts.equipment || [];
  return EXERCISES.filter((e) => e.regions.includes(c.region) && e.symptoms.includes(c.symptom)
    && (!strong || e.gentle) && (!e.equipment || equip.includes(e.equipment)));
}

/**
 * Místní plánovač.
 * @param complaints  [{id, region, side, symptom, intensity}]
 * @param opts        {minutes: 10|15|20|30, days: 3..7, equipment: ['overball']}
 */
export function buildPlan(complaints, opts = {}) {
  const minutes = opts.minutes || 15;
  const days = Math.min(7, Math.max(2, opts.days || 5));
  const list = complaints.filter((c) => REGIONS[c.region] && SYMPTOMS[c.symptom]);
  if (!list.length) return null;
  const maxInt = Math.max(...list.map((c) => c.intensity || 5));
  const gentleOnly = maxInt >= 7;

  // 1) skóre cviků přes všechny potíže
  const score = new Map();      // id -> skóre
  const covers = new Map();     // id -> Set(id potíže)
  for (const c of list) {
    const w = 1 + (c.intensity || 5) / 10;
    for (const e of candidatesFor(c, opts)) {
      let s = w;
      if (e.regions[0] === c.region) s += 0.6;              // cvik je přímo pro tuto oblast
      if (e.gentle && c.intensity >= 5) s += 0.4;
      if (c.symptom === 'brneni' && categoryOf(e.id) === 'nerve') s += 0.8;
      if (c.symptom === 'tlak' && ['relax', 'stretch', 'mobility'].includes(categoryOf(e.id))) s += 0.3;
      score.set(e.id, (score.get(e.id) || 0) + s);
      if (!covers.has(e.id)) covers.set(e.id, new Set());
      covers.get(e.id).add(c.id);
    }
  }

  // 2) výběr: nejdřív každá potíž aspoň jeden cvik (od nejsilnější), pak podle skóre a času
  const chosen = [];
  let used = 0;
  const catCount = {};
  // podobné cviky (varianta s overballem) – do plánu jen jeden z dvojice
  const TWINS = [['bridge', 'ob-bridge'], ['pelvic-tilt', 'ob-pelvic-tilt'], ['chin-tuck', 'ob-chin-nod'], ['thoracic-ext', 'ob-thoracic'], ['mini-squat', 'ob-wall-squat']];
  const twinOf = (id) => { const t = TWINS.find((p) => p.includes(id)); return t ? t.find((x) => x !== id) : null; };
  const take = (id) => {
    if (chosen.includes(twinOf(id))) return;
    chosen.push(id);
    used += minutesOf(id);
    catCount[categoryOf(id)] = (catCount[categoryOf(id)] || 0) + 1;
  };
  const sortedComplaints = [...list].sort((a, b) => (b.intensity || 5) - (a.intensity || 5));
  for (const c of sortedComplaints) {
    if (chosen.some((id) => covers.get(id)?.has(c.id))) continue;
    const best = [...covers.entries()].filter(([id, set]) => set.has(c.id) && !chosen.includes(id))
      .sort((a, b) => score.get(b[0]) - score.get(a[0]))[0];
    if (best) take(best[0]);
  }
  // vyvážení: aspoň jeden posilovací a jeden protahovací cvik, pokud je k dispozici
  const bestOfCat = (cat) => [...score.keys()].filter((id) => !chosen.includes(id) && categoryOf(id) === cat)
    .sort((x, y) => score.get(y) - score.get(x))[0];
  for (const cat of gentleOnly ? ['stretch'] : ['strength', 'stretch']) {
    if (!chosen.some((id) => categoryOf(id) === cat)) {
      const id = bestOfCat(cat);
      if (id && used + minutesOf(id) <= minutes + 0.5) take(id);
    }
  }
  const rest = [...score.keys()].filter((id) => !chosen.includes(id))
    .sort((a, b) => (score.get(b) + 0.5 * covers.get(b).size) - (score.get(a) + 0.5 * covers.get(a).size));
  const capPerCat = { nerve: 2, relax: 2, strength: gentleOnly ? 1 : 4, stretch: 3, mobility: 4 };
  for (const id of rest) {
    if (used + minutesOf(id) > minutes + 0.5 || chosen.includes(twinOf(id))) continue;
    const cat = categoryOf(id);
    if ((catCount[cat] || 0) >= capPerCat[cat]) continue;
    take(id);
  }
  // vždy klidné dýchání na závěr, pokud se vejde a hodí se
  if (!chosen.includes('breathing') && used + 2 <= minutes + 1 && list.some((c) => ['krk', 'hlava', 'hrudnik', 'bricho', 'bedra'].includes(c.region))) take('breathing');

  // 3) pořadí: rozhýbání → nervy → posílení → protažení → uvolnění
  chosen.sort((a, b) => ORDER.indexOf(categoryOf(a)) - ORDER.indexOf(categoryOf(b)) || score.get(b) - score.get(a));

  const why = (id) => {
    const names = list.filter((c) => covers.get(id)?.has(c.id)).map(complaintLabel);
    return names.length ? `Pomáhá na: ${names.join('; ')}` : 'Celkové uvolnění a dýchání';
  };
  const item = (id, phase) => {
    const e = byId[id];
    let dose = e.dose;
    if (phase === 1 && categoryOf(id) === 'strength') dose = `${e.dose} – první dny začněte polovinou`;
    return { id, name: e.name, category: categoryOf(id), dose, why: why(id), equipment: e.equipment || null, gentle: !!e.gentle };
  };

  // 4) dvě jednotky: A (vše) a B (lehčí – bez posilování), střídání v týdnu
  const sessionA = chosen.map((id) => item(id, 1));
  const lightIds = chosen.filter((id) => categoryOf(id) !== 'strength');
  const sessionB = (lightIds.length >= 2 ? lightIds : chosen).map((id) => item(id, 1));
  const weekDays = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
  const activeIdx = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] }[days];
  let flip = true;
  const schedule = weekDays.map((d, i) => {
    if (!activeIdx.includes(i)) return { day: d, session: null };
    const s = flip ? 'A' : 'B';
    flip = !flip;
    return { day: d, session: s };
  });

  // 5) postup po týdnech
  const progression = gentleOnly
    ? [
      { weeks: '1. týden', text: 'Jen šetrné cviky v bezbolestném rozsahu. Pokud se potíže do týdne nezlepší, nebo se zhoršují, navštivte lékaře či fyzioterapeuta.' },
      { weeks: '2. týden', text: 'Když intenzita klesne pod 5/10, upravte potíže v aplikaci a nechte plán sestavit znovu – přibudou posilovací cviky.' },
    ]
    : [
      { weeks: '1.–2. týden', text: 'Naučte se cviky správně, posilování začněte polovinou opakování. Mírný diskomfort do 3/10 je v pořádku.' },
      { weeks: '3.–4. týden', text: 'Pokud potíže ustupují, přidejte 1 sérii nebo pár opakování u posilovacích cviků a výdrže u protahování prodlužte.' },
      { weeks: 'Od 5. týdne', text: 'Cvičte 3× týdně jako prevenci. Pokud se potíže do 4–6 týdnů výrazně nezlepší, nechte je posoudit odborníkem.' },
    ];

  const flags = [...new Set(list.flatMap((c) => redFlags(c.region)))];
  const tips = [];
  if (list.some((c) => c.symptom === 'brneni')) tips.push('U brnění cvičte nervová klouzání pomalu – brnění se během ani po cvičení nesmí zhoršovat.');
  if (list.some((c) => c.symptom === 'tlak')) tips.push('Pocit tlaku často zmírní pravidelné přestávky od sezení a pohyb během dne – stačí 1–2 cviky každou hodinu.');
  if (gentleOnly) tips.push('Některá potíž má intenzitu 7/10 a více, proto plán obsahuje jen šetrná cvičení.');
  tips.push('Cvičte pravidelně, ideálně ve stejnou dobu. Dýchejte plynule a nezadržujte dech.');

  return {
    source: 'local',
    created: Date.now(),
    title: list.length === 1 ? `Plán: ${complaintLabel(list[0])}` : `Plán pro ${list.length} potíže`,
    summary: `${sessionA.length} cviků, cca ${Math.round(sessionA.reduce((s, e) => s + minutesOf(e.id), 0))} min, ${days}× týdně.`,
    complaints: list.map((c) => ({ id: c.id, label: complaintLabel(c), intensity: c.intensity })),
    sessions: { A: { name: 'Jednotka A – celá', items: sessionA }, B: { name: 'Jednotka B – lehčí den', items: sessionB } },
    schedule, progression, tips, flags, gentleOnly,
  };
}

// ---------------------------------------------------------------------------
// AI (Claude) – volitelné, s vlastním API klíčem uživatele
// ---------------------------------------------------------------------------
export const AI_MODEL = 'claude-sonnet-5-5';

export function buildAiPrompt(complaints, opts, base) {
  const pool = new Set();
  for (const c of complaints) for (const e of candidatesFor(c, opts)) pool.add(e.id);
  const catalog = [...pool].map((id) => {
    const e = byId[id];
    return { id, name: e.name, regions: e.regions, symptoms: e.symptoms, gentle: !!e.gentle, category: categoryOf(id), dose: e.dose };
  });
  const input = {
    complaints: complaints.map((c) => ({ id: c.id, region: REGIONS[c.region].name, side: c.side ? SIDES[c.side] : null, symptom: SYMPTOMS[c.symptom].name, intensity: c.intensity })),
    minutesPerSession: opts.minutes || 15, daysPerWeek: opts.days || 5, equipment: opts.equipment || [],
    exercises: catalog,
    draftPlan: base && { A: base.sessions.A.items.map((i) => i.id), B: base.sessions.B.items.map((i) => i.id) },
  };
  const system = 'Jsi zkušený fyzioterapeut. Sestavuješ domácí cvičební plán v češtině. Používej VÝHRADNĚ cviky ze seznamu "exercises" (podle "id"). '
    + 'Zohledni kombinaci všech potíží – upřednostni cviky, které pomáhají na více potíží najednou, vyvaž rozhýbání, posílení a protažení a dodrž časový limit jednotky. '
    + 'Při intenzitě 7/10 a více používej jen cviky s gentle=true. Nestanovuj diagnózu. Odpověz POUZE platným JSON bez dalšího textu ve tvaru: '
    + '{"summary": "2–3 věty o přístupu", "A": [{"id": "...", "dose": "...", "why": "proč tento cvik (max 1 věta)"}], "B": [...], '
    + '"progression": [{"weeks": "...", "text": "..."}], "tips": ["..."]}. A je plná jednotka, B lehčí den (bez náročného posilování).';
  return { system, user: JSON.stringify(input) };
}

/** Ověří a sloučí odpověď AI s místním plánem (neznámé cviky zahodí). */
export function mergeAiPlan(base, ai, allowed) {
  const ok = (arr) => (Array.isArray(arr) ? arr : []).filter((x) => x && allowed.has(x.id) && byId[x.id]);
  const toItems = (arr) => ok(arr).map((x) => ({
    id: x.id, name: byId[x.id].name, category: categoryOf(x.id), dose: String(x.dose || byId[x.id].dose).slice(0, 160),
    why: String(x.why || '').slice(0, 240), equipment: byId[x.id].equipment || null, gentle: !!byId[x.id].gentle,
  }));
  const A = toItems(ai.A);
  if (A.length < 2) throw new Error('AI nevrátila použitelný plán');
  const B = toItems(ai.B);
  return {
    ...base,
    source: 'ai',
    summary: String(ai.summary || base.summary).slice(0, 600),
    sessions: { A: { name: 'Jednotka A – celá', items: A }, B: { name: 'Jednotka B – lehčí den', items: B.length >= 2 ? B : A } },
    progression: Array.isArray(ai.progression) && ai.progression.length
      ? ai.progression.slice(0, 5).map((p) => ({ weeks: String(p.weeks || '').slice(0, 40), text: String(p.text || '').slice(0, 400) }))
      : base.progression,
    tips: Array.isArray(ai.tips) && ai.tips.length ? ai.tips.slice(0, 6).map((t) => String(t).slice(0, 300)) : base.tips,
  };
}

/** Zavolá Claude API přímo z prohlížeče. Vrací sloučený plán, při chybě vyhodí výjimku. */
export async function buildPlanAI(complaints, opts, apiKey) {
  const base = buildPlan(complaints, opts);
  if (!base) return null;
  const { system, user } = buildAiPrompt(complaints, opts, base);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: 2000, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(res.status === 401 ? 'Neplatný API klíč.' : `Chyba AI (${res.status}) ${t.slice(0, 120)}`);
  }
  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || '').join('');
  const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  const allowed = new Set();
  for (const c of complaints) for (const e of candidatesFor(c, opts)) allowed.add(e.id);
  if (!allowed.has('breathing')) allowed.add('breathing');
  return mergeAiPlan(base, json, allowed);
}
