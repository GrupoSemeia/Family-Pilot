/* Avisos do site em janela (popup): erros, avisos, confirmações e perguntas. Substitui alert(), confirm() e prompt() do navegador.
   Cada função devolve uma Promise: erro/aviso/ok/info → quando a pessoa fecha; confirmar → true/false; perguntar → texto ou null. */
(function () {
  const ICONES = { erro: '⛔', aviso: '⚠️', ok: '✅', info: 'ℹ️', pergunta: '❓' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let n = 0, fila = Promise.resolve();

  /** opts: tipo, titulo, texto, botoes[{rotulo, valor, primario, perigo}], campo{tipo, valor, placeholder, maxlength} */
  function abrir(opts) {
    // uma janela por vez: as seguintes esperam a anterior fechar
    const p = fila.then(() => new Promise((resolve) => {
      const id = ++n, antes = document.activeElement;
      const f = document.createElement('div'); f.id = 'aviso-fundo'; f.className = 'modal aviso-fundo';
      const botoes = opts.botoes || [{ rotulo: 'Entendi', valor: true, primario: true }];
      f.innerHTML = `<div class="aviso-box aviso-${esc(opts.tipo || 'aviso')}" role="alertdialog" aria-modal="true" aria-labelledby="av-t${id}" aria-describedby="av-d${id}">
        <div class="aviso-icone" aria-hidden="true">${ICONES[opts.tipo] || ICONES.aviso}</div>
        <h2 id="av-t${id}">${esc(opts.titulo || 'Atenção')}</h2>
        <p id="av-d${id}" class="aviso-texto">${esc(opts.texto || '')}</p>
        ${opts.campo ? `<input id="aviso-campo" class="aviso-campo" type="${esc(opts.campo.tipo || 'text')}" value="${esc(opts.campo.valor || '')}" placeholder="${esc(opts.campo.placeholder || '')}" maxlength="${Number(opts.campo.maxlength) || 100}" autocomplete="off" aria-label="${esc(opts.titulo || 'Resposta')}">` : ''}
        <div class="aviso-botoes">${botoes.map((b, i) => `<button type="button" class="btn${b.primario ? '' : ' claro'}${b.perigo ? ' perigo' : ''}" data-av="${i}">${esc(b.rotulo)}</button>`).join('')}</div></div>`;
      document.body.appendChild(f); document.body.classList.add('modal-aberto');
      const campo = f.querySelector('#aviso-campo');
      const fecha = (valor) => {
        document.removeEventListener('keydown', tecla, true); f.remove();
        if (!document.querySelector('.aviso-fundo')) document.body.classList.remove('modal-aberto');
        try { if (antes && antes.focus && document.contains(antes)) antes.focus(); } catch (e) { /* elemento saiu da tela */ }
        resolve(valor);
        if (opts.aoFechar) { try { opts.aoFechar(valor); } catch (e) { /* tela já mudou */ } }
      };
      const cancelaValor = opts.campo ? null : botoes.length > 1 ? false : true;
      const valorDe = (i) => { const b = botoes[i]; return opts.campo ? (b.valor ? (campo.value) : null) : b.valor; };
      function tecla(e) {
        if (e.key === 'Escape') { e.preventDefault(); fecha(cancelaValor); return; }
        if (e.key === 'Enter' && campo && document.activeElement === campo) { e.preventDefault(); const i = botoes.findIndex((b) => b.primario); fecha(valorDe(i < 0 ? 0 : i)); return; }
        if (e.key === 'Tab') {   // o foco fica dentro da janela
          const el = [...f.querySelectorAll('button, input')], a = el.indexOf(document.activeElement);
          if (!el.length) return;
          e.preventDefault(); el[(a + (e.shiftKey ? -1 : 1) + el.length) % el.length].focus();
        }
      }
      document.addEventListener('keydown', tecla, true);
      f.querySelectorAll('[data-av]').forEach((b) => { b.onclick = () => fecha(valorDe(Number(b.dataset.av))); });
      const primeiro = campo || f.querySelector('.btn:not(.claro)') || f.querySelector('button');
      setTimeout(() => primeiro && primeiro.focus(), 30);
    }));
    fila = p.then(() => {}, () => {});
    return p;
  }

  window.FPAviso = {
    erro: (texto, o) => abrir(Object.assign({ tipo: 'erro', titulo: 'Não foi possível continuar', texto }, o)),
    aviso: (texto, o) => abrir(Object.assign({ tipo: 'aviso', titulo: 'Atenção', texto }, o)),
    ok: (texto, o) => abrir(Object.assign({ tipo: 'ok', titulo: 'Tudo certo', texto }, o)),
    info: (texto, o) => abrir(Object.assign({ tipo: 'info', titulo: 'Informação', texto }, o)),
    confirmar: (texto, o) => { o = o || {}; return abrir({ tipo: o.perigo ? 'aviso' : 'pergunta', titulo: o.titulo || 'Confirmar', texto, botoes: [{ rotulo: o.cancelar || 'Cancelar', valor: false }, { rotulo: o.ok || 'Confirmar', valor: true, primario: true, perigo: !!o.perigo }] }); },
    perguntar: (texto, o) => { o = o || {}; return abrir({ tipo: 'pergunta', titulo: o.titulo || 'Digite', texto, campo: { tipo: o.tipo, valor: o.valor, placeholder: o.placeholder, maxlength: o.maxlength }, botoes: [{ rotulo: o.cancelar || 'Cancelar', valor: false }, { rotulo: o.ok || 'Confirmar', valor: true, primario: true }] }); },
  };
})();
