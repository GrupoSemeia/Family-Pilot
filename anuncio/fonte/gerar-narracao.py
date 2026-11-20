# Gera os 6 clipes de narração do anúncio SOS Birra com o Gemini (texto para fala).
# Uso: python3 anuncio/fonte/gerar-narracao.py [voz] [clipes...]   ex.: python3 ... Sulafat 1 6
# Chave: GEMINI_API_KEY (ou injetada pelo proxy). Saída: anuncio/narracao/01.wav … 06.wav
import base64, json, os, sys, urllib.request, wave, time
AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, '..', 'narracao')
MODELO = os.environ.get('MODELO', 'gemini-3.1-flash-tts-preview')  # plano grátis: 10 pedidos por dia por modelo
VOZ = sys.argv[1] if len(sys.argv) > 1 else 'Sulafat'
# O modelo lê em voz alta tudo o que vier no texto; a direção vai curta, no formato "Diga de forma ...: frase".
ESTILO = 'com voz de mãe acolhedora'
CLIPES = {
  1: ('um pouco tensa', 'Birra em público. Todo mundo olhando. E agora?'),
  2: ('tranquila', 'Na hora do aperto, tenha um plano à mão.'),
  3: ('pausada', 'No é-esse-ó-esse Birra, escolha a idade... o motivo... e o local.'),
  4: ('clara', 'Veja o que fazer primeiro, o que evitar, e uma frase para usar.'),
  5: ('suave', 'Mais clareza para conduzir esse momento.'),
  6: ('calorosa, em ritmo ágil, sem pausas longas', 'É-esse-ó-esse Birra, Fámili Páilot. Na próxima birra, tenha um plano.'),
}
os.makedirs(SAIDA, exist_ok=True)
quais = [int(x) for x in sys.argv[2:]] or list(CLIPES)
for n in quais:
    direcao, texto = CLIPES[n]
    corpo = {'contents': [{'parts': [{'text': f'Diga {ESTILO}, {direcao}: {texto}'}]}],
             'generationConfig': {'responseModalities': ['AUDIO'],
                                  'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': VOZ}}}}}
    req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{MODELO}:generateContent',
        data=json.dumps(corpo).encode(), headers={'Content-Type': 'application/json',
        'x-goog-api-key': os.environ.get('GEMINI_API_KEY', 'injetada-pelo-proxy')})
    for tentativa in range(2):
        try:
            r = json.load(urllib.request.urlopen(req, timeout=120)); break
        except Exception as e:
            print('erro', n, e); time.sleep(40) if '429' not in str(e) or 'per day' in str(e) else None
    else:
        sys.exit(1)
    dado = r['candidates'][0]['content']['parts'][0]['inlineData']
    audio = base64.b64decode(dado['data'])
    arq = os.path.join(SAIDA, f'{n:02d}.wav')
    if audio[:4] == b'RIFF':  # modelos novos já devolvem WAV pronto
        open(arq, 'wb').write(audio)
    else:  # modelos antigos devolvem PCM 16 bits, 24 kHz, mono
        with wave.open(arq, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(audio)
    with wave.open(arq) as w:
        dur = w.getnframes() / w.getframerate()
    print(f'{n:02d}.wav  {dur:.2f} s  {texto}', flush=True)
    time.sleep(20)  # cota baixa por minuto
