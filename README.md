# PhysioApp

Webová aplikace s interaktivní 3D postavou. Uživatel si zapíná vrstvy (kůže, svaly, kosti, cévy, nervy),
otáčí a přibližuje postavu, klikáním zobrazuje popisky jednotlivých struktur a hlavně **jedním klepnutím označí
místo, kde cítí bolest, tlak nebo brnění** – aplikace pak nabídne vhodná cvičení.

> PhysioApp slouží pouze pro informaci a nenahrazuje vyšetření lékařem ani fyzioterapeutem.

## Funkce

- **3D postava** (Three.js) – otáčení tažením, přiblížení kolečkem / dvěma prsty, posun pravým tlačítkem.
- **Vrstvy** – kůže (s nastavitelnou průhledností), svaly, kosti, cévy (tepny červeně, žíly modře), nervy.
- **Popisky** – klepnutím na strukturu se zobrazí český a latinský název, popis a tělesná oblast.
  Na počítači se název zobrazuje i při najetí myší.
- **Označení potíže** – v režimu „Označit potíž“ zvolíte typ (bolest / tlak / brnění) a klepnete na postavu.
  Aplikace určí oblast a stranu těla a zobrazí:
  - doporučená cvičení s postupem a dávkováním,
  - radu k danému typu potíže,
  - varovné příznaky („kdy nečekat a jít k lékaři“),
  - při intenzitě 7/10 a více jen šetrná cvičení a doporučení konzultace.
- **Moje potíže** – označená místa se ukládají v prohlížeči (localStorage), lze je měnit i mazat.
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
js/body.js          procedurální 3D model po vrstvách + popisky struktur
js/regions.js       tělesné oblasti a určení oblasti z bodu na postavě
js/exercises.js     databáze cvičení, rady a varovné příznaky
vendor/three/       Three.js (MIT) – přibaleno, aby web fungoval bez CDN
tests/              testy logiky (node:test)
```

## Jak rozšiřovat

- **Nové cvičení** – přidejte objekt do `EXERCISES` v `js/exercises.js` (oblasti, typy potíží, postup, dávkování,
  `gentle: true` pro šetrné cviky). Test ověří, že data jsou úplná.
- **Přesnější anatomie** – současný model je stylizovaný (sestavený z jednoduchých tvarů). Jednotlivé části lze
  nahradit modely ve formátu glTF, např. z otevřených projektů
  [Z-Anatomy](https://www.z-anatomy.com/) nebo [BodyParts3D](https://lifesciencedb.jp/bp3d/) (licence CC BY-SA).
  Stačí meshům nastavit `userData` (`layer`, `name`, `latin`, `desc`, `side`) a přidat je do `pickables`.
- **Oblasti** – hranice oblastí jsou v `detectRegion()` v `js/regions.js`.
