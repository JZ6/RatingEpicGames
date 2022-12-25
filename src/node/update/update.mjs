
import {
    writeGameList,
    cleanGameName,
    sleep
} from '../utils/index.mjs'

import {
    addBaseGameObj
} from './epic.mjs';

import {
    addSteamAppID,
    addSteamReviewScore
} from './steam.mjs';

import {
    addMetacriticScore
} from './metacritic.mjs';

import importedGamesList from '../../data/freeGamesList.json' assert { type: "json" }


export async function addGame(modifiedGameList = { ...importedGamesList }, name, giveAwayDate = new Date(), period = 7, write = true) {

    const gameDataObj = await addBaseGameObj(modifiedGameList, name, giveAwayDate, period, false)

    const fetchPromises = [];

    if (addSteamAppID(gameDataObj)) {
        fetchPromises.push(
            addSteamReviewScore(gameDataObj)
        )
    }

    fetchPromises.push(
        addMetacriticScore(gameDataObj)
    )

    await Promise.all(fetchPromises)

    if (write) {
        await writeGameList(modifiedGameList)
    }

    return true
}
