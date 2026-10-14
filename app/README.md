# FamilyPilot — app dos pais

PWA (HTML + CSS + JS puro, sem build). Funciona offline e se instala na tela inicial do celular.
Exige conta e acesso ativo: `js/auth.js` faz login e pagamento e só então busca o conteúdo no servidor.
Os registros ficam só no aparelho (`localStorage`, uma chave por conta).

## Rodar
Use o Worker (veja o README da raiz): `npm run dev`.

## Estrutura
- `../worker/conteudo.ts` — todo o conteúdo (motivos, locais, frases por idade, gatilhos). Edite lá para mudar textos.
- `js/auth.js` — login, cadastro, pagamento e liberação do conteúdo.
- `js/app.js` — telas, roteador por hash e armazenamento.
- `sw.js` — cache offline do app (a API nunca passa pelo cache). Troque `V` ao mudar arquivos.

## SOS Birra (pronto)
Plano SOS (idade → motivo → local → o que fazer, evitar, frases, depois), Frase Certa, Pausa de Emergência (60 s),
Radar de Gatilhos (padrões nos registros, sem diagnóstico) e Diário SOS (registro e o que mais ajudou).
