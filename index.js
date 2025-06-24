import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { retry } from "./utils/retry.js";
import { getUserAgent } from "./utils/userAgent.js";


/**
 * author: Oladele Israel
 * title: web scraping project for nigeriapropertycentre.com
 * reason: to get data to display on Jarleh
 * 
 * params: location: area || city || state, or combined  
 *                  (e.g: Port Harcourt, Rivers, or combined Port Harcourt, Rivers) 
 * *        propertyType: flat/apartment(value: 1), 
 *                        house(2), land(5), commercial property(3)
 * *        bedrooms: number of bedrooms (default: any ranging from 1 to 6)
 * *        minPrice: minimum price (default: 0, from 250000 above)
 * *        maxPrice: maximum price (default: 50000000000, max)
 * crawles paginated listings 
 * 
 */

puppeteer.use(StealthPlugin());

const scrape = async () => {
  const url = `https://nigeriapropertycentre.com/`;

  const userInput = 'Port Harcourt'
  const userAgent = getUserAgent();
  const MAX_PAGES = 5;
  let listings = [];

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

    // -sale for buying the apartment
    // -rent for renting the apartment
    // 'cid-short-let' lease for leasing the apartment

    await retry(() => page.click('label[for="cid-for-sale"]'));
    // await retry(() => page.click('label[for="cid-for-rent"]'));

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

    const normalizedInput = userInput.trim().toLowerCase();

    // First try exact match
    let matchIndex = suggestions.findIndex(text => text.trim().toLowerCase() === normalizedInput);

    // If not found, try entries that start with the input (e.g., "Lagos" vs "Lagos Mainland")
    if (matchIndex === -1) {
      matchIndex = suggestions.findIndex(text => text.trim().toLowerCase().startsWith(normalizedInput));
    }

    if (matchIndex === -1) {
      throw new Error(`❌ No exact or safe match found for: "${userInput}". Suggestions were: ${suggestions.join(', ')}`);
    }



    const matchedLocation = suggestions[matchIndex];
    console.log(`✅ Clicking exact match: ${matchedLocation}`);

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
    await page.select('select#minprice', '250000');

    console.log("Selecting Max Price...");
    // 7. Select Max Price = ₦2,000,000 (value="2000000")
    await page.select('select#maxprice', '50000000000');

    // 8. Submit form by clicking search button
    console.log("Submitting the search form...");
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);

    console.log("Waiting for search results to load...");

    // =========================scraping the property listings========================================
    // Ensure the new body class is present
    await page.waitForFunction(() => {
      return document.body.classList.contains('property-list-page');
    }, { timeout: 20000 });

    // Then wait for the listing container
    await page.waitForSelector('.wp-block.property.list', { timeout: 20000 });

    console.log("✅ Listings loaded!");

    await page.waitForSelector('.wp-block.property.list', { timeout: 20000 });

     const extractListings = async () =>
      await page.$$eval('[itemtype="https://schema.org/ListItem"]', nodes =>
        nodes.map(node => {
          const q = sel => node.querySelector(sel);
          const getText = sel => q(sel)?.textContent.trim().replace(/\s+/g, ' ') || null;
          const getAttr = (sel, attr) => q(sel)?.getAttribute(attr) || null;
          const getRoom = label =>
            [...node.querySelectorAll('.aux-info li')]
              .find(li => li.textContent.toLowerCase().includes(label))
              ?.querySelector('span')?.textContent.trim() || null;
          const price = node.querySelectorAll('span.price')[1]?.textContent.replace(/,/g, '').trim() || null;

          return {
            title: getText('[itemprop="name"]'),
            url: getAttr('[itemprop="url"]', 'href'),
            image: getAttr('[itemprop="image"]', 'src'),
            description: getText('[itemprop="description"] p'),
            price,
            address: getText('address strong'),
            phone: getText('.marketed-by strong'),
            bedrooms: getRoom('bedroom'),
            bathrooms: getRoom('bathroom'),
            toilets: getRoom('toilet'),
            area: getRoom('sqm'),
            parkingSpaces: getRoom('parking'),
          };
        })
      );

    let currentPage = 1;
    while (currentPage <= MAX_PAGES) {
      await page.waitForSelector('.wp-block.property.list', { timeout: 20000 });
      listings.push(...(await extractListings()));

      const nextBtn = await page.$('a[aria-label="Next »"], a[rel="next"]');
      if (!nextBtn) break;

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
        nextBtn.click(),
      ]);

      currentPage++;
    }

    console.log(`✅ Scraped ${listings.length} listings across ${currentPage} page(s).`);
    console.dir(listings, { depth: null });



    await browser.close();
  } catch (error) {
    console.error("Scraping failed:", error);
  }
};

scrape();
