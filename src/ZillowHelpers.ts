import { config } from "dotenv";
import * as fs from "fs/promises";
import pw from "playwright";
import { Browser } from "puppeteer";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { chooseRandom } from "./Util.js";
import { CityData } from "./types/CityData";
import { ZillowHouseData } from "./types/ZillowHouseData";
const AUTH = "brd-customer-hl_8b7eeabb-zone-scraping_browser:f3l0zbhx9ttd";
const SBR_CDP = `wss://${AUTH}@brd.superproxy.io:9222`;
config();

export async function GetHTMLStringWithPlaywrite(
  url: string,
  savePath?: string
) {
  // const browser: pw.Browser = await pw.chromium.connectOverCDP(SBR_CDP);
  console.log("setting up puppetterr");
  const browser = await pw.chromium.launch({ headless: true });
  const userAgentStrings = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.2227.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.3497.92 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
  ];

  try {
    console.log("Connected! Navigating...");
    const context = await browser.newContext({
      userAgent:
        userAgentStrings[Math.floor(Math.random() * userAgentStrings.length)],
    });
    await context.addInitScript(
      "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    );
    const page = await context.newPage();
    await page.goto(url, { timeout: 2 * 60 * 1000 });

    const html = await page.content();
    await browser.close();
    if (savePath) {
      await fs.writeFile(savePath, html);
    }
    return html;
  } catch (e: any) {
    throw e;
  }
}
//maybe I should just make another service to upload a zillow data to a database that this server can read from.
const generateAddressSavePath = (addressURL: string) => {
  const addressRegex = /\/homedetails\/([^\/]+)/;
  const match = addressURL.match(addressRegex);
  if (match && match.length >= 2) {
    return `./CachedHTML/addresses/${match[1]}.html`;
  }
  throw new Error(`Cannot find an address file from ${addressURL}`);
};

const generateSearchSavePath = (searchUrl: string) => {
  const regex = /\/([a-zA-Z0-9-]+)\/houses\//;
  const match = searchUrl.match(regex);
  if (match) {
    const extractedValue = match[1];
    return `./CachedHTML/searches/${extractedValue}.html`;
  }
  throw new Error(`Cannot find a search file from ${searchUrl}`);
};

const createSearchUrlFromCityData = (cityData: CityData) => {
  return `https://www.zillow.com/${cityData.city
    .toLowerCase()
    .replaceAll(" ", "-")}-${cityData.state_id.toLowerCase()}/houses/`;
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
): ZillowHouseData => {
  console.log("GetZillowHouseDataFromHouseHtml");
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
    throw new Error("no url found in house html string");
  }
  if (!houseDataScriptMatch) {
    throw new Error("no house data (__NEXT_DATA__) found in house html string");
  }
  const pagePropObj = JSON.parse(houseDataScriptMatch[1]);
  const propertyData: any = Object.values(
    JSON.parse(pagePropObj.props.pageProps.componentProps.gdpClientCache)
  )[0];
  const zillowHouseUrl = zillowLinkMatch[1];
  const extractScores = (html: string) => {
    const walkScoreMatch = html.match(/Walk Score.*?<a[^>]*>(.*?)<\/a>/);
    const transitScoreMatch = html.match(/Transit Score.*?<a[^>]*>(.*?)<\/a>/);
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
  console.log(streetAddress);
  return {
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
    lotSize,
  };
};

export async function GetHTMLStringWithPuppeteer(
  url: string,
  savePath?: string
) {
  const userAgentStrings = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.2227.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.3497.92 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
  ];

  puppeteerExtra.use(StealthPlugin());
  const browser: Browser = await puppeteerExtra.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setUserAgent(chooseRandom(userAgentStrings));
  await page.goto(url);
  await page.waitForTimeout(5000);
  let html = await page.content();
  const regex = /<div\s+id="px-captcha"/;
  if (regex.test(html)) {
    console.log("HTML string contains <div id='px-captcha'>");
    await page.click("#px-captcha", { delay: 5000 });
    await page.waitForTimeout(10000);
    await page.screenshot({ path: `./error.jpg` });
    html = await page.content();
  }
  await browser.close();
  if (savePath) {
    await fs.writeFile(savePath, html);
  }
  return html;
}

export const GetHTMLStringFromAddressUrl = async (
  addressURL: string
): Promise<string> => {
  const desiredSavePath = generateAddressSavePath(addressURL);

  try {
    const content = await fs.readFile(desiredSavePath);
    return content.toString();
  } catch (e) {
    console.log("address html does not exist in cache");
    try {
      return await GetHTMLStringWithPuppeteer(addressURL, desiredSavePath);
    } catch (e) {
      console.log(e);
      throw new Error("Error inside GetHTMLStringFromAddressUrl");
    }
  }
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
  const desiredSavePath = generateSearchSavePath(searchUrl);

  let searchPageHtmlString;
  try {
    const content = await fs.readFile(desiredSavePath);
    searchPageHtmlString = content.toString();
  } catch (e) {
    console.log("search html does not exist in cache");
    try {
      searchPageHtmlString = await GetHTMLStringWithPuppeteer(
        searchUrl,
        desiredSavePath
      );
    } catch (e) {
      throw new Error("Error inside GetHTMLStringFromAddressUrl");
    }
  }

  const addressRegex =
    /https:\/\/www\.zillow\.com\/homedetails\/[0-9A-Za-z\-]+\/\d+_zpid\//g;
  const matches = searchPageHtmlString.match(addressRegex);

  if (matches) {
    const allAddresses = Array.from(new Set(matches));
    const randomHouseUrl = chooseRandom(allAddresses);
    await fs.writeFile(desiredSavePath, searchPageHtmlString);
    return randomHouseUrl;
  } else {
    throw new Error("No house Urls found on zillow page!!");
  }
};

export {
  GetHouseHTMLFromSearchURL,
  GetZillowHouseDataFromHouseHtml,
  createSearchUrlFromCityData,
  createSearchUrlFromStateCity,
};
