/* Teste de ponta a ponta: sobe uma Asaas falsa, o Worker local (wrangler dev) e percorre cadastro → pagamento → acesso.
   Rodar:  npm run db:local && npm run test:e2e */
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'

const PORTA = 8791, MOCK = 8792, BASE = `http://127.0.0.1:${PORTA}`, TOKEN = 'segredo-teste'
const pagamentos = new Map() // id → { status, value }
let seq = 0

const mock = createServer((req, res) => {
  let corpo = ''; req.on('data', d => (corpo += d)); req.on('end', () => {
    const j = corpo ? JSON.parse(corpo) : {}; const send = (o, s = 200) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)) }
    const u = req.url
    if (req.method === 'POST' && u === '/customers') return send({ id: 'cus_' + ++seq })
    if (req.method === 'POST' && u.startsWith('/customers/')) return send({ id: u.split('/')[2] })
    if (req.method === 'POST' && u === '/payments') { const id = 'pay_' + ++seq; pagamentos.set(id, { status: 'PENDING', value: j.value }); return send({ id, invoiceUrl: 'https://asaas.test/i/' + id, value: j.value }) }
    if (req.method === 'GET' && u.startsWith('/payments/')) { const p = pagamentos.get(u.split('/')[2]); return p ? send({ id: u.split('/')[2], ...p, billingType: 'PIX' }) : send({}, 404) }
    send({ errors: [{ description: 'rota desconhecida no mock' }] }, 404)
  })
}).listen(MOCK)

const wr = spawn('npx', ['wrangler', 'dev', '--port', String(PORTA), '--var', `ASAAS_URL:http://127.0.0.1:${MOCK}`, '--var', 'ASAAS_API_KEY:chave-teste', '--var', `ASAAS_WEBHOOK_TOKEN:${TOKEN}`, '--var', 'ACESSO_LIVRE:', '--var', 'PRECOS_MODULOS:{"sono":2700}'], { stdio: 'pipe' })
let log = ''; wr.stdout.on('data', d => (log += d)); wr.stderr.on('data', d => (log += d))
const fim = (cod) => { wr.kill('SIGTERM'); mock.close(); process.exit(cod) }

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
  assert.equal((await a('POST', '/api/auth/cadastro', { nome: 'Ana', email: 'ana@teste.com', senha: 'curta' })).status, 400, 'senha curta')
  let r = await a('POST', '/api/auth/cadastro', { nome: 'Ana', email: 'Ana@Teste.com', senha: 'senha-forte-1' })
  assert.equal(r.status, 201); assert.equal(r.d.acesso.ativo, false); assert.equal(r.d.preco, 4700)
  assert.equal((await cliente()('POST', '/api/auth/cadastro', { nome: 'Ana', email: 'ana@teste.com', senha: 'senha-forte-1' })).status, 409, 'e-mail repetido')
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

  // outro módulo: preço vem de PRECOS_MODULOS; sem preço não vende; módulo inexistente é recusado
  assert.equal((await a('POST', '/api/pagamento', { cpfCnpj: '52998224725', modulo: 'telas' })).status, 503, 'módulo sem preço')
  assert.equal((await a('POST', '/api/pagamento', { cpfCnpj: '52998224725', modulo: 'xyz' })).status, 400, 'módulo inexistente')
  const idSono = (await a('POST', '/api/pagamento', { cpfCnpj: '52998224725', modulo: 'sono' })).d.url.split('/').pop()
  assert.equal(pagamentos.get(idSono).value, 27, 'cobra o preço do módulo')
  assert.equal((await a('GET', '/api/conteudo')).d.modulos.sono, undefined, 'sono ainda bloqueado')
  await webhook(a, 'PAYMENT_CONFIRMED', idSono, 'CONFIRMED', 27)
  r = await a('GET', '/api/conteudo')
  assert.ok(r.d.modulos.sono.ferramentas.length >= 5, 'sono liberado depois de pagar')
  assert.equal(r.d.catalogo.find(m => m.id === 'sono').estado, 'liberado')
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
  await b('POST', '/api/auth/cadastro', { nome: 'Beto', email: 'beto@teste.com', senha: 'outra-senha-9' })
  const idB = (await b('POST', '/api/pagamento', { cpfCnpj: '52998224725' })).d.url.split('/').pop()
  await webhook(b, 'PAYMENT_CONFIRMED', idB, 'CONFIRMED', 1)
  assert.equal((await b('GET', '/api/auth/eu')).d.acesso.ativo, false, 'valor errado não libera')
  assert.equal((await b('POST', '/api/pagamento/verificar')).d.acesso.ativo, false, 'ainda pendente na Asaas')
  pagamentos.get(idB).status = 'RECEIVED'
  assert.equal((await b('POST', '/api/pagamento/verificar')).d.acesso.ativo, true, 'verificar libera quando pago')

  // renovação antes de vencer soma 12 meses ao que resta
  const idB2 = (await b('POST', '/api/pagamento', { cpfCnpj: '52998224725' })).d.url.split('/').pop()
  const atual = (await b('GET', '/api/auth/eu')).d.acesso.ate
  await webhook(b, 'PAYMENT_CONFIRMED', idB2, 'CONFIRMED', 47)
  const novo = (await b('GET', '/api/auth/eu')).d.acesso.ate
  const extra = (new Date(novo) - new Date(atual)) / 864e5
  assert.ok(extra > 364.9 && extra < 365.1, 'renovação soma 365 dias, deu ' + extra)

  // login, senha errada e limite de tentativas
  assert.equal((await cliente()('POST', '/api/auth/entrar', { email: 'beto@teste.com', senha: 'outra-senha-9' })).status, 200)
  for (let i = 0; i < 8; i++) assert.equal((await cliente()('POST', '/api/auth/entrar', { email: 'ana@teste.com', senha: 'errada' + i })).status, 401)
  assert.equal((await cliente()('POST', '/api/auth/entrar', { email: 'ana@teste.com', senha: 'senha-forte-1' })).status, 429, 'bloqueio depois de 8 erros')
  // POST sem JSON é recusado
  const f = await fetch(BASE + '/api/auth/entrar', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'a=b' })
  assert.equal(f.status, 415)
  // logout
  await b('POST', '/api/auth/sair', {}); assert.equal((await b('GET', '/api/conteudo')).status, 401)
  console.log('OK: todos os testes passaram'); fim(0)
} catch (e) { console.error('FALHOU:', e.message); console.error(log.slice(-800)); fim(1) }
