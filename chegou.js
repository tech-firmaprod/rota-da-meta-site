/* "Esse homem chegou": aparece a cada venda nova, logo depois do BOA */
(function(){
  const SRC = "img/chegou.png";
  const st = document.createElement("style");
  st.textContent = `.chegou{position:absolute;left:50%;bottom:4%;width:min(56%,820px);height:auto;image-rendering:pixelated;z-index:50;pointer-events:none;transform:translateX(-50%);filter:drop-shadow(6px 6px 0 rgba(0,0,0,.7));animation:chegou 4.2s steps(24,end) forwards}

.chegou-dim{position:absolute;inset:0;z-index:49;pointer-events:none;background:radial-gradient(70% 70% at 50% 75%,rgba(0,0,0,.8),rgba(0,0,0,.45));animation:chegouDim 4.2s ease forwards}
@keyframes chegouDim{0%{opacity:0}10%,86%{opacity:1}100%{opacity:0}}
@keyframes chegou{0%{transform:translate(-50%,130%)}12%{transform:translate(-50%,-5%)}17%{transform:translate(-50%,0)}86%{transform:translate(-50%,0);opacity:1}100%{transform:translate(-50%,0);opacity:0}}`;
  document.head.appendChild(st);
  new Image().src = SRC;
  function show(){
    const b = document.getElementById("board") || document.querySelector(".stage"); if (!b) return;
    const dim = document.createElement("div"); dim.className = "chegou-dim";
    const im = document.createElement("img"); im.className = "chegou"; im.src = SRC; im.alt = "Esse homem chegou!";
    b.appendChild(dim); b.appendChild(im); setTimeout(() => { im.remove(); dim.remove(); }, 4300);
  }
  const orig = window.celebrate;
  window.celebrate = function(key){ if (orig) orig(key); setTimeout(show, 2200); };
})();
