# Prepara as imagens do topo das abas e as poses novas do PRIMO (v5.14). Não é usado pelo app: roda-se à mão.
# Uso: python3 tools/topo_artes.py <pasta com os originais do Higgsfield> <pasta do app (raiz do repositório)>
#  topo-<aba>-<dia|noite>.png  →  assets/topo/<aba>-<dia|noite>.webp   (1600 px de largura)
#  topo-ref.png                →  é o topo do SURVIVAL de dia (o primeiro gerado, usado como referência de estilo)
#  primo-<pose>.png (fundo verde) → assets/primo/pose-<pose>.webp  (quadro de 224 px, mesmo tamanho do porquinho parado)
import sys, os, glob
import numpy as np
from PIL import Image
SRC, APP = sys.argv[1:3]

def key(im):
    """tira o fundo verde liso (o mesmo recorte de tools/primo_artes.py): devolve RGBA float 0..1"""
    a = np.asarray(im.convert('RGBA')).astype(np.float32) / 255
    rgb = a[..., :3].copy()
    c = np.median(np.concatenate([rgb[:12, :12].reshape(-1, 3), rgb[:12, -12:].reshape(-1, 3), rgb[-12:, :12].reshape(-1, 3)]), axis=0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    d = g - np.maximum(r, b); bg = c[1] - max(c[0], c[2])
    al = np.clip((bg * 0.55 - d) / (bg * 0.30), 0, 1); rgb[..., 1] = np.where(d > 0, np.minimum(g, np.maximum(r, b) + 0.02), g)
    return np.dstack([rgb, al])
def bbox(al, thr=0.5):
    ys, xs = np.where(al > thr)
    return (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
def toimg(a): return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA')
def save(im, path, q=82): im.save(path, 'WEBP', quality=q, method=6)

os.makedirs(f'{APP}/assets/topo', exist_ok=True)
for f in sorted(glob.glob(f'{SRC}/topo-*.png')):
    name = os.path.basename(f)[5:-4]
    if name == 'ref': name = 'survival-dia'
    im = Image.open(f).convert('RGB')
    im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    save(im, f'{APP}/assets/topo/{name}.webp', q=78)
    print('topo', name, im.size)

FR = 224
for f in sorted(glob.glob(f'{SRC}/primo-*.png')):
    name = os.path.basename(f)[6:-4]
    a = key(Image.open(f).resize((470, 470), Image.LANCZOS))
    x0, y0, x1, y1 = bbox(a[..., 3])
    pig = toimg(a[y0:y1, x0:x1])
    # o porquinho parado ocupa ~156 px de altura e ~200 de largura no quadro de 224: a pose cabe nessa caixa, com o chão embaixo
    k = min(200 / pig.width, 165 / pig.height)
    pig = pig.resize((max(1, round(pig.width * k)), max(1, round(pig.height * k))), Image.LANCZOS)
    fr = Image.new('RGBA', (FR, FR), (0, 0, 0, 0))
    fr.paste(pig, ((FR - pig.width) // 2, 212 - pig.height), pig)
    save(fr, f'{APP}/assets/primo/pose-{name}.webp', q=85)
    print('pose', name, pig.size)
