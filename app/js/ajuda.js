/* Compras e ajuda: histórico de pedidos da conta, continuar um pagamento pendente e como falar com o suporte. */
(function () {
  let X = null;
  const S = { dados: null, erro: '', ocupado: false, aviso: '' };
  const CONTATO = 'contato@familypilot.com.br';
  const STATUS = { pago: 'Pago', pendente: 'Aguardando pagamento', reembolsado: 'Reembolsado', cancelado: 'Cancelado' };
  const E = (s) => X.esc(s);
  const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dia = (s) => { if (!s) return ''; const d = new Date(String(s).replace(' ', 'T') + 'Z'); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR'); };

  async function carregar() {
    S.erro = '';
    try { const r = await fetch('/api/pedidos', { credentials: 'same-origin' }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.erro || 'Não foi possível carregar suas compras.'); S.dados = d.pedidos; }
    catch (e) { S.erro = e.message; S.dados = S.dados || []; }
    X.reRender();
  }
  function pedido(p) {
    const pend = p.status === 'pendente';
    return `<div class="card"><b>${E(p.nome)} · ${brl(p.valor)}</b> <small>(${E(STATUS[p.status] || p.status)})</small>
      <p><small>Pedido em ${dia(p.criadoEm)}${p.pagoEm ? ' · pago em ' + dia(p.pagoEm) + (p.forma ? ' (' + E(p.forma) + ')' : '') : ''}${p.status === 'pago' && p.acessoAte ? ' · acesso até ' + dia(p.acessoAte) : ''}</small></p>
      ${pend && p.url ? `<a class="btn mini-btn" href="${E(p.url)}" target="_blank" rel="noopener">Continuar o pagamento</a> <button class="mini" data-aj="conferir">Já paguei</button>` : ''}
      ${pend && !p.url ? '<p class="nota">Esse pagamento venceu. Para comprar de novo, vá em <a href="#/modulos">Módulos</a>.</p>' : ''}</div>`;
  }
  function view() {
    if (!S.dados && !S.erro) setTimeout(carregar, 0);
    const email = X.email;
    const mail = `mailto:${CONTATO}?subject=${encodeURIComponent('Suporte FamilyPilot')}&body=${encodeURIComponent('Olá! Meu e-mail de cadastro é ' + email + '.\n\nMinha dúvida: ')}`;
    return `<a class="voltar" href="#/modulos">← Módulos</a><section class="hero-app"><p class="eyebrow">Conta</p><h1>Compras e ajuda</h1></section>
      ${S.aviso ? `<div class="alerta" role="status">${E(S.aviso)}</div>` : ''}
      <h2 class="sec">Minhas compras</h2>
      ${S.erro ? `<div class="alerta">${E(S.erro)}</div>` : !S.dados ? '<p>Carregando…</p>' : S.dados.length ? S.dados.map(pedido).join('') : '<p class="vazio">Você ainda não fez nenhuma compra.</p>'}
      <h2 class="sec">Preciso de ajuda</h2>
      <div class="card"><b>Paguei e não liberou</b><p>Pix costuma liberar em segundos e boleto em 1 a 2 dias úteis. Se já pagou, toque em <b>"Já paguei"</b> na compra acima. Se não resolver, fale com a gente.</p></div>
      <div class="card"><b>Garantia e reembolso</b><p>Você tem 7 dias corridos, a partir da compra, para pedir o reembolso integral. Escreva para ${CONTATO} com o e-mail da sua conta e o módulo comprado.</p></div>
      <div class="card"><b>Meus registros e privacidade</b><p>Em <a href="#/modulos">Módulos</a> → "Seus dados" você baixa, apaga ou exclui tudo. Veja também os <a href="/termos" target="_blank" rel="noopener">Termos</a> e a <a href="/privacidade" target="_blank" rel="noopener">Política de Privacidade</a>.</p></div>
      <a class="btn" href="${mail}">Falar com o suporte</a>
      <p class="nota">Respondemos por e-mail, em até 1 dia útil. Endereço: ${CONTATO}</p>`;
  }
  document.addEventListener('click', async (ev) => {
    const el = ev.target.closest('[data-aj]');
    if (!el || !X) return;
    if (el.dataset.aj === 'conferir') {
      el.disabled = true; S.aviso = '';
      try {
        const r = await window.FamilyAuth.api('POST', '/api/pagamento/verificar');
        const ativos = Object.values((r.acesso && r.acesso.modulos) || {}).filter((m) => m.ativo).length;
        S.aviso = 'Conferimos seus pagamentos. ' + (ativos ? 'Seu acesso está liberado.' : 'Ainda não recebemos a confirmação.');
        S.dados = null; if (ativos) setTimeout(() => location.reload(), 1200);
      } catch (e) { S.aviso = e.message; }
      X.reRender();
    }
  });
  window.FPAjuda = { init(ctx) { X = ctx; S.dados = null; S.erro = ''; S.aviso = ''; }, view };
})();
