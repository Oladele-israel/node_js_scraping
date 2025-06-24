import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { retry } from "./utils/retry.js";
import { getUserAgent } from "./utils/userAgent.js";


/**
 * author: Oladele Israel
 * title: web scraping project for jiji.ng
 * reason: to get electronics price data to display on Jarleh
 * 
 */

puppeteer.use(StealthPlugin());

const scrape = async () => {
  const url = `https://jiji.ng`;

  const userInput = 'Port Harcourt'
  const userAgent = getUserAgent();
  const MAX_PAGES = 5;
  let listings = [];

  try {
    
  } catch (error) {
    console.error('Error during scraping:', error);
  }

 
};

scrape();
