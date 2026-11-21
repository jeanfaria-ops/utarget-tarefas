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
const ROT = { atencao: "Atenção", critico: "Crítico", vencido: "Vencido", vigente: "Vigente", ok: "OK", vermelho: "Vermelho", amarelo: "Amarelo", verde: "Verde",
  reconsultar: "Reconsultar", consta: "Consta", nada_consta: "Nada consta", validade_a_confirmar: "Validade a confirmar", prazo_a_confirmar: "Prazo a confirmar",
  sem_diretoria_registrada: "Sem diretoria registrada", vence_90d: "Vence em 90 dias", vence_180d: "Vence em 180 dias", em_disputa: "Em disputa", a_confirmar: "A confirmar",
  confirmado: "Confirmado", mandato_vencido: "mandato vencido", mandato_nao_comprovado: "mandato não comprovado", mandato_em_disputa: "mandato em disputa",
  certificacao_ausente: "certificação ausente", cnae_incompativel: "CNAE incompatível", omissao_receita: "omissão na Receita", divida_ativa: "dívida ativa",
  parcelamento: "parcelamento", outro: "outro", sem_apontamento: "Sem apontamento", bloqueado: "Bloqueado", alto: "Alto", medio: "Médio", baixo: "Baixo",
  sem_encaixe: "Sem encaixe", proposta_enviada: "Proposta enviada", aprovada: "Aprovada", cliente: "Cliente", suspenso: "Suspenso", busca_organica: "Busca orgânica",
  indicacao: "Indicação", ok_sem_prazo: "OK (sem prazo)", whatsapp: "WhatsApp", site: "Site", atencao_: "Atenção" };
const rotulo = (s) => (s == null ? "—" : ROT[s] ? ROT[s].replace(/^\p{Ll}/u, (c) => c.toUpperCase()) : String(s).replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()));
const humano = (txt) => String(txt ?? "").replace(/\b[a-z]+(?:_[a-z0-9]+)+\b/g, (k) => ROT[k] || k.replace(/_/g, " ")).replace(/,(?=\S)/g, ", ");
const SEMAF = {
  atr: ["vencido", "vermelho", "consta", "critico", "em_disputa", "bloqueado", "crítico"],
  risco: ["atencao", "amarelo", "reconsultar", "vence_90d", "validade_a_confirmar", "prazo_a_confirmar", "sem_diretoria_registrada", "vence_180d", "atenção", "sem_apontamento"],
  ok: ["ok", "verde", "vigente", "ok_sem_prazo", "nada_consta"],
};
const clsSem = (s) => (SEMAF.atr.includes(s) ? "atr" : SEMAF.risco.includes(s) ? "risco" : SEMAF.ok.includes(s) ? "ok" : "neu");
const pillSem = (s, txt) => (s ? `<span class="pill ${clsSem(s)}">${esc(txt || rotulo(s))}</span>` : '<span class="pill neu">—</span>');
const temMod = (c) => (st.mods || []).some((m) => m.codigo === c);
// Linha que fecha cada tela com a ação do momento (posição serial e pico-final)
const linhaAgora = (html) => (html ? `<div class="agora"><span class="ag-r">Agora</span><span>${html}</span></div>` : "");
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


// ---------------------------------------------------------------- camada de BI: gráficos em SVG/HTML (paleta validada, tooltips)
const DEPS = ["Contábil", "DP", "BPO", "Legalização", "Fiscal"];
const DEPC = { "Contábil": "var(--s1)", "DP": "var(--s2)", "BPO": "var(--s3)", "Legalização": "var(--s4)", "Fiscal": "var(--s5)" };
const STC = { critico: "var(--c-atr)", atencao: "var(--c-risco)", ok: "var(--ok-ink)", sem_apontamento: "var(--s-neu)" };
const kbrl = (v) => { const a = Math.abs(+v || 0), sg = v < 0 ? "−" : ""; return a >= 1000 ? `${sg}R$ ${(a / 1000).toLocaleString("pt-BR", { maximumFractionDigits: a >= 10000 ? 0 : 1 })} mil` : `${sg}R$ ${a.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`; };
const legenda = (itens) => `<div class="leg2">${itens.map(([r, c, t]) => `<span>${t === "ln" ? `<i class="ln" style="border-color:${c}"></i>` : `<i style="background:${c}"></i>`}${esc(r)}</span>`).join("")}</div>`;
const tipAttr = (html) => `data-tip="${esc(html)}"`;
function ligaTips(root = document) { $$("[data-tip]", root).forEach((el) => { el.onmousemove = (e) => dica(e, el.dataset.tip); el.onmouseleave = () => dica(); }); }

// cascata: [{rot, v (positivo = soma, negativo = subtrai), cor, total:true}]
function vizCascata(passos, H = 250) {
  const W = 680, pl = 8, pr = 8, pt = 26, pb = 40, n = passos.length, bw = (W - pl - pr) / n;
  let acc = 0; const barras = passos.map((p) => { let y0, y1; if (p.total) { y0 = 0; y1 = p.v; acc = p.v; } else { y0 = acc; y1 = acc + p.v; acc = y1; } return { ...p, y0, y1 }; });
  const mx = Math.max(...barras.map((b) => Math.max(b.y0, b.y1))), mn = Math.min(0, ...barras.map((b) => Math.min(b.y0, b.y1)));
  const Y = (v) => pt + (H - pt - pb) * (1 - (v - mn) / (mx - mn || 1));
  return `<svg class="viz" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cascata de resultado">
    <line class="ax" x1="${pl}" x2="${W - pr}" y1="${Y(0)}" y2="${Y(0)}"/>
    ${barras.map((b, i) => { const x = pl + i * bw + bw * 0.16, w = bw * 0.68, ya = Y(Math.max(b.y0, b.y1)), yb = Y(Math.min(b.y0, b.y1)), h = Math.max(2, yb - ya);
      const lig = i < n - 1 ? `<line x1="${x + w}" x2="${x + bw}" y1="${Y(b.y1)}" y2="${Y(b.y1)}" stroke="var(--ink3)" stroke-width="1" stroke-dasharray="2 3"/>` : "";
      return `<g ${tipAttr(`<div class="tt">${esc(b.rot)}</div>${tipLinha(b.cor, b.total ? "Valor" : b.v < 0 ? "Custo" : "Soma", brl(Math.abs(b.v)))}${b.sub ? `<div style="font-size:11.5px;color:var(--ink3);margin-top:4px">${esc(b.sub)}</div>` : ""}`)}>
        <rect x="${x}" y="${ya}" width="${w}" height="${h}" rx="4" fill="${b.cor}"/>${lig}
        <text class="vl" x="${x + w / 2}" y="${ya - 7}" text-anchor="middle">${b.total ? kbrl(b.v) : kbrl(b.v)}</text>
        <text x="${x + w / 2}" y="${H - pb + 16}" text-anchor="middle">${esc(b.rot)}</text>
        ${b.rot2 ? `<text x="${x + w / 2}" y="${H - pb + 30}" text-anchor="middle">${esc(b.rot2)}</text>` : ""}
        <rect class="hit" x="${pl + i * bw}" y="${pt - 20}" width="${bw}" height="${H - pt - pb + 40}"/></g>`; }).join("")}
  </svg>`;
}

// dispersão log × log com linhas de referência
function vizDispersao(pts, { das = 11, alvo = 40, H = 330 } = {}) {
  const W = 680, pl = 58, pr = 14, pt = 14, pb = 40;
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const lo = Math.pow(10, Math.floor(Math.log10(Math.max(50, Math.min(...xs, ...ys) * 0.8)))), hi = Math.pow(10, Math.ceil(Math.log10(Math.max(...xs, ...ys) * 1.15)));
  const L = (v) => Math.log10(Math.max(v, lo)), X = (v) => pl + (W - pl - pr) * (L(v) - L(lo)) / (L(hi) - L(lo)), Y = (v) => pt + (H - pt - pb) * (1 - (L(v) - L(lo)) / (L(hi) - L(lo)));
  const ticks = []; for (let t = lo; t <= hi; t *= 10) ticks.push(t);
  const k1 = 1 - das / 100, k2 = k1 * (1 - alvo / 100);
  const linha = (k, cor, rot) => { const x1 = lo, x2 = hi; const y1 = x1 * k, y2 = x2 * k; return `<line class="ref" x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" stroke="${cor}"/><text x="${X(x2) - 4}" y="${Y(y2) + 14}" text-anchor="end" style="fill:${cor};font-weight:700">${rot}</text>`; };
  const rmax = Math.max(...pts.map((p) => p.r || 1));
  const ord = [...pts].sort((a, b) => (b.r || 0) - (a.r || 0));
  const rot = new Set(ord.filter((p) => p.st === "critico").map((p) => p.id).concat([...pts].sort((a, b) => b.x - a.x).slice(0, 4).map((p) => p.id)));
  return `<svg class="viz" viewBox="0 0 ${W} ${H}" role="img" aria-label="Honorário por custo de servir">
    ${ticks.map((t) => `<line class="gr" x1="${X(t)}" x2="${X(t)}" y1="${pt}" y2="${H - pb}"/><line class="gr" x1="${pl}" x2="${W - pr}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${X(t)}" y="${H - pb + 16}" text-anchor="middle">${kbrl(t)}</text><text x="${pl - 8}" y="${Y(t) + 4}" text-anchor="end">${kbrl(t)}</text>`).join("")}
    <text x="${(W + pl) / 2}" y="${H - 4}" text-anchor="middle" style="font-weight:600">Honorário mensal (escala log)</text>
    <text transform="translate(12 ${(H - pb + pt) / 2}) rotate(-90)" text-anchor="middle" style="font-weight:600">Custo de servir</text>
    ${linha(k1, "var(--c-atr)", "empate")}${linha(k2, "var(--ok-ink)", `margem ${alvo}%`)}
    ${ord.map((p) => { const r = 4 + 12 * Math.sqrt((p.r || 0) / rmax); return `<g ${tipAttr(p.tip)} data-pt="${esc(p.id)}" style="cursor:pointer"><circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${r}" fill="${STC[p.st] || "var(--s-neu)"}" fill-opacity=".78" stroke="var(--sup)" stroke-width="2"/><circle class="hit" cx="${X(p.x)}" cy="${Y(p.y)}" r="${Math.max(r, 10)}"/>${rot.has(p.id) ? `<text class="vl" x="${X(p.x) + r + 4}" y="${Y(p.y) + 4}">${esc(p.id)}</text>` : ""}</g>`; }).join("")}
  </svg>`;
}

// barras empilhadas horizontais com marcador
function vizEmpilhadas(linhas, chaves, cores, { marcador = "marcador", fmt = kbrl } = {}) {
  const mx = Math.max(1, ...linhas.map((l) => Math.max(l.total, l[marcador] || 0)));
  return `<div class="sb">${linhas.map((l) => `<div class="sb-r" ${l.attr || ""}>
      <span class="nm" title="${esc(l.rot)}">${esc(l.rot)}</span>
      <span class="tr2">${chaves.filter((k) => l.partes[k] > 0).map((k) => `<i style="width:${(100 * l.partes[k]) / mx}%;background:${cores[k]}" ${tipAttr(`<div class="tt">${esc(l.rot)} · ${esc(k)}</div>${tipLinha(cores[k], k, brl(l.partes[k]))}${l.extra?.[k] ? `<div style="font-size:11.5px;color:var(--ink3);margin-top:4px">${esc(l.extra[k])}</div>` : ""}`)}></i>`).join("")}
        ${l[marcador] ? `<span class="mk" style="left:${(100 * l[marcador]) / mx}%" ${tipAttr(`<div class="tt">${esc(l.rot)}</div>${tipLinha("var(--ink)", "Receita líquida", brl(l[marcador]))}`)}></span>` : ""}</span>
      <span class="vv">${l.valor}<small>${l.valor2 || ""}</small></span></div>`).join("")}</div>`;
}

// barras horizontais simples ou em duas partes
function vizBarras(linhas, { fmt = (v) => n0(v), max } = {}) {
  const mx = max || Math.max(1, ...linhas.map((l) => (l.partes || [{ v: l.v }]).reduce((a, p) => a + p.v, 0)));
  return `<div class="hb">${linhas.map((l) => { const ps = l.partes || [{ v: l.v, cor: l.cor || "var(--s1)", rot: l.rot }];
    return `<div class="hb-r" ${l.attr || ""}><span class="nm" title="${esc(l.rot)}">${esc(l.rot)}</span><span class="tr2">${ps.filter((x) => x.v > 0).map((x) => `<i style="width:${(100 * x.v) / mx}%;background:${x.cor}" ${tipAttr(`<div class="tt">${esc(l.rot)}</div>${tipLinha(x.cor, x.rot || l.rot, fmt(x.v))}`)}></i>`).join("")}</span><span class="vv">${l.valor ?? fmt(ps.reduce((a, x) => a + x.v, 0))}</span></div>`; }).join("")}</div>`;
}


// colunas empilhadas (categorias no eixo x)
function vizColunas(cols, chaves, cores, { H = 210, destaque, W = 680 } = {}) {
  const pl = 30, pr = 6, pt = 18, pb = 34, n = cols.length, bw = (W - pl - pr) / n;
  const mx = Math.max(1, ...cols.map((c) => chaves.reduce((a, k) => a + (c.partes[k] || 0), 0)));
  const Y = (v) => pt + (H - pt - pb) * (1 - v / mx), step = Math.max(1, Math.ceil(mx / 4));
  const ticks = []; for (let t = 0; t <= mx; t += step) ticks.push(t);
  return `<svg class="viz" viewBox="0 0 ${W} ${H}" role="img">
    ${ticks.map((t) => `<line class="gr" x1="${pl}" x2="${W - pr}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${pl - 6}" y="${Y(t) + 4}" text-anchor="end">${t}</text>`).join("")}
    ${cols.map((c, i) => { let acc = 0; const x = pl + i * bw + bw * 0.18, w = bw * 0.64, tot = chaves.reduce((a, k) => a + (c.partes[k] || 0), 0);
      const segs = chaves.filter((k) => c.partes[k] > 0).map((k, j, arr) => { const y1 = Y(acc + c.partes[k]), y0 = Y(acc); acc += c.partes[k]; const top = j === arr.length - 1;
        return `<rect x="${x}" y="${y1}" width="${w}" height="${Math.max(1, y0 - y1 - (j ? 2 : 0))}" ${top ? 'rx="4"' : ""} fill="${cores[k]}"/>${top ? `<rect x="${x}" y="${y1 + 4}" width="${w}" height="${Math.max(0, y0 - y1 - 4 - (j ? 2 : 0))}" fill="${cores[k]}"/>` : ""}`; }).join("");
      return `<g ${tipAttr(`<div class="tt">${esc(c.tit || c.rot)}</div>${chaves.filter((k) => c.partes[k]).map((k) => tipLinha(cores[k], k, n0(c.partes[k]))).join("")}${c.lista ? `<div style="font-size:11.5px;color:var(--ink3);margin-top:4px;max-width:260px">${esc(c.lista)}</div>` : ""}`)}>${segs}
        ${tot ? `<text class="vl" x="${x + w / 2}" y="${Y(tot) - 6}" text-anchor="middle">${tot}</text>` : ""}
        <text x="${x + w / 2}" y="${H - pb + 16}" text-anchor="middle" style="${c.rot === destaque ? "font-weight:700;fill:var(--c-atr)" : ""}">${esc(c.rot)}</text>
        <rect class="hit" x="${pl + i * bw}" y="${pt}" width="${bw}" height="${H - pt - pb}"/></g>`; }).join("")}
  </svg>`;
}

// ---------------------------------------------------------------- INÍCIO: "Precisa de você" + pulso por módulo
async function telaInicio() {
  const hoje = hojeISO();
  const h = +new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false });
  cabecalho("Início", extenso(hoje));
  const outros = (st.mods || []).filter((x) => !["tarefas", "acessos"].includes(x.codigo));
  $("#view").innerHTML = `
    <div class="ini-h"><div><h2>${h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"}, ${esc(limpa(st.eu.nome).split(" ")[0])}.</h2><p id="ini-frase">Juntando o que pede atenção nas suas áreas…</p></div>
      <button class="btn p" id="ini-go" hidden>Resolver o mais grave</button></div>
    <div class="ini">
      <section class="card ini-f"><div class="sec-h"><div><h2>Precisa de você</h2><p>Do mais grave ao menos grave. Clique para ir direto ao item.</p></div></div>
        <div id="feed"><div class="sk" style="height:260px"></div></div></section>
      <aside class="ini-p"><div class="ini-pt">Pulso</div><div id="pulso">
        ${temMod("tarefas") ? `<button class="pl" data-ir="gclick" id="pl-gclick"><span class="pn"><i class="sk" style="display:block;width:34px;height:24px"></i></span><span class="pr"><b>Atrasadas só minhas</b><small>carregando do G-Click…</small></span></button>` : ""}
        ${outros.map((x) => `<button class="pl" data-ir="${x.codigo}" id="pl-${x.codigo}"><span class="pn"><i class="sk" style="display:block;width:34px;height:24px"></i></span><span class="pr"><b>${esc(x.nome)}</b><small>carregando…</small></span></button>`).join("")}
      </div></aside>
    </div>`;
  ligaIr();
  let itens = [];
  const gSem = { feitas: null, multa: null }; // progresso da semana no G-Click (efeito Zeigarnik)
  const pulso = (cod, n, sub, cls) => { const b = $(`#pl-${cod}`); if (b) { $(".pn", b).className = "pn " + (cls ? "t-" + cls : ""); $(".pn", b).textContent = n; $("small", b).textContent = sub; b.classList.toggle("pl-zero", !cls && (n === 0 || n === "—")); } };
  const fontes = {
    gclick: async () => { const d = await rpcMod("app_mod_gclick"); const ab = d.tarefas.filter((t) => t.ab && t.minha);
      const atr = ab.filter((t) => t.venc && t.venc < hoje), v7 = ab.filter((t) => t.venc && t.venc >= hoje && diff(t.venc, hoje) <= 7);
      const vai = (chip) => () => { st.escopo = "minhas"; ls.set("escopo", "minhas"); st.fg = { ...(st.fg || { dep: "", resp: "", cli: "", cat: "todas", lim: 40 }), chip, dep: "", resp: "", cli: "" }; casca(); irPara("gclick"); };
      const multa = [...atr, ...v7].filter((t) => t.multa);
      const soMinhas = atr.filter((t) => (t.resp_ativos || []).length <= 1); // Lei de Tesler: separa o que divide com a equipe
      pulso("gclick", soMinhas.length, `${atr.length - soMinhas.length} atrasadas divididas com a equipe · ${ab.length} abertas no G-Click`, multa.length ? "atr" : soMinhas.length ? "risco" : "");
      const baseE = st.escopo === "minhas" ? d.tarefas.filter((t) => t.minha) : d.tarefas;
      const dow = new Date(hoje + "T12:00:00Z").getUTCDay(), segunda = addD(hoje, -((dow + 6) % 7));
      gSem.feitas = baseE.filter((t) => !t.ab && t.conc && t.conc >= segunda && ["Concluída", "Finalizada", "Retificada"].includes(t.st)).length;
      gSem.multa = baseE.filter((t) => t.ab && t.multa && t.venc && t.venc <= addD(hoje, 7)).length;
      multa.slice(0, 4).forEach((t) => itens.push({ sev: 0, mod: "Prazos", tit: `${t.nome} · ${t.cli || "sem cliente"}`, ctx: t.venc < hoje ? `venceu ${dm(t.venc)} · gera multa` : `vence ${dm(t.venc)} · gera multa`, acao: vai("multa") }));
      const recentes = atr.filter((t) => !t.multa && diff(hoje, t.venc) <= 30);
      if (recentes.length) itens.push({ sev: 1, mod: "Prazos", tit: `${plural(recentes.length, "tarefa sua atrasou", "tarefas suas atrasaram")} nos últimos 30 dias`, ctx: topN(recentes, (t) => t.nome, 3).map((o) => `${o.k} (${o.n})`).join(" · "), acao: vai("atr") });
      const velhas = atr.length - recentes.length - atr.filter((t) => t.multa && diff(hoje, t.venc) <= 30).length;
      if (velhas > 0) itens.push({ sev: 2, mod: "Prazos", tit: `${plural(velhas, "tarefa vencida", "tarefas vencidas")} há mais de 30 dias`, ctx: "Conferir se foram entregues e ficaram sem baixa no G-Click", acao: vai("atr") }); },
    carteira: async () => { const d = (await rpcMod("app_mod_carteira")).filter((x) => x.segmento === "osc");
      const atr = d.filter((x) => x.atr > 0), verm = d.filter((x) => x.semaforo === "vermelho");
      pulso("carteira", verm.length, `OSCs com trilha vermelha de ${d.length}`, verm.length ? "atr" : "");
      if (atr.length) itens.push({ sev: 2, mod: "Carteira", tit: `${plural(atr.length, "cliente com tarefa atrasada", "clientes com tarefa atrasada")}`, ctx: atr.slice(0, 5).map((x) => x.sigla).join(", ") + (atr.length > 5 ? "…" : ""), acao: () => { st.fc = { chip: "atr", seg: "osc" }; irPara("carteira"); } }); },
    legalizacao: async () => { const d = await rpcMod("app_mod_legalizacao");
      const cv = d.certificacoes.filter((c) => ["vencido", "critico"].includes(c.semaforo)), mv = d.mandatos.filter((c) => ["vencido", "em_disputa", "vence_90d"].includes(c.situacao));
      pulso("legalizacao", cv.length + mv.length, `${plural(cv.length, "certificação", "certificações")} · ${plural(mv.length, "mandato", "mandatos")} em alerta`, cv.length + mv.length ? "atr" : "");
      cv.forEach((c) => itens.push({ sev: c.semaforo === "vencido" ? 0 : 1, mod: "Legalização", tit: `${c.tipo} ${c.semaforo === "vencido" ? "vencida" : "vence em " + c.dias + " dias"}`, ctx: `${c.sigla} · validade ${dmy(c.validade)}`, acao: () => fichaEntidade(c.entidade_id) }));
      mv.forEach((x) => itens.push({ sev: x.situacao === "vence_90d" ? 2 : 0, mod: "Legalização", tit: `Mandato ${x.situacao === "vence_90d" ? "vence em até 90 dias" : x.situacao === "em_disputa" ? "em disputa" : "vencido"}`, ctx: `${x.sigla}${x.fim ? " · fim " + dmy(x.fim) : ""}`, acao: () => fichaEntidade(x.entidade_id) })); },
    captacao: async () => { const d = await rpcMod("app_mod_captacao");
      const ad = d.janelas.map((j) => ({ ...j, bons: j.oscs.filter((o) => ["alto", "medio"].includes(o.encaixe)) })).filter((j) => j.bons.length);
      const q = ad.filter((j) => j.dias_para_fechar != null && j.dias_para_fechar <= 15);
      pulso("captacao", q.length, `editais com OSC aderente fecham em 15 dias`, q.length ? "risco" : "");
      q.forEach((j) => itens.push({ sev: j.dias_para_fechar <= 7 ? 1 : 2, mod: "Captação", tit: j.titulo.replace(/\s*—\s*objeto a confirmar/, ""), ctx: `fecha ${dm(j.fecha)} (${j.dias_para_fechar}d) · ${j.bons.slice(0, 4).map((o) => o.sigla).join(", ")}${j.bons.length > 4 ? " +" + (j.bons.length - 4) : ""}`, acao: () => irPara("captacao") })); },
    comercial: async () => { const d = await rpcMod("app_mod_comercial"); const ab = d.deals.filter((x) => !x.contrato_em && !x.perdido_em);
      const parados = ab.filter((x) => x.ultimo_evento && diff(hoje, x.ultimo_evento) > 14);
      pulso("comercial", ab.length, `negócios em aberto · ${parados.length} sem movimento há 14 dias`, "");
      if (parados.length) itens.push({ sev: 2, mod: "Comercial", tit: `${plural(parados.length, "proposta parada", "propostas paradas")} há mais de 14 dias`, ctx: parados.slice(0, 5).map((x) => x.deal).join(", "), acao: () => irPara("comercial") }); },
    atendimento: async () => { const d = await rpcMod("app_mod_atendimento"); const par = d.setores.reduce((a, s) => a + s.parados_24h, 0);
      pulso("atendimento", par, `conversas paradas há mais de 24h`, par ? "risco" : "");
      d.setores.filter((s) => s.parados_24h > 0).forEach((s) => itens.push({ sev: s.parados_24h > 10 ? 1 : 2, mod: "Atendimento", tit: `${s.parados_24h} conversas paradas há mais de 24h`, ctx: nomeSetor(s.setor), acao: () => irPara("atendimento") })); },
    financeiro: async () => { const d = await rpcMod("app_mod_financeiro"); const i = d.indicadores || {};
      pulso("financeiro", i.folego_meses == null ? "—" : n1(i.folego_meses), `meses de fôlego de caixa · MRR ${brl(i.mrr)}`, i.folego_meses < 1 ? "atr" : "");
      if (i.folego_meses != null && i.folego_meses < 1) itens.push({ sev: 1, mod: "Financeiro", tit: `Caixa cobre ${n1(i.folego_meses)} mês de despesa`, ctx: `saldo ${brl(i.saldo_bancos)} · despesa média ${brl(i.despesa_media_3m)}`, acao: () => irPara("financeiro") });
      (d.inadimplencia || []).forEach((x) => itens.push({ sev: x.dias > 30 ? 1 : 2, mod: "Financeiro", tit: `${x.cliente} em atraso`, ctx: `${brl(x.em_aberto)} · ${x.dias} dias`, acao: () => irPara("financeiro") })); },
    margem: async () => { const d = await rpcMod("app_mod_margem"); const cr = (d.grupos || []).filter((x) => x.resultado != null && x.resultado < 0);
      pulso("margem", cr.length, `grupos econômicos no prejuízo`, cr.length ? "atr" : "");
      cr.forEach((x) => itens.push({ sev: 0, mod: "Margem", tit: `${x.grupo} dá prejuízo de ${brl(-x.resultado)} por mês`, ctx: `margem ${n1(x.margem_pct)}% · mais pesa: ${x.deptos?.[0]?.departamento || "—"}${x.cnpjs > 1 ? " · " + x.cnpjs + " CNPJs" : ""}`, acao: () => irPara("margem") })); },
  };
  await Promise.all((temMod("tarefas") ? [{ codigo: "gclick" }] : []).concat(outros).map((x) => (fontes[x.codigo] ? fontes[x.codigo]().catch((e) => pulso(x.codigo, "!", e.message, "atr")) : null)));
  if (st.view !== "inicio") return;
  // Lei de Miller/Hick: itens iguais viram um só (ex.: 6 mandatos vencidos), com os clientes no contexto
  const MODV = { "Legalização": "legalizacao", "Atendimento": "atendimento", "Carteira": "carteira", "Margem": "margem" };
  const grupos = new Map(); itens.forEach((it, i) => { const k = it.mod === "Atendimento" ? "u" + i : it.mod + "|" + it.tit; (grupos.get(k) || grupos.set(k, []).get(k)).push(it); });
  itens = [...grupos.values()].map((g) => g.length === 1 ? g[0] : { sev: Math.min(...g.map((x) => x.sev)), mod: g[0].mod, tit: `${g[0].tit} · ${g.length} casos`,
    ctx: [...new Set(g.map((x) => String(x.ctx || "").split(" · ")[0]))].join(", "), acao: MODV[g[0].mod] ? () => irPara(MODV[g[0].mod]) : g[0].acao });
  itens.sort((a, b) => a.sev - b.sev);
  const graves = itens.filter((i) => i.sev <= 1).length;
  $("#ini-frase").innerHTML = (gSem.multa ? `<b style="color:var(--atr-ink)">${plural(gSem.multa, "tarefa gera", "tarefas geram")} multa</b> se ficarem paradas esta semana. ` : "")
    + (itens.length ? `<b>${plural(itens.length, "ponto pede", "pontos pedem")}</b> sua atenção${graves ? `, <b>${graves}</b> ${graves === 1 ? "grave" : "graves"}` : ""}.` : "Nada pedindo atenção agora.")
    + (gSem.feitas != null ? ` <span style="color:var(--ink3)">${n0(gSem.feitas)} baixadas no G-Click desde segunda.</span>` : "");
  const go = $("#ini-go"); if (go && itens.length) { go.hidden = false; go.onclick = () => itens[0].acao(); }
  let lim = 3; // Lei de Hick: os 3 mais graves; o resto sob demanda
  const pinta = () => {
    $("#feed").innerHTML = itens.length ? `<div class="fd">${itens.slice(0, lim).map((it, k) => `<button class="fi s${it.sev}" data-k="${k}"><span class="fb"></span><span class="ft"><b>${esc(it.tit)}</b><small>${esc(it.ctx || "")}</small></span><span class="fm">${esc(it.mod)}</span>${I.seta}</button>`).join("")}</div>
      ${itens.length > lim ? `<button class="mais" id="fd-mais">Ver os outros ${itens.length - lim}</button>` : ""}` : `<div class="vazio">${I.festa}<h3>Tudo em ordem</h3><div>Nenhum ponto de atenção nas suas áreas.</div></div>`;
    $$(".fi").forEach((b) => (b.onclick = () => itens[+b.dataset.k].acao()));
    if ($("#fd-mais")) $("#fd-mais").onclick = () => { lim = itens.length; pinta(); };
  };
  pinta();
}

// ---------------------------------------------------------------- CARTEIRA
async function telaCarteira() {
  cabecalho("Carteira", st.eu.papel !== "admin" && st.eu.papel !== "lider" ? "Clientes em que você é dono ou substituto" : "Todos os clientes ativos");
  carregandoView();
  let d; try { d = await rpcMod("app_mod_carteira"); } catch (e) { return erroView(e); }
  const f = st.fc || (st.fc = { chip: "todas", seg: "osc" });
  if (!f.seg) f.seg = "osc";
  const verFin = d.some((x) => x.honorario != null);
  const peso = (x) => (x.semaforo === "vermelho" ? 4 : 0) + x.atr * 2 + x.bloqueios * 2 + (["vencido", "em_disputa"].includes(x.mandato) ? 3 : 0) + x.cert_alerta;
  const filtros = { todas: () => true, atr: (x) => x.atr > 0, bloq: (x) => x.bloqueios > 0, cert: (x) => x.cert_alerta > 0, mand: (x) => x.mandato && x.mandato !== "vigente", verm: (x) => x.semaforo === "vermelho" };
  const pinta = () => {
    const seg = d.filter((x) => (f.seg === "osc" ? x.segmento === "osc" : x.segmento !== "osc"));
    const l = seg.filter(filtros[f.chip]).filter((x) => casa(x, ["sigla", "razao_social", "municipio", "meus_deptos"])).sort((a, b) => peso(b) - peso(a) || a.sigla.localeCompare(b.sigla));
    const chip = (k, rot, c) => `<button class="chip" data-fc="${k}" aria-pressed="${f.chip === k}">${c ? `<i style="background:var(--c-${c})"></i>` : ""}${rot} <b>${seg.filter(filtros[k]).length}</b></button>`;
    const nOsc = d.filter((x) => x.segmento === "osc").length;
    $("#view").innerHTML = `
      <div class="sec-h" style="margin-bottom:12px"><div></div>${segV("cseg", [["osc", `OSCs · ${nOsc}`], ["outros", `Empresas e internos · ${d.length - nOsc}`]], f.seg)}</div>
      <div class="filtros">${chip("todas", "Todos")}${chip("verm", "Trilha vermelha", "atr")}${chip("atr", "Com tarefa atrasada", "atr")}${chip("bloq", "Com bloqueio", "risco")}${chip("mand", "Mandato com alerta", "risco")}${chip("cert", "Certificação a vencer", "risco")}</div>
      <div class="card" style="padding:4px 8px">${tabela(
        [["Cliente"], ["Situação"], ["Tarefas", "n"], ["Mandato", "hm"], ["WhatsApp 30d", "n hm"]].concat(verFin ? [["Honorário", "n hm"], ["Horas", "hm"]] : []),
        l.map((x) => `<tr data-ent="${x.id}"><td class="cl-c"><b>${esc(x.sigla)}</b><small>${esc(x.razao_social || "")}</small></td>
          <td class="si-c">${x.semaforo ? pillSem(x.semaforo) : '<span class="pill neu">Sem trilha</span>'}${x.bloqueios ? ` <span class="pill risco">${plural(x.bloqueios, "bloqueio", "bloqueios")}</span>` : ""}${x.proximo_passo ? `<small>${esc(humano(x.proximo_passo))}</small>` : ""}</td>
          <td class="n">${x.abertas}${x.atr ? ` <span class="pill atr">${x.atr} atras.</span>` : ""}</td>
          <td class="hm">${x.mandato ? pillSem(x.mandato) : '<span style="color:var(--ink3)">—</span>'}</td><td class="n hm">${x.tickets_30d || '<span style="color:var(--ink3)">0</span>'}</td>
          ${verFin ? `<td class="n hm">${brl(x.honorario)}</td><td class="hm">${x.margem_status ? pillSem(x.margem_status) : '<span style="color:var(--ink3)">—</span>'}</td>` : ""}</tr>`),
        "Nenhum cliente com esse filtro.")}</div>
      <div style="color:var(--ink3);font-size:12.5px;margin:10px 4px">${plural(l.length, "cliente", "clientes")}, os que pedem mais atenção primeiro. Clique para abrir a ficha.</div>
      ${linhaAgora((() => { const cb = seg.filter((x) => x.bloqueios > 0), cm = seg.filter((x) => ["vencido", "em_disputa"].includes(x.mandato));
        return cb.length || cm.length ? `Destravar <b>${cb.length}</b> ${cb.length === 1 ? "cliente com bloqueio" : "clientes com bloqueio"} e regularizar <b>${cm.length}</b> ${cm.length === 1 ? "mandato vencido ou em disputa" : "mandatos vencidos ou em disputa"} — começar por <b>${esc((cb[0] || cm[0]).sigla)}</b>.` : "Nenhum bloqueio aberto neste grupo de clientes."; })())}`;
    $$("[data-fc]").forEach((b) => (b.onclick = () => { f.chip = b.dataset.fc; pinta(); }));
    $$("[data-seg=cseg]").forEach((b) => (b.onclick = () => { f.seg = b.dataset.k; f.chip = "todas"; pinta(); }));
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
    bloco("Trilha de conformidade", mini(null, d.trilha.map((t) => `<tr style="cursor:default"><td class="forte">${t.ordem}. ${esc(t.etapa)}</td><td>${pillSem(t.status)}</td><td style="font-size:12.5px;color:var(--ink2)">${esc(humano(t.proximo_passo || ""))}</td></tr>`), "Trilha ainda não medida.")) +
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
function calLeg(d) {
  const hoje = new Date(hojeISO() + "T12:00:00"), cols = [{ rot: "Vencidos", partes: {}, l: [] }];
  for (let i = 0; i < 12; i++) { const m = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1); cols.push({ rot: MES[m.getMonth()] + (m.getMonth() === 0 || i === 0 ? "/" + String(m.getFullYear()).slice(2) : ""), ym: m.getFullYear() * 12 + m.getMonth(), partes: {}, l: [] }); }
  const pos = (iso) => { if (!iso) return null; const t = new Date(iso + "T12:00:00"); if (iso < hojeISO()) return 0; const ym = t.getFullYear() * 12 + t.getMonth(); return cols.findIndex((c) => c.ym === ym); };
  const add = (i, k, txt) => { if (i == null || i < 0) return; cols[i].partes[k] = (cols[i].partes[k] || 0) + 1; cols[i].l.push(txt); };
  d.certificacoes.forEach((c) => add(pos(c.validade), "Certificação", `${c.sigla} ${c.tipo}`));
  d.mandatos.forEach((m) => add(pos(m.fim), "Mandato", `${m.sigla} mandato`));
  return cols.map((c) => ({ ...c, tit: c.rot === "Vencidos" ? "Já vencidos" : c.rot, lista: c.l.slice(0, 12).join(" · ") + (c.l.length > 12 ? ` +${c.l.length - 12}` : "") }));
}

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
    <section class="card" style="margin-bottom:16px"><div class="sec-h"><div><h2>Calendário de vencimentos</h2><p>Certificações e mandatos de diretoria por mês de vencimento, nos próximos 12 meses.</p></div></div>
      ${legenda([["Certificação", "var(--s1)"], ["Mandato", "var(--s2)"]])}${vizColunas(calLeg(d), ["Certificação", "Mandato"], { "Certificação": "var(--s1)", "Mandato": "var(--s2)" }, { destaque: "Vencidos" })}</section>
    <div class="card"><div class="sec-h"><div><h2>${{ cert: "Certificações", mand: "Mandatos de diretoria", cdao: "Certidões por entidade", bloq: "Bloqueios e divergências", fila: "Fila de emissão de certidões" }[aba]}</h2><p>Ordenado pelo que vence primeiro. Clique na linha para abrir a ficha.</p></div>
      ${segV("leg", [["cert", "Certificações"], ["mand", "Mandatos"], ["cdao", "Certidões"], ["bloq", "Bloqueios"], ["fila", `Fila (${d.fila.length})`]], aba)}</div>${corpo[aba]()}</div>
    ${linhaAgora(cv.length || mv.length ? `Renovar as <b>${cv.length}</b> certificações vencidas ou críticas e regularizar os <b>${mv.length}</b> mandatos em alerta — cada caso está na aba correspondente.` : "Certificações e mandatos em dia.")}`;
  $$("[data-seg=leg]").forEach((b) => (b.onclick = () => { st.abaLeg = b.dataset.k; telaLegalizacao(); }));
  ligaIr($("#view"));
  ligaTips($("#view"));
}

// ---------------------------------------------------------------- CAPTAÇÃO
// Lei de Miller: encaixe alto aparece inteiro; encaixe médio vira uma linha por motivo, só com as siglas
function capBons(bons, chipO) {
  const alto = bons.filter((o) => o.encaixe === "alto"), med = bons.filter((o) => o.encaixe !== "alto");
  const porMot = new Map(); med.forEach((o) => { const k = humano(o.motivo || "sem motivo informado"); (porMot.get(k) || porMot.set(k, []).get(k)).push(o); });
  return (alto.length ? `<div class="cap-o">${alto.map(chipO).join("")}</div>` : "") +
    [...porMot].map(([mot, l]) => `<div class="cap-m"><span>${plural(l.length, "com encaixe médio", "com encaixe médio")} · ${esc(mot)}</span><div>${l.map((o) => `<button class="sg" data-ent="${o.entidade_id}">${esc(o.sigla)}</button>`).join("")}</div></div>`).join("");
}
async function telaCaptacao() {
  cabecalho("Captação", "Editais abertos com OSCs da carteira que se encaixam");
  carregandoView();
  let d; try { d = await rpcMod("app_mod_captacao"); } catch (e) { return erroView(e); }
  const todas = d.janelas.map((j) => ({ ...j, titulo: j.titulo.replace(/\s*—\s*objeto a confirmar/, " (objeto a confirmar)"), bons: j.oscs.filter((o) => ["alto", "medio"].includes(o.encaixe)), resto: j.oscs.filter((o) => !["alto", "medio"].includes(o.encaixe)) }))
    .filter((j) => casa(j, ["titulo"]) || j.oscs.some((o) => String(o.sigla).toLowerCase().includes(qMod())));
  const com = todas.filter((j) => j.bons.length).sort((a, b) => (a.dias_para_fechar ?? 999) - (b.dias_para_fechar ?? 999) || b.bons.length - a.bons.length);
  const sem = todas.filter((j) => !j.bons.length);
  const q15 = com.filter((x) => x.dias_para_fechar != null && x.dias_para_fechar <= 15);
  const chipO = (o) => `<button class="osc ${o.encaixe}" data-ent="${o.entidade_id}" title="${esc(humano(o.motivo || ""))}"><b>${esc(o.sigla)}</b><span>${esc(rotulo(o.encaixe))}${o.motivo ? " · " + esc(humano(o.motivo)) : ""}</span></button>`;
  const card = (x) => `<div class="card cap">
      <div class="cap-h"><a class="cap-t" href="${esc(x.url || "#")}" target="_blank" rel="noopener">${esc(x.titulo)}</a>
        <span class="pill ${x.dias_para_fechar == null ? "neu" : x.dias_para_fechar <= 7 ? "atr" : x.dias_para_fechar <= 15 ? "risco" : "ok"}">${x.fecha ? "Fecha " + dm(x.fecha) + (x.dias_para_fechar != null ? ` · ${x.dias_para_fechar} dias` : "") : "Prazo a confirmar"}</span></div>
      ${x.bons.length ? `<div class="cap-r">${plural(x.bons.length, "OSC se encaixa", "OSCs se encaixam")}</div>${capBons(x.bons, chipO)}` : ""}
      ${x.resto.length ? `<details class="cap-d"><summary>${plural(x.resto.length, "OSC sem encaixe ou bloqueada", "OSCs sem encaixe ou bloqueadas")}</summary><div class="cap-o">${x.resto.map(chipO).join("")}</div></details>` : ""}
    </div>`;
  $("#view").innerHTML = `
    <div class="kpis k4">
      ${kpiM("Editais com OSC aderente", com.length, `de ${d.janelas.length} abertos no radar`)}
      ${kpiM("Fecham em até 15 dias", q15.length, "decidir agora se concorre", q15.length ? "risco" : "")}
      ${kpiM("OSCs com encaixe alto", new Set(com.flatMap((j) => j.bons.filter((o) => o.encaixe === "alto").map((o) => o.sigla))).size, "perfil e certificações batem", "ok")}
      ${kpiM("Editais a confirmar", d.a_confirmar ?? "—", `última coleta ${quando(d.coleta)}`)}
    </div>
    <div class="cap-l">${com.map(card).join("") || '<div class="vazio"><h3>Nenhum edital com OSC aderente</h3><div>O radar não achou encaixe na carteira agora.</div></div>'}</div>
    ${sem.length ? `<details class="cap-sem"><summary>${plural(sem.length, "edital aberto sem OSC aderente", "editais abertos sem OSC aderente")}</summary><div class="cap-l">${sem.map(card).join("")}</div></details>` : ""}
    <div style="color:var(--ink3);font-size:12.5px;margin:12px 4px">O encaixe é leitura do radar. A elegibilidade só se confirma no edital ou TR oficial aberto.</div>
    ${linhaAgora(q15.length ? `Decidir com os dirigentes em quais dos <b>${q15.length}</b> editais que fecham em 15 dias as OSCs entram — elegibilidade se confirma no edital oficial.` : "Nenhum edital aderente fechando em 15 dias.")}`;
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
        <div class="sec-h" style="margin-top:18px"><div><h2>Funil por etapa</h2><p>Negócios e valor anual em cada etapa.</p></div></div>
        ${vizBarras([...porEtapa.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ rot: rotulo(k), v, cor: k === "perdido" ? "var(--s-neu)" : k === "contrato" || k === "contratado" ? "var(--ok-ink)" : "var(--s1)",
          valor: `${v} · ${kbrl(d.deals.filter((x) => (x.etapa || "—") === k).reduce((a, x) => a + (+x.valor_anual || 0), 0))}` })))}</section>
    </div>
    <div style="color:var(--ink3);font-size:12.5px;margin:4px">Lead e contato vivem no Brevo; aqui só o espelho para acompanhar. Atividades de pré-venda viram tarefa do departamento Comercial.</div>
    ${linhaAgora((() => { const p14 = abertos.filter((x) => x.ultimo_evento && diff(hojeISO(), x.ultimo_evento) > 14).sort((a, b) => (a.ultimo_evento || "").localeCompare(b.ultimo_evento || ""));
      return p14.length ? `Retomar <b>${p14.length}</b> ${p14.length === 1 ? "proposta parada" : "propostas paradas"} há mais de 14 dias — a mais antiga é <b>${esc(p14[0].deal)}</b>, sem movimento desde ${dm(p14[0].ultimo_evento)}.` : "Nenhuma proposta parada há mais de 14 dias."; })())}`;
  ligaIr($("#view"));
  ligaTips($("#view"));
}

// ---------------------------------------------------------------- ATENDIMENTO
function idadeFila(ab) {
  const b = [["< 4h", 4], ["4–24h", 24], ["1–3 dias", 72], ["3–7 dias", 168], ["7–30 dias", 720], ["> 30 dias", 1e9]].map(([rot, lim]) => ({ rot, lim, partes: { Atendimentos: 0 } }));
  ab.forEach((x) => { const h = x.ultima_msg_em ? (Date.now() - new Date(x.ultima_msg_em)) / 36e5 : 1e8; b.find((k) => h < k.lim).partes.Atendimentos++; });
  return b;
}

const nomeSetor = (s) => (s ? String(s).replace(/^(?:\d\uFE0F?\u20E3|[^\p{L}\p{N}])+/u, "").trim() || "Sem setor" : "Sem setor");
async function telaAtendimento() {
  cabecalho("Atendimento", "WhatsApp da Utarget (ZapContábil)");
  carregandoView();
  let d; try { d = await rpcMod("app_mod_atendimento"); } catch (e) { return erroView(e); }
  cabecalho("Atendimento", `WhatsApp da Utarget (ZapContábil) · espelho de ${quando(d.coletado_em)}`);
  const ab = d.setores.reduce((a, s) => a + s.abertos, 0), par = d.setores.reduce((a, s) => a + s.parados_24h, 0), t30 = d.setores.reduce((a, s) => a + s.tickets_30d, 0);
  const agora = Date.now(), horas = (ts) => (ts ? Math.round((agora - new Date(ts)) / 36e5) : null);
  const maisParado = d.abertos.filter((x) => x.ultima_msg_em).sort((a, b) => new Date(a.ultima_msg_em) - new Date(b.ultima_msg_em))[0];
  const hMax = maisParado ? horas(maisParado.ultima_msg_em) : null;
  const piorS = d.setores.filter((s) => s.parados_24h > 0).sort((a, b) => b.parados_24h - a.parados_24h)[0];
  const l = d.abertos.filter((x) => casa(x, ["setor", "atendente", "sigla"]));
  $("#view").innerHTML = `
    <div class="kpis k4">
      ${kpiM("Abertos agora", ab, "abertos ou pendentes")}
      ${kpiM("Parados há mais de 24h", par, "última mensagem há mais de um dia", par ? "atr" : "ok")}
      ${kpiM("Atendimentos em 30 dias", t30, "todos os setores")}
      ${kpiM("Parado há mais tempo", hMax == null ? "—" : hMax >= 48 ? Math.round(hMax / 24) + "<small>d</small>" : hMax + "<small>h</small>", maisParado ? `#${esc(String(maisParado.ticket_id))} · ${esc(nomeSetor(maisParado.setor))}` : "fila vazia", hMax > 72 ? "atr" : "")}
    </div>
    <div class="bi-r c2b">
      <section class="card"><div class="sec-h"><div><h2>Fila por setor</h2><p>Abertos agora; em vermelho, os parados há mais de 24h.</p></div></div>
        ${legenda([["Parado há mais de 24h", "var(--c-atr)"], ["Movimentado nas últimas 24h", "var(--s1)"]])}
        ${vizBarras(d.setores.filter((x) => x.abertos).map((x) => ({ rot: nomeSetor(x.setor), valor: x.abertos, partes: [{ v: x.parados_24h, cor: "var(--c-atr)", rot: "Parados > 24h" }, { v: x.abertos - x.parados_24h, cor: "var(--s1)", rot: "Recentes" }] })))}</section>
      <section class="card"><div class="sec-h"><div><h2>Há quanto tempo a conversa está parada</h2><p>Atendimentos abertos pela idade da última mensagem.</p></div></div>
        ${vizColunas(idadeFila(d.abertos), ["Atendimentos"], { "Atendimentos": "var(--s1)" }, { H: 200 })}</section>
    </div>
    <div class="grade">
      <section class="card"><div class="sec-h"><div><h2>Abertos, do mais parado ao mais recente</h2><p>Responder e transferir continua no ZapContábil.</p></div></div>${tabela([["Ticket"], ["Setor"], ["Cliente"], ["Atendente", "hm"], ["Parado", "n"]],
        l.map((x) => { const h = horas(x.ultima_msg_em); return `<tr ${x.entidade_id ? `data-ent="${x.entidade_id}"` : 'style="cursor:default"'}><td class="forte">#${esc(x.ticket_id)}</td><td style="font-size:12.5px">${esc(nomeSetor(x.setor))}</td><td>${esc(x.sigla || "—")}</td><td class="hm">${esc(curto(x.atendente || "—"))}</td><td class="n">${h == null ? "—" : `<span class="pill ${h > 24 ? "atr" : h > 4 ? "risco" : "ok"}">${h < 48 ? h + "h" : Math.round(h / 24) + "d"}</span>`}</td></tr>`; }), "Nenhum atendimento aberto.")}</section>
      <div style="display:grid;gap:16px;align-content:start">
        <section class="card"><div class="sec-h"><div><h2>Setores</h2><p>Mediana da 1ª resposta nos últimos 30 dias.</p></div></div>${tabela([["Setor"], ["Abertos", "n"], ["> 24h", "n"], ["1ª resp.", "n"]],
          d.setores.map((s) => `<tr style="cursor:default"><td style="font-size:12.5px" class="forte">${esc(nomeSetor(s.setor))}</td><td class="n">${s.abertos}</td><td class="n">${s.parados_24h ? `<span class="pill atr">${s.parados_24h}</span>` : "0"}</td><td class="n">${s.mediana_resp_min == null ? "—" : n0(s.mediana_resp_min) + " min"}</td></tr>`))}</section>
        <section class="card"><div class="sec-h"><div><h2>Clientes que mais chamaram</h2><p>Últimos 30 dias.</p></div></div>${tabela([["Cliente"], ["Atend.", "n"], ["Msgs do cliente", "n"]],
          d.clientes.map((c) => `<tr data-ent="${c.entidade_id}"><td class="forte">${esc(c.sigla)}</td><td class="n">${c.tickets}</td><td class="n">${c.msgs_cliente ?? "—"}</td></tr>`))}</section>
      </div>
    </div>
    ${linhaAgora(par ? `Zerar as <b>${par}</b> conversas paradas há mais de 24h — começar por <b>${esc(nomeSetor(piorS.setor))}</b> (${piorS.parados_24h}). Responder e transferir é no ZapContábil.` : "Nenhuma conversa parada há mais de 24h.")}`;
  ligaIr($("#view"));
  ligaTips($("#view"));
}

// ---------------------------------------------------------------- FINANCEIRO
async function telaFinanceiro() {
  cabecalho("Financeiro", "Caixa e recebimentos da Utarget");
  carregandoView();
  let d, cob; try { [d, cob] = await Promise.all([rpcMod("app_mod_financeiro"), rpcMod("app_fin_cobertura").catch(() => ({}))]); } catch (e) { return erroView(e); }
  const i = d.indicadores || {}; const hoje = hojeISO();
  const semInad = cob && cob.receber_por_cliente === false; // fluxo de caixa não tem contas a receber por cliente: R$ 0 seria falso
  const mes = (d.mensal || []).find((x) => String(x.mes).slice(0, 7) === hoje.slice(0, 7)) || {};
  const ms0 = (d.mensal || []).filter((x) => String(x.mes).slice(0, 7) <= hoje.slice(0, 7));
  const ini = ms0.findIndex((x) => +x.faturado || +x.recebido || +x.pago); // estética-usabilidade: sem meses vazios antes do primeiro dado
  const ms = ini < 0 ? ms0 : ms0.slice(ini);
  const top2 = (i.concentracao || []).slice(0, 2), pct2 = top2.reduce((s, c) => s + (+c.pct || 0), 0);
  const max = Math.max(1, ...ms.map((x) => Math.max(+x.faturado || 0, +x.recebido || 0, +x.pago || 0)));
  $("#view").innerHTML = `
    <div class="kpis">
      ${kpiM("Recorrente (MRR)", brl(i.mrr), `${i.contratos_ativos ?? "—"} contratos · ticket ${brl(i.ticket_medio)}`)}
      ${kpiM("Recebido no mês", brl(i.recebido_mes), `pago no mês ${brl(i.pago_mes)}`, "ok")}
      ${kpiM("A receber no mês", brl(mes.a_receber), `faturado ${brl(mes.faturado)}`, mes.a_receber > 0 ? "risco" : "")}
      ${semInad ? kpiM("Inadimplência", "—", "sem contas a receber por cliente na base", "") : kpiM("Inadimplência", brl(i.inadimplencia), `${i.clientes_inadimplentes ?? 0} clientes`, i.inadimplencia > 0 ? "atr" : "ok")}
      ${kpiM("Saldo em bancos", brl(i.saldo_bancos), `fôlego ${n1(i.folego_meses)} mês · em ${dmy(i.saldo_em)}`, i.folego_meses < 1 ? "atr" : "")}
    </div>
    <div class="grade">
      <section class="card"><div class="sec-h"><div><h2>Mês a mês</h2><p>Faturado, recebido e pago${ms.length < ms0.length ? ` desde ${comp(ms[0].mes)}, primeiro mês com dado importado` : " nos últimos 12 meses"}.</p></div></div>
        <div class="leg"><span><i style="background:var(--c-ok)"></i>Faturado</span><span><i style="background:var(--ok-ink)"></i>Recebido</span><span><i style="background:var(--c-risco)"></i>Pago</span></div>
        <div class="barras">${ms.map((x) => `<div class="bc" data-tipm="${esc(comp(x.mes))}|${brl(x.faturado)}|${brl(x.recebido)}|${brl(x.pago)}"><div class="bb">
          <i style="height:${(+x.faturado / max) * 100}%;background:var(--c-ok)"></i><i style="height:${(+x.recebido / max) * 100}%;background:var(--ok-ink)"></i><i style="height:${(+x.pago / max) * 100}%;background:var(--c-risco)"></i></div><span>${MES[+String(x.mes).slice(5, 7) - 1]}</span></div>`).join("")}</div></section>
      <div style="display:grid;gap:16px;align-content:start">
        <section class="card"><div class="sec-h"><div><h2>Concentração</h2><p>${pct2 >= 50 ? `<b style="color:var(--atr-ink)">${top2.map((c) => esc(c.cliente)).join(" e ")} somam ${n1(pct2)}% do recorrente.</b> Perder um deles muda o caixa.` : "Maiores contratos no recorrente."}</p></div></div>
          ${(i.concentracao || []).map((c) => `<div class="pct" style="display:grid;grid-template-columns:110px 1fr 70px;gap:10px;align-items:center;margin:6px 0"><span class="forte" style="font-weight:700">${esc(c.cliente)}</span><span class="tr"><i style="width:${c.pct}%"></i></span><span class="num" style="text-align:right">${n1(c.pct)}%</span></div>`).join("")}</section>
        <section class="card"><div class="sec-h"><div><h2>Inadimplência</h2><p>Parcelas vencidas em aberto.</p></div></div>${tabela([["Cliente"], ["Parcelas", "n"], ["Em aberto", "n"], ["Dias", "n"]],
          d.inadimplencia.map((x) => `<tr ${x.entidade_id ? `data-ent="${x.entidade_id}"` : 'style="cursor:default"'}><td class="forte">${esc(x.cliente)}</td><td class="n">${x.parcelas}</td><td class="n">${brl(x.em_aberto)}</td><td class="n"><span class="pill ${x.dias > 30 ? "atr" : "risco"}">${x.dias}</span></td></tr>`), semInad ? "Ainda não medida: a planilha de fluxo de caixa registra as entradas por banco, não por cliente. Entra com a carga do Conta Azul (contas a receber por cliente)." : "Nenhuma parcela vencida em aberto.")}</section>
      </div>
    </div>
    <div style="color:var(--ink3);font-size:12.5px;margin:4px">Última importação: ${quando(i.ultima_importacao)}.</div>
    ${linhaAgora([i.folego_meses != null && i.folego_meses < 1 ? `O caixa cobre <b>${n1(i.folego_meses)}</b> mês de despesa: confirmar os recebimentos do mês antes de qualquer compra.` : "", pct2 >= 50 ? `<b>${esc(top2.map((c) => c.cliente).join(" e "))}</b> somam ${n1(pct2)}% do recorrente: fechar novos contratos dilui o risco.` : "", semInad ? "A inadimplência passa a ser medida quando o contas a receber do Conta Azul entrar na fase 1." : ""].filter(Boolean).join(" ") || "Caixa e recebimentos em ordem.")}`;
  $$(".bc").forEach((b) => { const [m, f, r, p] = b.dataset.tipm.split("|"); b.onmousemove = (e) => dica(e, `<div class="tt">${m}</div>${tipLinha("var(--c-ok)", "Faturado", f)}${tipLinha("var(--ok-ink)", "Recebido", r)}${tipLinha("var(--c-risco)", "Pago", p)}`); b.onmouseleave = () => dica(); });
  ligaIr($("#view"));
}

// ---------------------------------------------------------------- MARGEM (custo-hora por departamento × grupo econômico)
async function telaMargem() {
  cabecalho("Margem", "Resultado por grupo econômico com custo-hora de cada departamento");
  carregandoView();
  let d, cm; try { [d, cm] = await Promise.all([rpcMod("app_mod_margem"), rpcMod("app_mod_margem_comum").catch(() => null)]); } catch (e) { return erroView(e); }
  const r = d.resumo || {}; const pc = d.parametros_custo || {};
  // custo comum aberto por natureza (estrutura, gestão, horas internas); aquisição fica fora da margem
  const cItens = (cm?.itens || []).filter((i) => i.natureza === "comum"), aItens = (cm?.itens || []).filter((i) => i.natureza === "aquisicao");
  const somaG = (g) => cItens.filter((i) => i.grupo === g).reduce((a, i) => a + +i.valor, 0);
  const COMUM_G = [["Estrutura", "Estrutura", "Sistemas, financeiro interno, ocupação, copa, tarifas e CRC"], ["Mentoria e cursos", "Formação", "Mentoria de R$ 35.690 (out/2026) em 12 meses e cursos recorrentes"], ["Gestão e coordenação", "Gestão", "Parte do tempo de Cris, Jean e Lucas dedicada a gerir o escritório"], ["Horas internas da equipe", "Horas", "Horas que a equipe lançou em atividades internas, sem cliente"]];
  const aqTot = aItens.reduce((a, i) => a + +i.valor, 0);
  const abertos = st.margemAbertos || (st.margemAbertos = new Set());
  const modo = st.margemModo || (st.margemModo = "grupo");
  let cnpjs = [];
  if (modo === "cnpj") { try { cnpjs = await rpcMod("app_mod_margem_cnpj"); } catch (e) { return erroView(e); } }
  const gs = d.grupos.filter((x) => casa(x, ["grupo", "status"]) || (x.unidades || []).some((u) => casa(u, ["sigla", "cliente"])));
  const comHoras = d.grupos.filter((x) => x.resultado != null);
  const res = comHoras.reduce((a, x) => a + +x.resultado, 0), neg = comHoras.filter((x) => x.resultado < 0);
  const dep0 = d.departamentos[0] || {};
  const custoTot = d.departamentos.reduce((a, k) => a + +k.custo_direto, 0) + +(dep0.custo_comum_total || 0);
  const recTot = d.grupos.reduce((a, x) => a + +(x.receita_liquida || 0), 0);
  const semDono = custoTot - comHoras.reduce((a, x) => a + +x.custo_total, 0);
  const mg = (v) => (v == null ? "—" : `<span class="${v < 0 ? "t-atr" : v < 40 ? "t-risco" : "t-ok"}">${n1(v)}%</span>`);
  const linha = (x) => {
    const ab = abertos.has(x.grupo), top = (x.deptos || [])[0];
    return `<tr class="gr" data-g="${esc(x.grupo)}">
      <td class="cl-c"><b><span class="tg">${ab ? "▾" : "▸"}</span>${esc(x.grupo)}</b><small>${x.cnpjs > 1 ? plural(x.cnpjs, "CNPJ", "CNPJs") + " no grupo" : esc(x.unidades?.[0]?.cliente || "")}</small></td>
      <td class="n">${brl(x.honorario)}</td><td class="n">${x.custo_total == null ? "—" : brl(x.custo_total)}</td>
      <td class="n">${x.resultado == null ? "—" : `<span class="${x.resultado < 0 ? "t-atr" : ""}">${brl(x.resultado)}</span>`}</td><td class="n">${mg(x.margem_pct)}</td>
      <td class="hm">${top ? `<b style="font-size:12.5px">${esc(top.departamento)}</b> <small style="color:var(--ink3)">${n1(top.horas)}h · ${n0(top.pct)}% do custo</small>` : '<span style="color:var(--ink3)">sem apontamento</span>'}</td>
      <td><div class="mg-acts"><button class="st-b" data-mgg="${esc(x.grupo)}" title="Abrir análise de rentabilidade">${pillSem(x.status)}</button>${botaoRel("g", x.grupo)}</div></td></tr>
      ${ab ? `<tr class="un"><td colspan="7"><div class="mg-ab">
        <div><div class="mg-t">Custo por departamento</div>${(x.deptos || []).map((k) => `<div class="mg-l"><span>${esc(k.departamento)}</span><span class="tr"><i style="width:${k.pct}%"></i></span><b>${brl(k.custo)}</b><small>${n1(k.horas)}h</small></div>`).join("") || '<div style="color:var(--ink3);font-size:12.5px">Sem horas apontadas na competência.</div>'}</div>
        <div><div class="mg-t">CNPJs do grupo</div>${(x.unidades || []).map((u) => `<button class="mg-u" ${u.entidade_id ? `data-ent="${u.entidade_id}"` : ""}><span>${esc(u.sigla || "—")}</span><small>${esc(u.cliente || "")}</small><b>${brl(u.honorario)}</b></button>`).join("")}</div>
      </div></td></tr>` : ""}`;
  };
  const resOp = recTot - custoTot;
  const depOrd = DEPS.map((k) => d.departamentos.find((x) => x.departamento === k)).filter(Boolean);
  const cascata = [{ rot: "Receita", rot2: "líquida", v: recTot, total: true, cor: "var(--c-ok)", sub: "Honorários menos DAS" }]
    .concat(depOrd.map((k) => ({ rot: k.departamento, rot2: `${n0(k.horas_apontadas)}h`, v: -k.custo_direto, cor: DEPC[k.departamento], sub: `Custo direto de quem produz · R$ ${n1(k.custo_direto_hora)}/h` })))
    .concat(cItens.length ? COMUM_G.map(([g, rot, sub]) => ({ rot, rot2: g === "Horas internas da equipe" ? "internas" : "", v: -somaG(g), cor: "var(--s-neu)", sub }))
      : [{ rot: "Comum", rot2: "estrutura", v: -dep0.custo_comum_total, cor: "var(--s-neu)", sub: "Sistemas, ocupação, gestão, financeiro, encargos e mentoria" }])
    .concat([
             { rot: "Resultado", rot2: "operação", v: resOp, total: true, cor: resOp < 0 ? "var(--c-atr)" : "var(--ok-ink)" }]);
  const pts = comHoras.map((x) => ({ id: x.grupo, x: +x.honorario, y: +x.custo_total, r: +x.horas || 1, st: x.status,
    tip: `<div class="tt">${esc(x.grupo)}${x.cnpjs > 1 ? ` · ${x.cnpjs} CNPJs` : ""}</div>${tipLinha("var(--c-ok)", "Honorário", brl(x.honorario))}${tipLinha(STC[x.status], "Custo de servir", brl(x.custo_total))}${tipLinha("var(--ink)", "Resultado", brl(x.resultado))}<div style="font-size:11.5px;color:var(--ink3);margin-top:4px">${n1(x.horas)}h · margem ${n1(x.margem_pct)}% · clique para a análise</div>` }));
  const topG = [...comHoras].sort((a, b) => b.custo_total - a.custo_total).slice(0, 10).map((x) => {
    const partes = {}; const extra = {}; (x.deptos || []).forEach((k) => { partes[k.departamento] = +k.custo; extra[k.departamento] = `${n1(k.horas)}h · ${n0(k.pct)}% do custo do grupo`; });
    return { rot: x.grupo, partes, extra, total: +x.custo_total, marcador: +x.receita_liquida, valor: `<span class="${x.resultado < 0 ? "t-atr" : ""}">${kbrl(x.resultado)}</span>`, valor2: `margem ${n0(x.margem_pct)}%`, attr: `data-mgg="${esc(x.grupo)}"` };
  });
  $("#view").innerHTML = `
    <section class="card" style="margin-bottom:16px"><div class="hero">
      <div class="hero-n"><span class="rot">Resultado da operação · ${comp(r.competencia_horas)}</span>
        <span class="num ${resOp < 0 ? "t-atr" : ""}">${kbrl(resOp)}</span>
        <span class="sub">Margem de <b>${n1((100 * resOp) / (recTot || 1))}%</b> sobre a receita líquida de <b>${brl(recTot)}</b>.<br>
          <b>${neg.length}</b> ${neg.length === 1 ? "grupo dá" : "grupos dão"} prejuízo${neg.length ? ` (${neg.slice(0, 3).map((x) => esc(x.grupo)).join(", ")})` : ""}.<br>
          <b>${brl(semDono)}</b> do custo está em horas de clientes sem contrato ativo no banco.</span></div>
      <div>${vizCascata(cascata)}</div></div></section>
    ${cItens.length ? `<section class="card" style="margin-bottom:16px"><div class="sec-h"><div><h2>Do que é feito o custo comum</h2><p>${brl(cItens.reduce((a, i) => a + +i.valor, 0))} por mês divididos pelas horas de cliente. Aquisição de clientes (comercial e social mídia) não entra: são <b>${brl(aqTot)}</b> por mês fora da margem.</p></div></div>
        <div class="bi-r c4">${COMUM_G.map(([g, rot]) => `<div><div class="mg-t" style="margin-bottom:6px">${esc(g)} · <b>${brl(somaG(g))}</b></div>${vizBarras(cItens.filter((i) => i.grupo === g).map((i) => ({ rot: i.item.replace(/^(Gestão|Horas internas) · /, ""), valor: brl(i.valor), partes: [{ v: +i.valor, cor: "var(--s-neu)", rot: i.item }] })), { max: Math.max(...cItens.map((i) => +i.valor)) })}</div>`).join("")}</div>
        <div style="margin-top:12px;font-size:12.5px;color:var(--ink2)"><b>Fora da margem (aquisição):</b> ${aItens.map((i) => `${esc(i.item)} ${brl(i.valor)}`).join(" · ")}</div></section>` : ""}
    <div class="bi-r c2">
      <section class="card"><div class="sec-h"><div><h2>Honorário × custo de servir</h2><p>Cada bolha é um grupo econômico; o tamanho é o número de horas. Acima da linha vermelha, o grupo dá prejuízo.</p></div></div>
        ${legenda([["Prejuízo", STC.critico], ["Abaixo de 40%", STC.atencao], ["Margem saudável", STC.ok], ["Empate", "var(--c-atr)", "ln"], ["Margem-alvo 40%", "var(--ok-ink)", "ln"]])}
        ${vizDispersao(pts, { das: 11, alvo: 40 })}</section>
      <section class="card"><div class="sec-h"><div><h2>Custo-hora por departamento</h2><p>Custo direto de quem produz + parcela do custo comum por hora.</p></div></div>
        ${legenda([["Direto do departamento", "var(--s1)"], ["Custo comum", "var(--s-neu)"]])}
        ${vizBarras(depOrd.sort((a, b) => b.custo_hora - a.custo_hora).map((k) => ({ rot: k.departamento, valor: `R$ ${n0(k.custo_hora)}`,
          partes: [{ v: +k.custo_direto_hora, cor: DEPC[k.departamento], rot: "Direto" }, { v: +k.custo_comum_hora, cor: "var(--s-neu)", rot: "Comum" }] })), { fmt: (v) => "R$ " + n1(v) + "/h" })}
        <div class="tbw" style="margin-top:14px">${tabela([["Departamento"], ["Horas", "n"], ["Custo direto", "n"], ["Custo-hora", "n"]],
          d.departamentos.map((k) => `<tr style="cursor:default"><td class="forte">${esc(k.departamento)}</td><td class="n">${n1(k.horas_apontadas)}</td><td class="n">${brl(k.custo_direto)}</td><td class="n"><b>R$ ${(+k.custo_hora).toFixed(2).replace(".", ",")}</b></td></tr>`))}</div></section>
    </div>
    <section class="card" style="margin-bottom:16px"><div class="sec-h"><div><h2>Onde está o custo dos maiores grupos</h2><p>Custo por departamento; o traço preto é a receita líquida. Barra que passa do traço é prejuízo. Clique para a análise.</p></div></div>
      ${legenda(DEPS.map((k) => [k, DEPC[k]]).concat([["Receita líquida", "var(--ink)", "ln"]]))}
      ${vizEmpilhadas(topG, DEPS, DEPC)}</section>
    <div class="card" style="padding:4px 8px">
      <div class="sec-h" style="padding:12px 8px 4px"><div><h2>${modo === "grupo" ? "Grupos econômicos" : "Por CNPJ"}</h2><p>${modo === "grupo" ? "Do pior resultado ao melhor. Clique na linha para abrir; na situação, para a análise completa." : "Cada CNPJ com as horas lançadas nele. Clique na situação para a análise do CNPJ."}</p></div>
        ${segV("mg", [["grupo", "Por grupo"], ["cnpj", "Por CNPJ"]], modo)}</div>
      ${modo === "grupo" ? tabela([["Grupo"], ["Honorário", "n"], ["Custo", "n"], ["Resultado", "n"], ["Margem", "n"], ["Departamento que mais pesa", "hm"], ["Situação"]], gs.map(linha))
        : tabela([["CNPJ"], ["Honorário", "n"], ["Horas", "n hm"], ["Custo", "n"], ["Resultado", "n"], ["Margem", "n"], ["Situação"]],
          cnpjs.filter((x) => casa(x, ["sigla", "cliente", "grupo"])).map((x) => `<tr ${x.entidade_id ? `data-ent="${x.entidade_id}"` : ""}><td class="cl-c"><b>${esc(x.sigla || "—")}</b><small>${esc(x.cliente || "")}${x.grupo && x.grupo !== x.sigla ? " · grupo " + esc(x.grupo) : ""}</small></td>
            <td class="n">${brl(x.honorario)}</td><td class="n hm">${x.horas == null ? "—" : n1(x.horas)}</td><td class="n">${x.custo == null ? "—" : brl(x.custo)}</td>
            <td class="n">${x.custo == null ? "—" : `<span class="${x.resultado < 0 ? "t-atr" : ""}">${brl(x.resultado)}</span>`}</td><td class="n">${mg(x.margem_pct)}</td>
            <td><div class="mg-acts"><button class="st-b" data-mge="${x.entidade_id}" title="Abrir análise de rentabilidade">${pillSem(x.status)}</button>${x.custo == null ? "" : botaoRel("e", x.entidade_id)}</div></td></tr>`))}</div>
    <div style="color:var(--ink3);font-size:12.5px;margin:10px 4px">Custo inclui pró-labore da Cris e remuneração do Jean (decisão de 19/11/2026), encargos reais (FGTS e INSS), benefícios, provisão de 13º e férias, estrutura (sistemas, ocupação, CRC, mentoria em 12 meses). Aquisição de clientes e despesas pessoais dos sócios ficam fora. Horas em clientes sem contrato ativo não entram em nenhum grupo.</div>
    ${linhaAgora(neg.length ? `Renegociar os <b>${neg.length}</b> grupos no prejuízo — começar por <b>${esc([...neg].sort((a, b) => a.resultado - b.resultado)[0].grupo)}</b>, com o relatório de custo pronto no botão ao lado da situação.` : "Nenhum grupo no prejuízo nesta competência.")}`;
  $$("tr.gr").forEach((t) => (t.onclick = () => { const g = t.dataset.g; abertos.has(g) ? abertos.delete(g) : abertos.add(g); telaMargem(); }));
  $$("[data-seg=mg]").forEach((b) => (b.onclick = () => { st.margemModo = b.dataset.k; telaMargem(); }));
  ligaIr($("#view"));
  $$("[data-mgg]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); analiseMargem({ p_grupo: b.dataset.mgg }); }));
  $$("[data-pt]").forEach((b) => (b.onclick = () => analiseMargem({ p_grupo: b.dataset.pt })));
  ligaTips($("#view"));
  $$("[data-mge]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); analiseMargem({ p_entidade: b.dataset.mge }); }));
  $$("[data-rel]").forEach((b) => (b.onclick = async (e) => {
    e.stopPropagation();
    const w = window.open("", "_blank"); // abre já no clique, senão o navegador bloqueia o pop-up
    if (!w) return toast("Libere pop-ups para abrir o relatório");
    w.document.write('<p style="font:16px Montserrat,Arial,sans-serif;padding:32px">Gerando o relatório…</p>');
    const [tipo, id] = [b.dataset.rel, b.dataset.id];
    try { const d = await rpcMod("app_mod_margem_detalhe", { p_grupo: tipo === "g" ? id : null, p_entidade: tipo === "e" ? id : null }, true); relatorioCliente(d, { margem: true, janela: w }); }
    catch (err) { w.close(); toast(err.message); }
  }));
}
// Botão do relatório de custo ao cliente, ao lado da situação (só diretoria; regra de 19/11/2026)
const botaoRel = (tipo, id) => (st.eu?.papel === "admin" ? `<button class="rel-b" data-rel="${tipo}" data-id="${esc(String(id))}" title="Relatório de custo e margem para o cliente (PDF)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>Relatório</button>` : "");

// análise de rentabilidade (gaveta) de um grupo ou de um CNPJ
async function analiseMargem(args) {
  const g = gaveta(`<div class="gh"><button class="ib gx" aria-label="Fechar">${I.x}</button><div class="ey">Análise de rentabilidade</div><h3>Carregando…</h3></div><div class="gb"><div class="sk" style="height:420px"></div></div>`);
  let d; try { d = await rpcMod("app_mod_margem_detalhe", { p_grupo: args.p_grupo || null, p_entidade: args.p_entidade || null }, true); } catch (e) { $(".gb", g).innerHTML = `<div class="vazio-g">${esc(e.message)}</div>`; return; }
  const r = d.resultado || {}, s = d.sinais || {};
  const bloco = (tit, html) => `<div class="bloco"><h4>${tit}</h4>${html}</div>`;
  const kv = (rot, v, cls) => `<div class="am-k"><span>${rot}</span><b class="${cls || ""}">${v}</b></div>`;
  const grupo = d.tipo === "grupo";
  $(".gh", g).innerHTML = `<button class="ib gx" aria-label="Fechar">${I.x}</button>
    <div class="ey">${grupo ? "Grupo econômico" : "CNPJ"} · competência ${comp(d.competencia)}</div><h3>${esc(d.nome || "—")}</h3>
    <div class="gc">${grupo ? plural(d.cnpjs.length, "CNPJ", "CNPJs") + " no grupo" : esc(d.cnpjs?.[0]?.cliente || "")}</div>
    <div class="gp">${pillSem(d.status)}${r.margem_pct != null ? ` <span class="pill ${r.margem_pct < 0 ? "atr" : r.margem_pct < r.margem_alvo_pct ? "risco" : "ok"}">Margem ${n1(r.margem_pct)}%</span>` : ""}</div>`;
  $(".gx", g).onclick = () => fecharGaveta();
  const falta = r.honorario_sugerido > r.honorario ? r.honorario_sugerido - r.honorario : 0;
  $(".gb", g).innerHTML =
    bloco("Resultado do mês", `<div class="am-g">
      ${kv("Honorário", brl(r.honorario))}${kv(`Receita líquida (− DAS ${n0(r.das_pct)}%)`, brl(r.receita_liquida))}
      ${kv("Custo de servir", brl(r.custo))}${kv("Resultado", brl(r.resultado), r.resultado < 0 ? "t-atr" : "t-ok")}
      ${kv("Horas apontadas", n1(r.horas) + "h")}${kv("Custo médio por hora", r.horas ? "R$ " + n1(r.custo / r.horas) : "—")}</div>
      ${falta ? `<div class="am-al">Para ${n0(r.margem_alvo_pct)}% de margem, o honorário precisaria ser <b>${brl(r.honorario_sugerido)}</b>: <b>+${brl(falta)}</b> por mês, ou ${n1((r.custo - r.receita_liquida * (1 - r.margem_alvo_pct / 100)) / (r.custo / r.horas || 1))} horas a menos no mês com o honorário atual.</div>` : ""}`) +
    bloco("Custo por departamento", (d.departamentos || []).map((k) => `<div class="mg-l"><span>${esc(k.departamento)}</span><span class="tr"><i style="width:${k.pct}%"></i></span><b>${brl(k.custo)}</b><small>${n1(k.horas)}h × R$ ${n0(k.custo_hora)}</small></div>`).join("") || '<div style="color:var(--ink3);font-size:13px">Sem horas apontadas na competência.</div>') +
    bloco("Quem trabalhou", (d.colaboradores || []).map((c) => `<div class="am-c"><b>${esc(curto(c.colaborador))}</b><span>${n1(c.horas)}h</span><small>${esc(c.setores)}</small></div>`).join("") + (d.horas_internas ? `<div style="font-size:12px;color:var(--ink3);margin-top:6px">${n1(d.horas_internas)}h lançadas como "Outros" ficam no custo comum, não neste cliente.</div>` : "")) +
    (grupo ? bloco("CNPJs do grupo", `<div class="tbw"><table class="tb mini"><thead><tr><th>CNPJ</th><th class="n">Honorário</th><th class="n">Custo</th><th class="n">Resultado</th><th></th></tr></thead><tbody>${(d.cnpjs || []).map((c) => `<tr data-amc="${c.entidade_id}"><td><b>${esc(c.sigla || "—")}</b><div style="font-size:11.5px;color:var(--ink3)">${esc(c.cliente || "")}</div></td><td class="n">${brl(c.honorario)}</td><td class="n">${c.custo == null ? "—" : brl(c.custo)}</td><td class="n"><span class="${c.resultado < 0 ? "t-atr" : ""}">${c.custo == null ? "—" : brl(c.resultado)}</span></td><td>${pillSem(c.status)}</td></tr>`).join("")}</tbody></table></div>
      <div style="font-size:12px;color:var(--ink3);margin-top:6px">Unidades sem horas costumam ter o trabalho lançado na matriz; o resultado que vale é o do grupo.</div>`) : "") +
    bloco("Sinais de atendimento (90 dias)", `<div class="am-g">${kv("Atendimentos WhatsApp", n0(s.tickets_90d))}${kv("Mensagens da Utarget", n0(s.msgs_utarget_90d))}${kv("1ª resposta (mediana)", s.resp_mediana_min == null ? "—" : n0(s.resp_mediana_min) + " min")}${kv("Tarefas abertas no G-Click", n0(s.gc_abertas))}${kv("Atrasadas", n0(s.gc_atrasadas), s.gc_atrasadas ? "t-atr" : "")}${kv("Entregues com atraso", n0(s.gc_entregues_atraso_90d))}</div>`);
  $(".gf", g)?.remove();
  g.insertAdjacentHTML("beforeend", `<div class="gf" style="flex-wrap:wrap">${st.eu.papel === "admin" ? `<button class="btn s" id="am-pdf" title="Só Jean ou Cris enviam ao cliente">Relatório de custo para o cliente (PDF)</button>` : ""}${!grupo && d.entidade_id ? `<button class="btn s" id="am-ficha">Abrir ficha da entidade</button>` : ""}${!grupo && d.cnpjs?.[0]?.grupo && d.cnpjs[0].grupo !== d.nome ? `<button class="btn s" id="am-grupo">Ver o grupo ${esc(d.cnpjs[0].grupo)}</button>` : ""}<button class="btn p" id="am-ok">Fechar</button></div>`);
  $("#am-ok", g).onclick = () => fecharGaveta();
  if ($("#am-pdf", g)) $("#am-pdf", g).onclick = () => relatorioCliente(d, { margem: true }); // regra 20/11/2026: custo, valor do serviço e margem atual
  if ($("#am-ficha", g)) $("#am-ficha", g).onclick = () => fichaEntidade(d.entidade_id);
  if ($("#am-grupo", g)) $("#am-grupo", g).onclick = () => analiseMargem({ p_grupo: d.cnpjs[0].grupo });
  $$("[data-amc]", g).forEach((t) => (t.onclick = () => analiseMargem({ p_entidade: t.dataset.amc })));
}


// relatório imprimível para o cliente (marca Utarget, A4)
function relatorioCliente(d, { margem = true, janela = null } = {}) { // margem atual entra no PDF desde 20/11/2026 (Jean)
  const r = d.resultado || {}, s = d.sinais || {}, grupo = d.tipo === "grupo";
  const hojeBR = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric" });
  const mesRef = new Date(String(d.competencia).slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const cnpjFmt = (c) => (c && c.length === 14 ? c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : c || "");
  const R = (v) => (v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }));
  const H1 = (v) => Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const CORES = { "Contábil": "#2a78d6", "DP": "#eb6834", "BPO": "#1baf7a", "Legalização": "#eda100", "Fiscal": "#e87ba4" };
  const NOME = { "Contábil": "Contabilidade", "DP": "Departamento Pessoal", "BPO": "BPO Financeiro", "Legalização": "Legalização e certificações", "Fiscal": "Fiscal" };
  const totH = r.horas || 0, totC = r.custo || 0;
  // Valor do serviço entregue = custo da área ÷ ((1 − Simples) × (1 − margem mínima)): preço que o trabalho deveria ter
  const das = (r.das_pct ?? 11) / 100, alvo = (r.margem_alvo_pct ?? 40) / 100, fator = (1 - das) * (1 - alvo);
  const preco = (custo) => (+custo || 0) / fator;
  const totV = (d.departamentos || []).reduce((s, k) => s + preco(k.custo), 0) || preco(totC);
  const cobreV = totV ? Math.round((100 * (r.honorario || 0)) / totV) : null;
  // empresas
  const emp = new Map();
  (d.empresas || []).forEach((e) => emp.set(e.entidade_id, { ...e, horas: 0, custo: 0, deps: {} }));
  (d.matriz || []).forEach((m) => { const e = emp.get(m.entidade_id) || { entidade_id: m.entidade_id, sigla: m.sigla, nome: m.nome, cnpj: m.cnpj, horas: 0, custo: 0, deps: {} }; e.horas += +m.horas; e.custo += +m.custo; e.deps[m.departamento] = (e.deps[m.departamento] || 0) + +m.horas; emp.set(m.entidade_id, e); });
  (d.cnpjs || []).forEach((c) => { const e = emp.get(c.entidade_id); if (e) e.honorario = +c.honorario; });
  const lista = [...emp.values()].sort((a, b) => b.horas - a.horas);
  const maxH = Math.max(1, ...lista.map((e) => e.horas));
  const top = lista[0], dep0 = (d.departamentos || [])[0];
  const cobre = totC ? Math.round((100 * r.honorario) / (totC / (1 - (r.das_pct || 11) / 100))) : null;
  const barra = (deps, total, larg) => `<div class="bar" style="width:${larg}%">${DEPS.filter((k) => deps[k] > 0).map((k) => `<i style="flex:${deps[k]};background:${CORES[k]}" title="${NOME[k]}: ${H1(deps[k])}h"></i>`).join("")}</div>`;
  const leitura = [
    top && totH ? `<b>${Math.round((100 * top.horas) / totH)}%</b> do trabalho do mês foi para <b>${esc(top.sigla || top.nome)}</b>.` : "",
    dep0 ? `<b>${esc(NOME[dep0.departamento] || dep0.departamento)}</b> concentra <b>${Math.round(dep0.pct)}%</b> do esforço da equipe.` : "",
    grupo && lista.filter((e) => !e.horas).length ? `${lista.filter((e) => !e.horas).length} ${lista.filter((e) => !e.horas).length === 1 ? "empresa não teve" : "empresas não tiveram"} horas lançadas diretamente: o trabalho delas foi registrado na matriz.` : "",
    cobreV != null && r.honorario ? (cobreV < 100 ? `O honorário atual corresponde a <b>${cobreV}%</b> do valor do serviço entregue no mês (${R(r.honorario)} de ${R(totV)}).` : `O honorário atual cobre o valor do serviço entregue no mês.`) : "",
    margem && r.margem_pct != null ? (r.resultado < 0
      ? `O honorário atual não cobre nem o custo do trabalho: a Utarget tem <b class="neg">prejuízo de ${R(-r.resultado)} por mês</b> com ${grupo ? "o grupo" : "a entidade"} (margem de <b class="neg">${H1(r.margem_pct)}%</b>). Hoje esse prejuízo é pago pelo resultado dos demais clientes do escritório.`
      : r.margem_pct < alvo * 100 ? `O honorário cobre o custo do trabalho, mas a margem de <b>${H1(r.margem_pct)}%</b> fica abaixo dos <b>${Math.round(alvo * 100)}%</b> que sustentam o escritório.`
      : `O honorário cobre o trabalho entregue com margem de <b>${H1(r.margem_pct)}%</b>, dentro do mínimo do escritório.`) : "",
  ].filter(Boolean);
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Relatório de consumo — ${esc(d.nome)} — ${esc(mesRef)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--azul:#0071D4;--laranja:#FF9100;--grafite:#404040;--ink:#16202C;--ink2:#4A5563;--ink3:#6E7988;--linha:#E2E7EE;--fundo:#F3F5F8}
*{box-sizing:border-box}html,body{margin:0;background:#E9EDF2;color:var(--ink);font-family:Montserrat,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:210mm;min-height:297mm;margin:16px auto;background:#fff;padding:16mm 15mm 14mm;position:relative;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.bar-top{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid var(--azul);padding-bottom:10px}
.bar-top img{height:34px}.bar-top .dt{text-align:right;font-size:10px;color:var(--ink3);line-height:1.5}
h1{font-size:22px;font-weight:800;margin:18px 0 2px;letter-spacing:-.3px}h1 span{color:var(--azul)}
.sub{font-size:11.5px;color:var(--ink2);margin:0 0 16px}
.kp{display:grid;grid-template-columns:repeat(${margem ? 4 : 3},1fr);gap:8px;margin-bottom:16px}
.k{background:var(--fundo);border-radius:10px;padding:10px 12px}.k .r{font-size:9.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--ink3)}
.k .v{font-size:20px;font-weight:800;margin-top:3px;letter-spacing:-.4px}.k .s{font-size:9.5px;color:var(--ink3);margin-top:2px}
.k.dest{background:var(--azul);color:#fff}.k.dest .r,.k.dest .s{color:rgba(255,255,255,.85)}
.k.neg .v{color:#C5221F}.k.alerta{background:#FDECEA}.k.alerta .v,.k.alerta .r{color:#B3261E}.k.aviso{background:#FFF4E0}.k.aviso .v{color:#8A5300}.k.bom .v{color:#137333}
h2{font-size:12.5px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--grafite);margin:18px 0 8px;border-left:4px solid var(--laranja);padding-left:8px}
.dl{display:grid;gap:6px}.dl .l{display:grid;grid-template-columns:160px 1fr 150px;gap:10px;align-items:center;font-size:11px}
.dl .t{height:12px;background:var(--fundo);border-radius:4px;overflow:hidden}.dl .t i{display:block;height:100%;border-radius:4px}
.dl .n{text-align:right;font-weight:700}.dl .n small{font-weight:500;color:var(--ink3)}
table{width:100%;border-collapse:collapse;font-size:10.5px}th{text-align:left;font-size:9px;letter-spacing:.5px;text-transform:uppercase;color:var(--ink3);font-weight:700;border-bottom:1.5px solid var(--grafite);padding:6px 5px}
td{border-bottom:1px solid var(--linha);padding:6px 5px;vertical-align:middle}td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}
td b{font-size:11px}td small{display:block;color:var(--ink3);font-size:9px}
.bar{display:flex;gap:1.5px;height:9px;min-width:2px}.bar i{display:block;height:100%}.bar i:first-child{border-radius:3px 0 0 3px}.bar i:last-child{border-radius:0 3px 3px 0}
.leg{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:9.5px;color:var(--ink2);margin:0 0 8px}.leg i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:4px;vertical-align:-1px}
.box{background:#EAF3FC;border-radius:10px;padding:10px 14px;font-size:11.5px;line-height:1.6}.box p{margin:2px 0}
.neg{color:#C5221F}.pos{color:#137333}
.met{font-size:9px;color:var(--ink3);line-height:1.5;margin-top:14px}
.rod{position:absolute;left:15mm;right:15mm;bottom:9mm;display:flex;justify-content:space-between;font-size:9px;color:var(--ink3);border-top:1px solid var(--linha);padding-top:6px}
.acoes{position:fixed;top:12px;right:16px;display:flex;gap:8px}.acoes button{font:700 13px Montserrat,sans-serif;border:0;border-radius:10px;padding:10px 16px;cursor:pointer;background:var(--azul);color:#fff}.acoes button.s{background:#fff;color:var(--ink);border:1px solid var(--linha)}
@page{size:A4;margin:0}@media print{body{background:#fff}.pg{margin:0;box-shadow:none}.acoes{display:none}}
</style></head><body>
<div class="acoes"><button onclick="print()">Salvar em PDF / imprimir</button><button class="s" onclick="window.close()">Fechar</button></div>
<div class="pg">
  <div class="bar-top"><img src="${location.origin}${location.pathname.replace(/[^/]*$/, "")}logo-claro.svg" alt="Utarget Contabilidade & Assessoria"><div class="dt">Emitido em ${hojeBR}<br>Competência: ${mesRef}</div></div>
  <h1>Relatório de consumo de serviços<br><span>${esc(d.nome)}</span></h1>
  <p class="sub">${grupo ? `${lista.length} empresas do grupo atendidas pela Utarget` : esc(lista[0]?.nome || "")}${!grupo && lista[0]?.cnpj ? " · CNPJ " + cnpjFmt(lista[0].cnpj) : ""}</p>
  <div class="kp">
    <div class="k"><div class="r">Honorário mensal</div><div class="v">${R(r.honorario)}</div><div class="s">${grupo ? "soma das empresas" : "contrato vigente"}</div></div>
    <div class="k"><div class="r">Horas de trabalho</div><div class="v">${H1(totH)} h</div><div class="s">lançadas pela equipe no mês</div></div>
    <div class="k dest"><div class="r">Valor do serviço entregue</div><div class="v">${R(totV)}</div><div class="s">horas de cada área × preço-hora de referência</div></div>
    ${margem ? `<div class="k ${r.margem_pct == null ? "" : r.margem_pct < 0 ? "alerta" : r.margem_pct < alvo * 100 ? "aviso" : "bom"}"><div class="r">Margem atual do escritório</div><div class="v">${r.margem_pct == null ? "—" : H1(r.margem_pct) + "%"}</div><div class="s">${r.resultado == null ? "" : (r.resultado < 0 ? "prejuízo de " : "resultado de ") + R(Math.abs(r.resultado)) + " no mês · mínimo " + Math.round(alvo * 100) + "%"}</div></div>` : ""}
  </div>
  <h2>Onde o trabalho se concentra</h2>
  <div class="dl">${(d.departamentos || []).map((k) => `<div class="l"><span>${esc(NOME[k.departamento] || k.departamento)}</span><span class="t"><i style="width:${k.pct}%;background:${CORES[k.departamento] || "#999"}"></i></span><span class="n">${H1(k.horas)} h <small>· ${R(preco(k.custo))}</small></span></div>`).join("")}<div class="l" style="border-top:1px solid var(--linha);padding-top:6px"><b>Total</b><span></span><span class="n">${H1(totH)} h <small>· ${R(totV)}</small></span></div></div>
  <h2>Consumo por empresa</h2>
  <div class="leg">${DEPS.filter((k) => (d.departamentos || []).some((x) => x.departamento === k)).map((k) => `<span><i style="background:${CORES[k]}"></i>${NOME[k]}</span>`).join("")}</div>
  <table><thead><tr><th>Empresa</th><th class="n">Honorário</th><th class="n">Horas</th><th style="width:30%">Distribuição do trabalho</th><th class="n">% do grupo</th><th class="n">Valor do serviço</th></tr></thead><tbody>
  ${lista.map((e) => `<tr><td><b>${esc(e.sigla || "—")}</b><small>${esc(e.nome || "")}${e.cnpj ? " · " + cnpjFmt(e.cnpj) : ""}</small></td><td class="n">${e.honorario ? R(e.honorario) : "—"}</td><td class="n">${e.horas ? H1(e.horas) : "—"}</td>
    <td>${e.horas ? barra(e.deps, e.horas, Math.max(4, (100 * e.horas) / maxH)) : '<small>registrado na matriz</small>'}</td><td class="n">${totH && e.horas ? Math.round((100 * e.horas) / totH) + "%" : "—"}</td><td class="n">${e.custo ? R(preco(e.custo)) : "—"}</td></tr>`).join("")}
  </tbody></table>
  <h2>Leitura do mês</h2>
  <div class="box">${leitura.map((t) => `<p>${t}</p>`).join("")}${s.tickets_90d ? `<p>Nos últimos 90 dias foram <b>${s.tickets_90d}</b> atendimentos pelo WhatsApp${s.resp_mediana_min != null ? `, com primeira resposta em <b>${Math.round(s.resp_mediana_min)} min</b> (mediana)` : ""}.</p>` : ""}</div>
  <p class="met">Metodologia: horas lançadas pela equipe da Utarget na competência de ${mesRef}, por área. O valor do serviço multiplica as horas de cada área pelo preço-hora de referência da Utarget para aquela área, que cobre a equipe, encargos, benefícios, a estrutura do escritório, os tributos e a margem mínima de operação. ${margem ? "A margem atual é a diferença entre o honorário, líquido do Simples Nacional, e o custo do trabalho entregue, sobre o honorário líquido. " : ""}Trabalho feito para mais de uma empresa do grupo pode estar registrado na matriz.</p>
  <div class="rod"><span>Utarget Contabilidade &amp; Assessoria · especializada no Terceiro Setor desde 2016</span><span>WhatsApp (11) 2642-8636 · utarget.com.br</span></div>
</div></body></html>`;
  const w = janela || window.open("", "_blank");
  if (!w) return toast("Libere pop-ups para abrir o relatório");
  w.document.open(); w.document.write(html); w.document.close();
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
// ---------------------------------------------------------------- CENTRAL DE PRAZOS (espelho do G-Click, só leitura)
// Fonte: gclick_tarefas + gclick_resp, coletados pela edge function coletor-gclick-tarefas (dias úteis, a cada 2h).
// O G-Click continua sendo onde a tarefa é executada e baixada; aqui é leitura para decidir.
const DEP_CURTO = (d) => ({ "Contabilidade": "Contábil", "Departamento Pessoal": "DP", "Certificações (CENTS, CMDCA, CRCE, ETC )": "Certificações", "Sucesso do Cliente": "CS" }[d] || d || "Sem departamento");
const GC_COR = { atr: "var(--c-risco)", v7: "var(--s-neu)", ok: "var(--c-ok)", multa: "var(--c-atr)", sem: "var(--s-neu)" }; // vermelho é só da multa (lei de Von Restorff)
function gcSituacao(t, hoje) {
  if (!t.ab) return "feita";
  if (!t.venc) return "ok";
  const d = diff(t.venc, hoje);
  return d < 0 ? "atr" : d <= 7 ? "v7" : "ok";
}
async function telaGclick() {
  const hoje = hojeISO();
  cabecalho("Central de prazos", "Espelho do G-Click · carregando…");
  carregandoView();
  let d; try { d = await rpcMod("app_mod_gclick"); } catch (e) { return erroView(e); }
  const f = st.fg || (st.fg = { chip: "atr", dep: "", resp: "", cli: "", cat: "todas", lim: 40 });
  if (!f.vista) f.vista = "agora"; // Lei de Miller: decisão e análise em abas separadas
  const nomeP = (n) => (n === n.toUpperCase() ? n.toLowerCase().replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase()) : n);
  const todas = d.tarefas.map((t) => ({ ...t, dep: DEP_CURTO(t.dep), sit: gcSituacao(t, hoje), resp: [...new Set((t.resp || []).map(nomeP))],
    respA: [...new Set((t.resp_ativos || []).map(nomeP))], interna: /utarget/i.test(t.cli || "") })); // respA = equipe atual; interna = tarefa da própria Utarget
  const dow = new Date(hoje + "T12:00:00Z").getUTCDay(), segunda = addD(hoje, -((dow + 6) % 7)), domingo = addD(segunda, 6);
  const pinta = () => {
    const U = todas.filter((t) => (st.escopo === "minhas" ? t.minha : true) && (f.cat === "todas" || t.cat === f.cat));
    const ab = U.filter((t) => t.ab), atr = ab.filter((t) => t.sit === "atr"), v7 = ab.filter((t) => t.sit === "v7");
    const ent = U.filter((t) => !t.ab && t.conc && ["Concluída", "Finalizada", "Retificada"].includes(t.st));
    const noPrazo = ent.filter((t) => !t.venc || t.conc <= t.venc);
    const pct = ent.length ? Math.round((100 * noPrazo.length) / ent.length) : null;
    const atrM = atr.filter((t) => t.multa), v7M = v7.filter((t) => t.multa);
    const velhas = atr.filter((t) => diff(hoje, t.venc) > 60);
    const semResp = ab.filter((t) => !t.resp.length).length;
    const feitasSem = U.filter((t) => !t.ab && t.conc && t.conc >= segunda && ["Concluída", "Finalizada", "Retificada"].includes(t.st));
    const focoAb = ab.filter((t) => t.venc && t.venc <= domingo);
    const pctSem = feitasSem.length + focoAb.length ? Math.round((100 * feitasSem.length) / (feitasSem.length + focoAb.length)) : null;
    const cober = d.abertas_total ? Math.round((100 * d.abertas_com_resp) / d.abertas_total) : 0;
    cabecalho("Central de prazos", `Espelho do G-Click · atualizado ${quando(d.coletado_em)} · ${st.escopo === "minhas" ? "minhas tarefas" : "visão da equipe"}`);

    // frase de decisão
    const topCli = topN(atr, (t) => t.cli || "Sem cliente", 1)[0], topNome = topN(atr, (t) => t.nome, 1)[0];
    const frase = atr.length
      ? `${topNome ? `A que mais pesa é <b>${esc(topNome.k)}</b> (${topNome.n}).` : ""} ${velhas.length ? `<b>${velhas.length}</b> venceram há mais de 60 dias: confira se foram entregues e ficaram sem baixa no G-Click.` : ""}`
      : v7.length ? `Nada atrasado. <b>${plural(v7.length, "tarefa vence", "tarefas vencem")}</b> nos próximos 7 dias${v7M.length ? `, ${v7M.length} com multa` : ""}.` : "Nada atrasado e nada vencendo nos próximos 7 dias.";

    // idade do atraso
    const faixas = [["1–7 dias", 1, 7], ["8–30", 8, 30], ["31–60", 31, 60], ["61–90", 61, 90], ["+90", 91, 1e5]];
    const idade = faixas.map(([rot, a, b]) => { const l = atr.filter((t) => { const x = diff(hoje, t.venc); return x >= a && x <= b; });
      return { rot, partes: { "Com multa": l.filter((t) => t.multa).length, "Sem multa": l.filter((t) => !t.multa).length }, lista: resumo(l, (t) => t.nome) }; });
    // próximos 30 dias
    const estreito = innerWidth < 760, nDias = estreito ? 14 : 30;
    const dias = Array.from({ length: nDias }, (_, i) => addD(hoje, i));
    const cal = dias.map((dd, i) => { const l = ab.filter((t) => t.venc === dd);
      return { rot: i === 0 ? "Hoje" : String(+dd.slice(8)), tit: `${dsem(dd)} ${dm(dd)}`, partes: { "Com multa": l.filter((t) => t.multa).length, "Sem multa": l.filter((t) => !t.multa).length }, lista: resumo(l, (t) => t.nome) }; });
    // carga por pessoa
    const porResp = new Map();
    ab.forEach((t) => t.respA.forEach((r) => { const o = porResp.get(r) || { k: r, atr: 0, v7: 0, ok: 0, multa: 0 }; o[t.sit]++; if (t.multa && ["atr", "v7"].includes(t.sit)) o.multa++; porResp.set(r, o); }));
    const resp = [...porResp.values()].sort((a, b) => b.multa - a.multa || b.atr - a.atr || b.atr + b.v7 + b.ok - (a.atr + a.v7 + a.ok)).slice(0, 12);
    // departamentos
    const deps = [...new Set(U.map((t) => t.dep))].map((k) => { const a = ab.filter((t) => t.dep === k), e = ent.filter((t) => t.dep === k), p = e.filter((t) => !t.venc || t.conc <= t.venc);
      return { k, ab: a.length, atr: a.filter((t) => t.sit === "atr").length, multa: a.filter((t) => t.sit === "atr" && t.multa).length, v7: a.filter((t) => t.sit === "v7").length, ent: e.length, pct: e.length ? Math.round((100 * p.length) / e.length) : null }; })
      .filter((x) => x.ab || x.ent).sort((a, b) => b.atr - a.atr || b.ab - a.ab);
    const piorDep = deps.filter((x) => x.ent >= 10 && x.pct != null).sort((a, b) => a.pct - b.pct)[0];
    const fraseDep = piorDep && piorDep.pct < 70 ? ` <b>${esc(piorDep.k)}</b> entregou só <b>${piorDep.pct}%</b> no prazo nos últimos 90 dias.` : "";
    // clientes e obrigações (tarefas internas da Utarget ficam fora do ranking de clientes)
    const atrInt = atr.filter((t) => t.interna).length;
    const clis = topN(atr.filter((t) => !t.interna), (t) => t.cli || "Sem cliente", 10).map((o) => ({ ...o, ent: atr.find((t) => (t.cli || "Sem cliente") === o.k)?.ent, multa: o.l.filter((t) => t.multa).length }));
    const obr = topN(atr.filter((t) => !t.interna), (t) => t.nome, 8).map((o) => ({ ...o, multa: o.l.filter((t) => t.multa).length, clis: new Set(o.l.map((t) => t.cli)).size }));

    // lista filtrada
    const chips = { atr: (t) => t.ab && t.sit === "atr", multa: (t) => t.ab && t.multa && ["atr", "v7"].includes(t.sit), v7: (t) => t.ab && t.sit === "v7", ab: (t) => t.ab, ent: (t) => !t.ab && t.conc && ["Concluída", "Finalizada", "Retificada"].includes(t.st), tarde: (t) => !t.ab && t.conc && t.venc && t.conc > t.venc && ["Concluída", "Finalizada", "Retificada"].includes(t.st) };
    const base = U.filter((t) => (!f.dep || t.dep === f.dep) && (!f.resp || (f.resp === "Sem responsável" ? !t.resp.length : t.resp.includes(f.resp))) && (!f.cli || (t.cli || "Sem cliente") === f.cli))
      .filter((t) => casa({ ...t, r: t.resp.join(" ") }, ["nome", "cli", "dep", "r"]));
    const lst = base.filter(chips[f.chip]).sort((a, b) => (f.chip === "ent" || f.chip === "tarde" ? (b.conc || "").localeCompare(a.conc || "") : f.chip === "atr" ? b.multa - a.multa || (b.venc || "").localeCompare(a.venc || "") : (a.venc || "9").localeCompare(b.venc || "9") || b.multa - a.multa));
    const chip = (k, rot, c) => `<button class="chip" data-gc="${k}" aria-pressed="${f.chip === k}">${c ? `<i style="background:${c}"></i>` : ""}${rot} <b>${base.filter(chips[k]).length}</b></button>`;
    const ativo = [f.dep && ["dep", "Depto: " + f.dep], f.resp && ["resp", "Pessoa: " + curto(f.resp)], f.cli && ["cli", "Cliente: " + f.cli]].filter(Boolean);

    $("#view").innerHTML = `
    <div class="saud"><div><h2>${atr.length ? `${atr.length} atrasadas` : "Em dia"}${atrM.length ? ` · <span style="color:var(--atr-ink)">${atrM.length} com multa</span>` : ""}</h2><p>${frase}${fraseDep}</p>
      <div class="prog-s"><span class="tr"><i style="width:${pctSem ?? 0}%"></i></span><small><b>${n0(feitasSem.length)}</b> baixadas no G-Click desde segunda${feitasSem.filter((t) => t.multa).length ? ` (${feitasSem.filter((t) => t.multa).length} com multa)` : ""} · <b>${n0(focoAb.length)}</b> vencidas até domingo seguem abertas</small></div></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${segV("gvista", [["agora", "Agora"], ["analise", "Análise"]], f.vista)}${segV("gcat", [["todas", "Tudo"], ["Obrigacao", "Obrigações"], ["Solicitacao", "Solicitações"]], f.cat)}</div></div>
    <div class="kpis">
      ${kpiG("ab", "Abertas", n0(ab.length), `${plural(new Set(ab.filter((t) => !t.interna).map((t) => t.cli)).size, "cliente", "clientes")}${ab.filter((t) => t.interna).length ? ` · ${ab.filter((t) => t.interna).length} internas da Utarget` : ""}`, "")}
      ${kpiG("atr", "Atrasadas", n0(atr.length), atrM.length ? `<b style="color:var(--atr-ink)">${atrM.length}</b> com multa` : "nenhuma com multa", "risco")}
      ${kpiG("v7", "Vencem em 7 dias", n0(v7.length), v7M.length ? `<b style="color:var(--atr-ink)">${v7M.length}</b> com multa` : "nenhuma com multa", "")}
      ${kpiG("ent", "Entregues no prazo", pct == null ? "—" : pct + "<small>%</small>", ent.length ? `<b>${n0(noPrazo.length)}</b> de ${n0(ent.length)} em 90 dias` : "sem entregas em 90 dias", "ok")}
      ${kpiG("semresp", "Sem responsável", n0(semResp), `nomes lidos em ${cober}% das abertas`, "")}
    </div>
    <div ${f.vista === "analise" ? "" : "hidden"}>
    <div class="grade">
      <section class="card"><div class="sec-h"><div><h2>Carga por pessoa</h2><p>Tarefas abertas por responsável no G-Click, só da equipe atual (contas de sistema e desligados ficam de fora). Clique para filtrar.</p></div></div>
        ${legenda([["Com multa", GC_COR.multa], ["Atrasada", GC_COR.atr], ["Vence em 7 dias", GC_COR.v7], ["Em dia", GC_COR.ok]])}
        ${resp.length ? vizBarras(resp.map((o) => ({ rot: curto(o.k), attr: `data-fresp="${esc(o.k)}" style="cursor:pointer"`, valor: `${o.atr ? `<b${o.multa ? ' style="color:var(--atr-ink)"' : ""}>${o.atr}</b> / ` : ""}${o.atr + o.v7 + o.ok}`,
          partes: [{ v: o.multa, cor: GC_COR.multa, rot: "Com multa à vista" }, { v: Math.max(0, o.atr - o.multa), cor: GC_COR.atr, rot: "Atrasadas sem multa" }, { v: o.v7, cor: GC_COR.v7, rot: "Vencem em 7 dias" }, { v: o.ok, cor: GC_COR.ok, rot: "Em dia" }] }))) : '<div class="vazio-g">Sem tarefas abertas.</div>'}
      </section>
      <section class="card"><div class="sec-h"><div><h2>Há quanto tempo estão atrasadas</h2><p>Atraso antigo costuma ser entrega sem baixa no G-Click ou tarefa que não se aplica mais.</p></div></div>
        ${legenda([["Com multa", GC_COR.multa], ["Sem multa", GC_COR.sem]])}
        ${vizColunas(idade, ["Com multa", "Sem multa"], { "Com multa": GC_COR.multa, "Sem multa": GC_COR.sem }, { H: 230 })}
      </section>
    </div>
    <section class="card" style="margin-bottom:16px"><div class="sec-h"><div><h2>Vencimentos dos próximos ${nDias} dias</h2><p>Tarefas abertas por dia de vencimento. Passe o mouse para ver quais.</p></div></div>
      ${legenda([["Com multa", GC_COR.multa], ["Sem multa", "var(--c-ok)"]])}
      ${vizColunas(cal, ["Com multa", "Sem multa"], { "Com multa": GC_COR.multa, "Sem multa": "var(--c-ok)" }, { H: estreito ? 260 : 230, W: estreito ? 680 : 1360, destaque: "Hoje" })}
    </section>
    <div class="grade b">
      <section class="card"><div class="sec-h"><div><h2>Departamentos</h2><p>Abertas, atrasadas e pontualidade das entregas dos últimos 90 dias.</p></div></div>
        ${tabela([["Departamento"], ["Abertas", "n"], ["Atrasadas", "n"], ["7 dias", "n hm"], ["No prazo (90d)"]],
          deps.map((x) => `<tr data-fdep="${esc(x.k)}"><td class="forte">${esc(x.k)}</td><td class="n">${x.ab}</td><td class="n">${x.atr ? `<span class="pill atr">${x.atr}</span>` : "0"}${x.multa ? ` <span class="pill multa">${x.multa} multa</span>` : ""}</td><td class="n hm">${x.v7}</td>
            <td>${x.pct == null ? '<span style="color:var(--ink3)">—</span>' : `<div class="pct"><span class="tr"><i style="width:${x.pct}%;background:${x.pct >= 90 ? "var(--ok-ink)" : x.pct >= 70 ? "var(--c-risco)" : "var(--c-atr)"}"></i></span><b>${x.pct}%</b></div>`}</td></tr>`))}
      </section>
      <section class="card"><div class="sec-h"><div><h2>Onde está o atraso</h2><p>Clientes e obrigações com mais tarefas atrasadas.${atrInt ? ` As <b>${atrInt}</b> internas da Utarget ficam fora.` : ""}</p></div>${segV("gonde", [["cli", "Clientes"], ["obr", "Obrigações"]], f.onde || "cli")}</div>
        ${(f.onde || "cli") === "cli"
          ? (clis.length ? vizBarras(clis.map((o) => ({ rot: o.k, attr: `data-fcli="${esc(o.k)}" style="cursor:pointer"`, partes: [{ v: o.multa, cor: GC_COR.multa, rot: "Com multa" }, { v: o.n - o.multa, cor: GC_COR.sem, rot: "Sem multa" }] }))) : '<div class="vazio-g">Nenhum cliente com atraso.</div>')
          : (obr.length ? vizBarras(obr.map((o) => ({ rot: o.k, valor: `${o.n}<small style="color:var(--ink3);font-weight:500"> · ${o.clis} cli.</small>`, partes: [{ v: o.multa, cor: GC_COR.multa, rot: "Com multa" }, { v: o.n - o.multa, cor: GC_COR.sem, rot: "Sem multa" }] }))) : '<div class="vazio-g">Nenhuma obrigação atrasada.</div>')}
      </section>
    </div>
    </div>
    <div ${f.vista === "analise" ? "hidden" : ""}>
    <section class="card" id="gc-lista" style="padding:14px 8px 4px">
      <div class="filtros stick" style="padding:8px 8px 10px">${chip("atr", "Atrasadas", GC_COR.atr)}${chip("multa", "Multa à vista", GC_COR.multa)}${chip("v7", "Vencem em 7 dias", GC_COR.v7)}${f.maisF || ["ab", "ent", "tarde"].includes(f.chip) ? `${chip("ab", "Todas abertas")}${chip("ent", "Entregues (90d)", "var(--ok-ink)")}${chip("tarde", "Entregues com atraso")}` : ""}<button class="chip" id="gc-maisf">${f.maisF ? "Menos filtros" : "Mais filtros"}</button>
        ${ativo.map(([k, r]) => `<button class="chip" data-limpa="${k}" aria-pressed="true">${esc(r)} ✕</button>`).join("")}</div>
      ${tabela([["Tarefa"], ["Cliente"], [f.chip === "ent" || f.chip === "tarde" ? "Entregue" : "Vencimento", "n"], ["Responsável", "hm"], ["Situação"]],
        lst.slice(0, f.lim).map((t) => `<tr ${t.ent ? `data-ent="${t.ent}"` : 'style="cursor:default"'}><td><div class="forte" style="font-size:13px">${esc(t.nome)}</div><small style="color:var(--ink3)">${esc(t.dep)}${t.comp ? " · comp. " + comp(t.comp) : ""}${t.cat === "Solicitacao" ? " · solicitação" : ""}</small></td>
          <td>${esc(t.cli || "—")}</td>
          <td class="n">${t.ab ? dmy(t.venc) : dmy(t.conc)}${t.ab && t.venc ? `<small style="display:block;color:${t.sit === "atr" ? "var(--atr-ink)" : "var(--ink3)"}">${t.sit === "atr" ? diff(hoje, t.venc) + "d atrasada" : diff(t.venc, hoje) === 0 ? "hoje" : "em " + diff(t.venc, hoje) + "d"}</small>` : !t.ab && t.venc && t.conc > t.venc ? `<small style="display:block;color:var(--risco-ink)">${diff(t.conc, t.venc)}d após o prazo</small>` : ""}</td>
          <td class="hm" style="font-size:12.5px">${t.resp.length ? esc(t.resp.map(curto).join(", ")) : '<span style="color:var(--ink3)">—</span>'}</td>
          <td>${t.ab ? `<span class="pill ${t.sit === "atr" ? "atr" : t.sit === "v7" ? "risco" : "neu"}">${esc(t.st)}</span>` : `<span class="pill ${t.venc && t.conc > t.venc ? "risco" : "ok"}">${esc(t.st)}</span>`}${t.multa ? ' <span class="pill multa">Multa</span>' : ""}</td></tr>`),
        "Nada com esse filtro.")}
      ${lst.length > f.lim ? `<button class="mais" id="gc-mais">Mostrar mais ${Math.min(100, lst.length - f.lim)} de ${lst.length - f.lim}</button>` : ""}
    </section>
    ${linhaAgora(atrM.length + v7M.length ? `Baixar primeiro as <b>${atrM.length + v7M.length}</b> com multa à vista${velhas.length ? `; depois conferir as <b>${velhas.length}</b> vencidas há mais de 60 dias, que podem já ter sido entregues sem baixa` : ""}.` : atr.length ? `Confirmar as <b>${atr.length}</b> atrasadas e dar baixa no G-Click no que já foi entregue.` : "Tudo em dia: manter as entregas da semana.")}
    <div style="color:var(--ink3);font-size:12.5px;margin:10px 4px">Leitura do G-Click; a baixa e a execução continuam lá. Responsáveis são lidos aos poucos a cada coleta (${cober}% das abertas até agora).</div>
    </div>`;

    const vaiLista = () => $("#gc-lista")?.scrollIntoView({ behavior: "smooth", block: "start" });
    $$("[data-seg=gvista]").forEach((b) => (b.onclick = () => { f.vista = b.dataset.k; pinta(); }));
    if ($("#gc-maisf")) $("#gc-maisf").onclick = () => { f.maisF = !f.maisF; pinta(); };
    $$("[data-gc]").forEach((b) => (b.onclick = () => { f.chip = b.dataset.gc; f.lim = 40; pinta(); }));
    $$("[data-limpa]").forEach((b) => (b.onclick = () => { f[b.dataset.limpa] = ""; pinta(); }));
    $$("[data-seg=gcat]").forEach((b) => (b.onclick = () => { f.cat = b.dataset.k; pinta(); }));
    $$("[data-seg=gonde]").forEach((b) => (b.onclick = () => { f.onde = b.dataset.k; pinta(); }));
    $$("[data-fresp]").forEach((b) => (b.onclick = () => { f.resp = b.dataset.fresp; f.chip = "ab"; f.vista = "agora"; pinta(); vaiLista(); }));
    $$("[data-fdep]").forEach((b) => (b.onclick = () => { f.dep = b.dataset.fdep; f.chip = "atr"; f.vista = "agora"; pinta(); vaiLista(); }));
    $$("[data-fcli]").forEach((b) => (b.onclick = () => { f.cli = b.dataset.fcli; f.chip = "atr"; f.vista = "agora"; pinta(); vaiLista(); }));
    $$("[data-gk]").forEach((b) => (b.onclick = () => { const k = b.dataset.gk; if (k === "semresp") { f.resp = "Sem responsável"; f.chip = "ab"; } else f.chip = k; f.vista = "agora"; pinta(); vaiLista(); }));
    if ($("#gc-mais")) $("#gc-mais").onclick = () => { f.lim += 100; pinta(); };
    ligaIr($("#view")); ligaTips($("#view"));
  };
  pinta();
}
const kpiG = (k, rot, v, sub, c) => `<button class="kpi" data-gk="${k}"><div class="r">${c ? `<i style="background:var(--c-${c})"></i>` : ""}${rot}</div><div class="v">${v}</div><div class="s">${sub}</div><span class="seta">${I.seta}</span></button>`;
function topN(l, chave, n) { const m = new Map(); l.forEach((t) => { const k = chave(t); const o = m.get(k) || { k, n: 0, l: [] }; o.n++; o.l.push(t); m.set(k, o); }); return [...m.values()].sort((a, b) => b.n - a.n).slice(0, n); }
function resumo(l, chave) { return topN(l, chave, 4).map((o) => `${o.k}${o.n > 1 ? " (" + o.n + ")" : ""}`).join(" · ") + (new Set(l.map(chave)).size > 4 ? " …" : ""); }

function navItens() {
  const it = [["inicio", "Início", I.inicio]];
  // Por ora o G-Click segue como motor de execução: a área de tarefas é a central de prazos (espelho, só leitura).
  // As telas do motor próprio (Tarefas, Entrada, Modelos) voltam quando a migração do G-Click for decidida.
  if (temMod("tarefas")) it.push(["gclick", "Central de prazos", I.painel]);
  (st.mods || []).filter((m) => m.codigo !== "tarefas").forEach((m) => it.push([m.codigo, m.nome, I[m.codigo] || I.lista]));
  return it;
}

Object.assign(MODS, {
  inicio: telaInicio, gclick: telaGclick, carteira: telaCarteira, legalizacao: telaLegalizacao, captacao: telaCaptacao, comercial: telaComercial,
  atendimento: telaAtendimento, financeiro: telaFinanceiro, margem: telaMargem, acessos: telaAcessos,
});

iniciar();
if ("serviceWorker" in navigator && !window.__mockSb) navigator.serviceWorker.register("sw.js").catch(() => {});
