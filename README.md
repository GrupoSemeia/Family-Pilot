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

**Pacote com desconto:** quem já tem módulos pagos e ativos paga o pacote menos o que pagou neles (valor do último pedido de cada módulo), nunca menos de R$ 10 nem mais do que custariam os módulos que faltam. Com o pacote ativo (renovação) vale o preço cheio. Cálculo em `precoPacote` (`worker/lib.ts`); o servidor cobra esse valor.

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
    npm run db:remote                            # migrações novas (0001 a 0009 já estão aplicadas no banco criado)
    npx wrangler secret put ASAAS_API_KEY        # chave da Asaas (teste: $aact_hmlg_… usa o sandbox sozinha)
    npx wrangler secret put ASAAS_WEBHOOK_TOKEN  # texto secreto qualquer; o mesmo vai na Asaas
    npx wrangler secret put DADOS_CHAVE          # chave que cifra os registros dos pais (veja "Registros na nuvem")
    npm run deploy

Na Asaas (Integrações → Webhooks): URL `https://www.familypilot.com.br/api/asaas/webhook`, o mesmo token no campo de
autenticação e os eventos de **Cobranças** (confirmada, recebida, estornada/reembolsada, chargeback, removida).
`ACESSO_LIVRE` em `wrangler.jsonc` lista os **super usuários** (hoje `gruposemeiadigital@gmail.com`): veem todos os módulos, sem prazo e sem pagar.
O acesso só vale com o **e-mail confirmado**, para ninguém ganhar acesso criando conta com o e-mail da equipe: entre com o **Google** (que já confirma) ou conclua o **"Esqueci minha senha"**.
Enquanto não confirmar, a pessoa vê um aviso explicando o que fazer (`livrePendente`).

## Registros na nuvem (LGPD)
Diário, radar e ferramentas dos módulos ficam na conta (tabela `dados`, migração 0008) e abrem em qualquer aparelho; o aparelho guarda uma cópia para uso sem internet.
- **Cifrados no servidor:** AES-256-GCM, chave diferente por conta (HKDF do segredo `DADOS_CHAVE` + id da conta), amarrada à conta e ao tipo (`worker/cofre.ts`). Não existe rota de administrador que leia registros.
  **Guarde `DADOS_CHAVE` em lugar seguro e nunca troque: sem ela os registros guardados ficam ilegíveis.** Sem o segredo a API responde 503 e o app segue só no aparelho.
- **Vários aparelhos:** cada bloco (`birra`, `modulos`) tem versão; salvar com versão velha dá 409 e o app junta os dois (`app/js/sync.js`). Apagar vira "lápide" para o item não voltar.
- **Direitos do titular, no próprio app (Módulos → Seus dados):** baixar tudo (`GET /api/dados/exportar`), apagar registros (`DELETE /api/dados`) e excluir a conta (`POST /api/dados/excluir-conta`, pede a senha). A exclusão apaga registros, sessões e dados de cadastro e anonimiza a conta; só ficam compras pagas/reembolsadas e o CPF/CNPJ delas (obrigação fiscal).
- **Consentimento separado (art. 14):** a nuvem só liga depois que o responsável marca a caixa própria (janela que aparece na primeira vez que ele salva algo, ou em Seus dados → "Guardar na minha conta"). Guardamos data e versão (`consent_registros_em/versao`, `VERSAO_CONSENT_REGISTROS` em `worker/lib.ts`; migração 0009). Sem ele a API devolve 403 e os registros ficam só no aparelho. "Revogar e apagar da nuvem" apaga o que está no servidor. Se mudar o texto da caixa (`app/js/sync.js`, função `pedir`), mude também a versão.
- Ao sair da conta, a cópia dos registros é retirada do aparelho (se houver algo sem enviar, o app avisa antes).
- Texto jurídico atualizado em `app/privacidade.html` e `app/termos.html` (versão 2026-10-16, `VERSAO_TERMOS`): revisar com advogado, em especial o consentimento do responsável sobre dados de crianças (art. 14).

### Filhos (apelidos)
Em Módulos → "Meus filhos" a pessoa cadastra um **apelido** por filho (até 6, até 20 letras, sem sobrenome; o app não pede o nome completo). O apelido aparece como "Filho(a)" nos episódios do Diário SOS, no Radar e nos diários dos módulos, e há filtro "Todos | apelidos" (o filho em foco fica só no aparelho). A lista é o bloco `filhos` da sincronização (cifrado na conta, como os demais; `app/js/filhos.js`). Remover um filho não apaga os registros.

### Editar e desfazer
Nos diários (Birra e dos outros módulos) há **Editar** (volta ao formulário com os dados, mantém o mesmo registro e marca `editado`). **Apagar** não pergunta: apaga na hora e mostra "Desfazer" por 9 segundos (o Radar também desfaz). Para o desfazer e a edição valerem entre aparelhos, a junção da sincronização (`juntar` em `app/js/sync.js`) usa o carimbo mais novo de cada item (editado, restaurado ou criado) e só deixa a lápide apagar se for mais nova que o último "restaurado".

### Compras e ajuda (cliente)
Em Módulos → "Compras e ajuda" (`#/ajuda`, `app/js/ajuda.js`; `GET /api/pedidos`): histórico das compras da própria conta, "Continuar o pagamento" para cobrança pendente (vale 3 dias; depois gera outra) e "Já paguei" (confere na Asaas). Traz garantia, reembolso e o botão de suporte por e-mail (`contato@familypilot.com.br`, com o e-mail da conta no texto).

### Combinados e rotina para imprimir
Na Rotina da Noite (SOS Sono) também há "Imprimir ou salvar em PDF". Nos combinados (Telas, Refeição, Regras da Casa, Estudo, Acordo da Família) o botão "Imprimir ou salvar em PDF" monta uma folha só com o combinado, com espaço para assinaturas (`imprimir` em `app/js/modulo.js`, estilos `@media print` em `app/css/app.css`). O "Salvar como PDF" é do próprio diálogo de impressão do aparelho.

### Painel de clientes e pedidos (administrador)
Em Módulos → "Clientes e pedidos" (`#/admin`, `app/js/admin.js`; rotas `GET /api/admin/resumo|clientes|pedidos` em `worker/routes/admin.ts`): resumo de contas e faturamento, lista de clientes (busca por nome/e-mail, módulos ativos, total pago) e pedidos por status.
Só leitura e só para super usuário (os outros recebem 404). **Não mostra CPF/CNPJ nem registros das famílias**; o teste e2e garante isso.

### Ver como usuário (administrador)
Quem está em `ACESSO_LIVRE` (com e-mail confirmado) vê, na aba **Módulos**, o painel "Ver como usuário": escolhe quais módulos simular, se quer ver a oferta de boas-vindas, e o app passa a se comportar como para um cliente (catálogo, cadeados, tela de pagamento).
A escolha fica só na sessão atual (`sessoes.ver_como`, migração 0007); uma faixa no topo traz o botão "Voltar à minha visão". Nesse modo os pagamentos ficam bloqueados (409). Rotas em `worker/routes/admin.ts`; quem não é super usuário recebe 404.

## Termos de Uso e Política de Privacidade
Páginas públicas `/termos` e `/privacidade` (`app/termos.html` e `app/privacidade.html`), com a empresa **Semeia Digital Consultoria em TI LTDA, CNPJ 69.290.380/0001-42**,
contato `contato@familypilot.com.br`, foro de Curitiba/PR e garantia de 7 dias corridos. São um rascunho: peça a revisão de um advogado antes de divulgar.
O cadastro exige marcar "Li e aceito" e o servidor guarda quando e qual versão (`aceite_em` e `aceite_versao` em `usuarios`; versão em `VERSAO_TERMOS`, `worker/lib.ts`).
Conta nova pelo Google também exige o aceite (o app mostra o aviso e envia `aceite: true`). Ao mudar o texto, atualize a data no HTML e `VERSAO_TERMOS`.
Na tela de consentimento do Google, use `https://www.familypilot.com.br/privacidade` e `https://www.familypilot.com.br/termos`.

## Esqueci minha senha (e-mail)
Link de uso único, válido por 1 hora, no máximo 3 por hora por conta. A resposta é sempre a mesma, exista a conta ou não.
Ao trocar a senha, todas as sessões antigas caem e a pessoa já entra. O token vai no fragmento da URL (`#/nova-senha/...`) e o banco guarda só o hash.

**Envio pelo Cloudflare Email Service** (padrão, sem chave de API; exige o plano Workers Paid, com 3.000 e-mails por mês incluídos). Em `wrangler.jsonc` já há o binding `send_email` (`EMAIL`) e o remetente `EMAIL_DE`
(`FamilyPilot <nao-responda@familypilot.com.br>`). Para ativar, no painel da Cloudflare: **Computação → Email Service → Email Sending → Onboard Domain** e escolha `familypilot.com.br`
(a Cloudflare cria os registros SPF, DKIM e DMARC sozinha, na área `cf-bounce` do domínio). O serviço está em beta e contas novas começam com limite diário baixo.

**Alternativa: Resend.** Se existir o segredo `RESEND_API_KEY`, o app usa o Resend no lugar da Cloudflare (verifique o domínio lá e use o mesmo `EMAIL_DE`).
Sem nenhum dos dois, a tela de "Esqueci minha senha" avisa que a recuperação por e-mail não está ativa. Falhas de envio vão para o log (Observability), com o código do erro (ex.: `E_SENDER_NOT_VERIFIED`).

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

## Documento para o revisor de conteúdo
`docs/revisao-de-conteudo.docx`: todo o texto dos 7 módulos, numerado (ex.: SONO-014), com coluna de parecer para o psicólogo ou pediatra. Para atualizar depois de mudar os textos: `sh scripts/revisao/gerar.sh` (precisa de `python-docx`).

## Desenvolver
    npm run db:local && npm run dev    # http://localhost:8787
    npm run test:e2e                   # cadastro → pagamento → acesso → reembolso → renovação
    npm run typecheck

## Falta
- Ativar o e-mail: Workers Paid e **Onboard Domain** do `familypilot.com.br` no Email Sending da Cloudflare.
- Colocar a zona `familypilot.com.br` na conta Cloudflare e fazer o deploy.
- Cadastrar no cliente OAuth do Google a origem `https://www.familypilot.com.br`.
- Revisão do conteúdo de todos os módulos por psicólogo ou pediatra antes do lançamento.
- Revisão jurídica dos Termos de Uso e da Política de Privacidade.
