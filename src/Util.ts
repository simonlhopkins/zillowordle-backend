import fs from "fs/promises";
import path from "node:path";
import { GetLocationFromImage, classifyListOfImages } from "./AIHelper.js";
import {
  GetHouseHTMLFromSearchURL,
  GetZillowHouseDataFromHouseHtml,
  createSearchUrlFromCityData,
} from "./ZillowHelpers.js";
import { CityData } from "./types/CityData.js";
import { GameData } from "./types/GameData.js";

import axios from "axios";
import { InferType, array, object, string } from "yup";

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
          streetAddress: string().required("street address is not in the data"),
        }).required(),
      })
    )
    .required("cache is required"),
}).required();

export async function writeGameDataToCache(gameData: GameData) {
  console.log("trying to write game data: ", gameData);
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

    throw new Error("something went wrong parsing existing zillow data");
  }
  try {
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
  } catch (e) {
    throw new Error(
      "Something went wrong while trying to write the new gamedata to json " +
        JSON.stringify(gameData)
    );
  }
}

export const getNewHouse = async (cityData: CityData): Promise<GameData> => {
  const citySearchUrl = createSearchUrlFromCityData(cityData);
  const htmlString = await GetHouseHTMLFromSearchURL(citySearchUrl);
  console.log("finished getting house HTML");

  try {
    console.log("trying to get new house");
    const zillowHouseData = await GetZillowHouseDataFromHouseHtml(htmlString);
    console.log(zillowHouseData);
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
  } catch (e) {
    throw new Error("problem processing htmlString after retrieving it: " + e);
  }
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
        return null;
      }
    })
  ).then((images) => images.filter((image) => image != null));

  return validImages as string[];
}

export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
