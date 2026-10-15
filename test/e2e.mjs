/* Teste de ponta a ponta: sobe uma Asaas falsa, o Worker local (wrangler dev) e percorre cadastro → pagamento → acesso.
   Rodar:  npm run db:local && npm run test:e2e */
import { createServer } from 'node:http'
import { spawn, execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'

const PORTA = 8791, MOCK = 8792, BASE = `http://127.0.0.1:${PORTA}`, TOKEN = 'segredo-teste'
const pagamentos = new Map() // id → { status, value }
let seq = 0
const emails = [] // e-mails "enviados" ao Resend falso
const S = Date.now() // e-mails novos a cada execução (o banco local guarda os de antes)

const mock = createServer((req, res) => {
  let corpo = ''; req.on('data', d => (corpo += d)); req.on('end', () => {
    const j = corpo ? JSON.parse(corpo) : {}; const send = (o, s = 200) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)) }
    const u = req.url
    if (req.method === 'POST' && u === '/emails') { emails.push(j); return send({ id: 'em_' + emails.length }) }
    if (req.method === 'POST' && u === '/customers') return send({ id: 'cus_' + S + '_' + seq++ })
    if (req.method === 'POST' && u.startsWith('/customers/')) return send({ id: u.split('/')[2] })
    if (req.method === 'POST' && u === '/payments') { const id = 'pay_' + S + '_' + ++seq; pagamentos.set(id, { status: 'PENDING', value: j.value }); return send({ id, invoiceUrl: 'https://asaas.test/i/' + id, value: j.value }) }
    if (req.method === 'GET' && u.startsWith('/payments/')) { const p = pagamentos.get(u.split('/')[2]); return p ? send({ id: u.split('/')[2], ...p, billingType: 'PIX' }) : send({}, 404) }
    send({ errors: [{ description: 'rota desconhecida no mock' }] }, 404)
  })
}).listen(MOCK)

const wr = spawn('npx', ['wrangler', 'dev', '--port', String(PORTA), '--var', `ASAAS_URL:http://127.0.0.1:${MOCK}`, '--var', 'ASAAS_API_KEY:chave-teste', '--var', `ASAAS_WEBHOOK_TOKEN:${TOKEN}`, '--var', 'ACESSO_LIVRE:', '--var', 'RESEND_API_KEY:rk-teste', '--var', 'EMAIL_DE:FamilyPilot <nao-responda@teste.com>', '--var', `RESEND_URL:http://127.0.0.1:${MOCK}`, '--var', 'PRECOS_MODULOS:{"sono":3700,"adolescencia":4700,"pacote":9900}', '--var', 'PRECOS_DE:{"sono":7700,"telas":100}', '--var', 'OFERTA_POS_COMPRA:{"modulo":"sono","preco":2700,"horas":72}'], { stdio: 'pipe' })
let log = ''; wr.stdout.on('data', d => (log += d)); wr.stderr.on('data', d => (log += d))
const fim = (cod) => {  wr.kill('SIGTERM'); mock.close(); process.exit(cod) }

async function aguardar() { for (let i = 0; i < 120; i++) { try { const r = await fetch(BASE + '/api/nada'); if (r.status === 404) return } catch {} await new Promise(r => setTimeout(r, 500)) } throw new Error('Worker não subiu:\n' + log.slice(-1500)) }

function cliente() {
  let cookie = ''
  return async (metodo, url, corpo, extra = {}) => {
    const r = await fetch(BASE + url, { method: metodo, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...extra }, body: corpo === undefined ? undefined : JSON.stringify(corpo) })
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0]
    return { status: r.status, d: await r.json().catch(() => ({})) }
  }
}
const webhook = (c, evento, id, status, value) => c('POST', '/api/asaas/webhook', { event: evento, payment: { id, status, value, billingType: 'PIX' } }, { 'asaas-access-token': TOKEN })

try {
  await aguardar()
  const a = cliente()
  assert.equal((await a('GET', '/api/conteudo')).status, 401, 'conteúdo exige login')
  assert.equal((await a('POST', '/api/auth/cadastro', { nome: 'Ana', email: `ana${S}@teste.com`, senha: 'curta' })).status, 400, 'senha curta')
  let r = await a('POST', '/api/auth/cadastro', { nome: 'Ana', email: `Ana${S}@Teste.com`, senha: 'senha-forte-1' })
  assert.equal(r.status, 201); assert.equal(r.d.acesso.ativo, false); assert.equal(r.d.preco, 4700)
  assert.equal((await cliente()('POST', '/api/auth/cadastro', { nome: 'Ana', email: `ana${S}@teste.com`, senha: 'senha-forte-1' })).status, 409, 'e-mail repetido')
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
  assert.deepEqual([pacote.estado, pacote.preco], ['a-venda', 9900], 'pacote à venda')

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
  await b('POST', '/api/auth/cadastro', { nome: 'Beto', email: `beto${S}@teste.com`, senha: 'outra-senha-9' })
  const idB = (await b('POST', '/api/pagamento', { cpfCnpj: '52998224725' })).d.url.split('/').pop()
  await webhook(b, 'PAYMENT_CONFIRMED', idB, 'CONFIRMED', 1)
  assert.equal((await b('GET', '/api/auth/eu')).d.acesso.ativo, false, 'valor errado não libera')
  assert.equal((await b('POST', '/api/pagamento/verificar')).d.acesso.ativo, false, 'ainda pendente na Asaas')
  pagamentos.get(idB).status = 'RECEIVED'
  assert.equal((await b('POST', '/api/pagamento/verificar')).d.acesso.ativo, true, 'verificar libera quando pago')

  // Pacote Família libera todos os módulos de uma vez
  assert.equal((await b('GET', '/api/conteudo')).d.oferta !== null, true, 'b acabou de pagar o SOS Birra e tem a oferta')
  const idPac = (await b('POST', '/api/pagamento', { cpfCnpj: '52998224725', modulo: 'pacote' })).d.url.split('/').pop()
  assert.equal(pagamentos.get(idPac).value, 99, 'cobra o preço do pacote')
  await webhook(b, 'PAYMENT_CONFIRMED', idPac, 'CONFIRMED', 99)
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
  const cc = cliente(); await cc('POST', '/api/auth/cadastro', { nome: 'Cida', email: `cida${S}@teste.com`, senha: 'terceira-senha-7' })
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

  // logout
  await rec('POST', '/api/auth/sair', {}); assert.equal((await rec('GET', '/api/conteudo')).status, 401)
  console.log('OK: todos os testes passaram'); fim(0)
} catch (e) { console.error('FALHOU:', e.message); console.error((e.stack || '').split('\n').filter(l => l.includes('e2e.mjs')).slice(0, 2).join('\n')); console.error(log.slice(-3000)); fim(1) }
