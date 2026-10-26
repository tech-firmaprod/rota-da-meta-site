// Rota da Meta — lê o Notion e devolve os números do placar.
// Variáveis de ambiente na Vercel:
//   NOTION_TOKEN  (obrigatória) segredo da integração interna do Notion
//   ARENA_KEY     (opcional) se definida, o link precisa ter ?k=<valor>
const NOTION = "https://api.notion.com/v1";
const VERSION = "2025-09-03";
const DS_ENT = "28d0d857-75f7-8161-96b8-000bfd8bd02d";
const DS_ATV = "352e036f-e098-4de6-890d-6455c88613c2";
const DS_MET = "ef449b60-9158-453b-9083-844f4aa28e23";
const PLAYERS = {
  nery: "09cd636e-eb27-415f-8ff1-d4daa89bf96d",
  orlando: "2cad872b-594c-81ac-a0f4-00026028600b",
  mari: "2fdd872b-594c-8133-a18b-000234729d1d",
  silas: "33ad872b-594c-813b-baf2-00028fd4ef06",
};

let cache = { at: 0, body: null }, pending = null;

async function queryAll(ds, body) {
  const out = []; let cursor;
  do {
    const r = await fetch(`${NOTION}/data_sources/${ds}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.NOTION_TOKEN}`, "Notion-Version": VERSION, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    const j = await r.json();
    if (!r.ok) { const e = new Error(j.message || `Notion ${r.status}`); e.status = r.status; e.code = j.code; throw e; }
    out.push(...j.results); cursor = j.has_more ? j.next_cursor : null;
  } while (cursor);
  return out;
}
const people = p => (p && p.people ? p.people.map(u => u.id) : []);
const sel = p => (p && p.select ? p.select.name : (p && p.status ? p.status.name : ""));
const num = p => (p && typeof p.number === "number" ? p.number : 0);
const day = p => (p && p.date && p.date.start ? p.date.start.slice(0, 10) : null);
const title = p => (p && p.title ? p.title.map(t => t.plain_text).join("") : "");

function weekStartBR() {
  const now = new Date(Date.now() - 3 * 3600e3); // horário de Brasília/Fortaleza
  const dow = (now.getUTCDay() + 6) % 7;
  const w = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow));
  return w.toISOString().slice(0, 10);
}

let metasCache = { at: 0, rows: null };
async function metasRows() {
  if (!metasCache.rows || Date.now() - metasCache.at > 300000) metasCache = { at: Date.now(), rows: await queryAll(DS_MET, {}) };
  return metasCache.rows;
}

async function build() {
  const ids = Object.values(PLAYERS);
  const [ent, atv, met] = await Promise.all([
    queryAll(DS_ENT, { filter: { and: [
      { or: ids.map(id => ({ property: "Responsável Comercial", people: { contains: id } })) },
      { or: [
        { property: "Status do Lead", select: { equals: "Venda Ganha" } },
        { property: "Criado em", created_time: { on_or_after: "2026-06-01" } },
      ] },
    ] } }),
    queryAll(DS_ATV, { filter: { property: "Data", date: { on_or_after: weekStartBR() } } }),
    metasRows(),
  ]);

  const sums = Object.fromEntries(Object.keys(PLAYERS).map(k => [k, { p: k, a: 0, b: 0 }]));
  const wins = [];
  for (const pg of ent) {
    const P = pg.properties, rc = people(P["Responsável Comercial"]);
    const status = sel(P["Status do Lead"]), fase = sel(P["Fase Atual"]);
    const v = num(P["Valor da Venda"]), created = (pg.created_time || "").slice(0, 10);
    const d = day(P["Data da Venda"]) || created;
    const won = status === "Venda Ganha" && d >= "2026-10-01";
    const open = !["Venda Ganha", "Venda Perdida"].includes(status) && !["Declinado", "Projeto Finalizado"].includes(fase) && created >= "2026-06-01";
    for (const [k, id] of Object.entries(PLAYERS)) if (rc.includes(id)) { if (won) sums[k].a += v; if (open) sums[k].b += v; }
    if (won) wins.push({ nome: title(P["Nome"]), rc, a: v, d, u: pg.id });
  }
  const acts = atv.map(pg => ({ resp: people(pg.properties["Responsável"]), tipo: sel(pg.properties["Tipo"]) }));
  const metas = met.map(pg => ({ meta: num(pg.properties["Meta Q4 (R$)"]), ma: num(pg.properties["Meta contatos/semana"]), u: people(pg.properties["Usuário"]) }));
  return { sums: Object.values(sums), wins, acts, metas, at: Date.now() };
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const key = process.env.ARENA_KEY;
  if (key && (req.query || {}).k !== key) return res.status(401).json({ error: "unauthorized" });
  if (!process.env.NOTION_TOKEN) return res.status(500).json({ error: "missing_token" });
  try {
    if (!cache.body || Date.now() - cache.at > 1500) {
      if (!pending) pending = build().finally(() => { pending = null; });
      cache = { at: Date.now(), body: await pending };
    }
    res.status(200).json(cache.body);
  } catch (e) {
    // Notion pediu calma (limite de ~3 consultas/s): mostra o último resultado bom
    if (cache.body) return res.status(200).json(cache.body);
    res.status(502).json({ error: e.code || "notion_error", message: e.message });
  }
};
