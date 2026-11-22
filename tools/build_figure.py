"""Odlehčená postava pro animace cviků: kůže, oči a rty z BodyParts3D -> models/figure.glb.

Kostru a váhy kůže dopočítá prohlížeč (js/figure.js) podle orientačních bodů z js/landmarks.js.
"""
import json
import os
import sys
from config import AVAIL, MODELS
from build_glb import GLB, process

NAMES = {l.split('\t')[1].strip(): l.split('\t')[0] for l in open(AVAIL, encoding='utf-8')}
PARTS = [('skin', 'skin', 0.8), ('eyeball', 'eyes', 0.6), ('labial part of mouth, nsn', 'lips', 0.6)]

import build_glb  # noqa: E402
import numpy as np  # noqa: E402
from collections import deque  # noqa: E402


def remove_internal(v, f, vox=0.004):
    """Odstraní vnitřní stěny sítě (kůže BodyParts3D obsahuje přepážky mezi částmi těla).

    Povrch se převede na voxely, zvenku se vyplní okolní prostor a ponechají se jen
    trojúhelníky, které alespoň jednou stranou sousedí s vnějším prostorem.
    """
    from scipy import ndimage
    lo = v.min(0) - 4 * vox
    shape = np.ceil((v.max(0) + 4 * vox - lo) / vox).astype(int) + 1
    surf = np.zeros(shape, bool)
    a, b, c = v[f[:, 0]], v[f[:, 1]], v[f[:, 2]]
    # body na trojúhelnících s rozestupem pod velikostí voxelu
    longest = np.max([np.linalg.norm(b - a, axis=1), np.linalg.norm(c - b, axis=1), np.linalg.norm(a - c, axis=1)], axis=0)
    steps = np.clip(np.ceil(longest / (vox * 0.5)).astype(int), 1, 200)
    for k in np.unique(steps):
        idx = np.where(steps == k)[0]
        u, w = np.meshgrid(np.arange(k + 1), np.arange(k + 1))
        m = (u + w) <= k
        u, w = u[m] / k, w[m] / k
        P = a[idx, None] + (b[idx] - a[idx])[:, None] * u[None, :, None] + (c[idx] - a[idx])[:, None] * w[None, :, None]
        ijk = np.floor((P.reshape(-1, 3) - lo) / vox).astype(int)
        surf[ijk[:, 0], ijk[:, 1], ijk[:, 2]] = True
    lab, _ = ndimage.label(~surf)
    outside = lab == lab[0, 0, 0]
    n = np.cross(b - a, c - a)
    n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
    cen = (a + b + c) / 3
    out_pos = np.zeros(len(f), bool)
    out_neg = np.zeros(len(f), bool)
    for d in (1.5, 2.5):
        for sgn, arr in ((1, out_pos), (-1, out_neg)):
            q = np.floor((cen + sgn * d * vox * n - lo) / vox).astype(int)
            q = np.clip(q, 0, np.array(shape) - 1)
            arr |= outside[q[:, 0], q[:, 1], q[:, 2]]
    keep = out_pos | out_neg
    f = f.copy()
    flip = out_neg & ~out_pos            # vnější prostor je za trojúhelníkem -> otočit normálu ven
    f[flip] = f[flip][:, [0, 2, 1]]
    print('  vnitřních stěn odstraněno', int((~keep).sum()), 'trojúhelníků, otočeno', int(flip.sum()))
    return f[keep]


def boundary_loops(f):
    """Uzavřené smyčky okrajových hran (hrana jen v jednom trojúhelníku), se směrem podle trojúhelníku."""
    from collections import Counter
    cnt = Counter()
    for a, b, c in f:
        for u, w in ((a, b), (b, c), (c, a)):
            cnt[(min(u, w), max(u, w))] += 1
    nxt = {}
    for a, b, c in f:
        for u, w in ((a, b), (b, c), (c, a)):
            if cnt[(min(u, w), max(u, w))] == 1:
                nxt.setdefault(u, []).append(w)
    loops, used = [], set()
    for start in list(nxt):
        for first in nxt[start]:
            if (start, first) in used:
                continue
            loop, u, w = [start], start, first
            ok = True
            while True:
                used.add((u, w))
                if w == start:
                    break
                loop.append(w)
                cand = [x for x in nxt.get(w, []) if (w, x) not in used]
                if not cand or len(loop) > 2000:
                    ok = False
                    break
                u, w = w, cand[0]
            if ok and len(loop) >= 3:
                loops.append(loop)
    return loops


def fill_holes(v, f, max_len=400):
    """Zalepí díry (po odstranění vnitřních stěn v místě dotyku paže a boku) vějířem ze středu smyčky."""
    loops = boundary_loops(f)
    v = list(v)
    new_f = []
    for loop in loops:
        if len(loop) > max_len:
            continue
        c = np.mean([v[i] for i in loop], axis=0)
        ci = len(v)
        v.append(c)
        for k in range(len(loop)):
            a, b = loop[k], loop[(k + 1) % len(loop)]
            new_f.append([b, a, ci])   # opačný směr okrajové hrany = stejná orientace jako soused
    print('  zalepeno', len(loops), 'děr,', len(new_f), 'nových trojúhelníků')
    return np.array(v), np.vstack([f, np.array(new_f, dtype=f.dtype)]) if new_f else f


def drop_small(v, f, min_tris=300):
    """Odstraní drobné oddělené kousky sítě (vznikají při zjednodušení v místě dotyku paže a boku)."""
    parent = np.arange(len(v))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for a, b, c in f:
        ra = find(a)
        parent[find(b)] = ra
        parent[find(c)] = ra
    roots = np.array([find(i) for i in range(len(v))])
    fr = roots[f[:, 0]]
    u, cnt = np.unique(fr, return_counts=True)
    keep = set(u[cnt >= min_tris])
    mask = np.array([r in keep for r in fr])
    print('  odstraněno', int((~mask).sum()), 'trojúhelníků v', int((cnt < min_tris).sum()), 'kouscích')
    return f[mask]


def orient(v, f):
    """Sjednotí orientaci trojúhelníků (BFS přes společné hrany) a otočí je ven."""
    f = f.copy()
    edges = {}
    for t, (a, b, c) in enumerate(f):
        for u, w in ((a, b), (b, c), (c, a)):
            edges.setdefault((min(u, w), max(u, w)), []).append(t)
    seen = np.zeros(len(f), bool)
    for start in range(len(f)):
        if seen[start]:
            continue
        seen[start] = True
        q = deque([start])
        comp = [start]
        while q:
            t = q.popleft()
            a, b, c = f[t]
            for u, w in ((a, b), (b, c), (c, a)):
                for o in edges[(min(u, w), max(u, w))]:
                    if o == t or seen[o]:
                        continue
                    oa, ob, oc = f[o]
                    # stejná orientace hrany u souseda = nekonzistentní -> otočit
                    if (oa, ob) == (u, w) or (ob, oc) == (u, w) or (oc, oa) == (u, w):
                        f[o] = f[o][[0, 2, 1]]
                    seen[o] = True
                    q.append(o)
                    comp.append(o)
        # znaménkový objem komponenty: záporný = normály dovnitř
        cf = f[comp]
        vol = np.einsum('ij,ij->i', v[cf[:, 0]], np.cross(v[cf[:, 1]], v[cf[:, 2]])).sum()
        if vol < 0:
            f[comp] = f[comp][:, [0, 2, 1]]
    return f

g = GLB()
total = 0
for name, node, err in PARTS:
    build_glb.ERR['tmp'] = err
    v, f = process(NAMES[name], 'tmp')
    if node == 'skin':
        f = remove_internal(v, f)
        f = drop_small(v, f)
    if node != 'skin':
        f = orient(v, f)
    used = np.unique(f)
    remap = -np.ones(len(v), dtype=np.int64)
    remap[used] = np.arange(len(used))
    v, f = v[used], remap[f]
    g.add_mesh(node, v, f)
    total += len(f)
    print(node, len(v), 'vrcholů', len(f), 'trojúhelníků')
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(MODELS, 'figure.glb')
g.write(out)
print('zapsáno', out, f'{os.path.getsize(out) / 1e6:.2f} MB', total, 'trojúhelníků')
