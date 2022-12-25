import { writeFile } from 'node:fs/promises';
import importedGamesList from '../../data/freeGamesList.json' assert { type: "json" }

export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function cleanGameName(gameName) {
    return gameName.replace("'", '').replace(/\W+/g, " ").replace(/\s+/g, "-").toLowerCase();
}

export function writeGameList(gameList, filePath = "./src/data/freeGamesList.json") {
    return writeFile(filePath, JSON.stringify(gameList, null, 4))
}

function modifyGameList(modifiedGameList = { ...importedGamesList }) {
    for (const game of Object.values(modifiedGameList)) {

        const { cleanName, steam, startDates, endDates, metacritic } = game

        game.epic = {
            storeName: cleanName,
            startDates,
            endDates
        }

        // game.metacritic = {
        //     metaScore,
        //     userScore,
        //     urlName: cleanName
        // }

        // delete game.metaScore
        // delete game.userScore

        // steam.name = steam.steamName
        // delete steam.steamName

    }

    writeGameList(modifiedGameList)
}
modifyGameList()