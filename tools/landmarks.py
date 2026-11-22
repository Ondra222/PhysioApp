"""Změří orientační body kostry (v souřadnicích aplikace) pro nervy, cévy a oblasti."""
import os
from config import STL, AVAIL, SELECTED, LANDMARKS, MODELS, make_avail
import json
import numpy as np
from stlio import read_stl
from build_glb import to_app

NAMES = {l.split('\t')[1].strip(): l.split('\t')[0] for l in open(AVAIL, encoding='utf-8')}



def pts(name):
    return to_app(read_stl(STL.format(NAMES[name])).reshape(-1, 3))


def top(p, frac=0.03):
    y = p[:, 1]
    return p[y >= y.max() - (y.max() - y.min()) * frac].mean(0)


def bottom(p, frac=0.03):
    y = p[:, 1]
    return p[y <= y.min() + (y.max() - y.min()) * frac].mean(0)


L = {}
for side, sn in (('left', 1), ('right', -1)):
    k = lambda n: f'{n}_{side}'
    hum = pts(f'{side} humerus')
    L[k('shoulder')] = top(hum, 0.06)
    L[k('elbow')] = bottom(hum, 0.04)
    hy = hum[:, 1]
    low = hum[hy <= hy.min() + 0.04]
    L[k('epicondyle_med')] = low[np.argmin(np.abs(low[:, 0]))]   # vnitřní = blíž ose těla
    L[k('epicondyle_lat')] = low[np.argmax(np.abs(low[:, 0]))]
    rad, uln = pts(f'{side} radius'), pts(f'{side} ulna')
    L[k('wrist')] = (bottom(rad) + bottom(uln)) / 2
    L[k('wrist_rad')] = bottom(rad)
    L[k('wrist_uln')] = bottom(uln)
    L[k('hand')] = bottom(pts(f'distal phalanx of {side} middle finger'), 0.3)
    L[k('palm')] = pts(f'third metacarpal bone' if False else f'{side} third metacarpal bone').mean(0) if f'{side} third metacarpal bone' in NAMES else None
    fem = pts(f'{side} femur')
    L[k('hip')] = top(fem, 0.05)
    L[k('trochanter')] = fem[np.argmax(np.abs(fem[:, 0]))]
    L[k('knee')] = bottom(fem, 0.04)
    tib, fib = pts(f'{side} tibia'), pts(f'{side} fibula')
    L[k('tibia_top')] = top(tib, 0.04)
    L[k('fibula_head')] = top(fib, 0.06)
    L[k('ankle')] = pts(f'{side} talus').mean(0)
    L[k('malleolus_med')] = bottom(tib, 0.03)
    L[k('malleolus_lat')] = bottom(fib, 0.03)
    cal = pts(f'{side} calcaneus')
    L[k('heel')] = cal[np.argmin(cal[:, 2])]
    L[k('toe')] = pts(f'distal phalanx of {side} big toe').mean(0)
    hipb = pts(f'{side} hip bone')
    L[k('ischial')] = hipb[np.argmin(hipb[:, 1])]
    L[k('iliac_crest')] = top(hipb, 0.03)
    L[k('asis')] = hipb[np.argmax(hipb[:, 2])]
    cla = pts(f'{side} clavicle')
    L[k('clavicle_med')] = cla[np.argmin(np.abs(cla[:, 0]))]
    L[k('clavicle_lat')] = cla[np.argmax(np.abs(cla[:, 0]))]
    sca = pts(f'{side} scapula')
    L[k('scapula_c')] = sca.mean(0)

ORD = {'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8,
       'ninth': 9, 'tenth': 10, 'eleventh': 11, 'twelfth': 12}
spine = {}
for name in NAMES:
    for o, i in ORD.items():
        for kind, pre in (('cervical', 'C'), ('thoracic', 'Th'), ('lumbar', 'L')):
            if name == f'{o} {kind} vertebra':
                p = pts(name)
                spine[f'{pre}{i}'] = {'c': p.mean(0).tolist(), 'zmin': float(p[:, 2].min()), 'zmax': float(p[:, 2].max())}
for n in ('atlas', 'axis', 'sacrum'):
    p = pts(n)
    spine[{'atlas': 'C1', 'axis': 'C2', 'sacrum': 'S'}[n]] = {'c': p.mean(0).tolist(), 'zmin': float(p[:, 2].min()), 'zmax': float(p[:, 2].max())}
skin = pts('skin')
L['head_top'] = skin[np.argmax(skin[:, 1])]
L['sternum_top'] = top(pts('manubrium'), 0.1)
L['heart'] = pts('wall of heart').mean(0)
out = {k: [round(float(x), 4) for x in v] for k, v in L.items() if v is not None}
json.dump({'landmarks': out, 'spine': spine}, open(LANDMARKS, 'w'), indent=1)
for k, v in out.items():
    print(k, v)
print(sorted(spine, key=lambda s: -spine[s]['c'][1]))
