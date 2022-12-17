import fetch from "node-fetch";
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
}

async function getSteamReviews(gameList = importedGamesList) {

    const resultList = { ...gameList }
    for (const gameData of Object.values(resultList).slice(1, 4)) {

        const { steam } = gameData
        getSteamReviewScore(steam)

        console.warn('42', steam)


    }

    // writeGameList(resultList)
    // https://store.steampowered.com/appreviews/72850?json=1&language=all&purchase_type=all
}

async function getSteamReviewScore(steam) {
    if (steam && 'appid' in steam && !('steamReviewScore' in steam)) {

        const gameReviews = await fetch(`https://store.steampowered.com/appreviews/${steam.appid}?json=1&language=all`)
            .then(response => response.json())
            .catch(error => console.log("request failed", error))

        const {
            num_reviews,
            review_score,
            review_score_desc,
            total_positive,
            total_negative,
            total_reviews
        } = gameReviews.query_summary

        steam.steamReviewScore = total_positive / total_reviews * 10;
        console.log('Added: ', steam)
    }
}


// download(JSON.stringify(gamekey), 'gamekey', 'json')

// console.warn('25', gamekey)

getSteamReviews()