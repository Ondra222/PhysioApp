"""Zapíše js/landmarks.js z landmarks.json (výstup landmarks.py + landmarks2.py)."""
import json
import os
from config import LANDMARKS, REPO

d = json.load(open(LANDMARKS))
L = d['landmarks']
S = {k: [round(x, 4) for x in v['c']] for k, v in d['spine'].items()}
order = [f'C{i}' for i in range(1, 8)] + [f'Th{i}' for i in range(1, 13)] + [f'L{i}' for i in range(1, 6)] + ['S']
js = '// Vygenerováno skriptem tools/make_landmarks_js.py z kostí BodyParts3D – orientační body v souřadnicích aplikace (metry).\n'
js += 'export const LM = ' + json.dumps(L, separators=(',', ':')).replace('],"', '],\n  "').replace('{"', '{\n  "') + ';\n\n'
js += '// Středy obratlů shora dolů.\nexport const SPINE = [\n' + ',\n'.join(f"  ['{k}', {S[k]}]" for k in order) + ',\n];\n'
open(os.path.join(REPO, 'js', 'landmarks.js'), 'w').write(js)
print('js/landmarks.js zapsán')
