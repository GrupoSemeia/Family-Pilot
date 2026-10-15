import { Hono } from 'hono'
import { type App, ErroApp, exigirLogin, exigirAcesso, acessoDe, precosDe, ofertaDe, MODULOS_IDS, PACOTE } from './lib'
import { auth } from './routes/auth'
import { pagamento, asaasWebhook } from './routes/pagamento'
import { CONTEUDO } from './conteudo'
import { MODULOS, CATALOGO } from './modulos'

const app = new Hono<App>()

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
app.route('/api/asaas/webhook', asaasWebhook)

// O conteúdo só sai do servidor para quem está logado, e só dos módulos com acesso ativo.
// "catalogo" mostra todos os módulos com o estado de cada um: liberado, à venda (com preço) ou em breve.
app.get('/api/conteudo', exigirLogin, exigirAcesso, async c => {
  const s = c.get('sessao'), ac = await acessoDe(c.env, s.usuarioId, s.email), precos = precosDe(c.env)
  const liberado = (id: string) => !!ac.modulos[id]?.ativo
  const catalogo: any[] = MODULOS_IDS.map(id => ({
    id, ...CATALOGO[id], estado: liberado(id) ? 'liberado' : precos[id] ? 'a-venda' : 'em-breve',
    preco: precos[id] ?? null, ate: ac.modulos[id]?.ate ?? null,
  }))
  // Pacote Família: aparece como "a venda" enquanto faltar algum módulo. "somaSeparados" é o que custaria comprar um a um.
  const soma = MODULOS_IDS.every(id => precos[id]) ? MODULOS_IDS.reduce((t, id) => t + precos[id], 0) : null
  catalogo.push({ id: PACOTE, ...CATALOGO[PACOTE], estado: MODULOS_IDS.every(liberado) ? 'liberado' : precos[PACOTE] ? 'a-venda' : 'em-breve', preco: precos[PACOTE] ?? null, somaSeparados: soma, ate: null })
  return c.json({
    birra: liberado('birra') ? CONTEUDO : null,
    modulos: Object.fromEntries(Object.entries(MODULOS).filter(([id]) => liberado(id))),
    catalogo,
    oferta: await ofertaDe(c.env, s.usuarioId),
  })
})

app.all('/api/*', c => c.json({ erro: 'Rota não encontrada.' }, 404))
export default app
