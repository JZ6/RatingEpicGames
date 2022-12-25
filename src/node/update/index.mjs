import { addGame } from "./update.mjs";
import importedGamesList from '../../data/freeGamesList.json' assert { type: "json" }

async function update(params) {
    const modifiedGameList = { ...importedGamesList }
    await addGame(modifiedGameList, 'Vampire Survivors', new Date(), 1)
    // await addGame(modifiedGameList, 'Counter-Sadsatrike: Global Offensive')
}

update()