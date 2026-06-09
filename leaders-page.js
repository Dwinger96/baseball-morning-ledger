(function () {
  const leadersTable = document.querySelector("#leaders-table");
  const overallLeadersTab = document.querySelector("#overall-leaders-tab");
  const alLeadersTab = document.querySelector("#al-leaders-tab");
  const nlLeadersTab = document.querySelector("#nl-leaders-tab");
  const rookieLeadersTab = document.querySelector("#rookie-leaders-tab");
  const hittingLeadersTab = document.querySelector("#hitting-leaders-tab");
  const pitchingLeadersTab = document.querySelector("#pitching-leaders-tab");
  const pitchingRoleControls = document.querySelector("#pitching-role-controls");
  const starterPitchersTab = document.querySelector("#starter-pitchers-tab");
  const reliefPitchersTab = document.querySelector("#relief-pitchers-tab");
  const allPitchersTab = document.querySelector("#all-pitchers-tab");
  const leadersNote = document.querySelector("#leaders-note");
  const lastUpdated = document.querySelector("#last-updated");
  const editionBar = document.querySelector(".edition-bar");
  const edition = window.ledgerEdition;
  let leagueFilter = "overall";
  let leaderMode = "hitting";
  let pitchingRole = "starters";
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

    if (pitchingRole === "relievers") {
      return leagueFilter === "rookies" ? leaders?.pitching?.rookies : leaders?.pitching?.all;
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

  function inningsValue(row) {
    return numericStat(row?.inningsPitched || 0);
  }

  function hasPitcherRoleData(rows) {
    return (rows || []).some((row) => row.gamesStarted !== undefined || row.gamesPitched !== undefined);
  }

  function roleFilteredPitchers(rows) {
    if (leaderMode !== "pitching" || pitchingRole === "all") return rows || [];
    const list = rows || [];
    const hasRoleData = hasPitcherRoleData(list);

    if (pitchingRole === "starters") {
      return hasRoleData ? list.filter((row) => Number(row.gamesStarted || 0) > 0) : list;
    }

    const relievers = hasRoleData
      ? list.filter((row) => Number(row.gamesStarted || 0) === 0 && Number(row.gamesPitched || 0) > 0)
      : list.filter((row) => Number(row.saves || 0) > 0 || Number(row.holds || 0) > 0);

    if (["era", "whip"].includes(leaderSort)) {
      return relievers.filter(
        (row) => Number(row.gamesPitched || 0) >= 10 || Number(row.saves || 0) > 0 || Number(row.holds || 0) > 0 || inningsValue(row) >= 10,
      );
    }

    return relievers.length ? relievers : list;
  }

  function sortableHeader(label, sortKey) {
    const active = leaderSort === sortKey ? " *" : "";
    return `<button class="sortable-heading" type="button" data-sort="${sortKey}">${label}${active}</button>`;
  }

  function renderLeaders() {
    if (!leadersTable) return;

    const rows = sortLeaderRows(roleFilteredPitchers(leagueFilteredRows(leaderPool(edition?.leaders)))).slice(0, 25);
    const leagueLabel =
      leagueFilter === "al" ? "American League" : leagueFilter === "nl" ? "National League" : "Overall";
    const label = leagueFilter === "rookies" ? "Rookie" : leagueLabel;
    const pitchingLabel =
      pitchingRole === "starters" ? "Starting Pitching" : pitchingRole === "relievers" ? "Relief Pitching" : "Pitching";
    const caption = leaderMode === "hitting" ? `${label} Hitting Leaders` : `${label} ${pitchingLabel} Leaders`;
    const note =
      leaderMode === "hitting"
        ? "AVG and OPS use qualified batters. HR and RBI include all players."
        : pitchingRole === "relievers"
          ? "Reliever ERA and WHIP use pitchers with meaningful relief work. Saves, holds, and strikeouts include relievers."
          : pitchingRole === "starters"
            ? "Starter ERA and WHIP use qualified pitchers. IP and strikeouts include starting pitchers."
            : "ERA and WHIP use qualified pitchers. K, saves, and holds include all pitchers.";

    hittingLeadersTab?.classList.toggle("active", leaderMode === "hitting");
    pitchingLeadersTab?.classList.toggle("active", leaderMode === "pitching");
    pitchingRoleControls?.classList.toggle("is-hidden", leaderMode !== "pitching");
    starterPitchersTab?.classList.toggle("active", leaderMode === "pitching" && pitchingRole === "starters");
    reliefPitchersTab?.classList.toggle("active", leaderMode === "pitching" && pitchingRole === "relievers");
    allPitchersTab?.classList.toggle("active", leaderMode === "pitching" && pitchingRole === "all");
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
            <th>${sortableHeader("G", "gamesPitched")}</th>
            <th>${sortableHeader("GS", "gamesStarted")}</th>
            <th>${sortableHeader("IP", "inningsPitched")}</th>
            <th>${sortableHeader("ERA", "era")}</th>
            <th>${sortableHeader("WHIP", "whip")}</th>
            <th>${sortableHeader("K", "strikeOuts")}</th>
            <th>${sortableHeader("SV", "saves")}</th>
            <th>${sortableHeader("HLD", "holds")}</th>
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
                        <td>${row.gamesPitched ?? "-"}</td>
                        <td>${row.gamesStarted ?? "-"}</td>
                        <td>${row.inningsPitched}</td>
                        <td>${row.era}</td>
                        <td>${row.whip}</td>
                        <td>${row.strikeOuts}</td>
                        <td>${row.saves}</td>
                        <td>${row.holds ?? 0}</td>
                      </tr>
                    `,
                  )
                  .join("")
              : `<tr><td colspan="10" class="summary-play">No pitching leaders available yet. Run the daily update again.</td></tr>`
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
    pitchingRole = "starters";
    leaderSort = "era";
    renderLeaders();
  });

  starterPitchersTab?.addEventListener("click", () => {
    leaderMode = "pitching";
    pitchingRole = "starters";
    leaderSort = "era";
    renderLeaders();
  });

  reliefPitchersTab?.addEventListener("click", () => {
    leaderMode = "pitching";
    pitchingRole = "relievers";
    leaderSort = "saves";
    renderLeaders();
  });

  allPitchersTab?.addEventListener("click", () => {
    leaderMode = "pitching";
    pitchingRole = "all";
    leaderSort = "strikeOuts";
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
