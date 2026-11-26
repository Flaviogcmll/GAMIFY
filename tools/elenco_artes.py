# Prepara as folhas do ELENCO (uma folha por personagem, poses lado a lado em fundo verde ou magenta) para o app.
# Não é usado pelo app: roda-se à mão quando chegam folhas novas. Precisa de Python com Pillow e numpy.
# Uso: python3 tools/elenco_artes.py <pasta com as folhas .png> assets/elenco
# Cada folha vira assets/elenco/<nome>/<n>.webp (n = 1, 2, 3… da esquerda pra direita, linha por linha) e entra em elenco.json.
# Nunca espelhe as poses: os personagens têm lado fixo (marcas, aba do chapéu etc.).
import sys, os, glob, json, re, unicodedata
import numpy as np
from PIL import Image
SRC, OUT = sys.argv[1], sys.argv[2]

def slug(f):
    n = os.path.basename(f).rsplit('.', 1)[0]
    n = re.sub(r'\b(APROVADOS?|ARPOVADO)\b', '', n, flags=re.I).strip()
    n = unicodedata.normalize('NFKD', n).encode('ascii', 'ignore').decode().lower()
    n = {'lambe': 'lambehomi'}.get(n.strip(), n)
    return re.sub(r'[^a-z0-9]+', '-', n).strip('-')

def key(im):
    """fundo verde ou magenta (pela cor dos cantos) → RGBA float 0..1, com a franja de cor tirada"""
    a = np.asarray(im.convert('RGB')).astype(np.float32) / 255
    rgb = a.copy(); r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    c = np.median(np.concatenate([rgb[:16, :16].reshape(-1, 3), rgb[:16, -16:].reshape(-1, 3), rgb[-16:, :16].reshape(-1, 3), rgb[-16:, -16:].reshape(-1, 3)]), axis=0)
    if c[1] > c[0] and c[1] > c[2]:  # verde
        d = g - np.maximum(r, b); bg = c[1] - max(c[0], c[2])
        rgb[..., 1] = np.where(d > 0, np.minimum(g, np.maximum(r, b) + 0.02), g)
    else:  # magenta: vermelho e azul altos, verde baixo
        d = np.minimum(r, b) - g; bg = min(c[0], c[2]) - c[1]
        spill = np.clip(d - 0.02, 0, None); rgb[..., 0] = r - spill; rgb[..., 2] = b - spill
    al = np.clip((bg * 0.55 - d) / (bg * 0.30), 0, 1)
    return np.dstack([rgb, al])

# quantas poses tem cada folha (linhas × colunas); o resto tem 1 linha de 4
GRADE = {'brasinha': (1, 5), 'cumpadi': (2, 4)}
VALES = {'brasinha'}

def cuts(prof, n, x0, x1):
    """divide [x0, x1) em n partes cortando no vale (menos tinta) perto de cada divisão igual"""
    w = (x1 - x0) / n; k = np.convolve(prof, np.ones(9) / 9, 'same'); out = [x0]
    for i in range(1, n):
        c = int(x0 + i * w); r = int(w * 0.35)
        out.append(c - r + int(np.argmin(k[c - r:c + r])))
    return out + [x1]

def valleys(prof, n, x0, x1):
    """poses de tamanhos diferentes (a BRASINHA crescendo): corta nos n-1 vales mais fundos"""
    k = np.convolve(prof, np.ones(15) / 15, 'same'); sep = (x1 - x0) * 0.06; out = []
    for i in np.argsort(k[x0:x1]) + x0:
        if i - x0 < sep or x1 - i < sep or any(abs(i - o) < sep for o in out): continue
        out.append(int(i))
        if len(out) == n - 1: break
    return [x0] + sorted(out) + [x1]

def extent(m, axis):
    idx = np.where(m.sum(axis) > 2)[0]
    return int(idx[0]), int(idx[-1]) + 1

def poses(a, name):
    al = a[..., 3] > 0.5; nr, nc = GRADE.get(name, (1, 4)); res = []
    y0, y1 = extent(al, 1)
    ycut = cuts(al.sum(1).astype(float), nr, y0, y1) if nr > 1 else [y0, y1]
    for ry0, ry1 in zip(ycut, ycut[1:]):
        band = al[ry0:ry1]; x0, x1 = extent(band, 0)
        xc = (valleys if name in VALES else cuts)(band.sum(0).astype(float), nc, x0, x1)
        for cx0, cx1 in zip(xc, xc[1:]):
            sub = band[:, cx0:cx1]; ys = np.where(sub.sum(1) > 1)[0]; xs = np.where(sub.sum(0) > 1)[0]
            res.append((cx0 + xs[0], ry0 + ys[0], cx0 + xs[-1] + 1, ry0 + ys[-1] + 1))
    return res

PX = 7  # guia de arte (CMD 7 e 10.6): ~7×7 px da folha 2K = 1 pixel de arte. A saída tem 1 pixel por pixel de arte, e o app escala por inteiro com image-rendering: pixelated

def pixelate(a, x0, y0, x1, y1):
    """recorta a pose alinhada à grade de 7 da folha e reduz cada célula 7×7 a 1 pixel: alfa pela maioria, cor pela média do que é opaco"""
    x0, y0 = (x0 // PX) * PX, (y0 // PX) * PX; x1, y1 = -(-x1 // PX) * PX, -(-y1 // PX) * PX
    c = a[y0:y1, x0:x1]; h, w = c.shape[0] // PX, c.shape[1] // PX
    c = c[:h * PX, :w * PX].reshape(h, PX, w, PX, 4)
    al = c[..., 3]; m = al > 0.5
    n = m.sum((1, 3)); rgb = (c[..., :3] * m[..., None]).sum((1, 3)) / np.maximum(n, 1)[..., None]
    out = np.dstack([rgb, (n > PX * PX * 0.45).astype(np.float32)])
    # halo de chroma: pixel de borda (encostado no transparente) puxando pro verde puro sai (CMD 11.1)
    op = out[..., 3] > 0; pad = np.pad(op, 1); edge = op & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    out[..., 3] = np.where(edge & (g - np.maximum(r, b) > 0.18), 0, out[..., 3])
    return dropSlivers(out)

def dropSlivers(out):
    """tira pedacinhos da pose vizinha que entraram pela borda esquerda/direita do recorte (pequenos e encostados na borda)"""
    op = out[..., 3] > 0; h, w = op.shape; lab = np.zeros((h, w), np.int32); n = 0; sizes = {}; touch = {}
    for y0 in range(h):
        for x0 in range(w):
            if not op[y0, x0] or lab[y0, x0]: continue
            n += 1; st = [(y0, x0)]; lab[y0, x0] = n; cnt = 0; tb = False
            while st:
                y, x = st.pop(); cnt += 1; tb = tb or x == 0 or x == w - 1
                for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= yy < h and 0 <= xx < w and op[yy, xx] and not lab[yy, xx]: lab[yy, xx] = n; st.append((yy, xx))
            sizes[n] = cnt; touch[n] = tb
    tot = op.sum()
    for k, c in sizes.items():
        if not touch[k] or c >= tot * 0.03: continue
        xs = np.where((lab == k).any(0))[0]
        if xs.max() < w * 0.15 or xs.min() > w * 0.85: out[..., 3][lab == k] = 0  # só o que fica todo na beirada
    return out

os.makedirs(OUT, exist_ok=True)
meta = {}
for f in sorted(glob.glob(SRC + '/*.png')):
    name = slug(f); a = key(Image.open(f)); d = f'{OUT}/{name}'; os.makedirs(d, exist_ok=True)
    info = []
    for i, (x0, y0, x1, y1) in enumerate(poses(a, name), 1):
        p = 8; px = pixelate(a, max(0, x0 - p), max(0, y0 - p), min(a.shape[1], x1 + p), min(a.shape[0], y1 + p))
        ys, xs = np.where(px[..., 3] > 0); px = px[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        im = Image.fromarray((np.clip(px, 0, 1) * 255 + .5).astype(np.uint8), 'RGBA'); im.save(f'{d}/{i}.webp', 'WEBP', lossless=True, method=6)
        info.append([im.width, im.height])
    meta[name] = info
    print(name, len(info), info)
json.dump(meta, open(OUT + '/elenco.json', 'w'), separators=(',', ':'))
