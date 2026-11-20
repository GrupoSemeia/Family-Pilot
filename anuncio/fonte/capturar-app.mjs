// Grava as telas reais do app (versão local, mesmo código da produção) para o anúncio. Uso: node anuncio/fonte/capturar-app.mjs
import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
const SAIDA = new URL('../quadros/', import.meta.url).pathname
const sleep = ms => new Promise(r => setTimeout(r, ms))
const S = Date.now(), B = 'http://127.0.0.1:8834', EM = `anuncio${S}@teste.com`
const wr = spawn('npx', ['wrangler', 'dev', '--port', '8834'], { stdio: 'ignore', detached: true })
for (let i = 0; i < 90; i++) { try { await fetch(B + '/api/x'); break } catch { await sleep(500) } }
await fetch(B + '/api/auth/cadastro', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nome: 'Ana', email: EM, senha: 'senha-forte-1', aceite: true }) })
execFileSync('npx', ['wrangler', 'd1', 'execute', 'family-pilot', '--local', '--command', `INSERT INTO pedidos (id, usuario_id, asaas_pagamento, valor, status, pago_em, acesso_ate, modulo) SELECT 'pad${S}', id, 'pay_ad${S}', 4700, 'pago', datetime('now'), datetime('now','+300 days'), 'birra' FROM usuarios WHERE email='${EM}'`], { stdio: 'ignore' })
const ch = spawn('/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=9369', 'about:blank'], { stdio: 'ignore' })
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch('http://127.0.0.1:9369/json')).json(); if (tabs.length) break } catch {} await sleep(250) }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r)
let id = 0; const pend = new Map(); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } }
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async ex => (await send('Runtime.evaluate', { expression: ex, awaitPromise: true, returnByValue: true })).result.result?.value
const W = 390, H = 700
await send('Page.enable'); await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 3, mobile: true })
await send('Page.navigate', { url: B + '/entrar' }); await sleep(1500)
await ev(`document.querySelector('#a-email').value=${JSON.stringify(EM)};document.querySelector('#a-senha').value='senha-forte-1';document.querySelector('#f-auth').requestSubmit()`); await sleep(2800)
await ev(`localStorage.setItem('familypilot.v1.'+${JSON.stringify(EM)}, JSON.stringify({diario:[],radar:[],idade:'4-5',guiado:true}))`)
await send('Page.navigate', { url: B + '/#/plano' }); await sleep(2500)
const rects = {}
const rect = (sel) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}})()`)
const foto = async (nome, alvos = {}) => { await sleep(350); fs.writeFileSync(SAIDA + nome + '.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64')); rects[nome] = {}; for (const [k, sel] of Object.entries(alvos)) rects[nome][k] = await rect(sel) }
// idade
await foto('a1-idade', { chip: '[data-act=pick][data-k=idade][data-v="4-5"]' })
await ev(`document.querySelector('[data-act=pick][data-k=idade][data-v="4-5"]').classList.add('on')`)
await foto('a2-idade-escolhida')
// motivo
await ev(`document.querySelector('[data-act=pick][data-k=idade][data-v="4-5"]').click()`); await sleep(400)
await foto('b1-motivo', { opcao: '[data-act=pick][data-k=motivo][data-v=nao]' })
await ev(`document.querySelector('[data-act=pick][data-k=motivo][data-v=nao]').classList.add('on')`)
await foto('b2-motivo-escolhido')
// local
await ev(`document.querySelector('[data-act=pick][data-k=motivo][data-v=nao]').click()`); await sleep(400)
await foto('c1-local', { opcao: '[data-act=pick][data-k=local][data-v=mercado]' })
await ev(`document.querySelector('[data-act=pick][data-k=local][data-v=mercado]').click()`); await sleep(400)
await ev(`window.scrollTo(0, 215)`)
await foto('c2-local-escolhido', { botao: '[data-act=gerar]', opcao: '[data-act=pick][data-k=local][data-v=mercado]' })
// plano
await ev(`document.querySelector('[data-act=gerar]').click()`); await sleep(600)
await ev(`window.scrollTo(0, 0)`)
await foto('r1-plano-topo', { passos: '.bloco .passos li' })
await ev(`window.scrollTo(0, document.querySelector('.bloco .passos').getBoundingClientRect().top + scrollY - 90)`)
await foto('r2-primeiros-passos', { passo1: '.bloco .passos li', secao: '.bloco' })
await ev(`window.scrollTo(0, document.querySelector('.bloco.evitar').getBoundingClientRect().top + scrollY - 120)`)
await foto('r3-evitar', { evitar: '.bloco.evitar' })
await ev(`window.scrollTo(0, [...document.querySelectorAll('.bloco h2')].find(h => /Frase/.test(h.textContent)).getBoundingClientRect().top + scrollY - 110)`)
await foto('r4-frase', { frase: '.frase', secao: '.bloco:has(.frase)' })
fs.writeFileSync(SAIDA + 'retangulos.json', JSON.stringify({ largura: W, altura: H, escala: 3, rects }, null, 1))
console.log('ok', Object.keys(rects).join(' ')); ch.kill(); try { process.kill(-wr.pid, 'SIGTERM') } catch {} process.exit(0)
