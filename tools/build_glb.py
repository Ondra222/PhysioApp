"""Převod vybraných STL z BodyParts3D na GLB soubory po vrstvách.

Souřadnice: BodyParts3D je v mm, osa Z nahoru, předek těla = -Y, pravá strana = -X.
Aplikace: metry, osa Y nahoru, chodidla na y = 0, obličej ke +Z, pravá strana = -X.
Pozice jsou kvantizované na int16 (KHR_mesh_quantization), normály dopočítá prohlížeč.
"""
import os
from config import STL, AVAIL, SELECTED, LANDMARKS, MODELS, make_avail
import json
import struct
import sys
import numpy as np
from stlio import read_stl, weld
from meshopt import simplify

SEL = json.load(open(SELECTED))

OUT = sys.argv[1] if len(sys.argv) > 1 else MODELS
ERR = {'skin': 0.6, 'muscles': 0.6, 'bones': 0.35, 'vessels': 0.25, 'nerves': 0.5}  # max. odchylka v mm
Z0 = -13.5   # nejnižší bod kůže (chodidla)
Y0 = -80.0   # předozadní střed těla


def to_app(v):
    return np.stack([v[:, 0] / 1000, (v[:, 2] - Z0) / 1000, -(v[:, 1] - Y0) / 1000], axis=1)


def process(fid, layer):
    tr = read_stl(STL.format(fid))
    v, f = weld(tr)
    v, f = simplify(v, f, ERR[layer])
    v = to_app(v)  # (x, z, -y) je čistá rotace, orientace trojúhelníků zůstává
    return v, f


class GLB:
    def __init__(self):
        self.bin = bytearray()
        self.views, self.accessors, self.meshes, self.nodes = [], [], [], []

    def _view(self, data, target):
        while len(self.bin) % 4:
            self.bin.append(0)
        off = len(self.bin)
        self.bin += data
        self.views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(data), 'target': target})
        return len(self.views) - 1

    def add_mesh(self, name, v, f):
        lo, hi = v.min(0), v.max(0)
        center = (lo + hi) / 2
        scale = max(float((hi - lo).max()) / 2 / 32767, 1e-9)
        q = np.round((v - center) / scale).astype(np.int16)
        qpad = np.zeros((len(q), 4), dtype=np.int16)  # int16 VEC3 musí být zarovnané na 4 B
        qpad[:, :3] = q
        pv = self._view(qpad.tobytes(), 34962)
        self.views[pv]['byteStride'] = 8
        self.accessors.append({
            'bufferView': pv, 'componentType': 5122, 'count': len(q), 'type': 'VEC3',
            'min': q.min(0).tolist(), 'max': q.max(0).tolist(),
        })
        pa = len(self.accessors) - 1
        if len(q) < 65536:
            idx, ct = f.astype(np.uint16).tobytes(), 5123
        else:
            idx, ct = f.astype(np.uint32).tobytes(), 5125
        iv = self._view(idx, 34963)
        self.accessors.append({'bufferView': iv, 'componentType': ct, 'count': int(f.size), 'type': 'SCALAR'})
        ia = len(self.accessors) - 1
        self.meshes.append({'name': name, 'primitives': [{'attributes': {'POSITION': pa}, 'indices': ia}]})
        self.nodes.append({'name': name, 'mesh': len(self.meshes) - 1,
                           'translation': center.tolist(), 'scale': [scale] * 3})

    def write(self, path):
        doc = {
            'asset': {'version': '2.0', 'generator': 'physioapp build_glb.py',
                      'copyright': 'BodyParts3D, (c) The Database Center for Life Science, CC BY-SA 2.1 JP'},
            'extensionsUsed': ['KHR_mesh_quantization'], 'extensionsRequired': ['KHR_mesh_quantization'],
            'scene': 0, 'scenes': [{'nodes': list(range(len(self.nodes)))}],
            'nodes': self.nodes, 'meshes': self.meshes, 'accessors': self.accessors,
            'bufferViews': self.views, 'buffers': [{'byteLength': len(self.bin)}],
        }
        js = json.dumps(doc, separators=(',', ':')).encode()
        js += b' ' * ((4 - len(js) % 4) % 4)
        while len(self.bin) % 4:
            self.bin.append(0)
        total = 12 + 8 + len(js) + 8 + len(self.bin)
        with open(path, 'wb') as fh:
            fh.write(struct.pack('<III', 0x46546C67, 2, total))
            fh.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
            fh.write(struct.pack('<II', len(self.bin), 0x004E4942) + self.bin)


def main():
    import os
    os.makedirs(OUT, exist_ok=True)
    layers = sys.argv[2].split(',') if len(sys.argv) > 2 else ['skin', 'muscles', 'bones', 'vessels', 'nerves']
    for layer in layers:
        g = GLB()
        ntri = 0
        for fid, info in SEL.items():
            if info['layer'] != layer:
                continue
            v, f = process(fid, layer)
            if len(f) == 0:
                continue
            g.add_mesh(fid, v, f)
            ntri += len(f)
        g.write(f'{OUT}/{layer}.glb')
        print(layer, len(g.meshes), 'parts', ntri, 'tris', f'{len(g.bin) / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
