/* Primeiro uso guiado: até 3 perguntas e a primeira orientação pronta. Aparece uma vez por conta (e em "Refazer a orientação rápida").
   Passos: desafio (só se a conta tem mais de um módulo) → idade do filho → situação. O SOS Birra termina no Plano SOS já existente. */
(function () {
  let X = null;
  const G = { passo: 0, modulo: null, posPendente: false, mostrouPos: false };
  const E = (s) => X.esc(s);
  const liberados = () => X.CAT().filter((m) => m.estado === 'liberado' && m.id !== 'pacote');
  const faixasDe = (mid) => (mid === 'birra' ? X.D().IDADES.map((i) => ({ id: i.id, rotulo: i.rotulo })) : (X.MODS()[mid] ? X.MODS()[mid].faixas : []));
  const ferrSituacoes = (mid) => ((X.MODS()[mid] || {}).ferramentas || []).find((f) => f.tipo === 'situacoes');
  const concluir = () => { const db = X.db(); db.guiado = true; X.salvar(); };

  /** Mostra o guia? Só na primeira vez, para quem ainda não registrou nada. */
  function deveMostrar() {
    const db = X.db();
    if (db.guiado || db.diario.length || db.radar.length || window.FPModulo.temRegistros()) return false;
    return liberados().length > 0;
  }
  function recomecar() { G.passo = liberados().length > 1 ? 0 : 1; G.modulo = liberados().length === 1 ? liberados()[0].id : null; }

  const opcao = (acao, v, html) => `<button class="opcao" data-guia="${acao}" data-v="${E(v)}">${html}</button>`;
  const saida = (crise) => `<div class="guia-saida">${crise ? '<a class="btn sos" href="#/plano" data-guia="crise">🆘 Estou em crise agora</a>' : ''}<button class="voltar" data-guia="pular" type="button">Pular e explorar sozinho</button></div>`;

  function view() {
    if (G.passo === 0 && liberados().length <= 1) recomecar();
    const crise = !!X.D();
    const pontos = (n, de) => `<div class="dots" aria-label="Passo ${n} de ${de}">${Array.from({ length: de }, (_, i) => `<span class="${i < n ? 'on' : ''}">${i + 1}</span>`).join('')}</div>`;
    const multi = liberados().length > 1, de = multi ? 3 : 2;
    if (G.passo === 0) {
      return `${pontos(1, de)}<h1>O que está mais difícil hoje?</h1><p class="lead">Escolha um tema. Em poucos segundos você recebe uma orientação.</p>
        <div class="opcoes">${liberados().map((m) => opcao('modulo', m.id, `${E(m.icone)} <b>${E(m.nome)}</b><br><small>${E(m.frase)}</small>`)).join('')}</div>${saida(crise)}`;
    }
    if (G.passo === 1) {
      return `${pontos(multi ? 2 : 1, de)}${multi ? '<button class="voltar" data-guia="voltar" type="button">← Voltar</button>' : ''}<h1>Quantos anos tem seu filho?</h1>
        <div class="chips">${faixasDe(G.modulo).map((f) => `<button type="button" class="chip" data-guia="idade" data-v="${E(f.id)}">${E(f.rotulo)}</button>`).join('')}</div>${saida(crise)}`;
    }
    // passo 2: situação (só para os módulos com ferramenta de situações; o SOS Birra segue para o Plano SOS)
    const f = ferrSituacoes(G.modulo);
    return `${pontos(multi ? 3 : 2, de)}<button class="voltar" data-guia="voltar" type="button">← Voltar</button><h1>O que está acontecendo?</h1>
      <div class="opcoes">${f.situacoes.map((s) => opcao('sit', s.id, E(s.nome))).join('')}</div>${saida(crise)}`;
  }

  /** Cartão depois do primeiro plano: guardar o app na tela inicial e (opcional) cadastrar o apelido do filho. */
  function cartaoPos() {
    if (!G.posPendente) return '';
    G.mostrouPos = true;
    return `<div class="card guia-pos"><b>🎉 Seu primeiro plano está pronto</b>
      <p><b>Guarde o app na tela inicial</b> para abrir rápido na hora da crise. No iPhone: Compartilhar → "Adicionar à Tela de Início". No Android: menu ⋮ → "Instalar app" ou "Adicionar à tela inicial".</p>
      <p><a href="#/modulos">Cadastrar o apelido do seu filho</a> (opcional) ajuda a separar os registros de cada um.</p>
      <button class="mini" type="button" data-guia="fechar-pos">Entendi</button></div>`;
  }

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-guia]');
    if (!el || !X) return;
    const a = el.dataset.guia, v = el.dataset.v;
    if (a === 'crise') { concluir(); return; }   // o link já leva ao Plano SOS
    if (a === 'pular') { concluir(); location.hash = '#/'; return; }
    if (a === 'fechar-pos') { G.posPendente = false; X.reRender(); return; }
    if (a === 'modulo') { G.modulo = v; G.passo = 1; X.reRender(); return; }
    if (a === 'voltar') { G.passo = G.passo === 2 ? 1 : 0; if (G.passo === 0 && liberados().length <= 1) G.passo = 1; X.reRender(); return; }
    if (a === 'idade') {
      if (G.modulo === 'birra') { concluir(); G.posPendente = true; X.iniciarPlano(v); return; }   // o resto (motivo e local) é o Plano SOS de sempre
      window.FPModulo.definirFaixa(G.modulo, v); G.passo = 2; X.reRender(); return;
    }
    if (a === 'sit') {
      const f = ferrSituacoes(G.modulo); concluir(); G.posPendente = true;
      window.FPModulo.preparar(G.modulo, f.id, v); location.hash = `#/m/${G.modulo}/${f.id}`; return;
    }
  });

  window.FPGuia = { init(ctx) { X = ctx; recomecar(); }, view, deveMostrar, cartaoPos, recomecar,
    /** a cada troca de tela: o cartão do primeiro plano aparece uma vez só */
    aoMudarRota() { if (G.mostrouPos) { G.posPendente = false; G.mostrouPos = false; } } };
})();
