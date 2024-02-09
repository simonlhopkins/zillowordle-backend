import { config } from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { getCityData } from "./csvHelpers.js";
import * as fs from "fs/promises";
import * as schedule from "node-schedule";
import { GameData } from "./types/GameData.js";
import { chooseRandom, getNewHouse, getRandomHouseFromCache } from "./Util.js";
import { ErrorWithHtml } from "./types/ErrorWithHtml.js";

config();

const app = express();
app.use(cors());

app.use(express.static("public"));

const port = parseInt(process.env.EXPRESS_PORT as string);

const requestLogger = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  console.log(`${request.method} url:: ${request.url}`);
  next();
};

const errorLogger = (
  error: Error,
  request: Request,
  response: Response,
  next: NextFunction
) => {
  console.log(`error ${error.message}`);
  next(error); // calling next middleware
};

const errorResponder = (
  error: Error,
  request: Request,
  response: Response,
  next: NextFunction
) => {
  response.header("Content-Type", "application/json");
  if (error instanceof ErrorWithHtml) {
    response.setHeader("Content-Type", "text/html");
    response.status(501).send(error.htmlString);
  } else {
    response.status(501).send(error.message);
  }
};

const invalidPathHandler = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  response.status(404);
  response.send("invalid path");
};

app.get("/cities", async (req, res) => {
  res.send(await getCityData());
});

async function GetDailyZillow(): Promise<GameData> {
  const filePath = "./CachedZillowData/daily.json";
  return fs
    .access(filePath, fs.constants.F_OK)
    .then(async () => {
      const fileContent = await fs.readFile(filePath, "utf-8");
      return JSON.parse(fileContent) as GameData;
    })
    .catch(async () => {
      console.log("error");
      const newGameData = await getRandomHouseFromCache();
      await fs.writeFile(filePath, JSON.stringify(newGameData), "utf-8");
      return newGameData;
    });
}

app.get("/zillow/daily", async (req, res, next) => {
  const zillowGameData = await GetDailyZillow();
});

app.get("/zillow/cached-house", async (req, res, next) => {
  try {
    const gameData = await getRandomHouseFromCache();
    res.send(gameData);
  } catch (e: any) {
    next(e);
  }
});
app.get("/zillow/new-house/location", async (req, res, next) => {
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
      next(e);
    }
  }
});
app.get("/zillow/new-house/random", async (req, res, next) => {
  const allCities = await getCityData();
  const cityData = chooseRandom(allCities);
  try {
    const gameData = await getNewHouse(cityData);

    res.send(gameData);
  } catch (e) {
    next(e);
  }
});

app.use(requestLogger);

// Attach the first Error handling Middleware
// function defined above (which logs the error)
app.use(errorLogger);

// Attach the second Error handling Middleware
// function defined above (which sends back the response)
app.use(errorResponder);

// Attach the fallback Middleware
// function which sends back the response for invalid paths)
app.use(invalidPathHandler);

app.listen(process.env.PORT || port, () => {
  console.log(`Example app listening on port ${port}`);
});

schedule.scheduleJob("0 0 * * *", () => {
  console.log("it is midnight");
  console.log("");
}); // run everyday at midnight

//testing out neural network
