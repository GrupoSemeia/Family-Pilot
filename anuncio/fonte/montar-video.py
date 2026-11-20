# Monta o MP4 final: quadros (renderizar.mjs video) + os 6 clipes de narração (gerar-narracao.py).
# Uso: python3 anuncio/fonte/montar-video.py              →  anuncio/anuncio-sos-birra-9x16.mp4 (ilustrada)
#      ESTILO=fotos python3 anuncio/fonte/montar-video.py →  anuncio/anuncio-sos-birra-fotos-9x16.mp4
import os, subprocess, tempfile, wave
import numpy as np
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(AQUI, '..')
ESTILO = os.environ.get('ESTILO', '')
QUADROS = os.path.join(RAIZ, 'quadros', 'video' + (f'-{ESTILO}' if ESTILO else ''), 'q%04d.jpg')
SAIDA = os.path.join(RAIZ, 'anuncio-sos-birra' + (f'-{ESTILO}' if ESTILO else '') + '-9x16.mp4')
SEGURA_FIM = 1.0  # segundos a mais no cartão final (o clipe 06 é mais longo que a cena)
# clipe: (entra em s, velocidade). Silêncio do começo/fim é cortado; pausas internas ficam com no máx. 0,4 s.
CLIPES = {1: (0.25, 1.10), 2: (4.25, 1.05), 3: (7.20, 1.06), 4: (13.20, 1.07), 5: (18.20, 1.05), 6: (21.40, 1.08)}
PAUSA_MAX, LIMIAR_DB, BORDA = 0.4, -40, 0.03

def limpar(origem, destino):
    """Corta o silêncio do começo/fim e encurta pausas internas para no máx. PAUSA_MAX. Devolve a duração."""
    with wave.open(origem) as w:
        sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)
    jan = int(sr * 0.02); n = len(x) // jan
    db = 20 * np.log10(np.sqrt((x[:n * jan].reshape(n, jan) ** 2).mean(1)) / 32768 + 1e-9)
    voz = db > LIMIAR_DB
    ini, fim = np.argmax(voz), n - np.argmax(voz[::-1])
    partes, k = [], ini
    while k < fim:
        if voz[k]:
            j = k
            while j < fim and voz[j]: j += 1
        else:
            j = k
            while j < fim and not voz[j]: j += 1
            j = min(j, k + int(PAUSA_MAX / 0.02))  # o resto da pausa é pulado
            q = k
            while q < fim and not voz[q]: q += 1
            partes.append(x[k * jan:j * jan]); k = q; continue
        partes.append(x[k * jan:j * jan]); k = j
    b = int(sr * BORDA)
    y = np.concatenate([x[max(0, ini * jan - b):ini * jan]] + partes + [x[fim * jan:fim * jan + b]])
    with wave.open(destino, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(y.astype(np.int16).tobytes())
    return len(y) / sr

tmp = tempfile.mkdtemp()
entradas, filtros, rotulos, durs = [], [], [], {}
for i, (n, (t, vel)) in enumerate(CLIPES.items()):
    limpo = os.path.join(tmp, f'{n:02d}.wav')
    durs[n] = limpar(os.path.join(RAIZ, 'narracao', f'{n:02d}.wav'), limpo) / vel
    entradas += ['-i', limpo]
    filtros.append(f'[{i+1}:a]atempo={vel},aresample=48000,afade=t=in:d=0.02,adelay={int(t*1000)}:all=1[a{n}]')
    rotulos.append(f'[a{n}]')
dur = 25 + SEGURA_FIM
filtros.append(f'{"".join(rotulos)}amix=inputs={len(rotulos)}:normalize=0,'
               f'loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,apad,atrim=0:{dur}[voz]')
filtros.append(f'[0:v]tpad=stop_mode=clone:stop_duration={SEGURA_FIM},format=yuv420p[v]')
cmd = ['ffmpeg', '-hide_banner', '-y', '-framerate', '30', '-i', QUADROS, *entradas,
       '-filter_complex', ';'.join(filtros), '-map', '[v]', '-map', '[voz]',
       '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-r', '30', '-c:a', 'aac', '-b:a', '192k',
       '-t', str(dur), '-movflags', '+faststart', SAIDA]
subprocess.run(cmd, check=True, stderr=subprocess.DEVNULL)
# Onde cada voz começa e termina (para conferir com as cenas)
for n, (t, vel) in CLIPES.items():
    print(f'clipe {n:02d}: {t:5.2f} s → {t + durs[n]:5.2f} s')
print('pronto:', os.path.normpath(SAIDA))
