import {
    writeGameList,
    cleanGameName,
    sleep
} from '../utils/index.mjs'


function initGameObj(modifiedGameList, name) {
    const gameListKey = cleanGameName(name)
    if (!(gameListKey in modifiedGameList)) {
        modifiedGameList[gameListKey] = {
            name,
            cleanName: gameListKey,
            epic: {
                startDates: [],
                endDates: [],
                storeURLName: gameListKey
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

export async function addBaseGameObj(modifiedGameList, name, giveAwayDate, period, write = true) {

    const gameDataObj = initGameObj(modifiedGameList, name)

    const addedNewDate = addDatesToGameObj(gameDataObj, giveAwayDate, period)
    if (addedNewDate && write) {
        await writeGameList(modifiedGameList)
    }

    return gameDataObj

}