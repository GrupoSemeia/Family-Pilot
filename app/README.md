# FamilyPilot — app dos pais

PWA estático (HTML + CSS + JS puro, sem build). Funciona offline e se instala na tela inicial do celular.
Os registros ficam só no aparelho (`localStorage`, chave `familypilot.v1`).

## Rodar
    python3 -m http.server 8080 --directory app   # abrir http://localhost:8080

## Estrutura
- `js/data.js` — todo o conteúdo (motivos, locais, frases por idade, gatilhos). Edite aqui para mudar textos.
- `js/app.js` — telas, roteador por hash e armazenamento.
- `sw.js` — cache offline. Troque `V` ao mudar arquivos.

## SOS Birra (pronto)
Plano SOS (idade → motivo → local → o que fazer, evitar, frases, depois), Frase Certa, Pausa de Emergência (60 s),
Radar de Gatilhos (padrões nos registros, sem diagnóstico) e Diário SOS (registro e o que mais ajudou).

## Falta
- **Acesso pago por 12 meses**: hoje o app é aberto. Precisa de login/compra e liberação por prazo (servidor).
- **Demais módulos** (cada um vira um bloco em `data.js` + telas): SOS Sono, Telas, Alimentação, Limites, Escola, Adolescência.
- Revisão do conteúdo por profissional de psicologia/pediatria antes de lançar.
