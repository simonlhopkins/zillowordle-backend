import {
  GetHouseHTMLFromSearchURL,
  GetZillowHouseDataFromHouseHtml,
  createSearchUrlFromCityData,
} from "./ZillowHelpers.js";
import { config } from "dotenv";
import express from "express";
import cors from "cors";
import { getCityData } from "./csvHelpers.js";
import path from "path";
import * as fs from "fs/promises";
import { CityData } from "./types/CityData.js";
import * as schedule from "node-schedule";
import {
  GetLocationFromImage,
  classifyListOfImages,
  getBestSearchHouse,
} from "./AIHelper.js";
import { GameData } from "./types/GameData.js";
import { chooseRandom } from "./Util.js";

config();

const app = express();
app.use(cors());

app.use(express.static("public"));

const port = parseInt(process.env.EXPRESS_PORT as string);

const getRandomHouseFromCache = async (): Promise<GameData> => {
  const addressPath = path.join(process.cwd(), "/CachedHTML/addresses/");
  const files = await fs.readdir(addressPath);
  const filePath = path.join(addressPath, chooseRandom(files));
  const htmlString: string = await fs
    .readFile(filePath)
    .then((content) => content.toString())
    .catch((e) => {
      throw e;
    });

  const zillowHouseData = await GetZillowHouseDataFromHouseHtml(htmlString);
  const classifiedImages = await classifyListOfImages(zillowHouseData.images);
  let aIGuess = null;
  try {
    aIGuess = await GetLocationFromImage(classifiedImages[0].url);
  } catch {}

  return {
    zillowHouseData: zillowHouseData,
    aIGuess,
    classifiedImages,
  };
};

const getNewHouse = async (cityData: CityData): Promise<GameData> => {
  const citySearchUrl = createSearchUrlFromCityData(cityData);
  const htmlString = await GetHouseHTMLFromSearchURL(citySearchUrl);
  const zillowHouseData = await GetZillowHouseDataFromHouseHtml(htmlString);
  const classifiedImages = await classifyListOfImages(zillowHouseData.images);
  const aIGuess = await GetLocationFromImage(classifiedImages[0].url);
  return {
    zillowHouseData,
    aIGuess,
    classifiedImages,
  };
};

app.get("/cities", async (req, res) => {
  res.send(await getCityData());
});
app.get("/", (req, res) => {
  // res.sendFile(path.join(path.resolve(), "/index.html"));
});

async function GetDailyZillow(): Promise<GameData> {
  const filePath = "./CachedZillowData/daily.json";
  return fs
    .access(filePath, fs.constants.F_OK)
    .then(async () => {
      const fileContent = await fs.readFile(filePath, "utf-8");
      return JSON.parse(fileContent) as GameData;
    })
    .catch(async (err) => {
      console.log("error");
      const newGameData = await getRandomHouseFromCache();
      await fs.writeFile(filePath, JSON.stringify(newGameData), "utf-8");
      return newGameData;
    });
}

app.get("/zillow/daily", async (req, res) => {
  const zillowGameData = await GetDailyZillow();
});

app.get("/zillow/cached-house", async (req, res) => {
  try {
    const gameData = await getRandomHouseFromCache();

    res.send(gameData);
  } catch (e: any) {
    res.status(501).send(e.message);
  }
});
app.get("/zillow/new-house/location", async (req, res) => {
  console.log(req.query);
  const { city, state } = req.query;
  const allCities = await getCityData();
  const cityData = allCities.find(
    (item) => item.city == city && item.state_id == state
  );
  if (!cityData) {
    res.status(404).send("City Not Found");
  } else {
    try {
      const zillowGameData = await getNewHouse(cityData);
      res.send(zillowGameData);
    } catch (e) {
      console.log(e);
      res.status(501).send(e);
    }
  }
});
app.get("/zillow/new-house/random", async (req, res) => {
  const allCities = await getCityData();
  const cityData = chooseRandom(allCities);
  try {
    const gameData = await getNewHouse(cityData);

    res.send(gameData);
  } catch (e) {
    res.status(501).send(e);
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

schedule.scheduleJob("0 0 * * *", () => {
  console.log("it is midnight");
  console.log("");
}); // run everyday at midnight

//testing out neural network
