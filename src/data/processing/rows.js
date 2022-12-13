export function createRows(freeGames) {
    return Object.entries(freeGames).map(
        ([id, { name, metaScore, userScore, startDates }]) => {
            // console.warn("35", id, fields);

            const multipliedScore = metaScore * userScore;

            const nameLink = {
                name,
                href: `http://www.metacritic.com/game/pc/${id}`
            }

            // console.warn('60', name)

            const date = startDates.map(startDate =>
                new Date(startDate).toISOString().split('T')[0].replaceAll('-', '/')
            ).join(", ")

            return {
                id: name,
                name: nameLink,
                metaScore: metaScore === "N/A" ? "" : metaScore,
                userScore: userScore === "N/A" ? "" : userScore,
                multipliedScore: isNaN(multipliedScore)
                    ? ""
                    : Math.round(multipliedScore),
                date,
            };
        }
    );
}