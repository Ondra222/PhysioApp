"""Roztřídí dostupné části BodyParts3D do vrstev aplikace."""
import os
from config import STL, AVAIL, SELECTED, LANDMARKS, MODELS, make_avail
import json
import re
import sys

make_avail()
avail = [l.rstrip('\n').split('\t') for l in open(AVAIL, encoding='utf-8') if l.strip()]

BRAIN = re.compile(r'gyrus|sulcus|lobule|thalam|cerebell|nucleus|fornix|lobe|cortex|white matter|midbrain|pons|'
                   r'medulla oblong|commissure|hippocamp|amygdal|putamen|caudate|pallid|claustrum|insula|corpus callosum|'
                   r'colliculus|geniculate|capsule|habenula|mammillary|pineal|septum pellucidum|stria terminalis|'
                   r'tuber cinereum|lamina terminalis|optic|peduncle|olive|pyramid of medulla|uncus|cuneus|precuneus|'
                   r'brainstem|diencephalon|telencephalon|cerebral')
EXCLUDE = re.compile(r'tooth|molar|incisor|canine|premolar|teeth|hair|eyebrow|penis|testis|epididymis|deferent|'
                     r'seminal|prostate|urethra|gingiva|central canal|aqueduct|ventricle|choroid|interventricular foramen|'
                     r'interpeduncular|liver|kidney|stomach|colon|ileum|jejunum|duodenum|appendix|rectum|spleen|'
                     r'pancrea|gallbladder|esophagus|trachea|bronchus|lung|adrenal|ureter|bladder|thyroid gland|'
                     r'taenia|pituitary|eyeball|valve|anal sphincter|coronary sinus|ear$|pancreatic duct|labial part of mouth')
VESSEL = re.compile(r'artery|arteries|vein|veins|aorta|vena cava|wall of heart|coronary|cardiac vein')
BONE = re.compile(r'\b(bone|vertebra|rib$|rib |costal cartilage|sternum|manubrium|xiphoid|clavicle|scapula|humerus|radius|'
                  r'ulna|femur|tibia|fibula|patella|sacrum|coccyx|hip bone|mandible|maxilla|skull|atlas|axis|'
                  r'phalanx|metacarpal|metatarsal|calcaneus|talus|cuboid|cuneiform|navicular|scaphoid|lunate|triquetral|'
                  r'pisiform|trapezium|trapezoid|capitate|hamate|sesamoid|hyoid bone|intervertebral disk|ethmoid|vomer|'
                  r'concha|nasal cartilages?|thyroid cartilage|occipital bone|parietal bone|frontal bone|temporal bone|'
                  r'sphenoid|zygomatic bone|palatine|lacrimal|interosseous membrane)\b')


def layer_of(name):
    n = name.lower()
    if n == 'skin' or 'eyeball' in n or n.startswith('labial part of mouth'):
        return 'skin'
    if EXCLUDE.search(n) or re.search(r'lung|thymus', n):
        return None
    if BRAIN.search(n) and 'muscle' not in n:
        if re.search(r'gyrus|gyri|lobe|lobule|cerebellum|pons|medulla oblongata|midbrain, nsn|optic nerve|optic chiasm', n):
            return 'nerves'
        return None
    if VESSEL.search(n):
        return 'vessels'
    if BONE.search(n) and 'muscle' not in n:
        return 'bones'
    return 'muscles'


out = {}
for fid, name in avail:
    lay = layer_of(name)
    if lay:
        out[fid] = {'name': name, 'layer': lay}

counts = {}
for v in out.values():
    counts[v['layer']] = counts.get(v['layer'], 0) + 1
print(counts, file=sys.stderr)
json.dump(out, open(SELECTED, 'w'), indent=1, ensure_ascii=False)
if '--print' in sys.argv:
    for lay in ['vessels', 'nerves']:
        print(lay, sorted({v['name'] for v in out.values() if v['layer'] == lay}))
