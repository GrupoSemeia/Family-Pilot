import { Hono } from 'hono'
import { type App, ErroApp, exigirLogin, exigirAcesso, lerSessao, acessoDaSessao, visaoValida, precosDe, precosCheios, ofertaDe, ofertaSimulada, MODULOS_IDS, PACOTE } from './lib'
import { auth } from './routes/auth'
import { pagamento, asaasWebhook } from './routes/pagamento'
import { admin } from './routes/admin'
import { dados } from './routes/dados'
import { CONTEUDO } from './conteudo'
import { redirecionarSemWww } from './dominio'
import { MODULOS, CATALOGO } from './modulos'

const app = new Hono<App>()

// O endereço sem "www" vai para o endereço principal (APP_URL)
app.use('*', async (c, next) => {
  const r = redirecionarSemWww(c.env.APP_URL, c.req.url, c.req.method)
  if (r) return c.redirect(r.destino, r.status)
  await next()
})

app.onError((e, c) => {
  if (e instanceof ErroApp) return c.json({ erro: e.message }, e.status as any)
  console.error(e)
  return c.json({ erro: 'Algo deu errado. Tente de novo.' }, 500)
})

// Pedidos que mudam dados precisam vir como JSON (barra envio de formulários de outros sites). O webhook é exceção.
app.use('/api/*', async (c, next) => {
  if (c.req.method === 'POST' && !c.req.path.startsWith('/api/asaas/') && !(c.req.header('content-type') ?? '').includes('application/json'))
    return c.json({ erro: 'Requisição inválida.' }, 415)
  c.header('cache-control', 'no-store')
  await next()
})

app.route('/api/auth', auth)
app.route('/api/pagamento', pagamento)
app.route('/api/admin', admin)
app.route('/api/dados', dados)
app.route('/api/asaas/webhook', asaasWebhook)

// O conteúdo só sai do servidor para quem está logado, e só dos módulos com acesso ativo.
// "catalogo" mostra todos os módulos com o estado de cada um: liberado, à venda (com preço) ou em breve.
app.get('/api/conteudo', exigirLogin, exigirAcesso, async c => {
  const s = c.get('sessao'), ac = await acessoDaSessao(c.env, s), visao = await visaoValida(c.env, s), precos = precosDe(c.env), cheios = precosCheios(c.env)
  const liberado = (id: string) => !!ac.modulos[id]?.ativo
  const catalogo: any[] = MODULOS_IDS.map(id => ({
    id, ...CATALOGO[id], estado: liberado(id) ? 'liberado' : precos[id] ? 'a-venda' : 'em-breve',
    preco: precos[id] ?? null, precoCheio: cheios[id] ?? null, ate: ac.modulos[id]?.ate ?? null,
  }))
  // Pacote Família: aparece como "a venda" enquanto faltar algum módulo. "somaSeparados" é o que custaria comprar um a um.
  const soma = MODULOS_IDS.every(id => precos[id]) ? MODULOS_IDS.reduce((t, id) => t + precos[id], 0) : null
  catalogo.push({ id: PACOTE, ...CATALOGO[PACOTE], estado: MODULOS_IDS.every(liberado) ? 'liberado' : precos[PACOTE] ? 'a-venda' : 'em-breve', preco: precos[PACOTE] ?? null, precoCheio: cheios[PACOTE] ?? null, somaSeparados: soma, ate: null })
  return c.json({
    birra: liberado('birra') ? CONTEUDO : null,
    modulos: Object.fromEntries(Object.entries(MODULOS).filter(([id]) => liberado(id))),
    catalogo,
    oferta: visao ? ofertaSimulada(c.env, visao) : await ofertaDe(c.env, s.usuarioId),
  })
})

// Páginas que passam pelo Worker só para poder redirecionar o endereço sem "www"; o conteúdo é o mesmo arquivo estático.
app.get('/entrar', c => c.env.ASSETS.fetch(c.req.raw))
app.get('/inicio', c => c.env.ASSETS.fetch(c.req.raw))

// "/" : quem está logado abre o app; quem não está vê a página de vendas (app/inicio.html). Os botões da página levam a /entrar.
app.get('/', async c => {
  const logado = !!(await lerSessao(c))
  const r = await c.env.ASSETS.fetch(logado ? c.req.raw : new Request(new URL('/inicio', c.req.url), c.req.raw))
  const resp = new Response(r.body, r)
  resp.headers.set('cache-control', 'private, no-cache')   // a mesma URL muda conforme o login: nunca guardar em cache compartilhado
  resp.headers.set('vary', 'cookie')
  return resp
})

app.all('/api/*', c => c.json({ erro: 'Rota não encontrada.' }, 404))
export default app
