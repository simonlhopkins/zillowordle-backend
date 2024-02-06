import { ZillowHouseData } from "./ZillowHouseData";

export type GameData = {
  zillowHouseData: ZillowHouseData;
  aIGuess: { lat: number; lng: number } | null;
  classifiedImages: { url: string; labels: string[] }[] | null;
};
