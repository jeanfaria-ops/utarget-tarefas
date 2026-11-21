// Cockpit Utarget — v0.6 (19/11/2026): app de tarefas vira cockpit com módulos por perfil (modulos.js). Dados e acesso: Supabase utarget-dados (RLS + RPCs).
const SUPABASE_URL = "https://okgxketgsyggzpvnapup.supabase.co";
const SUPABASE_KEY = "sb_publishable_fwAjsYH7ZOV177xeq0O86g_INBxCAY9"; // chave pública; o acesso é controlado pelo banco
const sb = window.__mockSb || supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: "pkce", persistSession: true, detectSessionInUrl: true } });

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $("#app");
const tip = $("#tip");
const ls = { get(k, d) { try { const v = localStorage.getItem("ut." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
             set(k, v) { try { localStorage.setItem("ut." + k, JSON.stringify(v)); } catch {} } };

const st = {
  eu: null, base: [], carregado: false, carregando: false,
  view: ls.get("view", "inicio"), escopo: ls.get("escopo", null),
  f: { q: "", chip: "todas", dept: "", pessoa: "", cliente: "", dia: "", horiz: ls.get("horiz", 0) },
  limite: {}, usuarios: [], clientes: [], deptos: [], modelos: [], tabela: {}, pend: new Map(), mods: [],
};
const ABERTOS = ["entrada", "a_fazer", "em_andamento", "aguardando", "em_aprovacao", "retificando"];
const STATUS = { entrada: "Entrada", a_fazer: "A fazer", em_andamento: "Em andamento", aguardando: "Aguardando", em_aprovacao: "Em aprovação", retificando: "Retificando", concluida: "Concluída", dispensada: "Dispensada" };
const TIPOS = [["interna", "Interna"], ["solicitacao", "Solicitação de cliente"], ["obrigacao", "Obrigação"], ["projeto", "Projeto"], ["comercial", "Comercial"]];
const CAT = { atr: "Atrasada", risco: "Vence em até 3 dias", ok: "Em dia" };

// ---------------------------------------------------------------- utilidades
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const limpa = (s) => String(s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const hojeISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const dt = (iso) => new Date(iso + "T12:00:00Z");
const addD = (iso, n) => { const d = dt(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diff = (a, b) => Math.round((dt(a) - dt(b)) / 864e5); // a - b em dias
const dm = (iso) => (iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) : "—");
const SEM = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const dsem = (iso) => SEM[dt(iso).getUTCDay()];
const extenso = (iso) => { const d = dt(iso); return `${["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][d.getUTCDay()]}, ${d.getUTCDate()} de ${["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"][d.getUTCMonth()]}`; };
const comp = (iso) => (iso ? MES[+iso.slice(5, 7) - 1] + "/" + iso.slice(0, 4) : "—");
const curto = (n) => { const p = limpa(n).split(" "); return p.length > 1 ? p[0] + " " + p[p.length - 1] : p[0] || "Sem dono"; };
const ini = (n) => limpa(n).split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
const gestor = () => ["admin", "lider"].includes(st.eu?.papel);
const MOTOR_PROPRIO = false; // tarefas executadas no G-Click; o motor próprio volta quando a migração for decidida
const podeCriar = () => MOTOR_PROPRIO && ["admin", "lider", "operador", "comercial"].includes(st.eu?.papel);

const I = {
  painel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  hoje: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M8.5 15l2.2 2.2 4.8-4.7"/></svg>',
  entrada: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13h5l2 3h4l2-3h5"/><path d="M5.5 5h13L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z"/></svg>',
  mais: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  busca: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  att: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/></svg>',
  sair: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  seta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M8 7h9v9"/></svg>',
  raio: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
  festa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16.5 9.5"/></svg>',
  lista: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>',
  lixo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
};
const MS = '<svg class="ms-i" viewBox="0 0 21 21" width="18" height="18"><rect x="1" y="1" width="9" height="9" fill="#F25022"/><rect x="11" y="1" width="9" height="9" fill="#7FBA00"/><rect x="1" y="11" width="9" height="9" fill="#00A4EF"/><rect x="11" y="11" width="9" height="9" fill="#FFB900"/></svg>';

function toast(txt, desfazer) {
  $$(".toast").forEach((t) => t.remove());
  const d = document.createElement("div");
  d.className = "toast"; d.setAttribute("role", "status");
  d.innerHTML = `<span>${esc(txt)}</span>${desfazer ? "<button>Desfazer</button>" : ""}`;
  if (desfazer) d.querySelector("button").onclick = () => { desfazer(); d.remove(); };
  document.body.appendChild(d);
  setTimeout(() => d.remove(), desfazer ? 5000 : 2800);
}
function dica(e, html) {
  if (!html) { tip.classList.remove("on"); return; }
  tip.innerHTML = html; tip.classList.add("on");
  const r = tip.getBoundingClientRect();
  let x = e.clientX + 14, y = e.clientY + 14;
  if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
  if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
  tip.style.left = Math.max(8, x) + "px"; tip.style.top = Math.max(8, y) + "px";
}
const tipLinha = (cor, rot, v) => `<div class="tl"><i style="background:${cor}"></i>${esc(rot)}<b>${v}</b></div>`;
const cor = (k) => getComputedStyle(document.documentElement).getPropertyValue({ atr: "--c-atr", risco: "--c-risco", ok: "--c-ok" }[k]).trim();

// ---------------------------------------------------------------- tema
function aplicaTema() { const t = ls.get("tema", "auto"); if (t === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", t); }
aplicaTema();

// ---------------------------------------------------------------- login
function telaLogin(msg = "") {
  app.innerHTML = `
  <div class="login">
    <section class="arte">
      <img src="logo-azul.svg" alt="Utarget Contabilidade &amp; Assessoria">
      <div><h1>Nenhum prazo <em>passa</em> despercebido.</h1>
      <p>Tarefas, clientes, legalização, captação e números da Utarget num só lugar. Cada pessoa vê o que é da sua área.</p></div>
      <div class="rod">Utarget Contabilidade &amp; Assessoria · (11) 2642-8636</div>
      <div class="reg"></div>
    </section>
    <section class="form"><div class="cx">
      <h2>Entrar</h2><p>Use a sua conta da Utarget.</p>
      <button class="btn s" id="ms">${MS} Entrar com Microsoft 365</button>
      <div class="ou">ou, para externos</div>
      <input id="email" type="email" placeholder="seu e-mail" autocomplete="email" aria-label="E-mail">
      <button class="btn p" id="link">Receber link de acesso</button>
      <div class="msg" id="msg" role="status">${esc(msg)}</div>
    </div></section>
  </div>`;
  const volta = location.origin + location.pathname;
  $("#ms").onclick = () => sb.auth.signInWithOAuth({ provider: "azure", options: { scopes: "email", redirectTo: volta } });
  $("#link").onclick = async () => {
    const email = $("#email").value.trim();
    if (!email) return $("#email").focus();
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: volta, shouldCreateUser: true } });
    $("#msg").textContent = error ? "Não foi possível enviar: " + error.message : "Link enviado. Abra o e-mail neste mesmo aparelho.";
  };
}

// ---------------------------------------------------------------- dados
async function carregar(silencioso) {
  st.carregando = true; marcaAtualizando();
  const { data, error } = await sb.rpc("app_base", { p_hist: 90 });
  st.carregando = false; marcaAtualizando();
  if (error) { toast("Erro ao carregar: " + error.message); return; }
  st.base = (data || []).map((t) => ({ ...t, titulo: limpa(t.titulo) }));
  st.carregado = true;
  if (!silencioso || (!$(".gav.on") && !MODS[st.view] || st.view === "inicio")) renderView();
}
function marcaAtualizando() { const b = $("#att"); if (b) b.classList.toggle("gira", st.carregando); }
async function listas() {
  const tarefas = [];
  if (!st.usuarios.length) tarefas.push(sb.from("app_usuarios").select("id,nome,papel,departamentos").eq("ativo", true).order("nome").then(({ data }) => (st.usuarios = (data || []).filter((u) => u.papel !== "cliente"))));
  if (!st.deptos.length) tarefas.push(sb.from("departamentos").select("id,nome").eq("ativo", true).order("nome").then(({ data }) => (st.deptos = data || [])));
  if (!st.clientes.length) tarefas.push(sb.rpc("app_clientes").then(({ data }) => (st.clientes = data || [])));
  if (!st.modelos.length) tarefas.push(sb.from("modelos").select("id,nome,tipo,departamento_id,checklist,dias_prazo,dias_meta").eq("ativo", true).order("nome").then(({ data }) => (st.modelos = data || [])));
  await Promise.all(tarefas);
}

const aberta = (t) => ABERTOS.includes(t.status) && !st.pend.has(t.id);
function catDe(t, hoje = hojeISO()) {
  if (!t.vencimento) return "ok";
  const d = diff(t.vencimento, hoje);
  return d < 0 ? "atr" : d <= 3 ? "risco" : "ok";
}
function universo() { // tarefas no escopo atual (Minhas / Equipe)
  return st.escopo === "minhas" ? st.base.filter((t) => t.minha) : st.base;
}

// ---------------------------------------------------------------- casca
function casca() {
  const nEntrada = st.base.filter((t) => t.status === "entrada").length;
  const abas = navItens();
  const grupoTar = ["gclick", "painel", "hoje", "entrada", "modelos"];
  const tab = [abas.find((a) => a[0] === "inicio"), abas.find((a) => a[0] === "gclick") || abas.find((a) => a[0] === "hoje"), abas.find((a) => a[0] === "carteira") || abas.find((a) => a[0] === "margem")].filter(Boolean);
  const tema = ls.get("tema", "auto");
  app.innerHTML = `
  <div class="shell">
    <aside class="side">
      <img class="logo" src="logo-azul.svg" alt="Utarget">
      <nav class="nav" aria-label="Principal">
        ${abas.map(([k, n, ic], i) => `${grupoTar.includes(k) && !grupoTar.includes(abas[i - 1]?.[0]) ? '<div class="rot n1">Tarefas</div>' : ""}${!grupoTar.includes(k) && k !== "inicio" && (grupoTar.includes(abas[i - 1]?.[0]) || abas[i - 1]?.[0] === "inicio") ? '<div class="rot n1">Módulos</div>' : ""}<button data-v="${k}" ${st.view === k ? 'aria-current="page"' : ""}>${ic}<span>${n}</span>${k === "entrada" && nEntrada ? `<span class="badge">${nEntrada}</span>` : ""}</button>`).join("")}
      </nav>
      <div class="rot">Tema</div>
      <div class="tema" role="group" aria-label="Tema">
        ${[["auto", "Auto"], ["light", "Claro"], ["dark", "Escuro"]].map(([k, n]) => `<button data-t="${k}" aria-pressed="${tema === k}">${n}</button>`).join("")}
      </div>
      <div class="eu"><div class="av">${esc(ini(st.eu.nome))}</div>
        <div><div class="n">${esc(curto(st.eu.nome))}</div><div class="p">${esc({ admin: "Administrador", lider: "Líder", operador: "Operador", terceirizado: "Terceirizado", comercial: "Comercial" }[st.eu.papel] || st.eu.papel)}</div></div>
        <button id="sair" title="Sair" aria-label="Sair">${I.sair}</button></div>
    </aside>
    <div class="main">
      <header class="top"><div class="in">
        <img class="mlogo" src="logo-claro.svg" alt="Utarget">
        <div class="tit"><h1 id="titulo"></h1><div class="sub" id="subtitulo"></div></div>
        ${temMod("tarefas") ? `<div class="seg top-seg" role="group" aria-label="Visão das tarefas"><button data-e="minhas" aria-pressed="${st.escopo === "minhas"}">Minhas</button><button data-e="equipe" aria-pressed="${st.escopo === "equipe"}">Equipe</button></div>` : ""}
        <label class="busca"><span class="sr" hidden>Buscar</span>${I.busca}<input id="q" type="search" placeholder="Buscar tarefa, cliente, pessoa…" value="${esc(st.f.q)}" autocomplete="off"><kbd>/</kbd></label>
        ${podeCriar() ? `<button class="btn p" id="nova" title="Nova tarefa (N)">${I.mais}<span class="nv-t">Nova tarefa</span></button>` : ""}
        <button class="ib" id="att" title="Atualizar" aria-label="Atualizar">${I.att}</button>
      </div></header>
      <main class="view" id="view"></main>
    </div>
  </div>
  <nav class="tabbar" style="--n:${tab.length + 1 + (podeCriar() ? 1 : 0)}" aria-label="Principal">
    ${tab.slice(0, 2).map(([k, n, ic]) => `<button data-v="${k}" ${st.view === k ? 'aria-current="page"' : ""}>${ic}<span>${n}</span></button>`).join("")}
    ${podeCriar() ? `<button id="nova-m">${I.mais}<span>Nova</span></button>` : ""}
    ${tab.slice(2).map(([k, n, ic]) => `<button data-v="${k}" ${st.view === k ? 'aria-current="page"' : ""}>${ic}<span>${n.split(" ")[0]}</span></button>`).join("")}
    <button id="mais-m">${I.menu}<span>Mais</span></button>
  </nav>`;
  $$("[data-v]").forEach((b) => (b.onclick = () => irPara(b.dataset.v)));
  $$("[data-e]").forEach((b) => (b.onclick = () => { st.escopo = b.dataset.e; ls.set("escopo", st.escopo); casca(); renderView(); }));
  $$("[data-t]").forEach((b) => (b.onclick = () => { ls.set("tema", b.dataset.t); aplicaTema(); casca(); renderView(); }));
  $("#sair").onclick = async () => { await sb.auth.signOut(); location.reload(); };
  $("#att").onclick = () => { limpaCacheMod(); carregar(); };
  if ($("#mais-m")) $("#mais-m").onclick = () => menuMais();
  if ($("#nova")) $("#nova").onclick = () => novaTarefa();
  if ($("#nova-m")) $("#nova-m").onclick = () => novaTarefa();
  const q = $("#q");
  q.oninput = () => { st.f.q = q.value; if (["painel", "modelos", "inicio"].includes(st.view) && q.value) { st.view = MOTOR_PROPRIO ? "hoje" : "gclick"; atualizaNav(); } renderView(); };
}
function atualizaNav() { $$("[data-v]").forEach((b) => (b.dataset.v === st.view ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"))); ls.set("view", st.view); dica(); }
function irPara(v, filtros) {
  st.view = v;
  if (filtros) { st.f = { ...st.f, chip: "todas", dept: "", pessoa: "", cliente: "", dia: "", ...filtros }; }
  atualizaNav(); renderView(); window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}
function cabecalho(t, s) { $("#titulo").textContent = t; $("#subtitulo").textContent = s; document.title = t + " · Utarget"; }

function renderView() {
  if (!$("#view")) return;
  if (!st.carregado) return esqueleto();
  if (!navItens().some((a) => a[0] === st.view)) st.view = "inicio";
  if (MODS[st.view]) MODS[st.view]();
  else if (st.view === "painel") painel();
  else if (st.view === "modelos") telaModelos();
  else lista(st.view === "entrada");
}
function esqueleto() {
  cabecalho("Carregando…", "");
  $("#view").innerHTML = `<div class="sk" style="height:58px;width:46%;margin-bottom:18px"></div>
    <div class="kpis">${'<div class="sk" style="height:104px"></div>'.repeat(5)}</div>
    <div class="grade"><div class="sk" style="height:320px"></div><div class="sk" style="height:320px"></div></div>`;
}

// ---------------------------------------------------------------- painel (BI)
function metricas(lista, hoje) {
  const ab = lista.filter(aberta);
  const atr = ab.filter((t) => catDe(t, hoje) === "atr"), risco = ab.filter((t) => catDe(t, hoje) === "risco");
  const desde30 = addD(hoje, -30), desde7 = addD(hoje, -7);
  const conc30 = lista.filter((t) => t.status === "concluida" && t.concluido_em && t.concluido_em >= desde30);
  const noPrazo = conc30.filter((t) => !t.vencimento || t.concluido_em <= t.vencimento);
  return {
    ab, atr, risco, conc30, noPrazo,
    andamento: ab.filter((t) => t.status === "em_andamento").length,
    multaAtr: atr.filter((t) => t.gera_multa).length, multaRisco: risco.filter((t) => t.gera_multa).length,
    conc7: lista.filter((t) => t.status === "concluida" && t.concluido_em && t.concluido_em >= desde7).length,
    pct: conc30.length ? Math.round((noPrazo.length / conc30.length) * 100) : null,
  };
}
function painel() {
  const hoje = hojeISO();
  const U = universo();
  const m = metricas(U, hoje);
  const h = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false });
  const saud = +h < 12 ? "Bom dia" : +h < 18 ? "Boa tarde" : "Boa noite";
  cabecalho("Painel", extenso(hoje) + (st.escopo === "equipe" ? " · visão da equipe" : " · minhas tarefas"));
  const prox = m.atr.filter((t) => t.gera_multa)[0] || m.atr[0] || m.risco[0];
  const frase = m.atr.length
    ? `Há <b>${plural(m.atr.length, "tarefa atrasada", "tarefas atrasadas")}</b>${m.multaAtr ? `, <b>${m.multaAtr} com multa</b>` : ""}, e <b>${m.risco.length}</b> vencem em até 3 dias.${prox ? ` Comece por <b>${esc(prox.titulo)}</b>${prox.entidade ? " · " + esc(prox.entidade) : ""}.` : ""}`
    : m.risco.length ? `Nada atrasado. <b>${plural(m.risco.length, "tarefa vence", "tarefas vencem")}</b> em até 3 dias.` : "Nada atrasado e nada vencendo nos próximos 3 dias.";
  const dimPessoa = st.escopo === "equipe";

  $("#view").innerHTML = `
  <div class="saud"><div><h2>${saud}, ${esc(limpa(st.eu.nome).split(" ")[0])}.</h2><p>${frase}</p></div>
    ${prox ? `<button class="btn s" id="comecar">Abrir a mais urgente ${I.seta}</button>` : ""}</div>
  <div class="kpis">
    ${kpi("abertas", "Abertas", m.ab.length, `<b>${m.andamento}</b> em andamento`, "")}
    ${kpi("atr", "Atrasadas", m.atr.length, m.multaAtr ? `<b>${m.multaAtr}</b> com multa` : "nenhuma com multa", "atr")}
    ${kpi("risco", "Vencem em 3 dias", m.risco.length, m.multaRisco ? `<b>${m.multaRisco}</b> com multa` : "nenhuma com multa", "risco")}
    ${kpi("prazo", "Entregues no prazo", m.pct == null ? "—" : m.pct, m.conc30.length ? `<b>${m.noPrazo.length}</b> de ${m.conc30.length} nos últimos 30 dias` : "sem entregas em 30 dias", "ok", m.pct == null ? "" : "%")}
    ${kpi("conc", "Concluídas", m.conc7, "nos últimos 7 dias", "")}
  </div>
  <div class="grade">
    <section class="card" aria-labelledby="g1">
      <div class="sec-h"><div><h2 id="g1">Carga por ${dimPessoa ? "pessoa" : "departamento"}</h2><p>Tarefas abertas, pela situação do prazo. Clique para ver a lista.</p></div>
        ${segTabela("carga")}</div>
      <div class="leg">${["atr", "risco", "ok"].map((k) => `<span><i style="background:var(--c-${k})"></i>${CAT[k]}</span>`).join("")}</div>
      <div id="carga"></div>
    </section>
    <section class="card" aria-labelledby="g2">
      <div class="sec-h"><div><h2 id="g2">Vencimentos das próximas 3 semanas</h2><p>Tarefas abertas por dia de prazo. A primeira coluna soma as atrasadas.</p></div>
        ${segTabela("cal")}</div>
      <div class="leg">${["atr", "risco", "ok"].map((k) => `<span><i style="background:var(--c-${k})"></i>${CAT[k]}</span>`).join("")}</div>
      <div id="cal" class="cal"></div>
    </section>
  </div>
  <div class="grade b">
    <section class="card" aria-labelledby="g3">
      <div class="sec-h"><div><h2 id="g3">Departamentos</h2><p>Abertas, risco e pontualidade das entregas dos últimos 30 dias.</p></div></div>
      <div id="deptos"></div>
    </section>
    <section class="card" aria-labelledby="g4">
      <div class="sec-h"><div><h2 id="g4">Clientes que pedem atenção</h2><p>Ordenados por atraso, multa e prazo curto.</p></div></div>
      <div id="clientes"></div>
    </section>
  </div>`;

  $$(".kpi").forEach((k) => (k.onclick = () => {
    const a = k.dataset.k;
    irPara("hoje", { chip: { atr: "atr", risco: "risco", abertas: "todas", prazo: "todas", conc: "todas" }[a] });
  }));
  if (prox) $("#comecar").onclick = () => abrir(prox.id);
  $$("[data-tab]").forEach((b) => (b.onclick = () => { st.tabela[b.dataset.tab] = b.dataset.modo === "tab"; painel(); }));
  graficoCarga(m.ab, hoje, dimPessoa);
  graficoCal(m.ab, hoje);
  tabelaDeptos(U, hoje);
  listaClientes(m.ab, hoje);
}
function kpi(k, rot, v, sub, c, suf = "") {
  return `<button class="kpi" data-k="${k}"><div class="r">${c ? `<i style="background:var(--c-${c})"></i>` : ""}${rot}</div>
    <div class="v">${v}${suf ? `<small>${suf}</small>` : ""}</div><div class="s">${sub}</div><span class="seta">${I.seta}</span></button>`;
}
const segTabela = (id) => `<div class="mini-seg" role="group" aria-label="Formato"><button data-tab="${id}" data-modo="graf" aria-pressed="${!st.tabela[id]}">Gráfico</button><button data-tab="${id}" data-modo="tab" aria-pressed="${!!st.tabela[id]}">Tabela</button></div>`;

function graficoCarga(ab, hoje, porPessoa) {
  const el = $("#carga");
  const chave = (t) => (porPessoa ? t.responsavel || "Sem dono" : t.departamento || "Sem departamento");
  const g = new Map();
  for (const t of ab) { const k = chave(t); const o = g.get(k) || { k, atr: 0, risco: 0, ok: 0, multa: 0, id: t.responsavel_id }; o[catDe(t, hoje)]++; if (t.gera_multa) o.multa++; g.set(k, o); }
  const rows = [...g.values()].map((o) => ({ ...o, tot: o.atr + o.risco + o.ok })).sort((a, b) => b.atr - a.atr || b.tot - a.tot);
  if (!rows.length) { el.innerHTML = '<div class="vazio-g">Nenhuma tarefa aberta.</div>'; return; }
  const filtro = (o) => (porPessoa ? { pessoa: o.k } : { dept: o.k });
  if (st.tabela.carga) {
    el.innerHTML = `<div class="tbw"><table class="tb"><thead><tr><th>${porPessoa ? "Pessoa" : "Departamento"}</th><th class="n">Atrasadas</th><th class="n">Até 3 dias</th><th class="n">Em dia</th><th class="n">Total</th><th class="n">Multa</th></tr></thead>
      <tbody>${rows.map((o, i) => `<tr data-i="${i}"><td class="forte">${esc(porPessoa ? curto(o.k) : o.k)}</td><td class="n">${o.atr}</td><td class="n">${o.risco}</td><td class="n">${o.ok}</td><td class="n forte">${o.tot}</td><td class="n">${o.multa}</td></tr>`).join("")}</tbody></table></div>`;
    $$("tbody tr", el).forEach((r) => (r.onclick = () => irPara("hoje", filtro(rows[+r.dataset.i]))));
    return;
  }
  const max = Math.max(...rows.map((o) => o.tot));
  el.innerHTML = `<div class="hb">${rows.map((o, i) => `
    <button class="hb-row" data-i="${i}" aria-label="${esc(o.k)}: ${o.atr} atrasadas, ${o.risco} vencem em até 3 dias, ${o.ok} em dia">
      <span class="nm" title="${esc(o.k)}">${esc(porPessoa ? curto(o.k) : o.k)}</span>
      <span class="hb-bar" style="width:${Math.max(2, (o.tot / max) * 100)}%">
        ${["atr", "risco", "ok"].filter((c) => o[c]).map((c) => `<span data-c="${c}" style="flex:${o[c]};background:var(--c-${c})"></span>`).join("")}
      </span>
      <span class="tt">${o.tot}</span></button>`).join("")}</div>`;
  $$(".hb-row", el).forEach((b) => {
    const o = rows[+b.dataset.i];
    b.onclick = () => irPara("hoje", filtro(o));
    b.onmousemove = (e) => dica(e, `<div class="tt">${esc(o.k)}</div>${["atr", "risco", "ok"].map((c) => tipLinha(`var(--c-${c})`, CAT[c], o[c])).join("")}${o.multa ? `<div class="tx">${o.multa} com multa</div>` : ""}`);
    b.onmouseleave = () => dica();
  });
}

function graficoCal(ab, hoje) {
  const el = $("#cal");
  const N = 21;
  const dias = Array.from({ length: N }, (_, i) => addD(hoje, i));
  const atr = ab.filter((t) => catDe(t, hoje) === "atr");
  const por = new Map(dias.map((d) => [d, []]));
  for (const t of ab) if (t.vencimento && por.has(t.vencimento)) por.get(t.vencimento).push(t);
  const cols = [{ d: "atr", rot: "Atras.", lista: atr, c: "atr" }].concat(dias.map((d, i) => ({ d, rot: i === 0 ? "Hoje" : dt(d).getUTCDate() + "", sem: dsem(d), lista: por.get(d), c: diff(d, hoje) <= 3 ? "risco" : "ok", fds: [0, 6].includes(dt(d).getUTCDay()) })));
  if (st.tabela.cal) {
    el.innerHTML = `<div class="tbw"><table class="tb"><thead><tr><th>Dia</th><th class="n">Tarefas</th><th class="n">Com multa</th><th>Principais</th></tr></thead><tbody>
      ${cols.filter((c) => c.lista.length).map((c, i) => `<tr data-d="${c.d}"><td class="forte">${c.d === "atr" ? "Atrasadas" : dsem(c.d) + " " + dm(c.d)}</td><td class="n forte">${c.lista.length}</td><td class="n">${c.lista.filter((t) => t.gera_multa).length}</td><td>${esc(resumoTitulos(c.lista, 2))}</td></tr>`).join("") || '<tr><td colspan="4">Sem vencimentos no período.</td></tr>'}
      </tbody></table></div>`;
    $$("tbody tr[data-d]", el).forEach((r) => (r.onclick = () => irPara("hoje", r.dataset.d === "atr" ? { chip: "atr" } : { dia: r.dataset.d })));
    return;
  }
  const W = Math.max(300, Math.round(el.clientWidth || 600)), estreito = W < 520, H = estreito ? 200 : 230, L = 26, B = 34, T = 18, gap = estreito ? 2 : 4;
  const cw = (W - L) / cols.length;
  const max = Math.max(4, ...cols.map((c) => c.lista.length));
  const passo = max <= 8 ? 2 : max <= 20 ? 5 : max <= 50 ? 10 : 25;
  const topo = Math.ceil(max / passo) * passo;
  const y = (v) => T + (H - T - B) * (1 - v / topo);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Vencimentos por dia nas próximas três semanas">`;
  for (let v = 0; v <= topo; v += passo) s += `<line class="${v ? "grid" : "base"}" x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 6}" y="${y(v) + 3.5}" text-anchor="end">${v}</text>`;
  cols.forEach((c, i) => {
    const x = L + i * cw + gap / 2, w = cw - gap, n = c.lista.length;
    const yy = y(n), hh = H - B - yy;
    const r = Math.min(4, w / 2, hh);
    s += `<g class="col" data-i="${i}">`;
    if (n) s += `<path class="m" d="M${x},${H - B} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + w - r} Q${x + w},${yy} ${x + w},${yy + r} V${H - B} Z" fill="var(--c-${c.c})"/>`;
    if (n && (c.d === "atr" || n === Math.max(...cols.slice(1).map((k) => k.lista.length)))) s += `<text class="lab" x="${c.d === "atr" && estreito ? x : x + w / 2}" y="${yy - 5}" text-anchor="${c.d === "atr" && estreito ? "start" : "middle"}">${n}${c.d === "atr" && estreito ? " atrasadas" : ""}</text>`;
    const cls = c.d === "atr" ? "ax hj" : i === 1 ? "ax hj" : c.fds ? "ax fds" : "ax";
    if (!estreito || (i >= 1 && (i === 1 || c.sem === "seg"))) s += `<text class="${cls}" x="${x + w / 2}" y="${H - B + 14}" text-anchor="middle">${c.rot}</text>`;
    if (c.sem && (i === 1 || c.sem === "seg")) s += `<text class="ax" x="${x + w / 2}" y="${H - B + 27}" text-anchor="middle">${c.sem}</text>`;
    s += `<rect class="hit" x="${x - gap / 2}" y="${T}" width="${cw}" height="${H - T}"/></g>`;
  });
  el.innerHTML = s + "</svg>";
  el.querySelector("svg").style.height = H + "px";
  $$("g.col", el).forEach((g) => {
    const c = cols[+g.dataset.i];
    g.onmousemove = (e) => dica(e, `<div class="tt">${c.d === "atr" ? "Atrasadas" : extenso(c.d)}</div>${tipLinha(`var(--c-${c.c})`, "Tarefas", c.lista.length)}${c.lista.filter((t) => t.gera_multa).length ? tipLinha("var(--laranja)", "Com multa", c.lista.filter((t) => t.gera_multa).length) : ""}${c.lista.length ? `<div class="tx">${esc(resumoTitulos(c.lista, 3))}</div>` : ""}`);
    g.onmouseleave = () => dica();
    g.onclick = () => c.lista.length && irPara("hoje", c.d === "atr" ? { chip: "atr" } : { dia: c.d });
  });
}
function resumoTitulos(l, n) {
  const c = new Map(); l.forEach((t) => c.set(t.titulo, (c.get(t.titulo) || 0) + 1));
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([t, k]) => (k > 1 ? `${t} (${k})` : t)).join(" · ");
}

function tabelaDeptos(U, hoje) {
  const g = new Map();
  const desde = addD(hoje, -30);
  for (const t of U) {
    const k = t.departamento || "Sem departamento";
    const o = g.get(k) || { k, ab: 0, atr: 0, risco: 0, conc: 0, prazo: 0 };
    if (aberta(t)) { o.ab++; const c = catDe(t, hoje); if (c !== "ok") o[c]++; }
    if (t.status === "concluida" && t.concluido_em >= desde) { o.conc++; if (!t.vencimento || t.concluido_em <= t.vencimento) o.prazo++; }
    g.set(k, o);
  }
  const rows = [...g.values()].filter((o) => o.ab || o.conc).sort((a, b) => b.atr - a.atr || b.ab - a.ab);
  const el = $("#deptos");
  if (!rows.length) { el.innerHTML = '<div class="vazio-g">Sem dados.</div>'; return; }
  el.innerHTML = `<div class="tbw"><table class="tb"><thead><tr><th>Departamento</th><th class="n">Abertas</th><th class="n">Atras.</th><th class="n hm">Até 3 dias</th><th class="n">No prazo</th></tr></thead><tbody>
    ${rows.map((o, i) => { const p = o.conc ? Math.round((o.prazo / o.conc) * 100) : null; return `<tr data-i="${i}"><td class="forte">${esc(o.k)}</td><td class="n">${o.ab}</td>
      <td class="n">${o.atr ? `<span class="pill atr">${o.atr}</span>` : "0"}</td><td class="n hm">${o.risco ? `<span class="pill risco">${o.risco}</span>` : "0"}</td>
      <td class="n">${p == null ? '<span style="color:var(--ink3)">—</span>' : `<div class="pct"><span class="num">${p}%</span><span class="tr"><i style="width:${p}%"></i></span></div>`}</td></tr>`; }).join("")}
  </tbody></table></div>`;
  $$("tbody tr", el).forEach((r) => (r.onclick = () => irPara("hoje", { dept: rows[+r.dataset.i].k })));
}

function listaClientes(ab, hoje) {
  const g = new Map();
  for (const t of ab) {
    if (!t.entidade) continue;
    const o = g.get(t.entidade) || { k: t.entidade, nome: t.entidade_nome, atr: 0, risco: 0, multa: 0, prox: null, n: 0 };
    const c = catDe(t, hoje); o.n++;
    if (c === "atr") o.atr++; if (c === "risco") o.risco++;
    if (t.gera_multa && c !== "ok") o.multa++;
    if (t.vencimento && t.vencimento >= hoje && (!o.prox || t.vencimento < o.prox)) o.prox = t.vencimento;
    g.set(t.entidade, o);
  }
  const rows = [...g.values()].map((o) => ({ ...o, sc: o.atr * 3 + o.multa * 2 + o.risco })).filter((o) => o.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, 7);
  const el = $("#clientes");
  if (!rows.length) { el.innerHTML = `<div class="vazio-g">Nenhum cliente com atraso ou prazo curto.</div>`; return; }
  el.innerHTML = `<div class="cli-l">${rows.map((o, i) => `
    <button class="cli-r" data-i="${i}"><span class="rk">${i + 1}</span>
      <div><div class="nm" title="${esc(o.nome || o.k)}">${esc(o.k)}</div><div class="ds">${plural(o.n, "tarefa aberta", "tarefas abertas")}${o.prox ? ` · próximo prazo ${dm(o.prox)}` : ""}</div></div>
      <span class="pp">${o.atr ? `<span class="pill atr">${o.atr} atras.</span>` : ""}${o.risco ? `<span class="pill risco">${o.risco} em 3d</span>` : ""}${o.multa ? `<span class="pill multa">${o.multa} multa</span>` : ""}</span>
    </button>`).join("")}</div>`;
  $$(".cli-r", el).forEach((b) => (b.onclick = () => irPara("hoje", { cliente: rows[+b.dataset.i].k })));
}

// ---------------------------------------------------------------- lista de tarefas
function filtrar(entrada) {
  const hoje = hojeISO(), f = st.f;
  let l = entrada ? st.base.filter((t) => t.status === "entrada") : universo().filter((t) => ABERTOS.includes(t.status));
  if (f.q) { const q = f.q.toLowerCase(); l = l.filter((t) => [t.titulo, t.entidade, t.entidade_nome, t.responsavel, t.departamento].some((v) => (v || "").toLowerCase().includes(q))); }
  if (f.dept) l = l.filter((t) => (t.departamento || "Sem departamento") === f.dept);
  if (f.pessoa) l = l.filter((t) => (t.responsavel || "Sem dono") === f.pessoa);
  if (f.cliente) l = l.filter((t) => t.entidade === f.cliente);
  if (f.dia) l = l.filter((t) => t.vencimento === f.dia);
  if (f.horiz && !f.dia) l = l.filter((t) => !t.vencimento || diff(t.vencimento, hoje) <= f.horiz);
  const base = l;
  const chips = {
    todas: base.length, atr: base.filter((t) => catDe(t, hoje) === "atr").length, risco: base.filter((t) => catDe(t, hoje) === "risco").length,
    multa: base.filter((t) => t.gera_multa).length, aguardando: base.filter((t) => t.status === "aguardando").length, andamento: base.filter((t) => t.status === "em_andamento").length,
  };
  if (f.chip === "atr" || f.chip === "risco") l = l.filter((t) => catDe(t, hoje) === f.chip);
  if (f.chip === "multa") l = l.filter((t) => t.gera_multa);
  if (f.chip === "aguardando") l = l.filter((t) => t.status === "aguardando");
  if (f.chip === "andamento") l = l.filter((t) => t.status === "em_andamento");
  const peso = (t) => (catDe(t, hoje) === "atr" ? 0 : 1);
  l = l.slice().sort((a, b) => peso(a) - peso(b) || (b.gera_multa - a.gera_multa) || ((a.vencimento || "9") < (b.vencimento || "9") ? -1 : (a.vencimento || "9") > (b.vencimento || "9") ? 1 : 0) || (a.prioridade ?? 2) - (b.prioridade ?? 2));
  return { l, chips };
}
function grupoDe(t, hoje) {
  if (!t.vencimento) return ["sem", "Sem prazo"];
  const d = diff(t.vencimento, hoje);
  if (d < 0) return ["atr", "Atrasadas"];
  if (d === 0) return ["hoje", "Hoje · " + dsem(hoje) + " " + dm(hoje)];
  if (d === 1) return ["amanha", "Amanhã · " + dsem(t.vencimento) + " " + dm(t.vencimento)];
  const fimSemana = 7 - (dt(hoje).getUTCDay() || 7);
  if (d <= Math.max(fimSemana, 2)) return ["semana", "Esta semana"];
  if (d <= fimSemana + 7) return ["prox", "Próxima semana"];
  return ["depois", "Mais adiante"];
}
function prazoTxt(t, hoje) {
  if (!t.vencimento) return ["", "Sem prazo", ""];
  const d = diff(t.vencimento, hoje), c = catDe(t, hoje);
  const top = d < 0 ? `${-d} ${-d === 1 ? "dia" : "dias"} atrás` : d === 0 ? "Hoje" : d === 1 ? "Amanhã" : `Em ${d} dias`;
  return [c === "ok" ? "" : c, top, `${dsem(t.vencimento)} ${dm(t.vencimento)}`];
}
function lista(entrada) {
  const hoje = hojeISO(), f = st.f;
  const { l, chips } = filtrar(entrada);
  cabecalho(entrada ? "Entrada" : "Tarefas", entrada ? "Tarefas sem responsável. Atribua para tirá-las daqui." : (st.escopo === "equipe" ? "Visão da equipe" : "Minhas tarefas") + " · " + extenso(hoje));
  const U = entrada ? st.base.filter((t) => t.status === "entrada") : universo().filter((t) => ABERTOS.includes(t.status));
  const deps = [...new Set(U.map((t) => t.departamento || "Sem departamento"))].sort();
  const pessoas = [...new Set(U.map((t) => t.responsavel || "Sem dono"))].sort();
  const semFiltro = !f.q && !f.dept && !f.pessoa && !f.cliente && !f.dia && f.chip === "todas";
  const foco = !entrada && semFiltro ? l.filter((t) => catDe(t, hoje) !== "ok").slice(0, 3) : [];

  const chip = (k, rot, n, c) => `<button class="chip" data-chip="${k}" aria-pressed="${f.chip === k}">${c ? `<i style="background:var(--c-${c})"></i>` : ""}${rot} <b>${n}</b></button>`;
  const ativos = [
    f.cliente && ["cliente", "Cliente: " + f.cliente], f.pessoa && ["pessoa", "Pessoa: " + curto(f.pessoa)], f.dept && ["dept", f.dept], f.dia && ["dia", "Prazo em " + dsem(f.dia) + " " + dm(f.dia)], f.q && ["q", `“${f.q}”`],
  ].filter(Boolean);

  const grupos = [];
  for (const t of l) { const [k, rot] = grupoDe(t, hoje); let g = grupos.find((x) => x.k === k); if (!g) grupos.push((g = { k, rot, itens: [] })); g.itens.push(t); }
  const ordem = ["atr", "hoje", "amanha", "semana", "prox", "depois", "sem"];
  grupos.sort((a, b) => ordem.indexOf(a.k) - ordem.indexOf(b.k));

  $("#view").innerHTML = `
    ${foco.length ? `<div class="foco-h">${I.raio} Foco agora</div><div class="foco">${foco.map((t) => { const [c, a, b] = prazoTxt(t, hoje); return `
      <button class="foco-c ${c}" data-id="${t.id}"><div class="t">${esc(t.titulo)}</div><div class="c">${esc(t.entidade || "Sem cliente")} · ${esc(t.departamento || "")}${st.escopo === "equipe" ? " · " + esc(curto(t.responsavel)) : ""}</div>
      <div class="pp"><span class="pill ${c}">${a} · ${b}</span>${t.gera_multa ? '<span class="pill multa">Multa</span>' : ""}</div></button>`; }).join("")}</div>` : ""}
    <div class="filtros">
      ${chip("todas", "Todas", chips.todas)}${chip("atr", "Atrasadas", chips.atr, "atr")}${chip("risco", "Até 3 dias", chips.risco, "risco")}${chip("multa", "Com multa", chips.multa)}${chip("andamento", "Em andamento", chips.andamento)}${chip("aguardando", "Aguardando", chips.aguardando)}
      <span class="esp"></span>
      <select class="sel" id="f-dept" aria-label="Departamento"><option value="">Todos os departamentos</option>${deps.map((d) => `<option ${f.dept === d ? "selected" : ""}>${esc(d)}</option>`).join("")}</select>
      ${st.escopo === "equipe" || entrada ? `<select class="sel" id="f-pessoa" aria-label="Pessoa"><option value="">Todas as pessoas</option>${pessoas.map((p) => `<option value="${esc(p)}" ${f.pessoa === p ? "selected" : ""}>${esc(curto(p))}</option>`).join("")}</select>` : ""}
      <select class="sel" id="f-horiz" aria-label="Horizonte"><option value="0" ${!f.horiz ? "selected" : ""}>Qualquer prazo</option>${[7, 15, 30].map((v) => `<option value="${v}" ${f.horiz == v ? "selected" : ""}>Próximos ${v} dias</option>`).join("")}</select>
    </div>
    ${ativos.length ? `<div class="ativos">${ativos.map(([k, r]) => `<span class="ativo">${esc(r)}<button data-limpa="${k}" aria-label="Remover filtro">${I.x}</button></span>`).join("")}${ativos.length > 1 ? '<button class="link" data-limpa="tudo">Limpar tudo</button>' : ""}</div>` : ""}
    ${grupos.length ? grupos.map((g) => {
      const lim = st.limite[g.k] || 40;
      return `<section class="grupo"><div class="grupo-h ${g.k === "atr" ? "atr" : ""}">${esc(g.rot)} <span class="ct">${g.itens.length}</span><span class="lin"></span></div>
      <div class="lista">${g.itens.slice(0, lim).map((t) => linha(t, hoje, entrada)).join("")}
      ${g.itens.length > lim ? `<button class="mais" data-mais="${g.k}">Mostrar mais ${g.itens.length - lim}</button>` : ""}</div></section>`; }).join("")
    : `<div class="vazio">${I.festa}<h3>${entrada ? "Entrada vazia" : semFiltro ? "Tudo em dia" : "Nada com esses filtros"}</h3><div>${entrada ? "Toda tarefa tem responsável." : semFiltro ? "Nenhuma tarefa aberta no seu escopo." : "Tente remover um filtro."}</div></div>`}`;

  $$("[data-chip]").forEach((b) => (b.onclick = () => { f.chip = b.dataset.chip; renderView(); }));
  $("#f-dept").onchange = (e) => { f.dept = e.target.value; renderView(); };
  if ($("#f-pessoa")) $("#f-pessoa").onchange = (e) => { f.pessoa = e.target.value; renderView(); };
  $("#f-horiz").onchange = (e) => { f.horiz = +e.target.value; ls.set("horiz", f.horiz); renderView(); };
  $$("[data-limpa]").forEach((b) => (b.onclick = () => { const k = b.dataset.limpa; if (k === "tudo") Object.assign(f, { q: "", dept: "", pessoa: "", cliente: "", dia: "" }); else f[k] = ""; if (k === "q" || k === "tudo") $("#q").value = ""; renderView(); }));
  $$("[data-mais]").forEach((b) => (b.onclick = () => { st.limite[b.dataset.mais] = (st.limite[b.dataset.mais] || 40) + 100; renderView(); }));
  $$(".foco-c").forEach((b) => (b.onclick = () => abrir(b.dataset.id)));
  $$(".row .rb").forEach((b) => (b.onclick = () => abrir(b.closest(".row").dataset.id)));
  $$(".row .chk").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); concluirRapido(b.closest(".row").dataset.id); }));
}
function linha(t, hoje, entrada) {
  const [c, a, b] = prazoTxt(t, hoje);
  const verResp = st.escopo === "equipe" || entrada;
  return `<div class="row" data-id="${t.id}">
    <button class="chk" aria-label="Concluir ${esc(t.titulo)}" title="Concluir">${I.ok}</button>
    <div class="rb" role="button" tabindex="0"><div class="rt">${esc(t.titulo)}</div>
      <div class="rm"><span class="cl">${esc(t.entidade || "Sem cliente")}</span><span class="sep hm"></span><span class="hm">${esc(t.departamento || "—")}</span>
        ${verResp ? `<span class="sep"></span><span>${esc(curto(t.responsavel))}</span>` : ""}
        ${t.competencia ? `<span class="sep hm"></span><span class="hm">comp. ${comp(t.competencia)}</span>` : ""}
        ${t.itens_total ? `<span class="sep"></span><span>${I.lista.replace("<svg", '<svg width="13" height="13" style="vertical-align:-2px"')} ${t.itens_feitos}/${t.itens_total}</span>` : ""}
        ${t.status !== "a_fazer" && t.status !== "entrada" ? `<span class="pill ${t.status === "aguardando" ? "risco" : "neu"}">${STATUS[t.status]}${t.status === "aguardando" && t.aguardando_ate ? " até " + dm(t.aguardando_ate) : ""}</span>` : ""}
        ${t.gera_multa ? '<span class="pill multa">Multa</span>' : ""}</div></div>
    <div class="rd"><div class="due ${c}">${a}<small>${b}</small></div></div>
  </div>`;
}

// ---------------------------------------------------------------- ações
async function salvar(id, campos) {
  const { error } = await sb.from("tarefas").update(campos).eq("id", id);
  if (error) { toast("Não salvou: " + error.message); return false; }
  const t = st.base.find((x) => x.id === id);
  if (t) { Object.assign(t, campos); if (campos.status === "concluida") t.concluido_em = hojeISO(); if (campos.responsavel_id) { const u = st.usuarios.find((u) => u.id === campos.responsavel_id); t.responsavel = u?.nome; } }
  return true;
}
function concluirRapido(id) {
  const t = st.base.find((x) => x.id === id);
  if (!t) return;
  const row = $(`.row[data-id="${id}"]`);
  row?.classList.add("feita");
  const timer = setTimeout(async () => {
    st.pend.delete(id);
    if (await salvar(id, { status: "concluida" })) renderView(); else { row?.classList.remove("feita"); }
  }, 4200);
  st.pend.set(id, timer);
  toast(`Concluída: ${t.titulo}`, () => { clearTimeout(timer); st.pend.delete(id); row?.classList.remove("feita"); });
}

// ---------------------------------------------------------------- gaveta
function gaveta(html) {
  fecharGaveta(true);
  const f = document.createElement("div"); f.className = "fundo";
  const g = document.createElement("aside"); g.className = "gav"; g.setAttribute("role", "dialog"); g.setAttribute("aria-modal", "true");
  g.innerHTML = html;
  document.body.append(f, g);
  requestAnimationFrame(() => { f.classList.add("on"); g.classList.add("on"); });
  f.onclick = () => fecharGaveta();
  g.querySelector(".gx")?.addEventListener("click", () => fecharGaveta());
  document.body.style.overflow = "hidden";
  return g;
}
function fecharGaveta(rapido) {
  const f = $(".fundo"), g = $(".gav");
  document.body.style.overflow = "";
  if (!g) return;
  if (rapido) { f?.remove(); g.remove(); return; }
  f?.classList.remove("on"); g.classList.remove("on");
  setTimeout(() => { f?.remove(); g.remove(); }, 230);
}

async function abrir(id) {
  const t = st.base.find((x) => x.id === id);
  if (!t) return;
  const hoje = hojeISO();
  const [c, a, b] = prazoTxt(t, hoje);
  const passo = (rot, d) => {
    if (!d) return `<div class="passo"><span class="pt"></span><div class="pl">${rot}</div><div class="pv">—</div><div class="pr">não definida</div></div>`;
    const k = diff(d, hoje), cls = rot === "Prazo legal" ? (k < 0 ? "atr" : k <= 3 ? "risco" : "") : k < 0 ? "pas" : "";
    return `<div class="passo ${cls}"><span class="pt"></span><div class="pl">${rot}</div><div class="pv">${dm(d)}</div><div class="pr">${dsem(d)} · ${k === 0 ? "hoje" : k < 0 ? `há ${-k}d` : `em ${k}d`}</div></div>`;
  };
  const g = gaveta(`
    <div class="gh"><button class="ib gx" aria-label="Fechar">${I.x}</button>
      <div class="ey">${esc(TIPOS.find((x) => x[0] === t.tipo)?.[1] || t.tipo)}${t.competencia ? " · competência " + comp(t.competencia) : ""}</div>
      <h3>${esc(t.titulo)}</h3>
      <div class="gc">${esc(t.entidade_nome || t.entidade || "Sem cliente")}</div>
      <div class="gp"><span class="pill ${c || "ok"}">${a}${b ? " · " + b : ""}</span><span class="pill neu">${STATUS[t.status] || t.status}</span>${t.gera_multa ? '<span class="pill multa">Gera multa</span>' : ""}</div>
    </div>
    <div class="gb">
      <div class="passos">${passo("Ação", t.acao)}${passo("Meta", t.meta)}${passo("Prazo legal", t.vencimento)}</div>
      ${t.descricao ? `<div class="bloco"><h4>Descrição</h4><div style="white-space:pre-wrap;font-size:13.5px;color:var(--ink2)">${esc(t.descricao)}</div></div>` : ""}
      <div class="bloco"><h4>Checklist <span id="ck-n" style="letter-spacing:0;text-transform:none;font-weight:600"></span></h4>
        <div id="ck"><div class="sk" style="height:36px"></div></div>
        <form id="ck-add" class="campo" style="grid-template-columns:1fr auto;margin-top:8px"><input id="ck-txt" placeholder="Adicionar item e Enter" aria-label="Novo item do checklist"><button class="btn s" type="submit" style="height:40px">${I.mais}</button></form>
      </div>
      <div class="bloco"><h4>Detalhes</h4><dl class="kv">
        <dt>Responsável</dt><dd>${gestor() ? `<select id="resp" class="sel" style="max-width:100%"><option value="">Sem dono (Entrada)</option></select>` : esc(t.responsavel || "Sem dono")}</dd>
        <dt>Departamento</dt><dd>${esc(t.departamento || "—")}</dd>
        <dt>Cliente</dt><dd>${esc(t.entidade_nome || "—")}</dd>
        ${t.motivo_status ? `<dt>Motivo</dt><dd>${esc(t.motivo_status)}${t.aguardando_ate ? " · retorno " + dm(t.aguardando_ate) : ""}</dd>` : ""}
        <dt>Origem</dt><dd>${esc({ motor: "Motor de obrigações", manual: "Criada no app", gclick: "G-Click" }[t.origem] || t.origem || "—")}</dd>
      </dl></div>
      <div class="bloco"><h4>Histórico</h4><ul class="hist" id="hist"><li>Carregando…</li></ul></div>
    </div>
    <div class="gf" id="acoes">
      ${ABERTOS.includes(t.status) ? `
      <button class="btn p" data-s="concluida">${I.ok} Concluir</button>
      ${t.status !== "em_andamento" ? '<button class="btn s" data-s="em_andamento">Começar</button>' : '<button class="btn s" data-s="a_fazer">Pausar</button>'}
      <button class="btn s" data-s="aguardando">Aguardando…</button>
      <button class="btn x" data-s="dispensada">Dispensar…</button>` : `<button class="btn s full" data-s="a_fazer">Reabrir tarefa</button>`}
    </div>`);

  // responsável
  if (gestor()) {
    await listas();
    const sel = $("#resp", g);
    sel.innerHTML += st.usuarios.map((u) => `<option value="${u.id}" ${u.id === t.responsavel_id ? "selected" : ""}>${esc(u.nome)}</option>`).join("");
    sel.onchange = async () => {
      if (!sel.value) return;
      if (await salvar(t.id, { responsavel_id: sel.value, status: t.status === "entrada" ? "a_fazer" : t.status })) { toast("Atribuída a " + curto(st.usuarios.find((u) => u.id === sel.value)?.nome)); renderView(); }
    };
  }
  // checklist
  const pintaCk = (itens) => {
    const feitos = itens.filter((i) => i.feito).length;
    t.itens_total = itens.length; t.itens_feitos = feitos;
    $("#ck-n", g).textContent = itens.length ? `· ${feitos} de ${itens.length}` : "";
    $("#ck", g).innerHTML = itens.length ? `<div style="height:6px;border-radius:3px;background:var(--sup3);overflow:hidden;margin-bottom:8px"><i style="display:block;height:100%;width:${(feitos / itens.length) * 100}%;background:var(--ok-ink)"></i></div>
      <div class="lista">${itens.map((i) => `<div class="row ${i.feito ? "feita" : ""}" data-it="${i.id}" style="grid-template-columns:auto 1fr auto;padding:9px 12px">
        <button class="chk" aria-label="Marcar item">${I.ok}</button><div style="font-size:13.5px">${esc(i.texto)}</div>
        <button class="ib" style="width:30px;height:30px;border:0;background:none" data-del="${i.id}" aria-label="Remover item">${I.lixo}</button></div>`).join("")}</div>`
      : '<div style="color:var(--ink3);font-size:13px">Sem itens. Adicione os passos para não esquecer nada.</div>';
    $$("[data-it] .chk", g).forEach((b) => (b.onclick = async () => {
      const id = b.closest("[data-it]").dataset.it, it = itens.find((x) => x.id === id);
      it.feito = !it.feito; pintaCk(itens);
      const { error } = await sb.from("tarefa_itens").update({ feito: it.feito }).eq("id", id);
      if (error) { it.feito = !it.feito; pintaCk(itens); toast("Não salvou: " + error.message); }
    }));
    $$("[data-del]", g).forEach((b) => (b.onclick = async () => {
      const id = b.dataset.del, ix = itens.findIndex((x) => x.id === id), [rem] = itens.splice(ix, 1);
      pintaCk(itens);
      const { error } = await sb.from("tarefa_itens").delete().eq("id", id);
      if (error) { itens.splice(ix, 0, rem); pintaCk(itens); toast("Não removeu: " + error.message); }
    }));
  };
  let itens = [];
  sb.from("tarefa_itens").select("id,ordem,texto,feito").eq("tarefa_id", t.id).order("ordem").then(({ data }) => { itens = data || []; pintaCk(itens); });
  $("#ck-add", g).onsubmit = async (e) => {
    e.preventDefault();
    const txt = $("#ck-txt", g).value.trim(); if (!txt) return;
    $("#ck-txt", g).value = "";
    const { data, error } = await sb.from("tarefa_itens").insert({ tarefa_id: t.id, ordem: (itens.at(-1)?.ordem || 0) + 1, texto: txt }).select("id,ordem,texto,feito").single();
    if (error) return toast("Não salvou: " + error.message);
    itens.push(data); pintaCk(itens);
  };
  // histórico
  sb.from("tarefa_eventos").select("tipo,de,para,dados,criado_em").eq("tarefa_id", t.id).order("criado_em", { ascending: false }).limit(15).then(({ data }) => {
    const h = $("#hist", g); if (!h) return;
    h.innerHTML = (data || []).map((e) => {
      const q = new Date(e.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      const txt = e.tipo === "status" ? `Status: ${STATUS[e.de] || e.de || "—"} → <b>${STATUS[e.para] || e.para}</b>` : e.tipo === "criada" ? "Tarefa criada" : e.tipo === "responsavel" ? "Responsável alterado" : esc(e.tipo);
      return `<li><div>${txt}<time>${q}</time></div></li>`;
    }).join("") || "<li>Sem registros.</li>";
  });
  // ações
  $$("#acoes [data-s]", g).forEach((bt) => (bt.onclick = () => {
    const s = bt.dataset.s;
    if (s === "concluida") {
      const pend = (t.itens_total || 0) - (t.itens_feitos || 0);
      if (pend > 0 && !bt.dataset.conf) { bt.dataset.conf = "1"; bt.innerHTML = `Concluir com ${pend} ${pend === 1 ? "item pendente" : "itens pendentes"}?`; return; }
      return fecharGaveta(), concluirRapido(t.id), renderView();
    }
    if (s === "em_andamento" || s === "a_fazer") return salvar(t.id, { status: s, motivo_status: null, aguardando_ate: null }).then((ok) => ok && (toast(s === "a_fazer" ? "Tarefa reaberta" : "Em andamento"), fecharGaveta(), renderView()));
    const ac = $("#acoes", g);
    $(".motivo", ac)?.remove();
    ac.insertAdjacentHTML("afterbegin", `<div class="motivo"><div class="campo" style="margin:0"><label for="mtxt">${s === "aguardando" ? "Aguardando o quê?" : "Por que dispensar?"}</label><textarea id="mtxt" rows="2" placeholder="${s === "aguardando" ? "Ex.: extrato bancário do cliente" : "Ex.: cliente sem movimento no mês"}"></textarea></div>
      ${s === "aguardando" ? `<div class="campo" style="margin:0"><label for="mdata">Cobrar de novo em</label><input id="mdata" type="date" value="${addD(hoje, 2)}"></div>` : ""}
      <button class="btn p" id="conf">Confirmar</button></div>`);
    $("#mtxt", g).focus();
    $("#conf", g).onclick = async () => {
      const motivo = $("#mtxt", g).value.trim(), data = $("#mdata", g)?.value;
      if (!motivo) return $("#mtxt", g).focus();
      const ok = await salvar(t.id, s === "aguardando" ? { status: s, motivo_status: motivo, aguardando_ate: data } : { status: s, motivo_status: motivo });
      if (ok) { toast(s === "aguardando" ? "Marcada como aguardando" : "Dispensada"); fecharGaveta(); renderView(); }
    };
  }));
}

// ---------------------------------------------------------------- nova tarefa (modelo ou avulsa)
const passosTxt = (m) => { const n = (m.checklist || []).length; return n ? plural(n, "passo", "passos") : "sem checklist"; };
const nomeDep = (id) => st.deptos.find((d) => d.id === id)?.nome || "Sem departamento";
async function novaTarefa(depIni) {
  const g = gaveta(`
    <div class="gh"><button class="ib gx" aria-label="Fechar">${I.x}</button><div class="ey">Nova tarefa</div><h3 id="mp-h">Qual departamento?</h3>
      <div class="gc" id="mp-s">Escolha o departamento para ver só os modelos dele.</div>
      <label class="busca" style="margin:14px 0 0;flex:none;display:block">${I.busca}<input id="mp-q" type="search" placeholder="Ou busque direto: rescisão, CMDCA, alvará…" autocomplete="off"></label></div>
    <div class="gb" id="mp-l"><div class="sk" style="height:300px"></div></div>`);
  setTimeout(() => $("#mp-q", g)?.focus(), 60);
  await listas();
  let dep = depIni !== undefined ? depIni : ls.get("ultimoDep", null);
  if (dep != null && !st.modelos.some((m) => m.departamento_id === dep)) dep = null;
  const recentes = ls.get("modelosRecentes", []);
  const meusDeps = (st.eu.departamentos || []).map(String);
  const item = (m, comDep) => `<button class="mp-i" data-m="${m.id}"><div><div class="mp-n">${esc(m.nome)}</div><div class="mp-d">${comDep ? esc(nomeDep(m.departamento_id)) + " · " : ""}${passosTxt(m)}${m.dias_prazo != null ? ` · prazo ${m.dias_prazo}d` : ""}</div></div><span class="pill neu">${esc(TIPOS.find((t) => t[0] === m.tipo)?.[1] || m.tipo)}</span></button>`;
  const avulsa = `<button class="mp-i mp-av" data-m=""><div><div class="mp-n">${I.mais.replace("<svg", '<svg width="16" height="16" style="vertical-align:-3px;margin-right:6px"')}Tarefa avulsa${dep != null ? " · " + esc(nomeDep(dep)) : ""}</div><div class="mp-d">Sem modelo: você define tudo, inclusive o checklist.</div></div></button>`;
  const liga = () => {
    $$("[data-m]", g).forEach((b) => (b.onclick = () => formTarefa(st.modelos.find((m) => m.id === b.dataset.m) || null, dep)));
    $$("[data-dep]", g).forEach((b) => (b.onclick = () => { dep = b.dataset.dep === "" ? null : +b.dataset.dep; ls.set("ultimoDep", dep); $("#mp-q", g).value = ""; pinta(); $("#mp-q", g).focus(); }));
  };
  const pinta = () => {
    const q = $("#mp-q", g).value.trim().toLowerCase();
    const h = $("#mp-h", g), sub = $("#mp-s", g);
    // 1) sem departamento e sem busca: grade de departamentos
    if (dep == null && !q) {
      h.textContent = "Qual departamento?"; sub.textContent = "Escolha o departamento para ver só os modelos dele.";
      $("#mp-q", g).placeholder = "Ou busque direto: rescisão, CMDCA, alvará…";
      const cont = new Map(); st.modelos.forEach((m) => cont.set(m.departamento_id, (cont.get(m.departamento_id) || 0) + 1));
      const deps = [...cont.keys()].map((id) => ({ id, nome: nomeDep(id), n: cont.get(id), meu: meusDeps.includes(nomeDep(id)) || meusDeps.includes(String(id)) }))
        .sort((a, b) => (b.meu - a.meu) || a.nome.localeCompare(b.nome));
      const rec = recentes.map((id) => st.modelos.find((m) => m.id === id)).filter(Boolean).slice(0, 4);
      $("#mp-l", g).innerHTML = `
        <div class="dep-g">${deps.map((d) => `<button class="dep-t ${d.meu ? "meu" : ""}" data-dep="${d.id ?? ""}"><span class="dn">${esc(d.nome)}</span><span class="dc">${plural(d.n, "modelo", "modelos")}</span></button>`).join("")}</div>
        ${rec.length ? `<div class="mp-g">Usados recentemente</div><div class="lista">${rec.map((m) => item(m, true)).join("")}</div>` : ""}
        <div style="margin-top:16px">${avulsa}</div>`;
      return liga();
    }
    // 2) com departamento (e/ou busca)
    const ms = st.modelos.filter((m) => (dep == null || m.departamento_id === dep) && (!q || m.nome.toLowerCase().includes(q)));
    h.textContent = dep != null ? nomeDep(dep) : "Buscando em todos";
    sub.innerHTML = dep != null ? `${plural(st.modelos.filter((m) => m.departamento_id === dep).length, "modelo", "modelos")} · <button class="link" data-dep="">trocar departamento</button>` : `<button class="link" data-dep="">‹ voltar aos departamentos</button>`;
    $("#mp-q", g).placeholder = dep != null ? `Buscar em ${nomeDep(dep)}` : "Buscar modelo";
    const recIds = new Set(recentes);
    const rec = q ? [] : ms.filter((m) => recIds.has(m.id)).sort((a, b) => recentes.indexOf(a.id) - recentes.indexOf(b.id)).slice(0, 4);
    const resto = rec.length ? ms.filter((m) => !rec.includes(m)) : ms;
    $("#mp-l", g).innerHTML = `${avulsa}
      ${rec.length ? `<div class="mp-g">Usados recentemente</div><div class="lista">${rec.map((m) => item(m, dep == null)).join("")}</div>` : ""}
      ${resto.length ? `<div class="mp-g">${rec.length ? "Todos" : "Modelos"} <span class="ct">${resto.length}</span></div><div class="lista">${resto.map((m) => item(m, dep == null)).join("")}</div>`
        : `<div class="vazio-g">Nenhum modelo${q ? ` com “${esc(q)}”` : ""}${dep != null ? " neste departamento" : ""}. ${dep != null && q ? '<button class="link" data-dep="">Buscar em todos</button>' : "Use tarefa avulsa."}</div>`}`;
    liga();
  };
  $("#mp-q", g).oninput = pinta;
  $("#mp-q", g).onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); $("#mp-l [data-m]:not(.mp-av)", g)?.click(); } };
  pinta();
}

function formTarefa(mod, depSel = null) {
  const hoje = hojeISO();
  const ck = (mod?.checklist || []).map((i) => i.texto);
  const g = gaveta(`
    <div class="gh"><button class="ib gx" aria-label="Fechar">${I.x}</button>
      <div class="ey"><button class="link" id="nt-volta" style="font-size:11px;letter-spacing:.7px">‹ TROCAR</button> · ${mod ? "Modelo · " + esc(nomeDep(mod.departamento_id)) : "Tarefa avulsa"}</div>
      <h3>${mod ? esc(mod.nome) : "O que precisa ser feito?"}</h3>
      ${mod ? `<div class="gc">${passosTxt(mod)} prontos${mod.dias_prazo != null ? ` · prazo padrão de ${mod.dias_prazo} dias` : ""}</div>` : ""}</div>
    <form class="gb" id="nt" autocomplete="off">
      <div class="campo" style="margin-top:0"><label for="nt-cli">Cliente</label><input id="nt-cli" list="nt-cli-l" placeholder="Digite para buscar${mod ? "" : " (opcional)"}"><datalist id="nt-cli-l">${st.clientes.map((c) => `<option value="${esc(c.nome)}">${esc(c.razao_social || "")}</option>`).join("")}</datalist></div>
      <div class="campo"><label for="nt-tit">Título</label><input id="nt-tit" value="${esc(mod?.nome || "")}" placeholder="Ex.: Enviar balancete de outubro para a diretoria"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">
        <div class="campo"><label for="nt-venc">Prazo</label><input id="nt-venc" type="date" value="${mod?.dias_prazo != null ? addD(hoje, mod.dias_prazo) : ""}"></div>
        <div class="campo"><label for="nt-meta">Meta interna</label><input id="nt-meta" type="date" value="${mod?.dias_meta != null ? addD(hoje, mod.dias_meta) : ""}"></div>
        <div class="campo" ${mod ? "hidden" : ""}><label for="nt-dep">Departamento</label><select id="nt-dep"><option value="">—</option>${st.deptos.map((d) => `<option value="${d.id}" ${(mod ? mod.departamento_id : depSel) === d.id ? "selected" : ""}>${esc(d.nome)}</option>`).join("")}</select></div>
        <div class="campo" ${mod ? "hidden" : ""}><label for="nt-tipo">Tipo</label><select id="nt-tipo">${TIPOS.map(([k, n]) => `<option value="${k}" ${(mod?.tipo || "interna") === k ? "selected" : ""}>${n}</option>`).join("")}</select></div>
      </div>
      <div class="campo"><label for="nt-resp">Responsável</label><select id="nt-resp"><option value="">Automático pela carteira do cliente</option>${st.usuarios.map((u) => `<option value="${u.id}">${esc(u.nome)}</option>`).join("")}</select></div>
      <label style="display:flex;align-items:center;gap:10px;margin-top:14px;font-size:13px;font-weight:600"><input type="checkbox" id="nt-multa" style="width:18px;height:18px"> Gera multa se atrasar</label>
      <div class="campo"><label for="nt-desc">${mod ? "Observação para quem vai fazer" : "Descrição"}</label><textarea id="nt-desc" rows="2" placeholder="Contexto, links, o que o cliente pediu…"></textarea></div>
      <div class="bloco"><h4>Checklist</h4>
        ${ck.length ? `<details class="ck-mod"><summary>${plural(ck.length, "passo do modelo", "passos do modelo")} <span>ver</span></summary><ol>${ck.map((t) => `<li>${esc(t)}</li>`).join("")}</ol></details>` : ""}
        <div id="nt-itens" style="display:grid;gap:6px;margin-top:6px"></div>
        <div class="campo" style="grid-template-columns:1fr auto;margin-top:6px"><input id="nt-item" placeholder="${ck.length ? "Passo extra só desta tarefa (opcional)" : "Adicionar passo e Enter"}"><button class="btn s" type="button" id="nt-add" style="height:40px" aria-label="Adicionar passo">${I.mais}</button></div></div>
      ${!mod && gestor() ? `<label style="display:flex;align-items:center;gap:10px;margin-top:16px;font-size:13px;font-weight:600"><input type="checkbox" id="nt-salvamod" style="width:18px;height:18px"> Salvar também como modelo reutilizável</label>` : ""}
    </form>
    <div class="gf"><button class="btn s" id="nt-cancel">Cancelar</button><button class="btn p" id="nt-ok">${I.mais} Criar tarefa</button></div>`);
  setTimeout(() => $(mod ? "#nt-cli" : "#nt-tit", g)?.focus(), 60);
  $("#nt-cancel", g).onclick = () => fecharGaveta();
  $("#nt-volta", g).onclick = () => novaTarefa(depSel);
  const extras = [];
  const pinta = () => { $("#nt-itens", g).innerHTML = extras.map((t, i) => `<div class="ck-x"><span>${esc(t)}</span><button type="button" class="ib" data-rm="${i}" aria-label="Remover">${I.x}</button></div>`).join("");
    $$("[data-rm]", g).forEach((b) => (b.onclick = () => { extras.splice(+b.dataset.rm, 1); pinta(); })); };
  const add = () => { const v = $("#nt-item", g).value.trim(); if (v) { extras.push(v); $("#nt-item", g).value = ""; pinta(); } $("#nt-item", g).focus(); };
  $("#nt-add", g).onclick = add;
  $("#nt-item", g).onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); add(); } };
  $("#nt", g).onsubmit = (e) => e.preventDefault();
  $("#nt-ok", g).onclick = async () => {
    const tit = $("#nt-tit", g).value.trim();
    if (!tit) { $("#nt-tit", g).focus(); return toast("Informe o título"); }
    const nomeCli = $("#nt-cli", g).value.trim();
    const cli = nomeCli ? st.clientes.find((c) => c.nome === nomeCli || c.razao_social === nomeCli) : null;
    if (nomeCli && !cli) { $("#nt-cli", g).focus(); return toast("Escolha o cliente na lista"); }
    const bt = $("#nt-ok", g); bt.disabled = true; bt.textContent = "Criando…";
    const p = { p_titulo: tit, p_tipo: $("#nt-tipo", g).value, p_entidade: cli?.id || null, p_departamento: +$("#nt-dep", g).value || null,
      p_responsavel: $("#nt-resp", g).value || null, p_vencimento: $("#nt-venc", g).value || null, p_meta: $("#nt-meta", g).value || null,
      p_descricao: $("#nt-desc", g).value, p_gera_multa: $("#nt-multa", g).checked, p_prioridade: 2, p_modelo: mod?.id || null, p_itens: extras };
    const { data: id, error } = await sb.rpc("app_nova_tarefa", p);
    if (error) { bt.disabled = false; bt.innerHTML = `${I.mais} Criar tarefa`; return toast("Não criou: " + error.message); }
    if (mod) ls.set("modelosRecentes", [mod.id, ...ls.get("modelosRecentes", []).filter((x) => x !== mod.id)].slice(0, 8));
    if ($("#nt-salvamod", g)?.checked) {
      const r = await sb.from("modelos").insert({ nome: tit, tipo: p.p_tipo, departamento_id: p.p_departamento, checklist: extras.map((t) => ({ texto: t })),
        dias_prazo: p.p_vencimento ? diff(p.p_vencimento, hoje) : null, dias_meta: p.p_meta ? diff(p.p_meta, hoje) : null, ativo: true });
      if (r.error) toast("Tarefa criada, mas o modelo não salvou: " + r.error.message); else st.modelos = [];
    }
    fecharGaveta();
    toast("Tarefa criada");
    await carregar();
    if (id) abrir(id);
  };
}

// ---------------------------------------------------------------- modelos (layouts de tarefas e solicitações)
async function telaModelos() {
  cabecalho("Modelos", "Layouts de tarefas e solicitações com checklist pronto");
  $("#view").innerHTML = '<div class="sk" style="height:400px"></div>';
  const { data, error } = await sb.from("modelos").select("id,nome,tipo,departamento_id,checklist,dias_meta,dias_prazo,ativo,gclick_processo_id").order("nome");
  if (error) { $("#view").innerHTML = `<div class="vazio"><h3>Não carregou</h3>${esc(error.message)}</div>`; return; }
  await listas();
  st.todosModelos = data || [];
  const f = st.fm || (st.fm = { q: "", dep: "", inativos: false });
  const pinta = () => {
    const q = f.q.toLowerCase();
    const l = st.todosModelos.filter((m) => (f.inativos || m.ativo) && (!f.dep || String(m.departamento_id) === f.dep) && (!q || m.nome.toLowerCase().includes(q)));
    const deps = [...new Set(st.todosModelos.map((m) => m.departamento_id))].map((id) => [id, nomeDep(id)]).sort((a, b) => a[1].localeCompare(b[1]));
    $("#view").innerHTML = `
      <div class="filtros" style="margin-bottom:14px">
        <label class="busca" style="margin:0;flex:0 1 320px">${I.busca}<input id="fm-q" type="search" placeholder="Buscar modelo" value="${esc(f.q)}"></label>
        <select class="sel" id="fm-dep"><option value="">Todos os departamentos</option>${deps.map(([id, n]) => `<option value="${id}" ${f.dep === String(id) ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>
        <button class="chip" id="fm-in" aria-pressed="${f.inativos}">Mostrar inativos</button>
        <span class="esp"></span>
        ${gestor() ? `<button class="btn p" id="fm-novo" style="height:36px">${I.mais} Novo modelo</button>` : ""}
      </div>
      <div class="lista">${l.map((m) => `
        <button class="row mrow" data-id="${m.id}" style="grid-template-columns:1fr auto;width:100%;text-align:left">
          <div style="min-width:0"><div class="rt">${esc(m.nome)}</div>
            <div class="rm"><span class="cl">${esc(nomeDep(m.departamento_id))}</span><span class="sep"></span><span>${passosTxt(m)}</span>${m.dias_prazo != null ? `<span class="sep"></span><span>prazo ${m.dias_prazo}d</span>` : ""}${m.gclick_processo_id ? '<span class="sep hm"></span><span class="hm">veio do G-Click</span>' : ""}</div></div>
          <div class="rd"><span class="pill neu">${esc(TIPOS.find((t) => t[0] === m.tipo)?.[1] || m.tipo)}</span>${m.ativo ? "" : '<span class="pill risco">Inativo</span>'}</div>
        </button>`).join("") || '<div class="vazio-g" style="padding:22px">Nenhum modelo.</div>'}</div>
      <div style="color:var(--ink3);font-size:12.5px;margin:10px 4px">${plural(l.length, "modelo", "modelos")}</div>`;
    $("#fm-q").oninput = (e) => { f.q = e.target.value; const pos = e.target.selectionStart; pinta(); const i = $("#fm-q"); i.focus(); i.setSelectionRange(pos, pos); };
    $("#fm-dep").onchange = (e) => { f.dep = e.target.value; pinta(); };
    $("#fm-in").onclick = () => { f.inativos = !f.inativos; pinta(); };
    if ($("#fm-novo")) $("#fm-novo").onclick = () => editarModelo(null, pinta);
    $$(".mrow").forEach((b) => (b.onclick = () => editarModelo(st.todosModelos.find((m) => m.id === b.dataset.id), pinta)));
  };
  pinta();
}

function editarModelo(m, depois) {
  const pode = gestor();
  const itens = (m?.checklist || []).map((i) => i.texto);
  const g = gaveta(`
    <div class="gh"><button class="ib gx" aria-label="Fechar">${I.x}</button><div class="ey">${m ? "Modelo" : "Novo modelo"}</div><h3>${m ? esc(m.nome) : "Layout de tarefa"}</h3>
      ${pode ? "" : '<div class="gc">Só líderes e administradores editam modelos.</div>'}</div>
    <div class="gb">
      <div class="campo" style="margin-top:0"><label for="me-nome">Nome</label><input id="me-nome" value="${esc(m?.nome || "")}" ${pode ? "" : "disabled"}></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">
        <div class="campo"><label for="me-dep">Departamento</label><select id="me-dep" ${pode ? "" : "disabled"}><option value="">—</option>${st.deptos.map((d) => `<option value="${d.id}" ${m?.departamento_id === d.id ? "selected" : ""}>${esc(d.nome)}</option>`).join("")}</select></div>
        <div class="campo"><label for="me-tipo">Tipo</label><select id="me-tipo" ${pode ? "" : "disabled"}>${TIPOS.map(([k, n]) => `<option value="${k}" ${(m?.tipo || "solicitacao") === k ? "selected" : ""}>${n}</option>`).join("")}</select></div>
        <div class="campo"><label for="me-meta">Meta (dias)</label><input id="me-meta" type="number" min="0" value="${m?.dias_meta ?? ""}" ${pode ? "" : "disabled"}></div>
        <div class="campo"><label for="me-prazo">Prazo (dias)</label><input id="me-prazo" type="number" min="0" value="${m?.dias_prazo ?? ""}" ${pode ? "" : "disabled"}></div>
      </div>
      <label style="display:flex;align-items:center;gap:10px;margin-top:14px;font-size:13px;font-weight:600"><input type="checkbox" id="me-ativo" style="width:18px;height:18px" ${m?.ativo === false ? "" : "checked"} ${pode ? "" : "disabled"}> Ativo (aparece ao criar tarefa)</label>
      <div class="bloco"><h4>Checklist <span id="me-n" style="letter-spacing:0;text-transform:none;font-weight:600"></span></h4><div id="me-itens" class="lista"></div>
        ${pode ? `<div class="campo" style="grid-template-columns:1fr auto;margin-top:8px"><input id="me-item" placeholder="Adicionar passo e Enter"><button class="btn s" type="button" id="me-add" style="height:40px" aria-label="Adicionar">${I.mais}</button></div>` : ""}</div>
    </div>
    ${pode ? `<div class="gf"><button class="btn s" id="me-cancel">Cancelar</button><button class="btn p" id="me-ok">Salvar modelo</button></div>` : ""}`);
  const pinta = () => {
    $("#me-n", g).textContent = itens.length ? "· " + itens.length : "";
    $("#me-itens", g).innerHTML = itens.map((t, i) => `<div class="row" style="grid-template-columns:24px 1fr auto;padding:6px 8px 6px 12px"><span style="color:var(--ink3);font-weight:700;font-size:12px">${i + 1}</span>
      <input class="me-t" data-i="${i}" value="${esc(t)}" ${pode ? "" : "disabled"} style="border:0;background:none;padding:6px 4px;font-size:13.5px;min-width:0;outline:none">
      ${pode ? `<span style="display:flex;gap:2px"><button class="ib mini" data-up="${i}" aria-label="Subir" ${i ? "" : "disabled"}>↑</button><button class="ib mini" data-dn="${i}" aria-label="Descer" ${i < itens.length - 1 ? "" : "disabled"}>↓</button><button class="ib mini" data-rm="${i}" aria-label="Remover">${I.lixo}</button></span>` : ""}</div>`).join("") || '<div class="vazio-g" style="padding:14px">Sem passos ainda.</div>';
    $$(".me-t", g).forEach((inp) => (inp.oninput = () => (itens[+inp.dataset.i] = inp.value)));
    $$("[data-up]", g).forEach((b) => (b.onclick = () => { const i = +b.dataset.up; [itens[i - 1], itens[i]] = [itens[i], itens[i - 1]]; pinta(); }));
    $$("[data-dn]", g).forEach((b) => (b.onclick = () => { const i = +b.dataset.dn; [itens[i + 1], itens[i]] = [itens[i], itens[i + 1]]; pinta(); }));
    $$("[data-rm]", g).forEach((b) => (b.onclick = () => { itens.splice(+b.dataset.rm, 1); pinta(); }));
  };
  pinta();
  if (!pode) return;
  const add = () => { const v = $("#me-item", g).value.trim(); if (v) { itens.push(v); $("#me-item", g).value = ""; pinta(); } $("#me-item", g).focus(); };
  $("#me-add", g).onclick = add;
  $("#me-item", g).onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); add(); } };
  $("#me-cancel", g).onclick = () => fecharGaveta();
  $("#me-ok", g).onclick = async () => {
    const nome = $("#me-nome", g).value.trim();
    if (!nome) { $("#me-nome", g).focus(); return toast("Informe o nome"); }
    const num = (v) => (v === "" ? null : +v);
    const reg = { nome, tipo: $("#me-tipo", g).value, departamento_id: +$("#me-dep", g).value || null, dias_meta: num($("#me-meta", g).value), dias_prazo: num($("#me-prazo", g).value),
      ativo: $("#me-ativo", g).checked, checklist: itens.map((t) => t.trim()).filter(Boolean).map((t) => ({ texto: t })) };
    const r = m ? await sb.from("modelos").update(reg).eq("id", m.id).select().single() : await sb.from("modelos").insert(reg).select().single();
    if (r.error) return toast("Não salvou: " + r.error.message);
    if (m) Object.assign(m, r.data); else st.todosModelos.push(r.data);
    st.todosModelos.sort((a, b) => a.nome.localeCompare(b.nome));
    st.modelos = [];
    toast("Modelo salvo"); fecharGaveta(); depois();
  };
}

// ---------------------------------------------------------------- teclado
document.addEventListener("keydown", (e) => {
  const emCampo = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  if (e.key === "Escape" && $(".gav")) return fecharGaveta();
  if (emCampo || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "/") { e.preventDefault(); $("#q")?.focus(); }
  if ((e.key === "n" || e.key === "N") && podeCriar() && st.eu && !$(".gav")) { e.preventDefault(); novaTarefa(); }
  if (e.key === "Enter" && document.activeElement?.classList.contains("rb")) abrir(document.activeElement.closest(".row").dataset.id);
});

// ---------------------------------------------------------------- início
let iniciado = false;
async function iniciar() {
  if (iniciado) return;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return telaLogin();
  const { data, error } = await sb.rpc("app_quem_sou");
  if (error || !data || !data.length) { await sb.auth.signOut(); return telaLogin("Seu e-mail não está cadastrado no app. Fale com o administrador."); }
  iniciado = true;
  st.eu = data[0];
  const mm = await sb.rpc("app_meus_modulos");
  st.mods = mm.data || [];
  if (!st.escopo) st.escopo = gestor() ? "equipe" : "minhas";
  if (st.view === "entrada" && !gestor()) st.view = "inicio";
  casca(); renderView();
  await carregar();
  casca(); renderView();
  listas();
  setInterval(() => document.visibilityState === "visible" && !$(".gav") && !MODS[st.view] && carregar(true), 60000);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && !$(".gav") && carregar(true));
}
sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_IN" && !st.eu) iniciar(); });
// iniciar() e o service worker são chamados no fim de modulos.js, depois que os módulos existem.
