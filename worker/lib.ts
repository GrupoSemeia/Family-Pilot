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
  /** Preço "cheio" (o "de"), em centavos, que será cobrado depois do lançamento. Só é mostrado se for maior que o preço atual. */
  PRECOS_DE?: string
  /** E-mail (Resend): chave da API (segredo), remetente com domínio verificado e, se quiser, o endereço público do app. */
  RESEND_API_KEY?: string; EMAIL_DE?: string; APP_URL?: string; RESEND_URL?: string
  /** Cloudflare Email Service (binding send_email). Sem Resend configurado, é por aqui que os e-mails saem. */
  EMAIL?: { send(msg: { from: string | { email: string; name?: string }; to: string; subject: string; html?: string; text?: string }): Promise<unknown> }
  /** Entrar com o Google: Client ID público do tipo "Aplicativo da Web" (vazio = botão escondido). GOOGLE_CERTS_URL só para testes. */
  GOOGLE_CLIENT_ID?: string; GOOGLE_CERTS_URL?: string
  /** Segredo (npx wrangler secret put DADOS_CHAVE) que cifra os registros dos pais no banco. Sem ele a sincronização fica desligada. Nunca troque nem perca. */
  DADOS_CHAVE?: string
}
/** Visão de administrador: ver o app como um usuário com só estes módulos (e, se pedido, com a oferta de boas-vindas). */
export type Visao = { modulos: string[]; oferta: boolean }
export type Sessao = { usuarioId: string; nome: string; email: string; sessaoId: string; visao: Visao | null }
export type App = { Bindings: Env; Variables: { sessao: Sessao } }
export type C = Context<App>

/* ---------- produto ---------- */
export const PRECO_CENTAVOS = 4700          // R$ 47, SOS Birra, pagamento único
export const DIAS_ACESSO = 365              // acesso por 12 meses a partir da confirmação do pagamento
export const MODULO_BASE = 'birra'
/** Versão vigente dos Termos de Uso e da Política de Privacidade (data do texto em app/termos.html e app/privacidade.html). */
export const VERSAO_TERMOS = '2026-10-16'
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
    `SELECT s.id AS sid, s.usuario_id, s.expira_em, s.ver_como, u.nome, u.email FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id WHERE s.id = ?`)
    .bind(await sha256(token)).first<any>()
  if (!r || new Date(r.expira_em) < new Date()) return null
  let visao: Visao | null = null
  try { const v = r.ver_como ? JSON.parse(r.ver_como) : null; if (v && Array.isArray(v.modulos)) visao = { modulos: v.modulos.filter((m: unknown) => MODULOS_IDS.includes(String(m))), oferta: !!v.oferta } } catch { visao = null }
  return { usuarioId: r.usuario_id, nome: r.nome, email: r.email, sessaoId: r.sid, visao }
}
export const exigirLogin: MiddlewareHandler<App> = async (c, next) => {
  const s = await lerSessao(c)
  if (!s) return c.json({ erro: 'Faça login para continuar.' }, 401)
  c.set('sessao', s)
  await next()
}

/* ---------- acesso pago ---------- */
/** A recuperação de senha por e-mail só funciona com um remetente (EMAIL_DE) e um caminho de envio: Resend (segredo) ou Cloudflare Email Service (binding). */
export const emailAtivo = (env: Env) => !!env.EMAIL_DE && !!(env.RESEND_API_KEY || env.EMAIL)

export const acessoLivre = (env: Env, email: string) =>
  (env.ACESSO_LIVRE ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase())

/** Preço "de" de cada produto (valor cheio, mostrado riscado ao lado do preço de lançamento). Ex.: {"sono":7700}. */
export function precosCheios(env: Env): Record<string, number> {
  const atual = precosDe(env), out: Record<string, number> = {}
  try {
    const x = JSON.parse(env.PRECOS_DE || '{}')
    for (const id of PRODUTOS_IDS) if (Number.isInteger(x[id]) && atual[id] && x[id] > atual[id]) out[id] = x[id]
  } catch { /* JSON inválido: nenhum preço "de" */ }
  return out
}

export type AcessoModulo = { ativo: boolean; ate: string | null }
export type Acesso = { ativo: boolean; ate: string | null; livre: boolean; modulos: Record<string, AcessoModulo>; livrePendente?: boolean; simulado?: boolean }
/** Por módulo, o acesso vale até o maior "acesso_ate" dos pedidos pagos (reembolsados não contam).
    "ativo"/"ate" do topo valem para qualquer módulo (quem tem algum módulo entra no app). */
/** Super usuário de verdade: e-mail na lista ACESSO_LIVRE **e** confirmado. */
export async function ehSuper(env: Env, usuarioId: string, email: string): Promise<boolean> {
  if (!acessoLivre(env, email)) return false
  const v = await env.DB.prepare('SELECT email_verificado_em AS v FROM usuarios WHERE id=?').bind(usuarioId).first<{ v: string | null }>()
  return !!v?.v
}

/** Acesso como um usuário comum com só estes módulos teria (para o administrador conferir a experiência). */
export function acessoSimulado(visao: Visao): Acesso {
  const ate = paraISO(paraBanco(new Date(Date.now() + DIAS_ACESSO * 864e5)))
  const modulos: Record<string, AcessoModulo> = {}
  for (const id of visao.modulos) modulos[id] = { ativo: true, ate }
  return { ativo: visao.modulos.length > 0, ate: visao.modulos.length ? ate : null, livre: false, modulos, simulado: true }
}

/** A visão só vale para super usuário confirmado; para qualquer outro, ignora. */
export async function visaoValida(env: Env, s: Sessao): Promise<Visao | null> {
  return s.visao && await ehSuper(env, s.usuarioId, s.email) ? s.visao : null
}

/** Acesso da sessão: o real, ou o simulado quando o super usuário está no modo "ver como usuário". */
export async function acessoDaSessao(env: Env, s: Sessao): Promise<Acesso> {
  const v = await visaoValida(env, s)
  return v ? acessoSimulado(v) : acessoDe(env, s.usuarioId, s.email)
}

export async function acessoDe(env: Env, usuarioId: string, email: string): Promise<Acesso> {
  // Acesso liberado pela equipe (super usuário): todos os módulos, sem prazo e sem pagamento. Só vale se o e-mail foi confirmado
  // (login com o Google ou "Esqueci minha senha"): sem isso, qualquer pessoa poderia criar conta com o e-mail de alguém da equipe.
  let livrePendente = false
  if (acessoLivre(env, email)) {
    const v = await env.DB.prepare('SELECT email_verificado_em AS v FROM usuarios WHERE id=?').bind(usuarioId).first<{ v: string | null }>()
    if (v?.v) return { ativo: true, ate: null, livre: true, modulos: Object.fromEntries(MODULOS_IDS.map(id => [id, { ativo: true, ate: null }])) }
    livrePendente = true
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
  return { ativo: !!maior && maior > agora, ate: maior ? paraISO(maior) : null, livre: false, modulos, ...(livrePendente ? { livrePendente } : {}) }
}

/** Oferta de boas-vindas: quem acabou de pagar o SOS Birra pode levar um módulo por preço especial, por tempo limitado.
    Vale uma vez, só para quem ainda não tem o módulo nem o pacote. */
export type Oferta = { modulo: string; preco: number; precoNormal: number; ate: string }
function ofertaConfig(env: Env): { modulo: string; preco: number; normal: number; horas: number } | null {
  let cfg: any
  try { cfg = JSON.parse(env.OFERTA_POS_COMPRA || 'null') } catch { return null }
  const normal = precosDe(env)[cfg?.modulo]
  if (!cfg || !MODULOS_IDS.includes(cfg.modulo) || cfg.modulo === MODULO_BASE || !Number.isInteger(cfg.preco) || cfg.preco < 500 || !normal || cfg.preco >= normal) return null
  const horas = Number.isFinite(cfg.horas) && cfg.horas > 0 ? Math.min(cfg.horas, 24 * 14) : 72
  return { modulo: cfg.modulo, preco: cfg.preco, normal, horas }
}

/** Oferta como o usuário a veria, para o modo "ver como usuário" (sem consultar compras). */
export function ofertaSimulada(env: Env, visao: Visao): Oferta | null {
  const cfg = ofertaConfig(env)
  if (!cfg || !visao.oferta || !visao.modulos.includes(MODULO_BASE) || visao.modulos.includes(cfg.modulo)) return null
  return { modulo: cfg.modulo, preco: cfg.preco, precoNormal: cfg.normal, ate: paraISO(paraBanco(new Date(Date.now() + cfg.horas * 36e5))) }
}

export async function ofertaDe(env: Env, usuarioId: string): Promise<Oferta | null> {
  const cfg = ofertaConfig(env)
  if (!cfg) return null
  const compra = await env.DB.prepare(`SELECT MAX(pago_em) AS em FROM pedidos WHERE usuario_id=? AND modulo=? AND status='pago'`).bind(usuarioId, MODULO_BASE).first<{ em: string | null }>()
  if (!compra?.em) return null
  const fim = paraBanco(new Date(new Date(paraISO(compra.em)).getTime() + cfg.horas * 36e5))
  if (fim <= agoraBanco()) return null
  const ja = await env.DB.prepare(`SELECT 1 FROM pedidos WHERE usuario_id=? AND modulo IN (?, ?) AND status='pago' LIMIT 1`).bind(usuarioId, cfg.modulo, PACOTE).first()
  if (ja) return null
  return { modulo: cfg.modulo, preco: cfg.preco, precoNormal: cfg.normal, ate: paraISO(fim) }
}
export const exigirAcesso: MiddlewareHandler<App> = async (c, next) => {
  const s = c.get('sessao')
  const a = await acessoDaSessao(c.env, s)
  if (!a.ativo) return c.json({ erro: 'Seu acesso expirou ou ainda não foi liberado.', acesso: false }, 402)
  await next()
}
