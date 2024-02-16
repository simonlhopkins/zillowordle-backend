import * as fs from "fs/promises";
import { chooseRandom, gameDataSchema } from "./Util";

async function main() {
  const filePath = "data/gameData.json";
  try {
    const cachedJSON = await gameDataSchema.validate(
      JSON.parse(await fs.readFile(filePath, "utf-8"))
    );
    const randomFromCache = chooseRandom(cachedJSON.cache);
    cachedJSON.daily = randomFromCache;
    await fs.writeFile(filePath, JSON.stringify(cachedJSON, null, 2));
  } catch (e: any) {
    console.log(e);
    throw Error(
      "error opening zillow game data json file on server: " + e.message
    );
  }
}

main();
