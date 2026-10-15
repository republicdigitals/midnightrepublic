// Simple top-down office: walled rooms with door gaps, grid A* pathing, speech bubbles.
(function () {
  const C = window.HQ_CONFIG;
  const W = 41, H = 27;
  const ROOMS = [
    { id: "leadgen", name: "Lead Generation", x: 0, y: 0, w: 13, h: 10, floor: "#1d4a3c" },
    { id: "consul", name: "Consul's Office", x: 13, y: 0, w: 13, h: 10, floor: "#e6e1d4", light: true },
    { id: "conference", name: "Conference Room", x: 26, y: 0, w: 14, h: 10, floor: "#22384f" },
    { id: "hall", name: "", x: 0, y: 10, w: 40, h: 4, floor: "#2a3644" },
    { id: "outreach", name: "Outreach Floor", x: 0, y: 14, w: 19, h: 12, floor: "#1a3147" },
    { id: "lounge", name: "Lounge", x: 19, y: 14, w: 10, h: 7, floor: "#2b4a3a" },
    { id: "kitchen", name: "Kitchen", x: 29, y: 14, w: 6, h: 7, floor: "#3a3f46" },
    { id: "wc", name: "WC", x: 35, y: 14, w: 5, h: 7, floor: "#38474f" },
    { id: "entrance", name: "Entrance", x: 19, y: 21, w: 21, h: 5, floor: "#2f2a22" }
  ];
  const DOORS = [[6, 10], [7, 10], [19, 10], [20, 10], [32, 10], [33, 10], [9, 14], [10, 14], [23, 14], [24, 14],
    [31, 14], [32, 14], [37, 14], [19, 23], [19, 24], [23, 21], [24, 21]];
  const FRONT_DOOR = [[29, 26], [30, 26]];
  // Furniture blocks [x, y, w, h, color, label]
  const FURN = [
    [2, 2, 3, 2, "#6b5530", "desk"], [8, 2, 3, 2, "#6b5530", "desk"], [2, 6, 9, 1, "#2c3e50", "board"],
    [17, 3, 5, 2, "#b9a57a", "consul-desk"], [14, 4, 1, 4, "#9b8b66", "shelf"], [24, 4, 1, 4, "#9b8b66", "shelf"],
    [29, 3, 8, 3, "#5a4630", "table"],
    [2, 17, 3, 2, "#6b5530", "desk"], [8, 17, 3, 2, "#6b5530", "desk"], [14, 17, 3, 2, "#6b5530", "desk"],
    [2, 22, 3, 2, "#6b5530", "desk"], [8, 22, 3, 2, "#6b5530", "desk"], [14, 22, 3, 2, "#6b5530", "desk"],
    [21, 15, 6, 1, "#3d6b55", "sofa"], [22, 18, 4, 1, "#5a4630", "coffee"],
    [30, 15, 4, 1, "#7d8590", "counter"], [36, 19, 3, 1, "#c8ccd0", "sink"],
    [27, 23, 5, 1, "#6b5530", "reception"]
  ];
  const SPOTS = {
    devinDesk: [3, 4], leadBoard: [6, 7], consulChair: [19, 2], consulVisitor: [19, 6],
    conf1: [30, 6], conf2: [33, 6], conf3: [35, 2], conf4: [31, 2],
    desk1: [3, 19], desk2: [9, 19], desk3: [15, 19], desk4: [3, 24], desk5: [9, 24], desk6: [15, 24],
    lounge1: [21, 16], lounge2: [23, 16], lounge3: [25, 16], lounge4: [24, 19],
    kitchen: [31, 17], wc: [37, 17], entrance: [29, 24], hall1: [12, 12], hall2: [28, 12]
  };
  const HOME = { devin: "devinDesk", cassius: "consulChair", maren: "desk1", imogen: "desk2", ash: "desk3", kira: "desk4" };

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

  function goTo(a, spot, onArrive) {
    const t = SPOTS[spot];
    const path = astar([Math.round(a.x), Math.round(a.y)], t);
    if (!path) return;
    a.path = path.slice(1); a.onArrive = onArrive || null;
  }
  function say(a, text, secs) { a.bubble = text; a.bubbleUntil = performance.now() + (secs || 4) * 1000; }
  const idle = (a) => !a.path.length && performance.now() > a.busyUntil;
  const wait = (a, secs) => (a.busyUntil = performance.now() + secs * 1000);

  let stats = null;
  let lastScript = 0;
  let lastBrief = -1e9;
  const BRIEF_EVERY = 150000;
  const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function topState() {
    if (!stats) return null;
    return Object.entries(stats.states).sort((a, b) => b[1].leads - a[1].leads)[0];
  }

  // Lead generation loop runs in both modes; outreach stages only move when outreach is active.
  function devinLoop() {
    const d = byId.devin, cas = byId.cassius;
    if (!idle(d) || !stats) return;
    const r = Math.random();
    if (r < 0.45) { wait(d, 6 + Math.random() * 6); if (Math.random() < 0.4) say(d, rnd(["Checking Instagram profiles", "Reading captions for tagged venues", "Capturing contact emails", "Deduping against the pool"]), 3); return; }
    if (r < 0.75 || performance.now() - lastBrief < BRIEF_EVERY) {
      if (Math.random() < 0.5) { wait(d, 5 + Math.random() * 5); return; }
      goTo(d, "leadBoard", () => { say(d, `${stats.leads.total} leads on the board`, 3); wait(d, 4); goTo(d, "devinDesk"); }); return;
    }
    lastBrief = performance.now();
    goTo(d, "consulVisitor", () => {
      const ts = topState();
      say(d, `Lead pool: ${stats.leads.total} across ${Object.keys(stats.states).length} states`, 4);
      HQLog.add("Devin", `briefed Cassius: ${stats.leads.total} leads, ${stats.leads.with_email} with email${ts ? `, top state ${ts[0]} (${ts[1].leads})` : ""}.`);
      setTimeout(() => {
        say(cas, HQData.outreachActive() ? "Good. Send it to Maren." : "Logged. Outreach stays paused.", 4);
        HQLog.add("Cassius", HQData.outreachActive() ? "routed the new leads to Research." : "logged the count. Outreach remains paused.");
      }, 2500);
      wait(d, 6);
      setTimeout(() => goTo(d, "devinDesk"), 6000);
    });
  }

  function idleLoop(a) {
    if (!idle(a)) return;
    if (Math.random() < 0.6) { wait(a, 8 + Math.random() * 10); if (Math.random() < 0.3) say(a, "Standing by", 3); return; }
    const spot = rnd(["lounge1", "lounge2", "lounge3", "lounge4", "kitchen", "wc", "conf1", "conf2"]);
    goTo(a, spot, () => { wait(a, 6 + Math.random() * 6); setTimeout(() => goTo(a, HOME[a.id]), 9000); });
  }

  function pipelineLoop() {
    const order = ["devin", "maren", "imogen", "ash"];
    const now = performance.now();
    if (now - lastScript < 18000 || !order.every((id) => idle(byId[id]))) return;
    lastScript = now;
    const hand = (from, to, spot, msg, next) => goTo(byId[from], spot, () => {
      say(byId[from], msg, 3); HQLog.add(byId[from].name, msg.toLowerCase() + " to " + byId[to].name + ".");
      setTimeout(() => { goTo(byId[from], HOME[from]); next && next(); }, 2500);
    });
    hand("devin", "maren", "desk1", "Handing off new leads", () =>
      hand("maren", "imogen", "desk2", "Research notes ready", () =>
        hand("imogen", rnd(["ash", "kira"]), rnd(["desk3", "desk4"]), "Drafts approved", null)));
  }

  function tick() {
    const active = HQData.outreachActive();
    devinLoop();
    if (active) { pipelineLoop(); idleLoop(byId.kira); idleLoop(byId.cassius); }
    else ["maren", "imogen", "ash", "kira"].forEach((id) => idleLoop(byId[id]));
    if (!active && idle(byId.cassius) && Math.random() < 0.003) say(byId.cassius, "We hold until the new repo lands.", 4);
  }

  // Rendering
  const canvas = document.getElementById("office-canvas");
  const ctx = canvas.getContext("2d");
  let cell = 20;
  function resize() {
    const w = canvas.parentElement.clientWidth || 800;
    const dpr = window.devicePixelRatio || 1;
    cell = w / (W + 1);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(cell * (H + 1) * dpr);
    canvas.style.height = cell * (H + 1) + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);

  function draw() {
    const c = cell;
    ctx.fillStyle = "#0a1622"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ROOMS.forEach((r) => { ctx.fillStyle = r.floor; ctx.fillRect(r.x * c, r.y * c, (r.w + 1) * c, (r.h + 1) * c); });
    ctx.strokeStyle = "rgba(255,255,255,.035)"; ctx.lineWidth = 1;
    for (let x = 0; x <= W + 1; x++) { ctx.beginPath(); ctx.moveTo(x * c, 0); ctx.lineTo(x * c, (H + 1) * c); ctx.stroke(); }
    for (let y = 0; y <= H + 1; y++) { ctx.beginPath(); ctx.moveTo(0, y * c); ctx.lineTo((W + 1) * c, y * c); ctx.stroke(); }
    FURN.forEach(([x, y, w, h, col]) => {
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(x * c + 3, y * c + 4, w * c, h * c);
      ctx.fillStyle = col; ctx.fillRect(x * c + 1, y * c + 1, w * c - 2, h * c - 2);
    });
    for (let y = 0; y <= H; y++) for (let x = 0; x <= W; x++) {
      const isWall = blocked[y][x] && !FURN.some(([fx, fy, fw, fh]) => x >= fx && x < fx + fw && y >= fy && y < fy + fh);
      if (!isWall) continue;
      const frontDoor = FRONT_DOOR.some(([dx, dy]) => dx === x && dy === y);
      ctx.fillStyle = frontDoor ? "#c9a44c" : "#0f2233"; ctx.fillRect(x * c, y * c, c, c);
      if (!frontDoor) { ctx.fillStyle = "#29445f"; ctx.fillRect(x * c, y * c, c, c * 0.35); }
    }
    ctx.font = `600 ${Math.max(9, c * 0.6)}px Inter, sans-serif`; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ROOMS.forEach((r) => { if (!r.name) return; ctx.fillStyle = r.light ? "#6b5a32" : "rgba(226,196,122,.75)"; ctx.fillText(r.name.toUpperCase(), (r.x + 1.3) * c, (r.y + 1.15) * c + (r.id === "consul" || r.id === "conference" ? c * 0 : 0)); });
    ctx.fillStyle = "rgba(226,196,122,.75)";
    if (stats) ctx.fillText(`LEADS ${stats.leads.total}`, 2.3 * c, 6.15 * c);

    const now = performance.now();
    agents.forEach((a) => {
      const px = (a.x + 0.5) * c, py = (a.y + 0.5) * c, r = c * 0.62;
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(px, py + r * 0.8, r * 0.9, r * 0.35, 0, 0, 7); ctx.fill();
      ctx.fillStyle = a.color; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
      ctx.strokeStyle = "#0d1b2a"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#0d1b2a"; ctx.font = `700 ${Math.max(8, c * 0.62)}px Inter, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(a.name[0], px, py + 0.5);
      ctx.fillStyle = "#e9e6dc"; ctx.font = `600 ${Math.max(8, c * 0.5)}px Inter, sans-serif`; ctx.textBaseline = "top";
      ctx.fillText(a.name, px, py + r + 2);
      if (a.bubble && now < a.bubbleUntil) {
        ctx.font = `500 ${Math.max(9, c * 0.55)}px Inter, sans-serif`;
        const tw = ctx.measureText(a.bubble).width + 12, bh = Math.max(16, c * 1.0);
        let bx = Math.min(Math.max(px - tw / 2, 2), (W + 1) * c - tw - 2), by = py - r - bh - 6;
        if (by < 2) by = py + r + c * 0.9;
        ctx.fillStyle = "#f4efe1"; ctx.strokeStyle = "#c9a44c"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, tw, bh, 6) : ctx.rect(bx, by, tw, bh); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#0d1b2a"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(a.bubble, bx + 6, by + bh / 2);
      }
    });
  }

  let last = performance.now();
  function frame(t) {
    const dt = Math.min(0.1, (t - last) / 1000); last = t;
    agents.forEach((a) => {
      if (!a.path.length) return;
      const [tx, ty] = a.path[0];
      const dx = tx - a.x, dy = ty - a.y, dist = Math.hypot(dx, dy), step = 3.2 * dt;
      if (dist <= step) {
        a.x = tx; a.y = ty; a.path.shift();
        if (!a.path.length && a.onArrive) { const f = a.onArrive; a.onArrive = null; f(); }
      } else { a.x += (dx / dist) * step; a.y += (dy / dist) * step; }
    });
    draw();
    requestAnimationFrame(frame);
  }

  window.HQOffice = {
    start() { resize(); setInterval(tick, 1000); requestAnimationFrame(frame); },
    resize,
    update(s, prev) {
      stats = s;
      const total = s.leads.total;
      if (prev && total > prev.leads.total) {
        say(byId.devin, `+${total - prev.leads.total} new leads`, 5);
        HQLog.add("Devin", `added ${total - prev.leads.total} new leads (pool now ${total}).`);
      }
    },
    // Exposed for wall-crossing checks.
    _debug: { agents, walkable }
  };
})();
