import { Hono } from 'hono'
import { type App, ErroApp, exigirLogin, exigirAcesso } from './lib'
import { auth } from './routes/auth'
import { pagamento, asaasWebhook } from './routes/pagamento'
import { CONTEUDO } from './conteudo'

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

// O conteúdo do app só sai do servidor para quem está logado e com acesso ativo.
app.get('/api/conteudo', exigirLogin, exigirAcesso, c => c.json(CONTEUDO))

app.all('/api/*', c => c.json({ erro: 'Rota não encontrada.' }, 404))
export default app
