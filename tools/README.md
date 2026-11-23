# Převod anatomických modelů

Soubory `models/*.glb` a `models/parts.json` vznikají z databáze **BodyParts3D**
(© The Database Center for Life Science, licence CC BY-SA 2.1 Japan) těmito skripty.

## Postup

```bash
# 1) Data BodyParts3D (STL) – stačí složka assets/BodyParts3D_data
git clone --depth 1 https://github.com/Kevin-Mattheus-Moerman/BodyParts3D /tmp/bp3d
export BP3D=/tmp/bp3d/assets/BodyParts3D_data

# 2) Knihovna meshoptimizer pro kvalitní zjednodušení sítí
git clone --depth 1 https://github.com/zeux/meshoptimizer /tmp/meshoptimizer
g++ -O2 -shared -fPIC /tmp/meshoptimizer/src/*.cpp -o tools/libmeshopt.so

# 3) Převod (Python 3 + numpy)
cd tools
python3 select_parts.py        # rozdělení částí do vrstev  -> .work/selected.json
python3 names_cs.py            # české a latinské názvy      -> ../models/parts.json
python3 build_glb.py           # zjednodušení + GLB po vrstvách -> ../models/*.glb
python3 build_figure.py        # záložní postava z kůže BodyParts3D -> ../models/figure.glb
VOX=0.0045 python3 build_avatar.py   # postava pro animace (SDF + marching cubes, kostra, váhy, svaly) -> ../models/avatar.glb
                                   # svaly = záplaty na povrchu (MUSCLES), hranice zachová zjednodušení s atributy
python3 landmarks.py && python3 landmarks2.py && python3 landmarks3.py && python3 make_landmarks_js.py   # klouby, prsty, žebra -> ../js/landmarks.js
```

## Poznámky

- Souřadnice: BodyParts3D je v mm se Z nahoru; aplikace používá metry, Y nahoru, obličej ke +Z.
- Sítě se zjednodušují s maximální odchylkou 0,25–0,6 mm (`ERR` v `build_glb.py`) a pozice se
  ukládají kvantizované na int16 (rozšíření `KHR_mesh_quantization`). Normály dopočítá prohlížeč.
- BodyParts3D neobsahuje periferní nervy, míchu ani cévy končetin – ty kreslí `js/nerves.js` a `js/body.js`
  podle orientačních bodů kostry z `js/landmarks.js`.
- Vnitřní orgány, zuby a pohlavní orgány se do vrstev nezařazují (`EXCLUDE` v `select_parts.py`).
