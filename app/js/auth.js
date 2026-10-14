/* Entrada do app: login, cadastro, pagamento e liberação do conteúdo pelo servidor. */
(function () {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CK = 'familypilot.cache';
  const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  let modo = /criar=1/.test(location.search) ? 'criar' : 'entrar';
  let me = null;

  async function api(metodo, url, corpo) {
    const r = await fetch(url, { method: metodo, credentials: 'same-origin', headers: corpo ? { 'content-type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(d.erro || 'Algo deu errado. Tente de novo.'); e.status = r.status; throw e; }
    return d;
  }
  const guardar = (v) => { try { v === null ? localStorage.removeItem(CK) : localStorage.setItem(CK, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };
  const lerCache = () => { try { return JSON.parse(localStorage.getItem(CK) || 'null'); } catch (e) { return null; } };
  const tela = (html) => { $('#tabs').hidden = true; $('#app').innerHTML = html; $('#app').focus({ preventScroll: true }); window.scrollTo(0, 0); };
  const msg = (t, ok) => { const e = $('#msg'); if (e) { e.textContent = t || ''; e.className = 'msg' + (ok ? ' ok' : ''); } };
  const ocupado = (btn, on, txt) => { btn.disabled = on; if (txt) btn.textContent = txt; };

  /* ---------- telas ---------- */
  function telaEntrar() {
    const criar = modo === 'criar';
    tela(`<section class="hero-app"><p class="eyebrow">FamilyPilot · SOS Birra</p><h1>${criar ? 'Crie sua conta' : 'Entrar'}</h1>
      <p>${criar ? 'Em seguida você escolhe como pagar.' : 'Use o e-mail e a senha da sua conta.'}</p></section>
      <form id="f-auth" class="form" novalidate>
        ${criar ? '<label class="campo">Seu nome<input id="a-nome" autocomplete="name" maxlength="80" required></label>' : ''}
        <label class="campo">E-mail<input id="a-email" type="email" inputmode="email" autocomplete="email" maxlength="160" required></label>
        <label class="campo">Senha${criar ? ' (mínimo 8 caracteres)' : ''}<input id="a-senha" type="password" autocomplete="${criar ? 'new-password' : 'current-password'}" maxlength="100" required></label>
        <p id="msg" class="msg" role="alert"></p>
        <button class="btn" type="submit">${criar ? 'Criar conta' : 'Entrar'}</button>
      </form>
      <button class="voltar" id="troca" style="margin-top:14px">${criar ? 'Já tenho conta. Entrar' : 'Ainda não tenho conta. Criar agora'}</button>
      <p class="nota">Um produto Grupo Semeia Digital. Orientações educativas para pais e responsáveis.</p>`);
    $('#troca').onclick = () => { modo = criar ? 'entrar' : 'criar'; telaEntrar(); };
    $('#f-auth').onsubmit = async (ev) => {
      ev.preventDefault();
      const btn = ev.target.querySelector('button[type=submit]'), t = btn.textContent;
      ocupado(btn, true, 'Aguarde…'); msg('');
      try {
        const corpo = { email: $('#a-email').value, senha: $('#a-senha').value };
        if (criar) corpo.nome = $('#a-nome').value;
        me = await api('POST', criar ? '/api/auth/cadastro' : '/api/auth/entrar', corpo);
        seguir();
      } catch (e) { msg(e.message); ocupado(btn, false, t); }
    };
  }

  function telaAssinar() {
    const renovar = !!(me.acesso && me.acesso.ate);
    tela(`<section class="hero-app"><p class="eyebrow">Olá, ${esc(me.usuario.nome.split(' ')[0])}</p>
      <h1>${renovar ? 'Seu acesso terminou' : 'Falta só liberar o acesso'}</h1>
      <p>${renovar ? 'Renove para continuar usando o SOS Birra.' : 'Pagamento único, sem mensalidade.'}</p></section>
      <div class="card preco"><b>SOS Birra + 4 bônus interativos</b>
        <div class="valor">${brl(me.preco)}</div>
        <p>Pagamento único. Acesso por 12 meses a partir da confirmação do pagamento. Pix, boleto ou cartão.</p></div>
      ${me.pagamentoOnline ? `<form id="f-pag" class="form" novalidate>
        <label class="campo">CPF ou CNPJ (exigido pela empresa de pagamento)<input id="p-doc" inputmode="numeric" autocomplete="off" maxlength="18" placeholder="Somente números"></label>
        <p id="msg" class="msg" role="alert"></p>
        <button class="btn" type="submit">Ir para o pagamento</button></form>
        <button class="btn claro" id="ja-paguei">Já paguei. Liberar meu acesso</button>`
        : '<div class="alerta">O pagamento online ainda não está ativo. Fale com o Grupo Semeia Digital para liberar seu acesso.</div>'}
      <p class="nota">Garantia incondicional de 7 dias: se não gostar, peça o reembolso integral dentro desse prazo.</p>
      <button class="voltar" id="sair" style="margin-top:10px">Sair da conta (${esc(me.usuario.email)})</button>`);
    $('#sair').onclick = sair;
    if (!me.pagamentoOnline) return;
    $('#f-pag').onsubmit = async (ev) => {
      ev.preventDefault();
      const btn = ev.target.querySelector('button[type=submit]'), t = btn.textContent;
      ocupado(btn, true, 'Abrindo o pagamento…'); msg('');
      try { const r = await api('POST', '/api/pagamento', { cpfCnpj: $('#p-doc').value }); if (!r.url) throw new Error('Não foi possível abrir o pagamento. Tente de novo.'); location.href = r.url; }
      catch (e) { msg(e.message); ocupado(btn, false, t); }
    };
    $('#ja-paguei').onclick = verificar;
  }

  async function verificar() {
    const btn = $('#ja-paguei'); if (btn) ocupado(btn, true, 'Conferindo…');
    try {
      const r = await api('POST', '/api/pagamento/verificar');
      me.acesso = r.acesso;
      if (r.acesso.ativo) return seguir();
      msg('Ainda não recebemos a confirmação. Pix costuma levar poucos segundos; boleto pode levar 1 a 2 dias úteis.');
    } catch (e) { msg(e.message); }
    if (btn) ocupado(btn, false, 'Já paguei. Liberar meu acesso');
  }

  /* ---------- fluxo ---------- */
  async function seguir() {
    if (!me.usuario) return telaEntrar();
    if (!me.acesso.ativo) return telaAssinar();
    try {
      const conteudo = await api('GET', '/api/conteudo');
      guardar({ me, conteudo });
      history.replaceState(null, '', location.pathname + location.hash);
      window.FamilyPilot.start(conteudo, me);
    } catch (e) {
      if (e.status === 402) { me.acesso.ativo = false; return telaAssinar(); }
      if (e.status === 401) { me = { usuario: null }; return telaEntrar(); }
      offline();
    }
  }

  /** Sem internet: abre com o último conteúdo guardado, enquanto o prazo do acesso não passou. */
  function offline() {
    const c = lerCache();
    if (c && c.me && c.me.acesso && (c.me.acesso.livre || (c.me.acesso.ate && new Date(c.me.acesso.ate) > new Date()))) {
      window.FamilyPilot.start(c.conteudo, c.me); return;
    }
    tela('<section class="hero-app"><h1>Sem conexão</h1><p>Conecte-se à internet para entrar.</p></section><button class="btn" onclick="location.reload()">Tentar de novo</button>');
  }

  async function sair() {
    try { await api('POST', '/api/auth/sair', {}); } catch (e) { /* segue mesmo assim */ }
    guardar(null); location.href = location.pathname;
  }

  async function iniciar() {
    try { me = await api('GET', '/api/auth/eu'); } catch (e) { return offline(); }
    seguir();
  }
  // ao voltar da página de pagamento, confere sozinho
  document.addEventListener('visibilitychange', () => { if (!document.hidden && me && me.usuario && !me.acesso.ativo && $('#ja-paguei')) verificar(); });

  window.FamilyAuth = { sair };
  iniciar();
})();
