/** Se a pessoa entrou pelo endereço sem "www" (ex.: familypilot.com.br), devolve para onde mandá-la (o endereço principal
    de APP_URL, ex.: https://www.familypilot.com.br). 301 nos GET e 308 nos demais, para não perder o método. Senão, null. */
export function redirecionarSemWww(appUrl: string | undefined, url: string, metodo: string): { destino: string; status: 301 | 308 } | null {
  if (!appUrl) return null
  let principal: URL, u: URL
  try { principal = new URL(appUrl); u = new URL(url) } catch { return null }
  if (!principal.hostname.startsWith('www.') || u.hostname !== principal.hostname.slice(4)) return null
  return { destino: `${principal.origin}${u.pathname}${u.search}`, status: metodo === 'GET' || metodo === 'HEAD' ? 301 : 308 }
}
