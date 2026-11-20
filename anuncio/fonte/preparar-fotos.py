"""Amplia as fotos do anúncio 2x (com um leve realce) para o movimento de câmera ficar nítido. Uso: python3 anuncio/fonte/preparar-fotos.py"""
from PIL import Image, ImageFilter
import glob, os
pasta = os.path.join(os.path.dirname(__file__), '..', 'quadros', 'fotos')
for p in glob.glob(os.path.join(pasta, '*.jpg')):
    if p.endswith('-2x.jpg'): continue
    im = Image.open(p).convert('RGB')
    im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2.2, percent=70, threshold=2))
    im.save(p[:-4] + '-2x.jpg', quality=93)
    print('ok', os.path.basename(p))
