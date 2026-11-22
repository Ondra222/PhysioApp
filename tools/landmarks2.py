"""Doplňkové body: konce cév z BodyParts3D a průřezy kůže trupu."""
import os
from config import STL, AVAIL, SELECTED, LANDMARKS, MODELS, make_avail
import json
import numpy as np
from stlio import read_stl
from build_glb import to_app

NAMES = {l.split('\t')[1].strip(): l.split('\t')[0] for l in open(AVAIL, encoding='utf-8')}

pts = lambda n: to_app(read_stl(STL.format(NAMES[n])).reshape(-1, 3))
data = json.load(open(LANDMARKS))
L = data['landmarks']
for side in ('left', 'right'):
    for vname, key, mode in (('subclavian artery', 'subclavian_a_end', 'lat'), ('subclavian vein', 'subclavian_v_end', 'lat'),
                             ('external iliac artery', 'ext_iliac_a_end', 'low'), ('external iliac vein', 'ext_iliac_v_end', 'low'),
                             ('internal jugular vein', 'jugular_top', 'high'), ('common carotid artery', 'carotid_top', 'high')):
        p = pts(f'{side} {vname}')
        if mode == 'lat':
            sel = p[np.abs(p[:, 0]) >= np.abs(p[:, 0]).max() - 0.004]
        elif mode == 'low':
            sel = p[p[:, 1] <= p[:, 1].min() + 0.004]
        else:
            sel = p[p[:, 1] >= p[:, 1].max() - 0.004]
        L[f'{key}_{side}'] = [round(float(x), 4) for x in sel.mean(0)]
        print(key, side, L[f'{key}_{side}'])
skin = pts('skin')
torso = {}
for y in np.arange(0.80, 1.50, 0.04):
    band = skin[np.abs(skin[:, 1] - y) < 0.006]
    core = band[np.abs(band[:, 0]) < 0.22]
    # trup = body v pásu, které nejsou na pažích (paže jsou dál než ~0.13 od osy při y < 1.3)
    zf, zb = float(core[:, 2].max()), float(core[:, 2].min())
    torso[round(float(y), 2)] = {'zf': round(zf, 3), 'zb': round(zb, 3)}
    print(round(y, 2), 'front', round(zf, 3), 'back', round(zb, 3), 'n', len(band))
data['landmarks'] = L
json.dump(data, open(LANDMARKS, 'w'), indent=1)
for k in ('C1', 'C5', 'C7', 'Th1', 'Th6', 'Th12', 'L1', 'L3', 'L5', 'S'):
    print(k, [round(x, 3) for x in data['spine'][k]['c']], round(data['spine'][k]['zmin'], 3), round(data['spine'][k]['zmax'], 3))
