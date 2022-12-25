import fetch from "node-fetch";
import * as cheerio from "cheerio";

async function scrapeMetacriticScore(url) {

    const html = await fetch(url)
        .then((response) => response.text())
        //   .then((x) => console.warn("15", x))
        .catch((error) => console.log("request failed", error));

    const $ = cheerio.load(html);

    let metaScore = "";
    const metaScoreSelector = $("span[itemprop=ratingValue]");

    if (metaScoreSelector[0]) {
        metaScore = metaScoreSelector[0].children[0].data;
    }

    let userScore = "";
    const userScoreSelector = $("div .metascore_w.user.game");

    if (userScoreSelector[0]) {
        userScore = userScoreSelector[0].children[0].data;
    }

    if (userScore == "tbd") {
        userScore = "";
    }

    return { metaScore, userScore };
}

export async function addMetacriticScore(gameDataObj, overWrite = false) {

    const { name, cleanName } = gameDataObj

    if (!gameDataObj.hasOwnProperty('metacritic')) {
        gameDataObj['metacritic'] = {
            urlName: cleanName
        }
    }

    const { metacritic } = gameDataObj

    if (!overWrite && (metacritic.hasOwnProperty('metaScore') || metacritic.hasOwnProperty('userScore'))) {
        return false
    }


    const { urlName } = metacritic
    const url = `http://www.metacritic.com/game/pc/${urlName}`

    const { metaScore, userScore } = await scrapeMetacriticScore(url)

    let addedFlag = false

    if (metaScore) {
        metacritic.metaScore = metaScore
        addedFlag = true
    } else {
        console.warn('No meta score for:', urlName)
    }

    if (userScore) {
        metacritic.userScore = userScore
        addedFlag = true
    } else {
        console.warn('No user score for:', urlName)
    }

    if (addedFlag) {
        console.log('Added Metacritic: ', metacritic)
    }

    return gameDataObj.metacritic
}