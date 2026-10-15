import { Hono } from 'hono'
import { type App, erro, novoId, limpar, hashSenha, conferirSenha, criarSessao, encerrarSessao, lerSessao, acessoDe, precosDe } from '../lib'

export const auth = new Hono<App>()

const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 160
const MAX_FALHAS = 8   // por e-mail, em 15 minutos

async function resposta(c: any, s: { usuarioId: string; nome: string; email: string }) {
  return { usuario: { nome: s.nome, email: s.email }, acesso: await acessoDe(c.env, s.usuarioId, s.email), preco: precosDe(c.env).birra, precos: precosDe(c.env), pagamentoOnline: !!c.env.ASAAS_API_KEY }
}

auth.post('/cadastro', async c => {
  const b = await c.req.json<any>().catch(() => ({}))
  const nome = limpar(b.nome, 80), email = limpar(b.email, 160).toLowerCase(), senha = String(b.senha ?? '')
  if (nome.length < 2) throw erro(400, 'Informe seu nome.')
  if (!emailValido(email)) throw erro(400, 'Informe um e-mail válido.')
  if (senha.length < 8 || senha.length > 100) throw erro(400, 'A senha precisa ter de 8 a 100 caracteres.')
  const ja = await c.env.DB.prepare('SELECT 1 FROM usuarios WHERE email=?').bind(email).first()
  if (ja) throw erro(409, 'Já existe uma conta com esse e-mail. Entre com a sua senha.')
  const id = novoId()
  await c.env.DB.prepare('INSERT INTO usuarios (id, nome, email, senha_hash) VALUES (?,?,?,?)').bind(id, nome, email, await hashSenha(senha)).run()
  await criarSessao(c, id)
  return c.json(await resposta(c, { usuarioId: id, nome, email }), 201)
})

auth.post('/entrar', async c => {
  const b = await c.req.json<any>().catch(() => ({}))
  const email = limpar(b.email, 160).toLowerCase(), senha = String(b.senha ?? '')
  const db = c.env.DB
  const falhas = await db.prepare(`SELECT COUNT(*) AS n FROM falhas_login WHERE email=? AND em > datetime('now','-15 minutes')`).bind(email).first<{ n: number }>()
  if ((falhas?.n ?? 0) >= MAX_FALHAS) throw erro(429, 'Muitas tentativas. Espere 15 minutos e tente de novo.')
  const u = await db.prepare('SELECT id, nome, email, senha_hash FROM usuarios WHERE email=?').bind(email).first<any>()
  // mesma resposta para e-mail inexistente e senha errada
  const ok = u ? await conferirSenha(senha, u.senha_hash) : (await hashSenha(senha), false)
  if (!ok) {
    await db.prepare('INSERT INTO falhas_login (email) VALUES (?)').bind(email).run()
    throw erro(401, 'E-mail ou senha incorretos.')
  }
  await db.prepare('DELETE FROM falhas_login WHERE email=?').bind(email).run()
  await criarSessao(c, u.id)
  return c.json(await resposta(c, { usuarioId: u.id, nome: u.nome, email: u.email }))
})

auth.post('/sair', async c => { await encerrarSessao(c); return c.json({ ok: true }) })

/** Quem sou eu e se o acesso está ativo (o app consulta isso ao abrir). */
auth.get('/eu', async c => {
  const s = await lerSessao(c)
  if (!s) return c.json({ usuario: null, preco: precosDe(c.env).birra, precos: precosDe(c.env), pagamentoOnline: !!c.env.ASAAS_API_KEY })
  return c.json(await resposta(c, s))
})
