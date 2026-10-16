import { Hono } from 'hono'
import { type App, erro, exigirLogin, ehSuper, MODULOS_IDS } from '../lib'

/* Área do super usuário (e-mail na lista ACESSO_LIVRE e confirmado). Quem não é super recebe 404, como se a rota não existisse. */
export const admin = new Hono<App>()
admin.use('*', exigirLogin)
admin.use('*', async (c, next) => {
  const s = c.get('sessao')
  if (!(await ehSuper(c.env, s.usuarioId, s.email))) return c.json({ erro: 'Rota não encontrada.' }, 404)
  await next()
})

/** "Ver como usuário": define quais módulos aparecem como liberados (e se mostra a oferta de boas-vindas) só nesta sessão.
    { modulos: null } volta à visão de administrador. */
admin.post('/visao', async c => {
  const s = c.get('sessao'), b = await c.req.json<any>().catch(() => ({}))
  if (b.modulos === null) {
    await c.env.DB.prepare('UPDATE sessoes SET ver_como=NULL WHERE id=?').bind(s.sessaoId).run()
    return c.json({ visao: null })
  }
  if (!Array.isArray(b.modulos)) throw erro(400, 'Informe a lista de módulos.')
  const modulos = MODULOS_IDS.filter(id => b.modulos.includes(id))     // só ids conhecidos, na ordem do catálogo
  const visao = { modulos, oferta: !!b.oferta }
  await c.env.DB.prepare('UPDATE sessoes SET ver_como=? WHERE id=?').bind(JSON.stringify(visao), s.sessaoId).run()
  return c.json({ visao })
})

/* ---------- painel de clientes e pedidos (só leitura) ----------
   Mostra quem é cliente e o que comprou. De propósito NÃO mostra CPF/CNPJ nem nenhum registro das famílias (diário, radar, anotações):
   o administrador não tem como ler isso, nem pelo app, nem por aqui. */
const POR_PAGINA = 30
const pagina = (v: string | undefined) => Math.max(0, Math.min(10_000, Number.parseInt(v ?? '0', 10) || 0))

admin.get('/resumo', async c => {
  const db = c.env.DB
  const [us, st, mods, comp] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(criado_em >= datetime('now','-7 days')),0) AS n7, COALESCE(SUM(criado_em >= datetime('now','-30 days')),0) AS n30 FROM usuarios WHERE excluido_em IS NULL`).first<any>(),
    db.prepare(`SELECT status, COUNT(*) AS n, COALESCE(SUM(valor),0) AS valor FROM pedidos GROUP BY status`).all<any>(),
    db.prepare(`SELECT modulo, COUNT(*) AS n, COALESCE(SUM(valor),0) AS valor FROM pedidos WHERE status='pago' GROUP BY modulo ORDER BY n DESC`).all<any>(),
    db.prepare(`SELECT COUNT(DISTINCT usuario_id) AS n FROM pedidos WHERE status='pago'`).first<any>(),
  ])
  const por: Record<string, { n: number; valor: number }> = {}
  for (const r of st.results) por[r.status] = { n: r.n, valor: r.valor }
  return c.json({ contas: us, compradores: comp?.n ?? 0, pedidos: por, modulos: mods.results })
})

admin.get('/clientes', async c => {
  const db = c.env.DB, busca = (c.req.query('busca') ?? '').trim().slice(0, 80), off = pagina(c.req.query('pagina')) * POR_PAGINA
  const like = '%' + busca.replace(/[\\%_]/g, m => '\\' + m) + '%'
  const { results } = await db.prepare(
    `SELECT id, nome, email, criado_em, google_sub IS NOT NULL AS google, email_verificado_em IS NOT NULL AS verificado, aceite_versao FROM usuarios
     WHERE excluido_em IS NULL AND (?1 = '' OR email LIKE ?2 ESCAPE '\\' OR nome LIKE ?2 ESCAPE '\\') ORDER BY criado_em DESC LIMIT ?3 OFFSET ?4`)
    .bind(busca, like, POR_PAGINA + 1, off).all<any>()
  const mais = results.length > POR_PAGINA, lista = results.slice(0, POR_PAGINA)
  const peds = lista.length
    ? (await db.prepare(`SELECT usuario_id, modulo, valor, status, acesso_ate FROM pedidos WHERE usuario_id IN (${lista.map(() => '?').join(',')})`).bind(...lista.map(u => u.id)).all<any>()).results
    : []
  const agora = new Date().toISOString().replace('T', ' ').slice(0, 19)
  return c.json({
    mais, clientes: lista.map(u => {
      const meus = peds.filter(p => p.usuario_id === u.id), pagos = meus.filter(p => p.status === 'pago')
      const ativos = new Set<string>()
      for (const p of pagos) if (p.acesso_ate && p.acesso_ate > agora) (p.modulo === 'pacote' ? MODULOS_IDS : [p.modulo]).forEach(m => ativos.add(m))
      return { nome: u.nome, email: u.email, criadoEm: u.criado_em, google: !!u.google, verificado: !!u.verificado, aceite: u.aceite_versao, pedidos: meus.length, pago: pagos.reduce((t, p) => t + p.valor, 0), modulosAtivos: MODULOS_IDS.filter(m => ativos.has(m)), pacote: pagos.some(p => p.modulo === 'pacote' && p.acesso_ate > agora) }
    }),
  })
})

admin.get('/pedidos', async c => {
  const db = c.env.DB, st = c.req.query('status') ?? '', off = pagina(c.req.query('pagina')) * POR_PAGINA
  if (st && !['pendente', 'pago', 'reembolsado', 'cancelado'].includes(st)) throw erro(400, 'Status inválido.')
  const { results } = await db.prepare(
    `SELECT p.modulo, p.valor, p.status, p.forma, p.criado_em, p.pago_em, p.acesso_ate, u.nome, u.email FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id
     WHERE (?1 = '' OR p.status = ?1) ORDER BY p.criado_em DESC LIMIT ?2 OFFSET ?3`).bind(st, POR_PAGINA + 1, off).all<any>()
  return c.json({ mais: results.length > POR_PAGINA, pedidos: results.slice(0, POR_PAGINA).map(p => ({ modulo: p.modulo, valor: p.valor, status: p.status, forma: p.forma, criadoEm: p.criado_em, pagoEm: p.pago_em, acessoAte: p.acesso_ate, nome: p.nome, email: p.email })) })
})
