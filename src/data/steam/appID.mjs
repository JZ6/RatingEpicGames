import steamGameAppIDs from "../steamGameAppIDs.jsonn"

// console.warn('4', steamGamesList.applist.apps)


// const gamekey = {}
// for (const game of steamGamesList.applist.apps) {
//     gamekey[game.name] = game
// if (game.name == 'STAR WARS™: Squadrons') {
//   console.warn('4', game)
// }
// }

function addSteamAppID(gameList) {

    // console.warn('41', gameKey['ABZÛ'])

    // const gameList = { ...freeGames };
    // addSteamAppID(gameList)

    // https://store.steampowered.com/appreviews/72850?json=1&language=all&purchase_type=all


    // console.warn(JSON.stringify(gameList))


    const resultList = { ...gameList };

    for (const gameData of Object.values(resultList)) {

        if (!gameData.steam || !gameData.steam.appid) {
            console.warn('24', gameData.name)
            gameData['steam'] = {
                ...gameKey[gameData.name]
            }
        } else {

        }
    }

    return resultList

}

function getSteamReviews() {

}


// download(JSON.stringify(gamekey), 'gamekey', 'json')

// console.warn('25', gamekey)

function download(data, filename, type) {
    var file = new Blob([data], { type: type });
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
            url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}