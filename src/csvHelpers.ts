import { parse } from "csv-parse";
import { finished } from "stream/promises";
import fs from "node:fs";
import { createSearchUrlFromCityData } from "./ZillowHelpers.js";
import { chooseRandom } from "./Util.js";
import { CityData } from "./types/CityData.js";

const csvFilePath = "./data/uscities.csv";
const maxCities = 3000;
const parseCSV = async (filePath: string) => {
  const records: CityData[] = [];
  const parser = fs.createReadStream(filePath).pipe(
    parse({
      from_line: 1,
      to_line: maxCities,
      columns: true,
      // CSV options if any
    })
  );
  parser.on("readable", function () {
    let record;
    while ((record = parser.read()) !== null) {
      // Work with each record
      records.push(record);
    }
  });
  await finished(parser);
  return records;
};
const getCityData = async (): Promise<CityData[]> => {
  const records = await parseCSV(csvFilePath);
  return records;
};

export { getCityData };
