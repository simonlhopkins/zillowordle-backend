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

import { InferType, array, number, object, string } from "yup";
import axios from "axios";

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

  const zillowHouseData = GetZillowHouseDataFromHouseHtml(htmlString);

  const classifiedImages = await classifyListOfImages(zillowHouseData.images);
  let aIGuess = null;
  try {
    aIGuess = await GetLocationFromImage(classifiedImages[0].url);
  } catch {}
  const gameData: GameData = {
    zillowHouseData: zillowHouseData,
    aIGuess,
    classifiedImages,
  };
  return gameData;
};

export const gameDataSchema = object({
  daily: object().required("daily is required"),
  cache: array()
    .of(
      object({
        zillowHouseData: object({
          streetAddress: string().required(),
        }).required(),
      })
    )
    .required("cache is required"),
}).required();

export async function writeGameDataToCache(gameData: GameData) {
  const gameDataFilePath = "data/gameData.json";
  let cachedJSON: InferType<typeof gameDataSchema>;
  try {
    const parsedJSON = JSON.parse(await fs.readFile(gameDataFilePath, "utf-8"));
    cachedJSON = await gameDataSchema.validate(parsedJSON);
  } catch (e: any) {
    // console.log(e);
    console.log("something went wrong parsing existing zillow data,");
    cachedJSON = {
      daily: gameData,
      cache: [],
    };
  }
  if (
    cachedJSON.cache.find(
      (item) =>
        item.zillowHouseData.streetAddress ==
        gameData.zillowHouseData.streetAddress
    ) == undefined
  ) {
    cachedJSON.cache.push(gameData);
  } else {
    console.log(`${gameData.zillowHouseData.streetAddress} already in cache`);
  }

  await fs.writeFile(gameDataFilePath, JSON.stringify(cachedJSON, null, 2));
}

export const getNewHouse = async (cityData: CityData): Promise<GameData> => {
  const citySearchUrl = createSearchUrlFromCityData(cityData);
  const htmlString = await GetHouseHTMLFromSearchURL(citySearchUrl);
  const zillowHouseData = GetZillowHouseDataFromHouseHtml(htmlString);
  const classifiedImages = await classifyListOfImages(zillowHouseData.images);
  const aIGuess = await GetLocationFromImage(classifiedImages[0].url);

  const gameData: GameData = {
    zillowHouseData,
    aIGuess,
    classifiedImages,
  };

  //write to json file here
  // const aIGuess = null;
  // const classifiedImages = null;
  return gameData;
};

//chat poo poo pee
export async function validateImageUrls(
  imageUrls: string[]
): Promise<string[]> {
  const validImages = await Promise.all(
    imageUrls.map(async (imageUrl) => {
      try {
        const response = await axios.head(imageUrl);

        if (response.status === 200) {
          return imageUrl;
        } else {
          console.log(
            `Unexpected status code: ${response.status}: ${imageUrl}`
          );
          return null;
        }
      } catch (error: any) {
        console.log(`Error: ${error.message}: ${imageUrl}`);
        return null;
      }
    })
  ).then((images) => images.filter((image) => image != null));

  return validImages as string[];
}
