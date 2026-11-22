"""Společné cesty pro převodní skripty.

BP3D  – složka assets/BodyParts3D_data z repozitáře
        https://github.com/Kevin-Mattheus-Moerman/BodyParts3D (STL soubory BodyParts3D)
WORK  – pracovní složka pro mezivýsledky
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
BP3D = os.environ.get('BP3D', '/tmp/bp3d/assets/BodyParts3D_data')
WORK = os.environ.get('WORK', os.path.join(HERE, '.work'))
STL = os.path.join(BP3D, 'stl', '{}.stl')
AVAIL = os.path.join(WORK, 'avail.txt')
SELECTED = os.path.join(WORK, 'selected.json')
LANDMARKS = os.path.join(WORK, 'landmarks.json')
MODELS = os.path.join(REPO, 'models')
os.makedirs(WORK, exist_ok=True)


def make_avail():
    """Seznam částí, pro které existuje STL: 'FMAid<TAB>název'."""
    have = {f[:-4] for f in os.listdir(os.path.join(BP3D, 'stl')) if f.endswith('.stl')}
    lines = [l for l in open(os.path.join(BP3D, 'parts_list_e.txt'), encoding='utf-8') if l.split('\t')[0] in have]
    open(AVAIL, 'w', encoding='utf-8').writelines(lines)
