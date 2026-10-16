/* FamilyPilot — app dos pais. Registros: cópia no aparelho (localStorage) e na conta, cifrados no servidor (sync.js). */
/* Chamado por auth.js depois do login, com o conteúdo liberado pelo servidor e os dados da conta. */
window.FamilyPilot = { _on: false, start: function (C, conta) {
  window.FamilyPilot._on = true;
  const D = C.birra || null;                 // SOS Birra (telas próprias); null se a conta não tem esse módulo
  const OFERTA = C.oferta || null;           // oferta de boas-vindas (módulo com preço especial por tempo limitado)
  const CAT = C.catalogo || [];              // vitrine: liberado, à venda ou em breve
  const $ = (s, r) => (r || document).querySelector(s);
  const byId = (arr, id) => arr.find((x) => x.id === id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- armazenamento ---------- */
  const KEY = 'familypilot.v1.' + conta.usuario.email; // registros separados por conta neste aparelho
  const vazio = () => ({ diario: [], radar: [], idade: '4-5' });
  let db = vazio();
  try { db = Object.assign(vazio(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { db = vazio(); }
  const salvar = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* sem armazenamento: segue na memória */ } FamilySync.agendar('birra'); };
  FamilySync.zerarOuvintes();
  FamilySync.aoMudar('birra', () => { try { db = Object.assign(vazio(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* mantém */ } reRender(); });
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ---------- datas ---------- */
  const agoraLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
  const fmtData = (q) => { const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(q || ''); return m ? `${m[3]}/${m[2]} às ${m[4]}:${m[5]}` : ''; };
  const hora = (q) => parseInt((q || '').slice(11, 13), 10);
  const faixa = (h) => (h < 5 ? 'madrugada' : h < 11 ? 'manhã' : h < 14 ? 'meio do dia' : h < 18 ? 'tarde' : 'noite');

  /* ---------- estado das telas ---------- */
  let W = { step: 0, idade: null, motivo: null, local: null, risco: false };
  let F = { comp: null, idade: null };
  let R = { tags: [], quando: null };
  let DRAFT = null;
  let timer = null;

  const nav = D ? [
    ['#/', 'Início', '🏠'],
    ['#/plano', 'Plano SOS', '🆘'],
    ['#/diario', 'Diário', '📓'],
    ['#/modulos', 'Módulos', '🧭'],
  ] : [
    ['#/', 'Início', '🏠'],
    ['#/modulos', 'Módulos', '🧭'],
  ];

  const aviso = '<p class="nota">Orientações educativas para pais e responsáveis. Não substituem acompanhamento pediátrico ou psicológico. Seus registros ficam guardados, com proteção, na sua conta.</p>';

  const chip = (act, k, v, label, on) => `<button type="button" class="chip${on ? ' on' : ''}" data-act="${act}" data-k="${k}" data-v="${esc(v)}" aria-pressed="${!!on}">${esc(label)}</button>`;
  const idadeChips = (act, sel) => `<div class="chips">${D.IDADES.map((i) => chip(act, 'idade', i.id, i.rotulo, i.id === sel)).join('')}</div>`;
  const voltar = (hash, txt) => `<a class="voltar" href="${hash}">← ${txt || 'Voltar'}</a>`;
  const frase = (txt, titulo) => `<div class="frase"><small>${esc(titulo)}</small><p>“${esc(txt)}”</p><button class="mini" data-act="copiar" data-t="${esc(txt)}">Copiar</button></div>`;
  const lista = (itens, cls) => `<ul class="${cls || 'lista'}">${itens.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

  /* ---------- telas ---------- */
  const views = {
    admin() { return conta.admin ? window.FPAdmin.view() : views.home(); },
    home() {
      if (!D) return homeGeral();
      return `
      <section class="hero-app">
        <p class="eyebrow">FamilyPilot · SOS Birra</p>
        <h1>Está tendo uma birra agora?</h1>
        <p>Responda 3 perguntas rápidas e veja o que fazer e dizer.</p>
        <a class="btn sos" href="#/plano">Gerar meu Plano SOS</a>
      </section>
      <h2 class="sec">Ferramentas do SOS Birra</h2>
      <div class="grid">
        <a class="tool" href="#/frase"><b>💬 Frase Certa</b><span>Quando as palavras somem, tenha uma sugestão pronta.</span></a>
        <a class="tool" href="#/pausa"><b>🫁 Pausa de Emergência</b><span>60 segundos para você se acalmar antes de responder.</span></a>
        <a class="tool" href="#/radar"><b>📡 Radar de Gatilhos</b><span>Perceba o que costuma acontecer antes da birra.</span></a>
        <a class="tool" href="#/diario"><b>📓 Diário SOS</b><span>Registre episódios e o que funcionou.</span></a>
      </div>
      ${ofertaCard()}${meusModulos()}
      <a class="outros" href="#/modulos">${CAT.some((m) => m.estado !== 'liberado') ? 'Conheça os outros módulos FamilyPilot →' : 'Ver todos os módulos →'}</a>
      ${aviso}`;
    },

    plano() {
      const passos = ['Idade', 'Motivo', 'Local'];
      if (W.step <= 2) {
        const dots = `<div class="dots" aria-label="Passo ${W.step + 1} de 3">${passos.map((p, i) => `<span class="${i <= W.step ? 'on' : ''}">${p}</span>`).join('')}</div>`;
        let corpo = '';
        if (W.step === 0) {
          corpo = `<h1>Quantos anos tem seu filho?</h1>${idadeChips('pick', W.idade || db.idade)}`;
        } else if (W.step === 1) {
          corpo = `<h1>O que parece ter causado a birra?</h1>
          <div class="opcoes">${D.MOTIVOS.map((m) => `<button class="opcao${W.motivo === m.id ? ' on' : ''}" data-act="pick" data-k="motivo" data-v="${m.id}">${esc(m.nome)}</button>`).join('')}</div>`;
        } else {
          corpo = `<h1>Onde está acontecendo?</h1>
          <div class="opcoes">${D.LOCAIS.map((l) => `<button class="opcao${W.local === l.id ? ' on' : ''}" data-act="pick" data-k="local" data-v="${l.id}">${esc(l.nome)}</button>`).join('')}</div>
          <label class="risco"><input type="checkbox" id="risco" ${W.risco ? 'checked' : ''}> Alguém pode se machucar (ele bate, atira coisas ou tenta correr)</label>
          <button class="btn" data-act="gerar" ${W.local ? '' : 'disabled'}>Ver meu Plano SOS</button>`;
        }
        return `${dots}${W.step > 0 ? `<button class="voltar" data-act="passo-voltar">← Voltar</button>` : voltar('#/', 'Início')}${corpo}`;
      }
      return resultado();
    },

    frase() {
      const idade = F.idade || db.idade;
      let saida = '<p class="vazio">Escolha o comportamento acima para ver as frases.</p>';
      if (F.comp) {
        const c = byId(D.COMPORTAMENTOS, F.comp);
        const f = c.frases[idade];
        saida = `${frase(f.a, '1. Para acolher a emoção')}${frase(f.l, '2. Para manter o limite')}${frase(`${f.a} ${f.l}`, 'Juntas, em sequência')}
        <p class="nota">Adapte com suas palavras e use um tom de voz calmo. A frase ajuda, mas o tom conta mais do que o texto.</p>`;
      }
      return `${voltar('#/', 'Início')}<h1>Frase Certa</h1><p class="lead">Selecione o comportamento e a idade.</p>
      <h2 class="sec">O que ele está fazendo?</h2>
      <div class="chips">${D.COMPORTAMENTOS.map((c) => chip('pick-frase', 'comp', c.id, c.nome, F.comp === c.id)).join('')}</div>
      <h2 class="sec">Idade</h2>${idadeChips('pick-frase', idade)}
      <div class="saida">${saida}</div>`;
    },

    pausa() {
      return `${voltar('#/', 'Início')}<h1>Pausa de Emergência</h1>
      <p class="lead">Você também precisa se acalmar antes de responder.</p>
      <div class="card"><b>Antes de começar:</b><p>Use só se seu filho estiver em um lugar seguro, onde você possa se afastar por alguns segundos sem deixá-lo em risco. Se houver perigo, cuide da segurança primeiro.</p></div>
      <div class="pausa" id="pausa">
        <div class="bola" id="bola"><span id="contagem">60</span></div>
        <p class="pausa-txt" id="pausa-txt">Quando estiver pronto, toque em começar.</p>
        <p class="pausa-sub" id="pausa-sub"></p>
        <button class="btn" id="btn-pausa" data-act="pausa-iniciar">Começar 60 segundos</button>
      </div>
      <a class="btn claro" href="#/frase">Já estou calmo: escolher uma frase</a>${aviso}`;
    },

    radar() {
      const eventos = eventosRadar();
      const rec = D.GATILHOS;
      const q = R.quando || agoraLocal();
      let analise = '<p class="vazio">Registre pelo menos 3 episódios para ver padrões. Os episódios do Diário SOS também contam.</p>';
      if (eventos.length >= 3) {
        const fx = {}; const gt = {};
        eventos.forEach((e) => { fx[faixa(hora(e.quando))] = (fx[faixa(hora(e.quando))] || 0) + 1; e.tags.forEach((t) => { gt[t] = (gt[t] || 0) + 1; }); });
        const topF = Object.entries(fx).sort((a, b) => b[1] - a[1])[0];
        const topG = Object.entries(gt).sort((a, b) => b[1] - a[1]).slice(0, 3);
        analise = `<div class="card"><b>O que seus registros mostram</b>
          <p>${topF[1]} de ${eventos.length} episódios aconteceram no período da <b>${topF[0]}</b>.</p>
          ${topG.length ? `<ul class="lista">${topG.map(([t, n]) => `<li><b>${esc(byId(rec, t).nome)}</b>: ${n} de ${eventos.length}</li>`).join('')}</ul>` : ''}</div>
          ${topG.length ? `<div class="card"><b>Checklist para se preparar</b>${lista(topG.map(([t]) => byId(rec, t).dica), 'check')}</div>` : ''}
          <p class="nota">São pistas sobre os dados que você informou, não um diagnóstico. Situações intensas ou persistentes podem pedir avaliação profissional.</p>`;
      }
      const ultimos = db.radar.slice().sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, 6);
      return `${voltar('#/', 'Início')}<h1>Radar de Gatilhos</h1><p class="lead">Perceba o que costuma acontecer antes da birra.</p>
      <div class="card"><b>Registrar um momento</b>
        <label class="campo">Quando<input type="datetime-local" id="r-quando" value="${esc(q)}"></label>
        <p class="rotulo">O que estava acontecendo antes? (marque o que couber)</p>
        <div class="chips">${rec.map((g) => chip('tag', 'tag', g.id, g.nome, R.tags.includes(g.id))).join('')}</div>
        <button class="btn" data-act="radar-salvar" ${R.tags.length ? '' : 'disabled'}>Salvar no Radar</button></div>
      ${analise}
      ${ultimos.length ? `<h2 class="sec">Últimos registros do Radar</h2><ul class="hist">${ultimos.map((e) => `<li><div><b>${fmtData(e.quando)}</b><small>${e.tags.map((t) => esc(byId(rec, t).nome)).join(' · ')}</small></div><button class="mini perigo" data-act="radar-apagar" data-id="${e.id}" aria-label="Apagar registro">Apagar</button></li>`).join('')}</ul>` : ''}`;
    },

    diario() {
      const itens = db.diario.slice().sort((a, b) => b.quando.localeCompare(a.quando));
      const stats = estrategiasStats();
      return `${voltar('#/', 'Início')}<h1>Diário SOS</h1><p class="lead">Registre episódios, o que você fez e como terminou.</p>
      <a class="btn" href="#/diario/novo">+ Registrar episódio</a>
      ${stats ? `<div class="card"><b>O que ajudou nos seus registros</b>${lista(stats, 'lista')}<p class="nota">Baseado só nos episódios que você anotou.</p></div>` : ''}
      ${itens.length ? `<h2 class="sec">Histórico (${itens.length})</h2><ul class="hist">${itens.map(itemDiario).join('')}</ul>
      <button class="mini" data-act="diario-copiar">Copiar histórico em texto</button>` : '<p class="vazio">Nenhum episódio registrado ainda.</p>'}${aviso}`;
    },

    diarioNovo() {
      const d = DRAFT || { quando: agoraLocal(), idade: db.idade, motivo: 'nao-sei', local: 'casa', est: [], res: '', nota: '' };
      DRAFT = d;
      const sel = (arr, v) => arr.map((o) => `<option value="${o.id}" ${o.id === v ? 'selected' : ''}>${esc(o.nome || o.rotulo)}</option>`).join('');
      return `${voltar('#/diario', 'Diário')}<h1>Registrar episódio</h1>
      <form id="form-diario" class="form">
        <label class="campo">Quando<input type="datetime-local" id="d-quando" value="${esc(d.quando)}" required></label>
        <label class="campo">Idade<select id="d-idade">${sel(D.IDADES, d.idade)}</select></label>
        <label class="campo">Motivo aparente<select id="d-motivo">${sel(D.MOTIVOS, d.motivo)}</select></label>
        <label class="campo">Onde<select id="d-local">${sel(D.LOCAIS, d.local)}</select></label>
        <p class="rotulo">O que você fez? (pode marcar vários)</p>
        <div class="chips">${D.ESTRATEGIAS.map((e) => chip('est', 'est', e.id, e.nome, d.est.includes(e.id))).join('')}</div>
        <p class="rotulo">Como terminou?</p>
        <div class="chips">${D.RESULTADOS.map((r) => chip('res', 'res', r.id, r.nome, d.res === r.id)).join('')}</div>
        <label class="campo">Anotações (opcional)<textarea id="d-nota" rows="3" maxlength="500" placeholder="O que ajudou? O que você faria diferente?">${esc(d.nota)}</textarea></label>
        <button class="btn" type="submit">Salvar episódio</button>
      </form>`;
    },

    modulos() {
      const preco = brl;
      return `${voltar('#/', 'Início')}<h1>Módulos FamilyPilot</h1>
      <p class="lead">Seu filho cresce, os desafios mudam. Você começa pelo problema que precisa resolver hoje.</p>
      ${contaCard()}${ofertaCard()}${pacoteCard()}<ul class="mods">${CAT.filter((m) => m.id !== 'pacote').map((m) => `<li class="mod${m.estado === 'liberado' ? ' on' : ''}">
        <span class="ico">${m.icone}</span><div><b>${esc(m.nome)}</b><p>${esc(m.frase)}</p><small>${esc(m.detalhe)}</small>
        ${m.estado === 'liberado' ? `<a class="btn mini-btn" href="${m.id === 'birra' ? '#/' : '#/m/' + m.id}">Abrir</a>${m.ate ? `<small> Acesso até ${new Date(m.ate).toLocaleDateString('pt-BR')}</small>` : ''}`
          : m.estado === 'a-venda' ? `<button class="btn mini-btn" data-act="comprar" data-id="${m.id}">Liberar por ${preco(m.preco)}</button><small> ${m.precoCheio ? `<s>de ${preco(m.precoCheio)}</s> · preço de lançamento. ` : ''}Pagamento único, 12 meses de acesso.</small>`
          : '<span class="status">Em breve</span>'}</div></li>`).join('')}</ul>${aviso}`;
    },
  };

  const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  function ofertaCard() {
    if (!OFERTA) return '';
    const m = CAT.find((x) => x.id === OFERTA.modulo); if (!m) return '';
    const ate = new Date(OFERTA.ate).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    return `<div class="card oferta"><b>🎁 Oferta de boas-vindas</b><p>${esc(m.nome)} por <b>${brl(OFERTA.preco)}</b> <s>${brl(OFERTA.precoNormal)}</s>, só até ${ate}.</p>
      <button class="btn mini-btn" data-act="comprar-oferta">Quero o ${esc(m.nome)}</button></div>`;
  }
  function pacoteCard() {
    const p = CAT.find((m) => m.id === 'pacote');
    if (!p || p.estado !== 'a-venda') return '';
    return `<div class="card pacote"><b>🎁 Pacote Família: todos os 7 módulos</b>
      <p>${brl(p.preco)} <small>em vez de ${p.somaSeparados ? brl(p.somaSeparados) : 'comprar um a um'}${p.somaSeparados ? ' se comprados separados' : ''}. Pagamento único, 12 meses de acesso.</small></p>
      <button class="btn mini-btn" data-act="comprar" data-id="pacote">Liberar todos por ${brl(p.preco)}</button></div>`;
  }

  function meusModulos() {
    const ok = CAT.filter((m) => m.estado === 'liberado' && m.id !== 'birra');
    if (!ok.length) return '';
    return `<h2 class="sec">Seus outros módulos</h2><div class="grid">${ok.map((m) => `<a class="tool" href="#/m/${m.id}"><b>${m.icone} ${esc(m.nome)}</b><span>${esc(m.frase)}</span></a>`).join('')}</div>`;
  }
  function homeGeral() {
    return `<section class="hero-app"><p class="eyebrow">FamilyPilot</p><h1>Olá, ${esc(conta.usuario.nome.split(' ')[0])}</h1><p>Escolha por onde começar hoje.</p></section>
    ${ofertaCard()}${meusModulos()}<a class="outros" href="#/modulos">Ver todos os módulos →</a>${aviso}`;
  }

  /** Seus dados (LGPD): onde ficam, baixar tudo, apagar registros, excluir a conta. */
  function meusDados() {
    const nuvem = FamilySync.ativo();
    return `<div class="card"><b>Seus dados</b><p>${nuvem ? 'Seus registros ficam guardados na sua conta, com criptografia, e abrem em qualquer aparelho em que você entrar.' : 'Seus registros estão salvos só neste aparelho no momento.'}</p>
      <button class="mini" data-act="dados-baixar">Baixar meus dados</button> <button class="mini" data-act="dados-apagar">Apagar meus registros</button> <button class="mini" data-act="dados-excluir">Excluir minha conta</button></div>`;
  }
  function contaCard() {
    const ate = conta.acesso.livre ? 'acesso total (administrador)' : conta.acesso.ate ? 'acesso até ' + new Date(conta.acesso.ate).toLocaleDateString('pt-BR') : '';
    return `<div class="card"><b>${esc(conta.usuario.nome)}</b><p>${esc(conta.usuario.email)}${ate ? ' · ' + ate : ''}${conta.visao ? ' · <b>visão de usuário</b>' : ''}</p><button class="mini" data-act="sair">Sair da conta</button> <small><a href="/termos" target="_blank" rel="noopener">Termos</a> · <a href="/privacidade" target="_blank" rel="noopener">Privacidade</a></small></div>${meusDados()}${conta.admin ? adminPanel() : ''}`;
  }

  /** Só para o administrador: escolhe os módulos para ver o app como um cliente veria. */
  function adminPanel() {
    const sel = conta.visao ? conta.visao.modulos : null;
    const mods = CAT.filter((m) => m.id !== 'pacote');
    return `<div class="card admin"><b>🛠️ Ver como usuário</b>
      <p>Marque os módulos que o cliente teria e veja o app como ele vê. Nada é cobrado nem alterado nesse modo.</p>
      <div class="predef"><button class="mini" data-act="adm-preset" data-v="nenhum">Nenhum</button><button class="mini" data-act="adm-preset" data-v="birra">Só SOS Birra</button><button class="mini" data-act="adm-preset" data-v="todos">Todos</button></div>
      ${mods.map((m) => `<label class="opt"><input type="checkbox" class="adm-mod" value="${m.id}" ${sel && sel.includes(m.id) ? 'checked' : ''}><span>${m.icone} ${esc(m.nome)}</span></label>`).join('')}
      <label class="opt"><input type="checkbox" id="adm-oferta" ${conta.visao && conta.visao.oferta ? 'checked' : ''}><span>Mostrar a oferta de boas-vindas (cliente que acabou de comprar o SOS Birra)</span></label>
      <button class="btn mini-btn" data-act="adm-ver">Ver como usuário</button> <a class="mini" href="#/admin" style="text-decoration:none;display:inline-block">Clientes e pedidos</a>
      ${conta.visao ? '<button class="mini" data-act="adm-sair">Voltar à minha visão</button>' : ''}</div>`;
  }

  function itemDiario(e) {
    const m = byId(D.MOTIVOS, e.motivo), l = byId(D.LOCAIS, e.local), r = byId(D.RESULTADOS, e.res);
    return `<li><div><b>${fmtData(e.quando)}</b> · ${esc((byId(D.IDADES, e.idade) || {}).rotulo || '')}
      <small>${esc(m ? m.nome : '')} — ${esc(l ? l.nome : '')}</small>
      ${e.est.length ? `<small>Fiz: ${e.est.map((s) => esc(byId(D.ESTRATEGIAS, s).nome)).join(', ')}</small>` : ''}
      ${r ? `<span class="res ${r.id}">${esc(r.nome)}</span>` : ''}
      ${e.nota ? `<p class="obs">${esc(e.nota)}</p>` : ''}</div>
      <button class="mini perigo" data-act="diario-apagar" data-id="${e.id}" aria-label="Apagar episódio">Apagar</button></li>`;
  }

  /* ---------- Plano SOS ---------- */
  function gerarPlano(s) {
    const m = byId(D.MOTIVOS, s.motivo), l = byId(D.LOCAIS, s.local), pi = D.POR_IDADE[s.idade];
    const fazer = [].concat(s.risco ? D.SEGURANCA : [], l.passos, m.fazer);
    const evitar = Array.from(new Set([].concat(m.evitar, D.EVITAR_SEMPRE)));
    return { m, l, pi, fazer, evitar, f: m.frases[s.idade] };
  }

  function resultado() {
    const p = gerarPlano(W);
    return `<button class="voltar" data-act="plano-refazer">← Refazer</button>
    <p class="eyebrow">Plano SOS · ${esc(byId(D.IDADES, W.idade).rotulo)} · ${esc(p.l.nome)}</p>
    <h1>Seu Plano SOS</h1>
    ${W.risco ? '<div class="alerta"><b>Segurança primeiro.</b> Se houver risco de ferimento, proteja seu filho antes de qualquer outra coisa.</div>' : ''}
    <p class="lead">${esc(p.m.leitura)}</p>
    <section class="bloco"><h2>1. Fazer agora</h2><ol class="passos">${p.fazer.map((i) => `<li>${esc(i)}</li>`).join('')}</ol></section>
    <section class="bloco"><h2>2. Frase que pode ajudar</h2>${frase(p.f.a, 'Para acolher')}${frase(p.f.l, 'Para manter o limite')}
      <p class="dica">${esc(p.pi.dica)}</p></section>
    <section class="bloco evitar"><h2>3. Evitar</h2>${lista(p.evitar, 'lista x')}</section>
    <section class="bloco"><h2>4. Depois que passar</h2>${lista(D.DEPOIS, 'lista')}</section>
    <div class="card"><b>O que esperar nessa idade</b><p>${esc(p.pi.expectativa)}</p></div>
    <div class="acoes">
      <a class="btn claro" href="#/pausa">Preciso de 60 segundos para me acalmar</a>
      <button class="btn" data-act="registrar-plano">Registrar no Diário SOS</button>
    </div>
    <p class="nota">Um plano não impede todas as birras, mas pode mudar a sua resposta a elas. O app não garante interromper uma crise. Situações intensas ou persistentes podem exigir avaliação profissional.</p>`;
  }

  /* ---------- Radar e Diário: dados ---------- */
  function eventosRadar() {
    const doDiario = db.diario.map((e) => {
      const m = byId(D.MOTIVOS, e.motivo);
      return { quando: e.quando, tags: m && m.gatilho ? [m.gatilho] : [] };
    });
    return db.radar.concat(doDiario);
  }

  function estrategiasStats() {
    const out = [];
    D.ESTRATEGIAS.forEach((s) => {
      const usos = db.diario.filter((e) => e.est.includes(s.id) && e.res);
      if (usos.length >= 3) {
        const ok = usos.filter((e) => e.res === 'ajudou').length;
        out.push(`${s.nome}: ajudou em ${ok} de ${usos.length} vezes`);
      }
    });
    return out.length ? out : null;
  }

  /* ---------- Pausa de 60 segundos ---------- */
  const DICAS = ['Solte os ombros.', 'Relaxe a mandíbula.', 'Sinta os pés no chão.', 'Ele precisa de ajuda para se acalmar, não de uma lição agora.', 'Você não precisa resolver tudo neste minuto.'];

  function pausaIniciar() {
    pausaParar();
    const bola = $('#bola'), txt = $('#pausa-txt'), sub = $('#pausa-sub'), cont = $('#contagem'), btn = $('#btn-pausa');
    btn.textContent = 'Parar'; btn.dataset.act = 'pausa-parar';
    const ini = Date.now();
    let ultimoCiclo = -1, fase = '';
    const tick = () => {
      const t = (Date.now() - ini) / 1000;
      if (t >= 60) { fim(); return; }
      cont.textContent = Math.ceil(60 - t);
      if (t < 5) {
        txt.textContent = 'Primeiro, confirme: seu filho está seguro?';
        sub.textContent = 'Se sim, vamos respirar juntos.';
      } else if (t < 55) {
        const c = Math.floor((t - 5) / 10), p = (t - 5) % 10;
        const novaFase = p < 4 ? 'in' : 'out';
        if (novaFase !== fase || c !== ultimoCiclo) {
          fase = novaFase;
          bola.style.transition = `transform ${novaFase === 'in' ? 4 : 6}s ease-in-out`;
          bola.style.transform = novaFase === 'in' ? 'scale(1.35)' : 'scale(1)';
        }
        if (c !== ultimoCiclo) { ultimoCiclo = c; sub.textContent = DICAS[c % DICAS.length]; }
        txt.textContent = p < 4 ? 'Inspire pelo nariz…' : 'Solte o ar devagar…';
      } else {
        txt.textContent = 'Escolha uma frase curta: "Estou aqui. Vou te ajudar."';
        sub.textContent = 'Fale baixo e devagar.';
      }
    };
    tick();
    timer = setInterval(tick, 250);
    function fim() {
      pausaParar();
      txt.textContent = 'Pronto. Respire mais uma vez e volte para ele.';
      sub.textContent = 'Se precisar de palavras, use a Frase Certa.';
      cont.textContent = '✓';
      btn.textContent = 'Fazer de novo'; btn.dataset.act = 'pausa-iniciar';
    }
  }
  function pausaParar() {
    if (timer) { clearInterval(timer); timer = null; }
    const b = $('#bola'), btn = $('#btn-pausa');
    if (b) { b.style.transition = 'transform .4s'; b.style.transform = 'scale(1)'; }
    if (btn && btn.dataset.act === 'pausa-parar') { btn.textContent = 'Começar 60 segundos'; btn.dataset.act = 'pausa-iniciar'; $('#contagem').textContent = '60'; $('#pausa-txt').textContent = 'Quando estiver pronto, toque em começar.'; $('#pausa-sub').textContent = ''; }
  }

  /* ---------- utilidades ---------- */
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2200);
  }
  function copiar(txt) {
    const ok = () => toast('Copiado!');
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(txt).then(ok, () => toast('Não foi possível copiar')); return; }
    const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); ok(); } catch (e) { toast('Não foi possível copiar'); }
    document.body.removeChild(ta);
  }
  function toggle(arr, v) { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); }

  /* ---------- roteador ---------- */
  const MAPA = { '/': 'home', '/plano': 'plano', '/frase': 'frase', '/pausa': 'pausa', '/radar': 'radar', '/diario': 'diario', '/diario/novo': 'diarioNovo', '/modulos': 'modulos', '/admin': 'admin' };
  function rotaAtual() { return (location.hash || '#/').replace(/^#/, '') || '/'; }
  function render() {
    pausaParar();
    const r = rotaAtual();
    // sem o SOS Birra na conta, as telas dele não existem: volta para o início
    if (!D && r !== '/' && r !== '/modulos' && r !== '/admin' && !r.startsWith('/m/')) { location.hash = '#/'; return; }
    $('#app').innerHTML = htmlDaRota(r);
    const selo = document.querySelector('.selo'), cm = r.startsWith('/m/') && CAT.find((x) => x.id === r.split('/')[2]);
    if (selo) selo.textContent = cm ? cm.nome : D ? 'SOS Birra' : 'FamilyPilot';
    document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + (r === '/' ? '/' : r.startsWith('/diario') ? '/diario' : r.startsWith('/m/') ? '/modulos' : r)));
    window.scrollTo(0, 0);
    $('#app').focus({ preventScroll: true });
  }
  function htmlDaRota(r) {
    if (r.startsWith('/m/')) { const h = window.FPModulo.view(r); if (h !== null) return h; }
    return views[MAPA[r] || 'home']();
  }
  function reRender() { const y = window.scrollY; $('#app').innerHTML = htmlDaRota(rotaAtual()); window.scrollTo(0, y); }

  window.addEventListener('hashchange', () => {
    window.FPModulo.reset();
    if (rotaAtual() === '/plano') W = { step: 0, idade: null, motivo: null, local: null, risco: false };
    if (rotaAtual() !== '/diario/novo' && rotaAtual() !== '/plano') DRAFT = null;
    render();
  });

  /* ---------- ações ---------- */
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act, v = el.dataset.v, k = el.dataset.k;
    switch (act) {
      case 'pick':
        if (k === 'idade') { W.idade = v; db.idade = v; salvar(); W.step = 1; }
        else if (k === 'motivo') { W.motivo = v; W.step = 2; }
        else if (k === 'local') { W.local = v; }
        reRender(); break;
      case 'passo-voltar': W.step = Math.max(0, W.step - 1); reRender(); break;
      case 'gerar': { const r = $('#risco'); W.risco = !!(r && r.checked); W.step = 3; reRender(); window.scrollTo(0, 0); break; }
      case 'plano-refazer': W = { step: 0, idade: null, motivo: null, local: null, risco: false }; reRender(); break;
      case 'pick-frase': if (k === 'idade') { F.idade = v; db.idade = v; salvar(); } else F.comp = v; reRender(); break;
      case 'copiar': copiar(el.dataset.t); break;
      case 'sair': window.FamilyAuth.sair(); break;
      case 'adm-preset': { const v = el.dataset.v; document.querySelectorAll('.adm-mod').forEach((c) => { c.checked = v === 'todos' || (v === 'birra' && c.value === 'birra'); }); break; }
      case 'adm-ver': window.FamilyAuth.verComo([...document.querySelectorAll('.adm-mod:checked')].map((c) => c.value), $('#adm-oferta').checked); break;
      case 'dados-baixar': FamilySync.baixar().catch((e) => alert(e.message)); break;
      case 'dados-apagar': if (confirm('Apagar todos os seus registros (diário, radar e anotações das ferramentas)? Isso não pode ser desfeito.')) FamilySync.apagarRegistros().then(() => { alert('Registros apagados.'); location.reload(); }).catch((e) => alert(e.message)); break;
      case 'dados-excluir': {
        if (!confirm('Excluir sua conta? Seus registros e acessos serão apagados e não podem ser recuperados. Só guardamos o que a lei fiscal exige sobre compras já pagas.')) break;
        const semSenha = !!conta.usuario.semSenha;
        const v = prompt(semSenha ? 'Para confirmar, digite EXCLUIR' : 'Para confirmar, digite a sua senha');
        if (!v) break;
        FamilySync.excluirConta(semSenha ? { confirmar: v } : { senha: v }).then(() => { alert('Conta excluída.'); location.href = '/'; }).catch((e) => alert(e.message));
        break;
      }
      case 'adm-sair': window.FamilyAuth.sairVisao(); break;
      case 'comprar': window.FamilyAuth.comprar(CAT.find((m) => m.id === el.dataset.id)); break;
      case 'comprar-oferta': { const m = CAT.find((x) => x.id === OFERTA.modulo); window.FamilyAuth.comprar({ id: m.id, nome: m.nome + ' (oferta de boas-vindas)', preco: OFERTA.preco, oferta: true }); break; }
      case 'pausa-iniciar': pausaIniciar(); break;
      case 'pausa-parar': pausaParar(); break;
      case 'tag': { const q = $('#r-quando'); if (q) R.quando = q.value; toggle(R.tags, v); reRender(); break; }
      case 'radar-salvar': {
        const q = $('#r-quando').value || agoraLocal();
        db.radar.push({ id: uid(), quando: q, tags: R.tags.slice() }); salvar();
        R = { tags: [], quando: null }; toast('Salvo no Radar'); reRender(); break;
      }
      case 'radar-apagar': if (confirm('Apagar este registro?')) { FamilySync.lapide(db, el.dataset.id); db.radar = db.radar.filter((e) => e.id !== el.dataset.id); salvar(); reRender(); } break;
      case 'registrar-plano':
        DRAFT = { quando: agoraLocal(), idade: W.idade, motivo: W.motivo, local: W.local, est: [], res: '', nota: '' };
        location.hash = '#/diario/novo'; break;
      case 'est': syncDraft(); toggle(DRAFT.est, v); reRender(); break;
      case 'res': syncDraft(); DRAFT.res = DRAFT.res === v ? '' : v; reRender(); break;
      case 'diario-apagar': if (confirm('Apagar este episódio?')) { FamilySync.lapide(db, el.dataset.id); db.diario = db.diario.filter((e) => e.id !== el.dataset.id); salvar(); reRender(); } break;
      case 'diario-copiar': copiar(db.diario.slice().sort((a, b) => b.quando.localeCompare(a.quando)).map((e) => {
        const m = byId(D.MOTIVOS, e.motivo), l = byId(D.LOCAIS, e.local), r = byId(D.RESULTADOS, e.res);
        return `${fmtData(e.quando)} — ${m ? m.nome : ''} (${l ? l.nome : ''}). Fiz: ${e.est.map((s) => byId(D.ESTRATEGIAS, s).nome).join(', ') || '—'}. Resultado: ${r ? r.nome : '—'}.${e.nota ? ' ' + e.nota : ''}`;
      }).join('\n')); break;
    }
  });

  function syncDraft() {
    if (!DRAFT) return;
    const g = (id) => { const e = $(id); return e ? e.value : null; };
    DRAFT.quando = g('#d-quando') || DRAFT.quando; DRAFT.idade = g('#d-idade') || DRAFT.idade;
    DRAFT.motivo = g('#d-motivo') || DRAFT.motivo; DRAFT.local = g('#d-local') || DRAFT.local;
    const n = $('#d-nota'); if (n) DRAFT.nota = n.value;
  }

  document.addEventListener('submit', (ev) => {
    if (ev.target.id !== 'form-diario') return;
    ev.preventDefault();
    syncDraft();
    db.diario.push({ id: uid(), quando: DRAFT.quando, idade: DRAFT.idade, motivo: DRAFT.motivo, local: DRAFT.local, est: DRAFT.est.slice(), res: DRAFT.res, nota: DRAFT.nota.trim() });
    db.idade = DRAFT.idade; salvar(); DRAFT = null; toast('Episódio salvo');
    location.hash = '#/diario';
  });

  /* ---------- início ---------- */
  window.FPAdmin.init({ esc, reRender });
  window.FPModulo.init({ esc, toast, copiar, reRender, aviso, email: conta.usuario.email }, C.modulos);
  $('#tabs').hidden = false;
  $('#tabs').innerHTML = nav.map(([h, t, i]) => `<a href="${h}"><span aria-hidden="true">${i}</span>${t}</a>`).join('');
  render();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('/sw.js').catch(() => {});
} };
