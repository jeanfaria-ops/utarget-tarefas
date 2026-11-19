// Cockpit Utarget — módulos por perfil (19/11/2026).
// Cada módulo lê uma RPC security definer no utarget-dados (app_mod_*), que confere o acesso no banco (app_pode).
// O menu vem de app_meus_modulos(): o que aparece aqui é o que o banco libera, não o que a tela esconde.

const MODS = {}; // codigo -> { nome, ico, render }
const cacheMod = {};
const brl = (v) => (v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }));
const n0 = (v) => (v == null ? "—" : Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 }));
const n1 = (v) => (v == null ? "—" : Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 }));
const dmy = (iso) => (iso ? String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7) + "/" + String(iso).slice(0, 4) : "—");
const quando = (ts) => (ts ? new Date(ts).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");
const rotulo = (s) => String(s ?? "—").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const SEMAF = {
  atr: ["vencido", "vermelho", "consta", "critico", "em_disputa", "bloqueado", "crítico"],
  risco: ["atencao", "amarelo", "reconsultar", "vence_90d", "validade_a_confirmar", "prazo_a_confirmar", "sem_diretoria_registrada", "vence_180d", "atenção", "sem_apontamento"],
  ok: ["ok", "verde", "vigente", "ok_sem_prazo", "nada_consta"],
};
const clsSem = (s) => (SEMAF.atr.includes(s) ? "atr" : SEMAF.risco.includes(s) ? "risco" : SEMAF.ok.includes(s) ? "ok" : "neu");
const pillSem = (s, txt) => (s ? `<span class="pill ${clsSem(s)}">${esc(txt || rotulo(s))}</span>` : '<span class="pill neu">—</span>');
const temMod = (c) => (st.mods || []).some((m) => m.codigo === c);
const nivelMod = (c) => (st.mods || []).find((m) => m.codigo === c)?.nivel;
const qMod = () => (st.f.q || "").trim().toLowerCase();
const casa = (o, campos) => !qMod() || campos.some((k) => String(o[k] ?? "").toLowerCase().includes(qMod()));

async function rpcMod(nome, args, forcar) {
  const k = nome + JSON.stringify(args || {});
  if (!forcar && cacheMod[k] && Date.now() - cacheMod[k].em < 60000) return cacheMod[k].d;
  const { data, error } = await sb.rpc(nome, args || {});
  if (error) throw new Error(error.message);
  cacheMod[k] = { d: data, em: Date.now() };
  return data;
}
function limpaCacheMod() { Object.keys(cacheMod).forEach((k) => delete cacheMod[k]); }
function erroView(e) { $("#view").innerHTML = `<div class="vazio"><h3>Não carregou</h3><div>${esc(e.message || e)}</div></div>`; }
function carregandoView() { $("#view").innerHTML = `<div class="kpis">${'<div class="sk" style="height:104px"></div>'.repeat(4)}</div><div class="sk" style="height:360px"></div>`; }
const kpiM = (rot, v, sub, c, alvo) => `<button class="kpi" ${alvo ? `data-ir="${alvo}"` : 'tabindex="-1" style="cursor:default"'}><div class="r">${c ? `<i style="background:var(--c-${c})"></i>` : ""}${rot}</div><div class="v">${v}</div><div class="s">${sub || "&nbsp;"}</div>${alvo ? `<span class="seta">${I.seta}</span>` : ""}</button>`;
function ligaIr(r = document) { $$("[data-ir]", r).forEach((b) => (b.onclick = () => irPara(b.dataset.ir))); $$("[data-ent]", r).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); fichaEntidade(b.dataset.ent); })); }
const segV = (id, ops, atual) => `<div class="mini-seg" role="group">${ops.map(([k, n]) => `<button data-seg="${id}" data-k="${k}" aria-pressed="${atual === k}">${n}</button>`).join("")}</div>`;
const tabela = (cab, linhas, vazio = "Nada por aqui.") => linhas.length
  ? `<div class="tbw"><table class="tb"><thead><tr>${cab.map((c) => `<th class="${c[1] || ""}">${c[0]}</th>`).join("")}</tr></thead><tbody>${linhas.join("")}</tbody></table></div>`
  : `<div class="vazio-g">${vazio}</div>`;

// ---------------------------------------------------------------- ícones dos módulos
Object.assign(I, {
  inicio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  carteira: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/></svg>',
  legalizacao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
  captacao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
  comercial: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg>',
  atendimento: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z"/></svg>',
  financeiro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 6.5c-.8-1.3-2.6-2-5-2-3 0-4.5 1.4-4.5 3.2 0 4.3 9.5 2.3 9.5 6.8 0 2-1.7 3.5-5 3.5-2.6 0-4.4-.9-5.2-2.3"/></svg>',
  margem: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18M6 16l4-5 3 3 5-7"/><path d="M15 7h3v3"/></svg>',
  acessos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.5 3.3-5.5 6.5-5.5s5.9 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.7.8 2.8 2.6 3 5.2"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
});

// ---------------------------------------------------------------- INÍCIO (montado pelo perfil)
async function telaInicio() {
  const hoje = hojeISO();
  const minhas = st.base.filter((t) => t.minha);
  const m = metricas(minhas, hoje);
  const h = +new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false });
  cabecalho("Início", extenso(hoje));
  const outros = (st.mods || []).filter((x) => !["tarefas", "acessos"].includes(x.codigo));
  const prox = m.atr.filter((t) => t.gera_multa)[0] || m.atr[0] || m.risco[0];
  $("#view").innerHTML = `
    <div class="saud"><div><h2>${h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"}, ${esc(limpa(st.eu.nome).split(" ")[0])}.</h2>
      <p>${m.atr.length ? `Você tem <b>${plural(m.atr.length, "tarefa atrasada", "tarefas atrasadas")}</b>${m.multaAtr ? `, <b>${m.multaAtr} com multa</b>` : ""}, e <b>${m.risco.length}</b> vencem em até 3 dias.` : m.risco.length ? `Nada seu atrasado. <b>${plural(m.risco.length, "tarefa vence", "tarefas vencem")}</b> em até 3 dias.` : "Nada seu atrasado e nada vencendo nos próximos 3 dias."}</p></div>
      ${prox ? `<button class="btn s" id="comecar">Abrir a mais urgente ${I.seta}</button>` : ""}</div>
    <div class="kpis k4">
      ${kpiM("Minhas abertas", m.ab.length, `<b>${m.andamento}</b> em andamento`, "", "hoje")}
      ${kpiM("Atrasadas", m.atr.length, m.multaAtr ? `<b>${m.multaAtr}</b> com multa` : "nenhuma com multa", "atr", "hoje")}
      ${kpiM("Vencem em 3 dias", m.risco.length, m.multaRisco ? `<b>${m.multaRisco}</b> com multa` : "nenhuma com multa", "risco", "hoje")}
      ${kpiM("Entregues no prazo", m.pct == null ? "—" : m.pct + "<small>%</small>", m.conc30.length ? `<b>${m.noPrazo.length}</b> de ${m.conc30.length} em 30 dias` : "sem entregas em 30 dias", "ok", "painel")}
    </div>
    ${outros.length ? `<div class="sec-h" style="margin:22px 0 10px"><div><h2>Seus módulos</h2><p>O que pede atenção em cada área que você acessa.</p></div></div>
    <div class="mods">${outros.map((x) => `<button class="mod-c" data-ir="${x.codigo}" id="mc-${x.codigo}"><div class="mh">${I[x.codigo] || ""}<b>${esc(x.nome)}</b>${x.nivel === "leitura" ? '<span class="pill neu">leitura</span>' : ""}</div><div class="mb"><div class="sk" style="height:58px"></div></div></button>`).join("")}</div>` : ""}`;
  if (prox) $("#comecar").onclick = () => abrir(prox.id);
  ligaIr();
  const linha = (rot, v, c) => `<div class="ml"><span>${rot}</span><b class="${c ? "t-" + c : ""}">${v}</b></div>`;
  const resumo = {
    carteira: async () => { const d = await rpcMod("app_mod_carteira"); return linha("Clientes no seu escopo", d.length) + linha("Com tarefa atrasada", d.filter((x) => x.atr > 0).length, d.some((x) => x.atr) ? "atr" : "") + linha("Com bloqueio aberto", d.filter((x) => x.bloqueios > 0).length, d.some((x) => x.bloqueios) ? "risco" : ""); },
    legalizacao: async () => { const d = await rpcMod("app_mod_legalizacao"); const cv = d.certificacoes.filter((c) => ["vencido", "critico"].includes(c.semaforo)).length; const mv = d.mandatos.filter((c) => ["vencido", "vence_90d", "em_disputa"].includes(c.situacao)).length; const ce = d.certidoes.reduce((a, c) => a + c.consta, 0);
      return linha("Certificações vencidas ou críticas", cv, cv ? "atr" : "") + linha("Mandatos vencidos ou em 90 dias", mv, mv ? "atr" : "") + linha("Certidões positivas (consta)", ce, ce ? "atr" : ""); },
    captacao: async () => { const d = await rpcMod("app_mod_captacao"); const j = d.janelas; const q15 = j.filter((x) => x.dias_para_fechar != null && x.dias_para_fechar <= 15).length;
      return linha("Janelas abertas com aderência", j.length) + linha("Fecham em até 15 dias", q15, q15 ? "risco" : "") + linha("Com encaixe alto", j.filter((x) => x.altos > 0).length, "ok"); },
    comercial: async () => { const d = await rpcMod("app_mod_comercial"); const t = d.ganho.find((g) => g.origem === "TOTAL") || {}; const ab = d.deals.filter((x) => !x.contrato_em && !x.perdido_em).length;
      return linha("Negócios em aberto", ab) + linha("Valor em aberto (ano)", brl(t.valor_em_aberto_ano)) + linha("Aprovação de propostas", t.pct_aprovacao == null ? "—" : t.pct_aprovacao + "%"); },
    atendimento: async () => { const d = await rpcMod("app_mod_atendimento"); const ab = d.setores.reduce((a, s) => a + s.abertos, 0), par = d.setores.reduce((a, s) => a + s.parados_24h, 0);
      return linha("Atendimentos abertos", ab) + linha("Parados há mais de 24h", par, par ? "atr" : "") + linha("Atualizado em", quando(d.coletado_em)); },
    financeiro: async () => { const d = await rpcMod("app_mod_financeiro"); const i = d.indicadores || {}; const mes = (d.mensal || []).find((x) => String(x.mes).slice(0, 7) === hoje.slice(0, 7)) || {};
      return linha("Recorrente (MRR)", brl(i.mrr)) + linha("A receber neste mês", brl(mes.a_receber), mes.a_receber > 0 ? "risco" : "") + linha("Fôlego de caixa", i.folego_meses == null ? "—" : n1(i.folego_meses) + " mês", i.folego_meses < 1 ? "atr" : ""); },
    margem: async () => { const d = await rpcMod("app_mod_margem"); const r = d.resumo || {};
      return linha("Contratos críticos (horas > 110%)", r.criticos, r.criticos ? "atr" : "") + linha("Em atenção", r.atencao, r.atencao ? "risco" : "") + linha("Sem apontamento confiável", r.sem_apontamento, r.sem_apontamento ? "risco" : ""); },
  };
  outros.forEach(async (x) => {
    const el = $(`#mc-${x.codigo} .mb`); if (!el || !resumo[x.codigo]) { if (el) el.innerHTML = ""; return; }
    try { el.innerHTML = await resumo[x.codigo](); } catch (e) { el.innerHTML = `<div class="ml"><span>${esc(e.message)}</span></div>`; }
  });
}

// ---------------------------------------------------------------- CARTEIRA
async function telaCarteira() {
  cabecalho("Carteira", nivelMod("carteira") && st.eu.papel !== "admin" && st.eu.papel !== "lider" ? "Clientes em que você é dono ou substituto" : "Todos os clientes ativos");
  carregandoView();
  let d; try { d = await rpcMod("app_mod_carteira"); } catch (e) { return erroView(e); }
  const f = st.fc || (st.fc = { chip: "todas" });
  const verFin = d.some((x) => x.honorario != null);
  const filtros = { todas: () => true, atr: (x) => x.atr > 0, bloq: (x) => x.bloqueios > 0, cert: (x) => x.cert_alerta > 0, mand: (x) => x.mandato && !["vigente"].includes(x.mandato), verm: (x) => x.semaforo === "vermelho" };
  const pinta = () => {
    const l = d.filter(filtros[f.chip]).filter((x) => casa(x, ["sigla", "razao_social", "municipio", "meus_deptos"]));
    const chip = (k, rot, c) => `<button class="chip" data-fc="${k}" aria-pressed="${f.chip === k}">${c ? `<i style="background:var(--c-${c})"></i>` : ""}${rot} <b>${d.filter(filtros[k]).length}</b></button>`;
    $("#view").innerHTML = `
      <div class="filtros">${chip("todas", "Todos")}${chip("atr", "Com tarefa atrasada", "atr")}${chip("verm", "Trilha vermelha", "atr")}${chip("bloq", "Com bloqueio", "risco")}${chip("cert", "Certificação a vencer", "risco")}${chip("mand", "Mandato com alerta", "risco")}</div>
      <div class="card" style="padding:6px 10px">${tabela(
        [["Cliente"], ["Trilha de conformidade"], ["Tarefas", "n"], ["Atras.", "n"], ["Bloq.", "n hm"], ["Mandato", "hm"], ["WhatsApp 30d", "n hm"]].concat(verFin ? [["Honorário", "n hm"], ["Horas", "hm"]] : []),
        l.map((x) => `<tr data-ent="${x.id}"><td><div class="forte">${esc(x.sigla)}</div><div style="font-size:12px;color:var(--ink3);max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.razao_social || "")}</div></td>
          <td>${x.semaforo ? pillSem(x.semaforo, rotulo(x.semaforo)) : ""} <span style="font-size:12px;color:var(--ink2)">${esc(x.proximo_passo || "")}</span></td>
          <td class="n">${x.abertas}</td><td class="n">${x.atr ? `<span class="pill atr">${x.atr}</span>` : "0"}</td><td class="n hm">${x.bloqueios ? `<span class="pill risco">${x.bloqueios}</span>` : "0"}</td>
          <td class="hm">${x.mandato ? pillSem(x.mandato) : "—"}</td><td class="n hm">${x.tickets_30d}</td>
          ${verFin ? `<td class="n hm">${brl(x.honorario)}</td><td class="hm">${x.margem_status ? pillSem(x.margem_status) : "—"}</td>` : ""}</tr>`),
        "Nenhum cliente com esse filtro.")}</div>
      <div style="color:var(--ink3);font-size:12.5px;margin:10px 4px">${plural(l.length, "cliente", "clientes")}. Clique para abrir a ficha.</div>`;
    $$("[data-fc]").forEach((b) => (b.onclick = () => { f.chip = b.dataset.fc; pinta(); }));
    ligaIr($("#view"));
  };
  pinta();
}

async function fichaEntidade(id) {
  const g = gaveta(`<div class="gh"><button class="ib gx" aria-label="Fechar">${I.x}</button><div class="ey">Ficha da entidade</div><h3>Carregando…</h3></div><div class="gb"><div class="sk" style="height:400px"></div></div>`);
  let d; try { d = await rpcMod("app_mod_entidade", { p_id: id }, true); } catch (e) { $(".gb", g).innerHTML = `<div class="vazio-g">${esc(e.message)}</div>`; return; }
  const e = d.entidade || {};
  const bloco = (tit, html) => `<div class="bloco"><h4>${tit}</h4>${html}</div>`;
  const mini = (cab, linhas, vazio) => linhas.length ? `<div class="tbw"><table class="tb mini">${cab ? `<thead><tr>${cab.map((c) => `<th class="${c[1] || ""}">${c[0]}</th>`).join("")}</tr></thead>` : ""}<tbody>${linhas.join("")}</tbody></table></div>` : `<div style="color:var(--ink3);font-size:13px">${vazio}</div>`;
  $(".gh", g).innerHTML = `<button class="ib gx" aria-label="Fechar">${I.x}</button>
    <div class="ey">${esc(rotulo(e.status))}${e.municipio ? " · " + esc(e.municipio) + "/" + esc(e.uf || "") : ""}</div><h3>${esc(e.sigla)}</h3>
    <div class="gc">${esc(e.razao_social || "")}${e.cnpj ? " · CNPJ " + esc(e.cnpj) : ""}</div>
    <div class="gp">${e.situacao_receita ? `<span class="pill ${e.situacao_receita === "ATIVA" ? "ok" : "atr"}">Receita: ${esc(e.situacao_receita)}</span>` : ""}${d.bloqueios.length ? `<span class="pill atr">${plural(d.bloqueios.length, "bloqueio", "bloqueios")}</span>` : ""}${d.mandato ? pillSem(d.mandato.situacao, "Mandato: " + rotulo(d.mandato.situacao)) : ""}</div>`;
  $(".gx", g).onclick = () => fecharGaveta();
  $(".gb", g).innerHTML =
    bloco("Trilha de conformidade", mini(null, d.trilha.map((t) => `<tr style="cursor:default"><td class="forte">${t.ordem}. ${esc(t.etapa)}</td><td>${pillSem(t.status)}</td><td style="font-size:12.5px;color:var(--ink2)">${esc(t.proximo_passo || "")}</td></tr>`), "Trilha ainda não medida.")) +
    (d.bloqueios.length ? bloco("Bloqueios abertos", mini(null, d.bloqueios.map((b) => `<tr style="cursor:default"><td class="forte">${esc(rotulo(b.motivo))}</td><td style="font-size:12.5px">${esc(b.detalhe || "")}</td><td class="n">${dmy(b.desde)}</td></tr>`))) : "") +
    bloco("Tarefas abertas", mini(null, d.tarefas.map((t) => `<tr data-tid="${t.id}"><td><div class="forte" style="font-size:13px">${esc(limpa(t.titulo))}</div><div style="font-size:12px;color:var(--ink3)">${esc(t.departamento || "")} · ${esc(curto(t.responsavel))}</div></td><td class="n"><span class="pill ${t.vencimento && t.vencimento < hojeISO() ? "atr" : "neu"}">${t.vencimento ? dm(t.vencimento) : "sem prazo"}</span>${t.gera_multa ? ' <span class="pill multa">Multa</span>' : ""}</td></tr>`), "Nenhuma tarefa aberta que você possa ver.")) +
    bloco("Responsáveis na Utarget", mini(null, d.responsaveis.map((r) => `<tr style="cursor:default"><td class="forte">${esc(r.departamento)}</td><td>${esc(curto(r.responsavel))}</td><td style="color:var(--ink3);font-size:12px">${r.substituto ? "subst. " + esc(curto(r.substituto)) : ""}</td></tr>`), "Carteira sem dono definido.")) +
    bloco("Certificações", mini([["Tipo"], ["Validade", "n"], ["Situação"]], d.certificacoes.map((c) => `<tr style="cursor:default"><td><div class="forte">${esc(c.tipo)}</div><div style="font-size:11.5px;color:var(--ink3)">${esc(c.numero || "")}</div></td><td class="n">${dmy(c.validade)}</td><td>${pillSem(c.semaforo)}</td></tr>`), "Nenhuma certificação registrada.")) +
    bloco("Certidões", mini([["Certidão"], ["Verificada", "n"], ["Situação"]], d.certidoes.map((c) => `<tr style="cursor:default"><td><div class="forte" style="font-size:12.5px">${esc(c.tipo)}</div><div style="font-size:11.5px;color:var(--ink3)">${esc(c.orgao_emissor || "")}</div></td><td class="n">${dmy(c.verificado_em)}</td><td>${pillSem(c.semaforo)}</td></tr>`), "Nenhuma certidão no banco.")) +
    (d.divergencias.length ? bloco("Divergências de cadastro", mini([["Campo"], ["No banco"], ["Na origem"]], d.divergencias.map((x) => `<tr style="cursor:default"><td class="forte">${esc(x.campo)}</td><td>${esc(x.banco || "")}</td><td>${esc(x.origem || "")} <span style="color:var(--ink3);font-size:11px">(${esc(x.fonte)})</span></td></tr>`))) : "") +
    bloco("Atendimento WhatsApp", mini([["Mês"], ["Atend.", "n"], ["Msgs", "n"], ["1ª resposta", "n"]], d.atendimento.map((z) => `<tr style="cursor:default"><td>${comp(z.mes)}</td><td class="n">${z.tickets}</td><td class="n">${z.mensagens}</td><td class="n">${z.mediana_1a_resposta_min == null ? "—" : n0(z.mediana_1a_resposta_min) + " min"}</td></tr>`), "Sem atendimentos vinculados.")) +
    (d.captacao.length ? bloco("Janelas de captação com aderência", mini(null, d.captacao.map((r) => `<tr style="cursor:default"><td><a href="${esc(r.url)}" target="_blank" rel="noopener" class="link" style="white-space:normal">${esc(r.titulo)}</a><div style="font-size:11.5px;color:var(--ink3)">${esc(r.motivo || "")}</div></td><td class="n">${r.fecha ? dm(r.fecha) : "—"}</td><td>${pillSem(r.encaixe === "alto" ? "ok" : r.encaixe === "medio" ? "atencao" : "neu", rotulo(r.encaixe))}</td></tr>`))) : "") +
    (d.financeiro ? bloco("Contrato e margem (diretoria)", mini([["Honorário", "n"], ["Horas sup.", "n"], ["Horas reais", "n"], ["Situação"]], d.financeiro.map((m) => `<tr style="cursor:default"><td class="n">${brl(m.honorario)}</td><td class="n">${n1(m.horas_suportadas)}</td><td class="n">${n1(m.horas_reais)}</td><td>${pillSem(m.status)}</td></tr>`), "Sem contrato vinculado a esta entidade.")) : "");
  $$("[data-tid]", g).forEach((r) => (r.onclick = () => { if (st.base.find((t) => t.id === r.dataset.tid)) abrir(r.dataset.tid); }));
}

// ---------------------------------------------------------------- LEGALIZAÇÃO
async function telaLegalizacao() {
  cabecalho("Legalização", "Mandatos, certificações, certidões e bloqueios da carteira");
  carregandoView();
  let d; try { d = await rpcMod("app_mod_legalizacao"); } catch (e) { return erroView(e); }
  const aba = st.abaLeg || (st.abaLeg = "cert");
  const cv = d.certificacoes.filter((c) => ["vencido", "critico"].includes(c.semaforo));
  const mv = d.mandatos.filter((m) => ["vencido", "vence_90d", "em_disputa"].includes(m.situacao));
  const ce = d.certidoes.filter((c) => c.consta > 0);
  const corpo = {
    cert: () => tabela([["Entidade"], ["Certificação"], ["Validade", "n"], ["Dias", "n"], ["Situação"]],
      d.certificacoes.filter((c) => casa(c, ["sigla", "tipo", "numero"])).map((c) => `<tr data-ent="${c.entidade_id}"><td class="forte">${esc(c.sigla)}</td><td><div>${esc(c.tipo)}</div><div style="font-size:11.5px;color:var(--ink3)">${esc(c.numero || "")}</div></td><td class="n">${dmy(c.validade)}</td><td class="n">${c.dias ?? "—"}</td><td>${pillSem(c.semaforo)}</td></tr>`)),
    mand: () => tabela([["Entidade"], ["Fim do mandato", "n"], ["Dado"], ["Situação"]],
      d.mandatos.filter((m) => casa(m, ["sigla"])).map((m) => `<tr data-ent="${m.entidade_id}"><td class="forte">${esc(m.sigla)}</td><td class="n">${dmy(m.fim)}</td><td>${pillSem(m.status_dado === "confirmado" ? "ok" : "atencao", rotulo(m.status_dado))}</td><td>${pillSem(m.situacao)}</td></tr>`)),
    cdao: () => tabela([["Entidade"], ["Positivas (consta)"], ["Reconsultar", "n"], ["OK", "n"], ["Última verificação", "n"]],
      d.certidoes.filter((c) => casa(c, ["sigla", "tipos_consta"])).map((c) => `<tr data-ent="${c.entidade_id}"><td class="forte">${esc(c.sigla)}</td><td>${c.consta ? `<span class="pill atr">${c.consta}</span> <span style="font-size:12px">${esc(c.tipos_consta || "")}</span>` : "0"}</td><td class="n">${c.reconsultar ? `<span class="pill risco">${c.reconsultar}</span>` : "0"}</td><td class="n">${c.ok}</td><td class="n">${dmy(c.ultima)}</td></tr>`)),
    bloq: () => `<h4 style="margin:6px 4px 8px;font-size:13px">Bloqueios abertos</h4>` + tabela([["Entidade"], ["Motivo"], ["Detalhe"], ["Desde", "n"]],
      d.bloqueios.filter((b) => casa(b, ["sigla", "motivo", "detalhe"])).map((b) => `<tr data-ent="${b.entidade_id}"><td class="forte">${esc(b.sigla)}</td><td>${pillSem("vencido", rotulo(b.motivo))}</td><td style="font-size:12.5px">${esc(b.detalhe || "")}</td><td class="n">${dmy(b.desde)}</td></tr>`), "Nenhum bloqueio aberto.") +
      `<h4 style="margin:18px 4px 8px;font-size:13px">Divergências de cadastro</h4>` + tabela([["Entidade"], ["Campo"], ["No banco"], ["Na origem"], ["Desde", "n"]],
      d.divergencias.map((x) => `<tr style="cursor:default"><td class="forte">${esc(x.sigla)}</td><td>${esc(x.campo)}</td><td>${esc(x.valor_banco || "")}</td><td>${esc(x.valor_origem || "")}</td><td class="n">${dmy(String(x.detectado_em).slice(0, 10))}</td></tr>`), "Nenhuma divergência aberta."),
    fila: () => tabela([["Entidade"], ["Certidão"], ["Titular"], ["Motivo"], ["Portal"]],
      d.fila.map((f) => `<tr style="cursor:default"><td class="forte">${esc(f.sigla)}</td><td>${esc(f.tipo)}</td><td>${esc(f.nome || "")}</td><td style="font-size:12.5px">${esc(f.motivo || "")}</td><td>${f.portal_url ? `<a class="link" target="_blank" rel="noopener" href="${esc(f.portal_url)}">abrir</a>` : ""}</td></tr>`), "Fila de emissão vazia."),
  };
  $("#view").innerHTML = `
    <div class="kpis k4">
      ${kpiM("Certificações vencidas ou críticas", cv.length, `de ${d.certificacoes.length} acompanhadas`, cv.length ? "atr" : "ok")}
      ${kpiM("Mandatos com alerta", mv.length, `vencidos, em disputa ou em 90 dias`, mv.length ? "atr" : "ok")}
      ${kpiM("Entidades com certidão positiva", ce.length, `${d.certidoes.reduce((a, c) => a + c.reconsultar, 0)} certidões a reconsultar`, ce.length ? "atr" : "ok")}
      ${kpiM("Bloqueios abertos", d.bloqueios.length, `${d.divergencias.length} divergências de cadastro`, d.bloqueios.length ? "risco" : "ok")}
    </div>
    <div class="card"><div class="sec-h"><div><h2>${{ cert: "Certificações", mand: "Mandatos de diretoria", cdao: "Certidões por entidade", bloq: "Bloqueios e divergências", fila: "Fila de emissão de certidões" }[aba]}</h2><p>Ordenado pelo que vence primeiro. Clique na linha para abrir a ficha.</p></div>
      ${segV("leg", [["cert", "Certificações"], ["mand", "Mandatos"], ["cdao", "Certidões"], ["bloq", "Bloqueios"], ["fila", `Fila (${d.fila.length})`]], aba)}</div>${corpo[aba]()}</div>`;
  $$("[data-seg=leg]").forEach((b) => (b.onclick = () => { st.abaLeg = b.dataset.k; telaLegalizacao(); }));
  ligaIr($("#view"));
}

// ---------------------------------------------------------------- CAPTAÇÃO
async function telaCaptacao() {
  cabecalho("Captação", "Janelas abertas com aderência a clientes da carteira");
  carregandoView();
  let d; try { d = await rpcMod("app_mod_captacao"); } catch (e) { return erroView(e); }
  const j = d.janelas.filter((x) => casa(x, ["titulo"]) || x.oscs.some((o) => String(o.sigla).toLowerCase().includes(qMod())));
  const q15 = d.janelas.filter((x) => x.dias_para_fechar != null && x.dias_para_fechar <= 15);
  $("#view").innerHTML = `
    <div class="kpis k4">
      ${kpiM("Janelas abertas", d.janelas.length, "com ao menos uma OSC aderente")}
      ${kpiM("Fecham em até 15 dias", q15.length, "decidir agora se concorre", q15.length ? "risco" : "")}
      ${kpiM("Com encaixe alto", d.janelas.filter((x) => x.altos > 0).length, "perfil e certificações batem", "ok")}
      ${kpiM("Editais a confirmar", d.a_confirmar ?? "—", `coleta: ${quando(d.coleta)}`)}
    </div>
    <div class="cap-l">${j.map((x) => `
      <div class="card cap">
        <div class="cap-h"><div><a class="cap-t" href="${esc(x.url || "#")}" target="_blank" rel="noopener">${esc(x.titulo)}</a></div>
          <span class="pill ${x.dias_para_fechar == null ? "neu" : x.dias_para_fechar <= 7 ? "atr" : x.dias_para_fechar <= 15 ? "risco" : "ok"}">${x.fecha ? "fecha " + dm(x.fecha) + (x.dias_para_fechar != null ? ` · ${x.dias_para_fechar}d` : "") : "prazo a confirmar"}</span></div>
        <div class="cap-o">${x.oscs.map((o) => `<button class="osc ${o.encaixe}" data-ent="${o.entidade_id}" title="${esc(o.motivo || "")}"><b>${esc(o.sigla)}</b><span>${esc(rotulo(o.encaixe))}${o.motivo ? " · " + esc(o.motivo) : ""}</span></button>`).join("")}</div>
      </div>`).join("") || '<div class="vazio"><h3>Nenhuma janela</h3><div>Sem edital aberto com aderência à carteira.</div></div>'}</div>
    <div style="color:var(--ink3);font-size:12.5px;margin:10px 4px">Edital só entra em projeto com o edital/TR oficial aberto. Encaixe é leitura do radar; elegibilidade se confirma no texto do edital.</div>`;
  ligaIr($("#view"));
}

// ---------------------------------------------------------------- COMERCIAL
const ETAPAS = ["proposta_enviada", "aprovada", "minuta", "assinatura", "contrato", "perdido"];
async function telaComercial() {
  cabecalho("Comercial", "Propostas e contratos (espelho do funil)");
  carregandoView();
  let d; try { d = await rpcMod("app_mod_comercial"); } catch (e) { return erroView(e); }
  const t = d.ganho.find((g) => g.origem === "TOTAL") || {};
  const abertos = d.deals.filter((x) => !x.contrato_em && !x.perdido_em);
  const porEtapa = new Map(); d.deals.forEach((x) => porEtapa.set(x.etapa || "—", (porEtapa.get(x.etapa || "—") || 0) + 1));
  const l = d.deals.filter((x) => casa(x, ["deal", "etapa", "origem"]));
  $("#view").innerHTML = `
    <div class="kpis k4">
      ${kpiM("Negócios em aberto", abertos.length, `${t.propostas ?? "—"} propostas no ano`)}
      ${kpiM("Aprovação", t.pct_aprovacao == null ? "—" : t.pct_aprovacao + "<small>%</small>", `${t.aprovadas ?? 0} aprovadas · ${t.perdidos ?? 0} perdidas`, "ok")}
      ${kpiM("Valor em aberto (ano)", brl(t.valor_em_aberto_ano), `${t.sem_valor ?? 0} sem valor confirmado`, "risco")}
      ${kpiM("Contratado (ano)", brl(t.valor_contratado_ano), `${t.contratos ?? 0} contratos`, "ok")}
    </div>
    <div class="grade b">
      <section class="card"><div class="sec-h"><div><h2>Negócios</h2><p>Mais recentes primeiro.</p></div></div>${tabela([["Negócio"], ["Etapa"], ["Proposta", "n"], ["Mensal", "n"], ["Anual", "n hm"]],
        l.map((x) => `<tr ${x.entidade_id ? `data-ent="${x.entidade_id}"` : 'style="cursor:default"'}><td class="forte">${esc(x.deal)}<div style="font-size:11.5px;color:var(--ink3);font-weight:500">${esc(rotulo(x.origem))}</div></td><td>${pillSem(x.perdido_em ? "vencido" : x.contrato_em ? "ok" : x.aprovada_em ? "atencao" : "neu", rotulo(x.etapa))}</td><td class="n">${x.proposta_em ? dm(x.proposta_em) : "—"}</td><td class="n">${brl(x.valor_mensal)}</td><td class="n hm">${brl(x.valor_anual)}</td></tr>`))}</section>
      <section class="card"><div class="sec-h"><div><h2>Por origem</h2><p>Conversão por canal no ano.</p></div></div>${tabela([["Origem"], ["Propostas", "n"], ["Aprov.", "n"], ["Contratos", "n"], ["Aprovado/ano", "n hm"]],
        d.ganho.filter((g) => g.origem !== "TOTAL").map((g) => `<tr style="cursor:default"><td class="forte">${esc(rotulo(g.origem))}</td><td class="n">${g.propostas}</td><td class="n">${g.aprovadas}</td><td class="n">${g.contratos}</td><td class="n hm">${brl(g.valor_aprovado_ano)}</td></tr>`))}
        <div class="leg" style="margin-top:14px">${[...porEtapa.entries()].map(([k, v]) => `<span>${esc(rotulo(k))} <b>${v}</b></span>`).join("")}</div></section>
    </div>
    <div style="color:var(--ink3);font-size:12.5px;margin:4px">Lead e contato vivem no Brevo; aqui só o espelho para acompanhar. Atividades de pré-venda viram tarefa do departamento Comercial.</div>`;
  ligaIr($("#view"));
}

// ---------------------------------------------------------------- ATENDIMENTO
async function telaAtendimento() {
  cabecalho("Atendimento", "WhatsApp da Utarget (ZapContábil)");
  carregandoView();
  let d; try { d = await rpcMod("app_mod_atendimento"); } catch (e) { return erroView(e); }
  const ab = d.setores.reduce((a, s) => a + s.abertos, 0), par = d.setores.reduce((a, s) => a + s.parados_24h, 0), t30 = d.setores.reduce((a, s) => a + s.tickets_30d, 0);
  const agora = Date.now(), horas = (ts) => (ts ? Math.round((agora - new Date(ts)) / 36e5) : null);
  const l = d.abertos.filter((x) => casa(x, ["setor", "atendente", "sigla"]));
  $("#view").innerHTML = `
    <div class="kpis k4">
      ${kpiM("Abertos agora", ab, "abertos ou pendentes")}
      ${kpiM("Parados há mais de 24h", par, "última mensagem há mais de um dia", par ? "atr" : "ok")}
      ${kpiM("Atendimentos em 30 dias", t30, "todos os setores")}
      ${kpiM("Espelho atualizado", quando(d.coletado_em), "fonte: ZapContábil")}
    </div>
    <div class="grade">
      <section class="card"><div class="sec-h"><div><h2>Abertos, do mais parado ao mais recente</h2><p>Responder e transferir continua no ZapContábil.</p></div></div>${tabela([["Ticket"], ["Setor"], ["Cliente"], ["Atendente", "hm"], ["Parado", "n"]],
        l.map((x) => { const h = horas(x.ultima_msg_em); return `<tr ${x.entidade_id ? `data-ent="${x.entidade_id}"` : 'style="cursor:default"'}><td class="forte">#${esc(x.ticket_id)}</td><td style="font-size:12.5px">${esc(String(x.setor).replace(/^\S+\s/, ""))}</td><td>${esc(x.sigla || "—")}</td><td class="hm">${esc(curto(x.atendente || "—"))}</td><td class="n">${h == null ? "—" : `<span class="pill ${h > 24 ? "atr" : h > 4 ? "risco" : "ok"}">${h < 48 ? h + "h" : Math.round(h / 24) + "d"}</span>`}</td></tr>`; }), "Nenhum atendimento aberto.")}</section>
      <div style="display:grid;gap:16px;align-content:start">
        <section class="card"><div class="sec-h"><div><h2>Setores</h2><p>Mediana da 1ª resposta nos últimos 30 dias.</p></div></div>${tabela([["Setor"], ["Abertos", "n"], ["> 24h", "n"], ["1ª resp.", "n"]],
          d.setores.map((s) => `<tr style="cursor:default"><td style="font-size:12.5px" class="forte">${esc(String(s.setor).replace(/^\S+\s/, ""))}</td><td class="n">${s.abertos}</td><td class="n">${s.parados_24h ? `<span class="pill atr">${s.parados_24h}</span>` : "0"}</td><td class="n">${s.mediana_resp_min == null ? "—" : n0(s.mediana_resp_min) + " min"}</td></tr>`))}</section>
        <section class="card"><div class="sec-h"><div><h2>Clientes que mais chamaram</h2><p>Últimos 30 dias.</p></div></div>${tabela([["Cliente"], ["Atend.", "n"], ["Msgs do cliente", "n"]],
          d.clientes.map((c) => `<tr data-ent="${c.entidade_id}"><td class="forte">${esc(c.sigla)}</td><td class="n">${c.tickets}</td><td class="n">${c.msgs_cliente ?? "—"}</td></tr>`))}</section>
      </div>
    </div>`;
  ligaIr($("#view"));
}

// ---------------------------------------------------------------- FINANCEIRO
async function telaFinanceiro() {
  cabecalho("Financeiro", "Caixa e recebimentos da Utarget");
  carregandoView();
  let d; try { d = await rpcMod("app_mod_financeiro"); } catch (e) { return erroView(e); }
  const i = d.indicadores || {}; const hoje = hojeISO();
  const mes = (d.mensal || []).find((x) => String(x.mes).slice(0, 7) === hoje.slice(0, 7)) || {};
  const ms = (d.mensal || []).filter((x) => String(x.mes).slice(0, 7) <= hoje.slice(0, 7));
  const max = Math.max(1, ...ms.map((x) => Math.max(+x.faturado || 0, +x.recebido || 0, +x.pago || 0)));
  $("#view").innerHTML = `
    <div class="kpis">
      ${kpiM("Recorrente (MRR)", brl(i.mrr), `${i.contratos_ativos ?? "—"} contratos · ticket ${brl(i.ticket_medio)}`)}
      ${kpiM("Recebido no mês", brl(i.recebido_mes), `pago no mês ${brl(i.pago_mes)}`, "ok")}
      ${kpiM("A receber no mês", brl(mes.a_receber), `faturado ${brl(mes.faturado)}`, mes.a_receber > 0 ? "risco" : "")}
      ${kpiM("Inadimplência", brl(i.inadimplencia), `${i.clientes_inadimplentes ?? 0} clientes`, i.inadimplencia > 0 ? "atr" : "ok")}
      ${kpiM("Saldo em bancos", brl(i.saldo_bancos), `fôlego ${n1(i.folego_meses)} mês · em ${dmy(i.saldo_em)}`, i.folego_meses < 1 ? "atr" : "")}
    </div>
    <div class="grade">
      <section class="card"><div class="sec-h"><div><h2>Mês a mês</h2><p>Faturado, recebido e pago nos últimos 12 meses.</p></div></div>
        <div class="leg"><span><i style="background:var(--c-ok)"></i>Faturado</span><span><i style="background:var(--ok-ink)"></i>Recebido</span><span><i style="background:var(--c-risco)"></i>Pago</span></div>
        <div class="barras">${ms.map((x) => `<div class="bc" data-tipm="${esc(comp(x.mes))}|${brl(x.faturado)}|${brl(x.recebido)}|${brl(x.pago)}"><div class="bb">
          <i style="height:${(+x.faturado / max) * 100}%;background:var(--c-ok)"></i><i style="height:${(+x.recebido / max) * 100}%;background:var(--ok-ink)"></i><i style="height:${(+x.pago / max) * 100}%;background:var(--c-risco)"></i></div><span>${MES[+String(x.mes).slice(5, 7) - 1]}</span></div>`).join("")}</div></section>
      <div style="display:grid;gap:16px;align-content:start">
        <section class="card"><div class="sec-h"><div><h2>Concentração</h2><p>Maiores contratos no recorrente.</p></div></div>
          ${(i.concentracao || []).map((c) => `<div class="pct" style="display:grid;grid-template-columns:110px 1fr 70px;gap:10px;align-items:center;margin:6px 0"><span class="forte" style="font-weight:700">${esc(c.cliente)}</span><span class="tr"><i style="width:${c.pct}%"></i></span><span class="num" style="text-align:right">${n1(c.pct)}%</span></div>`).join("")}</section>
        <section class="card"><div class="sec-h"><div><h2>Inadimplência</h2><p>Parcelas vencidas em aberto.</p></div></div>${tabela([["Cliente"], ["Parcelas", "n"], ["Em aberto", "n"], ["Dias", "n"]],
          d.inadimplencia.map((x) => `<tr ${x.entidade_id ? `data-ent="${x.entidade_id}"` : 'style="cursor:default"'}><td class="forte">${esc(x.cliente)}</td><td class="n">${x.parcelas}</td><td class="n">${brl(x.em_aberto)}</td><td class="n"><span class="pill ${x.dias > 30 ? "atr" : "risco"}">${x.dias}</span></td></tr>`), "Nenhuma parcela vencida em aberto.")}</section>
      </div>
    </div>
    <div style="color:var(--ink3);font-size:12.5px;margin:4px">Última importação: ${quando(i.ultima_importacao)}.</div>`;
  $$(".bc").forEach((b) => { const [m, f, r, p] = b.dataset.tipm.split("|"); b.onmousemove = (e) => dica(e, `<div class="tt">${m}</div>${tipLinha("var(--c-ok)", "Faturado", f)}${tipLinha("var(--ok-ink)", "Recebido", r)}${tipLinha("var(--c-risco)", "Pago", p)}`); b.onmouseleave = () => dica(); });
  ligaIr($("#view"));
}

// ---------------------------------------------------------------- MARGEM
async function telaMargem() {
  cabecalho("Margem", "Horas suportadas pelo honorário × horas apontadas");
  carregandoView();
  let d; try { d = await rpcMod("app_mod_margem"); } catch (e) { return erroView(e); }
  const r = d.resumo || {}; const p = r.parametros || {};
  const l = d.carteira.filter((x) => casa(x, ["cliente", "sigla", "grupo", "status"]));
  $("#view").innerHTML = `
    <div class="kpis">
      ${kpiM("Contratos", r.contratos ?? "—", `MRR ${brl(r.mrr)}`)}
      ${kpiM("Críticos", r.criticos ?? 0, `horas acima de ${p.limite_critico_pct ?? 110}% do suportado`, "atr")}
      ${kpiM("Atenção", r.atencao ?? 0, `entre ${p.limite_ok_pct ?? 90}% e ${p.limite_critico_pct ?? 110}%`, "risco")}
      ${kpiM("OK", r.ok ?? 0, `até ${p.limite_ok_pct ?? 90}%`, "ok")}
      ${kpiM("Sem apontamento", r.sem_apontamento ?? 0, `${r.sem_entidade ?? 0} sem entidade · horas de ${comp(r.competencia_horas)}`, "risco")}
    </div>
    <div class="card" style="padding:6px 10px">${tabela([["Cliente"], ["Honorário", "n"], ["Horas sup.", "n"], ["Horas reais", "n"], ["Margem", "n"], ["Sugerido", "n hm"], ["Situação"]],
      l.map((x) => `<tr ${x.entidade_id ? `data-ent="${x.entidade_id}"` : 'style="cursor:default"'}><td><div class="forte">${esc(x.sigla || x.grupo || "—")}</div><div style="font-size:11.5px;color:var(--ink3);max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.cliente || "")}</div></td>
        <td class="n">${brl(x.honorario)}</td><td class="n">${n1(x.horas_suportadas)}</td><td class="n">${n1(x.horas_reais)}</td><td class="n">${x.margem_pct == null ? "—" : n1(x.margem_pct) + "%"}</td>
        <td class="n hm">${x.honorario_sugerido > x.honorario ? `<b>${brl(x.honorario_sugerido)}</b>` : "—"}</td><td>${pillSem(x.status)}</td></tr>`))}</div>
    <div style="color:var(--ink3);font-size:12.5px;margin:10px 4px">Custo-hora R$ ${esc(p.custo_hora ?? "—")} · DAS ${esc(p.das_pct ?? "—")}% · margem-alvo ${esc(p.margem_alvo_pct ?? "—")}%. Horas reais zeradas com status OK indicam falta de apontamento, não folga.</div>`;
  ligaIr($("#view"));
}

// ---------------------------------------------------------------- ACESSOS (admin)
async function telaAcessos() {
  cabecalho("Acessos", "Quem vê cada módulo. A regra vale no banco, não só na tela.");
  carregandoView();
  let d; try { d = await rpcMod("app_mod_acessos", {}, true); } catch (e) { return erroView(e); }
  const mods = d.modulos;
  const PAP = { admin: "Administrador", lider: "Líder", operador: "Operador", comercial: "Comercial", terceirizado: "Terceirizado" };
  const quem = (r) => (r.papel ? "Perfil: " + (PAP[r.papel] || r.papel) : r.departamento ? "Depto: " + r.departamento : "Pessoa: " + curto(r.usuario));
  $("#view").innerHTML = `
    <div class="card" style="padding:6px 10px;margin-bottom:16px"><div class="sec-h" style="padding:10px 6px 0"><div><h2>Acesso efetivo por pessoa</h2><p>T = total · L = leitura · — = sem acesso. Administrador vê tudo.</p></div></div>
      ${tabela([["Pessoa"], ["Perfil", "hm"]].concat(mods.map((m) => [m.nome, "c"])),
        d.usuarios.map((u) => `<tr style="cursor:default"><td class="forte">${esc(curto(u.nome))}</td><td class="hm">${esc(PAP[u.papel] || u.papel)}</td>${mods.map((m) => { const v = u.efetivo?.[m.codigo]; return `<td class="c">${v === "total" ? '<span class="pill ok">T</span>' : v === "leitura" ? '<span class="pill risco">L</span>' : '<span style="color:var(--ink3)">—</span>'}</td>`; }).join("")}</tr>`))}</div>
    <div class="card"><div class="sec-h"><div><h2>Regras</h2><p>Cada regra libera um módulo para um perfil, um departamento ou uma pessoa.</p></div></div>
      <div class="ac-g">${mods.filter((m) => m.codigo !== "acessos").map((m) => `<div class="ac-m"><div class="ac-h">${I[m.codigo] || ""}<b>${esc(m.nome)}</b></div>
        ${d.regras.filter((r) => r.modulo === m.codigo).map((r) => `<span class="ativo">${esc(quem(r))}${r.nivel === "leitura" ? " · leitura" : ""}<button data-del-ac="${r.id}" aria-label="Remover regra">${I.x}</button></span>`).join("") || '<span style="color:var(--ink3);font-size:12.5px">Só administradores</span>'}</div>`).join("")}</div>
      <form id="ac-f" class="ac-f">
        <select class="sel" id="ac-m">${mods.filter((m) => m.codigo !== "acessos").map((m) => `<option value="${m.codigo}">${esc(m.nome)}</option>`).join("")}</select>
        <select class="sel" id="ac-t"><option value="papel">Perfil</option><option value="departamento_id">Departamento</option><option value="usuario_id">Pessoa</option></select>
        <select class="sel" id="ac-v"></select>
        <select class="sel" id="ac-n"><option value="total">Total</option><option value="leitura">Leitura</option></select>
        <button class="btn p" type="submit" style="height:36px">${I.mais} Adicionar regra</button>
      </form></div>`;
  const opcoes = () => {
    const t = $("#ac-t").value;
    $("#ac-v").innerHTML = t === "papel" ? Object.entries(PAP).filter(([k]) => k !== "admin").map(([k, n]) => `<option value="${k}">${n}</option>`).join("")
      : t === "departamento_id" ? d.departamentos.map((x) => `<option value="${x.id}">${esc(x.nome)}</option>`).join("")
      : d.usuarios.filter((u) => u.papel !== "admin").map((u) => `<option value="${u.id}">${esc(u.nome)}</option>`).join("");
  };
  $("#ac-t").onchange = opcoes; opcoes();
  $("#ac-f").onsubmit = async (e) => {
    e.preventDefault();
    const t = $("#ac-t").value, v = $("#ac-v").value;
    const reg = { modulo: $("#ac-m").value, nivel: $("#ac-n").value, [t]: t === "departamento_id" ? +v : v };
    const { error } = await sb.from("app_acessos").insert(reg);
    if (error) return toast("Não salvou: " + error.message);
    toast("Regra adicionada"); telaAcessos();
  };
  $$("[data-del-ac]").forEach((b) => (b.onclick = async () => {
    const { error } = await sb.from("app_acessos").delete().eq("id", +b.dataset.delAc);
    if (error) return toast("Não removeu: " + error.message);
    toast("Regra removida"); telaAcessos();
  }));
}

// ---------------------------------------------------------------- menu "Mais" (celular)
function menuMais() {
  const g = gaveta(`<div class="gh"><button class="ib gx" aria-label="Fechar">${I.x}</button><div class="ey">Cockpit Utarget</div><h3>Módulos</h3></div>
    <div class="gb"><div class="lista">${navItens().map(([k, n, ic]) => `<button class="mp-i" data-vm="${k}"><div style="display:flex;align-items:center;gap:12px">${ic.replace("<svg", '<svg width="20" height="20"')}<div class="mp-n">${esc(n)}</div></div></button>`).join("")}</div>
    <div style="margin-top:16px;display:flex;gap:8px"><button class="btn s" id="mm-sair">${I.sair} Sair</button></div></div>`);
  $$("[data-vm]", g).forEach((b) => (b.onclick = () => { fecharGaveta(true); irPara(b.dataset.vm); }));
  $("#mm-sair", g).onclick = async () => { await sb.auth.signOut(); location.reload(); };
}

// lista de itens de navegação montada a partir dos módulos liberados
function navItens() {
  const it = [["inicio", "Início", I.inicio]];
  if (temMod("tarefas")) {
    it.push(["painel", "Painel de prazos", I.painel], ["hoje", "Tarefas", I.hoje]);
    if (gestor()) it.push(["entrada", "Entrada", I.entrada]);
    it.push(["modelos", "Modelos", I.lista]);
  }
  (st.mods || []).filter((m) => m.codigo !== "tarefas").forEach((m) => it.push([m.codigo, m.nome, I[m.codigo] || I.lista]));
  return it;
}

Object.assign(MODS, {
  inicio: telaInicio, carteira: telaCarteira, legalizacao: telaLegalizacao, captacao: telaCaptacao, comercial: telaComercial,
  atendimento: telaAtendimento, financeiro: telaFinanceiro, margem: telaMargem, acessos: telaAcessos,
});

iniciar();
if ("serviceWorker" in navigator && !window.__mockSb) navigator.serviceWorker.register("sw.js").catch(() => {});
