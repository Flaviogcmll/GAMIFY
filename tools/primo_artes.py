# Prepara as artes do PRIMO novo para o app: recorta o fundo, corta os quadros dos vídeos, reduz e empacota.
# Não é usado pelo app: roda-se à mão quando o dono gera artes novas. Precisa de Python com Pillow e numpy, e do ffmpeg.
# Uso: python3 tools/primo_artes.py <pasta com os originais> <pasta de saída> <pasta temporária para os quadros>
# Depois copie a saída (menos os icon-*.png) para assets/primo/ e os ícones para assets/.
import sys, os, glob, json, subprocess
import numpy as np
from PIL import Image
SRC, OUT, VF = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT + '/acc', exist_ok=True); os.makedirs(OUT + '/cena', exist_ok=True)
META = {'anim': {}, 'acc': {}, 'faces': [], 'faisca': 8}

def key(im):
    """devolve RGBA float (h,w,4) 0..1 com o fundo removido"""
    a = np.asarray(im.convert('RGBA')).astype(np.float32) / 255
    rgb, al = a[..., :3].copy(), a[..., 3]
    if (al < 0.02).mean() > 0.2:  # já veio transparente: firma o alfa e corta o brilho em volta
        hi = np.percentile(al[al > 0.02], 99) if (al > 0.02).any() else 1
        al = np.clip((al / max(hi, 1e-3) - 0.30) / 0.45, 0, 1)
        return np.dstack([rgb, al])
    c = np.median(np.concatenate([rgb[:12, :12].reshape(-1, 3), rgb[:12, -12:].reshape(-1, 3), rgb[-12:, :12].reshape(-1, 3)]), axis=0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    if c[2] > c[1] and c[2] > c[0]:  # fundo azul
        d = b - np.maximum(r, g); bg = c[2] - max(c[0], c[1])
        al = np.clip((bg * 0.55 - d) / (bg * 0.30), 0, 1); m = d > 0; rgb[..., 2] = np.where(m, np.minimum(b, np.maximum(r, g) + 0.02), b)
    else:  # fundo verde (qualquer tom)
        d = g - np.maximum(r, b); bg = c[1] - max(c[0], c[2])
        al = np.clip((bg * 0.55 - d) / (bg * 0.30), 0, 1); m = d > 0; rgb[..., 1] = np.where(m, np.minimum(g, np.maximum(r, b) + 0.02), g)
    return np.dstack([rgb, al])
def bbox(al, thr=0.5):
    ys, xs = np.where(al > thr)
    return (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1) if len(xs) else (0, 0, al.shape[1], al.shape[0])
def toimg(a): return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA')
def clean(a):  # tira ilhas pequenas soltas (sujeira do recorte)
    return a
def save(im, path, q=82): im.save(path, 'WEBP', quality=q, method=6)

# ── 1. animações (vídeos) ──
FR = 224
ANIMS = {'parado': dict(n=16, speed=3), 'feliz': dict(n=16, speed=1), 'dormindo': dict(n=10, speed=4), 'andando': dict(n=8, speed=1, cycle=True), 'comendo': dict(n=16, speed=2)}
ref_h = None
for name, cfg in ANIMS.items():
    d = f'{VF}/{name}'; os.makedirs(d, exist_ok=True)
    if not glob.glob(d + '/*.png'): subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{SRC}/primo-{name}.mp4', '-vf', 'scale=470:470:flags=lanczos', f'{d}/%03d.png'], check=True)
    files = sorted(glob.glob(d + '/*.png')); total = len(files)
    if cfg.get('cycle'):  # acha um ciclo completo do andar olhando só as pernas (metade de baixo do quadro)
        legs = lambda f: (key(Image.open(f).resize((94, 94)))[..., 3] > 0.5)[55:].astype(np.float32)
        m0 = legs(files[0]); start = next((k for k in range(1, 40) if np.abs(legs(files[k]) - m0).mean() > 0.01), 0)  # o vídeo começa parado
        ms = legs(files[start]); curve = [np.abs(legs(files[start + k]) - ms).mean() for k in range(0, 40)]
        peak = max(curve); half = next((k for k in range(4, 38) if curve[k] < peak * 0.5 and curve[k] <= curve[k - 1] and curve[k] <= curve[k + 1]), 10)
        P = 19  # medido no vídeo: a silhueta das pernas repete a cada ~9,5 quadros (meio ciclo); ciclo completo = 19
        idx = [start + round(i * P / cfg['n']) for i in range(cfg['n'])]; cfg['period'] = (start, P)
    else:
        idx = [round(i * (total - 1) / cfg['n']) for i in range(cfg['n'])]
    frames = [key(Image.open(files[i])) for i in idx]
    bbs = [bbox(f[..., 3]) for f in frames]
    x0, y0, x1, y1 = min(b[0] for b in bbs), min(b[1] for b in bbs), max(b[2] for b in bbs), max(b[3] for b in bbs)
    hmed = float(np.median([b[3] - b[1] for b in bbs])); wmed = float(np.median([b[2] - b[0] for b in bbs]))
    if name == 'parado': ref_h, ref_w = hmed, wmed
    # janela quadrada comum: centrada no meio do bicho, com o chão (parte de baixo) alinhado
    side = max(x1 - x0, y1 - y0) + 8; cx = (x0 + x1) / 2; bot = y1 + 4
    scale = 1.0
    if name == 'andando': scale = min(1.35, ref_h / hmed)        # de lado sai menor no vídeo: iguala a altura em pé
    if name == 'dormindo': scale = min(1.3, ref_w * 1.02 / wmed)   # deitado: iguala a largura
    sheet = Image.new('RGBA', (FR * cfg['n'], FR)); cen = []
    for i, f in enumerate(frames):
        L, T = int(round(cx - side / 2)), int(round(bot - side))
        im = toimg(f).crop((L, T, L + side, T + side))
        k = FR / side * scale * (1 if name != 'parado' else 1)
        base_k = FR / (max(ref_w, ref_h) + 40) if ref_h else FR / side
        k = base_k * scale  # mesma escala de pixel em todas as animações (referência: o porco parado)
        w = max(1, int(round(side * k))); im = im.resize((w, w), Image.LANCZOS)
        cell = Image.new('RGBA', (FR, FR)); cell.alpha_composite(im.crop((max(0, (w - FR) // 2), max(0, w - FR), max(0, (w - FR) // 2) + min(w, FR), w)), ((FR - min(w, FR)) // 2, FR - min(w, FR)))
        sheet.alpha_composite(cell, (i * FR, 0))
        al = np.asarray(cell)[..., 3] > 128; ys, xs = np.where(al); cen.append([round(float(xs.mean()), 1), round(float(ys.mean()), 1), int(ys.min()), int(xs.min()), int(xs.max())])
    save(sheet, f'{OUT}/{name}.webp', 84)
    META['anim'][name] = {'n': cfg['n'], 'speed': cfg['speed'], 'cen': cen}
    print('anim', name, 'frames', cfg['n'], 'periodo', cfg.get('period'), 'bbox', (x0, y0, x1, y1), 'escala', round(scale, 2), os.path.getsize(f'{OUT}/{name}.webp') // 1024, 'KB')
META['fr'] = FR

# ── 2. rostos ──
FS = 160
order = ['neutro', 'feliz', 'animado', 'orgulhoso', 'cansado', 'dormindo', 'preocupado', 'bravo', 'surpreso', 'pensativo', 'debochado', 'apaixonado', 'triste', 'festa', 'enjoado', 'suspeito', 'piscada']
sheet = Image.new('RGBA', (FS * len(order), FS)); refmed = None
for i, n in enumerate(order):
    a = key(Image.open(f'{SRC}/rosto-{n}.png').resize((1024, 1024), Image.LANCZOS))
    op = a[..., 3] > 0.9
    med = np.median(a[..., :3][op], axis=0)
    if n == 'neutro': refmed = med
    elif np.abs(med - refmed).max() > 0.05 and n != 'enjoado':  # tom diferente do padrão (ex.: "feliz" saiu mais claro): iguala
        a[..., :3] = np.clip(a[..., :3] * (refmed / np.maximum(med, 1e-3)), 0, 1); print('  cor igualada:', n, np.round(med, 2), '->', np.round(refmed, 2))
    x0, y0, x1, y1 = bbox(a[..., 3]); side = max(x1 - x0, y1 - y0); cx = (x0 + x1) // 2
    L = max(0, min(1024 - side, cx - side // 2)); T = max(0, min(1024 - side, y0))
    im = toimg(a).crop((L, T, L + side, T + side)).resize((FS, FS), Image.LANCZOS)
    sheet.alpha_composite(im, (i * FS, 0))
save(sheet, f'{OUT}/rostos.webp', 86); META['faces'] = order; META['fs'] = FS
print('rostos', os.path.getsize(f'{OUT}/rostos.webp') // 1024, 'KB')

# ── 3. acessórios: duas vistas por arquivo (frente 3/4 à esquerda, lado à direita) ──
for f in sorted(glob.glob(f'{SRC}/acc-*.png')):
    idn = os.path.basename(f)[4:-4]
    a = key(Image.open(f).resize((1024, 1024), Image.LANCZOS)); al = a[..., 3]
    cols = (al > 0.5).sum(axis=0); x0, y0, x1, y1 = bbox(al)
    mid = (x0 + x1) // 2; win = range(int(mid - (x1 - x0) * 0.22), int(mid + (x1 - x0) * 0.22))
    gap = min(win, key=lambda x: (cols[x], abs(x - mid)))  # coluna mais vazia perto do meio = separação das duas vistas
    out = {}
    for tag, (L, Rr) in {'f': (0, gap), 's': (gap, 1024)}.items():
        part = a[:, L:Rr]; bx = bbox(part[..., 3]); im = toimg(part).crop(bx)
        k = 150 / max(im.size); im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        save(im, f'{OUT}/acc/{idn}-{tag}.webp', 84); out[tag] = [im.width, im.height]
    META['acc'][idn] = out
print('acessórios', len(META['acc']), sum(os.path.getsize(x) for x in glob.glob(f'{OUT}/acc/*.webp')) // 1024, 'KB')

# ── 4. cenários ──
for f in sorted(glob.glob(f'{SRC}/cena-*.png')):
    im = Image.open(f).convert('RGB').resize((960, 536), Image.LANCZOS); im.save(f'{OUT}/cena/{os.path.basename(f)[5:-4]}.webp', 'WEBP', quality=78, method=6)
print('cenários', len(glob.glob(f'{OUT}/cena/*.webp')), sum(os.path.getsize(x) for x in glob.glob(f'{OUT}/cena/*.webp')) // 1024, 'KB')

# ── 5. FAÍSCA ──
MS = 128; sheet = Image.new('RGBA', (MS * 8, MS))
for i in range(8):
    a = key(Image.open(f'{SRC}/faisca-{i + 1}.png').resize((1024, 1024), Image.LANCZOS)); x0, y0, x1, y1 = bbox(a[..., 3]); side = max(x1 - x0, y1 - y0) + 10; cx = (x0 + x1) // 2
    L = cx - side // 2; T = y1 + 5 - side
    im = toimg(a).crop((L, T, L + side, T + side)).resize((MS, MS), Image.LANCZOS); sheet.alpha_composite(im, (i * MS, 0))
save(sheet, f'{OUT}/faisca.webp', 86); META['ms'] = MS
print('faísca', os.path.getsize(f'{OUT}/faisca.webp') // 1024, 'KB')

# ── 6. ícone do app ──
ic = Image.open(f'{SRC}/icone-app.png').convert('RGB')
ic.resize((192, 192), Image.LANCZOS).save(f'{OUT}/icon-192.png'); ic.resize((512, 512), Image.LANCZOS).save(f'{OUT}/icon-512.png')
bgc = tuple(int(x) for x in np.median(np.asarray(ic)[:20, :20].reshape(-1, 3), axis=0)); mk = Image.new('RGB', (512, 512), bgc); mk.paste(ic.resize((410, 410), Image.LANCZOS), (51, 51)); mk.save(f'{OUT}/icon-maskable-512.png')
json.dump(META, open(f'{OUT}/primo.json', 'w'), separators=(',', ':'))
tot = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(OUT) for f in fs)
print('TOTAL', tot // 1024, 'KB em', sum(len(fs) for _, _, fs in os.walk(OUT)), 'arquivos')
