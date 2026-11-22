"""Odlehčená postava pro animace cviků: kůže, oči a rty z BodyParts3D -> models/figure.glb.

Kostru a váhy kůže dopočítá prohlížeč (js/figure.js) podle orientačních bodů z js/landmarks.js.
"""
import json
import os
import sys
from config import AVAIL, MODELS
from build_glb import GLB, process

NAMES = {l.split('\t')[1].strip(): l.split('\t')[0] for l in open(AVAIL, encoding='utf-8')}
PARTS = [('skin', 'skin', 2.2), ('eyeball', 'eyes', 0.6), ('labial part of mouth, nsn', 'lips', 0.6)]

import build_glb  # noqa: E402

g = GLB()
total = 0
for name, node, err in PARTS:
    build_glb.ERR['tmp'] = err
    v, f = process(NAMES[name], 'tmp')
    g.add_mesh(node, v, f)
    total += len(f)
    print(node, len(v), 'vrcholů', len(f), 'trojúhelníků')
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(MODELS, 'figure.glb')
g.write(out)
print('zapsáno', out, f'{os.path.getsize(out) / 1e6:.2f} MB', total, 'trojúhelníků')
