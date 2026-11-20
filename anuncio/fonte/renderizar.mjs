// Gera os quadros do anúncio (1080x1920, 30 qps) a partir de anuncio.html.
// Uso: node anuncio/fonte/renderizar.mjs amostra 0.5 3 6   (PNGs soltos)   |   node anuncio/fonte/renderizar.mjs video   (todos os quadros)
import { spawn } from 'node:child_process'
import fs from 'node:fs'
const AQUI = new URL('.', import.meta.url).pathname
const sleep = ms => new Promise(r => setTimeout(r, ms))
const [modo, ...resto] = process.argv.slice(2)
const ch = spawn('/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--allow-file-access-from-files', '--hide-scrollbars', '--remote-debugging-port=9370', 'about:blank'], { stdio: 'ignore' })
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch('http://127.0.0.1:9370/json')).json(); if (tabs.length) break } catch {} await sleep(250) }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r)
let id = 0; const pend = new Map(); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } }
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
await send('Page.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'file://' + AQUI + 'anuncio.html' }); await sleep(2500)
const ev = async ex => { const r = await send('Runtime.evaluate', { expression: ex, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description)); return r.result.result?.value }
await ev('document.fonts.ready.then(() => 1)')
const pasta = AQUI + '../quadros/video/'
if (modo === 'amostra') {
  fs.mkdirSync(AQUI + '../quadros/amostras/', { recursive: true })
  for (const t of resto.map(Number)) { await ev('render(' + t + ')'); await sleep(120); fs.writeFileSync(AQUI + '../quadros/amostras/t' + String(t).replace('.', '_') + '.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64')) }
} else {
  fs.rmSync(pasta, { recursive: true, force: true }); fs.mkdirSync(pasta, { recursive: true })
  const QPS = 30, N = 25 * QPS
  for (let f = 0; f < N; f++) { await ev('render(' + (f / QPS) + ')'); fs.writeFileSync(pasta + 'q' + String(f).padStart(4, '0') + '.jpg', Buffer.from((await send('Page.captureScreenshot', { format: 'jpeg', quality: 92 })).result.data, 'base64')); if (f % 150 === 0) console.log('quadro', f, '/', N) }
}
console.log('pronto'); ch.kill(); process.exit(0)
