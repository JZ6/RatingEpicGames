import fetch from "node-fetch";

import steamGameAppIDs from "../../data/steamGameAppIDs.json" assert { type: "json" }

export function addSteamAppID(gameDataObj, overWrite = false) {

    if (!gameDataObj.hasOwnProperty('steam')) {
        gameDataObj['steam'] = {}
    }

    const { name, steam } = gameDataObj

    if (steam.hasOwnProperty('name') && steam.hasOwnProperty('appid')) {
        return true
    }

    if (overWrite || !Object.keys(steam).length) {
        if (name in steamGameAppIDs) {
            const steamGameData = steamGameAppIDs[name]
            gameDataObj.steam = {
                ...steamGameData
            }
            console.log('Added Steam App ID: ', steamGameData)
            return true
        } else {
            console.warn(`No Steam Info For: ${name}`)
            return false
        }
    }

}

async function fetchSteamAppReviews(appid) {
    let gameReviews = await fetch(`https://store.steampowered.com/appreviews/${appid}?json=1&language=all`)
        .then(response => response.json())
        .catch(error => console.log("request failed", error))

    if (gameReviews.query_summary.total_reviews == 0) {
        gameReviews = await fetch(`https://store.steampowered.com/appreviews/${appid}?json=1&language=all&purchase_type=all`)
            .then(response => response.json())
            .catch(error => console.log("request failed", error))
    }

    return gameReviews
}

export async function addSteamReviewScore(gameDataObj, overWrite = false) {

    const { steam } = gameDataObj

    if (!steam.hasOwnProperty('appid')) {
        return false
    }

    if (!overWrite && steam.hasOwnProperty('steamReviewScore')) {
        return false
    }

    const { appid, name } = steam
    const steamAppReviewsResult = await fetchSteamAppReviews(appid)

    // console.warn('93', steamAppReviewsResult.query_summary)
    const {
        // num_reviews,
        // review_score,
        review_score_desc,
        total_positive,
        total_negative,
        total_reviews
    } = steamAppReviewsResult.query_summary

    const steamReviewScore = total_positive / total_reviews * 10

    steam.reviews = {
        total_positive,
        total_negative,
        total_reviews,
        steamReviewScore
    }
    console.log('Added Steam Reviews For: ', name, steamReviewScore)

    return steam.reviews

}
