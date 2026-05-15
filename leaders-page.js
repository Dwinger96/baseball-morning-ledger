(function () {
  const leadersTable = document.querySelector("#leaders-table");
  const overallLeadersTab = document.querySelector("#overall-leaders-tab");
  const alLeadersTab = document.querySelector("#al-leaders-tab");
  const nlLeadersTab = document.querySelector("#nl-leaders-tab");
  const rookieLeadersTab = document.querySelector("#rookie-leaders-tab");
  const hittingLeadersTab = document.querySelector("#hitting-leaders-tab");
  const pitchingLeadersTab = document.querySelector("#pitching-leaders-tab");
  const leadersNote = document.querySelector("#leaders-note");
  const lastUpdated = document.querySelector("#last-updated");
  const editionBar = document.querySelector(".edition-bar");
  const edition = window.ledgerEdition;
  let leagueFilter = "overall";
  let leaderMode = "hitting";
  let leaderSort = "ops";
  const alTeams = new Set(["BAL", "BOS", "CWS", "CLE", "DET", "HOU", "KC", "LAA", "MIN", "NYY", "ATH", "SEA", "TB", "TEX", "TOR"]);
  const nlTeams = new Set(["ARI", "ATL", "CHC", "CIN", "COL", "LAD", "MIA", "MIL", "NYM", "PHI", "PIT", "SD", "SF", "STL", "WSH"]);
  const alTeamNames = new Set([
    "Baltimore Orioles",
    "Boston Red Sox",
    "Chicago White Sox",
    "Cleveland Guardians",
    "Detroit Tigers",
    "Houston Astros",
    "Kansas City Royals",
    "Los Angeles Angels",
    "Minnesota Twins",
    "New York Yankees",
    "Athletics",
    "Seattle Mariners",
    "Tampa Bay Rays",
    "Texas Rangers",
    "Toronto Blue Jays",
  ]);
  const nlTeamNames = new Set([
    "Arizona Diamondbacks",
    "Arizona D-backs",
    "Atlanta Braves",
    "Chicago Cubs",
    "Cincinnati Reds",
    "Colorado Rockies",
    "Los Angeles Dodgers",
    "Miami Marlins",
    "Milwaukee Brewers",
    "New York Mets",
    "Philadelphia Phillies",
    "Pittsburgh Pirates",
    "San Diego Padres",
    "San Francisco Giants",
    "St. Louis Cardinals",
    "Washington Nationals",
  ]);

  function numericStat(value) {
    const parsed = Number.parseFloat(String(value).replace(/[^0-9.-]/g, ""));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function renderLastUpdated() {
    if (!lastUpdated || !edition?.generatedAt) return;
    const timestamp = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Toronto",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(edition.generatedAt));
    lastUpdated.textContent = `Last Updated ${timestamp} Eastern`;
  }

  function formatDate(dateString) {
    const date = new Date(`${dateString}T12:00:00`);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function renderEditionBar() {
    if (!editionBar || !edition?.date) return;
    const backLink = editionBar.querySelector("a")?.outerHTML || '<a href="index.html">Back To Morning Edition</a>';
    editionBar.innerHTML = `
      <span>The Baseball Morning Ledger</span>
      <span>Games of ${formatDate(edition.date)}</span>
      <span>${backLink}</span>
    `;
  }

  function displayTeamName(team) {
    const names = {
      Athletics: "Oakland Athletics",
      "Arizona D-backs": "Arizona Diamondbacks",
    };
    return names[team] || team;
  }

  function leaderPool(leaders) {
    if (leaderMode === "hitting") {
      if (leagueFilter === "rookies") {
        return ["avg", "ops"].includes(leaderSort) ? leaders?.hitting?.rookieQualified : leaders?.hitting?.rookies;
      }
      return ["avg", "ops"].includes(leaderSort) ? leaders?.hitting?.qualified : leaders?.hitting?.all;
    }

    if (leagueFilter === "rookies") {
      return ["era", "whip"].includes(leaderSort) ? leaders?.pitching?.rookieQualified : leaders?.pitching?.rookies;
    }
    return ["era", "whip"].includes(leaderSort) ? leaders?.pitching?.qualified : leaders?.pitching?.all;
  }

  function sortLeaderRows(rows) {
    const lowWins = ["era", "whip"];
    return [...(rows || [])].sort((a, b) => {
      const left = numericStat(a[leaderSort]);
      const right = numericStat(b[leaderSort]);
      return lowWins.includes(leaderSort) ? left - right : right - left;
    });
  }

  function leagueFilteredRows(rows) {
    if (leagueFilter === "overall" || leagueFilter === "rookies") return rows || [];
    const leagueId = leagueFilter === "al" ? 103 : 104;
    const teamSet = leagueFilter === "al" ? alTeams : nlTeams;
    const teamNameSet = leagueFilter === "al" ? alTeamNames : nlTeamNames;
    const filtered = (rows || []).filter(
      (row) => row.leagueId === leagueId || teamSet.has(row.team) || teamNameSet.has(row.team),
    );
    return filtered.length ? filtered : rows || [];
  }

  function sortableHeader(label, sortKey) {
    const active = leaderSort === sortKey ? " *" : "";
    return `<button class="sortable-heading" type="button" data-sort="${sortKey}">${label}${active}</button>`;
  }

  function renderLeaders() {
    if (!leadersTable) return;

    const rows = sortLeaderRows(leagueFilteredRows(leaderPool(edition?.leaders))).slice(0, 25);
    const leagueLabel =
      leagueFilter === "al" ? "American League" : leagueFilter === "nl" ? "National League" : "Overall";
    const label = leagueFilter === "rookies" ? "Rookie" : leagueLabel;
    const caption = leaderMode === "hitting" ? `${label} Hitting Leaders` : `${label} Pitching Leaders`;
    const note =
      leaderMode === "hitting"
        ? "AVG and OPS use qualified batters. HR and RBI include all players."
        : "ERA and WHIP use qualified pitchers. K and Saves include all players.";

    hittingLeadersTab?.classList.toggle("active", leaderMode === "hitting");
    pitchingLeadersTab?.classList.toggle("active", leaderMode === "pitching");
    overallLeadersTab?.classList.toggle("active", leagueFilter === "overall");
    alLeadersTab?.classList.toggle("active", leagueFilter === "al");
    nlLeadersTab?.classList.toggle("active", leagueFilter === "nl");
    rookieLeadersTab?.classList.toggle("active", leagueFilter === "rookies");
    if (leadersNote) leadersNote.textContent = `Click a stat heading to sort. ${note}`;

    if (leaderMode === "hitting") {
      leadersTable.innerHTML = `
        <caption>${caption}</caption>
        <thead>
          <tr>
            <th>Player</th>
            <th>Team</th>
            <th>${sortableHeader("G", "gamesPlayed")}</th>
            <th>${sortableHeader("AB", "atBats")}</th>
            <th>${sortableHeader("AVG", "avg")}</th>
            <th>${sortableHeader("HR", "homeRuns")}</th>
            <th>${sortableHeader("RBI", "rbi")}</th>
            <th>${sortableHeader("OPS", "ops")}</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows.length
              ? rows
                  .map(
                    (row) => `
                      <tr>
                        <td>${row.player}</td>
                        <td>${displayTeamName(row.team || "-")}</td>
                        <td>${row.gamesPlayed}</td>
                        <td>${row.atBats}</td>
                        <td>${row.avg}</td>
                        <td>${row.homeRuns}</td>
                        <td>${row.rbi}</td>
                        <td>${row.ops}</td>
                      </tr>
                    `,
                  )
                  .join("")
              : `<tr><td colspan="8" class="summary-play">No hitting leaders available yet. Run the daily update again.</td></tr>`
          }
        </tbody>
      `;
    } else {
      leadersTable.innerHTML = `
        <caption>${caption}</caption>
        <thead>
          <tr>
            <th>Pitcher</th>
            <th>Team</th>
            <th>${sortableHeader("IP", "inningsPitched")}</th>
            <th>${sortableHeader("ERA", "era")}</th>
            <th>${sortableHeader("WHIP", "whip")}</th>
            <th>${sortableHeader("K", "strikeOuts")}</th>
            <th>${sortableHeader("SV", "saves")}</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows.length
              ? rows
                  .map(
                    (row) => `
                      <tr>
                        <td>${row.player}</td>
                        <td>${displayTeamName(row.team || "-")}</td>
                        <td>${row.inningsPitched}</td>
                        <td>${row.era}</td>
                        <td>${row.whip}</td>
                        <td>${row.strikeOuts}</td>
                        <td>${row.saves}</td>
                      </tr>
                    `,
                  )
                  .join("")
              : `<tr><td colspan="7" class="summary-play">No pitching leaders available yet. Run the daily update again.</td></tr>`
          }
        </tbody>
      `;
    }

    leadersTable.querySelectorAll("[data-sort]").forEach((button) => {
      button.addEventListener("click", () => {
        leaderSort = button.dataset.sort;
        renderLeaders();
      });
    });
  }

  hittingLeadersTab?.addEventListener("click", () => {
    leaderMode = "hitting";
    leaderSort = "ops";
    renderLeaders();
  });

  pitchingLeadersTab?.addEventListener("click", () => {
    leaderMode = "pitching";
    leaderSort = "era";
    renderLeaders();
  });

  overallLeadersTab?.addEventListener("click", () => {
    leagueFilter = "overall";
    renderLeaders();
  });

  alLeadersTab?.addEventListener("click", () => {
    leagueFilter = "al";
    renderLeaders();
  });

  nlLeadersTab?.addEventListener("click", () => {
    leagueFilter = "nl";
    renderLeaders();
  });

  rookieLeadersTab?.addEventListener("click", () => {
    leagueFilter = "rookies";
    renderLeaders();
  });

  renderLeaders();
  renderEditionBar();
  renderLastUpdated();
})();
