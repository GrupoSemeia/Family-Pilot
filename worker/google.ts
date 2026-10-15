import type { Env } from './lib'

/* ---------- Entrar com o Google ----------
   O navegador recebe do Google um "ID token" (JWT assinado). O servidor confere a assinatura com as chaves públicas do
   Google e valida emissor, destinatário (nosso Client ID), validade e e-mail verificado. Nada vem "de confiança" do navegador. */

export type PerfilGoogle = { sub: string; email: string; nome: string }

const CERTS_PADRAO = 'https://www.googleapis.com/oauth2/v3/certs'
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com']
let cache: { url: string; ate: number; chaves: any[] } | null = null

const decodeB64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), c => c.charCodeAt(0))
const json = (s: string) => JSON.parse(new TextDecoder().decode(decodeB64u(s)))

async function chavesDoGoogle(env: Env, forcar = false): Promise<any[]> {
  const url = env.GOOGLE_CERTS_URL || CERTS_PADRAO
  if (!forcar && cache && cache.url === url && cache.ate > Date.now()) return cache.chaves
  const r = await fetch(url)
  if (!r.ok) throw new Error('certs')
  const d: any = await r.json()
  const max = /max-age=(\d+)/.exec(r.headers.get('cache-control') || '')
  cache = { url, ate: Date.now() + Math.min(Number(max?.[1] ?? 3600), 24 * 3600) * 1000, chaves: d.keys ?? [] }
  return cache.chaves
}

/** Devolve o perfil se o token é válido; senão lança Error (o chamador responde 401 sem detalhes). */
export async function verificarGoogle(env: Env, credential: string): Promise<PerfilGoogle> {
  if (!env.GOOGLE_CLIENT_ID) throw new Error('google desligado')
  const partes = String(credential).split('.')
  if (partes.length !== 3 || credential.length > 4000) throw new Error('formato')
  const cab = json(partes[0]), dados = json(partes[1])
  if (cab.alg !== 'RS256' || !cab.kid) throw new Error('alg')
  let chave = (await chavesDoGoogle(env)).find(k => k.kid === cab.kid)
  if (!chave) chave = (await chavesDoGoogle(env, true)).find(k => k.kid === cab.kid)   // o Google troca as chaves de tempos em tempos
  if (!chave) throw new Error('kid')
  const pub = await crypto.subtle.importKey('jwk', chave, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', pub, decodeB64u(partes[2]), new TextEncoder().encode(partes[0] + '.' + partes[1]))
  if (!ok) throw new Error('assinatura')
  const agora = Math.floor(Date.now() / 1000)
  if (!ISSUERS.includes(dados.iss)) throw new Error('iss')
  if (dados.aud !== env.GOOGLE_CLIENT_ID) throw new Error('aud')
  if (!(dados.exp > agora) || dados.iat > agora + 120) throw new Error('exp')
  if (dados.email_verified !== true && dados.email_verified !== 'true') throw new Error('email nao verificado')
  if (!dados.sub || !dados.email) throw new Error('dados')
  const email = String(dados.email).toLowerCase()
  return { sub: String(dados.sub), email, nome: String(dados.name || email.split('@')[0]).slice(0, 80) }
}
