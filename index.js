import puppeteer from "puppeteer";

const scrape = async () => {
  try {
    const browser = await puppeteer.launch({
      headless: false, 
    });

    const page = await browser.newPage();

    const url = `https://nigeriapropertycentre.com/`;

    await page.goto(url, { waitUntil: "domcontentloaded" });

    // select the radio butoon for either rent, buy or shortlet  for now lets rent
    console.log("Selecting 'For Rent' option...");
    //  await page.click('input#cid-for-rent');
    await page.click('label[for="cid-for-rent"]');
    
     console.log("Waiting for the page to load after selecting 'For Rent'...");
    // fill the seacrch input form for the location
await page.type('input#propertyLocation', 'Rivers');
await new Promise((resolve) => setTimeout(resolve, 3000));
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');

    // add the type of property selecting from the dropdown //value relation : 0 for all types, 1 is flat/ apartment, 2:house,5: land 3, commercial property
    console.log("Selecting property type...");
    await page.select('select#tid', '1');

    // add the bedroom but default to any for land and commercial property
    console.log("Selecting number of bedrooms...");
    await page.select('select#bedrooms', '2')

    console.log("Selecting number of bedrooms...");
    await page.select('select#tid', '1');

    console.log("Selecting min...");
    // 6. Select Min Price = ₦500,000 (value="500000")
     await page.select('select#minprice', '250000');
   
     console.log("Selecting Max Price...");
    // 7. Select Max Price = ₦2,000,000 (value="2000000")
    await page.select('select#maxprice', '50000000000');

    // 8. Submit form by clicking search button
console.log("Submitting the search form...");
  await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle0' }),
  page.click('button[type="submit"]'),
]);

console.log("Search form submitted, waiting for results...");



    // 9. Wait for search results page to load
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });


    const listings = await page.$$eval('div.property-list', (nodes) =>
      nodes.map((node) => {
        const getText = (selector) => node.querySelector(selector)?.textContent?.trim() || '';
        const getAttr = (selector, attr) => node.querySelector(selector)?.getAttribute(attr) || '';

        const price = Array.from(node.querySelectorAll('.price'))
          .map(el => el.textContent?.trim())
          .join('');

        const stats = Array.from(node.querySelectorAll('.aux-info li')).map(li => li.innerText.trim());

        return {
          title: getText('h3[itemprop="name"]'),
          subtitle: getText('.content-title'),
          detailPage: 'https://nigeriapropertycentre.com' + getAttr('a[itemprop="url"]', 'href'),
          image: getAttr('img[itemprop="image"]', 'src'),
          location: getText('address'),
          description: getText('.description p'),
          price: price.replace(/\s+/g, ''),
          bedrooms: stats.find(s => s.includes('Bedroom')) || '',
          bathrooms: stats.find(s => s.includes('Bathroom')) || '',
          toilets: stats.find(s => s.includes('Toilet')) || '',
          parkingSpaces: stats.find(s => s.includes('Parking')) || '',
          agent: getText('.marketed-by'),
          phone: getText('.marketed-by strong')
        };
      })
    );

    console.dir(listings, { depth: null });


    await browser.close();
  } catch (error) {
    console.error("Scraping failed:", error);
  }
};

scrape();
