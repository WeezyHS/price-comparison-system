import axios from 'axios';
import * as cheerio from 'cheerio';
import { delay, log } from '../utils/priceUtils.js';

export class BaseScraper {
    constructor(storeName, headers = {}) {
        this.storeName = storeName;
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Window NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ...headers
        };
    }

    async fetchHTML(url) {
        try {
            const { data } = await axios.get(url, { headers: this.headers });
            await delay(1000 + Math.random() * 2000);
            return cheerio.load(data);
        } catch (err) {
            log(`Erro ao buscar ${url}: ${err.message}`, 'error');
            throw err;
        }
    }

    async scrapeProduct(url) {
        throw new Error('scrapeProduct deve ser implementado no scrape filho');
    }

    async scrapeMany(urls) {
        const results = [];

        for (const url of urls) {
            try {
                const product = await this.scrapeProduct(url);
                if (product) results.push(product);
            } catch (err) {
                log(`Skipping ${url}: ${err.message}`, 'warn');
            }
        }
        return results;
    }
}