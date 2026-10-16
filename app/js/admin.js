/* Painel do administrador: resumo, clientes e pedidos (só leitura). Não mostra CPF/CNPJ nem registros das famílias. */
(function () {
  let X = null;
  const S = { aba: 'resumo', dados: {}, busca: '', status: '', pagina: 0, carregando: false, erro: '' };
  const NOMES = { birra: 'SOS Birra', sono: 'SOS Sono', telas: 'SOS Telas', alimentacao: 'SOS Alimentação', limites: 'SOS Limites', escola: 'SOS Escola', adolescencia: 'SOS Adolescência', pacote: 'Pacote Família' };
  const STATUS = { pago: 'Pago', pendente: 'Pendente', reembolsado: 'Reembolsado', cancelado: 'Cancelado' };
  const E = (s) => X.esc(s);
  const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dia = (s) => { if (!s) return '—'; const d = new Date(String(s).replace(' ', 'T') + 'Z'); return isNaN(d) ? '—' : d.toLocaleDateString('pt-BR'); };

  async function carregar() {
    const q = S.aba === 'resumo' ? '/api/admin/resumo' : S.aba === 'clientes' ? '/api/admin/clientes?pagina=' + S.pagina + '&busca=' + encodeURIComponent(S.busca) : '/api/admin/pedidos?pagina=' + S.pagina + '&status=' + S.status;
    S.carregando = true; S.erro = ''; X.reRender();
    try { const r = await fetch(q, { credentials: 'same-origin' }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.erro || 'Não foi possível carregar.'); S.dados[S.aba] = d; }
    catch (e) { S.erro = e.message; }
    S.carregando = false; X.reRender();
  }

  const abas = () => `<div class="chips">${[['resumo', 'Resumo'], ['clientes', 'Clientes'], ['pedidos', 'Pedidos']].map(([id, n]) => `<button type="button" class="chip${S.aba === id ? ' on' : ''}" data-adm="aba" data-v="${id}">${n}</button>`).join('')}</div>`;
  const pager = (mais) => (S.pagina > 0 || mais) ? `<div class="predef"><button class="mini" data-adm="pag" data-v="-1" ${S.pagina ? '' : 'disabled'}>← Anteriores</button><button class="mini" data-adm="pag" data-v="1" ${mais ? '' : 'disabled'}>Próximos →</button></div>` : '';

  function resumo(d) {
    const p = d.pedidos || {}, v = (k) => (p[k] ? p[k].valor : 0), n = (k) => (p[k] ? p[k].n : 0);
    return `<div class="card"><b>${d.contas.total} contas</b><p>${d.contas.n7} nos últimos 7 dias · ${d.contas.n30} nos últimos 30 dias · ${d.compradores} já compraram</p></div>
      <div class="card"><b>Faturamento: ${brl(v('pago'))}</b><p>${n('pago')} pedidos pagos · ${n('pendente')} pendentes · ${n('reembolsado')} reembolsados (${brl(v('reembolsado'))}) · ${n('cancelado')} cancelados</p></div>
      <div class="card"><b>Vendas por produto</b>${d.modulos.length ? `<ul class="lista">${d.modulos.map((m) => `<li>${E(NOMES[m.modulo] || m.modulo)}: ${m.n} · ${brl(m.valor)}</li>`).join('')}</ul>` : '<p>Nenhuma venda ainda.</p>'}</div>`;
  }
  function clientes(d) {
    return `<form data-adm-form="busca" class="predef"><input id="adm-busca" type="search" placeholder="Buscar por nome ou e-mail" value="${E(S.busca)}" style="flex:1;min-width:0"><button class="mini" type="submit">Buscar</button></form>
      ${d.clientes.length ? d.clientes.map((c) => `<div class="card"><b>${E(c.nome)}</b><p>${E(c.email)}</p>
        <p><small>Criada em ${dia(c.criadoEm)} · ${c.google ? 'Google' : 'e-mail e senha'}${c.verificado ? ' · e-mail confirmado' : ''} · ${c.pedidos} pedido(s) · pago ${brl(c.pago)}</small></p>
        <p>${c.pacote ? '<b>Pacote Família</b>' : c.modulosAtivos.length ? c.modulosAtivos.map((m) => E(NOMES[m] || m)).join(', ') : '<small>Sem acesso ativo</small>'}</p></div>`).join('') : '<p>Nenhuma conta encontrada.</p>'}${pager(d.mais)}`;
  }
  function pedidos(d) {
    return `<div class="chips" style="margin:8px 0">${[['', 'Todos'], ['pago', 'Pagos'], ['pendente', 'Pendentes'], ['reembolsado', 'Reembolsados']].map(([id, n]) => `<button type="button" class="chip${S.status === id ? ' on' : ''}" data-adm="status" data-v="${id}">${n}</button>`).join('')}</div>
      ${d.pedidos.length ? d.pedidos.map((p) => `<div class="card"><b>${E(NOMES[p.modulo] || p.modulo)} · ${brl(p.valor)}</b> <small>(${STATUS[p.status] || E(p.status)})</small><p>${E(p.nome)} · ${E(p.email)}</p>
        <p><small>Pedido em ${dia(p.criadoEm)}${p.pagoEm ? ' · pago em ' + dia(p.pagoEm) + (p.forma ? ' (' + E(p.forma) + ')' : '') : ''}${p.acessoAte && p.status === 'pago' ? ' · acesso até ' + dia(p.acessoAte) : ''}</small></p></div>`).join('') : '<p>Nenhum pedido.</p>'}${pager(d.mais)}`;
  }

  function view() {
    const d = S.dados[S.aba];
    if (!d && !S.carregando && !S.erro) setTimeout(carregar, 0);
    const corpo = S.erro ? `<div class="alerta">${E(S.erro)}</div>` : !d ? '<p>Carregando…</p>' : S.aba === 'resumo' ? resumo(d) : S.aba === 'clientes' ? clientes(d) : pedidos(d);
    return `<a class="voltar" href="#/modulos">← Módulos</a><section class="hero-app"><p class="eyebrow">Administrador</p><h1>Clientes e pedidos</h1>
      <p>Somente leitura. Por privacidade, aqui não aparecem CPF/CNPJ nem os registros das famílias (diário, radar e anotações).</p></section>${abas()}${corpo}`;
  }

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-adm]');
    if (!el || !X) return;
    const a = el.dataset.adm, v = el.dataset.v;
    if (a === 'aba') { S.aba = v; S.pagina = 0; S.erro = ''; if (S.dados[v] && v === 'resumo') { X.reRender(); } else { delete S.dados[v]; } X.reRender(); return; }
    if (a === 'status') { S.status = v; S.pagina = 0; delete S.dados.pedidos; carregar(); return; }
    if (a === 'pag') { S.pagina = Math.max(0, S.pagina + Number(v)); carregar(); }
  });
  document.addEventListener('submit', (ev) => {
    if (!X || ev.target.dataset.admForm !== 'busca') return;
    ev.preventDefault(); S.busca = document.getElementById('adm-busca').value.trim(); S.pagina = 0; carregar();
  });

  window.FPAdmin = { init(ctx) { X = ctx; S.dados = {}; S.aba = 'resumo'; S.pagina = 0; S.busca = ''; S.status = ''; S.erro = ''; }, view };
})();
