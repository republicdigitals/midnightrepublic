// Shared event log rendered into every [data-log] list.
(function () {
  const C = window.HQ_CONFIG;
  const MAX = 60;
  const items = [];
  const seenRepo = new Set();
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: C.timeZone, hour: "2-digit", minute: "2-digit", hour12: false });
  const fmtDay = new Intl.DateTimeFormat("en-US", { timeZone: C.timeZone, month: "short", day: "numeric" });

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  function stamp(d) {
    const today = fmtDay.format(new Date()) === fmtDay.format(d);
    return (today ? "" : fmtDay.format(d) + " ") + fmt.format(d);
  }

  function render() {
    document.querySelectorAll("[data-log]").forEach((ol) => {
      ol.innerHTML = items.length
        ? items.map((e) => `<li><time>${stamp(e.t)}</time><span>${e.who ? `<span class="who">${esc(e.who)}</span> ` : ""}${esc(e.msg)}</span></li>`).join("")
        : `<li class="empty">No events yet.</li>`;
    });
  }

  function add(who, msg, t) {
    items.push({ who, msg, t: t || new Date() });
    items.sort((a, b) => b.t - a.t);
    items.length = Math.min(items.length, MAX);
    render();
  }

  window.HQLog = {
    add,
    addRepoEvents(events) {
      (events || []).forEach((e) => {
        const k = e.t + e.msg;
        if (seenRepo.has(k)) return;
        seenRepo.add(k);
        const who = e.who || "Devin";
        add(who, (who === "Cassius" ? "updated outreach: " : "updated the lead files: ") + e.msg, new Date(e.t));
      });
    },
    render
  };
})();
