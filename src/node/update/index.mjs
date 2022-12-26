import { addGame } from "./update.mjs";
import importedGamesList from '../../data/freeGamesList.json' assert { type: "json" }

async function update(params) {
    const modifiedGameList = { ...importedGamesList }
    await addGame(modifiedGameList, `F.I.S.T.: Forged In Shadow Torch`, new Date(), 1)
    // await addGame(modifiedGameList, 'Counter-Sadsatrike: Global Offensive')
}

update()