// Nervová soustava dokreslená podle kostry anatomického modelu.
// BodyParts3D obsahuje jen mozek a zrakový nerv – mícha, míšní a periferní nervy
// jsou zde vedené anatomickými drahami mezi orientačními body (js/landmarks.js).
import { LM, SPINE, FINGERS, TOES, RIBS } from './landmarks.js';

// ---------------------------------------------------------------------------
// Popisky: [název, latinsky, kořeny/segmenty, popis]
// ---------------------------------------------------------------------------
export const NERVE_INFO = {
  spinalCord: ['Mícha', 'Medulla spinalis', 'C1–L1', 'Vede signály mezi mozkem a tělem. Mezi obratli z ní vystupuje 31 párů míšních nervů. Končí ve výši 1.–2. bederního obratle.'],
  caudaEquina: ['Koňský ohon', 'Cauda equina', 'L2–Co', 'Svazek nervových kořenů pod koncem míchy. Jeho útlak (např. velkým výhřezem ploténky) je akutní stav – projevuje se necitlivostí v rozkroku a poruchou močení.'],
  sympathetic: ['Sympatický kmen', 'Truncus sympathicus', 'Th1–L2', 'Řetězec nervových uzlin podél páteře. Patří k autonomnímu nervstvu a řídí mimovolní funkce – pocení, prokrvení, srdeční tep, reakci na stres.'],
  plexus: ['Pažní pleteň', 'Plexus brachialis', 'C5–Th1', 'Spleť nervů z krční páteře do paže, prochází mezi kloněnými svaly a pod klíční kostí. Útlak v oblasti krku či ramene (např. syndrom hrudního vývodu) může vyvolat brnění celé ruky.'],
  median: ['Středový nerv', 'N. medianus', 'C6–Th1', 'Prochází karpálním tunelem v zápěstí. Jeho útlak (syndrom karpálního tunelu) způsobuje brnění palce, ukazováku, prostředníku a části prsteníku, typicky v noci.'],
  ulnarN: ['Loketní nerv', 'N. ulnaris', 'C8–Th1', 'Prochází za vnitřní stranou lokte („brňavka“). Útlak (opírání lokte, dlouhé pokrčení) vyvolává brnění malíku a prsteníku.'],
  radialN: ['Vřetenní nerv', 'N. radialis', 'C5–Th1', 'Obtáčí kost pažní a ovládá natahovače lokte, zápěstí a prstů. Jeho povrchová větev zajišťuje citlivost hřbetu ruky u palce.'],
  axillaryN: ['Podpažní nerv', 'N. axillaris', 'C5–C6', 'Obtáčí krček kosti pažní a ovládá deltový sval. Může být poškozen při vykloubení ramene – projeví se necitlivostí na zevní straně ramene.'],
  musculocutN: ['Svalokožní nerv', 'N. musculocutaneus', 'C5–C7', 'Ovládá ohýbače lokte (dvojhlavý a hluboký sval pažní) a zajišťuje citlivost zevní strany předloktí.'],
  longThoracic: ['Dlouhý hrudní nerv', 'N. thoracicus longus', 'C5–C7', 'Vede po boku hrudníku k pilovitému svalu. Jeho poškození způsobuje „odstávající lopatku“.'],
  suprascap: ['Nadlopatkový nerv', 'N. suprascapularis', 'C5–C6', 'Ovládá nadhřebenový a podhřebenový sval (rotátorová manžeta). Útlak na lopatce způsobuje hlubokou bolest ramene a slabost zevní rotace.'],
  phrenic: ['Bránicový nerv', 'N. phrenicus', 'C3–C5', 'Ovládá bránici – hlavní dýchací sval. Podráždění bránice se proto může projevit bolestí v rameni.'],
  occipitalMaj: ['Velký týlní nerv', 'N. occipitalis major', 'C2', 'Zajišťuje citlivost kůže týla. Při napětí šíjových svalů může být podrážděn a způsobovat bolest hlavy vystřelující od zátylí (okcipitální neuralgie).'],
  auricular: ['Velký ušní nerv', 'N. auricularis magnus', 'C2–C3', 'Kožní nerv krční pleteně pro oblast ušního boltce a úhlu čelisti.'],
  intercostal: ['Mezižeberní nerv', 'N. intercostalis', 'Th1–Th11', 'Běží v žlábku na dolním okraji žebra a ovládá mezižeberní svaly. Jeho podráždění (např. při blokádě hrudní páteře nebo pásovém oparu) způsobuje pásovou bolest kolem hrudníku.'],
  subcostal: ['Podžeberní nerv', 'N. subcostalis', 'Th12', 'Poslední hrudní nerv, běží pod 12. žebrem k břišní stěně.'],
  femoralN: ['Stehenní nerv', 'N. femoralis', 'L2–L4', 'Ovládá čtyřhlavý sval stehna a zajišťuje citlivost přední strany stehna.'],
  saphenousN: ['Skrytý nerv', 'N. saphenus', 'L3–L4', 'Kožní větev stehenního nervu pro vnitřní stranu kolena, bérce a nohy.'],
  obturator: ['Ucpávací nerv', 'N. obturatorius', 'L2–L4', 'Prochází otvorem v pánvi a ovládá přitahovače stehna. Útlak způsobuje bolest na vnitřní straně stehna.'],
  latFemCut: ['Zevní kožní nerv stehenní', 'N. cutaneus femoris lateralis', 'L2–L3', 'Prochází těsně u předního kyčelního trnu. Jeho útlak (těsný opasek, nadváha, těhotenství) způsobuje pálení a brnění zevní strany stehna (meralgia paresthetica).'],
  supGluteal: ['Horní hýžďový nerv', 'N. gluteus superior', 'L4–S1', 'Ovládá střední a malý sval hýžďový, které stabilizují pánev při chůzi.'],
  infGluteal: ['Dolní hýžďový nerv', 'N. gluteus inferior', 'L5–S2', 'Ovládá velký sval hýžďový.'],
  sciatic: ['Sedací nerv', 'N. ischiadicus', 'L4–S3', 'Nejsilnější nerv těla. Vystupuje z pánve pod hruškovitým svalem. Jeho podráždění (ischias) způsobuje bolest a brnění vystřelující z hýždě do nohy.'],
  tibialN: ['Holenní nerv', 'N. tibialis', 'L4–S3', 'Pokračování sedacího nervu v lýtku. Ovládá lýtkové svaly a za vnitřním kotníkem může být utlačen (syndrom tarzálního tunelu).'],
  peroneal: ['Společný lýtkový nerv', 'N. fibularis communis', 'L4–S2', 'Obtáčí hlavici kosti lýtkové těsně pod kůží – při útlaku (např. přehozením nohy přes nohu) vzniká brnění nártu a slabost zvedání špičky.'],
  deepPeroneal: ['Hluboký lýtkový nerv', 'N. fibularis profundus', 'L4–L5', 'Ovládá zvedače nohy a prstů a zajišťuje citlivost kůže mezi palcem a 2. prstem.'],
  supPeroneal: ['Povrchový lýtkový nerv', 'N. fibularis superficialis', 'L5–S1', 'Ovládá svaly na zevní straně bérce a zajišťuje citlivost většiny nártu.'],
  sural: ['Lýtkový kožní nerv', 'N. suralis', 'S1–S2', 'Kožní nerv zadní strany lýtka a zevní hrany nohy.'],
  plantarMed: ['Vnitřní chodidlový nerv', 'N. plantaris medialis', 'L4–L5', 'Větev holenního nervu pro vnitřní část chodidla a prsty 1–3.'],
  plantarLat: ['Zevní chodidlový nerv', 'N. plantaris lateralis', 'S1–S2', 'Větev holenního nervu pro zevní část chodidla a prsty 4–5.'],
  digitalHand: ['Prstový nerv ruky', 'Nn. digitales palmares', '', 'Koncové větve středového a loketního nervu podél prstů. Zajišťují jemnou citlivost bříšek prstů.'],
  trigemV1: ['Trojklaný nerv – I. větev (očnicová)', 'N. ophthalmicus (V1)', 'hlavový nerv V', 'Citlivost čela, horního víčka a oka.'],
  trigemV2: ['Trojklaný nerv – II. větev (čelistní)', 'N. maxillaris (V2)', 'hlavový nerv V', 'Citlivost tváře, horního rtu a horních zubů.'],
  trigemV3: ['Trojklaný nerv – III. větev (dolní čelisti)', 'N. mandibularis (V3)', 'hlavový nerv V', 'Citlivost brady, dolního rtu a dolních zubů; ovládá žvýkací svaly.'],
  facial: ['Lícní nerv', 'N. facialis (VII)', 'hlavový nerv VII', 'Vychází před uchem a vějířovitě ovládá mimické svaly obličeje. Jeho obrna způsobuje pokles koutku a neschopnost zavřít oko na jedné straně.'],
  vagus: ['Bloudivý nerv', 'N. vagus (X)', 'hlavový nerv X', 'Nejdelší hlavový nerv. Probíhá krkem do hrudníku a břicha a zpomaluje srdeční tep, řídí trávení a dýchání (parasympatikus).'],
  accessory: ['Přídatný nerv', 'N. accessorius (XI)', 'hlavový nerv XI', 'Ovládá zdvihač hlavy a trapézový sval.'],
};

// Míšní segmenty: citlivost (dermatom) a hlavní svaly (myotom)
export const SEGMENT_INFO = {
  C1: 'Ovládá krátké svaly šíje pod lebkou.',
  C2: 'Citlivost zátylí. Pokračuje jako velký týlní nerv.',
  C3: 'Citlivost krku. Podílí se na inervaci bránice.',
  C4: 'Citlivost oblasti nad klíční kostí a horní hrany ramen. Podílí se na inervaci bránice.',
  C5: 'Citlivost zevní strany ramene a paže. Svaly: deltový a dvojhlavý sval (zvedání paže, ohnutí lokte). Útlak při výhřezu ploténky C4/5.',
  C6: 'Citlivost zevní strany předloktí, palce a ukazováku. Svaly: ohýbače lokte, natahovače zápěstí. Útlak (výhřez C5/6) typicky způsobuje brnění palce.',
  C7: 'Citlivost prostředníku. Svaly: trojhlavý sval, ohýbače zápěstí. Nejčastěji postižený kořen krční páteře (výhřez C6/7).',
  C8: 'Citlivost malíku, prsteníku a vnitřní strany předloktí. Svaly: ohýbače prstů a drobné svaly ruky.',
  Th1: 'Citlivost vnitřní strany paže. Svaly: drobné svaly ruky.',
  Th: 'Hrudní míšní nerv – pokračuje jako mezižeberní nerv. Zajišťuje citlivost pásu hrudníku či břicha (Th4 ≈ výška bradavek, Th10 ≈ pupek).',
  L1: 'Citlivost třísla. Svaly: bederní sval.',
  L2: 'Citlivost horní části přední strany stehna. Svaly: ohýbače kyčle, přitahovače.',
  L3: 'Citlivost přední a vnitřní strany stehna ke koleni. Svaly: čtyřhlavý sval, přitahovače stehna.',
  L4: 'Citlivost vnitřní strany bérce a kotníku. Svaly: čtyřhlavý sval, přední sval holenní. Útlak (výhřez L3/4) oslabuje reflex pod čéškou.',
  L5: 'Citlivost zevní strany bérce, nártu a palce. Svaly: zvedače palce a špičky, střední hýžďový sval. Útlak (výhřez L4/5) – brnění nártu, obtížná chůze po patách.',
  S1: 'Citlivost zevní hrany nohy, malíku a chodidla. Svaly: lýtkový a velký hýžďový sval (stoj na špičkách). Útlak (výhřez L5/S1) oslabuje Achillův reflex.',
  S2: 'Citlivost zadní strany stehna a lýtka. Svaly: ohýbače prstů nohy.',
  S: 'Citlivost hýždí a rozkroku, řízení močového měchýře a konečníku. Porucha těchto kořenů je akutní stav.',
};

export function segmentInfo(seg) {
  if (SEGMENT_INFO[seg]) return SEGMENT_INFO[seg];
  if (seg.startsWith('Th')) return SEGMENT_INFO.Th;
  if (seg.startsWith('S') || seg === 'Co') return SEGMENT_INFO.S;
  return '';
}

// ---------------------------------------------------------------------------
// Pomocné funkce
// ---------------------------------------------------------------------------
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const SP = Object.fromEntries(SPINE);
const SPINE_ORDER = SPINE.map(([k]) => k);

/** Úrovně výstupu míšních nervů (y) a jejich jména. */
export function spinalLevels() {
  const out = [];
  const y = (k) => SP[k][1];
  const z = (k) => SP[k][2];
  // C1 vystupuje nad atlasem, Cn (n ≤ 7) nad obratlem Cn, C8 pod C7
  out.push({ seg: 'C1', y: y('C1') + 0.012, z: z('C1') });
  for (let n = 2; n <= 7; n++) out.push({ seg: `C${n}`, y: (y(`C${n - 1}`) + y(`C${n}`)) / 2, z: (z(`C${n - 1}`) + z(`C${n}`)) / 2 });
  out.push({ seg: 'C8', y: (y('C7') + y('Th1')) / 2, z: (z('C7') + z('Th1')) / 2 });
  // Th a L vystupují pod stejnojmenným obratlem
  const below = (k) => SPINE_ORDER[SPINE_ORDER.indexOf(k) + 1];
  for (let n = 1; n <= 12; n++) {
    const k = `Th${n}`;
    out.push({ seg: k, y: (y(k) + y(below(k))) / 2, z: (z(k) + z(below(k))) / 2 });
  }
  for (let n = 1; n <= 5; n++) {
    const k = `L${n}`;
    const nb = n < 5 ? `L${n + 1}` : 'S';
    out.push({ seg: k, y: n < 5 ? (y(k) + y(nb)) / 2 : y(k) - 0.014, z: n < 5 ? (z(k) + z(nb)) / 2 : z(k) - 0.005 });
  }
  LM.sacral_levels.slice(0, 4).forEach((p, i) => out.push({ seg: `S${i + 1}`, y: p[1], z: p[2] + 0.012, sacral: true }));
  return out;
}

// ---------------------------------------------------------------------------
// Stavba nervů. tube(key, body, points, radius, side), ganglion(key, point, r)
// ---------------------------------------------------------------------------
export function buildNerves(tube, bead) {
  // --- Mícha a koňský ohon ---
  const cordEnd = SPINE_ORDER.indexOf('L2');
  const cordPts = [[0, 1.535, 0.0], ...SPINE_ORDER.slice(0, cordEnd).map((k) => [0, SP[k][1], SP[k][2] - 0.006])];
  tube('spinalCord', cordPts, 0.0045, null);
  tube('caudaEquina', [[0, SP.L1[1], SP.L1[2] - 0.006], [0, SP.L3[1], SP.L3[2] - 0.01], [0, SP.L5[1], SP.L5[2] - 0.014],
    [0, LM.sacral_levels[2][1], LM.sacral_levels[2][2] + 0.008]], 0.0034, null);

  // Bod na míše/koňském ohonu v dané výšce
  const cordAt = (y) => {
    const pts = [...cordPts, [0, SP.L3[1], SP.L3[2] - 0.01], [0, SP.L5[1], SP.L5[2] - 0.014], [0, LM.sacral_levels[2][1], LM.sacral_levels[2][2] + 0.008]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if ((y <= a[1] && y >= b[1])) return lerp(a, b, (a[1] - y) / (a[1] - b[1] || 1));
    }
    return pts[pts.length - 1];
  };

  const levels = spinalLevels();

  for (const [s, sn] of [[1, 'left'], [-1, 'right']]) {
    const side = s > 0 ? 'leva' : 'prava';
    const L = (k) => LM[`${k}_${sn}`];
    const P = (b, dx = 0, dy = 0, dz = 0) => [b[0] + dx * s, b[1] + dy, b[2] + dz];
    const S = L('shoulder'), E = L('elbow'), W = L('wrist'), palm = L('palm');
    const Hp = L('hip'), K = L('knee'), A = L('ankle'), toe = L('toe'), heel = L('heel');
    const AX = P(lerp(S, E, 0.13), -0.032, 0, 0.004);
    const CUB = P(E, -0.006, 0.012, 0.022);
    const POP = P(K, 0, 0.05, -0.035);
    const F = FINGERS[sn];
    const T = TOES[sn];

    // Cílové body plení
    const plexStart = P([0, (SP.C6[1] + SP.C7[1]) / 2, SP.C6[2]], 0.04, -0.004, 0.012);
    const clavMid = lerp(L('clavicle_med'), L('clavicle_lat'), 0.6);
    const behindClav = P(clavMid, 0, -0.016, -0.014);
    const lumbarPlex = P(SP.L4, 0.045, 0.01, 0.012);       // stehenní a ucpávací nerv
    const sacralPlex = P(LM.sacral_levels[2], 0.045, 0.0, 0.01); // sedací nerv
    const isch = L('ischial'), troch = L('trochanter');
    const sciaticExit = P(lerp(isch, troch, 0.45), 0, 0.03, -0.05);

    // --- Míšní nervy (31 párů); kořeny C5–Th1, L2–L4 a L4–S3 se sbíhají do plení ---
    for (const lv of levels) {
      const n = lv.seg;
      const isC = n.startsWith('C'), isL = n.startsWith('L'), isS = n.startsWith('S');
      const fx = isC ? 0.021 : isL ? 0.03 : isS ? 0.022 : 0.026;
      const start = isS ? cordAt(lv.y + 0.03) : isL ? cordAt(lv.y + 0.035) : cordAt(lv.y + (n.startsWith('Th') ? 0.012 : 0.004));
      const foramen = [fx * s, lv.y, lv.z + (isS ? 0.0 : 0.002)];
      const pts = [P(start, 0.003), foramen];
      const num = parseInt(n.replace(/\D/g, ''), 10);
      if ((isC && num >= 5) || n === 'Th1') pts.push(P(foramen, 0.018, -0.006, 0.01), plexStart);
      else if (isL && num >= 2 && num <= 4) pts.push(P(foramen, 0.012, -0.012, 0.008), lumbarPlex);
      else if ((isL && num >= 4) || (isS && num <= 3)) pts.push(P(foramen, 0.012, -0.012, 0.004), sacralPlex);
      else if (n.startsWith('Th')) pts.push(P(foramen, 0.014, -0.004, -0.004));
      else pts.push(P(foramen, 0.016, -0.006, 0.006));
      tube({ key: 'spinal', seg: n }, pts, isC || isL || isS ? 0.0021 : 0.0016, side);
    }

    // --- Sympatický kmen s uzlinami ---
    const symp = SPINE_ORDER.slice(1, SPINE_ORDER.indexOf('S')).map((k) => [0.019 * s, SP[k][1], SP[k][2] + 0.028]);
    symp.push([0.012 * s, LM.sacral_levels[3][1], LM.sacral_levels[3][2] + 0.02]);
    tube('sympathetic', symp, 0.0014, side);
    symp.forEach((p) => bead('sympathetic', p, 0.0028, side));

    // --- Krk a hlava ---
    tube('occipitalMaj', [P(SP.C2, 0.012, 0, -0.03), P(SP.C2, 0.02, 0.025, -0.055), P(LM.occipital_protuberance, 0.028, 0.005, 0.012), P(LM.occipital_protuberance, 0.035, 0.07, 0.01)], 0.0016, side);
    tube('auricular', [P([0, SP.C3[1], SP.C3[2]], 0.03, 0, 0.0), P(L('mastoid'), 0.012, -0.03, 0.02), P(L('ear'), -0.005, -0.04, 0.005)], 0.0015, side);
    tube('phrenic', [P([0, SP.C4[1], SP.C4[2]], 0.028, 0, 0.01), P([0, 1.39, 0.03], 0.036), P(L('clavicle_med'), 0.012, -0.02, -0.012), P(LM.heart, 0.045 - LM.heart[0] * s, 0.02, 0.0), L('diaphragm')], 0.0016, side);
    const jugF = P(L('mastoid'), -0.014, 0.008, 0.012);
    tube('vagus', [jugF, P(L('jugular_top'), -0.004, 0.01, -0.006), P(L('jugular_top'), -0.004, -0.06, -0.008), P([0, 1.31, 0.02], 0.018), P([0, 1.22, -0.005], 0.014), P([0, 1.12, 0.03], 0.012)], 0.0019, side);
    tube('accessory', [jugF, P(L('mastoid'), 0.004, -0.03, -0.01), P(lerp(L('mastoid'), L('acromion'), 0.5), 0, -0.01, -0.035), P(L('acromion'), -0.035, 0.01, -0.03)], 0.0015, side);
    const tg = P(L('ear'), -0.035, -0.012, 0.012);   // trojklané ganglion
    const orb = L('orbit');
    tube('trigemV1', [tg, P(orb, 0.004, 0.012, -0.022), P(orb, 0.0, 0.026, 0.008), P(orb, -0.006, 0.075, 0.006)], 0.0015, side);
    tube('trigemV2', [tg, P(orb, 0.006, -0.012, -0.02), P(orb, 0.002, -0.024, 0.01), P(orb, 0.012, -0.032, 0.014)], 0.0015, side);
    tube('trigemV3', [tg, P(L('mandible_angle'), -0.008, 0.035, 0.012), P(L('mandible_angle'), -0.004, 0.0, 0.03), L('mental'), P(LM.chin, 0.008 - LM.chin[0] * s, 0.004, 0.0)], 0.0015, side);
    const fStart = P(L('mastoid'), 0.004, 0.004, 0.018);
    const parotid = P(L('ear'), -0.008, -0.05, 0.03);
    const facialEnds = [P(orb, 0.04, 0.03, -0.01), P(orb, 0.028, -0.008, -0.004), P(LM.chin, 0.03 - LM.chin[0] * s, 0.03, -0.012), P(L('mental'), 0.008, 0.002, -0.006), P(L('mandible_angle'), -0.002, -0.04, 0.0)];
    for (const end of facialEnds) tube('facial', [fStart, parotid, lerp(parotid, end, 0.55), end], 0.0013, side);

    // --- Pažní pleteň a nervy ruky ---
    tube('plexus', [plexStart, P([0, 1.395, 0.012], 0.055), behindClav, AX], 0.0042, side);
    tube('median', [AX, P(lerp(S, E, 0.5), -0.018, 0, 0.012), CUB, P(lerp(E, W, 0.5), 0, 0, 0.014), P(W, 0, 0.004, 0.011), P(palm, 0.002, 0, 0.012)], 0.0028, side);
    tube('ulnarN', [AX, P(lerp(S, E, 0.55), -0.022, 0, -0.004), P(L('epicondyle_med'), -0.002, 0.006, -0.013), P(lerp(E, W, 0.5), -0.014, 0, 0.008), P(L('wrist_uln'), 0.004, 0.004, 0.009), P(palm, -0.012, 0, 0.01)], 0.0028, side);
    tube('radialN', [AX, P(lerp(S, E, 0.35), -0.004, 0, -0.022), P(lerp(S, E, 0.66), 0.016, 0, -0.012), P(L('epicondyle_lat'), -0.006, 0.012, 0.016), P(lerp(E, W, 0.5), 0.012, 0, 0.002), P(L('wrist_rad'), 0.004, 0.006, -0.004), P(F[0].base, 0, 0.01, -0.012)], 0.0026, side);
    tube('axillaryN', [AX, P(L('humerus_neck'), -0.01, 0, -0.026), P(L('humerus_neck'), 0.022, 0.004, -0.012), P(L('humerus_neck'), 0.03, 0.01, 0.012)], 0.0022, side);
    tube('musculocutN', [AX, P(lerp(S, E, 0.35), -0.01, 0, 0.022), P(lerp(S, E, 0.75), 0.004, 0, 0.02), P(L('epicondyle_lat'), -0.002, 0.004, 0.026), P(lerp(E, W, 0.6), 0.016, 0, 0.016), P(L('wrist_rad'), 0.006, 0.008, 0.008)], 0.0022, side);
    tube('longThoracic', [plexStart, P(behindClav, -0.02, -0.01, -0.01), [0.128 * s, 1.27, 0.0], [0.132 * s, 1.16, 0.012]], 0.0018, side);
    tube('suprascap', [plexStart, P(lerp(L('coracoid'), L('acromion'), 0.35), -0.01, 0.012, -0.03), P(L('scapula_c'), 0.0, 0.03, -0.022), P(L('scapula_c'), 0.012, -0.015, -0.02)], 0.0019, side);
    // prstové nervy (palec–polovina prsteníku ze středového, malík a prsteník z loketního)
    F.forEach((f, i) => {
      const from = i <= 2 ? P(palm, 0.002, 0, 0.012) : P(palm, -0.012, 0, 0.01);
      tube('digitalHand', [from, lerp(from, f.base, 0.7), P(f.base, 0, 0, 0.004), lerp(f.base, f.tip, 0.92)], 0.0011, side);
    });

    // --- Mezižeberní nervy podél žeber ---
    RIBS[sn].forEach((rib, i) => {
      const lv = levels.find((x) => x.seg === `Th${i + 1}`);
      const foramen = [0.026 * s, lv.y, lv.z + 0.002];
      const pts = [foramen, ...rib.filter((p, j) => j > 0)];
      if (i >= 6 && i <= 10) {
        const last = rib[rib.length - 1];
        pts.push([Math.max(0.035, Math.abs(last[0]) * 0.6) * s, last[1] - 0.03 - (i - 6) * 0.012, Math.min(0.11, last[2] + 0.005)]);
      }
      tube(i < 11 ? 'intercostal' : 'subcostal', pts, 0.0013, side, { seg: `Th${i + 1}` });
    });

    // --- Bederní pleteň ---
    tube('femoralN', [lumbarPlex, P(L('ext_iliac_a_end'), 0.014, 0.025, -0.008), P(L('ext_iliac_a_end'), 0.012, -0.01, 0.002), P(lerp(Hp, K, 0.25), 0.006, 0, 0.05)], 0.0036, side);
    tube('saphenousN', [P(lerp(Hp, K, 0.25), 0.0, 0, 0.045), P(lerp(Hp, K, 0.6), -0.026, 0, 0.008), P(K, -0.044, -0.01, -0.005), P(lerp(K, A, 0.5), -0.03, 0, 0.002), P(L('malleolus_med'), -0.008, 0.012, 0.022)], 0.0016, side);
    tube('obturator', [lumbarPlex, P(lumbarPlex, -0.012, -0.08, 0.02), P(lerp(isch, Hp, 0.5), -0.006, 0.0, 0.035), P(lerp(Hp, K, 0.3), -0.04, 0, 0.012), P(lerp(Hp, K, 0.5), -0.04, 0, 0.0)], 0.0022, side);
    tube('latFemCut', [P(SP.L2, 0.04, -0.01, 0.01), P(L('iliac_crest'), -0.02, -0.03, 0.035), P(L('asis'), -0.012, -0.012, -0.004), P(lerp(Hp, K, 0.3), 0.055, 0, 0.03), P(lerp(Hp, K, 0.62), 0.065, 0, 0.012)], 0.0016, side);

    // --- Křížová pleteň a nervy nohy ---
    const split = P(lerp(Hp, K, 0.8), 0, 0, -0.038);
    tube('sciatic', [sacralPlex, P(sacralPlex, 0.02, -0.02, -0.04), sciaticExit, P(lerp(Hp, K, 0.4), -0.004, 0, -0.045), split], 0.0052, side);
    tube('supGluteal', [sacralPlex, P(sacralPlex, 0.03, 0.02, -0.05), P(L('iliac_crest'), 0.005, -0.05, -0.04)], 0.0018, side);
    tube('infGluteal', [sacralPlex, P(sciaticExit, -0.01, 0.01, -0.012), P(sciaticExit, -0.005, -0.03, -0.035)], 0.0018, side);
    tube('tibialN', [split, P(POP, 0, -0.03, 0.0), P(lerp(K, A, 0.5), -0.004, 0, -0.03), P(L('malleolus_med'), -0.004, 0.012, -0.016)], 0.0034, side);
    const tarsal = P(L('malleolus_med'), -0.004, 0.012, -0.016);
    tube('plantarMed', [tarsal, P(lerp(heel, toe, 0.35), -0.012, -0.012, 0), P(T[0].base, 0, -0.004, -0.01), lerp(T[0].base, T[0].tip, 0.85)], 0.002, side);
    tube('plantarMed', [P(lerp(heel, toe, 0.35), -0.012, -0.012, 0), P(T[1].base, 0, -0.004, -0.01), lerp(T[1].base, T[1].tip, 0.85)], 0.0013, side);
    tube('plantarMed', [P(lerp(heel, toe, 0.35), -0.012, -0.012, 0), P(T[2].base, 0, -0.004, -0.01), lerp(T[2].base, T[2].tip, 0.85)], 0.0013, side);
    tube('plantarLat', [tarsal, P(lerp(heel, toe, 0.38), 0.008, -0.012, 0), P(T[3].base, 0, -0.004, -0.01), lerp(T[3].base, T[3].tip, 0.85)], 0.0016, side);
    tube('plantarLat', [P(lerp(heel, toe, 0.38), 0.008, -0.012, 0), P(T[4].base, 0, -0.004, -0.01), lerp(T[4].base, T[4].tip, 0.85)], 0.0013, side);
    tube('peroneal', [split, P(K, 0.026, 0.01, -0.03), P(L('fibula_head'), 0.012, -0.018, 0.002)], 0.003, side);
    const fibNeck = P(L('fibula_head'), 0.012, -0.018, 0.002);
    tube('deepPeroneal', [fibNeck, P(lerp(L('fibula_head'), A, 0.3), -0.004, 0, 0.02), P(lerp(K, A, 0.75), 0.006, 0, 0.022), P(A, 0.002, 0.016, 0.034), P(lerp(T[0].base, T[1].base, 0.5), 0, 0.012, -0.004)], 0.0019, side);
    tube('supPeroneal', [fibNeck, P(lerp(L('fibula_head'), A, 0.45), 0.012, 0, 0.012), P(lerp(K, A, 0.8), 0.018, 0, 0.016), P(A, 0.016, 0.018, 0.03), P(T[2].base, 0.002, 0.016, -0.012), lerp(T[2].base, T[2].tip, 0.6)], 0.0017, side);
    tube('sural', [P(POP, 0, -0.04, -0.006), P(lerp(K, A, 0.45), 0.004, 0, -0.045), P(L('malleolus_lat'), 0.004, 0.008, -0.018), P(T[4].base, 0.006, 0.0, -0.02)], 0.0015, side);
  }
}
