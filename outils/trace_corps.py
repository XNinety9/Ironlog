# Vectorise le schéma de référence en zones musculaires cliquables.
# Usage : python trace_corps.py src/lib/body/geo.json image_reference.png   (ou maquette/body-geo.js)  (nécessite pillow, numpy, scipy et potrace)
import json, re, subprocess, sys, numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as nd
S = 3
im = Image.open(sys.argv[2]).convert('RGB')
im = im.resize((im.width*S, im.height*S), Image.LANCZOS)
a = np.asarray(im).astype(float)
line = (255 - np.minimum(a[...,1], a[...,2])) > 110
H, W = line.shape

# Traits de fermeture invisibles (coordonnées absolues, échelle x3)
CLOSE = [
  # face : pecs séparés du cou, du sternum et des deltoïdes
  [(395,490),(625,490)], [(487,488),(487,512)], [(535,488),(535,512)],
  [(384,484),(380,462)], [(639,486),(643,460)],
  # face : séparation haut / bas des pecs
  [(305,585),(492,562)], [(530,562),(728,592)],
  # face : bas du droit fémoral
  [(368,1462),(442,1480)], [(583,1477),(657,1460)],
  # dos : tête / trapèzes
  [(1585,300),(1775,300)],
  # dos : pointe des dorsaux jusqu'à la colonne + trou de la colonne
  [(1640,770),(1716,770)], [(1678,965),(1678,1052)],
  # dos : fessiers
  [(1660,1024),(1678,1034),(1696,1024)], [(1502,1074),(1470,1082)], [(1856,1074),(1890,1082)],
  # dos : poignets, chevilles
  [(1272,1060),(1352,1078)], [(1992,1078),(2078,1066)],
  [(1505,1935),(1620,1935)], [(1740,1935),(1860,1935)],
]
cl = Image.new('1', (W, H), 0); d = ImageDraw.Draw(cl)
for pts in CLOSE: d.line(pts, fill=1, width=7)
closed = line | np.asarray(cl, bool)

free = ~nd.binary_dilation(closed, iterations=2)
lab, n = nd.label(free)
border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:,0], lab[:,-1]])))
sizes = nd.sum(np.ones_like(lab), lab, range(n+1))
keep = [i for i in range(1, n+1) if i not in border and sizes[i] > 150]

PROBES = {
 'pec-haut': [(400,530),(620,530)], 'pec-bas': [(420,620),(600,620)],
 'delt-ant': [(305,525),(715,525)], 'delt-lat': [(240,550),(790,550)],
 'biceps': [(270,710),(760,710)], 'triceps': [(205,720),(815,720),(1440,690),(1900,690),(1390,770),(1975,770)],
 'avantbras': [(250,840),(775,830),(190,890),(230,925),(155,930),(205,1015),(800,925),(840,895),(870,925),(815,1015),(1430,825),(1935,825),(1340,950),(2030,950),(1388,951),(1968,951),(2048,1004),(1308,1001)],
 'trapezes': [(385,440),(620,440),(1600,450),(1760,450)],
 'grand-droit': [(465,725),(560,720),(465,790),(560,795),(465,870),(560,870),(480,995),(545,995)],
 'obliques': [(335,700),(375,750),(375,800),(375,860),(375,930),(690,700),(650,750),(655,800),(650,860),(655,930)],
 'adducteurs': [(475,1195),(550,1195),(430,1095),(595,1095),(430,1190),(595,1190),(1640,1260),(1715,1260)],
 'moyen-fessier': [(340,1095),(690,1095),(1540,990),(1815,990)],
 'vaste-ext': [(340,1340),(690,1340),(1475,1310),(1880,1310)],
 'vaste-int': [(450,1400),(585,1400)],
 'droit-femoral': [(390,1300),(630,1300)],
 'tibial': [(380,1700),(655,1700)],
 'gastrocnemien': [(455,1665),(590,1665),(1530,1635),(1600,1645),(1775,1645),(1845,1635)],
 'soleaire': [(440,1755),(595,1755),(1575,1890),(1800,1890),(1529,1854),(1827,1855),(1765,1903),(1591,1901)],
 'delt-post': [(1445,530),(1925,530)],
 'grand-rond': [(1545,577),(1820,577),(1505,622),(1860,622)],
 'grand-dorsal': [(1565,760),(1800,760)],
 'lombaires': [(1620,880),(1740,880)],
 'grand-fessier': [(1580,1100),(1780,1100)],
 'biceps-femoral': [(1525,1350),(1830,1350)],
 'semi-tendineux': [(1580,1350),(1630,1435),(1780,1350),(1745,1435)],
}
reg2zone = {}
for z, pts in PROBES.items():
    for (x,y) in pts:
        r = lab[y,x]
        if r == 0:
            ys, xs = np.nonzero(np.isin(lab[y-15:y+16, x-15:x+16], keep))
            if len(ys):
                k = np.argmin((ys-15)**2 + (xs-15)**2); r = lab[y-15+ys[k], x-15+xs[k]]
        if r == 0 or r in border: print('MISS', z, (x,y), 'on line' if r == 0 else 'outside'); continue
        if r in reg2zone and reg2zone[r] != z: print('CLASH', z, reg2zone[r], (x,y))
        reg2zone[r] = z

coms = nd.center_of_mass(np.ones_like(lab), lab, keep)
for r, (cy, cx) in zip(keep, coms):
    if r not in reg2zone and sizes[r] > 400: print('FREE', r, int(cx), int(cy), int(sizes[r]))
# debug : zones colorées
pal = {}
rng = np.random.default_rng(3)
arr = np.full((H,W,3), 255, np.uint8)
inside = np.isin(lab, keep) | closed
arr[np.isin(lab, keep)] = (235,235,235)
for r, z in reg2zone.items():
    pal.setdefault(z, rng.integers(60, 220, 3)); arr[lab==r] = pal[z]
arr[line] = (0,0,0)
arr[np.asarray(cl,bool) & ~line] = (255,0,0)
dbg = Image.fromarray(arr); dd = ImageDraw.Draw(dbg); F = ImageFont.load_default(size=22)
for z, pts in PROBES.items():
    for (x,y) in pts: dd.text((x-20,y-10), z[:8], fill=(0,0,0), font=F)
dbg.resize((W//2, H//2)).save('/tmp/ironlog-trace-zones.png')

# ---- tracé ----
def trace(mask, x0, x1):
    sub = mask[:, x0:x1]
    img = Image.fromarray((~sub).astype(np.uint8)*255).convert('1')
    img.save('/tmp/ironlog-trace-tmp.pbm')
    out = subprocess.run(['potrace','/tmp/ironlog-trace-tmp.pbm','-s','--flat','-u','1','-t','4','-O','0.4','-o','-'], capture_output=True, text=True).stdout
    return ' '.join(re.findall(r'<path d="([^"]+)"', out, re.S)).replace('\n',' ')

FIGS = {'front': (0, 1140), 'back': (1140, W)}
geo = {}
body = np.isin(lab, keep) | (closed & nd.binary_dilation(np.isin(lab, keep), iterations=6))
body = nd.binary_fill_holes(body | line)
for name, (x0, x1) in FIGS.items():
    ys, xs = np.nonzero(body[:, x0:x1])
    g = {'bbox': [int(xs.min()), int(ys.min()), int(xs.max()-xs.min()+1), int(ys.max()-ys.min()+1)], 'h': H, 'sil': trace(body, x0, x1), 'line': trace(line, x0, x1), 'zones': {}}
    for z in PROBES:
        m = np.zeros_like(line)
        for r, zz in reg2zone.items():
            if zz == z: m |= (lab == r)
        m = nd.binary_dilation(m, iterations=7) & body
        if m[:, x0:x1].any(): g['zones'][z] = trace(m, x0, x1)
    geo[name] = g
payload = json.dumps(geo, separators=(',',':'))
if sys.argv[1].endswith('.json'):
    open(sys.argv[1],'w').write(payload)
else:
    open(sys.argv[1],'w').write('// Généré par outils/trace_corps.py : ne pas éditer à la main.\nconst GEO = ' + payload + ';\n')
print({k: (len(v['sil']), len(v['line']), sum(len(s) for s in v['zones'].values())) for k,v in geo.items()})
