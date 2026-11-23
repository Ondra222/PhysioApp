# PhysioApp

Webová aplikace s interaktivní 3D postavou. Uživatel si zapíná vrstvy (kůže, svaly, kosti, cévy, nervy),
otáčí a přibližuje postavu, klikáním zobrazuje popisky jednotlivých struktur a hlavně **jedním klepnutím označí
místo, kde cítí bolest, tlak nebo brnění** – aplikace pak nabídne vhodná cvičení.

> PhysioApp slouží pouze pro informaci a nenahrazuje vyšetření lékařem ani fyzioterapeutem.

## Funkce

- **Anatomický 3D model** z vědecké databáze BodyParts3D – ~780 skutečných struktur: kůže, 438 svalů a šlach,
  248 kostí, chrupavek a plotének, cévy trupu a srdce, mozek. Cévy končetin jsou dokreslené.
- **Nervová soustava** – mícha, 29 párů míšních nervů (C1–S4), které se sbíhají do krční, pažní, bederní a křížové
  pleteně, mezižeberní nervy, sympatický kmen, ~25 periferních nervů končetin, hlavové nervy (trojklaný, lícní,
  bloudivý, přídatný) a prstové nervy. Každý nerv má popisek s míšními kořeny.
- **Dermatomy** – přepínač obarví kůži podle míšních segmentů. U každé potíže aplikace ukáže dermatom a kožní nerv
  daného místa (u brnění jako „možný zdroj“) a tlačítkem nerv zvýrazní na modelu.
- **Animace cviků** – vlastní 3D postava určená pro animace (jedna hladká síť s kostrou, A-póza, sportovní oblečení) předvádí všechny cviky včetně pomůcek (židle, stůl, zeď, guma, míček…),
  s popisem fáze („výdrž 5 s“). Postava ukazuje jednotlivé povrchové svaly: pracující svaly jsou červeně a při pohybu
  se stahují, protahované modře, uvolňované zeleně; šipky ukazují směr pohybu a legenda pod animací jmenuje zapojené
  svaly (i hluboké, které na povrchu nejsou vidět). Záběr je pevný, aby byl cvik vidět z nejlepšího úhlu; tlačítkem
  „Svaly“ / „Postava“ lze přepnout na postavu v oblečení.
- **Realistické zobrazení** (Three.js) – fyzikálně založené materiály, osvětlení prostředím, filmové tónování,
  vržené stíny v režimu „Vysoká kvalita“.
- Otáčení tažením, přiblížení kolečkem / dvěma prsty, posun pravým tlačítkem.
- **Vrstvy** – kůže (s nastavitelnou průhledností), svaly, kosti, cévy (tepny červeně, žíly modře), nervy a mozek.
  Vrstvy se stahují až při zapnutí (výchozí kůže + svaly ≈ 7 MB).
- **Popisky** – klepnutím na strukturu se zobrazí český a latinský název, popis a tělesná oblast.
  Na počítači se název zobrazuje i při najetí myší.
- **Označení potíže** – v režimu „Označit potíž“ zvolíte typ (bolest / tlak / brnění) a klepnete na postavu.
  Aplikace určí oblast a stranu těla a zobrazí:
  - doporučená cvičení s postupem a dávkováním,
  - radu k danému typu potíže,
  - varovné příznaky („kdy nečekat a jít k lékaři“),
  - při intenzitě 7/10 a více jen šetrná cvičení a doporučení konzultace.
- **Moje potíže** – označená místa se ukládají v prohlížeči (localStorage), lze je měnit i mazat.
- **Cvičební plán** – z kombinace všech označených potíží sestaví plán: vybere cviky, které pomáhají na víc potíží
  zároveň, vyváží rozhýbání, posílení a protažení, dodrží zvolený čas (10–30 min) a rozvrhne jednotky A/B do týdne
  včetně postupu po týdnech. Volitelně může plán sestavit AI (Claude) s vlastním API klíčem uživatele – vybírá jen
  z cviků aplikace a při chybě se použije místní plánovač. Plán lze uložit a vytisknout.
- **Cviky s overballem** – 9 cviků s měkkým míčem (krk, hrudní páteř, rameno, bedra, kyčel, koleno, břicho),
  s volbou „Mám overball“.
- Funguje na počítači i na mobilu.

## Spuštění

Aplikace nepotřebuje žádný build – je to statický web. Kvůli ES modulům ji ale nejde otevřít přímo ze souboru,
je potřeba lokální server:

```bash
python3 -m http.server 8000
# a otevřít http://localhost:8000
```

### Nasazení na GitHub Pages

V repozitáři: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.
Aplikace pak poběží na `https://<uživatel>.github.io/PhysioApp/`.

## Testy

Logika určování oblastí a výběru cvičení je bez závislosti na prohlížeči:

```bash
node --test tests/logic.test.mjs
```

## Struktura

```
index.html          rozvržení stránky
css/style.css       vzhled (desktop i mobil)
js/main.js          scéna, ovládání, výběr, panely, ukládání
js/body.js          načítání modelu po vrstvách, materiály, dokreslené cévy
js/nerves.js        nervová soustava (dráhy, popisky, míšní segmenty)
js/dermatomes.js    mapa dermatomů a kožních nervů
js/avatar.js        postava pro animace (models/avatar.glb, kostra a váhy z tools/build_avatar.py)
js/figure.js        záložní postava z kůže BodyParts3D
js/mannequin.js     záložní kloubová figurína a společné funkce póz
js/exercise-anims.js klíčové pózy všech cviků
js/exercise-muscles.js zapojení svalů u jednotlivých cviků (pracují / protahují se / uvolňují se)
js/anim-player.js   přehrávač animací v kartě cviku (stíny, průběh, opakování, rychlost)
js/planner.js       sestavení cvičebního plánu (místně i přes Claude API)
js/landmarks.js     orientační body kostry (vygenerované z modelu)
js/regions.js       tělesné oblasti a určení oblasti z bodu na postavě
models/             anatomické modely (GLB) a české popisky (parts.json)
tools/              převod dat BodyParts3D na modely – viz tools/README.md
js/exercises.js     databáze cvičení, rady a varovné příznaky
vendor/three/       Three.js (MIT) – přibaleno, aby web fungoval bez CDN
tests/              testy logiky (node:test)
```

## Jak rozšiřovat

- **Nové cvičení** – přidejte objekt do `EXERCISES` v `js/exercises.js` (oblasti, typy potíží, postup, dávkování,
  `gentle: true` pro šetrné cviky). Test ověří, že data jsou úplná.
- **Názvy a popisy struktur** – `tools/names_cs.py` (po úpravě spustit znovu, viz `tools/README.md`).
- **Nervy** – dráhy jsou v `js/nerves.js`, cévy končetin ve funkci `buildExtras()` v `js/body.js`.
- **Animace cviku** – přidejte záznam do `ANIMS` v `js/exercise-anims.js` (výchozí poloha, klíčové pózy jako úhly
  kloubů ve stupních, pomůcky). Význam úhlů je popsán v hlavičce `js/mannequin.js`. Zapojené svaly doplňte
  do `EXERCISE_MUSCLES` v `js/exercise-muscles.js`.
- **Oblasti** – hranice oblastí jsou v `detectRegion()` v `js/regions.js`.

## Licence a zdroje

- Anatomická data: [BodyParts3D](https://lifesciencedb.jp/bp3d/), © The Database Center for Life Science,
  licence [CC BY-SA 2.1 Japan](https://creativecommons.org/licenses/by-sa/2.1/jp/deed.cs). Modely ve složce
  `models/` jsou odvozené dílo pod stejnou licencí (viz `models/LICENSE-BodyParts3D.txt`).
- [Three.js](https://threejs.org/) (MIT), zjednodušení sítí [meshoptimizer](https://github.com/zeux/meshoptimizer) (MIT).
