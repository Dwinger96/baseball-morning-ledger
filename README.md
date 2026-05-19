# The Baseball Morning Ledger

A morning-newspaper style baseball recap at:

https://baseballmorningledger.com

## What exists now

- `index.html` is the front page.
- `assets-ledger.js` loads the saved daily data and fills in the scoreboard, box score desk, scoring summary, standings, sortable league leaders, and today's slate.
- `scripts/fetch-yesterday.js` pulls yesterday's completed games, box scores, scoring plays, play logs, standings, leaders, and today's slate from the public MLB Stats API and writes `data/yesterday.json` plus `data/yesterday-data.js`.

## Update the daily edition

Run this from the project folder:

```powershell
C:\Users\dwinger\AppData\Local\OpenAI\Codex\bin\node.exe .\scripts\fetch-yesterday.js
```

To fetch a specific previous-day edition:

```powershell
C:\Users\dwinger\AppData\Local\OpenAI\Codex\bin\node.exe .\scripts\fetch-yesterday.js 2026-05-13
```

To fetch a specific previous-day edition and a specific slate date:

```powershell
C:\Users\dwinger\AppData\Local\OpenAI\Codex\bin\node.exe .\scripts\fetch-yesterday.js 2026-05-13 2026-05-14
```

The script uses Eastern time and writes the daily files to `data/yesterday.json` and `data/yesterday-data.js`. Run it again whenever the data shape changes or when you want the newest morning edition.

## Open the site

Open:

https://baseballmorningledger.com

