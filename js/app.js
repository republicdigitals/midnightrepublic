// Header, view switching, and wiring data to views.
(function () {
  const C = window.HQ_CONFIG;
  window.HQ_STATE_NAMES = {};
  const views = ["office", "warroom", "mission"];

  function show() {
    const v = views.includes(location.hash.slice(1)) ? location.hash.slice(1) : "office";
    document.querySelectorAll(".view").forEach((el) => el.classList.toggle("active", el.dataset.view === v));
    document.querySelectorAll(".switcher a").forEach((a) => a.classList.toggle("active", a.dataset.view === v));
    if (v === "office") HQOffice.resize();
  }
  window.addEventListener("hashchange", show);

  const clock = document.getElementById("clock");
  const clockFmt = new Intl.DateTimeFormat("en-US", { timeZone: C.timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZoneName: "short" });
  const tick = () => (clock.textContent = clockFmt.format(new Date()));
  tick(); setInterval(tick, 1000);

  const active = C.outreach.status === "active";
  const pill = document.getElementById("outreach-pill");
  pill.textContent = active ? "Outreach: ACTIVE" : "Outreach: PAUSED";
  pill.className = "pill " + (active ? "active" : "paused");
  const notice = document.getElementById("notice");
  if (!active) { notice.textContent = `Outreach paused since ${C.outreach.since}. ${C.outreach.note}`; notice.classList.add("show"); }
  document.getElementById("office-mode").textContent = active ? "Pipeline running" : "Standing by — outreach paused";

  const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: C.timeZone, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  function dataPill(st) {
    const p = document.getElementById("data-pill");
    if (!st.stats) { p.textContent = "Data unavailable"; p.className = "pill data stale"; return; }
    p.textContent = st.stale ? "Data stale" : "Live data";
    p.className = "pill data " + (st.stale ? "stale" : "live");
    p.title = st.stale ? `Last good load ${st.lastOk ? timeFmt.format(st.lastOk) : "unknown"}${st.error ? " (" + st.error + ")" : ""}` : "";
    document.getElementById("footer-data").textContent =
      `Stats generated ${timeFmt.format(new Date(st.stats.generated_at))} PT. Last loaded ${st.lastOk ? timeFmt.format(st.lastOk) : "—"} PT. Refreshes every ${C.pollSeconds}s.`;
  }

  function glance(s) {
    const st = Object.keys(s.states).length;
    document.getElementById("office-glance").innerHTML = [
      ["Leads", s.leads.total], ["With email", s.leads.with_email], ["States", st], ["Cities", s.cities.length]
    ].map(([l, n]) => `<div class="stat"><div class="n">${n}</div><div class="l">${l}</div></div>`).join("");
  }

  let started = false;
  HQData.onChange((st, prev) => {
    dataPill(st);
    if (!st.stats) return;
    const s = st.stats;
    Object.entries(s.states).forEach(([a, d]) => (window.HQ_STATE_NAMES[a] = d.name));
    HQLog.addRepoEvents(s.events);
    glance(s);
    HQOffice.update(s, prev);
    HQWarRoom.update(s);
    HQMission.update(s);
    if (!started) { started = true; HQLog.add("Cassius", active ? "opened the floor. Outreach is active." : "opened the floor. Outreach is paused; the team stands by."); }
  });

  show();
  HQOffice.start();
  HQWarRoom.init();
  HQData.start();
})();
