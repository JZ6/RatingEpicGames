function round(num, place = 10) {
    return Math.round(num * place) / place
}

export function createRows(freeGames) {
    // console.warn('2', freeGames)
    return Object.entries(freeGames).map(
        ([id, { name, metaScore, userScore, startDates, steam }]) => {

            const nameLink = {
                name,
                href: `http://www.metacritic.com/game/pc/${id}`
            }

            const date = startDates.map(startDate =>
                new Date(startDate).toISOString().split('T')[0].replaceAll('-', '/')
            ).join(", ")

            const steamScore = {
                score: '',
                href: `https://store.steampowered.com/app/${steam.appid}`
            }

            if (steam.reviews && steam.reviews.steamReviewScore) {
                steamScore.score = steam.reviews.steamReviewScore.toFixed(1)
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

                    if (steamScore && steamScore.score !== "") {
                        scores.push(parseFloat(steamScore.score))
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
                steamScore,
                date,
            };
        }
    );
}

// function dateToYMDFormat(startDates) {
//     return startDates.map(startDate =>
//         new Date(startDate).toISOString().split('T')[0].replaceAll('-', '/')
//     ).join(", ")
// }