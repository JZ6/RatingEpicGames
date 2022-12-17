import { sleep, writeGameList, cleanGameName } from "../../utils/index.js";

import importedGamesList from "../freeGamesList.json" assert { type: "json" };
import steamGameAppIDs from "../steamGameAppIDs.json" assert { type: "json" };


function addSteamAppIDs(gameList = importedGamesList) {

    const resultList = { ...gameList }

    for (const gameData of Object.values(resultList)) {

        const { name } = gameData

        if (!gameData.steam && name in steamGameAppIDs) {

            const steamGameData = steamGameAppIDs[name]

            gameData['steam'] = {
                ...steamGameData
            }
            console.log('Added: ', steamGameData)
        }

        if (!gameData.steam) {
            console.warn(`No Steam Info For: ${name}`)
        }
    }

    writeGameList(resultList)


    // https://store.steampowered.com/appreviews/72850?json=1&language=all&purchase_type=all



}

function getSteamReviews() {

}


// download(JSON.stringify(gamekey), 'gamekey', 'json')

// console.warn('25', gamekey)

addSteamAppIDs()