import { BaseScraper } from './baseScraper.js';
import { cleanPrice, log } from '../utils/priceUtils.js';
import { STORES } from '@ps/shared';

export class KabumScraper extends BaseScraper {
    constructor() {
        super(STORES.KABUM);
    }

    async scrapeProduct(url) {
        log(`Scrapeando Kabum: ${new URL(url).pathname.split('/')[3] || url}`, 'info');
        const $ = await this.fetchHTML(url);

        const title = $('h1').first().text().trim();
        const priceText = $('h4.text-secondary-500').first().text().trim();
        const price = cleanPrice(priceText);
        const externalId = url.split('/')[4] || null;

        if (!title || isNaN(price)) {
            throw new Error(`Dados incompletos: title=${title}, price=${price}`);
        }

        return {
            title,
            price,
            url,
            store: this.storeName,
            external_id: externalId,
            scraped_at: new Date().toISOString()
        };
    }
}