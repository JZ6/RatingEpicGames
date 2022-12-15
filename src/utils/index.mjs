import fs from "fs";

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function cleanGameName(gameName) {
  return gameName.replace("'", '').replace(/\W+/g, " ").replace(/\s+/g, "-").toLowerCase();
}

export function writeGameList(gameList, file = "./src/data/freeGamesList.json") {
  fs.writeFile(file, JSON.stringify(gameList, null, 4), (err) => {
    if (err) {
      console.error(err);
    }
    // file written successfully
  });
}