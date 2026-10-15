// All site settings live here. Point the site at another repo by editing `data`.
window.HQ_CONFIG = {
  data: {
    owner: "republicdigitals",
    repo: "midnightrepublic",
    branch: "main",
    statsFile: "data/hq_stats.json"
  },
  pollSeconds: 30,
  timeZone: "America/Los_Angeles",

  // Fallback only. The live status comes from outreach.json in the private lead repo.
  outreach: {
    status: "active", // "paused" | "active"
    since: "2026-10-15",
    note: "Active Oct 15: sending the remaining Facebook leads (Batch 9 Cambridge/Somerville plus new Connecticut leads)."
  },

  accounts: [
    { email: "liam@yeschefgroup.co", dailyCap: 30 },
    { email: "liam@jackdinningroom.com", dailyCap: 30 }
  ],

  // Used until warm_leads.csv exists in the repo.
  warmLeads: [
    { name: "Kyle L", venue: "The Local", state: "Media kit sent, decision pending" },
    { name: "Ron", venue: "Malted Barley Events", state: "Media kit sent, decision pending" }
  ],

  agents: [
    { id: "devin", name: "Caesar", role: "Lead generation", color: "#c9a44c" },
    { id: "livia", name: "Livia", role: "Scout", color: "#b9cf6a" },
    { id: "marcus", name: "Marcus", role: "Profiler", color: "#d96a5f" },
    { id: "octavia", name: "Octavia", role: "Verifier", color: "#6fc3cf" },
    { id: "cassius", name: "Cassius", role: "Consul", color: "#e8e1cf" },
    { id: "maren", name: "Maren", role: "Outreach research", color: "#5fa58a" },
    { id: "imogen", name: "Imogen", role: "Drafting", color: "#8fa8d8" },
    { id: "ash", name: "Ash", role: "Sending", color: "#d7875f" },
    { id: "kira", name: "Kira", role: "Sending", color: "#c47fb0" }
  ]
};
