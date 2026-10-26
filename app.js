/* PESSOAS — para trocar os personagens, substitua os arquivos em img/. */
const PLAYERS = [
  { key:"nery",    nome:"Nery",    userId:"09cd636e-eb27-415f-8ff1-d4daa89bf96d", meta:1200000, metaC:60, cor:"#e3171f", sprite:"img/nery.webp", avatar:"img/av_nery.jpg" },
  { key:"orlando", nome:"Orlando", userId:"2cad872b-594c-81ac-a0f4-00026028600b", meta:900000,  metaC:25, cor:"#ffffff", sprite:"img/orlando.webp", avatar:"img/av_orlando.jpg" },
  { key:"mari",    nome:"Mari",    userId:"2fdd872b-594c-8133-a18b-000234729d1d", meta:600000,  metaC:75, cor:"#9a9aa2", sprite:"img/mari.webp", avatar:"img/av_mari.jpg" },
  { key:"silas",   nome:"Silas",   userId:"33ad872b-594c-813b-baf2-00028fd4ef06", meta:300000,  metaC:75, cor:"#f08a8e", sprite:"img/silas.webp", avatar:"img/av_silas.jpg" },
];

const META_TIME = 3000000;
const Q_START = new Date(2026, 9, 1), Q_DAYS = 92;
const POLL_MS = 10000;

const id8 = p => p.userId.slice(0, 8);
const state = { sums:null, wins:null, acts:null, metas:null, err:{} };

const $ = id => document.getElementById(id);
const clamp = (x,a,b) => Math.max(a, Math.min(b, x));
const brl = n => "R$ " + Math.round(n||0).toLocaleString("pt-BR");
const brlS = n => { n = n||0; if (n >= 1e6) return "R$ " + (n/1e6).toLocaleString("pt-BR",{maximumFractionDigits:2}) + " mi"; if (n >= 1e3) return "R$ " + (n/1e3).toLocaleString("pt-BR",{maximumFractionDigits:1}) + " mil"; return brl(n); };
const pct = x => (x*100).toLocaleString("pt-BR",{maximumFractionDigits:1}) + "%";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const day0 = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
const parseDay = s => { if (!s) return null; const [y,m,d] = String(s).slice(0,10).split("-").map(Number); return new Date(y, m-1, d); };
const elapsed = () => clamp(Math.floor((day0() - Q_START)/864e5) + 1, 0, Q_DAYS);
const expected = () => elapsed() / Q_DAYS;
const who = rc => PLAYERS.filter(p => String(rc||"").includes(id8(p)));

function players(){
  return PLAYERS.map(p => {
    const m = (state.metas||[]).find(r => String(r.u||"").includes(id8(p)));
    const meta = (m && m.meta) || p.meta, metaC = (m && m.ma) || p.metaC;
    const s = (state.sums||[]).find(r => r.p === p.key) || {};
    const fechado = s.a || 0, neg = s.b || 0;
    const contatos = (state.acts||[]).filter(a => who(a.resp).includes(p)).length;
    return { ...p, meta, metaC, fechado, neg, contatos, pc: meta ? fechado/meta : 0 };
  });
}
function ritmo(pc){
  const e = expected(); if (e <= 0) return ["n","Aquecendo"];
  const r = pc / e; return r >= 1 ? ["g","No ritmo"] : r >= .7 ? ["y","Atenção"] : ["r","Abaixo do ritmo"];
}

/* ---------- render ---------- */
function renderHud(list){
  const f = list.reduce((a,p) => a + p.fechado, 0), n = list.reduce((a,p) => a + p.neg, 0);
  const dmg = clamp(f / META_TIME, 0, 1), hit = clamp(n / META_TIME, 0, 1 - dmg);
  $("b-life").style.width = dmg * 100 + "%";
  $("b-hit").style.left = dmg * 100 + "%"; $("b-hit").style.width = hit * 100 + "%";
  $("b-pace").style.left = expected() * 100 + "%";
  $("b-hp").textContent = "Faltam " + brl(Math.max(META_TIME - f, 0));
  $("b-dmg").textContent = brl(f); $("b-pct").textContent = pct(f / META_TIME);
  $("b-neg").textContent = brlS(n); $("b-day").textContent = elapsed();
  $("b-bar").setAttribute("aria-label", `Faltam ${brl(Math.max(META_TIME - f, 0))} de ${brl(META_TIME)}`);
}
let lastRoster = "";
function renderRoster(list){
  const has = !!state.sums;
  const ranked = [...list].sort((a,b) => b.pc - a.pc || b.fechado - a.fechado);
  const html = ranked.map((p,i) => {
    const lead = has && i === 0 && p.fechado > 0;
    const [rc, rt] = has ? ritmo(p.pc) : ["n","Carregando"];
    return `<div class="fighter${lead ? " lead" : ""}" data-key="${p.key}">
      <div class="fig"><div class="actor"><img src="${p.sprite}" alt="${esc(p.nome)}" style="--d:${(i*0.29).toFixed(2)}s"></div></div>
      <div class="plate">
        <div class="row"><span class="nm">${esc(p.nome)}</span><span class="pos num">${i+1}º</span></div>
        <div class="row r2"><span class="lv num">${pct(p.pc)} da meta</span><span class="tag ${rc}">${rt}</span></div>
        <div class="bar xp" title="Fechado sobre a meta individual"><i style="width:${clamp(p.pc,0,1)*100}%"></i><span class="pace" style="left:${expected()*100}%"></span></div>
        <div class="money num">${brlS(p.fechado)}</div>
        <div class="sub num">Meta ${brlS(p.meta)} · <b>${brlS(p.neg)}</b> em negociação</div>
        <div class="row sub num"><span>Contatos na semana</span><b>${p.contatos}/${p.metaC}</b></div>
        <div class="bar en"><i style="width:${p.metaC ? clamp(p.contatos/p.metaC,0,1)*100 : 0}%"></i></div>
      </div>
    </div>`;
  }).join("");
  if (html !== lastRoster) { $("roster").innerHTML = html; lastRoster = html; }
}

/* ---------- lutinha: de tempos em tempos alguém parte pra cima do vizinho ---------- */
const CUIDA = "img/cuida.webp", BOA = "img/boa.webp";
const reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
function replay(el, cls){ el.classList.remove("atk-r","atk-l","hit","win"); void el.offsetWidth; el.classList.add(cls); }
function spark(x, y){
  const r = $("roster"), b = r.getBoundingClientRect(), sp = document.createElement("span");
  sp.className = "spark"; sp.style.left = (x - b.left) + "px"; sp.style.top = (y - b.top) + "px";
  r.appendChild(sp); setTimeout(() => sp.remove(), 600);
}
function cuida(x, y){
  const r = $("roster"), b = r.getBoundingClientRect(), im = document.createElement("img");
  im.className = "cuida"; im.alt = ""; im.src = CUIDA;
  im.style.left = clamp(x - b.left, 90, b.width - 90) + "px"; im.style.top = Math.max(y - b.top - 48, 46) + "px";
  r.appendChild(im); setTimeout(() => im.remove(), 1200);
}
function fight(){
  const fs = [...document.querySelectorAll(".fighter")];
  if (reduceMotion || document.hidden || fs.length < 2) return;
  const PROTEGIDOS = ["mari"]; // ninguém bate na Mari
  const moves = [];
  for (let i = 0; i < fs.length - 1; i++) {
    if (Math.abs(fs[i].getBoundingClientRect().top - fs[i+1].getBoundingClientRect().top) >= 12) continue;
    if (!PROTEGIDOS.includes(fs[i+1].dataset.key)) moves.push([i, i+1]);
    if (!PROTEGIDOS.includes(fs[i].dataset.key)) moves.push([i+1, i]);
  }
  if (!moves.length) return;
  const [a, t] = moves[Math.floor(Math.random() * moves.length)];
  const dir = t > a ? "r" : "l";
  const atk = fs[a].querySelector(".actor"), tgt = fs[t].querySelector(".actor");
  if (atk.classList.contains("win") || tgt.classList.contains("win") || document.querySelector(".boa")) return;
  replay(atk, "atk-" + dir);
  setTimeout(() => {
    tgt.style.setProperty("--rx", dir === "r" ? "5%" : "-5%");
    tgt.style.setProperty("--rr", dir === "r" ? "3deg" : "-3deg");
    replay(tgt, "hit");
    const tb = tgt.querySelector("img").getBoundingClientRect();
    spark(dir === "r" ? tb.left + tb.width * .25 : tb.right - tb.width * .25, tb.top + tb.height * .32);
    cuida(tb.left + tb.width / 2, tb.top - 6);
  }, 190);
  setTimeout(() => { atk.classList.remove("atk-r","atk-l"); tgt.classList.remove("hit"); }, 900);
}
(function loop(){ setTimeout(() => { fight(); loop(); }, 15000 + Math.random() * 15000); })();
function celebrate(key){
  const f = document.querySelector(`.fighter[data-key="${key}"] .actor`);
  if (!f) return;
  const r = $("roster"), b = r.getBoundingClientRect(), tb = f.querySelector("img").getBoundingClientRect();
  const im = document.createElement("img"); im.className = "boa"; im.alt = "Boa!"; im.src = BOA;
  im.style.left = clamp(tb.left + tb.width / 2 - b.left, 100, b.width - 100) + "px";
  im.style.top = Math.max(tb.top - b.top - 40, 50) + "px";
  r.appendChild(im); setTimeout(() => im.remove(), 2500);
  if (!reduceMotion) { replay(f, "win"); setTimeout(() => f.classList.remove("win"), 1100); }
}
function renderFeed(){
  if (!state.wins) return;
  const items = [...state.wins].sort((a,b) => String(b.d).localeCompare(String(a.d))).slice(0, 4);
  $("feed").innerHTML = items.length ? items.map(w => {
    const ps = who(w.rc), d = parseDay(w.d);
    return `<li><span class="av" style="background-image:url(${ps[0] ? ps[0].avatar : ""})"></span>
      <span class="w">${esc(ps.map(p => p.nome).join(" + "))} <span>· ${d ? d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}) : ""}</span></span>
      <span class="v num">+${brlS(w.a)}</span>
      <span class="t" title="${esc(w.nome)}">${esc(w.nome)}</span></li>`;
  }).join("") : `<li class="empty" style="display:block;border:0">Nenhuma venda ganha no Q4 ainda. A primeira aparece aqui.</li>`;
}
function renderChart(list){
  const cv = $("chart"), box = cv.parentElement, W = box.clientWidth, H = box.clientHeight;
  if (!W || !H) return;
  const dpr = window.devicePixelRatio || 1; cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
  const g = cv.getContext("2d"); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);
  const fs = Math.round(clamp(H / 30, 11, 22)), pad = { l:fs*4, r:fs*6.5, t:10, b:fs*2.4 }, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const series = list.map(p => {
    let acc = 0; const pts = [{d:0,y:0}];
    (state.wins||[]).filter(w => who(w.rc).some(q => q.key === p.key))
      .map(w => ({ d: clamp(Math.floor((parseDay(w.d) - Q_START)/864e5), 0, Q_DAYS), v: w.a || 0 }))
      .sort((a,b) => a.d - b.d).forEach(w => { acc += w.v; pts.push({ d:w.d, y: p.meta ? acc/p.meta : 0 }); });
    pts.push({ d: elapsed(), y: p.meta ? acc/p.meta : 0 });
    return { p, pts };
  });
  const maxY = Math.max(.25, Math.ceil(Math.max(expected(), ...series.flatMap(s => s.pts.map(q => q.y))) * 4) / 4);
  const X = d => pad.l + d / Q_DAYS * iw, Y = y => pad.t + ih - y / maxY * ih;
  g.font = `500 ${fs}px Montserrat, Arial, sans-serif`; g.textBaseline = "middle";
  for (let i = 0; i <= 4; i++) { const v = maxY * i / 4, y = Math.round(Y(v)) + .5;
    g.strokeStyle = "#232327"; g.lineWidth = 1; g.beginPath(); g.moveTo(pad.l, y); g.lineTo(pad.l + iw, y); g.stroke();
    g.fillStyle = "#6e6e75"; g.textAlign = "right"; g.fillText(Math.round(v*100) + "%", pad.l - fs*.7, y); }
  g.textAlign = "center"; g.textBaseline = "top";
  [["out",15],["nov",46],["dez",76]].forEach(([t,d]) => { g.fillStyle = "#6e6e75"; g.fillText(t, X(d), H - pad.b + fs*.7); });
  const yEnd = Math.min(1, maxY);
  g.setLineDash([4,4]); g.strokeStyle = "#55555c"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(yEnd * Q_DAYS), Y(yEnd)); g.stroke(); g.setLineDash([]);
  const labels = [];
  series.forEach(({p, pts}) => {
    g.strokeStyle = p.cor; g.lineWidth = 2.5; g.lineJoin = "round"; g.beginPath();
    pts.forEach((q,i) => { if (i === 0) g.moveTo(X(q.d), Y(q.y)); else { g.lineTo(X(q.d), Y(pts[i-1].y)); g.lineTo(X(q.d), Y(q.y)); } });
    g.stroke();
    const last = pts[pts.length-1]; g.fillStyle = p.cor; g.beginPath(); g.arc(X(last.d), Y(last.y), 4, 0, Math.PI*2); g.fill();
    labels.push({ y: Y(last.y), x: X(last.d), p });
  });
  labels.sort((a,b) => b.y - a.y);
  for (let i = 1; i < labels.length; i++) if (labels[i-1].y - labels[i].y < fs*1.4) labels[i].y = labels[i-1].y - fs*1.4;
  g.font = `800 ${fs+1}px Montserrat, Arial, sans-serif`; g.textAlign = "left"; g.textBaseline = "middle";
  labels.forEach(l => { g.fillStyle = l.p.cor; g.fillText(l.p.nome.toUpperCase(), Math.min(l.x + fs, W - pad.r + fs*.7), l.y); });
}
function renderAll(){
  const list = players();
  renderHud(list); renderRoster(list); renderFeed(); renderChart(list);
  $("err").textContent = state.err.ent || "";
}

/* ---------- venda nova: aviso na tela ---------- */
let seen = null, toastQ = [], toastBusy = false;
function checkNewWins(){
  if (!state.wins) return;
  const keys = state.wins.map(w => (w.u || w.nome) + "|" + w.a);
  if (seen === null) { seen = new Set(keys); return; }
  state.wins.forEach((w,i) => { if (!seen.has(keys[i])) { seen.add(keys[i]); toastQ.push(w); } });
  nextToast();
}
function nextToast(){
  if (toastBusy || !toastQ.length) return;
  const w = toastQ.shift(), ps = who(w.rc); toastBusy = true;
  $("toast-img").src = ps[0] ? ps[0].sprite : "";
  $("toast-t").textContent = `${ps.map(p => p.nome.toUpperCase()).join(" + ")} +${brl(w.a)}`;
  $("toast").classList.add("show"); if (ps[0]) celebrate(ps[0].key);
  setTimeout(() => { $("toast").classList.remove("show"); setTimeout(() => { toastBusy = false; nextToast(); }, 500); }, 6000);
}

/* ---------- dados ao vivo (função /api/data lê o Notion), a cada 10 s ---------- */
function setLive(on, text){ $("live").className = "live " + (on ? "on" : "off"); $("live-t").textContent = text; }
const KEY = new URLSearchParams(location.search).get("k") || "";
let busy = false, stopped = false;
async function tick(){
  if (busy || stopped || document.hidden) return;
  busy = true;
  try {
    const r = await fetch("api/data" + (KEY ? "?k=" + encodeURIComponent(KEY) : ""), { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { stopped = true; state.err.ent = "Link sem a chave de acesso. Use o link completo enviado pelo Nery."; setLive(false, "Sem acesso"); }
    else if (!r.ok) {
      state.err.ent = j.error === "missing_token" ? "Falta configurar o NOTION_TOKEN na Vercel."
        : (j.error === "unauthorized" || j.error === "object_not_found" || j.error === "restricted_resource") ? "A integração do Notion não tem acesso às bases. Compartilhe Entregas Produtora, Atividades e Metas do time com ela."
        : "Notion instável agora. Mostrando os últimos números.";
      setLive(false, "Instável · tentando de novo");
    } else {
      state.sums = j.sums; state.wins = j.wins; state.acts = j.acts; state.metas = j.metas; delete state.err.ent;
      setLive(true, "Ao vivo · " + new Date(j.at).toLocaleTimeString("pt-BR"));
    }
  } catch (_) { state.err.ent = "Sem conexão. Mostrando os últimos números."; setLive(false, "Sem conexão"); }
  renderAll(); checkNewWins();
  busy = false;
}
function boot(){
  renderAll(); tick();
  setInterval(tick, POLL_MS);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
}

let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => renderChart(players()), 120); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => renderChart(players()));
boot();
