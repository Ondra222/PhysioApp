"""Další orientační body pro nervovou soustavu: prsty, žebra, lebka, křížová kost.

Doplňuje LANDMARKS (výstup landmarks.py a landmarks2.py) o klíče 'fingers', 'toes', 'ribs' a další body.
"""
import json
import numpy as np
from config import STL, AVAIL, LANDMARKS
from stlio import read_stl
from build_glb import to_app

NAMES = {l.split('\t')[1].strip(): l.split('\t')[0] for l in open(AVAIL, encoding='utf-8')}
pts = lambda n: to_app(read_stl(STL.format(NAMES[n])).reshape(-1, 3))
r4 = lambda v: [round(float(x), 4) for x in v]

data = json.load(open(LANDMARKS))
L = data['landmarks']

FING = ['thumb', 'index finger', 'middle finger', 'ring finger', 'little finger']
TOES = ['big toe', 'second toe', 'third toe', 'fourth toe', 'little toe']
fingers, toes = {}, {}
for side in ('left', 'right'):
    wrist = np.array(L[f'wrist_{side}'])
    f = []
    for name in FING:
        d = pts(f'distal phalanx of {side} {name}')
        tip = d[np.argmax(np.linalg.norm(d - wrist, axis=1))]
        p = pts(f'proximal phalanx of {side} {name}')
        base = p[np.argmin(np.linalg.norm(p - wrist, axis=1))]
        f.append({'base': r4(base), 'tip': r4(tip)})
    fingers[side] = f
    ankle = np.array(L[f'ankle_{side}'])
    t = []
    for name in TOES:
        d = pts(f'distal phalanx of {side} {name}')
        tip = d[np.argmax(np.linalg.norm(d - ankle, axis=1))]
        p = pts(f'proximal phalanx of {side} {name}')
        base = p[np.argmin(np.linalg.norm(p - ankle, axis=1))]
        t.append({'base': r4(base), 'tip': r4(tip)})
    toes[side] = t

ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth']
ribs = {}
for side, s in (('left', 1), ('right', -1)):
    lst = []
    for o in ORD:
        p = pts(f'{side} {o} rib')
        zc = -0.02
        ang = np.degrees(np.arctan2(p[:, 0] * s, p[:, 2] - zc))   # 0 = vpředu, 90 = do strany, 180 = vzadu
        line = []
        for a in range(175, -5, -10):
            m = np.abs(ang - a) < 5
            if m.sum() > 10:
                c = p[m].mean(0)
                c[1] -= 0.004   # nerv běží v žlábku na dolním okraji žebra
                line.append(r4(c))
        lst.append(line)
    ribs[side] = lst

for side, s in (('left', 1), ('right', -1)):
    tmp = pts(f'{side} temporal bone')
    ear = tmp[np.argmax(tmp[:, 0] * s)]
    L[f'ear_{side}'] = r4(ear)
    back = tmp[(tmp[:, 2] < ear[2] - 0.008) & (np.abs(tmp[:, 0]) > np.abs(ear[0]) - 0.03)]
    L[f'mastoid_{side}'] = r4(back[np.argmin(back[:, 1])])
    sca = pts(f'{side} scapula')
    L[f'coracoid_{side}'] = r4(sca[np.argmax(sca[:, 2])])
    L[f'acromion_{side}'] = r4(sca[np.argmax(sca[:, 1])])
    hum = pts(f'{side} humerus')
    yS = L[f'shoulder_{side}'][1]
    L[f'humerus_neck_{side}'] = r4(hum[np.abs(hum[:, 1] - (yS - 0.06)) < 0.006].mean(0))
    eye = pts('eyeball')
    e = eye[eye[:, 0] * s > 0]
    L[f'orbit_{side}'] = r4(e.mean(0))
    man = pts('mandible')
    mm = man[man[:, 0] * s > 0.01]
    L[f'mandible_angle_{side}'] = r4(mm[np.argmin(mm[:, 2] + 0.5 * mm[:, 1])])
    L[f'mental_{side}'] = r4(man[np.argmin(np.abs(man[:, 0] - 0.022 * s) + np.abs(man[:, 2] - man[:, 2].max()) * 0.5 + np.abs(man[:, 1] - (man[:, 1].min() + 0.015)))])

occ = pts('occipital bone')
L['occipital_protuberance'] = r4(occ[np.argmin(occ[:, 2])])
man = pts('mandible')
L['chin'] = r4(man[np.argmax(man[:, 2])])
sac = pts('sacrum')
ys = np.linspace(sac[:, 1].max() - 0.02, sac[:, 1].min() + 0.025, 5)
L['sacral_levels'] = [r4(sac[np.abs(sac[:, 1] - y) < 0.006].mean(0)) for y in ys]
dia = pts('diaphragm')
for side, s in (('left', 1), ('right', -1)):
    d = dia[dia[:, 0] * s > 0.07]
    L[f'diaphragm_{side}'] = r4(d[np.argmax(d[:, 1])])

data['landmarks'] = L
data['fingers'] = fingers
data['toes'] = toes
data['ribs'] = ribs
json.dump(data, open(LANDMARKS, 'w'), indent=1)
for k in ('mastoid_left', 'ear_left', 'coracoid_left', 'acromion_left', 'humerus_neck_left', 'orbit_left', 'mandible_angle_left',
          'mental_left', 'occipital_protuberance', 'chin', 'diaphragm_left'):
    print(k, L[k])
print('sacral', L['sacral_levels'])
print('fingers', fingers['left'][1], 'toes', toes['left'][0])
print('rib 6 left', len(ribs['left'][5]), ribs['left'][5][:2], ribs['left'][5][-1])
