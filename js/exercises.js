// Databáze cvičení a doporučení podle oblasti a typu potíže.
// Bez závislosti na Three.js.
//
// symptoms: 'bolest' | 'tlak' | 'brneni'
// gentle: true = šetrné cvičení vhodné i při silnější bolesti

export const SYMPTOMS = {
  bolest: { name: 'Bolest', color: '#e5484d' },
  tlak: { name: 'Tlak / ztuhlost', color: '#f5a524' },
  brneni: { name: 'Brnění / mravenčení', color: '#8e4ec6' },
};

export const EXERCISES = [
  // ---------- Hlava a krk ----------
  {
    id: 'chin-tuck', name: 'Zasunutí brady (chin tuck)',
    regions: ['krk', 'hlava', 'horni_zada'], symptoms: ['bolest', 'tlak', 'brneni'], gentle: true,
    dose: '10× výdrž 5 s, 2–3× denně',
    steps: [
      'Seďte nebo stůjte zpříma, pohled dopředu.',
      'Zasuňte bradu vodorovně dozadu, jako byste dělali „dvojitou bradu“. Hlavu nekloňte.',
      'Ucítíte protažení na spodině lebeční. Vydržte 5 s a povolte.',
    ],
  },
  {
    id: 'suboccipital', name: 'Uvolnění podhlavových svalů míčky',
    regions: ['hlava', 'krk'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '2–3 min, 1–2× denně',
    steps: [
      'Vložte dva tenisové míčky do ponožky a zavažte ji.',
      'Lehněte na záda a míčky si podložte pod spodinu lebeční (vlevo a vpravo od středu).',
      'Uvolněte se, klidně dýchejte a velmi jemně kývejte hlavou „ano“.',
    ],
  },
  {
    id: 'upper-trap', name: 'Protažení horního trapézu',
    regions: ['krk', 'rameno'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '3× 30 s na každou stranu',
    steps: [
      'Sedněte si a jednou rukou se chyťte okraje židle, rameno stáhněte dolů.',
      'Ukloňte hlavu k opačnému rameni (ucho k rameni), obličej dopředu.',
      'Druhou rukou můžete hlavu jen lehce přidržet. Netahejte, výdrž 30 s.',
    ],
  },
  {
    id: 'levator', name: 'Protažení zdvihače lopatky',
    regions: ['krk', 'horni_zada'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '3× 30 s na každou stranu',
    steps: [
      'Otočte hlavu asi o 45° k jedné straně a skloňte ji, jako byste se dívali do kapsy u kalhot.',
      'Rameno na opačné straně stáhněte dolů.',
      'Ucítíte tah v zadní části krku směrem k lopatce. Výdrž 30 s.',
    ],
  },
  {
    id: 'neck-iso', name: 'Izometrie krku',
    regions: ['krk'], symptoms: ['bolest'], gentle: true,
    dose: '5× výdrž 5–8 s do každého směru',
    steps: [
      'Dlaň položte na čelo a tlačte hlavou proti ruce, hlava se nehýbe.',
      'Použijte jen 20–30 % síly. Totéž zopakujte do stran a dozadu (dlaň na týl).',
    ],
  },
  {
    id: 'median-glide', name: 'Klouzání středového nervu (n. medianus)',
    regions: ['krk', 'rameno', 'loket', 'zapesti'], symptoms: ['brneni'], gentle: true,
    dose: '10 pomalých opakování, 2× denně',
    steps: [
      'Upažte ruku do výše ramen, dlaň nahoru, loket mírně pokrčený.',
      'Pomalu natahujte loket a zakloňte zápěstí (prsty k zemi) a současně ukloňte hlavu k té ruce.',
      'Pak zápěstí uvolněte a hlavu ukloňte od ruky. Plynule střídejte.',
      'Nesmí to vyvolat silné brnění – jde o „klouzání“, ne o protahování nervu.',
    ],
  },
  {
    id: 'ulnar-glide', name: 'Klouzání loketního nervu (n. ulnaris)',
    regions: ['loket', 'zapesti', 'krk'], symptoms: ['brneni'], gentle: true,
    dose: '10 pomalých opakování, 2× denně',
    steps: [
      'Upažte ruku, dlaň směřuje dolů.',
      'Pomalu pokrčte loket a zakloňte zápěstí tak, aby se dlaň přibližovala k uchu („maska“).',
      'Vraťte se zpět. Pohyb dělejte jen do lehkého pocitu tahu, bez zhoršení brnění.',
    ],
  },
  {
    id: 'breathing', name: 'Brániční dýchání',
    regions: ['hlava', 'krk', 'hrudnik', 'bricho', 'bedra'], symptoms: ['tlak', 'bolest'], gentle: true,
    dose: '5 min, kdykoli během dne',
    steps: [
      'Lehněte si na záda s pokrčenými koleny, jednu ruku dejte na hrudník, druhou na břicho.',
      'Nadechujte se nosem tak, aby se zvedala hlavně ruka na břiše a rozšiřovala se spodní žebra.',
      'Vydechujte pomalu ústy, výdech o něco delší než nádech.',
    ],
  },

  // ---------- Rameno ----------
  {
    id: 'pendulum', name: 'Codmanovo kyvadlo',
    regions: ['rameno'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '1–2 min, 3× denně',
    steps: [
      'Opřete se zdravou rukou o stůl a předkloňte se, bolavá ruka volně visí.',
      'Rozhoupejte ruku pohybem trupu – dopředu a dozadu, do stran a v malých kruzích.',
      'Rameno nechte úplně uvolněné, ruku aktivně nezvedejte.',
    ],
  },
  {
    id: 'ext-rot', name: 'Zevní rotace ramene s gumou',
    regions: ['rameno'], symptoms: ['bolest'],
    dose: '3× 12 opakování',
    steps: [
      'Stůjte, loket u těla pokrčený do 90°, v rukou odporová guma.',
      'Předloktí pomalu otáčejte ven, loket zůstává přitisknutý k boku.',
      'Pomalu se vraťte. Lehký odpor, pohyb bez bolesti.',
    ],
  },
  {
    id: 'scap-squeeze', name: 'Stahování lopatek',
    regions: ['rameno', 'horni_zada', 'krk'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '10× výdrž 5 s, 2–3× denně',
    steps: [
      'Seďte zpříma, ruce volně podél těla.',
      'Stáhněte lopatky dozadu a dolů k sobě, jako byste mezi nimi drželi tužku.',
      'Ramena nezvedejte k uším. Výdrž 5 s a povolte.',
    ],
  },
  {
    id: 'cross-body', name: 'Protažení zadní části ramene',
    regions: ['rameno'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '3× 30 s',
    steps: [
      'Přetáhněte nataženou ruku přes hrudník k opačnému rameni.',
      'Druhou rukou ji jemně přitlačte nad loktem.',
      'Ucítíte tah v zadní části ramene. Výdrž 30 s.',
    ],
  },
  {
    id: 'wall-slide', name: 'Klouzání rukama po zdi',
    regions: ['rameno', 'horni_zada'], symptoms: ['bolest', 'tlak'],
    dose: '2× 10 opakování',
    steps: [
      'Postavte se čelem ke zdi, předloktí opřete o zeď.',
      'Pomalu posouvejte předloktí po zdi nahoru, jen kam to jde bez bolesti.',
      'Lopatky drží dolů, ramena nezvedejte k uším. Pomalu zpět.',
    ],
  },
  {
    id: 'doorway-pec', name: 'Protažení prsních svalů ve dveřích',
    regions: ['hrudnik', 'rameno', 'horni_zada'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '3× 30 s',
    steps: [
      'Postavte se do dveří, předloktí opřete o zárubně, lokty ve výši ramen.',
      'Udělejte malý krok vpřed, až ucítíte protažení na hrudníku.',
      'Nedělejte prohnutí v bedrech. Výdrž 30 s.',
    ],
  },

  // ---------- Horní záda a hrudník ----------
  {
    id: 'open-book', name: 'Otevírání knihy',
    regions: ['horni_zada', 'hrudnik'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '10× na každou stranu',
    steps: [
      'Lehněte na bok, kolena pokrčená, ruce natažené před sebou dlaněmi k sobě.',
      'Horní ruku obloukem přeneste na druhou stranu a dívejte se za ní – hrudník se „otevírá“.',
      'Kolena zůstávají u sebe na podložce. Pomalu zpět.',
    ],
  },
  {
    id: 'cat-cow', name: 'Kočka – kráva',
    regions: ['horni_zada', 'bedra', 'krk'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '10 pomalých opakování',
    steps: [
      'Klekněte na všechny čtyři, dlaně pod rameny, kolena pod kyčlemi.',
      'S výdechem vyhrbte záda a bradu přitáhněte k hrudníku.',
      'S nádechem záda jemně prohněte a pohled zvedněte. Plynule střídejte.',
    ],
  },
  {
    id: 'thoracic-ext', name: 'Záklon hrudní páteře přes opěradlo',
    regions: ['horni_zada'], symptoms: ['bolest', 'tlak'],
    dose: '10× výdrž 3 s',
    steps: [
      'Sedněte si na židli s nízkým opěradlem, ruce zkřížené na hrudníku nebo za hlavou.',
      'Zakloňte se přes horní hranu opěradla – pohyb vychází z hrudní páteře, ne z beder.',
      'Krátce vydržte a vraťte se. Opěradlo můžete posouvat výš a níž.',
    ],
  },
  {
    id: 'ball-release', name: 'Uvolnění míčkem o zeď',
    regions: ['horni_zada', 'rameno', 'krk', 'kycel'], symptoms: ['tlak', 'bolest'], gentle: true,
    dose: '1–2 min na jedno místo',
    steps: [
      'Tenisový míček vložte mezi zeď a napjaté místo (např. mezi lopatku a páteř, hýždě).',
      'Opřete se tak, aby tlak byl příjemný, max. 5/10.',
      'Pomalu se pohybujte a míček nechte rolovat po svalu. Na páteř ani kosti netlačte.',
    ],
  },

  // ---------- Břicho a bedra ----------
  {
    id: 'pelvic-tilt', name: 'Pánevní náklon vleže',
    regions: ['bedra', 'bricho'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '10–15 opakování, 2× denně',
    steps: [
      'Lehněte na záda s pokrčenými koleny, chodidla na zemi.',
      'S výdechem přitiskněte bedra k podložce (pánev se podsadí).',
      'S nádechem povolte. Pohyb je malý a pomalý.',
    ],
  },
  {
    id: 'knees-chest', name: 'Kolena k hrudníku',
    regions: ['bedra', 'kycel', 'bricho'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '3× 20–30 s',
    steps: [
      'Lehněte na záda a přitáhněte si jedno nebo obě kolena rukama k hrudníku.',
      'Uvolněte se a klidně dýchejte, můžete se jemně pohupovat do stran.',
    ],
  },
  {
    id: 'mckenzie', name: 'Záklon vleže na břiše (McKenzie)',
    regions: ['bedra'], symptoms: ['bolest', 'brneni'],
    dose: '10 opakování, několikrát denně',
    caution: 'Pokud se bolest nebo brnění šíří dál do nohy, cvičení přerušte. Pokud se naopak stahuje k páteři, je to dobré znamení.',
    steps: [
      'Lehněte na břicho, dlaně položte vedle ramen.',
      'Propněte lokty a zvedněte horní část těla, pánev a bedra zůstávají uvolněné na zemi.',
      'Krátce vydržte nahoře a pomalu se spusťte. Začněte jen opřením o předloktí.',
    ],
  },
  {
    id: 'bird-dog', name: 'Ptáček – pes (bird dog)',
    regions: ['bedra', 'horni_zada'], symptoms: ['bolest'],
    dose: '2× 8 opakování na stranu, výdrž 5 s',
    steps: [
      'Klekněte na všechny čtyři, záda rovná.',
      'Současně natáhněte jednu ruku dopředu a opačnou nohu dozadu do výše trupu.',
      'Pánev se nesmí natáčet ani prohýbat. Vydržte a vystřídejte strany.',
    ],
  },
  {
    id: 'bridge', name: 'Most (zvedání pánve)',
    regions: ['bedra', 'kycel', 'koleno'], symptoms: ['bolest'],
    dose: '3× 10–12 opakování',
    steps: [
      'Lehněte na záda, kolena pokrčená, chodidla na šířku pánve.',
      'Zatněte hýždě a zvedněte pánev, až tělo tvoří přímku od ramen ke kolenům.',
      'Neprohýbejte bedra. Výdrž 2 s a pomalu dolů.',
    ],
  },
  {
    id: 'child-pose', name: 'Poloha dítěte',
    regions: ['bedra', 'horni_zada'], symptoms: ['tlak', 'bolest'], gentle: true,
    dose: '3× 30–60 s',
    steps: [
      'Z kleku na čtyřech si sedněte hýžděmi na paty.',
      'Ruce natáhněte před sebe, čelo opřete o podložku.',
      'Dýchejte do zad a nechte je uvolnit.',
    ],
  },
  {
    id: 'sciatic-floss', name: 'Klouzání sedacího nervu (n. ischiadicus)',
    regions: ['bedra', 'kycel', 'koleno', 'kotnik'], symptoms: ['brneni'], gentle: true,
    dose: '10 pomalých opakování, 2× denně',
    steps: [
      'Sedněte si na okraj židle, záda mírně v předklonu.',
      'Natáhněte koleno a současně zakloňte hlavu (díváte se nahoru).',
      'Pak koleno pokrčte a bradu skloňte k hrudníku. Plynule střídejte.',
      'Brnění se nesmí zhoršovat ani přetrvávat po cvičení.',
    ],
  },

  // ---------- Loket a zápěstí ----------
  {
    id: 'eccentric-wrist', name: 'Pomalé spouštění zápěstí (excentrika)',
    regions: ['loket', 'zapesti'], symptoms: ['bolest'],
    dose: '3× 15 opakování, 1× denně',
    caution: 'Mírná bolest do 3/10 je při tenisovém lokti v pořádku, nesmí se ale zhoršovat druhý den.',
    steps: [
      'Předloktí opřete o stůl, ruka přesahuje přes okraj, dlaní dolů, v ruce lahev s vodou (0,5 l).',
      'Druhou rukou pomozte zápěstí zvednout nahoru.',
      'Pak ho pomalu (3–4 s) spouštějte dolů jen silou bolavé ruky.',
    ],
  },
  {
    id: 'ext-stretch', name: 'Protažení natahovačů předloktí',
    regions: ['loket', 'zapesti'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '3× 30 s',
    steps: [
      'Natáhněte ruku před sebe dlaní dolů.',
      'Druhou rukou jemně ohněte zápěstí dolů (prsty k zemi).',
      'Ucítíte tah na hřbetní straně předloktí. Výdrž 30 s.',
    ],
  },
  {
    id: 'flex-stretch', name: 'Protažení ohýbačů předloktí',
    regions: ['loket', 'zapesti'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '3× 30 s',
    steps: [
      'Natáhněte ruku před sebe dlaní nahoru.',
      'Druhou rukou jemně zakloňte prsty a zápěstí dolů.',
      'Ucítíte tah na vnitřní straně předloktí. Výdrž 30 s.',
    ],
  },
  {
    id: 'pronation', name: 'Otáčení předloktí s kladívkem',
    regions: ['loket', 'zapesti'], symptoms: ['bolest'],
    dose: '2× 12 opakování',
    steps: [
      'Předloktí opřete o stůl, v ruce držte kladívko za rukojeť (čím blíž hlavě, tím lehčí).',
      'Pomalu otáčejte předloktí dlaní nahoru a dlaní dolů.',
    ],
  },
  {
    id: 'tendon-glide', name: 'Klouzání šlach prstů',
    regions: ['zapesti'], symptoms: ['bolest', 'tlak', 'brneni'], gentle: true,
    dose: '5–10× každou pozici, 3× denně',
    steps: [
      'Začněte s natáhnutými prsty.',
      'Postupně: „háček“ (pokrčené špičky prstů) → pěst → „stolek“ (prsty rovně, ohnuté v kloubech u dlaně) → rovná pěst.',
      'Každou pozici vydržte 3 s, mezi nimi vždy prsty natáhněte.',
    ],
  },
  {
    id: 'wrist-circles', name: 'Kroužení zápěstím',
    regions: ['zapesti'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '10× na každou stranu',
    steps: [
      'Ruce předpažte nebo opřete lokty o stůl.',
      'Pomalu kružte zápěstími v co největším rozsahu bez bolesti, oběma směry.',
    ],
  },
  {
    id: 'ball-squeeze', name: 'Mačkání měkkého míčku',
    regions: ['zapesti', 'loket'], symptoms: ['bolest'],
    dose: '2× 10 opakování, výdrž 3 s',
    steps: [
      'Vezměte do dlaně měkký míček nebo houbu.',
      'Stiskněte středně silně, vydržte 3 s a pomalu povolte.',
    ],
  },

  // ---------- Kyčel ----------
  {
    id: 'hip-flexor', name: 'Protažení ohýbačů kyčle ve výpadu',
    regions: ['kycel', 'bedra'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '3× 30 s na každou stranu',
    steps: [
      'Klekněte na jedno koleno (podložte ho), druhá noha je vpředu pokrčená.',
      'Podsaďte pánev (zatněte hýždi zadní nohy) a mírně přeneste váhu dopředu.',
      'Ucítíte tah v přední části kyčle zadní nohy. Neprohýbejte bedra.',
    ],
  },
  {
    id: 'clamshell', name: 'Mušle (clamshell)',
    regions: ['kycel', 'koleno'], symptoms: ['bolest'],
    dose: '3× 12–15 opakování na stranu',
    steps: [
      'Lehněte na bok, kolena a kyčle pokrčené, chodidla u sebe.',
      'Zvedejte horní koleno jako otevírající se mušli, chodidla zůstávají spojená.',
      'Pánev se nesmí přetáčet dozadu. Pomalu zpět.',
    ],
  },
  {
    id: 'figure-four', name: 'Protažení hruškovitého svalu (figura 4)',
    regions: ['kycel', 'bedra'], symptoms: ['bolest', 'tlak', 'brneni'], gentle: true,
    dose: '3× 30 s na každou stranu',
    steps: [
      'Lehněte na záda, kotník jedné nohy položte na koleno druhé nohy.',
      'Spodní nohu přitáhněte rukama za stehno k sobě.',
      'Ucítíte protažení v hýždi. Pokud zesílí brnění do nohy, povolte.',
    ],
  },

  // ---------- Koleno ----------
  {
    id: 'quad-set', name: 'Zpevnění čtyřhlavého svalu (quad set)',
    regions: ['koleno'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '10× výdrž 5 s, 3× denně',
    steps: [
      'Seďte nebo ležte s nataženou nohou, pod koleno dejte srolovaný ručník.',
      'Zatlačte koleno do ručníku a zatněte přední stranu stehna, špičku přitáhněte k sobě.',
      'Výdrž 5 s a povolte.',
    ],
  },
  {
    id: 'slr', name: 'Zvedání natažené nohy',
    regions: ['koleno', 'kycel'], symptoms: ['bolest'], gentle: true,
    dose: '3× 10 opakování',
    steps: [
      'Lehněte na záda, jedna noha pokrčená, druhá natažená.',
      'Zpevněte stehno natažené nohy a zvedněte ji do výše kolena druhé nohy.',
      'Pomalu spusťte. Koleno zůstává po celou dobu propnuté.',
    ],
  },
  {
    id: 'heel-slide', name: 'Klouzání patou',
    regions: ['koleno'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '10–15 opakování, 2–3× denně',
    steps: [
      'Lehněte na záda s nataženými nohami.',
      'Pomalu posouvejte patu po podložce k hýždím, koleno se ohýbá.',
      'Jděte jen do bezbolestného rozsahu a vraťte se. Pomáhá i při pocitu otoku.',
    ],
  },
  {
    id: 'mini-squat', name: 'Mini dřep s oporou',
    regions: ['koleno', 'kycel'], symptoms: ['bolest'],
    dose: '3× 10 opakování',
    steps: [
      'Postavte se za opěradlo židle a lehce se ho držte, chodidla na šířku pánve.',
      'Pokrčte kolena asi do 30–45°, jako byste si chtěli sednout. Kolena směřují nad špičky.',
      'Vraťte se nahoru. Váha je na patách.',
    ],
  },
  {
    id: 'step-up', name: 'Výstup na schod',
    regions: ['koleno'], symptoms: ['bolest'],
    dose: '2× 10 opakování na nohu',
    steps: [
      'Postavte se před nízký schod, můžete se přidržet zábradlí.',
      'Vystupte jednou nohou, koleno nesmí uhýbat dovnitř.',
      'Pomalu a kontrolovaně sestupte stejnou nohou.',
    ],
  },
  {
    id: 'hamstring', name: 'Protažení zadní strany stehen',
    regions: ['koleno', 'kycel', 'bedra'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '3× 30 s na každou nohu',
    steps: [
      'Lehněte na záda, kolem chodidla jedné nohy dejte ručník nebo pásek.',
      'Nataženou nohu zvedejte nahoru, až ucítíte tah na zadní straně stehna.',
      'Druhá noha zůstává na zemi. Výdrž 30 s.',
    ],
  },

  // ---------- Kotník a chodidlo ----------
  {
    id: 'ankle-alphabet', name: 'Abeceda kotníkem',
    regions: ['kotnik'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '1–2× celá abeceda, 2× denně',
    steps: [
      'Seďte s nohou ve vzduchu nebo položenou patou na zemi.',
      'Špičkou nohy „pište“ velká písmena abecedy. Pohyb vychází z kotníku, ne z kolena.',
    ],
  },
  {
    id: 'ankle-pump', name: 'Pumpování kotníkem',
    regions: ['kotnik', 'koleno'], symptoms: ['tlak', 'bolest'], gentle: true,
    dose: '20–30× každou hodinu sezení',
    steps: [
      'Vleže nebo vsedě střídavě přitahujte špičky k sobě a propínejte je od sebe.',
      'Pomáhá při otoku a pocitu tlaku v lýtku a kotníku.',
    ],
  },
  {
    id: 'calf-raise', name: 'Výpony na špičky',
    regions: ['kotnik', 'koleno'], symptoms: ['bolest'],
    dose: '3× 12–15 opakování',
    steps: [
      'Postavte se a lehce se přidržte zdi.',
      'Pomalu se zvedněte na špičky a pomalu (3 s) se spusťte na paty.',
      'Postupně můžete přejít na jednu nohu nebo na okraj schodu.',
    ],
  },
  {
    id: 'calf-stretch', name: 'Protažení lýtka u zdi',
    regions: ['kotnik', 'koleno'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '3× 30 s na každou nohu',
    steps: [
      'Opřete se rukama o zeď, jedna noha vpředu, druhá vzadu.',
      'Zadní nohu nechte propnutou, pata zůstává na zemi, přeneste váhu dopředu.',
      'Pro hlubší lýtkový sval (šlachu) pak zadní koleno lehce pokrčte.',
    ],
  },
  {
    id: 'foot-roll', name: 'Rolování chodidla míčkem',
    regions: ['kotnik'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '1–2 min na každou nohu',
    steps: [
      'Vsedě položte chodidlo na tenisový míček nebo zmrzlou lahev s vodou.',
      'Rolujte od paty ke špičkám se středním tlakem.',
    ],
  },
  {
    id: 'single-leg', name: 'Stoj na jedné noze',
    regions: ['kotnik', 'koleno'], symptoms: ['bolest'],
    dose: '3× 30 s na každou nohu',
    steps: [
      'Postavte se vedle stolu nebo zdi pro jistotu.',
      'Zvedněte jednu nohu a udržte rovnováhu na druhé, koleno lehce pokrčené.',
      'Ztížení: zavřete oči nebo stůjte na polštáři.',
    ],
  },
  // ---------- Overball (měkký míč o průměru cca 25 cm) ----------
  {
    id: 'ob-chin-nod', name: 'Overball: kývání hlavou s míčem pod týlem', equipment: 'overball',
    regions: ['krk', 'hlava'], symptoms: ['bolest', 'tlak', 'brneni'], gentle: true,
    dose: '10× výdrž 3 s, 2× denně',
    steps: [
      'Lehněte na záda s pokrčenými koleny, pod týl si dejte mírně podfouknutý overball.',
      'Jemně kývněte bradou k hrudníku („ano“) a lehce zatlačte týlem do míče.',
      'Vydržte 3 s a povolte. Ramena a čelist zůstávají uvolněné.',
    ],
  },
  {
    id: 'ob-thoracic', name: 'Overball: rozvíjení hrudní páteře přes míč', equipment: 'overball',
    regions: ['horni_zada', 'hrudnik', 'krk'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '8–10 opakování, míč posuňte o kousek výš a zopakujte',
    steps: [
      'Lehněte na záda s pokrčenými koleny, overball si podložte pod lopatky.',
      'Ruce zkřížené na hrudníku nebo dlaně za hlavou, lokty vpřed.',
      'S výdechem se pomalu zakloňte přes míč, s nádechem se vraťte. Bedra zůstávají na zemi.',
    ],
  },
  {
    id: 'ob-palm-press', name: 'Overball: stlačování míče dlaněmi', equipment: 'overball',
    regions: ['rameno', 'hrudnik', 'loket', 'zapesti'], symptoms: ['bolest'], gentle: true,
    dose: '10× výdrž 5 s',
    steps: [
      'Seďte zpříma, overball držte před hrudníkem mezi dlaněmi, lokty mírně od těla.',
      'Stlačte míč dlaněmi asi na 30–50 % síly, lopatky držte dole.',
      'Vydržte 5 s, plynule dýchejte a povolte.',
    ],
  },
  {
    id: 'ob-wall-circles', name: 'Overball: kroužení míčem o zeď', equipment: 'overball',
    regions: ['rameno'], symptoms: ['bolest'],
    dose: '2× 10 kroužků každým směrem',
    steps: [
      'Postavte se čelem ke zdi, nataženou rukou přitlačte overball ke zdi ve výši ramene.',
      'Malými kroužky (velikost dlaně) koulejte míčem po zdi, rameno drží dole.',
      'Kružte oběma směry. Cvičení má být bez bolesti.',
    ],
  },
  {
    id: 'ob-pelvic-tilt', name: 'Overball: pánevní náklon s míčem pod křížovou kostí', equipment: 'overball',
    regions: ['bedra', 'kycel', 'bricho'], symptoms: ['bolest', 'tlak'], gentle: true,
    dose: '10–15 pomalých opakování',
    steps: [
      'Lehněte na záda s pokrčenými koleny a overball si podložte pod křížovou kost.',
      'Pomalu kolébejte pánví – podsadit (bedra k míči) a lehce prohnout.',
      'Pohyb je malý a příjemný, dýchejte do břicha.',
    ],
  },
  {
    id: 'ob-knee-squeeze', name: 'Overball: stlačení míče mezi koleny', equipment: 'overball',
    regions: ['kycel', 'bedra', 'koleno', 'bricho'], symptoms: ['bolest'], gentle: true,
    dose: '10× výdrž 5 s',
    steps: [
      'Lehněte na záda s pokrčenými koleny, overball vložte mezi kolena.',
      'S výdechem stlačte míč koleny a jemně zpevněte břicho a pánevní dno.',
      'Vydržte 5 s a s nádechem povolte.',
    ],
  },
  {
    id: 'ob-bridge', name: 'Overball: most s míčem mezi koleny', equipment: 'overball',
    regions: ['bedra', 'kycel', 'koleno'], symptoms: ['bolest'],
    dose: '3× 10 opakování',
    steps: [
      'Lehněte na záda, kolena pokrčená, overball mezi koleny.',
      'Stlačte míč a zvedněte pánev, až tělo tvoří přímku od ramen ke kolenům.',
      'Nahoře vydržte 2 s a pomalu se spusťte. Míč nesmí vypadnout.',
    ],
  },
  {
    id: 'ob-wall-squat', name: 'Overball: dřep u zdi s míčem za zády', equipment: 'overball',
    regions: ['koleno', 'kycel'], symptoms: ['bolest'],
    dose: '2× 10 opakování',
    steps: [
      'Overball opřete o zeď a zády se o něj opřete ve výši beder, chodidla kousek před tělem.',
      'Pomalu se spusťte do podřepu (kolena max. do 60–90°), míč se kutálí po zdi.',
      'Kolena míří nad špičky. Vraťte se nahoru.',
    ],
  },
  {
    id: 'ob-crunch', name: 'Overball: zkrácený sed s míčem pod bedry', equipment: 'overball',
    regions: ['bricho', 'bedra'], symptoms: ['bolest'],
    dose: '2× 10 opakování',
    steps: [
      'Lehněte na záda s pokrčenými koleny, overball pod bedry.',
      'S výdechem zvedněte hlavu a lopatky, ruce se natahují ke kolenům.',
      'Bedra zůstávají opřená o míč. Pomalu se vraťte.',
    ],
  },
];

export const SYMPTOM_ADVICE = {
  bolest:
    'Cvičte jen v rozsahu bez ostré bolesti. Mírný diskomfort do 3/10, který do 24 hodin odezní, je v pořádku. Začněte šetrnými cviky a zátěž přidávejte postupně.',
  tlak:
    'Pocit tlaku či ztuhlosti bývá spojen se svalovým napětím, dlouhým setrváním v jedné poloze nebo otokem. Pomáhá pravidelný pohyb, uvolnění, protažení a klidné dýchání.',
  brneni:
    'Brnění nebo mravenčení často souvisí s podrážděním nervu (u páteře, v lokti, v zápěstí, v hýždi). Nervy se nenatahují, jen se jemně „posouvají“ – cviky dělejte pomalu a bez zhoršení příznaků. Pokud brnění sílí, šíří se, nebo je spojené se slabostí či necitlivostí, navštivte lékaře.',
};

const GENERAL_RED_FLAGS = [
  'potíže vznikly po úrazu, pádu nebo nehodě',
  'horečka, zimnice nebo nevysvětlitelné hubnutí spolu s bolestí',
  'silná bolest v klidu a v noci, která se pohybem nemění',
  'postupně narůstající slabost nebo necitlivost končetiny',
];

const REGION_RED_FLAGS = {
  hlava: ['náhlá, nejhorší bolest hlavy v životě, porucha řeči, vidění nebo hybnosti → volejte 155'],
  krk: ['brnění nebo slabost v obou rukou, nejistá chůze, závratě s poruchou řeči či polykání'],
  hrudnik: ['tlak nebo bolest na hrudi vystřelující do levé paže, čelisti či zad, dušnost, pocení → volejte 155'],
  bricho: ['silná nebo zhoršující se bolest břicha, zvracení, krev ve stolici, horečka – bolest břicha má často vnitřní příčinu, nejdřív ji nechte posoudit lékařem'],
  bedra: ['necitlivost v rozkroku, potíže s močením nebo stolicí, slabost obou nohou → ihned na pohotovost'],
  kotnik: ['oteklé, teplé a zarudlé lýtko (možná trombóza) nebo nemožnost na nohu došlápnout'],
  koleno: ['koleno náhle výrazně oteklo, je zablokované nebo nejde zatížit'],
  rameno: ['bolest levého ramene spojená s dušností či tlakem na hrudi → volejte 155', 'ruku po úrazu nejde vůbec zvednout'],
};

export function redFlags(region) {
  return [...(REGION_RED_FLAGS[region] || []), ...GENERAL_RED_FLAGS];
}

/**
 * Vybere cvičení pro oblast a typ potíže.
 * Při intenzitě 7 a více vrací jen šetrná cvičení.
 */
export function selectExercises(region, symptom, intensity = 5, opts = {}) {
  const strong = intensity >= 7;
  const equip = opts.equipment;   // undefined = všechno vybavení
  const list = EXERCISES.filter(
    (e) => e.regions.includes(region) && e.symptoms.includes(symptom) && (!strong || e.gentle)
      && (!e.equipment || !equip || equip.includes(e.equipment)),
  );
  // Primární oblast cviku (první v seznamu) a šetrné cviky dopředu.
  return list.sort((a, b) => {
    const pa = a.regions[0] === region ? 0 : 1;
    const pb = b.regions[0] === region ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return (b.gentle ? 1 : 0) - (a.gentle ? 1 : 0);
  });
}
