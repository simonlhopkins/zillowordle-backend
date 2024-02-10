import * as cheerio from "cheerio";
import * as fs from "fs";

import { ScrapflyClient, ScrapeConfig, ScrapeResult, log } from "scrapfly-sdk";

const apikey = "scp-live-847fb21dc16f4e7f98c3105b2633283b";
const scrapfly = new ScrapflyClient({ key: apikey });
const apiResult = await scrapfly.scrape(
  new ScrapeConfig({
    url: "https://www.zillow.com/homedetails/3944-SW-Condor-Ave-Portland-OR-97239/53865484_zpid/",
    // optional configuration:
    asp: true, // enable scraper blocking bypass
    country: "US", // set proxy country
    render_js: true, // enable headless web browser
    // ... and much more
  })
);

fs.writeFileSync("./test.html", apiResult.result.content, (err) => {
  if (err) {
    console.error(err);
  }
  // file written successfully
});
var regexPattern =
  /https:\/\/photos\.zillowstatic\.com\/fp\/[a-zA-Z0-9]*-cc_ft_1536.jpg/g;
const htmlString = fs.readFileSync("./test.html").toString();
let matches = htmlString.match(regexPattern);
console.log(matches);
const str = "All of us except @Emran, @Raju and @Noman were there";
console.log(str.match(/@\w*/g));

const $ = cheerio.load(htmlString);
const scoreParents = $('button:contains("Score")').parent().parent();
if (scoreParents.length > 0) {
  scoreParents.each(function () {
    const title = $(this).children().eq(0).text();
    const score = $(this).children().eq(1).text();
    console.log(`${title}: ${score}`);
  });
}
