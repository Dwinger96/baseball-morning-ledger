const fs = require("fs/promises");
const path = require("path");

const API_BASE = "https://statsapi.mlb.com/api/v1";
const ROOT = path.resolve(__dirname, "..");
const OUTFILE = path.join(ROOT, "data", "yesterday.json");
const SCRIPT_OUTFILE = path.join(ROOT, "data", "yesterday-data.js");
const LEAGUES = {
  103: "American League",
  104: "National League",
};
const DIVISIONS = {
  200: "West",
  201: "East",
  202: "Central",
  203: "West",
  204: "East",
  205: "Central",
};
const TEAM_LEAGUES = {
  "Baltimore Orioles": 103,
  "Boston Red Sox": 103,
  "Chicago White Sox": 103,
  "Cleveland Guardians": 103,
  "Detroit Tigers": 103,
  "Houston Astros": 103,
  "Kansas City Royals": 103,
  "Los Angeles Angels": 103,
  "Minnesota Twins": 103,
  "New York Yankees": 103,
  Athletics: 103,
  "Seattle Mariners": 103,
  "Tampa Bay Rays": 103,
  "Texas Rangers": 103,
  "Toronto Blue Jays": 103,
  "Arizona Diamondbacks": 104,
  "Arizona D-backs": 104,
  "Atlanta Braves": 104,
  "Chicago Cubs": 104,
  "Cincinnati Reds": 104,
  "Colorado Rockies": 104,
  "Los Angeles Dodgers": 104,
  "Miami Marlins": 104,
  "Milwaukee Brewers": 104,
  "New York Mets": 104,
  "Philadelphia Phillies": 104,
  "Pittsburgh Pirates": 104,
  "San Diego Padres": 104,
  "San Francisco Giants": 104,
  "St. Louis Cardinals": 104,
  "Washington Nationals": 104,
};

function easternDateParts(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function yesterdayEastern() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return easternDateParts(date);
}

function todayEastern() {
  return easternDateParts(new Date());
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${url}`);
  }
  return response.json();
}

function inningsFromLinescore(linescore) {
  return (linescore.innings || []).map((inning) => ({
    num: inning.num,
    away: inning.away?.runs ?? 0,
    home: inning.home?.runs ?? 0,
  }));
}

function teamSummary(team, score, linescoreSide) {
  return {
    id: team.id,
    name: team.name,
    abbreviation: team.abbreviation || team.teamName || team.name,
    leagueId: team.league?.id || null,
    leagueName: LEAGUES[team.league?.id] || team.league?.name || "",
    score,
    hits: linescoreSide?.hits ?? null,
    errors: linescoreSide?.errors ?? null,
  };
}

function scoringPlaysFromLiveFeed(feed) {
  return (feed.liveData?.plays?.scoringPlays || [])
    .map((index) => feed.liveData?.plays?.allPlays?.[index])
    .filter(Boolean)
    .map((play) => ({
      inning: play.about?.inning,
      half: play.about?.halfInning,
      team: play.team?.abbreviation || play.team?.name,
      play: play.result?.description || "Scoring play",
      awayScore: play.result?.awayScore,
      homeScore: play.result?.homeScore,
    }));
}

function playLogFromLiveFeed(feed) {
  return (feed.liveData?.plays?.allPlays || []).map((play) => ({
    inning: play.about?.inning,
    half: play.about?.halfInning,
    batter: play.matchup?.batter?.fullName || "",
    pitcher: play.matchup?.pitcher?.fullName || "",
    result: play.result?.event || "",
    description: play.result?.description || "",
    rbi: play.result?.rbi ?? 0,
    awayScore: play.result?.awayScore,
    homeScore: play.result?.homeScore,
  }));
}

function playerFromBoxscore(boxscore, id) {
  return boxscore?.teams?.away?.players?.[`ID${id}`] || boxscore?.teams?.home?.players?.[`ID${id}`];
}

function battingLines(boxscore, side) {
  const team = boxscore?.teams?.[side];
  if (!team) return [];

  return (team.batters || [])
    .map((id) => playerFromBoxscore(boxscore, id))
    .filter((player) => player?.stats?.batting)
    .map((player) => {
      const stats = player.stats.batting;
      return {
        name: player.person?.fullName || "Player",
        position: player.position?.abbreviation || "",
        atBats: stats.atBats ?? 0,
        runs: stats.runs ?? 0,
        hits: stats.hits ?? 0,
        homeRuns: stats.homeRuns ?? 0,
        rbi: stats.rbi ?? 0,
        walks: stats.baseOnBalls ?? 0,
        strikeOuts: stats.strikeOuts ?? 0,
      };
    })
    .filter((line) => line.atBats || line.runs || line.hits || line.rbi || line.walks);
}

function pitchingLines(boxscore, side) {
  const team = boxscore?.teams?.[side];
  if (!team) return [];

  return (team.pitchers || [])
    .map((id) => playerFromBoxscore(boxscore, id))
    .filter((player) => player?.stats?.pitching)
    .map((player) => {
      const stats = player.stats.pitching;
      return {
        name: player.person?.fullName || "Pitcher",
        inningsPitched: stats.inningsPitched || "0.0",
        hits: stats.hits ?? 0,
        runs: stats.runs ?? 0,
        earnedRuns: stats.earnedRuns ?? 0,
        walks: stats.baseOnBalls ?? 0,
        strikeOuts: stats.strikeOuts ?? 0,
        homeRuns: stats.homeRuns ?? 0,
        pitches: stats.numberOfPitches ?? null,
      };
    });
}

function boxScoreLines(boxscore) {
  return {
    away: {
      batting: battingLines(boxscore, "away"),
      pitching: pitchingLines(boxscore, "away"),
    },
    home: {
      batting: battingLines(boxscore, "home"),
      pitching: pitchingLines(boxscore, "home"),
    },
  };
}

function slateGameSummary(game) {
  return {
    gamePk: game.gamePk,
    status: game.status?.detailedState || game.status?.abstractGameState || "Scheduled",
    venue: game.venue?.name || "",
    startTime: game.gameDate,
    away: {
      name: game.teams.away.team.name,
      abbreviation: game.teams.away.team.abbreviation || game.teams.away.team.teamName || game.teams.away.team.name,
      probablePitcher: game.teams.away.probablePitcher?.fullName || null,
    },
    home: {
      name: game.teams.home.team.name,
      abbreviation: game.teams.home.team.abbreviation || game.teams.home.team.teamName || game.teams.home.team.name,
      probablePitcher: game.teams.home.probablePitcher?.fullName || null,
    },
  };
}

async function fetchSlate(date) {
  const schedule = await getJson(`${API_BASE}/schedule?sportId=1&date=${date}&hydrate=probablePitcher`);
  const games = schedule.dates?.flatMap((day) => day.games || []) || [];
  return games.map(slateGameSummary);
}

function standingRow(record) {
  return {
    team: record.team?.name || "Team",
    wins: record.wins ?? "",
    losses: record.losses ?? "",
    pct: record.winningPercentage || "",
    gamesBack: record.gamesBack || "-",
    wildCardGamesBack: record.wildCardGamesBack || "-",
    lastTen: record.records?.splitRecords?.find((split) => split.type === "lastTen")?.summary || "",
    streak: record.streak?.streakCode || "",
  };
}

function standingTable(record, fallbackName) {
  const leagueName = LEAGUES[record.league?.id] || record.league?.name || "";
  const divisionName = DIVISIONS[record.division?.id] || record.division?.name || "";
  return {
    leagueId: record.league?.id || null,
    leagueName,
    divisionId: record.division?.id || null,
    divisionName,
    name: divisionName ? `${leagueName} ${divisionName}` : `${leagueName} ${fallbackName}`,
    type: record.standingsType || fallbackName,
    rows: (record.teamRecords || []).map(standingRow),
  };
}

async function fetchStandings(date) {
  const season = date.slice(0, 4);
  const regular = await getJson(
    `${API_BASE}/standings?leagueId=103,104&season=${season}&date=${date}&standingsTypes=regularSeason`,
  );
  const wildCard = await getJson(
    `${API_BASE}/standings?leagueId=103,104&season=${season}&date=${date}&standingsTypes=wildCard`,
  );

  return {
    divisions: (regular.records || []).map((record) => standingTable(record, "Division")),
    wildCards: (wildCard.records || []).map((record) => standingTable(record, "Wild Card")),
  };
}

async function fetchLeaderCategory(category, statGroup, season, limit = 5, playerPool = "All") {
  const params = new URLSearchParams({
    leaderCategories: category,
    statGroup,
    season,
    sportId: "1",
    leaderGameTypes: "R",
    playerPool,
    limit: String(limit),
  });
  const data = await getJson(`${API_BASE}/stats/leaders?${params.toString()}`);
  const leaders = data.leagueLeaders?.[0]?.leaders || [];

  return leaders.map((leader) => ({
    rank: leader.rank,
    value: leader.value,
    player: leader.person?.fullName || "Player",
    team: leader.team?.abbreviation || leader.team?.name || "",
  }));
}

async function fetchLeaders(date) {
  const season = date.slice(0, 4);
  const [average, homeRuns, rbi, ops, era, whip, strikeOuts, saves] = await Promise.all([
    fetchLeaderCategory("battingAverage", "hitting", season, 5, "Qualified"),
    fetchLeaderCategory("homeRuns", "hitting", season),
    fetchLeaderCategory("runsBattedIn", "hitting", season),
    fetchLeaderCategory("onBasePlusSlugging", "hitting", season, 5, "Qualified"),
    fetchLeaderCategory("earnedRunAverage", "pitching", season, 5, "Qualified"),
    fetchLeaderCategory("walksAndHitsPerInningPitched", "pitching", season, 5, "Qualified"),
    fetchLeaderCategory("strikeouts", "pitching", season),
    fetchLeaderCategory("saves", "pitching", season),
  ]);

  return {
    hitting: { average, homeRuns, rbi, ops },
    pitching: { era, whip, strikeOuts, saves },
    notes: {
      hitting: "Rate stats use qualified batters. Counting stats include all players.",
      pitching: "Rate stats use qualified pitchers. Counting stats include all players.",
    },
  };
}

async function fetchPlayerStats(statGroup, season, playerPool) {
  const params = new URLSearchParams({
    stats: "season",
    group: statGroup,
    season,
    sportIds: "1",
    playerPool,
    limit: "1000",
  });
  const data = await getJson(`${API_BASE}/stats?${params.toString()}`);
  return data.stats?.[0]?.splits || [];
}

function hittingRow(split) {
  const stat = split.stat || {};
  const teamName = split.team?.abbreviation || split.team?.name || "";
  return {
    player: split.player?.fullName || split.person?.fullName || "Player",
    team: teamName,
    leagueId: split.team?.league?.id || TEAM_LEAGUES[teamName] || null,
    gamesPlayed: Number(stat.gamesPlayed || 0),
    atBats: Number(stat.atBats || 0),
    plateAppearances: Number(stat.plateAppearances || 0),
    avg: stat.avg || ".000",
    homeRuns: Number(stat.homeRuns || 0),
    rbi: Number(stat.rbi || 0),
    ops: stat.ops || ".000",
  };
}

function pitchingRow(split) {
  const stat = split.stat || {};
  const teamName = split.team?.abbreviation || split.team?.name || "";
  return {
    player: split.player?.fullName || split.person?.fullName || "Pitcher",
    team: teamName,
    leagueId: split.team?.league?.id || TEAM_LEAGUES[teamName] || null,
    gamesPitched: Number(stat.gamesPitched || stat.gamesPlayed || 0),
    gamesStarted: Number(stat.gamesStarted || 0),
    inningsPitched: stat.inningsPitched || "0.0",
    era: stat.era || "0.00",
    whip: stat.whip || "0.00",
    strikeOuts: Number(stat.strikeOuts || 0),
    holds: Number(stat.holds || 0),
    saves: Number(stat.saves || 0),
  };
}

async function fetchLeaderTables(date) {
  const season = date.slice(0, 4);
  const [qualifiedHitting, allHitting, qualifiedPitching, allPitching] = await Promise.all([
    fetchPlayerStats("hitting", season, "Qualified"),
    fetchPlayerStats("hitting", season, "All"),
    fetchPlayerStats("pitching", season, "Qualified"),
    fetchPlayerStats("pitching", season, "All"),
  ]);
  const [rookieQualifiedHitting, rookieAllHitting, rookieQualifiedPitching, rookieAllPitching] = await Promise.all([
    fetchPlayerStats("hitting", season, "Qualified_rookies"),
    fetchPlayerStats("hitting", season, "Rookies"),
    fetchPlayerStats("pitching", season, "Qualified_rookies"),
    fetchPlayerStats("pitching", season, "Rookies"),
  ]);

  return {
    hitting: {
      qualified: qualifiedHitting.map(hittingRow),
      all: allHitting.map(hittingRow),
      rookieQualified: rookieQualifiedHitting.map(hittingRow),
      rookies: rookieAllHitting.map(hittingRow),
    },
    pitching: {
      qualified: qualifiedPitching.map(pitchingRow),
      all: allPitching.map(pitchingRow),
      rookieQualified: rookieQualifiedPitching.map(pitchingRow),
      rookies: rookieAllPitching.map(pitchingRow),
    },
    notes: {
      hitting: "AVG and OPS use qualified batters. HR and RBI include all players.",
      pitching: "ERA and WHIP use qualified pitchers. K and Saves include all players.",
    },
  };
}

async function gameSummary(game) {
  const gamePk = game.gamePk;
  const feed = await getJson(`${API_BASE}.1/game/${gamePk}/feed/live`);
  const boxscore = feed.liveData?.boxscore;
  const linescore = feed.liveData?.linescore || {};
  const awayInfo = game.teams.away.team;
  const homeInfo = game.teams.home.team;

  return {
    gamePk,
    status: game.status?.detailedState || game.status?.abstractGameState || "Unknown",
    venue: game.venue?.name || "",
    startTime: game.gameDate,
    away: teamSummary(awayInfo, game.teams.away.score ?? 0, linescore.teams?.away),
    home: teamSummary(homeInfo, game.teams.home.score ?? 0, linescore.teams?.home),
    innings: inningsFromLinescore(linescore),
    scoringPlays: scoringPlaysFromLiveFeed(feed),
    playLog: playLogFromLiveFeed(feed),
    boxScore: boxScoreLines(boxscore),
    probablePitchers: {
      away: game.teams.away.probablePitcher?.fullName || null,
      home: game.teams.home.probablePitcher?.fullName || null,
    },
    decisions: {
      winner: boxscore?.info?.find((row) => row.label === "WP")?.value || null,
      loser: boxscore?.info?.find((row) => row.label === "LP")?.value || null,
      save: boxscore?.info?.find((row) => row.label === "SV")?.value || null,
    },
  };
}

function pickGameOfDay(games) {
  if (!games.length) return null;
  return [...games].sort((a, b) => {
    const aMargin = Math.abs(a.away.score - a.home.score);
    const bMargin = Math.abs(b.away.score - b.home.score);
    const aLate = a.innings.length > 9 ? 1 : 0;
    const bLate = b.innings.length > 9 ? 1 : 0;
    return bLate - aLate || aMargin - bMargin;
  })[0].gamePk;
}

async function main() {
  const date = process.argv[2] || yesterdayEastern();
  const slateDate = process.argv[3] || todayEastern();
  const schedule = await getJson(`${API_BASE}/schedule?sportId=1&date=${date}&hydrate=probablePitcher`);
  const rawGames = schedule.dates?.flatMap((day) => day.games || []) || [];
  const completedGames = rawGames.filter((game) => game.status?.abstractGameState === "Final");
  const games = [];

  for (const game of completedGames) {
    games.push(await gameSummary(game));
  }

  const edition = {
    source: "mlb-stats-api",
    generatedAt: new Date().toISOString(),
    date,
    slateDate,
    gameOfDay: pickGameOfDay(games),
    games,
    todaySlate: await fetchSlate(slateDate),
    standings: await fetchStandings(date),
    leaders: await fetchLeaderTables(date),
  };

  await fs.mkdir(path.dirname(OUTFILE), { recursive: true });
  await fs.writeFile(OUTFILE, `${JSON.stringify(edition, null, 2)}\n`);
  await fs.writeFile(SCRIPT_OUTFILE, `window.ledgerEdition = ${JSON.stringify(edition, null, 2)};\n`);
  console.log(`Wrote ${games.length} completed games to ${OUTFILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
