# Family Pilot

Plataforma de ferramentas interativas para pais e mães encontrarem orientações práticas no dia a dia.
Um produto do Grupo Semeia Digital. Sete módulos prontos: **SOS Birra** (R$ 47, pagamento único, 12 meses de acesso) e SOS Sono, Telas, Alimentação, Limites, Escola e Adolescência.

- `app/` — o app dos pais (PWA, HTML/CSS/JS puros). Veja `app/README.md`.
- `worker/` — API na Cloudflare (Hono + D1): login, pagamento pela Asaas e prazo de acesso por módulo.
- `worker/modulos/` — conteúdo dos 6 módulos novos, escrito como dados. O app desenha as ferramentas (`app/js/modulo.js`).
- `landing/sos-birra/` — landing page de vendas (HTML único).
- `migrations/` — banco D1. `test/e2e.mjs` — teste de ponta a ponta com uma Asaas falsa.

## Como funciona o acesso
1. A pessoa cria a conta (e-mail e senha; senha com PBKDF2, sessão em cookie HttpOnly).
2. Informa CPF/CNPJ e é levada à página de pagamento da Asaas (Pix, boleto ou cartão). Cobrança única de R$ 47.
3. O webhook da Asaas (ou o botão "Já paguei", que confere na Asaas) confirma o pagamento e libera **12 meses**
   a partir da confirmação. Se renovar antes de vencer, os 12 meses somam ao que restava.
4. Reembolso (garantia de 7 dias) ou chargeback na Asaas tira o acesso daquele pedido.
5. O conteúdo (`worker/conteudo.ts`) só é entregue por `GET /api/conteudo` a quem tem acesso ativo.
   Os registros do Diário e do Radar ficam só no aparelho de cada pessoa.

## Módulos e preços
Cada módulo tem acesso próprio de 12 meses (tabela `pedidos`, coluna `modulo`), em pagamento único:

| Produto | Preço |
|---|---|
| SOS Birra | R$ 47 |
| SOS Sono, Telas, Alimentação, Limites, Escola | R$ 37 cada |
| SOS Adolescência | R$ 47 |
| **Pacote Família** (todos os 7 módulos) | R$ 147 (separados somam R$ 279) |
| Oferta de boas-vindas: SOS Sono logo depois de pagar o SOS Birra | R$ 27, por 72 horas, uma vez |

Os preços ficam em `wrangler.jsonc`: `PRECOS_MODULOS` (em centavos, incluindo a chave `pacote`) e `OFERTA_POS_COMPRA`
(`{"modulo":"sono","preco":2700,"horas":72}`). Produto sem preço aparece como "em breve". O servidor sempre decide o
preço e confere se a pessoa tem direito à oferta. Quem está em `ACESSO_LIVRE` vê todos os módulos.

Para criar um módulo novo: escreva um arquivo em `worker/modulos/` no formato de `tipos.ts`, registre-o em
`worker/modulos/index.ts` (`MODULOS` e `CATALOGO`) e inclua o id em `MODULOS_IDS` (`worker/lib.ts`).
Ferramentas disponíveis: `situacoes`, `rotinaSono`, `combinado`, `ideias`, `modelo`, `registro` e `ajuda`.

## Publicar na Cloudflare (uma vez)
    npm install
    # banco "family-pilot" já criado (id em wrangler.jsonc)
    npm run db:remote                            # migrações novas (0001 e 0002 já estão aplicadas no banco criado)
    npx wrangler secret put ASAAS_API_KEY        # chave da Asaas (teste: $aact_hmlg_… usa o sandbox sozinha)
    npx wrangler secret put ASAAS_WEBHOOK_TOKEN  # texto secreto qualquer; o mesmo vai na Asaas
    npm run deploy

Na Asaas (Integrações → Webhooks): URL `https://SEU-DOMINIO/api/asaas/webhook`, o mesmo token no campo de
autenticação e os eventos de **Cobranças** (confirmada, recebida, estornada/reembolsada, chargeback, removida).
`ACESSO_LIVRE` em `wrangler.jsonc` lista e-mails com acesso grátis (equipe e testadores).

## Desenvolver
    npm run db:local && npm run dev    # http://localhost:8787
    npm run test:e2e                   # cadastro → pagamento → acesso → reembolso → renovação
    npm run typecheck

## Falta
- Esqueci minha senha (precisa de envio de e-mail, por exemplo Resend como no AroCerto).
- Domínio próprio. Depois, preencher `APP_URL` no fim da landing: os botões passam a levar à criação de conta (`/?criar=1`; o do pacote usa `&comprar=pacote`).
- Revisão do conteúdo de todos os módulos por psicólogo ou pediatra antes do lançamento.
