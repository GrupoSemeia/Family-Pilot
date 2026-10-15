import type { Env } from './lib'

/* Envio de e-mail (recuperação de senha). Dois caminhos, nesta ordem:
   1. Resend, se o segredo RESEND_API_KEY existir (escolha explícita);
   2. Cloudflare Email Service, pelo binding EMAIL (sem chave: o domínio é verificado no painel da Cloudflare).
   Remetente: EMAIL_DE, no formato "Nome <endereco@dominio>" ou só o endereço. */

export type Mensagem = { para: string; assunto: string; html: string; texto: string }

/** "FamilyPilot <nao-responda@familypilot.com.br>" → { email, name } */
export function remetente(emailDe: string): { email: string; name?: string } {
  const m = /^\s*(?:"?([^"<]*?)"?\s*)?<([^<>\s]+)>\s*$/.exec(emailDe)
  if (m) return m[1] ? { email: m[2], name: m[1].trim() } : { email: m[2] }
  return { email: emailDe.trim() }
}

export const provedorDeEmail = (env: Env): 'resend' | 'cloudflare' | null =>
  !env.EMAIL_DE ? null : env.RESEND_API_KEY ? 'resend' : env.EMAIL ? 'cloudflare' : null

/** Não lança erro: se o envio falhar, a pessoa pede de novo. O motivo vai para o log (sem dados pessoais). */
export async function enviarEmail(env: Env, msg: Mensagem): Promise<void> {
  const prov = provedorDeEmail(env)
  try {
    if (prov === 'resend') {
      const r = await fetch(`${(env.RESEND_URL || 'https://api.resend.com').replace(/\/$/, '')}/emails`, {
        method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: env.EMAIL_DE, to: [msg.para], subject: msg.assunto, html: msg.html, text: msg.texto }),
      })
      if (!r.ok) console.warn('e-mail recusado pelo Resend:', r.status)
    } else if (prov === 'cloudflare') {
      await env.EMAIL!.send({ from: remetente(env.EMAIL_DE!), to: msg.para, subject: msg.assunto, html: msg.html, text: msg.texto })
    }
  } catch (e: any) {
    // códigos úteis do Cloudflare: E_SENDER_NOT_VERIFIED (domínio ainda não habilitado), E_DAILY_LIMIT_EXCEEDED, E_RATE_LIMIT_EXCEEDED
    console.warn('falha ao enviar e-mail:', e?.code || '', e?.message || e)
  }
}
