# Family Pilot

Plataforma de ferramentas interativas para pais e mães encontrarem orientações práticas no dia a dia.
Um produto do Grupo Semeia Digital. Módulo pronto: **SOS Birra** (R$ 47, pagamento único, acesso por 12 meses).

- `app/` — o app dos pais (PWA, HTML/CSS/JS puros). Veja `app/README.md`.
- `worker/` — API na Cloudflare (Hono + D1): login, pagamento pela Asaas e prazo de acesso.
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

## Publicar na Cloudflare (uma vez)
    npm install
    npx wrangler d1 create family-pilot          # copie o database_id para wrangler.jsonc
    npm run db:remote                            # cria as tabelas
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
- Domínio próprio e ligar o botão da landing à criação de conta (`/?criar=1`).
- Módulos SOS Sono, Telas, Alimentação, Limites, Escola e Adolescência.
- Revisão do conteúdo por profissional de psicologia ou pediatria.
