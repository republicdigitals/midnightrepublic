# The Consulate — Agent HQ

Static dashboard (GitHub Pages, no build step). Three views behind one switcher: The Consulate (office), War Room (map), Mission Control (pipeline).

- All settings live in `config.js` (data repo/branch/file, poll interval, outreach status, accounts, warm leads fallback).
- Data comes from `data/hq_stats.json`, a counts-only file (no names, emails or phones). It's generated from the private lead CSVs by `scripts/build_hq_stats.py` in the lead repo and pushed here after each lead batch. The site re-fetches it every 60s and falls back to the last good copy, marked "Data stale", if a fetch fails.
- Run locally: `python3 -m http.server` and open http://localhost:8000.
