import path from "node:path";
import fs from "fs/promises";
import { GameData } from "./types/GameData.js";
import {
  GetHouseHTMLFromSearchURL,
  GetZillowHouseDataFromHouseHtml,
  createSearchUrlFromCityData,
} from "./ZillowHelpers.js";
import { GetLocationFromImage, classifyListOfImages } from "./AIHelper.js";
import { CityData } from "./types/CityData.js";

export const chooseRandom = (arr: any[]) => {
  return arr[Math.floor(Math.random() * arr.length)];
};

export function numberWithCommas(x: string) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export const getRandomHouseFromCache = async (): Promise<GameData> => {
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

export const getNewHouse = async (cityData: CityData): Promise<GameData> => {
  const citySearchUrl = createSearchUrlFromCityData(cityData);
  const htmlString = await GetHouseHTMLFromSearchURL(citySearchUrl);
  const zillowHouseData = await GetZillowHouseDataFromHouseHtml(htmlString);
  // const classifiedImages = await classifyListOfImages(zillowHouseData.images);
  // const aIGuess = await GetLocationFromImage(classifiedImages[0].url);
  const aIGuess = null;
  const classifiedImages = null;
  return {
    zillowHouseData,
    aIGuess,
    classifiedImages,
  };
};
