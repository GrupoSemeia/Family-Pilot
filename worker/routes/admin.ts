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
