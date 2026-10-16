/* Registros dos pais na nuvem (LGPD): guardar cifrado, abrir em qualquer aparelho, baixar tudo, apagar registros e excluir a conta.
   Tudo filtra pela conta da sessão. Não existe rota de administrador que leia estes registros. */
import { Hono } from 'hono'
import { type App, type C, erro, exigirLogin, encerrarSessao, conferirSenha, agoraBanco, VERSAO_CONSENT_REGISTROS } from '../lib'
import { cofreAtivo, cifrar, decifrar } from '../cofre'

export const dados = new Hono<App>()
dados.use(exigirLogin)

const CHAVES = ['birra', 'modulos', 'filhos']
const MAX_BYTES = 400_000     // por tipo de registro, já em JSON

const exigirCofre = (c: C) => { if (!cofreAtivo(c.env)) throw erro(503, 'A cópia dos registros na nuvem ainda não está ativa. Eles continuam salvos neste aparelho.') }

/** Sem o consentimento específico do responsável, nada é guardado na nuvem (os registros ficam só no aparelho). */
async function temConsentimento(c: C) {
  const r = await c.env.DB.prepare('SELECT consent_registros_em AS ce FROM usuarios WHERE id=?').bind(c.get('sessao').usuarioId).first<{ ce: string | null }>()
  return !!r?.ce
}
const semConsentimento = (c: C) => c.json({ erro: 'Falta a sua autorização para guardar os registros na conta.', consentimento: false }, 403)

async function lerTodos(c: C, usuarioId: string) {
  const { results } = await c.env.DB.prepare('SELECT chave, versao, conteudo FROM dados WHERE usuario_id=?').bind(usuarioId).all<any>()
  const out: Record<string, { versao: number; dados: unknown } | null> = Object.fromEntries(CHAVES.map(k => [k, null]))
  for (const r of results) {
    if (!CHAVES.includes(r.chave)) continue
    try { out[r.chave] = { versao: r.versao, dados: JSON.parse(await decifrar(c.env, usuarioId, r.chave, r.conteudo)) } }
    catch (e) { console.error('registro ilegível', r.chave, (e as Error).message); throw erro(500, 'Não foi possível abrir seus registros agora. Tente de novo mais tarde.') }
  }
  return out
}

/** Tudo o que a conta tem guardado, para o app abrir em qualquer aparelho. */
dados.get('/', async c => {
  exigirCofre(c)
  if (!(await temConsentimento(c))) return semConsentimento(c)
  return c.json(await lerTodos(c, c.get('sessao').usuarioId))
})

/** Salva um tipo de registro. "base" é a versão que o aparelho conhecia; se outro aparelho salvou antes, devolve 409 com a versão atual para o app juntar os dois. */
dados.put('/:chave', async c => {
  exigirCofre(c)
  if (!(await temConsentimento(c))) return semConsentimento(c)
  const chave = c.req.param('chave'), uid = c.get('sessao').usuarioId, db = c.env.DB
  if (!CHAVES.includes(chave)) throw erro(404, 'Registro desconhecido.')
  const b = await c.req.json<any>().catch(() => ({}))
  if (!Number.isInteger(b.base) || b.base < 0) throw erro(400, 'Requisição inválida.')
  if (!b.dados || typeof b.dados !== 'object' || Array.isArray(b.dados)) throw erro(400, 'Requisição inválida.')
  const texto = JSON.stringify(b.dados)
  if (texto.length > MAX_BYTES) throw erro(413, 'Seus registros ficaram grandes demais para guardar. Apague os mais antigos.')
  const conteudo = await cifrar(c.env, uid, chave, texto)
  let gravou = false
  if (b.base === 0) {
    gravou = !!(await db.prepare('INSERT INTO dados (usuario_id, chave, versao, conteudo) VALUES (?,?,1,?) ON CONFLICT DO NOTHING').bind(uid, chave, conteudo).run()).meta.changes
  } else {
    gravou = !!(await db.prepare(`UPDATE dados SET conteudo=?, versao=versao+1, atualizado_em=datetime('now') WHERE usuario_id=? AND chave=? AND versao=?`).bind(conteudo, uid, chave, b.base).run()).meta.changes
  }
  if (gravou) return c.json({ versao: b.base + 1 })
  const atual = (await lerTodos(c, uid))[chave]
  return c.json({ erro: 'Seus registros foram alterados em outro aparelho.', atual }, 409)
})

/** Consentimento do responsável (caixa separada, art. 14 da LGPD). aceite:true autoriza; aceite:false revoga e apaga o que está na nuvem. */
dados.post('/consentimento', async c => {
  const s = c.get('sessao'), db = c.env.DB, b = await c.req.json<any>().catch(() => ({}))
  if (b.aceite === true) {
    await db.prepare('UPDATE usuarios SET consent_registros_em=?, consent_registros_versao=? WHERE id=?').bind(agoraBanco(), VERSAO_CONSENT_REGISTROS, s.usuarioId).run()
    return c.json({ ok: true })
  }
  if (b.aceite === false) {
    await db.batch([db.prepare('DELETE FROM dados WHERE usuario_id=?').bind(s.usuarioId), db.prepare('UPDATE usuarios SET consent_registros_em=NULL, consent_registros_versao=NULL WHERE id=?').bind(s.usuarioId)])
    return c.json({ ok: true })
  }
  throw erro(400, 'Requisição inválida.')
})

/** Baixar tudo o que guardamos sobre a conta (acesso e portabilidade, LGPD art. 18). */
dados.get('/exportar', async c => {
  const s = c.get('sessao'), db = c.env.DB
  const u = await db.prepare('SELECT nome, email, criado_em, aceite_em, aceite_versao, consent_registros_em, consent_registros_versao, email_verificado_em FROM usuarios WHERE id=?').bind(s.usuarioId).first<any>()
  const { results: pedidos } = await db.prepare('SELECT modulo, valor, status, forma, criado_em, pago_em, acesso_ate FROM pedidos WHERE usuario_id=? ORDER BY criado_em').bind(s.usuarioId).all()
  const registros = cofreAtivo(c.env) ? await lerTodos(c, s.usuarioId) : null
  c.header('content-disposition', 'attachment; filename="meus-dados-familypilot.json"')
  return c.json({ geradoEm: new Date().toISOString(), conta: u, compras: pedidos, registros: registros && { birra: registros.birra?.dados ?? null, modulos: registros.modulos?.dados ?? null, filhos: registros.filhos?.dados ?? null } })
})

/** Apagar todos os registros guardados na nuvem (a conta continua). */
dados.delete('/', async c => {
  await c.env.DB.prepare('DELETE FROM dados WHERE usuario_id=?').bind(c.get('sessao').usuarioId).run()
  return c.json({ ok: true })
})

/** Excluir a conta. Pede a senha (ou a palavra EXCLUIR, em conta só-Google). Apaga registros e sessões e anonimiza a conta;
 *  só ficam as compras pagas ou reembolsadas (e o CPF/CNPJ delas), que a lei fiscal manda guardar. */
dados.post('/excluir-conta', async c => {
  const s = c.get('sessao'), db = c.env.DB
  const b = await c.req.json<any>().catch(() => ({}))
  const u = await db.prepare('SELECT senha_hash FROM usuarios WHERE id=?').bind(s.usuarioId).first<any>()
  const semSenha = String(u?.senha_hash ?? '').startsWith('google$')
  if (semSenha ? String(b.confirmar ?? '').trim().toUpperCase() !== 'EXCLUIR' : !(await conferirSenha(String(b.senha ?? ''), u.senha_hash))) throw erro(403, semSenha ? 'Digite EXCLUIR para confirmar.' : 'Senha incorreta.')
  const fiscal = await db.prepare(`SELECT 1 FROM pedidos WHERE usuario_id=? AND status IN ('pago','reembolsado') LIMIT 1`).bind(s.usuarioId).first()
  await db.batch([
    db.prepare('DELETE FROM dados WHERE usuario_id=?').bind(s.usuarioId),
    db.prepare('DELETE FROM sessoes WHERE usuario_id=?').bind(s.usuarioId),
    db.prepare('DELETE FROM senha_resets WHERE usuario_id=?').bind(s.usuarioId),
    db.prepare('DELETE FROM falhas_login WHERE email=?').bind(s.email),
    db.prepare(`DELETE FROM pedidos WHERE usuario_id=? AND status NOT IN ('pago','reembolsado')`).bind(s.usuarioId),
    db.prepare(`UPDATE usuarios SET nome='Conta excluída', email=?, senha_hash='excluida$', google_sub=NULL, email_verificado_em=NULL, consent_registros_em=NULL, consent_registros_versao=NULL, excluido_em=datetime('now'),
      cpf_cnpj=CASE WHEN ? THEN cpf_cnpj ELSE NULL END, asaas_cliente=CASE WHEN ? THEN asaas_cliente ELSE NULL END WHERE id=?`)
      .bind(`excluida-${s.usuarioId}@excluida.invalid`, fiscal ? 1 : 0, fiscal ? 1 : 0, s.usuarioId),
  ])
  await encerrarSessao(c)
  return c.json({ ok: true })
})
