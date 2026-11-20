/* Medição de anúncios: envia à Meta, pelo servidor (API de Conversões), a confirmação de uma compra.
   Regras:
   - Só envia se a pessoa aceitou o aviso de cookies da página de vendas. Prova disso: o navegador mandou os cookies _fbp/_fbc
     (o Pixel só grava esses cookies depois do aceite). Sem eles, nada sai daqui.
   - Só sai o necessário: e-mail em hash (SHA-256), os dois identificadores de cookie, valor, moeda e o módulo comprado.
     Nunca os registros dos pais nem dados dos filhos.
   - Nunca atrapalha o pagamento: qualquer falha aqui é registrada no log e ignorada. */
import type { Env } from './lib'

const FBP = /^fb\.[0-2]\.\d{10,14}\.\d{1,20}$/
const FBC = /^fb\.[0-2]\.\d{10,14}\.[A-Za-z0-9_-]{1,500}$/

function cookieDe(cabecalho: string | undefined, nome: string): string | null {
  for (const parte of (cabecalho ?? '').split(';')) {
    const i = parte.indexOf('=')
    if (i > 0 && parte.slice(0, i).trim() === nome) return parte.slice(i + 1).trim()
  }
  return null
}

/** Lê _fbp e _fbc do cabeçalho Cookie. Só aceita o formato que a Meta gera (descarta qualquer outra coisa). */
export function idsMeta(cabecalhoCookie: string | undefined): { fbp: string | null; fbc: string | null } {
  const fbp = cookieDe(cabecalhoCookie, '_fbp'), fbc = cookieDe(cabecalhoCookie, '_fbc')
  return { fbp: fbp && FBP.test(fbp) ? fbp : null, fbc: fbc && FBC.test(fbc) ? fbc : null }
}

async function sha256(texto: string): Promise<string> {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')
}

/** Envia o evento Purchase do pedido. Chamada uma vez, quando o pagamento é confirmado. Nunca lança erro. */
export async function enviarCompraMeta(env: Env, pedidoId: string): Promise<void> {
  try {
    if (!env.META_PIXEL_ID || !env.META_CAPI_TOKEN) return
    const p = await env.DB.prepare(
      `SELECT p.valor, p.modulo, p.fbp, p.fbc, p.pago_em, p.meta_enviado_em, u.email
         FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id WHERE p.id = ?`).bind(pedidoId).first<any>()
    if (!p || p.meta_enviado_em) return
    if (!p.fbp && !p.fbc) return   // sem cookie de anúncio = sem consentimento: não envia nada

    const tempo = p.pago_em ? Date.parse(String(p.pago_em).replace(' ', 'T') + 'Z') : Date.now()
    const user_data: Record<string, unknown> = {}
    if (p.email) user_data.em = [await sha256(String(p.email).trim().toLowerCase())]
    if (p.fbp) user_data.fbp = p.fbp
    if (p.fbc) user_data.fbc = p.fbc

    const corpo: Record<string, unknown> = {
      data: [{
        event_name: 'Purchase',
        event_time: Math.floor((Number.isFinite(tempo) ? tempo : Date.now()) / 1000),
        event_id: pedidoId,   // o mesmo pedido nunca conta duas vezes
        action_source: 'website',
        event_source_url: `${(env.APP_URL || 'https://www.familypilot.com.br').replace(/\/$/, '')}/`,
        user_data,
        custom_data: { currency: 'BRL', value: Number(p.valor) / 100, content_type: 'product', content_ids: [String(p.modulo)], order_id: pedidoId },
      }],
    }
    // Com META_TEST_EVENT_CODE (da aba "Eventos de teste"), o evento aparece lá e não conta como venda de verdade.
    if (env.META_TEST_EVENT_CODE) corpo.test_event_code = env.META_TEST_EVENT_CODE

    const base = (env.META_URL || 'https://graph.facebook.com').replace(/\/$/, '')
    const r = await fetch(`${base}/${env.META_GRAPH_VERSION || 'v25.0'}/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_CAPI_TOKEN)}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo), signal: AbortSignal.timeout(4000),
    })
    if (!r.ok) { console.error('Meta CAPI recusou o evento', r.status, (await r.text().catch(() => '')).slice(0, 300)); return }
    await env.DB.prepare(`UPDATE pedidos SET meta_enviado_em = datetime('now') WHERE id = ?`).bind(pedidoId).run()
  } catch (e) {
    console.error('Meta CAPI: falha ao enviar', e instanceof Error ? e.message : e)
  }
}
