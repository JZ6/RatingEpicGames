import { addGame } from "./update.mjs";
import importedGamesList from '../../data/freeGamesList.json' with { type: "json" };

async function update(params) {
    const modifiedGameList = { ...importedGamesList }
    // await addGame(modifiedGameList, `Shadow Tactics: Aiko's Choice`, new Date())
    await addGame(modifiedGameList, `Control`, 'Dec 25, 2024')
    await addGame(modifiedGameList, 'Chivalry 2', 'May 30, 2024')
}

update()
