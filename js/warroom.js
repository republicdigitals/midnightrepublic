// US campaign map: worked states lit with live counts, city markers, per-state rail.
(function () {
  const svg = d3.select("#us-map");
  const projection = d3.geoAlbersUsa().scale(1300).translate([487.5, 305]);
  const path = d3.geoPath();
  const NAME_TO_ABBR = {};
  // Small northeastern states get badges in a callout column.
  const CALLOUT = ["VT", "NH", "MA", "RI", "CT", "NJ", "DE", "MD", "DC"];
  let features = null, stats = null, selected = null;
  const gStates = svg.append("g"), gLeaders = svg.append("g"), gCities = svg.append("g"), gBadges = svg.append("g");

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  async function init() {
    const topo = await d3.json("vendor/states-albers-10m.json");
    features = topojson.feature(topo, topo.objects.states).features;
    gStates.selectAll("path").data(features).join("path").attr("class", "state").attr("d", path)
      .on("click", (e, f) => { const a = abbr(f); if (stats && stats.states[a]) select(a); });
    if (stats) render();
  }

  function abbr(f) {
    if (!stats) return null;
    if (!Object.keys(NAME_TO_ABBR).length) Object.entries(window.HQ_STATE_NAMES).forEach(([a, n]) => (NAME_TO_ABBR[n] = a));
    return NAME_TO_ABBR[f.properties.name];
  }

  function select(a) { selected = a; render(); }

  function render() {
    if (!features || !stats) return;
    const st = stats.states;
    const max = d3.max(Object.values(st), (d) => d.leads) || 1;
    const color = d3.scaleLinear().domain([0, max]).range(["#1f5a47", "#2f8a69"]);
    gStates.selectAll("path")
      .attr("class", (f) => { const a = abbr(f); return "state" + (st[a] ? " on" : "") + (a === selected ? " sel" : ""); })
      .style("fill", (f) => { const a = abbr(f); return st[a] ? color(st[a].leads) : null; });

    const pts = stats.cities.filter((c) => c.coords).map((c) => ({ c, p: projection(c.coords) })).filter((d) => d.p);
    gCities.selectAll("circle").data(pts, (d) => d.c.city + d.c.state).join("circle").attr("class", "city")
      .attr("cx", (d) => d.p[0]).attr("cy", (d) => d.p[1]).attr("r", (d) => 2 + Math.sqrt(d.c.leads) * 1.1)
      .selectAll("title").data((d) => [d]).join("title").text((d) => `${d.c.city}, ${d.c.state}: ${d.c.leads}`);

    let calloutY = 120;
    const badges = features.filter((f) => st[abbr(f)]).map((f) => {
      const a = abbr(f), cen = path.centroid(f);
      if (CALLOUT.includes(a)) { const b = { a, x: 945, y: calloutY, from: cen }; calloutY += 30; return b; }
      return { a, x: cen[0], y: cen[1] };
    }).sort((x, y) => (CALLOUT.indexOf(x.a) - CALLOUT.indexOf(y.a)));
    gLeaders.selectAll("line").data(badges.filter((b) => b.from), (b) => b.a).join("line").attr("class", "leader")
      .attr("x1", (b) => b.from[0]).attr("y1", (b) => b.from[1]).attr("x2", (b) => b.x - 22).attr("y2", (b) => b.y);
    const g = gBadges.selectAll("g.badge").data(badges, (b) => b.a).join((en) => {
      const e = en.append("g").attr("class", "badge"); e.append("rect"); e.append("text"); return e;
    }).attr("transform", (b) => `translate(${b.x},${b.y})`).on("click", (e, b) => select(b.a));
    g.select("text").text((b) => `${b.a} ${st[b.a].leads}`);
    g.select("rect").attr("x", -24).attr("y", -10).attr("width", 48).attr("height", 20).attr("rx", 5)
      .style("stroke-width", (b) => (b.a === selected ? 2.5 : 1));

    const entries = Object.entries(st).sort((x, y) => y[1].leads - x[1].leads);
    document.getElementById("map-summary").textContent = `${entries.length} states worked, ${stats.cities.length} cities`;
    document.getElementById("state-list").innerHTML = entries.map(([a, d]) =>
      `<li data-st="${a}" class="${a === selected ? "sel" : ""}"><span>${esc(d.name)}</span><span class="cnt">${d.leads}</span></li>`).join("");
    document.querySelectorAll("#state-list li").forEach((li) => (li.onclick = () => select(li.dataset.st)));
    detail(selected || (entries[0] && entries[0][0]));
  }

  function detail(a) {
    const el = document.getElementById("state-detail");
    const d = stats.states[a];
    if (!d) { el.innerHTML = ""; return; }
    const cities = stats.cities.filter((c) => c.state === a).slice(0, 6);
    const sent = stats.sent_log && stats.sent_log.by_state && stats.sent_log.by_state[a];
    const aw = `<span class="awaiting">awaiting send log</span>`;
    el.innerHTML = `<div class="panel-head"><h3>${esc(d.name)}</h3><span class="muted">${a}</span></div>
      <dl class="kv">
        <dt>Leads</dt><dd>${d.leads}</dd>
        <dt>With email</dt><dd>${d.with_email}</dd>
        ${Object.entries(d.sources).map(([s, n]) => `<dt>From ${esc(s)}</dt><dd>${n}</dd>`).join("")}
        <dt>Sent</dt><dd>${sent ? sent.sent : aw}</dd>
        <dt>Delivered</dt><dd>${sent ? sent.delivered : aw}</dd>
        <dt>Bounced</dt><dd>${sent ? sent.bounced : aw}</dd>
      </dl>
      <div class="muted">Top cities: ${cities.map((c) => `${esc(c.city)} (${c.leads})`).join(", ")}</div>`;
  }

  window.HQWarRoom = { init, update(s) { stats = s; render(); } };
})();
