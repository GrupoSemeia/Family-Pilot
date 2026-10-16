/* Cofre dos registros: AES-GCM com chave própria de cada conta, derivada (HKDF) do segredo DADOS_CHAVE e do id da conta.
   O texto cifrado é amarrado à conta e ao tipo de registro (dado autenticado), então uma linha copiada para outra conta não abre. */
import type { Env } from './lib'

export const cofreAtivo = (env: Env) => (env.DADOS_CHAVE ?? '').length >= 16

const enc = new TextEncoder()
function paraB64(u: Uint8Array): string { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s) }
const deB64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>

async function chaveDe(env: Env, usuarioId: string) {
  const base = await crypto.subtle.importKey('raw', enc.encode(env.DADOS_CHAVE!), 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: enc.encode(usuarioId), info: enc.encode('familypilot-dados-v1') }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
const amarra = (usuarioId: string, chave: string) => enc.encode(`${usuarioId}|${chave}`)

export async function cifrar(env: Env, usuarioId: string, chave: string, texto: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: amarra(usuarioId, chave) }, await chaveDe(env, usuarioId), enc.encode(texto)))
  return `v1.${paraB64(iv)}.${paraB64(ct)}`
}
export async function decifrar(env: Env, usuarioId: string, chave: string, guardado: string): Promise<string> {
  const [v, iv, ct] = guardado.split('.')
  if (v !== 'v1' || !iv || !ct) throw new Error('formato de registro desconhecido')
  const claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(iv), additionalData: amarra(usuarioId, chave) }, await chaveDe(env, usuarioId), deB64(ct))
  return new TextDecoder().decode(claro)
}
