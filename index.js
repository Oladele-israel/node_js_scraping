import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { retry } from "./utils/retry.js";
import { getUserAgent } from "./utils/userAgent.js";

puppeteer.use(StealthPlugin());

const scrape = async () => {
  const url = `https://nigeriapropertycentre.com/`;

  const userInput = 'Rivers'
  const userAgent = getUserAgent();

  let browser;


  try {

    const launchOptions = {
      headless: false, //set to 'new' in prod
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    };

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    await page.setUserAgent(userAgent);
    await page.setDefaultTimeout(20000);


    await retry(() => page.goto(url, { waitUntil: 'domcontentloaded' }));
    await retry(() => page.click('label[for="cid-for-rent"]'));

    await page.type('#propertyLocation', userInput, { delay: 100 });

    await retry(() =>
      page.waitForFunction(() => {
        const ul = document.querySelector('#eac-container-propertyLocation ul');
        return ul && ul.style.display !== 'none' && ul.children.length > 0;
      })
    );

    // Get the list of suggestions
    const suggestions = await page.$$eval('#eac-container-propertyLocation ul li .eac-item', nodes =>
      nodes.map(el => el.textContent.trim())
    );

    console.log('Autocomplete Suggestions:===>>', suggestions);

    const matchIndex = suggestions.findIndex(text =>
      text.toLowerCase().includes(userInput.toLowerCase())
    );

    if (matchIndex === -1) {
      throw new Error(`No match found for: ${userInput}`);
    }

    const selector = `#eac-container-propertyLocation ul li:nth-child(${matchIndex + 1}) .eac-item`;
    await retry(() => page.click(selector));
    console.log(`✅ Clicking match: ${suggestions[matchIndex]}`);

    // Click fresh selector (no stale handle)
    await page.click(selector);

    await page.waitForFunction(() => document.querySelector('#eac-container-propertyLocation ul').style.display === 'none');

    console.log("✅ Suggestion selected and dropdown closed.");

    // ======================================================================

    // add the type of property selecting from the dropdown //value relation : 0 for all types, 1 is flat/ apartment, 2:house,5: land 3, commercial property
    console.log("Selecting property type...");
    await page.select('select#tid', '1');

    // add the bedroom but default to any for land and commercial property
    console.log("Selecting number of bedrooms...");
    await page.select('select#bedrooms', '3')

    console.log("Selecting number of bedrooms...");
    await page.select('select#tid', '1');

    const minPriceOptions = await page.$$eval('#minprice option', options => options.map(o => o.value));
    const maxPriceOptions = await page.$$eval('#maxprice option', options => options.map(o => o.value));

    console.log('Available Min Prices: =====>>', minPriceOptions);
    console.log('Available Max Prices: ====>>>>', maxPriceOptions);

    console.log("Selecting min...");
    // 6. Select Min Price = ₦500,000 (value="500000")
    await page.select('select#minprice', '100000');

    console.log("Selecting Max Price...");
    // 7. Select Max Price = ₦2,000,000 (value="2000000")
    await page.select('select#maxprice', '150000000');

    // 8. Submit form by clicking search button
    console.log("Submitting the search form...");
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);

    console.log("Waiting for search results to load...");

    // Ensure the new body class is present
    await page.waitForFunction(() => {
      return document.body.classList.contains('property-list-page');
    }, { timeout: 20000 });

    // Then wait for the listing container
    await page.waitForSelector('.wp-block.property.list', { timeout: 20000 });

    console.log("✅ Listings loaded!");


    // // // 9. Wait for search results page to load
    // await page.waitForNyyyavigation({ waitUntil: 'domcontentloaded' });


    // const listings = await page.$$eval('div.property-list', (nodes) =>
    //   nodes.map((node) => {
    //     const getText = (selector) => node.querySelector(selector)?.textContent?.trim() || '';
    //     const getAttr = (selector, attr) => node.querySelector(selector)?.getAttribute(attr) || '';

    //     const price = Array.from(node.querySelectorAll('.price'))
    //       .map(el => el.textContent?.trim())
    //       .join('');

    //     const stats = Array.from(node.querySelectorAll('.aux-info li')).map(li => li.innerText.trim());

    //     return {
    //       title: getText('h3[itemprop="name"]'),
    //       subtitle: getText('.content-title'),
    //       detailPage: 'https://nigeriapropertycentre.com' + getAttr('a[itemprop="url"]', 'href'),
    //       image: getAttr('img[itemprop="image"]', 'src'),
    //       location: getText('address'),
    //       description: getText('.description p'),
    //       price: price.replace(/\s+/g, ''),
    //       bedrooms: stats.find(s => s.includes('Bedroom')) || '',
    //       bathrooms: stats.find(s => s.includes('Bathroom')) || '',
    //       toilets: stats.find(s => s.includes('Toilet')) || '',
    //       parkingSpaces: stats.find(s => s.includes('Parking')) || '',
    //       agent: getText('.marketed-by'),
    //       phone: getText('.marketed-by strong')
    //     };
    //   })
    // );

    console.dir(listings, { depth: null });


    await browser.close();
  } catch (error) {
    console.error("Scraping failed:", error);
  }
};

scrape();
