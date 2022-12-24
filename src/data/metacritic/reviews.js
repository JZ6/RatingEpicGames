import fetch from "node-fetch";
import * as cheerio from "cheerio";

async function getGameReview(gameName) {
    const url = `http://www.metacritic.com/game/pc/${gameName}`;
    const html = await fetch(url)
        .then((response) => response.text())
        //   .then((x) => console.warn("15", x))
        .catch((error) => console.log("request failed", error));

    const $ = cheerio.load(html);

    let metaScore = "N/A";
    const metaScoreSelector = $("span[itemprop=ratingValue]");

    if (metaScoreSelector[0]) {
        metaScore = metaScoreSelector[0].children[0].data;
    }

    let userScore = "N/A";
    const userScoreSelector = $("div .metascore_w.user.game");

    if (userScoreSelector[0]) {
        userScore = userScoreSelector[0].children[0].data;
    }

    if (userScore == "tbd") {
        userScore = "N/A";
    }

    //   console.warn("17", metaScore);
    //   console.warn("22", userScore);
    return { metaScore, userScore };
}

