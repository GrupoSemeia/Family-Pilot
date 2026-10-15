import { Hono } from 'hono'
import { verificarGoogle } from '../google'
import { type App, type Env, erro, novoId, limpar, hashSenha, conferirSenha, criarSessao, encerrarSessao, lerSessao, acessoDe, precosDe, precosCheios, emailAtivo, sha256, tokenAleatorio, paraBanco, agoraBanco } from '../lib'

export const auth = new Hono<App>()

const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 160
const MAX_FALHAS = 8   // por e-mail, em 15 minutos

async function resposta(c: any, s: { usuarioId: string; nome: string; email: string }) {
  return { usuario: { nome: s.nome, email: s.email }, acesso: await acessoDe(c.env, s.usuarioId, s.email), preco: precosDe(c.env).birra, precos: precosDe(c.env), precosCheios: precosCheios(c.env), pagamentoOnline: !!c.env.ASAAS_API_KEY, emailAtivo: emailAtivo(c.env), googleClientId: c.env.GOOGLE_CLIENT_ID || '' }
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
  if (!s) return c.json({ usuario: null, preco: precosDe(c.env).birra, precos: precosDe(c.env), precosCheios: precosCheios(c.env), pagamentoOnline: !!c.env.ASAAS_API_KEY, emailAtivo: emailAtivo(c.env), googleClientId: c.env.GOOGLE_CLIENT_ID || '' })
  return c.json(await resposta(c, s))
})


/* ---------- esqueci minha senha ----------
   Link de uso único, vale 1 hora, no máximo 3 por hora por conta. A resposta é sempre a mesma (não revela se a conta existe).
   O token vai no fragmento da URL (#/nova-senha/...), que o navegador não envia ao servidor. O banco guarda só o SHA-256. */
const esc = (s: string) => s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!))

async function enviarEmail(env: Env, para: string, nome: string, link: string) {
  const primeiro = nome.split(' ')[0]
  const texto = `Olá, ${primeiro}!\n\nRecebemos um pedido para criar uma nova senha no FamilyPilot. Use o link abaixo (vale por 1 hora e só pode ser usado uma vez):\n\n${link}\n\nSe não foi você, ignore este e-mail: sua senha continua a mesma.\n\nGrupo Semeia Digital`
  const html = `<p>Olá, ${esc(primeiro)}!</p><p>Recebemos um pedido para criar uma nova senha no FamilyPilot. O link vale por 1 hora e só pode ser usado uma vez.</p>
    <p><a href="${esc(link)}" style="background:#ee3b64;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Criar nova senha</a></p>
    <p style="color:#555;font-size:13px">Se o botão não abrir, copie este endereço no navegador:<br>${esc(link)}</p>
    <p style="color:#555;font-size:13px">Se não foi você, ignore este e-mail: sua senha continua a mesma.</p><p style="color:#555;font-size:13px">Grupo Semeia Digital</p>`
  try {
    await fetch(`${(env.RESEND_URL || 'https://api.resend.com').replace(/\/$/, '')}/emails`, {
      method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_DE, to: [para], subject: 'Crie uma nova senha no FamilyPilot', html, text: texto }),
    })
  } catch { /* sem e-mail: a pessoa pede de novo */ }
}

auth.post('/esqueci', async c => {
  const b = await c.req.json<any>().catch(() => ({}))
  const email = limpar(b.email, 160).toLowerCase()
  const neutra = c.json({ ok: true })
  if (!emailValido(email) || !emailAtivo(c.env)) return neutra
  const db = c.env.DB
  const u = await db.prepare('SELECT id, nome FROM usuarios WHERE email=?').bind(email).first<any>()
  if (!u) return neutra
  const n = await db.prepare(`SELECT COUNT(*) AS n FROM senha_resets WHERE usuario_id=? AND criado_em > datetime('now','-1 hour')`).bind(u.id).first<{ n: number }>()
  if ((n?.n ?? 0) >= 3) return neutra
  const token = tokenAleatorio(32)
  await db.prepare('INSERT INTO senha_resets (id, usuario_id, expira_em) VALUES (?,?,?)').bind(await sha256(token), u.id, paraBanco(new Date(Date.now() + 36e5))).run()
  const base = (c.env.APP_URL || new URL(c.req.url).origin).replace(/\/$/, '')
  c.executionCtx.waitUntil(enviarEmail(c.env, email, u.nome, `${base}/#/nova-senha/${token}`))
  return neutra
})

auth.post('/nova-senha', async c => {
  const b = await c.req.json<any>().catch(() => ({}))
  const token = String(b.token ?? ''), senha = String(b.senha ?? '')
  if (senha.length < 8 || senha.length > 100) throw erro(400, 'A senha precisa ter de 8 a 100 caracteres.')
  const db = c.env.DB
  const r = await db.prepare('SELECT id, usuario_id FROM senha_resets WHERE id=? AND usado_em IS NULL AND expira_em > ?').bind(await sha256(token), agoraBanco()).first<any>()
  if (!r) throw erro(400, 'Este link não vale mais. Peça um novo em "Esqueci minha senha".')
  // marca como usado primeiro: dois pedidos ao mesmo tempo não passam os dois
  const uso = await db.prepare('UPDATE senha_resets SET usado_em=? WHERE id=? AND usado_em IS NULL').bind(agoraBanco(), r.id).run()
  if ((uso.meta.changes ?? 0) !== 1) throw erro(400, 'Este link não vale mais. Peça um novo em "Esqueci minha senha".')
  const u = await db.prepare('SELECT id, nome, email FROM usuarios WHERE id=?').bind(r.usuario_id).first<any>()
  await db.batch([
    db.prepare('UPDATE usuarios SET senha_hash=? WHERE id=?').bind(await hashSenha(senha), u.id),
    db.prepare('DELETE FROM sessoes WHERE usuario_id=?').bind(u.id),                       // derruba todas as sessões antigas
    db.prepare('DELETE FROM senha_resets WHERE usuario_id=? AND id<>?').bind(u.id, r.id),  // invalida os outros links pendentes
    db.prepare('DELETE FROM falhas_login WHERE email=?').bind(u.email),
  ])
  await criarSessao(c, u.id)
  return c.json(await resposta(c, { usuarioId: u.id, nome: u.nome, email: u.email }))
})


/* ---------- entrar ou cadastrar com o Google ---------- */
auth.post('/google', async c => {
  const b = await c.req.json<any>().catch(() => ({}))
  let g
  try { g = await verificarGoogle(c.env, String(b.credential ?? '')) } catch (e) { console.warn('login Google recusado:', (e as Error).message); throw erro(401, 'Não foi possível entrar com o Google. Tente de novo.') }
  const db = c.env.DB
  let u = await db.prepare('SELECT id, nome, email, google_sub FROM usuarios WHERE google_sub=?').bind(g.sub).first<any>()
  if (!u) {
    u = await db.prepare('SELECT id, nome, email, google_sub FROM usuarios WHERE email=?').bind(g.email).first<any>()
    if (u && u.google_sub) throw erro(409, 'Este e-mail já está ligado a outra conta Google.')
    if (u) {
      // Já existe conta com esse e-mail, criada com senha. O Google confirmou que o e-mail é da pessoa, então ligamos as contas.
      // Se a conta nunca pagou nada, pode ter sido criada por outra pessoa com o e-mail alheio: trocamos a senha por uma
      // impossível e derrubamos as sessões, para quem criou antes não continuar com acesso.
      const pago = await db.prepare(`SELECT 1 FROM pedidos WHERE usuario_id=? AND status='pago' LIMIT 1`).bind(u.id).first()
      const lote = [db.prepare('UPDATE usuarios SET google_sub=? WHERE id=?').bind(g.sub, u.id)]
      if (!pago) lote.push(db.prepare('UPDATE usuarios SET senha_hash=? WHERE id=?').bind('google$sem-senha$' + tokenAleatorio(24), u.id), db.prepare('DELETE FROM sessoes WHERE usuario_id=?').bind(u.id))
      await db.batch(lote)
    } else {
      const id = novoId()
      await db.prepare('INSERT INTO usuarios (id, nome, email, senha_hash, google_sub) VALUES (?,?,?,?,?)')
        .bind(id, g.nome, g.email, 'google$sem-senha$' + tokenAleatorio(24), g.sub).run()
      u = { id, nome: g.nome, email: g.email }
    }
  }
  await criarSessao(c, u.id)
  return c.json(await resposta(c, { usuarioId: u.id, nome: u.nome, email: u.email }))
})
