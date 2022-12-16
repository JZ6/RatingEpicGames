// import { sleep, writeGameList, cleanGameName } from "../../utils/index.js";

import importedGamesList from "../freeGamesList.json" assert { type: "json" };
import steamGameAppIDs from "../steamGameAppIDs.json" assert { type: "json" };

const resultList = { ...importedGamesList };

for (const gameData of Object.values(resultList)) {

    const { name } = gameData

    if (!gameData.steam && name in steamGameAppIDs) {
        const steamGameData = steamGameAppIDs[name]
        console.warn('24', steamGameData)
        gameData['steam'] = {
            ...steamGameData
        }
    }
}

console.warn('4', resultList)


// const gamekey = {}
// for (const game of steamGamesList.applist.apps) {
//     gamekey[game.name] = game
// if (game.name == 'STAR WARS™: Squadrons') {
//   console.warn('4', game)
// }
// }

function addSteamAppID(gameList) {

    // console.warn('41', gameKey['ABZÛ'])

    // const gameList = { ...freeGames };
    // addSteamAppID(gameList)

    // https://store.steampowered.com/appreviews/72850?json=1&language=all&purchase_type=all


    // console.warn(JSON.stringify(gameList))


    const resultList = { ...gameList };

    for (const gameData of Object.values(resultList)) {

        if (!gameData.steam || !gameData.steam.appid) {
            console.warn('24', gameData.name)
            gameData['steam'] = {
                ...gameKey[gameData.name]
            }
        } else {

        }
    }

    return resultList

}

function getSteamReviews() {

}


// download(JSON.stringify(gamekey), 'gamekey', 'json')

// console.warn('25', gamekey)

