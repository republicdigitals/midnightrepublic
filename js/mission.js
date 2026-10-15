// Pipeline wall, sending accounts, warm leads, lead sources.
(function () {
  const C = window.HQ_CONFIG;
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  function stage(label, n, sub, live) {
    return `<div class="stage ${live ? "live" : "wait"}"><div class="n">${n}</div><div class="l">${label}</div><div class="s">${sub}</div></div>`;
  }

  function update(s) {
    const log = s.sent_log;
    const aw = "Awaiting send log";
    document.getElementById("pipeline").innerHTML = [
      stage("Leads", s.leads.total, `${s.leads.with_email} with email`, true),
      stage("Research", log && log.researched != null ? log.researched : "—", log && log.researched != null ? "researched" : aw, !!(log && log.researched != null)),
      stage("Drafted", log && log.drafted != null ? log.drafted : "—", log && log.drafted != null ? "drafted" : aw, !!(log && log.drafted != null)),
      stage("Sent", log ? log.sent : "—", log ? `${log.delivered} delivered, ${log.bounced} bounced` : aw, !!log),
      stage("Replies", log && log.replies != null ? log.replies : "—", log && log.replies != null ? "replies" : aw, !!(log && log.replies != null))
    ].join("");

    const paused = C.outreach.status !== "active";
    document.getElementById("accounts").innerHTML = C.accounts.map((a) => {
      const today = log && log.sent_today ? log.sent_today[a.email] || 0 : null;
      return `<div class="account"><div class="em">${esc(a.email)}</div>
        <dl class="kv"><dt>Status</dt><dd>${paused ? "Paused" : "Active"}</dd>
        <dt>Daily cap</dt><dd>${a.dailyCap}</dd>
        <dt>Sent today</dt><dd>${today == null ? '<span class="awaiting">awaiting send log</span>' : `${today} / ${a.dailyCap}`}</dd></dl>
        <div class="bar"><span style="width:${today == null ? 0 : Math.min(100, (today / a.dailyCap) * 100)}%"></span></div></div>`;
    }).join("");

    const warm = s.warm_leads || C.warmLeads;
    document.getElementById("warm-source").textContent = s.warm_leads ? "from warm_leads.csv" : "from config";
    document.getElementById("warm").innerHTML = warm.map((w) =>
      `<li><div class="nm">${esc(w.name)} — ${esc(w.venue)}</div><div class="st">${esc(w.state)}</div></li>`).join("");

    const src = Object.entries(s.leads.sources).sort((a, b) => b[1] - a[1]);
    document.getElementById("sources").innerHTML = src.map(([k, n]) =>
      `<div class="row"><span>${esc(k)}</span><strong>${n}</strong></div><div class="bar"><span style="width:${(n / s.leads.total) * 100}%"></span></div>`).join("") +
      `<div class="row muted"><span>Without email</span><span>${s.leads.without_email}</span></div>`;
  }

  window.HQMission = { update };
})();
