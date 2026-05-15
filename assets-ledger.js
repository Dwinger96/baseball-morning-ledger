(function () {
  const scoreboard = document.querySelector("#scoreboard");
  const lineScore = document.querySelector(".line-score");
  const editionBar = document.querySelector(".edition-bar");
  const scoringSummaryTable = document.querySelector("#scoring-summary-table");
  const awayBattingBoxTable = document.querySelector("#away-batting-box-table");
  const homeBattingBoxTable = document.querySelector("#home-batting-box-table");
  const awayPitchingBoxTable = document.querySelector("#away-pitching-box-table");
  const homePitchingBoxTable = document.querySelector("#home-pitching-box-table");
  const boxScoreNote = document.querySelector("#box-score-note");
  const todaySlateTable = document.querySelector("#today-slate-table");
  const standingsSnapshot = document.querySelector("#standings-snapshot");
  const leadersTable = document.querySelector("#leaders-table");
  const hittingLeadersTab = document.querySelector("#hitting-leaders-tab");
  const pitchingLeadersTab = document.querySelector("#pitching-leaders-tab");
  const leadersNote = document.querySelector("#leaders-note");
  const selectedGameLabel = document.querySelector("#selected-game-label");
  const lastUpdated = document.querySelector("#last-updated");
  let leaderMode = "hitting";
  let leaderSort = "ops";
  let selectedGamePk = null;
  const nationalLeagueTeamIds = new Set([108, 109, 112, 113, 115, 118, 119, 120, 121, 133, 134, 135, 137, 138, 143, 158]);

  function isWinner(game, side) {
    return game[side].score > game[side === "away" ? "home" : "away"].score;
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

  function formatGameTime(dateString) {
    if (!dateString) return "TBD";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Toronto",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(dateString));
  }

  function formatUpdatedTime(dateString) {
    if (!dateString) return "";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Toronto",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(dateString));
  }

  function displayTeamName(name) {
    const names = {
      "Arizona D-backs": "Arizona Diamondbacks",
      "D-backs": "Diamondbacks",
      Athletics: "Oakland Athletics",
    };
    return names[name] || name;
  }

  function gameLeagueId(game) {
    if (game.home.leagueId) return game.home.leagueId;
    if (nationalLeagueTeamIds.has(game.home.id)) return 104;
    return 103;
  }

  function renderScoreboard(edition) {
    if (!scoreboard || !edition.games?.length) return;
    const selectedGame = getSelectedGame(edition);

    const gamesByLeague = [
      { id: 103, name: "American League", games: [] },
      { id: 104, name: "National League", games: [] },
    ];

    edition.games.forEach((game) => {
      const league = gamesByLeague.find((item) => item.id === gameLeagueId(game)) || gamesByLeague[0];
      league.games.push(game);
    });

    scoreboard.innerHTML = gamesByLeague
      .map(
        (league) => `
          <div class="scoreboard-league" data-league-id="${league.id}">
            <p class="section-kicker">${league.name} Games - ${formatDate(edition.date)}</p>
          </div>
        `,
      )
      .join("");

    edition.games.forEach((game) => {
      const leagueId = gameLeagueId(game) === 104 ? 104 : 103;
      const leagueColumn = scoreboard.querySelector(`[data-league-id="${leagueId}"]`);
      const card = document.createElement("div");
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.className = `score-card ${game.gamePk === selectedGame.gamePk ? "selected" : ""}`;
      card.setAttribute("aria-pressed", game.gamePk === selectedGame.gamePk ? "true" : "false");
      card.innerHTML = `
        <header><span>${game.status || "Final"}</span><span>${game.venue || "Ballpark"}</span></header>
        <div class="teams">
          <div class="team-row ${isWinner(game, "away") ? "winner" : ""}">
            <span>${displayTeamName(game.away.name)}</span><strong>${game.away.score}</strong>
          </div>
          <div class="team-row ${isWinner(game, "home") ? "winner" : ""}">
            <span>${displayTeamName(game.home.name)}</span><strong>${game.home.score}</strong>
          </div>
        </div>
        <a class="game-ledger-link" href="game.html?gamePk=${game.gamePk}">Open Full Game Record</a>
      `;
      card.querySelector(".game-ledger-link")?.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      card.addEventListener("click", () => {
        selectedGamePk = game.gamePk;
        renderEdition(edition);
        document.querySelector("#box-score")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectedGamePk = game.gamePk;
          renderEdition(edition);
          document.querySelector("#box-score")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
      leagueColumn?.appendChild(card);
    });

    scoreboard.querySelectorAll(".scoreboard-league").forEach((column) => {
      if (column.querySelectorAll(".score-card").length === 0) {
        const empty = document.createElement("p");
        empty.className = "small-note";
        empty.textContent = "No games listed.";
        column.appendChild(empty);
      }
    });
  }

  function renderLineScore(edition) {
    const game = getSelectedGame(edition);
    if (!lineScore || !game?.innings?.length) return;

    const inningHeaders = game.innings.map((inning) => `<th>${inning.num}</th>`).join("");
    const awayInnings = game.innings.map((inning) => `<td>${inning.away ?? ""}</td>`).join("");
    const homeInnings = game.innings.map((inning) => `<td>${inning.home ?? ""}</td>`).join("");

    lineScore.innerHTML = `
      <thead>
        <tr>
          <th>Team</th>
          ${inningHeaders}
          <th>R</th>
          <th>H</th>
          <th>E</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${displayTeamName(game.away.name)}</td>
          ${awayInnings}
          <td>${game.away.score}</td>
          <td>${game.away.hits ?? "-"}</td>
          <td>${game.away.errors ?? "-"}</td>
        </tr>
        <tr>
          <td>${displayTeamName(game.home.name)}</td>
          ${homeInnings}
          <td>${game.home.score}</td>
          <td>${game.home.hits ?? "-"}</td>
          <td>${game.home.errors ?? "-"}</td>
        </tr>
      </tbody>
    `;
  }

  function getGameOfDay(edition) {
    return edition.games?.find((candidate) => candidate.gamePk === edition.gameOfDay) || edition.games?.[0];
  }

  function getSelectedGame(edition) {
    if (!selectedGamePk) {
      selectedGamePk = getGameOfDay(edition)?.gamePk || null;
    }

    return edition.games?.find((candidate) => candidate.gamePk === selectedGamePk) || getGameOfDay(edition);
  }

  function inningLabel(play) {
    const suffixes = { 1: "st", 2: "nd", 3: "rd" };
    const suffix = suffixes[play.inning] || "th";
    const half = play.half === "bottom" ? "Bot." : "Top";
    return `${half} ${play.inning}${suffix}`;
  }

  function scoreLabel(game, play) {
    const away = play.awayScore ?? game.away.score;
    const home = play.homeScore ?? game.home.score;
    return `${game.away.abbreviation || game.away.name} ${away}, ${game.home.abbreviation || game.home.name} ${home}`;
  }

  function cleanPlayDescription(play) {
    return (play || "Scoring play")
      .replace(/\s+on a (ground ball|line drive|fly ball|sharp line drive|soft ground ball) to /i, " to ")
      .replace(/fielder\s+/gi, "")
      .replace(/baseman\s+/gi, "")
      .replace(/Umpire reviewed .*?:\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function renderScoringSummary(edition) {
    const game = getSelectedGame(edition);
    if (!scoringSummaryTable || !game) return;

    const plays = game.scoringPlays || [];
    const caption = `${displayTeamName(game.away.name)} at ${displayTeamName(game.home.name)}`;
    const rows = plays.length
      ? plays
          .map(
            (play) => `
              <tr>
                <td>${inningLabel(play)}</td>
                <td>${scoreLabel(game, play)}</td>
                <td class="summary-play">${cleanPlayDescription(play.play)}</td>
              </tr>
            `,
          )
          .join("")
      : `
          <tr>
            <td colspan="3" class="summary-play">No scoring plays available for this game yet.</td>
          </tr>
        `;

    scoringSummaryTable.innerHTML = `
      <caption>${caption}</caption>
      <thead>
        <tr><th>Inning</th><th>Score</th><th>Play</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    `;
  }

  function renderBattingBox(table, game, side) {
    if (!table) return;

    const team = game[side];
    const lines = game.boxScore?.[side]?.batting || [];
    const rows = lines.length
      ? lines
          .map(
            (line) => `
              <tr>
                <td>${line.name}${line.position ? ` ${line.position}` : ""}</td>
                <td>${line.atBats ?? 0}</td>
                <td>${line.runs ?? 0}</td>
                <td>${line.hits ?? 0}</td>
                <td>${line.homeRuns ?? 0}</td>
                <td>${line.rbi ?? 0}</td>
                <td>${line.walks ?? 0}</td>
                <td>${line.strikeOuts ?? 0}</td>
              </tr>
            `,
          )
          .join("")
      : `<tr><td colspan="8" class="summary-play">No batting lines available for this team yet.</td></tr>`;

    table.innerHTML = `
      <caption>${displayTeamName(team.name)} Batting</caption>
      <thead>
        <tr><th>Player</th><th>AB</th><th>R</th><th>H</th><th>HR</th><th>RBI</th><th>BB</th><th>K</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    `;
  }

  function renderPitchingBox(table, game, side) {
    if (!table) return;

    const team = game[side];
    const lines = game.boxScore?.[side]?.pitching || [];
    const rows = lines.length
      ? lines
          .map(
            (line) => `
              <tr>
                <td>${line.name}</td>
                <td>${line.inningsPitched ?? "0.0"}</td>
                <td>${line.hits ?? 0}</td>
                <td>${line.earnedRuns ?? 0}</td>
                <td>${line.walks ?? 0}</td>
                <td>${line.strikeOuts ?? 0}</td>
                <td>${line.pitches ?? "-"}</td>
              </tr>
            `,
          )
          .join("")
      : `<tr><td colspan="7" class="summary-play">No pitching lines available for this team yet.</td></tr>`;

    table.innerHTML = `
      <caption>${displayTeamName(team.name)} Pitching</caption>
      <thead>
        <tr><th>Pitcher</th><th>IP</th><th>H</th><th>ER</th><th>BB</th><th>K</th><th>P</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    `;
  }

  function renderBoxScore(edition) {
    const game = getSelectedGame(edition);
    if (!game) return;

    renderBattingBox(awayBattingBoxTable, game, "away");
    renderBattingBox(homeBattingBoxTable, game, "home");
    renderPitchingBox(awayPitchingBoxTable, game, "away");
    renderPitchingBox(homePitchingBoxTable, game, "home");

    if (boxScoreNote) {
      boxScoreNote.textContent = `Featured box score: ${displayTeamName(game.away.name)} at ${displayTeamName(game.home.name)}.`;
    }

    if (selectedGameLabel) {
      const winner = game.away.score > game.home.score ? game.away : game.home;
      const loser = game.away.score > game.home.score ? game.home : game.away;
      selectedGameLabel.textContent = `Selected Game: ${displayTeamName(winner.name)} ${winner.score}, ${displayTeamName(loser.name)} ${loser.score}`;
    }
  }

  function renderTodaySlate(edition) {
    if (!todaySlateTable) return;

    const games = edition.todaySlate || [];
    const rows = games.length
      ? games
          .map((game) => {
            const awayPitcher = game.away.probablePitcher || "TBD";
            const homePitcher = game.home.probablePitcher || "TBD";
            return `
              <tr>
                <td>${displayTeamName(game.away.name)} at ${displayTeamName(game.home.name)}</td>
                <td>${formatGameTime(game.startTime)}</td>
                <td>${awayPitcher} vs ${homePitcher}</td>
              </tr>
            `;
          })
          .join("")
      : `<tr><td colspan="3" class="summary-play">No games listed for today's slate yet.</td></tr>`;

    todaySlateTable.innerHTML = `
      <caption>Probables And First Pitch${edition.slateDate ? ` - ${formatDate(edition.slateDate)}` : ""}</caption>
      <thead>
        <tr><th>Matchup</th><th>Time</th><th>Probables</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    `;
  }

  function renderStandingTable(table, options) {
    const rows = (table.rows || []).slice(0, options.limit || 5);
    const body = rows.length
      ? rows
          .map(
            (row) => `
              <tr>
                <td>${displayTeamName(row.team)}</td>
                <td>${row.wins}</td>
                <td>${row.losses}</td>
                <td>${options.gbKey === "wildCardGamesBack" ? row.wildCardGamesBack : row.gamesBack}</td>
                <td>${row.lastTen || "-"}</td>
                <td>${row.streak || "-"}</td>
              </tr>
            `,
          )
          .join("")
      : `<tr><td colspan="6" class="summary-play">No standings available yet.</td></tr>`;

    return `
      <table class="data-table">
        <caption>${table.name}</caption>
        <thead>
          <tr><th>Team</th><th>W</th><th>L</th><th>GB</th><th>L10</th><th>Strk</th></tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    `;
  }

  function renderStandings(edition) {
    if (!standingsSnapshot) return;

    const divisions = edition.standings?.divisions || [];
    const wildCards = edition.standings?.wildCards || [];

    if (!divisions.length && !wildCards.length) {
      return;
    }

    const renderLeague = (leagueId, leagueName) => {
      const leagueDivisions = divisions
        .filter((table) => table.leagueId === leagueId)
        .sort((a, b) => {
          const order = { East: 1, Central: 2, West: 3 };
          return (order[a.divisionName] || 9) - (order[b.divisionName] || 9);
        })
        .map((table) => renderStandingTable(table, { limit: 5, gbKey: "gamesBack" }))
        .join("");
      const leagueWildCards = wildCards
        .filter((table) => table.leagueId === leagueId)
        .map((table) =>
          renderStandingTable(
            { ...table, name: `${leagueName} Wild Card` },
            { limit: 6, gbKey: "wildCardGamesBack" },
          ),
        )
        .join("");

      return `
        <div class="standings-league">
          <h3 class="standings-league-title">${leagueName}</h3>
          ${leagueDivisions}${leagueWildCards}
        </div>
      `;
    };

    standingsSnapshot.innerHTML = `
      ${renderLeague(103, "American League")}
      ${renderLeague(104, "National League")}
    `;
  }

  function numericStat(value) {
    const parsed = Number.parseFloat(String(value).replace(/[^0-9.-]/g, ""));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function leaderPool(leaders) {
    if (leaderMode === "hitting") {
      return ["avg", "ops"].includes(leaderSort) ? leaders?.hitting?.qualified : leaders?.hitting?.all;
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

  function sortableHeader(label, sortKey) {
    const active = leaderSort === sortKey ? " *" : "";
    return `<button class="sortable-heading" type="button" data-sort="${sortKey}">${label}${active}</button>`;
  }

  function renderLeaders(edition) {
    if (!leadersTable) return;

    const rows = sortLeaderRows(leaderPool(edition.leaders)).slice(0, 10);
    const caption = leaderMode === "hitting" ? "Overall Hitting Leaders" : "Overall Pitching Leaders";
    const note =
      leaderMode === "hitting"
        ? "AVG and OPS use qualified batters. HR and RBI include all players."
        : "ERA and WHIP use qualified pitchers. K and Saves include all players.";

    if (hittingLeadersTab) hittingLeadersTab.classList.toggle("active", leaderMode === "hitting");
    if (pitchingLeadersTab) pitchingLeadersTab.classList.toggle("active", leaderMode === "pitching");
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
                        <td>${row.team || "-"}</td>
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
              : `<tr><td colspan="6" class="summary-play">No hitting leaders available yet.</td></tr>`
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
                        <td>${row.team || "-"}</td>
                        <td>${row.inningsPitched}</td>
                        <td>${row.era}</td>
                        <td>${row.whip}</td>
                        <td>${row.strikeOuts}</td>
                        <td>${row.saves}</td>
                      </tr>
                    `,
                  )
                  .join("")
              : `<tr><td colspan="6" class="summary-play">No pitching leaders available yet.</td></tr>`
          }
        </tbody>
      `;
    }

    leadersTable.querySelectorAll("[data-sort]").forEach((button) => {
      button.addEventListener("click", () => {
        leaderSort = button.dataset.sort;
        renderLeaders(edition);
      });
    });
  }

  function renderEditionBar(edition) {
    if (!editionBar) return;
    const timestamp = formatUpdatedTime(edition.generatedAt);
    editionBar.innerHTML = `
      <span>Games of ${formatDate(edition.date)}</span>
      <span>${timestamp ? `Updated ${timestamp} Eastern` : "Updated Daily at 5:00 AM Eastern"}</span>
    `;

    if (lastUpdated) {
      lastUpdated.textContent = timestamp ? `Last Updated ${timestamp} Eastern` : "No official league affiliation";
    }
  }

  function renderEdition(edition) {
    renderEditionBar(edition);
    renderScoreboard(edition);
    renderLineScore(edition);
    renderScoringSummary(edition);
    renderBoxScore(edition);
    renderTodaySlate(edition);
    renderStandings(edition);
    renderLeaders(edition);
  }

  async function loadEdition() {
    if (window.ledgerEdition) {
      renderEdition(window.ledgerEdition);
      attachLeaderTabs(window.ledgerEdition);
      return;
    }

    try {
      const response = await fetch("data/yesterday.json", { cache: "no-store" });
      if (!response.ok) return;
      const edition = await response.json();
      renderEdition(edition);
      attachLeaderTabs(edition);
    } catch (error) {
      console.warn("Using static sample edition.", error);
    }
  }

  function attachLeaderTabs(edition) {
    hittingLeadersTab?.addEventListener("click", () => {
      leaderMode = "hitting";
      leaderSort = "ops";
      renderLeaders(edition);
    });

    pitchingLeadersTab?.addEventListener("click", () => {
      leaderMode = "pitching";
      leaderSort = "era";
      renderLeaders(edition);
    });
  }

  loadEdition();
})();
