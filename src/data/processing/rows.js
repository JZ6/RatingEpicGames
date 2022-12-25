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

        const nameLink = createNameColumn(name, cleanName)
        const date = createDateColumn(startDates)

        const steamData = {
            total_positive: '',
            total_reviews: '',
            score: '',
            href: `https://store.steampowered.com/app/${steam.appid}`
        }

        if (steam.reviews && steam.reviews.steamReviewScore) {
            const {
                total_positive,
                total_negative,
                total_reviews,
                steamReviewScore
            } = steam.reviews

            steamData.score = steamReviewScore.toFixed(1)
            steamData.total_positive = total_positive
            steamData.total_reviews = total_reviews
        }


        let scores = [];
        if (metaScore && metaScore !== "N/A") {
            const weightedmetaScore = parseFloat(metaScore / 10)
            scores.push(weightedmetaScore)
            // scores.push(weightedmetaScore)
            // scores.push(weightedmetaScore)

            if (userScore && userScore !== "N/A") {
                scores.push(parseFloat(userScore))
                // scores.push(parseFloat(userScore))

                if (steamData && steamData.score !== "") {
                    scores.push(parseFloat(steamData.score))
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
            name: nameLink,
            metaScore: displayMetaScore,
            userScore: displayUserScore,
            averageScore: isNaN(averageScore)
                ? ""
                : averageScore.toFixed(1),
            steamData,
            date,
        };
    }
    );
}

function createNameColumn(name, cleanName) {
    return {
        name,
        href: `https://store.epicgames.com/p/${cleanName}`
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