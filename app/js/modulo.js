/* Motor dos módulos do FamilyPilot (Sono, Telas, Alimentação, Limites, Escola, Adolescência).
   Cada módulo vem do servidor como dados (worker/modulos/*.ts) e este arquivo desenha as ferramentas de cada tipo:
   situacoes, rotinaSono, combinado, ideias, modelo, registro e ajuda. Registros ficam no aparelho e, cifrados, na conta (sync.js). */
(function () {
  let X = null;        // utilidades do app (esc, toast, copiar, reRender, email, aviso)
  let MODS = {};       // módulos liberados: id → módulo
  let S = {};          // estado de cada tela (zera ao trocar de rota)
  let st = null;       // armazenamento local da conta

  const byId = (arr, id) => (arr || []).find((x) => x.id === id);
  const hojeISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const fmtDia = (iso) => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(iso || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
  const hm = (min) => { min = ((min % 1440) + 1440) % 1440; return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); };
  const paraMin = (t) => { const m = /^(\d\d):(\d\d)$/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; };

  /* ---------- armazenamento (uma chave por conta) ---------- */
  const KEY = () => 'familypilot.m.' + X.email;
  function carregar() { try { st = Object.assign({ faixa: {}, reg: {} }, JSON.parse(localStorage.getItem(KEY()) || '{}')); } catch (e) { st = { faixa: {}, reg: {} }; } }
  function salvar() { try { localStorage.setItem(KEY(), JSON.stringify(st)); } catch (e) { /* sem armazenamento */ } FamilySync.agendar('modulos'); }
  const faixaDe = (m) => { const f = st.faixa[m.id]; return byId(m.faixas, f) ? f : m.faixas[Math.min(1, m.faixas.length - 1)].id; };
  const regs = (m, f) => (st.reg[m.id + '/' + f.id] = st.reg[m.id + '/' + f.id] || []);
  const estado = (m, f, ini) => (S[m.id + '/' + f.id] = S[m.id + '/' + f.id] || ini());

  /* ---------- peças de tela ---------- */
  const E = (s) => X.esc(s);
  const chip = (act, k, v, label, on) => `<button type="button" class="chip${on ? ' on' : ''}" data-m="${act}" data-k="${k}" data-v="${E(v)}" aria-pressed="${!!on}">${E(label)}</button>`;
  const faixaChips = (m, sel) => `<div class="chips">${m.faixas.map((f) => chip('faixa', 'faixa', f.id, f.rotulo, f.id === sel)).join('')}</div>`;
  const voltar = (hash, txt) => `<a class="voltar" href="${hash}">← ${txt}</a>`;
  const frase = (txt, titulo) => `<div class="frase"><small>${E(titulo)}</small><p>“${E(txt)}”</p><button class="mini" data-m="copiar" data-t="${E(txt)}" aria-label="Copiar: ${E(titulo)}">Copiar</button></div>`;
  const lista = (itens, cls) => `<ul class="${cls || 'lista'}">${itens.map((i) => `<li>${E(i)}</li>`).join('')}</ul>`;
  const noFaixa = (it, f) => !it.faixas || it.faixas.includes(f);
  const rotaFerr = (m, f) => `#/m/${m.id}/${f.id}`;

  /* ---------- páginas do módulo ---------- */
  function home(m) {
    const ajuda = byId(m.ferramentas, 'ajuda');
    return `${voltar('#/modulos', 'Módulos')}
    <section class="hero-app"><p class="eyebrow">FamilyPilot · ${E(m.nome)}</p><h1>${m.icone} ${E(m.nome)}</h1><p>${E(m.resumo)}</p></section>
    ${m.ajudaDestaque && ajuda ? `<a class="alerta" href="${rotaFerr(m, ajuda)}" style="display:block;text-decoration:none;color:inherit"><b>Preocupado com a segurança do seu filho?</b> Veja os sinais de alerta e onde pedir ajuda agora →</a>` : ''}
    <h2 class="sec">Ferramentas</h2>
    <div class="grid">${m.ferramentas.map((f) => `<a class="tool" href="${rotaFerr(m, f)}"><b>${f.icone} ${E(f.nome)}</b><span>${E(f.descricao)}</span></a>`).join('')}</div>
    ${X.aviso}`;
  }

  function ferramenta(m, f) {
    const topo = `${voltar('#/m/' + m.id, m.nome)}`;
    const corpo = ({ situacoes, rotinaSono, combinado, ideias, modelo, registro, ajuda })[f.tipo];
    return corpo ? topo + corpo(m, f) : topo + '<p class="vazio">Esta ferramenta ainda não está disponível.</p>';
  }

  /* situações: faixa → situação → plano */
  function situacoes(m, f) {
    const s = estado(m, f, () => ({ step: 0, sit: null }));
    const faixa = faixaDe(m);
    if (s.step === 0) {
      return `<h1>${E(f.nome)}</h1><p class="lead">${E(f.descricao)}</p><h2 class="sec">Idade</h2>${faixaChips(m, faixa)}
      <button class="btn" data-m="sit-ir">Continuar</button>`;
    }
    if (s.step === 1) {
      return `<button class="voltar" data-m="sit-voltar">← Idade</button><h1>O que está acontecendo?</h1>
      <div class="opcoes">${f.situacoes.map((x) => `<button class="opcao" data-m="sit" data-v="${x.id}">${E(x.nome)}</button>`).join('')}</div>`;
    }
    const x = byId(f.situacoes, s.sit), pf = f.porFaixa[faixa], fr = x.frases[faixa];
    return `<button class="voltar" data-m="sit-voltar">← Outra situação</button>
    <p class="eyebrow">${E(f.nome)} · ${E(byId(m.faixas, faixa).rotulo)}</p><h1>${E(x.nome)}</h1>
    ${x.alerta ? `<div class="alerta"><b>Atenção.</b> ${E(x.alerta)}</div>` : ''}
    <p class="lead">${E(x.leitura)}</p>
    <section class="bloco"><h2>1. Fazer agora</h2><ol class="passos">${x.fazer.map((i) => `<li>${E(i)}</li>`).join('')}</ol></section>
    <section class="bloco"><h2>2. Frases que podem ajudar</h2>${frase(fr.a, 'Para acolher ou abrir a conversa')}${frase(fr.l, 'Para manter o limite ou combinar')}<p class="dica">${E(pf.dica)}</p></section>
    <section class="bloco evitar"><h2>3. Evitar</h2>${lista(x.evitar, 'lista x')}</section>
    <section class="bloco"><h2>4. Depois</h2>${lista(x.depois)}</section>
    <div class="card"><b>O que esperar nessa idade</b><p>${E(pf.expectativa)}</p></div>
    ${X.aviso}`;
  }

  /* rotina da noite (sono) */
  function rotinaSono(m, f) {
    const faixa = faixaDe(m), pf = f.porFaixa[faixa];
    const s = estado(m, f, () => ({ faixa: null, dormir: null, acordar: null }));
    if (s.faixa !== faixa) { s.faixa = faixa; s.dormir = pf.dormir; s.acordar = pf.acordar; }
    const d = paraMin(s.dormir), a = paraMin(s.acordar);
    let status = '', passos = [];
    if (d !== null && a !== null) {
      const horas = (((a - d) % 1440) + 1440) % 1440 / 60;
      const [mn, mx] = pf.horas;
      status = horas < mn ? `Dá ${horas.toFixed(1).replace('.', ',')} h de sono, abaixo do recomendado (${mn} a ${mx} h). Experimente deitar mais cedo ou acordar um pouco mais tarde.`
        : horas > mx ? `Dá ${horas.toFixed(1).replace('.', ',')} h de sono, acima do recomendado (${mn} a ${mx} h). Tudo bem se ele acorda bem-disposto.`
        : `Dá ${horas.toFixed(1).replace('.', ',')} h de sono, dentro do recomendado (${mn} a ${mx} h).`;
      passos = f.passos.filter((p) => noFaixa(p, faixa)).sort((x, y) => y.antes - x.antes).map((p) => ({ hora: hm(d - p.antes), texto: p.texto }));
    }
    const texto = passos.map((p) => `${p.hora}  ${p.texto}`).join('\n');
    return `<h1>${E(f.nome)}</h1><p class="lead">${E(f.descricao)}</p><h2 class="sec">Idade</h2>${faixaChips(m, faixa)}
    <div class="form"><label class="campo">Hora de apagar a luz<input type="time" data-m="hora" data-k="dormir" value="${E(s.dormir)}"></label>
    <label class="campo">Hora de acordar<input type="time" data-m="hora" data-k="acordar" value="${E(s.acordar)}"></label></div>
    ${status ? `<div class="card"><b>Horas de sono</b><p>${E(status)}</p><p class="dica">${E(pf.dica)}</p></div>` : ''}
    ${passos.length ? `<section class="bloco"><h2>Rotina da noite</h2><ul class="tempo">${passos.map((p) => `<li><b>${p.hora}</b><span>${E(p.texto)}</span></li>`).join('')}</ul>
    <button class="mini" data-m="copiar" data-t="${E('Rotina da noite\n' + texto)}" aria-label="Copiar a rotina da noite">Copiar rotina</button></section>` : ''}
    ${X.aviso}`;
  }

  /* combinado da família */
  function padroesCombinado(f, faixa) {
    const sel = {}, esc = {};
    f.secoes.forEach((sc) => {
      const its = sc.itens.filter((i) => noFaixa(i, faixa));
      if (sc.modo === 'multi') its.forEach((i) => { if (i.padrao) sel[i.id] = true; });
      else { const p = its.find((i) => i.padrao) || its[0]; if (p) esc[sc.id] = p.id; }
    });
    return { sel, esc };
  }
  function textoCombinado(f, s, faixa) {
    const linhas = [f.titulo + (s.nome ? ' de ' + s.nome : ''), '', f.intro, ''];
    f.secoes.forEach((sc) => {
      const its = sc.itens.filter((i) => noFaixa(i, faixa));
      const marcados = sc.modo === 'multi' ? its.filter((i) => s.sel[i.id]) : its.filter((i) => s.esc[sc.id] === i.id);
      if (!marcados.length) return;
      linhas.push(sc.titulo + ':');
      marcados.forEach((i) => linhas.push('- ' + i.texto));
      linhas.push('');
    });
    linhas.push(f.fecho, '', 'Data: ' + fmtDia(hojeISO()), '', 'Assinaturas: ______________________   ______________________');
    return linhas.join('\n');
  }
  function combinado(m, f) {
    const faixa = faixaDe(m);
    const s = estado(m, f, () => ({ faixa: null, sel: {}, esc: {}, nome: '' }));
    if (s.faixa !== faixa) { Object.assign(s, padroesCombinado(f, faixa)); s.faixa = faixa; }
    const secoes = f.secoes.map((sc) => {
      const its = sc.itens.filter((i) => noFaixa(i, faixa));
      if (!its.length) return '';
      return `<section class="bloco"><h2>${E(sc.titulo)}</h2>${sc.dica && sc.dica[faixa] ? `<p class="dica">${E(sc.dica[faixa])}</p>` : ''}
      ${its.map((i) => sc.modo === 'multi'
        ? `<label class="opt"><input type="checkbox" data-m="chk" data-id="${i.id}" ${s.sel[i.id] ? 'checked' : ''}><span>${E(i.texto)}</span></label>`
        : `<label class="opt"><input type="radio" name="r-${sc.id}" data-m="rad" data-s="${sc.id}" data-id="${i.id}" ${s.esc[sc.id] === i.id ? 'checked' : ''}><span>${E(i.texto)}</span></label>`).join('')}</section>`;
    }).join('');
    return `<h1>${E(f.nome)}</h1><p class="lead">${E(f.descricao)}</p><h2 class="sec">Idade</h2>${faixaChips(m, faixa)}
    <label class="campo">Nome da criança (opcional)<input data-m="nome" value="${E(s.nome)}" maxlength="40"></label>
    ${secoes}
    <section class="bloco"><h2>Seu combinado</h2><pre class="saida" id="m-saida">${E(textoCombinado(f, s, faixa))}</pre>
    <button class="btn" data-m="copiar-saida">Copiar combinado</button></section>${X.aviso}`;
  }

  /* ideias */
  function ideias(m, f) {
    const s = estado(m, f, () => ({ cat: 'todas' }));
    const faixa = faixaDe(m);
    const itens = f.itens.filter((i) => noFaixa(i, faixa) && (s.cat === 'todas' || i.categoria === s.cat));
    return `<h1>${E(f.nome)}</h1><p class="lead">${E(f.descricao)}</p><h2 class="sec">Idade</h2>${faixaChips(m, faixa)}
    <h2 class="sec">Tipo</h2><div class="chips">${chip('cat', 'cat', 'todas', 'Todas', s.cat === 'todas')}${f.categorias.map((c) => chip('cat', 'cat', c.id, c.nome, s.cat === c.id)).join('')}</div>
    ${itens.length ? `<ul class="ideias">${itens.map((i) => `<li>${E(i.texto)}</li>`).join('')}</ul>` : '<p class="vazio">Nenhuma ideia para essa combinação.</p>'}${X.aviso}`;
  }

  /* modelos de texto */
  function textoModelo(mod, vals) {
    const opc = new Set(mod.campos.filter((c) => c.opcional).map((c) => c.id));
    return mod.texto.split('\n\n').filter((par) => {
      const ids = [...par.matchAll(/\{(\w+)\}/g)].map((x) => x[1]);
      return !ids.some((id) => opc.has(id) && !(vals[id] || '').trim());
    }).map((par) => par.replace(/\{(\w+)\}/g, (_, id) => (vals[id] || '').trim() || '[' + (byId(mod.campos, id) || { rotulo: id }).rotulo + ']')).join('\n\n');
  }
  function modelo(m, f) {
    const s = estado(m, f, () => ({ id: f.modelos[0].id, vals: {} }));
    const mod = byId(f.modelos, s.id);
    const vals = (s.vals[mod.id] = s.vals[mod.id] || {});
    return `<h1>${E(f.nome)}</h1><p class="lead">${E(f.descricao)}</p>
    <div class="chips">${f.modelos.map((x) => chip('mod', 'mod', x.id, x.nome, x.id === mod.id)).join('')}</div>
    <div class="form">${mod.campos.map((c) => `<label class="campo">${E(c.rotulo)}${c.opcional ? ' (opcional)' : ''}${c.area
      ? `<textarea data-m="campo" data-id="${c.id}" rows="3" maxlength="600" placeholder="${E(c.exemplo || '')}">${E(vals[c.id] || '')}</textarea>`
      : `<input data-m="campo" data-id="${c.id}" maxlength="120" placeholder="${E(c.exemplo || '')}" value="${E(vals[c.id] || '')}">`}</label>`).join('')}</div>
    <section class="bloco"><h2>Sua mensagem</h2><pre class="saida" id="m-saida">${E(textoModelo(mod, vals))}</pre>
    <button class="btn" data-m="copiar-saida">Copiar mensagem</button></section>${X.aviso}`;
  }

  /* registros (diários) */
  function rotuloValor(c, v) {
    if (v == null || v === '') return '';
    if (c.tipo === 'escolha') { const o = byId(c.opcoes, v); return o ? o.nome : v; }
    if (c.tipo === 'data') return fmtDia(v);
    if (c.tipo === 'numero') return v + ' min';
    return String(v);
  }
  function resumoRegistro(f, lista) {
    const out = [];
    const ult = lista.slice(0, 7);
    if (f.resumo === 'sono') {
      const dur = ult.map((r) => { const d = paraMin(r.v.dormiu), a = paraMin(r.v.acordou); return d === null || a === null ? null : (((a - d) % 1440) + 1440) % 1440 / 60; }).filter((x) => x !== null);
      if (dur.length >= 2) out.push(`Média das últimas ${dur.length} noites: ${(dur.reduce((x, y) => x + y, 0) / dur.length).toFixed(1).replace('.', ',')} h de sono.`);
    }
    if (f.resumo === 'minutos') {
      const mm = ult.map((r) => Number(r.v.minutos)).filter((x) => x >= 0 && isFinite(x));
      if (mm.length >= 2) out.push(`Média dos últimos ${mm.length} registros: ${Math.round(mm.reduce((x, y) => x + y, 0) / mm.length)} minutos por dia.`);
    }
    if (lista.length >= 3) {
      f.campos.filter((c) => c.tipo === 'escolha' && c.insight).forEach((c) => {
        const cont = {};
        lista.forEach((r) => { if (r.v[c.id]) cont[r.v[c.id]] = (cont[r.v[c.id]] || 0) + 1; });
        const top = Object.entries(cont).sort((a, b) => b[1] - a[1])[0];
        if (top) out.push(`${c.rotulo}: mais comum "${rotuloValor(c, top[0])}" (${top[1]} de ${lista.length}).`);
      });
    }
    return out;
  }
  /** Confere o registro antes de salvar. Devolve { idDoCampo: mensagem em português }; vazio = pode salvar. */
  function validarRegistro(f, v) {
    const erros = {};
    f.campos.forEach((c) => {
      const val = v[c.id] == null ? '' : String(v[c.id]).trim();
      if (c.tipo === 'numero') {
        const n = Number(val);
        if (val === '' || !Number.isInteger(n) || n < 0 || n > 1440) erros[c.id] = `${c.rotulo}: informe um número inteiro de 0 a 1.440.`;
      } else if (c.tipo === 'data' || c.tipo === 'hora') {
        if (val === '') erros[c.id] = `${c.rotulo}: informe ${c.tipo === 'data' ? 'a data' : 'o horário'}.`;
      } else if (c.obrigatorio && val === '') {
        erros[c.id] = c.tipo === 'escolha' ? `Escolha uma opção em "${c.rotulo}".` : `Preencha "${c.rotulo}".`;
      }
    });
    return erros;
  }
  function limpaErro(s, id) { if (s.erros) delete s.erros[id]; const e = document.getElementById('erro-' + id); if (e) e.textContent = ''; const i = document.querySelector(`[data-id="${id}"][aria-invalid]`); if (i) i.removeAttribute('aria-invalid'); }

  function registro(m, f) {
    const s = estado(m, f, () => ({ v: {} }));
    f.campos.forEach((c) => { if (s.v[c.id] === undefined) s.v[c.id] = c.tipo === 'data' ? hojeISO() : c.padrao || ''; });
    const lista = regs(m, f).slice().sort((a, b) => (b.v.data || '').localeCompare(a.v.data || '') || b.criado - a.criado);
    const resumo = resumoRegistro(f, lista);
    const er = s.erros || {};
    const aviso = (c) => `<p class="campo-erro" id="erro-${c.id}" role="alert">${er[c.id] ? E(er[c.id]) : ''}</p>`;
    const campo = (c) => {
      const v = s.v[c.id], inv = er[c.id] ? ' aria-invalid="true"' : '';
      if (c.tipo === 'escolha') return `<p class="rotulo">${E(c.rotulo)}${c.obrigatorio ? ' <small>(obrigatório)</small>' : ''}</p><div class="chips" role="group" aria-label="${E(c.rotulo)}">${c.opcoes.map((o) => chip('rv', c.id, o.id, o.nome, v === o.id)).join('')}</div>${aviso(c)}`;
      const tipo = { data: 'date', hora: 'time', numero: 'number' }[c.tipo] || 'text';
      return `<label class="campo">${E(c.rotulo)}<input type="${tipo}" data-m="rvin" data-id="${c.id}" value="${E(v)}"${inv} ${c.tipo === 'numero' ? 'min="0" max="1440" inputmode="numeric"' : ''} ${c.tipo === 'texto' ? 'maxlength="300"' : ''}></label>${aviso(c)}`;
    };
    return `<h1>${E(f.nome)}</h1><p class="lead">${E(f.descricao)}</p>
    <form id="m-form" class="form card" novalidate>${Object.keys(er).length ? '<p class="msg" role="alert">Falta preencher alguns campos para salvar. Veja os avisos abaixo.</p>' : ''}${f.campos.map(campo).join('')}<button class="btn" type="submit">Salvar registro</button></form>
    ${resumo.length ? `<div class="card"><b>O que seus registros mostram</b>${lista_(resumo)}<p class="nota">Baseado só no que você anotou. Não é diagnóstico.</p></div>` : ''}
    ${lista.length ? `<h2 class="sec">Histórico (${lista.length})</h2><ul class="hist">${lista.slice(0, 40).map((r) => `<li><div><b>${fmtDia(r.v.data)}</b>${f.campos.filter((c) => c.id !== 'data' && r.v[c.id] !== '' && r.v[c.id] != null).map((c) => `<small>${E(c.rotulo)}: ${E(rotuloValor(c, r.v[c.id]))}</small>`).join('')}</div>
      <button class="mini perigo" data-m="rdel" data-id="${r.id}" aria-label="Apagar registro">Apagar</button></li>`).join('')}</ul>` : '<p class="vazio">Nenhum registro ainda.</p>'}${X.aviso}`;
  }
  const lista_ = (itens) => lista(itens);

  function ajuda(m, f) {
    return `<h1>${E(f.nome)}</h1><p class="lead">${E(f.descricao)}</p>
    ${f.blocos.map((b) => `<section class="bloco"><h2>${E(b.titulo)}</h2>${lista(b.itens)}</section>`).join('')}
    ${f.recursos && f.recursos.length ? `<h2 class="sec">Onde buscar ajuda</h2>${f.recursos.map((r) => `<div class="card recurso"><b>${E(r.nome)}</b><p>${E(r.texto)}</p></div>`).join('')}` : ''}
    <p class="nota">Este app oferece orientações educativas e não substitui acompanhamento pediátrico ou psicológico. Em risco imediato, procure atendimento de emergência.</p>`;
  }

  /* ---------- interação ---------- */
  function toolDe(el) {
    const [, , id, fid] = (location.hash || '').replace(/^#/, '').split('/');
    const m = MODS[id]; return m ? { m, f: byId(m.ferramentas, fid) } : { m: null, f: null };
  }
  function atualizarSaida() {
    const { m, f } = toolDe(); const el = document.getElementById('m-saida');
    if (!m || !f || !el) return;
    const faixa = faixaDe(m);
    if (f.tipo === 'combinado') el.textContent = textoCombinado(f, S[m.id + '/' + f.id], faixa);
    if (f.tipo === 'modelo') { const s = S[m.id + '/' + f.id]; el.textContent = textoModelo(byId(f.modelos, s.id), s.vals[s.id] || {}); }
  }

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-m]');
    if (!el || !MODS) return;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return; // campos tratam em change/input
    const a = el.dataset.m, { m, f } = toolDe();
    if (a === 'copiar') { X.copiar(el.dataset.t); return; }
    if (a === 'copiar-saida') { const o = document.getElementById('m-saida'); if (o) X.copiar(o.textContent); return; }
    if (!m || !f) return;
    const s = S[m.id + '/' + f.id];
    switch (a) {
      case 'faixa': st.faixa[m.id] = el.dataset.v; salvar(); break;
      case 'sit-ir': s.step = 1; break;
      case 'sit': s.sit = el.dataset.v; s.step = 2; break;
      case 'sit-voltar': s.step = s.step === 2 ? 1 : 0; break;
      case 'cat': s.cat = el.dataset.v; break;
      case 'mod': s.id = el.dataset.v; break;
      case 'rv': s.v[el.dataset.k] = s.v[el.dataset.k] === el.dataset.v ? '' : el.dataset.v; if (s.erros) delete s.erros[el.dataset.k]; break;
      case 'rdel': if (confirm('Apagar este registro?')) { const l = regs(m, f); const i = l.findIndex((r) => r.id === el.dataset.id); if (i >= 0) l.splice(i, 1); FamilySync.lapide(st, el.dataset.id); salvar(); } else return; break;
      default: return;
    }
    X.reRender();
  });

  document.addEventListener('change', (ev) => {
    const el = ev.target.closest('[data-m]');
    if (!el) return;
    const { m, f } = toolDe(); if (!m || !f) return;
    const s = S[m.id + '/' + f.id], a = el.dataset.m;
    if (a === 'chk') s.sel[el.dataset.id] = el.checked;
    else if (a === 'rad') s.esc[el.dataset.s] = el.dataset.id;
    else if (a === 'hora') s[el.dataset.k] = el.value;
    else if (a === 'rvin') { s.v[el.dataset.id] = el.value; limpaErro(s, el.dataset.id); return; }
    else return;
    if (a === 'chk' || a === 'rad') atualizarSaida(); else X.reRender();
  });

  document.addEventListener('input', (ev) => {
    const el = ev.target.closest('[data-m]');
    if (!el) return;
    const { m, f } = toolDe(); if (!m || !f) return;
    const s = S[m.id + '/' + f.id], a = el.dataset.m;
    if (a === 'nome') { s.nome = el.value.trim(); atualizarSaida(); }
    else if (a === 'campo') { (s.vals[s.id] = s.vals[s.id] || {})[el.dataset.id] = el.value; atualizarSaida(); }
    else if (a === 'rvin') { s.v[el.dataset.id] = el.value; limpaErro(s, el.dataset.id); }
  });

  document.addEventListener('submit', (ev) => {
    if (ev.target.id !== 'm-form') return;
    ev.preventDefault();
    const { m, f } = toolDe(); if (!m || !f) return;
    const s = S[m.id + '/' + f.id];
    const v = Object.assign({}, s.v);
    const erros = validarRegistro(f, v);
    if (Object.keys(erros).length) {
      s.erros = erros; X.reRender();
      const primeiro = document.querySelector('[aria-invalid="true"], .campo-erro:not(:empty)');
      if (primeiro) primeiro.scrollIntoView({ block: 'center' });
      return;
    }
    delete s.erros;
    regs(m, f).push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), criado: Date.now(), v });
    if (st.reg[m.id + '/' + f.id].length > 300) st.reg[m.id + '/' + f.id].shift();
    salvar(); delete S[m.id + '/' + f.id]; X.toast('Registro salvo'); X.reRender();
  });

  /* ---------- API usada pelo app.js ---------- */
  window.FPModulo = {
    init(ctx, modulos) { X = ctx; MODS = modulos || {}; carregar(); FamilySync.aoMudar('modulos', () => { carregar(); X.reRender(); }); },
    reset() { S = {}; },
    /** devolve o HTML da rota /m/<módulo>[/<ferramenta>] ou null se a rota não for de módulo */
    view(rota) {
      const p = rota.split('/');
      if (p[1] !== 'm') return null;
      const m = MODS[p[2]];
      if (!m) return `${voltar('#/modulos', 'Módulos')}<h1>Módulo não liberado</h1><p class="lead">Este módulo ainda não está na sua conta.</p><a class="btn" href="#/modulos">Ver módulos</a>`;
      if (!p[3]) return home(m);
      const f = byId(m.ferramentas, p[3]);
      return f ? ferramenta(m, f) : home(m);
    },
  };
})();
