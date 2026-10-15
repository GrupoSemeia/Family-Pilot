import type { Context, MiddlewareHandler } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'

export type Env = {
  DB: D1Database; ASSETS: Fetcher
  ASAAS_URL?: string; ASAAS_API_KEY?: string; ASAAS_WEBHOOK_TOKEN?: string
  ACESSO_LIVRE?: string
  /** Preços dos módulos à venda, em centavos, em JSON. Ex.: {"sono":2700}. Módulo sem preço aparece como "em breve". */
  PRECOS_MODULOS?: string
  /** Oferta de boas-vindas depois de comprar o SOS Birra. JSON: {"modulo":"sono","preco":2700,"horas":72}. Vazio = sem oferta. */
  OFERTA_POS_COMPRA?: string
}
export type Sessao = { usuarioId: string; nome: string; email: string }
export type App = { Bindings: Env; Variables: { sessao: Sessao } }
export type C = Context<App>

/* ---------- produto ---------- */
export const PRECO_CENTAVOS = 4700          // R$ 47, SOS Birra, pagamento único
export const DIAS_ACESSO = 365              // acesso por 12 meses a partir da confirmação do pagamento
export const MODULO_BASE = 'birra'
export const MODULOS_IDS = ['birra', 'sono', 'telas', 'alimentacao', 'limites', 'escola', 'adolescencia']
/** Pacote Família: um pedido que libera todos os módulos por 12 meses. */
export const PACOTE = 'pacote'
export const PRODUTOS_IDS = [...MODULOS_IDS, PACOTE]

/** Preço de cada módulo em centavos. O SOS Birra é fixo; os demais vêm de PRECOS_MODULOS (indefinido = ainda não está à venda). */
export function precosDe(env: Env): Record<string, number> {
  const out: Record<string, number> = { [MODULO_BASE]: PRECO_CENTAVOS }
  try {
    const extra = JSON.parse(env.PRECOS_MODULOS || '{}')
    for (const id of PRODUTOS_IDS) if (id !== MODULO_BASE && Number.isInteger(extra[id]) && extra[id] >= 500) out[id] = extra[id]
  } catch { /* JSON inválido: nenhum módulo extra à venda */ }
  return out
}

/* ---------- utilidades ---------- */
export const novoId = () => crypto.randomUUID()
export function tokenAleatorio(bytes = 32): string {
  const b = crypto.getRandomValues(new Uint8Array(bytes))
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export async function sha256(txt: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt))
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('')
}
export const digitos = (s: unknown) => String(s ?? '').replace(/\D/g, '')
export const limpar = (s: unknown, max = 200) => String(s ?? '').trim().slice(0, max)
/** data/hora UTC no formato do banco: AAAA-MM-DD HH:MM:SS */
export const paraBanco = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ')
export const agoraBanco = () => paraBanco(new Date())
/** a data do banco (UTC) vira ISO para o navegador */
export const paraISO = (s: string) => s.replace(' ', 'T') + 'Z'

export class ErroApp extends Error { constructor(public status: number, msg: string) { super(msg) } }
export const erro = (status: number, msg: string) => new ErroApp(status, msg)

/* ---------- senha (PBKDF2-SHA256) ---------- */
const ITER = 100_000
export async function hashSenha(senha: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const bits = await pbkdf2(senha, salt, ITER)
  return `pbkdf2$${ITER}$${b64(salt)}$${b64(bits)}`
}
export async function conferirSenha(senha: string, guardado: string): Promise<boolean> {
  const [alg, it, s, h] = guardado.split('$')
  if (alg !== 'pbkdf2') return false
  const a = b64(await pbkdf2(senha, unb64(s), Number(it)))
  if (a.length !== h.length) return false
  let dif = 0; for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ h.charCodeAt(i)
  return dif === 0
}
async function pbkdf2(senha: string, salt: Uint8Array<ArrayBuffer>, iter: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256))
}
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u))
const unb64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>

/* ---------- sessão (cookie HttpOnly; o banco guarda só o SHA-256 do token) ---------- */
const COOKIE = 'familypilot_sessao'
const DIAS_SESSAO = 30
export async function criarSessao(c: C, usuarioId: string) {
  const token = tokenAleatorio(32)
  const expira = new Date(Date.now() + DIAS_SESSAO * 864e5)
  await c.env.DB.prepare('INSERT INTO sessoes (id, usuario_id, expira_em) VALUES (?,?,?)')
    .bind(await sha256(token), usuarioId, expira.toISOString()).run()
  const seguro = new URL(c.req.url).protocol === 'https:'
  setCookie(c, COOKIE, token, { httpOnly: true, secure: seguro, sameSite: 'Lax', path: '/', expires: expira })
}
export async function encerrarSessao(c: C) {
  const token = getCookie(c, COOKIE)
  if (token) await c.env.DB.prepare('DELETE FROM sessoes WHERE id = ?').bind(await sha256(token)).run()
  deleteCookie(c, COOKIE, { path: '/' })
}
export async function lerSessao(c: C): Promise<Sessao | null> {
  const token = getCookie(c, COOKIE)
  if (!token) return null
  const r = await c.env.DB.prepare(
    `SELECT s.usuario_id, s.expira_em, u.nome, u.email FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id WHERE s.id = ?`)
    .bind(await sha256(token)).first<any>()
  if (!r || new Date(r.expira_em) < new Date()) return null
  return { usuarioId: r.usuario_id, nome: r.nome, email: r.email }
}
export const exigirLogin: MiddlewareHandler<App> = async (c, next) => {
  const s = await lerSessao(c)
  if (!s) return c.json({ erro: 'Faça login para continuar.' }, 401)
  c.set('sessao', s)
  await next()
}

/* ---------- acesso pago ---------- */
export const acessoLivre = (env: Env, email: string) =>
  (env.ACESSO_LIVRE ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase())

export type AcessoModulo = { ativo: boolean; ate: string | null }
export type Acesso = { ativo: boolean; ate: string | null; livre: boolean; modulos: Record<string, AcessoModulo> }
/** Por módulo, o acesso vale até o maior "acesso_ate" dos pedidos pagos (reembolsados não contam).
    "ativo"/"ate" do topo valem para qualquer módulo (quem tem algum módulo entra no app). */
export async function acessoDe(env: Env, usuarioId: string, email: string): Promise<Acesso> {
  if (acessoLivre(env, email)) {
    return { ativo: true, ate: null, livre: true, modulos: Object.fromEntries(MODULOS_IDS.map(id => [id, { ativo: true, ate: null }])) }
  }
  const rs = await env.DB.prepare(`SELECT modulo, MAX(acesso_ate) AS ate FROM pedidos WHERE usuario_id=? AND status='pago' GROUP BY modulo`).bind(usuarioId).all<{ modulo: string; ate: string }>()
  const ates: Record<string, string> = Object.fromEntries(rs.results.map(m => [m.modulo, m.ate]))
  const agora = agoraBanco()
  const modulos: Record<string, AcessoModulo> = {}
  let maior: string | null = null
  for (const id of MODULOS_IDS) {
    // o Pacote Família vale para todos os módulos; vale o prazo mais longo entre o módulo e o pacote
    const ate = [ates[id], ates[PACOTE]].filter(Boolean).sort().pop()
    if (!ate) continue
    modulos[id] = { ativo: ate > agora, ate: paraISO(ate) }
    if (!maior || ate > maior) maior = ate
  }
  return { ativo: !!maior && maior > agora, ate: maior ? paraISO(maior) : null, livre: false, modulos }
}

/** Oferta de boas-vindas: quem acabou de pagar o SOS Birra pode levar um módulo por preço especial, por tempo limitado.
    Vale uma vez, só para quem ainda não tem o módulo nem o pacote. */
export type Oferta = { modulo: string; preco: number; precoNormal: number; ate: string }
export async function ofertaDe(env: Env, usuarioId: string): Promise<Oferta | null> {
  let cfg: any
  try { cfg = JSON.parse(env.OFERTA_POS_COMPRA || 'null') } catch { return null }
  const normal = precosDe(env)[cfg?.modulo]
  if (!cfg || !MODULOS_IDS.includes(cfg.modulo) || cfg.modulo === MODULO_BASE || !Number.isInteger(cfg.preco) || cfg.preco < 500 || !normal || cfg.preco >= normal) return null
  const horas = Number.isFinite(cfg.horas) && cfg.horas > 0 ? Math.min(cfg.horas, 24 * 14) : 72
  const compra = await env.DB.prepare(`SELECT MAX(pago_em) AS em FROM pedidos WHERE usuario_id=? AND modulo=? AND status='pago'`).bind(usuarioId, MODULO_BASE).first<{ em: string | null }>()
  if (!compra?.em) return null
  const fim = paraBanco(new Date(new Date(paraISO(compra.em)).getTime() + horas * 36e5))
  if (fim <= agoraBanco()) return null
  const ja = await env.DB.prepare(`SELECT 1 FROM pedidos WHERE usuario_id=? AND modulo IN (?, ?) AND status='pago' LIMIT 1`).bind(usuarioId, cfg.modulo, PACOTE).first()
  if (ja) return null
  return { modulo: cfg.modulo, preco: cfg.preco, precoNormal: normal, ate: paraISO(fim) }
}
export const exigirAcesso: MiddlewareHandler<App> = async (c, next) => {
  const s = c.get('sessao')
  const a = await acessoDe(c.env, s.usuarioId, s.email)
  if (!a.ativo) return c.json({ erro: 'Seu acesso expirou ou ainda não foi liberado.', acesso: false }, 402)
  await next()
}
