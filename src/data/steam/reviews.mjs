import fetch from "node-fetch";
import { sleep, writeGameList, cleanGameName } from "../../utils/index.mjs";

import importedGamesList from "../freeGamesList.json" assert { type: "json" };
import steamGameAppIDs from "../steamGameAppIDs.json" assert { type: "json" };


export function addAllSteamAppIDs(gameList = importedGamesList) {

    const resultList = { ...gameList }

    for (const gameData of Object.values(resultList)) {
        addSteamAppID(gameData)
    }

    writeGameList(resultList)
}


export function addSteamAppID(gameData) {

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
    return gameData

}

async function getSteamReviews(gameList = importedGamesList) {

    const resultList = { ...gameList }
    const gameReviewRequests = [];

    for (const gameData of Object.values(resultList)) {

        const { name, steam } = gameData

        if (Object.keys(steam).length && !steam.reviews) {
            console.warn("Fetching:", name);

            gameReviewRequests.push(getSteamReviewScore(steam));

            await sleep(Math.floor(Math.random() * 300) + 60);

            // console.warn('42', steam)

        }

    }
    await Promise.all(gameReviewRequests);
    writeGameList(resultList)
    // https://store.steampowered.com/appreviews/72850?json=1&language=all&purchase_type=all
}

async function getSteamReviewScore(steam) {
    if (steam && 'appid' in steam && !('steamReviewScore' in steam)) {

        let gameReviews = await fetch(`https://store.steampowered.com/appreviews/${steam.appid}?json=1&language=all`)
            .then(response => response.json())
            .catch(error => console.log("request failed", error))

        if (gameReviews.query_summary.total_reviews == 0) {
            gameReviews = await fetch(`https://store.steampowered.com/appreviews/${steam.appid}?json=1&language=all&purchase_type=all`)
                .then(response => response.json())
                .catch(error => console.log("request failed", error))
        }

        const {
            num_reviews,
            review_score,
            review_score_desc,
            total_positive,
            total_negative,
            total_reviews
        } = gameReviews.query_summary
        // console.log('Added: ', gameReviews)

        const steamReviewsData = {
            total_positive,
            total_negative,
            total_reviews,
            steamReviewScore: total_positive / total_reviews * 10
        }
        steam.reviews = steamReviewsData

        // Object.assign(steam, steamReviewsData);

        console.log('Added: ', steam.name)
    }
    return steam
}


// download(JSON.stringify(gamekey), 'gamekey', 'json')

// console.warn('25', gamekey)

getSteamReviews()