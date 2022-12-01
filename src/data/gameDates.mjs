import fs from "fs";
import { cleanGameName, writeGameList } from "../utils/index.mjs";

import importedGamesList from "../freeGamesList.json" assert { type: "json" };

function readDateComma() {
  const data = fs.readFileSync("./src/comma.csv", {
    encoding: "utf8",
    flag: "r",
  });

  const gameList = data.split(/\r?\n/).map((game) => {
    const y = game.split(',"');
    // console.warn("96", y);

    const startDate = new Date(y[1].replace(/"/g, ""));
    const endDate = new Date(y[2].replace(/"/g, ""));

    return {
      name: y[0],
      cleanName: cleanGameName(y[0]),
      startDates:  [startDate.toDateString()],
      endDates: [endDate.toDateString()],
    };
  });

  const gameDict = gameList.reduce((accumulator, value) => {
    return { ...accumulator, [value.cleanName]: value };
  }, {});

  return gameDict;

 
}

function readDataSlash() {
  const data = fs.readFileSync("./src/slash.csv", {
    encoding: "utf8",
    flag: "r",
  });

  const gameList = data.split(/\r?\n/).map((game) => {
    const [gameName, start, end] = game.split(",");

    const startDate = new Date(start.replace(/"/g, ""));
    const endDate = new Date(end.replace(/"/g, ""));
    
    return {
      name: gameName,
      cleanName: cleanGameName(gameName),
      startDates: [startDate.toDateString()],
      endDates: [endDate.toDateString()],
    };
  });

  const slashGameDict = gameList.reduce((accumulator, value) => {
    return { ...accumulator, [value.cleanName]: value };
  }, {});

  // console.warn("93", slashGameDict);

  return slashGameDict;
}

//   function createGameDates() {
const dateSlashDict = readDataSlash();

const dateCommaDict = readDateComma();

const finalgamedict = { ...dateCommaDict };

for (const [gameKey, gameValue] of Object.entries(dateSlashDict)) {
  if (gameKey in dateCommaDict) {
    // console.warn("82",gameKey);
    finalgamedict[gameKey].startDates = [...finalgamedict[gameKey].startDates, ...gameValue.startDates];

  } else {
    finalgamedict[gameKey] = gameValue;
  }
}


for (const [key, value] of Object.entries(importedGamesList)) {
  if (key in finalgamedict) {
    // console.warn("124", finalgamedict[key]);
  } else {
    // console.log(`${key}: ${value}`);
    if ( !['overcooked!-2','stick-it-to-the-man!','oddworld-abes-oddysee---new-n-tasty','cook-serve-delicious!-3!','unrailed!','geneforge-1---mutagen'].includes(key))
    console.warn( key);
  }
}


writeGameList(finalgamedict, "./src/gamedates.json");

// console.warn("163", result);


// console.warn("165", finalgamedict);

// console.warn("165", Object.values(finalgamedict).length);

// const xs = Object.values(finalgamedict).map((g) => {
//   console.warn("168", g);
//   return g.name;
// });

// console.warn("172", xs);

// let text = xs.join("\n");

// fs.writeFileSync("./src/test.json", text, "utf8");


// writeGameList(finalgamedict, "./src/gamedates.json");
