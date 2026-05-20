const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "data", "yesterday.json");
const SITE_URL = "https://baseballmorningledger.com";

function formatDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatShortDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
  }).format(date);
}

function displayTeamName(name) {
  const names = {
    "Arizona D-backs": "Arizona Diamondbacks",
    "D-backs": "Diamondbacks",
    Athletics: "Oakland Athletics",
  };
  return names[name] || name;
}

function scoreLine(game) {
  const away = game.away;
  const home = game.home;
  const winner = away.score > home.score ? away : home;
  const loser = away.score > home.score ? home : away;
  return `${displayTeamName(winner.name)} ${winner.score}, ${displayTeamName(loser.name)} ${loser.score}`;
}

function buildEmail(edition) {
  const dateLine = formatDate(edition.date);
  const subject = `The Morning Ledger - Games of ${formatShortDate(edition.date)}`;
  const scores = edition.games?.length
    ? edition.games.map((game) => `- ${scoreLine(game)}`).join("\n")
    : "No final scores were listed for yesterday.";

  const body = `Good morning.

Yesterday's final scores are in.

**Games of ${dateLine}**

${scores}

Read the full morning edition:
[${SITE_URL}](${SITE_URL})

The Baseball Morning Ledger`;

  return { subject, body };
}

async function createDraft() {
  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    throw new Error("BUTTONDOWN_API_KEY is not set.");
  }

  const edition = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const email = buildEmail(edition);

  const response = await fetch("https://api.buttondown.com/v1/emails", {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
      "X-API-Version": "2026-04-01",
    },
    body: JSON.stringify({
      subject: email.subject,
      body: email.body,
      status: "draft",
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Buttondown draft failed (${response.status}): ${text}`);
  }

  console.log(`Created Buttondown draft: ${email.subject}`);
}

createDraft().catch((error) => {
  console.error(error);
  process.exit(1);
});
