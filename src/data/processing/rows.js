function round(num, place = 10) {
    return Math.round(num * place) / place
}

export function createRows(freeGames) {
    // console.warn('2', freeGames)
    return Object.entries(freeGames).map(([id, gameData]) => {
        const {
            name,
            cleanName,
            metacritic: {
                metaScore,
                userScore,
                urlName
            },
            epic: {
                storeURLName,
                startDates
            },
            steam
        } = gameData

        const nameColumnValue = createNameColumn(name, storeURLName)
        const dateColumnValue = createDateColumn(startDates)
        const userScoreColumnValue = createUserScoreColumn(gameData.metacritic)


        const steamColumnValue = createSteamColumn(steam)



        // if (steam.reviews && steam.reviews.steamReviewScore) {
        //     const {
        //         total_positive,
        //         total_negative,
        //         total_reviews,
        //         steamReviewScore
        //     } = steam.reviews

        //     steamData.score = steamReviewScore.toFixed(1)
        //     steamData.total_positive = total_positive
        //     steamData.total_reviews = total_reviews
        // }


        let scores = [];
        if (metaScore && metaScore !== "N/A") {
            const weightedmetaScore = parseFloat(metaScore / 10)
            scores.push(weightedmetaScore)
            // scores.push(weightedmetaScore)
            // scores.push(weightedmetaScore)

            if (userScore && userScore !== "N/A") {
                scores.push(parseFloat(userScore))
                // scores.push(parseFloat(userScore))

                if (steamColumnValue && steamColumnValue.score !== "") {
                    scores.push(parseFloat(steamColumnValue.score))
                }
            }
        }

        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        // isNaN(multipliedScore)
        // ? ""
        // : Math.round(multipliedScore),

        let displayMetaScore = metaScore === "N/A" ? "" : (metaScore / 10).toFixed(1)

        let displayUserScore = userScore === "N/A" ? "" : round(userScore).toFixed(1)


        return {
            id: name,
            name: nameColumnValue,
            metaScore: displayMetaScore,
            userScore: userScoreColumnValue,
            averageScore: isNaN(averageScore)
                ? ""
                : averageScore.toFixed(1),
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

function createDateColumn(startDates) {
    return startDates.map(startDate => new Date(startDate))
        .map(date => dateToYMDFormat(date))
        .join(", ")
}

function dateToYMDFormat(date) {
    return date.toISOString().split('T')[0].replaceAll('-', '/')
}