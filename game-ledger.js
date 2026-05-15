(function () {
  const params = new URLSearchParams(window.location.search);
  const gamePk = Number(params.get("gamePk"));
  const edition = window.ledgerEdition;

  const gameTitle = document.querySelector("#game-title");
  const gameSubtitle = document.querySelector("#game-subtitle");
  const gameStatus = document.querySelector("#game-status");
  const lineScore = document.querySelector("#game-line-score");
  const awayBatting = document.querySelector("#game-away-batting");
  const homeBatting = document.querySelector("#game-home-batting");
  const awayPitching = document.querySelector("#game-away-pitching");
  const homePitching = document.querySelector("#game-home-pitching");
  const scoringSummary = document.querySelector("#game-scoring-summary");
  const playLog = document.querySelector("#game-play-log");
  const lastUpdated = document.querySelector("#last-updated");

  function displayTeamName(name) {
    const names = {
      "Arizona D-backs": "Arizona Diamondbacks",
      "D-backs": "Diamondbacks",
    };
    return names[name] || name;
  }

  function selectedGame() {
    return edition?.games?.find((game) => game.gamePk === gamePk) || edition?.games?.[0];
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

  function renderLineScore(game) {
    const inningHeaders = (game.innings || []).map((inning) => `<th>${inning.num}</th>`).join("");
    const awayInnings = (game.innings || []).map((inning) => `<td>${inning.away ?? ""}</td>`).join("");
    const homeInnings = (game.innings || []).map((inning) => `<td>${inning.home ?? ""}</td>`).join("");

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

  function renderBattingBox(table, game, side) {
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

  function renderScoringSummary(game) {
    const rows = (game.scoringPlays || []).length
      ? game.scoringPlays
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
      : `<tr><td colspan="3" class="summary-play">No scoring plays available for this game yet.</td></tr>`;

    scoringSummary.innerHTML = `
      <caption>${displayTeamName(game.away.name)} at ${displayTeamName(game.home.name)}</caption>
      <thead>
        <tr><th>Inning</th><th>Score</th><th>Play</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    `;
  }

  function halfLabel(half, inning) {
    return `${half === "bottom" ? "Bottom" : "Top"} ${inning}`;
  }

  function playText(play) {
    const description = cleanPlayDescription(play.description);
    const score =
      Number.isFinite(play.awayScore) && Number.isFinite(play.homeScore)
        ? ` (${play.awayScore}-${play.homeScore})`
        : "";
    return `${play.batter}: ${description}${score}`;
  }

  function renderPlayLog(game) {
    if (!playLog) return;

    const plays = game.playLog || [];
    if (!plays.length) {
      playLog.innerHTML = `<p class="selected-game-label">Run the daily update again to load full play logs for this game.</p>`;
      return;
    }

    const groups = [];
    plays.forEach((play) => {
      const key = `${play.inning}-${play.half}`;
      let group = groups.find((item) => item.key === key);
      if (!group) {
        group = { key, inning: play.inning, half: play.half, plays: [] };
        groups.push(group);
      }
      group.plays.push(play);
    });

    playLog.innerHTML = groups
      .map(
        (group) => `
          <section class="play-half">
            <h3>${halfLabel(group.half, group.inning)}</h3>
            <ol>
              ${group.plays.map((play) => `<li>${playText(play)}</li>`).join("")}
            </ol>
          </section>
        `,
      )
      .join("");
  }

  function render() {
    const game = selectedGame();
    if (!edition || !game) {
      gameTitle.textContent = "Game Not Found";
      gameSubtitle.textContent = "Return to the morning edition and choose another game.";
      return;
    }

    const winner = game.away.score > game.home.score ? game.away : game.home;
    const loser = game.away.score > game.home.score ? game.home : game.away;
    gameTitle.textContent = `${displayTeamName(game.away.name)} at ${displayTeamName(game.home.name)}`;
    gameSubtitle.textContent = `${displayTeamName(winner.name)} ${winner.score}, ${displayTeamName(loser.name)} ${loser.score}`;
    gameStatus.textContent = `${game.status || "Final"} - ${game.venue || "Ballpark"}`;

    renderLineScore(game);
    renderBattingBox(awayBatting, game, "away");
    renderBattingBox(homeBatting, game, "home");
    renderPitchingBox(awayPitching, game, "away");
    renderPitchingBox(homePitching, game, "home");
    renderScoringSummary(game);
    renderPlayLog(game);

    if (lastUpdated && edition.generatedAt) {
      const timestamp = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Toronto",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(edition.generatedAt));
      lastUpdated.textContent = `Last Updated ${timestamp} Eastern`;
    }
  }

  render();
})();
