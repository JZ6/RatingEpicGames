import { addGame } from "./update.mjs";
import importedGamesList from '../../data/freeGamesList.json' assert { type: "json" }

async function update(params) {
    const modifiedGameList = { ...importedGamesList }
    // await addGame(modifiedGameList, `Shadow Tactics: Aiko's Choice`, new Date())
    await addGame(modifiedGameList, `Adios`, 'January 26, 2023')
    // await addGame(modifiedGameList, 'Counter-Sadsatrike: Global Offensive')
}

update()