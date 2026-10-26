/* Recarrega sozinho quando sai uma versão nova do painel (útil na TV)
   e segura as consultas ao Notion em 1 a cada 30 s, para caber no plano gratuito da Vercel. */
(function(){
  const GAP = 30000;
  const rawFetch = window.fetch.bind(window);
  let lastAt = 0, lastBody = null;
  window.fetch = function(u, o){
    if (String(u).indexOf("api/data") === 0) {
      if (lastBody !== null && Date.now() - lastAt < GAP)
        return Promise.resolve(new Response(lastBody, { status: 200, headers: { "Content-Type": "application/json" } }));
      return rawFetch(u, o).then(r => {
        if (r.ok) r.clone().text().then(t => { lastBody = t; lastAt = Date.now(); });
        return r;
      });
    }
    return rawFetch(u, o);
  };
  let base = null;
  async function check(){
    try {
      const t = await (await rawFetch("index.html", { cache: "no-store" })).text();
      if (base === null) base = t; else if (t !== base) location.reload();
    } catch (_) {}
  }
  check(); setInterval(check, 600000);
})();
