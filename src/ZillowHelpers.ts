import * as fs from "fs/promises";
import { config } from "dotenv";
import * as cheerio from "cheerio";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Puppeteer } from "puppeteer";
import { chooseRandom } from "./Util.js";
import { CityData } from "./types/CityData";
import { ZillowHouseData } from "./types/ZillowHouseData";
config();

const generateAddressSavePath = (addressURL: string) => {
  const addressRegex = /\/homedetails\/([^\/]+)/;
  const match = addressURL.match(addressRegex);
  if (match && match.length >= 2) {
    return `./CachedHTML/addresses/${match[1]}.html`;
  }
  throw `Cannot find an address file from ${addressURL}`;
};

const generateSearchSavePath = (searchUrl: string) => {
  const regex = /\/([a-zA-Z0-9-]+)\/houses\//;
  const match = searchUrl.match(regex);
  if (match) {
    const extractedValue = match[1];
    return `./CachedHTML/searches/${extractedValue}.html`;
  }
  throw `Cannot find a search file from ${searchUrl}`;
};

const createSearchUrlFromCityData = (cityData: CityData) => {
  return "https://www.zillow.com/portland-or/houses/";
  // return `https://www.zillow.com/${cityData.city
  //   .toLowerCase()
  //   .replaceAll(" ", "-")}-${cityData.state_id.toLowerCase()}/houses/`;
};

const createSearchUrlFromStateCity = (state: string, city: string) => {
  return `https://www.zillow.com/${city.replace(
    " ",
    "-"
  )}-${state.toLowerCase()}/houses/`;
};

const GetHouseHTMLFromSearchURL = async (
  searchUrl: string
): Promise<string> => {
  const randomHouseUrl = await GetRandomHouseUrlFromSearch(searchUrl);
  console.log(randomHouseUrl);
  const htmlString = await GetHTMLStringFromAddressUrl(randomHouseUrl);
  return htmlString;
};

const GetZillowHouseDataFromHouseHtml = (
  htmlString: string
): Promise<ZillowHouseData> => {
  return new Promise((resolve, reject) => {
    const scriptId = "__NEXT_DATA__";
    const scriptType = "application/json";
    const houseDataScriptRegex = new RegExp(
      `<script\\s+id="${scriptId}"\\s+type="${scriptType}">(.*?)<\\/script>`,
      "s"
    );
    const zillowLinkRegex = /<meta property="og:url" content="([^"]+)">/;
    const zillowLinkMatch = htmlString.match(zillowLinkRegex);
    const houseDataScriptMatch = htmlString.match(houseDataScriptRegex);
    if (!zillowLinkMatch) {
      reject(new Error("no url found in house html string"));
      return;
    }
    if (!houseDataScriptMatch) {
      reject(
        new Error("no house data (__NEXT_DATA__) found in house html string")
      );
      return;
    }

    const pagePropObj = JSON.parse(houseDataScriptMatch[1]);
    const propertyData: any = Object.values(
      JSON.parse(pagePropObj.props.pageProps.componentProps.gdpClientCache)
    )[0];
    const zillowHouseUrl = zillowLinkMatch[1];
    const extractScores = (html: string) => {
      const walkScoreMatch = html.match(/Walk Score.*?<a[^>]*>(.*?)<\/a>/);
      const transitScoreMatch = html.match(
        /Transit Score.*?<a[^>]*>(.*?)<\/a>/
      );
      const bikeScoreMatch = html.match(/Bike Score.*?<a[^>]*>(.*?)<\/a>/);
      const walkScore = walkScoreMatch ? parseInt(walkScoreMatch[1], 10) : null;
      const transitScore = transitScoreMatch
        ? parseInt(transitScoreMatch[1], 10)
        : null;
      const bikeScore = bikeScoreMatch ? parseInt(bikeScoreMatch[1], 10) : null;
      return { walkScore, transitScore, bikeScore };
    };

    const scores = extractScores(htmlString);
    const {
      responsivePhotos,
      latitude,
      longitude,
      city,
      state,
      bedrooms,
      bathrooms,
      price,
      yearBuilt,
      streetAddress,
      zipcode,
      country,
      currency,
      resoFacts,
      livingArea,
      taxHistory,
      priceHistory,
      description,
      timeOnZillow,
      pageViewCount,
      favoriteCount,
      daysOnZillow,
      timeZone,
      propertyTaxRate,
      lotSize,
      livingAreaUnits,
      datePostedString,
      originalPhotos,
      listingTypeDimension,
      zestimate,
      rentZestimate,
    } = propertyData.property;

    const images = responsivePhotos.map(
      (entry: { mixedSources: { jpeg: any[] } }) =>
        entry.mixedSources.jpeg.filter(
          (item: { width: number }) => item.width > 1500
        )[0].url
    );
    resolve({
      images,
      city,
      price,
      bedrooms,
      bathrooms,
      yearBuilt,
      streetAddress,
      scores,
      zestimate,
      rentZestimate,
      daysOnZillow,
      livingArea,
      state,
      zillowHouseUrl,
      latitude,
      longitude,
    });
  });
};

const GetHTMLStringFromAddressUrl = async (
  addressURL: string
): Promise<string> => {
  // const desiredSavePath = generateAddressSavePath(addressURL);
  const desiredSavePath = generateAddressSavePath(addressURL);
  return fs
    .readFile(desiredSavePath)
    .then((content) => {
      return content.toString();
    })
    .catch(async () => {
      console.log("address html does not exist in cache");

      puppeteerExtra.use(StealthPlugin());
      return puppeteerExtra
        .launch({
          headless: "new",
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        })
        .then(async (browser: Browser) => {
          const page = await browser.newPage();
          await page.setUserAgent(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0"
          );
          await page.goto(addressURL);
          await page.waitForTimeout(5000);
          const html = await page.content();
          await browser.close();
          fs.writeFile(desiredSavePath, html);
          return html;
        })
        .catch((e) => {
          throw "Error inside GetHTMLStringFromAddressUrl";
        });
    });
};

const getSearchQueryHeader = () => {
  const searchQuery = {
    isMapVisible: true,
    mapZoom: 14,
    filterState: {
      sort: {
        value: "globalrelevanceex",
      },
      tow: {
        value: false,
      },
      mf: {
        value: false,
      },
      con: {
        value: false,
      },
      land: {
        value: false,
      },
      ah: {
        value: true,
      },
      apa: {
        value: false,
      },
      manu: {
        value: false,
      },
      apco: {
        value: false,
      },
    },
    isListVisible: true,
    pagination: {},
  };
  return JSON.stringify(searchQuery);
};

const GetRandomHouseUrlFromSearch = async (
  searchUrl: string
): Promise<string> => {
  puppeteerExtra.use(StealthPlugin());
  const desiredSavePath = generateSearchSavePath(searchUrl);

  const searchPageHtmlString = await fs
    .readFile(desiredSavePath)
    .then((content) => {
      console.log("html already exists");
      return content.toString();
    })
    .catch(async () => {
      console.log("html does not exist in cache");
      console.log("trying to go to: " + searchUrl);
      puppeteerExtra.use(StealthPlugin());
      console.log("using stealth plugin blegh");
      let browser;
      try {
        browser = await puppeteerExtra.launch({
          headless: "new",
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
      } catch (e) {
        console.log("error setting up browser");
        console.log(e);
        throw new Error("ERROR SETTING UP BROWSER");
      }
      console.log("browser created");
      const page = await browser.newPage();
      console.log("new page created");
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0"
      );
      await page.setExtraHTTPHeaders({
        searchQueryState: getSearchQueryHeader(),
      });
      await page.goto(searchUrl);
      await page.waitForTimeout(5000);
      const html = await page.content();
      console.log("html loaded");
      await browser.close();
      console.log("browser closed");
      await fs.writeFile(desiredSavePath, html);
      console.log("file written closed");
      return html;
    });
  const addressRegex =
    /https:\/\/www\.zillow\.com\/homedetails\/[0-9A-Za-z\-]+\/\d+_zpid\//g;
  const matches = searchPageHtmlString.match(addressRegex);

  if (matches) {
    const allAddresses = Array.from(new Set(matches));
    const randomHouseUrl = chooseRandom(allAddresses);
    return randomHouseUrl;
  }
  throw "No house Urls found on zillow page!!";
};

export {
  GetHouseHTMLFromSearchURL,
  GetZillowHouseDataFromHouseHtml,
  createSearchUrlFromCityData,
  createSearchUrlFromStateCity,
};
