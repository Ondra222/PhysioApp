"""Postava určená pro animace -> models/avatar.glb

Vlastní hladká postava modelovaná jako implicitní plocha (vzdálenostní pole, SDF)
z tvarovaných kapslí a elipsoidů s měkkým spojováním a převedená na jednu uzavřenou
síť (marching cubes). Proporce odpovídají kostře anatomického modelu (js/landmarks.js),
paže jsou v A-póze (odtažené od těla), takže se nikde nedotýkají – při pohybu tak
nevznikají trhliny. Výsledek obsahuje kostru (glTF skin), váhy kůže, barvy
oblečení a morph pro dýchání.

Spuštění: python3 build_avatar.py   (potřebuje numpy, scikit-image, libmeshopt.so)
"""
import json
import os
import struct
import sys

import numpy as np
from skimage.measure import marching_cubes

from meshopt import simplify

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'models', 'avatar.glb')
VOX = float(os.environ.get('VOX', 0.0042))
A_POSE = 24.0          # dodatečné odtažení paží v klidové poloze (°)
LEG_ABD = 3.0          # mírné rozkročení nohou (°)


# ---------------------------------------------------------------------------
# Orientační body (vygenerované z js/landmarks.js, levá strana)
# ---------------------------------------------------------------------------
def load_landmarks():
    path = '/tmp/lm.json'
    if not os.path.exists(path):
        import subprocess
        js = ("import('./js/landmarks.js').then(({LM,SPINE,FINGERS})=>{const S=Object.fromEntries(SPINE);"
              "const pick=['shoulder','elbow','wrist','hand','palm','hip','knee','ankle','toe','heel','clavicle_med','clavicle_lat'];"
              "const o={};for(const k of pick)o[k]=LM[k+'_left'];o.head_top=LM.head_top;o.chin=LM.chin;"
              "o.C1=S.C1;o.C7=S.C7;o.Th12=S.Th12;o.L5=S.L5;o.S=S.S;o.fingers=FINGERS.left;"
              "require('fs').writeFileSync('/tmp/lm.json',JSON.stringify(o))})")
        subprocess.run(['node', '-e', js], cwd=os.path.join(HERE, '..'), check=True)
    return json.load(open(path))


L = {k: (np.array(v, float) if not isinstance(v, list) or not isinstance(v[0], dict) else v) for k, v in load_landmarks().items()}
F = [{'base': np.array(f['base']), 'tip': np.array(f['tip'])} for f in L['fingers']]


def rot_z(p, center, deg):
    a = np.radians(deg)
    c, s = np.cos(a), np.sin(a)
    d = p - center
    return center + np.array([c * d[0] - s * d[1], s * d[0] + c * d[1], d[2]])


SH = L['shoulder']
arm = lambda p: rot_z(np.asarray(p, float), SH, A_POSE)           # A-póza (levá paže doleva)
HIP = L['hip']
leg = lambda p: rot_z(np.asarray(p, float), HIP, LEG_ABD)

E, W, KN, AN = arm(L['elbow']), arm(L['wrist']), leg(L['knee']), leg(L['ankle'])
FING = [{'base': arm(f['base']), 'tip': arm(f['tip'])} for f in F]
KNUCK = np.mean([f['base'] for f in FING[1:]], axis=0)
TOE, HEEL = leg(L['toe']), leg(L['heel'])
Y_L5, Y_TH12, Y_C7, Y_C1, Y_TOP = L['L5'][1], L['Th12'][1], L['C7'][1], L['C1'][1], L['head_top'][1]

# ---------------------------------------------------------------------------
# Primitiva SDF
# ---------------------------------------------------------------------------
def sd_round_cone(p, a, b, r1, r2):
    ba = b - a
    l2 = ba @ ba
    rr = r1 - r2
    a2 = l2 - rr * rr
    il2 = 1.0 / l2
    pa = p - a
    y = pa @ ba
    z = y - l2
    x2 = np.sum((pa * l2 - np.outer(y, ba)) ** 2, axis=1)
    y2 = y * y * l2
    z2 = z * z * l2
    k = np.sign(rr) * rr * rr * x2
    d3 = (np.sqrt(np.maximum(x2 * a2 * il2, 0)) + y * rr) * il2 - r1
    d1 = np.sqrt(x2 + z2) * il2 - r2
    d2 = np.sqrt(x2 + y2) * il2 - r1
    return np.where(np.sign(z) * a2 * z2 > k, d1, np.where(np.sign(y) * a2 * y2 < k, d2, d3))


def basis(axis_y, hint):
    y = axis_y / np.linalg.norm(axis_y)
    x = hint - (hint @ y) * y
    x /= np.linalg.norm(x)
    z = np.cross(x, y)
    return np.stack([x, y, z])  # řádky = osy


def sd_ellipsoid(p, c, r, R=None):
    q = p - c
    if R is not None:
        q = q @ R.T
    k0 = np.linalg.norm(q / r, axis=1)
    k1 = np.linalg.norm(q / (r * r), axis=1)
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)


class Prim:
    def __init__(self, label, kind, args, k, extent):
        self.label, self.kind, self.args, self.k = label, kind, args, k
        self.lo, self.hi = extent

    def eval(self, p):
        return sd_round_cone(p, *self.args) if self.kind == 'cone' else sd_ellipsoid(p, *self.args)


PRIMS = []


def cone(label, a, b, r1, r2, k=0.02):
    a, b = np.asarray(a, float), np.asarray(b, float)
    m = max(r1, r2) + k + 0.01
    PRIMS.append(Prim(label, 'cone', (a, b, r1, r2), k, (np.minimum(a, b) - m, np.maximum(a, b) + m)))


def ell(label, c, r, k=0.03, axis=None, hint=(1, 0, 0)):
    c, r = np.asarray(c, float), np.asarray(r, float)
    R = basis(np.asarray(axis, float), np.asarray(hint, float)) if axis is not None else None
    m = r.max() + k + 0.01
    PRIMS.append(Prim(label, 'ell', (c, r, R), k, (c - m, c + m)))


def mirror(p):
    return np.array([-p[0], p[1], p[2]])


# ---------------------------------------------------------------------------
# Postava
# ---------------------------------------------------------------------------
def build_body():
    # trup
    ell('pelvis', [0, 0.865, 0.0], [0.158, 0.105, 0.108], k=0.04)
    ell('belly', [0, 1.0, 0.0], [0.136, 0.12, 0.092], k=0.05)
    ell('waist', [0, 1.08, -0.008], [0.138, 0.09, 0.092], k=0.05)
    ell('chest', [0, 1.215, 0.0], [0.158, 0.13, 0.108], k=0.05)
    ell('back', [0, 1.2, -0.025], [0.168, 0.15, 0.092], k=0.05)
    ell('chest', [0, 1.3, -0.01], [0.15, 0.08, 0.095], k=0.05)
    for s in (1, -1):
        ell('chest', [0.062 * s, 1.245, 0.058], [0.068, 0.055, 0.045], k=0.04)        # prsní svaly
        ell('glute', [0.068 * s, 0.825, -0.06], [0.078, 0.085, 0.07], k=0.04)
        cone('trap', [0.02 * s, 1.415, -0.035], [0.15 * s, 1.365, -0.02], 0.045, 0.04, k=0.04)
        ell('lat', [0.11 * s, 1.17, -0.04], [0.06, 0.12, 0.06], k=0.04)
    # krk a hlava
    cone('neck', [0, 1.37, -0.015], [0, 1.53, 0.0], 0.056, 0.05, k=0.03)
    ell('head', [0, 1.6, 0.008], [0.077, 0.1, 0.094], k=0.02)
    ell('head', [0, 1.635, -0.01], [0.074, 0.06, 0.088], k=0.03)
    ell('jaw', [0, 1.535, 0.035], [0.058, 0.04, 0.058], k=0.03)
    ell('jaw', [0, 1.512, 0.075], [0.022, 0.018, 0.02], k=0.02)                       # brada
    cone('nose', [0, 1.59, 0.092], [0, 1.563, 0.104], 0.008, 0.012, k=0.012)
    ell('head', [0, 1.606, 0.078], [0.05, 0.01, 0.016], k=0.02)                     # obočí
    ell('lips', [0, 1.537, 0.088], [0.02, 0.008, 0.01], k=0.008)
    for s in (1, -1):
        ell('ear', [0.077 * s, 1.585, 0.0], [0.011, 0.029, 0.019], k=0.01)

    for s in (1, -1):
        M = (lambda p: np.asarray(p, float)) if s > 0 else mirror
        P = 'l' if s > 0 else 'r'
        # rameno a paže (A-póza)
        ell(f'{P}deltoid', M(SH + [0.012, -0.012, 0.0]), [0.055, 0.06, 0.058], k=0.035)
        cone(f'{P}upper', M(SH), M(E), 0.046, 0.036, k=0.03)
        ell(f'{P}upper', M(SH + (E - SH) * 0.45 + np.array([0, 0, 0.012])), [0.036, 0.085, 0.036], k=0.02, axis=M(E) - M(SH))
        cone(f'{P}fore', M(E), M(W), 0.038, 0.026, k=0.02)
        ell(f'{P}fore', M(E + (W - E) * 0.28), [0.041, 0.075, 0.036], k=0.02, axis=M(E) - M(W))
        # dlaň: zploštělý elipsoid
        width_dir = M(FING[1]['base']) - M(FING[4]['base'])
        palm_c = M((W + KNUCK) / 2)
        ell(f'{P}hand', palm_c, [0.04, np.linalg.norm(KNUCK - W) / 2 + 0.006, 0.015], k=0.012, axis=M(KNUCK) - M(W), hint=width_dir)
        for i, f in enumerate(FING):
            b, t = M(f['base']), M(f['tip'])
            if i == 0:
                root = M(W + (f['base'] - W) * 0.35)
                cone(f'{P}finger0', root, b, 0.014, 0.011, k=0.012)
                cone(f'{P}finger0', b, t, 0.0105, 0.0085, k=0.006)
            else:
                mid = b + (t - b) * 0.48
                cone(f'{P}finger{i}', b, mid, 0.0098, 0.0088, k=0.005)
                cone(f'{P}finger{i}', mid, t, 0.0088, 0.0074, k=0.005)
        # noha
        cone(f'{P}thigh', M(HIP + [0, 0.03, 0]), M(KN), 0.085, 0.054, k=0.035)
        ell(f'{P}thigh', M(HIP + (KN - HIP) * 0.42 + np.array([0.004, 0, 0.02])), [0.06, 0.15, 0.058], k=0.03, axis=M(KN) - M(HIP))
        ell(f'{P}knee', M(KN + [0, 0.005, 0.012]), [0.048, 0.05, 0.05], k=0.025)
        cone(f'{P}shin', M(KN), M(AN), 0.05, 0.03, k=0.02)
        ell(f'{P}shin', M(KN + (AN - KN) * 0.3 + np.array([0, 0, -0.022])), [0.043, 0.1, 0.045], k=0.025, axis=M(KN) - M(AN))
        # bota
        heel = np.array([AN[0], 0.04, HEEL[2] + 0.01])
        toe = np.array([TOE[0] + 0.004, 0.032, TOE[2] - 0.005])
        ell(f'{P}foot', M((heel + toe) / 2 + [0, 0.004, 0]), [0.047, np.linalg.norm(toe - heel) / 2 + 0.015, 0.04], k=0.015, axis=M(toe) - M(heel), hint=(1, 0, 0))
        cone(f'{P}foot', M(AN + [0, -0.005, 0]), M(heel + [0, 0.02, 0.02]), 0.033, 0.036, k=0.02)
        ell(f'{P}foot', M(heel + [0, -0.004, 0.005]), [0.038, 0.035, 0.042], k=0.015)


def build_field():
    lo = np.array([-0.58, -0.01, -0.2])
    hi = np.array([0.58, 1.76, 0.24])
    n = np.ceil((hi - lo) / VOX).astype(int) + 1
    D = np.full(n, 0.2, np.float32)
    xs = [lo[i] + np.arange(n[i]) * VOX for i in range(3)]
    for pr in PRIMS:
        i0 = np.clip(np.floor((pr.lo - lo) / VOX).astype(int), 0, n - 1)
        i1 = np.clip(np.ceil((pr.hi - lo) / VOX).astype(int) + 1, 1, n)
        X, Y, Z = np.meshgrid(xs[0][i0[0]:i1[0]], xs[1][i0[1]:i1[1]], xs[2][i0[2]:i1[2]], indexing='ij')
        pts = np.stack([X.ravel(), Y.ravel(), Z.ravel()], axis=1)
        d = pr.eval(pts).reshape(X.shape).astype(np.float32)
        sub = D[i0[0]:i1[0], i0[1]:i1[1], i0[2]:i1[2]]
        h = np.maximum(pr.k - np.abs(sub - d), 0) / pr.k
        D[i0[0]:i1[0], i0[1]:i1[1], i0[2]:i1[2]] = np.minimum(sub, d) - h * h * pr.k * 0.25
    return D, lo


# ---------------------------------------------------------------------------
# Kostra (klidová poloha = A-póza)
# ---------------------------------------------------------------------------
def skeleton():
    bones = []

    def add(name, parent, head, tail):
        bones.append({'name': name, 'parent': parent, 'head': np.asarray(head, float), 'tail': np.asarray(tail, float)})
    hipc = (HIP + mirror(HIP)) / 2
    add('pelvis', None, [0, hipc[1], -0.02], [0, Y_L5, -0.02])
    add('lumbar', 'pelvis', [0, Y_L5, -0.02], [0, Y_TH12, -0.02])
    add('thoracic', 'lumbar', [0, Y_TH12, -0.02], [0, Y_C7, -0.02])
    add('neck', 'thoracic', [0, Y_C7, -0.02], [0, Y_C1, -0.005])
    add('head', 'neck', [0, Y_C1, -0.005], [0, Y_TOP, 0.0])
    for s, P in ((1, 'l'), (-1, 'r')):
        M = (lambda p: np.asarray(p, float)) if s > 0 else mirror
        add(f'{P}Scap', 'thoracic', M(L['clavicle_med'] * [1, 1, 0] + [0, 0, -0.01]), M(SH))
        add(f'{P}UpperArm', f'{P}Scap', M(SH), M(E))
        add(f'{P}Forearm', f'{P}UpperArm', M(E), M(W))
        add(f'{P}Hand', f'{P}Forearm', M(W), M(KNUCK))
        for i, f in enumerate(FING):
            b, t = M(f['base']), M(f['tip'])
            if i == 0:
                add(f'{P}Thumb', f'{P}Hand', M(W + (f['base'] - W) * 0.4), t)
            else:
                mid = b + (t - b) * 0.48
                add(f'{P}Finger{i}a', f'{P}Hand', b, mid)
                add(f'{P}Finger{i}b', f'{P}Finger{i}a', mid, t)
        add(f'{P}Thigh', 'pelvis', M(HIP), M(KN))
        add(f'{P}Shin', f'{P}Thigh', M(KN), M(AN))
        add(f'{P}Foot', f'{P}Shin', M(AN), M(TOE))
    return bones


LABEL_BONE = {
    'pelvis': 'pelvis', 'glute': 'pelvis', 'belly': 'lumbar', 'waist': 'lumbar', 'chest': 'thoracic', 'back': 'thoracic',
    'lat': 'thoracic', 'trap': 'thoracic', 'neck': 'neck', 'head': 'head', 'jaw': 'head', 'nose': 'head', 'ear': 'head', 'lips': 'head',
}
for P in 'lr':
    LABEL_BONE.update({f'{P}deltoid': f'{P}UpperArm', f'{P}upper': f'{P}UpperArm', f'{P}fore': f'{P}Forearm', f'{P}hand': f'{P}Hand',
                       f'{P}finger0': f'{P}Thumb', f'{P}thigh': f'{P}Thigh', f'{P}knee': f'{P}Shin', f'{P}shin': f'{P}Shin', f'{P}foot': f'{P}Foot'})
    for i in range(1, 5):
        LABEL_BONE[f'{P}finger{i}'] = f'{P}Finger{i}a'


def seg_dist(p, a, b):
    ab = b - a
    t = np.clip(((p - a) @ ab) / (ab @ ab), 0, 1)
    c = a + np.outer(t, ab)
    return np.linalg.norm(p - c, axis=1), t


def compute_weights(v, labels, bones, faces):
    idx = {b['name']: i for i, b in enumerate(bones)}
    kids = {b['name']: [c['name'] for c in bones if c['parent'] == b['name']] for b in bones}
    nb = len(bones)
    W = np.zeros((len(v), nb))
    for lab in np.unique(labels):
        m = labels == lab
        prim = LABEL_BONE[lab]
        cand = {prim}
        b = bones[idx[prim]]
        if b['parent']:
            cand.add(b['parent'])
        # u prstů jen vlastní články; jinak i potomci (kromě prstů)
        for c in kids[prim]:
            if 'Finger' in c and 'Finger' not in prim:
                continue
            cand.add(c)
        if prim.endswith('Finger1a') or 'Finger' in prim:
            cand = {x for x in cand if 'Finger' in x or x.endswith('Hand')}
            if prim.endswith('a'):
                cand.add(prim[:-1] + 'b')
        cand = sorted(cand, key=lambda x: idx[x])
        D = np.stack([seg_dist(v[m], bones[idx[c]]['head'], bones[idx[c]]['tail'])[0] for c in cand], axis=1)
        # trup: vzdálenost jen ve svislém směru k úseku páteře (osa uvnitř trupu)
        spine = {'pelvis', 'lumbar', 'thoracic', 'neck'}
        for j, c in enumerate(cand):
            if c in spine:
                bb = bones[idx[c]]
                y0, y1 = sorted([bb['head'][1], bb['tail'][1]])
                yy = v[m][:, 1]
                D[:, j] = np.maximum(np.maximum(y0 - yy, yy - y1), 0) + 0.02
        w = 1.0 / np.maximum(D, 1e-3) ** 5
        w[:, cand.index(prim)] *= 3.0          # vlastní kost má přednost
        w /= w.sum(1, keepdims=True)
        for j, c in enumerate(cand):
            W[m, idx[c]] = w[:, j]
    # vyhlazení po síti
    import scipy.sparse as sp
    n = len(v)
    i = np.concatenate([faces[:, 0], faces[:, 1], faces[:, 2], faces[:, 1], faces[:, 2], faces[:, 0]])
    j = np.concatenate([faces[:, 1], faces[:, 2], faces[:, 0], faces[:, 0], faces[:, 1], faces[:, 2]])
    A = sp.coo_matrix((np.ones(len(i)), (i, j)), shape=(n, n)).tocsr()
    A.data[:] = 1
    deg = np.asarray(A.sum(1)).ravel()
    finger = np.array(['finger' in l for l in labels])
    for _ in range(6):
        Ws = (A @ W) / np.maximum(deg, 1)[:, None]
        W = np.where(finger[:, None], W, 0.5 * W + 0.5 * Ws)
    # 4 nejsilnější
    top = np.argsort(-W, axis=1)[:, :4]
    tw = np.take_along_axis(W, top, 1)
    tw /= tw.sum(1, keepdims=True)
    return top.astype(np.uint16), tw.astype(np.float32)


COL = {
    'skin': (0.85, 0.64, 0.50), 'shirt': (0.16, 0.55, 0.51), 'shorts': (0.17, 0.23, 0.34), 'hair': (0.23, 0.165, 0.12),
    'shoe': (0.24, 0.27, 0.31), 'sole': (0.95, 0.95, 0.95), 'lips': (0.70, 0.41, 0.37),
}


def colors_for(v, labels, bones):
    idx = {b['name']: i for i, b in enumerate(bones)}
    C = np.zeros((len(v), 3))
    for k, (x, y, z) in enumerate(v):
        lab = labels[k]
        c = 'skin'
        if lab in ('pelvis', 'glute'):
            c = 'shorts' if y < 0.93 else 'shirt'
        elif lab in ('belly', 'waist'):
            c = 'shorts' if y < 0.93 else 'shirt'
        elif lab in ('chest', 'back', 'lat', 'trap'):
            c = 'shirt'
            if y > 1.33 and z > 0.0 and abs(x) < 0.075:
                c = 'skin'                                      # výstřih
        elif lab.endswith('deltoid'):
            c = 'shirt'
        elif lab.endswith('upper'):
            b = bones[idx[('l' if lab[0] == 'l' else 'r') + 'UpperArm']]
            _, t = seg_dist(np.array([[x, y, z]]), b['head'], b['tail'])
            c = 'shirt' if t[0] < 0.4 else 'skin'
        elif lab.endswith('thigh'):
            b = bones[idx[lab[0] + 'Thigh']]
            _, t = seg_dist(np.array([[x, y, z]]), b['head'], b['tail'])
            c = 'shorts' if t[0] < 0.55 else 'skin'
        elif lab.endswith('foot'):
            c = 'sole' if y < 0.012 else 'shoe'
        elif lab.endswith('shin') and y < AN[1] + 0.03:
            c = 'shoe'
        elif lab == 'lips':
            c = 'lips'
        elif lab in ('head',):
            if (y > 1.628 and not (z > 0.06 and y < 1.655)) or (z < -0.03 and y > 1.545):
                c = 'hair'
        elif lab == 'ear':
            c = 'skin'
        C[k] = COL[c]
    return C


def cloth_fields(v, labels, bones):
    """Spojitá pole pro oblečení (kladné = uvnitř oblasti). Shader z nich kreslí ostré rovné okraje."""
    idx = {b['name']: i for i, b in enumerate(bones)}
    out = np.full((len(v), 4), -0.05, np.float32)   # tričko, kraťasy, boty, vlasy
    for k, (x, y, z) in enumerate(v):
        lab = labels[k]
        ax = abs(x)
        neck = (1.35 + 0.9 * max(0.0, ax - 0.045)) - y if z > -0.01 else 1.405 - y
        if lab in ('pelvis', 'glute', 'belly', 'waist', 'chest', 'back', 'lat', 'trap'):
            out[k, 0] = min(y - 0.93, neck)
            out[k, 1] = 0.93 - y
        elif lab.endswith('deltoid'):
            out[k, 0] = 0.05
        elif lab.endswith('upper'):
            b = bones[idx[lab[0] + 'UpperArm']]
            _, t = seg_dist(np.array([[x, y, z]]), b['head'], b['tail'])
            out[k, 0] = (0.42 - t[0]) * 0.3
        elif lab.endswith('thigh') or lab.endswith('knee'):
            b = bones[idx[lab[0] + 'Thigh']]
            _, t = seg_dist(np.array([[x, y, z]]), b['head'], b['tail'])
            out[k, 1] = (0.5 - t[0]) * 0.42
        elif lab.endswith('foot') or lab.endswith('shin'):
            out[k, 2] = (AN[1] + 0.035) - y
        elif lab == 'head':
            hairline = np.interp(z, [-0.1, -0.03, 0.0, 0.04, 0.075], [1.54, 1.56, 1.6, 1.628, 1.652])
            out[k, 3] = y - hairline
    return out


def eyes():
    """Oči jako samostatné koule (bílá, duhovka, zornice) – vrcholy, trojúhelníky, barvy."""
    vs, fs, cs = [], [], []
    for s in (1, -1):
        c = np.array([0.03 * s, 1.586, 0.081])
        r = 0.0135
        nu, nv = 18, 12
        base = len(vs)
        for i in range(nv + 1):
            th = np.pi * i / nv
            for j in range(nu):
                ph = 2 * np.pi * j / nu
                d = np.array([np.sin(th) * np.cos(ph), np.cos(th), np.sin(th) * np.sin(ph)])
                d = np.array([d[0], d[2], d[1]])   # pól dopředu (+z)
                d = np.array([d[0], d[1], d[2]])
                p = c + r * np.array([d[0], d[1], d[2]])
                vs.append(p)
                front = d[2] if True else 0
                ang = np.degrees(np.arccos(np.clip(front, -1, 1)))
                cs.append((0.07, 0.07, 0.07) if ang < 14 else (0.36, 0.25, 0.16) if ang < 30 else (0.96, 0.95, 0.93))
        for i in range(nv):
            for j in range(nu):
                a = base + i * nu + j
                b = base + i * nu + (j + 1) % nu
                c2 = a + nu
                d2 = b + nu
                fs += [[a, c2, b], [b, c2, d2]]
    return np.array(vs), np.array(fs), np.array(cs)


# ---------------------------------------------------------------------------
# Svaly: povrch rozdělený na jednotlivé povrchové svaly
# ---------------------------------------------------------------------------
# Každý sval je „záplata“ v souřadnicích části těla:
#   trup a krk:  (výška y [m], úhel kolem těla θ [°]; 0 = vpředu, 90 = bok, 180 = vzadu)
#   končetiny:   (poměrná poloha podél kosti t, úhel kolem kosti θ [°]; 0 = vpředu, +90 = zevně)
# k = vzdálenost od středu záplaty v jednotkách její poloviční velikosti; k < 1 = uvnitř svalu.
# φ = směr svalových vláken v rovině záplaty (90° = podél výšky / kosti).
# 'palm' a 'thumb' u předloktí znamenají úhel dlaně / palcové strany zjištěný z modelu.
MUSCLES = [
    # klíč, český název, oblast, (střed, polovina), (θ, polovina θ), φ[, posun θ na jednotku výšky / t]
    ('pec', 'velký prsní sval', 'torso', (1.25, 0.095), (40, 38), 12),
    ('rectus#1', 'přímý břišní sval', 'torso', (0.925, 0.085), (17, 13), 90),
    ('rectus#2', 'přímý břišní sval', 'torso', (1.05, 0.034), (17, 13), 90),
    ('rectus#3', 'přímý břišní sval', 'torso', (1.125, 0.036), (17, 13), 90),
    ('oblique', 'zevní šikmý břišní sval', 'torso', (1.02, 0.12), (55, 26), 48),
    ('serratus', 'pilovitý sval přední', 'torso', (1.17, 0.058), (82, 13), 25),
    ('trapUp', 'trapézový sval – horní část', 'torso', (1.375, 0.05), (140, 45), -25),
    ('trapMid', 'trapézový sval – střední a dolní část', 'torso', (1.245, 0.12), (168, 17), 5),
    ('lat', 'široký sval zádový', 'torso', (1.11, 0.105), (133, 28), 60),
    ('infra', 'podhřebenový sval', 'torso', (1.272, 0.048), (140, 15), 0),
    ('erector', 'vzpřimovač páteře', 'torso', (1.0, 0.115), (167, 9), 90),
    ('gluteMax', 'velký hýžďový sval', 'torso', (0.83, 0.088), (144, 30), -35),
    ('gluteMed', 'střední hýžďový sval', 'torso', (0.93, 0.05), (105, 30), 90),
    ('tfl', 'napínač stehenní povázky', 'torso', (0.87, 0.05), (72, 15), 80),
    ('scm', 'kývač hlavy', 'neck', (1.445, 0.06), (46, 20), 70, 450),
    ('trapUp', 'trapézový sval – horní část', 'neck', (1.43, 0.06), (152, 34), 80),
    ('levator', 'zdvihač lopatky', 'neck', (1.42, 0.04), (102, 17), 80),
    ('deltA', 'deltový sval – přední část', 'arm', (0.07, 0.27), (40, 42), 90),
    ('deltL', 'deltový sval – střední část', 'arm', (0.07, 0.27), (100, 34), 90),
    ('deltP', 'deltový sval – zadní část', 'arm', (0.07, 0.27), (160, 42), 90),
    ('biceps', 'dvojhlavý sval pažní', 'arm', (0.58, 0.34), (0, 52), 90),
    ('triceps', 'trojhlavý sval pažní', 'arm', (0.52, 0.43), (180, 70), 90),
    ('brachialis', 'hluboký sval pažní', 'arm', (0.8, 0.15), (72, 24), 90),
    ('brachiorad', 'vřetenní sval', 'fore', (0.28, 0.32), ('thumb', 30), 90),
    ('flexors', 'ohýbače zápěstí a prstů', 'fore', (0.42, 0.46), ('palm', 72), 90),
    ('extensors', 'natahovače zápěstí a prstů', 'fore', (0.42, 0.46), ('back', 66), 90),
    ('rectFem', 'přímý sval stehenní', 'thigh', (0.46, 0.42), (2, 22), 90),
    ('vastLat', 'zevní hlava čtyřhlavého svalu', 'thigh', (0.56, 0.4), (68, 34), 90),
    ('vastMed', 'vnitřní hlava čtyřhlavého svalu', 'thigh', (0.79, 0.2), (-40, 30), 90),
    ('adductors', 'přitahovače stehna', 'thigh', (0.3, 0.36), (-100, 42), 80),
    ('sartorius', 'krejčovský sval', 'thigh', (0.45, 0.52), (-25, 13), 90, -165),
    ('bicFem', 'dvojhlavý sval stehenní', 'thigh', (0.56, 0.4), (140, 34), 90),
    ('semi', 'pološlašitý a poloblanitý sval', 'thigh', (0.56, 0.4), (-148, 34), 90),
    ('tibAnt', 'přední sval holenní', 'shin', (0.42, 0.38), (30, 27), 90),
    ('peroneus', 'svaly lýtkové kosti (peroneální)', 'shin', (0.45, 0.36), (95, 24), 90),
    ('gastroc', 'dvojhlavý sval lýtkový', 'shin', (0.3, 0.26), (180, 76), 90),
    ('soleus', 'šikmý sval lýtkový', 'shin', (0.63, 0.2), (180, 88), 90),
]
MUSCLE_KEYS = list(dict.fromkeys(m[0] for m in MUSCLES))
MUSCLE_NAMES = {m[0]: m[1] for m in MUSCLES}
REGION_OF = {'pelvis': 'torso', 'glute': 'torso', 'belly': 'torso', 'waist': 'torso', 'chest': 'torso', 'back': 'torso',
             'lat': 'torso', 'trap': 'torso', 'neck': 'neck'}
for _P in 'lr':
    REGION_OF.update({f'{_P}deltoid': 'arm', f'{_P}upper': 'arm', f'{_P}fore': 'fore', f'{_P}thigh': 'thigh', f'{_P}knee': 'thigh',
                      f'{_P}shin': 'shin'})
REGION_BONE = {'arm': 'UpperArm', 'fore': 'Forearm', 'thigh': 'Thigh', 'shin': 'Shin'}
REGION_R = {'torso': 0.13, 'neck': 0.06, 'arm': 0.045, 'fore': 0.035, 'thigh': 0.07, 'shin': 0.05}
NO_MUSCLE = 9.0
SIZE = float(os.environ.get('MSIZE', 1.15))      # společné zvětšení záplat
POW = {'torso': 2.6, 'neck': 2.4, 'arm': 2.2, 'fore': 2.2, 'thigh': 2.2, 'shin': 2.2}   # tvar (superelipsa)


def vertex_normals(v, f):
    n = np.zeros_like(v)
    fn = np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]])
    for i in range(3):
        np.add.at(n, f[:, i], fn)
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)


def muscle_fields(v, labels, bones):
    """Pro každý vrchol 4 nejbližší svaly (id, k) a souřadnici napříč vlákny (pro jemné pruhování)."""
    idx = {b['name']: i for i, b in enumerate(bones)}
    n = len(v)
    K = np.full((n, len(MUSCLES)), NO_MUSCLE)
    U = np.zeros((n, len(MUSCLES)))
    side = np.where(v[:, 0] >= 0, 0, 1)                  # 0 = levá (+x), 1 = pravá
    reg = np.array([REGION_OF.get(l, '') for l in labels])
    coords = {}
    # trup a krk
    m = np.isin(reg, ['torso', 'neck'])
    th = np.degrees(np.arctan2(np.abs(v[:, 0]), v[:, 2] + 0.015))
    coords['torso'] = coords['neck'] = (v[:, 1], th, None)
    # končetiny
    for r, bn in REGION_BONE.items():
        t = np.zeros(n)
        th = np.zeros(n)
        ext = {}
        for s, P in ((1, 'l'), (-1, 'r')):
            b = bones[idx[P + bn]]
            a = b['tail'] - b['head']
            ln = np.linalg.norm(a)
            a /= ln
            fr = np.array([0, 0, 1.0]) - a[2] * a
            fr /= np.linalg.norm(fr)
            la = np.cross(a, fr) * (1 if np.cross(a, fr)[0] * s > 0 else -1)   # zevní strana
            d = v - b['head']
            sel = side == (0 if s > 0 else 1)
            t[sel] = (d[sel] @ a) / ln
            th[sel] = np.degrees(np.arctan2(d[sel] @ la, d[sel] @ fr))
            if r == 'fore':
                M = (lambda p: np.asarray(p, float)) if s > 0 else mirror
                pn = np.cross(M(KNUCK) - M(W), M(FING[1]['base']) - M(FING[4]['base'])) * s
                tb = M(FING[0]['base']) - M(W)
                ext[P] = {'palm': np.degrees(np.arctan2(pn @ la, pn @ fr)), 'thumb': np.degrees(np.arctan2(tb @ la, tb @ fr))}
                ext[P]['back'] = ext[P]['palm'] + 180
            ext.setdefault(P, {})['len'] = ln
        coords[r] = (t, th, ext)
    for j, mdef in enumerate(MUSCLES):
        key, _, r, (c, h), (tc, thh), phi = mdef[:6]
        shear = mdef[6] if len(mdef) > 6 else 0.0
        h, thh = h * SIZE, thh * SIZE
        y, th, ext = coords[r]
        sel = reg == r
        for P, sv in (('l', 0), ('r', 1)):
            ss = sel & (side == sv)
            if not ss.any():
                continue
            c_th = tc if not isinstance(tc, str) else ext[P][tc]
            dth = (th[ss] - c_th - shear * (y[ss] - c) + 180) % 360 - 180
            pw = POW[r]
            K[ss, j] = (np.abs((y[ss] - c) / h) ** pw + np.abs(dth / thh) ** pw) ** (1 / pw)
            R = REGION_R[r]
            sarc = np.radians(dth) * R
            yy = y[ss] * (ext[P]['len'] if ext else 1.0)
            ph = np.radians(phi)
            U[ss, j] = -sarc * np.sin(ph) + yy * np.cos(ph)
    # sloučit záplaty se stejným klíčem (trapéz na trupu i krku)
    nk = len(MUSCLE_KEYS)
    KK = np.full((n, nk), NO_MUSCLE)
    UU = np.zeros((n, nk))
    for j, m_ in enumerate(MUSCLES):
        q = MUSCLE_KEYS.index(m_[0])
        b = K[:, j] < KK[:, q]
        KK[b, q] = K[b, j]
        UU[b, q] = U[b, j]
    order = np.argsort(KK, axis=1)[:, :4]
    ks = np.take_along_axis(KK, order, 1)
    ids = order * 2 + side[:, None]               # id = 2·index svalu + strana
    ids = np.where(ks >= NO_MUSCLE, -1, ids)
    fib = np.take_along_axis(UU, order[:, :1], 1)[:, 0]
    return ids.astype(np.float32), ks.astype(np.float32), fib.astype(np.float32)


def muscle_relief(v, f, ks):
    """Mírné vyklenutí bříšek svalů a mělké rýhy mezi nimi (posun po normále)."""
    nrm = vertex_normals(v, f)
    k1, k2 = ks[:, 0], ks[:, 1]
    inside = k1 < 1
    belly = np.where(inside, (1 - np.clip(k1, 0, 1) ** 2), 0)
    sep = np.minimum(k2 - k1, 1 - k1)
    groove = np.where(k1 < NO_MUSCLE, np.clip(1 - sep / 0.22, 0, 1) ** 2, 0)
    return v + nrm * (0.0024 * belly - 0.0016 * groove)[:, None]


# ---------------------------------------------------------------------------
# Zápis glTF (kostra + váhy + barvy + morph dýchání)
# ---------------------------------------------------------------------------
def write_glb(path, v, f, col, joints, weights, bones, morph, markers, cloth, mus):
    buf = bytearray()
    views, acc = [], []

    def view(data, target=None, stride=None):
        while len(buf) % 4:
            buf.append(0)
        o = len(buf)
        buf.extend(data)
        vw = {'buffer': 0, 'byteOffset': o, 'byteLength': len(data)}
        if target:
            vw['target'] = target
        if stride:
            vw['byteStride'] = stride
        views.append(vw)
        return len(views) - 1

    def accessor(arr, ctype, typ, target=None, minmax=False, normalized=False):
        bv = view(arr.tobytes(), target)
        a = {'bufferView': bv, 'componentType': ctype, 'count': int(arr.shape[0]), 'type': typ}
        if normalized:
            a['normalized'] = True
        if minmax:
            a['min'] = arr.min(0).tolist()
            a['max'] = arr.max(0).tolist()
        acc.append(a)
        return len(acc) - 1

    pos = accessor(v.astype(np.float32), 5126, 'VEC3', 34962, True)
    lin = np.where(col <= 0.04045, col / 12.92, ((col + 0.055) / 1.055) ** 2.4)   # barvy sRGB -> lineární
    colr = accessor(lin.astype(np.float32), 5126, 'VEC3', 34962)
    jnt = accessor(joints.astype(np.uint16), 5123, 'VEC4', 34962)
    wgt = accessor(weights.astype(np.float32), 5126, 'VEC4', 34962)
    mph = accessor(morph.astype(np.float32), 5126, 'VEC3', 34962, True)
    clo = accessor(cloth.astype(np.float32), 5126, 'VEC4', 34962)
    mid = accessor((mus[0] + 1).astype(np.uint8), 5121, 'VEC4', 34962)              # 0 = žádný sval, jinak id + 1
    mk_ = accessor(np.round(np.clip(mus[1] / NO_MUSCLE, 0, 1) * 65535).astype(np.uint16), 5123, 'VEC4', 34962,
                   normalized=True)                                                 # k / 9
    mfb = accessor(mus[2].reshape(-1, 1), 5126, 'SCALAR', 34962)
    ind = accessor(f.astype(np.uint32).ravel(), 5125, 'SCALAR', 34963)
    # uzly kostí
    nodes = [{'name': 'avatar', 'mesh': 0, 'skin': 0}]
    bidx = {b['name']: i for i, b in enumerate(bones)}
    for b in bones:
        ph = bones[bidx[b['parent']]]['head'] if b['parent'] else np.zeros(3)
        nodes.append({'name': b['name'], 'translation': (b['head'] - ph).tolist()})
    for i, b in enumerate(bones):
        ch = [1 + j for j, c in enumerate(bones) if c['parent'] == b['name']]
        if ch:
            nodes[1 + i]['children'] = ch
    ibm = np.stack([np.array([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [-b['head'][0], -b['head'][1], -b['head'][2], 1]], np.float32) for b in bones])
    ibm_acc = accessor(ibm.reshape(len(bones), 16), 5126, 'MAT4')
    doc = {
        'asset': {'version': '2.0', 'generator': 'physioapp build_avatar.py',
                  'extras': {'markers': markers, 'muscles': [{'key': k.split('#')[0], 'name': MUSCLE_NAMES[k]} for k in MUSCLE_KEYS], 'aPose': A_POSE, 'legAbd': LEG_ABD,
                             'bones': [{'name': b['name'], 'parent': b['parent'], 'head': np.round(b['head'], 5).tolist(),
                                        'tail': np.round(b['tail'], 5).tolist()} for b in bones]}},
        'scene': 0, 'scenes': [{'nodes': [0, 1]}],
        'nodes': nodes,
        'meshes': [{'name': 'avatar', 'primitives': [{'attributes': {'POSITION': pos, 'COLOR_0': colr, 'JOINTS_0': jnt, 'WEIGHTS_0': wgt, '_CLOTH': clo, '_MUSID': mid, '_MUSK': mk_, '_FIBER': mfb},
                                                       'indices': ind, 'targets': [{'POSITION': mph}]}], 'weights': [0]}],
        'skins': [{'joints': list(range(1, 1 + len(bones))), 'inverseBindMatrices': ibm_acc, 'skeleton': 1}],
        'accessors': acc, 'bufferViews': views, 'buffers': [{'byteLength': len(buf)}],
    }
    js = json.dumps(doc, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    while len(buf) % 4:
        buf.append(0)
    with open(path, 'wb') as fh:
        fh.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(buf)))
        fh.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        fh.write(struct.pack('<II', len(buf), 0x004E4942) + buf)


def body_labels(v):
    """Štítek části těla = nejbližší tvar."""
    d = np.full(len(v), np.inf)
    labels = np.empty(len(v), dtype=object)
    for pr in PRIMS:
        dd = pr.eval(v)
        m = dd < d
        d[m] = dd[m]
        labels[m] = pr.label
    return labels


def main():
    build_body()
    print(len(PRIMS), 'tvarů, voxel', VOX)
    D, lo = build_field()
    print('pole', D.shape)
    v, f, _, _ = marching_cubes(D, 0.0, spacing=(VOX, VOX, VOX))
    v = v + lo
    # marching cubes ze skimage vrací trojúhelníky s normálou ven (pro záporné hodnoty uvnitř)
    print('marching cubes', len(v), 'vrcholů', len(f), 'trojúhelníků')
    bones = skeleton()
    # hranice svalů jako atribut, aby zjednodušení zachovalo husté vrcholy podél rýh mezi svaly
    labels = body_labels(v)
    _, mks, _ = muscle_fields(v, labels, bones)
    sep = np.clip(np.minimum(mks[:, 1] - mks[:, 0], 1 - mks[:, 0]), -0.3, 0.45)
    v, f = simplify(v, f.astype(np.int64), float(os.environ.get('ERR', 0.0006)), attrs=sep[:, None],
                    weights=[float(os.environ.get('AW', 1.5))])
    print('zjednodušeno', len(v), 'vrcholů', len(f), 'trojúhelníků')
    labels = body_labels(v)
    mids, mks, fib = muscle_fields(v, labels, bones)
    v = muscle_relief(v, f, mks)
    joints, weights = compute_weights(v, labels, bones, f)
    col = colors_for(v, labels, bones)
    cloth = cloth_fields(v, labels, bones)
    # barva vrcholů: jen kůže, rty, podrážka; oblečení kreslí shader podle polí
    skin_like = np.isin(labels, ['lips']) | (col[:, 0] > 0.9)
    col = np.where(skin_like[:, None], col, np.array(COL['skin']))
    # oči
    ev, ef, ec = eyes()
    head = [b['name'] for b in bones].index('head')
    ej = np.zeros((len(ev), 4), np.uint16)
    ej[:, 0] = head
    ew = np.zeros((len(ev), 4), np.float32)
    ew[:, 0] = 1
    f = np.vstack([f, ef + len(v)])
    joints = np.vstack([joints, ej])
    weights = np.vstack([weights, ew])
    col = np.vstack([col, ec])
    v = np.vstack([v, ev])
    labels = np.concatenate([labels, np.array(['eye'] * len(ev), dtype=object)])
    cloth = np.vstack([cloth, np.full((len(ev), 4), -0.05, np.float32)])
    mids = np.vstack([mids, np.full((len(ev), 4), -1, np.float32)])
    mks = np.vstack([mks, np.full((len(ev), 4), NO_MUSCLE, np.float32)])
    fib = np.concatenate([fib, np.zeros(len(ev), np.float32)])
    # dýchání: přední stěna břicha a hrudníku dopředu
    morph = np.zeros_like(v)
    for k, (x, y, z) in enumerate(v):
        lab = labels[k]
        if lab in ('belly', 'waist', 'pelvis') and z > 0.03 and 0.9 < y < 1.15:
            morph[k, 2] = 0.022 * np.sin(np.pi * (y - 0.9) / 0.25) * min(1, (z - 0.03) / 0.06)
        if lab == 'chest' and z > 0.03 and 1.12 < y < 1.33:
            morph[k, 2] = 0.008 * np.sin(np.pi * (y - 1.12) / 0.21)
            morph[k, 1] = 0.004 * np.sin(np.pi * (y - 1.12) / 0.21)
    # značky pro kotvy a pomůcky: [kost, světová poloha v klidové póze]
    mk = {
        'pelvis': ['pelvis', [0, 0.80, 0.0]], 'sacrum': ['pelvis', [0, L['S'][1], -0.1]], 'back': ['thoracic', [0, 1.22, -0.112]],
        'lowBack': ['lumbar', [0, 0.99, -0.098]], 'scapulaL': ['thoracic', [0.075, 1.25, -0.11]], 'head': ['head', [0, Y_TOP, 0]],
        'headBack': ['head', [0, 1.57, -0.09]], 'forehead': ['head', [0, 1.62, 0.095]],
    }
    for s, P in ((1, 'l'), (-1, 'r')):
        M = (lambda p: np.asarray(p, float)) if s > 0 else mirror
        palm_n = np.cross(M(KNUCK) - M(W), M(FING[1]['base']) - M(FING[4]['base']))
        palm_n = palm_n / np.linalg.norm(palm_n) * s
        mk.update({
            f'{P}Elbow': [f'{P}Forearm', M(E).tolist()],
            f'{P}Hand': [f'{P}Hand', (M((W + KNUCK) / 2) + palm_n * 0.016).tolist()],
            f'{P}Fingertips': [f'{P}Finger2b', M(FING[2]['tip']).tolist()],
            f'{P}Knee': [f'{P}Shin', (M(KN) + [0, 0, 0.05]).tolist()],
            f'{P}KneeIn': [f'{P}Shin', (M(KN) + [-0.048 * s, 0.02, 0]).tolist()],
            f'{P}Foot': [f'{P}Foot', [M(AN)[0], 0.0, (HEEL[2] + TOE[2]) / 2]],
            f'{P}Heel': [f'{P}Foot', [M(AN)[0], 0.0, HEEL[2] - 0.01]],
            f'{P}Toe': [f'{P}Foot', [M(TOE)[0], 0.0, TOE[2] + 0.01]],
        })
    mk = {k: [b, [round(float(x), 5) for x in p]] for k, (b, p) in mk.items()}
    write_glb(OUT, v, f, col, joints, weights, bones, morph, mk, cloth, (mids, mks, fib))
    print('zapsáno', OUT, f'{os.path.getsize(OUT) / 1e6:.2f} MB', len(f), 'trojúhelníků')


if __name__ == '__main__':
    main()
