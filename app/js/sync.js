/* Registros na nuvem: o aparelho guarda uma cópia (abre rápido e funciona sem internet) e o servidor guarda a versão cifrada da conta.
   Diário/radar (SOS Birra) e as ferramentas dos outros módulos viram dois blocos: "birra" e "modulos".
   Apagar vira "lápide" (id → quando), para o item não voltar quando outro aparelho ainda o tem. */
(function () {
  const LK = { birra: (e) => 'familypilot.v1.' + e, modulos: (e) => 'familypilot.m.' + e };
  const CHAVES = Object.keys(LK);
  const DIAS_LAPIDE = 180, MAX_REG = 300;
  let email = null, ativo = false, estado = 'local';   // local: só neste aparelho · ok · salvando · offline
  const versoes = { birra: 0, modulos: 0 }, pend = {}, timers = {}, ouvintes = {};
  let ocupado = {}, perguntou = false;

  const ler = (k) => { try { return JSON.parse(localStorage.getItem(LK[k](email)) || 'null'); } catch (e) { return null; } };
  const gravar = (k, v) => { try { localStorage.setItem(LK[k](email), JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };
  const mudou = () => { try { window.dispatchEvent(new Event('familysync')); } catch (e) { /* sem eventos */ } };
  const def = (s) => { estado = s; mudou(); };

  async function http(metodo, url, corpo, extra) {
    const r = await fetch(url, Object.assign({ method: metodo, credentials: 'same-origin', headers: corpo ? { 'content-type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined }, extra || {}));
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, d };
  }

  /* ---------- juntar o que está neste aparelho com o que veio do servidor ---------- */
  function lapides(a, b) {
    const corte = Date.now() - DIAS_LAPIDE * 864e5, out = {};
    [b && b.apagados, a && a.apagados].forEach((m) => Object.keys(m || {}).forEach((id) => { if (m[id] > corte) out[id] = m[id]; }));
    return out;
  }
  const uniao = (ap, x, y) => { const m = new Map(); (y || []).concat(x || []).forEach((i) => { if (i && i.id && !ap[i.id]) m.set(i.id, i); }); return [...m.values()]; };
  /** a = deste aparelho, b = do servidor. mandaLocal: nos itens únicos (idade, faixa) vale o que está aqui. */
  function juntar(k, a, b, mandaLocal) {
    a = a || {}; b = b || {};
    const ap = lapides(a, b), pref = mandaLocal ? [a, b] : [b, a];
    if (k === 'birra') {
      return { diario: uniao(ap, a.diario, b.diario), radar: uniao(ap, a.radar, b.radar), idade: pref[0].idade || pref[1].idade || '4-5', apagados: ap };
    }
    const reg = {};
    new Set(Object.keys(a.reg || {}).concat(Object.keys(b.reg || {}))).forEach((c) => {
      reg[c] = uniao(ap, (a.reg || {})[c], (b.reg || {})[c]).sort((x, y) => (x.criado || 0) - (y.criado || 0)).slice(-MAX_REG);
    });
    return { faixa: Object.assign({}, pref[1].faixa, pref[0].faixa), reg, apagados: ap };
  }

  /* ---------- enviar ---------- */
  async function enviar(k, keepalive) {
    if (!ativo || ocupado[k]) return;
    ocupado[k] = true;
    try {
      for (let tent = 0; tent < 4; tent++) {
        const local = ler(k) || {};
        def('salvando');
        const r = await http('PUT', '/api/dados/' + k, { base: versoes[k], dados: local }, keepalive ? { keepalive: true } : null);
        if (r.ok) { versoes[k] = r.d.versao; delete pend[k]; break; }
        if (r.status === 409) {
          const atual = r.d.atual;
          const junto = juntar(k, local, atual && atual.dados, true);
          gravar(k, junto); versoes[k] = atual ? atual.versao : 0;
          (ouvintes[k] || []).forEach((f) => { try { f(); } catch (e) { /* tela já saiu */ } });
          continue;
        }
        if (r.status === 403 && r.d.consentimento === false) { ativo = false; delete pend[k]; def('consentimento'); return; }
        if (r.status === 503 || r.status === 401) { ativo = false; delete pend[k]; def('local'); return; }
        throw new Error('falhou');
      }
      def(Object.keys(pend).length ? 'offline' : 'ok');
    } catch (e) { pend[k] = true; def('offline'); }
    finally { ocupado[k] = false; }
  }

  function agendar(k) {
    if (!ativo) { if (estado === 'consentimento' && !perguntou) { perguntou = true; pedir(); } return; }
    pend[k] = true; clearTimeout(timers[k]);
    timers[k] = setTimeout(() => enviar(k), 1200);
  }
  async function enviarPendentes(keepalive) { await Promise.all(Object.keys(pend).map((k) => { clearTimeout(timers[k]); return enviar(k, keepalive); })); }

  /* ---------- ao abrir o app ---------- */
  async function puxar(emailConta) {
    email = emailConta; ativo = false; def('local');
    let r;
    try { r = await http('GET', '/api/dados', null, { signal: AbortSignal.timeout(7000) }); } catch (e) { r = null; }
    if (!r) { ativo = true; CHAVES.forEach((k) => { versoes[k] = 0; pend[k] = !!ler(k); }); def('offline'); return; }   // sem internet: usa o aparelho e tenta depois
    if (r.status === 403 && r.d.consentimento === false) { def('consentimento'); return; }   // falta a autorização do responsável: segue só no aparelho
    if (!r.ok) return;                                        // 503: nuvem ainda não ativa; segue só no aparelho
    ativo = true;
    CHAVES.forEach((k) => {
      const remoto = r.d[k], local = ler(k);
      versoes[k] = remoto ? remoto.versao : 0;
      const junto = juntar(k, local, remoto && remoto.dados, false);
      gravar(k, junto);
      if (!remoto ? !!local : JSON.stringify(junto) !== JSON.stringify(remoto.dados)) pend[k] = true;
    });
    def('ok');
    enviarPendentes();
  }
  /** Sem internet na abertura: não dá para conferir o servidor, mas o que o pai anotar sobe quando a conexão voltar. */
  function offlineInit(emailConta) { email = emailConta; ativo = true; CHAVES.forEach((k) => { versoes[k] = 0; }); def('offline'); }

  window.addEventListener('online', () => { if (ativo) enviarPendentes(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && ativo) enviarPendentes(true); else if (ativo && Object.keys(pend).length) enviarPendentes(); });

  /* ---------- consentimento do responsável (caixa separada, LGPD art. 14) ---------- */
  async function autorizar() {
    const r = await http('POST', '/api/dados/consentimento', { aceite: true });
    if (!r.ok) throw new Error(r.d.erro || 'Não foi possível registrar agora.');
    await puxar(email);
  }
  async function revogar() {
    const r = await http('POST', '/api/dados/consentimento', { aceite: false });
    if (!r.ok) throw new Error(r.d.erro || 'Não foi possível revogar agora.');
    CHAVES.forEach((k) => { versoes[k] = 0; delete pend[k]; }); ativo = false; perguntou = true; def('consentimento');
  }
  /** Janela com a caixa de autorização, separada dos Termos. Sem marcar, os registros ficam só no aparelho. */
  function pedir(aoFim) {
    if (document.getElementById('cs-fundo')) return;
    const f = document.createElement('div'); f.id = 'cs-fundo'; f.className = 'modal';
    f.innerHTML = '<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="cs-t"><h2 id="cs-t">Guardar seus registros na sua conta?</h2>' +
      '<p>Assim você abre o diário, o radar e as anotações em qualquer aparelho. Tudo é cifrado, só você vê, e você pode apagar quando quiser. Se preferir, eles ficam só neste aparelho.</p>' +
      '<label class="opt"><input type="checkbox" id="cs-ok"><span>Sou o pai, a mãe ou o responsável legal e autorizo o FamilyPilot a guardar, de forma cifrada na minha conta, os registros que eu fizer sobre meus filhos. Posso revogar e apagar a qualquer momento em Módulos → Seus dados. <a href="/privacidade" target="_blank" rel="noopener">Política de Privacidade</a></span></label>' +
      '<p id="cs-msg" class="msg"></p><button class="btn" id="cs-sim" disabled>Autorizar e guardar na minha conta</button> <button class="mini" id="cs-nao" type="button">Agora não, só neste aparelho</button></div>';
    document.body.appendChild(f);
    const ok = f.querySelector('#cs-ok'), sim = f.querySelector('#cs-sim');
    ok.onchange = () => { sim.disabled = !ok.checked; };
    f.querySelector('#cs-nao').onclick = () => f.remove();
    sim.onclick = async () => {
      sim.disabled = true;
      try { await autorizar(); f.remove(); if (aoFim) aoFim(); }
      catch (e) { f.querySelector('#cs-msg').textContent = e.message; sim.disabled = !ok.checked; }
    };
    ok.focus();
  }

  /* ---------- sair, baixar, apagar, excluir ---------- */
  const limparAparelho = () => { try { CHAVES.forEach((k) => localStorage.removeItem(LK[k](email))); } catch (e) { /* nada */ } };
  /** Antes de sair: sobe o que falta e tira os registros do aparelho (outra pessoa pode usar o mesmo celular). false = não conseguiu enviar. */
  async function antesDeSair() {
    if (!ativo) return true;
    await enviarPendentes();
    if (Object.keys(pend).length) return false;
    limparAparelho(); return true;
  }
  async function baixar() {
    const r = await fetch('/api/dados/exportar', { credentials: 'same-origin' });
    if (!r.ok) throw new Error('Não foi possível gerar o arquivo agora.');
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement('a'); a.href = url; a.download = 'meus-dados-familypilot.json'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  async function apagarRegistros() {
    const r = await http('DELETE', '/api/dados');
    if (!r.ok) throw new Error(r.d.erro || 'Não foi possível apagar agora.');
    CHAVES.forEach((k) => { versoes[k] = 0; delete pend[k]; }); limparAparelho();
  }
  async function excluirConta(corpo) {
    const r = await http('POST', '/api/dados/excluir-conta', corpo);
    if (!r.ok) throw new Error(r.d.erro || 'Não foi possível excluir agora.');
    ativo = false; limparAparelho();
  }

  window.FamilySync = {
    puxar, offlineInit, agendar, antesDeSair, baixar, apagarRegistros, excluirConta, autorizar, revogar, pedir,
    ativo: () => ativo, estado: () => estado,
    lapide(obj, id) { obj.apagados = obj.apagados || {}; obj.apagados[id] = Date.now(); },
    aoMudar(k, f) { (ouvintes[k] = ouvintes[k] || []).push(f); },
    zerarOuvintes() { CHAVES.forEach((k) => { ouvintes[k] = []; }); },
  };
})();
