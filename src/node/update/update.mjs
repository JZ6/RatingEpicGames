
import {
    writeGameList,
    cleanGameName,
    sleep
} from '../utils/index.mjs'

import {
    addSteamAppID,
    addSteamReviewScore
} from './steam.mjs';

import {
    addMetacriticScore
} from './metacritic.mjs';

import importedGamesList from '../../data/freeGamesList.json' assert { type: "json" }

function initGameObj(modifiedGameList, name) {
    const gameListKey = cleanGameName(name)
    if (!(gameListKey in modifiedGameList)) {
        modifiedGameList[gameListKey] = {
            name,
            cleanName: gameListKey,
            epic: {
                startDates: [],
                endDates: [],
                storeName: gameListKey
            }
        }
    }

    return modifiedGameList[gameListKey]
}

function addDatesToGameObj(gameDataObj, giveAwayDate, period) {
    const startDate = new Date(giveAwayDate)
    const endDate = new Date(startDate.getTime())
    endDate.setDate(endDate.getDate() + period)

    const startDateString = startDate.toDateString()
    const endDateString = endDate.toDateString()

    const {
        startDates,
        endDates
    } = gameDataObj.epic


    if (!startDates.includes(startDateString)) {
        startDates.unshift(startDateString)
        endDates.unshift(endDateString)
        return true
    }

    return false
}

async function addBaseGameObj(modifiedGameList, name, giveAwayDate, period, write = true) {

    const gameDataObj = initGameObj(modifiedGameList, name)

    const addedNewDate = addDatesToGameObj(gameDataObj, giveAwayDate, period)
    if (addedNewDate && write) {
        await writeGameList(modifiedGameList)
    }

    return gameDataObj

}

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
