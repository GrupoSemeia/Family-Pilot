/* Teste de ponta a ponta: sobe uma Asaas falsa, o Worker local (wrangler dev) e percorre cadastro → pagamento → acesso.
   Rodar:  npm run db:local && npm run test:e2e */
import { createServer, request as httpRequest } from 'node:http'
import { execFileSync, spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign as assinar } from 'node:crypto'

const PORTA = 8791, MOCK = 8792, BASE = `http://127.0.0.1:${PORTA}`, TOKEN = 'segredo-teste'
const pagamentos = new Map() // id → { status, value }
let seq = 0
const GOOGLE_ID = 'cid-teste.apps.googleusercontent.com'
const par = generateKeyPairSync('rsa', { modulusLength: 2048 })
const outra = generateKeyPairSync('rsa', { modulusLength: 2048 })   // chave que o Google falso NÃO publica
const b64u = (x) => Buffer.from(x).toString('base64url')
function tokenGoogle(extra = {}, { chave = par.privateKey, kid = 'k' + S, alg = 'RS256' } = {}) {
  const agora = Math.floor(Date.now() / 1000)
  const corpo = { iss: 'https://accounts.google.com', aud: GOOGLE_ID, sub: 'sub-' + S, email: `gente${S}@gmail.com`, email_verified: true, name: 'Gente Boa', iat: agora, exp: agora + 3600, ...extra }
  const h = b64u(JSON.stringify({ alg, kid, typ: 'JWT' })), p = b64u(JSON.stringify(corpo))
  return `${h}.${p}.${alg === 'RS256' ? assinar('RSA-SHA256', Buffer.from(h + '.' + p), chave).toString('base64url') : ''}`
}
const emails = [] // e-mails "enviados" ao Resend falso
const S = Date.now() // e-mails novos a cada execução (o banco local guarda os de antes)

const mock = createServer((req, res) => {
  let corpo = ''; req.on('data', d => (corpo += d)); req.on('end', () => {
    const j = corpo ? JSON.parse(corpo) : {}; const send = (o, s = 200) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)) }
    const u = req.url
    if (req.method === 'GET' && u === '/certs') { res.setHeader?.('cache-control', 'max-age=3600'); return send({ keys: [{ ...par.publicKey.export({ format: 'jwk' }), kid: 'k' + S, alg: 'RS256', use: 'sig' }] }) }
    if (req.method === 'POST' && u === '/emails') { emails.push(j); return send({ id: 'em_' + emails.length }) }
    if (req.method === 'POST' && u === '/customers') return send({ id: 'cus_' + S + '_' + seq++ })
    if (req.method === 'POST' && u.startsWith('/customers/')) return send({ id: u.split('/')[2] })
    if (req.method === 'POST' && u === '/payments') { const id = 'pay_' + S + '_' + ++seq; pagamentos.set(id, { status: 'PENDING', value: j.value }); return send({ id, invoiceUrl: 'https://asaas.test/i/' + id, value: j.value }) }
    if (req.method === 'GET' && u.startsWith('/payments/')) { const p = pagamentos.get(u.split('/')[2]); return p ? send({ id: u.split('/')[2], ...p, billingType: 'PIX' }) : send({}, 404) }
    send({ errors: [{ description: 'rota desconhecida no mock' }] }, 404)
  })
}).listen(MOCK)

const wr = spawn('npx', ['wrangler', 'dev', '--port', String(PORTA), '--var', `ASAAS_URL:http://127.0.0.1:${MOCK}`, '--var', 'ASAAS_API_KEY:chave-teste', '--var', `ASAAS_WEBHOOK_TOKEN:${TOKEN}`, '--var', `ACESSO_LIVRE:super${S}@gmail.com, equipe${S}@teste.com`, '--var', 'DADOS_CHAVE:chave-de-teste-com-mais-de-16-caracteres', '--var', 'APP_URL:https://www.teste.local', '--var', `GOOGLE_CLIENT_ID:${GOOGLE_ID}`, '--var', `GOOGLE_CERTS_URL:http://127.0.0.1:${MOCK}/certs`, '--var', 'RESEND_API_KEY:rk-teste', '--var', 'EMAIL_DE:FamilyPilot <nao-responda@teste.com>', '--var', `RESEND_URL:http://127.0.0.1:${MOCK}`, '--var', 'PRECOS_MODULOS:{"sono":3700,"adolescencia":4700,"pacote":9900}', '--var', 'PRECOS_DE:{"sono":7700,"telas":100}', '--var', 'OFERTA_POS_COMPRA:{"modulo":"sono","preco":2700,"horas":72}'], { stdio: 'pipe', detached: true })
let log = ''; wr.stdout.on('data', d => (log += d)); wr.stderr.on('data', d => (log += d))
const fim = (cod) => { try { process.kill(-wr.pid, 'SIGTERM') } catch { wr.kill('SIGTERM') }; mock.close(); process.exit(cod) }

async function aguardar() { for (let i = 0; i < 120; i++) { try { const r = await fetch(BASE + '/api/nada'); if (r.status === 404) return } catch {} await new Promise(r => setTimeout(r, 500)) } throw new Error('Worker não subiu:\n' + log.slice(-1500)) }

function cliente() {
  let cookie = ''
  const f = async (metodo, url, corpo, extra = {}) => {
    // o wrangler dev às vezes reinicia o Worker logo depois de um "d1 execute"; tenta de novo antes de dar a conexão como perdida
    let r
    for (let t = 0; ; t++) {
      try { r = await fetch(BASE + url, { method: metodo, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...extra }, body: corpo === undefined ? undefined : JSON.stringify(corpo) }); break }
      catch (e) { if (t >= 6) throw e; await new Promise(r => setTimeout(r, 1000)) }
    }
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0]
    return { status: r.status, d: await r.json().catch(() => ({})) }
  }
  f.pagina = async (url) => { const r = await fetch(BASE + url, { headers: cookie ? { cookie } : {}, redirect: 'manual' }); return { status: r.status, texto: await r.text(), cc: r.headers.get('cache-control'), vary: r.headers.get('vary') } }
  return f
}
const webhook = (c, evento, id, status, value) => c('POST', '/api/asaas/webhook', { event: evento, payment: { id, status, value, billingType: 'PIX' } }, { 'asaas-access-token': TOKEN })

try {
  await aguardar()
  const a = cliente()
  assert.equal((await a('GET', '/api/conteudo')).status, 401, 'conteúdo exige login')
  assert.equal((await a('POST', '/api/auth/cadastro', { nome: 'Ana', email: `ana${S}@teste.com`, senha: 'curta', aceite: true })).status, 400, 'senha curta')
  assert.equal((await a('POST', '/api/auth/cadastro', { nome: 'Ana', email: `ana${S}@teste.com`, senha: 'senha-forte-1' })).status, 400, 'sem aceite dos Termos não cria conta')
  let r = await a('POST', '/api/auth/cadastro', { nome: 'Ana', email: `Ana${S}@Teste.com`, senha: 'senha-forte-1', aceite: true })
  assert.equal(r.status, 201); assert.equal(r.d.acesso.ativo, false); assert.equal(r.d.preco, 4700)
  assert.equal((await cliente()('POST', '/api/auth/cadastro', { nome: 'Ana', email: `ana${S}@teste.com`, senha: 'senha-forte-1', aceite: true })).status, 409, 'e-mail repetido')
  assert.equal((await a('GET', '/api/conteudo')).status, 402, 'sem pagar, sem conteúdo')
  assert.equal((await a('POST', '/api/pagamento', { cpfCnpj: '123' })).status, 400, 'CPF inválido')

  r = await a('POST', '/api/pagamento', { cpfCnpj: '529.982.247-25' })
  assert.equal(r.status, 200); assert.match(r.d.url, /asaas\.test\/i\/pay_/)
  const url1 = r.d.url
  assert.equal((await a('POST', '/api/pagamento', { cpfCnpj: '52998224725' })).d.url, url1, 'reaproveita a cobrança em aberto')
  const idPag = url1.split('/').pop()

  assert.equal((await webhook(a, 'PAYMENT_CONFIRMED', idPag, 'CONFIRMED', 47)).status === 401, false)
  assert.equal((await cliente()('POST', '/api/asaas/webhook', { event: 'PAYMENT_CONFIRMED', payment: { id: idPag, status: 'CONFIRMED', value: 47 } })).status, 401, 'webhook sem token')
  // o primeiro webhook acima já confirmou com o valor certo; repetimos para testar idempotência
  r = await a('GET', '/api/auth/eu'); assert.equal(r.d.acesso.ativo, true)
  const ate1 = r.d.acesso.ate
  const dias = (new Date(ate1) - Date.now()) / 864e5
  assert.ok(dias > 364.9 && dias < 365.1, 'acesso de 365 dias, deu ' + dias)
  await webhook(a, 'PAYMENT_RECEIVED', idPag, 'RECEIVED', 47)
  assert.equal((await a('GET', '/api/auth/eu')).d.acesso.ate, ate1, 'webhook repetido não soma de novo')
  r = await a('GET', '/api/conteudo'); assert.equal(r.status, 200); assert.ok(r.d.birra.MOTIVOS.length >= 6)
  assert.equal(Object.keys(r.d.modulos).length, 0, 'só o SOS Birra foi comprado')
  const est = Object.fromEntries(r.d.catalogo.map(m => [m.id, m.estado]))
  assert.deepEqual([est.birra, est.sono, est.telas], ['liberado', 'a-venda', 'em-breve'], 'vitrine: liberado, à venda, em breve')

  // oferta de boas-vindas: aparece logo depois de pagar o SOS Birra, com preço especial para o SOS Sono
  assert.deepEqual([r.d.oferta.modulo, r.d.oferta.preco, r.d.oferta.precoNormal], ['sono', 2700, 3700], 'oferta pós-compra')
  assert.equal(r.d.catalogo.find(m => m.id === 'sono').precoCheio, 7700, 'preço "de" do sono')
  assert.equal(r.d.catalogo.find(m => m.id === 'telas').precoCheio, null, '"de" menor que o preço atual é ignorado')
  const pacote = r.d.catalogo.find(m => m.id === 'pacote')
  assert.deepEqual([pacote.estado, pacote.preco, pacote.desconto, pacote.precoSemDesconto], ['a-venda', 5200, 4700, 9900], 'pacote à venda, abatendo os R$ 47 do SOS Birra já pago')

  // outro módulo: preço vem de PRECOS_MODULOS; sem preço não vende; módulo inexistente é recusado
  assert.equal((await a('POST', '/api/pagamento', { cpfCnpj: '52998224725', modulo: 'telas' })).status, 503, 'módulo sem preço')
  assert.equal((await a('POST', '/api/pagamento', { cpfCnpj: '52998224725', modulo: 'xyz' })).status, 400, 'módulo inexistente')
  assert.equal((await a('POST', '/api/pagamento', { cpfCnpj: '52998224725', modulo: 'adolescencia', oferta: true })).status, 400, 'oferta só vale para o módulo da oferta')
  const idNormal = (await a('POST', '/api/pagamento', { cpfCnpj: '52998224725', modulo: 'sono' })).d.url.split('/').pop()
  assert.equal(pagamentos.get(idNormal).value, 37, 'sem oferta cobra o preço normal')
  const idSono = (await a('POST', '/api/pagamento', { cpfCnpj: '52998224725', modulo: 'sono', oferta: true })).d.url.split('/').pop()
  assert.equal(pagamentos.get(idSono).value, 27, 'com oferta cobra o preço de boas-vindas')
  assert.equal((await a('GET', '/api/conteudo')).d.modulos.sono, undefined, 'sono ainda bloqueado')
  await webhook(a, 'PAYMENT_CONFIRMED', idSono, 'CONFIRMED', 27)
  r = await a('GET', '/api/conteudo')
  assert.ok(r.d.modulos.sono.ferramentas.length >= 5, 'sono liberado depois de pagar')
  assert.equal(r.d.catalogo.find(m => m.id === 'sono').estado, 'liberado')
  assert.equal(r.d.oferta, null, 'a oferta vale uma vez')
  assert.equal((await a('POST', '/api/pagamento', { cpfCnpj: '52998224725', modulo: 'sono', oferta: true })).status, 400, 'oferta não repete')
  const acessoBirra = (await a('GET', '/api/auth/eu')).d.acesso
  assert.equal(acessoBirra.modulos.birra.ate, ate1, 'comprar o sono não mexe no prazo do SOS Birra')

  // reembolso do SOS Birra tira só esse módulo; o sono pago continua
  await webhook(a, 'PAYMENT_REFUNDED', idPag, 'REFUNDED', 47)
  r = await a('GET', '/api/conteudo'); assert.equal(r.status, 200, 'ainda tem o sono')
  assert.equal(r.d.birra, null, 'reembolso tira o SOS Birra')
  await webhook(a, 'PAYMENT_REFUNDED', idSono, 'REFUNDED', 27)
  assert.equal((await a('GET', '/api/auth/eu')).d.acesso.ativo, false, 'sem nenhum módulo, sem acesso')
  assert.equal((await a('GET', '/api/conteudo')).status, 402)

  // valor diferente do pedido é ignorado; "Já paguei" confere na Asaas
  const b = cliente()
  await b('POST', '/api/auth/cadastro', { nome: 'Beto', email: `beto${S}@teste.com`, senha: 'outra-senha-9', aceite: true })
  const idB = (await b('POST', '/api/pagamento', { cpfCnpj: '52998224725' })).d.url.split('/').pop()
  await webhook(b, 'PAYMENT_CONFIRMED', idB, 'CONFIRMED', 1)
  assert.equal((await b('GET', '/api/auth/eu')).d.acesso.ativo, false, 'valor errado não libera')
  assert.equal((await b('POST', '/api/pagamento/verificar')).d.acesso.ativo, false, 'ainda pendente na Asaas')
  pagamentos.get(idB).status = 'RECEIVED'
  assert.equal((await b('POST', '/api/pagamento/verificar')).d.acesso.ativo, true, 'verificar libera quando pago')

  // Pacote Família libera todos os módulos de uma vez
  assert.equal((await b('GET', '/api/conteudo')).d.oferta !== null, true, 'b acabou de pagar o SOS Birra e tem a oferta')
  const idPac = (await b('POST', '/api/pagamento', { cpfCnpj: '52998224725', modulo: 'pacote' })).d.url.split('/').pop()
  assert.equal(pagamentos.get(idPac).value, 52, 'cobra o pacote menos o que já pagou (99 - 47)')
  await webhook(b, 'PAYMENT_CONFIRMED', idPac, 'CONFIRMED', 52)
  r = await b('GET', '/api/conteudo')
  assert.equal(Object.keys(r.d.modulos).length, 6, 'pacote libera os 6 módulos novos')
  assert.ok(r.d.birra, 'e o SOS Birra')
  assert.equal(r.d.catalogo.find(m => m.id === 'pacote').estado, 'liberado')
  assert.equal(r.d.oferta, null, 'com o pacote não há mais oferta')

  // renovação antes de vencer soma 12 meses ao que resta
  const idB2 = (await b('POST', '/api/pagamento', { cpfCnpj: '52998224725' })).d.url.split('/').pop()
  const atual = (await b('GET', '/api/auth/eu')).d.acesso.ate
  await webhook(b, 'PAYMENT_CONFIRMED', idB2, 'CONFIRMED', 47)
  const novo = (await b('GET', '/api/auth/eu')).d.acesso.ate
  const extra = (new Date(novo) - new Date(atual)) / 864e5
  assert.ok(extra > 364.9 && extra < 365.1, 'renovação soma 365 dias, deu ' + extra)

  // quem nunca pagou o SOS Birra não tem oferta
  const cc = cliente(); await cc('POST', '/api/auth/cadastro', { nome: 'Cida', email: `cida${S}@teste.com`, senha: 'terceira-senha-7', aceite: true })
  assert.equal((await cc('POST', '/api/pagamento', { cpfCnpj: '52998224725', modulo: 'sono', oferta: true })).status, 400, 'sem compra do SOS Birra não há oferta')

  // login, senha errada e limite de tentativas
  assert.equal((await cliente()('POST', '/api/auth/entrar', { email: `beto${S}@teste.com`, senha: 'outra-senha-9' })).status, 200)
  for (let i = 0; i < 8; i++) assert.equal((await cliente()('POST', '/api/auth/entrar', { email: `ana${S}@teste.com`, senha: 'errada' + i })).status, 401)
  assert.equal((await cliente()('POST', '/api/auth/entrar', { email: `ana${S}@teste.com`, senha: 'senha-forte-1' })).status, 429, 'bloqueio depois de 8 erros')
  // POST sem JSON é recusado
  const f = await fetch(BASE + '/api/auth/entrar', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'a=b' })
  assert.equal(f.status, 415)
  // esqueci minha senha
  const quem = `beto${S}@teste.com`
  const pedir = async (email) => { const antes = emails.length; const x = await cliente()('POST', '/api/auth/esqueci', { email }); await new Promise(r => setTimeout(r, 400)); return { status: x.status, d: x.d, novos: emails.length - antes } }
  let x = await pedir(`ninguem${S}@teste.com`)
  assert.deepEqual([x.status, x.d.ok, x.novos], [200, true, 0], 'conta inexistente: mesma resposta, nenhum e-mail')
  x = await pedir('isto-nao-e-email'); assert.deepEqual([x.status, x.novos], [200, 0])
  x = await pedir(quem.toUpperCase())
  assert.deepEqual([x.status, x.novos], [200, 1], 'conta existente recebe o e-mail')
  const msg = emails.at(-1)
  assert.deepEqual(msg.to, [quem]); assert.match(msg.from, /nao-responda@teste\.com/)
  const token = /#\/nova-senha\/([\w-]+)/.exec(msg.text)[1]
  assert.ok(msg.html.includes(token), 'o link também está no HTML')
  const rec = cliente()
  assert.equal((await rec('POST', '/api/auth/nova-senha', { token: 'token-invalido', senha: 'nova-senha-123' })).status, 400, 'token inválido')
  assert.equal((await rec('POST', '/api/auth/nova-senha', { token, senha: 'curta' })).status, 400, 'senha curta não gasta o link')
  const sessaoAntiga = await b('GET', '/api/auth/eu'); assert.ok(sessaoAntiga.d.usuario, 'beto ainda logado antes de trocar')
  r = await rec('POST', '/api/auth/nova-senha', { token, senha: 'nova-senha-123' })
  assert.equal(r.status, 200); assert.equal(r.d.usuario.email, quem, 'já entra logado')
  assert.equal((await rec('GET', '/api/conteudo')).status, 200, 'sessão nova funciona')
  assert.equal((await b('GET', '/api/auth/eu')).d.usuario, null, 'sessões antigas foram derrubadas')
  assert.equal((await cliente()('POST', '/api/auth/entrar', { email: quem, senha: 'outra-senha-9' })).status, 401, 'senha antiga não vale')
  assert.equal((await cliente()('POST', '/api/auth/entrar', { email: quem, senha: 'nova-senha-123' })).status, 200, 'senha nova vale')
  assert.equal((await cliente()('POST', '/api/auth/nova-senha', { token, senha: 'outra-nova-456' })).status, 400, 'o link só vale uma vez')
  // link vencido
  await pedir(quem); const tokenVelho = /#\/nova-senha\/([\w-]+)/.exec(emails.at(-1).text)[1]
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'family-pilot', '--local', '--command', `UPDATE senha_resets SET expira_em='2000-01-01 00:00:00' WHERE usuario_id=(SELECT id FROM usuarios WHERE email='${quem}') AND usado_em IS NULL`], { stdio: 'ignore' })
  assert.equal((await cliente()('POST', '/api/auth/nova-senha', { token: tokenVelho, senha: 'outra-nova-456' })).status, 400, 'link vencido')
  // no máximo 3 e-mails por hora por conta
  const antes = emails.length
  for (let i = 0; i < 4; i++) await pedir(quem)
  assert.ok(emails.length - antes <= 2, 'limite de 3 por hora: enviou ' + (emails.length - antes))

  // entrar com o Google
  const g1 = cliente()
  assert.equal((await g1('GET', '/api/auth/eu')).d.googleClientId, GOOGLE_ID, 'o app recebe o Client ID')
  assert.equal((await g1('POST', '/api/auth/google', { credential: tokenGoogle() })).status, 400, 'conta nova do Google sem aceite não é criada')
  r = await g1('POST', '/api/auth/google', { credential: tokenGoogle(), aceite: true })
  assert.equal(r.status, 200); assert.equal(r.d.usuario.email, `gente${S}@gmail.com`); assert.equal(r.d.acesso.ativo, false, 'conta nova do Google ainda sem acesso')
  assert.equal((await g1('GET', '/api/auth/eu')).d.usuario.nome, 'Gente Boa', 'sessão aberta')
  const g2 = cliente(); r = await g2('POST', '/api/auth/google', { credential: tokenGoogle() })
  assert.equal(r.status, 200, 'o mesmo Google entra de novo na mesma conta')
  assert.equal((await g2('POST', '/api/pagamento', { cpfCnpj: '52998224725' })).status, 200, 'conta do Google consegue comprar')
  assert.equal((await cliente()('POST', '/api/auth/entrar', { email: `gente${S}@gmail.com`, senha: 'qualquer-coisa-1' })).status, 401, 'conta só-Google não tem senha para adivinhar')
  const ruins = {
    'público errado': tokenGoogle({ aud: 'outro-app.apps.googleusercontent.com' }),
    'vencido': tokenGoogle({ exp: Math.floor(Date.now() / 1000) - 10 }),
    'e-mail não verificado': tokenGoogle({ email_verified: false }),
    'emissor errado': tokenGoogle({ iss: 'https://evil.example.com' }),
    'assinado por outra chave': tokenGoogle({}, { chave: outra.privateKey }),
    'chave desconhecida (kid)': tokenGoogle({}, { kid: 'k-nao-existe' }),
    'sem assinatura (alg none)': tokenGoogle({}, { alg: 'none' }),
    'lixo': 'abc.def.ghi',
  }
  for (const [nome, t] of Object.entries(ruins)) assert.equal((await cliente()('POST', '/api/auth/google', { credential: t })).status, 401, 'recusa token ' + nome)
  const adulterado = tokenGoogle().split('.'); adulterado[1] = b64u(JSON.stringify({ ...JSON.parse(Buffer.from(adulterado[1], 'base64url')), email: `outra${S}@gmail.com` }))
  assert.equal((await cliente()('POST', '/api/auth/google', { credential: adulterado.join('.') })).status, 401, 'payload adulterado')
  assert.equal((await cliente()('POST', '/api/auth/google', { credential: tokenGoogle({ sub: 'sub-diferente-' + S }) })).status, 409, 'e-mail já ligado a outro Google')

  // conta criada com senha e nunca paga: o Google confirma o e-mail e a senha antiga (de quem criou primeiro) deixa de valer
  const sequestrador = cliente()
  await sequestrador('POST', '/api/auth/cadastro', { nome: 'Intruso', email: `vitima${S}@gmail.com`, senha: 'senha-do-intruso-1', aceite: true })
  r = await cliente()('POST', '/api/auth/google', { credential: tokenGoogle({ sub: 'sub-vitima-' + S, email: `vitima${S}@gmail.com`, name: 'Vítima' }) })
  assert.equal(r.status, 200, 'Google liga à conta com o mesmo e-mail')
  assert.equal((await sequestrador('GET', '/api/auth/eu')).d.usuario, null, 'sessão do intruso foi derrubada')
  assert.equal((await cliente()('POST', '/api/auth/entrar', { email: `vitima${S}@gmail.com`, senha: 'senha-do-intruso-1' })).status, 401, 'senha do intruso não vale mais')
  // conta que já pagou: liga sem mexer na senha
  r = await cliente()('POST', '/api/auth/google', { credential: tokenGoogle({ sub: 'sub-beto-' + S, email: quem }) })
  assert.equal(r.status, 200); assert.equal(r.d.acesso.ativo, true, 'entra na conta paga')
  assert.equal((await cliente()('POST', '/api/auth/entrar', { email: quem, senha: 'nova-senha-123' })).status, 200, 'quem já pagou mantém a senha')

  // endereço único: "/" mostra a página de vendas para quem não está logado e o app para quem está
  let pg = await cliente().pagina('/')
  assert.equal(pg.status, 200); assert.match(pg.texto, /Seu filho faz birra/, 'visitante vê a página de vendas'); assert.doesNotMatch(pg.texto, /id="app"/)
  assert.match(pg.cc, /private/, 'a página inicial não vai para cache compartilhado'); assert.match(pg.vary, /cookie/i)
  assert.match(pg.texto, /\/entrar\?criar=1/, 'botões da página de vendas levam ao cadastro')
  pg = await rec.pagina('/')
  assert.match(pg.texto, /id="app"/, 'logado abre o app'); assert.doesNotMatch(pg.texto, /Seu filho faz birra\. /)
  pg = await cliente().pagina('/entrar'); assert.match(pg.texto, /id="app"/, '/entrar abre o app')
  pg = await cliente().pagina('/inicio'); assert.match(pg.texto, /Seu filho faz birra/, '/inicio é a página de vendas')
  assert.equal((await cliente().pagina('/README.md')).texto.includes('# Family Pilot'), false, 'README não é publicado')
  // Termos de Uso e Política de Privacidade publicados
  pg = await cliente().pagina('/termos'); assert.equal(pg.status, 200)
  assert.match(pg.texto, /69\.290\.380\/0001-42/); assert.match(pg.texto, /7 dias corridos/); assert.match(pg.texto, /Curitiba/)
  pg = await cliente().pagina('/privacidade'); assert.equal(pg.status, 200)
  assert.match(pg.texto, /Semeia Digital Consultoria em TI LTDA/); assert.match(pg.texto, /LGPD/); assert.match(pg.texto, /contato@familypilot\.com\.br/)
  const aceite = JSON.parse(execFileSync('npx', ['wrangler', 'd1', 'execute', 'family-pilot', '--local', '--json', '--command', `SELECT aceite_versao, aceite_em FROM usuarios WHERE email='${quem}'`]).toString())[0].results[0]
  assert.equal(aceite.aceite_versao, '2026-10-16', 'o aceite fica registrado com a versão'); assert.ok(aceite.aceite_em)

  // endereço sem "www" redireciona para o principal (regra isolada em worker/dominio.ts)
  const { redirecionarSemWww } = await import('../worker/dominio.ts')
  const APP = 'https://www.familypilot.com.br'
  assert.deepEqual(redirecionarSemWww(APP, 'https://familypilot.com.br/entrar?criar=1&comprar=pacote', 'GET'), { destino: `${APP}/entrar?criar=1&comprar=pacote`, status: 301 }, 'GET sem www vai para o www')
  assert.deepEqual(redirecionarSemWww(APP, 'https://familypilot.com.br/', 'GET'), { destino: `${APP}/`, status: 301 })
  assert.deepEqual(redirecionarSemWww(APP, 'https://familypilot.com.br/api/asaas/webhook', 'POST'), { destino: `${APP}/api/asaas/webhook`, status: 308 }, 'POST mantém o método (308)')
  for (const [app, url] of [[APP, 'https://www.familypilot.com.br/entrar'], [APP, 'http://127.0.0.1:8787/'], [APP, 'https://outro.com.br/'], ['', 'https://familypilot.com.br/'], ['https://app.exemplo.com.br', 'https://exemplo.com.br/'], ['lixo', 'https://familypilot.com.br/']])
    assert.equal(redirecionarSemWww(app, url, 'GET'), null, 'não redireciona ' + url)

  // e-mail: remetente, escolha do caminho de envio (Resend ou Cloudflare Email Service) e falhas sem derrubar o pedido
  const { remetente, provedorDeEmail, enviarEmail } = await import('../worker/email.ts')
  assert.deepEqual(remetente('FamilyPilot <nao-responda@familypilot.com.br>'), { email: 'nao-responda@familypilot.com.br', name: 'FamilyPilot' })
  assert.deepEqual(remetente('"Família Pilot" <a@b.com.br>'), { email: 'a@b.com.br', name: 'Família Pilot' })
  assert.deepEqual(remetente('<a@b.com.br>'), { email: 'a@b.com.br' })
  assert.deepEqual(remetente(' a@b.com.br '), { email: 'a@b.com.br' })
  const DE = 'FamilyPilot <nao-responda@familypilot.com.br>', enviados = [], binding = { send: async (m) => { enviados.push(m); return { messageId: 'x' } } }
  assert.equal(provedorDeEmail({}), null); assert.equal(provedorDeEmail({ EMAIL: binding }), null, 'sem remetente não envia')
  assert.equal(provedorDeEmail({ EMAIL_DE: DE }), null, 'sem caminho de envio não envia')
  assert.equal(provedorDeEmail({ EMAIL_DE: DE, EMAIL: binding }), 'cloudflare')
  assert.equal(provedorDeEmail({ EMAIL_DE: DE, EMAIL: binding, RESEND_API_KEY: 'k' }), 'resend', 'Resend, se configurado, tem prioridade')
  await enviarEmail({ EMAIL_DE: DE, EMAIL: binding }, { para: 'mae@exemplo.com', assunto: 'Assunto', html: '<p>oi</p>', texto: 'oi' })
  assert.deepEqual(enviados, [{ from: { email: 'nao-responda@familypilot.com.br', name: 'FamilyPilot' }, to: 'mae@exemplo.com', subject: 'Assunto', html: '<p>oi</p>', text: 'oi' }], 'chama env.EMAIL.send com o formato da Cloudflare')
  const quebrado = { send: async () => { const e = new Error('domínio não verificado'); e.code = 'E_SENDER_NOT_VERIFIED'; throw e } }
  await enviarEmail({ EMAIL_DE: DE, EMAIL: quebrado }, { para: 'x@y.com', assunto: 'a', html: 'b', texto: 'c' })   // não pode lançar erro

  // super usuário (ACESSO_LIVRE): todos os módulos, sem prazo e sem pagamento, mas só com o e-mail confirmado
  const adm = cliente(), emailAdm = `super${S}@gmail.com`
  r = await adm('POST', '/api/auth/cadastro', { nome: 'Intruso', email: emailAdm, senha: 'senha-do-intruso-1', aceite: true })
  assert.equal(r.d.acesso.ativo, false, 'quem cria conta com o e-mail da equipe, sem confirmar, não ganha acesso')
  assert.equal(r.d.acesso.livrePendente, true, 'o app explica que falta confirmar o e-mail')
  assert.equal((await adm('GET', '/api/conteudo')).status, 402)
  // o dono entra com o Google (e-mail verificado): a conta é do dono e vira super usuário
  const dono = cliente()
  r = await dono('POST', '/api/auth/google', { credential: tokenGoogle({ sub: 'sub-super-' + S, email: emailAdm, name: 'Grupo Semeia' }) })
  assert.equal(r.status, 200); assert.equal(r.d.acesso.livre, true); assert.equal(r.d.acesso.ativo, true); assert.equal(r.d.acesso.ate, null, 'sem prazo')
  assert.equal(Object.values(r.d.acesso.modulos).filter(m => m.ativo).length, 7, 'os 7 módulos')
  assert.equal((await adm('GET', '/api/auth/eu')).d.usuario, null, 'a sessão do intruso caiu')
  r = await dono('GET', '/api/conteudo')
  assert.equal(r.status, 200); assert.ok(r.d.birra); assert.equal(Object.keys(r.d.modulos).length, 6, 'conteúdo de todos os módulos')
  assert.ok(r.d.catalogo.every(m => m.estado === 'liberado'), 'tudo liberado, inclusive o pacote')
  assert.equal(r.d.oferta, null)
  // outro membro da equipe, com senha: confirma o e-mail pelo "Esqueci minha senha" e então ganha acesso total
  const eq = cliente(), emailEq = `equipe${S}@teste.com`
  r = await eq('POST', '/api/auth/cadastro', { nome: 'Equipe', email: emailEq, senha: 'senha-equipe-1', aceite: true })
  assert.equal(r.d.acesso.ativo, false); assert.equal(r.d.acesso.livrePendente, true)
  await pedir(emailEq); const tokenEq = /#\/nova-senha\/([\w-]+)/.exec(emails.at(-1).text)[1]
  r = await cliente()('POST', '/api/auth/nova-senha', { token: tokenEq, senha: 'senha-equipe-2' })
  assert.equal(r.d.acesso.livre, true, 'depois de confirmar o e-mail pelo link, o acesso da equipe vale')

  // "ver como usuário": o super usuário escolhe os módulos para ver o app como um cliente veria
  assert.equal((await a('POST', '/api/admin/visao', { modulos: ['birra'] })).status, 404, 'quem não é super não tem essa rota')
  assert.equal((await a('GET', '/api/auth/eu')).d.admin, false)
  let eu = (await dono('GET', '/api/auth/eu')).d
  assert.equal(eu.admin, true); assert.equal(eu.visao, null); assert.equal(eu.acesso.livre, true)
  r = await dono('POST', '/api/admin/visao', { modulos: ['sono', 'birra', 'xyz'] })
  assert.deepEqual(r.d.visao, { modulos: ['birra', 'sono'], oferta: false }, 'só ids conhecidos, na ordem do catálogo')
  eu = (await dono('GET', '/api/auth/eu')).d
  assert.equal(eu.acesso.simulado, true); assert.equal(eu.acesso.livre, false); assert.deepEqual(Object.keys(eu.acesso.modulos).sort(), ['birra', 'sono'])
  assert.equal(eu.admin, true, 'continua podendo sair da visão')
  r = await dono('GET', '/api/conteudo')
  assert.ok(r.d.birra); assert.deepEqual(Object.keys(r.d.modulos), ['sono'], 'só o que o cliente simulado teria')
  const est2 = Object.fromEntries(r.d.catalogo.map(m => [m.id, m.estado]))
  assert.deepEqual([est2.birra, est2.sono, est2.telas, est2.adolescencia, est2.pacote], ['liberado', 'liberado', 'em-breve', 'a-venda', 'a-venda'], 'a vitrine aparece como o cliente veria')
  assert.equal(r.d.oferta, null)
  await dono('POST', '/api/admin/visao', { modulos: ['birra'], oferta: true })
  r = await dono('GET', '/api/conteudo')
  assert.deepEqual([r.d.oferta.modulo, r.d.oferta.preco], ['sono', 2700], 'simula a oferta de boas-vindas')
  assert.equal((await dono('POST', '/api/pagamento', { cpfCnpj: '52998224725', modulo: 'sono' })).status, 409, 'no modo "ver como usuário" não há cobrança de verdade')
  await dono('POST', '/api/admin/visao', { modulos: ['sono'] })
  assert.equal((await dono('GET', '/api/conteudo')).d.birra, null, 'sem o SOS Birra na visão')
  await dono('POST', '/api/admin/visao', { modulos: [] })
  assert.equal((await dono('GET', '/api/conteudo')).status, 402, 'cliente sem nenhum módulo não vê conteúdo')
  assert.equal((await dono('GET', '/api/auth/eu')).d.acesso.ativo, false)
  // a visão vale só para a sessão onde foi escolhida
  const dono2 = cliente()
  r = await dono2('POST', '/api/auth/google', { credential: tokenGoogle({ sub: 'sub-super-' + S, email: emailAdm, name: 'Grupo Semeia' }) })
  assert.equal(r.d.acesso.livre, true, 'outra sessão do administrador segue com acesso total')
  await dono('POST', '/api/admin/visao', { modulos: null })
  eu = (await dono('GET', '/api/auth/eu')).d
  assert.equal(eu.visao, null); assert.equal(eu.acesso.livre, true, 'voltou à visão de administrador')
  assert.equal((await dono('POST', '/api/admin/visao', { modulos: 'x' })).status, 400, 'lista inválida')

  // painel do administrador: clientes e pedidos (só leitura, sem CPF nem registros)
  {
    for (const u of ['/api/admin/resumo', '/api/admin/clientes', '/api/admin/pedidos']) assert.equal((await a('GET', u)).status, 404, 'cliente comum não vê o painel: ' + u)
    const rs = await dono('GET', '/api/admin/resumo'); assert.equal(rs.status, 200)
    assert.ok(rs.d.contas.total >= 2 && rs.d.pedidos.pago && rs.d.pedidos.pago.n >= 1, 'resumo conta contas e pedidos pagos')
    const cl = await dono('GET', '/api/admin/clientes'); assert.equal(cl.status, 200); assert.ok(cl.d.clientes.length >= 2)
    const ana = cl.d.clientes.find(x => x.email === `ana${S}@teste.com`); assert.ok(ana, 'lista a cliente'); assert.ok(ana.pedidos >= 1 && typeof ana.pago === "number")
    const busca = await dono('GET', '/api/admin/clientes?busca=' + encodeURIComponent(`ana${S}`)); assert.equal(busca.d.clientes.length, 1, 'busca por e-mail')
    assert.equal((await dono('GET', '/api/admin/clientes?busca=' + encodeURIComponent('%'))).d.clientes.length, 0, 'o % da busca não vale como curinga')
    const pd = await dono('GET', '/api/admin/pedidos?status=pago'); assert.ok(pd.d.pedidos.length >= 1 && pd.d.pedidos.every(x => x.status === 'pago'))
    assert.equal((await dono('GET', '/api/admin/pedidos?status=xx')).status, 400)
    const texto = JSON.stringify([rs.d, cl.d, pd.d]); assert.ok(!/cpf|52998224725|senha|token/i.test(texto), 'o painel não expõe CPF, senha nem token')
  }

  // registros na nuvem (LGPD): cifrados, por conta, com controle de versão, exportação e exclusão
  {
    assert.equal((await cliente()('GET', '/api/dados')).status, 401, 'registros exigem login')
    let r0
    const p = cliente(), q = cliente()
    for (const [c, n] of [[p, 'lgpd'], [q, 'lgpdb']]) assert.equal((await c('POST', '/api/auth/cadastro', { nome: 'Pai ' + n, email: `${n}${S}@teste.com`, senha: 'senha-forte-1', aceite: true })).status, 201)
    r0 = await p('GET', '/api/dados'); assert.equal(r0.status, 403, 'sem a autorização do responsável nada vai para a nuvem'); assert.equal(r0.d.consentimento, false)
    assert.equal((await p('PUT', '/api/dados/birra', { base: 0, dados: { diario: [] } })).status, 403, 'nem salvar')
    assert.equal((await p('POST', '/api/dados/consentimento', { aceite: 'sim' })).status, 400, 'autorização precisa ser explícita')
    assert.equal((await p('GET', '/api/auth/eu')).d.usuario.consentRegistros, null)
    assert.equal((await p('POST', '/api/dados/consentimento', { aceite: true })).status, 200)
    assert.ok((await p('GET', '/api/auth/eu')).d.usuario.consentRegistros, 'a data da autorização fica registrada')
    assert.deepEqual((await p('GET', '/api/dados')).d, { birra: null, modulos: null }, 'conta nova começa vazia')
    const segredo = 'ZEBRA-' + S
    let r = await p('PUT', '/api/dados/birra', { base: 0, dados: { diario: [{ id: 'a1', nota: segredo }], radar: [], idade: '4-5' } })
    assert.equal(r.status, 200); assert.equal(r.d.versao, 1)
    assert.equal((await p('PUT', '/api/dados/birra', { base: 0, dados: { diario: [] } })).status, 409, 'base velha não sobrescreve')
    r = await p('PUT', '/api/dados/birra', { base: 0, dados: { diario: [] } }); assert.equal(r.d.atual.versao, 1); assert.equal(r.d.atual.dados.diario[0].nota, segredo, '409 devolve a versão atual')
    r = await p('PUT', '/api/dados/birra', { base: 1, dados: { diario: [{ id: 'a1', nota: segredo }, { id: 'a2', nota: 'x' }], radar: [] } }); assert.equal(r.d.versao, 2)
    assert.equal((await p('GET', '/api/dados')).d.birra.dados.diario.length, 2, 'abre em qualquer aparelho (mesma conta)')
    assert.equal((await q('GET', '/api/dados')).status, 403, 'quem não autorizou não usa a nuvem')
    await q('POST', '/api/dados/consentimento', { aceite: true }); assert.equal((await q('GET', '/api/dados')).d.birra, null, 'outra conta não vê')
    assert.equal((await p('PUT', '/api/dados/outra', { base: 0, dados: {} })).status, 404, 'tipo desconhecido')
    assert.equal((await p('PUT', '/api/dados/modulos', { base: 0, dados: [1] })).status, 400, 'precisa ser objeto')
    assert.equal((await p('PUT', '/api/dados/modulos', { base: 0, dados: { x: 'a'.repeat(410000) } })).status, 413, 'limite de tamanho')
    const banco = execFileSync('npx', ['wrangler', 'd1', 'execute', 'family-pilot', '--local', '--json', '--command', 'SELECT conteudo FROM dados'], { encoding: 'utf8' })
    assert.ok(banco.includes('"v1.') && !banco.includes(segredo), 'no banco o registro está cifrado')
    const ex = await p('GET', '/api/dados/exportar'); assert.equal(ex.d.conta.email, `lgpd${S}@teste.com`); assert.equal(ex.d.registros.birra.diario.length, 2, 'exportação traz os registros')
    assert.equal((await p('POST', '/api/dados/excluir-conta', { senha: 'errada-errada' })).status, 403, 'excluir conta pede a senha')
    assert.equal((await p('DELETE', '/api/dados')).status, 200); assert.equal((await p('GET', '/api/dados')).d.birra, null, 'registros apagados')
    await p('PUT', '/api/dados/birra', { base: 0, dados: { diario: [{ id: 'w', nota: 'revoga' }] } })
    assert.equal((await p('POST', '/api/dados/consentimento', { aceite: false })).status, 200)
    assert.equal((await p('GET', '/api/dados')).status, 403, 'revogar volta a exigir a autorização'); assert.equal((await p('GET', '/api/auth/eu')).d.usuario.consentRegistros, null)
    await p('POST', '/api/dados/consentimento', { aceite: true }); assert.equal((await p('GET', '/api/dados')).d.birra, null, 'revogar apagou o que estava na nuvem')
    await p('PUT', '/api/dados/birra', { base: 0, dados: { diario: [{ id: 'z', nota: 'y' }] } })
    assert.equal((await p('POST', '/api/dados/excluir-conta', { senha: 'senha-forte-1' })).status, 200)
    assert.equal((await p('GET', '/api/auth/eu')).d.usuario, null, 'sessão encerrada')
    assert.equal((await cliente()('POST', '/api/auth/entrar', { email: `lgpd${S}@teste.com`, senha: 'senha-forte-1' })).status, 401, 'conta excluída não entra')
    const resto = execFileSync('npx', ['wrangler', 'd1', 'execute', 'family-pilot', '--local', '--json', '--command', `SELECT (SELECT COUNT(*) FROM dados WHERE usuario_id IN (SELECT id FROM usuarios WHERE excluido_em IS NOT NULL)) AS d, (SELECT COUNT(*) FROM usuarios WHERE email='lgpd${S}@teste.com') AS u`], { encoding: 'utf8' })
    assert.ok(/"d":\s*0/.test(resto) && /"u":\s*0/.test(resto), 'registros apagados e e-mail anonimizado')
  }

  // diários: campos obrigatórios chegam ao app (o registro vazio não é salvo)
  {
    const cont = (await dono('GET', '/api/conteudo')).d
    const obrig = {}
    for (const [id, m] of Object.entries(cont.modulos)) for (const f of m.ferramentas) if (f.tipo === 'registro') obrig[id] = f.campos.filter(c => c.obrigatorio).map(c => c.id)
    assert.deepEqual(obrig, { sono: ['despertares'], telas: ['conflito'], alimentacao: ['refeicao', 'aceitou'], limites: ['situacao', 'resultado'], escola: ['humor', 'tema'], adolescencia: ['tema', 'resultado'] }, 'campos obrigatórios de cada diário')
  }

  // dica geral da idade escondida onde não combina (Telas: conversa com desconhecidos)
  {
    const cont = (await dono('GET', '/api/conteudo')).d
    const f = cont.modulos.telas.ferramentas.find(x => x.tipo === 'situacoes')
    assert.deepEqual(f.situacoes.filter(x => x.semDicaDaIdade).map(x => x.id), ['conteudo'])
  }

  // Pacote Família com desconto do que já foi pago (nunca abaixo de R$ 10, sem desconto na renovação do pacote)
  {
    const c = cliente()
    await c('POST', '/api/auth/cadastro', { nome: 'Cris', email: `cris${S}@teste.com`, senha: 'senha-forte-1', aceite: true })
    const pagar = async (modulo, valor) => { const id = (await c('POST', '/api/pagamento', { cpfCnpj: '52998224725', modulo })).d.url.split('/').pop(); await webhook(c, 'PAYMENT_CONFIRMED', id, 'CONFIRMED', valor); return id }
    const pac = async () => (await c('GET', '/api/conteudo')).d.catalogo.find(m => m.id === 'pacote')
    await pagar('birra', 47); assert.deepEqual([(await pac()).preco, (await pac()).desconto], [5200, 4700], 'com o SOS Birra: 99 - 47')
    await pagar('sono', 37); assert.deepEqual([(await pac()).preco, (await pac()).desconto], [1500, 8400], 'com Birra e Sono: 99 - 84')
    await pagar('adolescencia', 47); assert.equal((await pac()).preco, 1000, 'nunca abaixo de R$ 10')
    const idP = (await c('POST', '/api/pagamento', { cpfCnpj: '52998224725', modulo: 'pacote' })).d.url.split('/').pop()
    assert.equal(pagamentos.get(idP).value, 10, 'a cobrança do pacote usa o preço com desconto')
    await webhook(c, 'PAYMENT_CONFIRMED', idP, 'CONFIRMED', 10)
    assert.equal((await c('GET', '/api/conteudo')).d.catalogo.find(m => m.id === 'pacote').estado, 'liberado')
    assert.equal((await c('GET', '/api/auth/eu')).d.pacote.preco, 9900, 'com o pacote ativo, renovar custa o preço cheio')
  }

  // Compras e ajuda: histórico da própria conta, continuar pagamento pendente, cobrança vencida gera outra
  {
    assert.equal((await cliente()('GET', '/api/pedidos')).status, 401, 'pedidos exigem login')
    const d = cliente()
    await d('POST', '/api/auth/cadastro', { nome: 'Dani', email: `dani${S}@teste.com`, senha: 'senha-forte-1', aceite: true })
    assert.deepEqual((await d('GET', '/api/pedidos')).d.pedidos, [], 'conta nova sem compras')
    const url1 = (await d('POST', '/api/pagamento', { cpfCnpj: '52998224725', modulo: 'sono' })).d.url
    let lista = (await d('GET', '/api/pedidos')).d.pedidos
    assert.equal(lista.length, 1); assert.deepEqual([lista[0].nome, lista[0].valor, lista[0].status, lista[0].url], ['SOS Sono', 3700, 'pendente', url1], 'pedido pendente pode ser continuado')
    execFileSync('npx', ['wrangler', 'd1', 'execute', 'family-pilot', '--local', '--command', `UPDATE pedidos SET criado_em=datetime('now','-4 days') WHERE usuario_id=(SELECT id FROM usuarios WHERE email='dani${S}@teste.com')`], { stdio: 'ignore' })
    lista = (await d('GET', '/api/pedidos')).d.pedidos; assert.equal(lista[0].url, null, 'pendente vencido não oferece continuar')
    const url2 = (await d('POST', '/api/pagamento', { cpfCnpj: '52998224725', modulo: 'sono' })).d.url
    assert.notEqual(url2, url1, 'cobrança vencida gera uma nova')
    assert.equal((await d('GET', '/api/pedidos')).d.pedidos.length, 2)
    assert.equal((await a('GET', '/api/pedidos')).d.pedidos.every(p => p.nome), true)
    assert.ok(!(await a('GET', '/api/pedidos')).d.pedidos.some(p => JSON.stringify(p).includes('dani')), 'cada conta vê só as próprias compras')
  }

  // logout
  await rec('POST', '/api/auth/sair', {}); assert.equal((await rec('GET', '/api/conteudo')).status, 401)
  console.log('OK: todos os testes passaram'); fim(0)
} catch (e) { console.error('FALHOU:', e.message); console.error((e.stack || '').split('\n').filter(l => l.includes('e2e.mjs')).slice(0, 2).join('\n')); console.error(log.slice(-3000)); fim(1) }
