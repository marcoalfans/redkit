/* ============================================================
   RedKit Agent — drop-in pixel mascot for the sidebar
   Usage:
     1) Put a container below your <nav>:  <div id="rk-agent"></div>
     2) Load this file:  <script src="agent.js" defer></script>
   Everything else (canvas, bubbles, styles) is built by this script.
   Tweak the CONFIG block below to taste.
   ============================================================ */
(() => {
  "use strict";

  const CONFIG = {
    mount: "#rk-agent",      // container element (placed right after </nav>)
    scale: 5,                // pixel size of the sprite
    speed: 0.08,             // walking speed (px per ms)
    restMultiplier: 2,       // pause time at a corner = this × one round trip
    angryMs: 1700,           // how long the angry reaction lasts

    // Sprite palette ('.' = transparent). Match these to your theme if you like.
    palette: { o:"#3d0a0a", r:"#e0312f", R:"#b71d1c", k:"#160606", g:"#ff5a5a", d:"#240707" },
    // Bubble theme
    theme: { red:"#e0312f", redDim:"#7a1614", bubble:"#1b1414", text:"#e9d4d4", muted:"#7a6a6a" },

    thoughts: [
      { h:"recon...",  items:["subdomains?","open ports","JS endpoints","tech stack"] },
      { h:"exploit?",  items:["SQLi","reflected XSS","IDOR","SSRF"] },
      { h:"auth bugs", items:["JWT alg=none","OAuth redirect","session fixation","MFA bypass"] },
      { h:"report",    items:["CVSS 4.0","PoC chain","impact","remediation"] },
    ],
    shouts: ["DON'T BUG ME! 😤", "GRRR! I'm busy!", "BACK OFF!", "stop poking me!!"],
  };

  // ---------- sprite (16 wide, big head / small body) ----------
  const HEAD_BODY = [
    "....oooooo......", "..oorrrrrroo....", ".orrrrrrrrrro...",
    "orrrrrrrrrrrro..", "orrkkkkkkkkrro..", "orrkggkkggkrro..",
    "orrkggkkggkrro..", "orrkkkkkkkkrro..", ".orrkkkkkkrro...",
    "..orrrrrrrro....", "..orrrrrrrro....", "..odrrrrrrdo....",
    "..orrrrrrrro....",
  ];
  const ANGRY_HEAD = HEAD_BODY.slice();
  ANGRY_HEAD[4] = "orrkddddddkrro..";
  ANGRY_HEAD[8] = ".orrkddddkrro...";
  const LEGS_A     = [ "..orro..orro....", "..orro..orro....", "..orro...oo.....", "..oddo.........." ];
  const LEGS_B     = [ "..orro..orro....", "..orro..orro....", "...oo...orro....", "........oddo...." ];
  const LEGS_STAND = [ "..orro..orro....", "..orro..orro....", "..orro..orro....", "..oddo..oddo...." ];
  const FRAME_A=HEAD_BODY.concat(LEGS_A), FRAME_B=HEAD_BODY.concat(LEGS_B);
  const FRAME_REST=HEAD_BODY.concat(LEGS_STAND), FRAME_ANGRY=ANGRY_HEAD.concat(LEGS_STAND);
  const SPR_W=16, SPR_H=17;

  function init() {
    const host = document.querySelector(CONFIG.mount);
    if (!host) { console.warn("[redkit-agent] mount not found:", CONFIG.mount); return; }

    const T = CONFIG.theme, SCALE = CONFIG.scale, PW = SPR_W * SCALE;

    // ---------- inject scoped CSS once ----------
    if (!document.getElementById("rk-agent-style")) {
      const st = document.createElement("style");
      st.id = "rk-agent-style";
      st.textContent = `
        #rk-agent-host { position: relative; overflow: visible; width: 100%; }
        #rk-agent-host canvas { display:block; width:100%; image-rendering:pixelated; image-rendering:crisp-edges; cursor:pointer; }
        .rk-think { position:absolute; width:184px; pointer-events:none; z-index:60;
          background:${T.bubble}; border:1px solid ${T.redDim}; border-radius:10px; padding:8px 11px;
          opacity:0; transition:opacity .22s ease; box-shadow:0 8px 24px rgba(0,0,0,.5);
          font:11px ui-monospace,Menlo,Consolas,monospace; }
        .rk-think.show { opacity:1; }
        .rk-think .rk-tail { position:absolute; bottom:-8px; width:0; height:0;
          border-left:8px solid transparent; border-right:8px solid transparent; border-top:9px solid ${T.bubble}; }
        .rk-th-h { color:${T.red}; font-size:12px; font-weight:700; margin-bottom:4px; }
        .rk-th-i { color:${T.text}; line-height:1.55; }
        .rk-th-i .rk-arr { color:${T.redDim}; }
        .rk-fade { opacity:0; animation:rk-fadein .3s ease forwards; }
        @keyframes rk-fadein { from{opacity:0; transform:translateY(3px);} to{opacity:1; transform:none;} }
        .rk-shout { position:absolute; pointer-events:none; z-index:60; opacity:0;
          background:${T.red}; color:#fff; font-weight:700; font-size:12px; padding:5px 9px; border-radius:8px;
          white-space:nowrap; box-shadow:0 6px 18px rgba(224,49,47,.45); transition:opacity .12s ease;
          font-family:ui-monospace,Menlo,Consolas,monospace; }
        .rk-shout.show { opacity:1; }
        .rk-shout .rk-tail { position:absolute; bottom:-7px; left:14px; width:0; height:0;
          border-left:7px solid transparent; border-right:7px solid transparent; border-top:8px solid ${T.red}; }
      `;
      document.head.appendChild(st);
    }

    // ---------- build DOM ----------
    host.id = host.id || "rk-agent";
    host.setAttribute("id", host.id);
    host.classList.add("rk-host");
    host.style.position = host.style.position || "relative";
    // mark host for CSS hook
    const styleHostId = "rk-agent-host";
    host.setAttribute("data-rk", "1");
    // use an inner wrapper carrying the canvas styles
    const wrap = document.createElement("div");
    wrap.id = styleHostId; wrap.style.position = "relative"; wrap.style.overflow = "visible";
    const cv = document.createElement("canvas");
    wrap.appendChild(cv);
    const think = document.createElement("div");
    think.className = "rk-think";
    think.innerHTML = `<div class="rk-thbody"></div><div class="rk-tail" id="rk-thtail"></div>`;
    const shout = document.createElement("div");
    shout.className = "rk-shout";
    shout.innerHTML = `<span class="rk-shouttxt"></span><div class="rk-tail"></div>`;
    wrap.appendChild(think); wrap.appendChild(shout);
    host.appendChild(wrap);

    const ctx = cv.getContext("2d");
    const thbody = think.querySelector(".rk-thbody");
    const thtail = think.querySelector("#rk-thtail");
    const shouttxt = shout.querySelector(".rk-shouttxt");

    // ---------- sizing (responsive to sidebar width) ----------
    let maxX, minX = 8, floorY;
    function fit() {
      const w = Math.max(120, Math.round(wrap.clientWidth || host.clientWidth || 200));
      cv.width = w;
      cv.height = SPR_H * SCALE + 12;
      floorY = cv.height - SPR_H * SCALE - 4;
      maxX = cv.width - PW - 8;
      if (x > maxX) x = maxX;
    }

    function drawSprite(frame, px, py, flip, blink) {
      ctx.save(); ctx.translate(px, py);
      if (flip) { ctx.translate(PW, 0); ctx.scale(-1, 1); }
      for (let r=0; r<frame.length; r++) for (let c=0; c<frame[r].length; c++) {
        let ch = frame[r][c]; if (ch === ".") continue;
        if (blink && ch === "g") ch = "k";
        ctx.fillStyle = CONFIG.palette[ch] || "#f0f";
        ctx.fillRect(c*SCALE, r*SCALE, SCALE, SCALE);
      }
      ctx.restore();
    }

    // ---------- state ----------
    const speed = CONFIG.speed;
    let x = minX, dir = 1, mode = "walk", last = performance.now();
    let restEndsAt=0, angryEndsAt=0, prevMode="walk", restRemaining=0;
    let restSide="left", currentTh=null, nextBlink=last+2500, blinkUntil=0;
    fit();

    let REST_MS = 0;
    function computeRest() {
      const oneWay = (maxX - minX) / speed;
      REST_MS = CONFIG.restMultiplier * (2 * oneWay);
    }
    computeRest();

    function metrics() {
      const sx = cv.clientWidth / cv.width, sy = cv.clientHeight / cv.height;
      return { left: cv.offsetLeft + x*sx, top: cv.offsetTop + floorY*sy, sx };
    }
    function buildThought(d) {
      let html = `<div class="rk-th-h rk-fade" style="animation-delay:0s">${d.h}</div>`;
      d.items.forEach((it,i)=> html += `<div class="rk-th-i rk-fade" style="animation-delay:${0.18+i*0.14}s"><span class="rk-arr">↳</span> ${it}</div>`);
      thbody.innerHTML = html;
    }
    function placeThink() {
      const m = metrics(), bw = think.offsetWidth, bh = think.offsetHeight;
      let left = (restSide==="left") ? m.left + PW*m.sx - 6 : m.left - bw + PW*m.sx + 6;
      left = Math.max(2, Math.min(left, wrap.clientWidth - bw - 2));
      think.style.left = left + "px";
      think.style.top  = (m.top - bh - 8) + "px";
      thtail.style.left = (restSide==="left") ? "16px" : (bw-32) + "px";
    }
    function startRest(now) {
      mode="rest"; restEndsAt = now + REST_MS;
      restSide = (x <= (minX+maxX)/2) ? "left" : "right";
      currentTh = CONFIG.thoughts[(Math.random()*CONFIG.thoughts.length)|0];
      buildThought(currentTh); placeThink(); think.classList.add("show");
    }
    function endRest() { think.classList.remove("show"); mode="walk"; dir=-dir; }
    function placeShout() {
      const m = metrics();
      let left = m.left + (PW*m.sx)/2 - 24;
      left = Math.max(2, Math.min(left, wrap.clientWidth - 60));
      shout.style.left = left + "px";
      shout.style.top  = (m.top - 36) + "px";
    }
    function triggerAngry(now) {
      if (mode==="angry") return;
      prevMode = mode; restRemaining = (mode==="rest") ? (restEndsAt-now) : 0;
      think.classList.remove("show");
      mode="angry"; angryEndsAt = now + CONFIG.angryMs;
      shouttxt.textContent = CONFIG.shouts[(Math.random()*CONFIG.shouts.length)|0];
      placeShout(); shout.classList.add("show");
    }
    function endAngry(now) {
      shout.classList.remove("show"); mode = prevMode;
      if (mode==="rest") { restEndsAt = now + Math.max(restRemaining,600); buildThought(currentTh); placeThink(); think.classList.add("show"); }
    }
    cv.addEventListener("click", () => triggerAngry(performance.now()));

    // resize handling
    if (window.ResizeObserver) new ResizeObserver(() => { fit(); computeRest(); }).observe(wrap);
    else window.addEventListener("resize", () => { fit(); computeRest(); });

    // ---------- reduced motion: render a single static idle frame ----------
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ctx.clearRect(0,0,cv.width,cv.height);
      drawSprite(FRAME_REST, Math.round((cv.width-PW)/2), Math.round(floorY), false, false);
      return;
    }

    // ---------- main loop ----------
    function loop(t) {
      const dt = t - last; last = t;
      let frame, yOff=0, xShake=0, flip=(dir<0), blink=false;

      if (mode==="angry") {
        if (t>angryEndsAt) endAngry(t);
        else { xShake=(Math.random()-0.5)*6; yOff=(Math.random()-0.5)*4; frame=FRAME_ANGRY; }
      }
      if (mode==="walk") {
        x += dir*speed*dt;
        if (x>=maxX) { x=maxX; startRest(t); }
        else if (x<=minX) { x=minX; startRest(t); }
        if (mode==="walk") { const even=((t/160)|0)%2===0; frame=even?FRAME_A:FRAME_B; yOff=even?0:SCALE; }
      } else if (mode==="rest") {
        if (t>restEndsAt) endRest(t);
        else { frame=FRAME_REST; yOff=Math.sin(t/600)*1.5; }
      }
      if (mode!=="angry") {
        if (t>nextBlink) { blinkUntil=t+130; nextBlink=t+2600+Math.random()*1600; }
        blink = t<blinkUntil;
      }

      ctx.clearRect(0,0,cv.width,cv.height);
      ctx.strokeStyle = "rgba(224,49,47,.20)"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(0, floorY+SPR_H*SCALE+1.5); ctx.lineTo(cv.width, floorY+SPR_H*SCALE+1.5); ctx.stroke();

      if (frame) drawSprite(frame, Math.round(x+xShake), Math.round(floorY+yOff), flip, blink);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
