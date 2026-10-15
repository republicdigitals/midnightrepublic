// Fetches hq_stats.json, keeps last-good data, re-polls, and notifies listeners.
(function () {
  const C = window.HQ_CONFIG;
  const KEY = "hq:lastGood";
  const listeners = [];
  const state = { stats: null, stale: false, lastOk: null, error: null };

  function url() {
    const d = C.data;
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !/[?&]remote\b/.test(location.search)) return `${d.statsFile}?t=${Date.now()}`;
    return `https://raw.githubusercontent.com/${d.owner}/${d.repo}/${d.branch}/${d.statsFile}?t=${Date.now()}`;
  }

  function valid(s) {
    return s && s.leads && typeof s.leads.total === "number" && s.states && Array.isArray(s.cities);
  }

  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && valid(saved.stats)) { state.stats = saved.stats; state.lastOk = new Date(saved.at); state.stale = true; }
  } catch (e) { /* ignore */ }

  async function load() {
    const prev = state.stats;
    try {
      const res = await fetch(url(), { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const s = await res.json();
      if (!valid(s)) throw new Error("Unexpected stats format");
      state.stats = s; state.stale = false; state.error = null; state.lastOk = new Date();
      try { localStorage.setItem(KEY, JSON.stringify({ stats: s, at: state.lastOk.toISOString() })); } catch (e) { /* ignore */ }
    } catch (e) {
      state.stale = true; state.error = e.message;
    }
    listeners.forEach((fn) => fn(state, prev));
  }

  window.HQData = {
    state,
    onChange(fn) { listeners.push(fn); if (state.stats) fn(state, null); },
    start() { load(); setInterval(load, (C.pollSeconds || 60) * 1000); },
    // outreach.json in the lead repo (via hq_stats.json) wins; config.js is the fallback.
    outreach() { return (state.stats && state.stats.outreach) || C.outreach; },
    outreachActive() { return window.HQData.outreach().status === "active"; },
    sentToday(email) {
      const log = state.stats && state.stats.sent_log;
      if (!log) return null;
      const day = new Intl.DateTimeFormat("en-CA", { timeZone: C.timeZone }).format(new Date());
      if (log.sent_by_day) return (log.sent_by_day[day] || {})[email] || 0;
      return log.sent_today ? log.sent_today[email] || 0 : null;
    }
  };
})();
