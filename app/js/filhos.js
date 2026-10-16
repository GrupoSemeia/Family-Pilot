/* Filhos: um APELIDO por filho (nunca o nome completo) para identificar e filtrar os registros.
   A lista fica junto dos demais registros (cifrada na conta, se a pessoa autorizou). O filtro "filho em foco" fica só neste aparelho. */
(function () {
  const MAX = 6, MAXLEN = 20;
  let email = null;
  const lerLista = () => ((FamilySync.dados('filhos') || {}).lista || []).slice().sort((a, b) => (a.criado || 0) - (b.criado || 0));
  const gravar = (mut) => { const o = FamilySync.dados('filhos') || { lista: [], apagados: {} }; o.lista = o.lista || []; mut(o); FamilySync.salvarLocal('filhos', o); };
  const FK = () => 'familypilot.filtro.' + email;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  function limpo(apelido, ignorarId) {
    const a = String(apelido || '').replace(/\s+/g, ' ').trim();
    if (!a) throw new Error('Digite um apelido.');
    if (a.length > MAXLEN) throw new Error('Use no máximo ' + MAXLEN + ' letras. Um apelido curto basta.');
    if (a.split(' ').length > 2) throw new Error('Use só um apelido, sem sobrenome.');
    if (lerLista().some((f) => f.id !== ignorarId && f.apelido.toLowerCase() === a.toLowerCase())) throw new Error('Você já tem um filho com esse apelido.');
    return a;
  }
  const api = {
    init(e) { email = e; },
    max: MAX, maxLen: MAXLEN,
    todos: lerLista,
    nome(id) { const f = lerLista().find((x) => x.id === id); return f ? f.apelido : ''; },
    adicionar(apelido) {
      if (lerLista().length >= MAX) throw new Error('O limite é de ' + MAX + ' filhos.');
      const a = limpo(apelido), id = uid(); gravar((o) => o.lista.push({ id, apelido: a, criado: Date.now() })); return id;
    },
    renomear(id, apelido) { const a = limpo(apelido, id); gravar((o) => { const f = o.lista.find((x) => x.id === id); if (f) { f.apelido = a; f.editado = Date.now(); } }); },
    remover(id) { gravar((o) => { o.lista = o.lista.filter((x) => x.id !== id); FamilySync.lapide(o, id); }); if (api.filtro() === id) api.definirFiltro(''); },
    /** filho em foco (só neste aparelho); '' = todos */
    filtro() { let v = ''; try { v = localStorage.getItem(FK()) || ''; } catch (e) { /* sem armazenamento */ } return lerLista().some((f) => f.id === v) ? v : ''; },
    definirFiltro(id) { try { id ? localStorage.setItem(FK(), id) : localStorage.removeItem(FK()); } catch (e) { /* sem armazenamento */ } },
    /** quem vem marcado ao criar um registro: o filho em foco, ou o único filho cadastrado */
    padrao() { const f = api.filtro(); if (f) return f; const t = lerLista(); return t.length === 1 ? t[0].id : ''; },
    /** botões "Todos | apelidos" para filtrar um histórico; attr = atributo de ação do botão (ex.: 'data-act="filtro"') */
    chipsFiltro(esc, attr) {
      const t = lerLista(); if (t.length < 2) return '';
      const f = api.filtro();
      return `<div class="chips filtro-filho" role="group" aria-label="Filtrar por filho">${[['', 'Todos']].concat(t.map((x) => [x.id, x.apelido])).map(([id, n]) => `<button type="button" class="chip${f === id ? ' on' : ''}" ${attr} data-v="${esc(id)}" aria-pressed="${f === id}">${esc(n)}</button>`).join('')}</div>`;
    },
  };
  window.FPFilhos = api;
})();
