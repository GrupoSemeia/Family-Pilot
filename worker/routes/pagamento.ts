import { Hono } from 'hono'
import {
  type App, type Env, erro, novoId, digitos, paraBanco, agoraBanco, acessoDe, exigirLogin,
  precosDe, ofertaDe, DIAS_ACESSO, MODULO_BASE, PRODUTOS_IDS,
} from '../lib'
import { CATALOGO } from '../modulos'

/* ---------- Pagamento pela Asaas (pagamento único de R$ 47) ----------
   O usuário informa CPF/CNPJ → criamos cliente + cobrança (billingType UNDEFINED: Pix, boleto ou cartão na página da
   Asaas) → o webhook (ou o botão "Já paguei") confirma e só então o acesso de 12 meses é liberado. */

type Resp = { ok: boolean; dados?: any; erro?: string }
async function asaas(env: Env, metodo: string, caminho: string, corpo?: unknown): Promise<Resp> {
  try {
    // chave de teste ($aact_hmlg_…) usa o sandbox sozinha
    const base = env.ASAAS_API_KEY?.includes('_hmlg_') ? 'https://api-sandbox.asaas.com/v3' : env.ASAAS_URL || 'https://api.asaas.com/v3'
    const r = await fetch(`${base.replace(/\/$/, '')}/${caminho}`, {
      method: metodo,
      headers: { 'content-type': 'application/json', access_token: env.ASAAS_API_KEY ?? '', 'user-agent': 'FamilyPilot' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    })
    const dados: any = await r.json().catch(() => ({}))
    if (!r.ok) return { ok: false, erro: dados?.errors?.map((e: any) => e.description).join(' ') || `Erro ${r.status} na Asaas.` }
    return { ok: true, dados }
  } catch {
    return { ok: false, erro: 'Não foi possível falar com a Asaas agora. Tente de novo em instantes.' }
  }
}
const exigir = (r: Resp) => { if (!r.ok) throw erro(502, r.erro || 'Erro na Asaas.'); return r.dados }

const PAGO = ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH']
/** hoje + n dias em Brasília (AAAA-MM-DD) */
const dataBR = (dias: number) => new Date(Date.now() - 3 * 36e5 + dias * 864e5).toISOString().slice(0, 10)
const centavos = (v: unknown) => Math.round(Number(v || 0) * 100)

/** Libera o acesso do pedido (uma vez só). Se o usuário renova antes de vencer, os 12 meses somam ao que resta. */
export async function conceder(env: Env, pedido: { id: string; usuario_id: string; modulo: string }, forma?: string): Promise<boolean> {
  const atual = await env.DB.prepare(`SELECT MAX(acesso_ate) AS ate FROM pedidos WHERE usuario_id=? AND modulo=? AND status='pago'`).bind(pedido.usuario_id, pedido.modulo).first<{ ate: string | null }>()
  const agora = agoraBanco()
  const base = atual?.ate && atual.ate > agora ? new Date(atual.ate.replace(' ', 'T') + 'Z') : new Date()
  const ate = paraBanco(new Date(base.getTime() + DIAS_ACESSO * 864e5))
  const r = await env.DB.prepare(
    `UPDATE pedidos SET status='pago', pago_em=?, acesso_ate=?, forma=COALESCE(?, forma) WHERE id=? AND status IN ('pendente','cancelado')`)
    .bind(agora, ate, forma ?? null, pedido.id).run()
  return (r.meta.changes ?? 0) > 0
}

export const pagamento = new Hono<App>()
pagamento.use('*', exigirLogin)

/** Cria (ou reaproveita) a cobrança de R$ 47 e devolve o link da página de pagamento. */
pagamento.post('/', async c => {
  const s = c.get('sessao'), db = c.env.DB
  const b = await c.req.json<any>().catch(() => ({}))
  const doc = digitos(b.cpfCnpj)
  const modulo = String(b.modulo ?? MODULO_BASE)
  if (!PRODUTOS_IDS.includes(modulo)) throw erro(400, 'Módulo inválido.')
  let valor = precosDe(c.env)[modulo]
  if (!valor) throw erro(503, 'Este módulo ainda não está à venda.')
  if (b.oferta) {
    // preço de boas-vindas: o servidor confere se a pessoa tem direito (nunca confia no navegador)
    const o = await ofertaDe(c.env, s.usuarioId)
    if (!o || o.modulo !== modulo) throw erro(400, 'Esta oferta não está mais disponível.')
    valor = o.preco
  }
  if (doc.length !== 11 && doc.length !== 14) throw erro(400, 'Informe um CPF (11 números) ou CNPJ (14 números) válido.')
  if (!c.env.ASAAS_API_KEY) throw erro(503, 'O pagamento online ainda não foi ativado. Fale com o Grupo Semeia Digital.')

  // já existe cobrança em aberto e ainda válida? reaproveita
  const aberto = await db.prepare(`SELECT id, url FROM pedidos WHERE usuario_id=? AND modulo=? AND valor=? AND status='pendente' AND url IS NOT NULL ORDER BY criado_em DESC LIMIT 1`).bind(s.usuarioId, modulo, valor).first<any>()
  if (aberto) return c.json({ url: aberto.url })

  const u = await db.prepare('SELECT nome, email, asaas_cliente FROM usuarios WHERE id=?').bind(s.usuarioId).first<any>()
  const dadosCliente = { name: u.nome, cpfCnpj: doc, email: u.email, externalReference: s.usuarioId }
  let cliente: string = u.asaas_cliente
  if (cliente) exigir(await asaas(c.env, 'POST', `customers/${cliente}`, dadosCliente))
  else cliente = exigir(await asaas(c.env, 'POST', 'customers', dadosCliente)).id
  await db.prepare('UPDATE usuarios SET cpf_cnpj=?, asaas_cliente=? WHERE id=?').bind(doc, cliente, s.usuarioId).run()

  const pedidoId = novoId()
  const p = exigir(await asaas(c.env, 'POST', 'payments', {
    customer: cliente, billingType: 'UNDEFINED', value: valor / 100, dueDate: dataBR(3),
    description: `FamilyPilot · ${CATALOGO[modulo].nome} (acesso por 12 meses)`, externalReference: pedidoId,
  }))
  await db.prepare('INSERT INTO pedidos (id, usuario_id, asaas_pagamento, valor, url, modulo) VALUES (?,?,?,?,?,?)')
    .bind(pedidoId, s.usuarioId, String(p.id), valor, String(p.invoiceUrl ?? ''), modulo).run()
  return c.json({ url: p.invoiceUrl ?? null })
})

/** Botão "Já paguei": confere na Asaas (caso o webhook demore) e libera o acesso. */
pagamento.post('/verificar', async c => {
  const s = c.get('sessao'), db = c.env.DB
  const pend = await db.prepare(`SELECT id, usuario_id, asaas_pagamento, valor, modulo FROM pedidos WHERE usuario_id=? AND status='pendente' AND asaas_pagamento IS NOT NULL`).bind(s.usuarioId).all<any>()
  for (const pedido of pend.results) {
    const r = await asaas(c.env, 'GET', `payments/${pedido.asaas_pagamento}`)
    if (r.ok && PAGO.includes(r.dados.status) && centavos(r.dados.value) === pedido.valor) await conceder(c.env, pedido, r.dados.billingType)
  }
  return c.json({ acesso: await acessoDe(c.env, s.usuarioId, s.email) })
})

/* ---------- webhook da Asaas (sem login): confere o token do cabeçalho asaas-access-token ---------- */
export const asaasWebhook = new Hono<App>()
asaasWebhook.post('/', async c => {
  const token = c.env.ASAAS_WEBHOOK_TOKEN
  if (!token || !iguais(c.req.header('asaas-access-token') ?? '', token)) return c.json({ erro: 'Não autorizado.' }, 401)
  const corpo = await c.req.json<any>().catch(() => ({}))
  const ev = String(corpo.event ?? ''), p = corpo.payment
  if (!p?.id) return c.json({ ok: true })
  const db = c.env.DB
  // só cobranças criadas por este app (a conta Asaas pode ter outras)
  const pedido = await db.prepare('SELECT id, usuario_id, valor, status, modulo FROM pedidos WHERE asaas_pagamento=?').bind(String(p.id)).first<any>()
  if (!pedido) return c.json({ ok: true })

  if (PAGO.includes(p.status) && (ev === 'PAYMENT_CONFIRMED' || ev === 'PAYMENT_RECEIVED' || ev === 'PAYMENT_RECEIVED_IN_CASH')) {
    if (centavos(p.value) === pedido.valor) await conceder(c.env, pedido, p.billingType)
  } else if (ev === 'PAYMENT_REFUNDED' || ev === 'PAYMENT_CHARGEBACK_REQUESTED' || ev === 'PAYMENT_PARTIALLY_REFUNDED') {
    // reembolso (garantia de 7 dias) ou chargeback: o acesso desse pedido deixa de valer
    await db.prepare(`UPDATE pedidos SET status='reembolsado' WHERE id=?`).bind(pedido.id).run()
  } else if (ev === 'PAYMENT_DELETED' && pedido.status === 'pendente') {
    await db.prepare(`UPDATE pedidos SET status='cancelado' WHERE id=?`).bind(pedido.id).run()
  }
  return c.json({ ok: true })
})
function iguais(a: string, b: string) {
  if (a.length !== b.length) return false
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}
