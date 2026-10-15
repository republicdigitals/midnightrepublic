// Office floor (3/4 top-down): walled rooms with door gaps, grid A* pathing, speech bubbles.
(function () {
  const C = window.HQ_CONFIG;
  const W = 41, H = 27;
  const ROOMS = [
    { id: "research", name: "Research Floor", x: 0, y: 0, w: 18, h: 10, floor: "#1d4a3c" },
    { id: "consul", name: "Consul's Office", x: 18, y: 0, w: 12, h: 10, floor: "#e6e1d4", light: true },
    { id: "conference", name: "Conference", x: 30, y: 0, w: 10, h: 10, floor: "#22384f" },
    { id: "hall", name: "", x: 0, y: 10, w: 40, h: 4, floor: "#2a3644" },
    { id: "outreach", name: "Outreach Floor", x: 0, y: 14, w: 19, h: 12, floor: "#1a3147" },
    { id: "lounge", name: "Lounge", x: 19, y: 14, w: 10, h: 7, floor: "#2b4a3a" },
    { id: "kitchen", name: "Kitchen", x: 29, y: 14, w: 6, h: 7, floor: "#3a3f46" },
    { id: "wc", name: "WC", x: 35, y: 14, w: 5, h: 7, floor: "#38474f" },
    { id: "entrance", name: "Entrance", x: 19, y: 21, w: 21, h: 5, floor: "#2f2a22" }
  ];
  const DOORS = [[8, 10], [9, 10], [23, 10], [24, 10], [34, 10], [35, 10], [9, 14], [10, 14], [23, 14], [24, 14],
    [31, 14], [32, 14], [37, 14], [19, 23], [19, 24], [23, 21], [24, 21]];
  const FRONT_DOOR = [[29, 26], [30, 26]];
  // Furniture blocks [x, y, w, h, color, label]
  const FURN = [
    [2, 2, 3, 2, "#6b5530", "desk"], [6, 2, 3, 2, "#6b5530", "desk"], [10, 2, 3, 2, "#6b5530", "desk"], [14, 2, 3, 2, "#6b5530", "desk"],
    [2, 6, 9, 1, "#2c3e50", "board"], [14, 7, 3, 1, "#9b8b66", "shelf"],
    [22, 3, 5, 2, "#b9a57a", "consul-desk"], [19, 4, 1, 4, "#9b8b66", "shelf"], [29, 4, 1, 4, "#9b8b66", "shelf"],
    [32, 3, 6, 3, "#5a4630", "table"],
    [2, 17, 3, 2, "#6b5530", "desk"], [8, 17, 3, 2, "#6b5530", "desk"], [14, 17, 3, 2, "#6b5530", "desk"],
    [2, 22, 3, 2, "#6b5530", "desk"], [8, 22, 3, 2, "#6b5530", "desk"], [14, 22, 3, 2, "#6b5530", "desk"],
    [21, 15, 6, 1, "#3d6b55", "sofa"], [22, 18, 4, 1, "#5a4630", "coffee"],
    [30, 19, 4, 1, "#7d8590", "counter"], [36, 19, 3, 1, "#c8ccd0", "sink"],
    [27, 23, 5, 1, "#6b5530", "reception"], [34, 15, 1, 1, "#d0d4d8", "fridge"],
    ...[[17, 1], [1, 9], [17, 9], [19, 1], [29, 1], [19, 9], [29, 9], [39, 1], [39, 9], [1, 15], [18, 15], [18, 25], [28, 20], [38, 22], [38, 25], [20, 25]]
      .map(([x, y]) => [x, y, 1, 1, "", "plant"])
  ];
  const SPOTS = {
    devinDesk: [3, 4], leadBoard: [6, 7], consulChair: [24, 2], consulVisitor: [24, 6],
    rdesk1: [7, 4], rdesk2: [11, 4], rdesk3: [15, 4], caesarSide: [4, 5], rside1: [8, 5], rside2: [12, 5], rside3: [16, 5], shelfR: [15, 6],
    conf1: [33, 7], conf2: [36, 7], conf3: [36, 2], conf4: [33, 2],
    desk1: [3, 19], desk2: [9, 19], desk3: [15, 19], desk4: [3, 24], desk5: [9, 24], desk6: [15, 24],
    lounge1: [21, 16], lounge2: [23, 16], lounge3: [25, 16], lounge4: [24, 19],
    kitchen: [31, 17], wc: [37, 17], entrance: [29, 24], hall1: [12, 12], hall2: [28, 12]
  };
  const HOME = { devin: "devinDesk", livia: "rdesk1", marcus: "rdesk2", octavia: "rdesk3", cassius: "consulChair", maren: "desk1", imogen: "desk2", ash: "desk3", kira: "desk4" };

  const blocked = [];
  for (let y = 0; y <= H; y++) { blocked[y] = []; for (let x = 0; x <= W; x++) blocked[y][x] = false; }
  ROOMS.forEach((r) => {
    for (let x = r.x; x <= r.x + r.w; x++) { blocked[r.y][x] = true; blocked[r.y + r.h][x] = true; }
    for (let y = r.y; y <= r.y + r.h; y++) { blocked[y][r.x] = true; blocked[y][r.x + r.w] = true; }
  });
  DOORS.forEach(([x, y]) => (blocked[y][x] = false));
  FURN.forEach(([fx, fy, fw, fh]) => { for (let y = fy; y < fy + fh; y++) for (let x = fx; x < fx + fw; x++) blocked[y][x] = true; });
  const walkable = (x, y) => x >= 0 && y >= 0 && x <= W && y <= H && !blocked[y][x];

  function astar(s, g) {
    const key = (x, y) => y * 100 + x;
    const open = [{ x: s[0], y: s[1], f: 0 }], came = new Map(), cost = new Map([[key(s[0], s[1]), 0]]);
    const h = (x, y) => Math.hypot(x - g[0], y - g[1]);
    while (open.length) {
      open.sort((a, b) => a.f - b.f);
      const cur = open.shift();
      if (cur.x === g[0] && cur.y === g[1]) {
        const path = [[cur.x, cur.y]]; let k = key(cur.x, cur.y);
        while (came.has(k)) { const p = came.get(k); path.unshift(p); k = key(p[0], p[1]); }
        return path;
      }
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const nx = cur.x + dx, ny = cur.y + dy;
        if (!walkable(nx, ny)) continue;
        if (dx && dy && (!walkable(cur.x + dx, cur.y) || !walkable(cur.x, cur.y + dy))) continue;
        const nc = cost.get(key(cur.x, cur.y)) + (dx && dy ? 1.414 : 1);
        if (nc < (cost.get(key(nx, ny)) ?? Infinity)) {
          cost.set(key(nx, ny), nc); came.set(key(nx, ny), [cur.x, cur.y]);
          open.push({ x: nx, y: ny, f: nc + h(nx, ny) });
        }
      }
    }
    return null;
  }

  const agents = C.agents.map((a) => {
    const p = SPOTS[HOME[a.id]];
    return Object.assign({}, a, { x: p[0], y: p[1], path: [], bubble: null, bubbleUntil: 0, busyUntil: 0, onArrive: null });
  });
  const byId = Object.fromEntries(agents.map((a) => [a.id, a]));

  function goToTile(a, t, onArrive) {
    const path = astar([Math.round(a.x), Math.round(a.y)], t);
    if (!path) return false;
    a.path = path.slice(1); a.onArrive = onArrive || null;
    if (!a.path.length && a.onArrive) { a.onArrive = null; onArrive(); }
    return true;
  }
  const goTo = (a, spot, onArrive) => goToTile(a, SPOTS[spot], onArrive);
  function goNear(a, b, onArrive) {
    const bx = Math.round(b.x), by = Math.round(b.y);
    const t = [[1, 0], [-1, 0], [0, 1], [1, 1], [-1, 1], [0, -1]].map(([dx, dy]) => [bx + dx, by + dy]).find(([x, y]) => walkable(x, y));
    return t ? goToTile(a, t, onArrive) : false;
  }
  function say(a, text, secs) { a.bubble = text; a.bubbleUntil = performance.now() + (secs || 4) * 1000; }
  const idle = (a) => !a.path.length && performance.now() > a.busyUntil;
  const wait = (a, secs) => (a.busyUntil = performance.now() + secs * 1000);

  let stats = null;
  let lastScript = 0, lastResearch = 0, lastChat = 0;
  let pending = 0, briefing = false;
  const RESEARCH = ["livia", "marcus", "octavia"];
  const OUTREACH = ["maren", "imogen", "ash", "kira"];
  const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const later = (secs, f) => setTimeout(f, secs * 1000);
  const home = (a, cb) => goTo(a, HOME[a.id], cb);

  // Caesar's team is "on a run" while his last lead push is under an hour old.
  function researchActive() {
    const e = stats && (stats.events || []).find((x) => x.who !== "Cassius");
    return !!e && Date.now() - new Date(e.t).getTime() < 3600000;
  }

  // The only time Caesar briefs Cassius: right after a lead push lands.
  function briefOnPush() {
    const d = byId.devin, o = byId.octavia, cas = byId.cassius;
    if (!pending || briefing || !idle(d) || !idle(o) || !idle(cas) || !stats) return;
    const n = pending; pending = 0; briefing = true;
    const total = stats.leads.total;
    goTo(o, "caesarSide", () => {
      say(o, `Batch verified: +${n} leads`, 4);
      HQLog.add(o.name, `verified a batch of ${n} new leads for ${d.name}.`);
      later(3, () => {
        home(o);
        goTo(d, "consulVisitor", () => {
          say(d, `+${n} leads pushed. Pool now ${total}`, 4);
          HQLog.add(d.name, `briefed Cassius: +${n} leads, pool now ${total} (${stats.leads.with_email} with email).`);
          later(3, () => {
            const active = HQData.outreachActive();
            say(cas, active ? "Good. Maren takes it from here." : "Logged. Outreach stays paused.", 4);
            HQLog.add("Cassius", active ? "routed the new leads to Maren." : "logged the count. Outreach remains paused.");
            later(3, () => {
              home(d, () => { briefing = false; });
              if (!active) return;
              const m = byId.maren;
              goTo(cas, "desk1", () => {
                say(cas, `${n} fresh leads from ${d.name}`, 3); say(m, "On it", 3);
                later(3, () => home(cas));
              });
            });
          });
        });
      });
    });
  }

  // Scout -> Profiler -> Verifier, only while a run is going.
  function researchLoop() {
    const [l, m, o] = RESEARCH.map((id) => byId[id]), now = performance.now();
    if (now - lastResearch < 22000 || ![l, m, o].every(idle)) return;
    lastResearch = now;
    const r = Math.random();
    if (r < 0.5) {
      goTo(l, "rside2", () => {
        say(l, rnd(["Tagged venue in a reel caption", "Chef-driven spot, worth a look", "New restaurant from Explore businesses", "Rooftop bar tagged in a review"]), 3);
        later(3, () => { home(l); say(m, rnd(["Opening the profile", "Checking the Contact button", "Got the email"]), 3);
          later(5, () => goTo(m, "rside3", () => { say(m, "Email captured, over to you", 3);
            later(3, () => { home(m); say(o, rnd(["Not a duplicate. Keeping it", "Independent, not a chain. Keeping it", "Already in the pool. Skipping"]), 3); }); })); });
      });
    } else {
      [l, m, o].forEach((a, i) => later(i * 2, () => say(a, rnd([
        ["Scrolling For You for reviews", "Reading captions for tags", "Following an Explore businesses list"],
        ["Reading the business category", "Opening Contact / Email", "Checking the website link"],
        ["Deduping against the pool", "Filtering out chains", "Batch almost ready to push"]][i]), 3)));
    }
  }

  function chatLines(b) {
    const sl = stats.sent_log;
    if (b.id === "cassius") return [rnd(["How's the outreach going?", "Anything you need from Research?"]),
      sl ? `${sl.sent} sent so far, ${sl.replies} replies` : "Holding until we're active."];
    if (b.id === "ash" || b.id === "kira") return [rnd(["How's deliverability?", "Inbox treating you well?"]),
      sl ? `${sl.delivered} delivered, ${sl.bounced} bounced` : "Quiet so far."];
    if (b.id === "maren") return ["Are my leads easy to research?", rnd(["The Instagram ones are great", "Emails look clean"])];
    if (b.id === "imogen") return ["Drafts landing well?", rnd(["Working on the next batch", "Personalizing every one"])];
    if (RESEARCH.includes(b.id)) return [rnd(["How's the queue?", "Good work today", "Any good finds?"]),
      rnd(["Plenty left in the queue", "Thanks, boss", "A couple of strong ones"])];
    return ["Coffee?", "Sure"];
  }

  // Between pushes Caesar works, checks on his team and mingles. He never re-briefs Cassius.
  function caesarLoop() {
    const d = byId.devin;
    if (briefing || pending || !idle(d)) return;
    const now = performance.now();
    if (Math.random() < 0.5 || now - lastChat < 25000) {
      if (Math.random() < 0.3) say(d, rnd(researchActive()
        ? ["Reviewing the team's finds", "Picking the next city", "Checking the frontier queue"]
        : ["Planning the next run", "Reviewing coverage", "Picking the next niche"]), 3);
      wait(d, 8 + Math.random() * 8); return;
    }
    lastChat = now;
    if (Math.random() < 0.2) {
      goTo(d, "leadBoard", () => { say(d, `${stats.leads.total} on the board`, 3); wait(d, 4); later(4, () => home(d)); });
      return;
    }
    const pool = agents.filter((b) => b !== d && idle(b) && !(b.id === "cassius" && briefing));
    const team = pool.filter((b) => RESEARCH.includes(b.id));
    const b = researchActive() && team.length && Math.random() < 0.5 ? rnd(team) : rnd(pool);
    if (!b) { wait(d, 6); return; }
    wait(b, 25);
    const ok = goNear(d, b, () => {
      const [q, a] = chatLines(b);
      say(d, q, 3);
      later(3, () => { say(b, a, 3); b.busyUntil = performance.now() + 2000; });
      later(6, () => home(d));
    });
    if (!ok) b.busyUntil = 0;
  }

  function idleLoop(a) {
    if (!idle(a)) return;
    if (Math.random() < 0.6) { wait(a, 8 + Math.random() * 10); if (Math.random() < 0.3) say(a, "Standing by", 3); return; }
    const spot = rnd(["lounge1", "lounge2", "lounge3", "lounge4", "kitchen", "wc", "conf1", "conf2"]);
    goTo(a, spot, () => { wait(a, 6 + Math.random() * 6); later(9, () => home(a)); });
  }

  function pipelineLoop() {
    const order = ["maren", "imogen", "ash"];
    const now = performance.now();
    if (now - lastScript < 30000 || !order.every((id) => idle(byId[id]))) return;
    lastScript = now;
    const hand = (from, to, spot, msg, next) => goTo(byId[from], spot, () => {
      say(byId[from], msg, 3); HQLog.add(byId[from].name, msg.toLowerCase() + " to " + byId[to].name + ".");
      later(2.5, () => { home(byId[from]); next && next(); });
    });
    hand("maren", "imogen", "desk2", "Research notes ready", () =>
      hand("imogen", rnd(["ash", "kira"]), rnd(["desk3", "desk4"]), "Drafts approved", null));
  }

  function tick() {
    const active = HQData.outreachActive();
    briefOnPush();
    caesarLoop();
    if (researchActive()) researchLoop(); else RESEARCH.forEach((id) => idleLoop(byId[id]));
    if (active) { pipelineLoop(); idleLoop(byId.kira); if (!briefing) idleLoop(byId.cassius); }
    else OUTREACH.forEach((id) => idleLoop(byId[id]));
    if (!active && idle(byId.cassius) && Math.random() < 0.003) say(byId.cassius, "We hold until outreach resumes.", 4);
  }

  // Rendering
  const canvas = document.getElementById("office-canvas");
  const ctx = canvas.getContext("2d");
  const layer = document.createElement("canvas");
  const lctx = layer.getContext("2d");
  const GW = W, GH = H + 0.6;
  let cell = 20, dpr = 1;
  const LOOK = {
    devin: { skin: "#e3bb93", hair: "#3b2a1e" }, cassius: { skin: "#c68e62", hair: "#1c1c1c", sash: true },
    maren: { skin: "#f1c9a5", hair: "#9b4d2a" }, imogen: { skin: "#e5b089", hair: "#262626" },
    ash: { skin: "#8d5a3b", hair: "#121212" }, kira: { skin: "#f3d1b5", hair: "#d6ae5a" },
    livia: { skin: "#e8bf98", hair: "#5a3420" }, marcus: { skin: "#b07a52", hair: "#1e1a16" }, octavia: { skin: "#f0cfae", hair: "#2b2b2b" }
  };

  function resize() {
    const wrap = canvas.parentElement;
    const w = wrap.clientWidth || 800;
    let c = w / GW;
    if (window.innerWidth > 860) {
      const top = wrap.getBoundingClientRect().top + window.scrollY;
      const avail = window.innerHeight - top - 70;
      c = Math.max(11, Math.min(c, avail / GH));
    }
    cell = c; dpr = window.devicePixelRatio || 1;
    [canvas, layer].forEach((cv) => { cv.width = Math.round(GW * c * dpr); cv.height = Math.round(GH * c * dpr); });
    canvas.style.width = GW * c + "px"; canvas.style.height = GH * c + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawStatic();
  }
  window.addEventListener("resize", resize);

  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
    const t = f < 0 ? 0 : 255, p = Math.abs(f);
    r = Math.round((t - r) * p + r); gg = Math.round((t - gg) * p + gg); b = Math.round((t - b) * p + b);
    return `rgb(${r},${gg},${b})`;
  }

  const FLOORS = {
    research: ["wood", "#4a3826"], consul: ["marble", "#ece7db"], conference: ["carpet", "#1f3a52"], hall: ["stone", "#3a4450"],
    outreach: ["carpet", "#203449"], lounge: ["wood", "#5a4230"], kitchen: ["tile", "#c9c3b5"], wc: ["tile", "#b7c3c8"], entrance: ["stone", "#4a4336"]
  };

  function floor(g, r) {
    const c = cell, [kind, base] = FLOORS[r.id], x0 = r.x * c, y0 = r.y * c, w = (r.w + 1) * c, h = (r.h + 1) * c;
    g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    g.fillStyle = base; g.fillRect(x0, y0, w, h);
    if (kind === "wood") {
      for (let y = y0; y < y0 + h; y += c * 0.5) {
        let x = x0 - rand() * c * 2;
        while (x < x0 + w) {
          const len = c * (2 + rand() * 2.5);
          g.fillStyle = shade(base, (rand() - 0.5) * 0.18); g.fillRect(x, y, len - 1, c * 0.5 - 1); x += len;
        }
      }
    } else if (kind === "marble") {
      g.strokeStyle = "rgba(160,150,130,.35)"; g.lineWidth = 1;
      for (let i = 0; i < 14; i++) {
        g.beginPath(); const sx = x0 + rand() * w, sy = y0 + rand() * h; g.moveTo(sx, sy);
        g.bezierCurveTo(sx + rand() * 80 - 40, sy + rand() * 60, sx + rand() * 120 - 60, sy + rand() * 90, sx + rand() * 160 - 80, sy + rand() * 120); g.stroke();
      }
      g.strokeStyle = "rgba(150,140,120,.18)";
      for (let x = x0; x < x0 + w; x += c * 2) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 + h); g.stroke(); }
      for (let y = y0; y < y0 + h; y += c * 2) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + w, y); g.stroke(); }
    } else if (kind === "carpet") {
      for (let i = 0; i < (w * h) / 30; i++) { g.fillStyle = `rgba(255,255,255,${rand() * 0.04})`; g.fillRect(x0 + rand() * w, y0 + rand() * h, 2, 2); }
      g.strokeStyle = "rgba(0,0,0,.12)";
      for (let x = x0; x < x0 + w; x += c * 2) for (let y = y0; y < y0 + h; y += c * 2) g.strokeRect(x, y, c * 2, c * 2);
    } else if (kind === "tile") {
      for (let x = 0; x < r.w + 1; x++) for (let y = 0; y < r.h + 1; y++) {
        g.fillStyle = (x + y) % 2 ? shade(base, -0.12) : base; g.fillRect(x0 + x * c, y0 + y * c, c, c);
      }
    } else {
      for (let x = 0; x < r.w + 1; x += 2) for (let y = 0; y < r.h + 1; y += 2) {
        g.fillStyle = shade(base, (rand() - 0.5) * 0.12); g.fillRect(x0 + x * c + 0.5, y0 + y * c + 0.5, c * 2 - 1, c * 2 - 1);
      }
    }
    g.restore();
  }

  function rug(g, x, y, w, h, col, border) {
    const c = cell;
    g.fillStyle = "rgba(0,0,0,.25)"; rr(g, x * c + 2, y * c + 3, w * c, h * c, 4); g.fill();
    g.fillStyle = col; rr(g, x * c, y * c, w * c, h * c, 4); g.fill();
    g.strokeStyle = border; g.lineWidth = Math.max(1, c * 0.12); rr(g, x * c + c * 0.25, y * c + c * 0.25, w * c - c * 0.5, h * c - c * 0.5, 3); g.stroke();
  }

  function chair(g, cx, cy, col, up) {
    const c = cell;
    g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(cx, cy + c * 0.18, c * 0.32, c * 0.14, 0, 0, 7); g.fill();
    g.fillStyle = col; rr(g, cx - c * 0.3, cy - c * 0.25, c * 0.6, c * 0.5, c * 0.12); g.fill();
    g.fillStyle = shade(col, -0.3); rr(g, cx - c * 0.32, up ? cy - c * 0.42 : cy + c * 0.2, c * 0.64, c * 0.18, c * 0.08); g.fill();
  }

  function furniture(g, f) {
    const c = cell, [x, y, w, h, , type] = f, X = x * c, Y = y * c, Wd = w * c, Ht = h * c;
    const drop = () => { g.fillStyle = "rgba(0,0,0,.32)"; rr(g, X + c * 0.12, Y + c * 0.22, Wd, Ht, c * 0.15); g.fill(); };
    if (type === "plant") {
      g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(X + c / 2, Y + c * 0.8, c * 0.35, c * 0.14, 0, 0, 7); g.fill();
      g.fillStyle = "#8a6a45"; rr(g, X + c * 0.28, Y + c * 0.5, c * 0.44, c * 0.4, 3); g.fill();
      [["#2f6b45", 0, -0.05, 0.34], ["#3f8a58", -0.15, 0.08, 0.24], ["#4c9d66", 0.16, 0.06, 0.22], ["#5bb175", 0, -0.1, 0.16]].forEach(([col, dx, dy, r]) => {
        g.fillStyle = col; g.beginPath(); g.arc(X + c * (0.5 + dx), Y + c * (0.35 + dy), c * r, 0, 7); g.fill();
      });
      return;
    }
    drop();
    if (type === "desk") {
      g.fillStyle = "#7a5a36"; rr(g, X, Y, Wd, Ht, c * 0.12); g.fill();
      g.fillStyle = "#8d6a42"; rr(g, X + 2, Y + 2, Wd - 4, Ht - c * 0.3, c * 0.1); g.fill();
      g.fillStyle = "#1a1f26"; rr(g, X + Wd / 2 - c * 0.75, Y + c * 0.2, c * 1.5, c * 0.85, 3); g.fill();
      g.fillStyle = "#2b3542"; g.fillRect(X + Wd / 2 - c * 0.65, Y + c * 0.28, c * 1.3, c * 0.65);
      g.fillStyle = "#1a1f26"; g.fillRect(X + Wd / 2 - c * 0.12, Y + c * 1.05, c * 0.24, c * 0.2);
      g.fillStyle = "#cfd3d6"; rr(g, X + Wd / 2 - c * 0.55, Y + c * 1.35, c * 1.1, c * 0.28, 2); g.fill();
      g.fillStyle = "#efe9da"; g.save(); g.translate(X + c * 0.45, Y + c * 0.75); g.rotate(-0.2); g.fillRect(-c * 0.25, -c * 0.32, c * 0.5, c * 0.64); g.restore();
      g.fillStyle = "#c9a44c"; g.beginPath(); g.arc(X + Wd - c * 0.45, Y + c * 0.55, c * 0.17, 0, 7); g.fill();
      chair(g, X + Wd / 2, Y + Ht + c * 0.5, "#2a2f38", false);
      SCREENS.push({ x: X + Wd / 2 - c * 0.65, y: Y + c * 0.28, w: c * 1.3, h: c * 0.65, seat: [x + 1, y + h] });
    } else if (type === "board") {
      g.fillStyle = "#c9a44c"; rr(g, X, Y, Wd, Ht, 3); g.fill();
      g.fillStyle = "#14273a"; g.fillRect(X + 2, Y + 2, Wd - 4, Ht - 4);
    } else if (type === "consul-desk") {
      g.fillStyle = "#5a2e1c"; rr(g, X, Y, Wd, Ht, c * 0.2); g.fill();
      g.strokeStyle = "#c9a44c"; g.lineWidth = 1.5; rr(g, X + 2, Y + 2, Wd - 4, Ht - 4, c * 0.15); g.stroke();
      g.fillStyle = "#1f5a3f"; rr(g, X + Wd / 2 - c * 1.2, Y + c * 0.45, c * 2.4, c * 1.1, 3); g.fill();
      g.fillStyle = "#e8e1cf"; g.fillRect(X + Wd / 2 - c * 0.5, Y + c * 0.65, c * 1, c * 0.7);
      g.fillStyle = "#c9a44c"; rr(g, X + Wd / 2 - c * 0.7, Y + Ht - c * 0.38, c * 1.4, c * 0.26, 2); g.fill();
      g.fillStyle = "#e2c47a"; g.beginPath(); g.arc(X + c * 0.6, Y + c * 0.6, c * 0.22, 0, 7); g.fill();
    } else if (type === "shelf") {
      g.fillStyle = "#4b2f1d"; rr(g, X, Y, Wd, Ht, 2); g.fill();
      const cols = ["#7d2f2f", "#2f5a7d", "#c9a44c", "#2f6b45", "#8a6a45", "#e8e1cf"];
      for (let i = 0; i < h * 4; i++) { g.fillStyle = cols[Math.floor(rand() * cols.length)]; g.fillRect(X + c * 0.15, Y + i * c * 0.25 + 1, Wd - c * 0.3, c * 0.18); }
    } else if (type === "table") {
      [33, 35, 37].forEach((cx) => { chair(g, cx * c, 2.55 * c, "#3a2c20", true); chair(g, cx * c, 6.45 * c, "#3a2c20", false); });
      chair(g, 31.4 * c, 4.5 * c, "#3a2c20", false); chair(g, 38.6 * c, 4.5 * c, "#3a2c20", false);
      g.fillStyle = "#3e2a1c"; rr(g, X, Y, Wd, Ht, Ht / 2); g.fill();
      g.fillStyle = "#5c3d26"; rr(g, X + 3, Y + 3, Wd - 6, Ht - 6, Ht / 2); g.fill();
      g.strokeStyle = "rgba(201,164,76,.6)"; g.lineWidth = 1; rr(g, X + c * 0.5, Y + c * 0.5, Wd - c, Ht - c, Ht / 3); g.stroke();
      [[0.3], [0.5], [0.7]].forEach(([fx]) => { g.fillStyle = "#efe9da"; g.fillRect(X + Wd * fx - c * 0.25, Y + c * 0.4, c * 0.5, c * 0.6); });
    } else if (type === "sofa") {
      g.fillStyle = "#245a43"; rr(g, X, Y - c * 0.1, Wd, Ht + c * 0.4, c * 0.25); g.fill();
      g.fillStyle = "#2f7355"; for (let i = 0; i < w / 2; i++) { rr(g, X + c * 0.2 + i * c * 2, Y + c * 0.25, c * 1.8, Ht - c * 0.05, c * 0.2); g.fill(); }
      g.fillStyle = "#c9a44c"; g.beginPath(); g.arc(X + c * 0.6, Y + c * 0.55, c * 0.2, 0, 7); g.arc(X + Wd - c * 0.6, Y + c * 0.55, c * 0.2, 0, 7); g.fill();
    } else if (type === "coffee") {
      g.fillStyle = "#3e2a1c"; rr(g, X, Y, Wd, Ht, c * 0.3); g.fill();
      g.fillStyle = "#efe9da"; g.beginPath(); g.arc(X + c * 1, Y + c * 0.5, c * 0.16, 0, 7); g.arc(X + c * 2.6, Y + c * 0.5, c * 0.16, 0, 7); g.fill();
    } else if (type === "counter") {
      g.fillStyle = "#6f767e"; rr(g, X, Y, Wd, Ht, 2); g.fill();
      g.fillStyle = "#9aa1a8"; g.fillRect(X + 1, Y + 1, Wd - 2, Ht - c * 0.3);
      g.fillStyle = "#4c535a"; rr(g, X + c * 0.4, Y + c * 0.15, c * 0.9, c * 0.55, 3); g.fill();
      g.fillStyle = "#222"; [2.3, 3.1].forEach((dx) => { g.beginPath(); g.arc(X + c * dx, Y + c * 0.45, c * 0.2, 0, 7); g.fill(); });
    } else if (type === "fridge") {
      g.fillStyle = "#e3e6e9"; rr(g, X, Y - c * 0.2, Wd, Ht + c * 0.2, 3); g.fill();
      g.fillStyle = "#9aa1a8"; g.fillRect(X + Wd - c * 0.25, Y + c * 0.1, 2, c * 0.5);
    } else if (type === "sink") {
      g.fillStyle = "#eef0f2"; rr(g, X, Y, Wd, Ht, 3); g.fill();
      g.fillStyle = "#c3cbd0"; [0.5, 1.5, 2.5].forEach((dx) => { g.beginPath(); g.ellipse(X + c * dx, Y + c * 0.5, c * 0.3, c * 0.22, 0, 0, 7); g.fill(); });
    } else if (type === "reception") {
      g.fillStyle = "#4b2f1d"; rr(g, X - c * 0.2, Y, Wd + c * 0.4, Ht + c * 0.3, c * 0.4); g.fill();
      g.strokeStyle = "#c9a44c"; g.lineWidth = 1.5; rr(g, X, Y + 2, Wd, Ht - 2, c * 0.3); g.stroke();
      g.fillStyle = "#c9a44c"; g.beginPath(); g.arc(X + Wd / 2, Y + Ht / 2 + 1, c * 0.28, 0, 7); g.fill();
      g.fillStyle = "#165240"; g.beginPath(); g.arc(X + Wd / 2, Y + Ht / 2 + 1, c * 0.17, 0, 7); g.fill();
    }
  }

  const SCREENS = [];
  const isFurn = (x, y) => FURN.some(([fx, fy, fw, fh]) => x >= fx && x < fx + fw && y >= fy && y < fy + fh);
  const isWall = (x, y) => x >= 0 && y >= 0 && x <= W && y <= H && blocked[y][x] && !isFurn(x, y);

  function drawStatic() {
    const g = lctx, c = cell; seed = 7; SCREENS.length = 0;
    g.fillStyle = "#08131e"; g.fillRect(0, 0, GW * c, GH * c);
    ROOMS.forEach((r) => floor(g, r));
    g.fillStyle = "#1c2a5a"; g.fillRect(1 * c, 11.35 * c, 39 * c, 1.3 * c);
    g.strokeStyle = "#c9a44c"; g.lineWidth = 1; g.strokeRect(1 * c + 2, 11.35 * c + 2, 39 * c - 4, 1.3 * c - 4);
    rug(g, 19.5, 1.5, 9, 7, "#183a5a", "#c9a44c");
    rug(g, 20.5, 16.5, 7, 4, "#6a2f2f", "#e2c47a");
    rug(g, 27.5, 24, 4, 2, "#6a2f2f", "#c9a44c");
    rug(g, 1.5, 5.3, 10, 2.4, "#2d3b2a", "#8a7135");
    g.fillStyle = "rgba(0,0,0,.12)"; [[36, 15], [38, 15]].forEach(([x, y]) => g.fillRect(x * c, y * c, 2, c * 2.5));
    FURN.forEach((f) => furniture(g, f));
    for (let y = 0; y <= H; y++) for (let x = 0; x <= W; x++) {
      if (!isWall(x, y)) continue;
      if (!isWall(x, y + 1)) {
        const grd = g.createLinearGradient(0, (y + 1) * c, 0, (y + 1.55) * c);
        grd.addColorStop(0, "#1c3550"); grd.addColorStop(1, "#11253a");
        g.fillStyle = grd; g.fillRect(x * c, (y + 1) * c, c + 0.5, c * 0.55);
        g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(x * c, (y + 1.55) * c, c + 0.5, c * 0.2);
      }
    }
    for (let y = 0; y <= H; y++) for (let x = 0; x <= W; x++) {
      if (!isWall(x, y)) continue;
      g.fillStyle = "#2c4a68"; g.fillRect(x * c, y * c, c + 0.5, c + 0.5);
      g.fillStyle = "#3d6185"; g.fillRect(x * c, y * c, c + 0.5, c * 0.25);
    }
    g.fillStyle = "#c9a44c";
    DOORS.forEach(([x, y]) => {
      const vertical = isWall(x, y - 1) || isWall(x, y + 1) ? !(isWall(x - 1, y) || isWall(x + 1, y)) : false;
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => {
        if (!isWall(x + dx, y + dy)) return;
        if (vertical ? dy : dx) { const jx = (x + dx) * c + (dx < 0 ? c - 3 : 0), jy = (y + dy) * c + (dy < 0 ? c - 3 : 0); g.fillRect(dx ? jx : x * c, dy ? jy : y * c, dx ? 3 : c, dy ? 3 : c); }
      });
    });
    FRONT_DOOR.forEach(([x, y]) => { g.fillStyle = "#c9a44c"; g.fillRect(x * c, y * c, c, c); g.fillStyle = "#8a7135"; g.fillRect(x * c + 2, y * c + 2, c - 4, c - 4); });
    [[24, 5, 7, "rgba(255,236,190,.18)"], [24, 18, 6, "rgba(255,200,120,.14)"], [9, 4, 8, "rgba(201,164,76,.10)"], [29.5, 24, 5, "rgba(255,210,140,.12)"]].forEach(([x, y, r, col]) => {
      const grd = g.createRadialGradient(x * c, y * c, 0, x * c, y * c, r * c); grd.addColorStop(0, col); grd.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grd; g.fillRect(0, 0, GW * c, GH * c);
    });
    ROOMS.forEach((r) => {
      if (!r.name) return;
      const fs = Math.max(8, c * 0.5); g.font = `700 ${fs}px Inter, sans-serif`;
      const label = r.name.toUpperCase(), tw = g.measureText(label).width + fs * 1.2;
      const lx = (r.x + 1.15) * c, ly = (r.y + 1.65) * c;
      g.fillStyle = r.light ? "rgba(13,27,42,.85)" : "rgba(8,19,30,.78)"; rr(g, lx, ly, tw, fs * 1.7, 3); g.fill();
      g.strokeStyle = "#8a7135"; g.lineWidth = 1; rr(g, lx, ly, tw, fs * 1.7, 3); g.stroke();
      g.fillStyle = "#e2c47a"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(label, lx + fs * 0.6, ly + fs * 0.88);
    });
    const v = g.createRadialGradient(GW * c / 2, GH * c / 2, GH * c * 0.4, GW * c / 2, GH * c / 2, GW * c * 0.65);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.35)"); g.fillStyle = v; g.fillRect(0, 0, GW * c, GH * c);
  }

  function person(a, t) {
    const c = cell, look = LOOK[a.id] || { skin: "#e0b892", hair: "#333" };
    const moving = a.path.length > 0, ph = a.walk || 0;
    const px = (a.x + 0.5) * c, py = (a.y + 0.5) * c - (moving ? Math.abs(Math.sin(ph * 6)) * c * 0.06 : 0);
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse((a.x + 0.5) * c, (a.y + 0.5) * c + c * 0.42, c * 0.36, c * 0.13, 0, 0, 7); ctx.fill();
    const legSwing = moving ? Math.sin(ph * 6) * c * 0.1 : 0;
    ctx.fillStyle = "#1b222b";
    rr(ctx, px - c * 0.17, py + c * 0.18 + legSwing * 0.3, c * 0.14, c * 0.26 + legSwing, 2); ctx.fill();
    rr(ctx, px + c * 0.03, py + c * 0.18 - legSwing * 0.3, c * 0.14, c * 0.26 - legSwing, 2); ctx.fill();
    ctx.fillStyle = a.color; rr(ctx, px - c * 0.27, py - c * 0.18, c * 0.54, c * 0.46, c * 0.14); ctx.fill();
    ctx.fillStyle = shade(a.color, -0.28); ctx.beginPath(); ctx.moveTo(px, py - c * 0.18); ctx.lineTo(px - c * 0.1, py + c * 0.1); ctx.lineTo(px + c * 0.1, py + c * 0.1); ctx.closePath(); ctx.fill();
    if (look.sash) { ctx.strokeStyle = "#c9a44c"; ctx.lineWidth = Math.max(1.5, c * 0.08); ctx.beginPath(); ctx.moveTo(px - c * 0.22, py - c * 0.14); ctx.lineTo(px + c * 0.22, py + c * 0.24); ctx.stroke(); }
    ctx.fillStyle = look.skin; ctx.beginPath(); ctx.arc(px, py - c * 0.36, c * 0.2, 0, 7); ctx.fill();
    ctx.fillStyle = look.hair; ctx.beginPath(); ctx.arc(px, py - c * 0.4, c * 0.2, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.fillRect(px - c * 0.2, py - c * 0.45, c * 0.4, c * 0.07);
    const fs = Math.max(8, c * 0.42); ctx.font = `600 ${fs}px Inter, sans-serif`;
    const tw = ctx.measureText(a.name).width + fs * 0.8;
    ctx.fillStyle = "rgba(8,19,30,.82)"; rr(ctx, px - tw / 2, py + c * 0.5, tw, fs * 1.4, fs * 0.7); ctx.fill();
    ctx.fillStyle = a.color; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(a.name, px, py + c * 0.5 + fs * 0.72);
    return [px, py];
  }

  function bubble(a, px, py) {
    const c = cell, fs = Math.max(9, c * 0.48);
    ctx.font = `500 ${fs}px Inter, sans-serif`;
    const tw = ctx.measureText(a.bubble).width + fs * 1.2, bh = fs * 2;
    const bx = Math.min(Math.max(px - tw / 2, 3), GW * c - tw - 3);
    let by = py - c * 0.75 - bh, below = false;
    if (by < 3) { by = py + c * 1.3; below = true; }
    ctx.fillStyle = "rgba(0,0,0,.3)"; rr(ctx, bx + 2, by + 3, tw, bh, fs * 0.6); ctx.fill();
    ctx.fillStyle = "#f6f1e3"; ctx.strokeStyle = "#c9a44c"; ctx.lineWidth = 1.2;
    rr(ctx, bx, by, tw, bh, fs * 0.6); ctx.fill(); ctx.stroke();
    const tx = Math.min(Math.max(px, bx + 10), bx + tw - 10);
    ctx.beginPath();
    if (below) { ctx.moveTo(tx - 5, by + 1); ctx.lineTo(tx, by - 6); ctx.lineTo(tx + 5, by + 1); }
    else { ctx.moveTo(tx - 5, by + bh - 1); ctx.lineTo(tx, by + bh + 6); ctx.lineTo(tx + 5, by + bh - 1); }
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#0d1b2a"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(a.bubble, bx + fs * 0.6, by + bh / 2 + 0.5);
  }

  function draw(t) {
    const c = cell;
    ctx.clearRect(0, 0, GW * c, GH * c);
    ctx.drawImage(layer, 0, 0, GW * c, GH * c);
    SCREENS.forEach((s) => {
      const user = agents.find((a) => !a.path.length && Math.abs(a.x - s.seat[0]) < 0.3 && Math.abs(a.y - s.seat[1]) < 0.3);
      if (!user) return;
      ctx.fillStyle = shade(user.color, -0.55); ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = user.color;
      for (let i = 0; i < 4; i++) {
        const lw = (0.35 + 0.6 * Math.abs(Math.sin(t / 900 + i * 1.7 + s.x))) * (s.w - 6);
        ctx.fillRect(s.x + 3, s.y + 3 + i * (s.h - 6) / 4, lw, Math.max(1, (s.h - 6) / 8));
      }
      const g = ctx.createRadialGradient(s.x + s.w / 2, s.y + s.h, 0, s.x + s.w / 2, s.y + s.h, c * 1.6);
      g.addColorStop(0, "rgba(160,200,255,.12)"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(s.x - c * 2, s.y - c, s.w + c * 4, c * 3.5);
    });
    if (stats) {
      const fs = Math.max(8, c * 0.5); ctx.font = `700 ${fs}px Inter, sans-serif`; ctx.fillStyle = "#e2c47a"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(`LEADS ${stats.leads.total}  ·  ${Object.keys(stats.states).length} STATES  ·  ${stats.cities.length} CITIES`, 6.5 * c, 6.5 * c, 8.6 * c);
    }
    const now = performance.now();
    const pos = agents.slice().sort((a, b) => a.y - b.y).map((a) => [a, person(a, t)]);
    pos.forEach(([a, [px, py]]) => { if (a.bubble && now < a.bubbleUntil) bubble(a, px, py); });
  }

  let last = performance.now();
  function frame(t) {
    const dt = Math.min(0.1, (t - last) / 1000); last = t;
    agents.forEach((a) => {
      if (!a.path.length) return;
      const [tx, ty] = a.path[0];
      const dx = tx - a.x, dy = ty - a.y, dist = Math.hypot(dx, dy), step = 3 * dt;
      a.walk = (a.walk || 0) + dt;
      if (dist <= step) {
        a.x = tx; a.y = ty; a.path.shift();
        if (!a.path.length && a.onArrive) { const f = a.onArrive; a.onArrive = null; f(); }
      } else { a.x += (dx / dist) * step; a.y += (dy / dist) * step; }
    });
    draw(t);
    requestAnimationFrame(frame);
  }
  window.HQOffice = {
    start() { resize(); setInterval(tick, 1000); requestAnimationFrame(frame); },
    resize,
    update(s, prev) {
      stats = s;
      const total = s.leads.total;
      if (prev && total > prev.leads.total) {
        pending += total - prev.leads.total;
      }
      const sent = (x) => (x && x.sent_log ? x.sent_log.sent : 0);
      if (prev && sent(s) > sent(prev)) {
        say(byId.ash, `+${sent(s) - sent(prev)} emails sent`, 5);
        HQLog.add("Ash", `logged ${sent(s) - sent(prev)} new sends (${sent(s)} total).`);
      }
    },
    // Exposed for wall-crossing checks.
    _debug: { agents, walkable, astar, SPOTS, get pending() { return pending; } }
  };
})();
