import { STORES } from '@ps/shared';
import { KabumScraper } from './kabumScraper.js';

const HOST_TO_STORE = {
    'kabum.com.br': STORES.KABUM,
};

const SCRAPERS = {
    [STORES.KABUM]: KabumScraper,
};

function normalizeHost(url) {
    return new URL(url).hostname.replace(/^www\./, '');
}

export function detectStoreFromUrl(url) {
    const host = normalizeHost(url);
    const store = HOST_TO_STORE[host];

    if (!store) {
        throw new Error(`Loja não suportada para o domínio: ${host}`);
    }
    return store;
}

export function getScraperForStore(store) {
    const ScraperClass = SCRAPERS[store];

    if (!ScraperClass) {
        throw new Error(`Nenhum scraper implementado para a loja: ${store}`);
    }
    return new ScraperClass();
}

export function getScraperForUrl(url) {
    const store = detectStoreFromUrl(url);
    return getScraperForStore(store);
}