/* Entrada do app: login, cadastro, pagamento e liberação do conteúdo pelo servidor. */
(function () {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CK = 'familypilot.cache';
  const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  let modo = /criar=1/.test(location.search) ? 'criar' : 'entrar';
  let me = null;
  let atual = null; // módulo em compra (tela de pagamento)

  async function api(metodo, url, corpo) {
    if (corpo === undefined && metodo !== 'GET') corpo = {};   // o servidor só aceita POST em JSON: sem corpo, a chamada era recusada ("Requisição inválida")
    const r = await fetch(url, { method: metodo, credentials: 'same-origin', headers: corpo ? { 'content-type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(d.erro || 'Algo deu errado. Tente de novo.'); e.status = r.status; throw e; }
    return d;
  }
  const guardar = (v) => { try { v === null ? localStorage.removeItem(CK) : localStorage.setItem(CK, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };
  const lerCache = () => { try { return JSON.parse(localStorage.getItem(CK) || 'null'); } catch (e) { return null; } };
  const sairVisivel = (v) => { $('#btn-sair').hidden = !v; };   // botão "Sair" do topo: aparece em toda tela de quem está logado
  const NOMES = { birra: 'SOS Birra', sono: 'SOS Sono', telas: 'SOS Telas', alimentacao: 'SOS Alimentação', limites: 'SOS Limites', escola: 'SOS Escola', adolescencia: 'SOS Adolescência' };
  /** Faixa fixa no topo quando o administrador está no modo "ver como usuário". */
  function faixa() {
    const f = $('#faixa-adm'), v = me && me.visao;
    f.hidden = !v;
    if (!v) return;
    const lista = v.modulos.length ? v.modulos.map((m) => NOMES[m] || m).join(', ') : 'nenhum módulo';
    $('#faixa-txt').textContent = 'Visão de usuário: ' + lista + (v.oferta ? ' + oferta de boas-vindas' : '');
  }
  const tela = (html) => { sairVisivel(!!(me && me.usuario)); faixa(); $('#tabs').hidden = true; $('#app').innerHTML = html; $('#app').focus({ preventScroll: true }); window.scrollTo(0, 0); };
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
        ${criar ? '<label class="opt aceite"><input type="checkbox" id="aceite"><span>Li e aceito os <a href="/termos" target="_blank" rel="noopener">Termos de Uso</a> e a <a href="/privacidade" target="_blank" rel="noopener">Política de Privacidade</a>.</span></label>' : ''}
        <p id="msg" class="msg" role="alert"></p>
        <button class="btn" type="submit">${criar ? 'Criar conta' : 'Entrar'}</button>
      </form>
      ${criar ? '' : '<button class="voltar" id="esqueci" style="margin-top:14px">Esqueci minha senha</button><br>'}
      <div id="g-area" hidden><p class="ou">ou</p><div id="g-btn"></div>${criar ? '' : '<p class="nota" style="text-align:center">Se for o seu primeiro acesso com o Google, você concorda com os <a href="/termos" target="_blank" rel="noopener">Termos de Uso</a> e a <a href="/privacidade" target="_blank" rel="noopener">Política de Privacidade</a>.</p>'}</div>
      <button class="voltar" id="troca" style="margin-top:6px">${criar ? 'Já tenho conta. Entrar' : 'Ainda não tenho conta. Criar agora'}</button>
      <p class="nota">Um produto Grupo Semeia Digital. Orientações educativas para pais e responsáveis.</p>`);
    $('#troca').onclick = () => { modo = criar ? 'entrar' : 'criar'; telaEntrar(); };
    if (!criar) $('#esqueci').onclick = telaEsqueci;
    botaoGoogle(criar);
    $('#f-auth').onsubmit = async (ev) => {
      ev.preventDefault();
      const btn = ev.target.querySelector('button[type=submit]'), t = btn.textContent;
      ocupado(btn, true, 'Aguarde…'); msg('');
      try {
        const corpo = { email: $('#a-email').value, senha: $('#a-senha').value };
        if (criar) {
          if (!$('#aceite').checked) { msg('Para criar a conta, marque que leu e aceita os Termos e a Política de Privacidade.'); return ocupado(btn, false, t); }
          corpo.nome = $('#a-nome').value; corpo.aceite = true;
        }
        me = await api('POST', criar ? '/api/auth/cadastro' : '/api/auth/entrar', corpo);
        seguir();
      } catch (e) { msg(e.message); ocupado(btn, false, t); }
    };
  }

  /* ---------- entrar com o Google ---------- */
  function carregarGoogle() {
    return new Promise((ok) => {
      if (window.google && window.google.accounts && window.google.accounts.id) return ok(true);
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client?hl=pt_BR'; s.async = true;
      s.onload = () => ok(true); s.onerror = () => ok(false);
      document.head.appendChild(s);
    });
  }
  async function botaoGoogle(criar) {
    if (!me || !me.googleClientId || !$('#g-btn')) return;
    if (!(await carregarGoogle()) || !$('#g-btn')) return;       // sem internet ou bloqueado: segue só com e-mail e senha
    window.google.accounts.id.initialize({
      client_id: me.googleClientId, auto_select: false,
      callback: async (resp) => {
        msg('');
        if (criar && !$('#aceite').checked) return msg('Para criar a conta, marque que leu e aceita os Termos e a Política de Privacidade.');
        try { me = await api('POST', '/api/auth/google', { credential: resp.credential, aceite: true }); seguir(); }
        catch (e) { msg(e.message); }
      },
    });
    $('#g-area').hidden = false;
    window.google.accounts.id.renderButton($('#g-btn'), { theme: 'outline', size: 'large', shape: 'pill', text: criar ? 'signup_with' : 'signin_with', locale: 'pt_BR', width: Math.min(320, $('#g-btn').clientWidth || 320) });
  }

  /* ---------- esqueci minha senha ---------- */
  function telaEsqueci() {
    const ativo = !(me && me.emailAtivo === false);
    tela(`<section class="hero-app"><p class="eyebrow">FamilyPilot</p><h1>Esqueci minha senha</h1>
      <p>${ativo ? 'Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.' : 'A recuperação por e-mail ainda não está ativa.'}</p></section>
      ${ativo ? `<form id="f-esq" class="form" novalidate>
        <label class="campo">E-mail<input id="e-email" type="email" inputmode="email" autocomplete="email" maxlength="160" required></label>
        <p id="msg" class="msg" role="alert"></p>
        <button class="btn" type="submit">Enviar link</button></form>`
        : '<div class="alerta">Fale com o Grupo Semeia Digital para recuperar o acesso à sua conta.</div>'}
      <button class="voltar" id="volta" style="margin-top:14px">← Voltar para entrar</button>`);
    $('#volta').onclick = () => { modo = 'entrar'; telaEntrar(); };
    if (!ativo) return;
    $('#f-esq').onsubmit = async (ev) => {
      ev.preventDefault();
      const btn = ev.target.querySelector('button[type=submit]'), t = btn.textContent;
      ocupado(btn, true, 'Enviando…'); msg('');
      try {
        await api('POST', '/api/auth/esqueci', { email: $('#e-email').value });
        // a resposta é sempre a mesma, exista a conta ou não
        ev.target.innerHTML = '<div class="card"><b>Pedido recebido</b><p>Se houver uma conta com esse e-mail, o link chega em alguns minutos. Olhe também a caixa de spam. O link vale por 1 hora.</p></div>';
      } catch (e) { msg(e.message); ocupado(btn, false, t); }
    };
  }

  function telaNovaSenha(token) {
    tela(`<section class="hero-app"><p class="eyebrow">FamilyPilot</p><h1>Crie uma nova senha</h1><p>Mínimo de 8 caracteres.</p></section>
      <form id="f-nova" class="form" novalidate>
        <label class="campo">Nova senha<input id="n-senha" type="password" autocomplete="new-password" maxlength="100" required></label>
        <label class="campo">Repita a nova senha<input id="n-senha2" type="password" autocomplete="new-password" maxlength="100" required></label>
        <p id="msg" class="msg" role="alert"></p>
        <button class="btn" type="submit">Salvar e entrar</button></form>`);
    $('#f-nova').onsubmit = async (ev) => {
      ev.preventDefault();
      const s1 = $('#n-senha').value;
      if (s1 !== $('#n-senha2').value) return msg('As duas senhas precisam ser iguais.');
      const btn = ev.target.querySelector('button[type=submit]'), t = btn.textContent;
      ocupado(btn, true, 'Salvando…'); msg('');
      try { me = await api('POST', '/api/auth/nova-senha', { token, senha: s1 }); seguir(); }
      catch (e) { msg(e.message); ocupado(btn, false, t); }
    };
  }

  function itemBirra() { return { id: 'birra', nome: 'SOS Birra + 4 bônus interativos', preco: (me.precos && me.precos.birra) || me.preco, precoCheio: me.precosCheios && me.precosCheios.birra }; }

  function telaAssinar(item) {
    item = item || itemBirra(); atual = item;
    const dentro = !!(window.FamilyPilot && window.FamilyPilot._on);   // compra de outro módulo, já dentro do app
    const renovar = !dentro && !!(me.acesso && me.acesso.ate);
    tela(`<section class="hero-app"><p class="eyebrow">Olá, ${esc(me.usuario.nome.split(' ')[0])}</p>
      <h1>${dentro ? 'Liberar ' + esc(item.nome) : renovar ? 'Seu acesso terminou' : 'Falta só liberar o acesso'}</h1>
      <p>${renovar ? 'Renove para continuar usando o SOS Birra.' : 'Pagamento único, sem mensalidade.'}</p></section>
      ${me.acesso && me.acesso.livrePendente ? '<div class="alerta"><b>Seu e-mail tem acesso liberado pela equipe, mas ainda não foi confirmado.</b> Saia e entre com o <b>Google</b>, ou use <b>Esqueci minha senha</b> para confirmar que o e-mail é seu. Depois disso o acesso total é liberado.</div>' : ''}
      <div class="card preco"><b>${esc(item.nome)}</b>
        ${item.precoCheio ? `<div class="de"><s>de ${brl(item.precoCheio)}</s> <span class="selo-lanc">preço de lançamento</span></div>` : ''}
        <div class="valor">${brl(item.preco)}</div>
        ${item.desconto > 0 ? `<p class="desconto">Descontamos <b>${brl(item.desconto)}</b> do que você já pagou nos seus módulos ativos. Pacote completo: ${brl(item.preco + item.desconto)}.</p>` : ''}
        <p>Pagamento único. Acesso por 12 meses a partir da confirmação do pagamento. Pix, boleto ou cartão.</p></div>
      ${me.pagamentoOnline ? `<form id="f-pag" class="form" novalidate>
        <label class="campo">CPF ou CNPJ (exigido pela empresa de pagamento)<input id="p-doc" inputmode="numeric" autocomplete="off" maxlength="18" placeholder="Somente números"></label>
        <p id="msg" class="msg" role="alert"></p>
        <button class="btn" type="submit">Ir para o pagamento</button></form>
        <button class="btn claro" id="ja-paguei">Já paguei. Liberar meu acesso</button>`
        : '<div class="alerta">O pagamento online ainda não está ativo. Fale com o Grupo Semeia Digital para liberar seu acesso.</div>'}
      <p class="nota">Garantia incondicional de 7 dias: se não gostar, peça o reembolso integral dentro desse prazo.</p>
      ${dentro ? '<button class="voltar" id="sair" style="margin-top:10px">← Voltar ao app</button>' : `<button class="voltar" id="sair" style="margin-top:10px">Sair da conta (${esc(me.usuario.email)})</button>`}`);
    $('#sair').onclick = dentro ? () => location.reload() : sair;
    if (!me.pagamentoOnline) return;
    $('#f-pag').onsubmit = async (ev) => {
      ev.preventDefault();
      const btn = ev.target.querySelector('button[type=submit]'), t = btn.textContent;
      ocupado(btn, true, 'Abrindo o pagamento…'); msg('');
      try { const r = await api('POST', '/api/pagamento', { cpfCnpj: $('#p-doc').value, modulo: item.id, oferta: !!item.oferta }); if (!r.url) throw new Error('Não foi possível abrir o pagamento. Tente de novo.'); location.href = r.url; }
      catch (e) { msg(e.message); ocupado(btn, false, t); }
    };
    $('#ja-paguei').onclick = verificar;
  }

  async function verificar() {
    const btn = $('#ja-paguei'); if (btn) ocupado(btn, true, 'Conferindo…');
    try {
      const r = await api('POST', '/api/pagamento/verificar');
      me.acesso = r.acesso;
      const id = (atual || itemBirra()).id;
      const todos = Object.values(r.acesso.modulos || {});
      const liberado = id === 'pacote' ? todos.length >= 7 && todos.every((x) => x.ativo) : !!(r.acesso.modulos && r.acesso.modulos[id] && r.acesso.modulos[id].ativo);
      if (liberado) {
        if (window.FamilyPilot && window.FamilyPilot._on) return location.reload();   // recarrega com o módulo novo
        return seguir();
      }
      msg('Ainda não recebemos a confirmação. Pix costuma levar poucos segundos; boleto pode levar 1 a 2 dias úteis.');
    } catch (e) { msg(e.message); }
    if (btn) ocupado(btn, false, 'Já paguei. Liberar meu acesso');
  }

  /* ---------- fluxo ---------- */
  async function seguir() {
    if (!me.usuario) return telaEntrar();
    // veio da landing pelo botão do Pacote Família: vai direto para o pagamento do pacote
    if (/[?&]comprar=pacote/.test(location.search) && me.precos && me.precos.pacote) {
      const todos = Object.values((me.acesso && me.acesso.modulos) || {});
      history.replaceState(null, '', location.pathname + location.hash);
      if (!(todos.length >= 7 && todos.every((m) => m.ativo))) return telaAssinar({ id: 'pacote', nome: 'Pacote Família: todos os 7 módulos', preco: me.pacote ? me.pacote.preco : me.precos.pacote, desconto: me.pacote ? me.pacote.credito : 0, precoCheio: me.precosCheios && me.precosCheios.pacote });
    }
    if (!me.acesso.ativo) return telaAssinar();
    try {
      const conteudo = await api('GET', '/api/conteudo');
      guardar({ me, conteudo });
      history.replaceState(null, '', location.pathname + location.hash);
      await FamilySync.puxar(me.usuario.email);   // registros da conta (cifrados no servidor) → este aparelho
      sairVisivel(true); faixa();
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
      FamilySync.offlineInit(c.me.usuario.email);
      sairVisivel(true); faixa(); window.FamilyPilot.start(c.conteudo, c.me); return;
    }
    tela('<section class="hero-app"><h1>Sem conexão</h1><p>Conecte-se à internet para entrar.</p></section><button class="btn" onclick="location.reload()">Tentar de novo</button>');
  }

  async function sair() {
    if (!(await FamilySync.antesDeSair()) && !confirm('Alguns registros ainda não foram enviados para a sua conta (sem internet). Se sair agora, eles ficam só neste aparelho e podem ser perdidos. Sair mesmo assim?')) return;
    try { await api('POST', '/api/auth/sair', {}); }
    catch (e) {
      // sem internet não dá para encerrar a sessão no servidor: avisa em vez de fingir que saiu
      if (!e.status) return alert('Sem conexão com a internet. Conecte-se para sair da conta.');
    }
    guardar(null); location.href = location.pathname;
  }

  async function iniciar() {
    try { me = await api('GET', '/api/auth/eu'); } catch (e) { return offline(); }
    // veio do link do e-mail: o token fica no fragmento (não vai para o servidor) e sai da barra de endereço na hora
    const m = /^#\/nova-senha\/([\w-]+)/.exec(location.hash);
    if (m) { history.replaceState(null, '', location.pathname); return telaNovaSenha(m[1]); }
    seguir();
  }
  // ao voltar da página de pagamento, confere sozinho
  document.addEventListener('visibilitychange', () => { if (!document.hidden && me && me.usuario && $('#ja-paguei')) verificar(); });

  $('#btn-sair').onclick = sair;
  // Administrador: escolher a visão de usuário e voltar à própria visão
  async function verComo(modulos, oferta) {
    try { await api('POST', '/api/admin/visao', { modulos, oferta: !!oferta }); location.reload(); }
    catch (e) { alert(e.message); }
  }
  async function sairVisao() {
    try { await api('POST', '/api/admin/visao', { modulos: null }); location.reload(); }
    catch (e) { alert(e.message); }
  }
  $('#faixa-sair').onclick = sairVisao;
  window.FamilyAuth = { api, sair, verComo, sairVisao, comprar: (item) => { if (item) telaAssinar({ id: item.id, nome: item.nome, preco: item.preco, precoCheio: item.precoCheio, desconto: item.desconto || 0, oferta: !!item.oferta }); } };
  iniciar();
})();
