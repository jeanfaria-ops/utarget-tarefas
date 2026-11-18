// Utarget Tarefas — tela "Hoje" (v0.1, 18/11/2026). Dados e regras de acesso no Supabase utarget-dados.
const SUPABASE_URL = "https://okgxketgsyggzpvnapup.supabase.co";
const SUPABASE_KEY = "sb_publishable_fwAjsYH7ZOV177xeq0O86g_INBxCAY9"; // chave pública; o acesso é controlado pelo banco (RLS)
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: "pkce", persistSession: true, detectSessionInUrl: true } });

const app = document.getElementById("app");
const st = { eu: null, aba: "minhas", dias: 7, itens: [], usuarios: [], carregando: false };
const STATUS = { entrada: "Entrada", a_fazer: "A fazer", em_andamento: "Em andamento", aguardando: "Aguardando", em_aprovacao: "Em aprovação", retificando: "Retificando" };

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hojeISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const dm = (iso) => (iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) : "—");
const comp = (iso) => (iso ? iso.slice(5, 7) + "/" + iso.slice(0, 4) : "—");
function toast(t) { const d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }

// ---------------------------------------------------------------- login
function telaLogin(msg = "") {
  app.innerHTML = `
  <div class="login"><div class="caixa">
    <h1>Utarget Tarefas</h1>
    <p>Entre com a sua conta da Utarget.</p>
    <button class="btn prim" id="ms">Entrar com Microsoft 365</button>
    <div class="ou">Externo (sem conta @utarget.com.br)</div>
    <input id="email" type="email" placeholder="seu e-mail" autocomplete="email">
    <button class="btn sec" id="link">Receber link de acesso por e-mail</button>
    <div class="msg" id="msg">${esc(msg)}</div>
  </div></div>`;
  const volta = location.origin + location.pathname;
  document.getElementById("ms").onclick = () =>
    sb.auth.signInWithOAuth({ provider: "azure", options: { scopes: "email", redirectTo: volta } });
  document.getElementById("link").onclick = async () => {
    const email = document.getElementById("email").value.trim();
    if (!email) return;
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: volta, shouldCreateUser: true } });
    document.getElementById("msg").textContent = error ? "Não foi possível enviar: " + error.message : "Link enviado. Abra o e-mail neste mesmo aparelho.";
  };
}

// ---------------------------------------------------------------- dados
async function carregar() {
  st.carregando = true;
  const { data, error } = await sb.rpc("app_fila", { p_escopo: st.aba, p_dias: st.dias });
  st.carregando = false;
  if (error) { toast("Erro ao carregar: " + error.message); st.itens = []; } else st.itens = data || [];
  render();
}

function grupos(itens) {
  const hoje = hojeISO();
  const g = { atrasadas: [], hoje: [], semana: [], sem_data: [] };
  for (const t of itens) {
    if (!t.vencimento) g.sem_data.push(t);
    else if (t.vencimento < hoje) g.atrasadas.push(t);
    else if (t.vencimento === hoje || (t.meta && t.meta <= hoje)) g.hoje.push(t);
    else g.semana.push(t);
  }
  return g;
}

// ---------------------------------------------------------------- tela principal
function render() {
  const eu = st.eu;
  const gestor = ["admin", "lider"].includes(eu.papel);
  const abas = [["minhas", "Minhas"]].concat(gestor ? [["equipe", "Equipe"], ["entrada", "Entrada"]] : []);
  const g = grupos(st.itens);
  const multa = st.itens.filter((t) => t.gera_multa).length;
  const verResp = st.aba !== "minhas";

  const card = (t, cls) => `
    <button class="card ${cls}" data-id="${t.id}">
      <div class="l1"><div class="tit">${esc(t.titulo)}</div>
        <div class="data ${cls === "atrasada" ? "atrasada" : ""}">${t.vencimento ? dm(t.vencimento) : ""}${cls === "atrasada" ? ` · ${-t.dias_para_vencer}d` : ""}</div></div>
      <div class="l2">
        <span>${esc(t.entidade || "Sem cliente")}</span><span>·</span><span>${esc(t.departamento || "")}</span>
        ${t.gera_multa ? '<span class="tag multa">Multa</span>' : ""}
        ${t.status !== "a_fazer" ? `<span class="tag ${t.status === "aguardando" ? "aguard" : "status"}">${STATUS[t.status] || t.status}</span>` : ""}
        ${verResp ? `<span>· ${esc(t.responsavel || "Sem dono")}</span>` : ""}
      </div>
    </button>`;
  const secao = (titulo, lista, cls) => (lista.length ? `<h2>${titulo} (${lista.length})</h2>` + lista.map((t) => card(t, cls)).join("") : "");

  app.innerHTML = `
  <header>
    <div class="topo"><div class="marca">Utarget · Hoje<small>${esc(eu.nome)}</small></div>
      <button class="sair" id="sair">Sair</button></div>
    <nav class="abas" role="tablist">${abas.map(([k, n]) => `<button role="tab" data-aba="${k}" aria-selected="${st.aba === k}">${n}</button>`).join("")}</nav>
  </header>
  <main>
    <div class="barra">
      <select id="dias" aria-label="Janela">
        ${[[7, "Próximos 7 dias"], [15, "Próximos 15 dias"], [30, "Próximos 30 dias"]].map(([v, n]) => `<option value="${v}" ${st.dias == v ? "selected" : ""}>${n}</option>`).join("")}
      </select>
      <button id="atualizar">Atualizar</button>
    </div>
    <div class="resumo" style="margin-top:12px">
      <div class="kpi ${g.atrasadas.length ? "alerta" : ""}"><b>${g.atrasadas.length}</b><span>Atrasadas</span></div>
      <div class="kpi"><b>${g.hoje.length}</b><span>Hoje</span></div>
      <div class="kpi"><b>${g.semana.length}</b><span>Próximas</span></div>
      <div class="kpi"><b>${multa}</b><span>Com multa</span></div>
    </div>
    ${st.carregando ? '<div class="vazio">Carregando…</div>' :
      st.itens.length ? secao("Atrasadas", g.atrasadas, "atrasada") + secao("Hoje", g.hoje, "hoje") + secao("Próximas", g.semana, "") + secao("Sem data", g.sem_data, "")
      : `<div class="vazio">${st.aba === "entrada" ? "Nenhuma tarefa sem dono." : "Nada pendente nesta janela."}</div>`}
  </main>`;

  document.getElementById("sair").onclick = async () => { await sb.auth.signOut(); location.reload(); };
  document.getElementById("atualizar").onclick = carregar;
  document.getElementById("dias").onchange = (e) => { st.dias = Number(e.target.value); carregar(); };
  app.querySelectorAll("[data-aba]").forEach((b) => (b.onclick = () => { st.aba = b.dataset.aba; carregar(); }));
  app.querySelectorAll(".card").forEach((c) => (c.onclick = () => abrir(st.itens.find((t) => t.id === c.dataset.id))));
}

// ---------------------------------------------------------------- detalhe
async function abrir(t) {
  const gestor = ["admin", "lider"].includes(st.eu.papel);
  if (gestor && !st.usuarios.length) {
    const { data } = await sb.from("app_usuarios").select("id,nome,papel").eq("ativo", true).order("nome");
    st.usuarios = (data || []).filter((u) => u.papel !== "cliente");
  }
  const fundo = document.createElement("div");
  fundo.className = "fundo";
  fundo.innerHTML = `
  <div class="folha" role="dialog" aria-label="${esc(t.titulo)}">
    <h3>${esc(t.titulo)}</h3>
    <div class="cli">${esc(t.entidade_nome || t.entidade || "Sem cliente")} · ${esc(t.departamento || "")}</div>
    <div>${t.gera_multa ? '<span class="tag multa">Gera multa</span> ' : ""}<span class="tag status">${STATUS[t.status] || t.status}</span>
      ${t.competencia ? ` <span class="tag">Competência ${comp(t.competencia)}</span>` : ""}</div>
    <div class="datas">
      <div><span>Ação</span><b>${dm(t.acao)}</b></div>
      <div><span>Meta</span><b>${dm(t.meta)}</b></div>
      <div><span>Prazo legal</span><b>${dm(t.vencimento)}</b></div>
    </div>
    <div class="cli">Responsável: ${esc(t.responsavel || "sem dono")}${t.motivo_status ? " · Motivo: " + esc(t.motivo_status) : ""}${t.aguardando_ate ? " · Retorno: " + dm(t.aguardando_ate) : ""}</div>
    ${gestor ? `<div class="form"><label for="resp">Atribuir a</label>
      <select id="resp"><option value="">—</option>${st.usuarios.map((u) => `<option value="${u.id}" ${u.id === t.responsavel_id ? "selected" : ""}>${esc(u.nome)}</option>`).join("")}</select></div>` : ""}
    <div class="acoes" style="margin-top:14px">
      ${t.status !== "em_andamento" ? '<button class="btn sec" data-s="em_andamento">Começar</button>' : ""}
      <button class="btn prim" data-s="concluida">Concluir</button>
      <button class="btn sec" data-s="aguardando">Aguardando…</button>
      <button class="btn perigo" data-s="dispensada">Dispensar…</button>
    </div>
    <div class="form" id="motivo" hidden>
      <label for="mtxt">Motivo</label><textarea id="mtxt" rows="2"></textarea>
      <div id="dt" hidden><label for="mdata">Data de retorno</label><input id="mdata" type="date"></div>
      <button class="btn prim" id="confirma">Confirmar</button>
    </div>
    <button class="btn sec" id="fechar" style="margin-top:14px">Fechar</button>
  </div>`;
  document.body.appendChild(fundo);
  const fechar = () => fundo.remove();
  fundo.onclick = (e) => { if (e.target === fundo) fechar(); };
  fundo.querySelector("#fechar").onclick = fechar;

  const salvar = async (campos, msg) => {
    const { error } = await sb.from("tarefas").update(campos).eq("id", t.id);
    if (error) return toast("Não salvou: " + error.message);
    toast(msg); fechar(); carregar();
  };
  const resp = fundo.querySelector("#resp");
  if (resp) resp.onchange = () => resp.value && salvar({ responsavel_id: resp.value, status: t.status === "entrada" ? "a_fazer" : t.status }, "Tarefa atribuída");

  fundo.querySelectorAll("[data-s]").forEach((b) => (b.onclick = () => {
    const s = b.dataset.s;
    if (s === "em_andamento") return salvar({ status: s, motivo_status: null, aguardando_ate: null }, "Em andamento");
    if (s === "concluida") return salvar({ status: s }, "Concluída");
    const box = fundo.querySelector("#motivo");
    box.hidden = false;
    fundo.querySelector("#dt").hidden = s !== "aguardando";
    fundo.querySelector("#confirma").onclick = () => {
      const motivo = fundo.querySelector("#mtxt").value.trim();
      const data = fundo.querySelector("#mdata").value;
      if (!motivo) return toast("Informe o motivo");
      if (s === "aguardando" && !data) return toast("Informe a data de retorno");
      salvar(s === "aguardando" ? { status: s, motivo_status: motivo, aguardando_ate: data } : { status: s, motivo_status: motivo },
             s === "aguardando" ? "Marcada como aguardando" : "Dispensada");
    };
  }));
}

// ---------------------------------------------------------------- início
let iniciado = false;
async function iniciar() {
  if (iniciado) return;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return telaLogin();
  const { data, error } = await sb.rpc("app_quem_sou");
  if (error || !data || !data.length) {
    await sb.auth.signOut();
    return telaLogin("Seu e-mail não está cadastrado no app. Fale com o administrador.");
  }
  iniciado = true;
  st.eu = data[0];
  st.aba = ["admin", "lider"].includes(st.eu.papel) ? "equipe" : "minhas";
  render(); carregar();
  setInterval(() => document.visibilityState === "visible" && carregar(), 60000);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && carregar());
}
sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_IN") iniciar(); });
iniciar();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
