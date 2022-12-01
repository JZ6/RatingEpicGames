import fs from "fs";

import fetch from "node-fetch";
import * as cheerio from "cheerio";

import { sleep, writeGameList } from "./utils/index.mjs";

import importedGamesList from "./freeGamesList.json" assert { type: "json" };
import gameDates from "./gamedates.json" assert { type: "json" };

async function update(refreshAll = false) {
  const gameList = { ...importedGamesList };

  const gameReviewRequests = [];

  //   .slice( 0,180)
  for (const [gameName, scores] of Object.entries(importedGamesList)) {
    if (refreshAll === true || !scores.metaScore || !scores.userScore) {
      console.warn("Fetching:", gameName);
      gameReviewRequests.push(updateGameFields(gameList, gameName));
      await sleep(Math.floor(Math.random() * 300) + 60);
    }
  }

  await Promise.all(gameReviewRequests);
}

async function updateGameFields(gameList, gameName) {
  const scores = await getGameReview(gameName);
  gameList[gameName] = { ...gameList[gameName], ...scores };
  console.warn(gameName, scores);
  writeGameList(gameList);
}

async function getGameReview(gameName) {
  const url = `http://www.metacritic.com/game/pc/${gameName}`;
  const html = await fetch(url)
    .then((response) => response.text())
    //   .then((x) => console.warn("15", x))
    .catch((error) => {
      console.log("request failed", error);
    });

  const $ = cheerio.load(html);

  let metaScore = "N/A";
  const metaScoreSelector = $("span[itemprop=ratingValue]");

  if (metaScoreSelector[0]) {
    metaScore = metaScoreSelector[0].children[0].data;
  }

  let userScore = "N/A";
  const userScoreSelector = $("div .metascore_w.user.game");

  if (userScoreSelector[0]) {
    userScore = userScoreSelector[0].children[0].data;
  }

  if (userScore == "tbd") {
    userScore = "N/A";
  }

  //   console.warn("17", metaScore);
  //   console.warn("22", userScore);
  return { metaScore, userScore };
}

update();
// console.warn("77", gameDates);

// const result = { ...gameDates };
// for (const [key, value] of Object.entries(importedGamesList)) {
//   if (key in gameDates) {
//     // console.warn("124", value, gameDates[key]);
//     result[key] = { ...gameDates[key], ...value };
//   } else {
//     // console.log(`${key}: ${value}`);
//     // console.warn("124", key);
//     result[key] = value;
//   }
// }

// console.warn("91", result);
// writeGameList(result);
