"""Načítání binárních STL a jednoduchá decimace shlukováním vrcholů (numpy)."""
import numpy as np

STL_DTYPE = np.dtype([('n', '<f4', 3), ('v', '<f4', (3, 3)), ('attr', '<u2')])


def read_stl(path):
    data = open(path, 'rb').read()
    n = int.from_bytes(data[80:84], 'little')
    tri = np.frombuffer(data, dtype=STL_DTYPE, count=n, offset=84)
    return tri['v'].astype(np.float64)  # (n, 3, 3)


def weld(tris, tol=1e-3):
    pts = tris.reshape(-1, 3)
    keys = np.round(pts / tol).astype(np.int64)
    uniq, inv = np.unique(keys, axis=0, return_inverse=True)
    verts = np.zeros((len(uniq), 3))
    np.add.at(verts, inv.ravel(), pts)
    cnt = np.bincount(inv.ravel(), minlength=len(uniq))
    verts /= cnt[:, None]
    faces = inv.reshape(-1, 3)
    return verts, faces


def cluster(verts, faces, cell):
    """Decimace: vrcholy ve stejné buňce mřížky se sloučí do jejich průměru."""
    if cell <= 0:
        return verts, faces
    keys = np.floor(verts / cell).astype(np.int64)
    uniq, inv = np.unique(keys, axis=0, return_inverse=True)
    inv = inv.ravel()
    nv = np.zeros((len(uniq), 3))
    np.add.at(nv, inv, verts)
    nv /= np.bincount(inv, minlength=len(uniq))[:, None]
    f = inv[faces]
    ok = (f[:, 0] != f[:, 1]) & (f[:, 1] != f[:, 2]) & (f[:, 0] != f[:, 2])
    f = f[ok]
    # odstranit duplicitní trojúhelníky (stejná trojice bez ohledu na pořadí)
    srt = np.sort(f, axis=1)
    _, idx = np.unique(srt, axis=0, return_index=True)
    f = f[np.sort(idx)]
    # přečíslovat použité vrcholy
    used = np.unique(f)
    remap = -np.ones(len(nv), dtype=np.int64)
    remap[used] = np.arange(len(used))
    return nv[used], remap[f]


def decimate_to(verts, faces, target, cell0):
    """Zvětšuje buňku, dokud počet trojúhelníků neklesne pod cíl."""
    cell = cell0
    v, f = cluster(verts, faces, cell)
    while len(f) > target:
        cell *= 1.25
        v, f = cluster(verts, faces, cell)
    return v, f, cell
