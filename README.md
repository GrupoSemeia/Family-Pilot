# Family Pilot

Plataforma de ferramentas interativas para pais e mães encontrarem orientações práticas no dia a dia.
Um produto do Grupo Semeia Digital. Endereço: **https://www.familypilot.com.br** (app e página de vendas no mesmo domínio). Sete módulos prontos: **SOS Birra** (R$ 47, pagamento único, 12 meses de acesso) e SOS Sono, Telas, Alimentação, Limites, Escola e Adolescência.

- `app/` — o app dos pais (PWA, HTML/CSS/JS puros). Veja `app/README.md`.
- `worker/` — API na Cloudflare (Hono + D1): login, pagamento pela Asaas e prazo de acesso por módulo.
- `worker/modulos/` — conteúdo dos 6 módulos novos, escrito como dados. O app desenha as ferramentas (`app/js/modulo.js`).
- `app/inicio.html` — página de vendas (HTML único). Quem não está logado vê essa página em `/`; os botões levam a `/entrar?criar=1`.
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

Os preços de lançamento ficam em `wrangler.jsonc`. O preço "de" (riscado, mostrado como "preço de lançamento") vem de `PRECOS_DE` e é o valor que será cobrado depois do lançamento: só deixe valores que você realmente vai praticar. Também em `wrangler.jsonc`: `PRECOS_MODULOS` (em centavos, incluindo a chave `pacote`) e `OFERTA_POS_COMPRA`
(`{"modulo":"sono","preco":2700,"horas":72}`). Produto sem preço aparece como "em breve". O servidor sempre decide o
preço e confere se a pessoa tem direito à oferta. Quem está em `ACESSO_LIVRE` vê todos os módulos.

Para criar um módulo novo: escreva um arquivo em `worker/modulos/` no formato de `tipos.ts`, registre-o em
`worker/modulos/index.ts` (`MODULOS` e `CATALOGO`) e inclua o id em `MODULOS_IDS` (`worker/lib.ts`).
Ferramentas disponíveis: `situacoes`, `rotinaSono`, `combinado`, `ideias`, `modelo`, `registro` e `ajuda`.

## Endereço (www.familypilot.com.br)
O Worker atende `www.familypilot.com.br` como domínio personalizado (`routes` no `wrangler.jsonc`). Para o deploy funcionar,
a zona `familypilot.com.br` precisa estar na mesma conta Cloudflare do Worker (o registro DNS do `www` é criado sozinho; não crie A/CNAME à mão).
`/` mostra a página de vendas para quem não está logado e o app para quem está; `/entrar` sempre abre o app (login e cadastro).
O endereço sem `www` (`familypilot.com.br`) também é atendido pelo Worker e redireciona para o `www` (301 nos GET, 308 nos demais; regra em `worker/dominio.ts`, baseada em `APP_URL`).

## Publicar na Cloudflare (uma vez)
    npm install
    # banco "family-pilot" já criado (id em wrangler.jsonc)
    npm run db:remote                            # migrações novas (0001 a 0005 já estão aplicadas no banco criado)
    npx wrangler secret put ASAAS_API_KEY        # chave da Asaas (teste: $aact_hmlg_… usa o sandbox sozinha)
    npx wrangler secret put ASAAS_WEBHOOK_TOKEN  # texto secreto qualquer; o mesmo vai na Asaas
    npx wrangler secret put RESEND_API_KEY       # chave do Resend, para o "Esqueci minha senha" (veja abaixo)
    npm run deploy

Na Asaas (Integrações → Webhooks): URL `https://www.familypilot.com.br/api/asaas/webhook`, o mesmo token no campo de
autenticação e os eventos de **Cobranças** (confirmada, recebida, estornada/reembolsada, chargeback, removida).
`ACESSO_LIVRE` em `wrangler.jsonc` lista e-mails com acesso grátis (equipe e testadores).

## Termos de Uso e Política de Privacidade
Páginas públicas `/termos` e `/privacidade` (`app/termos.html` e `app/privacidade.html`), com a empresa **Semeia Digital Consultoria em TI LTDA, CNPJ 69.290.380/0001-42**,
contato `gruposemeiadigital@gmail.com`, foro de Curitiba/PR e garantia de 7 dias corridos. São um rascunho: peça a revisão de um advogado antes de divulgar.
O cadastro exige marcar "Li e aceito" e o servidor guarda quando e qual versão (`aceite_em` e `aceite_versao` em `usuarios`; versão em `VERSAO_TERMOS`, `worker/lib.ts`).
Conta nova pelo Google também exige o aceite (o app mostra o aviso e envia `aceite: true`). Ao mudar o texto, atualize a data no HTML e `VERSAO_TERMOS`.
Na tela de consentimento do Google, use `https://www.familypilot.com.br/privacidade` e `https://www.familypilot.com.br/termos`.

## Esqueci minha senha (e-mail pelo Resend)
Link de uso único, válido por 1 hora, no máximo 3 por hora por conta. A resposta é sempre a mesma, exista a conta ou não.
Ao trocar a senha, todas as sessões antigas caem e a pessoa já entra. O token vai no fragmento da URL (`#/nova-senha/...`) e o banco guarda só o hash.
Para ativar: crie a conta no Resend, verifique o domínio de envio, cadastre o segredo `RESEND_API_KEY` e preencha
`EMAIL_DE` (sugestão: `FamilyPilot <nao-responda@familypilot.com.br>`) em `wrangler.jsonc`. `APP_URL` já aponta para `https://www.familypilot.com.br`. Sem isso o app avisa que o recurso não está ativo.

## Entrar com o Google
Botão "Entrar com o Google" na entrada e no cadastro. O navegador recebe um token assinado do Google e o servidor confere
assinatura, emissor, destinatário (nosso Client ID), validade e e-mail verificado (`worker/google.ts`). Conta nova do Google é criada na hora
(sem senha) e depois segue para o pagamento como as demais.
Se já existe conta com esse e-mail: o Google confirma que o e-mail é da pessoa, então as contas se ligam. Se essa conta nunca pagou nada,
a senha antiga é anulada e as sessões caem (protege quem teve o e-mail usado por outra pessoa antes); se já pagou, a senha continua valendo.

Para ativar:
1. No Google Cloud Console, crie um projeto, configure a "Tela de consentimento OAuth" e crie um **ID do cliente OAuth** do tipo **Aplicativo da Web**.
2. Em "Origens JavaScript autorizadas", coloque o endereço do app (`https://www.familypilot.com.br`) e, para testar, `http://localhost:8787`. Não precisa de URI de redirecionamento.
3. O ID do cliente já está em `GOOGLE_CLIENT_ID` no `wrangler.jsonc`. Falta só cadastrar no Google a origem `https://www.familypilot.com.br` (passo 2) e fazer o deploy. Vazio = o botão não aparece. (O Client ID é público, não é segredo.)

## Desenvolver
    npm run db:local && npm run dev    # http://localhost:8787
    npm run test:e2e                   # cadastro → pagamento → acesso → reembolso → renovação
    npm run typecheck

## Falta
- Ativar o e-mail (conta no Resend, domínio verificado, `RESEND_API_KEY` e `EMAIL_DE`).
- Colocar a zona `familypilot.com.br` na conta Cloudflare e fazer o deploy.
- Cadastrar no cliente OAuth do Google a origem `https://www.familypilot.com.br`.
- Revisão do conteúdo de todos os módulos por psicólogo ou pediatra antes do lançamento.
- Revisão jurídica dos Termos de Uso e da Política de Privacidade.
