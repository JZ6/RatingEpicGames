function round(num, place = 10) {
    return Math.round(num * place) / place
}

export function createRows(freeGames) {
    // console.warn('2', freeGames)
    return Object.entries(freeGames).map(([id, gameData]) => {
        const {
            name,
            cleanName,
            metacritic,
            epic: {
                storeURLName,
                startDates
            },
            steam
        } = gameData

        const nameColumnValue = createNameColumn(name, storeURLName)
        const dateColumnValue = createDateColumn(startDates)

        const metaScoreColumnValue = createMetaScoreColumn(metacritic)
        const userScoreColumnValue = createUserScoreColumn(metacritic)

        const steamColumnValue = createSteamColumn(steam)

        const averageScoreColumnValue = createAverageScoreColumn(metacritic, steam)

        return {
            id: name,
            name: nameColumnValue,
            metaScore: metaScoreColumnValue,
            userScore: userScoreColumnValue,
            averageScore: averageScoreColumnValue,
            steamData: steamColumnValue,
            date: dateColumnValue,
        };
    }
    );
}

function createNameColumn(name, storeURLName) {
    return {
        name,
        href: `https://store.epicgames.com/p/${storeURLName}`
    }
}

function createMetaScoreColumn(metacritic) {
    const {
        metaScore,
        urlName
    } = metacritic
    return {
        metaScoreValue: metaScore === "N/A" ? "" : (metaScore / 10).toFixed(1),
        href: `http://www.metacritic.com/game/pc/${urlName}`
    }
}

function createUserScoreColumn(metacritic) {
    const {
        userScore,
        urlName
    } = metacritic

    return {
        userScoreValue: userScore === "N/A" ? "" : round(userScore).toFixed(1),
        href: `http://www.metacritic.com/game/pc/${urlName}`
    }
}


function createSteamColumn(steam) {

    let steamColumnData = {}

    if (steam.reviews && steam.reviews.steamReviewScore) {
        const {
            appid,
            reviews
        } = steam

        steamColumnData = {
            ...steam.reviews,
            href: `https://store.steampowered.com/app/${appid}`
        }

        steamColumnData.score = reviews.steamReviewScore.toFixed(1)

    }

    return steamColumnData

}

function createAverageScoreColumn(metacritic, steam) {

    const {
        metaScore,
        userScore
    } = metacritic



    let scores = [];
    if (metaScore && metaScore !== "N/A") {
        const weightedmetaScore = parseFloat(metaScore / 10)
        scores.push(weightedmetaScore)
        // scores.push(weightedmetaScore)
        // scores.push(weightedmetaScore)
    }

    if (userScore && userScore !== "N/A") {
        scores.push(parseFloat(userScore))
        // scores.push(parseFloat(userScore))
    }

    if (scores.length) {
        const {
            reviews
        } = steam

        if (reviews && reviews.hasOwnProperty('steamReviewScore')) {
            const { steamReviewScore } = reviews
            scores.push(parseFloat(steamReviewScore))
        }
    }

    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    if (isNaN(averageScore)) {
        return ''
    } else {
        return averageScore.toFixed(1)
    }
}

function createDateColumn(startDates) {
    return startDates.map(startDate => new Date(startDate))
        .map(date => dateToYMDFormat(date))
        .join(", ")
}

function dateToYMDFormat(date) {
    return date.toISOString().split('T')[0].replaceAll('-', '/')
}