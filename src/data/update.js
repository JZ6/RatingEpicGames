import fetch from "node-fetch";
import * as cheerio from "cheerio";

import { sleep, writeGameList, cleanGameName } from "../utils/index.mjs";
import {
  getGameReview
} from './metacritic/reviews';


import importedGamesList from "./freeGamesList.json" assert { type: "json" };

async function update(refreshAll = false) {

  const gameList = { ...importedGamesList };
  const gameReviewRequests = [];

  //   .slice( 0,180)
  for (const [gameName, gameData] of Object.entries(importedGamesList)) {

    if (refreshAll === true || !gameData.metaScore || !gameData.userScore) {
      console.warn("Fetching:", gameName);
      gameReviewRequests.push(updateGameFields(gameList, gameName));
      await sleep(Math.floor(Math.random() * 300) + 60);
    }

    // if (refreshAll === true || !gameData.metaScore || !gameData.userScore) {
    //   console.warn("Fetching:", gameName);
    //   gameReviewRequests.push(updateGameFields(gameList, gameName));
    //   await sleep(Math.floor(Math.random() * 300) + 60);
    // }
  }

  await Promise.all(gameReviewRequests);
}

async function updateGameFields(gameList, gameName) {
  const scores = await getGameReview(gameName);
  gameList[gameName] = { ...gameList[gameName], ...scores };
  console.warn(gameName, scores);
  writeGameList(gameList);
}

function addGame(name, dateString = new Date(), period = 7) {

  const startDate = new Date(dateString)
  const endDate = new Date(startDate.getTime());
  endDate.setDate(endDate.getDate() + period);

  const startDateString = startDate.toDateString()
  const endDateString = endDate.toDateString()

  const gameList = { ...importedGamesList };
  const cleanName = cleanGameName(name)

  if (!(cleanName in gameList)) {
    gameList[cleanName] = {
      name,
      cleanName,
      "startDates": [],
      "endDates": []
    }
  }
  if (!gameList[cleanName].startDates.includes(startDateString)) {

    gameList[cleanName].startDates.unshift(startDateString)
    gameList[cleanName].endDates.unshift(endDateString)

    writeGameList(gameList);
  }
}

// addGame('Saints Row IV', 'Thu Dec 08 2022')
addGame("Encased", new Date(), 1)


update();